import { useId, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useRepartoChoke, CHOKES_Y_SIN_ASIGNAR, ESCALONES, NOMBRE_ESCALON, type EscalonOSinClasificar, type ChokeOSinAsignar } from '@/shared/api/choke'
import { campoPorId } from '@/entities/campos'
import { Boton } from '@/shared/ui/primitivas'
import { FueraDeMeta } from '@/shared/ui/Prioridad'
import { Info } from '@/shared/ui/Info'
import { Lectura } from '@/shared/ui/Lectura'
import { Tip } from '@/shared/ui/Tip'
import { n0, pctParte } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { BarraTramos, LeyendaTramos, Muestra } from './tramos'
import { LARGO_TRAMO, leidoReparto, mayuscula, textoReparto } from './reparto'

/** Lo que no se produjo, dicho por escalón con palabras de campo (U2 §1.4):
 *  el nombre técnico de la escalera (NSTA §5.3 y §6.4) va en el globo, nunca
 *  en el rótulo. El norte de TRIM vive en lo no planeado. */
const ESCALON: Record<EscalonOSinClasificar, string> = {
  'disponibilidad-no-planeada': 'Paradas no planeadas: fallas, disparos y terceros',
  'disponibilidad-planeada': 'Paradas planeadas: mantenimiento, pruebas y trabajos de pozo',
  desempeno: 'Frecuencia bajada: el levantamiento sin optimizar',
  capacidad: 'Restricción sin falla: nominación o despacho',
  desarrollo: 'El yacimiento y los proyectos',
  'sin-clasificar': 'Sin clasificar: lo decide una persona',
}
/** El orden de la lista: primero lo que TRIM tiene que bajar; el resto, en el de la escalera. */
const ORDEN_ESCALON: EscalonOSinClasificar[] = ['disponibilidad-no-planeada', ...ESCALONES.filter(e => e !== 'disponibilidad-no-planeada')]

/** «POR DÓNDE SE TRABÓ» del libro de diferidos, para producción, mantenimiento
 *  y confiabilidad (U2 §3.1; CHOKE-COMPLETO §6 y §7): lo que no se produjo en
 *  el período repartido por tramo (con los equipos que más pesan en cada uno)
 *  y por escalón, el cruce de los dos y, con varios campos, cada campo en su
 *  barra. Todo sale de `useRepartoChoke`: suma exacto el diferido del libro y
 *  lo que no es de ningún tramo se dice, no se reparte. */
