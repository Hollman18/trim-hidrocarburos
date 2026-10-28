import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useEfectividad, type VistaEfectividad } from '@/shared/api/balance'
import { Dato } from '@/widgets/choke/Dato'
import { Info } from '@/shared/ui/Info'
import { n0, plural } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { formatoFecha } from '@/shared/lib/fecha'

/** C1 (QA v3): «Ya se ganó» suma desde que entró TRIM, no este mes; sin la fecha, «este mes 436» por encima de «antes
 *  391» y «ya se ganó 3.934» se leían como una contradicción. */
const DESDE = formatoFecha({ day: 'numeric', month: 'long', timeZone: 'America/Bogota' })

/** «¿ESTÁ FUNCIONANDO?» (necesario-por-rol §0d; decisión 2 del dueño: el Antes · Durante ·
 *  Después vive aquí, no como control en el inicio del gerente).
 *
 *  Una sola tarjeta con tres cifras: antes de TRIM (la base), este mes contra la meta de
 *  reducción firmada, y lo que ya se ganó (los barriles que se dejaron de diferir y las
 *  fallas que el vigía anticipó). Por tramo del choke, a un toque. Sin meta firmada lo
 *  dice; sin base, también: nada se inventa. El motor calcula (`useEfectividad`,
 *  `GET /api/vistas/efectividad`). La usan ger, prod y Resultados. */
export function Funcionando({ campos, className }: { campos: string[]; className?: string }) {
  const v = useEfectividad(campos)
  return <FuncionandoDe v={v} className={className} />
}

export function FuncionandoDe({ v, className }: { v: VistaEfectividad; className?: string }) {
  const [abierto, setAbierto] = useState(false)
  const meta = v.meta
  const fuera = v.cumple.noPlaneado === false
  const tramos = v.porTramo.filter(t => (t.antesDia?.entero ?? 0) > 0 || t.ahoraDia.entero > 0)
  return (
    <section aria-label="¿Está funcionando?" data-funcionando="" data-ganado={v.ganado.bbl?.entero ?? ''} data-meta={meta ? meta.noPlaneadoDia.entero : 'sin-meta'}
      className={cn('min-w-0 rounded-[10px] bg-[var(--panel)] p-4 sm:px-6 sm:py-5', className)}>
      <header className="flex flex-wrap items-center gap-x-1.5">
        <h2 className="text-[16px] font-semibold text-[var(--tinta)]">¿Está funcionando?</h2>
        <span className="text-[14px] text-[var(--tinta2)]">· lo no planeado, por día</span>
        <Info titulo="¿Está funcionando?" texto={[v.frase, ...v.notas, v.base?.fuente].filter(Boolean).join(' ')} />
      </header>
      <div className="mt-3 grid grid-cols-1 gap-x-5 gap-y-3 min-[420px]:grid-cols-3">
        <Dato rotulo="Antes de TRIM" valor={v.antes.noPlaneadoDia?.entero ?? null} unidad="bbl/d"
          nota={v.base ? `${v.base.nombre}${v.antes.fallasMes !== null ? ` · ${plural(v.antes.fallasMes, 'falla', 'fallas')} al mes` : ''}` : 'sin base: faltan tres meses'} />
        <Dato rotulo="Este mes" valor={v.esteMes.noPlaneadoDia.entero} unidad="bbl/d" aviso={fuera}
          nota={<>{meta ? `meta ${n0(meta.noPlaneadoDia.entero)}${fuera ? ' · por encima' : ''}` : 'sin meta firmada'} · {plural(v.esteMes.fallas, 'falla', 'fallas')}</>} />
        <Dato rotulo="Ya se ganó" valor={v.ganado.bbl?.entero ?? null} unidad="bbl"
          nota={v.ganado.bbl
            ? `${v.ganado.bbl.entero >= 0 ? 'dejaron de diferirse' : 'se difirió de más'} desde el ${DESDE.format(v.desde)} · ${v.ganado.fallasAnticipadas} de ${v.ganado.juzgadas} avisos acertaron`
            : 'sin base con qué comparar'} />
      </div>
      {tramos.length > 0 && (
        <>
          <button type="button" aria-expanded={abierto} onClick={() => setAbierto(x => !x)} data-funcionando-tramos=""
            className="no-imprimir mt-3 inline-flex min-h-11 cursor-pointer items-center gap-1 text-[15px] font-semibold text-[var(--tinta)] hover:underline sm:min-h-9">
            Por tramo <ChevronRight aria-hidden className={cn('size-4 text-[var(--tinta2)] transition-transform', abierto && 'rotate-90')} />
          </button>
          <table className={cn('mt-1 w-full border-collapse text-[14px]', !abierto && 'hidden print:table')}>
            <caption className="sr-only">Lo no planeado por día de cada tramo: antes de TRIM, este mes, su meta y lo ganado</caption>
            <thead>
              <tr className="text-[13px] text-[var(--tinta2)]">
                <th scope="col" className="pb-1 text-left font-medium">Tramo</th>
                <th scope="col" className="pb-1 text-right font-medium">Antes</th>
                <th scope="col" className="pb-1 text-right font-medium">Este mes</th>
                <th scope="col" className="pb-1 text-right font-medium">Ganado</th>
              </tr>
            </thead>
            <tbody>
              {tramos.map(t => (
                <tr key={t.tramo} data-funcionando-tramo={t.tramo} className="border-t border-[var(--linea2)]">
                  <th scope="row" className="py-1.5 text-left font-semibold text-[var(--tinta)]">{t.nombre}</th>
                  <td className="text-right tabular-nums">{t.antesDia ? n0(t.antesDia.entero) : '—'}</td>
                  <td className="text-right tabular-nums">{n0(t.ahoraDia.entero)}{t.metaDia ? <small className="block text-[12px] text-[var(--tinta2)]">meta {n0(t.metaDia.entero)}</small> : null}</td>
                  <td className="text-right tabular-nums">{t.ganadoBbl ? `${n0(t.ganadoBbl.entero)} bbl` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  )
}
