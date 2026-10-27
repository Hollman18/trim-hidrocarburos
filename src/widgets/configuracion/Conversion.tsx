import { useState } from 'react'
import { useApp, useRol } from '@/app/store'
import { useConversionAnh, type ConversionLeida } from '@/shared/api/acciones'
import { importarConversion } from '@/shared/api/escrituras'
import { MOTIVO_MINIMO, alcanza } from '@/entities/reglas'
import { Boton, SubirCsv } from '@/shared/ui/primitivas'
import { Info } from '@/shared/ui/Info'
import { n0, plural } from '@/shared/lib/formato'
import { useFirmaRapida } from './firmaRapida'

/** LA CONVERSIÓN DEL ÁRBOL DE LA OPERADORA AL DE LA ANH (necesario-por-rol §11; A3; el pedido
 *  central de Edinson). Lo firmado del campo (cuántos códigos y cuántos con equivalencia; los que no
 *  la tienen, aparte y nunca con una por defecto) y, para cambiarla: importar la tabla
 *  («código; descripción; N1; N2», `POST /api/anh/conversion/importar`, que no firma), ver lo leído
 *  con lo que bloquea y firmarla con su motivo (`Config.conversionAnh`). */
export function Conversion() {
  const rol = useRol(); const campoId = useApp(s => s.campoId), rolId = useApp(s => s.rolId)
  const v = useConversionAnh(campoId)
  const { persona, firmar } = useFirmaRapida()
  const [leida, setLeida] = useState<ConversionLeida | null>(null)
  const [pegado, setPegado] = useState('')
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [abierto, setAbierto] = useState(false)
  const puede = !!rol.puede['config:firmar'] && !persona.sinAcceso
  const bloquean = leida?.hallazgos.filter(h => h.bloquea) ?? []

  const leer = async (texto: string) => {
    setOcupado(true); setError(null); setLeida(null)
    const r = await importarConversion({ rolId }, { campo: campoId, texto })
    setOcupado(false)
    if (!r.ok) { setError(r.error); return }
    const { ok: _ok, ...l } = r
    setLeida(l as ConversionLeida)
  }
  const firmarla = async () => {
    if (!leida) return
    if (!alcanza(motivo, MOTIVO_MINIMO)) { setError('Falta el motivo: queda en el historial de versiones, con su firma.'); return }
    setOcupado(true); setError(null)
    const r = await firmar(c => { c.conversionAnh = [...(c.conversionAnh ?? []).filter(f => f.campoId !== campoId), ...leida.conversion] }, motivo)
    setOcupado(false)
    if (!r.ok) { setError(r.error); return }
    setLeida(null); setPegado(''); setMotivo(''); setAbierto(false)
  }

  return (
    <div data-conversion={v.total} data-sin-equivalencia={v.sinEquivalencia.length}>
      {v.total === 0
        ? <p className="text-[15px] text-[var(--tinta2)]">Sin tabla firmada: las paradas se clasifican directo en el árbol de la ANH.</p>
        : (
          <p className="text-[15px] text-[var(--tinta)]">
            <b className="tabular-nums">{n0(v.conEquivalencia)} de {n0(v.total)}</b> códigos con su causa de la ANH
            {v.firma && <span className="text-[var(--tinta2)]"> · versión {v.firma.version}, {v.firma.por}</span>}
          </p>
        )}
      {v.sinEquivalencia.length > 0 && (
        <p className="mt-1 text-[14px] text-[var(--tinta2)]" data-codigos-sin="">
          Sin equivalencia: {v.sinEquivalencia.slice(0, 4).map(s => s.codigo).join(', ')}{v.sinEquivalencia.length > 4 ? ` y ${v.sinEquivalencia.length - 4} más` : ''}
        </p>
      )}
      {puede && !abierto && (
        <button type="button" onClick={() => setAbierto(true)} data-importar-conversion=""
          className="toque no-imprimir mt-1 min-h-11 cursor-pointer text-[15px] font-semibold text-[var(--tinta)] underline underline-offset-4">
          {v.total ? 'Cambiar la tabla' : 'Importar la tabla'}
        </button>
      )}
      {abierto && (
        <div className="no-imprimir mt-2 flex flex-col gap-3 rounded-[8px] bg-[var(--panel2)] p-3" role="group" aria-label="Importar la tabla de equivalencias">
          <p className="flex flex-wrap items-center gap-x-1 text-[14px] text-[var(--tinta2)]">
            Una fila por código: código; descripción; causa N1; detalle N2
            <Info titulo="La tabla de equivalencias" texto="Cada código del árbol de la operadora con su causa (N1) y su detalle (N2) de la Circular 024. Un código sin N1 o sin N2 queda sin equivalencia y se ve aparte: nunca se le pone una por defecto. La descripción se queda en TRIM y no viaja a la ANH." />
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <SubirCsv onTexto={t => void leer(t)} onError={setError} />
          </div>
          <label className="flex flex-col gap-1 text-[14px] font-semibold text-[var(--tinta)]">O pegue las filas
            <textarea value={pegado} onChange={e => setPegado(e.target.value)} rows={3} data-pegar-conversion=""
              placeholder="F-ESP-01; Falla de la bomba electrosumergible; No planeada - Mecánica subsuelo; FALLA ESP"
              className="rounded-[8px] border border-[var(--linea)] bg-[var(--panel)] px-2 py-1.5 font-mono text-[14px] font-normal" />
          </label>
          {pegado.trim() && <Boton type="button" onClick={() => void leer(pegado)} disabled={ocupado} className="self-start" data-leer-conversion="">Leer las filas</Boton>}
          {leida && (
            <div data-leida={leida.conversion.length}>
              <p className="text-[15px] font-semibold text-[var(--tinta)]">
                {plural(leida.conversion.length, 'código leído', 'códigos leídos')} de {plural(leida.filas, 'fila', 'filas')}
                {leida.conversion.filter(f => !f.n1 || !f.n2).length > 0 && <span className="font-normal text-[var(--tinta2)]"> · {leida.conversion.filter(f => !f.n1 || !f.n2).length} sin equivalencia</span>}
              </p>
              {leida.hallazgos.length > 0 && (
                <ul className="mt-1 text-[14px] text-[var(--tinta2)]">
                  {leida.hallazgos.slice(0, 6).map(h => <li key={`${h.fila}|${h.texto}`}>{h.bloquea ? 'Bloquea · ' : ''}fila {h.fila}{h.codigo ? ` (${h.codigo})` : ''}: {h.texto}</li>)}
                  {leida.hallazgos.length > 6 && <li>y {leida.hallazgos.length - 6} más</li>}
                </ul>
              )}
              <label className="mt-2 flex flex-col gap-1 text-[14px] font-semibold text-[var(--tinta)]">Motivo · obligatorio
                <input value={motivo} onChange={e => { setMotivo(e.target.value); setError(null) }} placeholder="Ej.: tabla de equivalencias revisada con confiabilidad"
                  className="min-h-11 rounded-[8px] border border-[var(--linea)] bg-[var(--panel)] px-2 text-[15px] font-normal" />
              </label>
              <Boton variante="principal" className="mt-2" disabled={bloquean.length > 0 || ocupado || leida.conversion.length === 0} onClick={() => void firmarla()} data-firmar-conversion="">
                Firmar como {persona.nombre}
              </Boton>
            </div>
          )}
          {error && <p role="alert" className="text-[14px] text-[var(--tinta)]">{error}</p>}
          <Boton type="button" className="self-start" onClick={() => { setAbierto(false); setLeida(null); setError(null) }}>Cancelar</Boton>
        </div>
      )}
    </div>
  )
}
