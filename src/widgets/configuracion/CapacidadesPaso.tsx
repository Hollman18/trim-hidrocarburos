import { useId, useState, type ReactNode } from 'react'
import { useRango } from '@/app/store'
import {
  useTuberia, useCapacidades, useRepartoChoke, revisarCapacidades, cifraFactor, NOMBRE_CHOKE_CAMPO, FUENTES_CAPACIDAD, NOMBRE_FUENTE_CAPACIDAD,
  TOPE_FACTOR_MEDICION,
  type TramoTuberia, type TrenTuberia, type ChokeCampo, type CapacidadesCampo, type CapacidadFirmada, type CapacidadVigente,
  type FuenteCapacidad, type HallazgoCapacidad, type BombaVigente, type VistaCapacidades, type FactorMedicionFirmado,
} from '@/shared/api/choke'
import { pedirInicioDeHistoria } from '@/shared/api/calendario'
import { AHORA, fechaCorta, fechaHora } from '@/entities/reloj'
import { Panel, Boton, Hueco, Chip } from '@/shared/ui/primitivas'
import { Lectura } from '@/shared/ui/Lectura'
import { Info } from '@/shared/ui/Info'
import { MarcaPrioridad } from '@/shared/ui/Prioridad'
import { n0 } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { EtiquetaFalta, Limita, MarcaFalta } from './marcas'

type Simple = 'crudo' | 'afuera' | 'mercado' | 'tratamiento' | 'admision'
const CAJA = 'min-h-8 w-full min-w-0 rounded border border-[var(--linea)] bg-[var(--panel2)] px-2 py-1 text-[14px] outline-none focus:border-acento disabled:opacity-70'

/** Paso 2 · Las capacidades de los tramos (U2 §8.4): lo que deja pasar cada
 *  tramo por día, escrito con su fuente. Lo que no se escribe sigue con el dato
 *  del demo, marcado así. Lo escrito queda en el borrador de la configuración
 *  (`Config.capacidades`) y se firma en el paso 3 con lo demás; las reglas de la
 *  firma (`revisarCapacidades`, las mismas del servidor) se revisan aquí mientras
 *  se escribe. El paso a crudo nunca se escribe: lo calcula TRIM con el corte de
 *  agua de las pruebas. Debajo, el factor de medición de los pozos (D3): lo que
 *  propone TRIM va prellenado y se firma con lo demás (`FactorMedicion`). Quien
 *  no firma (producción, confiabilidad) lo lee. */
