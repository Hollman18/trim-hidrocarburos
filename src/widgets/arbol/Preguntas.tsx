import { useState } from 'react'
import { useApp } from '@/app/store'
import { ROLES_QUE_CONTESTAN, esNoSe, type PreguntaCampo, type OpcionCampo } from '@/shared/api/arbol'
import { cn } from '@/shared/lib/cn'
import { OPCION_CHOKE, LINEA_CHOKE, lista } from './palabras'
import type { Grupo } from './grupos'

/** Botón de una respuesta: en el teléfono, alto de dedo (U1 §2.6). */
export const OPCION = 'min-h-10 cursor-pointer rounded-sm border border-[var(--linea)] bg-[var(--panel)] px-2 py-1 text-left text-[11px] hover:bg-[var(--panel2)] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-8'
const ROTULO_PREGUNTA = 'text-[11.5px] font-semibold text-[var(--tinta)]'

/** Las preguntas de campo de una parada (U1 §2.4), con el texto y las opciones
 *  del motor, nunca las 117 causas. Cada rol ve las que contesta
 *  (`ROLES_QUE_CONTESTAN`): al operador nunca se le pregunta dónde se trabó
 *  (U2 §4.5). Cada respuesta va al servidor (`POST
 *  /api/anh/paradas/:id/respuesta`), que corre el motor: lo que la opción deja
 *  queda dicho por quien contestó, y la pregunta que abre («¿Qué lo paró?» →
 *  «¿De dónde vino el corte?» → «¿Qué fue, exactamente?») llega con la vista.
 *  «No sé» también se guarda: la pregunta queda abierta y escala a quien revisa
 *  (U1 §2.4: forzar certeza fabrica datos falsos). Una respuesta vale para la
 *  parada, su evento o su cascada (una decisión, Unicidad, C24 p.5). */
export function Preguntas({ g, rolId, onHecho }: { g: Grupo; rolId: string; onHecho: (texto: string) => void }) {
  const p = g.primera
  const responderAnh = useApp(s => s.responderAnh), yacimientoAnh = useApp(s => s.yacimientoAnh)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const [otra, setOtra] = useState('')

  const contesta = (q: PreguntaCampo) => ROLES_QUE_CONTESTAN[q.quien].includes(rolId)
  const visibles = p.propuesta.preguntas.filter(contesta)
  const escalada = p.propuesta.escalada
  // Quién dijo «No sé» y a qué: está en la conversación de la parada.
  const noSupo = escalada && [...(p.clasificacion.respuestas ?? [])].reverse().find(r => r.noSe && r.pregunta === escalada.pregunta)
  const textoEscalada = escalada && p.propuesta.preguntas.find(q => q.id === escalada.pregunta)?.texto
  const revisa = ROLES_QUE_CONTESTAN.revisa.includes(rolId)
  if (!visibles.length && !(escalada && revisa)) return null

  const alcance = g.cascada ? { aplicarALaCascada: true } : { aplicarAlEvento: true }
  const pozos = lista(g.pozos)
  const contestar = async (q: PreguntaCampo, o: OpcionCampo) => {
    setOcupado(true); setError('')
    const r = await responderAnh(p.id, { pregunta: q.id, opcion: o.texto, ...alcance, cadena: g.cadena })
    setOcupado(false)
    if (!r.ok) return setError(r.error)
    onHecho(esNoSe(o)
      ? `Guardado en ${pozos}: «No sé» a «${q.texto}». La pregunta queda abierta y la revisa ${revisa ? 'otra persona que revisa' : 'su supervisor'}.`
      : `Guardado en ${pozos}: «${o.texto}».`)
  }
  // «¿Qué lo muestra?» con una nota escrita: va por «En el yacimiento» (producción o confiabilidad).
  const conNota = async (nota: string) => {
    setOcupado(true); setError('')
    const r = await yacimientoAnh(p.id, { evidencia: nota, ...(g.cascada ? {} : { aplicarAlEvento: true }), cadena: g.cadena })
    setOcupado(false)
    if (!r.ok) return setError(r.error)
    setOtra('')
    onHecho(`Guardado en ${pozos}: en el yacimiento, por «${nota}».`)
  }
  // El texto de una opción: el del motor; las del tramo, en las palabras de U2 §1.5.
  const textoDe = (q: PreguntaCampo, o: OpcionCampo) => (q.id === 'choke' && o.deja.choke ? OPCION_CHOKE[o.deja.choke] : o.texto)
  const lineaDe = (q: PreguntaCampo, o: OpcionCampo) => (q.id === 'choke' && o.deja.choke ? LINEA_CHOKE[o.deja.choke] : undefined)

  return (
    <div className="mt-2 grid gap-2 border-t border-dashed border-[var(--linea2)] pt-2" data-preguntas>
      {escalada && revisa && (
        <p className="flex flex-wrap items-center gap-x-1.5 text-[10.5px] text-[var(--tinta2)]" data-escalada>
          <span className="rounded-sm border border-dashed border-[var(--tinta3)] px-1.5">sigue abierta</span>
          {noSupo ? `${noSupo.por} contestó «No sé»` : 'Alguien contestó «No sé»'}{textoEscalada ? ` a «${textoEscalada}»` : ''}: la contesta quien revisa.
        </p>
      )}
      {visibles.map(q => (
        <div key={q.id} role="group" aria-label={q.texto} className="grid gap-1" data-pregunta={q.id}>
          <span className={ROTULO_PREGUNTA}>{q.texto}</span>
          <span className="flex flex-wrap gap-1">
            {q.opciones.map(o => {
              const linea = lineaDe(q, o)
              return (
                <button key={o.texto} type="button" disabled={ocupado} onClick={() => void contestar(q, o)} className={OPCION}>
                  {textoDe(q, o)}{linea && <small className="block text-[10px] text-[var(--tinta3)]">{linea}</small>}
                </button>
              )
            })}
          </span>
          {q.id === 'evidencia-yacimiento' && (
            <form className="flex flex-wrap items-center gap-1" onSubmit={e => { e.preventDefault(); if (otra.trim()) void conNota(otra.trim()) }}>
              <label className="flex min-w-0 flex-1 items-center gap-1 text-[10.5px] text-[var(--tinta2)]">Otra:
                <input value={otra} onChange={e => setOtra(e.target.value)} className="min-h-10 min-w-0 flex-1 rounded border border-[var(--linea)] bg-[var(--panel)] px-2 text-[11.5px] sm:min-h-8" placeholder="Ej.: la prueba de presión del 30-sep" />
              </label>
              <button type="submit" disabled={ocupado || !otra.trim()} className={cn(OPCION)}>Guardar</button>
            </form>
          )}
        </div>
      ))}
      {error && <p role="alert" className="text-[11px] text-[var(--tinta)]">{error}</p>}
    </div>
  )
}
