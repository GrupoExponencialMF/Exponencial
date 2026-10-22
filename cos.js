/* =====================================================================
   Exponencial · Chief of Staff
   Dashboard, proyectos interárea, encargos de Dirección, juntas y
   acuerdos, salud de áreas, y tarjetas de resumen en Inicio
   ===================================================================== */
(() => {
'use strict';
const X = window.EXP, B = X.b2b;
const { sb, S, $, $$, esc, svg, toast, handle, shell, bindShell, openSheet, closeSheet, head, render, VIEWS, today, addDays, fdShort, bindChoice } = X;
const area = id => S.areas.find(a => a.id === id) || { nombre: 'Sin área', color: '#8A8A86' };
const apill = id => { const a = area(id); return `<span class="fpill" style="--c:${esc(a.color)}"><i></i>${esc(a.nombre)}</span>`; };
const RITMO = { Semanal: 7, Quincenal: 14, Mensual: 30 };
function estadoAc(a) { if (a.cumplido) return 'Cumplido'; const t = today(); if (a.fecha_compromiso < t) return 'Vencido'; if (a.fecha_compromiso <= addDays(t, 3)) return 'En riesgo'; return 'En tiempo'; }
const EST = { Vencido: 'late', 'En riesgo': 'imp', 'En tiempo': '', Cumplido: 'ok' };
const chipAc = a => `<span class="pill ${EST[estadoAc(a)]}">${estadoAc(a)} · ${fdShort(a.fecha_compromiso)}</span>`;
function cumplimiento(areaId) {
  const xs = S.acuerdos.filter(a => (!areaId || a.area_id === areaId) && (a.cumplido || a.fecha_compromiso <= today()));
  return xs.length ? Math.round(xs.filter(a => a.cumplido).length / xs.length * 100) : null;
}
function salud(ar) {
  const venc = S.acuerdos.filter(a => a.area_id === ar.id && estadoAc(a) === 'Vencido').length, c = cumplimiento(ar.id);
  if (venc) return ['Rojo', 'var(--bad)', `${venc} acuerdo(s) vencido(s)`];
  if (c !== null && c < 80) return ['Amarillo', 'var(--warn)', `Cumplimiento de ${c}%`];
  return ['Verde', 'var(--good)', c === null ? 'Sin acuerdos con fecha vencida' : `Cumplimiento de ${c}%`];
}
function proximaJunta(ar) { const js = S.juntas.filter(j => j.area_id === ar.id).sort((a, b) => b.fecha.localeCompare(a.fecha)); return js.length ? addDays(js[0].fecha, RITMO[ar.ritmo] || 30) : null; }
const encargos = () => S.pendientes.filter(p => p.es_encargo_dg);
const hitosDe = id => S.hitos.filter(h => h.interarea_id === id).sort((a, b) => a.fecha.localeCompare(b.fecha));
const avIA = id => { const hs = hitosDe(id); return hs.length ? Math.round(hs.filter(h => h.cumplido).length / hs.length * 100) : 0; };

/* ---------- Dashboard ---------- */
function renderDash() {
  $('#app').innerHTML = shell('Chief of Staff', `<button class="btn btn-ghost" id="cres">Enviarme resumen</button><button class="btn btn-ghost" id="cjun">Registrar junta</button><button class="btn btn-dark" id="cenc">${svg('plus')}Nuevo encargo</button>`);
  const c = cumplimiento(), enc = encargos().filter(p => p.estatus !== 'Terminado'), venc = S.acuerdos.filter(a => estadoAc(a) === 'Vencido'), ries = S.acuerdos.filter(a => estadoAc(a) === 'En riesgo');
  const proximas = S.areas.map(a => ({ a, f: proximaJunta(a) })).filter(x => x.f).sort((x, y) => x.f.localeCompare(y.f));
  const atn = [...venc, ...ries].sort((a, b) => a.fecha_compromiso.localeCompare(b.fecha_compromiso));
  const ia = S.interarea.filter(x => x.estatus === 'Activo');
  $('#view').innerHTML = `<div class="kpis" style="grid-template-columns:repeat(5,minmax(0,1fr))"><div class="k dark"><small>Cumplimiento de acuerdos</small><b>${c === null ? '—' : c + '%'}</b></div><div class="k"><small>Encargos de Dirección abiertos</small><b>${enc.length}</b></div><div class="k"><small>Acuerdos vencidos</small><b style="color:${venc.length ? 'var(--bad)' : 'inherit'}">${venc.length}</b></div><div class="k"><small>En riesgo (3 días)</small><b style="color:${ries.length ? 'var(--warn)' : 'inherit'}">${ries.length}</b></div><div class="k"><small>Próxima junta</small><b>${proximas[0] ? fdShort(proximas[0].f) + ' · ' + esc(proximas[0].a.nombre) : '—'}</b></div></div>
    <section class="card"><div class="card-head"><h3>Salud de áreas</h3><button class="btn btn-ghost btn-sm right" style="margin:0" data-go="salud">Ver detalle</button></div><div class="health">${S.areas.slice().sort((a, b) => a.orden - b.orden).map(a => { const [s, col, txt] = salud(a); return `<div class="hc" style="--c:${col}"><div class="hc-h"><i></i><b>${esc(a.nombre)}</b></div><div class="hc-n">${cumplimiento(a.id) ?? '—'}${cumplimiento(a.id) === null ? '' : '%'}</div><small>${esc(txt)}</small></div>`; }).join('')}</div></section>
    <div class="dgrid2">
      <section class="card"><h3>Acuerdos que requieren atención</h3>${atn.length ? `<div class="rows">${atn.map(a => `<div class="row"><button class="check" data-cum="${a.id}" aria-label="Marcar como cumplido"></button><div class="row-main"><div class="t">${esc(a.que)}</div><div class="s">${esc(a.responsable || '')}</div></div><span class="r">${apill(a.area_id)}${chipAc(a)}</span></div>`).join('')}</div>` : '<div class="empty">Ningún acuerdo vencido o en riesgo.</div>'}</section>
      <section class="card"><div class="card-head"><h3>Encargos de Dirección General</h3><button class="btn btn-ghost btn-sm right" style="margin:0" data-go="enc">Ver todos</button></div>${enc.length ? `<div class="rows">${enc.sort((a, b) => a.fecha_limite.localeCompare(b.fecha_limite)).slice(0, 6).map(p => `<div class="row"><button class="row-main" data-pen="${p.id}"><div class="t">${esc(p.titulo)}</div><div class="s">${esc(p.entregable || p.estatus)}</div></button><span class="r">${X.dueChip(p)}</span></div>`).join('')}</div>` : '<div class="empty">Sin encargos abiertos.</div>'}</section>
    </div>
    <section class="card"><div class="card-head"><h3>Proyectos interárea activos</h3><button class="btn btn-ghost btn-sm right" style="margin:0" data-go="inter">Ver todos</button></div>${ia.length ? `<div class="rows">${ia.map(x => { const sig = hitosDe(x.id).find(h => !h.cumplido); return `<div class="row"><button class="row-main" data-ia="${x.id}"><div class="t">${esc(x.nombre)}</div><div class="s">Lidera ${esc(area(x.area_lider).nombre)}${sig ? ` · próximo hito: ${esc(sig.titulo)} (${fdShort(sig.fecha)})` : ''}</div><div class="bar"><i style="width:${avIA(x.id)}%;background:${esc(area(x.area_lider).color)}"></i></div></button><span class="r"><b>${avIA(x.id)}%</b></span></div>`; }).join('')}</div>` : '<div class="empty">Sin proyectos interárea activos.</div>'}</section>`;
  bindShell(); X.bindRows();
  $('#cenc').onclick = nuevoEncargo; $('#cjun').onclick = () => juntaForm(); $('#cres').onclick = () => X.pedirResumen('Chief of Staff');
  $$('[data-cum]').forEach(b => b.onclick = () => cumplir(b.dataset.cum)); $$('[data-ia]').forEach(b => b.onclick = () => iaDetalle(b.dataset.ia));
}
const nuevoEncargo = () => X.pendForm(null, { frente: 'CoS', es_encargo_dg: true, tipo: 'Documento' });
async function cumplir(id) { const a = S.acuerdos.find(x => x.id === id); const val = !a.cumplido; const d = await handle(await sb.from('acuerdos').update({ cumplido: val, cumplido_en: val ? today() : null }).eq('id', id).select().single(), val ? 'Acuerdo cumplido' : 'Acuerdo reabierto'); if (d) { Object.assign(a, d); render(); } }

/* ---------- Encargos de Dirección ---------- */
function renderEnc() {
  $('#app').innerHTML = shell('Encargos de Dirección General', `<button class="btn btn-dark" id="cenc">${svg('plus')}Nuevo encargo</button>`);
  const xs = encargos().sort((a, b) => (a.estatus === 'Terminado') - (b.estatus === 'Terminado') || a.fecha_limite.localeCompare(b.fecha_limite));
  $('#view').innerHTML = xs.length ? `<div class="list-wrap"><table class="list"><thead><tr><th></th><th>Encargo</th><th>Entregable</th><th>Solicitado</th><th>Compromiso</th><th>Estatus</th></tr></thead><tbody>${xs.map(p => `<tr><td><button class="check ${p.estatus === 'Terminado' ? 'on' : ''}" data-done="${p.id}" aria-label="Terminar"></button></td><td><button class="row-main" data-pen="${p.id}"><b class="${p.estatus === 'Terminado' ? 'struck' : ''}">${esc(p.titulo)}</b></button></td><td>${esc(p.entregable || '—')}</td><td>${p.fecha_solicitud ? fdShort(p.fecha_solicitud) : '—'}</td><td>${X.dueChip(p)}</td><td><span class="pill">${esc(p.estatus)}</span></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Sin encargos. Regístralos aquí; también aparecen en tus Pendientes con la etiqueta Chief of Staff.</div>';
  bindShell(); X.bindRows(); $('#cenc').onclick = nuevoEncargo;
}

/* ---------- Juntas y acuerdos ---------- */
const FJ = { area: '', est: '' };
function renderJuntas() {
  $('#app').innerHTML = shell('Juntas y acuerdos', `<button class="btn btn-dark" id="cjun">${svg('plus')}Registrar junta</button>`);
  const ac = S.acuerdos.filter(a => (!FJ.area || a.area_id === FJ.area) && (!FJ.est || estadoAc(a) === FJ.est)).sort((a, b) => (a.cumplido - b.cumplido) || a.fecha_compromiso.localeCompare(b.fecha_compromiso));
  const js = S.juntas.filter(j => !FJ.area || j.area_id === FJ.area).sort((a, b) => b.fecha.localeCompare(a.fecha));
  $('#view').innerHTML = `<div class="toolbar"><select class="in sel" id="ja"><option value="">Área: todas</option>${S.areas.map(a => `<option value="${a.id}" ${FJ.area === a.id ? 'selected' : ''}>${esc(a.nombre)}</option>`).join('')}</select>
      <div class="seg" id="je">${['', 'Vencido', 'En riesgo', 'En tiempo', 'Cumplido'].map(k => `<button data-x="${k}" class="${FJ.est === k ? 'on' : ''}">${k || 'Todos'}</button>`).join('')}</div></div>
    <section class="card"><h3>Acuerdos · ${ac.length}</h3>${ac.length ? `<div class="rows">${ac.map(a => `<div class="row"><button class="check ${a.cumplido ? 'on' : ''}" data-cum="${a.id}" aria-label="Cumplido"></button><button class="row-main" data-ac="${a.id}"><div class="t ${a.cumplido ? 'struck' : ''}">${esc(a.que)}</div><div class="s">${esc(a.responsable || 'Sin responsable')}</div></button><span class="r">${apill(a.area_id)}${chipAc(a)}</span></div>`).join('')}</div>` : '<div class="empty">Sin acuerdos con estos filtros.</div>'}</section>
    <section class="card"><h3>Juntas registradas · ${js.length}</h3>${js.length ? `<div class="tl">${js.map(j => `<div class="tl-i"><div class="tl-d">${fdShort(j.fecha)}</div><div><div class="t">${apill(j.area_id)} ${S.acuerdos.filter(a => a.junta_id === j.id).length} acuerdo(s)</div>${j.notas ? `<div class="s">${esc(j.notas)}</div>` : ''}</div></div>`).join('')}</div>` : '<div class="empty">Registra tu primera junta con sus acuerdos.</div>'}</section>`;
  bindShell();
  $('#cjun').onclick = () => juntaForm(); $('#ja').onchange = e => { FJ.area = e.target.value; renderJuntas(); };
  $$('#je button').forEach(b => b.onclick = () => { FJ.est = b.dataset.x; renderJuntas(); });
  $$('[data-cum]').forEach(b => b.onclick = () => cumplir(b.dataset.cum)); $$('[data-ac]').forEach(b => b.onclick = () => acuerdoForm(b.dataset.ac));
}
function juntaForm(areaId) {
  if (!S.areas.length) { toast('Primero configura las áreas en Salud de áreas.'); return; }
  let filas = [{ que: '', responsable: '', fecha: addDays(today(), 7) }];
  const draw = () => {
    const keep = $('#jn2') ? { a: $('#jar').value, f: $('#jf2').value, n: $('#jn2').value } : { a: areaId || S.areas[0].id, f: today(), n: '' };
    openSheet(`${head('Registrar junta')}<div class="fgrid"><label class="f"><span>Área</span><select class="in" id="jar">${S.areas.map(a => `<option value="${a.id}" ${keep.a === a.id ? 'selected' : ''}>${esc(a.nombre)}</option>`).join('')}</select></label><label class="f"><span>Fecha</span><input class="in" type="date" id="jf2" value="${keep.f}"></label>
      <label class="f full"><span>Notas de la junta</span><textarea class="in" id="jn2">${esc(keep.n)}</textarea></label></div>
      <div class="hl">Acuerdos</div><div class="list-wrap"><table class="list ftab"><thead><tr><th>Acuerdo</th><th>Responsable</th><th>Fecha compromiso</th><th></th></tr></thead><tbody>${filas.map((f, i) => `<tr><td><input class="in" data-q="${i}" value="${esc(f.que)}"></td><td><input class="in" data-r="${i}" value="${esc(f.responsable)}"></td><td><input class="in" type="date" data-f="${i}" value="${f.fecha}"></td><td>${filas.length > 1 ? `<button class="x-sm" data-d="${i}">×</button>` : ''}</td></tr>`).join('')}</tbody></table></div>
      <button class="btn btn-ghost btn-sm" id="jadd">+ Agregar acuerdo</button><p class="sub">Cada acuerdo te avisa en su fecha compromiso para verificar que se cumplió.</p>
      <div class="foot"><button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-dark" id="jok2">Guardar junta</button></div>`, true);
    const sync = () => { $$('[data-q]').forEach(i => filas[+i.dataset.q].que = i.value); $$('[data-r]').forEach(i => filas[+i.dataset.r].responsable = i.value); $$('[data-f]').forEach(i => filas[+i.dataset.f].fecha = i.value); };
    $('#jadd').onclick = () => { sync(); filas.push({ que: '', responsable: '', fecha: addDays(today(), 7) }); draw(); };
    $$('[data-d]').forEach(b => b.onclick = () => { sync(); filas.splice(+b.dataset.d, 1); draw(); });
    $('#jok2').onclick = async () => {
      sync(); const area_id = $('#jar').value, validas = filas.filter(f => f.que.trim());
      if (validas.some(f => !f.fecha)) { toast('Cada acuerdo necesita fecha compromiso.'); return; }
      const j = await handle(await sb.from('juntas').insert({ area_id, fecha: $('#jf2').value, notas: $('#jn2').value.trim() || null }).select().single()); if (!j) return; S.juntas.push(j);
      if (validas.length) { const ins = await handle(await sb.from('acuerdos').insert(validas.map(f => ({ junta_id: j.id, area_id, que: f.que.trim(), responsable: f.responsable.trim() || null, fecha_compromiso: f.fecha }))).select()); if (ins) S.acuerdos.push(...ins); }
      toast(`Junta registrada con ${validas.length} acuerdo(s)`); closeSheet(); render();
    };
  };
  draw();
}
function acuerdoForm(id) {
  const a = S.acuerdos.find(x => x.id === id);
  openSheet(`${head('Acuerdo')}<div class="fgrid"><label class="f full"><span>Acuerdo</span><input class="in" id="aq" value="${esc(a.que)}"></label><label class="f"><span>Responsable</span><input class="in" id="ar2" value="${esc(a.responsable || '')}"></label><label class="f"><span>Fecha compromiso</span><input class="in" type="date" id="af2" value="${a.fecha_compromiso}"></label></div>
    <div class="foot"><button class="btn btn-danger left" id="adl">Eliminar</button><button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-dark" id="aok2">Guardar</button></div>`);
  $('#adl').onclick = async () => { if (confirm('¿Eliminar este acuerdo?') && await handle(await sb.from('acuerdos').delete().eq('id', id), 'Acuerdo eliminado')) { S.acuerdos = S.acuerdos.filter(x => x.id !== id); closeSheet(); render(); } };
  $('#aok2').onclick = async () => { const d = await handle(await sb.from('acuerdos').update({ que: $('#aq').value.trim(), responsable: $('#ar2').value.trim() || null, fecha_compromiso: $('#af2').value }).eq('id', id).select().single(), 'Acuerdo actualizado'); if (d) { Object.assign(a, d); closeSheet(); render(); } };
}

/* ---------- Salud de áreas ---------- */
function renderSalud() {
  $('#app').innerHTML = shell('Salud de áreas', `<button class="btn btn-dark" id="anew">${svg('plus')}Agregar área</button>`);
  $('#view').innerHTML = `<div class="gal">${S.areas.slice().sort((a, b) => a.orden - b.orden).map(a => { const [s, col, txt] = salud(a), pj = proximaJunta(a), ab = S.acuerdos.filter(x => x.area_id === a.id && !x.cumplido);
    return `<section class="card" style="border-top:5px solid ${esc(a.color)}"><div class="card-head"><div><h3>${esc(a.nombre)}</h3><div class="sub">${esc(a.lider || 'Responsable por definir')} · juntas ${a.ritmo.toLowerCase()}es</div></div><button class="btn btn-ghost btn-sm right" style="margin:0" data-ae="${a.id}">Editar</button></div>
      <div class="semaforo" style="--c:${col}"><i></i><b>${s}</b><span class="sub">${esc(txt)}</span></div>
      <div class="split"><div><small>Acuerdos abiertos</small><b>${ab.length}</b></div><div><small>Próxima junta</small><b>${pj ? fdShort(pj) : 'Sin registro'}</b></div></div>
      <button class="btn btn-ghost btn-sm" data-aj="${a.id}">Registrar junta</button></section>`; }).join('')}</div>
    <p class="sub">Rojo: hay acuerdos vencidos. Amarillo: cumplimiento menor a 80%. Verde: en orden. La próxima junta se calcula con la última junta registrada y el ritmo del área.</p>`;
  bindShell(); $('#anew').onclick = () => areaForm(); $$('[data-ae]').forEach(b => b.onclick = () => areaForm(S.areas.find(a => a.id === b.dataset.ae))); $$('[data-aj]').forEach(b => b.onclick = () => juntaForm(b.dataset.aj));
}
function areaForm(a) {
  const e = a ? { ...a } : { color: '#3C74D6', ritmo: 'Mensual' };
  openSheet(`${head(a ? 'Editar área' : 'Agregar área')}<div class="fgrid"><label class="f"><span>Área</span><input class="in" id="an2" value="${esc(e.nombre || '')}"></label><label class="f"><span>Responsable</span><input class="in" id="al" value="${esc(e.lider || '')}"></label>
    <div class="f"><span>Ritmo de juntas</span><div class="opts" id="art">${['Semanal', 'Quincenal', 'Mensual'].map(r => `<button type="button" class="opt ${e.ritmo === r ? 'on' : ''}" data-x="${r}">${r}</button>`).join('')}</div></div>
    <label class="f"><span>Color</span><input type="color" id="ac" value="${esc(e.color)}" style="width:60px;height:44px;border:0;background:none"></label></div>
    <div class="foot">${a ? '<button class="btn btn-danger left" id="adl2">Eliminar</button>' : ''}<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-dark" id="aok3">Guardar</button></div>`);
  bindChoice('art');
  if (a) $('#adl2').onclick = async () => { if (!confirm('¿Eliminar el área con sus juntas y acuerdos?')) return; if (await handle(await sb.from('areas').delete().eq('id', a.id), 'Área eliminada')) { S.areas = S.areas.filter(x => x.id !== a.id); S.acuerdos = S.acuerdos.filter(x => x.area_id !== a.id); S.juntas = S.juntas.filter(x => x.area_id !== a.id); closeSheet(); render(); } };
  $('#aok3').onclick = async () => {
    const row = { nombre: $('#an2').value.trim(), lider: $('#al').value.trim() || null, ritmo: X.picked('art'), color: $('#ac').value }; if (!row.nombre) { toast('Escribe el nombre del área.'); return; }
    const d = await handle(a ? await sb.from('areas').update(row).eq('id', a.id).select().single() : await sb.from('areas').insert({ ...row, orden: S.areas.length + 1 }).select().single(), 'Área guardada');
    if (d) { if (a) Object.assign(a, d); else S.areas.push(d); closeSheet(); render(); }
  };
}

/* ---------- Proyectos interárea ---------- */
function renderInter() {
  $('#app').innerHTML = shell('Proyectos interárea', `<button class="btn btn-dark" id="inew">${svg('plus')}Nuevo proyecto interárea</button>`);
  const xs = S.interarea.slice().sort((a, b) => (a.estatus === 'Terminado') - (b.estatus === 'Terminado'));
  $('#view').innerHTML = xs.length ? `<div class="gal">${xs.map(x => { const sig = hitosDe(x.id).find(h => !h.cumplido), l = area(x.area_lider); return `<button class="gcard" data-ia="${x.id}"><div class="cover" style="background:${esc(l.color)}"><span class="pill">Lidera ${esc(l.nombre)}</span>${x.estatus === 'Terminado' ? '<span class="pill">Terminado</span>' : ''}</div>
    <div class="gbody"><div class="t">${esc(x.nombre)}</div><div class="tc-top" style="margin-top:4px">${x.areas.map(apill).join('')}</div><div class="gmeta"><span>${sig ? `Próximo: ${esc(sig.titulo)} · ${fdShort(sig.fecha)}` : 'Sin hitos pendientes'}</span><b>${avIA(x.id)}%</b></div><div class="bar" style="margin-top:4px"><i style="width:${avIA(x.id)}%;background:${esc(l.color)}"></i></div></div></button>`; }).join('')}</div>` : '<div class="empty">Crea proyectos donde varias áreas deben coordinarse, con su plan de hitos por área.</div>';
  bindShell(); $('#inew').onclick = () => iaForm(); $$('[data-ia]').forEach(b => b.onclick = () => iaDetalle(b.dataset.ia));
}
function iaForm(x) {
  const e = x ? { ...x } : { areas: [] };
  openSheet(`${head(x ? 'Editar proyecto interárea' : 'Nuevo proyecto interárea')}<div class="fgrid"><label class="f full"><span>Nombre</span><input class="in" id="in" value="${esc(e.nombre || '')}"></label>
    <label class="f full"><span>Descripción</span><textarea class="in" id="id2">${esc(e.descripcion || '')}</textarea></label>
    <label class="f"><span>Área líder</span><select class="in" id="il">${S.areas.map(a => `<option value="${a.id}" ${e.area_lider === a.id ? 'selected' : ''}>${esc(a.nombre)}</option>`).join('')}</select></label>
    <label class="f"><span>Fecha compromiso</span><input class="in" type="date" id="if" value="${e.fecha_compromiso || ''}"></label>
    <div class="f full"><span>Áreas involucradas</span><div class="opts" id="ias">${S.areas.map(a => `<button type="button" class="opt ${e.areas.includes(a.id) ? 'on' : ''}" data-x="${a.id}">${esc(a.nombre)}</button>`).join('')}</div></div></div>
    <div class="foot">${x ? '<button class="btn btn-danger left" id="idl">Eliminar</button>' : ''}<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-dark" id="iok">Guardar</button></div>`);
  $$('#ias .opt').forEach(b => b.onclick = () => b.classList.toggle('on'));
  if (x) $('#idl').onclick = async () => { if (confirm('¿Eliminar este proyecto y sus hitos?') && await handle(await sb.from('interarea').delete().eq('id', x.id), 'Proyecto eliminado')) { S.interarea = S.interarea.filter(y => y.id !== x.id); S.hitos = S.hitos.filter(h => h.interarea_id !== x.id); closeSheet(); render(); } };
  $('#iok').onclick = async () => {
    const lider = $('#il').value, areas = [...new Set([lider, ...$$('#ias .opt.on').map(b => b.dataset.x)])];
    const row = { nombre: $('#in').value.trim(), descripcion: $('#id2').value.trim() || null, area_lider: lider, areas, fecha_compromiso: $('#if').value || null }; if (!row.nombre) { toast('Escribe el nombre.'); return; }
    const d = await handle(x ? await sb.from('interarea').update(row).eq('id', x.id).select().single() : await sb.from('interarea').insert(row).select().single(), 'Proyecto guardado');
    if (d) { if (x) Object.assign(x, d); else S.interarea.push(d); iaDetalle(d.id); render(); }
  };
}
function iaDetalle(id) {
  const x = S.interarea.find(y => y.id === id); if (!x) return;
  openSheet(`${head(esc(x.nombre))}<div class="tc-top">${apill(x.area_lider)}<span class="pill ${x.estatus === 'Activo' ? 'today' : 'ok'}">${x.estatus}</span>${x.fecha_compromiso ? `<span class="pill">Compromiso ${fdShort(x.fecha_compromiso)}</span>` : ''}<span class="pill">Avance ${avIA(id)}%</span></div>
    ${x.descripcion ? `<p class="pre sub">${esc(x.descripcion)}</p>` : ''}
    <div class="hl">Plan por área</div>${x.areas.map(aid => { const hs = hitosDe(id).filter(h => h.area_id === aid); return `<div class="lane" style="--c:${esc(area(aid).color)}"><div class="lane-h">${apill(aid)}${aid === x.area_lider ? '<span class="pill">Líder</span>' : ''}<span class="sub" style="margin-left:auto">${hs.filter(h => h.cumplido).length}/${hs.length}</span></div>${hs.map(h => `<div class="row"><button class="check ${h.cumplido ? 'on' : ''}" data-hc="${h.id}" aria-label="Cumplido"></button><div class="row-main"><div class="t ${h.cumplido ? 'struck' : ''}">${esc(h.titulo)}</div></div><span class="r"><span class="pill ${!h.cumplido && h.fecha < today() ? 'late' : ''}">${fdShort(h.fecha)}</span><button class="x-sm" data-hd="${h.id}" aria-label="Quitar">×</button></span></div>`).join('')}
      <div class="addh"><input class="in" placeholder="Nuevo hito" data-ht="${aid}"><input class="in" type="date" data-hf="${aid}" value="${addDays(today(), 14)}"><button class="btn btn-ghost btn-sm" style="margin:0" data-ha="${aid}">Agregar</button></div></div>`; }).join('')}
    <div class="foot"><button class="btn btn-ghost" id="iEd">Editar</button><button class="btn btn-dark" id="iEs">${x.estatus === 'Activo' ? 'Marcar como terminado' : 'Reactivar'}</button></div>`, true);
  $$('[data-ha]').forEach(b => b.onclick = async () => { const aid = b.dataset.ha, t = $(`[data-ht="${aid}"]`).value.trim(), f = $(`[data-hf="${aid}"]`).value; if (!t || !f) { toast('Escribe el hito y su fecha.'); return; } const d = await handle(await sb.from('hitos').insert({ interarea_id: id, area_id: aid, titulo: t, fecha: f }).select().single(), 'Hito agregado; te avisaremos en su fecha.'); if (d) { S.hitos.push(d); iaDetalle(id); render(); } });
  $$('[data-hc]').forEach(b => b.onclick = async () => { const h = S.hitos.find(y => y.id === b.dataset.hc); const d = await handle(await sb.from('hitos').update({ cumplido: !h.cumplido }).eq('id', h.id).select().single()); if (d) { Object.assign(h, d); iaDetalle(id); render(); } });
  $$('[data-hd]').forEach(b => b.onclick = async () => { if (await handle(await sb.from('hitos').delete().eq('id', b.dataset.hd), 'Hito eliminado')) { S.hitos = S.hitos.filter(h => h.id !== b.dataset.hd); iaDetalle(id); render(); } });
  $('#iEd').onclick = () => iaForm(x);
  $('#iEs').onclick = async () => { const d = await handle(await sb.from('interarea').update({ estatus: x.estatus === 'Activo' ? 'Terminado' : 'Activo' }).eq('id', id).select().single(), 'Proyecto actualizado'); if (d) { Object.assign(x, d); iaDetalle(id); render(); } };
}

/* ---------- Tarjetas de cada frente en Inicio ---------- */
X.homeExtra = () => {
  try {
    const t = today(), mes = t.slice(0, 7), V = X.ventas, num = B.num;
    const vm = (S.ventas || []).filter(v => v.fecha_venta.slice(0, 7) === mes).reduce((a, v) => a + num(v.total_con_iva), 0);
    const metaM = num(S.ajustes.meta_mensual_exp) + num(S.ajustes.meta_mensual_uvm);
    const cobrarHoy = (S.pagos || []).filter(p => p.estatus !== 'Pagado' && p.fecha_programada <= t).length;
    const c = cumplimiento(), venc = (S.acuerdos || []).filter(a => estadoAc(a) === 'Vencido').length;
    const card = (go, col, tit, big, sub, l1, l2) => `<button class="xcard" data-go="${go}" style="--c:${col}"><div class="x-h"><i></i><b>${tit}</b><span>Abrir ›</span></div><div class="x-big">${big}</div><div class="sub">${sub}</div><div class="x-l"><span>${l1}</span><span>${l2}</span></div></button>`;
    return `<div class="xgrid">${card('b2bd', 'var(--c-b2b)', 'B2B', B.money(vm), `Venta del mes${metaM ? ' · ' + Math.round(vm / metaM * 100) + '% de la meta' : ''}`, `Cobros por atender: <b>${cobrarHoy}</b>`, `Propuestas abiertas: <b>${S.propuestas.filter(p => !['Venta', 'No se concretó'].includes(p.fase_comercial)).length}</b>`)}
      ${card('progs', 'var(--c-b2b)', 'Programas en curso', S.programas.filter(p => p.estatus === 'En curso').length, 'Programas vendidos en operación', `Módulos que inician esta semana: <b>${S.modulos.filter(m => m.inicio && m.inicio >= t && m.inicio <= addDays(t, 6)).length}</b>`, `Ventas por cobrar: <b>${(S.ventas || []).filter(v => X.ventas.estado(v) !== 'Pagado').length}</b>`)}
      ${card('cosd', 'var(--c-cos)', 'Chief of Staff', c === null ? '—' : c + '%', 'Cumplimiento de acuerdos', `Acuerdos vencidos: <b>${venc}</b>`, `Encargos abiertos: <b>${encargos().filter(p => p.estatus !== 'Terminado').length}</b>`)}</div>`;
  } catch (e) { console.error(e); return ''; }
};

Object.assign(VIEWS, { cosd: renderDash, enc: renderEnc, jun: renderJuntas, salud: renderSalud, inter: renderInter });
X.cos = { estadoAc, cumplimiento, salud, proximaJunta };
})();
