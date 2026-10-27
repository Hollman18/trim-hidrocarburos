// Las correcciones de F3 (QA-R, la reverificación del QA): el techo dicho «hasta» en
// todas partes, una sola eficiencia de producción, el texto libre que no va al papel
// (D2), el mes a mes que no atenúa, el retiro que se ve, la cascada que el período
// corta y los avisos que no nombran 41 pozos. Con los datos del demo: el 2-oct a las
// 14:00, K-101 de La Ceiba tiene 2 de 3 unidades y P-201B está parada.
import { expect, type Page } from '@playwright/test'
import { test } from './apoyo.ts'

/** La tarjeta de una parada de la ANH por lo que dice (sus pozos o su raíz). */
const tarjeta = (page: Page, texto: string | RegExp) => page.locator('main article[data-parada-anh]').filter({ hasText: texto }).first()

test('Un techo es «hasta N» en Equipos, en la ficha y en el papel, como en «Si falla hoy» (QA-R, vecino 1)', async ({ flujo: f }) => {
  const { page } = f
  // «9.394 bbl/d» sin «hasta» delante: el techo de K-101 dicho como cifra exacta.
  const exacta = /(?<!hasta )9\.394 bbl\/d/
  // B3 · A-12, A-13 y A-01: Riesgo, Mantenimiento y Turno salieron; el techo de K-101 vive en la lista y en su ficha.
  await f.abrir('/#/jefe/riesgo/ceiba/curso')
  f.ok((await f.hash()).startsWith('#/jefe/equipos/ceiba'), `la dirección de Riesgo abre Equipos (${await f.hash()})`)
  await expect(page.locator('main [data-fila-equipo="K-101"] [data-cifra-fila]')).toContainText(/hasta\s*9\.394/)
  let t = await f.texto()
  f.ok(!exacta.test(t.replace(/\s+/g, ' ').replace(/hasta (\d)/g, 'hasta $1')), 'Equipos: el techo de K-101, con «hasta»')
  await f.ir('#/jefe/equipos/ceiba/K-101')
  await expect(page.locator('main [data-si-falla-ficha="K-101"]')).toContainText(/Si falla hoy: hasta 9\.394 bbl\/d/)
  t = await f.texto()
  f.ok(!exacta.test(t), 'la ficha de K-101: «si para» con «hasta»')
  await page.emulateMedia({ media: 'print' })
  const papel = await f.textoPagina()
  await page.emulateMedia({ media: 'screen' })
  f.ok(!exacta.test(papel), 'en el papel tampoco va como cifra exacta')
  f.cerrar()
})

// v3 (C-03 y A-10): la escalera y la tubería repetida salieron de Producción (la escalera es un escalón, encima de lo
// necesario). Queda lo del cierre del mes: «% del potencial» con su ⓘ, que sigue diciendo que no es la eficiencia de producción.
test('Producción: el «% del potencial» no es la eficiencia de producción, y su ⓘ dice la diferencia (QA-R, vecino 2; D3)', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/prod/produccion/ceiba/cerrado')
  const t = await f.texto()
  f.ok(!/eficiencia de producción\s*[\d,]+ %/i.test(t) && await page.locator('main [data-escalera]').count() === 0, 'sin la escalera ni la eficiencia en número en la primera capa')
  await expect(page.locator('main [data-del-potencial]')).toContainText(/[\d,]+ % del potencial|lo medido es el [\d,]+ %/)
  const ayudaLibro = await page.getByRole('img', { name: /^% del potencial:/ }).getAttribute('aria-label') ?? ''
  f.ok(/No es la eficiencia de producción/.test(ayudaLibro) && /de eficiencia de producción/.test(ayudaLibro) && /lo que las pruebas dan de más que el medidor oficial \([\d.]+ bbl en el período\)/.test(ayudaLibro),
    `el ⓘ del «% del potencial» dice que no es la eficiencia de producción, con la diferencia (${ayudaLibro.slice(0, 120)}…)`)
  // La tabla del cuadre y el globo del día ya no dicen «Eficiencia» por el % del potencial.
  f.ok(!/\tEficiencia\t/.test(t) && /\tDel potencial\t/.test(t), 'el cuadre diario dice «Del potencial»')
  f.cerrar()
})