export function CapacidadesPaso({ campoId, campoNombre, puede, propuesta, onCambio, onTecnica }: {
  campoId: string; campoNombre: string
  /** Lo escribe quien firma la configuración técnica (`config:firmar`). */
  puede: boolean
  /** Lo que el borrador lleva de las capacidades de este campo (lo firmado, con lo escrito encima). */
  propuesta: CapacidadesCampo | undefined
  onCambio: (c: CapacidadesCampo | undefined) => void
  /** Lleva a la configuración técnica; sin él (quien solo lee) no se ofrece. */
  onTecnica?: () => void
}) {
  const rango = useRango()
  const vista = useCapacidades(campoId)
  const tub = useTuberia(campoId, rango.desde, rango.hasta)
  const desde = pedirInicioDeHistoria()
  const historia = useRepartoChoke({ campos: [campoId], desde, hasta: AHORA })
  const v = vista.vigentes
  const tramo = (k: TramoTuberia['tramo']) => tub.tramos.find(t => t.tramo === k)
  const pozos = tramo('pozo'), planta = tramo('planta'), afuera = tramo('exportacion')
  const tren = (k: TrenTuberia['tren']) => planta?.trenes?.find(t => t.tren === k)
  const sinEsquema = !tub.campoDeGas && v.crudo.estado === 'sin-dato' && v.afuera.estado === 'sin-dato'
  // Las reglas de la firma sobre lo que se firmaría (o, sin nada escrito, sobre lo que rige): las del motor.
  const hallazgos = revisarCapacidades(propuesta, vista.entrada)
  const deTramo = (t: HallazgoCapacidad['tramo'], equipo?: string) => hallazgos.filter(h => h.tramo === t && (equipo === undefined || h.equipo === equipo))
  const superado = historia.superado.filter(s => s.campoId === campoId)
  const sujeto = (k: ChokeCampo) => NOMBRE_CHOKE_CAMPO[k].split(':')[0]!.toLowerCase()

  /** El borrador con un cambio: lo que queda vacío no viaja; un campo sin nada escrito, tampoco. */
  const conCambio = (cambio: Partial<CapacidadesCampo>) => {
    const n: Record<string, unknown> = { ...(propuesta ?? { campoId }), ...cambio, campoId }
    for (const k of Object.keys(n)) if (n[k] === undefined) delete n[k]
    if (Array.isArray(n.bombas) && !n.bombas.length) delete n.bombas
    onCambio(Object.keys(n).length > 1 ? n as unknown as CapacidadesCampo : undefined)
  }
  const escribir = (k: Simple) => (x: CapacidadFirmada | undefined) => conCambio({ [k]: x })
  const escribirBomba = (equipo: string) => (x: CapacidadFirmada | undefined) => {
    const otras = (propuesta?.bombas ?? []).filter(b => b.equipo !== equipo)
    conCambio({ bombas: x ? [...otras, { equipo, ...x }] : otras })
  }
  const hayEmpate = deTramo('empate').length > 0 || !!propuesta?.explicacionEmpate
  const idEmpate = useId()

  return (
    <>
      <Lectura>
        Cada tramo deja pasar como mucho su capacidad por día. La de los pozos sale de sus pruebas y no se escribe:
        se firma solo el factor de medición con que se leen. La de la planta es la del más angosto de sus trenes
        medidos, y la de afuera, la del oleoducto o el transportador. El tren de agua no se escribe entero: se
        escribe cada bomba con su límite y TRIM muestra la suma. Cada número va con su fuente; lo que no se escriba
        sigue con el dato del demo, marcado así. Lo escrito queda en el borrador y se firma en el paso 3.
      </Lectura>
      <p className="mb-2 flex flex-wrap items-center gap-x-1.5 text-[14px] text-[var(--tinta2)]" data-firma-capacidades>
        {vista.firma
          ? <>Las que rigen se firmaron en la versión {vista.firma.version} el {fechaHora(new Date(vista.firma.fecha))} por {vista.firma.por}.</>
          : <>Ninguna está firmada todavía: rigen los datos del demo.</>}
      </p>
      {tub.campoDeGas && (
        <div className="mb-2.5"><Hueco>
          {campoNombre} es un campo de gas. La tubería del gas todavía no está: el gas tiene una tolerancia diferente y falta definir cómo se mide su potencial.
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
          <Cifra valor={vista.entrada.pozosBpd} unidad="bbl/d de crudo" limita={!!pozos?.limita} />
          <p className="mt-1 text-[13px] text-[var(--tinta2)]">
            Sale de las pruebas de los pozos{v.factorMedicion.estado === 'firmado' ? ` × el factor de medición firmado (${cifraFactor(v.factorMedicion.valor)})` : ''}: no se escribe.
            {pozos?.pruebaMasVieja ? ` ${pozos.pruebaMasVieja.texto[0]!.toUpperCase()}${pozos.pruebaMasVieja.texto.slice(1)}.` : ''}
          </p>
        </Panel>

        <Panel titulo="LA PLANTA O ESTACIÓN" extra={planta?.limita ? <Limita /> : undefined}>
          <Cifra valor={planta?.potencialBpd ?? null} unidad="bbl/d de crudo" limita={!!planta?.limita}
            pie={planta?.potencialBpd != null ? 'el más angosto de sus trenes medidos' : undefined} />
          <div className="mt-2 grid gap-1.5">
            <Capacidad titulo="Tren de crudo" vigente={v.crudo} escrita={propuesta?.crudo} puede={puede} hallazgos={deTramo('crudo')}
              onEscribir={escribir('crudo')} />
            <Fila titulo="Tren de agua" vigente={v.agua} enCrudo={tren('agua')?.enCrudo ?? null}
              como="No se escribe el total: se escribe cada bomba con su límite, y TRIM muestra la suma.">
              {v.bombas.length > 0 && (
                <ul className="mt-1 grid gap-1">
                  {v.bombas.map(b => (
                    <li key={b.equipo}>
                      <Bomba b={b} escrita={propuesta?.bombas?.find(x => x.equipo === b.equipo)} puede={puede}
                        hallazgos={deTramo('bomba', b.equipo)} onEscribir={escribirBomba(b.equipo)} />
                    </li>
                  ))}
                </ul>
              )}
            </Fila>
            {v.gas.estado !== 'sin-dato' || propuesta?.gas ? (
              <Capacidad titulo="Tren de gas" vigente={v.gas} escrita={propuesta?.gas} puede={puede} hallazgos={deTramo('gas')}
                onEscribir={x => conCambio({ gas: x ? { ...x, medido: propuesta?.gas?.medido ?? v.gas.medido } : undefined })}
                extra={(
                  <label className="flex items-center gap-1.5 text-[13px]">
                    <input type="checkbox" disabled={!puede} checked={propuesta?.gas?.medido ?? v.gas.medido}
                      onChange={e => conCambio({ gas: { bpd: propuesta?.gas?.bpd ?? v.gas.valor ?? NaN, fuente: propuesta?.gas?.fuente ?? v.gas.fuenteFirmada ?? ('' as FuenteCapacidad), medido: e.target.checked } })} />
                    Se mide
                    <Info titulo="Gas sin medir" texto="Un tren de gas sin medir no entra en lo que limita: no se puede saber si es el más angosto." />
                  </label>
                )} />
            ) : !tub.campoDeGas && !sinEsquema && <p className="text-[13px] text-[var(--tinta2)]">Sin tren de gas en el esquema.</p>}
            <Capacidad titulo="Tratamiento de agua" vigente={v.tratamiento} escrita={propuesta?.tratamiento} puede={puede} hallazgos={deTramo('tratamiento')}
              onEscribir={escribir('tratamiento')} />
            <Capacidad titulo="Admisión de los inyectores" vigente={v.admision} escrita={propuesta?.admision} puede={puede} hallazgos={deTramo('admision')}
              onEscribir={escribir('admision')} como="Con la prueba de inyectividad: es un dato de la operadora." />
          </div>
        </Panel>

        <Panel titulo="AFUERA" extra={afuera?.limita ? <Limita /> : undefined}>
          <Cifra valor={afuera?.potencialBpd ?? null} unidad="bbl/d de crudo" limita={!!afuera?.limita}
            pie={afuera?.potencialBpd != null ? 'el oleoducto o el transportador' : undefined} />
          <div className="mt-2 grid gap-1.5">
            <Capacidad titulo="El oleoducto o el transportador" vigente={v.afuera} escrita={propuesta?.afuera} puede={puede} hallazgos={deTramo('afuera')}
              onEscribir={escribir('afuera')} />
            <Capacidad titulo="El cliente o la nominación" vigente={v.mercado} escrita={propuesta?.mercado} puede={puede} hallazgos={deTramo('mercado')}
              onEscribir={escribir('mercado')} como="Es un subnivel de afuera: si el cliente no recibe, se trabó afuera. La nominación cambia cada mes: escríbala con su fecha en el motivo." />
          </div>
        </Panel>
      </div>

      <FactorMedicion vista={vista} campoNombre={campoNombre} puede={puede} escrito={propuesta?.factorMedicion} campoDeGas={tub.campoDeGas}
        hallazgos={deTramo('factor')} onEscribir={x => conCambio({ factorMedicion: x })} />

      {hayEmpate && (
        <Panel className="mt-2.5" titulo="EXPLICAR EL EMPATE" extra={campoNombre}>
          <label htmlFor={idEmpate} className="mb-0.5 block text-[13px] text-[var(--tinta2)]">
            Dos tramos que dan exactamente lo mismo se explican por escrito (NSTA §5.4): va con la firma de las capacidades.
          </label>
          <textarea id={idEmpate} rows={2} disabled={!puede} value={propuesta?.explicacionEmpate ?? ''}
            onChange={e => conCambio({ explicacionEmpate: e.target.value || undefined })}
            placeholder="Ej.: el oleoducto se dimensionó con la planta" className={cn(CAJA, 'resize-y')} />
        </Panel>
      )}

      <Panel className="mt-2.5" titulo="REVISIÓN CON LAS REGLAS DE LA FIRMA" extra={campoNombre}>
        {hallazgos.length === 0
          ? <p className="text-[14px] text-[var(--tinta2)]">Todas cumplen las reglas de la firma.</p>
          : <ul className="grid gap-1.5 text-[14px]">{hallazgos.map(h => <Regla key={`${h.tramo}-${h.equipo ?? ''}-${h.texto}`} h={h} />)}</ul>}
        {!tub.campoDeGas && !sinEsquema && (
          <p className="mt-1.5 text-[13px] text-[var(--tinta2)]">
            {superado.length === 0
              ? `Desde el ${fechaCorta(desde)}, lo real nunca pasó la capacidad del tramo que limitaba cada día.`
              : `Por ${superado.length === 1 ? 'un día' : `${n0(superado.length)} días`} lo real pasó la capacidad del tramo que limitaba (${superado.slice(0, 3).map(s => `${fechaCorta(s.dia)}: ${n0(s.real)} bbl con ${sujeto(s.choke)} en ${n0(s.capacidad)}`).join('; ')}).`}
          </p>
        )}
      </Panel>

      <div className="mt-2.5">
        <Hueco>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {puede
              ? 'Lo escrito queda en el borrador: el paso 3 muestra lo que cambia (qué limita hoy y «si falla hoy») y ahí se firma, con el respaldo de cada bomba y los tanques de la configuración técnica.'
              : 'Las capacidades las escribe y las firma el administrador de la implementación.'}
            {onTecnica && <Boton type="button" variante="chico" onClick={onTecnica}>Ir a la configuración técnica</Boton>}
          </span>
        </Hueco>
      </div>
    </>
  )
}

/** El factor de medición de los pozos (D3; 5E·H9): con cuánto se leen las
 *  pruebas para que digan lo que mide el punto oficial. Lo que TRIM propone
 *  (la mediana de los días sin paradas, del motor) va prellenado con su porqué;
 *  va en la firma cuando se marca «Firmar este factor» o se cambia la cifra o el
 *  porqué, y se firma en el paso 3 con lo demás. Sin firma rige 1: el motor no
 *  usa la propuesta. En un campo de gas no se ofrece: la eficiencia de crudo no aplica. */
function FactorMedicion({ vista, campoNombre, puede, escrito, campoDeGas, hallazgos, onEscribir }: {
  vista: VistaCapacidades; campoNombre: string; puede: boolean
  /** Lo que el borrador lleva del factor de este campo (lo firmado, con lo escrito encima). */
  escrito: FactorMedicionFirmado | undefined
  campoDeGas: boolean; hallazgos: HallazgoCapacidad[]
  onEscribir: (x: FactorMedicionFirmado | undefined) => void
}) {
  const rige = vista.vigentes.factorMedicion, firma = vista.firmaFactor, pr = vista.factorMedicionPropuesto
  // Prellenado con lo que propone TRIM; lo que se escriba queda aquí aunque se quite de la firma.
  const [cifra, setCifra] = useState(() => String(escrito?.valor ?? pr.valor ?? ''))
  const [porque, setPorque] = useState(() => escrito?.porque ?? (pr.valor !== undefined ? pr.texto : ''))
  const enFirma = !!escrito
  const numero = (t: string) => (t.trim() === '' ? NaN : Number(t.replace(',', '.')))
  const idCifra = useId(), idPorque = useId()
  return (
    <Panel className="mt-2.5" titulo="EL FACTOR DE MEDICIÓN DE LOS POZOS" extra={campoNombre}>
      <div data-factor-medicion>
        <Lectura>
          Las pruebas de los pozos se miden con el separador de prueba; lo real, con el punto de medición oficial. El
          factor de medición dice por cuánto hay que multiplicar las pruebas para que digan lo que mide el punto
          oficial. Con él se calcula lo que dan los pozos, lo que limita y la eficiencia de producción. Sin firma rige 1.
        </Lectura>
        {/* En línea y con sus espacios: el lector de pantalla lee «Rige 1,000 sin firmar las pruebas como vienen», no todo pegado. */}
        <p className="text-[14px] leading-relaxed" data-factor-rige>
          <b className="font-semibold">Rige {cifraFactor(rige.valor)}</b>{' '}
          {rige.estado === 'firmado'
            ? <>{firma ? `· firmado en la versión ${firma.version} el ${fechaHora(new Date(firma.fecha))} por ${firma.por}` : '· firmado'}{rige.porque ? `: «${rige.porque}»` : ''}</>
            : <><EtiquetaFalta>sin firmar</EtiquetaFalta> <span className="text-[var(--tinta2)]">las pruebas como vienen</span></>}
        </p>
        <div className="mt-1.5 rounded border border-dashed border-[var(--tinta3)] px-2 py-1.5 text-[14px]" data-factor-propuesto>
          <p>
            <b className="font-semibold">{pr.valor !== undefined ? <>TRIM propone <span className="tabular">{cifraFactor(pr.valor)}</span></> : 'TRIM no lo propone'}</b>{' '}
            <span className="text-[13px] text-[var(--tinta3)]">propuesta de TRIM, sin firmar: no rige hasta que se firme</span>
          </p>
          <p className="mt-0.5 text-[var(--tinta2)]">{pr.texto}</p>
        </div>
        {puede && !campoDeGas && (
          <div className="mt-1.5 grid gap-1.5">
            <div className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)] items-start gap-1.5">
              <label htmlFor={idCifra} className="text-[13px] text-[var(--tinta2)]">Factor de medición</label>
              <label htmlFor={idPorque} className="text-[13px] text-[var(--tinta2)]">¿Por qué? De dónde sale el número</label>
              <input id={idCifra} type="number" min={TOPE_FACTOR_MEDICION.minimo} max={TOPE_FACTOR_MEDICION.maximo} step={0.001} value={cifra} placeholder="1"
                onChange={e => { setCifra(e.target.value); onEscribir({ valor: numero(e.target.value), porque }) }} className={cn(CAJA, 'tabular')} />
              <textarea id={idPorque} rows={2} value={porque}
                onChange={e => { setPorque(e.target.value); onEscribir({ valor: numero(cifra), porque: e.target.value }) }} className={cn(CAJA, 'resize-y')} />
            </div>
            <label className="flex items-center gap-1.5 text-[14px]">
              <input type="checkbox" checked={enFirma} onChange={e => onEscribir(e.target.checked ? { valor: numero(cifra), porque } : undefined)} />
              Firmar este factor de medición
              <Info titulo="Firmar el factor" texto="Marcado, el factor va en el borrador y se firma en el paso 3 con las capacidades. Sin marcar, rige el que ya está firmado o, sin firma, 1: TRIM no usa su propuesta sola." />
            </label>
          </div>
        )}
        {hallazgos.length > 0 && <ul className="mt-1 grid gap-0.5 text-[13px]">{hallazgos.map(h => <Regla key={h.texto} h={h} />)}</ul>}
      </div>
    </Panel>
  )
}

