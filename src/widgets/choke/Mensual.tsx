import { useId } from 'react'
import { useRepartoMensual, ORDEN_CHOKE } from '@/shared/api/choke'
import { useSerie } from '@/shared/api/diferidos'
import { Panel } from '@/shared/ui/primitivas'
import { Tip } from '@/shared/ui/Tip'
import { Lectura } from '@/shared/ui/Lectura'
import { alFinal } from '@/shared/ui/alFinal'
import { n0, n1 } from '@/shared/lib/formato'
import { DONDE, TONO } from './palabras'

/** Un tope «limpio» para el eje (el mismo de «Mes a mes» de Diferidos). */
function tope(v: number) {
  if (v <= 0) return 1
  const p = 10 ** Math.floor(Math.log10(v))
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p
  return 10 * p
}
const k = (v: number) => (v >= 1000 ? `${n1(v / 1000)} k` : n0(v))

/** «LO PERDIDO POR TRAMO, MES A MES» (U2 §7.4): cada mes del calendario,
 *  apilado en los cuatro tramos en grises de distinta luminancia y «sin
 *  identificar» en gris discontinuo. La cifra de cada barra es el diferido del
 *  libro de ese mes (`MesPorTramo.diferido`): el reparto suma exacto. Los
 *  nombres de los meses son los de la serie del libro, que es la misma. */
