import { useState } from 'react'
import { useJornada, type VistaJornada, type ParadaDeJornada, type CualJornada } from '@/shared/api/balance'
import { SIN_REGISTRO } from '@/shared/api/perdidas'
import { Info } from '@/shared/ui/Info'
import { Enlace } from '@/shared/ui/primitivas'
import { n0 } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { cadenaCorta } from './vista'

/** Una parada de la jornada (§0c): el pozo y su equipo, cuándo empezó y terminó (o «sigue»), su
 *  cadena del choke, los barriles diferidos en la jornada y si falta confirmarla. */
export function FilaParada({ p }: { p: ParadaDeJornada }) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-t border-[var(--linea2)] py-2 first:border-t-0" data-parada-jornada={p.eventoId}>
      <span className="min-w-0">
        <b className="font-cond text-[16px] font-bold tracking-[.02em]">{p.pozo}</b>
        {p.equipo !== p.pozo && <span className="text-[15px] text-[var(--tinta2)]"> · por {p.equipo}</span>}
        <span className="block text-[15px] text-[var(--tinta)]" data-cuando>{p.cuando}</span>
        <span className="block text-[14px] leading-snug text-[var(--tinta2)]" data-cadena>{cadenaCorta(p)}</span>
      </span>
      <span className="tabular text-right">
        <b className="block text-[17px] font-bold leading-tight">{n0(p.bblEntero)} <span className="text-[13px] font-normal text-[var(--tinta2)]">bbl</span></b>
        <small className="block text-[13px] text-[var(--tinta2)]">{p.porConfirmar ? 'por confirmar' : 'confirmada'}</small>
      </span>
    </li>
  )
}

/** «Mi turno» (necesario-por-rol §0c; A2 · `GET /api/vistas/jornada`): las paradas que empezaron,
 *  siguen o terminaron en la jornada del supervisor, con su hora de inicio y fin y su cadena; arriba,
 *  lo que falta confirmar, lo diferido en la jornada y lo perdido, lado a lado y nunca sumados. Se
 *  puede mirar la jornada anterior (la que recibió). Todo lo calcula el motor: aquí se pinta. */
export function MiTurno({ campoId, onUnaPorUna }: { campoId: string; onUnaPorUna?: () => void }) {
  const [cual, setCual] = useState<CualJornada>('actual')
  const v = useJornada({ campo: campoId, jornada: cual })
  return (
    <section aria-label="Mi turno" data-mi-turno={cual} className="grid gap-2.5 rounded-[10px] bg-[var(--panel)] px-5 py-4 sm:px-7">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-[17px] font-semibold">{cual === 'actual' ? 'Mi turno' : 'El turno que recibió'} <span className="font-normal text-[var(--tinta2)]">· {v.jornada.nombre.charAt(0).toLowerCase()}{v.jornada.nombre.slice(1)}</span></h2>
        <button type="button" onClick={() => setCual(c => (c === 'actual' ? 'anterior' : 'actual'))} data-otra-jornada
          className="toque min-h-10 cursor-pointer text-[15px] font-semibold text-[var(--tinta)] hover:underline">{cual === 'actual' ? 'Ver la jornada anterior' : 'Volver a mi turno'}</button>
      </header>
      <Balance v={v} />
      {v.paradas.length
        ? <ul className="grid" data-paradas-jornada>{v.paradas.map(p => <FilaParada key={p.eventoId} p={p} />)}</ul>
        : <p className="text-[15px] text-[var(--tinta2)]">Nada paró en esta jornada.</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {v.nota ? <small className="text-[13px] text-[var(--tinta2)]" data-nota-jornada>{v.nota}</small> : <span />}
        {onUnaPorUna && v.paradas.length > 0 && <Enlace onClick={onUnaPorUna}>Ver una por una</Enlace>}
      </div>
    </section>
  )
}

/** Por confirmar · diferido · perdido de la jornada: lado a lado, nunca sumados (el dueño, 27-oct). */
export function Balance({ v, className }: { v: VistaJornada; className?: string }) {
  const caja = 'min-w-0 rounded-[8px] bg-[var(--panel2)] px-3 py-2'
  return (
    <div className={cn('grid grid-cols-1 gap-2 min-[360px]:grid-cols-3', className)} data-balance-jornada>
      <p className={caja}><small className="block text-[13px] text-[var(--tinta2)]">Por confirmar</small><b className="tabular text-[20px] font-bold" data-jornada-por-confirmar>{v.porConfirmar}</b></p>
      <p className={caja}><small className="block text-[13px] text-[var(--tinta2)]">Diferido</small><b className="tabular text-[20px] font-bold" data-jornada-diferido>{n0(v.diferido.entero)}</b> <span className="text-[13px] text-[var(--tinta2)]">bbl</span></p>
      <p className={caja}>
        <small className="flex items-center gap-1 text-[13px] text-[var(--tinta2)]">Perdido<Info titulo="Perdido" texto="Lo que salió y no se vendió (pitera, derrame, tea, venteo, rechazo). Va aparte de lo diferido y nunca se suma. Sin registros, dice «sin registro»: nunca un 0." /></small>
        {v.perdido
          ? <><b className="tabular text-[20px] font-bold" data-jornada-perdido>{n0(v.perdido.entero)}</b> <span className="text-[13px] text-[var(--tinta2)]">bbl</span></>
          : <b className="text-[15px] font-semibold text-[var(--tinta2)]" data-jornada-perdido="">{SIN_REGISTRO}</b>}
      </p>
    </div>
  )
}
