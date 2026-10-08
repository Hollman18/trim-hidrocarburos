import type { Libro, LineaBase } from '@/entities/libro'
import { FUENTE_POTENCIAL, FUENTE_REAL, conMeta, textoSinMeta } from '@/entities/libro'
import { campoPorId } from '@/entities/campos'
import { Lectura } from '@/shared/ui/Lectura'
import { Tip } from '@/shared/ui/Tip'
import { Info } from '@/shared/ui/Info'
import { BarraMeta } from '@/shared/ui/BarraMeta'
import { n0, n1, usd } from '@/shared/lib/formato'
import { Rango, NOTA_DE_CALCULO, NOTA_SIMPLE } from './Rango'
import { SelloPublicacion } from './Sello'

const signo = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${n0(Math.abs(v * 100))} %`

/** El número que manda la pantalla: lo que no se produjo en el período, con
 *  su rango de tolerancia (todos los roles), si el libro se puede publicar,
 *  cuánto vale y contra qué se compara: el máximo que firmó el gerente (una
 *  barra, no una frase) y los tres meses anteriores como contexto.
 *
 *  El período y el ámbito ya los dice la cabecera: aquí solo quedan en el
 *  papel, que no la imprime. Lo de alto impacto lo dice
 *  «Dónde bajarlo», en la misma pantalla. */
export function Encabezado({ lb, base, nombrePeriodo, ambito, simple = false }: {
  lb: Libro; base?: LineaBase; nombrePeriodo: string; ambito: string
  /** Para quien decide: sin la línea de identificación (el rango sí va). */
  simple?: boolean
}) {
  const tol = lb.diferido > 0 ? lb.tolerancia / lb.diferido : 0
  const dinero = lb.valorUsd !== undefined ? usd(lb.valorUsd) : undefined
  const sinPrecio = lb.sinPrecio.map(c => campoPorId(c).nombre)
  const parcial = dinero !== undefined && lb.valorCampos.con < lb.valorCampos.total
  const difDia = lb.brecha / Math.max(1 / 24, lb.meta.dias)
  // Sin meta firmada en algún campo no hay máximo del total contra qué marcar.
  const hayMeta = conMeta(lb.meta), sinMeta = textoSinMeta(lb.meta, lb.porCampo.length > 1)
  const sobreMax = hayMeta && difDia > lb.meta.diferidoDia
  const provisional = lb.fa.some(f => !f.publicado)
  const enCurso = lb.meta.diasTotal > lb.meta.dias + 0.01

  return (
    <section className="mb-2.5 rounded border border-[var(--linea)] bg-[var(--panel)] p-4 shadow-[var(--sombra)]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        {/* El período y el ámbito ya los dice la cabecera (también en el teléfono); la cabecera no sale en el papel, y aquí quedan para el papel. */}
        <small className="text-[11px] tracking-[.04em] text-[var(--tinta3)] hidden print:block">{ambito.toUpperCase()} · {nombrePeriodo.toUpperCase()}</small>
        <SelloPublicacion lb={lb} className="ml-auto" />
      </div>
      <div className="mt-1 flex flex-wrap items-start gap-x-8 gap-y-3">
        <span className="min-w-0">
          <Tip titulo="Barriles diferidos"
            pista="Potencial (pruebas × factor de asignación) menos lo que midió el punto de medición oficial. Cada barril lleva su evento, su causa y los tags que la prueban."
            filas={[
              ['Potencial', `${n0(lb.potencial)} bbl`], ['Real medido', `${n0(lb.real)} bbl`],
              ['Diferidos', `${n0(lb.brecha)} bbl`], ['Σ de los eventos', `${n0(lb.diferido)} bbl ±${n1(tol * 100)} % (Res. 40236)`],
              ['Por señal', `${n0(lb.identificado)} bbl`], ['Declarado', `${n0(lb.declarado)} bbl`], ['Sin identificar', `${n0(lb.pendiente)} bbl`],
              ...(lb.aproximado > 0 ? [['Frecuencia reducida (aprox.)', `${n0(lb.aproximado)} bbl`] as [string, string]] : []),
              ['Período', nombrePeriodo], ['Cierre', provisional ? 'provisional' : 'publicado']]}
            className="block">
            <b className="tabular block text-[40px] leading-none">{n0(lb.brecha)}</b>
            <small className="block text-[11.5px] text-[var(--tinta2)]">barriles diferidos</small>
          </Tip>
          <Rango lb={lb} corto className="block min-h-6 sm:min-h-0" />
          {!simple && <small className="tabular block text-[11px] text-[var(--tinta2)]">{n0(lb.pendiente)} sin identificar</small>}
        </span>
        <span className="flex min-w-[min(100%,280px)] flex-1 flex-wrap items-start gap-x-8 gap-y-3">
          <span className="min-w-[120px]">
            {/* Un hueco de precio nunca se calla: corto a la vista y entero en el ⓘ (y en el papel). «falta precio en»
                y no «sin»: el campo puede tener precio una parte del período, y esos días sí cuentan. */}
            <small className="flex flex-wrap items-center gap-x-1 text-[10.5px] text-[var(--tinta3)]">
              {!parcial ? 'valor' : sinPrecio.length ? `valor · falta precio en ${sinPrecio.join(', ')}` : `valor · ${lb.valorCampos.con} de ${lb.valorCampos.total} campos`}
              {!dinero && <Info titulo="Sin precio" texto="Falta el precio neto en la configuración." />}
              {parcial && <Info titulo="Valor" texto={`${lb.valorCampos.con} de ${lb.valorCampos.total} campos con precio en todo el período${sinPrecio.length ? `; sin contar los días sin precio de ${sinPrecio.join(', ')}` : ''}.`} />}
            </small>
            <b className="tabular block text-[20px] leading-none">
              {dinero ? dinero.valor : 'sin precio'}
              {dinero && <span className="ml-1 text-[11px] font-normal text-[var(--tinta3)]">{dinero.unidad}</span>}
            </b>
          </span>
          <span className="min-w-[min(100%,200px)] flex-1 sm:max-w-[340px]">
          <BarraMeta rotulo="diferido por día" valor={difDia} unidad="bbl/d" meta={hayMeta ? lb.meta.diferidoDia : undefined}
            rotuloMeta={hayMeta ? `máx. ${n0(lb.meta.diferidoDia)}` : sinMeta} tipoMeta="máximo" fuera={sobreMax}
            apoyo={base ? `${signo(base.cambio)} frente a ${base.nombre}` : 'sin base de comparación'}
            tip={{ titulo: 'Diferido por día', filas: [
              ['Máximo firmado', hayMeta ? `${n0(lb.meta.diferidoDia)} bbl/d` : sinMeta],
              ...(hayMeta ? [[enCurso ? 'Máximo del mes completo' : 'Máximo del período', `${n0(lb.meta.diferidoTotal)} bbl`] as [string, string]] : []),
              base ? [`Antes (${base.nombre})`, `${n0(base.baseDia)} bbl/d`] : ['Antes', 'no hay tres meses antes del período']] }} />
          </span>
        </span>
      </div>
      <Lectura>
        Lo que el campo no produjo, pudiendo: el potencial ({FUENTE_POTENCIAL.toLowerCase()}) menos
        lo real ({FUENTE_REAL.toLowerCase()}). Cada barril sale de un evento del controlador de un
        pozo, con la hora del PLC, y se le carga al equipo que lo causó. El valor usa el precio neto
        configurado. La barra va contra el máximo de diferido que firmó el gerente (la raya): hay que
        quedarse antes. El sello dice si el libro se puede publicar; toque o pase el cursor para ver
        por qué. {simple ? NOTA_SIMPLE : NOTA_DE_CALCULO}
      </Lectura>
    </section>
  )
}
