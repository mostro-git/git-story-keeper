/**
 * Meraki — backend Node + Express + SQLite (self-hosted).
 *
 * Endpoints:
 *   GET   /health
 *   POST  /api/auth/login                — { password } → { token }
 *   GET   /api/auth/me                   — requiere JWT
 *
 *   GET   /api/services                  — público
 *   POST  /api/services                  — admin (upsert)
 *   DELETE/api/services/:id              — admin
 *
 *   GET   /api/sections                  — público
 *   POST  /api/sections                  — admin (upsert)
 *   DELETE/api/sections/:id              — admin
 *
 *   GET   /api/special-services          — público
 *   POST  /api/special-services          — admin (upsert)
 *   DELETE/api/special-services/:id      — admin
 *
 *   GET   /api/schedule                  — público
 *   PUT   /api/schedule                  — admin
 *
 *   GET   /api/blocked-dates             — público
 *   POST  /api/blocked-dates             — admin
 *   DELETE/api/blocked-dates/:date       — admin
 *
 *   GET   /api/appointments              — público (lectura)
 *   POST  /api/appointments              — público (crear) o admin
 *   PUT   /api/appointments/:id          — admin
 *   POST  /api/appointments/:id/done     — admin (marca realizado + scrub PII)
 *   DELETE/api/appointments/:id          — admin (borra + scrub PII)
 *   GET   /api/appointments/logs         — admin (auditoría anonimizada)
 *
 *   POST  /api/payments/create-preference — público (MercadoPago)
 *   POST  /api/payments/webhook           — público (callback MP)
 *   GET   /api/payments/status/:id        — público
 *
 *   POST  /api/notifications/send-confirmation — admin
 *   POST  /api/notifications/send-reschedule   — admin
 *   POST  /api/notifications/send-cancellation — admin
 */
const path = require('path');
const fs = require('fs');
const envPath = path.join(__dirname, '.env');
require('dotenv').config({ path: envPath });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const { assertEnv } = require('./utils/env');
const { log, logError, PROD } = require('./utils/logger');
const { validateCreatePreference, validateNotify, validateReschedule } = require('./utils/validate');
const {
  handleValidation,
  createPreferenceRules, notifyRules, rescheduleRules,
  idParamRule, loginRules,
  appointmentRules, appointmentPatchRules,
  serviceRules, sectionRules, blockedDateRules, scheduleRules,
  specialServiceRules, specialCategoryRules, promotionRules,
  uniqueServiceRules,
} = require('./middleware/validators');
const { asyncHandler, HttpError, errorHandler } = require('./middleware/errorHandler');
const { requireAdmin, signToken } = require('./middleware/auth');

assertEnv();

const store = require('./db/sqlite');
const paymentService = require('./services/paymentService');
const emailService = require('./services/emailService');
const whatsappService = require('./services/whatsappService');
const dailyAgendaService = require('./services/dailyAgendaService');
const queue = require('./utils/queue');

const app = express();
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Body grande para permitir imágenes base64 en services (data URLs).
app.use(express.json({ limit: '6mb' }));

const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',').map((s) => s.trim()).filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) return cb(null, true);
    return cb(new Error('CORS: origen no permitido'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

// Rate limit global
app.use(rateLimit({
  windowMs: 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes' },
}));

const writeLimiter = rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false });
const readLimiter  = rateLimit({ windowMs: 60_000, max: 300, standardHeaders: true, legacyHeaders: false });
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Demasiados intentos. Probá en 15 minutos.' },
});

// ───────── Health ─────────
app.get('/health', (_req, res) => {
  const ok = store.ping();
  res.status(ok ? 200 : 503).json({
    ok, db: ok ? 'up' : 'down', queue: queue.size(),
    mp: paymentService.mpReady() ? 'up' : 'down',
    email: emailService.enabled ? 'up' : 'down',
    whatsapp: whatsappService.enabled ? 'up' : 'down',
    ts: new Date().toISOString(),
  });
});

// ═════════════════ AUTH ═════════════════
// Comparación constante para evitar timing attacks
function constantTimeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) {
    // Forzamos comparación con buffer del mismo tamaño igual
    crypto.timingSafeEqual(ba, Buffer.alloc(ba.length));
    return false;
  }
  return crypto.timingSafeEqual(ba, bb);
}

app.post('/api/auth/login', loginLimiter, loginRules, handleValidation, (req, res) => {
  const { password } = req.body || {};
  if (!constantTimeEqual(password, process.env.ADMIN_PANEL_PASSWORD)) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }
  log('AUTH', `login ok ip=${req.ip}`);
  res.json({ token: signToken(), user: { scope: 'admin' } });
});

