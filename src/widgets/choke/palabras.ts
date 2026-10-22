import type { ChokeAnh, ChokeCampo, EstadoTramo } from '@/shared/api/choke'

/** Las palabras de campo de la tubería (U2 §1). En pantalla nunca se dice
 *  «choke», «dominante», «holgura» ni «brecha»: se dice «lo que limita», «le
 *  sobran» y «lo que no se produjo». Los textos que U2 §1.5 fija palabra por
 *  palabra van aquí, en un solo lugar, para que Producción, Planta y Agua digan
 *  lo mismo. */

/** El rótulo de cada caja de la tubería (U2 §9.1), de izquierda a derecha. */
export const CAJA: Record<ChokeAnh, string> = {
  reservorio: 'Yacimiento', pozo: 'Pozos', planta: 'Planta o estación', exportacion: 'Afuera',
}

/** Dónde se trabó, dentro de una frase del período: «se trabó en los pozos». */
export const DONDE: Record<ChokeAnh, string> = {
  reservorio: 'en el yacimiento', pozo: 'en los pozos', planta: 'en la planta', exportacion: 'afuera',
}

/** Lo que limita, como sujeto de la frase: «limitan los pozos», «limita la planta». */
export const SUJETO: Record<ChokeCampo, string> = { pozos: 'los pozos', planta: 'la planta', exportacion: 'afuera' }
export const VERBO: Record<ChokeCampo, string> = { pozos: 'limitan', planta: 'limita', exportacion: 'limita' }

/** Abreviatura de cada tramo en la franja de días (U2 §7.1): se lee en blanco y negro. */
export const ABREV: Record<ChokeCampo, string> = { pozos: 'Po', planta: 'Pl', exportacion: 'Af' }

/** De la pregunta del campo (tres tramos con capacidad) a la de la parada (cuatro). */
export const TRAMO_DE: Record<ChokeCampo, ChokeAnh> = { pozos: 'pozo', planta: 'planta', exportacion: 'exportacion' }

/** ISA-101: lo perdido por tramo va en grises de distinta luminancia, del
 *  yacimiento (el más oscuro) a afuera (el más claro), con su palabra al lado;
 *  «sin identificar» va aparte, en gris discontinuo (U2 §7.4 y §9.2). */
export const TONO: Record<ChokeAnh, string> = {
  reservorio: 'var(--dato-1)', pozo: 'var(--dato-2)', planta: 'var(--dato-3)', exportacion: 'var(--dato-4)',
}

/** De dónde sale el número de un tramo, dicho para leer (U2 §1.5). */
export const ESTADO_TRAMO: Record<EstadoTramo, string> = {
  pruebas: 'con las pruebas de los pozos', demo: 'dato del demo, sin firmar', firmado: 'firmado',
  'sin-firmar': 'sin firmar', 'sin-dato': 'sin dato',
}
/** Un número que nadie ha firmado lleva su advertencia en el número mismo (U2 §2.3). */
export const sinFirma = (e: EstadoTramo) => e === 'demo' || e === 'sin-firmar'

/** Textos exactos de U2 §1.5. */
export const TEXTO = {
  lectura: 'Cada tramo es tan alto como lo que puede dejar pasar por día. El más angosto dice «limita»: ese es el tope del campo hoy. Lo oscuro es lo que pasa ahora; lo claro, lo que cabría. Debajo de cada tramo, lo que se perdió ahí en el período. Gris es normal: el color solo sale en un equipo con alarma.',
  limita: 'El tramo más angosto. No es una alarma: todo campo tiene uno. TRIM lo calcula con las pruebas de los pozos y las capacidades firmadas; nadie lo escribe a mano.',
  sobran: 'Cuánto más podría pasar este tramo antes de volverse el más angosto.',
  yacimiento: 'El yacimiento no tiene un número propio: lo que puede dar se mide con las pruebas de los pozos. Aquí solo se cuenta lo que se perdió por causas del yacimiento.',
  sinIdentificar: 'Paradas que todavía no tienen causa: hasta que alguien diga qué pasó, no se sabe dónde se trabó. No se reparten entre los tramos.',
  gasSinMedir: 'El gas no se mide en esta fase: no se puede saber si el tren de gas es el más angosto.',
} as const

/** «la planta» / «afuera»: lo que falta firmar para poder decir qué limita (U2 §1.5). */
export const FALTA_CAPACIDAD: Partial<Record<ChokeAnh, string>> = { planta: 'la planta', exportacion: 'afuera' }

export const mayuscula = (s: string) => (s ? `${s[0]!.toUpperCase()}${s.slice(1)}` : s)
/** «LC-21 y LC-08», «LC-02, LC-10 y LC-01». */
export const lista = (xs: readonly string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}`)
