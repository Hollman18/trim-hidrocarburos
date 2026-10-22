import { useId, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { CAMPO_ANH, PASO_DE_NIVEL, EXPLICA_PERDIDA, esRamaQueFalta, type NodoArbol } from '@/shared/api/choke'
import { PASO_CIRCULAR } from '@/shared/api/arbol'
import { Info } from '@/shared/ui/Info'
import { n0, pctParte } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import type { VerCodigos } from './palabras'

/* Las ramas del árbol de pérdidas del choke (`useArbolChoke`): debajo de un
   tramo, planeada o no → causa → detalle → equipos → partes; en Regulatorio,
   los seis pasos de la circular. Cada rama con sus barriles y su parte del
   tramo (o del período). Aquí no se suma nada: cada nodo trae sus cifras del
   motor y suma exacto sus ramas.

   - Los pasos se abren y se cierran con un botón (`aria-expanded`); en el
     papel todo sale desplegado. Los equipos no son botones: son lo que cuelga
     de cada detalle, a la vista cuando el detalle se abre, con su parte.
   - ISA-101: todo en gris. Lo que falta va en gris claro con raya discontinua
     (U1 §2.1), nunca en rojo: no es una alarma, es lo que todavía no se sabe.
   - Los códigos de la ANH solo los ven regulatorio (al lado de cada paso),
     confiabilidad y el administrador (en su ⓘ). Nadie más. */

/** Cuántas ramas hermanas se ven antes de «ver más» (en el papel van todas). */
const A_LA_VISTA = 8

/** Las ramas de `nodo` (no el nodo mismo: ese lo pinta quien llama). `base`: los
 *  barriles contra los que se dice la parte de cada rama (el tramo, el período). */
export function Ramas({ nodo, base, codigos = 'no', abiertas = 3, rotuloBase = 'del tramo', id, className }: {
  nodo: NodoArbol; base: number; codigos?: VerCodigos
  /** Cuántos niveles empiezan abiertos, contados desde las ramas de `nodo`. */
  abiertas?: number
  /** Cómo se dice la base del porcentaje, para el lector: «del tramo», «del período». */
  rotuloBase?: string
  id?: string
  className?: string
}) {
  return <Hermanas id={id} hijos={nodo.hijos} base={base} codigos={codigos} abiertas={abiertas} profundidad={0} rotuloBase={rotuloBase}
    className={cn('text-[11.5px]', className)} />
}

interface Comun { base: number; codigos: VerCodigos; abiertas: number; profundidad: number; rotuloBase: string }

/** Las ramas de un nivel: las primeras a la vista y las demás detrás de «ver más». */
function Hermanas({ hijos, id, oculta = false, className, ...c }: Comun & { hijos: NodoArbol[]; id?: string; oculta?: boolean; className?: string }) {
  const [todas, setTodas] = useState(false)
  const propio = useId()
  const idLista = id ?? propio
  const corta = hijos.length > A_LA_VISTA && !todas
  const vista = corta ? hijos.slice(0, A_LA_VISTA - 1) : hijos
  const resto = corta ? hijos.slice(A_LA_VISTA - 1) : []
  return (
    <ul id={idLista} className={cn(c.profundidad > 0 && 'ml-[5px] border-l border-[var(--linea2)] pl-2', oculta && 'hidden print:block', className)}>
      {vista.map(n => <Rama key={`${n.dimension}:${n.valor}`} n={n} {...c} />)}
      {/* Lo que no cabe a la vista existe igual: en el papel sale entero. */}
      {resto.map(n => <Rama key={`${n.dimension}:${n.valor}`} n={n} {...c} oculta />)}
      {corta && (
        <li className="no-imprimir">
          <button type="button" aria-expanded={false} aria-controls={idLista} onClick={() => setTodas(true)}
            className="ml-[18px] min-h-6 cursor-pointer py-0.5 text-left text-[11px] text-[var(--tinta2)] underline decoration-dotted underline-offset-2 hover:text-[var(--tinta)]">
            Ver {resto.length} más ({n0(resto.reduce((a, n) => a + n.bbl, 0))} bbl)
          </button>
        </li>
      )}
    </ul>
  )
}

/** Una rama: su paso, sus barriles, su parte y lo que cuelga de ella. */
function Rama({ n, oculta = false, ...c }: Comun & { n: NodoArbol; oculta?: boolean }) {
  const id = useId()
  const [abierta, setAbierta] = useState(c.profundidad < c.abiertas)
  const esEquipo = n.dimension === 'equipo'
  // Un equipo con una sola parte la lleva en su renglón; con varias, debajo y siempre a la vista.
  const unaParte = esEquipo && n.hijos.length === 1 ? n.hijos[0] : undefined
  const plegable = n.hijos.length > 0 && !esEquipo
  const falta = esRamaQueFalta(n.valor)
  const vacia = n.filas === 0
  const pct = c.base > 0 ? (n.bbl / c.base) * 100 : 0
  const paso = PASO_DE_NIVEL[n.dimension as keyof typeof PASO_DE_NIVEL]
  const campo = CAMPO_ANH[n.dimension as keyof typeof CAMPO_ANH]
  const contenido = (
    <>
      <span className={cn('min-w-0 flex-1 break-words', (falta || vacia) && 'text-[var(--tinta3)]', n.dimension === 'parte' && 'text-[var(--tinta2)]')}>
        {falta && <i aria-hidden className="mr-1 inline-block h-2 w-2.5 translate-y-[1px] rounded-[1px] border border-dashed border-[var(--tinta3)]" />}
        {n.texto}
        {unaParte && (
          <span className="text-[var(--tinta2)]" data-nodo="parte" data-valor={unaParte.valor}>
            {' · '}{esRamaQueFalta(unaParte.valor) ? unaParte.texto.toLowerCase() : `parte: ${unaParte.texto}`}
          </span>
        )}
        {c.codigos === 'vista' && n.cadena && campo && (
          <span className="ml-1.5 break-words rounded-sm border border-[var(--linea2)] bg-[var(--panel2)] px-1 font-mono text-[10px] leading-snug text-[var(--tinta)] [box-decoration-break:clone]" data-cadena={campo}>
            <span className="text-[var(--tinta3)]">{campo}</span> {n.cadena}
          </span>
        )}
      </span>
      {/* Lo que oye el lector: «573 bbl, 100 % del tramo» (sin los espacios se leía «573100 %»). */}
      <span className="tabular shrink-0 text-right">
        <b className={cn('text-[12px]', vacia && 'font-normal text-[var(--tinta3)]')}>{n0(n.bbl)}</b>{' '}
        <span className="sr-only">bbl{vacia ? '' : ','}</span>{' '}
        <small className="inline-block w-[38px] text-[10px] text-[var(--tinta3)]">
          {vacia ? '' : <>{pctParte(pct)}{' '}<span className="sr-only">{c.rotuloBase}</span></>}
        </small>
      </span>
    </>
  )
  return (
    <li data-nodo={n.dimension} data-valor={n.valor} data-bbl={n.bbl} data-no-planeada={n.noPlaneadaBbl}
      className={cn('py-px', oculta && 'hidden print:block')}>
      <div className="flex items-baseline gap-1">
        {plegable ? (
          <button type="button" aria-expanded={abierta} aria-controls={id} onClick={() => setAbierta(a => !a)}
            className="flex min-h-6 min-w-0 flex-1 cursor-pointer items-baseline gap-1.5 rounded-sm py-0.5 text-left hover:bg-[var(--panel2)]">
            <ChevronRight aria-hidden size={12} className={cn('shrink-0 translate-y-[2px] text-[var(--tinta3)] transition-transform print:rotate-90', abierta && 'rotate-90')} />
            {contenido}
          </button>
        ) : (
          <div className="flex min-w-0 flex-1 items-baseline gap-1.5 py-0.5">
            <span aria-hidden className="inline-block w-3 shrink-0" />
            {contenido}
          </div>
        )}
        {c.codigos === 'info' && n.cadena && paso && campo && (
          <Info titulo={`Para la ANH · ${campo}`} texto={`${PASO_CIRCULAR[paso]}: «${n.cadena}»`} />
        )}
        {vacia && n.dimension === 'impacto' && <Info titulo="Pérdida" texto={EXPLICA_PERDIDA} />}
      </div>
      {plegable && <Hermanas id={id} hijos={n.hijos} oculta={!abierta} {...c} profundidad={c.profundidad + 1} />}
      {esEquipo && !unaParte && n.hijos.length > 0 && <Hermanas hijos={n.hijos} {...c} profundidad={c.profundidad + 1} />}
    </li>
  )
}
