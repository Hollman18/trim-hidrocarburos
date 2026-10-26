import { useApp, useAmbito, useRango } from '@/app/store'
import { useBarrilesDeEquipos, useRiesgo } from '@/shared/api/diferidos'
import { useFilasEquipos } from '@/shared/api/equipos'
import { pedirInicioDeHistoria } from '@/shared/api/calendario'
import { AHORA } from '@/entities/reloj'
import type { Severidad } from '@/entities/tipos'
import type { EquipoVivo } from '@/entities/equipo-vivo'
import { campoPorId } from '@/entities/campos'
import { Panel, Chip } from '@/shared/ui/primitivas'
import { Tip } from '@/shared/ui/Tip'
import { Lectura } from '@/shared/ui/Lectura'
import { n0, plural } from '@/shared/lib/formato'
import { siParaLargo, sumaSiPara } from '@/shared/ui/costoHoy'
import { MarcaPrioridad } from '@/shared/ui/Prioridad'
import { FOCO_BOMBAS } from '@/shared/config/producto'

/** En práctica de alarmas la prioridad 1 es la MÁS alta y el 0 es que no
 *  pasa nada: se ordena al revés del número. */
const atencion = (s: Severidad) => (s === 0 ? 9 : s)

interface Fila {
  eq: EquipoVivo
  /** Máquina de bombeo de la línea (del catálogo): el foco. */
  bomba: boolean
  campoId: string
  campoNombre: string
  bbl: number
  /** Pozos que paró en toda la historia, en eventos distintos. */
  eventos: number
  bblHistoria: number
  /** Bombas: fallas propias (las paradas que causó otro equipo no cuentan). */
  fallas?: number
  mtbfDias?: number
  /** Lo que ya se está perdiendo por su causa (pozos que cerró y siguen cerrados). */
  ahora: number
  /** Lo que se perdería por día si para (bbl/d): produce, pero una parte
   *  avisa. No se suma con `ahora`: todavía no se pierde nada. «Si falla hoy»
   *  es otra cifra, en bbl (la de Riesgo). */
  siPara: number
  /** `siPara` es un techo del motor (`Riesgo.techo`): se dice «hasta». */
  siParaTecho?: true
}

/** Los equipos de superficie del campo: su estado, cuántas veces han parado
 *  pozos, cada cuánto y cuánto les cuesta. La historia sale del PLC. */
