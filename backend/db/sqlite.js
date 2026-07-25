/**
 * Capa de persistencia — better-sqlite3 (sincrónico, archivo local).
 *
 * Cubre:
 *   - appointments (turnos)
 *   - appointment_logs (auditoría anonimizada)
 *   - services (servicios del catálogo)
 *   - special_services (servicios puntuales para fechas específicas)
 *   - schedule (horarios semanales)
 *   - blocked_dates (días bloqueados / feriados)
 *   - settings (config del panel; clave/valor)
 *   - payments (preferencias MP)
 *
 * Reglas de privacidad:
 *   - Al cancelar/liberar/marcar realizado un turno, se borran nombre/email/teléfono
 *     ANTES de cualquier otra operación (PII scrub).
 *   - Los appointment_logs nunca guardan PII: solo id, acción, actor, timestamp,
 *     y un payload mínimo con date/startTime/serviceName.
 *
 * La API expone todo como funciones síncronas. El server las llama tal cual.
 */
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { log } = require('../utils/logger');

const DB_PATH = path.resolve(process.cwd(), process.env.DB_PATH || './data/meraki.sqlite');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

// ─────────────────────────── Schema ───────────────────────────
const SCHEMA = `
CREATE TABLE IF NOT EXISTS appointments (
  id                 TEXT PRIMARY KEY,
  service_id         TEXT NOT NULL,
  service_name       TEXT NOT NULL,
  client_name        TEXT NOT NULL,
  client_phone       TEXT,
  client_email       TEXT,
  date               TEXT NOT NULL,
  start_time         TEXT NOT NULL,
  end_time           TEXT NOT NULL,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  payment_status     TEXT,
  deposit_amount     REAL,
  service_price      REAL,
  payment_id         TEXT,
  preference_id      TEXT,
  pending_expires_at TEXT,
  is_done            INTEGER NOT NULL DEFAULT 0,
  kind               TEXT NOT NULL DEFAULT 'service',
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_appt_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appt_status ON appointments(payment_status);

-- Anti double-booking: no permite dos turnos vivos en mismo slot.
-- Los turnos 'failed'/'expired'/realizados quedan fuera para permitir re-reservar.
-- Se incluye la columna kind para permitir reservar un servicio regular y uno especial
-- en el mismo horario (no se bloquean entre sí).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_appt_slot_v2
  ON appointments(date, start_time, kind)
  WHERE is_done = 0 AND (payment_status IS NULL OR payment_status NOT IN ('failed','expired','cancelled'));

CREATE TABLE IF NOT EXISTS appointment_logs (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id TEXT NOT NULL,
  action         TEXT NOT NULL,
  actor          TEXT NOT NULL DEFAULT 'system',
  payload        TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_logs_created ON appointment_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS services (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  description    TEXT NOT NULL DEFAULT '',
  duration       INTEGER NOT NULL,
  price          REAL NOT NULL,
  image_url      TEXT,
  available_days TEXT, -- JSON array de 0..6
  position       INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);


CREATE TABLE IF NOT EXISTS sections (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url   TEXT,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS special_services (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  description    TEXT NOT NULL DEFAULT '',
  duration       INTEGER NOT NULL,
  price          REAL NOT NULL,
  image_url      TEXT,
  date           TEXT,
  category_id    TEXT,
  position       INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS special_categories (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url   TEXT,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS promotions (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  description      TEXT NOT NULL DEFAULT '',
  image_url        TEXT,
  discount_percent REAL NOT NULL DEFAULT 0,
  phone            TEXT,
  position         INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS promotion_items (
  promotion_id TEXT NOT NULL,
  item_id      TEXT NOT NULL,
  item_type    TEXT NOT NULL,
  PRIMARY KEY (promotion_id, item_id, item_type),
  FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_special_date ON special_services(date);

CREATE TABLE IF NOT EXISTS schedule (
  day_of_week INTEGER PRIMARY KEY, -- 0..6 (Dom..Sáb)
  slots       TEXT NOT NULL DEFAULT '[]', -- JSON: [{startTime,endTime,enabled}]
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS blocked_dates (
  date       TEXT PRIMARY KEY,
  reason     TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS unique_services (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url   TEXT,
  phone       TEXT,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payments (
  id               TEXT PRIMARY KEY,
  status           TEXT NOT NULL DEFAULT 'pending',
  preference_id    TEXT,
  payment_id       TEXT,
  amount           REAL,
  client_name      TEXT,
  client_email     TEXT,
  service_name     TEXT,
  date             TEXT,
  start_time       TEXT,
  mp_status        TEXT,
  mp_status_detail TEXT,
  expires_at       TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payment_id ON payments(payment_id);
`;

