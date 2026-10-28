import { useCallback, useId, useMemo, useState } from 'react'
import { cn } from '@/shared/lib/cn'
import { MarcaCondicion } from '@/shared/ui/Prioridad'
import { COLOR_CONDICION, DASH_TRAZO, cifra, fraseEstado, type Banda, type CondicionKit, type Escala, type EstadoKit, type TrazoKit } from './tipos'
import { etiquetasDeTiempo, marcasRedondas, rotulosQueCaben, textoBanda } from './ejes'
import { Anuncio, FichaFlotante, MuestraTrazo, type ContenidoFicha, type FilaFicha } from './Ficha'
import { CLASE_FOCO, useAnidado, useCursor, useMedida } from './cursor'

/* 2 · La tendencia (kit-scada.md §2; X2 §5.3). La ventana va escrita en el título («12 d»); el
   eje x con el primer día y «hoy», a la derecha y en negrita; el eje y rotulado en los límites, en
   los extremos de la escala y (D2) en marcas redondas con su cuadrícula fina; la unidad, en el eje;
   la banda normal sombreada (--banda al 60 %); la alarma en discontinuo de 1,2 px (5-3); la línea
   principal en --dato1 de 2 px; el último punto, un círculo de 2,6. Hasta 4 trazas, separadas POR
   TRAZO y no por color: continua, discontinua 6-3, punteada 1,5-3 y guion y punto. Si hay más, van
   como gráficas chicas iguales.
   D2 · Al pasar el cursor (o tocar y arrastrar, o con las flechas): la raya vertical de seguimiento,
   el punto de cada serie y la ficha con la fecha, el valor de cada serie con su unidad, los límites
   y el estado en palabras. Con 2 series o más, la leyenda: tocar una la deja sola (otra vez, todas);
   con Mayús, la apaga. `detalle`: más marcas, el rango escrito y la gráfica a lo ancho (el modal).
   Lo que nunca hace: autoescalar (la escala es la de su señal y siempre incluye la banda y los
   límites; apagar una serie tampoco la mueve); colorear las series; unir un hueco por encima ni
   pintarlo en cero; dibujar lo proyectado o lo simulado igual que lo medido (discontinuo y con su
   palabra); inventar un dato en la ficha («sin dato», nunca un cero). */

export type { TrazoKit } from './tipos'
const ORDEN_TRAZO: readonly TrazoKit[] = ['continuo', 'discontinuo', 'punteado', 'guion']
/** La primera serie en --dato1 y 2 px; las demás en --tinta2 y 1,6; con el equipo parado, todas en gris. */
const colorSerie = (k: number, gris: boolean) => (gris ? 'var(--dato3)' : k === 0 ? 'var(--dato1)' : 'var(--tinta2)')
const grosorSerie = (k: number) => (k === 0 ? 2 : 1.6)
const trazoSerie = (s: SerieKit, k: number): TrazoKit => (s.proyectado || s.simulado ? 'discontinuo' : s.trazo ?? ORDEN_TRAZO[k]!)

export interface SerieKit {
  nombre: string
  /** Un valor por punto de la ventana; null es un hueco (no hay lectura): corta la línea. */
  valores: ReadonlyArray<number | null>
  /** Sin decirlo, va en el orden de las trazas: continua, discontinua, punteada, guion y punto. */
  trazo?: TrazoKit
  /** Lo que no se midió (una proyección): discontinuo y con la palabra «proyectado». */
  proyectado?: boolean
  /** Lo que salió de un simulador: discontinuo y con la palabra «simulado». */
  simulado?: boolean
  /** La meta firmada: la ficha dice si lo medido quedó sobre o bajo ella en ese punto. */
  esMeta?: boolean
  /** En lugar de `valores`, los puntos (lugar, valor): una recta proyectada, que puede terminar entre
   *  dos lugares de la ventana. */
  puntos?: ReadonlyArray<readonly [number, number]>
}

