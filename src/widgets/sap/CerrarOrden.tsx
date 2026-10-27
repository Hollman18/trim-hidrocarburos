import { useId, useState, type ReactNode } from 'react'
import { usePersona, useRol } from '@/app/store'
import { useSap, useEquiposSap } from '@/shared/api/sap'
import { ACTIVIDADES, NOMBRE_ACTIVIDAD, type ActividadMant } from '@/shared/api/acciones'
import { cerrarOrden } from '@/shared/api/escrituras'
import { NOMBRE_PARTE, type ParteId } from '@/entities/partes'
import { AHORA, fechaHora } from '@/entities/reloj'
import { puedeHacer } from '@/entities/tipos'
import { HojaInferior } from '@/shared/ui/HojaInferior'
import { Boton } from '@/shared/ui/primitivas'
import { n1 } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'

/** La hora de Colombia para un `datetime-local`, y de vuelta con su zona. */
const local = (d: Date) => new Date(d.getTime() - 5 * 3_600_000).toISOString().slice(0, 16)
const conZona = (v: string) => `${v}:00-05:00`
const OPCION = 'min-h-12 cursor-pointer rounded-[8px] px-3.5 text-[16px] font-semibold shadow-[inset_0_0_0_1.5px_var(--linea)] hover:bg-[var(--panel2)]'
const ESCOGIDA = 'bg-[var(--acento-suave)] shadow-[inset_0_0_0_2px_var(--acento)]'
const CAJA = 'min-h-12 w-full min-w-0 rounded-[8px] bg-[var(--panel)] px-3 text-[16px] shadow-[inset_0_0_0_1.5px_var(--linea)] outline-none focus:shadow-[inset_0_0_0_2px_var(--foco)]'

/** Las órdenes que el técnico puede cerrar: a su nombre (o sin técnico), de su campo, liberadas. */
function useOrdenesDelTecnico(campos: string[]) {
  const { ordenes } = useSap(campos)
  const yo = usePersona().id
  return ordenes.filter(o => (o.tecnico === yo || !o.tecnico) && (o.estado === 'REL' || o.estado === 'PCNF') && !o.cierre)
}

/** «Su orden» del técnico (necesario-por-rol §8; A3 · `POST /api/sap/ordenes/:numero/cierre`):
 *  el número, el equipo y lo que hay que hacer, y «Cerrar la orden» en el teléfono, sin papel:
 *  qué hizo (un botón), qué parte (si el equipo tiene catálogo de daños) y las horas del
 *  trabajo. Quién y a qué hora lo pone el servidor; la orden queda ejecutada (CNF) y sus horas
 *  entran al tramo «reparación» del tiempo fuera. */
export function SuOrden({ campos, onVerEquipo, queHacer = {} }: { campos: string[]; onVerEquipo: (campoId: string, equipo: string) => void
  /** Lo que hay que hacer, en una línea, como lo dice el motor en Hoy (la tarjeta de la orden), por número. */
  queHacer?: Readonly<Record<string, ReactNode>> }) {
  const rol = useRol()
  const ordenes = useOrdenesDelTecnico(campos)
  const { ordenes: todas } = useSap(campos)
  const [abierta, setAbierta] = useState<string | null>(null)
  const yo = usePersona().id
  const cerradas = todas.filter(o => o.cierre && o.cierre.porId === yo)
  if (!puedeHacer(rol.puede, 'orden:cerrar') || (!ordenes.length && !cerradas.length)) return null
  return (
    <section aria-label="Su orden" data-su-orden className="grid gap-2.5 rounded-[10px] bg-[var(--panel)] px-5 py-4 sm:px-7">
      {ordenes.map(o => (
        <div key={o.numero} className="grid gap-2" data-orden={o.numero}>
          <h2 className="text-[17px] font-semibold">Orden {o.numero} · <span className="font-cond font-bold tracking-[.02em]">{o.equipo}</span></h2>
          <p className="text-[15px] leading-snug text-[var(--tinta2)]" data-que-hacer>{queHacer[o.numero] ?? o.descripcion}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Boton variante="principal" onClick={() => setAbierta(o.numero)} aria-expanded={abierta === o.numero} className="min-h-12 px-6 text-[16px]">Cerrar la orden</Boton>
            <button type="button" onClick={() => onVerEquipo(o.campoId, o.equipo)} className="toque text-[15px] font-semibold hover:underline">Ver {o.equipo}</button>
          </div>
          {abierta === o.numero && <Cierre numero={o.numero} equipo={o.equipo} campoId={o.campoId} liberada={o.liberada} onCerrar={() => setAbierta(null)} />}
        </div>
      ))}
      {cerradas.map(o => (
        <p key={o.numero} className="text-[15px] text-[var(--tinta2)]" data-orden-cerrada={o.numero}>
          <b className="font-semibold text-[var(--tinta)]">Orden {o.numero} cerrada</b> · {o.equipo} · {NOMBRE_ACTIVIDAD[o.cierre!.actividad].toLowerCase()}{o.cierre!.parte ? ` ${NOMBRE_PARTE[o.cierre!.parte].toLowerCase()}` : ''} · {n1(o.cierre!.horas)} h · queda ejecutada en SAP (CNF)
        </p>
      ))}
    </section>
  )
}

