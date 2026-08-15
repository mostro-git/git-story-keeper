/**
 * Agenda diaria por mail.
 *
 * Envía un único mail a AGENDA_NOTIFY_EMAIL 90 minutos antes del inicio de la
 * PRIMERA franja horaria configurada para ese día de la semana (Franja 1 del panel).
 *
 * Reglas:
 *   - Si el día está bloqueado (feriado / no laboral) → no se envía.
 *   - Si el día no tiene franjas habilitadas → no se envía.
 *   - Si no hay ningún turno vigente ese día → no se envía.
 *   - Un solo envío por día (marca guardada en settings).
 */
const store = require('../db/sqlite');
const emailService = require('./emailService');
const { log, logError } = require('../utils/logger');

const LEAD_MINUTES = 90;
const SETTING_KEY = 'daily_agenda_last_sent';
const DEAD_STATUSES = new Set(['failed', 'expired', 'cancelled']);

function timeZone() {
  return process.env.AGENDA_TZ || process.env.TZ || 'America/Argentina/Buenos_Aires';
}

/** Fecha (YYYY-MM-DD), día de semana y minutos del día en la zona configurada. */
function nowInTz(base = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone(),
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
    weekday: 'short',
  });
  const parts = {};
  for (const p of fmt.formatToParts(base)) parts[p.type] = p.value;
  const DOW = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    dayOfWeek: DOW[parts.weekday],
    minutes: Number(parts.hour === '24' ? 0 : parts.hour) * 60 + Number(parts.minute),
  };
}

function toMinutes(hhmm) {
  const [h, m] = String(hhmm || '').split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

/** Inicio (en minutos) de la primera franja habilitada del día de semana dado. */
function firstSlotStart(dayOfWeek) {
  const day = store.listSchedule().find((s) => s.dayOfWeek === dayOfWeek);
  if (!day) return null;
  const starts = (day.slots || [])
    .filter((s) => s && s.enabled !== false && s.startTime)
    .map((s) => toMinutes(s.startTime))
    .filter((n) => n != null);
  return starts.length ? Math.min(...starts) : null;
}

/** Turnos vigentes de una fecha, ordenados por horario. */
function appointmentsForDate(date) {
  return store.listAppointments()
    .filter((a) => a.date === date && !a.isDone && !DEAD_STATUSES.has(String(a.paymentStatus || '')))
    .sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));
}

/**
 * Chequea si corresponde enviar la agenda y la envía.
 * Pensado para correr cada pocos minutos desde un setInterval.
 */
async function tick(base = new Date()) {
  const to = (process.env.AGENDA_NOTIFY_EMAIL || '').trim();
  if (!to || !emailService.enabled) return false;

  try {
    const { date, dayOfWeek, minutes } = nowInTz(base);
    if (store.getSetting(SETTING_KEY) === date) return false;

    const start = firstSlotStart(dayOfWeek);
    if (start == null) return false;

    const target = start - LEAD_MINUTES;
    // Ventana de 30 min desde el momento objetivo (evita perder el envío si el
    // proceso estuvo caído justo en el minuto exacto).
    if (minutes < target || minutes > target + 30) return false;

    // Marcamos antes de enviar para no duplicar si el envío tarda.
    store.setSetting(SETTING_KEY, date);

    const bloqueado = store.listBlockedDates().some((b) => b.date === date);
    if (bloqueado) {
      log('AGENDA', `${date} bloqueado — no se envía agenda`);
      return false;
    }

    const appointments = appointmentsForDate(date);
    if (appointments.length === 0) {
      log('AGENDA', `${date} sin turnos — no se envía agenda`);
      return false;
    }

    return await emailService.sendDailyAgenda({ to, date, appointments });
  } catch (err) {
    logError('AGENDA', err.message);
    return false;
  }
}

module.exports = { tick, appointmentsForDate, firstSlotStart, nowInTz, LEAD_MINUTES };
