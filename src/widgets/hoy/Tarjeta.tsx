import { fondoTono, tonoDeCondicion, atributoTono } from '@/shared/ui/tono'
import { useEffect, useRef, useState } from 'react'
import type { TareaHoy, PreguntaHoy } from '@/shared/api/hoy'
import { campoPorId } from '@/entities/campos'
import { Boton, Enlace } from '@/shared/ui/primitivas'
import { cn } from '@/shared/lib/cn'
import { Texto, MarcaDeEquipo } from './comun'
import { useIr } from './palabras'
import { Pregunta, type RespuestaHoy } from './Pregunta'
import { useRango } from '@/app/store'
import { useCiclo, planesDeEquipo } from '@/shared/api/ciclo'
import { PlanesDe } from '@/widgets/ciclo/Ciclo'

/** FF-3 · Los planes de la parada, donde se abren: en la misma tarjeta, con «Aceptar» (y su
 *  «Ya se hizo»); simulados, nunca la cifra grande. */
function PlanesEnTarjeta({ campoId, equipo }: { campoId: string; equipo: string }) {
  const rango = useRango()
  const planes = planesDeEquipo(useCiclo([campoId], rango.desde, rango.hasta), campoId, equipo)
  return <div className="mt-3 border-t border-[var(--linea2)] pt-3 sm:col-span-2" data-planes-en-tarjeta><PlanesDe planes={planes} /></div>
}

/** Una tarjeta de Hoy (X4 §3.3; X5 §5.7), siempre con la misma anatomía:
 *  verbo + qué; dónde, con el equipo y SU marca (la de la franja, no de la
 *  tarea); por qué importa; la acción de un toque y «Ver…». Lo que solo
 *  informa («Lo más frágil») va como un renglón, sin botón. Contestar se hace
 *  en la misma tarjeta, sin pasar a otra pantalla (X4 §5.5, el técnico). */
