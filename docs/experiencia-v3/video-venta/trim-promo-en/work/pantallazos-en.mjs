/* English versions of 5 product screenshots for the English cut of the sales video.
 *
 * The product has no i18n, so this does NOT touch the app: it opens the same screens
 * that scripts/pantallazos.mjs captures (same route, viewport, scale, UI state, crop,
 * waits) and, at capture time, replaces the visible Spanish text in the DOM with English
 * from traduccion-en.json (text nodes, SVG <text>/<tspan>, placeholder/title/aria-label).
 *
 *   # dev server first (demo data):  VITE_FUENTE=demo npx vite --port 5191 --strictPort
 *   node docs/experiencia-v3/video-venta/trim-promo-en/work/pantallazos-en.mjs [--base http://localhost:5191] [--solo nombre]
 *
 * After each capture it lists the visible strings that still look Spanish in
 * work/restante-en.json (empty = fully translated).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const AQUI = fileURLToPath(new URL('.', import.meta.url))
const RAIZ = fileURLToPath(new URL('../../../../../', import.meta.url))
const { chromium } = createRequire(`${RAIZ}package.json`)('@playwright/test')
const SALIDA = fileURLToPath(new URL('../assets/pantallas/', import.meta.url))
const ROLES = ['ger', 'prod', 'sup', 'oper', 'jefe', 'conf', 'tec', 'reg', 'adm']

const args = process.argv.slice(2)
const opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined }
const base = (opt('--base') ?? 'http://localhost:5191').replace(/\/$/, '')
const solo = opt('--solo')
const volcar = opt('--volcar') // debug: no translation, dump every visible string to this JSON path, no PNGs

// Same entries as scripts/pantallazos.mjs (only the 5 used by the English cut).
const PANTALLAS = [
  { archivo: 'historial-gerente', ruta: '#/ger/planta-viva/ceiba~portafolio/curso', selector: 'main [data-historial="mes"]', ventana: { width: 1440, height: 900 } },
  { archivo: 'ficha-p201b-gerente', ruta: '#/ger/planta-viva/ceiba/curso/P-201B', ventana: { width: 1440, height: 900 } },
  { archivo: 'hoy-supervisor', ruta: '#/sup/hoy/ceiba/curso', ventana: { width: 1440, height: 900 } },
  { archivo: 'diagnostico-mpp301', ruta: '#/conf/equipos/morichal/MPP-301/diagnostico', ventana: { width: 1440, height: 900 } },
  { archivo: 'tecnico-telefono', ruta: '#/tec/hoy/ceiba/curso', movil: true },
].filter(p => !solo || p.archivo === solo)

const dic = JSON.parse(readFileSync(`${AQUI}traduccion-en.json`, 'utf8'))

/** Runs in the page: translates the DOM and keeps translating whatever React re-renders. */
function instalar(dic) {
  const exactas = new Map(Object.entries(dic.exactas))
  const fragmentos = Object.entries(dic.fragmentos).sort((a, b) => b[0].length - a[0].length)
    .map(([es, en]) => [new RegExp(`(^|[^\\p{L}\\p{N}])${es.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^\\p{L}\\p{N}])`, 'gu'), en])
  const reglas = dic.reglas.map(r => [new RegExp(r.de, r.flags ?? 'gu'), r.a])
  const numeros = s => s
    .replace(/(\d)\.(\d{3})(?!\d)/g, '$1\u0001$2').replace(/(\d)\.(\d{3})(?!\d)/g, '$1\u0001$2')
    .replace(/(\d),(\d)/g, '$1.$2').replace(/\u0001/g, ',')
  const hechas = new WeakMap() // node -> last English we wrote (to skip our own mutations)
  const traducir = original => {
    const m = original.match(/^(\s*)([\s\S]*?)(\s*)$/)
    const [, pre, cuerpo, pos] = m
    if (!cuerpo) return original
    const norm = cuerpo.replace(/\s+/g, ' ')
    let t
    if (exactas.has(cuerpo)) t = exactas.get(cuerpo)
    else if (exactas.has(norm)) t = exactas.get(norm)
    else {
      t = cuerpo
      for (const [re, a] of reglas) t = t.replace(re, a)
      if (exactas.has(t)) t = exactas.get(t)
      else for (const [re, a] of fragmentos) t = t.replace(re, (_, p1) => p1 + a)
    }
    return pre + numeros(t) + pos
  }
  // A fragment that only makes sense next to its sibling (e.g. «d» + «e 06:00 a 18:00 del 2 de oct»).
  const contexto = (dic.contexto ?? []).map(c => ({ ...c, re: new RegExp(c.siguiente, 'u') }))
  const enContexto = n => {
    for (const c of contexto) {
      if (n.data.trim() !== c.texto) continue
      let sig = n.nextSibling; while (sig && sig.nodeType === 3 && !sig.data.trim()) sig = sig.nextSibling
      const txt = sig?.nodeType === 3 ? sig.data : sig?.textContent
      if (txt != null && c.re.test(txt)) return n.data.replace(c.texto, c.a)
    }
  }
  const nodoTexto = n => {
    if (hechas.get(n) === n.data) return
    const p = n.parentElement
    if (!p || p.closest('script,style,noscript')) return
    const en = enContexto(n) ?? traducir(n.data)
    if (en !== n.data) n.data = en
    hechas.set(n, n.data)
  }
  const ATRS = ['placeholder', 'title', 'aria-label', 'alt', 'value']
  const atrHechos = new WeakMap() // element -> { attr: last English we wrote } (translation is not idempotent: 1.665 <-> 1,665)
  const elemento = el => {
    for (const a of ATRS) {
      if (!el.hasAttribute(a)) continue
      if (a === 'value' && !(el instanceof HTMLInputElement && ['button', 'submit'].includes(el.type))) continue
      const v = el.getAttribute(a)
      const h = atrHechos.get(el) ?? {}; if (h[a] === v) continue
      const en = traducir(v)
      h[a] = en; atrHechos.set(el, h)
      if (en !== v) el.setAttribute(a, en)
    }
  }
  const recorrer = raiz => {
    if (raiz.nodeType === 3) return nodoTexto(raiz)
    if (raiz.nodeType !== 1 && raiz.nodeType !== 9 && raiz.nodeType !== 11) return
    if (raiz.nodeType === 1) elemento(raiz)
    const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
    for (let n = w.nextNode(); n; n = w.nextNode()) n.nodeType === 3 ? nodoTexto(n) : elemento(n)
  }
  window.__traducir = () => { recorrer(document.body); if (document.title) document.title = traducir(document.title) }
  const obs = new MutationObserver(ms => {
    for (const m of ms) {
      if (m.type === 'characterData') nodoTexto(m.target)
      else if (m.type === 'attributes') elemento(m.target)
      else for (const n of m.addedNodes) recorrer(n)
    }
  })
  const arrancar = () => { window.__traducir(); obs.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATRS }) }
  if (document.body) arrancar(); else document.addEventListener('DOMContentLoaded', arrancar)
}

