import { useMemo } from 'react'
import { useCtx } from './sesion'
import { useDato, useDatoSi, useDatos, traer, versionDe } from './consulta'
import {
  DIFERIDOS, DIFERIDOS_MENSUAL, DIFERIDOS_BASE, PRODUCCION_DIARIA, POTENCIAL_RECIENTE, PREGUNTAS, OPCIONES_RESPUESTA,
  PREDICCION, PARADAS_BOMBA, PARADAS_EN_PERIODO, RIESGO, ESTADO, POZOS, POZO, ELECTROSUMERGIBLES, ASIGNACION,
} from './contrato'
import {
  libro, serieMensual, lineaBase, porDia, historialDeEquipo, tramosEntre, crudoAsignado, aguaDePrueba, asignacionPorPozo, calendario,
  type Libro, type MesLibro, type LineaBase, type HistorialEquipo, type Dia, type Pregunta, type Tramo, type AsignacionPozo,
} from '@/entities/libro'
import { saludDePartes, type SaludParte } from '@/entities/salud'
import { saludDeEsp, senalesEsp } from '@/entities/esp'
import { perfilBomba, paradasDe, esBomba, type PerfilBomba } from '@/entities/bombas'
import {
  prediccion, paradaMedida, riesgoAhora, estadoCampo,
  type Prediccion, type ParadaMedida, type Riesgo, type EstadoCampo,
} from '@/entities/diferido'
import { causaDeEvento, type Causa, type Contexto } from '@/entities/causa-senal'
import { pozosDe, pozoDe, pruebaEn, estadoAhora, eventosDePozo, type Pozo, type Prueba, type EventoPozo } from '@/entities/pozos'
import { causasSugeridas, type Opcion } from '@/entities/mensajes'
import { catalogoDe, type Catalogo } from '@/entities/catalogo'
import { EQUIPOS } from '@/entities/equipos'
import type { Senal } from '@/entities/vigia'
import { AHORA, horasEntre } from '@/entities/reloj'
import { perfilDe } from '@/entities/configuracion'

/** LA COSTURA: la única entrada de datos del front (src/shared/api).
 *
 *  Cada endpoint está en contrato.ts: su ruta, sus parámetros y la forma de
 *  su JSON (fechas ISO con zona, entidades por id). Aquí, por endpoint:
 *  - un `use*` que lo lee para una pantalla con la caché de consulta.ts. Con
 *    la fuente http es un GET que suspende la pantalla mientras llega; en el
 *    demo responde el motor en el acto. La pantalla recibe el MISMO tipo del
 *    dominio en los dos casos (`revivir` lo reconstruye del JSON);
 *  - un `pedir*` con la respuesta del demo: la misma fórmula que el backend
 *    tiene que usar (el «motor», src/entities). Con él se arma la referencia
 *    del contrato (scripts/verificar-contrato.mjs, scripts/referencia.mjs).
 *  Las pantallas (src/pages, src/widgets) y el estado de la aplicación
 *  (src/app) NUNCA llaman al motor para pedir datos ni llaman `pedir*` (eso
 *  saltaría al servidor): leen los `use*`, y fuera del dibujo `traer`. La
 *  regla `no-restricted-imports` de .oxlintrc.json cuida lo primero.
 *
 *  QUÉ ES DEL SERVIDOR Y QUÉ DEL FRONT
 *  - Del SERVIDOR (se pide aquí): todo lo que lee los insumos de los equipos
 *    (pozos, eventos, producción fiscal, paradas, programa) o sale de ellos:
 *    el libro, el riesgo, el estado del campo, la salud y la predicción, la
 *    historia de fallas, los equipos de hoy, los caudales y niveles, la banda
 *    de asignación, el calendario de meses, la historia de SAP, las
 *    predicciones y los mensajes. También los datos de CATÁLOGO del campo:
 *    las máquinas de bombeo y su perfil en cada campo, el catálogo de equipos
 *    y de daños, la metrología, el punto de medición oficial y el esquema de
 *    planta: vienen juntos en `GET /api/catalogo` al arrancar (catalogo.ts).
 *    En el demo los arma el motor desde src/entities.
 *  - De AMBOS (la misma regla en los dos lados): las reglas sobre lo que
 *    entra a mano. Validar una configuración o un acceso, la meta o el perfil
 *    vigente de un campo en la configuración firmada (perfilDe, metaEn,
 *    metaEntre, criterioEn), leer un plan o una asignación oficial subidos y
 *    cotejarla, los umbrales de un texto (entities/reglas.ts) y los cambios al
 *    esquema de planta (aplicarCambioPlanta). El front las corre para avisar
 *    antes de enviar; el servidor las vuelve a correr y es el que decide (sus
 *    403/409/422 mandan, y escrituras.ts los muestra con sus palabras).
 *  - Del FRONT (presentación pura, nunca un dato): formatos de número y de
 *    fecha (reloj.ts, shared/lib/formato), nombres para leer (NOMBRE_PARTE,
 *    TIPO_CAUSA, COMO, NOMBRE_CLASE…), plantillas de variables y catálogos
 *    de normas (ISO 14224, API 610/676), el dibujo de la planta (planta.armar)
 *    y la cadena de custodia explicada (cadena.ts), y ordenar o filtrar lo que
 *    ya llegó para mostrarlo.
 *
 *  `ctx` es lo único que entra a mano (configuración firmada y respuestas de
 *  los operarios): el servidor lo tiene. Aquí sale de la sesión (`sesion.ts`,
 *  nunca del estado de la aplicación): el demo calcula con él, y con la fuente
 *  http su versión entra en la clave de la caché, para pedir de nuevo cuando
 *  alguien firma o responde. */

