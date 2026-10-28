/* R5 · 100 % responsive (el dueño, 27-oct, con captura desde su Mac: Arc al 90 % de zoom, ~1680 px CSS,
   en #/prod/planta-viva/ceiba/curso con el menú de la persona abierto). Se veía:
   1. el panel lateral corrido a la izquierda y cortado («rim», «ampo», «arcela Ríos»): el panel se
      desplazaba de lado porque el menú vivía adentro y lo ensanchaba;
   2. la franja de condiciones cortada por la derecha («sin comunicación · medidor of…»).
   El zoom del navegador cambia el ancho en px CSS: 80 % de 1512 son 1890, 90 % son 1680, 110 % son
   1375 y 125 % son 1210 (y la letra se dibuja con otra escala: `deviceScaleFactor`).

   Aquí, en cada ancho (de 1920 a 320, con los del zoom), en claro y en noche:
   - los inicios de los 9 roles y sus pantallas: nada se sale de la ventana ni de su tarjeta, nada se
     recorta ni se pisa (el detector del auditor); el panel lateral NUNCA se desplaza de lado; la franja
     cabe entera en su cabecera, con su texto sin cortar, y no choca con las migas ni con el título;
   - abiertos: el menú de la persona, el selector de campo, la lista de una cuenta de la franja, el
     modal de detalle (la ficha de P-201B y la traza de un tramo) y la ficha de una gráfica: dentro de
     la pantalla; el modal, con su cuerpo desplazable y en el teléfono como hoja;
   - el panel plegado y desplegado (por debajo de 1280 arranca plegado solo y se puede desplegar).
   Cada prueba falla sin el cambio: el panel tenía `overflow-y-auto` (que computa `overflow-x: auto`),
   la franja era siempre entera y el panel solo se plegaba al cargar. */
import { expect, type Page } from '@playwright/test'
import { test } from './apoyo.ts'
import { detectar, type Hallazgo } from './auditoria/detector.ts'

/** Los anchos del encargo y los del zoom de 1512: 80 % → 1890, 90 % → 1680, 110 % → 1375, 125 % → 1210. */
const ANCHOS = [1920, 1890, 1728, 1680, 1512, 1440, 1375, 1366, 1280, 1210, 1180, 1024, 900, 820, 768, 600, 430, 390, 360, 320]
const ZOOM: Record<number, number> = { 1890: 0.8, 1680: 0.9, 1375: 1.1, 1210: 1.25 }
/** Safari y Firefox de escritorio: los anchos del zoom y los bordes de cada arreglo, no todos. */
const OTROS_MOTORES = new Set([1680, 1375, 1280, 1180, 900, 360])
const alto = (w: number) => (w < 640 ? 800 : w < 1100 ? 760 : 900)

/** Los inicios de los 9 roles y sus otras pantallas. */
const INICIOS = ['#/ger/planta-viva/ceiba/curso', '#/prod/planta-viva/ceiba/curso', '#/sup/hoy/ceiba/curso', '#/oper/hoy/ceiba/curso',
  '#/jefe/hoy/ceiba/curso', '#/conf/equipos/morichal', '#/tec/hoy/ceiba/curso', '#/reg/regulatorio/ceiba/curso', '#/adm/configuracion/ceiba/curso']
const PANTALLAS = ['#/ger/planta-viva/ceiba~portafolio/curso', '#/ger/resultados/ceiba/curso', '#/prod/produccion/ceiba/curso', '#/prod/resultados/ceiba~portafolio/curso',
  '#/sup/equipos/ceiba', '#/jefe/equipos/ceiba~portafolio', '#/conf/confiabilidad/morichal/curso', '#/sup/equipos/ceiba/P-201A', '#/prod/causa/ceiba/curso']
/** Lo que el auditor de este encargo cuenta: lo que se sale, se recorta o se pisa (lo demás lo audita el auditor). */
const DE_LUGAR = new Set<Hallazgo[0]>(['pantalla', 'desborde', 'sale', 'recortado', 'encimado'])

async function abrir(page: Page, ruta: string) {
  await page.goto(`/${ruta}`)
  await page.waitForFunction(() => (document.querySelector('main')?.innerText ?? '').length > 80 && !document.querySelector('[data-cargando]'), null, { timeout: 20_000 })
  await page.waitForTimeout(250)
}