/** La cifra de un tramo, con doble contorno si es el que limita (gris, nunca rojo). */
function Cifra({ valor, unidad, limita, pie }: { valor: number | null; unidad: string; limita: boolean; pie?: string }) {
  if (valor == null) return <EtiquetaFalta>sin dato</EtiquetaFalta>
  return (
    <div className={cn('inline-block rounded px-2 py-1', limita ? 'border-[3px] border-double border-[var(--tinta)]' : 'border border-[var(--linea2)]')}>
      <span className="text-[18px] font-semibold tabular">{n0(valor)}</span> <span className="text-[13px] text-[var(--tinta3)]">{unidad}</span>
      {pie && <small className="block text-[13px] text-[var(--tinta2)]">{pie}</small>}
    </div>
  )
}

/** De dónde sale lo que rige: firmado (con su fuente) o del demo, sin firmar. */
function Estado({ vigente }: { vigente: Pick<CapacidadVigente, 'estado' | 'fuente'> }) {
  return (
    <span className="flex flex-wrap items-center gap-1 text-[13px] text-[var(--tinta2)]">
      {vigente.estado === 'firmado' ? <Chip>firmado</Chip> : <EtiquetaFalta>{vigente.estado === 'demo' ? 'dato del demo, sin firmar' : 'sin dato'}</EtiquetaFalta>}
      <span className="min-w-0 break-words">{vigente.fuente}</span>
    </span>
  )
}

