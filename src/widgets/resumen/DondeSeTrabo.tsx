import { useTuberia, useRepartoChoke, useBaseChoke, CHOKES_Y_SIN_ASIGNAR, type ChokeCampo, type TuberiaCampo } from '@/shared/api/choke'
import { campoPorId } from '@/entities/campos'
import { fechaCorta } from '@/entities/reloj'
import { Info } from '@/shared/ui/Info'
import { Chip } from '@/shared/ui/primitivas'
import { Lectura } from '@/shared/ui/Lectura'
import { n0 } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { BarraTramos, LeyendaTramos } from '@/widgets/diferidos/tramos'
import { LARGO_TRAMO, leidoReparto, textoReparto } from '@/widgets/diferidos/reparto'

/* «¿Dónde se trabó?» para el gerente (U2 §3, §6.5, §7.3 y §9.2): en qué
   tramo se trabó cada campo en el período, en barriles, con la frase que
   arma el motor (el tramo mayor y los equipos que más pesan) y la pérdida
   aparte. Sin la tubería, sin potenciales ni holguras, sin códigos de la ANH
   y sin la palabra «choke»: campo → dónde → qué equipo. */

const D = 86_400_000
const lista = (xs: readonly string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}`)
const SUJETO: Record<ChokeCampo, string> = { pozos: 'los pozos', planta: 'la planta', exportacion: 'afuera' }

/** «Para producir más…» (U2 §3.1 y §6.5): lo que limita HOY al campo dicho
 *  como decisión, en una línea y sin cifras. Lo decide el motor (`limita`,
 *  `casiIguales`); aquí solo se dice. Un campo de gas no tiene tubería de
 *  crudo todavía: no se dice nada. */
function paraProducirMas(t: Pick<TuberiaCampo, 'limita' | 'casiIguales' | 'campoDeGas'>): string | undefined {
  if (t.campoDeGas || !t.limita) return undefined
  if (t.casiIguales && t.casiIguales.length > 1)
    return `Para producir más: ampliar ${lista(t.casiIguales.map(k => SUJETO[k]))} (hoy están casi iguales: lo que se gane en uno lo frena el otro).`
  const frase: Record<ChokeCampo, string> = {
    pozos: 'Para producir más: sacarles más a los pozos (hoy limitan ellos; la planta y afuera dejan pasar más).',
    planta: 'Para producir más: ampliar la planta (hoy limita ella; abrir más pozos no da nada).',
    exportacion: 'Para producir más: más salida afuera, por oleoducto, transportador o nominación (hoy limita eso).',
  }
  return frase[t.limita]
}

/** Dónde se trabó un campo en el período: la barra por tramo (con «sin
 *  identificar» aparte), sus barriles, la frase del motor y lo que hay que
 *  saber para no leerla mal (lo que espera a una persona, el inventario entre
 *  días). El total es el diferido del libro: la misma cifra de «POR CAMPO»,
 *  de Diferidos y de la tubería (U2 §0, principio 6). */
export function DondeSeTraboCampo({ campoId, desde, hasta, className }: {
  campoId: string; desde: Date; hasta: Date; className?: string
}) {
  const t = useTuberia(campoId, desde, hasta)
  const b = useRepartoChoke({ campos: [campoId], desde, hasta })
  const nombre = campoPorId(campoId).nombre
  const v = b.porChoke
  const nada = b.diferido < 0.5
  // Lo que no es de ningún tramo (potencial − real − Σ de los eventos): el período corta meses.
  const inventario = Math.round(b.sinExplicar)
  const mas = paraProducirMas(t)
  return (
    <div className={cn('min-w-0', className)} data-donde-se-trabo={campoId} data-total={b.diferido}>
      {!nada && <BarraTramos valores={v} leido={`Dónde se trabó ${nombre} en el período: ${leidoReparto(v)}, el diferido del libro.`} />}
      {(!nada || inventario !== 0) && (
        <p className="tabular mt-0.5 flex flex-wrap items-center gap-x-1 text-[11px] text-[var(--tinta2)]">
          {!nada && <span>{textoReparto(v)} bbl</span>}
          {b.porConfirmar >= 0.5 && (
            <>
              <span className="text-[var(--tinta3)]">· {n0(b.porConfirmar)} por confirmar</span>
              <Info titulo="Por confirmar" texto={`TRIM propuso dónde se trabó en ${n0(b.porConfirmar)} bbl, pero falta un dato que solo sabe una persona del campo (por ejemplo, de dónde vino un corte de energía). Mientras tanto cuentan donde los puso TRIM.`} />
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
      <p className="text-[11.5px] leading-snug">{t.fraseGerente}</p>
      {mas && <p className="text-[10.5px] leading-snug text-[var(--tinta3)]">{mas}</p>}
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
      <LeyendaTramos className="mt-2.5" />
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
        <span>Por dónde se trabó · lo no planeado por día ({base.base.nombre} → con TRIM)</span>
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
