import { conMeta, textoSinMeta, type Libro, type LineaBase } from '@/entities/libro'
import { useEquiposDeHoy } from '@/shared/api/equipos'
import { campoPorId } from '@/entities/campos'
import { NOMBRE_PARTE } from '@/entities/partes'
import { TIPO_CAUSA, ALTO_IMPACTO } from '@/entities/causa-senal'
import { Panel, Chip, Boton } from '@/shared/ui/primitivas'
import { MarcaPrioridad } from '@/shared/ui/Prioridad'
import { Lectura } from '@/shared/ui/Lectura'
import { Tip } from '@/shared/ui/Tip'
import { Info } from '@/shared/ui/Info'
import { BarraMeta } from '@/shared/ui/BarraMeta'
import { VerMas } from '@/shared/ui/VerMas'
import { useVerMas, VISIBLES } from '@/shared/ui/listaCorta'
import { marcaDeFila } from './marca'
import { NOMBRE_PRIORIDAD } from '@/shared/lib/prioridad'
import { n0, n1, plural, pctParte } from '@/shared/lib/formato'

const FAMILIA: Record<string, string> = { inyeccion: 'reinyección', multifasica: 'multifásica', electrosumergible: 'electrosumergible' }
const RAYADO = 'repeating-linear-gradient(45deg, var(--tinta3), var(--tinta3) 2px, transparent 2px, transparent 4px)'
/** Cuántas filas a la vista: cinco, salvo que sobre una sola (un botón «ver 1
 *  más» ocupa lo mismo que la fila que esconde). */
const aLaVista = (n: number) => (n === VISIBLES + 1 ? n : VISIBLES)
/** Una fila de lista con raya debajo: la raya va en el contenedor, así queda
 *  debajo de la nota que sale en el papel y no entre la fila y su nota. */
const FILA = 'border-b border-[var(--linea2)] last:border-0'

/** A qué equipo se le cargan los barriles, de mayor a menor, con el
 *  acumulado: los dos o tres primeros suelen explicar casi todo. Se ven cinco
 *  (y toda fila de prioridad 1, ISA-18.2); el resto, a un toque y en el papel.
 *  La marca de cada fila es la de hoy de su equipo solo si la fila es de una
 *  falla suya: una parada programada no la lleva (`marcaDeFila`).
 *  El nombre largo del equipo, la tolerancia y el peso de la parte van en el
 *  globo de la fila: a la vista quedan la etiqueta, el tipo y la parte. */
