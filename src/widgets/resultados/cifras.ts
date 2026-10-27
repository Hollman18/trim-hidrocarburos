/* Las cifras como en campo (C5 · Resultados). */

const FMT_N0 = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
/** «1.046»: punto de miles, sin decimales (y nunca «−0»). */
export const n0 = (v: number) => FMT_N0.format(Math.round(v) === 0 ? 0 : v)
const FMT_N1 = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
export const n1 = (v: number) => FMT_N1.format(v)
const FMT_N2 = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
/** «1.046,03»: el valor exacto, para la ⓘ de «calculado». */
export const n2 = (v: number) => FMT_N2.format(v)
