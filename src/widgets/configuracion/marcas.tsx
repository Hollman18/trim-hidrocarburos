import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { MarcaCondicion } from '@/shared/ui/Prioridad'
import type { EstadoEquipo } from './topologia'

/* Las marcas de la filosofía operacional. Todo es gris (ISA-101): aquí no hay
   ninguna alarma. Cada marca lleva forma y texto, nunca solo color:
   - firmado o contestado: un visto;
   - propuesta de TRIM: un círculo con «?»;
   - lo que falta (sin responder, sin dato, sin firmar): gris discontinuo;
   - el tramo que limita: doble contorno y «◄ limita», nunca rojo.
   El morado (dato inválido) lo usa solo la carga por CSV, con `DatoInvalido`. */

/** Lo que falta: la marca «falta» de X2 §4.2 (el rectángulo gris discontinuo), del punto de entrada
 *  único (`MarcaCondicion`). C1 (QA v3): antes era un círculo punteado, la MISMA forma de «sin
 *  comunicación» en otro color: en blanco y negro no se distinguían (X2 C8 y D2). `etiqueta` es su
 *  nombre para el lector; si el texto de al lado ya lo dice, va decorativa. */
export function MarcaFalta({ etiqueta, decorativa }: { etiqueta?: string; decorativa?: boolean }) {
  return <MarcaCondicion c="falta" tamano={12} decorativa={decorativa || !etiqueta} etiqueta={etiqueta} className="shrink-0" />
}

/** La forma de cada estado; el texto va al lado (la marca es decorativa).
 *  Firmado: un visto. En el borrador: el visto dentro de un cuadro (falta la
 *  firma). Propuesta: «?». Sin responder: la marca «falta». */
export function MarcaEstado({ estado }: { estado: EstadoEquipo }) {
  if (estado === 'sin-responder') return <MarcaFalta decorativa />
  return (
    <svg width={12} height={12} viewBox="0 0 14 14" aria-hidden style={{ flexShrink: 0 }}>
      {estado === 'propuesta' && <>
        <circle cx="7" cy="7" r="5.6" fill="none" stroke="var(--tinta2)" strokeWidth="1.4" />
        {/* El «?» dibujado, no escrito (UI-16): un texto de 8,4 unidades saldría a 7 px en pantalla. */}
        <path data-pregunta d="M5.1 5.4 A1.9 1.9 0 1 1 8.4 6.6 C7.6 7.1 7 7.5 7 8.4" fill="none" stroke="var(--tinta2)" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="7" cy="10.3" r="0.9" fill="var(--tinta2)" />
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
    <span className="inline-flex items-center rounded-sm border-[3px] border-double border-[var(--tinta)] px-1 text-[13px] font-semibold text-[var(--tinta)]">
      ◄ limita
    </span>
  )
}
