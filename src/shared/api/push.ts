import { useCallback, useEffect, useState } from 'react'
import { API_URL, pedirJson, ErrorApi, mensajeDe } from './fuente'

/** LA NOTIFICACIÓN PUSH DEL AVISO DE APAGÓN (Fase 4 de facilidades, D2: «una notificación push, en el
 *  celular o en el escritorio»).
 *
 *  Cada persona la activa en su dispositivo (Perfil): el navegador pide permiso, se registra el service
 *  worker (`public/sw.js`) y la suscripción viaja al servidor con el rol y los campos. Cuando hay un
 *  apagón, el servidor manda un push sin contenido y el service worker pregunta qué decir: cada rol
 *  recibe lo suyo.
 *
 *  - `GET /api/push/llave` · `POST /api/push/suscripciones` y `…/baja` · `POST /api/push/enviar` ·
 *    `GET /api/push/aviso` (CONTRATO.md; en el demo, simulador-api/push.mjs).
 *
 *  Lo que hay que saber: en un iPhone solo llega si TRIM está agregado a la pantalla de inicio (iOS 16.4
 *  o más nuevo); en Android y en el escritorio basta con aceptar el permiso. Sin servidor (el demo
 *  construido) no hay quién mande el push, y se dice. */

export type EstadoPush = 'cargando' | 'no-soportado' | 'sin-servidor' | 'bloqueado' | 'apagado' | 'activo'

export const soportaPush = (): boolean =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

const swUrl = () => `/sw.js?api=${encodeURIComponent(API_URL)}`

/** La llave pública VAPID (base64url) como la pide `pushManager.subscribe`. */
function bytes(b64u: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64u.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(b64u.length / 4) * 4, '='))
  const out = new Uint8Array(new ArrayBuffer(s.length))
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}

async function suscripcionActual(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.getRegistration(swUrl())
  return reg ? reg.pushManager.getSubscription() : null
}

/** Activa el aviso en este dispositivo para ese rol y esos campos. */
export async function activarPush(rol: string, campos: string[]): Promise<{ ok: true } | { ok: false; error: string; estado: EstadoPush }> {
  if (!soportaPush()) return { ok: false, estado: 'no-soportado', error: 'Este navegador no recibe notificaciones. En un iPhone, agregue TRIM a la pantalla de inicio y ábralo desde ahí.' }
  let llave: string
  try { llave = (await pedirJson<{ llave: string }>('/push/llave')).llave }
  catch (e) { return { ok: false, estado: 'sin-servidor', error: e instanceof ErrorApi && e.codigo === 'sin-servicio' ? 'En este demo no hay servidor que mande las notificaciones.' : `No se pudo hablar con el servidor (${mensajeDe(e)}).` } }
  const permiso = await Notification.requestPermission()
  if (permiso !== 'granted') return { ok: false, estado: 'bloqueado', error: 'El navegador no dio permiso para las notificaciones. Se cambia en la configuración del sitio.' }
  try {
    const reg = await navigator.serviceWorker.register(swUrl())
    await navigator.serviceWorker.ready
    const sub = (await reg.pushManager.getSubscription()) ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes(llave) })
    await pedirJson('/push/suscripciones', undefined, { metodo: 'POST', cuerpo: { rol, campos, suscripcion: sub.toJSON() } })
    return { ok: true }
  } catch (e) { return { ok: false, estado: 'apagado', error: `No se pudo activar (${mensajeDe(e)}).` } }
}

/** Lo quita de este dispositivo. */
export async function desactivarPush(): Promise<void> {
  const sub = soportaPush() ? await suscripcionActual() : null
  if (!sub) return
  await pedirJson('/push/suscripciones/baja', undefined, { metodo: 'POST', cuerpo: { endpoint: sub.endpoint } }).catch(() => undefined)
  await sub.unsubscribe()
}

/** El estado en este dispositivo. Si ya estaba activo, vuelve a mandar la suscripción con el rol de
 *  ahora (el servidor del demo la guarda en memoria y el rol del demo se cambia en el menú). */
export function usePush(rol: string, campos: string[]): { estado: EstadoPush; error: string; activar: () => Promise<void>; desactivar: () => Promise<void> } {
  const [estado, setEstado] = useState<EstadoPush>('cargando')
  const [error, setError] = useState('')
  const clave = campos.join(',')
  useEffect(() => {
    let vivo = true
    void (async () => {
      if (!soportaPush()) { if (vivo) setEstado('no-soportado'); return }
      if (Notification.permission === 'denied') { if (vivo) setEstado('bloqueado'); return }
      const sub = await suscripcionActual().catch(() => null)
      if (!sub) { if (vivo) setEstado('apagado'); return }
      try {
        await pedirJson('/push/suscripciones', undefined, { metodo: 'POST', cuerpo: { rol, campos: clave.split(','), suscripcion: sub.toJSON() } })
        if (vivo) setEstado('activo')
      } catch { if (vivo) setEstado('sin-servidor') }
    })()
    return () => { vivo = false }
  }, [rol, clave])
  const activar = useCallback(async () => {
    setError('')
    const r = await activarPush(rol, clave.split(','))
    if (r.ok) setEstado('activo'); else { setEstado(r.estado); setError(r.error) }
  }, [rol, clave])
  const desactivar = useCallback(async () => { await desactivarPush(); setEstado('apagado') }, [])
  return { estado, error, activar, desactivar }
}

/** `POST /api/push/enviar`: en el demo lo llama el aviso de prueba; en producción, el servidor solo. */
export async function enviarAvisoPush(campoId: string, eventoId: string, avisos: Record<string, { titulo: string; cuerpo: string }>, capacidades: string[]): Promise<{ texto: string }> {
  try {
    const r = await pedirJson<{ enviados: number; fallidos: number; sinDispositivo: boolean }>('/push/enviar', undefined,
      { metodo: 'POST', cuerpo: { campoId, eventoId, avisos }, cabeceras: { 'x-capacidades': capacidades.join(',') } })
    if (r.sinDispositivo) return { texto: 'Nadie ha activado la notificación en este campo: el aviso se ve solo en la pantalla.' }
    return { texto: `Notificación enviada a ${r.enviados} ${r.enviados === 1 ? 'dispositivo' : 'dispositivos'}${r.fallidos ? `; ${r.fallidos} no la recibieron` : ''}.` }
  } catch (e) {
    return { texto: e instanceof ErrorApi && e.codigo === 'sin-servicio' ? 'En este demo no hay servidor de notificaciones: el aviso se ve solo en la pantalla.' : `La notificación no salió (${mensajeDe(e)}); el aviso se ve en la pantalla.` }
  }
}
