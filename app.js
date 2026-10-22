/* =====================================================================
   Exponencial · Centro de mando
   Núcleo: sesión, Inicio, captura rápida, Pendientes, Recordatorios y Ajustes
   ===================================================================== */
(() => {
'use strict';
const CFG = window.EXPONENCIAL_CONFIG;
const sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true } });

/* ---------- Utilidades ---------- */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const MES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const MES3 = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const DIA = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const pad = n => String(n).padStart(2, '0');
const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => isoDate(new Date());
const nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return isoDate(d); };
const hm = t => (t || '').slice(0, 5);
const fdShort = iso => { const [, m, d] = iso.split('-'); return `${+d} ${MES3[+m - 1]}`; };
const fdLong = iso => { const d = new Date(iso + 'T12:00:00'); return `${DIA[d.getDay()]} ${d.getDate()} de ${MES[d.getMonth()]}`; };
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 2600); };
const ICON = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  task: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  rem: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  set: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  sale: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20M6 15h4"/>',
  bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.9.7 1.5 1.7 1.5 2.8V17h4v-.3c0-1.1.6-2.1 1.5-2.8A6 6 0 0 0 12 3z"/>',
  star: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
  out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'
};
const svg = k => `<svg viewBox="0 0 24 24">${ICON[k]}</svg>`;
const LOGO = '<svg viewBox="0 0 20 20" width="20" height="20" fill="none"><path d="M3 15 L9 9 L12 12 L17 5" stroke="#8DC53E" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 5 H17 V9" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const FRENTES = { 'B2B': ['B2B', 'var(--c-b2b)'], 'I&D': ['Innovación & Disrupción', 'var(--c-id)'], 'CoS': ['Chief of Staff', 'var(--c-cos)'], 'Personal': ['Personal', 'var(--c-per)'] };
const FR_CORTO = { 'B2B': 'B2B', 'I&D': 'I&D', 'CoS': 'Chief of Staff', 'Personal': 'Personal' };
const ACTIVOS = ['B2B', 'CoS', 'Personal']; // frentes de esta plataforma
const ESTATUS = [['Pendiente', 'var(--bad)'], ['En progreso', 'var(--warn)'], ['Necesita revisión', 'var(--info)'], ['Terminado', 'var(--good)']];
const NOTIF = {
  resumen_dia: ['Resumen del día', 'Diario, 9:00 a.m.'], recordatorios: ['Recordatorios', 'Aviso previo y hora exacta'],
  pendientes: ['Pendientes', 'A su hora; por correo solo los importantes'], forecast_terminado: ['Forecast terminado', 'Con Excel adjunto'],
  resumen_dashboard: ['Resúmenes de dashboard', 'Cuando los solicites'], dia_cobro: ['Día de cobro', '9:00 a.m. del día del pago'],
  resumen_viernes: ['Resumen del viernes', 'Cobros de la próxima semana'], reporte_finanzas: ['Reporte para Finanzas', 'Viernes, listo para reenviar'],
  confirmacion_lunes: ['Confirmación de Finanzas', 'Lunes, 9:00 a.m.'],
  modulos_programas: ['Módulos de programas', 'Inicio y fin de cada módulo'], acuerdos_hitos: ['Acuerdos, hitos y juntas', 'Fecha compromiso']
};
const apill = f => `<span class="apill" style="--c:${FRENTES[f][1]}"><i></i>${esc(FR_CORTO[f])}</span>`;

/* ---------- Estado ---------- */
const S = { user: null, ajustes: null, prefs: [], catalogos: [], pendientes: [], recordatorios: [], view: 'home',
  empresas: [], cuentas: [], propuestas: [], seguimientos: [], forecasts: [], fgrupos: [], fegresos: [], fotoUrls: {},
  qTipo: 'Pendiente', qFrente: 'B2B', pFrente: 'Todas', pPeriodo: 'Todos', pVista: 'Tarjetas', rFrente: 'Todas' };

function allP() { return S.pendientes; }
async function setEstatusItem(id, estatus) {
  const p = S.pendientes.find(x => x.id === id); const d = await handle(await sb.from('pendientes').update({ estatus }).eq('id', id).select().single(), `Movido a ${estatus}`); if (d) Object.assign(p, d); return !!d;
}
function abrirItem(id) { pendForm(S.pendientes.find(x => x.id === id)); }
const isLate = p => p.estatus !== 'Terminado' && (p.fecha_limite < today() || (p.fecha_limite === today() && hm(p.hora_limite) < nowHM()));
const sortAgenda = (a, b, f, h) => (a[f] + hm(a[h])).localeCompare(b[f] + hm(b[h]));
const dueChip = p => {
  const h = hm(p.hora_limite);
  if (p.estatus === 'Terminado') return `<span class="pill done">${fdShort(p.fecha_limite)} · ${h}</span>`;
  if (isLate(p)) return `<span class="pill late">Vencido · ${p.fecha_limite === today() ? 'hoy' : fdShort(p.fecha_limite)} ${h}</span>`;
  if (p.fecha_limite === today()) return `<span class="pill today">Hoy · ${h}</span>`;
  return `<span class="pill">${fdShort(p.fecha_limite)} · ${h}</span>`;
};
const tipos = () => S.catalogos.filter(c => c.catalogo === 'tipo_pendiente' && c.activo).sort((a, b) => a.orden - b.orden).map(c => c.valor);

/* ---------- Datos ---------- */
async function handle(res, okMsg) {
  if (res.error) { console.error(res.error); toast('No se pudo guardar: ' + (res.error.message || 'error de conexión')); return null; }
  if (okMsg) toast(okMsg);
  return res.data ?? true;
}
const TABLAS = ['preferencias_notificacion', 'catalogos', 'pendientes', 'recordatorios', 'empresas', 'cuentas', 'propuestas', 'seguimientos', 'forecasts', 'forecast_grupos', 'forecast_egresos',
  'ventas', 'ventas_bitacora', 'pagos', 'programas', 'modulos', 'areas', 'juntas', 'acuerdos', 'interarea', 'hitos'];
const ALIAS = { preferencias_notificacion: 'prefs', forecast_grupos: 'fgrupos', forecast_egresos: 'fegresos' };
async function loadAll() {
  const [a, ...rs] = await Promise.all([sb.from('ajustes').select('*').maybeSingle(), ...TABLAS.map(t => sb.from(t).select('*'))]);
  if (a.error) { console.error(a.error); toast('Error al cargar tu información. Revisa tu conexión.'); }
  S.ajustes = a.data || {};
  rs.forEach((r, i) => { const t = TABLAS[i]; if (r.error) console.warn('Tabla no disponible:', t, r.error.message); S[ALIAS[t] || t] = r.data || []; });
  applyColors();
}
function applyColors() {
  const a = S.ajustes || {}, r = document.documentElement.style;
  if (a.color_base) r.setProperty('--c-home', a.color_base);
  if (a.color_b2b) r.setProperty('--c-b2b', a.color_b2b);
  if (a.color_id) r.setProperty('--c-id', a.color_id);
  if (a.color_cos) r.setProperty('--c-cos', a.color_cos);
}

