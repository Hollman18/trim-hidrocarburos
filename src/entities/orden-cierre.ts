/** A3 · CERRAR LA ORDEN EN EL TELÉFONO Y EL TIEMPO FUERA EN SUS 5 TRAMOS
 *  (necesario-por-rol.md: tec «Cerrar la orden en el teléfono» y jefe «El tiempo
 *  fuera en sus 5 tramos»; CAMBIOS-CONTRATO.md §9, M2 y M5).
 *
 *  1. EL CIERRE (`POST /api/sap/ordenes/:numero/cierre`, capacidad `orden:cerrar`).
 *     El técnico dice, sin papel y sin texto libre (D2):
 *     - qué hizo: una actividad de la lista (`ACTIVIDADES`: cambió, reparó, ajustó…);
 *     - qué se reparó: la parte del catálogo de daños del equipo (`catalogo.ts`), y si
 *       quiere, lo que vio (el modo de la parte). Un equipo sin catálogo no lleva parte;
 *     - las lecturas de arranque: tags numéricos del equipo, con su unidad;
 *     - las horas: cuándo empezó y cuándo terminó el trabajo (t3 y t4 del tiempo fuera).
 *     Quién y a qué hora lo pone el servidor. Solo por inserción (D1): una orden se
 *     cierra una vez; el cierre no se edita ni se borra (409 la segunda vez).
 *     La orden queda `CNF` (ejecutada) con las horas sumadas a `horasReales`; el TECO
 *     lo da el planeador en SAP. Cómo viaja a SAP PM (la confirmación) es del backend.
 *
 *  2. LOS 5 TRAMOS (`tramos`, campo opcional de `GET /api/vistas/relojes`). El tiempo
 *     fuera de cada falla cerrada se parte con sus marcas (U1 §7.5; R3 L1 a L5):
 *       t0 paró (PLC) → t1 aviso en SAP → t2 orden liberada → t3 empezó el trabajo
 *       → t4 terminó el trabajo → t5 arrancó (PLC)
 *     detección = t1−t0 · administrativo = t2−t1 · logística = t3−t2 · reparación = t4−t3
 *     · arranque = t5−t4. t3 y t4 llegan con el cierre en el teléfono. Sin cierre, la
 *     reparación es la que SAP confirmó (`horasReales`, la «activa» de `relojes`) y la
 *     logística y el arranque quedan sin dato.
 *     Lo que no tiene marca va a `sinDatoH` y NUNCA se reparte entre los demás. La suma
 *     de los cinco (los que tienen dato) más `sinDatoH` es exactamente el tiempo fuera.
 *     Un tramo que ninguna falla tiene va en `null` («sin dato»). */
import type { OrdenSap, AvisoSap } from './sap'
import type { ParteId } from './partes'
import type { Catalogo } from './catalogo'
import { modosDeParte } from './catalogo'

/* ─────────────────────────────── el cierre ─────────────────────────────── */

/** Qué hizo el técnico (U1 §8.2, pantalla 4: «¿Qué hizo?»). */
export type ActividadMant = 'cambio' | 'reparacion' | 'ajuste' | 'inspeccion' | 'limpieza' | 'lubricacion'
export const ACTIVIDADES: readonly ActividadMant[] = ['cambio', 'reparacion', 'ajuste', 'inspeccion', 'limpieza', 'lubricacion']
/** Como se dice en el botón. */
export const NOMBRE_ACTIVIDAD: Record<ActividadMant, string> = {
  cambio: 'Cambié', reparacion: 'Reparé', ajuste: 'Ajusté', inspeccion: 'Inspeccioné', limpieza: 'Limpié', lubricacion: 'Lubriqué',
}

/** Una lectura de arranque: un tag numérico del equipo, con la unidad del registro. */
export interface LecturaCierre { tag: string; valor: number; unidad: string }

/** Lo que manda el teléfono. */
export interface CuerpoCierreOrden {
  actividad: ActividadMant
  /** La parte del catálogo del equipo. Obligatoria si el equipo tiene catálogo; prohibida si no. */
  parte?: ParteId
  /** Lo que vio en la parte (modo de ISO 14224 del catálogo de la parte). Opcional. */
  modo?: string
  lecturas?: Array<{ tag: string; valor: number }>
  /** Cuándo empezó y terminó el trabajo (ISO 8601 con zona): t3 y t4. */
  inicio: string
  fin: string
}

