import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { InicioHoy, HechaHoy } from '@/shared/api/hoy'
import { Boton, Enlace } from '@/shared/ui/primitivas'
import { Info } from '@/shared/ui/Info'
import { cn } from '@/shared/lib/cn'
import { Texto, Prohibido } from './comun'
import { seDeshace, type Envio } from './envio'

/** La cifra con su frase (X5 §5.1, B): el previo, la cifra con su unidad en
 *  palabras, la frase y lo que la explica. Una sola por vista, nunca en color.
 *  En el teléfono, el remate corto de la imagen 3b (I-sup-1); lo que explica la
 *  unidad, en su ⓘ (I-jefe-1). La cifra y su frase se anuncian juntas. */
export function Inicio({ i, onEntregar, entregaAbierta }: { i: InicioHoy; onEntregar?: () => void; entregaAbierta?: boolean }) {
  const remate = i.remate ?? (i.unidad && !i.explica ? i.frase : undefined)
  return (
    <section aria-label={i.frase} data-inicio className="grid gap-x-6 gap-y-3 rounded-[10px] bg-[var(--panel)] px-5 pb-5 pt-4 sm:grid-cols-[1fr_auto] sm:items-end sm:px-7 sm:pb-[22px] sm:pt-5">
      <div className="min-w-0">
        {i.previo && <p className="text-[15px] font-medium text-[var(--tinta2)]">{i.previo}</p>}
        <p className="mt-1 flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
          <b className="tabular text-[48px] font-bold leading-[.95] tracking-[-.03em] sm:text-[60px]" data-cifra>{i.cifra}</b>
          {i.unidad && <span className="text-[22px] font-medium text-[var(--tinta2)]">{i.unidad}</span>}
          {i.ayuda && <Info titulo={i.unidad ?? 'La cifra'} texto={i.ayuda} />}
        </p>
        {remate && (
          <p className="mt-2.5 text-[19px] font-medium leading-snug sm:text-[21px]" data-remate>
            {i.remateCorto ? <><span className="max-sm:hidden">{remate}</span><span className="sm:hidden">{i.remateCorto}</span></> : remate}
          </p>
        )}
        {i.explica && <p className="mt-1.5 text-[17px] leading-normal text-[var(--tinta2)] sm:text-[18px]"><Texto f={i.explica} /></p>}
      </div>
      {onEntregar && <Boton onClick={onEntregar} aria-expanded={entregaAbierta} className="min-h-12 px-6 text-[16px] max-sm:hidden">Entregar turno</Boton>}
    </section>
  )
}

/** La franja «No arrancar …» (X5 §5.6): en tinta, con borde de 2 px y el ⊘. Un
 *  bloqueo de procedimiento, no un color: el rojo queda para el interlock del PLC.
 *  Nunca lleva lo simulado adentro (UI-20). `subEnInfo`: en el teléfono de quien no
 *  está frente al equipo, la salvedad va a la ⓘ, como la imagen 3b (I-sup-2). */
export function Bloqueo({ b, grande = false, subEnInfo = false }: { b: { texto: string; sub?: string; textoCorto?: string; subCorto?: string }; grande?: boolean; subEnInfo?: boolean }) {
  // K2 · El motor da la versión corta para quien no opera (jefe, conf): en el teléfono, el «no» y a quién; el resto, en la ⓘ.
  const corto = subEnInfo && b.textoCorto
  return (
    <div role="note" data-bloqueo className={cn('flex items-start gap-3 rounded-[10px] bg-[var(--panel)] shadow-[inset_0_0_0_2px_var(--tinta)]', grande ? 'px-3.5 py-3' : 'px-4 py-[13px] sm:px-5')}>
      <span className="mt-0.5"><Prohibido tamano={22} /></span>
      <span className={cn('min-w-0 font-semibold leading-[1.35]', grande ? 'text-[18px]' : 'text-[16px]')}>
        {corto ? <><span className="max-sm:hidden">{b.texto}</span><span className="sm:hidden">{b.textoCorto}</span></> : b.texto}
        {b.sub && subEnInfo && <span className="ml-1.5 sm:hidden"><Info titulo="No arrancar" texto={corto && b.subCorto ? b.subCorto : b.sub} /></span>}
        {b.sub && <small className={cn('mt-0.5 block text-[15px] font-normal text-[var(--tinta2)]', subEnInfo && 'max-sm:hidden')}>{b.sub}</small>}
      </span>
    </div>
  )
}

