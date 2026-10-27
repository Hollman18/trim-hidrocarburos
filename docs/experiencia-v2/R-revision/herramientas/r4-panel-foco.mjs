import { chromium } from '/Users/hollman/trim-hidrocarburos/node_modules/@playwright/test/index.mjs'
const b = await chromium.launch()
for (const tema of ['light', 'dark']) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
  await ctx.addInitScript(t => { for (const r of ['ger','prod','sup','oper','jefe','conf','tec','reg','adm']) localStorage.setItem('trim.intro.'+r,'1'); localStorage.setItem('trim.tema', t) }, tema)
  const p = await ctx.newPage()
  await p.goto('http://localhost:5184/#/sup/hoy/ceiba/curso'); await p.waitForTimeout(1500)
  const out = []
  for (let i = 0; i < 9; i++) {
    await p.keyboard.press('Tab'); await p.waitForTimeout(400)
    out.push(await p.evaluate(() => { const e = document.activeElement; const s = getComputedStyle(e); return `${(e.getAttribute('aria-label') ?? e.textContent).trim().slice(0,30)} → outline ${s.outlineWidth} ${s.outlineStyle} ${s.outlineColor} offset ${s.outlineOffset}; bg padre ${getComputedStyle(e.closest('nav')).backgroundColor}; transición ${s.transitionProperty.slice(0,60)} ${s.transitionDuration}` }))
    if (i === 4) await p.screenshot({ path: `/Users/hollman/trim-hidrocarburos/docs/experiencia-v2/R-revision/capturas/r4/foco-panel-1440-${tema}.png`, clip: { x: 0, y: 0, width: 260, height: 520 } })
  }
  console.log(tema); for (const o of out) console.log('  ', o)
  await ctx.close()
}
await b.close()
