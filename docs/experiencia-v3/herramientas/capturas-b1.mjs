// B1 · Capturas de la identidad cálida (decisión 5) contra un Vite propio.
// Uso: TRIM_URL=http://localhost:5181 node docs/experiencia-v3/herramientas/capturas-b1.mjs <carpeta>
import { chromium } from '@playwright/test'
const URL_BASE = process.env.TRIM_URL ?? 'http://localhost:5181'
const salida = process.argv[2] ?? '.'
const RUTAS = [
  ['ger', '#/ger/planta-viva/ceiba~portafolio/curso'],
  ['sup', '#/sup/hoy/ceiba/curso'],
  ['jefe', '#/jefe/hoy/ceiba/curso'],
  ['prod', '#/prod/equipos/ceiba/P-201B'],
]
const navegador = await chromium.launch()
for (const tema of ['light', 'dark']) for (const [ancho, alto, nombre] of [[1440, 900, 'escritorio'], [390, 844, 'telefono']]) {
  const ctx = await navegador.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: 1 })
  await ctx.addInitScript(t => { for (const r of ['ger', 'sup', 'jefe', 'prod', 'oper', 'reg']) localStorage.setItem(`trim.intro.${r}`, '1'); localStorage.setItem('trim.tema', t) }, tema)
  const page = await ctx.newPage()
  const errores = []
  page.on('pageerror', e => errores.push(e.message))
  for (const [rol, ruta] of RUTAS) {
    await page.goto(`${URL_BASE}/${ruta}`)
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('main h1', { timeout: 20000 }).catch(() => {})
    await page.waitForFunction(() => !document.querySelector('[data-cargando]'), null, { timeout: 20000 }).catch(() => {})
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(400)
    const archivo = `${salida}/b1-${rol}-${nombre}-${tema === 'light' ? 'claro' : 'noche'}.png`
    await page.screenshot({ path: archivo })
    console.log(archivo)
  }
  if (nombre === 'telefono') {
    await page.goto(`${URL_BASE}/#/sup/hoy/ceiba/curso`); await page.waitForSelector('main h1'); await page.waitForFunction(() => !document.querySelector('[data-cargando]')); await page.waitForTimeout(400)
    await page.getByRole('button', { name: 'Abrir la navegación' }).click(); await page.waitForSelector('[role=dialog][aria-label="Navegación"] nav'); await page.waitForTimeout(600)
    const archivo = `${salida}/b1-sup-telefono-panel-${tema === 'light' ? 'claro' : 'noche'}.png`
    await page.screenshot({ path: archivo }); console.log(archivo)
  }
  const fuente = await page.evaluate(() => getComputedStyle(document.body).fontFamily + ' · ' + [...document.fonts].filter(f => f.status === 'loaded').map(f => `${f.family} ${f.weight}`).join(', '))
  console.log('letra:', fuente)
  if (errores.length) console.log('ERRORES', errores)
  await ctx.close()
}
await navegador.close()
