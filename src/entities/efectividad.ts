/** «¿ESTÁ FUNCIONANDO?» Y LAS FALLAS POR MES (A2 · necesario-por-rol §0d; PLAN-MAESTRO §1).
 *
 *  El dueño quiere comprobar qué tan efectivo ha sido TRIM. Una tarjeta, tres
 *  columnas, los mismos dos números del norte (PLAN-MAESTRO §1):
 *   - lo diferido NO PLANEADO por día (el escalón `disponibilidad-no-planeada`,
 *     D4: una sola cifra en el motor);
 *   - las FALLAS de los equipos críticos al mes (la flota de alto impacto,
 *     `flotaDe`; un disparo no es una falla).
 *
 *  | Antes de TRIM | Ahora, contra la meta | Lo ganado |
 *  - **Antes:** la línea base, la MISMA de «¿Está bajando?» de la planta viva
 *    (`lineaBasePorTramo` desde la firma de arranque, `PUESTA_EN_MARCHA`): los
 *    tres meses publicados antes de que entrara TRIM. No es una base firmada
 *    aparte (no existe todavía): se dice de dónde sale (`base.fuente`).
 *  - **Ahora:** este mes (el que corre, parcial): lo no planeado por día y las
 *    fallas del mes, con la meta firmada al lado. La meta es la de reducción
 *    (`TramoMeta.reduccionPct`, opcional) aplicada a la base de cada campo: sin
 *    ella en algún campo, «sin meta de reducción firmada», nunca una meta inventada.
 *  - **Lo ganado:** los barriles que se dejaron de diferir desde que entró TRIM
 *    = (lo no planeado por día de la base − el de desde el arranque) × los días
 *    desde el arranque. Puede salir negativo (se difirió más) y se dice así. Y las
 *    fallas que anticipó el vigía (`aciertoVigia`: los avisos que acertó; las
 *    intervenidas a tiempo van aparte).
 *  - **Por tramo, a un toque:** lo mismo de lo no planeado en cada tramo.
 *
 *  Las fallas por mes (`fallasPorMes`) eran una cuenta de la pantalla de
 *  Confiabilidad («Fallas por mes»): ahora la hace el motor, con la misma regla
 *  (la falla cuenta en el mes en que empezó, sin disparos).
 *
 *  Contrato: `GET /api/vistas/efectividad?campos` y `GET /api/vistas/fallas/mensual?campos`.
 *  D7: una vez por contexto, historial, lo guardado y campos. */
import type { Contexto } from './causa-senal'
import type { Historial, ChokeOSinAsignar } from './choke'
import { CHOKES_Y_SIN_ASIGNAR, elementoDe } from './choke'
import { lineaBasePorTramo, repartoPorMes, type OpcionesReparto } from './choke-reparto'
import { calendario, historialDeEquipo, mesCerrado } from './libro'
import { flotaDe, type Familia } from './flota'
import { metaEn, reduccionDe, PUESTA_EN_MARCHA } from './configuracion'
import { aciertoVigia } from './equipos-tecnico'
import { enteroDe, enterosPorId } from './redondeo'
import { NOMBRE_TRAMO_BALANCE, type CifraBalance } from './balance'
import { campoPorId } from './campos'
import { AHORA } from './reloj'

const D = 86_400_000
const FAMILIAS: readonly Familia[] = ['inyeccion', 'multifasica', 'electrosumergible']
const NOMBRE_MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/* ───────────────────────────── las fallas por mes ───────────────────────────── */

/** Un equipo crítico con sus fallas del mes. */
export interface FallasDeEquipo {
  campoId: string
  equipo: string
  familia: Familia
  /** Dónde frenaría la producción (el tramo de su topología); `sin-asignar` si no se sabe. */
  tramo: ChokeOSinAsignar
  fallas: number
  disparos: number
}

