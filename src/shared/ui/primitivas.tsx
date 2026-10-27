import type { ReactNode } from 'react'
import { ChevronRight, Upload } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import type { Severidad } from '@/entities/tipos'
import { MarcaPrioridad } from './Prioridad'

/* Las primitivas con la estructura de D1 (v3, decisión 5): el bloque en --panel,
   de radio 10, sin borde ni sombra, separado del papel por el tono; los botones
   rectos de radio 8 (el principal en el acento petróleo, el secundario con un aro
   fino); las filas de 56 a 64 px con «›». Lo que ya existía las hereda: Panel,
   Metrica, Chip y Boton son las mismas piezas con el aspecto nuevo. */

/** El bloque: `--panel` sobre `--suelo`, radio 10, sin borde ni sombra.
 *  Relleno de 16 en el teléfono y de 22 a 26 en el escritorio. */
export const Tarjeta = ({ children, className, as: Etiqueta = 'section', ...p }: {
  children: ReactNode; className?: string; as?: 'section' | 'div' | 'article'
} & Omit<React.HTMLAttributes<HTMLElement>, 'className' | 'children'>) => (
  <Etiqueta {...p} className={cn('min-w-0 rounded-[10px] bg-[var(--panel)] p-4 sm:px-[24px] sm:py-[20px]', className)}>
    {children}
  </Etiqueta>
)

/** Un panel con título: la tarjeta de B con su cabecera (el título a la
 *  izquierda; el alcance o la calidad a la derecha). El título, a 16 px
 *  Semibold en tinta (X5 §5.2; UI-04), como las tarjetas nuevas. */
export const Panel = ({ titulo, extra, children, className }: {
  titulo?: string; extra?: ReactNode; children: ReactNode; className?: string
}) => (
  <section className={cn('min-w-0 rounded-[10px] bg-[var(--panel)]', className)}>
    {titulo && (
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-4 pt-4 sm:px-[24px] sm:pt-[18px]">
        <h2 className="text-[16px] font-semibold leading-snug text-[var(--tinta)]">{titulo}</h2>
        {extra && <span className="text-[13px] text-[var(--tinta2)]">{extra}</span>}
      </header>
    )}
    <div className={cn('px-4 pb-4 sm:px-[24px] sm:pb-[20px]', titulo ? 'pt-3' : 'pt-4 sm:pt-[20px]')}>{children}</div>
  </section>
)

/** Una cifra secundaria con su unidad chica (20 a 26 px, X5 §3.4). */
export const Metrica = ({ titulo, valor, unidad, pie, children }: {
  titulo: string; valor: string; unidad?: string; pie?: ReactNode
  children?: ReactNode
}) => (
  <Panel titulo={titulo}>
    <div className="flex items-baseline gap-1.5 text-[26px] font-bold leading-none tracking-[-.01em] tabular">
      {valor}
      {unidad && <span className="text-[15px] font-normal tracking-normal text-[var(--tinta2)]">{unidad}</span>}
      {children}
    </div>
    {pie && <p className="mt-1.5 text-[14px] text-[var(--tinta2)]">{pie}</p>}
  </Panel>
)

/** La etiqueta de prioridad: el color va en el fondo y en la forma; el texto,
 *  en tinta. Escrito en amarillo sobre amarillo claro daba 1,7:1 y en salmón
 *  sobre el fondo oscuro, menos de 3:1: se leía la forma, no el texto. */
const ETIQUETA: Record<Severidad, { texto: string; clase: string }> = {
  0: { texto: 'Normal', clase: 'bg-[var(--panel2)] text-[var(--tinta2)]' },
  1: { texto: 'P1 · alarma', clase: 'bg-[var(--p1-f)]' },
  2: { texto: 'P2 · atención', clase: 'bg-[var(--p2-f)]' },
  3: { texto: 'P3 · aviso', clase: 'bg-[var(--p3-f)]' },
}
export const Severidad_ = ({ s }: { s: Severidad }) => (
  <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-px text-[12px] font-semibold tracking-[.02em] text-[var(--tinta)]', ETIQUETA[s].clase)}>
    {s > 0 && <MarcaPrioridad s={s} tamano={12} decorativa />}{ETIQUETA[s].texto}
  </span>
)

/** ISA-101: una etiqueta no lleva color de alarma porque no es una alarma.
 *  «fuerte» distingue sin alarmar: tinta con su aro; «neutro», gris. */
export const Chip = ({ children, tono = 'neutro' }: { children: ReactNode; tono?: 'neutro' | 'fuerte' }) => (
  <span className={cn('inline-flex items-center rounded-full px-2 py-px text-[12px] font-semibold tracking-[.02em]',
    tono === 'fuerte' && 'bg-[var(--panel)] text-[var(--tinta)] shadow-[inset_0_0_0_1.5px_var(--tinta2)]',
    tono === 'neutro' && 'bg-[var(--panel2)] text-[var(--tinta2)] shadow-[inset_0_0_0_1px_var(--linea)]')}>
    {children}
  </span>
)

