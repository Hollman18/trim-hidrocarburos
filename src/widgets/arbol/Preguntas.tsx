import { useState } from 'react'
import { useApp, usePersona } from '@/app/store'
import { ROLES_QUE_CONTESTAN, esNoSe, type ParadaAnh, type PreguntaCampo, type OpcionCampo } from '@/shared/api/arbol'
import { cn } from '@/shared/lib/cn'
import { OPCION_CHOKE, LINEA_CHOKE, pozosEnCorto, enOrden, textoDePregunta, horaCorta } from './palabras'
import type { Grupo } from './grupos'
import { DichoEnPapel } from '@/shared/ui/DichoEnPapel'
import { rolEnPapel } from '@/shared/ui/papel'

/** Botón de una respuesta: en el teléfono, 48 px de alto, para el dedo con guantes (U1 §2.6; B-24). */
export const OPCION = 'min-h-12 cursor-pointer rounded-sm border border-[var(--linea)] bg-[var(--panel)] px-2 py-1 text-left text-[11.5px] hover:bg-[var(--panel2)] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-8 sm:text-[11px]'
const ROTULO_PREGUNTA = 'text-[12px] font-semibold text-[var(--tinta)]'
/** En el teléfono se ven cinco respuestas y «Más opciones…» (U1 §2.4); «No sé» siempre. */
const A_LA_VISTA = 5

/** Las preguntas de campo de una parada (U1 §2.4), con el texto y las opciones
 *  del motor, nunca las 117 causas. UNA a la vez (U1 §2.4; B-23, B-32): la que
 *  sigue aparece en el lugar de la que se contestó, y arriba queda lo que ya se
 *  contestó («Usted contestó: …»). Cada rol ve las que contesta
 *  (`ROLES_QUE_CONTESTAN`): al operador nunca se le pregunta dónde se trabó
 *  (U2 §4.5). Cada respuesta va al servidor (`POST /api/anh/paradas/:id/respuesta`),
 *  que corre el motor; la pregunta que abre llega con la vista. «No sé» también
 *  se guarda: la pregunta queda abierta y escala a quien revisa. Una respuesta
 *  vale para la parada, su evento o su cascada, y para la cascada lleva las
 *  filas de la raíz que muestra la pantalla (`ids`, D1). */
