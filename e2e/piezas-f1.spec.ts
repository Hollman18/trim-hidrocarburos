/* Fase 1 de facilidades (docs/experiencia-v3/PROMPT-FACILIDADES-POR-FASES.md): las piezas de TRIM
   que contrata cada cliente. Se corre contra un front ya levantado con las piezas del demo:
     - sin TRIM_PIEZAS: el demo con todas (lo de hoy). Ningún rol dice que le falte una pieza;
     - TRIM_PIEZAS=energia (el front con VITE_PIEZAS=energia): el gerente abre su inicio y se le
       dice qué pieza falta, sin «Resultados» en el panel; el supervisor ve «Sin dato» donde iba su
       turno, sin cifras del libro; el administrador configura igual que siempre. */
import { expect } from '@playwright/test'
import { test } from './apoyo.ts'

const PIEZAS = process.env.TRIM_PIEZAS?.trim() ? process.env.TRIM_PIEZAS.split(',').map(x => x.trim()).filter(Boolean) : undefined

test.describe('piezas contratadas · fase 1', () => {
  test('con todas las piezas, ningún rol dice que le falte una', async ({ flujo: f }) => {
    test.skip(!!PIEZAS, 'el front tiene otras piezas')
    for (const ruta of ['/#/ger', '/#/prod', '/#/sup', '/#/oper', '/#/jefe', '/#/conf', '/#/tec', '/#/reg', '/#/adm']) {
      await f.abrir(ruta)
      await expect(f.page.locator('main [data-sin-pieza]')).toHaveCount(0)
    }
  })

  test('solo Energía: cada rol ve lo suyo o qué pieza falta, nunca cifras de otra pieza', async ({ flujo: f }) => {
    test.skip(PIEZAS?.join(',') !== 'energia', 'el front no tiene solo Energía')
    const { page } = f
    await f.abrir('/#/ger')
    await expect(page.locator('main [data-pantalla-sin-pieza="plantaViva"]')).toContainText('Barriles o Planta')
    await expect(page.locator('main')).not.toContainText('Producido')
    await expect(page.getByRole('navigation').getByText('Resultados', { exact: true })).toHaveCount(0)

    await f.abrir('/#/sup/hoy/ceiba/curso')
    await expect(page.locator('main [data-sin-pieza="barriles"]')).toContainText('Su turno es de la pieza Barriles')
    await expect(page.locator('main')).not.toContainText('Paradas por confirmar')

    await f.abrir('/#/adm')
    await expect(page.locator('main [data-sin-pieza]')).toHaveCount(0)
    await expect(page.locator('main')).toContainText('Estado de la configuración')
  })
})
