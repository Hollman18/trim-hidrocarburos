/** SAP Plant Maintenance, visto desde TRIM.
 *
 *  SAP es el sistema de registro del mantenimiento: ahí viven los avisos, las
 *  órdenes de trabajo, sus horas, el historial y los repuestos. TRIM no lo
 *  reemplaza ni crea órdenes. Hace dos cosas:
 *   1. Le ENVÍA a SAP el aviso de mantenimiento (M2 avería, M1 solicitud) con
 *      la evidencia que tiene: equipo, hora del PLC, parte sospechosa, tags.
 *      El planeador decide en SAP si lo vuelve orden.
 *   2. LEE de SAP el estado de los avisos y órdenes, las horas confirmadas, el
 *      historial y el stock de repuestos, para mostrarlos junto a los barriles.
 *
 *  Contrato: `/api/sap/*` (CONTRATO.md). La conexión real con SAP (OData de
 *  S/4HANA o BAPI por el middleware de la empresa) es del backend.
 *
 *  🔴 Datos de demostración: los avisos y órdenes de abajo se derivan, con una
 *  regla fija y declarada, de la historia de paradas del PLC de cada equipo.
 *  En producción vienen de SAP.
 */
import { historialDeEquipo, contextoInicial, type FallaEquipo } from './libro'
import { equipoEnCampo } from './equipos'
import { esBomba } from './bombas'
import { pozosDe } from './pozos'
import { flotaDe } from './flota'
import { prediccionesHistoricas } from './aciertos'
import { CAMPOS } from './campos'
import { NOMBRE_PARTE, type ParteId, type Familia } from './partes'
import { PUESTA_EN_MARCHA } from './configuracion'
import type { Contexto } from './causa-senal'
import { AHORA, fechaCorta } from './reloj'

export type TipoAviso = 'M1' | 'M2'
export type ClaseOrden = 'PM01' | 'PM02' | 'PM03'
/** Estados de sistema de una orden en SAP, en el orden en que se recorren. */
export type EstadoOrden = 'CRTD' | 'REL' | 'PCNF' | 'CNF' | 'TECO'

export const NOMBRE_TIPO_AVISO: Record<TipoAviso, string> = { M1: 'solicitud', M2: 'avería' }
export const NOMBRE_CLASE: Record<ClaseOrden, string> = { PM01: 'correctivo', PM02: 'preventivo', PM03: 'predictivo' }
export const NOMBRE_ESTADO_ORDEN: Record<EstadoOrden, string> = {
  CRTD: 'creada, sin liberar', REL: 'liberada', PCNF: 'en ejecución', CNF: 'ejecutada', TECO: 'cerrada',
}

export interface AvisoSap {
  numero: string
  tipo: TipoAviso
  campoId: string
  equipo: string
  descripcion: string
  /** 1 muy alta · 4 baja. */
  prioridad: 1 | 2 | 3 | 4
  parte?: ParteId
  /** Daño (catálogo C de SAP): el modo de falla de ISO 14224 que se vio. */
  modo?: string
  /** Inicio de la avería, la hora del PLC. */
  inicioAveria?: string
  /** Si el equipo está parado (indicador de parada de SAP). */
  parada: boolean
  /** Texto largo: la evidencia que TRIM manda (tags, lecturas, causa). */
  evidencia: string[]
  creado: string
  creadoPor: string
  /** Lo creó TRIM o se creó directo en SAP. */
  origen: 'trim' | 'sap'
  /** El evento del PLC que lo originó, si lo hay. */
  evento?: string
  orden?: string
  cerrado: boolean
}

export interface RepuestoOrden { material: string; descripcion: string; cantidad: number }

