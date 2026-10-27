import type { ReactNode } from 'react'
import { useAncho } from '@/widgets/resultados/ancho'
import { Area, Esquema, Linea, type CondicionKit, type EstadoKit } from '@/shared/ui/scada'
import { cn } from '@/shared/lib/cn'
import { Info } from '@/shared/ui/Info'

/** La tubería del campo con el kit SCADA (kit-scada.md §3 y §4; imágenes d1-grafito ger y prod).
 *
 *  Una caja por tramo del choke (`Area`) unida por la línea del crudo (`Linea`), con lo que
 *  dice cada tramo debajo, en HTML (la cifra en tinta y su palabra). Acostada en el
 *  escritorio y de pie en el teléfono: el dibujo nunca se encoge (cada caja es un esquema
 *  de su tamaño), así la letra no baja de 12 px. El tramo que limita lleva «◄ limita»; el
 *  que tiene un equipo anormal, su marca. Un toque en un tramo abre lo suyo (`onTramo`).
 *  La pantalla decide qué tramos y qué dice cada uno: aquí no se calcula nada. */
export interface TramoKit {
  tramo: string
  nombre: string
  /** La cifra del tramo («11.857»), ya en el formato de la pantalla; null = sin cifra. */
  cifra: string | null
  /** La palabra de la cifra: «dan, bbl/d», «caben · sobran 1.143», «no pasan, bbl/d». */
  palabra: ReactNode
  /** Una línea más, chica: «P-201B parada · capacidad sin firmar». */
  nota?: ReactNode
  /** De dónde sale la cifra (la ⓘ): «la suma de lo que dan los pozos con su prueba vigente × el factor de medición firmado…». */
  fuente?: string
  limita?: boolean
  estado?: EstadoKit
  condicion?: CondicionKit
}

const AL = 44
/** El margen de la caja dentro de su dibujo: la marca (14 px) va arriba a la izquierda, afuera del cuerpo, y no se corta. */
const M = 8
/** El ancho de la caja: en el kit, de 96 a 150. */
const ancho = (dePie: boolean) => (dePie ? 112 : 144)
/** Lo que necesita acostada: las cajas y las líneas entre ellas. */
const LINEA = 44

export function TuberiaKit({ tramos, etiqueta, telefono, onTramo, className }: {
  tramos: TramoKit[]; etiqueta: string; telefono: boolean; onTramo?: (tramo: string) => void; className?: string
}) {
  // De pie en el teléfono y donde no cabe acostada (la columna de 400 px del gerente): nunca se encoge.
  const [ref, medido] = useAncho(800)
  const dePie = telefono || medido < tramos.length * ancho(false) + (tramos.length - 1) * LINEA
  const AN = ancho(dePie)
  return (
    <div ref={ref} role="group" aria-label={etiqueta} data-tuberia-kit={tramos.map(t => t.tramo).join(',')} data-de-pie={dePie ? '' : undefined}
      className={cn(dePie ? 'flex flex-col' : 'flex items-start', className)}>
      {tramos.map((t, i) => (
        <div key={t.tramo} className={cn(dePie ? 'flex flex-col' : 'flex items-start')}>
          {i > 0 && (dePie
            ? <span aria-hidden className="block"><Esquema ancho={AN} alto={20} etiqueta=""><Linea puntos={[[M + (AN - M) / 2, 0], [M + (AN - M) / 2, 20]]} fluido="crudo" /></Esquema></span>
            : <span aria-hidden className="mt-[18px] block shrink-0">
              <Esquema ancho={LINEA} alto={AL + M} etiqueta=""><Linea puntos={[[0, M + AL / 2], [LINEA, M + AL / 2]]} fluido="crudo" /></Esquema>
            </span>)}
          <Tramo t={t} dePie={dePie} onTramo={onTramo} />
        </div>
      ))}
    </div>
  )
}

function Tramo({ t, dePie, onTramo }: { t: TramoKit; dePie: boolean; onTramo?: (tramo: string) => void }) {
  const AN = ancho(dePie)
  const caja = (
    <Esquema ancho={AN} alto={AL + M} etiqueta={`${t.nombre}${t.limita ? ', limita' : ''}${t.condicion ? `, ${t.condicion}` : ''}`}>
      <Area x={M} y={M} ancho={AN - M - 1} alto={AL - 1} texto={t.nombre} estado={t.estado ?? 'normal'} condicion={t.condicion} />
    </Esquema>
  )
  const texto = (
    <span className="flex min-w-0 flex-col text-left">
      {t.cifra !== null && <b className="tabular-nums text-[20px] font-bold leading-tight text-[var(--tinta)]">{t.cifra}</b>}
      <span className="text-[14px] leading-snug text-[var(--tinta2)]">{t.palabra}</span>
      {t.nota && <span className="text-[13px] leading-snug text-[var(--tinta2)]">{t.nota}</span>}
    </span>
  )
  const contenido = (
    <>
      {(t.limita || !dePie) && <span className="block h-[18px] text-[13px] font-semibold text-[var(--tinta)]" aria-hidden={!t.limita}>{t.limita ? '◄ limita' : ''}</span>}
      <span className={cn(dePie ? 'grid grid-cols-[auto_1fr] items-center gap-x-3' : 'flex flex-col gap-1.5')}>
        {caja}{texto}
      </span>
    </>
  )
  const clase = cn('block text-left', dePie ? 'w-full' : 'w-[144px] shrink-0')
  // De dónde sale la cifra va en su ⓘ, al lado del tramo y nunca dentro de su botón (un botón no lleva otro adentro).
  const fuente = t.fuente && <Info titulo={`De dónde sale · ${t.nombre}`} texto={t.fuente} className="mt-0.5" />
  const tramo = onTramo
    ? <button type="button" onClick={() => onTramo(t.tramo)} data-tramo-kit={t.tramo} className={cn(clase, 'cursor-pointer rounded-[8px] hover:bg-[var(--panel2)]')}>{contenido}</button>
    : <div data-tramo-kit={t.tramo} className={clase}>{contenido}</div>
  return fuente ? <div className={cn('flex', dePie ? 'items-center gap-2' : 'flex-col items-start')} data-tramo-col={t.tramo}>{tramo}{fuente}</div> : tramo
}