test('Mes a mes con el kit SCADA: ningún mes atenuado, contra la raya del máximo firmado (QA-R, vecino 4; B-08)', async ({ flujo: f }) => {
  const { page } = f
  // A-09: la dirección de Diferidos abre Resultados; el mes a mes es la tendencia del kit.
  await f.abrir('/#/prod/diferidos/ceiba/cerrado')
  const svg = page.locator('main [data-mes-a-mes] [data-kit="tendencia"] svg').first()
  await svg.waitFor()
  const atenuados = await svg.locator('g').evaluateAll(gs => gs.filter(g => { const o = g.getAttribute('opacity'); return o !== null && Number(o) < 1 }).length)
  f.ok(atenuados === 0, `ningún mes con opacidad menor que 1 (${atenuados})`)
  await expect(svg.locator('[data-alarma]')).toHaveCount(1)
  f.cerrar()
})

test('D2 en el papel: lo que escribió el operador sale en la pantalla de quien revisa, y en el papel va «Lo contestó el operador de campo» (QA-R, vecino 3)', async ({ flujo: f }) => {
  const { page } = f
  const libre = 'ZQX Lo encontró Jairo Peña con Nelson Ortiz: la válvula de la cabeza estaba cerrada'
  // B3 · FF-2: se contesta en Hoy. P-201B queda para después; la siguiente es LC-21.
  await f.abrir('/#/oper/hoy/ceiba/curso')
  const pregunta = page.locator('main [data-operador="pregunta"]')
  await pregunta.locator('[data-opcion="Todavía no sé"]').click()
  await expect(pregunta.locator('h2')).toHaveText('¿Por qué paró?')
  await pregunta.getByRole('button', { name: '+ Lo que encontró (si quiere)' }).click()
  await pregunta.locator('textarea').fill(libre)
  await pregunta.locator('[data-opcion="Cierre para prueba o intervención del pozo"]').click()
  await expect(page.locator('[data-aviso-hoy]')).toContainText('Registrado: cierre para prueba o intervención del pozo en LC-21', { timeout: 9_000 })
  await f.ir('#/sup/causa/ceiba/curso')
  const pantalla = await f.textoPagina()
  await page.emulateMedia({ media: 'print' })
  const papel = await f.textoPagina()
  await page.emulateMedia({ media: 'screen' })
  f.ok(!papel.includes('ZQX') && !/Jairo Peña con Nelson/.test(papel) && papel.includes('Lo contestó el operador de campo'),
    `en el papel no va el texto libre ni quien lo escribió, va «Lo contestó el operador de campo» (${(papel.match(/[^\n]*ZQX[^\n]*/) ?? ['sin el texto'])[0].slice(0, 80)})`)
  f.ok(pantalla.includes(libre), 'en la pantalla del supervisor (que tiene permiso) sigue el texto')
  f.cerrar()
})

