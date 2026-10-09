import type { MesResumen } from '@/shared/api/diferidos'
import { useMedicionOficial } from '@/shared/api/medicion'
import { campoPorId } from '@/entities/campos'
import { Tip } from '@/shared/ui/Tip'
import { Lectura } from '@/shared/ui/Lectura'
import { n0, n2, n3 } from '@/shared/lib/formato'
import { alFinal } from '@/shared/ui/alFinal'
import { estadoFactor } from './publicacion'

/** El factor de asignación de un campo mes a mes, contra la banda que acepta
 *  la Res. 40236 (Fig. 10.2). Es el control de que las pruebas y la medición
 *  oficial cuentan la misma historia: fuera de banda, el libro no se publica.
 *
 *  ISA-101: la banda en gris; el punto fuera de banda lleva la marca de
 *  prioridad 3 (cuadrado). Sin °API (o sin fiscal publicado) la banda no se
 *  puede verificar: el punto va punteado, sin marca (no está fuera: falta con
 *  qué compararlo).
 *  Como las demás gráficas de meses, arranca en el mes más reciente. */
export function Factor({ serie, campoId, desde, hasta }: { serie: MesResumen[]; campoId: string; desde: Date; hasta: Date }) {
  const banda = useMedicionOficial(campoId).banda
  const W = 720, G = { x0: 46, x1: 712, y0: 14, y1: 128 }
  const lo = Math.min(0.75, 1 - banda.valor - 0.05), hi = Math.max(1.25, 1 + banda.valor + 0.05)
  const Y = (v: number) => G.y1 - ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * (G.y1 - G.y0)
  const paso = (G.x1 - G.x0) / Math.max(1, serie.length)
  const X = (i: number) => G.x0 + paso * i + paso / 2
  const filas = serie.map(m => ({ m, f: m.libro.fa.find(x => x.campoId === campoId) }))
  const marcas = [lo, 1 - banda.valor, 1, 1 + banda.valor, hi]

  return (
    <>
      <div ref={alFinal} className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} 150`} className="block h-auto w-full min-w-[520px]" role="group"
          aria-label={`Factor de asignación de ${campoPorId(campoId).nombre}, mes a mes, contra su banda de ±${n0(banda.valor * 100)} %`}>
          <rect x={G.x0} y={Y(1 + banda.valor)} width={G.x1 - G.x0} height={Y(1 - banda.valor) - Y(1 + banda.valor)} fill="var(--panel2)" />
          {marcas.map(v => (
            <g key={v}>
              <line x1={G.x0} x2={G.x1} y1={Y(v)} y2={Y(v)} stroke={v === 1 ? 'var(--tinta3)' : 'var(--linea2)'} strokeWidth={v === 1 ? 1 : 0.7}
                strokeDasharray={v === 1 ? '4 3' : undefined} />
              <text x={G.x0 - 6} y={Y(v) + 3} fontSize={9} textAnchor="end" fill="var(--tinta3)" className="tabular">{n2(v)}</text>
            </g>
          ))}
          <polyline fill="none" stroke="var(--tinta2)" strokeWidth={1.2}
            points={filas.flatMap((x, i) => (x.f ? [`${X(i)},${Y(x.f.fa)}`] : [])).join(' ')} />
          {filas.map(({ m, f }, i) => {
            if (!f) return null
            const activo = m.desde < hasta && m.hasta > desde
            const estado = estadoFactor(m.libro, f)
            return (
              <Tip key={m.mes} as="g" titulo={`${m.nombre} · factor ${n3(f.fa)}`}
                pista={estado === 'dentro' ? 'Dentro de la banda' : estado === 'fuera' ? 'Fuera de la banda: revisar pruebas, medición y pozos sin prueba'
                  // El porqué lo redacta el servidor (sin °API o sin fiscal publicado).
                  : m.libro.motivos.find(x => x.codigo === 'banda-sin-verificar' && x.campoId === campoId)?.texto}
                filas={[['Factor', n3(f.fa)], ['Banda', estado === 'sin-verificar' ? 'sin verificar' : `${n2(1 - f.banda)} – ${n2(1 + f.banda)}`],
                  ['Fiscal del mes', `${n0(m.libro.real)} bbl`], ['Cierre', f.publicado ? 'publicado' : 'en curso']]}>
                <g opacity={activo ? 1 : 0.5}>
                  {estado === 'fuera'
                    ? <rect x={X(i) - 4} y={Y(f.fa) - 4} width={8} height={8} rx={0.8} fill="var(--p3)" stroke="var(--marca-trazo)" strokeWidth={1} />
                    : <circle cx={X(i)} cy={Y(f.fa)} r={3.6} fill="var(--panel)" stroke="var(--tinta)" strokeWidth={1.4}
                      strokeDasharray={estado === 'sin-verificar' ? '2 1.6' : undefined} />}
                  <text x={X(i)} y={G.y1 + 14} fontSize={9.5} textAnchor="middle" fill={activo ? 'var(--tinta)' : 'var(--tinta3)'}
                    fontWeight={activo ? 600 : 400} className="font-cond">{m.corto.toUpperCase()}</text>
                </g>
              </Tip>
            )
          })}
        </svg>
      </div>
      <Lectura>
        Factor = producción fiscal del mes ÷ lo que dicen las pruebas por las horas que cada pozo
        produjo. Si las pruebas y el punto de medición oficial cuentan la misma historia, el factor
        queda cerca de 1. La franja gris es la banda que acepta la regulación para este crudo
        ({banda.fuente}).
      </Lectura>
    </>
  )
}
