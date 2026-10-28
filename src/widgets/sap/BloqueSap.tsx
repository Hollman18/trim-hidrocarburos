import { useEffect, useId, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { useApp, useRol } from '@/app/store'
import { useRiesgo, usePreguntas } from '@/shared/api/diferidos'
import { useSapDeEquipo } from '@/shared/api/sap'
import { useEquipo, pedirCatalogoDeDanos } from '@/shared/api/equipos'
import { NOMBRE_PARTE, type ParteId } from '@/entities/partes'
import { modosDeParte, nombreModo } from '@/entities/catalogo'
import { NOMBRE_CLASE, NOMBRE_ESTADO_ORDEN, NOMBRE_TIPO_AVISO, type AvisoSap, type OrdenSap } from '@/entities/sap'
import { fechaHora, fechaCorta, horasEntre, AHORA } from '@/entities/reloj'
import { Boton, Chip } from '@/shared/ui/primitivas'
import { Info } from '@/shared/ui/Info'
import { VerMas } from '@/shared/ui/VerMas'
import { useVerMas } from '@/shared/ui/listaCorta'
import { FueraDeMeta } from '@/shared/ui/Prioridad'
import { n0, n1 } from '@/shared/lib/formato'
import { fmtHoras } from '@/widgets/bombas/comun'
import { useUsuarios } from '@/shared/api/usuarios'
import { Bloque } from '@/shared/ui/Cifras'

const mayus = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

const campoInput = 'min-h-10 w-full rounded border border-[var(--linea)] bg-[var(--panel2)] px-2 py-[5px] text-[14px] outline-none focus:border-acento sm:min-h-0'
const titulo = 'mb-1.5 mt-3 text-[15px] font-semibold text-[var(--tinta)]'

/** Lo que SAP dice de un equipo, junto a lo que TRIM ve: el aviso o la orden
 *  abierta, los repuestos críticos y (para ingeniería) el historial. Desde aquí
 *  se le ENVÍA a SAP el aviso con la evidencia; la orden la crea el planeador
 *  en SAP, no TRIM. Para quien decide va una sola línea. */
export function BloqueSap({ campoId, equipo, nivel, titulo: Titulo = 'h3' }: {
  campoId: string; equipo: string; nivel: 'decision' | 'operacion' | 'ingenieria'
  /** El nivel del título: `h2` cuando el bloque es una tarjeta de la vista (el diagnóstico, A15). */
  titulo?: 'h2' | 'h3'
}) {
  const rol = useRol(); const usuarios = useUsuarios()
  // El aviso que se acaba de enviar desde aquí: su línea recibe el foco, porque
  // el formulario (y el botón que tenía el foco) desaparece al quedar abierto.
  const [enviado, setEnviado] = useState<string | null>(null)
  const { avisos, ordenes, repuestos, identidad: id } = useSapDeEquipo(campoId, equipo)
  const abierto = avisos.find(a => !a.cerrado)
  const ordenAbierta = ordenes.find(o => o.estado !== 'TECO')
  // Bajo el mínimo: sin stock es lo que no viene en camino; lo que viene se
  // dice con su fecha (la ficha técnica tampoco le pone ■ al que está en tránsito).
  const faltan = repuestos.filter(r => r.stock < r.minimo)
  const sinStock = faltan.filter(r => !r.enTransito)
  const enCamino = faltan.filter(r => r.enTransito)
  const llega = (r: (typeof faltan)[number]) => fechaCorta(new Date(`${r.enTransito!.llega}T12:00:00-05:00`))
  // El técnico de una orden es una persona (su id), no un rol; si va a un contratista, solo el puesto.
  const tecnico = (o: OrdenSap) => usuarios.find(u => u.id === o.tecnico)?.nombre ?? `la cuadrilla ${o.puesto}`

  // El historial: cinco y «ver N más»; lo que no se ve en la pantalla sale en el papel.
  const historial = useVerMas(ordenes)

  // 28-oct: para quien decide, un bloque más del detalle («SAP»), con cada cosa en su renglón corto.
  if (nivel === 'decision') return (
    <Bloque titulo="SAP" sinLinea data-sap-decision="">
      <ul className="grid gap-0.5 text-[15px]">
        <li>{ordenAbierta ? `Orden ${ordenAbierta.numero} ${NOMBRE_ESTADO_ORDEN[ordenAbierta.estado]}` : abierto ? `Aviso ${abierto.numero} abierto, sin orden todavía` : 'Sin aviso ni orden abiertos'}</li>
        {sinStock.length > 0 && <li className="flex items-center gap-1.5"><FueraDeMeta si tamano={10} />Sin stock de {sinStock.map(r => r.descripcion.toLowerCase()).join(', ')}</li>}
        {enCamino.map(r => <li key={r.material} className="text-[var(--tinta2)]">{mayus(r.descripcion.toLowerCase())} llega el {llega(r)}</li>)}
      </ul>
    </Bloque>
  )

  const filaOrden = (o: OrdenSap, papel = false) => (
    <li key={o.numero} className={papel ? 'hidden flex-wrap gap-x-2 print:flex' : 'flex flex-wrap gap-x-2'}>
      <span className="tabular text-[var(--tinta3)]">{fechaCorta(new Date(o.creada))}</span>
      <b className="text-[var(--tinta)]">{o.numero}</b>
      {/* La orden abierta ya va arriba con su descripción. */}
      <span>{NOMBRE_CLASE[o.clase]}{o.numero === ordenAbierta?.numero ? '' : ` · ${o.descripcion}`}</span>
      <span className="text-[var(--tinta3)]">{NOMBRE_ESTADO_ORDEN[o.estado]}{o.horasReales ? <> · {n1(o.horasReales)} h<span className="sr-only"> confirmadas</span></> : ''}</span>
    </li>
  )

  return (
    <section aria-label="SAP">
      <div className="mb-1.5 mt-3 flex flex-wrap items-center gap-x-1">
        <Titulo className="text-[15px] font-semibold text-[var(--tinta)]">SAP · mantenimiento <span className="text-[14px] font-normal text-[var(--tinta2)]">· equipo {id.equipoSap} · {id.ubicacion}</span></Titulo>
        <Info titulo="De dónde sale" texto="Avisos, órdenes, horas y stock vienen de SAP. La orden la crea el planeador en SAP; TRIM envía el aviso y avisa cuando la orden se libera." />
      </div>
      {/* Región viva: lo que cambia aquí (el aviso que se envió) se anuncia. */}
      <div aria-live="polite">
        {ordenAbierta && <LineaOrden o={ordenAbierta} tecnico={tecnico(ordenAbierta)} />}
        {abierto && !ordenAbierta && <LineaAviso a={abierto} enfocar={enviado === abierto.numero} />}
        {!abierto && !ordenAbierta && (rol.puede['sap:aviso']
          ? <EnviarAviso key={`${campoId}|${equipo}`} campoId={campoId} equipo={equipo} onEnviado={setEnviado} />
          : <p className="text-[14px] text-[var(--tinta2)]">Sin aviso ni orden abiertos.</p>)}
      </div>

      {repuestos.length > 0 && (
        <>
          <h3 className={titulo}>Repuestos críticos</h3>
          <ul className="grid gap-1 text-[14px]">
            {repuestos.map(r => {
              const falta = r.stock < r.minimo
              return (
                <li key={r.material} className="flex items-start gap-1.5">
                  <FueraDeMeta si={falta && !r.enTransito} tamano={10} />
                  <span className="tabular min-w-0 flex-1">
                    <b>{r.descripcion}</b> · {r.stock} en bodega (mín. {r.minimo})
                    {r.enTransito ? ` · llega${r.enTransito.cantidad === 1 ? '' : 'n'} ${r.enTransito.cantidad} el ${llega(r)}`
                      : falta ? ` · pedirlo: ${n0(r.plazoDias)} días` : ''}
                  </span>
                </li>
              )
            })}
          </ul>
        </>
      )}

      {nivel === 'ingenieria' && ordenes.length > 0 && (
        <>
          <h3 className={titulo}>Historial SAP · {ordenes.length}</h3>
          <ul className="grid gap-1 text-[13px] text-[var(--tinta2)]">
            {historial.visibles.map(o => filaOrden(o))}
            {historial.resto.map(o => filaOrden(o, true))}
          </ul>
          <VerMas ocultas={historial.ocultas} abierto={historial.abierto} onAlternar={historial.alternar} />
        </>
      )}
    </section>
  )
}

function LineaAviso({ a, enfocar }: { a: AvisoSap; enfocar?: boolean }) {
  const horas = horasEntre(new Date(a.creado), AHORA)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { if (enfocar) ref.current?.focus() }, [enfocar])
  return (
    <div ref={ref} tabIndex={-1} className="rounded border border-[var(--linea2)] bg-[var(--panel2)] px-2.5 py-2 text-[14px]">
      <b>Aviso {a.numero}</b> · {NOMBRE_TIPO_AVISO[a.tipo]} · prioridad {a.prioridad} · {horas < 1 ? 'recién enviado' : `hace ${fmtHoras(horas)}`} · {a.creadoPor}
      <span className="flex flex-wrap items-center gap-x-1.5 text-[var(--tinta2)]">
        <span>{a.descripcion}</span>
        <Chip>sin orden</Chip>
        <Info titulo="Sin orden todavía" texto="La crea el planeador en SAP, y cuando la libere TRIM le avisa al técnico." />
      </span>
    </div>
  )
}

