import type { ReactNode } from 'react'
import { PALABRA_CONDICION, type SenalNivel3, type CondicionFranja } from '@/shared/api/equiposTecnico'
import { IndicadorFijo } from '@/shared/ui/Analogico'
import { Minitendencia } from '@/shared/ui/Sparkline'
import { MarcaCondicion } from '@/shared/ui/Prioridad'
import { cn } from '@/shared/lib/cn'

/** F3 · La condición de un equipo con su palabra al lado (X2 F1; X5 §5.6): la
 *  marca es la de la franja (una por equipo, la misma en todas partes) y la
 *  palabra la dice, así la forma no se anuncia dos veces. Sin condición, nada:
 *  lo normal no lleva marca (X5 §5.5). */
export function CondicionEquipo({ c, tamano = 14, className }: { c?: CondicionFranja; tamano?: number; className?: string }) {
  if (!c) return null
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1 whitespace-nowrap', className)} data-condicion-equipo={c}>
      <MarcaCondicion c={c} tamano={tamano} decorativa />
      <span className="text-[13px] font-semibold text-[var(--tinta)]">{PALABRA_CONDICION[c]}</span>
    </span>
  )
}

const valorDe = (s: Pick<SenalNivel3, 'valor' | 'decimales'>) =>
  s.valor === null ? '---' : s.valor.toLocaleString('es-CO', { minimumFractionDigits: s.decimales, maximumFractionDigits: s.decimales })

/** F3 · Una señal con la escala FIJA que da el motor (`nivelEquipo`; X2 §5.1 e I1;
 *  H5 y H12): el indicador de alto desempeño con su banda normal y su alarma, la
 *  minitendencia de la ventana sobre la misma escala, y el valor en tinta (en
 *  negrita si es anormal, con la marca a su izquierda: X2 B5). Con el equipo
 *  parado, en gris y sin marca propia (X2 B9). La pantalla no calcula escala ni
 *  prioridad: las dos vienen del motor. Sin lectura, «---» y su porqué en gris
 *  (la marca morada la pone el motor solo con el equipo en marcha: X2 E2). */
export function SenalFija({ s, nombre, sub, detalle = false, className }: {
  s: SenalNivel3
  /** El nombre que se muestra; sin él, el del instrumento. */
  nombre?: ReactNode
  /** Segundo renglón del nombre: el tag y de dónde viene la lectura. */
  sub?: ReactNode
  /** Con detalle, debajo del indicador se escribe la banda y la alarma. */
  detalle?: boolean
  className?: string
}) {
  const etiqueta = `${s.nombre}, ${s.valor === null ? 'sin señal' : `${valorDe(s)} ${s.unidad}`}; ${s.limite}${s.gris ? '; equipo parado' : ''}${s.condicion ? `; ${PALABRA_CONDICION[s.condicion]}` : ''}`
  return (
    <div className={cn('min-w-0', className)} data-senal-fija={s.tag} data-condicion={s.condicion ?? ''} data-gris={s.gris ? 'si' : 'no'}>
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 text-[14px] leading-snug text-[var(--tinta2)]">
          <span className="block">{nombre ?? s.nombre}</span>
          {sub && <small className="block text-[13px] text-[var(--tinta2)]">{sub}</small>}
        </span>
        <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
          {s.condicion && <MarcaCondicion c={s.condicion} tamano={14} etiqueta={PALABRA_CONDICION[s.condicion]} />}
          <b className={cn('tabular text-[16px] leading-none', s.gris || s.valor === null ? 'font-semibold text-[var(--tinta2)]' : s.condicion ? 'font-bold' : 'font-semibold')} data-valor>
            {valorDe(s)}
          </b>
          {/* Sin lectura con el equipo parado es lo esperado (el motor apagado): no es «sin señal». */}
          <small className="text-[13px] text-[var(--tinta2)]">{s.valor === null ? (s.gris ? 'sin lectura' : 'sin señal') : s.unidad}</small>
        </span>
      </div>
      {/* Sin ningún límite declarado no hay escala: el indicador no se dibuja ni se inventa, se dice (H5; X2 §7.8). */}
      {s.escala ? (
        <div className="mt-1 flex items-center gap-2">
          <span className="min-w-0 flex-1">
            <IndicadorFijo escala={s.escala} banda={s.banda} alarmas={s.alarmas} valor={s.valor} gris={s.gris} fuera={s.fuera} etiqueta={etiqueta} />
          </span>
          <span className="max-[359px]:hidden"><Minitendencia serie={s.serie} escala={s.escala} banda={s.banda} gris={s.gris} /></span>
        </div>
      ) : <small className="mt-1 block text-[13px] text-[var(--tinta2)]" data-sin-escala>sin límite declarado: no se dibuja su indicador</small>}
      {detalle && <small className="tabular mt-0.5 block text-[13px] text-[var(--tinta2)]">{s.limite}</small>}
    </div>
  )
}
