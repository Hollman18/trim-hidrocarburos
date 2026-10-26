import type { CodigoMotivo, Libro } from '@/entities/libro'
import { campoPorId } from '@/entities/campos'
import { Chip } from '@/shared/ui/primitivas'
import { FueraDeMeta } from '@/shared/ui/Prioridad'
import { Tip } from '@/shared/ui/Tip'
import { cn } from '@/shared/lib/cn'
import { publicacion } from './publicacion'

const TITULO = { publicable: 'Se puede publicar', provisional: 'Provisional', bloqueado: 'Todavía no se puede publicar' } as const

/** Cada motivo que impide publicar, en corto: sale del código del motivo,
 *  nunca de su frase (la frase la redacta el servidor y va al globo). */
const CORTO: Record<Exclude<CodigoMotivo, 'en-curso'>, string> = {
  'fa-fuera-de-banda': 'factor fuera de banda', 'sin-causa': 'mucho sin identificar', 'sin-fiscal': 'faltan días de fiscal',
  'sin-factor': 'sin factor de asignación', 'banda-sin-verificar': 'banda sin verificar', 'sin-meta': 'sin meta firmada',
}

/** Si el libro se puede publicar, como sello: la etiqueta a la vista y la
 *  frase en el globo. Es una salvedad, no una alarma: el mes en curso va en
 *  neutro (ISA-101) y solo lo que de verdad impide publicar lleva el cuadrado.
 *
 *  Bloqueado, el porqué también se ve: una línea corta por motivo («El Palmar
 *  · factor fuera de banda»), que es lo que hace falta para actuar. En el papel
 *  sale la frase entera (el informe es la pantalla impresa y no tiene globos),
 *  así que la línea corta no se imprime. */
export function SelloPublicacion({ lb, className }: { lb: Libro; className?: string }) {
  const pub = publicacion(lb)
  // Un campo con varios meses fuera de banda es un solo motivo a la vista; el globo los dice todos.
  const motivos = pub.estado !== 'bloqueado' ? [] : [...new Set(lb.motivos.flatMap(m =>
    m.codigo === 'en-curso' ? [] : [`${m.campoId ? `${campoPorId(m.campoId).nombre} · ` : ''}${CORTO[m.codigo]}`]))]
  return (
    <Tip titulo={TITULO[pub.estado]} pista={pub.texto} filas={[]} data-sello={pub.estado}
      imprimir={pub.estado === 'bloqueado' ? 'pista' : undefined} claseImpresion="basis-full"
      // En el teléfono, un blanco de toque de 24 px (WCAG 2.5.8), como el ⓘ.
      className={cn('inline-flex min-h-6 flex-wrap items-center justify-end gap-x-1.5 gap-y-0.5 sm:min-h-0', className)}>
      {pub.estado === 'publicable' ? <Chip>✓ PUBLICABLE</Chip>
        : pub.estado === 'provisional' ? <Chip>PROVISIONAL</Chip>
          : <><FueraDeMeta si tamano={11} /><Chip tono="fuerte">NO PUBLICABLE</Chip></>}
      {motivos.length > 0 && (
        <span className="no-imprimir basis-full text-right text-[13px] leading-snug text-[var(--tinta2)]">
          {motivos.map(m => <span key={m} className="block">{m}</span>)}
        </span>
      )}
    </Tip>
  )
}
