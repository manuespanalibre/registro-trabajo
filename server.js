const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json({ limit: '50kb' }));
app.use(express.static(__dirname));

function htmlEscape(s='') {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
function fmtDate(d) {
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeZone: 'Europe/Madrid' }).format(d);
}
function fmtTime(d) {
  return new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' }).format(d);
}
function fmtDuration(seconds) {
  const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60;
  return `${h} h ${m} min ${s} s`;
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE || 'false') === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

app.post('/api/send-session', async (req, res) => {
  try {
    const { email, project, task, start, end, durationSeconds } = req.body || {};
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({error:'Correo no válido.'});
    if (!project || !task) return res.status(400).json({error:'Proyecto y tarea son obligatorios.'});
    const s = new Date(start), e = new Date(end);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e <= s) return res.status(400).json({error:'Fechas no válidas.'});
    const seconds = Math.max(0, Math.round(Number(durationSeconds) || (e-s)/1000));
    const recipient = process.env.REPORT_TO || email;
    const subject = `Registro de trabajo – ${project} – ${fmtDate(s)}`;
    const text = [
      `Fecha: ${fmtDate(s)}`,
      `Proyecto: ${project}`,
      `Tarea: ${task}`,
      `Hora de inicio: ${fmtTime(s)}`,
      `Hora de finalización: ${fmtTime(e)}`,
      `Tiempo trabajado: ${fmtDuration(seconds)}`,
      `Trabajador / correo: ${email}`
    ].join('\n');
    const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
      <h2 style="margin-bottom:16px">Registro de trabajo</h2>
      <table style="border-collapse:collapse">
        <tr><td style="padding:5px 18px 5px 0;color:#6b7280">Fecha</td><td><strong>${htmlEscape(fmtDate(s))}</strong></td></tr>
        <tr><td style="padding:5px 18px 5px 0;color:#6b7280">Proyecto</td><td><strong>${htmlEscape(project)}</strong></td></tr>
        <tr><td style="padding:5px 18px 5px 0;color:#6b7280">Tarea</td><td><strong>${htmlEscape(task)}</strong></td></tr>
        <tr><td style="padding:5px 18px 5px 0;color:#6b7280">Inicio</td><td><strong>${htmlEscape(fmtTime(s))}</strong></td></tr>
        <tr><td style="padding:5px 18px 5px 0;color:#6b7280">Fin</td><td><strong>${htmlEscape(fmtTime(e))}</strong></td></tr>
        <tr><td style="padding:5px 18px 5px 0;color:#6b7280">Tiempo</td><td><strong>${htmlEscape(fmtDuration(seconds))}</strong></td></tr>
        <tr><td style="padding:5px 18px 5px 0;color:#6b7280">Correo</td><td><strong>${htmlEscape(email)}</strong></td></tr>
      </table>
    </div>`;

    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: recipient,
      replyTo: email,
      subject,
      text,
      html
    });
    res.json({ok:true});
  } catch (err) {
    console.error(err);
    res.status(500).json({error:'Error al enviar el correo. Revisa la configuración SMTP del servidor.'});
  }
});

app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Registro de Trabajo: http://localhost:${port}`));
