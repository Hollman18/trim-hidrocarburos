import { useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { useBalance, EXPLICA_BALANCE, type ConsultaBalance, type TramoDelBalance, type VistaBalance } from '@/shared/api/balance'
import { Dato } from './Dato'
import { Info } from '@/shared/ui/Info'
import { n0 } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Traza } from './Traza'

/** EL BALANCE DEL CHOKE (CONSTRUCCION.md, «Lo que el dueño volvió a pedir»; necesario-por-rol §0b).
 *
 *  Producido · diferido · perdido del período, y por tramo (yacimiento, pozos, planta,
 *  salida y lo sin identificar) dónde quedó el diferido y dónde se perdió. El diferido y
 *  el perdido van lado a lado y NUNCA sumados; sin registro de pérdidas dice «sin
 *  registro», nunca 0. Un tramo abre su trazabilidad (`Traza`): diferida → planeada →
 *  N1 → N2 → la parada con quién dijo qué y cuándo; pérdida → tipo → el registro.
 *
 *  El motor calcula (`useBalance`, `GET /api/vistas/balance`) y aquí se pinta: los enteros
 *  que vienen, sin sumar nada. Lo usan ger, prod y reg (y quien lo necesite: B3). */
/** Lo que la pantalla agrega a la cifra del diferido (el gerente: su valor y el máximo firmado). */
export interface ExtraDiferido { nota: ReactNode; fuera?: boolean }

export function Balance({ q, className, titulo = 'Producido · diferido · perdido', diferido }: {
  q: ConsultaBalance; className?: string; titulo?: string; diferido?: ExtraDiferido
}) {
  const v = useBalance(q)
  // Otro período u otros campos: la trazabilidad abierta era de los de antes, se cierra.
  return <BalanceDe key={`${v.campos.join(',')}|${v.desde.getTime()}|${v.hasta.getTime()}`} v={v} titulo={titulo} className={className} diferido={diferido} />
}

export function BalanceDe({ v, titulo, className, diferido }: { v: VistaBalance; titulo: string; className?: string; diferido?: ExtraDiferido }) {
  const [abierto, setAbierto] = useState<TramoDelBalance['tramo'] | null>(null)
  const t = v.total
  // Los tramos del choke siempre (los 4); lo sin identificar, solo si tiene barriles.
  const filas = t.porTramo.filter(x => x.tramo !== 'sin-asignar' || x.diferido.entero > 0)
  return (
    <section aria-label={`${titulo} · ${v.periodo}`} data-balance={v.campos.join(',')} data-producido={t.producido?.entero ?? ''} data-diferido={t.diferido.entero}
      data-perdido={t.perdido?.entero ?? 'sin-registro'} className={cn('min-w-0 rounded-[10px] bg-[var(--panel)] p-4 sm:px-6 sm:py-5', className)}>
      <header className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        <h2 className="text-[16px] font-semibold text-[var(--tinta)]">{titulo}</h2>
        <span className="text-[14px] text-[var(--tinta2)]">· {v.periodo}</span>
        <Info titulo="Producido, diferido y perdido" texto={EXPLICA_BALANCE} />
      </header>
      <div className="mt-3 grid grid-cols-3 gap-x-4 gap-y-3">
        <Dato rotulo="Producido" valor={t.producido?.entero ?? null} unidad="bbl" nota={t.producido ? 'medido' : 'sin dato fiscal'} />
        <Dato rotulo="Diferido" valor={t.diferido.entero} unidad="bbl" nota={diferido?.nota ?? 'se produce después'} aviso={diferido?.fuera} />
        <Dato rotulo="Perdido" valor={t.perdido?.entero ?? null} unidad="bbl" nota={t.perdido ? 'no se vende' : 'sin registro'} />
      </div>
      <table className="mt-4 w-full border-collapse text-[15px]" data-balance-tramos="">
        <caption className="sr-only">Por tramo: el diferido y el perdido, lado a lado</caption>
        <thead>
          <tr className="text-left text-[13px] text-[var(--tinta2)]">
            <th scope="col" className="pb-1 font-medium">Tramo</th>
            <th scope="col" className="pb-1 text-right font-medium">Diferido</th>
            <th scope="col" className="pb-1 text-right font-medium">Perdido</th>
            <th aria-hidden className="w-6" />
          </tr>
        </thead>
        <tbody>
          {filas.map(f => (
            <tr key={f.tramo} data-tramo-balance={f.tramo} className="border-t border-[var(--linea2)]">
              <th scope="row" className="p-0 text-left font-normal">
                <button type="button" onClick={() => setAbierto(f.tramo)} aria-label={`${f.nombre}: diferido ${n0(f.diferido.entero)} bbl, perdido ${f.perdido ? `${n0(f.perdido.entero)} bbl` : 'sin registro'}. Ver las causas`}
                  className="flex min-h-11 w-full cursor-pointer items-center text-left font-semibold text-[var(--tinta)] hover:underline">
                  {f.nombre}
                </button>
              </th>
              <td className="text-right tabular-nums font-semibold text-[var(--tinta)]">{n0(f.diferido.entero)}<small className="ml-1 text-[13px] font-normal text-[var(--tinta2)]">bbl</small></td>
              <td className="text-right tabular-nums text-[var(--tinta2)]">{f.perdido ? <b className="font-semibold text-[var(--tinta)]">{n0(f.perdido.entero)}<small className="ml-1 text-[13px] font-normal text-[var(--tinta2)]">bbl</small></b> : '—'}</td>
              <td className="text-right"><ChevronRight aria-hidden className="ml-auto size-4 text-[var(--tinta3)]" /></td>
            </tr>
          ))}
        </tbody>
      </table>
      {(t.sinExplicar >= 0.5 || t.sinFiscal.length > 0) && (
        <p className="mt-2 text-[13px] text-[var(--tinta2)]">
          {t.sinExplicar >= 0.5 && <>Sin explicar con una parada: {n0(t.sinExplicar)} bbl. </>}
          {t.sinFiscal.length > 0 && <>{t.sinFiscal.length} {t.sinFiscal.length === 1 ? 'día' : 'días'} sin dato fiscal.</>}
        </p>
      )}
      {abierto && <Traza v={v} tramo={abierto} onCerrar={() => setAbierto(null)} />}
    </section>
  )
}
