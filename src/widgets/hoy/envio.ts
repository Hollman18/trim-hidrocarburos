import { useCallback, useEffect, useRef, useState } from 'react'
import { DESHACER_MS } from '@/shared/api/hoy'

export type Resultado = { ok: true } | { ok: false; error: string }

/** Lo que se acaba de hacer desde Hoy, con su aviso y su «Deshacer» (X5 §5.7; X4 §5.5). */
export interface Hecho {
  /** La pregunta o la tarjeta: mientras dura, no se vuelve a mostrar. */
  id: string
  /** «Registrado: sello mecánico en P-201B» · «Confirmadas LC-07 y LC-16». */
  texto: string
  /** Una respuesta: se escribe al vencer el aviso o al hacer otra cosa (lo que
   *  venga primero). «Deshacer» la suelta antes, sin escribir nada: nada que borrar. */
  enviar?: () => Promise<Resultado>
  /** Una confirmación ya escrita: «Deshacer» manda la escritura nueva (los pasos
   *  vuelven a lo que propone TRIM con procedencia `retirado`, D1). */
  deshacer?: () => Promise<Resultado>
  /** Solo de esta vista («Todavía no sé» en el libro): no se escribe nada y «Deshacer» la vuelve a mostrar. */
  local?: true
}
/** ¿El aviso lleva «Deshacer»? Una confirmación sin consecutivos que deshacer, no. */
export const seDeshace = (h: Hecho) => !!(h.enviar || h.deshacer || h.local)

/** El aviso oscuro de abajo, con «Deshacer» durante 5 s, y lo que la vista no
 *  muestra mientras tanto. Una respuesta que se sostiene se escribe al vencer el
 *  aviso, al registrar otra o al salir de la página: nunca se pierde. */
export function useEnvio() {
  const [aviso, setAviso] = useState<Hecho | null>(null)
  const [ocultas, setOcultas] = useState<ReadonlySet<string>>(() => new Set())
  const [error, setError] = useState('')
  const pendiente = useRef<Hecho | null>(null)
  const reloj = useRef<number | undefined>(undefined)

  const mostrar = useCallback((id: string) => setOcultas(o => { const n = new Set(o); n.delete(id); return n }), [])
  const enviarPendiente = useCallback(async () => {
    const h = pendiente.current
    pendiente.current = null
    if (!h?.enviar) return
    const r = await h.enviar()
    if (!r.ok) { setError(r.error); mostrar(h.id) }
  }, [mostrar])

  const registrar = useCallback((h: Hecho) => {
    // Lo anterior que se sostenía se escribe ya: solo hay un «Deshacer» a la vez.
    void enviarPendiente()
    window.clearTimeout(reloj.current)
    setError('')
    setOcultas(o => new Set(o).add(h.id))
    pendiente.current = h.enviar ? h : null
    setAviso(h)
    reloj.current = window.setTimeout(() => { void enviarPendiente(); setAviso(a => (a === h ? null : a)) }, DESHACER_MS)
  }, [enviarPendiente])

  const deshacer = useCallback(async () => {
    const h = aviso
    if (!h) return
    window.clearTimeout(reloj.current)
    setAviso(null)
    if (h.deshacer) {
      const r = await h.deshacer()
      if (!r.ok) return setError(r.error)
    } else if (pendiente.current === h) pendiente.current = null
    mostrar(h.id)
  }, [aviso, mostrar])

  // Al salir de la página (o de la pantalla), lo que se sostenía se escribe.
  useEffect(() => {
    const f = () => { void enviarPendiente() }
    addEventListener('pagehide', f)
    return () => { removeEventListener('pagehide', f); window.clearTimeout(reloj.current); f() }
  }, [enviarPendiente])

  return { aviso, ocultas, registrar, deshacer, error, limpiarError: () => setError('') }
}
export type Envio = ReturnType<typeof useEnvio>
