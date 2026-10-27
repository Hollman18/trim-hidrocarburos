import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { MarcaCondicion } from '@/shared/ui/Prioridad'
import { fraseEstado, valorEscrito, type CondicionKit, type EstadoKit } from './tipos'

/* 6 · La cifra (kit-scada.md §6; X2 §5.6). El rótulo de 2 a 4 palabras en la condensada, a 13
   o 14 px, en mayúsculas; el número tabular (el principal de 56 a 64 px, peso 650 y −0,035 em;
   los de apoyo de 20 a 28 px); la unidad corta, de 15 a 18 px, en --tinta2; la nota de una
   línea con la calidad y la vigencia; la marca a la izquierda del número si es anormal.
   Las reglas: una sola cifra de 32 px o más en la primera vista y como mucho 4 entre 20 y 31
   (T1); nunca en color; lo proyectado o simulado nunca más grande ni más arriba que lo medido
   (aunque se pida «principal», va como apoyo y con su palabra). */

export type CalidadCifra = 'medido' | 'calculado' | 'proyectado' | 'simulado'

export function Cifra({ rotulo, valor, unidad, decimales = 0, tamano = 'apoyo', estado = 'normal', condicion, calidad, nota, desde, mayusculas = true, className }: {
  /** De 2 a 4 palabras: «Se deja de producir». */
  rotulo: string
  valor: number | null
  unidad: string
  decimales?: number
  /** «principal»: la única de 32 px o más de la vista. */
  tamano?: 'principal' | 'apoyo'
  estado?: EstadoKit
  condicion?: CondicionKit
  calidad?: CalidadCifra
  /** Una línea: «ahora, 5 campos», «bajo la meta de 10.900», «nada registrado en octubre». */
  nota?: ReactNode
  /** «14:07», sin comunicación. */
  desde?: string
  /** El rótulo en mayúsculas, como lo pide el kit. Se puede apagar donde la regla D-3 del
   *  auditor (títulos en MAYÚSCULAS) lo marque: la decisión es de la tanda B. */
  mayusculas?: boolean
  className?: string
}) {
  const noMedida = calidad === 'proyectado' || calidad === 'simulado'
  // Lo proyectado nunca es la cifra grande (X2 §5.2): baja a apoyo aunque se pida principal.
  const grande = tamano === 'principal' && !noMedida
  const marca = estado === 'anormal' && condicion ? condicion : null
  const texto = valorEscrito(estado, valor, decimales)
  const apagada = estado === 'parado' || estado === 'sin-dato' || estado === 'sin-comunicacion'
  const lector = `${rotulo}: ${estado === 'sin-dato' || estado === 'sin-comunicacion' || valor === null ? fraseEstado(estado === 'sin-comunicacion' ? estado : 'sin-dato', { desde }) : `${texto} ${unidad}`}`
    + (marca ? `, en ${fraseEstado('anormal', { condicion: marca })}` : '') + (noMedida ? `, ${calidad}` : '') + (estado === 'parado' ? ', equipo parado' : '')

  return (
    <div data-kit="cifra" data-estado={estado} data-tamano={grande ? 'principal' : 'apoyo'} className={cn('min-w-0', className)}>
      <p className={cn('font-cond text-[13px] font-semibold leading-tight text-[var(--tinta2)]', mayusculas && 'uppercase tracking-[.06em]')}>{rotulo}</p>
      <p role="img" aria-label={lector} className={cn('mt-1 flex flex-wrap items-baseline gap-x-2', grande ? 'gap-x-2.5' : '')}>
        {marca && <MarcaCondicion c={marca} tamano={grande ? 20 : 16} decorativa className="self-center" />}
        {estado === 'sin-comunicacion' && <MarcaCondicion c="sin-comunicacion" tamano={grande ? 20 : 16} decorativa className="self-center" />}
        <b aria-hidden data-cifra-numero=""
          className={cn('tabular leading-none',
            grande ? 'text-[60px] font-[650] tracking-[-.035em] max-sm:text-[48px]' : 'text-[26px] font-bold tracking-[-.01em]',
            apagada ? 'text-[var(--tinta2)]' : 'text-[var(--tinta)]')}>
          {texto}
        </b>
        <span aria-hidden className={cn('text-[var(--tinta2)]', grande ? 'text-[18px]' : 'text-[15px]')}>{unidad}</span>
        {/* La palabra de lo que no se midió, del mismo tamaño que la unidad. */}
        {noMedida && <span aria-hidden className="rounded-[6px] border-[1.5px] border-dashed border-[var(--tinta3)] px-1.5 text-[14px] leading-[1.4] text-[var(--tinta2)]">{calidad}</span>}
      </p>
      {(nota || estado === 'sin-comunicacion') && (
        <p className="mt-1.5 text-[14px] leading-snug text-[var(--tinta2)]">
          {estado === 'sin-comunicacion' && (desde ? `sin comunicación desde ${desde}` : 'sin comunicación')}
          {estado === 'sin-comunicacion' && nota ? ' · ' : ''}{nota}
        </p>
      )}
    </div>
  )
}
