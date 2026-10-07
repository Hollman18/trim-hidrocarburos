import type { Libro } from '@/entities/libro'
import { FUENTE_POTENCIAL, FUENTE_REAL } from '@/entities/libro'
import { campoPorId } from '@/entities/campos'
import { Panel, Boton } from '@/shared/ui/primitivas'
import { FueraDeMeta } from '@/shared/ui/Prioridad'
import { Lectura } from '@/shared/ui/Lectura'
import { n0, n1, n3 } from '@/shared/lib/formato'
import { publicacion } from './publicacion'

/** El cuadre del período contra la medición oficial y la cadena de custodia
 *  de cada número. Lo que no se puede probar se muestra, no se reparte. */
export function Cuadre({ lb, onIdentificar }: { lb: Libro; onIdentificar?: () => void }) {
  const tol = lb.diferido > 0 ? lb.tolerancia / lb.diferido : 0
  const parte = (v: number) => lb.brecha > 0 ? Math.max(0, Math.min(100, (v / lb.brecha) * 100)) : 0
  const faFuera = lb.fa.filter(f => !f.dentro)
  const residuoRel = lb.brecha !== 0 ? Math.abs(lb.residuo / lb.brecha) : 0

  return (
    <Panel titulo="CUADRE CONTRA LA MEDICIÓN OFICIAL">
      <Lectura>
        Potencial menos lo medido es lo que no se produjo. La suma de los eventos de los pozos tiene
        que dar lo mismo: en un mes entero, da exacto. Cada evento trae su causa; la que no sale de
        una señal se le pregunta al operario y queda marcada como declarada.
      </Lectura>
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 text-[12px]">
        <Fila k="Potencial" v={n0(lb.potencial)} pie={FUENTE_POTENCIAL} />
        <Fila k="− Real medido" v={n0(lb.real)} pie={FUENTE_REAL} />
        <Fila k="= No producido" v={n0(lb.brecha)} fuerte />
        <Fila k="Identificado por señal" v={n0(Math.round(lb.diferido) - Math.round(lb.declarado) - Math.round(lb.pendiente))} barra={parte(lb.identificado)} tono="var(--dato-1)"
          pie={`Código del controlador, primera alarma del PLC, firma de las señales o programa aprobado · ±${n1(tol * 100)} % (Res. 40236)`} />
        <Fila k="Declarado por el operario" v={n0(lb.declarado)} barra={parte(lb.declarado)} tono="var(--dato-3)"
          pie="La señal no alcanzaba: lo respondió quien estaba en campo. Queda marcado." />
        <Fila k="Sin identificar" v={n0(lb.pendiente)} barra={parte(lb.pendiente)} tono="var(--tinta3)" rayada
          alerta={lb.motivos.some(m => m.codigo === 'sin-causa')}
          pie="Eventos que ninguna señal explica y nadie ha respondido todavía" />
        {residuoRel > 0.0005 && (
          <Fila k="Inventario entre días" v={n0(lb.residuo)}
            pie="El período corta meses: el tanque de venta guarda de un día para otro. En el mes entero da cero." />
        )}
      </dl>

      <h4 className="font-cond mb-1 mt-3 text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]">FACTOR DE ASIGNACIÓN · RES. 40236, FIG. 10.2</h4>
      {faFuera.length === 0
        ? <p className="text-[11.5px] text-[var(--tinta2)]">{lb.fa.length === 1 ? 'El mes-campo del período está dentro de su banda.' : `Los ${lb.fa.length} meses-campo del período están dentro de su banda.`}</p>
        : faFuera.map(f => (
          <p key={`${f.campoId}${f.mes}`} className="flex items-start gap-1.5 text-[11.5px] text-[var(--tinta2)]">
            <FueraDeMeta si tamano={10} />
            <span>{campoPorId(f.campoId).nombre}, {f.mes}: <b className="tabular text-[var(--tinta)]">{n3(f.fa)}</b> fuera de ±{n0(f.banda * 100)} %. Revisar pruebas y medición antes de publicar.</span>
          </p>
        ))}
      {lb.aproximado > 0 && (
        <p className="mt-1 text-[10.5px] text-[var(--tinta3)]">
          {n0(lb.aproximado)} bbl son de pozos a frecuencia reducida: se calculan con la ley de afinidad
          (caudal proporcional a la frecuencia) y quedan fuera de la tolerancia.
        </p>
      )}

      <h4 className="font-cond mb-1 mt-3 text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]">CADENA DE CUSTODIA</h4>
      <ul className="grid gap-1 text-[11px] text-[var(--tinta2)]">
        {lb.custodia.sinPrueba.length > 0 && (
          <li className="flex items-start gap-1.5"><FueraDeMeta si tamano={10} />
            <span><b className="text-[var(--tinta)]">Sin prueba:</b> {lb.custodia.sinPrueba.map(p => p.id).join(', ')}. Su crudo llega al punto de medición pero nadie lo asigna: sube el factor del campo. No tiene diferido porque no se le inventa caudal.</span></li>
        )}
        {lb.custodia.estimados.length > 0 && (
          <li><b className="text-[var(--tinta)]">Prueba estimada</b> (desde la electrosumergible, sin separador): {lb.custodia.estimados.map(p => p.id).join(', ')}.</li>
        )}
        {lb.custodia.bswLaboratorio.length > 0 && (
          <li><b className="text-[var(--tinta)]">Corte de agua del laboratorio</b>, no de analizador en línea: {lb.custodia.bswLaboratorio.map(c => campoPorId(c).nombre).join(', ')}. Es manual en origen.</li>
        )}
        {lb.custodia.sinPrueba.length + lb.custodia.estimados.length + lb.custodia.bswLaboratorio.length === 0 && (
          <li>Todos los pozos con prueba instrumentada y el corte de agua con analizador en línea.</li>
        )}
      </ul>

      <p className="mt-2.5 flex items-start gap-1.5 text-[11.5px] text-[var(--tinta2)]">
        {publicacion(lb).estado === 'bloqueado' && <FueraDeMeta si tamano={11} />}
        <span>{publicacion(lb).texto}</span>
      </p>
      {onIdentificar && lb.pendiente > 0 && (
        <Boton variante="principal" className="mt-2.5 w-full" onClick={onIdentificar}>Ir a las paradas por identificar</Boton>
      )}
    </Panel>
  )
}

function Fila({ k, v, pie, fuerte, barra, tono, alerta, rayada }: {
  k: string; v: string; pie?: string; fuerte?: boolean; barra?: number; tono?: string; alerta?: boolean; rayada?: boolean
}) {
  return (
    <>
      <dt className={`border-b border-[var(--linea2)] py-1.5 ${fuerte ? 'font-semibold' : ''}`}>
        {k}
        {pie && <small className="block text-[10px] font-normal leading-snug text-[var(--tinta3)]">{pie}</small>}
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
