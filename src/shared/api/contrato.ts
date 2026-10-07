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
 *    `/sap/…`, `/informes`, `/asignacion-oficial`, `/analisis`, `/planta/cambios`.
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

/* ───────────────────── las formas JSON, para leerlas ───────────────────── */

export type LibroDTO = DTO<typeof DIFERIDOS.codec>
export type RespuestaDe<E> = E extends Endpoint<infer _P, infer _T, infer J> ? Respuesta<J> : never
/** El dominio que entrega un endpoint. */
export type DatoDe<E> = E extends Endpoint<infer _P, infer T, infer _J> ? T : never
