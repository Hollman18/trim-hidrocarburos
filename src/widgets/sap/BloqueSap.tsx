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
import { Boton } from '@/shared/ui/primitivas'
import { FueraDeMeta } from '@/shared/ui/Prioridad'
import { n0, n1, plural } from '@/shared/lib/formato'
import { fmtHoras } from '@/widgets/bombas/comun'
import { useUsuarios } from '@/shared/api/usuarios'

const campoInput = 'min-h-10 w-full rounded border border-[var(--linea)] bg-[var(--panel2)] px-2 py-[5px] text-[12px] outline-none focus:border-acento sm:min-h-0'
const titulo = 'font-cond mb-1.5 mt-3 text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]'

/** Lo que SAP dice de un equipo, junto a lo que TRIM ve: el aviso o la orden
 *  abierta, los repuestos críticos y (para ingeniería) el historial. Desde aquí
 *  se le ENVÍA a SAP el aviso con la evidencia; la orden la crea el planeador
 *  en SAP, no TRIM. Para quien decide va una sola línea. */
export function BloqueSap({ campoId, equipo, nivel }: { campoId: string; equipo: string; nivel: 'decision' | 'operacion' | 'ingenieria' }) {
  const rol = useRol(); const usuarios = useUsuarios()
  // El aviso que se acaba de enviar desde aquí: su línea recibe el foco, porque
  // el formulario (y el botón que tenía el foco) desaparece al quedar abierto.
  const [enviado, setEnviado] = useState<string | null>(null)
  const { avisos, ordenes, repuestos, identidad: id } = useSapDeEquipo(campoId, equipo)
  const abierto = avisos.find(a => !a.cerrado)
  const ordenAbierta = ordenes.find(o => o.estado !== 'TECO')
  const faltan = repuestos.filter(r => r.stock < r.minimo)
  // El técnico de una orden es una persona (su id), no un rol; si va a un contratista, solo el puesto.
  const tecnico = (o: OrdenSap) => usuarios.find(u => u.id === o.tecnico)?.nombre ?? `la cuadrilla ${o.puesto}`

  if (nivel === 'decision') return (
    <p className="text-[12px] text-[var(--tinta2)]">
      <b className="text-[var(--tinta)]">En SAP:</b>{' '}
      {ordenAbierta ? `orden ${ordenAbierta.numero} ${NOMBRE_ESTADO_ORDEN[ordenAbierta.estado]}` : abierto ? `aviso ${abierto.numero} abierto, sin orden todavía` : 'sin aviso ni orden abiertos'}
      {faltan.length > 0 && <> · <FueraDeMeta si tamano={10} />sin stock de {faltan.map(r => r.descripcion.toLowerCase()).join(', ')}</>}
    </p>
  )

  return (
    <section aria-label="SAP">
      <h3 className={titulo}>SAP · MANTENIMIENTO <span className="font-mono font-normal normal-case tracking-normal">· equipo {id.equipoSap} · {id.ubicacion}</span></h3>
      {/* Región viva: lo que cambia aquí (el aviso que se envió) se anuncia. */}
      <div aria-live="polite">
        {ordenAbierta && <LineaOrden o={ordenAbierta} tecnico={tecnico(ordenAbierta)} />}
        {abierto && !ordenAbierta && <LineaAviso a={abierto} enfocar={enviado === abierto.numero} />}
        {!abierto && !ordenAbierta && (rol.puede['sap:aviso']
          ? <EnviarAviso key={`${campoId}|${equipo}`} campoId={campoId} equipo={equipo} onEnviado={setEnviado} />
          : <p className="text-[11.5px] text-[var(--tinta2)]">Sin aviso ni orden abiertos en SAP.</p>)}
      </div>

      {repuestos.length > 0 && (
        <>
          <h3 className={titulo}>REPUESTOS CRÍTICOS · STOCK EN SAP</h3>
          <ul className="grid gap-1 text-[11.5px]">
            {repuestos.map(r => {
              const falta = r.stock < r.minimo
              return (
                <li key={r.material} className="flex items-start gap-1.5">
                  <FueraDeMeta si={falta && !r.enTransito} tamano={10} />
                  <span className="min-w-0 flex-1">
                    <b>{r.descripcion}</b>: {plural(r.stock, 'en bodega', 'en bodega')} (mínimo {r.minimo})
                    {r.enTransito ? ` · ${r.enTransito.cantidad} en tránsito, llega el ${fechaCorta(new Date(`${r.enTransito.llega}T12:00:00-05:00`))}`
                      : falta ? ` · pedirlo tarda ${n0(r.plazoDias)} días` : ''}
                  </span>
                </li>
              )
            })}
          </ul>
        </>
      )}

      {nivel === 'ingenieria' && ordenes.length > 0 && (
        <>
          <h3 className={titulo}>HISTORIAL EN SAP · {plural(ordenes.length, 'ORDEN', 'ÓRDENES')}{ordenes.length > 5 ? ' · LAS 5 MÁS RECIENTES' : ''}</h3>
          <ul className="grid gap-1 text-[11px] text-[var(--tinta2)]">
            {ordenes.slice(0, 5).map(o => (
              <li key={o.numero} className="flex flex-wrap gap-x-2">
                <span className="tabular text-[var(--tinta3)]">{fechaCorta(new Date(o.creada))}</span>
                <b className="text-[var(--tinta)]">{o.numero}</b>
                <span>{NOMBRE_CLASE[o.clase]} · {o.descripcion}</span>
                <span className="text-[var(--tinta3)]">{NOMBRE_ESTADO_ORDEN[o.estado]}{o.horasReales ? ` · ${n1(o.horasReales)} h confirmadas` : ''}</span>
              </li>
            ))}
          </ul>
          {ordenes.length > 5 && <small className="text-[10.5px] text-[var(--tinta3)]">y {plural(ordenes.length - 5, 'orden más', 'órdenes más')} en SAP</small>}
        </>
      )}
      <p className="mt-2 text-[10px] text-[var(--tinta3)]">Avisos, órdenes, horas y stock vienen de SAP. La orden la crea el planeador en SAP; TRIM envía el aviso y avisa cuando la orden se libera.</p>
    </section>
  )
}