function init() {
  db.exec(SCHEMA);
  // Seed schedule por defecto si está vacía
  const count = db.prepare('SELECT COUNT(*) as n FROM schedule').get().n;
  if (count === 0) {
    const ins = db.prepare('INSERT INTO schedule (day_of_week, slots) VALUES (?, ?)');
    const def = [
      { d: 0, slots: [] },
      { d: 1, slots: [{ startTime: '09:00', endTime: '18:00', enabled: true }] },
      { d: 2, slots: [{ startTime: '09:00', endTime: '18:00', enabled: true }] },
      { d: 3, slots: [{ startTime: '09:00', endTime: '18:00', enabled: true }] },
      { d: 4, slots: [{ startTime: '09:00', endTime: '18:00', enabled: true }] },
      { d: 5, slots: [{ startTime: '09:00', endTime: '18:00', enabled: true }] },
      { d: 6, slots: [{ startTime: '09:00', endTime: '14:00', enabled: true }] },
    ];
    const tx = db.transaction((rows) => rows.forEach((r) => ins.run(r.d, JSON.stringify(r.slots))));
    tx(def);
  }

  // Migración: columna section_id en services (nullable)
  try {
    const cols = db.prepare("PRAGMA table_info(services)").all();
    if (!cols.some((c) => c.name === 'section_id')) {
      db.exec("ALTER TABLE services ADD COLUMN section_id TEXT");
      log('DB', '✓ migración: services.section_id agregada');
    }
  } catch (e) { log('DB', 'migración section_id falló: ' + (e && e.message)); }

  // Migración: special_services nuevas columnas + date nullable
  try {
    const cols = db.prepare("PRAGMA table_info(special_services)").all();
    const hasCat = cols.some((c) => c.name === 'category_id');
    const hasPos = cols.some((c) => c.name === 'position');
    const dateCol = cols.find((c) => c.name === 'date');
    const dateIsNotNull = dateCol && dateCol.notnull === 1;
    if (!hasCat) {
      db.exec("ALTER TABLE special_services ADD COLUMN category_id TEXT");
      log('DB', '✓ migración: special_services.category_id agregada');
    }
    if (!hasPos) {
      db.exec("ALTER TABLE special_services ADD COLUMN position INTEGER NOT NULL DEFAULT 0");
      log('DB', '✓ migración: special_services.position agregada');
    }
    if (dateIsNotNull) {
      db.exec(`
        CREATE TABLE special_services_new (
          id TEXT PRIMARY KEY, name TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          duration INTEGER NOT NULL, price REAL NOT NULL,
          image_url TEXT, date TEXT, category_id TEXT,
          position INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        INSERT INTO special_services_new (id, name, description, duration, price, image_url, date, category_id, position, created_at, updated_at)
        SELECT id, name, description, duration, price, image_url, date, category_id, COALESCE(position, 0), created_at, updated_at FROM special_services;
        DROP TABLE special_services;
        ALTER TABLE special_services_new RENAME TO special_services;
        CREATE INDEX IF NOT EXISTS idx_special_date ON special_services(date);
      `);
      log('DB', '✓ migración: special_services.date ahora nullable');
    }
  } catch (e) { log('DB', 'migración special_services falló: ' + (e && e.message)); }

  // Migración: appointments.kind + nuevo índice único que incluye kind.
  // Permite reservar un servicio regular y uno especial en el mismo horario.
  try {
    const cols = db.prepare("PRAGMA table_info(appointments)").all();
    if (!cols.some((c) => c.name === 'kind')) {
      db.exec("ALTER TABLE appointments ADD COLUMN kind TEXT NOT NULL DEFAULT 'service'");
      log('DB', '✓ migración: appointments.kind agregada');
    }
    db.exec("DROP INDEX IF EXISTS uniq_appt_slot");
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_appt_slot_v2
        ON appointments(date, start_time, kind)
        WHERE is_done = 0 AND (payment_status IS NULL OR payment_status NOT IN ('failed','expired','cancelled'));
    `);
  } catch (e) { log('DB', 'migración appointments.kind falló: ' + (e && e.message)); }

  // Migración: columna phone en promotions
  try {
    const cols = db.prepare("PRAGMA table_info(promotions)").all();
    if (!cols.some((c) => c.name === 'phone')) {
      db.exec("ALTER TABLE promotions ADD COLUMN phone TEXT");
      log('DB', '✓ migración: promotions.phone agregada');
    }
  } catch (e) { log('DB', 'migración promotions.phone falló: ' + (e && e.message)); }


  log('DB', `✓ SQLite lista en ${DB_PATH}`);
}

// ─────────────────────────── Mappers ───────────────────────────
function mapAppointment(r) {
  if (!r) return null;
  return {
    id: r.id,
    serviceId: r.service_id,
    serviceName: r.service_name,
    clientName: r.client_name || '',
    clientPhone: r.client_phone || '',
    clientEmail: r.client_email || '',
    date: r.date,
    startTime: r.start_time,
    endTime: r.end_time,
    createdAt: r.created_at,
    paymentStatus: r.payment_status || undefined,
    depositAmount: r.deposit_amount == null ? undefined : Number(r.deposit_amount),
    servicePrice: r.service_price == null ? undefined : Number(r.service_price),
    paymentId: r.payment_id || undefined,
    preferenceId: r.preference_id || undefined,
    pendingExpiresAt: r.pending_expires_at || undefined,
    isDone: !!r.is_done,
    kind: r.kind === 'special' ? 'special' : 'service',
  };
}

function mapService(r) {
  if (!r) return null;
  let availableDays = [];
  try { availableDays = r.available_days ? JSON.parse(r.available_days) : []; } catch {}
  return {
    id: r.id,
    name: r.name,
    description: r.description || '',
    duration: Number(r.duration),
    price: Number(r.price),
    imageUrl: r.image_url || undefined,
    availableDays,
    sectionId: r.section_id || undefined,
  };
}

function mapSpecial(r) {
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    description: r.description || '',
    duration: Number(r.duration),
    price: Number(r.price),
    imageUrl: r.image_url || undefined,
    date: r.date || undefined,
    categoryId: r.category_id || undefined,
    position: Number(r.position || 0),
  };
}

function mapPayment(r) {
  if (!r) return null;
  return {
    id: r.id,
    status: r.status,
    preferenceId: r.preference_id,
    paymentId: r.payment_id,
    amount: r.amount == null ? null : Number(r.amount),
    clientName: r.client_name,
    clientEmail: r.client_email,
    serviceName: r.service_name,
    date: r.date,
    startTime: r.start_time,
    mpStatus: r.mp_status,
    mpStatusDetail: r.mp_status_detail,
    expiresAt: r.expires_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// ─────────────────────────── Helpers ───────────────────────────
function logAction(appointmentId, action, actor, payload) {
  db.prepare(`INSERT INTO appointment_logs (appointment_id, action, actor, payload)
              VALUES (?, ?, ?, ?)`).run(
    appointmentId,
    action,
    actor || 'system',
    payload ? JSON.stringify(payload) : null
  );
}

// ─────────────────────────── Appointments ───────────────────────────
function listAppointments() {
  const rows = db.prepare(`SELECT * FROM appointments ORDER BY date ASC, start_time ASC`).all();
  return rows.map(mapAppointment);
}

function getAppointment(id) {
  return mapAppointment(db.prepare(`SELECT * FROM appointments WHERE id = ?`).get(id));
}

// ─────────────── Validaciones de negocio (backend-side) ───────────────
// Devuelve los turnos "vivos" (sin contar el id excluido).
function liveAppointmentsOnDate(date, excludeId = null) {
  return db.prepare(`
    SELECT id, start_time, end_time, kind FROM appointments
    WHERE date = ?
      AND is_done = 0
      AND (payment_status IS NULL OR payment_status NOT IN ('failed','expired','cancelled'))
      AND id != COALESCE(?, '')
  `).all(date, excludeId);
}

function toMinutes(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + m;
}

function overlap(aStart, aEnd, bStart, bEnd) {
  // Solapamiento estricto (toques borde a borde están permitidos: aEnd === bStart OK).
  return aStart < bEnd && bStart < aEnd;
}

function getScheduleMap() {
  const map = {};
  for (const row of db.prepare('SELECT day_of_week, slots FROM schedule').all()) {
    try { map[row.day_of_week] = JSON.parse(row.slots) || []; } catch { map[row.day_of_week] = []; }
  }
  return map;
}

function isDateBlocked(date) {
  return !!db.prepare('SELECT 1 FROM blocked_dates WHERE date = ?').get(date);
}

function fitsInWorkingHours(date, startTime, endTime) {
  // Sábado=6, Domingo=0 (Date.getUTCDay sobre YYYY-MM-DD parseado como UTC).
  const [y, m, d] = date.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const slots = getScheduleMap()[dow] || [];
  const s = toMinutes(startTime);
  const e = toMinutes(endTime);
  return slots.some((sl) => {
    if (sl.enabled === false) return false;
    return toMinutes(sl.startTime) <= s && e <= toMinutes(sl.endTime);
  });
}

/**
 * Valida que el slot sea reservable. Tira HttpError-like (con .status).
 * - Horario coherente (start < end)
 * - No es día bloqueado / feriado
 * - Cae dentro de un slot laboral habilitado
 * - No solapa con ningún otro turno vivo
 */
function assertSlotValid({ date, startTime, endTime, excludeId = null, allowAdminOverride = false, kind = 'service' } = {}) {
  if (!date || !startTime || !endTime) {
    const e = new Error('Faltan date/startTime/endTime'); e.status = 400; throw e;
  }
  const s = toMinutes(startTime);
  const e = toMinutes(endTime);
  if (!(s < e)) {
    const err = new Error('Horario inválido: startTime debe ser anterior a endTime'); err.status = 400; throw err;
  }
  if (isDateBlocked(date)) {
    const err = new Error('Esa fecha está bloqueada'); err.status = 409; throw err;
  }
  if (!allowAdminOverride && !fitsInWorkingHours(date, startTime, endTime)) {
    const err = new Error('Ese horario no entra en la franja laboral'); err.status = 409; throw err;
  }
  const targetKind = kind === 'special' ? 'special' : 'service';
  for (const row of liveAppointmentsOnDate(date, excludeId)) {
    // Servicios regulares y especiales no se bloquean entre sí: solo se valida
    // superposición dentro del mismo tipo.
    const rowKind = row.kind === 'special' ? 'special' : 'service';
    if (rowKind !== targetKind) continue;
    if (overlap(s, e, toMinutes(row.start_time), toMinutes(row.end_time))) {
      const err = new Error('Ese horario se superpone con otro turno'); err.status = 409; throw err;
    }
  }
}

function createAppointment(a, actor = 'client') {
  // Validación dura backend (anti-superposición + fuera de horario + bloqueados).
  // Admin puede crear fuera de horario laboral (overrides), pero NUNCA superponer.
  assertSlotValid({
    date: a.date,
    startTime: a.startTime,
    endTime: a.endTime,
    excludeId: a.id,
    allowAdminOverride: actor === 'admin',
    kind: a.kind,
  });
  const stmt = db.prepare(`
    INSERT INTO appointments (
      id, service_id, service_name, client_name, client_phone, client_email,
      date, start_time, end_time, created_at,
      payment_status, deposit_amount, service_price,
      payment_id, preference_id, pending_expires_at, kind
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')), ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      service_id = excluded.service_id,
      service_name = excluded.service_name,
      client_name = excluded.client_name,
      client_phone = excluded.client_phone,
      client_email = excluded.client_email,
      date = excluded.date,
      start_time = excluded.start_time,
      end_time = excluded.end_time,
      payment_status = excluded.payment_status,
      deposit_amount = excluded.deposit_amount,
      service_price = excluded.service_price,
      payment_id = excluded.payment_id,
      preference_id = excluded.preference_id,
      pending_expires_at = excluded.pending_expires_at,
      kind = excluded.kind,
      updated_at = datetime('now')
  `);
  try {
    stmt.run(
      a.id, a.serviceId, a.serviceName, a.clientName,
      a.clientPhone || null, a.clientEmail || null,
      a.date, a.startTime, a.endTime, a.createdAt || null,
      a.paymentStatus || null,
      a.depositAmount == null ? null : Number(a.depositAmount),
      a.servicePrice == null ? null : Number(a.servicePrice),
      a.paymentId || null, a.preferenceId || null,
      a.pendingExpiresAt || null,
      a.kind === 'special' ? 'special' : 'service'
    );
  } catch (err) {
    if (String(err.message || '').includes('UNIQUE')) {
      const e = new Error('Ese horario ya está reservado');
      e.status = 409;
      throw e;
    }
    throw err;
  }
  logAction(a.id, 'create', actor, { date: a.date, startTime: a.startTime, serviceName: a.serviceName });
  return getAppointment(a.id);
}

function patchAppointment(id, fields, actor = 'admin') {
  const cur = getAppointment(id);
  if (!cur) return null;
  const isReschedule = !!(fields.date || fields.startTime || fields.endTime);
  if (isReschedule) {
    assertSlotValid({
      date: fields.date || cur.date,
      startTime: fields.startTime || cur.startTime,
      endTime: fields.endTime || cur.endTime,
      excludeId: id,
      allowAdminOverride: actor === 'admin',
      kind: cur.kind,
    });
  }
  try {
    db.prepare(`
      UPDATE appointments SET
        date = COALESCE(?, date),
        start_time = COALESCE(?, start_time),
        end_time = COALESCE(?, end_time),
        payment_status = COALESCE(?, payment_status),
        payment_id = COALESCE(?, payment_id),
        preference_id = COALESCE(?, preference_id),
        pending_expires_at = COALESCE(?, pending_expires_at),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      fields.date || null,
      fields.startTime || null,
      fields.endTime || null,
      fields.paymentStatus || null,
      fields.paymentId || null,
      fields.preferenceId || null,
      fields.pendingExpiresAt || null,
      id
    );
  } catch (err) {
    if (String(err.message || '').includes('UNIQUE')) {
      const e = new Error('Ese horario ya está reservado');
      e.status = 409;
      throw e;
    }
    throw err;
  }
  logAction(id, isReschedule ? 'reschedule' : 'payment', actor,
    isReschedule ? { date: fields.date, startTime: fields.startTime } : { status: fields.paymentStatus });
  return getAppointment(id);
}