export function Preguntas({ g, rolId, raiz, onHecho, onCambiar }: {
  g: Grupo; rolId: string
  /** Las filas de la raíz que muestra la pantalla (todas, no solo las del grupo): van en `ids` para la cascada. */
  raiz: readonly ParadaAnh[]
  onHecho: (texto: string) => void
  /** Quien contesta en el campo no corrige: «Cambiar» le pasa la parada a su supervisor con lo que dice. */
  onCambiar?: (pregunta: string) => void
}) {
  const p = g.primera
  const persona = usePersona()
  const responderAnh = useApp(s => s.responderAnh), yacimientoAnh = useApp(s => s.yacimientoAnh)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const [otra, setOtra] = useState('')
  const [todas, setTodas] = useState(false)

  const contesta = (q: PreguntaCampo) => ROLES_QUE_CONTESTAN[q.quien].includes(rolId)
  const respuestas = p.clasificacion.respuestas ?? []
  const abiertas = enOrden(p.propuesta.preguntas.filter(contesta), respuestas)
  const q = abiertas[0]
  const escalada = p.propuesta.escalada
  const revisa = ROLES_QUE_CONTESTAN.revisa.includes(rolId)
  // Lo que ya se contestó en esta parada: el operador ve lo suyo; quien revisa, lo de todos.
  const dichas = respuestas.filter(r => !r.noSe && (revisa || r.porId === persona.id))
  // Quién dijo «No sé» y a qué: está en la conversación de la parada.
  const noSupo = escalada && [...respuestas].reverse().find(r => r.noSe && r.pregunta === escalada.pregunta)
  const textoEscalada = escalada && p.propuesta.preguntas.find(x => x.id === escalada.pregunta)?.texto
  if (!q && !dichas.length && !(escalada && revisa)) return null

  // Para la cascada, las filas de la raíz que muestra la pantalla (D1: si la raíz trae más, el servidor responde 409).
  const ids = raiz.map(f => f.id)
  const alcance = g.cascada ? { aplicarALaCascada: true, ids } : { aplicarAlEvento: true }
  const pozosRaiz = [...new Set(raiz.map(f => f.pozo))]
  const pozos = g.cascada ? pozosEnCorto(pozosRaiz) : pozosEnCorto(g.pozos)
  const contestar = async (x: PreguntaCampo, o: OpcionCampo) => {
    setOcupado(true); setError('')
    const r = await responderAnh(p.id, { pregunta: x.id, opcion: o.texto, ...alcance, cadena: g.cadena })
    setOcupado(false)
    if (!r.ok) return setError(r.error)
    setTodas(false)
    onHecho(esNoSe(o)
      ? `Guardado en ${pozos}: «No sé» a «${x.texto}». La pregunta queda abierta y la revisa ${revisa ? 'otra persona que revisa' : 'su supervisor'}.`
      : `Guardado en ${pozos}: «${o.texto}».`)
  }
  // «¿Qué lo muestra?» con una nota escrita: va por «En el yacimiento» (producción o confiabilidad), que es de cada pozo.
  const conNota = async (nota: string) => {
    setOcupado(true); setError('')
    const r = await yacimientoAnh(p.id, { evidencia: nota, ...(g.cascada ? {} : { aplicarAlEvento: true }), cadena: g.cadena })
    setOcupado(false)
    if (!r.ok) return setError(r.error)
    setOtra('')
    onHecho(`Guardado en ${g.cascada ? p.pozo : pozos}: en el yacimiento, por «${nota}».`)
  }
  // El texto de una opción: el del motor; las del tramo, en las palabras de U2 §1.5.
  const textoDe = (x: PreguntaCampo, o: OpcionCampo) => (x.id === 'choke' && o.deja.choke ? OPCION_CHOKE[o.deja.choke] : o.texto)
  const lineaDe = (x: PreguntaCampo, o: OpcionCampo) => (x.id === 'choke' && o.deja.choke ? LINEA_CHOKE[o.deja.choke] : undefined)
  const muchas = q ? q.opciones.length > A_LA_VISTA + 1 : false

  return (
    <div className="mt-2 grid gap-2 border-t border-dashed border-[var(--linea2)] pt-2" data-preguntas>
      {dichas.length > 0 && (
        <ul className="grid gap-0.5 text-[11.5px]" aria-label="Lo que ya se contestó" data-contestado>
          {dichas.map((r, i) => (
            <li key={`${r.pregunta}${i}`} className="flex flex-wrap items-baseline gap-x-1.5">
              <span className="text-[var(--tinta2)]">{r.porId === persona.id ? 'Usted contestó' : <DichoEnPapel papel={`${rolEnPapel(r)} contestó`}>{`${r.por} contestó`}</DichoEnPapel>}{dichas.length > 1 || !q ? ` a «${textoDePregunta(r.pregunta)}»` : ''}:</span>
              <b className="font-semibold">{r.opcion}</b>
              <small className="text-[10.5px] text-[var(--tinta3)]">· {horaCorta(r.hora)}</small>
              {onCambiar && r.porId === persona.id && (
                <button type="button" onClick={() => onCambiar(textoDePregunta(r.pregunta))}
                  className="no-imprimir min-h-12 cursor-pointer text-[11px] text-[var(--tinta)] underline underline-offset-2 sm:min-h-0">Cambiar</button>
              )}
            </li>
          ))}
        </ul>
      )}
      {escalada && revisa && (
        <p className="flex flex-wrap items-center gap-x-1.5 text-[10.5px] text-[var(--tinta2)]" data-escalada>
          <span className="rounded-sm border border-dashed border-[var(--tinta3)] px-1.5">sigue abierta</span>
          {noSupo ? <DichoEnPapel papel={`${rolEnPapel(noSupo)} contestó «No sé»`}>{`${noSupo.por} contestó «No sé»`}</DichoEnPapel> : 'Alguien contestó «No sé»'}{textoEscalada ? ` a «${textoEscalada}»` : ''}: la contesta quien revisa.
        </p>
      )}
      {q && (
        <div role="group" aria-label={q.texto} className="grid gap-1" data-pregunta={q.id}>
          <span className={ROTULO_PREGUNTA}>{q.texto}</span>
          {/* Al lado de la pregunta del oleoducto, la nota del evento: ayuda a contestar, no decide (U2 §4.4, caso 3; B-31). */}
          {q.id === 'oleoducto' && p.causa.tipo === 'evacuacion' && p.causa.texto && (
            <small className="text-[11px] text-[var(--tinta2)]" data-nota-evento>Nota del evento: «{p.causa.texto}»</small>
          )}
          <span className="grid gap-1 sm:flex sm:flex-wrap">
            {q.opciones.map((o, i) => {
              const linea = lineaDe(q, o)
              // En el teléfono, las primeras cinco y «No sé»; las demás detrás de «Más opciones…».
              const escondida = muchas && !todas && i >= A_LA_VISTA && !esNoSe(o)
              return (
                <button key={o.texto} type="button" disabled={ocupado} onClick={() => void contestar(q, o)} className={cn(OPCION, escondida && 'max-sm:hidden')}>
                  {textoDe(q, o)}{linea && <small className="block text-[10px] text-[var(--tinta3)]">{linea}</small>}
                </button>
              )
            })}
            {muchas && !todas && (
              <button type="button" onClick={() => setTodas(true)} className={cn(OPCION, 'sm:hidden')}>Más opciones…</button>
            )}
          </span>
          {q.id === 'evidencia-yacimiento' && (
            <form className="flex flex-wrap items-center gap-1" onSubmit={e => { e.preventDefault(); if (otra.trim()) void conNota(otra.trim()) }}>
              <label className="flex min-w-0 flex-1 items-center gap-1 text-[10.5px] text-[var(--tinta2)]">Otra:
                <input value={otra} onChange={e => setOtra(e.target.value)} className="min-h-12 min-w-0 flex-1 rounded border border-[var(--linea)] bg-[var(--panel)] px-2 text-[11.5px] sm:min-h-8" placeholder="Ej.: la prueba de presión del 30-sep" />
              </label>
              <button type="submit" disabled={ocupado || !otra.trim()} className={cn(OPCION)}>Guardar</button>
            </form>
          )}
          {abiertas.length > 1 && <small className="text-[10.5px] text-[var(--tinta3)]">Después, {abiertas.length === 2 ? 'una pregunta más' : `${abiertas.length - 1} preguntas más`}.</small>}
        </div>
      )}
      {error && <p role="alert" className="text-[11px] text-[var(--tinta)]">{error}</p>}
    </div>
  )
}
