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
  await expect(sinCausa.locator('h3')).toContainText(/SIN CAUSA · \d+ paradas? \(\d+ filas del reporte\)/)
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
  // B-54: los indicadores de gestión no van antes de sus preguntas: plegados, después de la lista.
  const indicadores = page.locator('main details[data-indicadores]')
  await expect(indicadores).toHaveCount(1)
  f.ok(!(await indicadores.evaluate(d => (d as HTMLDetailsElement).open)), 'los indicadores empiezan plegados')
  f.ok(await page.evaluate(() => {
    const lista = document.querySelector('main [data-por-contestar]'), d = document.querySelector('main details[data-indicadores]')
    return !!lista && !!d && !!(lista.compareDocumentPosition(d) & Node.DOCUMENT_POSITION_FOLLOWING)
  }), 'y van después de lo que tiene que contestar')
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

test('Producción: la tubería dice lo de hoy, la escalera se llama por tipo y la lista de campos dice lo que no se produjo (B-14, B-15, B-26, B-28, B-36, B-45, B-09)', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/prod/produccion/ceiba/curso')
  await f.esperarTexto('LA TUBERÍA DEL CAMPO')
  // B-14: con P-201B parada, la frase de hoy y una raya discontinua dentro de la planta, en los dos dibujos.
  await expect(page.locator('main [data-frase-hoy]').first()).toContainText(/^Hoy, con P-201B parada, el agua de la planta deja pasar/)
  f.ok(await page.locator('main [data-hoy-linea]').count() === 2, 'la raya de lo que pasa hoy va dentro de la planta en el dibujo acostado y en el de pie')
  // D3 (de F2-B): el cuadre de hoy con las pruebas: lo que dan los pozos − lo que pasa − lo que se pierde = lo que las pruebas dan de más.
  const cuadre = await page.locator('main [data-cuadre-hoy]').innerText()
  const [pozos, pasa, pierde, resto] = (cuadre.match(/[\d.]+(?=\D)/g) ?? []).map(x => Number(x.replace(/\./g, '')))
  f.ok(/^Los pozos dan [\d.]+ según sus pruebas: pasan [\d.]+, se pierden [\d.]+ y los otros [\d.]+ son lo que las pruebas dan de más que el medidor oficial\./.test(cuadre)
    && Math.abs(pozos! - pasa! - pierde! - resto!) <= 2, `el cuadre de hoy cierra: «${cuadre}»`)
  // B-36: la tabla con los mismos números va justo debajo del dibujo; B-28: en el papel, el dibujo con su frase no se parte.
  const bloque = page.locator('main [data-dibujo-y-frase]')
  await expect(bloque).toHaveCount(1)
  await page.getByRole('button', { name: 'Ver como tabla' }).click()
  const foco = await page.evaluate(() => {
    const a = document.activeElement, dibujo = document.querySelector('main [data-dibujo-y-frase]')
    return { caption: a?.tagName === 'CAPTION', texto: a?.textContent ?? '', debajo: !!dibujo && !!a && !!(dibujo.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING) }
  })
  f.ok(foco.caption && foco.debajo && foco.texto.startsWith('La tubería del campo, en números'), `«Ver como tabla» lleva el foco al título de la tabla, que va debajo del dibujo (${foco.texto.slice(0, 40)})`)
  await page.getByRole('button', { name: 'Ocultar la tabla' }).click()
  await page.emulateMedia({ media: 'print' })
  f.ok(await bloque.evaluate(e => getComputedStyle(e).breakInside === 'avoid'), 'en el papel el dibujo y su frase van juntos (break-inside: avoid)')
  // B-28: el formulario del cuadre con la asignación oficial no sale en el papel con sus campos vacíos.
  const formulario = page.getByLabel('Filas de la asignación oficial')
  if (await formulario.count()) await expect(formulario).toBeHidden()
  const papel = await f.textoPagina()
  f.ok(!INTERNAS.test(papel), `el papel no lleva palabras internas del proyecto (${papel.match(INTERNAS)?.[0] ?? 'ninguna'})`)
  await page.emulateMedia({ media: 'screen' })
  // B-29: tampoco en los ⓘ (lo que oye el lector y lo que sale en el papel).
  const conInfo = await todoElTexto(page)
  f.ok(!INTERNAS.test(conInfo), `los ⓘ de Producción no dicen palabras internas (${conInfo.match(INTERNAS)?.[0] ?? 'ninguna'})`)
  // B-26: la escalera se llama por tipo; B-09: una sola leyenda para la franja y las barras.
  const t = await f.texto()
  f.ok(t.includes('LO QUE NO SE PRODUJO, POR TIPO') && !t.includes('POR ESCALÓN'), 'la escalera: «LO QUE NO SE PRODUJO, POR TIPO»')
  await expect(page.locator('main [data-leyenda-serie]')).toHaveCount(1)
  // B-15: la lectura dice «relleno» y «vacío», no «oscuro» (en el tema oscuro sería al revés).
  await page.getByRole('button', { name: /cómo se lee/i }).first().click()
  await f.esperarTexto('Lo relleno es lo que pasa ahora; lo vacío, lo que cabría.')
  f.ok(!(await f.texto()).includes('lo oscuro es lo que pasa ahora'), 'sin «lo oscuro es lo que pasa ahora»')
  // B-45: con todos los campos, cada fila dice los barriles que no se produjeron.
  await f.ir('#/prod/produccion/ceiba~portafolio/curso')
  await f.esperarTexto('LA TUBERÍA DE CADA CAMPO')
  f.ok(await page.locator('main [data-no-se-produjeron]').count() >= 2 && !(await f.texto()).includes('se trabaron'), '«bbl no se produjeron», no «se trabaron»')
  f.cerrar()
})

