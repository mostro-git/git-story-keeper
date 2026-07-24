/**
 * Auth admin simple: una sola contraseña global (ADMIN_PANEL_PASSWORD).
 * Sin usuarios, sin roles. Devuelve un JWT firmado con JWT_SECRET.
 */
const jwt = require('jsonwebtoken');
const { HttpError } = require('./errorHandler');

const TTL = process.env.JWT_TTL || '12h';

function signToken() {
  return jwt.sign({ scope: 'admin' }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: TTL,
  });
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
}

function requireAdmin(req, _res, next) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return next(new HttpError(401, 'Token requerido'));
  try {
    req.admin = verifyToken(h.slice(7).trim());
    if (req.admin?.scope !== 'admin') throw new Error('scope');
    next();
  } catch {
    next(new HttpError(401, 'Token inválido o vencido'));
  }
}

module.exports = { signToken, verifyToken, requireAdmin };
