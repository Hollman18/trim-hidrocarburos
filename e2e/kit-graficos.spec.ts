/* D2 · Los gráficos del kit SCADA al pasar el cursor, con el teclado y en el teléfono (kit-scada.md §2,
   «La ficha»). Cada prueba lee el punto en el dibujo y lo compara con la cifra que la pantalla ya escribe
   (la cabecera del mes, el total del mes, la producción de la planta viva): la ficha dice lo mismo que la
   pantalla, nunca otra cifra. Y lo que pide el auditor: la ficha no se sale de la pantalla, su letra es
   de 12 px o más, y abrirla no agrega ningún hallazgo del detector. */
import { devices, type Locator, type Page } from '@playwright/test'
import { test } from './apoyo.ts'
import { detectar, type Hallazgo } from './auditoria/detector.ts'

/** La ficha abierta: su texto, su caja, la ventana y la letra más chica que lleva. */
const leerFicha = (page: Page) => page.evaluate(() => {
  const f = document.querySelector<HTMLElement>('[data-ficha]')
  if (!f || f.style.visibility === 'hidden') return null
  const r = f.getBoundingClientRect()
  const letras = [...f.querySelectorAll<HTMLElement>('*')].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent!.trim()))
    .map(e => parseFloat(getComputedStyle(e).fontSize))
  const valor = (clave: string) => f.querySelector(`[data-ficha-valor="${CSS.escape(clave)}"]`)?.textContent ?? null
  return {
    titulo: f.querySelector('[data-ficha-titulo]')?.textContent ?? '', texto: f.innerText,
    caja: { l: r.left, t: r.top, r: r.right, b: r.bottom }, vw: document.documentElement.clientWidth, vh: innerHeight,
    letraMin: Math.min(...letras),
    valores: Object.fromEntries([...f.querySelectorAll('[data-ficha-valor]')].map(e => [e.getAttribute('data-ficha-valor'), e.textContent ?? ''])),
    total: valor('total'),
  }
})
type Ficha = NonNullable<Awaited<ReturnType<typeof leerFicha>>>

/** Lo que pide el auditor de una ficha: adentro de la ventana y ningún texto de menos de 12 px. */
function auditarFicha(f: { ok: (c: boolean, m: string) => void }, x: Ficha | null, donde: string) {
  f.ok(!!x, `${donde}: la ficha se abre`)
  if (!x) return
  f.ok(x.caja.l >= 0 && x.caja.t >= 0 && x.caja.r <= x.vw && x.caja.b <= x.vh, `${donde}: la ficha no se sale de la pantalla (${x.caja.l.toFixed(0)},${x.caja.t.toFixed(0)}–${x.caja.r.toFixed(0)},${x.caja.b.toFixed(0)} en ${x.vw}×${x.vh})`)
  f.ok(x.letraMin >= 12, `${donde}: la letra de la ficha es de 12 px o más (${x.letraMin})`)
}

const clave = (h: Hallazgo) => `${h[0]}|${h[1]}`
/** Los hallazgos del detector que aparecen al abrir la ficha (ninguno: la ficha no tapa ni rompe nada). */
async function sinHallazgosNuevos(page: Page, abrir: () => Promise<void>) {
  const antes = new Set((await page.evaluate(detectar)).map(clave))
  await abrir()
  return (await page.evaluate(detectar)).filter(h => !antes.has(clave(h)))
}

/** Mueve el ratón al lugar i de una gráfica de n lugares (el área del dibujo, entre sus márgenes). */
async function alLugar(page: Page, svg: Locator, i: number, n: number) {
  const zona = await svg.locator('[data-zona]').boundingBox()
  if (!zona) throw new Error('la gráfica no tiene zona del cursor')
  await page.mouse.move(zona.x + (i / (n - 1)) * zona.width, zona.y + zona.height / 2)
  await page.waitForTimeout(120)
}

