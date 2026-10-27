/* R4 · §10 Rendimiento en el demo CONSTRUIDO: el tiempo a la primera pantalla
   útil de cada rol, el FCP y el LCP, el CLS al llegar los datos, las tareas
   largas y lo que se baja.

   node docs/experiencia-v2/R-revision/herramientas/r4-rendimiento.mjs <url-demo> [freno-cpu] [ancho]

   «Primera pantalla útil»: desde el comienzo de la navegación hasta el primer
   cuadro en que <main> tiene contenido (más de 80 caracteres, como el auditor) y
   no queda ningún «Cargando…» ([data-cargando]). Cada medida es un contexto
   nuevo (sin caché), con la introducción del rol ya vista. Se dan la mediana y
   el peor de N cargas. */
import { lanzar, SIN_INTRO, INICIOS, ROLES, guardar, esperar } from './r4-comun.mjs'

const [base = 'http://127.0.0.1:5188', frenoTxt = '1', anchoTxt = '1280'] = process.argv.slice(2)
const freno = Number(frenoTxt), ancho = Number(anchoTxt)
const N = Number(process.env.R4_N ?? 5)

const SONDA = () => {
  const m = { cls: 0, desplazamientos: [], largas: [], lcp: null, fcp: null, listo: null }
  window.__r4m = m
  const desc = n => n ? `${n.nodeName.toLowerCase()}${n.id ? '#' + n.id : ''}${n.getAttribute?.('data-cifra') !== null && n.getAttribute ? '' : ''}${(n.className && typeof n.className === 'string') ? '.' + n.className.split(' ').slice(0, 3).join('.') : ''} «${(n.textContent ?? '').trim().slice(0, 40)}»` : '(sin nodo)'
  new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) { m.cls += e.value; m.desplazamientos.push({ t: Math.round(e.startTime), v: +e.value.toFixed(4), de: (e.sources ?? []).slice(0, 3).map(s => desc(s.node)) }) } }).observe({ type: 'layout-shift', buffered: true })
  new PerformanceObserver(l => { for (const e of l.getEntries()) m.largas.push({ t: Math.round(e.startTime), ms: Math.round(e.duration) }) }).observe({ type: 'longtask', buffered: true })
  new PerformanceObserver(l => { const e = l.getEntries().at(-1); if (e) m.lcp = { t: Math.round(e.startTime), de: desc(e.element) } }).observe({ type: 'largest-contentful-paint', buffered: true })
  new PerformanceObserver(l => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') m.fcp = Math.round(e.startTime) }).observe({ type: 'paint', buffered: true })
  const mirar = () => {
    if (m.listo === null && document.querySelector('main') && !document.querySelector('[data-cargando]') && (document.querySelector('main')?.innerText ?? '').length > 80) {
      m.listo = Math.round(performance.now())
      return
    }
    requestAnimationFrame(mirar)
  }
  requestAnimationFrame(mirar)
}

const resultados = {}
const navegador = await lanzar()
for (const rol of ROLES) {
  resultados[rol] = []
  for (let i = 0; i < N; i++) {
    const contexto = await navegador.newContext({ viewport: { width: ancho, height: ancho < 600 ? 844 : 900 }, isMobile: ancho < 600, hasTouch: ancho < 600, locale: 'es-CO', timezoneId: 'America/Bogota' })
    await contexto.addInitScript(SIN_INTRO)
    await contexto.addInitScript(SONDA)
    const page = await contexto.newPage()
    if (freno > 1) { const cdp = await contexto.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: freno }) }
    await page.goto(`${base}/${INICIOS[rol]}`, { waitUntil: 'load' })
    await page.waitForFunction(() => window.__r4m?.listo !== null, undefined, { timeout: 30_000 }).catch(() => {})
    await esperar(2500) // lo que se mueve después (fuentes, datos que llegan tarde)
    const m = await page.evaluate(() => {
      const js = performance.getEntriesByType('resource').filter(r => r.name.endsWith('.js'))
      const nav = performance.getEntriesByType('navigation')[0]
      return { ...window.__r4m, dcl: Math.round(nav?.domContentLoadedEventEnd ?? 0), cargaJs: js.length, bytesJs: js.reduce((a, r) => a + (r.decodedBodySize || 0), 0) }
    })
    resultados[rol].push(m)
    await contexto.close()
  }
}
await navegador.close()

const med = xs => { const a = xs.filter(x => x !== null && x !== undefined).sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : null }
const tabla = Object.fromEntries(Object.entries(resultados).map(([rol, xs]) => [rol, {
  ruta: INICIOS[rol], listo: med(xs.map(x => x.listo)), listoMax: Math.max(...xs.map(x => x.listo ?? Infinity)),
  fcp: med(xs.map(x => x.fcp)), lcp: med(xs.map(x => x.lcp?.t)), lcpDe: xs[0]?.lcp?.de,
  cls: med(xs.map(x => +x.cls.toFixed(4))), clsMax: Math.max(...xs.map(x => +x.cls.toFixed(4))),
  largas: med(xs.map(x => x.largas.length)), largaMax: Math.max(0, ...xs.flatMap(x => x.largas.map(l => l.ms))),
  chunksJs: med(xs.map(x => x.cargaJs)), kbJs: Math.round(med(xs.map(x => x.bytesJs)) / 1024),
  desplazamientos: xs.find(x => x.cls > 0)?.desplazamientos ?? [],
}]))
const f = guardar(`rendimiento-cpu${freno}-${ancho}.json`, { base, freno, ancho, n: N, tabla, crudo: resultados })
console.log(`Demo construido · CPU ${freno}× · ${ancho} px · mediana de ${N} cargas sin caché → ${f}`)
for (const [rol, x] of Object.entries(tabla))
  console.log(`  ${rol.padEnd(5)} lista ${x.listo} ms (peor ${x.listoMax}) · FCP ${x.fcp} · LCP ${x.lcp} · CLS ${x.cls} (peor ${x.clsMax}) · tareas largas ${x.largas} (la peor ${x.largaMax} ms) · ${x.chunksJs} trozos JS, ${x.kbJs} KB`)
