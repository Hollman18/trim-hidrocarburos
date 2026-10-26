// X5 · La tubería de C dibujada con el lenguaje de B (tubo claro y redondeado), y las barras de A en estilo B.
// Tres capas (X4 §4.2): el contorno es lo que cabe; el núcleo, lo que pasa; el rayado, lo que no pasa, en su tramo.
// Cifras del demo, La Ceiba, 2-oct 14:00 (datos/datos-demo.json). SVG propio, sin librerías (X3).
const NS = 'http://www.w3.org/2000/svg'
function el(padre, tag, at, txt) { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (txt != null) e.textContent = txt; padre.appendChild(e); return e }
function marca(padre, tipo, x, y, t) { const g = el(padre, 'g', { transform: `translate(${x} ${y})` }); g.innerHTML = MK[tipo](t); return g }
function texto(padre, x, y, partes, at = {}) {
  const t = el(padre, 'text', { x, y, 'font-size': 13, fill: 'var(--tinta2)', ...at })
  for (const p of [].concat(partes)) { if (typeof p === 'string') t.appendChild(document.createTextNode(p)); else el(t, 'tspan', p.at || {}, p.t) }
  return t
}
const B = { 'font-weight': 700, fill: 'var(--tinta)' }
function defsTuberia(svg) {
  const d = el(svg, 'defs', {})
  d.innerHTML = `
  <pattern id="rayas" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="var(--rayado)" stroke-width="1.7"/></pattern>
  <pattern id="roca" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="var(--pared)"/><circle cx="5.5" cy="5.5" r="1" fill="var(--pared)"/></pattern>
  <marker id="fl" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto"><path d="M1 1 L9 5 L1 9" fill="none" stroke="var(--agua)" stroke-width="2.2" stroke-linecap="round"/></marker>`
}
const KCAP = 14000

