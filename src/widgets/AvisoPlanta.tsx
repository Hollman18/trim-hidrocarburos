import { useState } from 'react'
import { useRol } from '@/app/store'
import { useEventosPlanta, avisoParaRol, responderPlanta, type EventoPlantaVista, type AvisoPlanta as Aviso } from '@/shared/api/eventoPlanta'
import { usePiezas } from '@/shared/api/piezas'
import { MarcaPrioridad } from '@/shared/ui/Prioridad'
import { Boton } from '@/shared/ui/primitivas'
import { Info } from '@/shared/ui/Info'
import { cn } from '@/shared/lib/cn'

/** EL AVISO DEL APAGÓN (Fase 4 de facilidades), arriba de lo que el rol ve primero.
 *
 *  Un mismo evento dicho distinto a cada rol (`avisoPlanta`): el gerente, los barriles en juego; el
 *  supervisor, la hora y los relojes; el operador, una pregunta con dos botones; el de energía (el
 *  responsable, o el jefe de mantenimiento si el cliente no lo tiene), el disparo. Es una alarma de
 *  prioridad 1 (ISA-101): la marca y la palabra, no un color suelto. Sin la pieza Energía no sale.
 *  Lo que respondió el campo lo ven los demás («Jairo Peña: no hay luz · 14:06»). */
export function AvisoPlanta({ campos, className }: { campos: string[]; className?: string }) {
  const rol = useRol()
  const piezas = usePiezas(campos)
  const eventos = useEventosPlanta(campos)
  if (!piezas.has('energia')) return null
  const mios = eventos.flatMap(ev => { const a = avisoParaRol(ev, rol.id); return a ? [{ ev, a }] : [] })
  if (!mios.length) return null
  return <div className={cn('grid gap-3', className)}>{mios.map(({ ev, a }) => <Tarjeta key={ev.id} ev={ev} a={a} />)}</div>
}

const hora = (iso: string) => iso.slice(11, 16)

function Tarjeta({ ev, a }: { ev: EventoPlantaVista; a: Aviso }) {
  const rol = useRol()
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const mia = ev.respuestas.find(r => r.rol === rol.id)
  const otras = ev.respuestas.filter(r => r.rol !== rol.id)
  const responder = async (respuesta: 'Sí' | 'No') => {
    setOcupado(true); setError('')
    const r = await responderPlanta(rol.id, ev.id, respuesta)
    setOcupado(false)
    if (!r.ok) setError(r.error)
  }
  return (
    <section role="alert" data-aviso-planta={ev.tipo} data-prueba={ev.prueba ? 'si' : 'no'}
      className="rounded-[10px] bg-[var(--panel)] px-4 py-3.5 shadow-[inset_0_0_0_2px_var(--tinta)] sm:px-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5"><MarcaPrioridad s={1} tamano={20} /></span>
        <div className="grid min-w-0 gap-1">
          <h2 className="text-[18px] font-semibold leading-snug" data-titulo-aviso>{a.titulo}</h2>
          {a.cuerpo && <p className="text-[16px] leading-snug" data-cuerpo-aviso>{a.cuerpo}</p>}
          {/* De dónde salen los relojes, solo si el aviso de este rol los nombra. */}
          {ev.relojes.some(r => `${a.cuerpo} ${a.titulo}`.includes(r.texto)) && (
            <p className="flex flex-wrap items-center gap-x-1 text-[13px] text-[var(--tinta2)]">
              De dónde salen los relojes
              <Info titulo="Los relojes" texto={ev.relojes.map(r => `${r.texto}: ${r.fuente}.`).join(' ')} />
            </p>
          )}
          {ev.prueba && <p className="text-[13px] text-[var(--tinta2)]">Es una prueba del aviso: no entra al libro ni a ningún reporte.</p>}
        </div>
      </div>
      {a.pregunta && (
        <div className="mt-3 grid gap-2" data-pregunta-planta>
          <p className="text-[17px] font-semibold">{a.pregunta.texto}</p>
          {mia ? (
            <p className="text-[15px] text-[var(--tinta2)]" role="status" data-respondido={mia.respuesta}>
              Respondió: <b className="text-[var(--tinta)]">{mia.respuesta}</b> · {hora(mia.hora)}.{' '}
              <button type="button" className="cursor-pointer underline" onClick={() => void responder(mia.respuesta === 'Sí' ? 'No' : 'Sí')} disabled={ocupado}>Cambiar</button>
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {a.pregunta.opciones.map(o => (
                <Boton key={o} variante="principal" className="min-h-12 text-[17px]" disabled={ocupado} onClick={() => void responder(o)} data-responder-planta={o}>{o}</Boton>
              ))}
            </div>
          )}
          {error && <p role="alert" className="text-[14px]">{error}</p>}
        </div>
      )}
      {!a.pregunta && otras.length > 0 && (
        <p className="mt-2 text-[14px] text-[var(--tinta2)]" data-respuestas-planta>
          {otras.map(r => `${r.por}: ${r.respuesta === 'No' ? 'no hay luz' : 'sí hay luz'} · ${hora(r.hora)}`).join(' · ')}
        </p>
      )}
    </section>
  )
}
