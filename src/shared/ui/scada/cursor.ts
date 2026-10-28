import { useCallback, useEffect, useRef, useState } from 'react'
import type { Ancla } from './Ficha'

/* D2 · Los ganchos del cursor del kit: dónde está el cursor en una gráfica (por el puntero, el dedo o
   las flechas), la ficha de una pieza sola y la medida del contenedor. Ninguno toca el motor: todo vive
   en el componente y lo de cada cuadro va en un requestAnimationFrame. */

/** El foco del kit: el anillo del foco (--foco), nunca un color de estado. */
export const CLASE_FOCO = 'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foco)]'

/** La caja del dibujo en la ventana, tomada en el evento (no al pintar). */
export interface Caja { left: number; top: number; width: number; height: number }
const caja = (e: Element): Caja => { const r = e.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height } }

/** Si la pieza vive dentro de algo que ya se toca (una fila que es un botón o un enlace), no se vuelve
 *  otra parada del teclado ni abre otra ficha: un control dentro de otro no es válido y dos globos se
 *  pisan. Lo dice el DOM al montarse. */
export function useAnidado<T extends Element>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null)
  const [anidado, setAnidado] = useState(false)
  useEffect(() => {
    const padre = ref.current?.parentElement
    setAnidado(!!padre?.closest('button, a[href], [role="button"], [role="link"], summary'))
  }, [])
  return [ref, anidado]
}

/** El ancho del contenedor (para `ajustar`: la gráfica a lo ancho del modal de detalle). */
export function useMedida(inicial: number, activo: boolean): [(e: HTMLElement | null) => void, number] {
  const [ancho, setAncho] = useState(inicial)
  const obs = useRef<ResizeObserver | null>(null)
  const ref = useCallback((e: HTMLElement | null) => {
    obs.current?.disconnect()
    obs.current = null
    if (!e || !activo) return
    const medir = () => { const w = Math.floor(e.getBoundingClientRect().width); if (w > 0) setAncho(a => (Math.abs(a - w) >= 1 ? w : a)) }
    medir()
    if (typeof ResizeObserver === 'function') { obs.current = new ResizeObserver(medir); obs.current.observe(e) }
  }, [activo])
  return [ref, activo ? ancho : inicial]
}

export type ModoCursor = 'puntero' | 'toque' | 'foco'
export interface EstadoCursor { i: number; modo: ModoCursor; caja: Caja }

/** El cursor de una gráfica por puntos (la tendencia, las columnas): el índice bajo el puntero, el dedo
 *  o las flechas. Pasar el cursor no toca el motor ni rehace el dibujo: el índice se calcula en un
 *  `requestAnimationFrame` (uno por cuadro, aunque lleguen veinte eventos) y solo cambia el estado si
 *  cambia el punto. En el teléfono, tocar y arrastrar de lado (el desplazamiento vertical sigue siendo
 *  de la página: `touch-action: pan-y`). Con el teclado, las flechas, Inicio, Fin y Re Pág / Av Pág;
 *  Escape la cierra sin cerrar lo de afuera (el modal). */
