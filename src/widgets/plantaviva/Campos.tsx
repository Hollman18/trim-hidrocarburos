import type { Momento, VistaPlantaViva } from '@/shared/api/plantaViva'
import { MarcaPrioridad } from '@/shared/ui/Prioridad'
import { Chevron } from './piezas'
import { n0 } from './cifras'
import { MiniTuberia } from './Tuberia'
import { useAcciones } from './acciones'

/** «Todos mis campos» (X4 §4.6 a, X5 §5.3 «Por fila»): una fila por campo, de
 *  la que más pesa en el momento a la que menos, con su tubería en chico (el
 *  tramo trabado angostado y rayado) y el primer equipo con su marca en el
 *  renglón de abajo. Un toque en la fila abre el campo; uno en el equipo, su ficha. */
export function Campos({ v, momento }: { v: VistaPlantaViva; momento: Momento }) {
  const { abrir, verCampo } = useAcciones()
  return (
    <div role="list" aria-label="Sus campos" data-campos="">
      {v.filas.map(f => (
        <div role="listitem" key={f.campoId} data-campo={f.campoId} data-valor={f.valor}
          className="border-t border-[var(--linea2)] py-[9px] first:border-t-0">
          <button type="button" onClick={() => verCampo(f.campoId)} aria-label={`${f.nombre}: ${n0(f.valor)} ${f.unidad}. Abrir el campo`}
            className="grid w-full cursor-pointer grid-cols-[1fr_auto_16px] items-center gap-x-2 text-left hover:opacity-80">
            <span className="text-[16px] font-semibold text-[var(--tinta)]">{f.nombre}</span>
            <span className="whitespace-nowrap text-right text-[16px] font-bold text-[var(--tinta)]">{n0(f.valor)} <small className="text-[13px] font-normal text-[var(--tinta2)]">{f.unidad}</small></span>
            <Chevron t={16} />
          </button>
          {!f.campoDeGas && (f.valor > 0.5 || f.tramo) && <div className="mt-1 sm:max-w-[520px]"><MiniTuberia tramo={f.tramo} momento={momento} /></div>}
          {f.primerEquipo ? (
            <button type="button" onClick={() => abrir(f.primerEquipo)} data-primer-equipo={f.primerEquipo.equipo}
              className="mt-1 flex cursor-pointer items-center gap-[5px] text-left text-[13px] text-[var(--tinta2)] hover:underline">
              {f.primerEquipo.prioridad ? <MarcaPrioridad s={f.primerEquipo.prioridad} tamano={14} decorativa /> : null}
              {f.linea}
            </button>
          ) : f.campoDeGas && <p className="mt-0.5 text-[13px] text-[var(--tinta2)]">{f.linea}</p>}
        </div>
      ))}
    </div>
  )
}
