import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useArbolChoke, NIVELES_ARBOL, NOMBRE_NIVEL, CAMPO_ANH, EXPLICA_PERDIDA, type NivelArbol } from '@/shared/api/choke'
import { useLibro } from '@/shared/api/diferidos'
import { Tarjeta } from '@/shared/ui/primitivas'
import { Info } from '@/shared/ui/Info'
import { n0, pctParte } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Ramas } from './Ramas'
import { periodoEnFrase } from './palabras'

/** Cómo se dice cada forma de salida (la versión del catálogo de la ANH). */
const FORMA: Record<string, string> = {
  'C024-2026': 'la Circular 024 (Tabla 1): la clave en cau_niv1 y la cadena de la tabla en cau_niv2',
  'DICC-V3.2': 'el Diccionario de datos V3.2: el texto en mayúsculas en cau_niv1 y cau_niv2',
}

/** El ⓘ del título (U2 §1.3, texto de siempre): qué es el modelo del árbol. Diferido no es pérdida (regla 3). */
const QUE_ES_EL_CHOKE = 'Es un método internacional para ubicar dónde se deja de producir: lo publicó BP en 1996 (artículo SPE-36848), lo usa el regulador británico (NSTA) y la ANH lo adoptó en 2026 (Circulares 003 y 024). No es la válvula choke de la cabeza del pozo (Circular 024, p. 4).'

/** El árbol de causas como la circular, en Cumplimiento regulatorio: cada barril
 *  diferido del período en el orden de los 6 pasos de la circular (C24 p. 5):
 *  quién → dónde se trabó → diferida o pérdida → planeada o no → causa → detalle.
 *  Es el árbol de pérdidas del choke (`useArbolChoke`, orden `circular`): suma
 *  exacto el diferido del libro, lo que falta va en su rama y la pérdida tiene la
 *  suya, vacía mientras TRIM no registre pérdidas.
 *
 *  En la primera capa, el nombre de cada paso y su cifra (P-reg-1). La cadena que
 *  viaja a la ANH (`resp_par`, `choke_mod`, `dif_perd`, `pla_no_plan`,
 *  `cau_niv1`, `cau_niv2`) va detrás de «Ver los códigos ANH», en el CSV para la
 *  ANH y en el papel, donde el árbol sale desplegado y con sus códigos. */
