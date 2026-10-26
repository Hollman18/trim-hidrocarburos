import { useId } from 'react'
import { Info as IconoInfo } from 'lucide-react'
import type { Campo } from '@/entities/tipos'
import { metaEn, diaCo, SIN_META, type Config, type TramoMeta } from '@/entities/configuracion'
import { metaEntre } from '@/entities/libro'
import { AHORA } from '@/entities/reloj'
import { Panel } from '@/shared/ui/primitivas'
import { Lectura } from '@/shared/ui/Lectura'
import { Info } from '@/shared/ui/Info'
import { Tip } from '@/shared/ui/Tip'
import { FueraDeMeta } from '@/shared/ui/Prioridad'
import { n0 } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { cajaNumero, cajaMala, fechaDia, REGLA_CAJA } from './comun'

/** Lo que el gerente edita de un campo: un tramo sin su fecha (la fecha es
 *  una sola para toda la firma). */
export type EdicionMeta = Omit<TramoMeta, 'desde'>

/** Dos cifras iguales, con dos casillas vacías (NaN) también iguales. */
const igual = (a: number | undefined, b: number | undefined) => Object.is(a, b)

const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const cifra = (v: number) => (Number.isFinite(v) ? n0(v) : '—')
const diaDe = (d: string) => Number(d.slice(8, 10))

/** Las metas de todos los campos en una tabla, en barriles por día, y la meta
 *  global debajo: la suma, calculada, nunca escrita aparte. Lo que los pozos
 *  pueden dar (promedio de 30 días) va al lado como referencia, y si las dos
 *  metas de un campo no cuadran entre sí se avisa antes de firmar (no se
 *  bloquea). */
