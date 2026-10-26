import type { ReactNode } from 'react'
import { MOMENTOS, NOMBRE_MOMENTO, type Momento, type VistaPlantaViva } from '@/shared/api/plantaViva'
import { MarcaPrioridad } from '@/shared/ui/Prioridad'
import { cn } from '@/shared/lib/cn'
import { Calidad, MarcaSvg } from './piezas'
import { n0 } from './cifras'
import { useAcciones } from './acciones'

/* La columna de la derecha (352 px en el escritorio): los gráficos de A
   redibujados en el estilo de B (X5 §5.4). Lo simulado, aparte y con su
   palabra; lo calculado, con su período. */

const Mini = ({ titulo, extra, children, className, ...p }: { titulo: string; extra?: ReactNode; children: ReactNode; className?: string } & Record<`data-${string}`, unknown>) => (
  <section {...p} aria-label={titulo} className={cn('min-w-0 rounded-[20px] bg-[var(--panel)] px-[22px] py-4', className)}>
    <header className="flex items-center justify-between gap-2">
      <h3 className="text-[15px] font-semibold text-[var(--tinta)]">{titulo}</h3>
      {extra}
    </header>
    {children}
  </section>
)

/** «Lo que todavía se puede mover» (simulado), por momento: el escogido en índigo.
 *  Nunca es la cifra grande de la pantalla (X4 §3.1, regla 7). */
export function Mover({ v, momento }: { v: VistaPlantaViva; momento: Momento }) {
  const { abrir } = useAcciones()
  const plan = v.cifras[momento].simulado.plan
  return (
    <Mini titulo="Lo que todavía se puede mover" extra={<Calidad>simulado</Calidad>} data-mover={v.mover.totalBbl}>
      <p className="mt-1.5 flex items-baseline gap-2">
        <b className="text-[26px] font-bold tracking-[-.01em] text-[var(--tinta)]">{n0(v.mover.totalBbl)}</b>
        <span className="text-[14px] text-[var(--tinta2)]">bbl en el ciclo</span>
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {MOMENTOS.map(m => (
          <div key={m} data-fase={m} className={cn('border-t-[3px] pt-[7px] text-[14px] text-[var(--tinta2)]', m === momento ? 'border-[var(--primario)]' : 'border-[var(--pista)]')}>
            {NOMBRE_MOMENTO[m]}
            <b className="block text-[18px] font-bold text-[var(--tinta)]">{n0(v.mover.porMomento[m])}</b>
          </div>
        ))}
      </div>
      <p className="sr-only" data-linea-simulada="">{v.cifras[momento].simulado.texto}</p>
      {plan && (
        <button type="button" onClick={() => abrir(plan)} className="mt-2 inline-flex cursor-pointer items-center gap-0.5 whitespace-nowrap text-[15px] font-semibold text-[var(--tinta)] hover:underline">
          Ver el plan <span aria-hidden>›</span>
        </button>
      )}
    </Mini>
  )
}

/** «Diferido por equipo» del período: la marca y su palabra, el tag, la familia,
 *  los barriles, el porcentaje y una barra de 5 px. Cada fila abre la ficha. */