function Cierre({ numero, equipo, campoId, liberada, onCerrar }: { numero: string; equipo: string; campoId: string; liberada?: string; onCerrar: () => void }) {
  const rol = useRol()
  const id = useId()
  const catalogo = useEquiposSap(campoId).find(e => e.equipo === equipo)?.catalogo
  const [actividad, setActividad] = useState<ActividadMant | null>(null)
  const [parte, setParte] = useState<ParteId | null>(null)
  const [inicio, setInicio] = useState(local(liberada ? new Date(Math.max(Date.parse(liberada), AHORA.getTime() - 2 * 3_600_000)) : new Date(AHORA.getTime() - 2 * 3_600_000)))
  const [fin, setFin] = useState(local(AHORA))
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const enviar = async () => {
    if (!actividad) return setError('Diga qué hizo.')
    if (catalogo && !parte) return setError(`Diga qué parte de ${equipo} se reparó.`)
    setOcupado(true); setError('')
    const r = await cerrarOrden({ rolId: rol.id }, numero, { actividad, ...(parte ? { parte } : {}), inicio: conZona(inicio), fin: conZona(fin) })
    setOcupado(false)
    if (!r.ok) return setError(r.error)
    onCerrar()
  }
  return (
    <HojaInferior titulo={`Cerrar la orden ${numero}`} onCerrar={onCerrar}>
      <section data-cierre-orden={numero} aria-label={`Cerrar la orden ${numero}`} className="grid gap-4 rounded-[10px] bg-[var(--panel)] px-5 py-4 shadow-[inset_0_0_0_1px_var(--linea)] sm:px-6">
        <h2 className="text-[19px] font-semibold">Cerrar la orden {numero} · {equipo}</h2>
        <fieldset className="grid gap-2">
          <legend className="mb-1.5 text-[15px] font-semibold">¿Qué hizo?</legend>
          <div className="flex flex-wrap gap-2" data-actividades>
            {ACTIVIDADES.map(a => <button key={a} type="button" aria-pressed={actividad === a} onClick={() => setActividad(a)} className={cn(OPCION, actividad === a && ESCOGIDA)}>{NOMBRE_ACTIVIDAD[a]}</button>)}
          </div>
        </fieldset>
        {catalogo && (
          <fieldset className="grid gap-2">
            <legend className="mb-1.5 text-[15px] font-semibold">¿Qué parte?</legend>
            <div className="flex flex-wrap gap-2">
              {catalogo.partes.map(p => <button key={p.id} type="button" aria-pressed={parte === p.id} onClick={() => setParte(p.id)} className={cn(OPCION, parte === p.id && ESCOGIDA)}>{NOMBRE_PARTE[p.id]}</button>)}
            </div>
          </fieldset>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <label htmlFor={`${id}-ini`} className="grid gap-1 text-[15px] font-semibold">Empezó
            <input id={`${id}-ini`} type="datetime-local" value={inicio} max={local(AHORA)} onChange={e => setInicio(e.target.value)} className={cn(CAJA, 'tabular')} />
          </label>
          <label htmlFor={`${id}-fin`} className="grid gap-1 text-[15px] font-semibold">Terminó
            <input id={`${id}-fin`} type="datetime-local" value={fin} max={local(AHORA)} onChange={e => setFin(e.target.value)} className={cn(CAJA, 'tabular')} />
          </label>
        </div>
        {liberada && <small className="text-[13px] text-[var(--tinta2)]">Liberada en SAP el {fechaHora(new Date(liberada))}.</small>}
        {error && <p role="alert" className="text-[15px]">{error}</p>}
        <div className="flex flex-wrap gap-3">
          <Boton variante="principal" disabled={ocupado || !actividad} onClick={() => void enviar()} className="min-h-12 px-6 text-[16px]">Cerrar la orden</Boton>
          <Boton onClick={onCerrar} className="min-h-12">Cancelar</Boton>
        </div>
      </section>
    </HojaInferior>
  )
}