/* ---------- Inicio de sesión ---------- */
function renderLogin(msg = '') {
  $('#app').innerHTML = `<div class="login"><div class="login-card">
    <div class="login-top"><span class="logo">${LOGO}</span><b>Exponencial</b><small>Centro de mando · Grupo Exponencial</small></div>
    <form class="login-body" id="lf">
      <label class="f"><span>Correo</span><input class="in" type="email" id="le" autocomplete="username" required></label>
      <label class="f"><span>Contraseña</span><input class="in" type="password" id="lp" autocomplete="current-password" required></label>
      <div class="err" id="lerr">${esc(msg)}</div>
      <button class="btn btn-dark btn-block" id="lb" type="submit">Entrar</button>
    </form></div></div>`;
  $('#lf').onsubmit = async e => {
    e.preventDefault(); $('#lb').disabled = true; $('#lerr').textContent = '';
    const { error } = await sb.auth.signInWithPassword({ email: $('#le').value.trim(), password: $('#lp').value });
    if (error) { $('#lerr').textContent = 'Correo o contraseña incorrectos.'; $('#lb').disabled = false; }
  };
}

/* ---------- Estructura ---------- */
const NAV = [['home', 'Inicio', 'home'], ['pend', 'Pendientes', 'task'], ['rem', 'Recordatorios', 'rem'], ['set', 'Ajustes', 'set']];
const B2B_VIEWS = ['b2bd', 'cuen', 'prop', 'fore', 'vent', 'progs'], ID_VIEWS = [], COS_VIEWS = ['cosd', 'inter', 'enc', 'jun', 'salud'];
const SUBTABS = {
  b2b: [['b2bd', 'Dashboard'], ['cuen', 'Cuentas'], ['prop', 'Propuestas'], ['fore', 'Forecast'], ['vent', 'Ventas'], ['progs', 'Programas en curso']],
  cos: [['cosd', 'Dashboard'], ['inter', 'Proyectos interárea'], ['enc', 'Encargos de Dirección'], ['jun', 'Juntas y acuerdos'], ['salud', 'Salud de áreas']],
  org: [['pend', 'Pendientes'], ['rem', 'Recordatorios']]
};
const grupoDe = v => B2B_VIEWS.includes(v) ? 'b2b' : ID_VIEWS.includes(v) ? 'id' : COS_VIEWS.includes(v) ? 'cos' : ['pend', 'rem'].includes(v) ? 'org' : null;
function subtabsFor(v) {
  const g = grupoDe(v);
  if (!g) return '';
  return `<div class="subtabs" role="tablist">${SUBTABS[g].map(([k, l]) => k ? `<button data-go="${k}" class="${v === k ? 'on' : ''}">${l}</button>` : `<button disabled>${l}</button>`).join('')}</div>`;
}
function shell(title, actions = '') {
  const late = allP().filter(isLate).length;
  const d = new Date();
  return `<div class="shell">
    <aside class="side" aria-label="Navegación">
      <div class="brand"><span class="logo">${LOGO}</span><div><b>Exponencial</b><small>Centro de mando</small></div></div>
      <nav class="nav">
        <div class="ngroup">Mi día</div>
        ${NAV.slice(0, 3).map(([k, l, i]) => `<button data-go="${k}" class="${S.view === k ? 'on' : ''}">${svg(i)}${l}${k === 'pend' && late ? `<span class="count">${late}</span>` : ''}</button>`).join('')}
        <div class="ngroup">Mis frentes</div>
        <button data-go="b2bd" class="${B2B_VIEWS.includes(S.view) ? 'on' : ''}">${svg('sale')}B2B</button>
        <button data-go="cosd" class="${COS_VIEWS.includes(S.view) ? 'on' : ''}">${svg('star')}Chief of Staff</button>
        <div class="ngroup">Sistema</div>
        <button data-go="set" class="${S.view === 'set' ? 'on' : ''}">${svg('set')}Ajustes</button>
      </nav>
      <div class="side-foot"><span class="avatar">FA</span><div style="min-width:0;flex:1"><b style="font-size:13px">Fernanda</b><small>${esc(S.user?.email || '')}</small></div><button class="sf-out" id="sideOut" title="Cerrar sesión" aria-label="Cerrar sesión">${svg('out')}</button></div>
    </aside>
    <main class="main">
      <div class="mtop"><button class="icon-btn ${S.view === 'home' ? 'on' : ''}" data-go="home" aria-label="Inicio">${svg('home')}</button><button class="icon-btn ${S.view === 'set' ? 'on' : ''}" data-go="set" aria-label="Ajustes">${svg('set')}</button></div>
      <div class="top"><h1>${title}</h1><span class="date">${cap(DIA[d.getDay()])} ${d.getDate()} de ${MES[d.getMonth()]}, ${d.getFullYear()}</span><div class="actions">${actions}</div></div>
      ${subtabsFor(S.view)}
      <div id="view"></div>
    </main>
  </div>
  <nav class="mtabs" aria-label="Secciones">
    <button data-go="b2bd" class="${B2B_VIEWS.includes(S.view) ? 'on' : ''}">${svg('sale')}B2B</button>
    <button data-go="cosd" class="${COS_VIEWS.includes(S.view) ? 'on' : ''}">${svg('star')}Chief</button>
    <button class="cap" id="mcap" aria-label="Captura rápida">${svg('plus')}</button>
    <button data-go="pend" class="${S.view === 'pend' ? 'on' : ''}">${svg('task')}Pendientes${late ? `<span class="mcnt">${late}</span>` : ''}</button>
    <button data-go="rem" class="${S.view === 'rem' ? 'on' : ''}">${svg('rem')}Recordatorios</button>
  </nav>`;
}
function bindShell() {
  $$('[data-go]').forEach(b => b.onclick = () => go(b.dataset.go));
  const so = $('#sideOut'); if (so) so.onclick = cerrarSesion;
  const m = $('#mcap'); if (m) m.onclick = () => chooseNew();
}
function go(v) { S.view = v; render(); window.scrollTo({ top: 0 }); }
const VIEWS = {};
function render() {
  const g = grupoDe(S.view); document.body.dataset.area = ['b2b', 'cos'].includes(g) ? g : 'home';
  (VIEWS[S.view] || VIEWS.home)();
}