export { useCtx }

export interface ConsultaLibro { campos: string[]; desde: Date; hasta: Date }

/** La versión del contexto con que se calcula: entra en la clave de la caché. */
const v = (ctx: Contexto) => String(versionDe(ctx))

/* ─────────────────────────────── libro ─────────────────────────────── */

/** `GET /api/vistas/diferidos?campos=a,b&desde=ISO&hasta=ISO` */
export const pedirLibro = (q: ConsultaLibro, ctx: Contexto): Libro => libro(q.campos, q.desde, q.hasta, ctx)

/** El libro de un mes en la serie mensual: solo las cifras. Los tramos, el
 *  detalle por pozo, las preguntas y la custodia de cada mes están en
 *  `/api/vistas/diferidos` de ese mes; repetirlos en los trece meses hacía de
 *  la serie la respuesta más pesada del contrato (2 MB con cinco campos). */
export type ResumenLibro = Omit<Libro, 'tramos' | 'porPozo' | 'preguntas' | 'custodia'>
export interface MesResumen extends Omit<MesLibro, 'libro'> { libro: ResumenLibro }
const resumen = ({ tramos: _t, porPozo: _p, preguntas: _q, custodia: _c, ...cifras }: Libro): ResumenLibro => cifras

/** `GET /api/vistas/diferidos/mensual?campos=a,b` */
export const pedirSerie = (campos: string[], ctx: Contexto): MesResumen[] =>
  serieMensual(campos, ctx).map(m => ({ ...m, libro: resumen(m.libro) }))
/** `GET /api/vistas/diferidos/base?campos=a,b&desde=ISO&hasta=ISO` */
export const pedirBase = (q: ConsultaLibro, ctx: Contexto): LineaBase | undefined => lineaBase(q.campos, q.desde, q.hasta, ctx)
/** `GET /api/vistas/produccion/diaria?campos=a,b&desde=ISO&hasta=ISO` */
export const pedirDias = (q: ConsultaLibro, ctx: Contexto): Dia[] => porDia(q.campos, q.desde, q.hasta, ctx)
/** bbl/d de potencial de los últimos 30 días de un campo: lo que los pozos
 *  pueden dar hoy. Es la referencia con que el gerente fija la meta; no es meta. */
export const pedirPotencialReciente = (campo: string, ctx: Contexto): number =>
  libro([campo], new Date(AHORA.getTime() - 30 * 86_400_000), AHORA, ctx).potencial / 30
/** `GET /api/vistas/potencial-reciente?campos=a,b` → { campo: bbl/d }, por lote. */
export const pedirPotencialesRecientes = (campos: string[], ctx: Contexto): Record<string, number> =>
  Object.fromEntries(campos.map(id => [id, pedirPotencialReciente(id, ctx)]))

