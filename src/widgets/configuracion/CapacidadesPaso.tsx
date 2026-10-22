import type { ReactNode } from 'react'
import { useRango } from '@/app/store'
import {
  useTuberia, useTuberiaAgua, useRepartoChoke, NOMBRE_CHOKE_CAMPO,
  type TramoTuberia, type TrenTuberia, type ChokeCampo, type BombaDelTren,
} from '@/shared/api/choke'
import { pedirInicioDeHistoria } from '@/shared/api/calendario'
import { AHORA, fechaCorta } from '@/entities/reloj'
import { Panel, Boton, Hueco } from '@/shared/ui/primitivas'
import { Lectura } from '@/shared/ui/Lectura'
import { Info } from '@/shared/ui/Info'
import { n0, plural } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { EtiquetaFalta, Limita, MarcaFalta } from './marcas'

/** Las fuentes que pide la firma de una capacidad (U2 §8.4). */
const FUENTES = 'placa del equipo, prueba de capacidad, contrato de transporte, nominación aceptada o estimado de ingeniería'
const DEMO = 'dato del demo, sin firmar'

/** Paso 2 · Las capacidades de los tramos (U2 §8.4). Hoy son datos del demo
 *  (el esquema de planta y el tren de agua): se muestran marcados así y
 *  pasados por las reglas de la firma. No se escriben aquí todavía: la
 *  configuración no las trae. El paso a crudo nunca se escribe: lo calcula
 *  TRIM con el corte de agua de las pruebas. */
