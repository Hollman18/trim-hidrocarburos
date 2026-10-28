// Las correcciones de experiencia de la tanda F2-C (QA-B, B-01..B-54), de punta a
// punta y con los datos del demo: el 2-oct a las 14:00 la P-201B de La Ceiba
// está parada, cerró LC-07 y LC-16, y sus hermanas P-201A y P-201C no tienen
// instrumento. Cada prueba dice qué hallazgo comprueba; lo que ya tiene su
// prueba en otra parte (el operador, el chat, Turno, la filosofía, el árbol, el
// agua, «Si falla hoy») queda allá.
import { expect, type Page } from '@playwright/test'
import { test } from './apoyo.ts'

/** La tarjeta de una parada de la ANH por lo que dice (sus pozos). */
const tarjeta = (page: Page, texto: string) => page.locator('main article[data-parada-anh]').filter({ hasText: texto }).first()
/** Fechas ISO o con cero delante («2026-10-02», «03 de nov»): en pantalla no van (B-25). */
const FECHA_MAL = /\b20\d\d-\d\d-\d\d\b|\b0\d de (?:ene|feb|mar|abr|may|jun|jul|ago|sept|oct|nov|dic)\b/
/** Palabras internas del proyecto: ni en la pantalla ni en el papel (B-29). */
const INTERNAS = /Edinson|\bLLM\b|patente|LOTE-\d/
/** El texto de la pantalla más lo que oye el lector (los ⓘ dicen su texto en `aria-label`). */
const todoElTexto = (page: Page) => page.evaluate(() => {
  const m = document.querySelector('main')
  return m ? [m.innerText, ...[...m.querySelectorAll('[aria-label],[title]')].map(e => `${e.getAttribute('aria-label') ?? ''} ${e.getAttribute('title') ?? ''}`)].join('\n') : ''
})

test('Identificar · jefe: una parada de varios pozos se confirma de un toque y la tarjeta dice desde cuándo y lo que falta (B-07, B-11, B-21, B-22, B-25, B-29)', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/jefe/causa/ceiba/curso')
  const t = tarjeta(page, 'LC-07 y LC-16')
  // B-22: desde cuándo, con la hora del evento; B-21: cuenta paradas, y las filas aparte.
  await expect(t.locator('header')).toContainText('LC-07 y LC-16 · cerraron 05:43 · por P-201B')
  await expect(t.locator('header')).toContainText('573 bbl diferidos · 2 paradas')
  const sinCausa = page.locator('main [data-seccion="pendiente"]')
  // F1 (D-3): los títulos de Identificar, en frase.
  await expect(sinCausa.locator('h3')).toContainText(/Sin causa · \d+ paradas? \(\d+ filas del reporte\)/)
  // B-11: en el detalle, lo que falta en palabras: la parte de la bomba la dice quien la abra.
  await expect(t.locator('[data-paso="n2"]')).toContainText('falta la parte de P-201B')
  const texto = await f.texto()
  f.ok(!FECHA_MAL.test(texto), `sin fechas ISO ni con cero delante (${texto.match(FECHA_MAL)?.[0] ?? 'ninguna'})`)
  f.ok(!INTERNAS.test(texto), `sin palabras internas del proyecto (${texto.match(INTERNAS)?.[0] ?? 'ninguna'})`)
  // B-07: el jefe no firma el día, pero una parada de dos pozos (una raíz) es una sola decisión: un toque, sin lote.
  await t.getByRole('button', { name: 'Confirmar esta parada (2 pozos · 2 filas)' }).click()
  const aviso = page.getByRole('status').filter({ hasText: 'Listo.' })
  await expect(aviso).toContainText('LC-07 y LC-16 quedan completas (2 filas).')
  await expect(aviso).not.toContainText('lote')
  f.cerrar()
})

