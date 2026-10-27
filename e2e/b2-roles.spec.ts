/* Experiencia v3 · B2: los inicios de ger, prod, reg y adm (necesario-por-rol §1, §2, §10, §11 y §14).
   De cada rol: su número (del motor), la acción principal a 1 toque, el balance producido · diferido ·
   perdido que cuadra (el de cada tramo suma el total, el perdido nunca se suma al diferido), la
   trazabilidad a un toque (tramo → diferida → planeada → N1 → N2 → la parada) y el teléfono (390 px)
   sin desplazarse de lado. Las cifras se leen de los `data-*`: aquí se comprueba la cuenta. */
import { expect, type Page } from '@playwright/test'
import { test } from './apoyo.ts'

/** El balance que pinta la pantalla: el total y el de cada tramo. */
const balance = (page: Page, cual = 0) => page.evaluate(i => {
  const b = document.querySelectorAll('[data-balance]')[i]
  if (!b) return null
  const num = (v: string | null) => (v === null || v === '' || v === 'sin-registro' ? null : Number(v))
  const tramos = [...b.querySelectorAll('[data-tramo-balance]')].map(t => ({
    tramo: t.getAttribute('data-tramo-balance'),
    diferido: Number((t.querySelectorAll('td')[0]?.textContent ?? '').replace(/\D/g, '')),
    perdido: (t.querySelectorAll('td')[1]?.textContent ?? '').trim(),
  }))
  return { producido: num(b.getAttribute('data-producido')), diferido: Number(b.getAttribute('data-diferido')), perdido: b.getAttribute('data-perdido'), tramos }
}, cual)

/** Sin desplazarse de lado: la página no es más ancha que la ventana. */
const sinDesborde = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)

test.describe('ger · Gerente de activo', () => {
  test('el número, Ver P-201B a 1 toque, el balance cuadra y la trazabilidad · 1440 px', async ({ page, flujo }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await flujo.abrir('/#/ger/planta-viva/ceiba~portafolio/curso')
    const cifra = page.locator('[data-gerente-cifra]')
    await expect(cifra).toBeVisible()
    flujo.ok(Number(await cifra.getAttribute('data-gerente-cifra')) === 2650, 'se dejan de producir 2.650 bbl/d en los 5 campos (el motor)')
    flujo.ok(await page.getByText('Se deja de producir ahora').isVisible(), 'el rótulo del número principal')
    // Opción A: sin el control Antes · Durante · Después.
    flujo.ok(await page.locator('[role=radiogroup][aria-label="Momento"]').count() === 0, 'sin el control de momentos (opción A)')
    // Los de apoyo: producción y cierre proyectado (con su palabra).
    flujo.ok(await page.locator('[data-produccion]').isVisible(), 'la producción por día contra la meta')
    flujo.ok((await page.locator('[data-cierre]').innerText()).includes('proyectado'), 'el cierre del mes dice «proyectado»')
    // Una fila por campo: La Ceiba y Morichal con su equipo; los demás en una línea.
    const campos = await page.locator('[data-por-campo] [data-campo]').evaluateAll(xs => xs.map(x => x.getAttribute('data-campo')))
    flujo.ok(campos[0] === 'ceiba' && campos[1] === 'morichal', `una fila por campo, de la que más pesa (${campos.join(', ')})`)
    // El balance: el diferido de los tramos suma el total; el perdido va aparte, «sin registro».
    const b = await balance(page)
    flujo.ok(!!b && b.diferido === 2376, `diferido del mes 2.376 (${b?.diferido})`)
    flujo.ok(!!b && b.tramos.reduce((a, t) => a + t.diferido, 0) === b.diferido, 'el diferido de los tramos suma el del mes')
    flujo.ok(b?.perdido === 'sin-registro', 'el perdido dice «sin registro», nunca 0')
    flujo.ok(await page.locator('[data-funcionando]').isVisible(), '«¿Está funcionando?» en el inicio')
    // La trazabilidad: un tramo abre su árbol hasta la parada.
    await page.locator('[data-tramo-balance="planta"] button').click()
    const traza = page.locator('[data-traza="planta"]')
    await expect(traza).toBeVisible()
    flujo.ok(Number(await traza.locator('[data-traza-diferida]').getAttribute('data-traza-diferida')) === 573, 'la planta: 573 bbl diferidos')
    const paradas = await traza.locator('[data-parada-balance]').evaluateAll(xs => xs.map(x => [x.getAttribute('data-parada-balance'), Number(x.getAttribute('data-bbl'))] as const))
    flujo.ok(paradas.reduce((a, [, v]) => a + v, 0) === 573 && paradas.some(([p]) => p === 'LC-16'), `sus paradas suman 573 (${paradas.map(p => p.join(' ')).join(', ')})`)
    flujo.ok((await traza.innerText()).includes('No planeada'), 'el árbol dice si fue planeada')
    await page.keyboard.press('Escape')
    await expect(traza).toHaveCount(0)
    // La acción principal: 1 toque abre P-201B.
    await page.locator('[data-ver-que-se-hace="P-201B"]').click()
    await expect(page.getByRole('dialog').filter({ hasText: 'P-201B' }).first()).toBeVisible()
    flujo.cerrar()
  })

  test('un campo: la tubería de 4 tramos con el kit, el tramo abre su hoja · 1440 px', async ({ page, flujo }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await flujo.abrir('/#/ger/planta-viva/ceiba/curso')
    flujo.ok(Number(await page.locator('[data-gerente-cifra]').getAttribute('data-gerente-cifra')) === 1966, '1.966 bbl/d en La Ceiba')
    const tramos = await page.locator('[data-tuberia-kit]').getAttribute('data-tuberia-kit')
    flujo.ok(tramos === 'reservorio,pozo,planta,exportacion', `los 4 tramos del choke (${tramos})`)
    flujo.ok(await page.locator('[data-tuberia-kit] [data-kit="area"]').count() === 4, 'cada tramo es un área del kit SCADA')
    await page.locator('[data-tramo-kit="planta"]').click()
    await expect(page.locator('[data-hoja-tramo="planta"], [role=dialog]').first()).toBeVisible()
    flujo.cerrar()
  })

  test('390 px: el número sin desplazarse y nada se sale de lado', async ({ page, flujo }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await flujo.abrir('/#/ger/planta-viva/ceiba~portafolio/curso')
    await expect(page.locator('[data-gerente-cifra]')).toBeInViewport()
    flujo.ok(await sinDesborde(page), 'sin desplazamiento de lado a 390 px')
    flujo.ok(await page.locator('[data-ver-que-se-hace="P-201B"]').isVisible(), 'Ver P-201B a la vista')
    flujo.cerrar()
  })
})

