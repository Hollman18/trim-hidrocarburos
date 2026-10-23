import { useSyncExternalStore } from 'react'

/** El ancho del teléfono: por debajo de `sm` de Tailwind (640 px). */
const TELEFONO = '(max-width: 639.98px)'
const suscribir = (cb: () => void) => { const m = matchMedia(TELEFONO); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb) }
const esTelefono = () => matchMedia(TELEFONO).matches

/** ¿La pantalla es la de un teléfono? Para lo que cambia de forma, no solo de
 *  tamaño: una hoja que en el teléfono se abre desde abajo y en el escritorio
 *  va en su lugar (U1 §2.6). Lo que solo cambia de tamaño va con clases `sm:`. */
export const useTelefono = () => useSyncExternalStore(suscribir, esTelefono, () => false)