/* ---------- Inicio ---------- */
function renderHome() {
  const t = today(), d = new Date();
  const saludo = d.getHours() < 12 ? 'Buenos días' : d.getHours() < 19 ? 'Buenas tardes' : 'Buenas noches';
  $('#app').innerHTML = shell(`${saludo}, Fernanda`, `<button class="btn btn-dark" id="newBtn">${svg('plus')}Nuevo</button>`);
  const hoy = allP().filter(p => p.fecha_limite === t).sort((a, b) => sortAgenda(a, b, 'fecha_limite', 'hora_limite'));
  const venc = allP().filter(p => isLate(p) && p.fecha_limite < t).sort((a, b) => sortAgenda(a, b, 'fecha_limite', 'hora_limite'));
  const done = hoy.filter(p => p.estatus === 'Terminado').length;
  const remHoy = S.recordatorios.filter(r => !r.hecho && r.fecha === t).sort((a, b) => sortAgenda(a, b, 'fecha', 'hora'));
  const prox = S.recordatorios.filter(r => !r.hecho && (r.fecha > t || (r.fecha === t && hm(r.hora) >= nowHM()))).sort((a, b) => sortAgenda(a, b, 'fecha', 'hora')).slice(0, 6);
  const per = f => { const xs = hoy.filter(p => p.frente === f); return [FR_CORTO[f], xs.filter(p => p.estatus === 'Terminado').length, xs.length, FRENTES[f][1]]; };
  const r = 44, C = 2 * Math.PI * r, v = hoy.length ? done / hoy.length * C : 0;
  const item = p => `<div class="row"><button class="check ${p.estatus === 'Terminado' ? 'on' : ''}" data-done="${p.id}" aria-label="Marcar como terminado"></button>
    <button class="row-main" data-pen="${p.id}"><div class="t ${p.estatus === 'Terminado' ? 'struck' : ''}">${esc(p.titulo)}</div><div class="s">${hm(p.hora_limite)}${p.notas ? ' · ' + esc(p.notas) : ''}</div></button>
    <span class="r">${p.importante ? '<span class="pill imp">Importante</span>' : ''}${isLate(p) && p.fecha_limite < t ? dueChip(p) : ''}${apill(p.frente)}</span></div>`;
  $('#view').innerHTML = `
    <section class="feature"><div class="day">
      <div class="ring"><svg width="110" height="110" viewBox="0 0 110 110"><circle cx="55" cy="55" r="${r}" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="10"/><circle cx="55" cy="55" r="${r}" fill="none" stroke="#8DC53E" stroke-width="10" stroke-linecap="round" stroke-dasharray="${v} ${C}" transform="rotate(-90 55 55)"/></svg><div><b>${done}/${hoy.length}</b><small>hoy</small></div></div>
      <div class="dbars">${ACTIVOS.map(per).map(([l, a, b, c]) => `<div class="dbar" style="--c:${c}"><span>${esc(l)}</span><div><i style="width:${b ? a / b * 100 : 0}%"></i></div><b>${a}/${b}</b></div>`).join('')}</div>
    </div><div class="flab">${hoy.length - done} por cerrar hoy · ${venc.length} vencidos · ${remHoy.length} recordatorios hoy</div></section>
    <section class="qcap" aria-label="Captura rápida"><div class="card-head" style="margin:0"><h3>Captura rápida</h3><span class="sub">Escríbelo antes de que se te olvide.</span>
      <div class="seg right" id="qt">${['Pendiente', 'Recordatorio'].map(x => `<button data-x="${x}" class="${S.qTipo === x ? 'on' : ''}">${x}</button>`).join('')}</div></div>
      <div class="qrow"><input class="in q-in" id="qx" placeholder="${S.qTipo === 'Pendiente' ? '¿Qué tienes que hacer?' : '¿Qué quieres recordar?'}" aria-label="Texto"></div>
      <div class="qrow"><div class="chips" id="qf">${ACTIVOS.map(f => `<button class="chip ${S.qFrente === f ? 'on' : ''}" data-x="${f}" style="--c:${FRENTES[f][1]}">${esc(FR_CORTO[f])}</button>`).join('')}</div></div>
      <div class="qrow"><input class="in q-dt" type="date" id="qd" value="${t}" aria-label="Fecha"><input class="in q-hr" type="time" id="qh" value="${S.qTipo === 'Pendiente' ? '10:00' : '12:00'}" aria-label="Hora"><button class="btn btn-dark" id="qok" style="margin-left:auto">Guardar</button></div>
    </section>
    ${window.EXP && window.EXP.homeExtra ? window.EXP.homeExtra() : ''}
    <div class="grid2">
      <section class="card"><div class="card-head"><h3>Hoy y vencidos</h3><button class="btn btn-ghost right" style="height:34px;font-size:12px" data-go="pend">Ver todos</button></div>
        ${venc.length ? `<div class="hl bad">Vencidos</div><div class="rows">${venc.map(item).join('')}</div>` : ''}
        <div class="hl">Hoy</div>${hoy.length ? `<div class="rows">${hoy.map(item).join('')}</div>` : '<div class="empty">Nada vence hoy. Usa la captura rápida para agregar tu primer pendiente.</div>'}
      </section>
      <section class="card"><div class="card-head"><h3>Próximos recordatorios</h3><button class="btn btn-ghost right" style="height:34px;font-size:12px" data-go="rem">Agenda</button></div>
        ${prox.length ? prox.map(r => `<div class="ag" style="--c:${FRENTES[r.frente][1]}"><div class="w"><b>${hm(r.hora)}</b><small>${r.fecha === t ? 'hoy' : fdShort(r.fecha)}</small></div><button class="c" data-rec="${r.id}"><div class="t">${esc(r.titulo)}</div><div class="s">${esc(FRENTES[r.frente][0])}${r.nota ? ' · ' + esc(r.nota) : ''}</div></button></div>`).join('') : '<div class="empty">Sin recordatorios próximos.</div>'}
      </section>
    </div>`;
  bindShell(); bindRows();
  $('#newBtn').onclick = () => chooseNew();
  $$('#qt button').forEach(b => b.onclick = () => { S.qTipo = b.dataset.x; renderHome(); });
  $$('#qf button').forEach(b => b.onclick = () => { S.qFrente = b.dataset.x; $$('#qf button').forEach(x => x.classList.toggle('on', x === b)); });
  const save = async () => {
    const titulo = $('#qx').value.trim(), fecha = $('#qd').value, hora = $('#qh').value;
    if (!titulo) { toast('Escribe qué quieres guardar.'); $('#qx').focus(); return; }
    if (!fecha || !hora) { toast('Captura fecha y hora para poder avisarte.'); return; }
    $('#qok').disabled = true;
    const res = S.qTipo === 'Pendiente'
      ? await sb.from('pendientes').insert({ titulo, frente: S.qFrente, fecha_limite: fecha, hora_limite: hora, tipo: tipos()[0] || null }).select().single()
      : await sb.from('recordatorios').insert({ titulo, frente: S.qFrente, fecha, hora }).select().single();
    const data = await handle(res, `${S.qTipo} guardado en ${FRENTES[S.qFrente][0]}`);
    if (data) { (S.qTipo === 'Pendiente' ? S.pendientes : S.recordatorios).push(data); renderHome(); setTimeout(() => $('#qx') && $('#qx').focus(), 30); }
    else $('#qok').disabled = false;
  };
  $('#qok').onclick = save; $('#qx').onkeydown = e => { if (e.key === 'Enter') save(); };
}
function bindRows() {
  $$('[data-done]').forEach(b => b.onclick = async () => {
    const p = allP().find(x => x.id === b.dataset.done); const nuevo = p.estatus === 'Terminado' ? 'Pendiente' : 'Terminado';
    if (await setEstatusItem(p.id, nuevo)) render();
  });
  $$('[data-pen]').forEach(b => b.onclick = () => abrirItem(b.dataset.pen));
  $$('[data-rec]').forEach(b => b.onclick = () => remForm(S.recordatorios.find(x => x.id === b.dataset.rec)));
}