export function CapacidadesPaso({ campoId, campoNombre, onTecnica }: {
  campoId: string; campoNombre: string
  /** Lleva a la configuración técnica; sin él (quien solo lee) no se ofrece. */
  onTecnica?: () => void
}) {
  const rango = useRango()
  const tub = useTuberia(campoId, rango.desde, rango.hasta)
  const agua = useTuberiaAgua(campoId)
  const desde = pedirInicioDeHistoria()
  const historia = useRepartoChoke({ campos: [campoId], desde, hasta: AHORA })
  const tramo = (k: TramoTuberia['tramo']) => tub.tramos.find(t => t.tramo === k)
  const pozos = tramo('pozo'), planta = tramo('planta'), afuera = tramo('exportacion')
  const tren = (k: TrenTuberia['tren']) => planta?.trenes?.find(t => t.tren === k)
  const crudo = tren('crudo'), aguaTren = tren('agua'), gas = tren('gas')
  const bombas = agua.tramos.find(t => t.tramo === 'bombas')
  const inyectores = agua.tramos.find(t => t.tramo === 'inyectores')
  const sinEsquema = !tub.campoDeGas && planta?.potencialBpd == null && afuera?.potencialBpd == null

  // Las reglas de U2 §8.4 sobre los números que hay. Un número que no es mayor que
  // cero no se firmaría; dos tramos iguales al barril piden una explicación escrita.
  const numeros: Array<[string, number]> = [
    ...(crudo ? [['Tren de crudo', crudo.capacidad] as [string, number]] : []),
    ...(bombas?.bombas ?? []).map(b => [`${b.id}`, b.capacidadBpd] as [string, number]),
    ...(gas ? [['Tren de gas', gas.capacidad] as [string, number]] : []),
    ...(afuera?.subniveles ?? []).map(s => [s.nombre, s.potencialBpd] as [string, number]),
  ]
  const noPositivos = numeros.filter(([, v]) => !(v > 0))
  const potenciales: Array<[ChokeCampo, number]> = ([['pozos', pozos?.potencialBpd], ['planta', planta?.potencialBpd], ['exportacion', afuera?.potencialBpd]] as Array<[ChokeCampo, number | null | undefined]>)
    .flatMap(([k, v]) => (v == null ? [] : [[k, v] as [ChokeCampo, number]]))
  const empates = potenciales.flatMap(([a, x], i) => potenciales.slice(i + 1).filter(([, y]) => Math.round(x) === Math.round(y)).map(([b]) => ({ a, b, valor: x })))
  const superado = historia.superado.filter(s => s.campoId === campoId)
  const sujeto = (k: ChokeCampo) => NOMBRE_CHOKE_CAMPO[k].split(':')[0]!.toLowerCase()

  return (
    <>
      <Lectura>
        Cada tramo deja pasar como mucho su capacidad por día. La de los pozos sale de sus pruebas y no se escribe.
        La de la planta es la del más angosto de sus trenes medidos, y la de afuera, la del oleoducto o el
        transportador. El tren de agua no se escribe entero: se escribe cada bomba con su límite y TRIM muestra la
        suma. Lo que hoy viene del demo dice «{DEMO}».
      </Lectura>
      {tub.campoDeGas && (
        <div className="mb-2.5"><Hueco>
          {campoNombre} es un campo de gas. La tubería del gas todavía no está: el gas tiene «una tolerancia diferente» (Edinson) y falta definir cómo se mide su potencial.
        </Hueco></div>
      )}
      {sinEsquema && (
        <div className="mb-2.5"><Hueco>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {campoNombre} no tiene esquema de planta registrado: sin él no se sabe qué limita.
            {onTecnica && <Boton type="button" variante="chico" onClick={onTecnica}>Configurar</Boton>}
          </span>
        </Hueco></div>
      )}

      <div className="grid items-start gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,19rem),1fr))]">
        <Panel titulo="LOS POZOS" extra={pozos?.limita ? <Limita /> : undefined}>
          <Cifra valor={pozos?.potencialBpd ?? null} unidad="bbl/d de crudo" limita={!!pozos?.limita} />
          <p className="mt-1 text-[11px] text-[var(--tinta2)]">Sale de las pruebas de los pozos: no se escribe.</p>
        </Panel>

        <Panel titulo="LA PLANTA O ESTACIÓN" extra={planta?.limita ? <Limita /> : undefined}>
          <Cifra valor={planta?.potencialBpd ?? null} unidad="bbl/d de crudo" limita={!!planta?.limita}
            pie={planta?.potencialBpd != null ? 'el más angosto de sus trenes medidos' : undefined} />
          <div className="mt-2 grid gap-1.5">
            {crudo && (
              <Fila titulo="Tren de crudo" valor={crudo.capacidad} unidad={crudo.unidad} estado={<EtiquetaFalta>{DEMO}</EtiquetaFalta>}
                como="Se escribe a mano, con su fuente." />
            )}
            <Fila titulo="Tren de agua" valor={bombas?.potencialBpd ?? aguaTren?.capacidad ?? null} unidad="bbl/d de agua"
              enCrudo={bombas?.crudoBpd ?? aguaTren?.enCrudo ?? null}
              estado={bombas?.potencialBpd != null || aguaTren ? <EtiquetaFalta>{DEMO}</EtiquetaFalta> : <EtiquetaFalta>sin dato</EtiquetaFalta>}
              como="No se escribe el total: se escribe cada bomba con su límite, y TRIM muestra la suma.">
              {bombas?.bombas && bombas.bombas.length > 0 && <Bombas lista={bombas.bombas} />}
            </Fila>
            {gas ? (
              <Fila titulo="Tren de gas" valor={gas.capacidad} unidad={gas.unidad}
                estado={<span className="flex flex-wrap items-center gap-1"><EtiquetaFalta>gas · sin medir</EtiquetaFalta>
                  <Info titulo="Gas sin medir" texto="El gas no se mide en esta fase: no se puede saber si el tren de gas es el más angosto. Por eso no entra en lo que limita." /></span>}
                como="El gas va en KPC por día (miles de pies cúbicos). Se escribe a mano, y si se mide o no." />
            ) : !tub.campoDeGas && !sinEsquema && <p className="text-[11px] text-[var(--tinta2)]">Sin tren de gas en el esquema.</p>}
            <Fila titulo="Tratamiento de agua" valor={agua.tratamientoBpd} unidad="bbl/d de agua"
              estado={agua.tratamientoBpd == null ? <EtiquetaFalta>sin dato: no está en el esquema</EtiquetaFalta> : <EtiquetaFalta>{DEMO}</EtiquetaFalta>}
              como="Se escribe a mano, si el campo lo tiene." />
            <Fila titulo="Admisión de los inyectores" valor={agua.admisionInyectoresBpd} unidad="bbl/d de agua" enCrudo={inyectores?.crudoBpd ?? null}
              estado={agua.admisionInyectoresBpd == null ? <EtiquetaFalta>sin dato en el demo</EtiquetaFalta> : <EtiquetaFalta>{DEMO}</EtiquetaFalta>}
              como="Se escribe a mano, con la prueba de inyectividad: es un dato de la operadora." />
          </div>
        </Panel>

        <Panel titulo="AFUERA" extra={afuera?.limita ? <Limita /> : undefined}>
          <Cifra valor={afuera?.potencialBpd ?? null} unidad="bbl/d de crudo" limita={!!afuera?.limita}
            pie={afuera?.potencialBpd != null ? 'el oleoducto o el transportador' : undefined} />
          <div className="mt-2 grid gap-1.5">
            {(afuera?.subniveles ?? []).map((s, i) => (
              <Fila key={s.nombre} titulo={s.nombre} valor={s.potencialBpd} unidad="bbl/d de crudo"
                estado={i === 0 ? <EtiquetaFalta>{DEMO}</EtiquetaFalta> : (
                  <span className="flex flex-wrap items-center gap-1"><EtiquetaFalta>{DEMO}</EtiquetaFalta>
                    <Info titulo="Un subnivel de afuera" texto="El cliente o la nominación son un subnivel de afuera, no un tramo aparte: si el cliente no recibe, se trabó afuera. Su número no cambia lo que puede pasar afuera." /></span>
                )}
                como="Se escribe a mano, con su fuente y su fecha: la nominación cambia cada mes." />
            ))}
            {afuera?.potencialBpd != null && (
              <p className="flex items-start gap-1.5 text-[11px] text-[var(--tinta2)]"><span className="mt-[2px]"><MarcaFalta decorativa /></span>
                <span>Carrotanques, punto de despacho y nominación aceptada: sin dato en el demo.</span></p>
            )}
          </div>
        </Panel>
      </div>

      <Panel className="mt-2.5" titulo="REVISIÓN CON LAS REGLAS DE LA FIRMA" extra={campoNombre}>
        <ul className="grid gap-1.5 text-[11.5px]">
          <Regla ok={noPositivos.length === 0} texto={noPositivos.length === 0
            ? `Todas son mayores que cero (${plural(numeros.length, 'capacidad', 'capacidades')}).`
            : `Escriba un número mayor que cero: ${noPositivos.map(([n]) => n).join(', ')}.`} />
          {/* Sin tubería de crudo (campo de gas o sin esquema) no hay tramo que limite: la regla no aplica. */}
          {!tub.campoDeGas && !sinEsquema && <>
            <Regla ok={superado.length === 0} texto={superado.length === 0
              ? `Desde el ${fechaCorta(desde)}, lo real nunca pasó la capacidad del tramo que limitaba cada día: ese número no está por debajo de lo que ya pasó.`
              : `Por ${superado.length === 1 ? 'un día' : `${n0(superado.length)} días`} lo real pasó la capacidad del tramo que limitaba (${superado.slice(0, 3).map(s => `${fechaCorta(s.dia)}: ${n0(s.real)} bbl con ${sujeto(s.choke)} en ${n0(s.capacidad)}`).join('; ')}): ese número está por debajo de lo que ya pasó. Revise el número o la unidad.`} />
            <Regla falta texto="Los tramos que no limitaban todavía no se revisan contra lo que pasó por ellos: falta el máximo diario de cada tramo en los últimos 30 días." />
          </>}
          <Regla falta texto={`Ninguna tiene fuente firmada: son datos del demo. Al firmarlas, cada una dirá de dónde sale: ${FUENTES}.`} />
          {empates.map(x => (
            <Regla key={`${x.a}-${x.b}`} ok={false}
              texto={`Con estos números, ${sujeto(x.a)} y ${sujeto(x.b)} dan exactamente lo mismo (${n0(x.valor)} bbl/d). El método pide explicar un empate: escriba por qué.`} />
          ))}
        </ul>
      </Panel>

      <div className="mt-2.5">
        <Hueco>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            Estas capacidades no se firman aquí todavía: cuando la configuración las traiga, se escribirán con su fuente y
            pasarán por la vista previa y la firma. Lo que sí se firma hoy es el respaldo de cada bomba y los tanques de agua:
            cambian «si falla hoy» y entran en la vista previa del paso 3.
            {onTecnica && <Boton type="button" variante="chico" onClick={onTecnica}>Ir a la configuración técnica</Boton>}
          </span>
        </Hueco>
      </div>
    </>
  )
}

