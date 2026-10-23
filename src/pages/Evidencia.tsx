import { useMemo } from 'react'
import { useApp, useAmbito, useRol, useRango } from '@/app/store'
import { useParadasDeBombas } from '@/shared/api/diferidos'
import { causaParaSalir } from '@/shared/api/arbol'
import { COMO } from '@/entities/causa-senal'
import { NOMBRE_PARTE } from '@/entities/partes'
import { campoPorId } from '@/entities/campos'
import { fechaHora } from '@/entities/reloj'
import { Panel, Boton, Chip } from '@/shared/ui/primitivas'
import { Tip } from '@/shared/ui/Tip'
import { Lectura } from '@/shared/ui/Lectura'
import { n0, n1 } from '@/shared/lib/formato'
import { descargarCsv } from '@/shared/lib/csv'
import { fmtHoras } from '@/widgets/bombas/comun'
import { Download } from 'lucide-react'

/** La línea de tiempo la pone el PLC. Eso es lo que convierte un acta en
 *  evidencia: la hora no la escribió ninguna de las dos partes. Cada parada de
 *  las bombas de la línea, con su causa, su evidencia y lo que costó. */
export function Evidencia() {
  const ambito = useAmbito(); const rol = useRol(); const rango = useRango()
  const abrirEquipo = useApp(s => s.abrirEquipo), setCampo = useApp(s => s.setCampo)
  const clave = ambito.campos.map(c => c.id).join(',')
  const lote = useParadasDeBombas(ambito.campos.map(c => c.id), rango.desde, rango.hasta)
  const paradas = useMemo(() => [...lote].sort((a, b) => b.inicio.getTime() - a.inicio.getTime()), [lote])

  // Los totales del período cuentan solo lo que cae en él: una parada que cruza
  // el borde no se suma entera a los dos meses.
  const horas = paradas.reduce((a, m) => a + m.horasEnPeriodo, 0)
  const propias = paradas.filter(m => m.cargadoA === m.evento.equipo)
  const barriles = propias.reduce((a, m) => a + m.bblEnPeriodo, 0)

  const exportar = () => descargarCsv(`paradas-bombas-${clave.replace(/,/g, '-')}`, [
    ['campo', 'equipo', 'evento', 'inicio (PLC)', 'fin (PLC)', 'horas', 'horas en el período', 'cruza el borde del período', 'causa', 'parte', 'cómo se identificó', 'evidencia', 'se carga a',
      'colchón previsto h', 'colchón observado h', 'pozos cerrados', 'bbl', 'bbl en el período', 'tolerancia %', 'evitable con el orden bbl', 'no conformidad'],
    ...paradas.map(m => [campoPorId(m.evento.campoId).nombre, m.evento.equipo, m.evento.id, m.evento.inicio, m.evento.fin ?? 'abierta',
      // Lo que sale de TRIM va con lo estructurado (D2): ni el texto libre de quien respondió ni nombres.
      m.horasParada, m.horasEnPeriodo, m.cruzaBorde ? 'sí' : 'no', causaParaSalir(m.causa).que.join('. '), m.causa.parte ? NOMBRE_PARTE[m.causa.parte] : '', COMO[m.causa.como], causaParaSalir(m.causa).evidencia.join(' | '), m.cargadoA,
      m.colchon?.previsto.horas, m.colchon?.observadoH, m.pozos, m.bbl, m.bblEnPeriodo, m.tolerancia * 100, m.evitable, m.arrancoSinIdentificar ? 'sí' : 'no']),
  ])

  return (
    <>
      <Tip titulo="Evidencia de parada" pista="La hora de inicio y de fin la pone el PLC, no un acta firmada después."
        filas={[['Paradas', String(paradas.length)], ['Horas fuera', `${n1(horas)} h`], ['Barriles de sus propias paradas', `${n0(barriles)} bbl`], ['Período', rango.nombre]]}
        className="mb-2.5 flex flex-wrap items-center gap-x-6 gap-y-3 rounded border border-[var(--linea)] bg-[var(--panel)] p-4 shadow-[var(--sombra)]">
        <span>
          <b className="tabular block text-[40px] leading-none">{n0(horas)}</b>
          <small className="text-[11.5px] text-[var(--tinta3)]">horas fuera de servicio de las bombas · hora del PLC · {rango.nombre}</small>
        </span>
        <span className="h-10 w-px bg-[var(--linea)]" />
        <span>
          <b className="tabular block text-[20px] leading-none">{n0(barriles)}</b>
          <small className="text-[10.5px] text-[var(--tinta3)]">bbl de sus propias paradas</small>
        </span>
        <span className="ml-auto">
          {rol.puede['evidencia:exportar'] && paradas.length > 0 && (
            <Boton variante="principal" onClick={exportar}><Download className="mr-1 inline size-3.5" />Exportar CSV</Boton>
          )}
        </span>
      </Tip>

      <Lectura>
        Para el contrato con el proveedor de la bomba o del servicio: cada parada con la hora del PLC,
        la señal que la explica y lo que costó con su tolerancia. Las que causó otro equipo (se cayó la
        energía, el aire) se le cargan a ese equipo, no a la bomba.
      </Lectura>

      <Panel className="mt-2.5" titulo="PARADAS DE LAS BOMBAS DE LA LÍNEA" extra={`${paradas.length} en el período`}>
        {paradas.length === 0 && <p className="text-[12.5px] text-[var(--tinta2)]">{ambito.titulo} no tiene paradas de bombas en este período.</p>}
        {paradas.map(m => (
          <button key={m.evento.id} onClick={() => { setCampo(m.evento.campoId); abrirEquipo(m.evento.equipo, false) }}
            className="grid w-full cursor-pointer grid-cols-[1fr_auto] gap-3 border-b border-[var(--linea2)] py-2 text-left text-[11.5px] last:border-0 hover:bg-[var(--panel2)]">
            <span className="min-w-0">
              <b>{m.evento.equipo}</b><span className="text-[var(--tinta3)]">{ambito.global ? ` · ${campoPorId(m.evento.campoId).nombre}` : ''} · {fechaHora(m.inicio)} → {m.abierto ? 'abierta' : fechaHora(m.fin)} · {fmtHoras(m.horasParada, true)}{m.cruzaBorde ? ` · ${fmtHoras(m.horasEnPeriodo, true)} en el período` : ''}</span>
              <span className="block text-[var(--tinta2)]">{m.causa.parte ? `${NOMBRE_PARTE[m.causa.parte]} · ` : ''}{m.causa.texto} <span className="text-[var(--tinta3)]">({COMO[m.causa.como]})</span></span>
              <small className="font-mono block truncate text-[10px] text-[var(--tinta3)]">{m.causa.evidencia[0]}</small>
            </span>
            <span className="tabular text-right">
              <b className="block">{n0(m.bbl)} bbl</b>
              {m.cruzaBorde && <small className="block text-[10px] text-[var(--tinta3)]">{n0(m.bblEnPeriodo)} en el período</small>}
              <span className="flex flex-wrap justify-end gap-1">
                {m.cargadoA !== m.evento.equipo && <Chip>de {m.cargadoA}</Chip>}
                {m.arrancoSinIdentificar && <Chip tono="fuerte">no conformidad</Chip>}
              </span>
            </span>
          </button>
        ))}
      </Panel>
    </>
  )
}
