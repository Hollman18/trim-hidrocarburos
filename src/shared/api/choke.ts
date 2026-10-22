import { useCtx, useVersiones } from './sesion'
import { useDato, versionDe } from './consulta'
import { locacionDe } from './fuente'
import {
  TUBERIA, SERIE_CHOKE, TUBERIA_AGUA, CRITICIDAD, REPARTO_CHOKE, REPARTO_CHOKE_MENSUAL, BASE_CHOKE, TOPOLOGIA, PROPUESTAS_TOPOLOGIA,
  type ConsultaPeriodo,
} from './contrato'
import {
  tuberiaCampo, serieChoke, brechaPorChoke, repartoPorMes, lineaBasePorTramo, topologiaDe, topologiaFirmada, topologiaDerivada,
  propuestasTopologia, marcarCasosBorde, casoBordeDe, alcancePorPozos, chokeDeAlcance, validarTopologia,
  ORDEN_CHOKE, ORDEN_CHOKE_CAMPO, CHOKES_Y_SIN_ASIGNAR, ESCALONES, NOMBRE_CHOKE, EXPLICA_TRAMO, RESUMEN_TRAMO, DONDE_CHOKE,
  NOMBRE_CHOKE_CAMPO, SUBNIVEL_MERCADO, NOMBRE_ALCANCE, NOMBRE_ESCALON, PARAMETROS_CHOKE, EXPLICA_CASO_BORDE,
  type ChokeAnh, type ChokeCampo, type ChokeOSinAsignar, type EscalonBrecha, type EscalonOSinClasificar, type AlcanceElemento,
  type ChokeDeElemento, type ClaseElemento, type PropuestaTopologia, type TuberiaCampo, type TramoTuberia, type TrenTuberia,
  type TrenPlanta, type EstadoTramo, type BrechaChoke, type BrechaCampoChoke, type EquipoBbl, type MesPorTramo,
  type LineaBasePorTramo, type AntesYDespues, type DiaChoke, type CambioDominante,
} from '@/entities/choke'
import {
  tuberiaAgua, ORDEN_AGUA, NOMBRE_TRAMO_AGUA,
  type TuberiaAgua, type TramoTuberiaAgua, type TramoAgua, type BombaDelTren, type ColchonAgua,
} from '@/entities/choke-agua'
import { criticidad, criticidadDelCampo, type FilaCriticidad, type CriticidadDelCampo, type FamiliaCriticidad } from '@/entities/criticidad'
import type { ImpactoConfig, ImpactoCampo, CambioCriticidad, CambioDeTramo, TopologiaLeida, HallazgoTopologia } from '@/entities/choke-config'
import type { Contexto } from '@/entities/causa-senal'
import type { Versiones } from '@/entities/diferido'

/** LA COSTURA DEL MODELO CHOKE: «¿Dónde se trabó?», «Qué limita hoy» y «Si falla hoy».
 *
 *  Cada vista es un GET de contrato.ts (`/vistas/campos/:campo/tuberia`,
 *  `…/choke/serie`, `…/agua`, `/vistas/criticidad`, `/vistas/choke/…`,
 *  `/vistas/topologia…`). El servidor corre el motor (entities/choke.ts,
 *  choke-agua.ts, criticidad.ts) con la configuración firmada vigente; en el
 *  demo responde el motor en el navegador con la sesión. Aquí, por vista:
 *  - `pedir*`: la respuesta del demo, la misma fórmula que el backend (con ella
 *    se arma la referencia y se prueba el contrato). Ninguna pantalla los llama;
 *  - `use*`: lo que leen las pantallas, con la caché de consulta.ts (la versión
 *    del contexto entra en la clave: firmar la topología o responder una parada
 *    hace que se pidan de nuevo).
 *  Las escrituras de la topología (vista previa e importación; la firma es
 *  `POST /api/configuracion`) están en escrituras.ts.
 *
 *  En pantalla no se dice «choke»: se dice «¿Dónde se trabó?», «Qué limita hoy»
 *  y «Si falla hoy» (U2 §1). Las palabras y las reglas de presentación se
 *  reexportan aquí para que las pantallas no importen el motor. */

