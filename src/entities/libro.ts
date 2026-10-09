/** El libro de diferidos: cuántos barriles no se produjeron, de qué pozo, por
 *  qué equipo y por qué parte, con su tolerancia y su cadena de custodia.
 *
 *  Es ASIGNACIÓN DE PRODUCCIÓN por pozo, como se reparte la producción fiscal:
 *
 *   real del mes (R)   = producción fiscal del punto de medición oficial
 *   teórico del mes (T)= Σ pozos con prueba: crudo de la prueba vigente ×
 *                        horas que produjo ÷ 24 (a frecuencia reducida, la parte
 *                        que produjo: hz ÷ hz de la prueba)
 *   factor (FA)        = R ÷ T   · debe caer en la banda de la Res. 40236
 *   potencial          = Σ pozos con prueba: crudo de la prueba × FA × horas ÷ 24
 *   diferido de un paro= crudo de la prueba × FA × horas apagado ÷ 24
 *                        (a frecuencia reducida: × (1 − hz ÷ hz de la prueba))
 *
 *  Por construcción, en un mes la suma de los diferidos es exactamente
 *  potencial − real. Lo que queda es el efecto del inventario de cada día
 *  cuando el período no es un mes entero. Cada barril lleva su causa
 *  (`causa-senal.ts`) y los tags que la sostienen.
 *
 *  Nada de esto lo escribe una persona, salvo las metas y la configuración,
 *  y la respuesta de un operario cuando la señal no explica una parada.
 *
 *  Contrato: `GET /api/vistas/diferidos?campos=&desde=&hasta=` (CONTRATO.md; la forma del JSON, en shared/api/contrato.ts).
 */
import { pozosDe, pozoDe, todosLosPozos, pruebaEn, servicioPorId, produccionDiaria, origenPmo, eventosDeCampo, type Pozo, type EventoPozo, type ProduccionMes } from './pozos'
import { perezoso } from './insumos'
import { eventosBomba, paradaPorId, paradasDeCampo, perfilBomba } from './bombas'
import {
  causaDeEvento, causaDeParada, estadoIdentificacion, ALTO_IMPACTO,
  type Causa, type Contexto, type TipoCausa, type ComoSeIdentifico,
} from './causa-senal'
import { METROLOGIA_CAMPO, toleranciaAsignacion } from './metrologia'
import { campoPorId } from './campos'
import { metaEn, precioEn, criterioEn, configInicial, SIN_META, type Config } from './configuracion'
import { partesDe, type ParteId, type Familia } from './partes'
import { AHORA } from './reloj'

const H = 3_600_000, D = 86_400_000
const ahora = AHORA.getTime()
const ms = (s: string) => new Date(s).getTime()
const RESOLUCION_PLC_H = 1 / 3600
const suma = (xs: Array<{ bbl: number }>) => xs.reduce((a, t) => a + t.bbl, 0)
/** Agrega `x` a la lista de `k`. Con `push`: copiar la lista en cada elemento volvía cuadráticas las agrupaciones. */
function anotar<K, T>(m: Map<K, T[]>, k: K, x: T) { const g = m.get(k); if (g) g.push(x); else m.set(k, [x]) }
/** La causa del cierre la dijo una persona: la parada propia del pozo que
 *  alguien declaró (con o sin la parte de la electrosumergible). Una bomba de
 *  la línea con la parte declarada no cuenta aquí: que paró lo prueba su señal. */
const esDeclarado = (t: { causa: { tipo: string; como: string; evento?: string }; evento: { id: string } }) =>
  t.causa.tipo === 'declarada' || (t.causa.como === 'declarado' && t.causa.evento === t.evento.id)

export const FUENTE_POTENCIAL = 'Pruebas instrumentadas de cada pozo × factor de asignación'
export const FUENTE_REAL = 'Producción fiscal del punto de medición oficial'
/** El contexto con que arranca la sesión: la configuración de arranque y
 *  ninguna respuesta. Siempre el mismo objeto: las cachés van por identidad. */
export const contextoInicial = perezoso((): Contexto => ({ config: configInicial(), respuestas: {} }))

/* ───────────────────────────── calendario ───────────────────────────── */

export interface Mes { mes: string; desde: number; hasta: number; publicado: boolean }

const inicioMes = (mes: string) => ms(`${mes}-01T00:00:00-05:00`)
const sigMes = (mes: string) => { const [y, m] = mes.split('-').map(Number); return m === 12 ? `${y! + 1}-01` : `${y}-${String(m! + 1).padStart(2, '0')}` }

/* La producción fiscal de cada campo y mes. Cada campo publica su mes por su
   cuenta: la marca de publicado es de ESE campo, no del primero de la lista. */
const FISCAL = perezoso(() => new Map<string, ProduccionMes>(produccionDiaria().map(m => [`${m.campoId}|${m.mes}`, m])))
const CAMPOS_FISCALES = perezoso(() => [...new Set(produccionDiaria().map(m => m.campoId))])
/** ¿El campo ya publicó ese mes? */
export const publicadoEn = (campoId: string, mes: string) => FISCAL().get(`${campoId}|${mes}`)?.publicado ?? false
/** ¿Todos esos campos publicaron el mes? */
export const publicadoEnTodos = (campoIds: string[], mes: string) => campoIds.every(c => publicadoEn(c, mes))

/** Los meses que hay en la producción fiscal de cualquier campo, del más
 *  viejo al más nuevo. `publicado`: publicado en TODOS los campos; lo de un
 *  campo lo dice `publicadoEn`. */
export const calendario = perezoso((): Mes[] => [...new Set(produccionDiaria().map(m => m.mes))].sort()
  .map(mes => ({ mes, desde: inicioMes(mes), hasta: Math.min(inicioMes(sigMes(mes)), ahora), publicado: publicadoEnTodos(CAMPOS_FISCALES(), mes) })))
const mesDe = (t: number) => calendario().find(m => m.desde <= t && t < m.hasta)
/** Un mes está cerrado cuando ya empezó el siguiente: el de hoy tiene `hasta` = ahora, pero no ha cerrado. */
export const mesCerrado = (m: Mes) => inicioMes(sigMes(m.mes)) <= ahora

/* ───────────── pre-cálculo por campo: horas perdidas, teórico y factor ───────────── */

const crudo = (p: Pozo, dia: number) => (p.pruebas.length ? pruebaEn(p, dia)?.crudoBpd ?? 0 : 0)
const agua = (p: Pozo, dia: number) => (p.pruebas.length ? pruebaEn(p, dia)?.aguaBpd ?? 0 : 0)

/** Fracción del caudal que se deja de producir a frecuencia reducida: por ley
 *  de afinidad, 1 − hz ÷ hz de la prueba, entre 0 y 1. Si falta una de las dos
 *  frecuencias no se sabe cuánto produjo: se cuenta como cerrado (1), y el
 *  tramo ya va marcado como aproximado. La misma regla en el libro, el día a
 *  día, el riesgo y la predicción. */
export function perdidaPorFrecuencia(hz: number | undefined, hzPrueba: number | undefined): number {
  if (!hz || !hzPrueba) return 1
  return Math.min(1, Math.max(0, 1 - hz / hzPrueba))
}
const fraccion = (ev: EventoPozo, p: Pozo, dia: number) => ev.codigo === 'HZ' ? perdidaPorFrecuencia(ev.hz, pruebaEn(p, dia)?.hz) : 1

/** Recorre un intervalo por días: [inicio del día, horas dentro]. */
function porDias(a: number, b: number, f: (dia: number, horas: number) => void) {
  for (const m of calendario()) {
    if (b <= m.desde || a >= m.hasta) continue
    for (let d = m.desde; d < m.hasta; d += D) {
      const fin = Math.min(d + D, m.hasta)
      const h = (Math.min(b, fin) - Math.max(a, d)) / H
      if (h > 0) f(d, h)
    }
  }
}

/* ─────────── eventos que se pisan: cada hora del pozo se cobra una vez ─────────── */

/** Lo que de verdad cobra cada evento de pozo: su intervalo menos lo que ya
 *  cubre otro evento del mismo pozo que manda. Un paro manda sobre una
 *  frecuencia reducida (con el pozo cerrado no hay frecuencia que reducir);
 *  entre dos del mismo tipo, el que empezó primero. Así una hora del pozo
 *  nunca se cobra dos veces y potencial − real sigue siendo la suma exacta de
 *  los diferidos aunque el controlador mande eventos que se cruzan. */
const EFECTIVO = new Map<string, Map<string, Array<[number, number]>>>()
function intervalosEfectivos(campoId: string): Map<string, Array<[number, number]>> {
  const ya = EFECTIVO.get(campoId)
  if (ya) return ya
  const out = new Map<string, Array<[number, number]>>()
  const porPozo = new Map<string, EventoPozo[]>()
  for (const ev of eventosDeCampo(campoId)) anotar(porPozo, ev.pozo, ev)
  for (const evs of porPozo.values()) {
    const orden = [...evs].sort((a, b) => Number(a.codigo === 'HZ') - Number(b.codigo === 'HZ') || ms(a.inicio) - ms(b.inicio) || a.id.localeCompare(b.id))
    const cubierto: Array<[number, number]> = []
    for (const ev of orden) {
      let libres: Array<[number, number]> = [[ms(ev.inicio), ev.fin ? ms(ev.fin) : ahora]]
      for (const [c0, c1] of cubierto) {
        libres = libres.flatMap(([a, b]): Array<[number, number]> => (c1 <= a || c0 >= b) ? [[a, b]]
          : [...(c0 > a ? [[a, c0] as [number, number]] : []), ...(c1 < b ? [[c1, b] as [number, number]] : [])])
      }
      out.set(ev.id, libres)
      cubierto.push(...libres)
    }
  }
  EFECTIVO.set(campoId, out)
  return out
}

