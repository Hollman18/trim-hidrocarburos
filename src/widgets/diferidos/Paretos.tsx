import { conMeta, textoSinMeta, type Libro, type LineaBase } from '@/entities/libro'
import { useEquiposDeHoy } from '@/shared/api/equipos'
import { campoPorId } from '@/entities/campos'
import { NOMBRE_PARTE } from '@/entities/partes'
import { TIPO_CAUSA, ALTO_IMPACTO } from '@/entities/causa-senal'
import { Panel, Chip, Boton } from '@/shared/ui/primitivas'
import { MarcaPrioridad, FueraDeMeta } from '@/shared/ui/Prioridad'
import { Lectura } from '@/shared/ui/Lectura'
import { Tip } from '@/shared/ui/Tip'
import { n0, n1, plural } from '@/shared/lib/formato'

const FAMILIA: Record<string, string> = { inyeccion: 'reinyección', multifasica: 'multifásica', electrosumergible: 'electrosumergible' }

/** A qué equipo se le cargan los barriles, de mayor a menor, con el
 *  acumulado: los dos o tres primeros suelen explicar casi todo. */
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
  return (
    <Panel titulo="A QUÉ EQUIPO SE LE CARGAN" extra={`${plural(lb.porEquipo.length, 'equipo', 'equipos')} · clic para abrir`}>
      <Lectura>
        Ordenado por <b>barriles</b>, no por número de paradas. Un pozo cerrado porque la bomba de
        reinyección paró se le carga a la bomba, no al pozo.
        {!simple && ' El acumulado dice cuánto explican los primeros; la tolerancia es la de la medición del campo.'}
      </Lectura>
      {filas.length === 0 && <p className="text-[12px] text-[var(--tinta2)]">Ningún barril diferido en el período.</p>}
      {filas.map((f, i) => {
        const eq = equipoEnCampo(f.equipo, f.campoId)
        const pAcum = lb.diferido > 0 ? (acumulado[i]! / lb.diferido) * 100 : 0
        const parteTop = f.partes[0]
        const alto = ALTO_IMPACTO.includes(f.tipo)
        return (
          <Tip key={`${f.campoId}:${f.equipo}:${f.tipo}`} as="button" onClick={() => onAbrir(f.campoId, f.equipo)}
            className="flex w-full cursor-pointer items-center gap-3 border-b border-[var(--linea2)] py-2.5 text-left last:border-0 hover:bg-[var(--panel2)]"
            titulo={eq?.nombre ?? f.equipo} pista="Clic para abrir el equipo"
            filas={[['Diferidos', `${n0(f.bbl)} bbl`], ['Tolerancia', `±${n0(f.tolerancia)} bbl`],
              ['Del total', `${n1(lb.diferido ? (f.bbl / lb.diferido) * 100 : 0)} %`], ['Acumulado', `${n1(pAcum)} %`],
              ['Tipo', TIPO_CAUSA[f.tipo]], ['Eventos', String(f.eventos)], ['Pozos afectados', String(f.pozos)],
              ...f.partes.slice(0, 3).map(p => [NOMBRE_PARTE[p.parte], `${n0(p.bbl)} bbl`] as [string, string])]}>
            <MarcaPrioridad s={eq?.severidad ?? 0} tamano={13} />
            <span className="min-w-0 flex-1">
              <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                <b className="truncate text-[12.5px]">{eq?.nombre ?? f.equipo}</b>
                <span className="font-mono text-[10px] text-[var(--tinta3)]">{f.equipo}{global ? ` · ${campoPorId(f.campoId).nombre}` : ''}</span>
              </span>
              <span className="mt-1 block h-1.5 overflow-hidden rounded-sm bg-[var(--panel2)]">
                <i className="block h-full" style={{ width: `${(f.bbl / primero) * 100}%`, background: alto ? 'var(--dato-1)' : 'var(--dato-5)' }} />
              </span>
              <span className="mt-1 flex flex-wrap gap-1">
                <Chip tono={alto ? 'fuerte' : 'neutro'}>{TIPO_CAUSA[f.tipo].toLowerCase()}</Chip>
                {f.pozos > 1 && <Chip>{f.pozos} pozos</Chip>}
                {parteTop && <Chip>{NOMBRE_PARTE[parteTop.parte].toLowerCase()} {n0((parteTop.bbl / f.bbl) * 100)} %</Chip>}
              </span>
            </span>
            <span className="tabular w-[84px] shrink-0 text-right">
              <b className="block text-[15px] leading-tight">{n0(f.bbl)}</b>
              <small className="text-[9.5px] text-[var(--tinta3)]">bbl{!simple && f.bbl > 0 && f.tolerancia > 0 ? ` ±${n1((f.tolerancia / f.bbl) * 100)} %` : ''}</small>
            </span>
            {!simple && (
              <span className="tabular hidden w-[52px] shrink-0 text-right sm:block">
                <b className="block text-[12.5px] leading-tight">{n0(pAcum)} %</b>
                <small className="text-[9.5px] text-[var(--tinta3)]">acumulado</small>
              </span>
            )}
          </Tip>
        )
      })}
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
  return (
    <Panel titulo="QUÉ PARTE SE LLEVA LOS BARRILES" extra="bombas y electrosumergibles">
      <Lectura>
        Las fallas por la parte que falló (el ítem mantenible de ISO 14224), con la parte que dice la
        primera alarma del PLC, el código del variador o la firma de las señales. Es lo que hay que
        vigilar para que el número baje: si el sello se lleva la mitad, el sello va primero. Una
        parada que el tanque absorbió es igual una falla: cuenta con sus horas fuera y 0 bbl.
      </Lectura>
      {lb.porParte.length === 0 && <p className="text-[12px] text-[var(--tinta2)]">Ninguna falla con la parte identificada en el período.</p>}
      {lb.porParte.map(p => (
        <Tip key={`${p.parte}${p.familia}`} as={onIr ? 'button' : 'div'} {...(onIr ? { onClick: onIr } : {})}
          className={`flex w-full items-center gap-3 border-b border-[var(--linea2)] py-2.5 text-left last:border-0 ${onIr ? 'cursor-pointer hover:bg-[var(--panel2)]' : ''}`}
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
            <small className="text-[9.5px] text-[var(--tinta3)]">bbl · {n0(total ? (p.bbl / total) * 100 : 0)} %</small>
          </span>
        </Tip>
      ))}
      {lb.sinParte > 0 && (
        <p className="mt-2 text-[10.5px] text-[var(--tinta3)]">
          {n0(lb.sinParte)} bbl de equipos de alto impacto sin la parte identificada: la parada no dejó
          primera alarma ni firma. Están en «paradas por identificar».
        </p>
      )}
    </Panel>
  )
}