/** El armazón: el panel sin desplazamiento de lado, la página sin desplazarse de lado, la franja entera dentro de su
 *  cabecera y sin chocar con las migas ni el título. Devuelve los problemas en palabras. */
const medirArmazon = () => {
  const vw = document.documentElement.clientWidth, mal: string[] = []
  for (const nav of document.querySelectorAll<HTMLElement>('nav[aria-label="Navegación"]')) {
    if (nav.scrollWidth > nav.clientWidth + 1) mal.push(`el panel se desplaza de lado (${nav.scrollWidth} > ${nav.clientWidth})`)
    if (nav.scrollLeft !== 0) mal.push(`el panel está corrido ${nav.scrollLeft} px`)
    if (getComputedStyle(nav).overflowX !== 'hidden') mal.push('el panel no tiene overflow-x: hidden')
  }
  const raiz = document.querySelector<HTMLElement>('.raiz-app')
  if (raiz && (raiz.scrollWidth > raiz.clientWidth + 1 || raiz.scrollLeft)) mal.push(`la app se desplaza de lado (${raiz.scrollWidth} > ${raiz.clientWidth})`)
  if (document.documentElement.scrollWidth > vw + 1) mal.push(`la página se desplaza de lado (${document.documentElement.scrollWidth} > ${vw})`)
  for (const fr of document.querySelectorAll<HTMLElement>('header [data-franja]')) {
    const cab = fr.closest('header')!, c = cab.getBoundingClientRect()
    for (const b of fr.querySelectorAll<HTMLElement>(':scope > div > button')) {
      const r = b.getBoundingClientRect()
      if (r.right > c.right + 1 || r.left < c.left - 1 || r.right > vw) mal.push(`la píldora «${b.getAttribute('aria-label')}» se sale de la cabecera (${Math.round(r.left)}–${Math.round(r.right)} en ${Math.round(c.left)}–${Math.round(c.right)})`)
      if (b.scrollWidth > b.clientWidth + 1) mal.push(`la píldora «${b.getAttribute('aria-label')}» corta su texto`)
      if (!b.getAttribute('title')) mal.push(`la píldora «${b.getAttribute('aria-label')}» sin su nombre en la ayuda`)
    }
    // Las migas y el título no tocan la franja: renglón por renglón (un texto que se parte tiene una caja por renglón).
    const f = fr.getBoundingClientRect()
    // Y no los aprieta: con la franja al lado, a las migas y al título les quedan 420 px o más (a 1100 px con el
    // panel desplegado la franja entera dejaba ~300 y «La planta viva» se partía en dos renglones).
    const izq = cab.firstElementChild!.getBoundingClientRect()
    if (f.left > izq.left + 1 && izq.width < Math.min(420, c.width) - 1) mal.push(`la franja aprieta las migas y el título a ${Math.round(izq.width)} px`)
    for (const t of cab.querySelectorAll<HTMLElement>('nav[aria-label="Dónde está"], h1:not(.sr-only)')) {
      const rango = document.createRange(); rango.selectNodeContents(t)
      for (const r of rango.getClientRects()) if (r.width && r.right > f.left + 1 && r.left < f.right - 1 && r.bottom > f.top + 1 && r.top < f.bottom - 1)
        mal.push(`«${t.innerText.slice(0, 30)}» choca con la franja`)
    }
  }
  return mal
}

/** Una caja dentro de la ventana (con 1 px de gracia). */
const dentro = async (page: Page, sel: string) => page.locator(sel).first().evaluate(e => {
  const r = e.getBoundingClientRect(), vw = document.documentElement.clientWidth, vh = innerHeight
  return { ok: r.left >= -1 && r.top >= -1 && r.right <= vw + 1 && r.bottom <= vh + 1, caja: `${Math.round(r.left)},${Math.round(r.top)}–${Math.round(r.right)},${Math.round(r.bottom)} en ${vw}×${vh}` }
})
/** Ningún texto de una línea cortado sin «…» dentro de un panel abierto. */
const sinCortes = (page: Page, sel: string) => page.locator(sel).first().evaluate(p => [...p.querySelectorAll<HTMLElement>('*')]
  .filter(e => e.children.length === 0 && (e.textContent ?? '').trim() && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).textOverflow !== 'ellipsis' && getComputedStyle(e).overflowX !== 'visible')
  .map(e => e.textContent!.trim().slice(0, 30)))

