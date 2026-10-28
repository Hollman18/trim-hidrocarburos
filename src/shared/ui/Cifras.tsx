import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { Info } from './Info'

/* LAS PIEZAS DE UN DETALLE «TIPO NÚMERO» (el dueño, 28-oct: «poco texto, números, y que el texto que
 * esté sea para entender»). Todos los modales leen igual: un bloque por pregunta (ahora · cuánto ha
 * costado · por qué · qué sigue), con un rótulo corto arriba y la cifra primero, grande, con su unidad
 * chica. El porqué va en la ⓘ, no en una frase debajo. */

/** Un bloque del detalle: el rótulo corto (1 a 3 palabras), lo que se ve a la derecha del rótulo
 *  (un resumen en una línea) y su ⓘ. Separado del anterior por una línea, salvo `sinLinea`. */
export function Bloque({ titulo, derecha, info, children, className, sinLinea = false, ...p }: {
  titulo: string; derecha?: ReactNode; info?: string; children?: ReactNode; className?: string; sinLinea?: boolean
} & Omit<React.HTMLAttributes<HTMLElement>, 'className' | 'children'>) {
  return (
    <section {...p} aria-label={titulo} className={cn('min-w-0', !sinLinea && 'border-t border-[var(--linea2)] pt-3', className)}>
      <header className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        {/* En frase, no en MAYÚSCULAS (D-3): el texto que se lee y el que se copia es el mismo. */}
        <h3 className="flex items-center gap-1 text-[14px] font-semibold text-[var(--tinta2)]">
          {titulo}{info && <Info titulo={titulo} texto={info} />}
        </h3>
        {derecha && <span className="tabular text-[14px] text-[var(--tinta2)]">{derecha}</span>}
      </header>
      {children}
    </section>
  )
}

/** Las cifras de un bloque, en fila: se acomodan solas al ancho (dos o tres en el escritorio, una o dos en el teléfono). */
export function Cifras({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-x-6 gap-y-3', className)}>{children}</div>
}

/** Una cifra: el valor grande con su unidad chica, lo que es (el rótulo) y, si hace falta, un pie en gris.
 *  `grande` es la cifra principal del detalle: una sola por modal. */
export function Cifra({ valor, unidad, rotulo, pie, grande = false, className }: {
  valor: ReactNode; unidad?: string; rotulo: ReactNode; pie?: ReactNode; grande?: boolean; className?: string
}) {
  return (
    <div className={cn('min-w-0', className)} data-cifra-detalle="">
      <b className={cn('tabular block font-semibold leading-[1.1] text-[var(--tinta)]', grande ? 'text-[34px] tracking-[-.01em]' : 'text-[24px]')}>
        {/* Un espacio de verdad, no un margen: al copiar o al oírlo dice «1.665 bbl/d», no «1.665bbl/d». */}
        {valor}{unidad && <> <small className="text-[14px] font-normal tracking-normal text-[var(--tinta2)]">{unidad}</small></>}
      </b>
      <span className="mt-0.5 block text-[14px] leading-snug text-[var(--tinta)]">{rotulo}</span>
      {pie && <small className="block text-[13px] leading-snug text-[var(--tinta2)]">{pie}</small>}
    </div>
  )
}

/** Cómo se reparte un total, dibujado: una barra con un tramo por parte (en grises de tinta, no en
 *  colores de estado: no es una alarma) y debajo cada parte con su porcentaje. */
export function Reparto({ partes, className }: { partes: Array<{ nombre: string; pct: number }>; className?: string }) {
  const tonos = ['var(--tinta)', 'var(--tinta3)', 'var(--linea)', 'var(--linea2)']
  return (
    <div className={cn('min-w-0', className)} data-reparto="">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-[var(--panel2)]" aria-hidden>
        {partes.map((x, i) => <span key={x.nombre} style={{ width: `${x.pct}%`, background: tonos[Math.min(i, tonos.length - 1)] }} />)}
      </div>
      <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[14px]">
        {partes.map((x, i) => (
          <li key={x.nombre} className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block size-2.5 rounded-[2px]" style={{ background: tonos[Math.min(i, tonos.length - 1)] }} />
            <span>{x.nombre} <b className="tabular font-semibold">{x.pct} %</b></span>
          </li>
        ))}
      </ul>
    </div>
  )
}
