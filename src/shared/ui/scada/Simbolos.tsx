import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { MarcaCondicion } from '@/shared/ui/Prioridad'
import { COLOR_CONDICION, TRAZO_FLUIDO, cuerpoDe, valorEscrito, type CondicionKit, type EstadoKit, type Fluido } from './tipos'

/* 3 y 4 · Los símbolos de proceso y la línea por fluido (kit-scada.md §3 y §4). ISA-5.1
   simplificada, en 2D. El relleno dice si el equipo corre, por brillo: en marcha más claro que
   el fondo (--eq-marcha), parado más oscuro (--eq-parado), sin dato sin relleno y con contorno
   discontinuo. La marca dice qué anda mal: arriba a la izquierda, fuera del cuerpo, a 14 px.
   Lo anormal lleva contorno de 2 px en tinta, y el anillo de 2 px solo con ◆1 y el interlock.
   Cada símbolo devuelve un <g> para armar un esquema dentro de <Esquema>, que es el <svg> con su
   nombre accesible. Lo que nunca hace: girar el impulsor o «fluir» la tubería; sombra, brillo o
   3D; teñir el cuerpo; poner una marca a un pozo cerrado por otro equipo (la lleva el que lo
   cerró: el pozo va «parado», sin `condicion`). */

/** Lo común de cada símbolo: dónde va, su estado y lo que se escribe debajo. */
export interface PropsSimbolo {
  x: number
  y: number
  estado?: EstadoKit
  /** La prioridad del motor; solo se dibuja con `estado="anormal"`. */
  condicion?: CondicionKit
  /** Anormal y en marcha (K-101 degradado): el cuerpo sigue claro. */
  corre?: boolean
  /** El código («P-201B») debajo, a 13 px. */
  rotulo?: string
  /** La palabra bajo el código: «parado · en reserva», «sin comunicación desde 14:07». */
  sub?: string
}

/** La marca de 14 px, arriba a la izquierda y fuera del cuerpo. Sin comunicación lleva la suya. */
function MarcaEn({ x, y, estado, condicion }: { x: number; y: number; estado: EstadoKit; condicion?: CondicionKit }) {
  const c = estado === 'anormal' ? condicion : estado === 'sin-comunicacion' ? 'sin-comunicacion' as const : undefined
  if (!c) return null
  return <g transform={`translate(${x} ${y})`} data-marca={c}><MarcaCondicion c={c} tamano={14} decorativa /></g>
}

/** El anillo de 2 px: solo para la alarma (◆1) y el interlock. */
const conAnillo = (estado: EstadoKit, condicion?: CondicionKit): condicion is 'alarma' | 'interlock' =>
  estado === 'anormal' && (condicion === 'alarma' || condicion === 'interlock')

function Rotulos({ x, y, rotulo, sub }: { x: number; y: number; rotulo?: string; sub?: string }) {
  return (<>
    {rotulo && <text x={x} y={y} textAnchor="middle" fontSize={13} fontWeight={600} fill="var(--tinta)" fontFamily="var(--font-cond)">{rotulo}</text>}
    {sub && <text x={x} y={y + 16} textAnchor="middle" fontSize={12} fill="var(--tinta2)">{sub}</text>}
  </>)
}

/** Bomba centrífuga, Ø 32: el círculo con la descarga tangente arriba. No lleva impulsor: nada gira. */
export function Bomba({ x, y, estado = 'normal', condicion, corre, rotulo, sub }: PropsSimbolo) {
  const c = cuerpoDe(estado, corre), r = 16
  return (
    <g data-kit="bomba" data-estado={estado}>
      {conAnillo(estado, condicion) && <circle cx={x} cy={y} r={r + 6} fill="none" stroke={COLOR_CONDICION[condicion!]} strokeWidth={2} data-anillo="" />}
      <path d={`M${x} ${y - r} H${x + r + 6} V${y - r + 8} H${x + r * 0.78}`} {...c} fill="none" />
      <circle cx={x} cy={y} r={r} {...c} />
      <MarcaEn x={x - r - 14} y={y - r - 14} estado={estado} condicion={condicion} />
      <Rotulos x={x} y={y + r + 18} rotulo={rotulo} sub={sub} />
    </g>
  )
}

