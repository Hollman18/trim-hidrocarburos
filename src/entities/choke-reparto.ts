/** Lo que se perdió, repartido por tramo y por escalón, sobre las MISMAS filas
 *  del árbol (QA-A-01; C-09): cada barril diferido del período es una fila de
 *  la ANH (pozo × día operacional × causa, `paradasAnh`) con su clasificación
 *  VIGENTE, lo que dijeron las personas encima de lo que propone TRIM. De esas
 *  filas salen todas las vistas que reparten por tramo o por planeación:
 *   - el reparto de «Por dónde se trabó» y de la escalera (`brechaPorChoke`),
 *     con la eficiencia de producción (§8);
 *   - la tubería del campo (`tuberiaCampo`): lo perdido en el período por
 *     tramo y lo que se pierde ahora por tramo;
 *   - la serie diaria (`serieChoke`), el mes a mes (`repartoPorMes`) y la línea
 *     base (`lineaBasePorTramo`);
 *   - el árbol de pérdidas del choke (choke-arbol.ts), cuyo primer nivel es este
 *     reparto, barril por barril.
 *  Corregir el paso 2 o el 4 de una fila mueve sus barriles en todas a la vez;
 *  el libro no cambia (no lee la clasificación).
 *
 *  La cifra del norte (D4) es UNA: el escalón `disponibilidad-no-planeada`,
 *  calculado fila por fila con la clasificación vigente (`escalonDeFila`). Lo
 *  sin identificar nunca cuenta como no planeado.
 *
 *  Va aparte de choke.ts porque lee las filas de la ANH, que a su vez leen el
 *  motor del choke: dentro de choke.ts sería una importación circular.
 *
 *  Rendimiento (D7; QA-A-15): las filas se calculan una vez por contexto, por
 *  lo guardado y por día, y se guardan en memoria; lo guardado nuevo (una
 *  escritura) solo recalcula los días de los eventos que cambiaron. Los días
 *  del libro frente a los tramos, una vez por contexto, historial y campo
 *  (`diasDelCampo`, choke.ts). */
import { paradasAnh, inicioDiaCo, type ParadaAnh } from './anh-paradas'
import { avalado, esDePersona, type BorradorClasificacion } from './anh-clasificacion'
import { planeacionDeN1, n1DeCodigo, type CodigoN2 } from './anh-catalogo'
import {
  chokeDeCausa, escalonDeCausa, diasDelCampo, potencialesDelCampo, n0, mayuscula, ceros, listaY, SUJETO, TREN_FRASE, TREN_NOMBRE, DONDE_PERIODO,
  ORDEN_CHOKE, ORDEN_CHOKE_CAMPO, CHOKES_Y_SIN_ASIGNAR, ESCALONES, NOMBRE_CHOKE, EXPLICA_TRAMO, PARAMETROS_CHOKE, elementoDe, porSaberDelCampo,
  type ChokeAnh, type ChokeCampo, type ChokeOSinAsignar, type EscalonOSinClasificar, type Historial, type DiaCampo,
  type BrechaCampoChoke, type BrechaChoke, type EquipoBbl, type EficienciaProduccion, type TuberiaCampo, type TramoTuberia, type PerdiendoAhora,
  type CapacidadesDeLaTuberia, type MedidorDelCampo, type MesPorTramo, type AntesYDespues, type LineaBasePorTramo, type DiaChoke, type CambioDominante,
  type PotencialesCampo,
} from './choke'
import { porDia, calendario, publicadoEnTodos, lineaBase, crudoAsignado, perdidaPorFrecuencia, fiscalDeAyer, fiscalUltimosDias } from './libro'
import { caudalesAhora, type Riesgo } from './diferido'
import { pozosDe, estadoAhora, pruebaEn, origenPmo } from './pozos'
import { causaDeEvento, type Contexto, type TipoCausa } from './causa-senal'
import { perfilBomba, paradasDe } from './bombas'
import { CAMPO_PLANTA } from './planta'
import { firmaDeCapacidades, type CapacidadesVigentes } from './capacidades'
import { campoPorId } from './campos'
import { AHORA, fechaCorta } from './reloj'

const D = 86_400_000
const H = 3_600_000
const ahora = AHORA.getTime()

/** Lo que ya dijeron las personas, por id de la fila o por evento (la misma forma de `paradasAnh`). */
export type Guardadas = ReadonlyMap<string, BorradorClasificacion>
export interface OpcionesReparto {
  /** Lo que dijeron las personas: sin esto, rige lo que propone TRIM. */
  guardadas?: Guardadas
}

/* ───────────────────────── las filas, una vez ───────────────────────── */

const SIN_GUARDADAS: Guardadas = new Map()
/** Las filas de un campo por día operacional (su medianoche, ms). Un día ya calculado sin filas queda con []. */
type FilasPorDia = Map<number, ParadaAnh[]>
interface CacheFilas { g: Guardadas; porCampo: Map<string, FilasPorDia> }
const FILAS = new WeakMap<Contexto, WeakMap<Guardadas, CacheFilas>>()
/** Lo último que se calculó en cada contexto: lo guardado nuevo parte de ahí. */
const ULTIMA = new WeakMap<Contexto, CacheFilas>()

/** El evento de una clave de lo guardado: la de una fila es `${evento}@${día}#${n}`; la de un evento, él mismo. */
const eventoDeClave = (k: string) => { const i = k.indexOf('@'); return i < 0 ? k : k.slice(0, i) }

/** Las filas ya calculadas para lo guardado `g`. Si en el mismo contexto se
 *  calculó con otro guardado (antes de una escritura), se reusan los días cuyas
 *  filas no tocan ninguno de los eventos que cambiaron: en una fila rige lo de
 *  su clave y lo de su evento, nada más (`paradasAnh`, `rigeEnFila`). */
function cacheDe(ctx: Contexto, g: Guardadas): CacheFilas {
  let m = FILAS.get(ctx)
  if (!m) FILAS.set(ctx, m = new WeakMap())
  const ya = m.get(g)
  if (ya) return ya
  const c: CacheFilas = { g, porCampo: new Map() }
  const antes = ULTIMA.get(ctx)
  if (antes) {
    const cambiaron = new Set<string>()
    for (const [k, v] of g) if (antes.g.get(k) !== v) cambiaron.add(eventoDeClave(k))
    for (const [k, v] of antes.g) if (g.get(k) !== v) cambiaron.add(eventoDeClave(k))
    for (const [campo, dias] of antes.porCampo) {
      const copia: FilasPorDia = new Map()
      for (const [dia, filas] of dias) if (!filas.some(p => cambiaron.has(p.eventoId))) copia.set(dia, filas)
      c.porCampo.set(campo, copia)
    }
  }
  m.set(g, c)
  ULTIMA.set(ctx, c)
  return c
}

