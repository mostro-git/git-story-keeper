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
 *   - Un solo envío por día (se guarda la marca en settings).
 */
const store = require('../db/sqlite');
const emailService = require('./emailService');
const { log, logError } = require('../utils/logger');

const LEAD_MINUTES = 90;
const SETTING_KEY = 'daily_agenda_last_sent';
const TZ = process.env AGENDA_TZ; // placeholder
