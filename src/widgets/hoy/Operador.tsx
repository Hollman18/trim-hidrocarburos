import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import type { VistaHoy, PreguntaHoy } from '@/shared/api/hoy'
import { Enlace } from '@/shared/ui/primitivas'
import { RANURA_PASO } from '@/shared/ui/ranura'
import { Franja } from '@/widgets/Franja'
import { MarcaDeEquipo, Texto } from './comun'
import { useIr } from './palabras'
import { Bloqueo, Hechas } from './piezas'
import { MiniTuberia } from './Lateral'
import { Pregunta, type RespuestaHoy } from './Pregunta'
import type { Envio } from './envio'

const TRAMOS = ['pozo', 'planta', 'exportacion'] as const
const sinSuscripcion = () => () => {}

/** «Pregunta 1 de 4» en la banda índigo del teléfono (imagen 5; UI-21), con un portal
 *  al lugar que deja `App.tsx`. Si la banda no está (un ancho sin ella), en su sitio. */
function Paso({ texto }: { texto: string }) {
  // El lugar de la banda ya está en la página cuando Hoy se pinta (la vista se carga después del armazón).
  const ranura = useSyncExternalStore(sinSuscripcion, () => document.getElementById(RANURA_PASO), () => null)
  const p = <span data-paso className="whitespace-nowrap text-[15px] font-medium text-[var(--marca-tenue)]">{texto}</span>
  return ranura ? createPortal(p, ranura) : <p className="text-right">{p}</p>
}

/** El operador en el teléfono: «Por contestar» (imagen 5; X4 §5.5; X5 §5.8).
 *  Una pregunta por pantalla: la banda índigo dice cuál y dónde, con la
 *  pregunta en blanco, y «Pregunta 1 de 4» va en la banda del ☰; abajo, la franja,
 *  el bloqueo, la tubería chica con el tramo del equipo y solo las opciones. Un
 *  toque registra, sale el aviso con «Deshacer» y entra la siguiente: no hay botón
 *  «Siguiente». La parte de una bomba es un toque y «¿qué vio?» entra como la
 *  pregunta siguiente (P-07), y cuenta. El foco va a la pregunta nueva (A2). */
