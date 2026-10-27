/* R4 · §9 Nombres accesibles, regiones, dibujos, marcas de prioridad, título,
   referencias rotas, cosas que se hacen clic sin teclado y blancos táctiles.
   Sin axe-core: el árbol de accesibilidad de Chrome (CDP Accessibility) y el DOM.

   node docs/experiencia-v2/R-revision/herramientas/r4-a11y-estatico.mjs <url> [ancho] [tema]
     tema: light | dark (se estampa con trim.tema antes de cargar). */
import { lanzar, SIN_INTRO, INICIOS, lista, guardar, esperar } from './r4-comun.mjs'

const [base = 'http://localhost:5184', anchoTxt = '1280', tema = 'light'] = process.argv.slice(2)
const ancho = Number(anchoTxt), telefono = ancho < 600

/** Las pantallas que se revisan: el inicio de cada rol y las de las tareas clave. */
const RUTAS = [
  ...Object.values(INICIOS),
  '#/ger/resultados/ceiba/curso', '#/ger/equipos/ceiba', '#/sup/equipos/ceiba/P-201B', '#/conf/equipos/ceiba/P-201B/diagnostico',
  '#/prod/resultados/ceiba/curso', '#/sup/turno/ceiba/curso', '#/oper/causa/ceiba/curso', '#/tec/trabajo/ceiba/curso',
  '#/jefe/riesgo/ceiba/curso', '#/prod/planta/ceiba/curso', '#/adm/conectores/ceiba/curso', '#/prod/produccion/ceiba/curso',
]
const INTERACTIVOS = new Set(['button', 'link', 'checkbox', 'radio', 'combobox', 'textbox', 'menuitem', 'tab', 'switch', 'slider', 'spinbutton', 'searchbox', 'listbox', 'option', 'menuitemcheckbox', 'menuitemradio', 'treeitem'])

const navegador = await lanzar()
const ctx = await navegador.newContext({ viewport: { width: ancho, height: telefono ? 844 : 900 }, isMobile: telefono, hasTouch: telefono, locale: 'es-CO', timezoneId: 'America/Bogota' })
await ctx.addInitScript(SIN_INTRO)
await ctx.addInitScript(t => { try { localStorage.setItem('trim.tema', t) } catch { /* about:blank */ } }, tema)
const page = await ctx.newPage()
const cdp = await ctx.newCDPSession(page)
await cdp.send('Accessibility.enable')

