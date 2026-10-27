// C3 · Hoy (X4 §3.3, §3.4 y §5.5; X5 §5.7 y §5.8; imágenes 3a, 3b y 5), de
// punta a punta con los datos del demo: el 2-oct a las 14:00 la P-201B de La
// Ceiba está parada y cerró LC-07 y LC-16; LC-21 sigue parado sin causa y LC-08
// arrancó sin identificar; K-101 ya pasó el límite y tiene su orden en SAP.
import { expect, type Page } from '@playwright/test'
import { test } from './apoyo.ts'

/** Los títulos de las tarjetas de Hoy, en el orden en que se ven. */
// F1 (A15): el título de cada tarjeta es un h2.
// K2: lo que se ve (innerText): el título del teléfono va aparte y se esconde en el escritorio.
const titulos = (page: Page) => page.locator('main [data-tarea]').evaluateAll(es => es.map(e => ((e.querySelector('h2, h3, b') as HTMLElement | null)?.innerText ?? '').trim()))
/** La insignia que da el motor (la que pinta el panel en la puerta de Hoy). */
const insignia = async (page: Page) => Number(await page.locator('main [data-insignia]').first().getAttribute('data-insignia'))

test('Hoy · supervisor: las tarjetas en su orden, la franja «No arrancar» y la insignia sin los avisos', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/sup/hoy/ceiba/curso')
  await f.esperarTexto('se dejan de producir en La Ceiba.')
  const inicio = page.locator('main [data-inicio]')
  await expect(inicio).toContainText('1.966')
  await expect(inicio).toContainText('Le faltan 4 paradas por confirmar: el reporte sale mañana antes de las 07:00.')
  // Lo que dice «no» va como franja en tinta, arriba de las tarjetas.
  await expect(page.locator('main [data-bloqueo]').first()).toContainText('No arrancar P-201B ni LC-21 hasta identificar qué se dañó')
  // El orden: lo que tiene hora, los barriles en juego y al final lo que solo informa.
  const t = await titulos(page)
  // F1 (UI-20): los planes simulados de P-201B van en su propia tarjeta, después de las de barriles.
  f.ok(t.join(' | ').startsWith('Confirmar 2 paradas iguales | Conseguir la causa de 2 paradas | Seguir la orden de K-101 | Decidir 3 planes de P-201B · simulado | Lo más frágil: el agua.'),
    `el orden de las tarjetas (${t.join(' | ')})`)
  const conf = page.locator('main [data-tarea="confirmar"]').first()
  await expect(conf).toContainText('Alarma · P-201B cerró LC-07 y LC-16 · 05:43')
  await expect(conf).toContainText('TRIM las dedujo: en la planta, no planeada.')
  await expect(page.locator('main [data-tarea="conseguir-causa"]')).toContainText('LC-21 lleva 19,7 h sin causa; se escaló a las 20:20')
  await expect(page.locator('main [data-tarea="conseguir-causa"]')).toContainText('Entre las 2: 219 bbl hoy · 355 desde que pararon')
  await expect(page.locator('main [data-tarea="orden"]')).toContainText('Orden 40012056, liberada a Óscar Daza a las 09:10.')
  // La insignia cuenta las tarjetas que piden algo: «Lo más frágil» no suma.
  const piden = await page.locator('main [data-tarea][data-pide="true"]').count()
  f.ok(await insignia(page) === 4 && piden === 4, `la insignia es 4 (con «Decidir 3 planes») y son las tarjetas que piden algo (${piden})`)
  await expect(page.locator('main [data-tarea="aviso"]').first()).toHaveAttribute('data-pide', 'false')
  // Al lado: el campo ahora, el turno en WhatsApp y el diferido del turno.
  await expect(page.locator('main [data-su-campo]')).toContainText('En la planta no pasan 1.665 bbl/d; limitan los pozos.')
  await expect(page.locator('main [data-whatsapp]')).toContainText('8 mensajes')
  await expect(page.locator('main [data-diferido-turno]')).toContainText('723')
  // La puerta de Hoy del panel pinta la misma insignia (C1, `useInsigniaDeHoy`).
  const enPanel = page.locator('nav span', { hasText: 'por hacer en Hoy' })
  if (await enPanel.count()) await expect(enPanel.first()).toHaveText('4 por hacer en Hoy')
  f.cerrar()
})

test('Hoy · supervisor: «Confirmar las 2» pasa a «Hecho hoy» con su aviso, y «Deshacer» la devuelve (D1)', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/sup/hoy/ceiba/curso')
  await f.esperarTexto('Confirmar 2 paradas iguales')
  f.ok(await f.clic('Confirmar las 2'), 'el botón «Confirmar las 2»')
  const aviso = page.locator('[data-aviso-hoy]')
  await expect(aviso).toContainText('Confirmadas LC-07 y LC-16')
  await expect(aviso.getByRole('button', { name: 'Deshacer' })).toBeVisible()
  await expect(page.locator('main [data-tarea="confirmar"]')).toHaveCount(0)
  await expect(page.locator('main [data-hechas]')).toContainText('Hecho hoy (1) · las 2 paradas de P-201B')
  await expect(page.locator('main [data-inicio]')).toContainText('Le faltan 2 paradas por confirmar')
  f.ok(await insignia(page) === 3, 'la insignia baja a 3')
  // «Deshacer»: una escritura nueva que devuelve los pasos a lo que propone TRIM.
  await aviso.getByRole('button', { name: 'Deshacer' }).click()
  await expect(page.locator('main [data-tarea="confirmar"]')).toHaveCount(1)
  await expect(page.locator('main [data-hechas]')).toHaveCount(0)
  await expect(page.locator('main [data-inicio]')).toContainText('Le faltan 4 paradas por confirmar')
  f.ok(await insignia(page) === 4, 'la insignia vuelve a 4')
  // Se puede volver a confirmar.
  f.ok(await f.clic('Confirmar las 2'), 'se vuelve a confirmar')
  await expect(page.locator('main [data-hechas]')).toContainText('Hecho hoy (1)')
  f.cerrar()
})

