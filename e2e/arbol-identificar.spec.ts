// De punta a punta: el árbol de 6 pasos de la Circular 024 en Identificar
// (quién → ¿dónde se trabó? → qué pasó → ¿planeada? → causa → detalle), la
// confirmación por paso según el rol, el cierre de hoy en lote en Turno y el
// teléfono. Los datos son los del demo: el 2-oct a las 14:00 la P-201B de La
// Ceiba está parada y cerró LC-07 y LC-16 (una sola raíz); LC-05 cayó por baja
// tensión el 1-oct y falta «¿De dónde vino el corte?».
import { expect, type Page } from '@playwright/test'
import { test } from './apoyo.ts'
import { detectar } from './auditoria/detector.ts'

/** La tarjeta de una parada de la ANH por lo que dice (sus pozos). */
const tarjeta = (page: Page, texto: string) => page.locator('main article[data-parada-anh]').filter({ hasText: texto }).first()
/** El panel del árbol en Identificar. */
const arbol = (page: Page) => page.locator('main section:has([data-seccion])')

test('el supervisor confirma una parada deducida en un toque: la cascada de P-201B', async ({ flujo: f }) => {
  await f.abrir('/#/sup/causa/ceiba/curso')
  const t = tarjeta(f.page, 'LC-07 y LC-16')
  await expect(t).toHaveAttribute('data-estado', 'propuesta')
  const antes = await t.innerText()
  f.ok(/Una sola raíz, P-201B/.test(antes) && antes.includes('¿Dónde se trabó?') && antes.includes('En la planta o estación'),
    'una sola tarjeta para los dos pozos, con la raíz y el paso 2 en palabras de campo')
  f.ok(/TRIM lo dedujo: P-201B mueve el agua de 18 pozos/.test(antes), 'el paso 2 dice su porqué en una frase, con el equipo y los pozos')
  f.ok(!/choke/i.test(antes) && !antes.includes('NP_PROC'), 'sin la palabra «choke» ni códigos en la tarjeta del supervisor')
  // Un solo toque.
  await t.getByRole('button', { name: 'Confirmar los 2', exact: true }).click()
  await expect(f.page.getByRole('status').filter({ hasText: 'Listo.' })).toContainText('LC-07 y LC-16 quedan completas')
  // Pasó a COMPLETAS (plegado): se abre y cada paso dice quién lo confirmó.
  const completas = arbol(f.page).locator('[data-seccion="confirmada"]')
  await completas.getByRole('button', { name: /^ver las \d+$/ }).click()
  const hecha = completas.locator('article[data-parada-anh]').filter({ hasText: 'LC-07 y LC-16' })
  await expect(hecha).toHaveAttribute('data-estado', 'confirmada')
  const marcas = (await hecha.locator('[data-paso]').allInnerTexts()).filter(x => /confirmó Nelson Ortiz · 14:00 · en lote/.test(x))
  f.ok(marcas.length === 6, `los 6 pasos quedan «confirmó Nelson Ortiz · 14:00 · en lote» (${marcas.length})`)
  f.cerrar()
})

