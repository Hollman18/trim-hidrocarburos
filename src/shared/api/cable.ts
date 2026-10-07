/** El paso por la red: cómo viaja un tipo del front en JSON y cómo vuelve.
 *
 *  Los tipos con que trabajan las pantallas son del motor: llevan `Date`,
 *  `Infinity` (un tanque que no se llena) y entidades enteras anidadas (cada
 *  tramo con su pozo y todas sus pruebas). Nada de eso sobrevive a
 *  `JSON.stringify`: la fecha llega como texto y revienta en el primer
 *  `.getTime()`, el `Infinity` llega como `null`, y el pozo repetido en cada
 *  tramo multiplica el peso de la respuesta.
 *
 *  Por eso cada endpoint declara un CÓDEC (contrato.ts) armado con estas
 *  piezas, y del mismo códec salen las dos direcciones y el tipo del JSON:
 *  - `aDTO`: del dominio al JSON. Es lo que el backend tiene que producir; el
 *    demo lo usa para comprobarlo (scripts/verificar-contrato.mjs).
 *  - `revivir`: del JSON al dominio. Es lo que corre la fuente http con cada
 *    respuesta, el ÚNICO punto que conoce la forma del cable.
 *  Un campo que el códec no nombra pasa tal cual: tiene que ser JSON puro, y
 *  la prueba de ida y vuelta lo vigila (una fecha olvidada vuelve como texto y
 *  la prueba falla diciendo dónde). */

/** Las entidades que una respuesta trae UNA vez y referencia por clave: el
 *  pozo de cien tramos viaja una sola vez en `refs.pozos`. */
export type Refs = Record<string, Record<string, unknown>>

/** Una respuesta del contrato: los datos y las entidades que referencian. */
export interface Respuesta<J> { datos: J; refs: Refs }

/** Cómo lee las referencias quien revive: cada entidad se revive una vez y
 *  todas las que la nombran comparten el mismo objeto, como en el motor. */
export interface Lector { refs: Refs; vivos: Map<string, unknown> }

export interface Codec<T, J> {
  aDTO(x: T, refs: Refs): J
  revivir(j: J, lector: Lector): T
}

/** El tipo JSON que produce un códec. */
export type DTO<C> = C extends Codec<infer _T, infer J> ? J : never

/** La respuesta no tiene la forma del contrato: se dice qué campo y qué
 *  llegó, en vez de dejar que reviente lejos de aquí con «x is undefined». */
export class ErrorDeContrato extends Error {
  /** Dónde: «tramos[3].inicio». */
  readonly ruta: string
  /** Qué llegó mal, sin la ruta. */
  readonly detalle: string
  constructor(detalle: string, ruta = '') {
    super(ruta ? `${ruta}: ${detalle}` : detalle)
    this.name = 'ErrorDeContrato'; this.ruta = ruta; this.detalle = detalle
  }
}

/** Antepone el campo a un error de más adentro: «tramos[3].inicio: …». */
function enRuta<R>(paso: string, f: () => R): R {
  try { return f() }
  catch (e) {
    if (!(e instanceof ErrorDeContrato)) throw e
    throw new ErrorDeContrato(e.detalle, !e.ruta ? paso : e.ruta.startsWith('[') ? `${paso}${e.ruta}` : `${paso}.${e.ruta}`)
  }
}

const TAL: Codec<unknown, unknown> = { aDTO: x => x, revivir: j => j }
/** Un valor que ya es JSON puro (texto, números finitos, listas y objetos de eso). */
export const tal = <T,>(): Codec<T, T> => TAL as Codec<T, T>

const H = 3_600_000
const dos = (n: number) => String(n).padStart(2, '0')
/** Un instante en ISO 8601 con la zona de Colombia (UTC−5, sin horario de
 *  verano) y los milisegundos: «2026-10-02T14:00:00.000-05:00». La zona va
 *  escrita para que quien lea el JSON vea la hora del campo, no la de Londres. */
export function isoColombia(d: Date): string {
  if (Number.isNaN(d.getTime())) throw new ErrorDeContrato('fecha inválida (Invalid Date) al armar el JSON')
  const co = new Date(d.getTime() - 5 * H)
  return `${co.getUTCFullYear()}-${dos(co.getUTCMonth() + 1)}-${dos(co.getUTCDate())}T${dos(co.getUTCHours())}:${dos(co.getUTCMinutes())}:${dos(co.getUTCSeconds())}.${String(co.getUTCMilliseconds()).padStart(3, '0')}-05:00`
}

