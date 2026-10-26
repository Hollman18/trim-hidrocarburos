import { useId, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useApp, useRol, usePersona } from '@/app/store'
import {
  CONFIRMAN_EN_LOTE, CONFIRMAN_LO_QUE_APUNTA, PASOS_QUE_CONFIRMA, ROLES_QUE_CONTESTAN, esDePersona, esperaAQuienAbre,
  type ParadaAnh, type PasoAnh, type RevisionAnh,
} from '@/shared/api/arbol'
import { TIPO_CAUSA } from '@/entities/causa-senal'
import { campoPorId } from '@/entities/campos'
import { rolPorId } from '@/entities/roles'
import { DichoEnPapel } from '@/shared/ui/DichoEnPapel'
import { rolEnPapel } from '@/shared/ui/papel'
import { MOTIVO_MINIMO, alcanza } from '@/entities/reglas'
import { puedeHacer } from '@/entities/tipos'
import { Boton, Chip } from '@/shared/ui/primitivas'
import { Info } from '@/shared/ui/Info'
import { n0, n1, plural } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Cadena, Falta } from './Cadena'
import { Preguntas, OPCION } from './Preguntas'
import { Editor } from './Editor'
import type { Grupo } from './grupos'
import { horaCorta, lista, pozosEnCorto, sinReferencias, estadoDeTarjeta, desdeCuando, horasDeFila, paradasYFilas } from './palabras'

/* El operador y el técnico (los que no revisan, `ROLES_QUE_CONTESTAN.revisa`)
   contestan lo que vieron, una pregunta a la vez, y avalan solo lo de su
   terreno (`PASOS_QUE_CONFIRMA`, P1 §1.3) DESPUÉS de contestar: nunca se les
   pide confirmar lo que dedujo TRIM sin que contestaran nada (B-03; U1 §2.2,
   caso A). Ven la cadena técnica plegada (U1 §10.1). */

/** Lo de su terreno, dicho para que lo avale: «No estaba programado y no se perdió nada». */
const DE_SU_TERRENO: Partial<Record<PasoAnh, Record<string, string>>> = {
  planeacion: { planeada: 'estaba programado', 'no-planeada': 'no estaba programado' },
  impacto: { diferida: 'no se perdió nada', perdida: 'se perdió crudo o gas' },
}
const mayuscula = (s: string) => (s ? `${s[0]!.toUpperCase()}${s.slice(1)}` : s)

/** «al supervisor de operaciones», «a la ingeniera de producción» (B-45). */
const aRol = (id: string) => {
  const n = rolPorId(id).nombre.toLowerCase()
  return /^(ingeniera|planeadora)\b/.test(n) ? `a la ${n}` : `al ${n}`
}

/** Una parada (o una cascada: una raíz, varios pozos) en Identificar, con su
 *  cadena de 6 pasos, lo que falta preguntar y la confirmación por paso según
 *  el rol (U1 §2; U2 §4 y §9.3).
 *  - Supervisión, producción, el jefe y confiabilidad ven los 6 pasos abiertos
 *    y confirman la parada de UN toque, también una cascada o una parada de
 *    varios días (B-07; U2 §4.3): supervisión y producción con la marca de lote.
 *  - El operador y el técnico contestan una pregunta a la vez; con lo suyo
 *    contestado, avalan lo de su terreno con «Sí, así fue». La cadena técnica
 *    va plegada con «lo propone TRIM; lo confirma su supervisor».
 *  `raiz`: las filas de la raíz que muestra la pantalla (todas, no solo las de
 *  este grupo): «para la cascada» viajan en `ids` y su número es el que se dice. */