test('Bombas y agua: las dos sin instrumento salen en la lista, con su ficha, y la bomba parada dice qué pasa si para otra (B-01, B-17, B-37, B-44)', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/sup/bombas/ceiba/curso')
  // B-01: P-201A y P-201C, sin instrumento, también se ven, con su forma (rectángulo discontinuo) y la palabra.
  const sin = page.locator('main [data-sin-instrumento]')
  await expect(sin).toContainText('SIN INSTRUMENTO')
  f.ok((await sin.locator('[data-bomba-sin-instrumento]').evaluateAll(es => es.map(e => e.getAttribute('data-bomba-sin-instrumento')))).join() === 'P-201A,P-201C',
    'las dos hermanas de P-201B sin instrumento')
  await expect(sin.locator('[data-bomba-sin-instrumento="P-201A"]')).toContainText(/Si falla hoy: [\d.]+ bbl\/d después de \d+ min de colchón/)
  await sin.locator('[data-bomba-sin-instrumento="P-201A"]').getByRole('button', { name: 'Abrir' }).click()
  const minima = page.locator('[data-ficha-minima]')
  await expect(minima).toContainText('Sin instrumento')
  await expect(minima).toContainText('LA TUBERÍA DEL AGUA, HOY')
  await page.keyboard.press('Escape')
  // B-01 y B-17: la ficha de P-201B dice lo que pasa hoy con el agua y qué cerrar si para otra.
  await page.locator('main article', { hasText: 'P-201B' }).locator('button[aria-label^="Abrir el detalle de"]').first().click()
  const hoy = page.locator('main [data-agua-hoy]')
  await expect(hoy).toContainText('LA TUBERÍA DEL AGUA, HOY')
  await expect(hoy).toContainText('El nivel no sube: P-201A y P-201C toman lo que entra.')
  await expect(hoy.locator('[data-orden-si-para-otra]')).toContainText(/Si para otra bomba ahora, cierre primero los más acuatosos/)
  // B-44: en el agua, «sin instrumento» tiene su forma (no la de «sin comunicación») y su palabra.
  await f.ir('#/prod/agua/ceiba/curso')
  await f.esperarTexto('LA TUBERÍA DEL AGUA')
  const marcas = await page.locator('[data-tuberia-agua] [data-bomba]').allInnerTexts()
  f.ok(marcas.filter(x => x.includes('┄ sin instrumento')).length === 2, `«┄ sin instrumento» en P-201A y P-201C (${marcas.length} bombas)`)
  // B-37: la ficha del equipo, para ingeniería, dice cuánto vale hoy y dónde se trabaría; P-201A, sin instrumento, también tiene la suya.
  await f.ir('#/jefe/riesgo/ceiba/curso/K-101')
  await expect(page.locator('[data-si-falla-ficha="K-101"]')).toContainText(/Si falla hoy: hasta [\d.]+ bbl\/d .* · se trabaría en la planta \(18 pozos\)/)
  await f.ir('#/jefe/riesgo/ceiba/curso/P-201A')
  await expect(page.locator('[data-ficha-minima] [data-si-falla-ficha="P-201A"]')).toContainText(/puesto 1 de lo que más cuesta/)
  f.cerrar()
})

