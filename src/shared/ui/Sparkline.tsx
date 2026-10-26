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
