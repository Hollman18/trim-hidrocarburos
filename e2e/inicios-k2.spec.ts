/* K2 · Los inicios de cada rol en el teléfono (PROMPT-REVISION-UX §4 y §6.1; X4 §3.4; D-1).
   A 390 × 844, cada inicio dice su frase, su cifra grande y lo que la explica, y lo demás
   queda a un toque. Aquí se prueba lo que ve la persona en el teléfono y que, en el
   escritorio, lo mismo sigue entero (ninguna función se pierde):
   - Hoy: sin las horas de las tarjetas que no deciden (la del lote, la del escalamiento, la
     de la orden), «Sigue parada» no repite la franja y el jefe nombra las otras paradas;
   - La planta viva de producción: la cifra grande es lo que sale hoy y el dibujo no la repite;
   - Regulatorio: la fila no repite quién lo debe ni lo que falta cuando es igual para todas;
   - Equipos de confiabilidad: la cabeza no repite la cifra grande en sus filas, el colchón
     va a la ⓘ y los filtros se pliegan en «Filtrar»;
   - Configurar del administrador: cada paso en una o dos palabras y los otros campos a un toque.
   El presupuesto de palabras y cifras de cada inicio lo mide el auditor («inicio de cada rol · 390 px»). */
import { expect, type Locator } from '@playwright/test'
import { test } from './apoyo.ts'

const TELEFONO = { width: 390, height: 844 }
const ESCRITORIO = { width: 1280, height: 900 }
/** Lo que se ve (innerText: sin lo que el teléfono esconde), en un renglón. */
const seVe = async (l: Locator) => (await l.innerText()).replace(/\s+/g, ' ')

