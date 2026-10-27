import { useMemo } from 'react'
import { useCtx } from './sesion'
import { useDato, versionDe } from './consulta'
import { EQUIPOS_HOY, RIESGO } from './contrato'
import { pedirEquiposDeHoy } from './equipos'
import { pedirRiesgo } from './diferidos'
import { franja, franjaDe, type Franja } from '@/entities/condiciones'
import type { Contexto } from '@/entities/causa-senal'

export type { Franja, CondicionFranja, EquipoEnFranja } from '@/entities/condiciones'
export { ORDEN_FRANJA } from '@/entities/condiciones'

/** C1 · La franja de condiciones de la cabecera (X5 §5.6), en la costura.
 *
 *  No es un endpoint nuevo: sale de dos vistas que el servidor ya entrega
 *  (`/vistas/equipos-hoy` y `/vistas/riesgo`, las mismas que leen Planta y
 *  Riesgo) con la regla del motor (`franjaDe`, entities/condiciones.ts). Así
 *  la franja dice de cada equipo lo mismo que la pantalla de al lado, y con la
 *  fuente http son los mismos dos pedidos que esas pantallas ya hacen. */

/** La respuesta del demo: la franja de los campos, calculada por el motor. */
export const pedirFranja = (campos: string[], ctx: Contexto): Franja => franja(campos, ctx)

/** La franja de los campos que se están mirando (uno, o todos los del portafolio). */
export function useFranja(campos: string[]): Franja {
  const ctx = useCtx()
  const v = String(versionDe(ctx))
  const porCampo = useDato(EQUIPOS_HOY, { campos }, v, () => pedirEquiposDeHoy(campos, ctx))
  const riesgo = useDato(RIESGO, { campos }, v, () => pedirRiesgo(campos, ctx))
  const clave = campos.join(',')
  return useMemo(() => franjaDe(clave.split(',').filter(Boolean).map(campoId => ({
    campoId, equipos: Object.hasOwn(porCampo, campoId) ? porCampo[campoId]! : [], riesgo: riesgo.filter(r => r.campoId === campoId),
  }))), [clave, porCampo, riesgo])
}

/** F1 · H3 (X2 F2; X5 §6.4): la condición de cada equipo, la MISMA de la franja, para
 *  pintar su marca en cualquier lista (Turno, Mi trabajo, Mantenimiento, Riesgo, la
 *  placa de Bombas). Sale de las mismas dos vistas que la franja, sin endpoint nuevo.
 *  Un equipo sin condición (normal, o parado sin prioridad propia) no lleva marca.
 *  `condicionDe(campoId, equipo)`. */
export function useCondiciones(campos: string[]): (campoId: string, equipo: string) => CondicionDeEquipo | undefined {
  const f = useFranja(campos)
  return useMemo(() => {
    const m = new Map(f.equipos.map(e => [`${e.campoId}|${e.equipo}`, e.condicion]))
    return (campoId: string, equipo: string) => m.get(`${campoId}|${equipo}`)
  }, [f])
}
export type CondicionDeEquipo = import('@/entities/condiciones').CondicionFranja