// ───────── Escritorio: la tubería acostada, con sus rótulos debajo como la línea de B ─────────
// En el tramo donde se trabó, la pared se angosta y abraza lo que pasa; el hueco que falta queda rayado ahí adentro.
function tuberiaCampo(svg, { ancho = 708 } = {}) {
  defsTuberia(svg)
  const cy = 52, k = 88 / KCAP, h = v => v * k / 2
  const T = [[110, 244, 11857], [256, 452, 13000], [464, 556, 14000]]
  const hf = h(9394), hr = 1665 * k
  // el angostamiento, dentro de la planta: hoy, sin P-201B, la planta deja pasar unos 9.445 bbl/d de crudo (demo, Planta)
  const ang = { x0: 292, x1: 416, top: cy - h(9445), bot: cy + h(9445) }
  el(svg, 'rect', { x: 22, y: cy - 44, width: 76, height: 88, rx: 18, fill: 'var(--roca)' })
  el(svg, 'rect', { x: 22, y: cy - 44, width: 76, height: 88, rx: 18, fill: 'url(#roca)', opacity: .45 })
  // borde de arriba y de abajo, de izquierda a derecha, con el angostamiento en la planta
  const borde = s => {
    const y = v => cy + s * h(v), yA = s < 0 ? ang.top : ang.bot
    let d = ''
    T.forEach((t, i) => {
      if (i === 1) d += ` L${ang.x0 - 16} ${y(t[2])} C${ang.x0 - 6} ${y(t[2])} ${ang.x0 - 8} ${yA} ${ang.x0} ${yA} L${ang.x1} ${yA} C${ang.x1 + 8} ${yA} ${ang.x1 + 6} ${y(t[2])} ${ang.x1 + 16} ${y(t[2])}`
      d += ` L${t[1]} ${y(t[2])}`
      const n = T[i + 1]; if (n) d += ` C${t[1] + 7} ${y(t[2])} ${n[0] - 7} ${y(n[2])} ${n[0]} ${y(n[2])}`
    })
    return d
  }
  const p0 = T[0], u = T[2], y0 = v => cy - h(v)
  const arriba = `M${p0[0] + 10} ${y0(p0[2])}` + borde(-1)
  // la vuelta: armar el borde de abajo de derecha a izquierda con los mismos puntos
  const pts = []
  const re = /([LC])([^LC]*)/g; let m
  const b = borde(1); while ((m = re.exec(b))) pts.push([m[1], m[2].trim().split(/\s+/).map(Number)])
  let back = ''
  for (let i = pts.length - 1; i > 0; i--) {
    const [tipo, v] = pts[i], ant = pts[i - 1][1].slice(-2)
    back += tipo === 'L' ? ` L${ant[0]} ${ant[1]}` : ` C${v[2]} ${v[3]} ${v[0]} ${v[1]} ${ant[0]} ${ant[1]}`
  }
  const fin = pts[pts.length - 1][1].slice(-2)
  const d = arriba + ` Q${u[1] + 10} ${y0(u[2])} ${u[1] + 10} ${y0(u[2]) + 10} L${u[1] + 10} ${cy + h(u[2]) - 10} Q${u[1] + 10} ${cy + h(u[2])} ${fin[0]} ${fin[1]}` + back + ` L${p0[0] + 10} ${cy + h(p0[2])} Q${p0[0]} ${cy + h(p0[2])} ${p0[0]} ${cy + h(p0[2]) - 10} L${p0[0]} ${y0(p0[2]) + 10} Q${p0[0]} ${y0(p0[2])} ${p0[0] + 10} ${y0(p0[2])} Z`
  el(svg, 'path', { d, fill: 'var(--tubo-vacio)', stroke: 'var(--pared)', 'stroke-width': 1.5, 'stroke-linejoin': 'round' })
  // «limita»: doble contorno en tinta, nunca rojo
  el(svg, 'rect', { x: p0[0] - 5, y: y0(p0[2]) - 5, width: p0[1] - p0[0] + 10, height: 2 * h(p0[2]) + 10, rx: 15, fill: 'none', stroke: 'var(--tinta)', 'stroke-width': 1.6 })
  // lo que pasa ahora (9.394 bbl/d): el mismo núcleo en todos los tramos, con la flecha a la venta
  const xf = 566
  el(svg, 'path', { d: `M86 ${cy - hf} L${xf} ${cy - hf} L${xf} ${cy - hf - 8} L${xf + 22} ${cy} L${xf} ${cy + hf + 8} L${xf} ${cy + hf} L86 ${cy + hf} Z`, fill: 'var(--flujo)' })
  // lo que no pasa (1.665 bbl/d): el hueco rayado, adentro del angostamiento de la planta
  // la pared de siempre, en discontinuo, para que se vea cuánto se angostó
  for (const yv of [cy - h(13000), cy + h(13000)]) el(svg, 'line', { x1: ang.x0 - 4, x2: ang.x1 + 4, y1: yv, y2: yv, stroke: 'var(--pared)', 'stroke-width': 1.3, 'stroke-dasharray': '4 3' })
  el(svg, 'rect', { x: ang.x0 + 2, y: ang.top - hr, width: ang.x1 - ang.x0 - 4, height: hr, fill: 'url(#rayas)', stroke: 'var(--rayado)', 'stroke-width': 1.3 })
  // rótulos debajo, como los puntos de la línea de B
  const ry = cy + 44 + 22, NOM = { 'font-size': 15, 'font-weight': 600, fill: 'var(--tinta)' }
  texto(svg, 22, ry, 'Yacimiento', NOM); texto(svg, 22, ry + 18, 'la roca')
  texto(svg, 118, ry, ['Pozos · ', { t: '◄ limita', at: B }], NOM); texto(svg, 118, ry + 18, '15 de 18 en marcha')
  texto(svg, 268, ry, 'Planta · aquí se trabó', NOM); texto(svg, 268, ry + 18, ['no pasan ', { t: '1.665 bbl/d', at: B }])
  texto(svg, 474, ry, 'Salida', NOM); texto(svg, 474, ry + 18, 'el oleoducto recibe')
  texto(svg, 606, ry, 'Sale hoy', NOM); texto(svg, 606, ry + 18, [{ t: '9.394', at: B }, ' bbl/d']); texto(svg, 606, ry + 35, 'meta 10.900')
  // la rama del agua: baja de la planta, pasa el tanque y las bombas, y vuelve al yacimiento por los inyectores
  const xb = 440, yb = 198, ag = { stroke: 'var(--agua)', 'stroke-width': 4.5, fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }
  el(svg, 'path', { d: `M${xb} ${cy + h(13000)} L${xb} ${yb - 12} Q${xb} ${yb} ${xb - 12} ${yb} L20 ${yb} Q8 ${yb} 8 ${yb - 12} L8 ${cy + 26} Q8 ${cy + 14} 20 ${cy + 14} L22 ${cy + 14}`, ...ag })
  for (const [x1, y1, x2, y2] of [[xb, 116, xb, 122], [250, yb, 244, yb], [100, yb, 94, yb], [8, 116, 8, 110]]) el(svg, 'line', { x1, y1, x2, y2, stroke: 'var(--agua)', 'stroke-width': 4.5, 'marker-end': 'url(#fl)' })
  const tq = { x: xb - 10, y: 144, w: 20, h: 34 }
  el(svg, 'rect', { x: tq.x, y: tq.y, width: tq.w, height: tq.h, rx: 4, fill: 'var(--panel)', stroke: 'var(--pared)', 'stroke-width': 1.5 })
  el(svg, 'rect', { x: tq.x + 2.5, y: tq.y + 2.5 + (tq.h - 5) * (1 - .896), width: tq.w - 5, height: (tq.h - 5) * .896, rx: 2, fill: 'var(--dato3)' })
  el(svg, 'line', { x1: tq.x - 5, x2: tq.x + tq.w + 5, y1: tq.y + 2.5 + (tq.h - 5) * .1, y2: tq.y + 2.5 + (tq.h - 5) * .1, stroke: 'var(--tinta)', 'stroke-width': 1.5 })
  texto(svg, xb - 18, 166, 'agua que entra: 174.033 bbl/d', { 'text-anchor': 'end' })
  texto(svg, xb + 18, 160, ['tanque ', { t: '89,6 %', at: B }])
  texto(svg, xb + 18, 177, 'alto-alto 90 %')
  // las tres bombas de agua, en paralelo: la parada, oscura y con su única marca; las otras dos, sin instrumento
  for (const [x, parada] of [[402, false], [378, true], [354, false]]) {
    if (parada) el(svg, 'circle', { cx: x, cy: yb, r: 9.5, fill: 'var(--eq-parado)', stroke: 'var(--tinta)', 'stroke-width': 2 })
    else el(svg, 'circle', { cx: x, cy: yb, r: 8.5, fill: 'var(--panel)', stroke: 'var(--tinta3)', 'stroke-width': 1.5, 'stroke-dasharray': '3 2.4' })
  }
  marca(svg, 'p1', 361, yb - 27, 15)
  texto(svg, 422, yb + 25, [{ t: 'P-201B parada', at: B }, ' desde 03:52 · las otras dos, sin instrumento'], { 'text-anchor': 'end' })
  texto(svg, 24, yb - 9, 'inyectores: el agua vuelve al yacimiento')
  // sin identificar: aparte, con borde discontinuo (no es un tramo)
  const sx = 556
  el(svg, 'rect', { x: sx, y: 162, width: ancho - sx - 1, height: 62, rx: 14, fill: 'none', stroke: 'var(--tinta3)', 'stroke-width': 1.4, 'stroke-dasharray': '5 4' })
  texto(svg, sx + 14, 184, [{ t: 'LC-21 · 301 bbl/d', at: B }])
  texto(svg, sx + 14, 202, 'sin identificar')
  texto(svg, sx + 14, 217, 'Pedir la causa ›', { 'font-weight': 600, fill: 'var(--tinta)' })
}

