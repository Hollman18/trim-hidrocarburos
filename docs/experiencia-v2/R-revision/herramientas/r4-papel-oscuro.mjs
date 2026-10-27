import { chromium } from '/Users/hollman/trim-hidrocarburos/node_modules/@playwright/test/index.mjs'
const D = '/private/tmp/claude-501/-Users-hollman/0809a9f7-4f6b-4a1e-b5b0-972baa33e07f/scratchpad/r4/salida/papel-dark'
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
await ctx.addInitScript(() => { for (const r of ['ger','prod','sup','oper','jefe','conf','tec','reg','adm']) localStorage.setItem('trim.intro.'+r,'1'); localStorage.setItem('trim.tema','dark'); window.print = () => { window.__p = 1 } })
const p = await ctx.newPage(); await p.goto('http://127.0.0.1:5188/#/ger/planta-viva/ceiba/curso'); await p.waitForTimeout(1500)
await p.getByRole('button', { name: 'Compartir el informe' }).click(); await p.waitForFunction(() => window.__p)
await p.evaluate(() => dispatchEvent(new Event('beforeprint'))); await p.emulateMedia({ media: 'print' })
console.log('tema tras beforeprint:', await p.evaluate(() => document.documentElement.getAttribute('data-theme')))
await p.pdf({ path: D + '/con-beforeprint.pdf', format: 'A4', printBackground: true, preferCSSPageSize: true })
await p.evaluate(() => dispatchEvent(new Event('afterprint')))
console.log('tema tras afterprint:', await p.evaluate(() => document.documentElement.getAttribute('data-theme')))
await b.close()
