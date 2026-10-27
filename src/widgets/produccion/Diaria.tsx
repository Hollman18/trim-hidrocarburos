import { useRef, useState } from 'react'
import type { Dia } from '@/entities/libro'
import { SIN_META } from '@/entities/configuracion'
import { fechaCorta } from '@/entities/reloj'
import { Tip } from '@/shared/ui/Tip'
import { n0, n1 } from '@/shared/lib/formato'
import { alFinal } from '@/shared/ui/alFinal'
import { useAnchoDibujo } from '@/widgets/resultados/ancho'

/** Escala con números redondos: el eje tiene que poder leerse. */
function escala(lo: number, hi: number): [number, number, number] {
  const span = Math.max(hi - lo, 1)
  const p = 10 ** Math.floor(Math.log10(span))
  const paso = [1, 2, 2.5, 5, 10].map(m => m * p).find(s => span / s <= 5) ?? 10 * p
  return [Math.floor(lo / paso) * paso, Math.ceil(hi / paso) * paso, paso]
}

/** Producción de cada día del punto de medición oficial contra el potencial
 *  de las pruebas y la meta firmada, en bbl/d. Lo que separa la curva real
 *  del potencial es el diferido. El día de hoy es parcial y se dice. La
 *  leyenda va en corto: de dónde sale cada curva lo dice «¿cómo se lee?». */
