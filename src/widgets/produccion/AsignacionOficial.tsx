import { useId, useState } from 'react'
import { Download, Info as IconoInfo } from 'lucide-react'
import { useApp, useRol } from '@/app/store'
import { useAsignacionOficial, useCargasAsignacion } from '@/shared/api/sesion'
import { useAsignacionPorPozo } from '@/shared/api/diferidos'
import { leerAsignacion, plantillaAsignacion, cotejar, cargaVigente } from '@/entities/asignacion'
import { pedirMedicionOficial } from '@/shared/api/medicion'
import { pedirMesesCerrados } from '@/shared/api/calendario'
import { nombreMes } from '@/entities/plan'
import { campoPorId } from '@/entities/campos'
import { Panel, Boton, Chip, SubirCsv, Hueco } from '@/shared/ui/primitivas'
import { FueraDeMeta, DatoInvalido } from '@/shared/ui/Prioridad'
import { Lectura } from '@/shared/ui/Lectura'
import { Info } from '@/shared/ui/Info'
import { Tip } from '@/shared/ui/Tip'
import { VerMas } from '@/shared/ui/VerMas'
import { useVerMas, VISIBLES } from '@/shared/ui/listaCorta'
import { descargarCsv } from '@/shared/lib/csv'
import { n0, n1, plural } from '@/shared/lib/formato'
import { desplazable } from '@/shared/ui/alFinal'
import { fechaHora } from '@/entities/reloj'

/** Cuadre pozo por pozo con la asignación oficial de un mes cerrado: se sube
 *  lo que reportó la operadora y se coteja con lo que asigna TRIM. Es un
 *  formulario: sus errores y el motivo de la carga quedan escritos. El porqué
 *  de cada diferencia va en el ⓘ de la fila (y en el papel, en su renglón). */
