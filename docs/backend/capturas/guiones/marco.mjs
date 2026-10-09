/* Capturas del capítulo 6C (el marco común) que el generador
 * (scripts/pantallazos-doc.mjs) no puede hacer: la introducción de cada rol
 * (el generador siempre la salta) y el papel (hay que emular la impresión),
 * con folio (Exportar → Informe en PDF) y sin folio (Ctrl+P).
 *
 *   node docs/backend/capturas/guiones/marco.mjs [--salida docs/backend/img] [--puerto 5198]
 *
 * Va en docs/backend/capturas/guiones/ del repositorio (los imports de Vite y
 * Playwright se resuelven con el node_modules del repo). La salida por
 * defecto es docs/backend/img/; una ruta relativa se toma desde la raíz del
 * repo. Levanta su propio Vite (VITE_FUENTE=demo) en el puerto pedido y falla
 * si está ocupado. Dibuja las marcas igual que el generador. Sale con 1 si un
 * paso o una marca no se encuentra o si la página lanza un error; cada
 * captura se guarda solo si todas sus marcas aparecieron.
 *
 * Capturas: marco-intro-jefe-paso1.png, marco-intro-jefe-paso2.png,
 * marco-intro-ger-paso2.png, marco-papel-folio.png, marco-papel-sin-folio.png */
import { existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { chromium } from '@playwright/test'

process.env.VITE_FUENTE = 'demo'
const RAIZ = fileURLToPath(new URL('../../../../', import.meta.url))
if (!existsSync(resolve(RAIZ, 'package.json')) || !existsSync(resolve(RAIZ, 'src/App.tsx'))) {
  console.error(`✗ este guion va en docs/backend/capturas/guiones/ del repositorio (no encontré el repo en ${RAIZ})`)
  process.exit(1)
}
const opcion = (nombre, porDefecto) => {
  const i = process.argv.indexOf(`--${nombre}`)
  if (i < 0) return porDefecto
  const v = process.argv[i + 1]
  if (!v || v.startsWith('--')) { console.error(`✗ falta el valor de --${nombre}`); process.exit(1) }
  return v
}
const SALIDA = resolve(RAIZ, opcion('salida', 'docs/backend/img'))
const PUERTO = Number(opcion('puerto', '5198'))
if (!Number.isInteger(PUERTO)) { console.error('✗ --puerto debe ser un número'); process.exit(1) }
const ROLES = ['ger', 'prod', 'sup', 'oper', 'jefe', 'conf', 'tec', 'adm', 'mant', 'plan', 'cont', 'reg']

/** Ubica cada marca y dibuja recuadro y número como el generador. Con
 *  `absoluta`, la capa va sobre el documento entero (el papel se desplaza). */
async function dibujar(p, marcas, absoluta = false) {
  const cajas = []
  for (const m of marcas) {
    const raiz = m.dentro ? p.locator(m.dentro).filter({ visible: true }).first() : p
    const l = (m.sel ? raiz.locator(m.sel)
      : m.rol ? raiz.getByRole(m.rol, { name: m.nombre, exact: m.exacto ?? false })
      : raiz.getByText(m.texto, { exact: m.exacto ?? false })).filter({ visible: true }).nth(m.i ?? 0)
    if (!(await l.count())) throw new Error(`marca ${m.n} (${m.texto ?? m.nombre ?? m.sel}) no aparece`)
    const c = await l.evaluate((el, entero) => {
      const e = el.getBoundingClientRect()
      if (entero) return { x: e.x, y: e.y, w: e.width, h: e.height }
      const r = document.createRange(); r.selectNodeContents(el)
      const b = r.getBoundingClientRect()
      return b.width > 0 && b.height > 0 ? { x: b.x, y: b.y, w: b.width, h: b.height } : { x: e.x, y: e.y, w: e.width, h: e.height }
    }, m.caja === 'elemento')
    if (c.w < 1) throw new Error(`marca ${m.n} no tiene tamaño`)
    cajas.push({ n: m.n, lado: m.lado, ...c })
  }
  await p.evaluate(({ cajas, abs }) => {
    const capa = document.createElement('div')
    capa.id = 'marcas-doc'
    capa.style.cssText = `position:${abs ? 'absolute' : 'fixed'};left:0;top:0;width:100%;` +
      `height:${abs ? document.documentElement.scrollHeight + 'px' : '100%'};pointer-events:none;z-index:2147483647`
    const W = innerWidth, H = abs ? document.documentElement.scrollHeight : innerHeight, sy = abs ? scrollY : 0
    for (const { n, x, y: y0, w, h, lado } of cajas) {
      const y = y0 + sy
      const r = document.createElement('div')
      r.style.cssText = `position:absolute;left:${x - 2}px;top:${y - 2}px;width:${w + 4}px;height:${h + 4}px;` +
        'border:2px solid #00897b;border-radius:3px;box-shadow:0 0 0 1px #fff'
      capa.appendChild(r)
      const b = document.createElement('div')
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
  }, { cajas, abs: absoluta })
}
const quitarMarcas = p => p.evaluate(() => document.getElementById('marcas-doc')?.remove())

const cargada = p => p.waitForFunction(
  () => !document.querySelector('[data-cargando]') && (document.querySelector('main')?.innerText ?? '').length > 80, undefined, { timeout: 20_000 })

const servidor = await createServer({ root: RAIZ, logLevel: 'error', server: { port: PUERTO, strictPort: true } })
await servidor.listen()
const base = servidor.resolvedUrls?.local[0]?.replace(/\/$/, '')
if (!base) throw new Error('el servidor de desarrollo no dijo en qué dirección quedó')
const navegador = await chromium.launch()

/** Un contexto nuevo: sin la marca de la introducción (para verla) o con ella;
 *  `window.print` anulado (Exportar abre la ventana de imprimir). */
async function nuevo(conIntro) {
  const ctx = await navegador.newContext({ locale: 'es-CO', timezoneId: 'America/Bogota', colorScheme: 'light', deviceScaleFactor: 2, viewport: { width: 1280, height: 900 } })
  await ctx.addInitScript(({ roles, saltar }) => {
    window.print = () => {}
    if (saltar) for (const r of roles) localStorage.setItem(`trim.intro.${r}`, '1')
  }, { roles: ROLES, saltar: !conIntro })
  const p = await ctx.newPage()
  const errores = []
  p.on('pageerror', e => errores.push(e.message.split('\n')[0]))
  const revisar = () => { if (errores.length) throw new Error(`la página lanzó un error (${errores.join(' | ')})`) }
  return { ctx, p, revisar }
}

/** El diálogo de la introducción, con un margen para que quepan los números. */
async function recorte(p, ruta) {
  const caja = await p.getByRole('dialog').locator('> div.relative').boundingBox()
  if (!caja) throw new Error('no se encontró la caja del diálogo de la introducción')
  await p.screenshot({ path: ruta, clip: { x: Math.max(0, caja.x - 34), y: Math.max(0, caja.y - 30), width: caja.width + 68, height: caja.height + 60 } })
}

let fallas = 0
const hecho = (archivo, n) => console.log(`  ✓ ${archivo}  ${n} marcas`)
async function captura(nombre, trabajo) {
  try { await trabajo() } catch (e) { fallas++; console.error(`  ✗ ${nombre}: ${e.message.split('\n')[0]} — no se guarda`) }
}

try {
  mkdirSync(SALIDA, { recursive: true })

  // 1 · La introducción: jefe de mantenimiento (pasos 1 y 2) y gerente (paso 2, nivel decisión).
  for (const [rol, pantalla] of [['jefe', 'mantenimiento'], ['ger', 'resumen']]) {
    await captura(`introducción de ${rol}`, async () => {
      const { ctx, p, revisar } = await nuevo(true)
      try {
        await p.goto(`${base}/#/${rol}/${pantalla}/ceiba/curso`)
        await p.getByRole('dialog', { name: 'Introducción' }).waitFor({ timeout: 20_000 })
        await p.waitForTimeout(500)
        if (rol === 'jefe') {
          const marcas = [
            { n: 1, texto: 'Camilo Rueda', exacto: true, dentro: '[role=dialog]' },
            { n: 2, texto: 'Jefe de mantenimiento', exacto: true, dentro: '[role=dialog]' },
            { n: 3, texto: /^Respondes por que los barriles/ },
            { n: 4, texto: 'QUÉ HACE', exacto: true },
            { n: 5, rol: 'button', nombre: /^Siguiente/ },
          ]
          await dibujar(p, marcas)
          revisar()
          await recorte(p, `${SALIDA}/marco-intro-jefe-paso1.png`)
          hecho('marco-intro-jefe-paso1.png', marcas.length)
          await quitarMarcas(p)
        }
        await p.getByRole('button', { name: /^Siguiente/ }).click()
        await p.waitForTimeout(400)
        const marcas = rol === 'jefe'
          ? [{ n: 1, texto: 'SUS PANTALLAS', exacto: true }, { n: 2, texto: 'Qué atacar para bajar el diferido de alto impacto.' },
             { n: 3, rol: 'button', nombre: /^Bombas/, dentro: '[role=dialog]' }, { n: 4, rol: 'button', nombre: 'Entrar con la lectura activada' }]
          : [{ n: 1, texto: 'Lo perdido contra la meta, su valor y a qué equipo.' }, { n: 2, texto: 'Qué se pierde ahora y qué va a fallar.' }]
        await dibujar(p, marcas)
        revisar()
        await recorte(p, `${SALIDA}/marco-intro-${rol}-paso2.png`)
        hecho(`marco-intro-${rol}-paso2.png`, marcas.length)
      } finally { await ctx.close() }
    })
  }

  // 2 · El papel de Riesgo (jefe, La Ceiba): con folio (Exportar → Informe en PDF) y sin folio (Ctrl+P).
  for (const conFolio of [true, false]) {
    const archivo = `marco-papel-${conFolio ? 'folio' : 'sin-folio'}.png`
    await captura(archivo, async () => {
      const { ctx, p, revisar } = await nuevo(false)
      try {
        await p.goto(`${base}/#/jefe/riesgo/ceiba/curso`)
        await cargada(p)
        if (conFolio) {
          await p.getByRole('button', { name: 'Exportar', exact: true }).click()
          await p.getByRole('button', { name: /^Informe en PDF/ }).click()
          await p.getByText(/^Folio INF-/).first().waitFor({ state: 'attached', timeout: 20_000 })
          await p.waitForTimeout(400)
        }
        await p.emulateMedia({ media: 'print' })
        await p.setViewportSize({ width: 900, height: 1200 })
        await p.waitForTimeout(600)
        // Un margen blanco para que los números no tapen el texto.
        await p.evaluate(() => { document.body.style.padding = '24px 40px'; document.body.style.boxSizing = 'border-box' })
        await p.waitForTimeout(200)
        const alto = await p.evaluate(() => {
          const pie = document.querySelector('footer.solo-impresion')
          return pie ? Math.ceil(pie.getBoundingClientRect().bottom + scrollY + 30) : 0
        })
        if (!alto) throw new Error('no aparece el pie del papel (footer.solo-impresion)')
        await p.setViewportSize({ width: 980, height: Math.min(9000, alto) })
        await p.waitForTimeout(300)
        const marcas = conFolio
          ? [{ n: 1, texto: 'Operadora de demostración', exacto: true, i: 0 }, { n: 2, texto: /^Folio INF-/, i: 0 }, { n: 3, texto: 'DATOS DE DEMOSTRACIÓN', exacto: true, i: 0 },
             { n: 4, texto: 'PROVISIONAL · MES EN CURSO', exacto: true }, { n: 5, texto: /^Generado el / }, { n: 6, texto: /^Por .* Datos hasta el / }, { n: 7, texto: /^Exposición:/ },
             { n: 8, texto: /^Nota de cálculo\./ }, { n: 9, texto: /huella SHA-256/ }, { n: 10, texto: /^Cifras protegidas/ },
             { n: 11, texto: /Octubre, en curso · 1 de oct de 2026/, i: 0 }, { n: 12, texto: /^Pozos parados: 2/, lado: 'der' }]
          : [{ n: 1, texto: 'Impresión sin folio', exacto: true }, { n: 2, texto: 'SIN FOLIO', exacto: true }, { n: 3, texto: 'no sirve como respaldo', exacto: true }, { n: 4, texto: /^Sin folio\./ },
             { n: 5, texto: /^Datos hasta el / }]
        await dibujar(p, marcas, true)
        revisar()
        await p.screenshot({ path: `${SALIDA}/${archivo}` })
        hecho(archivo, marcas.length)
      } finally { await ctx.close() }
    })
  }
} finally {
  await navegador.close()
  await servidor.close()
}
if (fallas) { console.error(`\n${fallas} captura(s) sin guardar`); process.exit(1) }
