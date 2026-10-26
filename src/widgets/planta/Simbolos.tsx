import type { Simbolo } from '@/entities/planta'

/** Símbolos de proceso dibujados como lo que son, no como cajas: el
 *  separador es un recipiente horizontal, la bomba lleva su triángulo y el
 *  tanque se llena de verdad con el nivel que da el instrumento.
 *  Todo se dibuja centrado en (0,0); la etiqueta va debajo. */

const T = 'var(--eq-trazo)'
const F = 'var(--eq-off)'
const A = 'var(--eq-on)'

const Valvula = ({ x, y, r = 5 }: { x: number; y: number; r?: number }) => (
  <g transform={`translate(${x},${y})`}>
    <path d={`M${-r},${-r} L${r},${r} L${r},${-r} L${-r},${r} Z`} fill={A} stroke={T} strokeWidth={1.1} />
  </g>
)

const Pozos = () => (
  <g>
    {[-30, 0, 30].map((dx, i) => (
      <g key={dx} transform={`translate(${dx},0)`} opacity={i === 1 ? 1 : 0.72}>
        <rect x={-9} y={-24} width={18} height={9} fill={A} stroke={T} strokeWidth={1.2} />
        <line x1={0} y1={-15} x2={0} y2={16} stroke={T} strokeWidth={2.2} />
        <line x1={-11} y1={-6} x2={11} y2={-6} stroke={T} strokeWidth={1.6} />
        <Valvula x={0} y={4} r={4.5} />
        <path d="M-13,16 h26" stroke={T} strokeWidth={1.4} />
        <path d="M-13,20 h26 M-11,24 h22 M-8,28 h16" stroke={T} strokeWidth={1} opacity={0.5} />
      </g>
    ))}
  </g>
)

const Manifold = () => (
  <g>
    <rect x={-42} y={-6} width={84} height={13} rx={3} fill={F} stroke={T} strokeWidth={1.4} />
    {[-30, -10, 10, 30].map(dx => (
      <g key={dx}>
        <line x1={dx} y1={-26} x2={dx} y2={-6} stroke={T} strokeWidth={1.5} />
        <Valvula x={dx} y={-18} r={4.5} />
      </g>
    ))}
    <line x1={42} y1={0} x2={54} y2={0} stroke={T} strokeWidth={1.8} />
  </g>
)

const Separador = () => (
  <g>
    <rect x={-44} y={-19} width={88} height={38} rx={19} fill={F} stroke={T} strokeWidth={1.5} />
    <ellipse cx={-44} cy={0} rx={8} ry={19} fill={A} stroke={T} strokeWidth={1.3} />
    <line x1={-36} y1={6} x2={36} y2={6} stroke={T} strokeWidth={1.1} strokeDasharray="4 3" opacity={0.8} />
    <line x1={-36} y1={-4} x2={36} y2={-4} stroke={T} strokeWidth={1} opacity={0.45} />
    <circle cx={20} cy={1} r={7} fill="none" stroke={T} strokeWidth={1.1} />
    {/* El transmisor de nivel: la burbuja de ISA-5.1 con su raya (montado en tablero), dibujada y no escrita: una letra de 7 unidades no se lee (X5 §3.4). */}
    <line x1={13} y1={1} x2={27} y2={1} stroke={T} strokeWidth={1} />
    <line x1={-14} y1={-19} x2={-14} y2={-28} stroke={T} strokeWidth={1.5} />
    <line x1={10} y1={19} x2={10} y2={28} stroke={T} strokeWidth={1.5} />
  </g>
)

const Depurador = () => (
  <g>
    <rect x={-17} y={-26} width={34} height={52} rx={16} fill={F} stroke={T} strokeWidth={1.5} />
    <line x1={-13} y1={-8} x2={13} y2={-8} stroke={T} strokeWidth={1.2} strokeDasharray="3 2.5" />
    <line x1={-13} y1={-13} x2={13} y2={-13} stroke={T} strokeWidth={1.2} strokeDasharray="3 2.5" />
    <path d="M-9,14 q9,7 18,0" fill="none" stroke={T} strokeWidth={1.1} opacity={0.7} />
    <line x1={0} y1={-26} x2={0} y2={-34} stroke={T} strokeWidth={1.5} />
  </g>
)

