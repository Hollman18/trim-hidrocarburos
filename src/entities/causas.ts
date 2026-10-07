/** Catálogo de causas de diferido.
 *
 *  No es un árbol inventado: las casillas de primer nivel son las de la
 *  enumeración `ReasonLost` de PRODML v2.0 (§29.15.20, Energistics), que ya
 *  distingue falla de equipo de superficie de falla de equipo de pozo.
 *
 *  La forma del catálogo sigue lo que la categoría tiene resuelto: 5 o 6
 *  categorías de primer nivel con 3 a 5 hijos cada una, nunca una lista plana,
 *  y «Otro» NO disponible por defecto — si se usa mucho, lo que falta es una
 *  causa común o la correcta es difícil de encontrar.
 */

import type { TipoCausa } from './causa-senal'

export interface Categoria {
  id: string
  nombre: string
  /** Nombre corto, el que se ve en el botón. */
  corto: string
  icono: string
  /** Casilla equivalente en la enumeración ReasonLost de PRODML. */
  prodml: string
  hijos: string[]
  /** Si el operador de campo puede observarla desde donde está. */
  observableEnCampo: boolean
}

export const CATALOGO: Categoria[] = [
  { id: 'superficie', corto: 'Equipo de planta', icono: 'wrench', nombre: 'Falla de equipo de superficie', prodml: 'topside equipment failure-maint',
    observableEnCampo: true,
    hijos: ['Bomba', 'Compresor', 'Tratador o separador', 'Servicios industriales', 'Eléctrico'] },
  { id: 'pozo', corto: 'Equipo de pozo', icono: 'pozo', nombre: 'Falla de equipo de pozo', prodml: 'well equipment failure-maint',
    observableEnCampo: true,
    hijos: ['Bomba electrosumergible', 'Bombeo mecánico', 'Cabezal', 'Línea de flujo'] },
  { id: 'programado', corto: 'Programado', icono: 'calendario', nombre: 'Mantenimiento programado', prodml: 'planned maint turnaround · preventive maint topside',
    observableEnCampo: true,
    hijos: ['Parada mayor', 'Preventivo de superficie', 'Preventivo de pozo'] },
  { id: 'proceso', corto: 'Proceso', icono: 'gota', nombre: 'Proceso y operación', prodml: 'process and operation problem',
    observableEnCampo: true,
    hijos: ['Manejo de agua', 'Producto fuera de especificación', 'Error de operación'] },
  { id: 'externa', corto: 'Externa', icono: 'camion', nombre: 'Restricción externa', prodml: '3rd party processing · unavailable tanker storage · weather problem',
    observableEnCampo: false,
    hijos: ['Evacuación o nominación', 'Energía externa', 'Clima', 'Almacenamiento no disponible'] },
  { id: 'yacimiento', corto: 'Yacimiento', icono: 'capas', nombre: 'Yacimiento', prodml: 'reservoir',
    observableEnCampo: false,
    hijos: ['Declinación', 'Interferencia', 'Arenamiento'] },
]

export const categoriaPorId = (id: string) => CATALOGO.find(c => c.id === id)

/** Cada tipo de causa de TRIM en su casilla de PRODML: así el libro se puede
 *  reportar con la enumeración del estándar. Lo declarado o sin identificar
 *  no tiene casilla hasta que alguien lo clasifique. */
export const CATEGORIA_DE: Record<TipoCausa, Categoria['id'] | undefined> = {
  reinyeccion: 'superficie', transporte: 'superficie', energia: 'superficie', aire: 'superficie', compresion: 'superficie',
  electrosumergible: 'pozo', levantamiento: 'pozo',
  programada: 'programado',
  proceso: 'proceso', tratamiento: 'proceso',
  evacuacion: 'externa',
  declarada: undefined, pendiente: undefined,
}