/** Los días [d0, d1) de un campo, calculados de una vez por cada tramo de días seguidos que falte. */
function diasConFilas(c: CacheFilas, campoId: string, d0: number, d1: number, ctx: Contexto): FilasPorDia {
  let dias = c.porCampo.get(campoId)
  if (!dias) c.porCampo.set(campoId, dias = new Map())
  const calcular = (a: number, b: number) => {
    for (let d = a; d < b; d += D) dias.set(d, [])
    for (const p of paradasAnh([campoId], new Date(a), new Date(b), ctx, { guardadas: c.g })) dias.get(inicioDiaCo(Date.parse(p.inicio)))?.push(p)
  }
  let desde: number | undefined
  for (let d = d0; d < d1; d += D) {
    if (!dias.has(d)) { desde ??= d; continue }
    if (desde !== undefined) { calcular(desde, d); desde = undefined }
  }
  if (desde !== undefined) calcular(desde, d1)
  return dias
}

/** Las filas de la ANH de los días operacionales que toca el período (como
 *  `paradasAnh` con `{ guardadas }`, y en su mismo orden), desde la memoria. */
export function filasDelChoke(campoIds: string[], desde: Date, hasta: Date, ctx: Contexto, guardadas?: Guardadas): ParadaAnh[] {
  const c = cacheDe(ctx, guardadas ?? SIN_GUARDADAS)
  const d0 = inicioDiaCo(desde.getTime()), d1 = inicioDiaCo(hasta.getTime() - 1) + D
  const campos = [...new Set(campoIds)].sort((a, b) => a.localeCompare(b)).map(id => diasConFilas(c, id, d0, d1, ctx))
  const out: ParadaAnh[] = []
  for (let d = d0; d < d1; d += D) for (const dias of campos) { const fs = dias.get(d); if (fs) for (const p of fs) out.push(p) }
  return out
}

/** Los barriles de una fila dentro de [d0, hh): todos si la fila cae entera
 *  adentro; si el período la corta (un período que no empieza a medianoche,
 *  QA-A-11), la parte de sus horas, porque dentro de un día el libro cobra
 *  parejo por hora. */
export function bblEnPeriodo(p: ParadaAnh, d0: number, hh: number): number {
  const a = Date.parse(p.inicio), b = a + p.horas * H
  if (a >= d0 && b <= hh) return p.diferidaTrimBbl
  const dentro = Math.min(b, hh) - Math.max(a, d0)
  return dentro > 0 && p.horas > 0 ? p.diferidaTrimBbl * dentro / (p.horas * H) : 0
}
/** ¿La fila tiene alguna hora dentro de [d0, hh)? */
export const filaEnPeriodo = (p: ParadaAnh, d0: number, hh: number): boolean => {
  const a = Date.parse(p.inicio)
  return a < hh && a + Math.max(p.horas * H, 1) > d0
}

/* ───────────────────────── lo que rige en cada fila ───────────────────────── */

/** El tramo de una fila: el paso 2 vigente; si espera una respuesta (el tanque
 *  de crudo: «¿el oleoducto recibía?»), donde lo propone el motor del choke
 *  mientras tanto; sin nada, «sin identificar». El mismo en el árbol y en todas
 *  las vistas. */
export const tramoVigente = (p: ParadaAnh): ChokeOSinAsignar => p.clasificacion.choke?.valor ?? p.propuesta.sugerido.choke ?? 'sin-asignar'

/** El elemento donde se originó (la raíz de la cascada, o el pozo que una baja tensión tumbó solo). */
export const elementoDeFila = (p: ParadaAnh, ctx: Contexto): string => chokeDeCausa(p.causa, p.campoId, ctx)?.elemento ?? p.causa.equipo

/** Las causas (N2) que son una restricción sin falla: capacidad (CHOKE-COMPLETO §7). */
const N2_CAPACIDAD: ReadonlySet<string> = new Set(['NP_TRANSP/restriccion-nominacion-entrega', 'NP_TRANSP/terminal-cliente-no-recibe', 'NP_PROC/tanques-llenos-capacidad-limitada'])

/** El escalón de una fila con su clasificación VIGENTE (QA-A-01, punto 2; D4; D5):
 *  - «En el yacimiento» (paso 2) → desarrollo;
 *  - planeada (paso 4) → disponibilidad planeada;
 *  - el exceso de una parada del programa → no planeada (§5.5);
 *  - si una persona dijo la causa (N2 o N1), manda lo que dijo: una
 *    restricción de la nominación, el cliente que no recibe o el tanque lleno
 *    sin falla son capacidad; lo demás, no planeado (fallas, disparos y terceros);
 *  - si no, la regla de la causa de TRIM (`escalonDeCausa`), que no depende del
 *    tramo: con el tramo sin saber, el escalón sale igual (D5). Una parada que
 *    la regla da por planeada y una persona dijo que no lo fue, no planeada.
 *  Lo que no tiene causa ni lo dijo nadie queda sin clasificar: no es no planeado. */
export function escalonDeFila(p: ParadaAnh): EscalonOSinClasificar {
  const b = p.clasificacion
  if (b.choke?.valor === 'reservorio') return 'desarrollo'
  if (b.planeacion?.valor === 'planeada') return 'disponibilidad-planeada'
  if (p.exceso) return 'disponibilidad-no-planeada'
  if (b.n2 && esDePersona(b.n2.procedencia)) {
    const n2 = b.n2.valor as CodigoN2
    if (N2_CAPACIDAD.has(n2)) return 'capacidad'
    return planeacionDeN1(n1DeCodigo(n2)) === 'planeada' ? 'disponibilidad-planeada' : 'disponibilidad-no-planeada'
  }
  const regla = escalonDeCausa(p.causa, p.parcial, p.pozo, false)
  if (b.n1 && esDePersona(b.n1.procedencia) && regla === 'sin-clasificar')
    return planeacionDeN1(b.n1.valor) === 'planeada' ? 'disponibilidad-planeada' : 'disponibilidad-no-planeada'
  if (regla === 'disponibilidad-planeada' && b.planeacion?.valor === 'no-planeada') return 'disponibilidad-no-planeada'
  return regla
}

/** ¿El tramo de la fila es todavía la propuesta de TRIM y espera a una
 *  persona? El paso 2 en falta con lo que sugiere el motor (el tanque de crudo)
 *  o propuesto con la pregunta del motor sin contestar (QA-A-01, punto 3). Lo
 *  avalado o dicho por una persona ya no espera. */
export function esperaTramo(p: ParadaAnh): boolean {
  const b = p.clasificacion
  if (avalado(b, 'choke')) return false
  if (!b.choke) return !!p.propuesta.sugerido.choke
  return !esDePersona(b.choke.procedencia) && !!b.choke.porque?.pregunta
}

/* ───────────────────────── la brecha por choke y por escalón ───────────────────────── */

