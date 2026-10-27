// M4 · Lee del motor, por la costura (src/shared/api), el nivel 3 de un equipo y las
// series del gerente, en el servidor propio (http://localhost:5183). Solo lectura.
// Uso: node leer-nivel3.mjs <salida.json> [equipo]
import { chromium } from '/Users/hollman/trim-hidrocarburos/node_modules/@playwright/test/index.mjs'
import { writeFileSync } from 'node:fs'
const [, , salida, equipo = 'P-201B'] = process.argv
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
await ctx.addInitScript(() => { for (const x of ['ger', 'sup', 'jefe']) localStorage.setItem('trim.intro.' + x, '1') })
const p = await ctx.newPage()
await p.goto('http://localhost:5183/#/jefe/equipos/ceiba/P-201B')
await p.waitForTimeout(2000)
const datos = await p.evaluate(async process_equipo => {
  const s = await import('/src/shared/api/sesion.ts')
  const t = await import('/src/shared/api/equiposTecnico.ts')
  const S = s.sesion()
  const n = t.pedirNivelEquipo('ceiba', process_equipo, S.ctx, S.versiones)
  return JSON.parse(JSON.stringify(n))
}, equipo)
writeFileSync(salida, JSON.stringify({ _leido: new Date().toISOString(), _como: `pedirNivelEquipo('ceiba','${equipo}', sesion().ctx, sesion().versiones) en http://localhost:5183`, nivel3: datos }, null, 1))
await b.close()
