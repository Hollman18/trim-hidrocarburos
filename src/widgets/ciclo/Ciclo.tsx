import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useApp, useRol } from '@/app/store'
import { cn } from '@/shared/lib/cn'
import { NOMBRE_PARTE } from '@/entities/partes'
import { puedeHacer } from '@/entities/tipos'
import {
  NOMBRE_FASE, LEMA_FASE, ESTADO_PLAN, PALANCA_PRODUCTO,
  type CicloValor, type PlanAccion, type FaseCiclo, type EstadoPlan,
} from '@/shared/api/ciclo'
import { Panel, Boton, Chip } from '@/shared/ui/primitivas'
import { Info } from '@/shared/ui/Info'
import { Tip } from '@/shared/ui/Tip'
import { n0, usd } from '@/shared/lib/formato'
import { fmtHoras } from '@/widgets/bombas/comun'

/** ANTES / DURANTE / DESPUÉS: cifras grandes, texto en ⓘ y globos. */

const FASES: FaseCiclo[] = ['antes', 'durante', 'despues']
const ORDEN_FASE: Record<FaseCiclo, string> = { antes: '1', durante: '2', despues: '3' }

const NOTA_SIMULADO = 'Cifra simulada: sale del motor de TRIM (colchón, orden de cierre, historia de fallas). No entra al libro ni a un informe firmado. El LLM no produce estos números.'

const AYUDA_RETORNO = `Antes + Durante + Después. ${NOTA_SIMULADO} El libro del período mide lo ya perdido.`

function enlaceFase(fase: FaseCiclo, pantallas: string[]): string | undefined {
  const t = (p: string) => pantallas.includes(p)
  if (fase === 'antes') return t('riesgo') ? 'riesgo' : t('mantenimiento') ? 'mantenimiento' : t('bombas') ? 'bombas' : t('confiabilidad') ? 'confiabilidad' : undefined
  if (fase === 'durante') return t('turno') ? 'turno' : t('causa') ? 'causa' : t('riesgo') ? 'riesgo' : undefined
  if (fase === 'despues') return t('diferidos') ? 'diferidos' : t('mantenimiento') ? 'mantenimiento' : t('confiabilidad') ? 'confiabilidad' : undefined
  return undefined
}

function dinero(v: number | undefined): string | undefined {
  if (v === undefined) return undefined
  const d = usd(v)
  return `${d.valor} ${d.unidad}`
}

function CeldaFase({ f, ciclo, grande, onAbrir, onIr, ocultarEquipo }: {
  f: FaseCiclo
  ciclo: CicloValor
  grande?: boolean
  onAbrir?: (campoId: string, equipo: string) => void
  onIr?: (pantalla: string) => void
  /** En resumen gerente: la lista va en «planes» colapsados, no repetir equipo aquí. */
  ocultarEquipo?: boolean
}) {
  const rol = useRol()
  const t = ciclo[f]
  const primero = t.planes[0]
  const destino = onIr ? enlaceFase(f, rol.pantallas) : undefined
  const pct = ciclo.retornoBbl > 0 ? Math.min(100, (t.bbl / ciclo.retornoBbl) * 100) : 0
  const ir = destino && onIr ? () => onIr(destino) : undefined

  const cuerpo = (
    <>
      <span className="flex items-baseline justify-between gap-2">
        <span className="font-cond text-[11px] font-semibold tracking-wide text-[var(--tinta3)]">
          <span className="mr-1 tabular text-[var(--marca-1)]">{ORDEN_FASE[f]}</span>{NOMBRE_FASE[f]}
        </span>
        {t.equipos > 0 && <span className="tabular text-[10px] text-[var(--tinta3)]">{t.equipos}</span>}
      </span>
      <b className={`tabular mt-1 block leading-none ${grande ? 'text-[28px]' : 'text-[20px]'}`}>
        {n0(t.bbl)}<small className="ml-1 text-[11px] font-normal text-[var(--tinta3)]">bbl</small>
      </b>
      {f === 'durante' && ciclo.durante.bblDia > 0 && (
        <small className="tabular block text-[10px] text-[var(--tinta2)]">{n0(ciclo.durante.bblDia)} bbl/d</small>
      )}
      <span className="mt-2 block h-1 overflow-hidden rounded-sm bg-[var(--panel2)]" aria-hidden>
        <i className="block h-full bg-[var(--dato-1)] transition-[width]" style={{ width: `${pct}%` }} />
      </span>
      {primero && onAbrir && !ocultarEquipo && (
        <button type="button" onClick={e => { e.stopPropagation(); onAbrir(primero.campoId, primero.equipo) }}
          className="mt-1.5 block w-full cursor-pointer truncate text-left text-[11px] text-[var(--tinta2)] hover:text-[var(--tinta)] hover:underline">
          {primero.equipo}
        </button>
      )}
    </>
  )

  return (
    <Tip titulo={NOMBRE_FASE[f]} pista={LEMA_FASE[f]}
      filas={[
        ['Producto', PALANCA_PRODUCTO[f]],
        ...t.planes.slice(0, 6).map(p => [p.equipo, p.bbl > 0 ? `${n0(p.bbl)} bbl` : '—'] as [string, string]),
      ]}
      imprimir="pista"
      {...(ir ? { as: 'button' as const, type: 'button' as const, onClick: ir } : {})}
      className={`block min-w-0 rounded px-2 py-2 text-left ${ir ? 'cursor-pointer hover:bg-[var(--panel2)]' : ''}`}>
      {cuerpo}
    </Tip>
  )
}

