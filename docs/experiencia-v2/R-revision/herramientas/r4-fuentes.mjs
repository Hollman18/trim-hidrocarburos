/* R4 · §10 Las dos fuentes de datos: la misma ruta con la fuente del demo (los
   insumos se calculan en el navegador) y con la fuente http (cada consulta es un
   GET al simulador de la API, `npm run simulador`). ¿Se ve igual?
   Se compara el texto visible de <main> (y de la franja), se cuentan los errores
   de la página y se guardan las dos capturas para compararlas a ojo.

   node docs/experiencia-v2/R-revision/herramientas/r4-fuentes.mjs <url-demo> <url-http> [ancho] */
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'
import { lanzar, SIN_INTRO, INICIOS, RUTAS, lista, guardar, esperar, SALIDA } from './r4-comun.mjs'

const [demo = 'http://localhost:5184', http = 'http://127.0.0.1:5188', anchoTxt = '1280'] = process.argv.slice(2)
const ancho = Number(anchoTxt)
const DIR = join(SALIDA, `fuentes-${ancho}`); mkdirSync(DIR, { recursive: true })
const LISTA = process.env.R4_TODAS ? RUTAS : [...Object.values(INICIOS), '#/ger/resultados/ceiba/curso', '#/ger/resultados/ceiba~portafolio/curso', '#/sup/equipos/ceiba/P-201B', '#/prod/produccion/ceiba/curso', '#/sup/turno/ceiba/curso', '#/conf/equipos/ceiba/P-201B/diagnostico', '#/prod/planta/ceiba/curso', '#/adm/conectores/ceiba/curso']

const navegador = await lanzar()
async function leer(base, ruta) {
  const ctx = await navegador.newContext({ viewport: { width: ancho, height: 900 }, isMobile: ancho < 600, locale: 'es-CO', timezoneId: 'America/Bogota' })
  await ctx.addInitScript(SIN_INTRO)
  const page = await ctx.newPage()
  const errores = [], api = []
  page.on('pageerror', e => errores.push(e.message.split('\n')[0]))
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errores.push(`${m.type()}: ${m.text().slice(0, 160)}`) })
  page.on('response', r => { const u = new URL(r.url()); if (u.pathname.startsWith('/api/')) api.push(`${r.status()} ${u.pathname}`) })
  const t0 = Date.now()
  await page.goto(`${base}/${ruta}`); await lista(page, 20_000)
  const ms = Date.now() - t0
  await esperar(1200)
  const texto = await page.evaluate(() => (document.querySelector('main')?.innerText ?? '').replace(/\s+/g, ' ').trim())
  const hash = await page.evaluate(() => location.hash)
  const nombre = ruta.replace(/[#/~]+/g, '_').replace(/^_/, '')
  await page.screenshot({ path: join(DIR, `${nombre}-${base === demo ? 'demo' : 'http'}.png`), fullPage: false })
  await ctx.close()
  return { texto, errores, api: api.length, apiMal: api.filter(a => !a.startsWith('2')), ms, hash, nombre }
}
const palabras = t => t.split(' ')
const salida = []
for (const ruta of LISTA) {
  const a = await leer(demo, ruta), b = await leer(http, ruta)
  let i = 0; const A = palabras(a.texto), B = palabras(b.texto)
  while (i < A.length && A[i] === B[i]) i++
  salida.push({ ruta, igual: a.texto === b.texto, largoDemo: a.texto.length, largoHttp: b.texto.length, hashDemo: a.hash, hashHttp: b.hash,
    difiereEn: a.texto === b.texto ? null : { demo: A.slice(Math.max(0, i - 6), i + 14).join(' '), http: B.slice(Math.max(0, i - 6), i + 14).join(' ') },
    erroresDemo: a.errores, erroresHttp: b.errores, pedidosHttp: b.api, pedidosMal: b.apiMal.slice(0, 6), msDemo: a.ms, msHttp: b.ms, captura: a.nombre })
}
await navegador.close()
const f = guardar(`fuentes-${ancho}.json`, salida)
console.log(`Dos fuentes · ${ancho} px · ${LISTA.length} rutas → ${f}`)
for (const x of salida) console.log(`  ${x.igual ? 'igual ' : 'DIFIERE'} ${x.ruta} · demo ${x.largoDemo} car. / http ${x.largoHttp} · ${x.pedidosHttp} pedidos (${x.pedidosMal.length} mal) · lista en ${x.msDemo} / ${x.msHttp} ms${x.erroresHttp.length ? ' · errores http: ' + x.erroresHttp.slice(0, 2).join(' | ') : ''}${x.difiereEn ? `\n        demo: …${x.difiereEn.demo}…\n        http: …${x.difiereEn.http}…` : ''}${x.pedidosMal.length ? '\n        ' + x.pedidosMal.join(' · ') : ''}`)
