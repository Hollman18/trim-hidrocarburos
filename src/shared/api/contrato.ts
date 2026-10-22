import {
  tal, fecha, horasSinFin, bandaAbierta, nulo, opc, oNada, lista, dic, par, obj, ref, como, isoColombia, ErrorDeContrato,
  type Codec, type DTO, type Respuesta,
} from './cable'
import type { Libro, LineaBase, Dia, Pregunta, Tramo, AsignacionPozo, HistorialEquipo, HistorialParte, FallaEquipo, EventoCargado } from '@/entities/libro'
import type { Prediccion, ParadaMedida, Riesgo, EstadoCampo, Colchon, OrdenDeCierre, PasoCierre, Veredicto } from '@/entities/diferido'
import type { Senal } from '@/entities/vigia'
import type { SaludParte, SenalDeParte, SenalQueCruza } from '@/entities/salud'
import type { Pozo, EventoPozo, Respuesta as RespuestaParada } from '@/entities/pozos'
import type { PerfilBomba, Alarma } from '@/entities/bombas'
import type { ParteId } from '@/entities/partes'
import type { Opcion, Mensaje } from '@/entities/mensajes'
import type { FallaVista } from '@/entities/aciertos'
import type { AvisoSap, OrdenSap } from '@/entities/sap'
import type { EquipoVivo } from '@/entities/equipo-vivo'
import type { EquipoEnCampo } from '@/entities/equipos'
import type { Dispositivo, SerieTag, Campo } from '@/entities/tipos'
import { faltaEnSerie } from '@/entities/serie'
import type { LimiteTag } from '@/entities/limites'
import { normalizarConfig, type Config, type Version } from '@/entities/configuracion'
import type { Usuario, PersonaDelRegistro, Invitacion, CambioAcceso } from '@/entities/usuarios'
import type { Informe } from '@/entities/informe'
import type { FilaOficial, FilaCargada, CargaAsignacion } from '@/entities/asignacion'
import type { Analisis } from '@/entities/catalogo'
import type { PlantaCampo, CambioPlanta } from '@/entities/planta'
import type {
  MesResumen, ResumenLibro, OpcionesRespuesta, ParadaEnPeriodo, FilaPozo, DetallePozo, FilaEsp,
} from './diferidos'
import type { HistoriaEquipo, FilaEquipo, EquipoConfiable, FichaEquipo, BombaVista } from './equipos'
import type { EquipoSap, IdentidadSap, Relojes } from './sap'
import type { Repuesto } from '@/entities/sap'
import type { Predicciones } from './predicciones'
import type { CampoAhora } from './medicion'
import type { DatosDeCatalogo, CatalogoDeCampo } from './catalogo'
import type { CicloValor, PlanAccion, TramoCiclo, DecisionPlan } from '@/entities/escenarios'
import type {
  TuberiaCampo, TramoTuberia, PerdiendoAhora, MedidorDelCampo, BrechaChoke, BrechaCampoChoke, MesPorTramo, LineaBasePorTramo, DiaChoke,
  CambioDominante, VistaCapacidades,
} from '@/entities/choke'
import type { EntradaRevision } from '@/entities/capacidades'
import type { TuberiaAgua, TramoTuberiaAgua, ColchonAgua } from '@/entities/choke-agua'
import type { FilaCriticidad, AvisoTrabajoCritico } from '@/entities/criticidad'
import type { ParadaAnh, ConfirmacionLote } from '@/entities/anh-paradas'
import { clasificar, problemasDeClasificacion, type ClasificacionAnh, type BorradorClasificacion, type PropuestaAnh } from '@/entities/anh-clasificacion'
import { PASOS, PASO_CAMPO, PASO_CIRCULAR, type PasoAnh } from '@/entities/anh-catalogo'
import type { CalidadClasificacion } from '@/entities/anh-calidad'
import type { ImpactoConfig, TopologiaLeida } from '@/entities/choke-config'
import type { SerieChoke, VistaCriticidad, TopologiaVigente, PropuestaVista } from './choke'

/** EL CONTRATO DEL FRONT CON EL BACKEND, endpoint por endpoint.
 *
 *  Cada endpoint dice su ruta (bajo la raíz de la API: `/api` por defecto,
 *  ver fuente.ts), sus parámetros y su CÓDEC: la forma exacta del JSON
 *  (`DTO<typeof X.codec>`), `aDTO` (dominio → JSON: lo que el backend tiene
 *  que producir) y `revivir` (JSON → dominio: lo que hace la fuente http).
 *  scripts/verificar-contrato.mjs prueba, con los datos del demo, que
 *  `revivir(JSON.parse(JSON.stringify(aDTO(x))))` es igual a `x` en cada uno.
 *
 *  REGLAS DEL CABLE (todas las respuestas)
 *  - El cuerpo es `{ "datos": …, "refs": { … } }`. Las entidades que muchas
 *    filas comparten viajan UNA vez en `refs` y las filas las nombran por
 *    clave: `refs.pozos["ceiba/LC-14"]`, `refs.eventos["EP-…"]`,
 *    `refs.perfiles["ceiba/P-201B"]`.
 *  - Fechas: ISO 8601 con zona y milisegundos, en hora de Colombia
 *    («2026-10-02T14:00:00.000-05:00»). Se acepta cualquier zona explícita;
 *    sin zona es un error.
 *  - Un campo opcional que no está se OMITE (no `null`). `null` solo donde el
 *    dominio dice null («sin dato del fiscal», «sigue abierta»).
 *  - Horas que nunca llegan (un tanque que no se llena): `null`, solo en los
 *    campos que el códec marca con `horasSinFin`. JSON no tiene Infinity.
 *  - Una respuesta que puede no existir (un pozo que no está) va con
 *    `"datos": null`, no con 404: la pantalla muestra el hueco.
 *  - El error: `{ "error": { "codigo": "…", "mensaje": "…" } }` con el HTTP
 *    que corresponda (403 no le toca, 404 no existe la ruta, 409 otro llegó
 *    antes, 422 la forma). Puede traer más campos (`errores`, `campo`).
 *
 *  RUTAS: una ruta por recurso, sin dos formas en la misma ruta.
 *  - `/catalogo`: lo que el servidor sabe de cada campo y casi no cambia.
 *  - `/vistas/…`: lo CALCULADO por el servidor (libro, riesgo, estado…).
 *  - `/campos/:campo/…`: los INSUMOS que el borde entrega y el registro de la
 *    cadena de datos (procedencia, inventario). No los pide ninguna pantalla
 *    del libro: los consume el servidor.
 *  - Lo que entra a mano: `/configuracion`, `/usuarios`, `/paradas/…`,
 *    `/sap/…`, `/informes`, `/asignacion-oficial`, `/analisis`, `/planta/cambios`,
 *    `/planes`, la clasificación ANH (`/anh/paradas/…`) y la topología del choke
 *    (`/topologia/importar`, `/configuracion/vista-previa`, y su firma en `/configuracion`).
 *  Ninguna ruta tiene un tramo literal al mismo nivel que un `:parámetro`. */