export {
  ORDEN_CHOKE, ORDEN_CHOKE_CAMPO, CHOKES_Y_SIN_ASIGNAR, ESCALONES, NOMBRE_CHOKE, EXPLICA_TRAMO, RESUMEN_TRAMO, DONDE_CHOKE,
  NOMBRE_CHOKE_CAMPO, SUBNIVEL_MERCADO, NOMBRE_ALCANCE, NOMBRE_ESCALON, PARAMETROS_CHOKE, EXPLICA_CASO_BORDE, ORDEN_AGUA, NOMBRE_TRAMO_AGUA,
  // Reglas de lo que entra a mano (las dos puntas: la pantalla avisa, el servidor decide):
  // el tramo sale del alcance y el alcance del número de pozos (U2 §8.2).
  chokeDeAlcance, alcancePorPozos, casoBordeDe, validarTopologia,
}
export type {
  ChokeAnh, ChokeCampo, ChokeOSinAsignar, EscalonBrecha, EscalonOSinClasificar, AlcanceElemento, ChokeDeElemento, ClaseElemento,
  PropuestaTopologia, TuberiaCampo, TramoTuberia, TrenTuberia, TrenPlanta, EstadoTramo, BrechaChoke, BrechaCampoChoke, EquipoBbl,
  MesPorTramo, LineaBasePorTramo, AntesYDespues, DiaChoke, CambioDominante,
  TuberiaAgua, TramoTuberiaAgua, TramoAgua, BombaDelTren, ColchonAgua, FilaCriticidad, FamiliaCriticidad,
  ImpactoConfig, ImpactoCampo, CambioCriticidad, CambioDeTramo, TopologiaLeida, HallazgoTopologia,
}

/** La versión del contexto con que se calcula: entra en la clave de la caché. */
const v = (ctx: Contexto) => String(versionDe(ctx))

/* ─────────────────────────── la tubería del campo ─────────────────────────── */

/** `GET /api/vistas/campos/:campo/tuberia?desde=&hasta=` */
export const pedirTuberia = (campo: string, desde: Date, hasta: Date, ctx: Contexto): TuberiaCampo => tuberiaCampo(campo, desde, hasta, ctx)
export function useTuberia(campo: string, desde: Date, hasta: Date): TuberiaCampo {
  const ctx = useCtx()
  return useDato(TUBERIA, { campo, desde, hasta }, v(ctx), () => pedirTuberia(campo, desde, hasta, ctx))
}

/** La serie de lo que limitó cada día y los avisos «Cambió lo que limita». */
export interface SerieChoke {
  dias: DiaChoke[]
  cambios: CambioDominante[]
  /** Por campo: las vueltas del dominante sin el umbral ni la persistencia (para explicar por qué hay menos avisos). */
  vueltas: Record<string, number>
}
/** `GET /api/vistas/campos/:campo/choke/serie?desde=&hasta=` */
export const pedirSerieChoke = (campo: string, desde: Date, hasta: Date, ctx: Contexto): SerieChoke => serieChoke([campo], desde, hasta, ctx)
export function useSerieChoke(campo: string, desde: Date, hasta: Date): SerieChoke {
  const ctx = useCtx()
  return useDato(SERIE_CHOKE, { campo, desde, hasta }, v(ctx), () => pedirSerieChoke(campo, desde, hasta, ctx))
}

/* ─────────────────────────── la tubería del agua ─────────────────────────── */

/** `GET /api/vistas/campos/:campo/agua`. El historial de versiones firmadas hace
 *  que el colchón de una parada abierta use el tanque y el respaldo que regían al parar. */
export const pedirTuberiaAgua = (campo: string, ctx: Contexto, versiones: Versiones): TuberiaAgua => tuberiaAgua(campo, ctx, versiones)
export function useTuberiaAgua(campo: string): TuberiaAgua {
  const ctx = useCtx()
  const versiones = useVersiones()
  return useDato(TUBERIA_AGUA, { campo }, `${versionDe(ctx)}.${versionDe(versiones)}`, () => pedirTuberiaAgua(campo, ctx, versiones))
}

/* ─────────────────────────── si falla hoy ─────────────────────────── */

/** «Si falla hoy» de varios campos: un ranking de todos y, por campo, lo que no entra en él. */
export interface VistaCriticidad {
  /** Todos los equipos de los campos pedidos, de mayor a menor bbl/d si fallan hoy, sin lo que ya está parado. */
  ranking: FilaCriticidad[]
  /** Por campo, en el orden pedido: lo ya parado (va en «Perdiéndose ahora»), lo que no se puede medir y la línea «Cambió hoy». */
  campos: Array<Pick<CriticidadDelCampo, 'campoId' | 'parados' | 'sinCalcular' | 'cambioHoy'>>
}
/** `GET /api/vistas/criticidad?campos=a,b` */
export function pedirCriticidad(campos: string[], ctx: Contexto): VistaCriticidad {
  return {
    ranking: criticidad(campos, ctx),
    campos: campos.map(c => {
      const x = criticidadDelCampo(c, ctx)
      return { campoId: c, parados: x.parados, sinCalcular: x.sinCalcular, ...(x.cambioHoy ? { cambioHoy: x.cambioHoy } : {}) }
    }),
  }
}
export function useCriticidad(campos: string[]): VistaCriticidad {
  const ctx = useCtx()
  return useDato(CRITICIDAD, { campos }, v(ctx), () => pedirCriticidad(campos, ctx))
}

