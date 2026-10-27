// F3 · Bombas, Electrosumergibles, Pozos, Planta y la ficha ejecutiva (fase 4 de la revisión total,
// `docs/experiencia-v2/R-revision/arreglos-f3.md`). Lo que ve la persona, con los datos del demo (2-oct, 14:00):
// la P-201B de La Ceiba parada desde las 03:52 (cerró LC-07 y LC-16); en Morichal la P-201B en marcha con su
// colchón de 10,1 h y la MPP-301 en atención por su filtro de entrada.
import { expect, type Page } from '@playwright/test'
import { test } from './apoyo.ts'

/** La marca de cada equipo según la franja de la cabecera (cada cuenta abre su lista): equipo → condición. */
const marcasDeLaLista = async (page: Page, campo: string) => {
  await page.evaluate(c => { location.hash = `#/conf/equipos/${c}` }, campo)
  await page.locator('main [data-fila-equipo]').first().waitFor()
  return Object.fromEntries(await page.locator('main [data-fila-equipo]').evaluateAll(es =>
    es.map(e => [e.getAttribute('data-fila-equipo') ?? '', e.getAttribute('data-condicion') ?? ''])))
}
/** El texto visible de la vista (sin la cabecera ni el panel). */
const texto = (page: Page) => page.evaluate(() => (document.querySelector('main') as HTMLElement).innerText)
/** Lo que se sale de la pantalla a lo ancho, fuera de un contenedor que se desplaza de lado a propósito. */
const fuera = (page: Page) => page.evaluate(() => {
  const ancho = document.documentElement.clientWidth
  return [...document.querySelectorAll('main *')].filter(e => {
    const r = e.getBoundingClientRect()
    return r.width > 0 && r.right > ancho + 1 && !e.closest('.overflow-x-auto')
  }).length
})

test('H3 · Bombas: la marca de cada placa es la del equipo, la misma que en Equipos y en la franja (MPP-301 ▲ atención, no ■ aviso)', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/conf/bombas/morichal/curso')
  await page.locator('main [data-placa="MPP-301"]').waitFor()
  const placas = Object.fromEntries(await page.locator('main [data-placa]').evaluateAll(es => es.map(e => [e.getAttribute('data-placa') ?? '', e.getAttribute('data-condicion') ?? ''])))
  const formas = await page.locator('main [data-placa="MPP-301"] > div').first().locator('svg[role=img]').evaluateAll(es => es.map(e => e.getAttribute('aria-label')))
  await expect(page.locator('main [data-placa="MPP-301"]')).toContainText('Atención ·')
  const lista = await marcasDeLaLista(page, 'morichal')
  f.ok(placas['MPP-301'] === 'atencion' && placas['MPP-301'] === lista['MPP-301'] && placas['P-201B'] === lista['P-201B'],
    `la placa dice lo mismo que la lista de Equipos: MPP-301 ${placas['MPP-301']} = ${lista['MPP-301']}; P-201B ${placas['P-201B']} = ${lista['P-201B']}`)
  f.ok(formas.length === 1 && formas[0] === 'Atención', `una sola marca en la cabecera de la placa, con su palabra (${formas.join(', ')})`)
  f.cerrar()
})

test('H12 · H5 · G-16 · T-8 · Bombas: cada variable con la escala fija del motor; «Si falla hoy» en bbl/d; nada «se pierde»', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/conf/bombas/morichal/curso')
  const p201b = page.locator('main [data-placa="P-201B"]')
  await p201b.locator('[data-senal-fija]').first().waitFor()
  // El indicador de alto desempeño (con su banda y su alarma) y la minitendencia, en cada variable de la placa.
  const variables = await p201b.locator('[data-senal-fija]').count()
  const indicadores = await p201b.locator('[data-senal-fija] svg[role=img][aria-label*="normal"]').count()
  f.ok(variables === 4 && indicadores === 4 && await page.locator('main .analogico').count() === 0,
    `las 4 variables de la placa llevan el indicador de escala fija (${indicadores} de ${variables}) y ya no el indicador viejo`)
  await expect(p201b.locator('[data-si-falla-hoy]')).toHaveText(/^Si falla hoy: 783 bbl\/d después de 10,1 h de colchón/)
  const t = await texto(page)
  f.ok(!/se pierde|pierde \d|si se para/i.test(t), '«Si falla hoy», no «si se para»; y lo diferido no «se pierde»')
  f.cerrar()
})

