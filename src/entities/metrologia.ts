/** De dónde sale la tolerancia de cada número de barriles.
 *
 *  El diferido de una parada se calcula con el crudo que cada pozo tiene
 *  asignado. La regulación no exige que esa asignación sea exacta: acepta que
 *  caiga dentro de una banda. Esa banda es la tolerancia mínima que se puede
 *  defender ante el regulador sin un presupuesto de incertidumbre propio.
 *
 *  Colombia: Res. MME 40236/2022. El producto es internacional; otro país
 *  trae su propia tabla con la misma forma.
 */

export const FUENTE_METODO =
  'Res. MME 40236/2022, Anexo 2, Tabla 10, Ecuación 22: raíz de la suma de las incertidumbres al cuadrado (API MPMS 13.3 · ISO 5168)'

export const FUENTE_BANDA =
  'Res. MME 40236/2022, Anexo 2, Tabla 10, Figura 10.2 · Límites de los factores de campo y de asignación'

export type FluidoMedido = 'crudo' | 'gas' | 'agua'

/** Figura 10.2. Cada fila es la banda aceptada del factor de asignación,
 *  [mínimo, máximo], para campos de al menos 1.000 bpd y por debajo. */
const FIGURA_10_2: Array<{
  fluido: FluidoMedido; cuando: (api: number) => boolean; nombre: string
  desde1000: [number, number]; bajo1000: [number, number]
}> = [
  { fluido: 'crudo', cuando: api => api > 22.3, nombre: 'crudo de más de 22,3 °API',
    desde1000: [0.95, 1.05], bajo1000: [0.85, 1.15] },
  { fluido: 'crudo', cuando: api => api <= 22.3, nombre: 'crudo de 22,3 °API o menos',
    desde1000: [0.85, 1.15], bajo1000: [0.80, 1.20] },
  { fluido: 'gas', cuando: () => true, nombre: 'gas',
    desde1000: [0.90, 1.10], bajo1000: [0.80, 1.20] },
  { fluido: 'agua', cuando: () => true, nombre: 'agua',
    desde1000: [0.90, 1.10], bajo1000: [0.90, 1.10] },
]

export interface Componente {
  /** Qué aporta incertidumbre, dicho como lo entiende el que lee. */
  nombre: string
  /** Fracción relativa: 0,15 es ±15 %. */
  valor: number
  fuente: string
  /** Sesgo común a todo el campo (la asignación): no se reduce al sumar
   *  eventos ni pozos. Lo que no es común (la hora de cada evento) sí. */
  correlado?: boolean
}

/** Tolerancia de asignación de un fluido, como fracción relativa (la mitad
 *  del ancho de la banda). */
export function toleranciaAsignacion(fluido: FluidoMedido, api: number, produccionBpd: number): Componente {
  const fila = FIGURA_10_2.find(f => f.fluido === fluido && f.cuando(api))!
  const alto = produccionBpd >= 1000
  const [a, b] = alto ? fila.desde1000 : fila.bajo1000
  return {
    nombre: `Asignación de ${fila.nombre}`,
    valor: (b - a) / 2,
    correlado: true,
    fuente: `${FUENTE_BANDA} · campo ${alto ? 'de 1.000 bpd o más' : 'de menos de 1.000 bpd'}, banda ${a.toFixed(2).replace('.', ',')}–${b.toFixed(2).replace('.', ',')}`,
  }
}

/** Aforo de tanque: lo que limita la precisión del colchón de horas. */
export const AFORO_TANQUE: Componente = {
  nombre: 'Aforo del tanque de agua',
  valor: 0.002,
  fuente: 'Res. MME 40236/2022, Anexo 2: incertidumbre del aforo de un tanque, máximo 0,2 % del volumen total',
}

/** Ecuación 22: raíz de la suma de los cuadrados. Suma componentes
 *  independientes; los que son el mismo sesgo para todos los pozos (la
 *  asignación) no se reducen al sumar pozos y se cuentan una sola vez. */
export const raizSumaCuadrados = (xs: number[]) => Math.sqrt(xs.reduce((a, x) => a + x * x, 0))

/** Lo que el registro de metrología dice de un campo (`GET …/metrologia`). */
export interface MetrologiaCampo {
  /** °API del último análisis del crudo. `null` si el laboratorio todavía no
   *  lo reporta (CONTRATO.md): es un hueco, nunca 0 °API, que caería en la
   *  fila más ancha de la Fig. 10.2 y aceptaría un factor que no pasa. */
  api: number | null
  apiFuente: string
  demostrada?: Componente
}

/** Gravedad API del crudo de cada campo y, si el operador lo demostró, su
 *  propio presupuesto de incertidumbre. Uno demostrado con API MPMS 13.3 o
 *  ISO 5168 reemplaza a la banda regulatoria; sin él, se usa la banda. */
export const METROLOGIA_CAMPO: Record<string, MetrologiaCampo> = {
  ceiba: { api: 19.4, apiFuente: 'Análisis de laboratorio del crudo en especificación, PMO-02' },
  morichal: { api: 13.1, apiFuente: 'Análisis de laboratorio del crudo en especificación' },
  guacamayo: { api: 28.6, apiFuente: 'Análisis de laboratorio del crudo en especificación' },
  palmar: { api: 21.0, apiFuente: 'Análisis de laboratorio del crudo en especificación' },
  zarza: { api: 34.0, apiFuente: 'Condensado asociado al gas' },
}