// PII scrub: blanquea datos personales. Se usa al cancelar/liberar/marcar realizado.
function scrubPii(id) {
  db.prepare(`UPDATE appointments
              SET client_name='(anonimizado)', client_phone=NULL, client_email=NULL,
                  updated_at = datetime('now')
              WHERE id = ?`).run(id);
}

function deleteAppointment(id, actor = 'admin') {
  const cur = getAppointment(id);
  if (!cur) return false;
  // Primero borramos PII por si algo falla en el DELETE
  scrubPii(id);
  db.prepare(`DELETE FROM appointments WHERE id = ?`).run(id);
  logAction(id, 'cancel', actor, { date: cur.date, startTime: cur.startTime });
  return true;
}

function markAppointmentDone(id, actor = 'admin') {
  const cur = getAppointment(id);
  if (!cur) return null;
  scrubPii(id);
  db.prepare(`UPDATE appointments SET is_done=1, updated_at = datetime('now') WHERE id = ?`).run(id);
  logAction(id, 'done', actor, { date: cur.date, startTime: cur.startTime });
  return getAppointment(id);
}

// Cancela un turno: borra PII y elimina la fila (libera el slot). Loggea 'cancel'.
function cancelAppointment(id, actor = 'admin') {
  const cur = getAppointment(id);
  if (!cur) return false;
  scrubPii(id);
  db.prepare(`DELETE FROM appointments WHERE id = ?`).run(id);
  logAction(id, 'cancel', actor, {
    date: cur.date, startTime: cur.startTime, serviceName: cur.serviceName,
    depositAmount: cur.depositAmount ?? null,
  });
  return true;
}

