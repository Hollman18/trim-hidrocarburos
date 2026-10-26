import type { ReactNode } from 'react'
import type { CifraMomento } from '@/shared/api/plantaViva'
import { cn } from '@/shared/lib/cn'
import { n0 } from './cifras'
import { useAcciones, useCompartir } from './acciones'

/** La cifra principal con su frase (X5 §5.1, la de B): el previo, la cifra con
 *  su unidad en palabras, la frase de 22 px y la explicación de dos renglones.
 *  Una sola por vista, medida o calculada, nunca simulada y nunca en color. */
export function CifraGrande({ c, telefono, conExplica = true, periodo }: {
  c: CifraMomento; telefono: boolean; conExplica?: boolean
  /** Después: el período en su propia ficha («octubre ▾»), en el previo (X4 §3.1, regla 8). */
  periodo?: ReactNode
}) {
  return (
    <div data-cifra-grande={c.momento} data-valor={c.valor}>
      {periodo && c.momento === 'despues'
        ? <div className={cn('flex flex-wrap items-center gap-2 font-medium text-[var(--tinta2)]', telefono ? 'text-[14px]' : 'text-[15px]')}>
          <span className="sr-only">{c.previo}</span><span aria-hidden>Lo que pasó ·</span>{periodo}
        </div>
        : <p className={cn('font-medium text-[var(--tinta2)]', telefono ? 'text-[14px]' : 'text-[15px]')}>{c.previo}</p>}
      <p className={cn('mt-1 flex flex-wrap items-baseline font-bold tracking-[-.03em] text-[var(--tinta)] tabular-nums',
        telefono ? `gap-x-2.5 ${c.previo.includes('campos') ? 'text-[52px]' : 'text-[48px]'} leading-[.95]` : 'gap-x-3.5 text-[68px] leading-[.95]')}>
        <span data-cifra="">{n0(c.valor)}</span>
        <small className={cn('font-medium tracking-normal text-[var(--tinta2)]', telefono ? 'text-[18px]' : 'text-[24px]')}>{c.unidad}</small>
      </p>
      <p data-frase="" className={cn('font-medium text-[var(--tinta)]', telefono ? 'mt-1.5 text-[19px] leading-[1.35]' : 'mt-2 text-[22px] leading-[1.35]')}>{c.frase}</p>
      {conExplica && <p data-explica="" className={cn('max-w-[660px] text-[var(--tinta2)]', telefono ? 'mt-1.5 text-[16px] leading-[1.5]' : 'mt-1.5 text-[17px] leading-[1.5]')}>{c.explica}</p>}
    </div>
  )
}

/** Los dos botones (nunca más de dos): uno principal en índigo y uno
 *  secundario con un aro fino. «Ver qué se está haciendo» abre la ficha del
 *  primer equipo del momento; «Compartir el informe», el PDF con folio. */
export function Botones({ c, className }: { c: CifraMomento; className?: string }) {
  const { abrir } = useAcciones()
  const x = useCompartir()
  if (!c.primerEquipo && !x.puede) return null
  return (
    <div className={cn('no-imprimir flex flex-wrap items-center gap-3', className)}>
      {c.primerEquipo && (
        <button type="button" onClick={() => abrir(c.primerEquipo)} data-ver-que-se-hace={c.primerEquipo.equipo}
          className="min-h-[48px] cursor-pointer whitespace-nowrap rounded-full bg-[var(--primario)] px-[22px] py-3 text-[16px] font-semibold text-[var(--primario-sobre)] transition-opacity duration-[120ms] hover:opacity-90">
          Ver qué se está haciendo
        </button>
      )}
      {x.puede && (
        <button type="button" onClick={() => void x.compartir()} disabled={x.ocupado}
          className="min-h-[48px] cursor-pointer whitespace-nowrap rounded-full px-[22px] py-3 text-[16px] font-semibold text-[var(--tinta)] shadow-[inset_0_0_0_1.5px_var(--linea)] transition-colors duration-[120ms] hover:bg-[var(--panel2)] disabled:opacity-60">
          Compartir el informe
        </button>
      )}
      {x.aviso && <p role="alert" className="basis-full text-[14px] text-[var(--tinta)]">{x.aviso}</p>}
    </div>
  )
}
