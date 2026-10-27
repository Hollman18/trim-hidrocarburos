import type { Dia } from '@/entities/libro'
import { fechaCorta } from '@/entities/reloj'
import { Tendencia } from '@/shared/ui/scada'
import { n0 } from '@/shared/lib/formato'
import { useAncho } from '@/widgets/resultados/ancho'

/** Producción de cada día con el kit SCADA (kit-scada.md §2): lo que midió el punto de medición
 *  oficial (continua oscura), el potencial del libro (continua clara) y la meta firmada
 *  (discontinua, lo único discontinuo: H18), en bbl/d. Lo que separa lo real del potencial es el diferido. Un día sin
 *  fiscal es un hueco (la línea se corta, nunca en cero); el día de hoy va como tasa y se dice.
 *  La escala sale de la meta firmada (1,3 veces la mayor), no de la lectura: sin meta, provisional. */
export function Diaria({ dias }: { dias: Dia[] }) {
  const [ref, ancho] = useAncho(640)
  const tasa = (d: Dia, v: number) => (d.horas > 0 ? (v * 24) / d.horas : 0)
  const real = dias.map(d => (d.real === null ? null : tasa(d, d.real)))
  const pot = dias.map(d => tasa(d, d.potencial))
  const meta = dias.map(d => (d.meta === null ? null : tasa(d, d.meta)))
  const metas = meta.filter((m): m is number => m !== null)
  const firmada = metas.length > 0
  const tope = redondo((firmada ? Math.max(...metas) : Math.max(1, ...pot)) * 1.3)
  const ultimo = dias.at(-1)
  const parcial = !!ultimo && ultimo.horas < 23.99
  return (
    <div ref={ref} className="w-full" data-diaria={dias.length}>
      <Tendencia titulo="Producción por día" ventana={`${dias.length} ${dias.length === 1 ? 'día' : 'días'}`} unidad="bbl/d"
        ancho={Math.max(240, ancho)} alto={150} escala={{ min: 0, max: tope, firmada }}
        ejeX={dias.length ? [fechaCorta(dias[0]!.dia), `${fechaCorta(ultimo!.dia)}${parcial ? ' · en curso' : ''}`] : undefined}
        series={[
          { nombre: 'Real medido', valores: real },
          { nombre: 'Potencial del libro', valores: pot, trazo: 'continuo' },
          { nombre: 'Meta firmada', valores: meta, trazo: 'discontinuo' },
        ]} />
      <p className="mt-1.5 text-[14px] text-[var(--tinta2)]">
        Oscura: real medido · clara: potencial del libro · discontinua: meta firmada
        {ultimo && real.at(-1) !== null && real.at(-1) !== undefined ? ` · ${parcial ? 'día en curso' : 'último día'}: ${n0(real.at(-1)!)} bbl/d` : ''}
      </p>
    </div>
  )
}

/** Un tope redondo: 1, 2, 2,5 o 5 por una potencia de 10. */
function redondo(x: number) {
  const p = 10 ** Math.floor(Math.log10(Math.max(1, x)))
  return [1, 2, 2.5, 5, 10].map(k => k * p).find(k => k >= x) ?? x
}