/** Recorre por días lo que un evento cobra dentro de [a, b). */
function porDiasDelEvento(campoId: string, ev: EventoPozo, a: number, b: number, f: (dia: number, horas: number) => void) {
  for (const [x, y] of intervalosEfectivos(campoId).get(ev.id) ?? []) {
    const i = Math.max(a, x), j = Math.min(b, y)
    if (j > i) porDias(i, j, f)
  }
}

interface Calc {
  /** Factor de asignación de cada mes con al menos un día fiscal: lo real ÷
   *  lo teórico DE LOS DÍAS CON DATO. Un día que el computador de flujo no
   *  reportó no entra como cero: bajaría el factor y con él todo el mes. */
  fa: Map<string, number>
  real: Map<string, number>
  teorico: Map<string, number>
  /** Fiscal de cada día con dato. Un día sin dato NO está: es un hueco. */
  realDia: Map<number, number>
  /** Días transcurridos de cada mes sin dato fiscal. */
  faltan: Map<string, number[]>
}
const CALC = new Map<string, Calc>()

/** El fiscal de un día, o undefined si el computador de flujo no lo dio
 *  (arreglo más corto o `null`). */
const fiscalDelDia = (x: ProduccionMes | undefined, i: number): number | undefined => {
  const v = x?.dias[i]
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined
}

function calcCampo(campoId: string): Calc {
  const hecho = CALC.get(campoId)
  if (hecho) return hecho
  const pozos = pozosDe(campoId)
  const perdidas = new Map<string, number>() // `${pozo}|${dia}` → horas equivalentes sin producir
  for (const ev of eventosDeCampo(campoId)) {
    const p = pozos.find(x => x.id === ev.pozo)
    if (!p) continue
    porDiasDelEvento(campoId, ev, ms(ev.inicio), ev.fin ? ms(ev.fin) : ahora, (dia, h) => {
      const k = `${p.id}|${dia}`
      perdidas.set(k, (perdidas.get(k) ?? 0) + h * fraccion(ev, p, dia))
    })
  }
  const fa = new Map<string, number>(), real = new Map<string, number>(), teorico = new Map<string, number>()
  const realDia = new Map<number, number>(), faltan = new Map<string, number[]>()
  for (const m of calendario()) {
    const fiscal = FISCAL().get(`${campoId}|${m.mes}`)
    let t = 0, r = 0, conDato = 0
    const sin: number[] = []
    let i = 0
    for (let d = m.desde; d < m.hasta; d += D, i++) {
      const v = fiscalDelDia(fiscal, i)
      if (v === undefined) { sin.push(d); continue }
      const horasDia = (Math.min(d + D, m.hasta) - d) / H
      for (const p of pozos) if (p.pruebas.length) t += crudo(p, d) * Math.max(0, horasDia - (perdidas.get(`${p.id}|${d}`) ?? 0)) / 24
      realDia.set(d, v); r += v; conDato++
    }
    real.set(m.mes, r); teorico.set(m.mes, t)
    if (conDato && t > 0) fa.set(m.mes, r / t)
    if (sin.length) faltan.set(m.mes, sin)
  }
  const c = { fa, real, teorico, realDia, faltan }
  CALC.set(campoId, c)
  return c
}

/** Factor de asignación del mes que contiene `t`. Si ese mes todavía no
 *  tiene un día fiscal (el primero del mes, o un hueco del computador de
 *  flujo), el último factor medido antes; si el campo no tiene ninguno,
 *  undefined: no hay con qué asignar. */
export function faDe(campoId: string, t: number = ahora): number | undefined {
  const m = mesDe(Math.min(t, ahora - 1)) ?? calendario().at(-1)!
  const fa = calcCampo(campoId).fa
  for (let i = calendario().indexOf(m); i >= 0; i--) {
    const v = fa.get(calendario()[i]!.mes)
    if (v !== undefined) return v
  }
  return undefined
}

/** Crudo por día de un pozo en un momento: prueba vigente × factor del mes.
 *  Sin prueba, o sin ningún factor medido en el campo, cero: no se le inventa
 *  caudal. */
export const crudoAsignado = (p: Pozo, t: number = ahora) => crudo(p, t) * (faDe(p.campoId, t) ?? 0)
/** Agua por día del pozo según su prueba vigente. */
export const aguaDePrueba = (p: Pozo, t: number = ahora) => agua(p, t)

/** Producción fiscal promedio del último mes publicado, bbl/d, con los días
 *  que tienen dato: decide qué fila de la Fig. 10.2 aplica (de 1.000 bpd o
 *  más, o menos). Sin mes publicado, undefined: no se supone cero. */
export function fiscalPromedio(campoId: string): number | undefined {
  // Del último hacia atrás, sin copiar ni invertir la lista (se pedía por cada tramo del libro).
  const todos = produccionDiaria()
  let m: ProduccionMes | undefined
  for (let i = todos.length - 1; i >= 0 && !m; i--) if (todos[i]!.campoId === campoId && todos[i]!.publicado) m = todos[i]
  const vs = (m?.dias ?? []).filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  return vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : undefined
}

export interface Banda {
  valor: number
  fuente: string
  /** Hay con qué escoger la fila de la Fig. 10.2 (°API del crudo y producción
   *  fiscal publicada), o el operador demostró su propia banda. Si no, el
   *  factor no se puede verificar y el libro no se publica. */
  verificable: boolean
}

/** La fila más ancha de la Fig. 10.2 para el crudo: con ella se acota la
 *  tolerancia mientras falte el análisis, y se dice. */
const BANDA_SIN_DATO = toleranciaAsignacion('crudo', 0, 0)

/** Banda de asignación que acepta la Res. 40236 para el campo (Fig. 10.2),
 *  o la que el operador demostró. Sin °API o sin producción fiscal publicada
 *  no se escoge fila: no se puede verificar el factor (y se dice), y la
 *  tolerancia se acota con la fila más ancha. */
export function bandaDe(campoId: string): Banda {
  // Depende solo del registro de metrología y de la producción publicada,
  // que no cambian en la sesión: una vez por campo (el libro la pide por tramo).
  let b = BANDAS.get(campoId)
  if (!b) BANDAS.set(campoId, b = calcularBanda(campoId))
  return b
}
const BANDAS = new Map<string, Banda>()
function calcularBanda(campoId: string): Banda {
  const m = Object.hasOwn(METROLOGIA_CAMPO, campoId) ? METROLOGIA_CAMPO[campoId] : undefined
  if (m?.demostrada) return { valor: m.demostrada.valor, fuente: m.demostrada.fuente, verificable: true }
  const api = typeof m?.api === 'number' && Number.isFinite(m.api) ? m.api : undefined
  const prom = fiscalPromedio(campoId)
  if (api === undefined || prom === undefined) return { valor: BANDA_SIN_DATO.valor, verificable: false,
    fuente: `${api === undefined ? 'Sin análisis de °API del crudo' : 'Sin producción fiscal publicada'}: no se puede escoger la fila de la Fig. 10.2 ni verificar el factor. La tolerancia se acota con la fila más ancha. ${BANDA_SIN_DATO.fuente}` }
  const c = toleranciaAsignacion('crudo', api, prom)
  return { valor: c.valor, fuente: c.fuente, verificable: true }
}

/* ─────────────────────────────── tramos ─────────────────────────────── */

/** Lo que costó un evento de pozo dentro del período. */
export interface Tramo {
  evento: EventoPozo
  pozo: Pozo
  causa: Causa
  inicio: Date
  fin: Date
  abierto: boolean
  /** Horas dentro del período. */
  horas: number
  /** Fracción del caudal que se dejó de producir: 1 apagado, menos con frecuencia reducida. */
  factor: number
  bbl: number
  /** Frecuencia reducida: el caudal perdido es una aproximación por ley de afinidad. */
  aproximado: boolean
  /** Sin prueba no hay caudal: el pozo no tiene custodia y su barril no se puede valorar. */
  sinCustodia: boolean
  /** Algún día del tramo cae en un mes sin un solo día fiscal: sin factor de
   *  asignación, esa parte no se puede valorar (no suma barriles, y se dice). */
  sinFactor: boolean
  /** Tolerancia relativa: sesgo de asignación (igual en todo el campo) y reloj del PLC. */
  sesgo: number
  azar: number
}

/** Los tramos de un período: lo que costó cada evento de pozo, con su causa. */
export const tramosEntre = (campoIds: string[], desde: Date, hasta: Date, ctx: Contexto) =>
  tramosDe(campoIds, desde.getTime(), hasta.getTime(), ctx)

/** Todos los tramos que se le cargan a un evento (parada de bomba, de
 *  servicio o del propio pozo), en toda la historia: los de la historia del
 *  campo, que se calcula una vez por contexto. */
export function tramosDeEvento(campoId: string, eventoId: string, ctx: Contexto): Tramo[] {
  return historiaDe(campoId, ctx).filter(t => (t.causa.evento ?? t.evento.id) === eventoId)
}

