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

test('Hoy · supervisor: su número, las tarjetas en su orden, «No arrancar» y la insignia sin los avisos', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/sup/hoy/ceiba/curso')
  // Experiencia v3 (necesario-por-rol §14): «Paradas por confirmar 4 · antes de las 07:00», tipo número.
  const cifras = page.locator('main [data-cifras]').first()
  await expect(cifras.locator('[data-renglon="por-confirmar"]')).toContainText('4')
  await expect(cifras.locator('[data-renglon="por-confirmar"]')).toContainText('el reporte sale mañana antes de las 07:00')
  await expect(cifras.locator('[data-renglon="ahora"]')).toContainText('1.966')
  await expect(cifras.locator('[data-renglon="no-arrancar"]')).toContainText('P-201B y LC-21')
  await expect(cifras.locator('[data-renglon="sin-causa"]')).toContainText('LC-21 y LC-08')
  // «Entregar turno» fijo arriba, junto a la cifra (FF-4), y «Registrar una pérdida».
  await expect(cifras.getByRole('button', { name: 'Entregar turno' })).toBeVisible()
  await expect(cifras.getByRole('button', { name: 'Registrar una pérdida' })).toBeVisible()
  // El orden: lo que tiene hora y los barriles en juego; la orden de K-101 no es suya (A-24).
  const t = await titulos(page)
  f.ok(t.join(' | ').startsWith('Confirmar 2 paradas iguales | Conseguir la causa de 2 paradas | Decidir 3 planes de P-201B · simulado'),
    `el orden de las tarjetas (${t.join(' | ')})`)
  f.ok(!t.some(x => x.includes('K-101')), 'A-24: «Seguir la orden de K-101» no está en el Hoy del supervisor')
  const conf = page.locator('main [data-tarea="confirmar"]').first()
  await expect(conf).toContainText('Alarma · P-201B cerró LC-07 y LC-16 · 05:43')
  await expect(conf).toContainText('TRIM las dedujo: en la planta, no planeada.')
  // FF-2: quien no la debe ve una línea, con «Contestar yo» (un solo nombre).
  await expect(page.locator('main [data-tarea="conseguir-causa"]').getByRole('button', { name: 'Contestar yo' })).toBeVisible()
  // El orden de cierre sale solo cuando para una bomba de agua (P-201B está parada).
  await expect(page.locator('main [data-orden-cierre]')).toContainText('cierre primero LC-02, LC-10 y LC-01')
  const piden = await page.locator('main [data-tarea][data-pide="true"]').count()
  f.ok(await insignia(page) === 4 && piden === 3, `la insignia del motor es 4 (cuenta la orden de K-101) y se ven 3 tarjetas que piden algo (${piden})`)
  // A-03, A-04 y A-05: sin «Su campo, ahora», sin el diferido de 12 h ni la explicación del botón.
  await expect(page.locator('main [data-su-campo], main [data-diferido-turno]')).toHaveCount(0)
  await expect(page.locator('main')).not.toContainText('«Entregar turno» abre la entrega')
  const enPanel = page.locator('nav span', { hasText: 'por hacer en Hoy' })
  if (await enPanel.count()) await expect(enPanel.first()).toHaveText('4 por hacer en Hoy')
  f.cerrar()
})

test('Hoy · supervisor: «Confirmar las 2» en un toque, con su aviso, y «Deshacer» la devuelve (D1)', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/sup/hoy/ceiba/curso')
  await f.esperarTexto('Confirmar 2 paradas iguales')
  const porConfirmar = page.locator('main [data-renglon="por-confirmar"] [data-cifra]')
  await expect(porConfirmar).toHaveText('4')
  f.ok(await f.clic('Confirmar las 2'), 'el botón «Confirmar las 2»')
  const aviso = page.locator('[data-aviso-hoy]')
  await expect(aviso).toContainText('Confirmadas LC-07 y LC-16')
  await expect(aviso.getByRole('button', { name: 'Deshacer' })).toBeVisible()
  await expect(page.locator('main [data-tarea="confirmar"]')).toHaveCount(0)
  await expect(page.locator('main [data-hechas]')).toContainText('Hecho hoy (1) · las 2 paradas de P-201B')
  await expect(porConfirmar).toHaveText('2')
  f.ok(await insignia(page) === 3, 'la insignia baja a 3')
  await aviso.getByRole('button', { name: 'Deshacer' }).click()
  await expect(page.locator('main [data-tarea="confirmar"]')).toHaveCount(1)
  await expect(page.locator('main [data-hechas]')).toHaveCount(0)
  await expect(porConfirmar).toHaveText('4')
  f.ok(await insignia(page) === 4, 'la insignia vuelve a 4')
  f.ok(await f.clic('Confirmar las 2'), 'se vuelve a confirmar')
  await expect(page.locator('main [data-hechas]')).toContainText('Hecho hoy (1)')
  f.cerrar()
})

