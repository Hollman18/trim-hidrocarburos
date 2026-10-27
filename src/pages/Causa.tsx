import { useEffect, useRef, useState } from 'react'
import { useApp, useAmbito, useRol, useRango, usePersona } from '@/app/store'
import { useLibro, usePreguntas, useCtx, useOpcionesRespuesta, contarPorIdentificar } from '@/shared/api/diferidos'
import { useAnalisis, useAnalisisAnteriores } from '@/shared/api/sesion'
import { TEXTO_LIBRE_MINIMO, alcanza } from '@/entities/reglas'
import { pedirCatalogoDeDanos } from '@/shared/api/equipos'
import { useCondiciones, type CondicionDeEquipo } from '@/shared/api/condiciones'
import { FAMILIA } from '@/shared/api/plantaViva'
import { MarcaDeEquipo } from '@/widgets/hoy/comun'
import { Bloqueo } from '@/widgets/hoy/piezas'
import { CAUSAS_POZO, NO_FUE_ESP_CORTO } from '@/entities/causas-sugeridas'
import { ArbolIdentificar } from '@/widgets/arbol/ArbolIdentificar'
// H2 (K1): la pregunta con el entero de su parada en el reparto del campo (la de Hoy).
import type { PreguntaConEntero as Pregunta } from '@/shared/api/diferidos'
import { NOMBRE_PARTE, type ParteId } from '@/entities/partes'
import { modosDeParte, nombreModo, MECANISMOS_POR_FAMILIA, MECANISMO_SUGERIDO, MODO_OTRO } from '@/entities/catalogo'
import { modo as modoIso, mecanismo as mecanismoIso, CAUSAS_RAIZ } from '@/entities/iso14224'
import { campoPorId } from '@/entities/campos'
import { fechaHora, horasEntre, AHORA } from '@/entities/reloj'
import { fraseParte, fmtHoras } from '@/widgets/bombas/comun'
import { Panel, Boton, Chip } from '@/shared/ui/primitivas'
import { Lectura } from '@/shared/ui/Lectura'
import { Tip } from '@/shared/ui/Tip'
import { Info } from '@/shared/ui/Info'
import { VerMas } from '@/shared/ui/VerMas'
import { useVerMas } from '@/shared/ui/listaCorta'
import { n0, n1, plural } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { ROLES_QUE_CONTESTAN, causaParaSalir } from '@/shared/api/arbol'
import { rolDeQuien } from '@/entities/causa-senal'
import { DichoEnPapel } from '@/shared/ui/DichoEnPapel'
import { puedeHacer } from '@/entities/tipos'
import { ChevronRight } from 'lucide-react'

/** Paradas por identificar: las que ninguna señal explica. Es el único lugar
 *  donde una persona escribe algo que entra al libro, y entra marcado como
 *  declarado.
 *
 *  Regla de operación: el equipo que paró sin causa identificable no se
 *  arranca hasta que se identifique el daño. TRIM no escribe en el PLC; el
 *  bloqueo es de procedimiento, y si arranca antes queda como no conformidad. */
/** La regla completa: en la pantalla queda «no arrancar» y lo esencial; el resto, en el ⓘ (y en el papel). */
const REGLA = 'Un pozo o una bomba que paró sin causa identificable por su señal no se arranca hasta que quien lo revise registre aquí qué se dañó. TRIM no escribe en el PLC ni bloquea el arranque: la regla es de procedimiento. Si arranca antes, la parada queda como no conformidad, con la hora del PLC.'

