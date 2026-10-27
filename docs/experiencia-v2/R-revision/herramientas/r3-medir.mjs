// R3 · ISA-101 y gráficos: recorre las pantallas en los dos temas y en los anchos
// pedidos, toma la captura de la primera vista y mide en la página lo que X2 §6 pide
// medir de forma automática:
//   · texto pintado con un color de estado (C1) y formas de estado fuera de una marca (C4);
//   · texto SVG en pantalla (px reales: tamaño × escala de la CTM) y SVG que se sale de su <svg>;
//   · texto HTML de menos de 12 px (T3) y cifras sin tabular-nums (T2);
//   · cifras de 32 px o más y de 20 a 31 en la primera vista (T1);
//   · las marcas de condición (forma por su dibujo) con el tag de equipo más cercano (F2, F3, E3);
//   · animaciones CSS, Web Animations y SMIL (M1, M2); filtros y sombras en los dibujos (E4);
//   · la franja (data-franja) y las migas: dónde están (N2, §7 punto 10);
//   · pestañas horizontales (role=tablist) y desborde horizontal de la página.
// Uso: node r3-medir.mjs <carpeta-de-salida> [anchos separados por coma] [temas]
// Requiere un Vite propio (R3: 5183). No escribe nada fuera de <carpeta-de-salida>.
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const BASE = (process.env.R3_URL ?? 'http://localhost:5183').replace(/\/$/, '')
const SALIDA = process.argv[2] ?? 'salida-r3'
const ANCHOS = (process.argv[3] ?? '1440,390').split(',').map(Number)
const TEMAS = (process.argv[4] ?? 'light,dark').split(',')
const SOLO = process.env.R3_SOLO ? new RegExp(process.env.R3_SOLO) : null
mkdirSync(SALIDA, { recursive: true })

