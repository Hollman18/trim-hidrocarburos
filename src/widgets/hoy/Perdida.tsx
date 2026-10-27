import { useId, useState } from 'react'
import { useAmbito, useRol } from '@/app/store'
import {
  registrarPerdida, TIPOS_PERDIDA, NOMBRE_TIPO_PERDIDA, EXPLICA_TIPO_PERDIDA, FUENTES_VOLUMEN, NOMBRE_FUENTE_VOLUMEN, MAXIMO_DONDE,
  type TipoPerdida, type FuenteVolumen, type CuerpoPerdida,
} from '@/shared/api/perdidas'
import { NOMBRE_TRAMO_BALANCE } from '@/shared/api/balance'
import { ORDEN_CHOKE, type ChokeAnh } from '@/shared/api/choke'
import { puedeHacer } from '@/entities/tipos'
import { MOTIVO_MINIMO, alcanza } from '@/entities/reglas'
import { AHORA } from '@/entities/reloj'
import { campoPorId } from '@/entities/campos'
import { HojaInferior } from '@/shared/ui/HojaInferior'
import { Boton } from '@/shared/ui/primitivas'
import { n0 } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import type { Envio } from './envio'

/** El tramo donde suele ocurrir cada tipo (se puede cambiar): la pitera y el derrame, en
 *  las líneas de los pozos; la tea y el venteo, en la planta; el rechazo, afuera. */
const TRAMO_DE: Record<TipoPerdida, ChokeAnh> = { pitera: 'pozo', derrame: 'pozo', tea: 'planta', venteo: 'planta', rechazo: 'exportacion' }
const ES_GAS = (t: TipoPerdida) => t === 'tea' || t === 'venteo'
/** La hora de Colombia para un `datetime-local` («2026-10-02T14:00»), y de vuelta con su zona. */
const local = (d: Date) => new Date(d.getTime() - 5 * 3_600_000).toISOString().slice(0, 16)
const conZona = (v: string) => `${v}:00-05:00`

const CAJA = 'min-h-12 w-full min-w-0 rounded-[8px] bg-[var(--panel)] px-3 text-[16px] shadow-[inset_0_0_0_1.5px_var(--linea)] outline-none focus:shadow-[inset_0_0_0_2px_var(--foco)]'
const OPCION = 'flex min-h-14 cursor-pointer flex-col items-start justify-center rounded-[8px] bg-[var(--panel)] px-3.5 py-2 text-left shadow-[inset_0_0_0_1.5px_var(--linea)] hover:bg-[var(--panel2)]'
const ESCOGIDA = 'bg-[var(--acento-suave)] shadow-[inset_0_0_0_2px_var(--acento)]'

/** «Registrar una pérdida» (A2 · `POST /api/perdidas`; necesario-por-rol §4): la ve quien está en
 *  el campo (oper) y también sup y prod. Con botones: pitera, derrame, tea, venteo o rechazo; el
 *  tramo del choke donde ocurrió (la pérdida queda como PÉRDIDA en su tramo, nunca sumada a lo
 *  diferido), dónde, cuánto y cómo lo supo. Nada se calcula aquí: el servidor la guarda y el balance
 *  la cuenta. «Deshacer» la retira con su motivo (D1: nada se borra). */
export function RegistrarPerdida({ envio, className }: { envio: Envio; className?: string }) {
  const rol = useRol(); const ambito = useAmbito()
  const [abierta, setAbierta] = useState(false)
  if (!puedeHacer(rol.puede, 'perdidas:registrar')) return null
  return (
    <>
      <Boton onClick={() => setAbierta(true)} aria-expanded={abierta} data-registrar-perdida className={cn('min-h-12 px-5 text-[16px]', className)}>Registrar una pérdida</Boton>
      {abierta && <Formulario campos={ambito.campos.map(c => c.id)} envio={envio} onCerrar={() => setAbierta(false)} />}
    </>
  )
}

