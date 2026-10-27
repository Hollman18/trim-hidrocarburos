import { useCallback, useEffect, useRef, useState } from 'react'
import { DESHACER_MS } from '@/shared/api/hoy'

export type Resultado = { ok: true } | { ok: false; error: string }

/** Una respuesta que todavía no se escribió, en una forma que sobrevive a cerrar la
 *  página (P-08): se guarda en el navegador mientras dura su «Deshacer» y, si la
 *  página se cerró antes de escribirla, se escribe al volver a Hoy. */
export type Pendiente =
  | { via: 'libro'; rolId: string; dicho: string; cuerpo: { evento: string; campoId: string; equipo: string; texto: string; parte?: string; modo?: string } }
  | { via: 'anh'; rolId: string; dicho: string; fila: string; cuerpo: { pregunta: string; opcion: string; cadena: string; aplicarAlEvento?: true; aplicarALaCascada?: true; ids?: string[] } }
  /** A3 · Lo que vio, después de la parte (`POST /api/paradas/:evento/vio`). */
  | { via: 'vio'; rolId: string; dicho: string; evento: string; cuerpo: { modo: string; texto?: string } }

/** Lo que se acaba de hacer desde Hoy, con su aviso y su «Deshacer» (X5 §5.7; X4 §5.5). */
export interface Hecho {
  /** La pregunta o la tarjeta: mientras dura, no se vuelve a mostrar. */
  id: string
  /** Lo que dice el aviso. Una respuesta que se sostiene NO dice «Registrado» hasta
   *  que se escribe (P-08): «Se registra en 5 s: sello mecánico en P-201B». */
  texto: string
  /** Una respuesta: se escribe al vencer el aviso o al hacer otra cosa (lo que venga
   *  primero), y entonces el aviso dice `escrito`. «Deshacer» la suelta antes, sin
   *  escribir nada: nada que borrar. */
  pendiente?: Pendiente
  /** Lo que dice el aviso cuando ya se escribió: «Registrado: sello mecánico en P-201B». */
  escrito?: string
  /** Una confirmación ya escrita: «Deshacer» manda la escritura nueva (los pasos
   *  vuelven a lo que propone TRIM con procedencia `retirado`, D1). */
  deshacer?: () => Promise<Resultado>
  /** Solo de esta vista («Todavía no sé» en el libro, la parte antes de lo que vio): no se
   *  escribe nada y «Deshacer» la vuelve a mostrar (y llama `alDeshacer`, si hay). */
  local?: true
  alDeshacer?: () => void
}
/** ¿El aviso lleva «Deshacer»? Una confirmación sin consecutivos que deshacer, no. */
export const seDeshace = (h: Hecho) => !!(h.pendiente || h.deshacer || h.local)

/** El aviso a la vista: lo hecho (con «Deshacer» mientras dura) o lo que ya quedó. */
export interface Aviso { h: Hecho; fase: 'espera' | 'listo' }

/** Cuánto se queda a la vista lo que ya quedó escrito («Registrado…», «Deshecho…»). */
const LISTO_MS = 4_000
/** Dónde se guarda lo que todavía no se escribió (P-08). */
const CLAVE = 'trim.hoy.pendiente'
const guardar = (p: Pendiente | null) => {
  try { if (p) localStorage.setItem(CLAVE, JSON.stringify(p)); else localStorage.removeItem(CLAVE) } catch { /* modo privado: se escribe igual al vencer */ }
}
const leer = (): Pendiente | null => {
  try { const t = localStorage.getItem(CLAVE); return t ? JSON.parse(t) as Pendiente : null } catch { return null }
}

/** El aviso de abajo, con «Deshacer» durante 5 s, y lo que la vista no muestra
 *  mientras tanto (X4 §5.5). Una respuesta que se sostiene se escribe al vencer el
 *  aviso, al registrar otra o al salir de la página (con `keepalive`, P-08: el
 *  navegador la manda aunque la página se cierre); mientras tanto vive guardada en
 *  el navegador, y si no alcanzó a salir se escribe al volver a Hoy. El reloj se
 *  detiene mientras el aviso tiene el foco o el puntero encima (A3; WCAG 2.2.1).
 *  `escribir` es la escritura del contrato (`acciones.ts`, `useEscribir`). */
