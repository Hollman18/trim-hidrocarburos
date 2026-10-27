// M4 · Lee del motor, por la costura, lo necesario de oper, jefe, prod, reg y el cierre del gerente
// (necesario-por-rol.md de M1). Solo lectura, en http://localhost:5183. Uso: node leer-roles.mjs <salida.json>
import { chromium } from '/Users/hollman/trim-hidrocarburos/node_modules/@playwright/test/index.mjs'
import { writeFileSync } from 'node:fs'
const [, , salida] = process.argv
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
await ctx.addInitScript(() => { for (const r of ['ger', 'jefe']) localStorage.setItem('trim.intro.' + r, '1') })
const p = await ctx.newPage()
await p.goto('http://localhost:5183/#/jefe/hoy/ceiba/curso')
await p.waitForTimeout(2000)
const datos = await p.evaluate(async () => {
  const J = x => JSON.parse(JSON.stringify(x))
  const s = await import('/src/shared/api/sesion.ts'), h = await import('/src/shared/api/hoy.ts')
  const t = await import('/src/shared/api/equiposTecnico.ts'), r = await import('/src/shared/api/regulatorio.ts')
  const re = await import('/src/shared/api/resultados.ts'), sap = await import('/src/shared/api/sap.ts'), cal = await import('/src/shared/api/calendario.ts')
  const pv = await import('/src/shared/api/plantaViva.ts'), rel = await import('/src/entities/reloj.ts')
  const S = s.sesion(), AHORA = rel.AHORA, desde = new Date(AHORA.getFullYear(), AHORA.getMonth(), 1)
  const out = { ahora: String(AHORA) }
  for (const rol of ['oper', 'jefe', 'prod', 'reg', 'tec']) { try { out['hoy_' + rol] = J(h.pedirHoy({ rol, campos: ['ceiba'] }, S)) } catch (e) { out['hoy_' + rol] = String(e) } }
  out.lista = J(t.pedirListaEquipos(['ceiba'], S.ctx, S.versiones))
  out.reg = J(r.pedirReporteAnh({ campos: ['ceiba'], desde, hasta: AHORA }, S.ctx, S.clasificacionesAnh))
  out.resGer = J(re.pedirResultados({ rol: 'ger', campos: ['ceiba', 'morichal', 'guacamayo', 'palmar', 'zarza'], desde, hasta: AHORA }, { ctx: S.ctx, versiones: S.versiones, clasificacionesAnh: S.clasificacionesAnh }))
  out.relojes = J(sap.pedirRelojes(['ceiba'], cal.pedirInicioDeHistoria(), AHORA, S.ctx))
  out.pvCeiba = J(pv.pedirPlantaViva({ campos: ['ceiba'], momento: 'durante', desde, hasta: AHORA }, S.ctx, S.versiones, S.clasificacionesAnh, S.planes))
  out.pvAntes = J(pv.pedirPlantaViva({ campos: ['ceiba', 'morichal', 'guacamayo', 'palmar', 'zarza'], momento: 'antes', desde, hasta: AHORA }, S.ctx, S.versiones, S.clasificacionesAnh, S.planes)).cifras
  return out
})
writeFileSync(salida, JSON.stringify({ _leido: new Date().toISOString(), _como: 'pedirHoy, pedirListaEquipos, pedirReporteAnh, pedirResultados, pedirRelojes, pedirPlantaViva en http://localhost:5183', ...datos }, null, 1))
await b.close()
