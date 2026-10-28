/* EL HISTORIAL DEL DIFERIDO Y DEL PERDIDO (el dueño, 28-oct: «un gráfico de historial de diferidos y
 * pérdidas para los cargos claves»).
 *
 * Mes a mes (ger, prod, jefe, conf): los 13 meses del calendario, cada uno con su diferido repartido por
 * tramo del choke (yacimiento, pozos, planta, salida y lo sin identificar) y su perdido APARTE: nunca se
 * suman. Turno a turno (sup): sus últimas jornadas, con el diferido y el perdido de cada una.
 *
 * Todo sale del balance (`balance.ts`): las cifras de cada período son las mismas del bloque «Producido ·
 * diferido · perdido» con ese período, así que cuadran con él por construcción. Lo que el motor decide aquí
 * es solo el máximo de cada mes (el máximo firmado de diferido por día × los días del mes, del libro) y si
 * el mes, ya cerrado, lo pasó (`sobre`): la pantalla lo pinta (rojo pálido si lo pasó, verde pálido si no),
 * no lo calcula. Sin máximo firmado, `sobre` es null y no se pinta. Sin registro de pérdidas, `perdido` es
 * null, nunca 0. */
import type { Contexto } from './causa-senal'
import { balance, NOMBRE_TRAMO_BALANCE, type CifraBalance, type OpcionesBalance } from './balance'
import { calendario, libro, conMeta } from './libro'
import { jornadaDe, type Jornada } from './jornada'
import { AHORA } from './reloj'
import { isoCo } from './perdidas'
import type { ChokeOSinAsignar } from './choke'

export const REGLA_HISTORIAL = 'historial@1'
/** Cuántas jornadas mira el supervisor hacia atrás (la de ahora incluida): una semana de turnos de 12 h. */
export const JORNADAS_DEL_HISTORIAL = 14

export type PorHistorial = 'mes' | 'turno'
export const esPorHistorial = (x: unknown): x is PorHistorial => x === 'mes' || x === 'turno'

export interface ConsultaHistorial {
  campos: string[]
  /** `mes` (por defecto): los meses del calendario. `turno`: las últimas jornadas, de UN campo. */
  por?: PorHistorial
}

export interface TramoDelHistorial {
  tramo: ChokeOSinAsignar
  nombre: string
  /** Diferido entero del tramo en el período (Σ de los tramos = `diferido.entero`). */
  diferido: number
}

export interface PeriodoDelHistorial {
  /** «2026-09» en un mes; la hora ISO de inicio, con zona, en un turno. */
  clave: string
  /** En el eje: «sept» o «6 h» (la hora en que empieza el turno). */
  rotulo: string
  /** El segundo renglón del eje, donde hace falta: el año (en el primer mes y en enero) o el día del turno. */
  segundo?: string
  /** «Septiembre 2026», «De 06:00 a 18:00 del 2 de oct». */
  nombre: string
  desde: Date
  hasta: Date
  /** El mes o el turno de ahora: todavía no termina. */
  enCurso: boolean
  diferido: CifraBalance
  porTramo: TramoDelHistorial[]
  /** null = sin registro de pérdidas en el período. */
  perdido: CifraBalance | null
  /** El máximo firmado del período en bbl (diferido por día × días); null sin meta firmada (o en un turno). */
  maximo: number | null
  /** Un mes cerrado que pasó su máximo: true; que no lo pasó: false; sin máximo o en curso: null. */
  sobre: boolean | null
}

export interface VistaHistorial {
  campos: string[]
  por: PorHistorial
  periodos: PeriodoDelHistorial[]
  /** Algún período tiene pérdidas registradas (si no, la pantalla dice «sin registro» una vez). */
  conPerdido: boolean
  /** Los tramos que tienen diferido en algún período, en el orden de la tubería (la leyenda). */
  tramos: Array<{ tramo: ChokeOSinAsignar; nombre: string }>
  /** «13 meses · 9 sobre el máximo firmado · perdido: sin registro». */
  frase: string
  regla: typeof REGLA_HISTORIAL
}

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic']
const MES_LARGO = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const COT = 5 * 3_600_000
const horaCo = (t: number) => new Date(t - COT).toISOString().slice(11, 16)
const diaCo = (t: number) => { const d = new Date(t - COT); return `${d.getUTCDate()} ${MES[d.getUTCMonth()]}` }

/** `ahora`: para las pruebas (por defecto, la hora fija del demo). */
export interface OpcionesHistorial extends OpcionesBalance { ahora?: number }

export function historial(q: ConsultaHistorial, ctx: Contexto, op: OpcionesHistorial = {}): VistaHistorial {
  const por = q.por ?? 'mes'
  if (!esPorHistorial(por)) throw new Error(`«${String(q.por)}» no es un historial: mes o turno.`)
  if (!q.campos.length) throw new Error('El historial pide al menos un campo.')
  if (por === 'turno' && q.campos.length !== 1) throw new Error('El historial por turno es de un solo campo: cada campo tiene sus horas de cambio de turno.')
  // Sin caché propio: cada período es un `balance` (que guarda lo suyo) y la costura guarda la respuesta.
  return por === 'mes' ? porMes(q.campos, ctx, op) : porTurno(q.campos[0]!, ctx, op)
}