test('Hoy · operador en el teléfono (390 px): una pregunta por pantalla, un toque registra, «Deshacer» y la siguiente', async ({ flujo: f }) => {
  const { page } = f
  await page.setViewportSize({ width: 390, height: 844 })
  await f.abrir('/#/oper/hoy/ceiba/curso')
  const banda = page.locator('main [data-operador="pregunta"] header')
  // F1 (UI-21, imagen 5): «Pregunta 1 de 4» va en la banda índigo del ☰.
  const paso = page.locator('main [data-banda] [data-paso]')
  await expect(paso).toHaveText('Pregunta 1 de 4')
  // K2: el momento en palabras de campo; la hora exacta no decide la respuesta (está en la ficha de P-201B).
  await expect(banda).toContainText('P-201B · bomba de agua · paró hoy en la madrugada')
  await expect(banda).not.toContainText('03:52')
  await expect(banda.locator('h2')).toHaveText('¿Qué parte se dañó?')
  await expect(page.locator('main [data-bloqueo]')).toContainText('No la arranque hasta decir qué se dañó')
  await expect(page.locator('main')).toContainText('Lo que más le ha fallado a esta bomba:')
  const opciones = page.locator('main [data-opcion]')
  await expect(opciones.first()).toContainText('Sello mecánico')
  await expect(opciones.first()).toContainText('5 de sus 8 fallas')
  await expect(page.locator('main [data-opcion="Todavía no sé"]')).toBeVisible()
  // Opciones de 64 px o más (X5 §5.8) y sin botón «Siguiente».
  const altos = await opciones.evaluateAll(es => es.map(e => e.getBoundingClientRect().height))
  f.ok(altos.every(h => h >= 64), `las opciones miden 64 px o más (${altos.map(Math.round).join(', ')})`)
  await expect(page.getByRole('button', { name: /^Siguiente/ })).toHaveCount(0)
  // F1 (P-07): la parte es un toque, y «¿qué vio?» entra como la pregunta siguiente, que cuenta.
  await page.locator('main [data-opcion="Sello mecánico"]').click()
  const aviso = page.locator('[data-aviso-hoy]')
  await expect(aviso).toContainText('Sello mecánico en P-201B: falta qué vio.')
  await expect(paso).toHaveText('Pregunta 2 de 5')
  await expect(banda.locator('h2')).toHaveText('Sello mecánico: ¿qué vio?')
  await expect(page.locator('main [data-opcion="Todavía no sé"]')).toBeVisible()
  await page.locator('main [data-opcion]').first().click()
  // F1 (P-08): no dice «Registrado» antes de escribir.
  await expect(aviso).toContainText(/^Se registra en 5 s: sello mecánico \(.+\) en P-201B/)
  await expect(paso).toHaveText('Pregunta 3 de 5')
  await expect(banda).toContainText('LC-21 · pozo · paró ayer en la tarde')
  await expect(banda.locator('h2')).toHaveText('¿Por qué paró?')
  // «Deshacer» la suelta antes de escribirla: vuelve la primera.
  await aviso.getByRole('button', { name: 'Deshacer' }).click()
  await expect(paso).toHaveText('Pregunta 1 de 4')
  await expect(banda.locator('h2')).toHaveText('¿Qué parte se dañó?')
  // Un toque en una causa del pozo registra y pasa a la siguiente.
  await page.locator('main [data-opcion="Todavía no sé"]').click()
  await expect(banda.locator('h2')).toHaveText('¿Por qué paró?')
  await page.locator('main [data-opcion="Fuga o daño en la línea de flujo"]').click()
  await expect(aviso).toContainText('Se registra en 5 s: fuga o daño en la línea de flujo en LC-21')
  await expect(paso).toHaveText('Pregunta 3 de 4')
  // Al vencer el aviso queda escrita, a su nombre, y el aviso lo dice: LC-21 ya no se pregunta.
  await expect(aviso).toContainText('Registrado: fuga o daño en la línea de flujo en LC-21', { timeout: 8_000 })
  await expect(page.locator('main [data-pregunta^="libro:EP-LC21"]')).toHaveCount(0)
  f.cerrar()
})

test('Hoy · vacío: «Nada pendiente. El campo está normal.», con el enlace a La planta viva', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/jefe/hoy/palmar/curso')
  const vacio = page.locator('main [data-vacio]')
  await expect(vacio).toContainText('Nada pendiente. El campo está normal.')
  await expect(vacio.getByRole('button', { name: /Abrir La planta viva/ })).toBeVisible()
  f.ok(await insignia(page) === 0, 'sin nada que pida una acción, la insignia es 0')
  f.cerrar()
})