// Libera un turno (mismo efecto que cancelar a nivel de datos) pero loggeado como 'release'.
// Pensado para casos donde el slot se libera sin ser una cancelación explícita del cliente.
function releaseAppointment(id, actor = 'admin') {
  const cur = getAppointment(id);
  if (!cur) return false;
  scrubPii(id);
  db.prepare(`DELETE FROM appointments WHERE id = ?`).run(id);
  logAction(id, 'release', actor, {
    date: cur.date, startTime: cur.startTime, serviceName: cur.serviceName,
  });
  return true;
}

function expirePendingAppointments() {
  const rows = db.prepare(`
    SELECT id FROM appointments
    WHERE payment_status = 'pending'
      AND pending_expires_at IS NOT NULL
      AND pending_expires_at < datetime('now')
  `).all();
  for (const r of rows) {
    scrubPii(r.id);
    db.prepare(`DELETE FROM appointments WHERE id = ?`).run(r.id);
    logAction(r.id, 'expire', 'system', null);
  }
  return rows.length;
}

function listAppointmentLogs(limit = 200) {
  const lim = Math.min(Number(limit) || 200, 1000);
  return db.prepare(`SELECT id, appointment_id, action, actor, payload, created_at
                     FROM appointment_logs
                     ORDER BY created_at DESC LIMIT ?`).all(lim).map((r) => ({
    id: r.id,
    appointmentId: r.appointment_id,
    action: r.action,
    actor: r.actor,
    payload: (() => { try { return r.payload ? JSON.parse(r.payload) : null; } catch { return null; } })(),
    createdAt: r.created_at,
  }));
}