function tramosDe(campoIds: string[], desde: number, hasta: number, ctx: Contexto): Tramo[] {
  const hh = Math.min(hasta, ahora)
  const out: Tramo[] = []
  for (const campoId of campoIds) {
    const calc = calcCampo(campoId)
    const sesgo = bandaDe(campoId).valor
    for (const ev of eventosDeCampo(campoId)) {
      const a0 = ms(ev.inicio), b0 = ev.fin ? ms(ev.fin) : ahora
      if (b0 <= desde || a0 >= hh) continue
      const p = pozoDe(ev.campoId, ev.pozo)
      if (!p) continue
      const a = Math.max(a0, desde), b = Math.min(b0, hh)
      let bbl = 0, horas = 0, factorMax = 0, sinFactor = false
      // Solo lo que el evento cobra: lo que otro evento del pozo ya cubre no se repite.
      porDiasDelEvento(campoId, ev, a, b, (dia, h) => {
        const f = fraccion(ev, p, dia)
        const fa = calc.fa.get(mesDe(dia)?.mes ?? '')
        if (fa === undefined) sinFactor = true
        bbl += crudo(p, dia) * (fa ?? 0) * h * f / 24
        horas += h
        factorMax = Math.max(factorMax, f)
      })
      const causa = causaDeEvento(ev, ctx)
      const aproximado = ev.codigo === 'HZ'
      out.push({
        evento: ev, pozo: p, causa, inicio: new Date(a), fin: new Date(b), abierto: !ev.fin,
        horas, factor: factorMax, bbl, aproximado, sinCustodia: !p.pruebas.length, sinFactor,
        sesgo,
        azar: aproximado || horas <= 0 ? 0 : Math.SQRT2 * RESOLUCION_PLC_H / horas,
      })
    }
  }
  return out
}

/** Tolerancia absoluta: dentro de un campo el sesgo de asignación se suma en
 *  línea (es el mismo en todos los pozos); lo independiente, en cuadratura;
 *  entre campos, en cuadratura. Lo aproximado (frecuencia reducida) no entra:
 *  se informa aparte. */
export function toleranciaDe(ts: Tramo[]): number {
  const por = new Map<string, { s: number; a2: number }>()
  for (const t of ts) {
    if (t.aproximado) continue
    const c = por.get(t.pozo.campoId) ?? { s: 0, a2: 0 }
    c.s += t.bbl * t.sesgo; c.a2 += (t.bbl * t.azar) ** 2
    por.set(t.pozo.campoId, c)
  }
  let x = 0
  for (const c of por.values()) x += c.s ** 2 + c.a2
  return Math.sqrt(x)
}

/** Lo que TRIM le asigna a un pozo en un mes cerrado. */
export interface AsignacionPozo {
  campoId: string
  pozo: string
  /** Horas produciendo según el PLC (las de frecuencia reducida cuentan). */
  horas: number
  /** Prueba × factor del mes × horas del mes. */
  potencial: number
  diferido: number
  /** Potencial − diferido, más su parte del inventario del tanque: suma lo
   *  real del punto de medición oficial. */
  asignado: number
}

/** La asignación de TRIM pozo por pozo en un mes: lo real del punto de
 *  medición oficial repartido en proporción a lo que cada pozo pudo dar con
 *  las horas que estuvo abierto (prueba × factor × horas). Es el método de
 *  la asignación oficial; cuando no cuadran, la diferencia está en las horas
 *  o en la prueba que usó cada uno. */
export function asignacionPorPozo(campoId: string, mes: string, ctx: Contexto): AsignacionPozo[] {
  const m = calendario().find(x => x.mes === mes)
  if (!m || !mesCerrado(m)) return []
  const fa = calcCampo(campoId).fa.get(mes) ?? 0
  const ts = tramosDe([campoId], m.desde, m.hasta, ctx)
  const filas = pozosDe(campoId).filter(p => p.pruebas.length).map(p => {
    let potencial = 0
    porDias(m.desde, m.hasta, (dia, h) => { potencial += crudo(p, dia) * fa * h / 24 })
    const mios = ts.filter(t => t.pozo.id === p.id)
    const cerrado = mios.filter(t => !t.aproximado).reduce((a, t) => a + t.horas, 0)
    const diferido = suma(mios)
    return { campoId, pozo: p.id, horas: (m.hasta - m.desde) / H - cerrado, potencial, diferido, asignado: potencial - diferido }
  })
  // El inventario del tanque (lo real menos potencial − diferido) se reparte
  // en proporción: así la suma de los pozos es lo real del campo.
  const real = libro([campoId], new Date(m.desde), new Date(m.hasta), ctx).real
  const teorico = filas.reduce((a, f) => a + f.asignado, 0)
  const k = teorico > 0 ? real / teorico : 0
  return filas.map(f => ({ ...f, asignado: f.asignado * k })).sort((a, b) => b.asignado - a.asignado)
}

/* ─────────────────────────────── el libro ─────────────────────────────── */

export interface FilaEquipo {
  campoId: string
  equipo: string
  tipo: TipoCausa
  bbl: number
  tolerancia: number
  /** Paradas distintas (de bomba, servicio o pozo) que aportan barriles. */
  eventos: number
  pozos: number
  partes: Array<{ parte: ParteId; bbl: number }>
  /** Solo en las filas de falla propia de un equipo de alto impacto
   *  (`reinyeccion`, `transporte`, `electrosumergible`): sus fallas en el
   *  período, de su historia de fallas (`historialDeEquipo`): los eventos que
   *  se solapan con [desde, hasta), también la abierta y las que el tanque
   *  absorbió, con la misma regla de período que `porParte`. En las demás
   *  filas no va. */
  fallas?: number
  /** Las mismas filas: los disparos de la electrosumergible en el período (un
   *  disparo no es una falla). En una bomba, 0. */
  disparos?: number
}

/** Un equipo de la línea que falló (o disparó) en el período sin costar crudo:
 *  el tanque, el respaldo o la salida alterna del agua lo absorbieron, así que
 *  no tiene fila en `porEquipo` (que solo lleva barriles). La vista del
 *  gerente lo pone al final de su campo: «5 fallas · no costó crudo». */
export interface EquipoSinCosto {
  campoId: string
  equipo: string
  /** La familia de sus fallas: `reinyeccion` (bomba de inyección, también la
   *  de recobro), `transporte` (multifásica) o `electrosumergible`. */
  tipo: TipoCausa
  /** Con la regla de `FilaEquipo.fallas`: los eventos de su historia que se
   *  solapan con el período, también la abierta. */
  fallas: number
  /** Electrosumergible: sus disparos en el período. En una bomba, 0. */
  disparos: number
}

/** Una electrosumergible que dispara y vuelve a arrancar en menos de esto no
 *  falló: disparó. La falla de una electrosumergible es la que obliga a
 *  sacarla del pozo (y eso tarda días). Contarlas juntas hundiría su MTBF. */
export const DISPARO_MAX_H = 24

/** ¿El evento fue una falla o un disparo? Solo aplica a la electrosumergible:
 *  la parada de una bomba de superficie siempre se revisa. */
export const esDisparo = (t: Pick<Tramo, 'causa' | 'evento'>) =>
  t.causa.tipo === 'electrosumergible' && !!t.evento.fin && (ms(t.evento.fin) - ms(t.evento.inicio)) / H < DISPARO_MAX_H

export interface FilaParte {
  parte: ParteId
  familia: Familia
  /** Lo que costaron sus fallas en el período: 0 si el tanque o el respaldo
   *  las absorbieron (la fila sigue, con sus fallas y sus horas). */
  bbl: number
  /** Eventos distintos que la sacaron de servicio, sin contar disparos. */
  fallas: number
  /** Electrosumergible: disparos que volvieron a arrancar en menos de un día. */
  disparos: number
  /** Horas que los equipos estuvieron fuera por esta parte, dentro del
   *  período: la unión de las paradas que la causaron (la de la bomba o la
   *  del pozo), no la suma de las horas de cada pozo que cerró. */
  horas: number
  equipos: Array<{ campoId: string; equipo: string; bbl: number }>
}

export interface FilaFA { campoId: string; mes: string; fa: number; banda: number; dentro: boolean; publicado: boolean }

export interface Pregunta {
  /** Id del evento (de pozo o de bomba). */
  id: string
  campoId: string
  equipo: string
  /** Pozo, o la bomba cuando lo que falta es la parte. */
  sobre: 'pozo' | 'bomba'
  inicio: Date
  fin: Date | null
  causa: Causa
  bbl: number
  pide: boolean
  arrancoSinIdentificar: boolean
}

