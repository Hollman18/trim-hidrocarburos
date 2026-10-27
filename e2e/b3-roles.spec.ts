// B3 · Experiencia v3: lo necesario de sup, oper, tec, jefe y conf (necesario-por-rol.md §3 a §8 y §14),
// de punta a punta con el demo (La Ceiba, 2-oct, 14:00): el número de cada rol, su acción principal
// a un toque, la jornada del supervisor, la pérdida registrada, la orden que se cierra en el teléfono,
// el tiempo fuera en 5 tramos y todo a 390 px. El motor calcula; aquí se comprueba lo que se pinta.
import { expect, type Page } from '@playwright/test'
import { test } from './apoyo.ts'

const renglon = (page: Page, id: string) => page.locator(`main [data-renglon="${id}"]`).first()
/** Nada ensancha la vista: ni la página ni `.vista` se desplazan de lado. */
const sinDesborde = (page: Page) => page.evaluate(() => {
  const v = document.querySelector('.vista') as HTMLElement | null
  return document.documentElement.scrollWidth <= innerWidth + 1 && (!v || v.scrollWidth <= v.clientWidth + 1)
})

test('sup · «Mi turno»: las paradas de la jornada con su hora y su cadena, y lo diferido y lo perdido, nunca sumados', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/sup/hoy/ceiba/curso')
  const turno = page.locator('main [data-mi-turno="actual"]')
  await expect(turno).toContainText('Mi turno')
  await expect(turno).toContainText('de 06:00 a 18:00 del 2 de oct')
  await expect(turno.locator('[data-jornada-por-confirmar]')).toHaveText('3')
  await expect(turno.locator('[data-jornada-diferido]')).toHaveText('655')
  // La pérdida va aparte y, sin registros, dice «sin registro»: nunca un 0 inventado.
  await expect(turno.locator('[data-jornada-perdido]')).toHaveText('sin registro')
  const lc16 = turno.locator('[data-parada-jornada="EP-LC16-261002-78"]')
  await expect(lc16).toContainText('LC-16 · por P-201B')
  await expect(lc16.locator('[data-cuando]')).toHaveText('Venía de las 05:43 · sigue')
  // El choke sí o sí: tramo · diferida o pérdida · planeada · causa.
  await expect(lc16.locator('[data-cadena]')).toHaveText('Planta · Diferida · No planeada · Parada estación/bombeo afecta pozos')
  await expect(turno.locator('[data-nota-jornada]')).toContainText('Horario por defecto, sin firmar')
  // La jornada anterior (la que recibió), a un toque.
  f.ok(await f.clic('Ver la jornada anterior'), 'abre la jornada anterior')
  await expect(page.locator('main [data-mi-turno="anterior"]')).toContainText('El turno que recibió')
  f.ok(await f.clic('Volver a mi turno'), 'y vuelve')
  // «Entregar turno»: el resumen con la jornada, en pantalla, y «Compartir en PDF».
  f.ok(await f.clic('Entregar turno'), '«Entregar turno», fijo arriba')
  const entrega = page.locator('[data-entrega]')
  await expect(entrega.locator('[data-entrega-jornada]')).toContainText('Venía de las 05:43 · sigue')
  await expect(entrega.locator('[data-entrega-jornada] [data-jornada-perdido]')).toHaveText('sin registro')
  await expect(entrega.getByRole('button', { name: 'Compartir en PDF' })).toBeVisible()
  f.cerrar()
})

test('sup · registrar una pérdida con botones: queda PÉRDIDA en su tramo, aparte de lo diferido, y «Deshacer» la retira (D1)', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/sup/hoy/ceiba/curso')
  const turno = page.locator('main [data-mi-turno="actual"]')
  await expect(turno.locator('[data-jornada-diferido]')).toHaveText('655')
  f.ok(await f.clic('Registrar una pérdida'), 'abre el registro')
  const form = page.locator('[data-perdida-formulario]')
  await expect(form.locator('[data-tipo-perdida]')).toHaveCount(5)
  await form.locator('[data-tipo-perdida="pitera"]').click()
  // El tramo sale del tipo (se puede cambiar): la pitera, en los pozos.
  await expect(form.locator('[data-tramo="pozo"]')).toHaveAttribute('aria-pressed', 'true')
  await form.getByLabel('¿Dónde?').fill('LC-07')
  await form.getByLabel('¿Cuántos barriles?').fill('12')
  await form.getByLabel('¿Cómo lo supo?').fill('aforo del tanque de la locación')
  // Empezó en la jornada (la de 06:00 a 18:00): la pérdida cuenta entera donde empezó.
  await form.getByLabel('Empezó').fill('2026-10-02T10:30')
  await form.getByRole('button', { name: 'Registrar', exact: true }).click()
  const aviso = page.locator('[data-aviso-hoy]')
  await expect(aviso).toContainText('Pérdida registrada: pitera en LC-07 · 12 bbl')
  // Lado a lado y nunca sumados: el diferido no cambia; la pérdida tiene su número.
  await expect(turno.locator('[data-jornada-perdido]')).toHaveText('12')
  await expect(turno.locator('[data-jornada-diferido]')).toHaveText('655')
  await aviso.getByRole('button', { name: 'Deshacer' }).click()
  await expect(turno.locator('[data-jornada-perdido]')).toHaveText('sin registro')
  f.cerrar()
})

