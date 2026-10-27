// R3 · Los cuadres contra lo que la pantalla muestra, el tiempo de pintar un
// gráfico al cambiar de momento o de filtro, y el teclado sobre la tubería.
// Lee los atributos data-* que el motor deja en cada pieza (valor exacto) y el
// texto visible (lo que lee la persona), y suma. Uso: node r3-cuadres.mjs <salida>
import { chromium } from 'playwright'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const BASE = (process.env.R3_URL ?? 'http://localhost:5183').replace(/\/$/, '')
const SALIDA = process.argv[2] ?? 'salida-r3'
mkdirSync(SALIDA, { recursive: true })
const ROLES = ['ger', 'prod', 'sup', 'oper', 'jefe', 'conf', 'plan', 'tec', 'cont', 'reg', 'adm']
const navegador = await chromium.launch()
const salida = {}

async function pagina(hash, { ancho = 1440, tema = 'light' } = {}) {
  const ctx = await navegador.newContext({ viewport: { width: ancho, height: 900 }, locale: 'es-CO', timezoneId: 'America/Bogota' })
  await ctx.addInitScript(([roles, t]) => { for (const r of roles) localStorage.setItem(`trim.intro.${r}`, '1'); localStorage.setItem('trim.tema', t) }, [ROLES, tema])
  const p = await ctx.newPage()
  await p.goto(`${BASE}/${hash}`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(900)
  return { p, ctx }
}
const num = s => (s == null ? null : Number(String(s)))
const texto = async (p, sel) => (await p.locator(sel).first().innerText().catch(() => null))?.replace(/\s+/g, ' ').trim() ?? null

/** El tiempo de pintar: del clic al segundo cuadro (el primero ya trae el estilo y el pintado). */
async function medirClic(p, sel, veces = 5) {
  const t = []
  for (let i = 0; i < veces; i++) {
    const ms = await p.evaluate(async s => {
      const el = document.querySelector(s); if (!el) return null
      const t0 = performance.now()
      el.click()
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      return performance.now() - t0
    }, sel)
    t.push(ms)
    await p.waitForTimeout(150)
  }
  return t
}

// ── La planta viva, La Ceiba: los tres momentos ──
{
  const { p, ctx } = await pagina('#/ger/planta-viva/ceiba/curso')
  const leer = () => p.evaluate(() => ({
    cifra: Number(document.querySelector('[data-cifra-grande]')?.getAttribute('data-valor')),
    cifraTexto: document.querySelector('[data-cifra-grande] [data-cifra]')?.textContent,
    tramos: [...document.querySelectorAll('svg[data-tuberia] [data-tramo]')].map(g => ({ t: g.getAttribute('data-tramo'), v: Number(g.getAttribute('data-valor')), marcado: g.hasAttribute('data-marcado'), aria: g.getAttribute('aria-label') })),
    sinId: Number(document.querySelector('svg[data-tuberia] [data-sin-identificar]')?.getAttribute('data-valor') ?? NaN),
    barras: [...document.querySelectorAll('[data-barra-despues]')].map(b => Number(b.getAttribute('data-barra-despues'))),
    rayado: (() => { const r = document.querySelector('svg[data-tuberia] [data-rayado] rect'); if (!r) return null; const b = r.getBoundingClientRect(); return { altoPx: +b.height.toFixed(2), anchoPx: +b.width.toFixed(1) } })(),
    esteMes: Number(document.querySelector('[data-este-mes]')?.getAttribute('data-este-mes')),
    esteMesTexto: document.querySelector('[data-este-mes]')?.innerText.replace(/\s+/g, ' '),
    porEquipo: [...document.querySelectorAll('[data-equipo-diferido]')].map(b => ({ e: b.getAttribute('data-equipo-diferido'), v: Number(b.getAttribute('data-bbl')), txt: b.innerText.replace(/\s+/g, ' ') })),
    perdida: document.querySelector('[data-perdida]')?.textContent,
    explica: document.querySelector('[data-cifra-grande] [data-explica]')?.textContent,
    frase: document.querySelector('[data-cifra-grande] [data-frase]')?.textContent,
    ariaTuberia: document.querySelector('svg[data-tuberia]')?.getAttribute('aria-label'),
  }))
  salida.pvCeiba = { durante: await leer() }
  salida.pvCeiba.tiempoMomento = { antes: await medirClic(p, '[data-momentos] [data-momento="antes"]'), despues: await medirClic(p, '[data-momentos] [data-momento="despues"]'), durante: await medirClic(p, '[data-momentos] [data-momento="durante"]') }
  await p.click('[data-momentos] [data-momento="despues"]'); await p.waitForTimeout(300)
  salida.pvCeiba.despues = await leer()
  await p.screenshot({ path: join(SALIDA, 'pv-ceiba-despues_light_1440.png') })
  await p.click('[data-momentos] [data-momento="antes"]'); await p.waitForTimeout(300)
  salida.pvCeiba.antes = await leer()
  await p.screenshot({ path: join(SALIDA, 'pv-ceiba-antes_light_1440.png') })
  // El teclado: Tab hasta el primer tramo; Enter abre la hoja; Escape la cierra.
  await p.click('[data-momentos] [data-momento="durante"]'); await p.waitForTimeout(300)
  await p.locator('svg[data-tuberia] [data-tramo="planta"]').focus()
  const foco = await p.evaluate(() => { const g = document.activeElement; const r = g?.querySelector('rect'); return { tag: g?.tagName, tramo: g?.getAttribute('data-tramo'), trazo: r && getComputedStyle(r).stroke } })
  await p.keyboard.press('Enter'); await p.waitForTimeout(400)
  const hoja = await texto(p, '[data-hoja-tramo]')
  await p.screenshot({ path: join(SALIDA, 'pv-ceiba-hoja-planta_light_1440.png') })
  await p.keyboard.press('Escape'); await p.waitForTimeout(300)
  const cerrada = await p.locator('[data-hoja-tramo]').count()
  // Los tramos se recorren con Tab, en orden.
  await p.locator('svg[data-tuberia] [data-tramo="reservorio"]').focus()
  const orden = []
  for (let i = 0; i < 5; i++) { orden.push(await p.evaluate(() => document.activeElement?.getAttribute('data-tramo') ?? document.activeElement?.getAttribute('data-sin-identificar') ?? document.activeElement?.tagName)); await p.keyboard.press('Tab') }
  salida.pvCeiba.teclado = { foco, hoja: hoja?.slice(0, 400), cerradaConEscape: cerrada === 0, ordenTab: orden }
  await ctx.close()
}
// ── La planta viva, todos los campos ──
{
  const { p, ctx } = await pagina('#/ger/planta-viva/ceiba~portafolio/curso')
  const leer = () => p.evaluate(() => ({
    cifra: Number(document.querySelector('[data-cifra-grande]')?.getAttribute('data-valor')),
    cifraTexto: document.querySelector('[data-cifra-grande] [data-cifra]')?.textContent,
    filas: [...document.querySelectorAll('[data-campo][data-valor]')].map(f => ({ c: f.getAttribute('data-campo'), v: Number(f.getAttribute('data-valor')), txt: f.querySelector('button')?.innerText.replace(/\s+/g, ' ') })),
    porEquipo: [...document.querySelectorAll('[data-equipo-diferido]')].map(b => ({ e: b.getAttribute('data-equipo-diferido'), v: Number(b.getAttribute('data-bbl')) })),
    esteMes: Number(document.querySelector('[data-este-mes]')?.getAttribute('data-este-mes')),
  }))
  salida.pvTodos = { durante: await leer(), tiempoMomento: { despues: await medirClic(p, '[data-momentos] [data-momento="despues"]'), durante: await medirClic(p, '[data-momentos] [data-momento="durante"]') } }
  await p.click('[data-momentos] [data-momento="despues"]'); await p.waitForTimeout(300)
  salida.pvTodos.despues = await leer()
  await ctx.close()
}
// ── Resultados ──
for (const [k, hash] of [['resCeiba', '#/ger/resultados/ceiba/curso'], ['resTodos', '#/ger/resultados/ceiba~portafolio/curso'], ['resProd', '#/prod/resultados/ceiba/curso']]) {
  const { p, ctx } = await pagina(hash)
  salida[k] = await p.evaluate(() => ({
    cifra: Number(document.querySelector('[data-resultados]')?.getAttribute('data-valor')),
    cifraTexto: document.querySelector('[data-cifra-grande] [data-cifra]')?.textContent,
    explica: document.querySelector('[data-cifra-grande] [data-explica]')?.textContent,
    rango: document.querySelector('[data-rango]')?.textContent,
    porEquipo: [...document.querySelectorAll('[data-por-equipo] [data-equipo-diferido]')].map(b => ({ e: b.getAttribute('data-equipo-diferido'), v: Number(b.getAttribute('data-bbl')), txt: b.innerText.replace(/\s+/g, ' ') })),
    masEquipos: [...document.querySelectorAll('[data-por-equipo] p')].map(x => x.textContent).filter(t => /más/.test(t)),
    meses: [...document.querySelectorAll('[data-mes-a-mes] [data-mes]')].map(g => ({ m: g.getAttribute('data-mes'), v: Number(g.getAttribute('data-total')) })),
    secciones: [...document.querySelectorAll('[data-seccion]')].map(s => s.getAttribute('data-seccion')),
    textoDondeSeTrabo: [...document.querySelectorAll('section')].find(s => /Dónde se trabó|Por dónde se trabó/.test(s.querySelector('h2,h3')?.textContent ?? ''))?.innerText.replace(/\s+/g, ' ').slice(0, 600) ?? null,
    perdida: document.querySelector('[data-perdida]')?.textContent ?? null,
  }))
  salida[k].tiempoVista = await medirClic(p, '[data-mes-a-mes] button[aria-pressed="false"]', 4)
  await ctx.close()
}
// ── Hoy (supervisor y jefe) ──
for (const [k, hash] of [['hoySup', '#/sup/hoy/ceiba/curso'], ['hoyJefe', '#/jefe/hoy/ceiba/curso'], ['hoyProd', '#/prod/hoy/ceiba/curso']]) {
  const { p, ctx } = await pagina(hash)
  salida[k] = await p.evaluate(() => ({
    inicio: document.querySelector('[data-inicio]')?.innerText.replace(/\s+/g, ' '),
    suCampo: document.querySelector('[data-su-campo]')?.innerText.replace(/\s+/g, ' '),
    tarjetas: [...document.querySelectorAll('[data-tarea]')].map(t => t.innerText.replace(/\s+/g, ' ').slice(0, 160)),
    diferidoTurno: document.querySelector('[data-diferido-turno]')?.innerText.replace(/\s+/g, ' '),
  }))
  await ctx.close()
}
// ── Equipos: la lista y el nivel 3 ──
{
  const { p, ctx } = await pagina('#/conf/equipos/ceiba')
  salida.equiposLista = await p.evaluate(() => [...document.querySelectorAll('[data-fila-equipo]')].slice(0, 12).map(f => ({ e: f.getAttribute('data-fila-equipo'), c: f.getAttribute('data-condicion'), cifra: f.querySelector('[data-cifra-fila]')?.innerText.replace(/\s+/g, ' ') })))
  salida.equiposTiempoFiltro = await medirClic(p, '[data-filtro="Estado"] [data-opcion]:not([aria-checked="true"])', 4)
  await ctx.close()
}
for (const [k, hash] of [['n3P201B', '#/sup/equipos/ceiba/P-201B'], ['n3LC21', '#/prod/equipos/ceiba/LC-21'], ['n3K101', '#/jefe/equipos/ceiba/K-101']]) {
  const { p, ctx } = await pagina(hash)
  salida[k] = await p.evaluate(() => ({
    previo: document.querySelector('[data-previo]')?.textContent, cifra: document.querySelector('[data-heroe-equipo] [data-cifra]')?.textContent,
    frase: document.querySelector('[data-heroe-equipo] [data-frase]')?.textContent,
    senales: [...document.querySelectorAll('[data-sus-senales] [data-senal]')].map(s => ({ tag: s.getAttribute('data-senal'), cond: s.getAttribute('data-condicion'), txt: s.innerText.replace(/\s+/g, ' ').slice(0, 90) })),
    notaEscala: [...document.querySelectorAll('[data-sus-senales] p')].map(x => x.textContent).join(' '),
    marcasEnSenales: document.querySelectorAll('[data-sus-senales] svg[viewBox="0 0 14 14"]').length,
  }))
  await ctx.close()
}
// ── Riesgo (jefe, todos) y Turno: la misma cifra ──
for (const [k, hash] of [['riesgoCeiba', '#/jefe/riesgo/ceiba/curso'], ['turno', '#/sup/turno/ceiba/curso'], ['bombasSup', '#/sup/bombas/ceiba/curso'], ['aguaProd', '#/prod/agua/ceiba/curso']]) {
  const { p, ctx } = await pagina(hash)
  salida[k] = (await p.evaluate(() => document.querySelector('.vista')?.innerText ?? document.body.innerText)).replace(/\s+/g, ' ').slice(0, 1600)
  await ctx.close()
}
await navegador.close()
writeFileSync(join(SALIDA, 'cuadres.json'), JSON.stringify(salida, null, 1))
console.log('listo')
