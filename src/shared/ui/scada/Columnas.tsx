import { cn } from '@/shared/lib/cn'

/* Las columnas por período (un conteo por mes, apilado por familia): la gráfica de «Fallas por mes»
   con las reglas del kit (kit-scada.md §0). Cada período, una columna desde la raya del piso (1 px
   en --linea); sus partes, apiladas en los grises de dato (--dato-1, --dato-2, --dato-3: nunca un
   color de estado) con 1 px de --panel entre ellas (H21), y la cifra del total arriba de la columna
   (H22). El eje: el período en corto y, en el primero, el último y cada enero, su año. La escala va
   de 0 al período más alto (es un conteo: no tiene banda ni límite). El dibujo no baja de `minimo`
   px (por debajo se desplaza de lado): así su letra de 15 nunca queda de menos de 12 en pantalla.
   Un período sin nada no lleva columna ni cifra; nunca un cero pintado. La leyenda va debajo, con
   el mismo gris de cada parte y su palabra. */

export interface PeriodoColumna {
  /** «2026-09»: la clave del período. */
  clave: string
  /** «sept»: el período en corto, en el eje. */
  rotulo: string
  /** «2026»: el segundo renglón del eje (el año), solo donde hace falta. */
  segundo?: string
  /** Una cifra por parte, en el orden de `partes`. */
  valores: readonly number[]
  /** La cifra de arriba, si no es la suma de las partes (la cuenta del motor: una parte puede no
   *  dibujarse). Sin ella, la suma. */
  total?: number
  /** Los atributos que la pantalla pone en el grupo del período (`data-mes`, `data-fallas`). */
  datos?: { [dato: `data-${string}`]: string | number }
}

const ANCHO = 520, ALTO = 166, PISO = 120, CAMPO = 96
const GRIS = ['var(--dato-1)', 'var(--dato-2)', 'var(--dato-3)'] as const

export function Columnas({ periodos, partes, 'aria-label': etiqueta, titulo, minimo = 420, className, ...datos }: {
  periodos: readonly PeriodoColumna[]
  /** El nombre de cada parte apilada (como mucho 3), para la leyenda y el globo de cada tramo. */
  partes: readonly string[]
  /** La frase del lector, con las cifras: «Fallas … de sept 2025 a oct 2026: 23 fallas en total…». */
  'aria-label': string
  /** El globo de un tramo: «sept 2026 · Bombas de inyección: 2». */
  titulo: (p: PeriodoColumna, parte: string, v: number) => string
  minimo?: number
  className?: string
} & { [dato: `data-${string}`]: string | number | boolean | undefined }) {
  const totales = periodos.map(p => p.total ?? p.valores.reduce((a, b) => a + b, 0))
  const tope = Math.max(1, ...totales)
  const w = 500 / Math.max(1, periodos.length)
  return (
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} role="img" aria-label={etiqueta} data-kit="columnas" data-estado="normal" {...datos}
        className={cn('block h-auto w-full', className)} style={{ minWidth: minimo }}>
        {periodos.map((p, i) => {
          const xx = 14 + i * w, total = totales[i] ?? 0
          let y = PISO
          return (
            <g key={p.clave} {...p.datos}>
              {p.valores.map((v, j) => {
                const h = (v / tope) * CAMPO
                y -= h
                return v > 0 ? <rect key={partes[j] ?? j} x={xx + w * 0.2} y={y} width={w * 0.6} height={h} fill={GRIS[j] ?? GRIS[2]} stroke="var(--panel)" strokeWidth={1}><title>{titulo(p, partes[j] ?? '', v)}</title></rect> : null
              })}
              {total > 0 && <text x={xx + w / 2} y={y - 5} fontSize={15} fontWeight={600} textAnchor="middle" fill="var(--tinta)" className="tabular">{total}</text>}
              <text x={xx + w / 2} y={139} fontSize={15} textAnchor="middle" fill="var(--tinta2)" className="font-cond">{p.rotulo}</text>
              {p.segundo && <text x={xx + w / 2} y={157} fontSize={15} textAnchor="middle" fill="var(--tinta3)" className="font-cond">{p.segundo}</text>}
            </g>
          )
        })}
        <line x1={10} x2={514} y1={PISO} y2={PISO} stroke="var(--linea)" />
      </svg>
  )
}

/** La leyenda de `Columnas`: cada parte con su gris y su palabra. Va fuera del desplazable. */
export function LeyendaColumnas({ partes, className }: { partes: readonly string[]; className?: string }) {
  return (
    <div className={cn('mt-1 flex flex-wrap gap-3 text-[13px] text-[var(--tinta2)]', className)} data-kit="leyenda-columnas">
      {partes.map((p, j) => <span key={p} className="inline-flex items-center gap-1.5"><i aria-hidden className="inline-block size-2.5" style={{ background: GRIS[j] ?? GRIS[2] }} />{p}</span>)}
    </div>
  )
}
