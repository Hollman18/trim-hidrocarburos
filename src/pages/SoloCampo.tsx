import { useApp, useCampos } from '@/app/store'
import { PANTALLAS } from '@/app/pantallas'
import { Panel } from '@/shared/ui/primitivas'
import { n0, plural } from '@/shared/lib/formato'
import { useEstadoCampos } from '@/shared/api/diferidos'
import { MarcaPrioridad } from '@/shared/ui/Prioridad'

/** Pantalla que solo existe por campo: un esquema de planta o un tren de agua
 *  de cinco campos a la vez no es una cosa. Se pide el campo y ya. */
export function SoloCampo() {
  const setCampo = useApp(s => s.setCampo), pantalla = useApp(s => s.pantalla)
  const campos = useCampos()
  const p = PANTALLAS[pantalla]
  const estados = useEstadoCampos(campos.map(c => c.id))

  return (
    <Panel titulo={`${p?.titulo ?? 'Esta pantalla'} · elija un campo`}>
      <div className="grid gap-1.5 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        {campos.map(c => { const e = estados.find(x => x.campoId === c.id); return (
          <button key={c.id} onClick={() => setCampo(c.id)}
            className="flex cursor-pointer items-center gap-2.5 rounded border border-[var(--linea)] bg-[var(--panel2)] px-3 py-2.5 text-left hover:border-[var(--tinta2)] hover:bg-[var(--panel)]">
            <MarcaPrioridad s={e?.severidad ?? 0} tamano={13} />
            <span className="min-w-0 flex-1">
              <b className="block truncate text-[12.5px]">{c.nombre}</b>
              <small className="block text-[10.5px] text-[var(--tinta3)]">
                {c.cuenca} · {e?.ayer.bbl === null || e?.ayer.bbl === undefined ? 'sin fiscal' : `${n0(e.ayer.bbl)} bbl`} el último día · {plural(e?.parados ?? 0, 'pozo parado', 'pozos parados')}
              </small>
            </span>
          </button>
        ) })}
      </div>
    </Panel>
  )
}
