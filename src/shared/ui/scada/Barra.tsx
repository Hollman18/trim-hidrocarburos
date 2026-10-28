import { cn } from '@/shared/lib/cn'
import { MarcaCondicion } from '@/shared/ui/Prioridad'
import { COLOR_CONDICION, cifra, fraseEstado, valorEscrito, type Banda, type CondicionKit, type Escala, type EstadoKit } from './tipos'

/* 1 · El indicador analógico de barra (kit-scada.md §1; X2 §5.1). De izquierda a derecha:
   la escala fija del instrumento (una pista de 8 px en --pista, sin rotular sus extremos), la
   banda normal (--banda, con una raya de 1 px en --tinta3 en cada extremo cerrado), el límite
   de alarma (raya de 2 px y 18 de alto en --tinta2; cuando el valor lo cruza, en el color de su
   prioridad), el disparo (raya doble de 1 px), el puntero (raya de 2 px y cabeza de 8 px en
   --tinta; en --tinta3 si el equipo está parado; NUNCA se pinta) y, fuera del dibujo, el valor
   a 18 px tabular con su unidad a 12 px y la marca a su izquierda si es anormal.
   Lo que nunca hace: pintar la barra o el número del color del estado; mover la escala con la
   lectura; inventar un rango (sin firma dice «escala provisional»; sin escala ni límites, no se
   dibuja); poner una marca en las variables de un equipo parado. */

const ALTO = 28
const PISTA_Y = 10, PISTA_H = 8

export function Barra({ nombre, valor, unidad, escala, banda, alarmas = [], disparos = [], estado = 'normal', condicion, cruzo, desde, decimales = 0, ancho = 200, tag, conValor = true, className }: {
  /** El nombre de la señal: «Presión de succión». */
  nombre: string
  valor: number | null
  unidad: string
  /** La escala del instrumento. Sin ella (y sin límites) no se dibuja la barra: solo el valor. */
  escala?: Escala
  banda?: Banda
  alarmas?: readonly number[]
  disparos?: readonly number[]
  estado?: EstadoKit
  /** La prioridad que manda el motor, solo con `estado="anormal"`. */
  condicion?: CondicionKit
  /** El límite que el valor cruzó (uno de `alarmas`): toma el color de la prioridad. */
  cruzo?: number
  /** «14:07»: desde cuándo no llega el dato (sin comunicación). */
  desde?: string
  decimales?: number
  /** De 150 a 240 px; el mismo en los equipos gemelos, para que «todo bien» se vea en línea. */
  ancho?: number
  /** El tag del instrumento («PI-2010»), en la mono. */
  tag?: string
  /** false: el valor (con su marca) ya lo escribe la fila, a la derecha del nombre (la señal del
   *  nivel 4, `SenalFija`): la barra no lo repite. El nombre accesible lo lleva igual. */
  conValor?: boolean
  className?: string
}) {
  const gris = estado === 'parado'
  const sinValor = estado === 'sin-dato' || estado === 'sin-comunicacion' || valor === null
  const marca = estado === 'anormal' && condicion ? condicion : null
  const fuera = !sinValor && escala && valor !== null ? (valor < escala.min ? 'abajo' : valor > escala.max ? 'arriba' : null) : null
  // El nombre accesible: «Presión de succión, 18,2 psi; normal sobre 10; alarma en 8».
  const leido = sinValor || valor === null
    ? fraseEstado(estado === 'sin-comunicacion' ? 'sin-comunicacion' : 'sin-dato', { desde })
    : `${cifra(valor, decimales)} ${unidad}`
  const partes = [`${nombre}, ${leido}`]
  if (banda) partes.push(banda[0] !== null && banda[1] !== null ? `normal entre ${cifra(banda[0], decimales)} y ${cifra(banda[1], decimales)}` : banda[0] !== null ? `normal sobre ${cifra(banda[0], decimales)}` : banda[1] !== null ? `normal bajo ${cifra(banda[1], decimales)}` : 'normal')
  if (alarmas.length) partes.push(`alarma en ${alarmas.map(a => cifra(a, decimales)).join(' y ')}`)
  if (marca) partes.push(`en ${fraseEstado('anormal', { condicion: marca })}`)
  if (gris) partes.push('equipo parado')
  if (escala && !escala.firmada) partes.push('escala provisional')
  const etiqueta = partes.join('; ')

  return (
    <div role="img" aria-label={etiqueta} data-kit="barra" data-estado={estado}
      className={cn('inline-grid max-w-full items-center gap-x-3 gap-y-0.5', conValor ? 'grid-cols-[auto_auto]' : 'grid-cols-[auto]', className)}>
      {escala ? <Dibujo {...{ ancho, escala, banda, alarmas, disparos, valor, estado, marca, cruzo, fuera, gris, sinValor }} />
        : <span className="text-[12px] text-[var(--tinta3)]" style={{ width: ancho }}>sin escala firmada</span>}
      {conValor && <span className="flex items-baseline gap-1 whitespace-nowrap" aria-hidden>
        {marca && <MarcaCondicion c={marca} tamano={14} decorativa className="self-center" />}
        {estado === 'sin-comunicacion' && <MarcaCondicion c="sin-comunicacion" tamano={14} decorativa className="self-center" />}
        <b className={cn('tabular text-[18px] leading-none', marca ? 'font-bold' : 'font-semibold', gris || sinValor ? 'text-[var(--tinta2)]' : 'text-[var(--tinta)]')}>
          {valorEscrito(estado, valor, decimales)}
        </b>
        <small className="text-[12px] text-[var(--tinta2)]">{unidad}</small>
      </span>}
      {(tag || estado === 'sin-dato' || estado === 'sin-comunicacion' || (escala && !escala.firmada)) && (
        <span aria-hidden className="col-span-full flex flex-wrap gap-x-2 text-[12px] leading-tight text-[var(--tinta3)]">
          {tag && <span className="font-mono">{tag}</span>}
          {estado === 'sin-dato' && <span>sin lectura</span>}
          {estado === 'sin-comunicacion' && <span>{desde ? `sin comunicación desde ${desde}` : 'sin comunicación'}</span>}
          {escala && !escala.firmada && <span data-provisional>escala provisional</span>}
        </span>
      )}
    </div>
  )
}

