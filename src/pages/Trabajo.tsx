import { useApp, useAmbito, useRol, usePersona } from '@/app/store'
import { useRiesgo, usePreguntas, useCtx } from '@/shared/api/diferidos'
import { useSap } from '@/shared/api/sap'
import { useMensajes } from '@/shared/api/mensajes'
import { NOMBRE_CLASE, NOMBRE_ESTADO_ORDEN, type OrdenSap } from '@/entities/sap'
import { NOMBRE_PARTE } from '@/entities/partes'
import { TIPO_CAUSA } from '@/entities/causa-senal'
import { campoPorId } from '@/entities/campos'
import { fechaHora, AHORA } from '@/entities/reloj'
import { Panel, Boton, Chip, Hueco } from '@/shared/ui/primitivas'
import { MarcaPrioridad, DatoInvalido } from '@/shared/ui/Prioridad'
import { Lectura } from '@/shared/ui/Lectura'
import { n0 } from '@/shared/lib/formato'
import { fmtHoras } from '@/widgets/bombas/comun'

/** La pantalla del que agarra la llave: qué está parado y qué se dañó, qué
 *  está avisando y qué revisar, y qué paradas están programadas. Cuando la
 *  señal no dice qué se dañó, lo dice quien abrió el equipo: es el dato que
 *  el vigía necesita para aprender. */
