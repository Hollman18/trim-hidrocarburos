import { useId, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import {
  useTuberia, useRepartoChoke, useBaseChoke, useCriticidad, useArbolChoke, CHOKES_Y_SIN_ASIGNAR,
  type ChokeOSinAsignar, type EquipoBbl, type EscalonOSinClasificar,
} from '@/shared/api/choke'
import { campoPorId } from '@/entities/campos'
import { useRango } from '@/app/store'
import { periodoEnFrase } from '@/widgets/choke/palabras'
import { fechaCorta } from '@/entities/reloj'
import { Info } from '@/shared/ui/Info'
import { Chip } from '@/shared/ui/primitivas'
import { Lectura } from '@/shared/ui/Lectura'
import { n0, pctParte } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { BarraTramos, LeyendaTramos } from '@/widgets/diferidos/tramos'
import { LARGO_TRAMO, leidoReparto, textoReparto } from '@/widgets/diferidos/reparto'

/* «¿Dónde se trabó?» para el gerente (U2 §3, §6.5, §7.3 y §9.2): en qué
   tramo se trabó cada campo en el período, en barriles, con la frase que
   arma el motor (el tramo mayor y los equipos que más pesan) y la pérdida
   aparte. Sin la tubería, sin potenciales ni holguras, sin códigos de la ANH
   y sin la palabra «choke»: campo → dónde → qué equipo. */

const D = 86_400_000

/** Dónde se trabó un campo en el período, en DOS renglones (B-13; U2 §9.2): la
 *  barra por tramo con su palabra y su parte encima de cada segmento, y la frase
 *  que arma el motor (el tramo mayor y los equipos que más pesan, con su
 *  familia). Lo demás (los barriles de cada tramo, lo no planeado, lo que espera
 *  a una persona, el inventario entre días y lo que se gana desembotellando) va
 *  plegado en «Ver más de {campo}»; en el papel, desplegado. El total es el
 *  diferido del libro: la misma cifra de «POR CAMPO», de Diferidos y de la
 *  tubería (U2 §0, principio 6). */
export function DondeSeTraboCampo({ campoId, desde, hasta, className }: {
  campoId: string; desde: Date; hasta: Date; className?: string
}) {
  const t = useTuberia(campoId, desde, hasta)
  const b = useRepartoChoke({ campos: [campoId], desde, hasta })
  // Lo que se gana desembotellando (U2 §6.5): qué da producir más y qué da otra bomba de agua. Lo dice el motor.
  const mas = useCriticidad([campoId]).campos[0]?.desembotellar
  const rango = useRango()
  const [abierto, setAbierto] = useState(false)
  const idMas = useId()
  const nombre = campoPorId(campoId).nombre
  const v = b.porChoke
  const nada = b.diferido < 0.5
  // Lo que no es de ningún tramo (potencial − real − Σ de los eventos): el período corta meses.
  const inventario = Math.round(b.sinExplicar)
  const hayMas = !nada || inventario !== 0 || !!mas
  return (
    <div className={cn('min-w-0', className)} data-donde-se-trabo={campoId} data-total={b.diferido}>
      {!nada && <BarraTramos valores={v} conParte leido={`Dónde se trabó ${nombre} en el período: ${leidoReparto(v, b.diferido)}, el diferido del libro.`} />}
      {/* Sin barriles, el período en palabras: «Nada se trabó en octubre (en curso).» (B-39; U2 §1.5). */}
      <p className="mt-0.5 text-[11.5px] leading-snug" data-frase-gerente>{nada ? `Nada se trabó en ${periodoEnFrase(rango.nombre)}.` : t.fraseGerente}</p>
      {hayMas && (
        <>
          <button type="button" aria-expanded={abierto} aria-controls={idMas} onClick={() => setAbierto(x => !x)}
            className="no-imprimir mt-0.5 flex min-h-12 cursor-pointer items-center gap-1 text-[11px] text-[var(--tinta2)] hover:text-[var(--tinta)] sm:min-h-6">
            <ChevronRight aria-hidden size={13} className={cn('shrink-0 transition-transform', abierto && 'rotate-90')} />
            {abierto ? `Ver menos de ${nombre}` : `Ver más de ${nombre}`}
          </button>
          <div id={idMas} className={cn('pl-4', !abierto && 'hidden print:block')} data-ver-mas={campoId}>
            {(!nada || inventario !== 0) && (
              <p className="tabular flex flex-wrap items-center gap-x-1 text-[11px] text-[var(--tinta2)]">
                {!nada && <span>{textoReparto(v)} bbl</span>}
                {b.porConfirmar >= 0.5 && (
                  <>
                    <span className="text-[var(--tinta3)]">· {n0(b.porConfirmar)} bbl con el tramo sin confirmar</span>
                    <Info titulo="Con el tramo sin confirmar" texto={`TRIM propuso dónde se trabó en ${n0(b.porConfirmar)} bbl, pero falta un dato que solo sabe una persona del campo (por ejemplo, de dónde vino un corte de energía). Mientras tanto cuentan donde los puso TRIM.`} />
                  </>
                )}
                {inventario !== 0 && (
                  <>
                    <span className="text-[var(--tinta3)]">· {inventario > 0 ? '+' : '−'}{n0(Math.abs(inventario))} de inventario entre días</span>
                    <Info titulo="Inventario entre días" texto="El período corta meses: el tanque de venta guarda de un día para otro. No es de ningún tramo y no se reparte; en el mes entero da cero." />
                  </>
                )}
              </p>
            )}
            {!nada && <NoPlaneadoPorTramo campoId={campoId} desde={desde} hasta={hasta} equipos={b.porChokeEquipo} escalones={b.porChokeEscalon} />}
            {mas && <p className="text-[10.5px] leading-snug text-[var(--tinta3)]">{mas}</p>}
          </div>
        </>
      )}
    </div>
  )
}

/** Lo NO planeado de cada tramo, en barriles y en su parte del tramo: el
 *  indicador del norte (bajar las paradas que nadie programó). Es la cifra única
 *  del motor (D4): el escalón `disponibilidad-no-planeada` de cada tramo
 *  (`porChokeEscalon` del reparto), el mismo del árbol, del mes a mes y de la
 *  línea base. Para el gerente, sin códigos ni causas: el tramo, planeado o no y
 *  los equipos que más pesan. Lo que no tiene causa no se sabe si fue planeado
 *  (`sin-clasificar`): se dice así. Lo que no se produjo sin una falla
 *  (nominación, frecuencia bajada, el yacimiento) va aparte: no es planeado ni no planeado. */
function NoPlaneadoPorTramo({ campoId, desde, hasta, equipos, escalones }: {
  campoId: string; desde: Date; hasta: Date; equipos: Partial<Record<ChokeOSinAsignar, EquipoBbl[]>>
  escalones: Record<ChokeOSinAsignar, Record<EscalonOSinClasificar, number>>
}) {
  const arbol = useArbolChoke({ campos: [campoId], desde, hasta, orden: 'gestion' })
  const tramos = arbol.raiz.hijos.filter(h => h.bbl >= 0.5)
  if (!tramos.length) return null
  // El orden de la tubería (yacimiento, pozos, planta, afuera y, al final, lo sin identificar), como la barra.
  const orden = (k: string) => CHOKES_Y_SIN_ASIGNAR.indexOf(k as ChokeOSinAsignar)
  return (
    <div className="mt-1" data-no-planeado={campoId}>
      <p className="flex flex-wrap items-center gap-x-1 text-[10.5px] text-[var(--tinta3)]">
        <span>lo no planeado de cada tramo</span>
        <Info titulo="Lo no planeado" texto="Las paradas que nadie programó: fallas, disparos y terceros. Es lo que TRIM tiene que bajar. Lo que todavía no tiene causa no se sabe si fue planeado: va aparte, sin contarse como planeado ni como no planeado. Lo que no se produjo sin una falla (una nominación, la frecuencia bajada, el yacimiento) tampoco es una parada." />
      </p>
      <ul className="text-[11px]">
        {[...tramos].sort((a, b) => orden(a.valor) - orden(b.valor)).map(t => {
          const k = t.valor as ChokeOSinAsignar
          const e = escalones[k]
          const noPlaneado = e['disponibilidad-no-planeada'], planeado = e['disponibilidad-planeada'], sinSaber = e['sin-clasificar']
          const sinFalla = e.capacidad + e.desempeno + e.desarrollo
          const pct = t.bbl > 0 ? (noPlaneado / t.bbl) * 100 : 0
          const eqs = (equipos[k] ?? []).slice(0, 2).map(x => x.equipo)
          return (
            <li key={k} className="flex flex-wrap items-baseline gap-x-1.5 border-b border-[var(--linea2)] py-0.5 last:border-0"
              data-tramo-no-planeado={k} data-bbl={t.bbl} data-no-planeada={noPlaneado}>
              <span className="text-[var(--tinta2)]">{LARGO_TRAMO[k]}</span>
              <span className="tabular">{n0(t.bbl)} bbl</span>
              <span className="text-[var(--tinta3)]">·</span>
              {noPlaneado >= 0.5
                ? <b className="tabular font-semibold">no planeado {n0(noPlaneado)} ({pctParte(pct)})</b>
                : <span className="text-[var(--tinta2)]">{sinSaber >= 0.5 ? 'sin saber si fue planeado' : 'nada no planeado'}</span>}
              {noPlaneado >= 0.5 && planeado >= 0.5 && <span className="tabular text-[var(--tinta2)]">· planeado {n0(planeado)}</span>}
              {noPlaneado >= 0.5 && sinSaber >= 0.5 && <span className="tabular text-[var(--tinta3)]">· {n0(sinSaber)} bbl sin saber si fueron planeados</span>}
              {sinFalla >= 0.5 && <span className="tabular text-[var(--tinta3)]">· {n0(sinFalla)} bbl sin una falla</span>}
              {eqs.length > 0 && <span className="min-w-0 text-[var(--tinta3)]">· {eqs.join(', ')}</span>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** La pérdida va aparte y nunca se suma a lo diferido (U2 §9.2; P1 §1.9).
 *  TRIM todavía no registra eventos de pérdida: este es su estado vacío. */
export function LineaPerdida({ className }: { className?: string }) {
  return (
    <p data-perdida="" className={cn('flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-[var(--tinta2)]', className)}>
      <span className="font-cond text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]">PÉRDIDA</span>
      <span>· lo que salió y no se vendió:</span>
      <span className="text-[var(--tinta3)]">sin eventos registrados en el período</span>
      <Info titulo="Pérdida" texto="Lo producido que no se vendió: pitera, derrame o tea. Va aparte y nunca se suma a los barriles diferidos: son dos cifras distintas. Cuando TRIM registre pérdidas, van aquí, campo por campo." />
    </p>
  )
}

/** «Dónde se trabó» de los campos que se miran, en un panel propio (el
 *  Resumen de un solo campo y Diferidos del gerente). Con varios campos, cada
 *  uno con su nombre y su total; la leyenda una sola vez, abajo. */
export function PanelDondeSeTrabo({ campos, desde, hasta, conPerdida = false, className }: {
  campos: string[]; desde: Date; hasta: Date; conPerdida?: boolean; className?: string
}) {
  // Sin ninguna barra, la leyenda no tiene qué explicar (B-39).
  const total = useRepartoChoke({ campos, desde, hasta }).diferido
  const titulo = 'font-cond text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]'
  return (
    <section id="por-donde-se-trabo" className={cn('rounded border border-[var(--linea)] bg-[var(--panel)] p-4 shadow-[var(--sombra)]', className)}>
      <h3 className={titulo}>DÓNDE SE TRABÓ</h3>
      <Lectura>
        En qué parte del campo empezó lo que costó barriles en el período: en el yacimiento, en los
        pozos, en la planta o estación, o afuera (oleoducto, transportador o cliente). Lo que nadie ha
        identificado va aparte, rayado: no se reparte. La barra suma los barriles diferidos del período,
        los mismos de arriba.
      </Lectura>
      <div className="mt-1.5 grid gap-3">
        {campos.map(c => (
          <div key={c} data-partible className="min-w-0 border-b border-[var(--linea2)] pb-2.5 last:border-0 last:pb-0">
            {campos.length > 1 && <b className="mb-1 block text-[12.5px]">{campoPorId(c).nombre}</b>}
            <DondeSeTraboCampo campoId={c} desde={desde} hasta={hasta} />
          </div>
        ))}
      </div>
      {total >= 0.5 && <LeyendaTramos className="mt-2.5" />}
      {conPerdida && <LineaPerdida className="mt-2.5 border-t border-[var(--linea2)] pt-2" />}
    </section>
  )
}

/** «Antes → con TRIM» por tramo (U2 §7.3): lo no planeado por día de cada
 *  tramo en los tres meses publicados antes de TRIM y desde que entró, con
 *  las dos flechas, la que baja y la que sube. Con menos de tres meses de
 *  TRIM lleva la marca de muestra corta: un mes no afirma una mejora. */
export function AntesConTrimPorTramo({ campos, desde, hasta }: { campos: string[]; desde: Date; hasta: Date }) {
  const base = useBaseChoke({ campos, desde, hasta })
  if (!base) return <p className="mt-2 text-[11px] text-[var(--tinta3)]">Por dónde se trabó: sin tres meses publicados antes de TRIM con qué comparar.</p>
  const filas = CHOKES_Y_SIN_ASIGNAR.filter(k => Math.max(base.noPlaneado[k].baseDia, base.noPlaneado[k].periodoDia) >= 0.5)
  const dias = (Math.min(base.periodo.hasta.getTime(), hasta.getTime()) - base.periodo.desde.getTime()) / D
  const corta = dias < 90
  const flecha = (c: number | null) => {
    if (c === null) return { t: '—', l: 'sin base' }
    const r = Math.round(Math.abs(c) * 100)
    return r === 0 ? { t: 'igual', l: 'sin cambio' } : c < 0 ? { t: `↓ ${n0(r)} %`, l: `bajó ${n0(r)} por ciento` } : { t: `↑ ${n0(r)} %`, l: `subió ${n0(r)} por ciento` }
  }
  return (
    <div className="mt-2.5" data-antes-con-trim="">
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-[var(--tinta2)]">
        <span>Por dónde se trabó · lo no planeado por día ({base.base.nombre} → con TRIM, desde el {fechaCorta(base.periodo.desde)})</span>
        <Info titulo="Antes → con TRIM, por tramo"
          texto={`Lo no planeado por día de cada tramo: antes de TRIM (${base.base.nombre}, los tres meses publicados antes del ${fechaCorta(base.periodo.desde)}) y con TRIM (desde el ${fechaCorta(base.periodo.desde)}). Van las dos flechas, la que baja y la que sube: un solo porcentaje escondería dónde está el trabajo pendiente.${corta ? ' Un mes es poco para afirmar una mejora: la comparación vale cuando haya tres meses.' : ''}`} />
        {corta && <Chip>muestra corta</Chip>}
      </p>
      {filas.length === 0
        ? <p className="text-[11px] text-[var(--tinta3)]">Nada no planeado en los dos períodos.</p>
        : (
          <dl className="mt-0.5 grid grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-x-3 text-[11.5px]">
            {filas.map(k => {
              const x = base.noPlaneado[k], f = flecha(x.cambio)
              return (
                <div key={k} className="contents">
                  <dt className="min-w-0 truncate text-[var(--tinta2)]">{LARGO_TRAMO[k]}</dt>
                  <dd className="tabular m-0 text-right">{n0(x.baseDia)} → <b>{n0(x.periodoDia)}</b> <small className="text-[10px] text-[var(--tinta3)]">bbl/d</small></dd>
                  <dd className="tabular m-0 text-right text-[11px] text-[var(--tinta2)]"><span aria-hidden>{f.t}</span><span className="sr-only">{f.l}</span></dd>
                </div>
              )
            })}
          </dl>
        )}
      <p className="mt-0.5 text-[11px] text-[var(--tinta2)]">{base.texto}</p>
    </div>
  )
}
