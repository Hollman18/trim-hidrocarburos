/* Fase 3 de facilidades (docs/experiencia-v3/PROMPT-FACILIDADES-POR-FASES.md): la conexión según el
   estado de la planta. El Palmar es el campo del demo sin historiador: el gateway lee directo los
   equipos. Lo del simulador y la semilla lo prueba scripts/verificar-conexion.mjs; aquí, lo que ve
   la persona: la subestación de El Palmar con el interruptor por su relé y la entrada «hay tensión»
   del gateway, y la cadena del dato que dice de dónde sale y que es solo lectura. La Ceiba, que
   mezcla historiador y conexión directa, no cambia. */
import { expect } from '@playwright/test'
import { test } from './apoyo.ts'

const instrumentos = (f: { page: import('@playwright/test').Page }) =>
  f.page.locator('main [data-instrumentos] [data-dispositivo]').evaluateAll(es => es.map(e => e.getAttribute('data-dispositivo')))

for (const ancho of [390, 1440]) {
  test(`${ancho} px · El Palmar, sin historiador: la subestación se lee directo, con su relé y la entrada «hay tensión»`, async ({ page, flujo: f }) => {
    await page.setViewportSize({ width: ancho, height: ancho === 390 ? 844 : 900 })
    await f.abrir('/#/jefe/equipos/palmar/SE-2/diagnostico')
    await expect(page.locator('main [data-instrumentos]')).toBeVisible()
    f.ok((await instrumentos(f)).join() === 'II-0021,VI-0021,TI-0021,52-SE2,EI-0020', `los instrumentos de SE-2 en El Palmar (${(await instrumentos(f)).join(', ')})`)

    await page.locator('main [data-dispositivo="52-SE2"]').first().click()
    const cadena = page.locator('main').getByText('De dónde sale · 52-SE2').locator('..')
    await expect(cadena).toContainText('Estado en línea, directo del relé de protección')
    await expect(cadena).toContainText('Lectura viva')

    await f.abrir('/#/jefe/equipos/ceiba/SE-2/diagnostico')
    await expect(page.locator('main [data-instrumentos]')).toBeVisible()
    f.ok((await instrumentos(f)).join() === 'II-0021,VI-0021,TI-0021', 'La Ceiba, que mezcla, sigue con sus tres instrumentos')
    f.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'sin desplazarse de lado')
    f.cerrar()
  })
}

test('el administrador ve en Conectores cómo se conecta cada planta', async ({ page, flujo: f }) => {
  for (const [campo, modo, texto] of [['palmar', 'directa', 'Directo a los equipos, sin historiador'], ['ceiba', 'mezcla', 'Historiador y directo a los equipos']] as const) {
    await f.abrir(`/#/adm/conectores/${campo}/curso`)
    const linea = page.locator('main [data-conexion]')
    await expect(linea).toHaveAttribute('data-conexion', modo)
    await expect(linea).toContainText(`Cómo se conecta: ${texto}`)
  }
  f.cerrar()
})
