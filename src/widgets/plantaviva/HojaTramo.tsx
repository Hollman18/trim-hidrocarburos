import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { NOMBRE_MOMENTO, LEMA_MOMENTO, type Momento, type PlantaDelCampo, type TramoVivo } from '@/shared/api/plantaViva'
import { MarcaPrioridad, MarcaCondicion } from '@/shared/ui/Prioridad'
import { Modal } from '@/shared/ui/Modal'
import { n0 } from './cifras'
import { useAcciones } from './acciones'

type Props = { planta: PlantaDelCampo; tramo: TramoVivo; momento: Momento; periodo: string
  /** Ya no cambia nada: el modal decide solo si es hoja de teléfono (D1). Se deja para quien lo pasa. */
  telefono?: boolean
  onCerrar: () => void
  /** Lo que agrega la pantalla que la abre (Planta: ir al esquema o al agua). */
  acciones?: ReactNode }

/** La hoja del tramo (X4 §4.5). Dice, en el momento escogido:
 *  1. la frase del tramo;
 *  2. sus equipos, con su marca y sus barriles (un equipo abre su ficha ejecutiva);
 *  3. ¿por qué?: el árbol del tramo en el orden de gestión, en palabras y sin códigos;
 *  4. la flecha desde que entró TRIM;
 *  5. para producir más.
 *  D1 (el dueño, 27-oct): es el modal de detalle (`shared/ui/Modal`), centrado en el escritorio y
 *  hoja casi completa en el teléfono. Antes era un panel no modal a la derecha (H7); la franja queda
 *  ahora detrás del velo. Escape, «Cerrar» o tocar afuera lo cierran y el foco vuelve al tramo. */
export function HojaTramo(p: Props) {
  return (
    <Modal className="no-imprimir" data-hoja-tramo={p.tramo.tramo} onCerrar={p.onCerrar} contenido={`${p.tramo.tramo}|${p.momento}`}
      titulo={p.tramo.nombre} subtitulo={`${p.planta.nombre} · ${p.momento === 'durante' ? 'ahora' : LEMA_MOMENTO[p.momento]}`}>
      <Contenido {...p} />
    </Modal>
  )
}

function Contenido({ planta, tramo: t, momento, periodo, onCerrar, acciones }: Props) {
  const { abrir } = useAcciones()
  const abrirEquipo = (equipo: string) => { onCerrar(); abrir({ campoId: planta.campoId, equipo }) }
  return (
    <>
        <p className="text-[18px] font-semibold leading-[1.35] text-[var(--tinta)]" data-frase-tramo="">{t.frase}</p>
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
