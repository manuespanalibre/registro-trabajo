const $ = (id) => document.getElementById(id);

const els = {
  email: $('email'), project: $('project'), task: $('task'), timer: $('timer'),
  startBtn: $('startBtn'), stopBtn: $('stopBtn'), setupForm: $('setupForm'),
  startLabel: $('startLabel'), dateLabel: $('dateLabel'), statusBadge: $('statusBadge'),
  summary: $('summary'), editStart: $('editStart'), editEnd: $('editEnd'),
  totalLabel: $('totalLabel'), sumEmail: $('sumEmail'), sumProject: $('sumProject'), sumTask: $('sumTask'),
  cancelBtn: $('cancelBtn'), sendBtn: $('sendBtn'), message: $('message'),
  historyList: $('historyList'), clearHistoryBtn: $('clearHistoryBtn')
};

let interval = null;
let draftEnd = null;

const stateKey = 'workTimerActive';
const profileKey = 'workTimerProfile';
const historyKey = 'workTimerHistory';

const pad = n => String(n).padStart(2, '0');
const formatDuration = ms => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};
const formatTime = d => new Intl.DateTimeFormat('es-ES', {hour:'2-digit', minute:'2-digit'}).format(d);
const formatDate = d => new Intl.DateTimeFormat('es-ES', {day:'2-digit', month:'2-digit', year:'numeric'}).format(d);
const toLocalInput = d => {
  const y = d.getFullYear(), m = pad(d.getMonth()+1), day = pad(d.getDate()), h=pad(d.getHours()), min=pad(d.getMinutes());
  return `${y}-${m}-${day}T${h}:${min}`;
};

function getActive() {
  try { return JSON.parse(localStorage.getItem(stateKey)); } catch { return null; }
}
function saveActive(data) { localStorage.setItem(stateKey, JSON.stringify(data)); }
function clearActive() { localStorage.removeItem(stateKey); }

function saveProfile() {
  localStorage.setItem(profileKey, JSON.stringify({ email: els.email.value.trim() }));
}
function loadProfile() {
  try {
    const p = JSON.parse(localStorage.getItem(profileKey));
    if (p?.email) els.email.value = p.email;
  } catch {}
}

function validateSetup() {
  if (!els.email.value.trim() || !els.email.checkValidity()) return 'Introduce un correo electrónico válido.';
  if (!els.project.value.trim()) return 'Indica el proyecto.';
  if (!els.task.value.trim()) return 'Indica la tarea.';
  return null;
}

function startTimerUI(active) {
  els.setupForm.querySelectorAll('input,textarea').forEach(x => x.disabled = true);
  els.startBtn.classList.add('hidden');
  els.stopBtn.classList.remove('hidden');
  els.summary.classList.add('hidden');
  els.statusBadge.textContent = 'Trabajando';
  const start = new Date(active.start);
  els.startLabel.textContent = formatTime(start);
  els.dateLabel.textContent = formatDate(start);
  tick();
  clearInterval(interval);
  interval = setInterval(tick, 1000);
}

function stopTimerUI() {
  clearInterval(interval);
  interval = null;
  els.stopBtn.classList.add('hidden');
  els.statusBadge.textContent = 'Revisar sesión';
  els.summary.classList.remove('hidden');
}

function resetUI() {
  clearInterval(interval); interval = null;
  els.setupForm.querySelectorAll('input,textarea').forEach(x => x.disabled = false);
  els.startBtn.classList.remove('hidden');
  els.stopBtn.classList.add('hidden');
  els.summary.classList.add('hidden');
  els.timer.textContent = '00:00:00';
  els.startLabel.textContent = '—';
  els.dateLabel.textContent = '—';
  els.statusBadge.textContent = 'Preparado';
  els.message.textContent = '';
  draftEnd = null;
}

function tick() {
  const active = getActive();
  if (!active) return;
  els.timer.textContent = formatDuration(Date.now() - new Date(active.start).getTime());
}

