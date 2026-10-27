#!/usr/bin/env node
/* R1 · Medición de texto (PROMPT-REVISION-UX.md §4 y §12.1).

   Recorre cada ruta (las de e2e/auditoria/rutas.ts, el inicio de cada rol y
   cada pantalla de cada puerta) en 5 anchos y 2 temas, y mide:
   - palabras visibles sin desplazarse (en toda la ventana y solo en el
     contenido, `.vista`) y en toda la página (lo que se alcanza bajando);
   - cifras visibles sin desplazarse (números que no son el tag de un equipo);
   - «cifras grandes»: elementos con texto de 40 px o más que traen un número;
   - textos de menos de 12 px (HTML y SVG, con el tamaño real en pantalla);
   - desbordes horizontales (de la página y de `.vista`, que es la que se
     desplaza en esta app) y, aparte, lo que reporta el detector del auditor.
   Además toma las capturas «antes» (o con la etiqueta que se le dé).

   USO (desde la raíz del repositorio):
     node docs/experiencia-v2/R-revision/herramientas/medir.mjs                 # todo, etiqueta «antes»
     node docs/experiencia-v2/R-revision/herramientas/medir.mjs --etiqueta despues
     … --solo 'ger|prod'          solo las rutas que casan con la expresión
     … --anchos 390,1440          solo esos anchos
     … --temas claro              solo ese tema
     … --sin-capturas             no toma capturas
     … --url http://localhost:5181  usa un Vite ya levantado (no levanta ni apaga nada)
     … --paralelo 4               páginas a la vez (por defecto 4)
     … --sin-detector             no corre el detector del auditor (más rápido)
     node …/medir.mjs --informe antes            regenera las tablas de medicion/antes-tablas.md
     node …/medir.mjs --comparar antes despues   escribe medicion/antes-vs-despues.md

   Sin --url levanta su propio Vite en el puerto 5181 (`vite --port 5181
   --strictPort`, el mismo binario que `npx vite`, llamado directo para que
   su PID sea el del servidor) y lo apaga por ese PID al terminar. Nunca
   toca 4173, 5173 ni 4199, ni mata procesos por nombre.

   Salida: R-revision/medicion/<etiqueta>.json (todas las combinaciones),
   <etiqueta>.csv, <etiqueta>-tablas.md (las tablas para medicion.md),
   <etiqueta>-textos/ (el texto visible sin desplazarse de los inicios, y en
   paginas/ el de cada página entera a 1440 en claro) y
   R-revision/capturas/<etiqueta>/ (inicio/ y puertas/). */
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync, readFileSync, createWriteStream } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const AQUI = dirname(fileURLToPath(import.meta.url))
const RAIZ = resolve(AQUI, '../../../..')
const REV = resolve(AQUI, '..')
const OUT = join(REV, 'medicion')

// ───────────────────────── argumentos
const argv = process.argv.slice(2)
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i < 0 ? d : (argv[i + 1] ?? true) }
const bandera = n => argv.includes(`--${n}`)
const ETIQUETA = arg('etiqueta', 'antes')
const PUERTO = 5181
const ANCHOS_TODOS = [320, 390, 768, 1280, 1440]
/** El alto de cada ancho: el teléfono chico (iPhone SE), el de las imágenes
 *  aprobadas (390 × 844), la tableta, el portátil de X4 §1.1 y la imagen 1. */
const ALTO = { 320: 568, 390: 844, 768: 1024, 1280: 800, 1440: 900 }
const ANCHOS = String(arg('anchos', ANCHOS_TODOS.join(','))).split(',').map(Number)
const TEMAS = String(arg('temas', 'claro,oscuro')).split(',')
const SOLO = arg('solo', null) ? new RegExp(arg('solo')) : null
const CAPTURAS = !bandera('sin-capturas')
const PARALELO = Number(arg('paralelo', 4))
const DETECTOR = !bandera('sin-detector')

// ───────────────────────── lo que se recorre
const { RUTAS } = await import(pathToFileURL(join(RAIZ, 'e2e/auditoria/rutas.ts')).href)
const { detectar } = await import(pathToFileURL(join(RAIZ, 'e2e/auditoria/detector.ts')).href)

/** Lee del código (sin importarlo: usa alias de Vite) los roles, sus pantallas,
 *  las puertas y la ruta de cada pantalla. Así la lista sigue al código. */
