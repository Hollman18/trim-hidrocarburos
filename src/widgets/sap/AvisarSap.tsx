import { useState } from 'react'
import { useApp, useRol } from '@/app/store'
import { useSapDeEquipo } from '@/shared/api/sap'
import { puedeHacer } from '@/entities/tipos'
import { Boton } from '@/shared/ui/primitivas'

/** «SAP no lo sabe · Avisar» (flujos-que-fallan.md FF-5): el equipo está parado y SAP no tiene
 *  aviso ni orden abiertos; un toque le manda el aviso (`POST /api/sap/avisos`) con lo que TRIM
 *  ya sabe. Con aviso u orden, la línea dice cuál y no pide nada. Un solo nombre: «Avisar». */
export function AvisarSap({ campoId, equipo, evento, contexto }: { campoId: string; equipo: string; evento?: string; contexto: string }) {
  const rol = useRol()
  const enviarAviso = useApp(s => s.enviarAviso)
  const { avisos, ordenes } = useSapDeEquipo(campoId, equipo)
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const aviso = avisos.find(a => !a.cerrado), orden = ordenes.find(o => o.estado !== 'TECO' && o.estado !== 'CNF')
  if (!puedeHacer(rol.puede, 'sap:aviso')) return null
  const avisar = async () => {
    setOcupado(true); setError('')
    const r = await enviarAviso({ tipo: 'M2', campoId, equipo, descripcion: `${equipo} parada: ${contexto}`, prioridad: 1, parada: true, evidencia: [contexto], ...(evento ? { evento } : {}) })
    setOcupado(false)
    if (!r.ok) setError(r.error)
  }
  return (
    <p className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 rounded-[10px] bg-[var(--panel)] px-5 py-3 text-[15px] sm:px-6" data-avisar-sap={equipo} role="status">
      <span><b className="font-cond font-bold tracking-[.02em]">{equipo}</b> · {orden ? `orden ${orden.numero} en SAP` : aviso ? `aviso ${aviso.numero} en SAP` : 'SAP no lo sabe'}</span>
      {!aviso && !orden && <Boton disabled={ocupado} onClick={() => void avisar()} className="min-h-11 px-5">Avisar</Boton>}
      {error && <span role="alert" className="basis-full text-[14px]">{error}</span>}
    </p>
  )
}
