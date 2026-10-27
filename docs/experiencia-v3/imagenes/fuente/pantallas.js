// M4 · Las pantallas de las imágenes de la v3, con LO NECESARIO de cada rol (necesario-por-rol.md, M1):
// ger, sup, oper, jefe, prod, reg y el nivel 3 de P-201B. Una sola fuente para las tres direcciones:
// ?dir=d1|d2|d3&tema=claro|noche&vista=escritorio|telefono[&momentos=1]. Todas las cifras salen de
// window.DEMO (datos/cifras.js, leído del motor). Lo que el motor no calcula dice «sin registro» y
// lleva la marca «falta en el motor».
(function () {
  const q = new URLSearchParams(location.search)
  const dir = q.get('dir') || 'd1', tema = q.get('tema') || 'claro', vista = q.get('vista') || 'escritorio'
  document.documentElement.dataset.dir = dir
  document.documentElement.dataset.tema = tema
  const { n, esc, marca, barra, tendencia, bomba, tanque, linea, medidor, pozo, separador, area, cifra } = window.KIT
  const D = window.DEMO
  const PRIO = { 1: 'alarma', 2: 'atencion', 3: 'aviso' }
  const DIRS = { d1: 'Grafito', d2: 'Consola blanca', d3: 'Sala' }

  // ── Íconos de línea (20 px, trazo 1,6): propios, sin librería ──
  const IC = {
    inicio: '<path d="M3.5 9.5 10 4l6.5 5.5V16a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1Z"/><path d="M8 17v-5h4v5"/>',
    hoy: '<circle cx="10" cy="10" r="6.5"/><path d="M10 6.5V10l2.5 1.5"/>',
    planta: '<circle cx="4.5" cy="10" r="2"/><circle cx="15.5" cy="5" r="2"/><circle cx="15.5" cy="15" r="2"/><path d="M6.5 10h4m0 0V5h3m-3 5v5h3"/>',
    equipos: '<circle cx="9" cy="11" r="5.5"/><path d="M9 5.5h7v3h-3"/>',
    resultados: '<path d="M4 16V9m6 7V4m6 12v-5M3 16.5h14"/>',
    reporte: '<path d="M5.5 3h6l3 3v11h-9Z"/><path d="M11.5 3v3h3M8 10h4M8 13h4"/>',
  }
  const icono = (k, s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[k]}</svg>`

  const franja = f => `<div class="franja" aria-label="Condiciones">
    <span>${marca('alarma', 16)}<b>${f.p1}</b>alarmas</span><span>${marca('atencion', 16)}<b>${f.p2}</b>en atención</span>
    <span>${marca('aviso', 16)}<b>${f.p3}</b>avisos</span><span>${marca('sincom', 16)}<b>${f.sincom}</b>sin comunicación</span></div>`
  const franjaCorta = f => `<div class="franja" aria-label="Condiciones">
    <span>${marca('alarma', 16)}<b>${f.p1}</b></span><span>${marca('atencion', 16)}<b>${f.p2}</b></span>
    <span>${marca('aviso', 16)}<b>${f.p3}</b></span><span>${marca('sincom', 16)}<b>${f.sincom}</b></span>
    <em class="chico" style="font-style:normal;margin-left:auto">datos de las 14:00</em></div>`

  const franjaMini = f => `<div class="franja" aria-label="Condiciones: ${f.p1} alarmas, ${f.p2} en atención, ${f.p3} avisos, ${f.sincom} sin comunicación">
    <span>${marca('alarma', 16)}<b>${f.p1}</b></span><span>${marca('atencion', 16)}<b>${f.p2}</b></span><span>${marca('aviso', 16)}<b>${f.p3}</b></span><span>${marca('sincom', 16)}<b>${f.sincom}</b></span></div>`

  // ── El armazón. Un rol con una sola pantalla no tiene menú (PROMPT §9.4): barra arriba y nada más. ──
  const ROL = {
    ger: { puertas: [['inicio', 'Inicio'], ['resultados', 'Resultados']], activa: 'inicio', persona: ['Andrés Vélez', 'Gerente de activo'], campo: 'Todos mis campos', franja: 'portafolio' },
    sup: { puertas: [['hoy', 'Hoy']], activa: 'hoy', persona: ['Nelson Ortiz', 'Supervisor de operaciones'], campo: 'La Ceiba', franja: 'ceiba' },
    oper: { puertas: [['hoy', 'Hoy']], activa: 'hoy', persona: ['Jairo Peña', 'Operador de campo'], campo: 'La Ceiba', franja: 'ceiba' },
    jefe: { puertas: [['hoy', 'Hoy', 3], ['equipos', 'Equipos']], activa: 'hoy', persona: ['Camilo Rueda', 'Jefe de mantenimiento'], campo: 'La Ceiba', franja: 'ceiba' },
    prod: { puertas: [['hoy', 'Hoy', 2], ['resultados', 'Resultados']], activa: 'hoy', persona: ['Marcela Ríos', 'Ingeniera de producción'], campo: 'La Ceiba', franja: 'ceiba' },
    reg: { puertas: [['reporte', 'Reporte ANH']], activa: 'reporte', persona: ['Iván Salas', 'Cumplimiento regulatorio'], campo: 'La Ceiba', franja: 'ceiba' },
    p201b: { puertas: [['hoy', 'Hoy', 3], ['equipos', 'Equipos']], activa: 'equipos', persona: ['Camilo Rueda', 'Jefe de mantenimiento'], campo: 'La Ceiba', franja: 'ceiba' },
  }
  const iniciales = p => p.split(' ').map(x => x[0]).join('')
  const arriba = r => r.puertas.length < 2 || dir === 'd3'
  function nav(r) {
    const puertas = r.puertas.length < 2 ? '' : r.puertas.map(([k, t, ins]) => `<a class="nav__item${k === r.activa ? ' activo' : ''}">${icono(k)}${t}${ins ? `<span class="insignia">${ins}</span>` : ''}</a>`).join('')
    if (arriba(r)) return `<nav class="nav nav--arriba">
      <div class="nav__marca"><i></i>TRIM</div>${r.puertas.length < 2 ? `<span class="nav__lugar">${esc(r.campo)}</span>` : ''}${puertas}
      <div class="nav__pie">${franja(D.franja[r.franja])}<span class="iniciales" title="${esc(r.persona[0])}">${iniciales(r.persona[0])}</span></div></nav>`
    return `<nav class="nav"><div class="nav__marca"><i></i>TRIM</div>
      <div class="nav__campo">Campo<b>${esc(r.campo)}</b></div>${puertas}
      <div class="nav__pie"><span><b>${esc(r.persona[0])}</b>${esc(r.persona[1])}</span></div></nav>`
  }
  function escritorio(rol, titulo, cuando, cuerpo, estilo = '', der = '') {
    const r = ROL[rol]
    return `<div class="app${arriba(r) ? ' app--arriba' : ''}">${nav(r)}<main class="main">
      <div class="cabeza"><h1>${titulo}</h1><span class="cuando">${cuando}</span><div class="der">${arriba(r) ? '' : franja(D.franja[r.franja])}${der}</div></div>
      <div class="cuerpo" style="${estilo}">${cuerpo}</div></main></div>`
  }
  const telBarra = campo => `<header class="tel__barra"><div class="nav__marca"><i></i>TRIM</div><div class="campo"><b>${esc(campo)}</b> · hoy, 2 de oct</div></header>`
  const telTabs = r => r.puertas.length < 2 ? '' : `<nav class="tel__tabs" style="grid-template-columns:repeat(${r.puertas.length},1fr)">${r.puertas.map(([k, t, ins]) => `<a class="${k === r.activa ? 'activo' : ''}">${icono(k, 22)}${t}${ins ? ` · ${ins}` : ''}</a>`).join('')}</nav>`
  function telefono(rol, cuerpo, accion) {
    const r = ROL[rol]
    return `<div class="tel">${telBarra(r.campo)}<div class="tel__cuerpo">${franjaCorta(D.franja[r.franja])}${cuerpo}</div>
      ${accion ? `<div class="tel__accion">${accion}</div>` : ''}${telTabs(r)}</div>`
  }
  const b = t => `<b style="color:var(--tinta)">${t}</b>`
  const falta = t => `<span class="falta-motor">${marca('falta', 14)}${t}</span>`
  /** La barra contra la meta o el máximo (X2 §5.2, la «bullet» de Few): barra oscura, raya de la meta. Proyectado: solo contorno. */
  const contraMeta = (W, v, meta, proyectado) => {
    const tope = Math.max(v, meta) * 1.12, X = x => x / tope * W
    return `<svg width="${W}" height="16" aria-hidden="true"><rect x="0" y="4" width="${W}" height="8" fill="var(--pista)"/>${proyectado
      ? `<rect x=".75" y="4.75" width="${X(v) - 1.5}" height="6.5" fill="none" stroke="var(--dato1)" stroke-width="1.5" stroke-dasharray="4 2.5"/>`
      : `<rect x="0" y="4" width="${X(v)}" height="8" fill="var(--dato1)"/>`}<line x1="${X(meta)}" x2="${X(meta)}" y1="0" y2="16" stroke="var(--tinta)" stroke-width="2"/></svg>`
  }

  // ═══════════════════ GERENTE · todos sus campos ═══════════════════
  const conMomentos = q.get('momentos') === '1'
  const momentos = (tel) => {
    const m = D.momentos
    const seg = (k, t, v, u, on) => `<a class="seg${on ? ' on' : ''}"><span class="seg__t">${t}</span><span class="seg__v">${v}<small> ${u}</small></span></a>`
    return `<div class="segmentos${tel ? ' segmentos--tel' : ''}" role="tablist" aria-label="Momento">
      ${seg('antes', 'Antes · lo que viene', m.antes, 'equipos avisan', false)}${seg('durante', 'Durante · ahora', n(m.durante), 'bbl/d', true)}${seg('despues', 'Después · el mes', n(m.despues), 'bbl', false)}</div>`
  }
  const apoyosGer = (tam, ancho) => {
    const g = D.ger, c = D.gerCierre, bj = g.bajando[0]
    return [
      cifra({ tam, rotulo: 'Diferido este mes', valor: n(g.esteMes.bbl), unidad: 'bbl', nota: `${g.esteMes.usd} mil USD · máximo a la fecha 3.642` }) + `<div style="margin-top:6px">${contraMeta(ancho, g.esteMes.bbl, 3642)}</div>`,
      cifra({ tam, rotulo: 'Producción por día', valor: n(g.produccion.real), unidad: 'bbl/d', nota: `meta ${n(g.produccion.meta)}` }) + `<div style="margin-top:6px">${contraMeta(ancho, g.produccion.real, g.produccion.meta)}</div>`,
      cifra({ tam: tam === 'l' ? 'm' : 'm', rotulo: 'Cierre del mes', valor: n(Math.round(c.produccion)), unidad: 'bbl', nota: `<span class="calidad" style="margin-left:0">proyectado</span> meta ${n(c.metaProduccion)}` }) + `<div style="margin-top:6px">${contraMeta(ancho, c.produccion, c.metaProduccion, true)}</div>`,
      cifra({ tam, rotulo: 'No planeado · planta', valor: `${n(bj.antes)} → ${n(bj.ahora)}`, unidad: 'bbl/d', nota: `${b(`▼ ${Math.abs(bj.pct)} %`)} desde que entró TRIM · muestra corta` }),
    ]
  }
  function gerEscritorio() {
    const g = D.ger, ap = apoyosGer('l', 220)
    const cuerpo = `
      <div style="display:grid;gap:16px;align-content:start;min-width:0">
        <section class="bloque" style="display:flex;flex-direction:column;gap:20px">
          ${conMomentos ? momentos(false) : ''}
          ${cifra({ tam: 'xl', rotulo: 'Se deja de producir ahora', valor: n(g.ahora), unidad: 'bbl/d', nota: `Casi todo: ${b('P-201B')}, bomba de agua de La Ceiba · ${g.pozos.parados} de ${g.pozos.total} pozos parados` })}
          <div style="display:flex;gap:8px;align-items:center"><a class="btn">Ver P-201B</a><a class="btn2">Compartir el informe</a><a class="enlace" style="margin-left:8px">Metas</a></div>
        </section>
        <section class="apoyos apoyos--2">${ap.map(x => `<div class="bloque">${x}</div>`).join('')}</section>
      </div>
      <section class="bloque" style="align-self:start"><div class="titulo-bloque"><span class="rotulo">Por campo</span><span class="der">ahora · bbl/d</span></div>${porCampo()}
        <div class="fila" style="grid-template-columns:minmax(0,1fr) auto;border-top:1px solid var(--linea);margin-top:4px"><span class="que">Pérdida del mes</span><span class="chico" style="display:flex;gap:6px;align-items:center">${marca('falta', 14)}sin registro · falta en el motor</span></div></section>`
    return escritorio('ger', 'Todos mis campos', 'hoy, 2 de oct · datos de las 14:00 · 5 campos', cuerpo, 'grid-template-columns:minmax(0,1.15fr) minmax(0,1fr)')
  }
  function gerTelefono() {
    const g = D.ger, con = g.filas.filter(f => f.bpd > 0), ap = apoyosGer('m', 150)
    const cuerpo = `${conMomentos ? momentos(true) : ''}
      ${cifra({ tam: 'xl', rotulo: 'Se deja de producir ahora', valor: n(g.ahora), unidad: 'bbl/d', nota: `Casi todo: ${b('P-201B')}, La Ceiba` })}
      <section class="bloque" style="padding-top:4px;padding-bottom:4px">
        ${con.map(f => `<div class="fila" style="grid-template-columns:1fr auto;padding:10px 0"><span><span class="que">${esc(f.campo)}</span><br><span class="donde">${marca(PRIO[f.prioridad], 14)} ${esc(f.equipo)} · ${f.tramo === 'planta' ? 'planta' : 'pozos'}</span></span><span class="num" style="font-size:18px">${n(f.bpd)}<small>bbl/d</small></span></div>`).join('')}
        <div class="fila" style="grid-template-columns:1fr;padding:8px 0"><span class="chico">y 3 campos más sin paradas ahora</span></div></section>
      <div class="apoyos-tel">${ap.map(x => `<div>${x}</div>`).join('')}</div>
      <div class="chico" style="display:flex;gap:6px;align-items:center">${marca('falta', 14)} Pérdida del mes: sin registro</div>`
    return telefono('ger', cuerpo, '<a class="btn">Ver P-201B</a>')
  }

  // ═══════════════════ SUPERVISOR · Hoy ═══════════════════
  function filaTarea(o) {
    return `<div class="fila tarea${o.tel ? ' tarea--tel' : ''}">
      <div style="min-width:0"><div class="tarea__eq">${marca(o.mk, 16)}<span class="que">${esc(o.eq)}</span><span class="donde">${esc(o.que)}</span></div>
      <div class="nota" style="margin-top:4px">${o.sub}</div></div>
      ${o.acciones || ''}</div>`
  }
  function tareasSup(tel) {
    const t = D.sup.tareas, conf = t.find(x => x.tipo === 'confirmar'), causa = t.find(x => x.tipo === 'conseguir-causa')
    return filaTarea({ tel, mk: 'alarma', eq: 'P-201B cerró LC-07 y LC-16', que: '· 05:43', sub: `TRIM las dedujo: ${b('en la planta, no planeada')} · ${n(conf.bblAhora)} bbl/d`,
      acciones: tel ? '<a class="enlace">Ver una por una</a>' : '<div class="tarea__acc"><a class="btn">Confirmar las 2</a><a class="enlace">Ver una por una</a></div>' })
      + filaTarea({ tel, mk: 'atencion', eq: 'LC-21 y LC-08', que: '· sin causa', sub: `LC-21 ${esc(causa.donde.corto)} · entre las 2: ${b('219 bbl hoy')}`, acciones: tel ? '<a class="enlace">Responder yo</a>' : '<div class="tarea__acc"><a class="btn2">Responder yo</a></div>' })
  }
  const apoyosSup = tam => {
    const s = D.sup
    return [
      cifra({ tam, rotulo: 'Se deja de producir', valor: n(s.ahora), unidad: 'bbl/d', nota: 'ahora · La Ceiba' }),
      cifra({ tam, marca: 'bloqueo', rotulo: 'No arrancar', valor: s.bloqueo.equipos.length, unidad: '', nota: `${s.bloqueo.equipos.join(' y ')}, hasta identificar` }),
      cifra({ tam, marca: 'atencion', rotulo: 'Sin causa', valor: 2, unidad: 'paradas', nota: 'LC-21 y LC-08' }),
    ]
  }
  function aguaAhora(anchoB) {
    const lt = D.p201b.senales.find(x => x.tag === 'LT-2012'), m = D.p201b.mientras
    return `<div class="titulo-bloque" style="margin-bottom:6px"><span class="rotulo">El agua, ahora<span class="ventana">P-201B parada: P-201A y P-201C toman lo que entra</span></span></div>
      <div class="fila" style="grid-template-columns:minmax(0,1fr) ${anchoB}px 92px;gap:14px;padding:6px 0;border:0">
        <div><div style="font-weight:600;font-size:14px">Tanque de agua</div><div class="chico"><span class="mono">LT-2012</span> · normal > 15 · alto-alto ${m.altoAltoPct} %</div></div>
        ${barra({ ancho: anchoB, escala: lt.escala, banda: lt.banda, alarmas: [...lt.alarmas, m.altoAltoPct], valor: lt.valor, estado: 'normal' })}
        <div class="num" style="font-size:18px">${n(lt.valor, 1)}<small>%</small></div></div>
      <div class="nota" style="margin-top:8px">Si para otra bomba, cierre primero ${b('LC-02, LC-10 y LC-01')}: dejan de producirse ${b('3.059 bbl/d')} después de 2 min.</div>`
  }
  function supEscritorio() {
    const s = D.sup
    const cuerpo = `
      <section class="bloque" style="display:flex;flex-direction:column;gap:20px">
        ${cifra({ tam: 'xl', rotulo: 'Paradas por confirmar', valor: s.porConfirmar, unidad: '', nota: `El reporte a la ANH sale ${b(s.limite)}.` })}
        <div class="apoyos-col">${apoyosSup('l').map(x => `<div>${x}</div>`).join('')}</div>
      </section>
      <div style="display:grid;gap:16px;align-content:start;min-width:0">
        <section class="bloque" style="padding-top:8px"><div class="titulo-bloque" style="margin:12px 0 0"><span class="rotulo">Lo que le toca</span><span class="der">4 paradas · 2 se confirman juntas</span></div>${tareasSup(false)}</section>
        <section class="bloque">${aguaAhora(300)}</section>
      </div>`
    return escritorio('sup', 'Hoy', 'La Ceiba · hoy, 2 de oct · datos de las 14:00', cuerpo, 'grid-template-columns:400px minmax(0,1fr)')
  }
  function supTelefono() {
    const s = D.sup
    const cuerpo = `<div style="display:flex;align-items:flex-end;gap:16px">${cifra({ tam: 'xl', rotulo: 'Por confirmar', valor: s.porConfirmar, unidad: 'paradas' })}
        <div class="nota" style="padding-bottom:8px">reporte a la ANH:<br>${b('mañana, antes de las 07:00')}</div></div>
      <div class="apoyos-tel apoyos-tel--3">${apoyosSup('m').map(x => `<div>${x}</div>`).join('')}</div>
      <section class="bloque" style="padding-top:0;padding-bottom:0">${tareasSup(true)}</section>`
    return telefono('sup', cuerpo, '<a class="btn">Confirmar las 2 de P-201B</a>')
  }

  // ═══════════════════ OPERADOR · Hoy (una pregunta a la vez) ═══════════════════
  function pregunta(tel) {
    const o = D.oper, p = o.pregunta
    return `<div class="pregunta${tel ? ' pregunta--tel' : ''}">
      <div class="tarea__eq">${marca('alarma', 18)}<span class="que" style="font-size:18px">P-201B</span><span class="donde">· bomba de agua · paró hoy a las 03:52</span></div>
      <h2 class="pregunta__t">${esc(p.texto)}</h2><div class="nota">${esc(p.pista)}</div>
      <div class="opciones">${p.opciones.map((x, i) => `<a class="opcion${i === 3 ? ' opcion--no' : ''}"><b>${esc(x.texto)}</b><small>${esc(x.dato || '')}</small></a>`).join('')}</div></div>`
  }
  function operEscritorio() {
    const o = D.oper
    const cuerpo = `<div style="max-width:760px;width:100%;margin:0 auto;display:grid;gap:24px">
      <div style="display:flex;align-items:flex-end;gap:24px">${cifra({ tam: 'xl', rotulo: 'Pregunta', valor: '1', unidad: `de ${o.preguntas}` })}<div class="nota" style="padding-bottom:10px">Empiece por P-201B: está parada y no se puede arrancar.</div></div>
      <section class="bloque">${pregunta(false)}</section>
      <div style="display:flex;gap:16px;align-items:center">
        <div class="bloqueo" style="flex:1">${marca('bloqueo', 18)}<span>No arrancar ${b('2')}: P-201B y LC-21, hasta identificar</span></div>
        <a class="btn2">Registrar una pérdida</a></div>
      <div class="chico" style="text-align:right">${falta('Registrar una pérdida: falta en el motor')}</div></div>`
    return escritorio('oper', 'Hoy', 'La Ceiba · hoy, 2 de oct · datos de las 14:00', cuerpo, 'grid-template-columns:1fr')
  }
  function operTelefono() {
    const o = D.oper
    const cuerpo = `<div style="display:flex;align-items:flex-end;gap:14px">${cifra({ tam: 'xl', rotulo: 'Pregunta', valor: '1', unidad: `de ${o.preguntas}` })}</div>
      ${pregunta(true)}
      <div class="bloqueo" style="font-size:16px;padding:10px 12px">${marca('bloqueo', 20)}<span>No arrancar ${b('2')}: P-201B y LC-21</span></div>`
    return telefono('oper', cuerpo, `<a class="btn2" style="flex:1">Registrar una pérdida</a>`)
  }

  // ═══════════════════ JEFE · Hoy ═══════════════════
  const k1 = () => D.k101.senales.find(s => s.tag === 'PT-1011')
  function porQueAvisa(anchoB, anchoT) {
    const x = k1()
    return `<div class="titulo-bloque" style="margin-bottom:6px"><span class="rotulo">Por qué avisa<span class="ventana">12 d · escala provisional</span></span></div>
      <div class="fila" style="grid-template-columns:minmax(0,1fr) ${anchoB}px 92px;gap:14px;padding:6px 0;border:0">
        <div><div style="font-weight:600;font-size:14px">${esc(x.nombre)}</div><div class="chico"><span class="mono">${esc(x.tag)}</span> · normal ${n(x.banda[0])} – ${n(x.banda[1])}</div></div>
        ${barra({ ancho: anchoB, escala: x.escala, banda: x.banda, alarmas: x.alarmas, valor: x.valor, estado: 'anormal' })}
        <div class="num" style="font-size:18px;display:flex;gap:6px;justify-content:flex-end;align-items:center">${marca('alarma', 16)}<b style="font-weight:750">${n(x.valor)}</b><small>${esc(x.unidad)}</small></div></div>
      ${tendencia({ id: 'k1', ancho: anchoT, alto: 92, escala: x.escala, banda: x.banda, alarmas: [], series: [{ serie: x.serie }], ejeX: ['21 de sept', 'hoy, 2 de oct'], aria: 'Presión de cabezal de K-101, 12 días' })}`
  }
  const apoyosJefe = tam => {
    const j = D.jefe
    return [
      cifra({ tam, rotulo: 'Por identificar', valor: 3, unidad: 'paradas', nota: 'P-201B, LC-21 y LC-08' }),
      cifra({ tam, rotulo: 'Fallas críticas · octubre', valor: j.fallasCriticasOct.valor, unidad: '', nota: 'P-201B, 2 de oct' }),
      cifra({ tam, rotulo: 'Espera por falla', valor: `${n(j.esperaD, 1)} de ${n(j.totalD, 1)}`, unidad: 'días', nota: `promedio de ${j.fallasHistoria} fallas · repuesto, permisos o cuadrilla` }),
    ]
  }
  function jefeEscritorio() {
    const j = D.jefe
    const cuerpo = `
      <section class="bloque" style="display:flex;flex-direction:column;gap:18px">
        ${cifra({ tam: 'xl', rotulo: 'Equipos que avisan', valor: j.avisan, unidad: 'equipo', nota: `${b('K-101')} · aire de instrumentos · ya pasó el límite · si para, hasta ${b(`${n(j.orden.bblSiPara)} bbl/d`)}` })}
        <div style="display:flex;gap:8px;align-items:center"><a class="btn">Ver la orden 40012056</a><span class="chico">liberada a Óscar Daza a las 09:10</span></div>
      </section>
      <section class="bloque">${porQueAvisa(190, 520)}</section>
      <section class="apoyos apoyos--3" style="grid-column:1/-1">${apoyosJefe('l').map(x => `<div class="bloque">${x}</div>`).join('')}</section>
      <div class="ojo" style="grid-column:1/-1">${marca('normal', 14)}<span>${b('Ojo:')} hoy no intervenga P-201A ni P-201C: valen más mientras P-201B esté parada.</span><a class="enlace" style="margin-left:auto">Ver P-201A y P-201C</a></div>`
    return escritorio('jefe', 'Hoy', 'La Ceiba · hoy, 2 de oct · datos de las 14:00', cuerpo, 'grid-template-columns:minmax(0,1fr) minmax(0,1fr)')
  }
  function jefeTelefono() {
    const j = D.jefe
    const cuerpo = `${cifra({ tam: 'xl', rotulo: 'Equipos que avisan', valor: j.avisan, unidad: 'equipo', nota: `${b('K-101')} · aire de instrumentos · ya pasó el límite` })}
      <section class="bloque" style="padding:12px 14px">${porQueAvisa(120, 326).replace('minmax(0,1fr) 120px 92px', 'minmax(0,1fr) 120px 74px')}</section>
      <div class="apoyos-tel">${apoyosJefe('m').map(x => `<div>${x}</div>`).join('')}</div>
      <div class="ojo" style="font-size:14px">${b('Ojo:')} hoy no intervenga P-201A ni P-201C.</div>`
    return telefono('jefe', cuerpo, '<a class="btn">Ver la orden de K-101</a>')
  }

  // ═══════════════════ PRODUCCIÓN · Hoy ═══════════════════
  function tuberia(W, compacto) {
    const P = D.prod, tp = P.tramos.find(t => t.tramo === 'pozo'), tl = P.tramos.find(t => t.tramo === 'planta')
    const H = compacto ? 132 : 150, w = compacto ? 96 : 150, y = 34, xs = [0, (W - w) / 2, W - w]
    let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="La Ceiba: pozos, planta y salida">`
    s += area(xs[0], y, { w, h: 40, estado: 'marcha', texto: 'Pozos' }) + `<text x="${xs[0]}" y="${y - 10}" font-size="12" font-weight="700" fill="var(--tinta)">◄ limita</text>`
    s += linea([[xs[0] + w, y + 20], [xs[1] - 1, y + 20]], 'multi')
    s += area(xs[1], y, { w, h: 40, estado: 'marcha', marca: 'alarma', texto: 'Planta' })
    s += linea([[xs[1] + w, y + 20], [xs[2] - 1, y + 20]], 'crudo')
    s += area(xs[2], y, { w, h: 40, estado: 'marcha', texto: 'Salida' })
    const fs = compacto ? 16 : 18
    s += `<text x="${xs[0]}" y="${y + 64}" font-size="${fs}" font-weight="650" fill="var(--tinta)">${n(tp.cabeBpd)}</text><text x="${xs[0]}" y="${y + 82}" font-size="12" fill="var(--tinta2)">dan, bbl/d</text>`
    s += `<text x="${xs[1]}" y="${y + 64}" font-size="${fs}" font-weight="650" fill="var(--tinta)">${n(tl.cabeBpd)}</text><text x="${xs[1]}" y="${y + 82}" font-size="12" fill="var(--tinta2)">caben${compacto ? '' : ` · sobran ${n(tl.sobraBpd)}`}</text>`
    if (!compacto) s += `<text x="${xs[1]}" y="${y + 100}" font-size="12" fill="var(--tinta2)">P-201B parada · capacidad sin firmar</text>`
    s += `<text x="${xs[2]}" y="${y + 64}" font-size="${fs}" font-weight="650" fill="var(--tinta)">${n(P.sale)}</text><text x="${xs[2]}" y="${y + 82}" font-size="12" fill="var(--tinta2)">salen hoy</text>`
    return s + '</svg>'
  }
  const apoyosProd = tam => {
    const P = D.prod
    return [
      cifra({ tam, rotulo: 'Por confirmar', valor: P.porConfirmar, unidad: 'paradas', nota: 'antes de las 07:00' }),
      cifra({ tam, rotulo: 'Diferido este mes', valor: n(P.esteMes.bbl), unidad: 'bbl', nota: '355 sin causa · calculado' }),
      cifra({ tam, rotulo: 'Si falla hoy', valor: n(P.siFallaHoy), unidad: 'bbl/d', nota: `${P.siFallaEquipos.join(' o ')} · sin instrumento` }),
    ]
  }
  function prodEscritorio() {
    const P = D.prod
    const cuerpo = `
      <section class="bloque" style="grid-column:1/-1;display:grid;grid-template-columns:auto minmax(0,1fr);gap:24px 48px;align-items:center">
        <div>${cifra({ tam: 'xl', rotulo: 'Salen hoy', valor: n(P.sale), unidad: `de ${n(P.tramos[0].cabeBpd)} bbl/d`, nota: `Limitan los pozos. A la planta le sobran ${b(n(P.tramos[1].sobraBpd))} bbl/d.` })}
          <div style="display:flex;gap:8px;margin-top:20px"><a class="btn">Confirmar las 2</a><a class="btn2">Ver una por una</a></div></div>
        <div>${tuberia(640, false)}</div></section>
      <section class="apoyos" style="grid-column:1/-1">${apoyosProd('l').map(x => `<div class="bloque">${x}</div>`).join('')}
        <div class="bloque">${cifra({ tam: 'l', estado: 'sindato', rotulo: 'Pérdida del mes', valor: '—', unidad: '', nota: 'sin registro' })}<div style="margin-top:8px">${falta('falta en el motor')}</div></div></section>`
    return escritorio('prod', 'Hoy', 'La Ceiba · hoy, 2 de oct · datos de las 14:00', cuerpo, 'grid-template-columns:1fr')
  }
  function prodTelefono() {
    const P = D.prod
    const cuerpo = `${cifra({ tam: 'xl', rotulo: 'Salen hoy', valor: n(P.sale), unidad: `de ${n(P.tramos[0].cabeBpd)}`, nota: 'bbl/d · limitan los pozos' })}
      <section class="bloque" style="padding:14px">${tuberia(326, true)}</section>
      <div class="apoyos-tel apoyos-tel--3">${apoyosProd('m').map(x => `<div>${x}</div>`).join('')}</div>
      <div class="chico" style="display:flex;gap:6px;align-items:center">${marca('falta', 14)} Pérdida del mes: sin registro</div>`
    return telefono('prod', cuerpo, '<a class="btn">Confirmar las 2</a>')
  }

  // ═══════════════════ REGULATORIO · el reporte a la ANH ═══════════════════
  function paradasReg() {
    return D.reg.paradas.map(x => `<div class="fila" style="grid-template-columns:minmax(0,1fr) auto;padding:12px 0">
      <div><div class="tarea__eq">${marca('falta', 16)}<span class="que">${esc(x.pozo)}</span><span class="donde">· ${esc(x.falta)}</span></div>
      <div class="nota" style="margin-top:4px">lo debe el ${esc(x.debe)} · ${esc(x.cuando)}</div></div>
      <span class="num" style="font-size:18px">${n(x.bbl)}<small>bbl</small></span></div>`).join('')
  }
  const apoyosReg = tam => [
    cifra({ tam, rotulo: 'Sin causa', valor: n(D.reg.bbl), unidad: 'bbl', nota: 'lo que no se puede reportar' }),
    cifra({ tam, rotulo: 'Límite', valor: '07:00', unidad: 'mañana', nota: 'Circular 024' }),
    cifra({ tam, estado: 'sindato', rotulo: 'Respuesta de la ANH', valor: '—', unidad: '', nota: 'sin respuesta registrada' }),
  ]
  function regEscritorio() {
    const cuerpo = `
      <section class="bloque" style="display:flex;flex-direction:column;gap:20px">
        ${cifra({ tam: 'xl', rotulo: 'Paradas sin causa', valor: D.reg.sinCausa, unidad: '', nota: `${b(D.reg.titulo)}: octubre sigue abierto · estado ${esc(D.reg.estado)}` })}
        <div class="apoyos-col">${apoyosReg('l').map(x => `<div>${x}</div>`).join('')}</div>
        <div>${falta('La respuesta de la ANH y la hora para corregir: falta en el motor')}</div>
      </section>
      <section class="bloque" style="align-self:start"><div class="titulo-bloque"><span class="rotulo">Qué falta y quién lo debe</span></div>${paradasReg()}
        <div style="display:flex;gap:8px;align-items:center;margin-top:20px"><a class="btn">Exportar el reporte</a><span class="chico">C024-2026 · DICC-V3.2</span></div></section>`
    return escritorio('reg', 'Reporte a la ANH', 'La Ceiba · octubre · datos de las 14:00', cuerpo, 'grid-template-columns:400px minmax(0,1fr)')
  }
  function regTelefono() {
    const cuerpo = `${cifra({ tam: 'xl', rotulo: 'Sin causa', valor: D.reg.sinCausa, unidad: 'paradas', nota: b('No se puede publicar todavía') })}
      <div class="apoyos-tel apoyos-tel--3">${apoyosReg('m').map(x => `<div>${x}</div>`).join('')}</div>
      <section class="bloque" style="padding-top:0;padding-bottom:0">${paradasReg()}</section>`
    return telefono('reg', cuerpo, '<a class="btn">Exportar el reporte</a>')
  }

  // ═══════════════════ Kit para el gerente: una fila por campo ═══════════════════
  function porCampo() {
    const max = Math.max(...D.ger.filas.map(f => f.bpd))
    return D.ger.filas.map(f => {
      const pct = f.bpd ? Math.max(.6, f.bpd / max * 100) : 0
      const lado = f.gas ? `${marca('falta', 14)} campo de gas: su tubería todavía no está`
        : f.bpd ? `${marca(PRIO[f.prioridad], 14)} ${f.tramo === 'planta' ? 'en la planta' : 'en los pozos'} · <b style="color:var(--tinta)">${esc(f.equipo)}</b> ${esc(f.familia)}`
          : 'produce sin paradas ahora'
      return `<div class="fila" style="grid-template-columns:minmax(0,1fr) auto;gap:4px 16px;padding:12px 0">
        <span class="que">${esc(f.campo)}</span><span class="num">${f.gas ? '<span class="chico">sin dato</span>' : `${n(f.bpd)}<small>bbl/d</small>`}</span>
        <div style="grid-column:1/-1;height:8px;background:var(--pista);position:relative">${pct ? `<i style="position:absolute;left:0;top:0;bottom:0;width:${pct}%;background:var(--dato1)"></i>` : ''}</div>
        <span class="donde" style="grid-column:1/-1;display:flex;align-items:center;gap:6px">${lado}</span></div>`
    }).join('')
  }
  const produccionBarra = (W) => {
    const p = D.ger.produccion, tope = p.meta * 1.25, X = v => v / tope * W
    return `<svg width="${W}" height="18" aria-hidden="true"><rect x="0" y="4" width="${W}" height="10" fill="var(--pista)"/><rect x="0" y="4" width="${X(p.real)}" height="10" fill="var(--dato1)"/><line x1="${X(p.meta)}" x2="${X(p.meta)}" y1="0" y2="18" stroke="var(--tinta)" stroke-width="2"/></svg>`
  }
  const bajando = () => {
    const b = D.ger.bajando[0]
    return cifra({ tam: 'l', rotulo: '¿Está bajando? · planta', valor: `${n(b.antes)} → ${n(b.ahora)}`, unidad: 'bbl/d', nota: `<b style="color:var(--tinta)">${b.pct < 0 ? '▼' : '▲'} ${Math.abs(b.pct)} %</b> lo no planeado, desde que entró TRIM · muestra corta` })
  }


  // ═══════════════════ NIVEL 3 · P-201B ═══════════════════
  function trenAgua(W) {
    const e = D.p201b.esquemaAgua, H = 318
    const ins = Object.fromEntries(e.instrumentos.map(i => [i.letras, i]))
    const ys = [56, 150, 264], xSuc = 128, xB = 196, xDes = W - 56
    let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Tren de agua de La Ceiba: tanque, P-201A, P-201B y P-201C">`
    s += `<text x="0" y="14" font-size="12" fill="var(--tinta2)">entran <tspan font-weight="700" fill="var(--tinta)">${n(e.entraBpd)}</tspan> bbl/d</text>`
    s += linea([[0, 26], [40, 26], [40, 70]], 'agua')
    s += tanque(8, 72, { w: 64, h: 136, nivel: e.tanque.nivelPct, limites: [[e.tanque.altoAltoPct, '']] })
    s += `<text x="40" y="232" text-anchor="middle" font-size="18" font-weight="700" fill="var(--tinta)">${n(e.tanque.nivelPct, 1)} %</text><text x="40" y="250" text-anchor="middle" font-size="12" fill="var(--tinta2)">alto-alto ${e.tanque.altoAltoPct} %</text>`
    s += linea([[72, 196], [xSuc, 196]], 'agua', { flecha: false }) + linea([[xSuc, ys[0]], [xSuc, ys[2]]], 'agua', { flecha: false })
    e.bombas.forEach((b, k) => {
      const parada = b.marcha === 'parada', y = ys[k]
      s += linea([[xSuc, y], [xB - 18, y]], 'agua', { flecha: false })
      s += linea([[xB + 22, y - 16], [xDes, y - 16]], 'agua', { flecha: false, sinFlujo: parada })
      s += bomba(xB, y, { estado: parada ? 'anormal' : b.instrumentada ? 'marcha' : 'sininstr', marca: b.esta ? 'alarma' : null })
      s += `<text x="${xB + 28}" y="${y + 12}" font-size="14" font-weight="${b.esta ? 700 : 600}" fill="var(--tinta)">${esc(b.id)}</text>`
      s += `<text x="${xB + 28}" y="${y + 28}" font-size="12" fill="var(--tinta2)">${parada ? 'parada' : b.instrumentada ? 'en marcha' : 'sin instrumento'}</text>`
    })
    s += linea([[xDes, ys[0] - 16], [xDes, ys[2] - 16]], 'agua', { flecha: false }) + linea([[xDes, ys[1] - 16], [W - 2, ys[1] - 16]], 'agua')
    s += `<text x="${W - 2}" y="${ys[1] + 6}" text-anchor="end" font-size="12" fill="var(--tinta2)">a los</text><text x="${W - 2}" y="${ys[1] + 22}" text-anchor="end" font-size="12" fill="var(--tinta2)">inyectores</text>`
    // Las burbujas de la bomba que se mira: PI en la succión; PDI y FI en la descarga.
    const yb = ys[1] - 48
    s += `<line x1="${xSuc + 24}" x2="${xSuc + 24}" y1="${ys[1]}" y2="${yb + 20}" stroke="var(--tinta3)" stroke-width="1" stroke-dasharray="2 2"/>` + medidor(xSuc + 24, yb, { letras: 'PI', lazo: '2010', valor: n(ins.PI.valor, 1), unidad: 'psi', valorArriba: true, estado: 'parado' })
    for (const [k, l] of [[0, 'PDI'], [1, 'FI']]) { const x = xDes - 80 + k * 50, yd = ys[1] + 30; s += `<line x1="${x}" x2="${x}" y1="${ys[1] - 16}" y2="${yd - 20}" stroke="var(--tinta3)" stroke-width="1" stroke-dasharray="2 2"/>` + medidor(x, yd, { letras: l, lazo: '2011', valor: n(ins[l].valor), valorAbajo: true, estado: 'parado' }) }
    return s + '</svg>'
  }
  function senales(anchoBarra, anchoSpark) {
    return D.p201b.senales.map(x => `<div class="fila" style="grid-template-columns:minmax(0,1fr) ${anchoBarra}px 84px ${anchoSpark}px;gap:14px;padding:8px 0">
      <div style="min-width:0"><div style="font-weight:600;font-size:14px;white-space:nowrap">${esc(x.nombre)}</div><div class="chico" style="white-space:nowrap"><span class="mono">${esc(x.tag)}</span> · ${esc(x.limite.replace('normal ', ''))}</div></div>
      ${barra({ ancho: anchoBarra, escala: x.escala, banda: x.banda, alarmas: x.alarmas, valor: x.valor, estado: x.gris ? 'parado' : 'normal' })}
      <div class="num" style="font-size:18px;color:${x.gris ? 'var(--tinta2)' : 'var(--tinta)'};font-weight:${x.gris ? 550 : 650}">${n(x.valor, x.decimales)}<small>${esc(x.unidad)}</small></div>
      ${tendencia({ ancho: anchoSpark, alto: 32, margenIzq: 2, sinEjeX: true, sinEjeY: true, escala: x.escala, banda: x.banda, alarmas: [], series: [{ serie: x.serie }], estado: x.gris ? 'parado' : 'normal', aria: `${x.nombre}, 12 días` })}
    </div>`).join('')
  }
  function p201bEscritorio() {
    const N = D.p201b, T = N.tendencias, h = N.historia
    const tend = T.series.map((x, k) => `<div style="display:grid;grid-template-columns:120px minmax(0,1fr);gap:12px;align-items:center">
      <div><div style="font-weight:600;font-size:14px">${esc(x.nombre)}</div><div class="chico">${esc(x.unidad)} · <span class="mono">${esc(x.tag)}</span></div></div>
      ${tendencia({ id: 't' + k, ancho: 300, alto: k === 2 ? 74 : 56, sinEjeX: k !== 2, escala: x.escala, banda: x.banda, alarmas: x.alarmas, series: [{ serie: x.serie }], ejeX: ['21 de sept', 'hoy, 2 de oct'], aria: `${x.nombre}, 12 días antes de parar` })}</div>`).join('')
    return `<div class="app${arriba(ROL.p201b) ? ' app--arriba' : ''}">${nav(ROL.p201b)}
    <main class="main">
      <div class="cabeza" style="padding-top:14px;min-height:0"><div><div class="chico">La Ceiba › Agua › <span class="mono">P-201B</span></div>
        <div style="display:flex;align-items:center;gap:12px"><h1 style="font-size:24px" class="mono">P-201B</h1><span style="display:inline-flex;align-items:center;gap:8px;font-weight:650">${marca('alarma', 18)} Alarma · parada desde hoy, 03:52 · hace 10,1 h</span></div>
        <div class="chico">${esc(N.subtitulo)}</div></div>
        <div class="der">${arriba(ROL.p201b) ? '' : franja(D.franja.ceiba)}</div></div>
      <div class="cuerpo" style="grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:16px;padding-top:14px">
        <section class="bloque" style="display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px 32px;align-items:center;grid-column:1/-1;padding:14px 24px">
          ${cifra({ tam: 'xl', rotulo: 'Se deja de producir por ella', valor: n(N.cifra.valor), unidad: 'bbl/d', nota: 'cerró LC-07 y LC-16 · medido' })}
          <div style="display:flex;flex-direction:column;gap:12px;min-width:0">
            <div class="bloqueo">${marca('bloqueo', 18)}<span>${esc(N.bloqueo.texto)}</span><small>${esc(N.bloqueo.sub)}</small></div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><a class="btn">Diga qué se dañó</a><a class="btn2">Crear aviso en SAP</a>
              <span class="chico" style="margin-left:auto">Mientras esté parada: entran <b style="color:var(--tinta)">${n(N.mientras.entraBpd)}</b> · caben <b style="color:var(--tinta)">${n(N.mientras.cabenBpd)}</b> bbl/d de agua</span></div>
          </div>
        </section>
        <div style="display:grid;gap:16px;align-content:start;min-width:0">
          <section class="bloque" style="padding:14px 20px"><div class="titulo-bloque" style="margin-bottom:4px"><span class="rotulo">Su tren de agua</span><span class="der">discontinuo: sin instrumento</span></div>${trenAgua(460)}</section>
          <section class="bloque" style="padding:14px 20px;display:grid;gap:6px"><div class="titulo-bloque" style="margin-bottom:2px"><span class="rotulo">${esc(T.titulo)}<span class="ventana">12 d · banda normal · alarma en discontinuo</span></span></div>${tend}</section>
        </div>
        <div style="display:grid;gap:16px;align-content:start;min-width:0">
          <section class="bloque" style="padding:12px 20px 6px"><div class="titulo-bloque" style="margin-bottom:0"><span class="rotulo">Sus señales<span class="ventana">12 d · parada: en gris y sin marca · escala provisional</span></span></div>${senales(150, 110)}</section>
          <section class="bloque" style="padding:14px 20px;display:grid;grid-template-columns:auto auto auto minmax(0,1fr);gap:8px 28px;align-items:end">
            <span class="rotulo" style="grid-column:1/-1">Su historia<span class="ventana">12 meses</span></span>
            ${cifra({ tam: 'm', rotulo: 'Fallas', valor: h.fallas, unidad: '' })}${cifra({ tam: 'm', rotulo: 'Una cada', valor: n(h.cadaDias), unidad: 'd' })}${cifra({ tam: 'm', rotulo: 'Por falla', valor: n(h.bblPorFalla), unidad: 'bbl' })}
            <div class="chico" style="display:grid;gap:4px"><span>Kit de sello: 0 en bodega · llega 1 el 9 de oct</span><span style="display:flex;gap:6px;align-items:center">${marca('aviso', 14)} Impulsor: 0 en bodega · pedirlo, 45 días</span></div>
          </section>
        </div>
      </div>
    </main></div>`
  }

  const PANT = {
    ger: { escritorio: gerEscritorio, telefono: gerTelefono },
    sup: { escritorio: supEscritorio, telefono: supTelefono },
    oper: { escritorio: operEscritorio, telefono: operTelefono },
    jefe: { escritorio: jefeEscritorio, telefono: jefeTelefono },
    prod: { escritorio: prodEscritorio, telefono: prodTelefono },
    reg: { escritorio: regEscritorio, telefono: regTelefono },
    p201b: { escritorio: p201bEscritorio },
  }
  window.PANT = { render(p) { document.body.innerHTML = PANT[p][vista](); document.title = `${p} · ${DIRS[dir]} · ${tema} · ${vista}` }, dir, tema, vista, DIRS }
})()