test('Mes a mes, con el ratón: la raya de seguimiento, el punto de cada serie y la ficha con el mes y sus dos cifras', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/ger/resultados/ceiba/curso')
  const tarjeta = page.locator('main [data-mes-a-mes]')
  const svg = tarjeta.locator('[data-kit="tendencia"] svg').first()
  await svg.scrollIntoViewIfNeeded()
  // La cabecera ya escribe el mes en curso («octubre: 661 bbl/d»): la ficha del último mes dice lo mismo.
  const cabecera = (await tarjeta.innerText()).match(/octubre: ([\d.]+) bbl\/d/)?.[1] ?? '?'
  // Los lugares de la gráfica: los puntos de su primera serie (13 meses, sin huecos).
  const n = ((await svg.locator('[data-serie] path').first().getAttribute('d')) ?? '').match(/[ML]/g)?.length ?? 0
  const nuevos = await sinHallazgosNuevos(page, () => alLugar(page, svg, n - 1, n))
  const x = await leerFicha(page)
  auditarFicha(f, x, 'mes a mes')
  f.ok(!!x && /^Octubre 2026/.test(x.titulo), `la ficha dice el mes del punto («${x?.titulo}»)`)
  f.ok(!!x && x.valores['Todo lo diferido'] === `${cabecera}bbl/d`, `todo lo diferido: lo mismo que la cabecera (${x?.valores['Todo lo diferido']} contra ${cabecera})`)
  f.ok(!!x && /\d/.test(x.valores['Lo de alto impacto'] ?? ''), `y lo de alto impacto, con su cifra (${x?.valores['Lo de alto impacto']})`)
  f.ok(!!x && /Máximo firmado en 800 bbl\/d/.test(x.texto) && /bajo el máximo firmado \(800\)/.test(x.texto), 'el límite al pie y el estado del valor en palabras')
  f.ok(await svg.locator('[data-cursor] line').count() === 1 && await svg.locator('[data-cursor] [data-punto]').count() === 2, 'la raya vertical de seguimiento y el punto resaltado en cada serie')
  f.ok(nuevos.length === 0, `abrir la ficha no agrega hallazgos del auditor${nuevos.length ? `: ${nuevos.map(h => h.join(' ')).join(' | ')}` : ''}`)
  // La leyenda: tocar una serie la deja sola; otra vez, vuelven las dos. La escala no se mueve.
  const piso = await svg.locator('[data-piso]').getAttribute('y')
  await tarjeta.locator('[data-leyenda-serie="Lo de alto impacto"]').click()
  f.ok(await svg.locator('[data-serie]').count() === 1 && await tarjeta.locator('[data-leyenda-serie="Todo lo diferido"]').getAttribute('aria-pressed') === 'false', 'tocar una serie la deja sola')
  f.ok(await svg.locator('[data-piso]').getAttribute('y') === piso, 'aislar una serie no mueve la escala')
  await tarjeta.locator('[data-leyenda-serie="Lo de alto impacto"]').click()
  f.ok(await svg.locator('[data-serie]').count() === 2, 'otra vez: las dos')
  await page.mouse.move(2, 2)
  await page.waitForTimeout(120)
  f.ok(!(await leerFicha(page)), 'al salir el ratón, la ficha se cierra')
  f.cerrar()
})

test('Mes a mes, con el teclado: foco en la gráfica, las flechas recorren los meses y el valor se anuncia', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/ger/resultados/ceiba/curso')
  const svg = page.locator('main [data-mes-a-mes] [data-kit="tendencia"] svg').first()
  f.ok(await svg.getAttribute('tabindex') === '0', 'la gráfica es una parada del teclado')
  await svg.focus()
  await page.keyboard.press('End')
  const ultimo = await leerFicha(page)
  await page.keyboard.press('ArrowLeft')
  const x = await leerFicha(page)
  auditarFicha(f, x, 'teclado')
  f.ok(!!ultimo && /^Octubre 2026/.test(ultimo.titulo) && !!x && /^Septiembre 2026/.test(x.titulo), `Fin lleva al último mes y ← al anterior («${ultimo?.titulo}» → «${x?.titulo}»)`)
  const anuncio = await page.locator('main [data-mes-a-mes] [data-anuncio]').innerText()
  f.ok(anuncio.startsWith('Septiembre 2026') && !!x && anuncio.includes(`Todo lo diferido: ${x.valores['Todo lo diferido']!.replace('bbl/d', '')} bbl/d`),
    `la región viva anuncia el mes y su valor, el mismo de la ficha («${anuncio.slice(0, 80)}»)`)
  await page.keyboard.press('Home')
  f.ok(/^Octubre 2025/.test((await leerFicha(page))?.titulo ?? ''), 'Inicio lleva al primer mes')
  await page.keyboard.press('Escape')
  f.ok(!(await leerFicha(page)), 'Escape cierra la ficha')
  f.cerrar()
})

