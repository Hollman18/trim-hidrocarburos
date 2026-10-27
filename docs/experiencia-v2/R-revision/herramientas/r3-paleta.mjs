// R3 · Contraste WCAG 2.2 y separación con daltonismo, con los valores REALES de
// src/index.css (no los de la imagen). Es `medir-paleta.mjs` de X5 (el método de X1
// §3.5: luminancia relativa; OKLab ×100 con la simulación de Machado, Oliveira y
// Fernandes 2009, severidad 1), leyendo los tokens del archivo de la aplicación.
// Uso: node r3-paleta.mjs [ruta a index.css]   → imprime una tabla en Markdown.
import { readFileSync } from 'node:fs'

const CSS = readFileSync(process.argv[2] ?? new URL('../../../../src/index.css', import.meta.url), 'utf8')
const bloque = sel => {
  const i = CSS.indexOf(sel)
  const a = CSS.indexOf('{', i), b = CSS.indexOf('}', a)
  return Object.fromEntries([...CSS.slice(a + 1, b).matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{6})/g)].map(m => [m[1], m[2].toLowerCase()]))
}
const CLARO = bloque(':root{\n  color-scheme: light;')
const OSCURO = { ...CLARO, ...bloque(':root[data-theme="dark"]{') }
const BLANCA = bloque('.blanca{')