test('Corregir: si el cambio retira lo que dijo otra persona, el editor pide el motivo y guarda con él (D1, de F2-A)', async ({ flujo: f }) => {
  const { page } = f
  // El jefe dice el detalle de la cascada de P-201B.
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
  // El supervisor cambia «¿Planeada?»: eso retira la causa y el detalle del jefe. El servidor pide el motivo y el editor lo pregunta.
  await f.ir('#/sup/causa/ceiba/curso')
  t = tarjeta(page, 'LC-07 y LC-16')
  await t.getByRole('button', { name: 'Corregir otro paso' }).click()
  editor = t.getByRole('form', { name: /^Corregir un paso/ })
  await editor.getByRole('radio', { name: 'Planeada', exact: true }).click()
  await editor.getByRole('button', { name: 'Guardar' }).click()
  await expect(editor).toContainText('¿Por qué lo cambia? (cambia lo que dijo otra persona)')
  await editor.getByRole('button', { name: 'Otra razón…' }).click()
  await editor.getByLabel('Otra razón').fill('Estaba en el programa de paradas del mes')
  await editor.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Guardado en los 2 pozos' })).toContainText('¿Planeada? → Planeada')
  f.cerrar()
})

test('Identificar · producción: una pregunta a la vez, y el porqué de la bomba de la línea en palabras (B-23, B-32, B-11)', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/prod/causa/ceiba/cerrado')
  // B-32: con baja carga, primero «¿Fue el yacimiento?»; «¿Qué fue, exactamente?» sale solo después.
  const t = page.locator('main article[data-parada-anh]').filter({ has: page.locator('[data-pregunta="aporte"]') }).first()
  await expect(t.locator('[data-pregunta]')).toHaveCount(1)
  await expect(t.locator('[data-preguntas]')).toContainText('Después, una pregunta más.')
  await expect(t.getByRole('group', { name: '¿Qué fue, exactamente?' })).toHaveCount(0)
  f.cerrar()
})

