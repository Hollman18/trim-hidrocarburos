/* 28-oct · El historial del diferido y del perdido (el dueño: «para los cargos clave, en gráficos»): mes a mes en La
   planta viva (gerente, producción) y en Resultados (gerente, producción, jefe, confiabilidad); turno a turno en el Hoy
   del supervisor. Cada período sale de `GET /api/vistas/historial`, que es el balance con ese período. */
import { expect } from '@playwright/test'
import { test } from './apoyo.ts'

test('el historial: 13 meses por tramo, octubre igual al balance, el perdido aparte y los turnos del supervisor', async ({ flujo: f }) => {
  const { page } = f
  await test.step('el gerente, en La planta viva: 13 meses y octubre igual al balance del mes', async () => {
    await f.abrir('/#/ger/planta-viva/ceiba~portafolio/curso')
    const h = page.locator('main [data-historial="mes"]')
    await expect(h).toBeVisible()
    const meses = await h.locator('[data-periodo]').evaluateAll(es => es.map(e => [e.getAttribute('data-periodo'), Number(e.getAttribute('data-diferido')), e.getAttribute('data-fondo')]))
    const oct = meses.at(-1)
    const balance = Number(await page.locator('main [data-balance]').first().getAttribute('data-diferido'))
    f.ok(meses.length === 13 && oct?.[0] === '2026-10' && oct[1] === balance, `13 meses y octubre (${oct?.[1]}) igual al balance del mes (${balance})`)
    f.ok(oct?.[2] === '', 'el mes en curso no se juzga contra su máximo (sin fondo)')
    f.ok(meses.slice(0, -1).every(m => m[2] === 'bien' || m[2] === 'frenado'), 'los meses cerrados, en verde pálido o rojo pálido según su máximo firmado')
    await expect(h.locator('[data-historial-perdido="sin-registro"]')).toContainText('sin registro')
  })
  await test.step('Resultados del jefe de mantenimiento y de confiabilidad: también lo ven', async () => {
    // Confiabilidad: su «Resultados» es la pantalla de Confiabilidad (al lado de las fallas por mes).
    for (const r of ['/#/jefe/resultados/ceiba/curso', '/#/conf/confiabilidad/morichal/curso']) {
      await f.abrir(r)
      await expect(page.locator('main [data-historial="mes"]')).toBeVisible()
    }
  })
  await test.step('el supervisor, en Hoy: sus últimos 14 turnos', async () => {
    await f.abrir('/#/sup/hoy/ceiba/curso')
    const t = page.locator('main [data-historial="turno"]')
    await expect(t).toBeVisible()
    await expect(t.locator('[data-periodo]')).toHaveCount(14)
    await expect(t).toContainText('Sus últimos 14 turnos')
  })
  f.cerrar()
})