els.startBtn.addEventListener('click', () => {
  const error = validateSetup();
  if (error) { alert(error); return; }
  saveProfile();
  const active = {
    email: els.email.value.trim(), project: els.project.value.trim(), task: els.task.value.trim(),
    start: new Date().toISOString()
  };
  saveActive(active);
  startTimerUI(active);
});

els.stopBtn.addEventListener('click', () => {
  const active = getActive();
  if (!active) return;
  draftEnd = new Date();
  els.editStart.value = toLocalInput(new Date(active.start));
  els.editEnd.value = toLocalInput(draftEnd);
  els.sumEmail.textContent = active.email;
  els.sumProject.textContent = active.project;
  els.sumTask.textContent = active.task;
  updateSummaryDuration();
  stopTimerUI();
});

function updateSummaryDuration() {
  const s = new Date(els.editStart.value);
  const e = new Date(els.editEnd.value);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e <= s) {
    els.totalLabel.textContent = 'Revisar horas';
    return false;
  }
  els.totalLabel.textContent = formatDuration(e - s);
  return true;
}
els.editStart.addEventListener('change', updateSummaryDuration);
els.editEnd.addEventListener('change', updateSummaryDuration);

els.cancelBtn.addEventListener('click', () => {
  const active = getActive();
  if (!active) return resetUI();
  startTimerUI(active);
});

function addHistory(session) {
  const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
  history.unshift(session);
  localStorage.setItem(historyKey, JSON.stringify(history.slice(0, 50)));
  renderHistory();
}

function renderHistory() {
  let history = [];
  try { history = JSON.parse(localStorage.getItem(historyKey) || '[]'); } catch {}
  if (!history.length) {
    els.historyList.innerHTML = '<p class="empty">Todavía no hay sesiones registradas.</p>';
    return;
  }
  els.historyList.innerHTML = history.map(h => {
    const s = new Date(h.start), e = new Date(h.end);
    return `<article class="history-item">
      <div><p class="title">${escapeHtml(h.project)}</p><p class="sub">${escapeHtml(h.task)} · ${formatDate(s)} · ${formatTime(s)}–${formatTime(e)}</p></div>
      <div class="duration">${formatDuration(e-s)}</div>
    </article>`;
  }).join('');
}
function escapeHtml(str='') { return str.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

els.clearHistoryBtn.addEventListener('click', () => {
  if (confirm('¿Borrar el historial guardado en este dispositivo?')) {
    localStorage.removeItem(historyKey); renderHistory();
  }
});

els.sendBtn.addEventListener('click', () => {
  if (!updateSummaryDuration()) { els.message.textContent = 'La hora de fin debe ser posterior a la de inicio.'; return; }
  const active = getActive();
  if (!active) return;
  const start = new Date(els.editStart.value);
  const end = new Date(els.editEnd.value);
  const payload = {
    email: active.email,
    project: active.project,
    task: active.task,
    start: start.toISOString(),
    end: end.toISOString(),
    durationSeconds: Math.round((end - start) / 1000),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Madrid'
  };

  const duration = formatDuration(end - start);
  const subject = `Registro de trabajo - ${active.project} - ${formatDate(start)}`;
  const body = [
    `Fecha: ${formatDate(start)}`,
    `Proyecto: ${active.project}`,
    `Tarea: ${active.task}`,
    `Hora de inicio: ${formatTime(start)}`,
    `Hora de finalización: ${formatTime(end)}`,
    `Tiempo trabajado: ${duration}`
  ].join('\n');

  addHistory({...payload, preparedAt: new Date().toISOString()});
  clearActive();
  els.project.value = '';
  els.task.value = '';
  resetUI();

  const mailUrl = `mailto:${encodeURIComponent(active.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailUrl;
});

loadProfile();
renderHistory();
const active = getActive();
if (active) {
  els.email.value = active.email || els.email.value;
  els.project.value = active.project || '';
  els.task.value = active.task || '';
  startTimerUI(active);
}

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
