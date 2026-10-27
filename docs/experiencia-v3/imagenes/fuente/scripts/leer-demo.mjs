// M4 · Lee las cifras del demo en el servidor de desarrollo propio (http://localhost:5183).
// Solo lectura: abre cada ruta, salta la introducción y guarda el texto visible.
// Uso: node leer-demo.mjs <salida.json> [ruta …]
import { chromium } from '/Users/hollman/trim-hidrocarburos/node_modules/@playwright/test/index.mjs'
import { writeFileSync } from 'node:fs'
const [, , salida, ...rutas] = process.argv
const ROLES = ['ger', 'prod', 'sup', 'oper', 'jefe', 'conf', 'plan', 'tec', 'cont', 'reg', 'adm']
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
await ctx.addInitScript(r => { for (const x of r) localStorage.setItem('trim.intro.' + x, '1') }, ROLES)
const p = await ctx.newPage()
const out = { _leido: new Date().toISOString(), _servidor: 'http://localhost:5183', rutas: {} }
for (const ruta of rutas) {
  await p.goto('http://localhost:5183/' + ruta)
  await p.waitForTimeout(1800)
  out.rutas[ruta] = await p.evaluate(() => document.querySelector('main')?.innerText ?? document.body.innerText)
}
writeFileSync(salida, JSON.stringify(out, null, 1))
await b.close()
