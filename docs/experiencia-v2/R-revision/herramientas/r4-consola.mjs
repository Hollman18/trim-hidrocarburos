/* R4 · §10 Consola y CSP: recorre las rutas de e2e/auditoria/rutas.ts y anota
   cada error y aviso de la consola, cada excepción, cada pedido que falla o
   responde ≥ 400, cada violación de la Content-Security-Policy y cada pedido a
   otro origen.

   node docs/experiencia-v2/R-revision/herramientas/r4-consola.mjs <url-base> <etiqueta> [hash|carga] [ancho]
     hash:  una sola página, cambia location.hash (como el auditor y quien usa el panel).
     carga: cada ruta en una carga nueva (about:blank → la ruta), como un enlace compartido. */
import { RUTAS, SIN_INTRO, lanzar, lista, guardar, esperar } from './r4-comun.mjs'

const [base = 'http://localhost:5184', etiqueta = 'dev', modo = 'hash', anchoTxt = '1280'] = process.argv.slice(2)
const ancho = Number(anchoTxt)
const origen = new URL(base).origin

const navegador = await lanzar()
const contexto = await navegador.newContext({
  viewport: { width: ancho, height: 900 }, isMobile: ancho < 600, hasTouch: ancho < 600,
  locale: 'es-CO', timezoneId: 'America/Bogota',
})
await contexto.addInitScript(SIN_INTRO)
await contexto.addInitScript(() => {
  window.__r4csp = []
  document.addEventListener('securitypolicyviolation', e => window.__r4csp.push(`${e.violatedDirective} ← ${e.blockedURI || '(en línea)'} ${e.sourceFile ?? ''}:${e.lineNumber ?? ''}`))
})
const page = await contexto.newPage()

let ruta = '(inicio)'
const eventos = []
const anotar = (tipo, texto) => eventos.push({ ruta, tipo, texto: String(texto).slice(0, 400) })
page.on('console', m => { if (['error', 'warning', 'assert'].includes(m.type())) anotar(`console.${m.type()}`, m.text()) })
page.on('pageerror', e => anotar('pageerror', e.message.split('\n')[0]))
page.on('requestfailed', r => { if (!r.url().startsWith('data:')) anotar('requestfailed', `${r.url()} ${r.failure()?.errorText ?? ''}`) })
page.on('response', r => {
  if (r.status() >= 400) anotar(`http ${r.status()}`, r.url())
  // Lo que se pide a la API: en el demo no hay servicio detrás (la página responde HTML).
  if (new URL(r.url()).pathname.startsWith('/api/')) anotar('api', `${r.status()} ${r.headers()['content-type'] ?? ''} ${new URL(r.url()).pathname}`)
})
// Una navegación de documento entero en modo hash es un hallazgo (o una recarga de Vite): se anota.
page.on('domcontentloaded', () => { if (modo === 'hash' && ruta !== '(inicio)') anotar('recarga', page.url()) })
const externos = new Set()
page.on('request', r => { const u = r.url(); if (/^https?:/.test(u) && new URL(u).origin !== origen) externos.add(u) })

const t0 = Date.now()
if (modo === 'hash') { await page.goto(`${base}/${RUTAS[0]}`); await lista(page); await esperar(800) }
for (const r of RUTAS) {
  ruta = r
  if (modo === 'hash') await page.evaluate(h => { location.hash = h }, r.slice(1))
  else { await page.goto('about:blank'); await page.goto(`${base}/${r}`) }
  await esperar(250)
  await lista(page)
  await esperar(400)
  const csp = await page.evaluate(() => { const v = window.__r4csp ?? []; window.__r4csp = []; return v }).catch(e => [`(no se pudo leer: ${e.message.split('\n')[0]})`])
  for (const v of csp) anotar('csp', v)
}
await navegador.close()

const porTexto = new Map()
for (const e of eventos) {
  const k = `${e.tipo} | ${e.texto}`
  const x = porTexto.get(k) ?? { tipo: e.tipo, texto: e.texto, rutas: [] }
  x.rutas.push(e.ruta); porTexto.set(k, x)
}
const resumen = {
  base, etiqueta, modo, ancho, rutas: RUTAS.length, segundos: Math.round((Date.now() - t0) / 1000),
  eventos: eventos.length, distintos: porTexto.size, externos: [...externos],
  lista: [...porTexto.values()].map(x => ({ ...x, n: x.rutas.length, rutas: [...new Set(x.rutas)].slice(0, 8) })),
}
const f = guardar(`consola-${etiqueta}-${modo}-${ancho}.json`, resumen)
console.log(`${etiqueta} ${modo} ${ancho}px: ${RUTAS.length} rutas en ${resumen.segundos} s · ${eventos.length} eventos (${porTexto.size} distintos) · ${externos.size} pedidos a otro origen → ${f}`)
for (const x of resumen.lista) console.log(`  [${x.tipo}] ×${x.n}  ${x.texto.slice(0, 220)}  ← ${x.rutas.slice(0, 3).join(' · ')}`)
