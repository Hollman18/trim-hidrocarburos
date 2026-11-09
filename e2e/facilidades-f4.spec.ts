/* Fase 4 de facilidades (docs/experiencia-v3/PROMPT-FACILIDADES-POR-FASES.md): la pieza Energía. El motor
   (detección, relojes, aviso por rol, push) lo prueba scripts/verificar-planta.mjs; aquí, de punta a punta en
   la pantalla: el administrador prueba el aviso de apagón y cada rol lo ve a su manera, el operador responde
   y el supervisor lo ve, y al terminar la prueba el aviso se va. Se cambia de rol por el hash (sin recargar):
   en el demo, la prueba vive en la sesión del navegador. Sin la variable TRIM_ROL_ENERGIA, el de energía es
   el jefe de mantenimiento (D3). */
import { expect } from '@playwright/test'
import { test } from './apoyo.ts'

const conResponsable = process.env.TRIM_ROL_ENERGIA === '1'
const aviso = (page: import('@playwright/test').Page) => page.locator('main [data-aviso-planta]')

for (const ancho of [390, 1440]) {
  test(`${ancho} px · apagón total de prueba: cada rol lo suyo, el operador responde y al terminar se va`, async ({ page, flujo: f }) => {
    await page.setViewportSize({ width: ancho, height: ancho === 390 ? 844 : 900 })
    // Sin evento, nadie ve el aviso.
    await f.abrir('/#/sup')
    await expect(aviso(page)).toHaveCount(0)

    await f.ir('#/adm/conectores/ceiba/curso')
    await page.locator('[data-probar-apagon="total"]').click()
    await expect(page.locator('[data-prueba-apagon]')).toHaveAttribute('data-prueba-apagon', 'total')
    await expect(page.locator('[data-push-enviado]')).toBeVisible()

    await f.ir('#/sup')
    await expect(aviso(page)).toHaveAttribute('data-aviso-planta', 'total')
    await expect(aviso(page).locator('[data-titulo-aviso]')).toHaveText(/^Prueba · Apagón \d{2}:\d{2}\.$/)
    await expect(aviso(page).locator('[data-cuerpo-aviso]')).toContainText('Aire: 11 min. Tanque de agua: no sube, los pozos también pararon.')

    await f.ir('#/ger')
    await expect(aviso(page).locator('[data-titulo-aviso]')).toHaveText('Prueba · Se fue la energía en La Ceiba.')
    await expect(aviso(page).locator('[data-cuerpo-aviso]')).toContainText(/bbl\/d en juego\./)

    await f.ir('#/oper')
    await expect(aviso(page).locator('[data-pregunta-planta]')).toContainText('¿Ve luz en la subestación 2?')
    await aviso(page).locator('[data-responder-planta="No"]').click()
    await expect(aviso(page).locator('[data-respondido]')).toHaveAttribute('data-respondido', 'No')

    await f.ir('#/sup')
    await expect(aviso(page).locator('[data-respuestas-planta]')).toContainText('Jairo Peña: no hay luz')

    await f.ir(conResponsable ? '#/ener' : '#/jefe')
    await expect(aviso(page).locator('[data-titulo-aviso]')).toHaveText(/^Prueba · Disparo 52-SE2 \d{2}:\d{2}:\d{2}\.$/)
    if (conResponsable) {
      await f.ir('#/jefe')
      await expect(aviso(page)).toHaveCount(0)
    }
    // El técnico no recibe el aviso del apagón.
    await f.ir('#/tec')
    await expect(aviso(page)).toHaveCount(0)
    f.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'sin desplazarse de lado')

    await f.ir('#/adm/conectores/ceiba/curso')
    await page.locator('[data-terminar-prueba]').click()
    await expect(page.locator('[data-prueba-apagon]')).toHaveAttribute('data-prueba-apagon', 'ninguna')
    await f.ir('#/sup')
    await expect(aviso(page)).toHaveCount(0)
    f.cerrar()
  })
}

test('apagón parcial de prueba: el supervisor ve que se cayó el circuito de las bombas de agua', async ({ page, flujo: f }) => {
  await f.abrir('/#/adm/conectores/ceiba/curso')
  await page.locator('[data-probar-apagon="parcial"]').click()
  await expect(page.locator('[data-prueba-apagon]')).toHaveAttribute('data-prueba-apagon', 'parcial')
  await f.ir('#/sup')
  await expect(aviso(page)).toHaveAttribute('data-aviso-planta', 'parcial')
  await expect(aviso(page).locator('[data-titulo-aviso]')).toHaveText(/^Prueba · Apagón parcial \d{2}:\d{2}\.$/)
  await expect(aviso(page).locator('[data-cuerpo-aviso]')).toContainText('Paró: 3 bombas de agua.')
  f.cerrar()
})

test('el aviso en el dispositivo: lo activa quien recibe el apagón, no el técnico', async ({ page, flujo: f }) => {
  await f.abrir('/#/sup/perfil')
  await expect(page.locator('main [data-push]')).toBeVisible()
  await f.ir('#/tec/perfil')
  await expect(page.locator('main [data-push]')).toHaveCount(0)
  f.cerrar()
})
