import { useCtx, useSesion } from './sesion'
import { useDato, traer, versionDe } from './consulta'
import { REPORTE_ANH, DIFERIDOS_MENSUAL, type ConsultaPeriodo } from './contrato'
import { guardadasDe } from './arbol'
import { pedirSerie, type MesResumen } from './diferidos'
import { reporteAnh, type VistaReporteAnh, type FaltaDeParada } from '@/entities/regulatorio'
import type { BorradorClasificacion } from '@/entities/anh-clasificacion'
import type { Contexto } from '@/entities/causa-senal'

/** LA COSTURA DEL REPORTE A LA ANH (F2 · P-03; X4 §3.4).
 *
 *  `GET /api/vistas/anh/reporte?campos=&desde=&hasta=`: si el período se puede
 *  publicar, las paradas que todavía no tienen causa, quién lo debe y la hora
 *  límite. El servidor corre `reporteAnh` (entities/regulatorio.ts) con lo que ya
 *  dijeron las personas encima (la clasificación vigente de cada fila); en el demo
 *  responde el motor en el navegador con la sesión.
 *
 *  Las pantallas leen `useReporteAnh`; nadie en pages/widgets llama `pedir*`. */

export type { VistaReporteAnh, FaltaDeParada }

/** `GET /api/vistas/anh/reporte`: la respuesta del demo, la misma fórmula que el backend. */
export const pedirReporteAnh = (q: ConsultaPeriodo, ctx: Contexto, guardadas: Record<string, BorradorClasificacion>): VistaReporteAnh =>
  reporteAnh(q, ctx, { guardadas: guardadasDe(guardadas) })

export function useReporteAnh(q: ConsultaPeriodo): VistaReporteAnh {
  const ctx = useCtx()
  const guardadas = useSesion(s => s.clasificacionesAnh)
  return useDato(REPORTE_ANH, q, `${versionDe(ctx)}.${versionDe(guardadas)}`, () => pedirReporteAnh(q, ctx, guardadas))
}

/** El libro mes a mes fuera del dibujo (el CSV para la ANH de «Exportar»): la misma
 *  consulta y la misma caché de `useSerie` (`GET /api/vistas/diferidos/mensual`). */
export const traerSerieMensual = (campos: string[], ctx: Contexto): Promise<MesResumen[]> =>
  traer(DIFERIDOS_MENSUAL, { campos }, String(versionDe(ctx)), () => pedirSerie(campos, ctx))
