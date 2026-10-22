/** La topología en el borrador de la configuración: «¿A qué pozos sirve este
 *  equipo?» (U2 §8.2). El administrador contesta un HECHO y TRIM deduce el
 *  tramo con el criterio único de Edinson (dedicado = pozo, compartido =
 *  planta; CHOKE-COMPLETO §2): nadie escoge «pozo» o «planta». Las reglas que
 *  deducen (`alcancePorPozos`, `chokeDeAlcance`, `casoBordeDe`) son del motor y
 *  llegan por la costura; aquí solo se arma lo que se va a firmar y se dice en
 *  palabras. */
import {
  alcancePorPozos, chokeDeAlcance, casoBordeDe, NOMBRE_CHOKE, DONDE_CHOKE,
  type ChokeAnh, type ChokeDeElemento, type ClaseElemento,
} from '@/shared/api/choke'
import type { Config } from '@/entities/configuracion'
import { n0 } from '@/shared/lib/formato'

/** El estado de un equipo en la lista: firmado, en el borrador, propuesta de TRIM o sin responder. */
export type EstadoEquipo = 'firmado' | 'contestado' | 'propuesta' | 'sin-responder'
export const NOMBRE_ESTADO: Record<EstadoEquipo, string> = {
  firmado: 'firmado',
  contestado: 'en el borrador',
  propuesta: 'propuesta de TRIM',
  'sin-responder': 'sin responder',
}

/** Las respuestas posibles, en el orden de U2 §8.2. */
export type Respuesta = 'uno' | 'varios' | 'todos' | 'tercero' | 'frontera' | 'acometida' | 'no-se'
export const RESPUESTAS: readonly Respuesta[] = ['uno', 'varios', 'todos', 'tercero', 'frontera', 'acometida', 'no-se']

/** El texto exacto de cada botón (U2 §8.2), con su aclaración en un segundo
 *  renglón. En el teléfono la aclaración se lee igual: no se corta nada. */
export const BOTON: Record<Respuesta, { texto: string; aclara?: string }> = {
  uno: { texto: 'A un solo pozo' },
  varios: { texto: 'A varios pozos' },
  todos: { texto: 'A todo el campo' },
  tercero: { texto: 'Es de otro dueño, más allá de la batería', aclara: 'oleoducto, transportador, cliente' },
  frontera: { texto: 'Es el punto de entrega', aclara: 'de la brida de salida de la batería hacia afuera' },
  acometida: { texto: 'Es la llegada de la energía del proveedor', aclara: 'acometida, subestación de llegada' },
  'no-se': { texto: 'Todavía no sé' },
}

/** Lo contestado de un equipo: la respuesta y el elemento que queda en la
 *  topología del borrador. `elemento: null` es «Todavía no sé»: el equipo sale
 *  de la topología del campo. */
export interface RespuestaEquipo { r: Respuesta; elemento: ChokeDeElemento | null }

/** Lo que el borrador lleva de la topología de un campo: la que regía cuando
 *  se empezó a contestar (la firmada, o la que TRIM deduce del registro) y lo
 *  contestado encima, por elemento. */
export interface TopologiaEnBorrador {
  base: ChokeDeElemento[]
  /** La que regía era la firmada (true) o la deducida del registro (false). */
  firmada: boolean
  respuestas: Record<string, RespuestaEquipo>
}

/** «en el pozo», «en la planta o estación», «afuera», «en el yacimiento»: las palabras de U2 §1.1. */
export const dondeTramo = (k: ChokeAnh) => {
  const t = NOMBRE_CHOKE[k].split(':')[0]!
  return `${t[0]!.toLowerCase()}${t.slice(1)}`
}
/** Lo mismo, corto, para el renglón de la lista: «en el pozo», «en la planta», «afuera». */
export const dondeCorto = (k: ChokeAnh) => (k === 'exportacion' ? 'afuera' : DONDE_CHOKE[k])

