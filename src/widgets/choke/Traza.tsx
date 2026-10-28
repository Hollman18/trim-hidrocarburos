import { NOMBRE_TIPO_PERDIDA, EXPLICA_PERDIDA, type PerdidaVigente } from '@/shared/api/perdidas'
import type { NodoBalance, ParadaDelBalance, TramoDelBalance, VistaBalance } from '@/shared/api/balance'
import { Modal } from '@/shared/ui/Modal'
import { n0 } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { cuandoCorto } from './horas'

/** LA TRAZABILIDAD DE UN TRAMO, a un toque desde el balance (CONSTRUCCION.md: «de cada número,
 *  su árbol: tramo → diferida o pérdida → planeada → N1 → N2 → la parada; de cada parada,
 *  quién dijo qué y cuándo (D1)»).
 *
 *  Cada nodo trae sus barriles enteros del motor (suman el de su tramo); aquí no se suma nada.
 *  D1 (el dueño, 27-oct): se abre en el modal de detalle (`shared/ui/Modal`), centrado en el escritorio
 *  y hoja casi completa en el teléfono. Antes (C1 · QA-11) era un panel no modal a la derecha para no
 *  tapar la franja; la franja queda ahora fuera del modal, detrás del velo. Escape, «Cerrar» o tocar
 *  afuera lo cierran, y el foco vuelve al tramo que lo abrió. */
export function Traza({ v, tramo, onCerrar }: { v: VistaBalance; tramo: TramoDelBalance['tramo']; onCerrar: () => void }) {
  const a = v.arbol.find(x => x.tramo === tramo)
  const t = v.total.porTramo.find(x => x.tramo === tramo)
  if (!a || !t) return null
  return (
    <Modal className="no-imprimir" data-traza={a.tramo} onCerrar={onCerrar} contenido={a.tramo}
      titulo={a.nombre} subtitulo={`${v.periodo} · las causas, de lo que más pesa a lo que menos`}>
      <ContenidoTraza a={a} />
    </Modal>
  )
}

type Arbol = VistaBalance['arbol'][number]

function ContenidoTraza({ a }: { a: Arbol }) {
  return (
    <>
      <section aria-label="Diferido" data-traza-diferida={a.diferida.bblEntero}>
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