export function Trabajo() {
  const ambito = useAmbito(); const rol = useRol(); const ctx = useCtx(); const persona = usePersona()
  const abrirEquipo = useApp(s => s.abrirEquipo), setCampo = useApp(s => s.setCampo), setPantalla = useApp(s => s.setPantalla)
  const ids = ambito.campos.map(c => c.id)
  const riesgo = useRiesgo(ids)
  const preguntas = usePreguntas(ids).filter(p => p.pide)
  const parados = riesgo.filter(r => r.estado === 'perdiendo' && r.altoImpacto)
  const avisan = riesgo.filter(r => r.estado === 'en-riesgo').sort((a, b) => (a.horas ?? -1) - (b.horas ?? -1))
  const programa = ctx.config.programa.filter(p => ids.includes(p.campoId) && new Date(p.hasta) >= AHORA)
    .sort((a, b) => a.desde.localeCompare(b.desde))
  const abrir = (c: string, eq: string) => { setCampo(c); abrirEquipo(eq, false) }
  // Las órdenes las crea y las libera el planeador en SAP; aquí solo se ven.
  const { ordenes } = useSap(ids)
  const abiertas = ordenes.filter(o => o.estado === 'REL' || o.estado === 'PCNF' || o.estado === 'CRTD')
  const mias = abiertas.filter(o => !!persona.id && o.tecnico === persona.id)
  const otras = abiertas.filter(o => !mias.includes(o))
  // El aviso de WhatsApp de cada orden, por su número (dos órdenes del mismo equipo no se confunden).
  const notificadas = new Map(useMensajes(ids).filter(m => m.regla === 'orden' && m.orden && m.para === persona.id).map(m => [m.orden!, { hora: m.hora, noEnviado: m.noEnviado }]))
  const donde = (c: string) => (ambito.global ? ` · ${campoPorId(c).nombre}` : '')

  return (
    <>
      <div className="mb-2.5 grid gap-x-6 gap-y-3 rounded border border-[var(--linea)] bg-[var(--panel)] p-4 shadow-[var(--sombra)] [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
        <span>
          <b className="tabular flex items-center gap-1.5 text-[30px] leading-none">{parados.length > 0 && <MarcaPrioridad s={1} tamano={18} />}{parados.length}</b>
          <small className="text-[11px] text-[var(--tinta3)]">equipos de alto impacto parados · {n0(parados.reduce((a, r) => a + r.bblDia, 0))} bbl/d</small>
        </span>
        <span>
          <b className="tabular flex items-center gap-1.5 text-[22px] leading-none">{preguntas.some(p => !p.fin) && <MarcaPrioridad s={2} tamano={14} />}{preguntas.length}</b>
          <small className="text-[10.5px] text-[var(--tinta3)]">paradas esperando que alguien diga qué se dañó</small>
        </span>
        <span>
          <b className="tabular block text-[22px] leading-none">{avisan.length}</b>
          <small className="text-[10.5px] text-[var(--tinta3)]">{avisan.length ? `partes avisando · ${avisan[0]!.horas !== undefined ? `la primera llega a su límite en ${fmtHoras(avisan[0]!.horas)}` : 'una ya está fuera de límite'}` : 'partes avisando'}</small>
        </span>
      </div>

      <Lectura>
        Lo que hay que hacer hoy en {ambito.titulo}, sacado de los equipos. Cuando abra un equipo que
        paró sin que la señal dijera por qué, registre qué encontró: es lo único que se escribe, y es
        lo que le enseña al vigía qué mirar la próxima vez.
      </Lectura>

      <div className="mt-2.5 grid items-start gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(310px,1fr))]">
        <Panel titulo="PARADOS · QUÉ SE DAÑÓ" extra={`${parados.length}`}>
          {parados.length === 0 && <p className="text-[12px] text-[var(--tinta2)]">Ningún equipo de alto impacto parado.</p>}
          {parados.map(r => {
            const p = preguntas.find(x => x.equipo === r.equipo && x.campoId === r.campoId && !x.fin)
            return (
              <div key={`${r.campoId}${r.equipo}`} className="border-b border-[var(--linea2)] py-2 last:border-0">
                <button onClick={() => abrir(r.campoId, r.equipo)} className="flex w-full cursor-pointer items-start gap-2.5 text-left hover:bg-[var(--panel2)]">
                  <MarcaPrioridad s={1} tamano={12} className="mt-[2px]" />
                  <span className="min-w-0 flex-1">
                    <b className="text-[12.5px]">{r.equipo}{donde(r.campoId)}</b>
                    <small className="block text-[11px] text-[var(--tinta2)]">{TIPO_CAUSA[r.tipo].toLowerCase()}{r.parte ? ` · ${NOMBRE_PARTE[r.parte].toLowerCase()}` : ' · parte sin identificar'}{r.desde ? ` · desde ${fechaHora(r.desde)}` : ''}</small>
                  </span>
                  {p ? <Chip tono="fuerte">no arrancar</Chip> : <span className="tabular text-[11px]">{n0(r.bblDia)} bbl/d</span>}
                </button>
              </div>
            )
          })}
        </Panel>

        <Panel titulo="PARADAS POR IDENTIFICAR" extra={`${preguntas.length}`}>
          {preguntas.length === 0 && <p className="text-[12px] text-[var(--tinta2)]">Todas las paradas tienen causa.</p>}
          {preguntas.slice(0, 6).map(p => (
            <div key={p.id} className="flex items-center gap-2.5 border-b border-[var(--linea2)] py-1.5 text-[11.5px] last:border-0">
              <MarcaPrioridad s={!p.fin ? 2 : 3} tamano={11} />
              <span className="min-w-0 flex-1"><b>{p.equipo}</b><span className="text-[var(--tinta3)]">{donde(p.campoId)} · {fechaHora(p.inicio)} · {!p.fin ? 'sigue parado' : 'arrancó sin identificar'}</span></span>
            </div>
          ))}
          {preguntas.length > 0 && (rol.pantallas.includes('causa')
            ? <Boton variante="principal" className="mt-2 w-full" onClick={() => setPantalla('causa')}>Registrar qué encontré</Boton>
            : <Hueco>Su rol no responde paradas.</Hueco>)}
        </Panel>

        <Panel titulo="AVISANDO · QUÉ REVISAR" extra="la más cercana primero">
          {avisan.length === 0 && <p className="text-[12px] text-[var(--tinta2)]">Ninguna parte va hacia su límite.</p>}
          {avisan.map(r => (
            <div key={`${r.campoId}${r.equipo}`} className="border-b border-[var(--linea2)] py-2 last:border-0">
              <button onClick={() => abrir(r.campoId, r.equipo)} className="flex w-full cursor-pointer items-start gap-2.5 text-left hover:bg-[var(--panel2)]">
                <MarcaPrioridad s={r.prioridad} tamano={12} className="mt-[2px]" />
                <span className="min-w-0 flex-1">
                  <b className="text-[12.5px]">{r.equipo}{donde(r.campoId)}</b>
                  <small className="block text-[11px] text-[var(--tinta2)]">{r.parte ? NOMBRE_PARTE[r.parte] : ''}{r.tag ? <> · <span className="font-mono">{r.tag}</span></> : ''}</small>
                </span>
                <span className="tabular text-right text-[11px]"><b>{r.horas !== undefined ? fmtHoras(r.horas) : 'ya fuera'}</b></span>
              </button>
              {/* Si ya hay una orden suya para ese equipo, lo que hay que hacer está en la orden: no se repite. */}
              {mias.some(o => o.campoId === r.campoId && o.equipo === r.equipo)
                ? <p className="mt-0.5 pl-[22px] text-[10.5px] text-[var(--tinta2)]">Orden {mias.find(o => o.campoId === r.campoId && o.equipo === r.equipo)!.numero} liberada a su nombre: vea «Órdenes en SAP».</p>
                : r.accion && <p className="mt-0.5 pl-[22px] text-[10.5px] text-[var(--tinta2)]">{r.accion}</p>}
            </div>
          ))}
        </Panel>

        <Panel titulo="ÓRDENES EN SAP" extra={mias.length ? `${mias.length} a su nombre` : `${abiertas.length} abiertas`}>
          <Lectura>
            Las crea y las libera el planeador en SAP; TRIM no las escribe. Cuando SAP libera una a su
            nombre, TRIM le avisa por WhatsApp. Se notifican y se cierran en SAP.
          </Lectura>
          {abiertas.length === 0 && <p className="text-[12px] text-[var(--tinta2)]">SAP no tiene órdenes abiertas en {ambito.titulo}.</p>}
          {mias.map(o => <Orden key={o.numero} o={o} donde={donde(o.campoId)} mia aviso={notificadas.get(o.numero)} onAbrir={() => abrir(o.campoId, o.equipo)} />)}
          {mias.length > 0 && otras.length > 0 && <h5 className="font-cond mt-2.5 mb-0.5 text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]">DE OTROS PUESTOS</h5>}
          {otras.map(o => <Orden key={o.numero} o={o} donde={donde(o.campoId)} onAbrir={() => abrir(o.campoId, o.equipo)} />)}
        </Panel>

        <Panel titulo="PARADAS PROGRAMADAS" extra="del programa aprobado">
          {programa.length === 0 && <p className="text-[12px] text-[var(--tinta2)]">Nada programado de aquí en adelante.</p>}
          {programa.map(p => (
            <div key={p.id} className="border-b border-[var(--linea2)] py-1.5 text-[11.5px] last:border-0">
              <b>{p.equipo}</b><span className="text-[var(--tinta3)]">{donde(p.campoId)} · {fechaHora(new Date(p.desde))} a {fechaHora(new Date(p.hasta))}</span>
              <small className="block text-[10.5px] text-[var(--tinta2)]">{p.motivo}</small>
            </div>
          ))}
        </Panel>
      </div>
    </>
  )
}