export interface OrdenSap {
  numero: string
  clase: ClaseOrden
  campoId: string
  equipo: string
  descripcion: string
  estado: EstadoOrden
  prioridad: 1 | 2 | 3 | 4
  creada: string
  liberada?: string
  cierreTecnico?: string
  /** Persona asignada (id del registro de usuarios) o el puesto de trabajo del contratista. */
  tecnico?: string
  puesto: string
  aviso?: string
  /** Horas confirmadas en SAP (reparación activa). */
  horasReales: number
  repuestos: RepuestoOrden[]
  /** Para una correctiva: la parada del PLC que atendió (y su indisponibilidad total). */
  evento?: string
}

export interface Repuesto {
  material: string
  descripcion: string
  campoId: string
  equipos: string[]
  /** Libre utilización en la bodega del campo. */
  stock: number
  minimo: number
  /** Días que tarda en llegar si hay que pedirlo. */
  plazoDias: number
  enTransito?: { cantidad: number; llega: string }
}

/* ─────────────────────── identidad del equipo en SAP ─────────────────────── */

const CODIGO_CAMPO: Record<string, string> = { ceiba: 'CEI', morichal: 'MNO', guacamayo: 'GUA', palmar: 'PAL', zarza: 'ZAR' }
const hash = (s: string) => { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 900_000; return h }

/** El número de equipo y la ubicación técnica de SAP. En producción salen del
 *  maestro de SAP y se asocian en Conectores; aquí, con una regla fija. */
export function identidadSap(campoId: string, equipo: string): { equipoSap: string; ubicacion: string } {
  const pozo = pozosDe(campoId).some(p => p.id === equipo)
  const seccion = pozo ? 'POZ' : esBomba(equipo) ? 'AGU' : 'SRV'
  return { equipoSap: `10${String(100_000 + hash(`${campoId}${equipo}`)).padStart(6, '0')}`, ubicacion: `CO-${CODIGO_CAMPO[campoId] ?? 'XXX'}-BAT1-${seccion}-${equipo}` }
}

/* ───────────────────────── repuestos por parte ───────────────────────── */

type Material = { material: string; descripcion: string }
/** El repuesto de cada parte, POR FAMILIA: el «motor» de una bomba de
 *  superficie es su motor eléctrico de accionamiento, no el motor de fondo de
 *  una electrosumergible, y el sello de la multifásica (cuatro sellos) no es
 *  el kit de la centrífuga. Donde no hay material declarado, la orden va sin
 *  repuesto: no se le pone el de otra máquina. */
const MATERIAL_DE: Record<Familia, Partial<Record<ParteId, Material>>> = {
  inyeccion: {
    sello: { material: 'MAT-SELLO-201', descripcion: 'Kit de sello mecánico' },
    rodamientos: { material: 'MAT-ROD-201', descripcion: 'Juego de rodamientos' },
    hidraulica: { material: 'MAT-IMP-201', descripcion: 'Impulsor y anillos de desgaste' },
    succion: { material: 'MAT-FIL-201', descripcion: 'Filtro canasta de succión' },
  },
  multifasica: {
    tornillos: { material: 'MAT-TOR-301', descripcion: 'Juego de tornillos' },
    filtro: { material: 'MAT-FIL-201', descripcion: 'Filtro canasta de succión' },
  },
  electrosumergible: {
    aislamiento: { material: 'MAT-CAB-ESP', descripcion: 'Cable de potencia y empalme' },
    motor: { material: 'MAT-MOT-ESP', descripcion: 'Motor de fondo' },
    bomba: { material: 'MAT-BOM-ESP', descripcion: 'Bomba electrosumergible (etapas)' },
    admision: { material: 'MAT-ADM-ESP', descripcion: 'Separador de gas y admisión' },
    protector: { material: 'MAT-PRO-ESP', descripcion: 'Protector (sección sello)' },
  },
}
/** El repuesto de la parte de un equipo, según la familia del equipo en su campo. */
const materialDe = (campoId: string, equipo: string, parte?: ParteId): Material | undefined => {
  const familia = flotaDe(campoId).find(f => f.equipo === equipo)?.familia
  return familia && parte ? MATERIAL_DE[familia][parte] : undefined
}