export function ParetoEquipos({ lb, global, max, simple = false, onAbrir, onVerTodo }: {
  lb: Libro; global: boolean; max?: number
  /** Para quien decide: sin tolerancia ni acumulado. */
  simple?: boolean
  onAbrir: (campoId: string, equipo: string) => void
  onVerTodo?: () => void
}) {
  // Los equipos de hoy de los campos que aparecen en el Pareto, en un pedido.
  const equipoEnCampo = useEquiposDeHoy([...new Set(lb.porEquipo.map(f => f.campoId))].sort())
  const filas = max ? lb.porEquipo.slice(0, max) : lb.porEquipo
  const primero = lb.porEquipo[0]?.bbl ?? 1
  const acumulado = filas.reduce<number[]>((a, f) => [...a, (a.at(-1) ?? 0) + f.bbl], [])
  const items = filas.map((f, i) => ({ f, i }))
  // Con `max` la pantalla ya corta (y lleva «Ver los N equipos»): no se corta dos veces.
  // La marca de la fila: el estado de hoy del equipo, solo en sus filas de falla (marca.ts).
  const marca = (f: Libro['porEquipo'][number]) => marcaDeFila(f, equipoEnCampo(f.equipo, f.campoId)?.severidad)
  const lista = useVerMas(items, { n: max ?? aLaVista(items.length), prioridad: ({ f }) => marca(f) })
  const columnaBbl = 'tabular w-[64px] shrink-0 text-right'
  const columnaAcum = 'tabular hidden w-[56px] shrink-0 text-right sm:block'

  const fila = ({ f, i }: typeof items[number], oculta: boolean) => {
    const eq = equipoEnCampo(f.equipo, f.campoId)
    const s = marca(f)
    const pAcum = lb.diferido > 0 ? (acumulado[i]! / lb.diferido) * 100 : 0
    const parteTop = f.partes[0]
    const alto = ALTO_IMPACTO.includes(f.tipo)
    const donde = global ? ` · ${campoPorId(f.campoId).nombre}` : ''
    const nombre = eq?.nombre ?? f.equipo
    // Lo que salió de la fila va al globo y, en el papel, escrito debajo.
    const pista = [nombre !== f.equipo ? nombre : '',
      parteTop ? `${NOMBRE_PARTE[parteTop.parte]}: ${n0((parteTop.bbl / f.bbl) * 100)} % de sus barriles` : '',
      !simple && f.bbl > 0 && f.tolerancia > 0 ? `tolerancia ±${n1((f.tolerancia / f.bbl) * 100)} %` : ''].filter(Boolean).join(' · ')
    return (
      <div key={`${f.campoId}:${f.equipo}:${f.tipo}`} className={`${FILA} print:pb-1.5 ${oculta ? 'solo-impresion' : ''}`}>
        <Tip as="button" onClick={() => onAbrir(f.campoId, f.equipo)} imprimir="pista"
          aria-label={`${NOMBRE_PRIORIDAD[s]}. ${f.equipo}${donde}, ${TIPO_CAUSA[f.tipo].toLowerCase()}${parteTop ? `, ${NOMBRE_PARTE[parteTop.parte].toLowerCase()}` : ''}: ${n0(f.bbl)} bbl${simple ? '' : `, acumulado ${n0(pAcum)} %`}`}
          className="flex w-full cursor-pointer items-center gap-3 py-2 text-left hover:bg-[var(--panel2)]"
          titulo={`${f.equipo}${donde}`} pista={pista || undefined}
          filas={[['Diferidos', `${n0(f.bbl)} bbl`], ...(simple ? [] : [['Tolerancia', `±${n0(f.tolerancia)} bbl`] as [string, string]]),
            ['Del total', `${n1(lb.diferido ? (f.bbl / lb.diferido) * 100 : 0)} %`], ['Acumulado', `${n1(pAcum)} %`],
            ['Tipo', TIPO_CAUSA[f.tipo]], ['Eventos', String(f.eventos)], ['Pozos afectados', String(f.pozos)],
            ...f.partes.slice(0, 3).map(p => [NOMBRE_PARTE[p.parte], `${n0(p.bbl)} bbl`] as [string, string])]}>
          <MarcaPrioridad s={s} tamano={13} />
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
              <b className="text-[12.5px]">{f.equipo}<span className="font-normal text-[var(--tinta3)]">{donde}</span></b>
              <Chip tono={alto ? 'fuerte' : 'neutro'}>{TIPO_CAUSA[f.tipo].toLowerCase()}</Chip>
              {f.pozos > 1 && <span className="text-[10.5px] text-[var(--tinta3)]">{f.pozos} pozos</span>}
              {parteTop && <span className="text-[10.5px] text-[var(--tinta2)]">{NOMBRE_PARTE[parteTop.parte].toLowerCase()}</span>}
            </span>
            <span className="mt-1 block h-1.5 overflow-hidden rounded-sm bg-[var(--panel2)]">
              <i className="block h-full" style={{ width: `${(f.bbl / primero) * 100}%`, background: alto ? 'var(--dato-1)' : 'var(--dato-5)' }} />
            </span>
          </span>
          <b className={`${columnaBbl} text-[15px] leading-tight`}>{n0(f.bbl)}</b>
          {!simple && <span className={`${columnaAcum} text-[12px]`}>{n0(pAcum)} %</span>}
        </Tip>
      </div>
    )
  }

  return (
    <Panel titulo="POR EQUIPO" extra={plural(lb.porEquipo.length, 'equipo', 'equipos')}>
      <Lectura>
        Ordenado por <b>barriles</b>, no por número de paradas. Un pozo cerrado porque la bomba de
        reinyección paró se le carga a la bomba, no al pozo. Se ven los cinco primeros y toda fila de
        prioridad 1; «ver más» abre el resto. Toque o pase el cursor por una fila para ver el nombre
        del equipo{simple ? '' : ', su tolerancia'} y cuánto se lleva la parte; un clic lo abre.
        {!simple && ' El acumulado dice cuánto explican los primeros.'}
      </Lectura>
      {filas.length === 0 && <p className="text-[12px] text-[var(--tinta2)]">Nada diferido.</p>}
      {filas.length > 0 && (
        <div className="flex gap-3 pb-1 text-[10px] text-[var(--tinta3)]" aria-hidden>
          <span className="w-[13px] shrink-0" /><span className="flex-1" />
          <span className={columnaBbl}>bbl</span>
          {!simple && <span className={columnaAcum}>acumulado</span>}
        </div>
      )}
      {/* En su orden: las que esconde «ver más» salen igual en el papel, en su lugar del Pareto. */}
      {items.map(x => fila(x, lista.resto.includes(x)))}
      <VerMas ocultas={lista.ocultas} abierto={lista.abierto} onAlternar={lista.alternar} />
      {onVerTodo && lb.porEquipo.length > filas.length && (
        <Boton className="mt-2 w-full" onClick={onVerTodo}>Ver los {lb.porEquipo.length} equipos</Boton>
      )}
    </Panel>
  )
}