test('el operador contesta hechos, una pregunta a la vez, y nunca escoge el tramo, la causa ni el detalle: lo que TRIM deduce de su respuesta lo avala su supervisor', async ({ flujo: f }) => {
  await f.abrir('/#/oper/causa/ceiba/curso')
  // Una sola lista (B-02): lo que pregunta el libro y lo del árbol, juntos; sin las secciones de quien revisa.
  const panel = f.page.locator('main section').filter({ has: f.page.getByRole('heading', { name: 'Por contestar', exact: true }) })
  await expect(panel).toContainText('Conteste aquí, una pregunta a la vez. Lo técnico lo revisa su supervisor.')
  await expect(f.page.locator('main [data-seccion]')).toHaveCount(0)
  const tarjetas = f.page.locator('main article[data-parada-anh]')
  const botones = (await tarjetas.locator('button').allInnerTexts()).map(b => b.trim())
  const prohibidos = ['En el pozo', 'En la planta o estación', 'Afuera', 'En el yacimiento', 'Corregir', 'Completar', 'Confirmar', 'Falla transformador', 'No planeada -', 'Planeada -']
  const vistos = botones.filter(b => prohibidos.some(x => b.startsWith(x)))
  f.ok(vistos.length === 0, `ningún botón para escoger el tramo, la causa o el detalle, ni para confirmar sin haber contestado (${vistos.join(' | ')})`)
  f.ok(await tarjetas.locator('select, [role="radio"], [role="radiogroup"]').count() === 0, 'ninguna lista ni opción del tramo, la causa o el detalle')
  const lc05 = tarjeta(f.page, 'LC-05')
  // «¿De dónde vino el corte?» se contesta en el campo: es un hecho, en palabras de campo (U1 §2.4).
  const corte = lc05.getByRole('group', { name: '¿De dónde vino el corte?' })
  f.ok((await corte.getByRole('button').allInnerTexts()).map(x => x.trim()).join(' | ')
    === 'Del proveedor: la red de la empresa de energía | Del campo: pórtico, red de media o subestación | De este pozo: su transformador, su variador o su cable | No sé',
  'al operador se le pregunta de dónde vino el corte, con sus respuestas en palabras de campo')
  f.ok(!(await lc05.innerText()).includes('¿Qué fue, exactamente?'), 'el detalle de la tabla de la ANH no se le pregunta')
  // Antes de contestar no se le pide avalar nada (B-03).
  await expect(lc05.getByRole('button', { name: 'Sí, así fue' })).toHaveCount(0)
  // Contesta el corte: lo que contestó queda arriba de la tarjeta (B-04) y lo que TRIM deduce de eso lo dice así.
  await lc05.getByRole('button', { name: 'De este pozo: su transformador, su variador o su cable' }).click()
  await expect(f.page.getByRole('status').filter({ hasText: 'Guardado en LC-05' })).toContainText('«De este pozo: su transformador, su variador o su cable»')
  await expect(lc05.locator('[data-contestado]')).toContainText('Usted contestó')
  await expect(lc05.locator('[data-contestado]')).toContainText('De este pozo: su transformador, su variador o su cable')
  await lc05.getByRole('button', { name: /^Lo técnico/ }).click()
  await expect(lc05.locator('[data-paso="choke"]')).toContainText('TRIM lo dedujo de lo que contestó Jairo Peña')
  // La causa que deja su respuesta es la misma que TRIM proponía: sigue siendo de TRIM, por confirmar.
  await expect(lc05.locator('[data-paso="n1"]')).toContainText('TRIM lo dedujo')
  // Ahora sí: «¿Está bien?» con lo de su terreno, en palabras, y un toque (B-03).
  const estaBien = lc05.getByRole('group', { name: '¿Está bien lo que queda de lo suyo?' })
  await estaBien.getByRole('button', { name: 'Sí, así fue' }).click()
  await expect(f.page.getByRole('status').filter({ hasText: 'Su respuesta en LC-05 queda guardada' })).toBeVisible()
  // El supervisor ve lo mismo: lo del operador confirmado; el tramo, deducido de su respuesta, por avalar; el detalle, en falta.
  await f.ir('#/sup/causa/ceiba/curso')
  const sup = tarjeta(f.page, 'LC-05')
  await expect(sup.locator('[data-paso="planeacion"]')).toContainText('confirmó Jairo Peña')
  await expect(sup.locator('[data-paso="impacto"]')).toContainText('confirmó Jairo Peña')
  await expect(sup.locator('[data-paso="choke"]')).toContainText('TRIM lo dedujo de lo que contestó Jairo Peña')
  await expect(sup).toHaveAttribute('data-estado', 'por-precisar')
  f.cerrar()
})

test('la combinación planeada con una causa no planeada no se puede armar ni enviar', async ({ flujo: f }) => {
  await f.abrir('/#/sup/causa/ceiba/curso')
  const t = tarjeta(f.page, 'LC-07 y LC-16')
  await t.getByRole('button', { name: 'Corregir otro paso' }).click()
  const editor = t.getByRole('form', { name: /^Corregir un paso/ })
  const causa = editor.getByRole('combobox', { name: 'Causa' })
  const detalle = editor.getByRole('combobox', { name: 'Detalle' })
  await expect(causa).toHaveValue('NP_PROC')
  await editor.getByRole('radio', { name: 'Planeada', exact: true }).click()
  await expect(editor).toContainText('Cambió a «Planeada»: la causa que tenía era de las no planeadas. Escoja la causa otra vez.')
  await expect(causa).toHaveValue('')
  await expect(detalle).toHaveValue('')
  const opciones = (await causa.locator('option').allInnerTexts()).filter(o => !o.startsWith('Escoja'))
  f.ok(opciones.length === 8 && opciones.every(o => o.startsWith('Planeada - ')), `con «Planeada» solo se ofrecen las 8 causas planeadas (${opciones.length})`)
  // De vuelta a «No planeada»: solo las 12 no planeadas.
  await editor.getByRole('radio', { name: 'No planeada', exact: true }).click()
  const otras = (await causa.locator('option').allInnerTexts()).filter(o => !o.startsWith('Escoja'))
  f.ok(otras.length === 12 && otras.every(o => o.startsWith('No planeada - ')), `con «No planeada», las 12 no planeadas (${otras.length})`)
  // Con «Planeada» y la causa vacía se guarda la planeación: la causa vuelve a faltar, nunca queda cruzada.
  await editor.getByRole('radio', { name: 'Planeada', exact: true }).click()
  await editor.getByRole('button', { name: 'Guardar' }).click()
  await expect(f.page.getByRole('status').filter({ hasText: 'Guardado en los 2 pozos' })).toContainText('¿Planeada? → Planeada')
  const despues = tarjeta(f.page, 'LC-07 y LC-16')
  await expect(despues.locator('[data-paso="planeacion"]')).toContainText('Planeada')
  await expect(despues.locator('[data-paso="n1"]')).toContainText('falta')
  await expect(despues.locator('[data-paso="n2"]')).toContainText('falta')
  f.cerrar()
})

