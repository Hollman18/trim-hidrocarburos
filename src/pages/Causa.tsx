import { useEffect, useRef, useState } from 'react'
import { useApp, useAmbito, useRol, useRango, usePersona } from '@/app/store'
import { useLibro, usePreguntas, useCtx, useOpcionesRespuesta } from '@/shared/api/diferidos'
import { useAnalisis, useAnalisisAnteriores } from '@/shared/api/sesion'
import { TEXTO_LIBRE_MINIMO, alcanza } from '@/entities/reglas'
import { useMensajes } from '@/shared/api/mensajes'
import { pedirCatalogoDeDanos } from '@/shared/api/equipos'
import { CAUSAS_POZO, NO_FUE_ESP, ORDEN_PASO, type Mensaje } from '@/entities/mensajes'
import { Telefono } from '@/widgets/whatsapp/Telefono'
import { NoEnviado } from '@/widgets/whatsapp/NoEnviado'
import type { Pregunta } from '@/entities/libro'
import { NOMBRE_PARTE, type ParteId } from '@/entities/partes'
import { modosDeParte, nombreModo, MECANISMOS_POR_FAMILIA, MECANISMO_SUGERIDO, MODO_OTRO } from '@/entities/catalogo'
import { modo as modoIso, mecanismo as mecanismoIso, CAUSAS_RAIZ } from '@/entities/iso14224'
import { campoPorId } from '@/entities/campos'
import { fechaHora, horasEntre, AHORA } from '@/entities/reloj'
import { fraseParte, fmtHoras } from '@/widgets/bombas/comun'
import { Panel, Boton, Chip, Hueco } from '@/shared/ui/primitivas'
import { MarcaPrioridad } from '@/shared/ui/Prioridad'
import { Lectura } from '@/shared/ui/Lectura'
import { Tip } from '@/shared/ui/Tip'
import { n0, n1, plural } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { useUsuarios } from '@/shared/api/usuarios'
import { puedeHacer } from '@/entities/tipos'

/** Paradas por identificar: las que ninguna señal explica. Es el único lugar
 *  donde una persona escribe algo que entra al libro, y entra marcado como
 *  declarado.
 *
 *  Regla de operación: el equipo que paró sin causa identificable no se
 *  arranca hasta que se identifique el daño. TRIM no escribe en el PLC; el
 *  bloqueo es de procedimiento, y si arranca antes queda como no conformidad. */
