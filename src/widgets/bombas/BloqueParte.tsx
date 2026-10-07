import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { ESTADO_PARTE, type SaludParte } from '@/entities/salud'
import type { PapelVariable } from '@/entities/partes'
import type { HistorialParte } from '@/entities/libro'
import { Chip, Hueco } from '@/shared/ui/primitivas'
import { MarcaPrioridad } from '@/shared/ui/Prioridad'
import { n0 } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Proyeccion } from './Proyeccion'
import { fmtBbl, fmtHoras, textoPronostico, fraseParte, estadoCorto } from './comun'

const H5 = ({ children }: { children: React.ReactNode }) =>
  <h5 className="font-cond mb-1 mt-2 text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)] first:mt-0">{children}</h5>

const PAPEL: Record<PapelVariable, string> = { avisa: 'anuncia', causa: 'la daña', confirma: 'confirma' }

/** Una parte de un equipo de alto impacto (bomba o electrosumergible): cómo
 *  está, qué lo dice, qué le ha costado y qué hacer. */
export function BloqueParte({ sp, h }: { sp: SaludParte; h?: HistorialParte }) {
  const [abierta, setAbierta] = useState(sp.estado === 'fallo' || sp.estado === 'fuera' || sp.estado === 'avisa')
  const senales = [...sp.medidas.map(m => ({ nombre: m.senal.plantilla.nombre, tag: m.senal.tag, papel: m.papel,
      valor: m.senal.valor === null ? 'sin señal' : `${m.senal.valor.toLocaleString('es-CO')} ${m.senal.unidad}`,
      pron: m.senal.pronostico.tipo === 'cruza' ? textoPronostico(m.senal.pronostico) : m.senal.pronostico.tipo === 'cruzado' ? 'ya cruzó' : '' })),
    ...sp.sinSenal.map(m => ({ nombre: m.senal.plantilla.nombre, tag: m.senal.tag, papel: m.papel, valor: 'sin señal', pron: '' })),
    ...sp.discretas.map(d => ({ nombre: d.plantilla.nombre, tag: d.tag, papel: d.papel, valor: d.estado, pron: '' }))]
  return (
    <div className="border-b border-[var(--linea2)] last:border-0">
      <button onClick={() => setAbierta(v => !v)} aria-expanded={abierta}
        className="grid w-full cursor-pointer grid-cols-[auto_1fr_auto_auto] items-center gap-2.5 py-2.5 text-left hover:bg-[var(--panel2)]">
        <MarcaPrioridad s={sp.prioridad} tamano={14} />
        <span className="min-w-0">
          <b className="block text-[12.5px] leading-tight">{sp.parte.nombre}</b>
          <small className="block truncate text-[10.5px] text-[var(--tinta2)]">{fraseParte(sp)}</small>
        </span>
        <span className="hidden text-right sm:block">
          <Chip tono={sp.estado === 'fallo' || sp.estado === 'fuera' ? 'fuerte' : 'neutro'}>{ESTADO_PARTE[sp.estado]}</Chip>
          {h && <small className="tabular mt-0.5 block text-[10px] text-[var(--tinta3)]">{h.fallas} {h.fallas === 1 ? 'falla' : 'fallas'} · {n0(h.bbl)} bbl</small>}
        </span>
        <ChevronDown className={cn('size-4 text-[var(--tinta3)] transition-transform', abierta && 'rotate-180')} />
      </button>
      {abierta && (
        <div className="pb-3 pl-1">
          {sp.primera && <div className="mb-2"><Proyeccion s={sp.primera.senal} /></div>}
          <div className="grid gap-3 text-[11px] [grid-template-columns:repeat(auto-fit,minmax(250px,1fr))]">
            <div>
              <H5>QUÉ LA ANUNCIA</H5>
              {senales.map(x => (
                <div key={x.tag} className="grid grid-cols-[1fr_auto] gap-2 border-b border-[var(--linea2)] py-1 last:border-0">
                  <span className="min-w-0">
                    {x.nombre} <span className="text-[10px] text-[var(--tinta3)]">· {PAPEL[x.papel]}</span>
                    <small className="font-mono block text-[9.5px] text-[var(--tinta3)]">{x.tag}{x.pron ? ` · ${x.pron}` : ''}</small>
                  </span>
                  <span className="tabular shrink-0 text-right">{x.valor}</span>
                </div>
              ))}
              {sp.faltan.length > 0 && (
                <p className="mt-1.5 text-[10.5px] text-[var(--tinta2)]">
                  Falta instrumentar: {sp.faltan.map(pl => `${pl.nombre.toLowerCase()} (${pl.isa})`).join(', ')}.
                </p>
              )}
              {senales.length === 0 && <Hueco>Nada de lo que anuncia esta parte está instrumentado.</Hueco>}
            </div>
            <div>
              <H5>LO QUE HA COSTADO</H5>
              {h ? (
                <p className="text-[var(--tinta2)]">
                  <b className="tabular text-[var(--tinta)]">{h.fallas} {h.fallas === 1 ? 'falla' : 'fallas'} · {fmtBbl(h.bbl)}</b>{h.disparos ? ` y ${h.disparos} disparos` : ''}.
                  {h.mdtH !== undefined && h.mdtH > 0 && <> Fuera de servicio {fmtHoras(h.mdtH, true)} en promedio.</>}
                  {h.mtbfDias && <> Falla una vez cada <b className="tabular text-[var(--tinta)]">{n0(h.mtbfDias)} días</b>.</>}
                  {h.bblPorFalla !== undefined && <> Si vuelve a fallar como en promedio: <b className="tabular text-[var(--tinta)]">{fmtBbl(h.bblPorFalla)}</b>.</>}
                </p>
              ) : <p className="text-[var(--tinta2)]">Sin fallas registradas de esta parte en este equipo.</p>}
              <H5>CUÁNTO PESA</H5>
              <p className="text-[var(--tinta2)]">{sp.parte.peso.texto}. <span className="text-[var(--tinta3)]">Fuente: {sp.parte.peso.fuente}.</span></p>
              <H5>CON CUÁNTO AVISA</H5>
              <p className="text-[var(--tinta2)]">{sp.parte.anticipacion}</p>
              <H5>QUÉ HACER CUANDO AVISA</H5>
              <p className="text-[var(--tinta2)]">{sp.parte.accion} <span className="text-[var(--tinta3)]">Ítem ISO 14224: {sp.parte.itemIso} · estado: {estadoCorto(sp)}.</span></p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