/** Stock de demostración de los repuestos críticos de cada campo. 🔴 En
 *  producción es el stock de libre utilización de SAP MM. */
const STOCK: Array<Omit<Repuesto, 'descripcion'>> = [
  { material: 'MAT-SELLO-201', campoId: 'ceiba', equipos: ['P-201B'], stock: 0, minimo: 1, plazoDias: 21, enTransito: { cantidad: 1, llega: '2026-10-09' } },
  { material: 'MAT-ROD-201', campoId: 'ceiba', equipos: ['P-201B'], stock: 2, minimo: 1, plazoDias: 14 },
  { material: 'MAT-IMP-201', campoId: 'ceiba', equipos: ['P-201B'], stock: 0, minimo: 1, plazoDias: 45 },
  { material: 'MAT-SELLO-201', campoId: 'morichal', equipos: ['P-201B'], stock: 1, minimo: 1, plazoDias: 21 },
  { material: 'MAT-ROD-201', campoId: 'morichal', equipos: ['P-201B'], stock: 1, minimo: 1, plazoDias: 14 },
  { material: 'MAT-TOR-301', campoId: 'morichal', equipos: ['MPP-301'], stock: 0, minimo: 1, plazoDias: 60 },
  { material: 'MAT-FIL-201', campoId: 'morichal', equipos: ['MPP-301'], stock: 4, minimo: 2, plazoDias: 7 },
  { material: 'MAT-SELLO-201', campoId: 'guacamayo', equipos: ['P-201B'], stock: 1, minimo: 1, plazoDias: 21 },
  { material: 'MAT-BOM-ESP', campoId: 'morichal', equipos: [], stock: 2, minimo: 2, plazoDias: 60 },
  { material: 'MAT-CAB-ESP', campoId: 'morichal', equipos: [], stock: 3, minimo: 2, plazoDias: 30 },
  { material: 'MAT-BOM-ESP', campoId: 'ceiba', equipos: [], stock: 1, minimo: 1, plazoDias: 60 },
  { material: 'MAT-CAB-ESP', campoId: 'ceiba', equipos: [], stock: 0, minimo: 1, plazoDias: 30, enTransito: { cantidad: 2, llega: '2026-10-20' } },
  { material: 'MAT-BOM-ESP', campoId: 'guacamayo', equipos: [], stock: 0, minimo: 1, plazoDias: 60 },
]
const DESCRIPCION = Object.fromEntries(Object.values(MATERIAL_DE).flatMap(f => Object.values(f)).map(m => [m.material, m.descripcion]))

/** Los repuestos críticos de un equipo (las electrosumergibles comparten los del campo). */
export function repuestosDe(campoId: string, equipo: string): Repuesto[] {
  const esEsp = pozosDe(campoId).find(p => p.id === equipo)?.levantamiento === 'electrosumergible'
  return STOCK.filter(r => r.campoId === campoId && (r.equipos.includes(equipo) || (esEsp && r.equipos.length === 0)))
    .map(r => ({ ...r, descripcion: DESCRIPCION[r.material] ?? r.material }))
}

/* ─────────────────────────── historia en SAP ─────────────────────────── */

const H = 3_600_000
const mas = (t: Date | string, horas: number) => new Date(new Date(t).getTime() + horas * H).toISOString()
/** Regla de la demostración: la reparación activa de una correctiva es la
 *  menor entre la duración de la parada y una jornada de 8 h; lo demás de la
 *  parada fue espera (repuesto, permisos, cuadrilla). */
const JORNADA_H = 8

export interface HistoriaSap { avisos: AvisoSap[]; ordenes: OrdenSap[] }

// Por contexto: una respuesta del operario cambia la parte de un aviso.
const CACHE = new WeakMap<Contexto, HistoriaSap>()

/** Avisos y órdenes de la historia: una correctiva por cada falla cerrada del
 *  PLC, una preventiva por cada parada del programa aprobado y una predictiva
 *  abierta por la acción inmediata del aire de La Ceiba. */
