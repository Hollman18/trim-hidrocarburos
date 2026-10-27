import { useId, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useAncho } from '@/widgets/resultados/ancho'
import type { ChokeAnh } from '@/entities/choke'
import type { Momento, PlantaDelCampo, TramoVivo } from '@/shared/api/plantaViva'
import { Patrones, TextoSvg, MarcaSvg } from './piezas'
import { caminoDe, alReves, n0, n1, type Segmento, type Punto } from './cifras'

/* LA TUBERÍA (X5 §5.3): la de C, dibujada con el trazo de B y dentro de la
   tarjeta principal. Tres capas (X4 §4.2): el contorno es lo que cabe; el
   núcleo, lo que pasa; y en el tramo donde se trabó la pared se angosta y el
   hueco va rayado ahí adentro. «Limita» en gris con doble contorno, nunca en
   rojo. La rama del agua baja de la planta, pasa el tanque y las bombas y
   vuelve al yacimiento por los inyectores. «Sin identificar» va aparte, en
   una caja discontinua: no es un tramo.
   Antes: la tubería va llena y el tramo que avisa lleva una línea punteada de
   riesgo. Después: una barra gris bajo cada tramo con lo que no se produjo.
   Nada se mueve ni parpadea (X2 §5.5). SVG propio (X3). */

const TRAMOS: Array<{ k: Exclude<ChokeAnh, 'reservorio'>; x0: number; x1: number }> = [
  { k: 'pozo', x0: 110, x1: 244 }, { k: 'planta', x0: 256, x1: 452 }, { k: 'exportacion', x0: 464, x1: 556 },
]

/** La ⓘ de «limita» (X4 §4.10; P-12): el tramo que limita se decidió con una capacidad sin firmar. */
const notaLimita = (p: PlantaDelCampo, t: TramoVivo) => (t.limita && p.limitaSinFirmar ? `Limita ${p.limitaSinFirmar}.` : undefined)

/** Las teclas que abren un tramo con el teclado (U2 §2.8). */
const abreCon = (e: KeyboardEvent, abrir: () => void) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir() }
}

/** Lo que tienen en común los dos dibujos: un tramo que se recorre con Tab y se abre con Enter. */
function TramoInteractivo({ t, onAbrir, foco, nota, children }: {
  t: TramoVivo; onAbrir: (k: ChokeAnh) => void; foco: { x: number; y: number; w: number; h: number }
  /** Lo que dice la ⓘ del tramo («Limita con una capacidad sin firmar»): va en el globo y en el nombre accesible. */
  nota?: string
  children: ReactNode
}) {
  const [enfocado, setEnfocado] = useState(false)
  return (
    <g role="button" tabIndex={0} aria-label={`${t.nombre}: ${t.frase}${nota ? ` ${nota}` : ''}`} data-tramo={t.tramo} data-marcado={t.marcado ? '' : undefined}
      data-valor={t.valor} data-entero={t.entero} className="cursor-pointer outline-none" onClick={() => onAbrir(t.tramo)} onKeyDown={e => abreCon(e, () => onAbrir(t.tramo))}
      onFocus={() => setEnfocado(true)} onBlur={() => setEnfocado(false)}>
      {nota && <title>{nota}</title>}
      <rect x={foco.x} y={foco.y} width={foco.w} height={foco.h} rx={12} fill="transparent"
        stroke={enfocado ? 'var(--foco)' : 'none'} strokeWidth={2} />
      {children}
    </g>
  )
}

/* ─────────────────────────── escritorio: acostada ─────────────────────────── */

