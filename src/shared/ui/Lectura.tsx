import { useContext } from 'react'
import { ComoSeLee } from './comoSeLee'

/** Renglón que explica cómo se lee una cifra. Solo aparece con el
 *  interruptor «¿cómo se lee?» encendido: la pantalla queda limpia por
 *  defecto y se explica cuando alguien lo pide. */
export function Lectura({ children }: { children: React.ReactNode }) {
  const activo = useContext(ComoSeLee)
  if (!activo) return null
  return (
    <p className="mt-1 rounded-sm border-l-2 border-[var(--tinta3)] bg-[var(--panel2)] px-2 py-1 text-[10.5px] leading-relaxed text-[var(--tinta2)]">
      {children}
    </p>
  )
}
