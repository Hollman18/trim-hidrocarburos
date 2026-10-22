import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Upload, Undo2 } from 'lucide-react'
import {
  useTopologia, usePropuestasTopologia, EXPLICA_CASO_BORDE,
  type TopologiaVigente, type PropuestaVista, type ChokeDeElemento, type ClaseElemento,
} from '@/shared/api/choke'
import { pedirPozosDelCampo } from '@/shared/api/medicion'
import { locacionDe } from '@/shared/api/fuente'
import { Panel, Boton } from '@/shared/ui/primitivas'
import { Info } from '@/shared/ui/Info'
import { plural } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import {
  RESPUESTAS, BOTON, GRUPO, ORDEN_GRUPO, NOMBRE_ESTADO, elementoDeRespuesta, respuestaDe, fraseDe, renglonDe,
  type Respuesta, type RespuestaEquipo, type TopologiaEnBorrador, type EstadoEquipo,
} from './topologia'
import { MarcaEstado, MarcaFalta, EtiquetaFalta } from './marcas'
import { CargaTopologia } from './CargaTopologia'

/** Un equipo de la lista, con lo que rige, lo contestado y lo que TRIM propone. */
interface Equipo {
  id: string
  /** Lo que dice el registro después del id («electrosumergible», «Separador trifásico»). */
  detalle: string
  grupo: ClaseElemento | 'otro'
  /** Lo que rige hoy (firmado o deducido del registro); null si no está en la topología. */
  vigente: ChokeDeElemento | null
  respuesta?: RespuestaEquipo
  /** Lo que queda si se firma: lo contestado, o lo que rige. */
  queda: ChokeDeElemento | null
  propuestas: PropuestaVista[]
  /** Dos fuentes que no cuadran: lo decide una persona, nunca el lote. */
  conflicto?: string
  estado: EstadoEquipo
  borde: boolean
}

export type Filtro = 'sin-responder' | 'propuestas' | 'borde' | 'todos'
const FILTRO: Record<Filtro, string> = { 'sin-responder': 'Sin responder', propuestas: 'Propuestas de TRIM', borde: 'Casos de borde', todos: 'Todos' }
const ORDEN_FILTRO: readonly Filtro[] = ['sin-responder', 'propuestas', 'borde', 'todos']
const enFiltro = (f: Filtro, e: Equipo) =>
  f === 'todos' || (f === 'sin-responder' ? e.estado === 'sin-responder' : f === 'propuestas' ? e.estado === 'propuesta' : e.borde)

/** De dónde sale cada propuesta, en palabras (U2 §8.3). */
const FUENTE: Record<PropuestaVista['fuente'], string> = {
  alimentador: 'el alimentador de cada pozo', bomba: 'los pozos que mueve la bomba',
  cascadas: 'las cascadas de la historia', registro: 'el registro del equipo',
}

/** «Aceptar» en lote solo dentro de un tipo y solo lo que TRIM ya tiene: lo
 *  que no cuadra entre dos fuentes lo decide una persona (U2 §8.3). */
const aceptable = (e: Equipo) => !!e.vigente && !e.conflicto && (e.estado === 'sin-responder' || e.estado === 'propuesta')

function armarEquipos(v: TopologiaVigente, ps: readonly PropuestaVista[], b: TopologiaEnBorrador | undefined): Equipo[] {
  const propuestasDe = new Map<string, PropuestaVista[]>()
  for (const p of ps) propuestasDe.set(p.elemento, [...(propuestasDe.get(p.elemento) ?? []), p])
  const vigentes = new Map(v.elementos.map(e => [e.elemento, e]))
  // Lo que TRIM propone y no está en la topología también se pregunta.
  const ids = [...new Set([...v.elementos.map(e => e.elemento), ...ps.map(p => p.elemento)])]
  // En el orden en que se ven, por tipo de equipo: la lista, el selector del
  // teléfono y «Siguiente equipo» siguen el mismo (el orden es estable dentro de cada tipo).
  const orden = (g: Equipo['grupo']) => ORDEN_GRUPO.indexOf(g)
  return ids.map((id): Equipo => {
    const e = vigentes.get(id) ?? null
    const respuesta = b && Object.hasOwn(b.respuestas, id) ? b.respuestas[id] : undefined
    const props = propuestasDe.get(id) ?? []
    const conflicto = props.find(p => p.conflicto)?.conflicto
    const queda = respuesta ? respuesta.elemento : e
    const estado: EstadoEquipo = respuesta ? 'contestado' : v.firmada && e ? 'firmado' : props.length ? 'propuesta' : 'sin-responder'
    const nombre = e?.nombre ?? id
    const detalle = nombre.startsWith(id) ? nombre.slice(id.length).replace(/^\s*·\s*/, '') : nombre
    return { id, detalle, grupo: e?.clase ?? 'otro', vigente: e, ...(respuesta ? { respuesta } : {}), queda, propuestas: props,
      ...(conflicto ? { conflicto } : {}), estado, borde: !!queda?.casoBorde || (!respuesta && props.some(p => p.casoBorde)) }
  }).sort((a, b) => orden(a.grupo) - orden(b.grupo))
}