/** La calidad del dato en su chip discontinuo: «simulado», «proyectado» (X5 §5.2). */
export const Calidad = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex items-center whitespace-nowrap rounded-full border-[1.5px] border-dashed border-[var(--tinta3)] px-2.5 text-[14px] font-medium leading-[1.4] text-[var(--tinta2)]">
    {children}
  </span>
)

/** Los botones, rectos de radio 8 (D1). El principal va en el acento
 *  (`--primario`): la mano, nunca un dato. El secundario lleva un aro fino. Nunca más de dos
 *  juntos (X5 §5.1). */
export const Boton = ({ children, variante = 'normal', className, ...p }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variante?: 'normal' | 'principal' | 'chico' }) => (
  // Un botón es una acción: en el papel no hace nada, así que no se imprime.
  <button {...p} className={cn(
    // `toque`: en el teléfono, 44 × 44 px de blanco aunque se vea más chico (A5).
    'toque no-imprimir inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-[8px] font-semibold transition-colors duration-[120ms] disabled:cursor-not-allowed disabled:opacity-45',
    variante === 'chico' ? 'min-h-8 px-3.5 py-1 text-[14px]' : 'min-h-10 px-[18px] py-2 text-[15px]',
    variante === 'principal'
      ? 'bg-[var(--primario)] text-[var(--primario-sobre)] hover:opacity-90'
      : 'bg-[var(--panel)] text-[var(--tinta)] shadow-[inset_0_0_0_1.5px_var(--linea)] hover:bg-[var(--panel2)]',
    className)}>
    {children}
  </button>
)

/** Un enlace de B: la palabra en Semibold y «›» (X5 §5.1: «Ver el plan ›»). */
export const Enlace = ({ children, className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button {...p} className={cn('toque no-imprimir inline-flex cursor-pointer items-center gap-0.5 whitespace-nowrap text-[15px] font-semibold text-[var(--tinta)] hover:underline', className)}>
    {children}<ChevronRight aria-hidden className="size-4 text-[var(--tinta2)]" />
  </button>
)

/** La fila de B: de 56 a 64 px, separada por `--linea2`, con «›» cuando abre
 *  algo (X5 §5.2). Toda la fila es el blanco del toque. */
export const Fila = ({ children, onClick, className, etiqueta }: {
  children: ReactNode; onClick?: () => void; className?: string; etiqueta?: string
}) => {
  const clase = cn('flex min-h-14 w-full items-center gap-3 border-t border-[var(--linea2)] py-2.5 text-left first:border-t-0', className)
  if (!onClick) return <div className={clase}>{children}</div>
  return (
    <button type="button" onClick={onClick} aria-label={etiqueta}
      className={cn(clase, 'cursor-pointer rounded-none hover:bg-[var(--panel2)]/60')}>
      <span className="min-w-0 flex-1">{children}</span>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-[var(--tinta3)]" />
    </button>
  )
}

export const Cita = ({ children }: { children: ReactNode }) => (
  <p className="my-2 border-l-2 border-[var(--linea)] py-[3px] pl-3 text-[14px] text-[var(--tinta2)]">{children}</p>
)

/** Un hueco: lo que falta o no aplica, con su frase (X5 §5.10). */
export const Hueco = ({ children }: { children: ReactNode }) => (
  <div className="rounded-[10px] border-[1.5px] border-dashed border-[var(--linea)] bg-[var(--panel2)] px-4 py-3 text-[14px] text-[var(--tinta2)]">
    {children}
  </div>
)

/** «Subir un CSV»: el <input type=file> va escondido (sr-only) y lo que se ve
 *  es su etiqueta, así que el anillo de foco va en la etiqueta: el del input,
 *  de 1 px y recortado, no se veía (WCAG 2.4.7). Si el navegador no puede leer
 *  el archivo (se movió, una carpeta de red, permiso negado) se dice: la
 *  promesa no queda rechazada en la consola con la pantalla igual. */
export const SubirCsv = ({ onTexto, onError }: { onTexto: (texto: string) => void; onError: (mensaje: string) => void }) => (
  <label className="no-imprimir inline-flex min-h-10 cursor-pointer items-center rounded-[8px] bg-[var(--panel)] px-[18px] py-2 text-[15px] font-semibold shadow-[inset_0_0_0_1.5px_var(--linea)] hover:bg-[var(--panel2)] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--foco)]">
    <Upload className="mr-1.5 inline size-4" />Subir un CSV
    <input type="file" accept=".csv,.txt,text/csv" className="sr-only"
      onChange={async e => {
        const entrada = e.target, f = entrada.files?.[0]
        if (!f) return
        try { onTexto(await f.text()) }
        catch (err) { onError(`No se pudo leer «${f.name}»: ${err instanceof Error ? err.message : String(err)}. Vuelva a escogerlo o pegue las filas.`) }
        finally { entrada.value = '' }
      }} />
  </label>
)
