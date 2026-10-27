import { useCtx, useVersiones, useSesion } from './sesion'
import { useDato, versionDe } from './consulta'
import { guardadasDe } from './arbol'
import { BALANCE, JORNADA, EFECTIVIDAD, FALLAS_MENSUAL } from './contrato'
import {
  balance, NOMBRE_TRAMO_BALANCE, EXPLICA_BALANCE,
  type VistaBalance, type ConsultaBalance, type CifraBalance, type CifrasBalance, type CampoDelBalance, type TramoDelBalance,
  type ArbolDelTramo, type NodoBalance, type ParadaDelBalance, type DichoDeParada,
} from '@/entities/balance'
import { vistaJornada, JORNADAS, type VistaJornada, type Jornada, type CualJornada, type ParadaDeJornada, type PasoDeLaCadena } from '@/entities/jornada'
import { efectividad, fallasPorMes, type VistaEfectividad, type TramoEfectividad, type MesFallas, type FallasDeEquipo } from '@/entities/efectividad'
import type { RegistroPerdida } from '@/entities/perdidas'
import type { BorradorClasificacion } from '@/entities/anh-clasificacion'
import type { Contexto } from '@/entities/causa-senal'
import type { Historial } from '@/entities/choke'

/** LA COSTURA DEL BALANCE DEL CHOKE, LA JORNADA Y «¿ESTÁ FUNCIONANDO?» (A2).
 *
 *  - `GET /api/vistas/balance?campos=&desde=&hasta=` (o `&jornada=`): producido ·
 *    diferido · perdido por campo y por tramo, con el árbol de cada tramo
 *    (`entities/balance.ts`). Lo leen ger, prod, sup, reg, jefe y conf.
 *  - `GET /api/vistas/jornada?campo=&jornada=actual|anterior`: «Mi turno» del
 *    supervisor (`entities/jornada.ts`).
 *  - `GET /api/vistas/efectividad?campos=`: «¿Está funcionando?» (`entities/efectividad.ts`).
 *  - `GET /api/vistas/fallas/mensual?campos=`: las fallas de los equipos críticos por mes.
 *
 *  El servidor corre el motor con la configuración firmada, lo que dijeron las
 *  personas en la clasificación (el tramo vigente de cada parada) y el registro de
 *  pérdidas; en el demo responde el motor en el navegador con la sesión.
 *
 *  Las pantallas leen los `use*`; nadie en pages/widgets llama los `pedir*` ni
 *  importa el motor (oxlint). Las palabras se reexportan aquí. */

export { NOMBRE_TRAMO_BALANCE, EXPLICA_BALANCE, JORNADAS }
export type {
  VistaBalance, ConsultaBalance, CifraBalance, CifrasBalance, CampoDelBalance, TramoDelBalance, ArbolDelTramo, NodoBalance, ParadaDelBalance, DichoDeParada,
  VistaJornada, Jornada, CualJornada, ParadaDeJornada, PasoDeLaCadena, VistaEfectividad, TramoEfectividad, MesFallas, FallasDeEquipo,
}

type Guardadas = Record<string, BorradorClasificacion>
const NINGUNA: readonly RegistroPerdida[] = Object.freeze([])
const registroDe = (s: { perdidas?: readonly RegistroPerdida[] }) => s.perdidas ?? NINGUNA

/** `GET /api/vistas/balance`: la respuesta del demo, la misma fórmula que el backend. */
export const pedirBalance = (q: ConsultaBalance, ctx: Contexto, guardadas: Guardadas | undefined, perdidas: readonly RegistroPerdida[] | undefined): VistaBalance =>
  balance(q, ctx, { guardadas: guardadasDe(guardadas ?? {}), perdidas: perdidas ?? NINGUNA })
export function useBalance(q: ConsultaBalance): VistaBalance {
  const ctx = useCtx(), guardadas = useSesion(s => s.clasificacionesAnh), perdidas = useSesion(registroDe)
  return useDato(BALANCE, q, `${versionDe(ctx)}.${versionDe(guardadas)}.${versionDe(perdidas)}`, () => pedirBalance(q, ctx, guardadas, perdidas))
}

/** `GET /api/vistas/jornada`. */
export const pedirJornada = (q: { campo: string; jornada: CualJornada }, ctx: Contexto, guardadas: Guardadas | undefined, perdidas: readonly RegistroPerdida[] | undefined): VistaJornada =>
  vistaJornada(q, ctx, { guardadas: guardadasDe(guardadas ?? {}), perdidas: perdidas ?? NINGUNA })
export function useJornada(q: { campo: string; jornada: CualJornada }): VistaJornada {
  const ctx = useCtx(), guardadas = useSesion(s => s.clasificacionesAnh), perdidas = useSesion(registroDe)
  return useDato(JORNADA, q, `${versionDe(ctx)}.${versionDe(guardadas)}.${versionDe(perdidas)}`, () => pedirJornada(q, ctx, guardadas, perdidas))
}

/** `GET /api/vistas/efectividad`. */
export const pedirEfectividad = (campos: string[], ctx: Contexto, versiones: Historial | undefined, guardadas: Guardadas | undefined): VistaEfectividad =>
  efectividad({ campos }, ctx, versiones, { guardadas: guardadasDe(guardadas ?? {}) })
export function useEfectividad(campos: string[]): VistaEfectividad {
  const ctx = useCtx(), versiones = useVersiones(), guardadas = useSesion(s => s.clasificacionesAnh)
  return useDato(EFECTIVIDAD, { campos }, `${versionDe(ctx)}.${versionDe(versiones)}.${versionDe(guardadas)}`, () => pedirEfectividad(campos, ctx, versiones, guardadas))
}

/** `GET /api/vistas/fallas/mensual`. */
export const pedirFallasMensual = (campos: string[], ctx: Contexto): MesFallas[] => fallasPorMes(campos, ctx)
export function useFallasMensual(campos: string[]): MesFallas[] {
  const ctx = useCtx()
  return useDato(FALLAS_MENSUAL, { campos }, String(versionDe(ctx)), () => pedirFallasMensual(campos, ctx))
}