function Formulario({ campos, envio, onCerrar }: { campos: string[]; envio: Envio; onCerrar: () => void }) {
  const rol = useRol()
  const id = useId()
  const [campoId, setCampoId] = useState(campos[0]!)
  const [tipo, setTipo] = useState<TipoPerdida | null>(null)
  const [tramo, setTramo] = useState<ChokeAnh | null>(null)
  const [donde, setDonde] = useState('')
  const [cuanto, setCuanto] = useState('')
  const [fuente, setFuente] = useState<FuenteVolumen>('estimado')
  const [como, setComo] = useState('')
  const [inicio, setInicio] = useState(local(AHORA))
  const [sigue, setSigue] = useState(true)
  const [fin, setFin] = useState(local(AHORA))
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const gas = tipo ? ES_GAS(tipo) : false

  const escoger = (t: TipoPerdida) => { setTipo(t); setTramo(x => x ?? TRAMO_DE[t]); setError('') }
  const enviar = async () => {
    const valor = Number(cuanto.replace(',', '.'))
    if (!tipo) return setError('Escoja qué pasó.')
    if (!donde.trim()) return setError('Diga dónde: el equipo o el punto.')
    if (!(valor > 0)) return setError(gas ? 'Diga cuánto gas, en KPC.' : 'Diga cuántos barriles.')
    if (!alcanza(como, MOTIVO_MINIMO)) return setError('Diga cómo lo midió o lo estimó (por ejemplo, «aforo del tanque»).')
    const cuerpo: CuerpoPerdida = {
      campoId, tipo, tramo: tramo ?? TRAMO_DE[tipo], donde: donde.trim(), inicio: conZona(inicio), fin: sigue ? null : conZona(fin),
      volumen: { bbl: gas ? 0 : valor, ...(gas ? { gasKpc: valor } : {}), fuente, como: como.trim() },
    }
    setOcupado(true); setError('')
    const r = await registrarPerdida({ rolId: rol.id }, cuerpo)
    setOcupado(false)
    if (!r.ok) return setError(r.error)
    const dicho = `${NOMBRE_TIPO_PERDIDA[tipo].toLowerCase()} en ${cuerpo.donde} · ${n0(valor)} ${gas ? 'KPC' : 'bbl'}`
    envio.registrar({
      id: `perdida:${r.perdida.id}`, texto: `Pérdida registrada: ${dicho}`,
      deshacer: async () => {
        const x = await registrarPerdida({ rolId: rol.id }, { ...cuerpo, corrige: r.perdida.id, retirar: true, motivo: 'Registrada por error: se deshizo al momento.' })
        return x.ok ? { ok: true } : { ok: false, error: x.error }
      },
    })
    onCerrar()
  }

  return (
    <HojaInferior titulo="Registrar una pérdida" onCerrar={onCerrar}>
      <section data-perdida-formulario aria-label="Registrar una pérdida" className="grid gap-4 rounded-[10px] bg-[var(--panel)] px-5 py-4 shadow-[inset_0_0_0_1px_var(--linea)] sm:px-6">
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[19px] font-semibold">Registrar una pérdida</h2>
          <span className="text-[14px] text-[var(--tinta2)]">Lo que salió y no se vendió · aparte de lo diferido</span>
        </header>
        {campos.length > 1 && (
          <label className="grid gap-1 text-[15px] font-semibold">Campo
            <select value={campoId} onChange={e => setCampoId(e.target.value)} className={CAJA}>
              {campos.map(c => <option key={c} value={c}>{campoPorId(c).nombre}</option>)}
            </select>
          </label>
        )}
        <fieldset className="grid gap-2">
          <legend className="mb-1.5 text-[15px] font-semibold">¿Qué pasó?</legend>
          <div className="grid gap-2 sm:grid-cols-2" data-tipos-perdida>
            {TIPOS_PERDIDA.map(t => (
              <button key={t} type="button" aria-pressed={tipo === t} onClick={() => escoger(t)} data-tipo-perdida={t} className={cn(OPCION, tipo === t && ESCOGIDA)}>
                <b className="text-[17px] font-semibold">{NOMBRE_TIPO_PERDIDA[t]}</b>
                <small className="text-[14px] leading-snug text-[var(--tinta2)]">{EXPLICA_TIPO_PERDIDA[t]}</small>
              </button>
            ))}
          </div>
        </fieldset>
        {tipo && (
          <>
            <fieldset className="grid gap-2">
              <legend className="mb-1.5 text-[15px] font-semibold">¿En qué tramo?</legend>
              <div className="flex flex-wrap gap-2" data-tramos-perdida>
                {ORDEN_CHOKE.map(t => (
                  <button key={t} type="button" aria-pressed={tramo === t} onClick={() => setTramo(t)} data-tramo={t}
                    className={cn('min-h-11 cursor-pointer rounded-[8px] px-3.5 text-[15px] font-semibold shadow-[inset_0_0_0_1.5px_var(--linea)]', tramo === t && ESCOGIDA)}>
                    {NOMBRE_TRAMO_BALANCE[t]}
                  </button>
                ))}
              </div>
            </fieldset>
            <label htmlFor={`${id}-donde`} className="grid gap-1 text-[15px] font-semibold">¿Dónde?
              <input id={`${id}-donde`} value={donde} maxLength={MAXIMO_DONDE} onChange={e => setDonde(e.target.value)} placeholder="LC-07, línea de flujo de LC-07" className={CAJA} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label htmlFor={`${id}-cuanto`} className="grid gap-1 text-[15px] font-semibold">{gas ? '¿Cuánto gas? (KPC)' : '¿Cuántos barriles?'}
                <input id={`${id}-cuanto`} inputMode="decimal" value={cuanto} onChange={e => setCuanto(e.target.value)} className={cn(CAJA, 'tabular')} />
              </label>
              <fieldset className="grid gap-1">
                <legend className="mb-1 text-[15px] font-semibold">El volumen es</legend>
                <div className="flex gap-2">
                  {FUENTES_VOLUMEN.map(f => (
                    <button key={f} type="button" aria-pressed={fuente === f} onClick={() => setFuente(f)}
                      className={cn('min-h-12 flex-1 cursor-pointer rounded-[8px] px-3 text-[15px] font-semibold shadow-[inset_0_0_0_1.5px_var(--linea)]', fuente === f && ESCOGIDA)}>
                      {NOMBRE_FUENTE_VOLUMEN[f]}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
            <label htmlFor={`${id}-como`} className="grid gap-1 text-[15px] font-semibold">¿Cómo lo supo?
              <input id={`${id}-como`} value={como} onChange={e => setComo(e.target.value)} placeholder="aforo del tanque, charco de 3 × 2 m" className={CAJA} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label htmlFor={`${id}-inicio`} className="grid gap-1 text-[15px] font-semibold">Empezó
                <input id={`${id}-inicio`} type="datetime-local" value={inicio} max={local(AHORA)} onChange={e => setInicio(e.target.value)} className={cn(CAJA, 'tabular')} />
              </label>
              <div className="grid gap-1">
                <label className="flex min-h-11 items-center gap-2 text-[15px] font-semibold">
                  <input type="checkbox" checked={sigue} onChange={e => setSigue(e.target.checked)} className="size-5" />Sigue
                </label>
                {!sigue && <input aria-label="Terminó" type="datetime-local" value={fin} max={local(AHORA)} onChange={e => setFin(e.target.value)} className={cn(CAJA, 'tabular')} />}
              </div>
            </div>
          </>
        )}
        {error && <p role="alert" className="text-[15px] text-[var(--tinta)]">{error}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <Boton variante="principal" disabled={ocupado || !tipo} onClick={() => void enviar()} className="min-h-12 px-6 text-[16px]">Registrar</Boton>
          <Boton onClick={onCerrar} className="min-h-12">Cancelar</Boton>
          <small className="basis-full text-[13px] text-[var(--tinta2)]">Queda a su nombre, con la hora del sistema. Lo que escribe no sale de TRIM.</small>
        </div>
      </section>
    </HojaInferior>
  )
}
