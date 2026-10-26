import { useApp, useAmbito, useRango } from '@/app/store'
import { useLibro } from '@/shared/api/diferidos'
import { useListaEquipos } from '@/shared/api/equiposTecnico'
import { ParetoEquipos } from '@/widgets/diferidos/Paretos'
import { Hueco } from '@/shared/ui/primitivas'
import { FilaEquipo } from './Lista'

/** Equipos del gerente (X4 §3.7, «Resumen · POR EQUIPO» y «Diferidos · POR EQUIPO»):
 *  qué equipos pesan, en palabras de campo. Arriba, solo por excepción, los que hoy
 *  están parados o avisan (la misma marca que ve el técnico); abajo, a qué equipo
 *  se le cargan los barriles del período. Un equipo abre su ficha ejecutiva (el
 *  panel, `FichaEjecutiva`): el gerente no ve el detalle técnico (U2 §3.2). */
export function EquiposGerente() {
  const ambito = useAmbito(); const rango = useRango()
  const setCampo = useApp(s => s.setCampo), abrirEquipo = useApp(s => s.abrirEquipo)
  const ids = ambito.campos.map(c => c.id)
  const v = useListaEquipos(ids)
  const lb = useLibro({ campos: ids, desde: rango.desde, hasta: rango.hasta })
  const ahora = v.filas.filter(f => f.condicion || f.parado)
  const abrir = (campoId: string, equipo: string) => { if (ambito.global || campoId !== ambito.campos[0]?.id) setCampo(campoId); abrirEquipo(equipo) }
  return (
    <div className="grid gap-4" data-equipos-gerente>
      <section className="rounded-[20px] bg-[var(--panel)] px-4 pb-2 pt-3 sm:px-6" aria-label="Ahora: lo que está parado o avisa">
        <header className="flex flex-wrap items-baseline justify-between gap-x-3 pb-1">
          <h2 className="text-[16px] font-semibold">Ahora: lo que está parado o avisa</h2>
          <span className="text-[13px] text-[var(--tinta2)]">{ahora.length === 1 ? '1 equipo' : `${ahora.length} equipos`} · los demás, normales</span>
        </header>
        {ahora.length === 0 && <div className="pb-3"><Hueco>Nada parado ni avisando. El campo está normal.</Hueco></div>}
        {ahora.map(f => <FilaEquipo key={`${f.campoId}|${f.equipo}`} f={f} global={ambito.global} onAbrir={() => abrir(f.campoId, f.equipo)} />)}
      </section>
      <div>
        <p className="mb-2 px-1 text-[14px] text-[var(--tinta2)]">Lo que se le carga a cada equipo en {rango.nombre.toLowerCase()} (el período se cambia en Resultados).</p>
        <ParetoEquipos lb={lb} global={ambito.global} simple onAbrir={abrir} />
      </div>
    </div>
  )
}