/** El cierre como lo guarda el servidor (por inserción, uno por orden). */
export interface CierreOrden {
  orden: string
  campoId: string
  equipo: string
  actividad: ActividadMant
  parte?: ParteId
  modo?: string
  lecturas: LecturaCierre[]
  inicio: string
  fin: string
  /** fin − inicio, en horas: lo que se suma a las horas confirmadas de la orden. */
  horas: number
  /** La parada del PLC que atendió la orden, si es correctiva. */
  evento?: string
  /** Quién cerró («Nombre · rol»), su id y a qué hora quedó guardado. Los pone el servidor. */
  por: string
  porId: string
  hora: string
}

/** Las lecturas de un cierre no son una planilla: hasta 20. */
export const MAXIMO_LECTURAS = 20
/** Un trabajo de más de 14 días en una sola orden es un error de dedo. */
export const MAXIMO_HORAS_TRABAJO = 14 * 24

/** Los estados en que una orden se puede cerrar desde el teléfono: liberada o en ejecución. */
export const SE_CIERRA: readonly OrdenSap['estado'][] = ['REL', 'PCNF']

/** Lo que no pasa una regla del cierre, con su HTTP y su código (los mismos de la
 *  tabla de errores de CONTRATO.md). */
export interface FallaCierre { estado: 409 | 422; codigo: string; error: string }

/** Las reglas del dominio del cierre (las de forma, permiso y existencia van antes,
 *  en la escritura). `tags` son los numéricos del equipo con su unidad; `ahora`, ms. */
export function revisarCierre(c: CuerpoCierreOrden, o: OrdenSap, catalogo: Catalogo | undefined,
  tags: ReadonlyMap<string, string>, ahora: number): FallaCierre | undefined {
  if (o.estado === 'CNF' || o.estado === 'TECO' || o.cierre) return { estado: 409, codigo: 'ya-cerrada', error: `La orden ${o.numero} ya está cerrada: un cierre no se repite ni se edita.` }
  if (!SE_CIERRA.includes(o.estado)) return { estado: 409, codigo: 'sin-liberar', error: `La orden ${o.numero} todavía no está liberada en SAP: no se puede cerrar.` }
  if (!ACTIVIDADES.includes(c.actividad)) return { estado: 422, codigo: 'actividad-ajena', error: 'Diga qué hizo con uno de los botones (cambié, reparé, ajusté, inspeccioné, limpié o lubriqué).' }
  if (catalogo) {
    const parte = c.parte === undefined ? undefined : catalogo.partes.find(p => p.id === c.parte)
    if (!parte) return { estado: 422, codigo: 'parte-ajena', error: c.parte === undefined ? `Diga qué parte de ${o.equipo} se reparó.` : `Esa parte no es de ${o.equipo}.` }
    if (c.modo !== undefined && !modosDeParte(parte).some(m => m.codigo === c.modo)) return { estado: 422, codigo: 'modo-ajeno', error: 'Lo que vio no es de esa parte.' }
  } else if (c.parte !== undefined || c.modo !== undefined) return { estado: 422, codigo: 'parte-ajena', error: `${o.equipo} no tiene partes en el catálogo de daños: el cierre va sin parte.` }
  const ini = Date.parse(c.inicio), fin = Date.parse(c.fin)
  if (!(Number.isFinite(ini) && Number.isFinite(fin) && ini < fin)) return { estado: 422, codigo: 'horas-invalidas', error: 'La hora en que terminó tiene que ser después de la hora en que empezó.' }
  if (fin > ahora) return { estado: 422, codigo: 'horas-invalidas', error: 'El trabajo no puede terminar después de ahora.' }
  if (o.liberada && ini < Date.parse(o.liberada)) return { estado: 422, codigo: 'horas-invalidas', error: 'El trabajo no puede empezar antes de que se liberara la orden.' }
  if ((fin - ini) / 3_600_000 > MAXIMO_HORAS_TRABAJO) return { estado: 422, codigo: 'horas-invalidas', error: 'Un trabajo de más de 14 días no va en un solo cierre: revise las horas.' }
  const lecturas = c.lecturas ?? []
  if (lecturas.length > MAXIMO_LECTURAS) return { estado: 422, codigo: 'texto-largo', error: `Un cierre lleva hasta ${MAXIMO_LECTURAS} lecturas.` }
  const vistos = new Set<string>()
  for (const l of lecturas) {
    if (!tags.has(l.tag)) return { estado: 422, codigo: 'lectura-ajena', error: `${l.tag} no es una variable de ${o.equipo} con lectura numérica.` }
    if (vistos.has(l.tag)) return { estado: 422, codigo: 'lectura-ajena', error: `${l.tag} viene dos veces.` }
    vistos.add(l.tag)
    if (!Number.isFinite(l.valor)) return { estado: 422, codigo: 'lectura-ajena', error: `La lectura de ${l.tag} tiene que ser un número.` }
  }
  return undefined
}

