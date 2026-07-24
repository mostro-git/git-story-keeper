const fs = require('fs');
const path = require('path');

const PROD = process.env.NODE_ENV === 'production';
const LOG_TO_FILE = String(process.env.LOG_TO_FILE || '').toLowerCase() === 'true';

let stream = null;
if (LOG_TO_FILE) {
  try {
    const dir = path.join(__dirname, '..', 'logs');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    stream = fs.createWriteStream(path.join(dir, 'app.log'), { flags: 'a' });
  } catch (e) {
    console.error('[LOGGER] no se pudo abrir logs/app.log:', e.message);
  }
}

function ts() {
  return new Date().toISOString();
}
function write(line) {
  if (stream) stream.write(line + '\n');
}
function log(tag, ...args) {
  const line = `[${ts()}] [INFO] [${tag}] ${args.map(String).join(' ')}`;
  console.log(line);
  write(line);
}
function logError(tag, ...args) {
  const line = `[${ts()}] [ERROR] [${tag}] ${args.map(String).join(' ')}`;
  console.error(line);
  write(line);
}

// PII masking — usar siempre en logs
function maskEmail(email) {
  if (!email) return '';
  const [u, d] = String(email).split('@');
  if (!d) return '***';
  return `${u.slice(0, 2)}***@${d}`;
}
function maskPhone(phone) {
  if (!phone) return '';
  const s = String(phone).replace(/[^\d+]/g, '');
  if (s.length < 4) return '***';
  return `${s.slice(0, 3)}****${s.slice(-2)}`;
}
function maskName(name) {
  if (!name) return '';
  const s = String(name).trim();
  return PROD ? `${s.slice(0, 1)}***` : s;
}

module.exports = { log, logError, maskEmail, maskPhone, maskName, PROD };