function Dibujo({ ancho, escala, banda, alarmas, disparos, valor, estado, marca, cruzo, fuera, gris, sinValor }: {
  ancho: number; escala: Escala; banda?: Banda; alarmas: readonly number[]; disparos: readonly number[]
  valor: number | null; estado: EstadoKit; marca: CondicionKit | null; cruzo?: number
  fuera: 'abajo' | 'arriba' | null; gris: boolean; sinValor: boolean
}) {
  const x0 = 4, x1 = ancho - 4
  const X = (v: number) => x0 + ((Math.min(escala.max, Math.max(escala.min, v)) - escala.min) / (escala.max - escala.min || 1)) * (x1 - x0)
  // Sin dato o sin comunicación: la escala discontinua, sin banda ni puntero (nada que leer).
  if (sinValor) return (
    <svg width={ancho} height={ALTO} viewBox={`0 0 ${ancho} ${ALTO}`} aria-hidden className="block max-w-full">
      <rect x={x0} y={PISTA_Y} width={x1 - x0} height={PISTA_H} fill="none" data-sin-lectura=""
        stroke={estado === 'sin-comunicacion' ? 'var(--sincom)' : 'var(--tinta3)'} strokeWidth={1.2} strokeDasharray="3 2.5" />
    </svg>
  )
  const tinta = gris ? 'var(--tinta3)' : 'var(--tinta)'
  const xp = valor === null ? 0 : X(valor)
  return (
    <svg width={ancho} height={ALTO} viewBox={`0 0 ${ancho} ${ALTO}`} aria-hidden className="block max-w-full">
      <rect x={x0} y={PISTA_Y} width={x1 - x0} height={PISTA_H} fill="var(--pista)" />
      {banda && (() => {
        const a = X(banda[0] ?? escala.min), b = X(banda[1] ?? escala.max)
        return (<g data-banda="">
          <rect x={a} y={PISTA_Y} width={Math.max(b - a, 1)} height={PISTA_H} fill="var(--banda)" opacity={gris ? 0.5 : 1} />
          {!gris && banda[0] !== null && <line x1={a} x2={a} y1={7} y2={21} stroke="var(--tinta3)" strokeWidth={1} />}
          {!gris && banda[1] !== null && <line x1={b} x2={b} y1={7} y2={21} stroke="var(--tinta3)" strokeWidth={1} />}
        </g>)
      })()}
      {alarmas.map(a => {
        const cruzada = estado === 'anormal' && marca && cruzo === a
        return <line key={`a${a}`} x1={X(a)} x2={X(a)} y1={5} y2={23} strokeWidth={2} data-alarma=""
          stroke={cruzada ? COLOR_CONDICION[marca] : gris ? 'var(--dato3)' : 'var(--tinta2)'} />
      })}
      {disparos.map(d => (
        <g key={`d${d}`} data-disparo="">
          <line x1={X(d) - 2} x2={X(d) - 2} y1={5} y2={23} stroke="var(--tinta2)" strokeWidth={1} />
          <line x1={X(d) + 1} x2={X(d) + 1} y1={5} y2={23} stroke="var(--tinta2)" strokeWidth={1} />
        </g>
      ))}
      {valor !== null && (
        <g data-puntero="">
          <line x1={xp} x2={xp} y1={6} y2={22} stroke={tinta} strokeWidth={2} />
          <path d={`M${xp - 4} 1 H${xp + 4} L${xp} 6Z`} fill={tinta} />
          {fuera === 'abajo' && <path d={`M${x0 + 1} 24 l5 -3 v6Z`} fill={tinta} data-fuera="abajo" />}
          {fuera === 'arriba' && <path d={`M${x1 - 1} 24 l-5 -3 v6Z`} fill={tinta} data-fuera="arriba" />}
        </g>
      )}
    </svg>
  )
}
