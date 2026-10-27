import { chromium, devices } from '/Users/hollman/trim-hidrocarburos/node_modules/@playwright/test/index.mjs'
const b = await chromium.launch()
const ctx = await b.newContext({ ...devices['iPhone 14'], browserName: undefined, defaultBrowserType: undefined })
await ctx.addInitScript(() => { for (const r of ['ger','prod','sup','oper','jefe','conf','tec','reg','adm']) localStorage.setItem('trim.intro.'+r,'1') })
const p = await ctx.newPage()
const foco = () => p.evaluate(() => { const e = document.activeElement; return e === document.body ? '(body)' : `${e.tagName} «${(e.getAttribute('aria-label') ?? e.textContent).trim().slice(0,50)}»` })
const vivas = () => p.evaluate(() => [...document.querySelectorAll('[role=status],[aria-live],[role=alert]')].map(e => `${e.getAttribute('role') ?? 'aria-live=' + e.getAttribute('aria-live')}: «${e.textContent.trim().slice(0,70)}»`))
const pregunta = () => p.evaluate(() => (document.querySelector('[data-operador]')?.innerText ?? '').split('\n').slice(0, 4).join(' | '))
await p.goto('http://localhost:5184/#/oper/hoy/ceiba/curso'); await p.waitForTimeout(1500)
console.log('inicio:', await pregunta())
for (let paso = 0; paso < 4; paso++) {
  // Tab desde donde esté hasta la primera opción grande (64 px o más)
  let n = 0
  for (; n < 30; n++) { await p.keyboard.press('Tab'); const h = await p.evaluate(() => document.activeElement.getBoundingClientRect().height); if (h >= 64) break }
  const op = await foco()
  await p.keyboard.press('Enter'); await p.waitForTimeout(700)
  console.log(`paso ${paso + 1}: ${n + 1} Tab hasta «${op}» → Enter → foco: ${await foco()} · ahora: ${await pregunta()} · vivas: ${JSON.stringify(await vivas())}`)
}
await b.close()
