import { useCtx, useVersiones, useSesion } from './sesion'
import { useDato, versionDe } from './consulta'
import { locacionDe } from './fuente'
import { guardadasDe } from './arbol'
import {
  TUBERIA, SERIE_CHOKE, TUBERIA_AGUA, CRITICIDAD, REPARTO_CHOKE, REPARTO_CHOKE_MENSUAL, BASE_CHOKE, TOPOLOGIA, PROPUESTAS_TOPOLOGIA, CAPACIDADES,
  ARBOL_CHOKE, type ConsultaPeriodo, type ConsultaArbol,
} from './contrato'
import {
  arbolDelChoke, ORDENES_ARBOL, NIVELES_ARBOL, NOMBRE_ORDEN, NOMBRE_NIVEL, PASO_DE_NIVEL, CAMPO_ANH, FALTA, SIN_ASIGNAR,
  TEXTO_FALTA, TEXTO_PERDIDA, EXPLICA_PERDIDA, esRamaQueFalta,
  type ArbolChoke, type NodoArbol, type OrdenArbol, type NivelArbol, type DimensionArbol,
} from '@/entities/choke-arbol'
import type { BorradorClasificacion } from '@/entities/anh-clasificacion'
import { tuberiaCampo, serieChoke, brechaPorChoke, repartoPorMes, lineaBasePorTramo } from '@/entities/choke-reparto'
import { enterosDeReparto } from '@/entities/redondeo'
import {
  topologiaDe, topologiaFirmada, topologiaDerivada,
  propuestasTopologia, marcarCasosBorde, casoBordeDe, alcancePorPozos, chokeDeAlcance, validarTopologia, porSaberDelCampo, sinResponderDe,
  vistaCapacidades, capacidadesQueBloquean,
  ORDEN_CHOKE, ORDEN_CHOKE_CAMPO, CHOKES_Y_SIN_ASIGNAR, ESCALONES, NOMBRE_CHOKE, EXPLICA_TRAMO, RESUMEN_TRAMO, DONDE_CHOKE,
  NOMBRE_CHOKE_CAMPO, SUBNIVEL_MERCADO, NOMBRE_ALCANCE, NOMBRE_ESCALON, PARAMETROS_CHOKE, EXPLICA_CASO_BORDE, PREGUNTA_ORIGEN,
  type ChokeAnh, type ChokeCampo, type ChokeOSinAsignar, type EscalonBrecha, type EscalonOSinClasificar, type AlcanceElemento,
  type ChokeDeElemento, type ClaseElemento, type PropuestaTopologia, type TuberiaCampo, type TramoTuberia, type TrenTuberia,
  type TrenPlanta, type EstadoTramo, type BrechaChoke, type BrechaCampoChoke, type EquipoBbl, type MesPorTramo,
  type LineaBasePorTramo, type AntesYDespues, type DiaChoke, type CambioDominante, type Historial, type VistaCapacidades,
  type PerdiendoAhora, type CapacidadesDeLaTuberia, type MedidorDelCampo, type PropuestaFactorMedicion,
} from '@/entities/choke'
import {
  tuberiaAgua, ORDEN_AGUA, NOMBRE_TRAMO_AGUA,
  type TuberiaAgua, type TramoTuberiaAgua, type TramoAgua, type BombaDelTren, type ColchonAgua, type SiParaOtra,
} from '@/entities/choke-agua'
import {
  criticidad, criticidadDelCampo,
  type FilaCriticidad, type CriticidadDelCampo, type FamiliaCriticidad, type AvisoTrabajoCritico,
} from '@/entities/criticidad'
import {
  FUENTES_CAPACIDAD, NOMBRE_FUENTE_CAPACIDAD, NOMBRE_CAPACIDAD, UNIDAD_CAPACIDAD, TOPE_FACTOR_MEDICION, revisarCapacidades, cifraFactor,
  type FuenteCapacidad, type CapacidadFirmada, type CapacidadesCampo, type CapacidadVigente, type BombaVigente, type CapacidadesVigentes,
  type TramoCapacidad, type EstadoCapacidad, type HallazgoCapacidad, type FirmaCapacidades, type EntradaRevision,
  type FactorMedicionFirmado, type FactorMedicionVigente,
} from '@/entities/capacidades'
import {
  RESPUESTAS_TOPOLOGIA, elementoDeRespuesta, respuestaDe, respuestaDePozos, fraseDe, renglonDe, dondeTramo, dondeCorto,
  conTopologia, pendientesDe, faltanParaFirmar, plantillaTopologia,
  estadoConfiguracion, PASOS_CONFIGURACION, NOMBRE_PASO,
  type RespuestaTopologia, type RespuestaEquipo, type TopologiaEnBorrador,
  type EstadoConfiguracion, type PasoDelEstado, type PasoConfiguracion,
  type ImpactoConfig, type ImpactoCampo, type CambioCriticidad, type CambioDeTramo, type TopologiaLeida, type HallazgoTopologia,
} from '@/entities/choke-config'
import type { Contexto } from '@/entities/causa-senal'
import type { Versiones } from '@/entities/diferido'

