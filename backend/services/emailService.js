const nodemailer = require('nodemailer');
const { log, logError, maskEmail } = require('../utils/logger');

let transporter = null;
const enabled = !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);

if (enabled) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
  transporter.verify((err) => {
    if (err) logError('EMAIL', 'Gmail SMTP no verificado:', err.message);
    else log('EMAIL', '✓ Gmail SMTP listo');
  });
}

function prettyDate(date) {
  const m = String(date || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : date;
}

// Escape HTML para evitar inyección en templates
function esc(str) {
  return String(str || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

async function sendConfirmation({ to, clientName, serviceName, date, startTime }) {
  if (!enabled || !to) return false;
  const fecha = prettyDate(date);
  const html = `
    <div style="font-family:Arial,sans-serif;font-size:15px;color:#333;line-height:1.5">
      <p>Hola <strong>${esc(clientName)}</strong>,</p>
      <p>Tu turno de <strong>${esc(serviceName)}</strong> ha sido confirmado para
      <strong>${esc(fecha)}</strong> a las <strong>${esc(startTime)}</strong>.</p>
      <p style="margin-top:24px;color:#a86b6b"><em>Meraki Estética</em></p>
    </div>`;
  try {
    await transporter.sendMail({
      from: `"Meraki Estética" <${process.env.GMAIL_USER}>`,
      to,
      subject: 'Confirmación de turno — Meraki Estética',
      text: `Hola ${clientName}, tu turno de ${serviceName} fue confirmado para ${fecha} a las ${startTime}. — Meraki Estética`,
      html,
    });
    log('EMAIL', `enviado a ${maskEmail(to)}`);
    return true;
  } catch (err) {
    logError('EMAIL', err.message);
    return false;
  }
}

async function sendReschedule({ to, clientName, serviceName, oldDate, oldStartTime, date, startTime }) {
  if (!enabled || !to) return false;
  const fechaNueva = prettyDate(date);
  const fechaVieja = prettyDate(oldDate);
  const html = `
    <div style="font-family:Arial,sans-serif;font-size:15px;color:#333;line-height:1.5">
      <p>Hola <strong>${esc(clientName)}</strong>,</p>
      <p>Tu turno de <strong>${esc(serviceName)}</strong> fue <strong>reprogramado</strong>.</p>
      <p style="margin:12px 0">
        <span style="color:#888;text-decoration:line-through">${esc(fechaVieja)} ${esc(oldStartTime)}</span><br/>
        Nueva fecha: <strong>${esc(fechaNueva)}</strong> a las <strong>${esc(startTime)}</strong>.
      </p>
      <p style="margin-top:24px;color:#a86b6b"><em>Meraki Estética</em></p>
    </div>`;
  try {
    await transporter.sendMail({
      from: `"Meraki Estética" <${process.env.GMAIL_USER}>`,
      to,
      subject: 'Tu turno fue reprogramado — Meraki Estética',
      text: `Hola ${clientName}, tu turno de ${serviceName} fue reprogramado. Antes: ${fechaVieja} ${oldStartTime}. Ahora: ${fechaNueva} ${startTime}. — Meraki Estética`,
      html,
    });
    log('EMAIL', `reschedule enviado a ${maskEmail(to)}`);
    return true;
  } catch (err) {
    logError('EMAIL', err.message);
    return false;
  }
}

async function sendCancellation({ to, clientName, serviceName, date, startTime }) {
  if (!enabled || !to) return false;
  const fecha = prettyDate(date);
  const html = `
    <div style="font-family:Arial,sans-serif;font-size:15px;color:#333;line-height:1.5">
      <p>Hola <strong>${esc(clientName)}</strong>,</p>
      <p>Te informamos que tu turno de <strong>${esc(serviceName)}</strong> del
      <strong>${esc(fecha)}</strong> a las <strong>${esc(startTime)}</strong> ha sido <strong>cancelado</strong>.</p>
      <p>Si querés reservar otro horario, podés hacerlo desde nuestra web.</p>
      <p style="margin-top:24px;color:#a86b6b"><em>Meraki Estética</em></p>
    </div>`;
  try {
    await transporter.sendMail({
      from: `"Meraki Estética" <${process.env.GMAIL_USER}>`,
      to,
      subject: 'Turno cancelado — Meraki Estética',
      text: `Hola ${clientName}, tu turno de ${serviceName} del ${fecha} a las ${startTime} fue cancelado. — Meraki Estética`,
      html,
    });
    log('EMAIL', `cancel enviado a ${maskEmail(to)}`);
    return true;
  } catch (err) {
    logError('EMAIL', err.message);
    return false;
  }
}

/**
 * Agenda diaria: resumen de todos los turnos del día enviado al correo interno
 * definido en AGENDA_NOTIFY_EMAIL. Un solo mail, un solo destinatario.
 */
async function sendDailyAgenda({ to, date, appointments = [] }) {
  if (!enabled || !to || appointments.length === 0) return false;
  const fecha = prettyDate(date);

  const rows = appointments.map((a) => `
    <tr>
      <td style="padding:8px 10px;border-bottom:1px solid #eee"><strong>${esc(a.startTime)}</strong>${a.endTime ? ` – ${esc(a.endTime)}` : ''}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #eee">${esc(a.clientName) || '—'}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #eee">${esc(a.clientPhone) || '—'}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #eee">${esc(a.serviceName) || '—'}</td>
    </tr>`).join('');

  const html = `
    <div style="font-family:Arial,sans-serif;font-size:15px;color:#333;line-height:1.5">
      <p>Agenda del <strong>${esc(fecha)}</strong> — ${appointments.length} turno(s):</p>
      <table style="border-collapse:collapse;width:100%;max-width:640px;font-size:14px">
        <thead>
          <tr style="background:#f7f2f2;text-align:left">
            <th style="padding:8px 10px">Horario</th>
            <th style="padding:8px 10px">Cliente</th>
            <th style="padding:8px 10px">Teléfono</th>
            <th style="padding:8px 10px">Servicio</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:24px;color:#a86b6b"><em>Meraki Estética</em></p>
    </div>`;

  const text = [`Agenda del ${fecha} — ${appointments.length} turno(s):`]
    .concat(appointments.map((a) => `• ${a.startTime}${a.endTime ? `-${a.endTime}` : ''} | ${a.clientName || '—'} | ${a.clientPhone || '—'} | ${a.serviceName || '—'}`))
    .join('\n');

  try {
    await transporter.sendMail({
      from: `"Meraki Estética" <${process.env.GMAIL_USER}>`,
      to,
      subject: `Agenda del día ${fecha} — ${appointments.length} turno(s)`,
      text,
      html,
    });
    log('EMAIL', `agenda diaria (${date}) enviada a ${maskEmail(to)}`);
    return true;
  } catch (err) {
    logError('EMAIL', err.message);
    return false;
  }
}

module.exports = { sendConfirmation, sendReschedule, sendCancellation, sendDailyAgenda, enabled, prettyDate };