export function Causa() {
  const ambito = useAmbito(); const rango = useRango(); const rol = useRol(); const persona = usePersona()
  const ids = ambito.campos.map(c => c.id)
  const lb = useLibro({ campos: ids, desde: rango.desde, hasta: rango.hasta })
  const preguntas = usePreguntas(ids)
  const puede = puedeHacer(rol.puede, 'causa:declarar')

  // «Por identificar» con la cuenta única (Turno, Mi trabajo, Mantenimiento):
  // las que piden respuesta, hayan arrancado o no. Abajo van en dos paneles:
  // las que siguen paradas («no arrancar») y las que arrancaron sin
  // identificar (no conformidades, con las que se respondieron tarde).
  const pi = contarPorIdentificar(preguntas)
  // H3: la marca de un equipo es la de la franja, la misma en todas partes: la urgencia de identificar va en el texto «no arrancar».
  const condicion = useCondiciones(ids)
  const marca = (p: Pregunta) => condicion(p.campoId, p.equipo)
  // P-causa-1 (X4 §3.6, «se esconde»): una parada abierta a la vez; las demás, en una fila con «›».
  const [abierta, setAbierta] = useState<string | null>(null)
  const piden = preguntas.filter(p => p.pide)
  const pendientes = piden.filter(p => !p.arrancoSinIdentificar)
  const noConformes = preguntas.filter(p => p.arrancoSinIdentificar)
  const declaradas = preguntas.filter(p => !p.pide && p.causa.declarado)
  const ctx = useCtx(); const analisis = useAnalisis()
  // Las respondidas en esta sesión: el aviso de que pasaron a «Declaradas».
  const recien = declaradas.filter(p => ctx.respuestas[p.id])
  // Responder desmonta la
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
  const partesPendientes = piden.filter(p => p.sobre === 'bomba').length
  // Quien opera llega a responder: lo pendiente va primero.
  const opera = rol.nivel === 'operacion'
  // El operador y el técnico: UNA lista «POR CONTESTAR», una tarjeta por parada (B-02; U1 §2.7).
  const deCampo = !ROLES_QUE_CONTESTAN.revisa.includes(rol.id)
  // Quien no puede responder (o el rol sin nadie con acceso) lo lee una vez, aquí, y no en cada tarjeta.
  const responde = puede && !persona.sinAcceso
  const hayTarjetas = pendientes.length + noConformes.length > 0
  const porResponder = pendientes.length + noConformes.filter(p => !p.causa.declarado).length > 0
  // Las que esperan el análisis son trabajo pendiente: nunca quedan detrás de
  // «ver N más». Tampoco lo que en esta visita estuvo por analizar o se acaba
  // de responder: al guardarlo baja a su lugar por fecha, y no puede irse de la
  // pantalla justo cuando se guardó.
  // (Se ajusta durante el render, como recomienda React: converge en una vuelta.)
  const [vistas, setVistas] = useState<ReadonlySet<string>>(() => new Set())
  const nuevasVistas = [...sinAnalisis, ...recien].filter(p => !vistas.has(p.id))
  if (nuevasVistas.length) setVistas(new Set([...vistas, ...nuevasVistas.map(p => p.id)]))
  const listaDeclaradas = useVerMas(declaradasEnOrden, { prioridad: p => (sinAnalisis.includes(p) || recien.includes(p) || vistas.has(p.id) ? 1 : 3) })

  const cifra = 'tabular flex items-center gap-1.5 text-[22px] leading-tight'
  const rotulo = 'block text-[13px] text-[var(--tinta3)]'
  const apoyo = 'block text-[13px] text-[var(--tinta2)]'
  const cabecera = (
      <Tip titulo="Identificación del período"
        pista="Cuánto del diferido tiene causa probada por una señal, cuánto declaró un operario y cuánto falta."
        filas={[['Por señal', `${n0(lb.identificado)} bbl · ${n1(pct(lb.identificado))} %`],
          ['Declarado', `${n0(lb.declarado)} bbl · ${n1(pct(lb.declarado))} %`],
          ['Sin identificar', `${n0(lb.pendiente)} bbl · ${n1(pct(lb.pendiente))} %`], ['Período', rango.nombre]]}
        className="mb-2.5 grid gap-x-6 gap-y-3 rounded border border-[var(--linea)] bg-[var(--panel)] p-4 shadow-[var(--sombra)] [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]">
        <span>
          <b className="tabular block text-[30px] leading-none">{n1(pct(lb.identificado))} %</b>
          <small className={rotulo}>causa probada por señal</small>
          <small className={apoyo}>{n0(lb.identificado)} de {n0(lb.diferido)} bbl diferidos</small>
        </span>
        <span>
          <b className={cifra}>{n1(pct(lb.declarado))} %</b>
          <small className={rotulo}>causa declarada</small>
          {/* Lo que falta también a la vista: en el recuadro flotante solo lo alcanzaba el ratón. */}
          <small className={apoyo}>{n0(lb.declarado)} bbl · sin identificar {n0(lb.pendiente)} bbl ({n1(pct(lb.pendiente))} %)</small>
        </span>
        <span>
          {/* Un total no es una alarma: sin marca de color (B-40). La marca va en cada equipo, abajo. */}
          <b className={cifra}>{pi.porIdentificar}</b>
          {/* Esta cifra no es del período: cuenta todo lo que sigue sin identificar. */}
          <small className={rotulo}>por identificar · histórico</small>
          <small className={apoyo}>{plural(pi.porIdentificar - partesPendientes, 'pozo', 'pozos')} · {plural(partesPendientes, 'bomba', 'bombas')} · {parados.length} sin arrancar</small>
        </span>
        <span>
          <b className={cifra}>{noConformes.length}</b>
          <small className={rotulo}>no conformidades</small>
          <small className={apoyo}>arrancaron sin identificar</small>
        </span>
      </Tip>
  )

  // La primera que pide respuesta abre sola; tocar otra la abre y cierra la de antes.
  const primeraAbierta = [...pendientes, ...noConformes.filter(x => !x.causa.declarado)][0]?.id
  const abiertaId = abierta ?? primeraAbierta
  const tarjeta = (p: Pregunta) => <Tarjeta key={p.id} p={p} global={ambito.global} responde={responde} cond={marca(p)}
    abierta={abiertaId === p.id} onAbrir={() => setAbierta(p.id)} />
  const avisoRespondido = recien.length > 0 && (
    <p ref={aviso} tabIndex={-1} role="status" className="mb-2 rounded-sm border border-[var(--linea2)] bg-[var(--panel2)] px-2 py-1.5 text-[14px] text-[var(--tinta2)]">
      Respondido: {recien.map(p => `${p.equipo} (${fechaHora(new Date(p.causa.declarado!.hora)).replace(/^.*?, /, '')})`).join(' · ')}. Pasó a «Declaradas».
    </p>
  )
  // UI-05: la misma franja «No arrancar» de Hoy (X5 §5.6): en tinta, con borde de 2 px y el ⊘.
  const regla = (
    <div className="mb-2.5 grid gap-1.5">
      <Bloqueo b={{ texto: 'No arrancar hasta identificar el daño', sub: 'Si arranca antes, queda como no conformidad.' }} />
      <span className="flex flex-wrap items-center gap-x-1.5 px-1 text-[14px] text-[var(--tinta2)]">La regla completa <Info titulo="Regla de operación" texto={REGLA} /></span>
      {hayTarjetas && !puede && <span className="basis-full text-[13px] text-[var(--tinta2)]">Su rol no responde paradas: lo hace operación o mantenimiento.</span>}
      {porResponder && puede && persona.sinAcceso && (
        <span className="flex basis-full flex-wrap items-center gap-x-1 text-[13px] text-[var(--tinta2)]">
          Nadie con acceso activo tiene este rol.
          <Info titulo="Sin persona con acceso" texto="La respuesta la da una persona con acceso, no un rol." />
        </span>
      )}
    </div>
  )
  const declaradasPanel = (
    <Panel titulo="Declaradas" extra={<>{declaradas.length}<span className="sr-only"> {declaradas.length === 1 ? 'declarada' : 'declaradas'}</span>{sinAnalisis.length ? ` · ${sinAnalisis.length} sin análisis` : ''}</>}>
      <Lectura>
        Lo que respondió la gente de campo. Entra al libro como «declarado», separado de lo que
        probó una señal, y se puede auditar: quién, cuándo y si fue antes o después de arrancar.
        Primero las que esperan el análisis de confiabilidad.
      </Lectura>
      {declaradas.length === 0 && <p className="text-[14px] text-[var(--tinta2)]">Ninguna todavía.</p>}
      {listaDeclaradas.visibles.map(p => <Declarada key={p.id} p={p} global={ambito.global} />)}
      {listaDeclaradas.resto.length > 0 && <div className="solo-impresion">{listaDeclaradas.resto.map(p => <Declarada key={p.id} p={p} global={ambito.global} />)}</div>}
      <VerMas ocultas={listaDeclaradas.ocultas} abierto={listaDeclaradas.abierto} onAlternar={listaDeclaradas.alternar} />
    </Panel>
  )

  // El operador y el técnico: una sola lista, lo que pregunta el libro primero
  // (la regla de «no arrancar» es del libro) y después lo que pregunta el árbol,
  // sin repetir una parada (B-02). Los indicadores del período, al final y plegados (B-54).
  if (deCampo) {
    const delLibro = [...pendientes, ...noConformes.filter(p => !p.causa.declarado)]
    return (
      <>
        {regla}
        {/* Otro rol es otra lente: lo que estaba abierto no pasa de un rol a otro. */}
        <ArbolIdentificar key={rol.id} campos={ids} desde={rango.desde} hasta={rango.hasta} global={ambito.global} periodo={rango.nombre}
          nAntes={delLibro.length} excluir={new Set(delLibro.map(p => p.id))}
          antes={<>{avisoRespondido}{delLibro.map(tarjeta)}</>} />
        {declaradasPanel}
        <details className="mt-2.5 rounded border border-[var(--linea)] bg-[var(--panel)] shadow-[var(--sombra)] print:open:block" data-indicadores>
          <summary className="flex min-h-12 cursor-pointer items-center px-3 text-[14px] text-[var(--tinta2)] sm:min-h-9">Cómo va la identificación del período</summary>
          <div className="px-3 pb-3">{cabecera}</div>
        </details>
      </>
    )
  }

  return (
    <>
      {!opera && cabecera}

      {/* La regla de operación: «no arrancar» a la vista; el procedimiento completo, en el ⓘ. */}
      {regla}

      {/* Las que siguen paradas; las que ya arrancaron sin identificar van en «No conformidades». */}
      <Panel className="mb-2.5" titulo="Por identificar · sin arrancar" extra={<>{pendientes.length}<span className="sr-only"> sin arrancar</span></>}>
        <Lectura>
          Cada una trae lo que dijo su señal; el ⓘ junto a «señal» dice por qué no alcanzó. Responde quien
          revisó el equipo o estuvo en el pozo. Las pistas (la parte que estaba fuera de límite al parar, o
          las que más han fallado en ese equipo) son una pista, no una respuesta.
        </Lectura>
        {avisoRespondido}
        {pendientes.length === 0 && <p className="text-[14px] text-[var(--tinta2)]">Ninguna.</p>}
        {pendientes.map(tarjeta)}
      </Panel>

      {opera && cabecera}

      {/* La cadena de 6 pasos de cada parada para la ANH (U1 §2; U2 §4): después
          de lo que no se arranca, que es una instrucción de seguridad. */}
      {/* Otro rol es otra lente: lo que estaba abierto (una hoja de corregir) no pasa de un rol a otro. */}
      <ArbolIdentificar key={rol.id} campos={ids} desde={rango.desde} hasta={rango.hasta} global={ambito.global} periodo={rango.nombre} />

      {/* «Arrancaron sin identificar» ya lo dice la cifra de arriba; aquí, cuántas. */}
      <Panel className="mb-2.5" titulo="No conformidades" extra={<>{noConformes.length}<span className="sr-only"> {noConformes.length === 1 ? 'no conformidad' : 'no conformidades'}</span></>}>
        {noConformes.length === 0 && <p className="text-[14px] text-[var(--tinta2)]">Ninguna.</p>}
        {noConformes.map(tarjeta)}
      </Panel>

      {declaradasPanel}
    </>
  )
}