export function Equipo() {
  const ambito = useAmbito(); const rango = useRango()
  const abrirEquipo = useApp(s => s.abrirEquipo), setCampo = useApp(s => s.setCampo)
  const ids = ambito.campos.map(c => c.id)
  const bblDe = useBarrilesDeEquipos({ campos: ids, desde: rango.desde, hasta: rango.hasta })
  const riesgo = useRiesgo(ids)

  const lista = useFilasEquipos(ids)
  const diasHistoria = (AHORA.getTime() - pedirInicioDeHistoria().getTime()) / 86_400_000

  // «Ahora» es solo lo que ya cuesta: una bomba en marcha con una parte que
  // avisa produce, y su caudal va aparte como «si para», en bbl/d (igual que en Riesgo y Turno).
  const deEquipo = (f: Pick<Fila, 'campoId' | 'eq'>, estado: 'perdiendo' | 'en-riesgo') => sumaSiPara(riesgo
    .filter(r => r.campoId === f.campoId && r.equipo === f.eq.id && r.estado === estado))
  const filas = lista.map((f): Fila => {
    const si = deEquipo(f, 'en-riesgo')
    return { ...f, campoNombre: campoPorId(f.campoId).nombre, bbl: bblDe(f.eq.id, f.campoId), ahora: deEquipo(f, 'perdiendo').bblDia, siPara: si.bblDia, ...(si.techo ? { siParaTecho: true as const } : {}) }
  })
    .sort((a, b) => atencion(a.eq.severidad) - atencion(b.eq.severidad) || b.bbl - a.bbl || b.bblHistoria - a.bblHistoria)
  const foco = filas.filter(f => f.bomba)
  const fuera = filas.filter(f => !f.bomba)
  const peorFuera = fuera.reduce<Severidad>((a, f) => (atencion(f.eq.severidad) < atencion(a) ? f.eq.severidad : a), 0)
  const sinRespaldo = filas.filter(f => f.eq.redundancia === 'sin respaldo')

  const fila = (f: Fila) => (
    <Tip key={`${f.campoId}-${f.eq.id}`} as="button"
      onClick={() => { setCampo(f.campoId); abrirEquipo(f.eq.id, false) }}
      titulo={f.eq.nombre} pista={f.eq.lectura}
      filas={[['Estado', f.eq.estado], ['Criticidad', `${f.eq.criticidad}/5`], ['Redundancia', f.eq.redundancia],
        ['Aguas abajo', f.eq.aguasAbajo], [`Diferido · ${rango.nombre.toLowerCase()}`, `${n0(f.bbl)} bbl`],
        ['Eventos con pozos cerrados', `${f.eventos} en ${n0(diasHistoria / 30.4)} meses`],
        ...(f.fallas !== undefined ? [['Fallas propias', String(f.fallas)] as [string, string]] : []),
        ['Entre eventos', f.mtbfDias ? `${n0(f.mtbfDias)} d` : 'menos de dos: no se calcula'],
        ['Perdiéndose ahora', f.ahora ? `${n0(f.ahora)} bbl/d` : '—'],
        ...(f.siPara ? [['Si para', siParaLargo({ bblDia: f.siPara, ...(f.siParaTecho ? { techo: true as const } : {}) })] as [string, string]] : [])]}
      className="flex w-full cursor-pointer items-center gap-3 border-b border-[var(--linea2)] py-2.5 text-left last:border-0 hover:bg-[var(--panel2)]">
      <MarcaPrioridad s={f.eq.severidad} tamano={13} />
      <span className="min-w-0 flex-[2]">
        <b className="block truncate text-[15px] leading-tight">{f.eq.nombre}</b>
        <small className="font-mono block truncate text-[12px] text-[var(--tinta3)]">{f.eq.id} · {ambito.global ? f.campoNombre : f.eq.sistema} · {f.eq.estado}</small>
      </span>
      <span className="hidden gap-1 sm:flex">
        <Chip>{f.eq.criticidad}/5</Chip>
        {f.eq.redundancia === 'sin respaldo' && <Chip tono="fuerte">sin respaldo</Chip>}
      </span>
      {/* Las unidades van una vez, en el encabezado de cada columna; el lector las oye en la celda. */}
      <span className="tabular w-[70px] shrink-0 text-right">
        <b className="block text-[15px] leading-tight"><span className="sr-only">{f.fallas !== undefined ? 'entre fallas ' : 'entre eventos '}</span>{f.mtbfDias ? `${n0(f.mtbfDias)} d` : '—'}</b>
        <small className="text-[12px] text-[var(--tinta3)]">{f.fallas !== undefined ? plural(f.fallas, 'falla', 'fallas') : plural(f.eventos, 'evento', 'eventos')}</small>
      </span>
      <span className="tabular w-[76px] shrink-0 text-right">
        <b className="block text-[15px] leading-tight">{n0(f.bbl)}<span className="sr-only"> bbl del período</span></b>
      </span>
      <span className="tabular hidden w-[64px] shrink-0 text-right md:block">
        <b className="block text-[15px] leading-tight">{f.ahora ? n0(f.ahora) : '—'}<span className="sr-only"> bbl/d perdiéndose</span></b>
      </span>
    </Tip>
  )

  // Encabezado de las columnas: el rótulo una vez, no en cada fila. Para el lector va en cada celda.
  const encabezado = (
    <div className="flex gap-3 pb-1 text-[12px] text-[var(--tinta3)]" aria-hidden>
      <span className="flex-1" />
      <span className="w-[70px] shrink-0 text-right">cada cuánto</span>
      <span className="w-[76px] shrink-0 text-right">bbl del período</span>
      <span className="hidden w-[64px] shrink-0 text-right md:block">bbl/d ahora</span>
    </div>
  )

  return (
    <>
      <div className="mb-2.5 flex flex-wrap items-center gap-x-6 gap-y-3 rounded border border-[var(--linea)] bg-[var(--panel)] p-4 shadow-[var(--sombra)]">
        <span>
          <b className="tabular block text-[40px] leading-none">{filas.length}</b>
          <small className="text-[14px] text-[var(--tinta3)]">equipos instrumentados</small>
        </span>
        <span className="h-10 w-px bg-[var(--linea)]" />
        <span>
          <b className="tabular block text-[20px] leading-none">{sinRespaldo.length}</b>
          <small className="text-[13px] text-[var(--tinta3)]">sin respaldo</small>
        </span>
        <span>
          <b className="tabular block text-[20px] leading-none">{filas.filter(f => f.eq.severidad > 0).length}</b>
          <small className="text-[13px] text-[var(--tinta3)]">con condición anormal</small>
        </span>
      </div>

      <Lectura>
        Ordenados por condición y, dentro de cada una, por los barriles que cuestan en el período.
        Un clic abre la ficha del equipo. Las columnas: cada cuánto falla (días entre fallas, o entre
        eventos con pozos cerrados) con cuántas van, barriles diferidos del período y lo que se está perdiendo ahora. Servicios y proceso son
        aire, energía, compresión, separación, tratamiento y medición.
        La historia de cada equipo (cuántas veces cerró pozos y cada cuánto) sale del registro de
        eventos del PLC, no de un formulario. Los pozos y sus electrosumergibles tienen su propia
        pantalla.
      </Lectura>

      <Panel className="mt-2.5" titulo={FOCO_BOMBAS ? 'BOMBAS DE LÍNEA' : 'EQUIPOS'}>
        {encabezado}
        {(FOCO_BOMBAS ? foco : filas).map(fila)}
        {FOCO_BOMBAS && fuera.length > 0 && (
          <details className="group mt-1 border-t border-[var(--linea2)]">
            <summary className="flex cursor-pointer list-none items-center gap-3 py-2.5 text-[14px] text-[var(--tinta2)] hover:bg-[var(--panel2)]">
              <MarcaPrioridad s={peorFuera} tamano={13} />
              <span className="flex-1"><b className="text-[var(--tinta)]">Servicios y proceso · {fuera.length}</b></span>
              <span className="tabular text-[13px] text-[var(--tinta3)]">{n0(fuera.reduce((a, f) => a + f.bbl, 0))} bbl del período</span>
              <span className="text-[12px] text-[var(--tinta3)] group-open:rotate-180">▾</span>
            </summary>
            {encabezado}
            {fuera.map(fila)}
          </details>
        )}
      </Panel>
    </>
  )
}
