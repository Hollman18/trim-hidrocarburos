import { useApp, useRol } from '@/app/store'
import { useTuberiaAgua } from '@/shared/api/choke'
import { pantallaVisible } from '@/shared/config/producto'
import { Boton } from '@/shared/ui/primitivas'
import { Info } from '@/shared/ui/Info'
import { n0, n1 } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { textoColchon } from '@/widgets/bombas/comun'
import { lista } from './palabras'
import { AYUDA_ACUATOSOS } from './Agua'

/** El colchón como lo dice la lista de «Si falla hoy»: bajo una hora, en minutos. */

/** «LA TUBERÍA DEL AGUA, HOY» en corto, dentro de la ficha de una bomba de
 *  reinyección (U2 §5.6 y §9.6; B-01): lo que entra, lo que caben las bombas
 *  que siguen, el tanque y si su nivel sube; las frases del colchón; y, con una
 *  bomba ya parada, en qué orden cerrar si para OTRA (la que sigue en riesgo),
 *  no solo los pozos que ya cerró la parada. Es para quien opera: el supervisor
 *  no tiene la pantalla Agua, y aquí está lo que necesita. Todo lo calcula el
 *  motor (`useTuberiaAgua`: `siParaOtra` y `frases`). */
export function AguaHoy({ campoId, bomba, className }: { campoId: string; bomba: string; className?: string }) {
  const a = useTuberiaAgua(campoId)
  const rol = useRol()
  const setPantalla = useApp(s => s.setPantalla), abrirEquipo = useApp(s => s.abrirEquipo)
  const tren = a.tramos.find(x => x.tramo === 'bombas')?.bombas ?? []
  const esta = tren.find(b => b.id === bomba)
  if (!esta || esta.papel !== 'disposicion' || a.campoDeGas) return null
  const tk = a.tramos.find(x => x.tramo === 'tanques')?.tanques?.[0]
  const o = a.siParaOtra
  const sube = o ? o.entraBpd > o.cabenBpd : false
  // Para quien opera, las frases del colchón; la del empate de las capacidades es de ingeniería (está en Agua).
  const frases = a.frases.filter(f => !/exactamente lo mismo|casi iguales/.test(f))
  const veAgua = rol.pantallas.includes('agua') && pantallaVisible('agua')
  const rotulo = 'w-[64px] shrink-0 text-[14px] font-semibold text-[var(--tinta2)]'
  return (
    <section aria-label="La tubería del agua, hoy" data-agua-hoy={campoId}
      className={cn('rounded-[14px] bg-[var(--panel2)] p-3 text-[14px] sm:p-4', className)}>
      <h3 className="mb-1.5 text-[15px] font-semibold text-[var(--tinta)]">La tubería del agua, hoy</h3>
      {o && (
        <div className="grid gap-0.5" data-hoy-agua>
          <p className="flex items-baseline gap-2"><span className={rotulo}>Entra</span><b className="tabular">{n0(o.entraBpd)}</b><small className="text-[var(--tinta3)]">bbl/d de agua</small></p>
          <p className="flex flex-wrap items-baseline gap-x-2"><span className={rotulo}>Caben</span><b className="tabular">{n0(o.cabenBpd)}</b><small className="text-[var(--tinta3)]">({o.enMarcha.join(' + ')})</small></p>
          {tk && tk.nivelPct !== undefined && (
            <div className="flex flex-wrap items-center gap-x-2">
              <span className={rotulo}>Tanque</span>
              <b className="tabular">{n1(tk.nivelPct)} %</b>
              <span aria-hidden className="relative inline-block h-2.5 w-28 overflow-hidden rounded-sm border border-[var(--tinta3)] bg-[var(--panel2)]">
                <i className="absolute inset-y-0 left-0 block bg-[var(--dato-3)]" style={{ width: `${Math.min(100, tk.nivelPct)}%` }} />
                <i className="absolute inset-y-0 block border-l-2 border-[var(--tinta)]" style={{ left: `${tk.altoAlto * 100}%` }} />
              </span>
              <small className="text-[var(--tinta2)]">alto-alto {n0(tk.altoAlto * 100)} %</small>
            </div>
          )}
          <p className="mt-0.5 font-medium">
            {sube ? `El nivel sube: entra más de lo que caben ${lista(o.enMarcha)}.` : `El nivel no sube: ${lista(o.enMarcha)} ${o.enMarcha.length === 1 ? 'toma' : 'toman'} lo que entra.`}
          </p>
        </div>
      )}
      <ul className={cn('space-y-0.5 leading-snug', o && 'mt-2 border-t border-[var(--linea2)] pt-2')} data-frases-agua>
        {frases.map(f => <li key={f}>{f}</li>)}
      </ul>
      {o && o.pasos.length > 0 && (
        <div className="mt-2 border-t border-[var(--linea2)] pt-2" data-orden-si-para-otra>
          <p className="flex flex-wrap items-center gap-x-1 font-semibold">
            Si para otra bomba ahora, cierre primero los más acuatosos:<Info titulo="Los más acuatosos" texto={AYUDA_ACUATOSOS} />
          </p>
          <p className="tabular">
            {o.pasos.map((x, i) => <span key={x.pozo}>{i > 0 ? ' · ' : ''}<b>{x.pozo}</b>{x.fraccion < 0.999 ? ` al ${n0(x.fraccion * 100)} %` : ''}</span>)}
          </p>
          <p className="text-[var(--tinta2)]">
            → se dejan de producir <b className="tabular text-[var(--tinta)]">{n0(o.crudoBpd)}</b> bbl/d de crudo (parejo, <span className="tabular">{n0(o.crudoParejoBpd)}</span>)
            {o.colchonH !== undefined ? `, después de ${textoColchon(o.colchonH)} de colchón` : ''}.
          </p>
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {veAgua && <Boton variante="chico" className="min-h-12 sm:min-h-0" onClick={() => { abrirEquipo(null); setPantalla('agua') }}>Ver la tubería del agua</Boton>}
      </div>
    </section>
  )
}
