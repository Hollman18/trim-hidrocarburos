import { alFinal } from '@/shared/ui/alFinal'
import { useId } from 'react'
import type { MesResumen } from '@/shared/api/diferidos'
import { conMeta, textoSinMeta } from '@/entities/libro'
import { Tip } from '@/shared/ui/Tip'
import { Lectura } from '@/shared/ui/Lectura'
import { n0, n1 } from '@/shared/lib/formato'

/** Redondea hacia arriba a un tope «limpio» para el eje: 1, 2 o 5 por una
 *  potencia de diez. */
function tope(v: number) {
  if (v <= 0) return 1
  const p = 10 ** Math.floor(Math.log10(v))
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p
  return 10 * p
}
const k = (v: number) => v >= 1000 ? `${n1(v / 1000)} k` : n0(v)

/** Diferido de cada mes, partido en lo identificado por señal, lo declarado
 *  por el operario y lo que sigue sin identificar, contra el máximo de diferido firmado del mes.
 *
 *  ISA-101: todo en grises; el único color es la marca de prioridad 3 sobre
 *  los meses que pasaron su máximo firmado, y siempre con su forma (cuadrado). */
export function MesAMes({ serie, desde, hasta, onMes }: {
  serie: MesResumen[]; desde: Date; hasta: Date; onMes?: (m: MesResumen) => void
}) {
  const id = useId().replace(/:/g, '')
  const W = 720, G = { x0: 54, x1: 712, y0: 22, y1: 168 }
  const n = serie.length
  const paso = (G.x1 - G.x0) / n
  const ancho = Math.min(34, paso * 0.58)
  const techo = tope(Math.max(...serie.map(m => Math.max(m.libro.brecha, conMeta(m.libro.meta) ? m.libro.meta.diferido : 0))) * 1.12)
  const Y = (v: number) => G.y1 - (v / techo) * (G.y1 - G.y0)
  const marcas = [0, techo / 2, techo]
  const enPeriodo = (m: MesResumen) => m.desde < hasta && m.hasta > desde

  return (
    <>
      <div ref={alFinal} className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} 206`} className="block h-auto w-full min-w-[560px]" role="group"
          aria-label={`Barriles diferidos mes a mes, de ${serie[0]?.nombre} a ${serie.at(-1)?.nombre}`}>
          <defs>
            <pattern id={`sin-${id}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="5" height="5" fill="var(--panel)" />
              <line x1="0" y1="0" x2="0" y2="5" stroke="var(--tinta3)" strokeWidth="1.6" />
            </pattern>
          </defs>
          {marcas.map(v => (
            <g key={v}>
              <line x1={G.x0} x2={G.x1} y1={Y(v)} y2={Y(v)} stroke="var(--linea2)" strokeWidth={0.8} />
              <text x={G.x0 - 6} y={Y(v) + 3} fontSize={9.5} textAnchor="end" fill="var(--tinta3)" className="tabular">{k(v)}</text>
            </g>
          ))}
          {serie.map((m, i) => {
            const l = m.libro
            const x = G.x0 + paso * i + (paso - ancho) / 2
            const tramos: Array<[number, string]> = [
              [l.identificado, 'var(--dato-1)'], [l.declarado, 'var(--dato-3)'], [Math.max(0, l.pendiente), `url(#sin-${id})`],
            ]
            let base = 0
            const activo = enPeriodo(m)
            // Un mes con algún campo sin meta firmada no tiene máximo: ni raya ni marca.
            const hayMeta = conMeta(l.meta)
            const sobre = hayMeta && l.brecha > l.meta.diferido
            const yTope = Y(Math.max(l.brecha, 0))
            return (
              <Tip key={m.mes} as="g" titulo={m.nombre}
                pista={m.parcial ? 'Mes en curso: cifras parciales, cierre sin publicar.' : onMes ? 'Clic para ver este mes' : 'Mes cerrado'}
                filas={[['Diferidos', `${n0(l.brecha)} bbl`], ['Identificado por señal', `${n0(l.identificado)} bbl`],
                  ['Declarado', `${n0(l.declarado)} bbl`], ['Sin identificar', `${n0(l.pendiente)} bbl`],
                  ['Alto impacto', `${n0(l.altoImpacto)} bbl`],
                  ['Máximo firmado', hayMeta ? `${n0(l.meta.diferido)} bbl` : textoSinMeta(l.meta, l.porCampo.length > 1)], ['Eficiencia', `${n1(l.pe)} %`],
                  ['Cierre', m.parcial ? 'sin publicar' : l.publicable ? 'publicable' : 'no publicable']]}
                {...(onMes ? { onClick: () => onMes(m) } : {})}>
                <g opacity={activo ? 1 : 0.42} className={onMes ? 'cursor-pointer' : undefined}>
                  <rect x={x - (paso - ancho) / 2} y={G.y0 - 8} width={paso} height={G.y1 - G.y0 + 36} fill="transparent" />
                  {tramos.map(([v, fill], j) => {
                    if (v <= 0) return null
                    const y1 = Y(base), y0 = Y(base + v)
                    base += v
                    return <rect key={j} x={x} y={y0} width={ancho} height={Math.max(0.6, y1 - y0)} fill={fill}
                      stroke={j === 2 ? 'var(--tinta3)' : 'none'} strokeWidth={j === 2 ? 0.8 : 0} />
                  })}
                  {m.parcial && (
                    <rect x={x} y={yTope} width={ancho} height={G.y1 - yTope} fill="none"
                      stroke="var(--tinta2)" strokeWidth={1} strokeDasharray="3 2" />
                  )}
                  {hayMeta && <line x1={x - 3} x2={x + ancho + 3} y1={Y(l.meta.diferido)} y2={Y(l.meta.diferido)}
                    stroke="var(--tinta)" strokeWidth={1.4} strokeDasharray="4 2" />}
                  {sobre && !m.parcial && (
                    <rect x={x + ancho / 2 - 3.5} y={yTope - 15} width={7} height={7} rx={0.8} fill="var(--p3)" stroke="var(--marca-trazo)" strokeWidth={1}>
                      <title>Pasó el máximo de diferido firmado</title>
                    </rect>
                  )}
                  <text x={x + ancho / 2} y={yTope - (sobre && !m.parcial ? 19 : 5)} fontSize={9} textAnchor="middle"
                    fill="var(--tinta2)" className="tabular">{k(l.brecha)}</text>
                  <text x={x + ancho / 2} y={G.y1 + 14} fontSize={9.5} textAnchor="middle"
                    fill={activo ? 'var(--tinta)' : 'var(--tinta3)'} fontWeight={activo ? 600 : 400} className="font-cond">
                    {m.corto.toUpperCase()}
                  </text>
                  {(i === 0 || m.mes.endsWith('-01')) && (
                    <text x={x + ancho / 2} y={G.y1 + 26} fontSize={8.5} textAnchor="middle" fill="var(--tinta3)">{m.mes.slice(0, 4)}</text>
                  )}
                  {m.parcial && (
                    <text x={x + ancho / 2} y={G.y1 + 26} fontSize={8.5} textAnchor="middle" fill="var(--tinta3)">en curso</text>
                  )}
                </g>
              </Tip>
            )
          })}
          <line x1={G.x0} x2={G.x1} y1={G.y1} y2={G.y1} stroke="var(--linea)" strokeWidth={1} />
        </svg>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10.5px] text-[var(--tinta2)]">
        <span className="inline-flex items-center gap-1.5"><i className="inline-block size-2.5 bg-[var(--dato-1)]" />por señal</span>
        <span className="inline-flex items-center gap-1.5"><i className="inline-block size-2.5 bg-[var(--dato-3)]" />declarado</span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="10" height="10" aria-hidden><rect width="10" height="10" fill={`url(#sin-${id})`} stroke="var(--tinta3)" strokeWidth="1" /></svg>sin identificar
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="16" height="6" aria-hidden><line x1="0" x2="16" y1="3" y2="3" stroke="var(--tinta)" strokeWidth="1.4" strokeDasharray="4 2" /></svg>máximo firmado
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="8" height="8" aria-hidden><rect x="0.5" y="0.5" width="7" height="7" rx="0.8" fill="var(--p3)" stroke="var(--marca-trazo)" strokeWidth={1} /></svg>pasó el máximo
        </span>
      </div>
      <Lectura>
        Cada columna es un mes. Lo oscuro tiene causa probada por una señal (código del controlador,
        primera alarma del PLC, firma o programa); lo gris claro lo declaró un operario porque la
        señal no alcanzaba; lo rayado nadie lo ha identificado todavía. La raya es el máximo de
        diferido que firmó el gerente para ese mes. Los meses del período que está mirando van al
        frente. Toque o pase el cursor por un mes para ver sus cifras{onMes ? '; un clic lo abre' : ''}.
      </Lectura>
    </>
  )
}
