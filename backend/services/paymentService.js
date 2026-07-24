/**
 * Servicio de pagos — Mercado Pago (opcional).
 * Si MP_ACCESS_TOKEN no está configurado, createPreference lanza error 503
 * pero el resto del backend sigue funcionando.
 *
 * Validación de monto: el deposit debe coincidir con (precio del servicio * 0.5)
 * leyendo el precio desde la tabla `services`. Si el servicio no existe, rechaza.
 */
const store = require('../db/sqlite');
const emailService = require('./emailService');
const whatsappService = require('./whatsappService');
const { log, logError, maskEmail, maskName } = require('../utils/logger');
const { withTimeout } = require('../utils/retry');
const { enqueue } = require('../utils/queue');

const EXPIRATION_MIN = 15;
const MP_TIMEOUT_MS = 5000;
const DEPOSIT_TOLERANCE = 0.01;

let mpClient = null;
let preferenceClient = null;
let paymentClient = null;

function mpReady() {
  if (mpClient) return true;
  if (!process.env.MP_ACCESS_TOKEN) return false;
  try {
    const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
    mpClient = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    preferenceClient = new Preference(mpClient);
    paymentClient = new Payment(mpClient);
    return true;
  } catch (err) {
    logError('MP', `no se pudo inicializar mercadopago: ${err.message}`);
    return false;
  }
}

function mapMpStatus(s) {
  if (s === 'approved') return 'paid';
  if (['rejected', 'cancelled', 'refunded', 'charged_back'].includes(s)) return 'failed';
  return 'pending';
}

function validateDeposit(serviceId, amount) {
  const svc = store.listServices().find((s) => s.id === serviceId);
  if (!svc) return { ok: false, reason: 'servicio inexistente' };
  const expected = Math.round(svc.price * 0.5 * 100) / 100;
  if (Math.abs(Number(amount) - expected) > DEPOSIT_TOLERANCE) {
    return { ok: false, reason: `el monto no coincide con la seña esperada (${expected})` };
  }
  return { ok: true };
}

