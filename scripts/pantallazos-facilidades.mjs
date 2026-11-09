/* Los pantallazos de las facilidades (docs/experiencia-v3/capturas/facilidades/), para el informe final de
 * docs/experiencia-v3/PROMPT-FACILIDADES-POR-FASES.md (§6: la matriz pieza × rol con pantallazos) y para la
 * presentación de venta. Salen de la aplicación con los datos del demo; cuando cambia una pantalla se
 * regeneran así:
 *
 *   node scripts/pantallazos-facilidades.mjs
 *
 * Levanta su propio servidor de desarrollo (fuente demo, puerto 5192). Las del apagón disparan antes el apagón de
 * prueba desde Conectores, como lo hace el administrador, y cambian de rol por la dirección sin recargar (la prueba
 * vive en la sesión del navegador). Sale con 1 si una pantalla lanza un error: no se guarda.
 */
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { chromium } from '@playwright/test'

process.env.VITE_FUENTE = 'demo'
const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const SALIDA = `${RAIZ}docs/experiencia-v3/capturas/facilidades/`
const ROLES = ['ger', 'prod', 'sup', 'oper', 'jefe', 'conf', 'tec', 'reg', 'adm', 'ener']
const ESCRITORIO = { width: 1440, height: 900 }
const TELEFONO = { width: 390, height: 844 }

/** `apagon`: antes, el apagón de prueba de ese tipo en La Ceiba. `selector`: solo ese elemento. `tema`: claro u oscuro. */
const PANTALLAS = [
  // Núcleo
  { archivo: 'nucleo-panel-gerente', ruta: '#/ger/panel/ceiba/curso', ventana: { width: 1440, height: 1000 } },
  { archivo: 'nucleo-panel-confiabilidad-telefono-oscuro', ruta: '#/conf/panel/ceiba/curso', ventana: TELEFONO, tema: 'dark' },
  { archivo: 'nucleo-conexion-directa-palmar', ruta: '#/adm/conectores/palmar/curso', ventana: ESCRITORIO },
  // Equipos y Planta
  { archivo: 'planta-vigia-ct601', ruta: '#/conf/equipos/morichal/CT-601', ventana: ESCRITORIO },
  { archivo: 'planta-diluyente-p701-telefono', ruta: '#/jefe/equipos/morichal/P-701', ventana: TELEFONO },
  { archivo: 'equipos-se2-palmar-directo', ruta: '#/jefe/equipos/palmar/SE-2/diagnostico', ventana: ESCRITORIO },
  // Energía
  { archivo: 'energia-apagon-gerente', ruta: '#/ger', apagon: 'total', ventana: ESCRITORIO, selector: 'main [data-aviso-planta]' },
  { archivo: 'energia-apagon-operador-telefono', ruta: '#/oper', apagon: 'total', ventana: TELEFONO },
  { archivo: 'energia-rearranque-supervisor-telefono', ruta: '#/sup', apagon: 'total', ventana: TELEFONO, selector: 'main [data-arranque]' },
  { archivo: 'energia-rearranque-supervisor', ruta: '#/sup', apagon: 'total', ventana: ESCRITORIO },
  { archivo: 'energia-parcial-supervisor', ruta: '#/sup', apagon: 'parcial', ventana: ESCRITORIO },
  // Barriles
  { archivo: 'barriles-perdida-fondos-telefono', ruta: '#/oper', clic: ['[data-registrar-perdida]', '[data-tipo-perdida="fondos"]'], ventana: TELEFONO },
  // Mantenimiento
  { archivo: 'mantenimiento-jefe', ruta: '#/jefe/hoy/ceiba/curso', ventana: ESCRITORIO },
]

const servidor = await createServer({ root: RAIZ, logLevel: 'error', server: { port: 5192, strictPort: true } })
await servidor.listen()
const base = servidor.resolvedUrls?.local[0]?.replace(/\/$/, '')
if (!base) throw new Error('el servidor de desarrollo no dijo en qué dirección quedó')

const navegador = await chromium.launch()
let fallas = 0
try {
  mkdirSync(SALIDA, { recursive: true })
  for (const p of PANTALLAS) {
    const movil = p.ventana.width < 500
    const contexto = await navegador.newContext({
      locale: 'es-CO', timezoneId: 'America/Bogota', colorScheme: p.tema ?? 'light', deviceScaleFactor: movil ? 2 : 1, viewport: p.ventana,
      ...(movil ? { isMobile: true, hasTouch: true } : {}),
    })
    await contexto.addInitScript(roles => { for (const r of roles) localStorage.setItem(`trim.intro.${r}`, '1') }, ROLES)
    const pagina = await contexto.newPage()
    const errores = []
    pagina.on('pageerror', e => errores.push(e.message.split('\n')[0]))
    const cargada = () => pagina.waitForFunction(
      () => !document.querySelector('[data-cargando]') && (document.querySelector('main')?.innerText ?? '').length > 80, undefined, { timeout: 20_000 })
    const ir = async hash => { await pagina.evaluate(h => { location.hash = h }, hash); await pagina.waitForTimeout(900); await cargada() }
    if (p.apagon) {
      await pagina.goto(`${base}/#/adm/conectores/ceiba/curso`)
      await cargada()
      await pagina.locator(`[data-probar-apagon="${p.apagon}"]`).click()
      await pagina.locator(`[data-prueba-apagon="${p.apagon}"]`).waitFor()
      await ir(p.ruta)
    } else {
      await pagina.goto(`${base}/${p.ruta}`)
      await cargada()
    }
    for (const c of p.clic ?? []) { await pagina.locator(c).first().click(); await pagina.waitForTimeout(500) }
    await pagina.waitForTimeout(900)
    if (errores.length) { fallas++; console.log(`  ✗ ${p.archivo}: la página lanzó un error (${errores.join(' | ')}); no se guarda`) }
    else {
      const ruta = `${SALIDA}${p.archivo}.png`
      if (p.selector) { const el = pagina.locator(p.selector).first(); await el.scrollIntoViewIfNeeded(); await el.screenshot({ path: ruta }) }
      else await pagina.screenshot({ path: ruta, fullPage: movil })
      console.log(`  ✓ ${p.archivo}.png  (${p.ruta}${p.apagon ? `, apagón ${p.apagon} de prueba` : ''})`)
    }
    await contexto.close()
  }
} finally {
  await navegador.close()
  await servidor.close()
}
console.log(`\n${PANTALLAS.length - fallas} de ${PANTALLAS.length} pantallazos en docs/experiencia-v3/capturas/facilidades/`)
if (fallas) process.exit(1)
