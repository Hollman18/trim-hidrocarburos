import { useEffect, useRef, useState } from 'react'
import { useApp, useRol, usePersona } from '@/app/store'
import { useParadasAnh, gruposPorCadena, CONFIRMAN_EN_LOTE, PASOS, type ParadaAnh } from '@/shared/api/arbol'
import { campoPorId } from '@/entities/campos'
import { AHORA } from '@/entities/reloj'
import { puedeHacer } from '@/entities/tipos'
import { Panel, Boton, Hueco } from '@/shared/ui/primitivas'
import { Lectura } from '@/shared/ui/Lectura'
import { diaIso, n0, plural } from '@/shared/lib/formato'
import { confirmar } from './escribir'
import { esperaAQuienAbre } from './grupos'
import { ESTADO, horaCorta, lista, valorEnPalabras } from './palabras'
import { Falta } from './Cadena'

/** Un lote: las paradas propuestas con la misma cadena de 6 pasos, y sus raíces. */
interface Lote { cadena: string; filas: ParadaAnh[]; raices: Array<{ raiz: string; equipo: string; pozos: string[]; inicio: string }> }

function lotesDe(ps: readonly ParadaAnh[]): Lote[] {
  return [...gruposPorCadena(ps).entries()].map(([cadena, filas]) => {
    const por = new Map<string, ParadaAnh[]>()
    for (const f of filas) { const g = por.get(f.raiz); if (g) g.push(f); else por.set(f.raiz, [f]) }
    const raices = [...por.values()].map(fs => ({
      raiz: fs[0]!.raiz, equipo: fs[0]!.causa.equipo, pozos: [...new Set(fs.map(f => f.pozo))],
      inicio: fs.reduce((a, f) => (f.inicio < a ? f.inicio : a), fs[0]!.inicio),
    })).sort((a, b) => a.inicio.localeCompare(b.inicio))
    return { cadena, filas, raices }
  }).sort((a, b) => b.filas.length - a.filas.length)
}

/** «Cierre de hoy · paradas por confirmar» en Turno (U1 §10.2; P1 §2.1): las paradas del
 *  día operacional de hoy, cuántas están completas y, para quien firma el día
 *  (supervisión y producción, `anh:confirmar`), lo propuesto agrupado por
 *  cadena idéntica, con su raíz a la vista y UN toque por grupo. Lo que una
 *  persona cambió ya no tiene la misma cadena: sale solo del lote. */
