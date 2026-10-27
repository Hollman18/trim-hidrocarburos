import { useState } from 'react'
import { useApp, useCampo, useRol } from '@/app/store'
import { MOTIVO_MINIMO, alcanza } from '@/entities/reglas'
import { TURNOS_POR_DEFECTO, MAXIMO_TURNOS, validarTurnos } from '@/entities/configuracion'
import { Boton } from '@/shared/ui/primitivas'
import { useFirmaRapida } from './firmaRapida'

/** LA JORNADA DEL CAMPO (necesario-por-rol §0c; A2): las horas de cambio de turno, que el
 *  administrador firma. Con ellas, «Mi turno» del supervisor dice qué empezó y qué terminó en su
 *  jornada. Sin firma rige el horario por defecto y se dice «sin firmar». Se firma aquí, con su
 *  motivo, como cualquier cambio técnico (`Config.campos[c].turnos`). */
export function Jornada() {
  const campo = useCampo(); const rol = useRol(); const campoId = useApp(s => s.campoId)
  const { config, persona, firmar } = useFirmaRapida()
  const firmadas = config.campos[campoId]?.turnos
  const [abierto, setAbierto] = useState(false)
  const [turnos, setTurnos] = useState<string[]>(() => [...(firmadas ?? TURNOS_POR_DEFECTO)])
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const puede = !!rol.puede['config:firmar'] && !persona.sinAcceso
  const errores = validarTurnos(turnos, campo.nombre)
  const igual = (firmadas ?? []).join() === turnos.join()

  const enviar = async () => {
    if (!alcanza(motivo, MOTIVO_MINIMO)) { setError('Falta el motivo: queda en el historial de versiones, con su firma.'); return }
    setOcupado(true); setError(null)
    const r = await firmar(c => { if (c.campos[campoId]) c.campos[campoId]!.turnos = [...turnos].sort() }, motivo)
    setOcupado(false)
    if (!r.ok) { setError(r.error); return }
    setAbierto(false); setMotivo('')
  }

  return (
    <div data-jornada={firmadas ? 'firmada' : 'por-defecto'}>
      <p className="text-[15px] text-[var(--tinta)]">
        Cambio de turno <b className="tabular-nums">{(firmadas ?? TURNOS_POR_DEFECTO).join(' y ')}</b>
        <span className="text-[var(--tinta2)]">{firmadas ? ' · firmado' : ' · por defecto, sin firmar'}</span>
      </p>
      {puede && !abierto && (
        <button type="button" onClick={() => setAbierto(true)} data-cambiar-jornada=""
          className="toque no-imprimir mt-1 min-h-11 cursor-pointer text-[15px] font-semibold text-[var(--tinta)] underline underline-offset-4">
          {firmadas ? 'Cambiar la jornada' : 'Firmar la jornada'}
        </button>
      )}
      {abierto && (
        <form className="no-imprimir mt-2 flex flex-col gap-3 rounded-[8px] bg-[var(--panel2)] p-3" aria-label="La jornada del campo" onSubmit={e => { e.preventDefault(); void enviar() }}>
          <div className="flex flex-wrap items-end gap-2">
            {turnos.map((t, i) => (
              <label key={i} className="flex flex-col gap-1 text-[14px] font-semibold text-[var(--tinta)]">Turno {i + 1}
                <input type="time" value={t} onChange={e => setTurnos(x => x.map((y, j) => (j === i ? e.target.value : y)))} data-turno={i}
                  className="min-h-11 rounded-[8px] border border-[var(--linea)] bg-[var(--panel)] px-2 text-[15px] font-normal tabular-nums" />
              </label>
            ))}
            {turnos.length < MAXIMO_TURNOS && <Boton type="button" onClick={() => setTurnos(x => [...x, '12:00'])}>Otro turno</Boton>}
            {turnos.length > 1 && <Boton type="button" onClick={() => setTurnos(x => x.slice(0, -1))}>Quitar el último</Boton>}
          </div>
          <label className="flex flex-col gap-1 text-[14px] font-semibold text-[var(--tinta)]">Motivo · obligatorio
            <input value={motivo} onChange={e => { setMotivo(e.target.value); setError(null) }} placeholder="Ej.: horario acordado con el supervisor"
              className="min-h-11 rounded-[8px] border border-[var(--linea)] bg-[var(--panel)] px-2 text-[15px] font-normal" />
          </label>
          {[...errores, ...(error ? [error] : [])].map(e => <p key={e} role="alert" className="text-[14px] text-[var(--tinta)]">{e}</p>)}
          <div className="flex flex-wrap gap-2">
            <Boton type="submit" variante="principal" disabled={errores.length > 0 || igual || ocupado} data-firmar-jornada="">Firmar como {persona.nombre}</Boton>
            <Boton type="button" onClick={() => { setAbierto(false); setError(null) }}>Cancelar</Boton>
          </div>
        </form>
      )}
    </div>
  )
}
