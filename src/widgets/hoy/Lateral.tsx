import type { CampoAhoraHoy, WhatsappHoy } from '@/shared/api/hoy'
import { n0 } from '@/shared/lib/formato'
import { Enlace } from '@/shared/ui/primitivas'
import { cn } from '@/shared/lib/cn'
import { Texto } from './comun'
import { MiniTuberia as MiniTuberiaPlanta } from '@/widgets/plantaviva/Tuberia'
import { useIr } from './palabras'

type Tramo = CampoAhoraHoy['tramos'][number]

/** La tubería en chico (X5 §5.3, «por fila»): la MISMA de La planta viva
 *  (`widgets/plantaviva/Tuberia.tsx`, H27), que guarda su proporción en vez de
 *  estirarse a lo ancho. Tres tramos —pozos, planta, salida—; el que se trabó se
 *  angosta y su hueco va rayado. Gris siempre: la marca va en el equipo. */
export function MiniTuberia({ tramos, className, etiqueta }: { tramos: readonly Pick<Tramo, 'choke' | 'trabado'>[]; className?: string; etiqueta: string }) {
  const trabado = tramos.find(t => t.trabado)?.choke ?? null
  return (
    <div role="img" aria-label={etiqueta} data-mini-hoy className={cn('block', className)}>
      <MiniTuberiaPlanta tramo={trabado} momento="durante" />
    </div>
  )
}

const tarjeta = 'rounded-[20px] bg-[var(--panel)] px-5 py-4'
const cabeza = 'flex items-baseline justify-between gap-3 text-[15px] font-semibold'

/** «Su campo, ahora»: la tubería en chico, lo que no pasa y el agua (imagen 3a). */
export function SuCampo({ c }: { c: CampoAhoraHoy }) {
  const ir = useIr()
  return (
    <section className={tarjeta} data-su-campo aria-label="Su campo, ahora">
      <h2 className={cabeza}>Su campo, ahora <span className="text-[13px] font-normal text-[var(--tinta2)]">La planta viva</span></h2>
      <MiniTuberia tramos={c.tramos} className="mt-3.5" etiqueta={c.frases.map(f => f.map(x => (typeof x === 'string' ? x : x.b)).join('')).join(' ')} />
      <div className="mt-1 grid grid-cols-3 text-[13px] text-[var(--tinta2)]">
        {c.tramos.map(t => <span key={t.choke} className={cn(t.trabado && 'font-bold text-[var(--tinta)]')}>{t.rotulo}</span>)}
      </div>
      <div className="mt-2.5 grid gap-1.5 text-[15px] leading-snug text-[var(--tinta2)]">
        {c.frases.map((f, i) => <p key={i}><Texto f={f} /></p>)}
      </div>
      <div className="mt-2.5"><Enlace onClick={() => ir({ a: 'planta' })}>Abrir La planta viva</Enlace></div>
    </section>
  )
}

/** «El turno en WhatsApp»: un hilo por parada u orden de las últimas 12 h. */
export function TurnoWhatsapp({ w }: { w: WhatsappHoy }) {
  return (
    <section className={tarjeta} data-whatsapp aria-label="El turno en WhatsApp">
      <h2 className={cabeza}>El turno en WhatsApp <span className="text-[13px] font-normal text-[var(--tinta2)]">{w.mensajes === 1 ? '1 mensaje' : `${w.mensajes} mensajes`}</span></h2>
      {w.hilos.length === 0 && <p className="mt-2 text-[14px] text-[var(--tinta2)]">TRIM no mandó nada en el turno.</p>}
      <div className="mt-1.5">
        {w.hilos.map(h => (
          <div key={`${h.equipo}${h.pasos}`} className="grid grid-cols-[auto_1fr] gap-x-2.5 border-t border-[var(--linea2)] py-2 text-[14px] leading-[1.4] text-[var(--tinta2)] first:border-t-0">
            <b className="font-cond text-[15px] font-bold tracking-[.02em] text-[var(--tinta)]">{h.equipo}</b>
            <span>{h.pasos}{h.estado && <> · <Texto f={h.estado} /></>}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

/** «Diferido de su turno», las últimas 12 h. */
export function DiferidoTurno({ horas, bbl }: { horas: number; bbl: number }) {
  return (
    <section className={tarjeta} data-diferido-turno aria-label="Diferido de su turno">
      <h2 className={cabeza}>Diferido de su turno <span className="text-[13px] font-normal text-[var(--tinta2)]">últimas {horas} h</span></h2>
      <p className="mt-1.5 flex items-baseline gap-2"><b className="tabular text-[24px] font-bold">{n0(bbl)}</b><span className="text-[14px] text-[var(--tinta2)]">barriles</span></p>
      <p className="mt-2.5 text-[14px] leading-[1.45] text-[var(--tinta2)]">«Entregar turno» abre la entrega del turno: lo que paró, lo que quedó pendiente y el WhatsApp del turno.</p>
    </section>
  )
}
