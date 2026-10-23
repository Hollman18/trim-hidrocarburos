import { useState } from 'react'
import { useRepartoChoke, ESCALONES, NOMBRE_ESCALON, CHOKES_Y_SIN_ASIGNAR, type BrechaChoke, type EscalonOSinClasificar } from '@/shared/api/choke'
import { Panel, Boton } from '@/shared/ui/primitivas'
import { Info } from '@/shared/ui/Info'
import { Lectura } from '@/shared/ui/Lectura'
import { FueraDeMeta } from '@/shared/ui/Prioridad'
import { desplazable } from '@/shared/ui/alFinal'
import { n0, n1 } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { CAJA, ESCALON_CAMPO } from './palabras'

const AYUDA_ESCALERA = 'Es la escalera del método choke (NSTA §5.3 y §6.4). Arriba, lo que dan los pozos según sus pruebas; lo que dan de más que el medidor oficial no es de ninguna parada y va aparte, en su renglón. Desde el potencial del libro, cada barril que no se produjo cae en un escalón y en un tramo, y los escalones suman exacto lo que no se produjo según el libro. Desarrollo es del yacimiento; desempeño, del levantamiento sin optimizar; las paradas, de mantenimiento y confiabilidad; capacidad, de la operación (nominación, despacho). El norte de TRIM vive en las paradas no planeadas.'
const AYUDA_BRECHA_PRUEBAS = 'Lo que las pruebas de los pozos dan de más que el punto de medición oficial en el período: el factor de asignación del mes lo descuenta. No es de ninguna parada (es sesgo de medición o desempeño de los pozos, sin separar mientras el factor de medición sea 1) y no se reparte por tramo.'

/** La eficiencia de producción y en qué se diferencia del «% del potencial» del
 *  libro (arriba en Producción), con las cifras del período: no son la misma
 *  aunque limiten los pozos (D3; QA-R, vecino 2). */
function ayudaPe(b: BrechaChoke): string {
  const libro = b.potencial > 0 ? (b.real / b.potencial) * 100 : 0
  const brecha = Math.round(b.brechaPruebas)
  const diferencia = brecha === 0 ? 'Las pruebas y el medidor oficial dan lo mismo en este período'
    : brecha > 0 ? `Esta descuenta además lo que las pruebas dan de más que el medidor oficial (${n0(brecha)} bbl en el período)`
      : `Esta suma además lo que el medidor oficial da de más que las pruebas (${n0(-brecha)} bbl en el período)`
  return `Lo que salió por el punto de medición oficial ÷ lo que el campo podía dejar pasar: lo que dan los pozos según sus pruebas o, el día que limita la planta o afuera, lo que deja pasar ese tramo (lo que no pasa aunque nada pare no se cuenta como pérdida). Es la eficiencia de producción de la NSTA (§5.3) y de la ISO/TS 3250. No es el «% del potencial» de arriba: ese divide por el potencial del libro, las pruebas con el factor de asignación del mes, que las deja medidas como el punto oficial, y solo descuenta lo que no se produjo por paradas. ${diferencia}: ${n1(b.pe)} % aquí y ${n1(libro)} % del potencial.`
}
const AYUDA_NO_PLANEADO = 'Las paradas no planeadas (fallas, disparos, terceros) ÷ lo que el campo podía dejar pasar: la eficiencia no planeada de la NSTA. Es el porcentaje que TRIM busca bajar prediciendo las bombas críticas.'
const AYUDA_SIN_EXPLICAR = 'Lo que no explica ningún evento: el inventario del tanque de venta entre un día y otro. Se muestra, nunca se reparte. Si pasa del 2,5 % del potencial del período, hay que revisarlo (el umbral de cierre de la NSTA).'

/** De lo que podían dar los pozos a lo que salió, escalón por escalón
 *  (CHOKE-COMPLETO §7–§8), y la eficiencia de producción. Es para producción:
 *  los nombres técnicos (escalera de brechas, PE) van en el ⓘ, nunca en el
 *  rótulo (U2 §1.4). Todo llega hecho del motor (`useRepartoChoke`): la
 *  pantalla solo dibuja la barra de cada escalón contra lo que no se produjo. */