app.get('/api/auth/me', requireAdmin, (req, res) => {
  res.json({ user: { scope: req.admin.scope } });
});

// ═════════════════ SERVICES ═════════════════
app.get('/api/services', readLimiter, (_req, res) => res.json(store.listServices()));

app.post('/api/services', requireAdmin, writeLimiter, serviceRules, handleValidation, (req, res) => {
  const created = store.upsertService(req.body || {});
  res.json(created);
});

app.delete('/api/services/:id', requireAdmin, writeLimiter, idParamRule, handleValidation, (req, res) => {
  const ok = store.deleteService(req.params.id);
  res.json({ ok });
});

// ═════════════════ SPECIAL SERVICES ═════════════════
app.get('/api/special-services', readLimiter, (_req, res) => res.json(store.listSpecialServices()));

app.post('/api/special-services', requireAdmin, writeLimiter, specialServiceRules, handleValidation, (req, res, next) => {
  try { res.json(store.upsertSpecialService(req.body || {})); } catch (e) { next(e); }
});

app.delete('/api/special-services/:id', requireAdmin, writeLimiter, idParamRule, handleValidation, (req, res) => {
  res.json({ ok: store.deleteSpecialService(req.params.id) });
});

// ═════════════════ SECTIONS ═════════════════
app.get('/api/sections', readLimiter, (_req, res) => res.json(store.listSections()));

app.post('/api/sections', requireAdmin, writeLimiter, sectionRules, handleValidation, (req, res) => {
  res.json(store.upsertSection(req.body || {}));
});

app.delete('/api/sections/:id', requireAdmin, writeLimiter, idParamRule, handleValidation, (req, res) => {
  res.json({ ok: store.deleteSection(req.params.id) });
});

// ═════════════════ SPECIAL CATEGORIES ═════════════════
app.get('/api/special-categories', readLimiter, (_req, res) => res.json(store.listSpecialCategories()));

app.post('/api/special-categories', requireAdmin, writeLimiter, specialCategoryRules, handleValidation, (req, res) => {
  res.json(store.upsertSpecialCategory(req.body || {}));
});

app.delete('/api/special-categories/:id', requireAdmin, writeLimiter, idParamRule, handleValidation, (req, res) => {
  res.json({ ok: store.deleteSpecialCategory(req.params.id) });
});

// ═════════════════ PROMOTIONS ═════════════════
app.get('/api/promotions', readLimiter, (_req, res) => res.json(store.listPromotions()));

app.post('/api/promotions', requireAdmin, writeLimiter, promotionRules, handleValidation, (req, res) => {
  res.json(store.upsertPromotion(req.body || {}));
});

app.delete('/api/promotions/:id', requireAdmin, writeLimiter, idParamRule, handleValidation, (req, res) => {
  res.json({ ok: store.deletePromotion(req.params.id) });
});

// ═════════════════ UNIQUE SERVICES (WhatsApp directo) ═════════════════
app.get('/api/unique-services', readLimiter, (_req, res) => res.json(store.listUniqueServices()));

app.post('/api/unique-services', requireAdmin, writeLimiter, uniqueServiceRules, handleValidation, (req, res) => {
  res.json(store.upsertUniqueService(req.body || {}));
});

app.delete('/api/unique-services/:id', requireAdmin, writeLimiter, idParamRule, handleValidation, (req, res) => {
  res.json({ ok: store.deleteUniqueService(req.params.id) });
});

// ═════════════════ SCHEDULE ═════════════════
app.get('/api/schedule', readLimiter, (_req, res) => res.json(store.listSchedule()));

app.put('/api/schedule', requireAdmin, writeLimiter, scheduleRules, handleValidation, (req, res) => {
  res.json(store.setSchedule(req.body.schedule));
});

// ═════════════════ BLOCKED DATES ═════════════════
app.get('/api/blocked-dates', readLimiter, (_req, res) => res.json(store.listBlockedDates()));

app.post('/api/blocked-dates', requireAdmin, writeLimiter, blockedDateRules, handleValidation, (req, res) => {
  res.json(store.addBlockedDate(req.body.date, req.body.reason));
});

app.delete('/api/blocked-dates/:date', requireAdmin, writeLimiter, (req, res) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(req.params.date)) return res.status(400).json({ error: 'date inválida' });
  res.json({ ok: store.removeBlockedDate(req.params.date) });
});

// ═════════════════ APPOINTMENTS ═════════════════
app.get('/api/appointments', readLimiter, (_req, res) => {
  try { store.expirePendingAppointments(); } catch {}
  res.json(store.listAppointments());
});