/** Las pantallas, con el nivel de ISA-101 que les toca (X4 §5.1; X2 §3). */
export const PANTALLAS = [
  // N1 · La planta viva (gerencial y con la lente de cada rol)
  ['n1-ger-pv-ceiba', '#/ger/planta-viva/ceiba/curso', 'N1'],
  ['n1-ger-pv-todos', '#/ger/planta-viva/ceiba~portafolio/curso', 'N1'],
  ['n1-prod-pv-ceiba', '#/prod/planta-viva/ceiba/curso', 'N1'],
  ['n1-sup-pv-ceiba', '#/sup/planta-viva/ceiba/curso', 'N1'],
  ['n1-conf-pv-morichal', '#/conf/planta-viva/morichal/curso', 'N1'],
  // N2 · el tren o el área; Bombas = pantalla de grupo (nivel «1,5»); Equipos = índice del N3
  ['n2-prod-planta-ceiba', '#/prod/planta/ceiba/curso', 'N2'],
  ['n2-prod-agua-ceiba', '#/prod/agua/ceiba/curso', 'N2'],
  ['n2-prod-pozos-ceiba', '#/prod/pozos/ceiba/curso', 'N2'],
  ['n2-prod-esp-ceiba', '#/prod/esp/ceiba/curso', 'N2'],
  ['n2-sup-bombas-ceiba', '#/sup/bombas/ceiba/curso', 'N2'],
  ['n2-conf-bombas-morichal', '#/conf/bombas/morichal/curso', 'N2'],
  ['n2-conf-equipos-ceiba', '#/conf/equipos/ceiba', 'N2'],
  ['n2-ger-equipos-todos', '#/ger/equipos/ceiba~portafolio', 'N2'],
  // N3 · el equipo
  ['n3-sup-P-201B', '#/sup/equipos/ceiba/P-201B', 'N3'],
  ['n3-sup-P-201A', '#/sup/equipos/ceiba/P-201A', 'N3'],
  ['n3-conf-MPP-301', '#/conf/equipos/morichal/MPP-301', 'N3'],
  ['n3-jefe-K-101', '#/jefe/equipos/ceiba/K-101', 'N3'],
  ['n3-prod-LC-21', '#/prod/equipos/ceiba/LC-21', 'N3'],
  // N4 · el diagnóstico
  ['n4-conf-P-201B', '#/conf/equipos/ceiba/P-201B/diagnostico', 'N4'],
  ['n4-conf-MPP-301', '#/conf/equipos/morichal/MPP-301/diagnostico', 'N4'],
  // Pantallas de tarea (X2 §3.4): Hoy y las de antes
  ['t-sup-hoy', '#/sup/hoy/ceiba/curso', 'tarea'],
  ['t-oper-hoy', '#/oper/hoy/ceiba/curso', 'tarea'],
  ['t-tec-hoy', '#/tec/hoy/ceiba/curso', 'tarea'],
  ['t-jefe-hoy', '#/jefe/hoy/ceiba/curso', 'tarea'],
  ['t-prod-hoy', '#/prod/hoy/ceiba/curso', 'tarea'],
  ['t-sup-turno', '#/sup/turno/ceiba/curso', 'tarea'],
  ['t-oper-causa', '#/oper/causa/ceiba/curso', 'tarea'],
  ['t-tec-trabajo', '#/tec/trabajo/ceiba/curso', 'tarea'],
  // Resultados (el período: no es un nivel del SCADA, X4 §5.1)
  ['r-ger-res-ceiba', '#/ger/resultados/ceiba/curso', 'resultados'],
  ['r-ger-res-todos', '#/ger/resultados/ceiba~portafolio/curso', 'resultados'],
  ['r-prod-res-ceiba', '#/prod/resultados/ceiba/curso', 'resultados'],
  ['r-jefe-res-ceiba', '#/jefe/resultados/ceiba/curso', 'resultados'],
  ['r-conf-res-morichal', '#/conf/resultados/morichal/curso', 'resultados'],
  ['r-reg-res-ceiba', '#/reg/resultados/ceiba/curso', 'resultados'],
  ['r-prod-diferidos', '#/prod/diferidos/ceiba/curso', 'resultados'],
  ['r-prod-produccion', '#/prod/produccion/ceiba/curso', 'resultados'],
  ['r-jefe-mant', '#/jefe/mantenimiento/ceiba/curso', 'resultados'],
  ['r-jefe-riesgo-todos', '#/jefe/riesgo/ceiba~portafolio/curso', 'resultados'],
  ['r-conf-confiab', '#/conf/confiabilidad/morichal/curso', 'resultados'],
  ['r-reg-regulatorio', '#/reg/regulatorio/ceiba/curso', 'tarea'],
  ['a-adm-config', '#/adm/configuracion/ceiba/curso', 'tarea'],
  ['a-adm-planta', '#/adm/planta/ceiba/curso', 'N2'],
]

const ROLES = ['ger', 'prod', 'sup', 'oper', 'jefe', 'conf', 'plan', 'tec', 'cont', 'reg', 'adm']

