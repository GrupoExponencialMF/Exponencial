/* =====================================================================
   Exponencial · Etapa 3 · B2B comercial
   Cuentas, seguimientos, propuestas con fotos y forecast
   ===================================================================== */
(() => {
'use strict';
const X = window.EXP;
const { sb, S, $, $$, esc, svg, toast, handle, shell, bindShell, openSheet, closeSheet, head, go, render, VIEWS, today, fdShort, empNombre, bindChoice, picked } = X;

/* ---------- Utilidades ---------- */
const IVA = 0.16;
const CAT = c => S.catalogos.filter(x => x.catalogo === c && x.activo).sort((a, b) => a.orden - b.orden);
const catColor = (c, v) => (S.catalogos.find(x => x.catalogo === c && x.valor === v) || {}).color || '#8A8A86';
const money = (n, d = 0) => '$\u00a0' + (Number(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d });
const num = v => { const n = parseFloat(String(v ?? '').replace(/[^0-9.\-]/g, '')); return isNaN(n) ? 0 : n; };
const ORIG = { Exponencial: ['#B5E61D', '#1B1B1D'], UVM: ['#E5383B', '#FFFFFF'] };
const pillO = o => `<span class="opill" style="background:${ORIG[o][0]};color:${ORIG[o][1]}">${esc(o)}</span>`;
const pillF = (cat, v) => v ? `<span class="fpill" style="--c:${catColor(cat, v)}"><i></i>${esc(v)}</span>` : '';
const nombre = c => `${c.nombre}${c.apellido ? ' ' + c.apellido : ''}`;
const cuenta = id => S.cuentas.find(c => c.id === id);
const empresa = id => S.empresas.find(e => e.id === id);
const empDot = id => { const e = empresa(id); return e ? `<span class="edot"><i style="background:${esc(e.color)}"></i>${esc(e.nombre)}</span>` : '<span class="sub">Sin empresa</span>'; };
const origenProp = p => (cuenta(p.cuenta_id) || {}).origen || 'Exponencial';
const fcDe = pid => S.forecasts.find(f => f.propuesta_id === pid);
const uid = () => S.user.id;
const F = { cTipo: 'Todas', cQ: '', cOrigen: '', cFase: '', cVista: 'Lista', pQ: '', pOrigen: '', pFase: '', pVista: 'Galería', fEstado: '' };

/* ---------- Cálculo del forecast ---------- */
function calc(fc, grupos, egresos, p) {
  const o = origenProp(p), per = num(fc.personas), pc = num(fc.precio_capturado);
  let ingCon = 0, ppSin = 0, ppCon = 0;
  if (fc.modo_precio === 'persona_sin_iva') { ppSin = pc; ppCon = pc * (1 + IVA); ingCon = per * ppCon; }
  else if (fc.modo_precio === 'persona_con_iva') { ppCon = pc; ppSin = pc / (1 + IVA); ingCon = per * ppCon; }
  else { ingCon = pc; ppCon = per ? pc / per : 0; ppSin = ppCon / (1 + IVA); }
  const ingSin = ingCon / (1 + IVA), iva = ingCon - ingSin;
  const kamBase = o === 'UVM' ? ingSin : ingCon, kam = kamBase * num(fc.kam_porcentaje) / 100;
  const cats = {};
  for (const e of egresos) cats[e.categoria] = (cats[e.categoria] || 0) + num(e.precio) * num(e.cantidad);
  cats['KAM'] = kam;
  const egr = Object.values(cats).reduce((a, b) => a + b, 0), util = ingCon - egr, rent = ingCon ? util / ingCon * 100 : 0;
  return { o, per, ppSin, ppCon, ingCon, ingSin, iva, kamBase, kam, cats, egr, util, rent, grupos: grupos.length, horas: num(p.duracion_horas), sesiones: num(p.estructura_num) };
}
const meta = () => num(S.ajustes?.meta_rentabilidad) || 60;
function resumenFc(p) {
  const fc = fcDe(p.id); if (!fc) return null;
  return calc(fc, S.fgrupos.filter(g => g.forecast_id === fc.id), S.fegresos.filter(e => e.forecast_id === fc.id), p);
}

/* ---------- Fotos ---------- */
async function comprimir(file) {
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
  const sc = Math.min(1, 1400 / Math.max(img.width, img.height)), c = document.createElement('canvas');
  c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return await new Promise(r => c.toBlob(r, 'image/jpeg', 0.82));
}
async function urlsFotos(paths) {
  const faltan = [...new Set(paths.filter(p => p && !S.fotoUrls[p]))];
  if (!faltan.length) return;
  const { data } = await sb.storage.from('fotos').createSignedUrls(faltan, 60 * 60 * 6);
  (data || []).forEach(d => { if (d.signedUrl) S.fotoUrls[d.path] = d.signedUrl; });
}

/* ---------- Cuentas ---------- */
function renderCuentas() {
  $('#app').innerHTML = shell('Cuentas', `<button class="btn btn-dark" id="newC">${svg('plus')}Nueva cuenta</button>`);
  const fases = CAT('fase_prospeccion').map(c => c.valor);
  const list = S.cuentas.filter(c => (F.cTipo === 'Todas' || c.tipo === F.cTipo) && (!F.cOrigen || c.origen === F.cOrigen) && (!F.cFase || c.fase === F.cFase)
    && (!F.cQ || (nombre(c) + ' ' + empNombre(c.empresa_id) + ' ' + (c.correo || '')).toLowerCase().includes(F.cQ.toLowerCase())))
    .sort((a, b) => nombre(a).localeCompare(nombre(b)));
  const ult = c => { const s = S.seguimientos.filter(x => x.cuenta_id === c.id).sort((a, b) => b.fecha.localeCompare(a.fecha))[0]; return s ? fdShort(s.fecha) : 'Sin seguimiento'; };
  const tPill = c => `<span class="pill ${c.tipo === 'Cliente' ? 'today' : ''}">${c.tipo}</span>${c.descartada ? ' <span class="pill late">Descartada</span>' : ''}`;
  let body;
  if (!S.cuentas.length) body = '<div class="empty">Aún no tienes cuentas. Da de alta tu primer prospecto o cliente con "Nueva cuenta".</div>';
  else if (!list.length) body = '<div class="empty">No hay cuentas con estos filtros.</div>';
  else if (F.cVista === 'Lista') body = `<div class="list-wrap"><table class="list"><thead><tr><th>Nombre</th><th>Tipo</th><th>Puesto</th><th>Empresa</th><th>Origen</th><th>Fase</th><th>Propuestas</th><th>Último seguimiento</th></tr></thead><tbody>${list.map(c => `<tr class="click" data-cta="${c.id}"><td><b>${esc(nombre(c))}</b></td><td>${tPill(c)}</td><td>${esc(c.puesto || '')}</td><td>${empDot(c.empresa_id)}</td><td>${pillO(c.origen)}</td><td>${pillF('fase_prospeccion', c.fase)}</td><td>${S.propuestas.filter(p => p.cuenta_id === c.id).length}</td><td>${ult(c)}</td></tr>`).join('')}</tbody></table></div>`;
  else if (F.cVista === 'Pipeline') body = `<div class="board" style="grid-template-columns:repeat(${Math.max(fases.length, 1)},minmax(220px,1fr))">${fases.map(f => { const xs = list.filter(c => c.fase === f); return `<div class="bcol" style="--c:${catColor('fase_prospeccion', f)}"><div class="bcol-h"><i></i>${esc(f)}<span class="cnt">${xs.length}</span></div>${xs.map(c => `<button class="tcard" data-cta="${c.id}"><div class="tc-t" style="margin-top:0">${esc(nombre(c))}</div><div class="tc-n">${empDot(c.empresa_id)}</div><div class="tc-top" style="margin-top:8px">${pillO(c.origen)}<span class="pill">${c.tipo}</span></div></button>`).join('')}</div>`; }).join('')}</div>`;
  else { const emps = [...new Set(list.map(c => c.empresa_id))]; body = `<div class="gal">${emps.map(id => { const e = empresa(id); const xs = list.filter(c => c.empresa_id === id); return `<section class="card" style="border-top:6px solid ${esc(e ? e.color : '#8A8A86')}"><div class="card-head"><h3>${esc(e ? e.nombre : 'Sin empresa')}</h3><span class="sub right">${xs.length} contacto(s)</span></div><div class="rows">${xs.map(c => `<div class="row"><button class="row-main" data-cta="${c.id}"><div class="t">${esc(nombre(c))}</div><div class="s">${esc(c.puesto || '')}${c.correo ? ' · ' + esc(c.correo) : ''}</div></button><span class="r">${pillF('fase_prospeccion', c.fase)}</span></div>`).join('')}</div></section>`; }).join('')}</div>`; }
  $('#view').innerHTML = `<div class="toolbar">
      <div class="seg" id="ctip">${['Todas', 'Prospecto', 'Cliente'].map(k => `<button data-x="${k}" class="${F.cTipo === k ? 'on' : ''}">${k === 'Todas' ? 'Todas' : k + 's'} · ${S.cuentas.filter(c => k === 'Todas' || c.tipo === k).length}</button>`).join('')}</div>
      <input class="in search" id="cq" placeholder="Buscar por nombre, empresa o correo" value="${esc(F.cQ)}">
      <select class="in sel" id="co"><option value="">Origen: todos</option>${['Exponencial', 'UVM'].map(o => `<option ${F.cOrigen === o ? 'selected' : ''}>${o}</option>`).join('')}</select>
      <select class="in sel" id="cf"><option value="">Fase: todas</option>${fases.map(f => `<option ${F.cFase === f ? 'selected' : ''}>${esc(f)}</option>`).join('')}</select>
      <div class="seg right" id="cv">${['Lista', 'Pipeline', 'Empresas'].map(k => `<button data-x="${k}" class="${F.cVista === k ? 'on' : ''}">${k}</button>`).join('')}</div></div>${body}`;
  bindShell();
  $('#newC').onclick = () => cuentaForm();
  $$('#ctip button').forEach(b => b.onclick = () => { F.cTipo = b.dataset.x; renderCuentas(); });
  $$('#cv button').forEach(b => b.onclick = () => { F.cVista = b.dataset.x; renderCuentas(); });
  $('#cq').oninput = e => { F.cQ = e.target.value; clearTimeout(F._t); F._t = setTimeout(() => { renderCuentas(); const q = $('#cq'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }, 250); };
  $('#co').onchange = e => { F.cOrigen = e.target.value; renderCuentas(); };
  $('#cf').onchange = e => { F.cFase = e.target.value; renderCuentas(); };
  $$('[data-cta]').forEach(b => b.onclick = () => cuentaDetalle(b.dataset.cta));
}

function cuentaForm(c, after) {
  const e = c || { tipo: 'Prospecto', origen: 'Exponencial', fase: (CAT('fase_prospeccion')[0] || {}).valor };
  openSheet(`${head(c ? 'Editar cuenta' : 'Nueva cuenta')}
    <div class="fgrid">
      <div class="f"><span>Tipo de cuenta</span><div class="opts" id="kt">${['Prospecto', 'Cliente'].map(t => `<button type="button" class="opt ${e.tipo === t ? 'on' : ''}" data-x="${t}">${t}</button>`).join('')}</div></div>
      <div class="f"><span>Origen</span><div class="opts" id="ko">${['Exponencial', 'UVM'].map(o => `<button type="button" class="opt ${e.origen === o ? 'on' : ''}" data-x="${o}">${o}</button>`).join('')}</div></div>
      <label class="f"><span>Nombre</span><input class="in" id="kn" value="${esc(e.nombre || '')}"></label>
      <label class="f"><span>Apellido</span><input class="in" id="ka" value="${esc(e.apellido || '')}"></label>
      <label class="f full"><span>Puesto</span><input class="in" id="kp" value="${esc(e.puesto || '')}"></label>
      <label class="f full"><span>Empresa</span><select class="in" id="ke"><option value="">Selecciona…</option>${S.empresas.slice().sort((a, b) => a.nombre.localeCompare(b.nombre)).map(em => `<option value="${em.id}" ${e.empresa_id === em.id ? 'selected' : ''}>${esc(em.nombre)}</option>`).join('')}<option value="__nueva">+ Nueva empresa</option></select></label>
      <div class="f full hidden" id="kew"><span>Nueva empresa</span><div style="display:flex;gap:8px"><input class="in" id="ken" placeholder="Nombre de la empresa"><input type="color" id="kec" value="#14394D" style="width:48px;height:44px;border:0;background:none" aria-label="Color de la empresa"></div></div>
      <label class="f"><span>Correo</span><input class="in" type="email" id="kc" value="${esc(e.correo || '')}"></label>
      <label class="f"><span>Teléfono</span><input class="in" type="tel" id="kt2" value="${esc(e.telefono || '')}"></label>
      <label class="f full"><span>Fase de prospección</span><select class="in" id="kf">${CAT('fase_prospeccion').map(f => `<option ${e.fase === f.valor ? 'selected' : ''}>${esc(f.valor)}</option>`).join('')}</select></label>
      <label class="f full"><span>Notas</span><textarea class="in" id="kno">${esc(e.notas || '')}</textarea></label>
    </div>
    <div class="foot">${c ? '<button class="btn btn-danger left" id="kdel">Eliminar</button>' : ''}<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-dark" id="kok">Guardar</button></div>`);
  bindChoice('kt'); bindChoice('ko');
  $('#ke').onchange = () => $('#kew').classList.toggle('hidden', $('#ke').value !== '__nueva');
  if (c) $('#kdel').onclick = async () => {
    if (S.propuestas.some(p => p.cuenta_id === c.id)) { toast('No se puede eliminar: tiene propuestas. Puedes descartarla.'); return; }
    if (!confirm('¿Eliminar esta cuenta y sus seguimientos?')) return;
    if (await handle(await sb.from('cuentas').delete().eq('id', c.id), 'Cuenta eliminada')) { S.cuentas = S.cuentas.filter(x => x.id !== c.id); S.seguimientos = S.seguimientos.filter(x => x.cuenta_id !== c.id); closeSheet(); render(); }
  };
  $('#kok').onclick = async () => {
    let empresa_id = $('#ke').value || null;
    if (!$('#kn').value.trim()) { toast('Escribe el nombre.'); return; }
    $('#kok').disabled = true;
    if (empresa_id === '__nueva') {
      const n = $('#ken').value.trim(); if (!n) { toast('Escribe el nombre de la empresa.'); $('#kok').disabled = false; return; }
      const ex = S.empresas.find(x => x.nombre.toLowerCase() === n.toLowerCase());
      if (ex) empresa_id = ex.id;
      else { const em = await handle(await sb.from('empresas').insert({ nombre: n, color: $('#kec').value }).select().single()); if (!em) { $('#kok').disabled = false; return; } S.empresas.push(em); empresa_id = em.id; }
    }
    const row = { tipo: picked('kt'), origen: picked('ko'), nombre: $('#kn').value.trim(), apellido: $('#ka').value.trim() || null, puesto: $('#kp').value.trim() || null, empresa_id,
      correo: $('#kc').value.trim() || null, telefono: $('#kt2').value.trim() || null, fase: $('#kf').value || null, notas: $('#kno').value.trim() || null };
    const res = c ? await sb.from('cuentas').update(row).eq('id', c.id).select().single() : await sb.from('cuentas').insert(row).select().single();
    const data = await handle(res, c ? 'Cuenta actualizada' : `${row.tipo} dado de alta`);
    if (data) { if (c) Object.assign(c, data); else S.cuentas.push(data); closeSheet(); if (after) after(data); else render(); } else $('#kok').disabled = false;
  };
}

function cuentaDetalle(id) {
  const c = cuenta(id); if (!c) return;
  const props = S.propuestas.filter(p => p.cuenta_id === id).sort((a, b) => b.fecha_envio.localeCompare(a.fecha_envio));
  const segs = S.seguimientos.filter(s => s.cuenta_id === id).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.created_at.localeCompare(a.created_at));
  const pens = S.pendientes.filter(p => p.cuenta_id === id && p.estatus !== 'Terminado');
  openSheet(`${head(esc(nombre(c)))}
    <div class="tc-top" style="margin-bottom:6px">${pillO(c.origen)}<span class="pill ${c.tipo === 'Cliente' ? 'today' : ''}">${c.tipo}</span>${pillF('fase_prospeccion', c.fase)}${c.descartada ? '<span class="pill late">Descartada · ' + esc(c.motivo_descarte || '') + '</span>' : ''}</div>
    <div class="dl"><div><small>Puesto</small><b>${esc(c.puesto || '—')}</b></div><div><small>Empresa</small><b>${empDot(c.empresa_id)}</b></div><div><small>Correo</small><b>${c.correo ? `<a href="mailto:${esc(c.correo)}">${esc(c.correo)}</a>` : '—'}</b></div><div><small>Teléfono</small><b>${c.telefono ? `<a href="tel:${esc(c.telefono)}">${esc(c.telefono)}</a>` : '—'}</b></div></div>
    ${c.notas ? `<p class="sub" style="margin:10px 0 0">${esc(c.notas)}</p>` : ''}
    <div class="actions-row"><button class="btn btn-dark" id="dSeg">Registrar seguimiento</button><button class="btn btn-ghost" id="dProp">Nueva propuesta</button><button class="btn btn-ghost" id="dPen">Nuevo pendiente</button><button class="btn btn-ghost" id="dEdit">Editar</button><button class="btn btn-line" id="dDesc">${c.descartada ? 'Reactivar' : 'Descartar'}</button></div>
    <div class="hl">Propuestas · ${props.length}</div>${props.length ? `<div class="rows">${props.map(p => { const r = resumenFc(p); return `<div class="row"><button class="row-main" data-dp="${p.id}"><div class="t">${esc(p.nombre)}</div><div class="s">${fdShort(p.fecha_envio)} · ${esc(p.tipo_programa || '')}</div></button><span class="r">${pillF('fase_comercial', p.fase_comercial)}<b style="font-size:12.5px">${r && fcDe(p.id).terminado ? money(r.ingCon) : 'Forecast pendiente'}</b></span></div>`; }).join('')}</div>` : '<div class="empty">Sin propuestas.</div>'}
    ${pens.length ? `<div class="hl">Pendientes abiertos · ${pens.length}</div><div class="rows">${pens.map(p => `<div class="row"><div class="row-main"><div class="t">${esc(p.titulo)}</div><div class="s">${fdShort(p.fecha_limite)} · ${X.hm(p.hora_limite)}</div></div></div>`).join('')}</div>` : ''}
    <div class="hl">Seguimientos · ${segs.length}</div>${segs.length ? `<div class="tl">${segs.map(s => { const p = S.propuestas.find(x => x.id === s.propuesta_id); return `<div class="tl-i"><div class="tl-d">${fdShort(s.fecha)}</div><div><div class="t">${esc(s.medio || 'Seguimiento')}${p ? ' · ' + esc(p.nombre) : ''} ${s.fase_comercial ? pillF('fase_comercial', s.fase_comercial) : ''}</div><div class="s">${esc(s.nota)}</div></div></div>`; }).join('')}</div>` : '<div class="empty">Sin seguimientos todavía.</div>'}`);
  $('#dSeg').onclick = () => seguimientoForm(c);
  $('#dProp').onclick = () => propuestaForm(null, c.id);
  $('#dEdit').onclick = () => cuentaForm(c, () => cuentaDetalle(c.id));
  $('#dPen').onclick = () => { closeSheet(); X.pendForm(null, { frente: 'B2B', asociado_tipo: 'Cuenta', cuenta_id: c.id }); };
  $('#dDesc').onclick = () => c.descartada ? reactivar(c) : descartar(c);
  $$('[data-dp]').forEach(b => b.onclick = () => propuestaDetalle(b.dataset.dp));
}
function descartar(c) {
  openSheet(`${head('Descartar cuenta')}<p class="sub">${esc(nombre(c))} pasará a "Contacto no interesado".</p>
    <div class="fgrid"><label class="f full"><span>Motivo</span><select class="in" id="dm">${CAT('motivo_descarte').map(m => `<option>${esc(m.valor)}</option>`).join('')}</select></label></div>
    <div class="foot"><button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-dark" id="dok">Descartar</button></div>`);
  $('#dok').onclick = async () => {
    const data = await handle(await sb.from('cuentas').update({ descartada: true, motivo_descarte: $('#dm').value, fase: 'Contacto no interesado' }).eq('id', c.id).select().single(), 'Cuenta descartada');
    if (data) { Object.assign(c, data); cuentaDetalle(c.id); render(); }
  };
}
async function reactivar(c) {
  const data = await handle(await sb.from('cuentas').update({ descartada: false, motivo_descarte: null, fase: (CAT('fase_prospeccion')[0] || {}).valor || null }).eq('id', c.id).select().single(), 'Cuenta reactivada');
  if (data) { Object.assign(c, data); cuentaDetalle(c.id); render(); }
}

function seguimientoForm(c, propId) {
  const props = S.propuestas.filter(p => p.cuenta_id === c.id);
  openSheet(`${head('Registrar seguimiento')}<p class="sub">${esc(nombre(c))} · ${esc(empNombre(c.empresa_id))}</p>
    <div class="fgrid">
      <label class="f"><span>Fecha</span><input class="in" type="date" id="sf" value="${today()}"></label>
      <label class="f"><span>Medio</span><select class="in" id="sm">${CAT('medio_seguimiento').map(m => `<option>${esc(m.valor)}</option>`).join('')}</select></label>
      <label class="f full"><span>Propuesta relacionada (opcional)</span><select class="in" id="sp"><option value="">Ninguna</option>${props.map(p => `<option value="${p.id}" ${p.id === propId ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('')}</select></label>
      <label class="f full ${propId ? '' : 'hidden'}" id="sfcw"><span>Fase comercial de la propuesta</span><select class="in" id="sfc"><option value="">Sin cambio</option>${CAT('fase_comercial').map(f => `<option>${esc(f.valor)}</option>`).join('')}</select></label>
      <label class="f full"><span>Fase de prospección de la cuenta</span><select class="in" id="sfp"><option value="">Sin cambio</option>${CAT('fase_prospeccion').map(f => `<option ${f.valor === c.fase ? '' : ''}>${esc(f.valor)}</option>`).join('')}</select></label>
      <label class="f full"><span>¿Qué pasó?</span><textarea class="in" id="sn" placeholder="Ej. Llamada con Ricardo: pidió ajustar el número de sesiones."></textarea></label>
    </div>
    <div class="foot"><button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-dark" id="sok">Guardar seguimiento</button></div>`);
  $('#sp').onchange = () => $('#sfcw').classList.toggle('hidden', !$('#sp').value);
  $('#sok').onclick = async () => {
    const nota = $('#sn').value.trim(), pid = $('#sp').value || null, fc = pid ? $('#sfc').value : '', fp = $('#sfp').value;
    if (!nota) { toast('Describe el seguimiento.'); return; }
    const prop = pid && S.propuestas.find(p => p.id === pid);
    if (fc === 'Venta' && !(fcDe(pid) || {}).terminado) { toast('No puede pasar a Venta sin forecast terminado.'); return; }
    $('#sok').disabled = true;
    const s = await handle(await sb.from('seguimientos').insert({ cuenta_id: c.id, propuesta_id: pid, fecha: $('#sf').value, medio: $('#sm').value, nota, fase_comercial: fc || null }).select().single());
    if (!s) { $('#sok').disabled = false; return; }
    S.seguimientos.push(s);
    if (prop && fc && fc !== prop.fase_comercial) { const d = await handle(await sb.from('propuestas').update({ fase_comercial: fc }).eq('id', prop.id).select().single()); if (d) Object.assign(prop, d); }
    const cuentaUpd = {};
    if (fp) cuentaUpd.fase = fp;
    if (fc === 'Venta' && c.tipo !== 'Cliente') cuentaUpd.tipo = 'Cliente';
    if (Object.keys(cuentaUpd).length) { const d = await handle(await sb.from('cuentas').update(cuentaUpd).eq('id', c.id).select().single()); if (d) Object.assign(c, d); }
    toast(fc === 'Venta' ? 'Seguimiento guardado. La cuenta ahora es Cliente.' : 'Seguimiento guardado');
    cuentaDetalle(c.id); render();
  };
}

/* ---------- Propuestas ---------- */
async function renderPropuestas() {
  $('#app').innerHTML = shell('Propuestas', `<button class="btn btn-dark" id="newP2">${svg('plus')}Nueva propuesta</button>`);
  const list = S.propuestas.filter(p => { const c = cuenta(p.cuenta_id) || {}; return (!F.pOrigen || c.origen === F.pOrigen) && (!F.pFase || p.fase_comercial === F.pFase)
    && (!F.pQ || (p.nombre + ' ' + nombre(c) + ' ' + empNombre(c.empresa_id)).toLowerCase().includes(F.pQ.toLowerCase())); }).sort((a, b) => b.fecha_envio.localeCompare(a.fecha_envio));
  await urlsFotos(list.map(p => p.foto_path));
  const inv = p => { const f = fcDe(p.id), r = resumenFc(p); return f && f.terminado ? `<b>${money(r.ingCon)}</b>` : '<span class="pill imp">Forecast pendiente</span>'; };
  const card = p => { const c = cuenta(p.cuenta_id) || {}, o = c.origen || 'Exponencial', url = S.fotoUrls[p.foto_path];
    return `<button class="gcard" data-dp="${p.id}"><div class="cover ${url ? 'img' : ''}" style="${url ? `background-image:url('${url}')` : `--o:${ORIG[o][0]}`}">${pillO(o)}${p.tipo_programa ? `<span class="pill">${esc(p.tipo_programa)}</span>` : ''}</div>
      <div class="gbody"><div class="t">${esc(p.nombre)}</div><div class="s">${esc(nombre(c))} · ${empDot(c.empresa_id)}</div><div style="margin-top:8px">${pillF('fase_comercial', p.fase_comercial)}</div>
      <div class="gmeta"><span>Enviada ${fdShort(p.fecha_envio)}</span>${inv(p)}</div></div></button>`; };
  $('#view').innerHTML = `<div class="toolbar"><input class="in search" id="pq" placeholder="Buscar por programa, contacto o empresa" value="${esc(F.pQ)}">
      <select class="in sel" id="po"><option value="">Origen: todos</option>${['Exponencial', 'UVM'].map(o => `<option ${F.pOrigen === o ? 'selected' : ''}>${o}</option>`).join('')}</select>
      <select class="in sel" id="pfa"><option value="">Fase: todas</option>${CAT('fase_comercial').map(f => `<option ${F.pFase === f.valor ? 'selected' : ''}>${esc(f.valor)}</option>`).join('')}</select>
      <div class="seg right" id="pv">${['Galería', 'Lista'].map(k => `<button data-x="${k}" class="${F.pVista === k ? 'on' : ''}">${k}</button>`).join('')}</div></div>
    ${!S.propuestas.length ? '<div class="empty">Aún no tienes propuestas. Crea la primera con "Nueva propuesta" (necesitas al menos una cuenta).</div>' : !list.length ? '<div class="empty">No hay propuestas con estos filtros.</div>'
    : F.pVista === 'Galería' ? `<div class="gal">${list.map(card).join('')}</div>`
    : `<div class="list-wrap"><table class="list"><thead><tr><th>Propuesta</th><th>Contacto</th><th>Empresa</th><th>Origen</th><th>Tipo</th><th>Fase</th><th>Enviada</th><th>Inversión</th></tr></thead><tbody>${list.map(p => { const c = cuenta(p.cuenta_id) || {}; return `<tr class="click" data-dp="${p.id}"><td><b>${esc(p.nombre)}</b></td><td>${esc(nombre(c))}</td><td>${empDot(c.empresa_id)}</td><td>${pillO(c.origen || 'Exponencial')}</td><td>${esc(p.tipo_programa || '')}</td><td>${pillF('fase_comercial', p.fase_comercial)}</td><td>${fdShort(p.fecha_envio)}</td><td>${inv(p)}</td></tr>`; }).join('')}</tbody></table></div>`}`;
  bindShell();
  $('#newP2').onclick = () => S.cuentas.length ? propuestaForm() : toast('Primero da de alta una cuenta.');
  $('#pq').oninput = e => { F.pQ = e.target.value; clearTimeout(F._t); F._t = setTimeout(async () => { await renderPropuestas(); const q = $('#pq'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }, 250); };
  $('#po').onchange = e => { F.pOrigen = e.target.value; renderPropuestas(); };
  $('#pfa').onchange = e => { F.pFase = e.target.value; renderPropuestas(); };
  $$('#pv button').forEach(b => b.onclick = () => { F.pVista = b.dataset.x; renderPropuestas(); });
  $$('[data-dp]').forEach(b => b.onclick = () => propuestaDetalle(b.dataset.dp));
}

function propuestaForm(p, cuentaId) {
  const e = p ? JSON.parse(JSON.stringify(p)) : { cuenta_id: cuentaId || '', fecha_envio: today(), modalidades: [], adicionales: [], distribucion: [], estructura_tipo: 'Módulos', estructura_num: 0 };
  let foto = null;
  const draw = () => {
    const c = cuenta(e.cuenta_id);
    openSheet(`${head(p ? 'Editar propuesta' : 'Nueva propuesta')}
      <div class="fgrid">
        <label class="f full"><span>Prospecto o cliente</span><select class="in" id="xc"><option value="">Selecciona…</option>${S.cuentas.filter(k => !k.descartada || k.id === e.cuenta_id).sort((a, b) => nombre(a).localeCompare(nombre(b))).map(k => `<option value="${k.id}" ${k.id === e.cuenta_id ? 'selected' : ''}>${esc(nombre(k))} · ${esc(empNombre(k.empresa_id))}</option>`).join('')}</select></label>
        <div class="f"><span>Empresa (automática)</span><div class="ro">${c ? empDot(c.empresa_id) : '—'}</div></div>
        <div class="f"><span>Origen (automático)</span><div class="ro">${c ? pillO(c.origen) : '—'}</div></div>
        <label class="f full"><span>Nombre del programa</span><input class="in" id="xn" value="${esc(e.nombre || '')}" placeholder="Ej. Liderazgo para mandos medios"></label>
        <label class="f"><span>Fecha de envío</span><input class="in" type="date" id="xf" value="${e.fecha_envio}"></label>
        <label class="f"><span>Tipo de programa</span><select class="in" id="xt"><option value="">Selecciona…</option>${CAT('tipo_programa').map(t => `<option ${e.tipo_programa === t.valor ? 'selected' : ''}>${esc(t.valor)}</option>`).join('')}</select></label>
        <div class="f full"><span>Modalidad (elige una o varias para híbrido)</span><div class="opts" id="xm">${CAT('modalidad').map(m => `<button type="button" class="opt ${e.modalidades.includes(m.valor) ? 'on' : ''}" data-x="${esc(m.valor)}">${esc(m.valor)}</button>`).join('')}</div></div>
        <label class="f"><span>Duración total (horas)</span><input class="in" type="number" min="0" step="0.5" id="xh" value="${e.duracion_horas ?? ''}"></label>
        <div class="f"><span>Estructura</span><div style="display:flex;gap:8px"><select class="in" id="xe">${['Módulos', 'Bloques', 'Sesiones'].map(t => `<option ${e.estructura_tipo === t ? 'selected' : ''}>${t}</option>`).join('')}</select><input class="in" type="number" min="0" max="40" id="xen" value="${e.estructura_num || ''}" style="width:90px" aria-label="Número"></div></div>
        ${e.estructura_num > 0 ? `<div class="f full"><span>Distribución de horas</span><div class="dist">${e.distribucion.map((d, i) => `<div class="dist-r"><input class="in" data-dn="${i}" value="${esc(d.nombre)}"><input class="in" type="number" min="0" step="0.5" data-dh="${i}" value="${d.horas ?? ''}" placeholder="Horas"></div>`).join('')}</div><div class="sub" id="xsum"></div></div>` : ''}
        <label class="f full"><span>Contenido</span><textarea class="in" id="xco" rows="4" placeholder="Temas, objetivos y alcance">${esc(e.contenido || '')}</textarea></label>
        <div class="f full"><span>Adicionales</span><div class="opts" id="xa">${CAT('adicional').map(a => `<button type="button" class="opt ${e.adicionales.includes(a.valor) ? 'on' : ''}" data-x="${esc(a.valor)}">${esc(a.valor)}</button>`).join('')}</div></div>
        <label class="f full"><span>Comentarios</span><textarea class="in" id="xcm">${esc(e.comentarios || '')}</textarea></label>
        <div class="f full"><span>Foto de la propuesta (aparece en Propuestas y Forecast)</span><div class="upl"><div class="upl-prev" id="xprev" style="${S.fotoUrls[e.foto_path] ? `background-image:url('${S.fotoUrls[e.foto_path]}')` : ''}"></div><label class="btn btn-ghost" style="cursor:pointer">${e.foto_path ? 'Cambiar foto' : 'Subir foto'}<input type="file" accept="image/*" id="xfile" hidden></label></div></div>
        <div class="f full"><span>Inversión económica</span><div class="ro">${p && fcDe(p.id) && fcDe(p.id).terminado ? money(resumenFc(p).ingCon) + ' (del forecast)' : 'Pendiente: se llena al terminar el forecast.'}</div></div>
      </div>
      <div class="foot">${p ? '<button class="btn btn-danger left" id="xdel">Eliminar</button>' : ''}<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-dark" id="xok">Guardar propuesta</button></div>`);
    const keep = () => { e.cuenta_id = $('#xc').value; e.nombre = $('#xn').value; e.fecha_envio = $('#xf').value; e.tipo_programa = $('#xt').value; e.duracion_horas = $('#xh').value === '' ? null : num($('#xh').value);
      e.estructura_tipo = $('#xe').value; e.contenido = $('#xco').value; e.comentarios = $('#xcm').value;
      e.modalidades = $$('#xm .opt.on').map(b => b.dataset.x); e.adicionales = $$('#xa .opt.on').map(b => b.dataset.x);
      $$('[data-dn]').forEach(i => { e.distribucion[+i.dataset.dn].nombre = i.value; }); $$('[data-dh]').forEach(i => { e.distribucion[+i.dataset.dh].horas = i.value === '' ? null : num(i.value); }); };
    const suma = () => { const s = e.distribucion.reduce((a, d) => a + num(d.horas), 0); const el = $('#xsum'); if (el) el.textContent = `Asignadas ${s} de ${num($('#xh').value)} horas${num($('#xh').value) && s !== num($('#xh').value) ? ' · revisa que cuadren' : ''}`; };
    $('#xc').onchange = () => { keep(); draw(); };
    $$('#xm .opt, #xa .opt').forEach(b => b.onclick = () => b.classList.toggle('on'));
    $('#xen').onchange = () => { keep(); const n = Math.max(0, Math.min(40, Math.round(num($('#xen').value)))); const base = e.estructura_tipo.replace(/s$/, '').replace(/e$/, '') ; const lab = e.estructura_tipo === 'Módulos' ? 'Módulo' : e.estructura_tipo === 'Bloques' ? 'Bloque' : 'Sesión';
      e.estructura_num = n; e.distribucion = Array.from({ length: n }, (_, i) => e.distribucion[i] || { nombre: `${lab} ${i + 1}`, horas: null }); draw(); };
    $$('[data-dh]').forEach(i => i.oninput = () => { keep(); suma(); }); $('#xh').oninput = suma; suma();
    $('#xfile').onchange = async ev => { const f = ev.target.files[0]; if (!f) return; foto = await comprimir(f); $('#xprev').style.backgroundImage = `url('${URL.createObjectURL(foto)}')`; toast('Foto lista; se guarda con la propuesta.'); };
    if (p) $('#xdel').onclick = async () => {
      if (!confirm('¿Eliminar esta propuesta, su forecast y sus datos?')) return;
      if (await handle(await sb.from('propuestas').delete().eq('id', p.id), 'Propuesta eliminada')) {
        if (p.foto_path) await sb.storage.from('fotos').remove([p.foto_path]);
        const f = fcDe(p.id); S.propuestas = S.propuestas.filter(x => x.id !== p.id); if (f) { S.forecasts = S.forecasts.filter(x => x.id !== f.id); S.fgrupos = S.fgrupos.filter(x => x.forecast_id !== f.id); S.fegresos = S.fegresos.filter(x => x.forecast_id !== f.id); }
        closeSheet(); render();
      }
    };
    $('#xok').onclick = async () => {
      keep();
      if (!e.cuenta_id) { toast('Selecciona el prospecto o cliente.'); return; }
      if (!e.nombre.trim()) { toast('Escribe el nombre del programa.'); return; }
      $('#xok').disabled = true;
      const row = { cuenta_id: e.cuenta_id, nombre: e.nombre.trim(), fecha_envio: e.fecha_envio, tipo_programa: e.tipo_programa || null, modalidades: e.modalidades, duracion_horas: e.duracion_horas,
        estructura_tipo: e.estructura_tipo, estructura_num: e.estructura_num || null, distribucion: e.distribucion, contenido: e.contenido || null, adicionales: e.adicionales, comentarios: e.comentarios || null };
      let data = await handle(p ? await sb.from('propuestas').update(row).eq('id', p.id).select().single() : await sb.from('propuestas').insert(row).select().single());
      if (!data) { $('#xok').disabled = false; return; }
      if (foto) {
        const path = `${uid()}/propuestas/${data.id}-${Date.now()}.jpg`;
        const up = await sb.storage.from('fotos').upload(path, foto, { contentType: 'image/jpeg', upsert: true });
        if (up.error) toast('La propuesta se guardó, pero la foto no se pudo subir.');
        else { if (data.foto_path) await sb.storage.from('fotos').remove([data.foto_path]); const d2 = await handle(await sb.from('propuestas').update({ foto_path: path }).eq('id', data.id).select().single()); if (d2) data = d2; }
      }
      if (p) Object.assign(p, data); else { S.propuestas.push(data); if (!p) { const s = await handle(await sb.from('seguimientos').insert({ cuenta_id: data.cuenta_id, propuesta_id: data.id, fecha: data.fecha_envio, medio: 'Correo', nota: `Se envía propuesta: ${data.nombre}.`, fase_comercial: 'Se envía propuesta' }).select().single()); if (s) S.seguimientos.push(s); } }
      toast(p ? 'Propuesta actualizada' : 'Propuesta guardada. Se registró en los seguimientos de la cuenta.');
      closeSheet(); render();
    };
  };
  draw();
}

async function propuestaDetalle(id) {
  const p = S.propuestas.find(x => x.id === id); if (!p) return;
  await urlsFotos([p.foto_path]);
  const c = cuenta(p.cuenta_id) || {}, f = fcDe(p.id), r = resumenFc(p), url = S.fotoUrls[p.foto_path];
  const segs = S.seguimientos.filter(s => s.propuesta_id === id).sort((a, b) => b.fecha.localeCompare(a.fecha));
  openSheet(`${head(esc(p.nombre))}
    ${url ? `<div class="banner" style="background-image:url('${url}')"></div>` : ''}
    <div class="tc-top" style="margin:8px 0">${pillO(c.origen || 'Exponencial')}${p.tipo_programa ? `<span class="pill">${esc(p.tipo_programa)}</span>` : ''}${pillF('fase_comercial', p.fase_comercial)}</div>
    <div class="dl"><div><small>Contacto</small><b>${esc(nombre(c))}</b></div><div><small>Empresa</small><b>${empDot(c.empresa_id)}</b></div><div><small>Fecha de envío</small><b>${fdShort(p.fecha_envio)}</b></div>
      <div><small>Modalidad</small><b>${esc(p.modalidades.join(' + ') || '—')}</b></div><div><small>Duración</small><b>${p.duracion_horas ? p.duracion_horas + ' horas' : '—'}</b></div><div><small>Estructura</small><b>${p.estructura_num ? p.estructura_num + ' ' + esc(p.estructura_tipo.toLowerCase()) : '—'}</b></div>
      <div><small>Adicionales</small><b>${esc(p.adicionales.join(', ') || 'Ninguno')}</b></div><div><small>Inversión</small><b>${f && f.terminado ? money(r.ingCon) : 'Pendiente de forecast'}</b></div></div>
    ${p.distribucion.length ? `<div class="hl">Distribución de horas</div><div class="rows">${p.distribucion.map(d => `<div class="row"><span class="t">${esc(d.nombre)}</span><span class="r">${d.horas ?? '—'} h</span></div>`).join('')}</div>` : ''}
    ${p.contenido ? `<div class="hl">Contenido</div><p class="pre">${esc(p.contenido)}</p>` : ''}
    ${p.comentarios ? `<div class="hl">Comentarios</div><p class="pre">${esc(p.comentarios)}</p>` : ''}
    <div class="hl">Seguimientos de esta propuesta</div>${segs.length ? `<div class="tl">${segs.map(s => `<div class="tl-i"><div class="tl-d">${fdShort(s.fecha)}</div><div><div class="t">${esc(s.medio || '')} ${s.fase_comercial ? pillF('fase_comercial', s.fase_comercial) : ''}</div><div class="s">${esc(s.nota)}</div></div></div>`).join('')}</div>` : '<div class="empty">Sin seguimientos.</div>'}
    <div class="foot"><button class="btn btn-ghost left" id="ddel2" style="display:none"></button><button class="btn btn-ghost" id="dEdit2">Editar</button><button class="btn btn-ghost" id="dSeg2">Registrar seguimiento</button><button class="btn btn-dark" id="dFc">${f ? (f.terminado ? 'Ver forecast' : 'Continuar forecast') : 'Llenar forecast'}</button></div>`);
  $('#dEdit2').onclick = () => propuestaForm(p);
  $('#dSeg2').onclick = () => seguimientoForm(c, p.id);
  $('#dFc').onclick = () => forecastEditor(p.id);
}

/* ---------- Forecast ---------- */
async function renderForecast() {
  $('#app').innerHTML = shell('Forecast');
  const list = S.propuestas.filter(p => { const f = fcDe(p.id); const est = !f ? 'Sin iniciar' : f.terminado ? 'Terminado' : 'En captura'; return !F.fEstado || est === F.fEstado; }).sort((a, b) => b.fecha_envio.localeCompare(a.fecha_envio));
  await urlsFotos(list.map(p => p.foto_path));
  $('#view').innerHTML = `<div class="toolbar"><div class="seg" id="fe">${['', 'Sin iniciar', 'En captura', 'Terminado'].map(k => `<button data-x="${k}" class="${F.fEstado === k ? 'on' : ''}">${k || 'Todos'}</button>`).join('')}</div></div>
    ${!S.propuestas.length ? '<div class="empty">El forecast se llena desde cada propuesta. Crea primero una propuesta.</div>' : !list.length ? '<div class="empty">No hay forecasts en este estado.</div>' : `<div class="gal">${list.map(p => {
      const c = cuenta(p.cuenta_id) || {}, f = fcDe(p.id), r = resumenFc(p), url = S.fotoUrls[p.foto_path], o = c.origen || 'Exponencial';
      const est = !f ? ['Sin iniciar', 'imp'] : f.terminado ? ['Terminado', 'today'] : ['En captura', ''];
      const ok = r && r.rent >= meta();
      return `<button class="gcard" data-fc="${p.id}"><div class="cover ${url ? 'img' : ''}" style="${url ? `background-image:url('${url}')` : `--o:${ORIG[o][0]}`}">${pillO(o)}<span class="pill ${est[1]}">${est[0]}</span></div>
        <div class="gbody"><div class="t">${esc(p.nombre)}</div><div class="s">${esc(nombre(c))} · ${empDot(c.empresa_id)}</div>
        <div class="fc-mini"><div><small>Total con IVA</small><b>${r && r.ingCon ? money(r.ingCon) : 'Por calcular'}</b></div><span class="pill ${r && r.ingCon ? (ok ? 'ok' : 'late') : ''}">${r && r.ingCon ? r.rent.toFixed(1) + '%' : '—'}</span></div>
        <div class="bar"><i style="width:${r && r.ingCon ? Math.max(0, Math.min(100, r.rent)) : 0}%;background:${ok ? 'var(--good)' : 'var(--bad)'}"></i><span style="left:${meta()}%"></span></div>
        <div class="gmeta"><span>Meta ${meta()}%</span><span>${f && f.terminado ? 'Enviado por correo' : 'Pendiente'}</span></div></div></button>`; }).join('')}</div>`}`;
  bindShell();
  $$('#fe button').forEach(b => b.onclick = () => { F.fEstado = b.dataset.x; renderForecast(); });
  $$('[data-fc]').forEach(b => b.onclick = () => forecastEditor(b.dataset.fc));
}

const CATS = [
  ['Profesores', 'Profesor', 'Puesto (facilitador, co facilitador)', 'Precio por hora', 'Horas'],
  ['Coordinación', 'Coordinador', 'Rol', 'Precio por grupo', 'Grupos a coordinar'],
  ['Viáticos', 'Concepto (transporte, hospedaje, comidas)', 'Grupo o sede', 'Monto', 'Cantidad'],
  ['Plataforma', 'Concepto', 'Detalle', 'Precio', 'Cantidad'],
  ['Aval ICCN', 'Concepto', 'Detalle', 'Precio', 'Cantidad'],
  ['Otro', 'Concepto', 'Detalle', 'Precio', 'Cantidad']
];
async function forecastEditor(pid) {
  const p = S.propuestas.find(x => x.id === pid); if (!p) return;
  const c = cuenta(p.cuenta_id) || {}, prev = fcDe(pid);
  const st = {
    fc: prev ? { ...prev } : { propuesta_id: pid, modo_precio: 'persona_sin_iva', personas: null, precio_capturado: null, kam_nombre: '', kam_porcentaje: c.origen === 'UVM' ? 1 : 5, terminado: false },
    grupos: prev ? S.fgrupos.filter(g => g.forecast_id === prev.id).sort((a, b) => a.orden - b.orden).map(g => ({ ...g })) : [],
    egresos: prev ? S.fegresos.filter(e => e.forecast_id === prev.id).sort((a, b) => a.orden - b.orden).map(e => ({ ...e })) : []
  };
  const ro = !!st.fc.terminado, dis = ro ? 'disabled' : '';
  const per = (v, d) => d ? money(v / d, 2) : '—';
  const kpisHtml = r => { const okM = r.rent >= meta(); const kpi = (l, v, cls = '') => `<div class="k ${cls}"><small>${l}</small><b>${v}</b></div>`;
    return `${kpi('Ingreso con IVA', money(r.ingCon, 2), 'dark')}${kpi('Ingreso sin IVA', money(r.ingSin, 2))}${kpi('IVA', money(r.iva, 2))}${kpi('Gastos totales', money(r.egr, 2))}${kpi('Utilidad', money(r.util, 2))}
      <div class="k"><small>Rentabilidad · meta ${meta()}%</small><b style="color:${r.ingCon ? (okM ? 'var(--good)' : 'var(--bad)') : 'inherit'}">${r.ingCon ? r.rent.toFixed(1) + '%' : '—'}</b><div class="bar"><i style="width:${Math.max(0, Math.min(100, r.rent))}%;background:${okM ? 'var(--good)' : 'var(--bad)'}"></i><span style="left:${meta()}%"></span></div></div>`; };
  const ppHtml = r => { const sumG = st.grupos.reduce((a, g) => a + num(g.personas), 0);
    return `Precio por persona: ${money(r.ppSin, 2)} sin IVA · ${money(r.ppCon, 2)} con IVA.${sumG && sumG !== num(st.fc.personas) ? ` <b style="color:var(--bad)">Los grupos suman ${sumG} personas.</b> ${ro ? '' : '<button class="link" id="fuse" type="button">Usar la suma</button>'}` : ''}`; };
  const desgHtml = r => `<thead><tr><th>Categoría</th><th>Monto</th><th>% del ingreso</th><th>% del gasto</th><th>Por hora</th><th>Por alumno</th><th>Por sesión</th><th>Por grupo</th></tr></thead><tbody>
    ${[...CATS.map(x => x[0]), 'KAM'].filter(k => r.cats[k]).map(k => `<tr><td><b>${k}</b></td><td>${money(r.cats[k], 2)}</td><td>${r.ingCon ? (r.cats[k] / r.ingCon * 100).toFixed(1) : 0}%</td><td>${r.egr ? (r.cats[k] / r.egr * 100).toFixed(1) : 0}%</td><td>${per(r.cats[k], r.horas)}</td><td>${per(r.cats[k], r.per)}</td><td>${per(r.cats[k], r.sesiones)}</td><td>${per(r.cats[k], r.grupos)}</td></tr>`).join('') || '<tr><td colspan="8" class="sub">Agrega egresos para ver el desglose.</td></tr>'}
    ${r.egr ? `<tr class="tot"><td>Total</td><td>${money(r.egr, 2)}</td><td>${r.ingCon ? (r.egr / r.ingCon * 100).toFixed(1) : 0}%</td><td>100%</td><td>${per(r.egr, r.horas)}</td><td>${per(r.egr, r.per)}</td><td>${per(r.egr, r.sesiones)}</td><td>${per(r.egr, r.grupos)}</td></tr>` : ''}</tbody>`;
  const sync = () => {
    if (ro) return;
    st.fc.personas = $('#fp').value === '' ? null : Math.round(num($('#fp').value)); st.fc.precio_capturado = $('#fpc').value === '' ? null : num($('#fpc').value);
    st.fc.kam_nombre = $('#kn2').value; st.fc.kam_porcentaje = num($('#kp2').value);
    $$('[data-g]').forEach(i => { const g = st.grupos[+i.dataset.g]; g[i.dataset.k] = i.dataset.k === 'personas' ? Math.round(num(i.value)) : (i.value || null); });
    $$('[data-e]').forEach(i => { const e = st.egresos[+i.dataset.e]; e[i.dataset.k] = ['precio', 'cantidad'].includes(i.dataset.k) ? num(i.value) : i.value; });
  };
  // Actualiza cifras sin redibujar los campos (no se pierde lo que se escribe)
  const update = () => {
    sync(); const r = calc(st.fc, st.grupos, st.egresos, p);
    $('#fk').innerHTML = kpisHtml(r); $('#fpp').innerHTML = ppHtml(r); bindFuse();
    st.egresos.forEach((e, i) => { const el = $(`[data-cost="${i}"]`); if (el) el.textContent = money(num(e.precio) * num(e.cantidad), 2); });
    st.grupos.forEach((g, i) => { const a = $(`[data-gs="${i}"]`), b = $(`[data-gc="${i}"]`); if (a) a.textContent = money(num(g.personas) * r.ppSin, 2); if (b) b.textContent = money(num(g.personas) * r.ppCon, 2); });
    const sumG = st.grupos.reduce((a, g) => a + num(g.personas), 0);
    if ($('#gtot')) $('#gtot').innerHTML = `<td>Total</td><td></td><td></td><td>${sumG}</td><td>${money(sumG * r.ppSin, 2)}</td><td>${money(sumG * r.ppCon, 2)}</td><td></td>`;
    CATS.forEach(([cat]) => { const el = $(`[data-ctot="${cat}"]`); const t = r.cats[cat] || 0; if (el) el.innerHTML = `<b>${money(t, 2)}</b> · ${r.egr ? (t / r.egr * 100).toFixed(1) : 0}% del gasto`; });
    $('#kamv').innerHTML = `<b>${money(r.kam, 2)}</b>`; $('#kamb').textContent = `Base: ingreso ${r.o === 'UVM' ? 'sin IVA (UVM)' : 'con IVA (Exponencial)'} de ${money(r.kamBase, 2)}.`;
    $('#fdes').innerHTML = desgHtml(r);
  };
  const bindFuse = () => { const f = $('#fuse'); if (f) f.onclick = () => { sync(); st.fc.personas = st.grupos.reduce((a, g) => a + num(g.personas), 0); $('#fp').value = st.fc.personas; update(); }; };
  const draw = () => {
    const y = $('#sheet').classList.contains('on') ? $('#sheet').scrollTop : 0;
    const r = calc(st.fc, st.grupos, st.egresos, p), sumG = st.grupos.reduce((a, g) => a + num(g.personas), 0);
    openSheet(`${head('Forecast · ' + esc(p.nombre))}
      <div class="tc-top">${pillO(r.o)}<span class="pill">${esc(nombre(c))} · ${esc(empNombre(c.empresa_id))}</span>${ro ? '<span class="pill today">Terminado</span>' : '<span class="pill imp">En captura</span>'}</div>
      <div class="kpis" id="fk">${kpisHtml(r)}</div>
      <section class="fsec"><h3>Ingresos</h3>
        <div class="seg" id="fm">${[['persona_sin_iva', 'Precio por persona sin IVA'], ['persona_con_iva', 'Precio por persona con IVA'], ['total_con_iva', 'Total del programa con IVA']].map(([k, l]) => `<button type="button" data-x="${k}" class="${st.fc.modo_precio === k ? 'on' : ''}" ${dis}>${l}</button>`).join('')}</div>
        <div class="fgrid"><label class="f"><span>Número de personas</span><input class="in" type="number" min="0" id="fp" value="${st.fc.personas ?? ''}" ${dis}></label>
          <label class="f"><span>${st.fc.modo_precio === 'total_con_iva' ? 'Total con IVA' : st.fc.modo_precio === 'persona_con_iva' ? 'Precio por persona con IVA' : 'Precio por persona sin IVA'}</span><input class="in" type="number" min="0" step="0.01" id="fpc" value="${st.fc.precio_capturado ?? ''}" ${dis}></label></div>
        <p class="sub" id="fpp">${ppHtml(r)}</p></section>
      <section class="fsec"><h3>Grupos del programa</h3><p class="sub">Cada sede o grupo con fechas y número de personas.</p>
        ${st.grupos.length ? `<div class="list-wrap"><table class="list ftab"><thead><tr><th>Grupo o sede</th><th>Inicio</th><th>Fin</th><th>Personas</th><th>Total sin IVA</th><th>Total con IVA</th><th></th></tr></thead><tbody>${st.grupos.map((g, i) => `<tr><td><input class="in" data-g="${i}" data-k="nombre" value="${esc(g.nombre)}" ${dis}></td><td><input class="in" type="date" data-g="${i}" data-k="fecha_inicio" value="${g.fecha_inicio || ''}" ${dis}></td><td><input class="in" type="date" data-g="${i}" data-k="fecha_fin" value="${g.fecha_fin || ''}" ${dis}></td><td><input class="in num" type="number" min="0" data-g="${i}" data-k="personas" value="${g.personas ?? ''}" ${dis}></td><td data-gs="${i}">${money(num(g.personas) * r.ppSin, 2)}</td><td data-gc="${i}">${money(num(g.personas) * r.ppCon, 2)}</td><td>${ro ? '' : `<button type="button" class="x-sm" data-gdel="${i}" aria-label="Quitar">×</button>`}</td></tr>`).join('')}<tr class="tot" id="gtot"><td>Total</td><td></td><td></td><td>${sumG}</td><td>${money(sumG * r.ppSin, 2)}</td><td>${money(sumG * r.ppCon, 2)}</td><td></td></tr></tbody></table></div>` : ''}
        ${ro ? '' : '<button type="button" class="btn btn-ghost btn-sm" id="gadd">+ Agregar grupo</button>'}</section>
      ${CATS.map(([cat, l1, l2, l3, l4]) => { const ls = st.egresos.map((e, i) => [e, i]).filter(([e]) => e.categoria === cat); const tot = r.cats[cat] || 0;
        return `<section class="fsec"><div class="card-head" style="margin:0"><h3>${cat}</h3><span class="sub right" data-ctot="${cat}"><b>${money(tot, 2)}</b> · ${r.egr ? (tot / r.egr * 100).toFixed(1) : 0}% del gasto</span></div>
          ${ls.length ? `<div class="list-wrap"><table class="list ftab"><thead><tr><th>${l1}</th><th>${l2}</th>${cat === 'Profesores' ? '<th>Grupo</th>' : ''}<th>${l3}</th><th>${l4}</th><th>Costo</th>${['Profesores', 'Coordinación'].includes(cat) ? '<th>Forma de pago</th>' : ''}<th></th></tr></thead><tbody>${ls.map(([e, i]) => `<tr><td><input class="in" data-e="${i}" data-k="nombre" value="${esc(e.nombre || '')}" ${dis}></td><td><input class="in" data-e="${i}" data-k="rol" value="${esc(e.rol || '')}" ${dis}></td>${cat === 'Profesores' ? `<td><input class="in" data-e="${i}" data-k="grupo" value="${esc(e.grupo || '')}" ${dis}></td>` : ''}<td><input class="in num" type="number" min="0" step="0.01" data-e="${i}" data-k="precio" value="${e.precio ?? ''}" ${dis}></td><td><input class="in num" type="number" min="0" step="0.5" data-e="${i}" data-k="cantidad" value="${e.cantidad ?? ''}" ${dis}></td><td data-cost="${i}">${money(num(e.precio) * num(e.cantidad), 2)}</td>${['Profesores', 'Coordinación'].includes(cat) ? `<td><input class="in" data-e="${i}" data-k="forma_pago" value="${esc(e.forma_pago || '')}" placeholder="Ej. 60 días" ${dis}></td>` : ''}<td>${ro ? '' : `<button type="button" class="x-sm" data-edel="${i}" aria-label="Quitar">×</button>`}</td></tr>`).join('')}</tbody></table></div>` : ''}
          ${ro ? '' : `<button type="button" class="btn btn-ghost btn-sm" data-eadd="${cat}">+ Agregar</button>`}</section>`; }).join('')}
      <section class="fsec"><div class="card-head" style="margin:0"><h3>Comisión KAM</h3><span class="sub right" id="kamv"><b>${money(r.kam, 2)}</b></span></div>
        <div class="fgrid"><label class="f"><span>Nombre del KAM</span><input class="in" id="kn2" value="${esc(st.fc.kam_nombre || '')}" ${dis}></label><label class="f"><span>Porcentaje de comisión</span><input class="in" type="number" min="0" step="0.1" id="kp2" value="${st.fc.kam_porcentaje ?? 0}" ${dis}></label></div>
        <p class="sub" id="kamb">Base: ingreso ${r.o === 'UVM' ? 'sin IVA (UVM)' : 'con IVA (Exponencial)'} de ${money(r.kamBase, 2)}.</p></section>
      <section class="fsec"><h3>Desglose de egresos</h3><div class="list-wrap"><table class="list" id="fdes">${desgHtml(r)}</table></div>
        <p class="sub">Por hora usa la duración de la propuesta (${r.horas || '—'} h); por sesión, su estructura (${r.sesiones || '—'}); por grupo, los grupos capturados.</p></section>
      <div class="foot sticky">${ro ? '<button class="btn btn-line left" id="freopen">Reabrir para editar</button>' : '<button class="btn btn-ghost left" id="fsave">Guardar borrador</button>'}<button class="btn btn-ghost" id="fxls">Descargar Excel</button>${ro ? '' : '<button class="btn btn-dark" id="fdone">Marcar como terminado</button>'}</div>`, true);
    $('#sheet').scrollTop = y;
    $('#fxls').onclick = async () => { sync(); await excel(p, st, true); };
    if (ro) { $('#freopen').onclick = async () => { const f = fcDe(pid); const d = await handle(await sb.from('forecasts').update({ terminado: false, terminado_en: null }).eq('id', f.id).select().single(), 'Forecast reabierto'); if (d) { Object.assign(f, d); forecastEditor(pid); render(); } }; return; }
    $$('#sheet input').forEach(i => i.addEventListener('input', update));
    bindFuse();
    $$('#fm button').forEach(b => b.onclick = () => { sync(); st.fc.modo_precio = b.dataset.x; draw(); });
    $('#gadd').onclick = () => { sync(); st.grupos.push({ nombre: `Grupo ${st.grupos.length + 1}`, personas: 0, orden: st.grupos.length }); draw(); };
    $$('[data-gdel]').forEach(b => b.onclick = () => { sync(); st.grupos.splice(+b.dataset.gdel, 1); draw(); });
    $$('[data-eadd]').forEach(b => b.onclick = () => { sync(); st.egresos.push({ categoria: b.dataset.eadd, nombre: '', rol: '', precio: 0, cantidad: b.dataset.eadd === 'Coordinación' ? Math.max(1, st.grupos.length) : 1, orden: st.egresos.length }); draw(); });
    $$('[data-edel]').forEach(b => b.onclick = () => { sync(); st.egresos.splice(+b.dataset.edel, 1); draw(); });
    $('#fsave').onclick = async () => { sync(); if (await guardar(false)) toast('Borrador guardado'); };
    $('#fdone').onclick = async () => {
      sync(); const r2 = calc(st.fc, st.grupos, st.egresos, p);
      if (!num(st.fc.personas)) { toast('El número de personas es obligatorio.'); return; }
      if (!r2.ingCon) { toast('Captura el precio para calcular el ingreso.'); return; }
      if (!confirm(`¿Marcar como terminado? Total con IVA ${money(r2.ingCon, 2)} · rentabilidad ${r2.rent.toFixed(1)}%. Se enviará el Excel a tu correo.`)) return;
      if (!(await guardar(true))) return;
      toast('Forecast terminado. Enviando el Excel a tu correo…');
      await enviar(p, st);
      forecastEditor(pid);
    };
  };
  const guardar = async terminado => {
    const row = { propuesta_id: pid, modo_precio: st.fc.modo_precio, personas: st.fc.personas, precio_capturado: st.fc.precio_capturado, kam_nombre: st.fc.kam_nombre || null, kam_porcentaje: num(st.fc.kam_porcentaje), terminado, terminado_en: terminado ? new Date().toISOString() : null };
    let f = fcDe(pid);
    const res = f ? await sb.from('forecasts').update(row).eq('id', f.id).select().single() : await sb.from('forecasts').insert(row).select().single();
    const data = await handle(res); if (!data) return false;
    if (f) Object.assign(f, data); else { S.forecasts.push(data); f = data; }
    const d1 = await sb.from('forecast_grupos').delete().eq('forecast_id', f.id), d2 = await sb.from('forecast_egresos').delete().eq('forecast_id', f.id);
    if (d1.error || d2.error) { toast('No se pudieron guardar los grupos o egresos.'); return false; }
    const gs = st.grupos.map((g, i) => ({ forecast_id: f.id, nombre: g.nombre || `Grupo ${i + 1}`, fecha_inicio: g.fecha_inicio || null, fecha_fin: g.fecha_fin || null, personas: Math.round(num(g.personas)), orden: i }));
    const es = st.egresos.map((e, i) => ({ forecast_id: f.id, categoria: e.categoria, nombre: e.nombre || null, rol: e.rol || null, grupo: e.grupo || null, precio: num(e.precio), cantidad: num(e.cantidad), forma_pago: e.forma_pago || null, orden: i }));
    const ig = gs.length ? await sb.from('forecast_grupos').insert(gs).select() : { data: [] }, ie = es.length ? await sb.from('forecast_egresos').insert(es).select() : { data: [] };
    if (ig.error || ie.error) { toast('No se pudieron guardar los grupos o egresos.'); return false; }
    S.fgrupos = S.fgrupos.filter(g => g.forecast_id !== f.id).concat(ig.data || []); S.fegresos = S.fegresos.filter(e => e.forecast_id !== f.id).concat(ie.data || []);
    render(); return true;
  };
  draw();
}
function forecastEditorReload(pid) { forecastEditor(pid); }

/* ---------- Excel y correo del forecast ---------- */
async function cargarXLSX() {
  if (window.XLSX) return window.XLSX;
  await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  return window.XLSX;
}
function libro(XLSX, p, st) {
  const c = cuenta(p.cuenta_id) || {}, r = calc(st.fc, st.grupos, st.egresos, p), wb = XLSX.utils.book_new();
  const res = [['Forecast · ' + p.nombre], ['Cliente', nombre(c), 'Empresa', empNombre(c.empresa_id)], ['Origen', r.o, 'Fecha de envío', p.fecha_envio], [],
    ['Concepto', 'Monto'], ['Número de personas', r.per], ['Precio por persona sin IVA', +r.ppSin.toFixed(2)], ['Precio por persona con IVA', +r.ppCon.toFixed(2)],
    ['Ingreso con IVA', +r.ingCon.toFixed(2)], ['Ingreso sin IVA', +r.ingSin.toFixed(2)], ['IVA', +r.iva.toFixed(2)], ['Gastos totales', +r.egr.toFixed(2)],
    ['Utilidad', +r.util.toFixed(2)], ['Rentabilidad (%)', +r.rent.toFixed(2)], ['Meta de rentabilidad (%)', meta()]];
  const s1 = XLSX.utils.aoa_to_sheet(res); s1['!cols'] = [{ wch: 30 }, { wch: 22 }, { wch: 16 }, { wch: 28 }]; XLSX.utils.book_append_sheet(wb, s1, 'Resumen');
  const gr = [['Grupo o sede', 'Inicio', 'Fin', 'Personas', 'Total sin IVA', 'Total con IVA'], ...st.grupos.map(g => [g.nombre, g.fecha_inicio || '', g.fecha_fin || '', num(g.personas), +(num(g.personas) * r.ppSin).toFixed(2), +(num(g.personas) * r.ppCon).toFixed(2)])];
  const s2 = XLSX.utils.aoa_to_sheet(gr); s2['!cols'] = [{ wch: 26 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 16 }]; XLSX.utils.book_append_sheet(wb, s2, 'Grupos');
  const eg = [['Categoría', 'Nombre o concepto', 'Rol o detalle', 'Grupo', 'Precio', 'Cantidad', 'Costo', 'Forma de pago'], ...st.egresos.map(e => [e.categoria, e.nombre || '', e.rol || '', e.grupo || '', num(e.precio), num(e.cantidad), +(num(e.precio) * num(e.cantidad)).toFixed(2), e.forma_pago || '']),
    ['KAM', st.fc.kam_nombre || '', `${num(st.fc.kam_porcentaje)}% sobre ingreso ${r.o === 'UVM' ? 'sin IVA' : 'con IVA'}`, '', +r.kamBase.toFixed(2), num(st.fc.kam_porcentaje) / 100, +r.kam.toFixed(2), '']];
  const s3 = XLSX.utils.aoa_to_sheet(eg); s3['!cols'] = [{ wch: 14 }, { wch: 28 }, { wch: 26 }, { wch: 16 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 16 }]; XLSX.utils.book_append_sheet(wb, s3, 'Egresos');
  const per = (v, d) => d ? +(v / d).toFixed(2) : '';
  const de = [['Categoría', 'Monto', '% del ingreso', '% del gasto', 'Por hora', 'Por alumno', 'Por sesión', 'Por grupo'], ...[...CATS.map(x => x[0]), 'KAM'].filter(k => r.cats[k]).map(k => [k, +r.cats[k].toFixed(2), r.ingCon ? +(r.cats[k] / r.ingCon * 100).toFixed(2) : 0, r.egr ? +(r.cats[k] / r.egr * 100).toFixed(2) : 0, per(r.cats[k], r.horas), per(r.cats[k], r.per), per(r.cats[k], r.sesiones), per(r.cats[k], r.grupos)]),
    ['Total', +r.egr.toFixed(2), r.ingCon ? +(r.egr / r.ingCon * 100).toFixed(2) : 0, 100, per(r.egr, r.horas), per(r.egr, r.per), per(r.egr, r.sesiones), per(r.egr, r.grupos)]];
  const s4 = XLSX.utils.aoa_to_sheet(de); s4['!cols'] = [{ wch: 14 }, { wch: 14 }, { wch: 13 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }]; XLSX.utils.book_append_sheet(wb, s4, 'Desglose');
  return { wb, r };
}
const archivo = p => `Forecast_${p.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '')}.xlsx`;
async function excel(p, st, descargar) {
  try { const XLSX = await cargarXLSX(); const { wb } = libro(XLSX, p, st); if (descargar) XLSX.writeFile(wb, archivo(p)); return XLSX.write(wb, { bookType: 'xlsx', type: 'base64' }); }
  catch (e) { console.error(e); toast('No se pudo generar el Excel.'); return null; }
}
async function enviar(p, st) {
  const b64 = await excel(p, st, false); if (!b64) return;
  const c = cuenta(p.cuenta_id) || {}, r = calc(st.fc, st.grupos, st.egresos, p);
  const { data, error } = await sb.functions.invoke('notificaciones', { body: { accion: 'forecast', propuesta: p.nombre, cliente: nombre(c), empresa: empNombre(c.empresa_id), origen: r.o,
    personas: r.per, ingreso_con_iva: r.ingCon, ingreso_sin_iva: r.ingSin, iva: r.iva, egresos: r.egr, utilidad: r.util, rentabilidad: r.rent, meta: meta(), archivo: archivo(p), adjunto: b64 } });
  if (error || !data?.ok) { console.error(error || data); toast('El forecast quedó terminado, pero el correo no se envió. Descarga el Excel desde aquí.'); }
  else toast('Forecast terminado y Excel enviado a tu correo.');
}

/* ---------- Registro ---------- */
Object.assign(VIEWS, { cuen: renderCuentas, prop: renderPropuestas, fore: renderForecast });
X.b2b = { cuentaDetalle, propuestaDetalle, forecastEditor, calc, resumenFc };
})();
