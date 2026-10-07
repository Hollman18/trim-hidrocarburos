import { ALTO_IMPACTO } from '@/entities/causa-senal'
import type { FilaPozo } from '@/shared/api/diferidos'
import type { Severidad } from '@/entities/tipos'
import type { Senal } from '@/entities/vigia'

/** Severidad de un pozo para la marca. Solo la causa lleva prioridad
 *  (ISA-18.2): un pozo cerrado porque paró la bomba o se cayó un servicio es
 *  consecuencia, va en gris y dice quién lo cerró. Su propia electrosumergible
 *  caída es 1; una parada sin identificar, 2; frenado o con una parte que
 *  avisa, 3. */
export const cerradoPorOtro = (f: FilaPozo) => !!f.causa && f.causa.equipo !== f.pozo.id
export const sevPozo = (f: FilaPozo): Severidad =>
  !f.produce ? (cerradoPorOtro(f) ? 0 : f.causa && ALTO_IMPACTO.includes(f.causa.tipo) ? 1 : 2)
    : f.hz && !cerradoPorOtro(f) ? 3 : f.salud && (f.salud.estado === 'fuera' || f.salud.estado === 'avisa') ? (f.salud.prioridad || 3) : 0

/** Para ordenar: lo más grave primero, lo normal al final. */
export const sevOrden = (f: FilaPozo) => { const s = sevPozo(f); return s === 0 ? 9 : s }

/** Lo que ve de las señales de un pozo quien lo opera (ISA-101: solo lo
 *  anormal, cada cosa con su nombre).
 *  - `fuera`: lo que el instrumento reporta fuera de banda (aviso, atención o
 *    alarma). Es lo único que va bajo «fuera de banda».
 *  - `sinSenal`: instrumentos sin lectura con el pozo PRODUCIENDO: dato
 *    inválido (magenta), anormal, pero no es un valor fuera de banda y va aparte.
 *  Sin señal con el pozo parado es lo esperado: el sensor de fondo y el
 *  desbalance no transmiten con el motor apagado (`esp.ts`). Marcarlo en cada
 *  electrosumergible parada sería una alarma permanente que no pide nada. */
export function senalesParaOperar(senales: readonly Senal[], produce: boolean): { fuera: Senal[]; sinSenal: Senal[] } {
  return {
    fuera: senales.filter(s => s.estado === 'aviso' || s.estado === 'atencion' || s.estado === 'alarma'),
    sinSenal: produce ? senales.filter(s => s.estado === 'sin señal') : [],
  }
}