export function PorTramo({ campos, desde, hasta, global, onIdentificar }: {
  campos: string[]; desde: Date; hasta: Date; global: boolean
  /** Lleva a Identificar lo que sigue sin identificar (si el rol tiene la pantalla). */
  onIdentificar?: () => void
}) {
  const b = useRepartoChoke({ campos, desde, hasta })
  const [cruce, setCruce] = useState(false)
  const idCruce = useId()
  const total = b.diferido
  const parte = (v: number) => (total > 0 ? pctParte((v / total) * 100) : '')
  const inventario = Math.round(b.sinExplicar)
  const tramosCruce = CHOKES_Y_SIN_ASIGNAR.filter(k => b.porChoke[k] >= 0.5)
  const escalonesCruce = ORDEN_ESCALON.filter(e => b.porEscalon[e] >= 0.5)
  const titulo = 'font-cond text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]'
  const fila = 'border-b border-[var(--linea2)] py-1.5 last:border-0'

  return (
    <section id="por-donde-se-trabo" className="rounded border border-[var(--linea)] bg-[var(--panel)] shadow-[var(--sombra)]">
      <header className="flex items-center justify-between gap-2 border-b border-[var(--linea2)] px-3 py-[7px]">
        <h2 className={titulo}>POR DÓNDE SE TRABÓ</h2>
        <span className="font-cond text-[10px] tracking-[.08em] text-[var(--tinta3)]">bbl · el diferido del libro</span>
      </header>
      <div className="p-3">
        <Lectura>
          Dónde empezó lo que costó barriles en el período: en el yacimiento, en los pozos, en la planta o
          estación, o afuera (oleoducto, transportador o cliente). Lo sin identificar va aparte, rayado: no
          se reparte. A la derecha, el mismo total por qué no se produjo: lo no planeado es lo que TRIM tiene
          que bajar. Suma lo mismo que el cuadre de arriba. Toque o pase el cursor por una fila para ver de
          dónde sale.
        </Lectura>
        {total < 0.5
          ? <p className="text-[12px] text-[var(--tinta2)]">Nada se trabó en el período.</p>
          : (
            <>
              <BarraTramos valores={b.porChoke} leido={`Dónde se trabó en el período: ${leidoReparto(b.porChoke, b.diferido)}, el diferido del libro.`} alto="h-3.5" className="mt-1" />
              <p className="mt-1 text-[12px] leading-snug">{b.texto}</p>
            </>
          )}

        <div className="mt-2.5 grid items-start gap-x-6 gap-y-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr))]">
          <div className="min-w-0" data-por-tramo="">
            <h3 className={`${titulo} mb-0.5`}>POR TRAMO</h3>
            {CHOKES_Y_SIN_ASIGNAR.map(k => {
              const v = b.porChoke[k], eq = b.porChokeEquipo[k]
              const sin = k === 'sin-asignar'
              return (
                <div key={k} className={cn(fila, v < 0.5 && 'text-[var(--tinta3)]')}>
                  <Tip titulo={mayuscula(LARGO_TRAMO[k])} pista={sin ? 'Paradas que todavía no tienen causa: hasta que alguien diga qué pasó, no se sabe dónde se trabó. No se reparten entre los tramos.' : undefined}
                    filas={[['Barriles', `${n0(v)} bbl`], ...(total > 0 ? [['Del diferido', parte(v)] as [string, string]] : []),
                      ...eq.slice(0, 5).map(x => [x.equipo, `${n0(x.bbl)} bbl`] as [string, string])]}
                    aLaVista={eq.length <= 3} className="flex items-baseline gap-2 text-[12px]">
                    <Muestra k={k} />
                    <span className={cn('min-w-0 flex-1', !sin && v >= 0.5 && 'font-medium')}>{mayuscula(LARGO_TRAMO[k])}</span>
                    <b className="tabular shrink-0 text-[13px]" data-tramo={k} data-bbl={v}>{n0(v)}</b>
                    <small className="tabular w-[42px] shrink-0 text-right text-[10px] text-[var(--tinta3)]">{v >= 0.5 ? parte(v) : ''}</small>
                  </Tip>
                  {eq.length > 0 && (
                    <small className="tabular block pl-[18px] text-[10.5px] text-[var(--tinta2)]">
                      {eq.slice(0, 3).map(x => `${x.equipo} ${n0(x.bbl)}`).join(' · ')}{eq.length > 3 ? ` · y ${eq.length - 3} más` : ''}
                    </small>
                  )}
                  {sin && v >= 0.5 && onIdentificar && <Boton variante="chico" className="ml-[18px] mt-1 min-h-6" onClick={onIdentificar}>Identificar</Boton>}
                </div>
              )
            })}
            <p className="tabular mt-1 flex flex-wrap items-baseline justify-between gap-x-2 text-[12px]">
              <span>= el diferido del libro</span><b className="text-[13px]" data-total-tramos={total}>{n0(total)} bbl</b>
            </p>
          </div>

          <div className="min-w-0" data-por-escalon="">
            <h3 className={`${titulo} mb-0.5 flex flex-wrap items-center gap-x-1`}>
              <span>POR QUÉ NO SE PRODUJO</span>
            </h3>
            <p className="mb-0.5 flex flex-wrap items-center gap-x-1 text-[10.5px] text-[var(--tinta3)]">
              <span>el mismo total, por escalón</span>
              <Info titulo="Por qué no se produjo"
                texto="Es la escalera de la NSTA (§5.3 y §6.4): desarrollo (el yacimiento y los proyectos), desempeño (levantamiento sin optimizar), disponibilidad planeada y no planeada, y capacidad (restricción sin falla). Cada barril va a un tramo y a un escalón. El norte de TRIM vive en la disponibilidad no planeada: las paradas que nadie programó." />
            </p>
            {ORDEN_ESCALON.map(e => {
              const v = b.porEscalon[e]
              const norte = e === 'disponibilidad-no-planeada'
              return (
                <Tip key={e} titulo={ESCALON[e]} pista={`En la escalera de la NSTA: ${NOMBRE_ESCALON[e]}.`}
                  filas={[['Barriles', `${n0(v)} bbl`], ...(total > 0 ? [['Del diferido', parte(v)] as [string, string]] : []),
                    ...tramosCruce.filter(k => b.porChokeEscalon[k][e] >= 0.5).map(k => [mayuscula(LARGO_TRAMO[k]), `${n0(b.porChokeEscalon[k][e])} bbl`] as [string, string])]}
                  aLaVista className={cn(fila, 'flex items-baseline gap-2 text-[12px]', v < 0.5 && 'text-[var(--tinta3)]')}>
                  <span className={cn('min-w-0 flex-1', norte && 'font-semibold')}>
                    {ESCALON[e]}
                    {norte && <small className="block text-[10px] font-normal text-[var(--tinta2)]">lo que TRIM tiene que bajar</small>}
                  </span>
                  <b className="tabular shrink-0 text-[13px]" data-escalon={e} data-bbl={v}>{n0(v)}</b>
                  <small className="tabular w-[42px] shrink-0 text-right text-[10px] text-[var(--tinta3)]">{v >= 0.5 ? parte(v) : ''}</small>
                </Tip>
              )
            })}
          </div>
        </div>

        {(b.porConfirmar >= 0.5 || inventario !== 0 || b.textoEstructural) && (
          <div className="mt-2 grid gap-1 text-[11px] text-[var(--tinta2)]">
            {b.porConfirmar >= 0.5 && (
              <p className="flex flex-wrap items-center gap-x-1">
                <span className="tabular">{n0(b.porConfirmar)} bbl con dónde se trabó por confirmar</span>
                <Info titulo="Por confirmar" texto="TRIM propuso el tramo, pero falta un dato que solo sabe una persona del campo (de dónde vino un corte de energía, si el oleoducto recibía). Mientras tanto cuentan donde los puso TRIM; se confirman en Identificar." />
              </p>
            )}
            {inventario !== 0 && (
              <p className="flex flex-wrap items-center gap-x-1">
                <FueraDeMeta si={!b.cuadra} tamano={11} />
                <span className="tabular">{inventario > 0 ? '+' : '−'}{n0(Math.abs(inventario))} bbl de inventario entre días{b.cuadra ? '' : ': más del 2,5 % del potencial, para revisar'}</span>
                <Info titulo="Inventario entre días" texto="Potencial menos lo medido no da exacto la suma de los eventos cuando el período corta meses: el tanque de venta guarda de un día para otro. No es de ningún tramo y no se reparte; en el mes entero da cero. Pasado el 2,5 % del potencial se marca para revisar (el umbral de cierre de la NSTA)." />
              </p>
            )}
            {b.textoEstructural && <p>{b.textoEstructural}</p>}
          </div>
        )}

        {global && b.porCampo.length > 1 && (
          <div className="mt-3 border-t border-[var(--linea2)] pt-2">
            <h3 className={`${titulo} mb-1`}>POR CAMPO</h3>
            {b.porCampo.map(c => {
              const nombre = campoPorId(c.campoId).nombre
              return (
                <div key={c.campoId} data-partible className={cn(fila, 'grid items-center gap-x-3 gap-y-0.5 sm:grid-cols-[minmax(110px,1fr)_minmax(0,2.4fr)_64px]')}
                  data-donde-se-trabo={c.campoId} data-total={c.diferido}>
                  <span className="min-w-0 truncate text-[12px]">{nombre}</span>
                  <span className="min-w-0">
                    {c.diferido >= 0.5
                      ? <BarraTramos valores={c.porChoke} leido={`${nombre}: ${leidoReparto(c.porChoke, c.diferido)}.`} alto="h-2" palabras={false} />
                      : <small className="text-[10.5px] text-[var(--tinta3)]">nada se trabó</small>}
                    {c.diferido >= 0.5 && <small className="tabular block text-[10.5px] text-[var(--tinta2)]">{textoReparto(c.porChoke)}</small>}
                  </span>
                  <b className="tabular text-[12.5px] sm:text-right">{n0(c.diferido)}<span className="sr-only"> bbl</span></b>
                </div>
              )
            })}
          </div>
        )}

        {tramosCruce.length > 0 && escalonesCruce.length > 0 && (
          <div className="mt-2.5">
            <button type="button" aria-expanded={cruce} aria-controls={idCruce} onClick={() => setCruce(x => !x)}
              className="no-imprimir flex min-h-6 cursor-pointer items-center gap-1 text-[11px] text-[var(--tinta2)] hover:text-[var(--tinta)]">
              <ChevronRight aria-hidden size={13} className={cn('transition-transform', cruce && 'rotate-90')} />
              Cada tramo por qué no se produjo
            </button>
            {/* Plegado en la pantalla; en el papel, desplegado. */}
            <div id={idCruce} className={cn('mt-1 overflow-x-auto', !cruce && 'hidden print:block')}>
              <h3 className={`${titulo} mb-1 hidden print:block`}>CADA TRAMO POR QUÉ NO SE PRODUJO</h3>
              <table className="tabular w-full min-w-[420px] border-collapse text-[11px]">
                <thead>
                  <tr className="text-[10px] text-[var(--tinta3)]">
                    <th scope="col" className="py-1 pr-2 text-left font-normal">bbl</th>
                    {escalonesCruce.map(e => <th key={e} scope="col" className="px-1.5 py-1 text-right font-normal">{ESCALON[e].split(':')[0]}</th>)}
                    <th scope="col" className="py-1 pl-1.5 text-right font-normal">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {tramosCruce.map((k: ChokeOSinAsignar) => (
                    <tr key={k} className="border-t border-[var(--linea2)]">
                      <th scope="row" className="py-1 pr-2 text-left font-normal">{mayuscula(LARGO_TRAMO[k])}</th>
                      {escalonesCruce.map(e => <td key={e} className="px-1.5 py-1 text-right">{b.porChokeEscalon[k][e] >= 0.5 ? n0(b.porChokeEscalon[k][e]) : '·'}</td>)}
                      <td className="py-1 pl-1.5 text-right font-semibold">{n0(b.porChoke[k])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <LeyendaTramos className="mt-2.5" />
      </div>
    </section>
  )
}