export function TarjetaParada({ g, raiz, global, onHecho }: { g: Grupo; raiz: readonly ParadaAnh[]; global: boolean; onHecho: (texto: string) => void }) {
  const rol = useRol(); const persona = usePersona()
  const id = useId()
  const p = g.primera
  const confirmarAnh = useApp(s => s.confirmarAnh)
  const revisa = ROLES_QUE_CONTESTAN.revisa.includes(rol.id)
  const deCampo = !revisa
  const suyos: readonly PasoAnh[] = Object.hasOwn(PASOS_QUE_CONFIRMA, rol.id) && deCampo ? PASOS_QUE_CONFIRMA[rol.id]! : []
  // Los códigos de la ANH (NP_PROC…) solo a un toque y solo para confiabilidad (U1 §1.0, punto 7).
  const codigos = rol.id === 'conf'
  const puede = puedeHacer(rol.puede, 'anh:clasificar') && !persona.sinAcceso
  const enLote = CONFIRMAN_EN_LOTE.includes(rol.id)
  const [editor, setEditor] = useState<null | 'choke' | 'otros' | 'faltan' | 'mal'>(null)
  const [cambiar, setCambiar] = useState<string | undefined>(undefined)
  const [verTecnico, setVerTecnico] = useState(false)
  const [verFilas, setVerFilas] = useState(false)
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const dias = new Set(g.filas.map(f => f.diaOperacional)).size
  const sigue = g.filas.some(f => f.abiertaAlCorte && f.diaEnCurso)
  const pozos = g.pozos.length <= 3 ? lista(g.pozos) : plural(g.pozos.length, 'pozo', 'pozos')
  const que = g.cascada ? `por ${p.causa.equipo}` : TIPO_CAUSA[p.causa.tipo].toLowerCase()
  // Lo que el operador puede avalar: lo de su terreno que todavía no dijo una persona.
  const suyoPorConfirmar = suyos.filter(x => { const d = p.clasificacion[x]; return !!d && !esDePersona(d.procedencia) })
  // Lo que ya contestó él en esta parada, y si le queda una pregunta abierta.
  const contesto = (p.clasificacion.respuestas ?? []).some(r => !r.noSe && r.porId === persona.id)
  const lePreguntan = p.propuesta.preguntas.some(q => ROLES_QUE_CONTESTAN[q.quien].includes(rol.id))
  // Supervisión no confirma la causa que una señal solo apunta: la confirma quien abre el equipo (P1 §2.1).
  const confirmable = g.estado === 'propuesta' && (!esperaAQuienAbre(p.clasificacion) || CONFIRMAN_LO_QUE_APUNTA.includes(rol.id))
  const pozosRaiz = [...new Set(raiz.map(f => f.pozo))]
  const etiquetaConfirmar = g.filas.length === 1 ? 'Confirmar'
    : enLote ? (g.pozos.length > 1 ? `Confirmar los ${g.pozos.length}` : `Confirmar los ${dias} días`)
      : `Confirmar esta parada (${g.pozos.length > 1 ? plural(g.pozos.length, 'pozo', 'pozos') : plural(dias, 'día', 'días')} · ${plural(g.filas.length, 'fila', 'filas')})`

  const enviar = async (ids: string[], pasos?: PasoAnh[]) => {
    setOcupado(true); setError('')
    const r = await confirmarAnh({ ids, cadena: g.cadena, ...(pasos ? { pasos } : {}) })
    setOcupado(false)
    if (!r.ok) return setError(r.error)
    const filas = r.paradas
    const completas = filas.filter(f => f.estado === 'confirmada').length
    const quienes = [...new Set(filas.map(f => f.pozo))]
    onHecho(deCampo
      ? `Listo. Su respuesta en ${pozosEnCorto(quienes)} queda guardada; el supervisor revisa el resto.`
      : completas === filas.length
        ? `Listo. ${quienes.length <= 3 ? lista(quienes) : `Las paradas de los ${quienes.length} pozos`} ${filas.length === 1 ? 'queda completa' : `quedan completas (${filas.length} filas)`}${r.lote ? ', en un solo lote' : ''}.`
        : `Listo: quedó confirmado lo que su rol avala en ${pozosEnCorto(quienes)}. La causa y el detalle los confirma quien abra el equipo: el jefe de mantenimiento o confiabilidad.`)
  }

  const parcial = p.parcial
    ? p.hz ? `parcial: ${n1(p.hz.parada).replace(/,0$/, '')} de ${n1(p.hz.prueba).replace(/,0$/, '')} Hz` : `parcial · ${n0(p.fraccion * 100)} % del caudal`
    : undefined
  const chips = (
    <span className="flex flex-wrap items-center gap-1">
      {g.estado === 'confirmada' || g.estado === 'propuesta' ? <Chip>{estadoDeTarjeta(g.estado, p.faltan.length)}</Chip> : <Falta>{estadoDeTarjeta(g.estado, p.faltan.length)}</Falta>}
      {p.revision && !p.revision.atendida && <Chip tono="fuerte">para revisar</Chip>}
      {sigue && <Chip tono="fuerte">sigue parado</Chip>}
      {parcial && <Chip>{parcial}</Chip>}
      {p.disparo && <Chip>disparo</Chip>}
      {p.exceso && <Chip>se pasó de la ventana del programa</Chip>}
      {dias > 1 && <Chip>{dias} días</Chip>}
    </span>
  )
  // «Algo está mal» y «Cambiar»: la misma revisión; «Cambiar» trae lo que va a cambiar.
  const abrirMal = (pregunta?: string) => { setCambiar(pregunta); setEditor('mal') }

  return (
    // Una cascada larga se parte entre hojas en el papel, entre sus filas (index.css: `data-partible`).
    <article data-parada-anh={p.id} data-estado={g.estado} aria-labelledby={`${id}-t`} data-partible={g.filas.length > 8 || undefined}
      className="border-b border-[var(--linea2)] py-3 first:pt-1 last:border-0 last:pb-1">
      <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <span className="min-w-0">
          <b id={`${id}-t`} className="text-[15px]">{pozos}</b>
          <span className="text-[13px] text-[var(--tinta3)]"> · {desdeCuando(g.filas, g.pozos.length > 1)} · {que}{global ? ` · ${campoPorId(p.campoId).nombre}` : ''}</span>
          <small className="block text-[13px] text-[var(--tinta2)]">
            {n0(g.bbl)} bbl diferidos{g.filas.length > 1 ? ` · ${paradasYFilas(g.filas)}` : ''}
            {p.tramo.m !== 1 && g.filas.length === 1 ? ` · tramo ${p.tramo.n}${p.tramo.m ? ` de ${p.tramo.m}` : ''}` : ''}
          </small>
        </span>
        {chips}
      </header>

      {p.revision && <Revision r={p.revision} />}

      {g.cascada && (
        <p className="mt-1 text-[13px] text-[var(--tinta2)]">
          {g.pozos.length > 4
            ? <>{g.pozos.length} pozos · una sola raíz: <b className="text-[var(--tinta)]">{p.causa.equipo}</b></>
            : <>Una sola raíz, <b className="text-[var(--tinta)]">{p.causa.equipo}</b>: {g.filas.filter((f, i, xs) => xs.findIndex(y => y.pozo === f.pozo) === i).map(f => `${f.pozo} cerró a los ${f.minutosDesdeRaiz ?? 0} min`).join(' · ')}</>}
          {pozosRaiz.length > g.pozos.length && <> · la raíz cerró {plural(pozosRaiz.length, 'pozo', 'pozos')} en este período</>}
        </p>
      )}

      {deCampo ? (
        <div className="mt-1.5 grid gap-1.5 text-[14px]">
          <button type="button" aria-expanded={verTecnico} aria-controls={`${id}-tec`} onClick={() => setVerTecnico(v => !v)}
            className="no-imprimir flex min-h-12 cursor-pointer items-center gap-1 text-left text-[13px] text-[var(--tinta2)] sm:min-h-0">
            <ChevronRight aria-hidden size={14} className={cn('shrink-0 transition-transform', verTecnico && 'rotate-90')} />
            Lo técnico (dónde se trabó, la causa y el detalle) lo propone TRIM; lo confirma su supervisor
          </button>
          <div id={`${id}-tec`} className={cn('pl-5', !verTecnico && 'hidden print:block')}>
            <Cadena p={p} pasos={['responsable', 'choke', 'n1', 'n2']} grupo={g.pozos.length > 1} />
          </div>
        </div>
      ) : (
        g.estado === 'pendiente' && p.faltan.length === 6
          // Sin causa faltan los 6: se dice en una línea, sin seis huecos iguales (U2 §4.2).
          ? <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[14px] text-[var(--tinta2)]"><Falta>faltan los 6 pasos</Falta>Hasta que alguien diga qué pasó, no se sabe quién, dónde se trabó ni la causa.</p>
          : <div className="mt-2"><Cadena p={p} codigos={codigos} grupo={g.pozos.length > 1} /></div>
      )}
      {/* Sin causa y sin una pregunta a la vista, la cadena la propone TRIM con lo que diga quien estuvo en el pozo (U2 §4.2). */}
      {g.estado === 'pendiente' && !(puede && lePreguntan) && (
        <p className="mt-1.5 text-[13px] text-[var(--tinta2)]">
          Lo que encontró se registra arriba, en «Por identificar» (o en «No conformidades», si ya arrancó): con eso TRIM propone los 6 pasos.
        </p>
      )}

      {revisa && g.estado !== 'confirmada' && p.clasificacion.apunta && (
        <p className="mt-1.5 flex flex-wrap items-center gap-x-1 text-[13px] text-[var(--tinta2)]">
          Las señales apuntan a la causa, no la prueban: la causa y el detalle los confirma quien abra el equipo.
          <Info titulo="Una señal apunta, no prueba" texto={sinReferencias(p.clasificacion.apunta.porque)} />
        </p>
      )}
      {revisa && p.propuesta.hueco && (
        <p className="mt-1 flex flex-wrap items-center gap-x-1 text-[13px] text-[var(--tinta2)]">
          <Chip>sin causa exacta en la ANH</Chip><Info titulo="Sin causa exacta en la ANH" texto={sinReferencias(p.propuesta.hueco)} />
        </p>
      )}

      {puede && <Preguntas g={g} rolId={rol.id} raiz={raiz} onHecho={onHecho} onCambiar={deCampo ? abrirMal : undefined} />}

      {/* El operador avala lo de su terreno solo DESPUÉS de contestar, y se le pregunta en palabras (B-03). */}
      {puede && deCampo && contesto && !lePreguntan && suyoPorConfirmar.length > 0 && (
        <div role="group" aria-label="¿Está bien lo que queda de lo suyo?" className="no-imprimir mt-2 grid gap-1" data-esta-bien>
          <span className="text-[14px] font-semibold">¿Está bien? {mayuscula(suyoPorConfirmar.map(x => DE_SU_TERRENO[x]?.[String(p.clasificacion[x]!.valor)] ?? '').filter(Boolean).join(' y '))}</span>
          <span className="flex flex-wrap gap-1.5">
            <button type="button" disabled={ocupado} className={cn(OPCION, 'font-semibold')} onClick={() => void enviar(g.filas.map(f => f.id), suyoPorConfirmar)}>Sí, así fue</button>
            {!(p.revision && !p.revision.atendida) && <button type="button" disabled={ocupado} className={OPCION} aria-expanded={editor === 'mal'} onClick={() => abrirMal()}>Algo está mal</button>}
          </span>
          <small className="text-[13px] text-[var(--tinta3)]">El resto lo revisa su supervisor.</small>
        </div>
      )}

      {puede && (
        <div className="no-imprimir mt-2.5 flex flex-wrap items-center gap-1.5">
          {deCampo ? (
            !(contesto && !lePreguntan && suyoPorConfirmar.length > 0) && !(p.revision && !p.revision.atendida) && (
              <button type="button" disabled={ocupado} className={OPCION} aria-expanded={editor === 'mal'} onClick={() => abrirMal()}>Algo está mal</button>
            )
          ) : (
            <>
              {confirmable && (
                <Boton variante="principal" disabled={ocupado} className="min-h-12 sm:min-h-0" onClick={() => void enviar(g.filas.map(f => f.id))}>{etiquetaConfirmar}</Boton>
              )}
              {g.estado !== 'pendiente' && <Boton disabled={ocupado} className="min-h-12 sm:min-h-0" aria-expanded={editor === 'choke'} onClick={() => setEditor(editor === 'choke' ? null : 'choke')}>Corregir dónde se trabó</Boton>}
              {p.faltan.length > 0 && <Boton disabled={ocupado} className="min-h-12 sm:min-h-0" aria-expanded={editor === 'faltan'} onClick={() => setEditor(editor === 'faltan' ? null : 'faltan')}>{p.faltan.length === 6 ? 'Completar los 6 pasos' : 'Completar lo que falta'}</Boton>}
              {g.estado !== 'pendiente' && <Boton disabled={ocupado} className="min-h-12 sm:min-h-0" aria-expanded={editor === 'otros'} onClick={() => setEditor(editor === 'otros' ? null : 'otros')}>Corregir otro paso</Boton>}
            </>
          )}
          {revisa && confirmable && (
            <small className="basis-full text-[12px] text-[var(--tinta3)]">Queda confirmado por {persona.nombre} · hora del sistema.</small>
          )}
        </div>
      )}
      {!puede && revisa && persona.sinAcceso && <p className="mt-2 text-[13px] text-[var(--tinta2)]">Nadie con acceso activo tiene este rol: confirma una persona, no un rol.</p>}

      {editor === 'mal' && <AlgoEstaMal g={g} raiz={raiz} cambiar={cambiar} onCerrar={() => setEditor(null)} onHecho={onHecho} />}
      {editor && editor !== 'mal' && (
        <Editor g={g} rolId={rol.id} raiz={raiz}
          pasos={editor === 'choke' ? ['choke'] : editor === 'faltan' ? p.faltan : ['responsable', 'impacto', 'planeacion', 'n1', 'n2']}
          titulo={editor === 'choke' ? `¿Dónde se trabó? · ${pozos}` : editor === 'faltan' ? `Lo que falta · ${pozos}` : `Corregir un paso · ${pozos}`}
          onCerrar={() => setEditor(null)} onHecho={onHecho} />
      )}
      {error && <p role="alert" className="mt-1.5 text-[13px] text-[var(--tinta)]">{error}</p>}

      {g.filas.length > 1 && (
        <div className="mt-2">
          <button type="button" aria-expanded={verFilas} aria-controls={`${id}-filas`} onClick={() => setVerFilas(v => !v)}
            className="no-imprimir flex min-h-12 cursor-pointer items-center gap-1 text-[13px] text-[var(--tinta2)] sm:min-h-0">
            <ChevronRight aria-hidden size={14} className={cn('shrink-0 transition-transform', verFilas && 'rotate-90')} />
            Ver las {g.filas.length} filas del reporte
          </button>
          <ul id={`${id}-filas`} data-partible className={cn('mt-1 grid gap-0.5 pl-5 text-[13px]', !verFilas && 'hidden print:grid')} aria-label={`Filas de ${pozos}`}>
            {g.filas.map(f => <Fila key={f.id} f={f} />)}
          </ul>
        </div>
      )}
    </article>
  )
}

