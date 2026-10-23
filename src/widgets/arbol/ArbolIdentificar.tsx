import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { useRol, usePersona } from '@/app/store'
import {
  useParadasAnh, CONFIRMAN_EN_LOTE, ROLES_QUE_CONTESTAN, PASOS_QUE_CONFIRMA, esperaRevision, esDePersona,
  type EstadoParadaAnh, type ParadaAnh,
} from '@/shared/api/arbol'
import { Panel, Boton, Hueco } from '@/shared/ui/primitivas'
import { Lectura } from '@/shared/ui/Lectura'
import { Info } from '@/shared/ui/Info'
import { VISIBLES } from '@/shared/ui/listaCorta'
import { plural } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { TarjetaParada } from './Tarjeta'
import { agrupar, type Grupo } from './grupos'
import { ESTADO, SECCION, ORDEN_SECCIONES, INFO_METODO, cuantasParadas, paradasYFilas, lista } from './palabras'

const TITULO = 'font-cond text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]'

/** Identificar · la cadena de 6 pasos de cada parada para la ANH (U1 §2; U2
 *  §4 y §9.3), en el orden de la circular: quién → ¿dónde se trabó? → qué
 *  pasó → ¿planeada? → causa → detalle. Las paradas del período van por lo que
 *  les falta: por confirmar, falta un dato, sin causa y completas; una cascada
 *  es una tarjeta (U2 §4.4). Lo plegado sale desplegado en el papel.
 *
 *  Cuentan paradas, y las filas del reporte van aparte (B-21): una parada de un
 *  pozo que cruza la medianoche son dos filas.
 *
 *  Para el operador y el técnico (U1 §2.7; B-02, B-03): UNA sola lista «POR
 *  CONTESTAR», una tarjeta por parada, solo con lo que le toca contestar. Lo
 *  que pregunta el libro («Por identificar», `antes`) va primero, y una parada
 *  que todavía espera esa respuesta (`excluir`, por evento o por raíz) no se
 *  pregunta dos veces. Lo que ya dedujo TRIM no le pide nada: va plegado. */
