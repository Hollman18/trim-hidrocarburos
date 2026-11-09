/* Fase 5 de facilidades (docs/experiencia-v3/PROMPT-FACILIDADES-POR-FASES.md): la pieza Planta. El vigía de planta
   (scripts/verificar-planta.mjs §8) detecta un aviso por cada familia nueva, en Morichal: la bomba de despacho P-401,
   el tratador electrostático TE-501, la torre de enfriamiento CT-601, el separador de agua libre FWKO-101 y la bomba
   de diluyente P-701. Aquí, lo que ven el jefe de mantenimiento y confiabilidad: los cinco en «Avisan», cada uno en su
   tren, y en la ficha de cada uno «Lo que avisa el vigía». */
import { expect, type Page } from '@playwright/test'
import { test } from './apoyo.ts'

const filas = (page: Page) => page.locator('main [data-fila-equipo]').evaluateAll(es => es.map(e => e.getAttribute('data-fila-equipo') ?? ''))
const filtrar = async (page: Page, grupo: string, opcion: string) => {
  const grupoEl = page.locator(`main [role=radiogroup][aria-label="${grupo}"]`)
  if (!await grupoEl.isVisible()) await page.locator('main [data-mas-filtros]').click()
  await grupoEl.locator(`[data-opcion="${opcion}"]`).click()
  await page.waitForTimeout(150)
}
const NUEVOS = ['P-401', 'TE-501', 'CT-601', 'FWKO-101', 'P-701']

for (const rol of ['jefe', 'conf'] as const) {
  test(`${rol} · los equipos de planta de Morichal en «Avisan», en su tren y con el aviso del vigía en su ficha`, async ({ page, flujo: f }) => {
    await f.abrir(`/#/${rol}/equipos/morichal`)
    await filtrar(page, 'Estado', 'avisan')
    const avisan = await filas(page)
    f.ok(NUEVOS.every(e => avisan.includes(e)), `«Avisan» trae los cinco (${avisan.join(' ')})`)
    await filtrar(page, 'Estado', 'todos')
    await filtrar(page, 'Tren', 'agua')
    f.ok((await filas(page)).includes('CT-601') && !(await filas(page)).includes('P-401'), 'la torre de enfriamiento va en el tren de agua; la bomba de despacho no')
    await filtrar(page, 'Tren', 'crudo')
    const crudo = await filas(page)
    f.ok(['P-401', 'TE-501', 'FWKO-101', 'P-701'].every(e => crudo.includes(e)), `despacho, tratador, FWKO y diluyente en el tren de crudo (${crudo.join(' ')})`)

    await f.abrir(`/#/${rol}/equipos/morichal/CT-601`)
    const vigia = page.locator('main [data-vigia-planta]')
    await expect(vigia).toContainText('Temperatura del agua de salida de CT-601: 37,8 °C; sube hacia su alarma (40 °C) y llega en 5 d.')
    await expect(vigia).toContainText('Revisar el relleno y los ventiladores')
    f.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'sin desplazarse de lado')
    f.cerrar()
  })
}

test('390 px · la ficha de la bomba de diluyente con su aviso, sin salirse', async ({ page, flujo: f }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await f.abrir('/#/jefe/equipos/morichal/P-701')
  await expect(page.locator('main [data-aviso-vigia="FI-8011"]')).toContainText('Caudal de nafta de P-701: 2.360 bbl/d; baja hacia su alarma (2.000 bbl/d)')
  f.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'sin desplazarse de lado')
  f.cerrar()
})
