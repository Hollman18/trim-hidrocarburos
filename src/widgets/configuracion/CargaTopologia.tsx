import { useId, useRef, useState } from 'react'
import { Download } from 'lucide-react'
import { useApp } from '@/app/store'
import { plantillaTopologia, type ChokeDeElemento, type HallazgoTopologia, type TopologiaLeida } from '@/shared/api/choke'
import { Panel, Boton, SubirCsv } from '@/shared/ui/primitivas'
import { Lectura } from '@/shared/ui/Lectura'
import { DatoInvalido } from '@/shared/ui/Prioridad'
import { descargarCsv } from '@/shared/lib/csv'
import { plural } from '@/shared/lib/formato'
import { MarcaFalta } from './marcas'

/** Cargar la topología desde un archivo (U2 §8.3, carga masiva): dos
 *  columnas, el equipo y los pozos a los que sirve («todos», «otro dueño»,
 *  «punto de entrega» o la lista). La lee el servidor (`POST
 *  /api/topologia/importar`) y dice lo que bloquea fila por fila. Con una fila
 *  que bloquea no pasa nada al borrador: una topología a medias cambiaría el
 *  tramo de las paradas de los equipos que sí venían bien. Nada rige hasta que
 *  se firma. */
export function CargaTopologia({ campoId, campoNombre, elementos, porSaber, todos, onPasar }: {
  campoId: string
  campoNombre: string
  /** Lo que quedaría hoy (lo que rige con lo contestado encima): va en la plantilla. */
  elementos: ChokeDeElemento[]
  /** Lo que quedaría «Todavía no sé»: va en la plantilla con esas palabras. */
  porSaber: readonly string[]
  todos: readonly string[]
  onPasar: (leidos: ChokeDeElemento[], porSaber: readonly string[]) => void
}) {
  const importarTopologia = useApp(s => s.importarTopologia)
  const [texto, setTexto] = useState('')
  const [leida, setLeida] = useState<TopologiaLeida | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hecho, setHecho] = useState<string | null>(null)
  const [revisando, setRevisando] = useState(false)
  // La última revisión pedida: una respuesta que llega tarde (se pidió otra) no pisa a la nueva.
  const pedido = useRef(0)
  const idHallazgos = useId(), idTexto = useId()

  const revisar = async (t = texto) => {
    const n = ++pedido.current
    setHecho(null); setError(null); setLeida(null); setRevisando(true)
    const r = await importarTopologia(campoId, t)
    if (n !== pedido.current) return
    setRevisando(false)
    if (!r.ok) { setError(r.error); return }
    setLeida({ campoId: r.campoId, topologia: r.topologia, porSaber: r.porSaber ?? [], hallazgos: r.hallazgos, filas: r.filas })
  }
  // La plantilla la arma el motor con las mismas palabras que lee la carga.
  const descargar = () => descargarCsv(`TRIM-topologia-${campoId}`, plantillaTopologia(elementos, porSaber, todos))
  const bloquean = leida?.hallazgos.filter(h => h.bloquea) ?? []
  const avisos = leida?.hallazgos.filter(h => !h.bloquea) ?? []
  const listos = leida ? leida.topologia.length + leida.porSaber.length : 0
  const pasar = () => {
    if (!leida || bloquean.length || !listos) return
    onPasar(leida.topologia, leida.porSaber)
    setHecho(`${plural(listos, 'equipo pasó', 'equipos pasaron')} al borrador${leida.porSaber.length ? ` (${leida.porSaber.length} «todavía no sé»)` : ''}. Revíselos en la lista y firme en el paso 3.`)
    setLeida(null); setTexto('')
  }

  return (
    <Panel className="mb-2.5" titulo="SUBIR EXCEL O CSV" extra={campoNombre}>
      <Lectura>
        Una fila por equipo, con dos columnas: el equipo y los pozos a los que sirve. Los pozos van en lista
        (separados por espacios) o con una palabra: «todos», «otro dueño» (más allá de la batería), «punto de
        entrega» (la brida de salida) o «todavía no sé». Descargue la plantilla con lo que rige hoy, cámbiela y
        péguela aquí o súbala. Una fila que bloquea se dice con su número, y con ella no pasa nada al borrador.
      </Lectura>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Boton onClick={descargar}><Download className="mr-1 inline size-3.5" />Descargar la plantilla</Boton>
        <SubirCsv onTexto={t => { setTexto(t); void revisar(t) }} onError={m => { setLeida(null); setHecho(null); setError(m) }} />
      </div>
      <label htmlFor={idTexto} className="mb-0.5 block text-[13px] text-[var(--tinta2)]">O pegue las filas copiadas de Excel</label>
      <textarea id={idTexto} value={texto} rows={4}
        onChange={e => { setTexto(e.target.value); setLeida(null); setHecho(null); setError(null) }}
        aria-invalid={bloquean.length > 0 || !!error} aria-describedby={bloquean.length || error ? idHallazgos : undefined}
        placeholder={'equipo;pozos a los que sirve\nSE-2;todos\nMPP-301;MN-07 MN-18 MN-33'}
        className="w-full resize-y rounded border border-[var(--linea)] bg-[var(--panel2)] px-2 py-1.5 font-mono text-[14px] outline-none focus:border-acento" />
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        <Boton onClick={() => void revisar()} disabled={!texto.trim() || revisando}>{revisando ? 'Revisando…' : 'Revisar'}</Boton>
        {leida && listos > 0 && (
          <Boton variante="principal" onClick={pasar} disabled={bloquean.length > 0}
            aria-describedby={bloquean.length ? idHallazgos : undefined}>
            Pasar {plural(listos, 'equipo', 'equipos')} al borrador
          </Boton>
        )}
      </div>
      {leida && (
        <div className="mt-2 text-[14px]">
          <p className="text-[var(--tinta2)]">
            {plural(leida.filas, 'fila leída', 'filas leídas')}: {plural(listos, 'equipo listo', 'equipos listos')}
            {bloquean.length ? `, ${plural(bloquean.length, 'fila bloquea', 'filas bloquean')}` : ''}.
          </p>
          {bloquean.length > 0 && (
            <div id={idHallazgos} role="alert" className="mt-1">
              <ul className="grid gap-1">{bloquean.slice(0, 12).map(h => <Hallazgo key={`${h.fila}-${h.texto}`} h={h} />)}</ul>
              {bloquean.length > 12 && <p className="mt-0.5 text-[var(--tinta2)]">y {plural(bloquean.length - 12, 'fila más', 'filas más')} así.</p>}
              <p className="mt-1 font-semibold">Con una fila que bloquea no pasa nada al borrador: corrija el archivo y vuelva a revisarlo.</p>
            </div>
          )}
          {avisos.length > 0 && <ul className="mt-1 grid gap-1">{avisos.map(h => <Hallazgo key={`${h.fila}-${h.texto}`} h={h} />)}</ul>}
        </div>
      )}
      {error && <p id={idHallazgos} role="alert" className="mt-2 text-[14px] font-semibold">{error}</p>}
      {hecho && <p role="status" className="mt-2 text-[14px] text-[var(--tinta2)]">{hecho}</p>}
    </Panel>
  )
}

/** Lo que se encontró en una fila. Lo que bloquea es un dato que no
 *  corresponde a nada del campo (un equipo o un pozo que no existe): morado con
 *  círculo punteado, como todo dato inválido (U1 §9.2). Lo que solo avisa (el
 *  caso de borde) va en gris discontinuo: es algo que falta confirmar. */
function Hallazgo({ h }: { h: HallazgoTopologia }) {
  return (
    <li className="flex items-start gap-1.5">
      <span className="mt-[3px] shrink-0">{h.bloquea ? <DatoInvalido etiqueta="Bloquea: dato que no corresponde" tamano={12} /> : <MarcaFalta etiqueta="Aviso: falta confirmar" />}</span>
      <span className="min-w-0 break-words">{h.texto}</span>
    </li>
  )
}
