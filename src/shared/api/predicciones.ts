import { useCtx, useVersiones } from './sesion'
import { useDato, versionDe } from './consulta'
import { PREDICCIONES } from './contrato'
import { pedirRiesgo } from './diferidos'
import { registroDePredicciones, fallasVistas, type PrediccionVigia, type FallaVista } from '@/entities/aciertos'
import { PUESTA_EN_MARCHA, type Version } from '@/entities/configuracion'
import type { Contexto } from '@/entities/causa-senal'

export interface Predicciones {
  /** Lo que el vigía anunció y en qué quedó (o en seguimiento). */
  registro: PrediccionVigia[]
  /** Cada falla desde la puesta en marcha, con si el vigía podía verla. Se
   *  juzga con el perfil firmado que regía cuando pasó. */
  fallas: FallaVista[]
}

/** `GET /api/vistas/predicciones?campos=` → el historial de aciertos del vigía.
 *  Lo emitido se registra en el servidor al emitirse; las fallas salen de la
 *  misma historia del PLC que el libro. */
export function pedirPredicciones(campos: string[], ctx: Contexto, versiones: ReadonlyArray<Pick<Version, 'fecha' | 'config'>>): Predicciones {
  const inicio = new Date(`${PUESTA_EN_MARCHA}T00:00:00-05:00`)
  return {
    registro: registroDePredicciones(campos, ctx, pedirRiesgo(campos, ctx)),
    fallas: fallasVistas(campos, inicio, ctx, versiones),
  }
}

export function usePredicciones(campos: string[]): Predicciones {
  const ctx = useCtx(), versiones = useVersiones()
  // Las fallas se juzgan con el perfil que regía: las versiones firmadas entran en la clave.
  return useDato(PREDICCIONES, { campos }, `${versionDe(ctx)}.${versionDe(versiones)}`, () => pedirPredicciones(campos, ctx, versiones))
}
