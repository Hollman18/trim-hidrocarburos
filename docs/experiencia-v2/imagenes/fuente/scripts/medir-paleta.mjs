// X5 · Contraste WCAG 2.2 y separación de los colores de estado con daltonismo
// (OKLab ×100 con la simulación de Machado, Oliveira y Fernandes 2009, severidad 1). El método de X1 §3.5.
const hex = h => { const n = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(n.slice(i, i + 2), 16) / 255) }
const lin = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const Lum = h => { const [r, g, b] = hex(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
const ratio = (a, b) => { const [x, y] = [Lum(a), Lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
const ok = ([r, g, b]) => { const l = Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b), m = Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b), s = Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b); return [.2104542553*l+.793617785*m-.0040720468*s, 1.9779984951*l-2.428592205*m+.4505937099*s, .0259040371*l+.7827717662*m-.808675766*s] }
const d = (a, b) => { const p = ok(a), q = ok(b); return Math.hypot(p[0]-q[0], p[1]-q[1], p[2]-q[2]) * 100 }
const M = { protan: [[.152286,1.052583,-.204868],[.114503,.786281,.099216],[-.003882,-.048116,1.051998]], deutan: [[.367322,.860646,-.227968],[.280085,.672501,.047413],[-.01182,.04294,.968881]], tritan: [[1.255528,-.076749,-.178779],[-.078411,.930809,.147602],[.004733,.691367,.3039]] }
const sim = (h, t) => { const c = hex(h).map(lin); return t ? M[t].map(f => Math.min(1, Math.max(0, f[0]*c[0]+f[1]*c[1]+f[2]*c[2]))) : c }
const f2 = n => n.toFixed(2).replace('.', ',')
const mezcla = (a, b, t) => '#' + hex(a).map((v, i) => Math.round((v*(1-t) + hex(b)[i]*t) * 255).toString(16).padStart(2, '0')).join('')
const TEMAS = {
  papel: { fondos: { suelo:'#efede8', superficie:'#f6f5f1', panel:'#fcfbf8', panel2:'#f3f1ec', elevado:'#ffffff' }, texto: { tinta:'#15171a', tinta2:'#464b52', tinta3:'#5b6168' },
    graficos: { 'flujo (dato-1)':'#3a3f45', 'pared del tubo y «lo demás» (dato-3)':'#7a8087', 'rayado (tinta2)':'#464b52', 'agua':'#7a8087' },
    estado: { interlock:'#8b1a1a', alarma:'#bf4000', 'atención y aviso':'#f9a825', 'sin comunicación':'#8420a3' }, trazoAmarillo:'#1f2328' },
  noche: { fondos: { suelo:'#1a1d21', superficie:'#202328', panel:'#262a2f', panel2:'#23272c', elevado:'#2e3238' }, texto: { tinta:'#f3f4f5', tinta2:'#c8cdd3', tinta3:'#a3aab2' },
    graficos: { 'flujo (dato-1)':'#d9dde1', 'pared del tubo y «lo demás» (dato-3)':'#878e96', 'rayado (tinta2)':'#c8cdd3', 'agua':'#878e96' },
    estado: { interlock:'#ff8080', alarma:'#ffb347', 'atención y aviso':'#fff176', 'sin comunicación':'#c99cff' } },
}
let fallas = 0
for (const [tema, T] of Object.entries(TEMAS)) {
  console.log(`\n### ${tema}`)
  const minimo = c => Math.min(...Object.values(T.fondos).map(f => ratio(c, f)))
  for (const [k, v] of Object.entries(T.texto)) { const m = minimo(v); if (m < 4.5) fallas++; console.log(`texto ${k} ${v}: mínimo ${f2(m)} ${m >= 4.5 ? 'AA' : 'FALLA'}`) }
  for (const [k, v] of Object.entries(T.graficos)) { const m = minimo(v); if (m < 3) fallas++; console.log(`gráfico ${k} ${v}: mínimo ${f2(m)} ${m >= 3 ? '≥ 3:1' : 'FALLA'}`) }
  for (const [k, v] of Object.entries(T.estado)) {
    const m = minimo(v), conTrazo = tema === 'papel' && k === 'atención y aviso'
    if (m < 3 && !conTrazo) fallas++
    console.log(`estado ${k} ${v}: mínimo ${f2(m)}${conTrazo ? ` → lleva trazo ${T.trazoAmarillo}: ${f2(minimo(T.trazoAmarillo))}` : m >= 3 ? ' ≥ 3:1' : ' FALLA'}`)
  }
  const E = Object.entries(T.estado)
  console.log('separación ΔOK×100 (normal · protan · deutan · tritan; ≥ 10 se separa a simple vista):')
  for (let i = 0; i < E.length; i++) for (let j = i + 1; j < E.length; j++) {
    const xs = [null, 'protan', 'deutan', 'tritan'].map(t => d(sim(E[i][1], t), sim(E[j][1], t)))
    if (Math.min(...xs) < 10) fallas++
    console.log(`  ${E[i][0]} – ${E[j][0]}: ${xs.map(f2).join(' · ')}`)
  }
  const ind = '#142d88'
  console.log(`  índigo de marca contra cada estado (normal/deutan): ${E.map(([k, v]) => `${k} ${f2(d(sim(ind), sim(v)))}/${f2(d(sim(ind, 'deutan'), sim(v, 'deutan')))}`).join(' · ')}`)
}
console.log('\n### pares propios de la mezcla')
const activo = mezcla('#142d88', '#ffffff', 0.14)
for (const [n, a, b, min] of [
  ['blanco sobre el índigo (riel, banda, botón)', '#ffffff', '#142d88', 4.5],
  ['rótulo inactivo del riel #c9d1f0 sobre índigo', '#c9d1f0', '#142d88', 4.5],
  [`rótulo activo blanco sobre la capa activa ${activo}`, '#ffffff', activo, 4.5],
  ['insignia: tinta sobre blanco', '#15171a', '#ffffff', 4.5],
  ['fila seleccionada (papel): tinta sobre #e8ebf6', '#15171a', '#e8ebf6', 4.5],
  ['fila seleccionada (noche): tinta sobre #1d2440', '#f3f4f5', '#1d2440', 4.5],
  ['foco (papel): índigo sobre panel', '#142d88', '#fcfbf8', 3],
  ['foco (noche): tinta sobre panel', '#f3f4f5', '#262a2f', 3],
  ['botón principal (noche): #15171a sobre #f3f4f5', '#15171a', '#f3f4f5', 4.5],
  ['rótulo del momento activo (papel): #c9d1f0 sobre índigo', '#c9d1f0', '#142d88', 4.5],
  ['rótulo del momento activo (noche): #464b52 sobre #f3f4f5', '#464b52', '#f3f4f5', 4.5],
  ['raya de los extremos de la banda (tinta3) sobre panel', '#5b6168', '#fcfbf8', 3],
  ['equipo en marcha #ffffff contra parado #5b6168', '#ffffff', '#5b6168', 3],
  ['equipo parado #5b6168 sobre el lienzo panel2', '#5b6168', '#f3f1ec', 3],
  ['(noche) equipo en marcha #d9dde1 contra parado #0d0f11', '#d9dde1', '#0d0f11', 3],
  ['barra dato-1 contra su pista #e2dfd8', '#3a3f45', '#e2dfd8', 3],
  ['tinta sobre el tinte de alarma #f5e2d4', '#15171a', '#f5e2d4', 4.5],
  ['tinta sobre el tinte amarillo #f6eed4', '#15171a', '#f6eed4', 4.5],
]) { const r = ratio(a, b); if (r < min) fallas++; console.log(`${n}: ${f2(r)} ${r >= min ? 'pasa' : 'FALLA'}`) }
console.log(`\nFallas: ${fallas}`)