test('oper · una sola pantalla, sin menú: la parte en un toque, lo que vio se escribe aparte, y la pérdida de gas en KPC', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/oper/hoy/ceiba/curso')
  const puertas = await page.locator('nav[aria-label="Navegación"] [role=group][aria-label="Puertas"] button').count()
  f.ok(puertas === 0, `sin menú de puertas (${puertas})`)
  const pregunta = page.locator('main [data-operador="pregunta"]')
  await expect(pregunta.locator('[data-paso]')).toContainText('de 4')
  await pregunta.locator('[data-opcion="Sello mecánico"]').click()
  await page.locator('main [data-lo-que-vio] [data-opcion="Fuga hacia afuera"]').click()
  const aviso = page.locator('[data-aviso-hoy]')
  // La parte se escribió al tocar lo que vio; lo que vio, al vencer su aviso: sin error.
  await expect(aviso).toContainText('Registrado: fuga hacia afuera en P-201B', { timeout: 8_000 })
  await expect(aviso).not.toContainText('No se guardó')
  // El orden de cierre, cuando para una bomba de agua.
  await expect(page.locator('main [data-orden-cierre]')).toContainText('LC-02, LC-10 y LC-01')
  f.ok(await f.clic('Registrar una pérdida'), 'abre el registro')
  const form = page.locator('[data-perdida-formulario]')
  await form.locator('[data-tipo-perdida="tea"]').click()
  await expect(form.locator('[data-tramo="planta"]')).toHaveAttribute('aria-pressed', 'true')
  await form.getByLabel('¿Dónde?').fill('Tea de la planta')
  await form.getByLabel('¿Cuánto gas? (KPC)').fill('40')
  await form.getByLabel('¿Cómo lo supo?').fill('medidor de la tea')
  await form.getByRole('button', { name: 'Registrar', exact: true }).click()
  await expect(aviso).toContainText('Pérdida registrada: tea en Tea de la planta · 40 KPC')
  f.cerrar()
})

test('tec · «5 cosas hoy», la pregunta abierta en un toque y la orden de K-101 cerrada en el teléfono', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/tec/hoy/ceiba/curso')
  await expect(renglon(page, 'cosas')).toContainText('5')
  await expect(renglon(page, 'cosas')).toContainText('Primero P-201B')
  await expect(renglon(page, 'no-arrancar')).toContainText('P-201B y LC-21')
  // FF-2: la primera le llega abierta: decir qué se dañó es UN toque.
  const tarjeta = page.locator('main [data-tarea="contestar"]').first()
  await expect(tarjeta.locator('[data-opcion="Sello mecánico"]')).toBeVisible()
  // Su orden (FF-6): ya no es solo para leer; se cierra sin papel.
  const orden = page.locator('main [data-su-orden] [data-orden="40012056"]')
  await expect(orden).toContainText('Orden 40012056 · K-101')
  await orden.getByRole('button', { name: 'Cerrar la orden' }).click()
  const cierre = page.locator('[data-cierre-orden="40012056"]')
  await cierre.locator('[data-actividades] button', { hasText: 'Inspeccioné' }).click()
  await cierre.getByRole('button', { name: 'Cerrar la orden' }).click()
  await expect(page.locator('main [data-orden-cerrada="40012056"]')).toContainText('Orden 40012056 cerrada')
  await expect(page.locator('main [data-orden-cerrada="40012056"]')).toContainText('queda ejecutada en SAP (CNF)')
  await expect(page.locator('main [data-su-orden] [data-orden="40012056"]')).toHaveCount(0)
  f.cerrar()
})

