import { useApp } from '@/app/store'
import { PIEZA_DE_PANTALLA } from '@/entities/piezas-trim'
import { AvisoSinPieza } from '@/widgets/SinPieza'

/** Fase 1 (facilidades): la pantalla es de una pieza de TRIM que su empresa no
 *  contrató. Se dice cuál, en vez de abrir una pantalla vacía o con ceros. */
export function SinPieza() {
  const pantalla = useApp(s => s.pantalla)
  return <div data-pantalla-sin-pieza={pantalla} className="max-w-[560px]"><AvisoSinPieza piezas={PIEZA_DE_PANTALLA[pantalla] ?? []} /></div>
}
