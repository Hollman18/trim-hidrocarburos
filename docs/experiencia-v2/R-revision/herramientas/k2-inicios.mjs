#!/usr/bin/env node
/* K2 · El inicio de cada rol, sin desplazarse, con la MISMA cuenta del auditor
   (`e2e/auditoria/inicio.ts`, «inicio de cada rol · 390 px») y el tope de
   `e2e/auditoria/presupuesto.ts`. Además escribe lo que se ve, renglón por
   renglón, para saber qué recortar.

   USO (con un Vite ya levantado; no levanta ni apaga nada):
     node docs/experiencia-v2/R-revision/herramientas/k2-inicios.mjs --url http://localhost:5182
     … --anchos 390,1440   … --solo 'ger|sup'   … --capturas <carpeta>   … --textos */
import { pathToFileURL, fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const AQUI = dirname(fileURLToPath(import.meta.url))
const RAIZ = resolve(AQUI, '../../../..')
const argv = process.argv.slice(2)
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i < 0 ? d : (argv[i + 1] ?? true) }
const BASE = String(arg('url', 'http://localhost:5182')).replace(/\/$/, '')
const ANCHOS = String(arg('anchos', '390')).split(',').map(Number)
const ALTO = { 320: 568, 390: 844, 768: 1024, 1280: 800, 1440: 900 }
const SOLO = arg('solo', null) ? new RegExp(arg('solo')) : null
const CAPT = arg('capturas', null)
const TEXTOS = argv.includes('--textos')
/** --palabras: además, las palabras que contó (la misma función de `inicio.ts`, que también las junta). */
const PALABRAS = argv.includes('--palabras')

const { medirInicio } = await import(pathToFileURL(join(RAIZ, 'e2e/auditoria/inicio.ts')).href)
const { PRESUPUESTO, CIFRAS_TELEFONO } = await import(pathToFileURL(join(RAIZ, 'e2e/auditoria/presupuesto.ts')).href)

/** Los renglones que se ven sin desplazarse (texto de cada elemento hoja, en orden). */
function renglones() {
  const vh = innerHeight, out = []
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  let ultimo = null, linea = ''
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const t = (n.nodeValue ?? '').replace(/\s+/g, ' ')
    if (!/[\p{L}\p{N}]/u.test(t)) continue
    const el = n.parentElement
    if (!el || /^(SCRIPT|STYLE|NOSCRIPT|TITLE|OPTION|TEMPLATE)$/.test(el.tagName)) continue
    if (typeof el.checkVisibility === 'function' && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue
    const r = document.createRange(); r.selectNodeContents(n)
    const q = [...r.getClientRects()].find(z => z.width > 0.5)
    if (!q || q.top >= vh || q.bottom <= 0) continue
    const bloque = el.closest('p,li,h1,h2,h3,button,a,dt,dd,tr,figure,[role=row],div')
    if (bloque !== ultimo && linea) { out.push(linea.trim()); linea = '' }
    ultimo = bloque
    linea += t
  }
  if (linea) out.push(linea.trim())
  return out
}

const browser = await chromium.launch()
const tabla = []
for (const ancho of ANCHOS) {
  const tel = ancho < 768
  const ctx = await browser.newContext({ viewport: { width: ancho, height: ALTO[ancho] }, isMobile: tel, hasTouch: tel, deviceScaleFactor: tel ? 2 : 1, locale: 'es-CO', timezoneId: 'America/Bogota' })
  const roles = Object.keys(PRESUPUESTO).filter(r => !SOLO || SOLO.test(r))
  await ctx.addInitScript(rs => { for (const r of rs) localStorage.setItem(`trim.intro.${r}`, '1') }, Object.keys(PRESUPUESTO))
  for (const rol of roles) {
    const page = await ctx.newPage()
    const errores = []
    page.on('pageerror', e => errores.push(e.message.split('\n')[0]))
    await page.goto(`${BASE}/#/${rol}`)
    // Si el Vite recarga (otro está editando), la página se vuelve a pintar: se espera de nuevo.
    const largo = () => page.evaluate(() => document.querySelector('[data-cargando]') ? -1
      : (document.querySelector('.vista') ?? document.querySelector('main'))?.innerText.length ?? 0).catch(() => -1)
    for (let quietas = 0, antes = -1, hasta = Date.now() + 20_000; quietas < 3 && Date.now() < hasta;) {
      const l = await largo()
      quietas = l > 80 && l === antes ? quietas + 1 : 0
      antes = l
      await page.waitForTimeout(250)
    }
    await page.evaluate(() => { const v = document.querySelector('.vista'); if (v) v.scrollTop = 0; scrollTo(0, 0) })
    const m = await page.evaluate(medirInicio).catch(async () => { await page.waitForTimeout(1500); return page.evaluate(medirInicio) })
    const p = PRESUPUESTO[rol]
    const ok = (tel ? m.palabras <= p.tope : true) && (!tel || m.cifras.length <= CIFRAS_TELEFONO) && m.grandes.length <= 1
    tabla.push(`${ancho} ${rol.padEnd(5)} ${String(m.palabras).padStart(4)} / ${p.tope}  cifras ${m.cifras.length}  grandes ${m.grandes.length}  ${ok ? 'OK' : 'NO'}  ${new URL(page.url()).hash}`)
    console.log(tabla.at(-1))
    console.log('   cifras:', m.cifras.join(' · '), '| grandes:', m.grandes.join(' · '))
    if (errores.length) console.log('   ERRORES:', errores.join(' | '))
    if (TEXTOS) for (const l of await page.evaluate(renglones)) console.log('   │', l)
    if (PALABRAS) {
      const f = medirInicio.toString().replace('out.palabras += enVista.length', 'out.palabras += enVista.length; (out.tokens ??= []).push(...enVista.map(m => m[0]))')
      const t = await page.evaluate(`(${f})()`)
      console.log('   palabras:', t.tokens.join(' '))
    }
    if (CAPT) { mkdirSync(CAPT, { recursive: true }); await page.screenshot({ path: join(CAPT, `${rol}-${ancho}.png`) }) }
    await page.close()
  }
  await ctx.close()
}
await browser.close()
console.log('\n' + tabla.join('\n'))