/** «Hecho hoy (n)», plegado al final (X4 §3.3, punto 5). Pasado el «Deshacer» de
 *  Hoy, dice dónde se corrige (A3): en Identificar, por inserción (D1). */
export function Hechas({ hs, onCorregir }: { hs: readonly HechaHoy[]; onCorregir?: () => void }) {
  const [abierto, setAbierto] = useState(false)
  if (!hs.length) return null
  return (
    <section data-hechas className="rounded-[10px] bg-[var(--panel)]">
      <button type="button" aria-expanded={abierto} onClick={() => setAbierto(v => !v)}
        className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 px-5 py-3 text-left text-[15px] font-medium text-[var(--tinta2)] sm:px-6">
        <span><b className="font-semibold text-[var(--tinta)]">Hecho hoy ({hs.length})</b> · {hs[0]!.detalle}</span>
        <ChevronDown aria-hidden className={cn('size-5 shrink-0 transition-transform duration-[120ms]', abierto && 'rotate-180')} />
      </button>
      {abierto && (
        <ul className="grid gap-0 px-5 pb-3 sm:px-6">
          {hs.map(h => <li key={h.id} className="border-t border-[var(--linea2)] py-2 text-[15px]"><b className="font-semibold">{h.titulo}</b> <span className="text-[var(--tinta2)]">· {h.detalle}</span></li>)}
          {onCorregir && (
            <li className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--linea2)] pt-2.5 text-[14px] text-[var(--tinta2)]">
              Para corregir algo de esto, una por una: nada se borra, queda con su motivo.
              <Enlace onClick={onCorregir}>Ver una por una</Enlace>
            </li>
          )}
        </ul>
      )}
    </section>
  )
}

/** El aviso de abajo con «Deshacer» (X5 §5.7), y el error de una escritura.
 *  A3 (WCAG 4.1.3): la región `status` está siempre montada y vacía, así el lector
 *  anuncia el texto cuando llega; «Deshacer» va al lado, fuera de ella, y el reloj se
 *  detiene mientras el aviso tiene el foco o el puntero encima. El error no se va solo.
 *  En papel, oscuro sobre claro; en noche, claro sobre oscuro (UI-09: `--aviso`). */
export function AvisoDeshacer({ envio }: { envio: Envio }) {
  const a = envio.aviso
  const visible = !!(a || envio.error)
  return (
    <div className="no-imprimir pointer-events-none fixed inset-x-4 bottom-6 z-[130] flex justify-center sm:inset-x-auto sm:right-8 sm:w-[440px]">
      <div data-aviso-hoy data-visible={visible || undefined}
        onPointerEnter={envio.pausar} onPointerLeave={envio.seguir} onFocus={envio.pausar} onBlur={envio.seguir}
        className={cn('flex w-full items-center justify-between gap-3 rounded-[16px] bg-[var(--aviso)] px-4 py-3 text-[15px] font-medium leading-snug text-[var(--aviso-sobre)] shadow-[var(--sombra-flota)]',
          visible ? 'pointer-events-auto' : 'opacity-0')}>
        {/* Montada siempre (también vacía): así el lector anuncia lo que entra. */}
        <span role="status" className="min-w-0">{!envio.error ? a?.h.texto ?? '' : ''}</span>
        {envio.error && <span role="alert" className="min-w-0">No se guardó: {envio.error.replace(/^No se guardó: /, '')}</span>}
        {envio.error
          ? <button type="button" onClick={envio.limpiarError} className="toque min-h-10 shrink-0 cursor-pointer px-1 font-bold text-[var(--aviso-accion)]">Cerrar</button>
          : a && a.fase === 'espera' && seDeshace(a.h) && <button type="button" onClick={() => void envio.deshacer()} className="toque min-h-10 shrink-0 cursor-pointer px-1 font-bold text-[var(--aviso-accion)]">Deshacer</button>}
      </div>
    </div>
  )
}
