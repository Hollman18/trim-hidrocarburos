import { useMemo } from 'react'
import { cn } from '@/shared/lib/cn'
import { marcasRedondas } from './ejes'
import { Anuncio, FichaFlotante, type ContenidoFicha } from './Ficha'
import { CLASE_FOCO, useAnidado, useCursor } from './cursor'

/* Las columnas por período (un conteo por mes, apilado por familia): la gráfica de «Fallas por mes»
   con las reglas del kit (kit-scada.md §0). Cada período, una columna desde la raya del piso (1 px
   en --linea); sus partes, apiladas en los grises de dato (--dato-1, --dato-2, --dato-3: nunca un
   color de estado) con 1 px de --panel entre ellas (H21), y la cifra del total arriba de la columna
   (H22). El eje: el período en corto y, en el primero, el último y cada enero, su año. La escala va
   de 0 al período más alto (es un conteo: no tiene banda ni límite). D2: la cuadrícula fina en marcas
   redondas con su rótulo a la izquierda (nunca el 0: el piso ya lo dice) y, al pasar el cursor, tocar
   o moverse con las flechas, el período resaltado y la ficha con cada parte y el total. El dibujo no
   baja de `minimo` px (por debajo se desplaza de lado): así su letra de 15 nunca queda de menos de 12
   en pantalla. Un período sin nada no lleva columna ni cifra; nunca un cero pintado (en la ficha,
   «ninguna»). La leyenda va debajo, con el mismo gris de cada parte y su palabra. */

export interface PeriodoColumna {
  /** «2026-09»: la clave del período. */
  clave: string
  /** «sept»: el período en corto, en el eje. */
  rotulo: string
  /** «2026»: el segundo renglón del eje (el año), solo donde hace falta. */
  segundo?: string
  /** Una cifra por parte, en el orden de `partes`. */
  valores: readonly number[]
  /** La cifra de arriba, si no es la suma de las partes (la cuenta del motor: una parte puede no
   *  dibujarse). Sin ella, la suma. */
  total?: number
  /** 28-oct · El tono del período, detrás de su columna (rojo pálido, amarillo pálido o verde pálido): lo decide el
   *  motor (un mes que pasó su máximo) y la pantalla lo traduce. Es un fondo, nunca el color de una parte. */
  fondo?: 'frenado' | 'riesgo' | 'bien'
  /** Los atributos que la pantalla pone en el grupo del período (`data-mes`, `data-fallas`). */
  datos?: { [dato: `data-${string}`]: string | number }
}

const ANCHO = 520, ALTO = 166, PISO = 120, CAMPO = 96, DER = 514
const Y = (v: number, tope: number) => PISO - (v / tope) * CAMPO
// 28-oct · Hasta cinco partes (los tramos del choke), en los grises de dato, del más oscuro al más claro. Con pocas
// partes se saltan grises: así dos partes vecinas nunca quedan en tonos casi iguales (Pozos y Planta se confundían).
const GRIS = ['var(--dato-1)', 'var(--dato-2)', 'var(--dato-3)', 'var(--dato-4)', 'var(--dato-5)'] as const
const PALETA: Record<number, readonly number[]> = { 1: [0], 2: [0, 3], 3: [0, 2, 4], 4: [0, 2, 3, 4], 5: [0, 1, 2, 3, 4] }
const gris = (n: number, j: number) => GRIS[PALETA[Math.min(Math.max(n, 1), 5)]![j] ?? 4]!

