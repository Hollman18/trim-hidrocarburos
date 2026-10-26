import { useCallback, useRef, useState } from 'react'

/** El ancho de verdad de un contenedor, en px, para dibujar un SVG a su medida
 *  (C5; X3: un texto de SVG no baja de 12 px en pantalla). Con un `viewBox` fijo
 *  el dibujo se encoge en el teléfono y sus rótulos con él: a 390 px, un 12 de
 *  un dibujo de 640 se veía en 7. Dibujado al ancho medido, una unidad es un px
 *  y la letra que se escribe es la que se ve. `inicial` es el ancho mientras no
 *  se ha medido (el primer cuadro y el servidor). */
export function useAncho<T extends HTMLElement = HTMLDivElement>(inicial: number): [(e: T | null) => void, number] {
  const [ancho, setAncho] = useState(inicial)
  const obs = useRef<ResizeObserver | null>(null)
  const ref = useCallback((e: T | null) => {
    obs.current?.disconnect()
    obs.current = null
    if (!e) return
    const medir = () => { const w = Math.round(e.getBoundingClientRect().width); if (w > 0) setAncho(a => (Math.abs(a - w) >= 1 ? w : a)) }
    medir()
    if (typeof ResizeObserver === 'function') {
      obs.current = new ResizeObserver(medir)
      obs.current.observe(e)
    }
  }, [])
  return [ref, ancho]
}

/** Cada cuántos meses va un rótulo para que cada uno tenga al menos `minimo` px
 *  (X5 §5.4: de tres en tres cuando no caben todos). Siempre 1, 2 o 3. */
export const pasoDeRotulos = (pasoPx: number, minimo = 44) => (pasoPx >= minimo ? 1 : pasoPx * 2 >= minimo ? 2 : 3)

/** El ancho para dibujar una gráfica: el medido, sin bajar de `minimo` (por debajo,
 *  la gráfica se desplaza de lado). El `ref` va en el contenedor que NO se desplaza. */
export function useAnchoDibujo(minimo: number, inicial: number): [(e: HTMLDivElement | null) => void, number] {
  const [ref, ancho] = useAncho<HTMLDivElement>(inicial)
  return [ref, Math.max(minimo, ancho)]
}