/** Un mes del calendario con las fallas de los equipos críticos. */
export interface MesFallas {
  /** «2026-10». */
  mes: string
  nombre: string
  desde: Date
  hasta: Date
  /** El mes todavía corre: la cuenta puede subir. */
  parcial: boolean
  /** Fallas (sin disparos) que empezaron en el mes. */
  fallas: number
  disparos: number
  porFamilia: Record<Familia, number>
  porTramo: Record<ChokeOSinAsignar, number>
  /** Solo los equipos con alguna falla o disparo en el mes, de más a menos fallas. */
  porEquipo: FallasDeEquipo[]
}

const FALLAS = new WeakMap<Contexto, Map<string, MesFallas[]>>()

/** `GET /api/vistas/fallas/mensual?campos`: cada mes del calendario, del más viejo al
 *  que corre. Una falla cuenta en el mes en que empezó (la regla de «Fallas por mes»). */
export function fallasPorMes(campos: readonly string[], ctx: Contexto): MesFallas[] {
  let m = FALLAS.get(ctx)
  if (!m) FALLAS.set(ctx, m = new Map())
  const clave = campos.join(',')
  const ya = m.get(clave)
  if (ya) return ya
  const equipos = campos.flatMap(c => flotaDe(c).map(({ equipo, familia }) => {
    const t = elementoDe(c, equipo, ctx)?.choke
    return { campoId: c, equipo, familia, tramo: (t ?? (familia === 'electrosumergible' ? 'pozo' : 'sin-asignar')) as ChokeOSinAsignar, eventos: historialDeEquipo(c, equipo, ctx).eventos }
  }))
  const out = calendario().map((mes): MesFallas => {
    const enMes = (t: Date) => t.getTime() >= mes.desde && t.getTime() < mes.hasta
    const porEquipo = equipos.map(e => ({ campoId: e.campoId, equipo: e.equipo, familia: e.familia, tramo: e.tramo,
      fallas: e.eventos.filter(x => !x.disparo && enMes(x.inicio)).length, disparos: e.eventos.filter(x => x.disparo && enMes(x.inicio)).length }))
      .filter(e => e.fallas + e.disparos > 0)
      .sort((a, b) => b.fallas - a.fallas || b.disparos - a.disparos || a.campoId.localeCompare(b.campoId) || a.equipo.localeCompare(b.equipo))
    const porFamilia = Object.fromEntries(FAMILIAS.map(f => [f, porEquipo.filter(e => e.familia === f).reduce((a, e) => a + e.fallas, 0)])) as Record<Familia, number>
    const porTramo = Object.fromEntries(CHOKES_Y_SIN_ASIGNAR.map(k => [k, porEquipo.filter(e => e.tramo === k).reduce((a, e) => a + e.fallas, 0)])) as Record<ChokeOSinAsignar, number>
    return {
      mes: mes.mes, nombre: NOMBRE_MES[Number(mes.mes.slice(5)) - 1]!, desde: new Date(mes.desde), hasta: new Date(mes.hasta),
      parcial: !mesCerrado(mes),
      fallas: porEquipo.reduce((a, e) => a + e.fallas, 0), disparos: porEquipo.reduce((a, e) => a + e.disparos, 0), porFamilia, porTramo, porEquipo,
    }
  })
  m.set(clave, out)
  return out
}

/* ───────────────────────────── «¿Está funcionando?» ───────────────────────────── */

/** Lo de un tramo, a un toque: lo no planeado por día antes, este mes y su meta, y lo ganado. */
export interface TramoEfectividad {
  tramo: ChokeOSinAsignar
  nombre: string
  antesDia: CifraBalance | null
  ahoraDia: CifraBalance
  metaDia: CifraBalance | null
  /** Barriles que se dejaron de diferir desde el arranque (negativo: se difirió más). */
  ganadoBbl: CifraBalance | null
}

