import type { VistaResultados } from '@/shared/api/resultados'
import { MarcaPrioridad } from '@/shared/ui/Prioridad'
import { Calidad } from '@/shared/ui/primitivas'
import { Info } from '@/shared/ui/Info'
import { cn } from '@/shared/lib/cn'
import { fechaCorta } from '@/entities/reloj'
import { Tarjeta, AlDetalle } from './piezas'
import { n0, n1 } from './cifras'

type Equipo = { campoId: string; equipo: string }

/** «Diferido por equipo» del período (X5 §5.4): la marca de hoy y su palabra, el
 *  tag en letra condensada, la familia, los barriles, la parte y una barra de
 *  5 px. Cada fila abre la ficha del equipo. */
export function PorEquipo({ v, onAbrir, onVerTodo }: { v: VistaResultados; onAbrir: (e: Equipo) => void; onVerTodo?: () => void }) {
  const varios = v.campos.length > 1
  return (
    <Tarjeta titulo="Diferido por equipo" extra={`${v.periodo.replace(', en curso', '')} · calculado`} data-por-equipo="">
      {v.porEquipo.filas.length === 0 && <p className="mt-2 text-[15px] text-[var(--tinta2)]">Nada se trabó en {v.periodo}.</p>}
      <div className="mt-2">
        {v.porEquipo.filas.map(e => (
          <button key={`${e.campoId}/${e.equipo}`} type="button" onClick={() => onAbrir(e)} data-equipo-diferido={e.equipo} data-bbl={e.bbl}
            className="grid min-h-14 w-full cursor-pointer grid-cols-[18px_1fr_auto] items-center gap-x-2.5 gap-y-1 border-t border-[var(--linea2)] py-2 text-left first:border-t-0 hover:bg-[var(--panel2)]">
            <span className="flex">{e.prioridad ? <MarcaPrioridad s={e.prioridad} tamano={15} /> : null}</span>
            <span className="min-w-0">
              <span className="font-cond text-[16px] font-bold tracking-[.02em] text-[var(--tinta)]">{e.equipo}</span>{' '}
              <span className="text-[14px] text-[var(--tinta2)]">{e.familia}{e.palabra ? ` · ${e.palabra}` : ''}{varios ? ` · ${e.campo}` : ''}</span>
            </span>
            <span className="text-right text-[16px] font-bold text-[var(--tinta)] tabular-nums">{n0(e.bbl)}<small className="block text-[13px] font-normal text-[var(--tinta2)]">{e.pct < 1 && e.pct > 0 ? '< 1' : n0(e.pct)} %</small></span>
            <span className="relative col-span-2 col-start-2 h-[5px] rounded-full bg-[var(--pista)]"><i className="absolute inset-y-0 left-0 rounded-full bg-[var(--dato1)]" style={{ width: `${Math.min(100, e.pct)}%` }} /></span>
          </button>
        ))}
      </div>
      {v.porEquipo.total > v.porEquipo.filas.length && <p className="mt-1 text-[14px] text-[var(--tinta2)]">y {n0(v.porEquipo.total - v.porEquipo.filas.length)} equipos más</p>}
      <AlDetalle onClick={onVerTodo}>Ver todos en el libro de diferidos</AlDetalle>
    </Tarjeta>
  )
}

/** «¿Está bajando? Desde que entró TRIM»: lo no planeado por día de cada tramo,
 *  antes y con TRIM (las dos flechas, la que baja y la que sube: U2 §7.3), lo de
 *  alto impacto y el mantenimiento proactivo (si no sube, las fallas no bajan). */