/** Un renglón que no se escribe (el tren de agua: la suma de sus bombas). */
function Fila({ titulo, vigente, enCrudo, como, children }: { titulo: string; vigente: CapacidadVigente; enCrudo?: number | null; como: string; children?: ReactNode }) {
  return (
    <div className={cn('rounded border px-2 py-1.5', vigente.valor == null ? 'border-dashed border-[var(--tinta3)]' : 'border-[var(--linea2)]')}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <b className="text-[14px]">{titulo}</b>
        <span className="tabular text-[14px]">{vigente.valor == null ? '—' : <>{n0(vigente.valor)} <small className="text-[13px] text-[var(--tinta3)]">{vigente.unidad}</small></>}</span>
      </div>
      {enCrudo != null && (
        <p className="flex flex-wrap items-center justify-end gap-1 text-[13px] text-[var(--tinta2)]">
          ≈ {n0(enCrudo)} bbl/d de crudo
          <Info titulo="En crudo" texto="El paso a crudo nunca se escribe: TRIM lo calcula con el corte de agua de las pruebas, que cambia todos los días." />
        </p>
      )}
      <div className="mt-0.5"><Estado vigente={vigente} /></div>
      {children}
      <p className="mt-0.5 text-[13px] text-[var(--tinta3)]">{como}</p>
    </div>
  )
}

