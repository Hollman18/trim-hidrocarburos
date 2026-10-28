import { useId, useRef, useState, type ReactNode, type TouchEvent } from 'react'
import { createPortal } from 'react-dom'
import { X, Maximize2, Minimize2 } from 'lucide-react'
import { useModal } from './foco'
import { useTelefono } from './telefono'
import { cn } from '@/shared/lib/cn'

/** D1 (27-oct) · EL DETALLE, COMO MODAL. El dueño: «cuando le damos a ver el detalle… que salga tipo
 *  modal… una buena experiencia». Todo lo que antes se abría como panel pegado a la derecha (la ficha
 *  del equipo, la trazabilidad de un tramo del balance, la hoja del tramo de La planta viva) se abre
 *  aquí, igual en todas partes:
 *  - en el escritorio, centrado, de 760 px (880 la ficha; «Ampliar» la lleva casi a toda la pantalla),
 *    con la cabecera fija (título, marca, acciones y «Cerrar») y el contenido que se desplaza adentro;
 *  - en el teléfono (< 640 px), una hoja casi a pantalla completa que sube desde abajo, con su
 *    agarradera: tocarla o deslizarla hacia abajo la cierra;
 *  - un velo suave detrás: tocarlo cierra (el velo no queda inerte, `data-velo` en `foco.ts`);
 *  - `useModal`: el foco entra, Tab da la vuelta adentro, lo de atrás queda inerte (la franja también:
 *    queda a la vista, detrás del velo), Escape cierra y el foco vuelve a quien abrió;
 *  - entra en 180 ms (200 la hoja del teléfono) con `@starting-style`; con «menos movimiento», sin
 *    moverse (`motion-reduce` y la regla global de `index.css`).
 *
 *  Antes (H7 de la QA F3 y QA-11 de la v3) estos detalles eran paneles NO modales para no tapar la
 *  franja. El dueño pidió modal y manda: la franja queda fuera del modal, detrás del velo. */
export interface PropsModal {
  /** El título (h2): lo que se abrió. También es el nombre del diálogo. */
  titulo: ReactNode
  /** La línea de arriba del título: el tag del equipo y su marca, o de dónde viene. */
  antetitulo?: ReactNode
  /** La línea de abajo: familia, campo, período. */
  subtitulo?: ReactNode
  /** Lo que va antes de «Ampliar» y «Cerrar» (exportar). */
  acciones?: ReactNode
  onCerrar: () => void
  /** Escape primero hace esto (la ficha cierra antes la cadena del dato). Si no, cierra. */
  alEscape?: () => void
  /** Lo que, al cambiar, reemplaza lo de adentro sin cerrar (otro equipo): el foco no se pierde. */
  contenido?: unknown
  /** 'normal' 760 px; 'amplio' 880 px (la ficha). */
  ancho?: 'normal' | 'amplio'
  /** Ampliado: casi toda la pantalla. Con `onAmpliar`, la cabecera lleva el botón (no en el teléfono). */
  ampliado?: boolean
  onAmpliar?: () => void
  /** Clases del cuerpo desplazable (el relleno). `sinRelleno`: lo pone quien llena (la cadena del dato). */
  cuerpo?: string
  sinRelleno?: boolean
  /** La ficha va en su lugar (el papel la imprime en vez de la vista); lo demás, al final de la app. */
  enSitio?: boolean
  /** Clases del contenedor (p. ej. `no-imprimir`). */
  className?: string
  children: ReactNode
  [dato: `data-${string}`]: string | boolean | undefined
}

/** El botón redondo de la cabecera (ampliar, cerrar): 40 px, 44 de toque en el teléfono. */
export const BOTON_CABECERA = 'toque no-imprimir grid size-10 shrink-0 cursor-pointer place-items-center rounded-full text-[var(--tinta2)] transition-colors duration-[120ms] hover:bg-[var(--panel2)] hover:text-[var(--tinta)]'