export function Bajando({ v }: { v: VistaResultados }) {
  const b = v.bajando, p = v.proactivo
  return (
    <Tarjeta titulo="¿Está bajando? Desde que entró TRIM" data-bajando="">
      {!b && <p className="mt-2 text-[15px] text-[var(--tinta2)]">Sin tres meses de historia antes de TRIM: no hay con qué comparar.</p>}
      {b && (
        <div className="mt-2.5 flex flex-col gap-1.5">
          {b.filas.map(f => (
            <p key={f.tramo} data-flecha={f.tramo} className="grid grid-cols-[104px_auto_1fr] items-baseline gap-2 text-[15px] text-[var(--tinta2)]">
              <span>{f.nombre}</span>
              <b className="text-[18px] font-bold text-[var(--tinta)] tabular-nums">{n0(f.antesBpd)} → {n0(f.ahoraBpd)}</b>
              <span>bbl/d{f.cambio !== null ? ` · ${f.cambio < 0 ? 'baja' : 'sube'} ${n0(Math.abs(f.cambio) * 100)} %` : ''}</span>
            </p>
          ))}
          {b.filas.length === 0 && <p className="text-[15px] text-[var(--tinta2)]">Nada no planeado ni antes ni con TRIM.</p>}
          <p className="text-[14px] text-[var(--tinta2)]">Lo no planeado por día. {b.nota}</p>
          <p className="mt-1.5 border-t border-[var(--linea2)] pt-2.5 text-[15px] text-[var(--tinta2)]" data-alto-impacto="">
            {b.altoImpacto.texto}
            <Info titulo="Lo de alto impacto, antes y con TRIM" texto={`Lo de las bombas de agua y las electrosumergibles por día: los tres meses antes de que entrara TRIM (${b.base}) contra desde el ${fechaCorta(b.desde)}. Es una comparación histórica, no el «Antes» del ciclo.`} />
          </p>
        </div>
      )}
      <div className="mt-3 border-t border-[var(--linea2)] pt-3" data-proactivo={p.porcentaje ?? ''}>
        <p className="flex flex-wrap items-baseline gap-x-2">
          <b className="text-[22px] font-bold text-[var(--tinta)] tabular-nums">{p.porcentaje !== null ? `${n0(p.porcentaje)} %` : 'sin dato'}</b>
          <span className="inline-flex items-center gap-1 text-[15px] text-[var(--tinta2)]">mantenimiento proactivo
            <Info titulo="Mantenimiento proactivo" texto="Horas preventivas o predictivas en SAP desde que entró TRIM, contra las correctivas. Si no sube, las fallas no bajan." />
          </span>
        </p>
        {p.porcentaje !== null && (
          <span aria-hidden className="mt-1.5 block h-2.5 rounded-full bg-[var(--pista)]"><i className="block h-full rounded-full bg-[var(--dato1)]" style={{ width: `${p.porcentaje}%` }} /></span>
        )}
        <p className="mt-1 text-[14px] text-[var(--tinta2)] tabular-nums">{p.texto}</p>
      </div>
    </Tarjeta>
  )
}

/** «Retorno posible del ciclo» (X4 §4.4, regla 2): la suma de lo que todavía se
 *  podía mover en cada momento, SIMULADA. Nunca es la cifra grande: va en su
 *  tarjeta, con su chip «simulado» y una línea por momento, sin los números
 *  1·2·3 (son de las prioridades). */
export function Ciclo({ v, onPlan }: { v: VistaResultados; onPlan: (e: Equipo) => void }) {
  const c = v.ciclo
  return (
    <Tarjeta titulo="Retorno posible del ciclo" extra={<Calidad>simulado</Calidad>} data-ciclo={c.totalBbl}>
      <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
        <b className="text-[22px] font-bold text-[var(--tinta)] tabular-nums">≈ {n0(c.totalBbl)}</b>
        <span className="text-[15px] text-[var(--tinta2)]">bbl · simulado, no entra al libro</span>
      </p>
      <div className="mt-2.5 flex flex-col">
        {c.momentos.map(m => (
          <div key={m.momento} data-fase={m.momento} className="border-t border-[var(--linea2)] py-2 first:border-t-0">
            <p className="flex items-baseline justify-between gap-2">
              <span className="text-[15px] font-semibold text-[var(--tinta)]">{m.nombre} <span className="font-normal text-[var(--tinta2)]">· {m.lema}</span></span>
              <b className="text-[16px] text-[var(--tinta)] tabular-nums">{n0(m.bbl)}</b>
            </p>
            <p className="text-[14px] leading-[1.45] text-[var(--tinta2)]" data-linea-simulada="">{m.texto}</p>
            {m.plan && m.bbl > 0.5 && (
              <button type="button" onClick={() => onPlan(m.plan!)} className="no-imprimir mt-0.5 cursor-pointer text-[14px] font-semibold text-[var(--tinta)] hover:underline">Ver el plan ›</button>
            )}
          </div>
        ))}
      </div>
    </Tarjeta>
  )
}

/** Mantenimiento (jefe y planeación): lo que dura una falla y cuánto es espera,
 *  lo programado contra lo no programado y lo de alto impacto del período. */
