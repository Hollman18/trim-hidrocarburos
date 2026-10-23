import {
  PASO_CAMPO, PASO_CIRCULAR, ETIQUETA_RESPONSABLE, ETIQUETA_IMPACTO, ETIQUETA_PLANEACION, ETIQUETA_CHOKE, PASOS_QUE_DECLARA, PREGUNTAS_CAMPO, textoN1, textoN2,
  type PasoAnh, type EstadoParadaAnh, type Procedencia, type Responsable, type Impacto, type Planeacion, type ClaveN1, type CodigoN2,
  type ParadaAnh, type PreguntaCampo, type RespuestaCampo, type DatoClasificado,
} from '@/shared/api/arbol'
import { NOMBRE_CHOKE, RESUMEN_TRAMO, type ChokeAnh } from '@/shared/api/choke'
import { AHORA, fechaCorta, fechaHora } from '@/entities/reloj'
import { formatoFecha } from '@/shared/lib/fecha'
import { diaIso, plural } from '@/shared/lib/formato'

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
/** Unos pozos dichos en un aviso: hasta tres por su nombre («LC-07 y LC-16»);
 *  más, cuántos («los 41 pozos»). Un aviso que nombra 41 pozos no se lee (QA-R, vecino 10). */
export const pozosEnCorto = (xs: readonly string[]) => (xs.length <= 3 ? lista(xs) : `los ${xs.length} pozos`)


/* ─────────────── una pregunta a la vez y lo que ya se contestó (B-23, B-04) ─────────────── */

/** El orden en que se hacen las preguntas de una parada: primero la que sigue
 *  a lo último que se contestó (aparece en el lugar de la contestada, B-23);
 *  después, la de campo antes que la técnica, y «¿Fue el yacimiento?» antes
 *  que «¿Qué fue, exactamente?» (B-32). */
const RANGO_PREGUNTA: Record<string, number> = {
  'que-lo-paro': 0, tanques: 0, oleoducto: 1, corte: 1, nominacion: 1, 'afecto-clima': 1, 'afecto-orden-publico': 1, trabajo: 1,
  aporte: 2, 'evidencia-yacimiento': 3, raiz: 4, detalle: 5, choke: 6, programado: 7, 'se-perdio': 8,
}
export function enOrden(qs: readonly PreguntaCampo[], respuestas: readonly RespuestaCampo[] | undefined): PreguntaCampo[] {
  const siguen = new Set((respuestas ?? []).filter(r => !r.noSe && r.sigue).map(r => r.sigue!))
  return [...qs].sort((a, b) => Number(siguen.has(b.id)) - Number(siguen.has(a.id)) || (RANGO_PREGUNTA[a.id] ?? 9) - (RANGO_PREGUNTA[b.id] ?? 9))
}

/** El texto de la pregunta que alguien contestó, para repetirlo en la tarjeta. */
export function textoDePregunta(id: string): string {
  if (Object.hasOwn(PREGUNTAS_CAMPO, id)) return PREGUNTAS_CAMPO[id as keyof typeof PREGUNTAS_CAMPO].texto
  return id === 'raiz' ? '¿Qué falló primero?' : id === 'detalle' ? '¿Qué fue, exactamente?' : id === 'choke' ? '¿Dónde se trabó?' : id
}

/** Un paso que quedó a nombre de quien contestó una pregunta de campo pero que
 *  NO es de su terreno (el tramo que sale de «Del campo: pórtico…»): lo dedujo
 *  TRIM de su respuesta; la persona nunca lo escogió (B-04; U2 §3.2). Un paso
 *  fuera de `PASOS_QUE_DECLARA` de su rol solo puede venir de una respuesta. */
export function deducidoDeRespuesta(paso: PasoAnh, d: DatoClasificado<unknown, unknown> | undefined): boolean {
  if (!d || d.procedencia !== 'declarado' || !d.rol) return false
  const suyos = Object.hasOwn(PASOS_QUE_DECLARA, d.rol) ? PASOS_QUE_DECLARA[d.rol]! : []
  return !suyos.includes(paso)
}

/* ─────────────── fechas y cuentas de la tarjeta (B-21, B-22, B-25) ─────────────── */

const HORA_CO = formatoFecha({ hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Bogota' })
/** «05:46», hora de Colombia. */
export const horaDe = (iso: string) => HORA_CO.format(new Date(iso))
/** «2 de oct», el día operacional de una fila (nunca «2026-10-02»). */
export const diaDe = (dia: string) => fechaCorta(new Date(`${dia}T12:00:00-05:00`))
/** Una fila del reporte en palabras: «2 de oct · 05:46 a 23:59 (sigue al cierre del día)». */
export const horasDeFila = (f: Pick<ParadaAnh, 'diaOperacional' | 'inicio' | 'fin' | 'abiertaAlCorte'>) =>
  `${diaDe(f.diaOperacional)} · ${horaDe(f.inicio)} a ${horaDe(f.fin)}${f.abiertaAlCorte ? ' (sigue al cierre del día)' : ''}`

/** Cuántas paradas son unas filas: una por evento de pozo (los días de un mismo
 *  pozo son una parada; los pozos de una cascada, una cada uno) (B-21). */
export const cuantasParadas = (filas: readonly Pick<ParadaAnh, 'eventoId'>[]) => new Set(filas.map(f => f.eventoId)).size
/** «2 paradas (4 filas del reporte)»; si son las mismas, «2 paradas». */
export const paradasYFilas = (filas: readonly Pick<ParadaAnh, 'eventoId'>[]) => {
  const n = cuantasParadas(filas)
  return `${plural(n, 'parada', 'paradas')}${filas.length !== n ? ` (${plural(filas.length, 'fila', 'filas')} del reporte)` : ''}`
}

/** El estado de una tarjeta: «falta un dato» si falta uno; «faltan 4 pasos» si faltan más (B-21). */
export const estadoDeTarjeta = (estado: EstadoParadaAnh, faltan: number) =>
  estado === 'por-precisar' && faltan > 1 ? `faltan ${faltan} pasos` : ESTADO[estado]

/** Desde cuándo, dicho con la fecha del evento (B-22): «parada desde el 25 de
 *  sept, 06:40 (en este período, desde el 1 de oct)», «con la frecuencia bajada
 *  desde el 15 de abr, 02:10», «cerraron 2 de oct, 05:43». */
export function desdeCuando(filas: readonly Pick<ParadaAnh, 'inicio' | 'inicioEvento' | 'parcial'>[], varios: boolean): string {
  const ev = filas.reduce((a, f) => (f.inicioEvento < a ? f.inicioEvento : a), filas[0]!.inicioEvento)
  const primera = filas.reduce((a, f) => (f.inicio < a ? f.inicio : a), filas[0]!.inicio)
  const antes = Date.parse(ev) < Date.parse(primera) - 60_000
  const cuando = fechaHora(new Date(ev))
  if (filas.some(f => f.parcial)) return `con la frecuencia bajada desde el ${cuando}${antes ? ` (en este período, desde el ${fechaCorta(new Date(primera))})` : ''}`
  if (antes) return `${varios ? 'paradas' : 'parada'} desde el ${cuando} (en este período, desde el ${fechaCorta(new Date(primera))})`
  return `${varios ? 'cerraron' : 'cerró'} ${horaCorta(ev)}`
}