/** La cifra de un tramo, con doble contorno si es el que limita (gris, nunca rojo). */
function Cifra({ valor, unidad, limita, pie }: { valor: number | null; unidad: string; limita: boolean; pie?: string }) {
  if (valor == null) return <EtiquetaFalta>sin dato</EtiquetaFalta>
  return (
    <div className={cn('inline-block rounded px-2 py-1', limita ? 'border-[3px] border-double border-[var(--tinta)]' : 'border border-[var(--linea2)]')}>
      <span className="text-[18px] font-semibold tabular">{n0(valor)}</span> <span className="text-[11px] text-[var(--tinta3)]">{unidad}</span>
      {pie && <small className="block text-[10.5px] text-[var(--tinta2)]">{pie}</small>}
    </div>
  )
}

/** Un renglón de capacidad: el número en su unidad, en crudo si aplica, de dónde sale y cómo se llena. */
function Fila({ titulo, valor, unidad, enCrudo, estado, como, children }: {
  titulo: string; valor: number | null; unidad: string; enCrudo?: number | null; estado: ReactNode; como: string; children?: ReactNode
}) {
  return (
    <div className={cn('rounded border px-2 py-1.5', valor == null ? 'border-dashed border-[var(--tinta3)]' : 'border-[var(--linea2)]')}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <b className="text-[12px]">{titulo}</b>
        <span className="tabular text-[12px]">{valor == null ? '—' : <>{n0(valor)} <small className="text-[10.5px] text-[var(--tinta3)]">{unidad}</small></>}</span>
      </div>
      {enCrudo != null && (
        <p className="flex flex-wrap items-center justify-end gap-1 text-[10.5px] text-[var(--tinta2)]">
          ≈ {n0(enCrudo)} bbl/d de crudo
          <Info titulo="En crudo" texto="El paso a crudo nunca se escribe: TRIM lo calcula con el corte de agua de las pruebas, que cambia todos los días." />
        </p>
      )}
      <div className="mt-0.5">{estado}</div>
      {children}
      <p className="mt-0.5 text-[10.5px] text-[var(--tinta3)]">{como}</p>
    </div>
  )
}

