import type { ReactNode } from 'react'
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
  return (
    <div className="fixed inset-0 z-[110] flex flex-col justify-end" data-hoja-inferior>
      {/* El fondo cierra con el dedo; con teclado, Escape o «Cancelar» de la hoja. */}
      <div aria-hidden onClick={onCerrar} className="no-imprimir flex-1 bg-[rgb(10_12_16/.40)]" />
      <div ref={dialogo} tabIndex={-1} role="dialog" aria-modal="true" aria-label={titulo}
        className="max-h-[90dvh] w-full overflow-y-auto rounded-t-[20px] bg-[var(--panel)] p-2 shadow-[var(--sombra-flota)] outline-none">
        {children}
      </div>
    </div>
  )
}
