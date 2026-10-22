import { useEffect, useState, type ReactNode } from 'react'
import { useApp } from '@/app/store'
import {
  NOMBRE_CHOKE, NOMBRE_CHOKE_CAMPO, dondeTramo,
  type ImpactoConfig, type ImpactoCampo, type ChokeAnh, type ChokeCampo,
} from '@/shared/api/choke'
import { campoPorId } from '@/entities/campos'
import type { Config } from '@/entities/configuracion'
import { fechaCorta } from '@/entities/reloj'
import { Panel, Boton, Hueco } from '@/shared/ui/primitivas'
import { Lectura } from '@/shared/ui/Lectura'
import { Info } from '@/shared/ui/Info'
import { n0, plural } from '@/shared/lib/formato'

/** «los pozos», «la planta o estación», «afuera». */
const sujeto = (k: ChokeCampo | null) => (k === null ? 'sin tubería de crudo' : NOMBRE_CHOKE_CAMPO[k].split(':')[0]!.toLowerCase())
/** «En el pozo», «En la planta o estación», «Afuera», «En el yacimiento». */
const tramoNombre = (k: ChokeAnh | null) => (k === null ? 'sin tramo' : NOMBRE_CHOKE[k].split(':')[0]!)
const bpd = (v: number | null) => (v === null ? 'sin dato' : `${n0(v)} bbl/d`)

/** Lo que el borrador lleva de la topología de un campo. */
export interface ResumenTopologia { campoId: string; contestados: number; faltan: number }

/** Paso 3 · Ver el impacto y firmar (U2 §8.5). Antes de firmar, TRIM pasa la
 *  versión nueva sobre los datos (`POST /api/configuracion/vista-previa`, que
 *  no guarda nada) y dice lo que cambia en palabras: qué limita hoy, «si falla
 *  hoy» y cuántas paradas cambiarían de tramo, con las ya confirmadas aparte,
 *  que no cambian solas. La firma es la misma de toda la configuración. */
export function ImpactoPaso({ propuesta, puede, hayCambios: conCambios, resumen, firma, historial, estrecho, onFaltan }: {
  /** Lo que se firmaría: todo el borrador. */
  propuesta: Config
  /** La vista previa la pide quien prepara la configuración (`config:firmar`): para los demás, el servidor responde 403. */
  puede: boolean
  hayCambios: boolean
  resumen: ResumenTopologia[]
  /** El bloque «FIRMAR LA VERSIÓN» de la configuración. */
  firma: ReactNode
  historial: ReactNode
  /** En el teléfono la firma se hace en el escritorio (U2 §8.7). */
  estrecho: boolean
  /** Lleva al paso 1, a lo que falta contestar en ese campo. */
  onFaltan: (campoId: string) => void
}) {
  const rolId = useApp(s => s.rolId), previsualizarConfig = useApp(s => s.previsualizarConfig)
  const hayCambios = puede && conCambios
  // La respuesta dice para qué borrador y qué rol se pidió: mientras no sea la de lo que se ve, está «calculando».
  const [vista, setVista] = useState<{ para: Config | null; rol: string; impacto?: ImpactoConfig; error?: string }>({ para: null, rol: rolId })
  useEffect(() => {
    if (!hayCambios) return
    // Si el borrador cambia mientras llega la respuesta, la vieja no pisa a la nueva.
    let vigente = true
    void previsualizarConfig(propuesta).then(r => {
      if (vigente) setVista(r.ok ? { para: propuesta, rol: rolId, impacto: r.impacto } : { para: propuesta, rol: rolId, error: r.error })
    })
    return () => { vigente = false }
  }, [propuesta, hayCambios, rolId, previsualizarConfig])
  const pidiendo = hayCambios && (vista.para !== propuesta || vista.rol !== rolId)
  const impacto = hayCambios && !pidiendo ? vista.impacto : undefined
  const error = hayCambios && !pidiendo ? vista.error : undefined

  const conTopologia = resumen.filter(x => x.contestados > 0)
  return (
    <>
      <Lectura>
        Antes de firmar, TRIM pasa la versión nueva sobre los datos y dice lo que cambiaría: qué limita hoy al campo,
        cuánto costaría que fallara cada equipo y cuántas paradas cambiarían de tramo. Lo que ya confirmó una persona no
        cambia solo: queda para revisar en Identificar. Nada se guarda hasta que se firma.
      </Lectura>
      {conTopologia.length > 0 && (
        <Panel className="mb-2.5" titulo="LA TOPOLOGÍA EN ESTE BORRADOR">
          <ul className="grid gap-1.5 text-[12px]">
            {conTopologia.map(x => {
              const nombre = campoPorId(x.campoId).nombre
              return (
                <li key={x.campoId} className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                  <span className="min-w-0">
                    <b>{nombre}</b>: {plural(x.contestados, 'equipo contestado', 'equipos contestados')}
                    {x.faltan > 0
                      ? <>, {plural(x.faltan, 'sin contestar', 'sin contestar')}. TRIM propone, pero no firma nada solo.</>
                      : <>: la topología del campo queda completa.</>}
                  </span>
                  {x.faltan > 0 && <Boton type="button" variante="chico" onClick={() => onFaltan(x.campoId)}>Ver lo que falta</Boton>}
                </li>
              )
            })}
          </ul>
        </Panel>
      )}
      <Panel className="mb-2.5" titulo="SI FIRMA ESTA VERSIÓN" extra="rige desde la firma">
        {!puede && <p className="text-[12px] text-[var(--tinta2)]">La vista previa y la firma las hace el administrador de la implementación, sobre su borrador.</p>}
        {puede && !hayCambios && <p className="text-[12px] text-[var(--tinta2)]">No hay cambios en el borrador: conteste en el paso 1, o cambie el respaldo o los tanques en la configuración técnica.</p>}
        {pidiendo && <p role="status" className="text-[12px] text-[var(--tinta2)]">Calculando lo que cambia…</p>}
        {error && <p role="alert" className="rounded border-2 border-[var(--tinta)] px-2.5 py-1.5 text-[12px] font-semibold">{error}</p>}
        {impacto && (
          impacto.campos.length === 0
            ? <p className="text-[12px] text-[var(--tinta2)]">Lo que cambia no toca a ningún campo: no cambia qué limita, ni «si falla hoy», ni dónde se trabó ninguna parada.</p>
            : impacto.campos.map(c => <DeUnCampo key={c.campoId} c={c} desde={impacto.desde} />)
        )}
      </Panel>
      {estrecho
        ? puede && <div className="mb-2.5"><Hueco>La firma se hace en el escritorio: allí se ve el impacto completo. Lo contestado queda en este borrador.</Hueco></div>
        : firma}
      <div className="mb-2.5">{historial}</div>
    </>
  )
}

