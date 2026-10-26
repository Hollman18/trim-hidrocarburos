import type { CampoAhoraHoy, WhatsappHoy } from '@/shared/api/hoy'
import { n0 } from '@/shared/lib/formato'
import { Enlace } from '@/shared/ui/primitivas'
import { cn } from '@/shared/lib/cn'
import { Texto } from './comun'
import { useIr } from './palabras'

type Tramo = CampoAhoraHoy['tramos'][number]

/** La tubería en chico (X5 §5.3, «por fila»): tres tramos —pozos, planta,
 *  salida—; el que se trabó se angosta y su hueco va rayado. Gris siempre: el
 *  dibujo no es una alarma (la marca va en el equipo). Es la de `tuberia.js`
 *  (`miniTuberia`) en React; cuando La planta viva (C2) entregue la suya, esta
 *  se puede cambiar por aquella. */
export function MiniTuberia({ tramos, className, etiqueta }: { tramos: readonly Pick<Tramo, 'choke' | 'trabado'>[]; className?: string; etiqueta: string }) {
  const ancho = 312, cy = 12, al = 20, nucleo = 8, L = ancho - 22
  const seg = [[0, .34], [.37, .71], [.74, 1]].map(([a, b]) => [a! * L, b! * L] as const)
  const id = `rayas-hoy-${tramos.map(t => (t.trabado ? 1 : 0)).join('')}`
  return (
    <svg viewBox={`0 0 ${ancho} 24`} role="img" aria-label={etiqueta} className={cn('block h-6 w-full', className)} preserveAspectRatio="none">
      <defs>
        <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--rayado)" strokeWidth="1.7" />
        </pattern>
      </defs>
      {seg.map(([a, b], i) => {
        const trabado = !!tramos[i]?.trabado, h = trabado ? nucleo + 6 : al
        return (
          <g key={i}>
            <rect x={a} y={cy - h / 2} width={b - a} height={h} rx={h / 2} fill="var(--tubo-vacio)" stroke="var(--pared)" strokeWidth={1.2} />
            {trabado && <>
              {[cy - al / 2, cy + al / 2 - 0.5].map(y => <line key={y} x1={a + 6} x2={b - 6} y1={y} y2={y} stroke="var(--pared)" strokeWidth={1} strokeDasharray="3 2.5" />)}
              <rect x={a + 8} y={cy - al / 2 + 1} width={b - a - 16} height={al / 2 - nucleo / 2 - 4} fill={`url(#${id})`} stroke="var(--rayado)" strokeWidth={0.9} />
            </>}
          </g>
        )
      })}
      <path d={`M3 ${cy - nucleo / 2} L${L + 4} ${cy - nucleo / 2} L${L + 4} ${cy - nucleo / 2 - 4} L${ancho} ${cy} L${L + 4} ${cy + nucleo / 2 + 4} L${L + 4} ${cy + nucleo / 2} L3 ${cy + nucleo / 2} Z`} fill="var(--flujo)" />
    </svg>
  )
}

const tarjeta = 'rounded-[20px] bg-[var(--panel)] px-5 py-4'
const cabeza = 'flex items-baseline justify-between gap-3 text-[15px] font-semibold'

/** «Su campo, ahora»: la tubería en chico, lo que no pasa y el agua (imagen 3a). */
export function SuCampo({ c }: { c: CampoAhoraHoy }) {
  const ir = useIr()
  return (
    <section className={tarjeta} data-su-campo aria-label="Su campo, ahora">
      <h3 className={cabeza}>Su campo, ahora <span className="text-[13px] font-normal text-[var(--tinta2)]">La planta viva</span></h3>
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
      <h3 className={cabeza}>El turno en WhatsApp <span className="text-[13px] font-normal text-[var(--tinta2)]">{w.mensajes === 1 ? '1 mensaje' : `${w.mensajes} mensajes`}</span></h3>
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
      <h3 className={cabeza}>Diferido de su turno <span className="text-[13px] font-normal text-[var(--tinta2)]">últimas {horas} h</span></h3>
      <p className="mt-1.5 flex items-baseline gap-2"><b className="tabular text-[24px] font-bold">{n0(bbl)}</b><span className="text-[14px] text-[var(--tinta2)]">barriles</span></p>
      <p className="mt-2.5 text-[14px] leading-[1.45] text-[var(--tinta2)]">«Entregar turno» abre la entrega del turno: lo que paró, lo que quedó pendiente y el WhatsApp del turno.</p>
    </section>
  )
}
