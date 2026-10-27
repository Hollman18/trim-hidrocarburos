import type { ReactNode } from 'react'
import type { Severidad } from '@/entities/tipos'
import type { PedazoRotulo } from '@/shared/api/plantaViva'
import { MarcaCondicion, MarcaPrioridad } from '@/shared/ui/Prioridad'

/* Piezas que comparten los dibujos de La planta viva (X5 §5.3): el texto con
   su cifra en negrita, la marca de un equipo dentro del SVG, los patrones del
   rayado y de la roca, y las cifras como en campo. */

/** Un rótulo en partes: el texto y, en negrita y tinta, la cifra (HTML). */
export function Partes({ partes }: { partes: PedazoRotulo[] }) {
  return <>{partes.map((p, i) => (typeof p === 'string' ? <span key={i}>{p}</span> : <b key={i} className="font-bold text-[var(--tinta)]">{p.b}</b>))}</>
}

/** Lo mismo dentro de un SVG: un <text> con sus <tspan>. */
export function TextoSvg({ x, y, partes, tam = 13, peso = 400, color = 'var(--tinta2)', ancla, className, children }: {
  x: number; y: number; partes?: PedazoRotulo[]; tam?: number; peso?: number; color?: string; ancla?: 'start' | 'middle' | 'end'; className?: string; children?: ReactNode
}) {
  return (
    <text x={x} y={y} fontSize={tam} fontWeight={peso} fill={color} textAnchor={ancla} className={className}>
      {partes?.map((p, i) => (typeof p === 'string' ? p : <tspan key={i} fontWeight={700} fill="var(--tinta)">{p.b}</tspan>))}
      {children}
    </text>
  )
}

/** La marca de un equipo dentro de un dibujo, arriba a la izquierda de donde va. */
export function MarcaSvg({ x, y, s, sinInstrumento, t = 15 }: { x: number; y: number; s: Severidad; sinInstrumento?: boolean; t?: number }) {
  if (!s && !sinInstrumento) return null
  return (
    <g transform={`translate(${x} ${y})`}>
      {s ? <MarcaPrioridad s={s} tamano={t} decorativa /> : <MarcaCondicion c="sin-instrumento" tamano={t} decorativa />}
    </g>
  )
}

/** Los patrones del dibujo: las rayas de lo que no pasa y los puntos de la roca. `id` evita choques entre dibujos. */
export function Patrones({ id }: { id: string }) {
  return (
    <defs>
      <pattern id={`${id}-rayas`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="6" stroke="var(--rayado)" strokeWidth="1.7" />
      </pattern>
      <pattern id={`${id}-roca`} width="7" height="7" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1" fill="var(--pared)" />
        <circle cx="5.5" cy="5.5" r="1" fill="var(--pared)" />
      </pattern>
      <marker id={`${id}-fl`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto">
        <path d="M1 1 L9 5 L1 9" fill="none" stroke="var(--agua)" strokeWidth="2.2" strokeLinecap="round" />
      </marker>
    </defs>
  )
}

/** El chip de calidad del dato: «simulado», «calculado» (contorno discontinuo, X5 §5.2). */
export const Calidad = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex items-center whitespace-nowrap rounded-full border-[1.5px] border-dashed border-[var(--tinta3)] px-[9px] text-[14px] font-medium leading-[1.3] text-[var(--tinta2)]">{children}</span>
)

/** «›» al final de una fila que abre algo. */
export const Chevron = ({ t = 20 }: { t?: number }) => (
  <svg width={t} height={t} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 text-[var(--tinta3)]">
    <path d="m9 18 6-6-6-6" />
  </svg>
)
