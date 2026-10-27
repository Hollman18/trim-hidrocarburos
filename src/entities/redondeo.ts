/** EL REDONDEO (F2 · V2, «la regla de redondeo»; X4 §1.3.3, «un nombre, una cifra»).
 *
 *  Se redondea UNA vez, en el motor, de arriba abajo. La pantalla pinta enteros
 *  que ya suman y nunca redondea por su cuenta.
 *
 *  1. La raíz es el total de un campo en su período (o «ahora»): el entero más
 *     cercano, una sola vez. Es la cifra del norte, la del papel y la de la ANH
 *     (1.046 y 1.966 en La Ceiba). Nunca se recalcula sumando las partes.
 *  2. Debajo de la raíz (tramo → equipo → fila o evento), el entero de cada nodo
 *     sale de repartir el de su padre por mayor residuo (método de Hamilton):
 *     desempata el valor exacto mayor y después el id, siempre igual. Se publica
 *     una vez por campo y período, y toda pantalla que muestre ese nodo lee ese
 *     entero, aunque lo muestre solo (LC-08 = 108 en todas partes, no 109).
 *  3. Encima de la raíz (todos los campos, varios meses), el total que se
 *     muestra es la suma de los enteros de las raíces (2.376 = 1.253 + 1.046 + 77).
 *  4. El valor exacto se conserva en el contrato (los campos de siempre) y en la
 *     ⓘ de «calculado»; el archivo para la ANH sigue con sus decimales.
 *
 *  Las partes del diferido salen de las MISMAS filas de la ANH que reparten por
 *  tramo (`filasDelChoke`, choke-reparto.ts): cada barril va a un tramo, y dentro
 *  del tramo a su elemento (la hoja del tramo) y a su equipo con su causa (la
 *  fila del Pareto del libro). Una baja tensión que cerró pozos cuelga del pozo
 *  como elemento y de la subestación como equipo: son dos maneras de partir el
 *  mismo tramo, y las dos suman su entero. */
import type { Contexto } from './causa-senal'
import type { ChokeAnh, ChokeOSinAsignar, EscalonOSinClasificar } from './choke'
import { CHOKES_Y_SIN_ASIGNAR, ESCALONES } from './choke'
import { filasDelChoke, filaEnPeriodo, bblEnPeriodo, tramoVigente, elementoDeFila, escalonDeFila, type OpcionesReparto } from './choke-reparto'
import { AHORA } from './reloj'

/** Una parte que se reparte: su id (el desempate) y su valor exacto. */
export interface ParteExacta { id: string; valor: number }

/** El entero más cercano de un total, sin «−0». */
export const enteroDe = (x: number): number => { const r = Math.round(x); return r === 0 ? 0 : r }

/** Reparte el entero `total` entre las partes por mayor residuo (Hamilton).
 *  Las partes van en la misma unidad que el total (los barriles de un tramo y los
 *  de sus equipos): cada una recibe la parte entera de su valor exacto y lo que
 *  falta para `total` va, de a uno, a las de mayor residuo (la parte decimal).
 *  Si las partes no suman lo mismo que el total (otra unidad), se reparten en
 *  proporción. Devuelve un entero por parte, en el mismo orden, que suman `total`
 *  (si alguna parte tiene valor). Las partes negativas cuentan como cero.
 *  Desempate: el residuo mayor; a residuo igual, el valor exacto mayor; y a valor
 *  igual, el id (orden alfabético). Siempre igual: el mismo nodo, el mismo entero. */
export function repartirEnteros(total: number, partes: readonly ParteExacta[]): number[] {
  const t = Math.max(0, Math.round(total))
  const vs = partes.map(p => (Number.isFinite(p.valor) && p.valor > 0 ? p.valor : 0))
  const suma = vs.reduce((a, v) => a + v, 0)
  if (t === 0 || suma <= 0) return partes.map(() => 0)
  // En la misma unidad (Σ partes ≈ total): el residuo es la parte decimal del valor exacto.
  const cuotas = Math.abs(suma - t) <= partes.length ? vs : vs.map(v => (t * v) / suma)
  return conResiduo(t, cuotas, vs, partes)
}

