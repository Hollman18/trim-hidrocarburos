/** EL PANEL DE INDICADORES A MEDIDA (Fase 7 de docs/experiencia-v3/PROMPT-FACILIDADES-POR-FASES.md, pieza Núcleo).
 *
 *  El gerente, producción y confiabilidad arman su panel con indicadores del catálogo y con cualquier señal
 *  ya conectada. Cada indicador tiene su fórmula y su fuente, y un núcleo puro que la prueba compara con un
 *  caso calculado a mano (`scripts/verificar-indicadores.mjs`). El adaptador de cada uno le pasa los datos del
 *  motor: el libro, el historial de fallas, las órdenes de SAP, los cortes de servicio y la generación.
 *
 *  Un indicador sin dato dice «sin dato» y por qué; nunca un cero que no se midió.
 *
 *  Contrato: `GET /api/indicadores/catalogo`, `GET /api/vistas/panel`, `GET /api/vistas/panel/senales` y
 *  `POST /api/paneles` (CONTRATO.md). */
import { EQUIPOS, equipoEnCampo } from './equipos'
import { pozosDe, serviciosDeCampo } from './pozos'
import { perfilBomba } from './bombas'
import { libro, historialDeEquipo } from './libro'
import { historiaSap, horasPorClase, type OrdenSap } from './sap'
import { TIPO_CAUSA, type TipoCausa, type Contexto } from './causa-senal'
import { senalDe, type TendenciaNivel3 } from './equipos-tecnico'
import { margenN1, fraseMargen, FALTA_TABLA, type TablaGeneracion } from './arranque'
import { campoPorId } from './campos'
import { piezasDeCampo, NOMBRE_PIEZA, type PiezaTrim } from './piezas-trim'
import type { Rechazo } from './evento-planta'

const H = 3_600_000

/* ─────────────────────────── el catálogo ─────────────────────────── */

export type IdIndicador = 'diferido-por-causa' | 'mtbf' | 'mttr' | 'horas-proactivas' | 'cortes-energia' | 'margen-n1'

export interface Indicador {
  id: IdIndicador
  nombre: string
  /** La pregunta que contesta, en una línea. */
  pregunta: string
  formula: string
  fuente: string
  /** La ventana, escrita. */
  ventana: string
}

/** Meses de cada ventana (con el mes en curso). */
export const MESES_DIFERIDO = 6
export const MESES_MANTENIMIENTO = 12

export const CATALOGO: readonly Indicador[] = [
  { id: 'diferido-por-causa', nombre: 'Diferido por causa', pregunta: '¿Qué se está llevando los barriles, mes a mes?',
    formula: 'Por mes, la suma de los barriles diferidos de cada tramo del libro, agrupados por el tipo de su causa. Las 4 causas que más suman van aparte; las demás, juntas en «Otras»',
    fuente: 'El libro de diferidos de TRIM (los tramos con su causa, de la señal de los equipos y lo que respondió el campo)', ventana: `${MESES_DIFERIDO} meses, con el mes en curso` },
  { id: 'mtbf', nombre: 'MTBF de la flota', pregunta: '¿Cada cuánto falla un equipo de alto impacto?',
    formula: 'Σ días de historia de cada equipo ÷ Σ fallas. Equipos: las bombas de agua y multifásicas con perfil y las electrosumergibles del campo. Los disparos de la electrosumergible no cuentan como falla. Con menos de 2 fallas no se calcula',
    fuente: 'El historial de fallas de TRIM (las paradas del PLC con la causa en el propio equipo); ISO 14224 para qué es una falla', ventana: 'Toda la historia que hay' },
  { id: 'mttr', nombre: 'MTTR (reparación activa)', pregunta: '¿Cuánto tarda la reparación en sí, sin contar la espera?',
    formula: 'Promedio de las horas confirmadas de las órdenes correctivas (PM01) con cierre técnico (TECO) en la ventana. Es la reparación activa: la espera del repuesto y los permisos no entran',
    fuente: 'Las órdenes de SAP PM (horas reales confirmadas); ISO 14224 para la reparación activa', ventana: `${MESES_MANTENIMIENTO} meses` },
  { id: 'horas-proactivas', nombre: 'Horas preventivo y predictivo contra correctivo', pregunta: '¿Qué parte del mantenimiento se hace antes de que falle?',
    formula: 'Horas de órdenes PM02 (preventivo) + PM03 (predictivo) ÷ (esas + las de PM01, correctivo) × 100, por la fecha de cierre',
    fuente: 'Las órdenes de SAP PM (horas reales confirmadas)', ventana: `${MESES_MANTENIMIENTO} meses` },
  { id: 'cortes-energia', nombre: 'Cortes de energía por mes', pregunta: '¿Cuántas veces se fue la energía y cuánto duró?',
    formula: 'Por mes, los disparos del relé de la subestación (el servicio «energía» que cae), por la fecha en que empezaron; las horas, de cada disparo hasta que volvió',
    fuente: 'El relé del interruptor de llegada (IEC 61850 o DNP3), conectado por el gateway', ventana: `${MESES_MANTENIMIENTO} meses` },
  { id: 'margen-n1', nombre: 'Margen N-1 de la generación', pregunta: 'Si se cae la unidad más cargada, ¿alcanza la reserva?',
    formula: 'Lo que falta = lo mayor entre la carga de la unidad más cargada − la reserva rápida de las demás (lo libre de cada una sin pasar su escalón) y la carga total − la capacidad de las demás. Si falta, qué soltar primero: lo que menos crudo da por kW',
    fuente: 'La tabla de generación y de cargas (del PMS o del ingeniero eléctrico) y el crudo de cada pozo de TRIM; ISO 8528-5 para el escalón', ventana: 'Ahora' },
]
export const indicadorPorId = (id: string): Indicador | undefined => CATALOGO.find(i => i.id === id)

