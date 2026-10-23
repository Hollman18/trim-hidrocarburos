// Las correcciones de F3 (QA-R, la reverificación del QA): el techo dicho «hasta» en
// todas partes, una sola eficiencia de producción, el texto libre que no va al papel
// (D2), el mes a mes que no atenúa, el retiro que se ve, la cascada que el período
// corta y los avisos que no nombran 41 pozos. Con los datos del demo: el 2-oct a las
// 14:00, K-101 de La Ceiba tiene 2 de 3 unidades y P-201B está parada.
import { expect, type Page } from '@playwright/test'
import { test } from './apoyo.ts'

/** La tarjeta de una parada de la ANH por lo que dice (sus pozos o su raíz). */
const tarjeta = (page: Page, texto: string | RegExp) => page.locator('main article[data-parada-anh]').filter({ hasText: texto }).first()

test('Un techo es «hasta N» en Riesgo, Turno y Mantenimiento, como en «Si falla hoy» (QA-R, vecino 1)', async ({ flujo: f }) => {
  const { page } = f
  // «9.394 bbl/d» sin «hasta» delante: el techo de K-101 dicho como cifra exacta.
  const exacta = /(?<!hasta )9\.394 bbl\/d/
  await f.abrir('/#/jefe/riesgo/ceiba/curso')
  await expect(page.locator('main [data-en-juego]')).toContainText('hasta 9.394')
  let t = await f.texto()
  f.ok(t.includes('hasta 9.394 bbl/d') && !exacta.test(t), `Riesgo: «En riesgo» y su cabecera dicen «hasta 9.394 bbl/d» (${t.match(exacta)?.[0] ?? 'ninguna cifra exacta'})`)
  await f.ir('#/sup/turno/ceiba/curso')
  await expect(page.locator('main [data-si-para]').first()).toHaveText('hasta 9.394 bbl/d')
  t = await f.texto()
  f.ok(!exacta.test(t), 'Turno: «Vigilar» dice el techo con «hasta»')
  await f.ir('#/jefe/mantenimiento/ceiba/curso')
  t = await f.texto()
  f.ok(t.includes('hasta 9.394 bbl/d') && !exacta.test(t), 'Mantenimiento: «si para» con «hasta»')
  // En el papel, el globo de K-101 también («Si para: hasta 9.394 bbl/d (un techo…)»).
  await f.ir('#/jefe/riesgo/ceiba/curso')
  await page.emulateMedia({ media: 'print' })
  const papel = await f.textoPagina()
  await page.emulateMedia({ media: 'screen' })
  f.ok(!exacta.test(papel), 'en el papel tampoco va como cifra exacta')
  f.cerrar()
})

