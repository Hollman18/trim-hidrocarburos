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

test('el operador nunca escoge el tramo, la causa ni el detalle, y su toque no sube esos pasos', async ({ flujo: f }) => {
  await f.abrir('/#/oper/causa/ceiba/curso')
  const panel = arbol(f.page)
  await expect(panel.getByRole('heading', { level: 2 })).toHaveText('POR CONTESTAR · ÁRBOL DE CAUSAS')
  const botones = (await panel.locator('button').allInnerTexts()).map(b => b.trim())
  const prohibidos = ['En el pozo', 'En la planta o estación', 'Afuera', 'En el yacimiento', 'Corregir', 'Completar', 'Falla transformador', 'No planeada -', 'Planeada -']
  const vistos = botones.filter(b => prohibidos.some(x => b.startsWith(x)))
  f.ok(vistos.length === 0, `ningún botón para escoger el tramo, la causa o el detalle (${vistos.join(' | ')})`)
  f.ok(await panel.locator('select, [role="radio"], [role="radiogroup"]').count() === 0, 'ninguna lista ni opción del tramo, la causa o el detalle')
  const lc05 = tarjeta(f.page, 'LC-05')
  await expect(lc05).toContainText('«¿De dónde vino el corte?»: la registra su supervisor')
  f.ok(!(await lc05.innerText()).includes('Del campo: pórtico'), 'al operador no se le ofrecen las respuestas que su rol no registra')
  // Su toque confirma lo suyo: «¿estaba programado?» y «¿se perdió algo?».
  await lc05.getByRole('button', { name: 'Confirmar lo que contesté' }).click()
  await expect(f.page.getByRole('status').filter({ hasText: 'Su respuesta en LC-05 queda guardada' })).toBeVisible()
  await expect(lc05).toContainText('confirmó Jairo Peña')
  // Lo técnico sigue como propuesta de TRIM: plegado, sin opciones.
  await lc05.getByRole('button', { name: /^Lo técnico/ }).click()
  await expect(lc05.locator('[data-paso="choke"]')).toContainText('TRIM lo propone')
  await expect(lc05.locator('[data-paso="n1"]')).toContainText('TRIM lo dedujo')
  await expect(lc05.locator('[data-paso="responsable"]')).toContainText('TRIM lo dedujo')
  // El supervisor ve lo mismo: lo del operador confirmado; el tramo, la causa y el detalle, por confirmar.
  await f.ir('#/sup/causa/ceiba/curso')
  const sup = tarjeta(f.page, 'LC-05')
  await expect(sup.locator('[data-paso="planeacion"]')).toContainText('confirmó Jairo Peña')
  await expect(sup.locator('[data-paso="impacto"]')).toContainText('confirmó Jairo Peña')
  await expect(sup.locator('[data-paso="choke"]')).toContainText('TRIM lo propone')
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

test('tanques llenos: TRIM pregunta si el oleoducto o el cliente estaba recibiendo', async ({ flujo: f }) => {
  // Guacamayo, 17-oct-2025: LACT-01 limitó el despacho; la nota dice «nominación del oleoducto».
  await f.abrir('/#/conf/causa/guacamayo/2025-10-17_2025-10-17')
  const t = f.page.locator('main article[data-parada-anh]').filter({ has: f.page.getByRole('group', { name: '¿Qué lo paró?' }) }).first()
  await expect(t.locator('[data-paso="choke"]')).toContainText('TRIM sugiere: En la planta o estación')
  await expect(t.locator('[data-paso="choke"]')).toContainText('falta: «¿El oleoducto o el cliente estaba recibiendo?»')
  const primera = t.getByRole('group', { name: '¿Qué lo paró?' })
  f.ok((await primera.getByRole('button').allInnerTexts()).map(x => x.trim()).join(' | ') === 'La planta no recibe (agua o proceso) | El tanque de crudo está lleno | No sé',
    'la primera pregunta: el agua no es el crudo (U2 §4.4, caso 3)')
  await primera.getByRole('button', { name: 'El tanque de crudo está lleno' }).click()
  const segunda = t.getByRole('group', { name: '¿El oleoducto o el cliente estaba recibiendo?' })
  await expect(segunda).toBeVisible()
  f.ok((await segunda.getByRole('button').allInnerTexts()).map(x => x.split('\n')[0]!.trim()).join(' | ') === 'Sí, recibía | No, no recibía | No sé',
    'la segunda pregunta: ¿el oleoducto o el cliente estaba recibiendo?')
  await segunda.getByRole('button', { name: /^No, no recibía/ }).click()
  await expect(f.page.getByRole('status').filter({ hasText: 'Guardado en' })).toContainText('El tanque de crudo está lleno · No, no recibía')
  const despues = f.page.locator('main article[data-parada-anh] [data-paso="choke"]').filter({ hasText: 'Afuera: oleoducto, transportador o cliente' }).first()
  await expect(despues).toContainText('dijo Edwin Maestre')
  f.cerrar()
})

test('Turno: «Hoy limita» separa lo que limita, lo más frágil y lo que más cuesta, y el supervisor confirma en lote una cascada', async ({ flujo: f }) => {
  await f.abrir('/#/sup/turno/ceiba/curso')
  const hoy = f.page.locator('main [data-hoy-limita="ceiba"]')
  const linea = await hoy.innerText()
  f.ok(/Qué limita hoy al campo\s*◄\s*limita · los pozos ·\s*11\.360 bbl\/d/.test(linea), `qué limita hoy: los pozos, en gris con doble contorno y «◄ limita» (${linea.slice(0, 90)})`)
  const borde = await hoy.getByLabel(/^Limita: los pozos/).evaluate(e => getComputedStyle(e).borderStyle)
  f.ok(borde === 'double', `«limita» lleva doble contorno, no color (${borde})`)
  f.ok(/Lo más frágil[\s\S]*el agua[\s\S]*P-201A y P-201C subieron/.test(linea), 'lo más frágil: el agua, con las hermanas de P-201B que suben y no tienen instrumento')
  f.ok(/Lo que más cuesta si falla hoy/.test(linea), 'lo que más cuesta si falla hoy, en su propia línea')
  await expect(f.page.locator('main').getByText('en la planta', { exact: true })).toBeVisible()
  const cierre = f.page.locator('main section').filter({ has: f.page.getByRole('heading', { name: 'CIERRE DE HOY · PARADAS POR CONFIRMAR' }) })
  await expect(cierre).toContainText('4 paradas hoy · 0 completas · faltan 4')
  const lote = cierre.locator('[data-lote]').filter({ hasText: 'por P-201B' })
  await expect(lote).toContainText('LC-07 y LC-16')
  // Un toque por grupo.
  await lote.getByRole('button', { name: 'Confirmar las 2' }).click()
  await expect(cierre.getByRole('status')).toContainText('2 paradas confirmadas de un toque (lote LOTE-1); quedan completas para el reporte.')
  await expect(cierre).toContainText('4 paradas hoy · 2 completas · faltan 2')
  await expect(cierre.locator('[data-lote]')).toHaveCount(0)
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

test('WhatsApp: el operador avala solo lo que contestó; lo técnico sigue para su supervisor', async ({ flujo: f }) => {
  await f.abrir('/#/oper/causa/ceiba/curso')
  // El primero es el de P-201B, la pregunta más reciente («por identificar · sin arrancar»).
  await f.page.getByRole('button', { name: 'Ver mi chat de WhatsApp' }).first().click()
  const chat = f.page.getByRole('group', { name: /^Chat de WhatsApp de / })
  await chat.getByRole('button', { name: /^1\s*Sello mecánico/ }).click()
  await chat.getByRole('button', { name: /^1\s*Fuga hacia afuera/ }).click()
  await expect(chat).toHaveCount(0)
  // En «Declaradas», el mismo chat cierra con lo que contestó y nada más.
  await f.page.getByRole('button', { name: 'Ver el chat de Jairo Peña' }).click()
  const cierre = f.page.getByRole('group', { name: /^Chat de WhatsApp de / })
  await expect(cierre).toContainText('Así queda lo que usted contestó: P-201B, sello mecánico: fuga hacia afuera. El resto del reporte lo revisa su supervisor.')
  const dice = await cierre.innerText()
  f.ok(!/se trabó|En la planta|No planeada|Parada estación|choke/i.test(dice), 'el mensaje de cierre no le muestra el tramo, la causa ni el detalle')
  await cierre.getByRole('button', { name: /^1\s*Está bien/ }).click()
  await expect(cierre).toContainText('Listo. Gracias, Jairo. Su respuesta queda guardada a las 14:00.')
  // Su «Está bien» no confirma lo técnico de las paradas que cerró P-201B.
  await f.ir('#/sup/causa/ceiba/curso')
  const t = tarjeta(f.page, 'LC-07 y LC-16')
  await expect(t).toHaveAttribute('data-estado', 'propuesta')
  await expect(t.locator('[data-paso="choke"]')).toContainText('TRIM lo dedujo')
  await expect(t.locator('[data-paso="n2"]')).toContainText('TRIM lo dedujo')
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
    const hoja = t.getByRole('form', { name: /^¿Dónde se trabó\?/ })
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
