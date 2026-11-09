/* Fase 7 de facilidades (docs/experiencia-v3/PROMPT-FACILIDADES-POR-FASES.md): «Mi panel», pieza Núcleo. Cada
   indicador contra su caso calculado a mano lo prueba scripts/verificar-indicadores.mjs; aquí, la puerta en la
   pantalla: el panel se ve bien en los dos temas y en el teléfono, lo que no tiene dato dice «Sin dato», y el
   gerente, producción y confiabilidad lo arman con indicadores y con cualquier señal conectada. */
import { expect, type Page } from '@playwright/test'
import { test } from './apoyo.ts'

const elementos = (page: Page) => page.locator('main [data-elemento]')

/** El contraste (WCAG) entre el texto de una tarjeta y su fondo. */
const contraste = (page: Page) => page.locator('main [data-elemento] h2').first().evaluate(h => {
  const rgb = (c: string) => (c.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number)
  const lum = (c: string) => { const [r, g, b] = rgb(c).map(v => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }); return 0.2126 * r! + 0.7152 * g! + 0.0722 * b! }
  const tarjeta = h.closest('[data-elemento]')!
  const a = lum(getComputedStyle(h).color), b = lum(getComputedStyle(tarjeta).backgroundColor)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
})

for (const tema of ['light', 'dark'] as const) {
  test(`390 px · tema ${tema === 'light' ? 'claro' : 'oscuro'}: el panel de ejemplo del gerente, legible y sin salirse; lo que no tiene dato lo dice`, async ({ page, flujo: f }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.emulateMedia({ colorScheme: tema })
    await f.abrir('/#/ger/panel')
    await expect(page.locator('main [data-panel-estado]')).toHaveText('Panel de ejemplo de su rol: cámbielo con «Editar el panel».')
    await expect(elementos(page)).toHaveCount(4)
    await expect(page.locator('main [data-elemento="diferido-por-causa"]')).toHaveAttribute('data-forma', 'columnas')
    await expect(page.locator('main [data-elemento="cortes-energia"]')).toContainText('Morichal Norte')
    await expect(page.locator('main [data-elemento="margen-n1"] [data-sin-dato]')).toContainText('Sin dato. Sin la tabla de generación y de cargas')
    f.ok(await contraste(page) >= 7, `el título de la tarjeta contra su fondo: contraste ${(await contraste(page)).toFixed(1)} (≥ 7)`)
    f.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'sin desplazarse de lado')
    // Las columnas caben en la tarjeta: no hace falta desplazarlas.
    f.ok(await page.locator('main [data-elemento] [role=region]').evaluateAll(rs => rs.every(r => r.scrollWidth <= r.clientWidth + 1)), 'las columnas caben en 390')
    f.cerrar()
  })
}

test('confiabilidad arma su panel: agrega una señal conectada y quita un indicador', async ({ page, flujo: f }) => {
  await f.abrir('/#/conf/panel')
  await expect(elementos(page)).toHaveCount(4)
  await expect(page.locator('main [data-elemento="mtbf"]')).toHaveAttribute('data-forma', 'cifra')
  await page.locator('main [data-editar-panel]').click()
  await page.locator('main [data-que]').selectOption('senal')
  await page.locator('main [data-campo-panel]').selectOption('ceiba')
  await page.locator('main [data-senal-panel]').selectOption({ label: 'TI-2011 · Temperatura de cojinete (°C)' })
  await page.locator('main [data-agregar-elemento]').click()
  await expect(page.locator('main [data-panel-estado]')).toHaveText('5 de 12 elementos.')
  await expect(page.locator('main [data-elemento="TI-2011"]')).toHaveAttribute('data-forma', 'tendencia')
  await expect(page.locator('main [data-elemento="TI-2011"] [data-kit]').first()).toBeVisible()
  await page.locator('main [data-elemento="mtbf"] [data-quitar]').click()
  await expect(page.locator('main [data-panel-estado]')).toHaveText('4 de 12 elementos.')
  await expect(page.locator('main [data-elemento="mtbf"]')).toHaveCount(0)
  await page.locator('main [data-editar-panel]').click()
  await expect(page.locator('main [data-agregar]')).toHaveCount(0)
  // Lo que guardó sigue al volver a la pantalla.
  await f.ir('#/conf/equipos')
  await f.ir('#/conf/panel')
  await expect(page.locator('main [data-elemento="TI-2011"]')).toBeVisible()
  f.cerrar()
})

test('«Mi panel» es del gerente, producción y confiabilidad: el supervisor no lo tiene', async ({ page, flujo: f }) => {
  await f.abrir('/#/prod/panel')
  await expect(page.locator('main [data-panel="prod"]')).toBeVisible()
  await f.ir('#/sup/panel')
  await expect(page.locator('main [data-panel]')).toHaveCount(0)
  f.cerrar()
})