function leerRegistro() {
  const roles = readFileSync(join(RAIZ, 'src/entities/roles.ts'), 'utf8')
  const pant = readFileSync(join(RAIZ, 'src/app/pantallas.tsx'), 'utf8')
  const prod = readFileSync(join(RAIZ, 'src/shared/config/producto.ts'), 'utf8')
  const lista = s => [...s.matchAll(/'([^']+)'/g)].map(m => m[1])
  const R = {}
  for (const m of roles.matchAll(/\{\s*id: '(\w+)'[\s\S]*?pantallas: \[([^\]]*)\][^\n]*?inicio: '(\w+)'/g)) R[m[1]] = { pantallas: lista(m[2]), inicio: m[3] }
  const rutaDe = {}
  for (const m of pant.matchAll(/^\s*(\w+):\s*\{[^\n]*?ruta: '([^']+)'/gm)) rutaDe[m[1]] = m[2]
  const grupos = {}
  const bloqueG = pant.match(/export const GRUPOS[\s\S]*?\n\}/)[0]
  for (const m of bloqueG.matchAll(/(\w+):\s*\{[^\n]*?miembros: \[([^\]]*)\]/g)) grupos[m[1]] = lista(m[2])
  const puertas = {}
  const bloqueP = pant.match(/export const PUERTAS_DEL_ROL[\s\S]*?\n\}/)[0]
  for (const m of bloqueP.matchAll(/(\w+): \[([^\]]*)\]/g)) puertas[m[1]] = lista(m[2])
  const dentroIds = [...pant.match(/DENTRO_DE[^=]*= \{([^}]*)\}/)[1].matchAll(/(\w+):/g)].map(m => m[1])
  const v2roles = lista(prod.match(/ROLES_V2 = new Set\(\[([^\]]*)\]/)[1])
  const v2pant = lista(prod.match(/PANTALLAS_V2 = new Set\(\[([^\]]*)\]/)[1])
  return { roles: R, rutaDe, grupos, puertas, dentro: dentroIds, v2roles, v2pant }
}
const REG = leerRegistro()
const ORDEN_ROLES = ['ger', 'reg', 'cont', 'prod', 'sup', 'oper', 'jefe', 'conf', 'plan', 'tec', 'adm']

// ───────────────────────── Vite propio
let vite = null
const BASE = (arg('url', null) || `http://localhost:${PUERTO}`).replace(/\/$/, '')
async function levantarVite() {
  if (arg('url', null)) return
  mkdirSync(OUT, { recursive: true })
  const log = createWriteStream(join(OUT, `vite-${ETIQUETA}.log`))
  vite = spawn(process.execPath, [join(RAIZ, 'node_modules/vite/bin/vite.js'), '--port', String(PUERTO), '--strictPort'], { cwd: RAIZ, stdio: ['ignore', 'pipe', 'pipe'] })
  vite.stdout.pipe(log); vite.stderr.pipe(log)
  console.log(`Vite propio en ${PUERTO}, PID ${vite.pid}`)
  const hasta = Date.now() + 60_000
  while (Date.now() < hasta) {
    if (vite.exitCode !== null) throw new Error(`Vite salió (código ${vite.exitCode}); ¿el puerto ${PUERTO} está ocupado? Ver ${join(OUT, `vite-${ETIQUETA}.log`)}`)
    try { const r = await fetch(BASE + '/'); if (r.ok) return } catch { /* todavía no */ }
    await new Promise(r => setTimeout(r, 400))
  }
  throw new Error('Vite no respondió en 60 s')
}
function apagarVite() {
  if (vite && vite.exitCode === null) { console.log(`Apago Vite por su PID ${vite.pid}`); process.kill(vite.pid, 'SIGTERM') }
}
process.on('exit', apagarVite)
process.on('SIGINT', () => { apagarVite(); process.exit(130) })