const salida = {}
for (const ruta of RUTAS) {
  await page.goto('about:blank'); await page.goto(`${base}/${ruta}`); await lista(page); await esperar(700)
  // 1. Árbol de accesibilidad: lo interactivo sin nombre y las imágenes sin nombre.
  const { nodes } = await cdp.send('Accessibility.getFullAXTree')
  const sinNombre = [], imagenes = [], regiones = [], encabezados = []
  for (const n of nodes) {
    if (n.ignored) continue
    const rol = n.role?.value, nombre = (n.name?.value ?? '').trim()
    if (INTERACTIVOS.has(rol) && !nombre) sinNombre.push({ rol, id: n.backendDOMNodeId })
    if (rol === 'image' || rol === 'img' || rol === 'graphics-document') imagenes.push(nombre)
    if (['main', 'navigation', 'banner', 'contentinfo', 'complementary', 'region', 'form', 'search'].includes(rol)) regiones.push(`${rol}${nombre ? ` «${nombre}»` : ''}`)
    if (rol === 'heading') encabezados.push(`h${n.properties?.find(p => p.name === 'level')?.value?.value ?? '?'} ${nombre.slice(0, 60)}`)
  }
  const describir = async id => {
    try {
      const { object } = await cdp.send('DOM.resolveNode', { backendNodeId: id })
      const r = await cdp.send('Runtime.callFunctionOn', { objectId: object.objectId, returnByValue: true, functionDeclaration: 'function(){const e=this;return `${e.tagName.toLowerCase()}${e.className&&typeof e.className==="string"?"."+e.className.split(" ").slice(0,4).join("."):""} «${(e.outerHTML||"").slice(0,160)}»`}' })
      return r.result.value
    } catch { return '(sin nodo)' }
  }
  for (const x of sinNombre) x.de = await describir(x.id)
  // 2. El DOM: dibujos, marcas, título, referencias rotas, clic sin teclado, blancos.
  const dom = await page.evaluate(telefono => {
    const visible = e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' }
    const oculto = e => !!e.closest('[aria-hidden="true"],[inert]')
    const d = e => `${e.tagName.toLowerCase()}${e.getAttribute('aria-label') ? `[aria-label="${e.getAttribute('aria-label').slice(0, 70)}"]` : ''} «${(e.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 50)}»`
    // Dibujos (SVG con algo más que un ícono): su nombre y si lo oye el lector.
    const dibujos = [...document.querySelectorAll('main svg, [role=dialog] svg')].filter(s => !s.parentElement?.closest('svg') && visible(s))
      .map(s => { const r = s.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), rol: s.getAttribute('role'), nombre: s.getAttribute('aria-label') ?? (s.getAttribute('aria-labelledby') ? document.getElementById(s.getAttribute('aria-labelledby'))?.textContent?.trim() : null), oculto: oculto(s), textos: s.querySelectorAll('text').length, enfocables: s.querySelectorAll('[tabindex],a,button').length } })
      .filter(x => x.w * x.h > 900) // más de 30 × 30: no es un ícono
    // Marcas de prioridad y de condición: el nombre que oye el lector.
    const marcas = {}
    for (const s of document.querySelectorAll('svg[viewBox="0 0 14 14"]')) {
      if (!visible(s)) continue
      const k = oculto(s) || s.getAttribute('aria-hidden') === 'true' ? '(decorativa)' : s.getAttribute('aria-label') ?? '(sin nombre)'
      marcas[k] = (marcas[k] ?? 0) + 1
    }
    // Referencias a un id que no existe, e ids repetidos.
    const rotas = []
    for (const a of ['aria-controls', 'aria-labelledby', 'aria-describedby']) for (const e of document.querySelectorAll(`[${a}]`))
      for (const id of e.getAttribute(a).split(/\s+/)) if (id && !document.getElementById(id)) rotas.push(`${a}=${id} en ${d(e)}`)
    const ids = {}
    for (const e of document.querySelectorAll('[id]')) ids[e.id] = (ids[e.id] ?? 0) + 1
    const repetidos = Object.entries(ids).filter(([, n]) => n > 1).map(([id, n]) => `${id} ×${n}`)
    // Lo que tiene mano de clic pero no se alcanza con el teclado.
    const nativos = 'a[href],button,input,select,textarea,summary,label,[tabindex]:not([tabindex="-1"]),[role=button],[role=link]'
    const clicSinTeclado = [...document.querySelectorAll('body *')].filter(e => visible(e) && getComputedStyle(e).cursor === 'pointer' && !e.matches(nativos) && !e.closest(nativos) && !oculto(e)
      && !(e.parentElement && getComputedStyle(e.parentElement).cursor === 'pointer' && !e.parentElement.matches(nativos) && !e.parentElement.closest(nativos))).map(d).slice(0, 20)
    // Blancos táctiles: lo que se toca y mide menos de 44 px (24 es el mínimo de WCAG 2.5.8).
    const tocables = [...document.querySelectorAll('a[href],button,input,select,textarea,summary,[role=button],[role=link],[role=radio],[role=tab],[tabindex]:not([tabindex="-1"])')].filter(e => visible(e) && !oculto(e) && !e.closest('[data-no-r4]'))
    const chicos = tocables.map(e => { const r = e.getBoundingClientRect(); return { e, w: Math.round(r.width), h: Math.round(r.height) } })
      .filter(x => x.w < 44 || x.h < 44)
      .map(x => ({ w: x.w, h: x.h, bajo24: x.w < 24 || x.h < 24, en: x.e.closest('p,li') && x.e.tagName === 'A' ? 'enlace en texto' : '', de: d(x.e) }))
    const operador = [...document.querySelectorAll('[data-operador] button, [data-opcion]')].filter(visible).map(e => ({ h: Math.round(e.getBoundingClientRect().height), de: d(e) }))
    // La cifra principal: lo que la rodea, en el orden en que la lee el lector.
    const cifra = document.querySelector('[data-cifra-grande], [data-cifra]')
    const contenedorCifra = cifra?.closest('[data-cifra-grande]') ?? cifra?.parentElement?.parentElement
    return {
      titulo: document.title, idioma: document.documentElement.lang, dibujos, marcas, rotas, repetidos, clicSinTeclado,
      tocables: tocables.length, chicos, operador,
      cifra: contenedorCifra ? { html: contenedorCifra.outerHTML.slice(0, 900), rol: contenedorCifra.getAttribute('role'), nombre: contenedorCifra.getAttribute('aria-label') } : null,
    }
  }, telefono)
  salida[ruta] = { sinNombre, imagenes: imagenes.slice(0, 30), regiones: [...new Set(regiones)], encabezados: encabezados.slice(0, 30), ...dom }
}
await navegador.close()
const f = guardar(`a11y-estatico-${ancho}-${tema}.json`, { base, ancho, tema, salida })
console.log(`Nombres, regiones, dibujos, marcas y blancos · ${ancho} px · ${tema} → ${f}`)
for (const [ruta, x] of Object.entries(salida)) {
  console.log(`\n${ruta}  «${x.titulo}»  regiones: ${x.regiones.join(', ')}`)
  console.log(`  encabezados: ${x.encabezados.slice(0, 6).join(' | ')}${x.encabezados.length > 6 ? ` … (${x.encabezados.length})` : ''}`)
  if (x.sinNombre.length) console.log(`  SIN NOMBRE (${x.sinNombre.length}): ${x.sinNombre.slice(0, 4).map(s => `${s.rol} ${s.de}`).join('\n      ')}`)
  console.log(`  dibujos: ${x.dibujos.map(s => `${s.w}×${s.h} ${s.oculto ? 'oculto' : s.rol ?? 'sin rol'} «${(s.nombre ?? '—').slice(0, 80)}» (${s.textos} textos, ${s.enfocables} enfocables)`).join('\n           ') || '—'}`)
  console.log(`  marcas: ${Object.entries(x.marcas).map(([k, n]) => `${k} ×${n}`).join(' · ') || '—'}`)
  if (x.rotas.length) console.log(`  REFERENCIAS ROTAS: ${x.rotas.slice(0, 4).join(' | ')}`)
  if (x.repetidos.length) console.log(`  IDS REPETIDOS: ${x.repetidos.slice(0, 6).join(', ')}`)
  if (x.clicSinTeclado.length) console.log(`  CLIC SIN TECLADO (${x.clicSinTeclado.length}): ${x.clicSinTeclado.slice(0, 5).join(' | ')}`)
  if (telefono) console.log(`  blancos < 44 px: ${x.chicos.length} de ${x.tocables} (${x.chicos.filter(c => c.bajo24).length} bajo 24): ${x.chicos.slice(0, 6).map(c => `${c.w}×${c.h} ${c.de}`).join(' | ')}`)
  if (x.operador.length) console.log(`  opciones del operador: ${x.operador.map(o => `${o.h} px ${o.de}`).join(' | ')}`)
}