export function BloqueCiclo({ ciclo, onAbrir, onIr, compacto = false }: {
  ciclo: CicloValor
  onAbrir?: (campoId: string, equipo: string) => void
  onIr?: (pantalla: string) => void
  compacto?: boolean
}) {
  const dineroRetorno = dinero(ciclo.valorUsd)
  const planes = [...ciclo.durante.planes, ...ciclo.antes.planes, ...ciclo.despues.planes]
    .sort((a, b) => b.bbl - a.bbl)
  const nPlanes = planes.length

  return (
    <section className="mb-2.5 rounded border border-[var(--linea)] border-l-[3px] border-l-[var(--marca-1)] bg-[var(--panel)] p-4 shadow-[var(--sombra)]">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <span className="flex flex-wrap items-end gap-x-2 gap-y-1">
          <b className="tabular text-[40px] leading-none">{n0(ciclo.retornoBbl)}</b>
          <span className="pb-1">
            <small className="block text-[11px] text-[var(--tinta3)]">bbl · retorno</small>
            {dineroRetorno && <small className="tabular block text-[12px] text-[var(--tinta2)]">{dineroRetorno}</small>}
          </span>
          <Info titulo="Tres palancas" texto={AYUDA_RETORNO} rotulo="ⓘ" className="pb-1.5" />
        </span>
        <span className="flex flex-wrap gap-1 pb-0.5">
          {FASES.map(f => (
            <Chip key={f}>{NOMBRE_FASE[f]}</Chip>
          ))}
          <Chip>simulado</Chip>
        </span>
      </div>

      <div className="mt-3 grid gap-2 border-t border-[var(--linea2)] pt-3 [grid-template-columns:repeat(3,minmax(0,1fr))]">
        {FASES.map(f => (
          <CeldaFase key={f} f={f} ciclo={ciclo} grande onAbrir={onAbrir} onIr={onIr} ocultarEquipo />
        ))}
      </div>

      {!compacto && nPlanes > 0 && (
        <PlanesDe planes={planes.slice(0, 12)} onAbrir={onAbrir} className="mt-2 border-t border-[var(--linea2)] pt-1" />
      )}
    </section>
  )
}

function DesplegablePlanes({ abierto, onToggle, n, children }: {
  abierto: boolean
  onToggle: () => void
  n: number
  children: React.ReactNode
}) {
  return (
    <div>
      <button type="button" onClick={onToggle} aria-expanded={abierto}
        className="flex w-full cursor-pointer items-center gap-2 rounded py-2 pr-1 text-left hover:bg-[var(--panel2)]">
        <ChevronDown className={cn('size-4 shrink-0 text-[var(--tinta3)] transition-transform', abierto && 'rotate-180')} />
        <span className="min-w-0 flex-1 text-[12px] font-medium text-[var(--tinta)]">
          {abierto ? 'Ocultar planes' : 'Ver planes de acción'}
        </span>
        <span className="font-cond shrink-0 rounded bg-[var(--panel2)] px-2 py-0.5 text-[10px] font-semibold tabular tracking-wide text-[var(--tinta2)]">
          {n}
        </span>
      </button>
      {abierto && <div className="pb-1">{children}</div>}
    </div>
  )
}

/** Lista de planes: plegada por defecto en todos los roles. Una línea por plan; el texto va al globo. */
export function PlanesDe({ planes, onAbrir, className }: {
  planes: PlanAccion[]
  onAbrir?: (campoId: string, equipo: string) => void
  className?: string
}) {
  const [abierto, setAbierto] = useState(false)
  const ordenados = [...planes].sort((a, b) => b.bbl - a.bbl)
  if (!ordenados.length) return null
  return (
    <div className={className}>
      <DesplegablePlanes abierto={abierto} onToggle={() => setAbierto(v => !v)} n={ordenados.length}>
        {ordenados.map(p => <PlanFila key={p.id} plan={p} onAbrir={onAbrir} />)}
      </DesplegablePlanes>
    </div>
  )
}