/** Runs in the page: visible strings (inside the captured area) that still look Spanish. */
function restante({ selector, todo }) {
  const caja = selector ? document.querySelector(selector).getBoundingClientRect() : { left: 0, top: 0, right: innerWidth, bottom: innerHeight }
  const espanol = /[áéíóúñ¿¡ÁÉÍÓÚÑ]|\b(de|del|la|las|el|los|en|con|sin|por|para|que|una?|hoy|ayer|horas?|días?|mes|semana|pozos?|planta|salida|bomba|equipos?|sello|falla|turno|nivel|presión|caudal|campo|cambio|ver|abrir|cerrar|todos?|meses|ene|feb|abr|ago|sept|dic|y|o|se|su|al|lo|más|menos|si|no|aún|ya|pasa|cuánto|qué|cuándo|dónde|estado|historial|resumen|causa|aviso|alarma|atención|detalle|diferido|perdido|agua|crudo|gas|real|potencial|meta|costo|ahorro|riesgo|orden|técnico|operador|supervisor|gerente|jefe)\b/iu
  const fuera = r => r.width === 0 || r.height === 0 || r.right <= caja.left || r.left >= caja.right || r.bottom <= caja.top || r.top >= caja.bottom
  const out = new Set()
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const t = n.data.trim(); if (!t || !n.parentElement || n.parentElement.closest('script,style')) continue
    const cs = getComputedStyle(n.parentElement); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue
    const rg = document.createRange(); rg.selectNodeContents(n)
    const rs = [...rg.getClientRects()]; if (!rs.length || rs.every(fuera)) continue
    if (todo || espanol.test(t)) out.add(t)
  }
  for (const el of document.querySelectorAll('[placeholder]')) { const r = el.getBoundingClientRect(); if (!fuera(r) && espanol.test(el.placeholder)) out.add(`[placeholder] ${el.placeholder}`) }
  for (const el of document.querySelectorAll('*')) {
    for (const ps of ['::before', '::after']) {
      const c = getComputedStyle(el, ps).content
      if (c && c !== 'none' && c !== 'normal' && /^".*"$/.test(c) && espanol.test(c)) out.add(`[${ps}] ${c}`)
    }
  }
  return [...out]
}

const navegador = await chromium.launch()
let fallas = 0
const informe = {}
try {
  mkdirSync(SALIDA, { recursive: true })
  for (const p of PANTALLAS) {
    const contexto = await navegador.newContext({
      locale: 'es-CO', timezoneId: 'America/Bogota', colorScheme: 'light', deviceScaleFactor: 2,
      viewport: p.movil ? { width: 390, height: 844 } : p.ventana ?? { width: 1280, height: 800 },
      ...(p.movil ? { isMobile: true, hasTouch: true } : {}),
    })
    await contexto.addInitScript(roles => { for (const r of roles) localStorage.setItem(`trim.intro.${r}`, '1') }, ROLES)
    if (!volcar) await contexto.addInitScript(instalar, dic)
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
    await pagina.waitForTimeout(800)
    if (!volcar) { await pagina.evaluate(() => window.__traducir()); await pagina.waitForTimeout(150) }
    if (errores.length) { fallas++; console.log(`  x ${p.archivo}: page error (${errores.join(' | ')}); not saved`); await contexto.close(); continue }
    const ruta = `${SALIDA}${p.archivo}.png`
    if (p.selector) {
      const el = pagina.locator(p.selector).first(); await el.scrollIntoViewIfNeeded()
      if (!volcar) await pagina.evaluate(() => window.__traducir())
      informe[p.archivo] = await pagina.evaluate(restante, { selector: p.selector, todo: !!volcar })
      if (!volcar) await el.screenshot({ path: ruta })
    } else {
      informe[p.archivo] = await pagina.evaluate(restante, { todo: !!volcar })
      if (!volcar) await pagina.screenshot({ path: ruta })
    }
    console.log(`  ok ${p.archivo}.png  (${p.ruta})  still-Spanish: ${informe[p.archivo].length}`)
    await contexto.close()
  }
} finally {
  await navegador.close()
}
writeFileSync(volcar ?? `${AQUI}restante-en.json`, JSON.stringify(informe, null, 2) + '\n')
if (fallas) process.exit(1)