export function useEnvio(escribir: (p: Pendiente, o?: { keepalive?: boolean }) => Promise<Resultado>, rolId: string) {
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const [ocultas, setOcultas] = useState<ReadonlySet<string>>(() => new Set())
  const [error, setError] = useState('')
  const pendiente = useRef<Hecho | null>(null)
  const reloj = useRef<{ t?: number; resta: number; desde: number; fin?: () => void }>({ resta: 0, desde: 0 })
  const escribirRef = useRef(escribir)
  useEffect(() => { escribirRef.current = escribir }, [escribir])

  const mostrar = useCallback((id: string) => setOcultas(o => { const n = new Set(o); n.delete(id); return n }), [])
  const parar = () => { window.clearTimeout(reloj.current.t); reloj.current.t = undefined }
  const arrancar = useCallback((ms: number, fin: () => void) => {
    window.clearTimeout(reloj.current.t)
    reloj.current = { resta: ms, desde: Date.now(), fin, t: window.setTimeout(fin, ms) }
  }, [])

  /** Escribe lo que se sostenía. Devuelve si quedó escrito. */
  const enviarPendiente = useCallback(async (o?: { keepalive?: boolean }) => {
    const h = pendiente.current
    pendiente.current = null
    if (!h?.pendiente) return false
    const r = await escribirRef.current(h.pendiente, o)
    if (!r.ok) {
      // El error se queda a la vista hasta que se cierra (P-08); lo pendiente vuelve a la lista.
      setError(r.error); mostrar(h.id)
      return false
    }
    guardar(null)
    return true
  }, [mostrar])

  /** Lo que vence: la respuesta se escribe y el aviso dice que quedó (o el error). */
  const vencer = useCallback(async (h: Hecho) => {
    if (h.pendiente && pendiente.current === h) {
      const ok = await enviarPendiente()
      if (!ok) return setAviso(a => (a?.h === h ? null : a))
      setAviso(a => (a?.h === h ? { h: { ...h, texto: h.escrito ?? h.texto }, fase: 'listo' } : a))
      arrancar(LISTO_MS, () => setAviso(a => (a?.h === h ? null : a)))
      return
    }
    setAviso(a => (a?.h === h ? null : a))
  }, [enviarPendiente, arrancar])

  const registrar = useCallback((h: Hecho) => {
    // Lo anterior que se sostenía se escribe ya: solo hay un «Deshacer» a la vez.
    void enviarPendiente()
    setError('')
    setOcultas(o => new Set(o).add(h.id))
    pendiente.current = h.pendiente ? h : null
    guardar(h.pendiente ?? null)
    setAviso({ h, fase: 'espera' })
    arrancar(DESHACER_MS, () => { void vencer(h) })
  }, [enviarPendiente, arrancar, vencer])

  const deshacer = useCallback(async () => {
    const a = aviso
    if (!a || a.fase !== 'espera') return
    const h = a.h
    parar()
    if (h.deshacer) {
      const r = await h.deshacer()
      if (!r.ok) { setAviso(null); return setError(r.error) }
    } else if (pendiente.current === h) { pendiente.current = null; guardar(null) }
    h.alDeshacer?.()
    mostrar(h.id)
    // «Deshecho»: también se anuncia (prompt §9), y se va solo.
    const listo: Hecho = { id: h.id, texto: 'Deshecho.' }
    setAviso({ h: listo, fase: 'listo' })
    arrancar(LISTO_MS, () => setAviso(x => (x?.h === listo ? null : x)))
  }, [aviso, mostrar, arrancar])

  /** El reloj se detiene con el foco o el puntero encima del aviso, y sigue al salir (A3). */
  const pausar = useCallback(() => {
    const r = reloj.current
    if (r.t === undefined) return
    parar(); r.resta = Math.max(0, r.resta - (Date.now() - r.desde))
  }, [])
  const seguir = useCallback(() => {
    const r = reloj.current
    if (r.t !== undefined || !r.fin) return
    r.desde = Date.now(); r.t = window.setTimeout(r.fin, Math.max(r.resta, 1_000))
  }, [])

  // Lo que quedó sin escribir la vez pasada (se cerró la página) se escribe al volver (P-08).
  useEffect(() => {
    const p = leer()
    if (!p || p.rolId !== rolId) return
    void escribirRef.current(p).then(r => {
      if (!r.ok) return setError(`${r.error} (lo que contestó antes de salir)`)
      guardar(null)
      const h: Hecho = { id: `vuelta:${p.dicho}`, texto: `Registrado al volver: ${p.dicho}` }
      setAviso({ h, fase: 'listo' })
      arrancar(LISTO_MS, () => setAviso(x => (x?.h === h ? null : x)))
    })
  }, [rolId, arrancar])

  // Al salir de la página (o de la pantalla), lo que se sostenía se escribe, con `keepalive`.
  useEffect(() => {
    const f = () => { void enviarPendiente({ keepalive: true }) }
    addEventListener('pagehide', f)
    return () => { removeEventListener('pagehide', f); window.clearTimeout(reloj.current.t); f() }
  }, [enviarPendiente])

  return { aviso, ocultas, registrar, deshacer, error, limpiarError: () => setError(''), pausar, seguir }
}
export type Envio = ReturnType<typeof useEnvio>
