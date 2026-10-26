import type { relojes } from '@/entities/sap'
import { Info } from '@/shared/ui/Info'
import { fmtHoras } from '@/widgets/bombas/comun'

type Relojes = NonNullable<ReturnType<typeof relojes>>

/** Los tres relojes de una falla (ISO 14224): reparación activa (horas
 *  confirmadas en SAP), espera (repuesto, permisos, cuadrilla) e
 *  indisponibilidad total (la parada que ve el PLC). Separarlos dice si la
 *  parada larga es de mantenimiento o de la espera.
 *
 *  La barra es la indisponibilidad total partida en sus dos relojes (activa +
 *  espera = total, `relojes` en entities/sap): se ve de un golpe cuál pesa. Gris
 *  siempre (ISA-101): no es una alarma. Lo que explica cada reloj y de dónde
 *  sale queda en el ⓘ, que en el papel sale escrito. */
export function TresRelojes({ reloj }: { reloj: Relojes }) {
  // Sin ninguna falla con su parada del PLC no hay promedio: se deja el hueco, no un 0.
  const h = (v?: number) => (v === undefined ? 'sin dato' : fmtHoras(v))
  const total = reloj.totalH ?? 0
  const ancho = (v?: number) => `${total > 0 && v !== undefined ? (v / total) * 100 : 0}%`
  const ACTIVA = 'var(--dato-4)', ESPERA = 'var(--dato-1)'
  const muestra = (fondo: string) => <i aria-hidden className="mr-1.5 inline-block size-2 align-[1px]" style={{ background: fondo }} />
  return (
    <>
      <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[14px]">
        <dt>{muestra(ACTIVA)}Reparación activa</dt><dd className="tabular m-0 text-right">{h(reloj.activaH)}</dd>
        <dt>{muestra(ESPERA)}Espera</dt><dd className="tabular m-0 text-right font-semibold">{h(reloj.esperaH)}</dd>
        <dt className="flex flex-wrap items-center gap-x-1">Indisponibilidad total
          <Info titulo="Tres relojes" texto="Reparación activa: horas confirmadas en SAP. Espera: repuesto, permisos, cuadrilla. Indisponibilidad total: la parada que ve el PLC. Separarlos deja ver si la parada larga es de mantenimiento o de la espera del repuesto (ISO 14224)." />
        </dt>
        <dd className="tabular m-0 text-right">{h(reloj.totalH)}</dd>
      </dl>
      {total > 0 && (
        <span aria-hidden className="mt-1.5 flex h-2 overflow-hidden rounded-sm border border-[var(--linea2)] bg-[var(--panel2)]">
          {/* Una raya del color del panel separa los dos tramos: sin ella, dos grises vecinos se funden. */}
          <i className="block h-full border-r-2 border-[var(--panel)]" style={{ width: ancho(reloj.activaH), background: ACTIVA }} />
          <i className="block h-full" style={{ width: ancho(reloj.esperaH), background: ESPERA }} />
        </span>
      )}
      {/* Lo que no entra en el promedio se cuenta: si no, el promedio parecería de todas. */}
      {reloj.excluidas > 0 && (
        <p className="mt-1 flex flex-wrap items-center gap-x-1 text-[13px] text-[var(--tinta2)]">
          {reloj.excluidas} {reloj.excluidas === 1 ? 'orden fuera' : 'órdenes fuera'} del promedio
          <Info titulo="Fuera del promedio" texto={`Promedio de ${reloj.fallas} ${reloj.fallas === 1 ? 'falla cerrada' : 'fallas cerradas'}; ${reloj.excluidas} ${reloj.excluidas === 1 ? 'orden correctiva cerrada no tiene' : 'órdenes correctivas cerradas no tienen'} la parada del PLC que las respalde y no entran.`} />
        </p>
      )}
    </>
  )
}