export function historiaSap(ctx: Contexto): HistoriaSap {
  const ya = CACHE.get(ctx)
  if (ya) return ya
  // Lo que existe en SAP y su numeración no cambian con lo que se responde o se
  // firma hoy: es lo que quedó registrado. Hoy solo se actualiza la parte de una
  // falla que alguien declaró después (SAP recibe ese dato en el aviso).
  const base = ctx === contextoInicial() ? armarHistoria(ctx) : historiaSap(contextoInicial())
  const h = ctx === contextoInicial() ? base : conPartesDeHoy(base, ctx)
  CACHE.set(ctx, h)
  return h
}

/** Las fallas que alguien declaró después de registrarse: su parte llega al aviso y a la orden. */
function conPartesDeHoy(base: HistoriaSap, ctx: Contexto): HistoriaSap {
  const parteHoy = (a: AvisoSap) => a.evento ? historialDeEquipo(a.campoId, a.equipo, ctx).eventos.find(e => e.id === a.evento)?.parte : undefined
  const cambian = new Map<string, ParteId>()
  for (const a of base.avisos) { const p = parteHoy(a); if (p && p !== a.parte) cambian.set(a.numero, p) }
  if (!cambian.size) return base
  return {
    avisos: base.avisos.map(a => {
      const p = cambian.get(a.numero)
      return p ? { ...a, parte: p, descripcion: `${NOMBRE_PARTE[p]}: parada de ${a.equipo}` } : a
    }),
    ordenes: base.ordenes.map(o => {
      const p = o.aviso ? cambian.get(o.aviso) : undefined
      if (!p) return o
      const mat = materialDe(o.campoId, o.equipo, p)
      return { ...o, descripcion: `Reparar ${NOMBRE_PARTE[p].toLowerCase()} de ${o.equipo}`,
        repuestos: mat ? [{ material: mat.material, descripcion: mat.descripcion, cantidad: 1 }] : [] }
    }),
  }
}

