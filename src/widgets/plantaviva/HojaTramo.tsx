import { X } from 'lucide-react'
import { NOMBRE_MOMENTO, LEMA_MOMENTO, type Momento, type PlantaDelCampo, type TramoVivo } from '@/shared/api/plantaViva'
import { MarcaPrioridad, MarcaCondicion } from '@/shared/ui/Prioridad'
import { useModal } from '@/shared/ui/foco'
import { cn } from '@/shared/lib/cn'
import { Chevron } from './piezas'
import { n0 } from './cifras'
import { useAcciones } from './acciones'

/** La hoja del tramo (X4 §4.5): un panel a la derecha en el escritorio y una
 *  hoja que sube en el teléfono. Dice, en el momento escogido:
 *  1. la frase del tramo;
 *  2. sus equipos, con su marca y sus barriles (un equipo abre su ficha ejecutiva);
 *  3. ¿por qué?: el árbol del tramo en el orden de gestión, en palabras y sin códigos;
 *  4. la flecha desde que entró TRIM;
 *  5. para producir más.
 *  Es un diálogo: el foco entra, lo de atrás queda inerte y Escape la cierra. */
export function HojaTramo({ planta, tramo: t, momento, periodo, telefono, onCerrar }: {
  planta: PlantaDelCampo; tramo: TramoVivo; momento: Momento; periodo: string; telefono: boolean; onCerrar: () => void
}) {
  const dialogo = useModal<HTMLDivElement>(onCerrar, `${t.tramo}|${momento}`)
  const { abrir } = useAcciones()
  const titulo = `${t.nombre} · ${planta.nombre} · ${momento === 'durante' ? 'ahora' : LEMA_MOMENTO[momento]}`
  const abrirEquipo = (equipo: string) => { onCerrar(); abrir({ campoId: planta.campoId, equipo }) }
  return (
    <div className="no-imprimir fixed inset-0 z-[115] flex" data-hoja-tramo={t.tramo}>
      <div aria-hidden onClick={onCerrar} className="aparece flex-1 bg-[rgb(10_12_16/.4)]" />
      <div ref={dialogo} tabIndex={-1} role="dialog" aria-modal="true" aria-label={titulo} style={{ outline: 'none' }}
        className={cn('flex flex-col overflow-y-auto bg-[var(--elevado)] shadow-[var(--sombra-flota)] outline-none',
          telefono ? 'aparece fixed inset-x-0 bottom-0 max-h-[90dvh] rounded-t-[20px] px-4 pb-6 pt-2' : 'aparece h-full w-[420px] max-w-[92vw] px-6 pb-8 pt-5')}>
        {telefono && <span aria-hidden className="mx-auto mb-2 block h-1 w-10 rounded-full bg-[var(--linea)]" />}
        <div className="flex items-start justify-between gap-3">
          <p className="text-[14px] font-medium text-[var(--tinta2)]">{titulo}</p>
          <button type="button" onClick={onCerrar} aria-label="Cerrar"
            className="-mr-2 -mt-1 flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--tinta2)] hover:bg-[var(--panel2)]">
            <X className="size-5" />
          </button>
        </div>
        <p className="mt-1 text-[18px] font-semibold leading-[1.35] text-[var(--tinta)]" data-frase-tramo="">{t.frase}</p>

        <h4 className="mt-5 text-[13px] font-semibold tracking-[.04em] text-[var(--tinta2)]">Equipos</h4>
        {t.equipos.length === 0
          ? <p className="mt-1 text-[15px] text-[var(--tinta2)]">Ningún equipo de este tramo pierde, avisa ni se trabó en {periodo}.</p>
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
                    <Chevron t={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}

        <h4 className="mt-5 text-[13px] font-semibold tracking-[.04em] text-[var(--tinta2)]">¿Por qué? · {periodo}</h4>
        <ul className="mt-1" data-porque="">
          {t.porque.map(r => (
            <li key={r.texto} className="border-t border-[var(--linea2)] py-2">
              <p className="flex items-baseline justify-between gap-3 text-[15px]">
                <span className={r.bbl > 0.5 ? 'font-semibold text-[var(--tinta)]' : 'text-[var(--tinta2)]'}>{r.texto}</span>
                <b className="tabular-nums text-[var(--tinta)]">{n0(r.bbl)} bbl</b>
              </p>
              {r.detalle.map(d => <p key={d} className="mt-0.5 pl-3 text-[14px] text-[var(--tinta2)]">└ {d}</p>)}
            </li>
          ))}
        </ul>

        {t.desdeTrim && <p className="mt-4 text-[15px] leading-[1.45] text-[var(--tinta)]" data-desde-trim="">{t.desdeTrim.texto}.</p>}
        {planta.paraProducirMas && (
          <>
            <h4 className="mt-5 text-[13px] font-semibold tracking-[.04em] text-[var(--tinta2)]">Para producir más</h4>
            <p className="mt-1 text-[15px] leading-[1.5] text-[var(--tinta2)]">{planta.paraProducirMas}</p>
          </>
        )}
        <p className="mt-5 text-[13px] text-[var(--tinta2)]">{NOMBRE_MOMENTO[momento]} · {LEMA_MOMENTO[momento]}: lo de este tramo cambia con el momento escogido.</p>
      </div>
    </div>
  )
}
