import type { Senal } from '@/entities/vigia'
import { conLectura, ultimaLectura } from '@/entities/serie'
import { trazoConHuecos } from '@/shared/lib/trazo'

const n1 = (v: number) => v.toLocaleString('es-CO', { maximumFractionDigits: 1 })
const dias = (h: number) => n1(h / 24)

/** La tendencia del vigía: lo medido, la recta prolongada hasta el límite y
 *  el rango de días en que lo cruzaría. Lleva su propia escala de tiempo
 *  («hace 11 d», «hoy») y el valor del límite escrito sobre su línea: se lee
 *  sin pasar el cursor. Gris, porque una proyección no es una alarma. */
export function Proyeccion({ s }: { s: Senal }) {
  const t = s.tendencia, serie = s.serie
  const ultimo = ultimaLectura(serie)
  if (!t || !serie || conLectura(serie).length < 2 || ultimo === undefined) return null
  const W = 520, H = 112
  const G = { x0: 6, x1: 428, y0: 12, y1: 82 }
  // El tiempo sale de la serie (su paso), igual que en el ajuste: «hoy» es su último lugar.
  const ahora = t.finH
  const p = s.pronostico
  const cruza = p.tipo === 'cruza'
  // Se dibuja hasta el final del rango, pero nunca más de 45 días adelante:
  // más allá, una recta ya no se sostiene.
  const TOPE_H = 45 * 24
  const finT = cruza ? ahora + Math.min(p.rango[1], TOPE_H) : ahora
  const lim = s.limite?.valor
  const ajustado = (h: number) => t.ordenada + t.pendiente * h
  const ys = [...conLectura(serie), ...(lim !== undefined ? [lim] : []), ...(cruza ? [ajustado(finT)] : [])]
  const lo = Math.min(...ys), hi = Math.max(...ys), r = hi - lo || 1
  const X = (h: number) => G.x0 + (h / (finT || 1)) * (G.x1 - G.x0)
  const Y = (v: number) => G.y1 - ((v - lo) / r) * (G.y1 - G.y0)
  // Cada punto en su hora (i × paso); un hueco del historiador corta la línea.
  const linea = trazoConHuecos(serie.valores, i => X(i * serie.pasoH), Y)
  const tCruce = cruza ? ahora + Math.min(p.horas, TOPE_H) : undefined
  const enHorizonte = cruza && p.horas <= TOPE_H

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img"
      aria-label={`Tendencia de ${s.plantilla.nombre}${cruza ? `: cruza el límite en ${dias(p.horas)} días` : ''}`}>
      {/* el límite, con su valor escrito al final de la línea */}
      {lim !== undefined && (
        <>
          <line x1={G.x0} x2={G.x1} y1={Y(lim)} y2={Y(lim)} stroke="var(--tinta2)" strokeWidth={1} strokeDasharray="5 3" />
          <text x={G.x1 + 8} y={Y(lim) - 2} fontSize={10} fill="var(--tinta2)">límite</text>
          <text x={G.x1 + 8} y={Y(lim) + 10} fontSize={10.5} fontWeight={600} fill="var(--tinta)" className="tabular">
            {lim.toLocaleString('es-CO')} {s.unidad}
          </text>
        </>
      )}
      {/* hoy */}
      <line x1={X(ahora)} x2={X(ahora)} y1={G.y0 - 4} y2={G.y1} stroke="var(--linea)" strokeWidth={1} />
      {/* lo medido */}
      <path d={linea} fill="none" stroke="var(--dato-1)" strokeWidth={1.8} strokeLinejoin="round" />
      <circle cx={X(serie.valores.lastIndexOf(ultimo) * serie.pasoH)} cy={Y(ultimo)} r={3} fill="var(--dato-1)" />
      {/* la recta prolongada hasta el cruce, y el rango sobre el límite */}
      {cruza && lim !== undefined && tCruce !== undefined && (
        <>
          <line x1={X(ahora)} y1={Y(ajustado(ahora))} x2={X(tCruce)} y2={Y(ajustado(tCruce))}
            stroke="var(--tinta3)" strokeWidth={1.4} strokeDasharray="3 2" />
          <rect x={X(ahora + p.rango[0])} y={Y(lim) - 3.5}
            width={Math.max(3, X(Math.min(ahora + p.rango[1], finT)) - X(ahora + p.rango[0]))} height={7}
            fill="var(--tinta2)" opacity={0.5} rx={1.5} />
          {enHorizonte && (
            <text x={Math.min(X(tCruce), G.x1 - 4)} y={Y(lim) + (Y(lim) > (G.y0 + G.y1) / 2 ? -9 : 18)}
              fontSize={10.5} fontWeight={600} textAnchor="end" fill="var(--tinta)" className="tabular">
              en {dias(p.horas)} d
            </text>
          )}
        </>
      )}
      {/* eje del tiempo */}
      <line x1={G.x0} x2={G.x1} y1={G.y1} y2={G.y1} stroke="var(--linea2)" strokeWidth={0.8} />
      <text x={G.x0} y={G.y1 + 16} fontSize={9.5} fill="var(--tinta3)">hace {dias(ahora)} d</text>
      <text x={X(ahora)} y={G.y1 + 16} fontSize={9.5} fill="var(--tinta2)" fontWeight={600}
        textAnchor={cruza ? 'middle' : 'end'}>hoy</text>
      {cruza && (
        <text x={G.x1} y={G.y1 + 16} fontSize={9.5} fill="var(--tinta3)" textAnchor="end">
          +{dias(finT - ahora)} d
        </text>
      )}
    </svg>
  )
}
