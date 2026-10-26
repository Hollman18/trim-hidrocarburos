import type { VistaPlantaViva } from '@/shared/api/plantaViva'
import { MarcaPrioridad } from '@/shared/ui/Prioridad'
import { usd } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Chevron } from './piezas'
import { n0 } from './cifras'
import { useAcciones } from './acciones'

/** Las filas de A en estilo B, debajo de la tarjeta principal (X5 §5.2, §5.4):
 *  «Este mes» (el diferido del libro, su valor y su rango: calculado, no medido)
 *  y la producción por día contra la meta firmada, con su barra (la de Few:
 *  pista, barra y la raya de la meta). Cada fila abre su pantalla de Resultados. */
export function Filas({ v }: { v: VistaPlantaViva }) {
  const { ir } = useAcciones()
  const m = v.esteMes, p = v.produccion
  const dinero = m.valorUsd !== null ? usd(m.valorUsd) : null
  // La escala de la barra: la meta queda en el 80 % (la raya), como en la imagen aprobada.
  const escala = Math.max(1, (p.metaBpd ?? p.realBpd) * 1.25, p.realBpd)
  return (
    <section aria-label="Lo del período" className="min-w-0 rounded-[20px] bg-[var(--panel)] px-4 py-1 sm:px-7 sm:py-1.5">
      <Fila onClick={ir('diferidos')} datos={{ 'data-este-mes': m.bbl }}
        izquierda={<>
          <p className="flex items-center gap-[7px] text-[15px] font-medium text-[var(--tinta2)]">{m.titulo}</p>
          <p className="mt-px flex flex-wrap items-baseline gap-x-2">
            <b className="text-[24px] font-bold tracking-[-.01em] text-[var(--tinta)]">{n0(m.bbl)}</b>
            <span className="text-[15px] text-[var(--tinta2)]">barriles diferidos{dinero ? ` · ${dinero.valor} ${dinero.unidad}` : ' · sin precio'}</span>
          </p>
        </>}
        derecha={<p className="text-[14px] leading-[1.45] text-[var(--tinta2)]">
          calculado, entre {n0(m.rango[0])} y {n0(m.rango[1])}{m.nota && <><br />{m.nota}</>}
        </p>} />
      <Fila onClick={ir('produccion')} datos={{ 'data-produccion': p.realBpd }}
        izquierda={<>
          <p className="flex items-center gap-[7px] text-[15px] font-medium text-[var(--tinta2)]">
            {p.bajoMeta && <MarcaPrioridad s={3} tamano={15} decorativa />}
            {p.bajoMeta ? `Aviso · ${p.texto}` : p.texto[0]!.toUpperCase() + p.texto.slice(1)}
          </p>
          <p className="mt-px flex flex-wrap items-baseline gap-x-2">
            <b className="text-[24px] font-bold tracking-[-.01em] text-[var(--tinta)]">{n0(p.realBpd)}</b>
            <span className="text-[15px] text-[var(--tinta2)]">{p.metaBpd !== null ? `de ${n0(p.metaBpd)} bbl/d` : 'bbl/d · sin meta firmada'}</span>
          </p>
        </>}
        derecha={p.metaBpd !== null
          ? <div className="relative h-2.5 rounded-full bg-[var(--pista)]" role="img"
            aria-label={`${n0(p.realBpd)} de ${n0(p.metaBpd)} bbl/d: ${p.bajoMeta ? 'bajo' : 'sobre'} la meta`}>
            <i className="absolute inset-y-0 left-0 rounded-full bg-[var(--dato1)]" style={{ width: `${Math.min(100, (p.realBpd / escala) * 100)}%` }} />
            <b className="absolute -bottom-[5px] -top-[5px] w-[3px] rounded-sm bg-[var(--tinta)]" style={{ left: `${(p.metaBpd / escala) * 100}%` }} />
          </div>
          : <p className="text-[14px] text-[var(--tinta2)]">sin meta firmada</p>} />
    </section>
  )
}

function Fila({ izquierda, derecha, onClick, datos }: {
  izquierda: React.ReactNode; derecha: React.ReactNode; onClick?: () => void; datos?: Record<string, number>
}) {
  const clase = cn('grid w-full grid-cols-[1fr_20px] items-center gap-x-5 gap-y-2 border-t border-[var(--linea2)] py-[13px] text-left first:border-t-0 md:grid-cols-[1fr_260px_20px]',
    onClick && 'cursor-pointer rounded-sm transition-colors duration-[120ms] hover:bg-[var(--panel2)]')
  const contenido = (
    <>
      <div className="min-w-0">{izquierda}</div>
      <div className="col-span-2 row-start-2 min-w-0 md:col-span-1 md:row-start-auto">{derecha}</div>
      <span className="col-start-2 row-start-1 flex md:col-start-auto md:row-start-auto">{onClick && <Chevron />}</span>
    </>
  )
  return onClick
    ? <button type="button" onClick={onClick} className={clase} {...datos}>{contenido}</button>
    : <div className={clase} {...datos}>{contenido}</div>
}
