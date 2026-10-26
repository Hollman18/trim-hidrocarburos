import type { Frase } from '@/shared/api/hoy'
import type { CondicionFranja } from '@/shared/api/condiciones'
import { MarcaCondicion, type Condicion } from '@/shared/ui/Prioridad'
import { cn } from '@/shared/lib/cn'
import { PALABRA } from './palabras'

/** Un tag de equipo o de pozo («P-201B», «LC-21», «K-101»): va en Air Condensed (X5 §3.4). */
const ES_TAG = /^[A-Z]{1,4}-\d/

/** Una frase del motor: lo que él marcó va en negrita (la pantalla no decide qué resaltar). */
export function Texto({ f, className }: { f?: Frase; className?: string }) {
  if (!f?.length) return null
  return (
    <span className={className}>
      {f.map((x, i) => typeof x === 'string'
        ? <span key={i}>{x}</span>
        : <b key={i} className={cn('font-semibold text-[var(--tinta)]', ES_TAG.test(x.b) && 'font-cond font-bold tracking-[.02em]')}>{x.b}</b>)}
    </span>
  )
}

const MARCA: Record<CondicionFranja, Condicion> = {
  interlock: 'interlock', alarma: 'alarma', atencion: 'atencion', aviso: 'aviso', 'sin-comunicacion': 'sin-comunicacion',
}

/** La marca del EQUIPO (no de la tarea), con su palabra: «◆ Alarma ·». Sin condición, nada. */
export function MarcaDeEquipo({ c, tamano = 16, conPalabra = true }: { c?: CondicionFranja; tamano?: number; conPalabra?: boolean }) {
  if (!c) return null
  return (
    <span className="inline-flex shrink-0 items-center gap-2">
      <MarcaCondicion c={MARCA[c]} tamano={tamano} decorativa={conPalabra} />
      {conPalabra && <span>{' '}{PALABRA[c]} ·</span>}
    </span>
  )
}

/** El ⊘ del bloqueo de procedimiento, en tinta (X5 §3.3): nunca en color. */
export const Prohibido = ({ tamano = 22 }: { tamano?: number }) => <MarcaCondicion c="bloqueo" tamano={tamano} decorativa />

