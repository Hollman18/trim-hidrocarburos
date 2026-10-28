import type { Senal } from '@/entities/vigia'
import { conLectura, ultimaLectura } from '@/entities/serie'
import { escalaDe } from '@/shared/api/equiposTecnico'
import { decimalesDe } from '@/shared/lib/formato'
import { Tendencia, type SerieKit } from '@/shared/ui/scada'
import { useAncho } from '@/widgets/resultados/ancho'

const n1 = (v: number) => v.toLocaleString('es-CO', { maximumFractionDigits: 1 })
const dias = (h: number) => n1(h / 24)
const finito = (v: number | undefined): v is number => typeof v === 'number' && Number.isFinite(v)

/** La tendencia del vigía con el kit SCADA (kit-scada.md §2; K3): lo medido, la recta prolongada
 *  desde hoy hasta el límite (discontinua: lo proyectado nunca se dibuja igual que lo medido) y la
 *  barra del rango de días en que lo cruzaría, con «en N d». El eje del tiempo dice «hace N d», «hoy»
 *  (arriba de su raya) y «+N d». La escala es la de su señal (`escalaDe`, la misma del nivel 3: de la
 *  banda normal y la alarma, nunca de las lecturas), así que no se mueve con lo que se lee. En gris:
 *  una proyección no es una alarma (la marca de la señal la lleva su fila). Se dibuja al ancho
 *  medido: ningún rótulo baja de 12 px. */
export function Proyeccion({ s, sinTitulo = false }: { s: Senal; sinTitulo?: boolean }) {
  const [ref, ancho] = useAncho(520)
  const t = s.tendencia, serie = s.serie
  const ultimo = ultimaLectura(serie)
  if (!t || !serie || conLectura(serie).length < 2 || ultimo === undefined) return null
  const alarmas = [s.alarma?.baja, s.alarma?.alta].filter(finito)
  const e = escalaDe(s.unidad, s.normal, alarmas)
  // Sin ningún límite declarado no hay escala que no se mueva: no se dibuja ni se inventa (H5).
  if (!e) return <p className="text-[13px] text-[var(--tinta2)]" data-sin-escala>sin límite declarado: no se dibuja su tendencia</p>
  // El tiempo sale de la serie (su paso), igual que en el ajuste: «hoy» es su último lugar.
  const ahora = t.finH, paso = serie.pasoH, hoy = serie.valores.length - 1
  const p = s.pronostico
  const cruza = p.tipo === 'cruza'
  // Se dibuja hasta el final del rango, pero nunca más de 45 días adelante: más allá, una recta ya no se sostiene.
  const TOPE_H = 45 * 24
  const finT = cruza ? ahora + Math.min(p.rango[1], TOPE_H) : ahora
  const lim = s.limite?.valor
  const ajustado = (h: number) => t.ordenada + t.pendiente * h
  const tCruce = cruza ? ahora + Math.min(p.horas, TOPE_H) : undefined
  const enHorizonte = cruza && p.horas <= TOPE_H
  const series: SerieKit[] = [{ nombre: s.plantilla.nombre, valores: serie.valores }]
  if (cruza && lim !== undefined && tCruce !== undefined)
    series.push({ nombre: 'Tendencia prolongada', valores: [], proyectado: true, puntos: [[hoy, ajustado(ahora)], [tCruce / paso, ajustado(tCruce)]] })
  return (
    <div ref={ref} className="w-full min-w-0">
      <Tendencia titulo={s.plantilla.nombre} ventana={`${dias(ahora)} d${cruza ? ' y lo proyectado' : ''}`} sinTitulo={sinTitulo}
        series={series} escala={{ min: e[0], max: e[1], firmada: false }} unidad={s.unidad} decimales={decimalesDe(serie.valores, ultimo)}
        banda={s.normal ? [Number.isFinite(s.normal[0]) ? s.normal[0] : null, Number.isFinite(s.normal[1]) ? s.normal[1] : null] : undefined}
        alarmas={lim !== undefined ? [lim] : []}
        {...(cruza ? { hoy, hasta: finT / paso, rango: [(ahora + p.rango[0]) / paso, Math.min(ahora + p.rango[1], finT) / paso] as const } : {})}
        {...(cruza ? { nota: `cruza el límite en ${dias(p.horas)} días` } : {})} {...(enHorizonte ? { rotuloRango: `en ${dias(p.horas)} d` } : {})}
        ejeX={[`hace ${dias(ahora)} d`, cruza ? `+${dias(finT - ahora)} d` : 'hoy']}
        ancho={Math.max(240, ancho)} alto={112} tiempo={{ desde: serie.desde, pasoH: serie.pasoH }} nombreLimite="el límite" />
    </div>
  )
}