test.describe('prod · Ingeniera de producción', () => {
  test('el choke, Confirmar las 2 a 1 toque con Deshacer, y una pérdida que va aparte · 1440 px', async ({ page, flujo }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await flujo.abrir('/#/prod/planta-viva/ceiba/curso')
    const cifra = page.locator('[data-produccion-cifra]')
    await expect(cifra).toBeVisible()
    flujo.ok(Number(await cifra.getAttribute('data-produccion-cifra')) === 9394, 'salen hoy 9.394 bbl/d')
    flujo.ok((await cifra.innerText()).includes('de 11.857'), 'contra lo que dan los pozos: 11.857')
    flujo.ok((await page.locator('[data-tramo-kit="pozo"]').innerText()).includes('limita'), 'el tramo que limita: los pozos')
    // Las paradas por confirmar con su cadena.
    flujo.ok(Number(await page.locator('[data-por-confirmar]').getAttribute('data-por-confirmar')) === 4, '4 paradas por confirmar')
    const cadena = await page.locator('[data-grupo-confirmar="LC-07,LC-16"] [data-cadena]').innerText()
    flujo.ok(/Planta · diferida · no planeada/.test(cadena), `la cadena del grupo: tramo, diferida y planeada (${cadena})`)
    flujo.ok(Number(await page.locator('[data-esperan-causa]').getAttribute('data-esperan-causa')) === 2, 'las otras 2 esperan su causa')
    // Confirmar en lote, 1 toque, y Deshacer.
    await page.locator('[data-confirmar-lote="LC-07,LC-16"]').first().click()
    await expect(page.locator('[data-confirmadas]')).toContainText('Confirmadas LC-07 y LC-16')
    await expect(page.locator('[data-por-confirmar]')).toHaveAttribute('data-por-confirmar', '2')
    await page.locator('[data-confirmadas]').getByRole('button', { name: 'Deshacer' }).click()
    await expect(page.locator('[data-por-confirmar]')).toHaveAttribute('data-por-confirmar', '4')
    // El balance antes de la pérdida.
    const antes = await balance(page)
    flujo.ok(antes?.diferido === 1046 && antes.perdido === 'sin-registro', `diferido 1.046 y perdido sin registro (${antes?.diferido}, ${antes?.perdido})`)
    flujo.ok(!!antes && antes.tramos.reduce((a, t) => a + t.diferido, 0) === antes.diferido, 'el diferido de los tramos suma el del mes')
    // Registrar una pérdida: botones y volumen; queda como pérdida en su tramo, nunca sumada al diferido.
    await page.locator('[data-registrar-una-perdida]').click()
    const hoja = page.locator('[data-registrar-perdida]')
    await hoja.locator('[data-tipo-perdida="pitera"]').click()
    await hoja.locator('[data-tramo-perdida="pozo"]').click()
    await hoja.getByLabel('¿Dónde? El equipo o el punto').fill('Línea de flujo de LC-07')
    await hoja.locator('[data-bbl-perdida]').fill('12')
    await hoja.getByRole('button', { name: 'Estimado' }).click()
    await hoja.getByLabel('Cómo lo midió o lo estimó').fill('Mancha de 3 m por 2 m, aforo de la operadora')
    await hoja.locator('[data-enviar-perdida]').click()
    await expect(hoja.locator('[data-perdida-registrada]')).toBeVisible()
    await hoja.getByRole('button', { name: 'Listo' }).click()
    const despues = await balance(page)
    flujo.ok(despues?.perdido === '12', `el perdido: 12 bbl (${despues?.perdido})`)
    flujo.ok(despues?.diferido === 1046, 'el diferido no cambia: la pérdida nunca se le suma')
    flujo.ok(despues?.tramos.find(t => t.tramo === 'pozo')?.perdido.startsWith('12') ?? false, 'la pérdida, en su tramo (pozos)')
    // Su trazabilidad: la pérdida con quién la registró.
    await page.locator('[data-tramo-balance="pozo"] button').click()
    const traza = page.locator('[data-traza="pozo"]')
    flujo.ok((await traza.locator('[data-perdida-registro]').innerText()).includes('Pitera'), 'la pérdida en el árbol del tramo, con su tipo')
    flujo.ok((await traza.locator('[data-perdida-registro]').innerText()).includes('Marcela'), 'con quién la registró')
    flujo.cerrar()
  })

  test('390 px: el número y Confirmar sin desplazarse de lado', async ({ page, flujo }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await flujo.abrir('/#/prod/planta-viva/ceiba/curso')
    await expect(page.locator('[data-produccion-cifra]')).toBeInViewport()
    flujo.ok(await sinDesborde(page), 'sin desplazamiento de lado a 390 px')
    flujo.ok(await page.locator('[data-confirmar-lote]').first().isVisible(), '«Confirmar las 2» a la vista')
    flujo.cerrar()
  })
})

