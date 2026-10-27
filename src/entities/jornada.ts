/** LA JORNADA DEL SUPERVISOR (A2 · necesario-por-rol §0c).
 *
 *  El supervisor necesita ver en qué jornada (turno y horario) empezó y terminó
 *  cada parada: es la base de su entrega de turno y es regulatoria (la Circular
 *  024 pide `h_ini_paro` y `h_fin_paro` de cada parada, con el corte del día a
 *  las 23:59:59).
 *
 *  - **El horario** es del campo: las horas de cambio de turno (`ConfigCampo.turnos`,
 *    «06:00» y «18:00»), firmadas por el administrador. Sin firma rige
 *    `TURNOS_POR_DEFECTO` y la vista lo dice («horario por defecto, sin firmar»).
 *    Una jornada va de un cambio de turno al siguiente, en hora de Colombia.
 *  - **Las paradas de la jornada** son las de las filas de la ANH que tienen
 *    alguna hora dentro (`filasDelChoke`, la MISMA fila de todas las vistas):
 *    las que empezaron, siguen o terminaron en ella. Cada una, con la hora en
 *    que empezó el evento y la de su fin (o «sigue»), su cadena (dónde se trabó,
 *    diferida, planeada o no, causa y detalle) y sus barriles en la jornada.
 *  - **Los números de arriba:** las paradas por confirmar (la misma cuenta de
 *    Hoy: eventos con alguna fila sin confirmar) y los barriles diferidos en la
 *    jornada, con la regla de redondeo (`enterosDelPeriodo` del campo en la
 *    ventana de la jornada: la raíz una vez y cada evento su parte). La pérdida
 *    de la jornada va aparte, del registro (`perdidas.ts`), o «sin registro».
 *
 *  Contrato: `GET /api/vistas/jornada?campo&jornada=actual|anterior` (`vistaJornada`).
 *  D7: se guarda en memoria por contexto, lo guardado, los registros, el campo y la jornada. */
import type { Contexto } from './causa-senal'
import type { Config } from './configuracion'
import { TURNOS_POR_DEFECTO } from './configuracion'
import { filasDelChoke, filaEnPeriodo, bblEnPeriodo, tramoVigente, type OpcionesReparto } from './choke-reparto'
import { enterosDelPeriodo } from './redondeo'
import { perdidasDelPeriodo, isoCo, type RegistroPerdida } from './perdidas'
import { NOMBRE_TRAMO_VIVO } from './planta-viva'
import { ETIQUETA_PLANEACION, textoN1, textoN2, esCodigoN2Conocido, CLAVES_N1, type ClaveN1, type PasoAnh } from './anh-catalogo'
import type { ChokeOSinAsignar } from './choke'
import type { EstadoParadaAnh } from './anh-paradas'
import { eventosDeCampo } from './pozos'
import { campoPorId } from './campos'
import { AHORA } from './reloj'

const H = 3_600_000, D = 86_400_000, COT = 5 * H

/** Cuál jornada: la que corre ahora o la que acaba de entregarse. */
export type CualJornada = 'actual' | 'anterior'
export const JORNADAS: readonly CualJornada[] = ['actual', 'anterior']
export const esJornada = (x: unknown): x is CualJornada => x === 'actual' || x === 'anterior'

/** Las horas de cambio de turno de un campo: las firmadas o las de por defecto. */
export function turnosDe(config: Config, campoId: string): { turnos: string[]; firmada: boolean } {
  const t = Object.hasOwn(config.campos, campoId) ? config.campos[campoId]!.turnos : undefined
  return t?.length ? { turnos: [...t].sort(), firmada: true } : { turnos: [...TURNOS_POR_DEFECTO], firmada: false }
}