// ─────────────────────────── Services ───────────────────────────
function listServices() {
  return db.prepare(`SELECT * FROM services ORDER BY position ASC, created_at ASC`).all().map(mapService);
}
function upsertService(s) {
  const pos = s.position == null ? Date.now() : Number(s.position);
  db.prepare(`
    INSERT INTO services (id, name, description, duration, price, image_url, available_days, position, section_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      duration = excluded.duration,
      price = excluded.price,
      image_url = excluded.image_url,
      available_days = excluded.available_days,
      position = excluded.position,
      section_id = excluded.section_id,
      updated_at = datetime('now')
  `).run(
    s.id, s.name, s.description || '', Number(s.duration), Number(s.price),
    s.imageUrl || null,
    JSON.stringify(Array.isArray(s.availableDays) ? s.availableDays : []),
    pos,
    s.sectionId || null
  );
  return mapService(db.prepare('SELECT * FROM services WHERE id = ?').get(s.id));
}
function deleteService(id) {
  return db.prepare('DELETE FROM services WHERE id = ?').run(id).changes > 0;
}

// ─────────────────────────── Special Services ───────────────────────────
function listSpecialServices() {
  return db.prepare('SELECT * FROM special_services ORDER BY date ASC').all().map(mapSpecial);
}
function upsertSpecialService(s) {
  const pos = s.position == null ? Date.now() : Number(s.position);
  db.prepare(`
    INSERT INTO special_services (id, name, description, duration, price, image_url, date, category_id, position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name, description = excluded.description,
      duration = excluded.duration, price = excluded.price,
      image_url = excluded.image_url, date = excluded.date,
      category_id = excluded.category_id, position = excluded.position,
      updated_at = datetime('now')
  `).run(s.id, s.name, s.description || '', Number(s.duration), Number(s.price),
         s.imageUrl || null, s.date || null, s.categoryId || null, pos);
  return mapSpecial(db.prepare('SELECT * FROM special_services WHERE id = ?').get(s.id));
}
function deleteSpecialService(id) {
  return db.prepare('DELETE FROM special_services WHERE id = ?').run(id).changes > 0;
}