/** LA COSTURA DEL MODELO CHOKE: «¿Dónde se trabó?», «Qué limita hoy» y «Si falla hoy».
 *
 *  Cada vista es un GET de contrato.ts (`/vistas/campos/:campo/tuberia`,
 *  `…/choke/serie`, `…/agua`, `…/capacidades`, `/vistas/criticidad`,
 *  `/vistas/choke/…`, `/vistas/topologia…`). El servidor corre el motor
 *  (entities/choke.ts, choke-agua.ts, criticidad.ts) con la configuración
 *  firmada y su historial (cada día se mide con las capacidades que regían ese
 *  día: firmar hoy no reescribe un mes cerrado); en el demo responde el motor en
 *  el navegador con la sesión. Aquí, por vista:
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
  PREGUNTA_ORIGEN, FUENTES_CAPACIDAD, NOMBRE_FUENTE_CAPACIDAD, NOMBRE_CAPACIDAD, UNIDAD_CAPACIDAD, RESPUESTAS_TOPOLOGIA, TOPE_FACTOR_MEDICION,
  // El factor de medición con tres decimales y coma, como el factor de asignación.
  cifraFactor,
  // Las palabras del árbol de pérdidas del choke: sus órdenes y niveles, lo
  // que falta, la rama vacía de la pérdida y el campo de la ANH de cada paso.
  ORDENES_ARBOL, NIVELES_ARBOL, NOMBRE_ORDEN, NOMBRE_NIVEL, PASO_DE_NIVEL, CAMPO_ANH, FALTA, SIN_ASIGNAR, TEXTO_FALTA, TEXTO_PERDIDA,
  EXPLICA_PERDIDA, esRamaQueFalta,
  // Reglas de lo que entra a mano (las dos puntas: la pantalla avisa, el servidor decide):
  // el tramo sale del alcance y el alcance del número de pozos (U2 §8.2); la
  // respuesta de cada equipo, la topología del borrador encima de la
  // configuración, la regla de la primera firma y la plantilla de la carga
  // (choke-config.ts); la revisión de las capacidades que se van a firmar (U2 §8.4).
  chokeDeAlcance, alcancePorPozos, casoBordeDe, validarTopologia, revisarCapacidades, capacidadesQueBloquean,
  elementoDeRespuesta, respuestaDe, respuestaDePozos, conTopologia, pendientesDe, faltanParaFirmar, plantillaTopologia,
  // Las palabras de la filosofía operacional, hechas por el motor.
  fraseDe, renglonDe, dondeTramo, dondeCorto,
  // F3 · Configuración: el estado de un campo (N de M pasos listos), de la configuración firmada y lo contestado en el borrador.
  estadoConfiguracion, PASOS_CONFIGURACION, NOMBRE_PASO,
}
export type {
  ChokeAnh, ChokeCampo, ChokeOSinAsignar, EscalonBrecha, EscalonOSinClasificar, AlcanceElemento, ChokeDeElemento, ClaseElemento,
  PropuestaTopologia, TuberiaCampo, TramoTuberia, TrenTuberia, TrenPlanta, EstadoTramo, BrechaChoke, BrechaCampoChoke, EquipoBbl,
  MesPorTramo, LineaBasePorTramo, AntesYDespues, DiaChoke, CambioDominante, PerdiendoAhora, CapacidadesDeLaTuberia, MedidorDelCampo,
  TuberiaAgua, TramoTuberiaAgua, TramoAgua, BombaDelTren, ColchonAgua, SiParaOtra, FilaCriticidad, FamiliaCriticidad, AvisoTrabajoCritico,
  ImpactoConfig, ImpactoCampo, CambioCriticidad, CambioDeTramo, TopologiaLeida, HallazgoTopologia,
  RespuestaTopologia, RespuestaEquipo, TopologiaEnBorrador, VistaCapacidades,
  EstadoConfiguracion, PasoDelEstado, PasoConfiguracion,
  FuenteCapacidad, CapacidadFirmada, CapacidadesCampo, CapacidadVigente, BombaVigente, CapacidadesVigentes, TramoCapacidad,
  EstadoCapacidad, HallazgoCapacidad, FirmaCapacidades, EntradaRevision, FactorMedicionFirmado, FactorMedicionVigente, PropuestaFactorMedicion,
  ArbolChoke, NodoArbol, OrdenArbol, NivelArbol, DimensionArbol, ConsultaArbol,
}

/** La versión del contexto con que se calcula: entra en la clave de la caché. */
const v = (ctx: Contexto) => String(versionDe(ctx))
/** Lo mismo con el historial de versiones firmadas (las capacidades de cada día). */
const vh = (ctx: Contexto, versiones: Historial | Versiones) => `${versionDe(ctx)}.${versionDe(versiones)}`
/** Y con lo que dijeron las personas en la clasificación: las vistas que
 *  reparten por tramo o por planeación leen la fila vigente (QA-A-01; C-09),
 *  así que una escritura las vuelve a pedir. */
