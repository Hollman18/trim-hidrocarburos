import { useApp, useAmbito, useRango } from '@/app/store'
import { useSap, useHorasMantenimiento, useRelojes } from '@/shared/api/sap'
import { NOMBRE_CLASE, NOMBRE_ESTADO_ORDEN } from '@/entities/sap'
import { campoPorId } from '@/entities/campos'
import { fechaCorta, horasEntre, AHORA } from '@/entities/reloj'
import { Panel, Chip } from '@/shared/ui/primitivas'
import { Lectura } from '@/shared/ui/Lectura'
import { Info } from '@/shared/ui/Info'
import { Tip } from '@/shared/ui/Tip'
import { FueraDeMeta } from '@/shared/ui/Prioridad'
import { n0, n1, plural } from '@/shared/lib/formato'
import { fmtHoras } from '@/widgets/bombas/comun'
import { TresRelojes } from './TresRelojes'
import { useUsuarios } from '@/shared/api/usuarios'

/** Lo de SAP que necesita quien responde por el mantenimiento: las horas de
 *  proactivo contra correctivo (el indicador que más pesa), los tres relojes
 *  de las fallas y lo que está abierto. Todo viene de SAP; el reloj total de
 *  la falla, del PLC. TRIM no crea órdenes: manda avisos y lee las órdenes. */
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
  const fila = 'flex w-full cursor-pointer items-start gap-2 border-b border-[var(--linea2)] py-1.5 text-left text-[14px] last:border-0 hover:bg-[var(--panel2)]'
  const impresion = 'border-b border-[var(--linea2)] pb-1.5 last:border-0'

  return (
    <div className="mt-3 grid items-start gap-3 sm:mt-4 sm:gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr))]">
      {/* El período ya lo dice la cabecera: el panel no lo repite. */}
      <Panel titulo="Horas en SAP">
        <Lectura>
          Horas confirmadas en las órdenes de SAP cerradas en el período: preventivo y predictivo (lo que
          se hace antes de que falle) contra correctivo (lo que se hace porque falló). Si el proactivo no
          sube, las fallas no bajan. Los tres relojes: la barra es la parada total, partida en
          reparación activa y espera.
        </Lectura>
        {horas.porcentaje === undefined ? (
          // Dato que falta: corto a la vista, y el porqué y qué hacer en el ⓘ (sale en el papel).
          <p className="flex flex-wrap items-center gap-x-1 text-[14px] text-[var(--tinta2)]">
            Sin órdenes cerradas en el período
            <Info titulo="Sin órdenes cerradas" texto={`No hay órdenes cerradas en ${rango.nombre.toLowerCase()}. Escoja un período cerrado (el mes anterior, por ejemplo) para ver las horas.`} />
          </p>
        ) : (
          <>
            <p className="flex flex-wrap items-baseline justify-between gap-x-2">
              <span className="flex flex-wrap items-baseline gap-x-1.5">
                <b className="tabular text-[24px] leading-none">{n0(horas.porcentaje)} %</b>
                <span className="flex flex-wrap items-center gap-x-1 text-[13px] text-[var(--tinta2)]">preventivo o predictivo
                  <Info titulo="Mantenimiento proactivo" texto="De las horas confirmadas en las órdenes de SAP cerradas en el período, las de preventivo o predictivo (antes de que falle) contra las de correctivo (porque falló). Si el proactivo no sube, las fallas no bajan." />
                </span>
              </span>
              <small className="text-[13px] text-[var(--tinta3)]">sin meta configurada</small>
            </p>
            <div aria-hidden className="mt-1.5 flex h-2 overflow-hidden rounded-sm border border-[var(--linea2)] bg-[var(--panel2)]">
              <i className="block h-full bg-[var(--dato-1)]" style={{ width: `${horas.porcentaje}%` }} />
            </div>
            <p className="tabular mt-1 text-[13px] text-[var(--tinta2)]">
              {n1(horas.proactivo)} h proactivas · {n1(horas.correctivo)} h correctivas · {plural(horas.ordenes, 'orden', 'órdenes')}
            </p>
          </>
        )}
        {reloj && (
          <>
            <h3 className="mb-1 mt-3 text-[15px] font-semibold text-[var(--tinta)]">Tres relojes · promedio de {plural(reloj.fallas, 'falla', 'fallas')}</h3>
            <TresRelojes reloj={reloj} />
          </>
        )}
      </Panel>

      <Panel titulo="Abierto en SAP" extra={`ahora · ${plural(sinOrden.length, 'aviso', 'avisos')} · ${plural(abiertas.length, 'orden', 'órdenes')}`}>
        <Lectura>
          TRIM no crea órdenes: manda el aviso a SAP y el planeador crea la orden. Avisos: lo que TRIM
          envió y todavía no tiene orden. Órdenes: las abiertas, con su estado y su técnico. Toque o pase
          el cursor por una fila para ver la descripción.
        </Lectura>
        {sinOrden.length + abiertas.length === 0 && <p className="text-[14px] text-[var(--tinta2)]">Nada abierto en SAP.</p>}
        {sinOrden.map(a => {
          const h = horasEntre(new Date(a.creado), AHORA)
          return (
            <Tip key={a.numero} as="button" onClick={() => abrir(a.campoId, a.equipo)}
              titulo={`Aviso ${a.numero} · ${a.equipo}`} pista={a.descripcion} imprimir="pista" claseImpresion={impresion}
              filas={[['Enviado hace', fmtHoras(h)], ['Orden', 'sin orden todavía']]} className={`${fila} ${a.descripcion ? 'print:border-b-0' : ''}`}>
              <FueraDeMeta si={a.prioridad === 1 && h > 4} tamano={10} />
              <span className="min-w-0 flex-1"><b>Aviso {a.numero}</b> · {a.equipo}{donde(a.campoId)}
                <small className="flex flex-wrap items-center gap-x-1.5 text-[13px] text-[var(--tinta2)]">hace {fmtHoras(h)}<Chip>sin orden</Chip></small></span>
            </Tip>
          )
        })}
        {abiertas.map(o => {
          const quien = usuarios.find(u => u.id === o.tecnico)?.nombre ?? `cuadrilla ${o.puesto}`
          return (
            <Tip key={o.numero} as="button" onClick={() => abrir(o.campoId, o.equipo)}
              titulo={`Orden ${o.numero} · ${o.equipo}`} pista={o.descripcion} imprimir="pista" claseImpresion={impresion}
              filas={[['Clase', NOMBRE_CLASE[o.clase]], ['Estado', NOMBRE_ESTADO_ORDEN[o.estado]],
                ...(o.liberada ? [['Liberada', fechaCorta(new Date(o.liberada))] as [string, string]] : []), ['A cargo', quien]]}
              className={`${fila} ${o.descripcion ? 'print:border-b-0' : ''}`}>
              <span className="min-w-0 flex-1"><b>Orden {o.numero}</b> · {NOMBRE_CLASE[o.clase]} · {o.equipo}{donde(o.campoId)}
                <small className="block text-[13px] text-[var(--tinta2)]">{o.liberada ? `${o.estado === 'REL' ? '' : 'liberada '}${fechaCorta(new Date(o.liberada))} · ` : ''}{quien}</small></span>
              <Chip>{NOMBRE_ESTADO_ORDEN[o.estado]}</Chip>
            </Tip>
          )
        })}
      </Panel>
    </div>
  )
}