/** Las cifras de un período del historial, del balance con ese período. */
function periodoDe(campos: string[], desde: Date, hasta: Date, ctx: Contexto, op: OpcionesBalance) {
  const b = balance({ campos, desde, hasta }, ctx, op)
  return {
    diferido: b.total.diferido,
    perdido: b.total.perdido,
    porTramo: b.total.porTramo.map((t): TramoDelHistorial => ({ tramo: t.tramo, nombre: t.nombre, diferido: t.diferido.entero })),
  }
}

function porMes(campos: string[], ctx: Contexto, op: OpcionesHistorial): VistaHistorial {
  const ahora = op.ahora ?? AHORA.getTime()
  const meses = calendario().filter(c => c.desde <= ahora)
  const periodos = meses.map((c, i): PeriodoDelHistorial => {
    const desde = new Date(c.desde), hasta = new Date(Math.min(c.hasta, ahora))
    const n = Number(c.mes.slice(5)) - 1
    // El mes de ahora, aunque el calendario lo corte en la última lectura: no se juzga contra su máximo.
    const enCurso = c.mes === new Date(ahora - COT).toISOString().slice(0, 7)
    const lb = libro(campos, desde, hasta, ctx)
    const dias = Math.max(1 / 24, lb.meta.dias)
    const maximo = conMeta(lb.meta) ? lb.meta.diferidoDia * dias : null
    const p = periodoDe(campos, desde, hasta, ctx, op)
    return {
      clave: c.mes, rotulo: MES[n]!, ...(i === 0 || n === 0 ? { segundo: c.mes.slice(0, 4) } : {}),
      nombre: `${MES_LARGO[n]} ${c.mes.slice(0, 4)}`, desde, hasta, enCurso, ...p,
      maximo, sobre: maximo === null || enCurso ? null : p.diferido.exacto > maximo,
    }
  })
  return armar(campos, 'mes', periodos)
}

function porTurno(campoId: string, ctx: Contexto, op: OpcionesHistorial): VistaHistorial {
  const ahora = op.ahora ?? AHORA.getTime()
  const jornadas: Jornada[] = []
  let t = ahora
  for (let k = 0; k < JORNADAS_DEL_HISTORIAL; k++) {
    const j = jornadaDe(ctx.config, campoId, 'actual', t)
    jornadas.unshift(j)
    t = j.desde.getTime() - 1
  }
  const periodos = jornadas.map((j, i): PeriodoDelHistorial => {
    const desde = j.desde, hasta = new Date(Math.min(j.hasta.getTime(), ahora))
    const p = periodoDe([campoId], desde, hasta, ctx, op)
    // La fecha va debajo del primer turno de cada día; el primero de la lista, solo si el siguiente es del mismo día
    // (si no, las dos fechas quedan pegadas: «25 sept26 sept»).
    const nuevoDia = i === 0 ? diaCo(desde.getTime()) === diaCo(jornadas[1]?.desde.getTime() ?? 0) : diaCo(desde.getTime()) !== diaCo(jornadas[i - 1]!.desde.getTime())
    return {
      // La hora ISO con su zona (como toda fecha del contrato): «2026-09-25T18:00:00-05:00».
      clave: isoCo(desde.getTime()), rotulo: `${Number(horaCo(desde.getTime()).slice(0, 2))} h`,
      ...(nuevoDia ? { segundo: diaCo(desde.getTime()) } : {}), nombre: j.nombre, desde, hasta, enCurso: j.enCurso, ...p,
      maximo: null, sobre: null,
    }
  })
  return armar([campoId], 'turno', periodos)
}

function armar(campos: string[], por: PorHistorial, periodos: PeriodoDelHistorial[]): VistaHistorial {
  const conPerdido = periodos.some(p => p.perdido !== null)
  const orden = periodos[0]?.porTramo.map(t => t.tramo) ?? []
  const tramos = orden.filter(k => periodos.some(p => (p.porTramo.find(t => t.tramo === k)?.diferido ?? 0) > 0))
    .map(k => ({ tramo: k, nombre: NOMBRE_TRAMO_BALANCE[k] }))
  const sobre = periodos.filter(p => p.sobre === true).length
  const conMax = periodos.some(p => p.maximo !== null)
  const frase = [
    por === 'mes' ? `${periodos.length} meses` : `${periodos.length} turnos`,
    conMax ? `${sobre} ${sobre === 1 ? 'mes' : 'meses'} sobre el máximo firmado` : '',
    conPerdido ? '' : 'perdido: sin registro',
  ].filter(Boolean).join(' · ')
  return { campos, por, periodos, conPerdido, tramos, frase, regla: REGLA_HISTORIAL }
}
