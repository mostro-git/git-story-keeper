/**
 * Notificaciones WhatsApp/SMS vía Twilio (OPCIONAL).
 *
 * Si TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN y TWILIO_FROM_NUMBER (o
 * TWILIO_WHATSAPP_FROM) no están configurados, el módulo queda deshabilitado y
 * no rompe nada. Todas las llamadas son no-op.
 *
 * Usa fetch nativo (Node 18+) contra la REST API de Twilio para evitar agregar
 * la dependencia 'twilio' si el usuario no la quiere instalar.
 */
const { log, logError } = require('../utils/logger');

const SID = process.env.TWILIO_ACCOUNT_SID || '';
const TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const SMS_FROM = process.env.TWILIO_FROM_NUMBER || '';
const WA_FROM = process.env.TWILIO_WHATSAPP_FROM || '';
const CHANNEL = (process.env.NOTIFY_CHANNEL || 'whatsapp').toLowerCase();

const enabled = Boolean(SID && TOKEN && (SMS_FROM || WA_FROM));

function pickFrom() {
  if (CHANNEL === 'sms') return SMS_FROM;
  return WA_FROM ? `whatsapp:${WA_FROM.replace(/^whatsapp:/, '')}` : '';
}

function pickTo(raw) {
  if (!raw) return '';
  const clean = String(raw).trim();
  if (CHANNEL === 'sms') return clean;
  return clean.startsWith('whatsapp:') ? clean : `whatsapp:${clean}`;
}

async function send({ to, body }) {
  if (!enabled) return { skipped: true };
  const from = pickFrom();
  const dest = pickTo(to);
  if (!from || !dest || !body) return { skipped: true };

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`;
    const auth = Buffer.from(`${SID}:${TOKEN}`).toString('base64');
    const params = new URLSearchParams({ To: dest, From: from, Body: body });

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
      signal: ctrl.signal,
    }).finally(() => clearTimeout(t));

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      logError('TWILIO', `${res.status} ${text.slice(0, 200)}`);
      return { ok: false, status: res.status };
    }
    log('TWILIO', `→ ${dest} (${CHANNEL})`);
    return { ok: true };
  } catch (err) {
    logError('TWILIO', err.message);
    return { ok: false, error: err.message };
  }
}

function buildConfirmation({ clientName, serviceName, date, startTime }) {
  return `Hola ${clientName || ''}! Tu turno de ${serviceName} quedó confirmado para el ${date} a las ${startTime}. ¡Te esperamos!`;
}
function buildReschedule({ clientName, serviceName, oldDate, oldStartTime, date, startTime }) {
  return `Hola ${clientName || ''}, tu turno de ${serviceName} se reprogramó del ${oldDate} ${oldStartTime} al ${date} ${startTime}.`;
}
function buildCancellation({ clientName, serviceName, date, startTime }) {
  return `Hola ${clientName || ''}, tu turno de ${serviceName} del ${date} ${startTime} fue cancelado.`;
}

module.exports = {
  enabled,
  channel: CHANNEL,
  sendConfirmation: (i) => send({ to: i.clientPhone, body: buildConfirmation(i) }),
  sendReschedule:   (i) => send({ to: i.clientPhone, body: buildReschedule(i) }),
  sendCancellation: (i) => send({ to: i.clientPhone, body: buildCancellation(i) }),
};
