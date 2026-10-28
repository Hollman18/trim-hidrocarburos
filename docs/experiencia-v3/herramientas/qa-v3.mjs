// C1 · QA total de la experiencia v3: el inicio de los 9 roles, a 1440 × 900 y 390 × 844, en claro y noche.
// Corre contra un Vite propio:  TRIM_URL=http://localhost:5185 node --experimental-strip-types docs/experiencia-v3/herramientas/qa-v3.mjs
// Deja las capturas en docs/experiencia-v3/capturas/qa/ y la medición en herramientas/qa-v3-medicion.json.
// Mide, en cada inicio: el auditor (detector.ts: se sale, recorta, pisa, color, mayúsculas, pérdida…), lo que se ve sin
// desplazarse (inicio.ts: palabras, cifras, cifras grandes), y las comprobaciones automáticas de X2 §6 que se pueden leer
// del DOM: C1 (texto en color de condición), M1/M2 (animaciones), T2 (tabular), T3 (letra < 12 px), N2 (la franja),
// la barra negra y el panel lateral claro.
import { chromium } from '@playwright/test'
import { writeFileSync } from 'node:fs'
import { detectar } from '../../../e2e/auditoria/detector.ts'
import { medirInicio } from '../../../e2e/auditoria/inicio.ts'

const URL = (process.env.TRIM_URL ?? 'http://localhost:5185').replace(/\/$/, '')
const DIR = 'docs/experiencia-v3/capturas/qa'
const ROLES = { ger: '#/ger', prod: '#/prod', sup: '#/sup', oper: '#/oper', jefe: '#/jefe', conf: '#/conf', tec: '#/tec', reg: '#/reg', adm: '#/adm' }
const soloRol = process.env.ROL