/** La pieza de la que sale cada indicador (Fase 1). El panel es del Núcleo; un indicador de una pieza que el
 *  campo no contrató dice «sin dato» y la nombra. */
export const PIEZA_DE_INDICADOR: Readonly<Record<IdIndicador, PiezaTrim>> = {
  'diferido-por-causa': 'barriles', mtbf: 'equipos', mttr: 'mantenimiento', 'horas-proactivas': 'mantenimiento', 'cortes-energia': 'energia', 'margen-n1': 'energia',
}

/* ─────────────────────────── el valor de cada elemento ─────────────────────────── */

export interface PeriodoIndicador { clave: string; rotulo: string; segundo?: string; valores: number[]; total: number }

export type ValorIndicador =
  | { forma: 'cifra'; valor: number; unidad: string; decimales: number; nota: string }
  | { forma: 'columnas'; partes: string[]; periodos: PeriodoIndicador[]; unidad: string; nota: string }
  | { forma: 'tendencia'; senal: TendenciaNivel3; desde: string; hasta: string; valor: number | null; nota: string }
  | { forma: 'sin-dato'; motivo: string }

/* ─────────────────────────── los meses ─────────────────────────── */

const MES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic']
const MES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export interface MesVentana { clave: string; rotulo: string; segundo?: string; desde: number; hasta: number }

/** Los últimos `n` meses hasta `t` (hora de Bogotá), el último en curso (hasta `t`). */
export function mesesHasta(t: number, n: number): MesVentana[] {
  const co = new Date(t - 5 * H)
  const y = co.getUTCFullYear(), m = co.getUTCMonth()
  return Array.from({ length: n }, (_, i) => {
    const k = i - n + 1
    const d = new Date(Date.UTC(y, m + k, 1))
    const anio = d.getUTCFullYear(), mes = d.getUTCMonth()
    const desde = Date.UTC(anio, mes, 1, 5)
    const hasta = Math.min(Date.UTC(anio, mes + 1, 1, 5), t)
    return { clave: `${anio}-${String(mes + 1).padStart(2, '0')}`, rotulo: MES_CORTO[mes]!, ...(i === 0 || mes === 0 ? { segundo: String(anio) } : {}), desde, hasta }
  })
}
const nombreMes = (m: MesVentana) => `${MES_LARGO[Number(m.clave.slice(5)) - 1]} ${m.clave.slice(0, 4)}`

/* ─────────────────────────── los núcleos (probados a mano) ─────────────────────────── */