test.describe('reg · Cumplimiento regulatorio', () => {
  test('sin causa, quién lo debe, exportar a 1 toque, la respuesta de la ANH y el balance · 1440 px', async ({ page, flujo }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await flujo.abrir('/#/reg/regulatorio/ceiba/curso')
    const r = page.locator('[data-reporte-anh]')
    flujo.ok(Number(await r.getAttribute('data-valor')) === 2 && Number(await r.getAttribute('data-bbl')) === 355, '2 paradas sin causa, 355 bbl')
    const filas = await page.locator('[data-parada-sin-causa]').evaluateAll(xs => xs.map(x => [x.getAttribute('data-parada-sin-causa'), Number(x.getAttribute('data-bbl'))] as const))
    flujo.ok(filas.length === 2 && filas.reduce((a, [, v]) => a + v, 0) === 355, `una fila por parada, suman 355 (${filas.map(f => f.join(' ')).join(', ')})`)
    flujo.ok((await page.locator('[data-debe]').first().innerText()).includes('Lo debe el operador de campo'), 'quién la debe')
    flujo.ok((await page.locator('[data-limite]').innerText()).includes('07:00'), 'la hora límite: 07:00')
    // La respuesta de la ANH: sin nada, lo dice; registrada a mano, rechazo con lo que queda de la hora.
    flujo.ok((await page.locator('[data-respuesta-anh]').getAttribute('data-respuesta-anh')) === 'sin-respuesta', 'ANH: sin respuesta registrada')
    await page.locator('[data-registrar-respuesta]').click()
    await page.locator('[data-estado-anh="rechazado"]').click()
    await page.locator('[data-motivo-anh]').selectOption('V-09')
    await page.locator('[data-guardar-respuesta]').click()
    await expect(page.locator('[data-respuesta-anh]')).toHaveAttribute('data-respuesta-anh', 'rechazado')
    flujo.ok(/quedan[\s\S]*min/.test(await page.locator('[data-respuesta-anh]').innerText()), 'el rechazo dice cuánto queda de la hora')
    // El balance con sus pérdidas y el árbol de 6 pasos.
    const b = await balance(page)
    flujo.ok(b?.diferido === 1046 && b.perdido === 'sin-registro', 'el balance del campo: 1.046 diferidos, perdido sin registro')
    flujo.ok(await page.locator('[data-arbol-circular]').count() === 1, 'el árbol de 6 pasos, como la circular')
    flujo.ok(await page.locator('[data-perdida-arbol]').count() === 1, 'la pérdida se dice una vez, no en cada rama (A-25)')
    // Exportar: 1 toque, un archivo.
    const descarga = page.waitForEvent('download')
    await page.locator('[data-exportar-reporte]').click()
    flujo.ok(/\.csv$/.test((await descarga).suggestedFilename()), 'exportar el reporte da el CSV para la ANH')
    flujo.cerrar()
  })

  test('390 px: el número sin desplazarse y nada se sale', async ({ page, flujo }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await flujo.abrir('/#/reg/regulatorio/ceiba/curso')
    await expect(page.locator('[data-reporte-anh] [data-cifra-grande]')).toBeInViewport()
    flujo.ok(await sinDesborde(page), 'sin desplazamiento de lado a 390 px')
    flujo.cerrar()
  })
})

