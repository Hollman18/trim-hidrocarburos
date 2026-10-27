#!/usr/bin/env node
/* K2 · El detector del auditor (`e2e/auditoria/detector.ts`) en unas rutas y unos anchos, sin
   correr el auditor entero. USO: node …/k2-detector.mjs --url http://localhost:5182 --anchos 390,320 '#/conf/equipos/ceiba' … */
import { pathToFileURL, fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { chromium } from 'playwright'
const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const argv = process.argv.slice(2)
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i < 0 ? d : argv[i + 1] }
const BASE = String(arg('url', 'http://localhost:5182')).replace(/\/$/, '')
const ANCHOS = String(arg('anchos', '390,320')).split(',').map(Number)
const rutas = argv.filter((a, i) => a.startsWith('#/') && !['--url', '--anchos'].includes(argv[i - 1]))
const { detectar } = await import(pathToFileURL(join(RAIZ, 'e2e/auditoria/detector.ts')).href)
const { ROLES } = await import(pathToFileURL(join(RAIZ, 'e2e/apoyo.ts')).href).catch(() => ({ ROLES: ['ger', 'prod', 'reg', 'sup', 'oper', 'jefe', 'conf', 'tec', 'adm'] }))
const browser = await chromium.launch()
for (const ancho of ANCHOS) {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: 900 }, isMobile: ancho < 600, hasTouch: ancho < 600, locale: 'es-CO', timezoneId: 'America/Bogota' })
  await ctx.addInitScript(rs => { for (const r of rs) localStorage.setItem(`trim.intro.${r}`, '1') }, ROLES)
  for (const ruta of rutas) {
    const page = await ctx.newPage()
    await page.goto(`${BASE}/${ruta}`)
    await page.waitForTimeout(2500)
    await page.waitForFunction(() => !document.querySelector('[data-cargando]'), undefined, { timeout: 15000 }).catch(() => {})
    const h = await page.evaluate(detectar)
    console.log(`${ancho} ${ruta}: ${h.length ? '' : 'limpio'}`)
    for (const x of h) console.log('   ', JSON.stringify(x).slice(0, 260))
    await page.close()
  }
  await ctx.close()
}
await browser.close()