async function createPreference(input) {
  if (!mpReady()) {
    const err = new Error('Mercado Pago no está configurado en este servidor');
    err.status = 503;
    throw err;
  }

  const {
    appointmentId, serviceId, serviceName, depositAmount,
    clientName, clientEmail, clientPhone,
    date, startTime, successUrl, pendingUrl, failureUrl,
  } = input;

  if (serviceId) {
    const check = validateDeposit(serviceId, depositAmount);
    if (!check.ok) {
      const err = new Error(`Pago rechazado: ${check.reason}`);
      err.status = 400;
      throw err;
    }
  }

  const isLocalSuccess = /^http:\/\/(localhost|127\.0\.0\.1)/i.test(successUrl || '');
  const expiresAt = new Date(Date.now() + EXPIRATION_MIN * 60 * 1000).toISOString();

  const preference = await withTimeout(
    preferenceClient.create({
      body: {
        items: [{
          id: appointmentId,
          title: `Seña: ${serviceName}`,
          description: `Turno ${date} ${startTime}`,
          quantity: 1,
          unit_price: Number(depositAmount),
          currency_id: 'ARS',
        }],
        payer: {
          name: clientName,
          email: clientEmail || undefined,
          phone: clientPhone ? { number: clientPhone } : undefined,
        },
        external_reference: appointmentId,
        back_urls: { success: successUrl, pending: pendingUrl, failure: failureUrl },
        ...(isLocalSuccess ? {} : { auto_return: 'approved' }),
        notification_url: `${
          process.env.PUBLIC_BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`
        }/api/payments/webhook`,
        expires: true,
        expiration_date_to: expiresAt,
      },
    }),
    MP_TIMEOUT_MS,
    'mp.preference.create'
  );

  store.upsertPayment({
    id: appointmentId,
    status: 'pending',
    preferenceId: preference.id,
    amount: depositAmount,
    clientName, clientEmail,
    serviceName, date, startTime,
    expiresAt,
  });

  log('PAY', `pref creada appt=${appointmentId} cliente=${maskName(clientName)} email=${maskEmail(clientEmail)}`);

  return {
    preferenceId: preference.id,
    initPoint: preference.init_point,
    sandboxInitPoint: preference.sandbox_init_point,
  };
}

const processing = new Set();

async function processMpPayment(mpPaymentId) {
  if (!mpReady()) return null;
  if (!/^\d{1,30}$/.test(String(mpPaymentId || ''))) return null;

  const existing = store.getPaymentByMpId(mpPaymentId);
  if (existing && existing.status === 'paid') return existing;

  const payment = await withTimeout(
    paymentClient.get({ id: mpPaymentId }),
    MP_TIMEOUT_MS,
    'mp.get'
  );

  if (!payment || !payment.external_reference) return null;

  const appointmentId = payment.external_reference;

  if (processing.has(appointmentId)) {
    return store.getPayment(appointmentId);
  }

  processing.add(appointmentId);

  try {
    const previous = store.getPayment(appointmentId);

    if (!previous) return null;
    if (previous.status === 'paid') return previous;

    const newStatus = mapMpStatus(payment.status);

    const updated = store.updatePaymentStatus(appointmentId, {
      status: newStatus,
      paymentId: String(payment.id),
      mpStatus: payment.status,
      mpStatusDetail: payment.status_detail,
    });

    // 🔥 ACTUALIZAR TAMBIÉN EL TURNO
    store.patchAppointment(
      appointmentId,
      {
        paymentStatus: newStatus,
        paymentId: String(payment.id),
        pendingExpiresAt: null,
      },
      'mercadopago'
    );

    log('WEBHOOK', `${appointmentId} → ${newStatus} (MP: ${payment.status})`);

    if (newStatus === 'paid' && previous.status !== 'paid') {
      enqueue({
        label: `email:${appointmentId}`,
        timeoutMs: 5000,
        fn: () => emailService.sendConfirmation({
          to: updated.clientEmail,
          clientName: updated.clientName,
          serviceName: updated.serviceName,
          date: updated.date,
          startTime: updated.startTime,
        }),
      });

      if (updated.clientPhone && whatsappService.enabled) {
        enqueue({
          label: `wa:${appointmentId}`,
          timeoutMs: 9000,
          fn: () => whatsappService.sendConfirmation({
            clientPhone: updated.clientPhone,
            clientName: updated.clientName,
            serviceName: updated.serviceName,
            date: updated.date,
            startTime: updated.startTime,
          }),
        });
      }
    }

    return updated;
  } finally {
    processing.delete(appointmentId);
  }
}

async function reconcileStatus(appointmentId) {
  if (!mpReady()) return store.getPayment(appointmentId);

  const record = store.getPayment(appointmentId);

  if (!record || record.status !== 'pending') return record;

  try {
    const search = await withTimeout(
      paymentClient.search({
        options: {
          external_reference: appointmentId,
          sort: 'date_created',
          criteria: 'desc',
        },
      }),
      MP_TIMEOUT_MS,
      'mp.search'
    );

    const results = search?.results || [];

    if (!results.length) return record;

    return await processMpPayment(results[0].id);
  } catch (err) {
    logError('RECONCILE', err.message);
    return record;
  }
}

function notifyManual(input) {
  if (input?.clientEmail) {
    enqueue({
      label: `email-manual:${input.appointmentId || Date.now()}`,
      timeoutMs: 5000,
      fn: () => emailService.sendConfirmation({
        to: input.clientEmail,
        clientName: input.clientName,
        serviceName: input.serviceName,
        date: input.date,
        startTime: input.startTime,
      }),
    });
  }

  if (input?.clientPhone && whatsappService.enabled) {
    enqueue({
      label: `wa-manual:${input.appointmentId || Date.now()}`,
      timeoutMs: 9000,
      fn: () => whatsappService.sendConfirmation(input),
    });
  }
}

function notifyReschedule(input) {
  if (input?.clientEmail) {
    enqueue({
      label: `email-resch:${input.appointmentId || Date.now()}`,
      timeoutMs: 5000,
      fn: () => emailService.sendReschedule({
        to: input.clientEmail,
        clientName: input.clientName,
        serviceName: input.serviceName,
        oldDate: input.oldDate,
        oldStartTime: input.oldStartTime,
        date: input.date,
        startTime: input.startTime,
      }),
    });
  }

  if (input?.clientPhone && whatsappService.enabled) {
    enqueue({
      label: `wa-resch:${input.appointmentId || Date.now()}`,
      timeoutMs: 9000,
      fn: () => whatsappService.sendReschedule(input),
    });
  }
}

function notifyCancellation(input) {
  if (input?.clientEmail) {
    enqueue({
      label: `email-cancel:${input.appointmentId || Date.now()}`,
      timeoutMs: 5000,
      fn: () => emailService.sendCancellation({
        to: input.clientEmail,
        clientName: input.clientName,
        serviceName: input.serviceName,
        date: input.date,
        startTime: input.startTime,
      }),
    });
  }

  if (input?.clientPhone && whatsappService.enabled) {
    enqueue({
      label: `wa-cancel:${input.appointmentId || Date.now()}`,
      timeoutMs: 9000,
      fn: () => whatsappService.sendCancellation(input),
    });
  }
}

module.exports = {
  createPreference,
  processMpPayment,
  reconcileStatus,
  notifyManual,
  notifyReschedule,
  notifyCancellation,
  mpReady,
};