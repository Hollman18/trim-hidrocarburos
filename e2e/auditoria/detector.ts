/* El detector del auditor visual. Corre DENTRO de la página
   (page.evaluate(detectar)): por eso no usa nada de fuera de la función.

   Reporta, sobre lo que de verdad se ve (la caja recortada por cada ancestro
   que recorta):
   - «pantalla»: algo se sale del ancho de la ventana y la página se desplaza de lado;
   - «sale»: algo se sale de su tarjeta (el primer ancestro con borde, que recorta,
     o —F4— con fondo propio y radio: la tarjeta de B no tiene borde);
   - «recortado»: algo queda cortado por su tarjeta, o un texto de una línea
     no cabe y no tiene puntos suspensivos;
   - «encimado»: dos textos que se pisan, renglón por renglón (un texto que
     cambia de línea tiene una caja que abarca las dos y «pisaría» al vecino
     sin tocarlo);
   - C5 · la regla de X3 §5.5 para el texto de un SVG: «recortado» si se sale de
     su <svg> (el SVG recorta por defecto, así que lo de afuera no se pinta y el
     recorrido de arriba no lo veía); «sale» si el <svg> no recorta; y «chico»
     si en la pantalla queda de menos de 12 px (X5 §3.4). Un dibujo con `viewBox`
     se encoge con su caja: un 12 de un dibujo de 640 se ve en 7 a 390 px. La
     única excepción es el número dentro de una marca de prioridad (el «1» del
     rombo, de 7,8 en un dibujo de 14: `Prioridad.tsx`); otra letra dentro de
     una marca (el «?» de la configuración, UI-16) sí cuenta.

   F4 (revisión total, PROMPT-REVISION-UX §11) suma:
   - «desborde»: un contenedor que se desplaza de lado sin ser un desplazable a
     propósito. En esta app la que se desplaza es `.vista` (overflow-y: auto, que
     computa overflow-x: auto): lo que la ensanchaba no movía la página y pasaba
     en verde (R1, medicion.md). A propósito es el que lo dice en su clase
     (`overflow-x-auto`) o con `desplazable()` («se desplaza de lado»);
   - «recortado» también para el texto de un SVG que corta un contenedor con
     `overflow: hidden` (no uno que se desplaza: ese se alcanza);
   - «grande»: más de una cifra grande (40 px o más en pantalla) por vista
     (X5 §2.1 y §3.4; X2 T1);
   - «color»: un color de estado sin forma y palabra al lado (X2 §4: el color
     sale solo en lo anormal y siempre con forma y palabra). Una marca de
     condición sin nombre accesible o sin texto a su lado, o un color de estado
     pintado fuera de una marca (sin forma);
   - «pestañas»: una barra de pestañas horizontal (`role=tablist` acostado,
     `role=tab`, o una fila de botones o enlaces con `aria-current`). El dueño:
     ninguna, ni arriba ni abajo; la navegación es el panel azul;
   - «mayúsculas»: un título en MAYÚSCULAS (D-3; X5 §3.4: «en frase, nunca en
     MAYÚSCULAS espaciadas»). Las siglas (SAP, PLC, ANH…) no cuentan;
   - «simulado»: una cifra simulada o proyectada tan grande como la mayor medida
     (P-05; regla 5: lo medido manda);
   - «pérdida»: lo diferido dicho como pérdida, «se pierde(n)» o «pierde N bbl»
     (T-8; regla 3: diferido no es pérdida). */

/** [tipo, elemento, cuánto (px, px², o una cuenta), contenedor o vecino] */
export type Hallazgo = [tipo: 'pantalla' | 'desborde' | 'sale' | 'recortado' | 'encimado' | 'chico' | 'grande' | 'simulado' | 'color' | 'pestañas' | 'mayúsculas' | 'pérdida',
  elemento: string, cuanto: number, otro?: string]