/* ───────────────────────────── el endpoint ───────────────────────────── */

export interface Endpoint<P extends object, T, J> {
  metodo: 'GET'
  /** Bajo la raíz de la API, con `:nombre` para los parámetros de la ruta. */
  ruta: string
  codec: Codec<T, J>
  /** Solo para que TypeScript recuerde la forma de los parámetros. */
  readonly parametros?: P
}

/** Los parámetros: los de la ruta van en ella; los demás, en la consulta. */
type Valor = string | number | Date | readonly string[] | undefined
const get = <P extends object>() => <T, J>(ruta: string, codec: Codec<T, J>): Endpoint<P, T, J> => ({ metodo: 'GET', ruta, codec })

const aTexto = (k: string, v: Valor): string => {
  if (v instanceof Date) return isoColombia(v)
  if (Array.isArray(v)) return v.join(',')
  if (typeof v === 'number' || typeof v === 'string') return String(v)
  throw new ErrorDeContrato(`parámetro «${k}» con un valor que no se puede mandar: ${String(v)}`)
}

/** La dirección de un pedido: la ruta con sus parámetros y la consulta
 *  ordenada (la misma consulta da siempre el mismo texto: es la clave de la caché). */
export function urlDe<P extends object>(ep: Endpoint<P, unknown, unknown>, p: P): string {
  const valores = p as Record<string, Valor>, usados = new Set<string>()
  const camino = ep.ruta.replace(/:([a-zA-Z]+)/g, (_, k: string) => {
    usados.add(k)
    if (valores[k] === undefined || valores[k] === '') throw new ErrorDeContrato(`falta el parámetro «${k}» de ${ep.ruta}`)
    return encodeURIComponent(aTexto(k, valores[k]))
  })
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(valores)) if (!usados.has(k) && v !== undefined) q.set(k, aTexto(k, v))
  q.sort()
  const consulta = q.toString()
  return consulta ? `${camino}?${consulta}` : camino
}

/* ───────────────────────────── las piezas ───────────────────────────── */

/** Un pozo con su registro y sus pruebas: una vez por respuesta, en `refs.pozos`. */
const pozo = ref<Pozo, Pozo>('pozos', p => `${p.campoId}/${p.id}`, tal())
/** Un evento de pozo del controlador: una vez por respuesta, en `refs.eventos`. */
const eventoPozo = ref<EventoPozo, EventoPozo>('eventos', e => e.id, tal())
/** El perfil de una bomba en un campo: una vez por respuesta, en `refs.perfiles`. */
const perfil = ref<PerfilBomba, PerfilBomba>('perfiles', p => `${p.campoId}/${p.equipo}`, tal())

/** Una serie del historiador (`SerieTag`): ya es JSON puro y viaja tal cual,
 *  pero al entrar se revisa su forma. Sin `pasoH` (o en cero) el vigía tendría
 *  que suponer un paso, que es justo lo que el contrato fija que no se hace. */
const serieTag: Codec<SerieTag, SerieTag> = {
  aDTO: x => x,
  revivir: j => {
    const falta = faltaEnSerie(j)
    if (falta) throw new ErrorDeContrato(falta)
    return j
  },
}

/** El punto de alarma de un tag (base maestra de alarmas): el lado que no
 *  tiene puede llegar en `null` (el nacimiento del borde manda `"bajo": null`)
 *  y al entrar se vuelve ausente. Así ninguna pantalla compara `v <= null`,
 *  que en JavaScript es `v <= 0`: una alarma inventada en cero. */
const alarma = obj<Alarma>()({ alta: opc(tal<number>()), baja: opc(tal<number>()) })
/** Una señal: su banda normal puede estar abierta por un lado («< 85»). */
const senal = obj<Senal>()({ normal: opc(bandaAbierta), serie: opc(serieTag), alarma: opc(alarma) })
/** Un instrumento de un equipo, con su serie revisada. */
const dispositivo = obj<Dispositivo>()({ serie: opc(serieTag) })
const equipoVivo = obj<EquipoVivo>()({ dispositivos: lista(dispositivo) })
const senalDeParte = obj<SenalDeParte>()({ senal })
const saludParte = obj<SaludParte>()({
  primera: opc(como<SenalQueCruza>()(senalDeParte)), lenta: opc(como<SenalQueCruza>()(senalDeParte)),
  causaActiva: lista(senalDeParte), fuera: lista(senalDeParte), medidas: lista(senalDeParte), sinSenal: lista(senalDeParte),
})

const tramo = obj<Tramo>()({ evento: eventoPozo, pozo, inicio: fecha, fin: fecha })
const pregunta = obj<Pregunta>()({ inicio: fecha, fin: nulo(fecha) })
const sinFiscal = obj<Libro['sinFiscal'][number]>()({ dias: lista(fecha) })
const custodia = obj<Libro['custodia']>()({ sinPrueba: lista(pozo), estimados: lista(pozo) })

