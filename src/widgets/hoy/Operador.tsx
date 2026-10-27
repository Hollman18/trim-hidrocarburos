import { useEffect, useRef, useState } from 'react'
import type { VistaHoy, PreguntaHoy, TareaHoy } from '@/shared/api/hoy'
import { MarcaDeEquipo, Texto } from './comun'
import { useIr } from './palabras'
import { Bloqueo, Hechas } from './piezas'
import { Pregunta, type RespuestaHoy } from './Pregunta'
import { LoQueVio, type Vio } from './LoQueVio'
import { RegistrarPerdida } from './Perdida'
import type { Envio } from './envio'
import { ordenDeCierre } from './vista'

export function OrdenDeCierre({ t }: { t: TareaHoy }) {
  return (
    <section aria-label="Orden de cierre" data-orden-cierre className="rounded-[10px] bg-[var(--panel)] px-5 py-3.5 text-[15px] leading-snug text-[var(--tinta2)] shadow-[inset_3px_0_0_var(--tinta)] sm:px-6">
      <b className="font-semibold text-[var(--tinta)]">Orden de cierre.</b> <Texto f={t.porque} />
    </section>
  )
}

/** El operador (experiencia v3; necesario-por-rol §4 y la imagen d1-grafito-oper): una sola
 *  pantalla, sin menú, en todos los anchos. Arriba, «Pregunta 1 de 4»; la pregunta abierta,
 *  que se contesta con UN toque (A3: la parte se guarda sola y lo que vio sigue, opcional);
 *  «No arrancar»; el orden de cierre cuando para una bomba de agua; y «Registrar una pérdida».
 *  Cada toque deja su «Deshacer». El foco va a la pregunta nueva (A2). */
export function Operador({ v, ocultas, onResponder, quien, envio, vio, onVio }: {
  v: VistaHoy; ocultas: ReadonlySet<string>; onResponder: (q: PreguntaHoy, r: RespuestaHoy) => void; quien?: string; envio: Envio
  /** Lo que vio, pendiente de la parte que se acaba de decir. */
  vio: Vio | null; onVio: (v: Vio | null) => void
}) {
  const ir = useIr()
  const todas = v.tareas.filter(t => t.pide).flatMap(t => t.preguntas ?? [])
  // Las que se vieron en esta visita: «2 de 4» cuenta las contestadas aunque ya no lleguen.
  const [vistas, setVistas] = useState<ReadonlySet<string>>(() => new Set())
  const nuevas = todas.filter(q => !vistas.has(q.id))
  if (nuevas.length) setVistas(new Set([...vistas, ...nuevas.map(q => q.id)]))
  const quedan = todas.filter(q => !ocultas.has(q.id))
  const contestadas = [...vistas].filter(id => ocultas.has(id) || !todas.some(q => q.id === id)).length
  const q = quedan[0]
  const orden = ordenDeCierre(v)
  const titulo = useRef<HTMLHeadingElement>(null)
  const antes = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (antes.current && antes.current !== q?.id && !vio) titulo.current?.focus()
    antes.current = q?.id
  }, [q?.id, vio])

  const pie = (
    <>
      {v.bloqueos.map(b => <Bloqueo key={b.campoId} b={b} grande />)}
      {orden && <OrdenDeCierre t={orden} />}
      <RegistrarPerdida envio={envio} className="w-full" />
      <Hechas hs={v.hechas} />
    </>
  )

  return (
    <div className="grid max-w-[760px] gap-3.5" data-operador={q ? 'pregunta' : 'sin-preguntas'}>
      {vio && <LoQueVio v={vio} envio={envio} grande onListo={() => onVio(null)} />}
      {q ? (
        <section aria-label={`Pregunta ${contestadas + 1} de ${contestadas + quedan.length}`} className="grid gap-3 rounded-[10px] bg-[var(--panel)] px-5 pb-5 pt-4 sm:px-7">
          <p className="grid gap-1" data-paso>
            <span className="text-[16px] font-medium text-[var(--tinta2)]">Pregunta</span>
            <span className="flex items-baseline gap-2"><b className="tabular text-[52px] font-bold leading-[1] tracking-[-.02em]" data-cifra>{contestadas + 1}</b>
              <span className="text-[20px] text-[var(--tinta2)]">de {contestadas + quedan.length}</span></span>
          </p>
          <p className="flex flex-wrap items-center gap-x-2 text-[16px]" data-contexto>
            <MarcaDeEquipo c={q.marca} conPalabra={false} />
            <span><span className="max-sm:hidden">{q.contexto}</span><span className="sm:hidden">{q.contextoCorto ?? q.contexto}</span>
              <span className="text-[var(--tinta2)]"> · {q.tramo.rotulo}</span></span>
          </p>
          <h2 ref={titulo} tabIndex={-1} className="text-[26px] font-bold leading-[1.2] outline-none">{q.texto}</h2>
          <Pregunta key={q.id} q={q} grande quien={quien} onRespuesta={r => onResponder(q, r)} />
          {q.libro && (
            <button type="button" onClick={() => ir({ a: 'equipo', campoId: q.campoId, equipo: q.equipo })} data-ver-ficha
              className="toque justify-self-start text-[15px] font-semibold text-[var(--tinta)] hover:underline">Ver {q.equipo}</button>
          )}
        </section>
      ) : (
        <section className="rounded-[10px] bg-[var(--panel)] px-5 py-5" data-sin-preguntas>
          <p className="text-[19px] font-medium">{contestadas ? 'Listo: no le falta contestar nada.' : v.vacio ?? 'No tiene preguntas por contestar.'}</p>
        </section>
      )}
      {pie}
    </div>
  )
}