/** Una jornada de un campo: de un cambio de turno al siguiente. */
export interface Jornada {
  campoId: string
  cual: CualJornada
  desde: Date
  hasta: Date
  /** «De 06:00 a 18:00 del 2 de oct». */
  nombre: string
  turnos: string[]
  /** Las horas las firmó el administrador; si no, son las de por defecto y se dice. */
  firmada: boolean
  /** Todavía no termina (es la de ahora). */
  enCurso: boolean
}

const minutos = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))
const horaCo = (t: number) => new Date(t - COT).toISOString().slice(11, 16)
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic']
const diaCorto = (t: number) => { const d = new Date(t - COT); return `${d.getUTCDate()} de ${MES[d.getUTCMonth()]}` }

/** La jornada que contiene `t` (o la anterior), con las horas del campo. */
export function jornadaDe(config: Config, campoId: string, cual: CualJornada = 'actual', ahora: number = AHORA.getTime()): Jornada {
  const { turnos, firmada } = turnosDe(config, campoId)
  const ms = turnos.map(minutos).sort((a, b) => a - b)
  const dia = Math.floor((ahora - COT) / D) * D + COT
  // Los cambios de turno de ayer, hoy y mañana, en orden: la jornada es el tramo entre dos.
  const cambios = [-1, 0, 1].flatMap(k => ms.map(m => dia + k * D + m * 60_000))
  let i = cambios.findLastIndex(c => c <= ahora)
  if (cual === 'anterior') i -= 1
  const desde = cambios[i]!, hasta = cambios[i + 1]!
  const nombre = `De ${horaCo(desde)} a ${horaCo(hasta)} del ${diaCorto(desde)}`
  return { campoId, cual, desde: new Date(desde), hasta: new Date(hasta), nombre, turnos, firmada, enCurso: hasta > ahora }
}

/* ───────────────────────────── la vista ───────────────────────────── */

/** Un paso de la cadena con lo que dice y quién lo dijo. */
export interface PasoDeLaCadena {
  paso: PasoAnh
  valor: string | null
  texto: string
  /** Quién lo dijo y cuándo, si fue una persona (D1); si no, lo propone TRIM. */
  por?: string
  hora?: string
  procedencia?: string
}

/** Una parada de la jornada: un evento de un pozo. */
export interface ParadaDeJornada {
  eventoId: string
  pozo: string
  /** El equipo de la causa (el pozo mismo, la bomba, el servicio). */
  equipo: string
  /** Cuándo empezó el evento y cuándo terminó; `fin` null = sigue. Hora de Colombia con su zona. */
  inicio: string
  fin: string | null
  /** En la jornada: empezó, terminó, sigue. */
  empezo: boolean
  termino: boolean
  sigue: boolean
  /** «Empezó 07:12 · sigue», «Venía del 1 de oct, 22:40 · terminó 09:05». */
  cuando: string
  tramo: ChokeOSinAsignar
  tramoNombre: string
  /** El paso 3 de la circular: una parada siempre es diferida; la pérdida va en su registro. */
  impacto: 'diferida'
  /** Los 6 pasos que rigen, con quién dijo cada uno. */
  cadena: PasoDeLaCadena[]
  /** El estado más atrasado de sus filas en la jornada (`por-confirmar` si alguna no está confirmada). */
  estado: EstadoParadaAnh
  porConfirmar: boolean
  /** Los barriles diferidos en la jornada, exactos y enteros (Σ enteros = `diferido.entero`). */
  bbl: number
  bblEntero: number
  /** Las filas de la ANH que la componen en la jornada (`ParadaAnh.id`). */
  filas: string[]
}

export interface VistaJornada {
  campoId: string
  jornada: Jornada
  /** Eventos con alguna fila sin confirmar: la misma cuenta del supervisor en Hoy. */
  porConfirmar: number
  /** Diferido en la jornada: exacto y entero (la raíz, una vez). */
  diferido: { exacto: number; entero: number }
  /** Pérdida registrada en la jornada; null = sin registro (nunca 0). */
  perdido: { exacto: number; entero: number } | null
  /** De la que empezó primero a la última. */
  paradas: ParadaDeJornada[]
  /** «De 06:00 a 18:00 del 2 de oct: 4 paradas por confirmar y 120 bbl diferidos.» */
  frase: string
  /** «Horario por defecto, sin firmar» si el administrador no firmó el cambio de turno. */
  nota?: string
}

