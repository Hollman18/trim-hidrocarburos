import type { MesResumen } from '@/shared/api/diferidos'
import { useMedicionOficial } from '@/shared/api/medicion'
import { campoPorId } from '@/entities/campos'
import { Tendencia } from '@/shared/ui/scada'
import { Lectura } from '@/shared/ui/Lectura'
import { MarcaCondicion } from '@/shared/ui/Prioridad'
import { n0, n3 } from '@/shared/lib/formato'
import { estadoFactor } from './publicacion'
import { useAncho } from '@/widgets/resultados/ancho'

/** El factor de asignación de un campo mes a mes, contra la banda que acepta la Res. 40236
 *  (Fig. 10.2), con el kit SCADA (la tendencia con su banda normal). Es el control de que las
 *  pruebas y la medición oficial cuentan la misma historia: fuera de banda, el libro no se publica.
 *  La escala sale de la banda regulatoria (nunca de la lectura). Fuera de banda: la marca de aviso
 *  y el mes por su nombre; sin °API o sin fiscal publicado la banda no se puede verificar y se dice
 *  (no está fuera: falta con qué compararlo). */
export function Factor({ serie, campoId }: { serie: MesResumen[]; campoId: string; desde?: Date; hasta?: Date }) {
  const banda = useMedicionOficial(campoId).banda
  const [ref, ancho] = useAncho(440)
  const lo = Math.min(0.75, 1 - banda.valor - 0.05), hi = Math.max(1.25, 1 + banda.valor + 0.05)
  const filas = serie.map(m => ({ m, f: m.libro.fa.find(x => x.campoId === campoId) }))
  const estados = filas.map(({ m, f }) => (f ? estadoFactor(m.libro, f) : null))
  const fuera = filas.filter((_, i) => estados[i] === 'fuera').map(x => x.m.nombre)
  const sinVerificar = filas.filter((_, i) => estados[i] === 'sin-verificar').map(x => x.m.nombre)
  const ultimo = filas.findLast(x => x.f)
  const ultimoFuera = ultimo ? estados[filas.indexOf(ultimo)] === 'fuera' : false
  return (
    <>
      <div ref={ref} className="w-full" data-factor={campoId}>
        <Tendencia titulo={`Factor de asignación · ${campoPorId(campoId).nombre}`} ventana={`${serie.length} meses`} unidad="" decimales={2}
          ancho={Math.max(240, ancho)} alto={120} escala={{ min: lo, max: hi, firmada: true }} banda={[1 - banda.valor, 1 + banda.valor]}
          estado={ultimoFuera ? 'anormal' : 'normal'} condicion={ultimoFuera ? 'aviso' : undefined}
          ejeX={serie.length ? [serie[0]!.corto.toUpperCase(), serie.at(-1)!.corto.toUpperCase()] : undefined}
          series={[{ nombre: 'Factor', valores: filas.map(x => x.f?.fa ?? null) }]} />
      </div>
      <p className="mt-1.5 text-[14px] text-[var(--tinta2)]" data-factor-ultimo="">
        {ultimo?.f ? <>{ultimo.m.nombre}: <b className="tabular-nums text-[var(--tinta)]">{n3(ultimo.f.fa)}</b> · banda ±{n0(banda.valor * 100)} %</> : 'Sin factor todavía.'}
      </p>
      {fuera.length > 0 && <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[14px] text-[var(--tinta)]" data-fuera-de-banda=""><MarcaCondicion c="aviso" tamano={14} decorativa />Fuera de la banda: {fuera.join(', ')}</p>}
      {sinVerificar.length > 0 && <p className="mt-1 text-[14px] text-[var(--tinta2)]">Sin verificar (sin °API o sin fiscal publicado): {sinVerificar.join(', ')}</p>}
      <Lectura>
        Factor = producción fiscal del mes ÷ lo que dicen las pruebas por las horas que cada pozo
        produjo. Si las pruebas y el punto de medición oficial cuentan la misma historia, el factor
        queda cerca de 1. La franja es la banda que acepta la regulación para este crudo ({banda.fuente}).
      </Lectura>
    </>
  )
}