interface Acumulado {
  porChoke: Record<ChokeOSinAsignar, number>
  porEscalon: Record<EscalonOSinClasificar, number>
  cruce: Record<ChokeOSinAsignar, Record<EscalonOSinClasificar, number>>
  equipos: Record<ChokeOSinAsignar, Map<string, Map<TipoCausa, number>>>
  porConfirmar: number
  diferido: number
}
const acumulado = (): Acumulado => ({
  porChoke: ceros(CHOKES_Y_SIN_ASIGNAR), porEscalon: ceros(ESCALONES), porConfirmar: 0, diferido: 0,
  cruce: Object.fromEntries(CHOKES_Y_SIN_ASIGNAR.map(k => [k, ceros(ESCALONES)])) as Acumulado['cruce'],
  equipos: Object.fromEntries(CHOKES_Y_SIN_ASIGNAR.map(k => [k, new Map<string, Map<TipoCausa, number>>()])) as Acumulado['equipos'],
})

/** Una fila ya leída: su tramo, su escalón, su equipo y sus barriles en el período. */
interface FilaLeida { p: ParadaAnh; dia: number; tramo: ChokeOSinAsignar; escalon: EscalonOSinClasificar; equipo: string; espera: boolean; bbl: number }
function leer(ps: readonly ParadaAnh[], d0: number, hh: number, ctx: Contexto): FilaLeida[] {
  const out: FilaLeida[] = []
  for (const p of ps) {
    if (!filaEnPeriodo(p, d0, hh)) continue
    out.push({ p, dia: inicioDiaCo(Date.parse(p.inicio)), tramo: tramoVigente(p), escalon: escalonDeFila(p), equipo: elementoDeFila(p, ctx), espera: esperaTramo(p), bbl: bblEnPeriodo(p, d0, hh) })
  }
  return out
}
function acumular(a: Acumulado, f: FilaLeida) {
  a.porChoke[f.tramo] += f.bbl
  a.porEscalon[f.escalon] += f.bbl
  a.cruce[f.tramo][f.escalon] += f.bbl
  a.diferido += f.bbl
  let eq = a.equipos[f.tramo].get(f.equipo)
  if (!eq) a.equipos[f.tramo].set(f.equipo, eq = new Map())
  eq.set(f.p.causa.tipo, (eq.get(f.p.causa.tipo) ?? 0) + f.bbl)
  if (f.espera && f.tramo !== 'sin-asignar') a.porConfirmar += f.bbl
}

/** Los equipos de cada tramo, de mayor a menor, con sus tipos de causa si son más de uno (B-12). */
function equiposDe(a: Acumulado): Record<ChokeOSinAsignar, EquipoBbl[]> {
  return Object.fromEntries(CHOKES_Y_SIN_ASIGNAR.map(k => [k, [...a.equipos[k]].map(([equipo, tipos]): EquipoBbl => {
    const bbl = [...tipos.values()].reduce((x, y) => x + y, 0)
    const porTipo = [...tipos].filter(([, v]) => v > 0).map(([tipo, v]) => ({ tipo, bbl: v })).sort((x, y) => y.bbl - x.bbl || x.tipo.localeCompare(y.tipo))
    return { equipo, bbl, ...(porTipo.length > 1 ? { porTipo } : {}) }
  }).filter(x => x.bbl > 0).sort((x, y) => y.bbl - x.bbl || (x.equipo < y.equipo ? -1 : 1))])) as Record<ChokeOSinAsignar, EquipoBbl[]>
}

/** Lo de un campo en el período: sus días frente a los tramos y sus filas por día. */
interface CampoDelPeriodo { acc: Acumulado; dias: DiaCampo[]; porDia: Map<number, { total: number; noPlaneada: number }> }

/** La brecha del período repartida por choke y por escalón (CHOKE-COMPLETO
 *  §6–§8), sobre las filas de la ANH con su clasificación vigente. Cada barril
 *  de cada fila va a UN tramo y a UN escalón; la identidad es EXACTA, por campo
 *  y en el conjunto:
 *
 *    potencial − real (libro) = Σ por tramo + sin explicar = Σ por escalón + sin explicar
 *    potencial del sistema − real = Σ por tramo + sin explicar + brecha de las pruebas − estructural
 *
 *  El potencial del sistema es el de las pruebas (D3) menos lo estructural (lo
 *  que no pasa aunque nada pare, cuando no limitan los pozos). La pérdida (lo
 *  producido que no se vende) nunca entra: aquí solo hay barriles diferidos. */
export function brechaPorChoke(campoIds: string[], desde: Date, hasta: Date, ctx: Contexto, versiones?: Historial, op: OpcionesReparto = {}): BrechaChoke {
  const d0 = desde.getTime(), hh = Math.min(hasta.getTime(), ahora)
  const filas = leer(filasDelChoke(campoIds, desde, hasta, ctx, op.guardadas), d0, hh, ctx)
  const total = acumulado()
  const porCampoAcc = new Map(campoIds.map((c): [string, CampoDelPeriodo] => [c, { acc: acumulado(), dias: diasDelCampo(c, d0, hh, ctx, versiones), porDia: new Map() }]))
  for (const f of filas) {
    acumular(total, f)
    const x = porCampoAcc.get(f.p.campoId)
    if (!x) continue
    acumular(x.acc, f)
    const dd = x.porDia.get(f.dia) ?? { total: 0, noPlaneada: 0 }
    dd.total += f.bbl
    if (f.escalon === 'disponibilidad-no-planeada') dd.noPlaneada += f.bbl
    x.porDia.set(f.dia, dd)
  }
  const porCampo = campoIds.map(c => cifras(c, porCampoAcc.get(c)!))
  const suma = (k: 'potencial' | 'real' | 'potencialPruebas' | 'cabiaEnHolgura' | 'noPlaneadaSistema') => porCampo.reduce((a, x) => a + x[k], 0)
  const estructuralPorChoke = ceros(ORDEN_CHOKE_CAMPO), horasPorDominante = ceros(ORDEN_CHOKE_CAMPO)
  for (const x of porCampo) for (const k of ORDEN_CHOKE_CAMPO) { estructuralPorChoke[k] += x.estructuralPorChoke[k]; horasPorDominante[k] += x.horasPorDominante[k] }
  const { campoId: _, superado: __, ...todo } = armar('', suma('potencial'), suma('real'), suma('potencialPruebas'), total, estructuralPorChoke, horasPorDominante,
    suma('cabiaEnHolgura'), suma('noPlaneadaSistema'), [])
  const superado = porCampo.flatMap(x => x.superado.map(s => ({ campoId: x.campoId, ...s }))).sort((a, b) => a.dia.getTime() - b.dia.getTime())
  const quien = campoIds.length === 1 ? campoPorId(campoIds[0]!).nombre : 'El conjunto de campos'
  const mayor = ORDEN_CHOKE.reduce((a, k) => (todo.porChoke[k] > todo.porChoke[a] ? k : a), 'pozo' as ChokeAnh)
  const texto = todo.diferido > 0 && todo.porChoke[mayor] > 0
    ? `${quien} se trabó sobre todo ${DONDE_PERIODO[mayor]}: ${n0(todo.porChoke[mayor])} bbl de ${n0(todo.diferido)}`
    : `${quien} no tuvo paradas que costaran crudo en el período`
  const textoEstructural = textoDeEstructural(todo.estructural, estructuralPorChoke, superado)
  return { ...todo, desde, hasta, porChokeEscalon: total.cruce, porCampo, superado, texto, ...(textoEstructural ? { textoEstructural } : {}) }
}

