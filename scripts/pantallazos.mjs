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
  // F4 (P-22): el Resumen, los Diferidos y la Producción del gerente se fundieron en La planta viva y
  // Resultados (C5); su dirección vieja abría otra pantalla. Los nombres de archivo que ya muestra el README
  // se quedan con la pantalla que los reemplaza; las pantallas nuevas llevan el suyo.
  { archivo: 'planta-viva-gerente', ruta: '#/ger/planta-viva/ceiba/curso' },
  { archivo: 'resumen-gerente', ruta: '#/ger/resultados/ceiba~portafolio/curso' },
  { archivo: 'diferidos', ruta: '#/prod/diferidos/ceiba/curso' },
  { archivo: 'hoy-supervisor', ruta: '#/sup/hoy/ceiba/curso' },
  { archivo: 'equipos-confiabilidad', ruta: '#/conf/equipos/ceiba' },
  { archivo: 'bombas-vigia', ruta: '#/conf/bombas/morichal/curso' },
  // El detalle de una bomba es su nivel 3 (C4): la dirección de antes (`#/sup/bombas/…/P-201B`) abre aquí.
  { archivo: 'ficha-bomba-parada', ruta: '#/sup/equipos/ceiba/P-201B' },
  { archivo: 'turno', ruta: '#/sup/turno/ceiba/curso' },
  { archivo: 'whatsapp-operario', ruta: '#/oper/causa/ceiba/curso', boton: 'Ver mi chat de WhatsApp', elemento: /^Chat de WhatsApp de / },
  { archivo: 'confiabilidad', ruta: '#/conf/confiabilidad/morichal/curso' },
  // Mi trabajo se fundió en Hoy (F1, P-trabajo-1): las órdenes de SAP del técnico son tarjetas de su Hoy.
  { archivo: 'ordenes-sap-tecnico', ruta: '#/tec/hoy/ceiba/curso' },
  { archivo: 'reporte-regulatorio', ruta: '#/reg/regulatorio/ceiba/curso' },
  // Septiembre, cerrado: el mes en curso va en su día 2 y su gráfica tendría dos puntos.
  { archivo: 'produccion-cuadre', ruta: '#/prod/produccion/ceiba/cerrado' },
  // El dibujo pide 1184 px: a 1280 se desplaza de lado; a 1512 cabe entero.
  { archivo: 'planta', ruta: '#/prod/planta/ceiba/curso', ventana: { width: 1512, height: 1000 } },
  { archivo: 'metas-firmadas', ruta: '#/ger/configuracion/ceiba/curso' },
  { archivo: 'conectores', ruta: '#/adm/conectores/ceiba/curso' },
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
      viewport: p.ventana ?? { width: 1280, height: 800 },
    })
    await contexto.addInitScript(roles => { for (const r of roles) localStorage.setItem(`trim.intro.${r}`, '1') }, ROLES)
    const pagina = await contexto.newPage()
    const errores = []
    pagina.on('pageerror', e => errores.push(e.message.split('\n')[0]))
    const cargada = () => pagina.waitForFunction(
      () => !document.querySelector('[data-cargando]') && (document.querySelector('main')?.innerText ?? '').length > 80, undefined, { timeout: 20_000 })
    await pagina.goto(`${base}/${p.ruta}`)
    await cargada()
    if (p.boton) {
      await pagina.getByRole('button', { name: p.boton }).filter({ visible: true }).first().click()
      await cargada()
    }
    await pagina.waitForTimeout(800)
    if (errores.length) { fallas++; console.log(`  ✗ ${p.archivo}: la página lanzó un error (${errores.join(' | ')}); no se guarda`) }
    else {
      const ruta = `${SALIDA}${p.archivo}.png`
      if (p.elemento) await pagina.getByRole('group', { name: p.elemento }).screenshot({ path: ruta })
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
