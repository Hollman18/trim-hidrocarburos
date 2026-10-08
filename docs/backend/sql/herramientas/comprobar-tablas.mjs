/* Compara tablas.json con una base recién creada SOLO con esquema.sql (sin
   ejemplos): mismas tablas y vistas, mismas columnas en el mismo orden, tipo,
   nulo, PK, FK, único, check, defecto y comentario; mismas relaciones; toda
   tabla y toda columna de tabla con comentario; filas de ejemplo con columnas
   que existen. Sale con 1 si algo no coincide.
   Uso: node comprobar-tablas.mjs <base vacía> <tablas.json> */
import { readFileSync } from 'node:fs'
import { consulta, SQL_CATALOGO } from './catalogo.mjs'

const [BASE, ARCHIVO] = process.argv.slice(2)
const spec = JSON.parse(readFileSync(ARCHIVO, 'utf8'))
const cat = consulta(BASE, SQL_CATALOGO)
const fallas = []
const mal = m => fallas.push(m)
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b)

const nombresCat = cat.map(t => t.nombre), nombresSpec = spec.tablas.map(t => t.nombre)
for (const n of nombresCat) if (!nombresSpec.includes(n)) mal(`falta en tablas.json: ${n}`)
for (const n of nombresSpec) if (!nombresCat.includes(n)) mal(`sobra en tablas.json (no está en esquema.sql): ${n}`)
const grupos = new Set(spec.grupos.map(g => g.id))
let columnas = 0, sinComentario = 0
const relCat = []
for (const t of cat) {
  const s = spec.tablas.find(x => x.nombre === t.nombre)
  if (!s) continue
  if (!grupos.has(s.grupo)) mal(`${t.nombre}: grupo ${s.grupo} no existe`)
  if (s.clase !== (t.clase)) mal(`${t.nombre}: clase ${s.clase} ≠ ${t.clase}`)
  if (!t.comentario) mal(`${t.nombre}: sin COMMENT ON ${t.clase === 'vista' ? 'VIEW' : 'TABLE'}`)
  if (s.descripcion !== t.comentario) mal(`${t.nombre}: la descripción no es el comentario de la base`)
  const R = t.restricciones, pk = R.find(k => k.tipo === 'p')?.columnas ?? []
  if (!igual(s.columnas.map(c => c.nombre), t.columnas.map(c => c.nombre))) { mal(`${t.nombre}: columnas distintas o en otro orden`); continue }
  t.columnas.forEach((c, i) => {
    const e = s.columnas[i]
    columnas++
    if (t.clase === 'tabla' && !c.comentario) { sinComentario++; mal(`${t.nombre}.${c.nombre}: sin COMMENT ON COLUMN`) }
    const fks = R.filter(k => k.tipo === 'f' && k.columnas.includes(c.nombre)).map(k => `${k.hacia}.${k.hacia_columnas[k.columnas.indexOf(c.nombre)]}`).join(' · ') || null
    const uns = R.filter(k => k.tipo === 'u' && k.columnas.includes(c.nombre)).map(k => k.columnas.length === 1 ? 'único' : `único con (${k.columnas.join(', ')})`).join(' · ') || null
    const chk = R.filter(k => k.tipo === 'c' && new RegExp(`\\b${c.nombre}\\b`).test(k.definicion)).map(k => k.definicion).join(' · ') || null
    const esperado = { tipo: c.tipo + (c.generada ? ' (generada)' : ''), nulo: c.nulo, pk: pk.includes(c.nombre), fk: fks, unico: uns, check: chk, defecto: c.defecto ?? null, descripcion: c.comentario }
    for (const [k, v] of Object.entries(esperado)) if (!igual(e[k], v)) mal(`${t.nombre}.${c.nombre}.${k}: tablas.json dice ${JSON.stringify(e[k])} y la base ${JSON.stringify(v)}`)
  })
  for (const f of s.filas) for (const k of Object.keys(f)) if (!t.columnas.some(c => c.nombre === k)) mal(`${t.nombre}: una fila trae ${k}, que no es columna`)
  for (const k of R.filter(x => x.tipo === 'f')) relCat.push(`${t.nombre}.${k.columnas.join(',')}→${k.hacia}.${k.hacia_columnas.join(',')}`)
}
const relSpec = spec.relaciones.map(r => `${r.desde}→${r.hacia}`)
for (const r of relCat) if (!relSpec.includes(r)) mal(`relación que falta en tablas.json: ${r}`)
for (const r of relSpec) if (!relCat.includes(r)) mal(`relación que sobra en tablas.json: ${r}`)
for (const r of spec.relaciones) if (!['N:1', '1:1'].includes(r.cardinalidad)) mal(`cardinalidad rara: ${r.desde}`)

const tablas = cat.filter(t => t.clase === 'tabla').length, vistas = cat.length - tablas
console.log(`comparadas ${tablas} tablas y ${vistas} vistas, ${columnas} columnas, ${relCat.length} relaciones; columnas de tabla sin comentario: ${sinComentario}`)
console.log(`filas de ejemplo: ${spec.tablas.reduce((a, t) => a + t.filas.length, 0)} en ${spec.tablas.filter(t => t.filas.length).length} tablas/vistas; sin filas del demo: ${spec.tablas.filter(t => t.clase === 'tabla' && !t.filas.length).map(t => t.nombre).join(', ')}`)
if (fallas.length) { console.log(`NO COINCIDE (${fallas.length}):`); for (const f of fallas.slice(0, 60)) console.log(`  · ${f}`); process.exit(1) }
console.log('tablas.json COINCIDE 1:1 con esquema.sql')
