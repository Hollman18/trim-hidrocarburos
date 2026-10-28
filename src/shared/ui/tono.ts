import type { Severidad } from '@/entities/tipos'
import type { Condicion } from './Prioridad'

/* «QUÉ ATACAR» DE UN VISTAZO (el dueño, 28-oct): lo frenado (urgente e importante) en rojo pálido, lo que está en
 * riesgo en amarillo pálido y lo que está bien en verde pálido. Es un FONDO con una raya a la izquierda, nunca
 * chillón, y siempre con la marca ISA encima (forma y número): el tono ayuda, no es la única señal (WCAG 1.4.1).
 *
 * El verde va SOLO donde «bien» es un resultado (la meta cumplida, mejor que antes de TRIM). Lo normal de la
 * planta sigue en gris, como pide ISA-101: si todo tuviera color, lo urgente no resaltaría. */
export type Tono = 'frenado' | 'riesgo' | 'bien'

/** Frenado: la alarma (prioridad 1) y el interlock. En riesgo: atención y aviso (prioridad 2 y 3). Lo demás, sin tono. */
export function tonoDeCondicion(c: Condicion | null | undefined): Tono | undefined {
  if (c === 'alarma' || c === 'interlock') return 'frenado'
  if (c === 'atencion' || c === 'aviso') return 'riesgo'
  return undefined
}

/** Un equipo o un pozo: PARADO es frenado (el dueño, 28-oct: «cuando esté frenado algo, una máquina o un pozo, lo
 *  que sea, en rojo pálido»), aunque su prioridad ISA sea atención; en marcha, el tono de su condición. */
export function tonoDeEquipo(c: Condicion | null | undefined, parado: boolean | undefined): Tono | undefined {
  return parado ? 'frenado' : tonoDeCondicion(c)
}

export function tonoDeSeveridad(s: Severidad | null | undefined): Tono | undefined {
  return s === 1 ? 'frenado' : s === 2 || s === 3 ? 'riesgo' : undefined
}

/** Un resultado contra su meta: alcanzarla es «bien»; quedarse corto es «en riesgo» (no está frenado: se mide). */
export function tonoDeMeta(valor: number, meta: number | undefined | null, mayorEsMejor = true): Tono | undefined {
  if (meta === undefined || meta === null || !Number.isFinite(meta) || meta <= 0) return undefined
  return (mayorEsMejor ? valor >= meta : valor <= meta) ? 'bien' : 'riesgo'
}

/** El fondo pálido y la raya de la izquierda de una tarjeta o una fila. Sin tono, nada. */
const FONDO: Record<Tono, string> = {
  frenado: 'bg-[var(--frenado-f)] shadow-[inset_4px_0_0_var(--frenado-raya)]',
  riesgo: 'bg-[var(--riesgo-f)] shadow-[inset_4px_0_0_var(--riesgo-raya)]',
  bien: 'bg-[var(--bien-f)] shadow-[inset_4px_0_0_var(--bien-raya)]',
}
export const fondoTono = (t: Tono | undefined) => (t ? FONDO[t] : '')

/** Solo el fondo, sin raya: para piezas chicas (un chip, una celda) donde la raya estorba. */
const SOLO_FONDO: Record<Tono, string> = { frenado: 'bg-[var(--frenado-f)]', riesgo: 'bg-[var(--riesgo-f)]', bien: 'bg-[var(--bien-f)]' }
export const fondoTonoSuave = (t: Tono | undefined) => (t ? SOLO_FONDO[t] : '')

/** El color de una marca de gráfica (una columna, una barra) según su tono: la raya, que se ve sobre el papel. */
export const COLOR_TONO: Record<Tono, string> = { frenado: 'var(--frenado-raya)', riesgo: 'var(--riesgo-raya)', bien: 'var(--bien-raya)' }

/** Para las pruebas y el papel: `data-tono` dice el tono sin depender del color. */
export const atributoTono = (t: Tono | undefined) => ({ 'data-tono': t ?? '' })