test('Producción: una sola eficiencia, la del choke en la escalera; la del libro es «% del potencial» y su ⓘ dice la diferencia (QA-R, vecino 2; D3)', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/prod/produccion/ceiba/cerrado')
  const t = await f.texto()
  const eficiencias = t.match(/eficiencia[^\n]*/gi) ?? []
  f.ok(eficiencias.length === 1 && /^eficiencia de producción/i.test(eficiencias[0] ?? ''), `una sola «eficiencia» en la pantalla, la de producción (${eficiencias.join(' | ')})`)
  await expect(page.locator('main [data-del-potencial]')).toContainText(/[\d,]+ % del potencial/)
  const ayudaPe = await page.getByRole('img', { name: /^Eficiencia de producción:/ }).getAttribute('aria-label') ?? ''
  f.ok(!/es la misma eficiencia de arriba/.test(ayudaPe) && /No es el «% del potencial»/.test(ayudaPe) && /lo que las pruebas dan de más que el medidor oficial \([\d.]+ bbl en el período\)/.test(ayudaPe),
    `el ⓘ de la eficiencia de producción dice la diferencia con el «% del potencial» (${ayudaPe.slice(0, 120)}…)`)
  const ayudaLibro = await page.getByRole('img', { name: /^% del potencial:/ }).getAttribute('aria-label') ?? ''
  f.ok(/No es la eficiencia de producción/.test(ayudaLibro) && /de eficiencia de producción/.test(ayudaLibro), `el ⓘ del «% del potencial» dice que no es la eficiencia de producción (${ayudaLibro.slice(0, 120)}…)`)
  // La escalera empieza donde empieza la eficiencia (las pruebas) y llega a lo real, sin saltos.
  const bbl = (sel: string) => page.locator(`main [data-escalera] ${sel}`).first().getAttribute('data-bbl').then(Number)
  const inicio = await bbl('[data-escalon-inicio]'), brecha = await bbl('[data-brecha-pruebas]'), libro = await bbl('[data-potencial-libro]'), real = await bbl('[data-escalon-real]')
  const escalones = (await page.locator('main [data-escalera] [data-escalon]').evaluateAll(es => es.map(e => Number(e.getAttribute('data-bbl'))))).reduce((a, b) => a + b, 0)
  f.ok(Math.abs(inicio - brecha - libro) < 1 && Math.abs(libro - escalones - real) < 1,
    `la escalera cuadra: ${Math.round(inicio)} − ${Math.round(brecha)} = ${Math.round(libro)}; − ${Math.round(escalones)} = ${Math.round(real)}`)
  const pe = Number((t.match(/eficiencia de producción[^\d]*([\d,]+) %/i)?.[1] ?? '').replace(',', '.'))
  f.ok(Math.abs(pe - (real / inicio) * 100) < 0.06, `la eficiencia (${pe} %) es lo real sobre el renglón de arriba de la escalera (${((real / inicio) * 100).toFixed(2)} %)`)
  // La tabla del cuadre y el globo del día ya no dicen «Eficiencia» por el % del potencial.
  f.ok(!/\tEficiencia\t/.test(t) && /\tDel potencial\t/.test(t), 'el cuadre diario dice «Del potencial»')
  f.cerrar()
})

test('Mes a mes «Por cómo se identificó»: ningún mes atenuado, el del período con contorno (QA-R, vecino 4; B-08)', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/prod/diferidos/ceiba/cerrado')
  await expect(page.getByRole('button', { name: 'Por cómo se identificó' })).toHaveAttribute('aria-pressed', 'true')
  const svg = page.locator('main svg[aria-label^="Barriles diferidos mes a mes"]').first()
  const atenuados = await svg.locator('g').evaluateAll(gs => gs.filter(g => { const o = g.getAttribute('opacity'); return o !== null && Number(o) < 1 }).length)
  f.ok(atenuados === 0, `ningún mes con opacidad menor que 1 (${atenuados})`)
  await expect(svg.locator('[data-mes-activo]')).toHaveCount(1)
  f.cerrar()
})

test('D2 en el papel: lo que escribió el operador sale en la pantalla de quien revisa, y en el papel va «Lo contestó el operador de campo» (QA-R, vecino 3)', async ({ flujo: f }) => {
  const { page } = f
  const libre = 'ZQX Lo encontró Jairo Peña con Nelson Ortiz: la válvula de la cabeza estaba cerrada'
  await f.abrir('/#/oper/causa/ceiba/curso')
  const form = page.locator('main form').filter({ has: page.getByRole('button', { name: 'Cierre para prueba o intervención del pozo' }) }).first()
  await form.getByRole('button', { name: 'Cierre para prueba o intervención del pozo' }).click()
  await form.locator('textarea').fill(libre)
  await form.getByRole('button', { name: 'Registrar respuesta' }).click()
  await f.esperarTexto(libre)
  for (const [ruta, que] of [['#/sup/causa/ceiba/curso', 'Identificar'], ['#/sup/turno/ceiba/curso', 'Turno']] as const) {
    await f.ir(ruta)
    const pantalla = await f.textoPagina()
    await page.emulateMedia({ media: 'print' })
    const papel = await f.textoPagina()
    await page.emulateMedia({ media: 'screen' })
    f.ok(!papel.includes('ZQX') && !/Jairo Peña con Nelson/.test(papel) && papel.includes('Lo contestó el operador de campo'),
      `${que}: en el papel no va el texto libre ni quien lo escribió, va «Lo contestó el operador de campo» (${(papel.match(/[^\n]*ZQX[^\n]*/) ?? ['sin el texto'])[0].slice(0, 80)})`)
    if (que === 'Identificar') f.ok(pantalla.includes(libre), 'en la pantalla del supervisor (que tiene permiso) sigue el texto')
  }
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
