import { useCallback } from 'react'
import { useApp, usePersona } from '@/app/store'
import { PASOS } from '@/shared/api/arbol'
// «Deshacer» es una escritura del contrato que la vista llama directo (como las del
// store): `POST /api/anh/paradas/deshacer`, con el rol que se está viendo.
import { deshacerAnh } from '@/shared/api/escrituras'
import type { PreguntaHoy, TareaHoy } from '@/shared/api/hoy'
import type { ParteId } from '@/entities/partes'
import type { RespuestaHoy } from './Pregunta'
import type { Envio, Pendiente, Resultado } from './envio'
import { vibrar } from './palabras'

const y = (xs: readonly string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}`)
const a = (r: { ok: true } | { ok: false; error: string }): Resultado => (r.ok ? { ok: true } : { ok: false, error: r.error })

/** La escritura de una respuesta que se sostenía (P-08): al libro
 *  (`POST /api/paradas/:evento/respuesta`) o al árbol (`POST /api/anh/paradas/:id/respuesta`),
 *  con `keepalive` al salir de la página. Una que vuelve a mandarse al regresar y ya
 *  había llegado (409: «la primera respuesta gana») no es un error: ya quedó. */
export function useEscribir() {
  const responder = useApp(s => s.responder), responderAnh = useApp(s => s.responderAnh)
  return useCallback(async (p: Pendiente, o?: { keepalive?: boolean }): Promise<Resultado> => {
    const { parte, ...resto } = p.via === 'libro' ? p.cuerpo : { parte: undefined }
    const r = p.via === 'libro'
      ? await responder({ ...(resto as Omit<typeof p.cuerpo, 'parte'>), ...(parte ? { parte: parte as ParteId } : {}) }, o)
      : await responderAnh(p.fila, p.cuerpo, o)
    return !r.ok && 'estado' in r && r.estado === 409 ? { ok: true } : a(r)
  }, [responder, responderAnh])
}

/** Contestar desde Hoy: un toque y sale el aviso con «Deshacer». La respuesta se
 *  sostiene mientras dura el aviso (y se guarda en el navegador) y después se
 *  escribe; el aviso no dice «Registrado» hasta que se escribió (P-08). «Todavía no
 *  sé» en el libro no escribe nada: la pregunta queda abierta y vuelve en la
 *  próxima ronda de WhatsApp. */
export function useResponder(envio: Envio) {
  const rolId = useApp(s => s.rolId)
  return (q: PreguntaHoy, r: RespuestaHoy) => {
    vibrar()
    if (q.via === 'libro' && q.libro) {
      const l = q.libro
      if (r.via === 'no-se') return envio.registrar({ id: q.id, texto: `${q.equipo} queda abierta: se la vuelven a preguntar en la próxima ronda.`, local: true })
      if (r.via !== 'libro') return
      const dicho = `${r.dicho} en ${q.equipo}`
      return envio.registrar({ id: q.id, texto: `Se registra en 5 s: ${dicho}`, escrito: `Registrado: ${dicho}`,
        pendiente: { via: 'libro', rolId, dicho, cuerpo: { evento: l.evento, campoId: l.campoId, equipo: l.equipo, texto: r.texto,
          ...(r.parte ? { parte: r.parte, ...(r.modo ? { modo: r.modo } : {}) } : {}) } } })
    }
    if (!q.anh || r.via === 'libro') return
    const x = q.anh
    const opcion = r.opcion
    if (!opcion) return
    const dicho = r.via === 'anh' ? `${r.dicho.charAt(0).toLowerCase()}${r.dicho.slice(1)} en ${q.equipo}` : `«Todavía no sé» en ${q.equipo}`
    envio.registrar({
      id: q.id,
      texto: r.via === 'anh' ? `Se registra en 5 s: ${dicho}` : `Se registra en 5 s: ${dicho} (lo ve su supervisor)`,
      escrito: r.via === 'anh' ? `Registrado: ${dicho}` : `Registrado: ${dicho}. Lo ve su supervisor.`,
      pendiente: { via: 'anh', rolId, dicho, fila: x.fila, cuerpo: { pregunta: x.pregunta, opcion, cadena: x.cadena,
        ...(x.aplicarALaCascada ? { aplicarALaCascada: true as const, ids: x.ids ?? [] } : { aplicarAlEvento: true as const }) } },
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