test('Fallas por mes: la columna bajo el cursor y su ficha con el total que la pantalla escribe', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/conf/confiabilidad/morichal/curso')
  const svg = page.locator('main svg[data-fallas-por-mes]')
  await svg.scrollIntoViewIfNeeded()
  const mes = svg.locator('g[data-fallas]').filter({ has: page.locator('rect') }).last()
  const fallas = await mes.getAttribute('data-fallas')
  const caja = (await mes.boundingBox())!
  await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2)
  await page.waitForTimeout(150)
  const x = await leerFicha(page)
  auditarFicha(f, x, 'columnas')
  f.ok(!!x && x.total === `${fallas}fallas`, `el total de la ficha es el del mes (${x?.total} contra ${fallas})`)
  f.ok(!!x && Object.keys(x.valores).length === 4, 'una fila por familia y el total')
  f.ok(await svg.locator('[data-cursor]').count() === 1, 'el período bajo el cursor, resaltado')
  f.cerrar()
})

test('La barra contra la meta de la planta viva: el cursor muestra el valor, la banda y la escala', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/ger/planta-viva/ceiba/curso')
  const seccion = page.locator('main [data-produccion]').first()
  const barra = seccion.locator('[data-kit="barra"]')
  await barra.scrollIntoViewIfNeeded()
  const real = Math.round(Number(await seccion.getAttribute('data-produccion'))).toLocaleString('es-CO')
  await barra.hover()
  await page.waitForTimeout(120)
  const x = await leerFicha(page)
  auditarFicha(f, x, 'barra')
  f.ok(!!x && x.valores.valor === `${real}bbl/d`, `el valor de la ficha es la producción de la pantalla (${x?.valores.valor} contra ${real})`)
  f.ok(!!x && 'banda' in x.valores && 'escala' in x.valores && /firmada/.test(x.texto), 'la banda desde la meta y la escala firmada')
  f.cerrar()
})

test.describe('en el teléfono · 390 px', () => {
  const { defaultBrowserType: _, ...telefono } = devices['iPhone 14']
  test.use(telefono)
  test('tocar la gráfica abre la ficha arriba del dedo y arrastrar de lado la mueve, sin salirse de la pantalla', async ({ flujo: f }) => {
    const { page } = f
    await f.abrir('/#/ger/resultados/ceiba/curso')
    const svg = page.locator('main [data-mes-a-mes] [data-kit="tendencia"] svg').first()
    await svg.scrollIntoViewIfNeeded()
    const zona = (await svg.locator('[data-zona]').boundingBox())!
    const y = zona.y + zona.height / 2
    await page.touchscreen.tap(zona.x + zona.width - 2, y)
    await page.waitForTimeout(150)
    const x = await leerFicha(page)
    auditarFicha(f, x, 'toque')
    f.ok(!!x && /^Octubre 2026/.test(x.titulo), `tocar el último punto abre su mes («${x?.titulo}»)`)
    const caja = await svg.boundingBox()
    f.ok(!!x && !!caja && (x.caja.b <= caja.y + 1 || x.caja.t >= caja.y + caja.height - 1), 'la ficha va arriba (o abajo) de la gráfica: el dedo no la tapa')
    // Arrastrar de lado: el dedo se mueve sobre el dibujo (pointermove táctil) y la ficha lo sigue.
    await svg.evaluate((s, { x0, x1, y }) => {
      const ev = (tipo: string, x: number) => s.dispatchEvent(new PointerEvent(tipo, { pointerType: 'touch', clientX: x, clientY: y, bubbles: true, isPrimary: true, pointerId: 7 }))
      ev('pointerdown', x0)
      for (let k = 1; k <= 6; k++) ev('pointermove', x0 + ((x1 - x0) * k) / 6)
    }, { x0: zona.x + zona.width - 2, x1: zona.x + 2, y })
    await page.waitForTimeout(200)
    const y2 = await leerFicha(page)
    auditarFicha(f, y2, 'arrastre')
    f.ok(!!y2 && /^Octubre 2025/.test(y2.titulo), `arrastrar hasta el borde izquierdo lleva al primer mes («${y2?.titulo}»)`)
    // Tocar fuera la cierra.
    await page.touchscreen.tap(10, 120)
    await page.waitForTimeout(150)
    f.ok(!(await leerFicha(page)), 'tocar fuera cierra la ficha')
    f.cerrar()
  })
})