/** Fecha ⇄ ISO 8601 con zona. Revivir exige zona: un «2026-10-02T14:00» sin
 *  zona lo leería cada navegador en la suya. */
const CON_ZONA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/
export const fecha: Codec<Date, string> = {
  aDTO: d => isoColombia(d),
  revivir: s => {
    if (typeof s !== 'string' || !CON_ZONA.test(s)) throw new ErrorDeContrato(`se esperaba una fecha ISO 8601 con zona y llegó ${JSON.stringify(s)}`)
    return new Date(s)
  },
}

/** Horas que pueden no tener fin (un tanque que nunca se llena): `Infinity`
 *  en el dominio, `null` en el JSON (JSON no tiene infinito). `null` aquí
 *  significa SIEMPRE «no se llena», nunca «sin dato». */
export const horasSinFin: Codec<number, number | null> = {
  aDTO: h => (h === Infinity ? null : h),
  revivir: j => {
    if (j === null) return Infinity
    if (typeof j !== 'number') throw new ErrorDeContrato(`se esperaba un número o null y llegó ${JSON.stringify(j)}`)
    return j
  },
}

/** Una banda con un lado abierto: «< 85» es [-Infinity, 85] y «> 2» es
 *  [2, Infinity]. En el JSON el lado abierto va en `null`; por la posición se
 *  sabe cuál (el primero es la cota de abajo, el segundo la de arriba). */
export const bandaAbierta: Codec<[number, number], [number | null, number | null]> = {
  aDTO: ([a, b]) => [a === -Infinity ? null : a, b === Infinity ? null : b],
  revivir: j => {
    const cota = (x: unknown, abierto: number) => {
      if (x === null) return abierto
      if (typeof x !== 'number') throw new ErrorDeContrato(`se esperaba un número o null en la banda y llegó ${JSON.stringify(x)}`)
      return x
    }
    if (!Array.isArray(j) || j.length !== 2) throw new ErrorDeContrato(`se esperaba una banda [baja, alta] y llegó ${JSON.stringify(j)}`)
    return [cota(j[0], -Infinity), cota(j[1], Infinity)]
  },
}

/** El mismo códec para un subtipo: la señal que cruza su límite es una señal,
 *  con lo mismo en el cable. Solo cambia el tipo que TypeScript ve. */
export const como = <T,>() => <U, J>(c: Codec<U, J>): Codec<T, J> => c as unknown as Codec<T, J>

/** `null` del dominio ⇄ `null` del JSON. */
export const nulo = <T, J>(c: Codec<T, J>): Codec<T | null, J | null> => ({
  aDTO: (x, r) => (x === null ? null : c.aDTO(x, r)),
  revivir: (j, l) => (j === null ? null : c.revivir(j, l)),
})

/** Un campo opcional: `undefined` ⇄ ausente (JSON no tiene undefined). */
export const opc = <T, J>(c: Codec<T, J>): Codec<T | undefined, J | undefined> => ({
  aDTO: (x, r) => (x === undefined ? undefined : c.aDTO(x, r)),
  revivir: (j, l) => (j === undefined || j === null ? undefined : c.revivir(j, l)),
})

/** Una respuesta que puede no existir (`undefined` en el dominio): en el JSON
 *  es `null`, porque el cuerpo de una respuesta no puede faltar. */
export const oNada = <T, J>(c: Codec<T, J>): Codec<T | undefined, J | null> => ({
  aDTO: (x, r) => (x === undefined ? null : c.aDTO(x, r)),
  revivir: (j, l) => (j === null || j === undefined ? undefined : c.revivir(j, l)),
})

export const lista = <T, J>(c: Codec<T, J>): Codec<T[], J[]> => ({
  aDTO: (xs, r) => xs.map(x => c.aDTO(x, r)),
  revivir: (js, l) => {
    if (!Array.isArray(js)) throw new ErrorDeContrato(`se esperaba una lista y llegó ${JSON.stringify(js)?.slice(0, 60)}`)
    return js.map((j, i) => enRuta(`[${i}]`, () => c.revivir(j, l)))
  },
})

/** Un diccionario por clave de texto. */
export const dic = <T, J>(c: Codec<T, J>): Codec<Record<string, T>, Record<string, J>> => ({
  aDTO: (o, r) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, c.aDTO(v, r)])),
  revivir: (o, l) => {
    if (o === null || typeof o !== 'object' || Array.isArray(o)) throw new ErrorDeContrato(`se esperaba un objeto y llegó ${JSON.stringify(o)?.slice(0, 60)}`)
    return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, enRuta(k, () => c.revivir(v, l))]))
  },
})