/** El cierre como se guarda, con lo que pone el servidor. */
export function armarCierre(c: CuerpoCierreOrden, o: OrdenSap, tags: ReadonlyMap<string, string>,
  quien: { por: string; porId: string; hora: string }): CierreOrden {
  const horas = (Date.parse(c.fin) - Date.parse(c.inicio)) / 3_600_000
  return {
    orden: o.numero, campoId: o.campoId, equipo: o.equipo, actividad: c.actividad,
    ...(c.parte !== undefined ? { parte: c.parte } : {}), ...(c.modo !== undefined ? { modo: c.modo } : {}),
    lecturas: (c.lecturas ?? []).map(l => ({ tag: l.tag, valor: l.valor, unidad: tags.get(l.tag) ?? '' })),
    inicio: c.inicio, fin: c.fin, horas, ...(o.evento ? { evento: o.evento } : {}), ...quien,
  }
}

/** La orden con su cierre encima: ejecutada (`CNF`, o la `TECO` que ya diga SAP) y
 *  con las horas del cierre sumadas a las confirmadas. Lo de SAP no se toca: se
 *  agrega. (Con SAP de verdad, la confirmación viaja y vuelve en `horasReales`: el
 *  servidor no la suma dos veces.) */
export const ordenConCierre = (o: OrdenSap, c: CierreOrden): OrdenSap =>
  ({ ...o, estado: o.estado === 'TECO' ? 'TECO' : 'CNF', horasReales: o.horasReales + c.horas, cierre: c })

/** Las órdenes con los cierres de la sesión encima (los demás quedan iguales). */
export function conCierres(ordenes: readonly OrdenSap[], cierres: readonly CierreOrden[] | undefined): OrdenSap[] {
  if (!cierres?.length) return [...ordenes]
  const por = new Map(cierres.map(c => [c.orden, c]))
  return ordenes.map(o => { const c = por.get(o.numero); return c ? ordenConCierre(o, c) : o })
}

/* ─────────────────────────────── los 5 tramos ─────────────────────────────── */

export type TramoTiempoFuera = 'deteccion' | 'administrativo' | 'logistica' | 'reparacion' | 'arranque'
export const TRAMOS_TIEMPO_FUERA: readonly TramoTiempoFuera[] = ['deteccion', 'administrativo', 'logistica', 'reparacion', 'arranque']
/** Como se dicen encima de la barra (U1 §7.5). */
export const NOMBRE_TRAMO_TIEMPO_FUERA: Record<TramoTiempoFuera, string> = {
  deteccion: 'Detección', administrativo: 'Administrativo', logistica: 'Logística', reparacion: 'Reparación', arranque: 'Arranque',
}

/** El campo opcional `tramos` de `GET /api/vistas/relojes`: promedios por falla, en horas. */
export interface TramosTiempoFuera {
  /** Cada tramo: Σ de lo medido en las fallas ÷ las fallas. `null`: ninguna falla lo tiene («sin dato»). */
  deteccionH: number | null
  administrativoH: number | null
  logisticaH: number | null
  reparacionH: number | null
  arranqueH: number | null
  /** Lo que ninguna marca explica (Σ ÷ las fallas). Nunca se reparte. Σ tramos con dato + esto = `totalH`. */
  sinDatoH: number
  /** Fallas que entran (las mismas de `relojes.fallas`). */
  fallas: number
  /** De ellas, cuántas traen el cierre en el teléfono (t3 y t4); las demás toman la reparación de SAP. */
  conCierre: number
}

/** Una falla cerrada con sus marcas: lo que se sabe de cada una. */
export interface MarcasFalla {
  /** t0: paró (PLC), ms. */
  inicio: number
  /** El tiempo fuera, horas (t5 − t0). */
  totalH: number
  /** t1: el aviso en SAP (ms), si la orden tiene aviso. */
  aviso?: number
  /** t2: la orden liberada (ms). */
  liberada?: number
  /** t3 y t4: el trabajo, del cierre en el teléfono (ms). */
  trabajo?: { inicio: number; fin: number }
  /** Las horas que SAP confirmó (la reparación activa), para cuando no hay cierre. */
  horasSap?: number
}

