import type { ReactNode } from 'react'
import { useSap, useEquiposSap } from '@/shared/api/sap'
import { usePreguntas } from '@/shared/api/diferidos'
import { useMensajes } from '@/shared/api/mensajes'
import { PLANTILLAS } from '@/entities/mensajes'
import { NOMBRE_CLASE_EQUIPO, type ClaseCatalogo } from '@/entities/catalogo'
import { CAUSAS_RAIZ } from '@/entities/iso14224'
import { recibeAlertas } from '@/entities/usuarios'
import { campoPorId } from '@/entities/campos'
import { fechaHora, AHORA } from '@/entities/reloj'
import { Panel, Chip } from '@/shared/ui/primitivas'
import { DatoInvalido } from '@/shared/ui/Prioridad'
import { Lectura } from '@/shared/ui/Lectura'
import { n1, plural } from '@/shared/lib/formato'
import { useUsuarios } from '@/shared/api/usuarios'

const SINCRONIZADO = new Date(AHORA.getTime() - 2 * 60_000)
const NUMERO_OPERACION = '+57 601 555 0100'

/** Los sistemas de la empresa con que habla TRIM, además de los bordes del
 *  campo: SAP PM (avisos de ida; órdenes, horas y repuestos de vuelta) y
 *  WhatsApp Business (avisos y respuestas). Lo que viaja en cada sentido es
 *  el contrato (CONTRATO.md · SAP PM y WhatsApp). */