export function Columnas({ periodos, partes, 'aria-label': etiqueta, titulo, nombrePeriodo, unidad, detalle = false, minimo = 420, formato = String, className, ...datos }: {
  periodos: readonly PeriodoColumna[]
  /** El nombre de cada parte apilada (como mucho 3), para la leyenda y la ficha. */
  partes: readonly string[]
  /** La frase del lector, con las cifras: «Fallas … de sept 2025 a oct 2026: 23 fallas en total…». */
  'aria-label': string
  /** La frase de un tramo: «sept 2026 · Bombas de inyección: 2» (la oye el lector al moverse con las flechas). */
  titulo?: (p: PeriodoColumna, parte: string, v: number) => string
  /** D2 · El nombre del período en la ficha: «septiembre 2026». Sin él, el rótulo y su año. */
  nombrePeriodo?: (p: PeriodoColumna) => string
  /** D2 · Lo que se cuenta, en la ficha: «fallas». */
  unidad?: string
  /** D2 · En el modal de detalle: más marcas en la cuadrícula. */
  detalle?: boolean
  minimo?: number
  /** 28-oct · Cómo se escribe una cifra (la del total, la del eje y la de la ficha): «47,6» en miles de bbl. Sin él, tal cual. */
  formato?: (v: number) => string
  className?: string
} & { [dato: `data-${string}`]: string | number | boolean | undefined }) {
  const totales = useMemo(() => periodos.map(p => p.total ?? p.valores.reduce((a, b) => a + b, 0)), [periodos])
  const tope = Math.max(1, ...totales)
  const marcas = useMemo(() => marcasRedondas(0, tope, detalle ? 6 : 3).filter(v => v > 0 && v <= tope), [tope, detalle])
  // El margen de los rótulos del eje y (a 15, como el resto del dibujo).
  const IZQ = 14 + Math.max(0, ...marcas.map(v => formato(v).length)) * 9
  const w = (DER - IZQ) / Math.max(1, periodos.length)
  const [refCaja, anidado] = useAnidado<HTMLDivElement>()
  const nombre = (p: PeriodoColumna) => nombrePeriodo?.(p) ?? `${p.rotulo}${p.segundo ? ` ${p.segundo}` : ''}`

  const fichaDe = (i: number): ContenidoFicha => {
    const p = periodos[i]!, total = totales[i] ?? 0
    return {
      titulo: nombre(p),
      filas: [
        ...partes.map((parte, j) => ({ clave: parte, gris: gris(partes.length, j), nombre: parte, valor: formato(p.valores[j] ?? 0) })),
        { clave: 'total', nombre: 'Total', valor: total > 0 ? formato(total) : 'ninguna', unidad: total > 0 ? unidad : undefined, fuerte: true },
      ],
    }
  }
  const { ref: refSvg, cursor, props: { style: estiloCursor, ...eventos }, dicho } = useCursor({
    n: periodos.length, vista: ANCHO, activo: !anidado && periodos.length > 0, enfocable: !anidado,
    indiceEn: x => Math.floor((x - IZQ) / w),
    inicial: () => periodos.length - 1,
    anuncio: i => {
      const p = periodos[i]!
      // Con `titulo`, cada parte se dice como la pantalla la escribe («sept 2026 · Bombas de agua: 1»).
      const partesDichas = partes.map((parte, j) => (titulo ? titulo(p, parte, p.valores[j] ?? 0) : `${nombre(p)} · ${parte}: ${formato(p.valores[j] ?? 0)}`))
      return `${partesDichas.join('; ')}; total de ${nombre(p)}: ${formato(totales[i] ?? 0)}${unidad ? ` ${unidad}` : ''}`
    },
  })

  const fijo = useMemo(() => (
    <>
      {/* La cuadrícula fina: una raya de 1 px en --linea2 por marca redonda, con su cifra a la izquierda. */}
      <g data-rejilla="">
        {marcas.map(v => (
          <g key={v}>
            <line x1={IZQ} x2={DER} y1={Math.round(Y(v, tope)) + 0.5} y2={Math.round(Y(v, tope)) + 0.5} stroke="var(--linea2)" strokeWidth={1} />
            <text x={IZQ - 6} y={Y(v, tope) + 5} fontSize={15} textAnchor="end" fill="var(--tinta3)" className="tabular">{formato(v)}</text>
          </g>
        ))}
      </g>
      {periodos.map((p, i) => {
        const xx = IZQ + i * w, total = totales[i] ?? 0
        let y = PISO
        return (
          <g key={p.clave} {...p.datos} data-fondo={p.fondo ?? ''}>
            {p.fondo && <rect x={xx + 1} y={PISO - CAMPO - 22} width={Math.max(0, w - 2)} height={CAMPO + 22} fill={`var(--${p.fondo}-f)`} data-fondo-periodo="" />}
            {p.valores.map((v, j) => {
              const h = (v / tope) * CAMPO
              y -= h
              return v > 0 ? <rect key={partes[j] ?? j} x={xx + w * 0.2} y={y} width={w * 0.6} height={h} fill={gris(partes.length, j)} stroke="var(--panel)" strokeWidth={1} /> : null
            })}
            {total > 0 && <text x={xx + w / 2} y={y - 5} fontSize={15} fontWeight={600} textAnchor="middle" fill="var(--tinta)" className="tabular">{formato(total)}</text>}
            <text x={xx + w / 2} y={139} fontSize={15} textAnchor="middle" fill="var(--tinta2)" className="font-cond">{p.rotulo}</text>
            {p.segundo && <text x={xx + w / 2} y={157} fontSize={15} textAnchor="middle" fill="var(--tinta3)" className="font-cond">{p.segundo}</text>}
          </g>
        )
      })}
      <line x1={IZQ - 4} x2={DER} y1={PISO} y2={PISO} stroke="var(--linea)" />
    </>
  ), [periodos, partes, totales, marcas, IZQ, w, tope, formato])

  let resalte = null, ficha = null
  if (cursor) {
    const i = cursor.i, xx = IZQ + i * w
    // El período bajo el cursor: un fondo --panel2 detrás de su columna y una raya de 1 px a lo alto.
    resalte = <rect x={xx + 1} y={PISO - CAMPO - 22} width={Math.max(0, w - 2)} height={CAMPO + 22} fill="var(--panel2)" data-cursor={i} pointerEvents="none" />
    const r = cursor.caja
    if (r.width > 0) {
      const s = r.width / ANCHO
      ficha = <FichaFlotante contenido={fichaDe(i)} ancla={{ x: r.left + (xx + w / 2) * s, y: r.top + (PISO - CAMPO / 2) * s, arriba: r.top, abajo: r.top + r.height, lado: cursor.modo !== 'toque' }} />
    }
  }

  return (
    <div ref={refCaja} className="contents">
      <svg ref={refSvg} viewBox={`0 0 ${ANCHO} ${ALTO}`} role="img" aria-label={etiqueta} data-kit="columnas" data-estado="normal" {...datos}
        className={cn('block h-auto w-full', CLASE_FOCO, 'focus-visible:outline-offset-[-2px]', className)} style={{ minWidth: minimo, ...estiloCursor }} {...eventos}>
        {resalte}
        {fijo}
      </svg>
      {ficha}
      {!anidado && <Anuncio>{dicho}</Anuncio>}
    </div>
  )
}

/** La leyenda de `Columnas`: cada parte con su gris y su palabra. Va fuera del desplazable. */
export function LeyendaColumnas({ partes, className }: { partes: readonly string[]; className?: string }) {
  return (
    <div className={cn('mt-1 flex flex-wrap gap-3 text-[13px] text-[var(--tinta2)]', className)} data-kit="leyenda-columnas">
      {partes.map((p, j) => <span key={p} className="inline-flex items-center gap-1.5"><i aria-hidden className="inline-block size-2.5" style={{ background: gris(partes.length, j) }} />{p}</span>)}
    </div>
  )
}