export interface Libro {
  desde: Date
  hasta: Date
  tramos: Tramo[]
  real: number
  potencial: number
  /** Potencial − real. */
  brecha: number
  /** Σ de los tramos. */
  diferido: number
  /** Brecha − diferido: inventario de los días y redondeo. En un mes entero, ~0
   *  (si faltan días fiscales, también los diferidos de esos días). */
  residuo: number
  tolerancia: number
  /** Barriles por frecuencia reducida: aproximación, fuera de la tolerancia. */
  aproximado: number
  /** Identificado por señal, firma o programa. */
  identificado: number
  declarado: number
  pendiente: number
  planeado: number
  noPlaneado: number
  altoImpacto: number
  /** De alto impacto, con la parte identificada y una variable de esa parte
   *  (que la anuncia o que la daña) instrumentada en ese equipo: lo que la
   *  vigilancia puede atacar. */
  anticipable: number
  /** De alto impacto, con la parte identificada pero sin instrumento que la
   *  vigile en ese equipo: hueco de instrumentación con su costo. */
  sinInstrumento: number
  /** De alto impacto, sin parte identificada. */
  sinParte: number
  /** Lo que se habría perdido de menos cerrando primero los pozos con menos crudo por barril de agua. */
  evitablePorOrden: number
  porTipo: Array<{ tipo: TipoCausa; bbl: number }>
  porEquipo: FilaEquipo[]
  /** Los equipos de la línea (bombas de inyección y multifásicas,
   *  electrosumergibles) con fallas o disparos en el período y SIN fila de su
   *  familia en `porEquipo`: fallaron sin costar crudo. Sin barriles: no son
   *  diferido y no entran en ningún Pareto. Por campo (el orden de la
   *  consulta), de más fallas a menos, luego disparos y el código del equipo. */
  sinCosto: EquipoSinCosto[]
  porParte: FilaParte[]
  porPozo: Array<{ campoId: string; pozo: string; bbl: number; horas: number; eventos: number }>
  porCampo: Array<{ campoId: string; real: number; potencial: number; brecha: number; diferido: number; identificado: number; declarado: number; pendiente: number; altoImpacto: number; pe: number
    /** Lo que pide la meta del campo en lo que va del período, bbl. */
    metaProduccion: number; metaDiferido: number
    /** El campo no tiene meta firmada en algún día del período: sus dos metas no son comparables. */
    sinMeta: boolean }>
  fa: FilaFA[]
  custodia: { sinPrueba: Pozo[]; estimados: Pozo[]; bswLaboratorio: string[] }
  preguntas: Pregunta[]
  pe: number
  meta: MetaPeriodo
  /** Valor de la brecha de los campos que tienen precio neto configurado. */
  valorUsd?: number
  /** Cuántos campos entran en `valorUsd` de cuántos hay. */
  valorCampos: { con: number; total: number }
  /** Campos con al menos un día sin precio neto en el período: esos días no entran en `valorUsd`. */
  sinPrecio: string[]
  /** Días del período sin dato fiscal, por campo: no entran ni en lo real ni
   *  en el potencial, y el libro no se publica. */
  sinFiscal: Array<{ campoId: string; dias: Date[] }>
  /** Meses sin un solo día fiscal, por campo: sin factor de asignación. */
  sinFactor: Array<{ campoId: string; mes: string }>
  publicable: boolean
  /** Por qué no se puede publicar. El `codigo` es lo que se compara (el
   *  estado de publicación, la alerta del cuadre); el `texto`, lo que se lee.
   *  Deducirlo de la frase hacía que una redacción distinta del servidor
   *  cambiara «provisional» por «no publicable». */
  motivos: MotivoLibro[]
}

/** en-curso: hay días sin cierre publicado (no es una anomalía: es el mes que
 *  corre) · sin-fiscal · sin-factor · banda-sin-verificar · fa-fuera-de-banda
 *  · sin-causa: más de lo sin identificar que permite el criterio de cierre ·
 *  sin-meta: un campo sin meta ni regla de cierre firmadas en el período. */
export type CodigoMotivo = 'en-curso' | 'sin-fiscal' | 'sin-factor' | 'banda-sin-verificar' | 'fa-fuera-de-banda' | 'sin-causa' | 'sin-meta'
export interface MotivoLibro { codigo: CodigoMotivo; texto: string; campoId?: string; mes?: string }

/** Lo que piden las metas firmadas en el período. Se compara lo producido
 *  contra `produccion` y lo no producido contra `diferido`: las dos llevan
 *  solo lo transcurrido, para que el mes en curso no parezca ir mal todos los
 *  días hasta el último. */
export interface MetaPeriodo {
  /** Producción que pide la meta en lo que va del período, bbl. */
  produccion: number
  /** Máximo de diferido que acepta la meta en lo que va del período, bbl. */
  diferido: number
  /** Las mismas, en bbl/d promedio del período. */
  produccionDia: number
  diferidoDia: number
  /** El período completo (si es el mes en curso, hasta su último día), bbl. */
  produccionTotal: number
  diferidoTotal: number
  /** Días transcurridos del período (el de hoy, en fracción). */
  dias: number
  /** Días del período completo. */
  diasTotal: number
  /** Campos sin meta firmada en algún día del período: esos días no suman a
   *  la meta, así que con alguno las cifras de arriba NO son la meta del total
   *  y las pantallas dicen «sin meta firmada» en vez de comparar contra ellas. */
  sinMeta: string[]
}

/** ¿Se puede comparar el período contra su meta? No si algún campo no tiene
 *  meta firmada: la suma de los demás no es la meta del total, y tratarla como
 *  tal daría alertas de «fuera de meta» (o un cumplimiento) que nadie firmó. */
export const conMeta = (m: Pick<MetaPeriodo, 'sinMeta'>) => m.sinMeta.length === 0

/** Lo que dice la pantalla donde falta la meta. Con varios campos, cuáles
 *  no la tienen: el total global lo dice si a uno solo le falta. */
export const textoSinMeta = (m: Pick<MetaPeriodo, 'sinMeta'>, varios = false) =>
  varios && m.sinMeta.length ? `${SIN_META} en ${m.sinMeta.map(c => campoPorId(c).nombre).join(', ')}` : SIN_META

/** Medianoche de Colombia (UTC−5) del día de un instante. */
const inicioDiaCo = (t: number) => Math.floor((t - 5 * H) / D) * D + 5 * H

/** Lo que pide la meta de un campo entre dos instantes, en barriles: cada
 *  día con el tramo que regía ese día. Sirve también para días que todavía no
 *  llegan (el total del mes en curso). */
export function metaEntre(c: Config, campoId: string, a: number, b: number): { produccion: number; diferido: number; sinMeta: boolean } {
  let produccion = 0, diferido = 0, sinMeta = false
  for (let d = inicioDiaCo(a); d < b; d += D) {
    const h = (Math.min(b, d + D) - Math.max(a, d)) / H
    if (h <= 0) continue
    const m = metaEn(c, campoId, d)
    // Un día sin meta firmada no suma un 0 de meta: se marca y la meta del
    // tramo deja de ser comparable (`sinMeta`).
    if (!m) { sinMeta = true; continue }
    produccion += (m.produccionBpd * h) / 24; diferido += (m.diferidoMaxBpd * h) / 24
  }
  return { produccion, diferido, sinMeta }
}

/** ¿La parte tiene, en ese equipo, una variable instrumentada que la anuncia
 *  o que la daña? La electrosumergible trae todas las suyas en el variador y
 *  el sensor de fondo. */
export function vigilable(campoId: string, tipo: TipoCausa, equipo: string, parte: ParteId): boolean {
  if (tipo === 'electrosumergible') return true
  const p = perfilBomba(equipo, campoId)
  if (!p) return false
  const def = partesDe(p.subtipo).find(x => x.id === parte)
  return !!def?.variables.some(v => v.papel !== 'confirma' && p.tags[v.id])
}


/** Una falla de un equipo de la línea con la parte identificada, recortada al
 *  período: la parada de la bomba (de su PLC) o el evento de la
 *  electrosumergible (del variador). Sale del EVENTO, no de los tramos con
 *  barriles: una parada que el tanque absorbió no cerró pozos, no tiene tramo
 *  y es igual una falla con sus horas fuera. */
interface FallaDeParte {
  id: string
  campoId: string
  equipo: string
  familia: Familia
  parte: ParteId
  /** Dentro de [d0, h0). */
  a: number
  b: number
  disparo: boolean
}

/** Horas fuera de unas fallas: la unión de sus intervalos por equipo. Una
 *  falla de bomba que cerró 18 pozos son las horas de la bomba, no 18 veces;
 *  dos paradas que se pisan en el mismo equipo no se cuentan dos veces. */
function horasFuera(fs: FallaDeParte[]): number {
  const porEquipo = new Map<string, Array<[number, number]>>()
  for (const f of fs) anotar(porEquipo, `${f.campoId}:${f.equipo}`, [f.a, f.b] as [number, number])
  let total = 0
  for (const xs of porEquipo.values()) {
    let fin = -Infinity
    for (const [a, b] of xs.filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0])) {
      if (b <= fin) continue
      total += (b - Math.max(a, fin)) / H
      fin = b
    }
  }
  return total
}

const familiaDe = (t: TipoCausa): Familia | undefined =>
  t === 'reinyeccion' ? 'inyeccion' : t === 'transporte' ? 'multifasica' : t === 'electrosumergible' ? 'electrosumergible' : undefined