/** Las cifras de un campo con sus días: lo estructural, el potencial del
 *  sistema y lo que cabía en la holgura de los pozos los días en que no
 *  limitaban (QA-A-06). En esos días el campo perdió, contra lo que dejaba
 *  pasar el tramo que limitaba, solo lo que el real quedó por debajo; si las
 *  paradas del día suman más, el resto cabía en la holgura y no le costó nada.
 *  Ese resto sale de la PE no planeada en la misma proporción, para que la PE
 *  y la PE no planeada no pasen juntas del 100 %. */
function cifras(campoId: string, x: CampoDelPeriodo): BrechaCampoChoke {
  const estructuralPorChoke = ceros(ORDEN_CHOKE_CAMPO), horasPorDominante = ceros(ORDEN_CHOKE_CAMPO)
  let potencial = 0, real = 0, potencialPruebas = 0, cabiaEnHolgura = 0, npEnHolgura = 0
  for (const d of x.dias) {
    potencial += d.potencial; real += d.real; potencialPruebas += d.potencialPruebas
    if (!d.dominante) continue
    estructuralPorChoke[d.dominante] += d.estructural
    horasPorDominante[d.dominante] += d.horas
    const filas = x.porDia.get(d.dia)
    if (d.dominante === 'pozos' || d.superado || !filas || filas.total <= 0) continue
    const k = Math.min(1, Math.max(0, d.sistema - d.real) / filas.total)
    cabiaEnHolgura += filas.total * (1 - k)
    npEnHolgura += filas.noPlaneada * (1 - k)
  }
  const superado = x.dias.filter(d => d.superado).map(d => ({ dia: new Date(d.dia), choke: d.superado!.choke, capacidad: d.superado!.capacidad, real: d.real }))
  return armar(campoId, potencial, real, potencialPruebas, x.acc, estructuralPorChoke, horasPorDominante, cabiaEnHolgura,
    x.acc.porEscalon['disponibilidad-no-planeada'] - npEnHolgura, superado)
}

/** Las cifras de un campo (o del conjunto) a partir de lo acumulado. */
function armar(campoId: string, potencial: number, real: number, potencialPruebas: number, a: Acumulado,
  estructuralPorChoke: Record<ChokeCampo, number>, horasPorDominante: Record<ChokeCampo, number>,
  cabiaEnHolgura: number, noPlaneadaSistema: number, superado: BrechaCampoChoke['superado']): BrechaCampoChoke {
  const brecha = potencial - real
  const sumaChoke = CHOKES_Y_SIN_ASIGNAR.reduce((x, k) => x + a.porChoke[k], 0)
  const sinExplicar = brecha - sumaChoke
  const estructural = ORDEN_CHOKE_CAMPO.reduce((x, k) => x + estructuralPorChoke[k], 0)
  const potencialSistema = potencialPruebas - estructural
  const conHoras = ORDEN_CHOKE_CAMPO.filter(k => horasPorDominante[k] > 0)
  const dominante = conHoras.length ? conHoras.reduce((x, k) => (horasPorDominante[k] > horasPorDominante[x] ? k : x)) : null
  return {
    campoId, potencial, real, brecha, diferido: sumaChoke, porChoke: a.porChoke, porEscalon: a.porEscalon, porChokeEquipo: equiposDe(a), sinExplicar,
    cuadra: Math.abs(sinExplicar) <= 0.025 * Math.abs(potencial) + 1e-9, porConfirmar: a.porConfirmar,
    potencialPruebas, brechaPruebas: potencialPruebas - potencial,
    estructural, estructuralPorChoke, potencialSistema, brechaSistema: potencialSistema - real, cabiaEnHolgura, noPlaneadaSistema,
    pe: potencialSistema > 0 ? (real / potencialSistema) * 100 : 0,
    peNoPlaneada: potencialSistema > 0 ? (noPlaneadaSistema / potencialSistema) * 100 : 0,
    dominante, horasPorDominante, superado,
  }
}

/** La brecha estructural dicha en palabras, o por qué no se separó. */
function textoDeEstructural(estructural: number, porChoke: Record<ChokeCampo, number>, superado: BrechaChoke['superado']): string | undefined {
  const partes: string[] = []
  if (estructural >= 0.5) {
    const k = ORDEN_CHOKE_CAMPO.reduce((a, x) => (porChoke[x] > porChoke[a] ? x : a), 'planta' as ChokeCampo)
    partes.push(`${mayuscula(SUJETO[k])} no deja pasar todo lo que pueden dar los pozos: ${n0(estructural)} bbl de lo que no se produjo son de ahí, aunque nada pare. Ningún arreglo de equipos los recupera; solo más capacidad.`)
  }
  if (superado.length) {
    // Por campo y tramo: «La Ceiba, la planta: 16 días».
    const por = new Map<string, number>()
    for (const s of superado) por.set(`${s.campoId}|${s.choke}`, (por.get(`${s.campoId}|${s.choke}`) ?? 0) + 1)
    const cuales = [...por].map(([k, n]) => { const [c, ch] = k.split('|') as [string, ChokeCampo]; return `${campoPorId(c).nombre}, ${SUJETO[ch]}: ${n} ${n === 1 ? 'día' : 'días'}` })
    partes.push(`El real pasó la capacidad declarada (${cuales.join('; ')}): ese número está por debajo de lo que ya pasó y hay que revisarlo. Esos días no se separa nada estructural.`)
  }
  return partes.length ? partes.join(' ') : undefined
}

/** PE y PE no planeada por campo y período: la misma cuenta de `brechaPorChoke`. */
export function eficienciaProduccion(campoIds: string[], desde: Date, hasta: Date, ctx: Contexto, versiones?: Historial, op: OpcionesReparto = {}): { porCampo: EficienciaProduccion[]; total: EficienciaProduccion } {
  const b = brechaPorChoke(campoIds, desde, hasta, ctx, versiones, op)
  const de = (x: Pick<BrechaCampoChoke, 'real' | 'potencialSistema' | 'pe' | 'peNoPlaneada' | 'dominante'>) =>
    ({ real: x.real, potencialSistema: x.potencialSistema, pe: x.pe, peNoPlaneada: x.peNoPlaneada, dominante: x.dominante })
  return { porCampo: b.porCampo.map(x => ({ campoId: x.campoId, ...de(x) })), total: de(b) }
}

/* ───────────────────────── lo que se pierde ahora ───────────────────────── */

/** Lo que se pierde ahora en un pozo con un evento abierto: el crudo asignado,
 *  o la parte que no da a frecuencia reducida (la misma cuenta de `riesgoAhora`). */
const perdiendoDe = (p: ReturnType<typeof pozosDe>[number], e: ReturnType<typeof estadoAhora>) =>
  crudoAsignado(p) * (e.produce ? perdidaPorFrecuencia(e.hz, pruebaEn(p, ahora)?.hz) : 1)

