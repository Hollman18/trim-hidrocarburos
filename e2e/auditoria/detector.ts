/* El detector del auditor visual. Corre DENTRO de la página
   (page.evaluate(detectar)): por eso no usa nada de fuera de la función.

   Reporta, sobre lo que de verdad se ve (la caja recortada por cada ancestro
   que recorta):
   - «pantalla»: algo se sale del ancho de la ventana y la página se desplaza de lado;
   - «sale»: algo se sale de su tarjeta (el primer ancestro con borde o que recorta);
   - «recortado»: algo queda cortado por su tarjeta, o un texto de una línea
     no cabe y no tiene puntos suspensivos;
   - «encimado»: dos textos que se pisan, renglón por renglón (un texto que
     cambia de línea tiene una caja que abarca las dos y «pisaría» al vecino
     sin tocarlo). */

/** [tipo, elemento, cuánto (px o px²), contenedor o vecino] */
export type Hallazgo = [tipo: 'pantalla' | 'sale' | 'recortado' | 'encimado', elemento: string, cuanto: number, otro?: string]

export function detectar(): Hallazgo[] {
  const out: Hallazgo[] = []
  const vw = document.documentElement.clientWidth
  const raiz = document.getElementById('root')
  if (!raiz) throw new Error('la página no tiene #root')
  const desc = (e: Element) => {
    const t = (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 38)
    const c = (typeof (e as HTMLElement).className === 'string' ? (e as HTMLElement).className : e.getAttribute('class') || '').split(' ').filter(Boolean).slice(0, 3).join('.')
    return e.tagName.toLowerCase() + (c ? '.' + c : '') + (t ? ' «' + t + '»' : '')
  }
  const contenedor = (e: Element) => {
    let a = e.parentElement
    while (a && a !== raiz) {
      const cs = getComputedStyle(a)
      if (parseFloat(cs.borderLeftWidth) > 0 || parseFloat(cs.borderRightWidth) > 0 || cs.overflowX !== 'visible') return a
      a = a.parentElement
    }
    return null
  }
  type Caja = { l: number; t: number; r: number; b: number }
  // Lo que de verdad se ve: la caja recortada por cada ancestro que recorta.
  const visible = (e: Element, r: DOMRect): Caja | null => {
    let x = { l: r.left, t: r.top, r: r.right, b: r.bottom }
    for (let a = e.parentElement; a && a !== raiz; a = a.parentElement) {
      const c = getComputedStyle(a)
      if (c.overflowX === 'visible' && c.overflowY === 'visible') continue
      const q = a.getBoundingClientRect()
      x = { l: Math.max(x.l, q.left), t: Math.max(x.t, q.top), r: Math.min(x.r, q.right), b: Math.min(x.b, q.bottom) }
      if (x.r - x.l < 1 || x.b - x.t < 1) return null
    }
    return x
  }
  const reportados = new Set<Element | null>()
  const hojas: Element[] = []
  for (const el of raiz.querySelectorAll('*')) {
    const enSvg = el.closest('svg')
    if (enSvg && enSvg !== el && el.tagName.toLowerCase() !== 'text') continue
    const r = el.getBoundingClientRect()
    if (r.width < 2 || r.height < 2) continue
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) continue
    if (el.closest('[role=tooltip]')) continue
    // hojas de texto para buscar encimados
    const textoPropio = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent?.trim())
    if ((textoPropio || el.tagName.toLowerCase() === 'text') && visible(el, r)) hojas.push(el)
    if (enSvg && enSvg !== el) continue
    if (r.right > vw + 1 && document.documentElement.scrollWidth > vw + 1 && visible(el, r) && !reportados.has(el.parentElement)) {
      out.push(['pantalla', desc(el), Math.round(r.right - vw)]); reportados.add(el); continue
    }
    const a = contenedor(el)
    if (!a) continue
    const ca = getComputedStyle(a)
    if (ca.overflowX === 'auto' || ca.overflowX === 'scroll') continue
    const ra = a.getBoundingClientRect()
    const sale = Math.max(r.right - ra.right, ra.left - r.left)
    const elipsis = cs.textOverflow === 'ellipsis'
    if (sale > 1.5 && !elipsis && !reportados.has(el.parentElement)) {
      out.push([ca.overflowX === 'visible' ? 'sale' : 'recortado', desc(el), Math.round(sale), desc(a)])
      reportados.add(el)
    }
    if (el.scrollWidth > el.clientWidth + 2 && cs.whiteSpace === 'nowrap' && !elipsis
        && cs.overflowX !== 'visible' && el.children.length === 0)
      out.push(['recortado', desc(el), el.scrollWidth - el.clientWidth])
  }
  // Textos que se pisan entre sí, renglón por renglón.
  const caja = hojas.map(e => [e, [...e.getClientRects()].map(r => visible(e, r)).filter((v): v is Caja => v !== null)] as const)
  for (let i = 0; i < caja.length; i++) for (let j = i + 1; j < caja.length; j++) {
    const [a, ra] = caja[i]!, [b, rb] = caja[j]!
    if (a.contains(b) || b.contains(a)) continue
    let peor = 0
    for (const x of ra) for (const y of rb) {
      const w = Math.min(x.r, y.r) - Math.max(x.l, y.l)
      const h = Math.min(x.b, y.b) - Math.max(x.t, y.t)
      if (w > 3 && h > 3) peor = Math.max(peor, w * h)
    }
    if (peor) out.push(['encimado', desc(a), Math.round(peor), desc(b)])
  }
  return out
}
