/* Fase 6 de facilidades (docs/experiencia-v3/PROMPT-FACILIDADES-POR-FASES.md): el re-arranque guiado. El motor
   (el orden respeta todos los límites, el margen N-1 a mano, el cronómetro) lo prueba scripts/verificar-arranque.mjs;
   aquí, la puerta en la pantalla: tras un apagón de prueba, el supervisor ve el orden de arranque por barriles y
   el cronómetro, en el teléfono, con una sola acción principal (marcar la fase que sigue), y cada fase queda con
   lo que duró. Sin tabla de generación (el demo), el margen N-1 dice qué falta. */
import { expect, type Page } from '@playwright/test'
import { test } from './apoyo.ts'

const arranque = (page: Page) => page.locator('main [data-arranque="ceiba"]')

async function probar(page: Page, f: { ir: (h: string) => Promise<void> }, tipo: 'total' | 'parcial') {
  await f.ir('#/adm/conectores/ceiba/curso')
  await page.locator(`[data-probar-apagon="${tipo}"]`).click()
  await expect(page.locator('[data-prueba-apagon]')).toHaveAttribute('data-prueba-apagon', tipo)
}
async function terminar(page: Page, f: { ir: (h: string) => Promise<void> }) {
  await f.ir('#/adm/conectores/ceiba/curso')
  await page.locator('[data-terminar-prueba]').click()
  await expect(page.locator('[data-prueba-apagon]')).toHaveAttribute('data-prueba-apagon', 'ninguna')
}

test('390 px · apagón total: el supervisor ve el orden y marca cada fase; queda lo que duró cada una', async ({ page, flujo: f }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await f.abrir('/#/sup')
  await expect(arranque(page)).toHaveCount(0)
  await probar(page, f, 'total')

  await f.ir('#/sup')
  const a = arranque(page)
  await expect(a.locator('h2')).toHaveText('Re-arranque · La Ceiba')
  await expect(a).toContainText('11.360 bbl/d por recuperar en 10 pasos.')
  // Lo que habilita primero, y lo que se ve de entrada son 5 pasos con el resto a un toque.
  await expect(a.locator('[data-orden-arranque] li').first()).toContainText('Control y comunicaciones')
  await expect(a.locator('[data-orden-arranque] li').nth(1)).toContainText('Aire de instrumentos (K-101)')
  await expect(a.locator('[data-orden-arranque] li')).toHaveCount(5)
  await a.locator('[data-ver-pasos]').click()
  await expect(a.locator('[data-orden-arranque] li[data-paso="pozos"]')).toHaveCount(5)
  await expect(a.locator('[data-orden-arranque] li').filter({ hasText: '(90 %)' })).toHaveCount(1)
  await expect(a.locator('[data-margen]')).toContainText('Sin la tabla de generación y de cargas')
  // Una sola acción principal.
  await expect(a.locator('[data-marcar-fase]')).toHaveCount(1)
  f.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'cabe en 390 sin desplazarse de lado')

  const fases = ['causa', 'energia', 'primer-pozo', 'noventa', 'normal']
  for (const [i, fase] of fases.entries()) {
    await expect(a.locator('[data-marcar-fase]')).toHaveAttribute('data-marcar-fase', fase)
    await a.locator('[data-marcar-fase]').click()
    await expect(a.locator('[data-cronometro] li')).toHaveCount(i + 2)
    await expect(a.locator(`[data-cronometro] li[data-fase="${fase}"] [data-duracion]`)).toHaveText(/^\d+ (s|min)$|^\d+ h \d{2} min$/)
    // Con la energía marcada, el orden cuenta desde esa hora.
    if (fase === 'energia') await expect(a).toContainText(/desde las \d{2}:\d{2}/)
  }
  await expect(a.locator('[data-marcar-fase]')).toHaveCount(0)
  await expect(a.locator('[data-arranque-terminado]')).toHaveText(/^Arranque terminado en \d+ (s|min)\.$/)

  // El gerente y el operador no lo ven: no es su decisión.
  for (const rol of ['ger', 'oper']) {
    await f.ir(`#/${rol}`)
    await expect(arranque(page)).toHaveCount(0)
  }
  await terminar(page, f)
  await f.ir('#/sup')
  await expect(arranque(page)).toHaveCount(0)
  f.cerrar()
})

test('390 px · apagón parcial: solo las bombas de agua, y sin «primer pozo» en el cronómetro', async ({ page, flujo: f }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await f.abrir('/#/sup')
  await probar(page, f, 'parcial')
  await f.ir('#/sup')
  const a = arranque(page)
  await expect(a).toContainText('3 pasos; no hay pozos que arrancar.')
  await expect(a.locator('[data-orden-arranque] li[data-paso="agua"]')).toHaveCount(3)
  for (const fase of ['causa', 'energia', 'normal']) {
    await expect(a.locator('[data-marcar-fase]')).toHaveAttribute('data-marcar-fase', fase)
    await a.locator('[data-marcar-fase]').click()
  }
  await expect(a.locator('[data-cronometro] li[data-fase="primer-pozo"]')).toHaveCount(0)
  await expect(a.locator('[data-arranque-terminado]')).toBeVisible()
  await terminar(page, f)
  f.cerrar()
})
