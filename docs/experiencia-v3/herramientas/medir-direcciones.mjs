// M4 · Mide las tres direcciones visuales de la v3 y escribe sus tokens para las imágenes.
// El método es el de docs/experiencia-v2/imagenes/fuente/scripts/medir-paleta.mjs (copiado en
// medir-paleta-v2.mjs): contraste WCAG 2.2 (luminancia relativa) y separación OKLab ×100 con la
// simulación de Machado, Oliveira y Fernandes (2009, severidad 1) para protan, deutan y tritan.
// Uso: node medir-direcciones.mjs  → imprime la medición, escribe medicion-direcciones.txt,
//      medicion-direcciones.json y ../imagenes/fuente/tokens.css. Sale con 1 si algo falla.
import { readFileSync, writeFileSync } from 'node:fs'
const aqui = new URL('.', import.meta.url)
const D = JSON.parse(readFileSync(new URL('direcciones.json', aqui), 'utf8'))

// ── Las mismas funciones de medir-paleta.mjs (v2), sin cambios ──
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
const lineas = [], resumen = {}
let fallas = 0
const log = s => { lineas.push(s); console.log(s) }
const exige = (ok, txt) => { if (!ok) fallas++; return ok ? txt : `${txt} ← FALLA` }

for (const [id, dir] of Object.entries(D.direcciones)) {
  resumen[id] = { nombre: dir.nombre }
  for (const tema of ['claro', 'noche']) {
    const T = dir[tema], E = D.estado[tema], R = (resumen[id][tema] = { minimos: {}, acento: {} })
    log(`\n### ${id} · ${dir.nombre} · ${tema}`)
    const minimo = c => Math.min(...FONDOS.map(f => ratio(c, T[f])))
    for (const k of ['tinta', 'tinta2', 'tinta3']) { const m = minimo(T[k]); R.minimos[k] = +m.toFixed(2); log(exige(m >= 4.5, `texto ${k} ${T[k]}: mínimo ${f2(m)} sobre los 5 fondos (≥ 4,5)`)) }
    for (const k of ['dato1', 'dato3', 'eq-trazo']) { const m = minimo(T[k]); R.minimos[k] = +m.toFixed(2); log(exige(m >= 3, `gráfico ${k} ${T[k]}: mínimo ${f2(m)} (≥ 3)`)) }
    for (const [n, k] of Object.entries(ESTADOS)) {
      const m = minimo(E[k]), conTrazo = tema === 'claro' && k === 'p2'
      R.minimos[n] = +m.toFixed(2)
      log(conTrazo ? exige(minimo(E['marca-trazo']) >= 3, `estado ${n} ${E[k]}: mínimo ${f2(m)} → lleva trazo ${E['marca-trazo']}: ${f2(minimo(E['marca-trazo']))}`)
        : exige(m >= 3, `estado ${n} ${E[k]}: mínimo ${f2(m)} (≥ 3)`))
    }
    // La paleta de estado entre sí (no cambia, pero se vuelve a medir: es la condición de X2 C7).
    const EE = Object.entries(ESTADOS)
    log('estados entre sí, ΔOK×100 (normal · protan · deutan · tritan; ≥ 10):')
    for (let i = 0; i < EE.length; i++) for (let j = i + 1; j < EE.length; j++) {
      const xs = sep(E[EE[i][1]], E[EE[j][1]]); log(exige(Math.min(...xs) >= 10, `  ${EE[i][0]} – ${EE[j][0]}: ${xs.map(f2).join(' · ')}`))
    }
    // El acento contra cada color de estado: la condición nueva de la v3 (§7).
    log(`acento ${T.acento} contra cada estado, ΔOK×100 (normal · protan · deutan · tritan; ≥ 10):`)
    for (const [n, k] of EE) { const xs = sep(T.acento, E[k]); R.acento[n] = +Math.min(...xs).toFixed(1); log(exige(Math.min(...xs) >= 10, `  ${n}: ${xs.map(f2).join(' · ')}`)) }
    const xg = sep(T.acento, T.tinta3); R.acento['gris (tinta3), informativo'] = +Math.min(...xg).toFixed(1)
    log(`  (informativo) contra el gris tinta3 ${T.tinta3}: ${xg.map(f2).join(' · ')} → lo seleccionado lleva además forma (raya o peso), nunca solo color`)
    // Los pares propios de la dirección: el botón, el panel, lo seleccionado, el foco y los equipos.
    const pares = [
      ['acento-sobre sobre el acento (botón principal)', T['acento-sobre'], T.acento, 4.5],
      ['foco: acento sobre panel', T.foco, T.panel, 3],
      ['foco: acento sobre suelo', T.foco, T.suelo, 3],
      ['rótulo activo del panel de navegación', T['nav-tinta'], T['nav-activo'], 4.5],
      ['rótulo inactivo del panel de navegación', T['nav-tinta2'], T.nav, 4.5],
      ['fila seleccionada: tinta sobre acento-suave', T.tinta, T['acento-suave'], 4.5],
      ['equipo en marcha contra parado', T['eq-marcha'], T['eq-parado'], 3],
      ['contorno del equipo sobre panel2', T['eq-trazo'], T.panel2, 3],
      ['puntero (tinta) contra la banda', T.tinta, T.banda, 3],
      ['barra dato1 contra su pista', T.dato1, T.pista, 3],
      ['tinta sobre el tinte de alarma', T.tinta, E['p1-f'], 4.5],
      ['tinta sobre el tinte amarillo', T.tinta, E['p2-f'], 4.5],
      ['tinta sobre el tinte morado', T.tinta, E['sincom-f'], 4.5],
    ]
    pares.push(['raya de lo seleccionado en el panel de navegación (nav-marca)', T['nav-marca'], T.nav, 3])
    for (const [n, a, b, min] of pares) { const r = ratio(a, b); log(exige(r >= min, `${n}: ${f2(r)} (≥ ${String(min).replace('.', ',')})`)) }
  }
}
log(`\nFallas: ${fallas}`)
writeFileSync(new URL('medicion-direcciones.txt', aqui), lineas.join('\n') + '\n')
writeFileSync(new URL('medicion-direcciones.json', aqui), JSON.stringify({ _como: 'node medir-direcciones.mjs', fallas, resumen }, null, 1))

// ── tokens.css para las imágenes: [data-dir][data-tema] ──
const css = ['/* Generado por docs/experiencia-v3/herramientas/medir-direcciones.mjs desde direcciones.json. No editar a mano. */']
for (const [id, dir] of Object.entries(D.direcciones)) for (const tema of ['claro', 'noche']) {
  const v = { ...D.estado[tema], ...dir[tema] }
  css.push(`[data-dir="${id}"][data-tema="${tema}"]{color-scheme:${tema === 'claro' ? 'light' : 'dark'};${Object.entries(v).map(([k, x]) => `--${k}:${x}`).join(';')};` +
    `--f-sans:"${dir.letra.sans}",system-ui,sans-serif;--f-cond:"${dir.letra.cond}","${dir.letra.sans}",sans-serif;--f-mono:"${dir.letra.mono}",ui-monospace,monospace}`)
}
writeFileSync(new URL('../imagenes/fuente/tokens.css', aqui), css.join('\n') + '\n')
writeFileSync(new URL('../imagenes/fuente/datos/medicion.js', aqui), `// Generado por herramientas/medir-direcciones.mjs. No editar a mano.\nwindow.MEDICION = ${JSON.stringify({ fallas, resumen })}\nwindow.DIRECCIONES = ${JSON.stringify(D)}\n`)
process.exit(fallas ? 1 : 0)
