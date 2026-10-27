/* R4 · §10 El peso de los trozos de `vite build` y la carga perezosa.

   node docs/experiencia-v2/R-revision/herramientas/r4-trozos.mjs <carpeta-dist> <url-demo>

   1. Cada trozo de dist/assets: crudo, gzip y brotli (zlib de Node, nivel por omisión).
   2. Lo que index.html precarga (modulepreload) y el CSS.
   3. Qué trozos baja cada rol para su primera pantalla (demo construido, sin caché).
   4. La carga perezosa: al abrir una pantalla nueva se baja su trozo y solo entonces. */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync, brotliCompressSync } from 'node:zlib'
import { lanzar, SIN_INTRO, INICIOS, lista, guardar, esperar } from './r4-comun.mjs'

const [dist, base = 'http://127.0.0.1:5188'] = process.argv.slice(2)
const assets = join(dist, 'assets')
const trozos = readdirSync(assets).filter(f => /\.(js|css)$/.test(f)).map(f => {
  const b = readFileSync(join(assets, f))
  return { f, kb: +(statSync(join(assets, f)).size / 1024).toFixed(1), gz: +(gzipSync(b).length / 1024).toFixed(1), br: +(brotliCompressSync(b).length / 1024).toFixed(1) }
}).sort((a, b) => b.gz - a.gz)
const html = readFileSync(join(dist, 'index.html'), 'utf8')
const precarga = [...html.matchAll(/(?:modulepreload|stylesheet)[^>]*href="\/assets\/([^"]+)"|<script type="module"[^>]*src="\/assets\/([^"]+)"/g)].map(m => m[1] ?? m[2])
const nombre = f => f.replace(/-[\w-]{8}\.(js|css)$/, '.$1')

const navegador = await lanzar()
const porRol = {}
for (const [rol, ruta] of Object.entries(INICIOS)) {
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.addInitScript(SIN_INTRO)
  const page = await ctx.newPage()
  const pedidos = []
  page.on('request', r => { const u = new URL(r.url()); if (u.pathname.startsWith('/assets/')) pedidos.push(u.pathname.slice(8)) })
  await page.goto(`${base}/${ruta}`); await lista(page); await esperar(800)
  porRol[rol] = { ruta, trozos: pedidos.map(nombre) }
  await ctx.close()
}
// La carga perezosa: el gerente abre Resultados y Equipos después de La planta viva.
const ctx = await navegador.newContext({ viewport: { width: 1280, height: 900 } })
await ctx.addInitScript(SIN_INTRO)
const page = await ctx.newPage()
const pedidos = []
page.on('request', r => { const u = new URL(r.url()); if (u.pathname.startsWith('/assets/')) pedidos.push({ en: '?', f: nombre(u.pathname.slice(8)) }) })
const pasos = ['#/ger/planta-viva/ceiba/curso', '#/ger/resultados/ceiba/curso', '#/ger/equipos/ceiba', '#/ger/planta-viva/ceiba/curso']
const perezosa = []
for (const p of pasos) {
  const antes = pedidos.length
  if (perezosa.length === 0) await page.goto(`${base}/${p}`); else await page.evaluate(h => { location.hash = h }, p.slice(1))
  await lista(page); await esperar(700)
  perezosa.push({ ruta: p, nuevos: pedidos.slice(antes).map(x => x.f) })
}
await navegador.close()

const total = k => +trozos.filter(t => t.f.endsWith('.js')).reduce((a, t) => a + t[k], 0).toFixed(1)
const precargado = k => +trozos.filter(t => precarga.includes(t.f)).reduce((a, t) => a + t[k], 0).toFixed(1)
const salida = { dist, trozos: trozos.map(t => ({ ...t, precarga: precarga.includes(t.f) })), precarga, totalJs: { kb: total('kb'), gz: total('gz'), br: total('br') }, precargaKb: { kb: precargado('kb'), gz: precargado('gz') }, porRol, perezosa }
const f = guardar('trozos.json', salida)
console.log(`${trozos.length} archivos · JS total ${salida.totalJs.kb} KB (gzip ${salida.totalJs.gz}, brotli ${salida.totalJs.br}) · precarga de index.html ${salida.precargaKb.kb} KB (gzip ${salida.precargaKb.gz}) → ${f}`)
for (const t of trozos.slice(0, 14)) console.log(`  ${t.f.padEnd(34)} ${String(t.kb).padStart(7)} KB · gzip ${String(t.gz).padStart(6)} · br ${String(t.br).padStart(6)}${precarga.includes(t.f) ? '  (precarga)' : ''}`)
for (const [rol, x] of Object.entries(porRol)) console.log(`  ${rol}: ${x.trozos.length} → ${x.trozos.join(' ')}`)
for (const p of perezosa) console.log(`  perezosa ${p.ruta}: ${p.nuevos.join(' ') || '(nada nuevo)'}`)
