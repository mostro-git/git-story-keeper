// Sanitización: trim + remover caracteres de control + limitar largo
function s(v, max = 200) {
  if (v === undefined || v === null) return '';
  return String(v).replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, max);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s\-()]{6,20}$/;
const E164_RE = /^\+\d{8,15}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const URL_RE = /^https?:\/\/[^\s]+$/i;
const ID_RE = /^[A-Za-z0-9_\-]{1,80}$/;

/**
 * Normaliza teléfono a E.164. Si tiene 10 dígitos sin '+', asume Argentina (+549).
 */
function normalizePhoneE164(raw) {
  if (!raw) return '';
  let d = String(raw).replace(/[^\d+]/g, '');
  if (!d) return '';
  if (d.startsWith('+')) return E164_RE.test(d) ? d : '';
  // sin '+': si arranca con 54, agregamos '+'; sino asumimos AR
  if (d.startsWith('54')) d = `+${d}`;
  else if (d.length >= 10) d = `+549${d.replace(/^0+/, '').replace(/^15/, '')}`;
  else return '';
  return E164_RE.test(d) ? d : '';
}

function validateCreatePreference(body) {
  const errors = [];
  const data = {
    appointmentId: s(body.appointmentId, 100),
    serviceName: s(body.serviceName, 200),
    depositAmount: Number(body.depositAmount),
    clientName: s(body.clientName, 100),
    clientEmail: s(body.clientEmail, 200),
    clientPhone: s(body.clientPhone, 30),
    date: s(body.date, 20),
    startTime: s(body.startTime, 10),
    successUrl: s(body.successUrl, 500),
    pendingUrl: s(body.pendingUrl, 500),
    failureUrl: s(body.failureUrl, 500),
  };

  if (!data.appointmentId || !ID_RE.test(data.appointmentId))
    errors.push('appointmentId inválido');
  if (!data.serviceName) errors.push('serviceName requerido');
  if (!data.clientName) errors.push('clientName requerido');
  if (!DATE_RE.test(data.date)) errors.push('date inválida (YYYY-MM-DD)');
  if (!TIME_RE.test(data.startTime)) errors.push('startTime inválido (HH:MM)');
  if (!Number.isFinite(data.depositAmount) || data.depositAmount <= 0 || data.depositAmount > 1_000_000)
    errors.push('depositAmount inválido');
  if (data.clientEmail && !EMAIL_RE.test(data.clientEmail))
    errors.push('clientEmail inválido');
  if (data.clientPhone) {
    if (!PHONE_RE.test(data.clientPhone)) errors.push('clientPhone inválido');
    else {
      const norm = normalizePhoneE164(data.clientPhone);
      if (!norm) errors.push('clientPhone no normalizable a E.164');
      else data.clientPhone = norm;
    }
  }
  ['successUrl', 'pendingUrl', 'failureUrl'].forEach((k) => {
    if (data[k] && !URL_RE.test(data[k])) errors.push(`${k} inválida`);
  });

  return { data, errors };
}

function validateNotify(body) {
  const errors = [];
  const data = {
    clientName: s(body.clientName, 100),
    clientEmail: s(body.clientEmail, 200),
    clientPhone: s(body.clientPhone, 30),
    serviceName: s(body.serviceName, 200),
    date: s(body.date, 20),
    startTime: s(body.startTime, 10),
  };
  if (!data.clientName) errors.push('clientName requerido');
  if (!data.serviceName) errors.push('serviceName requerido');
  if (!DATE_RE.test(data.date)) errors.push('date inválida');
  if (!TIME_RE.test(data.startTime)) errors.push('startTime inválido');
  if (data.clientEmail && !EMAIL_RE.test(data.clientEmail))
    errors.push('clientEmail inválido');
  if (data.clientPhone) {
    if (!PHONE_RE.test(data.clientPhone)) errors.push('clientPhone inválido');
    else {
      const norm = normalizePhoneE164(data.clientPhone);
      if (!norm) errors.push('clientPhone no normalizable a E.164');
      else data.clientPhone = norm;
    }
  }
  return { data, errors };
}

function validateReschedule(body) {
  const base = validateNotify(body);
  const oldDate = s(body.oldDate, 20);
  const oldStartTime = s(body.oldStartTime, 10);
  if (!DATE_RE.test(oldDate)) base.errors.push('oldDate inválida');
  if (!TIME_RE.test(oldStartTime)) base.errors.push('oldStartTime inválido');
  base.data.oldDate = oldDate;
  base.data.oldStartTime = oldStartTime;
  return base;
}

// id de pago de MP debe ser numérico
function isValidMpPaymentId(id) {
  return /^\d{1,30}$/.test(String(id || ''));
}

module.exports = { validateCreatePreference, validateNotify, validateReschedule, isValidMpPaymentId, normalizePhoneE164 };
