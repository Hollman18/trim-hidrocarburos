import { useId } from 'react'
import { cn } from '@/shared/lib/cn'
import { MarcaCondicion } from '@/shared/ui/Prioridad'
import { COLOR_CONDICION, cifra, fraseEstado, type Banda, type CondicionKit, type Escala, type EstadoKit } from './tipos'

/* 2 · La tendencia (kit-scada.md §2; X2 §5.3). La ventana va escrita en el título («12 d»); el
   eje x con el primer día y «hoy», a la derecha y en negrita; el eje y rotulado solo en los
   extremos de la escala y en los límites; la banda normal sombreada (--banda al 60 %); la
   alarma en discontinuo de 1,2 px (5-3); la línea principal en --dato1 de 2 px; el último punto,
   un círculo de 2,6. Hasta 4 trazas, separadas POR TRAZO y no por color: continua,
   discontinua 6-3, punteada 1,5-3 y guion y punto. Si hay más, van como gráficas chicas iguales.
   Lo que nunca hace: autoescalar (la escala es la de su señal y siempre incluye la banda y los
   límites); colorear las series; unir un hueco por encima ni pintarlo en cero; dibujar lo
   proyectado igual que lo medido (va discontinuo y con su palabra). */

export type TrazoKit = 'continuo' | 'discontinuo' | 'punteado' | 'guion'
const DASH: Record<TrazoKit, string | undefined> = { continuo: undefined, discontinuo: '6 3', punteado: '1.5 3', guion: '10 3 2 3' }
const ORDEN_TRAZO: readonly TrazoKit[] = ['continuo', 'discontinuo', 'punteado', 'guion']

export interface SerieKit {
  nombre: string
  /** Un valor por punto de la ventana; null es un hueco (no hay lectura): corta la línea. */
  valores: ReadonlyArray<number | null>
  /** Sin decirlo, va en el orden de las trazas: continua, discontinua, punteada, guion y punto. */
  trazo?: TrazoKit
  /** Lo que no se midió (una proyección): discontinuo y con la palabra «proyectado». */
  proyectado?: boolean
}