test('P-bombas-1 · X2 B9 · Bombas de La Ceiba: la placa parada en gris y sin marca por señal; «573 bbl · calculado ⓘ» sin el rango ni la hora repetidos', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/sup/bombas/ceiba/curso')
  const placa = page.locator('main [data-placa="P-201B"]')
  await placa.locator('[data-senal-fija]').first().waitFor()
  const senales = await placa.locator('[data-senal-fija]').evaluateAll(es => es.map(e => ({ gris: e.getAttribute('data-gris'), marcas: e.querySelectorAll('svg[viewBox="0 0 14 14"]').length })))
  f.ok(senales.length > 0 && senales.every(s => s.gris === 'si' && s.marcas === 0), `con la bomba parada, sus ${senales.length} señales en gris y sin marca propia`)
  await expect(placa.locator('[data-diferido-placa]')).toHaveText(/^573 bbl\s*calculado/)
  const t = await texto(page)
  f.ok(!t.includes('487 – 659') && !/bbl\/h/.test(t) && !/14:00/.test(await page.locator('main [data-bombas-detenidas]').innerText()),
    'el rango y el ritmo van a la ⓘ; debajo de la cifra, «1 bomba detenida · 2 pozos cerrados», sin la hora')
  await expect(page.locator('main [data-bombas-detenidas]')).toHaveText('1 bomba detenida · 2 pozos cerrados')
  f.cerrar()
})

test('G-5 · H17 · H16 · Pozos: «Potencial del libro»; la marca de cada pozo es la de la franja, con su palabra', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/prod/pozos/ceiba/curso')
  await page.locator('main [data-pozo]').first().waitFor()
  const t = await texto(page)
  f.ok(t.includes('Potencial del libro') && !t.includes('Potencial ahora'), 'un nombre, una cifra: «Potencial del libro» (11.360)')
  const pozos = Object.fromEntries(await page.locator('main [data-pozo]').evaluateAll(es => es.filter(e => (e as HTMLElement).offsetParent).map(e => [e.getAttribute('data-pozo') ?? '', e.getAttribute('data-condicion') ?? ''])))
  // La cifra del total no lleva marca (un total no es una alarma); LC-16 y LC-07, cerrados por P-201B, tampoco.
  f.ok(pozos['LC-21'] === 'atencion' && pozos['LC-16'] === '' && pozos['LC-07'] === '', `LC-21 ▲ atención; LC-16 y LC-07 sin marca propia (${JSON.stringify(pozos)})`)
  await expect(page.locator('main tr', { hasText: 'LC-21' }).first()).toContainText('Atención')
  const lista = await marcasDeLaLista(page, 'ceiba')
  f.ok(lista['LC-21'] === pozos['LC-21'], `la misma marca que en Equipos (${lista['LC-21']})`)
  f.cerrar()
})

test('P-esp-1 · Electrosumergibles: ninguna en falla, y cuáles están paradas por otro equipo', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/prod/esp/ceiba/curso')
  const cifra = page.locator('main [data-cifra="En falla ahora"]')
  await expect(cifra).toContainText('Ninguna')
  await expect(cifra).toContainText(/LC-0?\d+ y LC-\d+, cerradas por P-201B/)
  f.ok(!(await texto(page)).includes('las paradas, por otra causa'), 'el vacío enseña: dice cuáles y por quién, no «por otra causa»')
  f.cerrar()
})

test('H3 · UI-19 · A18 · Planta: la caja de cada equipo con la marca de la franja; filas con «›», sin botones «Ubicar»; sin movimiento si se pide menos', async ({ flujo: f }) => {
  const { page } = f
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => {
    const w = window as unknown as { __desplazamientos: string[] }
    w.__desplazamientos = []
    const original = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = function (o?: boolean | ScrollIntoViewOptions) {
      w.__desplazamientos.push(typeof o === 'object' ? o.behavior ?? '' : String(o)); return original.call(this, o)
    }
  })
  await f.abrir('/#/prod/planta/ceiba/curso')
  await page.locator('main [data-fila-planta]').first().waitFor()
  const cajas = Object.fromEntries(await page.locator('main [data-nodo] rect.marco').evaluateAll(es => es.map(e => [e.closest('[data-nodo]')?.getAttribute('data-nodo') ?? '', e.getAttribute('data-condicion') ?? ''])))
  f.ok(cajas.bomba === 'alarma' && cajas.aire === 'alarma' && cajas.tratador === 'aviso', `la caja de P-201B y K-101 en alarma, la de H-302 en aviso: las de la franja (${JSON.stringify(cajas)})`)
  const filas = page.locator('main [data-fila-planta]')
  const conFicha = await filas.filter({ hasText: 'P-201B' }).first()
  f.ok(await conFicha.evaluate(e => e.tagName === 'BUTTON' && !!e.querySelector('svg.lucide-chevron-right')), 'la fila de P-201B es la fila entera, con «›»')
  f.ok(await page.locator('main button[title="Ubicar en el dibujo"]').count() === 0, 'ya no hay un botón «Ubicar» por fila')
  await expect(page.locator('main')).toContainText('Capturando datos')
  // Lo que no tiene ficha se ubica en el dibujo con un toque, sin desplazamiento suave (prefers-reduced-motion).
  await filas.filter({ hasText: 'sin instrumento' }).first().click()
  const comportamientos = await page.evaluate(() => (window as unknown as { __desplazamientos: string[] }).__desplazamientos)
  f.ok(comportamientos.length > 0 && comportamientos.every(c => c !== 'smooth'), `con «menos movimiento», el dibujo salta sin animar (${comportamientos.join(', ')})`)
  f.cerrar()
})

