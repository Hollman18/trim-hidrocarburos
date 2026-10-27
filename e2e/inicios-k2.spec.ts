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

  test('Hoy · supervisor en el teléfono: las tarjetas sin las horas que no deciden; en el escritorio, enteras', async ({ flujo: f }) => {
    const { page } = f
    await page.setViewportSize(TELEFONO)
    await f.abrir('/#/sup/hoy/ceiba/curso')
    await f.esperarTexto('se dejan de producir.')
    const lote = await seVe(page.locator('main [data-tarea="confirmar"]').first())
    f.ok(lote.includes('cerró LC-07 y LC-16') && !/\d{2}:\d{2}/.test(lote), `el lote dice qué cerró, sin la hora («${lote}»)`)
    const causa = await seVe(page.locator('main [data-tarea="conseguir-causa"]'))
    f.ok(causa.includes('LC-21 lleva 19,7 h sin causa') && causa.includes('LC-08 arrancó sin identificar · Entre las 2: 219 bbl hoy')
      && !/20:20|01:10|desde que pararon/.test(causa), `conseguir la causa: cuánto lleva y lo de hoy, sin la hora del escalamiento ni el acumulado («${causa}»)`)
    const orden = await seVe(page.locator('main [data-tarea="orden"]'))
    f.ok(orden.includes('Si para, hasta 9.394 bbl/d.') && !/40012056|Óscar Daza|09:10/.test(orden) && orden.includes('Ver la orden'),
      `la orden: lo que pasa si para; su número, a quién y la hora, a un toque en «Ver la orden» («${orden}»)`)

    await page.setViewportSize(ESCRITORIO)
    await expect(page.locator('main [data-tarea="confirmar"]').first()).toContainText('cerró LC-07 y LC-16 · 05:43', { useInnerText: true })
    await expect(page.locator('main [data-tarea="conseguir-causa"]')).toContainText('355 desde que pararon', { useInnerText: true })
    await expect(page.locator('main [data-tarea="orden"]')).toContainText('Orden 40012056, liberada a Óscar Daza a las 09:10.', { useInnerText: true })
    f.cerrar()
  })

  test('Hoy · técnico y jefe en el teléfono: «Sigue parada» no repite la franja, el momento en palabras y las otras por su nombre', async ({ flujo: f }) => {
    const { page } = f
    await page.setViewportSize(TELEFONO)
    await f.abrir('/#/tec/hoy/ceiba/curso')
    await f.esperarTexto('cosas le tocan hoy')
    await expect(page.locator('main [data-bloqueo]').first()).toContainText('No arrancar P-201B ni LC-21')
    const p201b = await seVe(page.locator('main [data-tarea="contestar"]').first())
    f.ok(p201b.includes('bomba de agua · paró hoy en la madrugada') && !p201b.includes('Sigue parada') && !/03:52|hace 10,1/.test(p201b),
      `la tarjeta de P-201B: el momento en palabras y sin repetir la franja («${p201b}»)`)
    await page.setViewportSize(ESCRITORIO)
    const entera = await seVe(page.locator('main [data-tarea="contestar"]').first())
    f.ok(entera.includes('paró hoy a las 03:52, hace 10,1 h') && entera.includes('Sigue parada.'), `en el escritorio, entera («${entera}»)`)

    await page.setViewportSize(TELEFONO)
    await f.abrir('/#/jefe/hoy/ceiba/curso')
    await f.esperarTexto('días son espera')
    const jefe = await seVe(page.locator('main [data-tarea="conseguir-causa"]'))
    f.ok(jefe.includes('P-201B lleva 10,1 h sin causa') && jefe.includes('Entre todas: 219 bbl hoy')
      && !/05:52|01:10|928/.test(jefe), `el jefe: la primera con su tiempo y lo de hoy entre todas («${jefe}»)`)
    // Su franja, en el teléfono: el «no» y a quién; hasta cuándo, en la ⓘ. En el escritorio, entera.
    const franja = page.locator('main [data-bloqueo]').first()
    f.ok((await seVe(franja)) === 'No arrancar P-201B ni LC-21', `la franja del jefe en el teléfono («${await seVe(franja)}»)`)
    await expect(franja.getByRole('img', { name: /Hasta identificar qué se dañó/ })).toBeVisible()
    await page.setViewportSize(ESCRITORIO)
    await expect(franja).toContainText('No arrancar P-201B ni LC-21 hasta identificar qué se dañó', { useInnerText: true })
    f.cerrar()
  })

  test('La planta viva · producción en el teléfono: el dibujo no repite la cifra grande', async ({ flujo: f }) => {
    const { page } = f
    await page.setViewportSize(TELEFONO)
    await f.abrir('/#/prod/planta-viva/ceiba/curso')
    await expect(page.locator('[data-cifra-grande] [data-cifra]').first()).toHaveText('9.394')
    const venta = (await page.locator('[data-tuberia="de-pie"] [data-venta]').textContent() ?? '').replace(/\s+/g, ' ').trim()
    f.ok(venta === 'Sale hoy · meta 10.900', `la salida dice «Sale hoy · meta», sin repetir 9.394 («${venta}»)`)
    // El gerente no tiene la cifra de lo que sale hoy arriba: su dibujo la lleva (la imagen 2).
    await f.abrir('/#/ger/planta-viva/ceiba/curso')
    await expect(page.locator('[data-tuberia="de-pie"] [data-venta]')).toContainText('Sale hoy 9.394 bbl/d')
    f.cerrar()
  })

  test('Regulatorio en el teléfono: la fila no repite quién lo debe ni lo que falta; queda para el lector', async ({ flujo: f }) => {
    const { page } = f
    await page.setViewportSize(TELEFONO)
    await f.abrir('/#/reg/regulatorio/ceiba/curso')
    const cabeza = page.locator('[data-reporte-anh]')
    await expect(cabeza.locator('[data-frase]')).toHaveText('No se puede publicar todavía: octubre sigue abierto y les falta la causa (355 bbl).')
    // «Reporte a la ANH · octubre» repite el título y el período de la cabecera: en el teléfono va al lector, con su ⓘ junto a la cifra.
    const previo = await cabeza.locator('[data-cifra-grande] > p').first().evaluate(e => { const s = e.querySelector('span'); return s ? getComputedStyle(s).position === 'absolute' && s.getBoundingClientRect().width <= 1 : false })
    f.ok(previo, 'el previo «Reporte a la ANH · octubre» no se ve en el teléfono')
    await expect(cabeza.getByRole('img', { name: /^Solo lectura: TRIM lee los puntos de medición/ }).first()).toBeVisible()
    // El árbol, plegado: su título, sus códigos y su total, que lo abre.
    const arbol = page.locator('[data-arbol-circular]')
    await expect(arbol.getByRole('button', { name: 'Ver el árbol: 1.046 bbl' })).toBeVisible()
    f.ok(!(await seVe(arbol)).includes('Quién'), 'las ramas no van en la primera pantalla')
    await arbol.getByRole('button', { name: /^Ver el árbol/ }).click()
    await expect(arbol).toContainText('el diferido del libro', { useInnerText: true })
    const filas = page.locator('[data-parada-sin-causa]')
    await expect(filas).toHaveCount(2)
    for (const i of [0, 1]) {
      const fila = filas.nth(i)
      const visto = await fila.evaluate(e => [...e.querySelectorAll('span')].filter(s => s.children.length === 0 && s.getBoundingClientRect().width > 1).map(s => s.textContent).join(' '))
      const todo = (await fila.textContent()) ?? ''
      f.ok(!/Lo debe|faltan todos los pasos/.test(visto) && /Lo debe el operador de campo · mañana antes de las 07:00/.test(todo) && /faltan todos los pasos/.test(todo),
        `la fila ${i + 1} no repite lo de la explicación, y el lector lo oye («${visto}»)`)
    }
    await expect(cabeza.locator('[data-explica]')).toHaveText('Las contesta el operador de campo mañana antes de las 07:00.')
    f.cerrar()
  })

  test('Equipos · confiabilidad en el teléfono: la cabeza no repite la cifra grande; el colchón a la ⓘ; los filtros en «Filtrar»', async ({ flujo: f }) => {
    const { page } = f
    await page.setViewportSize(TELEFONO)
    await f.abrir('/#/conf/equipos/ceiba')
    const cabeza = page.locator('[data-primero]')
    await expect(cabeza.locator('[data-cifra]')).toHaveText('3.059')
    const fila = (e: string) => seVe(cabeza.locator(`[data-fila-primero="${e}"]`))
    const a = await fila('P-201A'), c = await fila('P-201C'), lc = await fila('LC-11')
    f.ok(!a.includes('3.059') && !c.includes('3.059') && a.includes('sin instrumento') && !a.includes('sube porque') && /1\.031\s*bbl\/d/.test(lc) && !lc.includes('vigila'),
      `las dos de la cifra grande no la repiten; la tercera trae la suya («${a}» · «${c}» · «${lc}»)`)
    await expect(cabeza.locator('[data-fila-primero="P-201A"]')).toHaveAttribute('aria-label', /3\.059 barriles por día si falla hoy/)
    await expect(cabeza.locator('[data-calidad-primero]')).toHaveText('calculado', { useInnerText: true })
    await expect(cabeza.getByRole('img', { name: /después de 2 min de colchón/ })).toBeVisible()
    await expect(page.locator('[data-acierto-vigia]')).toContainText('¿Le creo al vigía? Desde que entró TRIM, acertó 3 de 3 avisos.')
    // Los filtros, plegados: el estado también detrás de «Filtrar» (P-02).
    const filtrar = page.locator('[data-mas-filtros]')
    await expect(filtrar).toHaveText(/^Filtrar/)
    await expect(page.getByRole('radio', { name: /^Parados/ })).toHaveCount(0)
    await filtrar.click()
    await page.getByRole('radio', { name: /^Parados/ }).click()
    await expect(filtrar).toHaveText(/^Filtrar\s*\(1\)/)
    await expect(page.locator('main [data-fila-equipo="P-201B"]')).toBeVisible()
    // En el escritorio, la fila entera y los filtros de estado a la vista.
    await page.setViewportSize(ESCRITORIO)
    await expect(page.locator('[data-mas-filtros]')).toHaveText(/^Más filtros/)
    f.cerrar()
  })

  test('Configurar · administrador en el teléfono: cada paso en una o dos palabras y los otros campos a un toque', async ({ flujo: f }) => {
    const { page } = f
    await page.setViewportSize(TELEFONO)
    await f.abrir('/#/adm/configuracion/ceiba/curso')
    const estado = page.locator('[data-estado-config]')
    await expect(estado.locator('[data-cifra]')).toHaveText('3 de 6')
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