// ─────────────────────────── Sections ───────────────────────────
function mapSection(r) {
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    description: r.description || '',
    imageUrl: r.image_url || undefined,
    position: Number(r.position || 0),
  };
}
function listSections() {
  return db.prepare('SELECT * FROM sections ORDER BY position ASC, created_at ASC').all().map(mapSection);
}
function upsertSection(s) {
  const pos = s.position == null ? Date.now() : Number(s.position);
  db.prepare(`
    INSERT INTO sections (id, name, description, image_url, position)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      image_url = excluded.image_url,
      position = excluded.position,
      updated_at = datetime('now')
  `).run(s.id, s.name, s.description || '', s.imageUrl || null, pos);
  return mapSection(db.prepare('SELECT * FROM sections WHERE id = ?').get(s.id));
}
function deleteSection(id) {
  // Al borrar una sección, los servicios huérfanos quedan sin sectionId (no se borran).
  db.prepare('UPDATE services SET section_id = NULL WHERE section_id = ?').run(id);
  return db.prepare('DELETE FROM sections WHERE id = ?').run(id).changes > 0;
}

// ─────────────────────────── Schedule ───────────────────────────
function listSchedule() {
  return db.prepare('SELECT day_of_week, slots FROM schedule ORDER BY day_of_week ASC').all().map((r) => ({
    id: String(r.day_of_week),
    dayOfWeek: r.day_of_week,
    slots: (() => { try { return JSON.parse(r.slots) || []; } catch { return []; } })(),
  }));
}
function setSchedule(scheduleArr) {
  const tx = db.transaction((arr) => {
    for (const row of arr) {
      db.prepare(`
        INSERT INTO schedule (day_of_week, slots) VALUES (?, ?)
        ON CONFLICT(day_of_week) DO UPDATE SET slots = excluded.slots, updated_at = datetime('now')
      `).run(Number(row.dayOfWeek), JSON.stringify(row.slots || []));
    }
  });
  tx(scheduleArr);
  return listSchedule();
}

