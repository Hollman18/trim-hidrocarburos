import type { PorIdentificar } from '@/shared/api/diferidos'
import { cn } from '@/shared/lib/cn'

/** Debajo de la cifra «por identificar» (`contarPorIdentificar`): cuántas
 *  siguen paradas y cuántas ya arrancaron sin identificar (no conformidad).
 *  Las mismas palabras en Turno, Mi trabajo y Mantenimiento. Un tramo en 0 no
 *  se escribe. Es un total: no lleva marca de prioridad (B-40); la lleva cada
 *  equipo en su renglón («arrancó sin identificar»). */
export function ApoyoPorIdentificar({ pi, className }: { pi: PorIdentificar; className?: string }) {
  const arrancaron = pi.arrancaronSinIdentificar, sinArrancar = pi.porIdentificar - arrancaron
  if (!sinArrancar && !arrancaron) return null
  return (
    <small className={cn('flex flex-wrap items-center gap-x-1 text-[10.5px] text-[var(--tinta2)]', className)}>
      {sinArrancar > 0 && <span>{sinArrancar} sin arrancar{arrancaron > 0 ? ' ·' : ''}</span>}
      {arrancaron > 0 && <span>{arrancaron} {arrancaron === 1 ? 'arrancó' : 'arrancaron'} sin identificar</span>}
    </small>
  )
}
