// M4 · Lee del motor, por la costura (pedirHoy), el Hoy de un rol en La Ceiba.
// Solo lectura, en http://localhost:5183. Uso: node leer-hoy.mjs <salida.json> [rol …]
import { chromium } from '/Users/hollman/trim-hidrocarburos/node_modules/@playwright/test/index.mjs'
import { writeFileSync } from 'node:fs'
const [, , salida, ...roles] = process.argv
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
await ctx.addInitScript(() => { localStorage.setItem('trim.intro.sup', '1') })
const p = await ctx.newPage()
await p.goto('http://localhost:5183/#/sup/hoy/ceiba/curso')
await p.waitForTimeout(2000)
const datos = await p.evaluate(async roles => {
  const s = await import('/src/shared/api/sesion.ts')
  const h = await import('/src/shared/api/hoy.ts')
  const S = s.sesion()
  return Object.fromEntries(roles.map(r => [r, JSON.parse(JSON.stringify(h.pedirHoy({ rol: r, campos: ['ceiba'] }, S)))]))
}, roles)
writeFileSync(salida, JSON.stringify({ _leido: new Date().toISOString(), _como: "pedirHoy({rol, campos:['ceiba']}, sesion()) en http://localhost:5183", ...datos }, null, 1))
await b.close()
