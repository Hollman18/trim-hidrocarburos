import { registrarCifras, type ConsultaInforme, type Informe } from '@/entities/informe'
import type { Contexto } from '@/entities/causa-senal'

/** `POST /api/informes` (la parte que calcula el servidor): se manda la
 *  CONSULTA y el servidor saca las cifras con su libro, su versión de la
 *  configuración y la huella. El folio, la fecha y quién lo emitió los pone
 *  el servidor del demo al registrarlo (escrituras.ts · emitirInforme). */
export const pedirCifrasInforme = (q: ConsultaInforme, ctx: Contexto, version: number): Promise<Pick<Informe, 'cifras' | 'huella' | 'estado' | 'version'>> =>
  registrarCifras(q, ctx, version)
