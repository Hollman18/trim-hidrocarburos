/** EL REPORTE A LA ANH (F2 · P-03; X4 §2 y §3.4, el inicio de regulatorio).
 *
 *  «¿El reporte pasa? Si no, ¿qué falta, quién lo debe y cuánto tiempo queda?»
 *  No clasifica nada nuevo: junta lo que el motor ya da.
 *  - Si se puede publicar: los motivos del libro (`libro`, la misma regla de
 *    «¿Se puede publicar?» de Resultados y Diferidos).
 *  - Las paradas del período que todavía no tienen causa: las filas de la ANH
 *    sin el paso 5 (la causa, N1), con lo que falta y la pregunta que lo resuelve
 *    (`paradasSinCausa`, anh-calidad.ts, sobre las filas de `filasDelChoke`).
 *  - Quién lo debe: el primer rol que contesta esa pregunta
 *    (`ROLES_QUE_CONTESTAN`); si alguien contestó «No sé», el supervisor.
 *  - La hora límite: el reporte diario del último día de la parada sale el día
 *    siguiente antes de las 07:00 (`HORA_REPORTE`, C24 p. 8-9).
 *  - Los barriles, con la regla de redondeo (`enterosDelPeriodo`, redondeo.ts):
 *    el entero de cada parada, que suma el total (LC-21 247 + LC-08 108 = 355).
 *
 *  D7: se guarda en memoria por contexto, lo guardado por las personas, campos y período. */
import type { Contexto } from './causa-senal'
import type { PasoAnh } from './anh-catalogo'
import { ROLES_QUE_CONTESTAN } from './anh-clasificacion'
import { paradasSinCausa, type ParadaSinCausa } from './anh-calidad'
import { filasDelChoke, filaEnPeriodo, bblEnPeriodo, type OpcionesReparto } from './choke-reparto'
import { enterosDelPeriodo } from './redondeo'
import { libro, calendario, type CodigoMotivo } from './libro'
import { HORA_REPORTE } from './hoy'
import { ROLES } from './roles'
import { AHORA, fechaCorta } from './reloj'

/** `GET /api/vistas/anh/reporte?campos=&desde=&hasta=`. */
export interface ConsultaReporteAnh { campos: string[]; desde: Date; hasta: Date }

/** Una parada sin causa, lista para la fila de la pantalla. */
export interface FaltaDeParada extends ParadaSinCausa {
  /** Sus barriles en el período, enteros (la regla de redondeo). */
  bbl: number
  /** Los mismos, exactos (el papel y la ANH). */
  exacto: number
  /** «faltan los 6 pasos», «falta la causa y el detalle». */
  falta: string
  /** Quién lo debe: el rol y su nombre. */
  debe: { rol: string; nombre: string }
  /** La hora límite del reporte que la lleva, con su zona («2026-10-03T07:00:00-05:00»). */
  limite: string
  /** Ya pasó esa hora. */
  vencido: boolean
  /** La hora límite en palabras: «mañana antes de las 07:00». */
  cuando: string
}

export interface VistaReporteAnh {
  campos: string[]
  /** «octubre», «septiembre», «1 de jul a 30 de sept». */
  periodo: string
  /** La misma regla de «¿Se puede publicar?»: el mes en curso no es una anomalía. */
  estado: 'publicable' | 'provisional' | 'bloqueado'
  /** «Se puede publicar» o «No se puede publicar todavía». */
  titulo: string
  /** La cifra grande (X5 §5.1): las paradas sin causa, con su frase. */
  cifra: { valor: number; unidad: string; frase: string; explica: string }
  /** Σ de los barriles enteros de las paradas sin causa. */
  bblSinCausa: number
  /** Una por parada sin causa, de la que más barriles tiene a la que menos. */
  paradas: FaltaDeParada[]
  /** Los motivos del libro, en palabras (la ⓘ). */
  motivos: string[]
  /** A3 · La respuesta de la ANH que rige en el período (un rechazo con hora por delante,
   *  o la más reciente) y lo que queda de la hora para corregir (entities/anh-respuestas.ts).
   *  AGREGADO, opcional: ausente si no hay ninguna registrada («ANH: sin respuesta registrada»). */
  respuestaAnh?: import('./anh-respuestas').DiaRespondido
}

