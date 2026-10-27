import { useRef, type KeyboardEvent } from 'react'
import { MOMENTOS, NOMBRE_MOMENTO, LEMA_MOMENTO, type Momento } from '@/shared/api/plantaViva'
import { cn } from '@/shared/lib/cn'

/** Antes · Durante · Después (X5 §5.9): un control de píldora de tres
 *  posiciones, en ese orden, con su aclaración corta en el escritorio. Sin los
 *  números 1, 2 y 3, que son de las prioridades. El escogido va en índigo.
 *  Es un grupo de radios: las flechas pasan de uno a otro (WAI-ARIA). */
export function Momentos({ valor, onCambio, corto = false, className }: {
  valor: Momento; onCambio: (m: Momento) => void; corto?: boolean; className?: string
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  const mover = (e: KeyboardEvent, i: number) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!d) return
    e.preventDefault()
    const j = (i + d + MOMENTOS.length) % MOMENTOS.length
    onCambio(MOMENTOS[j]!)
    refs.current[j]?.focus()
  }
  return (
    <div role="radiogroup" aria-label="Momento" data-momentos=""
      className={cn('grid grid-cols-3 gap-1 rounded-full bg-[var(--panel2)] p-1 shadow-[inset_0_0_0_1px_var(--linea)]', !corto && 'sm:inline-grid sm:grid-flow-col sm:grid-cols-none', className)}>
      {MOMENTOS.map((m, i) => {
        const activo = m === valor
        return (
          <button key={m} ref={el => { refs.current[i] = el }} type="button" role="radio" aria-checked={activo} tabIndex={activo ? 0 : -1}
            data-momento={m} onClick={() => onCambio(m)} onKeyDown={e => mover(e, i)}
            // `toque`: 44 px de blanco sin cambiar lo que se ve (UI-18; WCAG 2.5.8).
            className={cn('toque flex min-h-[40px] cursor-pointer items-baseline justify-center gap-1.5 whitespace-nowrap rounded-full px-[15px] py-2 text-[15px] font-semibold transition-colors duration-[120ms]',
              activo ? 'bg-[var(--primario)] text-[var(--primario-sobre)]' : 'text-[var(--tinta)] hover:bg-[var(--panel)]')}>
            {NOMBRE_MOMENTO[m]}
            {/* El lema del escogido, con el token de lo que va sobre el botón principal (UI-10): sin colores escritos a mano. */}
            {!corto && <small className={cn('hidden text-[14px] font-normal opacity-80 sm:inline', activo ? 'text-[var(--primario-sobre)]' : 'text-[var(--tinta2)]')}>{LEMA_MOMENTO[m]}</small>}
          </button>
        )
      })}
    </div>
  )
}
