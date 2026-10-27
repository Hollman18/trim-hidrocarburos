import { Boton } from '@/shared/ui/primitivas'
import { Info } from '@/shared/ui/Info'
import { useExportar } from './useExportar'

const QUE_BAJA = '«Exportar el reporte» baja el CSV para la ANH; «Informe en PDF», el informe con membrete. Los dos quedan con folio y huella.'

/** «Exportar el reporte» de regulatorio (necesario-por-rol §10: la acción principal, 1 toque):
 *  el CSV para la ANH del campo (el libro mes a mes con el factor y las casillas de PRODML) y,
 *  al lado, el informe en PDF con folio. Uno solo en la pantalla (borrado.md A-26). Cada salida
 *  queda registrada con su folio y su huella (`useExportar`). */
export function ExportarReporte({ className, telefono }: { className?: string; telefono?: boolean }) {
  const x = useExportar()
  if (!x.puede) return null
  return (
    <div className={className}>
      <div className="no-imprimir flex flex-wrap items-center gap-3">
        <Boton variante="principal" disabled={x.ocupado || !x.csvAnh} onClick={() => void x.csvAnh?.()} data-exportar-reporte="" className="min-h-12 px-6 text-[16px]">
          Exportar el reporte
        </Boton>
        {/* B4 · En el teléfono (§14: «[ Exportar el reporte ]»), lo que baja cada uno y su folio, en su ⓘ (va con el enlace si baja de renglón). */}
        <span className="inline-flex items-center gap-1.5">
          <button type="button" disabled={x.ocupado} onClick={() => void x.pdf()} className="toque min-h-11 cursor-pointer text-[15px] font-semibold text-[var(--tinta)] underline underline-offset-4 disabled:opacity-60">
            Informe en PDF
          </button>
          {telefono && <Info titulo="Lo que baja" texto={`${QUE_BAJA}${x.ultimo ? ` Último: ${x.ultimo.folio}.` : ''}`} />}
        </span>
      </div>
      {!telefono && <p className="mt-1.5 text-[13px] text-[var(--tinta2)]">CSV para la ANH · queda con folio y huella{x.ultimo ? ` · último ${x.ultimo.folio}` : ''}</p>}
      {x.aviso && <p role="alert" className="mt-1 text-[14px] text-[var(--tinta)]">{x.aviso}</p>}
    </div>
  )
}
