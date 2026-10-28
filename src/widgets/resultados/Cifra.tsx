import type { VistaResultados } from '@/shared/api/resultados'
import { MarcaPrioridad } from '@/shared/ui/Prioridad'
import { Barra, Cifra as CifraKit } from '@/shared/ui/scada'
import { Calidad } from '@/shared/ui/primitivas'
import { Info } from '@/shared/ui/Info'
import { usd } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { n0, n2 } from './cifras'

const SELLO = { publicable: 'Se puede publicar', provisional: 'Provisional', bloqueado: 'Todavía no se puede publicar' } as const

/** La cifra grande de Resultados con su frase (X5 §5.1): «Lo que pasó · octubre,
 *  en curso» / 1.046 barriles / «no se produjeron en La Ceiba.» / contra el
 *  máximo firmado, quién se lo lleva y lo sin causa. Calculada, nunca simulada
 *  y nunca en color: si pasó el máximo, el cuadrado de aviso va antes del previo. */
export function Cifra({ v, telefono }: { v: VistaResultados; telefono: boolean }) {
  const c = v.cifra
  const dinero = c.valorUsd !== null ? usd(c.valorUsd) : null
  return (
    <div data-cifra-grande="" data-valor={c.valor} data-entero={c.entero} data-maximo={c.maximo ?? ''}>
      <p className={cn('flex flex-wrap items-center gap-x-2 font-medium text-[var(--tinta2)]', telefono ? 'text-[14px]' : 'text-[15px]')}>
        {c.sobreMaximo && <><MarcaPrioridad s={3} tamano={15} decorativa /><span>Aviso · pasó el máximo ·</span></>}
        <span data-periodo-resultados="">{c.previo}</span>
      </p>
      <p className={cn('mt-1 flex flex-wrap items-baseline font-bold tracking-[-.03em] text-[var(--tinta)] tabular-nums',
        telefono ? 'gap-x-2.5 text-[48px] leading-[.95]' : 'gap-x-3.5 text-[64px] leading-[.95]')}>
        <span data-cifra="">{n0(c.entero)}</span>
        <small className={cn('font-medium tracking-normal text-[var(--tinta2)]', telefono ? 'text-[18px]' : 'text-[24px]')}>{c.unidad}</small>
      </p>
      <p data-frase="" className={cn('font-medium text-[var(--tinta)]', telefono ? 'mt-1.5 text-[19px] leading-[1.35]' : 'mt-2 text-[22px] leading-[1.35]')}>{c.frase}</p>
      <p data-explica="" className={cn('max-w-[700px] text-[var(--tinta2)]', telefono ? 'mt-1.5 text-[16px] leading-[1.5]' : 'mt-1.5 text-[17px] leading-[1.5]')}>{c.explica}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[14px] text-[var(--tinta2)]">
        <span className="inline-flex flex-wrap items-center gap-1.5" data-rango="">
          <Calidad>calculado</Calidad> entre {n0(c.rango[0])} y {n0(c.rango[1])} bbl
          <Info titulo="Calculado, no medido" texto={`Lo producido se mide en el punto de medición oficial. Lo diferido se calcula con las pruebas de los pozos y las horas que estuvieron parados: es una estimación con su margen. La cifra real está dentro del rango. Exacta, ${n2(c.valor)} bbl: se redondea una vez y las partes se reparten para sumar el total.`} />
        </span>
        <span data-valor-usd="" className="inline-flex flex-wrap items-center gap-1.5">{dinero ? `${dinero.valor} ${dinero.unidad}` : 'sin precio'}{c.sinPrecio.length > 0 && dinero ? ` · sin ${c.sinPrecio.join(', ')}` : ''}
          {dinero && c.sinPrecio.length > 0 && <Info titulo="Valor" texto={`Sin contar los días sin precio de ${c.sinPrecio.join(', ')}.`} />}
          {!dinero && <Info titulo="Sin precio" texto="Falta el precio neto en la configuración." />}
        </span>
        <span className="inline-flex flex-wrap items-center gap-1.5" data-sello={v.publicar.estado}>
          {v.publicar.estado === 'bloqueado' && <MarcaPrioridad s={3} tamano={14} decorativa />}
          <span className="font-semibold text-[var(--tinta)]">{SELLO[v.publicar.estado]}</span>
          <Info titulo={SELLO[v.publicar.estado]} texto={v.publicar.texto} />
        </span>
      </div>
    </div>
  )
}