/** Con un menú abierto (que va encima de la página a propósito) no se cuentan los encimados: lo que se pisa
 *  es el menú con lo de atrás. Su texto se mide aparte (`sinCortes`). */
async function auditar(page: Page, donde: string, menuAbierto = false) {
  const hallazgos = (await page.evaluate(detectar)).filter(h => DE_LUGAR.has(h[0]) && !(menuAbierto && h[0] === 'encimado'))
  expect.soft(hallazgos, `${donde}: nada se sale, se recorta ni se pisa`).toEqual([])
  expect.soft(await page.evaluate(medirArmazon), `${donde}: el panel, la página y la franja`).toEqual([])
}

/** El botón de la persona: en el panel (escritorio) o en la banda (teléfono y tableta). */
const botonPersona = (page: Page) => page.locator('aside nav button[aria-label*=" · "], [data-banda-persona] button[aria-label*=" · "]').first()
const botonCampo = (page: Page) => page.locator('aside nav button[aria-label^="Campo:"], [data-banda-campo] button[aria-label^="Campo:"]').first()

for (const w of ANCHOS) {
  const zoom = ZOOM[w]
  test.describe(`${w} px${zoom ? ` (zoom al ${Math.round(zoom * 100)} % de 1512)` : ''}`, () => {
    test.use({ viewport: { width: w, height: alto(w) }, ...(zoom ? { deviceScaleFactor: 2 * zoom } : {}) })
    test.beforeEach(({ browserName }) => { test.skip(browserName !== 'chromium' && !OTROS_MOTORES.has(w), 'Safari y Firefox: los anchos del zoom y los bordes') })

    test(`R5 · ${w} px · los inicios de los 9 roles y sus pantallas, en claro`, async ({ flujo: f }) => {
      for (const ruta of [...INICIOS, ...PANTALLAS]) {
        await abrir(f.page, ruta)
        await auditar(f.page, `${ruta} a ${w}`)
      }
      f.cerrar()
    })

    test(`R5 · ${w} px · abiertos: la persona, el campo, la franja, el modal y la ficha de una gráfica`, async ({ flujo: f }) => {
      const { page } = f
      // La vista de la captura del dueño, con el menú de la persona abierto.
      await abrir(page, '#/prod/planta-viva/ceiba/curso')
      await botonPersona(page).click()
      const persona = '[data-menu-persona]'
      await expect(page.locator(persona)).toBeVisible()
      const p = await dentro(page, persona)
      f.ok(p.ok, `el menú de la persona dentro de la pantalla (${p.caja})`)
      f.ok((await sinCortes(page, persona)).length === 0, `el menú de la persona sin textos cortados (${await sinCortes(page, persona)})`)
      // Ni con el foco dentro del menú ni con un desplazamiento de lado (el trackpad) se corre el panel.
      await page.keyboard.press('Tab')
      await page.locator('aside nav').evaluateAll(ns => ns.forEach(n => n.scrollBy({ left: 80 })))
      await auditar(page, `menú de la persona a ${w}`, true)
      await page.keyboard.press('Escape')

      // El selector de campo (el gerente tiene varios campos).
      await abrir(page, '#/ger/planta-viva/ceiba/curso')
      await botonCampo(page).click()
      await expect(page.locator('[data-menu-campo]')).toBeVisible()
      const c = await dentro(page, '[data-menu-campo]')
      f.ok(c.ok, `el selector de campo dentro de la pantalla (${c.caja})`)
      f.ok((await page.evaluate(medirArmazon)).length === 0, `con el selector abierto, el panel quieto (${await page.evaluate(medirArmazon)})`)
      await page.keyboard.press('Escape')

      // La lista de una cuenta de la franja.
      await page.locator('header [data-franja] button:not([disabled])').first().click()
      const lista = 'header [data-franja] [role=group]'
      await expect(page.locator(lista)).toBeVisible()
      const l = await dentro(page, lista)
      f.ok(l.ok, `la lista de la franja dentro de la pantalla (${l.caja})`)
      // Y encima de lo que sigue: la cabecera es un contenedor (index.css) y no puede quedar debajo de las tarjetas.
      const encima = await page.locator(lista).first().evaluate(e => {
        const r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = Math.min(r.bottom - 8, innerHeight - 4)
        return e.contains(document.elementFromPoint(x, y))
      })
      f.ok(encima, 'la lista de la franja se ve encima de las tarjetas')
      await page.keyboard.press('Escape')

      // El modal de detalle: la ficha de P-201B y la traza de un tramo. Cabe a cualquier alto; en el teléfono, hoja.
      for (const [ruta, boton, sel] of [
        ['#/ger/planta-viva/ceiba~portafolio/curso', 'main [data-ver-que-se-hace="P-201B"]', '[data-panel-equipo]'],
        ['#/prod/planta-viva/ceiba/curso', 'main [data-balance] [data-tramo-balance="planta"] button', '[data-traza="planta"]'],
      ] as const) {
        await abrir(page, ruta)
        await page.locator(boton).first().focus()
        await page.keyboard.press('Enter')
        await expect(page.locator(sel)).toBeVisible()
        await page.waitForFunction(() => document.getAnimations().every(a => a.playState !== 'running'))
        const m = await dentro(page, `${sel} [data-modal-caja]`)
        f.ok(m.ok, `${sel}: el modal cabe en la pantalla (${m.caja})`)
        const cuerpo = await page.locator(`${sel} [data-modal-cuerpo]`).evaluate(e => ({ desplaza: getComputedStyle(e).overflowY, alto: e.getBoundingClientRect().height }))
        f.ok(/auto|scroll/.test(cuerpo.desplaza) && cuerpo.alto > 80, `${sel}: el cuerpo se desplaza adentro (${cuerpo.desplaza}, ${Math.round(cuerpo.alto)} px)`)
        if (w < 640) f.ok(await page.locator(sel).getAttribute('data-modal') === 'hoja', `${sel}: en el teléfono, hoja`)
        await auditar(page, `${sel} a ${w}`)
        await page.keyboard.press('Escape')
      }

      // La ficha de una gráfica (Mes a mes de Resultados), con el cursor al final, donde más se sale.
      await abrir(page, '#/ger/resultados/ceiba/curso')
      const svg = page.locator('main [data-mes-a-mes] [data-kit="tendencia"] svg').first()
      await svg.scrollIntoViewIfNeeded()
      await svg.focus()
      await page.keyboard.press('End')
      await expect(page.locator('[data-ficha]')).toBeVisible()
      const fi = await dentro(page, '[data-ficha]')
      f.ok(fi.ok, `la ficha de la gráfica dentro de la pantalla (${fi.caja})`)
      f.cerrar()
    })
  })
}