/** De qué se dañan los equipos de la línea: los barriles de sus fallas, por
 *  la parte que falló. Lo programado y lo que causó otro equipo van aparte. */
export function ParetoPartes({ lb, onIr }: { lb: Libro; onIr?: () => void }) {
  const total = lb.porParte.reduce((a, p) => a + p.bbl, 0)
  // Una fila puede ir en 0 bbl (el tanque absorbió la parada): la barra mide
  // contra la primera con barriles, y sin ninguna no hay barra que dibujar.
  const primero = lb.porParte[0]?.bbl || 1
  const lista = useVerMas(lb.porParte, { n: aLaVista(lb.porParte.length) })
  const fila = (p: Libro['porParte'][number], oculta: boolean) => (
    <div key={`${p.parte}${p.familia}`} className={`${FILA} print:pb-1.5 ${oculta ? 'solo-impresion' : ''}`}>
      <Tip as={onIr ? 'button' : 'div'} {...(onIr ? { onClick: onIr } : {})}
        className={`flex w-full items-center gap-3 py-2 text-left ${onIr ? 'cursor-pointer hover:bg-[var(--panel2)]' : ''}`}
        titulo={NOMBRE_PARTE[p.parte]} pista={onIr ? 'Clic para ver la salud de esa parte en los equipos' : undefined}
        filas={[['Diferidos', `${n0(p.bbl)} bbl`], ['Del total por parte', `${n1(total ? (p.bbl / total) * 100 : 0)} %`],
          ['Familia', FAMILIA[p.familia] ?? p.familia], ['Fallas', String(p.fallas)],
          ...(p.disparos ? [['Disparos (menos de un día)', String(p.disparos)] as [string, string]] : []),
          ['Horas fuera', `${n0(p.horas)} h`],
          ...p.equipos.slice(0, 3).map(e => [`${e.equipo} · ${campoPorId(e.campoId).nombre}`, `${n0(e.bbl)} bbl`] as [string, string])]}>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <b className="text-[12.5px]">{NOMBRE_PARTE[p.parte]}</b>
            <span className="text-[10.5px] text-[var(--tinta3)]">
              {FAMILIA[p.familia]} · {p.fallas ? plural(p.fallas, 'falla', 'fallas') : 'sin fallas'}{p.disparos ? ` · ${plural(p.disparos, 'disparo', 'disparos')}` : ''}
            </span>
          </span>
          <span className="mt-1 block h-1.5 overflow-hidden rounded-sm bg-[var(--panel2)]">
            <i className="block h-full bg-[var(--dato-1)]" style={{ width: `${(p.bbl / primero) * 100}%` }} />
          </span>
        </span>
        <span className="tabular w-[78px] shrink-0 text-right">
          <b className="block text-[15px] leading-tight">{n0(p.bbl)}</b>
          <small className="text-[9.5px] text-[var(--tinta3)]">bbl · {pctParte(total ? (p.bbl / total) * 100 : 0)}</small>
        </span>
      </Tip>
    </div>
  )
  return (
    <Panel titulo="POR PARTE" extra="bombas y electrosumergibles">
      <Lectura>
        Las fallas por la parte que falló (el ítem mantenible de ISO 14224), con la parte que dice la
        primera alarma del PLC, el código del variador o la firma de las señales. Es lo que hay que
        vigilar para que el número baje: si el sello se lleva la mitad, el sello va primero. Una
        parada que el tanque absorbió es igual una falla: cuenta con sus horas fuera y 0 bbl.
      </Lectura>
      {lb.porParte.length === 0 && <p className="text-[12px] text-[var(--tinta2)]">Ninguna falla con la parte identificada.</p>}
      {lb.porParte.map(p => fila(p, lista.resto.includes(p)))}
      <VerMas ocultas={lista.ocultas} abierto={lista.abierto} onAlternar={lista.alternar} />
      {lb.sinParte > 0 && (
        <p className="mt-2 flex flex-wrap items-center gap-x-1 text-[10.5px] text-[var(--tinta3)]">
          <span className="tabular">+ {n0(lb.sinParte)} bbl sin la parte identificada</span>
          <Info titulo="Sin la parte identificada" texto="Barriles de equipos de alto impacto cuya parada no dejó primera alarma ni firma. Están en «paradas por identificar»." />
        </p>
      )}
    </Panel>
  )
}

