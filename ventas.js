/* =====================================================================
   Exponencial · Ventas, cobranza, reporte para Finanzas y dashboard B2B
   ===================================================================== */
(() => {
'use strict';
const X = window.EXP, B = X.b2b;
const { sb, S, $, $$, esc, svg, toast, handle, shell, bindShell, openSheet, closeSheet, head, render, VIEWS, today, addDays, fdShort, MES } = X;
const { money, pillO, nombre, cuenta, num, empDot } = B;
const FASES_UVM = ['Cotización recibida', 'Cotización enviada', 'Orden de compra', 'Factura', 'Número de recepción', 'Confirmación de Finanzas'];
const prop = v => S.propuestas.find(p => p.id === v.propuesta_id) || {};
const origen = v => B.origenProp(prop(v));
const pagosDe = v => S.pagos.filter(p => p.venta_id === v.id).sort((a, b) => a.numero - b.numero);
const pagado = v => pagosDe(v).filter(p => p.estatus === 'Pagado').reduce((a, p) => a + num(p.monto), 0);
const vencido = pg => pg.estatus !== 'Pagado' && pg.fecha_programada < today();
function estado(v) {
  const ps = pagosDe(v); if (!ps.length) return 'Pendiente por capturar';
  if (ps.every(p => p.estatus === 'Pagado')) return 'Pagado';
  return ps.some(vencido) ? 'Con pago vencido' : 'En proceso';
}
const EST_CLS = { 'Pendiente por capturar': 'imp', 'En proceso': '', 'Con pago vencido': 'late', 'Pagado': 'ok' };
const F = { o: '', e: '', m: '', vista: 'Galería', mes: today().slice(0, 7), fun: 'Mes' };
const ym = d => (d || '').slice(0, 7);
const mesLabel = k => { const [y, m] = k.split('-'); return `${X.cap(MES[+m - 1])} ${y}`; };

/* ---------- Registrar venta ---------- */
function ventaForm(pid) {
  const p = S.propuestas.find(x => x.id === pid); const r = B.resumenFc(p); const o = B.origenProp(p), total = Math.round(r.ingCon * 100) / 100;
  let modo = 'Una exhibición', filas = [{ fecha: addDays(today(), 30), monto: total }], fv = today(), nu = '';
  const draw = () => {
    if ($('#vf')) { fv = $('#vf').value; nu = $('#vu') ? $('#vu').value : nu; }
    const suma = filas.reduce((a, f) => a + num(f.monto), 0), cuadra = Math.abs(suma - total) < 0.01;
    openSheet(`${head('Registrar venta')}<p class="sub">${esc(p.nombre)} · ${esc(nombre(cuenta(p.cuenta_id) || {}))}. La venta se registra al iniciar la operación, aunque la cobranza llegue después.</p>
      <div class="dl"><div><small>Total con IVA (del forecast)</small><b>${money(total, 2)}</b></div><div><small>Origen</small><b>${pillO(o)}</b></div></div>
      <div class="fgrid"><label class="f"><span>Fecha de venta</span><input class="in" type="date" id="vf" value="${fv}"></label>
        ${o === 'UVM' ? `<label class="f"><span>Nombre que le pone UVM</span><input class="in" id="vu" value="${esc(nu)}" placeholder="Como aparece en la cotización de UVM"></label>` : '<div></div>'}
        <div class="f full"><span>Calendario de pagos</span><div class="opts" id="vm">${['Una exhibición', 'Manual', 'Capturar después'].map(k => `<button type="button" class="opt ${modo === k ? 'on' : ''}" data-x="${k}">${k}</button>`).join('')}</div></div></div>
      ${modo === 'Capturar después' ? '<p class="sub">La venta quedará como "Pendiente por capturar" hasta que definas sus pagos.</p>' : `<div class="list-wrap" style="margin-top:12px"><table class="list ftab"><thead><tr><th>Pago</th><th>Fecha programada</th><th>Monto con IVA</th><th></th></tr></thead><tbody>${filas.map((f, i) => `<tr><td>${i + 1}</td><td><input class="in" type="date" data-pf="${i}" value="${f.fecha}"></td><td><input class="in num" type="number" step="0.01" data-pm="${i}" value="${f.monto}" ${modo === 'Una exhibición' ? 'disabled' : ''}></td><td>${modo === 'Manual' && filas.length > 1 ? `<button class="x-sm" data-pd="${i}" aria-label="Quitar">×</button>` : ''}</td></tr>`).join('')}</tbody></table></div>
      ${modo === 'Manual' ? `<button class="btn btn-ghost btn-sm" id="padd">+ Agregar pago</button>` : ''}<p class="sub" id="vsum" style="color:${cuadra ? 'var(--good)' : 'var(--bad)'}">Suma ${money(suma, 2)} de ${money(total, 2)}${cuadra ? ' · cuadra' : ' · debe cuadrar con el total'}</p>`}
      <div class="foot"><button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-dark" id="vok">Registrar venta</button></div>`);
    const sync = () => { $$('[data-pf]').forEach(i => filas[+i.dataset.pf].fecha = i.value); $$('[data-pm]').forEach(i => filas[+i.dataset.pm].monto = num(i.value)); };
    $$('#vm .opt').forEach(b => b.onclick = () => { sync(); modo = b.dataset.x; if (modo === 'Una exhibición') filas = [{ fecha: filas[0]?.fecha || today(), monto: total }]; draw(); });
    $$('[data-pm]').forEach(i => i.oninput = () => { sync(); const s = filas.reduce((a, f) => a + num(f.monto), 0), ok = Math.abs(s - total) < 0.01; $('#vsum').textContent = `Suma ${money(s, 2)} de ${money(total, 2)}${ok ? ' · cuadra' : ' · debe cuadrar con el total'}`; $('#vsum').style.color = ok ? 'var(--good)' : 'var(--bad)'; });
    if ($('#padd')) $('#padd').onclick = () => { sync(); filas.push({ fecha: addDays(filas[filas.length - 1].fecha, 30), monto: 0 }); draw(); };
    $$('[data-pd]').forEach(b => b.onclick = () => { sync(); filas.splice(+b.dataset.pd, 1); draw(); });
    $('#vok').onclick = async () => {
      sync();
      if (modo !== 'Capturar después') { if (filas.some(f => !f.fecha)) { toast('Cada pago necesita fecha.'); return; } if (Math.abs(filas.reduce((a, f) => a + num(f.monto), 0) - total) >= 0.01) { toast('La suma de los pagos debe cuadrar con el total.'); return; } }
      $('#vok').disabled = true;
      const v = await handle(await sb.from('ventas').insert({ propuesta_id: pid, fecha_venta: $('#vf').value, total_con_iva: total, nombre_uvm: $('#vu') ? ($('#vu').value.trim() || null) : null, calendario: modo === 'Capturar después' ? 'Pendiente' : modo }).select().single());
      if (!v) { $('#vok').disabled = false; return; }
      S.ventas.push(v);
      if (modo !== 'Capturar después') { const ps = await handle(await sb.from('pagos').insert(filas.map((f, i) => ({ venta_id: v.id, numero: i + 1, fecha_programada: f.fecha, monto: num(f.monto) }))).select()); if (ps) S.pagos.push(...ps); }
      toast('Venta registrada'); ventaDetalle(v.id); render();
    };
  };
  draw();
}

/* ---------- Detalle de venta y proceso de cobro ---------- */
function ventaDetalle(id) {
  const v = S.ventas.find(x => x.id === id); if (!v) return;
  const p = prop(v), c = cuenta(p.cuenta_id) || {}, o = origen(v), ps = pagosDe(v), est = estado(v), bit = S.ventas_bitacora.filter(b => b.venta_id === id).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const pagoHtml = pg => {
    const cab = `<div class="pg-h"><b>Pago ${pg.numero}</b><span class="sub">${fdShort(pg.fecha_programada)} · ${money(pg.monto, 2)}</span><span class="pill ${pg.estatus === 'Pagado' ? 'ok' : vencido(pg) ? 'late' : ''}" style="margin-left:auto">${pg.estatus === 'Pagado' ? 'Pagado ' + (pg.fecha_confirmacion ? fdShort(pg.fecha_confirmacion) : '') : vencido(pg) ? 'Vencido' : 'Pendiente'}</span></div>`;
    const nota = `<label class="f" style="margin-top:8px"><span>Estatus para Finanzas</span><input class="in" data-nf="${pg.id}" value="${esc(pg.nota_finanzas || '')}" placeholder="Ej. Se espera el pago el 23 de octubre"></label>`;
    if (o === 'UVM') {
      const ff = pg.fechas_fase || {};
      return `<div class="pago">${cab}<div class="fases">${FASES_UVM.map((f, i) => `<div class="fz ${pg.fase > i ? 'on' : ''}"><i></i><span>${f}</span><small>${ff[i + 1] ? fdShort(ff[i + 1]) : ''}</small></div>`).join('')}</div>
        <div class="fgrid three"><label class="f"><span>No. de OC</span><input class="in" data-pn="oc" data-id="${pg.id}" value="${esc(pg.oc || '')}"></label><label class="f"><span>No. de factura</span><input class="in" data-pn="factura" data-id="${pg.id}" value="${esc(pg.factura || '')}"></label><label class="f"><span>No. de recepción</span><input class="in" data-pn="recepcion" data-id="${pg.id}" value="${esc(pg.recepcion || '')}"></label></div>
        ${nota}${pg.fase < 6 ? `<div class="pg-act"><button class="btn btn-dark btn-sm" data-adv="${pg.id}">Avanzar a: ${FASES_UVM[pg.fase]}</button>${pg.fase > 0 ? `<button class="btn btn-ghost btn-sm" data-back="${pg.id}">Regresar fase</button>` : ''}</div>` : ''}</div>`;
    }
    return `<div class="pago">${cab}<div class="fgrid"><label class="f"><span>No. de factura (opcional)</span><input class="in" data-pn="factura" data-id="${pg.id}" value="${esc(pg.factura || '')}"></label><div></div></div>${nota}
      ${pg.estatus !== 'Pagado' ? `<div class="pg-act"><button class="btn btn-dark btn-sm" data-conf="${pg.id}">Confirmación de Finanzas</button></div>` : `<div class="pg-act"><button class="btn btn-ghost btn-sm" data-unconf="${pg.id}">Revertir a pendiente</button></div>`}</div>`;
  };
  openSheet(`${head(esc(p.nombre))}
    <div class="tc-top">${pillO(o)}<span class="pill ${EST_CLS[est]}">${est}</span></div>
    <div class="dl"><div><small>Cliente</small><b>${esc(nombre(c))}</b></div><div><small>Empresa</small><b>${empDot(c.empresa_id)}</b></div><div><small>Total con IVA</small><b>${money(v.total_con_iva, 2)}</b></div><div><small>Fecha de venta</small><b>${fdShort(v.fecha_venta)}</b></div><div><small>Cobrado</small><b>${money(pagado(v), 2)}</b></div>${o === 'UVM' ? `<div><small>Nombre UVM</small><b>${esc(v.nombre_uvm || '—')}</b></div>` : ''}</div>
    <div class="actions-row"><button class="btn btn-ghost" id="vcal">${ps.length ? 'Editar calendario' : 'Capturar calendario'}</button><button class="btn btn-ghost" id="vmod">Modificar venta</button><button class="btn btn-ghost" id="vprog">Convertir en programa</button></div>
    <div class="hl">Calendario de pagos</div>${ps.length ? ps.map(pagoHtml).join('') : '<div class="empty">Sin calendario. Define si se cobra en una exhibición o en varios pagos.</div>'}
    ${bit.length ? `<div class="hl">Bitácora de cambios</div><div class="tl">${bit.map(b => `<div class="tl-i"><div class="tl-d">${fdShort(b.created_at.slice(0, 10))}</div><div><div class="t">${esc(b.cambio)}</div><div class="s">Motivo: ${esc(b.motivo)}</div></div></div>`).join('')}</div>` : ''}`, true);
  const upd = async (pg, row, msg) => { const d = await handle(await sb.from('pagos').update(row).eq('id', pg.id).select().single(), msg); if (d) Object.assign(pg, d); return d; };
  const pgOf = id2 => S.pagos.find(x => x.id === id2);
  $$('[data-pn]').forEach(i => i.onchange = () => upd(pgOf(i.dataset.id), { [i.dataset.pn]: i.value.trim() || null }, 'Dato guardado'));
  $$('[data-nf]').forEach(i => i.onchange = () => upd(pgOf(i.dataset.nf), { nota_finanzas: i.value.trim() || null }, 'Estatus para Finanzas guardado'));
  $$('[data-adv]').forEach(b => b.onclick = async () => {
    const pg = pgOf(b.dataset.adv), sig = pg.fase + 1;
    const req = { 3: ['oc', 'el número de OC'], 4: ['factura', 'el número de factura'], 5: ['recepcion', 'el número de recepción'] }[sig];
    if (req && !pg[req[0]]) { toast(`Captura ${req[1]} antes de avanzar.`); return; }
    if (sig === 6) return confirmar(pg, () => ventaDetalle(id));
    const ff = { ...(pg.fechas_fase || {}), [sig]: today() };
    if (await upd(pg, { fase: sig, fechas_fase: ff }, `Fase: ${FASES_UVM[sig - 1]}`)) { ventaDetalle(id); render(); }
  });
  $$('[data-back]').forEach(b => b.onclick = async () => { const pg = pgOf(b.dataset.back), ff = { ...(pg.fechas_fase || {}) }; delete ff[pg.fase]; if (await upd(pg, { fase: pg.fase - 1, fechas_fase: ff }, 'Fase regresada')) ventaDetalle(id); });
  $$('[data-conf]').forEach(b => b.onclick = () => confirmar(pgOf(b.dataset.conf), () => ventaDetalle(id)));
  $$('[data-unconf]').forEach(b => b.onclick = async () => { if (confirm('¿Revertir este pago a pendiente?') && await upd(pgOf(b.dataset.unconf), { estatus: 'Pendiente', fecha_confirmacion: null, fase: o === 'UVM' ? 5 : 0 }, 'Pago revertido')) { ventaDetalle(id); render(); } });
  $('#vcal').onclick = () => calendarioForm(v);
  $('#vmod').onclick = () => modificarVenta(v);
  $('#vprog').onclick = () => X.id.programaForm(null, { venta_id: v.id, nombre: p.nombre, cliente: X.empNombre(c.empresa_id) });
}
function confirmar(pg, after) {
  openSheet(`${head('Confirmación de Finanzas')}<p class="sub">Pago ${pg.numero} · ${money(pg.monto, 2)} · programado para el ${fdShort(pg.fecha_programada)}.</p>
    <div class="fgrid"><label class="f"><span>Fecha en que Finanzas confirmó el pago</span><input class="in" type="date" id="cfx" value="${today()}"></label></div>
    <div class="foot"><button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-dark" id="cfok">Marcar como pagado</button></div>`);
  $('#cfok').onclick = async () => {
    const f = $('#cfx').value, v = S.ventas.find(x => x.id === pg.venta_id), uvm = origen(v) === 'UVM';
    const row = { estatus: 'Pagado', fecha_confirmacion: f }; if (uvm) { row.fase = 6; row.fechas_fase = { ...(pg.fechas_fase || {}), 6: f }; }
    const d = await handle(await sb.from('pagos').update(row).eq('id', pg.id).select().single(), `Pago confirmado el ${fdShort(f)}`);
    if (d) { Object.assign(pg, d); render(); after && after(); }
  };
}
function calendarioForm(v) {
  const ps = pagosDe(v); if (ps.some(p => p.estatus === 'Pagado')) { toast('Hay pagos confirmados; usa "Modificar venta" para ajustes con motivo.'); return; }
  let filas = ps.length ? ps.map(p => ({ fecha: p.fecha_programada, monto: num(p.monto) })) : [{ fecha: addDays(today(), 30), monto: num(v.total_con_iva) }];
  const total = num(v.total_con_iva);
  const draw = () => {
    const suma = filas.reduce((a, f) => a + num(f.monto), 0), ok = Math.abs(suma - total) < 0.01;
    openSheet(`${head('Calendario de pagos')}<p class="sub">Total con IVA ${money(total, 2)}.</p>
      <div class="list-wrap"><table class="list ftab"><thead><tr><th>Pago</th><th>Fecha</th><th>Monto</th><th></th></tr></thead><tbody>${filas.map((f, i) => `<tr><td>${i + 1}</td><td><input class="in" type="date" data-pf="${i}" value="${f.fecha}"></td><td><input class="in num" type="number" step="0.01" data-pm="${i}" value="${f.monto}"></td><td>${filas.length > 1 ? `<button class="x-sm" data-pd="${i}">×</button>` : ''}</td></tr>`).join('')}</tbody></table></div>
      <button class="btn btn-ghost btn-sm" id="padd">+ Agregar pago</button><p class="sub" id="vsum" style="color:${ok ? 'var(--good)' : 'var(--bad)'}">Suma ${money(suma, 2)} de ${money(total, 2)}</p>
      <div class="foot"><button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-dark" id="cok">Guardar calendario</button></div>`);
    const sync = () => { $$('[data-pf]').forEach(i => filas[+i.dataset.pf].fecha = i.value); $$('[data-pm]').forEach(i => filas[+i.dataset.pm].monto = num(i.value)); };
    $$('[data-pm]').forEach(i => i.oninput = () => { sync(); const s = filas.reduce((a, f) => a + num(f.monto), 0); $('#vsum').textContent = `Suma ${money(s, 2)} de ${money(total, 2)}`; $('#vsum').style.color = Math.abs(s - total) < 0.01 ? 'var(--good)' : 'var(--bad)'; });
    $('#padd').onclick = () => { sync(); filas.push({ fecha: addDays(filas[filas.length - 1].fecha, 30), monto: 0 }); draw(); };
    $$('[data-pd]').forEach(b => b.onclick = () => { sync(); filas.splice(+b.dataset.pd, 1); draw(); });
    $('#cok').onclick = async () => {
      sync(); if (filas.some(f => !f.fecha)) { toast('Cada pago necesita fecha.'); return; }
      if (Math.abs(filas.reduce((a, f) => a + num(f.monto), 0) - total) >= 0.01) { toast('La suma debe cuadrar con el total.'); return; }
      await sb.from('pagos').delete().eq('venta_id', v.id); S.pagos = S.pagos.filter(p => p.venta_id !== v.id);
      const ins = await handle(await sb.from('pagos').insert(filas.map((f, i) => ({ venta_id: v.id, numero: i + 1, fecha_programada: f.fecha, monto: num(f.monto) }))).select(), 'Calendario guardado');
      if (ins) { S.pagos.push(...ins); const d = await handle(await sb.from('ventas').update({ calendario: filas.length === 1 ? 'Una exhibición' : 'Manual' }).eq('id', v.id).select().single()); if (d) Object.assign(v, d); ventaDetalle(v.id); render(); }
    };
  };
  draw();
}
function modificarVenta(v) {
  openSheet(`${head('Modificar venta')}<p class="sub">Los cambios quedan registrados en la bitácora con su motivo.</p>
    <div class="fgrid"><label class="f"><span>Fecha de venta</span><input class="in" type="date" id="mf" value="${v.fecha_venta}"></label><label class="f"><span>Total con IVA</span><input class="in" type="number" step="0.01" id="mt" value="${v.total_con_iva}"></label>
      ${origen(v) === 'UVM' ? `<label class="f full"><span>Nombre que le pone UVM</span><input class="in" id="mu" value="${esc(v.nombre_uvm || '')}"></label>` : ''}
      <label class="f full"><span>Motivo del cambio</span><textarea class="in" id="mm" placeholder="Obligatorio"></textarea></label></div>
    <div class="foot"><button class="btn btn-danger left" id="mdel">Eliminar venta</button><button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-dark" id="mok">Guardar cambios</button></div>`);
  $('#mok').onclick = async () => {
    const motivo = $('#mm').value.trim(); if (!motivo) { toast('Escribe el motivo del cambio.'); return; }
    const row = { fecha_venta: $('#mf').value, total_con_iva: num($('#mt').value) }; if ($('#mu')) row.nombre_uvm = $('#mu').value.trim() || null;
    const cambios = []; if (row.fecha_venta !== v.fecha_venta) cambios.push(`Fecha de venta: ${fdShort(v.fecha_venta)} → ${fdShort(row.fecha_venta)}`); if (num(row.total_con_iva) !== num(v.total_con_iva)) cambios.push(`Total: ${money(v.total_con_iva, 2)} → ${money(row.total_con_iva, 2)}`); if ('nombre_uvm' in row && (row.nombre_uvm || '') !== (v.nombre_uvm || '')) cambios.push('Nombre UVM actualizado');
    if (!cambios.length) { toast('No hay cambios.'); return; }
    const d = await handle(await sb.from('ventas').update(row).eq('id', v.id).select().single());
    if (!d) return; Object.assign(v, d);
    const b = await handle(await sb.from('ventas_bitacora').insert({ venta_id: v.id, cambio: cambios.join(' · '), motivo }).select().single(), 'Venta modificada');
    if (b) S.ventas_bitacora.push(b);
    if (cambios.some(c => c.startsWith('Total'))) toast('Total modificado: revisa que el calendario de pagos siga cuadrando.');
    ventaDetalle(v.id); render();
  };
  $('#mdel').onclick = async () => {
    if (pagosDe(v).some(p => p.estatus === 'Pagado')) { toast('No se puede eliminar: tiene pagos confirmados.'); return; }
    if (!confirm('¿Eliminar esta venta y su calendario?')) return;
    if (await handle(await sb.from('ventas').delete().eq('id', v.id), 'Venta eliminada')) { S.ventas = S.ventas.filter(x => x.id !== v.id); S.pagos = S.pagos.filter(p => p.venta_id !== v.id); closeSheet(); render(); }
  };
}

/* ---------- Vista de ventas ---------- */
async function renderVentas() {
  $('#app').innerHTML = shell('Ventas', `<button class="btn btn-ghost" id="vconf">Confirmación de Finanzas</button><button class="btn btn-dark" id="vrep">Reporte para Finanzas</button>`);
  const meses = [...new Set(S.ventas.map(v => ym(v.fecha_venta)))].sort().reverse();
  const list = S.ventas.filter(v => (!F.o || origen(v) === F.o) && (!F.e || estado(v) === F.e) && (!F.m || ym(v.fecha_venta) === F.m)).sort((a, b) => b.fecha_venta.localeCompare(a.fecha_venta));
  await B.urlsFotos(list.map(v => prop(v).foto_path));
  const prox = v => pagosDe(v).find(p => p.estatus !== 'Pagado');
  $('#view').innerHTML = `<div class="toolbar"><select class="in sel" id="vo"><option value="">Origen: todos</option>${['Exponencial', 'UVM'].map(o => `<option ${F.o === o ? 'selected' : ''}>${o}</option>`).join('')}</select>
      <select class="in sel" id="ve"><option value="">Estatus: todos</option>${Object.keys(EST_CLS).map(e => `<option ${F.e === e ? 'selected' : ''}>${e}</option>`).join('')}</select>
      <select class="in sel" id="vme"><option value="">Mes de venta: todos</option>${meses.map(m => `<option value="${m}" ${F.m === m ? 'selected' : ''}>${mesLabel(m)}</option>`).join('')}</select>
      <div class="seg right" id="vv">${['Galería', 'Lista'].map(k => `<button data-x="${k}" class="${F.vista === k ? 'on' : ''}">${k}</button>`).join('')}</div></div>
    ${!S.ventas.length ? '<div class="empty">Aún no tienes ventas. Se registran desde una propuesta en fase "Venta" con forecast terminado.</div>' : !list.length ? '<div class="empty">No hay ventas con estos filtros.</div>'
    : F.vista === 'Galería' ? `<div class="gal">${list.map(v => { const p = prop(v), c = cuenta(p.cuenta_id) || {}, o = origen(v), url = S.fotoUrls[p.foto_path], e = estado(v), nx = prox(v);
      return `<button class="gcard" data-v="${v.id}"><div class="cover ${url ? 'img' : ''}" style="${url ? `background-image:url('${url}')` : `--o:${B.ORIG[o][0]}`}">${pillO(o)}<span class="pill ${EST_CLS[e]}">${e}</span></div><div class="gbody"><div class="t">${esc(p.nombre)}</div><div class="s">${empDot(c.empresa_id)} · vendida ${fdShort(v.fecha_venta)}</div>
        <div class="fc-mini"><div><small>Total con IVA</small><b>${money(v.total_con_iva)}</b></div><span class="sub">Cobrado ${money(pagado(v))}</span></div>
        <div class="gmeta"><span>Próximo pago</span><b style="color:${nx && vencido(nx) ? 'var(--bad)' : 'inherit'}">${nx ? `${fdShort(nx.fecha_programada)} · ${money(nx.monto)}` : pagosDe(v).length ? 'Liquidada' : 'Calendario sin definir'}</b></div></div></button>`; }).join('')}</div>`
    : `<div class="list-wrap"><table class="list"><thead><tr><th>Programa</th><th>Empresa</th><th>Origen</th><th>Venta</th><th>Total</th><th>Cobrado</th><th>Próximo pago</th><th>Estatus</th></tr></thead><tbody>${list.map(v => { const p = prop(v), c = cuenta(p.cuenta_id) || {}, nx = prox(v), e = estado(v); return `<tr class="click" data-v="${v.id}"><td><b>${esc(p.nombre)}</b></td><td>${empDot(c.empresa_id)}</td><td>${pillO(origen(v))}</td><td>${fdShort(v.fecha_venta)}</td><td>${money(v.total_con_iva)}</td><td>${money(pagado(v))}</td><td>${nx ? fdShort(nx.fecha_programada) + ' · ' + money(nx.monto) : '—'}</td><td><span class="pill ${EST_CLS[e]}">${e}</span></td></tr>`; }).join('')}</tbody></table></div>`}`;
  bindShell();
  $('#vo').onchange = e => { F.o = e.target.value; renderVentas(); }; $('#ve').onchange = e => { F.e = e.target.value; renderVentas(); }; $('#vme').onchange = e => { F.m = e.target.value; renderVentas(); };
  $$('#vv button').forEach(b => b.onclick = () => { F.vista = b.dataset.x; renderVentas(); });
  $$('[data-v]').forEach(b => b.onclick = () => ventaDetalle(b.dataset.v));
  $('#vrep').onclick = reporte; $('#vconf').onclick = confirmacionMasiva;
}
function confirmacionMasiva() {
  const ps = S.pagos.filter(p => p.estatus !== 'Pagado' && p.fecha_programada <= addDays(today(), 3)).filter(p => { const v = S.ventas.find(x => x.id === p.venta_id); return v && (origen(v) !== 'UVM' || p.recepcion); }).sort((a, b) => a.fecha_programada.localeCompare(b.fecha_programada));
  openSheet(`${head('Confirmación de Finanzas')}<p class="sub">Marca los pagos que Finanzas confirmó. En UVM solo aparecen pagos con número de recepción.</p>
    ${ps.length ? `<div class="fgrid"><label class="f"><span>Fecha de confirmación</span><input class="in" type="date" id="cmf" value="${today()}"></label></div><div class="rows" style="margin-top:10px">${ps.map(p => { const v = S.ventas.find(x => x.id === p.venta_id); return `<label class="row" style="cursor:pointer"><input type="checkbox" data-cm="${p.id}" style="width:20px;height:20px"><div class="row-main"><div class="t">${esc(prop(v).nombre)} · pago ${p.numero}</div><div class="s">${fdShort(p.fecha_programada)} · ${money(p.monto, 2)}</div></div><span class="r">${pillO(origen(v))}</span></label>`; }).join('')}</div>
    <div class="foot"><button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-dark" id="cmok">Confirmar seleccionados</button></div>` : '<div class="empty">No hay pagos pendientes de confirmar.</div>'}`);
  if (!ps.length) return;
  $('#cmok').onclick = async () => {
    const f = $('#cmf').value, sel = $$('[data-cm]:checked').map(i => i.dataset.cm); if (!sel.length) { toast('Selecciona al menos un pago.'); return; }
    for (const id of sel) { const pg = S.pagos.find(x => x.id === id), v = S.ventas.find(x => x.id === pg.venta_id); const row = { estatus: 'Pagado', fecha_confirmacion: f }; if (origen(v) === 'UVM') { row.fase = 6; row.fechas_fase = { ...(pg.fechas_fase || {}), 6: f }; } const d = await handle(await sb.from('pagos').update(row).eq('id', id).select().single()); if (d) Object.assign(pg, d); }
    toast(`${sel.length} pago(s) confirmados`); closeSheet(); render();
  };
}

/* ---------- Reporte para Finanzas ---------- */
const CORTE = () => addDays(today(), 7);
function filasReporte(o) {
  return S.ventas.filter(v => origen(v) === o && pagosDe(v).some(p => p.estatus !== 'Pagado' || ym(p.fecha_confirmacion) === today().slice(0, 7))).map(v => {
    const p = prop(v), c = cuenta(p.cuenta_id) || {}, ps = pagosDe(v), pend = ps.filter(x => x.estatus !== 'Pagado'), nx = pend[0], ref = nx || ps[ps.length - 1] || {};
    const auto = !nx ? 'Pagado' : o === 'UVM' ? (nx.fase ? `${FASES_UVM[nx.fase - 1]} (fase ${nx.fase} de 6)` : 'Proceso sin iniciar') : 'Pendiente de confirmación de Finanzas';
    return { v, p, emp: X.empNombre(c.empresa_id), tot: num(v.total_con_iva), pag: pagado(v), porCobrar: pend.filter(x => x.fecha_programada <= CORTE()).reduce((a, x) => a + num(x.monto), 0), nx, fac: ref.factura, oc: ref.oc, rec: ref.recepcion, st: (nx && nx.nota_finanzas) || auto, late: nx && vencido(nx) };
  });
}
function reporte() {
  const U = filasReporte('UVM'), E = filasReporte('Exponencial'), s = (a, k) => a.reduce((x, r) => x + r[k], 0), mn = n => money(n, 2).replace(' ', '&nbsp;');
  const tbl = (rows, uvm) => `<div class="list-wrap fin"><table class="list"><thead><tr><th>No.</th><th>Empresa</th><th>Programa</th>${uvm ? '<th>Nombre UVM</th>' : ''}<th>Factura</th>${uvm ? '<th>OC</th><th>Recepción</th>' : ''}<th>Total</th><th>Pagado</th><th>Por cobrar</th><th>Saldo</th><th>Próximo pago</th><th>Estatus</th></tr></thead><tbody>${rows.map((r, i) => `<tr class="click" data-v="${r.v.id}"><td>${i + 1}</td><td><b>${esc(r.emp)}</b></td><td>${esc(r.p.nombre)}</td>${uvm ? `<td>${esc(r.v.nombre_uvm || '—')}</td>` : ''}<td>${esc(r.fac || 'Pendiente')}</td>${uvm ? `<td>${esc(r.oc || 'Pendiente')}</td><td>${esc(r.rec || 'Pendiente')}</td>` : ''}<td>${mn(r.tot)}</td><td>${mn(r.pag)}</td><td><b>${mn(r.porCobrar)}</b></td><td>${mn(r.tot - r.pag)}</td><td>${r.nx ? `<span class="pill ${r.late ? 'late' : ''}">${fdShort(r.nx.fecha_programada)}</span>` : '—'}</td><td class="wrapc">${esc(r.st)}</td></tr>`).join('') || `<tr><td colspan="${uvm ? 13 : 10}" class="sub">Sin programas por reportar.</td></tr>`}${rows.length ? `<tr class="tot"><td></td><td colspan="${uvm ? 6 : 3}">Total ${uvm ? 'UVM' : 'Exponencial'}</td><td>${mn(s(rows, 'tot'))}</td><td>${mn(s(rows, 'pag'))}</td><td style="color:var(--bad)">${mn(s(rows, 'porCobrar'))}</td><td>${mn(s(rows, 'tot') - s(rows, 'pag'))}</td><td></td><td></td></tr>` : ''}</tbody></table></div>`;
  const liga = `${location.origin}${location.pathname.replace(/[^/]*$/, '')}reporte.html?t=${S.ajustes.reporte_token || ''}`;
  openSheet(`${head('Reporte de cobranza para Finanzas')}<p class="sub">Corte al ${fdShort(today())}. "Por cobrar" incluye pagos pendientes hasta el ${fdShort(CORTE())}. Cada viernes te llega listo para reenviar.</p>
    <div class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))"><div class="k dark"><small>Por cobrar B2B</small><b>${money(s(U, 'porCobrar') + s(E, 'porCobrar'), 2)}</b></div><div class="k"><small>UVM</small><b>${money(s(U, 'porCobrar'), 2)}</b></div><div class="k"><small>Exponencial</small><b>${money(s(E, 'porCobrar'), 2)}</b></div><div class="k"><small>Vencido</small><b style="color:var(--bad)">${money([...U, ...E].filter(r => r.late).reduce((a, r) => a + num(r.nx.monto), 0), 2)}</b></div></div>
    <div class="hl">UVM</div>${tbl(U, true)}<div class="hl">Exponencial</div>${tbl(E, false)}
    <div class="foot"><button class="btn btn-ghost" id="rl">Copiar liga para Finanzas</button><button class="btn btn-ghost" id="rx">Descargar Excel</button><button class="btn btn-dark" id="rm">Enviarme por correo</button></div>`, true);
  $$('[data-v]').forEach(b => b.onclick = () => ventaDetalle(b.dataset.v));
  $('#rl').onclick = async () => { try { await navigator.clipboard.writeText(liga); toast('Liga copiada. Finanzas verá el reporte siempre actualizado, solo lectura.'); } catch (_) { prompt('Copia esta liga:', liga); } };
  $('#rx').onclick = async () => {
    if (!window.XLSX) await new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; sc.onload = res; sc.onerror = rej; document.head.appendChild(sc); });
    const XL = window.XLSX, wb = XL.utils.book_new();
    const hU = ['No.', 'Empresa', 'Programa', 'Nombre UVM', 'Factura', 'OC', 'Recepción', 'Total', 'Pagado', 'Por cobrar', 'Saldo', 'Próximo pago', 'Estatus'], hE = ['No.', 'Empresa', 'Programa', 'Factura', 'Total', 'Pagado', 'Por cobrar', 'Saldo', 'Próximo pago', 'Estatus'];
    const rU = U.map((r, i) => [i + 1, r.emp, r.p.nombre, r.v.nombre_uvm || '', r.fac || 'Pendiente', r.oc || 'Pendiente', r.rec || 'Pendiente', r.tot, r.pag, r.porCobrar, r.tot - r.pag, r.nx ? r.nx.fecha_programada : '', r.st]);
    const rE = E.map((r, i) => [i + 1, r.emp, r.p.nombre, r.fac || '', r.tot, r.pag, r.porCobrar, r.tot - r.pag, r.nx ? r.nx.fecha_programada : '', r.st]);
    const res = [['Reporte de cobranza B2B · Grupo Exponencial'], [`Corte: ${today()} · Montos con IVA`], [], ['Canal', 'Total', 'Pagado', 'Por cobrar', 'Saldo'], ['UVM', s(U, 'tot'), s(U, 'pag'), s(U, 'porCobrar'), s(U, 'tot') - s(U, 'pag')], ['Exponencial', s(E, 'tot'), s(E, 'pag'), s(E, 'porCobrar'), s(E, 'tot') - s(E, 'pag')], ['Total B2B', s(U, 'tot') + s(E, 'tot'), s(U, 'pag') + s(E, 'pag'), s(U, 'porCobrar') + s(E, 'porCobrar'), s(U, 'tot') + s(E, 'tot') - s(U, 'pag') - s(E, 'pag')]];
    XL.utils.book_append_sheet(wb, XL.utils.aoa_to_sheet(res), 'Resumen'); XL.utils.book_append_sheet(wb, XL.utils.aoa_to_sheet([hU, ...rU]), 'UVM'); XL.utils.book_append_sheet(wb, XL.utils.aoa_to_sheet([hE, ...rE]), 'Exponencial');
    XL.writeFile(wb, `Reporte_cobranza_Finanzas_${today()}.xlsx`);
  };
  $('#rm').onclick = async () => { toast('Enviando…'); const { data, error } = await sb.functions.invoke('notificaciones', { body: { accion: 'reporte_finanzas' } }); toast(error || !data?.ok ? 'No se pudo enviar el reporte.' : 'Reporte enviado a tu correo, listo para reenviar a Finanzas.'); };
}

/* ---------- Dashboard B2B ---------- */
function renderDashB2B() {
  $('#app').innerHTML = shell('Dashboard B2B', `<select class="in sel" id="dm">${Array.from({ length: 12 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; return `<option value="${k}" ${F.mes === k ? 'selected' : ''}>${mesLabel(k)}${i === 0 ? ' · actual' : ''}</option>`; }).join('')}</select><button class="btn btn-ghost" id="dres">Enviarme resumen</button>`);
  const a = S.ajustes, y = F.mes.slice(0, 4);
  const vMes = S.ventas.filter(v => ym(v.fecha_venta) === F.mes), vAno = S.ventas.filter(v => v.fecha_venta.slice(0, 4) === y);
  const sum = (vs, o) => vs.filter(v => !o || origen(v) === o).reduce((x, v) => x + num(v.total_con_iva), 0);
  const metaM = num(a.meta_mensual_exp) + num(a.meta_mensual_uvm), metaA = num(a.meta_anual_exp) + num(a.meta_anual_uvm);
  const pct = (v, m) => m ? Math.round(v / m * 100) : 0;
  const pagosMes = S.pagos.filter(p => ym(p.fecha_programada) === F.mes), cobrado = S.pagos.filter(p => p.estatus === 'Pagado' && ym(p.fecha_confirmacion) === F.mes).reduce((x, p) => x + num(p.monto), 0);
  const programado = pagosMes.reduce((x, p) => x + num(p.monto), 0), vencidoMonto = S.pagos.filter(vencido).reduce((x, p) => x + num(p.monto), 0);
  const props = S.propuestas.filter(p => F.fun === 'Mes' ? ym(p.fecha_envio) === F.mes : p.fecha_envio.slice(0, 4) === y);
  const fases = B.CAT('fase_comercial');
  const rents = S.ventas.map(v => B.resumenFc(prop(v))).filter(r => r && r.ingCon), rentProm = rents.length ? rents.reduce((x, r) => x + r.rent, 0) / rents.length : 0;
  const prox = S.pagos.filter(p => p.estatus !== 'Pagado').sort((p1, p2) => p1.fecha_programada.localeCompare(p2.fecha_programada)).slice(0, 6);
  const canal = (l, o, vs, meta) => { const v = sum(vs, o); return `<div class="chan"><div class="chan-h">${pillO(o)}<span class="sub">${meta ? pct(v, meta) + '% de ' + money(meta) : 'Sin meta'}</span></div><b>${money(v)}</b><div class="bar"><i style="width:${Math.min(100, pct(v, meta))}%;background:${B.ORIG[o][0]}"></i></div></div>`; };
  $('#view').innerHTML = `<div class="dgrid">
    <section class="feature b2b"><div class="sub" style="color:#B4C8D4">Venta de ${mesLabel(F.mes)} · Exponencial + UVM</div><div class="big">${money(sum(vMes))}</div><div class="bar dark"><i style="width:${Math.min(100, pct(sum(vMes), metaM))}%;background:#8DC53E"></i></div><div class="sub" style="color:#B4C8D4">${metaM ? pct(sum(vMes), metaM) + '% de la meta mensual de ' + money(metaM) : 'Define tus metas en Ajustes'}</div>
      <div class="chans">${canal('', 'Exponencial', vMes, num(a.meta_mensual_exp))}${canal('', 'UVM', vMes, num(a.meta_mensual_uvm))}</div></section>
    <section class="card"><h3>Venta anual ${y}</h3><div class="big2">${money(sum(vAno))}</div><div class="bar"><i style="width:${Math.min(100, pct(sum(vAno), metaA))}%;background:var(--c-b2b)"></i></div><p class="sub">${metaA ? pct(sum(vAno), metaA) + '% de la meta anual de ' + money(metaA) : 'Sin meta anual'} · ${vAno.length} venta(s)</p>
      <div class="split"><div><small>Exponencial</small><b>${money(sum(vAno, 'Exponencial'))}</b></div><div><small>UVM</small><b>${money(sum(vAno, 'UVM'))}</b></div></div></section>
    <section class="card"><h3>Cobranza de ${mesLabel(F.mes)}</h3><div class="big2">${money(cobrado)}</div><p class="sub">cobrado de ${money(programado)} programado</p><div class="bar"><i style="width:${programado ? Math.min(100, cobrado / programado * 100) : 0}%;background:var(--good)"></i></div>
      <div class="split"><div><small>Por cobrar del mes</small><b>${money(Math.max(0, programado - pagosMes.filter(p => p.estatus === 'Pagado').reduce((x, p) => x + num(p.monto), 0)))}</b></div><div><small>Vencido total</small><b style="color:var(--bad)">${money(vencidoMonto)}</b></div></div></section>
    <section class="card"><div class="card-head"><h3>Propuestas por fase</h3><div class="seg right" id="dfun">${['Mes', 'Año'].map(k => `<button data-x="${k}" class="${F.fun === k ? 'on' : ''}">${k}</button>`).join('')}</div></div>
      ${['Exponencial', 'UVM'].map(o => { const ps = props.filter(p => B.origenProp(p) === o); const mx = Math.max(1, ...fases.map(f => ps.filter(p => p.fase_comercial === f.valor).length)); return `<div class="fun"><div class="fun-h">${pillO(o)}<span class="sub">${ps.length} propuesta(s)</span></div>${fases.map(f => { const n = ps.filter(p => p.fase_comercial === f.valor).length; return `<div class="fun-r"><span>${esc(f.valor)}</span><div><i style="width:${n / mx * 100}%;background:${esc(f.color || '#8A8A86')}"></i></div><b>${n}</b></div>`; }).join('')}</div>`; }).join('')}</section>
    <section class="card"><h3>Próximos pagos</h3>${prox.length ? `<div class="rows">${prox.map(pg => { const v = S.ventas.find(x => x.id === pg.venta_id); return `<div class="row"><button class="row-main" data-v="${v.id}"><div class="t">${esc(prop(v).nombre)}</div><div class="s">Pago ${pg.numero} · ${money(pg.monto)}</div></button><span class="r"><span class="pill ${vencido(pg) ? 'late' : pg.fecha_programada === today() ? 'today' : ''}">${fdShort(pg.fecha_programada)}</span></span></div>`; }).join('')}</div>` : '<div class="empty">Sin pagos pendientes.</div>'}</section>
    <section class="card"><h3>Indicadores</h3><div class="split" style="margin-top:6px"><div><small>Rentabilidad promedio de ventas</small><b style="color:${rentProm >= num(a.meta_rentabilidad || 60) ? 'var(--good)' : 'var(--bad)'}">${rents.length ? rentProm.toFixed(1) + '%' : '—'}</b></div><div><small>Propuestas abiertas</small><b>${S.propuestas.filter(p => !['Venta', 'No se concretó'].includes(p.fase_comercial)).length}</b></div></div>
      <div class="split"><div><small>Cuentas activas</small><b>${S.cuentas.filter(c => !c.descartada).length}</b></div><div><small>Pendientes B2B abiertos</small><b>${X.allP().filter(p => p.frente === 'B2B' && p.estatus !== 'Terminado').length}</b></div></div></section></div>`;
  bindShell();
  $('#dm').onchange = e => { F.mes = e.target.value; renderDashB2B(); };
  $$('#dfun button').forEach(b => b.onclick = () => { F.fun = b.dataset.x; renderDashB2B(); });
  $$('[data-v]').forEach(b => b.onclick = () => ventaDetalle(b.dataset.v));
  $('#dres').onclick = () => X.pedirResumen('B2B');
}

X.pedirResumen = async frente => { toast('Enviando resumen…'); const { data, error } = await sb.functions.invoke('notificaciones', { body: { accion: 'resumen', frente } }); toast(error || !data?.ok ? 'No se pudo enviar el resumen.' : `Resumen de ${frente} enviado a tu correo.`); };
Object.assign(VIEWS, { vent: renderVentas, b2bd: renderDashB2B });
X.ventas = { ventaForm, ventaDetalle, estado, pagosDe, origen, prop, vencido, FASES_UVM };
})();