/** Las bombas del tren de agua: cada una con su límite; la de reserva no suma. */
function Bombas({ lista }: { lista: BombaDelTren[] }) {
  return (
    <ul className="mt-1 grid gap-0.5 text-[11px]">
      {lista.map(b => (
        <li key={b.id} className="border-t border-[var(--linea2)] pt-0.5">
          <span className="flex flex-wrap items-baseline justify-between gap-x-2">
            <span><b>{b.id}</b> <span className="text-[var(--tinta3)]">{b.reserva ? 'de reserva: no suma' : b.papel === 'recobro' ? 'recobro' : 'disposición'}</span></span>
            <span className="tabular">{n0(b.capacidadBpd)}{b.placaBpd !== b.capacidadBpd && <small className="text-[var(--tinta3)]"> · placa {n0(b.placaBpd)}</small>}</span>
          </span>
          {b.respaldoLibreBpd != null && <small className="block text-[10px] text-[var(--tinta3)]">Si para, las demás toman {n0(b.respaldoLibreBpd)} bbl/d de su agua (respaldo firmado).</small>}
        </li>
      ))}
    </ul>
  )
}

/** Una regla de la firma y cómo sale con los números de hoy: forma y texto, en gris. */
function Regla({ ok, falta, texto }: { ok?: boolean; falta?: boolean; texto: string }) {
  return (
    <li className="flex items-start gap-1.5">
      <span className="mt-[2px] w-3 shrink-0 text-center font-bold leading-none" aria-hidden>
        {falta ? <MarcaFalta decorativa /> : ok ? '✓' : '✗'}
      </span>
      <span><span className="sr-only">{falta ? 'Falta: ' : ok ? 'Cumple: ' : 'No cumple: '}</span>{texto}</span>
    </li>
  )
}
