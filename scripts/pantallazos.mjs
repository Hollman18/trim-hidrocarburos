/* Los pantallazos del README (docs/pantallas/), sacados de la aplicación con
 * los datos del demo. Cuando cambia una pantalla se regeneran así, en vez de
 * capturarlos a mano:
 *
 *   npm run pantallazos
 *
 * Levanta su propio servidor de desarrollo (fuente demo), abre cada pantalla
 * en Chrome con la introducción del rol ya vista, espera a que no quede nada
 * «Cargando…» y la captura. Sale con 1 si una pantalla no carga o la página
 * lanza un error: un pantallazo de una pantalla rota no se guarda.
 */
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { chromium } from '@playwright/test'

// Los pantallazos son del demo, aunque haya un .env.local que apunte a un backend.
process.env.VITE_FUENTE = 'demo'
const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const SALIDA = `${RAIZ}docs/pantallas/`
const ROLES = ['ger', 'prod', 'sup', 'oper', 'jefe', 'conf', 'tec', 'reg', 'adm']

/** Archivo y ruta; si hace falta, el botón que se toca antes de capturar, el
 *  elemento que se captura solo (en vez de la ventana) y otro tamaño de ventana. */
const PANTALLAS = [
  // 28-oct · Las pantallas de la v3, una o dos por rol, con los tonos de «qué atacar» y el historial. `clic`: un
  // elemento (CSS) que se toca antes de capturar; `selector`: se captura solo ese elemento; `movil`: en el teléfono.
  { archivo: 'planta-viva-gerente', ruta: '#/ger/planta-viva/ceiba~portafolio/curso', ventana: { width: 1440, height: 900 } },
  { archivo: 'historial-gerente', ruta: '#/ger/planta-viva/ceiba~portafolio/curso', selector: 'main [data-historial="mes"]', ventana: { width: 1440, height: 900 } },
  { archivo: 'ficha-p201b-gerente', ruta: '#/ger/planta-viva/ceiba/curso/P-201B', ventana: { width: 1440, height: 900 } },
  { archivo: 'traza-planta', ruta: '#/ger/planta-viva/ceiba~portafolio/curso', clic: 'main [data-balance] [data-tramo-balance="planta"] button', ventana: { width: 1440, height: 900 } },
  { archivo: 'planta-viva-produccion', ruta: '#/prod/planta-viva/ceiba/curso', ventana: { width: 1440, height: 900 } },
  { archivo: 'hoy-supervisor', ruta: '#/sup/hoy/ceiba/curso', ventana: { width: 1440, height: 900 } },
  { archivo: 'turnos-supervisor', ruta: '#/sup/hoy/ceiba/curso', selector: 'main [data-historial="turno"]', ventana: { width: 1440, height: 900 } },
  { archivo: 'hoy-jefe', ruta: '#/jefe/hoy/ceiba/curso', ventana: { width: 1440, height: 900 } },
  { archivo: 'equipos-confiabilidad', ruta: '#/conf/equipos/ceiba', ventana: { width: 1440, height: 900 } },
  { archivo: 'detalle-p201b', ruta: '#/prod/equipos/ceiba/P-201B', ventana: { width: 1512, height: 1000 } },
  { archivo: 'diagnostico-mpp301', ruta: '#/conf/equipos/morichal/MPP-301/diagnostico', ventana: { width: 1440, height: 900 } },
  { archivo: 'configurar-admin', ruta: '#/adm/configuracion/ceiba/curso', ventana: { width: 1440, height: 900 } },
  { archivo: 'operador-telefono', ruta: '#/oper/hoy/ceiba/curso', movil: true },
  { archivo: 'tecnico-telefono', ruta: '#/tec/hoy/ceiba/curso', movil: true },
]

const servidor = await createServer({ root: RAIZ, logLevel: 'error', server: { port: 5190 } })
await servidor.listen()
const base = servidor.resolvedUrls?.local[0]?.replace(/\/$/, '')
if (!base) throw new Error('el servidor de desarrollo no dijo en qué dirección quedó')

const navegador = await chromium.launch()
let fallas = 0
try {
  mkdirSync(SALIDA, { recursive: true })
  for (const p of PANTALLAS) {
    const contexto = await navegador.newContext({
      locale: 'es-CO', timezoneId: 'America/Bogota', colorScheme: 'light', deviceScaleFactor: 2,
      viewport: p.movil ? { width: 390, height: 844 } : p.ventana ?? { width: 1280, height: 800 },
      ...(p.movil ? { isMobile: true, hasTouch: true } : {}),
    })
    await contexto.addInitScript(roles => { for (const r of roles) localStorage.setItem(`trim.intro.${r}`, '1') }, ROLES)
    const pagina = await contexto.newPage()
    const errores = []
    pagina.on('pageerror', e => errores.push(e.message.split('\n')[0]))
    const cargada = () => pagina.waitForFunction(
      () => !document.querySelector('[data-cargando]') && (document.querySelector('main')?.innerText ?? '').length > 80, undefined, { timeout: 20_000 })
    await pagina.goto(`${base}/${p.ruta}`)
    await cargada()
    if (p.clic) {
      await pagina.locator(p.clic).first().click()
      await pagina.waitForTimeout(600)
    }
    if (p.boton) {
      await pagina.getByRole('button', { name: p.boton }).filter({ visible: true }).first().click()
      await cargada()
    }
    await pagina.waitForTimeout(800)
    if (errores.length) { fallas++; console.log(`  ✗ ${p.archivo}: la página lanzó un error (${errores.join(' | ')}); no se guarda`) }
    else {
      const ruta = `${SALIDA}${p.archivo}.png`
      if (p.selector) { const el = pagina.locator(p.selector).first(); await el.scrollIntoViewIfNeeded(); await el.screenshot({ path: ruta }) }
      else if (p.elemento) await pagina.getByRole('group', { name: p.elemento }).screenshot({ path: ruta })
      else await pagina.screenshot({ path: ruta })
      console.log(`  ✓ ${p.archivo}.png  (${p.ruta})`)
    }
    await contexto.close()
  }
} finally {
  await navegador.close()
  await servidor.close()
}
console.log(`\n${PANTALLAS.length - fallas} de ${PANTALLAS.length} pantallazos en docs/pantallas/`)
if (fallas) process.exit(1)
