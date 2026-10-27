// V2 · CLS de la primera carga de una ruta (PerformanceObserver de layout-shift, buffered).
// Uso: node v2-cls.mjs '<hash>' <ancho> [veces]
import { chromium } from 'playwright'
const BASE = (process.env.V2_URL ?? 'http://localhost:5187').replace(/\/$/, '')
const [hash, ancho = '1280', veces = '3'] = process.argv.slice(2)
const nav = await chromium.launch()
const res = []
for (let i = 0; i < Number(veces); i++) {
  const ctx = await nav.newContext({ viewport: { width: Number(ancho), height: 900 } })
  await ctx.addInitScript(() => {
    for (const r of ['ger','prod','sup','oper','jefe','conf','tec','reg','adm']) localStorage.setItem(`trim.intro.${r}`, '1')
    window.__cls = 0; window.__shifts = []
    new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) { window.__cls += e.value; window.__shifts.push({ v: +e.value.toFixed(4), t: Math.round(e.startTime), src: (e.sources || []).map(s => s.node?.nodeName + '.' + (s.node?.className?.toString?.() || '').slice(0, 40)) }) } }).observe({ type: 'layout-shift', buffered: true })
  })
  const p = await ctx.newPage()
  await p.goto(`${BASE}/${hash}`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(1500)
  res.push(await p.evaluate(() => ({ cls: +window.__cls.toFixed(4), shifts: window.__shifts.slice(0, 4) })))
  await ctx.close()
}
console.log(JSON.stringify(res, null, 1))
await nav.close()