export function Mantenimiento({ v, onDetalle }: { v: VistaResultados; onDetalle?: () => void }) {
  const m = v.mantenimiento
  if (!m) return null
  const total = m.programadoBbl + m.noProgramadoBbl
  const pct = total > 0 ? (m.programadoBbl / total) * 100 : 0
  return (
    <Tarjeta titulo="Mantenimiento" extra={`${n0(m.fallas)} fallas cerradas · toda la historia`} data-mantenimiento="">
      <p className="mt-2 text-[16px] leading-[1.45] text-[var(--tinta)]">{m.frase}</p>
      {m.totalH !== null && m.esperaH !== null && (
        <div className="mt-2" role="img" aria-label={`Reparación activa ${n1((m.activaH ?? 0) / 24)} días y espera ${n1(m.esperaH / 24)} días de ${n1(m.totalH / 24)}`}>
          <span aria-hidden className="flex h-2.5 overflow-hidden rounded-full bg-[var(--pista)]">
            <i className="block h-full bg-[var(--dato1)]" style={{ width: `${((m.activaH ?? 0) / m.totalH) * 100}%` }} />
            <i className="block h-full" style={{ width: `${(m.esperaH / m.totalH) * 100}%`, background: 'repeating-linear-gradient(45deg, var(--dato3) 0 2px, transparent 2px 5px)' }} />
          </span>
          <p className="mt-1 flex flex-wrap gap-x-4 text-[14px] text-[var(--tinta2)]">
            <span className="inline-flex items-center gap-1.5"><i className="inline-block size-2.5 rounded-[3px] bg-[var(--dato1)]" />reparación activa {n1((m.activaH ?? 0) / 24)} d</span>
            <span>espera {n1(m.esperaH / 24)} d</span>
          </p>
        </div>
      )}
      <p className="mt-3 border-t border-[var(--linea2)] pt-2.5 text-[15px] text-[var(--tinta2)] tabular-nums">
        Del diferido de {v.periodo.replace(', en curso', '')}, <b className="text-[var(--tinta)]">{n1(pct)} %</b> programado: {n0(m.programadoBbl)} bbl programados · {n0(m.noProgramadoBbl)} bbl no programados. De alto impacto, {n0(m.altoImpactoBbl)} bbl.
      </p>
      <AlDetalle onClick={onDetalle}>Ver lo que hay que atacar</AlDetalle>
    </Tarjeta>
  )
}

/** Confiabilidad: ¿le creo al vigía? Lo que acertó de lo que se puede juzgar,
 *  cuánto antes avisó y cuántas de las fallas que podía ver anunció. */
export function Confiabilidad({ v, onDetalle }: { v: VistaResultados; onDetalle?: () => void }) {
  const c = v.confiabilidad
  if (!c) return null
  return (
    <Tarjeta titulo="¿Le creo al vigía?" extra="desde que entró TRIM" data-confiabilidad={c.tasa ?? ''}>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
        <b className="text-[22px] font-bold text-[var(--tinta)] tabular-nums">{c.tasa !== null ? `${n0(c.tasa)} %` : 'sin dato'}</b>
        <span className="text-[15px] text-[var(--tinta2)]">de lo que se puede juzgar fue verdad</span>
      </p>
      <p className="mt-1 text-[15px] leading-[1.45] text-[var(--tinta2)]">{c.frase}</p>
      <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-[var(--linea2)] pt-2.5 text-[14px] text-[var(--tinta2)] tabular-nums sm:grid-cols-4">
        {([['aciertos', c.aciertos], ['falsas alarmas', c.falsas], ['intervenidas antes', c.intervenidas], ['en seguimiento', c.seguimiento]] as const).map(([k, n]) => (
          <div key={k}><dt>{k}</dt><dd className={cn('text-[18px] font-bold text-[var(--tinta)]')}>{n0(n)}</dd></div>
        ))}
      </dl>
      <AlDetalle onClick={onDetalle}>Ver la confiabilidad</AlDetalle>
    </Tarjeta>
  )
}

/** ¿Se puede publicar? Junta el cuadre y la custodia (X4 §3.7): producción y regulatorio. */
export function Publicar({ v, onDetalle, textoDetalle }: { v: VistaResultados; onDetalle?: () => void; textoDetalle: string }) {
  const p = v.publicar
  return (
    <Tarjeta titulo="¿Se puede publicar?" extra={v.periodo} data-publicar={p.estado}>
      <p className="mt-2 flex items-center gap-2 text-[16px] font-semibold text-[var(--tinta)]">
        {p.estado === 'bloqueado' && <MarcaPrioridad s={3} tamano={15} decorativa />}
        {p.estado === 'publicable' ? 'Sí: cuadra y tiene su cadena de custodia.' : p.estado === 'provisional' ? 'Todavía no: el mes está en curso.' : 'Todavía no.'}
      </p>
      {p.motivos.length > 0
        ? <ul className="mt-1.5 grid gap-1 text-[14px] leading-[1.45] text-[var(--tinta2)]">{p.motivos.map(m => <li key={m}>{m}</li>)}</ul>
        : <p className="mt-1 text-[14px] leading-[1.45] text-[var(--tinta2)]">{p.texto}</p>}
      <AlDetalle onClick={onDetalle}>{textoDetalle}</AlDetalle>
    </Tarjeta>
  )
}
