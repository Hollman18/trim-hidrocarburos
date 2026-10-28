import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTelefono } from './telefono'
import { useModal } from './foco'

/** Lo que en el escritorio va en su lugar y en el teléfono se abre como una hoja
 *  desde abajo, al 90 % de la pantalla (U1 §2.6: «Corregir abre una hoja inferior
 *  al 90 % de la pantalla»; B-46). En el teléfono es un diálogo modal con la
 *  pila de `useModal`: el foco entra, lo de atrás queda inerte, Escape o tocar
 *  fuera la cierran y el foco vuelve a quien la abrió. */
export function HojaInferior({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: ReactNode }) {
  const telefono = useTelefono()
  if (!telefono) return <>{children}</>
  return <Hoja titulo={titulo} onCerrar={onCerrar}>{children}</Hoja>
}

function Hoja({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: ReactNode }) {
  const dialogo = useModal<HTMLDivElement>(onCerrar)
  // Al final de la app, como el Modal: dentro de una tarjeta con `contain` o `@container`, el
  // `fixed` quedaba relativo a la tarjeta y la hoja salía por debajo de la pantalla (R5, 390 px).
  const [destino] = useState(() => (typeof document === 'undefined' ? null : document.querySelector<HTMLElement>('.raiz-app')))
  const hoja = (
    <div className="fixed inset-0 z-[110] flex flex-col justify-end" data-hoja-inferior>
      {/* El fondo cierra con el dedo; con teclado, Escape o «Cancelar» de la hoja. */}
      <div aria-hidden data-velo onClick={onCerrar} className="no-imprimir flex-1 bg-[var(--velo)] transition-opacity duration-200 starting:opacity-0 motion-reduce:transition-none" />
      {/* D1: la misma hoja del modal de detalle en el teléfono (`Modal`): sube en 200 ms, con su agarradera. */}
      <div ref={dialogo} tabIndex={-1} role="dialog" aria-modal="true" aria-label={titulo}
        className="max-h-[90dvh] w-full overflow-y-auto overscroll-contain rounded-t-[18px] bg-[var(--panel)] px-2 pb-2 shadow-[var(--sombra-flota),0_0_0_1px_var(--linea)] outline-none transition-[translate] duration-200 ease-[cubic-bezier(.2,0,0,1)] starting:translate-y-full motion-reduce:transition-none">
        <div aria-hidden onClick={onCerrar} className="no-imprimir flex cursor-pointer justify-center pb-1.5 pt-2.5"><span className="block h-1 w-10 rounded-full bg-[var(--linea)]" /></div>
        {children}
      </div>
    </div>
  )
  return destino ? createPortal(hoja, destino) : hoja
}
