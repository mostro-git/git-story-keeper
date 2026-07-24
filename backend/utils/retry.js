/**
 * Helpers: timeout estricto + retry con backoff exponencial.
 */
function withTimeout(promise, ms = 5000, label = 'op') {
  let to;
  const timeout = new Promise((_, rej) => {
    to = setTimeout(() => rej(new Error(`${label} timeout (${ms}ms)`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(to));
}

/**
 * Retry con backoff exponencial.
 * delays por defecto: 5s, 15s (2 reintentos después del primer intento → 3 intentos totales).
 */
async function retry(fn, { attempts = 3, delays = [5000, 15000], label = 'op' } = {}) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        const wait = delays[i] ?? delays[delays.length - 1] ?? 5000;
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }
  throw lastErr;
}

module.exports = { withTimeout, retry };
