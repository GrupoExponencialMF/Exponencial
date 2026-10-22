/* =====================================================================
   Exponencial · Programas en curso (B2B)
   Programas vendidos con sus módulos, cronograma y avisos
   ===================================================================== */
(() => {
'use strict';
const X = window.EXP, B = X.b2b;
const { sb, S, $, $$, esc, svg, toast, handle, shell, bindShell, openSheet, closeSheet, head, render, VIEWS, today, addDays, fdShort, hm, MES, DIA, ESTATUS, bindChoice, picked } = X;
const fotos = async list => B.urlsFotos(list.filter(Boolean));
const PAL = ['#7A4CE0', '#0FA3A3', '#E86A17', '#5145CD', '#2E9E62', '#D94F86', '#D99A12', '#3C74D6'];
/* ---------- Programas en curso ---------- */
function progAvance(p) {
  const ms = S.modulos.filter(m => m.programa_id === p.id).sort((a, b) => (a.inicio || '').localeCompare(b.inicio || '')), t = today();
  if (!ms.length) return { pct: 0, txt: 'Sin módulos', ms };
  const hechos = ms.filter(m => m.fin && m.fin < t).length, cur = ms.find(m => m.inicio && m.inicio <= t && (!m.fin || m.fin >= t)), sig = ms.find(m => m.inicio && m.inicio > t);
  return { pct: Math.round(hechos / ms.length * 100), txt: cur ? `En curso: ${cur.nombre}` : sig ? `Próximo: ${sig.nombre} · ${fdShort(sig.inicio)}` : hechos === ms.length ? 'Todos los módulos concluidos' : '', ms };
}
async function renderProgramas() {
  $('#app').innerHTML = shell('Programas en curso', `<button class="btn btn-dark" id="pgn">${svg('plus')}Nuevo programa</button>`);
  await fotos(S.programas.map(p => p.foto_path));
  const list = S.programas.slice().sort((a, b) => (a.estatus === 'Terminado') - (b.estatus === 'Terminado'));
  $('#view').innerHTML = list.length ? `<div class="gal">${list.map(p => { const pr = progAvance(p), url = S.fotoUrls[p.foto_path], ms = pr.ms; return `<button class="gcard" data-pg="${p.id}"><div class="cover ${url ? 'img' : ''}" style="${url ? `background-image:url('${url}')` : `background:${esc(p.color)}`}">${p.cliente ? `<span class="pill">${esc(p.cliente)}</span>` : ''}<span class="pill">${ms.length} módulos</span>${p.estatus === 'Terminado' ? '<span class="pill">Terminado</span>' : ''}</div>
    <div class="gbody"><div class="t">${esc(p.nombre)}</div><div class="s">${ms.length && ms[0].inicio ? `${fdShort(ms[0].inicio)} – ${fdShort(ms[ms.length - 1].fin || ms[ms.length - 1].inicio)}` : 'Sin fechas'}</div><div class="gmeta"><span>${esc(pr.txt)}</span><b>${pr.pct}%</b></div><div class="bar" style="margin-top:4px"><i style="width:${pr.pct}%;background:${esc(p.color)}"></i></div></div></button>`; }).join('')}</div>` : '<div class="empty">Aún no hay programas. Se crean desde una venta ("Convertir en programa") o con "Nuevo programa".</div>';
  bindShell(); $('#pgn').onclick = () => programaForm(); $$('[data-pg]').forEach(b => b.onclick = () => programaDetalle(b.dataset.pg));
}
function programaForm(p, preset) {
  const e = p ? { ...p } : { color: PAL[(S.programas.length + 2) % PAL.length], ...(preset || {}) };
  let mods = p ? S.modulos.filter(m => m.programa_id === p.id).sort((a, b) => a.orden - b.orden).map(m => ({ ...m })) : [];
  let foto = null;
  const draw = () => {
    openSheet(`${head(p ? 'Editar programa' : 'Nuevo programa')}${e.venta_id ? '<p class="sub">Ligado a la venta; sus módulos generan avisos de inicio y fin.</p>' : ''}
      <div class="fgrid"><label class="f full"><span>Nombre del programa</span><input class="in" id="gn" value="${esc(e.nombre || '')}"></label><label class="f"><span>Cliente</span><input class="in" id="gc" value="${esc(e.cliente || '')}"></label>
        <label class="f"><span>Horas totales</span><input class="in" type="number" min="0" id="gh" value="${e.horas ?? ''}"></label><label class="f"><span>Grupos</span><input class="in" type="number" min="0" id="gg" value="${e.grupos ?? ''}"></label>
        <div class="f"><span>Color</span><div class="sws">${PAL.map(c => `<button type="button" class="sw ${e.color === c ? 'on' : ''}" data-c="${c}" style="background:${c}" aria-label="Color"></button>`).join('')}</div></div>
        <div class="f full"><span>Foto del programa</span><div class="upl"><div class="upl-prev" id="gprev" style="${S.fotoUrls[e.foto_path] ? `background-image:url('${S.fotoUrls[e.foto_path]}')` : ''}"></div><label class="btn btn-ghost" style="cursor:pointer">Subir foto<input type="file" accept="image/*" id="gfile" hidden></label></div></div></div>
      <div class="hl">Módulos</div>${mods.length ? `<div class="list-wrap"><table class="list ftab"><thead><tr><th>Módulo</th><th>Inicio</th><th>Fin</th><th>Profesor</th><th></th></tr></thead><tbody>${mods.map((m, i) => `<tr><td><input class="in" data-m="${i}" data-k="nombre" value="${esc(m.nombre)}"></td><td><input class="in" type="date" data-m="${i}" data-k="inicio" value="${m.inicio || ''}"></td><td><input class="in" type="date" data-m="${i}" data-k="fin" value="${m.fin || ''}"></td><td><input class="in" data-m="${i}" data-k="profesor" value="${esc(m.profesor || '')}"></td><td><button class="x-sm" data-md="${i}">×</button></td></tr>`).join('')}</tbody></table></div>` : ''}
      <button class="btn btn-ghost btn-sm" id="madd">+ Agregar módulo</button>
      <div class="foot">${p ? '<button class="btn btn-danger left" id="gdel">Eliminar</button>' : ''}<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-dark" id="gok">Guardar</button></div>`);
    const sync = () => { e.nombre = $('#gn').value; e.cliente = $('#gc').value; e.horas = $('#gh').value; e.grupos = $('#gg').value; $$('[data-m]').forEach(i => mods[+i.dataset.m][i.dataset.k] = i.value || null); };
    $$('.sw').forEach(b => b.onclick = () => { e.color = b.dataset.c; $$('.sw').forEach(x => x.classList.toggle('on', x === b)); });
    $('#gfile').onchange = async ev => { const f = ev.target.files[0]; if (!f) return; foto = await B.comprimir(f); $('#gprev').style.backgroundImage = `url('${URL.createObjectURL(foto)}')`; };
    $('#madd').onclick = () => { sync(); const last = mods[mods.length - 1]; mods.push({ nombre: `Módulo ${mods.length + 1}`, inicio: last && last.fin ? addDays(last.fin, 1) : null, fin: null }); draw(); };
    $$('[data-md]').forEach(b => b.onclick = () => { sync(); mods.splice(+b.dataset.md, 1); draw(); });
    if (p) $('#gdel').onclick = async () => { if (!confirm('¿Eliminar este programa y sus módulos?')) return; if (await handle(await sb.from('programas').delete().eq('id', p.id), 'Programa eliminado')) { S.programas = S.programas.filter(x => x.id !== p.id); S.modulos = S.modulos.filter(m => m.programa_id !== p.id); closeSheet(); render(); } };
    $('#gok').onclick = async () => {
      sync(); if (!e.nombre.trim()) { toast('Escribe el nombre del programa.'); return; }
      const row = { nombre: e.nombre.trim(), cliente: e.cliente || null, horas: e.horas === '' || e.horas == null ? null : Number(e.horas), grupos: e.grupos === '' || e.grupos == null ? null : Number(e.grupos), color: e.color, venta_id: e.venta_id || null };
      let d = await handle(p ? await sb.from('programas').update(row).eq('id', p.id).select().single() : await sb.from('programas').insert(row).select().single()); if (!d) return;
      if (foto) { const path = `${S.user.id}/programas/${d.id}-${Date.now()}.jpg`; const up = await sb.storage.from('fotos').upload(path, foto, { contentType: 'image/jpeg', upsert: true }); if (!up.error) { const d2 = await handle(await sb.from('programas').update({ foto_path: path }).eq('id', d.id).select().single()); if (d2) d = d2; } }
      await sb.from('modulos').delete().eq('programa_id', d.id);
      const ins = mods.length ? await handle(await sb.from('modulos').insert(mods.map((m, i) => ({ programa_id: d.id, nombre: m.nombre || `Módulo ${i + 1}`, inicio: m.inicio || null, fin: m.fin || null, profesor: m.profesor || null, orden: i }))).select()) : [];
      S.modulos = S.modulos.filter(m => m.programa_id !== d.id).concat(ins || []);
      if (p) Object.assign(p, d); else S.programas.push(d);
      toast(p ? 'Programa actualizado' : 'Programa creado. Te avisaremos al inicio y fin de cada módulo.'); programaDetalle(d.id); render();
    };
  };
  draw();
}
async function programaDetalle(id) {
  const p = S.programas.find(x => x.id === id); if (!p) return; await fotos([p.foto_path]);
  const pr = progAvance(p), ms = pr.ms, url = S.fotoUrls[p.foto_path], t = today();
  const ini0 = ms.map(m => m.inicio).filter(Boolean).sort()[0], fin0 = ms.map(m => m.fin || m.inicio).filter(Boolean).sort().pop();
  const span = ini0 && fin0 ? Math.max(1, (new Date(fin0) - new Date(ini0)) / 864e5 + 1) : 1, pos = d => ((new Date(d) - new Date(ini0)) / 864e5) / span * 100;
  openSheet(`${head(esc(p.nombre))}${url ? `<div class="banner" style="background-image:url('${url}')"></div>` : ''}
    <div class="dl"><div><small>Cliente</small><b>${esc(p.cliente || '—')}</b></div><div><small>Horas</small><b>${p.horas ?? '—'}</b></div><div><small>Grupos</small><b>${p.grupos ?? '—'}</b></div><div><small>Avance</small><b>${pr.pct}%</b></div></div>
    <div class="hl">Cronograma</div>${ms.length && ini0 ? `<div class="gantt">${ms.map(m => `<div class="gn-r"><span>${esc(m.nombre)}</span><div class="gn-t">${m.inicio ? `<i style="left:${pos(m.inicio)}%;width:${Math.max(2, ((new Date(m.fin || m.inicio) - new Date(m.inicio)) / 864e5 + 1) / span * 100)}%;background:${esc(p.color)};opacity:${m.fin && m.fin < t ? .45 : 1}"></i>` : ''}${t >= ini0 && t <= fin0 ? `<b style="left:${pos(t)}%"></b>` : ''}</div></div>`).join('')}</div>` : '<div class="empty">Agrega módulos con fechas para ver el cronograma.</div>'}
    <div class="rows">${ms.map(m => `<div class="row"><div class="row-main"><div class="t">${esc(m.nombre)}</div><div class="s">${m.inicio ? fdShort(m.inicio) : '—'} – ${m.fin ? fdShort(m.fin) : '—'}${m.profesor ? ' · ' + esc(m.profesor) : ''}</div></div></div>`).join('')}</div>
    <div class="foot"><button class="btn btn-ghost" id="gEs">${p.estatus === 'En curso' ? 'Marcar como terminado' : 'Reactivar'}</button><button class="btn btn-dark" id="gEd">Editar programa</button></div>`, true);
  $('#gEd').onclick = () => programaForm(p);
  $('#gEs').onclick = async () => { const d = await handle(await sb.from('programas').update({ estatus: p.estatus === 'En curso' ? 'Terminado' : 'En curso' }).eq('id', id).select().single(), 'Programa actualizado'); if (d) { Object.assign(p, d); programaDetalle(id); render(); } };
}

Object.assign(VIEWS, { progs: renderProgramas });
X.programas = { programaForm, programaDetalle, progAvance };
X.id = { programaForm };
})();