export function TuberiaAcostada({ planta: p, momento, onTramo, onSinIdentificar }: {
  planta: PlantaDelCampo; momento: Momento; onTramo: (k: ChokeAnh) => void; onSinIdentificar?: () => void
}) {
  const id = useId().replace(/:/g, '')
  const W = 708, H = 228, cy = 52
  const k = 88 / p.escalaBpd, h = (v: number) => (v * k) / 2
  const hf = h(p.pasaBpd)
  const tramo = (x: ChokeAnh) => p.tramos.find(t => t.tramo === x)!
  // Lo que cabe en cada tramo; sin dato, el núcleo con un margen (y el contorno discontinuo).
  const cabe = (x: ChokeAnh) => Math.max(tramo(x).cabeBpd ?? p.pasaBpd * 1.06, p.pasaBpd * 1.02)
  const marcado = p.tramos.find(t => t.marcado)
  const angosto = momento === 'durante' && marcado && marcado.tramo !== 'reservorio' && marcado.angostoBpd !== undefined
    ? (() => {
      const t = TRAMOS.find(x => x.k === marcado.tramo)!
      const m = (t.x1 - t.x0) * 0.18
      return { k: t.k, x0: t.x0 + m, x1: t.x1 - m, alto: h(Math.max(p.pasaBpd, marcado.angostoBpd!)) }
    })() : null

  // El borde de la tubería, de izquierda a derecha, con el angostamiento donde se trabó.
  const borde = (s: -1 | 1): { inicio: Punto; segs: Segmento[] } => {
    const y = (x: ChokeAnh) => cy + s * h(cabe(x))
    const segs: Segmento[] = []
    TRAMOS.forEach((t, i) => {
      const yt = y(t.k)
      if (angosto && angosto.k === t.k) {
        const ya = cy + s * angosto.alto
        segs.push({ a: [angosto.x0 - 16, yt] }, { c1: [angosto.x0 - 6, yt], c2: [angosto.x0 - 8, ya], a: [angosto.x0, ya] }, { a: [angosto.x1, ya] },
          { c1: [angosto.x1 + 8, ya], c2: [angosto.x1 + 6, yt], a: [angosto.x1 + 16, yt] })
      }
      segs.push({ a: [t.x1, yt] })
      const n = TRAMOS[i + 1]
      if (n) segs.push({ c1: [t.x1 + 7, yt], c2: [n.x0 - 7, y(n.k)], a: [n.x0, y(n.k)] })
    })
    return { inicio: [TRAMOS[0]!.x0 + 10, y(TRAMOS[0]!.k)], segs }
  }
  const arriba = borde(-1), b1 = borde(1), abajo = alReves(b1.inicio, b1.segs)
  const x0 = TRAMOS[0]!.x0, xu = TRAMOS.at(-1)!.x1, xr = xu + 10
  const yT0 = cy - h(cabe('pozo')), yB0 = cy + h(cabe('pozo')), yTu = cy - h(cabe('exportacion')), yBu = cy + h(cabe('exportacion'))
  const contorno = caminoDe(arriba.inicio, arriba.segs)
    + ` Q${xr} ${yTu} ${xr} ${yTu + 10} L${xr} ${yBu - 10} Q${xr} ${yBu} ${xu} ${yBu}`
    + caminoDe(abajo.inicio, abajo.segs).replace(/^M[^LC]*/, '')
    + ` L${x0 + 10} ${yB0} Q${x0} ${yB0} ${x0} ${yB0 - 10} L${x0} ${yT0 + 10} Q${x0} ${yT0} ${x0 + 10} ${yT0} Z`
  const xf = 566
  const ry = cy + 44 + 22
  const NOM = { tam: 15, peso: 600, color: 'var(--tinta)' }
  const maxDespues = Math.max(1, ...p.tramos.map(t => t.valor), p.sinIdentificar?.valor ?? 0)

  // La rama del agua.
  const r = p.ramal
  const xb = 440, yb = 198
  const ag = { stroke: r.hay ? 'var(--agua)' : 'var(--tinta3)', strokeWidth: 4.5, fill: 'none', strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const, strokeDasharray: r.hay ? undefined : '6 6' }
  const nB = r.bombas.length, paso = nB <= 4 ? 24 : 18
  const xBomba = (j: number) => xb - 38 - (nB - 1 - j) * paso
  const tq = { x: xb - 10, y: 144, w: 20, h: 34 }
  const nivel = (r.tanque?.nivelPct ?? 0) / 100, altoAlto = (r.tanque?.altoAltoPct ?? 0) / 100
  const parada = r.bombas.find(b => b.estado === 'parada')
  // Si afuera lleva «aquí se trabó» en su renglón, el rótulo del tanque baja para no pisarlo.
  const bajaTanque = tramo('exportacion').marca ? 14 : 0

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full max-w-[708px]" role="group" aria-label={p.ariaLabel} data-tuberia="acostada" data-momento={momento}>
      <Patrones id={id} />
      {/* El yacimiento: la roca, sin borde ni número. */}
      <TramoInteractivo t={tramo('reservorio')} onAbrir={onTramo} foco={{ x: 16, y: 2, w: 92, h: ry + 26 }}>
        <rect x={22} y={cy - 44} width={76} height={88} rx={18} fill="var(--roca)" />
        <rect x={22} y={cy - 44} width={76} height={88} rx={18} fill={`url(#${id}-roca)`} opacity={0.45} />
        <TextoSvg x={22} y={ry} {...NOM} partes={tramo('reservorio').titulo} />
        <TextoSvg x={22} y={ry + 18} partes={tramo('reservorio').linea} />
      </TramoInteractivo>

      {/* El contorno (lo que cabe), un solo tubo con sus reducciones suaves. */}
      <path d={contorno} fill="var(--tubo-vacio)" stroke="var(--pared)" strokeWidth={1.5} strokeLinejoin="round" />
      {/* «Limita»: doble contorno en tinta, nunca rojo. */}
      {TRAMOS.map(t => tramo(t.k).limita && (
        <rect key={`l${t.k}`} x={t.x0 - 5} y={cy - h(cabe(t.k)) - 5} width={t.x1 - t.x0 + 10} height={2 * h(cabe(t.k)) + 10} rx={15} fill="none" stroke="var(--tinta)" strokeWidth={1.6} />
      ))}
      {/* Un tramo sin dato: contorno discontinuo y la palabra. */}
      {TRAMOS.map(t => tramo(t.k).sinDato && (
        <rect key={`s${t.k}`} x={t.x0 - 3} y={cy - h(cabe(t.k)) - 3} width={t.x1 - t.x0 + 6} height={2 * h(cabe(t.k)) + 6} rx={13} fill="none" stroke="var(--tinta3)" strokeWidth={1.4} strokeDasharray="5 4" />
      ))}
      {/* Lo que pasa ahora: el mismo núcleo en todos los tramos, con la flecha a la venta. */}
      <path d={`M86 ${cy - hf} L${xf} ${cy - hf} L${xf} ${cy - hf - 8} L${xf + 22} ${cy} L${xf} ${cy + hf + 8} L${xf} ${cy + hf} L86 ${cy + hf} Z`} fill="var(--flujo)" />
      {/* Donde se trabó: la pared de siempre en discontinuo y el hueco rayado adentro. */}
      {angosto && (() => {
        const t = TRAMOS.find(x => x.k === angosto.k)!
        const yOrig = cy - h(cabe(t.k)), top = cy - angosto.alto, hr = Math.max(2, marcado!.valor * k)
        return (
          <g data-rayado="">
            {[yOrig, cy + h(cabe(t.k))].map(yv => <line key={yv} x1={angosto.x0 - 4} x2={angosto.x1 + 4} y1={yv} y2={yv} stroke="var(--pared)" strokeWidth={1.3} strokeDasharray="4 3" />)}
            <rect x={angosto.x0 + 2} y={Math.max(yOrig, top - hr)} width={angosto.x1 - angosto.x0 - 4} height={Math.max(2, top - Math.max(yOrig, top - hr))}
              fill={`url(#${id}-rayas)`} stroke="var(--rayado)" strokeWidth={1.3} />
          </g>
        )
      })()}
      {/* Antes: la línea punteada de riesgo alrededor del tramo que avisa. */}
      {momento === 'antes' && marcado && marcado.tramo !== 'reservorio' && (() => {
        const t = TRAMOS.find(x => x.k === marcado.tramo)!
        return <rect x={t.x0 - 9} y={cy - h(cabe(t.k)) - 9} width={t.x1 - t.x0 + 18} height={2 * h(cabe(t.k)) + 18} rx={18} fill="none" stroke="var(--tinta2)" strokeWidth={1.5} strokeDasharray="4 3" data-riesgo="" />
      })()}

      {/* Los tramos: su rótulo debajo, como los puntos de la línea de B; Tab los recorre y Enter abre la hoja. */}
      {TRAMOS.map(t => {
        const x = tramo(t.k)
        const lx = t.x0 + 10
        const delMomento = x.equipos[0]
        const conMarca = momento === 'antes' && x.marcado && delMomento && (delMomento.prioridad || delMomento.sinInstrumento)
        const aparte = !!x.marca && t.k !== 'planta'
        const ry2 = ry + (aparte ? 17 : 0)
        return (
          <TramoInteractivo key={t.k} t={x} onAbrir={onTramo} foco={{ x: t.x0 - 12, y: 2, w: t.x1 - t.x0 + 24, h: ry + 26 + (aparte ? 17 : 0) }} nota={notaLimita(p, x)}>
            {/* «aquí se trabó» va en el rótulo de la planta (ancha); en los pozos y afuera, en su propio renglón. */}
            <TextoSvg x={lx} y={ry} {...NOM} partes={x.marca && !aparte ? [...x.titulo, ` · ${x.marca}`] : x.titulo} />
            {aparte && <TextoSvg x={lx} y={ry + 17} tam={14} peso={600} color="var(--tinta)">{x.marca}</TextoSvg>}
            {momento === 'despues' ? (
              <>
                <rect x={lx} y={ry2 + 9} width={52} height={7} rx={3.5} fill="var(--pista)" />
                {x.valor > 0.5 && <rect x={lx} y={ry2 + 9} width={Math.max(3, (52 * x.valor) / maxDespues)} height={7} rx={3.5} fill="var(--dato1)" data-barra-despues={x.valor} />}
                <TextoSvg x={lx + 60} y={ry2 + 18} partes={x.linea} />
              </>
            ) : conMarca ? (
              <>
                <MarcaSvg x={lx} y={ry2 + 6} s={delMomento.prioridad} sinInstrumento={delMomento.sinInstrumento} t={14} />
                <TextoSvg x={lx + 19} y={ry2 + 18} partes={x.linea} />
              </>
            ) : <TextoSvg x={lx} y={ry2 + 18} partes={x.linea} />}
          </TramoInteractivo>
        )
      })}
      {/* La venta, con su meta (X4 §4.6). «Al cierre» es proyectado: su palabra y el trazo discontinuo (H10; X2 I7 y D1). */}
      <g data-venta="" data-calidad={p.venta.calidad}>
        <TextoSvg x={606} y={ry} {...NOM}>{p.venta.titulo}</TextoSvg>
        <TextoSvg x={606} y={ry + 18} partes={[{ b: n0(p.venta.valor) }, ` ${p.venta.unidad}`]} />
        {p.venta.calidad === 'proyectado'
          ? <>
            <TextoSvg x={606} y={ry + 35}>{`proyectado${p.venta.metaTexto ? ` · ${p.venta.metaTexto}` : ''}`}</TextoSvg>
            <rect x={598} y={ry - 17} width={W - 600} height={58} rx={10} fill="none" stroke="var(--tinta3)" strokeWidth={1.3} strokeDasharray="4 3" data-proyectado="" />
          </>
          : p.venta.metaTexto && <TextoSvg x={606} y={ry + 35}>{p.venta.metaTexto}</TextoSvg>}
        {p.venta.bajoMeta && momento !== 'durante' && <MarcaSvg x={588} y={ry + 25} s={3} t={13} />}
      </g>

      {/* La rama del agua: baja de la planta, pasa el tanque y las bombas, y vuelve al yacimiento por los inyectores. */}
      <g data-ramal-agua={r.hay ? '' : 'sin-dato'}>
        <path d={`M${xb} ${cy + h(cabe('planta'))} L${xb} ${yb - 12} Q${xb} ${yb} ${xb - 12} ${yb} L20 ${yb} Q8 ${yb} 8 ${yb - 12} L8 ${cy + 26} Q8 ${cy + 14} 20 ${cy + 14} L22 ${cy + 14}`} {...ag} />
        {r.hay && [[xb, 116, xb, 122], [250, yb, 244, yb], [100, yb, 94, yb], [8, 116, 8, 110]].map(([a, b, c, d]) => (
          <line key={`${a}-${b}`} x1={a} y1={b} x2={c} y2={d} stroke="var(--agua)" strokeWidth={4.5} markerEnd={`url(#${id}-fl)`} />
        ))}
        {r.tanque ? (
          <>
            <rect x={tq.x} y={tq.y} width={tq.w} height={tq.h} rx={4} fill="var(--panel)" stroke="var(--pared)" strokeWidth={1.5} />
            {r.tanque.nivelPct !== null && <rect x={tq.x + 2.5} y={tq.y + 2.5 + (tq.h - 5) * (1 - nivel)} width={tq.w - 5} height={(tq.h - 5) * nivel} rx={2} fill="var(--dato3)" />}
            {r.tanque.altoAltoPct !== null && <line x1={tq.x - 5} x2={tq.x + tq.w + 5} y1={tq.y + 2.5 + (tq.h - 5) * (1 - altoAlto)} y2={tq.y + 2.5 + (tq.h - 5) * (1 - altoAlto)} stroke="var(--tinta)" strokeWidth={1.5} />}
            <TextoSvg x={xb + 18} y={160 + bajaTanque} partes={['tanque ', { b: r.tanque.nivelPct !== null ? `${n1(r.tanque.nivelPct)} %` : 'sin dato' }]} />
            {r.tanque.altoAltoPct !== null && <TextoSvg x={xb + 18} y={177 + bajaTanque}>{`alto-alto ${n0(r.tanque.altoAltoPct)} %`}</TextoSvg>}
          </>
        ) : (
          <>
            <rect x={tq.x} y={tq.y} width={tq.w} height={tq.h} rx={4} fill="none" stroke="var(--tinta3)" strokeWidth={1.4} strokeDasharray="4 3" />
            <TextoSvg x={xb + 18} y={166}>tanque · sin dato</TextoSvg>
          </>
        )}
        {r.entraBpd !== null && <TextoSvg x={xb - 18} y={166} ancla="end">{`agua que entra: ${n0(r.entraBpd)} bbl/d`}</TextoSvg>}
        {/* Las bombas en paralelo, por brillo: la parada oscura con su única marca; las que no tienen instrumento, discontinuas. */}
        {r.bombas.map((b, j) => b.estado === 'parada'
          ? <circle key={b.id} cx={xBomba(j)} cy={yb} r={9.5} fill="var(--eq-parado)" stroke="var(--tinta)" strokeWidth={2}><title>{`${b.id} parada`}</title></circle>
          : b.estado === 'sin-instrumento'
            ? <circle key={b.id} cx={xBomba(j)} cy={yb} r={8.5} fill="var(--panel)" stroke="var(--tinta3)" strokeWidth={1.5} strokeDasharray="3 2.4"><title>{`${b.id} sin instrumento`}</title></circle>
            : <circle key={b.id} cx={xBomba(j)} cy={yb} r={8.5} fill="var(--eq-marcha)" stroke="var(--pared)" strokeWidth={1.5}><title>{`${b.id} en marcha`}</title></circle>)}
        {parada && <MarcaSvg x={xBomba(r.bombas.indexOf(parada)) - 7} y={yb - 27} s={parada.prioridad} />}
        {r.texto.length > 0 && <TextoSvg x={xb - 18} y={yb + 25} ancla="end" partes={r.texto} />}
        <TextoSvg x={24} y={yb - 9}>{r.hay ? 'inyectores: el agua vuelve al yacimiento' : 'el agua del campo: sin dato'}</TextoSvg>
      </g>

      {/* Sin identificar: aparte, con borde discontinuo (no es un tramo). */}
      {p.sinIdentificar && (
        <g data-sin-identificar="" data-valor={p.sinIdentificar.valor} data-entero={p.sinIdentificar.entero} role="button" tabIndex={0} className="cursor-pointer outline-none focus-visible:[&>rect]:stroke-[var(--foco)]"
          aria-label={`${p.sinIdentificar.titulo}, ${p.sinIdentificar.linea}. Pedir la causa`} onClick={onSinIdentificar} onKeyDown={e => onSinIdentificar && abreCon(e, onSinIdentificar)}>
          <rect x={556} y={162} width={W - 557} height={62} rx={14} fill="none" stroke="var(--tinta3)" strokeWidth={1.4} strokeDasharray="5 4" />
          <TextoSvg x={570} y={184} partes={[{ b: p.sinIdentificar.titulo }]} />
          <TextoSvg x={570} y={202}>{p.sinIdentificar.linea.length > 22 ? 'sin identificar' : p.sinIdentificar.linea}</TextoSvg>
          {/* En el papel un enlace no hace nada (V2-2). */}
          <TextoSvg x={570} y={217} peso={600} color="var(--tinta)" className="no-imprimir">Pedir la causa ›</TextoSvg>
        </g>
      )}
    </svg>
  )
}

