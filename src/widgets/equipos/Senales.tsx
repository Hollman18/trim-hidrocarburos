import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { resumenPlegadas, PALABRA_CONDICION, type SenalNivel3, type VistaNivel3 } from '@/shared/api/equiposTecnico'
import { IndicadorFijo } from '@/shared/ui/Analogico'
import { Minitendencia } from '@/shared/ui/Sparkline'
import { cn } from '@/shared/lib/cn'
import { TarjetaN3, Marca } from './piezas'

const valorDe = (s: Pick<SenalNivel3, 'valor' | 'decimales'>) =>
  s.valor === null ? '---' : s.valor.toLocaleString('es-CO', { minimumFractionDigits: s.decimales, maximumFractionDigits: s.decimales })

/** Una señal (X5 §5.4; X2 §5.1): el nombre y el tag, el indicador con su escala
 *  fija y su banda, el límite escrito debajo, la minitendencia de la ventana y el
 *  valor. El valor va en tinta; si es anormal, en negrita con la marca a su
 *  izquierda (X2 B5). Con el equipo parado, en gris y sin marca propia (X2 B9). */
function Senal({ s }: { s: SenalNivel3 }) {
  const etiqueta = `${s.nombre}, ${s.valor === null ? 'sin señal' : `${valorDe(s)} ${s.unidad}`}; ${s.limite}${s.gris ? '; equipo parado' : ''}${s.condicion ? `; ${PALABRA_CONDICION[s.condicion]}` : ''}`
  return (
    <div data-senal={s.tag} data-condicion={s.condicion ?? ''}
      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-t border-[var(--linea2)] py-2 @min-[380px]:grid-cols-[minmax(96px,1fr)_minmax(96px,156px)_auto]">
      <span className="col-start-1 row-start-1 min-w-0 text-[15px] font-medium leading-tight">
        {s.nombre}
        <small className="font-cond mt-0.5 block text-[13px] font-medium tracking-[.03em] text-[var(--tinta2)]">{s.tag}</small>
      </span>
      <span className="col-span-2 row-start-2 @min-[380px]:col-span-1 @min-[380px]:col-start-2 @min-[380px]:row-start-1">
        <IndicadorFijo escala={s.escala} banda={s.banda} alarmas={s.alarmas} valor={s.valor} gris={s.gris} fuera={s.fuera} etiqueta={etiqueta} />
      </span>
      <span className="col-span-2 row-start-3 -mt-0.5 text-[13px] text-[var(--tinta2)] @min-[380px]:col-span-1 @min-[380px]:col-start-2 @min-[380px]:row-start-2">{s.limite}</span>
      <span className="col-start-2 row-start-1 flex items-center justify-end gap-2 @min-[380px]:col-start-3">
        <span className="max-[359px]:hidden"><Minitendencia serie={s.serie} escala={s.escala} banda={s.banda} gris={s.gris} /></span>
        <span className="flex min-w-[72px] items-center justify-end gap-1.5 whitespace-nowrap">
          {s.condicion && <Marca c={s.condicion} tamano={15} decorativa />}
          <b className={cn('tabular text-[17px] leading-none', s.gris || s.valor === null ? 'font-semibold text-[var(--tinta2)]' : s.condicion ? 'font-bold' : 'font-semibold')} data-valor>
            {valorDe(s)}
          </b>
          {/* Sin lectura con el equipo parado es lo esperado (el motor apagado): no es «sin señal». */}
          <small className="text-[13px] text-[var(--tinta2)]">{s.valor === null ? (s.gris ? 'sin lectura' : 'sin señal') : s.unidad}</small>
        </span>
      </span>
    </div>
  )
}

/** «Sus señales» (la imagen 4): cada señal con su indicador analógico y su
 *  minitendencia; los interruptores, en palabras. Con más de ocho, las que están
 *  en banda van plegadas en un renglón (X4 §5.1, N3: «9 temperaturas · todas en banda ›»). */
export function SusSenales({ v }: { v: VistaNivel3 }) {
  const [abiertas, setAbiertas] = useState(false)
  const total = v.senales.length + v.plegadas.length
  if (!total && !v.discretas.length) return (
    <TarjetaN3 titulo="Sus señales">
      <p className="mt-2 text-[15px] text-[var(--tinta2)]">{v.registrado ? 'Este equipo no reporta señales a TRIM: solo su estado.' : 'Sin instrumento: TRIM no recibe ninguna señal de este equipo.'}</p>
    </TarjetaN3>
  )
  const dias = v.senales[0]?.serie.length ?? v.plegadas[0]?.serie.length ?? 12
  return (
    <TarjetaN3 titulo="Sus señales" extra={`tendencia de ${dias} días${v.parado ? ' · parada: en gris y sin marca' : ''}`} className="@container" data-sus-senales>
      <div className="mt-2">
        {v.senales.map(s => <Senal key={s.tag} s={s} />)}
        {v.plegadas.length > 0 && (
          <>
            <button type="button" aria-expanded={abiertas} onClick={() => setAbiertas(x => !x)} data-plegadas
              className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 border-t border-[var(--linea2)] py-2 text-left text-[15px] hover:bg-[var(--panel2)]/60">
              <span>{resumenPlegadas(v.plegadas)}</span>
              <ChevronDown aria-hidden className={cn('size-5 shrink-0 text-[var(--tinta2)] transition-transform duration-[120ms]', abiertas && 'rotate-180')} />
            </button>
            {abiertas && v.plegadas.map(s => <Senal key={s.tag} s={s} />)}
          </>
        )}
        {v.discretas.map(d => (
          <div key={d.tag} data-senal={d.tag} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 border-t border-[var(--linea2)] py-2 @min-[380px]:grid-cols-[minmax(96px,1fr)_minmax(96px,156px)_auto]">
            <span className="min-w-0 text-[15px] font-medium leading-tight">
              {d.nombre}
              <small className="font-cond mt-0.5 block text-[13px] font-medium tracking-[.03em] text-[var(--tinta2)]">{d.tag}</small>
            </span>
            <span className="hidden text-[14px] text-[var(--tinta2)] @min-[380px]:block">interruptor: no lleva gráfica</span>
            <b className="text-right text-[17px] font-semibold" data-valor>{d.valor}</b>
          </div>
        ))}
      </div>
      {v.sinDisparo && (
        <p className="mt-2 text-[14px] leading-snug text-[var(--tinta2)]">
          La banda gris es lo normal; la raya oscura, el límite de alarma. La escala de cada señal es fija. Falta el disparo de cada protección: el sistema todavía no lo trae.
        </p>
      )}
    </TarjetaN3>
  )
}