function LineaOrden({ o, tecnico }: { o: OrdenSap; tecnico: string }) {
  return (
    <div className="rounded border border-[var(--linea2)] bg-[var(--panel2)] px-2.5 py-2 text-[14px]">
      <b>Orden {o.numero}</b> · {NOMBRE_CLASE[o.clase]} · prioridad {o.prioridad} · {NOMBRE_ESTADO_ORDEN[o.estado]}{o.liberada ? `${o.estado === 'REL' ? '' : ' · liberada'} el ${fechaHora(new Date(o.liberada))}` : ''}
      <span className="block text-[var(--tinta2)]">{o.descripcion}</span>
      <span className="block text-[var(--tinta3)]">asignada a {tecnico}{o.aviso ? ` · aviso ${o.aviso}` : ''}</span>
    </div>
  )
}

/** El aviso que TRIM le manda a SAP, ya lleno con lo que sabe. Quien lo
 *  envía revisa la descripción y la parte; la evidencia va tal cual. */
function EnviarAviso({ campoId, equipo, onEnviado }: { campoId: string; equipo: string; onEnviado: (numero: string) => void }) {
  const enviarAviso = useApp(s => s.enviarAviso)
  const riesgo = useRiesgo([campoId]).find(r => r.equipo === equipo)
  const pregunta = usePreguntas([campoId]).find(p => p.equipo === equipo && !p.fin)
  const eq = useEquipo(campoId, equipo)
  const parada = eq?.marcha === 'detenido' || riesgo?.estado === 'perdiendo' || !!pregunta
  // El mismo catálogo con que se responde la parada: parte (catálogo B de SAP) y daño (catálogo C).
  const partes = pedirCatalogoDeDanos(campoId, equipo)?.partes ?? []
  const parteSugerida = pregunta?.causa.parte ?? riesgo?.parte
  const [abierto, setAbierto] = useState(false)
  const [descripcion, setDescripcion] = useState(() =>
    parada ? `Parada de ${equipo}${parteSugerida ? `: ${NOMBRE_PARTE[parteSugerida].toLowerCase()}` : ', sin causa identificada'}` : `${equipo}: ${riesgo?.motivo ?? eq?.estado ?? 'revisar'}`)
  const [parte, setParte] = useState<ParteId | ''>(parteSugerida ?? '')
  const [modo, setModo] = useState(pregunta?.causa.declarado?.modo ?? '')
  const parteSel = partes.find(x => x.id === parte)
  const [prioridad, setPrioridad] = useState<1 | 2 | 3 | 4>(eq?.severidad === 1 ? 1 : eq?.severidad === 2 ? 2 : 3)
  // Solo el error: al enviar bien, el aviso queda abierto y este formulario se
  // desmonta (lo reemplaza la línea del aviso, que recibe el foco).
  const [error, setError] = useState<{ texto: string; campo?: 'descripcion' } | null>(null)
  const idError = useId()
  const evidencia = [...(pregunta?.causa.evidencia ?? []), riesgo?.motivo, riesgo?.tag ? `Variable: ${riesgo.tag}` : undefined, eq?.lectura]
    .filter((x): x is string => !!x).filter((x, i, a) => a.indexOf(x) === i).slice(0, 5)

  if (!abierto) return (
    <div className="flex flex-wrap items-center gap-2 text-[14px]">
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 text-[var(--tinta2)]">
        Sin aviso ni orden abiertos
        {/* Parado y SAP sin saberlo: un estado, no una frase. */}
        {parada && <Chip tono="fuerte">parado, SAP no lo sabe</Chip>}
      </span>
      <Boton variante={parada ? 'principal' : 'normal'} onClick={() => setAbierto(true)}><Send className="mr-1 inline size-3.5" />Enviar aviso a SAP</Boton>
    </div>
  )
  return (
    <form className="grid gap-1.5 rounded border border-[var(--linea2)] bg-[var(--panel2)] p-2.5"
      onSubmit={async e => {
        e.preventDefault()
        const r = await enviarAviso({ tipo: parada ? 'M2' : 'M1', campoId, equipo, descripcion, prioridad, parte: parte || undefined, modo: parteSel && modo ? modo : undefined,
          inicioAveria: (pregunta?.inicio ?? riesgo?.desde)?.toISOString(), parada, evidencia, evento: pregunta?.id })
        if (r.ok) onEnviado(r.aviso.numero)
        else setError({ texto: r.error, ...(r.campo ? { campo: r.campo } : {}) })
      }}>
      <b className="text-[14px]">Aviso de {parada ? 'avería (M2)' : 'solicitud (M1)'} para SAP</b>
      <label className="grid gap-0.5"><span className="text-[13px] text-[var(--tinta2)]">Qué pasa</span>
        <input value={descripcion} onChange={e => { setDescripcion(e.target.value); setError(null) }} className={campoInput}
          aria-invalid={error?.campo === 'descripcion'} aria-describedby={error ? idError : undefined} /></label>
      <div className="grid items-start gap-1.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,160px),1fr))]">
        {partes.length > 0 && (
          <label className="grid gap-0.5"><span className="text-[13px] text-[var(--tinta2)]">Parte del equipo</span>
            <select value={parte} onChange={e => { setParte(e.target.value as ParteId | ''); setModo('') }} className={campoInput}>
              <option value="">sin identificar</option>
              {partes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </label>
        )}
        {parteSel && (
          <label className="grid gap-0.5"><span className="text-[13px] text-[var(--tinta2)]">Daño (lo que se ve)</span>
            <select value={modo} onChange={e => setModo(e.target.value)} className={campoInput}>
              <option value="">sin identificar</option>
              {modosDeParte(parteSel).map(m => <option key={m.codigo} value={m.codigo}>{m.codigo} · {nombreModo(m.codigo, parteSel.id)}</option>)}
            </select></label>
        )}
        <label className="grid gap-0.5"><span className="text-[13px] text-[var(--tinta2)]">Prioridad en SAP</span>
          <select value={prioridad} onChange={e => setPrioridad(Number(e.target.value) as 1 | 2 | 3 | 4)} className={campoInput}>
            <option value={1}>1 · muy alta</option><option value={2}>2 · alta</option><option value={3}>3 · media</option><option value={4}>4 · baja</option>
          </select></label>
      </div>
      {parteSugerida && <small className="text-[13px] text-[var(--tinta3)]">La señal sugiere: {partes.find(p => p.id === parteSugerida)?.nombre.toLowerCase()}</small>}
      <div className="text-[13px] text-[var(--tinta2)]">
        <span className="text-[var(--tinta3)]">Evidencia (texto largo del aviso):</span>
        <ul className="list-disc pl-4">{evidencia.map(x => <li key={x}>{x}</li>)}</ul>
      </div>
      {error && <p id={idError} role="alert" className="text-[14px] text-[var(--tinta)]">{error.texto}</p>}
      <span className="flex flex-wrap gap-1.5">
        <Boton variante="principal" type="submit"><Send className="mr-1 inline size-3.5" />Enviar a SAP</Boton>
        <Boton type="button" onClick={() => setAbierto(false)}>Cancelar</Boton>
      </span>
    </form>
  )
}