/* ─────────────────────────── teléfono: de pie ─────────────────────────── */

const DE_PIE: Array<{ k: Exclude<ChokeAnh, 'reservorio'>; y0: number; y1: number; rotulo: number }> = [
  { k: 'pozo', y0: 66, y1: 146, rotulo: 100 }, { k: 'planta', y0: 158, y1: 290, rotulo: 196 }, { k: 'exportacion', y0: 302, y1: 348, rotulo: 321 },
]

export function TuberiaDePie({ planta: p, momento, onTramo, onSinIdentificar, ventaEnLaCifra = false }: {
  planta: PlantaDelCampo; momento: Momento; onTramo: (k: ChokeAnh) => void; onSinIdentificar?: () => void
  /** K2 · La cifra grande ya es lo que sale hoy (la lente técnica, P-01): el renglón de la venta
   *  no la repite («Sale hoy · meta 10.900»). La cifra queda en el nombre del dibujo. */
  ventaEnLaCifra?: boolean
}) {
  const id = useId().replace(/:/g, '')
  // Al ancho de verdad (H9): una unidad es un px y la letra de 13 se ve de 13, también a 320 px. Angosta
  // (menos de 300 px), los rótulos arrancan más cerca del tubo y lo largo baja a otro renglón.
  const [ref, medido] = useAncho(326)
  const ancho = Math.max(236, Math.min(420, medido)), angosta = ancho < 300, cx = 34
  const k = 60 / p.escalaBpd, w = (v: number) => (v * k) / 2
  const hf = w(p.pasaBpd)
  const tramo = (x: ChokeAnh) => p.tramos.find(t => t.tramo === x)!
  const cabe = (x: ChokeAnh) => Math.max(tramo(x).cabeBpd ?? p.pasaBpd * 1.06, p.pasaBpd * 1.02)
  const marcado = p.tramos.find(t => t.marcado)
  const angosto = momento === 'durante' && marcado && marcado.tramo !== 'reservorio' && marcado.angostoBpd !== undefined
    ? (() => { const t = DE_PIE.find(x => x.k === marcado.tramo)!; return { k: t.k, y0: t.y0 + 20, y1: t.y1 - 20, ancho: w(Math.max(p.pasaBpd, marcado.angostoBpd!)) } })()
    : null
  const lado = (s: -1 | 1): { inicio: Punto; segs: Segmento[] } => {
    const x = (t: ChokeAnh) => cx + s * w(cabe(t))
    const segs: Segmento[] = []
    DE_PIE.forEach((t, i) => {
      const xt = x(t.k)
      if (angosto && angosto.k === t.k) {
        const xa = cx + s * angosto.ancho
        segs.push({ a: [xt, angosto.y0 - 14] }, { c1: [xt, angosto.y0 - 5], c2: [xa, angosto.y0 - 7], a: [xa, angosto.y0] }, { a: [xa, angosto.y1] },
          { c1: [xa, angosto.y1 + 7], c2: [xt, angosto.y1 + 5], a: [xt, angosto.y1 + 14] })
      }
      segs.push({ a: [xt, t.y1] })
      const n = DE_PIE[i + 1]
      if (n) segs.push({ c1: [xt, t.y1 + 6], c2: [x(n.k), n.y0 - 6], a: [x(n.k), n.y0] })
    })
    return { inicio: [x(DE_PIE[0]!.k), DE_PIE[0]!.y0 + 8], segs }
  }
  const izq = lado(-1), l1 = lado(1), der = alReves(l1.inicio, l1.segs)
  const yu = DE_PIE.at(-1)!.y1, y0 = DE_PIE[0]!.y0
  const xL0 = cx - w(cabe('pozo')), xR0 = cx + w(cabe('pozo')), xLu = cx - w(cabe('exportacion')), xRu = cx + w(cabe('exportacion'))
  const contorno = caminoDe(izq.inicio, izq.segs)
    + ` Q${xLu} ${yu + 8} ${xLu + 8} ${yu + 8} L${xRu - 8} ${yu + 8} Q${xRu} ${yu + 8} ${xRu} ${yu}`
    + caminoDe(der.inicio, der.segs).replace(/^M[^LC]*/, '')
    + ` L${xR0} ${y0 + 8} Q${xR0} ${y0} ${xR0 - 8} ${y0} L${xL0 + 8} ${y0} Q${xL0} ${y0} ${xL0} ${y0 + 8} Z`
  const x = angosta ? 76 : 90
  const NOM = { tam: 15, peso: 600, color: 'var(--tinta)' }
  const r = p.ramal
  const parada = r.bombas.find(b => b.estado === 'parada')
  const planta = tramo('planta')
  // Angosta, sin el primer renglón de la nota («se angostó: con P-201B parada»): el ramal de abajo ya dice la bomba parada.
  const nota = planta.marcado && momento === 'durante' ? (angosta ? (planta.nota ?? []).slice(1) : planta.nota ?? []) : []
  const yRamal = 282
  // Angosta: «Pedir la causa ›» baja a su renglón dentro de la caja.
  const altoSin = angosta ? 64 : 46
  const H = p.sinIdentificar ? 406 + altoSin + 2 : 404
  const maxDespues = Math.max(1, ...p.tramos.map(t => t.valor), p.sinIdentificar?.valor ?? 0)
  const tanque = r.tanque ? ['tanque ', { b: r.tanque.nivelPct !== null ? `${n1(r.tanque.nivelPct)} %` : 'sin dato' }] as const : ['tanque sin dato'] as const
  // El renglón del ramal, medido a lo largo (13 px de Air: unos 6,9 px por letra, con margen) contra el ancho que queda.
  const textoRamal = `${parada ? `${parada.id} parada · ` : r.bombas.length ? `bombas: ${r.resumen} · ` : 'agua: '}${r.tanque ? `tanque ${r.tanque.nivelPct !== null ? `${n1(r.tanque.nivelPct)} %` : 'sin dato'}` : 'tanque sin dato'}`
  const cabeElRamal = textoRamal.length * 6.9 <= ancho - (parada ? x + 21 : x) - 4
  const lineaBomba = `ahora: ${parada ? `${parada.id} parada` : r.bombas.length ? `bombas: ${r.resumen}` : 'agua'}`
  const ahoraArriba = momento === 'despues' && lineaBomba.length * 6.9 > ancho - (parada ? x + 21 : x) - 4

  return (
    <div ref={ref} className="w-full max-w-[420px]">
    <svg width={ancho} height={H} viewBox={`0 0 ${ancho} ${H}`} className="block" role="group" aria-label={p.ariaLabel} data-tuberia="de-pie" data-momento={momento}>
      <Patrones id={id} />
      <TramoInteractivo t={tramo('reservorio')} onAbrir={onTramo} foco={{ x: 0, y: 0, w: ancho, h: 56 }}>
        <rect x={cx - 28} y={2} width={56} height={52} rx={16} fill="var(--roca)" />
        <rect x={cx - 28} y={2} width={56} height={52} rx={16} fill={`url(#${id}-roca)`} opacity={0.45} />
        <TextoSvg x={x} y={24} {...NOM} partes={tramo('reservorio').titulo} />
        <TextoSvg x={x} y={42} partes={tramo('reservorio').linea} />
      </TramoInteractivo>
      <path d={contorno} fill="var(--tubo-vacio)" stroke="var(--pared)" strokeWidth={1.5} strokeLinejoin="round" />
      {DE_PIE.map(t => tramo(t.k).limita && (
        <rect key={`l${t.k}`} x={cx - w(cabe(t.k)) - 4} y={t.y0 - 4} width={2 * w(cabe(t.k)) + 8} height={t.y1 - t.y0 + 8} rx={12} fill="none" stroke="var(--tinta)" strokeWidth={1.6} />
      ))}
      <path d={`M${cx - hf} 44 L${cx - hf} 352 L${cx - hf - 7} 352 L${cx} 372 L${cx + hf + 7} 352 L${cx + hf} 352 L${cx + hf} 44 Z`} fill="var(--flujo)" />
      {angosto && (
        <g data-rayado="">
          {[cx - w(cabe(angosto.k)), cx + w(cabe(angosto.k))].map(xv => <line key={xv} x1={xv} x2={xv} y1={angosto.y0 - 4} y2={angosto.y1 + 4} stroke="var(--pared)" strokeWidth={1.3} strokeDasharray="4 3" />)}
          <rect x={cx + angosto.ancho} y={angosto.y0 + 2} width={Math.max(2, Math.min(marcado!.valor * k, w(cabe(angosto.k)) - angosto.ancho))} height={angosto.y1 - angosto.y0 - 4}
            fill={`url(#${id}-rayas)`} stroke="var(--rayado)" strokeWidth={1.2} />
        </g>
      )}
      {momento === 'antes' && marcado && marcado.tramo !== 'reservorio' && (() => {
        const t = DE_PIE.find(y => y.k === marcado.tramo)!
        return <rect x={cx - w(cabe(t.k)) - 8} y={t.y0 - 8} width={2 * w(cabe(t.k)) + 16} height={t.y1 - t.y0 + 16} rx={14} fill="none" stroke="var(--tinta2)" strokeWidth={1.5} strokeDasharray="4 3" data-riesgo="" />
      })()}
      {/* La rama del agua sale de la planta como un renglón propio. */}
      {/* Sin bomba parada, el ramal termina antes del rótulo (angosta, el rótulo arranca en 76 y lo tocaba). */}
      <path d={`M${cx + w(cabe('planta'))} ${yRamal} L${parada ? 84 : Math.min(84, x - 6)} ${yRamal}`} stroke={r.hay ? 'var(--agua)' : 'var(--tinta3)'} strokeWidth={4} fill="none" strokeLinecap="round" strokeDasharray={r.hay ? undefined : '5 5'} />
      {DE_PIE.map(t => {
        const y = tramo(t.k)
        // K2 · Angosta (320 px), «aquí se trabó» baja a su renglón: con «◄ limita ⓘ» no cabe en uno (se recortaba).
        // (Solo en los pozos: la planta lleva su nota debajo y la salida tiene la venta pegada.)
        const marcaAparte = angosta && !!y.marca && t.k === 'pozo'
        const yl = t.rotulo, yl2 = yl + (marcaAparte ? 18 : 0)
        const delMomento = y.equipos[0]
        return (
          <TramoInteractivo key={t.k} t={y} onAbrir={onTramo} foco={{ x: 0, y: t.y0 - 6, w: ancho, h: t.y1 - t.y0 + 12 - (t.k === 'planta' ? 30 : 0) }} nota={notaLimita(p, y)}>
            <TextoSvg x={x} y={yl} {...NOM} partes={y.marca && !marcaAparte ? [...y.titulo, ` · ${y.marca}`] : y.titulo} />
            {marcaAparte && <TextoSvg x={x} y={yl + 18} {...NOM} partes={[y.marca!]} />}
            {momento === 'despues' ? (
              <>
                <rect x={x} y={yl2 + 10} width={80} height={7} rx={3.5} fill="var(--pista)" />
                {y.valor > 0.5 && <rect x={x} y={yl2 + 10} width={Math.max(3, (80 * y.valor) / maxDespues)} height={7} rx={3.5} fill="var(--dato1)" data-barra-despues={y.valor} />}
                <TextoSvg x={x + 88} y={yl2 + 20} tam={14} partes={y.linea} />
              </>
            ) : momento === 'antes' && y.marcado && delMomento && (delMomento.prioridad || delMomento.sinInstrumento) ? (
              <>
                <MarcaSvg x={x} y={yl2 + 8} s={delMomento.prioridad} sinInstrumento={delMomento.sinInstrumento} t={14} />
                <TextoSvg x={x + 19} y={yl2 + 20} tam={14} partes={y.linea} />
              </>
            ) : <TextoSvg x={x} y={yl2 + 20} tam={14} partes={y.linea} />}
            {t.k === 'planta' && nota.map((l, i) => <TextoSvg key={l} x={x} y={yl + 40 + i * 17}>{l}</TextoSvg>)}
          </TramoInteractivo>
        )
      })}
      <g data-ramal-agua={r.hay ? '' : 'sin-dato'}>
        {parada && <MarcaSvg x={x} y={yRamal - 10} s={parada.prioridad} />}
        {/* K2 · En un renglón solo si cabe: «bombas: 7 de 7 en marcha · tanque 61,8 %» no cabe a 390 px (se recortaba). */}
        {angosta || momento === 'despues' || !cabeElRamal
          // Angosta (o en Después, con «ahora:» delante): la bomba en un renglón y el tanque en el de abajo.
          ? <>
            {/* K2 · Si «ahora: bombas: 7 de 7 en marcha» no cabe (Después, a 320 px), «ahora:» sube a su renglón:
                en Después la planta no lleva nota y arriba del ramal hay lugar. */}
            {ahoraArriba && <TextoSvg x={parada ? x + 21 : x} y={yRamal - 13}>ahora:</TextoSvg>}
            <TextoSvg x={parada ? x + 21 : x} y={yRamal + 3}
              partes={[...(momento === 'despues' && !ahoraArriba ? ['ahora: '] : []), ...(parada ? [{ b: parada.id }, ' parada'] : r.bombas.length ? [`bombas: ${r.resumen}`] : ['agua'])]} />
            <TextoSvg x={parada ? x + 21 : x} y={yRamal + 19} partes={[...tanque]} />
          </>
          : <TextoSvg x={parada ? x + 21 : x} y={yRamal + 3}
            partes={[...(parada ? [{ b: parada.id }, ' parada · '] : r.bombas.length ? [`bombas: ${r.resumen} · `] : ['agua: ']), ...tanque]} />}
      </g>
      <g data-venta="" data-calidad={p.venta.calidad}>
        {ventaEnLaCifra && p.venta.calidad !== 'proyectado'
          ? <TextoSvg x={x} y={372} tam={15} partes={[{ b: p.venta.titulo }, ...(p.venta.metaTexto ? [` · ${p.venta.metaTexto}`] : [])]} />
          : <TextoSvg x={x} y={372} {...NOM} partes={[`${p.venta.titulo} `, { b: `${n0(p.venta.valor)} ${p.venta.unidad}` }]} />}
        {p.venta.calidad === 'proyectado'
          ? <>
            <TextoSvg x={x} y={390}>{`proyectado${p.venta.metaTexto ? ` · ${p.venta.metaTexto}` : ''}`}</TextoSvg>
            <rect x={x - 8} y={356} width={ancho - x + 6} height={42} rx={10} fill="none" stroke="var(--tinta3)" strokeWidth={1.3} strokeDasharray="4 3" data-proyectado="" />
          </>
          : p.venta.metaTexto && !ventaEnLaCifra && <TextoSvg x={x} y={390}>{p.venta.metaTexto}</TextoSvg>}
      </g>
      {p.sinIdentificar && (
        <g data-sin-identificar="" data-valor={p.sinIdentificar.valor} data-entero={p.sinIdentificar.entero} role="button" tabIndex={0} className="cursor-pointer outline-none"
          aria-label={`${p.sinIdentificar.titulo}, sin identificar. Pedir la causa`} onClick={onSinIdentificar} onKeyDown={e => onSinIdentificar && abreCon(e, onSinIdentificar)}>
          <rect x={1} y={406} width={ancho - 2} height={altoSin} rx={14} fill="none" stroke="var(--tinta3)" strokeWidth={1.4} strokeDasharray="5 4" />
          <TextoSvg x={16} y={434} partes={[{ b: p.sinIdentificar.titulo }, momento === 'durante' ? ' sin identificar' : '']} />
          {angosta
            ? <TextoSvg x={16} y={454} peso={600} color="var(--tinta)" className="no-imprimir">Pedir la causa ›</TextoSvg>
            : <TextoSvg x={ancho - 14} y={434} ancla="end" peso={600} color="var(--tinta)" className="no-imprimir">Pedir la causa ›</TextoSvg>}
        </g>
      )}
    </svg>
    </div>
  )
}