export function Causa() {
  const ambito = useAmbito(); const rango = useRango(); const rol = useRol()
  const ids = ambito.campos.map(c => c.id)
  const lb = useLibro({ campos: ids, desde: rango.desde, hasta: rango.hasta })
  const preguntas = usePreguntas(ids)
  const mensajes = useMensajes(ids)
  const hilo = (p: Pregunta) => mensajes.filter(m => m.evento === p.id)
  const puede = puedeHacer(rol.puede, 'causa:declarar')

  const pendientes = preguntas.filter(p => p.pide && !p.arrancoSinIdentificar)
  const noConformes = preguntas.filter(p => p.arrancoSinIdentificar)
  const declaradas = preguntas.filter(p => !p.pide && p.causa.declarado)
  const ctx = useCtx(); const analisis = useAnalisis()
  // Las respondidas en esta sesión: el aviso de que pasaron a «Declaradas».
  const recien = declaradas.filter(p => ctx.respuestas[p.id])
  // Responder (en pantalla o con el último toque del chat) desmonta la
  // tarjeta, y el botón que tenía el foco se va con ella: el foco caería en
  // <body> y quien usa teclado o lector perdería su lugar justo en el toque
  // que cierra. Pasa al aviso «Respondido», que sigue en la página y dice a
  // dónde fue la respuesta. Solo con una respuesta NUEVA de esta visita y si
  // el foco se perdió: al volver a la pantalla no se le quita a nadie.
  const aviso = useRef<HTMLParagraphElement>(null)
  const avisados = useRef<Set<string> | null>(null)
  const claveRecien = recien.map(p => p.id).join('|')
  useEffect(() => {
    const ids = claveRecien ? claveRecien.split('|') : []
    const antes = avisados.current
    avisados.current = new Set(ids)
    if (!antes || !ids.some(id => !antes.has(id))) return
    const foco = document.activeElement
    if (!foco || foco === document.body || !foco.isConnected) aviso.current?.focus()
  }, [claveRecien])
  // Primero las fallas que esperan el análisis de confiabilidad.
  const sinAnalisis = declaradas.filter(p => p.causa.parte && !analisis[p.id])
  const declaradasEnOrden = [...sinAnalisis, ...declaradas.filter(p => !sinAnalisis.includes(p))]
  const parados = pendientes.filter(p => !p.fin)
  const pct = (v: number) => (lb.diferido > 0 ? (v / lb.diferido) * 100 : 0)
  const partesPendientes = pendientes.filter(p => p.sobre === 'bomba').length
  // Quien opera llega a responder: lo pendiente va primero.
  const opera = rol.nivel === 'operacion'

  const cabecera = (
      <Tip titulo="Identificación del período"
        pista="Cuánto del diferido tiene causa probada por una señal, cuánto declaró un operario y cuánto falta."
        filas={[['Por señal', `${n0(lb.identificado)} bbl · ${n1(pct(lb.identificado))} %`],
          ['Declarado', `${n0(lb.declarado)} bbl · ${n1(pct(lb.declarado))} %`],
          ['Sin identificar', `${n0(lb.pendiente)} bbl · ${n1(pct(lb.pendiente))} %`], ['Período', rango.nombre]]}
        className="mb-2.5 grid gap-x-6 gap-y-3 rounded border border-[var(--linea)] bg-[var(--panel)] p-4 shadow-[var(--sombra)] [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
        <span>
          <small className="block text-[10.5px] text-[var(--tinta3)]">Causa del cierre probada por señal · {rango.nombre}</small>
          <b className="tabular block text-[30px] leading-none">{n1(pct(lb.identificado))} %</b>
          <small className="block text-[10.5px] text-[var(--tinta2)]">{n0(lb.identificado)} de {n0(lb.diferido)} bbl</small>
        </span>
        <span>
          <small className="block text-[10.5px] text-[var(--tinta3)]">Causa del cierre declarada por operarios</small>
          <b className="tabular block text-[22px] leading-tight">{n1(pct(lb.declarado))} %</b>
          {/* Lo que falta también a la vista: en el recuadro flotante solo lo alcanzaba el ratón. */}
          <small className="block text-[10.5px] text-[var(--tinta2)]">{n0(lb.declarado)} bbl · sin identificar {n0(lb.pendiente)} bbl ({n1(pct(lb.pendiente))} %)</small>
        </span>
        <span>
          <small className="block text-[10.5px] text-[var(--tinta3)]">Por identificar · toda la historia</small>
          <b className="tabular flex items-center gap-1.5 text-[22px] leading-tight">
            {parados.length > 0 && <MarcaPrioridad s={2} tamano={15} />}{pendientes.length}
          </b>
          <small className="block text-[10.5px] text-[var(--tinta2)]">{plural(pendientes.length - partesPendientes, 'causa de pozo', 'causas de pozo')} · {plural(partesPendientes, 'parte de bomba', 'partes de bomba')} · {plural(parados.length, 'equipo esperando', 'equipos esperando')} para arrancar</small>
        </span>
        <span>
          <small className="block text-[10.5px] text-[var(--tinta3)]">No conformidades</small>
          <b className="tabular flex items-center gap-1.5 text-[22px] leading-tight">
            {noConformes.length > 0 && <MarcaPrioridad s={3} tamano={14} />}{noConformes.length}
          </b>
          <small className="block text-[10.5px] text-[var(--tinta2)]">arrancaron sin identificar el daño</small>
        </span>
      </Tip>
  )

  return (
    <>
      {!opera && cabecera}

      <div className="mb-2.5 rounded border border-[var(--linea)] bg-[var(--panel)] p-3 text-[12px] shadow-[var(--sombra)]">
        <b>Regla de operación:</b> un pozo o una bomba que paró sin causa identificable por su señal
        no se arranca hasta que quien lo revise registre aquí qué se dañó. TRIM no escribe en el PLC
        ni bloquea el arranque: la regla es de procedimiento. Si arranca antes, la parada queda como
        no conformidad, con la hora del PLC.
      </div>

      <Panel className="mb-2.5" titulo="POR IDENTIFICAR" extra={`${pendientes.length} · primero lo que sigue parado`}>
        <Lectura>
          Cada una trae lo que dijeron sus señales y por qué no alcanzó. En una bomba, la parte que
          estaba fuera de límite al parar aparece como sospechosa: es una pista, no una respuesta.
        </Lectura>
        {recien.length > 0 && (
          <p ref={aviso} tabIndex={-1} role="status" className="mb-2 rounded-sm border border-[var(--linea2)] bg-[var(--panel2)] px-2 py-1.5 text-[11.5px] text-[var(--tinta2)]">
            Respondido: {recien.map(p => `${p.equipo} (${p.causa.declarado!.canal === 'whatsapp' ? 'por WhatsApp' : 'en pantalla'}, ${fechaHora(new Date(p.causa.declarado!.hora)).replace(/^.*?, /, '')})`).join(' · ')}. Pasó a «Declaradas», más abajo.
          </p>
        )}
        {pendientes.length === 0 && <p className="text-[12px] text-[var(--tinta2)]">Ninguna parada espera identificación.</p>}
        {pendientes.map(p => <Tarjeta key={p.id} p={p} global={ambito.global} puede={puede} hilo={hilo(p)} />)}
      </Panel>

      {opera && cabecera}

      <Panel className="mb-2.5" titulo="NO CONFORMIDADES" extra="arrancaron sin identificar el daño">
        {noConformes.length === 0 && <p className="text-[12px] text-[var(--tinta2)]">Ninguna.</p>}
        {noConformes.map(p => <Tarjeta key={p.id} p={p} global={ambito.global} puede={puede} hilo={hilo(p)} />)}
      </Panel>

      <Panel titulo="DECLARADAS" extra={`${plural(declaradas.length, 'respuesta de operario', 'respuestas de operarios')}${sinAnalisis.length ? ` · ${sinAnalisis.length} sin análisis` : ''}`}>
        <Lectura>
          Lo que respondió la gente de campo. Entra al libro como «declarado», separado de lo que
          probó una señal, y se puede auditar: quién, cuándo y si fue antes o después de arrancar.
        </Lectura>
        {declaradas.length === 0 && <p className="text-[12px] text-[var(--tinta2)]">Ninguna todavía.</p>}
        {declaradasEnOrden.map(p => <Declarada key={p.id} p={p} global={ambito.global} />)}
      </Panel>
    </>
  )
}