export function PorEquipo({ v }: { v: VistaPlantaViva }) {
  const { abrir } = useAcciones()
  const varios = v.campos.length > 1
  return (
    <Mini titulo="Diferido por equipo" extra={<span className="text-[14px] text-[var(--tinta2)]">{v.periodo.replace(', en curso', '')} · calculado</span>}>
      {v.porEquipo.length === 0 && <p className="mt-2 text-[15px] text-[var(--tinta2)]">Nada se trabó en {v.periodo}.</p>}
      <div className="mt-1.5">
        {v.porEquipo.map(e => (
          <button key={`${e.campoId}/${e.equipo}`} type="button" onClick={() => abrir(e)} data-equipo-diferido={e.equipo} data-bbl={e.bbl}
            className="grid w-full cursor-pointer grid-cols-[18px_1fr_auto] items-center gap-x-2 gap-y-0.5 border-t border-[var(--linea2)] py-1.5 text-left first:border-t-0 hover:bg-[var(--panel2)]">
            <span className="flex">{e.prioridad ? <MarcaPrioridad s={e.prioridad} tamano={15} /> : null}</span>
            <span className="min-w-0">
              <span className="font-cond text-[15px] font-bold tracking-[.02em] text-[var(--tinta)]">{e.equipo}</span>{' '}
              <span className="text-[13px] text-[var(--tinta2)]">{e.familia}{e.palabra ? ` · ${e.palabra}` : ''}{varios ? ` · ${nombreCampo(v, e.campoId)}` : ''}</span>
            </span>
            <span className="text-right text-[15px] font-bold text-[var(--tinta)]">{n0(e.bbl)}<small className="block text-[13px] font-normal text-[var(--tinta2)]">{n0(e.pct)} %</small></span>
            <span className="relative col-span-2 col-start-2 h-[5px] rounded-full bg-[var(--pista)]"><i className="absolute inset-y-0 left-0 rounded-full bg-[var(--dato1)]" style={{ width: `${Math.min(100, e.pct)}%` }} /></span>
          </button>
        ))}
      </div>
    </Mini>
  )
}
const nombreCampo = (v: VistaPlantaViva, id: string) => v.filas.find(f => f.campoId === id)?.nombre ?? id

/** «Diferido por día, mes a mes» (13 barras apiladas: alto impacto oscuro, lo
 *  demás medio) contra la raya del máximo firmado, con el «3» sobre el mes que
 *  lo pasó y el mes en curso con contorno discontinuo; y debajo, «¿Está
 *  bajando? Desde que entró TRIM», con las dos flechas. */
