import { useState } from 'react'
import { useApp } from '@/app/store'
import {
  registrarPerdida, TIPOS_PERDIDA, NOMBRE_TIPO_PERDIDA, EXPLICA_TIPO_PERDIDA, FUENTES_VOLUMEN, NOMBRE_FUENTE_VOLUMEN, MAXIMO_DONDE,
  type TipoPerdida, type FuenteVolumen, type RegistroPerdida,
} from '@/shared/api/perdidas'
import { NOMBRE_TRAMO_BALANCE } from '@/shared/api/balance'
import type { ChokeAnh } from '@/entities/choke'
import { MOTIVO_MINIMO, TEXTO_MAXIMO, alcanza } from '@/entities/reglas'
import { Boton } from '@/shared/ui/primitivas'
import { Modal } from '@/shared/ui/Modal'
import { n0 } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'

/** REGISTRAR UNA PÉRDIDA (necesario-por-rol §0b y §2; CONSTRUCCION.md: «el operador la registra
 *  con botones: pitera, derrame, tea, venteo, rechazo»).
 *
 *  Botones para el tipo y el tramo, el volumen con cómo se supo, dónde y desde cuándo. Escribe
 *  `POST /api/perdidas` (`registrarPerdida`, capacidad `perdidas:registrar`); el servidor pone
 *  quién y cuándo, y la deja como PÉRDIDA en su tramo, aparte del diferido. Lo que el servidor
 *  rechaza vuelve con sus palabras. La usa producción; el operador y el supervisor también
 *  pueden (B3). */
const TRAMOS: readonly ChokeAnh[] = ['reservorio', 'pozo', 'planta', 'exportacion']
const DE_GAS: readonly TipoPerdida[] = ['tea', 'venteo']

/** «2026-10-02T14:00» en hora de Colombia, para el campo de fecha y hora. */
const local = (d: Date) => new Date(d.getTime() - 5 * 3_600_000).toISOString().slice(0, 16)