const Tratador = () => (
  <g>
    <rect x={-40} y={-22} width={80} height={44} rx={22} fill={F} stroke={T} strokeWidth={1.5} />
    <path d="M-26,8 h34" stroke={T} strokeWidth={1.1} strokeDasharray="4 3" opacity={0.75} />
    <circle cx={-22} cy={-2} r={9} fill={A} stroke={T} strokeWidth={1.2} />
    <path d="M-22,4 q-5,-5 -1,-9 q1,4 3,2 q2,4 -2,7 Z" fill={T} opacity={0.55} />
    <line x1={14} y1={-22} x2={14} y2={-30} stroke={T} strokeWidth={1.5} />
    <line x1={-6} y1={22} x2={-6} y2={30} stroke={T} strokeWidth={1.5} />
  </g>
)

/** Sin nivel medido, el tanque va vacío: no se pinta un nivel que nadie leyó. */
const Tanque = ({ nivel, fluido = 'crudo' }: { nivel?: number; fluido?: string }) => {
  const c = `var(--f-${fluido})`
  const h = 44, y0 = -16
  const lleno = nivel === undefined ? 0 : Math.max(0, Math.min(1, nivel)) * h
  return (
    <g>
      <path d={`M-34,${y0} L0,${y0 - 13} L34,${y0} Z`} fill={A} stroke={T} strokeWidth={1.3} />
      <rect x={-34} y={y0} width={68} height={h} fill={F} stroke={T} strokeWidth={1.5} />
      <rect x={-33} y={y0 + h - lleno} width={66} height={lleno} fill={c} opacity={0.42} />
      <line x1={-34} y1={y0 + h - lleno} x2={34} y2={y0 + h - lleno} stroke={c} strokeWidth={1.4} />
      {[0.25, 0.5, 0.75].map(f => (
        <line key={f} x1={28} y1={y0 + h * f} x2={34} y2={y0 + h * f} stroke={T} strokeWidth={0.9} opacity={0.5} />
      ))}
      <line x1={-34} y1={y0 + h} x2={34} y2={y0 + h} stroke={T} strokeWidth={2} />
    </g>
  )
}

const Medicion = () => (
  <g>
    <rect x={-40} y={-20} width={80} height={40} rx={4} fill={F} stroke={T} strokeWidth={1.5} />
    <circle cx={-16} cy={0} r={12} fill={A} stroke={T} strokeWidth={1.3} />
    {/* «M», dibujada (no texto): la letra del medidor no baja de los 12 px que pide X5 §3.4 porque no es letra. */}
    <path d="M-21,5 V-5 L-16,1 L-11,-5 V5" fill="none" stroke={T} strokeWidth={1.4} strokeLinejoin="round" strokeLinecap="round" />
    <path d="M6,-10 a11,11 0 1,1 0,20" fill="none" stroke={T} strokeWidth={1.3} />
    <Valvula x={24} y={0} r={5} />
    <line x1={-40} y1={0} x2={-52} y2={0} stroke={T} strokeWidth={1.8} />
    <line x1={40} y1={0} x2={52} y2={0} stroke={T} strokeWidth={1.8} />
  </g>
)

const Compresor = () => (
  <g>
    <path d="M-30,-20 L14,-11 L14,11 L-30,20 Z" fill={F} stroke={T} strokeWidth={1.5} />
    <circle cx={-8} cy={0} r={8} fill={A} stroke={T} strokeWidth={1.2} />
    <path d="M-8,-8 v16 M-16,0 h16" stroke={T} strokeWidth={1} opacity={0.7} />
    <rect x={16} y={-13} width={22} height={26} rx={3} fill={A} stroke={T} strokeWidth={1.3} />
    {/* El motor del compresor: «M» dibujada, no escrita. */}
    <path d="M23,4 V-4 L27,1 L31,-4 V4" fill="none" stroke={T} strokeWidth={1.3} strokeLinejoin="round" strokeLinecap="round" />
    <line x1={-30} y1={0} x2={-44} y2={0} stroke={T} strokeWidth={1.8} />
  </g>
)

const Bomba = () => (
  <g>
    <circle cx={0} cy={-2} r={20} fill={F} stroke={T} strokeWidth={1.5} />
    <path d="M-8,-12 L12,-2 L-8,8 Z" fill={A} stroke={T} strokeWidth={1.2} />
    <path d="M-26,22 L26,22 L20,14 L-20,14 Z" fill={A} stroke={T} strokeWidth={1.2} />
    <line x1={-20} y1={-2} x2={-34} y2={-2} stroke={T} strokeWidth={1.8} />
    <line x1={0} y1={-22} x2={0} y2={-32} stroke={T} strokeWidth={1.8} />
  </g>
)

