import { useMemo } from 'react'
import { useCtx, useSesion } from './sesion'
import { useDato, versionDe } from './consulta'
import { SAP_AVISOS, SAP_ORDENES, SAP_EQUIPO, SAP_EQUIPOS, RELOJES } from './contrato'
import { historiaSap, repuestosDe, identidadSap, horasPorClase, relojes, type AvisoSap, type OrdenSap, type Repuesto, type HistoriaSap } from '@/entities/sap'
import { historialDeEquipo } from '@/entities/libro'
import { flotaDe, type Familia } from '@/entities/flota'
import { catalogoDe, type Catalogo } from '@/entities/catalogo'
import type { Contexto } from '@/entities/causa-senal'

/** Servicio de SAP. Cada consulta es un endpoint del contrato (CONTRATO.md ·
 *  SAP; formas en contrato.ts): el backend habla con SAP y el front solo con
 *  el backend. En el demo responde la historia derivada del PLC
 *  (`entities/sap.ts`) más los avisos que se enviaron en la sesión. */

const ms = (s: string) => new Date(s).getTime()
const v = (ctx: Contexto) => String(versionDe(ctx))

/** Lo que SAP tiene registrado (avisos y órdenes de todos los campos), sin los
 *  avisos enviados en la sesión. Lo usa el servidor del demo al recibir un
 *  aviso (escrituras.ts) para saber si ya hay uno abierto y qué número sigue. */
export const pedirHistoriaSap = (ctx: Contexto): HistoriaSap => historiaSap(ctx)

/** `GET /api/sap/avisos?campos=` → del más reciente al más viejo. */
export function pedirAvisosSap(campos: string[], ctx: Contexto, enviados: AvisoSap[]): AvisoSap[] {
  // Por instante, no por texto: las horas llegan con zonas distintas («Z» y «-05:00»).
  return [...historiaSap(ctx).avisos, ...enviados].filter(a => campos.includes(a.campoId)).sort((a, b) => ms(b.creado) - ms(a.creado))
}
/** `GET /api/sap/ordenes?campos=` → de la más reciente a la más vieja. */
export const pedirOrdenesSap = (campos: string[], ctx: Contexto): OrdenSap[] =>
  historiaSap(ctx).ordenes.filter(o => campos.includes(o.campoId)).sort((a, b) => ms(b.creada) - ms(a.creada))

export function useSap(campos: string[]): { avisos: AvisoSap[]; ordenes: OrdenSap[] } {
  const ctx = useCtx()
  const enviados = useSesion(s => s.avisosEnviados)
  // Los avisos dependen además de lo enviado en la sesión: entra en la versión.
  const avisos = useDato(SAP_AVISOS, { campos }, `${v(ctx)}.${versionDe(enviados)}`, () => pedirAvisosSap(campos, ctx, enviados))
  const ordenes = useDato(SAP_ORDENES, { campos }, v(ctx), () => pedirOrdenesSap(campos, ctx))
  return useMemo(() => ({ avisos, ordenes }), [avisos, ordenes])
}

export interface IdentidadSap { equipoSap: string; ubicacion: string }

/** `GET /api/sap/equipos/:equipo?campo=` → cómo conoce SAP a un equipo
 *  (número de equipo y ubicación técnica) y sus repuestos. */
export const pedirEquipoSap = (campo: string, equipo: string): { identidad: IdentidadSap; repuestos: Repuesto[] } =>
  ({ identidad: identidadSap(campo, equipo), repuestos: repuestosDe(campo, equipo) })

/** Avisos, órdenes y repuestos de un equipo, y cómo lo conoce SAP. */
export function useSapDeEquipo(campoId: string, equipo: string): {
  avisos: AvisoSap[]; ordenes: OrdenSap[]; repuestos: Repuesto[]; identidad: IdentidadSap
} {
  const { avisos, ordenes } = useSap([campoId])
  const ctx = useCtx()
  const del = useDato(SAP_EQUIPO, { campo: campoId, equipo }, v(ctx), () => pedirEquipoSap(campoId, equipo))
  return useMemo(() => ({
    avisos: avisos.filter(a => a.equipo === equipo),
    ordenes: ordenes.filter(o => o.equipo === equipo),
    repuestos: del.repuestos,
    identidad: del.identidad,
  }), [avisos, ordenes, del, equipo])
}

export interface EquipoSap {
  equipo: string
  familia: Familia
  identidad: IdentidadSap
  repuestos: Repuesto[]
  /** Catálogo de daños con que SAP recibe la parte y el modo; undefined si no tiene. */
  catalogo?: Catalogo
}

/** `GET /api/sap/equipos?campo=` → los equipos de alto impacto del campo como
 *  los conoce SAP, con sus repuestos y su catálogo. Un pedido por campo. */
export const pedirEquiposSap = (campoId: string): EquipoSap[] =>
  flotaDe(campoId).map(f => ({ ...f, identidad: identidadSap(campoId, f.equipo), repuestos: repuestosDe(campoId, f.equipo), catalogo: catalogoDe(campoId, f.equipo) }))
export function useEquiposSap(campoId: string): EquipoSap[] {
  const ctx = useCtx()
  return useDato(SAP_EQUIPOS, { campo: campoId }, v(ctx), () => pedirEquiposSap(campoId))
}

/** Horas confirmadas por clase de orden en el período. Se suman en el front
 *  sobre las órdenes que ya llegaron (`GET /api/sap/ordenes`): es agrupar lo
 *  recibido para mostrarlo, no un dato nuevo. */
export function useHorasMantenimiento(campos: string[], desde: Date, hasta: Date) {
  const { ordenes } = useSap(campos)
  const d = desde.getTime(), h = hasta.getTime()
  return useMemo(() => horasPorClase(ordenes, new Date(d), new Date(h)), [ordenes, d, h])
}

export type Relojes = ReturnType<typeof relojes>

/** `GET /api/vistas/relojes?campos=&desde=&hasta=` → los tres relojes de las
 *  fallas cerradas en el período: indisponibilidad (TRIM, del PLC) contra
 *  reparación activa (SAP). Cruza las órdenes con la historia de fallas: es
 *  del servidor. */
export function pedirRelojes(campos: string[], desde: Date, hasta: Date, ctx: Contexto): Relojes {
  const d = desde.getTime(), h = hasta.getTime()
  const dentro = pedirOrdenesSap(campos, ctx).filter(o => o.cierreTecnico && ms(o.cierreTecnico) >= d && ms(o.cierreTecnico) < h)
  const horas = new Map<string, number>()
  for (const k of new Set(dentro.filter(o => o.evento).map(o => `${o.campoId}|${o.equipo}`))) {
    const [campo, eq] = k.split('|') as [string, string]
    for (const f of historialDeEquipo(campo, eq, ctx).eventos) horas.set(f.id, f.horas)
  }
  return relojes(dentro, ev => horas.get(ev))
}
export function useRelojes(campos: string[], desde: Date, hasta: Date): Relojes {
  const ctx = useCtx()
  return useDato(RELOJES, { campos, desde, hasta }, v(ctx), () => pedirRelojes(campos, desde, hasta, ctx))
}
