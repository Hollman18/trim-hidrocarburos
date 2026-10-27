import type { ReactNode } from 'react'
import { useSap, useEquiposSap } from '@/shared/api/sap'
import { NOMBRE_CLASE_EQUIPO, type ClaseCatalogo } from '@/entities/catalogo'
import { CAUSAS_RAIZ } from '@/entities/iso14224'
import { fechaHora, AHORA } from '@/entities/reloj'
import { Panel, Chip } from '@/shared/ui/primitivas'
import { Lectura } from '@/shared/ui/Lectura'
import { Info } from '@/shared/ui/Info'
import { n1, plural } from '@/shared/lib/formato'

const SINCRONIZADO = new Date(AHORA.getTime() - 2 * 60_000)

/** El sistema de la empresa con que habla TRIM, además de los bordes del
 *  campo: SAP PM (avisos de ida; órdenes, horas y repuestos de vuelta). Lo que
 *  viaja en cada sentido es el contrato (CONTRATO.md · SAP PM). */
export function Integraciones({ campoId }: { campoId: string }) {
  const { avisos, ordenes } = useSap([campoId])
  const flota = useEquiposSap(campoId)
  const deTrim = avisos.filter(a => a.origen === 'trim').length
  const abiertas = ordenes.filter(o => o.estado !== 'TECO').length
  const horas = ordenes.reduce((a, o) => a + o.horasReales, 0)
  const materiales = new Set(flota.flatMap(f => f.repuestos.map(r => r.material))).size
  const ejemplo = flota[0] ? { equipo: flota[0].equipo, ...flota[0].identidad } : undefined
  const clases = [...new Map(flota.map(f => f.catalogo).filter(c => !!c).map(c => [c!.clase, c!])).values()]

  return (
    <Panel titulo="Sistemas corporativos" extra={`sincronizado ${fechaHora(SINCRONIZADO)}`}>
      <Lectura>
        Además de los bordes que leen los PLC, TRIM habla con SAP. Le manda los avisos con su
        evidencia y lee las órdenes, las horas y los repuestos: las órdenes las crea el planeador en
        SAP, no TRIM.
      </Lectura>
      <div className="mt-2 grid items-start gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))]">
        <section className="rounded-[16px] bg-[var(--panel2)] p-4 text-[14px]" aria-label="SAP">
          <header className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <b className="text-[15px]">SAP S/4HANA · Mantenimiento (PM)</b><Chip>conectado</Chip>
          </header>
          <Fila titulo="Avisos a SAP" valor={`${deTrim}`}
            info="Con su evidencia, desde la puesta en marcha: M1 solicitud (una parte avisa) · M2 avería (el equipo paró)." />
          <Fila titulo="Órdenes de SAP" valor={`${ordenes.length} · ${plural(abiertas, 'abierta', 'abiertas')}`}
            info="Con su estado: creada, liberada, en ejecución, cerrada." />
          <Fila titulo="Horas de SAP" valor={`${n1(horas)} h`} info="Confirmadas: la reparación activa de cada orden." />
          <Fila titulo="Repuestos de SAP" valor={plural(materiales, 'material', 'materiales')}
            info="Los críticos: stock de libre utilización en la bodega del campo." />
          <Fila titulo="Equipos del PLC en SAP" valor={`${flota.length} de ${flota.length}`}
            info={`Los de alto impacto, asociados entre el PLC y SAP.${ejemplo ? ` Por ejemplo: ${ejemplo.equipo} → equipo ${ejemplo.equipoSap} · ${ejemplo.ubicacion}.` : ''}`} />
          <h4 className="mb-1 mt-3 text-[14px] font-semibold text-[var(--tinta2)]">Catálogos de daño</h4>
          {clases.length === 0 && <p className="text-[var(--tinta2)]">Este campo no tiene equipos de alto impacto.</p>}
          {clases.map(c => (
            <p key={c.clase} className="flex flex-wrap justify-between gap-x-3 border-b border-[var(--linea2)] py-1 last:border-0">
              <span>{NOMBRE_CLASE_EQUIPO[c.clase as ClaseCatalogo]}</span>
              <span className="tabular text-[var(--tinta2)]">{c.partes.length} partes (cat. B) · {new Set(c.partes.flatMap(x => x.modos)).size + 1} daños (cat. C) · {CAUSAS_RAIZ.length} causas (cat. 5)</span>
            </p>
          ))}
        </section>

      </div>
    </Panel>
  )
}

/** Una cifra del sistema: el rótulo con su ⓘ (lo que explica, que en el papel sale escrito) y el valor. */
function Fila({ titulo, valor, pie, info }: { titulo: string; valor: ReactNode; pie?: string; info?: string }) {
  return (
    <div className="border-b border-[var(--linea2)] py-1.5 last:border-0">
      <span className="flex flex-wrap justify-between gap-x-3">
        <span className="flex flex-wrap items-center gap-x-1 text-[var(--tinta2)]">{titulo}{info && <Info titulo={titulo} texto={info} />}</span>
        <b className="tabular">{valor}</b>
      </span>
      {pie && <small className="block text-[13px] text-[var(--tinta3)]">{pie}</small>}
    </div>
  )
}
