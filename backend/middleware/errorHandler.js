/**
 * Manejador global de errores + wrapper async.
 * Evita try/catch repetitivos en cada ruta.
 */
const { logError } = require('../utils/logger');

// Wrap: const route = asyncHandler(async (req,res) => {...})
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

class HttpError extends Error {
  constructor(status, publicMessage, internal) {
    super(publicMessage);
    this.status = status;
    this.publicMessage = publicMessage;
    this.internal = internal;
  }
}

// Middleware: SIEMPRE el último app.use()
function errorHandler(err, req, res, _next) {
  if (err && err.message && err.message.startsWith('CORS:')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (err instanceof HttpError) {
    if (err.internal) logError('REQ', err.internal);
    return res.status(err.status).json({ error: err.publicMessage });
  }
  // Errores con status explícito (validaciones de negocio)
  if (err && typeof err.status === 'number' && err.status < 500) {
    return res.status(err.status).json({ error: err.message || 'Bad request' });
  }
  logError('UNHANDLED', err.message || String(err));
  res.status(500).json({ error: 'Internal error' });
}

module.exports = { asyncHandler, HttpError, errorHandler };