const FMT_N0 = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const n0 = (v: number) => FMT_N0.format(Math.round(v) === 0 ? 0 : v)
const D = 86_400_000
const NOMBRE_MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const lista = (xs: readonly string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}`)
/** El día de un instante en Colombia (sin horario de verano), `AAAA-MM-DD`. */
const diaCo = (t: number) => new Date(t - 5 * 3_600_000).toISOString().slice(0, 10)

/** Lo que falta de cada paso, en las palabras del árbol («Falta quién», «Falta la causa»). */
const FALTA_PASO: Record<PasoAnh, string> = {
  responsable: 'quién', choke: 'dónde se trabó', impacto: 'qué pasó', planeacion: 'si fue planeada', n1: 'la causa', n2: 'el detalle',
}
/** Un motivo del libro, corto, para la frase (el texto entero va en la ⓘ). La
 *  causa no va aquí: la dicen las paradas sin causa. */
const MOTIVO_CORTO: Partial<Record<CodigoMotivo, string>> = {
  'sin-fiscal': 'faltan días de producción fiscal',
  'sin-factor': 'falta el factor de asignación de un mes',
  'banda-sin-verificar': 'no se puede verificar el factor contra su banda',
  'fa-fuera-de-banda': 'el factor de asignación está fuera de su banda',
  'sin-meta': 'falta la meta firmada',
}

/** El nombre del período: el mes si es uno del calendario; si no, sus días. */
function nombreDelPeriodo(desde: Date, hasta: Date): { nombre: string; esMes: boolean } {
  const m = calendario().find(x => x.desde === desde.getTime())
  const fin = Math.min(hasta.getTime(), AHORA.getTime())
  if (m && Math.abs(Math.min(m.hasta, AHORA.getTime()) - fin) < 60_000) return { nombre: NOMBRE_MES[Number(m.mes.slice(5)) - 1]!, esMes: true }
  return { nombre: `${fechaCorta(desde)} a ${fechaCorta(new Date(fin - 1))}`, esMes: false }
}

/** La hora límite del reporte que lleva un día operacional: el día siguiente, antes de las 07:00. */
function limiteDe(dia: string): { limite: string; vencido: boolean; cuando: string } {
  const siguiente = diaCo(new Date(`${dia}T00:00:00-05:00`).getTime() + D + 3_600_000)
  const limite = `${siguiente}T${HORA_REPORTE}:00-05:00`
  const t = Date.parse(limite), hoy = diaCo(AHORA.getTime())
  const vencido = t <= AHORA.getTime()
  const dias = Math.round((Date.parse(`${siguiente}T00:00:00-05:00`) - Date.parse(`${hoy}T00:00:00-05:00`)) / D)
  const cuando = vencido ? `venció el ${fechaCorta(new Date(t))} a las ${HORA_REPORTE}`
    : dias === 0 ? `hoy antes de las ${HORA_REPORTE}` : dias === 1 ? `mañana antes de las ${HORA_REPORTE}` : `el ${fechaCorta(new Date(t))} antes de las ${HORA_REPORTE}`
  return { limite, vencido, cuando }
}

const nombreDeRol = (id: string) => {
  const r = ROLES.find(x => x.id === id)
  return r ? `${r.nombre[0]!.toLowerCase()}${r.nombre.slice(1)}` : id
}

const SIN = {}
const GUARDADO = new WeakMap<Contexto, WeakMap<object, Map<string, VistaReporteAnh>>>()

/** El reporte a la ANH de unos campos en un período: si se puede publicar, qué
 *  paradas no tienen causa, quién lo debe y la hora límite. */
export function reporteAnh(q: ConsultaReporteAnh, ctx: Contexto, op: OpcionesReparto = {}): VistaReporteAnh {
  if (!q.campos.length) throw new Error('El reporte a la ANH necesita al menos un campo.')
  const campos = [...new Set(q.campos)]
  let porG = GUARDADO.get(ctx)
  if (!porG) GUARDADO.set(ctx, porG = new WeakMap())
  const kg = (op.guardadas ?? SIN) as object
  let m = porG.get(kg)
  if (!m) porG.set(kg, m = new Map())
  const clave = `${campos.join(',')}|${q.desde.getTime()}|${q.hasta.getTime()}`
  const ya = m.get(clave)
  if (ya) return ya
  const v = calcular(campos, q.desde, q.hasta, ctx, op)
  m.set(clave, v)
  return v
}

function calcular(campos: string[], desde: Date, hasta: Date, ctx: Contexto, op: OpcionesReparto): VistaReporteAnh {
  const d0 = desde.getTime(), hh = Math.min(hasta.getTime(), AHORA.getTime())
  const per = nombreDelPeriodo(desde, hasta)

  // Las paradas sin causa, campo por campo, con sus barriles enteros (los de la regla de redondeo).
  const paradas: FaltaDeParada[] = campos.flatMap(c => {
    const filas = filasDelChoke([c], desde, hasta, ctx, op.guardadas).filter(p => p.campoId === c && filaEnPeriodo(p, d0, hh))
    const enteros = enterosDelPeriodo(c, desde, hasta, ctx, op)
    return paradasSinCausa(filas).map((x): FaltaDeParada => {
      const exacto = filas.filter(p => p.eventoId === x.eventoId).reduce((a, p) => a + bblEnPeriodo(p, d0, hh), 0)
      const rol = x.escalada ? 'sup' : x.pregunta ? ROLES_QUE_CONTESTAN[x.pregunta.quien][0] ?? 'sup' : 'sup'
      // K2 · «faltan todos los pasos»: la cuenta de pasos no decide nada (el árbol los lista).
      const falta = x.faltan.length === 6 ? 'faltan todos los pasos' : `falta ${lista(x.faltan.map(s => FALTA_PASO[s]))}`
      return { ...x, bbl: enteros.porEvento[x.eventoId] ?? 0, exacto, falta, debe: { rol, nombre: nombreDeRol(rol) }, ...limiteDe(x.ultimoDia) }
    })
  }).sort((a, b) => b.bbl - a.bbl || b.exacto - a.exacto || a.eventoId.localeCompare(b.eventoId))
  const bblSinCausa = paradas.reduce((a, p) => a + p.bbl, 0)

  // Si se puede publicar: la regla de siempre (el mes en curso no es una anomalía).
  const lb = libro(campos, desde, hasta, ctx)
  const otros = lb.motivos.filter(x => x.codigo !== 'en-curso')
  const enCurso = lb.motivos.some(x => x.codigo === 'en-curso')
  const estado: VistaReporteAnh['estado'] = lb.publicable ? 'publicable' : otros.length ? 'bloqueado' : 'provisional'
  const titulo = lb.publicable ? 'Se puede publicar' : 'No se puede publicar todavía'

  // La frase (X4 §3.4): el estado y por qué, en una línea.
  const n = paradas.length
  const sinCausa = n ? `${n === 1 ? '1 parada no tiene' : `${n0(n)} paradas no tienen`} causa (${n0(bblSinCausa)} bbl)` : ''
  // K2 · Bajo la cifra grande («2 paradas sin causa») la frase no repite la cuenta: «les falta la causa».
  const sinSuCausa = n ? `${n === 1 ? 'le falta la causa' : 'les falta la causa'} (${n0(bblSinCausa)} bbl)` : ''
  const razones = [
    ...(enCurso ? [per.esMes ? `${per.nombre} sigue abierto` : 'el período incluye días sin cierre publicado'] : []),
    ...new Set(otros.map(x => MOTIVO_CORTO[x.codigo]).filter((x): x is string => !!x)),
    ...(sinSuCausa ? [sinSuCausa] : []),
  ]
  const frase = lb.publicable
    ? n ? `Se puede publicar el libro, pero ${sinCausa} para la ANH.` : 'Se puede publicar: cuadra con la medición oficial y ninguna parada está sin causa.'
    : `${titulo}: ${lista(razones)}.`

  // Quién lo debe y para cuándo (como mucho dos renglones).
  const deben = [...new Set(paradas.map(p => p.debe.nombre))]
  const primero = [...paradas].filter(p => !p.vencido).sort((a, b) => a.limite.localeCompare(b.limite))[0] ?? paradas[0]
  const explica = n
    // K2 · Quién y para cuándo, en una oración; la pregunta que le llegó («¿Qué lo paró?») está a un toque, en cada parada.
    // («mañana antes de las 07:00» es la hora del reporte que las lleva: la misma de cada fila).
    ? `${n === 1 ? 'La contesta' : 'Las contesta'} ${lista(deben.map(x => `el ${x}`))}${primero!.vencido ? `: el reporte ${primero!.cuando}.` : ` ${primero!.cuando}.`}`
    : estado === 'publicable' ? 'Factor en banda, custodia completa y lo sin identificar bajo el criterio.'
      : estado === 'provisional' ? `${per.esMes ? `${per.nombre[0]!.toUpperCase()}${per.nombre.slice(1)} sigue abierto` : 'El período incluye días sin cierre publicado'}: se publica cuando cierre.`
        : `${otros.map(x => x.texto)[0] ?? ''}`
  return {
    campos, periodo: per.nombre, estado, titulo,
    cifra: { valor: n, unidad: n === 1 ? 'parada sin causa' : 'paradas sin causa', frase, explica },
    bblSinCausa, paradas,
    motivos: [...new Set(lb.motivos.map(x => x.texto))],
  }
}
