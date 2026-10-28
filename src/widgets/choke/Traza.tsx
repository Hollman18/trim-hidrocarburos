import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { NOMBRE_TIPO_PERDIDA, EXPLICA_PERDIDA, type PerdidaVigente } from '@/shared/api/perdidas'
import type { NodoBalance, ParadaDelBalance, TramoDelBalance, VistaBalance } from '@/shared/api/balance'
import { useModal } from '@/shared/ui/foco'
import { useTelefono } from '@/shared/ui/telefono'
import { n0 } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { cuandoCorto } from './horas'

/** LA TRAZABILIDAD DE UN TRAMO, a un toque desde el balance (CONSTRUCCION.md: «de cada número,
 *  su árbol: tramo → diferida o pérdida → planeada → N1 → N2 → la parada; de cada parada,
 *  quién dijo qué y cuándo (D1)»).
 *
 *  A la derecha en el escritorio y una hoja que sube en el teléfono. Cada nodo trae sus barriles
 *  enteros del motor (suman el de su tramo); aquí no se suma nada.
 *  C1 (QA v3) · X2 N5: en el escritorio es un panel NO modal, como la hoja del tramo (HojaTramo):
 *  sin velo y debajo de la cabecera, así la franja de condiciones queda a la vista y se puede usar.
 *  Escape o un clic afuera lo cierran, y el foco vuelve a quien lo abrió. En el teléfono sigue
 *  siendo la hoja modal con su velo. */
export function Traza({ v, tramo, onCerrar }: { v: VistaBalance; tramo: TramoDelBalance['tramo']; onCerrar: () => void }) {
  const telefono = useTelefono()
  const a = v.arbol.find(x => x.tramo === tramo)
  const t = v.total.porTramo.find(x => x.tramo === tramo)
  if (!a || !t) return null
  return telefono ? <TrazaModal v={v} a={a} onCerrar={onCerrar} /> : <TrazaNoModal v={v} a={a} onCerrar={onCerrar} />
}

type Arbol = VistaBalance['arbol'][number]

function TrazaModal({ v, a, onCerrar }: { v: VistaBalance; a: Arbol; onCerrar: () => void }) {
  const dialogo = useModal<HTMLDivElement>(onCerrar, a.tramo)
  return (
    <div className="no-imprimir fixed inset-0 z-[115] flex" data-traza={a.tramo}>
      <div aria-hidden data-velo onClick={onCerrar} className="flex-1 bg-[var(--velo)]" />
      <div ref={dialogo} tabIndex={-1} role="dialog" aria-modal="true" aria-label={`Las causas · ${a.nombre} · ${v.periodo}`}
        className="fixed inset-x-0 bottom-0 flex max-h-[90dvh] flex-col overflow-y-auto rounded-t-[16px] bg-[var(--elevado)] px-4 pb-6 pt-3 shadow-[var(--sombra-flota)] outline-none">
        <ContenidoTraza v={v} a={a} onCerrar={onCerrar} />
      </div>
    </div>
  )
}

function TrazaNoModal({ v, a, onCerrar }: { v: VistaBalance; a: Arbol; onCerrar: () => void }) {
  const panel = useRef<HTMLDivElement>(null)
  const cerrar = useRef(onCerrar)
  useEffect(() => { cerrar.current = onCerrar }, [onCerrar])
  // Empieza debajo de la cabecera: la franja de condiciones no se tapa (X2 N5).
  const [arriba] = useState(() => Math.max(0, Math.round(document.querySelector('[data-cabecera]')?.getBoundingClientRect().bottom ?? 0)))
  useEffect(() => {
    const el = panel.current
    if (!el) return
    const antes = document.activeElement instanceof HTMLElement ? document.activeElement : null
    el.focus()
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || document.querySelector('[aria-modal="true"]')) return
      e.preventDefault(); cerrar.current()
    }
    const toque = (e: PointerEvent) => {
      const t = e.target as Node | null
      if (!t || el.contains(t) || document.querySelector('[aria-modal="true"]')?.contains(t)) return
      // Otro tramo del balance: lo abre su propio clic.
      if (t instanceof Element && t.closest('[data-tramo-balance]')) return
      cerrar.current()
    }
    document.addEventListener('keydown', tecla)
    document.addEventListener('pointerdown', toque)
    return () => {
      document.removeEventListener('keydown', tecla)
      document.removeEventListener('pointerdown', toque)
      if (antes && antes.isConnected && !antes.closest('[inert]')) antes.focus()
    }
  }, [])
  return (
    <div ref={panel} tabIndex={-1} role="dialog" aria-label={`Las causas · ${a.nombre} · ${v.periodo}`} data-traza={a.tramo} data-no-modal=""
      style={{ top: arriba }}
      className="no-imprimir fixed bottom-0 right-0 z-[115] flex w-[min(480px,100vw)] flex-col overflow-y-auto border-l border-[var(--linea)] bg-[var(--elevado)] px-6 py-5 shadow-[var(--sombra-flota)] outline-none">
      <ContenidoTraza v={v} a={a} onCerrar={onCerrar} />
    </div>
  )
}

