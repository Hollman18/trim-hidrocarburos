/* R4 · §9 Teclado: recorre con Tab el inicio de cada rol y anota, en cada
   parada, qué es, si el foco se ve (contorno o sombra, su color contra el fondo
   de alrededor) y si algo lo tapa. Después prueba Escape en cada cosa que se abre.

   node docs/experiencia-v2/R-revision/herramientas/r4-teclado.mjs <url> [ancho] [tema]

   El contraste del foco: el color del contorno contra el color de fondo del
   PADRE (el contorno se dibuja afuera, a 2 px), resuelto subiendo hasta el
   primer fondo no transparente. WCAG 2.4.7 (se ve), 2.4.11 (no lo tapa nada),
   1.4.11 (3:1 contra lo de al lado). */
import { lanzar, SIN_INTRO, INICIOS, lista, guardar, esperar, RAIZ } from './r4-comun.mjs'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const [base = 'http://localhost:5184', anchoTxt = '1280', tema = 'light'] = process.argv.slice(2)
const ancho = Number(anchoTxt), telefono = ancho < 600
const CAPTURAS = join(RAIZ, 'docs/experiencia-v2/R-revision/capturas/r4')
mkdirSync(CAPTURAS, { recursive: true })
const MAX_TAB = Number(process.env.R4_TABS ?? 70)

const navegador = await lanzar()
const nueva = async (conIntro = false) => {
  const ctx = await navegador.newContext({ viewport: { width: ancho, height: telefono ? 844 : 900 }, isMobile: telefono, hasTouch: telefono, locale: 'es-CO', timezoneId: 'America/Bogota' })
  if (!conIntro) await ctx.addInitScript(SIN_INTRO)
  await ctx.addInitScript(t => { try { localStorage.setItem('trim.tema', t) } catch { /* about:blank */ } }, tema)
  return { ctx, page: await ctx.newPage() }
}

/** Lo que se sabe del elemento que tiene el foco. */
const ESTADO_FOCO = () => {
  const e = document.activeElement
  if (!e || e === document.body) return { cuerpo: true }
  const lum = c => { const m = c.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0]; const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]) }
  const contraste = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return +((x + 0.05) / (y + 0.05)).toFixed(2) }
  const fondo = n => { for (let p = n; p; p = p.parentElement) { const c = getComputedStyle(p).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c) && !/,\s*0\)$/.test(c)) return c } return getComputedStyle(document.body).backgroundColor }
  const s = getComputedStyle(e)
  const r = e.getBoundingClientRect()
  const contorno = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 1
  const sombra = s.boxShadow && s.boxShadow !== 'none'
  // Para un <g> o <rect> de SVG que se enfoca, el anillo puede ser un trazo (stroke) del propio dibujo.
  const t0 = e instanceof SVGElement ? getComputedStyle(e.querySelector('.marco') ?? e.querySelector(':scope > rect') ?? e).stroke : null
  const trazo = t0 && t0 !== 'none' ? t0 : null
  const alrededor = fondo(e.parentElement ?? e)
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2
  const arriba = document.elementFromPoint(Math.min(Math.max(cx, 0), innerWidth - 1), Math.min(Math.max(cy, 0), innerHeight - 1))
  const tapado = r.width > 0 && cy >= 0 && cy <= innerHeight && arriba && !e.contains(arriba) && !arriba.contains(e)
  const nombre = (e.getAttribute('aria-label') ?? e.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 60)
  return {
    que: `${e.tagName.toLowerCase()}${e.getAttribute('role') ? `[role=${e.getAttribute('role')}]` : ''} «${nombre}»`,
    x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
    enPantalla: r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth,
    contorno: contorno ? `${s.outlineWidth} ${s.outlineStyle} ${s.outlineColor}` : null, sombra: sombra ? s.boxShadow.slice(0, 80) : null, trazo,
    alrededor, contraste: contorno ? contraste(s.outlineColor, alrededor) : null,
    tapadoPor: tapado ? `${arriba.tagName.toLowerCase()}.${String(arriba.className).split(' ').slice(0, 3).join('.')}` : null,
    enPanel: !!e.closest('nav[aria-label="Navegación"]'), enDialogo: !!e.closest('[role=dialog]'),
  }
}

async function recorrer(page, ruta) {
  await page.goto('about:blank'); await page.goto(`${base}/${ruta}`); await lista(page); await esperar(600)
  await page.evaluate(() => { document.activeElement?.blur?.(); window.scrollTo(0, 0) })
  const paradas = []
  let primero = null
  for (let i = 0; i < MAX_TAB; i++) {
    await page.keyboard.press('Tab'); await esperar(200)
    const f = await page.evaluate(ESTADO_FOCO)
    if (f.cuerpo) { paradas.push({ i, que: '(body)' }); continue }
    const clave = `${f.que}|${f.x}|${f.y}`
    if (primero === clave) break // dio la vuelta
    primero ??= clave
    paradas.push({ i, ...f })
  }
  return paradas
}