/** Una parada por identificar: qué dijeron las señales, el formulario para
 *  decir qué se dañó (parte y lo que se vio, del catálogo de la clase de
 *  equipo) y el hilo de WhatsApp por el que también se responde. */
function Tarjeta({ p, global, puede, hilo }: { p: Pregunta; global: boolean; puede: boolean; hilo: Mensaje[] }) {
  const persona = usePersona(); const responder = useApp(s => s.responder), abrirEquipo = useApp(s => s.abrirEquipo), setCampo = useApp(s => s.setCampo)
  const [texto, setTexto] = useState('')
  const [parte, setParte] = useState<ParteId | ''>('')
  const [modo, setModo] = useState('')
  const [otraDelPozo, setOtraDelPozo] = useState(false)
  const [error, setError] = useState('')
  // El catálogo de la clase (bomba de la línea o electrosumergible; un pozo sin
  // ella no tiene partes), las causas que sugiere la evidencia (en pantalla y
  // con la parada abierta, también las lecturas de hoy) y la parte que hoy está
  // fuera de límite: todo del servidor, en un pedido.
  const { catalogo: cat, sugeridas, sospechosa } = useOpcionesRespuesta(p)
  const esp = cat?.clase === 'bomba-electrosumergible'
  const conPartes = !!cat && !otraDelPozo
  const parteSel = cat?.partes.find(x => x.id === parte)
  const deLaSenal = !!sugeridas?.opciones.some(o => o.fuente === 'senal')
  const horas = horasEntre(p.inicio, p.fin ?? AHORA)
  const escoger = (id: ParteId | '') => { setParte(id); setModo(''); setError('') }

  // El store responde con las reglas del servidor (403, 409 si alguien ya
  // respondió, 422): lo que rechace se dice aquí, no se pierde en silencio.
  const enviarRespuesta = async (r: { texto: string; parte?: ParteId; modo?: string }) => {
    const res = await responder({ evento: p.id, campoId: p.campoId, equipo: p.equipo, ...r })
    if (!res.ok) setError(res.error)
  }
  const enviar = () => {
    if (conPartes) {
      if (!parteSel) return setError(esp ? 'Diga qué parte de la electrosumergible se dañó, o que no fue ella.' : 'Diga qué parte de la bomba se dañó.')
      if (!modo) return setError('Diga qué vio en esa parte.')
      if (modo === MODO_OTRO && !alcanza(texto, TEXTO_LIBRE_MINIMO)) return setError('Escribió «Otra cosa»: diga qué vio, con al menos una frase corta.')
      return void enviarRespuesta({ texto: texto.trim(), parte: parteSel.id, modo })
    }
    if (!alcanza(texto, TEXTO_LIBRE_MINIMO)) return setError('Escoja una de las causas o escriba qué encontró, con al menos una frase corta.')
    void enviarRespuesta({ texto: texto.trim() })
  }

  return (
    <div className="border-b border-[var(--linea2)] py-3 last:border-0">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
        <MarcaPrioridad s={p.arrancoSinIdentificar ? 3 : !p.fin ? 2 : 3} tamano={14} className="mt-[2px]" />
        <span className="min-w-0 flex-1">
          <button onClick={() => { setCampo(p.campoId); abrirEquipo(p.equipo) }} className="cursor-pointer text-left">
            <b className="text-[13px] underline-offset-2 hover:underline">{p.equipo}</b>
          </button>
          <span className="text-[11px] text-[var(--tinta3)]"> · {p.sobre === 'bomba' ? 'bomba de la línea' : 'pozo'}{global ? ` · ${campoPorId(p.campoId).nombre}` : ''}</span>
          <small className="block text-[11px] text-[var(--tinta2)]">
            Paró {fechaHora(p.inicio)} · {p.fin ? `arrancó ${fechaHora(p.fin)} (${fmtHoras(horas, true)})` : `sigue parado hace ${fmtHoras(horas, true)}`}
          </small>
        </span>
        <span className="flex flex-wrap gap-1">
          {!p.fin && <Chip tono="fuerte">no arrancar</Chip>}
          {p.arrancoSinIdentificar && <Chip tono="fuerte">no conformidad</Chip>}
          <Chip>{n0(p.bbl)} bbl</Chip>
        </span>
      </div>
      <div className="mt-2 grid gap-3 text-[11px] [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
        <div>
          <h5 className="font-cond mb-1 text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]">LO QUE DIJO LA SEÑAL</h5>
          <ul className="list-disc pl-4 text-[var(--tinta2)]">
            {p.causa.evidencia.map(e => <li key={e} className="font-mono text-[10.5px]">{e}</li>)}
          </ul>
          {sospechosa && (
            <p className="mt-1.5 text-[var(--tinta2)]">
              Sospechosa: <b className="text-[var(--tinta)]">{sospechosa.parte.nombre.toLowerCase()}</b>, porque {fraseParte(sospechosa)}.
            </p>
          )}
          {p.causa.declarado && (
            <p className="mt-1.5 text-[var(--tinta2)]">Respondido después de arrancar: «{p.causa.declarado.texto}» · {p.causa.declarado.por}.</p>
          )}
        </div>
        {puede && !p.causa.declarado && persona.sinAcceso ? (
          <Hueco>Nadie con acceso activo tiene este rol: la respuesta la da una persona con acceso, no un rol.</Hueco>
        ) : puede && !p.causa.declarado ? (
          <form className="grid gap-1.5" onSubmit={e => { e.preventDefault(); enviar() }}>
            <h5 className="font-cond text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]">
              {conPartes ? `QUÉ SE DAÑÓ EN ${esp ? 'LA ELECTROSUMERGIBLE' : 'LA BOMBA'} · LO RESPONDE QUIEN LA REVISÓ` : 'POR QUÉ PARÓ · LO RESPONDE QUIEN ESTUVO'}
            </h5>
            {conPartes ? (
              <>
                <span className="grid gap-1">
                  <label htmlFor={`parte-${p.id}`} className={PASO_CLS}>1 · Parte {esp ? 'de la electrosumergible' : 'de la bomba'}</label>
                  {sugeridas?.conEvidencia && (
                    <>
                      <small className="text-[10.5px] text-[var(--tinta2)]">{deLaSenal ? 'Lo que sugieren la señal y la historia del equipo' : 'Lo que más ha fallado en este equipo'} (una pista, no una respuesta)</small>
                      <span className="flex flex-wrap gap-1">
                        {sugeridas.opciones.filter(o => o.parte).map(o => (
                          <button type="button" key={o.clave} onClick={() => escoger(o.parte!)} aria-pressed={parte === o.parte}
                            className={cn(CHIP, 'text-left', parte === o.parte && SELECCION)}>
                            <b className="font-semibold">{o.texto}</b> <span className="text-[var(--tinta3)]">· {o.porque}</span>
                          </button>
                        ))}
                      </span>
                    </>
                  )}
                  <select id={`parte-${p.id}`} value={parte} onChange={e => escoger(e.target.value as ParteId | '')}
                    className="min-h-10 rounded border border-[var(--linea)] bg-[var(--panel)] px-2 py-1.5 text-[12px] sm:min-h-0">
                    <option value="">{sugeridas?.conEvidencia ? 'O escoja cualquier parte…' : 'Escoja la parte…'}</option>
                    {cat!.partes.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                  </select>
                  {esp && (
                    <button type="button" onClick={() => { setOtraDelPozo(true); escoger(''); setTexto('') }} className={cn(CHIP, 'justify-self-start')}>
                      {NO_FUE_ESP}
                    </button>
                  )}
                </span>
                {parteSel && (
                  <span className="grid gap-1">
                    <span className={PASO_CLS}>2 · Qué vio</span>
                    <span className="flex flex-wrap gap-1">
                      {modosDeParte(parteSel).map(m => (
                        <button type="button" key={m.codigo} onClick={() => { setModo(m.codigo); setError('') }} aria-pressed={modo === m.codigo}
                          className={cn(CHIP, modo === m.codigo && SELECCION)}>{nombreModo(m.codigo, parteSel.id)}</button>
                      ))}
                    </span>
                    <small className="text-[10px] text-[var(--tinta3)]">
                      Se registra en el catálogo como ítem «{parteSel.itemIso}»{modo ? <> · daño {modo} ({modoIso(modo)?.nombre.toLowerCase()})</> : ''} · ISO 14224.
                    </small>
                  </span>
                )}
              </>
            ) : (
              <>
                {esp && <button type="button" onClick={() => { setOtraDelPozo(false); setTexto('') }} className="min-h-10 justify-self-start text-[10.5px] text-[var(--tinta2)] underline underline-offset-2 sm:min-h-0">Volver a las partes de la electrosumergible</button>}
                <span className="flex flex-wrap gap-1">
                  {CAUSAS_POZO.map(f => (
                    <button type="button" key={f} onClick={() => { setTexto(f); setError('') }} aria-pressed={texto === f}
                      className={cn(CHIP, texto === f && SELECCION)}>{f}</button>
                  ))}
                </span>
              </>
            )}
            <label className="grid gap-0.5">
              <span className="text-[10.5px] text-[var(--tinta2)]">{!conPartes ? 'Qué encontró' : modo === MODO_OTRO ? 'Qué vio (obligatorio: escogió «Otra cosa»)' : 'Qué encontró (opcional)'}</span>
              <textarea value={texto} onChange={e => { setTexto(e.target.value); setError('') }} rows={2}
                placeholder={conPartes ? (esp ? 'Ej.: el motor dio a tierra al megger' : 'Ej.: sello con fuga por el lado de acople; se cambió') : 'Ej.: se cerró para cambiar la válvula de la cabeza'}
                className="resize-y rounded border border-[var(--linea)] bg-[var(--panel)] px-2 py-1.5 text-[12px]" />
            </label>
            {error && <p className="text-[11px] text-[var(--tinta)]" role="alert">{error}</p>}
            <Boton variante="principal" type="submit" className="min-h-10 sm:min-h-0">Registrar respuesta</Boton>
            <small className="text-[10px] text-[var(--tinta3)]">Queda como declarado por {persona.nombre}, con la hora del sistema.</small>
          </form>
        ) : !puede ? (
          <Hueco>Su rol no responde paradas. Lo hace el operador, el supervisor o mantenimiento.</Hueco>
        ) : null}
      </div>
      <HiloWhatsapp p={p} hilo={hilo} />
    </div>
  )
}

/** El rótulo de cada paso de la respuesta: se lee como instrucción, no como pie. */
const PASO_CLS = 'text-[12px] font-semibold text-[var(--tinta)]'

/** Botón de opción: en el teléfono, alto de dedo; la marcada, con el color de selección. */
const CHIP = 'min-h-10 cursor-pointer rounded-sm border border-[var(--linea)] px-1.5 py-0.5 text-[10.5px] hover:bg-[var(--panel2)] sm:min-h-0'
const SELECCION = 'border-acento bg-acento-f text-[var(--tinta)] shadow-[inset_0_0_0_1px_var(--acento)]'

/** Lo que dice un paso del hilo, en una palabra. */
const PASO: Record<string, string> = { parada: 'parado', cierre: 'pozos cerrándose', causa: 'pregunta', recordatorio: 'recordatorio', escalamiento: 'escalado' }

/** El hilo de WhatsApp de la parada en una línea (qué se mandó, a quién, y si
 *  respondieron), y a un clic el chat de quien recibió la pregunta, como lo ve
 *  en su teléfono: desde ahí se responde. */
function HiloWhatsapp({ p, hilo }: { p: Pregunta; hilo: Mensaje[] }) {
  const usuarios = useUsuarios(); const yo = usePersona()
  const [verChat, setVerChat] = useState(false)
  const r = p.causa.declarado
  const orden = [...hilo].reverse()
  const primero = orden.find(m => m.regla === 'causa' && !m.insistencia && !m.noEnviado)
  const nombre = (id: string) => usuarios.find(x => x.id === id)?.nombre ?? id
  // Un paso por hora y tipo, con todos los que lo recibieron.
  // Lo que no salió (un parámetro que Meta rechazaría) no cuenta como avisado: va aparte, con su motivo.
  const pasos = [...orden.reduce((mapa, m) => {
    const tipo = m.insistencia ?? m.regla, k = `${m.hora}|${tipo}`
    const x = mapa.get(k) ?? { hora: m.hora, rango: ORDEN_PASO[tipo], que: PASO[tipo] ?? m.regla, para: [] as string[], fallas: [] as Array<{ para: string; motivo: string }> }
    if (m.noEnviado) x.fallas.push({ para: nombre(m.para), motivo: m.noEnviado })
    else if (!x.para.includes(nombre(m.para))) x.para.push(nombre(m.para))
    return mapa.set(k, x)
  }, new Map<string, { hora: string; rango: number; que: string; para: string[]; fallas: Array<{ para: string; motivo: string }> }>()).values()]
    .sort((a, b) => new Date(a.hora).getTime() - new Date(b.hora).getTime() || a.rango - b.rango)
  const corta = (iso: string) => fechaHora(new Date(iso)).replace(/^.*?, /, '')

  // Si la pregunta se armó pero no salió, no es que nadie tenga WhatsApp: se muestra el hilo con su motivo.
  if (!primero && !orden.some(m => m.regla === 'causa' && m.noEnviado)) return (
    <p className="mt-2 text-[10.5px] text-[var(--tinta3)]">
      WhatsApp: nadie de este campo tiene número con las alertas encendidas; la pregunta está solo en esta pantalla.
    </p>
  )
  const persona = primero && usuarios.find(u => u.id === primero.para)

  return (
    <div className="mt-2.5 border-t border-dashed border-[var(--linea2)] pt-2 text-[11px]">
      <h5 className="font-cond mb-1 text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]">WHATSAPP · LO QUE MANDÓ TRIM</h5>
      <p className="text-[var(--tinta2)]">
        {/* En el teléfono, un paso por línea; en pantalla ancha, seguidos. */}
        {pasos.map((x, i) => <span key={`${x.hora}${x.que}`} className="block sm:inline">{i > 0 && <span className="hidden sm:inline"> → </span>}<span className="tabular">{corta(x.hora)}</span> {x.que}{x.para.length > 0 && ` (${x.para.join(', ')})`}<NoEnviado fallas={x.fallas} /></span>)}
        <span className="hidden sm:inline">{' · '}</span>{r?.canal === 'whatsapp'
          ? <b className="text-[var(--tinta)]">respondió {r.por} a las {corta(r.hora)}: «{r.texto}»</b>
          : r ? <span>respondido en pantalla</span> : <b className="text-[var(--tinta)]">sin respuesta</b>}
      </p>
      {persona && (
        <>
          <Boton className="mt-1 min-h-10 sm:min-h-0" onClick={() => setVerChat(!verChat)} aria-expanded={verChat}>
            {verChat ? 'Cerrar el chat' : persona.id === yo.id ? 'Ver mi chat de WhatsApp' : `Ver el chat de ${persona.nombre}`}
          </Boton>
          {verChat && <div className="mt-2"><Telefono p={p} hilo={hilo} persona={persona} /></div>}
        </>
      )}
    </div>
  )
}

/** El análisis de una falla declarada: mecanismo (ISO 14224 B.2) y causa raíz
 *  (B.3). La parte y lo que se vio los dijo quien abrió el equipo; esto lo
 *  completa confiabilidad o el jefe de mantenimiento. */
function AnalisisDeFalla({ evento, modo }: { evento: string; modo?: string }) {
  const rol = useRol(); const todos = useAnalisis(); const a = Object.hasOwn(todos, evento) ? todos[evento] : undefined; const completar = useApp(s => s.completarAnalisis)
  // Corregir no borra: lo reemplazado se sigue viendo, con quién lo había dicho.
  const anteriores = useAnalisisAnteriores(evento)
  const [abierto, setAbierto] = useState(false)
  // El formulario arranca con el mecanismo que suele tener lo que se vio: un punto de partida.
  const [mecanismo, setMecanismo] = useState(() => (modo && MECANISMO_SUGERIDO[modo]) || '')
  const [causaRaiz, setCausaRaiz] = useState('')
  const [nota, setNota] = useState('')
  const [error, setError] = useState('')
  const puede = rol.puede['causa:completar']

  if (a && !abierto) return (
    <small className="mt-0.5 block text-[10.5px] text-[var(--tinta2)]">
      Análisis: {a.mecanismo} {mecanismoIso(a.mecanismo)?.nombre.toLowerCase()} · causa raíz: {CAUSAS_RAIZ.find(c => c.codigo === a.causaRaiz)?.nombre.toLowerCase()}
      {a.nota ? ` · «${a.nota}»` : ''} · {a.por}
      {puede && <button type="button" onClick={() => { setMecanismo(a.mecanismo); setCausaRaiz(a.causaRaiz); setNota(a.nota ?? ''); setAbierto(true) }}
        className="ml-1.5 min-h-10 cursor-pointer underline underline-offset-2 sm:min-h-0">Corregir</button>}
      {anteriores?.map((x, i) => (
        <span key={i} className="block text-[var(--tinta3)]">
          Antes: {x.mecanismo} · causa raíz {x.causaRaiz}{x.nota ? ` · «${x.nota}»` : ''} · {x.por} · {fechaHora(new Date(x.hora))}
        </span>
      ))}
    </small>
  )
  if (!puede) return <small className="mt-0.5 block text-[10.5px] text-[var(--tinta3)]">Análisis pendiente: mecanismo y causa raíz los completa confiabilidad o el jefe de mantenimiento.</small>
  if (!abierto) return <Boton variante="chico" className="mt-1 min-h-10 sm:min-h-0" onClick={() => setAbierto(true)}>Completar el análisis</Boton>
  return (
    <form className="mt-1.5 grid gap-1.5 rounded border border-[var(--linea2)] bg-[var(--panel2)] p-2"
      onSubmit={async e => { e.preventDefault(); const r = await completar(evento, { mecanismo, causaRaiz, nota }); if (!r.ok) setError(r.error); else setAbierto(false) }}>
      <div className="grid gap-1.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr))]">
        <label className="grid gap-0.5"><span className="text-[10.5px] text-[var(--tinta2)]">Mecanismo · ISO 14224 B.2</span>
          <select value={mecanismo} onChange={e => { setMecanismo(e.target.value); setError('') }} className="min-h-10 rounded border border-[var(--linea)] bg-[var(--panel)] px-2 py-1 text-[12px] sm:min-h-0">
            <option value="">Escoja el mecanismo…</option>
            {MECANISMOS_POR_FAMILIA.map(f => (
              <optgroup key={f.familia} label={f.familia}>
                {f.mecanismos.map(m => <option key={m.codigo} value={m.codigo}>{m.codigo} · {m.nombre}</option>)}
              </optgroup>
            ))}
          </select></label>
        <label className="grid gap-0.5"><span className="text-[10.5px] text-[var(--tinta2)]">Causa raíz · B.3</span>
          <select value={causaRaiz} onChange={e => { setCausaRaiz(e.target.value); setError('') }} className="min-h-10 rounded border border-[var(--linea)] bg-[var(--panel)] px-2 py-1 text-[12px] sm:min-h-0">
            <option value="">Escoja la causa…</option>
            {CAUSAS_RAIZ.map(c => <option key={c.codigo} value={c.codigo}>{c.codigo} · {c.nombre}</option>)}
          </select></label>
      </div>
      <label className="grid gap-0.5"><span className="text-[10.5px] text-[var(--tinta2)]">Nota (opcional)</span>
        <input value={nota} onChange={e => setNota(e.target.value)} className="min-h-10 rounded border border-[var(--linea)] bg-[var(--panel)] px-2 py-1 text-[12px] sm:min-h-0"
          placeholder="Ej.: arena en la succión; el filtro no se cambió a tiempo" /></label>
      {error && <p className="text-[11px] text-[var(--tinta)]" role="alert">{error}</p>}
      <span className="flex flex-wrap gap-1.5">
        <Boton variante="principal" type="submit" className="min-h-10 sm:min-h-0">Guardar el análisis</Boton>
        <Boton type="button" className="min-h-10 sm:min-h-0" onClick={() => setAbierto(false)}>Cancelar</Boton>
      </span>
    </form>
  )
}

/** Una respuesta registrada, dicha una sola vez: la parte y lo que vio (o la
 *  causa del pozo), y el texto de quien respondió solo si escribió algo más. */
function Declarada({ p, global }: { p: Pregunta; global: boolean }) {
  const r = p.causa.declarado!
  const cat = pedirCatalogoDeDanos(p.campoId, p.equipo)
  const parte = p.causa.parte ? cat?.partes.find(x => x.id === p.causa.parte) : undefined
  const nombreParte = parte?.nombre ?? (p.causa.parte ? NOMBRE_PARTE[p.causa.parte] : undefined)
  const vio = r.modo ? nombreModo(r.modo, p.causa.parte).toLowerCase() : undefined
  const generado = !!nombreParte && !!vio && r.texto === `${nombreParte}: ${vio}`
  // En la electrosumergible, lo que arrancó en menos de un día es un disparo: no cuenta como falla.
  const horas = p.fin ? horasEntre(p.inicio, p.fin) : undefined
  const disparo = cat?.clase === 'bomba-electrosumergible' && !!p.causa.parte && horas !== undefined && horas < 24
  return (
    <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-[var(--linea2)] py-2 text-[11.5px] last:border-0">
      <span className="min-w-0">
        <b>{p.equipo}</b> <span className="text-[var(--tinta3)]">· {global ? `${campoPorId(p.campoId).nombre} · ` : ''}{fechaHora(p.inicio)}</span>
        <span className="block text-[var(--tinta)]">
          {nombreParte ? <><b className="font-semibold">{nombreParte}</b>{vio ? ` · ${vio}` : ''}{!generado ? ` · «${r.texto}»` : ''}</> : <>«{r.texto}»</>}
        </span>
        <small className="block text-[10.5px] text-[var(--tinta3)]">{r.por} · {fechaHora(new Date(r.hora))}{r.canal === 'whatsapp' ? ' · por WhatsApp' : ''}{!p.causa.parte && p.sobre === 'bomba' ? ' · sin parte' : ''}</small>
        {disparo && <small className="block text-[10.5px] text-[var(--tinta2)]">Arrancó en {fmtHoras(horas!, true)}: cuenta como disparo, no como falla de la electrosumergible.</small>}
        {p.causa.parte && <AnalisisDeFalla evento={p.id} modo={r.modo} />}
      </span>
      <b className="tabular text-right">{n0(p.bbl)} <small className="font-normal text-[var(--tinta3)]">bbl</small></b>
    </div>
  )
}
