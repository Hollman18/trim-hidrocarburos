import { region } from '@/shared/config/region'
import type { EstadoDispositivo } from '@/entities/tipos'
/** Formato de cifras según la convención del sector en Colombia.
 *  La tasa (BPDC) no se acumula; el volumen (bbl) sí. */
/* Un formateador por formato, armado una vez: armar uno por cifra pintada
   costaba más que pintarla. El texto sale igual. */
const FMT_N0 = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const FMT_N1 = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const FMT_N2 = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const FMT_N3 = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
const FMT_NUM = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 3 })
const FMT_DIA_ISO = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' })

/** Sin decimales y sin «-0»: un redondeo a cero es cero. */
export const n0 = (v: number) => FMT_N0.format(Math.round(v) === 0 ? 0 : v)
export const n1 = (v: number) => FMT_N1.format(v)
/** La parte de un total en %, sin decimales. Lo que no es cero pero no llega
 *  a 1 % se dice «< 1 %», nunca «0 %» (un número que no es cero no se pinta
 *  como cero). `lector`: «menos del 1 %», para el nombre accesible. */
export const pctParte = (p: number, lector = false) =>
  p > 0 && p < 1 ? (lector ? 'menos del 1 %' : '< 1 %') : `${n0(p)} %`
export const n2 = (v: number) => FMT_N2.format(v)
/** Tres decimales con coma (el factor de asignación): con `toFixed`, «1.008» se lee mil ocho. */
export const n3 = (v: number) => FMT_N3.format(v)
export const pct = (v: number) => `${n1(v)} %`
/** Por debajo del millón, «0,1 M USD» esconde la cifra: se baja a miles. */
export const usd = (v: number): { valor: string; unidad: string } =>
  v >= 1e6 ? { valor: n1(v / 1e6), unidad: 'M USD' } : v >= 1e3 ? { valor: n0(v / 1e3), unidad: 'mil USD' } : { valor: n0(v), unidad: 'USD' }

/** Plural de una cantidad: «1 bomba», «2 bombas». */
export const plural = (n: number, uno: string, varios: string) => `${n0(n)} ${Math.round(n) === 1 ? uno : varios}`
export const usdM = (v: number) => `${n1(v / 1e6)} M USD`

/** Valor de instrumento: se respeta la resolución que trae el dispositivo
 *  (0,384 kW/bbl no es 0,4) y se usa la coma decimal del país. `null` (sin
 *  lectura) es «—», nunca «null» ni cero; donde se pueda, la pantalla lo dice
 *  como dato inválido («sin señal», ISA-101) con `sinLectura`. */
export const num = (v: number | string | null) =>
  v === null ? '—' : typeof v === 'number' ? FMT_NUM.format(v) : v

/** Un instrumento sin lectura: lo dice su estado o llega sin valor
 *  (`valor: null`, CONTRATO.md). Es un dato inválido, no un valor. */
export const sinLectura = (d: { valor: number | string | null; estado: EstadoDispositivo }) =>
  d.estado === 'sin señal' || d.valor === null

/** El estado de un instrumento dicho para leer: la clave interna no lleva
 *  tilde («atencion») y no se escribe tal cual. */
export const NOMBRE_ESTADO: Record<EstadoDispositivo, string> = {
  normal: 'normal', aviso: 'aviso', atencion: 'atención', alarma: 'alarma', 'sin señal': 'sin señal',
}

/** Unidades del despliegue. Vienen del adaptador de país, no del núcleo. */
export const UNIDAD = {
  tasaCrudo: region.tasaCrudo,
  tasaAgua: region.tasaAgua,
  tasaGas: region.tasaGas,
  volumen: region.volumen,
  condicionesEstandar: region.condiciones,
} as const

/** Convierte el límite declarado del instrumento («0,330 – 0,352», «< 85»,
 *  «> -0,2», «1.100 – 1.400») en una banda numérica para la minigráfica.
 *  Devuelve undefined cuando el límite no es un número («—», «armado»). */
const aNumero = (s: string): number | undefined => {
  const n = Number(s.trim().replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : undefined
}
export const banda = (limite: string): [number, number] | undefined => {
  const rango = limite.match(/^(-?[\d.,]+)\s*[–-]\s*(-?[\d.,]+)$/)
  if (rango) {
    const a = aNumero(rango[1]!), b = aNumero(rango[2]!)
    return a !== undefined && b !== undefined ? [a, b] : undefined
  }
  // Un límite de un solo lado se queda abierto por el otro: estar muy por
  // debajo de «< 85» no es una desviación y no se puede pintar como tal.
  const techo = limite.match(/^<\s*(-?[\d.,]+)$/)
  if (techo) { const v = aNumero(techo[1]!); return v === undefined ? undefined : [-Infinity, v] }
  const piso = limite.match(/^>\s*(-?[\d.,]+)$/)
  if (piso) { const v = aNumero(piso[1]!); return v === undefined ? undefined : [v, Infinity] }
  return undefined
}

/** Decimales coherentes con la resolución del dato (ISA-101, Tabla 7): los
 *  que trae la serie del instrumento, hasta tres. */
export const decimalesDe = (serie: ReadonlyArray<number | null> | undefined, valor?: number | null) => {
  // Los huecos del historiador (null) no tienen decimales que contar.
  const xs = [...(serie ?? []), valor].filter((v): v is number => typeof v === 'number')
  return Math.min(3, Math.max(0, ...xs.map(v => {
    const t = String(v), i = t.indexOf('.')
    return i < 0 ? 0 : t.length - i - 1
  })))
}

/** Día civil en Bogotá, como «2026-10-02»: lo que pide el selector de rango. */
export const diaIso = (d: Date) => FMT_DIA_ISO.format(d)