export interface OpcionesJornada extends OpcionesReparto {
  /** El registro de pérdidas (las que rigen salen de aquí). */
  perdidas?: readonly RegistroPerdida[]
  /** Para probar con otra hora; por defecto, la del sistema. */
  ahora?: number
}

const PASOS_CADENA: readonly PasoAnh[] = ['responsable', 'choke', 'impacto', 'planeacion', 'n1', 'n2']
const ORDEN_ESTADO: Record<EstadoParadaAnh, number> = { pendiente: 0, 'por-precisar': 1, propuesta: 2, confirmada: 3 }

function textoPaso(paso: PasoAnh, v: string | undefined): string {
  if (v === undefined) return 'Falta'
  switch (paso) {
    case 'choke': return Object.hasOwn(NOMBRE_TRAMO_VIVO, v) ? NOMBRE_TRAMO_VIVO[v as keyof typeof NOMBRE_TRAMO_VIVO] : v
    case 'impacto': return v === 'perdida' ? 'Pérdida' : 'Diferida'
    case 'planeacion': return Object.hasOwn(ETIQUETA_PLANEACION, v) ? ETIQUETA_PLANEACION[v as keyof typeof ETIQUETA_PLANEACION] : v
    case 'n1': return (CLAVES_N1 as readonly string[]).includes(v) ? textoN1(v as ClaveN1) : v
    case 'n2': return esCodigoN2Conocido(v) ? textoN2(v) : v
    default: return v
  }
}

const SIN = {}
const GUARDADO = new WeakMap<Contexto, WeakMap<object, WeakMap<object, Map<string, VistaJornada>>>>()
const FMT_N0 = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })

/** `GET /api/vistas/jornada?campo&jornada=actual|anterior`. */
export function vistaJornada(q: { campo: string; jornada: CualJornada }, ctx: Contexto, op: OpcionesJornada = {}): VistaJornada {
  if (!esJornada(q.jornada)) throw new Error(`«${String(q.jornada)}» no es una jornada: ${JORNADAS.join(' o ')}.`)
  let porG = GUARDADO.get(ctx)
  if (!porG) GUARDADO.set(ctx, porG = new WeakMap())
  const kg = (op.guardadas ?? SIN) as object, kp = (op.perdidas ?? SIN) as object
  let porP = porG.get(kg)
  if (!porP) porG.set(kg, porP = new WeakMap())
  let m = porP.get(kp)
  if (!m) porP.set(kp, m = new Map())
  const ahora = op.ahora ?? AHORA.getTime()
  const clave = `${q.campo}|${q.jornada}|${ahora}`
  const ya = m.get(clave)
  if (ya) return ya
  const v = calcular(q.campo, q.jornada, ctx, op, ahora)
  m.set(clave, v)
  return v
}