/** `GET /api/vistas/paradas/por-identificar?campos=a,b` · toda la historia:
 *  una pregunta sin responder no prescribe al cambiar de período. */
export function pedirPreguntas(campos: string[], ctx: Contexto): Pregunta[] {
  return libro(campos, new Date(calendario()[0]!.desde), AHORA, ctx).preguntas
}

export interface OpcionesRespuesta {
  /** Catálogo de daños del equipo (partes y modos); undefined si no tiene. */
  catalogo?: Catalogo
  /** Las causas que sugiere la evidencia, con las lecturas de hoy si la
   *  parada sigue abierta. Solo si el equipo tiene catálogo. */
  sugeridas?: { opciones: Opcion[]; conEvidencia: boolean }
  /** Con la parada abierta, la parte de la bomba que hoy está fuera de límite: la pista. */
  sospechosa?: SaludParte
}

/** `GET /api/vistas/paradas/:evento/opciones` → con qué se ayuda a quien
 *  responde «¿qué se dañó?» en pantalla. */
export function pedirOpcionesRespuesta(p: Pregunta, ctx: Contexto): OpcionesRespuesta {
  const catalogo = catalogoDe(p.campoId, p.equipo)
  const perfil = p.sobre === 'bomba' ? perfilBomba(p.equipo, p.campoId) : undefined
  return {
    catalogo,
    sugeridas: catalogo ? causasSugeridas(p, ctx, true) : undefined,
    sospechosa: perfil && !p.fin ? pedirSalud(p.campoId, p.equipo, ctx)?.partes.find(s => s.estado === 'fuera') : undefined,
  }
}
export function useOpcionesRespuesta(p: Pregunta): OpcionesRespuesta {
  const ctx = useCtx()
  return useDato(OPCIONES_RESPUESTA, { evento: p.id }, v(ctx), () => pedirOpcionesRespuesta(p, ctx))
}

/* ─────────────────────────────── bombas ─────────────────────────────── */

export interface SaludBomba { partes: SaludParte[]; historial: HistorialEquipo }

/** La salud de una bomba por parte y su historia de fallas. No es un
 *  endpoint propio: la pantalla de bombas la recibe dentro de cada bomba
 *  (`/api/vistas/bombas` → `partes`) y quien responde una parada, en sus
 *  opciones (`sospechosa`). */
export function pedirSalud(campo: string, equipo: string, ctx: Contexto): SaludBomba | undefined {
  const p = perfilBomba(equipo, campo)
  return p ? { partes: saludDePartes(p), historial: historialDeEquipo(campo, equipo, ctx) } : undefined
}
/** `GET /api/vistas/bombas/prediccion?campo=&equipo=` */
export const pedirPrediccion = (p: PerfilBomba, ctx: Contexto): Prediccion => prediccion(p, ctx)
/** La predicción de una bomba con perfil; sin perfil no hay qué predecir (undefined). */
export function usePrediccion(p: PerfilBomba | undefined): Prediccion | undefined {
  const ctx = useCtx()
  return useDatoSi(PREDICCION, p ? { campo: p.campoId, equipo: p.equipo } : null, v(ctx), () => pedirPrediccion(p!, ctx))
}
/** `GET /api/vistas/bombas/paradas?campo=&equipo=` → toda la historia de
 *  paradas de la bomba, medidas, de la más reciente a la más vieja. */
export const pedirParadas = (campo: string, equipo: string, ctx: Contexto): ParadaMedida[] =>
  paradasDe(equipo, campo).map(e => paradaMedida(e, ctx)).filter((m): m is ParadaMedida => !!m)
    .sort((a, b) => b.inicio.getTime() - a.inicio.getTime())
export function useParadas(campo: string, equipo: string): ParadaMedida[] {
  const ctx = useCtx()
  return useDato(PARADAS_BOMBA, { campo, equipo }, v(ctx), () => pedirParadas(campo, equipo, ctx))
}
/** Una parada con lo que de ella cae dentro de un período: una parada que
 *  cruza el borde (del 31 al 1) no suma sus horas ni sus barriles completos a
 *  los dos meses, que es como se contaba dos veces. */