const H = 3_600_000

/** Los 5 tramos de una falla, en horas, y lo que queda sin dato. */
export function tramosDeFalla(m: MarcasFalla): { tramos: Partial<Record<TramoTiempoFuera, number>>; sinDatoH: number } {
  const t0 = m.inicio, t5 = m.inicio + m.totalH * H
  // Las marcas en su orden; una fuera de [t0, t5] o antes de la anterior no se usa (no se inventa el orden).
  const crudas: Array<number | undefined> = [t0, m.aviso, m.liberada, m.trabajo?.inicio, m.trabajo?.fin, t5]
  const validas: Array<number | undefined> = []
  let ultima = t0
  for (const [i, x] of crudas.entries()) {
    if (i === 0 || i === 5) { validas.push(i === 0 ? t0 : t5); continue }
    if (x !== undefined && x >= ultima && x <= t5) { validas.push(x); ultima = x } else validas.push(undefined)
  }
  const tramos: Partial<Record<TramoTiempoFuera, number>> = {}
  let sinDato = 0
  // Cada tramo con sus dos marcas; un hueco entre dos marcas válidas va entero a «sin dato».
  let desde = 0
  for (let i = 1; i <= 5; i++) {
    if (validas[i] === undefined) continue
    const span = (validas[i]! - validas[desde]!) / H
    if (i === desde + 1) tramos[TRAMOS_TIEMPO_FUERA[desde]!] = span
    else {
      // El hueco cubre la reparación (t3→t4) sin el cierre: la reparación es la que confirmó SAP, si cabe.
      const cubreReparacion = desde <= 3 && i >= 4
      const sap = m.horasSap
      if (cubreReparacion && !m.trabajo && sap !== undefined && sap > 0 && sap <= span) { tramos.reparacion = sap; sinDato += span - sap }
      else sinDato += span
    }
    desde = i
  }
  return { tramos, sinDatoH: sinDato }
}

/** Los promedios por falla de los 5 tramos. `undefined` sin fallas. */
export function tramosTiempoFuera(fallas: readonly MarcasFalla[]): TramosTiempoFuera | undefined {
  if (!fallas.length) return undefined
  const suma: Record<TramoTiempoFuera, number> = { deteccion: 0, administrativo: 0, logistica: 0, reparacion: 0, arranque: 0 }
  const conDato: Record<TramoTiempoFuera, number> = { deteccion: 0, administrativo: 0, logistica: 0, reparacion: 0, arranque: 0 }
  let sinDato = 0
  for (const f of fallas) {
    const r = tramosDeFalla(f)
    for (const t of TRAMOS_TIEMPO_FUERA) if (r.tramos[t] !== undefined) { suma[t] += r.tramos[t]!; conDato[t]++ }
    sinDato += r.sinDatoH
  }
  const n = fallas.length
  const de = (t: TramoTiempoFuera) => (conDato[t] ? suma[t] / n : null)
  return {
    deteccionH: de('deteccion'), administrativoH: de('administrativo'), logisticaH: de('logistica'), reparacionH: de('reparacion'), arranqueH: de('arranque'),
    sinDatoH: sinDato / n, fallas: n, conCierre: fallas.filter(f => f.trabajo).length,
  }
}

/** Las marcas de una orden correctiva cerrada: su parada del PLC, su aviso, su
 *  liberación y su cierre en el teléfono (si lo tiene). */
export function marcasDeOrden(o: OrdenSap, falla: { inicio: Date; horas: number }, avisos: readonly AvisoSap[]): MarcasFalla {
  const aviso = o.aviso ? avisos.find(a => a.numero === o.aviso) : undefined
  const c = o.cierre
  return {
    inicio: falla.inicio.getTime(), totalH: falla.horas,
    ...(aviso ? { aviso: Date.parse(aviso.creado) } : {}),
    ...(o.liberada ? { liberada: Date.parse(o.liberada) } : {}),
    ...(c ? { trabajo: { inicio: Date.parse(c.inicio), fin: Date.parse(c.fin) } } : {}),
    // Sin cierre, la reparación es la que SAP confirmó; con él, la del teléfono.
    ...(!c ? { horasSap: o.horasReales } : {}),
  }
}