export interface VistaEfectividad {
  campos: string[]
  /** Desde cuándo está TRIM (la firma de arranque) y la hora de los datos. */
  desde: Date
  ahora: Date
  /** De dónde sale el «antes»; null sin tres meses publicados antes del arranque. */
  base: { desde: Date; hasta: Date; nombre: string; firmada: false; fuente: string } | null
  antes: { noPlaneadoDia: CifraBalance | null; fallasMes: number | null }
  /** Este mes (parcial). */
  esteMes: {
    mes: string
    noPlaneadoDia: CifraBalance
    fallas: number
    parcial: boolean
  }
  /** La meta firmada (la de reducción, en todos los campos); null = «sin meta de reducción firmada». */
  meta: { reduccionPct: number | null; noPlaneadoDia: CifraBalance; fallasMes: number } | null
  /** ¿Va dentro de la meta? null sin meta, o en las fallas mientras el mes corre y no la pasó. */
  cumple: { noPlaneado: boolean | null; fallas: boolean | null }
  ganado: {
    /** Barriles que se dejaron de diferir desde el arranque; null sin base. */
    bbl: CifraBalance | null
    /** Días desde el arranque. */
    dias: number
    /** Los avisos del vigía que acertaron (la falla llegó como dijo) y los intervenidos a tiempo. */
    fallasAnticipadas: number
    intervenidas: number
    /** Los avisos que ya se pueden juzgar (aciertos + falsas alarmas). */
    juzgadas: number
  }
  porTramo: TramoEfectividad[]
  /** «Antes 561 bbl/d no planeados · ahora 308 · se dejaron de diferir 7.590 bbl desde que entró TRIM.» */
  frase: string
  /** Lo que hay que decir: muestra corta, sin meta, sin base. */
  notas: string[]
}

const CACHE = new WeakMap<Contexto, WeakMap<object, WeakMap<object, Map<string, VistaEfectividad>>>>()
const SIN = {}
const FMT_N0 = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const n0 = (v: number) => FMT_N0.format(Math.round(v) === 0 ? 0 : v)

/** Una tasa (bbl/d) con su entero y sus partes por tramo que suman ese entero. */
function partir(total: number, partes: Record<ChokeOSinAsignar, number>): { total: CifraBalance; porTramo: Record<ChokeOSinAsignar, CifraBalance> } {
  const entero = enteroDe(total)
  const e = enterosPorId(entero, CHOKES_Y_SIN_ASIGNAR.map(k => ({ id: k, valor: partes[k] })))
  return { total: { exacto: total, entero }, porTramo: Object.fromEntries(CHOKES_Y_SIN_ASIGNAR.map(k => [k, { exacto: partes[k], entero: e[k] ?? 0 }])) as Record<ChokeOSinAsignar, CifraBalance> }
}
/** Una cifra que puede ser negativa (lo ganado): el entero del valor absoluto, con su signo. */
const conSigno = (x: number): CifraBalance => ({ exacto: x, entero: x < 0 ? -enteroDe(-x) : enteroDe(x) })

/** `GET /api/vistas/efectividad?campos`. */
export function efectividad(q: { campos: string[] }, ctx: Contexto, versiones?: Historial, op: OpcionesReparto = {}): VistaEfectividad {
  let porV = CACHE.get(ctx)
  if (!porV) CACHE.set(ctx, porV = new WeakMap())
  const kv = (versiones ?? SIN) as object, kg = (op.guardadas ?? SIN) as object
  let porG = porV.get(kv)
  if (!porG) porV.set(kv, porG = new WeakMap())
  let m = porG.get(kg)
  if (!m) porG.set(kg, m = new Map())
  const clave = q.campos.join(',')
  const ya = m.get(clave)
  if (ya) return ya
  const v = calcular([...new Set(q.campos)], ctx, versiones, op)
  m.set(clave, v)
  return v
}