/** Diferido por causa y mes: las `max` causas que más suman, y las demás juntas en «Otras». */
export function porCausaYMes(filas: ReadonlyArray<{ mes: string; causa: string; bbl: number }>, meses: readonly string[], max = 4) {
  const total = new Map<string, number>()
  for (const f of filas) total.set(f.causa, (total.get(f.causa) ?? 0) + f.bbl)
  const orden = [...total].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k]) => k)
  // Con una sola de más no hace falta «Otras»: va con su nombre.
  const aparte = orden.length <= max + 1 ? orden : orden.slice(0, max)
  const otras = orden.length > aparte.length
  const partes = [...aparte, ...(otras ? ['Otras'] : [])]
  const parteDe = (causa: string) => (aparte.includes(causa) ? causa : 'Otras')
  const periodos = meses.map(mes => {
    const valores = partes.map(() => 0)
    for (const f of filas) if (f.mes === mes && f.bbl > 0 && partes.includes(parteDe(f.causa))) valores[partes.indexOf(parteDe(f.causa))]! += f.bbl
    return { mes, valores, total: valores.reduce((a, b) => a + b, 0) }
  })
  return { partes, periodos, total: periodos.reduce((a, p) => a + p.total, 0) }
}

/** MTBF de una flota: Σ días de historia ÷ Σ fallas. Con menos de 2 fallas, undefined. */
export function mtbfFlota(equipos: ReadonlyArray<{ dias: number; fallas: number }>): { dias: number; fallas: number; equipos: number } | undefined {
  const fallas = equipos.reduce((a, e) => a + e.fallas, 0)
  if (fallas < 2) return undefined
  return { dias: equipos.reduce((a, e) => a + e.dias, 0) / fallas, fallas, equipos: equipos.length }
}

/** MTTR de reparación activa: promedio de horas de las PM01 con cierre técnico en [desde, hasta). */
export function mttrActivo(ordenes: readonly OrdenSap[], desde: number, hasta: number): { horas: number; ordenes: number } | undefined {
  const xs = ordenes.filter(o => o.clase === 'PM01' && o.estado === 'TECO' && o.cierreTecnico)
    .filter(o => { const t = Date.parse(o.cierreTecnico!); return t >= desde && t < hasta })
  if (!xs.length) return undefined
  return { horas: xs.reduce((a, o) => a + o.horasReales, 0) / xs.length, ordenes: xs.length }
}

/** Cortes de energía por mes: cuántos empezaron en cada mes y cuántas horas duraron (hasta que volvió, o
 *  hasta `t` si sigue caído). */
export function cortesPorMes(eventos: ReadonlyArray<{ tipo: string; inicio: string; fin: string | null }>, meses: readonly MesVentana[], t: number) {
  const energia = eventos.filter(e => e.tipo === 'energia')
  const periodos = meses.map(m => {
    const del = energia.filter(e => { const a = Date.parse(e.inicio); return a >= m.desde && a < m.hasta })
    return { clave: m.clave, cortes: del.length, horas: del.reduce((a, e) => a + ((e.fin ? Date.parse(e.fin) : t) - Date.parse(e.inicio)) / H, 0) }
  })
  return { periodos, cortes: periodos.reduce((a, p) => a + p.cortes, 0), horas: periodos.reduce((a, p) => a + p.horas, 0) }
}

/* ─────────────────────────── los adaptadores ─────────────────────────── */

const n0 = (v: number) => Math.round(v).toLocaleString('es-CO')
const n1 = (v: number) => v.toLocaleString('es-CO', { maximumFractionDigits: 1 })

/** La tabla de generación de un campo. Ningún campo del demo la tiene (Fase 6). */
export const tablaGeneracionDe = (_campoId: string): TablaGeneracion | undefined => undefined

/** Los equipos de alto impacto de un campo: las bombas con perfil y las electrosumergibles. */
function altoImpacto(campoId: string): string[] {
  const bombas = Object.keys(EQUIPOS).filter(id => perfilBomba(id, campoId))
  const esp = pozosDe(campoId).filter(p => p.levantamiento === 'electrosumergible').map(p => p.id)
  return [...bombas, ...esp]
}

const ordenesDe = (campoId: string, ctx: Contexto) => historiaSap(ctx).ordenes.filter(o => o.campoId === campoId)

