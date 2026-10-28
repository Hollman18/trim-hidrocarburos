import { formatoFecha } from '@/shared/lib/fecha'
import { cifra } from './tipos'

/* Los ejes del kit (D2): las marcas «redondas» de una escala, el ancho que ocupa un rótulo y el tiempo
   de cada punto. Todo es aritmética: nada mira la lectura para mover la escala (la escala la da la señal;
   aquí solo se decide DÓNDE van las marcas dentro de ella). */

/** Las marcas redondas (1, 2 o 5 por una potencia de 10) entre `min` y `max`, unas `cuantas`. Con 0
 *  decimales no se proponen pasos de menos de 1 (no habría cómo escribirlos). */
export function marcasRedondas(min: number, max: number, cuantas: number, decimales = 0): number[] {
  const rango = max - min
  if (!(rango > 0) || cuantas < 1 || !Number.isFinite(rango)) return []
  const paso0 = rango / cuantas
  const p = 10 ** Math.floor(Math.log10(paso0))
  let paso = [1, 2, 5, 10].map(k => k * p).find(k => k >= paso0 * 0.999) ?? paso0
  if (decimales === 0) paso = Math.max(1, Math.round(paso))
  const out: number[] = []
  for (let v = Math.ceil(min / paso - 1e-9) * paso; v <= max + paso * 1e-9; v += paso) out.push(Number(v.toFixed(10)))
  return out
}

/** El ancho aproximado de un rótulo a 12 px (Plex Sans ≈ 6,9 px por carácter; la mono, 7,3). */
export const anchoTexto = (t: string, mono = false, px = 12) => t.length * (mono ? 0.61 : 0.575) * px

/** Los rótulos del eje x que caben sin pisarse: siempre el primero y el último (pegados a los bordes),
 *  y entre ellos, cada `k` puntos, los que dejan `hueco` px con sus vecinos. */
export function rotulosQueCaben(n: number, X: (i: number) => number, texto: (i: number) => string, primero: string, ultimo: string,
  x0: number, x1: number, minimo: number, hueco = 12): number[] {
  if (n < 3) return []
  const izq = x0 + anchoTexto(primero) + hueco, der = x1 - anchoTexto(ultimo) - hueco
  const paso = Math.max(1, Math.ceil(minimo / Math.max(1, (X(n - 1) - X(0)) / (n - 1))))
  const out: number[] = []
  let fin = izq
  for (let i = paso; i < n - 1; i += paso) {
    const w = anchoTexto(texto(i)), a = X(i) - w / 2, b = X(i) + w / 2
    if (a >= fin && b <= der) { out.push(i); fin = b + hueco }
  }
  return out
}

const ZONA = 'America/Bogota'
const FMT_DIA = formatoFecha({ day: 'numeric', month: 'short', timeZone: ZONA })
const FMT_DIA_HORA = formatoFecha({ day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: ZONA })
const FMT_DIA_ANIO = formatoFecha({ day: 'numeric', month: 'short', year: 'numeric', timeZone: ZONA })

/** El tiempo de cada punto de una serie que dice cuándo empieza y su paso (`SerieTag`): «2 de oct» si
 *  va por día (o más), «2 de oct, 14:00» si va por horas. El año, solo si no es el del último punto. */
export function etiquetasDeTiempo(t: { desde: string | number | Date; pasoH: number }, n: number): string[] {
  const t0 = new Date(t.desde).getTime(), paso = t.pasoH * 3_600_000
  if (!Number.isFinite(t0) || !(paso > 0) || n < 1) return []
  const anio = (ms: number) => new Date(ms - 5 * 3_600_000).getUTCFullYear()
  const ultimo = anio(t0 + (n - 1) * paso)
  return Array.from({ length: n }, (_, i) => {
    const ms = t0 + i * paso
    return t.pasoH < 24 ? FMT_DIA_HORA.format(ms) : anio(ms) !== ultimo ? FMT_DIA_ANIO.format(ms) : FMT_DIA.format(ms)
  })
}

/** «normal entre 10 y 20», «normal sobre 10», «normal bajo 85». */
export function textoBanda(banda: readonly [number | null, number | null], decimales = 0) {
  const [a, b] = banda
  return a !== null && b !== null ? `normal entre ${cifra(a, decimales)} y ${cifra(b, decimales)}`
    : a !== null ? `normal sobre ${cifra(a, decimales)}` : b !== null ? `normal bajo ${cifra(b, decimales)}` : 'normal'
}