// ───────────────────────── la medición, dentro de la página
/** Corre en la página: no usa nada de afuera. */
function medirEnPagina() {
  const vw = document.documentElement.clientWidth, vh = innerHeight
  const vista = document.querySelector('.vista')
  const PAL = /[\p{L}\p{N}]/u
  const NUM = /\d/
  // El tag de un equipo («P-201B», «LC-21», «MPP-301», «SE-2») no es una cifra.
  const TAG = /^[^\p{L}\p{N}]*\p{Lu}{1,4}-\d+\p{Lu}?(?:[^\p{L}\p{N}]|$)/u
  const cache = new Map()
  const info = el => {
    let x = cache.get(el)
    if (!x) {
      const c = getComputedStyle(el)
      const recorta = !(c.overflowX === 'visible' && c.overflowY === 'visible')
      const desplaza = /auto|scroll/.test(c.overflowX) || /auto|scroll/.test(c.overflowY)
      // Lo que envuelve a `.vista` (la raíz de la app, de alto fijo y que recorta) no esconde nada: se alcanza bajando.
      x = { recorta, desplaza: desplaza || !!(vista && el.contains(vista)), caja: recorta ? el.getBoundingClientRect() : null }
      cache.set(el, x)
    }
    return x
  }
  const cortar = (el, r, modo) => {
    let x = { l: r.left, t: r.top, r: r.right, b: r.bottom }
    for (let a = el; a && a !== document.documentElement && a !== document.body; a = a.parentElement) {
      const i = info(a)
      if (!i.recorta) continue
      if (modo === 'pagina' && i.desplaza) continue
      const q = i.caja
      x = { l: Math.max(x.l, q.left), t: Math.max(x.t, q.top), r: Math.min(x.r, q.right), b: Math.min(x.b, q.bottom) }
      if (x.r - x.l < 1.5 || x.b - x.t < 1.5) return null
    }
    if (modo === 'vista') {
      x = { l: Math.max(x.l, 0), t: Math.max(x.t, 0), r: Math.min(x.r, vw), b: Math.min(x.b, vh) }
      if (x.r - x.l < 1.5 || x.b - x.t < 1.5) return null
    }
    return x
  }
  const tamCache = new Map()
  const tamano = el => {
    let t = tamCache.get(el)
    if (t === undefined) {
      const fs = parseFloat(getComputedStyle(el).fontSize)
      const svg = el.closest('svg')
      let k = 1
      if (svg && el instanceof SVGGraphicsElement) { const m = el.getScreenCTM(); if (m) k = Math.hypot(m.a, m.b) }
      t = Math.round(fs * k * 10) / 10
      tamCache.set(el, t)
    }
    return t
  }
  const visibleCss = el => (typeof el.checkVisibility !== 'function' || el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }))
  const desc = el => {
    const c = (typeof el.className === 'string' ? el.className : el.getAttribute('class') || '').split(/\s+/).filter(Boolean).slice(0, 2).join('.')
    return el.tagName.toLowerCase() + (c ? '.' + c.replace(/[[\]]/g, '') : '')
  }
  const r = { palVista: 0, palVistaCont: 0, palPagina: 0, palPaginaCont: 0, cifVista: 0, cifVistaCont: 0, cifPagina: 0,
    grandesVista: [], grandesPagina: 0, chicos: [], textoVista: [], desbordePagina: 0, desbordeVista: 0, quienDesborda: [] }
  const grandesV = new Set(), grandesP = new Set(), chicos = new Map()
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const rng = document.createRange()
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const txt = n.nodeValue
    if (!txt || !PAL.test(txt)) continue
    const el = n.parentElement
    if (!el || /^(SCRIPT|STYLE|NOSCRIPT|TITLE|OPTION|TEMPLATE)$/.test(el.tagName)) continue
    if (el.closest('[role=tooltip]') && !visibleCss(el.closest('[role=tooltip]'))) continue
    if (!visibleCss(el)) continue
    rng.selectNodeContents(n)
    let rects = [...rng.getClientRects()].filter(q => q.width > 0.5 && q.height > 0.5)
    if (!rects.length && el.closest('svg')) { const q = el.getBoundingClientRect(); if (q.width > 0.5) rects = [q] }
    if (!rects.length) continue
    const enPagina = rects.some(q => cortar(el, q, 'pagina'))
    if (!enPagina) continue
    const enCont = !!(vista && vista.contains(el))
    const fs = tamano(el)
    const enMarca = el.closest('svg')?.getAttribute('viewBox') === '0 0 14 14'
    // El número dentro de una marca de prioridad es parte del símbolo: ni palabra ni cifra.
    const toks = enMarca ? [] : [...txt.matchAll(/\S+/g)].filter(m => PAL.test(m[0]))
    if (!toks.length) continue
    const esCifra = t => NUM.test(t) && !TAG.test(t) && !enMarca
    // Página: todo lo que se alcanza bajando.
    r.palPagina += toks.length; if (enCont) r.palPaginaCont += toks.length
    const cifs = toks.filter(m => esCifra(m[0])).length
    r.cifPagina += cifs
    if (fs >= 40 && cifs) grandesP.add(el)
    if (fs < 11.95 && !enMarca) {
      const k = el
      const x = chicos.get(k) ?? { texto: '', px: fs, svg: !!el.closest('svg'), donde: desc(el) }
      x.texto = (x.texto + ' ' + txt.trim()).trim().slice(0, 60); chicos.set(k, x)
    }
    // Vista: sin desplazarse. Si el nodo entero cabe, cuenta todo; si no, palabra por palabra.
    const visibles = rects.map(q => cortar(el, q, 'vista')).filter(Boolean)
    if (!visibles.length) continue
    const entero = rects.every(q => { const v = cortar(el, q, 'vista'); return v && Math.abs(v.l - q.left) < 1 && Math.abs(v.r - q.right) < 1 && Math.abs(v.t - q.top) < 1 && Math.abs(v.b - q.bottom) < 1 })
    let enVista = toks
    if (!entero) {
      enVista = toks.filter(m => {
        try {
          rng.setStart(n, m.index); rng.setEnd(n, m.index + m[0].length)
          const q = [...rng.getClientRects()].find(z => z.width > 0.5)
          return q ? !!cortar(el, q, 'vista') : false
        } catch { return false }
      })
    }
    if (!enVista.length) continue
    const cv = enVista.filter(m => esCifra(m[0])).length
    r.palVista += enVista.length; r.cifVista += cv
    if (enCont) { r.palVistaCont += enVista.length; r.cifVistaCont += cv }
    if (fs >= 40 && cv) grandesV.add(el)
    r.textoVista.push(enVista.map(m => m[0]).join(' '))
  }
  r.grandesVista = [...grandesV].map(e => `${e.textContent.trim().slice(0, 24)} (${tamano(e)} px)`)
  r.grandesPagina = grandesP.size
  r.chicos = [...chicos.values()]
  // Desbordes de lado: la página y la vista (que es la que se desplaza en esta app).
  r.desbordePagina = Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)
  if (vista) {
    r.desbordeVista = Math.max(0, vista.scrollWidth - vista.clientWidth)
    if (r.desbordeVista > 1) {
      const borde = vista.getBoundingClientRect().right
      const culpables = []
      for (const e of vista.querySelectorAll('*')) {
        const q = e.getBoundingClientRect()
        if (q.right <= borde + 1 || q.width < 1) continue
        // Lo que vive dentro de un desplazable propio (un gráfico ancho) no cuenta.
        let propio = false
        for (let a = e.parentElement; a && a !== vista; a = a.parentElement) { const i = info(a); if (i.recorta) { propio = true; break } }
        if (!propio) culpables.push([Math.round(q.right - borde), desc(e) + ' «' + (e.textContent || '').trim().slice(0, 30) + '»'])
      }
      culpables.sort((a, b) => b[0] - a[0])
      // El más profundo de cada rama es el que se sale; el padre lo arrastra.
      r.quienDesborda = culpables.slice(0, 4)
    }
  }
  return r
}