// ─────────────────────────── Blocked Dates ───────────────────────────
function listBlockedDates() {
  return db.prepare('SELECT date, reason FROM blocked_dates ORDER BY date ASC').all();
}
function addBlockedDate(date, reason) {
  db.prepare(`INSERT INTO blocked_dates (date, reason) VALUES (?, ?)
              ON CONFLICT(date) DO UPDATE SET reason = excluded.reason`).run(date, reason || null);
  return { date, reason: reason || null };
}
function removeBlockedDate(date) {
  return db.prepare('DELETE FROM blocked_dates WHERE date = ?').run(date).changes > 0;
}

// ─────────────────────────── Settings ───────────────────────────
function getSetting(key) {
  const r = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return r ? r.value : null;
}
function setSetting(key, value) {
  db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?)
              ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(key, value);
}

// ─────────────────────────── Payments ───────────────────────────
function upsertPayment(p) {
  db.prepare(`
    INSERT INTO payments (id, status, preference_id, amount, client_name, client_email, service_name, date, start_time, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      status = excluded.status, preference_id = excluded.preference_id, amount = excluded.amount,
      client_name = excluded.client_name, client_email = excluded.client_email, service_name = excluded.service_name,
      date = excluded.date, start_time = excluded.start_time, expires_at = excluded.expires_at,
      updated_at = datetime('now')
  `).run(
    p.id, p.status || 'pending', p.preferenceId || null, p.amount || null,
    p.clientName || null, p.clientEmail || null, p.serviceName || null,
    p.date || null, p.startTime || null, p.expiresAt || null
  );
  return mapPayment(db.prepare('SELECT * FROM payments WHERE id = ?').get(p.id));
}
function getPayment(id) { return mapPayment(db.prepare('SELECT * FROM payments WHERE id = ?').get(id)); }
function getPaymentByMpId(mpId) {
  return mapPayment(db.prepare('SELECT * FROM payments WHERE payment_id = ?').get(String(mpId)));
}
function updatePaymentStatus(id, fields) {
  db.prepare(`UPDATE payments SET
    status = ?, payment_id = COALESCE(?, payment_id),
    mp_status = COALESCE(?, mp_status), mp_status_detail = COALESCE(?, mp_status_detail),
    updated_at = datetime('now')
    WHERE id = ?`).run(
    fields.status, fields.paymentId || null,
    fields.mpStatus || null, fields.mpStatusDetail || null, id
  );
  return getPayment(id);
}
function expirePayments() {
  return db.prepare(`UPDATE payments SET status='expired', updated_at=datetime('now')
                     WHERE status='pending' AND expires_at IS NOT NULL AND expires_at < datetime('now')`).run().changes;
}

// ─────────────────────────── Retention / cleanup ───────────────────────────
function runRetention({ retentionDays, maxLogs }) {
  const days = Math.max(1, Number(retentionDays) || 90);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // Borra turnos viejos ya finalizados
  const delAppt = db.prepare(`DELETE FROM appointments WHERE is_done = 1 AND date < ?`).run(cutoff).changes;
  // Borra logs anteriores al retentionDays
  const delLogsByAge = db.prepare(`DELETE FROM appointment_logs WHERE created_at < datetime('now', ?)`)
                         .run(`-${days} days`).changes;
  // Trim por cantidad máxima
  const limit = Math.max(50, Number(maxLogs) || 500);
  const delLogsByCount = db.prepare(`
    DELETE FROM appointment_logs WHERE id NOT IN (
      SELECT id FROM appointment_logs ORDER BY created_at DESC LIMIT ?
    )
  `).run(limit).changes;
  // Borra pagos expirados/falladas viejos
  const delPay = db.prepare(`DELETE FROM payments WHERE status IN ('expired','failed') AND updated_at < datetime('now', ?)`)
                   .run(`-${days} days`).changes;

  return { delAppt, delLogsByAge, delLogsByCount, delPay };
}

// ─────────────────────────── Backup (file copy) ───────────────────────────
function backupTo(filePath) {
  // better-sqlite3 ofrece backup online vía .backup()
  return db.backup(filePath);
}