export function RegistrarPerdida({ campoId, ahora, onCerrar, onHecho }: {
  campoId: string; ahora: Date; onCerrar: () => void; onHecho?: (p: RegistroPerdida) => void
}) {
  const rolId = useApp(s => s.rolId)
  const [tipo, setTipo] = useState<TipoPerdida | null>(null)
  const [tramo, setTramo] = useState<ChokeAnh | null>(null)
  const [donde, setDonde] = useState('')
  const [bbl, setBbl] = useState('')
  const [gas, setGas] = useState('')
  const [fuente, setFuente] = useState<FuenteVolumen | null>(null)
  const [como, setComo] = useState('')
  const [inicio, setInicio] = useState(local(new Date(ahora.getTime() - 3_600_000)))
  const [sigue, setSigue] = useState(true)
  const [fin, setFin] = useState(local(ahora))
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [hecha, setHecha] = useState<RegistroPerdida | null>(null)

  // Los umbrales son los del servidor (entities/reglas.ts): «cómo» pide lo mismo que un motivo.
  const listo = !!tipo && !!tramo && !!donde.trim() && bbl.trim() !== '' && !!fuente && alcanza(como, MOTIVO_MINIMO)
  const enviar = async () => {
    if (!tipo || !tramo || !fuente) return
    setOcupado(true); setError(null)
    const r = await registrarPerdida({ rolId }, {
      campoId, tipo, tramo, donde: donde.trim(), inicio: `${inicio}:00-05:00`, fin: sigue ? null : `${fin}:00-05:00`,
      volumen: { bbl: Number(bbl.replace(',', '.')), ...(gas.trim() ? { gasKpc: Number(gas.replace(',', '.')) } : {}), fuente, como: como.trim() },
    })
    setOcupado(false)
    if (!r.ok) { setError(r.error); return }
    setHecha(r.perdida); onHecho?.(r.perdida)
  }

  // El mismo modal de los demás detalles (D1): centrado en el escritorio, hoja desde abajo en el teléfono.
  return (
    <Modal titulo="Registrar una pérdida" subtitulo="Lo que salió y no se vende. Va aparte del diferido."
      onCerrar={onCerrar} className="no-imprimir" data-registrar-perdida={campoId}>
        {hecha ? (
          <div className="mt-5" role="status" data-perdida-registrada={hecha.id}>
            <p className="text-[16px] font-semibold text-[var(--tinta)]">Registrada: {NOMBRE_TIPO_PERDIDA[hecha.tipo].toLowerCase()} en {NOMBRE_TRAMO_BALANCE[hecha.tramo].toLowerCase()} · {n0(hecha.volumen.bbl)} bbl</p>
            <p className="mt-1 text-[14px] text-[var(--tinta2)]">{hecha.por} · queda en el balance como pérdida, nunca sumada al diferido.</p>
            <Boton variante="principal" className="mt-4" onClick={onCerrar}>Listo</Boton>
          </div>
        ) : (
          <form className="mt-4 flex flex-col gap-4" onSubmit={e => { e.preventDefault(); void enviar() }}>
            <Grupo titulo="¿Qué pasó?">
              {TIPOS_PERDIDA.map(t => (
                <Opcion key={t} activa={tipo === t} onClick={() => setTipo(t)} data-tipo-perdida={t}
                  texto={NOMBRE_TIPO_PERDIDA[t]} sub={EXPLICA_TIPO_PERDIDA[t]} />
              ))}
            </Grupo>
            <Grupo titulo="¿En qué tramo?">
              {TRAMOS.map(t => <Opcion key={t} activa={tramo === t} onClick={() => setTramo(t)} data-tramo-perdida={t} texto={NOMBRE_TRAMO_BALANCE[t]} />)}
            </Grupo>
            <Campo titulo="¿Dónde? El equipo o el punto">
              <input value={donde} onChange={e => setDonde(e.target.value.slice(0, MAXIMO_DONDE))} placeholder="Línea de flujo de LC-07"
                className="min-h-11 w-full rounded-[8px] border border-[var(--linea)] bg-[var(--panel)] px-3 text-[16px]" />
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo titulo="Crudo, bbl">
                <input inputMode="decimal" value={bbl} onChange={e => setBbl(e.target.value)} data-bbl-perdida=""
                  className="min-h-11 w-full rounded-[8px] border border-[var(--linea)] bg-[var(--panel)] px-3 text-[16px] tabular-nums" />
              </Campo>
              {tipo && DE_GAS.includes(tipo) && (
                <Campo titulo="Gas, KPC">
                  <input inputMode="decimal" value={gas} onChange={e => setGas(e.target.value)}
                    className="min-h-11 w-full rounded-[8px] border border-[var(--linea)] bg-[var(--panel)] px-3 text-[16px] tabular-nums" />
                </Campo>
              )}
            </div>
            <Grupo titulo="¿Cómo lo sabe?">
              {FUENTES_VOLUMEN.map(f => <Opcion key={f} activa={fuente === f} onClick={() => setFuente(f)} texto={NOMBRE_FUENTE_VOLUMEN[f]} />)}
            </Grupo>
            <Campo titulo="Cómo lo midió o lo estimó">
              <textarea value={como} onChange={e => setComo(e.target.value.slice(0, TEXTO_MAXIMO))} rows={2} placeholder="Nivel del tanque antes y después"
                className="w-full rounded-[8px] border border-[var(--linea)] bg-[var(--panel)] px-3 py-2 text-[16px]" />
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo titulo="Desde">
                <input type="datetime-local" value={inicio} max={local(ahora)} onChange={e => setInicio(e.target.value)}
                  className="min-h-11 w-full rounded-[8px] border border-[var(--linea)] bg-[var(--panel)] px-2 text-[15px]" />
              </Campo>
              <Campo titulo="Hasta">
                {sigue
                  ? <button type="button" onClick={() => setSigue(false)} className="min-h-11 w-full cursor-pointer rounded-[8px] border border-dashed border-[var(--linea)] px-2 text-left text-[15px] text-[var(--tinta2)]">sigue · poner la hora</button>
                  : <input type="datetime-local" value={fin} max={local(ahora)} onChange={e => setFin(e.target.value)}
                    className="min-h-11 w-full rounded-[8px] border border-[var(--linea)] bg-[var(--panel)] px-2 text-[15px]" />}
              </Campo>
            </div>
            {error && <p role="alert" className="text-[14px] text-[var(--tinta)]">{error}</p>}
            <Boton type="submit" variante="principal" disabled={!listo || ocupado} className="min-h-12 text-[16px]" data-enviar-perdida="">
              {ocupado ? 'Registrando…' : 'Registrar la pérdida'}
            </Boton>
          </form>
        )}
    </Modal>
  )
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-[14px] font-semibold text-[var(--tinta)]">{titulo}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  )
}

function Campo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[14px] font-semibold text-[var(--tinta)]">{titulo}</span>
      {children}
    </label>
  )
}

function Opcion({ activa, onClick, texto, sub, ...p }: { activa: boolean; onClick: () => void; texto: string; sub?: string } & Record<`data-${string}`, string>) {
  return (
    <button type="button" onClick={onClick} aria-pressed={activa} title={sub} {...p}
      className={cn('min-h-11 cursor-pointer rounded-[8px] px-3.5 py-2 text-left text-[15px] font-semibold',
        activa ? 'bg-[var(--primario)] text-[var(--primario-sobre)]' : 'bg-[var(--panel)] text-[var(--tinta)] shadow-[inset_0_0_0_1.5px_var(--linea)] hover:bg-[var(--panel2)]')}>
      {texto}
    </button>
  )
}
