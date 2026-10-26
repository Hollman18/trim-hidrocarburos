import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import type { EstadoEquipo } from './topologia'

/* Las marcas de la filosofía operacional. Todo es gris (ISA-101): aquí no hay
   ninguna alarma. Cada marca lleva forma y texto, nunca solo color:
   - firmado o contestado: un visto;
   - propuesta de TRIM: un círculo con «?»;
   - lo que falta (sin responder, sin dato, sin firmar): gris discontinuo;
   - el tramo que limita: doble contorno y «◄ limita», nunca rojo.
   El morado (dato inválido) lo usa solo la carga por CSV, con `DatoInvalido`. */

/** Un círculo gris punteado: lo que falta. `etiqueta` es su nombre para el
 *  lector; si el texto de al lado ya lo dice, va decorativa. */
export function MarcaFalta({ etiqueta, decorativa }: { etiqueta?: string; decorativa?: boolean }) {
  const nombre = decorativa || !etiqueta ? { 'aria-hidden': true } : { role: 'img', 'aria-label': etiqueta }
  return (
    <svg width={12} height={12} viewBox="0 0 14 14" {...nombre} style={{ flexShrink: 0 }}>
      <circle cx="7" cy="7" r="5.2" fill="none" stroke="var(--tinta3)" strokeWidth="1.5" strokeDasharray="2.2 1.8" />
    </svg>
  )
}

/** La forma de cada estado; el texto va al lado (la marca es decorativa).
 *  Firmado: un visto. En el borrador: el visto dentro de un cuadro (falta la
 *  firma). Propuesta: «?». Sin responder: el círculo punteado de lo que falta. */
export function MarcaEstado({ estado }: { estado: EstadoEquipo }) {
  if (estado === 'sin-responder') return <MarcaFalta decorativa />
  return (
    <svg width={12} height={12} viewBox="0 0 14 14" aria-hidden style={{ flexShrink: 0 }}>
      {estado === 'propuesta' && <>
        <circle cx="7" cy="7" r="5.6" fill="none" stroke="var(--tinta2)" strokeWidth="1.4" />
        <text x="7" y="10.2" textAnchor="middle" fontSize="8.4" fontWeight="700" fontFamily="system-ui, sans-serif" fill="var(--tinta2)">?</text>
      </>}
      {estado === 'firmado' && <path d="M2.2 7.4 L5.6 10.6 L11.8 3.4" fill="none" stroke="var(--tinta)" strokeWidth="2" />}
      {estado === 'contestado' && <>
        <rect x="1" y="1" width="12" height="12" rx="2" fill="none" stroke="var(--tinta2)" strokeWidth="1.2" />
        <path d="M3.6 7.4 L6 9.8 L10.4 4.6" fill="none" stroke="var(--tinta)" strokeWidth="1.6" />
      </>}
    </svg>
  )
}

/** Una etiqueta de lo que falta: gris, borde discontinuo, con su palabra. */
export function EtiquetaFalta({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex max-w-full items-center gap-1 rounded-sm border border-dashed border-[var(--tinta3)] px-1.5 py-px text-[13px] leading-snug text-[var(--tinta2)]', className)}>
      {children}
    </span>
  )
}

/** «◄ limita»: el tramo más angosto. No es una alarma (U2 §0, principio 4):
 *  gris, con doble contorno y la palabra. */
export function Limita() {
  return (
    <span className="font-cond inline-flex items-center rounded-sm border-[3px] border-double border-[var(--tinta)] px-1 text-[12px] font-semibold tracking-[.05em] text-[var(--tinta)]">
      ◄ limita
    </span>
  )
}