const vhg = (ctx: Contexto, versiones: Historial | Versiones, guardadas: object) => `${vh(ctx, versiones)}.${versionDe(guardadas)}`
/** Lo guardado de la sesión como lo lee el motor. Las cinco vistas que reparten
 *  por tramo o por planeación lo piden SIN valor por defecto (QA-R, vecino 9):
 *  quien las llame sin lo guardado obtendría el reparto de «nadie dijo nada» sin
 *  aviso. Desde JavaScript (los guiones de la referencia, sin escrituras) llega
 *  `undefined`, y entonces sí es «nadie dijo nada». */
type Guardadas = Record<string, BorradorClasificacion>
const conGuardadas = (guardadas: Guardadas | undefined) => ({ guardadas: guardadasDe(guardadas ?? {}) })

/* ─────────────────────────── la tubería del campo ─────────────────────────── */

/** `GET /api/vistas/campos/:campo/tuberia?desde=&hasta=`. Con el historial,
 *  cada día del período usa las capacidades que regían ese día, y la tubería
 *  dice quién y cuándo firmó las de hoy. Lo perdido y lo que se pierde ahora
 *  van por el tramo vigente de cada fila (`guardadas`: lo que dijeron las personas). */
export const pedirTuberia = (campo: string, desde: Date, hasta: Date, ctx: Contexto, versiones: Historial | undefined, guardadas: Guardadas): TuberiaCampo =>
  tuberiaCampo(campo, desde, hasta, ctx, versiones, conGuardadas(guardadas))
export function useTuberia(campo: string, desde: Date, hasta: Date): TuberiaCampo {
  const ctx = useCtx(), versiones = useVersiones(), guardadas = useSesion(s => s.clasificacionesAnh)
  return useDato(TUBERIA, { campo, desde, hasta }, vhg(ctx, versiones, guardadas), () => pedirTuberia(campo, desde, hasta, ctx, versiones, guardadas))
}

