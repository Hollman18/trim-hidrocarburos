import { useEffect, useId, useRef, useState } from 'react'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import type { PreguntaHoy, OpcionHoy, ModoHoy } from '@/shared/api/hoy'
import { cn } from '@/shared/lib/cn'
import { Info } from '@/shared/ui/Info'
import { useTelefono } from '@/shared/ui/telefono'

/** Lo que contestó la persona: al libro (la parte y lo que vio, o la causa del
 *  pozo), al árbol (la opción exacta) o «Todavía no sé». */
export type RespuestaHoy =
  | { via: 'libro'; texto: string; parte?: string; modo?: string; dicho: string
    /** A3 · «Contestar» en 1 toque: la parte se guarda sola y lo que vio queda como pregunta
     *  siguiente, opcional (`LoQueVio`). */
    sigue?: { texto: string; pregunta: string; modos: ModoHoy[] } }
  | { via: 'anh'; opcion: string; dicho: string }
  | { via: 'no-se'; opcion?: string }

type Paso =
  | { tipo: 'inicio' }
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

/** Una pregunta de una sola respuesta (X5 §5.8): UN toque (A3; flujos.md FF-2). La parte de
 *  una bomba se guarda con un toque (imagen 5; P-07) y «Sello mecánico: ¿qué vio?» queda
 *  como la pregunta siguiente, OPCIONAL (`LoQueVio`, `POST /api/paradas/:evento/vio`).
 *  «Todavía no sé» siempre está. Lo que encontró se escribe solo si quiere (y no sale de TRIM, D2). */
export function Pregunta({ q, onRespuesta, grande = false, quien }: {
  q: PreguntaHoy; onRespuesta: (r: RespuestaHoy) => void; grande?: boolean
  /** «Un toque y queda a nombre de …». */
  quien?: string
}) {
  const telefono = useTelefono()
  const [paso, setPaso] = useState<Paso>({ tipo: 'inicio' })
  const titulo = useRef<HTMLParagraphElement>(null)
  // A2: al entrar la pregunta siguiente, el foco va a ella (y el lector la dice).
  useEffect(() => { if (paso.tipo !== 'inicio') titulo.current?.focus() }, [paso])
  const [nota, setNota] = useState('')
  const [conNota, setConNota] = useState(false)
  const [error, setError] = useState('')
  const idNota = useId()
  const libre = nota.trim()

  const responderLibro = (texto: string, dicho: string) => onRespuesta({ via: 'libro', texto, dicho })
  /** La parte, en un toque: lo que vio sigue después, si quiere. */
  const parte = (p: { texto: string; parte: string; pregunta: string; modos: ModoHoy[] }) =>
    onRespuesta({ via: 'libro', texto: libre, dicho: p.texto.toLowerCase(), parte: p.parte, sigue: { texto: p.texto, pregunta: p.pregunta, modos: p.modos } })
  const escoger = (o: OpcionHoy) => {
    setError('')
    switch (o.tipo) {
      case 'parte': return parte(o)
      case 'partes': return setPaso({ tipo: 'partes', partes: o.partes })
      case 'causas': return setPaso({ tipo: 'causas', causas: o.causas })
      case 'texto': return responderLibro(libre ? `${o.valor}. ${libre}` : o.valor, o.texto.toLowerCase())
      case 'anh': return onRespuesta({ via: 'anh', opcion: o.valor, dicho: o.texto })
      case 'no-se': return onRespuesta({ via: 'no-se', ...(o.valor ? { opcion: o.valor } : {}) })
    }
  }

  const lista = 'grid gap-2.5'
  const volver = (
    <button type="button" onClick={() => { setPaso({ tipo: 'inicio' }); setError('') }}
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
              sigue={o.tipo === 'partes' || o.tipo === 'causas'} onClick={() => escoger(o)} />)}
          </div>
        </>
      )}
      {paso.tipo === 'partes' && (
        <>
          {volver}
          <p ref={titulo} tabIndex={-1} className="sr-only">Las demás partes</p>
          <div className={lista}>{paso.partes.map(p => <Opcion key={p.parte} titulo={p.texto} grande={grande} onClick={() => parte(p)} />)}</div>
        </>
      )}
      {paso.tipo === 'causas' && (
        <>
          {volver}
          <p ref={titulo} tabIndex={-1} className="sr-only">Las causas del pozo</p>
          <div className={lista}>{paso.causas.map(c => <Opcion key={c.valor} titulo={c.texto} dato={c.dato} grande={grande}
            onClick={() => responderLibro(libre ? `${c.valor}. ${libre}` : c.valor, c.texto.toLowerCase())} />)}</div>
        </>
      )}
      {/* Lo que encontró: solo en el libro (el árbol no guarda texto libre de las personas, D2). */}
      {q.via === 'libro' && (conNota
        ? <label htmlFor={idNota} className="grid gap-1 text-[15px] font-semibold text-[var(--tinta)]">
            Lo que encontró (si quiere)
            <textarea id={idNota} value={nota} rows={2} onChange={e => { setNota(e.target.value); setError('') }}
              className="resize-y rounded-[14px] bg-[var(--panel)] px-3 py-2 text-[16px] font-normal shadow-[inset_0_0_0_1.5px_var(--linea)] outline-none focus:shadow-[inset_0_0_0_2px_var(--foco)]" />
          </label>
        : <button type="button" onClick={() => setConNota(true)} className="inline-flex min-h-11 cursor-pointer items-center gap-2 self-start text-[15px] font-semibold text-[var(--tinta)]">
            + Lo que encontró (si quiere)
          </button>)}
      {error && <p role="alert" className="text-[15px] text-[var(--tinta)]">{error}</p>}
      {/* B4 · En el teléfono (necesario-por-rol §14, oper y tec: la pregunta y sus opciones), a nombre de quién queda, en su ⓘ. */}
      {quien && (telefono
        ? <p className="text-center text-[14px] text-[var(--tinta2)]" data-a-su-nombre=""><Info titulo="Queda a su nombre" texto={`Un toque y queda a nombre de ${quien}, con la hora del sistema.`} rotulo="a su nombre" /></p>
        : <p className="text-center text-[14px] text-[var(--tinta2)]" data-a-su-nombre="">Un toque y queda a nombre de {quien}, con la hora del sistema.</p>)}
    </div>
  )
}