export function Integraciones({ campoId }: { campoId: string }) {
  const usuarios = useUsuarios()
  const { avisos, ordenes } = useSap([campoId])
  const mensajes = useMensajes([campoId])
  const flota = useEquiposSap(campoId)
  const deTrim = avisos.filter(a => a.origen === 'trim').length
  const abiertas = ordenes.filter(o => o.estado !== 'TECO').length
  const horas = ordenes.reduce((a, o) => a + o.horasReales, 0)
  const materiales = new Set(flota.flatMap(f => f.repuestos.map(r => r.material))).size
  const ejemplo = flota[0] ? { equipo: flota[0].equipo, ...flota[0].identidad } : undefined
  const clases = [...new Map(flota.map(f => f.catalogo).filter(c => !!c).map(c => [c!.clase, c!])).values()]
  // «Hoy» son las últimas 24 h del reloj del PLC, para los mensajes y para las respuestas.
  const desdeHoy = AHORA.getTime() - 24 * 3_600_000
  const deHoy = mensajes.filter(m => new Date(m.hora).getTime() >= desdeHoy)
  // Enviado es lo que salió; lo que no se pudo enviar se cuenta aparte, no se suma ni se calla.
  const hoy = deHoy.filter(m => !m.noEnviado).length, sinEnviar = deHoy.filter(m => m.noEnviado).length
  // Respuestas por WhatsApp de las paradas de este campo que llegaron hoy: las
  // de la historia no son de hoy aunque vengan por el mismo canal.
  const respuestas = usePreguntas([campoId]).filter(p => p.causa.declarado?.canal === 'whatsapp' && new Date(p.causa.declarado.hora).getTime() >= desdeHoy).length
  const conAlertas = usuarios.filter(u => recibeAlertas(u, campoId)).length

  return (
    <Panel className="mb-2.5" titulo="SISTEMAS DE LA EMPRESA" extra={`${campoPorId(campoId).nombre} · sincronizado ${fechaHora(SINCRONIZADO)}`}>
      <Lectura>
        Además de los bordes que leen los PLC, TRIM habla con dos sistemas de la empresa. A SAP le
        manda los avisos con su evidencia y de SAP lee las órdenes, las horas y los repuestos: las
        órdenes las crea el planeador en SAP, no TRIM. Por WhatsApp avisa a quien tiene que actuar y
        recibe la respuesta.
      </Lectura>
      <div className="mt-2 grid items-start gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))]">
        <section className="rounded border border-[var(--linea2)] p-3 text-[11.5px]" aria-label="SAP">
          <header className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <b className="text-[13px]">SAP S/4HANA · Mantenimiento (PM)</b><Chip>conectado</Chip>
          </header>
          <Fila titulo="TRIM → SAP · avisos con evidencia" valor={`${deTrim} desde la puesta en marcha`} pie="M1 solicitud (una parte avisa) · M2 avería (el equipo paró)" />
          <Fila titulo="SAP → TRIM · órdenes y estados" valor={`${plural(ordenes.length, 'orden', 'órdenes')} · ${plural(abiertas, 'abierta', 'abiertas')}`} pie="creada, liberada, en ejecución, cerrada" />
          <Fila titulo="SAP → TRIM · horas confirmadas" valor={`${n1(horas)} h`} pie="reparación activa de cada orden" />
          <Fila titulo="SAP → TRIM · repuestos críticos" valor={plural(materiales, 'material', 'materiales')} pie="stock de libre utilización en la bodega del campo" />
          <Fila titulo="Equipos de alto impacto asociados PLC ↔ SAP" valor={`${flota.length} de ${flota.length}`}
            pie={ejemplo ? `${ejemplo.equipo} → equipo ${ejemplo.equipoSap} · ${ejemplo.ubicacion}` : undefined} />
          <h4 className="font-cond mb-1 mt-2.5 text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]">CATÁLOGOS DE DAÑO · POR CLASE DE EQUIPO</h4>
          {clases.length === 0 && <p className="text-[var(--tinta2)]">Este campo no tiene equipos de alto impacto.</p>}
          {clases.map(c => (
            <p key={c.clase} className="flex flex-wrap justify-between gap-x-3 border-b border-[var(--linea2)] py-1 last:border-0">
              <span>{NOMBRE_CLASE_EQUIPO[c.clase as ClaseCatalogo]}</span>
              <span className="tabular text-[var(--tinta2)]">{c.partes.length} partes (cat. B) · {new Set(c.partes.flatMap(x => x.modos)).size + 1} daños (cat. C) · {CAUSAS_RAIZ.length} causas (cat. 5)</span>
            </p>
          ))}
        </section>

        <section className="rounded border border-[var(--linea2)] p-3 text-[11.5px]" aria-label="WhatsApp">
          <header className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <b className="text-[13px]">WhatsApp Business · cuenta de empresa</b><Chip>conectado</Chip>
          </header>
          <Fila titulo="Número de la operación" valor={NUMERO_OPERACION} pie="cuenta verificada por Meta" />
          <Fila titulo="Respuestas" valor={`webhook activo · ${plural(respuestas, 'respuesta', 'respuestas')} hoy`} pie="un número del 0 al 9, o el texto con «0»" />
          <Fila titulo="Últimas 24 h" valor={<>{plural(hoy, 'mensaje enviado', 'mensajes enviados')}{sinEnviar > 0 && <span className="inline-flex items-baseline gap-1">{' · '}<DatoInvalido etiqueta="Mensajes no enviados" tamano={10} />{plural(sinEnviar, 'sin enviar', 'sin enviar')}: un dato no cabía en su plantilla</span>}</>} pie={`${plural(conAlertas, 'persona recibe', 'personas reciben')} alertas en este campo`} />
          <h4 className="font-cond mb-1 mt-2.5 text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]">PLANTILLAS APROBADAS · UTILIDAD</h4>
          {Object.entries(PLANTILLAS).map(([regla, t]) => (
            <div key={regla} className="border-b border-[var(--linea2)] py-1 last:border-0">
              <span className="flex flex-wrap justify-between gap-x-3"><span className="font-mono text-[10.5px]">{t.nombre}</span><small className="text-[var(--tinta2)]">aprobada</small></span>
              <small className="block text-[10.5px] text-[var(--tinta3)]">{t.cuerpo}</small>
            </div>
          ))}
        </section>
      </div>
    </Panel>
  )
}

function Fila({ titulo, valor, pie }: { titulo: string; valor: ReactNode; pie?: string }) {
  return (
    <div className="border-b border-[var(--linea2)] py-1.5 last:border-0">
      <span className="flex flex-wrap justify-between gap-x-3"><span className="text-[var(--tinta2)]">{titulo}</span><b className="tabular">{valor}</b></span>
      {pie && <small className="block text-[10.5px] text-[var(--tinta3)]">{pie}</small>}
    </div>
  )
}