/** «LC-01, LC-02 y LC-03». */
export const lista = (xs: readonly string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}`)

/** ¿Sirve a todos los pozos del campo? */
const aTodos = (pozos: readonly string[] | undefined, todos: readonly string[]) =>
  todos.length > 1 && todos.every(p => (pozos ?? []).includes(p))

/** El elemento que sale de una respuesta. El alcance lo deduce TRIM del hecho
 *  (uno, varios, otro dueño, la brida de salida) y el tramo, del alcance; el
 *  caso de borde (2 o 3 pozos de una misma locación) lo marca la misma regla
 *  de la carga por CSV. Lo de otro dueño, la frontera y la acometida sirven a
 *  todo el campo, como en la carga (`leerTopologia`). */
export function elementoDeRespuesta(elemento: string, campoId: string, r: Respuesta, pozos: readonly string[],
  todos: readonly string[], locacion: (pozo: string) => string | undefined): ChokeDeElemento | null {
  if (r === 'no-se') return null
  const escogidos = new Set(pozos)
  const servidos = r === 'uno' || r === 'varios' ? todos.filter(p => escogidos.has(p)) : [...todos]
  const alcance = r === 'tercero' ? 'tercero' : r === 'frontera' ? 'frontera' : alcancePorPozos(servidos)
  const e: ChokeDeElemento = { elemento, campoId, alcance, choke: chokeDeAlcance(alcance), pozos: servidos }
  const borde = casoBordeDe(e, locacion)
  return borde ? { ...e, casoBorde: borde } : e
}

/** La respuesta que corresponde a un elemento que ya rige: es la que la
 *  pregunta muestra marcada. Sin elemento, «Todavía no sé». */
export function respuestaDe(e: Pick<ChokeDeElemento, 'alcance' | 'pozos'> | null | undefined, todos: readonly string[]): { r: Respuesta; pozos: string[] } {
  if (!e) return { r: 'no-se', pozos: [] }
  if (e.alcance === 'tercero' || e.alcance === 'frontera') return { r: e.alcance, pozos: [] }
  const ps = [...new Set(e.pozos ?? [])]
  if (e.alcance === 'dedicado') return { r: 'uno', pozos: ps.slice(0, 1) }
  return aTodos(ps, todos) ? { r: 'todos', pozos: ps } : { r: 'varios', pozos: ps }
}

/** La frase que se muestra al instante (U2 §8.2). Con «Todavía no sé» se
 *  dice lo que hace hoy el motor: sin elemento en la topología, el tramo de
 *  su parada sale de la regla por tipo de falla y lo confirma una persona. */
export function fraseDe(r: Respuesta, e: ChokeDeElemento | null, todos: readonly string[]): string {
  if (!e) return 'Mientras no lo diga, sus paradas toman el tramo de la regla por tipo de falla, y una persona lo confirma en Identificar.'
  const donde = `Si para, se traba ${dondeTramo(e.choke)}`
  if (r === 'acometida') return `${donde}. Quién respondió (el proveedor o nosotros) se pregunta en cada parada.`
  if (e.choke === 'exportacion') return `${donde}.`
  const ps = [...new Set(e.pozos ?? [])]
  if (e.choke === 'pozo') return `${donde}: es solo de ${ps[0] ?? 'un pozo'}.`
  return `${donde}: sirve a ${aTodos(ps, todos) ? `los ${n0(ps.length)} pozos` : `${n0(ps.length)} pozos`}.`
}

/** Lo que TRIM deduce, en un renglón de la lista (U2 §8.2):
 *  «sirve a todo el campo (18 pozos) → se traba en la planta». */
export function renglonDe(e: ChokeDeElemento | null, r: Respuesta | undefined, todos: readonly string[]): string {
  if (!e) return 'sin topología: el tramo sale de la regla por tipo de falla'
  const tramo = `→ se traba ${dondeCorto(e.choke)}`
  if (e.alcance === 'tercero') return `de otro dueño, más allá de la batería ${tramo}`
  if (e.alcance === 'frontera') return `punto de entrega ${tramo}`
  const ps = [...new Set(e.pozos ?? [])]
  if (r === 'acometida') return `llegada de la energía (${n0(ps.length)} pozos) ${tramo}`
  if (e.alcance === 'dedicado') return `sirve solo a ${ps[0] ?? 'un pozo'} ${tramo}`
  if (aTodos(ps, todos)) return `sirve a todo el campo (${n0(ps.length)} pozos) ${tramo}`
  return `sirve a ${ps.length <= 3 ? lista(ps) : `${n0(ps.length)} pozos`} ${tramo}`
}

/** El elemento tal como se firma: sin el nombre ni la clase que trae la vista. */
const comoSeFirma = (e: ChokeDeElemento, campoId: string): ChokeDeElemento => ({
  elemento: e.elemento, alcance: e.alcance, choke: chokeDeAlcance(e.alcance), campoId,
  ...(e.pozos ? { pozos: [...e.pozos] } : {}), ...(e.casoBorde ? { casoBorde: e.casoBorde } : {}),
})

/** La configuración con la topología del borrador encima. Un campo cuya
 *  topología regía deducida del registro la estrena entera: si trajera solo lo
 *  contestado, el motor dejaría sin topología a los demás equipos del campo
 *  (una topología firmada manda entera, `topologiaDe`). Uno con topología
 *  firmada cambia solo lo contestado. «Todavía no sé» quita el equipo. */
export function conTopologia(c: Config, borrador: Readonly<Record<string, TopologiaEnBorrador>>): Config {
  const campos = Object.entries(borrador).filter(([, t]) => Object.keys(t.respuestas).length > 0)
  if (!campos.length) return c
  let topo = [...(c.topologia ?? [])]
  for (const [campoId, t] of campos) {
    const respondido = (id: string) => Object.hasOwn(t.respuestas, id)
    const nuevo = (id: string) => t.respuestas[id]!.elemento
    const enBase = new Set(t.base.map(e => e.elemento))
    const extra = Object.keys(t.respuestas).filter(id => !enBase.has(id)).flatMap(id => (nuevo(id) ? [nuevo(id)!] : []))
    if (!t.firmada) {
      const delCampo = t.base.flatMap(e => (!respondido(e.elemento) ? [comoSeFirma(e, campoId)] : nuevo(e.elemento) ? [nuevo(e.elemento)!] : []))
      topo = [...topo.filter(e => e.campoId !== campoId), ...delCampo, ...extra]
    } else {
      const cambian = t.base.filter(e => respondido(e.elemento)).flatMap(e => (nuevo(e.elemento) ? [nuevo(e.elemento)!] : []))
      topo = [...topo.filter(e => !(e.campoId === campoId && respondido(e.elemento))), ...cambian, ...extra]
    }
  }
  return { ...c, topologia: topo }
}

/** Lo que falta contestar en un campo antes de firmar: TRIM propone, pero no
 *  firma nada solo (U2 §8.3). Solo cuenta en un campo que estrena su topología
 *  (con una firmada, cada equipo ya lo contestó alguien). */
export function pendientesDe(t: TopologiaEnBorrador | undefined): ChokeDeElemento[] {
  if (!t || t.firmada || !Object.keys(t.respuestas).length) return []
  return t.base.filter(e => !Object.hasOwn(t.respuestas, e.elemento))
}

/** Las palabras de la columna de pozos en la plantilla, las mismas que lee la
 *  carga (U2 §8.3): «todos», «otro dueño», «punto de entrega» o la lista. */
export function pozosEnPlantilla(e: ChokeDeElemento, todos: readonly string[]): string {
  if (e.alcance === 'tercero') return 'otro dueño'
  if (e.alcance === 'frontera') return 'punto de entrega'
  return aTodos(e.pozos, todos) ? 'todos' : [...new Set(e.pozos ?? [])].join(' ')
}

/** Los tipos de equipo, para agrupar la lista y aceptar en lote solo dentro de
 *  un mismo tipo (U2 §8.3). */
export const GRUPO: Record<ClaseElemento | 'otro', string> = {
  levantamiento: 'Pozos: su levantamiento', pozo: 'Pozos que fluyen solos', alimentador: 'Alimentadores eléctricos',
  bomba: 'Bombas', proceso: 'Proceso', tanque: 'Tanques', medicion: 'Medición y despacho', servicio: 'Servicios del campo',
  salida: 'Salidas de la batería', inyectores: 'Pozos inyectores', otro: 'Otros equipos',
}
export const ORDEN_GRUPO: ReadonlyArray<ClaseElemento | 'otro'> = [
  'levantamiento', 'pozo', 'alimentador', 'servicio', 'proceso', 'tanque', 'medicion', 'bomba', 'inyectores', 'salida', 'otro',
]
