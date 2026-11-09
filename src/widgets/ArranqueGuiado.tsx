import { useState } from 'react'
import { useRol } from '@/app/store'
import { useArranques, marcarFase, rolesQueSeAvisan, duracion, fraseMargen, NOMBRE_FASE, type ArranqueVista } from '@/shared/api/eventoPlanta'
import { usePiezas } from '@/shared/api/piezas'
import { campoPorId } from '@/entities/campos'
import { Boton } from '@/shared/ui/primitivas'
import { Info } from '@/shared/ui/Info'
import { formatoFecha } from '@/shared/lib/fecha'
import { cn } from '@/shared/lib/cn'

/** EL RE-ARRANQUE GUIADO (Fase 6 de facilidades), debajo del aviso del apagón.
 *
 *  Para el supervisor (y el de energía, que lo lee): el orden de arranque por barriles, cada paso con los
 *  límites que respeta y su fuente, y el cronómetro por fases. La única acción es marcar la fase que sigue
 *  (`causa:declarar`); TRIM sugiere y registra, quien arranca es el operador. El margen N-1 va al pie: en el
 *  demo dice qué falta (la tabla de generación). */
export function ArranqueGuiado({ campos, className }: { campos: string[]; className?: string }) {
  const rol = useRol()
  const piezas = usePiezas(campos)
  const arranques = useArranques(campos)
  if (!piezas.has('energia') || !arranques.length) return null
  if (!rolesQueSeAvisan().includes(rol.id) || rol.id === 'oper' || rol.id === 'ger') return null
  return <div className={cn('grid gap-3', className)}>{arranques.map(a => <Arranque key={a.eventoId} a={a} />)}</div>
}

const FMT = formatoFecha({ timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hour12: false })
const hora = (ms: number) => FMT.format(new Date(ms))
const n0 = (v: number) => Math.round(v).toLocaleString('es-CO')
const VISIBLES = 5

function Arranque({ a }: { a: ArranqueVista }) {
  const rol = useRol()
  const [todos, setTodos] = useState(false)
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const { plan, cronometro: c } = a
  const puede = !!rol.puede['causa:declarar']
  const marcar = async () => {
    if (!c.siguiente) return
    setOcupado(true); setError('')
    const r = await marcarFase(rol.id, a.eventoId, c.siguiente)
    setOcupado(false)
    if (!r.ok) setError(r.error)
  }
  const cuando = (min: number) => (c.energia !== undefined ? hora(plan.t0 + min * 60_000) : `+${min} min`)
  const pasos = todos ? plan.pasos : plan.pasos.slice(0, VISIBLES)
  const limites = [...new Map(plan.pasos.flatMap(x => x.limites).map(l => [l.id, l])).values()]
  return (
    <section data-arranque={a.campoId} aria-label={`Re-arranque de ${campoPorId(a.campoId).nombre}`}
      className="grid gap-3 rounded-[10px] bg-[var(--panel)] px-4 py-3.5 shadow-[inset_0_0_0_1px_var(--linea)] sm:px-5">
      <header className="grid gap-0.5">
        <h2 className="text-[18px] font-semibold leading-snug">Re-arranque · {campoPorId(a.campoId).nombre}</h2>
        <p className="text-[14px] text-[var(--tinta2)]">
          {plan.bblDia >= 0.5 ? `${n0(plan.bblDia)} bbl/d por recuperar en ${plan.pasos.length} pasos.` : `${plan.pasos.length} ${plan.pasos.length === 1 ? 'paso' : 'pasos'}; no hay pozos que arrancar.`}
        </p>
      </header>

      <div className="grid gap-2" data-cronometro>
        <ol className="grid gap-1 text-[15px] tabular-nums">
          {c.tramos.map(t => (
            <li key={t.fase} className="flex items-baseline justify-between gap-3" data-fase={t.fase}>
              <span className="min-w-0">{t.nombre}</span>
              <span className="shrink-0 text-[var(--tinta2)]">{hora(t.hora)}{t.ms !== undefined && <> · <b className="font-semibold text-[var(--tinta)]" data-duracion>{duracion(t.ms)}</b></>}</span>
            </li>
          ))}
        </ol>
        {c.siguiente ? (puede && (
          <Boton variante="principal" className="min-h-12 w-full text-[17px]" disabled={ocupado} onClick={() => void marcar()} data-marcar-fase={c.siguiente}>
            Marcar: {NOMBRE_FASE[c.siguiente]}
          </Boton>
        )) : <p className="text-[15px]" role="status" data-arranque-terminado>Arranque terminado en {duracion(c.totalMs)}.</p>}
        {error && <p role="alert" className="text-[14px]">{error}</p>}
      </div>

      <div className="grid gap-1.5">
        <h3 className="flex flex-wrap items-center gap-x-1 text-[15px] font-semibold">
          Orden de arranque
          <span className="font-normal text-[var(--tinta2)]">{c.energia !== undefined ? `· desde las ${hora(c.energia)}` : '· minutos desde que vuelva la energía'}</span>
          <Info titulo="Los límites que respeta" texto={`${plan.criterio}. ${limites.map(l => `${l.regla} (${l.fuente}).`).join(' ')}`} />
        </h3>
        <ol className="grid gap-1.5" data-orden-arranque>
          {pasos.map(x => (
            <li key={x.n} className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-x-2 text-[15px] leading-snug" data-paso={x.fase}>
              <span className="tabular-nums text-[var(--tinta2)]">{cuando(x.minuto)}</span>
              <span className="min-w-0 break-words">
                {x.que}
                {x.bblDia > 0 && <span className="text-[var(--tinta2)]"> · {n0(x.acumBblDia)} bbl/d{x.n === plan.noventa ? ' (90 %)' : ''}</span>}
              </span>
            </li>
          ))}
        </ol>
        {plan.pasos.length > VISIBLES && (
          <button type="button" className="cursor-pointer justify-self-start text-[14px] underline" onClick={() => setTodos(x => !x)} aria-expanded={todos} data-ver-pasos>
            {todos ? 'Ver menos' : `Ver los ${plan.pasos.length} pasos`}
          </button>
        )}
        {(plan.sinKw.length > 0 || plan.sinCaber.length > 0) && (
          <p className="text-[14px] text-[var(--tinta2)]">
            {plan.sinKw.length > 0 && `Sin sus kW, fuera del orden: ${plan.sinKw.join(', ')}. `}
            {plan.sinCaber.length > 0 && `No caben en la generación: ${plan.sinCaber.join(', ')}.`}
          </p>
        )}
      </div>

      <p className="text-[14px] text-[var(--tinta2)]" data-margen>
        <b className="font-semibold text-[var(--tinta)]">Margen N-1.</b>{' '}
        {a.margen ? fraseMargen(a.margen) : a.falta}
      </p>
    </section>
  )
}