export function useCursor({ n, indiceEn, vista, inicial, activo, enfocable, anuncio }: {
  /** Cuántos lugares hay (0 a n − 1). */
  n: number
  /** Del x en las unidades del dibujo (su viewBox) al índice. */
  indiceEn: (x: number) => number
  /** El ancho del viewBox. */
  vista: number
  /** Dónde arranca con el teclado: la última lectura. */
  inicial: () => number
  activo: boolean
  enfocable: boolean
  /** La frase que se anuncia al moverse con el teclado. */
  anuncio: (i: number) => string
}) {
  const ref = useRef<SVGSVGElement>(null)
  const [cursor, setCursor] = useState<EstadoCursor | null>(null)
  const [dicho, setDicho] = useState('')
  const cuadro = useRef(0)
  const ultimo = useRef<{ x: number; modo: ModoCursor } | null>(null)
  const actual = useRef<EstadoCursor | null>(null)
  useEffect(() => { actual.current = cursor }, [cursor])

  const poner = useCallback((c: EstadoCursor | null) => {
    setCursor(p => (p === c || (p && c && p.i === c.i && p.modo === c.modo && p.caja.left === c.caja.left && p.caja.top === c.caja.top) ? p : c))
  }, [])
  const cerrar = useCallback(() => { cancelAnimationFrame(cuadro.current); cuadro.current = 0; poner(null) }, [poner])

  const indiceDe = useCallback((clientX: number) => {
    const svg = ref.current
    if (!svg) return null
    const r = caja(svg)
    if (!(r.width > 0)) return null
    return { i: Math.max(0, Math.min(n - 1, indiceEn(((clientX - r.left) / r.width) * vista))), caja: r }
  }, [n, indiceEn, vista])

  const programar = useCallback((x: number, modo: ModoCursor) => {
    ultimo.current = { x, modo }
    if (cuadro.current) return
    cuadro.current = requestAnimationFrame(() => {
      cuadro.current = 0
      const u = ultimo.current
      if (!u) return
      const d = indiceDe(u.x)
      if (d) poner({ ...d, modo: u.modo })
    })
  }, [indiceDe, poner])

  // Abierta: Escape la cierra; con el dedo, tocar fuera la cierra; desplazar la página, también
  // (la ficha es fija y se quedaría flotando lejos de su punto), salvo con el teclado.
  const abierta = cursor !== null
  useEffect(() => {
    if (!abierta) return
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape' && actual.current?.modo !== 'foco') { e.preventDefault(); e.stopPropagation(); cerrar() } }
    const fuera = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) cerrar() }
    // Con el teclado la ficha sigue a su punto (el navegador desplaza la página para mostrar el foco);
    // con el ratón o el dedo, se cierra.
    const desplazo = () => {
      const c = actual.current
      if (c?.modo === 'foco' && ref.current) poner({ ...c, caja: caja(ref.current) })
      else cerrar()
    }
    addEventListener('keydown', tecla, true)
    addEventListener('pointerdown', fuera, true)
    addEventListener('scroll', desplazo, { capture: true, passive: true })
    return () => { removeEventListener('keydown', tecla, true); removeEventListener('pointerdown', fuera, true); removeEventListener('scroll', desplazo, true) }
  }, [abierta, cerrar, poner])
  useEffect(() => () => cancelAnimationFrame(cuadro.current), [])

  const mover = (i: number) => {
    const j = Math.max(0, Math.min(n - 1, i))
    if (!ref.current) return
    poner({ i: j, modo: 'foco', caja: caja(ref.current) })
    setDicho(anuncio(j))
  }

  const props = !activo ? {} : {
    tabIndex: enfocable ? 0 : undefined,
    style: { touchAction: 'pan-y' as const, cursor: 'crosshair' },
    onPointerMove: (e: React.PointerEvent) => programar(e.clientX, e.pointerType === 'mouse' ? 'puntero' : 'toque'),
    onPointerDown: (e: React.PointerEvent) => { if (e.pointerType !== 'mouse') { const d = indiceDe(e.clientX); if (d) poner({ ...d, modo: 'toque' }) } },
    onPointerLeave: (e: React.PointerEvent) => { if (e.pointerType === 'mouse' && actual.current?.modo === 'puntero') cerrar() },
    onPointerCancel: () => cerrar(),
    onFocus: (e: React.FocusEvent) => {
      if (actual.current || !(e.currentTarget as Element).matches(':focus-visible')) return
      mover(inicial())
    },
    onBlur: () => cerrar(),
    onKeyDown: (e: React.KeyboardEvent) => {
      const i = actual.current?.i ?? inicial()
      const salto = Math.max(1, Math.round(n / 10))
      const destino = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? i + (actual.current ? 1 : 0)
        : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? i - (actual.current ? 1 : 0)
        : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1
        : e.key === 'PageUp' ? i + salto : e.key === 'PageDown' ? i - salto : null
      if (destino !== null) { e.preventDefault(); mover(destino); return }
      if (e.key === 'Escape' && actual.current) { e.preventDefault(); e.stopPropagation(); cerrar() }
    },
  }
  return { ref, cursor, props, dicho, cerrar }
}

/** La ficha de una pieza sola (la barra, la barra contra la meta): se abre al pasar el cursor, al
 *  tocarla o al llegar con Tab, y se ancla a la pieza (debajo o encima, sin salirse). */
export function useFichaPieza<T extends HTMLElement>(activo: boolean) {
  const [ref, anidado] = useAnidado<T>()
  const [ancla, setAncla] = useState<Ancla | null>(null)
  const anclar = useCallback(() => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setAncla({ x: r.left + Math.min(r.width, 240) / 2, y: r.top + r.height / 2, arriba: r.top, abajo: r.bottom, lado: false })
  }, [ref])
  const cerrar = useCallback(() => setAncla(null), [])
  const abierta = ancla !== null
  useEffect(() => {
    if (!abierta) return
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrar() } }
    const fuera = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) cerrar() }
    addEventListener('keydown', tecla, true)
    addEventListener('pointerdown', fuera, true)
    const desplazo = () => { if (ref.current && document.activeElement === ref.current) anclar(); else cerrar() }
    addEventListener('scroll', desplazo, { capture: true, passive: true })
    return () => { removeEventListener('keydown', tecla, true); removeEventListener('pointerdown', fuera, true); removeEventListener('scroll', desplazo, true) }
  }, [abierta, cerrar, anclar, ref])
  const vivo = activo && !anidado
  const props = !vivo ? {} : {
    tabIndex: 0,
    onPointerEnter: (e: React.PointerEvent) => { if (e.pointerType === 'mouse') anclar() },
    onPointerLeave: (e: React.PointerEvent) => { if (e.pointerType === 'mouse') cerrar() },
    onPointerDown: (e: React.PointerEvent) => { if (e.pointerType !== 'mouse') { if (abierta) cerrar(); else anclar() } },
    onFocus: (e: React.FocusEvent) => { if ((e.currentTarget as Element).matches(':focus-visible')) anclar() },
    onBlur: () => cerrar(),
  }
  return { ref, ancla: vivo ? ancla : null, props }
}