/** Una orden de SAP tal como la ve quien la ejecuta: qué, dónde, en qué va y
 *  con qué repuestos reservados. */
function Orden({ o, donde, mia, aviso, onAbrir }: { o: OrdenSap; donde: string; mia?: boolean; aviso?: { hora: string; noEnviado?: string }; onAbrir: () => void }) {
  return (
    <div className="border-b border-[var(--linea2)] py-2 text-[11.5px] last:border-0">
      <button onClick={onAbrir} className="flex w-full cursor-pointer items-start gap-2.5 text-left hover:bg-[var(--panel2)]">
        <span className="min-w-0 flex-1">
          <b className="text-[12.5px]">{o.equipo}{donde}</b> <span className="font-mono text-[10.5px] text-[var(--tinta3)]">{o.numero}</span>
          <small className="block text-[11px] text-[var(--tinta2)]">{o.descripcion}</small>
          <small className="block text-[10.5px] text-[var(--tinta3)]">
            {NOMBRE_CLASE[o.clase]} · prioridad {o.prioridad} · {o.liberada ? `liberada ${fechaHora(new Date(o.liberada))}` : `creada ${fechaHora(new Date(o.creada))}`} · {mia ? 'a su nombre' : `puesto ${o.puesto}`}
          </small>
          {o.repuestos.length > 0 && <small className="block text-[10.5px] text-[var(--tinta2)]">Repuestos reservados: {o.repuestos.map(r => `${r.cantidad} × ${r.descripcion}`).join(', ')}</small>}
          {/* Si el aviso no salió (un dato de SAP que no cabía en la plantilla), se dice: nadie le avisó. */}
          {aviso && (aviso.noEnviado
            ? <small className="flex items-baseline gap-1 text-[10.5px] text-[var(--tinta)]"><DatoInvalido etiqueta="Aviso no enviado" tamano={10} />TRIM no pudo avisarle por WhatsApp ({fechaHora(new Date(aviso.hora))}): {aviso.noEnviado}</small>
            : <small className="block text-[10.5px] text-[var(--tinta2)]">TRIM le avisó por WhatsApp · {fechaHora(new Date(aviso.hora))}</small>)}
        </span>
        <Chip>{NOMBRE_ESTADO_ORDEN[o.estado]}</Chip>
      </button>
    </div>
  )
}
