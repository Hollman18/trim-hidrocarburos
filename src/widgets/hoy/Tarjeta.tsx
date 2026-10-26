import { useState } from 'react'
import type { TareaHoy, PreguntaHoy } from '@/shared/api/hoy'
import { campoPorId } from '@/entities/campos'
import { Boton, Enlace } from '@/shared/ui/primitivas'
import { cn } from '@/shared/lib/cn'
import { Texto, MarcaDeEquipo } from './comun'
import { resumenPlanes, useIr } from './palabras'
import { Pregunta, type RespuestaHoy } from './Pregunta'

/** Una tarjeta de Hoy (X4 §3.3; X5 §5.7), siempre con la misma anatomía:
 *  verbo + qué; dónde, con el equipo y SU marca (la de la franja, no de la
 *  tarea); por qué importa; la acción de un toque y «Ver…». Lo que solo
 *  informa («Lo más frágil») va como un renglón, sin botón. Contestar se hace
 *  en la misma tarjeta, sin pasar a otra pantalla (X4 §5.5, el técnico). */
export function Tarjeta({ t, global, ocultas, onConfirmar, onResponder, quien }: {
  t: TareaHoy; global: boolean
  /** Las preguntas que ya se contestaron en esta visita (mientras dura su «Deshacer»). */
  ocultas: ReadonlySet<string>
  onConfirmar: (t: TareaHoy) => Promise<{ ok: true } | { ok: false; error: string }>
  onResponder: (q: PreguntaHoy, r: RespuestaHoy) => void
  quien?: string
}) {
  const ir = useIr()
  const [abierta, setAbierta] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const preguntas = (t.preguntas ?? []).filter(q => !ocultas.has(q.id))
  const q = abierta ? preguntas[0] : undefined
  const donde = global ? ` · ${campoPorId(t.campoId).nombre}` : ''

  if (t.grupo === 'aviso') return (
    <section data-tarea={t.tipo} data-id={t.id} data-pide={t.pide} className="flex items-center justify-between gap-4 rounded-[20px] bg-[var(--panel)] px-5 py-3.5 text-[15px] text-[var(--tinta2)] sm:px-6">
      <span className="min-w-0"><b className="font-semibold text-[var(--tinta)]">{t.titulo}</b>{donde} <Texto f={t.porque} /></span>
      {t.ver && <Enlace onClick={() => ir(t.ver!.destino)} className="shrink-0">{t.ver.texto}</Enlace>}
    </section>
  )

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
    <section data-tarea={t.tipo} data-id={t.id} data-pide={t.pide} aria-label={t.titulo}
      className="grid gap-x-5 gap-y-1 rounded-[20px] bg-[var(--panel)] px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center sm:px-6 sm:py-[18px]">
      <h3 className="text-[18px] font-semibold leading-snug sm:col-start-1">{t.titulo}{donde && <span className="font-normal text-[var(--tinta2)]">{donde}</span>}</h3>
      {t.donde && (
        <p className="flex flex-wrap items-center gap-x-2 text-[16px] font-medium sm:col-start-1">
          <MarcaDeEquipo c={t.donde.marca} />{' '}
          <b className="font-cond font-bold tracking-[.02em]">{t.donde.equipo}</b>{' '}
          <span>{t.donde.texto}</span>
        </p>
      )}
      {t.porque && <p className="text-[15px] leading-normal text-[var(--tinta2)] sm:col-start-1"><Texto f={t.porque} /></p>}
      {t.planes?.length ? (
        <button type="button" onClick={() => ir({ a: 'planes' })} data-planes
          className="justify-self-start text-left text-[14px] text-[var(--tinta2)] hover:underline sm:col-start-1">{resumenPlanes(t.planes)} ›</button>
      ) : null}
      {(accion || t.ver) && (
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3 sm:col-start-2 sm:row-span-4 sm:row-start-1 sm:mt-0 sm:flex-col sm:items-end sm:justify-center">
          {accion && <Boton variante={principal ? 'principal' : 'normal'} disabled={ocupado} aria-expanded={accion.tipo === 'responder' ? abierta : undefined}
            onClick={tocar} className={cn('min-h-12 px-6 text-[16px]', principal && 'sm:min-h-[56px] sm:px-[30px] sm:text-[17px]')}>{accion.texto}</Boton>}
          {t.ver && <Enlace onClick={() => ir(t.ver!.destino)}>{t.ver.texto}</Enlace>}
        </div>
      )}
      {error && <p role="alert" className="text-[15px] text-[var(--tinta)] sm:col-span-2">{error}</p>}
      {q && (
        <div className="mt-3 border-t border-[var(--linea2)] pt-3 sm:col-span-2" data-responder>
          <p className="mb-2 text-[16px] font-semibold"><b className="font-cond font-bold tracking-[.02em]">{q.equipo}</b> · {q.texto}
            {preguntas.length > 1 && <span className="font-normal text-[var(--tinta2)]"> · después, {preguntas.length - 1 === 1 ? 'una más' : `${preguntas.length - 1} más`}</span>}</p>
          <Pregunta key={q.id} q={q} quien={quien} onRespuesta={r => onResponder(q, r)} />
        </div>
      )}
    </section>
  )
}