/** Tanque, techo plano, de 40 a 72 de ancho y de 60 a 136 de alto. El nivel en gris (--banda)
 *  con su línea de 1,5 px en --dato1; el alto y el alto-alto, rayas de 2 px en el costado. Sin
 *  lectura no se dibuja nivel: nunca un tanque vacío inventado. */
export function Tanque({ x, y, estado = 'normal', condicion, rotulo, sub, nivel, limites = [], ancho = 56, alto = 96 }: PropsSimbolo & {
  /** El nivel en %, de 0 a 100; null sin lectura. */
  nivel: number | null
  /** Las rayas del costado: [porcentaje, rótulo], como [[85, 'H'], [90, 'HH']]. */
  limites?: ReadonlyArray<readonly [number, string]>
  ancho?: number
  alto?: number
}) {
  const c = cuerpoDe(estado === 'sin-dato' || estado === 'sin-comunicacion' ? estado : 'normal')
  const lee = nivel !== null && estado !== 'sin-dato' && estado !== 'sin-comunicacion'
  const hn = lee ? (alto * Math.min(100, Math.max(0, nivel))) / 100 : 0
  return (
    <g data-kit="tanque" data-estado={estado}>
      {conAnillo(estado, condicion) && <rect x={x - 5} y={y - 5} width={ancho + 10} height={alto + 10} rx={6} fill="none" stroke={COLOR_CONDICION[condicion!]} strokeWidth={2} data-anillo="" />}
      <rect x={x} y={y} width={ancho} height={alto} rx={3} {...c} fill={c.fill === 'none' ? 'none' : 'var(--panel)'}
        strokeWidth={estado === 'anormal' ? 2 : c.strokeWidth} stroke={estado === 'anormal' ? 'var(--tinta)' : c.stroke} />
      {lee && hn > 2 && (<>
        <rect x={x + 1.5} y={y + alto - hn + 1} width={ancho - 3} height={hn - 2.5} fill="var(--banda)" opacity={estado === 'parado' ? 0.6 : 1} data-nivel="" />
        <line x1={x + 1.5} x2={x + ancho - 1.5} y1={y + alto - hn + 1} y2={y + alto - hn + 1} stroke="var(--dato1)" strokeWidth={1.5} />
      </>)}
      {limites.map(([v, t]) => {
        const yy = y + alto - (alto * v) / 100
        return (<g key={t}>
          <line x1={x + ancho} x2={x + ancho + 8} y1={yy} y2={yy} stroke="var(--tinta2)" strokeWidth={2} />
          <text x={x + ancho + 12} y={yy + 4} fontSize={12} fill="var(--tinta2)">{t}</text>
        </g>)
      })}
      <MarcaEn x={x - 16} y={y - 16} estado={estado} condicion={condicion} />
      <Rotulos x={x + ancho / 2} y={y + alto + 18} rotulo={rotulo} sub={sub} />
    </g>
  )
}

/** Válvula, 24 × 14: el corbatín con su vástago. Abierta, clara (normal); cerrada, oscura (parado). */
export function Valvula({ x, y, estado = 'normal', condicion, corre, rotulo, sub }: PropsSimbolo) {
  const c = cuerpoDe(estado, corre)
  return (
    <g data-kit="valvula" data-estado={estado}>
      <path d={`M${x - 12} ${y - 7} L${x + 12} ${y + 7} V${y - 7} L${x - 12} ${y + 7}Z`} {...c} strokeLinejoin="round" />
      <line x1={x} x2={x} y1={y} y2={y - 14} stroke={c.stroke} strokeWidth={1.5} strokeDasharray={c.strokeDasharray} />
      <line x1={x - 6} x2={x + 6} y1={y - 14} y2={y - 14} stroke={c.stroke} strokeWidth={1.5} />
      <MarcaEn x={x - 26} y={y - 22} estado={estado} condicion={condicion} />
      <Rotulos x={x} y={y + 24} rotulo={rotulo} sub={sub} />
    </g>
  )
}

