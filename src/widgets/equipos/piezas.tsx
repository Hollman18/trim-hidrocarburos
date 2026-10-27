import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { MarcaCondicion } from '@/shared/ui/Prioridad'
import type { CondicionFranja } from '@/shared/api/equiposTecnico'
import { cn } from '@/shared/lib/cn'
import { MARCA } from './filtros'

/** Un grupo de píldoras de una sola opción (un grupo de radios: las flechas pasan
 *  de una a otra). Lo escogido en índigo (X5 §3.1); cada una con su cuenta. Se
 *  parte en renglones si no cabe: nunca una barra que se desplaza de lado. */
export function Pildoras<K extends string>({ etiqueta, opciones, valor, onCambio, className }: {
  etiqueta: string
  opciones: ReadonlyArray<{ id: K; texto: string; n?: number }>
  valor: K
  onCambio: (k: K) => void
  className?: string
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  const mover = (e: KeyboardEvent, i: number) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!d) return
    e.preventDefault()
    const j = (i + d + opciones.length) % opciones.length
    onCambio(opciones[j]!.id)
    refs.current[j]?.focus()
  }
  return (
    <div role="radiogroup" aria-label={etiqueta} className={cn('flex flex-wrap gap-1.5', className)} data-filtro={etiqueta}>
      {opciones.map((o, i) => {
        const activo = o.id === valor
        return (
          <button key={o.id} ref={el => { refs.current[i] = el }} type="button" role="radio" aria-checked={activo} tabIndex={activo ? 0 : -1}
            data-opcion={o.id} onClick={() => onCambio(o.id)} onKeyDown={e => mover(e, i)}
            className={cn('inline-flex min-h-10 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[15px] font-semibold transition-colors duration-[120ms]',
              activo ? 'bg-[var(--primario)] text-[var(--primario-sobre)]' : 'bg-[var(--panel)] text-[var(--tinta)] shadow-[inset_0_0_0_1px_var(--linea)] hover:bg-[var(--panel2)]')}>
            {o.texto}
            {o.n !== undefined && <span className={cn('tabular text-[14px] font-normal', activo ? 'text-[var(--primario-sobre)] opacity-80' : 'text-[var(--tinta2)]')}>{o.n}</span>}
          </button>
        )
      })}
    </div>
  )
}

/** El tag de un equipo en Air Condensed Bold (X5 §3.4). */
export const Tag = ({ children, className }: { children: ReactNode; className?: string }) =>
  <b className={cn('font-cond font-bold tracking-[.02em]', className)}>{children}</b>

/** La tarjeta del nivel 3 con su título (15–16 px Semibold) y, a la derecha, el alcance (X5 §5.2). */
export function TarjetaN3({ titulo, extra, children, className, ...p }: {
  titulo: string; extra?: ReactNode; children: ReactNode; className?: string
} & Omit<React.HTMLAttributes<HTMLElement>, 'className' | 'children'>) {
  return (
    <section {...p} aria-label={titulo} className={cn('min-w-0 rounded-[20px] bg-[var(--panel)] px-4 pb-4 pt-3.5 sm:px-5 sm:pb-5 sm:pt-4', className)}>
      <h2 className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-[16px] font-semibold">
        {titulo}
        {extra && <span className="text-[13px] font-normal text-[var(--tinta2)]">{extra}</span>}
      </h2>
      {children}
    </section>
  )
}

/** Un enlace de B con su «›», para bajar o subir de nivel. */
export const IrA = ({ children, onClick, className, ...p }: { children: ReactNode; onClick: () => void; className?: string } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'className' | 'children'>) => (
  <button type="button" {...p} onClick={onClick} className={cn('no-imprimir inline-flex min-h-10 cursor-pointer items-center gap-0.5 text-left text-[15px] font-semibold text-[var(--tinta)] hover:underline', className)}>
    {children}<ChevronRight aria-hidden className="size-4 shrink-0 text-[var(--tinta2)]" />
  </button>
)

/** La marca de una condición, con la palabra al lado en listas y fichas (X5 §5.6). */
export function Marca({ c, tamano = 16, decorativa }: { c?: CondicionFranja; tamano?: number; decorativa?: boolean }) {
  return c ? <MarcaCondicion c={MARCA[c]} tamano={tamano} decorativa={decorativa} /> : null
}
