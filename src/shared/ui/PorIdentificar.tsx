import type { PorIdentificar } from '@/shared/api/diferidos'
import { MarcaPrioridad } from './Prioridad'
import { cn } from '@/shared/lib/cn'

/** Debajo de la cifra «por identificar» (`contarPorIdentificar`): cuántas
 *  siguen paradas y cuántas ya arrancaron sin identificar (■ 3: no
 *  conformidad). Las mismas palabras en Turno, Mi trabajo y Mantenimiento.
 *  Un tramo en 0 no se escribe. La ▲ 2 de la cifra (alguna sin arrancar: «no
 *  arrancar») la pone la pantalla. */
export function ApoyoPorIdentificar({ pi, className }: { pi: PorIdentificar; className?: string }) {
  const arrancaron = pi.arrancaronSinIdentificar, sinArrancar = pi.porIdentificar - arrancaron
  if (!sinArrancar && !arrancaron) return null
  return (
    <small className={cn('flex flex-wrap items-center gap-x-1 text-[10.5px] text-[var(--tinta2)]', className)}>
      {sinArrancar > 0 && <span>{sinArrancar} sin arrancar{arrancaron > 0 ? ' ·' : ''}</span>}
      {arrancaron > 0 && <span className="inline-flex items-center gap-1"><MarcaPrioridad s={3} tamano={11} />{arrancaron} {arrancaron === 1 ? 'arrancó' : 'arrancaron'} sin identificar</span>}
    </small>
  )
}
