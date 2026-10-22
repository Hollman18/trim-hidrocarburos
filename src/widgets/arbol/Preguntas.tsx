import { useState } from 'react'
import { ROLES_QUE_CONTESTAN, PASOS_QUE_DECLARA, type PreguntaCampo, type OpcionCampo, type PasoAnh } from '@/shared/api/arbol'
import { PREGUNTA_OLEODUCTO } from '@/entities/choke'
import { cn } from '@/shared/lib/cn'
import { clasificar, ponerYacimiento } from './escribir'
import { OPCION_CHOKE, LINEA_CHOKE, RESPUESTA_OLEODUCTO, EVIDENCIAS } from './palabras'
import type { Grupo } from './grupos'

/** Botón de una respuesta: en el teléfono, alto de dedo (U1 §2.6). */
export const OPCION = 'min-h-10 cursor-pointer rounded-sm border border-[var(--linea)] bg-[var(--panel)] px-2 py-1 text-left text-[11px] hover:bg-[var(--panel2)] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-8'
const ROTULO_PREGUNTA = 'text-[11.5px] font-semibold text-[var(--tinta)]'

/** Lo que la pantalla de campo pregunta y guarda del operador y el técnico:
 *  solo lo de su terreno, «¿estaba programado?» y «¿se perdió algo?» (P1 §1.3,
 *  `PASOS_QUE_DECLARA`). Al operador nunca se le pide el tramo, la causa ni el
 *  detalle (U2 §4.5). */
const DE_CAMPO: readonly PasoAnh[] = ['planeacion', 'impacto']

/** «No sé»: no deja nada; el paso sigue en falta (U1 §2.4: forzar certeza fabrica datos falsos). */
const esNoSe = (o: OpcionCampo) => !o.sigue && !o.acota && !o.yacimiento && Object.keys(o.deja).length === 0

/** «¿Qué lo paró?» abre una conversación de varias preguntas encadenadas
 *  (`sigue`): sin la escritura de la respuesta de campo en el contrato, la
 *  pantalla no puede seguirla. Quien revisa completa los pasos con sus
 *  opciones cerradas, y quien estuvo en el pozo responde «¿Qué encontró?». */
const ENCADENADAS = new Set(['que-lo-paro'])

/** Las preguntas de campo de una parada (U1 §2.4), con el texto del motor y
 *  sus opciones cerradas, nunca las 117 causas. Cada rol ve las que contesta
 *  (`ROLES_QUE_CONTESTAN`); el operador y el técnico, solo las de su terreno, y
 *  de las demás solo que faltan. Una respuesta guarda lo que deja su opción,
 *  para la parada, su evento o su cascada (una decisión, Unicidad, C24 p.5). */
