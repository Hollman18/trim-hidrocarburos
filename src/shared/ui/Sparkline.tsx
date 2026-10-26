import type { Severidad } from '@/entities/tipos'
import { trazoConHuecos } from '@/shared/lib/trazo'

/** Minigráfica para variables continuas. Un estado discreto no lleva gráfica.
 *  La banda puede ser abierta por un lado («< 85» no tiene piso): el lado
 *  infinito se dibuja hasta el borde y nunca cuenta como desviación. Los
 *  valores van a paso fijo (el de la serie del historiador); un hueco (null)
 *  corta la línea en su lugar: no se une por encima ni se pinta en cero. */
export function Sparkline({ serie, limite, alto = 28, ancho = 150, prioridad }: {
  serie: ReadonlyArray<number | null>; limite?: [number, number]; alto?: number; ancho?: number
  /** La que reporta el instrumento. Si no viene y el valor está fuera de
   *  banda, es un aviso (3): fuera de banda no es por sí solo una alarma. */
  prioridad?: Severidad
}) {
  const medidos = serie.filter((v): v is number => v !== null)
  if (serie.length < 2 || medidos.length < 2) return null
  const topes = (limite ?? []).filter(v => Number.isFinite(v))
  const min = Math.min(...medidos, ...topes)
  const max = Math.max(...medidos, ...topes)
  const rango = max - min || 1
  const x = (i: number) => (i / (serie.length - 1)) * (ancho - 4) + 2
  const y = (v: number) => alto - 3 - ((Math.min(Math.max(v, min), max) - min) / rango) * (alto - 6)
  const d = trazoConHuecos(serie, x, y)
  // El estado se marca en la última lectura que hay, en su lugar.
  const ultimo = medidos.at(-1)!, iUltimo = serie.lastIndexOf(ultimo)
  const fuera = !!limite && (
    (Number.isFinite(limite[0]) && ultimo < limite[0]) ||
    (Number.isFinite(limite[1]) && ultimo > limite[1]))
  // Banda cerrada → rectángulo. Banda abierta por un lado → solo la raya del
  // tope, y únicamente si cae dentro de lo que se está dibujando: pintar un
  // bloque de borde a borde no dice nada.
  const cerrada = !!limite && limite.every(v => Number.isFinite(v))
  const tope = limite?.find(v => Number.isFinite(v) && v > min && v < max)
  return (
    <svg width={ancho} height={alto} className="block" aria-hidden>
      {cerrada && limite && (
        <rect x={2} y={y(limite[1])} width={ancho - 4} height={Math.max(y(limite[0]) - y(limite[1]), 1)}
          fill="var(--tinta3)" opacity={0.15} />
      )}
      {!cerrada && tope !== undefined && (
        <line x1={2} x2={ancho - 2} y1={y(tope)} y2={y(tope)}
          stroke="var(--tinta3)" strokeWidth={1} strokeDasharray="3 2" opacity={0.6} />
      )}
      {/* ISA-101: la tendencia es gris siempre. Lo anormal se marca en el
          último punto con la forma y el color de su prioridad. */}
      <path d={d} fill="none" stroke="var(--dato-1)" strokeWidth={1.6} />
      {(() => {
        const s = prioridad ?? (fuera ? 3 : 0)
        const cx = x(iUltimo), cy = y(ultimo)
        if (!s) return <circle cx={cx} cy={cy} r={2.4} fill="var(--dato-1)" />
        const f = `var(--p${s})`
        return s === 1 ? <path d={`M${cx} ${cy - 4.6} L${cx + 4.6} ${cy} L${cx} ${cy + 4.6} L${cx - 4.6} ${cy} Z`} fill={f} />
          // El triángulo y el cuadrado amarillos no se distinguen del panel sin trazo (1,7:1): llevan el borde oscuro de MarcaPrioridad.
          : s === 2 ? <path d={`M${cx} ${cy - 4.6} L${cx + 4.8} ${cy + 3.6} L${cx - 4.8} ${cy + 3.6} Z`} fill={f} stroke="var(--marca-trazo)" strokeWidth={1} strokeLinejoin="round" />
          // El amarillo no se distingue del panel sin trazo (1,6:1): lleva el borde oscuro de MarcaPrioridad.
          : <rect x={cx - 3.8} y={cy - 3.8} width={7.6} height={7.6} rx={0.8} fill={f} stroke="var(--marca-trazo)" strokeWidth={1} />
      })()}
    </svg>
  )
}