export function Tendencia({ titulo, ventana, series, escala, unidad, banda, alarmas = [], estado = 'normal', condicion, cruzo, desde, paradaDesde, ejeX, decimales = 0, ancho = 320, alto = 72, compacta = false, className }: {
  /** Lo que mide: «Temperatura de cojinete». */
  titulo: string
  /** La ventana, escrita: «12 d», «Los 12 días antes de parar». */
  ventana: string
  series: readonly SerieKit[]
  escala: Escala
  unidad: string
  banda?: Banda
  alarmas?: readonly number[]
  estado?: EstadoKit
  condicion?: CondicionKit
  /** El límite cruzado: su raya toma el color de la prioridad; la línea sigue en tinta. */
  cruzo?: number
  /** «14:07»: la línea termina donde se perdió la señal. */
  desde?: string
  /** Desde qué punto el equipo está parado: ese tramo va rayado y la línea, en gris. */
  paradaDesde?: number
  /** El primer día y el último («hoy»). */
  ejeX?: readonly [string, string]
  decimales?: number
  /** En la ficha, 300 × 56 o más; en el nivel 1, 240 × 64 o más. */
  ancho?: number
  alto?: number
  /** En una placa o una fila: 110 a 150 × 30, sin ejes. */
  compacta?: boolean
  className?: string
}) {
  const id = useId().replace(/:/g, '')
  const visibles = series.slice(0, 4)
  // El margen izquierdo alcanza para el rótulo más largo del eje y (la mono de 12 px, ≈ 7,3 px por carácter): «4.600» no se corta.
  // El de arriba, para el rótulo del tope de la escala: Firefox mide la caja del texto con todo el alto de la letra (≈ 16 px
  // para 12) y con 8 px el tope («1.600») se salía 2 px por arriba del dibujo (B4: el auditor a 1280 px en Firefox).
  const L = compacta ? 2 : Math.max(40, Math.ceil(10 + 7.3 * Math.max(...[...alarmas, escala.min, escala.max].map(v => cifra(v, decimales).length)))), R = compacta ? 4 : 8, T = compacta ? 3 : 12, B = compacta ? 3 : 20
  const N = Math.max(2, ...visibles.map(s => s.valores.length))
  const X = (i: number) => L + (i / (N - 1)) * (ancho - L - R)
  const Y = (v: number) => T + (1 - (Math.min(escala.max, Math.max(escala.min, v)) - escala.min) / (escala.max - escala.min || 1)) * (alto - T - B)
  const gris = estado === 'parado'
  const marca = estado === 'anormal' && condicion ? condicion : null
  const ultimo = visibles[0]?.valores.at(-1)
  const leido = estado === 'sin-comunicacion' ? fraseEstado(estado, { desde })
    : ultimo === null || ultimo === undefined ? 'sin lectura al final' : `último ${cifra(ultimo, decimales)} ${unidad}`
  const etiqueta = [`${titulo}, ${ventana}`, leido,
    alarmas.length ? `alarma en ${alarmas.map(a => cifra(a, decimales)).join(' y ')}` : '',
    marca ? `en ${fraseEstado('anormal', { condicion: marca })}` : '', gris ? 'equipo parado' : '',
    escala.firmada ? '' : 'escala provisional'].filter(Boolean).join('; ')
  // El eje y, rotulado solo en los límites y en los extremos de la escala. Primero los límites:
  // un extremo que quedaría encima de otro rótulo (a menos de 12 px) no se escribe.
  const rotulosY: number[] = []
  if (!compacta) for (const v of [...alarmas, escala.min, escala.max]) if (!rotulosY.some(w => Math.abs(Y(w) - Y(v)) < 12)) rotulosY.push(v)

  return (
    <figure data-kit="tendencia" data-estado={estado} className={cn('m-0 inline-block max-w-full', className)}>
      {!compacta && (
        <figcaption className="mb-1 flex flex-wrap items-baseline gap-x-2 text-[13px] text-[var(--tinta2)]">
          <span className="font-semibold text-[var(--tinta)]">{titulo}</span><span>{ventana}</span>
          {series.some(s => s.proyectado) && <span>· proyectado en discontinuo</span>}
          {!escala.firmada && <span data-provisional>· escala provisional</span>}
        </figcaption>
      )}
      <svg width={ancho} height={alto} viewBox={`0 0 ${ancho} ${alto}`} role="img" aria-label={etiqueta} className="block h-auto max-w-full">
        {paradaDesde !== undefined && (
          <defs>
            <pattern id={`rayado-${id}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke="var(--linea)" strokeWidth="1.4" />
            </pattern>
          </defs>
        )}
        {banda && (() => {
          const a = Y(banda[1] ?? escala.max), b = Y(banda[0] ?? escala.min)
          return <rect x={L} y={a} width={ancho - L - R} height={Math.max(b - a, 1)} fill="var(--banda)" opacity={gris ? 0.45 : 0.6} data-banda="" />
        })()}
        {!compacta && <line x1={L} x2={ancho - R} y1={Y(escala.min)} y2={Y(escala.min)} stroke="var(--linea)" strokeWidth={1} />}
        {rotulosY.map(v => (
          <text key={`y${v}`} x={L - 6} y={Y(v) + 4} textAnchor="end" fontSize={12} fill="var(--tinta3)" fontFamily="var(--font-mono)">{cifra(v, decimales)}</text>
        ))}
        {alarmas.map(a => (
          <line key={`a${a}`} x1={L} x2={ancho - R} y1={Y(a)} y2={Y(a)} strokeWidth={1.2} strokeDasharray="5 3" data-alarma=""
            stroke={marca && cruzo === a ? COLOR_CONDICION[marca] : 'var(--tinta2)'} />
        ))}
        {paradaDesde !== undefined && <rect x={X(paradaDesde)} y={T} width={Math.max(ancho - R - X(paradaDesde), 0)} height={alto - T - B} fill={`url(#rayado-${id})`} data-parado="" />}
        {visibles.map((s, k) => {
          // Un hueco corta la línea: nunca se une por encima ni se pinta en cero.
          let d = '', abierto = false
          s.valores.forEach((v, i) => {
            if (v === null) { abierto = false; return }
            d += `${abierto ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)} `; abierto = true
          })
          const trazo = s.proyectado ? 'discontinuo' : s.trazo ?? ORDEN_TRAZO[k]!
          const color = gris ? 'var(--dato3)' : k === 0 ? 'var(--dato1)' : 'var(--tinta2)'
          const ult = s.valores.length - 1, uv = s.valores[ult]
          return (
            <g key={s.nombre} data-serie={s.nombre} data-trazo={trazo}>
              <path d={d.trim()} fill="none" stroke={color} strokeWidth={k === 0 ? 2 : 1.6} strokeLinejoin="round" strokeDasharray={DASH[trazo]} />
              {k === 0 && estado === 'sin-comunicacion'
                ? null
                : uv !== null && uv !== undefined && <circle cx={X(ult)} cy={Y(uv)} r={2.6} fill={color} />}
            </g>
          )
        })}
        {estado === 'sin-comunicacion' && (
          <g transform={`translate(${ancho - R - 14} ${T})`}>
            <circle cx="7" cy="7" r="5.2" fill="none" stroke="var(--sincom)" strokeWidth="1.6" strokeDasharray="2.2 1.6" />
          </g>
        )}
        {!compacta && ejeX && (<>
          <text x={L} y={alto - 5} fontSize={12} fill="var(--tinta3)">{ejeX[0]}</text>
          <text x={ancho - R} y={alto - 5} textAnchor="end" fontSize={12} fontWeight={600} fill="var(--tinta2)">{ejeX[1]}</text>
        </>)}
      </svg>
      {!compacta && (marca || estado === 'sin-comunicacion' || series.length > 4) && (
        <p aria-hidden className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[12px] text-[var(--tinta2)]">
          {marca && <><MarcaCondicion c={marca} tamano={12} decorativa />cruza la alarma</>}
          {estado === 'sin-comunicacion' && <>{desde ? `sin comunicación desde ${desde}` : 'sin comunicación'}</>}
          {series.length > 4 && <>{series.length - 4} trazas más: van en gráficas aparte</>}
        </p>
      )}
    </figure>
  )
}
