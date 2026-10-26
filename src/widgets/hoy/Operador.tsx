import { useState } from 'react'
import type { VistaHoy, PreguntaHoy } from '@/shared/api/hoy'
import { Enlace } from '@/shared/ui/primitivas'
import { Franja } from '@/widgets/Franja'
import { MarcaDeEquipo, Texto } from './comun'
import { useIr } from './palabras'
import { Bloqueo, Hechas } from './piezas'
import { MiniTuberia } from './Lateral'
import { Pregunta, type RespuestaHoy } from './Pregunta'

const TRAMOS = ['pozo', 'planta', 'exportacion'] as const

/** El operador en el teléfono: «Por contestar» (imagen 5; X4 §5.5; X5 §5.8).
 *  Una pregunta por pantalla: la banda índigo dice cuál y dónde, con la
 *  pregunta en blanco y «Pregunta 1 de 4»; abajo, el bloqueo, la tubería chica
 *  con el tramo del equipo y solo las opciones (la franja va en la cabecera). Un toque registra,
 *  sale el aviso con «Deshacer» y entra la siguiente: no hay botón «Siguiente». */
export function Operador({ v, ocultas, onResponder, quien }: {
  v: VistaHoy; ocultas: ReadonlySet<string>; onResponder: (q: PreguntaHoy, r: RespuestaHoy) => void; quien?: string
}) {
  const ir = useIr()
  const todas = v.tareas.filter(t => t.pide).flatMap(t => t.preguntas ?? [])
  // Las que se vieron en esta visita: «Pregunta 2 de 4» cuenta las contestadas aunque ya no lleguen.
  // (Se ajusta durante el dibujo, como recomienda React: converge en una vuelta.)
  const [vistas, setVistas] = useState<ReadonlySet<string>>(() => new Set())
  const nuevas = todas.filter(q => !vistas.has(q.id))
  if (nuevas.length) setVistas(new Set([...vistas, ...nuevas.map(q => q.id)]))
  const quedan = todas.filter(q => !ocultas.has(q.id))
  const contestadas = [...vistas].filter(id => ocultas.has(id) || !todas.some(q => q.id === id)).length
  const q = quedan[0]
  const avisos = v.tareas.filter(t => !t.pide)

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
      {/* La banda índigo con la pregunta en blanco (X5 §4.2, §5.8). En el teléfono la
          cabecera de la vista no se pinta aquí (C1): la franja va debajo de la banda. */}
      <header className="-mx-4 bg-[var(--marca)] px-[18px] pb-[22px] pt-3.5 text-white sm:-mx-6">
        <p className="text-right text-[15px] font-medium text-[var(--marca-tenue)]" data-paso>Pregunta {contestadas + 1} de {contestadas + quedan.length}</p>
        <p className="mt-2 text-[15px] font-medium leading-[1.35] text-[var(--marca-tenue)]">{q.contexto}</p>
        <h2 className="mt-1.5 text-[27px] font-bold leading-[1.2] tracking-[-.01em]">{q.texto}</h2>
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
      <Pregunta key={q.id} q={q} grande quien={quien} onRespuesta={r => onResponder(q, r)} />
    </div>
  )
}
