// F3 · Equipos y los niveles técnicos (fase 4 de la revisión): confiabilidad abre en su respuesta (P-02), el
// próximo instrumento y lo que no conviene intervenir arriba de Equipos (P-10), un pozo cerrado por otro no
// suma aparte (G-1b), «Avisan» = «Equipos que avisan» (G-15), «Sus instrumentos» del nivel 4 sin salirse a
// 390 y 320 px y sin marcas con la bomba parada (UI-03, A7, UI-07, H4), la franja en el mismo lugar en los
// niveles 1, 2 y 3 (H6), la ficha del gerente no modal en el escritorio (H7), la escala provisional (H5, I1),
// el gerente con «sí» o «no» y las filas de B (P-equipos-ger, UI-14), y el nivel 3 en el teléfono (UI-13,
// UI-08, A5). Se prueba lo que ve la persona; cada caso falla con la pantalla de antes.
import { expect, type Page } from '@playwright/test'
import { test } from './apoyo.ts'

/** Lo que la vista se sale a lo ancho (px): la página no se desplaza de lado. */
const sale = (page: Page) => page.evaluate(() => { const v = document.querySelector('.vista') ?? document.documentElement; return v.scrollWidth - v.clientWidth })
/** Dónde está la franja (x, y redondeados). */
const franja = (page: Page) => page.locator('[data-franja]').first().evaluate(e => { const r = e.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), d: Math.round(r.right) } })

test('P-02 y FF-8 · Confiabilidad abre en su respuesta, tipo número: el primero de «Si falla hoy» y «Abrir P-201A» sin desplazarse (1440 y 390)', async ({ flujo: f }) => {
  const { page } = f
  for (const [ancho, alto] of [[1440, 900], [390, 844]] as const) {
    await page.setViewportSize({ width: ancho, height: alto })
    await f.abrir('/#/conf/equipos/ceiba')
    const cabeza = page.locator('main [data-renglon="si-falla-hoy"]')
    await expect(cabeza.locator('[data-cifra]')).toHaveText('3.059')
    await expect(cabeza).toContainText('bbl/d')
    await expect(cabeza).toContainText('P-201A y P-201C · sin instrumento')
    const abrir = page.locator('main [data-abrir-primero]')
    const abajo = await abrir.evaluate(e => e.getBoundingClientRect().bottom)
    f.ok(abajo <= alto, `${ancho} px · la cifra y «Abrir P-201A» se ven sin desplazarse (${Math.round(abajo)} de ${alto})`)
    // Los filtros, detrás de «Filtrar»: la primera pantalla es la respuesta, no los filtros.
    f.ok(!await page.locator('main [role=radiogroup][aria-label="Tren"]').isVisible() && !await page.locator('main [role=radiogroup][aria-label="Estado"]').isVisible(), `${ancho} px · los filtros, plegados`)
    f.ok(await sale(page) <= 0, `${ancho} px · nada se sale a lo ancho`)
  }
  await page.locator('main [data-abrir-primero]').click()
  await expect(page.locator('main [data-nivel3="P-201A"]')).toBeVisible()
  // Otro rol no ve la cabeza: su Equipos es la lista.
  await f.abrir('/#/prod/equipos/ceiba')
  await expect(page.locator('main [data-lista-equipos]')).toBeVisible()
  f.ok(await page.locator('main [data-renglon="si-falla-hoy"]').count() === 0, 'producción no tiene la cabeza de confiabilidad')
  f.cerrar()
})

test('P-10 · Arriba de Equipos, el próximo instrumento (conf); «Ojo: no intervenir hoy», una vez, en el Hoy del jefe (C-06)', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/conf/equipos/morichal')
  await expect(page.locator('main [data-decide="conf"]')).toContainText('¿Dónde va el próximo instrumento? Lo primero de la lista sin instrumento:')
  await expect(page.locator('main [data-renglon="si-falla-hoy"]')).toContainText('MPP-301')
  await f.abrir('/#/jefe/equipos/ceiba')
  f.ok(await page.locator('main [data-decide="jefe"]').count() === 0 && await page.locator('main [data-renglon="si-falla-hoy"]').count() === 0, 'en su Equipos, el jefe tiene la lista, sin repetir el «Ojo» ni la cabeza de confiabilidad')
  await f.abrir('/#/jefe/hoy/ceiba/curso')
  await expect(page.locator('main [data-no-intervenir]')).toHaveText('Ojo: P-201A y P-201C valen más mientras P-201B esté parada: no conviene intervenirlas hoy.')
  f.cerrar()
})