/** Una parada por identificar: qué dijeron las señales, el formulario para
 *  decir qué se dañó (parte y lo que se vio, del catálogo de la clase de
 *  equipo). */
function Tarjeta({ p, global, responde, cond, abierta, onAbrir }: {
  p: Pregunta; global: boolean; responde: boolean
  /** La condición del equipo, la de la franja (H3): la misma en todas partes. */
  cond?: CondicionDeEquipo
  /** P-causa-1: abierta, con su formulario; cerrada, una fila con «›». */
  abierta: boolean; onAbrir: () => void
}) {
  const persona = usePersona(); const rolActual = useRol(); const responder = useApp(s => s.responder), abrirEquipo = useApp(s => s.abrirEquipo), setCampo = useApp(s => s.setCampo)
  const [texto, setTexto] = useState('')
  const [parte, setParte] = useState<ParteId | ''>('')
  const [modo, setModo] = useState('')
  const [otraDelPozo, setOtraDelPozo] = useState(false)
  const [error, setError] = useState('')
  const [verSenal, setVerSenal] = useState(false)
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

  // Por qué ninguna señal alcanzó («Sin primera alarma y sin firma…»): explica,
  // no es una lectura, y va al ⓘ de «señal». Solo si el motor lo manda con
  // nombre (`causa.porQueNo`); nunca se adivina por su lugar en `evidencia`.
  // Sin ese dato, la evidencia sale completa, como antes.
  const porQueNo = 'porQueNo' in p.causa && typeof p.causa.porQueNo === 'string' && p.causa.porQueNo ? p.causa.porQueNo : undefined
  const lecturas = porQueNo ? p.causa.evidencia.filter(e => e !== porQueNo) : p.causa.evidencia
  // En el papel, la evidencia con la persona por su rol (D2): «Declarado por el operador de campo».
  const salir = causaParaSalir(p.causa).evidencia
  const enPapel = (e: string) => salir[p.causa.evidencia.indexOf(e)] ?? e

  const familia = p.sobre === 'bomba' ? FAMILIA[p.causa.tipo] : 'pozo'
  const cuerpo = (
    <div className="border-b border-[var(--linea2)] py-3 last:border-0" data-parada={p.id} data-abierta={abierta || undefined}>
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
        <span className="mt-[2px]"><MarcaDeEquipo c={cond} tamano={14} /></span>
        <span className="min-w-0 flex-1">
          <button onClick={() => { setCampo(p.campoId); abrirEquipo(p.equipo) }} className="cursor-pointer text-left">
            <b className="text-[15px] underline-offset-2 hover:underline">{p.equipo}</b>
          </button>
          <span className="text-[13px] text-[var(--tinta3)]"> · {familia}{global ? ` · ${campoPorId(p.campoId).nombre}` : ''}</span>
          {/* Sigue parado: lo dice «no arrancar»; aquí, desde cuándo. */}
          <small className="block text-[13px] text-[var(--tinta2)]">
            Paró {fechaHora(p.inicio)} · {p.fin ? `arrancó ${fechaHora(p.fin)} (${fmtHoras(horas, true)})` : `hace ${fmtHoras(horas, true)}`}
          </small>
        </span>
        {/* «no conformidad» no va como etiqueta: la tarjeta ya está en ese panel. */}
        <span className="flex flex-wrap gap-1">
          {!p.fin && <Chip tono="fuerte">no arrancar</Chip>}
          {p.arrancoSinIdentificar && <Chip>arrancó sin identificar</Chip>}
          <Chip>{n0(p.entero ?? p.bbl)} bbl</Chip>
        </span>
      </div>
      {/* Con la señal plegada, el formulario va a todo el ancho; abierta, al lado (P-causa-1). */}
      <div className={cn('mt-2 grid gap-3 text-[13px]', verSenal && '[grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr))] print:[grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr))]')}>
        <div>
          {/* La señal, detrás de «Ver la señal» (P-causa-1); la parte sospechosa queda a la vista: es una pista para contestar. */}
          <div className="mb-1 flex flex-wrap items-center gap-x-1">
            <button type="button" onClick={() => setVerSenal(v => !v)} aria-expanded={verSenal}
              className="toque inline-flex cursor-pointer items-center gap-0.5 text-[15px] font-semibold text-[var(--tinta)] hover:underline">
              {verSenal ? 'La señal' : 'Ver la señal'}<ChevronRight aria-hidden className={cn('size-4 text-[var(--tinta2)] transition-transform duration-[120ms]', verSenal && 'rotate-90')} />
            </button>
            {porQueNo && <Info rotulo="no alcanzó" titulo="Por qué no alcanzó la señal" texto={porQueNo} />}
          </div>
          <ul className={cn('list-disc pl-4 text-[var(--tinta2)]', !verSenal && 'hidden print:block')}>
            {lecturas.map(e => <li key={e} className="text-[14px]">{enPapel(e) === e ? e : <DichoEnPapel papel={enPapel(e)}>{e}</DichoEnPapel>}</li>)}
          </ul>
          {/* La parte sospechosa es una pista: queda a la vista, con la variable que la delata. */}
          {sospechosa && (
            <p className="mt-1.5 text-[var(--tinta2)]">
              Sospechosa: <b className="text-[var(--tinta)]">{sospechosa.parte.nombre.toLowerCase()}</b> · {fraseParte(sospechosa)}
            </p>
          )}
          {/* Quién lo declaró ya está en la evidencia («Declarado por …»). */}
          {p.causa.declarado && (
            <p className="mt-1.5 text-[var(--tinta2)]">Respondido tras arrancar: <DichoEnPapel papel={`lo contestó ${rolDeQuien(p.causa.declarado.por)}`}>«{p.causa.declarado.texto}»</DichoEnPapel></p>
          )}
        </div>
        {responde && !p.causa.declarado && (
          <form className="grid gap-1.5" onSubmit={e => { e.preventDefault(); enviar() }}>
            <h3 className="text-[15px] font-semibold text-[var(--tinta)]">{conPartes ? 'Qué se dañó' : 'Por qué paró'}</h3>
            {conPartes ? (
              <>
                <span className="grid gap-1">
                  <label htmlFor={`parte-${p.id}`} className={PASO_CLS}>Parte {esp ? 'de la electrosumergible' : 'de la bomba'}</label>
                  {sugeridas?.conEvidencia && (
                    <>
                      {/* «Pista»: lo que sugiere, no lo que pasó. La fuente se dice porque no es lo mismo una señal que la historia. */}
                      <small className="text-[13px] text-[var(--tinta2)]">Pista · {deLaSenal ? 'señal e historia' : 'historia del equipo'}</small>
                      <span className="flex flex-wrap gap-1">
                        {sugeridas.opciones.filter(o => o.parte).map(o => (
                          <button type="button" key={o.clave} onClick={() => escoger(o.parte!)} aria-pressed={parte === o.parte}
                            className={cn(CHIP, 'text-left', parte === o.parte && SELECCION)}>
                            <b className="font-semibold">{o.texto}</b> <span className="text-[var(--tinta3)]">· {pista(o)}</span>
                          </button>
                        ))}
                      </span>
                    </>
                  )}
                  <select id={`parte-${p.id}`} value={parte} onChange={e => escoger(e.target.value as ParteId | '')}
                    className="min-h-12 rounded border border-[var(--linea)] bg-[var(--panel)] px-2 py-1.5 text-[14px] sm:min-h-0">
                    <option value="">{sugeridas?.conEvidencia ? 'O escoja cualquier parte…' : 'Escoja la parte…'}</option>
                    {cat!.partes.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                  </select>
                  {/* «: otra causa del pozo» lo dice el paso siguiente (las causas del pozo). */}
                  {esp && (
                    <button type="button" onClick={() => { setOtraDelPozo(true); escoger(''); setTexto('') }} className={cn(CHIP, 'justify-self-start')}>
                      {noFueEsp}
                    </button>
                  )}
                </span>
                {parteSel && (
                  <span className="grid gap-1">
                    <span className="flex flex-wrap items-center gap-x-2">
                      <span className={PASO_CLS}>Qué vio</span>
                      <Info rotulo="ISO 14224" titulo="Registro ISO 14224"
                        texto={`Se registra en el catálogo como ítem «${parteSel.itemIso}»${modo ? ` · daño ${modo} (${modoIso(modo)?.nombre.toLowerCase()})` : ''}.`} />
                    </span>
                    <span className="flex flex-wrap gap-1">
                      {modosDeParte(parteSel).map(m => (
                        <button type="button" key={m.codigo} onClick={() => { setModo(m.codigo); setError('') }} aria-pressed={modo === m.codigo}
                          className={cn(CHIP, modo === m.codigo && SELECCION)}>{nombreModo(m.codigo, parteSel.id)}</button>
                      ))}
                    </span>
                  </span>
                )}
              </>
            ) : (
              <>
                {esp && <button type="button" onClick={() => { setOtraDelPozo(false); setTexto('') }} className="min-h-12 justify-self-start text-[13px] text-[var(--tinta2)] underline underline-offset-2 sm:min-h-0">Volver a las partes</button>}
                <span className="flex flex-wrap gap-1">
                  {CAUSAS_POZO.map(f => (
                    <button type="button" key={f} onClick={() => { setTexto(f); setError('') }} aria-pressed={texto === f}
                      className={cn(CHIP, texto === f && SELECCION)}>{f}</button>
                  ))}
                </span>
              </>
            )}
            <label className="grid gap-0.5">
              {/* Escogió «Otra cosa»: el campo pasa a obligatorio (el porqué está en el botón marcado). */}
              <span className="text-[13px] text-[var(--tinta2)]">{!conPartes ? 'Qué encontró' : modo === MODO_OTRO ? 'Qué vio (obligatorio)' : 'Qué encontró (opcional)'}</span>
              <textarea value={texto} onChange={e => { setTexto(e.target.value); setError('') }} rows={2}
                placeholder={conPartes ? (esp ? 'Ej.: el motor dio a tierra al megger' : 'Ej.: sello con fuga por el lado de acople; se cambió') : 'Ej.: se cerró para cambiar la válvula de la cabeza'}
                className="resize-y rounded border border-[var(--linea)] bg-[var(--panel)] px-2 py-1.5 text-[14px]" />
            </label>
            {error && <p className="text-[13px] text-[var(--tinta)]" role="alert">{error}</p>}
            {/* Un solo verbo para contestar la pregunta propia (P-07): «Contestar». */}
            <Boton variante="principal" type="submit" className="min-h-12 justify-self-start px-6">Contestar</Boton>
            <small className="text-[12px] text-[var(--tinta3)]">Queda declarado por <DichoEnPapel papel={rolDeQuien(` · ${rolActual.nombre.toLowerCase()}`)}>{persona.nombre}</DichoEnPapel> · hora del sistema</small>
          </form>
        )}
      </div>
    </div>
  )
  if (abierta) return cuerpo
  // Cerrada: una fila con «›» en la pantalla; en el papel, la parada entera (la señal y lo que se contestó).
  return (
    <>
    <button type="button" onClick={onAbrir} data-parada={p.id} aria-expanded={false}
      className="no-imprimir flex min-h-14 w-full cursor-pointer items-center gap-3 border-b border-[var(--linea2)] py-2.5 text-left last:border-0 hover:bg-[var(--panel2)]/60">
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2"><MarcaDeEquipo c={cond} tamano={14} /><b className="text-[15px]">{p.equipo}</b>
          <span className="text-[14px] text-[var(--tinta2)]">{familia}{global ? ` · ${campoPorId(p.campoId).nombre}` : ''}</span></span>
        <small className="block text-[13px] text-[var(--tinta2)]">Paró {fechaHora(p.inicio)} · {p.fin ? `arrancó ${fechaHora(p.fin)}` : `hace ${fmtHoras(horas, true)}`}</small>
      </span>
      {!p.fin && <Chip tono="fuerte">no arrancar</Chip>}
      <span className="tabular shrink-0 text-[14px]">{n0(p.entero ?? p.bbl)} bbl</span>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-[var(--tinta3)]" />
    </button>
      <div className="hidden print:block">{cuerpo}</div>
    </>
  )
}

/** «5 de 8 fallas»: el rótulo de encima ya dice que es la historia del equipo.
 *  Se escribe de los datos con nombre (`veces`, `total`); una sugerencia que no
 *  los trae (una señal: «PT-2013 salió de su banda normal») va con su `porque`. */
function pista(o: { porque?: string; veces?: number; total?: number }): string {
  if (o.veces !== undefined && o.total !== undefined) return `${o.veces} de ${o.total} ${o.total === 1 ? 'falla' : 'fallas'}`
  return o.porque ?? ''
}

/** «No fue la electrosumergible»: lo que sigue (otra causa del pozo) lo dice el paso siguiente. */
const noFueEsp = NO_FUE_ESP_CORTO

/** El rótulo de cada paso de la respuesta: se lee como instrucción, no como pie. */
const PASO_CLS = 'text-[14px] font-semibold text-[var(--tinta)]'

/** Botón de opción: la misma opción de Hoy (`widgets/hoy/Pregunta.tsx`; UI-05; X5 §5.8): píldora de
 *  radio 18 con aro, 56 px (64 en el teléfono) y 16 px de letra; la marcada, con el aro de la mano. */
const CHIP = 'flex min-h-14 cursor-pointer items-center rounded-[18px] bg-[var(--panel)] px-4 py-2.5 text-left text-[16px] shadow-[inset_0_0_0_1.5px_var(--linea)] transition-colors duration-[120ms] hover:bg-[var(--panel2)] max-sm:min-h-16'
const SELECCION = 'bg-[var(--marca-suave)] text-[var(--tinta)] shadow-[inset_0_0_0_2px_var(--foco)]'


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
  // Al guardar, el formulario (y el botón que tenía el foco) se va: el foco pasa
  // al análisis guardado, que queda a la vista, y no cae en <body>.
  const guardado = useRef<HTMLElement>(null)
  const [enfocar, setEnfocar] = useState(false)
  useEffect(() => { if (enfocar && guardado.current) { guardado.current.focus(); setEnfocar(false) } }, [enfocar, a, abierto])

  if (a && !abierto) return (
    <small ref={guardado} tabIndex={-1} className="mt-0.5 block text-[13px] text-[var(--tinta2)]">
      Análisis: {a.mecanismo} {mecanismoIso(a.mecanismo)?.nombre.toLowerCase()} · causa raíz: {CAUSAS_RAIZ.find(c => c.codigo === a.causaRaiz)?.nombre.toLowerCase()}
      {a.nota && <DichoEnPapel papel="">{` · «${a.nota}»`}</DichoEnPapel>} · <DichoEnPapel papel={rolDeQuien(a.por)}>{a.por}</DichoEnPapel>
      {puede && <button type="button" onClick={() => { setMecanismo(a.mecanismo); setCausaRaiz(a.causaRaiz); setNota(a.nota ?? ''); setAbierto(true) }}
        className="ml-1.5 min-h-10 cursor-pointer underline underline-offset-2 sm:min-h-0">Corregir</button>}
      {anteriores?.map((x, i) => (
        <span key={i} className="block text-[var(--tinta3)]">
          Antes: {x.mecanismo} · causa raíz {x.causaRaiz}{x.nota && <DichoEnPapel papel="">{` · «${x.nota}»`}</DichoEnPapel>} · <DichoEnPapel papel={rolDeQuien(x.por)}>{x.por}</DichoEnPapel> · {fechaHora(new Date(x.hora))}
        </span>
      ))}
    </small>
  )
  if (!puede) return (
    <span className="mt-0.5 flex flex-wrap items-center gap-x-1">
      <Chip>análisis pendiente</Chip>
      <Info titulo="Análisis pendiente" texto="Mecanismo y causa raíz los completa confiabilidad o el jefe de mantenimiento." />
    </span>
  )
  if (!abierto) return <Boton variante="chico" className="mt-1 min-h-10 sm:min-h-0" onClick={() => setAbierto(true)}>Completar el análisis</Boton>
  return (
    <form className="mt-1.5 grid gap-1.5 rounded border border-[var(--linea2)] bg-[var(--panel2)] p-2"
      onSubmit={async e => { e.preventDefault(); const r = await completar(evento, { mecanismo, causaRaiz, nota }); if (!r.ok) setError(r.error); else { setAbierto(false); setEnfocar(true) } }}>
      <div className="grid gap-1.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr))]">
        <label className="grid gap-0.5"><span className="text-[13px] text-[var(--tinta2)]">Mecanismo · ISO 14224 B.2</span>
          <select value={mecanismo} onChange={e => { setMecanismo(e.target.value); setError('') }} className="min-h-10 rounded border border-[var(--linea)] bg-[var(--panel)] px-2 py-1 text-[14px] sm:min-h-0">
            <option value="">Escoja el mecanismo…</option>
            {MECANISMOS_POR_FAMILIA.map(f => (
              <optgroup key={f.familia} label={f.familia}>
                {f.mecanismos.map(m => <option key={m.codigo} value={m.codigo}>{m.codigo} · {m.nombre}</option>)}
              </optgroup>
            ))}
          </select></label>
        <label className="grid gap-0.5"><span className="text-[13px] text-[var(--tinta2)]">Causa raíz · B.3</span>
          <select value={causaRaiz} onChange={e => { setCausaRaiz(e.target.value); setError('') }} className="min-h-10 rounded border border-[var(--linea)] bg-[var(--panel)] px-2 py-1 text-[14px] sm:min-h-0">
            <option value="">Escoja la causa…</option>
            {CAUSAS_RAIZ.map(c => <option key={c.codigo} value={c.codigo}>{c.codigo} · {c.nombre}</option>)}
          </select></label>
      </div>
      <label className="grid gap-0.5"><span className="text-[13px] text-[var(--tinta2)]">Nota (opcional)</span>
        <input value={nota} onChange={e => setNota(e.target.value)} className="min-h-10 rounded border border-[var(--linea)] bg-[var(--panel)] px-2 py-1 text-[14px] sm:min-h-0"
          placeholder="Ej.: arena en la succión; el filtro no se cambió a tiempo" /></label>
      {error && <p className="text-[13px] text-[var(--tinta)]" role="alert">{error}</p>}
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
    <div data-declarada={p.id} className="grid grid-cols-[1fr_auto] gap-3 border-b border-[var(--linea2)] py-2 text-[14px] last:border-0">
      <span className="min-w-0">
        <b>{p.equipo}</b> <span className="text-[var(--tinta3)]">· {global ? `${campoPorId(p.campoId).nombre} · ` : ''}{fechaHora(p.inicio)}</span>
        <span className="block text-[var(--tinta)]">
          {/* Lo que escribió con sus palabras va en la pantalla; en el papel, quién lo contestó, por su rol (D2). */}
          {nombreParte
            ? <><b className="font-semibold">{nombreParte}</b>{vio ? ` · ${vio}` : ''}{!generado && <DichoEnPapel papel="">{` · «${r.texto}»`}</DichoEnPapel>}</>
            : <DichoEnPapel papel={`Lo contestó ${rolDeQuien(r.por)}`}>«{r.texto}»</DichoEnPapel>}
        </span>
        <small className="block text-[13px] text-[var(--tinta3)]"><DichoEnPapel papel={nombreParte ? `Lo contestó ${rolDeQuien(r.por)} · ` : ''}>{r.por} · </DichoEnPapel>{fechaHora(new Date(r.hora))}{!p.causa.parte && p.sobre === 'bomba' ? ' · sin parte' : ''}</small>
        {/* Estado como etiqueta; por qué (arrancó en menos de un día), en el ⓘ. */}
        {disparo && (
          <span className="mt-0.5 flex flex-wrap items-center gap-x-1">
            <Chip>disparo, no falla</Chip>
            <Info titulo="Disparo" texto={`Arrancó en ${fmtHoras(horas!, true)}: cuenta como disparo, no como falla de la electrosumergible.`} />
          </span>
        )}
        {p.causa.parte && <AnalisisDeFalla evento={p.id} modo={r.modo} />}
      </span>
      <b className="tabular text-right">{n0(p.entero ?? p.bbl)} <small className="font-normal text-[var(--tinta3)]">bbl</small></b>
    </div>
  )
}
