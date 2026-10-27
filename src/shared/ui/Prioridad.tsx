import type { Severidad, EstadoDispositivo } from '@/entities/tipos'
import { NOMBRE_PRIORIDAD, DE_ESTADO } from '@/shared/lib/prioridad'
import { cn } from '@/shared/lib/cn'

/** ISA-101 e ISA-18.2: la condición se codifica tres veces — color, forma y
 *  número — para que se lea sin depender del color: daltonismo, una pantalla
 *  que se ve al sol, una impresión en blanco y negro. Lo normal no lleva ni
 *  color ni forma de alarma: un punto gris, y solo en listas mixtas.
 *
 *  La paleta es la de X2 §4 y X5 §3.3:
 *   · rombo naranja «1» = alarma (prioridad 1);
 *   · triángulo amarillo «2», con trazo oscuro = atención (prioridad 2);
 *   · cuadrado amarillo «3», con trazo oscuro = aviso (prioridad 3);
 *   · candado rojo = interlock (el rojo es solo suyo);
 *   · círculo punteado morado = sin comunicación (con raya: dato inválido);
 *   · en gris, sin color: falta, sin instrumento, medido a mano, anticipa;
 *   · en tinta: «No arrancar» (un bloqueo de procedimiento, no una prioridad).
 *  El número de adentro es parte del símbolo (7,8 de un dibujo de 14): es la
 *  única letra de la aplicación por debajo de 12 px (X5 §3.4). */

export type Condicion =
  | 'interlock' | 'alarma' | 'atencion' | 'aviso' | 'sin-comunicacion' | 'invalido'
  | 'falta' | 'sin-instrumento' | 'campana' | 'anticipa' | 'normal' | 'bloqueo'

/** El nombre que oye el lector de pantalla (X2 §4.2). */
const NOMBRE_CONDICION: Record<Condicion, string> = {
  interlock: 'Interlock', alarma: NOMBRE_PRIORIDAD[1], atencion: NOMBRE_PRIORIDAD[2], aviso: NOMBRE_PRIORIDAD[3],
  'sin-comunicacion': 'Sin comunicación', invalido: 'Dato inválido', falta: 'Falta', 'sin-instrumento': 'Sin instrumento',
  campana: 'Medido a mano', anticipa: 'Anticipa', normal: 'Normal', bloqueo: 'No arrancar',
}

const DE_SEVERIDAD: Record<Severidad, Condicion> = { 0: 'normal', 1: 'alarma', 2: 'atencion', 3: 'aviso' }

/** El número dentro del rombo, del triángulo y del cuadrado: Plex Sans Bold, 7,8 de 14. */
const Numero = ({ n, y, fill }: { n: number; y: number; fill: string }) => (
  <text x="7" y={y} textAnchor="middle" fontSize="7.8" fontWeight="700" fontFamily="'IBM Plex Sans', system-ui, sans-serif" fill={fill}>{n}</text>
)

/** El dibujo de cada condición, en 14 × 14 (los trazos de X2 §4.2 y de `marcas.js`). */
function Forma({ c }: { c: Condicion }) {
  switch (c) {
    case 'interlock': return (<>
      <rect x="2.5" y="6" width="9" height="7" rx="1.2" fill="var(--interlock)" />
      <path d="M4.6 6 V4.4 a2.4 2.4 0 0 1 4.8 0 V6" fill="none" stroke="var(--interlock)" strokeWidth="1.6" />
    </>)
    case 'alarma': return (<>
      <path d="M7 0.5 L13.5 7 L7 13.5 L0.5 7 Z" fill="var(--p1)" />
      <Numero n={1} y={9.75} fill="var(--marca-num)" />
    </>)
    // El amarillo da menos de 3:1 contra cualquier fondo claro: la silueta la da el trazo oscuro.
    case 'atencion': return (<>
      <path d="M7 1 L13.4 12.7 L0.6 12.7 Z" fill="var(--p2)" stroke="var(--marca-trazo)" strokeWidth="1" strokeLinejoin="round" />
      <Numero n={2} y={11.4} fill="var(--marca-trazo)" />
    </>)
    case 'aviso': return (<>
      <rect x="1.4" y="1.4" width="11.2" height="11.2" rx="1.2" fill="var(--p3)" stroke="var(--marca-trazo)" strokeWidth="1" />
      <Numero n={3} y={9.8} fill="var(--marca-trazo)" />
    </>)
    case 'sin-comunicacion': return <circle cx="7" cy="7" r="5.2" fill="none" stroke="var(--sincom)" strokeWidth="1.6" strokeDasharray="2.2 1.6" />
    case 'invalido': return (<>
      <circle cx="7" cy="7" r="5.2" fill="none" stroke="var(--sincom)" strokeWidth="1.6" strokeDasharray="2.2 1.6" />
      <path d="M3.3 10.7 L10.7 3.3" stroke="var(--sincom)" strokeWidth="1.6" />
    </>)
    case 'falta': return <rect x="1.5" y="3" width="11" height="8" rx="1" fill="none" stroke="var(--tinta3)" strokeWidth="1.4" strokeDasharray="2 1.5" />
    case 'sin-instrumento': return <path d="M4.5 2 H2.2 V12 H4.5 M9.5 2 H11.8 V12 H9.5" fill="none" stroke="var(--tinta3)" strokeWidth="1.5" />
    case 'campana': return (<>
      <circle cx="7" cy="7" r="5.2" fill="none" stroke="var(--tinta3)" strokeWidth="1.4" />
      <path d="M7 4 V7 H9.5" fill="none" stroke="var(--tinta3)" strokeWidth="1.4" />
    </>)
    case 'anticipa': return <path d="M2 7 H11 M8 4 L11 7 L8 10" fill="none" stroke="var(--tinta3)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    case 'bloqueo': return (<>
      <circle cx="7" cy="7" r="5.6" fill="none" stroke="var(--tinta)" strokeWidth="1.7" />
      <path d="M3.1 10.9 L10.9 3.1" stroke="var(--tinta)" strokeWidth="1.7" />
    </>)
    case 'normal': return <circle cx="7" cy="7" r="2.6" fill="var(--tinta3)" />
  }
}