/** Por tipo de causa: qué familia de equipos o servicios se lleva el diferido.
 *  Lo sin identificar nunca queda detrás de «ver más»: es un hueco del libro. */
export function ParetoTipos({ lb }: { lb: Libro }) {
  const primero = lb.porTipo[0]?.bbl ?? 1
  const lista = useVerMas(lb.porTipo, { n: aLaVista(lb.porTipo.length), prioridad: t => (t.tipo === 'pendiente' ? 1 : 2) })
  const fila = (t: Libro['porTipo'][number], oculta: boolean) => {
    const alto = ALTO_IMPACTO.includes(t.tipo)
    return (
      <div key={t.tipo} className={`${FILA} py-1.5 ${oculta ? 'solo-impresion' : ''}`}>
        <div className="flex justify-between gap-2 text-[11.5px]">
          <span className={alto ? 'font-semibold' : ''}>{TIPO_CAUSA[t.tipo]}</span>
          <span className="tabular shrink-0">{n0(t.bbl)} bbl · {pctParte(lb.diferido ? (t.bbl / lb.diferido) * 100 : 0)}</span>
        </div>
        <span className="mt-1 block h-1.5 overflow-hidden rounded-sm bg-[var(--panel2)]">
          <i className="block h-full" style={{
            width: `${(t.bbl / primero) * 100}%`,
            background: t.tipo === 'pendiente' ? RAYADO : alto ? 'var(--dato-1)' : 'var(--dato-5)' }} />
        </span>
      </div>
    )
  }
  return (
    <Panel titulo="TIPO DE CAUSA">
      <Lectura>
        Qué familia de equipos o servicios se lleva el diferido. En oscuro y en negrita, los de alto
        impacto (bombas de reinyección y electrosumergibles); rayado, lo que nadie ha identificado.
      </Lectura>
      {lb.porTipo.length === 0 && <p className="text-[12px] text-[var(--tinta2)]">Nada diferido.</p>}
      {lb.porTipo.map(t => fila(t, lista.resto.includes(t)))}
      <VerMas ocultas={lista.ocultas} abierto={lista.abierto} onAlternar={lista.alternar} />
    </Panel>
  )
}

