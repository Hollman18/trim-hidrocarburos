// M4 · Lee del motor, por la costura (pedirPlantaViva), lo que ve el gerente y el
// supervisor: «durante», mes en curso. Solo lectura, en http://localhost:5183.
// Uso: node leer-planta-viva.mjs <salida.json>
import { chromium } from '/Users/hollman/trim-hidrocarburos/node_modules/@playwright/test/index.mjs'
import { writeFileSync } from 'node:fs'
const [, , salida] = process.argv
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
await ctx.addInitScript(() => { localStorage.setItem('trim.intro.ger', '1') })
const p = await ctx.newPage()
await p.goto('http://localhost:5183/#/ger/planta-viva/ceiba~portafolio/curso')
await p.waitForTimeout(2000)
const datos = await p.evaluate(async () => {
  const s = await import('/src/shared/api/sesion.ts')
  const pv = await import('/src/shared/api/plantaViva.ts')
  const S = s.sesion()
  // El reloj del demo: 2-oct-2026, 14:00; «curso» = del 1 de octubre a ahora.
  const hasta = new Date(S.ctx.ahora ?? Date.now())
  const desde = new Date(hasta.getFullYear(), hasta.getMonth(), 1)
  const una = campos => JSON.parse(JSON.stringify(pv.pedirPlantaViva({ campos, momento: 'durante', desde, hasta }, S.ctx, S.versiones, S.clasificacionesAnh, S.planes)))
  return { ahora: String(hasta), desde: String(desde), portafolio: una(['ceiba', 'morichal', 'guacamayo', 'palmar', 'zarza']), ceiba: una(['ceiba']) }
})
writeFileSync(salida, JSON.stringify({ _leido: new Date().toISOString(), _como: 'pedirPlantaViva({campos, momento:"durante", desde: 1 de oct, hasta: ctx.ahora}) en http://localhost:5183', ...datos }, null, 1))
await b.close()