const libro = obj<Libro>()({
  desde: fecha, hasta: fecha, tramos: lista(tramo), preguntas: lista(pregunta), custodia, sinFiscal: lista(sinFiscal),
})
const resumenLibro = obj<ResumenLibro>()({ desde: fecha, hasta: fecha, sinFiscal: lista(sinFiscal) })
const mesResumen = obj<MesResumen>()({ desde: fecha, hasta: fecha, libro: resumenLibro })
const lineaBase = obj<LineaBase>()({ desde: fecha, hasta: fecha })
const dia = obj<Dia>()({ dia: fecha })

const falla = obj<FallaEquipo>()({ inicio: fecha, fin: nulo(fecha) })
const historialParte = obj<HistorialParte>()({ ultima: opc(fecha) })
const historial = obj<HistorialEquipo>()({ eventos: lista(falla), porParte: lista(historialParte) })

const colchon = obj<Colchon>()({ horas: horasSinFin, rango: par(horasSinFin) })
const pasoCierre = obj<PasoCierre>()({ pozo })
const ordenCierre = obj<OrdenDeCierre>()({ pasos: lista(pasoCierre), sinPrueba: lista(pozo) })
const prediccion = obj<Prediccion>()({
  perfil,
  perdiendo: opc(obj<NonNullable<Prediccion['perdiendo']>>()({ pozos: lista(pozo) })),
  colchon: opc(colchon),
  // Con la bomba ya parada: el tanque con el agua que entra (horas `null` = no sube).
  llenado: opc(obj<NonNullable<Prediccion['llenado']>>()({ colchon })),
  orden: opc(ordenCierre),
})
const paradaMedida = obj<ParadaMedida>()({
  inicio: fecha, fin: fecha, tramos: lista(tramo),
  colchon: opc(obj<NonNullable<ParadaMedida['colchon']>>()({ previsto: colchon })),
})
const paradaEnPeriodo = obj<ParadaEnPeriodo>()({
  inicio: fecha, fin: fecha, tramos: lista(tramo),
  colchon: opc(obj<NonNullable<ParadaMedida['colchon']>>()({ previsto: colchon })),
})
const veredicto = obj<Veredicto>()({ prediccion, historial, primera: opc(como<NonNullable<Veredicto['primera']>>()(senal)), cruzadas: lista(senal) })
const riesgo = obj<Riesgo>()({ desde: opc(fecha), cierreDesde: opc(fecha) })
const estado = obj<EstadoCampo>()({ ayer: obj<EstadoCampo['ayer']>()({ fecha }) })

const filaPozo = obj<FilaPozo>()({ pozo, evento: opc(eventoPozo), salud: opc(saludParte) })
const detallePozo = obj<DetallePozo>()({
  fila: filaPozo, tramos: lista(tramo),
  historicos: lista(obj<DetallePozo['historicos'][number]>()({ evento: eventoPozo })),
  historial: opc(historial), senales: lista(senal), partes: lista(saludParte),
})
const filaEsp = obj<FilaEsp>()({ fila: filaPozo, historial, partes: lista(saludParte) })
const eventoCargado = obj<EventoCargado>()({ inicio: fecha, fin: nulo(fecha) })

/* ───────────────────────────── consultas (GET) ───────────────────────────── */

export interface ConsultaPeriodo { campos: string[]; desde: Date; hasta: Date }
interface PorCampos { campos: string[] }
interface PorEquipo { campo: string; equipo: string }

/** El libro de diferidos del período: cada evento con su causa y lo que costó,
 *  los Pareto, la custodia, las preguntas abiertas y si se puede publicar. */
export const DIFERIDOS = get<ConsultaPeriodo>()('/vistas/diferidos', libro)
/** Las cifras de cada mes del calendario (sin los tramos de cada mes). */
export const DIFERIDOS_MENSUAL = get<PorCampos>()('/vistas/diferidos/mensual', lista(mesResumen))
/** La base: los tres meses publicados antes del período. `null` sin tres meses de historia. */
export const DIFERIDOS_BASE = get<ConsultaPeriodo>()('/vistas/diferidos/base', oNada(lineaBase))
export const PRODUCCION_DIARIA = get<ConsultaPeriodo>()('/vistas/produccion/diaria', lista(dia))
/** { campo: bbl/d } de potencial de los últimos 30 días. */
export const POTENCIAL_RECIENTE = get<PorCampos>()('/vistas/potencial-reciente', tal<Record<string, number>>())
/** Las paradas que nadie ha identificado, de toda la historia. */
export const PREGUNTAS = get<PorCampos>()('/vistas/paradas/por-identificar', lista(pregunta))
export const OPCIONES_RESPUESTA = get<{ evento: string }>()('/vistas/paradas/:evento/opciones', obj<OpcionesRespuesta>()({ sospechosa: opc(saludParte) }))
export const PREDICCION = get<PorEquipo>()('/vistas/bombas/prediccion', prediccion)
/** Toda la historia de paradas medidas de una bomba, de la más reciente a la más vieja. */
export const PARADAS_BOMBA = get<PorEquipo>()('/vistas/bombas/paradas', lista(paradaMedida))
/** Las paradas de las bombas de los campos que tocan el período, recortadas a él. */
export const PARADAS_EN_PERIODO = get<ConsultaPeriodo>()('/vistas/bombas/paradas-en-periodo', lista(paradaEnPeriodo))
export const RIESGO = get<PorCampos>()('/vistas/riesgo', lista(riesgo))
/** El estado de cada campo ahora, por lote (uno por campo pedido, en ese orden). */
export const ESTADO = get<PorCampos>()('/vistas/estado', lista(estado))
/** Las filas de pozos de los campos en el período. */
export const POZOS = get<ConsultaPeriodo>()('/vistas/pozos', lista(filaPozo))
export const POZO = get<{ campo: string; pozo: string; desde: Date; hasta: Date }>()('/vistas/pozos/:campo/:pozo', oNada(detallePozo))
export const ELECTROSUMERGIBLES = get<ConsultaPeriodo>()('/vistas/electrosumergibles', lista(filaEsp))
export const ASIGNACION = get<{ campo: string; mes: string }>()('/vistas/asignacion', tal<AsignacionPozo[]>())
export const PREDICCIONES = get<PorCampos>()('/vistas/predicciones', obj<Predicciones>()({
  fallas: lista(obj<FallaVista>()({ falla })),
}))
export const RELOJES = get<ConsultaPeriodo>()('/vistas/relojes', oNada(tal<NonNullable<Relojes>>()))
/** Caudales y niveles del campo ahora. */
export const CAMPO_AHORA = get<{ campo: string }>()('/vistas/campos/:campo/ahora', tal<CampoAhora>())
export const EQUIPO_HOY = get<PorEquipo>()('/vistas/equipos/:campo/:equipo', oNada(equipoVivo))
/** Todos los equipos de hoy (catálogo y pozos) de los campos, por campo. */
export const EQUIPOS_HOY = get<PorCampos>()('/vistas/equipos-hoy', dic(lista(equipoVivo)))
export const HISTORIA_EQUIPO = get<PorEquipo>()('/vistas/equipos/:campo/:equipo/historia',
  obj<HistoriaEquipo>()({ eventos: lista(eventoCargado), bomba: opc(historial) }))
