import { useId, useState } from 'react'
import { CHOKES_Y_SIN_ASIGNAR } from '@/shared/api/choke'
import type { VistaResultados, MesResultados } from '@/shared/api/resultados'
import { MarcaSvg } from '@/widgets/plantaviva/piezas'
import { PatronesTramo, Muestra } from '@/widgets/diferidos/tramos'
import { LARGO_TRAMO, rellenoSvg, mayuscula } from '@/widgets/diferidos/reparto'
import { cn } from '@/shared/lib/cn'
import { Tarjeta } from './piezas'
import { n0 } from './cifras'
import { useAncho } from './ancho'

/** «Diferido por día, mes a mes» (X5 §5.4, el gráfico de A en el estilo de B):
 *  13 barras apiladas, lo de alto impacto oscuro y lo demás medio, con la tapa
 *  redondeada; la raya discontinua del máximo firmado en cada mes, el «3» sobre
 *  el mes cerrado que lo pasó y el mes en curso con contorno discontinuo. La misma
 *  barra se puede partir «por dónde se trabó» (U2 §7.4). Los meses del período
 *  van en tinta con su cifra; un toque abre un mes como período (el período vive
 *  aquí). Se dibuja al ancho de verdad: ningún rótulo baja de 12 px. */
export function MesAMes({ v, onMes, className }: { v: VistaResultados; onMes: (m: MesResultados) => void; className?: string }) {
  const [vista, setVista] = useState<'equipo' | 'tramo'>('equipo')
  const [ref, ancho] = useAncho(620)
  const idp = useId().replace(/:/g, '')
  const { meses, actualBpd, nombreActual } = v.mesAMes
  const porTramo = vista === 'tramo'
  const maximo = meses.reduce((a, m) => Math.max(a, m.maximoBpd ?? 0), 0)
  const W = Math.max(260, ancho), H = 176
  const G = { x0: 8 + 8 * n0(maximo || 1).length, x1: W - 2, y0: 22, y1: H - 26 }
  const tope = Math.max(1, ...meses.map(m => m.totalBpd), maximo) * 1.1
  const Y = (x: number) => G.y1 - (x / tope) * (G.y1 - G.y0)
  const paso = (G.x1 - G.x0) / Math.max(1, meses.length), an = Math.min(26, paso * 0.62)
  const lineas = maximo > 0 ? [maximo / 2, maximo] : []
  // La cifra de un mes del período va encima de su barra solo si cabe (14 px de ancho por cifra).
  const enPeriodo = meses.filter(m => m.enPeriodo)
  const cifraArriba = enPeriodo.length <= 3 || paso >= 44
  return (
    <Tarjeta titulo="Diferido por día, mes a mes" className={className} data-mes-a-mes={vista}
      extra={actualBpd !== null && <>{nombreActual}: <b className="text-[var(--tinta)]">{n0(actualBpd)}</b> bbl/d</>}>
      <div role="group" aria-label="Cómo se parte cada mes" className="no-imprimir mt-3 inline-flex rounded-full bg-[var(--panel2)] p-1">
        {([['equipo', 'Por equipo'], ['tramo', 'Por dónde se trabó']] as const).map(([k, t]) => (
          <button key={k} type="button" aria-pressed={vista === k} onClick={() => setVista(k)}
            className={cn('min-h-9 cursor-pointer rounded-full px-3.5 text-[14px] font-medium transition-colors',
              vista === k ? 'bg-[var(--primario)] font-semibold text-[var(--primario-sobre)]' : 'text-[var(--tinta2)] hover:text-[var(--tinta)]')}>
            {t}
          </button>
        ))}
      </div>
      <div ref={ref} className="mt-3 w-full">
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block" role="group"
          aria-label={porTramo ? `${v.mesAMes.aria} Cada barra, partida por dónde se trabó.` : v.mesAMes.aria}>
          <defs><PatronesTramo id={idp} /></defs>
          {[0, ...lineas].map(l => (
            <g key={l}>
              <line x1={G.x0} x2={G.x1} y1={Y(l)} y2={Y(l)} stroke="var(--linea2)" strokeWidth={1} />
              {l > 0 && <text x={G.x0 - 6} y={Y(l) + 4} textAnchor="end" fontSize={12} fill="var(--tinta3)" className="tabular-nums">{n0(l)}</text>}
            </g>
          ))}
          {meses.map((m, i) => {
            const x = G.x0 + paso * i + (paso - an) / 2
            const yT = Y(m.totalBpd)
            const tapa = Math.min(3, an / 2)
            let base = 0
            const titulo = porTramo
              ? `${m.nombre}: ${n0(m.totalBpd)} bbl/d · ${CHOKES_Y_SIN_ASIGNAR.filter(k => m.porTramo[k] >= 0.5).map(k => `${LARGO_TRAMO[k]} ${n0(m.porTramo[k])}`).join(', ')}`
              : `${m.nombre}: ${n0(m.totalBpd)} bbl/d, de alto impacto ${n0(m.altoBpd)}${m.maximoBpd !== null ? ` · máximo ${n0(m.maximoBpd)}` : ''}`
            return (
              <g key={m.mes} data-mes={m.mes} data-total={m.totalBpd} data-en-periodo={m.enPeriodo ? '' : undefined}
                role="button" tabIndex={0} aria-label={`${titulo}. Abrir ${m.nombre} como período.`}
                onClick={() => onMes(m)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onMes(m) } }}
                className="cursor-pointer outline-none focus-visible:[&>rect:first-child]:stroke-[var(--foco)]">
                <rect x={G.x0 + paso * i} y={G.y0 - 18} width={paso} height={G.y1 - G.y0 + 40} fill="transparent" stroke="transparent" strokeWidth={2} rx={6} />
                {porTramo
                  ? CHOKES_Y_SIN_ASIGNAR.map(k => {
                    const val = m.porTramo[k]
                    if (val <= 0) return null
                    const y1 = Y(base), y0 = Y(base + val)
                    base += val
                    const sin = k === 'sin-asignar'
                    return <rect key={k} x={x} y={y0} width={an} height={Math.max(0.5, y1 - y0)} fill={rellenoSvg(k, idp)}
                      stroke={sin ? 'var(--tinta3)' : 'var(--panel)'} strokeWidth={sin ? 0.8 : 0.6} strokeDasharray={sin ? '2 1.5' : undefined} />
                  })
                  : (
                    <>
                      <path d={`M${x} ${G.y1} L${x} ${yT + tapa} Q${x} ${yT} ${x + tapa} ${yT} L${x + an - tapa} ${yT} Q${x + an} ${yT} ${x + an} ${yT + tapa} L${x + an} ${G.y1} Z`} fill="var(--dato3)" />
                      <rect x={x} y={Y(m.altoBpd)} width={an} height={Math.max(0, G.y1 - Y(m.altoBpd))} fill="var(--dato1)" />
                    </>
                  )}
                {m.maximoBpd !== null && <line x1={x - 3} x2={x + an + 3} y1={Y(m.maximoBpd)} y2={Y(m.maximoBpd)} stroke="var(--tinta)" strokeWidth={1.6} strokeDasharray="4 2.5" />}
                {m.sobre && <MarcaSvg x={x + an / 2 - 7} y={Math.min(yT, Y(m.maximoBpd ?? 0)) - 17} s={3} t={14} />}
                {m.enCurso && <rect x={x - 2.5} y={yT - 2.5} width={an + 5} height={G.y1 - yT + 2.5} rx={4} fill="none" stroke="var(--tinta)" strokeWidth={1.3} strokeDasharray="3 2" />}
                {m.enPeriodo && !m.enCurso && <rect x={x - 2.5} y={yT - 2.5} width={an + 5} height={G.y1 - yT + 2.5} rx={4} fill="none" stroke="var(--tinta)" strokeWidth={1.3} />}
                {m.enPeriodo && cifraArriba && (
                  // La cifra no se sale del dibujo: junto al borde se corre hacia adentro (≈ 4,5 px por carácter a 13 px).
                  <text x={Math.min(Math.max(x + an / 2, G.x0 + 4.5 * n0(m.totalBpd).length), W - 1 - 4.5 * n0(m.totalBpd).length)} y={Math.min(yT, Y(m.maximoBpd ?? 0)) - (m.sobre ? 21 : 6)}
                    textAnchor="middle" fontSize={13} fontWeight={700} fill="var(--tinta)" className="tabular-nums">{n0(m.totalBpd)}</text>
                )}
                {(i % 3 === 0 || i === meses.length - 1) && (
                  <text x={Math.min(Math.max(x + an / 2, G.x0 + 22), G.x1 - 22)} y={G.y1 + 17} textAnchor="middle" fontSize={12} fontWeight={m.enPeriodo ? 700 : 500}
                    fill={m.enPeriodo ? 'var(--tinta)' : 'var(--tinta2)'} className="font-cond">{m.rotulo}</text>
                )}
              </g>
            )
          })}
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[14px] text-[var(--tinta2)]">
        {porTramo
          ? CHOKES_Y_SIN_ASIGNAR.map(k => <span key={k} className="inline-flex items-center gap-1.5"><Muestra k={k} />{mayuscula(LARGO_TRAMO[k])}</span>)
          : (
            <>
              <span className="inline-flex items-center gap-[5px]"><i className="inline-block size-2.5 rounded-[3px] bg-[var(--dato1)]" />alto impacto</span>
              <span className="inline-flex items-center gap-[5px]"><i className="inline-block size-2.5 rounded-[3px] bg-[var(--dato3)]" />lo demás</span>
            </>
          )}
        {maximo > 0 && <span className="inline-flex items-center gap-[5px]"><svg width="16" height="6" aria-hidden><line x1="0" x2="16" y1="3" y2="3" stroke="var(--tinta)" strokeWidth="1.6" strokeDasharray="4 2.5" /></svg>máximo firmado</span>}
        <span className="text-[var(--tinta3)]">bbl/d · un toque abre el mes</span>
      </div>
    </Tarjeta>
  )
}
