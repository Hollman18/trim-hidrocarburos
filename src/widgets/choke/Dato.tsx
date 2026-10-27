import type { ReactNode } from 'react'
import { MarcaCondicion } from '@/shared/ui/Prioridad'
import { n0 } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'

/** Un dato de apoyo dentro de un bloque (el balance, «¿Está funcionando?»): el rótulo, la cifra a 18 px
 *  con su unidad y una nota. Más chico que la cifra del kit (§6) a propósito: en la primera vista va una
 *  sola cifra grande y como mucho cuatro de 20 a 31 px (X2 §5.6, T1); estas acompañan. Sin valor dice
 *  «—» y la nota dice por qué («sin registro», «sin dato fiscal»), nunca un 0. Nunca en color: si se
 *  sale, la marca de aviso a su izquierda, con la palabra en la nota. */
export function Dato({ rotulo, valor, unidad, nota, aviso, className }: {
  rotulo: string; valor: number | null; unidad: string; nota?: ReactNode; aviso?: boolean; className?: string
}) {
  return (
    <div className={cn('min-w-0', className)} data-dato={rotulo}>
      <p className="font-cond text-[13px] font-semibold leading-tight text-[var(--tinta2)]">{rotulo}</p>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
        {aviso && <MarcaCondicion c="aviso" tamano={14} etiqueta="aviso" className="self-center" />}
        <b className={cn('tabular text-[18px] font-bold leading-none', valor === null ? 'text-[var(--tinta2)]' : 'text-[var(--tinta)]')}>{valor === null ? '—' : n0(valor)}</b>
        {valor !== null && <span className="text-[14px] text-[var(--tinta2)]">{unidad}</span>}
      </p>
      {nota && <p className="mt-1 text-[13px] leading-snug text-[var(--tinta2)]">{nota}</p>}
    </div>
  )
}
