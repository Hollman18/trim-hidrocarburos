import { useState } from 'react'
import { useApp, useRol } from '@/app/store'
import { registrarRespuestaAnh } from '@/shared/api/escrituras'
import { MOTIVOS_RECHAZO_ANH } from '@/shared/api/acciones'
import type { VistaReporteAnh } from '@/shared/api/regulatorio'
import { AHORA } from '@/entities/reloj'
import { formatoFecha } from '@/shared/lib/fecha'
import { Cifra } from '@/shared/ui/scada'
import { Boton } from '@/shared/ui/primitivas'
import { n0 } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'

/** LA RESPUESTA DE LA ANH Y LO QUE QUEDA DE LA HORA (necesario-por-rol §10; A3; Circular 024: 1 h
 *  para corregir un rechazo).
 *
 *  Lo que rige del período (`useReporteAnh(q).respuestaAnh`): aceptado, o rechazado con su motivo
 *  y los minutos que quedan (o «venció la hora»). Sin nada: «sin respuesta registrada», nunca un
 *  aceptado inventado. Regulatorio la registra a mano (`anh:enviar`, `POST /api/anh/respuestas`):
 *  el día reportado, aceptado o rechazado con el motivo de la lista, y la hora en que llegó. */
type MotivoRechazo = (typeof MOTIVOS_RECHAZO_ANH)[number]['codigo']
const HORA = formatoFecha({ hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Bogota' })
const local = (d: Date) => new Date(d.getTime() - 5 * 3_600_000).toISOString().slice(0, 16)
const diaAntes = (d: Date) => new Date(d.getTime() - 5 * 3_600_000 - 86_400_000).toISOString().slice(0, 10)

export function RespuestaAnh({ r, campoId, className }: { r: VistaReporteAnh; campoId: string; className?: string }) {
  const rol = useRol(); const rolId = useApp(s => s.rolId)
  const [abierto, setAbierto] = useState(false)
  const [dia, setDia] = useState(diaAntes(AHORA))
  const [estado, setEstado] = useState<'aceptado' | 'rechazado' | null>(null)
  const [motivo, setMotivo] = useState<MotivoRechazo | ''>('')
  const [recibida, setRecibida] = useState(local(AHORA))
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const a = r.respuestaAnh
  const puede = !!rol.puede['anh:enviar']
  const corre = a?.estado === 'rechazado' && !a.vencida
  const listo = !!estado && (estado === 'aceptado' || !!motivo)

  const enviar = async () => {
    if (!estado) return
    setOcupado(true); setError(null)
    const x = await registrarRespuestaAnh({ rolId }, { campoId, dia, estado, ...(estado === 'rechazado' && motivo ? { motivo } : {}), recibida: `${recibida}:00-05:00` })
    setOcupado(false)
    if (!x.ok) { setError(x.error); return }
    setAbierto(false); setEstado(null); setMotivo('')
  }

  return (
    <div className={cn('min-w-0', className)} data-respuesta-anh={a?.estado ?? 'sin-respuesta'}>
      {!a && <Cifra rotulo="Respuesta de la ANH" valor={null} unidad="" estado="sin-dato" mayusculas={false} nota="sin respuesta registrada" />}
      {a?.estado === 'aceptado' && (
        <div>
          <p className="font-cond text-[13px] font-semibold text-[var(--tinta2)]">Respuesta de la ANH</p>
          <p className="mt-1 text-[24px] font-bold leading-tight text-[var(--tinta)]">Aceptado</p>
          <p className="mt-1 text-[14px] text-[var(--tinta2)]">el reporte del {a.dia.slice(8)}/{a.dia.slice(5, 7)} · {a.por}</p>
        </div>
      )}
      {a?.estado === 'rechazado' && (
        <Cifra rotulo={corre ? 'Rechazado · quedan' : 'Rechazado'} valor={corre ? (a.quedanMin ?? 0) : null} unidad={corre ? 'min' : ''}
          estado={corre ? 'anormal' : 'sin-dato'} condicion={corre ? 'alarma' : undefined} mayusculas={false}
          nota={<>{a.motivoTexto ?? 'sin motivo'}{a.limiteCorreccion ? ` · corregir antes de las ${HORA.format(new Date(a.limiteCorreccion))}` : ''}{a.vencida ? ' · venció la hora' : ''}</>} />
      )}
      {a && a.respuestas > 1 && <p className="mt-1 text-[13px] text-[var(--tinta2)]">{n0(a.respuestas)} respuestas ese día: rige la última.</p>}
      {puede && !abierto && (
        <button type="button" onClick={() => setAbierto(true)} data-registrar-respuesta=""
          className="toque no-imprimir mt-2 min-h-11 cursor-pointer text-[15px] font-semibold text-[var(--tinta)] underline underline-offset-4">
          Registrar la respuesta
        </button>
      )}
      {abierto && (
        <form className="no-imprimir mt-3 flex flex-col gap-3 rounded-[8px] bg-[var(--panel2)] p-3" onSubmit={e => { e.preventDefault(); void enviar() }} aria-label="Registrar la respuesta de la ANH">
          <label className="flex flex-col gap-1 text-[14px] font-semibold text-[var(--tinta)]">Día reportado
            <input type="date" value={dia} max={diaAntes(new Date(AHORA.getTime() + 86_400_000))} onChange={e => setDia(e.target.value)}
              className="min-h-11 rounded-[8px] border border-[var(--linea)] bg-[var(--panel)] px-2 text-[15px] font-normal" />
          </label>
          <fieldset className="flex flex-wrap gap-2">
            <legend className="mb-1 text-[14px] font-semibold text-[var(--tinta)]">La ANH dijo</legend>
            {(['aceptado', 'rechazado'] as const).map(e => (
              <button key={e} type="button" aria-pressed={estado === e} onClick={() => setEstado(e)} data-estado-anh={e}
                className={cn('min-h-11 cursor-pointer rounded-[8px] px-4 text-[15px] font-semibold',
                  estado === e ? 'bg-[var(--primario)] text-[var(--primario-sobre)]' : 'bg-[var(--panel)] text-[var(--tinta)] shadow-[inset_0_0_0_1.5px_var(--linea)]')}>
                {e === 'aceptado' ? 'Aceptado' : 'Rechazado'}
              </button>
            ))}
          </fieldset>
          {estado === 'rechazado' && (
            <label className="flex flex-col gap-1 text-[14px] font-semibold text-[var(--tinta)]">Motivo
              <select value={motivo} onChange={e => setMotivo(e.target.value as MotivoRechazo)} data-motivo-anh=""
                className="min-h-11 rounded-[8px] border border-[var(--linea)] bg-[var(--panel)] px-2 text-[15px] font-normal">
                <option value="">Escoja el motivo</option>
                {MOTIVOS_RECHAZO_ANH.map(m => <option key={m.codigo} value={m.codigo}>{m.codigo} · {m.texto}</option>)}
              </select>
            </label>
          )}
          <label className="flex flex-col gap-1 text-[14px] font-semibold text-[var(--tinta)]">Llegó a las
            <input type="datetime-local" value={recibida} max={local(AHORA)} onChange={e => setRecibida(e.target.value)}
              className="min-h-11 rounded-[8px] border border-[var(--linea)] bg-[var(--panel)] px-2 text-[15px] font-normal" />
          </label>
          {error && <p role="alert" className="text-[14px] text-[var(--tinta)]">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Boton type="submit" variante="principal" disabled={!listo || ocupado} data-guardar-respuesta="">{ocupado ? 'Guardando…' : 'Guardar'}</Boton>
            <Boton type="button" onClick={() => { setAbierto(false); setError(null) }}>Cancelar</Boton>
          </div>
        </form>
      )}
    </div>
  )
}