function conResiduo(t: number, cuotas: readonly number[], vs: readonly number[], partes: readonly ParteExacta[]): number[] {
  const out = cuotas.map(q => Math.floor(q + 1e-9))
  let resto = t - out.reduce((a, x) => a + x, 0)
  const porId = (a: number, b: number) => (partes[a]!.id < partes[b]!.id ? -1 : partes[a]!.id > partes[b]!.id ? 1 : 0)
  const conValor = partes.map((_, i) => i).filter(i => vs[i]! > 0)
  // Lo que falta, a las de mayor residuo; lo que sobra (casi nunca: un total que bajó al redondear su padre), de las de menor.
  const mayor = [...conValor].sort((a, b) => (cuotas[b]! - out[b]!) - (cuotas[a]! - out[a]!) || vs[b]! - vs[a]! || porId(a, b))
  for (let k = 0; resto > 0 && mayor.length; k = (k + 1) % mayor.length, resto--) out[mayor[k]!]!++
  const menor = [...conValor].sort((a, b) => (cuotas[a]! - out[a]!) - (cuotas[b]! - out[b]!) || vs[a]! - vs[b]! || porId(b, a))
  for (let k = 0, vueltas = 0; resto < 0 && menor.length && vueltas < 4 * menor.length; k = (k + 1) % menor.length, vueltas++) {
    if (out[menor[k]!]! > 0) { out[menor[k]!]!--; resto++ }
  }
  return out
}

/** Reparte y devuelve el entero de cada id. */
export function enterosPorId(total: number, partes: readonly ParteExacta[]): Record<string, number> {
  const xs = repartirEnteros(total, partes)
  return Object.fromEntries(partes.map((p, i) => [p.id, xs[i]!]))
}

/** El porcentaje entero de cada parte de su suma (Σ = 100), por mayor residuo. */
export function porcentajesEnteros(partes: readonly ParteExacta[]): number[] {
  const vs = partes.map(p => (Number.isFinite(p.valor) && p.valor > 0 ? p.valor : 0))
  const suma = vs.reduce((a, v) => a + v, 0)
  if (suma <= 0) return partes.map(() => 0)
  return conResiduo(100, vs.map(v => (100 * v) / suma), vs, partes)
}

/* ─────────────────────── el diferido de un campo en su período ─────────────────────── */

/** El entero de cada nodo del diferido de UN campo en un período (bbl). */
export interface EnterosDelPeriodo {
  campoId: string
  /** El diferido exacto (Σ de las filas = el del libro). */
  exacto: number
  /** El entero de la raíz: el más cercano al exacto, una sola vez. */
  raiz: number
  /** Por tramo, con lo sin identificar en `sin-asignar` (Σ = `raiz`). */
  porTramo: Record<ChokeOSinAsignar, number>
  /** Por escalón de la escalera («por qué no se produjo»), la otra partición de la raíz (Σ = `raiz`). */
  porEscalon: Record<EscalonOSinClasificar, number>
  /** Dentro de cada tramo, por elemento (la raíz de la cascada o el pozo): la hoja del tramo. */
  porElemento: Record<ChokeOSinAsignar, Record<string, number>>
  /** Por equipo y causa (`${equipo}|${tipo}`): la fila del Pareto del libro, Σ de sus tramos. */
  porCausa: Record<string, number>
  /** Por equipo, con todas sus causas. */
  porEquipo: Record<string, number>
  /** Por fila de la ANH (su id), dentro de su tramo y su equipo con causa. */
  porFila: Record<string, number>
  /** Por evento del pozo (`eventoId` de la fila): Σ de sus filas. */
  porEvento: Record<string, number>
}

const SIN = {}
const GUARDADO = new WeakMap<Contexto, WeakMap<object, Map<string, EnterosDelPeriodo>>>()

/** El entero de cada nodo del diferido de un campo en un período, de arriba abajo.
 *  Guardado por contexto, lo guardado por las personas, campo y período (D7). */
export function enterosDelPeriodo(campoId: string, desde: Date, hasta: Date, ctx: Contexto, op: OpcionesReparto = {}): EnterosDelPeriodo {
  let porG = GUARDADO.get(ctx)
  if (!porG) GUARDADO.set(ctx, porG = new WeakMap())
  const kg = (op.guardadas ?? SIN) as object
  let m = porG.get(kg)
  if (!m) porG.set(kg, m = new Map())
  const clave = `${campoId}|${desde.getTime()}|${hasta.getTime()}`
  const ya = m.get(clave)
  if (ya) return ya
  const v = calcular(campoId, desde, hasta, ctx, op)
  m.set(clave, v)
  return v
}

