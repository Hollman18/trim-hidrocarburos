/** F2 · LO PROGRAMADO CONTRA LO QUE NO (P-mant-1; X4 §6.1, tabla «Antes y después»).
 *
 *  La balanza del jefe de mantenimiento, dicha en una frase y no en cuatro cifras
 *  sueltas («del diferido, programado · 0,0 % · 0 bbl · 1.046 bbl no programado»):
 *  «Ninguna parada de este mes estaba programada: los 1.046 bbl fueron fallas o
 *  siguen sin identificar.»
 *
 *  Las dos partes salen del libro (`planeado`, `noPlaneado`) y se dicen con la
 *  regla de redondeo (`redondeo.ts`): la raíz es el diferido del período y las
 *  partes se reparten por mayor residuo, así que siempre suman la cifra que se ve. */
import type { Libro } from './libro'
import { enteroDe, repartirEnteros, porcentajesEnteros } from './redondeo'

const FMT = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })

/** Lo programado y lo que no, del libro de un período, en enteros que suman la raíz. */
export interface Programado {
  /** El diferido del período: la raíz, redondeada una vez. */
  diferido: number
  programado: number
  noProgramado: number
  /** Del diferido, lo programado en %: con lo no programado suma 100. */
  pct: number
  /** La frase de X4 §6.1. */
  frase: string
}

/** El mes en curso se dice «este mes»; cualquier otro período, «el período». */
export function programadoDe(lb: Pick<Libro, 'diferido' | 'planeado' | 'noPlaneado' | 'meta'>): Programado {
  const raiz = enteroDe(lb.diferido)
  const [programado, noProgramado] = repartirEnteros(raiz, [{ id: 'programado', valor: lb.planeado }, { id: 'no', valor: lb.noPlaneado }]) as [number, number]
  const [pct] = porcentajesEnteros([{ id: 'programado', valor: lb.planeado }, { id: 'no', valor: lb.noPlaneado }]) as [number, number]
  const enCurso = lb.meta.diasTotal > lb.meta.dias + 0.01
  const de = enCurso ? 'de este mes' : 'del período'
  const frase = raiz === 0
    ? `Ninguna parada ${de} costó crudo.`
    : programado === 0
      ? `Ninguna parada ${de} estaba programada: los ${FMT.format(raiz)} bbl fueron fallas o siguen sin identificar.`
      : noProgramado === 0
        ? `Todo lo diferido ${de} estaba programado: ${FMT.format(raiz)} bbl, ninguno por fallas.`
        : `De los ${FMT.format(raiz)} bbl ${de}, ${FMT.format(programado)} estaban programados (${pct} %): los otros ${FMT.format(noProgramado)} fueron fallas o siguen sin identificar.`
  return { diferido: raiz, programado, noProgramado, pct, frase }
}