export function Modal({ titulo, antetitulo, subtitulo, acciones, onCerrar, alEscape, contenido, ancho = 'normal', ampliado = false, onAmpliar,
  cuerpo, sinRelleno = false, enSitio = false, className, children, ...datos }: PropsModal) {
  const telefono = useTelefono()
  const dialogo = useModal<HTMLDivElement>(alEscape ?? onCerrar, contenido)
  const idTitulo = useId()
  // Al final de la app y no donde se pidió: un ancestro con `transform` o `contain` (una tarjeta, un
  // `@container`) haría del `fixed` algo relativo a él. Se escoge una vez: cambiar de padre remontaría todo.
  const [destino] = useState(() => (enSitio || typeof document === 'undefined' ? null : document.querySelector<HTMLElement>('.raiz-app')))
  // Deslizar la hoja hacia abajo la cierra (teléfono).
  const toque = useRef<number | null>(null)
  const deslizar = {
    onTouchStart: (e: TouchEvent) => { toque.current = e.touches[0]?.clientY ?? null },
    onTouchMove: (e: TouchEvent) => {
      const y0 = toque.current, y = e.touches[0]?.clientY
      if (y0 !== null && y !== undefined && y - y0 > 72) { toque.current = null; onCerrar() }
    },
  }

  const caja = telefono
    ? 'mt-auto max-h-[calc(100dvh-48px)] min-h-[min(60dvh,520px)] w-full rounded-t-[18px] transition-[translate] duration-200 starting:translate-y-full'
    : cn('max-h-[min(920px,calc(100dvh-48px))] rounded-[14px] transition-[opacity,translate,scale] duration-[180ms] starting:translate-y-2 starting:scale-[.985] starting:opacity-0',
      ampliado ? 'h-[calc(100dvh-48px)] w-[min(1280px,calc(100vw-48px))]' : ancho === 'amplio' ? 'w-[min(880px,calc(100vw-48px))]' : 'w-[min(760px,calc(100vw-48px))]')

  const modal = (
    <div ref={dialogo} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={idTitulo} data-modal={telefono ? 'hoja' : 'centro'} {...datos}
      className={cn('fixed inset-0 z-[120] flex items-center justify-center outline-none', !telefono && 'p-6', className)}>
      {/* El velo cierra con el dedo o el ratón; con teclado, Escape o «Cerrar». Un <div>, no un botón: no entra en el ciclo de Tab. */}
      <div aria-hidden data-velo onClick={onCerrar}
        className="no-imprimir absolute inset-0 cursor-default bg-[var(--velo)] transition-opacity duration-200 ease-[cubic-bezier(.2,0,0,1)] starting:opacity-0 motion-reduce:transition-none" />
      <div data-modal-caja
        className={cn('relative flex flex-col overflow-hidden bg-[var(--elevado)] text-[var(--tinta)] shadow-[var(--sombra-flota),0_0_0_1px_var(--linea)] ease-[cubic-bezier(.2,0,0,1)] motion-reduce:transition-none', caja)}>
        {telefono && (
          // La agarradera: se ve que la hoja se baja; tocarla también cierra. El botón de verdad es «Cerrar».
          <div aria-hidden data-agarradera onClick={onCerrar} {...deslizar} className="no-imprimir flex shrink-0 cursor-pointer justify-center pb-1 pt-2.5">
            <span className="block h-1 w-10 rounded-full bg-[var(--linea)]" />
          </div>
        )}
        <header data-modal-cabecera {...(telefono ? deslizar : {})}
          className={cn('relative z-[1] flex shrink-0 items-start gap-3 border-b border-[var(--linea2)] bg-[var(--elevado)]', telefono ? 'px-4 pb-3 pt-1' : 'px-6 pb-4 pt-5')}>
          <div className="min-w-0 flex-1">
            {antetitulo && <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-[var(--tinta2)]" data-modal-antetitulo>{antetitulo}</div>}
            <h2 id={idTitulo} className="text-[18px] font-semibold leading-snug text-[var(--tinta)] [text-wrap:balance]">{titulo}</h2>
            {subtitulo && <p className="mt-0.5 text-[14px] leading-snug text-[var(--tinta2)]">{subtitulo}</p>}
          </div>
          <div className="-mr-2 -mt-1 flex shrink-0 items-center gap-0.5" data-modal-acciones>
            {acciones}
            {onAmpliar && !telefono && (
              <button type="button" onClick={onAmpliar} aria-label={ampliado ? 'Contraer' : 'Expandir'} title={ampliado ? 'Contraer' : 'Ampliar'} className={BOTON_CABECERA}>
                {ampliado ? <Minimize2 aria-hidden className="size-[18px]" /> : <Maximize2 aria-hidden className="size-[18px]" />}
              </button>
            )}
            <button type="button" onClick={onCerrar} aria-label="Cerrar" title="Cerrar (Esc)" className={BOTON_CABECERA}>
              <X aria-hidden className="size-5" />
            </button>
          </div>
        </header>
        <div data-modal-cuerpo className={cn('flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain', !sinRelleno && (telefono ? 'px-4 pb-6 pt-4' : 'px-6 pb-7 pt-5'), cuerpo)}>
          {children}
        </div>
      </div>
    </div>
  )
  return destino ? createPortal(modal, destino) : modal
}