export function Escalera({ campos, desde, hasta, periodo }: { campos: string[]; desde: Date; hasta: Date; periodo: string }) {
  const b = useRepartoChoke({ campos, desde, hasta })
  const [porTramo, setPorTramo] = useState(false)
  const filas: Array<[EscalonOSinClasificar, number]> = ESCALONES.map(e => [e, b.porEscalon[e]])
  const escala = Math.max(1, b.brecha, ...filas.map(([, v]) => Math.abs(v)), Math.abs(b.sinExplicar))
  const ancho = (v: number) => `${Math.min(100, (Math.abs(v) / escala) * 100)}%`

  return (
    <Panel className="mb-2.5 print:break-inside-avoid" titulo="LO QUE NO SE PRODUJO, POR TIPO"
      extra={<span className="inline-flex items-center gap-1 print:[&_.solo-impresion]:hidden!">{periodo.toLowerCase()}<Info titulo="La escalera" texto={AYUDA_ESCALERA} /></span>}>
      <div data-escalera>
        <div className="grid gap-x-6 gap-y-2 [grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr))]">
          <Cifra rotulo="eficiencia de producción" valor={`${n1(b.pe)} %`} ayuda={<Info titulo="Eficiencia de producción" texto={ayudaPe(b)} />}
            pie={`${n0(b.real)} de ${n0(b.potencialSistema)} bbl que el campo podía dejar pasar`} />
          <Cifra rotulo="lo no planeado se llevó" valor={`${n1(b.peNoPlaneada)} %`} ayuda={<Info titulo="Lo no planeado" texto={AYUDA_NO_PLANEADO} />}
            pie={`${n0(b.porEscalon['disponibilidad-no-planeada'])} bbl en paradas no planeadas`} />
        </div>

        <ol className="mt-3 text-[11.5px]" aria-label="De lo que dan los pozos según sus pruebas a lo que salió">
          {/* Un solo número del choke: la escalera empieza donde empieza la eficiencia de producción (las pruebas),
              y lo que las pruebas dan de más que el medidor va en su renglón, antes del potencial del libro (D3). */}
          <li className="flex items-baseline justify-between gap-2 border-b border-[var(--linea2)] py-1" data-escalon-inicio data-bbl={b.potencialPruebas}>
            <span>Lo que dan los pozos según sus pruebas</span>
            <b className="tabular">{n0(b.potencialPruebas)} <small className="font-normal text-[var(--tinta3)]">bbl</small></b>
          </li>
          <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 border-b border-[var(--linea2)] py-1 pl-3" data-brecha-pruebas data-bbl={b.brechaPruebas}>
            <span className={cn('flex flex-wrap items-center gap-x-1.5', Math.round(b.brechaPruebas) === 0 && 'text-[var(--tinta3)]')}>
              {b.brechaPruebas >= 0 ? '− Lo que las pruebas dan de más que el medidor oficial' : '+ Lo que el medidor oficial da de más que las pruebas'}
              <Info titulo="Las pruebas y el medidor oficial" texto={AYUDA_BRECHA_PRUEBAS} />
            </span>
            <b className="tabular text-right">{n0(Math.abs(b.brechaPruebas))}</b>
          </li>
          <li className="flex items-baseline justify-between gap-2 border-b border-[var(--linea2)] py-1" data-potencial-libro data-bbl={b.potencial}>
            <span>= El potencial del libro <small className="text-[var(--tinta3)]">· lo mismo, medido como el punto oficial (pruebas × factor de asignación)</small></span>
            <b className="tabular">{n0(b.potencial)} <small className="font-normal text-[var(--tinta3)]">bbl</small></b>
          </li>
          {filas.map(([e, v]) => (
            <Escalon key={e} nombre={ESCALON_CAMPO[e]} tecnico={NOMBRE_ESCALON[e]} valor={v} ancho={ancho(v)} norte={e === 'disponibilidad-no-planeada'} />
          ))}
          <Escalon nombre="Sin explicar: el inventario entre días" valor={b.sinExplicar} ancho={ancho(b.sinExplicar)} discontinuo
            ayuda={<Info titulo="Sin explicar" texto={AYUDA_SIN_EXPLICAR} />} aviso={!b.cuadra} />
          <li className="flex items-baseline justify-between gap-2 py-1 font-semibold" data-escalon-real data-bbl={b.real}>
            <span>= Lo que salió por el punto de medición oficial</span>
            <b className="tabular">{n0(b.real)} <small className="font-normal text-[var(--tinta3)]">bbl</small></b>
          </li>
        </ol>
        {!b.cuadra && <p className="mt-1 text-[11.5px]"><FueraDeMeta si />Lo sin explicar pasa del 2,5 % del potencial: hay que revisarlo antes de cerrar el mes.</p>}
        {b.estructural >= 0.5 && b.textoEstructural && <p className="mt-1.5 text-[11.5px] text-[var(--tinta2)]">{b.textoEstructural}</p>}
        {b.porConfirmar >= 0.5 && (
          <p className="mt-1 text-[11px] text-[var(--tinta2)]">
            <span className="tabular">{n0(b.porConfirmar)}</span> bbl tienen el tramo como propuesta de TRIM: falta que una persona conteste la pregunta que lo decide.
          </p>
        )}
        <Lectura>
          Arriba, lo que dan los pozos según sus pruebas; abajo, lo que salió por el punto de
          medición oficial. Lo que las pruebas dan de más que el medidor va primero y aparte: no es de
          ninguna parada. Desde el potencial del libro, cada escalón es una razón distinta de lo que no
          se produjo, con su barra contra el total. Lo que TRIM ataca son las paradas no planeadas. Lo
          sin explicar no se reparte: es el inventario del tanque de venta entre un día y otro.
        </Lectura>

        <div className="mt-2 flex flex-wrap gap-1.5">
          <Boton variante="chico" aria-expanded={porTramo} onClick={() => setPorTramo(v => !v)}>{porTramo ? 'Ocultar por tramo' : 'Ver por tramo'}</Boton>
        </div>
        {porTramo ? <PorTramo b={b} /> : <div className="solo-impresion"><PorTramo b={b} /></div>}
        <p className="solo-impresion mt-1.5 text-[9pt] text-[var(--tinta2)]"><b>La escalera: </b>{AYUDA_ESCALERA}</p>
      </div>
    </Panel>
  )
}