/** C4 · La minitendencia del nivel 3 (X5 §5.4; X2 §5.3): las lecturas de la
 *  ventana (12 días) sobre la MISMA escala fija del indicador, la banda normal
 *  sombreada y el último punto. La línea en gris de dato; un hueco corta la línea.
 *  Sin texto adentro: se puede dibujar más chica sin bajar de 12 px. */
export function Minitendencia({ serie, escala, banda, ancho = 80, alto = 32, gris = false }: {
  serie: ReadonlyArray<number | null>; escala: [number, number]; banda: [number | null, number | null] | null
  ancho?: number; alto?: number; gris?: boolean
}) {
  if (serie.filter(v => v !== null).length < 2) return null
  const [e0, e1] = escala
  const x = (i: number) => 3 + (i / (serie.length - 1)) * (ancho - 8)
  const y = (v: number) => alto - 4 - ((Math.min(Math.max(v, e0), e1) - e0) / (e1 - e0 || 1)) * (alto - 8)
  const b0 = banda?.[0] ?? e0, b1 = banda?.[1] ?? e1
  const iUlt = serie.reduce<number>((a, v, i) => (v !== null ? i : a), -1)
  const color = gris ? 'var(--tinta3)' : 'var(--dato1)'
  return (
    <svg width={ancho} height={alto} viewBox={`0 0 ${ancho} ${alto}`} aria-hidden className="block shrink-0">
      {banda && <rect x={2} y={y(b1)} width={ancho - 4} height={Math.max(y(b0) - y(b1), 1)} fill="var(--banda)" opacity={0.55} />}
      <path d={trazoConHuecos(serie, x, y)} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      {iUlt >= 0 && <circle cx={x(iUlt)} cy={y(serie[iUlt]!)} r={3} fill={color} />}
    </svg>
  )
}

/** C4 · La tendencia grande (X5 §5.4: «gráficas chicas iguales, una por variable»;
 *  X2 §5.3): la banda, la alarma en discontinuo, la escala fija que no cambia y el
 *  último punto. Los rótulos (la ventana escrita y los valores) van fuera del
 *  dibujo, en HTML: así el dibujo se estira sin que su letra baje de 12 px. */
export function TendenciaFija({ serie, escala, banda, alarmas, alto = 64 }: {
  serie: ReadonlyArray<number | null>; escala: [number, number]; banda: [number | null, number | null] | null
  alarmas: readonly number[]; alto?: number
}) {
  const A = 300
  const [e0, e1] = escala
  const x = (i: number) => 2 + (i / Math.max(1, serie.length - 1)) * (A - 6)
  const y = (v: number) => alto - 3 - ((Math.min(Math.max(v, e0), e1) - e0) / (e1 - e0 || 1)) * (alto - 8)
  const b0 = banda?.[0] ?? e0, b1 = banda?.[1] ?? e1
  const iUlt = serie.reduce<number>((a, v, i) => (v !== null ? i : a), -1)
  return (
    <div className="relative" aria-hidden>
      <svg viewBox={`0 0 ${A} ${alto}`} preserveAspectRatio="none" className="block w-full" style={{ height: alto }}>
        {banda && <rect x={2} y={y(b1)} width={A - 4} height={Math.max(y(b0) - y(b1), 1)} fill="var(--banda)" opacity={0.55} />}
        {alarmas.map(a => <line key={a} x1={2} x2={A - 2} y1={y(a)} y2={y(a)} stroke="var(--tinta2)" strokeWidth={1.3} strokeDasharray="4 3" vectorEffect="non-scaling-stroke" data-alarma />)}
        <line x1={2} x2={A - 2} y1={alto - 1} y2={alto - 1} stroke="var(--linea)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <path d={trazoConHuecos(serie, x, y)} fill="none" stroke="var(--dato1)" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      {/* El último punto, en HTML: estirado con el dibujo se volvería un óvalo. */}
      {iUlt >= 0 && <i className="absolute block size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--dato1)]"
        style={{ left: `${(x(iUlt) / A) * 100}%`, top: y(serie[iUlt]!) }} />}
    </div>
  )
}