app.post('/api/appointments', writeLimiter, appointmentRules, handleValidation, asyncHandler(async (req, res) => {
  const actor = (() => {
    const h = req.headers.authorization || '';
    if (!h.startsWith('Bearer ')) return 'client';
    try { require('./middleware/auth').verifyToken(h.slice(7).trim()); return 'admin'; } catch { return 'client'; }
  })();
  const created = store.createAppointment(req.body || {}, actor);
  res.status(201).json(created);
}));

app.put('/api/appointments/:id', requireAdmin, writeLimiter, idParamRule, appointmentPatchRules, handleValidation,
  asyncHandler(async (req, res) => {
    const updated = store.patchAppointment(req.params.id, req.body || {}, 'admin');
    if (!updated) throw new HttpError(404, 'Turno no encontrado');
    res.json(updated);
  })
);

app.post('/api/appointments/:id/done', requireAdmin, writeLimiter, idParamRule, handleValidation, (req, res) => {
  const r = store.markAppointmentDone(req.params.id, 'admin');
  if (!r) return res.status(404).json({ error: 'Turno no encontrado' });
  res.json(r);
});

app.post('/api/appointments/:id/cancel', requireAdmin, writeLimiter, idParamRule, handleValidation, (req, res) => {
  const ok = store.cancelAppointment(req.params.id, 'admin');
  if (!ok) return res.status(404).json({ error: 'Turno no encontrado' });
  res.json({ ok: true, action: 'cancel' });
});

app.post('/api/appointments/:id/release', requireAdmin, writeLimiter, idParamRule, handleValidation, (req, res) => {
  const ok = store.releaseAppointment(req.params.id, 'admin');
  if (!ok) return res.status(404).json({ error: 'Turno no encontrado' });
  res.json({ ok: true, action: 'release' });
});

app.delete('/api/appointments/:id', requireAdmin, writeLimiter, idParamRule, handleValidation, (req, res) => {
  const ok = store.deleteAppointment(req.params.id, 'admin');
  if (!ok) return res.status(404).json({ error: 'Turno no encontrado' });
  res.json({ ok: true });
});

app.get('/api/appointments/logs', requireAdmin, readLimiter, (req, res) => {
  res.json(store.listAppointmentLogs(req.query.limit));
});

// ═════════════════ PAYMENTS ═════════════════
app.post('/api/payments/create-preference', writeLimiter, createPreferenceRules, handleValidation,
  asyncHandler(async (req, res) => {
    const { data, errors } = validateCreatePreference(req.body || {});
    if (errors.length) throw new HttpError(400, errors.join(', '));
    // serviceId opcional para validar deposit
    data.serviceId = req.body.serviceId;
    const result = await paymentService.createPreference(data);
    res.json(result);
  })
);

app.post('/api/payments/webhook', (req, res) => {
  res.sendStatus(200);
  (async () => {
    try {
      const { type, data } = req.body || {};
      const action = req.body?.action || '';
      const isPayment = type === 'payment' || action.startsWith('payment.');
      if (!isPayment || !data?.id) return;
      await paymentService.processMpPayment(data.id);
    } catch (err) {
      logError('WEBHOOK', err.message);
    }
  })();
});

app.get('/api/payments/status/:id', readLimiter, idParamRule, handleValidation,
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    let record = store.getPayment(id);
    if (!record) return res.json({ status: 'pending' });
    if (record.status === 'pending') {
      record = (await paymentService.reconcileStatus(id)) || record;
    }
    res.json({ status: record.status });
  })
);

// ═════════════════ NOTIFICACIONES (admin) ═════════════════
app.post('/api/notifications/send-confirmation', requireAdmin, writeLimiter, notifyRules, handleValidation,
  (req, res) => {
    const { data, errors } = validateNotify(req.body || {});
    if (errors.length) return res.status(400).json({ error: errors.join(', ') });
    paymentService.notifyManual(data);
    res.json({ ok: true });
  });

app.post('/api/notifications/send-reschedule', requireAdmin, writeLimiter, rescheduleRules, handleValidation,
  (req, res) => {
    const { data, errors } = validateReschedule(req.body || {});
    if (errors.length) return res.status(400).json({ error: errors.join(', ') });
    paymentService.notifyReschedule(data);
    res.json({ ok: true });
  });

app.post('/api/notifications/send-cancellation', requireAdmin, writeLimiter, notifyRules, handleValidation,
  (req, res) => {
    const { data, errors } = validateNotify(req.body || {});
    if (errors.length) return res.status(400).json({ error: errors.join(', ') });
    paymentService.notifyCancellation(data);
    res.json({ ok: true });
  });