export function CierreDeHoy({ campos, global }: { campos: string[]; global: boolean }) {
  const rol = useRol(); const persona = usePersona()
  const setPantalla = useApp(s => s.setPantalla)
  const hoy = diaIso(AHORA)
  const ps = useParadasAnh({ campos, desde: new Date(`${hoy}T00:00:00-05:00`), hasta: AHORA }).filter(p => p.diaOperacional === hoy)
  const firma = CONFIRMAN_EN_LOTE.includes(rol.id) && puedeHacer(rol.puede, 'anh:confirmar') && !persona.sinAcceso
  const completas = ps.filter(p => p.estado === 'confirmada')
  const lotes = lotesDe(ps.filter(p => p.estado === 'propuesta' && !esperaAQuienAbre(p)))
  const esperan = ps.filter(esperaAQuienAbre)
  const faltaDato = ps.filter(p => p.estado === 'por-precisar')
  const sinCausa = ps.filter(p => p.estado === 'pendiente')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const avisoRef = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    if (!aviso) return
    const foco = document.activeElement
    if (!foco || foco === document.body || !foco.isConnected) avisoRef.current?.focus()
  }, [aviso])
  const donde = (c: string) => (global ? ` · ${campoPorId(c).nombre}` : '')
  const nombresDe = (xs: readonly ParadaAnh[]) => lista([...new Set(xs.map(p => `${p.pozo}${donde(p.campoId)}`))])
  const identificar = rol.pantallas.includes('causa')

  const confirmarLote = async (l: Lote) => {
    setOcupado(true); setError('')
    const r = await confirmar({ ids: l.filas.map(f => f.id), cadena: l.cadena })
    setOcupado(false)
    if (!r.ok) return setError(r.error)
    const listas = r.paradas.filter(p => p.estado === 'confirmada').length
    setAviso(`Listo: ${plural(r.paradas.length, 'parada confirmada', 'paradas confirmadas')} de un toque${r.lote ? ` (lote ${r.lote.id})` : ''}${listas === r.paradas.length ? '; quedan completas para el reporte.' : '; la causa de algunas la confirma quien abra el equipo.'}`)
  }

  return (
    <Panel className="mb-2.5" titulo="CIERRE DE HOY · PARADAS POR CONFIRMAR" extra={`${ps.length} · ${completas.length} ${completas.length === 1 ? 'completa' : 'completas'}`}>
      <Lectura>
        Las paradas de hoy, cada una con sus 6 pasos del árbol de causas. Las que TRIM propuso con la misma
        cadena se confirman de un toque por grupo; la raíz de cada grupo queda a la vista para no cargarle
        a una raíz lo que fue de otra. Lo que alguien cambió sale del grupo solo. Con lo confirmado se
        miden las paradas no planeadas, y el reporte a la ANH sale mañana antes de las 07:00.
      </Lectura>
      <p className="mb-2 text-[11.5px]">
        <b className="tabular">{plural(ps.length, 'parada', 'paradas')}</b> hoy · {completas.length} {completas.length === 1 ? 'completa' : 'completas'}
        {ps.length > completas.length && <> · <b>faltan {ps.length - completas.length}</b></>} · el reporte sale mañana antes de las 07:00
      </p>
      {aviso && <p ref={avisoRef} tabIndex={-1} role="status" className="mb-2 rounded-sm border border-[var(--linea2)] bg-[var(--panel2)] px-2 py-1.5 text-[11.5px] text-[var(--tinta2)]">{aviso}</p>}
      {ps.length === 0 && <Hueco>Hoy no ha parado ningún pozo: no hay nada que cerrar.</Hueco>}

      {lotes.map(l => {
        const p = l.filas[0]!
        return (
          <div key={l.cadena} data-lote className="mb-2 rounded border border-[var(--linea2)] p-2.5">
            <b className="text-[12px]">{l.filas.length === 1 ? '1 propuesta' : `${l.filas.length} iguales`}</b>
            <span className="text-[11px] text-[var(--tinta2)]"> · TRIM {l.filas.length === 1 ? 'la dedujo' : 'las dedujo'} · {ESTADO.propuesta}</span>
            {/* La cadena completa: lo que se confirma (sin códigos). */}
            <p className="mt-0.5 text-[11px] text-[var(--tinta)]">{PASOS.map(x => valorEnPalabras(x, String(p.clasificacion[x]!.valor))).join(' · ')}</p>
            <ul className="mt-1 grid gap-0.5 text-[11px] text-[var(--tinta2)]" aria-label="Raíces del grupo">
              {l.raices.map(r => (
                <li key={r.raiz}>
                  {r.pozos.length > 1 || r.equipo !== r.pozos[0] ? <>por <b className="text-[var(--tinta)]">{r.equipo}</b>: </> : null}
                  {lista(r.pozos)} · desde {horaCorta(r.inicio)}
                </li>
              ))}
            </ul>
            <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {firma
                ? <Boton variante="principal" disabled={ocupado} className="min-h-10 sm:min-h-0" onClick={() => void confirmarLote(l)}>
                    {l.filas.length === 1 ? 'Confirmar' : `Confirmar las ${l.filas.length}`}
                  </Boton>
                : <small className="text-[10.5px] text-[var(--tinta2)]">Lo confirma supervisión o producción, que firman el día.</small>}
              {identificar && <Boton disabled={ocupado} className="min-h-10 sm:min-h-0" onClick={() => setPantalla('causa')}>Ver una por una</Boton>}
            </span>
          </div>
        )
      })}
      {error && <p role="alert" className="mb-2 text-[11px] text-[var(--tinta)]">{error}</p>}

      {[
        { xs: esperan, que: 'esperan a quien abra el equipo: la causa y el detalle los confirma el jefe de mantenimiento o confiabilidad' },
        { xs: faltaDato, que: ESTADO['por-precisar'] },
        { xs: sinCausa, que: ESTADO.pendiente },
      ].filter(x => x.xs.length > 0).map(x => (
        <p key={x.que} className="mb-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11.5px]">
          <Falta>{x.xs.length}</Falta>
          <span>{x.que}: <b>{nombresDe(x.xs)}</b> <span className="text-[var(--tinta3)]">· {n0(x.xs.reduce((a, p) => a + p.diferidaTrimBbl, 0))} bbl</span></span>
          {identificar && <Boton variante="chico" className="min-h-10 sm:min-h-6" onClick={() => setPantalla('causa')}>Responder en Identificar</Boton>}
        </p>
      ))}
    </Panel>
  )
}
