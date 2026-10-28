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

// B3 · A-15: la pantalla Bombas se borró (su contenido es un filtro de Equipos y la ficha vive en el nivel 3).
// Lo que se probaba en cada placa se prueba ahora donde vive: la lista y el nivel 3, con el kit SCADA.
test('H3 · la marca de la bomba en su nivel 3 es la del equipo, la misma que en la lista y en la franja (MPP-301 ▲ atención, no ■ aviso)', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/conf/equipos/morichal')
  const lista = await marcasDeLaLista(page, 'morichal')
  await f.ir('#/conf/equipos/morichal/MPP-301')
  const n3 = page.locator('main [data-nivel3="MPP-301"]')
  await n3.waitFor()
  await expect(n3).toContainText('Atención')
  f.ok(lista['MPP-301'] === 'atencion', `en la lista, MPP-301 en atención (${lista['MPP-301']})`)
  f.ok(/Atención ·/.test(await n3.innerText()), 'la condición con su palabra, la misma de la lista')
  f.cerrar()
})

test('H12 · H5 · G-16 · T-8 · el nivel 3: cada variable con la barra del kit (escala fija, banda y alarma); «Si falla hoy» en bbl/d; nada «se pierde»', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/conf/equipos/morichal/P-201B')
  const senales = page.locator('main [data-sus-senales]')
  await senales.locator('[data-kit="barra"]').first().waitFor()
  const barras = await senales.locator('[data-kit="barra"]').count()
  const conBanda = await senales.locator('[data-kit="barra"][aria-label*="normal"]').count()
  f.ok(barras >= 4 && conBanda === barras && await page.locator('main .analogico').count() === 0, `cada variable con la barra del kit (${conBanda} de ${barras}) y ya no el indicador viejo`)
  await expect(page.locator('main [data-si-falla-ficha="P-201B"]')).toHaveText(/^Si falla hoy: 783 bbl\/d después de 10,1 h de colchón/)
  const t = await texto(page)
  f.ok(!/se pierde|pierde \d|si se para/i.test(t), '«Si falla hoy», no «si se para»; y lo diferido no «se pierde»')
  f.cerrar()
})

test('P-bombas-1 · X2 B9 · la bomba parada de La Ceiba: sus variables en gris y sin marca propia (el kit en «parado»)', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/sup/bombas/ceiba/curso/P-201B')
  f.ok((await f.hash()).startsWith('#/sup/equipos/ceiba/P-201B'), 'la dirección de antes abre su nivel 3')
  const barras = page.locator('main [data-sus-senales] [data-kit="barra"]')
  await barras.first().waitFor()
  const estados = await barras.evaluateAll(es => es.map(e => ({ estado: e.getAttribute('data-estado'), marcas: e.querySelectorAll('svg[viewBox="0 0 14 14"]').length })))
  f.ok(estados.length > 0 && estados.every(x => x.estado === 'parado' && x.marcas === 0), `con la bomba parada, sus ${estados.length} señales en gris y sin marca propia`)
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

test('P-esp-1 · A-15 · Electrosumergibles es un filtro de Equipos: las que cerró otro equipo lo dicen', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/prod/esp/ceiba/curso')
  f.ok((await f.hash()).startsWith('#/prod/equipos/ceiba'), `la dirección de antes abre Equipos (${await f.hash()})`)
  await page.locator('main [data-fila-equipo]').first().waitFor()
  const tipos = await page.locator('main [data-fila-equipo]').evaluateAll(es => es.map(e => e.getAttribute('data-fila-equipo')))
  f.ok(tipos.length > 0 && tipos.every(t => /^LC-/.test(t ?? '')), `con el filtro de electrosumergibles: solo pozos con ESP (${tipos.length})`)
  f.ok(await page.locator('main [data-dentro-de="P-201B"]').count() >= 1, 'las cerradas por P-201B dicen que van dentro de su cifra')
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
  // 28-oct: la palabra va en la cabecera del modal («P-201B ◆ Alarma»); el bloque «Ahora» lleva la condición.
  f.ok(await ficha.locator('[data-condicion="alarma"]').count() > 0 && /P-201B[\s\d]*Alarma/.test(t), 'la marca de la franja (alarma) con su palabra')
  await page.evaluate(() => { location.hash = '#/ger/equipos/morichal/P-201B' })
  await page.waitForFunction(() => (document.querySelector('[data-panel-equipo]') as HTMLElement | null)?.innerText.includes('Morichal') ?? false)
  const tm = await page.locator('[data-panel-equipo]').innerText()
  f.ok(/Si falla hoy\s*783\s*bbl\/d\s*se dejan de producir\s*después de 10,1 h de colchón/.test(tm) && !/Si para ahora/.test(tm), '«Si falla hoy» en bbl/d, como en Equipos y Bombas')
  f.cerrar()
})

test('390 px · Equipos (con los filtros de antes), el nivel 3, Pozos y Planta: nada se sale de la pantalla', async ({ flujo: f }) => {
  const { page } = f
  await page.setViewportSize({ width: 390, height: 844 })
  for (const r of ['/#/sup/equipos/ceiba', '/#/conf/equipos/morichal/P-201B', '/#/prod/pozos/ceiba/curso', '/#/prod/esp/ceiba/curso', '/#/prod/planta/ceiba/curso']) {
    await f.abrir(r)
    await page.waitForTimeout(300)
    const n = await fuera(page)
    f.ok(n === 0, `${r}: ${n} elementos se salen a 390 px`)
  }
  f.cerrar()
})
