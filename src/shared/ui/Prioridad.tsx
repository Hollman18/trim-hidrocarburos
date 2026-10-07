import type { Severidad, EstadoDispositivo } from '@/entities/tipos'
import { NOMBRE_PRIORIDAD, DE_ESTADO } from '@/shared/lib/prioridad'

/** ISA-101 e ISA-18.2: la prioridad se codifica tres veces — color, forma y
 *  número — para que se lea sin depender del color: daltonismo, una pantalla
 *  que se ve al sol, una impresión en blanco y negro. Lo normal no lleva ni
 *  color ni forma de alarma: un punto gris.
 *
 *  Rombo = 1 · triángulo = 2 · cuadrado = 3. */

/** `decorativa`: cuando el texto de al lado ya dice la prioridad (una etiqueta
 *  «P1 · ALARMA»), la forma no se anuncia otra vez. */
export function MarcaPrioridad({ s, tamano = 14, className, decorativa }: { s: Severidad; tamano?: number; className?: string; decorativa?: boolean }) {
  const nombre = decorativa ? { 'aria-hidden': true } : { role: 'img', 'aria-label': NOMBRE_PRIORIDAD[s] }
  if (s === 0) {
    return (
      <svg width={tamano} height={tamano} viewBox="0 0 14 14" {...nombre} className={className}>
        <circle cx="7" cy="7" r="2.6" fill="var(--tinta3)" />
      </svg>
    )
  }
  const forma = s === 1 ? <path d="M7 0.6 L13.4 7 L7 13.4 L0.6 7 Z" />
    : s === 2 ? <path d="M7 0.8 L13.6 12.8 L0.4 12.8 Z" />
      : <rect x="1.4" y="1.4" width="11.2" height="11.2" rx="1.2" />
  // El cuadrado amarillo da 1,6:1 contra el panel claro: sin trazo, su silueta
  // (lo que lo distingue del rombo y del triángulo) no se ve al sol (WCAG 1.4.11).
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 14 14" {...nombre}
      className={className} style={{ flexShrink: 0 }}>
      <g fill={`var(--p${s})`} {...(s === 3 ? { stroke: 'var(--marca-trazo)', strokeWidth: 1 } : {})}>{forma}</g>
      <text x="7" y={s === 2 ? 11.2 : 9.7} textAnchor="middle" fontSize="7.6" fontWeight="700"
        fontFamily="system-ui, sans-serif" fill={s === 3 ? 'var(--marca-trazo)' : 'var(--marca-num)'}>{s}</text>
    </svg>
  )
}


/** Un indicador fuera de su meta es un AVISO (prioridad 3), no una alarma:
 *  el número queda en tinta normal y el cuadrado al lado dice que se salió.
 *  Así el color sigue significando una sola cosa en toda la aplicación. */
export function FueraDeMeta({ si, tamano = 13 }: { si: unknown; tamano?: number }) {
  if (!si) return null
  return <MarcaPrioridad s={3} tamano={tamano} className="mr-1.5 inline-block align-[-2px]" />
}

/** Estado de un instrumento. «Sin señal» no es una prioridad: es un dato
 *  que no se puede creer, y en ISA-101 se marca aparte. */
export function MarcaEstado({ e, tamano = 12 }: { e: EstadoDispositivo; tamano?: number }) {
  const s = DE_ESTADO[e]
  return s === null ? <DatoInvalido etiqueta="Sin señal" tamano={tamano} /> : <MarcaPrioridad s={s} tamano={tamano} />
}

/** Dato inválido (ISA-101: magenta, aparte de las prioridades): sin señal, o un
 *  dato de entrada que no corresponde a nada (un pozo que no existe). */
export function DatoInvalido({ etiqueta, tamano = 12 }: { etiqueta: string; tamano?: number }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 14 14" role="img" aria-label={etiqueta} style={{ flexShrink: 0 }}>
      <circle cx="7" cy="7" r="5.2" fill="none" stroke="var(--invalido)" strokeWidth="1.6" strokeDasharray="2.2 1.6" />
    </svg>
  )
}
