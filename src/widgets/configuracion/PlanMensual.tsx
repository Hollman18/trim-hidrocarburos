import { useId, useState } from 'react'
import { Download } from 'lucide-react'
import type { Campo } from '@/entities/tipos'
import { SIN_META, type Config } from '@/entities/configuracion'
import { metaEntre } from '@/entities/libro'
import { leerPlan, plantillaPlan, sumarMeses, nombreMes, type FilaPlan } from '@/entities/plan'
import { Panel, Boton, SubirCsv } from '@/shared/ui/primitivas'
import { Lectura } from '@/shared/ui/Lectura'
import { FueraDeMeta } from '@/shared/ui/Prioridad'
import { n0, plural } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { cajaNumero, cajaMala, REGLA_CAJA } from './comun'
import type { EdicionMeta } from './Metas'
import { desplazable } from '@/shared/ui/alFinal'

const inicioDe = (mes: string) => new Date(`${mes}-01T00:00:00-05:00`).getTime()
const corto = (mes: string) => nombreMes(mes).replace(/ de (\d{4})$/, ' $1')

/** El plan mes a mes: una tabla por campo (o la suma de todos) con la meta de
 *  cada mes, y cómo cargar el presupuesto de la empresa. Cada mes es un
 *  tramo que rige desde su día 1; un mes sin fila propia sigue con lo del
 *  anterior, y se ve más tenue. */