/** La serie de lo que limitó cada día y los avisos «Cambió lo que limita». */
export interface SerieChoke {
  dias: DiaChoke[]
  cambios: CambioDominante[]
  /** Por campo: las vueltas del dominante sin el umbral ni la persistencia (para explicar por qué hay menos avisos). */
  vueltas: Record<string, number>
}
/** `GET /api/vistas/campos/:campo/choke/serie?desde=&hasta=` */
export const pedirSerieChoke = (campo: string, desde: Date, hasta: Date, ctx: Contexto, versiones: Historial | undefined, guardadas: Guardadas): SerieChoke =>
  serieChoke([campo], desde, hasta, ctx, versiones, conGuardadas(guardadas))
export function useSerieChoke(campo: string, desde: Date, hasta: Date): SerieChoke {
  const ctx = useCtx(), versiones = useVersiones(), guardadas = useSesion(s => s.clasificacionesAnh)
  return useDato(SERIE_CHOKE, { campo, desde, hasta }, vhg(ctx, versiones, guardadas), () => pedirSerieChoke(campo, desde, hasta, ctx, versiones, guardadas))
}

/* ─────────────────────────── la tubería del agua ─────────────────────────── */

/** `GET /api/vistas/campos/:campo/agua`. El historial de versiones firmadas hace
 *  que el colchón de una parada abierta use el tanque y el respaldo que regían al parar. */
export const pedirTuberiaAgua = (campo: string, ctx: Contexto, versiones: Versiones): TuberiaAgua => tuberiaAgua(campo, ctx, versiones)
export function useTuberiaAgua(campo: string): TuberiaAgua {
  const ctx = useCtx()
  const versiones = useVersiones()
  return useDato(TUBERIA_AGUA, { campo }, vh(ctx, versiones), () => pedirTuberiaAgua(campo, ctx, versiones))
}

/* ─────────────────────────── las capacidades ─────────────────────────── */

/** `GET /api/vistas/campos/:campo/capacidades`: lo que deja pasar cada tramo
 *  hoy (firmado o del demo, con su fuente en palabras), quién y cuándo firmó, lo
 *  que la revisión necesita del pasado (lo máximo que pasó en un día), lo que
 *  la revisión encuentra en lo que rige (U2 §8.4) y el factor de medición: el
 *  que rige, quién lo firmó y lo que TRIM propone (D3; 5E·H9). Se escriben y se
 *  firman con la configuración (`POST /api/configuracion`, `Config.capacidades`). */
export const pedirCapacidades = (campo: string, ctx: Contexto, versiones?: Historial): VistaCapacidades => vistaCapacidades(campo, ctx, versiones)
export function useCapacidades(campo: string): VistaCapacidades {
  const ctx = useCtx(), versiones = useVersiones()
  return useDato(CAPACIDADES, { campo }, vh(ctx, versiones), () => pedirCapacidades(campo, ctx, versiones))
}

/* ─────────────────────────── si falla hoy ─────────────────────────── */