/** Lo que alguien marcó para revisar (U1 §2.7; P1 §1.5, `ParadaAnh.revision`): quién, qué y a quién; y quién la atendió. */
function Revision({ r }: { r: RevisionAnh }) {
  const aQuien = r.pedirA ? `le pidió ${aRol(r.pedirA)}` : 'marcó «Algo está mal»'
  return (
    <p className="mt-1 text-[13px] text-[var(--tinta2)]" data-revision={r.atendida ? 'atendida' : 'abierta'}>
      {/* Lo que escribió con sus palabras va en la pantalla; en el papel, quién, por su rol (D2). */}
      <DichoEnPapel papel={`${mayuscula(rolEnPapel(r))} ${aQuien} · ${horaCorta(r.hora)}`}>{r.por} {aQuien} · {horaCorta(r.hora)}: «{r.motivo}»</DichoEnPapel>
      {r.atendida && <span className="text-[var(--tinta3)]"> · la revisó <DichoEnPapel papel={rolEnPapel(r.atendida)}>{r.atendida.por}</DichoEnPapel> · {horaCorta(r.atendida.hora)}</span>}
    </p>
  )
}

/** Los atajos de «Algo está mal»: con un toque, sin escribir con guantes (B-52; U1 §2.6). */
const ATAJOS_MAL = ['No paró por eso', 'Lo cerré yo a mano', 'El pozo es otro'] as const

