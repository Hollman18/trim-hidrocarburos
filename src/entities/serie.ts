/** Las series del historiador (`SerieTag`): armarlas, leerlas y revisarlas.
 *
 *  El tiempo de cada valor sale de la serie (`desde`, `pasoH`), nunca de
 *  suponer «un punto por día»: si el historiador entrega la serie por hora, un
 *  cruce a 3,8 h no puede leerse como 91 h. */
import type { SerieTag } from './tipos'
import { AHORA } from './reloj'

const H = 3_600_000

const dos = (n: number) => String(n).padStart(2, '0')
/** ISO 8601 en hora de Colombia (UTC−5, sin horario de verano), como el resto del contrato. */
function isoCo(t: number): string {
  const co = new Date(t - 5 * H)
  return `${co.getUTCFullYear()}-${dos(co.getUTCMonth() + 1)}-${dos(co.getUTCDate())}T${dos(co.getUTCHours())}:${dos(co.getUTCMinutes())}:${dos(co.getUTCSeconds())}.${String(co.getUTCMilliseconds()).padStart(3, '0')}-05:00`
}

/** Una serie de un valor por `pasoH` horas cuyo último valor es el de `hasta`.
 *  Es la forma de las lecturas del demo (doce días que terminan ahora). */
export function serieHasta(valores: Array<number | null>, pasoH: number, hasta: number = AHORA.getTime()): SerieTag {
  return { desde: isoCo(hasta - (valores.length - 1) * pasoH * H), pasoH, valores }
}

/** Los valores con lectura, sin los huecos: para escalas y decimales. */
export const conLectura = (s: SerieTag | undefined): number[] =>
  s ? s.valores.filter((v): v is number => v !== null) : []

/** El último valor con lectura, o undefined si la serie no tiene ninguno. */
export function ultimaLectura(s: SerieTag | undefined): number | undefined {
  if (!s) return undefined
  for (let i = s.valores.length - 1; i >= 0; i--) { const v = s.valores[i]; if (v !== null && v !== undefined) return v }
  return undefined
}

const CON_ZONA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/

/** Qué tiene mal una serie que llega de afuera; undefined si está bien. El
 *  códec del contrato la rechaza con esto: un paso ausente o en cero haría que
 *  el vigía dividiera por cero o volviera a suponer un paso. */
export function faltaEnSerie(x: unknown): string | undefined {
  if (x === null || typeof x !== 'object' || Array.isArray(x)) return `se esperaba una serie { desde, pasoH, valores } y llegó ${JSON.stringify(x)?.slice(0, 60)}`
  const s = x as Record<string, unknown>
  if (typeof s.desde !== 'string' || !CON_ZONA.test(s.desde)) return `desde: se esperaba una fecha ISO 8601 con zona y llegó ${JSON.stringify(s.desde)}`
  if (typeof s.pasoH !== 'number' || !Number.isFinite(s.pasoH) || s.pasoH <= 0) return `pasoH: se esperaba un número de horas mayor que cero y llegó ${JSON.stringify(s.pasoH)}`
  if (!Array.isArray(s.valores)) return `valores: se esperaba una lista y llegó ${JSON.stringify(s.valores)?.slice(0, 60)}`
  const malo = s.valores.findIndex(v => v !== null && (typeof v !== 'number' || !Number.isFinite(v)))
  if (malo >= 0) return `valores[${malo}]: se esperaba un número o null (hueco) y llegó ${JSON.stringify(s.valores[malo])}`
  return undefined
}

/** El paso dicho para leer: «día», «hora», «15 min», «6 h». */
const paso = (h: number) => (h === 24 ? 'por día' : h === 1 ? 'por hora' : h < 1 ? `cada ${Math.round(h * 60)} min` : `cada ${h.toLocaleString('es-CO')} h`)

/** Cuántas lecturas trae la serie, a qué paso y cuántos huecos: «12 lecturas,
 *  una por día» o «9 lecturas, una por día · 3 sin dato». */
export function lecturasDe(s: SerieTag): string {
  const n = conLectura(s).length, huecos = s.valores.length - n
  return `${n} ${n === 1 ? 'lectura' : 'lecturas'}, una ${paso(s.pasoH)}${huecos ? ` · ${huecos} sin dato` : ''}`
}