/** El tramo de cada evento abierto, con la clasificación vigente de su fila de
 *  hoy (la última, si el día tiene dos: el exceso de un programa). Sin fila, el
 *  que propone el motor del choke. Null: sin identificar. */
function tramosDeHoy(campoId: string, ctx: Contexto, op: OpcionesReparto): Map<string, ChokeAnh | null> {
  const hoy = inicioDiaCo(ahora)
  const m = new Map<string, ChokeAnh | null>()
  for (const p of filasDelChoke([campoId], new Date(hoy), AHORA, ctx, op.guardadas)) {
    const k = tramoVigente(p)
    m.set(p.eventoId, k === 'sin-asignar' ? null : k)
  }
  return m
}

/** Lo que se pierde ahora, pozo por pozo, juntado por tramo y equipo: la misma
 *  cuenta de `riesgoAhora`, con el tramo de la clasificación vigente de la fila
 *  de hoy de cada pozo (lo que corrigió una persona mueve también lo de ahora),
 *  sus pozos y desde cuándo. */
function perdiendoPorTramo(campoId: string, ctx: Contexto, op: OpcionesReparto): PerdiendoAhora[] {
  const deHoy = tramosDeHoy(campoId, ctx, op)
  const por = new Map<string, PerdiendoAhora>()
  for (const p of pozosDe(campoId)) {
    const e = estadoAhora(p)
    if (!e.evento) continue
    const c = causaDeEvento(e.evento, ctx)
    const ch = chokeDeCausa(c, campoId, ctx)
    const tramo = deHoy.has(e.evento.id) ? deHoy.get(e.evento.id)! : ch?.choke ?? null, equipo = ch?.elemento ?? c.equipo
    const k = `${tramo}|${equipo}`
    const inicio = new Date(e.evento.inicio)
    const x = por.get(k) ?? { tramo, bpd: 0, equipo, pozos: 0, listaPozos: [], desde: inicio }
    x.bpd += perdiendoDe(p, e)
    x.pozos++
    x.listaPozos = [...x.listaPozos, p.id].sort()
    if (inicio < x.desde) x.desde = inicio
    por.set(k, x)
  }
  return [...por.values()].sort((a, b) => b.bpd - a.bpd)
}

/** Sin topología, el tramo de un tipo de causa (P1 §2.1). */
const chokePorTipo = (t: TipoCausa): ChokeAnh => (t === 'electrosumergible' || t === 'levantamiento' ? 'pozo' : 'planta')

/** El tramo de una fila de `riesgoAhora` (U2 §11.1, «perdiéndose ahora por
 *  tramo»). Perdiendo: el de la clasificación vigente de las filas de hoy de
 *  los pozos que la fila junta; si juntara dos tramos (una baja tensión de un
 *  pozo y una de la red tienen el mismo equipo), el que más pierde. En riesgo:
 *  el del equipo, donde se trabaría si falla. Null: sin identificar. */
export function tramoDeRiesgo(r: Riesgo, ctx: Contexto, op: OpcionesReparto = {}): ChokeAnh | null {
  if (r.estado === 'perdiendo') {
    const deHoy = tramosDeHoy(r.campoId, ctx, op)
    const por = new Map<ChokeAnh | null, number>()
    for (const p of pozosDe(r.campoId)) {
      const e = estadoAhora(p)
      if (!e.evento) continue
      const c = causaDeEvento(e.evento, ctx)
      if (c.equipo !== r.equipo || c.tipo !== r.tipo) continue
      const k = deHoy.has(e.evento.id) ? deHoy.get(e.evento.id)! : chokeDeCausa(c, r.campoId, ctx)?.choke ?? null
      por.set(k, (por.get(k) ?? 0) + perdiendoDe(p, e))
    }
    let mejor: ChokeAnh | null = null, max = -1
    for (const [k, v] of por) if (v > max) { mejor = k; max = v }
    return mejor
  }
  // «Todavía no sé»: dónde se trabaría no se adivina.
  if (porSaberDelCampo(r.campoId, ctx).includes(r.equipo)) return null
  return elementoDe(r.campoId, r.equipo, ctx)?.choke ?? chokePorTipo(r.tipo)
}

/* ───────────────────────── la tubería del campo ───────────────────────── */

/** Lo que queda hoy del tren de agua con una bomba parada: las bombas en
 *  marcha (una sin instrumento se cuenta en marcha: TRIM no la ve parar), en
 *  agua y pasado a crudo con el corte de las pruebas, como el carril del agua.
 *  Con el agua que entra ahora, lo que todavía cabe (B-14). */
function aguaDisponibleHoy(campoId: string, cap: CapacidadesVigentes, p: PotencialesCampo): TramoTuberia['disponibleHoy'] | undefined {
  const enServicio = cap.bombas.filter(b => !b.reserva)
  const paradas = enServicio.filter(b => perfilBomba(b.equipo, campoId) && paradasDe(b.equipo, campoId).some(e => !e.fin))
  if (!paradas.length) return undefined
  const total = enServicio.reduce((a, b) => a + b.valor, 0)
  const agua = total - paradas.reduce((a, b) => a + b.valor, 0)
  const valor = Math.round(agua * p.crudoPorAgua)
  const entraBpd = caudalesAhora(campoId).agua
  const cabeBpd = Math.max(0, (agua - entraBpd) * p.crudoPorAgua)
  const equipo = paradas.map(b => b.equipo).join(', ')
  return { valor, unidad: 'bbl/d de crudo', agua: { valor: agua, de: total }, equipo, entraBpd, cabeBpd,
    texto: `hoy, sin ${equipo}: ${n0(agua)} de ${n0(total)} bbl/d de agua, unos ${n0(valor)} bbl/d de crudo; ya entran ${n0(entraBpd)} de agua` }
}

/** La frase de hoy cuando un equipo parado deja el agua de la planta por
 *  debajo de lo que pueden dar los pozos (B-14): lo que den de más los pozos ya
 *  no pasa, o pasa solo hasta lo que cabe. Undefined si nada la angosta hoy o
 *  si, aun con la parada, cabe todo lo que dan los pozos. */
function fraseDeHoy(p: PotencialesCampo, d: NonNullable<TramoTuberia['disponibleHoy']>): string | undefined {
  if (p.agua > 0 && d.agua.valor >= p.agua) return undefined
  const con = `con ${d.equipo} ${d.equipo.includes(',') ? 'paradas' : 'parada'}`
  return d.cabeBpd < 0.5
    ? `Hoy no: ${con}, el agua de la planta está llena (entran ${n0(d.entraBpd)} de ${n0(d.agua.valor)} bbl/d). Lo que den de más los pozos no pasa hasta que vuelva.`
    : `Hoy, ${con}, el agua de la planta deja pasar ${n0(d.agua.valor)} bbl/d y ya entran ${n0(d.entraBpd)}: lo que den de más los pozos pasa solo hasta unos ${n0(d.cabeBpd)} bbl/d de crudo, hasta que vuelva.`
}

