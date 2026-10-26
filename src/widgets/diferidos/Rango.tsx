import type { Libro } from '@/entities/libro'
import { useNivel } from '@/app/store'
import { Tip } from '@/shared/ui/Tip'
import { n0 } from '@/shared/lib/formato'

/** Nota de cálculo de los barriles diferidos: va en la ayuda, en la pantalla
 *  y en el pie de cada informe. Lo producido se mide; lo no producido se
 *  calcula, y se dice. */
export const NOTA_DE_CALCULO =
  'Lo producido sale del punto de medición oficial. Lo no producido se calcula por asignación ' +
  '(prueba de cada pozo × factor de asignación × horas parado): es una estimación con su ' +
  'rango de tolerancia (Res. MME 40236, Ec. 22), no una medición directa. Las predicciones ' +
  'son escenarios, no compromisos.'

/** La misma nota para quien decide: sin la fórmula ni la norma. */
export const NOTA_SIMPLE =
  'Lo producido se mide en el punto de medición oficial. Lo diferido se calcula a partir de las ' +
  'pruebas de los pozos y las horas que estuvieron parados: es una estimación con su margen, no ' +
  'una medición. La cifra real está dentro del rango. Las predicciones son escenarios, no compromisos.'

/** El rango de tolerancia junto a los barriles no producidos. Lo ven todos
 *  los roles: es lo que protege la cifra cuando sale de la sala. El método
 *  (la ecuación, las bandas) se queda en ingeniería. */
export function Rango({ lb, className, plano, corto }: { lb: Libro; className?: string
  /** Sin globo de ayuda: para cuando ya va dentro de otro. */
  plano?: boolean
  /** «5.729–6.734 bbl · calculado»: el «no medido» y el porqué quedan en el globo. */
  corto?: boolean }) {
  const decide = useNivel() === 'decision'
  const lo = Math.max(0, lb.brecha - lb.tolerancia), hi = lb.brecha + lb.tolerancia
  const texto = corto ? `${n0(lo)}–${n0(hi)} bbl · calculado` : `entre ${n0(lo)} y ${n0(hi)} bbl · calculado, no medido`
  if (plano) return <small className="tabular block text-[13px] text-[var(--tinta3)]">{texto}</small>
  return (
    <Tip titulo={decide ? 'Margen del cálculo' : 'Rango de tolerancia'} pista={decide ? NOTA_SIMPLE : NOTA_DE_CALCULO}
      filas={[['Rango', `${n0(lo)} a ${n0(hi)} bbl`], ...(lb.aproximado > 0 ? [['Aparte, aproximado', `${n0(lb.aproximado)} bbl a frecuencia reducida`] as [string, string]] : [])]}
      className={className ?? 'block'}>
      <small className="tabular block text-[13px] text-[var(--tinta3)]">{texto}</small>
    </Tip>
  )
}
