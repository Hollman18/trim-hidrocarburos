import { useRango, useNivel } from '@/app/store'
import type { VistaNivel3 } from '@/shared/api/equiposTecnico'
import { useBombas, useEquipo, useHistoriaEquipo } from '@/shared/api/equipos'
import { useBarrilesDeEquipos } from '@/shared/api/diferidos'
import { n0 } from '@/shared/lib/formato'
import { DiagnosticoBomba } from '@/widgets/bombas/Detalle'
import { BloqueSap } from '@/widgets/sap/BloqueSap'
import { Instrumentos, Historia } from '@/widgets/PanelEquipo'
import { TarjetaN3 } from './piezas'

/** El nivel 4, el diagnóstico (X4 §5.1: «¿Por qué falla y qué hago?»; §3.7, «Bombas ·
 *  detalle» y «Ficha del equipo»): la salud por parte, el vigía, las paradas del PLC
 *  con su cadena, los instrumentos con la cadena de cada dato, la historia del PLC y
 *  SAP con su historial. Tiene dirección propia: «…/P-201B/diagnostico». */
export function Diagnostico({ v }: { v: VistaNivel3 }) {
  const rango = useRango(); const nivel = useNivel()
  const esPozo = v.tipo === 'pozo' || v.tipo === 'electrosumergible'
  const bomba = useBombas([v.campoId], rango.desde, rango.hasta).find(b => b.eq.id === v.equipo)
  const eq = useEquipo(v.campoId, v.equipo)
  const historia = useHistoriaEquipo(v.campoId, esPozo ? null : v.equipo)
  const bblDe = useBarrilesDeEquipos({ campos: [v.campoId], desde: rango.desde, hasta: rango.hasta })
  return (
    <div className="grid gap-4" data-nivel4={v.equipo}>
      {eq && (
        <section aria-label="Cómo está y por qué" className="rounded-[20px] bg-[var(--panel)] px-5 py-4 sm:px-7">
          <p className="text-[17px] leading-normal">{eq.lectura}</p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[15px]">
            {eq.modoFalla && eq.modoFalla !== '—' && <><dt className="text-[var(--tinta2)]">Modo de falla</dt><dd>{eq.modoFalla}</dd></>}
            <dt className="text-[var(--tinta2)]">Respaldo</dt><dd>{eq.redundancia}</dd>
            <dt className="text-[var(--tinta2)]">Aguas abajo</dt><dd>{eq.aguasAbajo}</dd>
            <dt className="text-[var(--tinta2)]">Diferido · {rango.nombre.toLowerCase()}</dt><dd className="tabular">{n0(bblDe(eq.id, v.campoId) ?? 0)} bbl</dd>
          </dl>
          <p className="mt-2 text-[14px] text-[var(--tinta2)]">Una señal apunta, no prueba: la causa la confirma quien abre el equipo.</p>
        </section>
      )}
      {bomba && <DiagnosticoBomba b={bomba} nivel={nivel} />}
      <TarjetaN3 titulo="Sus instrumentos" extra="toque uno para ver de dónde sale el dato" data-sus-instrumentos>
        <div className="mt-2.5"><Instrumentos campoId={v.campoId} equipo={v.equipo} /></div>
      </TarjetaN3>
      {historia && (
        <section aria-label="Historia del PLC" className="rounded-[20px] bg-[var(--panel)] px-5 pb-4 pt-1 sm:px-7" data-historia-plc>
          <Historia historia={historia} />
        </section>
      )}
      <section aria-label="SAP" className="rounded-[20px] bg-[var(--panel)] px-5 pb-4 pt-1 sm:px-7">
        <BloqueSap campoId={v.campoId} equipo={v.equipo} nivel={nivel} />
      </section>
    </div>
  )
}