for (const w of [1680, 1180, 900, 390]) {
  test.describe(`${w} px · noche`, () => {
    test.use({ viewport: { width: w, height: alto(w) }, colorScheme: 'dark' })
    test.beforeEach(({ browserName }) => { test.skip(browserName !== 'chromium' && w !== 1680 && w !== 390, 'Safari y Firefox: dos anchos') })
    test(`R5 · ${w} px · noche · los inicios de los 9 roles y el menú de la persona`, async ({ flujo: f }) => {
      await f.page.addInitScript(() => localStorage.setItem('trim.tema', 'dark'))
      for (const ruta of INICIOS) {
        await abrir(f.page, ruta)
        await auditar(f.page, `${ruta} a ${w}, noche`)
      }
      await botonPersona(f.page).click()
      const p = await dentro(f.page, '[data-menu-persona]')
      f.ok(p.ok, `noche: el menú de la persona dentro de la pantalla (${p.caja})`)
      await auditar(f.page, `menú de la persona a ${w}, noche`, true)
      f.cerrar()
    })
  })
}

test.describe('el panel se pliega solo en anchos medianos', () => {
  test('R5 · 1180 px y 1440 px · por debajo de 1280 arranca plegado, se despliega, y al agrandar vuelve a lo de ese ancho', async ({ flujo: f }) => {
    const { page } = f
    const ancho = () => page.locator('aside').evaluate(a => Math.round(a.getBoundingClientRect().width))
    await page.setViewportSize({ width: 1180, height: 800 })
    await abrir(page, '#/prod/planta-viva/ceiba/curso')
    f.ok(await ancho() === 88, `a 1180, plegado solo (${await ancho()} px)`)
    await page.getByRole('button', { name: 'Desplegar el panel' }).click()
    await page.waitForTimeout(300)
    f.ok(await ancho() === 240, `el usuario lo despliega (${await ancho()} px)`)
    await auditar(page, '1180 desplegado')
    // Más ancho: el panel vuelve a lo de ese ancho (desplegado) y, de vuelta en 1180, a lo que escogió ahí.
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.waitForTimeout(300)
    f.ok(await ancho() === 240, `a 1440, desplegado (${await ancho()} px)`)
    await page.getByRole('button', { name: 'Plegar el panel' }).click()
    await page.waitForTimeout(300)
    f.ok(await ancho() === 88, 'a 1440 se puede plegar')
    await page.setViewportSize({ width: 1180, height: 800 })
    await page.waitForTimeout(300)
    f.ok(await ancho() === 240, `de vuelta a 1180: lo que escogió en ese ancho, desplegado (${await ancho()} px)`)
    await page.setViewportSize({ width: 1100, height: 800 })
    await page.reload()
    await page.waitForFunction(() => !document.querySelector('[data-cargando]'))
    f.ok(await ancho() === 240, 'y se recuerda al volver a entrar')
    // Sin nada escogido en un ancho, se pliega o despliega solo al cruzar 1280.
    await page.evaluate(() => { for (const k of ['trim.riel.prod@medio', 'trim.riel.prod@ancho', 'trim.riel.prod']) localStorage.removeItem(k) })
    await page.reload()
    await page.waitForFunction(() => !document.querySelector('[data-cargando]'))
    f.ok(await ancho() === 88, 'sin escoger, a 1100 plegado')
    await page.setViewportSize({ width: 1600, height: 900 })
    await page.waitForTimeout(300)
    f.ok(await ancho() === 240, 'sin escoger, al agrandar la ventana se despliega solo')
    f.cerrar()
  })
})