test('jefe · «1 equipo avisa» con su tramo y su orden, las fallas del mes, la espera en 5 tramos, los planes y avisar a SAP', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/jefe/hoy/ceiba/curso')
  const avisan = renglon(page, 'avisan')
  await expect(avisan.locator('[data-cifra]')).toHaveText('1')
  await expect(avisan).toContainText('K-101 ya pasó el límite · frenaría en la planta')
  await expect(renglon(page, 'por-identificar')).toContainText('3')
  await expect(renglon(page, 'fallas-mes')).toContainText('octubre')
  await expect(renglon(page, 'fallas-mes')).toContainText('P-201B (planta)')
  await expect(renglon(page, 'espera')).toContainText('7,7 de 8,1')
  // Ver la orden en un toque (sin la tarjeta repetida de «Seguir la orden»).
  await expect(page.locator('main [data-tarea="orden"]')).toHaveCount(0)
  f.ok(await f.clic('Ver la orden'), '«Ver la orden»')
  await expect(page.locator('main [data-orden-abierta="40012056"]')).toContainText('Óscar Daza')
  // La espera abre el tiempo fuera en sus 5 tramos; lo que no tiene marca va aparte, sin repartir.
  await renglon(page, 'espera').click()
  const tramos = page.locator('[data-tiempo-fuera]')
  await expect(tramos).toContainText('promedio de 14 fallas')
  await expect(tramos.locator('[data-tramo-tiempo="deteccion"]')).toContainText('0,4 h')
  await expect(tramos.locator('[data-tramo-tiempo="administrativo"]')).toContainText('1,6 h')
  await expect(tramos.locator('[data-tramo-tiempo="logistica"]')).toContainText('sin dato')
  await expect(tramos.locator('[data-tramo-tiempo="reparacion"]')).toContainText('8,0 h')
  await expect(tramos.locator('[data-tramo-tiempo="sin-dato"]')).toContainText('183,6 h')
  await tramos.getByRole('button', { name: 'Cerrar' }).click()
  // «No intervenir hoy», una vez y solo cuando aplica.
  await expect(page.locator('main [data-no-intervenir]')).toHaveCount(1)
  await expect(page.locator('main [data-no-intervenir]')).toContainText('P-201A y P-201C')
  // FF-3: los planes, donde se abren: en su tarjeta, con «Aceptar».
  await page.locator('main [data-tarea="planes"]').getByRole('button', { name: 'Ver los planes' }).click()
  const planes = page.locator('main [data-planes-en-tarjeta]')
  await expect(planes.getByRole('button', { name: 'Aceptar' }).first()).toBeVisible()
  await planes.getByRole('button', { name: 'Aceptar' }).first().click()
  await expect(planes.getByRole('button', { name: 'Ya se hizo' }).first()).toBeVisible()
  // FF-5: «SAP no lo sabe · Avisar», un toque.
  const sap = page.locator('main [data-avisar-sap="P-201B"]')
  await expect(sap).toContainText('SAP no lo sabe')
  await sap.getByRole('button', { name: 'Avisar' }).click()
  await expect(sap).toContainText(/aviso \d+ en SAP/)
  f.cerrar()
})

test('conf · «3.059 bbl/d · el primero de Si falla hoy» con su tramo, sus apoyos, abrir el primero en un toque y sin «Qué está en riesgo»', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/conf/equipos/ceiba')
  const primero = renglon(page, 'si-falla-hoy')
  await expect(primero.locator('[data-cifra]')).toHaveText('3.059')
  await expect(primero).toContainText('P-201A y P-201C · sin instrumento · se trabaría en la planta')
  await expect(renglon(page, 'vigia')).toContainText('3 de 3')
  await expect(renglon(page, 'sin-instrumento')).toContainText('5')
  await expect(renglon(page, 'entre-fallas')).toContainText('41 d')
  await expect(renglon(page, 'entre-fallas')).toContainText('bombas de agua')
  await expect(renglon(page, 'clasificacion')).toContainText('0 de 7')
  // Su Hoy se funde aquí, en una línea; las tarjetas a un toque.
  await expect(page.locator('main [data-le-toca]')).toContainText('Le tocan')
  // Sin los 12 filtros en la primera capa, sin «Qué está en riesgo» debajo (A-13) ni «Cambió hoy» (A-14).
  await expect(page.locator('main [data-mas-filtros]')).toHaveText(/Filtrar/)
  await expect(page.locator('main [data-mas-filtros-abiertos]')).toHaveCount(0)
  await expect(page.locator('main')).not.toContainText('Qué está en riesgo')
  await expect(page.locator('main [data-cambio-hoy]')).toHaveCount(0)
  // La lista va ordenada por «Si falla hoy»: P-201A y P-201C primero.
  const filas = await page.locator('main [data-fila-equipo]').evaluateAll(es => es.slice(0, 2).map(e => e.getAttribute('data-fila-equipo')))
  f.ok(filas.join(',') === 'P-201A,P-201C', `las dos primeras filas (${filas.join(', ')})`)
  // ¿Le creo al vigía?, a un toque, encima de Equipos.
  await renglon(page, 'vigia').click()
  await expect(page.locator('main [data-vigia-abierto]')).toBeVisible()
  // Abrir el primero, un toque.
  f.ok(await f.clic('Abrir P-201A'), '«Abrir P-201A»'); await f.esperar(500)
  f.ok((await f.hash()).startsWith('#/conf/equipos/ceiba/P-201A'), `abre su nivel 3 (${await f.hash()})`)
  f.cerrar()
})

