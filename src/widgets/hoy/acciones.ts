import { useApp, usePersona } from '@/app/store'
import { PASOS } from '@/shared/api/arbol'
// «Deshacer» es una escritura del contrato que la vista llama directo (como las del
// store): `POST /api/anh/paradas/deshacer`, con el rol que se está viendo.
import { deshacerAnh } from '@/shared/api/escrituras'
import type { PreguntaHoy, TareaHoy } from '@/shared/api/hoy'
import type { ParteId } from '@/entities/partes'
import type { RespuestaHoy } from './Pregunta'
import type { Envio, Resultado } from './envio'
import { vibrar } from './palabras'

const y = (xs: readonly string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}`)
const a = (r: { ok: true } | { ok: false; error: string }): Resultado => (r.ok ? { ok: true } : { ok: false, error: r.error })

/** Contestar desde Hoy: un toque registra y sale el aviso con «Deshacer». La
 *  respuesta se sostiene mientras dura el aviso y después se escribe: al libro
 *  (`POST /api/paradas/:evento/respuesta`) o al árbol (`POST /api/anh/paradas/:id/respuesta`,
 *  como `widgets/arbol/Preguntas.tsx`). «Todavía no sé» en el libro no escribe
 *  nada: la pregunta queda abierta y vuelve en la próxima ronda de WhatsApp. */
export function useResponder(envio: Envio) {
  const responder = useApp(s => s.responder), responderAnh = useApp(s => s.responderAnh)
  return (q: PreguntaHoy, r: RespuestaHoy) => {
    vibrar()
    if (q.via === 'libro' && q.libro) {
      const l = q.libro
      if (r.via === 'no-se') return envio.registrar({ id: q.id, texto: `${q.equipo} queda abierta: se la vuelven a preguntar en la próxima ronda.`, local: true })
      if (r.via !== 'libro') return
      return envio.registrar({ id: q.id, texto: `Registrado: ${r.dicho} en ${q.equipo}`,
        enviar: async () => a(await responder({ evento: l.evento, campoId: l.campoId, equipo: l.equipo, texto: r.texto,
          ...(r.parte ? { parte: r.parte as ParteId, modo: r.modo } : {}) })) })
    }
    if (!q.anh || r.via === 'libro') return
    const x = q.anh
    const opcion = r.via === 'anh' ? r.opcion : r.opcion
    if (!opcion) return
    envio.registrar({
      id: q.id,
      texto: r.via === 'anh' ? `Registrado: ${r.dicho.charAt(0).toLowerCase()}${r.dicho.slice(1)} en ${q.equipo}` : `«Todavía no sé» en ${q.equipo}: lo ve su supervisor.`,
      enviar: async () => a(await responderAnh(x.fila, { pregunta: x.pregunta, opcion, cadena: x.cadena,
        ...(x.aplicarALaCascada ? { aplicarALaCascada: true, ids: x.ids ?? [] } : { aplicarAlEvento: true }) })),
    })
  }
}

/** «Confirmar las 2»: se escribe en el acto (`POST /api/anh/paradas/confirmar`) y
 *  «Deshacer» manda la escritura nueva con los consecutivos de lo que subió (D1). */
export function useConfirmar(envio: Envio) {
  const confirmarAnh = useApp(s => s.confirmarAnh), rolId = useApp(s => s.rolId)
  const persona = usePersona()
  return async (t: TareaHoy): Promise<Resultado> => {
    const c = t.accion
    if (c?.tipo !== 'confirmar') return { ok: false, error: 'Esta tarjeta no confirma nada.' }
    const r = await confirmarAnh({ ids: c.ids, cadena: c.cadena })
    if (!r.ok) return { ok: false, error: r.error }
    vibrar()
    const ns = [...new Set(r.paradas.flatMap(p => PASOS.map(x => p.clasificacion[x])
      .filter(d => d?.procedencia === 'confirmado' && d.porId === persona.id && (!r.lote || d.lote === r.lote.id) && d.n !== undefined)
      .map(d => d!.n!)))]
    envio.registrar({
      id: t.id, texto: `Confirmadas ${y(c.pozos)}`,
      ...(ns.length ? { deshacer: async () => a(await deshacerAnh({ rolId }, { ids: c.ids, n: ns })) } : {}),
    })
    return { ok: true }
  }
}
