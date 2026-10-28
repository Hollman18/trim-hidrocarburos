import { useEffect, useLayoutEffect, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/shared/lib/cn'

/** D1 (27-oct) · EL PANEL DE UN DESPLEGABLE, FUERA DE LO QUE LO RECORTA. El dueño (captura 2 y 3): en el
 *  panel lateral el menú de la persona salía cortado («Operad…», «Sistema · Claro · O…») y el selector
 *  de campo, apretado al ancho del panel, con el texto partido. El panel lateral se desplaza
 *  (`overflow-y-auto`) y eso recorta todo lo que se sale de sus 240 px (u 88 plegado).
 *
 *  Aquí el panel va en un portal (en el diálogo donde está el botón, si hay uno, como el panel del
 *  teléfono; si no, al final de la app), con `position: fixed`, su ancho propio y alineado al botón:
 *  - `abajo` / `arriba`: debajo o encima del botón, desde su borde izquierdo (`inicio`), su borde
 *    derecho (`fin`) o centrado;
 *  - `derecha`: a la derecha del botón (el panel plegado), desde su borde de arriba (`inicio`) o
 *    terminando en su borde de abajo (`fin`).
 *  Nunca se sale de la pantalla: se corre hacia adentro (12 px de margen) y, si no cabe de alto, se
 *  desplaza adentro.
 *
 *  El teclado: Tab desde el botón abierto entra al panel (en el DOM queda lejos); Mayús+Tab desde el
 *  primero vuelve al botón; Tab desde el último lo cierra y deja el foco en el botón. Escape y el clic
 *  afuera los maneja `useDesplegable` (con su `panel`). */
type Lado = 'abajo' | 'arriba' | 'derecha'
type Alinear = 'inicio' | 'fin' | 'centro'

const MARGEN = 12
const ENFOCABLES = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

function posicion(ancla: DOMRect, lado: Lado, alinear: Alinear, ancho: number, separacion: number): CSSProperties {
  const vw = document.documentElement.clientWidth, vh = window.innerHeight
  const w = Math.min(ancho, vw - 2 * MARGEN)
  const dentro = (x: number) => Math.round(Math.max(MARGEN, Math.min(x, vw - w - MARGEN)))
  if (lado === 'derecha') {
    const left = dentro(ancla.right + separacion)
    return alinear === 'fin'
      ? { left, width: w, bottom: Math.round(Math.max(MARGEN, vh - ancla.bottom)), maxHeight: Math.round(Math.max(200, ancla.bottom - MARGEN)) }
      : { left, width: w, top: Math.round(Math.max(MARGEN, ancla.top)), maxHeight: Math.round(Math.max(200, vh - ancla.top - MARGEN)) }
  }
  const x = alinear === 'fin' ? ancla.right - w : alinear === 'centro' ? ancla.left + ancla.width / 2 - w / 2 : ancla.left
  const left = dentro(x)
  return lado === 'arriba'
    ? { left, width: w, bottom: Math.round(vh - ancla.top + separacion), maxHeight: Math.round(Math.max(200, ancla.top - separacion - MARGEN)) }
    : { left, width: w, top: Math.round(ancla.bottom + separacion), maxHeight: Math.round(Math.max(200, vh - ancla.bottom - separacion - MARGEN)) }
}

export function Desplegado({ ancla, panel, id, etiqueta, lado = 'abajo', alinear = 'inicio', ancho = 320, separacion = 8, onCerrar, className, children, ...datos }: {
  /** El botón que lo abre (`boton` de `useDesplegable`). */
  ancla: RefObject<HTMLElement | null>
  /** El panel (`panel` de `useDesplegable`): un clic adentro no es «afuera». */
  panel: RefObject<HTMLDivElement | null>
  id: string
  /** El nombre del grupo para el lector («Escoger campo», «Mi perfil»). */
  etiqueta: string
  lado?: Lado
  alinear?: Alinear
  ancho?: number
  separacion?: number
  /** Cerrar (Tab desde el último). */
  onCerrar: () => void
  className?: string
  children: ReactNode
  [dato: `data-${string}`]: string | boolean | undefined
}) {
  const [lugar, setLugar] = useState<{ destino: HTMLElement; estilo: CSSProperties } | null>(null)

  useLayoutEffect(() => {
    const a = ancla.current
    if (!a) return
    const destino = a.closest<HTMLElement>('[role=dialog]') ?? document.querySelector<HTMLElement>('.raiz-app') ?? document.body
    const medir = () => setLugar({ destino, estilo: posicion(a.getBoundingClientRect(), lado, alinear, ancho, separacion) })
    medir()
    addEventListener('resize', medir)
    // Si lo de atrás se desplaza (el panel lateral), el desplegable sigue a su botón.
    addEventListener('scroll', medir, true)
    return () => { removeEventListener('resize', medir); removeEventListener('scroll', medir, true) }
  }, [ancla, lado, alinear, ancho, separacion])

  // El teclado entre el botón y el panel, que en el DOM quedan lejos.
  useEffect(() => {
    const a = ancla.current
    if (!a) return
    const enfocables = () => Array.from(panel.current?.querySelectorAll<HTMLElement>(ENFOCABLES) ?? []).filter(x => x.getClientRects().length > 0)
    const desdeBoton = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || e.shiftKey || e.defaultPrevented) return
      const primero = enfocables()[0]
      if (primero) { e.preventDefault(); primero.focus() }
    }
    const enPanel = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || e.defaultPrevented) return
      const lista = enfocables(), actual = document.activeElement
      if (e.shiftKey && actual === lista[0]) { e.preventDefault(); a.focus() }
      else if (!e.shiftKey && actual === lista.at(-1)) { e.preventDefault(); onCerrar(); a.focus() }
    }
    const p = panel.current
    a.addEventListener('keydown', desdeBoton)
    p?.addEventListener('keydown', enPanel)
    return () => { a.removeEventListener('keydown', desdeBoton); p?.removeEventListener('keydown', enPanel) }
  }, [ancla, panel, onCerrar, lugar])

  if (!lugar) return null
  return createPortal(
    <div ref={panel} id={id} role="group" aria-label={etiqueta} {...datos} style={{ position: 'fixed', ...lugar.estilo }}
      className={cn('no-imprimir z-[130] flex flex-col overflow-y-auto overscroll-contain rounded-[12px] bg-[var(--elevado)] text-[var(--tinta)] shadow-[var(--sombra-flota),0_0_0_1px_var(--linea)]',
        'transition-[opacity,translate] duration-[140ms] ease-[cubic-bezier(.2,0,0,1)] starting:opacity-0 motion-reduce:transition-none',
        lado === 'arriba' ? 'starting:translate-y-1' : lado === 'derecha' ? 'starting:-translate-x-1' : 'starting:-translate-y-1', className)}>
      {children}
    </div>,
    lugar.destino,
  )
}