// ───────────────────────── recorrido
const esperar = ms => new Promise(r => setTimeout(r, ms))
async function irA(page, ruta, primera) {
  if (primera) { await page.goto(BASE + '/' + ruta); await esperar(2200) }
  else { await page.evaluate(h => { location.hash = h }, ruta.slice(1)); await esperar(700) }
  await esperarListo(page)
  await page.evaluate(() => { const v = document.querySelector('.vista'); if (v) v.scrollTop = 0; scrollTo(0, 0) })
  await esperar(150)
}

/** Hasta que no quede nada «Cargando…» dos veces seguidas y haya contenido (la primera visita compila su código). */
async function esperarListo(page) {
  // Además, que el texto de la vista deje de crecer: una parte puede llegar después que la cabecera.
  const hasta = Date.now() + 30_000
  let quietas = 0, antes = -1
  while (Date.now() < hasta && quietas < 3) {
    const largo = await page.evaluate(() => document.querySelector('[data-cargando]') ? -1 : (document.querySelector('.vista') ?? document.querySelector('main'))?.innerText.length ?? 0).catch(() => -1)
    quietas = largo > 80 && largo === antes ? quietas + 1 : 0
    antes = largo
    await esperar(250)
  }
}

function contexto(browser, ancho, tema) {
  const telefono = ancho < 600
  return browser.newContext({
    viewport: { width: ancho, height: ALTO[ancho] }, isMobile: telefono, hasTouch: telefono,
    deviceScaleFactor: telefono ? 2 : 1, locale: 'es-CO', timezoneId: 'America/Bogota',
  }).then(async c => {
    await c.addInitScript(([roles, t]) => {
      try { for (const r of roles) localStorage.setItem(`trim.intro.${r}`, '1'); localStorage.setItem('trim.tema', t) } catch { /* sin almacenamiento */ }
    }, [ORDEN_ROLES, tema === 'oscuro' ? 'dark' : 'light'])
    return c
  })
}