export interface ParadaEnPeriodo extends ParadaMedida {
  /** Horas de la parada que caen en [desde, hasta). */
  horasEnPeriodo: number
  /** Barriles de sus tramos recortados a [desde, hasta), con el factor de cada
   *  mes: los mismos tramos que el libro cuenta en ese período. */
  bblEnPeriodo: number
  /** Empieza antes o termina después del período. */
  cruzaBorde: boolean
}
/** Las paradas de una bomba que se solapan con el período, recortadas a él. */
export function pedirParadasEnPeriodo(campo: string, equipo: string, desde: Date, hasta: Date, ctx: Contexto): ParadaEnPeriodo[] {
  const enPeriodo = tramosEntre([campo], desde, hasta, ctx)
  return pedirParadas(campo, equipo, ctx).filter(m => m.inicio < hasta && m.fin > desde).map(m => {
    const ids = new Set(m.tramos.map(t => t.evento.id))
    const ini = new Date(Math.max(m.inicio.getTime(), desde.getTime())), fin = new Date(Math.min(m.fin.getTime(), hasta.getTime()))
    return { ...m, horasEnPeriodo: Math.max(0, horasEntre(ini, fin)),
      bblEnPeriodo: enPeriodo.filter(t => ids.has(t.evento.id)).reduce((a, t) => a + t.bbl, 0),
      cruzaBorde: m.inicio < desde || m.fin > hasta }
  })
}

/** `GET /api/vistas/bombas/paradas-en-periodo?campos=&desde=&hasta=` → las
 *  paradas de todas las bombas de la línea con perfil en los campos,
 *  recortadas al período. Un pedido por lote, no uno por bomba. */
export const pedirParadasDeBombas = (campos: string[], desde: Date, hasta: Date, ctx: Contexto): ParadaEnPeriodo[] =>
  campos.flatMap(c => Object.keys(EQUIPOS).filter(id => esBomba(id) && perfilBomba(id, c)).flatMap(id => pedirParadasEnPeriodo(c, id, desde, hasta, ctx)))
export function useParadasDeBombas(campos: string[], desde: Date, hasta: Date): ParadaEnPeriodo[] {
  const ctx = useCtx()
  return useDato(PARADAS_EN_PERIODO, { campos, desde, hasta }, v(ctx), () => pedirParadasDeBombas(campos, desde, hasta, ctx))
}

/* ─────────────────────────────── riesgo ─────────────────────────────── */

/** `GET /api/vistas/riesgo?campos=a,b` */
export const pedirRiesgo = (campos: string[], ctx: Contexto): Riesgo[] => riesgoAhora(campos, ctx)
/** El estado de un campo ahora. */
export const pedirEstadoCampo = (campo: string, ctx: Contexto): EstadoCampo => estadoCampo(campo, ctx)
/** `GET /api/vistas/estado?campos=a,b` → el estado de cada campo, por lote: el
 *  riel y la cabecera piden todos sus campos en un pedido, no uno por campo. */
export const pedirEstadoCampos = (campos: string[], ctx: Contexto): EstadoCampo[] => campos.map(id => pedirEstadoCampo(id, ctx))

/* ─────────────────────────────── pozos ─────────────────────────────── */

export interface FilaPozo {
  pozo: Pozo
  produce: boolean
  hz?: number
  /** Evento abierto, con su causa. */
  evento?: EventoPozo
  causa?: Causa
  /** Asignado ahora: prueba vigente × factor del mes. */
  crudoBpd: number
  aguaBpd: number
  prueba?: Prueba
  diasDesdePrueba?: number
  /** En el período: todo lo que el pozo dejó de producir, sea cual sea la causa. */
  diferido: number
  /** En el período: solo lo que costaron las fallas de su propia electrosumergible
   *  (por señal o declaradas). Una parada sin identificar o de otra causa del pozo
   *  no está aquí: ninguna señal se la probó a la ESP. Cuadra con la línea
   *  «electrosumergible» del Pareto por tipo del libro. 0 si no tiene ESP. */
  diferidoEsp: number
  horasParado: number
  eventos: number
  /** Electrosumergible: la parte que más preocupa. */
  salud?: SaludParte
}