function Cifra({ rotulo, valor, ayuda, pie }: { rotulo: string; valor: string; ayuda: React.ReactNode; pie: string }) {
  return (
    <span className="min-w-0">
      <small className="flex flex-wrap items-center gap-x-1 text-[10.5px] text-[var(--tinta3)]">{rotulo}{ayuda}</small>
      <b className="tabular block text-[20px] leading-none">{valor}</b>
      <small className="tabular mt-0.5 block text-[10.5px] text-[var(--tinta2)]">{pie}</small>
    </span>
  )
}

/** Un escalón: su nombre, su barra contra lo que no se produjo y su cifra.
 *  El de las paradas no planeadas lleva su palabra («lo que TRIM baja»), en gris: no es una alarma. */
function Escalon({ nombre, tecnico, valor, ancho, norte, discontinuo, ayuda, aviso }: {
  nombre: string; tecnico?: string; valor: number; ancho: string; norte?: boolean; discontinuo?: boolean; ayuda?: React.ReactNode; aviso?: boolean
}) {
  const cero = Math.round(valor) === 0
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 border-b border-[var(--linea2)] py-1 pl-3 sm:grid-cols-[minmax(0,1.3fr)_minmax(60px,1fr)_auto]"
      data-escalon={nombre} data-bbl={valor}>
      <span className={cn('flex flex-wrap items-center gap-x-1.5', cero && 'text-[var(--tinta3)]', norte && !cero && 'font-semibold')}>
        − {nombre}{ayuda}{tecnico && <Info titulo={nombre} texto={`En la escalera de la NSTA: ${tecnico}.`} />}
        {norte && <span className="font-cond rounded-sm border border-[var(--tinta2)] px-1 text-[9.5px] font-semibold tracking-[.05em] text-[var(--tinta)]">LO QUE TRIM BAJA</span>}
      </span>
      <span aria-hidden className="relative hidden h-2 overflow-hidden rounded-sm bg-[var(--panel2)] sm:block">
        {!cero && <i className={cn('absolute inset-y-0 left-0 block', discontinuo ? 'border border-dashed border-[var(--tinta3)]' : norte ? 'bg-[var(--dato-1)]' : 'bg-[var(--dato-3)]')} style={{ width: ancho }} />}
      </span>
      <b className={cn('tabular text-right', cero && 'font-normal text-[var(--tinta3)]')}><FueraDeMeta si={aviso} tamano={11} />{n0(valor)}</b>
    </li>
  )
}

/** Cada tramo repartido en sus escalones: la escalera dentro de cada tramo. */
function PorTramo({ b }: { b: BrechaChoke }) {
  const columnas = CHOKES_Y_SIN_ASIGNAR
  const nombre = (k: (typeof columnas)[number]) => (k === 'sin-asignar' ? 'Sin identificar' : CAJA[k])
  return (
    <div className="mt-2 overflow-x-auto" {...desplazable('Lo que no se produjo por tramo y escalón')}>
      <table className="tabular w-full min-w-[560px] text-[11px]">
        <caption className="pb-1 text-left text-[10.5px] text-[var(--tinta3)]">Por tramo y escalón · bbl</caption>
        <thead className="text-[9.5px] text-[var(--tinta3)]">
          <tr><th className="py-1 pr-2 text-left font-normal">Escalón</th>{columnas.map(k => <th key={k} className="py-1 pr-2 text-right font-normal">{nombre(k)}</th>)}<th className="py-1 text-right font-normal">Total</th></tr>
        </thead>
        <tbody>
          {ESCALONES.map(e => (
            <tr key={e} className="border-t border-[var(--linea2)]">
              <td className="py-1 pr-2 text-left">{ESCALON_CAMPO[e]}</td>
              {columnas.map(k => <td key={k} className={cn('py-1 pr-2 text-right', Math.round(b.porChokeEscalon[k][e]) === 0 && 'text-[var(--tinta3)]')}>{n0(b.porChokeEscalon[k][e])}</td>)}
              <td className="py-1 text-right font-semibold">{n0(b.porEscalon[e])}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-[var(--linea)] font-semibold">
            <td className="py-1 pr-2 text-left">Total del tramo</td>
            {columnas.map(k => <td key={k} className="py-1 pr-2 text-right">{n0(b.porChoke[k])}</td>)}
            <td className="py-1 text-right">{n0(b.diferido)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
