import { n0 } from '@/shared/lib/formato'
import { FueraDeMeta } from '@/shared/ui/Prioridad'
import { cn } from '@/shared/lib/cn'
import { FichaFlotante, type FilaFicha } from './Ficha'
import { CLASE_FOCO, useFichaPieza } from './cursor'

/* 6 · La barra contra la meta (kit-scada.md §6; X2 §5.2), el compañero gerencial de la cifra: la
   barra oscura (--dato1) llega hasta el valor y la meta o el máximo es una raya de 2 px en tinta,
   que sobresale de la pista (8 px, --pista). La raya va al 80 % del ancho: cabe ver cuánto se pasa,
   hasta 1,25 veces la meta; de ahí en adelante la cifra dice cuánto. Un valor negativo no llena la
   pista (piso en 0, H1). Lo que se sale lo dice el cuadrado ■3 (`fuera`) junto a la cifra, y lo
   decide quien llama con su propia cuenta: la barra no se pinta nunca. Sin meta firmada, ni barra
   ni raya: solo la cifra. En una tabla, la cifra y la meta van en columnas de ancho fijo para que
   cada barra empiece y termine donde la de la fila de arriba.
   D2 · Al pasar el cursor, tocarla o llegar con Tab: la ficha con el valor, la meta o el máximo,
   cuánto falta o cuánto se pasa, y de dónde sale. Dentro de una fila que ya es un botón, no. */

export function ContraMeta({ rotulo, valor, unidad, meta, rotuloMeta, fuera, tipoMeta = 'meta', ocultarRotulo = false, formato = n0, origen, interactiva = true, className }: {
  /** Cuatro palabras como mucho: «producción», «diferido». */
  rotulo: string
  valor: number
  /** «bbl/d», «bbl». */
  unidad: string
  /** La meta o el máximo firmado. Sin meta: ni raya ni barra, solo la cifra. */
  meta?: number
  /** Junto a la barra: «meta 40.200», «máximo 2.300»; en una tabla, solo «10.900». */
  rotuloMeta?: string
  /** El cuadrado ■3 de fuera de meta. */
  fuera?: boolean
  /** Lo que es la raya, para el lector: una meta (hay que pasarla) o un máximo (hay que quedarse antes). */
  tipoMeta?: 'meta' | 'máximo'
  /** En una tabla: el rótulo lo da el encabezado; el lector lo oye igual. */
  ocultarRotulo?: boolean
  formato?: (v: number) => string
  /** D2 · De dónde sale la cifra, para la ficha: «el libro de diferidos, octubre en curso». */
  origen?: string
  /** D2 · false: sin ficha (y sin parada de Tab). */
  interactiva?: boolean
  className?: string
}) {
  const { ref, ancla, props: eventos } = useFichaPieza<HTMLSpanElement>(interactiva)
  const conBarra = meta !== undefined && meta > 0
  const parte = conBarra ? Math.max(0, Math.min(1.25, valor / meta)) / 1.25 : 0
  // «máximo», sin abreviar (G-10): la misma palabra que «máximo firmado» en el resto del producto.
  const rotuloRaya = rotuloMeta?.replace(/(^|\s)máx\.(?=\s)/g, '$1máximo')
  // El rótulo de la raya ya puede decir lo que es («máximo 50»): no se repite la palabra.
  const conPalabra = !!rotuloRaya && new RegExp(`^${tipoMeta}\\b`).test(rotuloRaya)
  const leido = `${rotulo}: ${formato(valor)} ${unidad}${rotuloRaya ? `, ${conBarra && !conPalabra ? `${tipoMeta} ` : ''}${rotuloRaya}` : ''}`
    + (fuera ? (tipoMeta === 'máximo' ? ', por encima del máximo' : ', por debajo de la meta') : '')
  const ficha = () => {
    const d = meta !== undefined ? valor - meta : 0
    const filas: FilaFicha[] = [{ clave: 'valor', nombre: 'Valor', valor: formato(valor), unidad, fuerte: !!fuera,
      nota: fuera ? (tipoMeta === 'máximo' ? 'por encima del máximo' : 'por debajo de la meta') : undefined }]
    if (meta !== undefined) {
      filas.push({ clave: 'meta', nombre: tipoMeta === 'máximo' ? 'Máximo' : 'Meta', valor: formato(meta), unidad })
      filas.push({ clave: 'diferencia', nombre: tipoMeta === 'máximo' ? (d > 0 ? 'Se pasa' : 'Margen') : (d < 0 ? 'Falta' : 'Sobra'), valor: formato(Math.abs(d)), unidad })
    }
    return { titulo: `${rotulo[0]!.toUpperCase()}${rotulo.slice(1)}`, filas,
      pie: [meta === undefined ? (rotuloRaya ? `Sin ${tipoMeta} para dibujar: ${rotuloRaya}` : `Sin ${tipoMeta} firmada: solo la cifra`) : '', origen ? `De dónde sale: ${origen}` : ''].filter(Boolean) }
  }
  return (
    <span ref={ref} role="img" aria-label={leido} data-kit="contra-meta" data-estado={fuera ? 'anormal' : 'normal'} {...eventos}
      className={cn('tabular grid min-w-0 items-center gap-x-1.5 rounded-[4px] text-[14px]', CLASE_FOCO, ocultarRotulo ? 'grid-cols-[4.75rem_minmax(32px,1fr)_3.25rem]' : 'grid-cols-[auto_minmax(32px,1fr)_auto]', className)}>
      <span aria-hidden className={cn('inline-flex items-center', ocultarRotulo && 'justify-end')}>
        {!ocultarRotulo && <span className="mr-1 text-[var(--tinta3)]">{rotulo}</span>}
        <FueraDeMeta si={fuera} tamano={11} />{formato(valor)}
      </span>
      {conBarra ? (
        // La pista de 8 px a lo ancho de su columna; la raya de la meta sobresale 4 px por cada lado.
        <svg width="100%" height={16} aria-hidden data-barra="" className="block min-w-[32px] overflow-visible">
          <rect x={0} y={4} width="100%" height={8} fill="var(--pista)" />
          <rect x={0} y={4} width={`${parte * 100}%`} height={8} fill="var(--dato1)" data-relleno="" />
          <line x1="80%" x2="80%" y1={0} y2={16} stroke="var(--tinta)" strokeWidth={2} data-raya="" />
        </svg>
      ) : <span />}
      <small aria-hidden className="text-[13px] text-[var(--tinta3)]">{rotuloRaya}</small>
      {ancla && <FichaFlotante contenido={ficha()} ancla={ancla} />}
    </span>
  )
}