export function libro(campoIds: string[], desde: Date, hasta: Date, ctx: Contexto): Libro {
  const d0 = desde.getTime(), h0 = Math.min(hasta.getTime(), ahora)
  const tramos = tramosDe(campoIds, d0, h0, ctx)
  // Si el período es el mes en curso, su total llega al último día del mes.
  const ultimo = calendario().at(-1)!
  const finTotal = d0 === ultimo.desde && hasta.getTime() >= ahora ? inicioMes(sigMes(ultimo.mes)) : Math.max(h0, d0)

  // Real y potencial del período, día por día (el día parcial se prorratea).
  let real = 0, potencial = 0
  let metaP = 0, metaD = 0, totalP = 0, totalD = 0
  const sinMeta: string[] = []
  // El valor se calcula día por día con el precio que regía ese día.
  let valor = 0, valorado = false
  const conPrecio: string[] = [], sinPrecio: string[] = []
  const porCampo: Libro['porCampo'] = []
  const fa: FilaFA[] = []
  const sinFiscal: Libro['sinFiscal'] = [], sinFactor: Libro['sinFactor'] = [], bandaSinVerificar: string[] = []
  for (const c of campoIds) {
    const calc = calcCampo(c)
    const pozos = pozosDe(c).filter(p => p.pruebas.length)
    let rc = 0, pc = 0, algunPrecio = false, algunoSin = false
    const faltan: Date[] = []
    porDias(d0, h0, (dia, h) => {
      const m = mesDe(dia)!
      const horasDia = (Math.min(dia + D, m.hasta) - dia) / H
      // Un día sin fiscal no entra ni en lo real ni en el potencial: es un
      // hueco del punto de medición oficial y se dice, no un día en cero.
      const fiscal = calc.realDia.get(dia)
      const f = calc.fa.get(m.mes)
      if (fiscal === undefined || f === undefined) { if (fiscal === undefined) faltan.push(new Date(dia)); return }
      const r = fiscal * h / horasDia
      let p = 0
      for (const x of pozos) p += crudo(x, dia) * f * h / 24
      rc += r; pc += p
      const precio = precioEn(ctx.config, c, dia)
      if (precio !== undefined) { valor += (p - r) * precio; algunPrecio = true } else algunoSin = true
    })
    // Con precio = todos sus días tienen precio; un día sin precio no se valora y se dice.
    if (algunPrecio) valorado = true
    if (algunPrecio && !algunoSin) conPrecio.push(c)
    if (algunoSin) sinPrecio.push(c)
    const tc = tramos.filter(t => t.pozo.campoId === c)
    const dc = suma(tc)
    const pend = suma(tc.filter(t => t.causa.tipo === 'pendiente')), decl = suma(tc.filter(esDeclarado))
    const ya = metaEntre(ctx.config, c, d0, h0), todo = metaEntre(ctx.config, c, d0, finTotal)
    metaP += ya.produccion; metaD += ya.diferido; totalP += todo.produccion; totalD += todo.diferido
    if (todo.sinMeta) sinMeta.push(c)
    porCampo.push({ campoId: c, real: rc, potencial: pc, brecha: pc - rc, diferido: dc, identificado: dc - pend - decl, declarado: decl,
      pendiente: pend, altoImpacto: suma(tc.filter(t => ALTO_IMPACTO.includes(t.causa.tipo))), pe: pc > 0 ? (rc / pc) * 100 : 0,
      metaProduccion: ya.produccion, metaDiferido: ya.diferido, sinMeta: todo.sinMeta })
    real += rc; potencial += pc
    if (faltan.length) sinFiscal.push({ campoId: c, dias: faltan })
    const banda = bandaDe(c)
    if (!banda.verificable) bandaSinVerificar.push(c)
    for (const m of calendario()) if (m.hasta > d0 && m.desde < h0) {
      const v = calc.fa.get(m.mes)
      // Un mes sin un solo día fiscal no tiene factor: no hay fila que mostrar
      // y sus barriles no se valoran (motivo aparte).
      if (v === undefined) { sinFactor.push({ campoId: c, mes: m.mes }); continue }
      fa.push({ campoId: c, mes: m.mes, fa: v, banda: banda.valor, dentro: banda.verificable && Math.abs(v - 1) <= banda.valor + 1e-9, publicado: publicadoEn(c, m.mes) })
    }
  }
  porCampo.sort((a, b) => b.brecha - a.brecha)

  const diferido = suma(tramos)
  const pendiente = suma(tramos.filter(t => t.causa.tipo === 'pendiente'))
  const declarado = suma(tramos.filter(esDeclarado))
  const planeado = suma(tramos.filter(t => t.causa.tipo === 'programada'))

  const tipos = new Map<TipoCausa, number>()
  for (const t of tramos) tipos.set(t.causa.tipo, (tipos.get(t.causa.tipo) ?? 0) + t.bbl)

  // Por equipo (con el campo: P-201B de un campo no es la de otro) y por tipo
  // de causa: lo programado de una bomba o lo declarado de un pozo es otra
  // fila que sus fallas, no se mezcla bajo el tipo del primer tramo.
  const eqs = new Map<string, Tramo[]>()
  for (const t of tramos) if (t.bbl > 0) { const k = `${t.pozo.campoId}:${t.causa.equipo}:${t.causa.tipo}`; anotar(eqs, k, t) }
  // Las fallas de un equipo de alto impacto en el período salen de su
  // historia (las mismas que su ficha y Confiabilidad, también las que el
  // tanque absorbió), no de los tramos con barriles: así se separan los
  // disparos y nadie los cuenta en la pantalla.
  const enPeriodo = (campoId: string, equipo: string) => {
    const es = historialDeEquipo(campoId, equipo, ctx).eventos.filter(e => e.inicio.getTime() < h0 && (e.fin ? e.fin.getTime() : ahora) > d0)
    return { fallas: es.filter(e => !e.disparo).length, disparos: es.filter(e => e.disparo).length }
  }
  const porEquipo: FilaEquipo[] = [...eqs.values()].map((ts): FilaEquipo => {
    const partes = new Map<ParteId, number>()
    for (const t of ts) if (t.causa.parte) partes.set(t.causa.parte, (partes.get(t.causa.parte) ?? 0) + t.bbl)
    const { pozo: { campoId }, causa: { equipo, tipo } } = ts[0]!
    return {
      campoId, equipo, tipo,
      bbl: suma(ts), tolerancia: toleranciaDe(ts),
      eventos: new Set(ts.map(t => t.causa.evento ?? t.evento.id)).size,
      pozos: new Set(ts.map(t => t.pozo.id)).size,
      partes: [...partes.entries()].map(([parte, bbl]) => ({ parte, bbl })).sort((a, b) => b.bbl - a.bbl),
      ...(familiaDe(tipo) ? enPeriodo(campoId, equipo) : {}),
    }
  }).sort((a, b) => b.bbl - a.bbl)

  // Los equipos de la línea que fallaron sin costar crudo: con fallas o disparos
  // en el período (la misma regla que la fila) y sin fila de su familia arriba.
  // Una bomba sin ninguna parada en el campo no pudo fallar: basta mirar las que
  // tienen paradas. La familia de la bomba es la de su causa (causa-senal.ts).
  const conFila = new Set(porEquipo.map(f => `${f.campoId}:${f.equipo}:${f.tipo}`))
  const sinCosto: EquipoSinCosto[] = campoIds.flatMap(c => {
    const bombas = [...new Set(paradasDeCampo(c).map(e => e.equipo))].flatMap(id => {
      const p = perfilBomba(id, c)
      return p ? [{ equipo: id, tipo: (p.subtipo === 'multifasica' ? 'transporte' : 'reinyeccion') as TipoCausa }] : []
    })
    const esps = pozosDe(c).filter(p => p.levantamiento === 'electrosumergible').map(p => ({ equipo: p.id, tipo: 'electrosumergible' as TipoCausa }))
    return [...bombas, ...esps]
      .filter(x => !conFila.has(`${c}:${x.equipo}:${x.tipo}`))
      .map(x => ({ campoId: c, ...x, ...enPeriodo(c, x.equipo) }))
      .filter(x => x.fallas + x.disparos > 0)
      .sort((a, b) => b.fallas - a.fallas || b.disparos - a.disparos || (a.equipo < b.equipo ? -1 : a.equipo > b.equipo ? 1 : 0))
  })

  // Por parte: fallas de los equipos de la línea con la parte identificada,
  // con la misma regla que la historia de cada equipo (`armarHistorial`). Una
  // fila por familia y parte: el sello de la centrífuga no es el de la
  // multifásica, ni el motor de superficie el de fondo. Las fallas salen de los
  // eventos del equipo, también las que el tanque absorbió (0 bbl); los
  // barriles, de los tramos que cada una causó.
  const fallas: FallaDeParte[] = []
  for (const c of campoIds) for (const ev of paradasDeCampo(c)) {
    const a = ms(ev.inicio), b = ev.fin ? ms(ev.fin) : ahora
    if (b <= d0 || a >= h0 || !perfilBomba(ev.equipo, c)) continue
    const causa = causaDeParada(ev, ctx), fam = familiaDe(causa.tipo)
    if (fam && causa.parte) fallas.push({ id: ev.id, campoId: c, equipo: ev.equipo, familia: fam, parte: causa.parte, a: Math.max(a, d0), b: Math.min(b, h0), disparo: false })
  }
  // La electrosumergible: cada evento del pozo es un tramo (cueste o no), y el
  // tramo ya viene recortado al período.
  for (const t of tramos) if (t.causa.tipo === 'electrosumergible' && t.causa.parte && t.causa.equipo === t.pozo.id)
    fallas.push({ id: t.evento.id, campoId: t.pozo.campoId, equipo: t.pozo.id, familia: 'electrosumergible', parte: t.causa.parte, a: t.inicio.getTime(), b: t.fin.getTime(), disparo: esDisparo(t) })
  const bblEvento = new Map<string, number>()
  for (const t of tramos) { const k = t.causa.evento ?? t.evento.id; bblEvento.set(k, (bblEvento.get(k) ?? 0) + t.bbl) }
  const pts = new Map<string, FallaDeParte[]>()
  for (const x of fallas) anotar(pts, `${x.familia}|${x.parte}`, x)
  const porParte: FilaParte[] = [...pts.values()].map(fs => {
    const eq = new Map<string, { campoId: string; equipo: string; bbl: number }>()
    for (const x of fs) {
      const k = `${x.campoId}:${x.equipo}`, e = eq.get(k) ?? { campoId: x.campoId, equipo: x.equipo, bbl: 0 }
      e.bbl += bblEvento.get(x.id) ?? 0; eq.set(k, e)
    }
    const ids = (xs: FallaDeParte[]) => new Set(xs.map(x => x.id)).size
    return { parte: fs[0]!.parte, familia: fs[0]!.familia, bbl: [...eq.values()].reduce((a, e) => a + e.bbl, 0),
      fallas: ids(fs.filter(x => !x.disparo)), disparos: ids(fs.filter(x => x.disparo)),
      horas: horasFuera(fs), equipos: [...eq.values()].sort((a, b) => b.bbl - a.bbl) }
  }).sort((a, b) => b.bbl - a.bbl || b.horas - a.horas)

  const pz = new Map<string, { campoId: string; pozo: string; bbl: number; horas: number; eventos: number }>()
  for (const t of tramos) { const k = `${t.pozo.campoId}:${t.pozo.id}`; const x = pz.get(k) ?? { campoId: t.pozo.campoId, pozo: t.pozo.id, bbl: 0, horas: 0, eventos: 0 }; x.bbl += t.bbl; x.horas += t.horas; x.eventos++; pz.set(k, x) }

  const preguntas = preguntasDe(campoIds, d0, h0, ctx, tramos)
  const alto = tramos.filter(t => ALTO_IMPACTO.includes(t.causa.tipo))
  const evitablePorOrden = evitable(tramos)

  // Lo que se puede publicar.
  const motivos: MotivoLibro[] = []
  if (fa.some(f => !f.publicado)) motivos.push({ codigo: 'en-curso', texto: 'El período incluye días sin cierre publicado.' })
  for (const x of sinFiscal) motivos.push({ codigo: 'sin-fiscal', campoId: x.campoId, texto: `${campoPorId(x.campoId).nombre}: faltan ${x.dias.length} ${x.dias.length === 1 ? 'día' : 'días'} de producción fiscal del punto de medición oficial; no entran ni en lo real ni en el potencial.` })
  for (const x of sinFactor) motivos.push({ codigo: 'sin-factor', campoId: x.campoId, mes: x.mes, texto: `${campoPorId(x.campoId).nombre}, ${NOMBRE_MES[Number(x.mes.slice(5)) - 1]} de ${x.mes.slice(0, 4)}: sin un día de producción fiscal no hay factor de asignación; sus diferidos no se pueden valorar.` })
  for (const c of bandaSinVerificar) motivos.push({ codigo: 'banda-sin-verificar', campoId: c, texto: `${campoPorId(c).nombre}: ${bandaDe(c).fuente.split(':')[0]}; no se puede verificar el factor contra la banda de la Res. 40236.` })
  for (const f of fa) if (!f.dentro && !bandaSinVerificar.includes(f.campoId)) motivos.push({ codigo: 'fa-fuera-de-banda', campoId: f.campoId, mes: f.mes, texto: `${campoPorId(f.campoId).nombre}, ${NOMBRE_MES[Number(f.mes.slice(5)) - 1]} de ${f.mes.slice(0, 4)}: factor de asignación ${f.fa.toLocaleString('es-CO', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} fuera de la banda ±${Math.round(f.banda * 100)} %.` })
  // Sin meta firmada tampoco hay regla de cierre: el libro de ese campo no se
  // publica con la de la demostración ni con un criterio inventado.
  for (const c of sinMeta) motivos.push({ codigo: 'sin-meta', campoId: c, texto: `${campoPorId(c).nombre}: el campo no tiene meta ni regla de cierre firmadas en el período; no se puede publicar.` })
  for (const c of porCampo) {
    // La regla de cierre que regía al final del período.
    const crit = criterioEn(ctx.config, c.campoId, h0 - 1)
    if (crit !== undefined && c.potencial > 0 && (c.pendiente / c.potencial) * 100 > crit)
      motivos.push({ codigo: 'sin-causa', campoId: c.campoId, texto: `${campoPorId(c.campoId).nombre}: ${Math.round(c.pendiente).toLocaleString('es-CO')} bbl sin causa identificada, más del ${crit} % del potencial.` })
  }

  const dias = Math.max(1e-9, (h0 - d0) / D)
  // El valor suma los campos que tienen precio y dice cuántos son: un campo
  // sin precio no apaga el dinero de los demás, pero tampoco se le inventa.
  const valorUsd = valorado ? valor : undefined

  return {
    desde, hasta, tramos, real, potencial, brecha: potencial - real, diferido, residuo: potencial - real - diferido,
    tolerancia: toleranciaDe(tramos), aproximado: suma(tramos.filter(t => t.aproximado)),
    identificado: diferido - pendiente - declarado, declarado, pendiente, planeado, noPlaneado: diferido - planeado,
    altoImpacto: suma(alto),
    anticipable: suma(alto.filter(t => t.causa.parte && vigilable(t.pozo.campoId, t.causa.tipo, t.causa.equipo, t.causa.parte))),
    sinInstrumento: suma(alto.filter(t => t.causa.parte && !vigilable(t.pozo.campoId, t.causa.tipo, t.causa.equipo, t.causa.parte))),
    sinParte: suma(alto.filter(t => !t.causa.parte)),
    evitablePorOrden,
    porTipo: [...tipos.entries()].map(([tipo, bbl]) => ({ tipo, bbl })).sort((a, b) => b.bbl - a.bbl),
    porEquipo, sinCosto, porParte, porPozo: [...pz.values()].sort((a, b) => b.bbl - a.bbl), porCampo, fa,
    custodia: {
      sinPrueba: todosLosPozos().filter(p => campoIds.includes(p.campoId) && !p.pruebas.length),
      estimados: todosLosPozos().filter(p => campoIds.includes(p.campoId) && p.origen === 'estimado'),
      bswLaboratorio: campoIds.filter(c => origenPmo(c)?.bsw === 'laboratorio'),
    },
    preguntas,
    pe: potencial > 0 ? (real / potencial) * 100 : 0,
    meta: { produccion: metaP, diferido: metaD, produccionDia: metaP / dias, diferidoDia: metaD / dias,
      produccionTotal: totalP, diferidoTotal: totalD, dias, diasTotal: Math.max(dias, (finTotal - d0) / D), sinMeta },
    valorUsd, valorCampos: { con: conPrecio.length, total: porCampo.length }, sinPrecio,
    sinFiscal, sinFactor,
    publicable: motivos.length === 0, motivos,
  }
}

