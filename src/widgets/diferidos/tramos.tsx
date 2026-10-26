import type { ReactNode } from 'react'
import { CHOKES_Y_SIN_ASIGNAR, type ChokeOSinAsignar } from '@/shared/api/choke'
import { cn } from '@/shared/lib/cn'
import { pctParte } from '@/shared/lib/formato'
import { CORTO_TRAMO, LARGO_TRAMO, RELLENO, conBarriles } from './reparto'

/* «¿Dónde se trabó?» de un período, en barra (U2 §2.3, §7.4 y §9.2). Lo
   comparten el Resumen del gerente y Diferidos: la misma barra, las mismas
   palabras y el mismo orden en todas partes (el de la tubería: yacimiento,
   pozos, planta, afuera y, aparte, lo sin identificar). Aquí no se calcula
   nada: se dibuja el reparto que da el motor (`useRepartoChoke`,
   `useTuberia`, `useRepartoMensual`).

   ISA-101: todo en grises de distinta luminancia (el tramo que más pesa no
   es una alarma); «sin identificar» va rayado y con borde discontinuo, como
   todo lo que falta (U1 §2.1). Ninguna marca es solo color: cada tramo lleva
   su palabra encima (si cabe) y su cifra en la línea de abajo. Las palabras y
   los rellenos están en reparto.ts. */

/** Los dibujos de cada tramo para un SVG (los mismos de `RELLENO`): se ponen una
 *  vez en sus `<defs>` y cada barra usa `rellenoSvg`. */
export function PatronesTramo({ id }: { id: string }) {
  return (
    <>
      <pattern id={`pl-${id}`} width="4" height="4" patternUnits="userSpaceOnUse">
        <rect width="4" height="4" fill="var(--dato-3)" /><line x1="0" y1="0.5" x2="4" y2="0.5" stroke="var(--panel)" strokeWidth="1" />
      </pattern>
      <pattern id={`af-${id}`} width="4" height="4" patternUnits="userSpaceOnUse">
        <rect width="4" height="4" fill="var(--dato-3)" /><circle cx="2" cy="2" r="0.95" fill="var(--panel)" />
      </pattern>
      <pattern id={`sin-${id}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="5" height="5" fill="var(--panel)" /><line x1="0" y1="0" x2="0" y2="5" stroke="var(--tinta3)" strokeWidth="1.5" />
      </pattern>
    </>
  )
}
/** La muestra de un tramo en una leyenda. */
export function Muestra({ k, tamano = 10 }: { k: ChokeOSinAsignar; tamano?: number }) {
  return (
    <i aria-hidden className={cn('inline-block shrink-0 rounded-[1px]', k === 'sin-asignar' && 'border border-dashed border-[var(--tinta3)]')}
      style={{ width: tamano, height: tamano, background: RELLENO[k] }} />
  )
}

/** La leyenda de las barras de tramos, con las cinco palabras (U2 §9.2). */
export function LeyendaTramos({ className, extra }: { className?: string; extra?: ReactNode }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[13px] text-[var(--tinta2)]', className)} data-leyenda-tramos>
      {CHOKES_Y_SIN_ASIGNAR.map(k => (
        <span key={k} className="inline-flex items-center gap-1.5"><Muestra k={k} />{LARGO_TRAMO[k]}</span>
      ))}
      {extra}
    </div>
  )
}

/** La barra de un período partida por tramo: el largo de cada segmento es su
 *  parte de los barriles. Encima, la palabra de cada segmento que tenga lugar
 *  para ella (la cifra de todos va en la línea de abajo, que pone quien llama).
 *  `data-bbl` lleva la cifra exacta de cada segmento: con ella se comprueba
 *  que la barra suma el diferido del libro. */
export function BarraTramos({ valores, leido, alto = 'h-3', palabras = true, conParte = false, className }: {
  valores: Partial<Record<ChokeOSinAsignar, number>>
  /** Lo que oye el lector: la barra es una imagen con su frase. */
  leido: string
  alto?: string
  /** Las palabras encima de cada segmento (en una barra chica de una tabla, no). */
  palabras?: boolean
  /** Con la parte de cada tramo junto a su palabra («pozos 87 %»); la de un segmento sin
   *  lugar va al lado de la barra, no se pierde (B-13; U2 §9.2). */
  conParte?: boolean
  className?: string
}) {
  const ks = conBarriles(valores)
  const total = ks.reduce((a, k) => a + (valores[k] ?? 0), 0)
  const parte = (k: ChokeOSinAsignar) => (total > 0 ? ((valores[k] ?? 0) / total) * 100 : 0)
  const palabra = (k: ChokeOSinAsignar) => `${CORTO_TRAMO[k]}${conParte ? ` ${pctParte(parte(k))}` : ''}`
  // Lo que no cabe encima de su segmento va al lado, con su parte. Con la parte escrita
  // («planta 13 %») la palabra es más larga: necesita un quinto de la barra, o en el
  // teléfono se cortaba («planta 13…»).
  const umbral = conParte ? 20 : 12
  const sinLugar = conParte ? ks.filter(k => parte(k) < umbral) : []
  return (
    <div className={cn('min-w-0', className)} role="img" aria-label={leido} data-barra-tramos="" data-bbl={total}>
      {palabras && ks.length > 0 && (
        // La palabra solo donde cabe (un segmento de más de una octava parte); si no, la dice la línea de abajo.
        // Sin `shrink-0`: el píxel de cada separación se lo quitan los segmentos, nada se sale de la barra.
        <div aria-hidden className="flex gap-px pb-0.5">
          {ks.map(k => (
            <span key={k} className="block min-w-0 truncate text-[12px] leading-tight text-[var(--tinta2)]" style={{ width: `${parte(k)}%` }}>
              {parte(k) >= umbral ? palabra(k) : ''}
            </span>
          ))}
        </div>
      )}
      <div className={cn('flex gap-px overflow-hidden rounded-sm border border-[var(--linea2)] bg-[var(--panel)]', alto)}>
        {ks.length === 0
          ? <i className="block h-full w-full bg-[var(--panel2)]" />
          : ks.map(k => (
            <i key={k} data-tramo={k} data-bbl={valores[k]}
              className={cn('block h-full min-w-0', k === 'sin-asignar' && 'outline-1 -outline-offset-1 outline-dashed outline-[var(--tinta3)]')}
              style={{ width: `${parte(k)}%`, background: RELLENO[k] }} />
          ))}
      </div>
      {palabras && sinLugar.length > 0 && (
        <span aria-hidden className="mt-0.5 flex flex-wrap gap-x-2 text-[12px] leading-tight text-[var(--tinta2)]">
          {sinLugar.map(k => <span key={k} className="inline-flex items-center gap-1"><Muestra k={k} tamano={8} />{palabra(k)}</span>)}
        </span>
      )}
    </div>
  )
}