test('Riesgo y mantenimiento: «ya pasó el límite», la marca en su columna, el campo de gas y «No programado (libro)» (B-18, B-40, B-42, B-43, D4)', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/jefe/riesgo/ceiba/curso')
  await f.esperarTexto('SI FALLA HOY')
  const t = await f.texto()
  // B-42: K-101 está en marcha: «ya pasó el límite», no «ya fuera».
  f.ok(t.includes('ya pasó el límite') && !t.includes('ya fuera'), '«ya pasó el límite» en lugar de «ya fuera»')
  // B-43: el puesto va solo en su columna; la marca de alarma, en «¿Lo vigila TRIM?».
  const puestos = await page.locator('main [data-si-falla="ceiba"] [data-fila-critica]').evaluateAll(es => es.map(e => {
    const celdas = [...e.children] as HTMLElement[]
    return { puesto: celdas[0]?.querySelectorAll('svg[role=img]').length ?? 0, texto: e.textContent ?? '' }
  }))
  f.ok(puestos.length > 0 && puestos.every(p => p.puesto === 0), 'ninguna marca de alarma pegada al puesto')
  // B-40: la cifra de «Durante» es un total: sin marca; la marca va con P-201B, que lo causa.
  const durante = page.locator('main span').filter({ has: page.getByText('2 · Durante', { exact: true }) }).first()
  f.ok(await durante.locator('b svg[role=img]').count() === 0 && /P-201B/.test(await durante.innerText()) && await durante.locator('small svg[role=img]').count() === 1,
    'el total de «Durante» sin marca; la marca, al lado de P-201B')
  // B-18: un campo de gas lo dice en una frase, sin una lista de ceros.
  await f.ir('#/jefe/riesgo/zarza/curso')
  await expect(page.locator('main [data-campo-de-gas]')).toHaveText('La Zarza es un campo de gas: lo que cuesta una falla en gas todavía no se calcula.')
  // D4 (B-12 de F2-B): el libro llama «No programado (libro)» a lo que no estaba en el programa.
  await f.ir('#/jefe/mantenimiento/ceiba/curso')
  await page.getByText('del diferido, programado', { exact: true }).hover()
  await expect(page.getByRole('tooltip')).toContainText('No programado (libro)')
  // B-40: los totales no llevan marca de prioridad: la marca va en el equipo que los causa.
  await f.ir('#/sup/turno/ceiba/curso')
  await f.esperarTexto('perdiéndose ahora')
  const marcas = await page.locator('main').evaluate(m => {
    const total = [...m.querySelectorAll('span')].find(e => /perdiéndose ahora/.test(e.textContent ?? '') && (e.textContent ?? '').length < 120)
    return total ? [...total.querySelectorAll('svg[role=img]')].map(s => (s.parentElement?.textContent ?? '').trim()) : null
  })
  f.ok(!!marcas && marcas.length > 0 && marcas.every(x => /P-201B/.test(x)), `la marca va con el equipo que lo causa, no con el total (${JSON.stringify(marcas)})`)
  // B-20: P-201B lleva la misma marca (la de hoy) en toda la pantalla; la urgencia de identificar va en palabras.
  const deP201B = await page.locator('main').evaluate(m => [...new Set([...m.querySelectorAll('svg[role=img][aria-label^="Prioridad"]')]
    .filter(s => { const t = (s.parentElement?.textContent ?? '').trim(); return t.includes('P-201B') && t.length < 90 })
    .map(s => s.getAttribute('aria-label')))])
  f.ok(deP201B.length === 1 && deP201B[0] === 'Prioridad 1 · alarma', `P-201B con una sola marca en Turno (${deP201B.join(', ')})`)
  f.cerrar()
})

