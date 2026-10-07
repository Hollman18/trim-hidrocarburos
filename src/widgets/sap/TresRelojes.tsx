import type { relojes } from '@/entities/sap'
import { fmtHoras } from '@/widgets/bombas/comun'

type Relojes = NonNullable<ReturnType<typeof relojes>>

/** Los tres relojes de una falla (ISO 14224): reparación activa (horas
 *  confirmadas en SAP), espera (repuesto, permisos, cuadrilla) e
 *  indisponibilidad total (la parada que ve el PLC). Separarlos dice si la
 *  parada larga es de mantenimiento o de la espera. */
export function TresRelojes({ reloj }: { reloj: Relojes }) {
  // Sin ninguna falla con su parada del PLC no hay promedio: se deja el hueco, no un 0.
  const h = (v?: number) => (v === undefined ? 'sin dato' : fmtHoras(v))
  return (
    <>
      <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[11.5px]">
        <dt>Reparación activa <small className="text-[var(--tinta3)]">(horas confirmadas en SAP)</small></dt><dd className="tabular m-0 text-right">{h(reloj.activaH)}</dd>
        <dt>Espera <small className="text-[var(--tinta3)]">(repuesto, permisos, cuadrilla)</small></dt><dd className="tabular m-0 text-right font-semibold">{h(reloj.esperaH)}</dd>
        <dt>Indisponibilidad total <small className="text-[var(--tinta3)]">(la parada que ve el PLC)</small></dt><dd className="tabular m-0 text-right">{h(reloj.totalH)}</dd>
      </dl>
      <p className="mt-1 text-[10.5px] text-[var(--tinta3)]">Separarlos es lo que deja ver si la parada larga es de mantenimiento o de la espera del repuesto (ISO 14224).</p>
      {/* Lo que no entra en el promedio se cuenta: si no, el promedio parecería de todas. */}
      {reloj.excluidas > 0 && (
        <p className="mt-1 text-[10.5px] text-[var(--tinta2)]">
          Promedio de {reloj.fallas} {reloj.fallas === 1 ? 'falla cerrada' : 'fallas cerradas'}; {reloj.excluidas} {reloj.excluidas === 1 ? 'orden correctiva cerrada no tiene' : 'órdenes correctivas cerradas no tienen'} la parada del PLC que las respalde y no entran.
        </p>
      )}
    </>
  )
}
