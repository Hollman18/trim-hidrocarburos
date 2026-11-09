import { useState } from 'react'
import { useRol } from '@/app/store'
import { useEventosPlanta, pedirEventosPlanta, probarApagon, terminarPrueba, avisoParaRol, rolesQueSeAvisan, queParo, type TipoApagon } from '@/shared/api/eventoPlanta'
import { enviarAvisoPush } from '@/shared/api/push'
import { usePiezas } from '@/shared/api/piezas'
import { campoPorId } from '@/entities/campos'
import { Panel, Boton, Hueco } from '@/shared/ui/primitivas'
import { Info } from '@/shared/ui/Info'

const NOMBRE_ROL: Record<string, string> = { sup: 'Supervisor', oper: 'Operador', ger: 'Gerente', jefe: 'Jefe de mantenimiento', ener: 'Responsable de energía' }

/** PROBAR EL AVISO DE APAGÓN (Fase 4 de facilidades). El administrador dispara un apagón de prueba
 *  para ver que la cadena llega: lo ve cada rol en su pantalla y, quien activó las notificaciones,
 *  en su celular o su escritorio. Se dice «Prueba» en todo y nunca entra al libro. */
export function PruebaApagon({ campoId }: { campoId: string }) {
  const rol = useRol()
  const piezas = usePiezas([campoId])
  const eventos = useEventosPlanta([campoId])
  const [error, setError] = useState('')
  const [push, setPush] = useState('')
  const [ocupado, setOcupado] = useState(false)
  if (!piezas.has('energia')) return null
  const abierto = eventos.find(e => e.prueba)
  const puede = rol.puede['conector:configurar']

  const probar = async (tipo: TipoApagon) => {
    setOcupado(true); setError(''); setPush('')
    const r = await probarApagon(rol.id, campoId, tipo)
    if (!r.ok) { setOcupado(false); setError(r.error); return }
    // El aviso de cada rol, como lo va a leer en la notificación.
    const ev = pedirEventosPlanta({ campos: [campoId] }, [r.evento])[0]
    const avisos = ev ? Object.fromEntries(rolesQueSeAvisan().flatMap(x => { const a = avisoParaRol(ev, x); return a ? [[x, { titulo: a.titulo, cuerpo: a.pregunta ? `${a.cuerpo} ${a.pregunta.texto}`.trim() : a.cuerpo }]] : [] })) : {}
    const p = await enviarAvisoPush(campoId, r.evento.id, avisos, Object.entries(rol.puede).filter(([, v]) => v).map(([k]) => k))
    setPush(p.texto)
    setOcupado(false)
  }
  const terminar = async () => {
    if (!abierto) return
    setOcupado(true); setError('')
    const r = await terminarPrueba(rol.id, abierto.id)
    setOcupado(false)
    if (!r.ok) setError(r.error)
  }

  return (
    <Panel titulo="Probar el aviso de apagón">
      <div className="grid gap-3" data-prueba-apagon={abierto ? abierto.tipo : 'ninguna'}>
        <p className="flex flex-wrap items-center gap-x-1 text-[15px] text-[var(--tinta2)]">
          Un apagón de prueba en {campoPorId(campoId).nombre}: cada rol lo ve en su pantalla y en su notificación, marcado como prueba.
          <Info titulo="El aviso de apagón" texto={`A quién le llega: ${rolesQueSeAvisan().map(x => NOMBRE_ROL[x] ?? x).join(', ')}. Total: el interruptor de llegada abre y para todo. Parcial: se cae el circuito de las bombas de agua y los pozos siguen, que es lo que llena el tanque. La prueba no entra al libro ni a ningún reporte.`} />
        </p>
        {abierto ? (
          <div className="grid gap-2">
            <p className="text-[16px]"><b>Prueba abierta:</b> apagón {abierto.tipo} · paró {queParo(abierto)}.</p>
            {abierto.respuestas.length > 0 && <p className="text-[14px] text-[var(--tinta2)]">Respondieron: {abierto.respuestas.map(r => `${r.por} (${r.respuesta})`).join(', ')}.</p>}
            {puede && <div><Boton onClick={() => void terminar()} disabled={ocupado} data-terminar-prueba>Terminar la prueba</Boton></div>}
          </div>
        ) : puede ? (
          <div className="flex flex-wrap gap-2">
            <Boton variante="principal" disabled={ocupado} onClick={() => void probar('total')} data-probar-apagon="total">Apagón total</Boton>
            <Boton disabled={ocupado} onClick={() => void probar('parcial')} data-probar-apagon="parcial">Apagón parcial</Boton>
          </div>
        ) : <Hueco>Probar el aviso lo hace el administrador.</Hueco>}
        {push && <p role="status" className="text-[14px] text-[var(--tinta2)]" data-push-enviado>{push}</p>}
        {error && <p role="alert" className="text-[14px]">{error}</p>}
      </div>
    </Panel>
  )
}