function calcular(campos: string[], ctx: Contexto, versiones: Historial | undefined, op: OpcionesReparto): VistaEfectividad {
  const inicio = new Date(`${PUESTA_EN_MARCHA}T00:00:00-05:00`)
  const ahora = AHORA.getTime()
  const dias = (ahora - inicio.getTime()) / D
  const notas: string[] = []
  // Antes y lo ganado: la misma línea base de «¿Está bajando?» (planta viva).
  const bj = lineaBasePorTramo(campos, inicio, AHORA, ctx, versiones, op)
  // Este mes: lo no planeado de cada tramo en el mes que corre.
  const meses = repartoPorMes(campos, ctx, versiones, op)
  const esteMes = meses.at(-1)!
  const diasMes = Math.max(1e-9, (Math.min(esteMes.hasta.getTime(), ahora) - esteMes.desde.getTime()) / D)
  const ahoraTramo = Object.fromEntries(CHOKES_Y_SIN_ASIGNAR.map(k => [k, esteMes.noPlaneado[k] / diasMes])) as Record<ChokeOSinAsignar, number>
  const ahoraP = partir(CHOKES_Y_SIN_ASIGNAR.reduce((a, k) => a + ahoraTramo[k], 0), ahoraTramo)
  const fm = fallasPorMes(campos, ctx)
  const fallasMes = fm.at(-1)!
  const antesTramo = bj ? Object.fromEntries(CHOKES_Y_SIN_ASIGNAR.map(k => [k, bj.noPlaneado[k].baseDia])) as Record<ChokeOSinAsignar, number> : undefined
  const antesP = antesTramo ? partir(CHOKES_Y_SIN_ASIGNAR.reduce((a, k) => a + antesTramo[k], 0), antesTramo) : undefined
  // Las fallas al mes antes de TRIM: el promedio de los meses de la base.
  const mesesBase = bj ? fm.filter(x => x.desde.getTime() >= bj.base.desde.getTime() && x.hasta.getTime() <= bj.base.hasta.getTime()) : []
  const fallasAntes = mesesBase.length ? mesesBase.reduce((a, x) => a + x.fallas, 0) / mesesBase.length : null
  // Lo ganado desde el arranque: (base − desde el arranque) × días, por tramo.
  const ganadoTramo = bj ? Object.fromEntries(CHOKES_Y_SIN_ASIGNAR.map(k => [k, (bj.noPlaneado[k].baseDia - bj.noPlaneado[k].periodoDia) * dias])) as Record<ChokeOSinAsignar, number> : undefined
  const ganadoTotal = ganadoTramo ? CHOKES_Y_SIN_ASIGNAR.reduce((a, k) => a + ganadoTramo[k], 0) : undefined
  // La meta: la reducción firmada que rige hoy en cada campo, sobre la base de ese campo.
  const reducciones = campos.map(c => { const t = metaEn(ctx.config, c, ahora); return t ? reduccionDe(t) : undefined })
  let meta: VistaEfectividad['meta'] = null
  let metaTramo: Record<ChokeOSinAsignar, number> | undefined
  if (!bj) notas.push('Sin línea base: hacen falta tres meses publicados antes de que entrara TRIM.')
  else if (reducciones.some(r => r === undefined)) {
    const sin = campos.filter((_, i) => reducciones[i] === undefined).map(c => campoPorId(c).nombre)
    notas.push(`Sin meta de reducción firmada${campos.length > 1 ? ` en ${sin.join(', ')}` : ''}.`)
  } else {
    const iguales = reducciones.every(r => r === reducciones[0])
    // Con la misma reducción en todos, la base del conjunto; si no, campo por campo.
    const bases = iguales ? [{ r: reducciones[0]!, b: bj, f: fallasAntes ?? 0 }] : campos.map((c, i) => {
      const b = lineaBasePorTramo([c], inicio, AHORA, ctx, versiones, op)!
      const fc = fallasPorMes([c], ctx).filter(x => b && x.desde.getTime() >= b.base.desde.getTime() && x.hasta.getTime() <= b.base.hasta.getTime())
      return { r: reducciones[i]!, b, f: fc.length ? fc.reduce((a, x) => a + x.fallas, 0) / fc.length : 0 }
    })
    metaTramo = Object.fromEntries(CHOKES_Y_SIN_ASIGNAR.map(k => [k, bases.reduce((a, x) => a + (x.b ? x.b.noPlaneado[k].baseDia * (1 - x.r / 100) : 0), 0)])) as Record<ChokeOSinAsignar, number>
    const metaP = partir(CHOKES_Y_SIN_ASIGNAR.reduce((a, k) => a + metaTramo![k], 0), metaTramo)
    meta = { reduccionPct: iguales ? reducciones[0]! : null, noPlaneadoDia: metaP.total, fallasMes: bases.reduce((a, x) => a + x.f * (1 - x.r / 100), 0) }
  }
  const metaP = metaTramo ? partir(CHOKES_Y_SIN_ASIGNAR.reduce((a, k) => a + metaTramo![k], 0), metaTramo) : undefined
  const cumple = {
    noPlaneado: meta ? ahoraP.total.exacto <= meta.noPlaneadoDia.exacto : null,
    // Mientras el mes corre, solo se sabe si ya la pasó.
    fallas: meta ? (fallasMes.fallas > meta.fallasMes ? false : fallasMes.parcial ? null : true) : null,
  }
  const vigia = aciertoVigia(campos, ctx)
  if (dias < 60) notas.push(`Muestra corta: TRIM lleva ${n0(dias)} días.`)
  if (fallasMes.parcial) notas.push(`${fallasMes.nombre.charAt(0).toUpperCase()}${fallasMes.nombre.slice(1)} va en curso: las fallas del mes pueden subir.`)
  const porTramo: TramoEfectividad[] = CHOKES_Y_SIN_ASIGNAR.map(k => ({
    tramo: k, nombre: NOMBRE_TRAMO_BALANCE[k],
    antesDia: antesP ? antesP.porTramo[k] : null, ahoraDia: ahoraP.porTramo[k], metaDia: metaP ? metaP.porTramo[k] : null,
    ganadoBbl: ganadoTramo ? conSigno(ganadoTramo[k]) : null,
  }))
  const ganado = ganadoTotal === undefined ? null : conSigno(ganadoTotal)
  const frase = antesP && ganado
    ? `Antes de TRIM ${n0(antesP.total.entero)} bbl/d no planeados; este mes ${n0(ahoraP.total.entero)}. ${ganado.entero >= 0 ? `Se dejaron de diferir ${n0(ganado.entero)} bbl` : `Se difirieron ${n0(-ganado.entero)} bbl más`} desde que entró TRIM; el vigía anticipó ${vigia.aciertos} ${vigia.aciertos === 1 ? 'falla' : 'fallas'}.`
    : `Este mes ${n0(ahoraP.total.entero)} bbl/d no planeados; sin línea base para comparar.`
  return {
    campos, desde: inicio, ahora: AHORA,
    base: bj ? { desde: bj.base.desde, hasta: bj.base.hasta, nombre: bj.base.nombre, firmada: false,
      fuente: `Los tres meses publicados antes de que entrara TRIM (${bj.base.nombre}): la misma base de «¿Está bajando?».` } : null,
    antes: { noPlaneadoDia: antesP ? antesP.total : null, fallasMes: fallasAntes },
    esteMes: { mes: esteMes.mes, noPlaneadoDia: ahoraP.total, fallas: fallasMes.fallas, parcial: fallasMes.parcial },
    meta, cumple,
    ganado: { bbl: ganado, dias, fallasAnticipadas: vigia.aciertos, intervenidas: vigia.intervenidas, juzgadas: vigia.juzgadas },
    porTramo, frase, notas,
  }
}