export function MesAMesYBajando({ v, className }: { v: VistaPlantaViva; className?: string }) {
  const { meses, actualBpd, nombreActual } = v.mesAMes
  const maximo = meses.reduce((a, m) => Math.max(a, m.maximoBpd ?? 0), 0)
  // El margen de la izquierda alcanza para el rótulo más ancho del eje («2.300»).
  const W = 308, H = 98, G = { x0: Math.max(28, 10 + 7.2 * n0(maximo).length), x1: W, y0: 14, y1: H - 20 }
  const tope = Math.max(1, ...meses.map(m => m.totalBpd), maximo) * 1.08
  const Y = (x: number) => G.y1 - (x / tope) * (G.y1 - G.y0)
  const paso = (G.x1 - G.x0) / Math.max(1, meses.length), an = Math.min(14, paso * 0.62)
  const lineas = maximo > 0 ? [maximo / 2, maximo] : []
  const sobre = meses.filter(m => m.sobre)
  const aria = `Diferido por día de ${meses[0]?.nombre ?? ''} a ${meses.at(-1)?.nombre ?? ''}${maximo ? ` contra el máximo firmado de ${n0(maximo)} bbl/d` : ''}. `
    + (sobre.length ? `Lo pasaron ${sobre.map(m => `${m.nombre} (${n0(m.totalBpd)})`).join(', ')}.` : 'Ningún mes cerrado lo pasó.')
    + (actualBpd !== null ? ` ${nombreActual[0]?.toUpperCase()}${nombreActual.slice(1)} va en ${n0(actualBpd)}.` : '')
  const b = v.bajando
  return (
    <Mini titulo="Diferido por día, mes a mes" className={className} data-mes-a-mes=""
      extra={actualBpd !== null && <span className="text-[14px] text-[var(--tinta2)]">{nombreActual}: <b className="text-[var(--tinta)]">{n0(actualBpd)}</b> bbl/d</span>}>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 block h-auto w-full max-w-[420px]" role="img" aria-label={aria}>
        {[0, ...lineas].map(l => (
          <g key={l}>
            <line x1={G.x0} x2={G.x1} y1={Y(l)} y2={Y(l)} stroke="var(--linea2)" strokeWidth={1} />
            {l > 0 && <text x={G.x0 - 6} y={Y(l) + 4} textAnchor="end" fontSize={12} fill="var(--tinta3)">{n0(l)}</text>}
          </g>
        ))}
        {meses.map((m, i) => {
          const x = G.x0 + paso * i + (paso - an) / 2, ult = i === meses.length - 1
          const yT = Y(m.totalBpd)
          return (
            <g key={m.mes} data-mes={m.mes} data-total={m.totalBpd}>
              <path d={`M${x} ${G.y1} L${x} ${yT + 3} Q${x} ${yT} ${x + 3} ${yT} L${x + an - 3} ${yT} Q${x + an} ${yT} ${x + an} ${yT + 3} L${x + an} ${G.y1} Z`} fill="var(--dato3)" />
              <rect x={x} y={Y(m.altoBpd)} width={an} height={Math.max(0, G.y1 - Y(m.altoBpd))} fill="var(--dato1)" />
              {m.maximoBpd !== null && <line x1={x - 3} x2={x + an + 3} y1={Y(m.maximoBpd)} y2={Y(m.maximoBpd)} stroke="var(--tinta)" strokeWidth={1.6} strokeDasharray="4 2.5" />}
              {m.sobre && <MarcaSvg x={x + an / 2 - 6} y={Math.min(yT, Y(m.maximoBpd ?? 0)) - 15} s={3} t={12} />}
              {m.enCurso && <rect x={x - 2.5} y={yT - 2.5} width={an + 5} height={G.y1 - yT + 2.5} rx={4} fill="none" stroke="var(--tinta)" strokeWidth={1.3} strokeDasharray="3 2" />}
              {(i % 3 === 0 || ult) && (
                <text x={x + an / 2} y={G.y1 + 15} textAnchor="middle" className="font-cond" fontWeight={ult ? 700 : 500} fontSize={12}
                  fill={ult ? 'var(--tinta)' : 'var(--tinta2)'}>{m.rotulo}</text>
              )}
              <title>{`${m.nombre}: ${n0(m.totalBpd)} bbl/d, de alto impacto ${n0(m.altoBpd)}${m.maximoBpd !== null ? ` · máximo ${n0(m.maximoBpd)}` : ''}`}</title>
            </g>
          )
        })}
      </svg>
      <div className="mt-1.5 flex flex-wrap gap-3 text-[13px] text-[var(--tinta2)]">
        <span className="inline-flex items-center gap-[5px]"><i className="inline-block size-2.5 rounded-[3px] bg-[var(--dato1)]" />alto impacto</span>
        <span className="inline-flex items-center gap-[5px]"><i className="inline-block size-2.5 rounded-[3px] bg-[var(--dato3)]" />lo demás</span>
        {maximo > 0 && <span className="inline-flex items-center gap-[5px]"><svg width="16" height="6" aria-hidden><line x1="0" x2="16" y1="3" y2="3" stroke="var(--tinta)" strokeWidth="1.6" strokeDasharray="4 2.5" /></svg>máximo {n0(v.mesAMes.maximoBpd ?? maximo)}</span>}
      </div>
      <div className="mt-3.5 flex flex-col gap-1 border-t border-[var(--linea2)] pt-3" data-bajando="">
        <p className="mb-0.5 text-[15px] font-semibold text-[var(--tinta)]">¿Está bajando? Desde que entró TRIM</p>
        {!b && <p className="text-[14px] text-[var(--tinta2)]">Sin tres meses de historia antes de TRIM: no hay con qué comparar.</p>}
        {b?.filas.map(f => (
          <p key={f.tramo} data-flecha={f.tramo} className="grid grid-cols-[96px_auto_1fr] items-baseline gap-2 text-[14px] text-[var(--tinta2)]">
            <span>{f.nombre}</span>
            <b className="text-[17px] font-bold text-[var(--tinta)]">{n0(f.antesBpd)} → {n0(f.ahoraBpd)}</b>
            <span>bbl/d{f.cambio !== null ? ` · ${f.cambio < 0 ? 'baja' : 'sube'} ${n0(Math.abs(f.cambio) * 100)} %` : ''}</span>
          </p>
        ))}
        {b && b.filas.length === 0 && <p className="text-[14px] text-[var(--tinta2)]">Nada no planeado ni antes ni con TRIM.</p>}
        {b && <p className="text-[14px] text-[var(--tinta2)]">{b.nota}</p>}
      </div>
    </Mini>
  )
}
