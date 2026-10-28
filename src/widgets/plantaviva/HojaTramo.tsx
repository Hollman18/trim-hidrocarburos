import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronRight, X } from 'lucide-react'
import { NOMBRE_MOMENTO, LEMA_MOMENTO, type Momento, type PlantaDelCampo, type TramoVivo } from '@/shared/api/plantaViva'
import { MarcaPrioridad, MarcaCondicion } from '@/shared/ui/Prioridad'
import { useModal } from '@/shared/ui/foco'
import { n0 } from './cifras'
import { useAcciones } from './acciones'

type Props = { planta: PlantaDelCampo; tramo: TramoVivo; momento: Momento; periodo: string; telefono: boolean; onCerrar: () => void
  /** Lo que agrega la pantalla que la abre (Planta: ir al esquema o al agua). */
  acciones?: ReactNode }

/** La hoja del tramo (X4 §4.5): un panel a la derecha en el escritorio y una
 *  hoja que sube en el teléfono. Dice, en el momento escogido:
 *  1. la frase del tramo;
 *  2. sus equipos, con su marca y sus barriles (un equipo abre su ficha ejecutiva);
 *  3. ¿por qué?: el árbol del tramo en el orden de gestión, en palabras y sin códigos;
 *  4. la flecha desde que entró TRIM;
 *  5. para producir más.
 *  En el escritorio es un panel NO modal (X2 N5 y B11; H7): sin velo, debajo de la
 *  cabecera (la franja de condiciones sigue a la vista y se puede usar), el foco
 *  entra al abrir y vuelve al tramo al cerrar, Escape o un clic afuera lo cierran.
 *  En el teléfono es la hoja que sube, modal, con su velo: tocar el velo la cierra (UI-02). */
export function HojaTramo(p: Props) {
  return p.telefono ? <HojaModal {...p} /> : <PanelNoModal {...p} />
}

const tituloDe = (planta: PlantaDelCampo, t: TramoVivo, momento: Momento) => `${t.nombre} · ${planta.nombre} · ${momento === 'durante' ? 'ahora' : LEMA_MOMENTO[momento]}`

function HojaModal(p: Props) {
  const dialogo = useModal<HTMLDivElement>(p.onCerrar, `${p.tramo.tramo}|${p.momento}`)
  return (
    <div className="no-imprimir fixed inset-0 z-[115] flex" data-hoja-tramo={p.tramo.tramo}>
      {/* El velo no queda inerte (`data-velo`, foco.ts): tocarlo cierra la hoja. */}
      <div aria-hidden data-velo onClick={p.onCerrar} className="aparece flex-1 bg-[rgb(10_12_16/.4)]" />
      <div ref={dialogo} tabIndex={-1} role="dialog" aria-modal="true" aria-label={tituloDe(p.planta, p.tramo, p.momento)} style={{ outline: 'none' }}
        className="aparece fixed inset-x-0 bottom-0 flex max-h-[90dvh] flex-col overflow-y-auto rounded-t-[20px] bg-[var(--elevado)] px-4 pb-6 pt-2 shadow-[var(--sombra-flota)] outline-none">
        <span aria-hidden className="mx-auto mb-2 block h-1 w-10 rounded-full bg-[var(--linea)]" />
        <Contenido {...p} />
      </div>
    </div>
  )
}

function PanelNoModal(p: Props) {
  const panel = useRef<HTMLDivElement>(null)
  const cerrar = useRef(p.onCerrar)
  useEffect(() => { cerrar.current = p.onCerrar }, [p.onCerrar])
  // Empieza debajo de la cabecera: la franja de condiciones no se tapa (X2 N5).
  const [arriba] = useState(() => Math.max(0, Math.round(document.querySelector('[data-cabecera]')?.getBoundingClientRect().bottom ?? 0)))
  useEffect(() => {
    const el = panel.current
    if (!el) return
    // El foco entra al abrir y vuelve a quien abrió (el tramo, un <g> del dibujo) al cerrar (A4).
    const antes = document.activeElement instanceof HTMLElement || document.activeElement instanceof SVGElement ? document.activeElement : null
    el.focus()
    // Escape cierra si no hay un diálogo modal encima; un clic afuera también (no modal: lo de atrás sigue vivo).
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || document.querySelector('[aria-modal="true"]')) return
      e.preventDefault(); cerrar.current()
    }
    const toque = (e: PointerEvent) => {
      const t = e.target as Node | null
      if (!t || el.contains(t) || document.querySelector('[aria-modal="true"]')?.contains(t)) return
      // Otro tramo del dibujo: lo abre su propio clic.
      if (t instanceof Element && t.closest('[data-tramo]')) return
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
    <div ref={panel} tabIndex={-1} role="dialog" aria-label={tituloDe(p.planta, p.tramo, p.momento)} data-hoja-tramo={p.tramo.tramo} data-no-modal=""
      style={{ top: arriba, outline: 'none' }}
      className="no-imprimir aparece fixed bottom-0 right-0 z-[115] flex w-[420px] max-w-[92vw] flex-col overflow-y-auto border-l border-[var(--linea)] bg-[var(--elevado)] px-6 pb-8 pt-5 outline-none">
      <Contenido {...p} />
    </div>
  )
}