export function AsignacionOficial({ campos }: { campos: string[] }) {
  const oficial = useAsignacionOficial(); const cargas = useCargasAsignacion(); const cargar = useApp(s => s.cargarAsignacion)
  // Cargar la oficial es de quien la reporta (`asignacion:cargar`); los demás ven el cotejo de lo cargado.
  const puede = useRol().puede['asignacion:cargar']
  const [motivo, setMotivo] = useState('')
  const cerrados = pedirMesesCerrados()
  const [elegido, setElegido] = useState(campos[0]!)
  const [mes, setMes] = useState(cerrados.at(-1)!)
  const [texto, setTexto] = useState('')
  const [errores, setErrores] = useState<string[]>([])
  const [hecho, setHecho] = useState<string | null>(null)
  const idErrores = useId(), idMotivo = useId()
  // Si cambia el ámbito y el campo elegido ya no está, se toma el primero.
  const campoId = campos.includes(elegido) ? elegido : campos[0]!
  const trim = useAsignacionPorPozo(campoId, mes)
  const filas = oficial.filter(f => f.mes === mes && f.campoId === campoId)
  const banda = pedirMedicionOficial(campoId).banda.valor
  const r = filas.length ? cotejar(filas, trim, banda) : null
  // Quién puso lo que hoy rige en este mes y campo, y cuándo: el rastro de la carga.
  const vigente = cargaVigente(oficial, cargas, mes, campoId), grupo = vigente?.grupos.find(g => g.mes === mes && g.campoId === campoId)
  const nombre = campoPorId(campoId).nombre
  // Tres grupos: los que están en las dos (se cotejan), los que TRIM no conoce
  // (dato inválido: casi siempre un nombre mal escrito) y los que faltan en la oficial.
  const desconocidos = r?.filas.filter(f => f.trim === undefined) ?? []
  const faltan = r?.filas.filter(f => f.oficial === undefined && (f.trim ?? 0) > 0.5) ?? []
  const comparables = r?.filas.filter(f => f.oficial !== undefined && f.trim !== undefined) ?? []
  const fuera = comparables.filter(f => f.fuera)
  const delta = r ? r.totalOficial - r.totalTrim : 0
  // Primero las mayores diferencias (así las ordena el cotejo): cinco a la vista y el resto a un toque.
  const lista = useVerMas(comparables, { n: comparables.length === VISIBLES + 1 ? comparables.length : VISIBLES })

  const revisar = async (t: string) => {
    const lr = leerAsignacion(t, { permitidos: campos, cerrados })
    // Con una fila mala no se carga nada: el pozo rechazado saldría después como «no está en la oficial».
    if (lr.errores.length) { setErrores([...lr.errores, 'No se cargó nada: corrija esas filas y vuelva a cotejar.']); return setHecho(null) }
    // Sin una sola fila de datos (solo la cabecera, o filas en blanco) no se coteja nada: se dice.
    if (!lr.filas.length) { setErrores([...lr.avisos, 'No se encontraron filas de datos: después de la cabecera va una fila por pozo.']); return setHecho(null) }
    setErrores(lr.avisos)
    // El store aplica las reglas del servidor; si rechaza la carga, se dice y no se da por cargada.
    const carga = await cargar(lr.filas, motivo)
    if (!carga.ok) { setErrores([carga.error]); return setHecho(null) }
    const primera = lr.filas[0]!
    setElegido(primera.campoId); setMes(primera.mes); setTexto(''); setMotivo('')
    const grupos = new Set(lr.filas.map(f => `${f.mes}|${f.campoId}`)).size
    setHecho(`${plural(lr.filas.length, 'pozo cargado', 'pozos cargados')} en ${plural(grupos, 'mes y campo', 'meses y campos')}.`)
  }
  const exportar = () => r && descargarCsv(`TRIM-cotejo-asignacion-${campoId}-${mes}`, [
    ['Pozo', 'Oficial bbl', 'TRIM bbl', 'Diferencia bbl', 'Horas oficiales', 'Horas PLC', 'Explican las horas bbl', 'Fuera de la banda', 'Explicación'],
    ...r.filas.map(f => [f.pozo, f.oficial, f.trim, f.diferencia, f.horasOficial, f.horasTrim, f.porHoras, f.fuera ? 'sí' : 'no', f.motivo]),
  ])

  return (
    <Panel className="mt-2.5" titulo="CUADRE · ASIGNACIÓN OFICIAL" extra="mes cerrado">
      <Lectura>
        TRIM asigna con el mismo método que la asignación oficial: lo que midió el punto de medición
        oficial, repartido por prueba × factor × horas que cada pozo estuvo abierto (las horas, del
        PLC). Suba lo que reportó la operadora y se ve dónde no cuadran: lo que explican las horas y
        lo que queda para la prueba o el factor. Es un cotejo: no cambia el libro.
      </Lectura>

      <div className="mt-2 flex flex-wrap items-end gap-2 text-[11.5px]">
        {campos.length > 1 && (
          <label className="grid gap-0.5">
            <span className="text-[10.5px] text-[var(--tinta2)]">Campo</span>
            <select value={campoId} onChange={e => setElegido(e.target.value)} className="rounded border border-[var(--linea)] bg-[var(--panel)] px-2 py-1 text-[12px]">
              {campos.map(c => <option key={c} value={c}>{campoPorId(c).nombre}</option>)}
            </select>
          </label>
        )}
        <label className="grid gap-0.5">
          <span className="text-[10.5px] text-[var(--tinta2)]">Mes</span>
          <select value={mes} onChange={e => setMes(e.target.value)} className="rounded border border-[var(--linea)] bg-[var(--panel)] px-2 py-1 text-[12px]">
            {[...cerrados].reverse().map(m => <option key={m} value={m}>{nombreMes(m)}</option>)}
          </select>
        </label>
        {puede && <>
          <Boton onClick={() => {
            const a = document.createElement('a')
            a.href = URL.createObjectURL(new Blob([plantillaAsignacion(mes, campoId, trim.map(t => t.pozo))], { type: 'text/csv;charset=utf-8' }))
            a.download = `TRIM-asignacion-oficial-${campoId}-${mes}.csv`
            a.click(); URL.revokeObjectURL(a.href)
          }}><Download className="mr-1 inline size-3.5" />Plantilla</Boton>
          <SubirCsv onTexto={t => void revisar(t)} onError={m => { setErrores([m]); setHecho(null) }} />
        </>}
      </div>
      {puede ? <>
        {/* El motivo va antes de cargar: un CSV subido se carga en seguida y reemplaza la oficial del mes. */}
        <div className="mt-2 flex flex-wrap items-center gap-x-1 text-[10.5px] text-[var(--tinta2)]">
          <label htmlFor={idMotivo}>Motivo de la carga · obligatorio</label>
          <Info titulo="Motivo de la carga" texto="Queda en el rastro con su nombre y la hora." />
        </div>
        <input id={idMotivo} value={motivo} onChange={e => { setMotivo(e.target.value); setErrores([]); setHecho(null) }} aria-label="Motivo de la carga"
          placeholder="Ej.: asignación de septiembre reportada a la ANH"
          className="mt-0.5 w-full rounded border border-[var(--linea)] bg-[var(--panel2)] px-2 py-[5px] text-[12px] outline-none focus:border-acento" />
        <textarea value={texto} onChange={e => { setTexto(e.target.value); setErrores([]); setHecho(null) }} rows={3} aria-label="Filas de la asignación oficial"
          aria-invalid={errores.length > 0} aria-describedby={errores.length > 0 ? idErrores : undefined}
          placeholder={'O pegue de Excel: mes, campo, pozo, crudo (bbl), horas.\n2026-09  La Ceiba  LC-11  28088  635,4'}
          className="mt-2 w-full resize-y rounded border border-[var(--linea)] bg-[var(--panel2)] px-2 py-1.5 font-mono text-[11.5px] outline-none focus:border-acento" />
        <Boton className="mt-1" onClick={() => void revisar(texto)} disabled={!texto.trim()}>Cotejar</Boton>
      </> : <div className="mt-2"><Hueco>Solo lectura: la carga producción.</Hueco></div>}
      {errores.length > 0 && (
        <ul id={idErrores} role="alert" className="mt-1.5 list-disc pl-4 text-[11.5px] text-[var(--tinta)]">{errores.slice(0, 10).map(e => <li key={e}>{e}</li>)}
          {errores.length > 10 && <li>y {errores.length - 10} más.</li>}</ul>
      )}
      {hecho && <p role="status" className="mt-1.5 text-[11.5px] text-[var(--tinta2)]">{hecho}</p>}

      {!r ? (
        <p className="mt-2.5 flex flex-wrap items-center gap-x-1.5 text-[11.5px] text-[var(--tinta2)]">
          <Chip>sin cargar</Chip>
          <span className="tabular">TRIM asigna {n0(trim.reduce((a, t) => a + t.asignado, 0))} bbl · {plural(trim.length, 'pozo', 'pozos')}</span>
          <Info titulo={`${nombre} · ${nombreMes(mes)}`} texto="Sin asignación oficial cargada. Lo que asigna TRIM es lo que midió el punto de medición oficial." />
        </p>
      ) : (
        <div className="mt-2.5 text-[11.5px]">
          {vigente && (
            <p className="mb-1 text-[var(--tinta2)]">
              Cargada el {fechaHora(new Date(vigente.fecha))} por {vigente.por}: «{vigente.motivo}»
              {grupo && grupo.reemplazados > 0 && <> · reemplazó {plural(grupo.reemplazados, 'pozo', 'pozos')} de una carga anterior</>}.
            </p>
          )}
          <p className="tabular text-[var(--tinta2)]">
            {/* Leídos son los que trae el archivo: los reconocidos más los que TRIM no tiene.
                Un pozo que TRIM asigna en 0 y no vino en el archivo no se leyó. El mes ya lo dice el selector. */}
            {plural(comparables.length + desconocidos.length, 'pozo leído', 'pozos leídos')} · {plural(comparables.length, 'reconocido', 'reconocidos')}
            {desconocidos.length > 0 && <> · {desconocidos.length} que TRIM no tiene</>}
          </p>
          {desconocidos.length > 0 && (
            <p className="mt-1 flex items-start gap-1.5 text-[var(--tinta)]">
              <DatoInvalido etiqueta="Pozo que no existe en TRIM" tamano={12} />
              <span>TRIM no tiene {desconocidos.map(f => f.pozo).join(', ')} en {nombre}: revise el nombre o el maestro de pozos.</span>
            </p>
          )}
          {faltan.length > 0 && (
            <p className="mt-1 flex items-start gap-1.5 text-[var(--tinta)]">
              <FueraDeMeta si tamano={11} />
              <span>Faltan {plural(faltan.length, `pozo de ${nombre}`, `pozos de ${nombre}`)} en lo que se cargó (TRIM les asigna {n0(faltan.reduce((a, f) => a + (f.trim ?? 0), 0))} bbl): ¿está completo el archivo?
                <small className="block text-[10.5px] text-[var(--tinta2)]">{faltan.map(f => f.pozo).join(', ')}</small></span>
            </p>
          )}
          <div className="mt-2 grid gap-x-6 gap-y-2 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
            <span><small className="block text-[10.5px] text-[var(--tinta3)]">oficial</small><b className="tabular text-[18px]">{n0(r.totalOficial)} bbl</b></span>
            <span><small className="flex flex-wrap items-center gap-x-1 text-[10.5px] text-[var(--tinta3)]">TRIM<Info titulo="TRIM" texto="Lo que midió el punto de medición oficial en el mes, repartido por prueba × factor × horas." /></small><b className="tabular text-[18px]">{n0(r.totalTrim)} bbl</b></span>
            <span><small className="block text-[10.5px] text-[var(--tinta3)]">fuera de banda · ±{n0(banda * 100)} %</small>
              <b className="tabular flex items-center gap-1.5 text-[18px]">{fuera.length > 0 && <FueraDeMeta si tamano={12} />}{fuera.length} <small className="text-[11px] font-normal text-[var(--tinta3)]">de {plural(comparables.length, 'pozo cotejado', 'pozos cotejados')}</small></b></span>
          </div>
          {Math.abs(delta) >= 1 && (
            <p className="mt-1.5 flex flex-wrap items-center gap-x-1 text-[var(--tinta2)]">
              <span>La oficial suma {n0(Math.abs(delta))} bbl {delta < 0 ? 'menos' : 'más'} que lo que midió el punto oficial.{faltan.length || desconocidos.length ? ' Primero complete los pozos.' : ''}</span>
              {!(faltan.length || desconocidos.length) && <Info titulo="Diferencia de totales" texto="Las dos deberían sumar lo mismo: si no, una usó otro volumen (por ejemplo, un corte de agua de laboratorio corregido)." />}
            </p>
          )}
          {comparables.length > 0 && (
            <div {...desplazable('Cotejo pozo por pozo')} className="mt-2 overflow-x-auto">
              <table className="tabular w-full text-right text-[11.5px]">
                <thead className="text-[9.5px] text-[var(--tinta3)]">
                  <tr><th className="py-1.5 pr-3 text-left font-normal">Pozo</th><th className="px-2 font-normal">Oficial</th><th className="px-2 font-normal">TRIM</th>
                    <th className="px-2 font-normal">Diferencia</th><th className="pl-2 font-normal">Horas oficial · PLC</th></tr>
                </thead>
                <tbody>
                  {comparables.map(f => ({ f, oculta: lista.resto.includes(f) })).flatMap(({ f, oculta }) => [
                    // Las filas que esconde «ver más» y el porqué de cada una salen en el papel.
                    <tr key={f.pozo} className={`border-t border-[var(--linea2)] ${oculta ? 'hidden print:table-row' : ''}`}>
                      <td className="whitespace-nowrap py-1 pr-3 text-left font-mono">{f.pozo}</td>
                      <td className="whitespace-nowrap px-2">{n0(f.oficial!)}</td>
                      <td className="whitespace-nowrap px-2">{n0(f.trim!)}</td>
                      <td className="whitespace-nowrap px-2"><span className="inline-flex items-center gap-1"><FueraDeMeta si={f.fuera} tamano={9} />{n0(f.diferencia)}<Porque pozo={f.pozo} texto={f.motivo} /></span></td>
                      <td className="whitespace-nowrap pl-2 text-[var(--tinta2)]">{f.horasOficial !== undefined ? n1(f.horasOficial) : 'sin dato'} · {n1(f.horasTrim!)}</td>
                    </tr>,
                    <tr key={`${f.pozo}-por-que`} className="hidden print:table-row">
                      <td colSpan={5} className="pb-1.5 text-left text-[9pt] text-[var(--tinta2)]">{f.motivo}</td>
                    </tr>,
                  ])}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-1.5 flex flex-wrap items-baseline gap-1.5">
            <VerMas ocultas={lista.ocultas} abierto={lista.abierto} onAlternar={lista.alternar} />
            <Boton onClick={exportar}><Download className="mr-1 inline size-3.5" />Descargar el cotejo</Boton>
          </div>
        </div>
      )}
      {cargas.length > 0 && (
        <details className="mt-2.5 text-[11px]">
          <summary className="cursor-pointer text-[var(--tinta2)]">Rastro de las cargas · {plural(cargas.length, 'carga', 'cargas')}</summary>
          <ul className="mt-1">
            {[...cargas].reverse().map(c => (
              <li key={c.id} className="border-b border-[var(--linea2)] py-1.5 last:border-0">
                <span className="text-[var(--tinta3)]">{fechaHora(new Date(c.fecha))} · {c.por}</span>
                <span className="block text-[var(--tinta2)]">«{c.motivo}»</span>
                <span className="block text-[10.5px] text-[var(--tinta3)]">{c.grupos.map(g => `${nombreMes(g.mes)} · ${campoPorId(g.campoId).nombre}: ${plural(g.pozos, 'pozo', 'pozos')}${g.reemplazados ? ` (reemplazó ${g.reemplazados})` : ''}`).join(' · ')}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </Panel>
  )
}

/** El porqué de la diferencia de un pozo, a un toque: el ⓘ de `Info` sin su
 *  nota impresa, porque en el papel el porqué va en su propio renglón de la
 *  tabla (dentro de la celda rompería el ancho de la columna). */
function Porque({ pozo, texto }: { pozo: string; texto: string }) {
  return (
    <Tip as="span" role="img" aria-label={`${pozo}: ${texto}`} titulo={pozo} filas={[]} pista={texto}
      className="no-imprimir inline-flex min-h-6 min-w-6 cursor-help items-center justify-center sm:min-h-0 sm:min-w-0">
      <IconoInfo className="size-3 text-[var(--tinta3)]" aria-hidden />
    </Tip>
  )
}
