/** Las palabras de la filosofía operacional en pantalla (U2 §8.2-8.3). Solo
 *  palabras: las reglas (el elemento que sale de cada respuesta, la topología
 *  del borrador encima de la configuración, «Todavía no sé», la regla de la
 *  primera firma y la plantilla de la carga) son del motor
 *  (`entities/choke-config.ts`) y llegan por la costura (`shared/api/choke.ts`). */
import type { ClaseElemento, RespuestaTopologia } from '@/shared/api/choke'

/** Un tag de equipo (ISA 5.1) lleva siempre su número: «V-101», «SE-2», «LACT-01».
 *  Un id sin número es la clave interna del esquema de planta («manifold»,
 *  «tanqueAgua»): en pantalla va el nombre del equipo, no la clave (B-29). */
export const esClaveInterna = (id: string) => !/\d/.test(id)

/** Qué diferencia una de otra, en el ⓘ de los filtros (B-49). */
export const EXPLICA_FILTROS = 'Sin responder: nadie lo ha contestado y TRIM solo lo deduce del registro del campo (los pozos y el esquema de planta). Propuesta de TRIM: nadie lo ha contestado, pero TRIM tiene además una prueba propia (las caídas en cascada, el alimentador, la bomba o el registro del equipo) y le pide que la acepte. En los dos casos, «Aceptar» lo pasa al borrador y queda firmado cuando se firma la versión.'

/** El estado de un equipo en la lista: firmado, en el borrador, propuesta de TRIM o sin responder. */
export type EstadoEquipo = 'firmado' | 'contestado' | 'propuesta' | 'sin-responder'
export const NOMBRE_ESTADO: Record<EstadoEquipo, string> = {
  firmado: 'firmado',
  contestado: 'en el borrador',
  propuesta: 'propuesta de TRIM',
  'sin-responder': 'sin responder',
}

/** El texto exacto de cada botón (U2 §8.2), con su aclaración en un segundo
 *  renglón. En el teléfono la aclaración se lee igual: no se corta nada. */
export const BOTON: Record<RespuestaTopologia, { texto: string; aclara?: string }> = {
  uno: { texto: 'A un solo pozo' },
  varios: { texto: 'A varios pozos' },
  todos: { texto: 'A todo el campo' },
  tercero: { texto: 'Es de otro dueño, más allá de la batería', aclara: 'oleoducto, transportador, cliente' },
  frontera: { texto: 'Es el punto de entrega', aclara: 'de la brida de salida de la batería hacia afuera' },
  acometida: { texto: 'Es la llegada de la energía del proveedor', aclara: 'acometida, subestación de llegada' },
  'no-se': { texto: 'Todavía no sé', aclara: 'sus paradas quedan sin tramo y lo preguntan: TRIM no lo adivina' },
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
