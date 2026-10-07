import { createElement, lazy, type ComponentType, type LazyExoticComponent } from 'react'

/** Las pantallas se traen cuando se abren. Si la red se cae (o se publicó una
 *  versión nueva y el archivo viejo ya no está), la carga falla, y React.lazy
 *  recuerda el fallo para siempre: hay que crear de nuevo la carga para reintentar.
 *  `intentos` cuenta las veces seguidas que falló: desde la segunda, la caja
 *  ofrece también recargar la aplicación. */
export class ErrorDeCarga extends Error {
  readonly intentos: number
  constructor(causa: unknown, intentos: number) {
    super(`No se pudo cargar la pantalla: ${String(causa)}`)
    this.name = 'ErrorDeCarga'; this.intentos = intentos
  }
}

const pendientes = new Set<() => void>()

/** Anota cómo rehacer una carga que falló. */
export const anotarFallo = (rehacer: () => void) => { pendientes.add(rehacer) }

/** Rehace las cargas que fallaron: la próxima vez que se dibujen, se traen de nuevo. */
export function reintentarCargas() {
  for (const rehacer of pendientes) rehacer()
  pendientes.clear()
}

/** El archivo que no llegó. Chromium y Firefox lo dicen en el mensaje del
 *  error («Failed to fetch dynamically imported module: https://…/Diferidos-X.js»);
 *  Safari no, y entonces se reintenta con la misma carga. */
export const archivoDelFallo = (e: unknown): string | null =>
  String(e instanceof Error ? e.message : e).match(/(?:https?:)?\/\/[^\s'"?#]+?\.(?:m?js|jsx?|tsx?)(?=[\s'"?#]|$)/)?.[0] ?? null

/** Una pantalla que se carga cuando se abre: el primer paquete trae solo la
 *  aplicación y la pantalla de entrada. Si la carga falla, `reintentarCargas`
 *  la cambia por una carga nueva que de verdad vuelve a pedir el archivo. */
export function pantalla<K extends string>(cargar: () => Promise<Record<K, ComponentType>>, nombre: K): ComponentType {
  let traer = cargar, intentos = 0
  const crear = (): LazyExoticComponent<ComponentType> => lazy<ComponentType>(() => traer().then(
    m => { intentos = 0; return { default: m[nombre] } },
    e => {
      intentos++
      const archivo = archivoDelFallo(e)
      anotarFallo(() => {
        // Repetir `cargar` no sirve: el navegador guarda el import fallido de
        // esa dirección y lo devuelve sin tocar la red. El mismo archivo con
        // una consulta propia es otra dirección para el navegador y sí se
        // vuelve a pedir; lo que ese archivo importa ya está cargado y se
        // comparte. No se usa «?t=»: Vite la trata como marca de recarga y a
        // veces el módulo servido se importa a sí mismo sin ella, es decir,
        // por la dirección que falló, y el reintento volvía a fallar.
        if (archivo) traer = () => import(/* @vite-ignore */ `${archivo}?reintento=${Date.now()}`) as Promise<Record<K, ComponentType>>
        actual = crear()
      })
      throw new ErrorDeCarga(e, intentos)
    }))
  let actual = crear()
  return function Pantalla() { return createElement(actual) }
}