export function ArbolIdentificar({ campos, desde, hasta, global, periodo, antes, nAntes = 0, excluir }: {
  campos: string[]; desde: Date; hasta: Date; global: boolean; periodo: string
  /** Para el operador: las tarjetas del libro («qué se dañó», «por qué paró») que van primero en su lista. */
  antes?: ReactNode
  /** Cuántas paradas son esas tarjetas del libro (entran en la cuenta de la lista). */
  nAntes?: number
  /** Para el operador: los eventos que todavía esperan la respuesta del libro (no se preguntan aquí). */
  excluir?: ReadonlySet<string>
}) {
  const rol = useRol(); const persona = usePersona()
  const deCampo = !ROLES_QUE_CONTESTAN.revisa.includes(rol.id)
  const ps = useParadasAnh({ campos, desde, hasta })
  const grupos = useMemo(() => agrupar(ps), [ps])
  // Las filas de cada raíz que muestra la pantalla: «para la cascada» viajan todas (D1) y su número es el que se dice.
  const raices = useMemo(() => {
    const m = new Map<string, ParadaAnh[]>()
    for (const f of ps) { const k = `${f.campoId}|${f.raiz}`, xs = m.get(k); if (xs) xs.push(f); else m.set(k, [f]) }
    return m
  }, [ps])
  const raizDe = (g: Grupo) => raices.get(`${g.primera.campoId}|${g.primera.raiz}`) ?? g.filas
  // Lo que alguien marcó «Algo está mal» o le pidió a este rol va primero, en «REVISAR» (U1 §2.7).
  const aRevisar = grupos.filter(g => esperaRevision(g.primera.revision, rol.id))
  const por = (e: EstadoParadaAnh) => grupos.filter(g => g.estado === e && !aRevisar.includes(g))
  const filasDe = (e: EstadoParadaAnh) => ps.filter(p => p.estado === e)
  // Lo que se hizo con un toque se dice arriba, y el foco va ahí: la tarjeta
  // pudo cambiar de bloque (o salir) con el toque y el botón con ella.
  const [aviso, setAviso] = useState('')
  const avisoRef = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    if (!aviso) return
    const foco = document.activeElement
    if (!foco || foco === document.body || !foco.isConnected) avisoRef.current?.focus()
  }, [aviso])
  const avisoVista = aviso && <p ref={avisoRef} tabIndex={-1} role="status" className="mb-2 rounded-sm border border-[var(--linea2)] bg-[var(--panel2)] px-2 py-1.5 text-[11.5px] text-[var(--tinta2)]">{aviso}</p>

  if (deCampo) {
    // Lo que le toca al operador: una pregunta abierta para su rol, o lo suyo por avalar después de contestar.
    const suyos = Object.hasOwn(PASOS_QUE_CONFIRMA, rol.id) ? PASOS_QUE_CONFIRMA[rol.id]! : []
    const lePreguntan = (g: Grupo) => g.primera.propuesta.preguntas.some(q => ROLES_QUE_CONTESTAN[q.quien].includes(rol.id))
    const leFaltaAvalar = (g: Grupo) => (g.primera.clasificacion.respuestas ?? []).some(r => !r.noSe && r.porId === persona.id)
      && suyos.some(x => { const d = g.primera.clasificacion[x]; return !!d && !esDePersona(d.procedencia) })
    const esperaElLibro = (g: Grupo) => !!excluir && g.filas.some(f => excluir.has(f.eventoId) || excluir.has(f.raiz))
    const suyas = grupos.filter(g => g.estado !== 'confirmada' && !esperaElLibro(g) && (lePreguntan(g) || leFaltaAvalar(g)))
    const deducidas = grupos.filter(g => g.estado !== 'confirmada' && !esperaElLibro(g) && !suyas.includes(g))
    return (
      <Panel className="mb-2.5" titulo="POR CONTESTAR"
        extra={<>{plural(cuantasParadas(suyas.flatMap(g => g.filas)) + nAntes, 'parada', 'paradas')}<span className="sr-only"> por contestar en {periodo}</span></>}>
        <p className="mb-2 text-[12px] font-semibold text-[var(--tinta)]">Conteste aquí, una pregunta a la vez. Lo técnico lo revisa su supervisor.</p>
        {avisoVista}
        <div data-por-contestar>
          {antes}
          {suyas.map(g => <TarjetaParada key={g.clave} g={g} raiz={raizDe(g)} global={global} onHecho={setAviso} />)}
        </div>
        {nAntes === 0 && suyas.length === 0 && <Hueco>No le falta contestar nada en {periodo.toLowerCase()}.</Hueco>}
        {deducidas.length > 0 && <YaDeducidas grupos={deducidas} />}
      </Panel>
    )
  }

  const resumen = ORDEN_SECCIONES.filter(e => filasDe(e).length > 0).map(e => `${ESTADO[e]} ${cuantasParadas(filasDe(e))}`).join(' · ')
  return (
    <Panel className="mb-2.5" titulo="LA CADENA DE CADA PARADA · ÁRBOL DE CAUSAS"
      extra={<>{paradasYFilas(ps)}<span className="sr-only"> del árbol de causas en {periodo}</span></>}>
      <Lectura>
        Cada parada se clasifica en 6 pasos, el mismo árbol de la Circular 024 de la ANH: quién, dónde
        se trabó, qué pasó, si era planeada, la causa y el detalle. Así se mide qué paradas no planeadas
        bajar, y el reporte a la ANH sale de lo mismo. TRIM propone cada paso y dice de dónde salió;
        una persona lo confirma. Lo que falta va en gris discontinuo: nada se rellena. {CONFIRMAN_EN_LOTE.includes(rol.id)
          ? 'Una cascada (varios pozos, una sola raíz) se confirma de un toque, y queda en un lote.'
          : 'Una parada se confirma de un toque, también una cascada (varios pozos, una sola raíz) o una de varios días.'}
      </Lectura>
      <p className="mb-2 flex flex-wrap items-center gap-x-1.5 text-[11px] text-[var(--tinta2)]">
        {resumen ? `Paradas: ${resumen}` : `Ninguna parada en ${periodo}.`}
        <Info rotulo="¿qué método es?" titulo="¿Qué método es?" texto={INFO_METODO} />
      </p>
      {avisoVista}
      {ps.length === 0 && <Hueco>Ninguna parada de pozo en {periodo}: no hay nada que reportar.</Hueco>}
      <Seccion titulo="REVISAR" clave="revisar" grupos={aRevisar} global={global} raizDe={raizDe} onHecho={setAviso} />
      {ORDEN_SECCIONES.map(e => <Seccion key={e} titulo={SECCION[e]} clave={e} plegada={e === 'confirmada'} grupos={por(e)} global={global} raizDe={raizDe} onHecho={setAviso} />)}
    </Panel>
  )
}