/** La producción contra la meta, por día, y el cierre proyectado (o el total del período), con el
 *  kit SCADA: la barra del instrumento (`Barra`) con la banda de lo normal desde la meta firmada
 *  (producción: sobre la meta; diferido: bajo el máximo) y su marca de aviso si se sale. Lo
 *  proyectado nunca lleva barra: va como cifra de apoyo con su palabra (kit §6). Va debajo de la
 *  cifra, en la misma tarjeta. */
export function ProduccionContraMeta({ v }: { v: VistaResultados }) {
  const p = v.produccion, c = p.cierre
  const sin = p.sinMeta ?? 'sin meta firmada'
  return (
    <div data-produccion-meta="" className="grid gap-x-8 gap-y-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr))]">
      <div className="grid content-start gap-3">
        <h3 className="flex flex-wrap items-center gap-x-1.5 text-[15px] font-semibold text-[var(--tinta)]">Promedio por día<Info titulo={p.totales.titulo} texto={p.totales.texto} /></h3>
        <ContraMeta rotulo="producción" valor={p.realBpd} unidad="bbl/d" meta={p.metaBpd} rotuloMeta={p.metaBpd !== null ? `meta ${n0(p.metaBpd)}` : sin} fuera={p.bajoMeta} sobre origen={p.totales.texto} />
        <ContraMeta rotulo="diferido" valor={p.diferidoBpd} unidad="bbl/d" meta={p.maximoBpd} rotuloMeta={p.maximoBpd !== null ? `máximo ${n0(p.maximoBpd)}` : sin} fuera={p.sobreMaximo} origen={p.totales.texto} />
      </div>
      <div className="grid content-start gap-3" data-cierre={c.proyectado ? 'proyectado' : 'total'}>
        <h3 className="flex flex-wrap items-center gap-x-1.5 text-[15px] font-semibold text-[var(--tinta)]">
          {c.titulo}
          <Info titulo={c.titulo} texto={c.explica} />
        </h3>
        <CifraKit rotulo="Producción" valor={Math.round(c.produccion)} unidad="bbl" mayusculas={false} calidad={c.proyectado ? 'proyectado' : undefined}
          estado={c.bajoMeta ? 'anormal' : 'normal'} condicion={c.bajoMeta ? 'aviso' : undefined}
          nota={c.metaProduccion !== null ? `meta ${n0(c.metaProduccion)}` : sin} />
        <CifraKit rotulo="Diferido" valor={Math.round(c.diferido)} unidad="bbl" mayusculas={false} calidad={c.proyectado ? 'proyectado' : undefined}
          estado={c.sobreMaximo ? 'anormal' : 'normal'} condicion={c.sobreMaximo ? 'aviso' : undefined}
          nota={c.maximoDiferido !== null ? `máximo ${n0(c.maximoDiferido)}` : sin} />
      </div>
    </div>
  )
}

/** Una cifra contra su meta con la barra del kit: la escala sale de la meta firmada (1,25 veces),
 *  nunca de la lectura; sin meta no hay barra y se dice. `sobre`: lo normal es estar sobre la meta. */
function ContraMeta({ rotulo, valor, unidad, meta, rotuloMeta, fuera, sobre = false, origen }: {
  rotulo: string; valor: number; unidad: string; meta: number | null; rotuloMeta: string; fuera: boolean; sobre?: boolean; origen?: string
}) {
  return (
    <div className="min-w-0" data-barra-meta={rotulo}>
      <p className="flex flex-wrap items-baseline justify-between gap-x-2 text-[14px] text-[var(--tinta2)]">
        <span>{rotulo}</span><span className="tabular-nums">{rotuloMeta}</span>
      </p>
      <Barra nombre={`${rotulo[0]!.toUpperCase()}${rotulo.slice(1)} por día, ${rotuloMeta}`} valor={valor} unidad={unidad} ancho={220} className="mt-1" origen={origen}
        escala={meta !== null && meta > 0 ? { min: 0, max: meta * 1.25, firmada: true } : undefined}
        banda={meta !== null && meta > 0 ? (sobre ? [meta, null] : [null, meta]) : undefined}
        estado={fuera ? 'anormal' : 'normal'} condicion={fuera ? 'aviso' : undefined} />
    </div>
  )
}
