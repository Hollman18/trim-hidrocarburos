import type { ChokeAnh, ChokeCampo, EstadoTramo, EscalonOSinClasificar } from '@/shared/api/choke'

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

/** Por qué no se produjo, con UN solo juego de palabras de campo en Producción y
 *  en Diferidos (B-26; U2 §2.3: «una palabra por idea»). El nombre técnico de la
 *  escalera (NSTA) va en el globo. Lo que espera a una persona es lo mismo que
 *  «sin identificar» de la tubería: se llama igual. */
export const ESCALON_CAMPO: Record<EscalonOSinClasificar, string> = {
  'disponibilidad-no-planeada': 'Paradas no planeadas: fallas, disparos y terceros',
  'disponibilidad-planeada': 'Paradas planeadas: mantenimiento, pruebas y trabajos de pozo',
  desempeno: 'Frecuencia bajada: el levantamiento sin optimizar',
  capacidad: 'Restricción sin falla: nominación o despacho',
  desarrollo: 'El yacimiento y los proyectos',
  'sin-clasificar': 'Sin identificar: falta que una persona diga qué pasó',
}

/** De dónde sale el número de un tramo, dicho para leer (U2 §1.5). Lo del demo se
 *  dice «sin firmar» y de dónde sale va en su ⓘ (P-agua-2; T-3: «dato del demo»
 *  una vez, en la ⓘ, no en cada caja). */
export const ESTADO_TRAMO: Record<EstadoTramo, string> = {
  pruebas: 'con las pruebas de los pozos', demo: 'sin firmar', firmado: 'firmado',
  'sin-firmar': 'sin firmar', 'sin-dato': 'sin dato',
}
/** Un número que nadie ha firmado lleva su advertencia en el número mismo (U2 §2.3). */
export const sinFirma = (e: EstadoTramo) => e === 'demo' || e === 'sin-firmar'

/** Textos exactos de U2 §1.5. */
export const TEXTO = {
  // El cuadre de U2 §2.2 con las pruebas (D3): lo que dan los pozos − lo que sale − lo que se deja de producir (T-8: diferido no es pérdida).
  cuadreHoy: 'Las pruebas de los pozos y el punto de medición oficial no miden igual: lo que dan los pozos según sus pruebas, menos lo que sale hoy por el punto oficial y lo que se deja de producir ahora, es lo que las pruebas dan de más (el factor de asignación del mes). No es crudo que se deje de producir hoy: es lo que el medidor no confirma de las pruebas.',
  // «Lo relleno», no «lo oscuro»: en el tema oscuro el relleno sale claro (B-15).
  lectura: 'Cada tramo es tan alto como lo que puede dejar pasar por día. El más angosto dice «limita»: ese es el tope del campo hoy. Lo relleno es lo que pasa ahora; lo vacío, lo que cabría. Debajo de cada tramo, lo que no se produjo por él en el período. Gris es normal: el color solo sale en un equipo con alarma.',
  limita: 'El tramo más angosto. No es una alarma: todo campo tiene uno. TRIM lo calcula con las pruebas de los pozos y las capacidades firmadas; nadie lo escribe a mano.',
  sobran: 'Cuánto más podría pasar este tramo antes de volverse el más angosto.',
  yacimiento: 'El yacimiento no tiene un número propio: lo que puede dar se mide con las pruebas de los pozos. Aquí solo se cuenta lo que se dejó de producir por causas del yacimiento.',
  sinIdentificar: 'Paradas que todavía no tienen causa: hasta que alguien diga qué pasó, no se sabe dónde se trabó. No se reparten entre los tramos.',
  gasSinMedir: 'El gas no se mide en esta fase: no se puede saber si el tren de gas es el más angosto.',
  sinFirmar: 'Un número sin firmar es el dato del demo: lo firma el administrador en Configuración.',
} as const

/** La línea corta de lo que limita hoy (T-9, P-planta-2): «Limitan los pozos.» y, con
 *  una bomba parada que angosta la planta, lo que el agua todavía deja pasar (P-14). Las
 *  cifras llegan hechas del motor (`disponibleHoy`); la cuenta va detrás de «Ver la cuenta». */
export function limitaEnCorto(limita: ChokeCampo, hoy?: { equipo: string; cabeBpd: number }, n0?: (v: number) => string): string {
  const base = `${mayuscula(VERBO[limita])} ${SUJETO[limita]}.`
  if (!hoy || !n0) return base
  return `${base} Con ${hoy.equipo} parada, ${hoy.cabeBpd < 1 ? 'el agua no da para más crudo' : `el agua solo deja pasar ${n0(hoy.cabeBpd)} bbl/d más de crudo`}.`
}

/** «la planta» / «afuera»: lo que falta firmar para poder decir qué limita (U2 §1.5). */
export const FALTA_CAPACIDAD: Partial<Record<ChokeAnh, string>> = { planta: 'la planta', exportacion: 'afuera' }

export const mayuscula = (s: string) => (s ? `${s[0]!.toUpperCase()}${s.slice(1)}` : s)

/** El nombre del período dentro de una frase: «Octubre, en curso» → «octubre (en curso)»,
 *  «Septiembre, cerrado» → «septiembre», «Últimos 12 meses» → «los últimos 12 meses» (B-39, B-45). */
export function periodoEnFrase(nombre: string): string {
  const m = /^(.+?), (en curso|cerrado)$/.exec(nombre)
  if (m) return `${m[1]!.toLowerCase()}${m[2] === 'en curso' ? ' (en curso)' : ''}`
  if (/^últimos/i.test(nombre)) return `los ${nombre.toLowerCase()}`
  if (/^año a la fecha$/i.test(nombre)) return 'el año a la fecha'
  return nombre.charAt(0).toLowerCase() + nombre.slice(1)
}
/** «LC-21 y LC-08», «LC-02, LC-10 y LC-01». */
export const lista = (xs: readonly string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}`)

/** Cómo se ven los códigos de la ANH en el árbol de pérdidas: nunca, en el ⓘ de cada paso o al lado. */
export type VerCodigos = 'no' | 'info' | 'vista'
/** Quién ve los códigos de la ANH y cómo (U2 §1.3; U1 §1.0, punto 7): regulatorio
 *  los lee al lado de cada paso; confiabilidad y el administrador, en el ⓘ. Nadie
 *  más: el gerente, producción y mantenimiento leen las palabras de campo. */
export const codigosDelRol = (rolId: string): VerCodigos =>
  (rolId === 'reg' ? 'vista' : rolId === 'conf' || rolId === 'adm' ? 'info' : 'no')
