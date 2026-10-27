// R3 · Lo que tarda un gráfico en pintarse al cambiar de momento o de filtro (§8.10:
// ≤ 16 ms). Con la Event Timing API del navegador: por cada clic real (Playwright),
// `processingEnd − processingStart` es el trabajo de JS del cambio (React vuelve a
// armar el dibujo) y `duration` llega hasta el siguiente cuadro pintado (redondeada a 8 ms).
// Uso: node r3-rendimiento.mjs [ancho] [cpu: 1 = normal, 4 = teléfono lento]
import { chromium } from 'playwright'

const BASE = (process.env.R3_URL ?? 'http://localhost:5183').replace(/\/$/, '')
const ANCHO = +(process.argv[2] ?? 1440), CPU = +(process.argv[3] ?? 1)
const ROLES = ['ger', 'prod', 'sup', 'oper', 'jefe', 'conf', 'plan', 'tec', 'cont', 'reg', 'adm']
const CASOS = [
  ['La planta viva · La Ceiba · momentos', '#/ger/planta-viva/ceiba/curso', ['[data-momentos] [data-momento="antes"]', '[data-momentos] [data-momento="despues"]', '[data-momentos] [data-momento="durante"]']],
  ['La planta viva · todos · momentos', '#/ger/planta-viva/ceiba~portafolio/curso', ['[data-momentos] [data-momento="antes"]', '[data-momentos] [data-momento="despues"]', '[data-momentos] [data-momento="durante"]']],
  ['Resultados · mes a mes por equipo / por dónde se trabó', '#/ger/resultados/ceiba/curso', ['[data-mes-a-mes] button:nth-of-type(2)', '[data-mes-a-mes] button:nth-of-type(1)', '[data-mes-a-mes] button:nth-of-type(2)']],
  ['Resultados · un mes como período', '#/ger/resultados/ceiba/curso', ['[data-mes-a-mes] [data-mes="2026-09"]']],
  ['Equipos · filtros', '#/conf/equipos/ceiba', ['[data-filtro="Estado"] [data-opcion="parados"]', '[data-filtro="Estado"] [data-opcion="todos"]', '[data-filtro="Estado"] [data-opcion="avisan"]']],
  ['Nivel 3 · al vecino del tren', '#/sup/equipos/ceiba/P-201B', ['[data-vecinos] button:nth-of-type(2)']],
]
const b = await chromium.launch()
console.log(`| Gráfico y cambio | Ancho · CPU | Trabajo de JS (ms) | Hasta el cuadro pintado (ms) |`)
console.log(`|---|---|---|---|`)
for (const [nombre, hash, clics] of CASOS) {
  const ctx = await b.newContext({ viewport: { width: ANCHO, height: 900 }, locale: 'es-CO', timezoneId: 'America/Bogota' })
  await ctx.addInitScript(r => { for (const x of r) localStorage.setItem(`trim.intro.${x}`, '1') }, ROLES)
  const p = await ctx.newPage()
  const cdp = await ctx.newCDPSession(p)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU })
  await p.goto(`${BASE}/${hash}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(800)
  await p.evaluate(() => {
    window.__ev = []
    new PerformanceObserver(l => { for (const e of l.getEntries()) if (e.name === 'click' || e.name === 'pointerup') window.__ev.push({ n: e.name, d: e.duration, js: e.processingEnd - e.processingStart }) }).observe({ type: 'event', durationThreshold: 0, buffered: false })
  })
  const js = [], dur = []
  for (const c of clics) {
    const l = p.locator(c).first()
    if (!(await l.count())) { js.push(NaN); continue }
    await p.evaluate(() => { window.__ev = [] })
    await l.click(); await p.waitForTimeout(400)
    const ev = await p.evaluate(() => window.__ev.filter(e => e.n === 'click'))
    if (ev.length) { js.push(Math.max(...ev.map(e => e.js))); dur.push(Math.max(...ev.map(e => e.d))) }
  }
  const f = xs => xs.map(x => (Number.isNaN(x) ? '—' : x.toFixed(1).replace('.', ','))).join(' · ')
  console.log(`| ${nombre} | ${ANCHO} · ×${CPU} | ${f(js)} | ${f(dur)} |`)
  await ctx.close()
}
await b.close()
