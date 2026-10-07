import type { ReactNode } from 'react'
import { n0 } from '@/shared/lib/formato'
import { Tip, type Fila } from './Tip'
import { FueraDeMeta } from './Prioridad'

/** Real contra meta (o contra máximo): la cifra, su barra y la raya de la meta
 *  con su número, en vez de una frase. ISA-101: la barra es gris siempre; lo
 *  que se sale lo dice el cuadrado P3 (`FueraDeMeta`) junto a la cifra, y eso
 *  lo decide quien llama con su propia cuenta. La raya va al 80 % del ancho
 *  (la misma regla de Portafolio): cabe ver cuánto se pasa, hasta 1,25 veces
 *  la meta; de ahí en adelante la cifra dice cuánto. */
export function BarraMeta({ rotulo, valor, unidad, meta, rotuloMeta, fuera, apoyo, tip, tamano = 'grande', ocultarRotulo, tipoMeta = 'meta', formato = n0 }: {
  /** Cuatro palabras como mucho: «producción», «diferido». */
  rotulo: string
  valor: number
  /** «bbl/d», «bbl». */
  unidad: string
  /** La meta o el máximo firmado. Sin meta: ni raya ni barra, solo la cifra. */
  meta?: number
  /** Junto a la barra: «meta 40.200», «máx. 2.300»; en una tabla, solo «10.900».
   *  Sin meta: la salvedad («sin meta firmada»). */
  rotuloMeta?: string
  /** El cuadrado P3 de fuera de meta. */
  fuera?: boolean
  /** Una línea de apoyo, de unas ocho palabras («+44 % frente a jul a sep»). */
  apoyo?: ReactNode
  /** Globo con los totales y los días. */
  tip?: { titulo: string; filas: Fila[]; pista?: string }
  /** grande: cifra arriba y barra debajo. chica: una línea «cifra ▓▓│░ meta» (filas de una tabla). */
  tamano?: 'grande' | 'chica'
  /** Solo en chica: el rótulo lo da el encabezado de la tabla; el lector lo oye igual. */
  ocultarRotulo?: boolean
  /** Lo que es la raya, para el lector: una meta (hay que pasarla) o un máximo (hay que quedarse antes). */
  tipoMeta?: 'meta' | 'máximo'
  formato?: (v: number) => string
}) {
  const conBarra = meta !== undefined && meta > 0
  const ancho = conBarra ? Math.min(1.25, valor / meta) / 1.25 : 0
  const barra = conBarra && (
    <span aria-hidden data-barra="" className="relative block h-2 min-w-[32px] overflow-hidden rounded-sm border border-[var(--linea2)] bg-[var(--panel2)]">
      <i data-relleno="" className="block h-full bg-[var(--dato-2)]" style={{ width: `${ancho * 100}%` }} />
      <i data-raya="" className="absolute -inset-y-[2px] left-[80%] w-[2px] bg-[var(--tinta)]" />
    </span>
  )

  if (tamano === 'chica') {
    const leido = `${rotulo}: ${formato(valor)} ${unidad}${rotuloMeta ? `, ${conBarra ? `${tipoMeta} ` : ''}${rotuloMeta}` : ''}`
      + (fuera ? (tipoMeta === 'máximo' ? ', por encima del máximo' : ', por debajo de la meta') : '')
    // En una tabla, cifra y meta van en columnas de ancho fijo: así cada barra
    // empieza y termina donde la de la fila de arriba y la raya cae en el mismo lugar.
    return (
      <span role={ocultarRotulo ? 'img' : undefined} aria-label={ocultarRotulo ? leido : undefined}
        className={`tabular grid min-w-0 items-center gap-x-1.5 text-[12px] ${ocultarRotulo ? 'grid-cols-[4.25rem_minmax(32px,1fr)_2.75rem]' : 'grid-cols-[auto_minmax(32px,1fr)_auto]'}`}>
        <span className={`inline-flex items-center ${ocultarRotulo ? 'justify-end' : ''}`}>
          {!ocultarRotulo && <span className="mr-1 text-[var(--tinta3)]">{rotulo}</span>}
          <FueraDeMeta si={fuera} tamano={11} />{formato(valor)}
        </span>
        {barra || <span />}
        <small className="text-[10.5px] text-[var(--tinta3)]">{rotuloMeta}</small>
      </span>
    )
  }

  const cuerpo = (
    <>
      <small className="block text-[10.5px] text-[var(--tinta3)]">{rotulo}</small>
      <b className="tabular flex items-center text-[20px] leading-none">
        <FueraDeMeta si={fuera} tamano={12} />{formato(valor)}
        <small className="ml-1 text-[11px] font-normal text-[var(--tinta3)]">{unidad}</small>
      </b>
      {barra && <span className="mt-1.5 block">{barra}</span>}
      {rotuloMeta && <small className="tabular mt-0.5 block text-right text-[10.5px] text-[var(--tinta3)]">{rotuloMeta}</small>}
      {apoyo && <small className="block text-[10.5px] text-[var(--tinta2)]">{apoyo}</small>}
    </>
  )
  return tip
    ? <Tip titulo={tip.titulo} filas={tip.filas} pista={tip.pista} imprimir="todo" className="block min-w-0">{cuerpo}</Tip>
    : <div className="min-w-0">{cuerpo}</div>
}