test('G-1b · G-15 · La lista no cuenta dos veces lo parado y «Avisan» cuenta lo mismo que «Equipos que avisan»', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/prod/equipos/ceiba')
  await expect(page.locator('main [data-fila-equipo="LC-16"] [data-cifra-fila]')).toHaveText('dentro de los 1.665 de P-201B')
  await expect(page.locator('main [data-fila-equipo="LC-07"] [data-cifra-fila]')).toHaveText('dentro de los 1.665 de P-201B')
  // Las cifras propias de lo parado suman lo que se deja de producir ahora en el campo: 1.665 + 301 = 1.966.
  await page.locator('main [role=radiogroup][aria-label="Estado"] [data-opcion="parados"]').click()
  const cifras = await page.locator('main [data-fila-equipo] [data-cifra-fila] b').evaluateAll(es => es.map(e => Number((e.textContent ?? '').replace(/\D/g, ''))))
  f.ok(cifras.reduce((a, x) => a + x, 0) === 1966, `lo parado suma 1.966 (${cifras.join(' + ')})`)
  await expect(page.locator('main [role=radiogroup][aria-label="Estado"] [data-opcion="avisan"]')).toContainText('1')
  await page.locator('main [role=radiogroup][aria-label="Estado"] [data-opcion="avisan"]').click()
  const avisan = await page.locator('main [data-fila-equipo]').evaluateAll(es => es.map(e => e.getAttribute('data-fila-equipo')))
  f.ok(avisan.join(' ') === 'K-101', `«Avisan» es K-101, como «Equipos que avisan · 1» (${avisan.join(' ')})`)
  f.cerrar()
})

for (const ancho of [390, 320]) {
  test(`UI-03 · A7 · UI-07 · H4 · El nivel 4 a ${ancho} px: «Sus instrumentos» no se sale y, con la bomba parada, sus señales van sin marca`, async ({ flujo: f }) => {
    const { page } = f
    await page.setViewportSize({ width: ancho, height: 800 })
    for (const ruta of ['/#/conf/equipos/ceiba/P-201B/diagnostico', '/#/conf/equipos/morichal/MPP-301/diagnostico']) {
      await f.abrir(ruta)
      await expect(page.locator('main [data-instrumentos]')).toBeVisible()
      const s = await sale(page)
      f.ok(s <= 0, `${ruta} · la vista no se desplaza de lado (${s} px)`)
      const filas = await page.locator('main [data-instrumentos] [data-dispositivo]').evaluateAll(es => es.map(e => Math.round(e.getBoundingClientRect().right)))
      f.ok(filas.length > 0 && filas.every(r => r <= ancho), `${ruta} · cada instrumento cabe (${Math.max(...filas)} ≤ ${ancho})`)
    }
    await f.abrir('/#/conf/equipos/ceiba/P-201B/diagnostico')
    const ins = page.locator('main [data-instrumentos="P-201B"]')
    await expect(ins).toHaveAttribute('data-parado', 'si')
    f.ok(await ins.locator('svg[viewBox="0 0 14 14"]').count() === 0, 'parada: ningún instrumento lleva marca propia (X2 B9)')
    const colores = await ins.locator('svg path, svg rect, svg circle').evaluateAll(es => es.map(e => e.getAttribute('fill') ?? '').filter(c => /--p\d/.test(c)))
    f.ok(colores.length === 0, `parada: ninguna minitendencia termina en color (${colores.join(', ')})`)
    f.cerrar()
  })
}

test('H6 · La franja en el mismo lugar en los niveles 1, 2 y 3 (1440 y 1280)', async ({ flujo: f }) => {
  const { page } = f
  for (const ancho of [1440, 1280]) {
    await page.setViewportSize({ width: ancho, height: 900 })
    const lugares: Array<{ ruta: string; x: number; y: number; d: number }> = []
    for (const ruta of ['/#/prod/planta-viva/ceiba/curso', '/#/prod/planta/ceiba/curso', '/#/prod/equipos/ceiba/P-201B', '/#/conf/equipos/morichal/MPP-301']) {
      await f.abrir(ruta)
      await expect(page.locator('[data-franja]').first()).toBeVisible()
      lugares.push({ ruta, ...await franja(page) })
    }
    const [n1] = lugares
    f.ok(lugares.every(l => Math.abs(l.y - n1!.y) <= 4 && Math.abs(l.d - n1!.d) <= 4),
      `${ancho} px · la franja arriba a la derecha en el mismo lugar: ${lugares.map(l => `${l.ruta.split('/')[2]}${l.ruta.includes('P-201B') || l.ruta.includes('MPP') ? ' N3' : ''} (${l.d}, ${l.y})`).join(' · ')}`)
  }
  f.cerrar()
})

