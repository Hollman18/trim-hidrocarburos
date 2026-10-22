import { CHOKES_Y_SIN_ASIGNAR, type ChokeOSinAsignar } from '@/shared/api/choke'
import { n0 } from '@/shared/lib/formato'

/* Las palabras y los rellenos de «¿Dónde se trabó?» de un período (U2 §1.1,
   §7.4 y §9.2). Los comparten el Resumen del gerente, Diferidos y sus barras
   (tramos.tsx): las mismas palabras y el mismo orden en todas partes, el de la
   tubería (yacimiento, pozos, planta, afuera) y, aparte, lo sin identificar.
   Aquí no se calcula nada: se dice el reparto que da el motor. */

/** Cómo se dice cada tramo en una lista corta (la barra, el teléfono). */
export const CORTO_TRAMO: Record<ChokeOSinAsignar, string> = {
  reservorio: 'yacimiento', pozo: 'pozos', planta: 'planta', exportacion: 'afuera', 'sin-asignar': 'sin identificar',
}
/** Cómo se dice en la leyenda y en lo que lee el lector de pantalla (U2 §9.2). */
export const LARGO_TRAMO: Record<ChokeOSinAsignar, string> = {
  reservorio: 'en el yacimiento', pozo: 'en los pozos', planta: 'en la planta o estación', exportacion: 'afuera', 'sin-asignar': 'sin identificar',
}

/** Rayado de «sin identificar»: el mismo de los Paretos. */
export const RAYADO = 'repeating-linear-gradient(45deg, var(--tinta3), var(--tinta3) 2px, transparent 2px, transparent 4px)'
/** El relleno de cada tramo: grises, del más oscuro al más claro en el orden
 *  de la tubería (ISA-101: el tramo que más pesa no es una alarma). El
 *  yacimiento va en la tinta, para no confundirse con los pozos (█ y ▓ de U2
 *  §9.2); lo sin identificar, rayado. */
export const RELLENO: Record<ChokeOSinAsignar, string> = {
  reservorio: 'var(--tinta)', pozo: 'var(--dato-2)', planta: 'var(--dato-4)', exportacion: 'var(--dato-5)', 'sin-asignar': RAYADO,
}

/** Los tramos que tienen barriles, en el orden fijo. Un tramo en cero va solo
 *  en la leyenda, nunca como segmento vacío (U2 §12, punto 3). */
export const conBarriles = (v: Partial<Record<ChokeOSinAsignar, number>>): ChokeOSinAsignar[] =>
  CHOKES_Y_SIN_ASIGNAR.filter(k => (v[k] ?? 0) > 0)

/** «pozos 6.676 · planta 1.041»: lo de cada tramo, en el orden de la tubería. */
export const textoReparto = (v: Partial<Record<ChokeOSinAsignar, number>>, largo = false): string =>
  conBarriles(v).map(k => `${largo ? LARGO_TRAMO[k] : CORTO_TRAMO[k]} ${n0(v[k] ?? 0)}`).join(' · ')

/** Lo que el lector de pantalla oye de una barra: cada tramo con su cifra y el total. */
export const leidoReparto = (v: Partial<Record<ChokeOSinAsignar, number>>): string => {
  const ks = conBarriles(v)
  const total = ks.reduce((a, k) => a + (v[k] ?? 0), 0)
  return ks.length ? `${ks.map(k => `${LARGO_TRAMO[k]} ${n0(v[k] ?? 0)} barriles`).join(', ')}; en total ${n0(total)} barriles` : 'nada se trabó'
}

/** La primera letra en mayúscula: «En los pozos» en una tabla o un globo. */
export const mayuscula = (t: string) => `${t.charAt(0).toUpperCase()}${t.slice(1)}`
