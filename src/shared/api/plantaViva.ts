import { useCtx, useVersiones, useSesion } from './sesion'
import { useDato, versionDe } from './consulta'
import { guardadasDe } from './arbol'
import { PLANTA_VIVA } from './contrato'
import {
  plantaViva, MOMENTOS, NOMBRE_MOMENTO, LEMA_MOMENTO, TRAMOS_VIVOS, NOMBRE_TRAMO_VIVO, FAMILIA, PALABRA_PRIORIDAD, esMomento, LENTE_TECNICA, conLenteTecnica,
  type Momento, type ConsultaPlantaViva, type VistaPlantaViva, type CifraMomento, type PlantaDelCampo, type TramoVivo, type EquipoDelTramo,
  type RamalAgua, type SinIdentificarVivo, type VentaViva, type FilaCampoViva, type FilaEquipoDiferido, type MesDiferido, type RamaPorque,
  type FlechaTrim, type PedazoRotulo, type LenteTecnica,
} from '@/entities/planta-viva'
import type { DecisionPlan } from '@/entities/escenarios'
import type { BorradorClasificacion } from '@/entities/anh-clasificacion'
import type { Contexto } from '@/entities/causa-senal'
import type { Historial } from '@/entities/choke'

/** LA COSTURA DE «LA PLANTA VIVA» (X4 §4, pedido 1 de §4.11).
 *
 *  `GET /api/vistas/planta-viva?campos=&momento=&desde=&hasta=`: la vista del
 *  gerente por campo (o por «todos mis campos») y por momento (`antes`,
 *  `durante`, `despues`), en una sola lectura. El servidor corre `plantaViva`
 *  (entities/planta-viva.ts) con la configuración firmada, su historial y lo
 *  que dijeron las personas en la clasificación (el tramo vigente de cada
 *  parada); en el demo responde el motor en el navegador con la sesión.
 *  Antes, el Resumen pedía cuatro vistas enteras por campo para usar unas
 *  pocas cifras de cada una (6D·H3).
 *
 *  Las pantallas leen `usePlantaViva`. Nadie en pages/widgets llama
 *  `pedirPlantaViva` (oxlint). Las palabras se reexportan aquí para que las
 *  pantallas no importen el motor. */

export { MOMENTOS, NOMBRE_MOMENTO, LEMA_MOMENTO, TRAMOS_VIVOS, NOMBRE_TRAMO_VIVO, FAMILIA, PALABRA_PRIORIDAD, esMomento, LENTE_TECNICA, conLenteTecnica }
export type {
  Momento, ConsultaPlantaViva, VistaPlantaViva, CifraMomento, PlantaDelCampo, TramoVivo, EquipoDelTramo, RamalAgua, SinIdentificarVivo, VentaViva,
  FilaCampoViva, FilaEquipoDiferido, MesDiferido, RamaPorque, FlechaTrim, PedazoRotulo, LenteTecnica,
}

/** `GET /api/vistas/planta-viva?campos&momento&desde&hasta`: la respuesta del demo,
 *  la misma fórmula que el backend. Lo guardado por las personas entra como lo
 *  lee el motor (el tramo vigente de cada parada, QA-A-01). */
export const pedirPlantaViva = (q: ConsultaPlantaViva, ctx: Contexto, versiones: Historial | undefined, guardadas: Record<string, BorradorClasificacion> | undefined,
  decisiones?: Record<string, DecisionPlan>): VistaPlantaViva =>
  plantaViva(q, ctx, versiones, { guardadas: guardadasDe(guardadas ?? {}), ...(decisiones ? { decisiones } : {}) })

/** La planta viva de unos campos en un momento y un período. Cambiar de momento
 *  es otra consulta, pero el motor ya tiene lo demás en memoria (D7). */
export function usePlantaViva(q: ConsultaPlantaViva): VistaPlantaViva {
  const ctx = useCtx(), versiones = useVersiones(), guardadas = useSesion(s => s.clasificacionesAnh), decisiones = useSesion(s => s.planes)
  // Las decisiones sobre los planes del ciclo («3 de 11 planes en marcha»): el servidor las aplica al responder; en el demo, la sesión.
  return useDato(PLANTA_VIVA, q, `${versionDe(ctx)}.${versionDe(versiones)}.${versionDe(guardadas)}.${versionDe(decisiones)}`,
    () => pedirPlantaViva(q, ctx, versiones, guardadas, decisiones))
}