export function MetasCampos({ vigente, propuesta, campos, desde, puede, potencial, valor, base, onEditar }: {
  vigente: Config; propuesta: Config; campos: Campo[]; desde: string; puede: boolean
  potencial: Record<string, number>
  /** Lo que muestra cada fila (lo editado o lo que regiría ese día) y lo que había. */
  valor: (campoId: string) => EdicionMeta; base: (campoId: string) => EdicionMeta
  onEditar: (campoId: string, cambio: Partial<EdicionMeta>) => void
}) {
  const filas = campos.map(c => {
    const v = valor(c.id), b = base(c.id)
    return { c, prod: v.produccionBpd, dif: v.diferidoMaxBpd, antes: b, pot: potencial[c.id] ?? 0,
      cambiado: !igual(v.produccionBpd, b.produccionBpd) || !igual(v.diferidoMaxBpd, b.diferidoMaxBpd),
      vig: metaEn(vigente, c.id, puede ? new Date(`${desde}T00:00:00-05:00`).getTime() : AHORA.getTime()) }
  })
  const suma = (f: (x: typeof filas[number]) => number) => filas.reduce((a, x) => a + f(x), 0)
  const tot = { prod: suma(x => x.prod), dif: suma(x => x.dif), pot: suma(x => x.pot) }
  // La meta global es la suma: con un campo sin meta firmada no hay suma que dar, y se dice.
  const sinMeta = filas.filter(f => !f.vig).length

  // El total del mes con lo propuesto, día por día: si lo nuevo empieza a mitad de mes, cuenta desde ahí.
  const ref = puede ? desde : diaCo(AHORA.getTime())
  const [y, m] = ref.split('-').map(Number) as [number, number]
  const ini = new Date(`${y}-${String(m).padStart(2, '0')}-01T00:00:00-05:00`).getTime()
  const fin = new Date(m === 12 ? `${y + 1}-01-01T00:00:00-05:00` : `${y}-${String(m + 1).padStart(2, '0')}-01T00:00:00-05:00`).getTime()
  const diasMes = Math.round((fin - ini) / 86_400_000)
  const mes = campos.reduce((a, c) => { const x = metaEntre(propuesta, c.id, ini, fin); return { prod: a.prod + x.produccion, dif: a.dif + x.diferido, sinMeta: a.sinMeta || x.sinMeta } }, { prod: 0, dif: 0, sinMeta: false })
  const partido = puede && filas.some(f => f.cambiado) && diaDe(desde) > 1
  // Sin editar: si algún campo cambia de meta dentro del mes, el total mezcla las dos y se dice.
  const mes0 = ref.slice(0, 8) // «AAAA-MM-»
  const mezcla = !partido && campos.some(c => (propuesta.campos[c.id]?.metas ?? []).some(x => x.desde.startsWith(mes0) && x.desde > `${mes0}01`))

  // Cada aviso: el hecho a la vista y sus cifras en el ⓘ (y en el papel). Avisa, no bloquea.
  const avisosMetas = filas.flatMap(({ c, prod, dif, pot }): Array<[string, string]> => {
    if (!Number.isFinite(prod) || !Number.isFinite(dif) || pot <= 0) return []
    if (prod > pot) return [[`${c.nombre}: no se alcanza ni sin diferido (pueden dar ≈ ${n0(pot)} bbl/d)`, `La meta pide ${n0(prod)} bbl/d y los pozos hoy pueden dar ≈ ${n0(pot)} bbl/d.`]]
    if (dif > pot - prod + Math.max(50, pot * 0.02))
      return [[`${c.nombre}: las dos metas no cuadran (daría ≈ ${n0(pot - dif)} bbl/d)`, `Con los ${n0(dif)} bbl/d de diferido que acepta, el campo daría ≈ ${n0(pot - dif)} bbl/d, menos que su meta de ${n0(prod)} bbl/d.`]]
    return []
  })

  const hoy = diaCo(AHORA.getTime())

  const programadas = campos.flatMap(c => (vigente.campos[c.id]?.metas ?? []).filter(x => x.desde > hoy).map(x => ({ c, x })))
  // Lo que se edita rige solo hasta la próxima meta ya firmada de ese campo: se avisa.
  const recortadas = puede ? filas.filter(f => f.cambiado).flatMap(({ c }): Array<[string, string]> => {
    const sig = (vigente.campos[c.id]?.metas ?? []).find(x => x.desde > desde)
    return sig ? [[`${c.nombre}: rige solo hasta el ${fechaDia(sig.desde)}`, `Ya hay una meta firmada desde el ${fechaDia(sig.desde)}; lo que cambie ahora rige solo hasta ese día.`]] : []
  }) : []
  const avisos = [...avisosMetas, ...recortadas]
  const idBase = useId()
  // Quien no firma no corrige: una casilla vacía (campo sin meta) se le dice con el texto, no con el borde de error.
  const malo = (k: 'produccionBpd' | 'diferidoMaxBpd', v: number) => puede && (!Number.isFinite(v) || (k === 'produccionBpd' ? v <= 0 : v < 0))

  const numero = (campoId: string, k: 'produccionBpd' | 'diferidoMaxBpd', v: number, rotulo: string) => {
    const mal = malo(k, v), regla = `${idBase}-${campoId}-${k}`
    return (
      <>
        <input type="number" inputMode="numeric" step={50} min={0} disabled={!puede} aria-label={rotulo} aria-invalid={mal}
          aria-describedby={mal ? regla : undefined}
          value={Number.isNaN(v) ? '' : v} className={cn(cajaNumero, mal && cajaMala)}
          onChange={ev => onEditar(campoId, { [k]: ev.target.value === '' ? NaN : Number(ev.target.value) })} />
        {mal && <small id={regla} className="mt-0.5 block text-right text-[12px] leading-tight text-[var(--tinta)]">{REGLA_CAJA[k]}</small>}
      </>
    )
  }
  const columnas = 'grid grid-cols-[minmax(0,1fr)_minmax(76px,108px)_minmax(76px,108px)] items-center gap-x-2'

  return (
    <Panel titulo="METAS POR CAMPO" extra={puede ? undefined : 'vigentes hoy'}>
      <Lectura>
        Cada campo tiene dos metas: lo que debe producir y lo máximo de diferido que se acepta (lo que se
        deja de producir pudiendo). Van en barriles por día porque los barriles se suman: la meta global
        es la suma de los campos y no se escribe aparte. Lo que los pozos pueden dar es el promedio de los
        últimos 30 días: es referencia, no meta. Toque o pase el cursor por un campo para ver desde cuándo
        rige su meta.
      </Lectura>

      <div role="table" aria-label="Metas por campo" className="text-[14px]">
        <div role="row" className={cn(columnas, 'items-end border-b border-[var(--linea)] pb-1 text-[12px] text-[var(--tinta3)]')}>
          <span role="columnheader">Campo</span>
          <span role="columnheader" className="text-right">Producción, bbl/d</span>
          <span role="columnheader" className="text-right">Máx. de diferido, bbl/d</span>
        </div>
        {filas.map(({ c, vig, prod, dif, pot, cambiado, antes }) => (
          <div role="row" key={c.id} className={cn(columnas, 'border-b border-[var(--linea2)] py-1.5')}>
            <span role="cell" className="min-w-0">
              {/* Desde cuándo rige va en el globo del campo (y en el papel): la meta firmada o, si la fila
                  se cambió, lo de antes y lo nuevo (desde la fecha de la firma). En la fila, la referencia. */}
              {(() => {
                const fechas: Array<[string, string]> = cambiado
                  ? [...(vig ? [['Lo de antes, desde', fechaDia(vig.desde)] as [string, string]] : []), ['Lo nuevo, desde', fechaDia(desde)]]
                  : vig ? [['Rige desde', fechaDia(vig.desde)]] : []
                const nombre = <>
                  <span className="flex min-w-0 items-center gap-1">
                    <b className="truncate">{c.nombre}</b>
                    {/* La señal de que el nombre tiene globo (la fecha está ahí). */}
                    {fechas.length > 0 && <IconoInfo aria-hidden className="no-imprimir size-3 shrink-0 text-[var(--tinta3)]" />}
                  </span>
                  <small className="block text-[12px] leading-tight text-[var(--tinta3)]">
                    {cambiado
                      ? (vig ? <>antes {n0(antes.produccionBpd)} · máx. {n0(antes.diferidoMaxBpd)} bbl/d</> : <>antes {SIN_META}</>)
                      : <>pueden dar ≈ {n0(pot)} bbl/d{vig ? '' : ` · ${SIN_META}`}</>}
                  </small>
                </>
                return fechas.length
                  ? <Tip as="span" titulo={c.nombre} filas={fechas} imprimir="todo" className="block min-w-0">{nombre}</Tip>
                  : nombre
              })()}
            </span>
            <span role="cell">{numero(c.id, 'produccionBpd', prod, `Meta de producción de ${c.nombre}, bbl/d`)}</span>
            <span role="cell">{numero(c.id, 'diferidoMaxBpd', dif, `Máximo de diferido de ${c.nombre}, bbl/d`)}</span>
          </div>
        ))}
        <div role="row" className={cn(columnas, 'pt-2')}>
          <span role="cell" className="min-w-0">
            <b className="block text-[15px]">Meta global</b>
            <small className="block text-[12px] leading-tight text-[var(--tinta3)]">
              suma de {campos.length} campos{sinMeta ? ` · ${sinMeta} ${SIN_META}` : ''} · pueden dar ≈ {n0(tot.pot)} bbl/d
            </small>
          </span>
          {/* Sin la meta de todos, la suma no es la meta global: se dice en vez de dar la de los demás. */}
          <b role="cell" className="tabular pr-2 text-right text-[15px]">{sinMeta && !Number.isFinite(tot.prod) ? SIN_META : cifra(tot.prod)}</b>
          <b role="cell" className="tabular pr-2 text-right text-[15px]">{sinMeta && !Number.isFinite(tot.dif) ? SIN_META : cifra(tot.dif)}</b>
        </div>
      </div>

      {/* El ⓘ va en línea con el texto (no como hermano flexible): en el teléfono no queda solo en su renglón. */}
      <p className="mt-2 text-[14px] text-[var(--tinta2)]">
        Total de {MES[m - 1]} de {y}:{' '}
        {mes.sinMeta ? <b className="text-[var(--tinta)]">sin total: {SIN_META} en algún campo</b> : <>
          producción <b className="tabular text-[var(--tinta)]">{cifra(mes.prod)} bbl</b> ·
          máx. diferido <b className="tabular text-[var(--tinta)]">{cifra(mes.dif)} bbl</b>
          {(partido || mezcla) && <> · con cambio de meta</>}</>}
        <Info className="ml-1" titulo="Total del mes"
          texto={`La suma de los ${diasMes} días, cada uno con la meta que rige ese día.${partido ? ` Del 1 al ${diaDe(desde) - 1}, lo que regía; desde el ${diaDe(desde)}, lo nuevo.` : ''}`} />
      </p>

      {avisos.length > 0 && (
        <ul className="mt-2 grid gap-1 text-[14px] text-[var(--tinta)]">
          {avisos.map(([a, cifras]) => (
            <li key={a} className="flex items-start gap-1.5"><FueraDeMeta si tamano={11} /><span>{a}<Info className="ml-1" titulo="Detalle" texto={cifras} /></span></li>
          ))}
        </ul>
      )}
      {programadas.length > 0 && programadas.length <= 3 && (
        <p className="mt-2 text-[13px] text-[var(--tinta2)]">
          Firmadas para después: {programadas.map(({ c, x }) => `${c.nombre} desde el ${fechaDia(x.desde)} (producción ${n0(x.produccionBpd)} · máx. ${n0(x.diferidoMaxBpd)} bbl/d)`).join('; ')}.
        </p>
      )}
      {programadas.length > 3 && (
        <p className="mt-2 text-[13px] text-[var(--tinta2)]">
          Plan firmado hasta el {fechaDia(programadas.map(p => p.x.desde).sort().at(-1)!)}: véalo en «Plan mes a mes».
        </p>
      )}
    </Panel>
  )
}
