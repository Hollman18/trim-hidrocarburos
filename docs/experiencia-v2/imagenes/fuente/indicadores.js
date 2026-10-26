// X5 · Indicadores de A en estilo B: el analógico de alto desempeño (X2 §5.1), la minitendencia (X2 §5.3)
// y el esquema del tren de agua de P-201B (nivel 3). Señales y límites del demo (datos/datos-demo.json).
// El rango del instrumento y el disparo no los da el motor todavía (X2 §7, pedido 4): la escala no rotula
// sus extremos y no se dibuja disparo.

// Analógico: pista, banda normal con raya en sus extremos, límite de alarma, puntero en tinta.
function analogico(svg, { ancho = 200, escala, banda, alarma, valor, parada = false }) {
  const [e0, e1] = escala, X = v => 6 + (Math.min(Math.max(v, e0), e1) - e0) / (e1 - e0) * (ancho - 12), y = 22
  el(svg, 'rect', { x: 6, y: y - 3, width: ancho - 12, height: 6, rx: 3, fill: 'var(--pista)' })
  const b0 = banda[0] == null ? e0 : banda[0], b1 = banda[1] == null ? e1 : banda[1]
  el(svg, 'rect', { x: X(b0), y: y - 6, width: X(b1) - X(b0), height: 12, rx: 3, fill: 'var(--banda)' })
  if (banda[0] != null) el(svg, 'line', { x1: X(b0), x2: X(b0), y1: y - 8, y2: y + 8, stroke: 'var(--tinta3)', 'stroke-width': 1.5 })
  if (banda[1] != null) el(svg, 'line', { x1: X(b1), x2: X(b1), y1: y - 8, y2: y + 8, stroke: 'var(--tinta3)', 'stroke-width': 1.5 })
  if (alarma != null) el(svg, 'line', { x1: X(alarma), x2: X(alarma), y1: y - 10, y2: y + 10, stroke: 'var(--tinta)', 'stroke-width': 2.4 })
  const xp = X(valor)
  el(svg, 'path', { d: `M${xp - 6} 4 L${xp + 6} 4 L${xp} 13 Z`, fill: parada ? 'var(--tinta3)' : 'var(--tinta)' })
  el(svg, 'line', { x1: xp, x2: xp, y1: 12, y2: y + 6, stroke: parada ? 'var(--tinta3)' : 'var(--tinta)', 'stroke-width': 2 })
}

// Minitendencia: la serie (12 lecturas diarias), la banda normal sombreada y el último punto.
function minitendencia(svg, { ancho = 150, alto = 36, serie, banda, escala }) {
  const [e0, e1] = escala, X = i => 3 + i / (serie.length - 1) * (ancho - 8), Y = v => alto - 4 - (v - e0) / (e1 - e0) * (alto - 8)
  const b0 = banda[0] == null ? e0 : banda[0], b1 = banda[1] == null ? e1 : banda[1]
  el(svg, 'rect', { x: 2, y: Y(b1), width: ancho - 4, height: Y(b0) - Y(b1), fill: 'var(--banda)', opacity: .55 })
  el(svg, 'path', { d: serie.map((v, i) => `${i ? 'L' : 'M'}${X(i)} ${Y(v)}`).join(' '), fill: 'none', stroke: 'var(--dato1)', 'stroke-width': 1.8, 'stroke-linejoin': 'round' })
  el(svg, 'circle', { cx: X(serie.length - 1), cy: Y(serie.at(-1)), r: 3, fill: 'var(--dato1)' })
}

// Tendencia grande (una de las gráficas chicas iguales, X2 §5.3 punto 7).
function tendencia(svg, { ancho = 300, alto = 74, serie, banda, escala, nombre, unidad, alarma }) {
  const G = { x0: 34, x1: ancho - 4, y0: 6, y1: alto - 18 }, [e0, e1] = escala
  const X = i => G.x0 + i / (serie.length - 1) * (G.x1 - G.x0), Y = v => G.y1 - (v - e0) / (e1 - e0) * (G.y1 - G.y0)
  const b0 = banda[0] == null ? e0 : banda[0], b1 = banda[1] == null ? e1 : banda[1]
  el(svg, 'rect', { x: G.x0, y: Y(b1), width: G.x1 - G.x0, height: Y(b0) - Y(b1), fill: 'var(--banda)', opacity: .55 })
  if (alarma != null) el(svg, 'line', { x1: G.x0, x2: G.x1, y1: Y(alarma), y2: Y(alarma), stroke: 'var(--tinta2)', 'stroke-width': 1.3, 'stroke-dasharray': '4 3' })
  for (const v of [e0, e1]) el(svg, 'text', { x: G.x0 - 6, y: Y(v) + 4, 'text-anchor': 'end', 'font-size': 12, fill: 'var(--tinta3)' }, n0(v))
  el(svg, 'line', { x1: G.x0, x2: G.x1, y1: G.y1, y2: G.y1, stroke: 'var(--linea)', 'stroke-width': 1 })
  el(svg, 'path', { d: serie.map((v, i) => `${i ? 'L' : 'M'}${X(i)} ${Y(v)}`).join(' '), fill: 'none', stroke: 'var(--dato1)', 'stroke-width': 2, 'stroke-linejoin': 'round' })
  el(svg, 'circle', { cx: X(serie.length - 1), cy: Y(serie.at(-1)), r: 3.2, fill: 'var(--dato1)' })
  el(svg, 'text', { x: G.x0, y: alto - 3, 'font-size': 12, fill: 'var(--tinta3)' }, '21 sep')
  el(svg, 'text', { x: G.x1, y: alto - 3, 'text-anchor': 'end', 'font-size': 12, fill: 'var(--tinta2)', 'font-weight': 600 }, 'hoy, 2 oct')
}