/** Por tipo de causa: qué familia de equipos o servicios se lleva el diferido. */
export function ParetoTipos({ lb }: { lb: Libro }) {
  const primero = lb.porTipo[0]?.bbl ?? 1
  return (
    <Panel titulo="POR TIPO DE CAUSA" extra="los de alto impacto, en oscuro">
      {lb.porTipo.length === 0 && <p className="text-[12px] text-[var(--tinta2)]">Sin diferido en el período.</p>}
      {lb.porTipo.map(t => {
        const alto = ALTO_IMPACTO.includes(t.tipo)
        return (
          <div key={t.tipo} className="border-b border-[var(--linea2)] py-1.5 last:border-0">
            <div className="flex justify-between gap-2 text-[11.5px]">
              <span className={alto ? 'font-semibold' : ''}>{TIPO_CAUSA[t.tipo]}</span>
              <span className="tabular shrink-0">{n0(t.bbl)} bbl · {n0(lb.diferido ? (t.bbl / lb.diferido) * 100 : 0)} %</span>
            </div>
            <span className="mt-1 block h-1.5 overflow-hidden rounded-sm bg-[var(--panel2)]">
              <i className="block h-full" style={{
                width: `${(t.bbl / primero) * 100}%`,
                background: t.tipo === 'pendiente' ? 'repeating-linear-gradient(45deg, var(--tinta3), var(--tinta3) 2px, transparent 2px, transparent 4px)'
                  : alto ? 'var(--dato-1)' : 'var(--dato-5)' }} />
            </span>
          </div>
        )
      })}
    </Panel>
  )
}

/** Dónde se puede bajar el número: la promesa del producto en barriles. */
export function Palancas({ lb, base }: { lb: Libro; base?: LineaBase }) {
  const filas: Array<{ k: string; v: number; pie: string; fuerte?: boolean }> = [
    { k: 'Equipos de alto impacto', v: lb.altoImpacto, fuerte: true,
      pie: 'Bombas de reinyección y electrosumergibles: el foco del producto' },
    { k: 'Con la parte vigilada', v: lb.anticipable,
      pie: 'La parte que falló tiene un instrumento que la vigila: se pudo saber antes' },
    { k: 'Con la parte sin instrumento', v: lb.sinInstrumento,
      pie: 'Se sabe qué parte falló pero nada la vigila en ese equipo: hueco de instrumentación' },
    { k: 'Sin la parte identificada', v: lb.sinParte,
      pie: 'Paró sin primera alarma ni firma: hay que preguntar qué se dañó' },
    { k: 'Evitable cerrando en orden', v: lb.evitablePorOrden,
      pie: 'Al parar la reinyección, cerrar primero los pozos con menos crudo por barril de agua' },
  ]
  return (
    <Panel titulo="DÓNDE SE PUEDE BAJAR" extra="en barriles">
      <Lectura>
        No todo el diferido se puede atacar igual. Lo de alto impacto con la parte vigilada es lo
        que el vigía puede anticipar; lo que no tiene instrumento dice qué instrumentar; lo evitable
        por orden de cierre se gana sin tocar ningún equipo.
      </Lectura>
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 text-[12px]">
        {filas.map(f => (
          <div key={f.k} className="contents">
            <dt className={`border-b border-[var(--linea2)] py-1.5 ${f.fuerte ? 'font-semibold' : 'pl-3'}`}>
              {f.k}<small className="block text-[10px] font-normal leading-snug text-[var(--tinta3)]">{f.pie}</small>
            </dt>
            <dd className={`tabular border-b border-[var(--linea2)] py-1.5 text-right ${f.fuerte ? 'text-[15px] font-bold' : 'font-semibold'}`}>
              {n0(f.v)}<small className="ml-1 text-[9.5px] font-normal text-[var(--tinta3)]">{lb.diferido ? `${n0((f.v / lb.diferido) * 100)} %` : ''}</small>
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-2.5 flex items-start gap-1.5 text-[11.5px] text-[var(--tinta2)]">
        <FueraDeMeta si={conMeta(lb.meta) && lb.brecha / Math.max(1 / 24, lb.meta.dias) > lb.meta.diferidoDia} tamano={11} />
        <span>
          Máximo de diferido firmado: <b className="tabular text-[var(--tinta)]">{conMeta(lb.meta) ? `${n0(lb.meta.diferidoDia)} bbl/d` : textoSinMeta(lb.meta, lb.porCampo.length > 1)}</b>. El período va
          en <b className="tabular text-[var(--tinta)]">{n0(lb.brecha / Math.max(1 / 24, lb.meta.dias))} bbl/d</b>
          {base ? <> (antes, en {base.nombre}: {n0(base.baseDia)} bbl/d)</> : null}.
        </span>
      </p>
    </Panel>
  )
}