/** Las filas de pozos de un campo en el período. */
export function pedirPozos(campo: string, desde: Date, hasta: Date, ctx: Contexto): FilaPozo[] {
  const ts = tramosEntre([campo], desde, hasta, ctx)
  return pozosDe(campo).map(p => {
    const e = estadoAhora(p)
    const prueba = p.pruebas.length ? pruebaEn(p, AHORA.getTime()) : undefined
    const mios = ts.filter(t => t.pozo.id === p.id)
    const salud = p.levantamiento === 'electrosumergible' ? saludDeEsp(p)[0] : undefined
    return {
      pozo: p, produce: e.produce, hz: e.hz, evento: e.evento, causa: e.evento ? causaDeEvento(e.evento, ctx) : undefined,
      crudoBpd: crudoAsignado(p), aguaBpd: aguaDePrueba(p), prueba,
      diasDesdePrueba: prueba ? (AHORA.getTime() - new Date(prueba.fecha).getTime()) / 86_400_000 : undefined,
      diferido: mios.reduce((a, t) => a + t.bbl, 0),
      diferidoEsp: mios.filter(t => t.causa.equipo === p.id && t.causa.tipo === 'electrosumergible').reduce((a, t) => a + t.bbl, 0),
      horasParado: mios.reduce((a, t) => a + t.horas * t.factor, 0),
      eventos: mios.length, salud,
    }
  })
}
/** `GET /api/vistas/pozos?campos=&desde=&hasta=` → las filas de pozos de los
 *  campos, por lote. (El REGISTRO de pozos es otra cosa: viene en el catálogo.) */
export const pedirFilasPozos = (campos: string[], desde: Date, hasta: Date, ctx: Contexto): FilaPozo[] =>
  campos.flatMap(c => pedirPozos(c, desde, hasta, ctx))
export function usePozos(campos: string[], desde: Date, hasta: Date): FilaPozo[] {
  const ctx = useCtx()
  return useDato(POZOS, { campos, desde, hasta }, v(ctx), () => pedirFilasPozos(campos, desde, hasta, ctx))
}

export interface DetallePozo {
  fila: FilaPozo
  /** Cada evento del período con su causa y lo que costó. */
  tramos: Tramo[]
  /** Todos los eventos del pozo en la historia (para el historial del controlador). */
  historicos: Array<{ evento: EventoPozo; causa: Causa }>
  senales: Senal[]
  partes: SaludParte[]
  historial?: HistorialEquipo
}

/** `GET /api/vistas/pozos/:campo/:pozo?desde=&hasta=` */
export function pedirPozo(campo: string, id: string, desde: Date, hasta: Date, ctx: Contexto): DetallePozo | undefined {
  const p = pozoDe(campo, id)
  if (!p) return undefined
  const fila = pedirPozos(campo, desde, hasta, ctx).find(f => f.pozo.id === id)!
  const esp = p.levantamiento === 'electrosumergible'
  return {
    fila,
    tramos: tramosEntre([campo], desde, hasta, ctx).filter(t => t.pozo.id === id).sort((a, b) => b.inicio.getTime() - a.inicio.getTime()),
    historicos: eventosDePozo(campo, id).map(evento => ({ evento, causa: causaDeEvento(evento, ctx) }))
      .sort((a, b) => b.evento.inicio.localeCompare(a.evento.inicio)),
    senales: esp ? senalesEsp(p) : [], partes: esp ? saludDeEsp(p) : [],
    historial: esp ? historialDeEquipo(campo, id, ctx) : undefined,
  }
}
export function usePozo(campo: string, pozo: string, desde: Date, hasta: Date): DetallePozo | undefined {
  const ctx = useCtx()
  return useDato(POZO, { campo, pozo, desde, hasta }, v(ctx), () => pedirPozo(campo, pozo, desde, hasta, ctx))
}

/* ─────────────────────────── electrosumergibles ─────────────────────────── */

export interface FilaEsp {
  fila: FilaPozo
  partes: SaludParte[]
  historial: HistorialEquipo
}

