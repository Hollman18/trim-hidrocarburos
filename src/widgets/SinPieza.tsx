import { NOMBRE_PIEZA, type PiezaTrim } from '@/entities/piezas-trim'

/** Fase 1 (facilidades): lo que se vería aquí es de una pieza de TRIM que la empresa
 *  no contrató. Se dice cuál, en vez de dejar un hueco o mostrar cifras de otra pieza. */
export function AvisoSinPieza({ piezas, que, className }: { piezas: readonly PiezaTrim[]; que?: string; className?: string }) {
  const n = piezas.map(p => NOMBRE_PIEZA[p])
  const cuales = n.length > 1 ? `${n.slice(0, -1).join(', ')} o ${n.at(-1)}` : n[0] ?? ''
  return (
    <section role="status" data-sin-pieza={piezas.join(',')} className={`grid gap-2 rounded-[10px] bg-[var(--panel)] px-6 py-5 ${className ?? ''}`}>
      <p className="text-[13px] font-medium uppercase tracking-[0.04em] text-[var(--tinta2)]">Sin dato</p>
      <p className="text-[16px] leading-normal">{que ?? 'Esto'} es de la pieza <b>{cuales}</b> de TRIM, y su empresa no la tiene contratada.</p>
      <p className="text-[15px] leading-normal text-[var(--tinta2)]">El administrador de la implementación puede encenderla.</p>
    </section>
  )
}
