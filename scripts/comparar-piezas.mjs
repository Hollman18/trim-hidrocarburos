/* Las puertas de cada rol, capturadas para comparar (Fase 1 de facilidades:
 * con todas las piezas encendidas, cada rol se ve igual que antes).
 *
 *   node scripts/comparar-piezas.mjs capturar --raiz <carpeta del front> --salida <carpeta> [--puerto 5191]
 *   node scripts/comparar-piezas.mjs comparar <carpeta A> <carpeta B>
 *
 * «capturar» levanta el front de --raiz (fuente demo; VITE_PIEZAS escoge las piezas
 * del demo), abre cada puerta de cada rol en 1440 y en 390 px y guarda el texto de
 * la pantalla (.txt) y la imagen entera (.png). Sale con 1 si una página lanza un
 * error. «comparar» dice qué capturas cambiaron entre dos carpetas, y sale con 1 si
 * alguna cambió.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import { chromium } from '@playwright/test'

const [modo, ...resto] = process.argv.slice(2)
const opcion = (k, d) => { const i = resto.indexOf(`--${k}`); return i >= 0 ? resto[i + 1] : d }

if (modo === 'comparar') {
  const [a, b] = resto
  const nombres = [...new Set([...readdirSync(a), ...readdirSync(b)])].sort()
  const distintos = nombres.filter(n => { try { return !readFileSync(`${a}/${n}`).equals(readFileSync(`${b}/${n}`)) } catch { return true } })
  const textos = distintos.filter(n => n.endsWith('.txt')), imagenes = distintos.filter(n => n.endsWith('.png'))
  console.log(`${nombres.length} archivos · texto distinto: ${textos.length} · imagen distinta: ${imagenes.length}`)
  for (const n of distintos) console.log(`  ≠ ${n}`)
  process.exit(distintos.length ? 1 : 0)
}

process.env.VITE_FUENTE = 'demo'
const RAIZ = resolve(opcion('raiz', '.'))
const SALIDA = resolve(opcion('salida'))
const PUERTO = Number(opcion('puerto', 5191))
/** Las puertas de cada rol (app/pantallas.tsx, PUERTAS_DEL_ROL), y su inicio («#/rol»). */
const PUERTAS = {
  ger: ['planta-viva', 'resultados'], prod: ['planta-viva', 'resultados'], sup: ['hoy', 'equipos'], oper: ['hoy'],
  jefe: ['hoy', 'equipos', 'resultados'], conf: ['equipos', 'resultados'], tec: ['hoy'], reg: ['regulatorio'], adm: ['configuracion'],
}
const ruta = (rol, p) => (p === null ? `#/${rol}` : p === 'equipos' ? `#/${rol}/equipos/ceiba` : `#/${rol}/${p}/ceiba/curso`)
const ANCHOS = [{ n: '1440', viewport: { width: 1440, height: 900 } }, { n: '390', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]

const servidor = await createServer({ root: RAIZ, logLevel: 'error', server: { port: PUERTO, strictPort: true } })
await servidor.listen()
const base = servidor.resolvedUrls?.local[0]?.replace(/\/$/, '')
const navegador = await chromium.launch()
let fallas = 0
mkdirSync(SALIDA, { recursive: true })
try {
  for (const [rol, puertas] of Object.entries(PUERTAS)) for (const p of [null, ...puertas]) for (const a of ANCHOS) {
    const { n, ...tam } = a
    const contexto = await navegador.newContext({ locale: 'es-CO', timezoneId: 'America/Bogota', colorScheme: 'light', deviceScaleFactor: 1, ...tam })
    await contexto.addInitScript(roles => { for (const r of roles) localStorage.setItem(`trim.intro.${r}`, '1') }, Object.keys(PUERTAS))
    const pagina = await contexto.newPage()
    const errores = []
    pagina.on('pageerror', e => errores.push(e.message.split('\n')[0]))
    await pagina.goto(`${base}/${ruta(rol, p)}`)
    await pagina.waitForFunction(() => !document.querySelector('[data-cargando]') && (document.querySelector('main')?.innerText ?? '').length > 40, undefined, { timeout: 25_000 }).catch(() => errores.push('no terminó de cargar'))
    await pagina.waitForTimeout(700)
    const archivo = `${rol}-${p ?? 'inicio'}-${n}`
    const texto = `${await pagina.evaluate(() => location.hash)}\n${await pagina.locator('main').innerText().catch(() => '')}`
    writeFileSync(`${SALIDA}/${archivo}.txt`, texto)
    await pagina.screenshot({ path: `${SALIDA}/${archivo}.png`, fullPage: true })
    if (errores.length) { fallas++; console.log(`  ✗ ${archivo}: ${errores.join(' | ')}`) }
    else console.log(`  ✓ ${archivo}${texto.includes('no la tiene contratada') ? ' · dice qué pieza falta' : ''}`)
    await contexto.close()
  }
} finally {
  await navegador.close()
  await servidor.close()
}
process.exit(fallas ? 1 : 0)