/** «Algo está mal» (U1 §2.7): no corrige nada; pasa la parada a quien la revisa,
 *  con lo que vio quien estuvo en el pozo (`POST /api/anh/paradas/:id/revision`).
 *  Un atajo de un toque o «Otra cosa» escrita. Desde «Cambiar», con la respuesta
 *  que quiere cambiar: la corrige su supervisor. Para la cascada, con los `ids`
 *  de la raíz que muestra la pantalla (D1). */
function AlgoEstaMal({ g, raiz, cambiar, onCerrar, onHecho }: {
  g: Grupo; raiz: readonly ParadaAnh[]; cambiar?: string; onCerrar: () => void; onHecho: (texto: string) => void
}) {
  const revisarAnh = useApp(s => s.revisarAnh)
  const atajoCambiar = cambiar ? `Mi respuesta a «${cambiar}» era otra` : undefined
  const [atajo, setAtajo] = useState<string | null>(atajoCambiar ?? null)
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const idMotivo = useId()
  const pozosRaiz = [...new Set(raiz.map(f => f.pozo))]
  const quienes = g.cascada ? pozosRaiz : g.pozos
  const enviar = async () => {
    const texto = [atajo, motivo.trim()].filter(Boolean).join(': ')
    if (!alcanza(texto, MOTIVO_MINIMO)) return setError('Escoja una de las opciones o diga qué está mal: lo lee quien la revisa.')
    setOcupado(true); setError('')
    const r = await revisarAnh(g.primera.id, { motivo: texto, ...(g.cascada ? { aplicarALaCascada: true, ids: raiz.map(f => f.id) } : { aplicarAlEvento: true }), cadena: g.cadena })
    setOcupado(false)
    if (!r.ok) return setError(r.error)
    onHecho(`Listo: ${pozosEnCorto(quienes)} ${quienes.length === 1 ? 'queda' : 'quedan'} para revisar. Lo ve su supervisor con lo que usted dijo.`)
    onCerrar()
  }
  return (
    <form className="no-imprimir mt-2 grid gap-1.5 rounded border border-[var(--linea)] bg-[var(--panel2)] p-2.5" aria-label={`Algo está mal · ${pozosEnCorto(quienes)}`}
      onSubmit={e => { e.preventDefault(); void enviar() }}>
      <span className="text-[14px] font-semibold">{atajoCambiar ? '¿Qué cambiaría? Lo corrige su supervisor.' : '¿Qué está mal?'}</span>
      <span className="grid gap-1 sm:flex sm:flex-wrap">
        {[...(atajoCambiar ? [atajoCambiar] : []), ...ATAJOS_MAL].map(a => (
          <button key={a} type="button" aria-pressed={atajo === a} onClick={() => { setAtajo(atajo === a ? null : a); setError('') }}
            className={cn(OPCION, atajo === a && 'border-acento bg-acento-f shadow-[inset_0_0_0_1px_var(--acento)]')}>{a}</button>
        ))}
      </span>
      <label htmlFor={idMotivo} className="text-[13px] text-[var(--tinta2)]">{atajo ? 'Algo más (opcional)' : 'Otra cosa'}</label>
      <textarea id={idMotivo} value={motivo} rows={2} onChange={e => { setMotivo(e.target.value); setError('') }}
        className="min-h-12 w-full rounded border border-[var(--linea)] bg-[var(--panel)] px-2 py-1 text-[14px]" placeholder="Ej.: el pozo no paró por la energía, lo cerraron para una prueba" />
      {error && <p role="alert" className="text-[13px] text-[var(--tinta)]">{error}</p>}
      <span className="flex flex-wrap gap-1.5">
        <button type="submit" disabled={ocupado} className={cn(OPCION, 'font-semibold')}>Enviar a revisar</button>
        <button type="button" onClick={onCerrar} className={OPCION}>Cancelar</button>
      </span>
    </form>
  )
}

/** Una fila del reporte: pozo × día, con sus horas y barriles (B-25: sin fechas ISO). */
function Fila({ f }: { f: ParadaAnh }) {
  return (
    <li className="flex flex-wrap items-center gap-x-2 gap-y-0.5 border-b border-dashed border-[var(--linea2)] py-1 last:border-0">
      <b className="font-mono">{f.pozo}</b>
      <span className="tabular text-[var(--tinta2)]">{horasDeFila(f)} · {n0(f.diferidaTrimBbl)} bbl</span>
    </li>
  )
}