export function detectar(): Hallazgo[] {
  const out: Hallazgo[] = []
  const vw = document.documentElement.clientWidth
  // Con un diálogo modal abierto (la ficha, la introducción) se audita solo el
  // diálogo: la página sigue dibujada debajo del velo y cada título suyo «pisaba»
  // a uno de la ficha (decenas de encimados falsos por ruta).
  const raiz = document.querySelector('[role=dialog][aria-modal="true"]') ?? document.getElementById('root')
  if (!raiz) throw new Error('la página no tiene #root')
  const clase = (e: Element) => (typeof (e as HTMLElement).className === 'string' ? (e as HTMLElement).className : e.getAttribute('class') || '')
  const desc = (e: Element) => {
    const t = (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 38)
    const c = clase(e).split(' ').filter(Boolean).slice(0, 3).join('.')
    return e.tagName.toLowerCase() + (c ? '.' + c : '') + (t ? ' «' + t + '»' : '')
  }
  const css = new Map<Element, CSSStyleDeclaration>()
  const estilo = (e: Element) => { let c = css.get(e); if (!c) { c = getComputedStyle(e); css.set(e, c) } return c }
  /** Un color con su alfa: «rgb(…)», «rgba(…)» o «color(srgb …)». */
  const rgba = (c: string) => {
    const n = (c.match(/-?\d*\.?\d+(e-?\d+)?/gi) ?? []).map(Number)
    if (n.length < 3) return null
    // color(srgb r g b / a) llega en 0–1.
    const k = /^color\(/.test(c) ? 255 : 1
    return { r: n[0]! * k, g: n[1]! * k, b: n[2]! * k, a: n.length > 3 ? n[3]! : 1 }
  }
  // F4 · La tarjeta de B: fondo propio (el tono la separa del papel) y radio; sin borde ni sombra (X5 §5.2).
  const conFondo = (cs: CSSStyleDeclaration) => { const x = rgba(cs.backgroundColor); return !!x && x.a > 0.05 }
  const esTarjeta = (cs: CSSStyleDeclaration) => conFondo(cs) && parseFloat(cs.borderTopLeftRadius) >= 8
  // F4 · Un desplazable a propósito lo dice: su clase (`overflow-x-auto`) o `desplazable()` («se desplaza de lado»).
  const deLado = (e: Element) => /(^|\s)([\w-]+:)*overflow-(x-)?(auto|scroll)(\s|$)/.test(clase(e)) || /se desplaza de lado/.test(e.getAttribute('aria-label') ?? '')
  const desplaza = (cs: CSSStyleDeclaration) => cs.overflowX === 'auto' || cs.overflowX === 'scroll'
  const contenedor = (e: Element) => {
    let a = e.parentElement
    while (a && a !== raiz) {
      const cs = estilo(a)
      if (parseFloat(cs.borderLeftWidth) > 0 || parseFloat(cs.borderRightWidth) > 0 || cs.overflowX !== 'visible' || esTarjeta(cs)) return a
      a = a.parentElement
    }
    return null
  }
  type Caja = { l: number; t: number; r: number; b: number }
  // Lo que de verdad se ve: la caja recortada por cada ancestro que recorta.
  // Con `alcance`, solo los que recortan sin desplazarse (overflow hidden o clip), salvo el
  // <svg> que se dice (su corte ya se mide aparte): lo que corta un desplazable se alcanza
  // desplazándolo, también lo que queda debajo del borde de `.vista`.
  const visible = (e: Element, r: DOMRect, alcance?: { salvo: Element | null }): Caja | null => {
    let x = { l: r.left, t: r.top, r: r.right, b: r.bottom }
    for (let a = e.parentElement; a && a !== raiz; a = a.parentElement) {
      const c = estilo(a)
      if (c.overflowX === 'visible' && c.overflowY === 'visible') continue
      const q = a.getBoundingClientRect()
      if (alcance) {
        if (alcance.salvo && (a === alcance.salvo || a.closest('svg') === alcance.salvo)) continue
        // Lo de adentro de un desplazable se alcanza desplazándolo: lo que recorta más afuera
        // (la raíz de la app, de alto fijo, que envuelve a `.vista`) ya no lo esconde.
        if (/auto|scroll/.test(c.overflowX + c.overflowY)) break
        const enX = /hidden|clip/.test(c.overflowX), enY = /hidden|clip/.test(c.overflowY)
        if (!enX && !enY) continue
        x = { l: enX ? Math.max(x.l, q.left) : x.l, t: enY ? Math.max(x.t, q.top) : x.t, r: enX ? Math.min(x.r, q.right) : x.r, b: enY ? Math.min(x.b, q.bottom) : x.b }
      } else x = { l: Math.max(x.l, q.left), t: Math.max(x.t, q.top), r: Math.min(x.r, q.right), b: Math.min(x.b, q.bottom) }
      if (x.r - x.l < 1 || x.b - x.t < 1) return null
    }
    return x
  }
  const seVe = (e: Element) => typeof e.checkVisibility !== 'function' || e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })

  const reportados = new Set<Element | null>()
  const hojas: Element[] = []
  const todos = [...raiz.querySelectorAll('*')]

  // F4 · «desborde»: un contenedor que se desplaza de lado sin ser un desplazable a propósito
  // (también `.vista` y el diálogo mismo). Se dice cuánto y el que lo ensancha: el más
  // profundo de los que más se salen, sin contar lo que vive en otro desplazable o fijo.
  for (const s of [raiz, ...todos]) {
    if (s.closest('svg')) continue
    const cs = estilo(s)
    if (!desplaza(cs) || s.scrollWidth <= s.clientWidth + 1 || deLado(s) || !seVe(s)) continue
    const q = s.getBoundingClientRect()
    const borde = q.left + s.clientLeft + s.clientWidth
    let peor: Element | null = null, max = 0
    for (const e of s.querySelectorAll('*')) {
      if (e.closest('svg') && e.tagName.toLowerCase() !== 'svg') continue
      const r = e.getBoundingClientRect()
      const d = r.right - borde
      if (r.width < 1 || d <= 1 || d < max - 0.5) continue
      let propio = false
      for (let p: Element | null = e; p && p !== s; p = p.parentElement) {
        const c = estilo(p)
        if (c.position === 'fixed' || (p !== e && c.overflowX !== 'visible')) { propio = true; break }
      }
      if (!propio) { peor = e; max = Math.max(max, d) }
    }
    out.push(['desborde', desc(s), s.scrollWidth - s.clientWidth, peor ? desc(peor) : undefined])
  }

  for (const el of todos) {
    const enSvg = el.closest('svg')
    if (enSvg && enSvg !== el && el.tagName.toLowerCase() !== 'text') continue
    const r = el.getBoundingClientRect()
    if (r.width < 2 || r.height < 2) continue
    const cs = estilo(el)
    if (cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) continue
    // Lo de un <details> cerrado no se pinta, pero el navegador le da caja al medirlo:
    // sin esto, un botón plegado «pisaba» al que se ve en su lugar.
    if (typeof el.checkVisibility === 'function' && !el.checkVisibility()) continue
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
    const ca = estilo(a)
    // Un desplazable que de verdad se desplaza de lado: el que lo es a propósito no se revisa
    // por dentro, y el que no, ya salió arriba como «desborde» (una vez, no por cada hijo).
    if (desplaza(ca) && a.scrollWidth > a.clientWidth + 1) continue
    const ra = a.getBoundingClientRect()
    const sale = Math.max(r.right - ra.right, ra.left - r.left)
    // Los puntos suspensivos son el corte a propósito: en el elemento o en el contenedor que corta
    // (el `truncate` de «MPP-301 · Morichal Norte» a 320 px deja «MPP-301 · Mor…»).
    const elipsis = cs.textOverflow === 'ellipsis' || (ca.textOverflow === 'ellipsis' && ca.overflowX !== 'visible')
    if (sale > 1.5 && !elipsis && !reportados.has(el.parentElement)) {
      out.push([ca.overflowX === 'visible' ? 'sale' : 'recortado', desc(el), Math.round(sale), desc(a)])
      reportados.add(el)
    }
    if (el.scrollWidth > el.clientWidth + 2 && cs.whiteSpace === 'nowrap' && !elipsis
        && cs.overflowX !== 'visible' && el.children.length === 0)
      out.push(['recortado', desc(el), el.scrollWidth - el.clientWidth])
  }
  // C5 · X3 §5.5: el texto de un SVG. El recorrido de arriba solo usa los <text> para buscar
  // encimados: uno que se sale de su <svg> queda cortado y no se veía; uno que el viewBox
  // encoge por debajo de 12 px, tampoco. Se mide contra el <svg> de más afuera.
  for (const t of raiz.querySelectorAll('svg text')) {
    if (!t.textContent?.trim() || t.closest('[role=tooltip]')) continue
    if (typeof t.checkVisibility === 'function' && !t.checkVisibility()) continue
    const r = t.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) continue
    let s = t.closest('svg')
    // El número dentro de una marca de prioridad (14 × 14) es parte del símbolo: no se mide su tamaño.
    const numeroDeMarca = s?.getAttribute('viewBox') === '0 0 14 14' && /^[1-3]$/.test(t.textContent.trim())
    for (let p = s?.parentElement?.closest('svg'); p; p = p.parentElement?.closest('svg')) s = p
    if (!s) continue
    const q = s.getBoundingClientRect()
    const sale = Math.max(q.left - r.left, r.right - q.right, q.top - r.top, r.bottom - q.bottom)
    if (sale > 1.5) out.push([estilo(s).overflow === 'visible' ? 'sale' : 'recortado', desc(t), Math.round(sale), desc(s)])
    else {
      // F4 · Lo corta un contenedor que no se desplaza (overflow hidden): no se alcanza de ningún modo.
      const v = visible(t, r, { salvo: s })
      const corte = v ? Math.max(v.l - r.left, r.right - v.r, v.t - r.top, r.bottom - v.b) : r.width
      if (corte > 1.5) out.push(['recortado', desc(t), Math.round(corte), desc(s)])
    }
    if (numeroDeMarca) continue
    const m = (t as SVGGraphicsElement).getScreenCTM()
    const px = parseFloat(estilo(t).fontSize) * (m ? Math.hypot(m.a, m.b) : 1)
    if (px < 11.95) out.push(['chico', desc(t), Math.round(px * 10) / 10, desc(s)])
  }

  // F4 · «grande»: una sola cifra grande por vista (X5 §2.1 y §3.4: la principal de 48 a 72 px).
  // Cuenta lo que se alcanza bajando, no solo lo de la primera pantalla.
  // Y «simulado» (P-05; regla 5 del prompt): lo medido manda. Ninguna cifra que su renglón llama
  // «simulado» o «proyectado» es tan grande como la mayor de las medidas (desde 20 px: en una
  // tabla todas van igual y eso no es jerarquía).
  const grandes: string[] = []
  const SIMULADA = /\b(simulad[oa]s?|proyectad[oa]s?)\b/i
  let mayorMedida = 0, mayorSimulada = 0, cualSimulada = ''
  for (const el of [...todos].filter(e => !e.closest('[role=tooltip]'))) {
    const propio = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent ?? '').join('')
    if (!/\d/.test(propio) || !seVe(el)) continue
    if (el.closest('svg')?.getAttribute('viewBox') === '0 0 14 14') continue
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1 || !visible(el, r, { salvo: null })) continue
    const m = el instanceof SVGGraphicsElement ? el.getScreenCTM() : null
    const px = parseFloat(estilo(el).fontSize) * (m ? Math.hypot(m.a, m.b) : 1)
    const cifra = `${(el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 24)} (${Math.round(px)} px)`
    if (px >= 40) grandes.push(cifra)
    // Su renglón: el elemento o hasta dos arriba, mientras sea un renglón corto (no la tarjeta entera).
    let renglon: Element | null = el, simulada = false
    for (let i = 0; i < 3 && renglon && renglon !== raiz; i++, renglon = renglon.parentElement) {
      const t = (renglon as HTMLElement).innerText ?? renglon.textContent ?? ''
      if (t.length > 160) break
      if (SIMULADA.test(t)) { simulada = true; break }
    }
    if (simulada) { if (px > mayorSimulada) { mayorSimulada = px; cualSimulada = cifra } }
    else mayorMedida = Math.max(mayorMedida, px)
  }
  if (grandes.length > 1) out.push(['grande', grandes.join(' · '), grandes.length])
  if (mayorSimulada >= 20 && mayorSimulada >= mayorMedida)
    out.push(['simulado', `la cifra simulada o proyectada ${cualSimulada} es tan grande como la mayor medida (${Math.round(mayorMedida)} px)`, Math.round(mayorSimulada)])

  // F4 · «pérdida» (T-8; regla 3 del prompt): diferido no es pérdida. Lo que se deja de producir
  // nunca se dice «se pierde(n)» ni «pierde N bbl»; la pérdida es lo que salió y no se vendió.
  // Se lee todo el texto de la vista, también el de las ⓘ y el del papel: T-8 incluye las ⓘ
  // («dónde se pierde producción»).
  const PIERDE = /\bse\s+pierden?\b|\bpierden?\s+(?:≈\s*)?[\d.,]+\s*(?:bbl|barriles)|\bperdiéndose\b/i
  const wp = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT)
  const dichas = new Set<string>()
  for (let n = wp.nextNode(); n; n = wp.nextNode()) {
    const t = (n.nodeValue ?? '').replace(/\s+/g, ' ').trim()
    const p = n.parentElement
    if (!p || /^(SCRIPT|STYLE)$/.test(p.tagName) || !PIERDE.test(t) || dichas.has(t)) continue
    dichas.add(t)
    const i = t.search(PIERDE)
    out.push(['pérdida', `${p.tagName.toLowerCase()} «${t.slice(Math.max(0, i - 40), i + 30)}»`, 1])
  }

  // F4 · «color»: el color de estado (X2 §4, X5 §3.3) siempre con forma y palabra.
  // Los colores se leen del tema que está puesto: claro u oscuro.
  const ESTADO = ['--p1', '--p2', '--p3', '--interlock', '--sincom', '--p1-f', '--p2-f', '--p3-f', '--interlock-f', '--sincom-f']
  const muestra = document.createElement('i')
  document.body.append(muestra)
  const colores = ESTADO.map(n => { muestra.style.color = `var(${n})`; return [n, rgba(getComputedStyle(muestra).color)] as const })
    .filter((x): x is readonly [string, { r: number; g: number; b: number; a: number }] => !!x[1] && x[1].a > 0)
  muestra.remove()
  const deEstado = (c: string) => {
    const x = rgba(c)
    if (!x || x.a < 0.3) return null
    return colores.find(([, y]) => Math.abs(x.r - y.r) < 1.5 && Math.abs(x.g - y.g) < 1.5 && Math.abs(x.b - y.b) < 1.5)?.[0] ?? null
  }
  const MARCA = 'svg[viewBox="0 0 14 14"]'
  const PAL = /\p{L}{2,}/u
  /** La palabra al lado de una marca: un texto visible, con letras, en lo que la rodea, hasta
   *  cuatro ancestros. Se detiene en el primer control o renglón (un botón, una fila, una
   *  celda, un elemento de lista): la palabra tiene que estar en el mismo, no en el vecino.
   *  Así una píldora de la franja con solo «0» al lado de su marca no toma prestada la
   *  palabra de la píldora de al lado. */
  const LIMITE = /^(BUTTON|A|LI|TR|TD|TH|LABEL|SUMMARY)$/
  const ROL_LIMITE = /^(listitem|row|cell|gridcell|button|option|radio|checkbox|tab|menuitem|link)$/
  const palabraAlLado = (m: Element) => {
    let a: Element | null = m.parentElement
    for (let i = 0; i < 4 && a && a !== raiz; i++, a = a.parentElement) {
      const w = document.createTreeWalker(a, NodeFilter.SHOW_TEXT)
      for (let n = w.nextNode(); n; n = w.nextNode()) {
        const p = n.parentElement
        if (p && !m.contains(p) && PAL.test(n.textContent ?? '') && seVe(p) && !p.closest('[aria-hidden="true"]:not(svg)')) return true
      }
      if (LIMITE.test(a.tagName) || ROL_LIMITE.test(a.getAttribute('role') ?? '')) return false
    }
    return false
  }
  const marcas = new Set<Element>()
  const sinForma = new Map<string, number>()
  for (const el of todos) {
    const svgEl = el instanceof SVGElement
    const tag = el.tagName.toLowerCase()
    if (svgEl && !/^(path|rect|circle|ellipse|polygon|polyline|line|text|tspan)$/.test(tag)) continue
    const cs = estilo(el)
    const pintado = svgEl ? [cs.fill, cs.stroke]
      : [cs.backgroundColor, parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none' ? cs.borderTopColor : '',
        parseFloat(cs.borderLeftWidth) > 0 && cs.borderLeftStyle !== 'none' ? cs.borderLeftColor : '',
        [...el.childNodes].some(n => n.nodeType === 3 && PAL.test(n.textContent ?? '')) ? cs.color : '']
    const nombre = pintado.map(deEstado).find(Boolean)
    if (!nombre || !seVe(el)) continue
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) continue
    const m = el.closest(MARCA)
    if (m) { marcas.add(m); continue }
    // Fuera de una marca: el elemento pintado tiene que llevar adentro su forma y su palabra
    // (la etiqueta «P1 · ALARMA» con su rombo). Si no, es color sin forma.
    if (!svgEl && el.querySelector(MARCA) && PAL.test((el as HTMLElement).innerText ?? '')) continue
    // En un dibujo, el borde y el anillo del equipo (X2 §5.4.3, el esquema de Planta) van con
    // la marca y el nombre en el mismo nodo: hasta tres `g` arriba, una marca y un texto.
    if (svgEl) {
      let g = el.parentElement, conAmbas = false
      for (let i = 0; i < 3 && g && g.tagName.toLowerCase() === 'g' && !conAmbas; i++, g = g.parentElement)
        conAmbas = !!g.querySelector(MARCA) && [...g.querySelectorAll('text')].some(t => PAL.test(t.textContent ?? ''))
      if (conAmbas) continue
      // La punta de una minitendencia en el renglón de su señal, que ya lleva la marca y la palabra
      // (isa-101 C2 de R3: «el último punto de las minigráficas, con su marca en la fila»).
      const fila = el.closest('button, li, tr, [role=row], [role=listitem]')
      if (fila && fila.querySelector(MARCA) && PAL.test(fila.textContent ?? '')) continue
    }
    const clave = `${nombre} sin forma: ${desc(el)}`
    sinForma.set(clave, (sinForma.get(clave) ?? 0) + 1)
  }
  for (const [clave, n] of sinForma) out.push(['color', clave, n])
  for (const m of marcas) {
    const nombrada = m.getAttribute('aria-hidden') === 'true' || !!m.getAttribute('aria-label')?.trim()
    if (!nombrada) out.push(['color', `marca sin nombre accesible: ${desc(m.parentElement ?? m)}`, 1])
    // Dentro de un dibujo con su frase (`aria-label`, §8.8), la marca sobre una barra va sin
    // palabra al lado: así la dibuja la imagen 1 (el ■3 del mes que pasó el máximo).
    const dibujo = m.parentElement?.closest('svg')
    const enDibujo = !!dibujo && !!dibujo.getAttribute('aria-label')?.trim()
    // En el teléfono, la cuenta en cero de la franja queda con su forma y su «0» (X5 §5.6; T-4 refutado).
    const ceroDeLaFranja = !!m.closest('[data-franja]') && (m.closest('button') as HTMLElement | null)?.innerText.trim() === '0'
    // Un control compacto a propósito (la píldora del campo con el panel plegado, X5 §4.1:
    // «la misma píldora, chica, con la marca») lleva la palabra en su nombre y en su ayuda.
    const compacto = m.closest('[data-compacto]')
    const nombraCondicion = !!compacto && /alarma|atenci[oó]n|aviso|interlock|sin comunicaci[oó]n/i.test(`${compacto.getAttribute('aria-label') ?? ''} ${compacto.getAttribute('title') ?? ''}`)
    if (!enDibujo && !ceroDeLaFranja && !nombraCondicion && !palabraAlLado(m)) out.push(['color', `marca sin palabra al lado: ${(m.getAttribute('aria-label') ?? '').slice(0, 30)} en ${desc(m.parentElement ?? m)}`, 1])
  }

  // F4 · «pestañas»: ninguna barra horizontal (el dueño; X5 §4). Ni `role=tablist` acostado,
  // ni `role=tab` suelto, ni una fila de dos o más controles donde uno es «el actual».
  const NAV = 'nav[aria-label="Navegación"]'
  for (const l of raiz.querySelectorAll('[role=tablist]')) {
    if (!seVe(l) || l.closest(NAV)) continue
    const tabs = [...l.querySelectorAll('[role=tab]')].filter(seVe).map(x => x.getBoundingClientRect())
    const acostada = l.getAttribute('aria-orientation') !== 'vertical' || tabs.some((x, i) => i > 0 && Math.abs(x.top - tabs[0]!.top) < 4)
    if (acostada) out.push(['pestañas', `role=tablist ${desc(l)}`, tabs.length])
  }
  for (const t of raiz.querySelectorAll('[role=tab]')) if (seVe(t) && !t.closest('[role=tablist]') && !t.closest(NAV)) out.push(['pestañas', `role=tab ${desc(t)}`, 1])
  const filas = new Set<Element>()
  // `aria-current="step"` es el indicador de un asistente por pasos (Configurar, X4 §3.7), no una barra de pestañas.
  for (const c of raiz.querySelectorAll(':is(a, button)[aria-current]:not([aria-current="false"]):not([aria-current="step"]), [aria-selected="true"]:not([role=option]):not([role=tab])')) {
    if (c.closest(NAV) || !seVe(c)) continue
    // El grupo: el ancestro más cercano con otro control que se ve.
    let g = c.parentElement
    while (g && g !== raiz && [...g.querySelectorAll('a, button')].filter(x => x !== c && seVe(x)).length === 0) g = g.parentElement
    if (!g || filas.has(g)) continue
    const q = c.getBoundingClientRect()
    const vecinos = [...g.querySelectorAll('a, button')].filter(x => x !== c && seVe(x) && !x.contains(c) && !c.contains(x))
    const enFila = vecinos.filter(x => { const z = x.getBoundingClientRect(); return Math.abs(z.top - q.top) < 4 && Math.abs(z.height - q.height) < 8 })
    if (enFila.length >= 1) { filas.add(g); out.push(['pestañas', `fila con «el actual»: ${desc(g)}`, enFila.length + 1]) }
  }

  // F4 · «mayúsculas» (D-3): un título en MAYÚSCULAS. Título es un encabezado, o un texto
  // espaciado (letter-spacing ≥ 0,5 px), que es como se escribían las cabeceras de antes.
  // Basta una palabra gritada de cinco letras o más («SIN CAUSA · 2 paradas»); las siglas y
  // los códigos con guion o cifra («EPIC-CEIBA-02», «P-201B») no cuentan.
  const SIGLAS = /^(PRODML|SCADA|DEMO)$/
  for (const el of todos) {
    const titulo = /^H[1-6]$/.test(el.tagName) || el.getAttribute('role') === 'heading'
    const propio = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent ?? '').join(' ')
    if (!titulo && !(PAL.test(propio) && parseFloat(estilo(el).letterSpacing) >= 0.5)) continue
    if (el.closest('svg') || !seVe(el)) continue
    const texto = ((el as HTMLElement).innerText ?? '').trim()
    const gritadas = texto.split(/[\s·,:;()¿?¡!«»"/–—]+/)
      .filter(p => /^\p{L}{5,}$/u.test(p) && p === p.toUpperCase() && !SIGLAS.test(p.normalize('NFD').replace(/\p{M}/gu, '')))
    if (gritadas.length) out.push(['mayúsculas', `${el.tagName.toLowerCase()} «${texto.replace(/\s+/g, ' ').slice(0, 40)}»`, gritadas.length])
  }

  // Textos que se pisan entre sí, renglón por renglón. F4 · Solo dentro de la misma capa: un diálogo
  // que no es modal (la ficha del gerente sin velo, H7; las tres señas de la introducción, P-15) flota
  // sobre la vista a propósito, y su texto no «pisa» al de la página que tapa.
  const capa = (e: Element) => e.closest('[role=dialog], [role=tooltip]')
  const caja = hojas.map(e => [e, [...e.getClientRects()].map(r => visible(e, r)).filter((v): v is Caja => v !== null), capa(e)] as const)
  for (let i = 0; i < caja.length; i++) for (let j = i + 1; j < caja.length; j++) {
    const [a, ra, ca] = caja[i]!, [b, rb, cb] = caja[j]!
    if (a.contains(b) || b.contains(a) || ca !== cb) continue
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