// ───────── Teléfono: la misma tubería, de pie, con los rótulos a la derecha ─────────
function tuberiaDePie(svg, { ancho = 326 } = {}) {
  defsTuberia(svg)
  const cx = 34, k = 60 / KCAP, w = v => v * k / 2
  const T = [[66, 146, 11857], [158, 290, 13000], [302, 348, 14000]]
  const hf = w(9394), hr = 1665 * k
  const ang = { y0: 178, y1: 270, izq: cx - w(9445), der: cx + w(9445) }
  el(svg, 'rect', { x: cx - 28, y: 2, width: 56, height: 52, rx: 16, fill: 'var(--roca)' })
  el(svg, 'rect', { x: cx - 28, y: 2, width: 56, height: 52, rx: 16, fill: 'url(#roca)', opacity: .45 })
  // un lado del tubo, de arriba abajo, con el angostamiento en la planta
  const lado = sgn => {
    const x = v => cx + sgn * w(v), xA = sgn < 0 ? ang.izq : ang.der
    let d = ''
    T.forEach((t, i) => {
      if (i === 1) d += ` L${x(t[2])} ${ang.y0 - 14} C${x(t[2])} ${ang.y0 - 5} ${xA} ${ang.y0 - 7} ${xA} ${ang.y0} L${xA} ${ang.y1} C${xA} ${ang.y1 + 7} ${x(t[2])} ${ang.y1 + 5} ${x(t[2])} ${ang.y1 + 14}`
      d += ` L${x(t[2])} ${t[1]}`
      const n = T[i + 1]; if (n) d += ` C${x(t[2])} ${t[1] + 6} ${x(n[2])} ${n[0] - 6} ${x(n[2])} ${n[0]}`
    })
    return d
  }
  const p0 = T[0], u = T[2]
  const izq = `M${cx - w(p0[2])} ${p0[0] + 8}` + lado(-1)
  const pts = []; const re = /([LC])([^LC]*)/g; let m; const b = lado(1)
  while ((m = re.exec(b))) pts.push([m[1], m[2].trim().split(/\s+/).map(Number)])
  let back = ''
  for (let i = pts.length - 1; i > 0; i--) { const [tipo, v] = pts[i], ant = pts[i - 1][1].slice(-2); back += tipo === 'L' ? ` L${ant[0]} ${ant[1]}` : ` C${v[2]} ${v[3]} ${v[0]} ${v[1]} ${ant[0]} ${ant[1]}` }
  const fin = pts[pts.length - 1][1].slice(-2)
  const d = izq + ` Q${cx - w(u[2])} ${u[1] + 8} ${cx - w(u[2]) + 8} ${u[1] + 8} L${fin[0] - 8} ${u[1] + 8} Q${fin[0]} ${u[1] + 8} ${fin[0]} ${fin[1]}` + back + ` L${cx + w(p0[2])} ${p0[0] + 8} Q${cx + w(p0[2])} ${p0[0]} ${cx + w(p0[2]) - 8} ${p0[0]} L${cx - w(p0[2]) + 8} ${p0[0]} Q${cx - w(p0[2])} ${p0[0]} ${cx - w(p0[2])} ${p0[0] + 8} Z`
  el(svg, 'path', { d, fill: 'var(--tubo-vacio)', stroke: 'var(--pared)', 'stroke-width': 1.5, 'stroke-linejoin': 'round' })
  el(svg, 'rect', { x: cx - w(p0[2]) - 4, y: p0[0] - 4, width: 2 * w(p0[2]) + 8, height: p0[1] - p0[0] + 8, rx: 12, fill: 'none', stroke: 'var(--tinta)', 'stroke-width': 1.6 })
  el(svg, 'path', { d: `M${cx - hf} 44 L${cx - hf} 352 L${cx - hf - 7} 352 L${cx} 372 L${cx + hf + 7} 352 L${cx + hf} 352 L${cx + hf} 44 Z`, fill: 'var(--flujo)' })
  for (const xv of [cx - w(13000), cx + w(13000)]) el(svg, 'line', { x1: xv, x2: xv, y1: ang.y0 - 4, y2: ang.y1 + 4, stroke: 'var(--pared)', 'stroke-width': 1.3, 'stroke-dasharray': '4 3' })
  el(svg, 'rect', { x: ang.der, y: ang.y0 + 2, width: hr, height: ang.y1 - ang.y0 - 4, fill: 'url(#rayas)', stroke: 'var(--rayado)', 'stroke-width': 1.2 })
  // el ramal del agua sale de la planta como un renglón propio
  el(svg, 'path', { d: `M${cx + w(13000)} 282 L84 282`, stroke: 'var(--agua)', 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' })
  const x = 90, NOM = { 'font-size': 15, 'font-weight': 600, fill: 'var(--tinta)' }
  texto(svg, x, 24, 'Yacimiento', NOM); texto(svg, x, 42, 'la roca')
  texto(svg, x, 100, ['Pozos · ', { t: '◄ limita', at: B }], NOM); texto(svg, x, 118, '15 de 18 en marcha')
  texto(svg, x, 196, 'Planta · aquí se trabó', NOM)
  texto(svg, x, 216, ['no pasan ', { t: '1.665 bbl/d', at: B }], { 'font-size': 14 })
  texto(svg, x, 236, 'se angostó: con P-201B parada')
  texto(svg, x, 253, 'el agua no da para más crudo')
  marca(svg, 'p1', x, 272, 15)
  texto(svg, x + 21, 285, [{ t: 'P-201B', at: B }, ' parada · tanque ', { t: '89,6 %', at: B }])
  texto(svg, x, 321, 'Salida', NOM); texto(svg, x, 339, 'el oleoducto recibe')
  texto(svg, x, 372, ['Sale hoy ', { t: '9.394 bbl/d', at: B }], NOM); texto(svg, x, 390, 'meta 10.900')
  el(svg, 'rect', { x: 1, y: 406, width: ancho - 2, height: 46, rx: 14, fill: 'none', stroke: 'var(--tinta3)', 'stroke-width': 1.4, 'stroke-dasharray': '5 4' })
  texto(svg, 16, 434, [{ t: 'LC-21 · 301 bbl/d', at: B }, ' sin identificar'])
  texto(svg, ancho - 14, 434, 'Pedir la causa ›', { 'text-anchor': 'end', 'font-weight': 600, fill: 'var(--tinta)' })
}

// ───────── Mini tubería de una fila (todos los campos) o de una pregunta ─────────
// donde: 0 pozos, 1 planta, 2 salida; null si nada se trabó ahora.
function miniTuberia(svg, { ancho = 300, donde = null } = {}) {
  defsTuberia(svg)
  const cy = 12, al = 20, nucleo = 8, L = ancho - 22
  const seg = [[0, .34], [.37, .71], [.74, 1]].map(([a, b]) => [a * L, b * L])
  // tres tramos (pozos, planta, salida); el que se trabó se angosta y su hueco va rayado
  seg.forEach(([a, b], i) => {
    const trabado = i === donde, h = trabado ? nucleo + 6 : al
    el(svg, 'rect', { x: a, y: cy - h / 2, width: b - a, height: h, rx: h / 2, fill: 'var(--tubo-vacio)', stroke: 'var(--pared)', 'stroke-width': 1.2 })
    if (trabado) {
      for (const yv of [cy - al / 2, cy + al / 2 - .5]) el(svg, 'line', { x1: a + 6, x2: b - 6, y1: yv, y2: yv, stroke: 'var(--pared)', 'stroke-width': 1, 'stroke-dasharray': '3 2.5' })
      el(svg, 'rect', { x: a + 8, y: cy - al / 2 + 1, width: b - a - 16, height: al / 2 - nucleo / 2 - 4, fill: 'url(#rayas)', stroke: 'var(--rayado)', 'stroke-width': .9 })
    }
  })
  el(svg, 'path', { d: `M3 ${cy - nucleo / 2} L${L + 4} ${cy - nucleo / 2} L${L + 4} ${cy - nucleo / 2 - 4} L${ancho} ${cy} L${L + 4} ${cy + nucleo / 2 + 4} L${L + 4} ${cy + nucleo / 2} L3 ${cy + nucleo / 2} Z`, fill: 'var(--flujo)' })
}

// ───────── Barras de A en estilo B: diferido por día, mes a mes, contra el máximo firmado ─────────
function barrasMes(svg, { ancho = 308, alto = 112 } = {}) {
  const M = [['OCT', 544, 421], ['NOV', 249, 160], ['DIC', 207, 202], ['ENE', 173, 24], ['FEB', 834, 834], ['MAR', 549, 406], ['ABR', 336, 278], ['MAY', 434, 431], ['JUN', 384, 310], ['JUL', 563, 476], ['AGO', 275, 145], ['SEP', 257, 249], ['OCT', 661, 362]]
  const G = { x0: 28, x1: ancho, y0: 14, y1: alto - 20 }, Y = v => G.y1 - v / 900 * (G.y1 - G.y0)
  const paso = (G.x1 - G.x0) / M.length, an = Math.min(14, paso * .62)
  for (const v of [0, 400, 800]) { el(svg, 'line', { x1: G.x0, x2: G.x1, y1: Y(v), y2: Y(v), stroke: 'var(--linea2)', 'stroke-width': 1 }); if (v) el(svg, 'text', { x: G.x0 - 6, y: Y(v) + 4, 'text-anchor': 'end', 'font-size': 12, fill: 'var(--tinta3)' }, n0(v)) }
  M.forEach(([m, tot, alto_], i) => {
    const x = G.x0 + paso * i + (paso - an) / 2, ult = i === M.length - 1
    el(svg, 'path', { d: `M${x} ${G.y1} L${x} ${Y(tot) + 3} Q${x} ${Y(tot)} ${x + 3} ${Y(tot)} L${x + an - 3} ${Y(tot)} Q${x + an} ${Y(tot)} ${x + an} ${Y(tot) + 3} L${x + an} ${G.y1} Z`, fill: 'var(--dato3)' })
    el(svg, 'rect', { x, y: Y(alto_), width: an, height: G.y1 - Y(alto_), fill: 'var(--dato1)' })
    el(svg, 'line', { x1: x - 3, x2: x + an + 3, y1: Y(800), y2: Y(800), stroke: 'var(--tinta)', 'stroke-width': 1.6, 'stroke-dasharray': '4 2.5' })
    if (tot > 800) marca(svg, 'p3', x + an / 2 - 6, Y(tot) - 15, 12)
    if (ult) { el(svg, 'rect', { x: x - 2.5, y: Y(tot) - 2.5, width: an + 5, height: G.y1 - Y(tot) + 2.5, rx: 4, fill: 'none', stroke: 'var(--tinta)', 'stroke-width': 1.3, 'stroke-dasharray': '3 2' }) }
    if (i % 3 === 0) el(svg, 'text', { x: x + an / 2, y: G.y1 + 15, 'text-anchor': 'middle', 'font-family': 'AirC', 'font-weight': ult ? 700 : 500, 'font-size': 12, fill: ult ? 'var(--tinta)' : 'var(--tinta2)' }, m + (i === 0 ? ' 2025' : i === 3 ? ' 2026' : ''))
  })
}
