import { useAmbito, useRol, usePersona } from '@/app/store'
import { useHoy, type TareaHoy } from '@/shared/api/hoy'
import { useTelefono } from '@/shared/ui/telefono'
import { Boton, Enlace } from '@/shared/ui/primitivas'
import { Tarjeta } from '@/widgets/hoy/Tarjeta'
import { Inicio, Bloqueo, Hechas, AvisoDeshacer } from '@/widgets/hoy/piezas'
import { SuCampo, TurnoWhatsapp, DiferidoTurno } from '@/widgets/hoy/Lateral'
import { Operador } from '@/widgets/hoy/Operador'
import { useEnvio } from '@/widgets/hoy/envio'
import { useResponder, useConfirmar } from '@/widgets/hoy/acciones'
import { useIr } from '@/widgets/hoy/palabras'

/** Hoy: un solo lugar para lo que a cada rol le toca hacer (X4 §3.3, §3.4 y
 *  §5.5; X5 §5.1, §5.6-5.8). Todo lo dice el motor (`GET /api/vistas/hoy`):
 *  la cifra con su frase, la franja «No arrancar», las tarjetas en su orden
 *  (lo que tiene hora, los barriles en juego, lo demás y, al final, lo que solo
 *  informa), «Hecho hoy» y, al lado, el campo ahora, el WhatsApp del turno y el
 *  diferido del turno. Contestar o confirmar deja un aviso con «Deshacer». El
 *  operador, en el teléfono, contesta de a una pregunta por pantalla. */
export function Hoy() {
  const rol = useRol(); const ambito = useAmbito(); const persona = usePersona()
  const telefono = useTelefono()
  const ir = useIr()
  const v = useHoy(rol.id, ambito.campos.map(c => c.id))
  const envio = useEnvio()
  const responder = useResponder(envio)
  const confirmar = useConfirmar(envio)
  const quien = persona.sinAcceso ? undefined : persona.nombre

  // Lo que se acaba de hacer no se vuelve a pintar mientras dura su «Deshacer».
  const visible = (t: TareaHoy) => !envio.ocultas.has(t.id) && (!t.preguntas?.length || t.preguntas.some(q => !envio.ocultas.has(q.id)))
  const tareas = v.tareas.filter(visible)

  if (rol.id === 'oper' && telefono) return (
    <>
      <div data-hoy={rol.id} data-insignia={v.insignia}><Operador v={v} ocultas={envio.ocultas} onResponder={responder} quien={quien} /></div>
      <AvisoDeshacer envio={envio} />
    </>
  )

  const lado = !!(v.campo || v.whatsapp || v.turno)
  return (
    <>
      <div data-hoy={rol.id} data-insignia={v.insignia} className={lado ? 'grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,352px)]' : 'grid gap-5'}>
        <div className="grid min-w-0 content-start gap-[14px]">
          {/* Sin nada que hacer, la cifra «0» repetiría el vacío: queda solo la cifra que dice algo del campo. */}
          {!(v.vacio && !v.inicio.previo) && <Inicio i={v.inicio} onEntregar={v.entregarTurno ? () => ir({ a: 'turno' }) : undefined} />}
          {v.bloqueos.map(b => <Bloqueo key={b.campoId} b={b} />)}
          {v.vacio && !tareas.some(t => t.pide) && (
            <section data-vacio className="rounded-[20px] bg-[var(--panel)] px-6 py-5">
              <p className="text-[18px] font-medium">{v.vacio}</p>
              <div className="mt-2"><Enlace onClick={() => ir({ a: 'planta' })}>Abrir La planta viva</Enlace></div>
            </section>
          )}
          <div className="grid gap-[14px]" data-tareas>
            {tareas.map(t => <Tarjeta key={t.id} t={t} global={ambito.global} ocultas={envio.ocultas} quien={quien}
              onConfirmar={confirmar} onResponder={responder} />)}
          </div>
          <Hechas hs={v.hechas} />
          {v.entregarTurno && <Boton onClick={() => ir({ a: 'turno' })} className="min-h-14 w-full text-[17px] sm:hidden">Entregar turno</Boton>}
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