const hex = h => { const n = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(n.slice(i, i + 2), 16) / 255) }
const lin = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const Lum = h => { const [r, g, b] = hex(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
const ratio = (a, b) => { const [x, y] = [Lum(a), Lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
const ok = ([r, g, b]) => { const l = Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b), m = Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b), s = Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b); return [.2104542553*l+.793617785*m-.0040720468*s, 1.9779984951*l-2.428592205*m+.4505937099*s, .0259040371*l+.7827717662*m-.808675766*s] }
const d = (a, b) => { const p = ok(a), q = ok(b); return Math.hypot(p[0]-q[0], p[1]-q[1], p[2]-q[2]) * 100 }
const M = { protan: [[.152286,1.052583,-.204868],[.114503,.786281,.099216],[-.003882,-.048116,1.051998]], deutan: [[.367322,.860646,-.227968],[.280085,.672501,.047413],[-.01182,.04294,.968881]], tritan: [[1.255528,-.076749,-.178779],[-.078411,.930809,.147602],[.004733,.691367,.3039]] }
const sim = (h, t) => { const c = hex(h).map(lin); return t ? M[t].map(f => Math.min(1, Math.max(0, f[0]*c[0]+f[1]*c[1]+f[2]*c[2]))) : c }
const f2 = n => n.toFixed(2).replace('.', ',')
const FONDOS = ['--suelo', '--superficie', '--panel', '--panel2', '--elevado']

let fallas = 0
const out = []
const linea = s => out.push(s)
for (const [nombre, T] of [['papel (claro)', CLARO], ['noche (oscuro)', OSCURO]]) {
  linea(`\n### ${nombre}\n`)
  linea(`| Token | Valor | ${FONDOS.join(' | ')} | Mínimo | Exige | ¿Pasa? |`)
  linea(`|---|---|${FONDOS.map(() => '---').join('|')}|---|---|---|`)
  const fila = (tok, exige, nota = '') => {
    const v = T[tok]; if (!v) { linea(`| ${tok} | (no está) |${FONDOS.map(() => ' — ').join('|')}| — | ${exige} | — |`); return }
    const rs = FONDOS.map(f => ratio(v, T[f]))
    const m = Math.min(...rs)
    const pasa = m >= exige
    if (!pasa && !nota) fallas++
    linea(`| ${tok} | \`${v}\` | ${rs.map(f2).join(' | ')} | **${f2(m)}** | ${f2(exige)}:1 | ${pasa ? 'sí' : nota ? `no → ${nota}` : '**NO**'} |`)
  }
  for (const t of ['--tinta', '--tinta2', '--tinta3']) fila(t, 4.5)
  for (const t of ['--dato1', '--dato3', '--pared', '--agua', '--flujo', '--rayado', '--dato-1', '--dato-2', '--dato-3', '--dato-4', '--dato-5', '--eq-trazo', '--eq-parado'])
    fila(t, 3, t === '--eq-parado' ? 'lo cubre el contorno de 2 px en tinta' : t === '--dato-5' ? 'solo si se usa como forma' : '')
  for (const t of ['--interlock', '--p1', '--p2', '--p3', '--sincom'])
    fila(t, 3, (t === '--p2' || t === '--p3') && T[t] === '#f9a825' ? `trazo ${T['--marca-trazo']}: ${f2(Math.min(...FONDOS.map(f => ratio(T['--marca-trazo'], T[f]))))}` : '')

  linea('\n**Pares propios (forma o texto contra lo que tiene al lado):**\n')
  linea('| Par | Razón | Exige | ¿Pasa? |')
  linea('|---|---|---|---|')
  const par = (n, a, b, exige) => { const r = ratio(a, b); if (r < exige) fallas++; linea(`| ${n} (\`${a}\` / \`${b}\`) | ${f2(r)} | ${f2(exige)}:1 | ${r >= exige ? 'sí' : '**NO**'} |`) }
  par('número «1» dentro del rombo', T['--marca-num'], T['--p1'], 4.5)
  par('número «2»/«3» dentro del amarillo', T['--marca-trazo'], T['--p2'], 4.5)
  par('equipo en marcha contra parado', T['--eq-marcha'], T['--eq-parado'], 3)
  par('contorno del parado (tinta) contra su relleno', T['--tinta'], T['--eq-parado'], 3)
  par('núcleo (flujo) contra el tubo vacío', T['--flujo'], T['--tubo-vacio'], 3)
  par('pared contra el tubo vacío', T['--pared'], T['--tubo-vacio'], 3)
  par('rayado contra el tubo vacío', T['--rayado'], T['--tubo-vacio'], 3)
  par('rayado contra el núcleo', T['--rayado'], T['--flujo'], 3)
  par('barra dato1 contra su pista', T['--dato1'], T['--pista'], 3)
  par('barra dato3 («lo demás») contra el panel', T['--dato3'], T['--panel'], 3)
  par('alto impacto (dato1) contra lo demás (dato3), apiladas', T['--dato1'], T['--dato3'], 3)
  par('raya de la banda (tinta3) contra la banda', T['--tinta3'], T['--banda'], 3)
  par('raya de la banda (tinta3) contra el panel', T['--tinta3'], T['--panel'], 3)
  par('puntero (tinta) contra la banda', T['--tinta'], T['--banda'], 3)
  par('puntero gris (tinta3, equipo parado) contra la pista', T['--tinta3'], T['--pista'], 3)
  par('tinta sobre el tinte de alarma (p1-f)', T['--tinta'], T['--p1-f'], 4.5)
  par('tinta sobre el tinte amarillo (p2-f)', T['--tinta'], T['--p2-f'], 4.5)
  par('tinta sobre el tinte morado (sincom-f)', T['--tinta'], T['--sincom-f'], 4.5)
  par('tinta sobre el tinte del interlock', T['--tinta'], T['--interlock-f'], 4.5)
  par('texto del botón principal', T['--primario-sobre'], T['--primario'], 4.5)

  linea('\n**Separación entre colores de estado** (OKLab ×100; normal · protan · deutan · tritan; ≥ 10 se separa a simple vista):\n')
  linea('| Par | Normal | Protan | Deutan | Tritan | Peor | ¿≥ 10? |')
  linea('|---|---|---|---|---|---|---|')
  const E = [['interlock', T['--interlock']], ['alarma', T['--p1']], ['atención/aviso', T['--p2']], ['sin comunicación', T['--sincom']]]
  const sep = (na, a, nb, b, cuenta = true) => {
    const xs = [null, 'protan', 'deutan', 'tritan'].map(t => d(sim(a, t), sim(b, t)))
    const peor = Math.min(...xs)
    if (peor < 10 && cuenta) fallas++
    linea(`| ${na} · ${nb} | ${xs.map(f2).join(' | ')} | **${f2(peor)}** | ${peor >= 10 ? 'sí' : cuenta ? '**NO**' : 'no (informativo)'} |`)
  }
  for (let i = 0; i < E.length; i++) for (let j = i + 1; j < E.length; j++) sep(E[i][0], E[i][1], E[j][0], E[j][1])
  for (const [n, v] of E) sep(n, v, 'gris normal (tinta3)', T['--tinta3'], false)
  for (const [n, v] of E) sep(n, v, 'índigo de marca', T['--marca'], false)
  sep('sin comunicación', T['--sincom'], 'foco / primario', T['--foco'], false)
}
linea('\n### Las píldoras blancas (`.blanca`, en los dos temas)\n')
linea('| Estado | Valor | Contra `#ffffff` | ¿≥ 3:1? |')
linea('|---|---|---|---|')
for (const t of ['--interlock', '--p1', '--sincom']) { const r = ratio(BLANCA[t], '#ffffff'); if (r < 3) fallas++; linea(`| ${t} | \`${BLANCA[t]}\` | ${f2(r)} | ${r >= 3 ? 'sí' : '**NO**'} |`) }
linea(`| --p2 (con trazo ${BLANCA['--marca-trazo']}) | \`${BLANCA['--p2']}\` | ${f2(ratio(BLANCA['--p2'], '#ffffff'))} → trazo ${f2(ratio(BLANCA['--marca-trazo'], '#ffffff'))} | sí, por el trazo |`)

linea('\n### Diferencias entre `src/index.css` y X2 §4.4 / X5 §3.2 (mismo token, otro valor)\n')
const X = { claro: { '--eq-marcha': '#fafaf9', '--eq-parado': '#686c71', '--eq-trazo': '#5c6066', '--banda': '#cdccca' }, oscuro: { '--eq-marcha': '#d9dcdf', '--eq-parado': '#1f2225', '--eq-trazo': '#aaadb0', '--banda': '#5d6165' } }
linea('| Tema | Token | X2 §4.4 | index.css |')
linea('|---|---|---|---|')
for (const [tema, T] of [['claro', CLARO], ['oscuro', OSCURO]]) for (const [k, v] of Object.entries(X[tema])) if (T[k] !== v) linea(`| ${tema} | ${k} | \`${v}\` | \`${T[k]}\` |`)
linea(`\nFallas que cuentan: ${fallas}`)
console.log(out.join('\n'))