/* ─────────────── preguntas: paradas que la señal no explicó ─────────────── */

function preguntasDe(campoIds: string[], d0: number, h0: number, ctx: Contexto, tramos: Tramo[]): Pregunta[] {
  const out: Pregunta[] = []
  // De pozo: las que quedaron sin identificar o que alguien declaró.
  for (const t of tramos) {
    if (t.causa.tipo !== 'pendiente' && !esDeclarado(t)) continue
    const e = estadoIdentificacion(t.causa, t.evento.fin)
    out.push({ id: t.evento.id, campoId: t.pozo.campoId, equipo: t.pozo.id, sobre: 'pozo', inicio: new Date(t.evento.inicio),
      fin: t.evento.fin ? new Date(t.evento.fin) : null, causa: t.causa, bbl: t.bbl, ...e })
  }
  // De bomba: paradas a las que no se les pudo identificar la parte.
  for (const ev of eventosBomba()) {
    if (!campoIds.includes(ev.campoId)) continue
    const a = ms(ev.inicio), b = ev.fin ? ms(ev.fin) : ahora
    if (b <= d0 || a >= h0) continue
    const c = causaDeParada(ev, ctx)
    if (!(c.tipo === 'reinyeccion' || c.tipo === 'transporte') || (c.parte && c.como !== 'declarado')) continue
    const e = estadoIdentificacion(c, ev.fin)
    out.push({ id: ev.id, campoId: ev.campoId, equipo: ev.equipo, sobre: 'bomba', inicio: new Date(ev.inicio),
      fin: ev.fin ? new Date(ev.fin) : null, causa: c, bbl: tramos.filter(t => t.causa.evento === ev.id).reduce((x, t) => x + t.bbl, 0), ...e })
  }
  return out.sort((a, b) => Number(b.pide) - Number(a.pide) || b.inicio.getTime() - a.inicio.getTime())
}

/* ─────────── evitable: cerrar primero lo que menos crudo da por barril de agua ─────────── */

/** Lo que se habría perdido de menos en UNA parada de la bomba de
 *  reinyección si se hubiera quitado la misma agua cerrando primero los pozos
 *  que menos crudo dan por barril de agua. Si se cerró todo el campo, no
 *  había orden que elegir: cero. */
export function evitableDeEvento(ts: Tramo[]): number {
  const conBbl = ts.filter(t => t.bbl > 0)
  if (!conBbl.length) return 0
  const campoId = conBbl[0]!.pozo.campoId
  const dia = conBbl[0]!.inicio.getTime()
  // Se escoge entre los pozos que producían cuando empezaron los cierres: uno
  // que ya estaba parado por otra causa no tiene agua que quitar. «Se cerró
  // todo el campo» es contra esos mismos.
  const cierre = Math.min(...conBbl.map(t => ms(t.evento.inicio)))
  const cerrados = new Set(conBbl.map(t => t.pozo.id))
  const yaParado = (p: Pozo) => eventosDeCampo(campoId).some(e => e.pozo === p.id && e.codigo !== 'HZ'
    && ms(e.inicio) < cierre && (!e.fin || ms(e.fin) > cierre))
  const todos = pozosDe(campoId).filter(p => p.pruebas.length && (cerrados.has(p.id) || !yaParado(p)))
  if (cerrados.size >= todos.length) return 0
  let crudoReal = 0, aguaQuitada = 0
  for (const t of conBbl) { crudoReal += crudo(t.pozo, dia) * t.factor; aguaQuitada += agua(t.pozo, dia) * t.factor }
  const crudoOptimo = ordenOptimo(todos, aguaQuitada, dia).crudo
  return crudoReal > 0 && crudoOptimo < crudoReal ? suma(conBbl) * (1 - crudoOptimo / crudoReal) : 0
}


/** Cerrar primero lo que menos crudo da por barril de agua, hasta quitar el
 *  agua pedida. El último pozo se cierra en parte (en la práctica, se le baja
 *  la frecuencia o se estrangula). */
export function ordenOptimo(pozos: Pozo[], aguaAQuitar: number, t: number) {
  const orden = [...pozos].sort((a, b) => crudo(a, t) / Math.max(1, agua(a, t)) - crudo(b, t) / Math.max(1, agua(b, t)))
  let w = 0, c = 0
  const pasos: Array<{ pozo: Pozo; fraccion: number; crudo: number; agua: number }> = []
  for (const p of orden) {
    if (w >= aguaAQuitar - 1e-9) break
    const ag = agua(p, t), cr = crudo(p, t)
    const frac = Math.min(1, (aguaAQuitar - w) / Math.max(1, ag))
    w += ag * frac; c += cr * frac
    pasos.push({ pozo: p, fraccion: frac, crudo: cr * frac, agua: ag * frac })
  }
  return { crudo: c, agua: w, pasos }
}

