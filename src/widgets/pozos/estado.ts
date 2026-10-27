import { useCallback, useMemo } from 'react'
import type { FilaPozo } from '@/shared/api/diferidos'
import { useFranja, ORDEN_FRANJA, type CondicionFranja } from '@/shared/api/condiciones'
import type { Senal } from '@/entities/vigia'

/** Un pozo cerrado porque paró la bomba o se cayó un servicio es consecuencia
 *  (ISA-18.2): va en gris y dice quién lo cerró. */
export const cerradoPorOtro = (f: FilaPozo) => !!f.causa && f.causa.equipo !== f.pozo.id

/** F3 · La condición de cada equipo (pozo, bomba) es la de la franja: una por
 *  equipo, la misma en todas partes (X2 F2; X5 §6.4; H3). La pantalla ya no
 *  decide la prioridad de un pozo con sus propias reglas (H17): sin condición del
 *  motor, sin marca. Un pozo cerrado por otro equipo no la lleva: la lleva quien lo cerró. */
export function useCondiciones(campos: string[]): (campoId: string, equipo: string) => CondicionFranja | undefined {
  const fr = useFranja(campos)
  const porEquipo = useMemo(() => new Map(fr.equipos.map(e => [`${e.campoId}|${e.equipo}`, e.condicion])), [fr])
  return useCallback((campoId: string, equipo: string) => porEquipo.get(`${campoId}|${equipo}`), [porEquipo])
}

/** Para ordenar: de la condición más grave a ninguna (el orden de la franja). */
export const rangoCondicion = (c?: CondicionFranja) => (c ? ORDEN_FRANJA.indexOf(c) : ORDEN_FRANJA.length)

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