test('tanques llenos: la pregunta va directa, «¿El oleoducto o el cliente estaba recibiendo?», con la nota del evento al lado', async ({ flujo: f }) => {
  // Guacamayo, 17-oct-2025: LACT-01 limitó el despacho; la nota dice «nominación del oleoducto».
  await f.abrir('/#/conf/causa/guacamayo/2025-10-17_2025-10-17')
  const pregunta = '¿El oleoducto o el cliente estaba recibiendo?'
  const primeraTarjeta = f.page.locator('main article[data-parada-anh]').filter({ has: f.page.getByRole('group', { name: pregunta }) }).first()
  // La tarjeta por su fila: al contestar, la pregunta se cierra y la siguiente llega con la vista.
  const t = f.page.locator(`main article[data-parada-anh="${await primeraTarjeta.getAttribute('data-parada-anh')}"]`)
  await expect(t.locator('[data-paso="choke"]')).toContainText('TRIM sugiere: En la planta o estación')
  await expect(t.locator('[data-paso="choke"]')).toContainText(`falta: «${pregunta}»`)
  // B-31: la señal ya dice que el tanque de crudo se llenó: lo que falta es lo que se pregunta, con la nota al lado.
  const g = t.getByRole('group', { name: pregunta })
  f.ok((await g.getByRole('button').allInnerTexts()).map(x => x.split('\n')[0]!.trim()).join(' | ') === 'Sí, recibía | No, no recibía | No sé',
    'la pregunta es la que la tarjeta dice que falta, con sus tres respuestas')
  await expect(g.locator('[data-nota-evento]')).toHaveText('Nota del evento: «Tanque de crudo alto: despacho limitado por la nominación del oleoducto»')
  await expect(t.getByRole('group', { name: '¿Qué lo paró?' })).toHaveCount(0)
  await g.getByRole('button', { name: /^No, no recibía/ }).click()
  await expect(f.page.getByRole('status').filter({ hasText: 'Guardado en' })).toContainText('«No, no recibía»')
  await expect(t.locator('[data-paso="choke"]')).toContainText('Afuera: oleoducto, transportador o cliente')
  await expect(t.locator('[data-paso="choke"]')).toContainText('dijo Edwin Maestre')
  // Con la causa en el transporte, el detalle ya no sugiere «tanques llenos», que es de la planta.
  await expect(t.locator('[data-paso="n2"]')).not.toContainText('Tanques llenos')
  await expect(t.getByRole('group', { name: '¿Qué fue, exactamente?' })).toContainText('Restricción nominación/entrega')
  f.cerrar()
})

// B3 · A-01: la pantalla Turno se borró (repetía Hoy). Lo que se probaba aquí vive en Hoy: lo más frágil es el
// orden de cierre (sale cuando para una bomba de agua) y la cascada de P-201B se confirma en un toque, en un lote.
test('Turno → Hoy: lo más frágil como orden de cierre y la cascada de P-201B confirmada en un toque', async ({ flujo: f }) => {
  await f.abrir('/#/sup/turno/ceiba/curso')
  f.ok((await f.hash()).startsWith('#/sup/hoy/'), 'la dirección de Turno abre Hoy')
  await expect(f.page.locator('main [data-orden-cierre]')).toContainText('Si para otra bomba, cierre primero LC-02, LC-10 y LC-01')
  const lote = f.page.locator('main [data-tarea="confirmar"]').filter({ hasText: 'P-201B' })
  await expect(lote).toContainText('LC-07 y LC-16')
  await expect(lote).toContainText('en la planta, no planeada')
  await lote.getByRole('button', { name: 'Confirmar las 2' }).click()
  await expect(f.page.locator('[data-aviso-hoy]')).toContainText('Confirmadas LC-07 y LC-16')
  f.ok(!/LOTE-\d/.test(await f.page.locator('[data-aviso-hoy]').innerText()), 'el aviso no dice el código interno del lote (B-29)')
  await expect(f.page.locator('main [data-renglon="por-confirmar"] [data-cifra]')).toHaveText('2')
  f.cerrar()
})

