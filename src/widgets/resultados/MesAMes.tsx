import type { VistaResultados } from '@/shared/api/resultados'
import { Tendencia } from '@/shared/ui/scada'
import { Tarjeta } from './piezas'
import { n0 } from './cifras'
import { useAncho } from './ancho'

/** «Diferido por día, mes a mes» con el kit SCADA (kit-scada.md §2: la tendencia). Los 13 meses
 *  en una línea continua (todo lo diferido por día) y una discontinua (lo de alto impacto), contra
 *  la raya del máximo firmado. La escala sale del máximo firmado (el doble), nunca de la lectura:
 *  sin máximo firmado dice «escala provisional». Se dibuja al ancho medido: ningún rótulo baja de
 *  12 px. Dónde se trabó cada barril ya no se parte aquí: va en el balance, por tramo, con su
 *  trazabilidad. El período se escoge en la cabecera. */
export function MesAMes({ v, className }: { v: VistaResultados; className?: string }) {
  const [ref, ancho] = useAncho(560)
  const { meses, actualBpd, nombreActual, maximoBpd } = v.mesAMes
  const mayor = Math.max(1, ...meses.map(m => m.totalBpd))
  const firmada = maximoBpd !== null && maximoBpd > 0
  // La escala: dos veces el máximo firmado (cabe lo normal y lo que se pasa); sin máximo, provisional.
  const tope = firmada ? Math.max(maximoBpd * 2, maximoBpd) : redondear(mayor * 1.2)
  const sobre = meses.filter(m => m.sobre).map(m => m.nombre)
  return (
    <Tarjeta titulo="Diferido por día, mes a mes" className={className} data-mes-a-mes=""
      extra={actualBpd !== null && <>{nombreActual}: <b className="text-[var(--tinta)]">{n0(actualBpd)}</b> bbl/d</>}>
      <div ref={ref} className="mt-3 w-full">
        <Tendencia titulo="Diferido por día" ventana={`${meses.length} meses`} unidad="bbl/d" ancho={Math.max(240, ancho)} alto={132}
          escala={{ min: 0, max: tope, firmada }} alarmas={firmada ? [maximoBpd] : []}
          ejeX={meses.length ? [meses[0]!.rotulo, meses.at(-1)!.rotulo] : undefined}
          series={[
            { nombre: 'Todo lo diferido', valores: meses.map(m => m.totalBpd) },
            { nombre: 'Lo de alto impacto', valores: meses.map(m => m.altoBpd), trazo: 'discontinuo' },
          ]} />
      </div>
      <p className="mt-1.5 text-[14px] text-[var(--tinta2)]" data-leyenda-mes-a-mes="">
        Continua: todo · discontinua: lo de alto impacto{firmada ? ` · raya: máximo firmado (${n0(maximoBpd)})` : ''}
      </p>
      {sobre.length > 0 && <p className="mt-1 text-[14px] text-[var(--tinta2)]" data-sobre-maximo={sobre.length}>Pasó el máximo: {sobre.join(', ')}.</p>}
      <p className="sr-only">{v.mesAMes.aria}</p>
    </Tarjeta>
  )
}

/** Un tope redondo para la escala provisional: 1, 2 o 5 por una potencia de 10. */
function redondear(x: number) {
  const p = 10 ** Math.floor(Math.log10(Math.max(1, x)))
  return [1, 2, 5, 10].map(k => k * p).find(k => k >= x) ?? x
}