/** El inicio de cada rol: lo que abre la app al entrar con `#/<rol>`. */
async function inicios(browser) {
  // Una página nueva por rol: con el cambio de dirección la app conserva la pantalla de antes.
  const c = await contexto(browser, 1440, 'claro')
  const out = {}
  for (const rol of ORDEN_ROLES) {
    const page = await c.newPage()
    await irA(page, `#/${rol}`, true)
    await esperar(400)
    const hash = await page.evaluate(() => location.hash)
    const rolReal = hash.split('/')[1]
    out[rol] = { ruta: hash, apagado: rolReal !== rol, cae: rolReal }
    await page.close()
  }
  await c.close()
  return out
}

/** Cada pantalla de cada puerta del rol, en el campo de su inicio. */
function pantallasDePuerta(ini) {
  const out = []
  for (const rol of ORDEN_ROLES) {
    const R = REG.roles[rol]; if (!R || ini[rol]?.apagado) continue
    const [, , , campo] = ini[rol].ruta.split('/')
    for (const g of REG.puertas[rol] ?? []) for (const p of REG.grupos[g] ?? []) {
      if (!R.pantallas.includes(p) || REG.dentro.includes(p) || REG.v2pant.includes(p)) continue
      out.push({ rol, puerta: g, pantalla: p, ruta: `#/${rol}/${REG.rutaDe[p] ?? p}/${campo}/curso` })
    }
  }
  return out
}