export function ArbolCircular({ campoId, desde, hasta, periodo, plegadoEnTelefono = false }: {
  campoId: string; desde: Date; hasta: Date; periodo: string
  /** K2 · En el teléfono, el árbol abre en su título y su total; las ramas, a un toque («Ver el árbol»).
   *  X4 §3.4 (reg): primero qué falta y quién lo debe; el árbol completo, detrás de un toque. */
  plegadoEnTelefono?: boolean
}) {
  const arbol = useArbolChoke({ campos: [campoId], desde, hasta, orden: 'circular' })
  const lb = useLibro({ campos: [campoId], desde, hasta })
  const [codigos, setCodigos] = useState(false)
  const [abierto, setAbierto] = useState(false)
  // Plegado: solo en el teléfono (`max-sm:`) y nunca en el papel (`print:`). Los códigos lo abren.
  const plegado = plegadoEnTelefono && !abierto && !codigos && arbol.raiz.filas > 0
  const sinPlegar = plegado ? 'max-sm:hidden print:block' : ''
  const r = arbol.raiz
  const niveles: readonly NivelArbol[] = NIVELES_ARBOL.circular
  const confirmado = r.bbl > 0 ? (r.confirmadoBbl / r.bbl) * 100 : 0
  return (
    <Tarjeta className="print:break-inside-auto" aria-labelledby={`arbol-${campoId}`}>
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="inline-flex items-center gap-1.5">
          <h2 id={`arbol-${campoId}`} className="text-[16px] font-semibold leading-snug text-[var(--tinta)]">Árbol de causas · como la circular</h2>
          <Info titulo="¿Qué es este árbol?" texto={QUE_ES_EL_CHOKE} imprimir={false} />
        </span>
        {r.filas > 0 && (
          <button type="button" aria-pressed={codigos} onClick={() => { setCodigos(x => !x); setAbierto(true) }} data-ver-codigos=""
            className="no-imprimir min-h-11 cursor-pointer rounded-full px-3.5 text-[14px] font-semibold text-[var(--tinta)] shadow-[inset_0_0_0_1.5px_var(--linea)] hover:bg-[var(--panel2)] sm:min-h-9">
            {codigos ? 'Ocultar los códigos ANH' : 'Ver los códigos ANH'}
          </button>
        )}
      </header>
      {/* Los códigos siempre están (el papel los lleva); en la pantalla, solo con «Ver los códigos ANH». */}
      <div data-arbol-circular={campoId} data-orden={arbol.orden} data-bbl={r.bbl} data-filas={r.filas} data-codigos={codigos ? 'vista' : 'no'}
        className={cn('mt-2', !codigos && '[&_[data-cadena]]:hidden [&_[data-codigo-anh]]:hidden print:[&_[data-cadena]]:inline! print:[&_[data-codigo-anh]]:inline! [&_[data-codigo-bloque]]:hidden print:[&_[data-codigo-bloque]]:block!')}>
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[15px]">
          {/* Plegado (teléfono): el total es la fila que abre el árbol, con su «›» (X5 §5.5). */}
          {plegado && (
            <button type="button" aria-expanded={false} aria-label={`Ver el árbol: ${n0(r.bbl)} bbl`} onClick={() => setAbierto(true)} data-ver-arbol=""
              className="no-imprimir toque inline-flex cursor-pointer items-center gap-1 text-[var(--tinta)] hover:underline sm:hidden">
              <b className="tabular-nums text-[16px]">{n0(r.bbl)} <small className="font-normal text-[var(--tinta2)]">bbl</small></b>
              <ChevronRight aria-hidden className="size-4 text-[var(--tinta2)]" />
            </button>
          )}
          <b className={cn('tabular-nums text-[16px] text-[var(--tinta)]', plegado && 'max-sm:hidden')}>{n0(r.bbl)} <small className="font-normal text-[var(--tinta2)]">bbl</small></b>
          <span className={cn('tabular-nums text-[var(--tinta2)]', sinPlegar)}>{n0(r.eventos)} {r.eventos === 1 ? 'parada' : 'paradas'} · {n0(r.confirmadoBbl)} bbl con los 6 pasos confirmados ({pctParte(confirmado)})</span>
        </p>
        <div className={sinPlegar}>
        {/* El orden de los seis pasos, en palabras y sin numerarlos (los números son de las prioridades, T-10); sus campos, con los códigos. */}
        <ol className="mt-1 flex list-none flex-wrap items-baseline gap-x-1 text-[14px] text-[var(--tinta2)]" aria-label="El orden de la circular">
          {niveles.map((n, i) => (
            <li key={n} className="inline-flex items-baseline gap-1">
              {i > 0 && <span aria-hidden>→</span>}
              <span>{NOMBRE_NIVEL[n]}{CAMPO_ANH[n] && <span data-codigo-anh="" className="text-[var(--tinta3)]"> ({CAMPO_ANH[n]})</span>}</span>
            </li>
          ))}
        </ol>
        {r.filas > 0 && (
          <p className="mt-1 max-w-[860px] text-[14px] leading-[1.5] text-[var(--tinta2)]" data-codigo-bloque="" data-como-se-lee="">
            {n0(r.filas)} {r.filas === 1 ? 'fila' : 'filas'} de paradas_pozo. Al lado de cada paso va la cadena que viaja a la ANH, en la forma de salida
            de {FORMA[arbol.version] ?? arbol.version}. Lo que falta va en su propia rama, en gris discontinuo: esa fila todavía no se puede reportar.
          </p>
        )}
        {r.filas === 0
          ? <p className="mt-2 text-[15px] text-[var(--tinta2)]">Nada se trabó en {periodoEnFrase(periodo)}: no hay paradas que reportar.</p>
          : <Ramas nodo={r} base={r.bbl} codigos="vista" abiertas={niveles.length} rotuloBase="del período" className="mt-2 max-w-[860px]" />}
        <p className="tabular-nums mt-1.5 flex max-w-[860px] flex-wrap items-baseline justify-between gap-x-2 border-t border-[var(--linea2)] pt-1 text-[14px]" data-cuadre-libro={lb.diferido}>
          <span>= el diferido del libro (Σ de las paradas del período)</span><b>{n0(lb.diferido)} bbl</b>
        </p>
        </div>
        {/* En el papel no hay globos: lo que dicen los ⓘ que se repiten va una vez, aquí (B-10). */}
        <dl className="solo-impresion mt-2 max-w-[860px] text-[9pt] text-[var(--tinta2)]">
          <div><dt className="inline font-semibold">Pérdida: </dt><dd className="inline">{EXPLICA_PERDIDA}</dd></div>
          <div><dt className="inline font-semibold">Modelo choke: </dt><dd className="inline">{QUE_ES_EL_CHOKE}</dd></div>
        </dl>
      </div>
    </Tarjeta>
  )
}