test('Identificar · operador: lo que pregunta va primero; los indicadores, plegados al final; «Algo está mal» con atajos de un toque (B-52, B-54)', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/oper/causa/ceiba/curso')
  // B3 · A-29: los porcentajes de identificación y el histórico son de confiabilidad y de producción: al operador, ninguno.
  await expect(page.locator('main details[data-indicadores]')).toHaveCount(0)
  // FF-2: se contesta en Hoy; aquí, a un toque.
  await expect(page.locator('main [data-se-contesta-en-hoy]')).toContainText('Se contesta en Hoy')
  // B-52: «Algo está mal» no obliga a escribir: un toque y «Enviar a revisar».
  const lc05 = tarjeta(page, 'LC-05')
  await lc05.getByRole('button', { name: 'Algo está mal' }).click()
  const mal = lc05.getByRole('form', { name: /^Algo está mal/ })
  f.ok((await mal.getByRole('button').allInnerTexts()).map(x => x.trim()).slice(0, 3).join(' | ') === 'No paró por eso | Lo cerré yo a mano | El pozo es otro',
    'tres atajos de un toque antes del campo')
  await mal.getByRole('button', { name: 'Lo cerré yo a mano' }).click()
  await mal.getByRole('button', { name: 'Enviar a revisar' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Listo: LC-05 queda para revisar' })).toBeVisible()
  f.cerrar()
})

// v3 (A-10, C-03): la tubería del campo va una vez, en el inicio de producción (el kit SCADA), y la escalera es un escalón:
// lo que se probaba de ellas se prueba donde quedó (la frase, lo que cabe en cada tramo con su ⓘ y el cuadre de las pruebas).
test('Producción: la tubería dice lo de hoy y lo que cabe en cada tramo; el cuadre de las pruebas y el papel sin palabras internas (B-14, B-15, B-26, B-28, B-36, B-45, B-09)', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/prod/planta-viva/ceiba/curso')
  // B-14: lo de hoy con P-201B parada va en la frase del número; el dibujo, uno.
  await expect(page.locator('main [data-produccion-cifra] [data-explica]')).toContainText(/Con P-201B parada, el agua solo deja pasar [\d.]+ bbl\/d más de crudo\./)
  f.ok(await page.locator('main [data-tuberia-kit]').count() === 1, 'un solo dibujo de la tubería')
  // Lo que cabe y lo que le sobra a cada tramo, debajo de su caja; de dónde sale, en su ⓘ (lo que decía «Ver como tabla»).
  const tramos = await page.locator('main [data-tramo-kit]').evaluateAll(es => es.map(e => `${e.getAttribute('data-tramo-kit')}:${(e as HTMLElement).innerText.replace(/\s+/g, ' ')}`))
  f.ok(tramos.length === 3 && /planta:.*13\.000.*caben · sobran 1\.143/.test(tramos.join(' | ')), `lo que cabe y le sobra a cada tramo (${tramos.join(' | ')})`)
  f.ok(await page.locator('main [data-tramo-col="pozo"]').getByRole('img', { name: /^De dónde sale · Pozos:/ }).count() === 1, 'de dónde sale lo que dan los pozos, en su ⓘ')
  // D3 (de F2-B): el cuadre de las pruebas con el medidor oficial, en la ⓘ del «% del potencial» de Producción.
  await f.ir('#/prod/produccion/ceiba/curso')
  const ayuda = await page.getByRole('img', { name: /^% del potencial:/ }).getAttribute('aria-label') ?? ''
  f.ok(/(las pruebas dan de más que el medidor oficial|el medidor oficial da de más que las pruebas|las pruebas y el medidor oficial dan lo mismo)/.test(ayuda), 'el cuadre de las pruebas con el medidor oficial, en palabras')
  // B-28: el formulario del cuadre con la asignación oficial no sale en el papel con sus campos vacíos.
  await page.emulateMedia({ media: 'print' })
  const formulario = page.getByLabel('Filas de la asignación oficial')
  if (await formulario.count()) await expect(formulario).toBeHidden()
  const papel = await f.textoPagina()
  f.ok(!INTERNAS.test(papel), `el papel no lleva palabras internas del proyecto (${papel.match(INTERNAS)?.[0] ?? 'ninguna'})`)
  await page.emulateMedia({ media: 'screen' })
  f.cerrar()
})

test('Una dirección a un campo que la persona no tiene lo dice, y el esquema de planta no parpadea (B-38, B-41, B-47)', async ({ flujo: f }) => {
  const { page } = f
  // B-38: producción no tiene La Zarza: se abre La Ceiba y se dice.
  await f.abrir('/#/prod/produccion/zarza/curso')
  await expect(page.locator('main [data-aviso-campo]')).toHaveText('Usted no tiene asignado el campo La Zarza: le mostramos La Ceiba.')
  f.ok((await f.hash()).startsWith('#/prod/produccion/ceiba'), `la dirección dice lo que se ve (${await f.hash()})`)
  // B-29: el estado vacío de un campo de gas no nombra a nadie del proyecto (v3: en la tubería del inicio del gerente).
  await f.ir('#/ger/planta-viva/zarza/curso')
  await f.esperarTexto('La Zarza es un campo de gas')
  f.ok(!INTERNAS.test(await todoElTexto(page)), 'La Zarza (campo de gas) sin «(Edinson)»')
  // B-41: nada parpadea en el esquema de planta: la alarma lleva un anillo quieto.
  await f.ir('#/prod/planta/ceiba/curso')
  await f.esperarTexto('Capturando datos')
  const animados = await page.evaluate(() => [...document.querySelectorAll('main *')].filter(e => getComputedStyle(e).animationName !== 'none').length)
  f.ok(animados === 0 && await page.locator('main [data-anillo-alarma]').count() > 0, `ningún elemento animado (${animados}); el anillo de P-201B, quieto`)
  // B-47 y B-45: Calidad cuenta paradas con sus filas aparte y dice el período en palabras.
  await f.ir('#/conf/confiabilidad/morichal/curso')
  await f.esperarTexto('Calidad de la clasificación')
  const calidad = await f.texto()
  f.ok(/MN-41\s+1 parada \(2 filas\) · 0 corregidas/.test(calidad), '«MN-41 · 1 parada (2 filas)», no «2 paradas»')
  f.ok(calidad.includes('en octubre (en curso)') && !calidad.includes('en Octubre, en curso'), 'el período en palabras: «en octubre (en curso)»')
  f.cerrar()
})