/** Un par [a, b] (los rangos). */
export const par = <T, J>(c: Codec<T, J>): Codec<[T, T], [J, J]> => ({
  aDTO: ([a, b], r) => [c.aDTO(a, r), c.aDTO(b, r)],
  revivir: (j, l) => {
    if (!Array.isArray(j) || j.length !== 2) throw new ErrorDeContrato(`se esperaba un par [a, b] y llegó ${JSON.stringify(j)}`)
    return [enRuta('[0]', () => c.revivir(j[0], l)), enRuta('[1]', () => c.revivir(j[1], l))]
  },
})

/** Los campos de un objeto que necesitan códec; los demás pasan tal cual. */
type Especiales<T> = { [K in keyof T]?: Codec<T[K], unknown> }
/** El objeto en JSON: lo que no se nombra queda igual, y cada campo nombrado
 *  toma el tipo JSON de su códec (conservando si es opcional). */
type Cable<T, E> = { [K in keyof T as K extends keyof E ? never : K]: T[K] }
  & { [K in keyof T as K extends keyof E ? K : never]: DTO<E[K & keyof E]> }

/** Un objeto: `obj<Tipo>()({ campo: códec, … })`. Se escribe en dos pasos
 *  para que TypeScript compruebe cada códec contra el tipo del campo. */
export function obj<T extends object>() {
  return <E extends Especiales<T>>(esp: E): Codec<T, Cable<T, E>> => {
    const claves = Object.keys(esp) as Array<keyof T & string>
    return {
      aDTO: (x, r) => {
        const o: Record<string, unknown> = { ...(x as Record<string, unknown>) }
        for (const k of claves) {
          const v = c(esp, k).aDTO(x[k], r)
          if (v === undefined) delete o[k]; else o[k] = v
        }
        return o as Cable<T, E>
      },
      revivir: (j, l) => {
        if (j === null || typeof j !== 'object' || Array.isArray(j)) throw new ErrorDeContrato(`se esperaba un objeto y llegó ${JSON.stringify(j)?.slice(0, 60)}`)
        const o: Record<string, unknown> = { ...(j as object) }
        for (const k of claves) {
          const v = enRuta(k, () => c(esp, k).revivir((j as Record<string, unknown>)[k], l))
          if (v === undefined) delete o[k]; else o[k] = v
        }
        return o as T
      },
    }
  }
}
const c = <T,>(esp: Especiales<T>, k: keyof T) => esp[k] as Codec<unknown, unknown>

/** Una entidad que la respuesta trae una sola vez, en `refs[coleccion]`, y
 *  aquí se nombra por su clave. Si la clave no viene en refs, el JSON está
 *  incompleto y se dice. */
export function ref<T, J>(coleccion: string, clave: (x: T) => string, cod: Codec<T, J>): Codec<T, string> {
  return {
    aDTO: (x, r) => {
      const k = clave(x), col = (r[coleccion] ??= {})
      if (!Object.hasOwn(col, k)) col[k] = cod.aDTO(x, r)
      return k
    },
    revivir: (k, l) => {
      if (typeof k !== 'string') throw new ErrorDeContrato(`se esperaba la clave de ${coleccion} y llegó ${JSON.stringify(k)}`)
      const id = `${coleccion}\u0000${k}`
      if (l.vivos.has(id)) return l.vivos.get(id) as T
      const col = l.refs[coleccion]
      if (!col || !Object.hasOwn(col, k)) throw new ErrorDeContrato(`la clave «${k}» no viene en refs.${coleccion}`)
      const v = enRuta(`refs.${coleccion}[${JSON.stringify(k)}]`, () => cod.revivir(col[k] as J, l))
      l.vivos.set(id, v)
      return v
    },
  }
}

/** Dominio → respuesta JSON (lo que el backend produce). */
export function aRespuesta<T, J>(cod: Codec<T, J>, x: T): Respuesta<J> {
  const refs: Refs = {}
  return { datos: cod.aDTO(x, refs), refs }
}

/** Respuesta JSON → dominio (lo que hace la fuente http con cada respuesta). */
export function deRespuesta<T, J>(cod: Codec<T, J>, r: unknown): T {
  if (r === null || typeof r !== 'object' || !('datos' in r)) throw new ErrorDeContrato('la respuesta no trae «datos»: se esperaba { datos, refs }')
  const { datos, refs } = r as { datos: J; refs?: Refs }
  return cod.revivir(datos, { refs: refs ?? {}, vivos: new Map() })
}