export const FICHA_EQUIPO = get<PorEquipo & { desde: Date; hasta: Date }>()('/vistas/equipos/:campo/:equipo/ficha', oNada(obj<FichaEquipo>()({
  desdeHistoria: fecha, desdeCierre: opc(fecha), hist: opc(historial), prediccion: opc(prediccion),
})))
export const FILAS_EQUIPOS = get<PorCampos>()('/vistas/equipos', lista(tal<FilaEquipo>()))
export const CONFIABILIDAD = get<PorCampos>()('/vistas/confiabilidad', lista(obj<EquipoConfiable>()({ h: historial })))
export const BOMBAS = get<ConsultaPeriodo>()('/vistas/bombas', lista(obj<BombaVista>()({
  perfil: opc(perfil), veredicto: opc(veredicto), abierta: opc(paradaMedida), senales: lista(senal), partes: lista(saludParte),
})))

/** Ciclo ANTES / DURANTE / DESPUÉS: planes de acción con barriles simulados.
 *  `estado` lo pone el servidor con lo guardado en `POST /api/planes/:id`. */
const planAccion = obj<PlanAccion>()({})
const tramoCiclo = obj<TramoCiclo>()({ planes: lista(planAccion) })
const ciclo = obj<CicloValor>()({
  desde: fecha, hasta: fecha,
  antes: tramoCiclo,
  durante: obj<CicloValor['durante']>()({ planes: lista(planAccion) }),
  despues: tramoCiclo,
})
export const CICLO = get<ConsultaPeriodo>()('/vistas/ciclo', ciclo)

/* ─────────── el modelo choke: dónde se trabó, qué limita y si falla hoy ─────────── */

interface PorCampo { campo: string }
interface CampoPeriodo { campo: string; desde: Date; hasta: Date }

/** Horas que pueden no llegar, en un campo opcional: ausente sigue ausente y
 *  `null` es «no se llena» (Infinity en el motor), nunca «sin dato». */
const horasOpcionales: Codec<number | undefined, number | null | undefined> = {
  aDTO: h => (h === undefined ? undefined : h === Infinity ? null : h),
  revivir: j => {
    if (j === undefined) return undefined
    if (j === null) return Infinity
    if (typeof j !== 'number') throw new ErrorDeContrato(`se esperaba un número o null y llegó ${JSON.stringify(j)}`)
    return j
  },
}

const tramoTuberia = obj<TramoTuberia>()({ pruebaMasVieja: opc(obj<NonNullable<TramoTuberia['pruebaMasVieja']>>()({ fecha })) })
const medidor = obj<MedidorDelCampo>()({ desde: opc(fecha), ultimoDia: opc(obj<NonNullable<MedidorDelCampo['ultimoDia']>>()({ dia: fecha })) })
const tuberia = obj<TuberiaCampo>()({
  desde: fecha, hasta: fecha, tramos: lista(tramoTuberia), perdiendoAhora: lista(obj<PerdiendoAhora>()({ desde: fecha })), medidor: opc(medidor),
})
const serieChoke = obj<SerieChoke>()({ dias: lista(obj<DiaChoke>()({ dia: fecha })), cambios: lista(obj<CambioDominante>()({ dia: fecha })) })
const colchonAgua = obj<ColchonAgua>()({ horas: horasSinFin, rango: par(horasSinFin) })
type TanqueDelTren = NonNullable<TramoTuberiaAgua['tanques']>[number]
const tuberiaAgua = obj<TuberiaAgua>()({
  tramos: lista(obj<TramoTuberiaAgua>()({ tanques: opc(lista(obj<TanqueDelTren>()({ colchon: opc(colchonAgua) }))) })),
  sinUna: opc(obj<NonNullable<TuberiaAgua['sinUna']>>()({ desde: opc(fecha), colchonH: horasOpcionales })),
})
const filaCriticidad = obj<FilaCriticidad>()({ colchonH: horasOpcionales, subio: opc(obj<NonNullable<FilaCriticidad['subio']>>()({ desde: fecha })) })
const avisoTrabajo = obj<AvisoTrabajoCritico>()({ desde: fecha, hasta: fecha })
const vistaCriticidad = obj<VistaCriticidad>()({
  ranking: lista(filaCriticidad),
  campos: lista(obj<VistaCriticidad['campos'][number]>()({ parados: lista(filaCriticidad), avisosTrabajo: lista(avisoTrabajo) })),
})
const vistaCapacidadesCodec = obj<VistaCapacidades>()({
  entrada: obj<EntradaRevision>()({ maximoCrudo: opc(obj<NonNullable<EntradaRevision['maximoCrudo']>>()({ dia: fecha })) }),
})
const brechaChoke = obj<BrechaChoke>()({
  desde: fecha, hasta: fecha, superado: lista(obj<BrechaChoke['superado'][number]>()({ dia: fecha })),
  porCampo: lista(obj<BrechaCampoChoke>()({ superado: lista(obj<BrechaCampoChoke['superado'][number]>()({ dia: fecha })) })),
})
const mesPorTramo = obj<MesPorTramo>()({ desde: fecha, hasta: fecha })
const lineaBaseTramo = obj<LineaBasePorTramo>()({
  base: obj<LineaBasePorTramo['base']>()({ desde: fecha, hasta: fecha }), periodo: obj<LineaBasePorTramo['periodo']>()({ desde: fecha, hasta: fecha }),
})