const Inyeccion = () => (
  <g>
    <line x1={-38} y1={6} x2={38} y2={6} stroke={T} strokeWidth={1.6} />
    {[-30, -15, 0, 15, 30].map(dx => (
      <line key={dx} x1={dx} y1={6} x2={dx - 7} y2={16} stroke={T} strokeWidth={1} opacity={0.55} />
    ))}
    {[-18, 0, 18].map(dx => (
      <g key={dx}>
        <rect x={dx - 7} y={-26} width={14} height={8} fill={A} stroke={T} strokeWidth={1.1} />
        <line x1={dx} y1={-18} x2={dx} y2={6} stroke={T} strokeWidth={1.8} />
        <path d={`M${dx - 4},-4 L${dx},2 L${dx + 4},-4`} fill="none" stroke="var(--f-agua)" strokeWidth={1.6} />
      </g>
    ))}
  </g>
)

const Tea = () => (
  <g>
    <path d="M-8,22 L-5,-12 L5,-12 L8,22 Z" fill={F} stroke={T} strokeWidth={1.4} />
    <path d="M0,-14 q-9,-6 -3,-16 q1,7 5,4 q4,7 -2,12 Z" fill={T} opacity={0.5} stroke={T} strokeWidth={1} />
    <line x1={-14} y1={16} x2={14} y2={16} stroke={T} strokeWidth={1} opacity={0.5} />
    <line x1={-14} y1={4} x2={14} y2={4} stroke={T} strokeWidth={1} opacity={0.5} />
  </g>
)

const Subestacion = () => (
  <g>
    <circle cx={-9} cy={0} r={14} fill="none" stroke={T} strokeWidth={1.5} />
    <circle cx={9} cy={0} r={14} fill="none" stroke={T} strokeWidth={1.5} />
    <line x1={-34} y1={-22} x2={34} y2={-22} stroke={T} strokeWidth={2.4} />
    <line x1={0} y1={-22} x2={0} y2={-14} stroke={T} strokeWidth={1.3} />
    <line x1={0} y1={14} x2={0} y2={24} stroke={T} strokeWidth={1.3} />
    <line x1={-26} y1={24} x2={26} y2={24} stroke="var(--f-elec)" strokeWidth={2.4} />
  </g>
)

const Aire = () => (
  <g>
    <rect x={-6} y={-14} width={42} height={26} rx={13} fill={F} stroke={T} strokeWidth={1.4} />
    <ellipse cx={-6} cy={-1} rx={6} ry={13} fill={A} stroke={T} strokeWidth={1.1} />
    <path d="M-36,-14 L-12,-6 L-12,8 L-36,16 Z" fill={A} stroke={T} strokeWidth={1.3} />
    <circle cx={-24} cy={1} r={6} fill="none" stroke={T} strokeWidth={1} />
    <line x1={15} y1={12} x2={15} y2={24} stroke={T} strokeWidth={1.4} />
    <line x1={-14} y1={24} x2={34} y2={24} stroke="var(--f-aire)" strokeWidth={2.2} strokeDasharray="5 3" />
  </g>
)

const Salida = () => (
  <g>
    <line x1={-26} y1={-30} x2={-26} y2={30} stroke={T} strokeWidth={1.2} strokeDasharray="5 4" opacity={0.7} />
    <path d="M-26,0 h30" stroke={T} strokeWidth={2.2} />
    <path d="M4,-9 L24,0 L4,9 Z" fill={A} stroke={T} strokeWidth={1.3} />
  </g>
)

export function Glifo({ simbolo, nivel, fluido }:
  { simbolo: Simbolo; nivel?: number; fluido?: string }) {
  switch (simbolo) {
    case 'pozos': return <Pozos />
    case 'manifold': return <Manifold />
    case 'separador': return <Separador />
    case 'depurador': return <Depurador />
    case 'tratador': return <Tratador />
    case 'tanque': return <Tanque nivel={nivel} fluido={fluido} />
    case 'medicion': return <Medicion />
    case 'compresor': return <Compresor />
    case 'bomba': return <Bomba />
    case 'inyeccion': return <Inyeccion />
    case 'tea': return <Tea />
    case 'subestacion': return <Subestacion />
    case 'aire': return <Aire />
    case 'salida': return <Salida />
  }
}