/** Lo que cambia en un campo (U2 §8.5), renglón por renglón. */
function DeUnCampo({ c, desde }: { c: ImpactoCampo; desde: Date }) {
  const nombre = campoPorId(c.campoId).nombre
  const p = c.paradasQueCambian
  const libro = c.texto.find(t => t.startsWith('El libro'))
  return (
    <section aria-label={`Lo que cambia en ${nombre}`} className="border-b border-[var(--linea2)] py-2 first:pt-0 last:border-0 last:pb-0">
      <h3 className="font-cond mb-1 text-[10.5px] font-semibold tracking-[.11em]">{nombre.toUpperCase()}</h3>
      <dl className="grid gap-x-3 gap-y-1.5 text-[12px] sm:grid-cols-[9.5rem_minmax(0,1fr)]">
        <dt className="text-[var(--tinta2)]">Qué limita hoy</dt>
        <dd>{sujeto(c.limitaAntes)} → {sujeto(c.limitaDespues)}{c.limitaAntes === c.limitaDespues && <span className="text-[var(--tinta2)]"> (no cambia)</span>}</dd>

        <dt className="flex items-center gap-1 text-[var(--tinta2)]">Si falla hoy
          <Info titulo="Si falla hoy" texto="Cuántos barriles por día dejaría de dar el campo si ese equipo parara ahora, y dónde se trabaría. Solo salen los equipos que cambian." /></dt>
        <dd>
          {c.criticidad.length === 0 ? <span className="text-[var(--tinta2)]">no cambia ningún equipo</span> : (
            <ul className="grid gap-0.5">
              {c.criticidad.map(x => (
                <li key={x.equipo}>
                  <b>{x.nombre}</b>: {bpd(x.antes)} → {bpd(x.despues)}
                  {x.tramoAntes !== x.tramoDespues && (
                    <span className="text-[var(--tinta2)]"> · se trabaría {x.tramoDespues ? dondeTramo(x.tramoDespues) : 'sin tramo'} (antes {x.tramoAntes ? dondeTramo(x.tramoAntes) : 'sin tramo'})</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </dd>

        <dt className="text-[var(--tinta2)]">Dónde se trabó</dt>
        <dd>
          {p.total === 0 ? <span className="text-[var(--tinta2)]">Ninguna parada cambia de tramo desde el {fechaCorta(desde)}.</span> : (
            <>
              <p>{p.total === 1 ? 'Una parada cambiaría' : `${n0(p.total)} paradas cambiarían`} de tramo desde el {fechaCorta(desde)}:</p>
              <ul className="mt-0.5 grid gap-0.5">
                {p.porTramo.map(x => (
                  <li key={`${x.de}-${x.a}`}>
                    <b className="tabular">{n0(x.paradas)}</b> {x.paradas === 1 ? 'pasa' : 'pasan'} de «{tramoNombre(x.de)}» a «{tramoNombre(x.a)}»
                  </li>
                ))}
              </ul>
              <p className="mt-0.5 text-[11.5px] text-[var(--tinta2)]">
                {p.confirmadas === 0
                  ? 'Ninguna la había confirmado una persona: toman el tramo nuevo al firmar.'
                  : p.confirmadas === 1
                    ? 'La que ya confirmó una persona no cambia sola: queda «para revisar» en Identificar.'
                    : `Las ${n0(p.confirmadas)} que ya confirmó una persona no cambian solas: quedan «para revisar» en Identificar.`}
              </p>
            </>
          )}
        </dd>

        {libro && <><dt className="text-[var(--tinta2)]">El libro</dt><dd>{libro.replace(/^El libro /, '')}</dd></>}
      </dl>
    </section>
  )
}
