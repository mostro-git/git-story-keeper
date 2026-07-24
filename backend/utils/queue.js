/**
 * Cola simple en memoria para desacoplar el envío de notificaciones del
 * webhook de pagos. NO bloquea la respuesta a Mercado Pago.
 *
 * - Procesamiento secuencial (1 worker).
 * - Cada job se reintenta con backoff exponencial vía utils/retry.
 * - Si el proceso muere antes de drenar la cola, los pagos quedan
 *   marcados como `paid` igual; se puede reenviar manualmente desde el panel.
 */
const { log, logError } = require('./logger');
const { retry, withTimeout } = require('./retry');

const queue = [];
let running = false;

async function worker() {
  if (running) return;
  running = true;
  while (queue.length) {
    const job = queue.shift();
    try {
      await retry(
        () => withTimeout(job.fn(), job.timeoutMs || 5000, job.label),
        { attempts: 3, delays: [5000, 15000], label: job.label }
      );
      log('QUEUE', `✓ ${job.label}`);
    } catch (err) {
      logError('QUEUE', `✗ ${job.label}: ${err.message}`);
      if (typeof job.onError === 'function') {
        try { job.onError(err); } catch (_e) { /* noop */ }
      }
    }
  }
  running = false;
}

/**
 * @param {{ label: string, fn: () => Promise<any>, timeoutMs?: number, onError?: (e:Error)=>void }} job
 */
function enqueue(job) {
  queue.push(job);
  // setImmediate para no bloquear el caller
  setImmediate(worker);
}

function size() { return queue.length; }

module.exports = { enqueue, size };
