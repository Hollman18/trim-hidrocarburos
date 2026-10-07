import type { ReactNode } from 'react'
import type { Severidad } from '@/entities/tipos'
import { MarcaPrioridad } from './Prioridad'
import { cn } from '@/shared/lib/cn'

/** Indicador analógico de ISA-101 (HMI de alto desempeño).
 *
 *  Un número solo no dice si está bien. Este indicador pone el valor sobre su
 *  banda normal y sus límites de alarma: de un vistazo se ve si está en el
 *  centro, arrimado a un borde o afuera.
 *
 *  Va en dos renglones a propósito: arriba el nombre y el valor, abajo la
 *  barra a todo el ancho. En una placa angosta, poner todo en una fila hacía
 *  que el valor se saliera de la tarjeta. El valor nunca se recorta: si falta
 *  espacio, es el nombre el que baja de renglón. */
export function Analogico({
  valor, unidad, normal, alarma, decimales = 1, estado, nombre, sub, detalle = false, className,
}: {
  valor: number | null
  unidad: string
  /** Banda normal. Un lado puede ser infinito: «< 85» no tiene piso. */
  normal?: [number, number]
  alarma?: { alta?: number; baja?: number }
  decimales?: number
  /** El estado que reporta el instrumento manda; si no viene, se deduce. */
  estado?: Severidad
  nombre?: ReactNode
  /** Segundo renglón del nombre: el tag y de dónde viene la lectura. */
  sub?: ReactNode
  /** Con detalle, debajo de la barra se escriben la banda y el límite. */
  detalle?: boolean
  className?: string
}) {
  const fmt = (v: number) => v.toLocaleString('es-CO', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })
  const finitos = (xs: Array<number | undefined>) => xs.filter((x): x is number => x !== undefined && Number.isFinite(x))
  const puntos = finitos([valor ?? undefined, normal?.[0], normal?.[1], alarma?.alta, alarma?.baja])
  const lo0 = puntos.length ? Math.min(...puntos) : 0
  const hi0 = puntos.length ? Math.max(...puntos) : 1
  const margen = (hi0 - lo0 || Math.abs(hi0) || 1) * 0.12
  // Un límite de un solo lado arranca en cero si la variable es positiva.
  const lo = normal && !Number.isFinite(normal[0]) && lo0 >= 0 ? Math.min(0, lo0) : lo0 - margen
  const hi = hi0 + margen
  const pct = (v: number) => ((Math.min(Math.max(v, lo), hi) - lo) / (hi - lo)) * 100
  const bandaDe = normal ? [Number.isFinite(normal[0]) ? normal[0] : lo, Number.isFinite(normal[1]) ? normal[1] : hi] as const : undefined

  const fuera = valor !== null && !!normal && (valor < normal[0] || valor > normal[1])
  const enAlarma = valor !== null && !!alarma &&
    ((alarma.alta !== undefined && valor >= alarma.alta) || (alarma.baja !== undefined && valor <= alarma.baja))
  const s: Severidad = estado ?? (enAlarma ? 1 : fuera ? 3 : 0)
  const tinta = s ? `var(--p${s})` : 'var(--tinta)'
  const limites = finitos([alarma?.baja, alarma?.alta])

  const textoBanda = normal
    ? !Number.isFinite(normal[0]) ? `normal < ${fmt(normal[1])}`
      : !Number.isFinite(normal[1]) ? `normal > ${fmt(normal[0])}`
        : `normal ${fmt(normal[0])} – ${fmt(normal[1])}`
    : undefined
  const textoLimite = limites.length ? `alarma ${limites.map(fmt).join(' y ')}` : undefined

  return (
    <div className={cn('analogico', className)}>
      <div className="analogico-rejilla">
        <span className="a-nombre text-[11px] leading-snug text-[var(--tinta2)]">
          {nombre !== undefined && <span className="block">{nombre}</span>}
          {sub && <small className="font-mono block text-[9.5px] text-[var(--tinta3)]">{sub}</small>}
        </span>
        <span className="a-valor flex items-center gap-1 whitespace-nowrap">
          {s > 0 && <MarcaPrioridad s={s} tamano={11} />}
          {valor === null
            ? <span className="text-[10.5px] text-[var(--invalido)]">sin señal</span>
            : (
              <b className="tabular text-[12.5px] leading-none" style={{ color: s ? tinta : undefined }}>
                {fmt(valor)}<span className="ml-0.5 text-[10px] font-normal text-[var(--tinta3)]">{unidad}</span>
              </b>
            )}
        </span>

      <div className="a-barra">
      <div className="relative h-[13px]" aria-hidden>
        {/* Escala: línea fina. Sin señal, punteada: no hay dato que creer. */}
        <i className={cn('absolute inset-x-0 top-[6px] h-0 border-t',
          valor === null ? 'border-dashed border-[var(--invalido)] opacity-60' : 'border-[var(--linea)]')} />
        {bandaDe && valor !== null && (
          <i className="absolute top-[3px] h-[7px] rounded-[2px] bg-[var(--tinta3)] opacity-30"
            style={{ left: `${pct(bandaDe[0])}%`, width: `${Math.max(pct(bandaDe[1]) - pct(bandaDe[0]), 1)}%` }} />
        )}
        {limites.map(l => (
          <i key={l} className="absolute top-0 h-[13px] w-[2px] -translate-x-1/2 bg-[var(--tinta2)]" style={{ left: `${pct(l)}%` }} />
        ))}
        {valor !== null && (
          <span className="absolute top-0 flex -translate-x-1/2 flex-col items-center" style={{ left: `${pct(valor)}%` }}>
            <svg width="10" height="6" viewBox="0 0 10 6" className="block"><path d="M0 0 H10 L5 6 Z" fill={tinta} /></svg>
            <i className="block h-[7px] w-[2px]" style={{ background: tinta }} />
          </span>
        )}
      </div>

      {detalle && (textoBanda || textoLimite) && (
        <div className="tabular mt-0.5 flex flex-wrap justify-between gap-x-3 text-[9.5px] text-[var(--tinta3)]">
          <span>{textoBanda}</span>
          <span>{textoLimite}</span>
        </div>
      )}
      </div>
      </div>
    </div>
  )
}
