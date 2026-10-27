import { useState } from 'react'
import { useAmbito, usePersona, useRol } from '@/app/store'
import { useHoy } from '@/shared/api/hoy'
import { AvisarSap } from '@/widgets/sap/AvisarSap'
import { Tarjeta } from './Tarjeta'
import { AvisoDeshacer } from './piezas'
import { LoQueVio, type Vio } from './LoQueVio'
import { useEnvio } from './envio'
import { Boton } from '@/shared/ui/primitivas'
import { useResponder, useConfirmar, useEscribir } from './acciones'

/** Confiabilidad no tiene Hoy: lo que le toca hacer (contestar yo, decidir los planes, avisar a
 *  SAP) va en tarjetas arriba de su Equipos (flujos.md, conf · tarea 3; borrado.md, «Hoy de conf:
 *  se funde en su Equipos»). Las mismas tarjetas y el mismo «Deshacer» de Hoy. */
export function TareasArriba() {
  const rol = useRol(); const ambito = useAmbito(); const persona = usePersona()
  const v = useHoy(rol.id, ambito.campos.map(c => c.id))
  const envio = useEnvio(useEscribir(), rol.id)
  const [vio, setVio] = useState<Vio | null>(null)
  const responder = useResponder(envio, setVio)
  const confirmar = useConfirmar(envio)
  const tareas = v.tareas.filter(t => t.pide && t.tipo !== 'orden' && !envio.ocultas.has(t.id)
    && (!t.preguntas?.length || t.preguntas.some(q => !envio.ocultas.has(q.id))))
  const bombas = [...new Map(tareas.flatMap(t => t.preguntas ?? []).filter(q => q.sobre === 'bomba' && q.libro)
    .map(q => [q.equipo, { campoId: q.campoId, equipo: q.equipo, evento: q.libro!.evento, contexto: q.contexto }])).values()]
  const [abiertas, setAbiertas] = useState(false)
  if (!tareas.length && !vio) return null
  // FF-2: una sola línea («Le tocan 3 cosas»); las tarjetas, a un toque.
  return (
    <section aria-label="Le toca" data-tareas-arriba className="grid gap-3">
      {vio && <LoQueVio v={vio} envio={envio} onListo={() => setVio(null)} />}
      <p className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 rounded-[10px] bg-[var(--panel)] px-5 py-3 text-[16px] sm:px-6" data-le-toca={tareas.length}>
        <span>Le {tareas.length === 1 ? 'toca' : 'tocan'} <b className="tabular font-bold">{tareas.length}</b> {tareas.length === 1 ? 'cosa' : 'cosas'} <span className="text-[var(--tinta2)]">· {tareas[0]!.titulo.charAt(0).toLowerCase()}{tareas[0]!.titulo.slice(1)}</span></span>
        <Boton aria-expanded={abiertas} onClick={() => setAbiertas(x => !x)} className="min-h-11 px-5">{abiertas ? 'Ocultar' : 'Ver lo que le toca'}</Boton>
      </p>
      {abiertas && tareas.map(t => <Tarjeta key={t.id} t={t} global={ambito.global} ocultas={envio.ocultas} quien={persona.sinAcceso ? undefined : persona.nombre}
        onConfirmar={confirmar} onResponder={responder} />)}
      {bombas.map(b => <AvisarSap key={b.equipo} {...b} />)}
      <AvisoDeshacer envio={envio} />
    </section>
  )
}
