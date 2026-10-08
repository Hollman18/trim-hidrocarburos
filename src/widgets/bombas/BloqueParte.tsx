import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { ESTADO_PARTE, type SaludParte } from '@/entities/salud'
import type { PapelVariable } from '@/entities/partes'
import type { HistorialParte } from '@/entities/libro'
import { Chip, Hueco } from '@/shared/ui/primitivas'
import { MarcaPrioridad } from '@/shared/ui/Prioridad'
import { Info } from '@/shared/ui/Info'
import { n0, plural } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Proyeccion } from './Proyeccion'
import { fmtBbl, fmtHoras, pronosticoCorto, fraseParteCorta } from './comun'

const H5 = ({ children }: { children: React.ReactNode }) =>
  <h5 className="font-cond mb-1 mt-2 text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)] first:mt-0">{children}</h5>

const PAPEL: Record<PapelVariable, string> = { avisa: 'anuncia', causa: 'la daña', confirma: 'confirma' }

/** Una parte de un equipo de alto impacto (bomba o electrosumergible): cómo
 *  está, qué lo dice, qué le ha costado y qué hacer. Lo que explica (qué
 *  hacer, con cuánto avisa, cuánto pesa) va en sus ⓘ, que en el papel salen escritas. */
export function BloqueParte({ sp, h }: { sp: SaludParte; h?: HistorialParte }) {
  const [abierta, setAbierta] = useState(sp.estado === 'fallo' || sp.estado === 'fuera' || sp.estado === 'avisa')
  const senales = [...sp.medidas.map(m => ({ nombre: m.senal.plantilla.nombre, tag: m.senal.tag, papel: m.papel,
      valor: m.senal.valor === null ? 'sin señal' : `${m.senal.valor.toLocaleString('es-CO')} ${m.senal.unidad}`,
      pron: m.senal.pronostico.tipo === 'cruza' ? pronosticoCorto(m.senal.pronostico) : m.senal.pronostico.tipo === 'cruzado' ? 'ya cruzó' : '' })),
    ...sp.sinSenal.map(m => ({ nombre: m.senal.plantilla.nombre, tag: m.senal.tag, papel: m.papel, valor: 'sin señal', pron: '' })),
    ...sp.discretas.map(d => ({ nombre: d.plantilla.nombre, tag: d.tag, papel: d.papel, valor: d.estado, pron: '' }))]
  // Lo que la etiqueta ya dice (estable, equipo detenido) no se repite debajo del nombre.
  const frase = fraseParteCorta(sp)
  return (
    <div className="border-b border-[var(--linea2)] last:border-0">
      <button onClick={() => setAbierta(v => !v)} aria-expanded={abierta}
        className="grid w-full cursor-pointer grid-cols-[auto_1fr_auto_auto] items-center gap-2.5 py-2.5 text-left hover:bg-[var(--panel2)]">
        <MarcaPrioridad s={sp.prioridad} tamano={14} />
        <span className="min-w-0">
          <b className="block text-[12.5px] leading-tight">{sp.parte.nombre}</b>
          {frase && <small className="tabular block truncate text-[10.5px] text-[var(--tinta2)]">{frase}</small>}
        </span>
        <span className="text-right">
          <Chip tono={sp.estado === 'fallo' || sp.estado === 'fuera' ? 'fuerte' : 'neutro'}>{ESTADO_PARTE[sp.estado]}</Chip>
          {h && <small className="tabular mt-0.5 hidden text-[10px] text-[var(--tinta3)] sm:block">{h.fallas} {h.fallas === 1 ? 'falla' : 'fallas'} · {n0(h.bbl)} bbl</small>}
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
                  <span className={cn('tabular shrink-0 text-right', x.valor === 'sin señal' && 'text-[var(--invalido)]')}>{x.valor}</span>
                </div>
              ))}
              {sp.faltan.length > 0 && (
                <p className="mt-1.5 text-[10.5px] text-[var(--tinta2)]">
                  Falta instrumentar: {sp.faltan.map(pl => `${pl.nombre.toLowerCase()} (${pl.isa})`).join(', ')}.
                </p>
              )}
              {senales.length === 0 && <Hueco>Nada de lo que la anuncia está instrumentado.</Hueco>}
            </div>
            <div>
              <H5>LO QUE HA COSTADO</H5>
              {h ? (
                <dl className="tabular grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                  <dt className="text-[var(--tinta3)]">{h.fallas === 1 ? 'falla' : 'fallas'}</dt>
                  <dd className="m-0"><b>{h.fallas}</b> · {fmtBbl(h.bbl)}{h.disparos ? ` · ${plural(h.disparos, 'disparo', 'disparos')}` : ''}</dd>
                  {h.mtbfDias ? <><dt className="text-[var(--tinta3)]">una cada</dt><dd className="m-0"><b>{n0(h.mtbfDias)} días</b></dd></> : null}
                  {h.mdtH !== undefined && h.mdtH > 0 ? <><dt className="text-[var(--tinta3)]">fuera</dt><dd className="m-0">{fmtHoras(h.mdtH, true)} en promedio</dd></> : null}
                  {h.bblPorFalla !== undefined && <><dt className="text-[var(--tinta3)]">por falla</dt><dd className="m-0"><b>{fmtBbl(h.bblPorFalla)}</b></dd></>}
                </dl>
              ) : <p className="text-[var(--tinta2)]">Sin fallas registradas.</p>}
              <p className="mt-2 flex flex-wrap items-center gap-x-3">
                <Info rotulo="qué hacer" titulo={`Qué hacer · ${sp.parte.nombre}`} texto={`${sp.parte.accion} Ítem ISO 14224: ${sp.parte.itemIso}.`} />
                <Info rotulo="anticipación" titulo="Con cuánto avisa" texto={sp.parte.anticipacion} />
                <Info rotulo="cuánto pesa" titulo="Cuánto pesa" texto={`${sp.parte.peso.texto}. Fuente: ${sp.parte.peso.fuente}.`} />
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
