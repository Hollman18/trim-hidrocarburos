/* Capturas del capítulo 6C que el generador (scripts/pantallazos-doc.mjs) no
 * puede hacer porque hay que escribir en cajas de texto: el administrador
 * cambia el esquema de planta de Guacamayo en Configuración (un pozo nuevo en
 * «Pozos productores» y una bomba de respaldo, P-201D, en el tren de agua: Guacamayo ya tiene P-201A, B y C) y después se
 * ve la Planta con el cambio.
 *
 *   node docs/backend/capturas/guiones/planta.mjs [--salida docs/backend/img] [--puerto 5197]
 *
 * Va en docs/backend/capturas/guiones/ del repositorio (los imports de Vite y
 * Playwright se resuelven con el node_modules del repo). La salida por
 * defecto es docs/backend/img/; una ruta relativa se toma desde la raíz del
 * repo. Levanta su propio Vite (VITE_FUENTE=demo) en el puerto pedido y falla
 * si está ocupado. Dibuja las marcas igual que el generador. Sale con 1 si un
 * paso o una marca no se encuentra o si la página lanza un error: no deja una
 * captura a medias.
 *
 * Capturas: adm-configuracion-esquema-guacamayo.png, adm-planta-guacamayo-cambio.png */
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
const PUERTO = Number(opcion('puerto', '5197'))
if (!Number.isInteger(PUERTO)) { console.error('✗ --puerto debe ser un número'); process.exit(1) }
const ROLES = ['ger', 'prod', 'sup', 'oper', 'jefe', 'conf', 'tec', 'adm', 'mant', 'plan', 'cont', 'reg']

/** Ubica cada marca (por texto, rol y nombre o selector; dentro de otro si se
 *  pide; la i-ésima visible) y dibuja recuadro y número como el generador. */