/** Un número que se escribe: lo que rige, la cifra y su fuente, y lo que la revisión dice de él. */
function Capacidad({ titulo, vigente, escrita, puede, hallazgos, onEscribir, como, extra }: {
  titulo: string; vigente: CapacidadVigente; escrita: CapacidadFirmada | undefined; puede: boolean
  hallazgos: HallazgoCapacidad[]; onEscribir: (x: CapacidadFirmada | undefined) => void; como?: string; extra?: ReactNode
}) {
  return (
    <div className={cn('rounded border px-2 py-1.5', vigente.valor == null && !escrita ? 'border-dashed border-[var(--tinta3)]' : 'border-[var(--linea2)]')} data-capacidad={vigente.tramo}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <b className="text-[14px]">{titulo}</b>
        <span className="tabular text-[14px]">{vigente.valor == null ? '—' : <>{n0(vigente.valor)} <small className="text-[13px] text-[var(--tinta3)]">{vigente.unidad}</small></>}</span>
      </div>
      <div className="mt-0.5"><Estado vigente={vigente} /></div>
      <Escribir nombre={titulo} unidad={vigente.unidad} rige={vigente.valor} fuenteRige={vigente.fuenteFirmada} escrita={escrita} puede={puede} onEscribir={onEscribir} />
      {extra}
      {hallazgos.length > 0 && <ul className="mt-1 grid gap-0.5 text-[13px]">{hallazgos.map(h => <Regla key={h.texto} h={h} />)}</ul>}
      {como && <p className="mt-0.5 text-[13px] text-[var(--tinta3)]">{como}</p>}
    </div>
  )
}

