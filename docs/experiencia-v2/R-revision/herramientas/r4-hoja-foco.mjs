import { chromium } from '/Users/hollman/trim-hidrocarburos/node_modules/@playwright/test/index.mjs'
const b = await chromium.launch()
for (const w of [1280, 390]) {
const ctx = await b.newContext({ viewport: { width: w, height: 900 }, isMobile: w < 600, hasTouch: w < 600 })
await ctx.addInitScript(() => { for (const r of ['ger','prod','sup','oper','jefe','conf','tec','reg','adm']) localStorage.setItem('trim.intro.'+r,'1') })
const p = await ctx.newPage()
await p.goto('http://localhost:5184/#/ger/planta-viva/ceiba/curso'); await p.waitForTimeout(1500)
const g = p.locator('[data-tramo="planta"]').filter({ visible: true }).first()
await g.focus()
await p.evaluate(() => { window.__g = document.activeElement })
await p.keyboard.press('Enter'); await p.waitForTimeout(500)
const dentro = await p.evaluate(() => `${document.activeElement.getAttribute('aria-label')} · g conectado: ${window.__g.isConnected} · g inerte: ${!!window.__g.closest('[inert]')}`)
await p.keyboard.press('Escape'); await p.waitForTimeout(500)
const despues = await p.evaluate(() => `foco: ${document.activeElement === document.body ? '(body)' : document.activeElement.getAttribute('aria-label')?.slice(0,40)} · g conectado: ${window.__g.isConnected} · mismo: ${document.activeElement === window.__g} · g nuevo enfocable: ${!!document.querySelector('[data-tramo="planta"]')}`)
// ¿se puede enfocar de vuelta a mano?
const reenfoca = await p.evaluate(() => { window.__g.focus(); return document.activeElement === window.__g })
console.log(w, '| en la hoja:', dentro, '| tras Escape:', despues, '| g.focus() funciona:', reenfoca)
await ctx.close()
}
await b.close()