function ContenidoTraza({ v, a, onCerrar }: { v: VistaBalance; a: Arbol; onCerrar: () => void }) {
  return (
    <>
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-semibold text-[var(--tinta)]">{a.nombre}</h2>
          <p className="text-[14px] text-[var(--tinta2)]">{v.periodo} · las causas, de lo que más pesa a lo que menos</p>
        </div>
        <button type="button" onClick={onCerrar} aria-label="Cerrar" className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-[8px] hover:bg-[var(--panel2)]">
          <X aria-hidden className="size-5" />
        </button>
      </header>

      <section aria-label="Diferido" className="mt-4" data-traza-diferida={a.diferida.bblEntero}>
        <h3 className="flex items-baseline justify-between gap-2 border-b border-[var(--linea)] pb-1.5">
          <span className="text-[15px] font-semibold text-[var(--tinta)]">Diferido</span>
          <b className="tabular-nums text-[18px] text-[var(--tinta)]">{n0(a.diferida.bblEntero)} <small className="text-[13px] font-normal text-[var(--tinta2)]">bbl</small></b>
        </h3>
        {a.diferida.hijos.length === 0
          ? <p className="mt-2 text-[14px] text-[var(--tinta2)]">Nada diferido en este tramo.</p>
          : <Nodos nodos={a.diferida.hijos} nivel={0} />}
      </section>

      <section aria-label="Perdido" className="mt-5" data-traza-perdida={a.perdida?.bblEntero ?? 'sin-registro'}>
        <h3 className="flex items-baseline justify-between gap-2 border-b border-[var(--linea)] pb-1.5">
          <span className="text-[15px] font-semibold text-[var(--tinta)]">Perdido</span>
          {a.perdida
            ? <b className="tabular-nums text-[18px] text-[var(--tinta)]">{n0(a.perdida.bblEntero)} <small className="text-[13px] font-normal text-[var(--tinta2)]">bbl</small></b>
            : <span className="text-[14px] text-[var(--tinta2)]">sin registro</span>}
        </h3>
        {a.perdida
          ? <Nodos nodos={a.perdida.hijos} nivel={0} />
          : <p className="mt-2 text-[14px] leading-snug text-[var(--tinta2)]">{EXPLICA_PERDIDA}</p>}
      </section>
      <p className="mt-5 text-[13px] text-[var(--tinta2)]">El diferido y el perdido van aparte: nunca se suman.</p>
    </>
  )
}

/** Un nivel del árbol: su texto y sus barriles; debajo, lo que cuelga (o las paradas y pérdidas de la hoja). */
function Nodos({ nodos, nivel }: { nodos: NodoBalance[]; nivel: number }) {
  return (
    <ul className={cn('flex flex-col', nivel > 0 && 'ml-3 border-l border-[var(--linea2)] pl-3')}>
      {nodos.filter(n => n.bblEntero > 0 || n.eventos > 0).map(n => (
        <li key={`${n.nivel}|${n.valor}`} data-nodo={n.nivel} data-valor={n.valor} data-bbl={n.bblEntero} className="pt-2">
          <p className="flex items-baseline justify-between gap-3 text-[14px]">
            <span className={cn('min-w-0', nivel === 0 ? 'font-semibold text-[var(--tinta)]' : 'text-[var(--tinta)]')}>{n.texto}</span>
            <span className="shrink-0 tabular-nums text-[var(--tinta)]">{n0(n.bblEntero)} <small className="text-[12px] text-[var(--tinta2)]">bbl</small></span>
          </p>
          {n.hijos.length > 0 && <Nodos nodos={n.hijos} nivel={nivel + 1} />}
          {n.paradas && n.paradas.length > 0 && <Paradas paradas={n.paradas} />}
          {n.perdidas && n.perdidas.length > 0 && <Perdidas perdidas={n.perdidas} />}
        </li>
      ))}
    </ul>
  )
}

