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

test('Producción: la eficiencia que no se puede creer dice por qué, sin número; la que sí, con su número (5E·H30)', async ({ flujo: f }) => {
  const { page } = f
  // El Palmar, septiembre: las pruebas dan menos de lo que midió el punto oficial y el factor no está firmado.
  await f.abrir('/#/prod/produccion/palmar/cerrado')
  const escalera = page.locator('main [data-escalera]')
  await expect(escalera.locator('[data-pe-no-creible]')).toContainText(
    'Las pruebas dan menos de lo que midió el punto oficial: la eficiencia no se puede creer hasta firmar el factor de medición. TRIM propone 0,998, medido en 80 días sin paradas.')
  let t = await escalera.innerText()
  f.ok(!/eficiencia de producción\s*[\d,]+ %/.test(t) && porcentajes(t).every(x => x <= 100),
    `la escalera de El Palmar no da la eficiencia en número ni ningún número sobre 100 % (${porcentajes(t).join(', ') || 'ninguno'})`)
  f.ok(/lo no planeado se llevó\s*[\d.]+ bbl/.test(t) && t.includes('el porcentaje sale con la eficiencia'), 'lo no planeado va en barriles: su porcentaje espera la eficiencia')
  const ayuda = await page.getByRole('img', { name: /^% del potencial:/ }).getAttribute('aria-label') ?? ''
  f.ok(/la eficiencia de producción del período no se puede creer: Las pruebas dan menos/.test(ayuda) && !/% de eficiencia de producción/.test(ayuda),
    'el ⓘ del «% del potencial» tampoco da la eficiencia en número')
  // La Ceiba, septiembre: las pruebas dan más que el punto oficial; la eficiencia se cree y va con su número.
  await f.ir('#/prod/produccion/ceiba/cerrado')
  await expect(escalera.locator('[data-pe-no-creible]')).toHaveCount(0)
  t = await escalera.innerText()
  f.ok(/eficiencia de producción\s*94,7 %/.test(t), 'La Ceiba: «eficiencia de producción 94,7 %»')
  // Los dos campos de producción juntos: el conjunto no se cree mientras no se crea la de El Palmar.
  await f.ir('#/prod/produccion/ceiba~portafolio/cerrado')
  await expect(escalera.locator('[data-pe-no-creible]')).toContainText('La eficiencia del conjunto no se puede creer: en El Palmar las pruebas dan menos de lo que midió el punto oficial y falta firmar su factor de medición.')
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
  // K1 · P-16: Producción monta la tubería de La planta viva (lente técnica); lo que cabe en los pozos va debajo del
  // dibujo y de dónde sale, en «Ver como tabla» (como decía la ⓘ de la tubería de antes).
  await f.ir('#/prod/produccion/palmar/cerrado')
  const tecnica = page.locator('main [data-tuberia-tecnica]')
  await expect(tecnica.locator('[data-capacidad="pozo"]')).toContainText('dan 3.314 bbl/d')
  await tecnica.getByRole('button', { name: 'Ver como tabla' }).click()
  const deLosPozos = await tecnica.locator('[data-fuente-tramo="pozo"]').innerText()
  f.ok(deLosPozos.includes('× el factor de medición firmado (0,998)'), 'la tubería dice que los pozos (3.314 bbl/d, antes 3.321) se leen con el factor firmado')
  await expect(page.locator('main [data-escalera] [data-pe-no-creible]')).toContainText('El firmado (0,998) rige desde el 3 de oct.')
  f.cerrar()
})
