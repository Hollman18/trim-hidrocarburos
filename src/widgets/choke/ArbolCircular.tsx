import { useArbolChoke, NIVELES_ARBOL, NOMBRE_NIVEL, CAMPO_ANH, type NivelArbol } from '@/shared/api/choke'
import { useLibro } from '@/shared/api/diferidos'
import { Panel } from '@/shared/ui/primitivas'
import { Info } from '@/shared/ui/Info'
import { Lectura } from '@/shared/ui/Lectura'
import { n0, pctParte } from '@/shared/lib/formato'
import { Ramas } from './Ramas'

/** Cómo se dice cada forma de salida (la versión del catálogo de la ANH). */
const FORMA: Record<string, string> = {
  'C024-2026': 'la Circular 024 (Tabla 1): la clave en cau_niv1 y la cadena de la tabla en cau_niv2',
  'DICC-V3.2': 'el Diccionario de datos V3.2: el texto en mayúsculas en cau_niv1 y cau_niv2',
}

/** El ⓘ del rótulo «modelo choke» (U2 §1.3, texto exacto). */
const QUE_ES_EL_CHOKE = 'Es un método internacional para ubicar dónde se pierde producción: lo publicó BP en 1996 (artículo SPE-36848), lo usa el regulador británico (NSTA) y la ANH lo adoptó en 2026 (Circulares 003 y 024). No es la válvula choke de la cabeza del pozo (Circular 024, p. 4).'

/** «ÁRBOL DE CAUSAS · COMO LA CIRCULAR», el panel de Cumplimiento regulatorio:
 *  cada barril diferido del período en el orden de los 6 pasos de la circular
 *  (C24 p. 5): quién → dónde se trabó → diferida o pérdida → planeada o no →
 *  causa → detalle, con la cadena que viaja a la ANH al lado de cada paso
 *  (`resp_par`, `choke_mod`, `dif_perd`, `pla_no_plan`, `cau_niv1`,
 *  `cau_niv2`), en la forma de salida vigente. Es el árbol de pérdidas del choke
 *  (`useArbolChoke`, orden `circular`): suma exacto el diferido del libro, lo
 *  que falta va en su rama y la pérdida tiene la suya, vacía mientras TRIM no
 *  registre pérdidas. En el papel sale desplegado. */
export function ArbolCircular({ campoId, desde, hasta, periodo }: { campoId: string; desde: Date; hasta: Date; periodo: string }) {
  const arbol = useArbolChoke({ campos: [campoId], desde, hasta, orden: 'circular' })
  const lb = useLibro({ campos: [campoId], desde, hasta })
  const r = arbol.raiz
  const niveles: readonly NivelArbol[] = NIVELES_ARBOL.circular
  const confirmado = r.bbl > 0 ? (r.confirmadoBbl / r.bbl) * 100 : 0
  return (
    <Panel className="mb-2.5 print:break-inside-auto" titulo="ÁRBOL DE CAUSAS · COMO LA CIRCULAR"
      extra={<span className="inline-flex items-center gap-1">modelo choke<Info titulo="Modelo choke" texto={QUE_ES_EL_CHOKE} /></span>}>
      <div data-arbol-circular={campoId} data-orden={arbol.orden} data-bbl={r.bbl} data-filas={r.filas}>
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[12px]">
          <b className="tabular text-[15px]">{n0(r.bbl)} <small className="font-normal text-[var(--tinta3)]">bbl</small></b>
          <span className="tabular text-[var(--tinta2)]">{n0(r.filas)} {r.filas === 1 ? 'fila' : 'filas'} de paradas_pozo · {n0(r.eventos)} {r.eventos === 1 ? 'parada' : 'paradas'}</span>
          <span className="tabular text-[var(--tinta2)]">{n0(r.confirmadoBbl)} bbl con los 6 pasos confirmados ({pctParte(confirmado)})</span>
        </p>
        <ol className="mt-1 flex flex-wrap items-baseline gap-x-1 text-[10.5px] text-[var(--tinta3)]" aria-label="El orden de la circular">
          {niveles.map((n, i) => (
            <li key={n} className="inline-flex items-baseline gap-1">
              {i > 0 && <span aria-hidden>→</span>}
              <span>{i + 1}. {NOMBRE_NIVEL[n]} <span className="font-mono">({CAMPO_ANH[n]})</span></span>
            </li>
          ))}
        </ol>
        <Lectura>
          Cada barril diferido del período, en el orden de los seis pasos de la Circular 024 (p. 5). Al lado de
          cada paso va la cadena que viaja a la ANH, en la forma de salida de {FORMA[arbol.version] ?? arbol.version}.
          Lo que falta va en su propia rama, en gris discontinuo: esa fila todavía no se puede reportar. La pérdida
          (lo producido que no se vendió) tiene su rama, vacía mientras TRIM no tenga el registro de pérdidas. Toque
          un paso para cerrarlo o abrirlo; en el papel sale entero.
        </Lectura>
        {r.filas === 0
          ? <p className="mt-2 text-[12px] text-[var(--tinta2)]">Nada se trabó en el período ({periodo.toLowerCase()}): no hay filas de paradas_pozo.</p>
          : <Ramas nodo={r} base={r.bbl} codigos="vista" abiertas={niveles.length} rotuloBase="del período" className="mt-2 max-w-[860px]" />}
        <p className="tabular mt-1.5 flex max-w-[860px] flex-wrap items-baseline justify-between gap-x-2 border-t border-[var(--linea2)] pt-1 text-[11.5px]" data-cuadre-libro={lb.diferido}>
          <span>= el diferido del libro (Σ de las paradas del período)</span><b>{n0(lb.diferido)} bbl</b>
        </p>
      </div>
    </Panel>
  )
}