export function valorIndicador(id: IdIndicador, campoId: string, ctx: Contexto, t: number): ValorIndicador {
  switch (id) {
    case 'diferido-por-causa': {
      const meses = mesesHasta(t, MESES_DIFERIDO)
      const filas = meses.flatMap(m => libro([campoId], new Date(m.desde), new Date(m.hasta), ctx).porTipo
        .map(x => ({ mes: m.clave, causa: TIPO_CAUSA[x.tipo as TipoCausa] ?? x.tipo, bbl: x.bbl })))
      const r = porCausaYMes(filas, meses.map(m => m.clave))
      if (!(r.total > 0)) return { forma: 'sin-dato', motivo: `Sin barriles diferidos en ${nombreMes(meses[0]!)} a ${nombreMes(meses.at(-1)!)}.` }
      return { forma: 'columnas', partes: r.partes, unidad: 'bbl',
        periodos: r.periodos.map((p, i) => ({ clave: p.mes, rotulo: meses[i]!.rotulo, ...(meses[i]!.segundo ? { segundo: meses[i]!.segundo } : {}), valores: p.valores, total: p.total })),
        nota: `${n0(r.total)} bbl en ${MESES_DIFERIDO} meses; ${nombreMes(meses.at(-1)!)} va en curso.` }
    }
    case 'mtbf': {
      const eqs = altoImpacto(campoId)
      if (!eqs.length) return { forma: 'sin-dato', motivo: 'El campo no tiene equipos de alto impacto con historial.' }
      const r = mtbfFlota(eqs.map(e => { const h = historialDeEquipo(campoId, e, ctx); return { dias: h.dias, fallas: h.fallas } }))
      if (!r) return { forma: 'sin-dato', motivo: 'Menos de 2 fallas en la historia: no hay promedio que valga.' }
      return { forma: 'cifra', valor: r.dias, unidad: 'días', decimales: 0, nota: `${r.fallas} fallas en ${r.equipos} equipos de alto impacto.` }
    }
    case 'mttr': {
      const ms = mesesHasta(t, MESES_MANTENIMIENTO)
      const r = mttrActivo(ordenesDe(campoId, ctx), ms[0]!.desde, t)
      if (!r) return { forma: 'sin-dato', motivo: `Sin órdenes correctivas cerradas en ${MESES_MANTENIMIENTO} meses.` }
      return { forma: 'cifra', valor: r.horas, unidad: 'h', decimales: 1, nota: `Promedio de ${r.ordenes} ${r.ordenes === 1 ? 'orden correctiva' : 'órdenes correctivas'} cerradas en ${MESES_MANTENIMIENTO} meses.` }
    }
    case 'horas-proactivas': {
      const ms = mesesHasta(t, MESES_MANTENIMIENTO)
      const r = horasPorClase(ordenesDe(campoId, ctx), new Date(ms[0]!.desde), new Date(t))
      if (r.porcentaje === undefined) return { forma: 'sin-dato', motivo: `Sin horas confirmadas en SAP en ${MESES_MANTENIMIENTO} meses.` }
      return { forma: 'cifra', valor: r.porcentaje, unidad: '%', decimales: 0, nota: `${n0(r.proactivo)} h preventivo y predictivo contra ${n0(r.correctivo)} h correctivo, en ${MESES_MANTENIMIENTO} meses.` }
    }
    case 'cortes-energia': {
      // Sin el relé de la subestación conectado, un mes sin cortes no se distingue de un mes sin datos.
      const rele = Object.values(EQUIPOS).some(e => e.servicio === 'energia' && equipoEnCampo(e.id, campoId)?.instrumentado)
      if (!rele) return { forma: 'sin-dato', motivo: 'El relé de la subestación no está conectado en este campo.' }
      const meses = mesesHasta(t, MESES_MANTENIMIENTO)
      const r = cortesPorMes(serviciosDeCampo(campoId), meses, t)
      return { forma: 'columnas', partes: ['Cortes'], unidad: 'cortes',
        periodos: r.periodos.map((p, i) => ({ clave: p.clave, rotulo: meses[i]!.rotulo, ...(meses[i]!.segundo ? { segundo: meses[i]!.segundo } : {}), valores: [p.cortes], total: p.cortes })),
        nota: r.cortes ? `${r.cortes} ${r.cortes === 1 ? 'corte' : 'cortes'}, ${n1(r.horas)} h sin energía en ${MESES_MANTENIMIENTO} meses.` : `Ningún corte en ${MESES_MANTENIMIENTO} meses.` }
    }
    case 'margen-n1': {
      const tabla = tablaGeneracionDe(campoId)
      const m = tabla ? margenN1(tabla, t) : undefined
      if (!m) return { forma: 'sin-dato', motivo: tabla ? 'Con una sola unidad de generación no hay N-1 que calcular.' : FALTA_TABLA }
      return { forma: 'cifra', valor: m.alcanza ? m.reservaRapidaKw - m.cae.cargaKw : -m.faltaKw, unidad: 'kW', decimales: 0, nota: fraseMargen(m) }
    }
  }
}