/** La tubería del campo en una sola lectura (U2 §11.1): lo que limita hoy, cada
 *  tramo con su potencial y su fuente, lo que pasa ahora, lo que se pierde ahora
 *  por tramo y lo perdido en el período por tramo, con el MISMO total del libro.
 *  Reemplaza a `/vistas/campos/:campo/choke` de P1 §5.2, que traía solo lo que limita. */
export const TUBERIA = get<CampoPeriodo>()('/vistas/campos/:campo/tuberia', tuberia)
/** Qué limitó cada día del período, la brecha de cada día por tramo y por
 *  escalón, y el aviso «Cambió lo que limita» con su umbral y su persistencia (U2 §7.1-7.2). */
export const SERIE_CHOKE = get<CampoPeriodo>()('/vistas/campos/:campo/choke/serie', serieChoke)
/** La tubería del agua del campo ahora: agua de los pozos → tratamiento →
 *  tanques → bombas de reinyección → inyectores, con el colchón (U2 §5). */
export const TUBERIA_AGUA = get<PorCampo>()('/vistas/campos/:campo/agua', tuberiaAgua)
/** Lo que deja pasar cada tramo del campo hoy (firmado o del demo, con su
 *  fuente en palabras), quién y cuándo lo firmó y lo que la revisión de la firma
 *  necesita del pasado: lo máximo que pasó en un día en los últimos 30 (U2 §8.4).
 *  Se escriben con la configuración (`Config.capacidades`, `POST /api/configuracion`). */
export const CAPACIDADES = get<PorCampo>()('/vistas/campos/:campo/capacidades', vistaCapacidadesCodec)
/** «Si falla hoy»: todos los equipos de los campos de mayor a menor, y por campo
 *  lo que ya está parado, lo que no se puede medir, lo que cambió hoy, lo que
 *  decide cada rol con la lista y la frase del desembotellamiento (U2 §6). */
export const CRITICIDAD = get<PorCampos>()('/vistas/criticidad', vistaCriticidad)
/** La brecha del libro del período repartida por tramo y por escalón, con la
 *  eficiencia de producción (PE y PE no planeada), por campo y en conjunto.
 *  Suma exacto: potencial − real = Σ por tramo + sin explicar. */
export const REPARTO_CHOKE = get<ConsultaPeriodo>()('/vistas/choke/reparto', brechaChoke)
/** Lo perdido por tramo cada mes del calendario, con el mismo total de cada mes del libro (U2 §7.4). */
export const REPARTO_CHOKE_MENSUAL = get<PorCampos>()('/vistas/choke/mensual', lista(mesPorTramo))
/** «Antes → con TRIM» por tramo: la línea base del libro (tres meses publicados
 *  antes del período) repartida por tramo (U2 §7.3). `null` sin tres meses de historia. */
export const BASE_CHOKE = get<ConsultaPeriodo>()('/vistas/choke/base', oNada(lineaBaseTramo))
/** La topología que rige en el campo (la firmada, o la que se deriva del
 *  registro), con el tramo de cada elemento y sus casos de borde (U2 §8). */
export const TOPOLOGIA = get<PorCampo>()('/vistas/topologia', tal<TopologiaVigente>())
/** Lo que TRIM propone de la topología con lo que ya sabe, para confirmarla y no escribirla (U2 §8.3). */
export const PROPUESTAS_TOPOLOGIA = get<PorCampo>()('/vistas/topologia/propuestas', tal<PropuestaVista[]>())

/* ─────────── el árbol de paradas de la ANH (Circular 024) ─────────── */

/** Lo que `problemasDeClasificacion` dice de un paso que falta: en un borrador
 *  no es una incoherencia, es lo que todavía no se sabe. */
const FALTA = new Set(PASOS.map(p => `Falta «${PASO_CAMPO[p]}» (${PASO_CIRCULAR[p]}).`))
/** Lo incoherente de una clasificación o de un borrador, sin contar lo que le
 *  falta: planeada con una causa no planeada (o al revés), un detalle que no es
 *  de su causa, un valor que no es del catálogo, el yacimiento sin evidencia o
 *  un dato de persona sin quién ni cuándo. Vacío = coherente. */
export const incoherencias = (b: BorradorClasificacion): string[] => problemasDeClasificacion(b).filter(m => !FALTA.has(m))

/** Un borrador de clasificación: al entrar se revisa que lo que trae sea coherente. */
const borradorAnh: Codec<BorradorClasificacion, BorradorClasificacion> = {
  aDTO: b => b,
  revivir: j => {
    if (!j || typeof j !== 'object' || Array.isArray(j)) throw new ErrorDeContrato(`se esperaba una clasificación y llegó ${JSON.stringify(j)?.slice(0, 60)}`)
    const malas = incoherencias(j)
    if (malas.length) throw new ErrorDeContrato(`la clasificación no es coherente: ${malas.join(' ')}`)
    return j
  },
}
/** La clasificación ANH de una parada (P1 §1.4 y §5.4). Al entrar se revisa
 *  con las mismas reglas del tipo: lo incoherente se rechaza diciendo qué (la
 *  ANH rechaza la transmisión entera por una planeada con causa no planeada,
 *  C24 p.7); con los 6 pasos se arma con `clasificar`, el único constructor de
 *  una `ClasificacionAnh`, y si falta alguno queda como borrador. */