const ESTADO: Record<ParadaDelBalance['estado'], string> = {
  propuesta: 'propuesta de TRIM, por confirmar', 'por-precisar': 'por precisar', confirmada: 'confirmada', pendiente: 'falta la causa',
}

/** Cada parada: el pozo, el equipo, sus barriles, cuándo y quién dijo qué (D1). */
function Paradas({ paradas }: { paradas: ParadaDelBalance[] }) {
  return (
    <ul className="ml-3 mt-1 flex flex-col gap-1.5 border-l border-[var(--linea2)] pl-3">
      {paradas.map(p => (
        <li key={`${p.campoId}|${p.eventoId}`} data-parada-balance={p.pozo} data-bbl={p.bblEntero} className="rounded-[8px] bg-[var(--panel2)] px-2.5 py-2 text-[14px]">
          <p className="flex items-baseline justify-between gap-2">
            <span><b className="font-semibold text-[var(--tinta)]">{p.pozo}</b>{p.equipo !== p.pozo && <span className="text-[var(--tinta2)]"> · {p.equipo}</span>}</span>
            <span className="tabular-nums text-[var(--tinta)]">{n0(p.bblEntero)} <small className="text-[12px] text-[var(--tinta2)]">bbl</small></span>
          </p>
          <p className="text-[13px] text-[var(--tinta2)]">{cuandoCorto(p.inicio)} → {p.fin ? cuandoCorto(p.fin) : 'sigue'} · {ESTADO[p.estado]}</p>
          {p.dijeron.length === 0
            ? <p className="text-[13px] text-[var(--tinta2)]">Todo es propuesta de TRIM: nadie ha dicho nada todavía.</p>
            : (
              <ul className="mt-0.5" aria-label={`Quién dijo qué de ${p.pozo}`}>
                {p.dijeron.map(d => (
                  <li key={`${d.paso}|${d.hora}|${d.valor}`} className="text-[13px] text-[var(--tinta2)]" data-dicho={d.paso}>
                    <b className="font-medium text-[var(--tinta)]">{d.por}</b>: {d.texto} · {cuandoCorto(d.hora)}
                  </li>
                ))}
              </ul>
            )}
        </li>
      ))}
    </ul>
  )
}

/** Cada pérdida que rige: el tipo, dónde, su volumen y cómo se supo, quién la registró y sus versiones. */
function Perdidas({ perdidas }: { perdidas: PerdidaVigente[] }) {
  return (
    <ul className="ml-3 mt-1 flex flex-col gap-1.5 border-l border-[var(--linea2)] pl-3">
      {perdidas.map(p => (
        <li key={p.id} data-perdida-registro={p.id} className="rounded-[8px] bg-[var(--panel2)] px-2.5 py-2 text-[14px]">
          <p className="flex items-baseline justify-between gap-2">
            <span><b className="font-semibold text-[var(--tinta)]">{NOMBRE_TIPO_PERDIDA[p.tipo]}</b><span className="text-[var(--tinta2)]"> · {p.donde}</span></span>
            <span className="tabular-nums text-[var(--tinta)]">{n0(p.bblEntero)} <small className="text-[12px] text-[var(--tinta2)]">bbl</small></span>
          </p>
          <p className="text-[13px] text-[var(--tinta2)]">{cuandoCorto(p.inicio)} → {p.fin ? cuandoCorto(p.fin) : 'sigue'} · {p.volumen.fuente === 'medido' ? 'medido' : 'estimado'}{p.volumen.gasKpc ? ` · gas ${n0(p.volumen.gasKpc)} KPC` : ''}</p>
          <p className="text-[13px] text-[var(--tinta2)]"><b className="font-medium text-[var(--tinta)]">{p.por}</b> · {cuandoCorto(p.hora)}{p.historia.length > 0 ? ` · corrige ${p.historia.length} ${p.historia.length === 1 ? 'versión' : 'versiones'}` : ''}</p>
        </li>
      ))}
    </ul>
  )
}