export function PlanMensual({ propuesta, campos, campoInicial, mesActual, puede, valor, propio, onEditar, onCargar }: {
  propuesta: Config; campos: Campo[]; mesActual: string; puede: boolean
  /** El campo que se estaba mirando: el plan abre en él. */
  campoInicial: string
  valor: (campoId: string, mes: string) => EdicionMeta
  /** ¿Ese mes tiene su propio tramo (lo firmado o lo que está en el borrador)? */
  propio: (campoId: string, mes: string) => boolean
  onEditar: (campoId: string, mes: string, cambio: Partial<EdicionMeta>) => void
  onCargar: (filas: FilaPlan[]) => void
}) {
  const idBase = useId()
  const [vista, setVista] = useState<string>(() => campos.some(c => c.id === campoInicial) ? campoInicial : campos[0]?.id ?? 'total')
  const enVista = vista === 'total' ? campos : campos.filter(c => c.id === vista)
  // Del mes en curso a doce meses, o hasta donde llegue lo cargado.
  const ultimoPropio = campos.flatMap(c => (propuesta.campos[c.id]?.metas ?? []).map(t => t.desde.slice(0, 7))).sort().at(-1) ?? mesActual
  const hasta = [sumarMeses(mesActual, 11), ultimoPropio].sort().at(-1)!
  const meses: string[] = []
  for (let m = mesActual; m <= hasta && meses.length < 24; m = sumarMeses(m, 1)) meses.push(m)

  // El plan se acaba: el último mes con fila propia está a un mes o menos.
  const mesesPropios = campos.flatMap(c => meses.filter(m => propio(c.id, m)))
  const finPlan = mesesPropios.length >= 3 ? mesesPropios.sort().at(-1)! : undefined
  const seAcaba = finPlan !== undefined && finPlan <= sumarMeses(mesActual, 1)

  const totalMes = (mes: string) => enVista.reduce((a, c) => {
    const x = metaEntre(propuesta, c.id, inicioDe(mes), inicioDe(sumarMeses(mes, 1)))
    return { prod: a.prod + x.produccion, dif: a.dif + x.diferido, sinMeta: a.sinMeta || x.sinMeta }
  }, { prod: 0, dif: 0, sinMeta: false })
  // Un mes con algún campo sin meta firmada no tiene total: la suma de los demás no lo es.
  const totalTexto = (t: ReturnType<typeof totalMes>) => (t.sinMeta ? SIN_META : `${n0(t.prod)} · máx. ${n0(t.dif)}`)
  const cifraOHueco = (v: number) => (Number.isFinite(v) ? n0(v) : SIN_META)

  return (
    <>
      {puede && <Cargar campos={campos} mesActual={mesActual} valor={valor} onCargar={onCargar} />}
      <Panel className="mb-2.5" titulo="PLAN MES A MES" extra="cada mes rige desde su día 1">
        <Lectura>
          El presupuesto de la empresa, mes por mes y campo por campo. Cada mes rige desde su día 1 y se mide
          contra lo que pasó ese mes. Un mes sin cifra propia sigue con la del anterior (va más tenue). Una
          cifra del plan vale para el mes completo: reemplaza cualquier meta que empezara a mitad de ese mes.
          La meta global de cada mes es la suma de los campos.
        </Lectura>
        {/* Un grupo de botones que escoge qué campo muestra la tabla (aria-pressed):
            no son pestañas ARIA, que piden flechas y un tabpanel por cada una. */}
        <div role="group" aria-label="Campo del plan" className="mb-2 flex flex-wrap gap-1">
          {[{ id: 'total', nombre: 'Suma de los campos' }, ...campos].map(c => (
            <button key={c.id} aria-pressed={vista === c.id} onClick={() => setVista(c.id)}
              className={cn('cursor-pointer rounded border px-2.5 py-1 text-[11.5px]',
                vista === c.id ? 'border-[var(--tinta)] bg-[var(--panel)] font-semibold' : 'border-[var(--linea2)] text-[var(--tinta2)] hover:bg-[var(--panel2)]')}>
              {c.nombre}
            </button>
          ))}
        </div>

        <div {...desplazable('Plan mes a mes')} className="overflow-x-auto">
          <table className="tabular w-full min-w-[560px] text-[12px]">
            <thead className="text-[10px] text-[var(--tinta3)]">
              <tr className="border-b border-[var(--linea)]">
                <th className="py-1 text-left font-normal">Mes</th>
                <th className="text-right font-normal">Producción, bbl/d</th>
                <th className="text-right font-normal">Máx. de diferido, bbl/d</th>
                {vista !== 'total' && <th className="text-right font-normal">Precio, USD/bbl</th>}
                <th className="text-right font-normal">Total del mes, bbl</th>
              </tr>
            </thead>
            <tbody>
              {meses.map(mes => {
                const t = totalMes(mes)
                if (vista === 'total') {
                  const suma = campos.reduce((a, c) => { const v = valor(c.id, mes); return { p: a.p + v.produccionBpd, d: a.d + v.diferidoMaxBpd } }, { p: 0, d: 0 })
                  return (
                    <tr key={mes} className="border-b border-[var(--linea2)]">
                      <td className="py-1.5">{corto(mes)}{mes === mesActual && <small className="text-[var(--tinta3)]"> · en curso</small>}</td>
                      <td className="text-right font-semibold">{cifraOHueco(suma.p)}</td>
                      <td className="text-right font-semibold">{cifraOHueco(suma.d)}</td>
                      <td className="text-right text-[var(--tinta2)]">{totalTexto(t)}</td>
                    </tr>
                  )
                }
                const v = valor(vista, mes), suyo = propio(vista, mes)
                const caja = (k: 'produccionBpd' | 'diferidoMaxBpd' | 'netbackUsd', x: number | undefined, rotulo: string, malo: boolean) => {
                  // La regla va junto a la casilla y enlazada: el borde grueso solo dice que algo está mal.
                  const regla = `${idBase}-${mes}-${k}`
                  return (
                    <>
                      <input type="number" step={k === 'netbackUsd' ? 0.5 : 50} min={0} disabled={!puede} aria-label={rotulo} aria-invalid={malo}
                        aria-describedby={malo ? regla : undefined}
                        value={x === undefined || Number.isNaN(x) ? '' : x} placeholder={k === 'netbackUsd' ? 'sin precio' : undefined}
                        className={cn(cajaNumero, !suyo && 'text-[var(--tinta3)]', malo && cajaMala)}
                        onChange={e => onEditar(vista, mes, { [k]: e.target.value === '' ? (k === 'netbackUsd' ? undefined : NaN) : Number(e.target.value) })} />
                      {malo && <small id={regla} className="mt-0.5 block text-right text-[10px] leading-tight text-[var(--tinta)]">{REGLA_CAJA[k]}</small>}
                    </>
                  )
                }
                const nombre = campos.find(c => c.id === vista)!.nombre
                return (
                  <tr key={mes} className="border-b border-[var(--linea2)]">
                    <td className="py-1.5">
                      <span className={cn(suyo ? 'font-semibold' : 'text-[var(--tinta3)]')}>{corto(mes)}</span>
                      <small className="block text-[10px] text-[var(--tinta3)]">{mes === mesActual ? 'en curso · ' : ''}{suyo ? 'cifra propia' : 'sigue la del mes anterior'}</small>
                    </td>
                    <td className="w-[110px] pl-2">{caja('produccionBpd', v.produccionBpd, `Producción de ${nombre} en ${nombreMes(mes)}, bbl/d`, !(v.produccionBpd > 0))}</td>
                    <td className="w-[110px] pl-2">{caja('diferidoMaxBpd', v.diferidoMaxBpd, `Máximo de diferido de ${nombre} en ${nombreMes(mes)}, bbl/d`, !(v.diferidoMaxBpd >= 0))}</td>
                    <td className="w-[100px] pl-2">{caja('netbackUsd', v.netbackUsd, `Precio de ${nombre} en ${nombreMes(mes)}, USD/bbl`, v.netbackUsd !== undefined && !(v.netbackUsd >= 0))}</td>
                    <td className="text-right text-[var(--tinta2)]">{totalTexto(t)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-1 text-[10.5px] text-[var(--tinta3)] sm:hidden">Desplace la tabla hacia la derecha para ver el precio y el total del mes.</p>
        {seAcaba && (
          <p className="mt-2 flex items-start gap-1.5 text-[11.5px]">
            <FueraDeMeta si tamano={11} />
            <span>El plan cargado llega hasta {nombreMes(finPlan!)}: {puede ? 'cargue' : 'el gerente de activo tiene que cargar'} el presupuesto siguiente antes de que se acabe. Después de ese mes sigue rigiendo su última cifra.</span>
          </p>
        )}
      </Panel>
    </>
  )
}

/** Cargar el presupuesto: plantilla para descargar, pegar desde Excel o subir
 *  un CSV, revisar y pasarlo al borrador. Nada rige hasta firmarlo. */
function Cargar({ campos, mesActual, valor, onCargar }: {
  campos: Campo[]; mesActual: string; valor: (campoId: string, mes: string) => EdicionMeta; onCargar: (filas: FilaPlan[]) => void
}) {
  const [texto, setTexto] = useState('')
  const [enBblMes, setEnBblMes] = useState(false)
  const [revision, setRevision] = useState<ReturnType<typeof leerPlan> | null>(null)
  const [hecho, setHecho] = useState<string | null>(null)
  // Un error de lectura del archivo, aparte de la revisión de las filas.
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null)
  const idErrores = useId()
  const hayError = !!errorArchivo || (revision?.errores.length ?? 0) > 0

  const descargar = () => {
    const filas: FilaPlan[] = []
    for (let i = 0; i < 12; i++) {
      const mes = sumarMeses(mesActual, i)
      for (const c of campos) { const v = valor(c.id, mes); filas.push({ mes, campoId: c.id, produccionBpd: v.produccionBpd, diferidoMaxBpd: v.diferidoMaxBpd, netbackUsd: v.netbackUsd }) }
    }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([plantillaPlan(filas)], { type: 'text/csv;charset=utf-8' }))
    a.download = `TRIM-plan-mensual-${mesActual}.csv`
    a.click(); URL.revokeObjectURL(a.href)
  }
  const revisar = (t = texto) => { setHecho(null); setErrorArchivo(null); setRevision(leerPlan(t, { enBblMes, desdeMes: mesActual, permitidos: campos.map(c => c.id) })) }
  // Una cifra 15 veces la meta de hoy (o 15 veces menor) casi siempre es de unidad: se avisa, no se bloquea.
  // Lo que se leyó con una suposición (un par «1,200» tomado como dos columnas) también se avisa.
  const raras = [...(revision?.avisos ?? []), ...(revision?.filas ?? []).flatMap(f => {
    const hoy = valor(f.campoId, f.mes).produccionBpd, r = hoy > 0 ? f.produccionBpd / hoy : 1
    const nombre = campos.find(c => c.id === f.campoId)?.nombre ?? f.campoId
    return r >= 15 || r <= 1 / 15
      ? [`${nombre}, ${nombreMes(f.mes)}: ${n0(f.produccionBpd)} bbl/d es ${r >= 15 ? `${n0(r)} veces` : `la ${n0(1 / r)}ª parte de`} la meta de hoy (${n0(hoy)} bbl/d). ¿Las cifras ${enBblMes ? 'son bbl/d y no del mes' : 'son del mes y no bbl/d'}?`]
      : []
  })]
  const meses = revision ? [...new Set(revision.filas.map(f => f.mes))].sort() : []

  return (
    <Panel className="mb-2.5" titulo="CARGAR EL PRESUPUESTO" extra="pegar desde Excel o subir un CSV">
      <Lectura>
        Una fila por mes y campo: mes, campo, producción, máximo de diferido y, si lo trae, precio. Descargue la
        plantilla con lo que rige hoy, llénela con el presupuesto y péguela aquí (o súbala). Los meses que ya
        cerraron no se cargan. Nada rige hasta que se firme.
      </Lectura>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Boton onClick={descargar}><Download className="mr-1 inline size-3.5" />Descargar la plantilla</Boton>
        <SubirCsv onTexto={t => { setTexto(t); revisar(t) }} onError={m => { setRevision(null); setHecho(null); setErrorArchivo(m) }} />
        <span className="flex items-center gap-3 text-[11.5px]">
          <span className="text-[var(--tinta2)]">Las cifras vienen en</span>
          <label className="flex items-center gap-1"><input type="radio" name="unidad-plan" checked={!enBblMes} onChange={() => { setEnBblMes(false); setRevision(null) }} />bbl/d</label>
          <label className="flex items-center gap-1"><input type="radio" name="unidad-plan" checked={enBblMes} onChange={() => { setEnBblMes(true); setRevision(null) }} />bbl del mes</label>
        </span>
      </div>
      <textarea value={texto} onChange={e => { setTexto(e.target.value); setRevision(null); setHecho(null); setErrorArchivo(null) }} rows={5} aria-label="Filas del presupuesto"
        aria-invalid={hayError} aria-describedby={hayError ? idErrores : undefined}
        placeholder={'Pegue aquí las filas copiadas de Excel. Por ejemplo:\n2026-11\tLa Ceiba\t11200\t750\t48'}
        className="w-full resize-y rounded border border-[var(--linea)] bg-[var(--panel2)] px-2 py-1.5 font-mono text-[11.5px] outline-none focus:border-acento" />
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        <Boton onClick={() => revisar()} disabled={!texto.trim()}>Revisar</Boton>
        {revision && revision.filas.length > 0 && (
          <Boton variante="principal" onClick={() => {
            onCargar(revision.filas)
            // Las filas con error no pasaron: se recuerda cuántas, porque la lista se borra con la revisión.
            const malas = revision.errores.length
            setHecho(`${plural(revision.filas.length, 'fila pasó', 'filas pasaron')} al borrador${malas ? `; ${plural(malas, 'fila con error no se pasó', 'filas con error no se pasaron')}` : ''}. Revise la tabla y firme abajo.`)
            setRevision(null); setTexto('')
          }}>
            Pasar {plural(revision.filas.length, 'fila', 'filas')} al borrador
          </Boton>
        )}
      </div>
      {revision && (
        <div className="mt-2 text-[11.5px]">
          {revision.filas.length > 0 && (
            <p className="text-[var(--tinta2)]">
              Listas: {plural(revision.filas.length, 'fila', 'filas')} de {[...new Set(revision.filas.map(f => campos.find(c => c.id === f.campoId)?.nombre))].join(', ')},
              de {nombreMes(meses[0]!)} a {nombreMes(meses.at(-1)!)}{enBblMes ? ' (convertidas de bbl del mes a bbl/d)' : ''}.
            </p>
          )}
          {raras.length > 0 && (
            <ul className="mt-1 grid gap-0.5 text-[var(--tinta)]">
              {raras.slice(0, 6).map(e => <li key={e} className="flex items-start gap-1.5"><FueraDeMeta si tamano={11} /><span>{e}</span></li>)}
              {raras.length > 6 && <li>y {raras.length - 6} cifras más así.</li>}
            </ul>
          )}
          {revision.errores.length > 0 && (
            <ul id={idErrores} role="alert" className="mt-1 list-disc pl-4 text-[var(--tinta)]">{revision.errores.slice(0, 12).map(e => <li key={e}>{e}</li>)}
              {revision.errores.length > 12 && <li>y {revision.errores.length - 12} más.</li>}</ul>
          )}
          {revision.filas.length === 0 && revision.errores.length === 0 && <p className="text-[var(--tinta2)]">No se encontraron filas.</p>}
        </div>
      )}
      {errorArchivo && <p id={idErrores} role="alert" className="mt-2 text-[11.5px] text-[var(--tinta)]">{errorArchivo}</p>}
      {hecho && <p role="status" className="mt-2 text-[11.5px] text-[var(--tinta2)]">{hecho}</p>}
    </Panel>
  )
}