/** «Si falla hoy» de varios campos: un ranking de todos y, por campo, lo que no entra en él. */
export interface VistaCriticidad {
  /** Todos los equipos de los campos pedidos, sin lo que ya está parado: primero lo medido, de mayor a
   *  menor bbl/d si fallan hoy; después los techos y al final lo que no tiene cifra (D6). El `puesto`
   *  de cada fila medida es el de su campo (1 + cuántos medidos de su campo cuestan más). */
  ranking: FilaCriticidad[]
  /** Por campo, en el orden pedido: lo ya parado (va en «Perdiéndose ahora»), lo
   *  que no se puede medir, la línea «Cambió hoy», lo que decide cada rol (el
   *  próximo instrumento, no intervenir hoy, los trabajos del programa que tocan
   *  un equipo que hoy vale más) y la frase del desembotellamiento (U2 §6.4-6.5). */
  campos: Array<Pick<CriticidadDelCampo, 'campoId' | 'parados' | 'sinCalcular' | 'cambioHoy' | 'proximoInstrumento' | 'noIntervenir' | 'avisosTrabajo' | 'desembotellar' | 'campoDeGas'>>
}
/** `GET /api/vistas/criticidad?campos=a,b` */
export function pedirCriticidad(campos: string[], ctx: Contexto): VistaCriticidad {
  return {
    ranking: criticidad(campos, ctx),
    campos: campos.map(c => {
      const x = criticidadDelCampo(c, ctx)
      return { campoId: c, parados: x.parados, sinCalcular: x.sinCalcular, avisosTrabajo: x.avisosTrabajo, ...(x.campoDeGas ? { campoDeGas: x.campoDeGas } : {}),
        ...(x.cambioHoy ? { cambioHoy: x.cambioHoy } : {}), ...(x.proximoInstrumento ? { proximoInstrumento: x.proximoInstrumento } : {}),
        ...(x.noIntervenir ? { noIntervenir: x.noIntervenir } : {}), ...(x.desembotellar ? { desembotellar: x.desembotellar } : {}) }
    }),
  }
}
export function useCriticidad(campos: string[]): VistaCriticidad {
  const ctx = useCtx()
  return useDato(CRITICIDAD, { campos }, v(ctx), () => pedirCriticidad(campos, ctx))
}

/* ─────────────────────────── lo perdido por tramo ─────────────────────────── */

/** `GET /api/vistas/choke/reparto?campos=&desde=&hasta=`: sobre las filas de
 *  la ANH con su clasificación vigente, las mismas del árbol (QA-A-01). */
export const pedirRepartoChoke = (q: ConsultaPeriodo, ctx: Contexto, versiones: Historial | undefined, guardadas: Guardadas): BrechaChoke => {
  const op = conGuardadas(guardadas)
  // F2 · H2: con el entero de cada nodo que se muestra (la regla de redondeo): suma su total a la vista.
  return { ...brechaPorChoke(q.campos, q.desde, q.hasta, ctx, versiones, op), enteros: enterosDeReparto(q.campos, q.desde, q.hasta, ctx, op) }
}
export function useRepartoChoke(q: ConsultaPeriodo): BrechaChoke {
  const ctx = useCtx(), versiones = useVersiones(), guardadas = useSesion(s => s.clasificacionesAnh)
  return useDato(REPARTO_CHOKE, q, vhg(ctx, versiones, guardadas), () => pedirRepartoChoke(q, ctx, versiones, guardadas))
}

/** `GET /api/vistas/choke/mensual?campos=` */
export const pedirRepartoMensual = (campos: string[], ctx: Contexto, versiones: Historial | undefined, guardadas: Guardadas): MesPorTramo[] =>
  repartoPorMes(campos, ctx, versiones, conGuardadas(guardadas))
export function useRepartoMensual(campos: string[]): MesPorTramo[] {
  const ctx = useCtx(), versiones = useVersiones(), guardadas = useSesion(s => s.clasificacionesAnh)
  return useDato(REPARTO_CHOKE_MENSUAL, { campos }, vhg(ctx, versiones, guardadas), () => pedirRepartoMensual(campos, ctx, versiones, guardadas))
}

/** `GET /api/vistas/choke/arbol?campos=&desde=&hasta=&orden=`: el árbol de
 *  pérdidas del choke del período, con la clasificación vigente de cada
 *  parada. El servidor aplica lo que dijeron las personas; en el demo eso vive
 *  en la sesión (`clasificacionesAnh`), como en `/vistas/anh/paradas`. */
export const pedirArbolChoke = (q: ConsultaArbol, ctx: Contexto, guardadas: Record<string, BorradorClasificacion>): ArbolChoke =>
  arbolDelChoke(q.campos, q.desde, q.hasta, ctx, { orden: q.orden, guardadas: guardadasDe(guardadas) })
