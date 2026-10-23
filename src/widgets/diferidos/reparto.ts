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
/** El relleno de cada tramo: gris Y dibujo propio, para que dos tramos vecinos
 *  se separen también en blanco y negro y en el papel (B-35; U2 §7.5): el
 *  yacimiento liso en la tinta (█), los pozos lisos (▓), la planta con rayas
 *  horizontales (▒), afuera con puntos (░) y lo sin identificar rayado en
 *  diagonal, claro y con borde discontinuo. Son los mismos dibujos de la franja
 *  «Qué limitó» y de todas las barras por tramo (B-09). Afuera va en `--dato-3`,
 *  no en `--dato-4`, que contra el panel no llegaba a 3:1 (WCAG 1.4.11). En SVG,
 *  los mismos dibujos van en `PatronesTramo` (tramos.tsx). */
export const RELLENO: Record<ChokeOSinAsignar, string> = {
  reservorio: 'var(--tinta)',
  pozo: 'var(--dato-2)',
  planta: 'repeating-linear-gradient(0deg, var(--panel) 0 1px, var(--dato-3) 1px 4px)',
  exportacion: 'radial-gradient(circle, var(--panel) 0 0.9px, transparent 1.3px) 0 0 / 4px 4px, var(--dato-3)',
  'sin-asignar': RAYADO,
}
/** El relleno SVG de un tramo, con los dibujos de `PatronesTramo` (tramos.tsx) del mismo `id`. */
export const rellenoSvg = (k: ChokeOSinAsignar, id: string): string =>
  k === 'reservorio' ? 'var(--tinta)' : k === 'pozo' ? 'var(--dato-2)' : k === 'planta' ? `url(#pl-${id})` : k === 'exportacion' ? `url(#af-${id})` : `url(#sin-${id})`
/** El nombre del dibujo de cada tramo, para el lector y para la leyenda impresa. */
export const DIBUJO_TRAMO: Record<ChokeOSinAsignar, string> = {
  reservorio: 'liso oscuro', pozo: 'liso', planta: 'rayas', exportacion: 'puntos', 'sin-asignar': 'rayado y discontinuo',
}

/** Los tramos que tienen barriles, en el orden fijo. Un tramo en cero va solo
 *  en la leyenda, nunca como segmento vacío (U2 §12, punto 3). */
export const conBarriles = (v: Partial<Record<ChokeOSinAsignar, number>>): ChokeOSinAsignar[] =>
  CHOKES_Y_SIN_ASIGNAR.filter(k => (v[k] ?? 0) > 0)

/** «pozos 6.676 · planta 1.041»: lo de cada tramo, en el orden de la tubería. */
export const textoReparto = (v: Partial<Record<ChokeOSinAsignar, number>>, largo = false): string =>
  conBarriles(v).map(k => `${largo ? LARGO_TRAMO[k] : CORTO_TRAMO[k]} ${n0(v[k] ?? 0)}`).join(' · ')

/** Lo que el lector de pantalla oye de una barra: cada tramo con su cifra y el
 *  total, el del motor (`diferido`: Σ de los tramos del libro), no una suma hecha aquí. */
export const leidoReparto = (v: Partial<Record<ChokeOSinAsignar, number>>, total: number): string => {
  const ks = conBarriles(v)
  return ks.length ? `${ks.map(k => `${LARGO_TRAMO[k]} ${n0(v[k] ?? 0)} barriles`).join(', ')}; en total ${n0(total)} barriles` : 'nada se trabó'
}

/** La primera letra en mayúscula: «En los pozos» en una tabla o un globo. */
export const mayuscula = (t: string) => `${t.charAt(0).toUpperCase()}${t.slice(1)}`