export function Operador({ v, ocultas, onResponder, quien, envio }: {
  v: VistaHoy; ocultas: ReadonlySet<string>; onResponder: (q: PreguntaHoy, r: RespuestaHoy) => void; quien?: string; envio: Envio
}) {
  const ir = useIr()
  const todas = v.tareas.filter(t => t.pide).flatMap(t => t.preguntas ?? [])
  // Las que se vieron en esta visita: «Pregunta 2 de 4» cuenta las contestadas aunque ya no lleguen.
  // (Se ajusta durante el dibujo, como recomienda React: converge en una vuelta.)
  const [vistas, setVistas] = useState<ReadonlySet<string>>(() => new Set())
  const nuevas = todas.filter(q => !vistas.has(q.id))
  if (nuevas.length) setVistas(new Set([...vistas, ...nuevas.map(q => q.id)]))
  // La parte que se tocó, mientras se contesta lo que se vio (P-07): «¿qué vio?» cuenta como una
  // pregunta más, mientras está abierta y después de contestada (no si se deshizo).
  const [sigue, setSigue] = useState<{ id: string; pregunta: string } | null>(null)
  const [conSigue, setConSigue] = useState<ReadonlySet<string>>(() => new Set())
  const quedan = todas.filter(q => !ocultas.has(q.id))
  const yaNo = (id: string) => ocultas.has(id) || !todas.some(q => q.id === id)
  const contestadas = [...vistas].filter(yaNo).length
  const q = quedan[0]
  const enSigue = !!q && sigue?.id === q.id
  const extras = [...conSigue].filter(id => id === sigue?.id || yaNo(id))
  const extrasHechas = extras.filter(yaNo).length
  const avisos = v.tareas.filter(t => !t.pide)
  const titulo = useRef<HTMLHeadingElement>(null)
  // A2: cada pregunta nueva recibe el foco (el lector la dice); no al cargar la pantalla.
  const antes = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (antes.current && antes.current !== q?.id) titulo.current?.focus()
    antes.current = q?.id
  }, [q?.id])

  if (!q) return (
    <div className="grid gap-3" data-operador="sin-preguntas">
      <section className="rounded-[20px] bg-[var(--panel)] px-5 py-5">
        <p className="text-[19px] font-medium">{contestadas ? 'Listo: no le falta contestar nada.' : v.vacio ?? 'No tiene preguntas por contestar.'}</p>
        <div className="mt-2"><Enlace onClick={() => ir({ a: 'planta' })}>Abrir La planta viva</Enlace></div>
      </section>
      {avisos.map(t => (
        <section key={t.id} className="rounded-[20px] bg-[var(--panel)] px-5 py-3.5 text-[15px] text-[var(--tinta2)]">
          <b className="font-semibold text-[var(--tinta)]">{t.titulo}</b> <Texto f={t.porque} />
        </section>
      ))}
      <Hechas hs={v.hechas} />
    </div>
  )

  const marcado = TRAMOS.indexOf(q.tramo.choke)
  return (
    <div className="grid gap-3" data-operador="pregunta">
      <Paso texto={`Pregunta ${contestadas + extrasHechas + 1 + (enSigue ? 1 : 0)} de ${contestadas + quedan.length + extras.length}`} />
      {/* La banda índigo con la pregunta en blanco (X5 §4.2, §5.8). En el teléfono la
          cabecera de la vista no se pinta aquí (index.css): la franja va debajo de la banda. */}
      <header className="sobre-marca -mx-4 bg-[var(--marca)] px-[18px] pb-[22px] pt-3.5 text-white sm:-mx-6">
        {/* K2 · El momento en palabras («paró hoy en la madrugada»): la hora exacta no decide la respuesta. */}
        <p className="text-[15px] font-medium leading-[1.35] text-[var(--marca-tenue)]" data-contexto>{q.contextoCorto ?? q.contexto}</p>
        <h2 ref={titulo} tabIndex={-1} className="mt-1.5 text-[27px] font-bold leading-[1.2] tracking-[-.01em] outline-none">{enSigue ? sigue!.pregunta : q.texto}</h2>
      </header>
      <Franja className="sm:hidden" />
      {q.bloqueo && <Bloqueo grande b={{ texto: q.bloqueo.texto, ...(q.bloqueo.sub ? { sub: q.bloqueo.sub } : {}) }} />}
      <div>
        <MiniTuberia tramos={TRAMOS.map((c, i) => ({ choke: c, trabado: i === marcado }))} etiqueta={`${q.equipo} está en ${q.tramo.rotulo}`} />
        <div className="mt-1 grid grid-cols-[34%_37%_1fr] text-[13px] text-[var(--tinta2)]">
          {TRAMOS.map((c, i) => i === marcado
            ? <span key={c} className="flex items-center gap-1 font-bold text-[var(--tinta)]"><MarcaDeEquipo c={q.marca} tamano={13} conPalabra={false} />{q.tramo.rotulo}</span>
            : <span key={c}>{c === 'pozo' ? 'pozos' : c === 'planta' ? 'planta' : 'salida'}</span>)}
        </div>
      </div>
      <Pregunta key={q.id} q={q} grande quien={quien} onRespuesta={r => {
        // Contestada sin pasar por «¿qué vio?» (un pozo, «Todavía no sé»): no suma la pregunta de más.
        if (!enSigue) setConSigue(c => { const n = new Set(c); n.delete(q.id); return n })
        setSigue(null); onResponder(q, r)
      }}
        onParte={p => {
          if (!p) return setSigue(null)
          setSigue({ id: q.id, pregunta: p.pregunta })
          setConSigue(c => new Set(c).add(q.id))
          // El toque se ve: el aviso dice lo que falta y «Deshacer» vuelve a las partes.
          envio.registrar({ id: `parte:${q.id}`, texto: `${p.texto} en ${q.equipo}: falta qué vio.`, local: true, alDeshacer: p.volver })
          requestAnimationFrame(() => titulo.current?.focus())
        }} />
    </div>
  )
}