/* ─────────────────────────── las señales ─────────────────────────── */

export interface SenalDisponible { campoId: string; equipo: string; nombreEquipo: string; tag: string; nombre: string; unidad: string }

/** Las señales conectadas de esos campos: cada variable continua con su serie. */
export function senalesDisponibles(campos: readonly string[]): SenalDisponible[] {
  return campos.flatMap(campoId => Object.keys(EQUIPOS).flatMap(id => {
    const eq = equipoEnCampo(id, campoId)
    if (!eq?.instrumentado) return []
    return eq.dispositivos.filter(d => typeof d.valor === 'number' && d.serie)
      .map(d => ({ campoId, equipo: id, nombreEquipo: eq.nombre, tag: d.tag, nombre: d.tipo, unidad: d.unidad }))
  }))
}

export function valorSenal(campoId: string, equipo: string, tag: string): ValorIndicador {
  const eq = equipoEnCampo(equipo, campoId)
  const d = eq?.instrumentado ? eq.dispositivos.find(x => x.tag === tag) : undefined
  if (!eq || !d?.serie) return { forma: 'sin-dato', motivo: `${tag} ya no está conectada en ${campoPorId(campoId).nombre}.` }
  const s = senalDe(campoId, d, eq.marcha === 'detenido')
  const desde = d.serie.desde
  const hasta = new Date(Date.parse(desde) + (d.serie.valores.length - 1) * d.serie.pasoH * H).toISOString()
  const parado = eq.marcha === 'detenido' ? ' El equipo está parado.' : ''
  // Sin límite firmado no hay escala que no se mueva: la cifra sí, la gráfica no (kit §1, H5).
  if (!s.escala) {
    if (s.valor === null) return { forma: 'sin-dato', motivo: `${tag} sin lectura.` }
    return { forma: 'cifra', valor: s.valor, unidad: s.unidad, decimales: s.decimales, nota: `Sin límite firmado: no se grafica (la escala sale de los límites, nunca de las lecturas).${parado}` }
  }
  return { forma: 'tendencia', senal: { tag: s.tag, nombre: s.nombre, unidad: s.unidad, serie: s.serie, escala: s.escala, banda: s.banda, alarmas: s.alarmas, decimales: s.decimales },
    desde, hasta, valor: s.valor, nota: `${s.limite ? `${s.limite}.` : ''}${parado}`.trim() }
}

/* ─────────────────────────── el panel ─────────────────────────── */

export type ElementoPanel =
  | { id: string; tipo: 'indicador'; indicador: IdIndicador; campoId: string }
  | { id: string; tipo: 'senal'; campoId: string; equipo: string; tag: string }

export interface PanelGuardado { elementos: ElementoPanel[]; actualizado: string; por: string }

export interface ElementoVista { elemento: ElementoPanel; titulo: string; campo: string; indicador?: Indicador; valor: ValorIndicador }
export interface VistaPanel {
  elementos: ElementoVista[]
  /** Sin panel guardado, el de ejemplo de su rol: se dice. */
  ejemplo: boolean
  actualizado?: string
}

export const MAX_ELEMENTOS = 12

/** El panel de ejemplo de cada rol, para que la primera vista muestre lo que hace. Se dice que es de ejemplo. */
export function panelDeEjemplo(rolId: string, campos: readonly string[]): ElementoPanel[] {
  const c = (pref: string) => (campos.includes(pref) ? pref : campos[0]!)
  const ind = (n: number, indicador: IdIndicador, campoId: string): ElementoPanel => ({ id: `ej${n}`, tipo: 'indicador', indicador, campoId })
  if (rolId === 'conf') return [ind(1, 'mtbf', c('ceiba')), ind(2, 'mttr', c('ceiba')), ind(3, 'horas-proactivas', c('ceiba')), ind(4, 'cortes-energia', c('morichal'))]
  if (rolId === 'prod') return [ind(1, 'diferido-por-causa', c('ceiba')), ind(2, 'cortes-energia', c('ceiba')), ind(3, 'margen-n1', c('ceiba'))]
  return [ind(1, 'diferido-por-causa', c('ceiba')), ind(2, 'horas-proactivas', c('ceiba')), ind(3, 'cortes-energia', c('morichal')), ind(4, 'margen-n1', c('ceiba'))]
}

