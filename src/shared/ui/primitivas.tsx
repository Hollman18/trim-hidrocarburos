import type { ReactNode } from 'react'
import { Upload } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import type { Severidad } from '@/entities/tipos'
import { MarcaPrioridad } from './Prioridad'

export const Panel = ({ titulo, extra, children, className }: {
  titulo?: string; extra?: ReactNode; children: ReactNode; className?: string
}) => (
  <section className={cn('rounded border border-[var(--linea)] bg-[var(--panel)] shadow-[var(--sombra)]', className)}>
    {titulo && (
      <header className="flex items-center justify-between gap-2 border-b border-[var(--linea2)] px-3 py-[7px]">
        <h2 className="font-cond text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]">{titulo}</h2>
        {extra && <span className="font-cond text-[10px] tracking-[.08em] text-[var(--tinta3)]">{extra}</span>}
      </header>
    )}
    <div className="p-3">{children}</div>
  </section>
)

export const Metrica = ({ titulo, valor, unidad, pie, children }: {
  titulo: string; valor: string; unidad?: string; pie?: ReactNode
  children?: ReactNode
}) => (
  <Panel titulo={titulo}>
    <div className="flex items-baseline gap-1 text-[27px] font-semibold leading-none tracking-[-.02em] tabular">
      {valor}
      {unidad && <span className="text-xs font-medium text-[var(--tinta3)]">{unidad}</span>}
      {children}
    </div>
    {pie && <p className="mt-1 text-[11px] text-[var(--tinta2)]">{pie}</p>}
  </Panel>
)

/** La etiqueta de prioridad: el color va en el borde, el fondo y la forma;
 *  el texto, en tinta. Escrito en amarillo sobre amarillo claro daba 1,7:1 y
 *  en salmón sobre el fondo oscuro, menos de 3:1: se leía la forma, no el texto. */
const ETIQUETA: Record<Severidad, { texto: string; clase: string }> = {
  0: { texto: 'NORMAL', clase: 'border-[var(--linea2)] bg-[var(--panel2)] text-[var(--tinta3)]' },
  1: { texto: 'P1 · ALARMA', clase: 'border-[var(--p1)] bg-[var(--p1-f)]' },
  2: { texto: 'P2 · ATENCIÓN', clase: 'border-[var(--p2)] bg-[var(--p2-f)]' },
  3: { texto: 'P3 · AVISO', clase: 'border-[var(--p3)] bg-[var(--p3-f)]' },
}
export const Severidad_ = ({ s }: { s: Severidad }) => (
  <span className={cn('font-cond inline-flex items-center gap-1 rounded-sm border px-1.5 text-[10px] font-semibold tracking-[.05em] text-[var(--tinta)]', ETIQUETA[s].clase)}>
    {s > 0 && <MarcaPrioridad s={s} tamano={10} decorativa />}{ETIQUETA[s].texto}
  </span>
)

/** ISA-101: una etiqueta no lleva color de alarma porque no es una alarma.
 *  «fuerte» distingue sin alarmar: tinta oscura sobre gris. */
export const Chip = ({ children, tono = 'neutro' }: { children: ReactNode; tono?: 'neutro' | 'fuerte' }) => (
  <span className={cn('font-cond inline-flex items-center rounded-sm border px-1.5 text-[10px] font-semibold tracking-[.05em]',
    tono === 'fuerte' && 'border-[var(--tinta2)] bg-[var(--panel)] text-[var(--tinta)]',
    tono === 'neutro' && 'border-[var(--linea2)] bg-[var(--panel2)] text-[var(--tinta3)]')}>
    {children}
  </span>
)

export const Boton = ({ children, variante = 'normal', className, ...p }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variante?: 'normal' | 'principal' | 'chico' }) => (
  // Un botón es una acción: en el papel no hace nada, así que no se imprime.
  <button {...p} className={cn(
    'no-imprimir cursor-pointer rounded border text-xs shadow-[var(--sombra)] transition-colors disabled:cursor-not-allowed disabled:opacity-45',
    variante === 'chico' ? 'px-2 py-[3px] text-[11px]' : 'px-2.5 py-[5px]',
    variante === 'principal'
      ? 'border-[var(--tinta)] bg-[var(--tinta)] text-[var(--superficie)] hover:opacity-90'
      : 'border-[var(--linea)] bg-[var(--panel)] hover:bg-[var(--elevado)]',
    className)}>
    {children}
  </button>
)

export const Cita = ({ children }: { children: ReactNode }) => (
  <p className="my-2 border-l-2 border-[var(--linea)] py-[3px] pl-2.5 text-[11px] text-[var(--tinta2)]">{children}</p>
)

export const Hueco = ({ children }: { children: ReactNode }) => (
  <div className="rounded-sm border border-dashed border-[var(--linea)] bg-[var(--panel2)] px-3 py-2.5 text-[11.5px] text-[var(--tinta2)]">
    {children}
  </div>
)

/** «Subir un CSV»: el <input type=file> va escondido (sr-only) y lo que se ve
 *  es su etiqueta, así que el anillo de foco va en la etiqueta: el del input,
 *  de 1 px y recortado, no se veía (WCAG 2.4.7). Si el navegador no puede leer
 *  el archivo (se movió, una carpeta de red, permiso negado) se dice: la
 *  promesa no queda rechazada en la consola con la pantalla igual. */
export const SubirCsv = ({ onTexto, onError }: { onTexto: (texto: string) => void; onError: (mensaje: string) => void }) => (
  <label className="no-imprimir cursor-pointer rounded border border-[var(--linea)] bg-[var(--panel)] px-2.5 py-[5px] text-xs shadow-[var(--sombra)] hover:bg-[var(--elevado)] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-[var(--acento)]">
    <Upload className="mr-1 inline size-3.5" />Subir un CSV
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