function LineaAviso({ a, enfocar }: { a: AvisoSap; enfocar?: boolean }) {
  const horas = horasEntre(new Date(a.creado), AHORA)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { if (enfocar) ref.current?.focus() }, [enfocar])
  return (
    <div ref={ref} tabIndex={-1} className="rounded border border-[var(--linea2)] bg-[var(--panel2)] px-2.5 py-2 text-[11.5px]">
      <b>Aviso {a.numero}</b> ({NOMBRE_TIPO_AVISO[a.tipo]}, prioridad {a.prioridad}) {horas < 1 ? 'recién enviado' : `abierto hace ${fmtHoras(horas)}`} · {a.creadoPor}
      <span className="block text-[var(--tinta2)]">{a.descripcion}. Sin orden todavía: la crea el planeador en SAP, y cuando la libere TRIM le avisa al técnico.</span>
    </div>
  )
}

function LineaOrden({ o, tecnico }: { o: OrdenSap; tecnico: string }) {
  return (
    <div className="rounded border border-[var(--linea2)] bg-[var(--panel2)] px-2.5 py-2 text-[11.5px]">
      <b>Orden {o.numero}</b> ({NOMBRE_CLASE[o.clase]}, prioridad {o.prioridad}) · {NOMBRE_ESTADO_ORDEN[o.estado]}{o.liberada ? `${o.estado === 'REL' ? '' : ' · liberada'} el ${fechaHora(new Date(o.liberada))}` : ''}
      <span className="block text-[var(--tinta2)]">{o.descripcion} · asignada a {tecnico}{o.aviso ? ` · del aviso ${o.aviso}` : ''}</span>
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
    <div className="flex flex-wrap items-center gap-2 text-[11.5px]">
      <span className="min-w-0 flex-1 text-[var(--tinta2)]">Sin aviso ni orden abiertos en SAP.{parada ? ' El equipo está parado: SAP todavía no lo sabe.' : ''}</span>
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
      <b className="text-[12px]">Aviso de {parada ? 'avería (M2)' : 'solicitud (M1)'} para SAP</b>
      <label className="grid gap-0.5"><span className="text-[10.5px] text-[var(--tinta2)]">Qué pasa</span>
        <input value={descripcion} onChange={e => { setDescripcion(e.target.value); setError(null) }} className={campoInput}
          aria-invalid={error?.campo === 'descripcion'} aria-describedby={error ? idError : undefined} /></label>
      <div className="grid items-start gap-1.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,160px),1fr))]">
        {partes.length > 0 && (
          <label className="grid gap-0.5"><span className="text-[10.5px] text-[var(--tinta2)]">Parte del equipo</span>
            <select value={parte} onChange={e => { setParte(e.target.value as ParteId | ''); setModo('') }} className={campoInput}>
              <option value="">sin identificar</option>
              {partes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </label>
        )}
        {parteSel && (
          <label className="grid gap-0.5"><span className="text-[10.5px] text-[var(--tinta2)]">Daño (lo que se ve)</span>
            <select value={modo} onChange={e => setModo(e.target.value)} className={campoInput}>
              <option value="">sin identificar</option>
              {modosDeParte(parteSel).map(m => <option key={m.codigo} value={m.codigo}>{m.codigo} · {nombreModo(m.codigo, parteSel.id)}</option>)}
            </select></label>
        )}
        <label className="grid gap-0.5"><span className="text-[10.5px] text-[var(--tinta2)]">Prioridad en SAP</span>
          <select value={prioridad} onChange={e => setPrioridad(Number(e.target.value) as 1 | 2 | 3 | 4)} className={campoInput}>
            <option value={1}>1 · muy alta</option><option value={2}>2 · alta</option><option value={3}>3 · media</option><option value={4}>4 · baja</option>
          </select></label>
      </div>
      {parteSugerida && <small className="text-[10.5px] text-[var(--tinta3)]">La señal sugiere: {partes.find(p => p.id === parteSugerida)?.nombre.toLowerCase()}</small>}
      <div className="text-[10.5px] text-[var(--tinta2)]">
        <span className="text-[var(--tinta3)]">Evidencia que va en el texto largo del aviso:</span>
        <ul className="list-disc pl-4">{evidencia.map(x => <li key={x}>{x}</li>)}</ul>
      </div>
      {error && <p id={idError} role="alert" className="text-[11.5px] text-[var(--tinta)]">{error.texto}</p>}
      <span className="flex flex-wrap gap-1.5">
        <Boton variante="principal" type="submit"><Send className="mr-1 inline size-3.5" />Enviar a SAP</Boton>
        <Boton type="button" onClick={() => setAbierto(false)}>Cancelar</Boton>
      </span>
    </form>
  )
}