function armarHistoria(ctx: Contexto): HistoriaSap {
  const avisos: AvisoSap[] = [], ordenes: OrdenSap[] = []
  let nAviso = 10_004_100, nOrden = 40_012_000
  const ahora = AHORA.getTime()
  const fallas: Array<{ campoId: string; equipo: string; f: FallaEquipo }> = []
  for (const c of CAMPOS) for (const { equipo: eq } of flotaDe(c.id))
    for (const f of historialDeEquipo(c.id, eq, ctx).eventos) if (!f.disparo && f.fin) fallas.push({ campoId: c.id, equipo: eq, f })
  fallas.sort((a, b) => a.f.inicio.getTime() - b.f.inicio.getTime())

  for (const { campoId, equipo, f } of fallas) {
    // El día de la puesta en marcha empieza a medianoche de Colombia, no de UTC.
    const porTrim = f.inicio >= new Date(`${PUESTA_EN_MARCHA}T00:00:00-05:00`)
    const aviso: AvisoSap = {
      numero: String(nAviso++), tipo: 'M2', campoId, equipo, prioridad: f.bbl > 0 ? 1 : 2, parte: f.parte,
      descripcion: f.parte ? `${NOMBRE_PARTE[f.parte]}: parada de ${equipo}` : `Parada de ${equipo}`,
      inicioAveria: f.inicio.toISOString(), parada: true, evento: f.id, cerrado: true,
      evidencia: [`Parada del PLC ${f.id}`],
      creado: mas(f.inicio, porTrim ? 0.05 : 0.5), creadoPor: porTrim ? 'TRIM · desde la parada del PLC' : 'Operación, directo en SAP',
      origen: porTrim ? 'trim' : 'sap',
    }
    const mat = materialDe(campoId, equipo, f.parte)
    const orden: OrdenSap = {
      numero: String(nOrden++), clase: 'PM01', campoId, equipo, prioridad: aviso.prioridad,
      descripcion: f.parte ? `Reparar ${NOMBRE_PARTE[f.parte].toLowerCase()} de ${equipo}` : `Revisar y reparar ${equipo}`,
      estado: 'TECO', creada: mas(f.inicio, 1), liberada: mas(f.inicio, 2), cierreTecnico: mas(f.fin!, 3),
      tecnico: campoId === 'ceiba' ? 'tec' : undefined, puesto: campoId === 'ceiba' ? 'MEC-CEIBA' : 'MEC-CONTRATISTA',
      aviso: aviso.numero, horasReales: Math.min(f.horas, JORNADA_H), evento: f.id,
      repuestos: mat ? [{ material: mat.material, descripcion: mat.descripcion, cantidad: 1 }] : [],
    }
    aviso.orden = orden.numero
    avisos.push(aviso); ordenes.push(orden)
  }

  // Preventivas: el programa de paradas aprobado (la configuración firmada).
  for (const p of [...ctx.config.programa].sort((a, b) => a.desde.localeCompare(b.desde))) {
    const fin = new Date(p.hasta).getTime(), ini = new Date(p.desde).getTime()
    // El planeador la crea una semana antes y la libera la víspera: antes de eso SAP no la tiene.
    const creada = mas(p.desde, -24 * 7), liberada = mas(p.desde, -24)
    if (new Date(creada).getTime() > ahora) continue
    const hecha = fin <= ahora, libre = new Date(liberada).getTime() <= ahora
    ordenes.push({
      numero: String(nOrden++), clase: 'PM02', campoId: p.campoId, equipo: p.equipo, prioridad: 3, descripcion: p.motivo,
      estado: hecha ? 'TECO' : ini <= ahora ? 'PCNF' : libre ? 'REL' : 'CRTD', creada, ...(libre ? { liberada } : {}),
      ...(hecha ? { cierreTecnico: mas(p.hasta, 2) } : {}),
      tecnico: p.campoId === 'ceiba' ? 'tec' : undefined, puesto: p.campoId === 'ceiba' ? 'MEC-CEIBA' : 'MEC-CONTRATISTA',
      horasReales: hecha ? Math.min((fin - ini) / H, JORNADA_H) : 0, repuestos: [],
    })
  }

  // Predictiva abierta: la acción inmediata del aire de instrumentos de La Ceiba, liberada hoy.
  const aire = equipoEnCampo('K-101', 'ceiba')
  if (aire?.intervencion) {
    const aviso: AvisoSap = {
      numero: String(nAviso++), tipo: 'M1', campoId: 'ceiba', equipo: 'K-101', prioridad: 2,
      descripcion: 'Aire de instrumentos degradado: presión de cabezal cayendo', parada: false, cerrado: false,
      evidencia: [aire.lectura], creado: '2026-10-02T07:40:00-05:00', creadoPor: 'TRIM · el aire cae hace 7 días', origen: 'trim',
    }
    const orden: OrdenSap = {
      numero: String(nOrden++), clase: 'PM03', campoId: 'ceiba', equipo: 'K-101', prioridad: 2,
      descripcion: aire.intervencion.accionInmediata, estado: 'REL', creada: '2026-10-02T08:30:00-05:00', liberada: '2026-10-02T09:10:00-05:00',
      tecnico: 'tec', puesto: 'MEC-CEIBA', aviso: aviso.numero, horasReales: 0, repuestos: [],
    }
    aviso.orden = orden.numero
    avisos.push(aviso); ordenes.push(orden)
  }

  // Predictivas cerradas: las predicciones del vigía que se atendieron antes de
  // fallar (las «intervenidas» del historial de aciertos). Van al final para no
  // mover la numeración de lo anterior.
  for (const p of prediccionesHistoricas(CAMPOS.map(c => c.id), ctx).filter(x => x.intervencion)) {
    const parte = p.parte ? NOMBRE_PARTE[p.parte].toLowerCase() : 'una parte'
    const aviso: AvisoSap = {
      numero: String(nAviso++), tipo: 'M1', campoId: p.campoId, equipo: p.equipo, prioridad: 2, parte: p.parte,
      descripcion: `El vigía anticipa falla: ${parte} de ${p.equipo}`, parada: false, cerrado: true,
      evidencia: [`Predicción ${p.id} · ventana hasta el ${fechaCorta(new Date(p.hasta))}`], creado: mas(p.emitida, 0.2), creadoPor: 'TRIM · predicción del vigía', origen: 'trim',
    }
    const orden: OrdenSap = {
      numero: String(nOrden++), clase: 'PM03', campoId: p.campoId, equipo: p.equipo, prioridad: 2,
      descripcion: p.accion ?? `Intervenir ${parte} de ${p.equipo}`, estado: 'TECO', creada: mas(p.emitida, 2), liberada: mas(p.emitida, 4), cierreTecnico: p.intervencion!,
      tecnico: p.campoId === 'ceiba' ? 'tec' : undefined, puesto: p.campoId === 'ceiba' ? 'MEC-CEIBA' : 'MEC-CONTRATISTA',
      aviso: aviso.numero, horasReales: Math.min(JORNADA_H, 4), repuestos: [],
    }
    aviso.orden = orden.numero
    avisos.push(aviso); ordenes.push(orden)
  }

  return { avisos, ordenes }
}

