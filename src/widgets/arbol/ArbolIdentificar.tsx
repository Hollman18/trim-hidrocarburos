import { useEffect, useMemo, useRef, useState } from 'react'
import { useRol } from '@/app/store'
import { useParadasAnh, CONFIRMAN_EN_LOTE, ROLES_QUE_CONTESTAN, esperaRevision, type EstadoParadaAnh } from '@/shared/api/arbol'
import { Panel, Boton, Hueco } from '@/shared/ui/primitivas'
import { Lectura } from '@/shared/ui/Lectura'
import { Info } from '@/shared/ui/Info'
import { VISIBLES } from '@/shared/ui/listaCorta'
import { plural } from '@/shared/lib/formato'
import { TarjetaParada } from './Tarjeta'
import { agrupar, type Grupo } from './grupos'
import { ESTADO, SECCION, ORDEN_SECCIONES, INFO_METODO } from './palabras'

const TITULO = 'font-cond text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]'

/** Identificar · la cadena de 6 pasos de cada parada para la ANH (U1 §2; U2
 *  §4 y §9.3), en el orden de la circular: quién → ¿dónde se trabó? → qué
 *  pasó → ¿planeada? → causa → detalle. Las paradas del período van por lo que
 *  les falta: por confirmar, falta un dato, sin causa y completas; una cascada
 *  es una tarjeta (U2 §4.4). Lo plegado sale desplegado en el papel. */
export function ArbolIdentificar({ campos, desde, hasta, global, periodo }: {
  campos: string[]; desde: Date; hasta: Date; global: boolean; periodo: string
}) {
  const rol = useRol()
  const deCampo = !ROLES_QUE_CONTESTAN.revisa.includes(rol.id)
  const ps = useParadasAnh({ campos, desde, hasta })
  const grupos = useMemo(() => agrupar(ps), [ps])
  // Lo que alguien marcó «Algo está mal» o le pidió a este rol va primero, en «REVISAR» (U1 §2.7).
  const aRevisar = grupos.filter(g => esperaRevision(g.primera.revision, rol.id))
  const por = (e: EstadoParadaAnh) => grupos.filter(g => g.estado === e && !aRevisar.includes(g))
  const cuenta = (e: EstadoParadaAnh) => ps.filter(p => p.estado === e).length
  // Lo que se hizo con un toque se dice arriba, y el foco va ahí: la tarjeta
  // pudo cambiar de bloque (o salir) con el toque y el botón con ella.
  const [aviso, setAviso] = useState('')
  const avisoRef = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    if (!aviso) return
    const foco = document.activeElement
    if (!foco || foco === document.body || !foco.isConnected) avisoRef.current?.focus()
  }, [aviso])

  const resumen = ORDEN_SECCIONES.filter(e => cuenta(e) > 0).map(e => `${ESTADO[e]} ${cuenta(e)}`).join(' · ')
  return (
    <Panel className="mb-2.5" titulo={deCampo ? 'POR CONTESTAR · ÁRBOL DE CAUSAS' : 'LA CADENA DE CADA PARADA · ÁRBOL DE CAUSAS'}
      extra={<>{plural(ps.length, 'fila', 'filas')}<span className="sr-only"> del árbol de causas en {periodo}</span></>}>
      <Lectura>
        Cada parada se clasifica en 6 pasos, el mismo árbol de la Circular 024 de la ANH: quién, dónde
        se trabó, qué pasó, si era planeada, la causa y el detalle. Así se mide qué paradas no planeadas
        bajar, y el reporte a la ANH sale de lo mismo. TRIM propone cada paso y dice de dónde salió;
        una persona lo confirma. Lo que falta va en gris discontinuo: nada se rellena. {deCampo
          ? 'Usted contesta y confirma lo que vio; lo técnico lo confirma su supervisor.'
          : CONFIRMAN_EN_LOTE.includes(rol.id)
            ? 'Una cascada (varios pozos, una sola raíz) se confirma de un toque.'
            : 'Varias de una vez las confirman supervisión o producción; usted, una por una.'}
      </Lectura>
      <p className="mb-2 flex flex-wrap items-center gap-x-1.5 text-[11px] text-[var(--tinta2)]">
        {resumen || `Ninguna parada en ${periodo}.`}
        {!deCampo && <Info rotulo="¿qué método es?" titulo="¿Qué método es?" texto={INFO_METODO} />}
      </p>
      {aviso && <p ref={avisoRef} tabIndex={-1} role="status" className="mb-2 rounded-sm border border-[var(--linea2)] bg-[var(--panel2)] px-2 py-1.5 text-[11.5px] text-[var(--tinta2)]">{aviso}</p>}
      {ps.length === 0 && <Hueco>Ninguna parada de pozo en {periodo}: no hay nada que reportar.</Hueco>}
      <Seccion titulo="REVISAR" clave="revisar" grupos={aRevisar} global={global} onHecho={setAviso} />
      {ORDEN_SECCIONES.map(e => <Seccion key={e} titulo={SECCION[e]} clave={e} plegada={e === 'confirmada'} grupos={por(e)} global={global} onHecho={setAviso} />)}
    </Panel>
  )
}

/** Un bloque: cinco tarjetas a la vista y «ver las otras N»; las completas,
 *  plegadas. En el papel salen todas. */
function Seccion({ titulo, clave, plegada, grupos, global, onHecho }: {
  titulo: string; clave: EstadoParadaAnh | 'revisar'; plegada?: boolean; grupos: Grupo[]; global: boolean; onHecho: (t: string) => void
}) {
  const [abierto, setAbierto] = useState(false)
  if (!grupos.length) return null
  const n = plegada ? 0 : VISIBLES
  const visibles = abierto ? grupos : grupos.slice(0, n)
  const resto = abierto ? [] : grupos.slice(n)
  const filas = grupos.reduce((a, g) => a + g.filas.length, 0)
  return (
    <section aria-label={`${titulo}: ${plural(filas, 'fila', 'filas')}`} data-seccion={clave} className="mb-2 last:mb-0">
      <h3 className={`${TITULO} border-b border-[var(--linea2)] pb-1`}>{titulo} · {filas}</h3>
      {visibles.map(g => <TarjetaParada key={g.clave} g={g} global={global} onHecho={onHecho} />)}
      {resto.length > 0 && <div className="solo-impresion">{resto.map(g => <TarjetaParada key={g.clave} g={g} global={global} onHecho={onHecho} />)}</div>}
      {(resto.length > 0 || abierto) && (
        <Boton variante="chico" className="mt-1.5 min-h-10 sm:min-h-6" aria-expanded={abierto} onClick={() => setAbierto(v => !v)}>
          {abierto ? 'ver menos' : n === 0 ? `ver las ${resto.length}` : `ver las otras ${resto.length}`}
        </Boton>
      )}
    </section>
  )
}