function calcular(campoId: string, cual: CualJornada, ctx: Contexto, op: OpcionesJornada, ahora: number): VistaJornada {
  const j = jornadaDe(ctx.config, campoId, cual, ahora)
  const d0 = j.desde.getTime(), hh = Math.min(j.hasta.getTime(), ahora)
  const filas = filasDelChoke([campoId], j.desde, j.hasta, ctx, op.guardadas).filter(p => p.campoId === campoId && filaEnPeriodo(p, d0, hh))
  const en = enterosDelPeriodo(campoId, j.desde, j.hasta, ctx, op.guardadas ? { guardadas: op.guardadas } : {})
  const eventos = new Map(eventosDeCampo(campoId).map(e => [e.id, e]))
  const porEvento = new Map<string, typeof filas>()
  for (const p of filas) { const g = porEvento.get(p.eventoId); if (g) g.push(p); else porEvento.set(p.eventoId, [p]) }
  const paradas: ParadaDeJornada[] = [...porEvento].map(([eventoId, fs]) => {
    const ultima = fs.at(-1)!
    const ev = eventos.get(eventoId)
    const ini = Date.parse(ev?.inicio ?? ultima.inicioEvento)
    const finEv = ev ? (ev.fin === null ? null : Date.parse(ev.fin)) : null
    const sigue = finEv === null || finEv > ahora
    const empezo = ini >= d0 && ini < hh, termino = !sigue && finEv! >= d0 && finEv! < j.hasta.getTime()
    const deOtroDia = Math.floor((ini - COT) / D) !== Math.floor((d0 - COT) / D)
    const cuando = `${empezo ? `Empezó ${horaCo(ini)}` : `Venía ${deOtroDia ? `del ${diaCorto(ini)}, ` : 'de las '}${horaCo(ini)}`} · ${sigue ? 'sigue' : termino ? `terminó ${horaCo(finEv!)}` : `terminó ${diaCorto(finEv!)}, ${horaCo(finEv!)}`}`
    const c = ultima.clasificacion
    const cadena = PASOS_CADENA.map((paso): PasoDeLaCadena => {
      const d = c[paso]
      const valor = d ? String(d.valor) : paso === 'choke' && tramoVigente(ultima) !== 'sin-asignar' ? tramoVigente(ultima) : null
      return {
        paso, valor, texto: textoPaso(paso, valor ?? undefined),
        ...(d?.por ? { por: d.por } : {}), ...(d?.hora ? { hora: d.hora } : {}), ...(d ? { procedencia: d.procedencia } : {}),
      }
    })
    const estado = fs.map(f => f.estado).sort((a, b) => ORDEN_ESTADO[a] - ORDEN_ESTADO[b])[0]!
    const tramo = tramoVigente(ultima)
    return {
      eventoId, pozo: ultima.pozo, equipo: ultima.causa.equipo,
      inicio: ultima.inicioEvento, fin: sigue ? null : isoCo(finEv!),
      empezo, termino, sigue, cuando, tramo, tramoNombre: tramo === 'sin-asignar' ? 'Sin identificar' : NOMBRE_TRAMO_VIVO[tramo],
      impacto: 'diferida' as const, cadena, estado, porConfirmar: fs.some(f => f.estado !== 'confirmada'),
      bbl: fs.reduce((a, f) => a + bblEnPeriodo(f, d0, hh), 0), bblEntero: en.porEvento[eventoId] ?? 0, filas: fs.map(f => f.id),
    }
  }).sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio) || a.pozo.localeCompare(b.pozo))
  const porConfirmar = paradas.filter(p => p.porConfirmar).length
  const per = perdidasDelPeriodo([campoId], j.desde, new Date(hh), op.perdidas ?? []).porCampo.get(campoId)
  const perdido = per ? { exacto: per.exacto, entero: per.entero } : null
  const nombreCampo = campoPorId(campoId).nombre
  const frase = `${nombreCampo}, ${j.nombre.charAt(0).toLowerCase()}${j.nombre.slice(1)}: ${porConfirmar === 0 ? 'nada por confirmar' : `${porConfirmar} ${porConfirmar === 1 ? 'parada' : 'paradas'} por confirmar`} y ${FMT_N0.format(en.raiz)} bbl diferidos${perdido ? `; ${FMT_N0.format(perdido.entero)} bbl perdidos, aparte` : ''}.`
  return {
    campoId, jornada: j, porConfirmar, diferido: { exacto: en.exacto, entero: en.raiz }, perdido, paradas, frase,
    ...(j.firmada ? {} : { nota: `Horario por defecto, sin firmar: cambio de turno a las ${j.turnos.join(' y ')}.` }),
  }
}
