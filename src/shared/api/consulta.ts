import { use } from 'react'
import { FUENTE, pedirJson } from './fuente'
import { deRespuesta } from './cable'
import { urlDe, type Endpoint } from './contrato'

/** La caché de consultas de la costura: UNA entrada por endpoint, parámetros
 *  y versión del contexto, compartida por todas las pantallas. La cabecera, el
 *  riel y la pantalla que piden el estado del mismo campo leen la misma
 *  entrada: en el demo se calcula una vez, y con el servidor es un solo pedido.
 *
 *  Se lee con `use()` de React 19:
 *  - En el demo la entrada nace resuelta (el motor responde en el acto) y
 *    `use()` devuelve el valor sin suspender: la pantalla no parpadea.
 *  - Con el servidor la entrada es la promesa del pedido: la pantalla se
 *    suspende y el <Suspense> de App muestra «Cargando…» mientras llega. Si
 *    falla, `use()` lanza el error y lo recibe el LimiteDeError, que ofrece
 *    reintentar (`reintentarConsultas`).
 *
 *  La versión entra en la clave: cuando alguien firma una configuración o
 *  responde una parada, el contexto cambia, sus consultas son otras entradas
 *  y las viejas salen solas por antigüedad. */

/** Una entrada: la promesa con su estado a la vista, como la lee `use()`. */
type Entrada<T> = Promise<T> & { status: 'pending' | 'fulfilled' | 'rejected'; value?: T; reason?: unknown }

/** Cuántas respuestas guarda: un libro de toda la historia pesa megas, y lo que
 *  sale por antigüedad es lo que ninguna pantalla está mirando. */
const MAXIMO = 150
const cache = new Map<string, Entrada<unknown>>()

function resuelta<T>(v: T): Entrada<T> {
  const p = Promise.resolve(v) as Entrada<T>
  p.status = 'fulfilled'; p.value = v
  return p
}
function rechazada<T>(e: unknown): Entrada<T> {
  const p = Promise.reject(e) as Entrada<T>
  p.status = 'rejected'; p.reason = e
  // El error no se pierde: queda en la entrada y `use()` lo lanza al
  // LimiteDeError. Este manejador solo lo anota (sin él, el navegador lo
  // contaba además como una promesa rechazada que nadie atendió).
  p.then(undefined, motivo => { p.reason = motivo })
  return p
}
function enCamino<T>(prometida: Promise<T>): Entrada<T> {
  const p = prometida as Entrada<T>
  p.status = 'pending'
  p.then(v => { p.status = 'fulfilled'; p.value = v }, e => { p.status = 'rejected'; p.reason = e })
  return p
}

function entrada<T>(clave: string, crear: () => Entrada<T>): Entrada<T> {
  const ya = cache.get(clave) as Entrada<T> | undefined
  if (ya) {
    // La más usada pasa al final: lo que sale por antigüedad es lo que nadie mira.
    cache.delete(clave); cache.set(clave, ya)
    return ya
  }
  const nueva = crear()
  cache.set(clave, nueva)
  if (cache.size > MAXIMO) cache.delete(cache.keys().next().value!)
  return nueva
}

/* La versión de un objeto de la sesión (el contexto, los avisos enviados, las
   versiones firmadas): cambia cuando cambia el objeto, porque la sesión
   nunca lo modifica en su lugar: cada cambio es un objeto nuevo. */
const VERSIONES = new WeakMap<object, number>()
let siguiente = 0
export function versionDe(o: object): number {
  let v = VERSIONES.get(o)
  if (v === undefined) VERSIONES.set(o, v = ++siguiente)
  return v
}

/** El pedido real: GET al servidor y la respuesta revivida al dominio. */
const delServidor = <P extends object, T, J>(ep: Endpoint<P, T, J>, p: P): Promise<T> =>
  pedirJson(urlDe(ep, p)).then(r => deRespuesta(ep.codec, r))

function entradaDe<P extends object, T, J>(ep: Endpoint<P, T, J>, p: P, version: string, calcular: () => T): Entrada<T> {
  return entrada(`${urlDe(ep, p)}#${version}`, () => {
    if (FUENTE === 'http') return enCamino(delServidor(ep, p))
    // En el demo responde el motor, en el acto. Si revienta (un dato que no
    // existe), el error queda en la entrada y sale igual que el del servidor.
    try { return resuelta(calcular()) } catch (e) { return rechazada(e) }
  })
}

/** Lee un endpoint durante el dibujo. `version` es la del contexto con que se
 *  calcula (`versionDe(ctx)`, y lo demás de la sesión de que dependa);
 *  `calcular` es la respuesta del demo, la misma fórmula que el backend. */
export function useDato<P extends object, T, J>(ep: Endpoint<P, T, J>, p: P, version: string, calcular: () => T): T {
  return use(entradaDe(ep, p, version, calcular) as Promise<T>)
}

/** Como `useDato`, pero sin pedir nada cuando no hay qué pedir (`p` null: una
 *  bomba sin perfil no tiene predicción). Devuelve undefined en ese caso. */
export function useDatoSi<P extends object, T, J>(ep: Endpoint<P, T, J>, p: P | null, version: string, calcular: (p: P) => T): T | undefined {
  // `use()` sí admite ir dentro de una condición (no así los demás ganchos).
  return p === null ? undefined : use(entradaDe(ep, p, version, () => calcular(p)) as Promise<T>)
}

/** Varias consultas al mismo endpoint, tantas como haga falta (los meses
 *  recortados de un período, por ejemplo). `use()` sí se puede llamar en un
 *  ciclo; un gancho por cada una no. */
export function useDatos<P extends object, T, J>(ep: Endpoint<P, T, J>, ps: P[], version: string, calcular: (p: P) => T): T[] {
  const out: T[] = []
  for (const p of ps) out.push(use(entradaDe(ep, p, version, () => calcular(p)) as Promise<T>))
  return out
}

/** La misma consulta fuera del dibujo (en un manejador: exportar un informe).
 *  Comparte la caché con `useDato`. */
export function traer<P extends object, T, J>(ep: Endpoint<P, T, J>, p: P, version: string, calcular: () => T): Promise<T> {
  const e = entradaDe(ep, p, version, calcular)
  return e.status === 'fulfilled' ? Promise.resolve(e.value as T) : e
}

/** Olvida las consultas que fallaron: al volver a dibujar se piden de nuevo.
 *  Lo llama el botón «Reintentar» del LimiteDeError. */
export function reintentarConsultas(): void {
  for (const [k, e] of cache) if (e.status === 'rejected') cache.delete(k)
}