function evitable(tramos: Tramo[]): number {
  const porEvento = new Map<string, Tramo[]>()
  for (const t of tramos) if (t.causa.tipo === 'reinyeccion' && t.causa.evento && t.bbl > 0)
    anotar(porEvento, t.causa.evento, t)
  let total = 0
  for (const ts of porEvento.values()) total += evitableDeEvento(ts)
  return total
}

/* ──────────────────────────────── día a día ──────────────────────────────── */

export interface Dia {
  dia: Date
  /** Horas del día dentro del período (el de hoy es parcial). */
  horas: number
  /** Null si ningún campo tiene el fiscal de ese día: es un hueco del punto
   *  de medición oficial y se pinta como hueco, no como cero. */
  real: number | null
  /** Campos sin el fiscal de ese día: no entran ni en lo real ni en el
   *  potencial del día (igual que en el libro). */
  faltan: string[]
  potencial: number
  /** Σ de los diferidos de ese día. */
  diferido: number
  /** Lo que no explican los eventos de ese día: el inventario del tanque de
   *  venta entre un día y otro. En el mes entero se compensa. Null sin fiscal. */
  residuo: number | null
  /** Producción que pide la meta firmada en las horas de ese día, bbl. Null
   *  si algún campo no tiene meta firmada ese día: la suma de los demás no es
   *  la meta del día. */
  meta: number | null
}

/** Producción de cada día del período: real del punto de medición oficial,
 *  potencial de las pruebas y diferido de los eventos de ese día. */
export function porDia(campoIds: string[], desde: Date, hasta: Date, ctx: Contexto): Dia[] {
  const d0 = desde.getTime(), h0 = Math.min(hasta.getTime(), ahora)
  const dias = new Map<number, Dia>()
  for (const c of campoIds) {
    const calc = calcCampo(c)
    const pozos = pozosDe(c).filter(p => p.pruebas.length)
    porDias(d0, h0, (dia, h) => {
      const m = mesDe(dia)!
      const horasDia = (Math.min(dia + D, m.hasta) - dia) / H
      const fa = calc.fa.get(m.mes)
      const fiscal = calc.realDia.get(dia)
      const x: Dia = dias.get(dia) ?? { dia: new Date(dia), horas: h, real: null, faltan: [], potencial: 0, diferido: 0, residuo: null, meta: 0 }
      // Como en el libro: el campo sin fiscal ese día no entra ni en lo real
      // ni en el potencial del día; si ninguno lo tiene, el día es un hueco.
      if (fiscal === undefined || fa === undefined) x.faltan.push(c)
      else {
        x.real = (x.real ?? 0) + fiscal * h / horasDia
        x.potencial += pozos.reduce((a, p) => a + crudo(p, dia) * fa * h / 24, 0)
      }
      const mt = metaEn(ctx.config, c, dia)
      x.meta = !mt || x.meta === null ? null : x.meta + (mt.produccionBpd * h) / 24
      dias.set(dia, x)
    })
    for (const ev of eventosDeCampo(c)) {
      const p = pozos.find(x => x.id === ev.pozo)
      if (!p) continue
      const a = Math.max(ms(ev.inicio), d0), b = Math.min(ev.fin ? ms(ev.fin) : ahora, h0)
      if (b <= a) continue
      porDiasDelEvento(c, ev, a, b, (dia, h) => {
        const x = dias.get(dia)
        if (x) x.diferido += crudo(p, dia) * (calc.fa.get(mesDe(dia)?.mes ?? '') ?? 0) * h * fraccion(ev, p, dia) / 24
      })
    }
  }
  return [...dias.values()].sort((a, b) => a.dia.getTime() - b.dia.getTime())
    .map(x => ({ ...x, residuo: x.real === null ? null : x.potencial - x.real - x.diferido }))
}

/** El fiscal de los últimos `n` días completos, del más viejo al más nuevo:
 *  lo que muestra el computador de flujo del punto de medición oficial. Un
 *  día sin dato va como null. */
export function fiscalUltimosDias(campoId: string, n: number): Array<number | null> {
  const calc = calcCampo(campoId)
  const ayer = fiscalDeAyer(campoId).fecha.getTime()
  const out: Array<number | null> = []
  for (const m of calendario()) for (let d = m.desde; d < m.hasta && d <= ayer; d += D) out.push(calc.realDia.get(d) ?? null)
  return out.slice(-n)
}

/** El fiscal del último día completo del campo; null si el computador de
 *  flujo no lo reportó. */
export function fiscalDeAyer(campoId: string): { fecha: Date; bbl: number | null } {
  const calc = calcCampo(campoId)
  const ult = calendario().at(-1)!
  // El día de hoy no está completo: el último completo es el anterior.
  let dia = ult.desde + Math.floor((ahora - ult.desde) / D) * D - D
  if (dia < ult.desde) dia = calendario().at(-2)!.desde + Math.floor((calendario().at(-2)!.hasta - calendario().at(-2)!.desde) / D - 1) * D
  return { fecha: new Date(dia), bbl: calc.realDia.get(dia) ?? null }
}

/* ──────────────────────────── mes a mes y base ──────────────────────────── */

export interface MesLibro {
  mes: string
  corto: string
  nombre: string
  desde: Date
  hasta: Date
  parcial: boolean
  libro: Libro
}

const NOMBRE_MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export function serieMensual(campoIds: string[], ctx: Contexto): MesLibro[] {
  return calendario().map(m => {
    const n = Number(m.mes.slice(5)) - 1
    return {
      mes: m.mes, corto: NOMBRE_MES[n]!.slice(0, 3), nombre: `${NOMBRE_MES[n]![0]!.toUpperCase()}${NOMBRE_MES[n]!.slice(1)} ${m.mes.slice(0, 4)}`,
      desde: new Date(m.desde), hasta: new Date(m.hasta), parcial: !publicadoEnTodos(campoIds, m.mes),
      libro: libro(campoIds, new Date(m.desde), new Date(m.hasta), ctx),
    }
  })
}

export interface LineaBase {
  desde: Date
  hasta: Date
  nombre: string
  baseDia: number
  periodoDia: number
  /** (período − base) ÷ base. Positivo es peor. */
  cambio: number
}

/** La base son los tres meses publicados antes del período, en barriles por
 *  día. Sin tres meses de historia, no hay base. Es contexto (¿va mejor o peor
 *  que antes?), no meta: la meta es la que firma el gerente (`MetaPeriodo`). */
export function lineaBase(campoIds: string[], desde: Date, hasta: Date, ctx: Contexto): LineaBase | undefined {
  const previos = calendario().filter(m => publicadoEnTodos(campoIds, m.mes) && m.hasta <= desde.getTime())
  if (previos.length < 3) return undefined
  const tres = previos.slice(-3)
  const b0 = new Date(tres[0]!.desde), b1 = new Date(tres[2]!.hasta)
  const base = libro(campoIds, b0, b1, ctx)
  const actual = libro(campoIds, desde, hasta, ctx)
  const dias = (a: Date, b: Date) => (Math.min(b.getTime(), ahora) - a.getTime()) / D
  const baseDia = base.brecha / dias(b0, b1)
  const periodoDia = actual.brecha / dias(desde, hasta)
  const nombres = tres.map(m => NOMBRE_MES[Number(m.mes.slice(5)) - 1]!.slice(0, 3))
  return { desde: b0, hasta: b1, nombre: `${nombres[0]} a ${nombres[2]}`, baseDia, periodoDia,
    cambio: baseDia > 0 ? (periodoDia - baseDia) / baseDia : 0 }
}

/* ──────────────────────── por equipo de la línea ──────────────────────── */

export interface HistorialParte {
  parte: ParteId
  /** Sin contar disparos de la electrosumergible. */
  fallas: number
  disparos: number
  bbl: number
  /** Horas fuera de servicio promedio de sus fallas CERRADAS (incluye la
   *  espera). La que sigue abierta lleva horas parciales: no entra. Sin
   *  ninguna cerrada, no hay promedio. */
  mdtH?: number
  /** Días de historia ÷ fallas. Con menos de dos fallas no se calcula. */
  mtbfDias?: number
  /** Barriles promedio de sus fallas cerradas. */
  bblPorFalla?: number
  ultima?: Date
}

export interface FallaEquipo {
  id: string
  inicio: Date
  fin: Date | null
  horas: number
  parte?: ParteId
  como: ComoSeIdentifico
  /** Barriles que se le cargaron (cero si el tanque o el respaldo lo absorbieron). */
  bbl: number
  disparo: boolean
}

export interface HistorialEquipo {
  /** Días de historia sobre los que se cuentan las fallas. */
  dias: number
  /** Más reciente primero. Incluye los disparos, marcados. */
  eventos: FallaEquipo[]
  fallas: number
  disparos: number
  porParte: HistorialParte[]
  /** Cuenta todas las fallas, también la abierta: ya falló. */
  mtbfDias?: number
  /** Promedio de horas fuera de las fallas cerradas. */
  mdtH?: number
  bbl: number
  /** Fallas cerradas: sobre ellas se sacan los promedios. */
  fallasCerradas: number
  /** Barriles promedio de cada falla cerrada (las que el tanque absorbió
   *  cuentan como cero). La abierta lleva barriles parciales y no entra. */
  bblPorFalla?: number
}