export function Tarjeta({ t, global, ocultas, onConfirmar, onResponder, quien, abiertaDeEntrada = false, compacta = false }: {
  t: TareaHoy; global: boolean
  /** Las preguntas que ya se contestaron en esta visita (mientras dura su «Deshacer»). */
  ocultas: ReadonlySet<string>
  onConfirmar: (t: TareaHoy) => Promise<{ ok: true } | { ok: false; error: string }>
  onResponder: (q: PreguntaHoy, r: RespuestaHoy) => void
  quien?: string
  /** FF-2 · A quien la debe (oper, tec) le llega abierta: contestar es un toque. */
  abiertaDeEntrada?: boolean
  /** FF-2 · Quien no la debe (sup, jefe, conf) ve una línea: el número de arriba ya dice cuáles. */
  compacta?: boolean
}) {
  const ir = useIr()
  const [abierta, setAbierta] = useState(abiertaDeEntrada)
  const [conPlanes, setConPlanes] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const preguntas = (t.preguntas ?? []).filter(q => !ocultas.has(q.id))
  const q = abierta ? preguntas[0] : undefined
  const donde = global ? ` · ${campoPorId(t.campoId).nombre}` : ''

  // A2: la pregunta que entra en la tarjeta recibe el foco (no al abrir la tarjeta).
  const pregunta = useRef<HTMLParagraphElement>(null)
  const antes = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (antes.current && q && antes.current !== q.id) pregunta.current?.focus()
    antes.current = q?.id
  }, [q])

  // En el teléfono, el porqué corto cuando el motor lo da (imagen 3b; I-sup-3, I-sup-5).
  const porque = t.porqueCorto
    ? <><span className="max-sm:hidden"><Texto f={t.porque} /></span><span className="sm:hidden"><Texto f={t.porqueCorto} /></span></>
    : <Texto f={t.porque} />

  // 28-oct · Qué atacar: la tarjeta lleva el tono de su equipo (alarma en rojo pálido; atención y aviso en amarillo).
  const tono = tonoDeCondicion(t.donde?.marca)

  // FF-6 · La orden que ya pasó el límite no le pide nada a jefe ni a confiabilidad: es una línea que informa.
  if (t.grupo === 'aviso' || t.tipo === 'orden') return (
    <section data-tarea={t.tipo} data-id={t.id} data-pide={t.pide} {...atributoTono(tono)} className={cn('flex items-center justify-between gap-4 rounded-[10px] bg-[var(--panel)] px-5 py-3.5 text-[15px] text-[var(--tinta2)] sm:px-6', fondoTono(tono))}>
      <span className="min-w-0"><b className="font-semibold text-[var(--tinta)]">{t.titulo}</b>{donde} {porque}</span>
      {t.ver && <Enlace onClick={() => ir(t.ver!.destino)} className="shrink-0">{t.ver.texto}</Enlace>}
    </section>
  )
  const breve = compacta && (t.tipo === 'conseguir-causa' || t.tipo === 'planes')
  const planesDe = t.tipo === 'planes' && t.ver?.destino.a === 'equipo' ? t.ver.destino : undefined
  // Un solo nombre para contestar en todo el producto (FF-2): «Contestar», o «Contestar yo» si la debe otro.
  const textoAccion = t.tipo === 'conseguir-causa' ? 'Contestar yo' : t.accion?.texto

  const accion = t.accion
  const principal = accion?.tipo === 'confirmar'
  const confirmar = async () => {
    setOcupado(true); setError('')
    const r = await onConfirmar(t)
    setOcupado(false)
    if (!r.ok) setError(r.error)
  }
  const tocar = () => {
    if (!accion) return
    if (accion.tipo === 'confirmar') return void confirmar()
    if (accion.tipo === 'responder') return setAbierta(v => !v)
    ir(accion.destino)
  }
  return (
    <section data-tarea={t.tipo} data-id={t.id} data-pide={t.pide} aria-label={t.titulo} {...atributoTono(tono)}
      className={cn('grid gap-x-5 gap-y-1 rounded-[10px] bg-[var(--panel)] px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center sm:px-6 sm:py-[18px]', fondoTono(tono))}>
      {/* h2 (A15): el título de la vista es h1 y cada tarjeta, su sección. tabIndex −1: el foco
          puede caer aquí cuando la tarjeta de arriba se va (A2, `Hoy.tsx`). */}
      <h2 tabIndex={-1} data-titulo-tarea className="text-[18px] font-semibold leading-snug outline-none sm:col-start-1">
        {t.tituloCorto ? <><span className="max-sm:hidden">{t.titulo}</span><span className="sm:hidden">{t.tituloCorto}</span></> : t.titulo}
        {donde && <span className="font-normal text-[var(--tinta2)]">{donde}</span>}
      </h2>
      {t.donde && !breve && (
        <p className="flex flex-wrap items-center gap-x-2 text-[16px] font-medium sm:col-start-1">
          <MarcaDeEquipo c={t.donde.marca} />{' '}
          <b className="font-cond font-bold tracking-[.02em]">{t.donde.equipo}</b>{' '}
          {/* K2 · En el teléfono, sin las horas que no deciden (el motor da el texto corto). */}
          {t.donde.corto
            ? <><span className="max-sm:hidden">{t.donde.texto}</span><span className="sm:hidden">{t.donde.corto}</span></>
            : <span>{t.donde.texto}</span>}
        </p>
      )}
      {/* Un porqué corto vacío: en el teléfono no hay renglón (lo dice la franja de arriba). */}
      {t.porque && !breve && <p className={cn('text-[15px] leading-normal text-[var(--tinta2)] sm:col-start-1', t.porqueCorto && !t.porqueCorto.length && 'max-sm:hidden')}>{porque}</p>}
      {(accion || t.ver) && (
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3 sm:col-start-2 sm:row-span-4 sm:row-start-1 sm:mt-0 sm:flex-col sm:items-end sm:justify-center">
          {accion && <Boton variante={principal ? 'principal' : 'normal'} disabled={ocupado} aria-expanded={accion.tipo === 'responder' ? abierta : undefined}
            onClick={tocar} className={cn('min-h-12 px-6 text-[16px]', principal && 'sm:min-h-[56px] sm:px-[30px] sm:text-[17px]')}>{textoAccion}</Boton>}
          {planesDe
            ? <Boton aria-expanded={conPlanes} onClick={() => setConPlanes(x => !x)} className="min-h-12 px-6 text-[16px]">{conPlanes ? 'Cerrar los planes' : t.ver!.texto}</Boton>
            : t.ver && <Enlace onClick={() => ir(t.ver!.destino)}>{t.ver.texto}</Enlace>}
        </div>
      )}
      {error && <p role="alert" className="text-[15px] text-[var(--tinta)] sm:col-span-2">{error}</p>}
      {q && (
        <div className="mt-3 border-t border-[var(--linea2)] pt-3 sm:col-span-2" data-responder>
          <p ref={pregunta} tabIndex={-1} className="mb-2 text-[16px] font-semibold outline-none"><b className="font-cond font-bold tracking-[.02em]">{q.equipo}</b> · {q.texto}
            {preguntas.length > 1 && <span className="font-normal text-[var(--tinta2)]"> · después, {preguntas.length - 1 === 1 ? 'una más' : `${preguntas.length - 1} más`}</span>}</p>
          <Pregunta key={q.id} q={q} quien={quien} onRespuesta={r => onResponder(q, r)} />
        </div>
      )}
      {planesDe && conPlanes && <PlanesEnTarjeta campoId={planesDe.campoId} equipo={planesDe.equipo} />}
    </section>
  )
}