/* ---------- Hoja (modal) ---------- */
function openSheet(html, wide) { $('#sheet').innerHTML = html; $('#sheet').classList.toggle('wide', !!wide); $('#sheet').classList.add('on'); $('#scrim').classList.add('on'); $('#sheet').scrollTop = 0; $$('#sheet [data-close]').forEach(b => b.onclick = closeSheet); }
function closeSheet() { $('#sheet').classList.remove('on'); $('#scrim').classList.remove('on'); }
$('#scrim').onclick = closeSheet;
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
const head = t => `<div class="sh-head"><h2>${t}</h2><button class="x" data-close aria-label="Cerrar">✕</button></div>`;
function chooseNew() {
  openSheet(`${head('¿Qué quieres crear?')}<div class="fgrid">
    <button class="card" id="chP" style="text-align:left"><h3>Pendiente</h3><p class="sub" style="margin:6px 0 0">Una tarea con entregable y estatus.</p></button>
    <button class="card" id="chR" style="text-align:left"><h3>Recordatorio</h3><p class="sub" style="margin:6px 0 0">Un aviso en fecha y hora, sin estatus.</p></button></div>`);
  $('#chP').onclick = () => pendForm(); $('#chR').onclick = () => remForm();
}
const frenteOpts = (id, cur) => `<div class="chips" id="${id}">${[...new Set([...ACTIVOS, ...(cur && !ACTIVOS.includes(cur) ? [cur] : [])])].map(f => `<button type="button" class="chip ${cur === f ? 'on' : ''}" data-x="${f}" style="--c:${FRENTES[f][1]}">${esc(FRENTES[f][0])}</button>`).join('')}</div>`;
const bindChoice = id => $$(`#${id} button`).forEach(b => b.onclick = () => $$(`#${id} button`).forEach(x => x.classList.toggle('on', x === b)));
const picked = id => $(`#${id} .on`)?.dataset.x;