// «390 px» en el nombre: también corren en Safari de teléfono (el proyecto «iphone»).
test.describe('inicios en el teléfono · 390 px', () => {

  // B3 · Experiencia v3 (§14): el número arriba, tipo número; quien no la debe ve la tarjeta en una
  // línea (FF-2) y la orden de K-101 no es del supervisor (A-24).
  test('Hoy · supervisor en el teléfono: el número arriba y las tarjetas sin las horas que no deciden; en el escritorio, enteras', async ({ flujo: f }) => {
    const { page } = f
    await page.setViewportSize(TELEFONO)
    await f.abrir('/#/sup/hoy/ceiba/curso')
    await expect(page.locator('main [data-renglon="por-confirmar"] [data-cifra]')).toHaveText('4')
    const lote = await seVe(page.locator('main [data-tarea="confirmar"]').first())
    f.ok(lote.includes('cerró LC-07 y LC-16') && !/\d{2}:\d{2}/.test(lote), `el lote dice qué cerró, sin la hora («${lote}»)`)
    const causa = await seVe(page.locator('main [data-tarea="conseguir-causa"]'))
    f.ok(causa.includes('Conseguir la causa de 2 paradas') && causa.includes('Contestar yo') && !/20:20|01:10|desde que pararon/.test(causa),
      `conseguir la causa en una línea: cuáles ya lo dice «Sin causa» arriba («${causa}»)`)
    await expect(page.locator('main [data-renglon="sin-causa"]')).toContainText('LC-21 y LC-08')
    await expect(page.locator('main [data-tarea="orden"]')).toHaveCount(0)
    await page.setViewportSize(ESCRITORIO)
    await expect(page.locator('main [data-tarea="confirmar"]').first()).toContainText('cerró LC-07 y LC-16 · 05:43', { useInnerText: true })
    f.cerrar()
  })

  test('Hoy · técnico y jefe en el teléfono: el número arriba, el momento en palabras y la línea de quien no la debe', async ({ flujo: f }) => {
    const { page } = f
    await page.setViewportSize(TELEFONO)
    await f.abrir('/#/tec/hoy/ceiba/curso')
    await expect(page.locator('main [data-renglon="cosas"]')).toContainText('5')
    await expect(page.locator('main [data-renglon="no-arrancar"]')).toContainText('P-201B y LC-21')
    const p201b = await seVe(page.locator('main [data-tarea="contestar"]').first())
    f.ok(p201b.includes('bomba de agua · paró hoy en la madrugada') && !p201b.includes('Sigue parada') && !/03:52|hace 10,1/.test(p201b),
      `la tarjeta de P-201B: el momento en palabras y sin repetir la franja («${p201b}»)`)
    await page.setViewportSize(ESCRITORIO)
    const entera = await seVe(page.locator('main [data-tarea="contestar"]').first())
    f.ok(entera.includes('paró hoy a las 03:52, hace 10,1 h') && entera.includes('Sigue parada.'), `en el escritorio, entera («${entera}»)`)

    await page.setViewportSize(TELEFONO)
    await f.abrir('/#/jefe/hoy/ceiba/curso')
    await expect(page.locator('main [data-renglon="espera"]')).toContainText('7,7 de 8,1')
    const jefe = await seVe(page.locator('main [data-tarea="conseguir-causa"]'))
    f.ok(jefe.includes('Conseguir la causa de 3 paradas') && jefe.includes('Contestar yo') && !/05:52|01:10|928/.test(jefe),
      `el jefe: la tarjeta en una línea; cuáles, en «Por identificar» («${jefe}»)`)
    await expect(page.locator('main [data-renglon="por-identificar"]')).toContainText('P-201B, LC-21 y LC-08')
    f.cerrar()
  })

  // v3 (imagen d1-grafito-prod en el teléfono): la cifra «de 11.857» arriba y la tubería de pie con lo que dan, caben y salen.
  test('La planta viva · producción en el teléfono: la cifra contra lo que dan los pozos y la tubería de pie', async ({ flujo: f }) => {
    const { page } = f
    await page.setViewportSize(TELEFONO)
    await f.abrir('/#/prod/planta-viva/ceiba/curso')
    await expect(page.locator('[data-produccion-cifra]')).toHaveAttribute('data-produccion-cifra', '9394')
    await expect(page.locator('[data-produccion-cifra]')).toContainText('de 11.857 bbl/d')
    f.ok(await page.locator('[data-tuberia-kit][data-de-pie]').count() === 1, 'la tubería, de pie en el teléfono')
    const salida = (await page.locator('[data-tramo-kit="exportacion"]').innerText()).replace(/\s+/g, ' ')
    f.ok(/9\.394 salen hoy/.test(salida), `la salida dice lo que sale hoy, como la imagen («${salida}»)`)
    // El gerente: su número es lo que se deja de producir; su tubería dice lo que no pasa por cada tramo.
    await f.abrir('/#/ger/planta-viva/ceiba/curso')
    await expect(page.locator('[data-tramo-kit="planta"]')).toContainText('1.665')
    await expect(page.locator('[data-tramo-kit="planta"]')).toContainText('bbl/d no pasan')
    f.cerrar()
  })

  // v3 (imagen d1-grafito-reg): la cifra ya no lleva la explicación «Las contesta…»; quién lo debe va UNA vez, en cada fila.
  test('Regulatorio en el teléfono: quién lo debe una sola vez, en su fila; el árbol plegado', async ({ flujo: f }) => {
    const { page } = f
    await page.setViewportSize(TELEFONO)
    await f.abrir('/#/reg/regulatorio/ceiba/curso')
    const cabeza = page.locator('[data-reporte-anh]')
    // B4 (v3, necesario-por-rol §14: «Sin causa 2 paradas · no se puede publicar»): a la vista, el título; el porqué del motor,
    // la Circular 024 y lo de solo lectura, en UNA ⓘ al lado. «No se puede reportar» ya no repite lo mismo debajo de los 355 bbl.
    await expect(cabeza.locator('[data-frase]')).toHaveText(/^No se puede publicar todavía\s*$/, { useInnerText: true })
    // v3: el rótulo de la cifra («Paradas sin causa») ya no repite el título ni el período; la ⓘ va con la frase.
    f.ok(!(await cabeza.innerText()).includes('Reporte a la ANH · octubre'), 'sin el previo «Reporte a la ANH · octubre» (lo dice la cabecera)')
    await expect(cabeza.getByRole('img', { name: /^No se puede publicar todavía: No se puede publicar todavía: octubre sigue abierto y les falta la causa \(355 bbl\)\. El límite es el de la Circular 024\. Solo lectura: TRIM lee los puntos de medición/ })).toBeVisible()
    f.ok(!/no se puede reportar|Circular 024/.test(await cabeza.innerText()), 'ni «no se puede reportar» ni «Circular 024» a la vista (en la ⓘ)')
    // El árbol, plegado: su título, sus códigos y su total, que lo abre.
    const arbol = page.locator('[data-arbol-circular]')
    await expect(arbol.getByRole('button', { name: 'Ver el árbol: 1.046 bbl' })).toBeVisible()
    f.ok(!(await seVe(arbol)).includes('Quién'), 'las ramas no van en la primera pantalla')
    await arbol.getByRole('button', { name: /^Ver el árbol/ }).click()
    await expect(arbol).toContainText('el diferido del libro', { useInnerText: true })
    const filas = page.locator('[data-parada-sin-causa]')
    await expect(filas).toHaveCount(2)
    // B4 (§14: «LC-21 · 247 bbl · lo debe el operador»): cada fila, el equipo, sus barriles y quién lo debe; la hora límite, una
    // vez, en «Límite» (es la misma para las dos); qué falta, al abrir la fila.
    for (const i of [0, 1]) {
      const visto = (await filas.nth(i).innerText()).replace(/\s+/g, ' ').trim()
      f.ok(/^LC-(21|08) Lo debe el operador de campo (247|108) bbl$/.test(visto), `la fila ${i + 1} dice el equipo, quién lo debe y sus barriles («${visto}»)`)
    }
    f.ok(/07:00\s+mañana/.test(await page.locator('[data-limite]').innerText()), 'la hora límite, una vez, en «Límite»')
    const veces = ((await page.locator('main').innerText()).match(/Lo debe el operador/g) ?? []).length
    f.ok(veces === 2 && await cabeza.locator('[data-explica]').count() === 0, `quién lo debe, una vez por fila y no en la cifra (${veces})`)
    f.cerrar()
  })

  test('Equipos · confiabilidad en el teléfono: el primero de «Si falla hoy» tipo número, sin repetirlo en la lista de arriba; los filtros en «Filtrar»', async ({ flujo: f }) => {
    const { page } = f
    await page.setViewportSize(TELEFONO)
    await f.abrir('/#/conf/equipos/ceiba')
    const cabeza = page.locator('main [data-cifras]').first()
    await expect(cabeza.locator('[data-renglon="si-falla-hoy"] [data-cifra]')).toHaveText('3.059')
    // B3 · la cabeza ya no repite los tres primeros como un bloque aparte (FF-8): son las primeras filas de la lista.
    await expect(page.locator('[data-fila-primero]')).toHaveCount(0)
    await expect(cabeza.locator('[data-renglon="vigia"]')).toContainText('3 de 3')
    // Los filtros, plegados: también el estado detrás de «Filtrar».
    const filtrar = page.locator('[data-mas-filtros]')
    await expect(filtrar).toHaveText(/^Filtrar/)
    await expect(page.getByRole('radio', { name: /^Parados/ })).toHaveCount(0)
    await filtrar.click()
    await page.getByRole('radio', { name: /^Parados/ }).click()
    await expect(filtrar).toHaveText(/^Filtrar\s*\(1\)/)
    await expect(page.locator('main [data-fila-equipo="P-201B"]')).toBeVisible()
    // «Sin instrumento 5» filtra la lista en un toque.
    await cabeza.locator('[data-renglon="sin-instrumento"]').click()
    await expect(page.locator('main section[aria-label^="Equipos: 5"]')).toBeVisible()
    await page.setViewportSize(ESCRITORIO)
    await expect(page.locator('[data-mas-filtros]')).toHaveText(/^Filtrar/)
    f.cerrar()
  })

  test('Configurar · administrador en el teléfono: cada paso en una o dos palabras y los otros campos a un toque', async ({ flujo: f }) => {
    const { page } = f
    await page.setViewportSize(TELEFONO)
    await f.abrir('/#/adm/configuracion/ceiba/curso')
    const estado = page.locator('[data-estado-config]')
    await expect(estado.locator('[data-cifra]')).toContainText(/3\s*de 6 pasos listos/)
    const pasos = await estado.locator('[data-paso]').evaluateAll(es => es.map(e => (e as HTMLElement).innerText.replace(/\s+/g, ' ').trim()))
    f.ok(pasos.join(' | ') === 'Perfil del campo firmado | Tanques de agua completos | A qué pozos sirve cada equipo sin firmar | Lo que deja pasar cada tramo sin firmar | Factor de medición sin firmar | Meta de hoy firmada por el gerente',
      `cada paso, su nombre y su estado (${pasos.join(' | ')})`)
    // El detalle entero sigue en el nombre del paso, a un toque de su editor.
    await expect(estado.locator('[data-paso="topologia"]')).toHaveAttribute('aria-label', /faltan \d+ equipos por confirmar y firmar/)
    const otros = page.locator('[data-otros-campos]')
    f.ok(!(await seVe(otros)).includes('Morichal Norte'), 'los otros campos no van en la primera pantalla')
    await otros.locator('[data-ver-otros]').click()
    await expect(otros).toContainText('Morichal Norte · 3 de 6', { useInnerText: true })
    await page.setViewportSize(ESCRITORIO)
    await expect(estado.locator('[data-paso="topologia"]')).toContainText('TRIM la deduce del registro', { useInnerText: true })
    f.cerrar()
  })
})
