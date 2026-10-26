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
  valor, unidad, normal, alarma, decimales = 1, estado, nombre, sub, detalle = false, gris = false, className,
}: {
  valor: number | null
  unidad: string
  /** Banda normal. Un lado puede ser infinito: «< 85» no tiene piso. */
  normal?: [number, number]
  alarma?: { alta?: number; baja?: number }
  decimales?: number
  /** El estado que reporta el instrumento manda; si no viene, se deduce: en
   *  alarma, 1; fuera de su banda normal sin alarma, atención (2), como dice
   *  el contrato y la electrosumergible (`estadoDe`). */
  estado?: Severidad
  nombre?: ReactNode
  /** Segundo renglón del nombre: el tag y de dónde viene la lectura. */
  sub?: ReactNode
  /** Con detalle, debajo de la barra se escriben la banda y el límite. */
  detalle?: boolean
  /** C4 · El equipo está parado: puntero y valor en gris y sin marca propia (X2 B9). */
  gris?: boolean
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
  const s: Severidad = gris ? 0 : estado ?? (enAlarma ? 1 : fuera ? 2 : 0)
  // El texto y el puntero nunca se pintan (X2 B5, C1; X5 §5.4): van en tinta, y la
  // condición la dice la marca a su izquierda. En amarillo, el valor no se leía (1,7:1).
  const tinta = gris ? 'var(--tinta3)' : 'var(--tinta)'
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
        <span className="a-nombre text-[13px] leading-snug text-[var(--tinta2)]">
          {nombre !== undefined && <span className="block">{nombre}</span>}
          {sub && <small className="font-mono block text-[12px] text-[var(--tinta3)]">{sub}</small>}
        </span>
        <span className="a-valor flex items-center gap-1 whitespace-nowrap">
          {s > 0 && <MarcaPrioridad s={s} tamano={14} />}
          {valor === null
            ? <span className="text-[13px] text-[var(--invalido)]">sin señal</span>
            : (
              <b className={cn('tabular text-[15px] leading-none', gris && 'font-semibold text-[var(--tinta2)]')}>
                {fmt(valor)}<span className="ml-0.5 text-[12px] font-normal text-[var(--tinta3)]">{unidad}</span>
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
        <div className="tabular mt-0.5 flex flex-wrap justify-between gap-x-3 text-[12px] text-[var(--tinta3)]">
          <span>{textoBanda}</span>
          <span>{textoLimite}</span>
        </div>
      )}
      </div>
      </div>
    </div>
  )
}

/** C4 · El indicador analógico de alto desempeño del nivel 3 (X2 §5.1; X5 §5.4;
 *  la imagen 4, `indicadores.js`). A diferencia de `Analogico`, la escala la da el
 *  motor y es FIJA por instrumento: no depende del valor de ahora (X2 B7), así el
 *  puntero se lee por su lugar. Sin texto adentro: si no cabe, se dibuja más chico sin perder la proporción.
 *   · la pista en `--pista`; la banda normal en `--banda` con una raya en
 *     `--tinta3` en cada extremo cerrado;
 *   · el límite de alarma, una raya de 2,4 px en tinta;
 *   · el puntero en tinta (un triángulo con su línea); en gris si el equipo está
 *     parado (X2 B9); fuera de la escala, en el borde con su flecha;
 *   · sin lectura, la escala va discontinua en morado y sin puntero (X2 §5.1, punto 6).
 *  Los extremos de la escala no se rotulan y no se dibuja disparo: el motor
 *  todavía no los trae (X2 §7, pedido 4). */
export function IndicadorFijo({ escala, banda, alarmas, valor, gris = false, fuera, etiqueta, className }: {
  escala: [number, number]
  /** Banda normal; null del lado abierto. */
  banda: [number | null, number | null] | null
  alarmas: readonly number[]
  valor: number | null
  gris?: boolean
  fuera?: 'abajo' | 'arriba'
  /** El nombre accesible: «Presión de succión, 18,2 psi; normal > 10; alarma 8». */
  etiqueta: string
  className?: string
}) {
  const A = 156, y = 22
  const [e0, e1] = escala
  const X = (v: number) => 6 + ((Math.min(Math.max(v, e0), e1) - e0) / (e1 - e0 || 1)) * (A - 12)
  const b0 = banda?.[0] ?? e0, b1 = banda?.[1] ?? e1
  const tinta = gris ? 'var(--tinta3)' : 'var(--tinta)'
  const xp = valor === null ? 0 : X(valor)
  return (
    <svg width={A} height={32} viewBox={`0 0 ${A} 32`} role="img" aria-label={etiqueta} className={cn('block h-auto max-w-full', className)}>
      <rect x={6} y={y - 3} width={A - 12} height={6} rx={3} fill="var(--pista)"
        {...(valor === null ? { fill: 'none', stroke: 'var(--sincom)', strokeDasharray: '3 3', strokeWidth: 1.2 } : {})} />
      {banda && valor !== null && <rect x={X(b0)} y={y - 6} width={Math.max(X(b1) - X(b0), 1)} height={12} rx={3} fill="var(--banda)" />}
      {banda && valor !== null && banda[0] !== null && <line x1={X(b0)} x2={X(b0)} y1={y - 8} y2={y + 8} stroke="var(--tinta3)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />}
      {banda && valor !== null && banda[1] !== null && <line x1={X(b1)} x2={X(b1)} y1={y - 8} y2={y + 8} stroke="var(--tinta3)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />}
      {alarmas.map(a => <line key={a} x1={X(a)} x2={X(a)} y1={y - 10} y2={y + 10} stroke="var(--tinta)" strokeWidth={2.4} vectorEffect="non-scaling-stroke" data-alarma />)}
      {valor !== null && (fuera
        ? <path d={fuera === 'abajo' ? `M2 ${y - 7} L10 ${y - 12} L10 ${y - 2} Z` : `M${A - 2} ${y - 7} L${A - 10} ${y - 12} L${A - 10} ${y - 2} Z`} fill={tinta} data-fuera={fuera} />
        : <g data-puntero>
          <path d={`M${xp - 6} 4 L${xp + 6} 4 L${xp} 13 Z`} fill={tinta} />
          <line x1={xp} x2={xp} y1={12} y2={y + 6} stroke={tinta} strokeWidth={2} vectorEffect="non-scaling-stroke" />
        </g>)}
    </svg>
  )
}
