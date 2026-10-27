import { useMemo, useState } from 'react'
import { useApp, useRol } from '@/app/store'
import { useRegistro, sugerir, asociarTag } from '@/shared/api/registro'
import type { Capacidad } from '@/entities/tipos'
import { Boton, Enlace } from '@/shared/ui/primitivas'
import { plural } from '@/shared/lib/formato'

/** LOS TAGS SIN EQUIPO del campo, como paso del Estado (necesario-por-rol §11; flujos.md adm,
 *  tarea 3: 1 toque). Cuántos llegaron sin equipo, cuántos traen sugerencia y «Aplicar las N»
 *  (`POST /api/campos/:campo/tags/:tag/equipo`, `conector:configurar`); cada rechazo se dice con su
 *  tag. El registro completo (bordes, inscripción, uno por uno) sigue en Conectores, a un toque. */
export function Tags() {
  const rol = useRol(); const campoId = useApp(s => s.campoId), setPantalla = useApp(s => s.setPantalla)
  const caps = useMemo(() => (Object.entries(rol.puede) as Array<[Capacidad, boolean]>).filter(([, v]) => v).map(([k]) => k), [rol])
  const { datos, error, sinServicio, recargar } = useRegistro(campoId, caps)
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const verConectores = rol.pantallas.includes('conectores') ? () => setPantalla('conectores') : undefined
  if (sinServicio) return <p className="text-[15px] text-[var(--tinta2)]" data-tags="sin-servicio">En el demo no hay bordes conectados: el registro lo sirve el backend.</p>
  if (error) return <p className="text-[15px] text-[var(--tinta2)]">No se pudo consultar el registro: {error}.</p>
  if (!datos) return <p className="text-[15px] text-[var(--tinta2)]">Consultando el registro…</p>
  const pend = datos.pend
  const con = pend.filter(t => sugerir(t.tag, datos.inv.equipos))
  const aplicar = async () => {
    if (ocupado) return
    setOcupado(true); setAviso(null)
    const fallos: string[] = []
    for (const t of con) {
      const s = sugerir(t.tag, datos.inv.equipos)
      if (!s) continue
      try { await asociarTag(datos.campo, t.tag, s.codigo, 'regla', caps) } catch (e) { fallos.push(`${t.tag} → ${(e as Error).message}`) }
    }
    setOcupado(false)
    if (fallos.length) setAviso(`No se pudo asociar: ${fallos.join(' · ')}.`)
    recargar()
  }
  return (
    <div data-tags={pend.length}>
      <p className="text-[15px] text-[var(--tinta)]">
        {pend.length === 0 ? 'Todos los tags tienen su equipo.' : <><b className="tabular-nums">{plural(pend.length, 'tag', 'tags')}</b> sin equipo{con.length ? ` · ${con.length} con sugerencia` : ''}</>}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        {con.length > 0 && rol.puede['conector:configurar'] && (
          <Boton onClick={() => void aplicar()} disabled={ocupado} data-aplicar-tags="">{ocupado ? 'Asociando…' : `Aplicar las ${con.length}`}</Boton>
        )}
        {verConectores && <Enlace onClick={verConectores}>Ver los conectores</Enlace>}
      </div>
      {aviso && <p role="alert" className="mt-1 text-[14px] text-[var(--tinta)]">{aviso}</p>}
    </div>
  )
}
