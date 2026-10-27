import { useEffect, useId, useRef, useState } from 'react'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import type { PreguntaHoy, OpcionHoy, ModoHoy } from '@/shared/api/hoy'
import { TEXTO_LIBRE_MINIMO, alcanza } from '@/entities/reglas'
import { cn } from '@/shared/lib/cn'

/** Lo que contestó la persona: al libro (la parte y lo que vio, o la causa del
 *  pozo), al árbol (la opción exacta) o «Todavía no sé». */
export type RespuestaHoy =
  | { via: 'libro'; texto: string; parte?: string; modo?: string; dicho: string }
  | { via: 'anh'; opcion: string; dicho: string }
  | { via: 'no-se'; opcion?: string }

type Paso =
  | { tipo: 'inicio' }
  | { tipo: 'modos'; texto: string; pregunta: string; parte: string; modos: ModoHoy[] }
  | { tipo: 'partes'; partes: Extract<OpcionHoy, { tipo: 'partes' }>['partes'] }
  | { tipo: 'causas'; causas: Extract<OpcionHoy, { tipo: 'causas' }>['causas'] }

/** La opción: 64 px o más en el teléfono, el título a 18 px y el dato a 15 (X5 §5.8). */
function Opcion({ titulo, dato, sigue, onClick, grande }: { titulo: string; dato?: string; sigue?: boolean; onClick: () => void; grande: boolean }) {
  return (
    <button type="button" onClick={onClick} data-opcion={titulo}
      className={cn('flex w-full cursor-pointer items-center justify-between gap-3 rounded-[18px] bg-[var(--panel)] text-left shadow-[inset_0_0_0_1.5px_var(--linea)] transition-colors duration-[120ms] hover:bg-[var(--panel2)]',
        grande ? 'min-h-16 px-[18px] py-[13px]' : 'min-h-14 px-4 py-2.5')}>
      <span className="min-w-0">
        <b className={cn('block font-semibold leading-[1.25] text-[var(--tinta)]', grande ? 'text-[18px]' : 'text-[16px]')}>{titulo}</b>
        {dato && <small className={cn('mt-0.5 block leading-snug text-[var(--tinta2)]', grande ? 'text-[15px]' : 'text-[14px]')}>{dato}</small>}
      </span>
      {sigue
        ? <ChevronRight aria-hidden className="size-5 shrink-0 text-[var(--tinta3)]" />
        : <span aria-hidden className="size-[26px] shrink-0 rounded-full shadow-[inset_0_0_0_2px_var(--tinta3)]" />}
    </button>
  )
}

/** Una pregunta de una sola respuesta (X5 §5.8): un toque. La parte de una bomba es
 *  un toque (imagen 5; P-07) y «Sello mecánico: ¿qué vio?» entra como la pregunta
 *  siguiente, con «Todavía no sé»: el libro guarda la parte con lo que se vio
 *  (ISO 14224) al contestar esa. `onParte` le avisa a quien la contiene (la cuenta
 *  «Pregunta 2 de 5», el aviso con «Deshacer», que vuelve a las partes). «Todavía
 *  no sé» siempre está. Lo que encontró se escribe solo si quiere (y no sale de TRIM, D2). */
