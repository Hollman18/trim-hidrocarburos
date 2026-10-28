import { Fragment, useLayoutEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { DASH_TRAZO, type TrazoKit } from './tipos'

/* D2 · La ficha flotante del kit: lo que se ve al pasar el cursor, al tocar o al llegar con el teclado
   a una gráfica, una barra o una barra contra la meta. La misma en todas las piezas:
   - el cuándo (la fecha y la hora del punto) o el nombre de la pieza, arriba;
   - una fila por serie: su muestra de trazo (o su gris), su nombre, el valor con su unidad y, debajo,
     su estado en palabras («sobre la alarma de 85», «sin dato», «proyectado»);
   - al pie, los límites, la escala y de dónde sale.
   Con la disciplina de ISA-101: sin color (lo anormal ya lo dice la marca de la pieza), sin sombra ni
   animación; letra de 12 px o más y cifras tabulares. Se pinta en <body> (no la recorta ninguna
   tarjeta ni el modal) y se acomoda para no salirse de la pantalla: al lado del cursor en el
   escritorio, arriba del dedo en el teléfono. Es solo para la vista (aria-hidden): el lector oye lo
   mismo por el nombre accesible de la pieza y, al moverse con las flechas, por su región `aria-live`. */

export interface FilaFicha {
  clave: string
  /** La muestra del trazo de la serie (una tendencia) o el gris de la parte (las columnas). */
  trazo?: { trazo: TrazoKit; color: string; grosor: number }
  gris?: string
  nombre: string
  valor: string
  unidad?: string
  /** El estado de ese valor, en palabras: «sobre la alarma de 85», «sin dato», «proyectado». */
  nota?: string
  /** El valor que se sale de un límite va en negrita (nunca en color). */
  fuerte?: boolean
}

export interface ContenidoFicha {
  titulo: string
  sub?: string
  filas: FilaFicha[]
  pie?: string[]
}

/** Dónde se ancla la ficha, en px de la ventana. `lado`: a la derecha del punto (o a la izquierda si no
 *  cabe), centrada en `y`; si no, arriba de `arriba` (o debajo de `abajo` si no cabe), centrada en `x`. */
export interface Ancla { x: number; y: number; arriba: number; abajo: number; lado: boolean }

const MARGEN = 8

export function FichaFlotante({ contenido, ancla }: { contenido: ContenidoFicha; ancla: Ancla }) {
  const ref = useRef<HTMLDivElement>(null)
  // Se mide y se acomoda antes de pintarse: nunca se ve fuera de la pantalla, ni un cuadro.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const vw = document.documentElement.clientWidth, vh = window.innerHeight
    const w = el.offsetWidth, h = el.offsetHeight
    let left: number, top: number
    if (ancla.lado) {
      left = ancla.x + 16
      if (left + w > vw - MARGEN) left = ancla.x - 16 - w
      top = ancla.y - h / 2
    } else {
      left = ancla.x - w / 2
      top = ancla.arriba - h - 10
      if (top < MARGEN) top = ancla.abajo + 10
    }
    left = Math.max(MARGEN, Math.min(left, vw - w - MARGEN))
    top = Math.max(MARGEN, Math.min(top, vh - h - MARGEN))
    el.style.left = `${Math.round(left)}px`
    el.style.top = `${Math.round(top)}px`
    el.style.visibility = 'visible'
  })
  if (typeof document === 'undefined') return null
  const { titulo, sub, filas, pie } = contenido
  return createPortal(
    <div ref={ref} aria-hidden data-kit="ficha" data-ficha=""
      style={{ left: 0, top: 0, visibility: 'hidden', maxWidth: `min(320px, calc(100vw - ${MARGEN * 2}px))` }}
      className="no-imprimir pointer-events-none fixed z-[210] min-w-[176px] rounded-[8px] border border-[var(--linea)] bg-[var(--elevado)] px-3 py-2 text-[var(--tinta)]">
      <p className="text-[13px] font-semibold leading-snug" data-ficha-titulo="">{titulo}</p>
      {sub && <p className="text-[12px] leading-snug text-[var(--tinta2)]">{sub}</p>}
      {filas.length > 0 && (
        <div className="mt-1.5 grid grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-x-2 gap-y-0.5">
          {filas.map(f => (
            <Fragment key={f.clave}>
              <span className="self-center" aria-hidden>
                {f.trazo ? <MuestraTrazo {...f.trazo} /> : f.gris ? <i className="block size-2.5" style={{ background: f.gris }} /> : <i className="block w-[18px]" />}
              </span>
              <span className="min-w-0 text-[13px] leading-snug text-[var(--tinta2)]">{f.nombre}</span>
              <span className={`tabular whitespace-nowrap text-right text-[13px] ${f.fuerte ? 'font-bold' : 'font-semibold'}`} data-ficha-valor={f.clave}>
                {f.valor}{f.unidad ? <small className="ml-1 text-[12px] font-normal text-[var(--tinta2)]">{f.unidad}</small> : null}
              </span>
              {f.nota && <span className="col-span-2 col-start-2 text-[12px] leading-snug text-[var(--tinta2)]" data-ficha-nota={f.clave}>{f.nota}</span>}
            </Fragment>
          ))}
        </div>
      )}
      {pie && pie.length > 0 && (
        <p className="mt-1.5 border-t border-[var(--linea2)] pt-1.5 text-[12px] leading-snug text-[var(--tinta2)]">
          {pie.map((t, i) => <span key={i} className="block">{t}</span>)}
        </p>
      )}
    </div>, document.body)
}

/** La muestra de un trazo (la leyenda y la ficha): el mismo grosor, raya y gris que su línea. */
export function MuestraTrazo({ trazo, color, grosor }: { trazo: TrazoKit; color: string; grosor: number }) {
  return (
    <svg width={18} height={8} viewBox="0 0 18 8" aria-hidden data-kit="muestra" className="block">
      <line x1={1} x2={17} y1={4} y2={4} stroke={color} strokeWidth={grosor} strokeDasharray={DASH_TRAZO[trazo]} />
    </svg>
  )
}

/** La región viva de una gráfica: lo que se anuncia al moverse con las flechas. */
export function Anuncio({ children }: { children: ReactNode }) {
  return <span className="sr-only" aria-live="polite" data-anuncio="">{children}</span>
}
