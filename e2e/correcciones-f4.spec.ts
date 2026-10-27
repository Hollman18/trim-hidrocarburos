// Las correcciones de F4 (lo que encontró el documento del backend al correr el
// motor, 5E·H9 y 5E·H30): la eficiencia de producción que no se puede creer se
// dice en palabras y nunca con un número sobre 100 %, y el factor de medición
// que propone TRIM va prellenado en «Filosofía operacional», paso 2, y se firma
// con lo demás. Con los datos del demo, el 2-oct a las 14:00: en septiembre las
// pruebas de El Palmar dan menos de lo que midió el punto oficial.
import { expect } from '@playwright/test'
import { test } from './apoyo.ts'

/** Los porcentajes que se leen en un texto («94,7 %», «100,8 %»), como números. */
const porcentajes = (t: string) => [...t.matchAll(/(\d{1,3}(?:\.\d{3})*(?:,\d+)?) ?%/g)].map(m => Number(m[1]!.replace(/\./g, '').replace(',', '.')))

// v3: la escalera salió de la primera capa de Producción (C-03, escalón): la regla de 5E·H30 se comprueba donde sigue la
// eficiencia, en la ⓘ del «% del potencial»: la que no se puede creer se dice en palabras y nunca con un número sobre 100 %.
test('Producción: la eficiencia que no se puede creer dice por qué, sin número; la que sí, con su número (5E·H30)', async ({ flujo: f }) => {
  const { page } = f
  // El Palmar, septiembre: las pruebas dan menos de lo que midió el punto oficial y el factor no está firmado.
  await f.abrir('/#/prod/produccion/palmar/cerrado')
  const ayuda = await page.getByRole('img', { name: /^% del potencial:/ }).getAttribute('aria-label') ?? ''
  f.ok(/la eficiencia de producción del período no se puede creer: Las pruebas dan menos/.test(ayuda) && !/% de eficiencia de producción/.test(ayuda),
    'El Palmar: el ⓘ del «% del potencial» dice por qué no se puede creer, sin el número')
  const t = await f.texto()
  f.ok(porcentajes(t).every(x => x <= 100), `ningún número sobre 100 % en la pantalla (${porcentajes(t).filter(x => x > 100).join(', ') || 'ninguno'})`)
  // La Ceiba, septiembre: las pruebas dan más que el punto oficial; la eficiencia se cree y va con su número.
  await f.ir('#/prod/produccion/ceiba/cerrado')
  const ceiba = await page.getByRole('img', { name: /^% del potencial:/ }).getAttribute('aria-label') ?? ''
  f.ok(/94,7 % de eficiencia de producción/.test(ceiba), `La Ceiba: «94,7 % de eficiencia de producción» (${ceiba.slice(-90)})`)
  f.cerrar()
})

test('Filosofía operacional, paso 2: el factor de medición va prellenado con lo que propone TRIM, se firma con lo demás y el motor lo usa (5E·H9)', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/adm/configuracion/palmar/curso')
  // F3 (UI-01): las partes de Configuración van en una lista, no en pestañas.
  await page.locator('main nav[data-partes] button', { hasText: 'Filosofía operacional' }).click()
  await expect(page.getByRole('heading', { name: 'Filosofía operacional · El Palmar' })).toBeVisible()
  await page.getByRole('button', { name: '2 Capacidades' }).click()
  const panel = page.locator('main [data-factor-medicion]')
  await expect(panel.locator('[data-factor-rige]')).toContainText('Rige 1,000')
  await expect(panel.locator('[data-factor-rige]')).toContainText('sin firmar')
  await expect(panel.locator('[data-factor-propuesto]')).toContainText('TRIM propone 0,998')
  await expect(panel.locator('[data-factor-propuesto]')).toContainText('La mediana de lo que midió el punto oficial ÷ lo que dan las pruebas en 80 días sin paradas')
  // Prellenado: la cifra y el porqué de TRIM, sin estar todavía en la firma.
  f.ok(await panel.getByLabel('Factor de medición', { exact: true }).inputValue() === '0.998' && /^La mediana de lo que midió el punto oficial/.test(await panel.getByLabel('¿Por qué? De dónde sale el número').inputValue()),
    'la cifra y el porqué van prellenados con lo que propone TRIM')
  f.ok((await f.texto()).includes('borrador · sin cambios'), 'prellenado no es firmado: el borrador sigue sin cambios')
  await panel.getByRole('checkbox', { name: /^Firmar este factor de medición/ }).check()
  await f.esperarTexto('borrador · 1 cambio sin firmar')
  // Se firma en el paso 3, como lo demás, con su porqué en el historial.
  await page.getByRole('button', { name: '3 Ver el impacto y firmar' }).click()
  await f.esperarTexto('Capacidades de El Palmar (se firman por primera vez): factor de medición 0,998')
  await page.getByPlaceholder(/^Ej\.: topología revisada/).fill('Factor de medición de El Palmar, el que mide TRIM')
  await page.getByRole('button', { name: /^Firmar como/ }).click()
  await f.esperarTexto('Firmada la versión 2')
  await page.getByRole('button', { name: '2 Capacidades' }).click()
  await expect(panel.locator('[data-factor-rige]')).toContainText('Rige 0,998 · firmado en la versión 2')
  // El motor lo usa: los pozos de hoy se leen con él; septiembre, cerrado, no cambia (cada día con la configuración de su medianoche).
  // v3 (A-10): la tubería va una vez, en el inicio de producción (el kit); lo que dan los pozos, en su tramo, y de dónde
  // sale, en su ⓘ (como decía «Ver como tabla» de la tubería de antes).
  await f.ir('#/prod/planta-viva/palmar/curso')
  const pozos = page.locator('main [data-tramo-kit="pozo"]')
  await expect(pozos).toContainText('3.314')
  await expect(pozos).toContainText('dan, bbl/d')
  const deLosPozos = await page.locator('main [data-tramo-col="pozo"]').getByRole('img', { name: /^De dónde sale · Pozos:/ }).getAttribute('aria-label') ?? ''
  f.ok(deLosPozos.includes('× el factor de medición firmado (0,998)'), 'la tubería dice que los pozos (3.314 bbl/d, antes 3.321) se leen con el factor firmado')
  // Septiembre, cerrado, no cambia: lo dice la ⓘ del «% del potencial» de Producción.
  await f.ir('#/prod/produccion/palmar/cerrado')
  const ayuda = await page.getByRole('img', { name: /^% del potencial:/ }).getAttribute('aria-label') ?? ''
  f.ok(ayuda.includes('El firmado (0,998) rige desde el 3 de oct.'), `el factor firmado rige desde el 3 de oct. (${ayuda.slice(-120)})`)
  f.cerrar()
})
