import { useCtx, useSesion } from './sesion'
import { useDato, versionDe } from './consulta'
import { RESPUESTAS_ANH, CONVERSION_ANH, type ConsultaPeriodo } from './contrato'
import { vistaRespuestasAnh, type RespuestaAnh, type VistaRespuestasAnh, type DiaRespondido } from '@/entities/anh-respuestas'
import { vistaConversion, firmaDeConversion, type VistaConversionAnh, type ConversionLeida, type FilaConversionAnh } from '@/entities/anh-conversion'
import type { Version } from '@/entities/configuracion'
import type { Contexto } from '@/entities/causa-senal'
import { AHORA } from '@/entities/reloj'

/** A3 · LA COSTURA DE LAS ACCIONES QUE FALTAN (experiencia v3; CAMBIOS-CONTRATO.md §9).
 *
 *  Las lecturas nuevas de A3 (las escrituras están en escrituras.ts, sección A3):
 *  - `GET /api/vistas/anh/respuestas?campos=&desde=&hasta=`: la respuesta de la ANH de
 *    cada día y lo que queda de la hora para corregir (`entities/anh-respuestas.ts`);
 *  - `GET /api/vistas/anh/conversion?campo=`: la tabla de equivalencias firmada del
 *    campo y lo que queda sin equivalencia (`entities/anh-conversion.ts`).
 *  Los campos opcionales nuevos van en las costuras de siempre: `tramos` en
 *  `useRelojes` (sap.ts), `respuestaAnh` en `useReporteAnh` (regulatorio.ts) y `cierre`
 *  en las órdenes de `useSap` (sap.ts).
 *
 *  Las pantallas leen `use…`; nadie en pages/widgets llama `pedir*`. */

export type { RespuestaAnh, VistaRespuestasAnh, DiaRespondido, VistaConversionAnh, ConversionLeida, FilaConversionAnh }
export { MOTIVOS_RECHAZO_ANH, MINUTOS_PARA_CORREGIR } from '@/entities/anh-respuestas'
export { ACTIVIDADES, NOMBRE_ACTIVIDAD, NOMBRE_TRAMO_TIEMPO_FUERA, TRAMOS_TIEMPO_FUERA } from '@/entities/orden-cierre'
export type { CierreOrden, CuerpoCierreOrden, ActividadMant, TramosTiempoFuera } from '@/entities/orden-cierre'

const SIN: RespuestaAnh[] = []

/** `GET /api/vistas/anh/respuestas`: la respuesta del demo (la misma fórmula que el backend), a la hora de los datos. */
export const pedirRespuestasAnh = (q: ConsultaPeriodo, respuestas: readonly RespuestaAnh[] | undefined): VistaRespuestasAnh =>
  vistaRespuestasAnh(respuestas ?? SIN, q, AHORA.getTime())

export function useRespuestasAnh(q: ConsultaPeriodo): VistaRespuestasAnh {
  const respuestas = useSesion(s => s.respuestasAnh) ?? SIN
  return useDato(RESPUESTAS_ANH, q, String(versionDe(respuestas)), () => pedirRespuestasAnh(q, respuestas))
}

/** `GET /api/vistas/anh/conversion?campo=`: la tabla firmada del campo (la configuración
 *  vigente), lo que queda sin equivalencia y la versión que la firmó. */
export const pedirConversionAnh = (campo: string, ctx: Contexto, versiones: readonly Version[]): VistaConversionAnh =>
  vistaConversion(ctx.config.conversionAnh, campo, firmaDeConversion(versiones, campo))

export function useConversionAnh(campo: string): VistaConversionAnh {
  const ctx = useCtx()
  const versiones = useSesion(s => s.versiones)
  return useDato(CONVERSION_ANH, { campo }, `${versionDe(ctx)}.${versionDe(versiones)}`, () => pedirConversionAnh(campo, ctx, versiones))
}
