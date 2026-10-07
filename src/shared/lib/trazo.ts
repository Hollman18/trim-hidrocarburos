/** El trazo SVG de una serie a paso fijo. Un hueco del historiador (null)
 *  corta la línea en su lugar y la siguiente lectura vuelve a empezar (M):
 *  nunca se une por encima del hueco ni se pinta en cero. */
export const trazoConHuecos = (valores: ReadonlyArray<number | null>, x: (i: number) => number, y: (v: number) => number): string =>
  valores.map((v, i) => (v === null ? '' : `${i > 0 && valores[i - 1] !== null ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`))
    .filter(Boolean).join(' ')