const salida = { base, ancho, tema, recorridos: {}, escape: [], tareas: [] }
// 1. Tab por el inicio de cada rol (y dos pantallas más de las tareas clave).
const RUTAS_TAB = { ...INICIOS, 'ger-resultados': '#/ger/resultados/ceiba/curso', 'sup-nivel3': '#/sup/equipos/ceiba/P-201B' }
{
  const { ctx, page } = await nueva()
  for (const [k, ruta] of Object.entries(RUTAS_TAB)) {
    const p = await recorrer(page, ruta)
    salida.recorridos[k] = { ruta, paradas: p }
  }
  // Evidencia: el foco en una puerta del panel índigo (escritorio) o en el ☰ (teléfono).
  await page.goto(`${base}/${INICIOS.sup}`); await lista(page); await esperar(500)
  for (let i = 0; i < 4; i++) { await page.keyboard.press('Tab'); await esperar(60) }
  await page.screenshot({ path: join(CAPTURAS, `foco-panel-${ancho}-${tema}.png`), clip: { x: 0, y: 0, width: Math.min(ancho, 420), height: 420 } })
  await ctx.close()
}

// 2. Escape en todo lo que se abre.
async function probarEscape(nombre, ruta, abrir, abierto, opciones = {}) {
  const { ctx, page } = await nueva(opciones.conIntro)
  await page.goto(`${base}/${ruta}`); await lista(page); await esperar(600)
  let r = { nombre, ruta }
  try {
    const disparador = await abrir(page)
    await esperar(400)
    r.abre = await abierto(page)
    r.focoAdentro = await page.evaluate(() => { const e = document.activeElement; return e && e !== document.body ? `${e.tagName.toLowerCase()} «${(e.getAttribute('aria-label') ?? e.textContent ?? '').trim().slice(0, 40)}»${e.closest('[role=dialog]') ? ' (en el diálogo)' : ''}` : '(body)' })
    await page.keyboard.press('Escape'); await esperar(400)
    r.cierra = !(await abierto(page))
    r.focoVuelve = disparador ? await disparador.evaluate(e => e === document.activeElement || e.contains(document.activeElement)).catch(() => false) : null
    r.focoDespues = await page.evaluate(() => { const e = document.activeElement; return e && e !== document.body ? `${e.tagName.toLowerCase()} «${(e.getAttribute('aria-label') ?? e.textContent ?? '').trim().slice(0, 40)}»` : '(body)' })
  } catch (e) { r.error = e.message.split('\n')[0] }
  salida.escape.push(r)
  await ctx.close()
}
const porTeclado = async (page, loc) => { const l = page.locator(loc).filter({ visible: true }).first(); await l.focus(); await page.keyboard.press('Enter'); return l }
const expandido = sel => page => page.locator(sel).filter({ visible: true }).first().getAttribute('aria-expanded').then(v => v === 'true').catch(() => false)

await probarEscape('Franja: lista de alarmas', INICIOS.sup, p => porTeclado(p, 'button[aria-label$="ver la lista"]'), expandido('button[aria-label$="ver la lista"]'))
await probarEscape('Selector de período', '#/ger/resultados/ceiba/curso', p => porTeclado(p, 'button[aria-label^="Período"]'), expandido('button[aria-label^="Período"]'))
await probarEscape('Menú de la persona', INICIOS.ger, p => porTeclado(p, 'button[aria-label*="Gerente de activo"]'), expandido('button[aria-label*="Gerente de activo"]'))
await probarEscape('Selector de campo', INICIOS.ger, p => porTeclado(p, 'button[aria-label^="Campo:"]'), expandido('button[aria-label^="Campo:"]'))
await probarEscape('Exportar', '#/ger/resultados/ceiba/curso', p => porTeclado(p, 'button[aria-label="Exportar"], button:has-text("Exportar")'), expandido('button[aria-label="Exportar"], button:has-text("Exportar")'))
await probarEscape('Marca DEMO', INICIOS.ger, p => porTeclado(p, 'button:has-text("DEMO")'), p => p.locator('[role=note]').count().then(n => n > 0))
await probarEscape('Hoja del tramo (La planta viva)', INICIOS.ger, async p => { const l = p.locator('[data-tramo-boton], svg [role=button], [aria-label*="Abre su detalle"], [aria-label*="abre"]').filter({ visible: true }).first(); await l.focus(); await p.keyboard.press('Enter'); return l }, p => p.locator('[data-hoja-tramo]').count().then(n => n > 0))
await probarEscape('Ficha del equipo (gerente)', INICIOS.ger, p => porTeclado(p, '[data-ver-que-se-hace]'), p => p.locator('[data-panel-equipo]').count().then(n => n > 0))
await probarEscape('Introducción del rol', INICIOS.oper, async () => null, p => p.locator('[role=dialog]').count().then(n => n > 0), { conIntro: true })
await probarEscape('ⓘ (ayuda de una cifra)', '#/ger/resultados/ceiba/curso', p => porTeclado(p, 'main button[aria-label^="Calculado"], main [aria-label^="Calculado"]'), p => p.locator('[role=tooltip]').filter({ visible: true }).count().then(n => n > 0))
if (telefono) await probarEscape('Panel del teléfono (☰)', INICIOS.sup, p => porTeclado(p, 'button:has-text("Abrir la navegación")'), p => p.locator('[role=dialog][aria-label="Navegación"]').count().then(n => n > 0))