function calcular(campoId: string, desde: Date, hasta: Date, ctx: Contexto, op: OpcionesReparto): EnterosDelPeriodo {
  const d0 = desde.getTime(), hh = Math.min(hasta.getTime(), AHORA.getTime())
  // Las filas del período con sus barriles, como las lee el reparto por tramo.
  const filas = filasDelChoke([campoId], desde, hasta, ctx, op.guardadas)
    .filter(p => p.campoId === campoId && filaEnPeriodo(p, d0, hh))
    .map(p => ({ p, tramo: tramoVigente(p), elemento: elementoDeFila(p, ctx), causa: `${p.causa.equipo}|${p.causa.tipo}`, bbl: bblEnPeriodo(p, d0, hh) }))
  const exacto = filas.reduce((a, f) => a + f.bbl, 0)
  const raiz = enteroDe(exacto)
  const sumaDe = (xs: typeof filas) => xs.reduce((a, f) => a + f.bbl, 0)
  /** Agrupa por una clave y reparte el entero del padre entre los grupos. */
  const partir = (padre: number, xs: typeof filas, clave: (f: (typeof filas)[number]) => string) => {
    const grupos = new Map<string, typeof filas>()
    for (const f of xs) { const k = clave(f); const g = grupos.get(k); if (g) g.push(f); else grupos.set(k, [f]) }
    const partes = [...grupos].map(([id, g]) => ({ id, valor: sumaDe(g) }))
    const enteros = enterosPorId(padre, partes)
    return { grupos, enteros }
  }

  const tramos = partir(raiz, filas, f => f.tramo)
  const escalones = partir(raiz, filas, f => escalonDeFila(f.p))
  const porEscalon = Object.fromEntries([...ESCALONES, 'sin-clasificar'].map(k => [k, escalones.enteros[k] ?? 0])) as Record<EscalonOSinClasificar, number>
  const porTramo = Object.fromEntries(CHOKES_Y_SIN_ASIGNAR.map(k => [k, tramos.enteros[k] ?? 0])) as Record<ChokeOSinAsignar, number>
  const porElemento = Object.fromEntries(CHOKES_Y_SIN_ASIGNAR.map(k => [k, {} as Record<string, number>])) as Record<ChokeOSinAsignar, Record<string, number>>
  const porCausa: Record<string, number> = {}, porEquipo: Record<string, number> = {}, porFila: Record<string, number> = {}, porEvento: Record<string, number> = {}
  for (const k of CHOKES_Y_SIN_ASIGNAR) {
    const xs = tramos.grupos.get(k)
    if (!xs) continue
    porElemento[k] = partir(porTramo[k], xs, f => f.elemento).enteros
    const causas = partir(porTramo[k], xs, f => f.causa)
    for (const [c, n] of Object.entries(causas.enteros)) {
      porCausa[c] = (porCausa[c] ?? 0) + n
      const equipo = c.slice(0, c.lastIndexOf('|'))
      porEquipo[equipo] = (porEquipo[equipo] ?? 0) + n
      // Las filas del equipo con su causa, dentro de este tramo.
      const fs = partir(n, causas.grupos.get(c)!, f => f.p.id)
      for (const [id, e] of Object.entries(fs.enteros)) {
        porFila[id] = (porFila[id] ?? 0) + e
        const ev = fs.grupos.get(id)![0]!.p.eventoId
        porEvento[ev] = (porEvento[ev] ?? 0) + e
      }
    }
  }
  return { campoId, exacto, raiz, porTramo, porEscalon, porElemento, porCausa, porEquipo, porFila, porEvento }
}

/** Encima de la raíz: el total de varios campos es la suma de sus enteros. */
export const totalDeCampos = (xs: ReadonlyArray<Pick<EnterosDelPeriodo, 'raiz'>>): number => xs.reduce((a, x) => a + x.raiz, 0)

/** Los enteros del reparto de unos campos en un período (lo que pinta «Por dónde se trabó»): cada
 *  nodo es la suma de los enteros de cada campo, y el total, la suma de sus raíces. JSON puro. */