export function vistaPanel(rolId: string, campos: readonly string[], guardado: PanelGuardado | undefined, ctx: Contexto, t: number): VistaPanel {
  const elementos = (guardado?.elementos ?? panelDeEjemplo(rolId, campos)).filter(e => campos.includes(e.campoId))
  return {
    ejemplo: !guardado, ...(guardado ? { actualizado: guardado.actualizado } : {}),
    elementos: elementos.map(e => {
      const campo = campoPorId(e.campoId).nombre
      if (e.tipo === 'indicador') {
        const ind = indicadorPorId(e.indicador)!
        const pieza = PIEZA_DE_INDICADOR[e.indicador]
        const valor: ValorIndicador = piezasDeCampo(ctx.config, e.campoId).has(pieza) ? valorIndicador(e.indicador, e.campoId, ctx, t)
          : { forma: 'sin-dato', motivo: `La pieza ${NOMBRE_PIEZA[pieza]} no está contratada en ${campo}.` }
        return { elemento: e, titulo: ind.nombre, campo, indicador: ind, valor }
      }
      const s = senalesDisponibles([e.campoId]).find(x => x.equipo === e.equipo && x.tag === e.tag)
      return { elemento: e, titulo: s ? `${s.nombre} de ${e.equipo}` : e.tag, campo, valor: valorSenal(e.campoId, e.equipo, e.tag) }
    }),
  }
}

/* ─────────────────────────── guardar ─────────────────────────── */

export interface QuienPanel { rol?: { id: string; nombre: string; pantallas: readonly string[] }; persona?: { nombre: string }; campos: readonly string[] }

const IDS = new Set<string>(CATALOGO.map(i => i.id))

/** `POST /api/paneles` `{ elementos }`: guarda el panel de quien llama, entero. Lo arma quien tiene la pantalla
 *  «Mi panel» (gerente, producción y confiabilidad), con sus campos y sus señales. */
export function aceptarPanel(c: { elementos?: unknown }, q: QuienPanel, hora: string): { ok: true; panel: PanelGuardado } | Rechazo {
  if (!q.rol?.pantallas.includes('panel')) return { ok: false, estado: 403, codigo: 'sin-pantalla', error: 'Su rol no arma panel de indicadores.' }
  const invalido = (error: string): Rechazo => ({ ok: false, estado: 422, codigo: 'panel-invalido', error })
  if (!Array.isArray(c.elementos)) return invalido('El panel trae una lista de elementos.')
  if (c.elementos.length > MAX_ELEMENTOS) return invalido(`El panel lleva como mucho ${MAX_ELEMENTOS} elementos.`)
  const vistos = new Set<string>()
  const elementos: ElementoPanel[] = []
  for (const x of c.elementos as Array<Record<string, unknown>>) {
    if (!x || typeof x !== 'object' || typeof x.id !== 'string' || !x.id || x.id.length > 40 || vistos.has(x.id)) return invalido('Cada elemento lleva un id propio.')
    vistos.add(x.id)
    if (typeof x.campoId !== 'string' || !q.campos.includes(x.campoId)) return { ok: false, estado: 404, codigo: 'campo-ajeno', error: 'No tiene asignado ese campo.' }
    if (x.tipo === 'indicador') {
      if (typeof x.indicador !== 'string' || !IDS.has(x.indicador)) return invalido('Ese indicador no está en el catálogo.')
      elementos.push({ id: x.id, tipo: 'indicador', indicador: x.indicador as IdIndicador, campoId: x.campoId })
    } else if (x.tipo === 'senal') {
      if (typeof x.equipo !== 'string' || typeof x.tag !== 'string' || !senalesDisponibles([x.campoId]).some(s => s.equipo === x.equipo && s.tag === x.tag))
        return invalido('Esa señal no está conectada en ese campo.')
      elementos.push({ id: x.id, tipo: 'senal', campoId: x.campoId, equipo: x.equipo, tag: x.tag })
    } else return invalido('Un elemento es un «indicador» o una «senal».')
  }
  return { ok: true, panel: { elementos, actualizado: hora, por: `${q.persona?.nombre ?? 'sin nombre'} · ${q.rol.nombre}` } }
}