function PlanFila({ plan: p, onAbrir }: {
  plan: PlanAccion
  onAbrir?: (campoId: string, equipo: string) => void
}) {
  const rol = useRol()
  const decidir = useApp(s => s.decidirPlan)
  const puede = puedeHacer(rol.puede, 'planes:decidir')
  const [error, setError] = useState<string>()
  const [pendiente, setPendiente] = useState(false)
  const estado = p.estado ?? 'propuesto'

  const marcar = async (siguiente: Exclude<EstadoPlan, 'propuesto'>, motivo: string) => {
    setPendiente(true); setError(undefined)
    const r = await decidir(p.id, siguiente, motivo)
    setPendiente(false)
    if (!r.ok) setError(r.error)
  }

  const filasTip: Array<[string, string]> = [
    ['Fase', NOMBRE_FASE[p.fase]],
    ['Estado', ESTADO_PLAN[estado]],
    ['Acción', p.accion],
    ...(p.parte ? [['Parte', NOMBRE_PARTE[p.parte]] as [string, string]] : []),
    ...p.supuestos.map((s, i): [string, string] => [`${i + 1}`, s]),
  ]

  return (
    <div className="border-b border-[var(--linea2)] py-1.5 last:border-0">
      <Tip as="div" titulo={p.titulo} filas={filasTip} pista={p.accion} imprimir="pista"
        className="flex items-center gap-2 text-[11.5px]">
        <span className="flex min-w-0 flex-1 items-baseline gap-x-1.5">
          <Chip tono={p.fase === 'durante' ? 'fuerte' : 'neutro'}>{ORDEN_FASE[p.fase]}</Chip>
          {onAbrir ? (
            <button type="button" onClick={e => { e.stopPropagation(); onAbrir(p.campoId, p.equipo) }}
              className="shrink-0 cursor-pointer font-medium tabular hover:underline">{p.equipo}</button>
          ) : <b className="shrink-0 tabular">{p.equipo}</b>}
          <span className="min-w-0 truncate font-medium text-[var(--tinta)]">{p.titulo}</span>
        </span>
        <span className="tabular shrink-0 text-right leading-tight">
          <b className="block text-[14px]">{p.bbl > 0 ? n0(p.bbl) : '—'}</b>
          {p.horas !== undefined && <small className="block text-[10px] text-[var(--tinta3)]">{fmtHoras(p.horas, true)}</small>}
        </span>
      </Tip>
      {puede && estado !== 'ejecutado' && (
        <span className="mt-1 flex flex-wrap gap-1.5">
          {estado === 'propuesto' && (
            <Boton variante="chico" disabled={pendiente} onClick={() => marcar('aceptado', 'Plan aceptado desde la pantalla')}>Aceptar</Boton>
          )}
          {estado === 'aceptado' && (
            <Boton variante="chico" disabled={pendiente} onClick={() => marcar('ejecutado', 'Plan marcado ejecutado desde la pantalla')}>Ejecutar</Boton>
          )}
        </span>
      )}
      {error && <p className="mt-1 text-[11px] text-[var(--tinta2)]">{error}</p>}
    </div>
  )
}

/** Cinturón compacto: retorno + tres cifras; detalle en globo e ⓘ. */
export function CicloCifras({ ciclo, onIr }: {
  ciclo: CicloValor
  onIr?: (pantalla: string) => void
}) {
  const dineroRetorno = dinero(ciclo.valorUsd)
  return (
    <div className="mb-2.5 rounded border border-[var(--linea)] bg-[var(--panel)] px-3 py-2.5 shadow-[var(--sombra)]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <b className="tabular text-[24px] leading-none">{n0(ciclo.retornoBbl)}</b>
        <small className="text-[11px] text-[var(--tinta3)]">bbl</small>
        {dineroRetorno && <small className="tabular text-[11px] text-[var(--tinta2)]">{dineroRetorno}</small>}
        <Info titulo="Retorno" texto={AYUDA_RETORNO} />
        <span className="ml-auto flex gap-1">
          {FASES.map(f => <Chip key={f}>{NOMBRE_FASE[f]}</Chip>)}
        </span>
      </div>
      <div className="mt-2 grid gap-1 [grid-template-columns:repeat(3,minmax(0,1fr))]">
        {FASES.map(f => (
          <CeldaFase key={f} f={f} ciclo={ciclo} onIr={onIr} />
        ))}
      </div>
    </div>
  )
}

export function PanelCiclo({ ciclo, titulo = 'CICLO DE VALOR' }: { ciclo: CicloValor; titulo?: string }) {
  return (
    <Panel className="mb-2.5" titulo={titulo} extra="simulado">
      <BloqueCiclo ciclo={ciclo} compacto />
    </Panel>
  )
}
