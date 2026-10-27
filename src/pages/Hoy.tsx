import { useEffect, useRef, useState } from 'react'
import { useAmbito, useRol, usePersona } from '@/app/store'
import { useHoy, type TareaHoy } from '@/shared/api/hoy'
import { useTelefono } from '@/shared/ui/telefono'
import { Boton, Enlace } from '@/shared/ui/primitivas'
import { Tarjeta } from '@/widgets/hoy/Tarjeta'
import { Inicio, Bloqueo, Hechas, AvisoDeshacer } from '@/widgets/hoy/piezas'
import { SuCampo, TurnoWhatsapp, DiferidoTurno } from '@/widgets/hoy/Lateral'
import { Operador } from '@/widgets/hoy/Operador'
import { Entrega } from '@/widgets/hoy/Entrega'
import { useEnvio } from '@/widgets/hoy/envio'
import { useResponder, useConfirmar, useEscribir } from '@/widgets/hoy/acciones'
import { useIr } from '@/widgets/hoy/palabras'

/** Hoy: un solo lugar para lo que a cada rol le toca hacer (X4 §3.3, §3.4 y
 *  §5.5; X5 §5.1, §5.6-5.8). Todo lo dice el motor (`GET /api/vistas/hoy`):
 *  la cifra con su frase, la franja «No arrancar», las tarjetas en su orden
 *  (lo que tiene hora, los barriles en juego, lo demás y, al final, lo que solo
 *  informa), «Hecho hoy» y, al lado, el campo ahora, el WhatsApp del turno y el
 *  diferido del turno. Contestar o confirmar deja un aviso con «Deshacer». El
 *  operador, en el teléfono, contesta de a una pregunta por pantalla.
 *  «Entregar turno» abre la entrega del turno (P-06): en su lugar en el escritorio,
 *  como una hoja que sube en el teléfono. Cuando una tarjeta se va (se confirmó o se
 *  contestó), el foco pasa a la que quedó en su lugar y no se pierde (A2). */
export function Hoy() {
  const rol = useRol(); const ambito = useAmbito(); const persona = usePersona()
  const telefono = useTelefono()
  const ir = useIr()
  const v = useHoy(rol.id, ambito.campos.map(c => c.id))
  const envio = useEnvio(useEscribir(), rol.id)
  const responder = useResponder(envio)
  const confirmar = useConfirmar(envio)
  const quien = persona.sinAcceso ? undefined : persona.nombre
  const [entrega, setEntrega] = useState(false)

  // Lo que se acaba de hacer no se vuelve a pintar mientras dura su «Deshacer».
  const visible = (t: TareaHoy) => !envio.ocultas.has(t.id) && (!t.preguntas?.length || t.preguntas.some(q => !envio.ocultas.has(q.id)))
  const tareas = v.tareas.filter(visible)

  // A2: la tarjeta que tenía el foco se fue (se confirmó): el foco va al título de la que quedó en su lugar.
  const lista = useRef<HTMLDivElement>(null)
  const conFoco = useRef(-1)
  useEffect(() => {
    const cont = lista.current
    if (!cont) return
    const marcar = () => { conFoco.current = [...cont.querySelectorAll('[data-tarea]')].findIndex(t => t.contains(document.activeElement)) }
    cont.addEventListener('focusin', marcar)
    return () => cont.removeEventListener('focusin', marcar)
  }, [])
  const ids = tareas.map(t => t.id).join('|')
  useEffect(() => {
    const cont = lista.current, i = conFoco.current
    if (!cont || i < 0) return
    const activo = document.activeElement
    if (activo && activo !== document.body && activo.isConnected) return
    const ts = cont.querySelectorAll<HTMLElement>('[data-tarea]')
    ts[Math.min(i, ts.length - 1)]?.querySelector<HTMLElement>('[data-titulo-tarea]')?.focus()
  }, [ids])

  if (rol.id === 'oper' && telefono) return (
    <>
      <div data-hoy={rol.id} data-insignia={v.insignia}><Operador v={v} ocultas={envio.ocultas} onResponder={responder} quien={quien} envio={envio} /></div>
      <AvisoDeshacer envio={envio} />
    </>
  )

  const lado = !!(v.campo || v.whatsapp || v.turno)
  const corregir = rol.pantallas.includes('causa') ? () => ir({ a: 'paradas' }) : undefined
  return (
    <>
      {entrega && v.entrega && <div className="mb-[14px]"><Entrega e={v.entrega} onCerrar={() => setEntrega(false)} /></div>}
      <div data-hoy={rol.id} data-insignia={v.insignia} className={lado ? 'grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,352px)]' : 'grid gap-5'}>
        <div className="grid min-w-0 content-start gap-[14px]">
          {/* Sin nada que hacer, la cifra «0» repetiría el vacío: queda solo la cifra que dice algo del campo. */}
          {!(v.vacio && !v.inicio.previo) && <Inicio i={v.inicio} entregaAbierta={entrega} onEntregar={v.entrega ? () => setEntrega(x => !x) : undefined} />}
          {/* La salvedad del bloqueo, en el teléfono de quien no está frente al equipo, a la ⓘ (imagen 3b). */}
          {v.bloqueos.map(b => <Bloqueo key={b.campoId} b={b} subEnInfo={rol.id !== 'oper'} />)}
          {v.vacio && !tareas.some(t => t.pide) && (
            <section data-vacio className="rounded-[20px] bg-[var(--panel)] px-6 py-5">
              <p className="text-[18px] font-medium">{v.vacio}</p>
              <div className="mt-2"><Enlace onClick={() => ir({ a: 'planta' })}>Abrir La planta viva</Enlace></div>
            </section>
          )}
          <div ref={lista} className="grid gap-[14px]" data-tareas>
            {tareas.map(t => <Tarjeta key={t.id} t={t} global={ambito.global} ocultas={envio.ocultas} quien={quien}
              onConfirmar={confirmar} onResponder={responder} />)}
          </div>
          <Hechas hs={v.hechas} onCorregir={corregir} />
          {v.entrega && <Boton onClick={() => setEntrega(x => !x)} aria-expanded={entrega} className="min-h-14 w-full text-[17px] sm:hidden">Entregar turno</Boton>}
        </div>
        {lado && (
          <aside className="grid content-start gap-[14px] max-sm:hidden" aria-label="Al lado">
            {v.campo && <SuCampo c={v.campo} />}
            {v.whatsapp && <TurnoWhatsapp w={v.whatsapp} />}
            {v.turno && <DiferidoTurno horas={v.turno.horas} bbl={v.turno.diferidoBbl} />}
          </aside>
        )}
      </div>
      <AvisoDeshacer envio={envio} />
    </>
  )
}