const clasificacionAnh: Codec<ClasificacionAnh | BorradorClasificacion, ClasificacionAnh | BorradorClasificacion> = {
  aDTO: c => c,
  revivir: (j, l) => {
    const b = borradorAnh.revivir(j, l)
    return PASOS.every(p => b[p]) ? clasificar(b) : b
  },
}
/** La de `PropuestaAnh.clasificacion`: solo existe completa. */
const clasificacionCompleta: Codec<ClasificacionAnh, ClasificacionAnh> = {
  aDTO: c => c,
  revivir: (j, l) => {
    const c = clasificacionAnh.revivir(j, l)
    const faltan = PASOS.filter(p => !c[p])
    if (faltan.length) throw new ErrorDeContrato(`una clasificación completa no puede faltarle ${faltan.map(p => `«${PASO_CAMPO[p]}»`).join(', ')}`)
    return c as ClasificacionAnh
  },
}
const propuestaAnh = obj<PropuestaAnh>()({ borrador: borradorAnh, clasificacion: opc(clasificacionCompleta) })
const paradaCompleta = obj<ParadaAnh>()({ clasificacion: clasificacionAnh, propuesta: propuestaAnh })

/** Dos valores JSON iguales, sin mirar el orden de las claves (una clave en undefined es una que no está). */
function mismoJson(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false
  if (Array.isArray(a)) return a.length === (b as unknown[]).length && a.every((x, i) => mismoJson(x, (b as unknown[])[i]))
  const x = a as Record<string, unknown>, y = b as Record<string, unknown>
  const kx = Object.keys(x).filter(k => x[k] !== undefined), ky = Object.keys(y).filter(k => y[k] !== undefined)
  return kx.length === ky.length && kx.every(k => Object.hasOwn(y, k) && mismoJson(x[k], y[k]))
}

/** Una fila de `paradas_pozo` (P1 §1.5): un pozo × un día operacional × una
 *  causa, con la causa de TRIM, su clasificación (propuesta o lo que ya dijeron
 *  las personas encima) y lo que falta preguntar (`propuesta`: opciones,
 *  preguntas, sugerencias). Las horas van en hora de Colombia con su zona
 *  («2026-10-02T03:52:18-05:00»).
 *  `propuesta.borrador` y `propuesta.clasificacion` son casi siempre la misma
 *  `clasificacion` de la fila: entonces NO viajan (eran el 42 % del peso) y al
 *  entrar se reponen desde ella; si alguna difiere, viaja entera. Así no se pierde nada. */
const paradaAnh: Codec<ParadaAnh, unknown> = {
  aDTO: (p, r) => {
    const j = paradaCompleta.aDTO(p, r) as unknown as { propuesta: Record<string, unknown> }
    const propuesta = { ...j.propuesta }
    if (mismoJson(p.propuesta.borrador, p.clasificacion)) delete propuesta.borrador
    if (p.propuesta.clasificacion && mismoJson(p.propuesta.clasificacion, p.clasificacion)) delete propuesta.clasificacion
    return { ...j, propuesta }
  },
  revivir: (j, l) => {
    const f = j as { clasificacion?: unknown; propuesta?: Record<string, unknown> } | null
    if (!f || typeof f !== 'object' || !f.propuesta || typeof f.propuesta !== 'object') return paradaCompleta.revivir(j as never, l)
    const completa = !!f.clasificacion && typeof f.clasificacion === 'object' && PASOS.every(x => (f.clasificacion as Record<string, unknown>)[x])
    const propuesta = { ...f.propuesta,
      ...(Object.hasOwn(f.propuesta, 'borrador') ? {} : { borrador: f.clasificacion }),
      ...(Object.hasOwn(f.propuesta, 'clasificacion') || !completa ? {} : { clasificacion: f.clasificacion }) }
    return paradaCompleta.revivir({ ...f, propuesta } as never, l)
  },
}

/** Las paradas ANH de los días operacionales que toca el período (llevado a
 *  días enteros), con su clasificación propuesta o guardada: para Identificar y
 *  el cierre del día. */
export const PARADAS_ANH = get<ConsultaPeriodo>()('/vistas/anh/paradas', lista(paradaAnh))
/** La calidad de la clasificación del período: % confirmado y % corregido por
 *  paso, las reglas que más se corrigen, el paso 2 por equipo y los equipos sin
 *  topología (P1 §2.1; U2 §4.6). */
export const CALIDAD_ANH = get<ConsultaPeriodo>()('/vistas/anh/calidad', tal<CalidadClasificacion>())

/** Lo que TRIM mandó por WhatsApp: un registro del servidor, del más reciente al más viejo. */
export const MENSAJES = get<PorCampos>()('/mensajes', tal<Mensaje[]>())
export const SAP_AVISOS = get<PorCampos>()('/sap/avisos', tal<AvisoSap[]>())
export const SAP_ORDENES = get<PorCampos>()('/sap/ordenes', tal<OrdenSap[]>())
export const SAP_EQUIPOS = get<{ campo: string }>()('/sap/equipos', tal<EquipoSap[]>())
export const SAP_EQUIPO = get<PorEquipo>()('/sap/equipos/:equipo', tal<{ identidad: IdentidadSap; repuestos: Repuesto[] }>())

/* ───────────────────── lo que se trae al arrancar ───────────────────── */

const CHOKES: ReadonlyArray<Campo['choke']> = ['Pozos', 'Planta', 'Evacuación', 'Mercado']
/** El registro de campos. Se revisa al entrar, campo por campo: un id vacío o
 *  repetido haría que dos campos se confundieran en permisos, metas y
 *  evidencia, y un nombre vacío dejaría el hueco sin rótulo. `desconocido` es
 *  del front (un id que el registro NO trae): si el servidor lo manda, se quita. */