test('H5 · H12 · X2 B9 · El diagnóstico de P-201B: sus variables con la escala fija y en gris, sin marcas propias', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/conf/equipos/ceiba/P-201B/diagnostico')
  const diag = page.locator('main [data-diagnostico-bomba="P-201B"]')
  await diag.locator('[data-senal-fija]').first().waitFor()
  const s = await diag.locator('[data-senal-fija]').evaluateAll(es => es.map(e => ({ gris: e.getAttribute('data-gris'), marcas: e.querySelectorAll('svg[viewBox="0 0 14 14"]').length, fijo: !!e.querySelector('svg[role=img]') })))
  f.ok(s.length >= 7 && s.every(x => x.gris === 'si' && x.marcas === 0 && x.fijo), `las ${s.length} variables, con su indicador fijo, en gris y sin marca (la bomba está parada)`)
  const t = await texto(page)
  f.ok(t.includes('Salud por parte') && t.includes('Variables') && t.includes('Vigía') && t.includes('Puntos ciegos') && !/SALUD POR PARTE|PUNTOS CIEGOS|VIGÍA/.test(t), 'los títulos en frase')
  f.cerrar()
})

test('H23 · El vigía de MPP-301: la proyección con su banda normal y el piso rotulado', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/conf/equipos/morichal/MPP-301/diagnostico')
  await page.locator('main [data-diagnostico-bomba="MPP-301"]').waitFor()
  f.ok(await page.locator('main [data-diagnostico-bomba] rect[data-banda]').count() > 0, 'la proyección sombrea la banda normal')
  f.ok(await page.locator('main [data-diagnostico-bomba] [data-piso]').count() > 0, 'y rotula el piso de su escala, como el límite')
  f.cerrar()
})

test('G-16 · T-8 · El nivel 3 de una bomba en marcha: «Si falla hoy» (no «SI SE PARA AHORA») y «deja de producir», con la misma cifra', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/conf/equipos/morichal/P-201B')
  const n3 = page.locator('main [data-nivel3="P-201B"]')
  await n3.waitFor()
  await f.esperarTexto('Su historia')
  const t = await n3.innerText()
  const orden = t.match(/deja de producir ([\d.]+) bbl\/d en este orden/)?.[1]
  f.ok(!t.includes('SI SE PARA AHORA') && !/pierde \d/.test(t) && orden === '783', `el panel se llama «Si falla hoy» y deja de producir ${orden} bbl/d en este orden`)
  f.cerrar()
})

test('H34 · H3 · T-8 · G-16 · La ficha del gerente: «No arrancar» en tinta con ⊘, la marca del equipo y nada «se pierde»', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/ger/equipos/ceiba/P-201B')
  const ficha = page.locator('[data-panel-equipo]')
  await ficha.locator('[data-bloqueo]').waitFor()
  await expect(ficha.locator('[data-bloqueo]')).toHaveText(/No arrancar hasta identificar qué se dañó/)
  const t = await ficha.innerText()
  const chips = await ficha.locator('span').evaluateAll(es => es.filter(e => e.textContent?.trim().toLowerCase() === 'no arrancar').length)
  f.ok(chips === 0 && !/se pierde/.test(t), `ni el chip «no arrancar» (${chips}) ni «se pierden»`)
  f.ok(await ficha.locator('[data-condicion="alarma"]').count() > 0 && t.includes('Alarma ·'), 'la marca de la franja (alarma) con su palabra')
  await page.evaluate(() => { location.hash = '#/ger/equipos/morichal/P-201B' })
  await page.waitForFunction(() => (document.querySelector('[data-panel-equipo]') as HTMLElement | null)?.innerText.includes('Morichal') ?? false)
  const tm = await page.locator('[data-panel-equipo]').innerText()
  f.ok(/Si falla hoy\s*783 bbl\/d se dejan de producir después de 10,1 h de colchón/.test(tm) && !/Si para ahora/.test(tm), '«Si falla hoy» en bbl/d, como en Equipos y Bombas')
  f.cerrar()
})

test('390 px · Bombas, Pozos, Electrosumergibles y Planta: nada se sale de la pantalla', async ({ flujo: f }) => {
  const { page } = f
  await page.setViewportSize({ width: 390, height: 844 })
  for (const r of ['/#/sup/bombas/ceiba/curso', '/#/conf/bombas/morichal/curso', '/#/prod/pozos/ceiba/curso', '/#/prod/esp/ceiba/curso', '/#/prod/planta/ceiba/curso']) {
    await f.abrir(r)
    await page.waitForTimeout(300)
    const n = await fuera(page)
    f.ok(n === 0, `${r}: ${n} elementos se salen a 390 px`)
  }
  f.cerrar()
})