test('El retiro se ve en la historia de la parada: «antes: …, retirado por … porque …»; en el papel, por su rol y sin el motivo (QA-R, vecino 8)', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/jefe/causa/ceiba/curso')
  let t = tarjeta(page, 'LC-07 y LC-16')
  await t.getByRole('button', { name: 'Corregir otro paso' }).click()
  let editor = t.getByRole('form', { name: /^Corregir un paso/ })
  const detalle = editor.getByRole('combobox', { name: 'Detalle' })
  const ahora = await detalle.inputValue()
  const otro = (await detalle.locator('option').evaluateAll(os => os.map(o => (o as HTMLOptionElement).value))).find(v => v && v !== ahora)!
  await detalle.selectOption(otro)
  await editor.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Guardado en los 2 pozos' })).toBeVisible()
  await f.ir('#/sup/causa/ceiba/curso')
  t = tarjeta(page, 'LC-07 y LC-16')
  await t.getByRole('button', { name: 'Corregir otro paso' }).click()
  editor = t.getByRole('form', { name: /^Corregir un paso/ })
  await editor.getByRole('radio', { name: 'Planeada', exact: true }).click()
  await editor.getByRole('button', { name: 'Guardar' }).click()
  await editor.getByRole('button', { name: 'Otra razón…' }).click()
  await editor.getByLabel('Otra razón').fill('Estaba en el programa de paradas del mes')
  await editor.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Guardado en los 2 pozos' })).toBeVisible()
  // El jefe vuelve: su detalle ya no rige, y dice quién lo retiró y por qué.
  await f.ir('#/jefe/causa/ceiba/curso')
  t = tarjeta(page, 'LC-07 y LC-16')
  const retiro = t.locator('[data-retiro="n2"]').first()
  await expect(retiro).toContainText('antes: ')
  await expect(retiro).toContainText('retirado por Nelson Ortiz')
  await expect(retiro).toContainText('porque «Estaba en el programa de paradas del mes»')
  await page.emulateMedia({ media: 'print' })
  const papel = await retiro.innerText()
  await page.emulateMedia({ media: 'screen' })
  f.ok(/retirado por el supervisor de operaciones/.test(papel) && !/Nelson|programa de paradas/.test(papel), `en el papel, por su rol y sin el motivo («${papel.replace(/\s+/g, ' ')}»)`)
  f.cerrar()
})

test('La marca del paso 2 dice una sola cosa cuando lo determinó la respuesta de quien lo dice (QA-R, vecino 11)', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/conf/causa/guacamayo/2025-10-17_2025-10-17')
  const pregunta = '¿El oleoducto o el cliente estaba recibiendo?'
  const primera = page.locator('main article[data-parada-anh]').filter({ has: page.getByRole('group', { name: pregunta }) }).first()
  const t = page.locator(`main article[data-parada-anh="${await primera.getAttribute('data-parada-anh')}"]`)
  await t.getByRole('group', { name: pregunta }).getByRole('button', { name: /^No, no recibía/ }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Guardado en' })).toContainText('«No, no recibía»')
  const paso2 = t.locator('[data-paso="choke"]')
  await expect(paso2).toContainText('dijo Edwin Maestre')
  await expect(paso2).not.toContainText('TRIM lo dedujo de lo que contestó')
  f.cerrar()
})

test('Una cascada que el período corta se escribe entera: «Guardado en los 18 pozos», no un 409 (QA-R, vecino 12)', async ({ flujo: f }) => {
  const { page } = f
  // K-101 cayó el 23-jun-2026 y cerró 18 pozos; el 24 solo siguen 4: el rango de ese día muestra esos 4.
  await f.abrir('/#/sup/causa/ceiba/2026-06-24_2026-06-24')
  const t = tarjeta(page, 'por K-101')
  await t.getByRole('button', { name: 'Corregir otro paso' }).click()
  const editor = t.getByRole('form', { name: /^Corregir un paso/ })
  await editor.getByRole('radio', { name: 'Planeada', exact: true }).click()
  await editor.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Guardado en los 18 pozos' })).toContainText('¿Planeada? → Planeada')
  f.cerrar()
})

test('Un aviso con muchos pozos dice cuántos, no los 41 nombres (QA-R, vecino 10)', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/jefe/causa/morichal/doce')
  for (const v of await page.locator('main section[data-seccion] > button[aria-expanded="false"]').all()) await v.click().catch(() => {})
  const t = page.locator('main article[data-parada-anh]').filter({ hasText: /por SE-2/ }).filter({ visible: true }).first()
  await t.getByRole('button', { name: 'Falla transformador' }).first().click()
  const aviso = page.getByRole('status').filter({ hasText: 'Guardado en' })
  await expect(aviso).toContainText('Guardado en los 41 pozos')
  await expect(aviso).not.toContainText('MN-01, MN-02')
  f.cerrar()
})
