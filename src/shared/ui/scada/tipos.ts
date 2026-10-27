import { n0, n1, n2 } from '@/shared/lib/formato'

/* El kit SCADA de la v3 (docs/experiencia-v3/kit-scada.md): lo común de todas sus piezas.
   Retícula de 4 px. Trazos de 1 px (reglas, escalas, rayas de extremo), 1,5 px (contorno de
   equipo, trazas secundarias) y 2 px (contorno anormal, puntero, límite de alarma, línea de
   proceso, traza principal). Color: SOLO los tokens de index.css (grises de dato, equipo y la
   paleta de estado de X2 §4). Nada se anima, nada lleva sombra, brillo, degradado ni 3D. */

/** Los 5 estados, iguales en cada componente (kit-scada.md §0):
 *  · normal: en banda, en marcha. Gris y tinta, sin marca;
 *  · anormal: una prioridad que llega del motor (`condicion`). La marca a la izquierda del
 *    valor, el valor en negrita y el límite cruzado en el color de su prioridad;
 *  · sin-dato: no hay lectura o no hay instrumento. Contorno gris discontinuo, «—» y la
 *    palabra. Nunca un cero;
 *  · sin-comunicacion: no llega el dato del PLC. Contorno morado discontinuo, «---», el
 *    círculo punteado y «desde HH:MM». Nunca el último valor como si fuera de ahora;
 *  · parado: el equipo está detenido. Todo en gris, la banda tenue y ninguna marca propia
 *    en sus variables: la marca la lleva el equipo, una sola vez. */
export type EstadoKit = 'normal' | 'anormal' | 'sin-dato' | 'sin-comunicacion' | 'parado'
export const ESTADOS_KIT: readonly EstadoKit[] = ['normal', 'anormal', 'sin-dato', 'sin-comunicacion', 'parado']

/** La prioridad que manda el motor cuando algo es anormal. El kit no la decide: la pinta. */
export type CondicionKit = 'interlock' | 'alarma' | 'atencion' | 'aviso'

/** El color de cada prioridad, solo para la marca, el límite cruzado y el anillo del equipo. */
export const COLOR_CONDICION: Record<CondicionKit, string> = {
  interlock: 'var(--interlock)', alarma: 'var(--p1)', atencion: 'var(--p2)', aviso: 'var(--p3)',
}

/** La palabra de cada condición, para el nombre accesible y la palabra al lado. */
export const PALABRA_CONDICION: Record<CondicionKit, string> = {
  interlock: 'interlock', alarma: 'alarma', atencion: 'atención', aviso: 'aviso',
}

/** La escala de una señal. Sale del rango declarado del instrumento o de los límites
 *  firmados (`SenalNivel3.escala`), NUNCA de la lectura: no cambia sola. Mientras el motor no
 *  traiga el rango firmado, `firmada` es false y el kit lo dice: «escala provisional». */
export interface Escala { min: number; max: number; firmada: boolean }

/** La banda normal: null del lado abierto («> 10» llega hasta el borde). */
export type Banda = readonly [number | null, number | null]

/** Una cifra con sus decimales, en el formato de Colombia («1.665», «18,2»). */
export const cifra = (v: number, decimales = 0) => (decimales >= 2 ? n2(v) : decimales === 1 ? n1(v) : n0(v))

/** El valor que se escribe, según el estado: sin comunicación es «---» y sin dato es «—»
 *  (nunca el último valor ni un cero inventado). */
export const valorEscrito = (estado: EstadoKit, valor: number | null | undefined, decimales = 0) =>
  estado === 'sin-comunicacion' ? '---' : estado === 'sin-dato' || valor === null || valor === undefined ? '—' : cifra(valor, decimales)

/** Lo que el estado agrega a la frase del lector y a la nota: «sin comunicación desde las 14:07». */
export const fraseEstado = (estado: EstadoKit, o: { condicion?: CondicionKit; desde?: string; sinInstrumento?: boolean } = {}) => {
  switch (estado) {
    case 'normal': return 'normal'
    case 'anormal': return o.condicion ? PALABRA_CONDICION[o.condicion] : 'anormal'
    case 'sin-dato': return o.sinInstrumento ? 'sin instrumento' : 'sin lectura'
    case 'sin-comunicacion': return o.desde ? `sin comunicación desde las ${o.desde}` : 'sin comunicación'
    case 'parado': return 'equipo parado'
  }
}

/** El cuerpo de un equipo por su estado (X2 §4.3): el relleno dice si corre, por brillo. */
export function cuerpoDe(estado: EstadoKit, corre = false) {
  switch (estado) {
    case 'normal': return { fill: 'var(--eq-marcha)', stroke: 'var(--eq-trazo)', strokeWidth: 1.5 }
    case 'parado': return { fill: 'var(--eq-parado)', stroke: 'var(--eq-trazo)', strokeWidth: 1.5 }
    // Anormal: contorno de 2 px en tinta; el relleno sigue diciendo si corre (K-101 en marcha y
    // degradado) o si paró (P-201B parada por falla).
    case 'anormal': return { fill: corre ? 'var(--eq-marcha)' : 'var(--eq-parado)', stroke: 'var(--tinta)', strokeWidth: 2 }
    // Sin dato: igual al fondo (no se sabe si corre) y discontinuo.
    case 'sin-dato': return { fill: 'none', stroke: 'var(--tinta3)', strokeWidth: 1.5, strokeDasharray: '3 2.5' }
    case 'sin-comunicacion': return { fill: 'none', stroke: 'var(--sincom)', strokeWidth: 1.5, strokeDasharray: '3 2.5' }
  }
}

/** Las marcas del kit: las de X2 con su palabra de campo. */
export type MarcaKitTipo =
  | 'interlock' | 'alarma' | 'atencion' | 'aviso' | 'sin-comunicacion' | 'invalido'
  | 'falta' | 'sin-instrumento' | 'bloqueo' | 'normal'

/** La palabra visible de cada marca (X2 §4.2, palabras de campo). */
export const PALABRA_MARCA: Record<MarcaKitTipo, string> = {
  interlock: 'Interlock', alarma: 'Alarma', atencion: 'Atención', aviso: 'Aviso',
  'sin-comunicacion': 'Sin comunicación', invalido: 'Dato inválido', falta: 'Falta',
  'sin-instrumento': 'Sin instrumento', bloqueo: 'No arrancar', normal: 'Normal',
}

/** 4 · El trazo de cada fluido (Planta.tsx, `TRAZO`): el fluido se distingue por el trazo y su rótulo,
 *  nunca por el color. */
export type Fluido = 'multifasico' | 'crudo' | 'gas' | 'agua' | 'electrica' | 'aire'
export const TRAZO_FLUIDO: Record<Fluido, { ancho: number; dash?: string; nombre: string }> = {
  multifasico: { ancho: 3, nombre: 'multifásico' },
  crudo: { ancho: 2.4, nombre: 'crudo' },
  gas: { ancho: 2, dash: '8 4', nombre: 'gas' },
  agua: { ancho: 2, dash: '2 3', nombre: 'agua' },
  electrica: { ancho: 2, nombre: 'eléctrica' },
  aire: { ancho: 2, dash: '6 4', nombre: 'aire' },
}

/** El nombre accesible de un equipo para su <Esquema>: «P-201B, bomba, parado · alarma». */
export const nombreDeEquipo = (codigo: string, clase: string, estado: EstadoKit, o: { condicion?: CondicionKit; desde?: string } = {}) =>
  `${codigo}, ${clase}, ${fraseEstado(estado, o)}`