test('el nivel 3 de P-201B con el kit SCADA: la barra, la tendencia y el esquema del tren de agua', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/conf/equipos/ceiba/P-201B')
  // Cada señal con la barra del kit (escala fija, banda y alarma) y su tendencia; parada: en gris y sin marca.
  const barras = page.locator('main [data-sus-senales] [data-kit="barra"]')
  f.ok(await barras.count() >= 5, `las señales con la barra del kit (${await barras.count()})`)
  await expect(barras.first()).toHaveAttribute('data-estado', 'parado')
  await expect(page.locator('main [data-sus-senales] [data-kit="tendencia"]').first()).toBeAttached()
  // El tren de agua con los símbolos del kit: la bomba que se mira, anormal (◆1 con su anillo); el tanque y los medidores.
  const esquema = page.locator('main [data-esquema-agua]')
  await expect(esquema.locator('[data-bomba-esquema="P-201B"] [data-kit="bomba"]')).toHaveAttribute('data-estado', 'anormal')
  await expect(esquema.locator('[data-kit="tanque"]')).toBeAttached()
  f.ok(await esquema.locator('[data-kit="medidor"]').count() === 3, 'PI, PDI y FI con el medidor del kit')
  // Los 12 días antes de parar, con la tendencia grande del kit.
  await expect(page.locator('main [data-dias-antes] [data-kit="tendencia"]').first()).toBeAttached()
  // El diagnóstico (nivel 4), a un toque.
  await page.locator('main [data-ver-diagnostico]').click(); await f.esperar(500)
  f.ok((await f.hash()).endsWith('/P-201B/diagnostico'), `el nivel 4 (${await f.hash()})`)
  f.cerrar()
})

test.describe('390 px', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  test('390 px: el número de cada rol a la vista sin desplazarse, su acción a un toque y nada se sale de lado', async ({ flujo: f }) => {
    const { page } = f
    const casos: Array<[string, string, string, string]> = [
      ['sup', '/#/sup/hoy/ceiba/curso', 'por-confirmar', 'Confirmar las 2'],
      ['tec', '/#/tec/hoy/ceiba/curso', 'cosas', 'Sello mecánico'],
      ['jefe', '/#/jefe/hoy/ceiba/curso', 'avisan', 'Ver la orden'],
      ['conf', '/#/conf/equipos/ceiba', 'si-falla-hoy', 'Abrir P-201A'],
    ]
    for (const [rol, ruta, id, accion] of casos) {
      await f.abrir(ruta)
      const r = await renglon(page, id).boundingBox()
      f.ok(!!r && r.y + r.height <= 844, `${rol}: su número se ve sin desplazarse (${r ? Math.round(r.y + r.height) : '—'} px)`)
      const b = page.locator('main').getByRole('button', { name: new RegExp(`^${accion}`) }).first()
      await expect(b, `${rol}: «${accion}» a un toque`).toBeVisible()
      f.ok(await sinDesborde(page), `${rol}: nada se sale de lado a 390 px`)
    }
    await f.abrir('/#/oper/hoy/ceiba/curso')
    const p = await page.locator('main [data-paso]').boundingBox()
    f.ok(!!p && p.y < 400, 'oper: «Pregunta 1 de 4» arriba')
    await expect(page.locator('main [data-operador="pregunta"] [data-opcion="Sello mecánico"]')).toBeVisible()
    f.ok(await sinDesborde(page), 'oper: nada se sale de lado a 390 px')
    // En el teléfono el panel se abre con ☰ y no hay barra abajo; con una sola puerta, sin lista de puertas.
    f.ok(await f.clic('Abrir la navegación'), 'el ☰ abre el panel'); await f.esperar(400)
    f.ok(await page.locator('[role=dialog][aria-label="Navegación"] [role=group][aria-label="Puertas"] button').count() === 0, 'oper: sin menú de puertas')
    f.cerrar()
  })
})
