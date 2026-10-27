// Captura de página completa o de un selector, para evidencia puntual.
import { chromium } from 'playwright'
const [,, hash, salida, ancho = '1440', tema = 'light', sel = '', alto = '900'] = process.argv
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: +ancho, height: +alto }, locale: 'es-CO', timezoneId: 'America/Bogota', isMobile: +ancho <= 430, hasTouch: +ancho <= 430 })
await ctx.addInitScript(t => { for (const r of ['ger','prod','sup','oper','jefe','conf','plan','tec','cont','reg','adm']) localStorage.setItem(`trim.intro.${r}`,'1'); localStorage.setItem('trim.tema', t) }, tema)
const p = await ctx.newPage()
await p.goto(`http://localhost:5183/${hash}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(1000)
if (process.env.CLIC) { for (const c of process.env.CLIC.split('||')) { await p.locator(c).first().click(); await p.waitForTimeout(500) } }
if (sel) { const l = p.locator(sel).first(); await l.scrollIntoViewIfNeeded(); await l.screenshot({ path: salida }) } else {
  if (process.env.COMPLETA) await p.addStyleTag({ content: 'html,body,#root,.raiz-app,.raiz-app>main,.vista{height:auto!important;overflow:visible!important;max-height:none!important}' })
  await p.waitForTimeout(200)
  await p.screenshot({ path: salida, fullPage: !!process.env.COMPLETA })
}
await b.close()