test('Hoy · operador en el teléfono (390 px): «Pregunta 1 de 4», un toque registra la parte, lo que vio es opcional, «Deshacer» y la siguiente', async ({ flujo: f }) => {
  const { page } = f
  await page.setViewportSize({ width: 390, height: 844 })
  await f.abrir('/#/oper/hoy/ceiba/curso')
  const pregunta = page.locator('main [data-operador="pregunta"]')
  const paso = pregunta.locator('[data-paso]')
  await expect(paso).toContainText('Pregunta')
  await expect(paso).toContainText('1')
  await expect(paso).toContainText('de 4')
  // K2: el momento en palabras de campo; y el tramo del choke donde está el equipo.
  await expect(pregunta.locator('[data-contexto]')).toContainText('P-201B · bomba de agua · paró hoy en la madrugada')
  await expect(pregunta.locator('[data-contexto]')).toContainText('planta')
  await expect(pregunta.locator('h2')).toHaveText('¿Qué parte se dañó?')
  await expect(page.locator('main [data-bloqueo]')).toContainText('No arrancar P-201B ni LC-21')
  const opciones = pregunta.locator('[data-opcion]')
  await expect(opciones.first()).toContainText('Sello mecánico')
  await expect(opciones.first()).toContainText('5 de sus 8 fallas')
  const altos = await opciones.evaluateAll(es => es.map(e => e.getBoundingClientRect().height))
  f.ok(altos.every(h => h >= 64), `las opciones miden 64 px o más (${altos.map(Math.round).join(', ')})`)
  await expect(page.getByRole('button', { name: /^Siguiente/ })).toHaveCount(0)
  // A3 · FF-2: UN toque guarda la parte; «¿qué vio?» queda aparte, opcional, y la pregunta siguiente ya entra.
  await pregunta.locator('[data-opcion="Sello mecánico"]').click()
  const aviso = page.locator('[data-aviso-hoy]')
  await expect(aviso).toContainText('Se registra en 5 s: sello mecánico en P-201B')
  await expect(page.locator('main [data-lo-que-vio]')).toContainText('Sello mecánico: ¿qué vio?')
  await expect(page.locator('main [data-lo-que-vio]')).toContainText('(si quiere)')
  await expect(paso).toContainText('2')
  await expect(pregunta.locator('h2')).toHaveText('¿Por qué paró?')
  // «Deshacer» suelta la parte antes de escribirla: vuelve la primera y se va «¿qué vio?».
  await aviso.getByRole('button', { name: 'Deshacer' }).click()
  await expect(pregunta.locator('h2')).toHaveText('¿Qué parte se dañó?')
  await expect(page.locator('main [data-lo-que-vio]')).toHaveCount(0)
  // Otra vez la parte, y ahora lo que vio: dos escrituras, cada una con su aviso.
  await pregunta.locator('[data-opcion="Sello mecánico"]').click()
  await page.locator('main [data-lo-que-vio] [data-opcion="Fuga hacia afuera"]').click()
  await expect(aviso).toContainText('Se registra en 5 s: fuga hacia afuera en P-201B')
  await expect(page.locator('main [data-lo-que-vio]')).toHaveCount(0)
  // Un toque en una causa del pozo registra y pasa a la siguiente.
  await page.locator('main [data-operador="pregunta"] [data-opcion="Fuga o daño en la línea de flujo"]').click()
  await expect(aviso).toContainText('Se registra en 5 s: fuga o daño en la línea de flujo en LC-21')
  await expect(aviso).toContainText('Registrado: fuga o daño en la línea de flujo en LC-21', { timeout: 8_000 })
  await expect(page.locator('main [data-pregunta^="libro:EP-LC21"]')).toHaveCount(0)
  f.cerrar()
})

test('Hoy · vacío: «Nada pendiente. El campo está normal.», sin abrir La planta viva (B-01)', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/jefe/hoy/palmar/curso')
  const vacio = page.locator('main [data-vacio]')
  await expect(vacio).toContainText('Nada pendiente. El campo está normal.')
  await expect(vacio.getByRole('button', { name: /Abrir La planta viva/ })).toHaveCount(0)
  f.ok(await insignia(page) === 0, 'sin nada que pida una acción, la insignia es 0')
  f.cerrar()
})