/** Lo que se lee del DOM, dentro de la página. */
function leer() {
  const css = getComputedStyle(document.documentElement)
  const hex = v => v.trim().toLowerCase()
  const aRgb = h => { const m = h.replace('#', ''); const n = parseInt(m.length === 3 ? [...m].map(c => c + c).join('') : m, 16); return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})` }
  const estado = Object.fromEntries(['--interlock', '--p1', '--p2', '--p3', '--sincom', '--acento'].map(t => [t, aRgb(hex(css.getPropertyValue(t)))]))
  const condicion = new Set([estado['--interlock'], estado['--p1'], estado['--p2'], estado['--sincom']])
  const seVe = el => el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
  const textos = []
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const t = (n.nodeValue ?? '').trim(); if (!t) continue
    const el = n.parentElement; if (!el || !seVe(el) || /^(SCRIPT|STYLE|TITLE|OPTION)$/.test(el.tagName)) continue
    if (el.closest('svg')?.getAttribute('viewBox') === '0 0 14 14') continue
    textos.push([el, t])
  }
  // C1: ningún texto en un color de condición (la marca lleva el color; el texto, tinta).
  const c1 = textos.filter(([el]) => condicion.has(getComputedStyle(el).color) || condicion.has(getComputedStyle(el).fill)).map(([, t]) => t.slice(0, 40))
  // Ningún texto ni fondo de estado en el color del acento… y ninguna marca de estado en el acento (C5).
  const acentoEnMarca = [...document.querySelectorAll('[data-condicion], [aria-label^="Prioridad"], [aria-label^="Interlock"], [aria-label^="Sin comunicación"]')]
    .filter(e => seVe(e) && [...e.querySelectorAll('*'), e].some(x => { const s = getComputedStyle(x); return s.fill === estado['--acento'] || s.backgroundColor === estado['--acento'] })).length
  // T3: texto bajo 12 px (los rótulos en mayúsculas pueden ir a 11).
  const chicos = textos.filter(([el, t]) => { const s = getComputedStyle(el); const fs = parseFloat(s.fontSize); return fs < 12 && !(fs >= 11 && s.textTransform === 'uppercase') && !el.closest('svg') && /[\p{L}\p{N}]/u.test(t) }).map(([el, t]) => `${t.slice(0, 30)} (${getComputedStyle(el).fontSize})`)
  // T2: cifras sin tabular-nums.
  const sinTabular = textos.filter(([el, t]) => /\d/.test(t) && !getComputedStyle(el).fontVariantNumeric.includes('tabular')).map(([, t]) => t.slice(0, 30))
  // M1/M2: animaciones vivas y cualquier cosa que parpadee.
  const anim = document.getAnimations().map(a => ({ n: a.animationName ?? a.transitionProperty ?? a.constructor.name, d: a.effect?.getTiming?.().duration, it: a.effect?.getTiming?.().iterations }))
  const smil = document.querySelectorAll('animate, animateTransform, animateMotion, set').length
  // La barra negra: algo ancho, oscuro y de borde a borde (claro: luminancia < .2).
  const lum = c => { const m = c.match(/\d+(\.\d+)?/g); if (!m) return 1; const [r, g, b, a = 1] = m.map(Number); if (a < .5) return 1; return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 }
  const oscuras = [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > innerWidth * .6 && r.height > 24 && r.height < 160 && seVe(e) && lum(getComputedStyle(e).backgroundColor) < .2 }).map(e => `${e.tagName}.${(e.className?.baseVal ?? e.className ?? '').toString().slice(0, 40)}`)
  const nav = document.querySelector('nav[aria-label="Navegación"]')
  const navFondo = nav ? getComputedStyle(nav.closest('aside') ?? nav).backgroundColor : null
  const franja = document.querySelectorAll('[data-franja]').length
  const vista = document.querySelector('.vista')
  return {
    hash: location.hash, tema: document.documentElement.getAttribute('data-theme'),
    alto: vista?.scrollHeight ?? document.documentElement.scrollHeight, altoVentana: innerHeight,
    desbordeLado: document.documentElement.scrollWidth > innerWidth + 1 || (!!vista && vista.scrollWidth > vista.clientWidth + 1),
    c1, acentoEnMarca, chicos: chicos.slice(0, 12), nChicos: chicos.length, sinTabular: sinTabular.slice(0, 8), nSinTabular: sinTabular.length,
    anim, smil, oscuras, navFondo, franja,
    texto: (document.querySelector('main')?.innerText ?? '').slice(0, 2500),
  }
}

const b = await chromium.launch()
const salida = []
for (const tema of ['light', 'dark']) {
  for (const [ancho, alto, movil] of [[1440, 900, false], [390, 844, true]]) {
    const ctx = await b.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: 1, isMobile: movil, hasTouch: movil, locale: 'es-CO', timezoneId: 'America/Bogota' })
    await ctx.addInitScript(([roles, t]) => { try { for (const r of roles) localStorage.setItem(`trim.intro.${r}`, '1'); localStorage.setItem('trim.tema', t) } catch { /* privado */ } }, [Object.keys(ROLES), tema])
    for (const [rol, ruta] of Object.entries(ROLES)) {
      if (soloRol && rol !== soloRol) continue
      const p = await ctx.newPage()
      const errores = []
      p.on('pageerror', e => errores.push(e.message.split('\n')[0]))
      await p.goto(`${URL}/${ruta}`)
      await p.waitForFunction(() => (document.querySelector('main')?.innerText ?? '').length > 80 && !document.querySelector('[data-cargando]'), null, { timeout: 20000 }).catch(() => {})
      await p.waitForTimeout(1200)
      const nombre = `${rol}-${ancho}-${tema === 'light' ? 'claro' : 'noche'}`
      await p.screenshot({ path: `${DIR}/${nombre}.png` })
      const d = await p.evaluate(leer)
      const auditor = await p.evaluate(detectar)
      const inicio = await p.evaluate(medirInicio)
      if (tema === 'light') {
        const h = Math.min((d.alto ?? alto) + 140, 7000)
        await p.setViewportSize({ width: ancho, height: h }); await p.waitForTimeout(500)
        await p.screenshot({ path: `${DIR}/${nombre}-entera.png` })
      }
      salida.push({ rol, ancho, tema, errores, ...d, auditor, inicio })
      console.log(nombre, d.hash, `alto ${d.alto}`, `auditor ${auditor.length}`, `pal ${inicio.palabras}`, `cifras ${inicio.cifras.length}`, `C1 ${d.c1.length}`, `anim ${d.anim.length}`, `chicos ${d.nChicos}`, `oscuras ${d.oscuras.length}`, errores.length ? `ERR ${errores}` : '')
      await p.close()
    }
    await ctx.close()
  }
}
await b.close()
writeFileSync(`docs/experiencia-v3/herramientas/qa-v3-medicion${soloRol ? '-' + soloRol : ''}.json`, JSON.stringify(salida, null, 1))