/** Separador horizontal, de 100 a 120 × 36 a 40: la cápsula con su vertedero. */
export function Separador({ x, y, estado = 'normal', condicion, corre, rotulo, sub, ancho = 112, alto = 40 }: PropsSimbolo & { ancho?: number; alto?: number }) {
  const c = cuerpoDe(estado, corre)
  const vertedero = estado !== 'sin-dato' && estado !== 'sin-comunicacion'
  return (
    <g data-kit="separador" data-estado={estado}>
      {conAnillo(estado, condicion) && <rect x={x - 5} y={y - 5} width={ancho + 10} height={alto + 10} rx={alto / 2 + 5} fill="none" stroke={COLOR_CONDICION[condicion!]} strokeWidth={2} data-anillo="" />}
      <rect x={x} y={y} width={ancho} height={alto} rx={alto / 2} {...c} />
      {vertedero && <line x1={x + ancho * 0.66} x2={x + ancho * 0.66} y1={y + alto * 0.45} y2={y + alto - 2}
        stroke={c.fill === 'var(--eq-parado)' ? 'var(--eq-marcha)' : 'var(--eq-trazo)'} strokeWidth={1.5} />}
      <MarcaEn x={x - 14} y={y - 16} estado={estado} condicion={condicion} />
      <Rotulos x={x + ancho / 2} y={y + alto + 18} rotulo={rotulo} sub={sub} />
    </g>
  )
}

/** Pozo, 24 × 36: el árbol sobre la raya del suelo. */
export function Pozo({ x, y, estado = 'normal', condicion, corre, rotulo, sub }: PropsSimbolo) {
  const c = cuerpoDe(estado, corre)
  return (
    <g data-kit="pozo" data-estado={estado}>
      <line x1={x - 16} x2={x + 16} y1={y} y2={y} stroke="var(--tinta3)" strokeWidth={1.5} />
      <rect x={x - 6} y={y - 30} width={12} height={30} {...c} />
      <rect x={x - 12} y={y - 20} width={24} height={6} {...c} />
      <rect x={x - 8} y={y - 36} width={16} height={6} {...c} />
      <MarcaEn x={x - 28} y={y - 46} estado={estado} condicion={condicion} />
      <Rotulos x={x} y={y + 18} rotulo={rotulo} sub={sub} />
    </g>
  )
}

/** Medidor, Ø 40: la burbuja de ISA-5.1, las letras arriba (FI, PI, PDI), el lazo abajo y el
 *  valor afuera, a 14 px en la mono. Sin comunicación: «---», nunca el último valor. */
export function Medidor({ x, y, estado = 'normal', condicion, letras, lazo, valor, unidad, decimales = 0, lado = 'derecha' }: Omit<PropsSimbolo, 'rotulo' | 'sub' | 'corre'> & {
  letras: string
  lazo: string
  valor: number | null
  unidad?: string
  decimales?: number
  lado?: 'derecha' | 'izquierda' | 'arriba' | 'abajo'
}) {
  const r = 20, sc = estado === 'sin-comunicacion', sd = estado === 'sin-dato'
  const texto = valorEscrito(estado, valor, decimales)
  const color = estado === 'parado' || sc || sd ? 'var(--tinta2)' : 'var(--tinta)'
  const pos = { derecha: { x: x + r + 6, y: y + 5, a: 'start' }, izquierda: { x: x - r - 6, y: y + 5, a: 'end' }, arriba: { x, y: y - r - 8, a: 'middle' }, abajo: { x, y: y + r + 18, a: 'middle' } }[lado]
  return (
    <g data-kit="medidor" data-estado={estado}>
      <circle cx={x} cy={y} r={r} fill={sd || sc ? 'none' : 'var(--panel)'} strokeWidth={estado === 'anormal' ? 2 : 1.5}
        stroke={sc ? 'var(--sincom)' : sd ? 'var(--tinta3)' : estado === 'anormal' ? 'var(--tinta)' : 'var(--tinta2)'}
        strokeDasharray={sc || sd ? '3 2.5' : undefined} />
      <line x1={x - r} x2={x + r} y1={y} y2={y} stroke="var(--tinta3)" strokeWidth={1} />
      <text x={x} y={y - 5} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--tinta2)" fontFamily="var(--font-cond)">{letras}</text>
      <text x={x} y={y + 14} textAnchor="middle" fontSize={12} fill="var(--tinta3)" fontFamily="var(--font-cond)">{lazo}</text>
      <text x={pos.x} y={pos.y} textAnchor={pos.a as 'start' | 'end' | 'middle'} fontSize={14} fontWeight={estado === 'anormal' ? 700 : 600} fill={color} fontFamily="var(--font-mono)">
        {texto}{unidad && <tspan fontSize={12} fontWeight={400} fill="var(--tinta2)"> {unidad}</tspan>}
      </text>
      <MarcaEn x={x - r - 8} y={y - r - 6} estado={estado} condicion={condicion} />
    </g>
  )
}