// ─────────────────────────── Special Categories ───────────────────────────
function mapSpecialCategory(r) {
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    description: r.description || '',
    imageUrl: r.image_url || undefined,
    position: Number(r.position || 0),
  };
}
function listSpecialCategories() {
  return db.prepare('SELECT * FROM special_categories ORDER BY position ASC, created_at ASC')
    .all().map(mapSpecialCategory);
}
function upsertSpecialCategory(s) {
  const pos = s.position == null ? Date.now() : Number(s.position);
  db.prepare(`
    INSERT INTO special_categories (id, name, description, image_url, position)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name, description = excluded.description,
      image_url = excluded.image_url, position = excluded.position,
      updated_at = datetime('now')
  `).run(s.id, s.name, s.description || '', s.imageUrl || null, pos);
  return mapSpecialCategory(db.prepare('SELECT * FROM special_categories WHERE id = ?').get(s.id));
}
function deleteSpecialCategory(id) {
  db.prepare('UPDATE special_services SET category_id = NULL WHERE category_id = ?').run(id);
  return db.prepare('DELETE FROM special_categories WHERE id = ?').run(id).changes > 0;
}

// ─────────────────────────── Promotions ───────────────────────────
function mapPromotion(r) {
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    description: r.description || '',
    phone: r.phone || undefined,
    position: Number(r.position || 0),
  };
}
function listPromotions() {
  return db.prepare('SELECT * FROM promotions ORDER BY position ASC, created_at ASC')
    .all().map(mapPromotion);
}
function upsertPromotion(p) {
  const pos = p.position == null ? Date.now() : Number(p.position);
  const phone = (p.phone || '').replace(/\D/g, '') || null;
  db.prepare(`
    INSERT INTO promotions (id, name, description, phone, position)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name, description = excluded.description,
      phone = excluded.phone, position = excluded.position,
      updated_at = datetime('now')
  `).run(p.id, p.name, p.description || '', phone, pos);
  return mapPromotion(db.prepare('SELECT * FROM promotions WHERE id = ?').get(p.id));
}
function deletePromotion(id) {
  return db.prepare('DELETE FROM promotions WHERE id = ?').run(id).changes > 0;
}

// ─────────────────────────── Unique Services ───────────────────────────
function mapUnique(r) {
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    description: r.description || '',
    imageUrl: r.image_url || undefined,
    phone: r.phone || undefined,
    position: Number(r.position || 0),
  };
}
function listUniqueServices() {
  return db.prepare('SELECT * FROM unique_services ORDER BY position ASC, created_at ASC').all().map(mapUnique);
}
function upsertUniqueService(u) {
  const pos = u.position == null ? Date.now() : Number(u.position);
  db.prepare(`
    INSERT INTO unique_services (id, name, description, image_url, phone, position)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      image_url = excluded.image_url,
      phone = excluded.phone,
      position = excluded.position,
      updated_at = datetime('now')
  `).run(u.id, u.name, u.description || '', u.imageUrl || null, u.phone || null, pos);
  return mapUnique(db.prepare('SELECT * FROM unique_services WHERE id = ?').get(u.id));
}
function deleteUniqueService(id) {
  return db.prepare('DELETE FROM unique_services WHERE id = ?').run(id).changes > 0;
}

function ping() {
  try { return db.prepare('SELECT 1 as ok').get().ok === 1; } catch { return false; }
}

function close() { try { db.close(); } catch {} }

module.exports = {
  db, init, ping, close, backupTo,
  // appointments
  listAppointments, getAppointment, createAppointment, patchAppointment,
  deleteAppointment, markAppointmentDone, cancelAppointment, releaseAppointment,
  expirePendingAppointments, listAppointmentLogs,
  // validaciones
  assertSlotValid,
  // services
  listServices, upsertService, deleteService,
  // special services
  listSpecialServices, upsertSpecialService, deleteSpecialService,
  // sections
  listSections, upsertSection, deleteSection,
  // special categories
  listSpecialCategories, upsertSpecialCategory, deleteSpecialCategory,
  // promotions
  listPromotions, upsertPromotion, deletePromotion,
  // unique services
  listUniqueServices, upsertUniqueService, deleteUniqueService,
  // schedule
  listSchedule, setSchedule,
  // blocked
  listBlockedDates, addBlockedDate, removeBlockedDate,
  // settings
  getSetting, setSetting,
  // payments
  upsertPayment, getPayment, getPaymentByMpId, updatePaymentStatus, expirePayments,
  // retention
  runRetention,
};
