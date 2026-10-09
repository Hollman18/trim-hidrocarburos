import type { ReactNode } from 'react'
import type { Libro } from '@/entities/libro'
import { FUENTE_POTENCIAL, FUENTE_REAL } from '@/entities/libro'
import { campoPorId } from '@/entities/campos'
import { Panel, Boton, Chip } from '@/shared/ui/primitivas'
import { FueraDeMeta } from '@/shared/ui/Prioridad'
import { Lectura } from '@/shared/ui/Lectura'
import { Info } from '@/shared/ui/Info'
import { n0, n1, n3, plural } from '@/shared/lib/formato'
import { estadoFactor } from './publicacion'

/** El cuadre del período contra la medición oficial y la cadena de custodia
 *  de cada número. Lo que no se puede probar se muestra, no se reparte: cada
 *  hueco (sin prueba, prueba estimada, corte de agua de laboratorio, factor
 *  fuera de banda) queda a la vista en corto, con su porqué en el ⓘ. Si el
 *  libro se puede publicar lo dice el sello de arriba de cada pantalla
 *  (`SelloPublicacion`), no el cuadre. */
export function Cuadre({ lb, onIdentificar }: { lb: Libro; onIdentificar?: () => void }) {
  const tol = lb.diferido > 0 ? lb.tolerancia / lb.diferido : 0
  const parte = (v: number) => lb.brecha > 0 ? Math.max(0, Math.min(100, (v / lb.brecha) * 100)) : 0
  // Los meses que no están dentro: fuera de banda (con su marca) o con la banda
  // sin verificar (sin marca: el factor puede estar bien, falta con qué compararlo).
  const faRaros = lb.fa.map(f => ({ f, estado: estadoFactor(lb, f) })).filter(x => x.estado !== 'dentro')
  const residuoRel = lb.brecha !== 0 ? Math.abs(lb.residuo / lb.brecha) : 0
  const custodiaCompleta = lb.custodia.sinPrueba.length + lb.custodia.estimados.length + lb.custodia.bswLaboratorio.length === 0

  return (
    <Panel titulo="CUADRE · MEDICIÓN OFICIAL">
      <Lectura>
        Potencial menos lo medido es lo que no se produjo. La suma de los eventos de los pozos tiene
        que dar lo mismo: en un mes entero, da exacto. Cada evento trae su causa: la de una señal
        o, si la señal no alcanza, la que declara el operario. Toque o pase el cursor por un ⓘ para
        ver de dónde sale cada cifra.
      </Lectura>
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 text-[12px]">
        <Fila k="Potencial" v={n0(lb.potencial)} info={<Info titulo="Potencial" texto={`${FUENTE_POTENCIAL}.`} />} />
        <Fila k="− Real medido" v={n0(lb.real)} info={<Info titulo="Real medido" texto={`${FUENTE_REAL}.`} />} />
        <Fila k="= No producido" v={n0(lb.brecha)} fuerte />
        <Fila k="Identificado por señal" v={n0(Math.round(lb.diferido) - Math.round(lb.declarado) - Math.round(lb.pendiente))} barra={parte(lb.identificado)} tono="var(--dato-1)"
          info={<Info titulo="Identificado por señal" texto={`Código del controlador, primera alarma del PLC, firma de las señales o programa aprobado. Tolerancia ±${n1(tol * 100)} % (Res. 40236).`} />} />
        <Fila k="Declarado por el operario" v={n0(lb.declarado)} barra={parte(lb.declarado)} tono="var(--dato-3)"
          info={<Info titulo="Declarado por el operario" texto="La señal no alcanzaba: lo respondió quien estaba en campo. Queda marcado." />} />
        <Fila k="Sin identificar" v={n0(lb.pendiente)} barra={parte(lb.pendiente)} tono="var(--tinta3)" rayada
          alerta={lb.motivos.some(m => m.codigo === 'sin-causa')}
          info={<Info titulo="Sin identificar" texto="Eventos que ninguna señal explica y nadie ha respondido todavía." />} />
        {residuoRel > 0.0005 && (
          <Fila k="Inventario entre días" v={n0(lb.residuo)}
            info={<Info titulo="Inventario entre días" texto="El período corta meses: el tanque de venta guarda de un día para otro. En el mes entero da cero." />} />
        )}
      </dl>

      <div className="mb-1 mt-3 flex flex-wrap items-center gap-x-1">
        <h3 className="font-cond text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]">FACTOR DE ASIGNACIÓN</h3>
        <Info titulo="Factor de asignación" texto="Banda de la Res. 40236, Fig. 10.2. Fuera de banda: revisar pruebas y medición antes de publicar." />
      </div>
      {faRaros.length === 0
        ? <p className="text-[11.5px] text-[var(--tinta2)]">{plural(lb.fa.length, 'mes-campo', 'meses-campo')} · <Chip>dentro de banda</Chip></p>
        : faRaros.map(({ f, estado }) => (
          <p key={`${f.campoId}${f.mes}`} className="flex flex-wrap items-center gap-x-1.5 text-[11.5px] text-[var(--tinta2)]">
            <FueraDeMeta si={estado === 'fuera'} tamano={10} />
            <span>{campoPorId(f.campoId).nombre} · {f.mes} · <b className="tabular text-[var(--tinta)]">{n3(f.fa)}</b></span>
            {estado === 'fuera' ? <Chip tono="fuerte">fuera de ±{n0(f.banda * 100)} %</Chip> : <Chip>banda sin verificar</Chip>}
          </p>
        ))}
      {lb.aproximado > 0 && (
        <p className="mt-1 flex flex-wrap items-center gap-x-1 text-[10.5px] text-[var(--tinta3)]">
          <span className="tabular">{n0(lb.aproximado)} bbl aproximados · frecuencia reducida</span>
          <Info titulo="Frecuencia reducida" texto="Pozos a frecuencia reducida: se calculan con la ley de afinidad (caudal proporcional a la frecuencia) y quedan fuera de la tolerancia." />
        </p>
      )}

      <h3 className="font-cond mb-1 mt-3 text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]">CADENA DE CUSTODIA</h3>
      <ul className="grid gap-1 text-[11px] text-[var(--tinta2)]">
        {lb.custodia.sinPrueba.length > 0 && (
          <li className="flex flex-wrap items-center gap-x-1.5"><FueraDeMeta si tamano={10} />
            <span><b className="text-[var(--tinta)]">Sin prueba:</b> {lb.custodia.sinPrueba.map(p => p.id).join(', ')}</span>
            <Info titulo="Sin prueba" texto="Su crudo llega al punto de medición pero nadie lo asigna: sube el factor del campo. No tiene diferido porque no se le inventa caudal." /></li>
        )}
        {lb.custodia.estimados.length > 0 && (
          <li className="flex flex-wrap items-center gap-x-1.5">
            <span><b className="text-[var(--tinta)]">Prueba estimada:</b> {lb.custodia.estimados.map(p => p.id).join(', ')}</span>
            <Info titulo="Prueba estimada" texto="Desde la electrosumergible, sin separador." /></li>
        )}
        {lb.custodia.bswLaboratorio.length > 0 && (
          <li className="flex flex-wrap items-center gap-x-1.5">
            <span><b className="text-[var(--tinta)]">Corte de agua de laboratorio:</b> {lb.custodia.bswLaboratorio.map(c => campoPorId(c).nombre).join(', ')}</span>
            <Info titulo="Corte de agua de laboratorio" texto="No viene de un analizador en línea: es manual en origen." /></li>
        )}
        {custodiaCompleta && <li>Pruebas instrumentadas y corte de agua en línea.</li>}
      </ul>

      {onIdentificar && lb.pendiente > 0 && (
        <Boton variante="principal" className="mt-2.5 w-full" onClick={onIdentificar}>Ir a Identificar</Boton>
      )}
    </Panel>
  )
}

function Fila({ k, v, fuerte, barra, tono, alerta, rayada, info }: {
  k: string; v: string; fuerte?: boolean; barra?: number; tono?: string; alerta?: boolean; rayada?: boolean
  /** El ⓘ con de dónde sale la cifra. */
  info?: ReactNode
}) {
  return (
    <>
      <dt className={`border-b border-[var(--linea2)] py-1.5 ${fuerte ? 'font-semibold' : ''}`}>
        <span className="flex flex-wrap items-center gap-x-1">{k}{info}</span>
        {barra !== undefined && (
          <span className="mt-1 block h-1.5 overflow-hidden rounded-sm bg-[var(--panel2)]">
            <i className="block h-full" style={{
              width: `${barra}%`,
              background: rayada ? `repeating-linear-gradient(45deg, ${tono}, ${tono} 2px, transparent 2px, transparent 4px)` : tono,
            }} />
          </span>
        )}
      </dt>
      <dd className={`tabular border-b border-[var(--linea2)] py-1.5 text-right ${fuerte ? 'text-[16px] font-bold' : 'font-semibold'}`}>
        <FueraDeMeta si={alerta} tamano={10} />{v}
      </dd>
    </>
  )
}