/* ─────────────────────────── lo perdido por tramo ─────────────────────────── */

/** `GET /api/vistas/choke/reparto?campos=&desde=&hasta=` */
export const pedirRepartoChoke = (q: ConsultaPeriodo, ctx: Contexto): BrechaChoke => brechaPorChoke(q.campos, q.desde, q.hasta, ctx)
export function useRepartoChoke(q: ConsultaPeriodo): BrechaChoke {
  const ctx = useCtx()
  return useDato(REPARTO_CHOKE, q, v(ctx), () => pedirRepartoChoke(q, ctx))
}

/** `GET /api/vistas/choke/mensual?campos=` */
export const pedirRepartoMensual = (campos: string[], ctx: Contexto): MesPorTramo[] => repartoPorMes(campos, ctx)
export function useRepartoMensual(campos: string[]): MesPorTramo[] {
  const ctx = useCtx()
  return useDato(REPARTO_CHOKE_MENSUAL, { campos }, v(ctx), () => pedirRepartoMensual(campos, ctx))
}

/** `GET /api/vistas/choke/base?campos=&desde=&hasta=` · undefined sin tres meses publicados antes del período. */
export const pedirBaseChoke = (q: ConsultaPeriodo, ctx: Contexto): LineaBasePorTramo | undefined => lineaBasePorTramo(q.campos, q.desde, q.hasta, ctx)
export function useBaseChoke(q: ConsultaPeriodo): LineaBasePorTramo | undefined {
  const ctx = useCtx()
  return useDato(BASE_CHOKE, q, v(ctx), () => pedirBaseChoke(q, ctx))
}

/* ─────────────────────────── la topología ─────────────────────────── */

/** Un elemento de la topología, con su nombre y su clase cuando el registro los tiene. */
export interface ElementoTopologia extends ChokeDeElemento {
  nombre?: string
  clase?: ClaseElemento
}
/** La topología que rige en un campo. */
export interface TopologiaVigente {
  campoId: string
  /** La firmada en la configuración (true) o la que se deriva del registro, sin firmar (false). */
  firmada: boolean
  /** Cada elemento con el tramo que sale de su alcance y, si aplica, su caso de borde. */
  elementos: ElementoTopologia[]
}
/** `GET /api/vistas/topologia?campo=`. El caso de borde (2 o 3 pozos de una
 *  misma locación, U2 §8.6) se marca con la locación de los pozos: en el demo, la
 *  de `datos/topologia.ts`, que entra por fuente.ts; el servidor, con la suya. */
export function pedirTopologia(campo: string, ctx: Contexto): TopologiaVigente {
  const derivada = new Map(topologiaDerivada(campo).map(e => [e.elemento, e]))
  const elementos = marcarCasosBorde(topologiaDe(campo, ctx), locacionDe(campo)).map((e): ElementoTopologia => {
    const d = derivada.get(e.elemento)
    return { ...e, choke: chokeDeAlcance(e.alcance), ...(d && !('nombre' in e) ? { nombre: d.nombre, clase: d.clase } : {}) }
  })
  return { campoId: campo, firmada: topologiaFirmada(campo, ctx), elementos }
}
export function useTopologia(campo: string): TopologiaVigente {
  const ctx = useCtx()
  return useDato(TOPOLOGIA, { campo }, v(ctx), () => pedirTopologia(campo, ctx))
}

/** Una propuesta de topología, marcada si sus pozos son de una misma locación. */
export type PropuestaVista = PropuestaTopologia & { casoBorde?: 'misma-locacion' }
/** `GET /api/vistas/topologia/propuestas?campo=` */
export function pedirPropuestasTopologia(campo: string, ctx: Contexto): PropuestaVista[] {
  const loc = locacionDe(campo)
  return propuestasTopologia(campo, ctx).map(p => {
    const k = p.pozos.length ? casoBordeDe({ alcance: alcancePorPozos(p.pozos), pozos: p.pozos }, loc) : undefined
    return k ? { ...p, casoBorde: k } : p
  })
}
export function usePropuestasTopologia(campo: string): PropuestaVista[] {
  const ctx = useCtx()
  return useDato(PROPUESTAS_TOPOLOGIA, { campo }, v(ctx), () => pedirPropuestasTopologia(campo, ctx))
}