test('Regulatorio en el papel: el árbol de la circular se lee renglón por renglón y los ⓘ que se repiten van una vez al final (B-10)', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/reg/regulatorio/morichal/cerrado')
  await f.esperarTexto('Árbol de causas · como la circular')
  await page.emulateMedia({ media: 'print' })
  const arbol = page.locator('[data-arbol-circular]')
  const texto = await arbol.innerText()
  const veces = texto.split('La pérdida es lo producido que no se vendió').length - 1
  f.ok(veces === 1, `lo que dice el ⓘ de la pérdida sale una vez, al final del árbol (${veces})`)
  f.ok(/Modelo choke: Es un método internacional/.test(texto), 'y lo que dice el ⓘ de «modelo choke», también al final')
  // Antes, la nota del ⓘ pisaba la rama y la dejaba de una letra por renglón: cada renglón cabe en poco alto.
  const altos = await arbol.locator('li[data-nodo] > div').evaluateAll(es => es.map(e => e.getBoundingClientRect().height).filter(h => h > 0))
  f.ok(altos.length > 0 && Math.max(...altos) < 120, `ningún renglón del árbol se estira (el más alto, ${Math.round(Math.max(...altos))} px)`)
  await page.emulateMedia({ media: 'screen' })
  f.cerrar()
})

test.describe('390 px', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('390 px: en el teléfono, corregir abre una hoja inferior y los botones de las preguntas miden al menos 44 px (B-24, B-46)', async ({ flujo: f }) => {
    const { page } = f
    await f.abrir('/#/oper/causa/ceiba/curso')
    // B-24: un dedo con guantes: cada respuesta mide al menos 44 px de alto.
    const altos = await page.locator('main [data-preguntas] button').evaluateAll(es => es.filter(e => (e as HTMLElement).offsetParent !== null).map(e => e.getBoundingClientRect().height))
    f.ok(altos.length > 0 && altos.every(h => h >= 44), `las respuestas miden al menos 44 px (${Math.min(...altos)} px la menor)`)
    // B-46: «Corregir dónde se trabó» en el teléfono es una hoja inferior (un diálogo), con un campo de dos renglones.
    await f.ir('#/sup/causa/ceiba/curso')
    const t = tarjeta(page, 'LC-07 y LC-16')
    await t.getByRole('button', { name: 'Corregir dónde se trabó' }).click()
    const hoja = page.getByRole('dialog', { name: /^¿Dónde se trabó\?/ })
    await expect(hoja).toBeVisible()
    // La hoja sube en 200 ms (D1): se mide cuando terminó de subir.
    await expect.poll(() => hoja.evaluate(e => Math.round(e.getBoundingClientRect().bottom) - innerHeight)).toBeLessThanOrEqual(1)
    const caja = await hoja.evaluate(e => { const r = e.getBoundingClientRect(); return { alto: r.height, abajo: Math.round(r.bottom), vh: innerHeight } })
    // D1 (v3): la hoja es la del Modal: pegada abajo y deja al menos 48 px arriba para ver de dónde se abrió.
    f.ok(Math.abs(caja.abajo - caja.vh) <= 1 && caja.alto <= caja.vh - 47, `la hoja sale desde abajo y deja ver arriba (${Math.round(caja.alto)} de ${caja.vh} px, abajo en ${caja.abajo})`)
    await page.keyboard.press('Escape')
    await expect(hoja).toHaveCount(0)
    f.cerrar()
  })
})