/** Para el operador: lo que TRIM ya dedujo y no le pide nada (B-03), plegado y sin botones. */
function YaDeducidas({ grupos }: { grupos: Grupo[] }) {
  const [abierto, setAbierto] = useState(false)
  const filas = grupos.flatMap(g => g.filas)
  return (
    <div className="mt-2 border-t border-[var(--linea2)] pt-2" data-ya-deducidas>
      <button type="button" aria-expanded={abierto} onClick={() => setAbierto(v => !v)}
        className="no-imprimir flex min-h-12 cursor-pointer items-center gap-1 text-left text-[11.5px] text-[var(--tinta2)] sm:min-h-0">
        <ChevronRight aria-hidden size={14} className={cn('shrink-0 transition-transform', abierto && 'rotate-90')} />
        Estas ya las dedujo TRIM: no tiene que hacer nada · {plural(cuantasParadas(filas), 'parada', 'paradas')}
      </button>
      <ul className={cn('mt-1 grid gap-0.5 pl-5 text-[11px] text-[var(--tinta2)]', !abierto && 'hidden print:grid')}>
        {grupos.map(g => <li key={g.clave}>{lista(g.pozos)}{g.cascada ? ` · por ${g.primera.causa.equipo}` : ''} · {ESTADO[g.estado]}; lo revisa su supervisor</li>)}
      </ul>
    </div>
  )
}

/** Un bloque: cinco tarjetas a la vista y «ver las otras N»; las completas,
 *  plegadas. En el papel salen todas. El título cuenta paradas, con sus filas aparte (B-21). */
function Seccion({ titulo, clave, plegada, grupos, global, raizDe, onHecho }: {
  titulo: string; clave: EstadoParadaAnh | 'revisar'; plegada?: boolean; grupos: Grupo[]; global: boolean
  raizDe: (g: Grupo) => readonly ParadaAnh[]; onHecho: (t: string) => void
}) {
  const [abierto, setAbierto] = useState(false)
  if (!grupos.length) return null
  const n = plegada ? 0 : VISIBLES
  const visibles = abierto ? grupos : grupos.slice(0, n)
  const resto = abierto ? [] : grupos.slice(n)
  const filas = grupos.flatMap(g => g.filas)
  return (
    <section aria-label={`${titulo}: ${paradasYFilas(filas)}`} data-seccion={clave} data-paradas={cuantasParadas(filas)} data-filas={filas.length} className="mb-2 last:mb-0">
      <h3 className={`${TITULO} border-b border-[var(--linea2)] pb-1`}>{titulo} · {paradasYFilas(filas)}</h3>
      {visibles.map(g => <TarjetaParada key={g.clave} g={g} raiz={raizDe(g)} global={global} onHecho={onHecho} />)}
      {resto.length > 0 && <div className="solo-impresion">{resto.map(g => <TarjetaParada key={g.clave} g={g} raiz={raizDe(g)} global={global} onHecho={onHecho} />)}</div>}
      {(resto.length > 0 || abierto) && (
        <Boton variante="chico" className="mt-1.5 min-h-12 sm:min-h-6" aria-expanded={abierto} onClick={() => setAbierto(v => !v)}>
          {abierto ? 'ver menos' : n === 0 ? `ver las ${resto.length}` : `ver las otras ${resto.length}`}
        </Boton>
      )}
    </section>
  )
}
