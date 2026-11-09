import { useSesion, sesion, cambiarSesion } from './sesion'
import { useDato, versionDe } from './consulta'
import { FUENTE, pedirJson, ErrorApi, mensajeDe } from './fuente'
import { deRespuesta } from './cable'
import { PLANTA_EVENTO, PLANTA_ARRANQUE, R_EVENTO_PLANTA } from './contrato'
import {
  vistaEventosPlanta, aceptarPrueba, aceptarTerminar, aceptarRespuestaPlanta, avisoPlanta, rolesAvisados, queParo,
  type EventoPlantaVista, type RegistroEventoPlanta, type TipoApagon, type AvisoPlanta, type Quien,
} from '@/entities/evento-planta'
import { vistaArranque, aceptarFase, duracion, fraseMargen, NOMBRE_FASE, type ArranqueVista, type FaseCronometro } from '@/entities/arranque'
import { rolExacto } from '@/entities/roles'
import { rolVisible } from '@/shared/config/producto'
import { personaDelRol, camposAsignados } from '@/entities/usuarios'
import { AHORA } from '@/entities/reloj'

/** LA COSTURA DEL EVENTO DE PLANTA (Fase 4 de facilidades: el apagón).
 *
 *  - `GET /api/vistas/planta/evento?campos=`: los eventos abiertos, con lo que respondió el campo.
 *  - `POST /api/planta/eventos/prueba` `{ campoId, tipo }`: el administrador prueba la cadena del aviso
 *    (`conector:configurar`); `POST …/:id/terminar` la cierra.
 *  - `POST /api/planta/eventos/:id/respuesta` `{ respuesta }`: el operador dice si ve luz (`causa:declarar`).
 *  - Fase 6: `GET /api/vistas/planta/arranque?campos=` (el orden de arranque, el cronómetro y el margen N-1) y
 *    `POST /api/planta/eventos/:id/fase` `{ fase }` (el supervisor cierra una fase del arranque, `causa:declarar`).
 *
 *  El servidor detecta el apagón en vivo con la foto que manda el gateway (`eventoDePlanta`) y avisa por
 *  notificación push (push.ts). En el demo no hay gateway: este módulo ES el servidor y solo hay
 *  pruebas, que viven en la sesión y nunca entran al libro.
 *
 *  Lo que dice cada rol sale de `avisoPlanta` (entities/evento-planta.ts): un mismo evento dicho distinto. */

export type { EventoPlantaVista, RegistroEventoPlanta, TipoApagon, AvisoPlanta, ArranqueVista, FaseCronometro }
export { queParo, duracion, fraseMargen, NOMBRE_FASE }

const NINGUNO: readonly RegistroEventoPlanta[] = Object.freeze([])
const registroDe = (s: { eventosPlanta?: readonly RegistroEventoPlanta[] }) => s.eventosPlanta ?? NINGUNO

/** D3: el cliente tiene responsable de energía si el rol está encendido. */
export const conResponsableDeEnergia = (): boolean => rolVisible('ener')

/** `GET /api/vistas/planta/evento`: la respuesta del demo, la misma regla que el backend. */
export const pedirEventosPlanta = (q: { campos: string[] }, registros: readonly RegistroEventoPlanta[] | undefined): EventoPlantaVista[] =>
  vistaEventosPlanta(q.campos, registros ?? NINGUNO, sesion().ctx.config, AHORA.getTime())

export function useEventosPlanta(campos: string[]): EventoPlantaVista[] {
  const registros = useSesion(registroDe)
  return useDato(PLANTA_EVENTO, { campos }, String(versionDe(registros)), () => pedirEventosPlanta({ campos }, registros))
}

/** `GET /api/vistas/planta/arranque`: el orden de arranque de cada evento abierto, con su cronómetro. El demo no
 *  tiene tabla de generación: el margen N-1 sale `null` y la vista dice qué falta. */
export const pedirArranques = (q: { campos: string[] }, registros: readonly RegistroEventoPlanta[] | undefined): ArranqueVista[] => {
  const rs = registros ?? NINGUNO
  return pedirEventosPlanta(q, rs).map(ev => vistaArranque(ev, rs.find(r => r.id === ev.id)?.fases ?? [], AHORA.getTime()))
}

export function useArranques(campos: string[]): ArranqueVista[] {
  const registros = useSesion(registroDe)
  return useDato(PLANTA_ARRANQUE, { campos }, String(versionDe(registros)), () => pedirArranques({ campos }, registros))
}

