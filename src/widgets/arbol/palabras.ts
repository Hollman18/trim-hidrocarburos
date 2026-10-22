import {
  PASO_CAMPO, PASO_CIRCULAR, ETIQUETA_RESPONSABLE, ETIQUETA_IMPACTO, ETIQUETA_PLANEACION, ETIQUETA_CHOKE, textoN1, textoN2,
  type PasoAnh, type EstadoParadaAnh, type Procedencia, type Responsable, type Impacto, type Planeacion, type ClaveN1, type CodigoN2,
} from '@/shared/api/arbol'
import { NOMBRE_CHOKE, RESUMEN_TRAMO, type ChokeAnh } from '@/shared/api/choke'
import { AHORA, fechaHora } from '@/entities/reloj'
import { diaIso } from '@/shared/lib/formato'

/** LAS PALABRAS DEL ÁRBOL DE 6 PASOS EN PANTALLA (U1 §2, U2 §1.5).
 *
 *  Solo presentación: cómo se dice cada estado, cada paso, cada valor y cada
 *  procedencia. Nada de esto decide un dato: el motor propone, la persona
 *  confirma y aquí solo se escribe en palabras de campo lo que ya llegó. La
 *  palabra «choke» no sale en ningún rótulo: va en el ⓘ (U2 §1.3). */

/** Los estados de una parada, como los dice la pantalla (U1 §2, vocabulario). */
export const ESTADO: Record<EstadoParadaAnh, string> = {
  propuesta: 'falta confirmar', 'por-precisar': 'falta un dato', confirmada: 'completa', pendiente: 'sin causa',
}

/** El título de cada bloque de Identificar (U2 §9.3), en el orden en que se atienden. */
export const SECCION: Record<EstadoParadaAnh, string> = {
  propuesta: 'POR CONFIRMAR', 'por-precisar': 'FALTA UN DATO', pendiente: 'SIN CAUSA', confirmada: 'COMPLETAS',
}
export const ORDEN_SECCIONES: readonly EstadoParadaAnh[] = ['propuesta', 'por-precisar', 'pendiente', 'confirmada']

/** El rótulo de cada paso: el de campo, con los signos de pregunta del paso 2 (U2 §4.1). */
export const ROTULO: Record<PasoAnh, string> = { ...PASO_CAMPO, choke: '¿Dónde se trabó?' }

/** El ⓘ de cada paso: el nombre que le da la circular (U1 §2.1). */
export const PASO_EN_LA_CIRCULAR = PASO_CIRCULAR

/** El ⓘ del paso 2, texto exacto (U2 §1.5). */
export const INFO_PASO_2 = 'Dónde empezó lo que paró el pozo, no dónde está el pozo: si la planta no recibe y el pozo cierra, se trabó en la planta. Es el paso 2 de la Circular 024 de la ANH ("componente del sistema de producción").'
/** «¿Qué método es?»: el ⓘ del método, en dos líneas (U2 §1.3). */
export const INFO_METODO = 'Es un método internacional para ubicar dónde se pierde producción: lo publicó BP en 1996 (artículo SPE-36848), lo usa el regulador británico (NSTA) y la ANH lo adoptó en 2026 (Circulares 003 y 024). No es la válvula choke de la cabeza del pozo (Circular 024, p. 4).'

/** Las opciones del paso 2 en el selector, en su orden fijo y con su línea (U2 §1.5). */
export const OPCIONES_CHOKE: readonly ChokeAnh[] = ['pozo', 'planta', 'exportacion', 'reservorio']
export const OPCION_CHOKE: Record<ChokeAnh, string> = {
  pozo: 'En el pozo', planta: 'En la planta o estación', exportacion: 'Afuera (oleoducto, transportador o cliente)', reservorio: 'En el yacimiento',
}
export const LINEA_CHOKE: Record<ChokeAnh, string> = RESUMEN_TRAMO

/** Los atajos de «¿Por qué lo cambia?» (U2 §1.5). */
export const MOTIVOS = ['El equipo es de otro pozo', 'La raíz fue otra', 'El oleoducto sí recibía', 'El oleoducto no recibía'] as const

/** «¿Qué lo muestra?» al poner «En el yacimiento» (U2 §1.5): el atajo y su botón. */
export const EVIDENCIAS: ReadonlyArray<{ clave: 'prueba' | 'corte-agua' | 'presion'; texto: string }> = [
  { clave: 'prueba', texto: 'La prueba del pozo' },
  { clave: 'corte-agua', texto: 'El corte de agua subió' },
  { clave: 'presion', texto: 'La presión de fondo cayó' },
]

/** Un valor de un paso, en palabras de campo. Un código que no está en el
 *  catálogo se muestra tal cual: no se esconde lo que llegó. */
export function valorEnPalabras(paso: PasoAnh, valor: string): string {
  try {
    switch (paso) {
      case 'responsable': return ETIQUETA_RESPONSABLE[valor as Responsable] ?? valor
      case 'choke': return NOMBRE_CHOKE[valor as ChokeAnh] ?? valor
      case 'impacto': return ETIQUETA_IMPACTO[valor as Impacto] ?? valor
      case 'planeacion': return ETIQUETA_PLANEACION[valor as Planeacion] ?? valor
      case 'n1': return textoN1(valor as ClaveN1)
      case 'n2': return textoN2(valor as CodigoN2)
    }
  } catch { return valor }
}

/** Lo que va a la ANH en cada paso, para el ⓘ de ingeniería: la etiqueta del
 *  reporte y el código interno. El supervisor y el operador no lo ven (U1 §1.1). */
export function enElReporte(paso: PasoAnh, valor: string): string {
  if (paso === 'choke') return `${ETIQUETA_CHOKE[valor as ChokeAnh] ?? valor} (${valor})`
  return valor
}

/** La hora de un toque: solo la hora si es de hoy; si no, el día y la hora. */
export function horaCorta(iso: string | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const fh = fechaHora(d)
  return diaIso(d) === diaIso(AHORA) ? fh.replace(/^.*?, /, '') : fh
}

/** Quién y cuándo, como lo dice la pantalla (U1 §2: «dijo», «confirmó», «corrigió»). */
export function marcaDePersona(p: Procedencia, por: string | undefined, hora: string | undefined, lote?: string): string {
  const cuando = horaCorta(hora)
  const quien = `${por ?? 'una persona'}${cuando ? ` · ${cuando}` : ''}`
  if (p === 'declarado') return `dijo ${quien}`
  if (p === 'confirmado') return `confirmó ${quien}${lote ? ' · en lote' : ''}`
  if (p === 'corregido') return `corrigió ${quien}`
  return quien
}

/** La marca de lo que puso TRIM (U1 §2): «TRIM lo dedujo», «programa firmado», «su árbol». */
export function marcaDeTrim(p: Procedencia): string {
  if (p === 'programa') return 'programa firmado'
  if (p === 'conversion') return 'su árbol'
  if (p === 'registro') return 'registro de la ANH'
  return 'TRIM lo dedujo'
}

/** El porqué del motor sin las referencias a los documentos del plan («(P1 §2.4)»):
 *  en la pantalla de campo sobran; el texto del motor no se cambia. */
export const sinReferencias = (s: string) =>
  s.replace(/\s*\((?:P1|U1|U2|R1|R2|R4|S1|C24|C-?003|CHOKE-COMPLETO)[^)]*\)/g, '').replace(/\s+([.,;:])/g, '$1').trim()

/** Una lista dicha: «LC-16 y LC-07», «LC-02, LC-05 y LC-09». */
export const lista = (xs: readonly string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}`)