/** Lo que se mide dentro de la página. */
function medir() {
  const raiz = document.documentElement
  const css = getComputedStyle(raiz)
  const sonda = document.createElement('i'); document.body.appendChild(sonda)
  const rgb = c => { sonda.style.color = ''; sonda.style.color = c; return getComputedStyle(sonda).color }
  const ESTADO = {}
  for (const k of ['--interlock', '--p1', '--p2', '--p3', '--sincom']) ESTADO[rgb(css.getPropertyValue(k).trim())] = k
  // Las píldoras blancas llevan la paleta clara también en oscuro (.blanca).
  for (const [c, k] of [['#bf4000', '--p1(blanca)'], ['#f9a825', '--p2(blanca)'], ['#8b1a1a', '--interlock(blanca)'], ['#8420a3', '--sincom(blanca)']]) ESTADO[rgb(c)] ??= k
  sonda.remove()
  const W = innerWidth, H = innerHeight
  const visible = el => {
    const r = el.getBoundingClientRect()
    if (r.width <= 1 || r.height <= 1) return null
    for (let a = el; a && a !== document.body; a = a.parentElement) {
      const s = getComputedStyle(a)
      if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.05) return null
    }
    return r
  }
  const enVista = r => r.bottom > 0 && r.top < H && r.right > 0 && r.left < W
  const ruta = el => {
    const p = []
    for (let a = el; a && a !== document.body && p.length < 5; a = a.parentElement) {
      const d = [...a.attributes].filter(x => x.name.startsWith('data-')).map(x => `[${x.name}${x.value ? `=${x.value.slice(0, 18)}` : ''}]`).join('')
      const al = a.getAttribute('aria-label')
      p.unshift(`${a.tagName.toLowerCase()}${d}${al ? `[aria-label="${al.slice(0, 40)}"]` : ''}`)
      if (d || al) break
    }
    return p.join(' > ')
  }
  const esMarca = el => { const s = el.closest('svg'); return !!s && s.getAttribute('viewBox') === '0 0 14 14' }
  const TAG = /\b([A-Z]{1,4}-\d{2,4}[A-Z]?)/

  // ── Textos ──
  const vistos = new Set(), textos = []
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  while (tw.nextNode()) {
    const t = tw.currentNode, el = t.parentElement
    if (!el || vistos.has(el) || !t.textContent.trim()) continue
    vistos.add(el)
    if (el.closest('.sr-only, [hidden], script, style, option')) continue
    const r = visible(el); if (!r) continue
    textos.push({ el, r })
  }
  const pintados = [], chicosHtml = [], chicosSvg = [], svgFuera = [], sinTabular = [], grandes = [], medianas = []
  const tamSvg = []
  for (const { el, r } of textos) {
    const s = getComputedStyle(el)
    const enSvg = el instanceof SVGElement
    const color = enSvg ? s.fill : s.color
    const txt = el.textContent.trim().replace(/\s+/g, ' ').slice(0, 60)
    let px = parseFloat(s.fontSize)
    if (enSvg) {
      const m = el.getScreenCTM()
      if (m) px *= Math.hypot(m.c, m.d)
    }
    if (ESTADO[color] && !esMarca(el)) pintados.push({ txt, color: ESTADO[color], donde: ruta(el), svg: enSvg })
    if (enSvg && !esMarca(el)) {
      tamSvg.push(px)
      if (px < 11.95) chicosSvg.push({ txt, px: +px.toFixed(1), donde: ruta(el) })
      const svg = el.ownerSVGElement && visible(el.ownerSVGElement)
      if (svg) {
        const fuera = Math.max(svg.left - r.left, r.right - svg.right, svg.top - r.top, r.bottom - svg.bottom)
        if (fuera > 1) svgFuera.push({ txt, px: +fuera.toFixed(1), donde: ruta(el) })
      }
    }
    if (!enSvg && px < 11.95 && !esMarca(el)) chicosHtml.push({ txt, px, donde: ruta(el) })
    if (/\d/.test(txt) && !esMarca(el) && !/tabular-nums/.test(s.fontVariantNumeric)) sinTabular.push({ txt, donde: ruta(el), svg: enSvg })
    if (/\d/.test(txt) && enVista(r) && !esMarca(el)) {
      if (px >= 31.95) grandes.push({ txt, px: Math.round(px) })
      else if (px >= 19.95) medianas.push({ txt, px: Math.round(px) })
    }
  }

  // ── Formas en color de estado fuera de una marca (C4) ──
  const formasEstado = []
  for (const el of document.querySelectorAll('body *')) {
    if (esMarca(el) || el.closest('[data-franja]')) continue
    const s = getComputedStyle(el)
    const usos = []
    if (ESTADO[s.backgroundColor]) usos.push(`fondo ${ESTADO[s.backgroundColor]}`)
    if (parseFloat(s.borderTopWidth) > 0 && ESTADO[s.borderTopColor]) usos.push(`borde ${ESTADO[s.borderTopColor]}`)
    if (el instanceof SVGElement && !(el instanceof SVGTextElement) && !(el instanceof SVGTSpanElement)) {
      if (ESTADO[s.fill]) usos.push(`relleno ${ESTADO[s.fill]}`)
      if (s.stroke !== 'none' && ESTADO[s.stroke]) usos.push(`trazo ${ESTADO[s.stroke]}`)
    }
    if (usos.length && visible(el)) formasEstado.push({ usos: usos.join(', '), donde: ruta(el), txt: (el.textContent || '').trim().slice(0, 40) })
  }

  // ── Marcas de condición, con el equipo más cercano ──
  const forma = svg => {
    const h = svg.firstElementChild
    if (!h) return '?'
    const d = h.getAttribute('d') ?? ''
    if (h.tagName === 'path' && d.startsWith('M7 0.5')) return 'alarma'
    if (h.tagName === 'path' && d.startsWith('M7 1 L13.4')) return 'atencion'
    if (h.tagName === 'rect' && h.getAttribute('x') === '1.4') return 'aviso'
    if (h.tagName === 'rect' && h.getAttribute('x') === '2.5') return 'interlock'
    if (h.tagName === 'circle' && h.getAttribute('r') === '5.2' && h.getAttribute('stroke-dasharray')) return svg.children.length > 1 ? 'invalido' : 'sin-comunicacion'
    if (h.tagName === 'circle' && h.getAttribute('r') === '5.2') return 'campana'
    if (h.tagName === 'rect' && h.getAttribute('x') === '1.5') return 'falta'
    if (h.tagName === 'path' && d.startsWith('M4.5 2')) return 'sin-instrumento'
    if (h.tagName === 'path' && d.startsWith('M2 7')) return 'anticipa'
    if (h.tagName === 'circle' && h.getAttribute('r') === '5.6') return 'bloqueo'
    if (h.tagName === 'circle' && h.getAttribute('r') === '2.6') return 'normal'
    return '?'
  }
  const marcas = []
  for (const svg of document.querySelectorAll('svg[viewBox="0 0 14 14"]')) {
    const r = visible(svg); if (!r) continue
    if (svg.closest('[data-franja]')) continue
    let tag = null, ctx = null
    for (let a = svg.parentElement, i = 0; a && i < 6; a = a.parentElement, i++) {
      const texto = a instanceof SVGElement ? (a.textContent || '') : (a.innerText || '')
      if (texto.length > 220) break
      const m = texto.match(TAG)
      if (m) { tag = m[1]; ctx = ruta(a); break }
    }
    if (!ctx) ctx = ruta(svg.parentElement)
    marcas.push({ c: forma(svg), tag, px: Math.round(r.width), nombre: svg.getAttribute('aria-label'), ctx, enVista: enVista(r) })
  }

  // ── Movimiento (M1, M2) ──
  const anim = document.getAnimations().filter(a => a.playState === 'running').map(a => ({
    nombre: a.animationName ?? a.transitionProperty ?? a.constructor.name, iter: a.effect?.getTiming().iterations, dur: a.effect?.getTiming().duration,
    donde: a.effect?.target ? ruta(a.effect.target) : null,
  }))
  const smil = document.querySelectorAll('animate, animateTransform, animateMotion, set').length
  const infinitas = []
  for (const el of document.querySelectorAll('body *')) {
    const s = getComputedStyle(el)
    if (s.animationName && s.animationName !== 'none' && (s.animationIterationCount === 'infinite' || parseFloat(s.animationIterationCount) > 1)) infinitas.push({ n: s.animationName, donde: ruta(el) })
  }

  // ── Profundidad en los dibujos (E4) ──
  const filtros = []
  for (const el of document.querySelectorAll('svg, svg *')) {
    const s = getComputedStyle(el)
    if (el.getAttribute('filter') || (s.filter && s.filter !== 'none')) filtros.push({ donde: ruta(el), f: el.getAttribute('filter') ?? s.filter })
    if (el.tagName === 'svg' && s.boxShadow && s.boxShadow !== 'none') filtros.push({ donde: ruta(el), f: `box-shadow ${s.boxShadow}` })
  }
  const defsFiltro = document.querySelectorAll('svg filter, svg feDropShadow, svg feGaussianBlur').length

  // ── Navegación (N2, N4, migas) ──
  const fr = document.querySelector('[data-franja]') ?? document.querySelector('[role="group"][aria-label^="Condiciones"]')
  const rf = fr && visible(fr)
  const migas = [...document.querySelectorAll('nav[aria-label="Dónde está"]')].filter(visible).map(n => n.innerText.replace(/\s+/g, ' ').trim())
  const vistaEl = document.querySelector('.vista')
  const svgs = [...document.querySelectorAll('svg')].filter(s => s.getAttribute('viewBox') !== '0 0 14 14' && !s.closest('button svg') && visible(s) && (s.getAttribute('viewBox') ?? '').split(' ').map(Number)[2] > 40)
  return {
    titulo: document.querySelector('h1')?.innerText.replace(/\s+/g, ' ').slice(0, 80) ?? null,
    pintados, chicosHtml: chicosHtml.slice(0, 30), nChicosHtml: chicosHtml.length, chicosSvg, nTextoSvg: tamSvg.length,
    minSvgPx: tamSvg.length ? +Math.min(...tamSvg).toFixed(1) : null, svgFuera, nSinTabular: sinTabular.length, sinTabular: sinTabular.slice(0, 12),
    grandes, medianas, formasEstado: formasEstado.slice(0, 40), nFormasEstado: formasEstado.length, marcas,
    anim, smil, infinitas, filtros, defsFiltro,
    franja: rf ? { x: Math.round(rf.left), y: Math.round(rf.top), w: Math.round(rf.width), h: Math.round(rf.height), texto: fr.innerText.replace(/\s+/g, ' ') } : null,
    migas, tablists: document.querySelectorAll('[role="tablist"]').length,
    desbordePagina: document.documentElement.scrollWidth - innerWidth,
    altoVista: vistaEl ? vistaEl.scrollHeight : document.documentElement.scrollHeight,
    dibujos: svgs.map(s => { const r = s.getBoundingClientRect(); return { donde: ruta(s), w: Math.round(r.width), h: Math.round(r.height), vb: s.getAttribute('viewBox'), aria: s.getAttribute('aria-label')?.slice(0, 90) ?? null, role: s.getAttribute('role') } }),
  }
}

