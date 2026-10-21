import { useCtx, useSesion, useVersiones } from './sesion'
import { useDato, versionDe } from './consulta'
import { CICLO } from './contrato'
import {
  cicloValor, conDecisiones,
  NOMBRE_FASE, LEMA_FASE, ESTADO_PLAN, PALANCA_PRODUCTO,
  type CicloValor, type PlanAccion, type FaseCiclo, type EstadoPlan, type DecisionPlan, type TramoCiclo,
} from '@/entities/escenarios'
import type { Contexto } from '@/entities/causa-senal'
import type { Versiones } from '@/entities/diferido'

/** LA COSTURA DEL CICLO ANTES / DURANTE / DESPUÉS.
 *
 *  `GET /api/vistas/ciclo?campos=&desde=&hasta=`. El servidor corre
 *  `cicloValor` (entities/escenarios.ts) y aplica las decisiones guardadas
 *  (`POST /api/planes/:id`) sobre cada plan. En el demo, las decisiones viven
 *  en la sesión (`sesion.planes`) y se superponen aquí. Las cifras son
 *  simuladas: no entran al libro ni a un informe firmado.
 *
 *  Las pantallas leen `useCiclo`. Nadie en pages/widgets llama `pedirCiclo`. */

export { NOMBRE_FASE, LEMA_FASE, ESTADO_PLAN, PALANCA_PRODUCTO }
export type { CicloValor, PlanAccion, FaseCiclo, EstadoPlan, DecisionPlan, TramoCiclo }

/** `GET /api/vistas/ciclo?campos=&desde=&hasta=` */
export function pedirCiclo(
  campos: string[],
  desde: Date,
  hasta: Date,
  ctx: Contexto,
  versiones: Versiones,
  planes: Record<string, DecisionPlan>,
): CicloValor {
  return conDecisiones(cicloValor(campos, desde, hasta, ctx, versiones), planes)
}

export function useCiclo(campos: string[], desde: Date, hasta: Date): CicloValor {
  const ctx = useCtx()
  const versiones = useVersiones()
  const planes = useSesion(s => s.planes)
  return useDato(
    CICLO, { campos, desde, hasta },
    `${versionDe(ctx)}.${versionDe(versiones)}.${versionDe(planes)}`,
    () => pedirCiclo(campos, desde, hasta, ctx, versiones, planes),
  )
}

/** Los planes de un equipo (ficha, detalle de bomba): del ciclo del ámbito. */
export const planesDeEquipo = (c: CicloValor, campoId: string, equipo: string): PlanAccion[] =>
  [...c.antes.planes, ...c.durante.planes, ...c.despues.planes]
    .filter(p => p.campoId === campoId && p.equipo === equipo)