/** Lo que le toca leer a un rol de un evento; undefined si a ese rol no se le avisa. */
export const avisoParaRol = (ev: EventoPlantaVista, rolId: string): AvisoPlanta | undefined => avisoPlanta(ev, rolId, conResponsableDeEnergia())
/** A quién se le avisa (para la notificación push). */
export const rolesQueSeAvisan = (): readonly string[] => rolesAvisados(conResponsableDeEnergia())

/** La hora del servidor del demo (el reloj está congelado). */
const horaDelServidor = () => `${new Date(AHORA.getTime() - 5 * 3_600_000).toISOString().slice(0, 19)}-05:00`

/** El reloj del demo está congelado; el cronómetro corre con el de la máquina desde que se abrió TRIM, para
 *  que cada fase tenga su duración de verdad. Con servidor, la hora es la del servidor. */
const ABIERTO = Date.now()
const horaQueCorre = () => `${new Date(AHORA.getTime() + Date.now() - ABIERTO - 5 * 3_600_000).toISOString().slice(0, 19)}-05:00`

export type ResultadoEvento = { ok: true; evento: RegistroEventoPlanta } | { ok: false; error: string; estado?: number; codigo?: string }

function quien(rolId: string): Quien {
  const s = sesion(), rol = rolExacto(rolId), persona = personaDelRol(s.usuarios, rolId)
  return {
    ...(rol ? { rol: { id: rol.id, nombre: rol.nombre, puede: rol.puede } } : {}),
    ...(persona ? { persona: { nombre: persona.nombre } } : {}),
    campos: rol ? camposAsignados(rol, s.usuarios).map(x => x.id) : [],
  }
}

/** Guarda el registro como quedó (en el demo, o la copia de lo que respondió el servidor). */
function guardar(e: RegistroEventoPlanta) {
  const rs = registroDe(sesion())
  cambiarSesion({ eventosPlanta: rs.some(x => x.id === e.id) ? rs.map(x => (x.id === e.id ? e : x)) : [...rs, e] })
}

async function escribir(rolId: string, ruta: string, cuerpo: object, demo: (rs: readonly RegistroEventoPlanta[], hora: string) => ReturnType<typeof aceptarPrueba>): Promise<ResultadoEvento> {
  if (FUENTE === 'http') {
    try {
      const r = deRespuesta(R_EVENTO_PLANTA, await pedirJson(ruta, undefined, { metodo: 'POST', cuerpo, cabeceras: { 'x-rol': rolId } }))
      guardar(r.evento)
      return { ok: true, evento: r.evento }
    } catch (e) {
      if (e instanceof ErrorApi) return { ok: false, estado: e.estado, ...(e.codigo ? { codigo: e.codigo } : {}), error: [403, 404, 409, 422].includes(e.estado) ? e.message : `No se guardó: ${e.message}.` }
      return { ok: false, estado: 0, error: `No se guardó: ${mensajeDe(e)}.` }
    }
  }
  const r = demo(registroDe(sesion()), horaDelServidor())
  if (!r.ok) return r
  guardar(r.evento)
  return r
}

/** `POST /api/planta/eventos/prueba`. */
export const probarApagon = (rolId: string, campoId: string, tipo: TipoApagon) =>
  escribir(rolId, '/planta/eventos/prueba', { campoId, tipo }, (rs, h) => aceptarPrueba({ campoId, tipo }, quien(rolId), rs, h))
/** `POST /api/planta/eventos/:id/terminar`. */
export const terminarPrueba = (rolId: string, id: string) =>
  escribir(rolId, `/planta/eventos/${encodeURIComponent(id)}/terminar`, {}, (rs, h) => aceptarTerminar(id, quien(rolId), rs, h))
/** `POST /api/planta/eventos/:id/respuesta`. */
export const responderPlanta = (rolId: string, id: string, respuesta: 'Sí' | 'No') =>
  escribir(rolId, `/planta/eventos/${encodeURIComponent(id)}/respuesta`, { respuesta }, (rs, h) => aceptarRespuestaPlanta(id, { respuesta }, quien(rolId), rs, h))
/** `POST /api/planta/eventos/:id/fase`. */
export const marcarFase = (rolId: string, id: string, fase: FaseCronometro) =>
  escribir(rolId, `/planta/eventos/${encodeURIComponent(id)}/fase`, { fase }, rs => aceptarFase(id, { fase }, quien(rolId), rs, horaQueCorre()))