/** `GET /api/vistas/electrosumergibles?campos=a,b&desde=&hasta=` */
export function pedirFlotaEsp(campos: string[], desde: Date, hasta: Date, ctx: Contexto): FilaEsp[] {
  // Solo los campos cuyo perfil firmado tiene electrosumergibles: las demás no se vigilan.
  return campos.filter(c => perfilDe(ctx.config, c).electrosumergibles).flatMap(c => pedirPozos(c, desde, hasta, ctx)
    .filter(f => f.pozo.levantamiento === 'electrosumergible')
    .map(fila => ({ fila, partes: saludDeEsp(fila.pozo), historial: historialDeEquipo(c, fila.pozo.id, ctx) })))
}

/* ──────────────────────────── ganchos ──────────────────────────── */

/* Cada uno lee su endpoint con la caché de consulta.ts. La clave lleva los
   parámetros (campos, desde, hasta) y la versión del contexto, que solo
   cambia cuando alguien firma una configuración o responde una pregunta. */

export function useLibro(q: ConsultaLibro): Libro {
  const ctx = useCtx()
  return useDato(DIFERIDOS, q, v(ctx), () => pedirLibro(q, ctx))
}

/** El libro fuera del dibujo (al exportar): la misma consulta y la misma caché. */
export const traerLibro = (q: ConsultaLibro, ctx: Contexto): Promise<Libro> => traer(DIFERIDOS, q, v(ctx), () => pedirLibro(q, ctx))

/** Varios libros a la vez (los meses recortados de un período): una consulta
 *  por cada uno, en la misma caché. */
export function useLibros(qs: ConsultaLibro[]): Libro[] {
  const ctx = useCtx()
  return useDatos(DIFERIDOS, qs, v(ctx), q => pedirLibro(q, ctx))
}

export function useSerie(campos: string[]): MesResumen[] {
  const ctx = useCtx()
  return useDato(DIFERIDOS_MENSUAL, { campos }, v(ctx), () => pedirSerie(campos, ctx))
}

export function useBase(q: ConsultaLibro): LineaBase | undefined {
  const ctx = useCtx()
  return useDato(DIFERIDOS_BASE, q, v(ctx), () => pedirBase(q, ctx))
}

export function useDias(q: ConsultaLibro): Dia[] {
  const ctx = useCtx()
  return useDato(PRODUCCION_DIARIA, q, v(ctx), () => pedirDias(q, ctx))
}

export function usePotencialReciente(campos: string[]): Record<string, number> {
  const ctx = useCtx()
  return useDato(POTENCIAL_RECIENTE, { campos }, v(ctx), () => pedirPotencialesRecientes(campos, ctx))
}

export function useRiesgo(campos: string[]): Riesgo[] {
  const ctx = useCtx()
  return useDato(RIESGO, { campos }, v(ctx), () => pedirRiesgo(campos, ctx))
}

/** `GET /api/vistas/asignacion?campo=&mes=` → lo que TRIM le asigna a cada pozo en un mes cerrado. */
export function useAsignacionPorPozo(campo: string, mes: string): AsignacionPozo[] {
  const ctx = useCtx()
  return useDato(ASIGNACION, { campo, mes }, v(ctx), () => asignacionPorPozo(campo, mes, ctx))
}

export function usePreguntas(campos: string[]): Pregunta[] {
  const ctx = useCtx()
  return useDato(PREGUNTAS, { campos }, v(ctx), () => pedirPreguntas(campos, ctx))
}

export function useEstadoCampos(campos: string[]): EstadoCampo[] {
  const ctx = useCtx()
  return useDato(ESTADO, { campos }, v(ctx), () => pedirEstadoCampos(campos, ctx))
}

export function useFlotaEsp(campos: string[], desde: Date, hasta: Date): FilaEsp[] {
  const ctx = useCtx()
  return useDato(ELECTROSUMERGIBLES, { campos, desde, hasta }, v(ctx), () => pedirFlotaEsp(campos, desde, hasta, ctx))
}

/** Barriles diferidos de cada equipo en el período, del libro: la ficha de un
 *  equipo dice lo mismo que el libro en cualquier período. */
export function useBarrilesDeEquipos(q: ConsultaLibro): (equipo: string, campoId: string) => number {
  const lb = useLibro(q)
  return useMemo(() => {
    const m = new Map(lb.porEquipo.map(f => [`${f.campoId}:${f.equipo}`, f.bbl]))
    return (equipo: string, campoId: string) => m.get(`${campoId}:${equipo}`) ?? 0
  }, [lb])
}
