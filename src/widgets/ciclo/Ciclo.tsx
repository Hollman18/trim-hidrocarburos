import { useState } from 'react'
import { useApp, useRol } from '@/app/store'
import { NOMBRE_PARTE } from '@/entities/partes'
import { puedeHacer } from '@/entities/tipos'
import { NOMBRE_FASE, ESTADO_PLAN, type PlanAccion, type EstadoPlan } from '@/shared/api/ciclo'
import { Boton, Calidad } from '@/shared/ui/primitivas'
import { Tip } from '@/shared/ui/Tip'
import { n0 } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { fmtHoras } from '@/widgets/bombas/comun'

/* EL CICLO ANTES · DURANTE · DESPUÉS (C5 · X4 §3.6 y §4.4; X5 §5.9).
 *
 * El bloque del ciclo ya no es la cifra principal de ninguna pantalla: su
 * contenido se partió por momento. La línea simulada de cada momento va en La
 * planta viva («Lo que todavía se puede mover»), la suma solo en Resultados
 * («Retorno posible del ciclo», simulado) y los planes que alguien decide, como
 * tarjetas de Hoy. Aquí quedan los planes de UN equipo, en su ficha: a donde
 * lleva «Ver el plan ›». Sin los números 1·2·3 (son de las prioridades): cada
 * plan dice su momento con su palabra. */

/** Los planes de un equipo, en la ficha (B): a la vista, cada uno con su momento,
 *  lo que mueve (simulado) y, para quien decide, «Aceptar» o «Ya se hizo». */
export function PlanesDe({ planes, onAbrir, className, titulo: Titulo = 'h3' }: {
  planes: PlanAccion[]
  onAbrir?: (campoId: string, equipo: string) => void
  className?: string
  /** A15: el nivel de su título, el que le toque donde va (como `BloqueSap`). En el diagnóstico va
   *  antes del primer `h2` de la vista: ahí es `h2`; dentro de la ficha (que ya tiene su `h2`), `h3`. */
  titulo?: 'h2' | 'h3'
}) {
  const ordenados = [...planes].sort((a, b) => b.bbl - a.bbl)
  if (!ordenados.length) return null
  return (
    <section className={cn('min-w-0', className)} aria-label="Planes de acción" data-planes="">
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <Titulo className="text-[15px] font-semibold text-[var(--tinta)]">Planes · lo que todavía se puede mover</Titulo>
        <Calidad>simulado</Calidad>
      </header>
      <div className="mt-1.5">
        {ordenados.map(p => <PlanFila key={p.id} plan={p} onAbrir={onAbrir} />)}
      </div>
    </section>
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
    ['Momento', NOMBRE_FASE[p.fase]],
    ['Estado', ESTADO_PLAN[estado]],
    ['Acción', p.accion],
    ...(p.parte ? [['Parte', NOMBRE_PARTE[p.parte]] as [string, string]] : []),
    ...p.supuestos.map((s, i): [string, string] => [`${i + 1}`, s]),
  ]

  return (
    <div className="border-t border-[var(--linea2)] py-2 first:border-t-0" data-plan={p.id}>
      <Tip as="div" titulo={p.titulo} filas={filasTip} pista={p.accion} imprimir="pista"
        className="flex items-start gap-3 text-[15px]">
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] text-[var(--tinta2)]">{NOMBRE_FASE[p.fase]} · {ESTADO_PLAN[estado].toLowerCase()}</span>
          <span className="flex flex-wrap items-baseline gap-x-1.5">
            {onAbrir ? (
              <button type="button" onClick={e => { e.stopPropagation(); onAbrir(p.campoId, p.equipo) }}
                className="font-cond shrink-0 cursor-pointer font-bold hover:underline">{p.equipo}</button>
            ) : <b className="font-cond shrink-0">{p.equipo}</b>}
            <span className="min-w-0 text-[var(--tinta)]">{p.titulo}</span>
          </span>
        </span>
        <span className="shrink-0 text-right leading-tight tabular-nums">
          <b className="block text-[16px]">{p.bbl > 0 ? `≈ ${n0(p.bbl)}` : '—'}</b>
          <small className="block text-[13px] text-[var(--tinta2)]">{p.bbl > 0 ? 'bbl · simulado' : 'no mueve crudo'}{p.horas !== undefined ? ` · ${fmtHoras(p.horas, true)}` : ''}</small>
        </span>
      </Tip>
      {puede && estado !== 'ejecutado' && (
        <span className="mt-1.5 flex flex-wrap gap-1.5">
          {estado === 'propuesto' && (
            <Boton variante="chico" disabled={pendiente} onClick={() => marcar('aceptado', 'Plan aceptado desde la pantalla')}>Aceptar</Boton>
          )}
          {estado === 'aceptado' && (
            <Boton variante="chico" disabled={pendiente} onClick={() => marcar('ejecutado', 'Plan marcado ejecutado desde la pantalla')}>Ya se hizo</Boton>
          )}
        </span>
      )}
      {error && <p className="mt-1 text-[14px] text-[var(--tinta2)]">{error}</p>}
    </div>
  )
}