// ═════════════════ Servir frontend buildado (opcional) ═════════════════
// Si existe ../dist (build de Vite), lo servimos desde el mismo proceso.
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get(/^\/(?!api\/|health$).*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

// ═════════════════ Jobs programados ═════════════════
const RETENTION_DAYS = Number(process.env.DATA_RETENTION_DAYS || 90);
const MAX_LOGS = Number(process.env.MAX_HISTORY_RECORDS || 500);

setInterval(() => {
  try {
    const n = store.expirePayments();
    if (n > 0) log('CRON', `${n} pago(s) expirados`);
    const m = store.expirePendingAppointments();
    if (m > 0) log('CRON', `${m} turno(s) pending liberados (PII borrada)`);
  } catch (err) { logError('CRON', err.message); }
}, 5 * 60 * 1000);

setInterval(() => {
  try {
    const r = store.runRetention({ retentionDays: RETENTION_DAYS, maxLogs: MAX_LOGS });
    if (r.delAppt + r.delLogsByAge + r.delLogsByCount + r.delPay > 0) {
      log('CLEANUP', `appts=${r.delAppt} logsByAge=${r.delLogsByAge} logsByCount=${r.delLogsByCount} pay=${r.delPay}`);
    }
  } catch (err) { logError('CLEANUP', err.message); }
}, 6 * 60 * 60 * 1000); // cada 6 horas

// Agenda diaria: 90 min antes del inicio de la franja 1 de cada día.
setInterval(() => { dailyAgendaService.tick(); }, 5 * 60 * 1000);
setTimeout(() => { dailyAgendaService.tick(); }, 15 * 1000);

// Backup diario sencillo (copia del .sqlite)
const backupDir = path.join(__dirname, 'data', 'backups');
const BACKUP_KEEP = Math.max(1, Number(process.env.BACKUP_KEEP || 7));
function runBackup() {
  try {
    fs.mkdirSync(backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dest = path.join(backupDir, `meraki-${stamp}.sqlite`);
    store.backupTo(dest).then(() => {
      log('BACKUP', `✓ ${path.basename(dest)}`);
      // Rotar: dejar últimos BACKUP_KEEP
      const files = fs.readdirSync(backupDir)
        .filter((f) => f.startsWith('meraki-') && f.endsWith('.sqlite'))
        .map((f) => ({ f, t: fs.statSync(path.join(backupDir, f)).mtimeMs }))
        .sort((a, b) => b.t - a.t);
      for (const { f } of files.slice(BACKUP_KEEP)) {
        try { fs.unlinkSync(path.join(backupDir, f)); } catch {}
      }
    }).catch((err) => logError('BACKUP', err.message));
  } catch (err) { logError('BACKUP', err.message); }
}
setTimeout(runBackup, 30 * 1000);
setInterval(runBackup, 24 * 60 * 60 * 1000);

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  try {
    store.init();
    app.listen(PORT, () => {
      console.log(`\n✅ Meraki backend en http://localhost:${PORT}  (${PROD ? 'PROD' : 'DEV'})`);
      console.log(`   DB:        ${path.resolve(process.cwd(), process.env.DB_PATH || './data/meraki.sqlite')}`);
      console.log(`   CORS:      ${allowedOrigins.join(', ') || '(ninguno)'}`);
      console.log(`   ADMIN:     contraseña vía ADMIN_PANEL_PASSWORD ✓`);
      console.log(`   JWT:       ${process.env.JWT_TTL || '12h'}`);
      console.log(`   MP:        ${paymentService.mpReady() ? '✓' : '✗ (sin MP_ACCESS_TOKEN)'}`);
      console.log(`   GMAIL:     ${emailService.enabled ? '✓' : '✗ (sin GMAIL_USER/PASSWORD)'}`);
      console.log(`   TWILIO:    ${whatsappService.enabled ? `✓ (${whatsappService.channel})` : '✗ (opcional)'}`);
      console.log(`   AGENDA:    ${process.env.AGENDA_NOTIFY_EMAIL ? `✓ ${process.env.AGENDA_NOTIFY_EMAIL} (90 min antes de franja 1)` : '✗ (sin AGENDA_NOTIFY_EMAIL)'}`);
      console.log(`   RETENCIÓN: ${RETENTION_DAYS} días · ${MAX_LOGS} logs máx\n`);
    });
  } catch (err) {
    console.error('❌ Startup error:', err.message);
    process.exit(1);
  }
}

process.on('SIGINT',  () => { store.close(); process.exit(0); });
process.on('SIGTERM', () => { store.close(); process.exit(0); });

module.exports = app;