test('«En el yacimiento»: solo producción y confiabilidad, diciendo qué lo muestra', async ({ flujo: f }) => {
  // El supervisor no lo ofrece: se lo pide a producción.
  await f.abrir('/#/sup/causa/ceiba/curso')
  let t = tarjeta(f.page, 'LC-05')
  await t.getByRole('button', { name: 'Corregir dónde se trabó' }).click()
  let hoja = t.getByRole('form', { name: /^¿Dónde se trabó\?/ })
  await expect(hoja.getByRole('radio', { name: /^En el yacimiento/ })).toHaveCount(0)
  await expect(hoja).toContainText('¿Fue el yacimiento? Lo pone producción o confiabilidad')
  // Producción lo pone con la prueba del pozo.
  await f.ir('#/prod/causa/ceiba/curso')
  t = tarjeta(f.page, 'LC-05')
  await t.getByRole('button', { name: 'Corregir dónde se trabó' }).click()
  hoja = t.getByRole('form', { name: /^¿Dónde se trabó\?/ })
  await hoja.getByRole('radio', { name: /^En el yacimiento/ }).click()
  await expect(hoja.getByRole('button', { name: 'Guardar' })).toBeDisabled()
  await hoja.getByRole('button', { name: 'La prueba del pozo' }).click()
  await hoja.getByRole('button', { name: 'Guardar' }).click()
  await expect(f.page.getByRole('status').filter({ hasText: 'Guardado en LC-05' })).toContainText('¿Dónde se trabó? → En el yacimiento')
  await expect(tarjeta(f.page, 'LC-05').locator('[data-paso="choke"]')).toContainText('Lo puso Marcela Ríos: la prueba del pozo')
  f.cerrar()
})

test.describe('390 px', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true })

  test('390 px: Identificar, Turno y Confiabilidad sin desbordes, también con la hoja de corregir abierta', async ({ flujo: f }) => {
    const revisar = async (donde: string) => {
      const h = await f.page.evaluate(detectar)
      f.ok(h.length === 0, `${donde}: nada se sale, se recorta ni se pisa (${h.map(x => `${x[0]} ${x[1]}`).slice(0, 4).join(' | ')})`)
    }
    for (const ruta of ['/#/sup/causa/ceiba/curso', '/#/oper/causa/ceiba/curso', '/#/sup/turno/ceiba/curso', '/#/conf/confiabilidad/morichal/curso']) {
      await f.abrir(ruta)
      await revisar(ruta)
    }
    await f.abrir('/#/prod/causa/ceiba/curso')
    const t = tarjeta(f.page, 'LC-07 y LC-16')
    await t.getByRole('button', { name: 'Corregir dónde se trabó' }).click()
    // En el teléfono la hoja de corregir sale fuera de la tarjeta (`HojaInferior` va en `.raiz-app`, sobre todo lo demás).
    const hoja = f.page.locator('[data-hoja-inferior]').getByRole('form', { name: /^¿Dónde se trabó\?/ })
    await expect(hoja.getByRole('group', { name: '¿Aplica a los 2 pozos de esta parada?' })).toBeVisible()
    await revisar('prod · corregir dónde se trabó en una cascada')
    await expect(hoja.getByRole('radio', { name: /^En el yacimiento/ })).toBeVisible()
    await hoja.getByRole('radio', { name: /^En el yacimiento/ }).click()
    await expect(hoja.getByRole('group', { name: '¿Qué lo muestra?' })).toBeVisible()
    // El yacimiento es de cada pozo: no se ofrece «a los 2».
    await expect(hoja.getByRole('group', { name: '¿A qué pozo?' })).toBeVisible()
    await expect(hoja.getByRole('button', { name: 'Sí, a los 2' })).toHaveCount(0)
    await revisar('prod · en el yacimiento, con lo que lo muestra')
    const ancho = await f.page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth])
    f.ok(ancho[0]! <= ancho[1]!, `la página no se desplaza de lado (${ancho.join(' de ')})`)
    f.cerrar()
  })
})
