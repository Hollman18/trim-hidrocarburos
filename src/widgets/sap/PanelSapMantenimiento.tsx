import { useApp, useAmbito, useRango } from '@/app/store'
import { useSap, useHorasMantenimiento, useRelojes } from '@/shared/api/sap'
import { NOMBRE_CLASE, NOMBRE_ESTADO_ORDEN } from '@/entities/sap'
import { campoPorId } from '@/entities/campos'
import { fechaCorta, horasEntre, AHORA } from '@/entities/reloj'
import { Panel } from '@/shared/ui/primitivas'
import { Lectura } from '@/shared/ui/Lectura'
import { FueraDeMeta } from '@/shared/ui/Prioridad'
import { n0, n1, plural } from '@/shared/lib/formato'
import { fmtHoras } from '@/widgets/bombas/comun'
import { TresRelojes } from './TresRelojes'
import { useUsuarios } from '@/shared/api/usuarios'

/** Lo de SAP que necesita quien responde por el mantenimiento: las horas de
 *  proactivo contra correctivo (el indicador que más pesa), los tres relojes
 *  de las fallas y lo que está abierto. Todo viene de SAP; el reloj total de
 *  la falla, del PLC. */
export function PanelSapMantenimiento() {
  const ambito = useAmbito(); const rango = useRango()
  const setCampo = useApp(s => s.setCampo), abrirEquipo = useApp(s => s.abrirEquipo); const usuarios = useUsuarios()
  const ids = ambito.campos.map(c => c.id)
  const { avisos, ordenes } = useSap(ids)
  const horas = useHorasMantenimiento(ids, rango.desde, rango.hasta)
  const reloj = useRelojes(ids, rango.desde, rango.hasta)
  const sinOrden = avisos.filter(a => !a.cerrado && !a.orden)
  const abiertas = ordenes.filter(o => o.estado !== 'TECO')
  const abrir = (c: string, eq: string) => { setCampo(c); abrirEquipo(eq, false) }
  const donde = (c: string) => (ambito.global ? ` · ${campoPorId(c).nombre}` : '')

  return (
    <div className="mt-2.5 grid items-start gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
      <Panel titulo="HORAS DE MANTENIMIENTO · SAP" extra={rango.nombre.toLowerCase()}>
        <Lectura>
          Horas confirmadas en las órdenes de SAP cerradas en el período: preventivo y predictivo (lo que
          se hace antes de que falle) contra correctivo (lo que se hace porque falló). Si el proactivo no
          sube, las fallas no bajan.
        </Lectura>
        {horas.porcentaje === undefined ? (
          <p className="text-[12px] text-[var(--tinta2)]">No hay órdenes cerradas en {rango.nombre.toLowerCase()}. Escoja un período cerrado (el mes anterior, por ejemplo) para ver las horas.</p>
        ) : (
          <>
            <p className="flex flex-wrap items-baseline gap-x-2">
              <b className="tabular text-[24px] leading-none">{n0(horas.porcentaje)} %</b>
              <span className="text-[12px] text-[var(--tinta2)]">de las horas fue preventivo o predictivo · sin meta configurada</span>
            </p>
            <div className="mt-1.5 flex h-2 overflow-hidden rounded-sm border border-[var(--linea2)] bg-[var(--panel2)]">
              <i className="block h-full bg-[var(--dato-1)]" style={{ width: `${horas.porcentaje}%` }} />
            </div>
            <p className="tabular mt-1 text-[11px] text-[var(--tinta2)]">
              {n1(horas.proactivo)} h preventivo y predictivo · {n1(horas.correctivo)} h correctivo · {plural(horas.ordenes, 'orden', 'órdenes')}
            </p>
          </>
        )}
        {reloj && (
          <>
            <h3 className="font-cond mb-1 mt-3 text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]">LOS TRES RELOJES DE UNA FALLA · PROMEDIO DE {reloj.fallas}</h3>
            <TresRelojes reloj={reloj} />
          </>
        )}
      </Panel>

      <Panel titulo="ABIERTO EN SAP" extra={`ahora · ${plural(sinOrden.length, 'aviso sin orden', 'avisos sin orden')} · ${plural(abiertas.length, 'orden abierta', 'órdenes abiertas')}`}>
        <Lectura>Los avisos que TRIM envió esperan a que el planeador cree la orden en SAP. Las órdenes abiertas, con su técnico.</Lectura>
        {sinOrden.length + abiertas.length === 0 && <p className="text-[12px] text-[var(--tinta2)]">Nada abierto en SAP para estos equipos.</p>}
        {sinOrden.map(a => {
          const h = horasEntre(new Date(a.creado), AHORA)
          return (
            <button key={a.numero} onClick={() => abrir(a.campoId, a.equipo)} className="flex w-full cursor-pointer items-start gap-2 border-b border-[var(--linea2)] py-1.5 text-left text-[11.5px] last:border-0 hover:bg-[var(--panel2)]">
              <FueraDeMeta si={a.prioridad === 1 && h > 4} tamano={10} />
              <span className="min-w-0 flex-1"><b>Aviso {a.numero}</b> · {a.equipo}{donde(a.campoId)}
                <small className="block text-[10.5px] text-[var(--tinta2)]">{a.descripcion} · hace {fmtHoras(h)}, sin orden</small></span>
            </button>
          )
        })}
        {abiertas.map(o => (
          <button key={o.numero} onClick={() => abrir(o.campoId, o.equipo)} className="flex w-full cursor-pointer items-start gap-2 border-b border-[var(--linea2)] py-1.5 text-left text-[11.5px] last:border-0 hover:bg-[var(--panel2)]">
            <span className="min-w-0 flex-1"><b>Orden {o.numero}</b> · {NOMBRE_CLASE[o.clase]} · {o.equipo}{donde(o.campoId)}
              <small className="block text-[10.5px] text-[var(--tinta2)]">{o.descripcion} · {NOMBRE_ESTADO_ORDEN[o.estado]}{o.liberada ? `${o.estado === 'REL' ? '' : ' · liberada'} el ${fechaCorta(new Date(o.liberada))}` : ''}{o.liberada ? ' a ' : ' · asignada a '}{usuarios.find(u => u.id === o.tecnico)?.nombre ?? `la cuadrilla ${o.puesto}`}</small></span>
          </button>
        ))}
      </Panel>
    </div>
  )
}