const DIA_MS = 86_400_000
/** La prueba más vieja de los pozos con prueba: con ella se sabe qué tan al día está el potencial de los pozos. */
function pruebaMasViejaDe(campoId: string): TramoTuberia['pruebaMasVieja'] {
  let mas: { pozo: string; fecha: Date } | undefined
  for (const p of pozosDe(campoId)) {
    const pr = p.pruebas.length ? pruebaEn(p, ahora) : undefined
    if (!pr) continue
    const f = new Date(pr.fecha)
    if (!mas || f < mas.fecha) mas = { pozo: p.id, fecha: f }
  }
  if (!mas) return undefined
  const dias = Math.max(0, Math.floor((ahora - mas.fecha.getTime()) / DIA_MS))
  return { ...mas, dias, texto: `la prueba más vieja es de hace ${n0(dias)} ${dias === 1 ? 'día' : 'días'} (${mas.pozo}, ${fechaCorta(mas.fecha)})` }
}

/** El medidor del punto oficial: comunica si trae el dato del último día
 *  completo; si no, desde qué día no llega. Lo que el demo no registra no se inventa. */
function medidorDe(campoId: string): MedidorDelCampo | undefined {
  const origen = origenPmo(campoId)
  if (!origen) return undefined
  const ayer = fiscalDeAyer(campoId)
  if (ayer.bbl !== null) return { medidor: origen.fuente, estado: 'en-linea', ultimoDia: { dia: ayer.fecha, bbl: ayer.bbl },
    texto: `Punto de medición oficial (${origen.fuente}): en línea; el último día completo dio ${n0(ayer.bbl)} bbl` }
  // Los días que no llegaron, contados hacia atrás desde el último día completo.
  const dias = fiscalUltimosDias(campoId, 120)
  let sin = 0
  for (let i = dias.length - 1; i >= 0 && dias[i] === null; i--) sin++
  const desde = new Date(ayer.fecha.getTime() - (sin - 1) * DIA_MS)
  return { medidor: origen.fuente, estado: 'sin-comunicacion', desde,
    texto: `Sin comunicación con el punto de medición oficial (${origen.fuente}) desde el ${fechaCorta(desde)}: lo real de esos días queda sin dato` }
}

/** Si las capacidades de la planta y de afuera están firmadas, y quién las firmó. */
function capacidadesDeLaTuberia(p: PotencialesCampo, versiones?: Historial): CapacidadesDeLaTuberia {
  const cap = p.capacidades
  const usadas = [...p.trenes.filter(x => x.medido).map(x => x.estado), cap.afuera.estado].filter(e => e !== 'sin-dato')
  const firma = versiones?.length ? firmaDeCapacidades(versiones, p.campoId) : undefined
  const quien = firma ? ` el ${fechaCorta(new Date(firma.fecha))} por ${firma.por.split(' · ')[0]}` : ''
  if (usadas.length && usadas.every(e => e === 'firmado')) return { estado: 'firmadas', ...(firma ? { firma } : {}), texto: `capacidades firmadas${quien}` }
  if (usadas.some(e => e === 'firmado')) return { estado: 'parte', ...(firma ? { firma } : {}), texto: `capacidades: unas firmadas${quien}, otras del demo, sin firmar` }
  return { estado: 'demo', texto: 'capacidades del demo, sin firmar' }
}

/** De dónde sale lo que pueden dar los pozos, en palabras (el ⓘ de «Los pozos», D3). */
const fuentePozos = (p: PotencialesCampo) => `La suma de lo que dan los pozos con su prueba vigente${p.factorMedicion === 1 ? '' : ` × el factor de medición firmado (${p.factorMedicion.toLocaleString('es-CO')})`}. No lleva el factor de asignación del mes: ese sale de lo que ya pasó por la planta y escondería lo que la limita. El libro sí lo usa para valorar lo diferido (unos ${n0(p.pozosAsignado)} bbl/d hoy): son dos preguntas distintas`

/** La tubería de un campo para las vistas, en una sola lectura (U2 §11.1):
 *  los tramos de hoy con lo que limita, lo que pasa ahora, lo que se está
 *  perdiendo por tramo y lo que se perdió en el período por tramo, con el
 *  MISMO total del libro y el tramo vigente de cada fila. Los dos cuadres de
 *  U2 §2.2: lo que dan los pozos − lo que pasa hoy − lo que se pierde ahora =
 *  lo que las pruebas dan de más que el punto oficial (D3; cero si coinciden),
 *  y el reparto por tramo + sin identificar = el diferido del libro.
 *  Con el historial de versiones, cada día usa las capacidades que regían y se
 *  dice quién firmó las de hoy. */