async function dibujar(p, marcas) {
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
  await p.evaluate(cajas => {
    const capa = document.createElement('div')
    capa.id = 'marcas-doc'
    capa.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647'
    const W = innerWidth, H = innerHeight
    for (const { n, x, y, w, h, lado } of cajas) {
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
  }, cajas)
}

/** La ventana crece hasta que la vista no se desplace: la captura es la pantalla entera. */
async function crecer(p, ancho) {
  const alto = await p.evaluate(() => {
    const v = document.querySelector('.vista')
    return v ? v.scrollHeight + (v.getBoundingClientRect().top || 0) + 8 : 0
  })
  if (!alto) throw new Error('la página no tiene .vista')
  await p.setViewportSize({ width: ancho, height: Math.min(9000, Math.max(800, Math.ceil(alto))) })
  await p.waitForTimeout(400)
}

const cargada = p => p.waitForFunction(
  () => !document.querySelector('[data-cargando]') && (document.querySelector('main')?.innerText ?? '').length > 80, undefined, { timeout: 20_000 })

const servidor = await createServer({ root: RAIZ, logLevel: 'error', server: { port: PUERTO, strictPort: true } })
await servidor.listen()
const base = servidor.resolvedUrls?.local[0]?.replace(/\/$/, '')
if (!base) throw new Error('el servidor de desarrollo no dijo en qué dirección quedó')
const navegador = await chromium.launch()
const errores = []
try {
  mkdirSync(SALIDA, { recursive: true })
  const ctx = await navegador.newContext({ locale: 'es-CO', timezoneId: 'America/Bogota', colorScheme: 'light', deviceScaleFactor: 2, viewport: { width: 1512, height: 900 } })
  await ctx.addInitScript(roles => { for (const r of roles) localStorage.setItem(`trim.intro.${r}`, '1') }, ROLES)
  const p = await ctx.newPage()
  p.on('pageerror', e => errores.push(e.message.split('\n')[0]))

  // 1 · Configuración de Guacamayo → «Esquema de planta»: un pozo y una bomba de respaldo, sin instrumentar.
  await p.goto(`${base}/#/adm/configuracion/guacamayo/curso`)
  await cargada(p)
  const resumen = p.locator('main summary', { hasText: 'Esquema de planta' })
  if (!(await resumen.count())) throw new Error('no aparece «Esquema de planta» en Configuración')
  await resumen.first().click()
  await p.waitForTimeout(300)
  const caja = p.getByPlaceholder('Nombre · p. ej. LC-22 · ESP')
  const fPozo = p.locator('form', { has: caja }).first()
  if (!(await fPozo.count())) throw new Error('no aparece el formulario de «Pozos productores»')
  await fPozo.getByPlaceholder('Nombre · p. ej. LC-22 · ESP').fill('GU-13 · ESP')
  await fPozo.getByRole('button', { name: 'Agregar' }).click()
  await p.waitForTimeout(300)
  const panelAgua = p.locator('section, div').filter({ has: p.getByText('TREN DE AGUA', { exact: true }) }).filter({ has: p.getByRole('button', { name: 'Montar' }) }).last()
  const fAgua = panelAgua.locator('form').last()
  if (!(await fAgua.count())) throw new Error('no aparece el formulario del tren de agua')
  await fAgua.getByLabel('Tipo de elemento').selectOption({ label: 'Bomba de reinyección' })
  await fAgua.getByLabel('Nombre del elemento').fill('P-201D · respaldo')
  await fAgua.getByRole('button', { name: 'Montar' }).click()
  await p.waitForTimeout(400)
  if (!(await p.getByText('CAMBIOS DEL ESQUEMA', { exact: true }).count())) throw new Error('el cambio no quedó registrado (no aparece «CAMBIOS DEL ESQUEMA»)')
  await crecer(p, 1512)
  // Se captura solo el esquema (lo de arriba es la Configuración técnica, que va en 6A).
  const esquema = p.locator('main details', { has: p.locator('summary', { hasText: 'Esquema de planta' }) }).first()
  if (!(await esquema.count())) throw new Error('no aparece el bloque «Esquema de planta»')
  await dibujar(p, [
    { n: 1, texto: 'CAMBIOS DEL ESQUEMA', exacto: true, lado: 'der' },
    { n: 2, texto: /montó P-201D · respaldo/, lado: 'der' },
    { n: 3, texto: /agregó GU-13 · ESP \(GU-13\)/, lado: 'der' },
    { n: 4, texto: 'P-201D · respaldo', exacto: true },
    { n: 5, texto: 'GU-13 · ESP', exacto: true },
    { n: 6, texto: '13 configurados', exacto: true },
    { n: 7, texto: '1 configurados', exacto: true },
    { n: 8, texto: 'TREN DE CRUDO', exacto: true },
    { n: 9, texto: 'BOMBAS DE AGUA', exacto: true, lado: 'der' },
  ])
  if (errores.length) throw new Error(`la página lanzó un error (${errores.join(' | ')})`)
  await esquema.screenshot({ path: `${SALIDA}/adm-configuracion-esquema-guacamayo.png` })
  console.log('  ✓ adm-configuracion-esquema-guacamayo.png  9 marcas')
  await p.evaluate(() => document.getElementById('marcas-doc')?.remove())

  // 2 · A Planta por el riel (el cambio vive en la sesión del demo; en producción lo guarda el servidor).
  await p.setViewportSize({ width: 1512, height: 900 })
  await p.getByRole('group', { name: 'Pantallas' }).getByRole('button', { name: 'Planta' }).click()
  await p.waitForFunction(() => (document.querySelector('main')?.innerText ?? '').includes('CAPTURANDO DATOS'), undefined, { timeout: 20_000 })
  await p.waitForTimeout(600)
  await crecer(p, 1512)
  await dibujar(p, [
    { n: 1, texto: '8 de 12', exacto: true },
    { n: 2, texto: 'P-201D · respaldo', exacto: true, i: 0 },
    { n: 3, texto: '4 equipos', exacto: true },
    { n: 4, texto: 'P-201D · respaldo', exacto: true, i: 1, lado: 'arriba' },
    { n: 5, rol: 'button', nombre: 'Conectores y tags' },
  ])
  if (errores.length) throw new Error(`la página lanzó un error (${errores.join(' | ')})`)
  await p.screenshot({ path: `${SALIDA}/adm-planta-guacamayo-cambio.png` })
  console.log('  ✓ adm-planta-guacamayo-cambio.png  5 marcas')
} catch (e) {
  console.error(`  ✗ ${e.message.split('\n')[0]} — no se guarda`)
  process.exitCode = 1
} finally {
  await navegador.close()
  await servidor.close()
}
