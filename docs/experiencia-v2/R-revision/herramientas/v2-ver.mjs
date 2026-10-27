// V2 · Verificador adversarial: abre una ruta en un ancho y un tema, corre una
// expresión en la página (la evaluación devuelve JSON) y, si se pide, guarda la captura.
// Uso: node v2-ver.mjs '<hash>' <ancho> <light|dark> '<expresión JS>' [captura.png] [--antes '<js de pasos>']
// Ejemplo: node v2-ver.mjs '#/ger/resultados/ceiba~portafolio/curso' 1280 light \
//   '[...document.querySelectorAll("[data-relleno]")].map(e=>e.getBoundingClientRect().width)'
import { chromium } from 'playwright'

const BASE = (process.env.V2_URL ?? 'http://localhost:5187').replace(/\/$/, '')
const [hash, anchoTxt = "1440", tema = "light", expr = "null", capturaArg, ...resto0] = process.argv.slice(2)
const captura = capturaArg && !capturaArg.startsWith("--") && capturaArg !== "" ? capturaArg : undefined
const resto = capturaArg && capturaArg.startsWith("--") ? [capturaArg, ...resto0] : resto0
const iAntes = resto.indexOf('--antes')
const antes = iAntes >= 0 ? resto[iAntes + 1] : null
const iAlto = resto.indexOf('--alto')
const alto = iAlto >= 0 ? Number(resto[iAlto + 1]) : 900
const completa = resto.includes('--completa')
const ROLES = ['ger', 'prod', 'sup', 'oper', 'jefe', 'conf', 'plan', 'tec', 'cont', 'reg', 'adm']

const nav = await chromium.launch()
const ctx = await nav.newContext({ viewport: { width: Number(anchoTxt), height: alto }, locale: 'es-CO', timezoneId: 'America/Bogota' })
await ctx.addInitScript(([roles, t]) => {
  for (const r of roles) localStorage.setItem(`trim.intro.${r}`, '1')
  localStorage.setItem('trim.tema', t)
}, [ROLES, tema])
const p = await ctx.newPage()
const errores = []
p.on('pageerror', e => errores.push(String(e)))
await p.goto(`${BASE}/${hash}`, { waitUntil: 'networkidle' })
await p.waitForTimeout(900)
if (antes) {
  // Pasos con Playwright: «click:<selector>», «press:<tecla>», «focus:<selector>», «wait:<ms>», separados por « ;; ».
  for (const paso of antes.split(' ;; ')) {
    const [tipo, ...arg] = paso.split(':'); const a = arg.join(':')
    if (tipo === 'click') await p.locator(a).first().click()
    else if (tipo === 'press') await p.keyboard.press(a)
    else if (tipo === 'focus') await p.locator(a).first().focus()
    else if (tipo === 'text') await p.getByText(a, { exact: false }).first().click()
    else if (tipo === 'role') { const [rol, nombre] = a.split('|'); await p.getByRole(rol, { name: nombre }).first().click() }
    else if (tipo === 'wait') await p.waitForTimeout(Number(a))
    await p.waitForTimeout(350)
  }
}
const r = await p.evaluate(e => { try { return (0, eval)(e) } catch (x) { return 'ERROR: ' + x } }, expr)
console.log(JSON.stringify(r, null, 1))
if (errores.length) console.error('pageerror:', errores)
if (captura) await p.screenshot({ path: captura, fullPage: completa })
await nav.close()