const navegador = await chromium.launch()
const resultados = []
const trabajos = []
for (const tema of TEMAS) for (const ancho of ANCHOS) for (const [id, hash, nivel] of PANTALLAS) {
  if (SOLO && !SOLO.test(id)) continue
  trabajos.push({ tema, ancho, id, hash, nivel })
}
const alto = a => (a <= 430 ? 844 : 900)
async function correr(t) {
  const ctx = await navegador.newContext({ viewport: { width: t.ancho, height: alto(t.ancho) }, deviceScaleFactor: 1, locale: 'es-CO', timezoneId: 'America/Bogota', isMobile: t.ancho <= 430, hasTouch: t.ancho <= 430 })
  await ctx.addInitScript(([roles, tema]) => {
    try { for (const r of roles) localStorage.setItem(`trim.intro.${r}`, '1'); localStorage.setItem('trim.tema', tema) } catch { /* nada */ }
  }, [ROLES, t.tema])
  const page = await ctx.newPage()
  const errores = []
  page.on('pageerror', e => errores.push(String(e).slice(0, 160)))
  page.on('console', m => { if (m.type() === 'error') errores.push(m.text().slice(0, 160)) })
  try {
    await page.goto(`${BASE}/${t.hash}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(900)
    const m = await page.evaluate(medir)
    const archivo = `${t.id}__${t.tema}_${t.ancho}.png`
    await page.screenshot({ path: join(SALIDA, archivo) })
    resultados.push({ ...t, archivo, errores, ...m })
  } catch (e) {
    resultados.push({ ...t, fallo: String(e).slice(0, 200) })
  }
  await ctx.close()
}
// Cuatro páginas a la vez: el Vite de desarrollo compila perezoso.
const cola = [...trabajos]
await Promise.all([0, 1, 2, 3].map(async () => { while (cola.length) await correr(cola.shift()) }))
await navegador.close()
resultados.sort((a, b) => trabajos.findIndex(t => t.id === a.id && t.tema === a.tema && t.ancho === a.ancho) - trabajos.findIndex(t => t.id === b.id && t.tema === b.tema && t.ancho === b.ancho))
writeFileSync(join(SALIDA, `medicion-${ANCHOS.join('-')}-${TEMAS.join('-')}.json`), JSON.stringify(resultados, null, 1))
console.log(`listo: ${resultados.length} vistas, ${resultados.filter(r => r.fallo).length} fallas de carga`)
