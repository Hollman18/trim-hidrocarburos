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
  // El último sexto, para el rótulo del límite (a 12 px cabe «1.650 rpm» también en el teléfono).
  const G = { x0: 6, x1: 410, y0: 12, y1: 82 }
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

  // C4 · Los rótulos van en HTML sobre el dibujo (X5 §3.4: nada bajo 12 px): el dibujo se estira a lo
  // ancho que tenga y su letra no se encoge con él. Las x en porcentaje del ancho; las y, en píxeles.
  const pct = (x: number) => `${(x / W) * 100}%`
  const rotulo = 'pointer-events-none absolute whitespace-nowrap text-[12px] leading-none'
  const cercaDeHoy = cruza && G.x1 - X(ahora) < 46

  return (
    <div className="relative" style={{ height: H }} role="img"
      aria-label={`Tendencia de ${s.plantilla.nombre}${cruza ? `: cruza el límite en ${dias(p.horas)} días` : ''}`}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 block h-full w-full" aria-hidden>
        {lim !== undefined && <line x1={G.x0} x2={G.x1} y1={Y(lim)} y2={Y(lim)} stroke="var(--tinta2)" strokeWidth={1} strokeDasharray="5 3" vectorEffect="non-scaling-stroke" />}
        {/* hoy */}
        <line x1={X(ahora)} x2={X(ahora)} y1={G.y0 - 4} y2={G.y1} stroke="var(--linea)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        {/* lo medido */}
        <path d={linea} fill="none" stroke="var(--dato-1)" strokeWidth={1.8} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {/* la recta prolongada hasta el cruce, y el rango sobre el límite */}
        {cruza && lim !== undefined && tCruce !== undefined && (
          <>
            <line x1={X(ahora)} y1={Y(ajustado(ahora))} x2={X(tCruce)} y2={Y(ajustado(tCruce))}
              stroke="var(--tinta3)" strokeWidth={1.4} strokeDasharray="3 2" vectorEffect="non-scaling-stroke" />
            <rect x={X(ahora + p.rango[0])} y={Y(lim) - 3.5}
              width={Math.max(3, X(Math.min(ahora + p.rango[1], finT)) - X(ahora + p.rango[0]))} height={7}
              fill="var(--tinta2)" opacity={0.5} rx={1.5} />
          </>
        )}
        {/* eje del tiempo */}
        <line x1={G.x0} x2={G.x1} y1={G.y1} y2={G.y1} stroke="var(--linea2)" strokeWidth={0.8} vectorEffect="non-scaling-stroke" />
      </svg>
      {/* el último punto, en HTML: estirado con el dibujo sería un óvalo */}
      <i aria-hidden className="absolute block size-[6px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--dato-1)]"
        style={{ left: pct(X(serie.valores.lastIndexOf(ultimo) * serie.pasoH)), top: Y(ultimo) }} />
      {/* el límite, con su valor escrito al final de la línea */}
      {lim !== undefined && (
        <span aria-hidden className={`${rotulo} text-[var(--tinta2)]`} style={{ left: pct(G.x1 + 8), top: Y(lim) - 14 }}>
          límite<b className="tabular mt-0.5 block font-semibold text-[var(--tinta)]">{lim.toLocaleString('es-CO')} {s.unidad}</b>
        </span>
      )}
      {cruza && lim !== undefined && tCruce !== undefined && enHorizonte && (
        <span aria-hidden className={`${rotulo} tabular -translate-x-full font-semibold text-[var(--tinta)]`}
          style={{ left: pct(Math.min(X(tCruce), G.x1 - 4)), top: Y(lim) + (Y(lim) > (G.y0 + G.y1) / 2 ? -21 : 7) }}>
          en {dias(p.horas)} d
        </span>
      )}
      <span aria-hidden className={`${rotulo} text-[var(--tinta3)]`} style={{ left: pct(G.x0), top: G.y1 + 6 }}>hace {dias(ahora)} d</span>
      {cercaDeHoy ? (
        // Un cruce muy cerca de hoy dejaba «hoy» encima de «+0,2 d»: van juntos, al final del eje.
        <span aria-hidden className={`${rotulo} -translate-x-full text-[var(--tinta3)]`} style={{ left: pct(G.x1), top: G.y1 + 6 }}>
          <b className="font-semibold text-[var(--tinta2)]">hoy</b> · +{dias(finT - ahora)} d
        </span>
      ) : (
        <>
          <span aria-hidden className={`${rotulo} font-semibold text-[var(--tinta2)] ${cruza ? '-translate-x-1/2' : '-translate-x-full'}`} style={{ left: pct(X(ahora)), top: G.y1 + 6 }}>hoy</span>
          {cruza && <span aria-hidden className={`${rotulo} -translate-x-full text-[var(--tinta3)]`} style={{ left: pct(G.x1), top: G.y1 + 6 }}>+{dias(finT - ahora)} d</span>}
        </>
      )}
    </div>
  )
}