export function Preguntas({ g, rolId, deCampo, onHecho }: {
  g: Grupo; rolId: string; deCampo: boolean
  onHecho: (texto: string) => void
}) {
  const p = g.primera
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const [noSe, setNoSe] = useState<ReadonlySet<string>>(() => new Set())
  /** La segunda pregunta de los tanques llenos (U2 §4.4, caso 3), con lo que dejó la primera. */
  const [oleoducto, setOleoducto] = useState<OpcionCampo | null>(null)
  /** «Sí, fue el yacimiento»: falta decir qué lo muestra (U2 §4.3). */
  const [yacimiento, setYacimiento] = useState(false)
  const [otra, setOtra] = useState('')

  const suyos = Object.hasOwn(PASOS_QUE_DECLARA, rolId) ? PASOS_QUE_DECLARA[rolId]! : []
  const preguntas = p.propuesta.preguntas.filter(q => !ENCADENADAS.has(q.id))
  const contesta = (q: PreguntaCampo) => ROLES_QUE_CONTESTAN[q.quien].includes(rolId)
    && (!deCampo || q.pasos.every(x => DE_CAMPO.includes(x) && suyos.includes(x)))
  const visibles = preguntas.filter(contesta)
  // Lo que el operador no registra desde su rol: que falta, sin opciones.
  const deOtro = deCampo ? preguntas.filter(q => q.quien === 'campo' && !contesta(q)) : []
  if (!visibles.length && !deOtro.length) return null

  const alcance = g.cascada ? { aplicarALaCascada: true } : { aplicarAlEvento: true }
  const guardar = async (pasos: OpcionCampo['deja'], texto: string) => {
    setOcupado(true); setError('')
    const r = await clasificar(p.id, { pasos: pasos as Partial<Record<PasoAnh, string>>, ...alcance, cadena: g.cadena })
    setOcupado(false)
    if (!r.ok) return setError(r.error)
    setOleoducto(null); setYacimiento(false)
    onHecho(`Guardado en ${g.pozos.join(', ')}: «${texto}».`)
  }
  const evidencia = async (e: string, texto: string) => {
    setOcupado(true); setError('')
    const r = await ponerYacimiento(p.id, { evidencia: e, ...(g.cascada ? {} : { aplicarAlEvento: true }), cadena: g.cadena })
    setOcupado(false)
    if (!r.ok) return setError(r.error)
    setYacimiento(false)
    onHecho(`Guardado en ${g.pozos.join(', ')}: en el yacimiento, por ${texto.toLowerCase()}.`)
  }
  const elegir = (q: PreguntaCampo, o: OpcionCampo) => {
    if (esNoSe(o)) return setNoSe(s => new Set([...s, q.id]))
    if (q.id === 'tanques' && o.sigue === 'oleoducto') return setOleoducto(o)
    if (o.sigue === 'evidencia-yacimiento') return setYacimiento(true)
    if (o.yacimiento) return void evidencia(o.yacimiento, o.texto)
    void guardar(o.deja, o.texto)
  }
  // El texto de una opción: el del motor; las del tramo, en las palabras de U2 §1.5.
  const textoDe = (q: PreguntaCampo, o: OpcionCampo) => (q.id === 'choke' && o.deja.choke ? OPCION_CHOKE[o.deja.choke] : o.texto)
  const lineaDe = (q: PreguntaCampo, o: OpcionCampo) => (q.id === 'choke' && o.deja.choke ? LINEA_CHOKE[o.deja.choke] : undefined)
  // Se ofrece lo que se puede guardar: una opción que no deja nada ni abre otra pregunta que esta pantalla tenga no es un botón.
  const ofrecible = (q: PreguntaCampo, o: OpcionCampo) => esNoSe(o) || Object.keys(o.deja).length > 0 || !!o.yacimiento
    || (q.id === 'tanques' && o.sigue === 'oleoducto') || o.sigue === 'evidencia-yacimiento'

  return (
    <div className="mt-2 grid gap-2 border-t border-dashed border-[var(--linea2)] pt-2" data-preguntas>
      {visibles.map(q => (
        <div key={q.id} role="group" aria-label={q.texto} className="grid gap-1">
          <span className={ROTULO_PREGUNTA}>{q.texto}</span>
          <span className="flex flex-wrap gap-1">
            {q.opciones.filter(o => ofrecible(q, o)).map(o => {
              const linea = lineaDe(q, o)
              const marcada = (oleoducto === o) || (yacimiento && o.sigue === 'evidencia-yacimiento')
              return (
                <button key={o.texto} type="button" disabled={ocupado} aria-pressed={marcada || undefined} onClick={() => elegir(q, o)}
                  className={cn(OPCION, marcada && 'border-acento bg-acento-f shadow-[inset_0_0_0_1px_var(--acento)]')}>
                  {textoDe(q, o)}{linea && <small className="block text-[10px] text-[var(--tinta3)]">{linea}</small>}
                </button>
              )
            })}
          </span>
          {noSe.has(q.id) && <small className="text-[10.5px] text-[var(--tinta2)]">Queda en falta{deCampo ? ': lo revisa su supervisor' : ''}. «No sé» también es una respuesta.</small>}
          {q.id === 'tanques' && oleoducto && (
            // La segunda pregunta de los tanques llenos: la del motor del tramo, con sus dos respuestas (U2 §4.4, caso 3).
            <div role="group" aria-label={p.propuesta.porqueChoke?.pregunta ?? PREGUNTA_OLEODUCTO} className="mt-1 grid gap-1 border-l-2 border-[var(--linea)] pl-2">
              <span className={ROTULO_PREGUNTA}>{p.propuesta.porqueChoke?.pregunta ?? PREGUNTA_OLEODUCTO}</span>
              <span className="flex flex-wrap gap-1">
                {RESPUESTA_OLEODUCTO.map(x => (
                  <button key={x.choke} type="button" disabled={ocupado} onClick={() => void guardar({ ...oleoducto.deja, choke: x.choke }, `${oleoducto.texto} · ${x.texto}`)} className={OPCION}>
                    {x.texto}<small className="block text-[10px] text-[var(--tinta3)]">{x.linea}</small>
                  </button>
                ))}
                <button type="button" disabled={ocupado} onClick={() => { setOleoducto(null); setNoSe(s => new Set([...s, q.id])) }} className={OPCION}>No sé</button>
              </span>
            </div>
          )}
          {q.id === 'aporte' && yacimiento && (
            <div role="group" aria-label="¿Qué lo muestra?" className="mt-1 grid gap-1 border-l-2 border-[var(--linea)] pl-2">
              <span className={ROTULO_PREGUNTA}>¿Qué lo muestra?</span>
              <span className="flex flex-wrap gap-1">
                {EVIDENCIAS.map(x => <button key={x.clave} type="button" disabled={ocupado} onClick={() => void evidencia(x.clave, x.texto)} className={OPCION}>{x.texto}</button>)}
              </span>
              <form className="flex flex-wrap items-center gap-1" onSubmit={e => { e.preventDefault(); if (otra.trim()) void evidencia(otra.trim(), otra.trim()) }}>
                <label className="flex min-w-0 flex-1 items-center gap-1 text-[10.5px] text-[var(--tinta2)]">Otra:
                  <input value={otra} onChange={e => setOtra(e.target.value)} className="min-h-10 min-w-0 flex-1 rounded border border-[var(--linea)] bg-[var(--panel)] px-2 text-[11.5px] sm:min-h-8" placeholder="Ej.: la prueba de presión del 30-sep" />
                </label>
                <button type="submit" disabled={ocupado || !otra.trim()} className={OPCION}>Guardar</button>
              </form>
            </div>
          )}
        </div>
      ))}
      {deOtro.map(q => (
        <p key={q.id} className="flex flex-wrap items-center gap-x-1.5 text-[10.5px] text-[var(--tinta2)]">
          <span className="rounded-sm border border-dashed border-[var(--tinta3)] px-1.5">falta</span>
          «{q.texto}»: la registra su supervisor; dígale lo que vio.
        </p>
      ))}
      {error && <p role="alert" className="text-[11px] text-[var(--tinta)]">{error}</p>}
    </div>
  )
}