test('H7 · La ficha del gerente en el escritorio no tapa la franja ni bloquea la pantalla; en el teléfono, hoja con velo', async ({ flujo: f }) => {
  const { page } = f
  await page.setViewportSize({ width: 1280, height: 860 })
  // A-16: el gerente ya no tiene Equipos; la ficha se abre encima de lo suyo (la dirección del equipo).
  await f.abrir('/#/ger/resultados/ceiba/curso/P-201B')
  const ficha = page.locator('[data-panel-equipo]')
  await expect(ficha).toBeVisible()
  f.ok(await ficha.getAttribute('aria-modal') === null && await page.locator('[data-velo]').count() === 0, 'sin velo y no modal')
  f.ok(await page.locator('main').evaluate(e => !e.closest('[inert]')), 'la pantalla de atrás se sigue usando')
  const [arriba, cab] = await Promise.all([ficha.evaluate(e => e.getBoundingClientRect().top), page.locator('[data-cabecera]').evaluate(e => e.getBoundingClientRect().bottom)])
  f.ok(arriba >= cab - 1, `empieza debajo de la cabecera (${Math.round(arriba)} ≥ ${Math.round(cab)}): la franja queda a la vista`)
  await ficha.focus().catch(() => undefined)
  await page.keyboard.press('Escape')
  await expect(ficha, 'Escape la cierra').toHaveCount(0)
  await page.setViewportSize({ width: 390, height: 844 })
  await f.abrir('/#/ger/resultados/ceiba/curso/P-201B')
  await expect(ficha).toHaveAttribute('aria-modal', 'true')
  await expect.poll(() => page.locator('main').evaluate(e => !!e.closest('[inert]')), { message: 'en el teléfono, lo de atrás queda inerte' }).toBe(true)
  await ficha.getByRole('button', { name: 'Cerrar', exact: true }).first().click()
  await expect(ficha, '«Cerrar» la cierra').toHaveCount(0)
  f.cerrar()
})

test('H5 · I1 · UI-13 · UI-08 · A5 · El nivel 3: escala provisional, la acción principal primero y Exportar con su palabra en el teléfono', async ({ flujo: f }) => {
  const { page } = f
  await page.setViewportSize({ width: 390, height: 844 })
  await f.abrir('/#/sup/equipos/ceiba/P-201B')
  const heroe = page.locator('main [data-heroe-equipo]')
  await expect(heroe.locator('[data-diga]')).toBeVisible()
  const [diga, sap] = await Promise.all([heroe.locator('[data-diga]').evaluate(e => e.getBoundingClientRect().top), heroe.getByRole('button', { name: /SAP/ }).evaluate(e => e.getBoundingClientRect().top)])
  f.ok(diga <= sap, `en el teléfono, «Diga qué se dañó» antes que SAP (${Math.round(diga)} ≤ ${Math.round(sap)})`)
  // La marca del previo va con su primera palabra, no sola en su renglón.
  const [marca, texto] = await Promise.all([heroe.locator('p svg').first().evaluate(e => e.getBoundingClientRect().top), heroe.locator('[data-previo]').evaluate(e => e.getClientRects()[0]!.top)])
  f.ok(Math.abs(marca - texto) < 12, 'la marca del previo en el renglón de su primera palabra')
  await expect(page.locator('main [data-exportar-ficha]')).toContainText('Exportar')
  const vecinos = await page.locator('main [data-vecinos] button').evaluateAll(es => es.map(e => e.getBoundingClientRect().height))
  f.ok(vecinos.every(h => h >= 44), `los vecinos del tren, de 44 px para el dedo (${vecinos.map(Math.round).join(', ')})`)
  // La escala sale de los límites y es provisional: se dice, no se afirma «fija».
  const senales = page.locator('main [data-sus-senales]')
  await expect(senales).toContainText('escala provisional')
  f.ok(!/escala de cada señal es fija/i.test(await senales.innerText()), 'ya no dice que la escala es fija')
  // A 1440, ningún rango se parte en dos renglones.
  await page.setViewportSize({ width: 1440, height: 900 })
  await f.abrir('/#/conf/equipos/ceiba/P-201B')
  const partidos = await page.locator('main [data-limite] span').evaluateAll(es => es.filter(e => e.getClientRects().length > 1).map(e => e.textContent))
  f.ok(partidos.length === 0, `ningún límite partido (${partidos.join(' · ')})`)
  f.cerrar()
})