/** El valor de una serie en el lugar i: null es un hueco; undefined, que la serie no llega ahí. */
function valorEn(s: SerieKit, i: number): number | null | undefined {
  if (s.puntos) {
    const p = s.puntos
    if (p.length < 2 || i < p[0]![0] - 1e-9 || i > p.at(-1)![0] + 1e-9) return undefined
    for (let j = 1; j < p.length; j++) {
      const [a, va] = p[j - 1]!, [b, vb] = p[j]!
      if (i <= b + 1e-9) return b === a ? vb : va + ((i - a) / (b - a)) * (vb - va)
    }
    return undefined
  }
  return i < s.valores.length ? s.valores[i] ?? null : undefined
}

export function Tendencia({ titulo, ventana, series, escala, unidad, banda, alarmas = [], estado = 'normal', condicion, cruzo, desde, paradaDesde, ejeX, hoy, hasta, rango, rotuloRango, nota, sinTitulo = false, decimales = 0, ancho, alto, compacta = false, className,
  etiquetas, tiempo, rotulosX, detalle = false, ajustar, leyenda, interactiva = true, nombreLimite = 'la alarma', sentidoAlarma, origen }: {
  /** Lo que mide: «Temperatura de cojinete». */
  titulo: string
  /** La ventana, escrita: «12 d», «Los 12 días antes de parar». */
  ventana: string
  series: readonly SerieKit[]
  escala: Escala
  unidad: string
  banda?: Banda
  alarmas?: readonly number[]
  estado?: EstadoKit
  condicion?: CondicionKit
  /** El límite cruzado: su raya toma el color de la prioridad; la línea sigue en tinta. */
  cruzo?: number
  /** «14:07»: la línea termina donde se perdió la señal. */
  desde?: string
  /** Desde qué punto el equipo está parado: ese tramo va rayado y la línea, en gris. */
  paradaDesde?: number
  /** El primer día y el último («hoy»). Con `hoy`, el último es el fin de lo proyectado («+12 d»). */
  ejeX?: readonly [string, string]
  /** El punto de hoy cuando la ventana sigue hacia adelante (la proyección del vigía): una raya
   *  vertical de 1 px con «hoy» arriba, en negrita. Lo de después es proyectado, nunca medido. */
  hoy?: number
  /** El último lugar de la ventana, si no es el de la serie más larga: lo proyectado sigue después de
   *  hoy y puede terminar entre dos lugares (`SerieKit.puntos`). */
  hasta?: number
  /** Los puntos entre los que la proyección cruzaría el límite (el primero de `alarmas`): una barra
   *  sobre su raya. */
  rango?: readonly [number, number]
  /** Lo que se escribe junto al rango: «en 5,2 d». */
  rotuloRango?: string
  /** Lo que se agrega al nombre accesible: «cruza el límite en 5,2 días». */
  nota?: string
  /** Sin el título escrito: lo dice la fila de arriba (la ventana va igual en el eje). */
  sinTitulo?: boolean
  decimales?: number
  /** En la ficha, 300 × 56 o más; en el nivel 1, 240 × 64 o más. En `detalle`, 640 × 240 si no se dice. */
  ancho?: number
  alto?: number
  /** En una placa o una fila: 110 a 150 × 30, sin ejes. */
  compacta?: boolean
  className?: string
  /** D2 · El cuándo de cada punto, para la ficha y las marcas del eje x: «21 de sept», «octubre 2026». */
  etiquetas?: readonly string[]
  /** D2 · O el comienzo y el paso de la serie (`SerieTag`): el kit escribe la fecha (y la hora si el
   *  paso es de horas). Sin `etiquetas` ni `tiempo`, la ficha dice «lectura 3 de 12»: nunca una fecha
   *  inventada. */
  tiempo?: { desde: string | number | Date; pasoH: number }
  /** D2 · El rótulo corto del eje x, si no es la etiqueta («sept» y no «septiembre 2026»). */
  rotulosX?: readonly string[]
  /** D2 · En el modal de detalle: más marcas, el rango escrito, mínimo y máximo en la leyenda, y a lo
   *  ancho de su caja. */
  detalle?: boolean
  /** D2 · A lo ancho del contenedor (medido). En `detalle`, sí si no se dice. */
  ajustar?: boolean
  /** D2 · La leyenda que aísla o apaga una serie. Sí con 2 series o más (no en la compacta). */
  leyenda?: boolean
  /** D2 · false: sin cursor ni ficha. La compacta responde al puntero pero no es parada de Tab; dentro
   *  de un botón o un enlace, ninguna de las dos (ya hay quien responde). */
  interactiva?: boolean
  /** D2 · Cómo se llama la raya de `alarmas` en la ficha: «la alarma», «el máximo firmado». */
  nombreLimite?: string
  /** D2 · De qué lado se pasa la alarma. Sin decirlo, sale de la banda (sobre su techo, alta; bajo su
   *  piso, baja); sin banda, alta (un máximo). */
  sentidoAlarma?: 'alta' | 'baja'
  /** D2 · De dónde sale el dato, para el pie de la ficha: «FQI-0101, medición oficial». */
  origen?: string
}) {
  const id = useId().replace(/:/g, '')
  const [refFigura, medido] = useMedida(ancho ?? (detalle ? 640 : 320), ajustar ?? detalle)
  const W = Math.max(compacta ? 40 : 160, medido)
  const H = alto ?? (detalle ? 240 : 72)
  const [refCaja, anidado] = useAnidado<HTMLSpanElement>()
  const [ocultas, setOcultas] = useState<ReadonlySet<string>>(() => new Set())
  const visibles = useMemo(() => series.slice(0, 4), [series])
  const gris = estado === 'parado'
  const marca = estado === 'anormal' && condicion ? condicion : null
  const conLeyenda = (leyenda ?? (visibles.length > 1)) && !compacta
  const N = Math.max(2, ...visibles.map(s => s.valores.length))
  const fin = hasta ?? N - 1
  const lugares = Math.floor(fin + 1e-9) + 1
  const tiempos = useMemo(() => etiquetas ?? (tiempo ? etiquetasDeTiempo(tiempo, lugares) : undefined), [etiquetas, tiempo, lugares])

  // ── La geometría: márgenes, escalas y marcas. No depende del cursor (pasarlo no la recalcula).
  const geo = useMemo(() => {
    const plano = H - (compacta ? 6 : 32)
    const cuantas = compacta ? 0 : detalle ? Math.max(4, Math.floor(plano / 34)) : plano >= 70 ? 4 : plano >= 45 ? 2 : 0
    const marcas = marcasRedondas(escala.min, escala.max, cuantas, decimales).filter(v => v > escala.min && v < escala.max)
    const bordes = banda && (detalle || plano >= 70) ? [banda[0], banda[1]].filter((v): v is number => v !== null && v > escala.min && v < escala.max) : []
    const textos = [...alarmas, escala.min, escala.max, ...marcas, ...bordes].map(v => cifra(v, decimales).length)
    // El margen izquierdo alcanza para el rótulo más largo del eje y (la mono de 12 px, ≈ 7,3 px por carácter).
    // El de arriba, para el tope de la escala (Firefox mide la caja del texto con todo el alto de la letra), y
    // para la unidad del eje (D2) o «hoy».
    const conUnidad = !compacta && !!unidad && H >= 70
    const L = compacta ? 2 : Math.max(40, Math.ceil(10 + 7.3 * Math.max(...textos)))
    const R = compacta ? 4 : 8
    const T = compacta ? 3 : hoy !== undefined ? 20 : conUnidad ? 18 : 12
    const B = compacta ? 3 : 20
    const X = (i: number) => L + (i / (fin || 1)) * (W - L - R)
    const Y = (v: number) => T + (1 - (Math.min(escala.max, Math.max(escala.min, v)) - escala.min) / (escala.max - escala.min || 1)) * (H - T - B)
    // El eje y: primero los límites, después los extremos de la escala, después las marcas redondas y los
    // bordes de la banda. Uno que quedaría encima de otro rótulo no se escribe.
    const rotulosY: Array<{ v: number; limite: boolean }> = []
    if (!compacta) {
      for (const v of [...alarmas, escala.min, escala.max]) if (!rotulosY.some(w => Math.abs(Y(w.v) - Y(v)) < 12)) rotulosY.push({ v, limite: alarmas.includes(v) })
      for (const v of [...bordes, ...marcas]) if (!rotulosY.some(w => Math.abs(Y(w.v) - Y(v)) < 16)) rotulosY.push({ v, limite: false })
    }
    // La cuadrícula, solo donde hay rótulo: una raya sin su cifra no se lee.
    return { L, R, T, B, X, Y, marcas: marcas.filter(v => rotulosY.some(r => r.v === v)), rotulosY, conUnidad }
  }, [H, W, compacta, detalle, escala.min, escala.max, decimales, banda, alarmas, unidad, hoy, fin])
  const { L, R, T, B, X, Y } = geo

  // ── El eje x: el primero y el último, y entre ellos las marcas que caben (sin la proyección).
  const ejeXFinal = useMemo((): readonly [string, string] | undefined => ejeX ?? (tiempos && tiempos.length ? [tiempos[0]!, tiempos[Math.min(N - 1, tiempos.length - 1)]!] : undefined), [ejeX, tiempos, N])
  const rotX = rotulosX ?? tiempos
  const intermedios = useMemo(() => !compacta && ejeXFinal && rotX && hoy === undefined
    ? rotulosQueCaben(Math.min(N, rotX.length), X, i => rotX[i] ?? '', ejeXFinal[0], ejeXFinal[1], L, W - R, detalle ? 72 : 96)
    : [], [compacta, ejeXFinal, rotX, hoy, N, X, L, W, R, detalle])


  const ultimo = visibles[0]?.valores.at(-1)
  const leido = estado === 'sin-comunicacion' ? fraseEstado(estado, { desde })
    : ultimo === null || ultimo === undefined ? 'sin lectura al final' : `último ${cifra(ultimo, decimales)} ${unidad}`
  const etiqueta = [`${titulo}, ${ventana}`, leido,
    alarmas.length ? `alarma en ${alarmas.map(a => cifra(a, decimales)).join(' y ')}` : '',
    marca ? `en ${fraseEstado('anormal', { condicion: marca })}` : '', gris ? 'equipo parado' : '',
    escala.firmada ? '' : 'escala provisional', nota ?? ''].filter(Boolean).join('; ')

  // ── La ficha de un punto: el cuándo, cada serie con su valor y su estado, los límites y el origen.
  const ultimaLectura = visibles[0] ? visibles[0].valores.findLastIndex(v => v !== null) : -1
  const fichaDe = useCallback((i: number): ContenidoFicha => {
    const meta = visibles.find(s => s.esMeta && !ocultas.has(s.nombre))
    const vMeta = meta ? valorEn(meta, i) : undefined
    const tope = banda?.[1] ?? null, piso = banda?.[0] ?? null
    const estadoDe = (v: number): { nota: string; fuerte: boolean } | null => {
      for (const a of alarmas) {
        const alta = sentidoAlarma ? sentidoAlarma === 'alta' : tope !== null ? a >= tope : piso !== null ? a > piso : true
        if (alta && v > a) return { nota: `sobre ${nombreLimite} (${cifra(a, decimales)})`, fuerte: true }
        if (!alta && v < a) return { nota: `bajo ${nombreLimite} (${cifra(a, decimales)})`, fuerte: true }
      }
      if (tope !== null && v > tope) return { nota: 'sobre la banda normal', fuerte: false }
      if (piso !== null && v < piso) return { nota: 'bajo la banda normal', fuerte: false }
      if (banda) return { nota: 'en banda', fuerte: false }
      // Sin banda, lo que dice el límite: «bajo el máximo firmado (800)».
      const a = alarmas[0]
      if (a === undefined) return null
      const alta = sentidoAlarma ? sentidoAlarma === 'alta' : true
      return { nota: `${alta ? 'bajo' : 'sobre'} ${nombreLimite} (${cifra(a, decimales)})`, fuerte: false }
    }
    const filas: FilaFicha[] = []
    visibles.forEach((s, k) => {
      if (ocultas.has(s.nombre)) return
      const v = valorEn(s, i)
      if (v === undefined) return
      const trazo = { trazo: trazoSerie(s, k), color: colorSerie(k, gris), grosor: grosorSerie(k) }
      const notas: string[] = []
      let valor: string, fuerte = false
      if (k === 0 && estado === 'sin-comunicacion' && i > ultimaLectura) { valor = '---'; notas.push(fraseEstado(estado, { desde })) }
      else if (v === null) { valor = '—'; notas.push('sin dato') }
      else {
        valor = cifra(v, decimales)
        if (s.proyectado) notas.push('proyectado')
        else if (s.simulado) notas.push('simulado')
        else if (!s.esMeta) {
          const e = estadoDe(v)
          if (e) { notas.push(e.nota); fuerte = e.fuerte }
          if (k === 0 && meta && vMeta !== null && vMeta !== undefined && meta !== s)
            notas.push(v < vMeta ? `bajo la meta por ${cifra(vMeta - v, decimales)}` : `sobre la meta por ${cifra(v - vMeta, decimales)}`)
        }
      }
      // El tramo rayado es el de la parada; el gris de «parado» es de ahora, no de cada lectura de la ventana.
      if (paradaDesde !== undefined && i >= paradaDesde) notas.push('equipo parado')
      filas.push({ clave: s.nombre, trazo, nombre: s.nombre, valor, unidad: valor === '—' || valor === '---' ? undefined : unidad || undefined, nota: notas.join(' · ') || undefined, fuerte })
    })
    const cuando = tiempos?.[i] ?? `Lectura ${i + 1} de ${N}`
    const pos = hoy !== undefined ? (i > hoy ? ' · proyectado' : i === hoy ? ' · hoy' : '') : i === N - 1 && /^hoy/.test(ejeX?.[1] ?? '') ? ' · hoy' : ''
    const limites = [banda ? textoBanda(banda, decimales) : '', alarmas.length ? `${nombreLimite.replace(/^(la|el) /, '')} en ${alarmas.map(a => cifra(a, decimales)).join(' y ')}` : ''].filter(Boolean)
    const pie = [limites.length ? `${limites.join(' · ').replace(/^./, c => c.toUpperCase())}${unidad ? ` ${unidad}` : ''}` : '',
      escala.firmada ? '' : 'Escala provisional', origen ? `De dónde sale: ${origen}` : ''].filter(Boolean)
    return { titulo: `${cuando}${pos}`, sub: `${titulo} · ${ventana}`, filas, pie }
  }, [visibles, ocultas, banda, alarmas, sentidoAlarma, nombreLimite, decimales, estado, desde, ultimaLectura, gris, paradaDesde, unidad, tiempos, N, hoy, ejeX, escala.firmada, origen, titulo, ventana])

  const enfocable = !compacta && !anidado
  const { ref: refSvg, cursor, props: eventos, dicho } = useCursor({
    n: lugares, vista: W, activo: interactiva && !anidado && lugares > 1, enfocable,
    indiceEn: x => Math.round(((x - L) / (W - L - R || 1)) * fin),
    inicial: () => Math.max(0, ultimaLectura),
    anuncio: i => { const f = fichaDe(i); return `${f.titulo}. ${f.filas.map(r => `${r.nombre}: ${r.valor}${r.unidad ? ` ${r.unidad}` : ''}${r.nota ? `, ${r.nota}` : ''}`).join('; ')}` },
  })

  // ── El dibujo fijo: no cambia al mover el cursor (se arma una vez por datos, tamaño y series apagadas).
  const fijo = useMemo(() => (
    <>
      {paradaDesde !== undefined && (
        <defs>
          <pattern id={`rayado-${id}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--linea)" strokeWidth="1.4" />
          </pattern>
        </defs>
      )}
      {/* La cuadrícula fina: una raya de 1 px en --linea2 por marca redonda, debajo de todo. */}
      {!compacta && geo.marcas.length > 0 && (
        <g data-rejilla="">
          {geo.marcas.map(v => <line key={`r${v}`} x1={L} x2={W - R} y1={Math.round(Y(v)) + 0.5} y2={Math.round(Y(v)) + 0.5} stroke="var(--linea2)" strokeWidth={1} />)}
          {detalle && intermedios.map(i => <line key={`rx${i}`} x1={Math.round(X(i)) + 0.5} x2={Math.round(X(i)) + 0.5} y1={T} y2={H - B} stroke="var(--linea2)" strokeWidth={1} />)}
        </g>
      )}
      {/* 28-oct · Qué atacar: más allá de la alarma, la zona en rojo pálido (frenado); entre la banda normal y la
          alarma, en amarillo pálido (en riesgo). Debajo de todo, para que la línea y la banda se lean encima; no en
          la compacta (96 × 26: sería solo color) ni con el equipo parado (sus señales van en gris). */}
      {!compacta && !gris && alarmas.length > 0 && (() => {
        const a = alarmas[0]!
        const tope = banda?.[1] ?? null, piso = banda?.[0] ?? null
        const alta = sentidoAlarma ? sentidoAlarma === 'alta' : tope !== null ? a >= tope : piso !== null ? a > piso : true
        const borde = alta ? escala.max : escala.min
        const limiteBanda = alta ? tope : piso
        const ya = Y(a), yb = Y(borde)
        const riesgo = limiteBanda !== null && limiteBanda !== a ? [Y(limiteBanda), ya] : null
        return (
          <g data-zonas="">
            <rect x={L} y={Math.min(ya, yb)} width={W - L - R} height={Math.abs(yb - ya)} fill="var(--frenado-f)" data-zona="frenado" />
            {riesgo && <rect x={L} y={Math.min(riesgo[0]!, riesgo[1]!)} width={W - L - R} height={Math.abs(riesgo[1]! - riesgo[0]!)} fill="var(--riesgo-f)" data-zona="riesgo" />}
          </g>
        )
      })()}
      {banda && (() => {
        const a = Y(banda[1] ?? escala.max), b = Y(banda[0] ?? escala.min)
        return <rect x={L} y={a} width={W - L - R} height={Math.max(b - a, 1)} fill="var(--banda)" opacity={gris ? 0.45 : 0.6} data-banda="" />
      })()}
      {!compacta && <line x1={L} x2={W - R} y1={Y(escala.min)} y2={Y(escala.min)} stroke="var(--linea)" strokeWidth={1} />}
      {geo.rotulosY.map(({ v, limite }) => (
        <text key={`y${v}`} x={L - 6} y={Y(v) + 4} textAnchor="end" fontSize={12} fill={limite ? 'var(--tinta2)' : 'var(--tinta3)'} fontFamily="var(--font-mono)"
          data-piso={v === escala.min ? '' : undefined}>{cifra(v, decimales)}</text>
      ))}
      {geo.conUnidad && <text x={L + 2} y={14} fontSize={12} fill="var(--tinta2)" data-unidad="">{unidad}</text>}
      {alarmas.map(a => (
        <line key={`a${a}`} x1={L} x2={W - R} y1={Y(a)} y2={Y(a)} strokeWidth={1.2} strokeDasharray="5 3" data-alarma=""
          stroke={marca && cruzo === a ? COLOR_CONDICION[marca] : 'var(--tinta2)'} />
      ))}
      {hoy !== undefined && hoy < fin && (
        <g data-hoy="">
          <line x1={X(hoy)} x2={X(hoy)} y1={T - 4} y2={H - B} stroke="var(--linea)" strokeWidth={1} />
          {!compacta && <text x={X(hoy)} y={T - 6} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--tinta2)">hoy</text>}
        </g>
      )}
      {rango && alarmas.length > 0 && (() => {
        // La barra del rango sobre la raya del límite; su rótulo, del lado que tiene espacio.
        const ya = Y(alarmas[0]!), x0 = X(Math.min(rango[0], fin)), x1 = X(Math.min(rango[1], fin))
        const abajo = ya < (T + H - B) / 2
        return (<g data-rango="">
          <rect x={x0} y={ya - 3.5} width={Math.max(3, x1 - x0)} height={7} fill="var(--tinta2)" opacity={0.5} />
          {!compacta && rotuloRango && <text x={Math.max(L + 4, Math.min(x1, W - R - 4))} y={abajo ? ya + 19 : ya - 8} textAnchor="end" fontSize={12} fontWeight={600} fill="var(--tinta)">{rotuloRango}</text>}
        </g>)
      })()}
      {paradaDesde !== undefined && <rect x={X(paradaDesde)} y={T} width={Math.max(W - R - X(paradaDesde), 0)} height={H - T - B} fill={`url(#rayado-${id})`} data-parado="" />}
      {visibles.map((s, k) => {
        if (ocultas.has(s.nombre)) return null
        // Un hueco corta la línea: nunca se une por encima ni se pinta en cero.
        let d = '', abierto = false
        if (s.puntos) d = s.puntos.map(([i, v], j) => `${j ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ')
        else s.valores.forEach((v, i) => {
          if (v === null) { abierto = false; return }
          d += `${abierto ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)} `; abierto = true
        })
        const trazo = trazoSerie(s, k)
        const color = colorSerie(k, gris)
        // El último punto es la última lectura: la ventana puede seguir sin lectura (la proyección, adelante).
        const ult = s.valores.findLastIndex(v => v !== null), uv = ult >= 0 ? s.valores[ult] : undefined
        return (
          <g key={s.nombre} data-serie={s.nombre} data-trazo={trazo}>
            <path d={d.trim()} fill="none" stroke={color} strokeWidth={grosorSerie(k)} strokeLinejoin="round" strokeDasharray={DASH_TRAZO[trazo]} />
            {(k === 0 && estado === 'sin-comunicacion') || s.proyectado || s.simulado
              ? null
              : uv !== null && uv !== undefined && <circle cx={X(ult)} cy={Y(uv)} r={2.6} fill={color} />}
          </g>
        )
      })}
      {estado === 'sin-comunicacion' && (
        <g transform={`translate(${W - R - 14} ${T})`}>
          <circle cx="7" cy="7" r="5.2" fill="none" stroke="var(--sincom)" strokeWidth="1.6" strokeDasharray="2.2 1.6" />
        </g>
      )}
      {!compacta && ejeXFinal && (<g data-eje-x="">
        {[0, ...intermedios, fin].map(i => <line key={`m${i}`} x1={Math.round(X(i)) + 0.5} x2={Math.round(X(i)) + 0.5} y1={H - B} y2={H - B + 4} stroke="var(--linea)" strokeWidth={1} />)}
        <text x={L} y={H - 5} fontSize={12} fill="var(--tinta3)">{ejeXFinal[0]}</text>
        {intermedios.map(i => <text key={`x${i}`} x={X(i)} y={H - 5} textAnchor="middle" fontSize={12} fill="var(--tinta3)">{rotX?.[i]}</text>)}
        {/* Con `hoy` adentro, el final es lo proyectado: sin negrita (la negrita es de hoy). */}
        <text x={W - R} y={H - 5} textAnchor="end" fontSize={12} fontWeight={hoy !== undefined && hoy < fin ? 400 : 600} fill="var(--tinta2)">{ejeXFinal[1]}</text>
      </g>)}
    </>
  ), [geo, L, R, T, B, X, Y, W, H, ocultas, visibles, banda, alarmas, estado, marca, cruzo, hoy, fin, rango, rotuloRango, paradaDesde, compacta, gris, decimales, escala, unidad, ejeXFinal, intermedios, rotX, detalle, id, sentidoAlarma])

  // ── La capa del cursor: la raya vertical, el punto de cada serie y la ficha.
  let capa = null, ficha = null
  if (cursor) {
    const i = cursor.i, xi = X(i)
    capa = (
      <g data-cursor={i} pointerEvents="none">
        <line x1={xi} x2={xi} y1={T} y2={H - B} stroke="var(--tinta2)" strokeWidth={1} />
        {visibles.map((s, k) => {
          if (ocultas.has(s.nombre)) return null
          const v = valorEn(s, i)
          return v === null || v === undefined ? null
            : <circle key={s.nombre} cx={xi} cy={Y(v)} r={3.5} fill="var(--panel)" stroke={colorSerie(k, gris)} strokeWidth={2} data-punto={s.nombre} />
        })}
      </g>
    )
    const r = cursor.caja
    if (r.width > 0) {
      const sx = r.width / W, sy = r.height / H
      ficha = <FichaFlotante contenido={fichaDe(i)} ancla={{ x: r.left + xi * sx, y: r.top + ((T + H - B) / 2) * sy, arriba: r.top, abajo: r.top + r.height, lado: cursor.modo !== 'toque' }} />
    }
  }

  // ── La leyenda: tocar una serie la deja sola (otra vez, todas); con Mayús (o Ctrl), la apaga.
  const tocar = (nombre: string, apagar: boolean) => setOcultas(prev => {
    const todas = visibles.map(s => s.nombre)
    if (apagar) {
      const n = new Set(prev)
      if (n.has(nombre)) n.delete(nombre); else n.add(nombre)
      return n.size >= todas.length ? prev : n
    }
    const sola = todas.every(x => (x === nombre ? !prev.has(x) : prev.has(x)))
    return sola ? new Set() : new Set(todas.filter(x => x !== nombre))
  })
  const rango0 = tiempos?.[0], rango1 = tiempos?.[Math.min(N - 1, (tiempos?.length ?? 1) - 1)]

  return (
    <figure ref={refFigura} data-kit="tendencia" data-estado={estado} data-detalle={detalle ? '' : undefined}
      className={cn('m-0 max-w-full', ajustar ?? detalle ? 'block w-full' : 'inline-block', className)}>
      {!compacta && !sinTitulo && (
        <figcaption className="mb-1 flex flex-wrap items-baseline gap-x-2 text-[13px] text-[var(--tinta2)]">
          <span className="font-semibold text-[var(--tinta)]">{titulo}</span><span>{ventana}</span>
          {detalle && rango0 && rango1 && rango0 !== rango1 && <span data-rango-escrito="">· de {rango0} a {rango1}</span>}
          {series.some(s => s.proyectado) && <span>· proyectado en discontinuo</span>}
          {series.some(s => s.simulado) && <span>· simulado en discontinuo</span>}
          {!escala.firmada && <span data-provisional>· escala provisional</span>}
        </figcaption>
      )}
      <span ref={refCaja} className="block">
        <svg ref={refSvg} width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={etiqueta}
          className={cn('block h-auto max-w-full', CLASE_FOCO)} {...eventos}>
          {fijo}
          {capa}
          {/* La zona del cursor: todo el dibujo recibe el puntero (también donde no hay trazo). */}
          {interactiva && !anidado && <rect x={L} y={0} width={Math.max(0, W - L - R)} height={H} fill="transparent" data-zona="" />}
        </svg>
      </span>
      {ficha}
      {enfocable && interactiva && <Anuncio>{dicho}</Anuncio>}
      {conLeyenda && (
        <div role="group" aria-label={`Series de ${titulo}: toque una para verla sola; otra vez, todas. Con Mayús, la apaga.`} data-leyenda-kit=""
          className="mt-1.5 flex flex-wrap gap-x-1 gap-y-0.5 text-[13px]">
          {visibles.map((s, k) => {
            const apagada = ocultas.has(s.nombre)
            const lect = s.valores.filter((v): v is number => v !== null)
            const ult = lect.at(-1)
            const palabra = s.proyectado ? 'proyectado' : s.simulado ? 'simulado' : ''
            return (
              <button key={s.nombre} type="button" aria-pressed={!apagada} data-leyenda-serie={s.nombre}
                title="Ver solo esta serie (otra vez: todas). Con Mayús: apagarla."
                onClick={e => tocar(s.nombre, e.shiftKey || e.ctrlKey || e.metaKey)}
                className={cn('inline-flex min-h-7 cursor-pointer items-center gap-1.5 rounded-[6px] px-1.5 py-0.5 hover:bg-[var(--panel2)]',
                  apagada ? 'text-[var(--tinta3)] line-through' : 'text-[var(--tinta)]')}>
                <MuestraTrazo trazo={trazoSerie(s, k)} color={apagada ? 'var(--dato3)' : colorSerie(k, gris)} grosor={grosorSerie(k)} />
                <span>{s.nombre}</span>
                {palabra && <span className="text-[var(--tinta2)]">· {palabra}</span>}
                {ult !== undefined && !s.puntos && <span className="tabular text-[var(--tinta2)]">{cifra(ult, decimales)}{unidad ? ` ${unidad}` : ''}</span>}
                {detalle && lect.length > 1 && <span className="tabular text-[12px] text-[var(--tinta2)]">mín {cifra(Math.min(...lect), decimales)} · máx {cifra(Math.max(...lect), decimales)}</span>}
              </button>
            )
          })}
        </div>
      )}
      {!compacta && (marca || estado === 'sin-comunicacion' || series.length > 4) && (
        <p aria-hidden className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[12px] text-[var(--tinta2)]">
          {marca && <><MarcaCondicion c={marca} tamano={12} decorativa />cruza la alarma</>}
          {estado === 'sin-comunicacion' && <>{desde ? `sin comunicación desde ${desde}` : 'sin comunicación'}</>}
          {series.length > 4 && <>{series.length - 4} trazas más: van en gráficas aparte</>}
        </p>
      )}
    </figure>
  )
}