function Contenido({ planta, tramo: t, momento, periodo, onCerrar, acciones }: Props) {
  const { abrir } = useAcciones()
  const titulo = tituloDe(planta, t, momento)
  const abrirEquipo = (equipo: string) => { onCerrar(); abrir({ campoId: planta.campoId, equipo }) }
  return (
    <>
        <div className="flex items-start justify-between gap-3">
          <p className="text-[14px] font-medium text-[var(--tinta2)]">{titulo}</p>
          <button type="button" onClick={onCerrar} aria-label="Cerrar"
            className="-mr-2 -mt-1 flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--tinta2)] hover:bg-[var(--panel2)]">
            <X className="size-5" />
          </button>
        </div>
        <p className="mt-1 text-[18px] font-semibold leading-[1.35] text-[var(--tinta)]" data-frase-tramo="">{t.frase}</p>
        {t.limita && planta.limitaSinFirmar && <p className="mt-1 text-[14px] text-[var(--tinta2)]" data-limita-sin-firmar="">Limita {planta.limitaSinFirmar}.</p>}

        <h3 className="mt-5 text-[14px] font-semibold text-[var(--tinta2)]">Equipos</h3>
        {t.equipos.length === 0
          ? <p className="mt-1 text-[15px] text-[var(--tinta2)]">Ningún equipo de este tramo está parado, avisa ni se trabó en {periodo}.</p>
          : (
            <ul className="mt-1">
              {t.equipos.map(e => (
                <li key={e.equipo}>
                  <button type="button" onClick={() => abrirEquipo(e.equipo)} data-equipo-tramo={e.equipo}
                    className="grid min-h-[56px] w-full cursor-pointer grid-cols-[18px_1fr_16px] items-center gap-x-2 border-t border-[var(--linea2)] py-2 text-left hover:bg-[var(--panel2)]">
                    <span className="flex self-start pt-1">{e.prioridad ? <MarcaPrioridad s={e.prioridad} tamano={15} /> : e.sinInstrumento ? <MarcaCondicion c="sin-instrumento" tamano={15} /> : null}</span>
                    <span className="min-w-0 text-[15px]">
                      <b className="font-cond font-bold tracking-[.02em] text-[var(--tinta)]">{e.equipo}</b>
                      <span className="text-[var(--tinta2)]"> · {e.familia} · {e.condicion}</span>
                      <span className="block font-semibold text-[var(--tinta)]">{e.texto}</span>
                    </span>
                    <ChevronRight aria-hidden size={16} strokeWidth={2} className="shrink-0 text-[var(--tinta3)]" />
                  </button>
                </li>
              ))}
            </ul>
          )}

        <h3 className="mt-5 text-[14px] font-semibold text-[var(--tinta2)]">¿Por qué? · {periodo}</h3>
        <ul className="mt-1" data-porque="">
          {t.porque.map(r => (
            <li key={r.texto} className="border-t border-[var(--linea2)] py-2">
              <p className="flex items-baseline justify-between gap-3 text-[15px]">
                <span className={r.bbl > 0.5 ? 'font-semibold text-[var(--tinta)]' : 'text-[var(--tinta2)]'}>{r.texto}</span>
                <b className="tabular-nums text-[var(--tinta)]">{n0(r.entero)} bbl</b>
              </p>
              {r.detalle.map(d => <p key={d} className="mt-0.5 pl-3 text-[14px] text-[var(--tinta2)]">└ {d}</p>)}
            </li>
          ))}
        </ul>

        {t.desdeTrim && <p className="mt-4 text-[15px] leading-[1.45] text-[var(--tinta)]" data-desde-trim="">{t.desdeTrim.texto}.</p>}
        {planta.paraProducirMas && (
          <>
            <h3 className="mt-5 text-[14px] font-semibold text-[var(--tinta2)]">Para producir más</h3>
            <p className="mt-1 text-[15px] leading-[1.5] text-[var(--tinta2)]">{planta.paraProducirMas}</p>
          </>
        )}
        {acciones && <div className="mt-5 flex flex-wrap gap-2" data-acciones-tramo="">{acciones}</div>}
        <p className="mt-5 text-[13px] text-[var(--tinta2)]">{NOMBRE_MOMENTO[momento]} · {LEMA_MOMENTO[momento]}: lo de este tramo cambia con el momento escogido.</p>
    </>
  )
}