function pendForm(p, preset) {
  const e = p || { ...(preset || {}) };
  let dg = !!e.es_encargo_dg, imp = !!e.importante;
  const draw = () => {
    const keep = $('#pt') ? { t: $('#pt').value, n: $('#pn').value } : null;
    openSheet(`${head(p ? 'Pendiente' : 'Nuevo pendiente')}
      <div class="fgrid">
        <label class="f full"><span>Título</span><input class="in" id="pt" value="${esc(e.titulo || '')}"></label>
        <div class="f full"><span>Frente</span>${frenteOpts('pf', e.frente || (S.view === 'home' ? S.qFrente : 'B2B'))}</div>
        <label class="f"><span>Asociado a</span><select class="in" id="pa">${['Fernanda', 'Joaquín', 'Cuenta'].map(x => `<option ${e.asociado_tipo === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
        <label class="f full ${e.asociado_tipo === 'Cuenta' ? '' : 'hidden'}" id="pcw"><span>Cuenta</span><select class="in" id="pcu"><option value="">Selecciona…</option>${S.cuentas.filter(c => !c.descartada || c.id === e.cuenta_id).map(c => `<option value="${c.id}" ${e.cuenta_id === c.id ? 'selected' : ''}>${esc(c.nombre + ' ' + (c.apellido || ''))} · ${esc(empNombre(c.empresa_id))}</option>`).join('')}</select></label>
        <label class="f"><span>Responsable</span><select class="in" id="pr">${['Fernanda', 'Joaquín'].map(x => `<option ${e.responsable === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
        <label class="f full"><span>Tipo</span><select class="in" id="pty"><option value="">Sin tipo</option>${tipos().map(x => `<option ${e.tipo === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></label>
        <label class="f"><span>Fecha límite</span><input class="in" type="date" id="pd" value="${e.fecha_limite || today()}"></label>
        <label class="f"><span>Hora límite</span><input class="in" type="time" id="ph" value="${hm(e.hora_limite) || '10:00'}"></label>
        <div class="f full"><label class="tline"><button type="button" class="toggle ${imp ? 'on' : ''}" id="pimp" aria-label="Importante"></button>Importante: avisarme también por correo</label></div>
        <div class="f full"><label class="tline"><button type="button" class="toggle ${dg ? 'on' : ''}" id="pdg" aria-label="Encargo de Dirección General"></button>Es un encargo de Dirección General</label></div>
        ${dg ? `<label class="f"><span>Fecha de solicitud</span><input class="in" type="date" id="psol" value="${e.fecha_solicitud || today()}"></label><label class="f"><span>Entregable</span><input class="in" id="pent" value="${esc(e.entregable || '')}"></label>` : ''}
        <div class="f full"><span>Estatus</span><div class="opts" id="pst">${ESTATUS.map(([s]) => `<button type="button" class="opt ${(e.estatus || 'Pendiente') === s ? 'on' : ''}" data-x="${s}">${s}</button>`).join('')}</div></div>
        <label class="f full"><span>Notas</span><textarea class="in" id="pn">${esc(e.notas || '')}</textarea></label>
      </div>
      <div class="foot">${p ? '<button class="btn btn-danger left" id="pdel">Eliminar</button>' : ''}<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-dark" id="pok">Guardar</button></div>`);
    if (keep) { $('#pt').value = keep.t; $('#pn').value = keep.n; }
    bindChoice('pf'); bindChoice('pst');
    $('#pa').onchange = () => $('#pcw').classList.toggle('hidden', $('#pa').value !== 'Cuenta');
    $('#pimp').onclick = () => { imp = !imp; $('#pimp').classList.toggle('on', imp); };
    $('#pdg').onclick = () => { dg = !dg; if (dg) { e.frente = 'CoS'; } e.titulo = $('#pt').value; e.notas = $('#pn').value; draw(); };
    if (p) $('#pdel').onclick = async () => {
      if (!confirm('¿Eliminar este pendiente?')) return;
      if (await handle(await sb.from('pendientes').delete().eq('id', p.id), 'Pendiente eliminado')) { S.pendientes = S.pendientes.filter(x => x.id !== p.id); closeSheet(); render(); }
    };
    $('#pok').onclick = async () => {
      const row = { titulo: $('#pt').value.trim(), frente: picked('pf'), asociado_tipo: $('#pa').value, cuenta_id: $('#pa').value === 'Cuenta' ? ($('#pcu').value || null) : null, responsable: $('#pr').value, tipo: $('#pty').value || null,
        fecha_limite: $('#pd').value, hora_limite: $('#ph').value, importante: imp, es_encargo_dg: dg, estatus: picked('pst'), notas: $('#pn').value.trim() || null,
        fecha_solicitud: dg ? $('#psol').value || null : null, entregable: dg ? ($('#pent').value.trim() || null) : null };
      if (!row.titulo) { toast('Escribe el título.'); return; }
      if (row.asociado_tipo === 'Cuenta' && !row.cuenta_id) { toast('Selecciona la cuenta.'); return; }
      if (!row.fecha_limite || !row.hora_limite) { toast('Captura fecha y hora: son necesarias para avisarte.'); return; }
      $('#pok').disabled = true;
      const res = p ? await sb.from('pendientes').update(row).eq('id', p.id).select().single() : await sb.from('pendientes').insert(row).select().single();
      const data = await handle(res, p ? 'Pendiente actualizado' : `Guardado. Te avisaremos el ${fdShort(row.fecha_limite)} a las ${row.hora_limite}.`);
      if (data) { if (p) Object.assign(p, data); else S.pendientes.push(data); closeSheet(); render(); } else $('#pok').disabled = false;
    };
  };
  draw();
}
function remForm(r) {
  const e = r || {};
  openSheet(`${head(r ? 'Recordatorio' : 'Nuevo recordatorio')}
    <div class="fgrid">
      <label class="f full"><span>¿Qué quieres recordar?</span><input class="in" id="rt" value="${esc(e.titulo || '')}"></label>
      <div class="f full"><span>Frente</span>${frenteOpts('rf', e.frente || 'Personal')}</div>
      <label class="f"><span>Fecha</span><input class="in" type="date" id="rd" value="${e.fecha || today()}"></label>
      <label class="f"><span>Hora</span><input class="in" type="time" id="rh" value="${hm(e.hora) || '09:00'}"></label>
      <label class="f full"><span>Relacionado con (opcional)</span><input class="in" id="rrel" value="${esc(e.relacionado_con || '')}" placeholder="Ej. Joaquín"></label>
      <label class="f full"><span>Nota</span><textarea class="in" id="rn">${esc(e.nota || '')}</textarea></label>
      ${r ? `<div class="f full"><label class="tline"><button type="button" class="toggle ${e.hecho ? 'on' : ''}" id="rdone" aria-label="Hecho"></button>Marcar como hecho</label></div>` : ''}
    </div>
    <div class="foot">${r ? '<button class="btn btn-danger left" id="rdel">Eliminar</button>' : ''}<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-dark" id="rok">Guardar</button></div>`);
  bindChoice('rf');
  let hecho = !!e.hecho; if (r) $('#rdone').onclick = () => { hecho = !hecho; $('#rdone').classList.toggle('on', hecho); };
  if (r) $('#rdel').onclick = async () => {
    if (!confirm('¿Eliminar este recordatorio?')) return;
    if (await handle(await sb.from('recordatorios').delete().eq('id', r.id), 'Recordatorio eliminado')) { S.recordatorios = S.recordatorios.filter(x => x.id !== r.id); closeSheet(); render(); }
  };
  $('#rok').onclick = async () => {
    const row = { titulo: $('#rt').value.trim(), frente: picked('rf'), fecha: $('#rd').value, hora: $('#rh').value, relacionado_con: $('#rrel').value.trim() || null, nota: $('#rn').value.trim() || null, hecho };
    if (!row.titulo) { toast('Escribe qué quieres recordar.'); return; }
    if (!row.fecha || !row.hora) { toast('Captura fecha y hora: son necesarias para avisarte.'); return; }
    $('#rok').disabled = true;
    const res = r ? await sb.from('recordatorios').update(row).eq('id', r.id).select().single() : await sb.from('recordatorios').insert(row).select().single();
    const data = await handle(res, r ? 'Recordatorio actualizado' : `Recordatorio guardado para el ${fdShort(row.fecha)} a las ${row.hora}.`);
    if (data) { if (r) Object.assign(r, data); else S.recordatorios.push(data); closeSheet(); render(); } else $('#rok').disabled = false;
  };
}

/* ---------- Pendientes ---------- */
function renderPend() {
  $('#app').innerHTML = shell('Pendientes', `<button class="btn btn-dark" id="newP">${svg('plus')}Nuevo pendiente</button>`);
  const t = today(), wk = addDays(t, 6);
  const list = allP().filter(p => (S.pFrente === 'Todas' || p.frente === S.pFrente) &&
    (S.pPeriodo === 'Todos' || (S.pPeriodo === 'Hoy' ? (p.fecha_limite <= t && (p.estatus !== 'Terminado' || p.fecha_limite === t)) : p.fecha_limite > t && p.fecha_limite <= wk)))
    .sort((a, b) => (a.estatus === 'Terminado') - (b.estatus === 'Terminado') || sortAgenda(a, b, 'fecha_limite', 'hora_limite'));
  const card = p => `<button class="tcard" draggable="true" data-pen="${p.id}" data-id="${p.id}"><div class="tc-top">${apill(p.frente)}${p.importante ? '<span class="pill imp">Importante</span>' : ''}${dueChip(p)}</div>
    <div class="tc-t ${p.estatus === 'Terminado' ? 'struck' : ''}">${esc(p.titulo)}</div>${p.es_encargo_dg ? '<div class="tc-n">Encargo de Dirección General</div>' : ''}${p.notas ? `<div class="tc-n">${esc(p.notas)}</div>` : ''}
    <div class="tc-n" style="margin-top:6px">${esc(p.responsable)}${p.tipo ? ' · ' + esc(p.tipo) : ''}</div></button>`;
  $('#view').innerHTML = `<div class="toolbar">
      <div class="chips" id="pff">${['Todas', ...ACTIVOS].map(f => `<button class="chip ${S.pFrente === f ? 'on' : ''}" data-x="${f}" style="--c:${f === 'Todas' ? 'var(--ink)' : FRENTES[f][1]}">${f === 'Todas' ? 'Todas' : esc(FR_CORTO[f])}</button>`).join('')}</div>
      <div class="right"><div class="seg" id="pper">${['Hoy', 'Próximos', 'Todos'].map(x => `<button data-x="${x}" class="${S.pPeriodo === x ? 'on' : ''}">${x === 'Próximos' ? 'Próximos 7 días' : x}</button>`).join('')}</div>
      <div class="seg" id="pvis">${['Tarjetas', 'Lista'].map(x => `<button data-x="${x}" class="${S.pVista === x ? 'on' : ''}">${x}</button>`).join('')}</div></div></div>
    ${!allP().length ? '<div class="empty">Aún no tienes pendientes. Crea el primero con el botón "Nuevo pendiente" o desde la captura rápida de Inicio.</div>'
    : S.pVista === 'Tarjetas' ? `<div class="board">${ESTATUS.map(([k, c]) => { const xs = list.filter(p => p.estatus === k); return `<div class="bcol" data-col="${k}" style="--c:${c}"><div class="bcol-h"><i></i>${k}<span class="cnt">${xs.length}</span></div>${xs.map(card).join('')}</div>`; }).join('')}</div><p class="sub">Arrastra una tarjeta a otra columna para cambiar su estatus, o haz clic para editarla.</p>`
    : `<div class="list-wrap"><table class="list"><thead><tr><th></th><th>Pendiente</th><th>Frente</th><th>Responsable</th><th>Fecha y hora</th><th>Estatus</th></tr></thead><tbody>${list.map(p => `<tr><td><button class="check ${p.estatus === 'Terminado' ? 'on' : ''}" data-done="${p.id}" aria-label="Terminar"></button></td><td><button class="row-main" data-pen="${p.id}"><b class="${p.estatus === 'Terminado' ? 'struck' : ''}">${esc(p.titulo)}</b>${p.notas ? `<div class="sub">${esc(p.notas)}</div>` : ''}</button></td><td>${apill(p.frente)}</td><td>${esc(p.responsable)}</td><td>${dueChip(p)}</td><td><select class="in st-sel" data-sts="${p.id}">${ESTATUS.map(([s]) => `<option ${p.estatus === s ? 'selected' : ''}>${s}</option>`).join('')}</select></td></tr>`).join('') || '<tr><td colspan="6" class="sub">Sin pendientes con estos filtros.</td></tr>'}</tbody></table></div>`}`;
  bindShell(); bindRows();
  $('#newP').onclick = () => pendForm();
  $$('#pff button').forEach(b => b.onclick = () => { S.pFrente = b.dataset.x; renderPend(); });
  $$('#pper button').forEach(b => b.onclick = () => { S.pPeriodo = b.dataset.x; renderPend(); });
  $$('#pvis button').forEach(b => b.onclick = () => { S.pVista = b.dataset.x; renderPend(); });
  const setStatus = async (id, st) => { const p = allP().find(x => x.id === id); if (!p || p.estatus === st) return; if (await setEstatusItem(id, st)) renderPend(); };
  $$('[data-sts]').forEach(s => s.onchange = () => setStatus(s.dataset.sts, s.value));
  let drag = null;
  $$('.tcard').forEach(c => { c.ondragstart = () => { drag = c.dataset.id; c.classList.add('dragging'); }; c.ondragend = () => c.classList.remove('dragging'); });
  $$('.bcol').forEach(col => { col.ondragover = e => { e.preventDefault(); col.classList.add('over'); }; col.ondragleave = () => col.classList.remove('over'); col.ondrop = e => { e.preventDefault(); col.classList.remove('over'); if (drag) setStatus(drag, col.dataset.col); }; });
}

/* ---------- Recordatorios ---------- */
function renderRem() {
  $('#app').innerHTML = shell('Recordatorios', `<button class="btn btn-dark" id="newR">${svg('plus')}Nuevo recordatorio</button>`);
  const t = today();
  const list = S.recordatorios.filter(r => (S.rFrente === 'Todas' || r.frente === S.rFrente)).sort((a, b) => sortAgenda(a, b, 'fecha', 'hora'));
  const pend = list.filter(r => !r.hecho && r.fecha >= t), past = list.filter(r => r.hecho || r.fecha < t).reverse().slice(0, 15);
  const days = [...new Set(pend.map(r => r.fecha))];
  $('#view').innerHTML = `<div class="toolbar"><div class="chips" id="rff">${['Todas', ...ACTIVOS].map(f => `<button class="chip ${S.rFrente === f ? 'on' : ''}" data-x="${f}" style="--c:${f === 'Todas' ? 'var(--ink)' : FRENTES[f][1]}">${f === 'Todas' ? 'Todas' : esc(FR_CORTO[f])}</button>`).join('')}</div></div>
    ${days.length ? days.map(d => `<section class="card"><div class="card-head"><h3>${d === t ? 'Hoy' : cap(fdLong(d))}</h3><span class="sub right">${pend.filter(r => r.fecha === d).length} recordatorio(s)</span></div>
      ${pend.filter(r => r.fecha === d).map(r => `<div class="ag" style="--c:${FRENTES[r.frente][1]}"><div class="w"><b>${hm(r.hora)}</b><small>${esc(FR_CORTO[r.frente])}</small></div><button class="c" data-rec="${r.id}"><div class="t">${esc(r.titulo)}</div><div class="s">${r.relacionado_con ? esc(r.relacionado_con) + ' · ' : ''}${esc(r.nota || FRENTES[r.frente][0])}</div></button></div>`).join('')}</section>`).join('')
    : '<div class="empty">No tienes recordatorios próximos. Crea uno con el botón "Nuevo recordatorio".</div>'}
    ${past.length ? `<section class="card"><div class="card-head"><h3>Pasados y hechos</h3></div><div class="rows">${past.map(r => `<div class="row"><button class="row-main" data-rec="${r.id}"><div class="t ${r.hecho ? 'struck' : ''}">${esc(r.titulo)}</div><div class="s">${fdShort(r.fecha)} · ${hm(r.hora)}</div></button><span class="r">${apill(r.frente)}</span></div>`).join('')}</div></section>` : ''}`;
  bindShell(); bindRows();
  $('#newR').onclick = () => remForm();
  $$('#rff button').forEach(b => b.onclick = () => { S.rFrente = b.dataset.x; renderRem(); });
}

/* ---------- Ajustes ---------- */
const CATALOGOS = [['tipo_pendiente', 'Tipos de pendiente', false], ['fase_prospeccion', 'Fases de prospección', true], ['fase_comercial', 'Fases comerciales', true],
  ['motivo_descarte', 'Motivos de descarte', false], ['tipo_programa', 'Tipos de programa', false], ['modalidad', 'Modalidades', false],
  ['adicional', 'Adicionales', false], ['medio_seguimiento', 'Medios de seguimiento', false]];
function catEditor(cat, label, conColor) {
  const items = S.catalogos.filter(c => c.catalogo === cat && c.activo).sort((x, y) => x.orden - y.orden);
  return `<details class="catbox"><summary>${label}<span class="sub">${items.length}</span></summary>
    <div class="catchips">${items.map(c => `<span class="catchip">${conColor ? `<input type="color" class="cdot" data-ccol="${c.id}" value="${esc(c.color || '#8A8A86')}" aria-label="Color de ${esc(c.valor)}">` : ''}${esc(c.valor)}<button data-cdel="${c.id}" aria-label="Quitar ${esc(c.valor)}">×</button></span>`).join('')}</div>
    <input class="in" data-cadd="${cat}" placeholder="Agregar" style="margin-top:10px"></details>`;
}
function renderSet() {
  $('#app').innerHTML = shell('Ajustes', `<button class="btn btn-ghost" id="logout">${svg('out')}Cerrar sesión</button>`);
  const a = S.ajustes || {};
  const prefs = Object.keys(NOTIF).map(k => S.prefs.find(p => p.tipo === k) || { tipo: k, correo: true, app: true });
  $('#view').innerHTML = `<div class="set-grid">
    <div style="display:flex;flex-direction:column;gap:16px">
      <section class="card"><h3>Notificaciones</h3><p class="sub">Elige el canal de cada aviso: correo, notificación en tus dispositivos o ambos.</p>
        <div class="colorrow"><div style="flex:1"><div class="t" style="font-weight:600">Aviso previo</div><div class="sub">Antes de la hora exacta</div></div><select class="in" id="aviso" style="width:150px">${[[0, 'Sin aviso previo'], [15, '15 min antes'], [30, '30 min antes'], [60, '1 hora antes'], [1440, '1 día antes']].map(([v, l]) => `<option value="${v}" ${a.aviso_previo_min == v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="colorrow"><div style="flex:1"><div class="t" style="font-weight:600">Correo de avisos</div><div class="sub">${esc(a.correo_notificaciones || '')}</div></div></div>
        <div class="nrow h"><span></span><span>Correo</span><span>App</span></div>
        ${prefs.map(p => `<div class="nrow"><div><div style="font-weight:600;font-size:13.5px">${NOTIF[p.tipo][0]}</div><div class="sub">${NOTIF[p.tipo][1]}</div></div><button class="toggle ${p.correo ? 'on' : ''}" data-np="${p.tipo}" data-ch="correo" aria-label="${NOTIF[p.tipo][0]} por correo"></button><button class="toggle ${p.app ? 'on' : ''}" data-np="${p.tipo}" data-ch="app" aria-label="${NOTIF[p.tipo][0]} en app"></button></div>`).join('')}
      </section>
    </div>
    <div style="display:flex;flex-direction:column;gap:16px">
      <section class="card"><h3>Avisos en este dispositivo</h3><p class="sub" id="pushSt">Revisando…</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="btn btn-dark" id="pushOn">Activar avisos</button><button class="btn btn-ghost" id="pushTest">Enviar prueba</button></div>
      </section>
      <section class="card"><h3>Metas de venta</h3><p class="sub">Con IVA. El dashboard B2B compara tus ventas contra estas metas.</p>
        <div class="fgrid">${[['meta_anual_exp', 'Anual · Exponencial'], ['meta_anual_uvm', 'Anual · UVM'], ['meta_mensual_exp', 'Mensual · Exponencial'], ['meta_mensual_uvm', 'Mensual · UVM'], ['meta_rentabilidad', 'Meta de rentabilidad (%)']].map(([k, l]) => `<label class="f"><span>${l}</span><input class="in" type="number" min="0" step="1" data-meta="${k}" value="${a[k] ?? ''}"></label>`).join('')}</div>
      </section>
      <section class="card"><h3>Colores de la plataforma</h3><p class="sub">Azul marino Exponencial como base y un color por frente.</p>
        ${[['color_base', 'Base · Exponencial'], ['color_b2b', 'B2B'], ['color_cos', 'Chief of Staff']].map(([k, l]) => `<label class="colorrow"><input type="color" data-col="${k}" value="${esc(a[k] || '#14394D')}"><span style="flex:1;font-weight:600">${l}</span></label>`).join('')}
      </section>
      <section class="card"><h3>Catálogos</h3><p class="sub">Escribe y presiona Enter para agregar. Los colores se cambian tocando el círculo.</p>
        ${CATALOGOS.map(([k, l, col]) => catEditor(k, l, col)).join('')}
      </section>
      <section class="card"><h3>Empresas</h3><p class="sub">Color de cada empresa en cuentas y propuestas.</p>
        ${S.empresas.length ? S.empresas.slice().sort((x, y) => x.nombre.localeCompare(y.nombre)).map(em => `<label class="colorrow"><input type="color" data-emc="${em.id}" value="${esc(em.color)}"><span style="flex:1;font-weight:600">${esc(em.nombre)}</span></label>`).join('') : '<div class="empty">Las empresas se crean al dar de alta una cuenta.</div>'}
      </section>
      <section class="card"><h3>Acerca de</h3><p class="sub">Exponencial · Centro de mando · versión ${esc(CFG.version)}<br>Sesión: ${esc(S.user?.email || '')}</p>
        <button class="btn btn-ghost" id="reload">Actualizar datos</button></section>
    </div></div>`;
  bindShell(); pushStatus();
  $('#pushOn').onclick = activarAvisos;
  $('#pushTest').onclick = async () => {
    $('#pushTest').disabled = true; toast('Enviando prueba…');
    const { data, error } = await sb.functions.invoke('notificaciones', { body: { prueba: true } });
    $('#pushTest').disabled = false;
    if (error || !data?.ok) { console.error(error || data); toast('No se pudo enviar la prueba. Revisa la función en Supabase.'); return; }
    const txt = (data.informe || []).join(' · ') || 'Prueba enviada'; toast(txt); $('#pushSt').textContent = 'Resultado de la prueba: ' + txt;
  };
  $('#logout').onclick = cerrarSesion;
  $('#reload').onclick = async () => { await loadAll(); renderSet(); toast('Datos actualizados'); };
  $('#aviso').onchange = async e => { const v = +e.target.value; if (await handle(await sb.from('ajustes').update({ aviso_previo_min: v }).eq('user_id', S.user.id), 'Aviso previo actualizado')) S.ajustes.aviso_previo_min = v; };
  $$('[data-meta]').forEach(i => i.onchange = async () => { const k = i.dataset.meta, v = Number(i.value) || 0; if (await handle(await sb.from('ajustes').update({ [k]: v }).eq('user_id', S.user.id), 'Meta guardada')) S.ajustes[k] = v; });
  $$('[data-col]').forEach(i => { i.oninput = () => { S.ajustes[i.dataset.col] = i.value; applyColors(); }; i.onchange = async () => { await handle(await sb.from('ajustes').update({ [i.dataset.col]: i.value }).eq('user_id', S.user.id), 'Color guardado'); }; });
  $$('[data-np]').forEach(b => b.onclick = async () => {
    const tipo = b.dataset.np, ch = b.dataset.ch; let p = S.prefs.find(x => x.tipo === tipo);
    const val = !(p ? p[ch] : true);
    const res = p ? await sb.from('preferencias_notificacion').update({ [ch]: val }).eq('user_id', S.user.id).eq('tipo', tipo).select().single()
      : await sb.from('preferencias_notificacion').insert({ tipo, correo: ch === 'correo' ? val : true, app: ch === 'app' ? val : true }).select().single();
    const data = await handle(res, `${NOTIF[tipo][0]}: ${ch} ${val ? 'activado' : 'desactivado'}`);
    if (data) { if (p) Object.assign(p, data); else S.prefs.push(data); b.classList.toggle('on', val); }
  });
  $$('[data-cdel]').forEach(b => b.onclick = async () => { if (await handle(await sb.from('catalogos').update({ activo: false }).eq('id', b.dataset.cdel), 'Elemento quitado')) { S.catalogos.find(c => c.id === b.dataset.cdel).activo = false; renderSet(); } });
  $$('[data-ccol]').forEach(i => i.onchange = async () => { const c = S.catalogos.find(x => x.id === i.dataset.ccol); if (await handle(await sb.from('catalogos').update({ color: i.value }).eq('id', c.id), 'Color guardado')) c.color = i.value; });
  $$('[data-emc]').forEach(i => i.onchange = async () => { const em = S.empresas.find(x => x.id === i.dataset.emc); if (await handle(await sb.from('empresas').update({ color: i.value }).eq('id', em.id), 'Color guardado')) em.color = i.value; });
  $$('[data-cadd]').forEach(inp => inp.onkeydown = async e => {
    if (e.key !== 'Enter' || !inp.value.trim()) return;
    const cat = inp.dataset.cadd, valor = inp.value.trim(), prev = S.catalogos.find(c => c.catalogo === cat && c.valor.toLowerCase() === valor.toLowerCase());
    const n = S.catalogos.filter(c => c.catalogo === cat).length;
    const res = prev ? await sb.from('catalogos').update({ activo: true }).eq('id', prev.id).select().single()
      : await sb.from('catalogos').insert({ catalogo: cat, valor, orden: n + 1, color: CATALOGOS.find(x => x[0] === cat)[2] ? '#3C74D6' : null }).select().single();
    const data = await handle(res, 'Agregado');
    if (data) { if (prev) Object.assign(prev, data); else S.catalogos.push(data); renderSet(); }
  });
}

/* ---------- Registro de vistas y utilidades compartidas ---------- */
Object.assign(VIEWS, { home: renderHome, pend: renderPend, rem: renderRem, set: renderSet });
function empNombre(id) { return (S.empresas.find(e => e.id === id) || {}).nombre || 'Sin empresa'; }
window.EXP = { sb, S, $, $$, esc, svg, ICON, toast, handle, shell, bindShell, bindRows, openSheet, closeSheet, head, go, render, VIEWS,
  today, addDays, fdShort, fdLong, hm, cap, MES, MES3, DIA, apill, FRENTES, bindChoice, picked, pendForm, remForm, empNombre, loadAll, allP, isLate, dueChip, ESTATUS, setEstatusItem };

/* ---------- Cerrar sesión ---------- */
async function cerrarSesion() {
  if (!confirm('¿Cerrar sesión en este dispositivo?')) return;
  toast('Cerrando sesión…');
  // No se espera más de 1.5 s a Supabase: algunos navegadores de escritorio se quedan bloqueados aquí.
  try { await Promise.race([sb.auth.signOut({ scope: 'local' }), new Promise(r => setTimeout(r, 1500))]); } catch (e) { console.error(e); }
  try { Object.keys(localStorage).filter(k => k.startsWith('sb-')).forEach(k => localStorage.removeItem(k)); } catch (_) {}
  try { Object.keys(sessionStorage).filter(k => k.startsWith('sb-')).forEach(k => sessionStorage.removeItem(k)); } catch (_) {}
  location.replace(location.pathname + '?salida=' + Date.now());
}

/* ---------- Avisos push ---------- */
const pushSoportado = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const esIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const instalada = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
function b64ToBytes(b64) { const p = '='.repeat((4 - b64.length % 4) % 4); const s = atob((b64 + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...s].map(c => c.charCodeAt(0))); }
async function pushStatus() {
  const el = $('#pushSt'); if (!el) return;
  if (!pushSoportado()) { el.textContent = esIOS() && !instalada() ? 'En iPhone, primero instala la app: Safari › Compartir › Agregar a pantalla de inicio, y abre Exponencial desde ese ícono.' : 'Este navegador no permite avisos. Usa Chrome, Edge o Safari actualizado.'; $('#pushOn').disabled = true; return; }
  if (Notification.permission === 'denied') { el.textContent = 'Los avisos están bloqueados para este sitio. Actívalos en la configuración del navegador o del celular.'; return; }
  const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription();
  el.textContent = sub ? 'Activos en este dispositivo. Recibirás recordatorios, pendientes y el resumen del día.' : 'Inactivos en este dispositivo. Actívalos para recibir avisos aquí.';
  $('#pushOn').textContent = sub ? 'Volver a registrar' : 'Activar avisos';
}
async function activarAvisos() {
  if (!pushSoportado()) return pushStatus();
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') { toast('Necesitas permitir las notificaciones.'); return pushStatus(); }
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(CFG.vapidPublicKey) });
    const j = sub.toJSON();
    const disp = esIOS() ? 'iPhone' : /android/i.test(navigator.userAgent) ? 'Android' : 'Computadora';
    const res = await sb.from('suscripciones_push').upsert({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, dispositivo: disp }, { onConflict: 'endpoint' });
    if (await handle(res, 'Avisos activados en este dispositivo')) pushStatus();
  } catch (e) { console.error(e); toast('No se pudieron activar los avisos en este dispositivo.'); }
}

/* ---------- Arranque ---------- */
let booted = false;
async function start(session) {
  if (!session) { S.user = null; booted = false; renderLogin(); return; }
  if (booted && S.user?.id === session.user.id) return;
  booted = true; S.user = session.user;
  $('#app').innerHTML = '<div class="boot">Cargando tu información…</div>';
  await loadAll(); S.view = 'home'; render();
}
sb.auth.onAuthStateChange((_e, session) => { setTimeout(() => start(session), 0); });
sb.auth.getSession().then(({ data }) => start(data.session));
document.addEventListener('visibilitychange', async () => { if (document.visibilityState === 'visible' && S.user) { await loadAll(); if (!$('#sheet').classList.contains('on')) render(); } });
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
})();