test.describe('las rejillas se acomodan al ancho que tienen', () => {
  test('R5 · 1024 px y 1180 px · Confiabilidad: dos tarjetas por fila solo con 440 px cada una, y la tabla sin partir sus cifras', async ({ flujo: f }) => {
    const { page } = f
    for (const w of [1024, 1180, 1440]) {
      await page.setViewportSize({ width: w, height: 900 })
      await abrir(page, '#/conf/confiabilidad/morichal/curso')
      const m = await page.locator('main section, main div').filter({ hasText: /^Los más costosos/ }).last().evaluate(p => {
        const tarjeta = p.closest('div.grid > *') as HTMLElement ?? p
        const tabla = tarjeta.querySelector('table')!
        // Cada celda de cifra en un renglón y con aire a su izquierda (antes: «3.22622.582», «47,1 / h»).
        const celdas = [...tabla.querySelectorAll<HTMLElement>('tbody tr:not(.hidden) td')].filter(td => td.getClientRects().length)
        const partidas = celdas.filter(td => { const rg = document.createRange(); rg.selectNodeContents(td.lastChild ?? td); const lineas = new Set([...rg.getClientRects()].map(r => Math.round(r.top))); return lineas.size > 1 && !td.querySelector('small.block') })
        return { ancho: tarjeta.getBoundingClientRect().width, partidas: partidas.map(td => td.innerText.replace(/\s+/g, ' ')) }
      })
      f.ok(m.ancho >= 439, `a ${w}: la tarjeta tiene ${Math.round(m.ancho)} px (440 o más)`)
      f.ok(m.partidas.length === 0, `a ${w}: ninguna cifra partida en la tabla (${m.partidas.join(' · ')})`)
      await auditar(page, `Confiabilidad a ${w}`)
    }
    f.cerrar()
  })

  test('R5 · 900 px · Resultados: «¿Está funcionando?» toma el ancho y pone sus tres cifras en fila', async ({ flujo: f }) => {
    const { page } = f
    await page.setViewportSize({ width: 900, height: 900 })
    await abrir(page, '#/ger/resultados/ceiba/curso')
    const m = await page.locator('main [data-funcionando]').evaluate(s => {
      const g = s.querySelector<HTMLElement>(':scope > div.grid')!
      return { ancho: s.getBoundingClientRect().width, filas: new Set([...g.children].map(c => Math.round(c.getBoundingClientRect().top))).size }
    })
    f.ok(m.ancho > 700, `a todo lo ancho (${Math.round(m.ancho)} px)`)
    f.ok(m.filas === 1, `las tres cifras en un renglón (${m.filas})`)
    f.cerrar()
  })
})