test('Gerente: la misma base escrita igual, el papel con los planes desplegados y «Nada se trabó» sin leyenda (B-39, B-50, B-51, B-08)', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/ger/resumen/ceiba/curso')
  await f.esperarTexto('DÓNDE SE TRABÓ')
  // B-50: la base de comparación, escrita igual en los dos renglones.
  const t = await f.texto()
  const bases = t.match(/\(jun a ago → con TRIM, desde el 1 de sept\)/g) ?? []
  f.ok(bases.length >= 2, `«(jun a ago → con TRIM, desde el 1 de sept)» en la tendencia y en lo no planeado (${bases.length})`)
  // B-29: el ⓘ del retorno ya no dice «LLM»: «Esta cifra la calcula TRIM con reglas fijas».
  const conInfo = await todoElTexto(page)
  f.ok(!INTERNAS.test(conInfo), `el Resumen y sus ⓘ no dicen palabras internas (${conInfo.match(INTERNAS)?.[0] ?? 'ninguna'})`)
  // B-51: en el papel, los planes de acción salen desplegados y el botón no.
  await page.emulateMedia({ media: 'print' })
  const papel = await f.textoPagina()
  f.ok(!/Ver planes de acción/.test(papel), 'en el papel no queda el botón «Ver planes de acción»')
  await page.emulateMedia({ media: 'screen' })
  // B-08: el mes a mes por tramo no atenúa los meses fuera del período: el del período va con contorno.
  await f.ir('#/prod/diferidos/ceiba/cerrado')
  await page.getByRole('button', { name: 'Por dónde se trabó' }).first().click()
  await expect(page.locator('main [data-mes-activo]')).toHaveCount(1)
  // B-35: los tramos vecinos no se distinguen solo por el gris: la planta va a rayas, afuera a puntos y lo sin identificar, rayado.
  const rellenos = await page.locator('main [data-barra-tramos] [data-tramo]').evaluateAll(es => Object.fromEntries(es.map(e => [e.getAttribute('data-tramo'), getComputedStyle(e).backgroundImage])))
  // B-12: en «Por tramo», LC-04 vale más que en «Por equipo» porque lleva barriles de otra causa: el ⓘ lo dice.
  await expect(page.getByRole('img', { name: /^LC-04 · [\d.]+ bbl: [\d.]+ de electrosumergible y [\d.]+ de energía eléctrica\./ })).toHaveCount(1)
  const conDibujo = ['planta', 'exportacion', 'sin-asignar'].filter(k => k in rellenos)
  f.ok(conDibujo.includes('planta') && conDibujo.every(k => /gradient/.test(rellenos[k] ?? '')), `la planta (y afuera y lo sin identificar, si están) llevan dibujo, no solo gris (${conDibujo.join(', ')})`)
  // B-39: un campo sin nada trabado lo dice con su período y sin una leyenda que no corresponde a ninguna barra.
  await f.ir('#/ger/resumen/zarza/curso')
  await f.esperarTexto('Nada se trabó en octubre (en curso).')
  f.ok(await page.locator('main [data-leyenda-tramos]').count() === 0, 'sin la leyenda de los tramos cuando no hay barra que leer')
  f.cerrar()
})

test('Una dirección a un campo que la persona no tiene lo dice, y el esquema de planta no parpadea (B-38, B-41, B-47)', async ({ flujo: f }) => {
  const { page } = f
  // B-38: producción no tiene La Zarza: se abre La Ceiba y se dice.
  await f.abrir('/#/prod/produccion/zarza/curso')
  await expect(page.locator('main [data-aviso-campo]')).toHaveText('Usted no tiene asignado el campo La Zarza: le mostramos La Ceiba.')
  f.ok((await f.hash()).startsWith('#/prod/produccion/ceiba'), `la dirección dice lo que se ve (${await f.hash()})`)
  // B-29: el estado vacío de un campo de gas no nombra a nadie del proyecto.
  await f.ir('#/adm/planta/zarza/curso')
  await f.esperarTexto('La Zarza es un campo de gas')
  f.ok(!INTERNAS.test(await todoElTexto(page)), 'La Zarza (campo de gas) sin «(Edinson)»')
  // B-41: nada parpadea en el esquema de planta: la alarma lleva un anillo quieto.
  await f.ir('#/prod/planta/ceiba/curso')
  await f.esperarTexto('LA TUBERÍA DEL CAMPO')
  const animados = await page.evaluate(() => [...document.querySelectorAll('main *')].filter(e => getComputedStyle(e).animationName !== 'none').length)
  f.ok(animados === 0 && await page.locator('main [data-anillo-alarma]').count() > 0, `ningún elemento animado (${animados}); el anillo de P-201B, quieto`)
  // B-47 y B-45: Calidad cuenta paradas con sus filas aparte y dice el período en palabras.
  await f.ir('#/conf/confiabilidad/morichal/curso')
  await f.esperarTexto('CALIDAD DE LA CLASIFICACIÓN')
  const calidad = await f.texto()
  f.ok(/MN-41\s+1 parada \(2 filas\) · 0 corregidas/.test(calidad), '«MN-41 · 1 parada (2 filas)», no «2 paradas»')
  f.ok(calidad.includes('en octubre (en curso)') && !calidad.includes('en Octubre, en curso'), 'el período en palabras: «en octubre (en curso)»')
  f.cerrar()
})

test('Regulatorio en el papel: el árbol de la circular se lee renglón por renglón y los ⓘ que se repiten van una vez al final (B-10)', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/reg/regulatorio/morichal/cerrado')
  await f.esperarTexto('ÁRBOL DE CAUSAS · COMO LA CIRCULAR')
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
    const caja = await hoja.evaluate(e => { const r = e.getBoundingClientRect(); return { alto: r.height, abajo: Math.round(r.bottom), vh: innerHeight } })
    f.ok(caja.abajo === caja.vh && caja.alto <= caja.vh * 0.9 + 1, `la hoja sale desde abajo, hasta el 90 % de la pantalla (${Math.round(caja.alto)} de ${caja.vh} px)`)
    await page.keyboard.press('Escape')
    await expect(hoja).toHaveCount(0)
    f.cerrar()
  })
})