async function main() {
  await levantarVite()
  const browser = await chromium.launch()
  try {
    const ini = await inicios(browser)
    console.log('Inicios:', Object.fromEntries(Object.entries(ini).map(([k, v]) => [k, v.ruta + (v.apagado ? ` (apagado → ${v.cae})` : '')])))
    const puertas = pantallasDePuerta(ini)
    // La lista: inicios, pantallas de puerta y las del auditor, sin repetir.
    const origen = new Map()
    const poner = (ruta, o) => { if (!origen.has(ruta)) origen.set(ruta, new Set()); origen.get(ruta).add(o) }
    for (const [rol, v] of Object.entries(ini)) if (!v.apagado) poner(v.ruta, `inicio:${rol}`)
    for (const p of puertas) poner(p.ruta, `puerta:${p.rol}:${p.puerta}:${p.pantalla}`)
    for (const ruta of RUTAS) poner(ruta, 'auditor')
    let rutas = [...origen.keys()]
    if (SOLO) rutas = rutas.filter(r => SOLO.test(r))
    console.log(`${rutas.length} rutas × ${ANCHOS.length} anchos × ${TEMAS.length} temas`)

    const combos = TEMAS.flatMap(t => ANCHOS.map(a => ({ tema: t, ancho: a })))
    const filas = []
    const capDir = join(REV, 'capturas', ETIQUETA)
    const textosDir = join(OUT, `${ETIQUETA}-textos`)
    mkdirSync(join(capDir, 'inicio'), { recursive: true }); mkdirSync(join(capDir, 'puertas'), { recursive: true }); mkdirSync(textosDir, { recursive: true })
    const nombreInicio = Object.fromEntries(Object.entries(ini).filter(([, v]) => !v.apagado).map(([k, v]) => [v.ruta, k]))
    const nombrePuerta = new Map(puertas.map(p => [p.ruta, `${p.rol}-${p.pantalla}`]))

    let hechos = 0
    const total = combos.length * rutas.length
    const trabajar = async ({ tema, ancho }) => {
      const c = await contexto(browser, ancho, tema)
      const page = await c.newPage()
      const errores = []
      page.on('pageerror', e => errores.push(e.message.split('\n')[0]))
      let primera = true
      for (const ruta of rutas) {
        try {
          await irA(page, ruta, primera); primera = false
          const llegada = await page.evaluate(() => location.hash)
          let m = await page.evaluate(medirEnPagina)
          // Una pantalla que todavía no se pinta (la primera carga, un fundido): se espera y se vuelve a medir.
          for (let i = 0; i < 4 && m.palVista < 5; i++) { await esperar(1500); m = await page.evaluate(medirEnPagina) }
          const det = DETECTOR ? await page.evaluate(detectar).catch(() => []) : []
          const porTipo = {}
          for (const h of det) porTipo[h[0]] = (porTipo[h[0]] ?? 0) + 1
          filas.push({ ruta, llegada, ancho, alto: ALTO[ancho], tema, origen: [...origen.get(ruta)],
            palVista: m.palVista, palVistaCont: m.palVistaCont, palPagina: m.palPagina, palPaginaCont: m.palPaginaCont,
            cifVista: m.cifVista, cifVistaCont: m.cifVistaCont, cifPagina: m.cifPagina,
            grandesVista: m.grandesVista, grandesPagina: m.grandesPagina,
            chicos: m.chicos, desbordePagina: m.desbordePagina, desbordeVista: m.desbordeVista, quienDesborda: m.quienDesborda,
            detector: porTipo, detectorMuestra: det.filter(h => h[0] !== 'encimado').slice(0, 6), errores: errores.splice(0) })
          // El texto de toda la página (1440, claro): para el glosario y los hallazgos de texto.
          if (ancho === 1440 && tema === 'claro') {
            mkdirSync(join(textosDir, 'paginas'), { recursive: true })
            const todo = await page.evaluate(() => (document.querySelector('.vista') ?? document.body).innerText)
            writeFileSync(join(textosDir, 'paginas', ruta.replace(/^#\//, '').replace(/[^\w~-]+/g, '_') + '.txt'), `${ruta}\n\n${todo}\n`)
          }
          const ini = nombreInicio[ruta]
          if (ini && (ancho === 390 || ancho === 1440)) {
            writeFileSync(join(textosDir, `${ini}-${ancho}-${tema}.txt`), m.textoVista.join('\n') + '\n')
            if (CAPTURAS) await page.screenshot({ path: join(capDir, 'inicio', `${ini}-${ancho}-${tema}.png`) })
          }
          if (CAPTURAS && ancho === 1440 && tema === 'claro' && nombrePuerta.has(ruta)) {
            const base = join(capDir, 'puertas', nombrePuerta.get(ruta))
            await page.screenshot({ path: base + '.png' })
            // La página entera: la app se desplaza dentro de `.vista`; para la foto se agranda la ventana a su alto.
            const alto = await page.evaluate(() => { const v = document.querySelector('.vista'); return v ? Math.ceil(v.scrollHeight + v.getBoundingClientRect().top) : innerHeight })
            await page.setViewportSize({ width: ancho, height: Math.min(Math.max(alto, ALTO[ancho]), 14000) })
            await esperar(300); await esperarListo(page); await esperar(300)
            await page.screenshot({ path: base + '-entera.jpg', type: 'jpeg', quality: 60 })
            await page.setViewportSize({ width: ancho, height: ALTO[ancho] })
            await esperar(300); await esperarListo(page)
          }
        } catch (e) {
          filas.push({ ruta, ancho, tema, error: String(e).slice(0, 200) })
          primera = true
        }
        hechos++
        if (hechos % 50 === 0) console.log(`${hechos}/${total}`)
      }
      await c.close()
    }
    const cola = [...combos]
    await Promise.all(Array.from({ length: Math.min(PARALELO, cola.length) }, async () => { while (cola.length) await trabajar(cola.shift()) }))

    mkdirSync(OUT, { recursive: true })
    const datos = { etiqueta: ETIQUETA, fecha: new Date().toISOString(), base: BASE, altos: ALTO, inicios: ini, puertas, filas }
    writeFileSync(join(OUT, `${ETIQUETA}.json`), JSON.stringify(datos, null, 1))
    escribirCsv(ETIQUETA)
    escribirTablas(ETIQUETA)
    console.log(`Listo: ${filas.length} mediciones → ${join(OUT, ETIQUETA + '.json')}`)
  } finally {
    await browser.close()
    apagarVite()
  }
}

// ───────────────────────── tablas en markdown
const n = x => (x ?? '—').toLocaleString?.('es-CO') ?? String(x)
function cargar(et) { return JSON.parse(readFileSync(join(OUT, `${et}.json`), 'utf8')) }
function escribirCsv(et) {
  const { filas } = cargar(et)
  const cab = ['ruta', 'llegada', 'ancho', 'alto', 'tema', 'palVista', 'palVistaCont', 'palPagina', 'palPaginaCont', 'cifVista', 'cifVistaCont', 'cifPagina', 'grandesVista', 'grandesPagina', 'chicos', 'desbordePagina', 'desbordeVista', 'detSale', 'detRecortado', 'detEncimado', 'error']
  const csv = [cab.join(',')].concat(filas.map(f => [f.ruta, f.llegada, f.ancho, f.alto, f.tema, f.palVista, f.palVistaCont, f.palPagina, f.palPaginaCont, f.cifVista, f.cifVistaCont, f.cifPagina,
    f.grandesVista?.length, f.grandesPagina, f.chicos?.length, f.desbordePagina, f.desbordeVista, f.detector?.sale ?? 0, f.detector?.recortado ?? 0, f.detector?.encimado ?? 0, f.error ?? ''].map(v => JSON.stringify(v ?? '')).join(',')))
  writeFileSync(join(OUT, `${et}.csv`), csv.join('\n') + '\n')
}

function escribirTablas(et) {
  const d = cargar(et)
  const f = (ruta, ancho, tema) => d.filas.find(x => x.ruta === ruta && x.ancho === ancho && x.tema === tema && !x.error)
  const L = []
  L.push(`<!-- generado por herramientas/medir.mjs --informe ${et} · ${d.fecha} -->`)
  L.push('### Inicio de cada rol (390 y 1440 px, claro y oscuro)', '')
  L.push('| Rol | Ruta del inicio | Ancho | Tema | Palabras sin desplazarse (toda la ventana) | … solo el contenido | Palabras de toda la página | Cifras sin desplazarse | Cifras grandes (≥ 40 px) sin desplazarse | Textos < 12 px | Desborde de lado (px) |')
  L.push('|---|---|---|---|---|---|---|---|---|---|---|')
  for (const rol of ORDEN_ROLES) {
    const i = d.inicios[rol]
    if (!i || i.apagado) { L.push(`| ${rol} | \`#/${rol}\` → ${i?.ruta ?? '—'} | — | — | rol apagado en el MVP: abre como **${i?.cae ?? '?'}**; no se mide | | | | | | |`); continue }
    for (const ancho of [390, 1440]) for (const tema of ['claro', 'oscuro']) {
      const x = f(i.ruta, ancho, tema)
      if (!x) { L.push(`| ${rol} | \`${i.ruta}\` | ${ancho} | ${tema} | no se pudo medir | | | | | | |`); continue }
      L.push(`| ${rol} | \`${i.ruta}\` | ${ancho} | ${tema} | ${n(x.palVista)} | ${n(x.palVistaCont)} | ${n(x.palPagina)} | ${n(x.cifVista)} | ${x.grandesVista.length}${x.grandesVista.length ? ' (' + x.grandesVista.join('; ') + ')' : ''} | ${x.chicos.length} | ${Math.max(x.desbordePagina, x.desbordeVista)} |`)
    }
  }
  L.push('', '### Todas las rutas · tema claro (la columna «≠ oscuro» dice si el oscuro midió otra cosa)', '')
  L.push('Columnas: **PV** palabras sin desplazarse (toda la ventana) · **PVc** las del contenido · **PP** palabras de toda la página · **CV** cifras sin desplazarse · **CG** cifras grandes sin desplazarse / en la página · **<12** textos de menos de 12 px (HTML/SVG) · **Desb.** desborde de lado en px · **Det.** lo que ve el detector del auditor (sale/recortado/encimado).', '')
  const rutas = [...new Set(d.filas.map(x => x.ruta))]
  const anchos = [...new Set(d.filas.map(x => x.ancho))].sort((a, b) => a - b)
  L.push('| Ruta | Ancho | PV | PVc | PP | CV | CG | <12 | Desb. | Det. | ≠ oscuro |')
  L.push('|---|---|---|---|---|---|---|---|---|---|---|')
  for (const ruta of rutas) for (const ancho of anchos) {
    const x = f(ruta, ancho, 'claro'), o = f(ruta, ancho, 'oscuro')
    if (!x) { const e = d.filas.find(z => z.ruta === ruta && z.ancho === ancho && z.tema === 'claro'); L.push(`| \`${ruta}\` | ${ancho} | ${e?.error ? 'error: ' + e.error.slice(0, 60) : 'sin medir'} | | | | | | | | |`); continue }
    const svg = x.chicos.filter(c => c.svg).length
    const dif = o ? ['palVista', 'palPagina', 'cifVista'].filter(k => o[k] !== x[k]).map(k => `${k} ${o[k]}`).join(', ') || (o.chicos.length !== x.chicos.length ? `<12 ${o.chicos.length}` : '=') : 'sin oscuro'
    const llega = x.llegada && x.llegada !== ruta ? ` → \`${x.llegada}\`` : ''
    L.push(`| \`${ruta}\`${llega} | ${ancho} | ${x.palVista} | ${x.palVistaCont} | ${x.palPagina} | ${x.cifVista} | ${x.grandesVista.length}/${x.grandesPagina} | ${x.chicos.length - svg}/${svg} | ${Math.max(x.desbordePagina, x.desbordeVista)} | ${x.detector.sale ?? 0}/${x.detector.recortado ?? 0}/${x.detector.encimado ?? 0} | ${dif} |`)
  }
  writeFileSync(join(OUT, `${et}-tablas.md`), L.join('\n') + '\n')
  console.log(`Tablas → ${join(OUT, et + '-tablas.md')}`)
}

function comparar(a, b) {
  const A = cargar(a), B = cargar(b)
  const clave = x => `${x.ruta}|${x.ancho}|${x.tema}`
  const mb = new Map(B.filas.filter(x => !x.error).map(x => [clave(x), x]))
  const pct = (x, y) => (x ? `${Math.round((y - x) / x * 100)} %` : '—')
  const L = [`<!-- generado por herramientas/medir.mjs --comparar ${a} ${b} -->`, '', `### Inicio de cada rol: ${a} → ${b} (meta: −40 % sin desplazarse)`, '',
    '| Rol | Ancho | Tema | Palabras sin desplazarse | Cambio | Palabras de la página | Cambio | Cifras sin desplazarse | Cifras grandes |', '|---|---|---|---|---|---|---|---|---|']
  let sa = 0, sb = 0, pa = 0, pb = 0
  for (const rol of ORDEN_ROLES) {
    const i = A.inicios[rol]; if (!i || i.apagado) continue
    for (const ancho of [390, 1440]) for (const tema of ['claro', 'oscuro']) {
      const x = A.filas.find(z => z.ruta === i.ruta && z.ancho === ancho && z.tema === tema && !z.error)
      const yi = B.inicios[rol]
      const y = yi && B.filas.find(z => z.ruta === yi.ruta && z.ancho === ancho && z.tema === tema && !z.error)
      if (!x || !y) continue
      L.push(`| ${rol} | ${ancho} | ${tema} | ${x.palVista} → ${y.palVista} | ${pct(x.palVista, y.palVista)} | ${x.palPagina} → ${y.palPagina} | ${pct(x.palPagina, y.palPagina)} | ${x.cifVista} → ${y.cifVista} | ${x.grandesVista.length} → ${y.grandesVista.length} |`)
    }
  }
  for (const x of A.filas) { if (x.error) continue; const y = mb.get(clave(x)); if (!y) continue; sa += x.palVista; sb += y.palVista; pa += x.palPagina; pb += y.palPagina }
  L.push('', `**Todo el producto** (las rutas medidas en las dos, todos los anchos y temas): sin desplazarse ${sa} → ${sb} (${pct(sa, sb)}); páginas enteras ${pa} → ${pb} (${pct(pa, pb)}). Meta: −25 %.`)
  mkdirSync(OUT, { recursive: true })
  writeFileSync(join(OUT, `${a}-vs-${b}.md`), L.join('\n') + '\n')
  console.log(`Comparación → ${join(OUT, `${a}-vs-${b}.md`)}`)
}

// ───────────────────────── entrada
if (bandera('informe')) { escribirCsv(String(arg('informe'))); escribirTablas(String(arg('informe'))) }
else if (bandera('comparar')) { const i = argv.indexOf('--comparar'); comparar(argv[i + 1], argv[i + 2]) }
else main().catch(e => { console.error(e); apagarVite(); process.exit(1) })
