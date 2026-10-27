// B1 · Mide la paleta FINAL de la v3 (decisión 5: D1 Grafito, cálida y sin la barra negra).
// Lee los tokens de src/index.css, el archivo que pinta la aplicación: lo que se ve es lo que se midió.
// El método es el de medir-direcciones.mjs (y el de X2/X5, medir-paleta-v2.mjs), con las mismas funciones:
//   contraste WCAG 2.2 (luminancia relativa) y separación OKLab ×100 con la simulación de Machado,
//   Oliveira y Fernandes (2009, severidad 1) para protanopía, deuteranopía y tritanopía.
// Uso: node docs/experiencia-v3/herramientas/medir-final.mjs → imprime y escribe medicion-final.txt.
//      Sale con 1 si algo falla.
import { readFileSync, writeFileSync } from 'node:fs'
const aqui = new URL('.', import.meta.url)
const css = readFileSync(new URL('../../../src/index.css', aqui), 'utf8')
const bloque = sel => { const i = css.indexOf(`${sel}{`); if (i < 0) throw new Error(`falta ${sel}`); return css.slice(i, css.indexOf('}', i)) }
const tokens = b => Object.fromEntries([...b.matchAll(/--([\w-]+):(#[0-9a-fA-F]{6})\b/g)].map(m => [m[1], m[2].toLowerCase()]))
const TEMAS = { claro: tokens(bloque(':root')), noche: tokens(bloque(':root[data-theme="dark"]')) }

// ── Las mismas funciones de medir-paleta.mjs (v2) y medir-direcciones.mjs, sin cambios ──
const hex = h => { const n = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(n.slice(i, i + 2), 16) / 255) }
const lin = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const Lum = h => { const [r, g, b] = hex(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
const ratio = (a, b) => { const [x, y] = [Lum(a), Lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
const ok = ([r, g, b]) => { const l = Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b), m = Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b), s = Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b); return [.2104542553*l+.793617785*m-.0040720468*s, 1.9779984951*l-2.428592205*m+.4505937099*s, .0259040371*l+.7827717662*m-.808675766*s] }
const d = (a, b) => { const p = ok(a), q = ok(b); return Math.hypot(p[0]-q[0], p[1]-q[1], p[2]-q[2]) * 100 }
const M = { protan: [[.152286,1.052583,-.204868],[.114503,.786281,.099216],[-.003882,-.048116,1.051998]], deutan: [[.367322,.860646,-.227968],[.280085,.672501,.047413],[-.01182,.04294,.968881]], tritan: [[1.255528,-.076749,-.178779],[-.078411,.930809,.147602],[.004733,.691367,.3039]] }
const sim = (h, t) => { const c = hex(h).map(lin); return t ? M[t].map(f => Math.min(1, Math.max(0, f[0]*c[0]+f[1]*c[1]+f[2]*c[2]))) : c }
const f2 = n => n.toFixed(2).replace('.', ',')
const VISION = [null, 'protan', 'deutan', 'tritan']
const sep = (a, b) => VISION.map(t => d(sim(a, t), sim(b, t)))

const FONDOS = ['suelo', 'superficie', 'panel', 'panel2', 'elevado']
const ESTADOS = { interlock: 'interlock', alarma: 'p1', 'atención y aviso': 'p2', 'sin comunicación': 'sincom' }
const lineas = []
let fallas = 0
const log = s => { lineas.push(s); console.log(s) }
const exige = (bien, txt) => { if (!bien) fallas++; return bien ? txt : `${txt} ← FALLA` }

log('# Experiencia v3 · la paleta final (decisión 5), medida desde src/index.css')
log(`# ${new Date().toISOString().slice(0, 10)} · node docs/experiencia-v3/herramientas/medir-final.mjs`)
for (const [tema, T] of Object.entries(TEMAS)) {
  log(`\n### ${tema}`)
  log(`fondos: ${FONDOS.map(f => `${f} ${T[f]}`).join(' · ')}`)
  log(`panel lateral: nav ${T.nav} · borde ${T['nav-linea']} · activo ${T['nav-activo']} · acento ${T.acento}`)
  const minimo = c => Math.min(...FONDOS.map(f => ratio(c, T[f])))
  for (const k of ['tinta', 'tinta2', 'tinta3']) log(exige(minimo(T[k]) >= 4.5, `texto ${k} ${T[k]}: mínimo ${f2(minimo(T[k]))} sobre los 5 fondos (≥ 4,5)`))
  for (const k of ['dato1', 'dato3', 'eq-trazo']) log(exige(minimo(T[k]) >= 3, `gráfico ${k} ${T[k]}: mínimo ${f2(minimo(T[k]))} (≥ 3)`))
  for (const [n, k] of Object.entries(ESTADOS)) {
    const m = minimo(T[k])
    log(tema === 'claro' && k === 'p2'
      ? exige(minimo(T['marca-trazo']) >= 3, `estado ${n} ${T[k]}: mínimo ${f2(m)} → lleva trazo ${T['marca-trazo']}: ${f2(minimo(T['marca-trazo']))}`)
      : exige(m >= 3, `estado ${n} ${T[k]}: mínimo ${f2(m)} (≥ 3)`))
  }
  const EE = Object.entries(ESTADOS)
  log('estados entre sí, ΔOK×100 (normal · protan · deutan · tritan; ≥ 10):')
  for (let i = 0; i < EE.length; i++) for (let j = i + 1; j < EE.length; j++) {
    const xs = sep(T[EE[i][1]], T[EE[j][1]]); log(exige(Math.min(...xs) >= 10, `  ${EE[i][0]} – ${EE[j][0]}: ${xs.map(f2).join(' · ')}`))
  }
  log(`acento ${T.acento} contra cada estado, ΔOK×100 (normal · protan · deutan · tritan; ≥ 10):`)
  let peor = Infinity
  for (const [n, k] of EE) { const xs = sep(T.acento, T[k]); peor = Math.min(peor, ...xs); log(exige(Math.min(...xs) >= 10, `  ${n}: ${xs.map(f2).join(' · ')}`)) }
  log(`  peor caso del acento: ${f2(peor)}`)
  const xg = sep(T.acento, T.tinta3)
  log(`  (informativo) contra el gris tinta3 ${T.tinta3}: ${xg.map(f2).join(' · ')} → lo seleccionado lleva además forma (raya de 3 px o peso 600), nunca solo color`)
  const pares = [
    ['acento-sobre sobre el acento (botón principal)', T['acento-sobre'], T.acento, 4.5],
    ['foco: acento sobre panel', T.foco, T.panel, 3],
    ['foco: acento sobre suelo', T.foco, T.suelo, 3],
    ['foco: acento sobre el panel lateral', T.foco, T.nav, 3],
    ['rótulo activo del panel lateral (nav-tinta sobre nav-activo)', T['nav-tinta'], T['nav-activo'], 4.5],
    ['rótulo inactivo del panel lateral (nav-tinta2 sobre nav)', T['nav-tinta2'], T.nav, 4.5],
    ['rótulo inactivo con el cursor encima (nav-tinta2 sobre nav-hover)', T['nav-tinta2'], T['nav-hover'], 4.5],
    ['raya de lo seleccionado en el panel lateral (acento sobre nav)', T.acento, T.nav, 3],
    ['raya de lo seleccionado contra la entrada activa (acento sobre nav-activo)', T.acento, T['nav-activo'], 3],
    ['fila seleccionada: tinta sobre acento-suave', T.tinta, T['acento-suave'], 4.5],
    ['bloque --marca con letra blanca (marca-sobre sobre marca)', T['marca-sobre'], T.marca, 4.5],
    ['texto tenue sobre --marca (marca-tenue)', T['marca-tenue'], T.marca, 4.5],
    ['equipo en marcha contra parado', T['eq-marcha'], T['eq-parado'], 3],
    ['contorno del equipo sobre panel2', T['eq-trazo'], T.panel2, 3],
    ['puntero (tinta) contra la banda', T.tinta, T.banda, 3],
    ['barra dato1 contra su pista', T.dato1, T.pista, 3],
    ['tinta sobre el tinte de alarma', T.tinta, T['p1-f'], 4.5],
    ['tinta sobre el tinte amarillo', T.tinta, T['p2-f'], 4.5],
    ['tinta sobre el tinte morado', T.tinta, T['sincom-f'], 4.5],
    ['tinta sobre el tinte del interlock', T.tinta, T['interlock-f'], 4.5],
  ]
  // En la noche, --aviso-accion es var(--marca): se mide con el valor de --marca.
  pares.push(['«Deshacer» del aviso (aviso-accion sobre la tinta)', T['aviso-accion'] ?? T.marca, T.tinta, 4.5])
  for (const [n, a, b, min] of pares) {
    if (!a || !b) { log(exige(false, `${n}: falta el token`)); continue }
    const r = ratio(a, b); log(exige(r >= min, `${n}: ${f2(r)} (≥ ${String(min).replace('.', ',')})`))
  }
}
// El índigo de la v2 no vuelve, en ningún tema.
log(exige(!/#142d88/i.test(css.replace(/\/\*[\s\S]*?\*\//g, '')), '\nel índigo #142d88 no está en ningún token'))
log(`\nFallas: ${fallas}`)
writeFileSync(new URL('medicion-final.txt', aqui), lineas.join('\n') + '\n')
process.exit(fallas ? 1 : 0)