test.describe('adm · Administrador de la implementación', () => {
  test('3 de 6, Seguir el paso a 1 toque, la conversión del árbol y la jornada firmadas · 1440 px', async ({ page, flujo }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await flujo.abrir('/#/adm/configuracion/ceiba/curso')
    flujo.ok(/3\s*de 6 pasos listos/.test(await page.locator('[data-estado-config]').innerText()), '3 de 6 pasos listos')
    flujo.ok((await page.locator('[data-paso="topologia"]').innerText()).includes('36 equipos por confirmar'), 'los equipos por confirmar: 36')
    // La jornada: por defecto sin firmar → firmada.
    flujo.ok((await page.locator('[data-jornada]').getAttribute('data-jornada')) === 'por-defecto', 'la jornada, por defecto y sin firmar')
    await page.locator('[data-cambiar-jornada]').click()
    await page.locator('[data-turno="0"]').fill('05:00')
    await page.locator('[data-turno="1"]').fill('17:00')
    await page.getByRole('form', { name: 'La jornada del campo' }).getByLabel('Motivo · obligatorio').fill('Horario acordado con el supervisor de La Ceiba')
    await page.locator('[data-firmar-jornada]').click()
    await expect(page.locator('[data-jornada]')).toHaveAttribute('data-jornada', 'firmada')
    flujo.ok((await page.locator('[data-jornada]').innerText()).includes('05:00 y 17:00'), 'la jornada firmada: 05:00 y 17:00')
    // La conversión del árbol: importar (pegar), ver lo leído y firmar.
    flujo.ok(Number(await page.locator('[data-conversion]').getAttribute('data-conversion')) === 0, 'sin tabla firmada al empezar')
    await page.locator('[data-importar-conversion]').click()
    await page.locator('[data-pegar-conversion]').fill('F-ESP-01; Falla de la bomba electrosumergible; No planeada - Mecánica subsuelo; FALLA ESP\nF-XX-02; Código sin equivalencia todavía;;')
    await page.locator('[data-leer-conversion]').click()
    await expect(page.locator('[data-leida]')).toBeVisible()
    await page.locator('[data-leida]').getByLabel('Motivo · obligatorio').fill('Tabla de equivalencias revisada con confiabilidad')
    await page.locator('[data-firmar-conversion]').click()
    await expect(page.locator('[data-conversion]')).not.toHaveAttribute('data-conversion', '0')
    flujo.ok(Number(await page.locator('[data-conversion]').getAttribute('data-sin-equivalencia')) >= 1, 'lo que no tiene equivalencia se ve aparte, sin una por defecto')
    // La acción principal: seguir el paso que falta (a qué pozos sirve cada equipo).
    await page.locator('[data-seguir-paso="topologia"]').click()
    await flujo.esperarTexto('Filosofía operacional')
    flujo.cerrar()
  })

  test('390 px: el número sin desplazarse y nada se sale', async ({ page, flujo }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await flujo.abrir('/#/adm/configuracion/ceiba/curso')
    await expect(page.locator('[data-estado-config] [data-cifra]')).toBeInViewport()
    flujo.ok(await sinDesborde(page), 'sin desplazamiento de lado a 390 px')
    flujo.cerrar()
  })
})