/** Toda la historia de fallas de un equipo de alto impacto (bomba de la
 *  línea o electrosumergible de un pozo), cuesten barriles o no: una parada
 *  que el tanque absorbió también es una falla de la bomba. Las paradas que
 *  causó otro equipo o el programa no son fallas suyas. */
/* La historia completa de tramos de un campo, una vez por contexto: el
   historial de cada equipo y de cada electrosumergible la consulta. */
const HISTORIA = new WeakMap<Contexto, Map<string, Tramo[]>>()
function historiaDe(campoId: string, ctx: Contexto): Tramo[] {
  let porCampo = HISTORIA.get(ctx)
  if (!porCampo) HISTORIA.set(ctx, porCampo = new Map())
  const ya = porCampo.get(campoId)
  if (ya) return ya
  const ts = tramosDe([campoId], calendario()[0]!.desde, ahora, ctx)
  porCampo.set(campoId, ts)
  return ts
}

/** Barriles de cada evento (de bomba, servicio o pozo) en toda la historia,
 *  una vez por contexto y campo. */
const BBL_EVENTO = new WeakMap<Contexto, Map<string, Map<string, number>>>()
function bblPorEvento(campoId: string, ctx: Contexto): Map<string, number> {
  let porCampo = BBL_EVENTO.get(ctx)
  if (!porCampo) BBL_EVENTO.set(ctx, porCampo = new Map())
  const ya = porCampo.get(campoId)
  if (ya) return ya
  const m = new Map<string, number>()
  for (const t of historiaDe(campoId, ctx)) {
    const k = t.causa.evento ?? t.evento.id
    m.set(k, (m.get(k) ?? 0) + t.bbl)
  }
  porCampo.set(campoId, m)
  return m
}

export interface EventoCargado {
  id: string
  inicio: Date
  /** Último pozo que volvió a producir; null si alguno sigue parado. */
  fin: Date | null
  bbl: number
  pozos: number
  causa: Causa
}

/** Los eventos que se le cargan a un equipo (un servicio, un alimentador, una
 *  bomba o un pozo) en toda la historia, con lo que costó cada uno. */
export function eventosCargadosA(campoId: string, equipo: string, ctx: Contexto): EventoCargado[] {
  // La lista de equipos y la ficha lo piden por cada equipo del campo: una vez por contexto.
  let m = CARGADOS.get(ctx)
  if (!m) CARGADOS.set(ctx, m = new Map())
  const k = `${campoId}|${equipo}`
  if (!m.has(k)) m.set(k, calcularCargados(campoId, equipo, ctx))
  return m.get(k)!
}
const CARGADOS = new WeakMap<Contexto, Map<string, EventoCargado[]>>()
function calcularCargados(campoId: string, equipo: string, ctx: Contexto): EventoCargado[] {
  const por = new Map<string, EventoCargado & { _pozos: Set<string> }>()
  for (const t of historiaDe(campoId, ctx)) {
    if (t.causa.equipo !== equipo) continue
    const k = t.causa.evento ?? t.evento.id
    // La hora del evento es la de su causa (la parada de la bomba o del
    // servicio), no la del primer pozo que se cerró.
    const fuente = paradaPorId(k) ?? servicioPorId(k)
    const x = por.get(k) ?? { id: k, inicio: fuente ? new Date(fuente.inicio) : t.inicio, fin: t.fin, bbl: 0, pozos: 0, causa: t.causa, _pozos: new Set<string>() }
    x.bbl += t.bbl
    x._pozos.add(t.pozo.id)
    if (!fuente && t.inicio < x.inicio) x.inicio = t.inicio
    x.fin = t.abierto || x.fin === null ? null : t.fin > x.fin ? t.fin : x.fin
    por.set(k, x)
  }
  return [...por.values()].map(({ _pozos, ...x }) => ({ ...x, pozos: _pozos.size }))
    .sort((a, b) => b.inicio.getTime() - a.inicio.getTime())
}

/* El historial de cada equipo se pide en bucle (cada aviso de SAP, cada
   electrosumergible del riesgo, cada fila de confiabilidad): una vez por
   contexto. */
const HISTORIAL = new WeakMap<Contexto, Map<string, HistorialEquipo>>()
export function historialDeEquipo(campoId: string, equipo: string, ctx: Contexto): HistorialEquipo {
  let m = HISTORIAL.get(ctx)
  if (!m) HISTORIAL.set(ctx, m = new Map())
  const k = `${campoId}|${equipo}`
  const ya = m.get(k)
  if (ya) return ya
  const h = armarHistorial(campoId, equipo, ctx)
  m.set(k, h)
  return h
}

function armarHistorial(campoId: string, equipo: string, ctx: Contexto): HistorialEquipo {
  const desde = calendario()[0]!.desde
  const bblDe = bblPorEvento(campoId, ctx)
  const eventos: FallaEquipo[] = []
  const agregar = (id: string, c: Causa, inicio: string, fin: string | null, disparo: boolean) => {
    const a = ms(inicio), b = fin ? ms(fin) : ahora
    eventos.push({ id, inicio: new Date(a), fin: fin ? new Date(b) : null, horas: (b - a) / H, parte: c.parte, como: c.como, bbl: bblDe.get(id) ?? 0, disparo })
  }
  if (perfilBomba(equipo, campoId)) {
    for (const ev of eventosBomba()) {
      if (ev.campoId !== campoId || ev.equipo !== equipo || ms(ev.inicio) < desde) continue
      const c = causaDeParada(ev, ctx)
      if (c.tipo === 'reinyeccion' || c.tipo === 'transporte') agregar(ev.id, c, ev.inicio, ev.fin, false)
    }
  } else {
    for (const ev of eventosDeCampo(campoId)) {
      if (ev.pozo !== equipo || ms(ev.inicio) < desde) continue
      const c = causaDeEvento(ev, ctx)
      if (c.tipo !== 'electrosumergible' || c.equipo !== equipo) continue
      agregar(ev.id, c, ev.inicio, ev.fin, esDisparo({ causa: c, evento: ev }))
    }
  }
  eventos.sort((a, b) => b.inicio.getTime() - a.inicio.getTime())
  const dias = (ahora - desde) / D
  const fallas = eventos.filter(e => !e.disparo)
  const cerradas = fallas.filter(e => e.fin)
  const mtbf = (n: number) => (n >= 2 ? dias / n : undefined)
  // Los promedios (horas fuera, barriles por falla) solo con fallas cerradas:
  // la abierta lleva horas y barriles parciales y se compararía consigo misma.
  const mdt = (xs: FallaEquipo[]) => {
    const c = xs.filter(e => e.fin)
    return c.length ? c.reduce((a, e) => a + e.horas, 0) / c.length : undefined
  }
  const partes = new Map<ParteId, FallaEquipo[]>()
  for (const e of eventos) if (e.parte) anotar(partes, e.parte, e)
  const porParte: HistorialParte[] = [...partes.entries()].map(([parte, es]) => {
    const f = es.filter(e => !e.disparo), fc = f.filter(e => e.fin)
    return { parte, fallas: f.length, disparos: es.length - f.length, bbl: suma(es), mdtH: mdt(f),
      mtbfDias: mtbf(f.length), bblPorFalla: fc.length ? suma(fc) / fc.length : undefined, ultima: es[0]?.inicio }
  }).sort((a, b) => b.bbl - a.bbl || b.fallas - a.fallas)
  return { dias, eventos, fallas: fallas.length, disparos: eventos.length - fallas.length, porParte,
    mtbfDias: mtbf(fallas.length), mdtH: mdt(fallas), bbl: suma(eventos),
    fallasCerradas: cerradas.length, bblPorFalla: cerradas.length ? suma(cerradas) / cerradas.length : undefined }
}

/** Lo que cada parte de un equipo le ha costado en toda la historia que hay. */
export const historialDePartes = (campoId: string, equipo: string, ctx: Contexto) =>
  historialDeEquipo(campoId, equipo, ctx).porParte

/** El diferido que se le carga a un equipo en el período, con sus tramos. */
export function diferidoDeEquipo(campoId: string, equipo: string, desde: Date, hasta: Date, ctx: Contexto) {
  // Toda la historia ya está calculada por contexto: no se recalcula el campo.
  const todo = desde.getTime() <= calendario()[0]!.desde && hasta.getTime() >= ahora
  const ts = (todo ? historiaDe(campoId, ctx) : tramosDe([campoId], desde.getTime(), Math.min(hasta.getTime(), ahora), ctx)).filter(t => t.causa.equipo === equipo)
  const bbl = ts.reduce((a, t) => a + t.bbl, 0)
  const tol = toleranciaDe(ts)
  return { tramos: ts, bbl, tolerancia: bbl > 0 ? tol / bbl : 0, rango: [bbl - tol, bbl + tol] as [number, number],
    eventos: new Set(ts.map(t => t.causa.evento ?? t.evento.id)).size }
}

/** Lo que valen unos tramos, con el precio de cada día (igual que el libro):
 *  el barril de cada tramo se reparte por sus horas en cada día. Sin precio en
 *  ningún día, no hay valor (no se inventa). */
export function valorDeTramos(ts: Tramo[], ctx: Contexto): number | undefined {
  let v = 0, alguno = false
  for (const t of ts) {
    const a = t.inicio.getTime(), b = Math.max(a + 1, t.fin.getTime()), largo = b - a
    for (let d = inicioDiaCo(a); d < b; d += D) {
      const p = precioEn(ctx.config, t.pozo.campoId, d)
      const parte = (Math.min(b, d + D) - Math.max(a, d)) / largo
      if (p !== undefined && parte > 0) { v += t.bbl * parte * p; alguno = true }
    }
  }
  return alguno ? v : undefined
}
