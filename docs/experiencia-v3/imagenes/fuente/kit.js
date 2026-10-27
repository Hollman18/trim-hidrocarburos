// M4 · El kit SCADA de la v3 (kit-scada.md), en SVG propio. Lo usan todas las imágenes.
// Retícula de 4 px. Trazos: 1 px reglas y escalas · 1,5 px contorno de equipo · 2 px contorno
// anormal y línea de proceso · 2 px puntero. Color: solo la paleta de estado de X2, por token.
// Nada se anima, nada lleva sombra, degradado ni 3D.
(function () {
  const n = (v, dec = 0) => v === null || v === undefined ? '—' : Number(v).toLocaleString('es-CO', { minimumFractionDigits: dec, maximumFractionDigits: dec })
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  const PAL = { interlock: 'Interlock', alarma: 'Alarma', atencion: 'Atención', aviso: 'Aviso', sincom: 'Sin comunicación', invalido: 'Dato inválido', falta: 'Falta', sininstr: 'Sin instrumento', normal: 'Normal', bloqueo: 'Bloqueo de procedimiento' }
  const COLOR = { interlock: 'var(--interlock)', alarma: 'var(--p1)', atencion: 'var(--p2)', aviso: 'var(--p3)', sincom: 'var(--sincom)', invalido: 'var(--sincom)' }

  /** La marca de estado: forma + número + color (X2 §4.2), en un cuadro de 14 × 14. */
  function marca(tipo, s = 14) {
    const t = `<svg class="mk" data-excepcion width="${s}" height="${s}" viewBox="0 0 14 14" role="img" aria-label="${PAL[tipo] || tipo}">`
    const num = (k, c) => `<text x="7" y="${k === '2' ? 10.6 : 10.1}" text-anchor="middle" font-size="8.6" font-weight="700" font-family="var(--f-sans)" fill="${c}">${k}</text>`
    switch (tipo) {
      case 'interlock': return t + `<rect x="2.5" y="6" width="9" height="7" rx="1.2" fill="var(--interlock)"/><path d="M4.6 6 V4.4 a2.4 2.4 0 0 1 4.8 0 V6" fill="none" stroke="var(--interlock)" stroke-width="1.6"/></svg>`
      case 'alarma': return t + `<path d="M7 .6 L13.4 7 L7 13.4 L.6 7Z" fill="var(--p1)"/>${num('1', 'var(--marca-num)')}</svg>`
      case 'atencion': return t + `<path d="M7 1 L13.3 12.8 H.7Z" fill="var(--p2)" stroke="var(--marca-trazo)" stroke-width="1" stroke-linejoin="round"/>${num('2', 'var(--marca-trazo)')}</svg>`
      case 'aviso': return t + `<rect x="1.2" y="1.2" width="11.6" height="11.6" rx="1" fill="var(--p3)" stroke="var(--marca-trazo)" stroke-width="1"/>${num('3', 'var(--marca-trazo)')}</svg>`
      case 'sincom': return t + `<circle cx="7" cy="7" r="5.2" fill="none" stroke="var(--sincom)" stroke-width="1.6" stroke-dasharray="2.2 1.6"/></svg>`
      case 'invalido': return t + `<circle cx="7" cy="7" r="5.2" fill="none" stroke="var(--sincom)" stroke-width="1.6" stroke-dasharray="2.2 1.6"/><path d="M3.3 10.7 L10.7 3.3" stroke="var(--sincom)" stroke-width="1.6"/></svg>`
      case 'falta': return t + `<rect x="1.5" y="3" width="11" height="8" rx="1" fill="none" stroke="var(--tinta3)" stroke-width="1.3" stroke-dasharray="2 1.5"/></svg>`
      case 'sininstr': return t + `<path d="M4 2.5 H2 V11.5 H4 M10 2.5 H12 V11.5 H10" fill="none" stroke="var(--tinta3)" stroke-width="1.4"/></svg>`
      case 'bloqueo': return t + `<circle cx="7" cy="7" r="5.6" fill="none" stroke="var(--tinta)" stroke-width="1.6"/><path d="M3 11 L11 3" stroke="var(--tinta)" stroke-width="1.6"/></svg>`
      case 'parado': return t + `<rect x="2" y="2" width="10" height="10" rx="1" fill="var(--eq-parado)"/></svg>`
      default: return t + `<circle cx="7" cy="7" r="2.6" fill="var(--tinta3)"/></svg>`
    }
  }

  /** Indicador analógico de barra (X2 §5.1). Escala fija del instrumento, banda normal
   *  sombreada con sus dos rayas, límite de alarma (2 px), disparo (raya doble), puntero en tinta.
   *  estado: normal | anormal | sindato | sincom | parado. */
  function barra(o) {
    const W = o.ancho || 240, H = 28, x0 = 4, x1 = W - 4, [mn, mx] = o.escala
    const X = v => x0 + (Math.min(mx, Math.max(mn, v)) - mn) / (mx - mn) * (x1 - x0)
    const gris = o.estado === 'parado', sc = o.estado === 'sincom', sd = o.estado === 'sindato'
    let s = `<svg class="kit-barra" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">`
    if (sc || sd) {
      s += `<rect x="${x0}" y="10" width="${x1 - x0}" height="8" fill="none" stroke="${sc ? 'var(--sincom)' : 'var(--tinta3)'}" stroke-width="1.2" stroke-dasharray="3 2.5"/>`
      return s + '</svg>'
    }
    s += `<rect x="${x0}" y="10" width="${x1 - x0}" height="8" fill="var(--pista)"/>`
    if (o.banda) {
      const a = X(o.banda[0] ?? mn), b = X(o.banda[1] ?? mx)
      s += `<rect x="${a}" y="10" width="${b - a}" height="8" fill="var(--banda)"${gris ? ' opacity=".5"' : ''}/>`
      if (!gris) for (const [v, e] of [[o.banda[0], a], [o.banda[1], b]]) if (v !== null && v !== undefined) s += `<line x1="${e}" x2="${e}" y1="7" y2="21" stroke="var(--tinta3)" stroke-width="1"/>`
    }
    for (const al of o.alarmas || []) {
      const x = X(al), c = o.estado === 'anormal' && o.cruzo === al ? COLOR[o.prioridad || 'alarma'] : (gris ? 'var(--dato3)' : 'var(--tinta2)')
      s += `<line x1="${x}" x2="${x}" y1="5" y2="23" stroke="${c}" stroke-width="2"/>`
    }
    for (const dp of o.disparos || []) { const x = X(dp); s += `<line x1="${x - 2}" x2="${x - 2}" y1="5" y2="23" stroke="var(--tinta2)" stroke-width="1"/><line x1="${x + 1}" x2="${x + 1}" y1="5" y2="23" stroke="var(--tinta2)" stroke-width="1"/>` }
    if (o.valor !== null && o.valor !== undefined) {
      const x = X(o.valor), c = gris ? 'var(--tinta3)' : 'var(--tinta)'
      s += `<line x1="${x}" x2="${x}" y1="6" y2="22" stroke="${c}" stroke-width="2"/><path d="M${x - 4} 1 H${x + 4} L${x} 6Z" fill="${c}"/>`
      if (o.valor < mn) s += `<path d="M${x0 + 1} 24 l5 -3 v6Z" fill="${c}"/>`
      if (o.valor > mx) s += `<path d="M${x1 - 1} 24 l-5 -3 v6Z" fill="${c}"/>`
    }
    return s + '</svg>'
  }

  /** Tendencia (X2 §5.3): ventana escrita, banda normal, alarma en discontinuo, escala fija,
   *  hasta 4 trazas separadas por trazo. Un hueco corta la línea. */
  function tendencia(o) {
    const W = o.ancho || 360, H = o.alto || 96, L = o.margenIzq ?? 40, R = 8, T = 8, B = o.sinEjeX ? 6 : 22
    const [mn, mx] = o.escala, N = Math.max(...o.series.map(s => s.serie.length))
    const X = i => L + i / (N - 1) * (W - L - R), Y = v => T + (1 - (v - mn) / (mx - mn)) * (H - T - B)
    const gris = o.estado === 'parado'
    let s = `<svg class="kit-tendencia" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || '')}">`
    if (o.banda) {
      const a = Y(o.banda[1] ?? mx), b = Y(o.banda[0] ?? mn)
      s += `<rect x="${L}" y="${a}" width="${W - L - R}" height="${b - a}" fill="var(--banda)" opacity="${gris ? .45 : .6}"/>`
    }
    s += `<line x1="${L}" x2="${W - R}" y1="${Y(mn)}" y2="${Y(mn)}" stroke="var(--linea)" stroke-width="1"/>`
    const marcas = new Set([mn, mx, ...(o.alarmas || [])])
    if (!o.sinEjeY) for (const v of marcas) s += `<text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end" font-size="12" fill="var(--tinta3)" font-family="var(--f-mono)">${n(v, o.decimales || 0)}</text>`
    for (const al of o.alarmas || []) s += `<line x1="${L}" x2="${W - R}" y1="${Y(al)}" y2="${Y(al)}" stroke="${o.cruzo === al ? COLOR[o.prioridad || 'alarma'] : 'var(--tinta2)'}" stroke-width="1.2" stroke-dasharray="5 3"/>`
    if (o.paradaDesde !== undefined) s += `<rect x="${X(o.paradaDesde)}" y="${T}" width="${W - R - X(o.paradaDesde)}" height="${H - T - B}" fill="url(#rayado-${o.id || 'x'})"/><defs><pattern id="rayado-${o.id || 'x'}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="var(--linea)" stroke-width="1.4"/></pattern></defs>`
    const DASH = { continuo: '', discontinuo: '6 3', punteado: '1.5 3', guion: '10 3 2 3' }
    o.series.forEach((se, k) => {
      let d = '', abierto = false
      se.serie.forEach((v, i) => { if (v === null || v === undefined) { abierto = false; return } d += `${abierto ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(Math.max(mn, Math.min(mx, v))).toFixed(1)} `; abierto = true })
      const c = gris || se.gris ? 'var(--dato3)' : (k === 0 ? 'var(--dato1)' : 'var(--tinta2)')
      s += `<path d="${d}" fill="none" stroke="${c}" stroke-width="${k === 0 ? 2 : 1.6}" stroke-linejoin="round" ${DASH[se.trazo || 'continuo'] ? `stroke-dasharray="${DASH[se.trazo]}"` : ''}/>`
      const ult = se.serie.length - 1, uv = se.serie[ult]
      if (o.sincom && k === 0) s += `<g transform="translate(${X(ult) - 7} ${T})">${marca('sincom').replace('<svg', '<svg x="0" y="0"')}</g>`
      else if (uv !== null && uv !== undefined && !se.sinPunto) s += `<circle cx="${X(ult)}" cy="${Y(Math.max(mn, Math.min(mx, uv)))}" r="2.6" fill="${c}"/>`
    })
    if (!o.sinEjeX && o.ejeX) s += `<text x="${L}" y="${H - 6}" font-size="12" fill="var(--tinta3)">${esc(o.ejeX[0])}</text><text x="${W - R}" y="${H - 6}" text-anchor="end" font-size="12" fill="var(--tinta2)" font-weight="600">${esc(o.ejeX[1])}</text>`
    return s + '</svg>'
  }

  // ── Símbolos de proceso (ISA-5.1 simplificada, 2D). Devuelven un <g> para un SVG mayor. ──
  const cuerpo = e => ({
    marcha: { fill: 'var(--eq-marcha)', stroke: 'var(--eq-trazo)', w: 1.5, dash: '' },
    parado: { fill: 'var(--eq-parado)', stroke: 'var(--eq-trazo)', w: 1.5, dash: '' },
    anormal: { fill: 'var(--eq-parado)', stroke: 'var(--tinta)', w: 2, dash: '' },
    sincom: { fill: 'none', stroke: 'var(--sincom)', w: 1.5, dash: '3 2.5' },
    sininstr: { fill: 'none', stroke: 'var(--tinta3)', w: 1.5, dash: '3 2.5' },
    sindato: { fill: 'none', stroke: 'var(--tinta3)', w: 1.5, dash: '3 2.5' },
  }[e] || { fill: 'var(--eq-marcha)', stroke: 'var(--eq-trazo)', w: 1.5, dash: '' })
  const trazo = c => `fill="${c.fill}" stroke="${c.stroke}" stroke-width="${c.w}"${c.dash ? ` stroke-dasharray="${c.dash}"` : ''}`
  const enMarca = (x, y, tipo) => tipo ? `<g transform="translate(${x} ${y})">${marca(tipo, 14)}</g>` : ''
  const anillo = (cx, cy, r, tipo) => (tipo === 'alarma' || tipo === 'interlock') ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${COLOR[tipo]}" stroke-width="2"/>` : ''

  /** Bomba centrífuga: círculo de 32 con la descarga tangente arriba. */
  function bomba(x, y, o = {}) {
    const c = cuerpo(o.estado), r = 16
    let g = `<g class="kit-bomba">`
    g += anillo(x, y, r + 6, o.marca)
    g += `<path d="M${x} ${y - r} H${x + r + 6} V${y - r + 8} H${x + r * .78}" ${trazo({ ...c, fill: 'none' })}/>`
    g += `<circle cx="${x}" cy="${y}" r="${r}" ${trazo(c)}/>`
    g += enMarca(x - r - 14, y - r - 14, o.marca)
    if (o.rotulo) g += `<text x="${x}" y="${y + r + 18}" text-anchor="middle" font-size="${o.letra || 13}" font-weight="600" fill="var(--tinta)">${esc(o.rotulo)}</text>`
    if (o.sub) g += `<text x="${x}" y="${y + r + 34}" text-anchor="middle" font-size="12" fill="var(--tinta2)">${esc(o.sub)}</text>`
    return g + '</g>'
  }

  /** Tanque: cuerpo de techo plano, nivel en gris (nunca mancha de color), alto y alto-alto en el costado. */
  function tanque(x, y, o = {}) {
    const w = o.w || 64, h = o.h || 96, c = cuerpo(o.estado === 'sincom' || o.estado === 'sindato' ? o.estado : 'marcha')
    let g = `<g class="kit-tanque"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" ${trazo({ ...c, fill: 'var(--panel)' })}/>`
    if (o.nivel !== null && o.nivel !== undefined && o.estado !== 'sincom') {
      const hn = h * o.nivel / 100
      g += `<rect x="${x + 1.5}" y="${y + h - hn + 1}" width="${w - 3}" height="${hn - 2.5}" fill="var(--banda)"/>`
      g += `<line x1="${x + 1.5}" x2="${x + w - 1.5}" y1="${y + h - hn + 1}" y2="${y + h - hn + 1}" stroke="var(--dato1)" stroke-width="1.5"/>`
    }
    for (const [v, t] of (o.limites || [])) { const yy = y + h - h * v / 100; g += `<line x1="${x + w}" x2="${x + w + 8}" y1="${yy}" y2="${yy}" stroke="var(--tinta2)" stroke-width="2"/><text x="${x + w + 12}" y="${yy + 4}" font-size="12" fill="var(--tinta2)">${esc(t)}</text>` }
    g += enMarca(x - 16, y - 16, o.marca)
    if (o.rotulo) g += `<text x="${x + w / 2}" y="${y + h + 18}" text-anchor="middle" font-size="13" font-weight="600" fill="var(--tinta)">${esc(o.rotulo)}</text>`
    return g + '</g>'
  }

  /** Válvula: dos triángulos (corbatín) de 24 × 14. Abierta clara; cerrada oscura. */
  function valvula(x, y, o = {}) {
    const est = o.estado === 'cerrada' ? 'parado' : o.estado === 'sincom' ? 'sincom' : 'marcha', c = cuerpo(est)
    let g = `<g class="kit-valvula"><path d="M${x - 12} ${y - 7} L${x + 12} ${y + 7} V${y - 7} L${x - 12} ${y + 7}Z" ${trazo(c)} stroke-linejoin="round"/>`
    g += `<line x1="${x}" x2="${x}" y1="${y}" y2="${y - 14}" stroke="${c.stroke}" stroke-width="1.5"/><line x1="${x - 6}" x2="${x + 6}" y1="${y - 14}" y2="${y - 14}" stroke="${c.stroke}" stroke-width="1.5"/>`
    g += enMarca(x - 26, y - 22, o.marca)
    if (o.rotulo) g += `<text x="${x}" y="${y + 24}" text-anchor="middle" font-size="12" font-weight="600" fill="var(--tinta)">${esc(o.rotulo)}</text>`
    return g + '</g>'
  }

  /** Separador horizontal: cápsula con su vertedero. */
  function separador(x, y, o = {}) {
    const w = o.w || 112, h = o.h || 40, c = cuerpo(o.estado || 'marcha')
    let g = `<g class="kit-separador">${(o.marca === 'alarma' || o.marca === 'interlock') ? `<rect x="${x - 5}" y="${y - 5}" width="${w + 10}" height="${h + 10}" rx="${h / 2 + 5}" fill="none" stroke="var(--p1)" stroke-width="2"/>` : ''}<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" ${trazo(c)}/>`
    if (!['sincom', 'sininstr', 'sindato'].includes(o.estado)) g += `<line x1="${x + w * .66}" x2="${x + w * .66}" y1="${y + h * .45}" y2="${y + h - 2}" stroke="${o.estado === 'marcha' || !o.estado ? 'var(--eq-trazo)' : 'var(--eq-marcha)'}" stroke-width="1.5"/>`
    g += enMarca(x - 14, y - 16, o.marca)
    if (o.rotulo) g += `<text x="${x + w / 2}" y="${y + h + 18}" text-anchor="middle" font-size="13" font-weight="600" fill="var(--tinta)">${esc(o.rotulo)}</text>`
    return g + '</g>'
  }

  /** Área de proceso (un tramo: la planta, la salida): un bloque rectangular de esquinas vivas. */
  function area(x, y, o = {}) {
    const w = o.w || 120, h = o.h || 44, c = cuerpo(o.estado || 'marcha')
    let g = `<g class="kit-area"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" ${trazo({ ...c, fill: o.estado === 'anormal' ? 'var(--panel)' : c.fill })}/>`
    g += enMarca(x - 7, y - 7, o.marca)
    if (o.texto) g += `<text x="${x + w / 2}" y="${y + h / 2 + 5}" text-anchor="middle" font-size="14" font-weight="650" fill="var(--tinta)">${esc(o.texto)}</text>`
    return g + '</g>'
  }

  /** Pozo: cabezal (árbol) sobre la raya del suelo. */
  function pozo(x, y, o = {}) {
    const c = cuerpo(o.estado || 'marcha')
    let g = `<g class="kit-pozo"><line x1="${x - 16}" x2="${x + 16}" y1="${y}" y2="${y}" stroke="var(--tinta3)" stroke-width="1.5"/>`
    g += `<rect x="${x - 6}" y="${y - 30}" width="12" height="30" ${trazo(c)}/>`
    g += `<rect x="${x - 12}" y="${y - 20}" width="24" height="6" ${trazo(c)}/>`
    g += `<rect x="${x - 8}" y="${y - 36}" width="16" height="6" ${trazo(c)}/>`
    g += enMarca(x - 28, y - 46, o.marca)
    if (o.rotulo) g += `<text x="${x}" y="${y + 18}" text-anchor="middle" font-size="12" font-weight="600" fill="var(--tinta)">${esc(o.rotulo)}</text>`
    return g + '</g>'
  }

  /** Medidor (burbuja ISA-5.1): letras arriba, valor abajo, en tinta. Sin comunicación: «---». */
  function medidor(x, y, o = {}) {
    const sc = o.estado === 'sincom', r = 20
    let g = `<g class="kit-medidor"><circle cx="${x}" cy="${y}" r="${r}" fill="var(--panel)" stroke="${sc ? 'var(--sincom)' : 'var(--tinta2)'}" stroke-width="1.5"${sc ? ' stroke-dasharray="3 2.5"' : ''}/>`
    g += `<line x1="${x - r}" x2="${x + r}" y1="${y}" y2="${y}" stroke="var(--tinta3)" stroke-width="1"/>`
    g += `<text x="${x}" y="${y - 5}" text-anchor="middle" font-size="12" font-weight="600" fill="var(--tinta2)" font-family="var(--f-cond)">${esc(o.letras || 'FI')}</text>`
    g += `<text x="${x}" y="${y + 14}" text-anchor="middle" font-size="12" fill="var(--tinta3)" font-family="var(--f-cond)">${esc(o.lazo || '')}</text>`
    const v = sc ? '---' : (o.valor ?? '—'), col = o.estado === 'parado' || sc ? 'var(--tinta2)' : 'var(--tinta)'
    if (o.valorArriba) g += `<text x="${x}" y="${y - r - 8}" text-anchor="middle" font-size="14" font-weight="700" fill="${col}" font-family="var(--f-mono)">${esc(v)}${o.unidad ? `<tspan font-size="12" font-weight="400" fill="var(--tinta2)"> ${esc(o.unidad)}</tspan>` : ''}</text>`
    else if (o.valorIzq) g += `<text x="${x - r - 6}" y="${y + 5}" text-anchor="end" font-size="14" font-weight="700" fill="${col}" font-family="var(--f-mono)">${esc(v)}${o.unidad ? `<tspan font-size="12" font-weight="400" fill="var(--tinta2)"> ${esc(o.unidad)}</tspan>` : ''}</text>`
    else if (o.valorAbajo) g += `<text x="${x}" y="${y + r + 18}" text-anchor="middle" font-size="14" font-weight="700" fill="${col}" font-family="var(--f-mono)">${esc(v)}${o.unidad ? `<tspan font-size="12" font-weight="400" fill="var(--tinta2)"> ${esc(o.unidad)}</tspan>` : ''}</text>`
    else g += `<text x="${x + r + 6}" y="${y + 5}" font-size="14" font-weight="700" fill="${col}" font-family="var(--f-mono)">${esc(v)}${o.unidad ? `<tspan font-size="12" font-weight="400" fill="var(--tinta2)"> ${esc(o.unidad)}</tspan>` : ''}</text>`
    if (sc) g += `<g transform="translate(${x - r - 8} ${y - r - 6})">${marca('sincom', 14)}</g>`
    return g + '</g>'
  }

  /** Línea de proceso: el fluido por el trazo (los de la app, Planta.tsx), flecha fija de dirección. */
  const FLUIDO = { multi: { w: 3, d: '' }, crudo: { w: 2.4, d: '' }, gas: { w: 2, d: '8 4' }, agua: { w: 2, d: '2 3' }, elec: { w: 2, d: '' }, aire: { w: 2, d: '6 4' } }
  function linea(pts, fluido = 'crudo', o = {}) {
    const f = FLUIDO[fluido], c = o.sinFlujo ? 'var(--dato3)' : 'var(--dato1)'
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ')
    let g = `<path d="${d}" fill="none" stroke="${c}" stroke-width="${f.w}"${f.d ? ` stroke-dasharray="${f.d}"` : ''}${o.sinFlujo ? ' opacity=".55"' : ''} stroke-linejoin="miter"/>`
    if (o.flecha !== false) {
      const [a, b] = [pts[pts.length - 2], pts[pts.length - 1]], ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI
      g += `<path d="M0 -4.5 L8 0 L0 4.5Z" fill="${c}" transform="translate(${b[0]} ${b[1]}) rotate(${ang}) translate(-8 0)"/>`
    }
    return g
  }

  /** La cifra: número tabular grande, unidad corta, rótulo y, si aporta, su minigráfica. */
  function cifra(o) {
    const est = o.estado || 'normal'
    const valor = est === 'sincom' ? '---' : est === 'sindato' ? '—' : o.valor
    return `<div class="kit-cifra kit-cifra--${o.tam || 'l'} es-${est}">
      <div class="kit-cifra__rotulo">${esc(o.rotulo)}</div>
      <div class="kit-cifra__fila">${o.marca ? marca(o.marca, o.tam === 'xl' ? 20 : 16) : ''}${est === 'sincom' ? marca('sincom', 16) : ''}<span class="kit-cifra__n">${valor}</span><span class="kit-cifra__u">${esc(o.unidad || '')}</span></div>
      ${o.nota ? `<div class="kit-cifra__nota">${o.nota}</div>` : ''}
    </div>`
  }

  window.KIT = { n, esc, marca, barra, tendencia, bomba, tanque, valvula, separador, area, pozo, medidor, linea, cifra, PAL, FLUIDO }
})()
