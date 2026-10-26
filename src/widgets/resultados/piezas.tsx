import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

/* Las piezas de Resultados en el estilo de B (X5 §5.2): la tarjeta blanca de
   radio 20, sin borde ni sombra, con su cabecera (el título en frase, a 16 px
   Semibold, a la izquierda; el alcance o la calidad a la derecha), y el enlace
   a la subpantalla que tiene el detalle. */

/** Una tarjeta de Resultados: el título en frase («Diferido por equipo», nunca en mayúsculas). */
export function Tarjeta({ titulo, extra, children, className, ...p }: {
  titulo: string; extra?: ReactNode; children: ReactNode; className?: string
} & Record<`data-${string}`, unknown>) {
  return (
    <section {...p} aria-label={titulo} className={cn('min-w-0 rounded-[20px] bg-[var(--panel)] px-[18px] py-4 sm:px-6 sm:py-5', className)}>
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-[16px] font-semibold text-[var(--tinta)]">{titulo}</h2>
        {extra && <span className="text-[14px] text-[var(--tinta2)]">{extra}</span>}
      </header>
      {children}
    </section>
  )
}

/** «Ver el libro de diferidos ›»: abre la subpantalla con el detalle (si el rol la tiene). */
export function AlDetalle({ children, onClick, className }: { children: ReactNode; onClick?: () => void; className?: string }) {
  if (!onClick) return null
  return (
    <button type="button" onClick={onClick}
      className={cn('no-imprimir mt-3 inline-flex min-h-8 cursor-pointer items-center gap-0.5 text-[15px] font-semibold text-[var(--tinta)] hover:underline', className)}>
      {children}<ChevronRight aria-hidden className="size-4 text-[var(--tinta2)]" />
    </button>
  )
}
