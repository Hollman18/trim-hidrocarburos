import { Fragment, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { resumenPlegadas, type SenalNivel3, type VistaNivel3 } from '@/shared/api/equiposTecnico'
import { Barra, Tendencia, type EstadoKit, type CondicionKit } from '@/shared/ui/scada'
import { Info } from '@/shared/ui/Info'
import { cn } from '@/shared/lib/cn'
import { TarjetaN3 } from './piezas'

/** I1 · Lo que se dice de la escala mientras el motor no tenga el rango de cada instrumento (H5). */
export const ESCALA_PROVISIONAL = 'La escala sale de los límites firmados (la banda normal y la alarma), no de las lecturas: no se mueve con el valor de ahora. Es provisional: falta el rango de cada instrumento y el disparo de cada protección; el sistema todavía no los trae. La banda gris es lo normal; la raya oscura, el límite de alarma.'

/** El límite en sus partes («normal 66.800 – 89.250 · alarma 85»): cada parte entera,
 *  sin partir un rango en dos renglones (UI-13). */
const Limite = ({ texto }: { texto: string }) => (
  <>{texto.split(' · ').map((t, i) => <Fragment key={t}>{i ? ' · ' : ''}<span className="whitespace-nowrap">{t}</span></Fragment>)}</>
)

/** El estado de la señal en el kit SCADA (kit-scada.md §0): parado (el equipo), sin
 *  comunicación, sin dato, anormal (la prioridad que da el motor) o normal. */
function estadoKit(s: Pick<SenalNivel3, 'gris' | 'valor' | 'condicion'>): { estado: EstadoKit; condicion?: CondicionKit } {
  if (s.gris) return { estado: 'parado' }
  if (s.condicion === 'sin-comunicacion') return { estado: 'sin-comunicacion' }
  if (s.valor === null) return { estado: 'sin-dato' }
  return s.condicion ? { estado: 'anormal', condicion: s.condicion } : { estado: 'normal' }
}
/** El límite que cruzó una señal anormal: el de alarma del lado por donde salió de su banda. */
const cruzoDe = (s: SenalNivel3) => {
  if (s.valor === null || !s.condicion || !s.alarmas.length) return undefined
  const v = s.valor
  return s.alarmas.filter(a => (s.banda?.[0] !== null && s.banda?.[0] !== undefined && a <= s.banda[0] ? v <= a : v >= a))[0] ?? s.alarmas[0]
}

/** Una señal (X5 §5.4; kit SCADA §1 y §2): el nombre y el tag, la barra del kit con su escala
 *  fija, su banda y su alarma (el valor a la derecha, con la marca si es anormal), el límite
 *  escrito debajo y la tendencia compacta de la ventana. Con el equipo parado, en gris y sin
 *  marca propia (X2 B9); sin lectura, «—» y su palabra, nunca un cero. */
function Senal({ s }: { s: SenalNivel3 }) {
  const k = estadoKit(s)
  const escala = s.escala ? { min: s.escala[0], max: s.escala[1], firmada: false } : undefined
  return (
    <div data-senal={s.tag} data-condicion={s.condicion ?? ''}
      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-t border-[var(--linea2)] py-2 @min-[480px]:grid-cols-[minmax(110px,1fr)_auto_auto]">
      <span className="min-w-0 text-[15px] font-medium leading-tight">
        {s.nombre}
        <small className="font-cond mt-0.5 block text-[13px] font-medium tracking-[.03em] text-[var(--tinta2)]">{s.tag} · <span data-limite><Limite texto={s.limite} /></span></small>
      </span>
      <span className="col-span-2 row-start-2 @min-[480px]:col-span-1 @min-[480px]:col-start-2 @min-[480px]:row-start-1" data-valor-kit>
        <Barra nombre={s.nombre} valor={s.valor} unidad={s.unidad} escala={escala} banda={s.banda ?? undefined} alarmas={s.alarmas}
          estado={k.estado} {...(k.condicion ? { condicion: k.condicion } : {})} {...(k.condicion ? { cruzo: cruzoDe(s) } : {})} decimales={s.decimales} ancho={168} />
      </span>
      {escala && (
        <span className="col-start-2 row-start-1 max-[359px]:hidden @min-[480px]:col-start-3">
          <Tendencia titulo={s.nombre} ventana={`${s.serie.length} d`} series={[{ nombre: s.nombre, valores: s.serie }]} escala={escala} unidad={s.unidad}
            banda={s.banda ?? undefined} alarmas={s.alarmas} estado={k.estado} {...(k.condicion ? { condicion: k.condicion } : {})} decimales={s.decimales} compacta ancho={120} alto={30} />
        </span>
      )}
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
    <TarjetaN3 titulo="Sus señales" className="@container" data-sus-senales
      extra={<span className="inline-flex flex-wrap items-center gap-x-1">tendencia de {dias} días{v.parado ? ' · parada: en gris y sin marca' : ''}
        {v.sinDisparo && <> · escala provisional <Info titulo="Escala provisional" texto={ESCALA_PROVISIONAL} /></>}</span>}>
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
    </TarjetaN3>
  )
}