/** Una bomba del tren de agua: su límite en este campo (la placa solo se lee); la de reserva no suma. */
function Bomba({ b, escrita, puede, hallazgos, onEscribir }: {
  b: BombaVigente; escrita: CapacidadFirmada | undefined; puede: boolean; hallazgos: HallazgoCapacidad[]; onEscribir: (x: CapacidadFirmada | undefined) => void
}) {
  return (
    <div className="border-t border-[var(--linea2)] pt-1 text-[13px]" data-bomba={b.equipo}>
      <span className="flex flex-wrap items-baseline justify-between gap-x-2">
        <span><b>{b.equipo}</b> <span className="text-[var(--tinta3)]">{b.reserva ? 'de reserva: no suma' : b.papel === 'recobro' ? 'recobro' : 'disposición'}</span></span>
        <span className="tabular">{n0(b.valor)}{b.placa !== b.valor && <small className="text-[var(--tinta3)]"> · placa {n0(b.placa)}</small>}</span>
      </span>
      <Estado vigente={b} />
      <Escribir nombre={`Bomba ${b.equipo}`} unidad="bbl/d de agua" rige={b.valor} fuenteRige={b.fuenteFirmada} escrita={escrita} puede={puede} onEscribir={onEscribir} />
      {hallazgos.length > 0 && <ul className="mt-0.5 grid gap-0.5">{hallazgos.map(h => <Regla key={h.texto} h={h} />)}</ul>}
    </div>
  )
}