export function useArbolChoke(q: ConsultaArbol): ArbolChoke {
  const ctx = useCtx()
  const guardadas = useSesion(s => s.clasificacionesAnh)
  return useDato(ARBOL_CHOKE, q, `${versionDe(ctx)}.${versionDe(guardadas)}`, () => pedirArbolChoke(q, ctx, guardadas))
}

/** `GET /api/vistas/choke/base?campos=&desde=&hasta=` · undefined sin tres meses publicados antes del período. */
export const pedirBaseChoke = (q: ConsultaPeriodo, ctx: Contexto, versiones: Historial | undefined, guardadas: Guardadas): LineaBasePorTramo | undefined =>
  lineaBasePorTramo(q.campos, q.desde, q.hasta, ctx, versiones, conGuardadas(guardadas))
export function useBaseChoke(q: ConsultaPeriodo): LineaBasePorTramo | undefined {
  const ctx = useCtx(), versiones = useVersiones(), guardadas = useSesion(s => s.clasificacionesAnh)
  return useDato(BASE_CHOKE, q, vhg(ctx, versiones, guardadas), () => pedirBaseChoke(q, ctx, versiones, guardadas))
}

/* ─────────────────────────── la topología ─────────────────────────── */

/** Un elemento de la topología, con su nombre y su clase cuando el registro los tiene. */
export interface ElementoTopologia extends ChokeDeElemento {
  nombre?: string
  clase?: ClaseElemento
}
/** Un equipo del que se firmó «Todavía no sé», con su nombre y su clase cuando el registro los tiene. */
export interface EquipoPorSaber { elemento: string; nombre?: string; clase?: ClaseElemento }
/** La topología que rige en un campo. */
export interface TopologiaVigente {
  campoId: string
  /** La firmada en la configuración (true) o la que se deriva del registro, sin firmar (false). */
  firmada: boolean
  /** Cada elemento con el tramo que sale de su alcance y, si aplica, su caso de borde. */
  elementos: ElementoTopologia[]
  /** Los equipos firmados «Todavía no sé»: sin tramo, sus paradas lo preguntan (TRIM no lo adivina). */
  porSaber: EquipoPorSaber[]
  /** Con la topología firmada, lo que el registro tiene y la firma no (un equipo
   *  nuevo), con lo que TRIM deduce del registro: espera su respuesta sin perder
   *  lo firmado. Mientras tanto, el tramo de sus paradas sale de la regla por tipo de falla. */
  sinResponder: ElementoTopologia[]
}
/** `GET /api/vistas/topologia?campo=`. El caso de borde (2 o 3 pozos de una
 *  misma locación, U2 §8.6) se marca con la locación de los pozos: en el demo, la
 *  de `datos/topologia.ts`, que entra por fuente.ts; el servidor, con la suya. */
export function pedirTopologia(campo: string, ctx: Contexto): TopologiaVigente {
  const derivada = new Map(topologiaDerivada(campo).map(e => [e.elemento, e]))
  const loc = locacionDe(campo)
  const conNombre = (e: ChokeDeElemento): ElementoTopologia => {
    const d = derivada.get(e.elemento)
    return { ...e, choke: chokeDeAlcance(e.alcance), ...(d && !('nombre' in e) ? { nombre: d.nombre, clase: d.clase } : {}) }
  }
  const elementos = marcarCasosBorde(topologiaDe(campo, ctx), loc).map(conNombre)
  const porSaber = porSaberDelCampo(campo, ctx).map((elemento): EquipoPorSaber => {
    const d = derivada.get(elemento)
    return { elemento, ...(d ? { nombre: d.nombre, clase: d.clase } : {}) }
  })
  const sinResponder = marcarCasosBorde(sinResponderDe(campo, ctx), loc).map(conNombre)
  return { campoId: campo, firmada: topologiaFirmada(campo, ctx), elementos, porSaber, sinResponder }
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