/* ───────────────────────────── cálculos ───────────────────────────── */

/** Horas confirmadas de mantenimiento proactivo (preventivo + predictivo)
 *  contra correctivo, por las fechas de cierre dentro del período. Es el
 *  indicador que más pesa para un jefe de mantenimiento. */
export function horasPorClase(ordenes: OrdenSap[], desde: Date, hasta: Date) {
  const dentro = ordenes.filter(o => {
    const t = new Date(o.cierreTecnico ?? o.liberada ?? o.creada).getTime()
    return t >= desde.getTime() && t < hasta.getTime()
  })
  const suma = (c: ClaseOrden[]) => dentro.filter(o => c.includes(o.clase)).reduce((a, o) => a + o.horasReales, 0)
  const proactivo = suma(['PM02', 'PM03']), correctivo = suma(['PM01'])
  return { proactivo, correctivo, ordenes: dentro.length, porcentaje: proactivo + correctivo > 0 ? (proactivo / (proactivo + correctivo)) * 100 : undefined }
}

/** Los tres relojes de una falla (ISO 14224): la indisponibilidad total la
 *  mide TRIM con el PLC; la reparación activa, SAP con las horas confirmadas;
 *  la diferencia es espera (repuesto, permisos, cuadrilla). */
export function relojes(ordenes: OrdenSap[], indisponibilidadH: (evento: string) => number | undefined): {
  /** Fallas que entran en el promedio. */
  fallas: number
  /** Órdenes cerradas cuya parada del PLC no se encontró: no entran, pero se cuentan. */
  excluidas: number
  /** Promedios por falla. Sin ninguna falla con su parada, no hay promedio: hueco. */
  totalH?: number; activaH?: number; esperaH?: number
} | undefined {
  const candidatas = ordenes.filter(o => o.clase === 'PM01' && o.evento && o.estado === 'TECO')
  if (!candidatas.length) return undefined
  // Una orden sin su parada del PLC no tiene indisponibilidad que comparar: sale
  // del promedio, pero se dice cuántas (con el cruce SAP ↔ PLC real puede haber).
  const filas = candidatas.map(o => ({ o, total: indisponibilidadH(o.evento!) })).filter((x): x is { o: OrdenSap; total: number } => x.total !== undefined && x.total > 0)
  const excluidas = candidatas.length - filas.length
  if (!filas.length) return { fallas: 0, excluidas }
  const total = filas.reduce((a, x) => a + x.total, 0), activa = filas.reduce((a, x) => a + Math.min(x.o.horasReales, x.total), 0)
  return { fallas: filas.length, excluidas, totalH: total / filas.length, activaH: activa / filas.length, esperaH: (total - activa) / filas.length }
}