export function Diaria({ dias }: { dias: Dia[] }) {
  const tasa = (d: Dia, v: number) => (d.horas > 0 ? (v * 24) / d.horas : 0)
  // Un día sin fiscal no tiene punto: la curva real se corta ahí (hueco, no cero).
  // Un día con algún campo sin meta firmada tampoco tiene punto de meta: la línea se corta igual.
  const pts = dias.map(d => ({ d, real: d.real === null ? null : tasa(d, d.real), pot: tasa(d, d.potencial), meta: d.meta === null ? null : tasa(d, d.meta), parcial: d.horas < 23.99 }))
  const bajos = pts.flatMap(p => [p.real, p.meta].filter((v): v is number => v !== null))
  const [lo, hi, paso] = escala(Math.min(...(bajos.length ? bajos : pts.map(p => p.pot))) * 0.97, Math.max(...pts.map(p => p.pot)) * 1.02)
  // C5 · Se dibuja al ancho de verdad (una unidad = un px): sus rótulos no bajan de 12 px (X3 §5.5).
  const [medir, W] = useAnchoDibujo(540, 720)
  const G = { x0: 56, x1: W - 30, y0: 12, y1: 168 }
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
  // del largo real de cada marca (12 de fuente ≈ 6,6 por carácter), no de un número fijo.
  const ancho = (t: string) => t.length * 6.6
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
    <>
    <div ref={medir}><div ref={alFinal} className="overflow-x-auto">
      <svg ref={dibujo} width={W} height={196} viewBox={`0 0 ${W} 196`} className="block" role="group"
        aria-label={`Producción diaria contra el potencial del libro y la meta, ${pts.length} días. Con las flechas se pasa de un día a otro.`}>
        {marcas.map(v => (
          <g key={v}>
            <line x1={G.x0} x2={G.x1} y1={Y(v)} y2={Y(v)} stroke="var(--linea2)" strokeWidth={0.7} />
            <text x={G.x0 - 6} y={Y(v) + 4} fontSize={12} textAnchor="end" fill="var(--tinta3)" className="tabular">{v >= 1000 ? `${n1(v / 1000)} k` : n0(v)}</text>
          </g>
        ))}
        {huecos.map((h, k) => <polygon key={k} points={h} fill="var(--panel2)" stroke="none" />)}
        {tramosMeta.map((t, k) => <polyline key={k} points={t.map(i => `${X(i)},${Y(pts[i]!.meta!)}`).join(' ')} fill="none" stroke="var(--tinta3)" strokeWidth={1} strokeDasharray="2 3" />)}
        {/* H18 (X2 §5.3, punto 8): lo discontinuo es solo lo proyectado. El potencial va continuo, fino y claro
            (--dato3, 1,2 px); lo real, continuo y oscuro (--dato1, 1,8 px). */}
        <polyline points={linea(p => p.pot)} fill="none" stroke="var(--dato3)" strokeWidth={1.2} data-curva="potencial" />
        {/* El día en curso no se une con una raya: es una tasa de un día a medias, no un desplome. Va solo su punto hueco. */}
        {tramos.map((t, k) => <polyline key={k} points={t.filter(i => !pts[i]!.parcial).map(i => `${X(i)},${Y(pts[i]!.real!)}`).join(' ')} fill="none" stroke="var(--dato1)" strokeWidth={1.8} data-curva="real" />)}
        {pts.map((p, i) => (
          <Tip key={p.d.dia.getTime()} as="g" data-dia={i} tabIndex={i === activo ? 0 : -1} onTecla={e => mover(e, i)} titulo={`${fechaCorta(p.d.dia)}${p.parcial ? ' · día en curso' : ''}`}
            pista={p.parcial ? `Parcial: ${n1(p.d.horas)} h. Se muestra como tasa diaria.` : undefined}
            filas={[['Real', p.d.real === null ? 'sin fiscal del punto de medición oficial' : `${n0(p.d.real)} bbl`], ['Potencial del libro', `${n0(p.d.potencial)} bbl`], ['Meta', p.d.meta === null ? SIN_META : `${n0(p.d.meta)} bbl`],
              ['Diferido de los eventos', `${n0(p.d.diferido)} bbl`], ['Inventario entre días', p.d.residuo === null ? '—' : `${n0(p.d.residuo)} bbl`],
              ['Del potencial', p.d.real === null || !p.d.potencial ? '—' : `${n1((p.d.real / p.d.potencial) * 100)} %`]]}>
            <rect x={X(i) - (G.x1 - G.x0) / pts.length / 2} y={G.y0} width={(G.x1 - G.x0) / pts.length} height={G.y1 - G.y0} fill="transparent" />
            {p.real === null ? null : p.parcial
              ? <circle cx={X(i)} cy={Y(p.real)} r={3.5} fill="var(--panel)" stroke="var(--dato1)" strokeWidth={1.6} data-dia-en-curso="" />
              : pts.length <= 45 && <circle cx={X(i)} cy={Y(p.real)} r={1.8} fill="var(--dato1)" />}
            {conMarca(p, i) && (
              // El primer día arranca en el eje (no centrado): centrado se montaba sobre la cifra de abajo del eje vertical.
              <text x={X(i)} y={G.y1 + 17} fontSize={12} textAnchor={i === pts.length - 1 ? 'end' : i === 0 ? 'start' : 'middle'} fill="var(--tinta2)">{etiqueta(p)}</text>
            )}
          </Tip>
        ))}
        <line x1={G.x0} x2={G.x1} y1={G.y1} y2={G.y1} stroke="var(--linea)" />
      </svg>
    </div></div>
      {/* La leyenda va fuera del desplazable: en el teléfono la gráfica arranca al final y la cortaba. */}
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[var(--tinta2)]">
        <span className="inline-flex items-center gap-1.5"><svg width="16" height="6" aria-hidden><line x1="0" x2="16" y1="3" y2="3" stroke="var(--dato1)" strokeWidth="1.8" /></svg>real medido</span>
        {/* G-5: el potencial de las pruebas por el factor del mes es el «potencial del libro». */}
        <span className="inline-flex items-center gap-1.5"><svg width="16" height="6" aria-hidden><line x1="0" x2="16" y1="3" y2="3" stroke="var(--dato3)" strokeWidth="1.2" /></svg>potencial del libro</span>
        <span className="inline-flex items-center gap-1.5"><svg width="16" height="6" aria-hidden><line x1="0" x2="16" y1="3" y2="3" stroke="var(--tinta3)" strokeWidth="1" strokeDasharray="2 3" /></svg>meta firmada</span>
        <span className="inline-flex items-center gap-1.5"><i className="inline-block size-2.5 bg-[var(--panel2)] ring-1 ring-[var(--linea)]" />diferido</span>
        {pts.at(-1)?.parcial && <span className="inline-flex items-center gap-1.5" data-leyenda-en-curso=""><svg width="10" height="10" aria-hidden><circle cx="5" cy="5" r="3.5" fill="var(--panel)" stroke="var(--dato1)" strokeWidth="1.6" /></svg>día en curso</span>}
      </div>
    </>
  )
}
