/* F4 · La medición del inicio de un rol, sin desplazarse (PROMPT-REVISION-UX §4 y §11).
   Corre DENTRO de la página (page.evaluate(medirInicio)): no usa nada de fuera.

   Cuenta lo mismo que la medición «antes» de R1 (docs/experiencia-v2/R-revision/
   herramientas/medir.mjs, `palVista`, `cifVista` y `grandesVista`), para que el tope
   del −40 % compare lo mismo con lo mismo:
   - palabra: cada pedazo de texto visible, separado por espacios, con una letra o
     un número (HTML y SVG). No cuenta lo escondido, lo que recorta un contenedor,
     lo de un solo lector de pantalla ni el número dentro de una marca de prioridad;
   - sin desplazarse: lo que cae dentro de la ventana (toda la ventana: el panel o
     la banda, la cabecera y el contenido), palabra por palabra;
   - cifra: una palabra con un dígito que no es el tag de un equipo. Por la decisión
     D-1 del coordinador no cuentan las cuentas de la franja (`[data-franja]`) ni la
     fecha y la hora de los datos («hoy, 2 de oct · datos de las 14:00»);
   - cifra grande: un texto con un dígito de 40 px o más en pantalla. */

export type MedidaInicio = {
  /** Palabras sin desplazarse, en toda la ventana. */
  palabras: number
  /** Cifras sin desplazarse, sin la franja ni la fecha y la hora de los datos. */
  cifras: string[]
  /** Las cifras grandes (40 px o más) sin desplazarse. */
  grandes: string[]
}

export function medirInicio(): MedidaInicio {
  const vw = document.documentElement.clientWidth, vh = innerHeight
  const PAL = /[\p{L}\p{N}]/u
  const NUM = /\d/
  // El tag de un equipo («P-201B», «LC-21», «MPP-301», «SE-2») no es una cifra.
  const TAG = /^[^\p{L}\p{N}]*\p{Lu}{1,4}-\d+\p{Lu}?(?:[^\p{L}\p{N}]|$)/u
  // D-1: la fecha y la hora de los datos no cuentan como cifras.
  const HORA = [/\bhoy,\s+\d{1,2}\s+de\s+\p{L}+\.?/gu, /\bdatos\s+de\s+las\s+\d{1,2}:\d{2}/gu]
  type Caja = { l: number; t: number; r: number; b: number }
  const cache = new Map<Element, DOMRect | null>()
  const recorte = (e: Element) => {
    if (!cache.has(e)) {
      const c = getComputedStyle(e)
      cache.set(e, c.overflowX === 'visible' && c.overflowY === 'visible' ? null : e.getBoundingClientRect())
    }
    return cache.get(e)!
  }
  // Lo que se ve sin desplazarse: la caja recortada por cada ancestro que recorta y por la ventana.
  const cortar = (el: Element, r: DOMRect): Caja | null => {
    let x = { l: r.left, t: r.top, r: r.right, b: r.bottom }
    for (let a: Element | null = el; a && a !== document.documentElement && a !== document.body; a = a.parentElement) {
      const q = recorte(a)
      if (!q) continue
      x = { l: Math.max(x.l, q.left), t: Math.max(x.t, q.top), r: Math.min(x.r, q.right), b: Math.min(x.b, q.bottom) }
      if (x.r - x.l < 1.5 || x.b - x.t < 1.5) return null
    }
    x = { l: Math.max(x.l, 0), t: Math.max(x.t, 0), r: Math.min(x.r, vw), b: Math.min(x.b, vh) }
    return x.r - x.l < 1.5 || x.b - x.t < 1.5 ? null : x
  }
  const tamano = (el: Element) => {
    const fs = parseFloat(getComputedStyle(el).fontSize)
    const m = el instanceof SVGGraphicsElement ? el.getScreenCTM() : null
    return fs * (m ? Math.hypot(m.a, m.b) : 1)
  }
  const seVe = (el: Element) => typeof el.checkVisibility !== 'function' || el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
  const out: MedidaInicio = { palabras: 0, cifras: [], grandes: [] }
  const grandes = new Set<Element>()
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const rng = document.createRange()
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const txt = n.nodeValue ?? ''
    if (!PAL.test(txt)) continue
    const el = n.parentElement
    if (!el || /^(SCRIPT|STYLE|NOSCRIPT|TITLE|OPTION|TEMPLATE)$/.test(el.tagName)) continue
    const tip = el.closest('[role=tooltip]')
    if ((tip && !seVe(tip)) || !seVe(el)) continue
    // El número dentro de una marca de prioridad es parte del símbolo: ni palabra ni cifra.
    if (el.closest('svg')?.getAttribute('viewBox') === '0 0 14 14') continue
    rng.selectNodeContents(n)
    let rects = [...rng.getClientRects()].filter(q => q.width > 0.5 && q.height > 0.5)
    if (!rects.length && el.closest('svg')) { const q = el.getBoundingClientRect(); if (q.width > 0.5) rects = [q] }
    if (!rects.some(q => cortar(el, q))) continue
    const toks = [...txt.matchAll(/\S+/g)].filter(m => PAL.test(m[0]))
    // Si el nodo entero cabe, cuenta todo; si no, palabra por palabra.
    const entero = rects.every(q => { const v = cortar(el, q); return v && Math.abs(v.l - q.left) < 1 && Math.abs(v.r - q.right) < 1 && Math.abs(v.t - q.top) < 1 && Math.abs(v.b - q.bottom) < 1 })
    const enVista = entero ? toks : toks.filter(m => {
      try {
        rng.setStart(n, m.index); rng.setEnd(n, m.index + m[0].length)
        const q = [...rng.getClientRects()].find(z => z.width > 0.5)
        return q ? !!cortar(el, q) : false
      } catch { return false }
    })
    if (!enVista.length) continue
    out.palabras += enVista.length
    const franja = !!el.closest('[data-franja]')
    const deLaHora = HORA.flatMap(re => [...txt.matchAll(re)].map(m => [m.index, m.index + m[0].length] as const))
    for (const m of enVista) {
      if (!NUM.test(m[0]) || TAG.test(m[0]) || franja) continue
      if (deLaHora.some(([a, b]) => m.index >= a && m.index < b)) continue
      out.cifras.push(m[0])
      if (tamano(el) >= 40) grandes.add(el)
    }
  }
  out.grandes = [...grandes].map(e => `${(e.textContent ?? '').trim().slice(0, 24)} (${Math.round(tamano(e))} px)`)
  return out
}