export function tuberiaCampo(campoId: string, desde: Date, hasta: Date, ctx: Contexto, versiones?: Historial, op: OpcionesReparto = {}): TuberiaCampo {
  const p = potencialesDelCampo(campoId, ahora, ctx, versiones)
  const b = brechaPorChoke([campoId], desde, hasta, ctx, versiones, op)
  const ahoraPorTramo = perdiendoPorTramo(campoId, ctx, op)
  const pl = Object.hasOwn(CAMPO_PLANTA, campoId) ? CAMPO_PLANTA[campoId] : undefined
  const cap = p.capacidades
  const enTramo = (k: ChokeAnh) => ahoraPorTramo.filter(x => x.tramo === k).reduce((a, x) => a + x.bpd, 0)
  const tramo = (k: ChokeAnh, x: Pick<TramoTuberia, 'potencialBpd' | 'fuente' | 'estado'> & Partial<TramoTuberia>): TramoTuberia => ({
    tramo: k, nombre: NOMBRE_CHOKE[k], explica: EXPLICA_TRAMO[k], holguraBpd: null, limita: false, casiIgual: false,
    perdiendoAhoraBpd: enTramo(k), perdidoBbl: b.porChoke[k], equiposTop: b.porChokeEquipo[k].slice(0, 3), ...x })
  const casi = (k: ChokeCampo) => !!p.casiIguales?.includes(k)
  const disponible = p.campoDeGas || !pl ? undefined : aguaDisponibleHoy(campoId, cap, p)
  const menor = p.trenes.find(x => x.tren === p.trenQueLimita)
  const gas = 'Campo de gas: la tubería del gas todavía no está'
  const vieja = pruebaMasViejaDe(campoId)
  const tramos: TramoTuberia[] = [
    tramo('reservorio', { potencialBpd: null, estado: 'sin-dato', fuente: 'El yacimiento no tiene un número propio: lo que puede dar se mide con las pruebas de los pozos' }),
    tramo('pozo', { potencialBpd: p.pozos, estado: 'pruebas', fuente: fuentePozos(p),
      holguraBpd: p.holgura.pozos, limita: p.dominante === 'pozos', casiIgual: casi('pozos'), ...(vieja ? { pruebaMasVieja: vieja } : {}) }),
    tramo('planta', { potencialBpd: p.planta, estado: p.planta === null || !menor ? 'sin-dato' : menor.estado,
      fuente: p.campoDeGas ? gas : !pl ? 'Sin esquema de planta' : !menor ? 'Ningún tren medido con capacidad: no se sabe cuánto deja pasar'
        : `El más angosto de sus trenes medidos: ${TREN_FRASE[menor.tren]}. ${menor.tren === 'crudo' ? cap.crudo.fuente : menor.tren === 'agua' ? cap.agua.fuente : cap.gas.fuente}. El agua se pasa a crudo con el corte de las pruebas; el gas no se mide en esta fase`,
      holguraBpd: p.holgura.planta, limita: p.dominante === 'planta', casiIgual: casi('planta'), trenes: p.trenes,
      ...(p.trenQueLimita ? { trenQueLimita: p.trenQueLimita } : {}), ...(disponible ? { disponibleHoy: disponible } : {}) }),
    tramo('exportacion', { potencialBpd: p.exportacion, estado: p.exportacion === null ? 'sin-dato' : cap.afuera.estado,
      fuente: p.campoDeGas ? gas : !pl ? 'Sin esquema de planta' : cap.afuera.fuente,
      holguraBpd: p.holgura.exportacion, limita: p.dominante === 'exportacion', casiIgual: casi('exportacion'),
      ...(pl && !p.campoDeGas ? { subniveles: [
        ...(cap.afuera.valor !== null ? [{ nombre: 'El oleoducto o el transportador', potencialBpd: cap.afuera.valor, fuente: cap.afuera.fuente, estado: cap.afuera.estado }] : []),
        ...(cap.mercado.valor !== null ? [{ nombre: 'El terminal o el cliente (mercado)', potencialBpd: cap.mercado.valor, estado: cap.mercado.estado,
          fuente: `${cap.mercado.fuente}. Es un subnivel de afuera: no baja lo que puede pasar afuera` }] : []),
      ] } : {}) }),
  ]
  const nombre = campoPorId(campoId).nombre
  const sinTramoBbl = b.porChoke['sin-asignar']
  const mayor = ORDEN_CHOKE.reduce((a, k) => (b.porChoke[k] > b.porChoke[a] ? k : a), 'pozo' as ChokeAnh)
  const pct = (x: number) => Math.round((x / b.diferido) * 100)
  const fraseGerente = b.diferido <= 0 ? `Nada se trabó en ${nombre} en el período.`
    : `${nombre}: ${pct(b.porChoke[mayor])} % ${DONDE_PERIODO[mayor]}${b.porChokeEquipo[mayor].length ? ` (${b.porChokeEquipo[mayor].slice(0, 2).map(x => x.equipo).join(', ')})` : ''}${sinTramoBbl > 0 ? `; ${pct(sinTramoBbl)} % sin identificar` : ''}`
  const medidor = medidorDe(campoId)
  const pasaHoyBpd = caudalesAhora(campoId).crudo
  const perdiendoAhoraBpd = ahoraPorTramo.reduce((a, x) => a + x.bpd, 0)
  const fraseHoy = disponible && p.dominante !== null ? fraseDeHoy(p, disponible) : undefined
  return {
    campoId, desde, hasta, tramos, limita: p.dominante, casiIguales: p.casiIguales, umbral: p.umbral, empate: p.empate,
    pasaHoyBpd, perdiendoAhora: ahoraPorTramo, perdiendoAhoraBpd, sinTramoAhoraBpd: ahoraPorTramo.filter(x => x.tramo === null).reduce((a, x) => a + x.bpd, 0),
    brechaPruebasBpd: p.pozos - pasaHoyBpd - perdiendoAhoraBpd,
    perdidoPeriodo: ORDEN_CHOKE.map(k => ({ tramo: k, bbl: b.porChoke[k], equiposTop: b.porChokeEquipo[k].slice(0, 3) })),
    sinTramoBbl, sinTramoEquipos: b.porChokeEquipo['sin-asignar'], diferido: b.diferido, campoDeGas: p.campoDeGas,
    capacidades: capacidadesDeLaTuberia(p, versiones), ...(medidor ? { medidor } : {}),
    textoCorto: p.textoCorto, frase: p.texto, ...(fraseHoy ? { fraseHoy } : {}), fraseGerente,
  }
}

/* ───────────────────────── mes a mes y contra la línea base ───────────────────────── */

/** Lo no planeado de cada tramo: su escalón `disponibilidad-no-planeada`, la
 *  cifra del norte (D4). Lo sin identificar no es no planeado: va en cero. */
const noPlaneadoPorTramo = (b: Pick<BrechaChoke, 'porChokeEscalon'>) =>
  Object.fromEntries(CHOKES_Y_SIN_ASIGNAR.map(k => [k, b.porChokeEscalon[k]['disponibilidad-no-planeada']])) as Record<ChokeOSinAsignar, number>

/** El reparto por tramo de cada mes del calendario, con los mismos meses de
 *  `serieMensual` (libro.ts) y el mismo total. */
export function repartoPorMes(campoIds: string[], ctx: Contexto, versiones?: Historial, op: OpcionesReparto = {}): MesPorTramo[] {
  return calendario().map(m => {
    const b = brechaPorChoke(campoIds, new Date(m.desde), new Date(m.hasta), ctx, versiones, op)
    return { mes: m.mes, desde: new Date(m.desde), hasta: new Date(m.hasta), parcial: !publicadoEnTodos(campoIds, m.mes),
      porTramo: b.porChoke, noPlaneado: noPlaneadoPorTramo(b), diferido: b.diferido }
  })
}

/** La línea base por tramo: la misma base de `lineaBase` (libro.ts, los tres
 *  meses publicados antes del período) repartida por tramo, con lo no planeado
 *  de cada tramo en el escalón del norte (D4). Sin tres meses de historia, no hay base. */
