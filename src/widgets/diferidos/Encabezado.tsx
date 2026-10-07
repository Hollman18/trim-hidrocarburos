import type { Libro, LineaBase } from '@/entities/libro'
import { FUENTE_POTENCIAL, FUENTE_REAL, conMeta, textoSinMeta } from '@/entities/libro'
import { FueraDeMeta } from '@/shared/ui/Prioridad'
import { Lectura } from '@/shared/ui/Lectura'
import { Tip } from '@/shared/ui/Tip'
import { n0, n1, usd } from '@/shared/lib/formato'
import { Rango, NOTA_DE_CALCULO, NOTA_SIMPLE } from './Rango'

const signo = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${n0(Math.abs(v * 100))} %`

/** El número que manda la pantalla: lo que no se produjo en el período, con
 *  su rango de tolerancia (todos los roles), cuánto tiene causa probada, y
 *  contra qué se compara: el máximo que firmó el gerente y los tres meses
 *  anteriores como contexto. */
export function Encabezado({ lb, base, nombrePeriodo, ambito, simple = false }: {
  lb: Libro; base?: LineaBase; nombrePeriodo: string; ambito: string
  /** Para quien decide: sin la línea de identificación (el rango sí va). */
  simple?: boolean
}) {
  const tol = lb.diferido > 0 ? lb.tolerancia / lb.diferido : 0
  const dinero = lb.valorUsd !== undefined ? usd(lb.valorUsd) : undefined
  const difDia = lb.brecha / Math.max(1 / 24, lb.meta.dias)
  // Sin meta firmada en algún campo no hay máximo del total contra qué marcar.
  const hayMeta = conMeta(lb.meta), sinMeta = textoSinMeta(lb.meta, lb.porCampo.length > 1)
  const sobreMax = hayMeta && difDia > lb.meta.diferidoDia
  const provisional = lb.fa.some(f => !f.publicado)
  const altoPct = lb.diferido > 0 ? (lb.altoImpacto / lb.diferido) * 100 : 0

  return (
    <Tip titulo="Barriles diferidos"
      pista="Potencial (pruebas × factor de asignación) menos lo que midió el punto de medición oficial. Cada barril lleva su evento, su causa y los tags que la prueban."
      filas={[
        ['Potencial', `${n0(lb.potencial)} bbl`], ['Real medido', `${n0(lb.real)} bbl`],
        ['Diferidos', `${n0(lb.brecha)} bbl`], ['Σ de los eventos', `${n0(lb.diferido)} bbl ±${n1(tol * 100)} %`],
        ['Por señal', `${n0(lb.identificado)} bbl`], ['Declarado', `${n0(lb.declarado)} bbl`], ['Sin identificar', `${n0(lb.pendiente)} bbl`],
        ...(lb.aproximado > 0 ? [['Frecuencia reducida (aprox.)', `${n0(lb.aproximado)} bbl`] as [string, string]] : []),
        ['Máximo firmado', hayMeta ? `${n0(lb.meta.diferido)} bbl a la fecha · ${n0(lb.meta.diferidoTotal)} en el período completo` : sinMeta],
        ['Período', nombrePeriodo], ['Cierre', provisional ? 'provisional' : 'publicado']]}
      className="mb-2.5 flex flex-wrap items-center gap-x-6 gap-y-3 rounded border border-[var(--linea)] bg-[var(--panel)] p-4 shadow-[var(--sombra)]">
      <span className="min-w-0">
        <b className="tabular block text-[40px] leading-none">{n0(lb.brecha)}</b>
        <small className="block text-[11.5px] text-[var(--tinta3)]">
          barriles diferidos · {ambito} · {nombrePeriodo}{provisional ? ' · provisional' : ''}
        </small>
        <Rango lb={lb} plano />
        {!simple && (
          <small className="tabular mt-0.5 block text-[11px] text-[var(--tinta2)]">
            ±{n0(lb.tolerancia)} bbl ({n1(tol * 100)} %, Res. 40236) · {n0(Math.round(lb.diferido) - Math.round(lb.pendiente))} con causa · {n0(lb.pendiente)} sin identificar
          </small>
        )}
        <Lectura>
          Lo que el campo no produjo, pudiendo: el potencial ({FUENTE_POTENCIAL.toLowerCase()}) menos
          lo real ({FUENTE_REAL.toLowerCase()}). Cada barril sale de un evento del controlador de un
          pozo, con la hora del PLC, y se le carga al equipo que lo causó. {simple ? NOTA_SIMPLE : NOTA_DE_CALCULO}
        </Lectura>
      </span>
      <span className="hidden h-12 w-px bg-[var(--linea)] sm:block" />
      <span className="grid flex-1 gap-x-6 gap-y-2.5 [grid-template-columns:repeat(auto-fit,minmax(118px,1fr))]">
        <Cifra rotulo="valor" valor={dinero ? dinero.valor : 'sin precio'} unidad={dinero?.unidad}
          pie={!dinero ? 'falta el precio neto en la configuración'
            : lb.valorCampos.con < lb.valorCampos.total ? `${lb.valorCampos.con} de ${lb.valorCampos.total} campos con precio en todo el período` : 'con el precio neto configurado'} />
        <Cifra rotulo="diferido contra el máximo firmado" valor={n0(difDia)} unidad="bbl/d" alerta={sobreMax}
          pie={hayMeta ? `máximo ${n0(lb.meta.diferidoDia)} bbl/d · ${n0(lb.meta.diferidoTotal)} bbl en ${lb.meta.diasTotal > lb.meta.dias + 0.01 ? 'el mes completo' : 'el período'}` : sinMeta} />
        <Cifra rotulo="equipos de alto impacto" valor={n0(altoPct)} unidad="%"
          pie={`${n0(lb.altoImpacto)} bbl de reinyección y electrosumergibles`} />
        <Cifra rotulo={base ? `frente a ${base.nombre}` : 'frente a la base'}
          valor={base ? signo(base.cambio) : '—'}
          pie={base ? `${n0(base.periodoDia)} bbl/d · antes ${n0(base.baseDia)} bbl/d` : 'no hay tres meses antes'} />
      </span>
    </Tip>
  )
}

function Cifra({ rotulo, valor, unidad, pie, alerta }: {
  rotulo: string; valor: string; unidad?: string; pie?: string; alerta?: boolean
}) {
  return (
    <span className="min-w-0">
      <b className="tabular block text-[18px] leading-none">
        <FueraDeMeta si={alerta} tamano={11} />{valor}
        {unidad && <span className="ml-1 text-[10.5px] font-medium text-[var(--tinta3)]">{unidad}</span>}
      </b>
      <small className="mt-0.5 block text-[10.5px] text-[var(--tinta3)]">{rotulo}</small>
      {pie && <small className="block text-[10px] leading-snug text-[var(--tinta2)]">{pie}</small>}
    </span>
  )
}