export interface EnterosDeReparto {
  raiz: number
  porTramo: Record<ChokeOSinAsignar, number>
  porEscalon: Record<EscalonOSinClasificar, number>
  /** Los elementos de cada tramo (la hoja y la fila del tramo), `campoId|elemento` con varios campos y `elemento` con uno. */
  porElemento: Record<ChokeOSinAsignar, Record<string, number>>
  /** La fila del Pareto del libro, `campoId|equipo|tipo`: el mismo entero en todas las vistas (LC-08 = 108). */
  porCausa: Record<string, number>
  porCampo: Record<string, number>
}

export function enterosDeReparto(campos: readonly string[], desde: Date, hasta: Date, ctx: Contexto, op: OpcionesReparto = {}): EnterosDeReparto {
  const xs = campos.map(c => enterosDelPeriodo(c, desde, hasta, ctx, op))
  const sumar = <K extends string>(claves: readonly K[], de: (x: EnterosDelPeriodo) => Record<K, number>) =>
    Object.fromEntries(claves.map(k => [k, xs.reduce((a, x) => a + (de(x)[k] ?? 0), 0)])) as Record<K, number>
  const porElemento = Object.fromEntries(CHOKES_Y_SIN_ASIGNAR.map(k => [k, {} as Record<string, number>])) as Record<ChokeOSinAsignar, Record<string, number>>
  for (const x of xs) for (const k of CHOKES_Y_SIN_ASIGNAR) for (const [e, n] of Object.entries(x.porElemento[k])) {
    const clave = xs.length > 1 ? `${x.campoId}|${e}` : e
    porElemento[k][clave] = (porElemento[k][clave] ?? 0) + n
  }
  return {
    raiz: totalDeCampos(xs), porTramo: sumar(CHOKES_Y_SIN_ASIGNAR, x => x.porTramo), porEscalon: sumar([...ESCALONES, 'sin-clasificar'] as EscalonOSinClasificar[], x => x.porEscalon),
    porElemento, porCausa: Object.fromEntries(xs.flatMap(x => Object.entries(x.porCausa).map(([k, n]) => [`${x.campoId}|${k}`, n]))),
    porCampo: Object.fromEntries(xs.map(x => [x.campoId, x.raiz])),
  }
}

/* ─────────────────────── lo que se deja de producir ahora ─────────────────────── */

/** El entero de cada nodo de lo que se deja de producir ahora en UN campo (bbl/d). */
export interface EnterosDeAhora {
  exacto: number
  raiz: number
  /** Por tramo; lo que todavía no tiene tramo, en `sin-asignar`. */
  porTramo: Record<ChokeOSinAsignar, number>
  /** Por equipo (la causa que paró), dentro de su tramo. */
  porEquipo: Record<string, number>
}

/** Lo que se deja de producir ahora, partido de arriba abajo: la raíz del campo,
 *  sus tramos y, dentro de cada tramo, sus equipos. */
export function enterosDeAhora(lista: ReadonlyArray<{ equipo: string; tramo: ChokeAnh | null; bpd: number }>): EnterosDeAhora {
  const exacto = lista.reduce((a, x) => a + x.bpd, 0)
  const raiz = enteroDe(exacto)
  const tramoDe = (x: { tramo: ChokeAnh | null }): ChokeOSinAsignar => x.tramo ?? 'sin-asignar'
  const tramos = enterosPorId(raiz, CHOKES_Y_SIN_ASIGNAR.map(k => ({ id: k, valor: lista.filter(x => tramoDe(x) === k).reduce((a, x) => a + x.bpd, 0) })))
  const porTramo = Object.fromEntries(CHOKES_Y_SIN_ASIGNAR.map(k => [k, tramos[k] ?? 0])) as Record<ChokeOSinAsignar, number>
  const porEquipo: Record<string, number> = {}
  for (const k of CHOKES_Y_SIN_ASIGNAR) {
    const xs = lista.filter(x => tramoDe(x) === k)
    if (!xs.length) continue
    const por = new Map<string, number>()
    for (const x of xs) por.set(x.equipo, (por.get(x.equipo) ?? 0) + x.bpd)
    for (const [e, n] of Object.entries(enterosPorId(porTramo[k], [...por].map(([id, valor]) => ({ id, valor }))))) porEquipo[e] = (porEquipo[e] ?? 0) + n
  }
  return { exacto, raiz, porTramo, porEquipo }
}
