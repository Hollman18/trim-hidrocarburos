import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { InicioHoy, BloqueoHoy, HechaHoy } from '@/shared/api/hoy'
import { Boton } from '@/shared/ui/primitivas'
import { cn } from '@/shared/lib/cn'
import { Texto, Prohibido } from './comun'
import { resumenPlanes } from './palabras'
import { seDeshace, type Envio } from './envio'

/** La cifra con su frase (X5 §5.1, B): el previo, la cifra con su unidad en
 *  palabras, la frase y lo que la explica. Una sola por vista, nunca en color. */
export function Inicio({ i, onEntregar }: { i: InicioHoy; onEntregar?: () => void }) {
  const remate = i.remate ?? (i.unidad ? i.frase : undefined)
  return (
    <section aria-label={i.frase} data-inicio className="grid gap-x-6 gap-y-3 rounded-[20px] bg-[var(--panel)] px-5 pb-5 pt-4 sm:grid-cols-[1fr_auto] sm:items-end sm:px-7 sm:pb-[22px] sm:pt-5">
      <div className="min-w-0">
        {i.previo && <p className="text-[15px] font-medium text-[var(--tinta2)]">{i.previo}</p>}
        <p className="mt-1 flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
          <b className="tabular text-[48px] font-bold leading-[.95] tracking-[-.03em] sm:text-[60px]" data-cifra>{i.cifra}</b>
          {i.unidad && <span className="text-[22px] font-medium text-[var(--tinta2)]">{i.unidad}</span>}
        </p>
        {remate && <p className="mt-2.5 text-[19px] font-medium leading-snug sm:text-[21px]">{remate}</p>}
        {i.explica && <p className="mt-1.5 text-[17px] leading-normal text-[var(--tinta2)] sm:text-[18px]"><Texto f={i.explica} /></p>}
      </div>
      {onEntregar && <Boton onClick={onEntregar} className="min-h-12 px-6 text-[16px] max-sm:hidden">Entregar turno</Boton>}
    </section>
  )
}

/** La franja «No arrancar …» (X5 §5.6): en tinta, con borde de 2 px y el ⊘. Un
 *  bloqueo de procedimiento, no un color: el rojo queda para el interlock del PLC. */
export function Bloqueo({ b, grande = false }: { b: { texto: string; sub?: string; planes?: BloqueoHoy['planes'] }; grande?: boolean }) {
  return (
    <div role="note" data-bloqueo className={cn('flex items-start gap-3 rounded-[16px] bg-[var(--panel)] shadow-[inset_0_0_0_2px_var(--tinta)]', grande ? 'px-3.5 py-3' : 'px-4 py-[13px] sm:px-5')}>
      <span className="mt-0.5"><Prohibido tamano={22} /></span>
      <span className={cn('min-w-0 font-semibold leading-[1.35]', grande ? 'text-[18px]' : 'text-[16px]')}>
        {b.texto}
        {b.sub && <small className={cn('mt-0.5 block font-normal text-[var(--tinta2)]', grande ? 'text-[15px]' : 'text-[15px]')}>{b.sub}</small>}
        {b.planes?.length ? <small className="mt-1 block text-[14px] font-normal text-[var(--tinta2)]">{resumenPlanes(b.planes)}</small> : null}
      </span>
    </div>
  )
}

/** «Hecho hoy (n)», plegado al final (X4 §3.3, punto 5). */
export function Hechas({ hs }: { hs: readonly HechaHoy[] }) {
  const [abierto, setAbierto] = useState(false)
  if (!hs.length) return null
  return (
    <section data-hechas className="rounded-[20px] bg-[var(--panel)]">
      <button type="button" aria-expanded={abierto} onClick={() => setAbierto(v => !v)}
        className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 px-5 py-3 text-left text-[15px] font-medium text-[var(--tinta2)] sm:px-6">
        <span><b className="font-semibold text-[var(--tinta)]">Hecho hoy ({hs.length})</b> · {hs[0]!.detalle}</span>
        <ChevronDown aria-hidden className={cn('size-5 shrink-0 transition-transform duration-[120ms]', abierto && 'rotate-180')} />
      </button>
      {abierto && (
        <ul className="grid gap-0 px-5 pb-3 sm:px-6">
          {hs.map(h => <li key={h.id} className="border-t border-[var(--linea2)] py-2 text-[15px]"><b className="font-semibold">{h.titulo}</b> <span className="text-[var(--tinta2)]">· {h.detalle}</span></li>)}
        </ul>
      )}
    </section>
  )
}

/** El aviso oscuro de abajo con «Deshacer» (X5 §5.7), y el error de una escritura. */
export function AvisoDeshacer({ envio }: { envio: Envio }) {
  const h = envio.aviso
  if (!h && !envio.error) return null
  return (
    <div className="no-imprimir pointer-events-none fixed inset-x-4 bottom-6 z-[130] flex justify-center sm:inset-x-auto sm:right-8 sm:w-[440px]">
      <div role="status" data-aviso-hoy
        className="pointer-events-auto flex w-full items-center justify-between gap-3 rounded-[16px] bg-[#15171a] px-4 py-3 text-[15px] font-medium leading-snug text-white shadow-[var(--sombra-flota)]">
        <span className="min-w-0">{envio.error ? `No se guardó: ${envio.error}` : h!.texto}</span>
        {envio.error
          ? <button type="button" onClick={envio.limpiarError} className="min-h-10 shrink-0 cursor-pointer px-1 font-bold text-[#c9d1f0]">Cerrar</button>
          : h && seDeshace(h) && <button type="button" onClick={() => void envio.deshacer()} className="min-h-10 shrink-0 cursor-pointer px-1 font-bold text-[#c9d1f0]">Deshacer</button>}
      </div>
    </div>
  )
}