/** Dónde se puede bajar el número: la promesa del producto en barriles. Cada
 *  fila con su rótulo y su cifra; el porqué, en el globo (y en el papel).
 *  `conMaximo`: el diferido por día contra el máximo firmado, en barra. Apagado
 *  por omisión: el encabezado de Diferidos (y de Resumen y Portafolio) y la
 *  cabecera de Mantenimiento ya la traen; solo lo enciende quien no la tenga. */
export function Palancas({ lb, base, conMaximo = false }: { lb: Libro; base?: LineaBase; conMaximo?: boolean }) {
  const filas: Array<{ k: string; v: number; pie: string; fuerte?: boolean }> = [
    { k: 'Equipos de alto impacto', v: lb.altoImpacto, fuerte: true,
      pie: 'Bombas de reinyección y electrosumergibles: el foco del producto.' },
    { k: 'Con parte vigilada', v: lb.anticipable,
      pie: 'La parte que falló tiene un instrumento que la vigila: se pudo saber antes.' },
    { k: 'Con parte sin instrumento', v: lb.sinInstrumento,
      pie: 'Se sabe qué parte falló pero nada la vigila en ese equipo: hueco de instrumentación.' },
    { k: 'Sin la parte identificada', v: lb.sinParte,
      pie: 'Paró sin primera alarma ni firma: hay que preguntar qué se dañó.' },
    { k: 'Evitable cerrando en orden', v: lb.evitablePorOrden,
      pie: 'Al parar la reinyección, cerrar primero los pozos con menos crudo por barril de agua.' },
  ]
  const hayMeta = conMeta(lb.meta)
  const difDia = lb.brecha / Math.max(1 / 24, lb.meta.dias)
  return (
    <Panel titulo="DÓNDE BAJARLO" extra="bbl · % del diferido">
      <Lectura>
        No todo el diferido se puede atacar igual. Lo de alto impacto con la parte vigilada es lo
        que el vigía puede anticipar; lo que no tiene instrumento dice qué instrumentar; lo evitable
        por orden de cierre se gana sin tocar ningún equipo. Las tres filas de la parte son de los
        equipos de alto impacto. Toque o pase el cursor por una fila para ver qué cuenta.
      </Lectura>
      <div className="text-[12px]">
        {filas.map(f => {
          const pct = lb.diferido ? pctParte((f.v / lb.diferido) * 100) : ''
          return (
            <div key={f.k} className={`${FILA} print:pb-1.5`}>
              <Tip titulo={f.k} pista={f.pie} filas={[['Barriles', `${n0(f.v)} bbl`], ...(pct ? [['Del diferido', pct] as [string, string]] : [])]}
                imprimir="pista" className="flex items-baseline justify-between gap-4 py-1.5">
                <span className={f.fuerte ? 'font-semibold' : 'pl-3'}>{f.k}</span>
                <span className={`tabular shrink-0 text-right ${f.fuerte ? 'text-[15px] font-bold' : 'font-semibold'}`}>
                  {n0(f.v)}<span className="sr-only"> bbl</span>{' '}<small className="text-[9.5px] font-normal text-[var(--tinta3)]">{pct}</small>
                </span>
              </Tip>
            </div>
          )
        })}
      </div>
      {conMaximo && (
        <div className="mt-2.5">
          <BarraMeta rotulo="diferido por día" valor={difDia} unidad="bbl/d" meta={hayMeta ? lb.meta.diferidoDia : undefined}
            rotuloMeta={hayMeta ? `máx. ${n0(lb.meta.diferidoDia)}` : textoSinMeta(lb.meta, lb.porCampo.length > 1)} tipoMeta="máximo"
            fuera={hayMeta && difDia > lb.meta.diferidoDia}
            apoyo={base ? `antes ${n0(base.baseDia)} bbl/d · ${base.nombre}` : undefined} />
        </div>
      )}
    </Panel>
  )
}
