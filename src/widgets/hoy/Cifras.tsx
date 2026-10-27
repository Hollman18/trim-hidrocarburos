import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

/** Un renglón «tipo número» del inicio (experiencia v3, `necesario-por-rol.md` §14):
 *  el rótulo, la cifra en negrita y lo que la acompaña, en una línea. El principal
 *  va grande (una sola cifra grande por vista, X5 §2.1); los de apoyo, a 22 px. Si
 *  abre algo (la hoja de la espera, el primero de la lista), toda la fila es el botón. */
export interface Renglon {
  /** «Por confirmar», «Avisan», «Si falla hoy». */
  rotulo: string
  /** La cifra tal cual la da el motor («4», «1.966», «7,7 de 8,1»), o «sin registro». */
  cifra: string
  /** «bbl/d», «días por falla». */
  unidad?: string
  /** Lo que la explica, después de «·»: «antes de las 07:00», «P-201B, LC-21». */
  detalle?: ReactNode
  /** Para las pruebas y el lector: qué número es. */
  id: string
  /** La cifra no es un dato todavía («sin registro», «sin dato»): va en gris, nunca un 0. */
  sinDato?: boolean
  onAbrir?: () => void
  /** El nombre accesible del botón, si abre algo. */
  abrir?: string
}

export function Cifras({ principal, apoyo, titulo, children, className }: {
  principal: Renglon
  apoyo: readonly (Renglon | false | null | undefined)[]
  /** El nombre de la sección para el lector («Su turno», «Lo de hoy»). */
  titulo: string
  /** Las acciones de un toque, debajo (como mucho dos juntas, X5 §5.1). */
  children?: ReactNode
  className?: string
}) {
  const filas = apoyo.filter((x): x is Renglon => !!x)
  return (
    <section aria-label={titulo} data-cifras className={cn('grid gap-3 rounded-[10px] bg-[var(--panel)] px-5 pb-4 pt-4 sm:px-7 sm:pb-5', className)}>
      <Fila r={principal} grande />
      {filas.length > 0 && <div className="grid">{filas.map(r => <Fila key={r.id} r={r} />)}</div>}
      {children && <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 pt-1">{children}</div>}
    </section>
  )
}

function Fila({ r, grande = false }: { r: Renglon; grande?: boolean }) {
  const cuerpo = (
    <>
      <span className={cn('text-[var(--tinta2)]', grande ? 'block text-[16px] font-medium' : 'text-[16px]')}>{r.rotulo}</span>
      <span className={cn('flex flex-wrap items-baseline gap-x-2', !grande && 'contents')}>
        <b className={cn('tabular font-bold', grande ? 'text-[44px] leading-[1] tracking-[-.02em] sm:text-[52px]' : 'text-[22px] leading-tight',
          r.sinDato && 'text-[var(--tinta2)]', r.sinDato && (grande ? 'text-[28px]' : 'text-[17px] font-semibold'))} data-cifra={grande ? '' : undefined}>{r.cifra}</b>
        {r.unidad && <span className={cn('text-[var(--tinta2)]', grande ? 'text-[19px]' : 'text-[15px]')}>{r.unidad}</span>}
        {r.detalle && !grande && <span className="text-[15px] text-[var(--tinta2)]"><span aria-hidden>· </span>{r.detalle}</span>}
      </span>
      {r.detalle && grande && <span className="text-[17px] font-medium leading-snug">{r.detalle}</span>}
    </>
  )
  const clase = cn(grande ? 'grid gap-1' : 'flex flex-wrap items-baseline gap-x-2 gap-y-0 border-t border-[var(--linea2)] py-2 first:border-t-0')
  if (!r.onAbrir) return <p className={clase} data-renglon={r.id}>{cuerpo}</p>
  return (
    <button type="button" onClick={r.onAbrir} aria-label={r.abrir} data-renglon={r.id}
      className={cn(clase, 'toque w-full cursor-pointer text-left hover:bg-[var(--panel2)]/60', !grande && 'pr-1')}>
      {cuerpo}
      <ChevronRight aria-hidden className="ml-auto size-4 self-center text-[var(--tinta3)]" />
    </button>
  )
}
