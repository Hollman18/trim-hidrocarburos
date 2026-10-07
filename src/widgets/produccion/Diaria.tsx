import { useRef, useState } from 'react'
import type { Dia } from '@/entities/libro'
import { SIN_META } from '@/entities/configuracion'
import { fechaCorta } from '@/entities/reloj'
import { Tip } from '@/shared/ui/Tip'
import { n0, n1 } from '@/shared/lib/formato'
import { alFinal } from '@/shared/ui/alFinal'

/** Escala con números redondos: el eje tiene que poder leerse. */
function escala(lo: number, hi: number): [number, number, number] {
  const span = Math.max(hi - lo, 1)
  const p = 10 ** Math.floor(Math.log10(span))
  const paso = [1, 2, 2.5, 5, 10].map(m => m * p).find(s => span / s <= 5) ?? 10 * p
  return [Math.floor(lo / paso) * paso, Math.ceil(hi / paso) * paso, paso]
}

/** Producción de cada día del punto de medición oficial contra el potencial
 *  de las pruebas y la meta firmada, en bbl/d. Lo que separa la curva real
 *  del potencial es el diferido. El día de hoy es parcial y se dice. */
export function Diaria({ dias }: { dias: Dia[] }) {
  const tasa = (d: Dia, v: number) => (d.horas > 0 ? (v * 24) / d.horas : 0)
  // Un día sin fiscal no tiene punto: la curva real se corta ahí (hueco, no cero).
  // Un día con algún campo sin meta firmada tampoco tiene punto de meta: la línea se corta igual.
  const pts = dias.map(d => ({ d, real: d.real === null ? null : tasa(d, d.real), pot: tasa(d, d.potencial), meta: d.meta === null ? null : tasa(d, d.meta), parcial: d.horas < 23.99 }))
  const bajos = pts.flatMap(p => [p.real, p.meta].filter((v): v is number => v !== null))
  const [lo, hi, paso] = escala(Math.min(...(bajos.length ? bajos : pts.map(p => p.pot))) * 0.97, Math.max(...pts.map(p => p.pot)) * 1.02)
  const W = 720, G = { x0: 56, x1: 690, y0: 12, y1: 168 }
  const X = (i: number) => G.x0 + (pts.length > 1 ? (i / (pts.length - 1)) * (G.x1 - G.x0) : (G.x1 - G.x0) / 2)
  const Y = (v: number) => G.y1 - ((v - lo) / (hi - lo)) * (G.y1 - G.y0)
  const linea = (f: (p: typeof pts[number]) => number) => pts.map((p, i) => `${X(i)},${Y(f(p))}`).join(' ')
  // La meta en tramos de días seguidos que la tienen.
  const tramosMeta: number[][] = []
  pts.forEach((p, i) => { if (p.meta === null) return; const t = tramosMeta.at(-1); if (t && t.at(-1) === i - 1) t.push(i); else tramosMeta.push([i]) })
  // Tramos seguidos de días con fiscal: cada uno con su curva y su área.
  const tramos: number[][] = []
  pts.forEach((p, i) => { if (p.real === null) return; const t = tramos.at(-1); if (t && t.at(-1) === i - 1) t.push(i); else tramos.push([i]) })
  const huecos = tramos.map(t => `${t.map(i => `${X(i)},${Y(pts[i]!.pot)}`).join(' ')} ${[...t].reverse().map(i => `${X(i)},${Y(pts[i]!.real!)}`).join(' ')}`)
  const marcas: number[] = []
  for (let v = lo; v <= hi + 1e-9; v += paso) marcas.push(v)
  // Las fechas de otro año llevan el año y ocupan el triple: el espaciado sale
  // del largo real de cada marca (9,5 de fuente ≈ 5,4 por carácter), no de un número fijo.
  const ancho = (t: string) => t.length * 5.4
  const etiqueta = (p: typeof pts[number]) => `${fechaCorta(p.d.dia)}${p.parcial ? ' · en curso' : ''}`
  const caben = Math.max(1, Math.floor((G.x1 - G.x0) / (Math.max(...pts.map(p => ancho(fechaCorta(p.d.dia)))) + 14)))
  const cada = Math.max(1, Math.ceil(pts.length / caben))
  // Las marcas regulares ceden el sitio a la del último día, que va pegada al borde y es más larga.
  const ultimo = pts.at(-1)
  const tope = G.x1 - (ultimo ? ancho(etiqueta(ultimo)) : 0) - 8
  const conMarca = (p: typeof pts[number], i: number) => i === pts.length - 1 || (i % cada === 0 && X(i) + ancho(fechaCorta(p.d.dia)) / 2 < tope)
  // Con teclado, la gráfica es UNA parada de Tab (un año serían 365): se entra
  // en el último día y las flechas recorren los días, Inicio y Fin van a los bordes.
  const [enFoco, setEnFoco] = useState<number | null>(null)
  const activo = Math.min(enFoco ?? pts.length - 1, pts.length - 1)
  const dibujo = useRef<SVGSVGElement>(null)
  const mover = (e: React.KeyboardEvent, i: number) => {
    const destino = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? pts.length - 1 : null
    if (destino === null) return
    e.preventDefault()
    const n = Math.max(0, Math.min(pts.length - 1, destino))
    setEnFoco(n)
    dibujo.current?.querySelectorAll<SVGGElement>('[data-dia]')[n]?.focus()
  }

  return (
    <div ref={alFinal} className="overflow-x-auto">
      <svg ref={dibujo} viewBox={`0 0 ${W} 196`} className="block h-auto w-full min-w-[540px]" role="group"
        aria-label={`Producción diaria contra potencial y meta, ${pts.length} días. Con las flechas se pasa de un día a otro.`}>
        {marcas.map(v => (
          <g key={v}>
            <line x1={G.x0} x2={G.x1} y1={Y(v)} y2={Y(v)} stroke="var(--linea2)" strokeWidth={0.7} />
            <text x={G.x0 - 6} y={Y(v) + 3} fontSize={9} textAnchor="end" fill="var(--tinta3)" className="tabular">{v >= 1000 ? `${n1(v / 1000)} k` : n0(v)}</text>
          </g>
        ))}
        {huecos.map((h, k) => <polygon key={k} points={h} fill="var(--panel2)" stroke="none" />)}
        {tramosMeta.map((t, k) => <polyline key={k} points={t.map(i => `${X(i)},${Y(pts[i]!.meta!)}`).join(' ')} fill="none" stroke="var(--tinta3)" strokeWidth={1} strokeDasharray="2 3" />)}
        <polyline points={linea(p => p.pot)} fill="none" stroke="var(--tinta2)" strokeWidth={1.2} strokeDasharray="5 3" />
        {/* El día en curso va punteado: es una tasa de un día a medias, no un desplome. */}
        {tramos.map((t, k) => <polyline key={k} points={t.filter(i => !pts[i]!.parcial).map(i => `${X(i)},${Y(pts[i]!.real!)}`).join(' ')} fill="none" stroke="var(--dato-1)" strokeWidth={1.8} />)}
        {pts.length > 1 && pts.at(-1)!.parcial && pts.at(-1)!.real !== null && pts.at(-2)!.real !== null && (
          <line x1={X(pts.length - 2)} y1={Y(pts.at(-2)!.real!)} x2={X(pts.length - 1)} y2={Y(pts.at(-1)!.real!)} stroke="var(--dato-1)" strokeWidth={1.4} strokeDasharray="3 3" />
        )}
        {pts.map((p, i) => (
          <Tip key={p.d.dia.getTime()} as="g" data-dia={i} tabIndex={i === activo ? 0 : -1} onTecla={e => mover(e, i)} titulo={`${fechaCorta(p.d.dia)}${p.parcial ? ' · día en curso' : ''}`}
            pista={p.parcial ? `Parcial: ${n1(p.d.horas)} h. Se muestra como tasa diaria.` : undefined}
            filas={[['Real', p.d.real === null ? 'sin fiscal del punto de medición oficial' : `${n0(p.d.real)} bbl`], ['Potencial', `${n0(p.d.potencial)} bbl`], ['Meta', p.d.meta === null ? SIN_META : `${n0(p.d.meta)} bbl`],
              ['Diferido de los eventos', `${n0(p.d.diferido)} bbl`], ['Inventario entre días', p.d.residuo === null ? '—' : `${n0(p.d.residuo)} bbl`],
              ['Eficiencia', p.d.real === null || !p.d.potencial ? '—' : `${n1((p.d.real / p.d.potencial) * 100)} %`]]}>
            <rect x={X(i) - (G.x1 - G.x0) / pts.length / 2} y={G.y0} width={(G.x1 - G.x0) / pts.length} height={G.y1 - G.y0} fill="transparent" />
            {p.real === null ? null : p.parcial
              ? <circle cx={X(i)} cy={Y(p.real)} r={3} fill="var(--panel)" stroke="var(--dato-1)" strokeWidth={1.4} />
              : pts.length <= 45 && <circle cx={X(i)} cy={Y(p.real)} r={1.8} fill="var(--dato-1)" />}
            {conMarca(p, i) && (
              <text x={X(i)} y={G.y1 + 14} fontSize={9.5} textAnchor={i === pts.length - 1 ? 'end' : 'middle'} fill="var(--tinta2)">{etiqueta(p)}</text>
            )}
          </Tip>
        ))}
        <line x1={G.x0} x2={G.x1} y1={G.y1} y2={G.y1} stroke="var(--linea)" />
      </svg>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10.5px] text-[var(--tinta2)]">
        <span className="inline-flex items-center gap-1.5"><svg width="16" height="6" aria-hidden><line x1="0" x2="16" y1="3" y2="3" stroke="var(--dato-1)" strokeWidth="2" /></svg>real · punto de medición oficial</span>
        <span className="inline-flex items-center gap-1.5"><svg width="16" height="6" aria-hidden><line x1="0" x2="16" y1="3" y2="3" stroke="var(--tinta2)" strokeWidth="1.2" strokeDasharray="5 3" /></svg>potencial · lo que los pozos podían dar</span>
        <span className="inline-flex items-center gap-1.5"><svg width="16" height="6" aria-hidden><line x1="0" x2="16" y1="3" y2="3" stroke="var(--tinta3)" strokeWidth="1" strokeDasharray="2 3" /></svg>meta firmada</span>
        <span className="inline-flex items-center gap-1.5"><i className="inline-block size-2.5 bg-[var(--panel2)] ring-1 ring-[var(--linea)]" />diferido</span>
      </div>
    </div>
  )
}