// Esquema del tren de agua (nivel 3, «aquí sí puede parecerse a un P&ID», X2 §3.1): tanque, tres bombas en paralelo, instrumentos.
function trenAgua(svg) {
  defsTuberia(svg)
  const L = { stroke: 'var(--agua)', 'stroke-width': 4, fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }
  texto(svg, 6, 22, 'Tanque', { 'font-weight': 600, fill: 'var(--tinta)' })
  el(svg, 'rect', { x: 6, y: 36, width: 50, height: 112, rx: 8, fill: 'var(--panel)', stroke: 'var(--pared)', 'stroke-width': 1.6 })
  el(svg, 'rect', { x: 10, y: 40 + 104 * (1 - .896), width: 42, height: 104 * .896, rx: 5, fill: 'var(--dato3)' })
  el(svg, 'line', { x1: 0, x2: 62, y1: 40 + 104 * .1, y2: 40 + 104 * .1, stroke: 'var(--tinta)', 'stroke-width': 1.6 })
  texto(svg, 6, 170, [{ t: '89,6 %', at: B }])
  texto(svg, 6, 187, 'alto-alto 90 %')
  el(svg, 'path', { d: 'M56 124 L100 124 M100 52 L100 196 M100 52 L134 52 M100 124 L134 124 M100 196 L134 196', ...L })
  el(svg, 'path', { d: 'M166 52 L250 52 M166 196 L250 196 M250 52 L250 196 M250 124 L360 124', ...L })
  el(svg, 'path', { d: 'M166 124 L250 124', ...L, 'stroke-dasharray': '6 5' })
  el(svg, 'line', { x1: 352, y1: 124, x2: 360, y2: 124, stroke: 'var(--agua)', 'stroke-width': 4, 'marker-end': 'url(#fl)' })
  for (const [y, tag, parada] of [[52, 'P-201A', false], [124, 'P-201B', true], [196, 'P-201C', false]]) {
    if (parada) el(svg, 'circle', { cx: 150, cy: y, r: 17, fill: 'var(--eq-parado)', stroke: 'var(--tinta)', 'stroke-width': 2.2 })
    else el(svg, 'circle', { cx: 150, cy: y, r: 16, fill: 'var(--panel)', stroke: 'var(--tinta3)', 'stroke-width': 1.6, 'stroke-dasharray': '4 3' })
    el(svg, 'path', { d: `M144 ${y - 7} L157 ${y} L144 ${y + 7} Z`, fill: parada ? 'var(--eq-marcha)' : 'none', stroke: parada ? 'none' : 'var(--tinta3)', 'stroke-width': 1.3 })
    texto(svg, 174, y - 10, tag, { 'font-family': 'AirC', 'font-weight': 700, 'font-size': 13, fill: 'var(--tinta)' })
    if (!parada) marca(svg, 'sininst', 226, y - 22, 14)
  }
  marca(svg, 'p1', 124, 98, 16)
  const burbuja = (x, y, letras, val, desde) => {
    el(svg, 'line', { x1: x, y1: desde, x2: x, y2: y + (y > desde ? -14 : 14), stroke: 'var(--tinta2)', 'stroke-width': 1, 'stroke-dasharray': '2 2' })
    el(svg, 'circle', { cx: x, cy: y, r: 16.5, fill: 'var(--panel)', stroke: 'var(--tinta2)', 'stroke-width': 1.4 })
    el(svg, 'line', { x1: x - 16.5, x2: x + 16.5, y1: y, y2: y, stroke: 'var(--tinta2)', 'stroke-width': 1 })
    texto(svg, x, y - 3, letras, { 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: 'var(--tinta)' })
    texto(svg, x, y + 12, val, { 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--tinta2)' })
  }
  burbuja(117, 160, 'PI', '18,2', 124)
  burbuja(210, 160, 'PDI', '0', 124)
  burbuja(306, 160, 'FI', '0', 124)
  texto(svg, 360, 112, 'a los inyectores', { 'text-anchor': 'end' })
  texto(svg, 360, 216, [{ t: '174.033', at: B }, ' bbl/d entran:'], { 'text-anchor': 'end' })
  texto(svg, 360, 233, 'las toman P-201A y P-201C', { 'text-anchor': 'end' })
}