export function lineaBasePorTramo(campoIds: string[], desde: Date, hasta: Date, ctx: Contexto, versiones?: Historial, op: OpcionesReparto = {}): LineaBasePorTramo | undefined {
  const lb = lineaBase(campoIds, desde, hasta, ctx)
  if (!lb) return undefined
  const b0 = brechaPorChoke(campoIds, lb.desde, lb.hasta, ctx, versiones, op), b1 = brechaPorChoke(campoIds, desde, hasta, ctx, versiones, op)
  const dias = (a: Date, z: Date) => Math.max(1e-9, (Math.min(z.getTime(), ahora) - a.getTime()) / D)
  const d0 = dias(lb.desde, lb.hasta), d1 = dias(desde, hasta)
  const fila = (x: number, y: number): AntesYDespues => ({ baseDia: x / d0, periodoDia: y / d1, cambio: x > 0 ? (y / d1 - x / d0) / (x / d0) : null })
  const np0 = noPlaneadoPorTramo(b0), np1 = noPlaneadoPorTramo(b1)
  const noPlaneado = Object.fromEntries(CHOKES_Y_SIN_ASIGNAR.map(k => [k, fila(np0[k], np1[k])])) as Record<ChokeOSinAsignar, AntesYDespues>
  const diferido = Object.fromEntries(CHOKES_Y_SIN_ASIGNAR.map(k => [k, fila(b0.porChoke[k], b1.porChoke[k])])) as Record<ChokeOSinAsignar, AntesYDespues>
  const quien = campoIds.length === 1 ? `En ${campoPorId(campoIds[0]!).nombre}` : 'En el conjunto de campos'
  const LO_DE: Record<ChokeAnh, string> = { reservorio: 'lo del yacimiento', pozo: 'lo de los pozos', planta: 'lo de la planta', exportacion: 'lo de afuera' }
  const bajo = ORDEN_CHOKE.filter(k => (noPlaneado[k].cambio ?? 0) < 0)
  const subio = ORDEN_CHOKE.filter(k => (noPlaneado[k].cambio ?? 0) > 0)
  const texto = !bajo.length && !subio.length ? `${quien} lo no planeado no cambió por tramo.`
    : `${quien} ${[bajo.length ? `bajó lo que se trabó ${listaY(bajo.map(k => DONDE_PERIODO[k]))}` : '', subio.length ? `subió ${listaY(subio.map(k => LO_DE[k]))}` : ''].filter(Boolean).join(' y ')}.`
  return { base: { desde: lb.desde, hasta: lb.hasta, nombre: lb.nombre }, periodo: { desde, hasta }, noPlaneado, diferido, texto }
}

/* ───────────────────────── el choke en el tiempo ───────────────────────── */

/** La serie diaria de lo que limitó y de la brecha por tramo y por escalón,
 *  con `porDia` y las filas de cada día (su clasificación vigente): cada día
 *  suma lo mismo que el libro de ese día y los días suman la brecha del
 *  período (`brechaPorChoke`). El aviso de cambio respeta el umbral y la
 *  persistencia (PARAMETROS_CHOKE); `vueltas` cuenta, por campo, los cambios
 *  del dominante sin ese filtro (U2 §7.1: sin él, La Ceiba cambiaría siete
 *  veces en trece meses). */
export function serieChoke(campoIds: string[], desde: Date, hasta: Date, ctx: Contexto, versiones?: Historial, op: OpcionesReparto = {}): { dias: DiaChoke[]; cambios: CambioDominante[]; vueltas: Record<string, number> } {
  const d0 = desde.getTime(), hh = Math.min(hasta.getTime(), ahora)
  const dias = new Map<number, DiaChoke>()
  for (const x of porDia(campoIds, desde, hasta, ctx)) dias.set(x.dia.getTime(), {
    dia: x.dia, horas: x.horas, real: x.real, potencial: x.potencial, potencialPruebas: 0, potencialSistema: 0, estructural: 0, brechaPruebas: 0, cabiaEnHolgura: 0,
    diferido: x.diferido, residuo: x.residuo, porChoke: ceros(CHOKES_Y_SIN_ASIGNAR), porEscalon: ceros(ESCALONES),
    dominante: {}, casiIguales: {}, potenciales: {}, superado: {},
  })
  // Las filas de cada día, con lo que rige en cada una: el barril de cada día es el del libro.
  const porCampoDia = new Map<string, number>()
  for (const f of leer(filasDelChoke(campoIds, desde, hasta, ctx, op.guardadas), d0, hh, ctx)) {
    const d = dias.get(f.dia)
    if (!d) continue
    d.porChoke[f.tramo] += f.bbl
    d.porEscalon[f.escalon] += f.bbl
    const k = `${f.p.campoId}|${f.dia}`
    porCampoDia.set(k, (porCampoDia.get(k) ?? 0) + f.bbl)
  }
  for (const c of campoIds) for (const x of diasDelCampo(c, d0, hh, ctx, versiones)) {
    const d = dias.get(x.dia)
    if (!d) continue
    d.potencialPruebas += x.potencialPruebas
    d.potencialSistema += x.sistema
    d.estructural += x.estructural
    d.brechaPruebas += x.potencialPruebas - x.potencial
    d.potenciales[c] = x.tasas
    if (x.dominante) { d.dominante[c] = x.dominante; d.casiIguales[c] = x.casiIguales }
    if (x.superado) d.superado[c] = x.superado.choke
    const fs = porCampoDia.get(`${c}|${x.dia}`) ?? 0
    if (x.dominante && x.dominante !== 'pozos' && !x.superado && fs > 0) d.cabiaEnHolgura += fs * (1 - Math.min(1, Math.max(0, x.sistema - x.real) / fs))
  }
  const orden = [...dias.values()].sort((a, b) => a.dia.getTime() - b.dia.getTime())
  const { diasParaCambio } = PARAMETROS_CHOKE
  const cambios: CambioDominante[] = []
  const vueltas: Record<string, number> = {}
  for (const c of campoIds) {
    let vigente: ChokeCampo | undefined, anterior: ChokeCampo | undefined
    // El último día claro del tramo vigente: el «antes» del aviso se dice con lo que dejaba pasar ese día.
    let ultimo: DiaChoke | undefined
    let racha: { k: ChokeCampo; desde: DiaChoke; dias: number } | undefined
    vueltas[c] = 0
    for (const d of orden) {
      const k = d.dominante[c]
      if (!k) continue
      if (anterior && k !== anterior) vueltas[c]++
      anterior = k
      // Casi iguales: no cuenta para ningún tramo (U2 §7.2).
      if (d.casiIguales[c]) { racha = undefined; continue }
      // El primer estado claro: no hay «antes» que avisar.
      if (vigente === undefined) { vigente = k; ultimo = d; continue }
      if (k === vigente) { racha = undefined; ultimo = d; continue }
      racha = racha?.k === k ? { ...racha, dias: racha.dias + 1 } : { k, desde: d, dias: 1 }
      if (racha.dias < diasParaCambio) continue
      const pot = racha.desde.potenciales[c], antes = (ultimo ?? racha.desde).potenciales[c]
      const valorBpd = pot?.[k] ?? 0
      const cual = (x: ChokeCampo, q: typeof pot) => `${SUJETO[x]}${x === 'planta' && q?.tren ? ` · ${TREN_NOMBRE[q.tren]}` : ''}`
      cambios.push({ campoId: c, dia: racha.desde.dia, de: vigente, a: k, valorBpd,
        texto: `Cambió lo que limita en ${campoPorId(c).nombre}: desde el ${fechaCorta(racha.desde.dia)} ${k === 'pozos' ? 'limitan' : 'limita'} ${cual(k, pot)} (${n0(valorBpd)} bbl/d); antes, ${cual(vigente, antes)} (${n0(antes?.[vigente] ?? 0)}). Cambian los equipos que más cuestan si fallan: revise «Si falla hoy».` })
      vigente = k
      ultimo = racha.desde
      racha = undefined
    }
  }
  cambios.sort((a, b) => a.dia.getTime() - b.dia.getTime() || a.campoId.localeCompare(b.campoId))
  return { dias: orden, cambios, vueltas }
}