/** Paso 1 · «¿A qué pozos sirve este equipo?» (U2 §8.2–8.3). Una sola
 *  pregunta por equipo; TRIM propone con su porqué y deduce el tramo. En el
 *  escritorio, la lista y la pregunta lado a lado; en el teléfono, una
 *  pregunta por pantalla (U2 §8.7). */
export function TopologiaPaso({ campoId, campoNombre, borrador, onResponder, estrecho, puede, filtroInicial = 'todos' }: {
  campoId: string
  campoNombre: string
  borrador: TopologiaEnBorrador | undefined
  /** Con qué filtro abre la lista («Ver lo que falta» abre en «Sin responder»). */
  filtroInicial?: Filtro
  /** Lo contestado de uno o varios equipos; null quita lo contestado (vuelve a lo que regía). */
  onResponder: (vigente: TopologiaVigente, cambios: Record<string, RespuestaEquipo | null>) => void
  /** Pantalla angosta: una pregunta por pantalla. */
  estrecho: boolean
  /** Quien no prepara la configuración lee la topología sin poder contestar. */
  puede: boolean
}) {
  const vigente = useTopologia(campoId)
  const propuestas = usePropuestasTopologia(campoId)
  const todos = useMemo(() => pedirPozosDelCampo(campoId).map(p => p.id), [campoId])
  const locacion = useMemo(() => locacionDe(campoId), [campoId])
  const equipos = useMemo(() => armarEquipos(vigente, propuestas, borrador), [vigente, propuestas, borrador])
  const [filtro, setFiltro] = useState<Filtro>(filtroInicial)
  const [elegido, setElegido] = useState<string | null>(null)
  const [conCarga, setConCarga] = useState(false)

  const visibles = equipos.filter(e => enFiltro(filtro, e))
  const actual = equipos.find(e => e.id === elegido) ?? visibles[0] ?? equipos[0]
  const posicion = actual ? visibles.findIndex(e => e.id === actual.id) : -1
  const mover = (paso: number) => {
    if (!visibles.length) return
    const i = posicion < 0 ? 0 : (posicion + paso + visibles.length) % visibles.length
    setElegido(visibles[i]!.id)
  }
  const responder = (cambios: Record<string, RespuestaEquipo | null>) => onResponder(vigente, cambios)
  const aceptarGrupo = (g: Equipo['grupo']) => responder(Object.fromEntries(equipos.filter(e => e.grupo === g && aceptable(e)).map(e => {
    const r = respuestaDe(e.vigente, todos)
    return [e.id, { r: r.r, elemento: elementoDeRespuesta(e.id, campoId, r.r, r.pozos, todos, locacion) }]
  })))
  const pasarLeidos = (leidos: ChokeDeElemento[]) => responder(Object.fromEntries(leidos.map(e => [e.elemento, { r: respuestaDe(e, todos).r, elemento: { ...e, campoId } }])))
  const grupos = ORDEN_GRUPO.map(g => ({ g, lista: visibles.filter(e => e.grupo === g), aceptables: equipos.filter(e => e.grupo === g && aceptable(e)).length }))
    .filter(x => x.lista.length > 0)

  const filtros = (
    <div role="group" aria-label="Filtrar los equipos" className="flex flex-wrap gap-1">
      {ORDEN_FILTRO.map(f => {
        const n = equipos.filter(e => enFiltro(f, e)).length
        return (
          <button key={f} type="button" aria-pressed={filtro === f} onClick={() => { setFiltro(f); setElegido(null) }}
            className={cn('min-h-7 cursor-pointer rounded border px-2.5 py-1 text-[11.5px]',
              filtro === f ? 'border-[var(--tinta)] bg-[var(--panel)] font-semibold' : 'border-[var(--linea2)] text-[var(--tinta2)] hover:bg-[var(--panel2)]')}>
            {FILTRO[f]} <span className="tabular">{n}</span>
          </button>
        )
      })}
    </div>
  )
  const botonCarga = puede && (
    <Boton type="button" aria-expanded={conCarga} onClick={() => setConCarga(v => !v)}>
      <Upload className="mr-1 inline size-3.5" />Subir Excel o CSV
    </Boton>
  )
  const carga = conCarga && (
    <CargaTopologia campoId={campoId} campoNombre={campoNombre} todos={todos} onPasar={pasarLeidos}
      elementos={equipos.flatMap(e => (e.queda ? [e.queda] : []))} />
  )
  const vacio = <p className="text-[12px] text-[var(--tinta2)]">Nada en «{FILTRO[filtro]}». <button type="button" className="cursor-pointer underline" onClick={() => setFiltro('todos')}>Ver todos</button></p>
  const pregunta = actual && (
    <Pregunta key={actual.id} equipo={actual} campoId={campoId} todos={todos} locacion={locacion} onResponder={responder} puede={puede}
      onSiguiente={visibles.length > 1 ? () => mover(1) : undefined} />
  )

  if (estrecho) return (
    <>
      <div className="mb-2 grid gap-1.5">{filtros}<div>{botonCarga}</div></div>
      {carga}
      {!visibles.length ? vacio : (
        <>
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <p className="text-[11.5px] text-[var(--tinta2)]" aria-live="polite">
              Equipo {posicion < 0 ? '—' : posicion + 1} de {visibles.length} · borrador
            </p>
            <label className="flex min-w-0 items-center gap-1 text-[11px] text-[var(--tinta2)]">
              <span className="sr-only">Ir a otro equipo</span>
              <select value={actual?.id ?? ''} onChange={e => setElegido(e.target.value)} aria-label="Ir a otro equipo"
                className="max-w-[11rem] rounded border border-[var(--linea)] bg-[var(--panel2)] px-1.5 py-1 text-[11.5px]">
                {visibles.map(e => <option key={e.id} value={e.id}>{e.id} · {NOMBRE_ESTADO[e.estado]}</option>)}
              </select>
            </label>
          </div>
          {pregunta}
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <Boton type="button" onClick={() => mover(-1)} disabled={visibles.length < 2}><ChevronLeft className="mr-0.5 inline size-3.5" />Anterior</Boton>
            <Boton type="button" variante="principal" onClick={() => mover(1)} disabled={visibles.length < 2}>Siguiente equipo<ChevronRight className="ml-0.5 inline size-3.5" /></Boton>
          </div>
        </>
      )}
      {puede && <details className="mt-2.5 rounded border border-[var(--linea)] bg-[var(--panel)]">
        <summary className="cursor-pointer px-3 py-2 text-[12px] font-semibold">Aceptar lo que TRIM dedujo, por tipo de equipo</summary>
        <AceptarPorTipo equipos={equipos} onAceptar={aceptarGrupo} />
      </details>}
    </>
  )

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">{filtros}{botonCarga}</div>
      {carga}
      <div className="grid items-start gap-2.5 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <Panel titulo={`EQUIPOS · ${equipos.length}`} extra={campoNombre}>
          {!visibles.length ? vacio : (
            <div className="-mx-1 max-h-[min(70vh,720px)] overflow-y-auto px-1">
              {grupos.map(({ g, lista, aceptables }) => (
                <section key={g} aria-label={GRUPO[g]} className="mb-2 last:mb-0">
                  <header className="mb-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 border-b border-[var(--linea2)] pb-0.5">
                    <h3 className="font-cond text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]">{GRUPO[g].toUpperCase()} · {lista.length}</h3>
                    {puede && aceptables > 0 && (
                      <Boton type="button" variante="chico" onClick={() => aceptarGrupo(g)}
                        aria-label={`Aceptar lo que TRIM dedujo para ${plural(aceptables, 'equipo', 'equipos')} de «${GRUPO[g]}»`}>
                        Aceptar {aceptables === 1 ? 'el que falta' : `los ${aceptables}`}
                      </Boton>
                    )}
                  </header>
                  <ul className="grid gap-0.5">
                    {lista.map(e => (
                      <li key={e.id}>
                        <Renglon equipo={e} todos={todos} elegido={actual?.id === e.id} onElegir={() => setElegido(e.id)} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </Panel>
        {pregunta}
      </div>
    </>
  )
}

/** Un renglón de la lista: el equipo, lo que TRIM deduce y su estado (U2 §8.2: «SE-2 · sirve a todo el campo (18 pozos) → se traba en la planta»). */
function Renglon({ equipo: e, todos, elegido, onElegir }: { equipo: Equipo; todos: readonly string[]; elegido: boolean; onElegir: () => void }) {
  // Con «Siguiente equipo» la lista sigue al escogido: no se queda mirando otro.
  // Al abrir la página no se mueve nada: solo cuando el escogido cambia.
  const ref = useRef<HTMLButtonElement>(null), antes = useRef(elegido)
  useEffect(() => {
    if (elegido && !antes.current) ref.current?.scrollIntoView({ block: 'nearest' })
    antes.current = elegido
  }, [elegido])
  return (
    <button ref={ref} type="button" onClick={onElegir} aria-pressed={elegido}
      className={cn('flex w-full cursor-pointer items-start gap-1.5 rounded border px-1.5 py-1 text-left text-[11.5px]',
        elegido ? 'border-[var(--tinta)] bg-[var(--elevado)]' : 'border-transparent hover:bg-[var(--panel2)]')}>
      <span className="mt-[3px]"><MarcaEstado estado={e.estado} /></span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-1.5">
          <b>{e.id}</b>
          {e.detalle && <span className="min-w-0 break-words text-[10.5px] text-[var(--tinta3)]">{e.detalle}</span>}
          <span className="ml-auto text-[10px] text-[var(--tinta3)]">{e.conflicto ? 'dos fuentes no cuadran' : NOMBRE_ESTADO[e.estado]}</span>
        </span>
        <span className="block break-words text-[10.5px] text-[var(--tinta2)]">{renglonDe(e.queda, e.respuesta?.r, todos)}</span>
        {e.borde && <EtiquetaFalta className="mt-0.5">caso de borde: misma locación</EtiquetaFalta>}
      </span>
    </button>
  )
}

/** «Aceptar» por tipo de equipo, con cuántos acepta cada toque (U2 §8.3). */
function AceptarPorTipo({ equipos, onAceptar }: { equipos: Equipo[]; onAceptar: (g: Equipo['grupo']) => void }) {
  const grupos = ORDEN_GRUPO.map(g => ({ g, n: equipos.filter(e => e.grupo === g && aceptable(e)).length })).filter(x => x.n > 0)
  if (!grupos.length) return <p className="px-3 pb-2.5 text-[11.5px] text-[var(--tinta2)]">No queda nada que aceptar en lote: lo que falta lo decide usted, equipo por equipo.</p>
  return (
    <ul className="grid gap-1 px-3 pb-2.5">
      {grupos.map(({ g, n }) => (
        <li key={g} className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-[var(--linea2)] py-1 text-[11.5px] last:border-0">
          <span className="min-w-0">{GRUPO[g]}</span>
          <Boton type="button" variante="chico" onClick={() => onAceptar(g)}
            aria-label={`Aceptar lo que TRIM dedujo para ${plural(n, 'equipo', 'equipos')} de «${GRUPO[g]}»`}>
            Aceptar {n === 1 ? 'el que falta' : `los ${n}`}
          </Boton>
        </li>
      ))}
      <li className="pt-0.5 text-[10.5px] text-[var(--tinta3)]">Lo que tiene dos fuentes que no cuadran no entra en el lote: se contesta uno por uno.</li>
    </ul>
  )
}

/** La pregunta de un equipo (U2 §8.2): siete respuestas, la frase que deduce
 *  TRIM al instante y las propuestas con su porqué (U2 §8.3). Lo que se
 *  contesta pasa al borrador en el acto; «A varios pozos» pasa cuando tiene al
 *  menos dos. */
function Pregunta({ equipo: e, campoId, todos, locacion, onResponder, onSiguiente, puede }: {
  equipo: Equipo; campoId: string; todos: readonly string[]; locacion: (pozo: string) => string | undefined
  /** Sin `config:firmar` la pregunta se lee, no se contesta. */
  puede: boolean
  onResponder: (cambios: Record<string, RespuestaEquipo | null>) => void
  onSiguiente?: () => void
}) {
  const idBase = useId()
  const contestado = e.respuesta ? { r: e.respuesta.r, pozos: [...(e.respuesta.elemento?.pozos ?? [])] } : respuestaDe(e.vigente, todos)
  // Solo mientras «A varios pozos» no tiene los dos pozos: lo demás se lee del
  // borrador. Una respuesta a medias saca la anterior del borrador; si llega una
  // (el lote, la carga por CSV), manda la que llegó.
  const [aMedias, setAMedias] = useState<{ r: Respuesta; pozos: string[] } | null>(null)
  const sel = aMedias && !e.respuesta ? aMedias : contestado
  const propio = todos.includes(e.id) ? e.id : undefined
  const completa = (r: Respuesta, pozos: readonly string[]) => (r !== 'varios' || pozos.length >= 2) && (r !== 'uno' || pozos.length === 1)
  const elemento = (r: Respuesta, pozos: readonly string[]) => elementoDeRespuesta(e.id, campoId, r, pozos, todos, locacion)
  const contestar = (r: Respuesta, pozos: string[]) => {
    if (!completa(r, pozos)) {
      setAMedias({ r, pozos })
      // Lo que estaba en el borrador ya no es lo que se ve: sale hasta que la respuesta se complete.
      if (e.respuesta) onResponder({ [e.id]: null })
      return
    }
    setAMedias(null)
    onResponder({ [e.id]: { r, elemento: elemento(r, pozos) } })
  }
  const escoger = (r: Respuesta) => {
    if (r === 'uno') return contestar(r, [sel.r === 'uno' && sel.pozos[0] ? sel.pozos[0] : propio ?? sel.pozos[0] ?? todos[0]!])
    if (r === 'varios') return contestar(r, sel.r === 'varios' || sel.r === 'uno' ? [...new Set([...(propio ? [propio] : []), ...sel.pozos])] : propio ? [propio] : [])
    contestar(r, [])
  }
  const alternarPozo = (p: string) => contestar('varios', sel.pozos.includes(p) ? sel.pozos.filter(x => x !== p) : [...sel.pozos, p])
  const listo = completa(sel.r, sel.pozos)
  const deduce = listo ? elemento(sel.r, sel.pozos) : null
  const { candidatos, conflictos } = candidatosDe(e, todos)
  const nombre = `${e.id}${e.detalle ? ` · ${e.detalle}` : ''}`

  return (
    <Panel titulo={nombre.toUpperCase()} extra={e.conflicto ? 'dos fuentes no cuadran' : NOMBRE_ESTADO[e.estado]}>
      <fieldset className="min-w-0">
        <legend className="mb-1.5 text-[13px] font-semibold">¿A qué pozos sirve este equipo?</legend>
        <div className="grid gap-1">
          {RESPUESTAS.map(r => (
            <div key={r}>
              <label className={cn('flex min-h-9 cursor-pointer items-start gap-2 rounded border px-2 py-1.5 text-[12px]',
                sel.r === r ? 'border-[var(--tinta)] bg-[var(--elevado)] font-semibold' : 'border-[var(--linea2)] hover:bg-[var(--panel2)]')}>
                <input type="radio" name={`${idBase}-respuesta`} value={r} checked={sel.r === r} disabled={!puede} onChange={() => escoger(r)} className="mt-0.5 shrink-0" />
                <span className="min-w-0">
                  {BOTON[r].texto}
                  {BOTON[r].aclara && <small className="block font-normal text-[10.5px] text-[var(--tinta2)]">{BOTON[r].aclara}</small>}
                </span>
              </label>
              {r === 'uno' && sel.r === 'uno' && (
                <label className="ml-6 mt-1 flex flex-wrap items-center gap-1.5 text-[11.5px]">
                  <span className="text-[var(--tinta2)]">El pozo</span>
                  <select value={sel.pozos[0] ?? ''} disabled={!puede} onChange={x => contestar('uno', [x.target.value])} aria-label={`Pozo al que sirve ${e.id}`}
                    className="rounded border border-[var(--linea)] bg-[var(--panel2)] px-1.5 py-1 text-[12px]">
                    {todos.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </label>
              )}
              {r === 'varios' && sel.r === 'varios' && (
                <fieldset className="ml-6 mt-1 min-w-0">
                  <legend className="mb-0.5 text-[11px] text-[var(--tinta2)]">Los pozos a los que sirve {e.id} · {plural(sel.pozos.length, 'escogido', 'escogidos')}</legend>
                  <div className="grid gap-x-2 [grid-template-columns:repeat(auto-fill,minmax(5.2rem,1fr))]">
                    {todos.map(p => (
                      <label key={p} className="flex min-h-7 cursor-pointer items-center gap-1 text-[11.5px]">
                        <input type="checkbox" checked={sel.pozos.includes(p)} disabled={!puede} onChange={() => alternarPozo(p)} />{p}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
            </div>
          ))}
        </div>
      </fieldset>

      <div aria-live="polite" className="mt-2 rounded border-l-2 border-[var(--tinta)] bg-[var(--panel2)] px-2 py-1.5 text-[12px]">
        {listo ? <>→ {fraseDe(sel.r, deduce, todos)}</> : <>Escoja al menos dos pozos. Si sirve a uno solo, es «A un solo pozo».</>}
      </div>
      {deduce?.casoBorde && <CasoBorde className="mt-1.5" />}
      {puede && e.respuesta && (
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--tinta2)]">
          <span>En el borrador: falta firmar (paso 3).</span>
          <Boton type="button" variante="chico" onClick={() => { setAMedias(null); onResponder({ [e.id]: null }) }}>
            <Undo2 className="mr-1 inline size-3" />Volver a lo que regía
          </Boton>
        </p>
      )}

      {(candidatos.length > 0 || conflictos.length > 0) && (
        <div className="mt-2.5 grid gap-1.5">
          {conflictos.map((p, i) => (
            <p key={`conflicto-${i}`} className="flex items-start gap-1.5 rounded border border-dashed border-[var(--tinta3)] px-2 py-1.5 text-[11.5px]">
              <span className="mt-[3px]"><MarcaFalta etiqueta="Falta decidir" /></span>
              <span><b>Dos fuentes no cuadran.</b> {p.conflicto ?? p.porque} <span className="text-[var(--tinta2)]">Lo decide usted: acepte lo de abajo o conteste arriba.</span></span>
            </p>
          ))}
          {candidatos.map(c => (
            <Candidato key={c.clave} c={c} equipo={e} todos={todos} elemento={elemento(c.r, c.pozos)} puede={puede}
              onAceptar={() => contestar(c.r, c.pozos)} />
          ))}
        </div>
      )}
      {onSiguiente && (
        <div className="mt-2.5 hidden justify-end md:flex">
          <Boton type="button" onClick={onSiguiente}>Siguiente equipo<ChevronRight className="ml-0.5 inline size-3.5" /></Boton>
        </div>
      )}
    </Panel>
  )
}

/** Una respuesta que TRIM tiene para un equipo: la que se deduce del registro
 *  (lo que rige) o la de una o varias propuestas que dicen lo mismo, juntas. */
interface Candidato {
  clave: string
  r: Respuesta
  pozos: string[]
  /** Es lo que rige hoy (deducido del registro, o firmado). */
  rige: boolean
  propuestas: PropuestaVista[]
}

/** Lo que TRIM tiene para un equipo, sin repetir: las propuestas que dicen lo
 *  mismo que el registro van en un solo bloque, con todos sus porqués. Una
 *  propuesta sin pozos es un conflicto que decide una persona (V-101 dice «4
 *  pozos» pero el esquema lo pone después del cabezal común: U2 §8.3). */
function candidatosDe(e: Equipo, todos: readonly string[]): { candidatos: Candidato[]; conflictos: PropuestaVista[] } {
  const candidatos: Candidato[] = [], conflictos: PropuestaVista[] = []
  const poner = (r: Respuesta, pozos: string[], rige: boolean, p?: PropuestaVista) => {
    const clave = r === 'tercero' || r === 'frontera' ? r : `${r === 'uno' ? 'uno' : 'varios'}|${[...pozos].sort().join(',')}`
    const ya = candidatos.find(c => c.clave === clave)
    if (ya) { ya.rige ||= rige; if (p) ya.propuestas.push(p); return }
    candidatos.push({ clave, r, pozos, rige, propuestas: p ? [p] : [] })
  }
  if (e.vigente) { const r = respuestaDe(e.vigente, todos); poner(r.r, r.pozos, true) }
  for (const p of e.propuestas) {
    if (!p.pozos.length) { conflictos.push(p); continue }
    poner(p.pozos.length === 1 ? 'uno' : todos.length > 1 && todos.every(x => p.pozos.includes(x)) ? 'todos' : 'varios', [...p.pozos], false, p)
  }
  return { candidatos, conflictos }
}

/** Un bloque de lo que TRIM propone para un equipo: su porqué, su evidencia,
 *  lo que no cuadra, lo que deduce y «Aceptar» (U2 §8.3 y §9.4). */
function Candidato({ c, equipo: e, todos, elemento, onAceptar, puede }: {
  c: Candidato; equipo: Equipo; todos: readonly string[]; elemento: ChokeDeElemento | null; onAceptar: () => void; puede: boolean
}) {
  const [abierta, setAbierta] = useState(false)
  const idEvidencia = useId()
  const firmado = c.rige && e.estado === 'firmado'
  const caidas = c.propuestas.filter(p => p.fuente === 'cascadas').flatMap(p => p.evidencia)
  const frase = fraseDe(c.r, elemento, todos)
  return (
    <div className={cn('rounded border px-2 py-1.5 text-[11.5px]', c.propuestas.length ? 'border-[var(--linea2)] bg-[var(--panel2)]' : 'border-dashed border-[var(--tinta3)]')}>
      <p className="font-cond text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]">
        {c.propuestas.length ? 'PROPUESTA DE TRIM' : firmado ? 'LO QUE ESTÁ FIRMADO' : 'LO QUE TRIM DEDUJO DEL REGISTRO'}
      </p>
      <ul className="mt-0.5 grid gap-1">
        {c.rige && <li>{firmado ? 'Así está firmado en la versión vigente.' : 'Así lo deduce TRIM del registro del campo (los pozos y el esquema de planta). Nadie lo ha confirmado todavía.'}</li>}
        {c.propuestas.map((p, i) => (
          <li key={`${p.fuente}-${i}`}>
            {p.porque} <span className="text-[10.5px] text-[var(--tinta3)]">· {FUENTE[p.fuente]}</span>
            {p.fuente !== 'cascadas' && p.evidencia.length > 0 && <span className="block text-[10.5px] text-[var(--tinta2)]">{p.evidencia.join(' · ')}</span>}
            {p.conflicto && <span className="mt-0.5 flex items-start gap-1.5"><span className="mt-[3px]"><MarcaFalta etiqueta="Falta decidir" /></span><span><b>Dos fuentes no cuadran.</b> {p.conflicto}</span></span>}
          </li>
        ))}
      </ul>
      <p className="mt-1 text-[var(--tinta2)]">→ {frase}</p>
      {elemento?.casoBorde && <CasoBorde className="mt-1" />}
      <div className="mt-1 flex flex-wrap gap-1.5">
        {puede && !firmado && <Boton type="button" variante="chico" onClick={onAceptar} aria-label={`Aceptar para ${e.id}: ${frase}`}>Aceptar</Boton>}
        {caidas.length > 1 && (
          <Boton type="button" variante="chico" aria-expanded={abierta} aria-controls={idEvidencia} onClick={() => setAbierta(v => !v)}>
            {abierta ? 'Ocultar las caídas' : `Ver las ${caidas.length} caídas`}
          </Boton>
        )}
      </div>
      {caidas.length > 1 && abierta && <ul id={idEvidencia} className="mt-1 list-disc pl-4 text-[10.5px] text-[var(--tinta2)]">{caidas.map((x, i) => <li key={i}>{x}</li>)}</ul>}
      {caidas.length === 1 && <p className="mt-0.5 text-[10.5px] text-[var(--tinta2)]">{caidas[0]}</p>}
    </div>
  )
}

/** La etiqueta del caso de borde (U2 §8.6): gris discontinuo, con su ⓘ. */
function CasoBorde({ className }: { className?: string }) {
  return (
    <p className={cn('flex flex-wrap items-center gap-1', className)}>
      <EtiquetaFalta>caso de borde: pozos de una misma locación</EtiquetaFalta>
      <Info titulo="Caso de borde" texto={EXPLICA_CASO_BORDE} />
    </p>
  )
}
