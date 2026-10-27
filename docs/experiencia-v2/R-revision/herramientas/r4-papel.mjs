/* R4 · §10 El papel: «Exportar → PDF» y «Compartir el informe» en el demo
   construido. window.print() se reemplaza por una marca (en una prueba sin
   ventana no se puede abrir el diálogo); cuando la aplicación lo llama, se
   emula `print` y se genera el PDF con page.pdf() (A4, con el @page de la
   aplicación). Después pdftotext dice si están el membrete, el folio, la
   huella y la paginación, y pdftoppm saca cada hoja en PNG para mirarla.

   node docs/experiencia-v2/R-revision/herramientas/r4-papel.mjs <url-demo> [tema] */
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { lanzar, SIN_INTRO, lista, guardar, esperar, SALIDA } from './r4-comun.mjs'

const [base = 'http://127.0.0.1:5188', tema = 'light'] = process.argv.slice(2)
const DIR = join(SALIDA, `papel-${tema}`)
mkdirSync(DIR, { recursive: true })

/** [nombre, ruta, cómo se pide] */
const CASOS = [
  ['ger-planta-viva-compartir', '#/ger/planta-viva/ceiba/curso', async p => p.getByRole('button', { name: 'Compartir el informe' }).first().click()],
  ['ger-resultados-exportar', '#/ger/resultados/ceiba/curso', async p => { await p.getByRole('button', { name: 'Exportar' }).first().click(); await esperar(200); await p.getByRole('button', { name: /PDF/ }).first().click() }],
  ['ger-resultados-todos', '#/ger/resultados/ceiba~portafolio/curso', async p => { await p.getByRole('button', { name: 'Exportar' }).first().click(); await esperar(200); await p.getByRole('button', { name: /PDF/ }).first().click() }],
  ['prod-produccion-exportar', '#/prod/produccion/ceiba/curso', async p => { await p.getByRole('button', { name: 'Exportar' }).first().click(); await esperar(200); await p.getByRole('button', { name: /PDF/ }).first().click() }],
  ['reg-regulatorio-exportar', '#/reg/regulatorio/ceiba/curso', async p => { await p.getByRole('button', { name: 'Exportar' }).first().click(); await esperar(200); await p.getByRole('button', { name: /PDF/ }).first().click() }],
  ['sup-turno-exportar', '#/sup/turno/ceiba/curso', async p => { await p.getByRole('button', { name: 'Exportar' }).first().click(); await esperar(200); await p.getByRole('button', { name: /PDF/ }).first().click() }],
  ['ger-ficha-P-201B', '#/ger/planta-viva/ceiba/curso', async p => { await p.locator('[data-ver-que-se-hace]').first().click(); await esperar(500); await p.locator('[data-panel-equipo]').getByRole('button', { name: /Exportar|PDF/ }).first().click(); await esperar(200); const pdf = p.locator('[data-panel-equipo]').getByRole('button', { name: /PDF/ }); if (await pdf.count()) await pdf.first().click() }],
]

const navegador = await lanzar()
const salida = []
for (const [nombre, ruta, pedir] of CASOS) {
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 900 }, locale: 'es-CO', timezoneId: 'America/Bogota' })
  await ctx.addInitScript(SIN_INTRO)
  await ctx.addInitScript(t => { try { localStorage.setItem('trim.tema', t) } catch { /* about:blank */ } window.print = () => { window.__r4impreso = (window.__r4impreso ?? 0) + 1; window.__r4tema = document.documentElement.getAttribute('data-theme') } }, tema)
  const page = await ctx.newPage()
  const errores = []
  page.on('pageerror', e => errores.push(e.message))
  page.on('console', m => { if (m.type() === 'error') errores.push(m.text()) })
  await page.goto(`${base}/${ruta}`); await lista(page); await esperar(700)
  const r = { nombre, ruta }
  try {
    await pedir(page)
    await page.waitForFunction(() => window.__r4impreso > 0, undefined, { timeout: 8000 })
    r.temaAlImprimir = await page.evaluate(() => window.__r4tema)
    await page.emulateMedia({ media: 'print' })
    const pdf = join(DIR, `${nombre}.pdf`)
    await page.pdf({ path: pdf, format: 'A4', printBackground: true, preferCSSPageSize: true })
    const texto = execFileSync('pdftotext', ['-layout', pdf, '-'], { encoding: 'utf8' })
    r.hojas = Number(execFileSync('pdfinfo', [pdf], { encoding: 'utf8' }).match(/Pages:\s+(\d+)/)?.[1])
    r.folio = texto.match(/Folio\s+([A-Z0-9-]+)/)?.[1] ?? null
    r.huella = /huella SHA-256\s+[0-9a-f]/i.test(texto)
    r.membrete = /TRIM/.test(texto.split('\n').slice(0, 15).join(' '))
    r.paginacion = /Página \d+ de \d+/.test(texto)
    r.demo = /DATOS DE DEMOSTRACI/.test(texto)
    r.sinFolio = /SIN FOLIO/.test(texto)
    r.primeras = texto.split('\n').filter(l => l.trim()).slice(0, 6).map(l => l.trim().slice(0, 110))
    execFileSync('pdftoppm', ['-r', '40', '-png', pdf, join(DIR, nombre)])
    // Lo que en la impresión se sale del ancho del papel (A4 menos márgenes ≈ 703 px CSS).
    r.anchoPapel = await page.evaluate(() => {
      const w = document.documentElement.clientWidth
      return [...document.querySelectorAll('svg, table')].filter(e => e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().right > w + 1).slice(0, 5).map(e => `${e.tagName.toLowerCase()} +${Math.round(e.getBoundingClientRect().right - w)}px`)
    })
  } catch (e) { r.error = e.message.split('\n')[0] }
  r.errores = errores.slice(0, 5)
  salida.push(r)
  await ctx.close()
}
await navegador.close()
const f = guardar(`papel-${tema}.json`, salida)
console.log(`El papel · ${tema} → ${f} (PDF y PNG en ${DIR})`)
for (const r of salida) console.log(`  ${r.nombre}: ${r.error ? 'ERROR ' + r.error : `${r.hojas} hojas · folio ${r.folio} · huella ${r.huella} · membrete ${r.membrete} · «Página n de m» ${r.paginacion} · DEMO ${r.demo} · tema al imprimir ${r.temaAlImprimir} · sale del papel: ${r.anchoPapel.join(', ') || 'nada'}`}${r.errores.length ? ' · errores: ' + r.errores.join(' | ') : ''}`)
