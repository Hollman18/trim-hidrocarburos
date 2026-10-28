import { useHistorial, type PeriodoDelHistorial } from '@/shared/api/balance'
import { EXPLICA_PERDIDA } from '@/shared/api/perdidas'
import { Columnas, LeyendaColumnas, type PeriodoColumna } from '@/shared/ui/scada'
import { Info } from '@/shared/ui/Info'
import { n0, n1 } from '@/shared/lib/formato'
import { Tarjeta } from './piezas'

/* EL HISTORIAL DEL DIFERIDO Y DEL PERDIDO (el dueño, 28-oct: «para los cargos clave, en gráficos»).
 *
 * Mes a mes (gerente, producción, jefe de mantenimiento y confiabilidad): una columna por mes con su diferido
 * partido por tramo del choke, en los grises de dato; el mes cerrado que pasó su máximo firmado, con el fondo en
 * rojo pálido, y el que no, en verde pálido (el motor dice `sobre`; aquí solo se pinta). Turno a turno (el
 * supervisor): sus últimas 14 jornadas. El PERDIDO va aparte, debajo, nunca sumado: sin registro lo dice una vez,
 * sin dibujar ceros. Las cifras salen de `GET /api/vistas/historial` (cada período es el balance con ese período). */
export function Historial({ campos, por = 'mes', className }: { campos: string[]; por?: 'mes' | 'turno'; className?: string }) {
  const v = useHistorial(por === 'turno' ? { campos, por } : { campos })
  const mes = v.por === 'mes'
  // En miles de barriles mes a mes (13 columnas: «47,6» cabe sobre su columna); por turno, en barriles.
  const formato = mes ? (x: number) => (x >= 1000 ? n1(x / 1000) : n1(x / 1000).replace(/^0,0$/, '0')) : (x: number) => n0(x)
  const unidad = mes ? 'mil bbl' : 'bbl'
  const partes = v.tramos.map(t => t.nombre)
  const columna = (p: PeriodoDelHistorial): PeriodoColumna => ({
    clave: p.clave, rotulo: p.rotulo, ...(p.segundo ? { segundo: p.segundo } : {}),
    valores: v.tramos.map(t => p.porTramo.find(x => x.tramo === t.tramo)?.diferido ?? 0),
    total: p.diferido.entero,
    ...(p.sobre === true ? { fondo: 'frenado' as const } : p.sobre === false ? { fondo: 'bien' as const } : {}),
    datos: { 'data-periodo': p.clave, 'data-diferido': p.diferido.entero, 'data-sobre': p.sobre === null ? '' : String(p.sobre) },
  })
  const conMaximo = v.periodos.some(p => p.maximo !== null)
  const ultimo = v.periodos.at(-1)
  const titulo = mes ? 'Diferido y perdido, mes a mes' : `Sus últimos ${v.periodos.length} turnos`
  const nombre = (p: PeriodoColumna) => v.periodos.find(x => x.clave === p.clave)?.nombre ?? p.rotulo
  return (
    <Tarjeta titulo={titulo} className={className} data-historial={v.por}
      extra={<span className="inline-flex flex-wrap items-center gap-x-1">diferido por tramo · {unidad}<Info titulo={titulo} texto={`${v.frase}. Cada columna es el diferido del ${mes ? 'mes' : 'turno'}, partido por el tramo donde se trabó; el perdido va aparte y nunca se suma.${conMaximo ? ' Fondo rojo pálido: el mes cerrado pasó su máximo firmado; verde pálido: no lo pasó. El mes en curso no se juzga.' : ''}`} /></span>}>
      <div className="mt-3 overflow-x-auto">
        <Columnas periodos={v.periodos.map(columna)} partes={partes} unidad={unidad} formato={formato} nombrePeriodo={nombre} minimo={mes ? 520 : 480}
          aria-label={`${titulo}: ${v.periodos.map(p => `${p.nombre}, ${n0(p.diferido.entero)} bbl diferidos${p.sobre === true ? ', sobre el máximo' : ''}`).join('; ')}. ${v.frase}.`} />
      </div>
      <LeyendaColumnas partes={partes} />
      {conMaximo && (
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 text-[13px] text-[var(--tinta2)]">
          <span className="inline-flex items-center gap-1.5"><i aria-hidden className="inline-block size-2.5 rounded-[2px] bg-[var(--frenado-f)] shadow-[inset_0_0_0_1px_var(--frenado-raya)]" />pasó el máximo firmado</span>
          <span className="inline-flex items-center gap-1.5"><i aria-hidden className="inline-block size-2.5 rounded-[2px] bg-[var(--bien-f)] shadow-[inset_0_0_0_1px_var(--bien-raya)]" />bajo el máximo</span>
        </p>
      )}
      {/* El perdido, aparte y nunca sumado: sin registro se dice una vez; con registro, su columna por período. */}
      <div className="mt-3 border-t border-[var(--linea2)] pt-3" data-historial-perdido={v.conPerdido ? 'si' : 'sin-registro'}>
        {v.conPerdido ? (
          <>
            <p className="text-[14px] font-semibold text-[var(--tinta)]">Perdido · {unidad}</p>
            <div className="mt-1 overflow-x-auto">
              <Columnas periodos={v.periodos.map(p => ({ clave: p.clave, rotulo: p.rotulo, ...(p.segundo ? { segundo: p.segundo } : {}), valores: [p.perdido?.entero ?? 0] }))}
                partes={['Perdido']} unidad={unidad} formato={formato} nombrePeriodo={nombre} minimo={mes ? 520 : 480}
                aria-label={`Perdido por ${mes ? 'mes' : 'turno'}: ${v.periodos.map(p => `${p.nombre}, ${p.perdido ? `${n0(p.perdido.entero)} bbl` : 'sin registro'}`).join('; ')}`} />
            </div>
          </>
        ) : (
          <p className="flex items-center gap-1 text-[14px] text-[var(--tinta2)]">
            <b className="font-semibold text-[var(--tinta)]">Perdido:</b> sin registro en {mes ? `los ${v.periodos.length} meses` : `los ${v.periodos.length} turnos`}.
            <Info titulo="Perdido" texto={EXPLICA_PERDIDA} />
          </p>
        )}
      </div>
      {ultimo?.enCurso && <p className="mt-1 text-[13px] text-[var(--tinta2)]">{ultimo.nombre}: en curso.</p>}
    </Tarjeta>
  )
}
