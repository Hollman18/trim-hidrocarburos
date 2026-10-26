/* Las cifras como en campo y los caminos de los dibujos de La planta viva. */

const FMT_N0 = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
/** «1.966»: punto de miles, sin decimales. */
export const n0 = (v: number) => FMT_N0.format(Math.round(v) === 0 ? 0 : v)
const FMT_N1 = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
export const n1 = (v: number) => FMT_N1.format(v)

/** Un camino hecho de tramos rectos y curvas, que se puede recorrer al revés
 *  (el borde de abajo de la tubería es el de arriba, de derecha a izquierda). */
export type Punto = [number, number]
export type Segmento = { a: Punto; c1?: Punto; c2?: Punto }
export const caminoDe = (inicio: Punto, segs: Segmento[]) =>
  segs.map(s => (s.c1 && s.c2 ? ` C${s.c1[0]} ${s.c1[1]} ${s.c2[0]} ${s.c2[1]} ${s.a[0]} ${s.a[1]}` : ` L${s.a[0]} ${s.a[1]}`)).join('')
    .replace(/^/, `M${inicio[0]} ${inicio[1]}`)
/** El mismo camino al revés: termina donde empezaba, con las curvas invertidas. */
export function alReves(inicio: Punto, segs: Segmento[]): { inicio: Punto; segs: Segmento[] } {
  const puntos = [inicio, ...segs.map(s => s.a)]
  const out: Segmento[] = []
  for (let i = segs.length - 1; i >= 0; i--) {
    const s = segs[i]!
    out.push(s.c1 && s.c2 ? { a: puntos[i]!, c1: s.c2, c2: s.c1 } : { a: puntos[i]! })
  }
  return { inicio: puntos.at(-1)!, segs: out }
}
