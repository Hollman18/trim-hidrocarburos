import { chromium } from '@playwright/test'
const URL = process.env.TRIM_URL ?? 'http://localhost:5183'
const dir = 'docs/experiencia-v3/capturas/b3'
const rutas = { sup: '#/sup/hoy/ceiba/curso', oper: '#/oper/hoy/ceiba/curso', tec: '#/tec/hoy/ceiba/curso', jefe: '#/jefe/hoy/ceiba/curso', conf: '#/conf/equipos/ceiba', 'p201b-nivel3': '#/conf/equipos/ceiba/P-201B' }
const b = await chromium.launch()
for (const [ancho, alto, movil] of [[1440, 900, false], [390, 844, true]]) {
  const ctx = await b.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: movil ? 2 : 1, isMobile: movil, hasTouch: movil, locale: 'es-CO', timezoneId: 'America/Bogota' })
  for (const [n, r] of Object.entries(rutas)) {
    const p = await ctx.newPage()
    await p.goto(`${URL}/${r}`); await p.waitForTimeout(2500)
    await p.screenshot({ path: `${dir}/${n}-${ancho}.png` })
    const h = await p.evaluate(() => (document.querySelector('.vista')?.scrollHeight ?? 900) + 120)
    await p.setViewportSize({ width: ancho, height: Math.min(h, 6000) }); await p.waitForTimeout(600)
    await p.screenshot({ path: `${dir}/${n}-${ancho}-entera.png` })
    await p.close()
  }
  await ctx.close()
}
await b.close()
