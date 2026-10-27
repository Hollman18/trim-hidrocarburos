import type { VistaResultados } from '@/shared/api/resultados'
import { MarcaPrioridad } from '@/shared/ui/Prioridad'
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

/** La producción contra la meta, por día, y el cierre proyectado (o el total del
 *  período): la barra de Few (X5 §5.4), con el cuadrado de aviso junto a la cifra
 *  que se sale. Va debajo de la cifra, en la misma tarjeta. */
export function ProduccionContraMeta({ v }: { v: VistaResultados }) {
  const p = v.produccion, c = p.cierre
  const sin = p.sinMeta ?? 'sin meta firmada'
  return (
    <div data-produccion-meta="" className="grid gap-x-8 gap-y-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr))]">
      <div className="grid content-start gap-3">
        <h3 className="flex flex-wrap items-center gap-x-1.5 text-[15px] font-semibold text-[var(--tinta)]">Promedio por día<Info titulo={p.totales.titulo} texto={p.totales.texto} /></h3>
        <Barra rotulo="producción" valor={p.realBpd} unidad="bbl/d" meta={p.metaBpd} rotuloMeta={p.metaBpd !== null ? `meta ${n0(p.metaBpd)}` : sin} fuera={p.bajoMeta} />
        <Barra rotulo="diferido" valor={p.diferidoBpd} unidad="bbl/d" meta={p.maximoBpd} rotuloMeta={p.maximoBpd !== null ? `máximo ${n0(p.maximoBpd)}` : sin} fuera={p.sobreMaximo} />
      </div>
      <div className="grid content-start gap-3" data-cierre={c.proyectado ? 'proyectado' : 'total'}>
        <h3 className="flex flex-wrap items-center gap-x-1.5 text-[15px] font-semibold text-[var(--tinta)]">
          {c.titulo}{c.proyectado && <Calidad>proyectado</Calidad>}
          <Info titulo={c.titulo} texto={c.explica} />
        </h3>
        <Barra rotulo="producción" valor={c.produccion} unidad="bbl" meta={c.metaProduccion} rotuloMeta={c.metaProduccion !== null ? `meta ${n0(c.metaProduccion)}` : sin} fuera={c.bajoMeta} proyectado={c.proyectado} chica />
        <Barra rotulo="diferido" valor={c.diferido} unidad="bbl" meta={c.maximoDiferido} rotuloMeta={c.maximoDiferido !== null ? `máximo ${n0(c.maximoDiferido)}` : sin} fuera={c.sobreMaximo} proyectado={c.proyectado} chica />
      </div>
    </div>
  )
}

/** Una barra contra su meta: la cifra (con su cuadrado si se sale), la pista, la
 *  barra y la raya de la meta. Lo proyectado va con contorno y rayado (X5 §5.4).
 *  La escala parte de cero: un valor de cero o menos no pinta nada (H1), y lo que
 *  pasa de 1,25 veces la meta llega al final (X2 §5.2: lo dice la marca). `chica`:
 *  una cifra secundaria de la tarjeta (18 px; H11: como mucho 4 secundarias grandes). */
function Barra({ rotulo, valor, unidad, meta, rotuloMeta, fuera, proyectado, chica }: {
  rotulo: string; valor: number; unidad: string; meta: number | null; rotuloMeta: string; fuera: boolean; proyectado?: boolean; chica?: boolean
}) {
  const conBarra = meta !== null && meta > 0
  const ancho = conBarra ? Math.max(0, Math.min(1.25, valor / meta)) / 1.25 : 0
  const leido = `${rotulo}: ${n0(valor)} ${unidad}${conBarra ? `, ${rotuloMeta}` : ''}${fuera ? (rotulo === 'diferido' ? ', por encima del máximo' : ', por debajo de la meta') : ''}${proyectado ? ' (proyectado)' : ''}`
  return (
    <div className="min-w-0" role="img" aria-label={leido} data-barra-meta={rotulo}>
      <p className="flex flex-wrap items-baseline justify-between gap-x-2">
        <span className="text-[14px] text-[var(--tinta2)]">{rotulo}</span>
        <span className="tabular-nums text-[14px] text-[var(--tinta2)]">{rotuloMeta}</span>
      </p>
      <p className={cn('mt-0.5 flex items-center gap-1.5 font-bold leading-none text-[var(--tinta)] tabular-nums', chica ? 'text-[18px]' : 'text-[22px]')}>
        {fuera && <MarcaPrioridad s={3} tamano={14} decorativa />}{n0(valor)}<small className="text-[14px] font-normal text-[var(--tinta2)]">{unidad}</small>
      </p>
      {conBarra && (
        <span aria-hidden data-barra="" className="relative mt-2 block h-2.5 rounded-full bg-[var(--pista)]">
          {/* Sin nada que pintar, no hay relleno: un 0 no es una barra llena (H1). */}
          <i data-relleno="" className={cn('block h-full rounded-full', ancho > 0 && (proyectado ? 'border-[1.5px] border-[var(--tinta2)]' : 'bg-[var(--dato1)]'))}
            style={{ width: `${ancho * 100}%`, ...(proyectado && ancho > 0 ? { background: 'repeating-linear-gradient(45deg, var(--dato3) 0 2px, transparent 2px 5px)' } : {}) }} />
          <i data-raya="" className="absolute -inset-y-[5px] left-[80%] w-[3px] -translate-x-1/2 rounded-[2px] bg-[var(--tinta)]" />
        </span>
      )}
    </div>
  )
}