/* ─────────────────────────── en chico: una fila por campo ─────────────────────────── */

/** La tubería en chico (pozos, planta, salida) con el tramo trabado angostado y rayado;
 *  en Antes, el tramo que avisa con la línea punteada. */
export function MiniTuberia({ tramo, momento, ancho = 320 }: { tramo: ChokeAnh | null; momento: Momento; ancho?: number }) {
  const id = useId().replace(/:/g, '')
  const cy = 12, al = 20, nucleo = 8, L = ancho - 22
  const donde = tramo === 'pozo' || tramo === 'reservorio' ? 0 : tramo === 'planta' ? 1 : tramo === 'exportacion' ? 2 : null
  const seg = [[0, 0.34], [0.37, 0.71], [0.74, 1]].map(([a, b]) => [a! * L, b! * L] as const)
  return (
    <svg viewBox={`0 0 ${ancho} 24`} className="block h-auto w-full" aria-hidden data-mini-tuberia={tramo ?? ''}>
      <Patrones id={id} />
      {seg.map(([a, b], i) => {
        const trabado = i === donde && momento !== 'antes'
        const hh = trabado ? nucleo + 6 : al
        return (
          <g key={i}>
            <rect x={a} y={cy - hh / 2} width={b - a} height={hh} rx={hh / 2} fill="var(--tubo-vacio)" stroke="var(--pared)" strokeWidth={1.2} />
            {trabado && (
              <>
                {[cy - al / 2, cy + al / 2 - 0.5].map(yv => <line key={yv} x1={a + 6} x2={b - 6} y1={yv} y2={yv} stroke="var(--pared)" strokeWidth={1} strokeDasharray="3 2.5" />)}
                <rect x={a + 8} y={cy - al / 2 + 1} width={b - a - 16} height={al / 2 - nucleo / 2 - 4} fill={`url(#${id}-rayas)`} stroke="var(--rayado)" strokeWidth={0.9} />
              </>
            )}
            {i === donde && momento === 'antes' && <rect x={a - 2} y={1} width={b - a + 4} height={22} rx={11} fill="none" stroke="var(--tinta2)" strokeWidth={1.2} strokeDasharray="3 2.5" />}
          </g>
        )
      })}
      <path d={`M3 ${cy - nucleo / 2} L${L + 4} ${cy - nucleo / 2} L${L + 4} ${cy - nucleo / 2 - 4} L${ancho} ${cy} L${L + 4} ${cy + nucleo / 2 + 4} L${L + 4} ${cy + nucleo / 2} L3 ${cy + nucleo / 2} Z`} fill="var(--flujo)" />
    </svg>
  )
}