const registroCampos: Codec<Campo[], Campo[]> = {
  aDTO: cs => cs,
  revivir: j => {
    if (!Array.isArray(j)) throw new ErrorDeContrato(`se esperaba la lista de campos y llegó ${JSON.stringify(j)?.slice(0, 60)}`)
    const vistos = new Set<string>()
    return j.map((c: Partial<Campo> | null, i): Campo => {
      const ruta = `[${i}]`
      if (!c || typeof c !== 'object') throw new ErrorDeContrato('se esperaba un campo', ruta)
      if (typeof c.id !== 'string' || !c.id.trim()) throw new ErrorDeContrato('el campo no trae «id»', ruta)
      if (vistos.has(c.id)) throw new ErrorDeContrato(`el id «${c.id}» viene dos veces`, ruta)
      vistos.add(c.id)
      if (typeof c.nombre !== 'string' || !c.nombre.trim()) throw new ErrorDeContrato(`«${c.id}» no trae «nombre»`, ruta)
      if (typeof c.cuenca !== 'string') throw new ErrorDeContrato(`«${c.id}» no trae «cuenca»`, ruta)
      if (!CHOKES.includes(c.choke as Campo['choke'])) throw new ErrorDeContrato(`«${c.id}»: «choke» es ${CHOKES.join(', ')} y llegó ${JSON.stringify(c.choke)}`, ruta)
      return { id: c.id, nombre: c.nombre, cuenca: c.cuenca, choke: c.choke as Campo['choke'], nota: typeof c.nota === 'string' ? c.nota : '' }
    })
  },
}
/** `GET /api/campos`: el registro de campos de la empresa (id, nombre, cuenca,
 *  qué lo limita). Todos los campos, también los que la persona no tiene: la
 *  configuración y los accesos son de la empresa y nombran a todos. */
export const LISTA_CAMPOS = get<object>()('/campos', registroCampos)

export const CATALOGO = get<object>()('/catalogo', obj<DatosDeCatalogo>()({
  campos: dic(obj<CatalogoDeCampo>()({
    planta: opc(tal<PlantaCampo>()), registroEquipos: lista(obj<EquipoEnCampo>()({ dispositivos: lista(dispositivo) })),
    // La banda normal puede estar abierta por un lado: en el JSON ese lado va en null.
    limites: dic(obj<LimiteTag>()({ normal: opc(bandaAbierta), alarma: opc(alarma) })),
  })),
}))
/** La configuración firmada. Un precio sin configurar puede venir en `null`
 *  (es lo que saca PostgreSQL): al entrar se vuelve ausente (`normalizarConfig`),
 *  en la lectura del arranque y en la respuesta de una firma, que son las dos
 *  puertas por donde entra. Si no, «sin precio» se valoraría como 0 USD/bbl y
 *  la pantalla compararía un null con un número. */
const configFirmada: Codec<Config, Config> = {
  aDTO: c => c,
  revivir: j => {
    const campos = (j as { campos?: unknown } | null)?.campos
    if (!campos || typeof campos !== 'object' || Array.isArray(campos)) throw new ErrorDeContrato(`se esperaba una configuración con «campos» y llegó ${JSON.stringify(j)?.slice(0, 60)}`)
    for (const [id, c] of Object.entries(campos)) if (!Array.isArray((c as { metas?: unknown } | null)?.metas)) throw new ErrorDeContrato(`«metas» no es una lista`, `campos.${id}`)
    return normalizarConfig(j)
  },
}
const version = obj<Version>()({ config: configFirmada })
export const CONFIGURACION_HISTORIAL = get<object>()('/configuracion/historial', lista(version))
export const RESPUESTAS = get<object>()('/paradas/respuestas', tal<Record<string, RespuestaParada>>())
export const USUARIOS = get<object>()('/usuarios', tal<PersonaDelRegistro[]>())
export const ACCESOS = get<object>()('/usuarios/historial', tal<CambioAcceso[]>())
export const INFORMES = get<object>()('/informes', tal<Informe[]>())
/** La asignación oficial de los campos de la persona y el rastro de cada carga (quién, cuándo, por qué, qué reemplazó). */
export const ASIGNACION_OFICIAL = get<object>()('/asignacion-oficial', tal<{ filas: FilaCargada[]; cargas: CargaAsignacion[] }>())
export const ANALISIS = get<object>()('/analisis', tal<{ vigentes: Record<string, Analisis>; anteriores: Record<string, Analisis[]> }>())
export const CAMBIOS_PLANTA = get<object>()('/planta/cambios', tal<CambioPlanta[]>())

/* ───────────────────── escrituras: cuerpos y respuestas ───────────────────── */

export interface CuerpoFirma { config: Config; motivo: string; base: number }
export interface CuerpoUsuario { usuario: Usuario; motivo: string }
export interface CuerpoInvitacion { invitacion: Invitacion; motivo: string }
export type CuerpoAviso = Pick<AvisoSap, 'tipo' | 'campoId' | 'equipo' | 'descripcion' | 'prioridad' | 'parte' | 'modo' | 'inicioAveria' | 'parada' | 'evidencia' | 'evento'>
export interface CuerpoRespuesta { evento: string; campoId: string; equipo: string; texto: string; parte?: ParteId; modo?: string }
export interface CuerpoWhatsapp { evento: string; campoId: string; equipo: string; usuarioId: string; opcion: Opcion; texto?: string; modo?: string }
export interface CuerpoAnalisis { evento: string; mecanismo: string; causaRaiz: string; nota?: string }
/** Las filas que se cargan y por qué: reemplazar la oficial de un mes sin motivo no deja saber después qué pasó. */
export interface CuerpoAsignacion { filas: FilaOficial[]; motivo: string }
/** Aceptar o marcar ejecutado un plan del ciclo. El id va en la ruta. */
export interface CuerpoPlan { estado: 'aceptado' | 'ejecutado'; motivo: string }