/** La cifra y la fuente que se escriben. Vacía, rige lo de arriba; con algo, va al borrador. */
function Escribir({ nombre, unidad, rige, fuenteRige, escrita, puede, onEscribir }: {
  nombre: string; unidad: string; rige: number | null; fuenteRige: FuenteCapacidad | undefined
  escrita: CapacidadFirmada | undefined; puede: boolean; onEscribir: (x: CapacidadFirmada | undefined) => void
}) {
  if (!puede && !escrita) return null
  const cifra = (t: string) => {
    if (t === '') return onEscribir(undefined)
    onEscribir({ bpd: Number(t), fuente: escrita?.fuente ?? fuenteRige ?? ('' as FuenteCapacidad) })
  }
  const fuente = (f: string) => onEscribir({ bpd: escrita?.bpd ?? rige ?? NaN, fuente: f as FuenteCapacidad })
  return (
    <div className="mt-1 grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)] items-center gap-1.5">
      <input type="number" min={0} step={100} disabled={!puede} value={escrita && Number.isFinite(escrita.bpd) ? escrita.bpd : ''}
        placeholder={rige == null ? 'sin dato' : n0(rige)} onChange={e => cifra(e.target.value)}
        aria-label={`${nombre}, ${unidad}`} className={cn(CAJA, 'tabular')} />
      <select value={escrita?.fuente ?? ''} disabled={!puede} onChange={e => fuente(e.target.value)} aria-label={`De dónde sale: ${nombre}`} className={CAJA}>
        <option value="">¿De dónde sale?</option>
        {FUENTES_CAPACIDAD.map(f => <option key={f} value={f}>{NOMBRE_FUENTE_CAPACIDAD[f]}</option>)}
      </select>
    </div>
  )
}

/** Lo que encontró la revisión (B-30). Lo que bloquea lleva la marca de aviso y
 *  la palabra al comienzo, «Bloquea la firma:»; lo que pide confirmar o falta, el
 *  círculo gris discontinuo y «Revise:». El morado es solo de «sin comunicación» y
 *  «dato inválido» (U1 §9.2): aquí no va. Nunca solo color: forma y palabra. */
function Regla({ h }: { h: HallazgoCapacidad }) {
  return (
    <li className="flex items-start gap-1.5" data-bloquea={h.bloquea || undefined}>
      <span className="mt-[3px] shrink-0">{h.bloquea ? <MarcaPrioridad s={3} tamano={12} decorativa /> : <MarcaFalta decorativa />}</span>
      <span className="min-w-0 break-words"><b className="font-semibold">{h.bloquea ? 'Bloquea la firma:' : 'Revise:'}</b> {h.texto}</span>
    </li>
  )
}
