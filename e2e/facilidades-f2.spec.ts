/* Fase 2 de facilidades (docs/experiencia-v3/PROMPT-FACILIDADES-POR-FASES.md): barriles bien
   contados. Lo del diluyente es del motor y lo prueba scripts/verificar-diluyente.mjs con el Campo X
   (el demo no tiene campos que diluyan). Aquí, lo que ve la persona: los dos tipos de pérdida
   nuevos, evaporación y fondos de tanque, en el formulario del operador, en el teléfono y en el
   escritorio. No registra nada: el balance de otras specs empieza «sin registro». */
import { expect } from '@playwright/test'
import { test } from './apoyo.ts'

for (const ancho of [390, 1440]) {
  test(`${ancho} px · el operador registra evaporación o fondos de tanque como pérdida`, async ({ page, flujo: f }) => {
    await page.setViewportSize({ width: ancho, height: ancho === 390 ? 844 : 900 })
    await f.abrir('/#/oper')
    await page.locator('[data-registrar-perdida]').click()
    const tipos = page.locator('[data-tipos-perdida]')
    await expect(tipos.locator('[data-tipo-perdida]')).toHaveCount(7)
    await expect(tipos.locator('[data-tipo-perdida="evaporacion"]')).toContainText('Evaporación')
    await expect(tipos.locator('[data-tipo-perdida="evaporacion"]')).toContainText('Livianos o nafta que se fueron del tanque al aire')
    await expect(tipos.locator('[data-tipo-perdida="fondos"]')).toContainText('Fondos de tanque')
    // Los dos pasan en la planta (los tanques): el tramo ya viene escogido.
    await tipos.locator('[data-tipo-perdida="fondos"]').click()
    await expect(page.locator('[data-tramos-perdida] [data-tramo="planta"]')).toHaveAttribute('aria-pressed', 'true')
    // Sin desplazarse de lado.
    f.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'sin desplazarse de lado')
    f.cerrar()
  })
}