export function Pregunta({ q, onRespuesta, grande = false, quien, onParte, conTitulo = false }: {
  q: PreguntaHoy; onRespuesta: (r: RespuestaHoy) => void; grande?: boolean
  /** «Un toque y queda a nombre de …». */
  quien?: string
  /** Se tocó una parte: la pregunta que sigue y cómo volver a la de antes. Con `null`, se volvió. */
  onParte?: (p: { texto: string; pregunta: string; volver: () => void } | null) => void
  /** La pregunta de lo que vio lleva su título aquí (en la tarjeta; el operador la pone en la banda). */
  conTitulo?: boolean
}) {
  const [paso, setPasoLocal] = useState<Paso>({ tipo: 'inicio' })
  const titulo = useRef<HTMLParagraphElement>(null)
  const setPaso = (p: Paso) => {
    setPasoLocal(p)
    if (p.tipo === 'modos') onParte?.({ texto: p.texto, pregunta: p.pregunta, volver: () => { setPasoLocal({ tipo: 'inicio' }); onParte?.(null) } })
    else onParte?.(null)
  }
  // A2: al entrar la pregunta siguiente, el foco va a ella (y el lector la dice).
  useEffect(() => { if (paso.tipo !== 'inicio') titulo.current?.focus() }, [paso])
  const [nota, setNota] = useState('')
  const [conNota, setConNota] = useState(false)
  const [otro, setOtro] = useState<ModoHoy | null>(null)
  const [error, setError] = useState('')
  const idNota = useId()
  const libre = nota.trim()

  const responderLibro = (texto: string, dicho: string, extra?: { parte: string; modo: string }) =>
    onRespuesta({ via: 'libro', texto, dicho, ...(extra ?? {}) })
  const escoger = (o: OpcionHoy) => {
    setError('')
    switch (o.tipo) {
      case 'parte': return setPaso({ tipo: 'modos', texto: o.texto, pregunta: o.pregunta, parte: o.parte, modos: o.modos })
      case 'partes': return setPaso({ tipo: 'partes', partes: o.partes })
      case 'causas': return setPaso({ tipo: 'causas', causas: o.causas })
      case 'texto': return responderLibro(libre ? `${o.valor}. ${libre}` : o.valor, o.texto.toLowerCase())
      case 'anh': return onRespuesta({ via: 'anh', opcion: o.valor, dicho: o.texto })
      case 'no-se': return onRespuesta({ via: 'no-se', ...(o.valor ? { opcion: o.valor } : {}) })
    }
  }
  const modo = (p: Extract<Paso, { tipo: 'modos' }>, m: ModoHoy) => {
    if (m.escribe && !alcanza(libre, TEXTO_LIBRE_MINIMO)) { setOtro(m); setConNota(true); return setError('Escriba qué vio, con al menos una frase corta.') }
    responderLibro(libre, `${p.texto.toLowerCase()} (${m.texto.toLowerCase()})`, { parte: p.parte, modo: m.codigo })
  }

  const lista = 'grid gap-2.5'
  // «Todavía no sé» también en «¿qué vio?»: la pregunta queda abierta (no se escribe la parte sola).
  const noSe = q.opciones.find(o => o.tipo === 'no-se')
  const volver = (
    <button type="button" onClick={() => { setPaso({ tipo: 'inicio' }); setOtro(null); setError('') }}
      className="inline-flex min-h-11 cursor-pointer items-center gap-1 self-start text-[15px] font-semibold text-[var(--tinta)]">
      <ChevronLeft aria-hidden className="size-4" />Volver
    </button>
  )
  return (
    <div role="group" aria-label={`${q.equipo}: ${q.texto}`} data-pregunta={q.id} className="grid gap-3">
      {paso.tipo === 'inicio' && (
        <>
          {q.pista && <p className="text-[15px] font-medium text-[var(--tinta2)]">{q.pista}</p>}
          <div className={lista}>
            {q.opciones.map(o => <Opcion key={o.texto} titulo={o.texto} dato={o.dato} grande={grande}
              sigue={o.tipo === 'parte' || o.tipo === 'partes' || o.tipo === 'causas'} onClick={() => escoger(o)} />)}
          </div>
        </>
      )}
      {paso.tipo === 'modos' && (
        <>
          {volver}
          <p ref={titulo} tabIndex={-1} data-pregunta-sigue className={cn('font-semibold text-[var(--tinta)] outline-none', conTitulo ? 'text-[17px]' : 'sr-only')}>{paso.pregunta}</p>
          <div className={lista}>
            {paso.modos.map(m => <Opcion key={m.codigo} titulo={m.texto} grande={grande} onClick={() => modo(paso, m)} />)}
            {noSe && <Opcion titulo={noSe.texto} dato={noSe.dato} grande={grande} onClick={() => onRespuesta({ via: 'no-se' })} />}
          </div>
          {otro && <button type="button" onClick={() => modo(paso, otro)}
            className="min-h-12 cursor-pointer self-start rounded-full bg-[var(--primario)] px-5 text-[16px] font-semibold text-[var(--primario-sobre)]">Contestar</button>}
        </>
      )}
      {paso.tipo === 'partes' && (
        <>
          {volver}
          <div className={lista}>{paso.partes.map(p => <Opcion key={p.parte} titulo={p.texto} sigue grande={grande}
            onClick={() => setPaso({ tipo: 'modos', texto: p.texto, pregunta: p.pregunta, parte: p.parte, modos: p.modos })} />)}</div>
        </>
      )}
      {paso.tipo === 'causas' && (
        <>
          {volver}
          <div className={lista}>{paso.causas.map(c => <Opcion key={c.valor} titulo={c.texto} dato={c.dato} grande={grande}
            onClick={() => responderLibro(libre ? `${c.valor}. ${libre}` : c.valor, c.texto.toLowerCase())} />)}</div>
        </>
      )}
      {/* Lo que encontró: solo en el libro (el árbol no guarda texto libre de las personas, D2). */}
      {q.via === 'libro' && (conNota
        ? <label htmlFor={idNota} className="grid gap-1 text-[15px] font-semibold text-[var(--tinta)]">
            {otro ? 'Qué vio (obligatorio)' : 'Lo que encontró (si quiere)'}
            <textarea id={idNota} value={nota} rows={2} onChange={e => { setNota(e.target.value); setError('') }}
              className="resize-y rounded-[14px] bg-[var(--panel)] px-3 py-2 text-[16px] font-normal shadow-[inset_0_0_0_1.5px_var(--linea)] outline-none focus:shadow-[inset_0_0_0_2px_var(--foco)]" />
          </label>
        : <button type="button" onClick={() => setConNota(true)} className="inline-flex min-h-11 cursor-pointer items-center gap-2 self-start text-[15px] font-semibold text-[var(--tinta)]">
            + Lo que encontró (si quiere)
          </button>)}
      {error && <p role="alert" className="text-[15px] text-[var(--tinta)]">{error}</p>}
      {quien && <p className="text-center text-[14px] text-[var(--tinta2)]">Un toque y queda a nombre de {quien}, con la hora del sistema.</p>}
    </div>
  )
}