// 3. Tareas clave solo con el teclado.
{ // El supervisor confirma las 2 paradas iguales: ¿dónde queda el foco y cuántos Tab hasta «Deshacer»?
  const { ctx, page } = await nueva()
  await page.goto(`${base}/${INICIOS.sup}`); await lista(page); await esperar(600)
  const b = page.locator('button', { hasText: /^Confirmar las 2/ }).filter({ visible: true }).first()
  const r = { tarea: 'sup · Confirmar las 2 con Enter', hay: await b.count() > 0 }
  if (r.hay) {
    await b.focus(); await page.keyboard.press('Enter'); await esperar(500)
    r.aviso = await page.locator('[data-aviso-hoy]').innerText().catch(() => null)
    r.avisoRol = await page.locator('[data-aviso-hoy]').getAttribute('role').catch(() => null)
    r.focoDespues = await page.evaluate(() => { const e = document.activeElement; return e && e !== document.body ? `${e.tagName.toLowerCase()} «${(e.textContent ?? '').trim().slice(0, 50)}»` : '(body: el foco se perdió)' })
    let n = 0, llega = false
    const t0 = Date.now()
    for (; n < 60; n++) { await page.keyboard.press('Tab'); if (await page.evaluate(() => document.activeElement?.textContent?.trim() === 'Deshacer')) { llega = true; n++; break } }
    r.tabsHastaDeshacer = llega ? n : `no llega en ${n}`
    r.msHastaDeshacer = Date.now() - t0
  }
  salida.tareas.push(r)
  await ctx.close()
}
{ // El operador contesta con el teclado: Enter en la primera opción.
  const { ctx, page } = await nueva()
  await page.goto(`${base}/${INICIOS.oper}`); await lista(page); await esperar(600)
  const r = { tarea: 'oper · contestar con Enter' }
  const op = page.locator('main button', { hasText: /Sello mecánico|Contestar/ }).filter({ visible: true }).first()
  r.hay = await op.count() > 0
  if (r.hay) {
    r.antes = await page.locator('main').innerText().then(t => t.match(/Pregunta \d+ de \d+|Tiene \d+ preguntas?/)?.[0] ?? null)
    await op.focus(); await page.keyboard.press('Enter'); await esperar(600)
    r.aviso = await page.locator('[data-aviso-hoy]').innerText().catch(() => null)
    r.despues = await page.locator('main').innerText().then(t => t.match(/Pregunta \d+ de \d+|Tiene \d+ preguntas?/)?.[0] ?? null)
    r.focoDespues = await page.evaluate(() => { const e = document.activeElement; return e && e !== document.body ? `${e.tagName.toLowerCase()} «${(e.textContent ?? '').trim().slice(0, 50)}»` : '(body: el foco se perdió)' })
  }
  salida.tareas.push(r)
  await ctx.close()
}

await navegador.close()
const f = guardar(`teclado-${ancho}-${tema}.json`, salida)
console.log(`Teclado · ${ancho} px · ${tema} → ${f}`)
for (const [k, x] of Object.entries(salida.recorridos)) {
  const p = x.paradas.filter(y => y.que !== '(body)')
  const sinIndicador = p.filter(y => !y.contorno && !y.sombra && !y.trazo)
  const bajo = p.filter(y => y.contraste !== null && y.contraste < 3)
  const tapados = p.filter(y => y.tapadoPor)
  const fuera = p.filter(y => !y.enPantalla)
  console.log(`\n${k} ${x.ruta}: ${p.length} paradas · sin indicador ${sinIndicador.length} · contraste < 3:1 ${bajo.length} · tapadas ${tapados.length} · fuera de pantalla ${fuera.length} · body ${x.paradas.length - p.length}`)
  for (const y of bajo.slice(0, 4)) console.log(`   contraste ${y.contraste}:1  ${y.que}  (${y.contorno} sobre ${y.alrededor})${y.enPanel ? ' [panel]' : ''}`)
  for (const y of sinIndicador.slice(0, 4)) console.log(`   sin indicador  ${y.que}`)
  for (const y of tapados.slice(0, 3)) console.log(`   tapado por ${y.tapadoPor}  ${y.que}`)
}
console.log('\nEscape:')
for (const r of salida.escape) console.log(`  ${r.nombre}: abre ${r.abre} · foco adentro ${r.focoAdentro} · Escape cierra ${r.cierra} · foco vuelve ${r.focoVuelve} (${r.focoDespues})${r.error ? ' · ERROR ' + r.error : ''}`)
console.log('\nTareas:')
for (const r of salida.tareas) console.log(`  ${JSON.stringify(r)}`)
