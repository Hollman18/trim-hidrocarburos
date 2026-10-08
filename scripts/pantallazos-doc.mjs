/* Los pantallazos anotados del documento del backend (docs/backend/img/):
 * cada pantalla con los datos del demo y, encima de cada cifra que el
 * documento explica, un número que remite a su sección. Se regeneran así:
 *
 *   npm run pantallazos:doc                     # todas
 *   npm run pantallazos:doc -- --solo ger-resumen  # las que empiecen así
 *   npm run pantallazos:doc -- --capturas otra.mjs --salida dir/ --puerto 5196
 *
 * Antes de capturar, cada paso de `antes` toca un botón, escribe en una caja
 * (`escribir`) o escoge en una lista (`elegir`): así se capturan los formularios
 * llenos (la firma de una meta, el cotejo de la asignación oficial).
 *
 * Las capturas y sus marcas están en docs/backend/capturas.mjs. Cada marca
 * ubica un elemento por su texto, su rol y nombre accesible o un selector; el
 * recuadro se ciñe al texto y el número va por fuera, a su izquierda. La
 * ventana crece hasta que nada quede por desplazar (y se encoge si sobra): la
 * captura es la pantalla entera, no lo que cabe en 800 px.
 *
 * Una captura no se guarda si la página lanza un error o si una marca no se
 * encuentra (se dice cuál): un número que apunta a nada engaña más que no
 * tenerlo. Sale con 1 si alguna falló.
 */
import { mkdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import { chromium, devices } from '@playwright/test'

// Las capturas son del demo, aunque haya un .env.local que apunte a un backend.
process.env.VITE_FUENTE = 'demo'
const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const ROLES = ['ger', 'prod', 'sup', 'oper', 'jefe', 'conf', 'tec', 'adm', 'mant', 'plan', 'cont', 'reg']

const opcion = (nombre, porDefecto) => {
  const i = process.argv.indexOf(`--${nombre}`)
  return i > 0 ? process.argv[i + 1] : porDefecto
}
const CAPTURAS = resolve(RAIZ, opcion('capturas', 'docs/backend/capturas.mjs'))
const SALIDA = resolve(RAIZ, opcion('salida', 'docs/backend/img')) + '/'
const SOLO = opcion('solo', '')
const PUERTO = Number(opcion('puerto', '5195'))
/** Alto máximo de la ventana: una tabla sin fin no debe dar una imagen de 40.000 px. */
const ALTO_MAX = 9000

// Las que llenan un formulario antes de capturar pueden venir aparte (CAPTURAS_ESCRITAS).
const modulo = await import(pathToFileURL(CAPTURAS).href)
const TODAS = [...modulo.CAPTURAS, ...(modulo.CAPTURAS_ESCRITAS ?? [])]
const lista = TODAS.filter(c => !SOLO || c.archivo.startsWith(SOLO))
if (!lista.length) throw new Error(`ninguna captura empieza por «${SOLO}» en ${CAPTURAS}`)
const repetidos = lista.map(c => c.archivo).filter((a, i, t) => t.indexOf(a) !== i)
if (repetidos.length) throw new Error(`archivos repetidos: ${repetidos.join(', ')}`)

/** El elemento de una marca: por texto, por rol y nombre, o por selector;
 *  dentro de otro si se pide, y el i-ésimo visible (0 por defecto). */
function ubicar(pagina, m) {
  const raiz = m.dentro ? pagina.locator(m.dentro).filter({ visible: true }).first() : pagina
  let l
  if (m.sel) l = raiz.locator(m.sel)
  else if (m.rol) l = raiz.getByRole(m.rol, m.nombre === undefined ? {} : { name: m.nombre, exact: m.exacto ?? false })
  else if (m.texto !== undefined) l = raiz.getByText(m.texto, { exact: m.exacto ?? false })
  else throw new Error(`la marca ${m.n} no dice cómo ubicarse (texto, rol o sel)`)
  return l.filter({ visible: true }).nth(m.i ?? 0)
}

/** Crece la ventana hasta que ni la vista ni un diálogo abierto se desplacen. */
async function sinDesplazar(pagina, ancho) {
  for (let vuelta = 0; vuelta < 4; vuelta++) {
    const falta = await pagina.evaluate(() => {
      let max = 0
      for (const el of document.querySelectorAll('.vista, [role=dialog] *')) {
        const s = getComputedStyle(el)
        if (!/(auto|scroll)/.test(s.overflowY)) continue
        max = Math.max(max, el.scrollHeight - el.clientHeight)
      }
      return max
    })
    if (falta <= 1) break
    const alto = pagina.viewportSize().height
    await pagina.setViewportSize({ width: ancho, height: Math.min(ALTO_MAX, alto + falta + 8) })
    await pagina.waitForTimeout(300)
    if (alto + falta + 8 >= ALTO_MAX) return
  }
  // Y se encoge si sobra: sin una franja vacía debajo de lo último que se ve.
  const usado = await pagina.evaluate(() => {
    const v = document.querySelector('.vista')
    if (!v || document.querySelector('[role=dialog][aria-modal="true"]')) return 0
    const ultimo = [...v.children].reduce((m, c) => Math.max(m, c.getBoundingClientRect().bottom), 0)
    return Math.ceil(ultimo + parseFloat(getComputedStyle(v).paddingBottom || '0'))
  })
  const alto = pagina.viewportSize().height
  if (usado > 0 && usado < alto - 40) await pagina.setViewportSize({ width: ancho, height: Math.max(600, usado + 4) })
}

/** Dibuja las marcas: un recuadro y un número en un círculo, fuera de la
 *  página (una capa fija encima) para no mover nada de lo que se mide. El
 *  verde azulado no significa nada en la interfaz: rojo, naranja y amarillo
 *  son prioridades, el morado es dato inválido (ISA-101) y el azul, el acento. */
async function dibujar(pagina, cajas) {
  await pagina.evaluate(cajas => {
    const capa = document.createElement('div')
    capa.id = 'marcas-doc'
    capa.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647'
    const W = window.innerWidth, H = window.innerHeight
    for (const { n, x, y, w, h, lado } of cajas) {
      const r = document.createElement('div')
      r.style.cssText = `position:absolute;left:${x - 2}px;top:${y - 2}px;width:${w + 4}px;height:${h + 4}px;` +
        'border:2px solid #00897b;border-radius:3px;box-shadow:0 0 0 1px #fff'
      capa.appendChild(r)
      const b = document.createElement('div')
      // El número va por fuera, para no tapar lo que señala: a la izquierda
      // (o donde diga la marca); si no cabe a la izquierda, encima.
      const d = 20
      let bx = x - d - 6, by = y + h / 2 - d / 2
      if (lado === 'der') bx = x + w + 6
      else if (lado === 'arriba' || bx < 1) { bx = x; by = y - d - 5 }
      else if (lado === 'abajo') { bx = x; by = y + h + 5 }
      bx = Math.max(1, Math.min(W - d - 1, bx)); by = Math.max(1, Math.min(H - d - 1, by))
      b.textContent = String(n)
      b.style.cssText = `position:absolute;left:${bx}px;top:${by}px;width:${d}px;height:${d}px;border-radius:50%;` +
        'background:#00897b;color:#fff;font:700 11px/20px system-ui,sans-serif;text-align:center;' +
        'box-shadow:0 0 0 2px #fff,0 1px 3px rgba(0,0,0,.4)'
      capa.appendChild(b)
    }
    document.body.appendChild(capa)
  }, cajas)
}

const servidor = await createServer({ root: RAIZ, logLevel: 'error', server: { port: PUERTO } })
await servidor.listen()
const base = servidor.resolvedUrls?.local[0]?.replace(/\/$/, '')
if (!base) throw new Error('el servidor de desarrollo no dijo en qué dirección quedó')

const navegador = await chromium.launch()
let fallas = 0
try {
  mkdirSync(SALIDA, { recursive: true })
  for (const c of lista) {
    const telefono = c.telefono === true
    const ancho = c.ancho ?? (telefono ? 390 : 1280)
    const contexto = await navegador.newContext({
      ...(telefono ? devices['iPhone 13'] : {}),
      locale: 'es-CO', timezoneId: 'America/Bogota', colorScheme: 'light', deviceScaleFactor: 2,
      viewport: { width: ancho, height: telefono ? 844 : 800 },
    })
    await contexto.addInitScript(roles => { for (const r of roles) localStorage.setItem(`trim.intro.${r}`, '1') }, ROLES)
    const pagina = await contexto.newPage()
    const errores = []
    pagina.on('pageerror', e => errores.push(e.message.split('\n')[0]))
    const cargada = () => pagina.waitForFunction(
      () => !document.querySelector('[data-cargando]') && (document.querySelector('main')?.innerText ?? '').length > 80, undefined, { timeout: 20_000 })
    const problemas = []
    try {
      await pagina.goto(`${base}/${c.ruta}`)
      await cargada()
      // Lo que se hace antes de capturar, sobre un elemento (un selector, o un rol
      // con su nombre; botón por defecto): escribir en una caja, escoger en una
      // lista o tocarlo.
      for (const paso of c.antes ?? []) {
        const l = (paso.sel ? pagina.locator(paso.sel) : pagina.getByRole(paso.rol ?? 'button', { name: paso.nombre, exact: paso.exacto ?? false }))
          .filter({ visible: true }).first()
        if (paso.escribir !== undefined) await l.fill(paso.escribir)
        else if (paso.elegir !== undefined) await l.selectOption(paso.elegir)
        else await l.click()
        await cargada()
      }
      await pagina.waitForTimeout(700)
      if (c.completa !== false) await sinDesplazar(pagina, ancho)
      const cajas = []
      for (const m of c.marcas ?? []) {
        const l = ubicar(pagina, m)
        if (!(await l.count())) { problemas.push(`marca ${m.n} (${m.nombre ?? m.texto ?? m.sel}) no aparece`); continue }
        // El recuadro se ciñe a lo que se ve (el texto), no al bloque que lo
        // contiene: un rótulo en un bloque de ancho completo daría una franja.
        const caja = await l.evaluate((el, entero) => {
          const e = el.getBoundingClientRect()
          if (entero) return { x: e.x, y: e.y, w: e.width, h: e.height }
          const r = document.createRange(); r.selectNodeContents(el)
          const b = r.getBoundingClientRect()
          return b.width > 0 && b.height > 0 ? { x: b.x, y: b.y, w: b.width, h: b.height } : { x: e.x, y: e.y, w: e.width, h: e.height }
        }, m.caja === 'elemento')
        if (caja.w < 1) { problemas.push(`marca ${m.n} no tiene tamaño`); continue }
        cajas.push({ n: m.n, lado: m.lado, ...caja })
      }
      if (cajas.length) await dibujar(pagina, cajas)
    } catch (e) {
      problemas.push(e.message.split('\n')[0])
    }
    if (errores.length) problemas.push(`la página lanzó un error (${errores.join(' | ')})`)
    if (problemas.length) {
      fallas++
      console.log(`  ✗ ${c.archivo}: ${problemas.join('; ')} — no se guarda`)
    } else {
      const ruta = `${SALIDA}${c.archivo}.png`
      if (c.elemento) await pagina.locator(c.elemento).filter({ visible: true }).first().screenshot({ path: ruta })
      else await pagina.screenshot({ path: ruta })
      console.log(`  ✓ ${c.archivo}.png  ${(c.marcas ?? []).length} marcas  (${c.ruta}${telefono ? ', teléfono' : ''})`)
    }
    await contexto.close()
  }
} finally {
  await navegador.close()
  await servidor.close()
}
console.log(`\n${lista.length - fallas} de ${lista.length} capturas en ${SALIDA}`)
if (fallas) process.exit(1)