/** Área de proceso (un tramo: pozos, planta, salida), de 96 a 150 × 40 a 44, radio 2. */
export function Area({ x, y, estado = 'normal', condicion, corre, texto, ancho = 120, alto = 44 }: Omit<PropsSimbolo, 'rotulo' | 'sub'> & { texto: string; ancho?: number; alto?: number }) {
  const c = cuerpoDe(estado, corre ?? true)
  return (
    <g data-kit="area" data-estado={estado}>
      <rect x={x} y={y} width={ancho} height={alto} rx={2} {...c} fill={estado === 'anormal' ? 'var(--panel)' : c.fill} />
      <MarcaEn x={x - 7} y={y - 7} estado={estado} condicion={condicion} />
      <text x={x + ancho / 2} y={y + alto / 2 + 5} textAnchor="middle" fontSize={14} fontWeight={600}
        // La letra contra el relleno, por brillo: oscura sobre lo claro y clara sobre lo oscuro, en los dos temas.
        fill={estado === 'anormal' || c.fill === 'none' ? 'var(--tinta)' : c.fill === 'var(--eq-parado)' ? 'var(--eq-marcha)' : 'var(--eq-parado)'}>{texto}</text>
    </g>
  )
}

/** 4 · Una línea por fluido: el trazo de la app (Planta.tsx, `TRAZO`), en --dato1, con una
 *  flecha fija de 8 px al final. El fluido se distingue por el trazo y su rótulo, nunca por el
 *  color ni por una animación. Sin flujo: el mismo trazo en --dato3 al 55 %. */
export function Linea({ puntos, fluido, sinFlujo = false, flecha = true }: {
  puntos: ReadonlyArray<readonly [number, number]>
  fluido: Fluido
  sinFlujo?: boolean
  flecha?: boolean
}) {
  const f = TRAZO_FLUIDO[fluido], color = sinFlujo ? 'var(--dato3)' : 'var(--dato1)'
  const d = puntos.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ')
  const a = puntos.at(-2), b = puntos.at(-1)
  const angulo = a && b ? (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI : 0
  return (
    <g data-kit="linea" data-fluido={fluido} data-sin-flujo={sinFlujo ? '' : undefined} opacity={sinFlujo ? 0.55 : undefined}>
      <path d={d} fill="none" stroke={color} strokeWidth={f.ancho} strokeDasharray={f.dash} strokeLinejoin="miter" />
      {flecha && b && <path d="M0 -4.5 L8 0 L0 4.5Z" fill={color} transform={`translate(${b[0]} ${b[1]}) rotate(${angulo}) translate(-8 0)`} />}
    </g>
  )
}

/** El <svg> de un esquema, con su nombre accesible (cada gráfica lleva `role="img"`). */
export function Esquema({ ancho, alto, etiqueta, children, className }: { ancho: number; alto: number; etiqueta: string; children: ReactNode; className?: string }) {
  return (
    <svg width={ancho} height={alto} viewBox={`0 0 ${ancho} ${alto}`} role="img" aria-label={etiqueta} data-kit="esquema"
      className={cn('block h-auto max-w-full overflow-visible', className)}>
      {children}
    </svg>
  )
}