/** El punto de entrada único de las marcas (X2 §4.4, `MarcaCondicion`).
 *  `decorativa`: cuando el texto de al lado ya dice la condición, la forma no
 *  se anuncia otra vez. `etiqueta`: el nombre accesible con su detalle
 *  («Sin comunicación desde las 14:07»). */
export function MarcaCondicion({ c, tamano = 14, className, decorativa, etiqueta }: {
  c: Condicion; tamano?: number; className?: string; decorativa?: boolean; etiqueta?: string
}) {
  const nombre = decorativa ? { 'aria-hidden': true } : { role: 'img', 'aria-label': etiqueta ?? NOMBRE_CONDICION[c] }
  // H19: ninguna marca de menos de 12 px en el escritorio ni de 14 en el teléfono
  // (X2 §4.2; X5 §5.6). Así no hay que cuidar el tamaño en cada sitio que la usa.
  const t = Math.max(tamano, 12)
  return (
    <svg width={t} height={t} viewBox="0 0 14 14" {...nombre} className={cn('max-sm:size-[max(14px,var(--t-marca))]', className)}
      style={{ flexShrink: 0, overflow: 'visible', '--t-marca': `${t}px` } as React.CSSProperties}>
      <Forma c={c} />
    </svg>
  )
}

/** La marca de una prioridad del motor: rombo = 1 · triángulo = 2 · cuadrado = 3;
 *  0 es lo normal (un punto gris). */
export function MarcaPrioridad({ s, tamano = 14, className, decorativa }: { s: Severidad; tamano?: number; className?: string; decorativa?: boolean }) {
  return <MarcaCondicion c={DE_SEVERIDAD[s]} tamano={tamano} className={className} decorativa={decorativa}
    etiqueta={NOMBRE_PRIORIDAD[s]} />
}


/** Un indicador fuera de su meta es un AVISO (prioridad 3), no una alarma:
 *  el número queda en tinta normal y el cuadrado al lado dice que se salió.
 *  Así el color sigue significando una sola cosa en toda la aplicación. */
export function FueraDeMeta({ si, tamano = 14 }: { si: unknown; tamano?: number }) {
  if (!si) return null
  return <MarcaPrioridad s={3} tamano={tamano} className="mr-1.5 inline-block align-[-2px]" />
}

/** Estado de un instrumento. «Sin señal» no es una prioridad: es un dato
 *  que no se puede creer, y en ISA-101 se marca aparte (el círculo punteado). */
export function MarcaEstado({ e, tamano = 14 }: { e: EstadoDispositivo; tamano?: number }) {
  const s = DE_ESTADO[e]
  return s === null ? <DatoInvalido etiqueta="Sin señal" tamano={tamano} /> : <MarcaPrioridad s={s} tamano={tamano} />
}

/** Sin comunicación o sin señal (morado, aparte de las prioridades): el valor
 *  no se puede creer. Con `raya`, un dato de entrada que no corresponde a nada
 *  (un pozo que no existe): el dato inválido. */
export function DatoInvalido({ etiqueta, tamano = 14, raya }: { etiqueta: string; tamano?: number; raya?: boolean }) {
  return <MarcaCondicion c={raya ? 'invalido' : 'sin-comunicacion'} tamano={tamano} etiqueta={etiqueta} />
}