/** `POST /configuracion` → la versión firmada (con la misma normalización que el historial). */
export const R_FIRMA = obj<{ version: Version }>()({ version })
/** `PATCH /usuarios/:id` y `POST /usuarios` → la persona como quedó y el cambio en el historial. */
export const R_USUARIO = tal<{ usuario: Usuario; acceso: CambioAcceso }>()
/** `POST /sap/avisos` → el aviso creado. */
export const R_AVISO = tal<{ aviso: AvisoSap }>()
/** `POST /informes` → el informe registrado, con folio, cifras y huella. */
export const R_INFORME = tal<{ informe: Informe }>()
/** `POST /asignacion-oficial` → toda la asignación oficial como quedó y la carga registrada. */
export const R_ASIGNACION = tal<{ filas: FilaCargada[]; carga: CargaAsignacion }>()
/** `POST /paradas/:evento/respuesta` → la respuesta como quedó. */
export const R_RESPUESTA = tal<{ respuesta: RespuestaParada }>()
/** `POST /analisis/:evento` → el análisis registrado. */
export const R_ANALISIS = tal<{ analisis: Analisis }>()
/** `POST /planta/cambios` → la planta del campo como quedó y el cambio en el historial. */
export const R_PLANTA = tal<{ planta: PlantaCampo; cambio: CambioPlanta }>()
/** `POST /planes/:id` → la decisión como quedó. */
export const R_PLAN = tal<{ decision: DecisionPlan }>()

/** `POST /anh/paradas/:id/clasificacion`: lo que una persona dice de los pasos de
 *  una parada, en códigos internos (`pozo`, `no-planeada`, `NP_PROC`,
 *  `NP_PROC/parada-estacion-bombeo-afecta-pozos`…). La procedencia, `por`,
 *  `porId`, `rol` y `hora` los pone el servidor. Cada rol dice solo los pasos que
 *  son suyos (`PASOS_QUE_DECLARA`); «En el yacimiento» va por `…/yacimiento`. */
export interface CuerpoClasificacion {
  pasos: Partial<Record<PasoAnh, string>>
  /** Obligatorio (5 caracteres o más) si cambia algo que ya había dicho una persona. */
  motivo?: string
  /** Para todos los tramos del evento (Unicidad: un evento, una clasificación; P1 §5.3). */
  aplicarAlEvento?: boolean
  /** Para todos los eventos de su cascada: los que tienen la misma raíz (U2 §4.3, «Sí, a los {n}»). */
  aplicarALaCascada?: boolean
  /** La cadena de 6 pasos que vio quien la cambia (`cadenaVista`): si entretanto cambió, 409. */
  cadena?: string
}
/** `POST /anh/paradas/confirmar`: confirmar una parada (`anh:clasificar`) o varias
 *  de la misma cadena en lote (`anh:confirmar`). `pasos`: los que la pantalla
 *  mostró para confirmar; uno que el rol no avala se rechaza (403), y los que no
 *  vengan no se confirman. Sin `pasos`, todos los que el rol avala (`PASOS_QUE_CONFIRMA`). */
export interface CuerpoConfirmacion { ids: string[]; cadena?: string; pasos?: PasoAnh[] }
/** `POST /anh/paradas/:id/yacimiento`: «En el yacimiento», con lo que lo muestra
 *  (`prueba`, `corte-agua`, `presion` o una nota escrita). */
export interface CuerpoYacimiento { evidencia: string; motivo?: string; aplicarAlEvento?: boolean; cadena?: string }
/** `POST /anh/paradas/:id/respuesta`: lo que contestó una persona a una pregunta
 *  de campo abierta en la parada («¿Qué lo paró?», «¿De dónde vino el corte?»…),
 *  con el texto exacto del botón (`OpcionCampo.texto`). El servidor corre
 *  `responder`: lo que TRIM deduce de la respuesta queda dicho por esa persona
 *  (`declarado`, con ella en el porqué) y la pregunta que sigue llega en la vista. */
export interface CuerpoRespuestaAnh {
  pregunta: string
  opcion: string
  aplicarAlEvento?: boolean
  aplicarALaCascada?: boolean
  cadena?: string
}
/** `POST /anh/paradas/:id/revision`: «Algo está mal» (sin `pedirA`: a quien
 *  revisa) o «Pedir a producción» (`pedirA: 'prod'`). No corrige nada: pasa la
 *  parada a quien corrige, con el motivo. Queda atendida cuando ese rol dice,
 *  corrige o confirma algo de ella. */
export interface CuerpoRevisionAnh { motivo: string; pedirA?: string; aplicarAlEvento?: boolean; aplicarALaCascada?: boolean; cadena?: string }
/** `POST /configuracion/vista-previa`: la configuración que se va a firmar, sin firmarla. */
export interface CuerpoVistaPrevia { config: Config }
/** `POST /topologia/importar`: un CSV o un pegado de Excel, «equipo; pozos a los que sirve». */
export interface CuerpoTopologiaCsv { campo: string; texto: string }

/** `POST /anh/paradas/:id/clasificacion`, `…/yacimiento`, `…/respuesta` y
 *  `…/revision` → la fila como quedó y lo que el servidor guardó (por fila o por
 *  evento), para copiarlo a la sesión. */
export const R_CLASIFICACION = obj<{ parada: ParadaAnh; guardadas: Record<string, BorradorClasificacion> }>()({ parada: paradaAnh, guardadas: dic(borradorAnh) })
/** `POST /anh/paradas/confirmar` → las filas como quedaron y, si fue en lote, el lote. */
export const R_CONFIRMACION = obj<{ lote?: ConfirmacionLote; paradas: ParadaAnh[] }>()({ paradas: lista(paradaAnh) })
/** `POST /configuracion/vista-previa` → lo que cambiaría en cada campo tocado. */
export const R_VISTA_PREVIA = obj<{ impacto: ImpactoConfig }>()({ impacto: obj<ImpactoConfig>()({ desde: fecha, hasta: fecha }) })
/** `POST /topologia/importar` → la topología leída y lo que se encontró por fila. */
export const R_TOPOLOGIA_CSV = tal<TopologiaLeida>()

/* ───────────────────── las formas JSON, para leerlas ───────────────────── */

export type LibroDTO = DTO<typeof DIFERIDOS.codec>
export type RespuestaDe<E> = E extends Endpoint<infer _P, infer _T, infer J> ? Respuesta<J> : never
/** El dominio que entrega un endpoint. */
export type DatoDe<E> = E extends Endpoint<infer _P, infer T, infer _J> ? T : never