export function PorTramoMensual({ campos, desde, hasta }: { campos: string[]; desde: Date; hasta: Date }) {
  const meses = useRepartoMensual(campos)
  const serie = useSerie(campos)
  const id = useId().replace(/:/g, '')
  const corto = new Map(serie.map(m => [m.mes, { corto: m.corto, nombre: m.nombre }]))
  const W = 720, G = { x0: 54, x1: 712, y0: 22, y1: 168 }
  const n = Math.max(1, meses.length)
  const paso = (G.x1 - G.x0) / n
  const ancho = Math.min(34, paso * 0.58)
  const techo = tope(Math.max(...meses.map(m => m.diferido), 0) * 1.12)
  const Y = (v: number) => G.y1 - (v / techo) * (G.y1 - G.y0)
  const enPeriodo = (m: { desde: Date; hasta: Date }) => m.desde < hasta && m.hasta > desde

  return (
    <Panel className="mb-2.5 print:break-inside-avoid" titulo="LO PERDIDO POR TRAMO, MES A MES" extra="bbl">
      <div data-mensual>
        <div ref={alFinal} className="overflow-x-auto">
          <svg viewBox={`0 0 ${W} 206`} className="block h-auto w-full min-w-[560px]" role="group"
            aria-label={`Lo que se perdió cada mes, por dónde se trabó, de ${corto.get(meses[0]?.mes ?? '')?.nombre ?? ''} a ${corto.get(meses.at(-1)?.mes ?? '')?.nombre ?? ''}`}>
            <defs>
              <pattern id={`sin-${id}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="5" height="5" fill="var(--panel)" />
                <line x1="0" y1="0" x2="0" y2="5" stroke="var(--tinta3)" strokeWidth="1.6" />
              </pattern>
            </defs>
            {[0, techo / 2, techo].map(v => (
              <g key={v}>
                <line x1={G.x0} x2={G.x1} y1={Y(v)} y2={Y(v)} stroke="var(--linea2)" strokeWidth={0.8} />
                <text x={G.x0 - 6} y={Y(v) + 3} fontSize={9.5} textAnchor="end" fill="var(--tinta3)" className="tabular">{k(v)}</text>
              </g>
            ))}
            {meses.map((m, i) => {
              const x = G.x0 + paso * i + (paso - ancho) / 2
              const activo = enPeriodo(m)
              const nombre = corto.get(m.mes)
              let base = 0
              const capa = (v: number, fill: string, clave: string, discontinuo = false) => {
                if (v < 0.5) return null
                const y1 = Y(base), y0 = Y(base + v)
                base += v
                // Un hilo del color del panel separa un tramo del de abajo: los grises vecinos se distinguen.
                return <rect key={clave} x={x} y={y0} width={ancho} height={Math.max(0.6, y1 - y0)} fill={fill}
                  {...(discontinuo ? { stroke: 'var(--tinta3)', strokeWidth: 0.8, strokeDasharray: '2 1.5' } : { stroke: 'var(--panel)', strokeWidth: 0.7 })} />
              }
              return (
                <Tip key={m.mes} as="g" titulo={nombre?.nombre ?? m.mes} pista={m.parcial ? 'Mes en curso: cifras parciales.' : 'Mes cerrado'}
                  filas={[['Se trabaron', `${n0(m.diferido)} bbl`],
                    ...ORDEN_CHOKE.map((t): [string, string] => [DONDE[t], `${n0(m.porTramo[t])} bbl · no planeado ${n0(m.noPlaneado[t])}`]),
                    ['sin identificar', `${n0(m.porTramo['sin-asignar'])} bbl`]]}>
                  <g opacity={activo ? 1 : 0.62}>
                    <rect x={x - (paso - ancho) / 2} y={G.y0 - 8} width={paso} height={G.y1 - G.y0 + 36} fill="transparent" />
                    {ORDEN_CHOKE.map(t => capa(m.porTramo[t], TONO[t], t))}
                    {capa(m.porTramo['sin-asignar'], `url(#sin-${id})`, 'sin', true)}
                    {m.parcial && <rect x={x} y={Y(Math.max(0, m.diferido))} width={ancho} height={G.y1 - Y(Math.max(0, m.diferido))} fill="none" stroke="var(--tinta2)" strokeWidth={1} strokeDasharray="3 2" />}
                    <text x={x + ancho / 2} y={Y(Math.max(0, m.diferido)) - 5} fontSize={9} textAnchor="middle" fill="var(--tinta2)" className="tabular">{k(m.diferido)}</text>
                    <text x={x + ancho / 2} y={G.y1 + 14} fontSize={9.5} textAnchor="middle" fill={activo ? 'var(--tinta)' : 'var(--tinta3)'} fontWeight={activo ? 600 : 400} className="font-cond">
                      {(nombre?.corto ?? m.mes.slice(5)).toUpperCase()}
                    </text>
                    {(i === 0 || m.mes.endsWith('-01')) && <text x={x + ancho / 2} y={G.y1 + 26} fontSize={8.5} textAnchor="middle" fill="var(--tinta3)">{m.mes.slice(0, 4)}</text>}
                    {m.parcial && <text x={x + ancho / 2} y={G.y1 + 26} fontSize={8.5} textAnchor="middle" fill="var(--tinta3)">en curso</text>}
                  </g>
                </Tip>
              )
            })}
            <line x1={G.x0} x2={G.x1} y1={G.y1} y2={G.y1} stroke="var(--linea)" strokeWidth={1} />
          </svg>
        </div>
        {/* La leyenda es de texto, con las cuatro palabras de los tramos (U2 §7.4). */}
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10.5px] text-[var(--tinta2)]">
          {ORDEN_CHOKE.map(t => (
            <span key={t} className="inline-flex items-center gap-1.5"><i aria-hidden className="inline-block size-2.5" style={{ background: TONO[t] }} />{DONDE[t]}</span>
          ))}
          <span className="inline-flex items-center gap-1.5">
            <svg width="10" height="10" aria-hidden><rect x="0.5" y="0.5" width="9" height="9" fill={`url(#sin-${id})`} stroke="var(--tinta3)" strokeDasharray="2 1.5" /></svg>sin identificar
          </span>
        </div>
        <Lectura>
          Cada columna es un mes: lo que se perdió, apilado por el tramo donde se trabó, del más oscuro (el
          yacimiento) al más claro (afuera); lo rayado todavía no tiene causa y no se reparte. La cifra de
          arriba es el diferido del libro de ese mes. Los meses del período van al frente.
        </Lectura>
        {/* En el papel, los mismos números en una tabla. */}
        <div className="solo-impresion mt-2">
          <table className="tabular w-full text-[9pt]">
            <thead className="text-[var(--tinta3)]">
              <tr><th className="text-left font-normal">Mes</th>{ORDEN_CHOKE.map(t => <th key={t} className="text-right font-normal">{DONDE[t]}</th>)}<th className="text-right font-normal">sin identificar</th><th className="text-right font-normal">total</th></tr>
            </thead>
            <tbody>
              {meses.map(m => (
                <tr key={m.mes} className="border-t border-[var(--linea2)]">
                  <td>{corto.get(m.mes)?.nombre ?? m.mes}{m.parcial ? ' · en curso' : ''}</td>
                  {ORDEN_CHOKE.map(t => <td key={t} className="text-right">{n0(m.porTramo[t])}</td>)}
                  <td className="text-right">{n0(m.porTramo['sin-asignar'])}</td>
                  <td className="text-right font-semibold">{n0(m.diferido)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Panel>
  )
}
