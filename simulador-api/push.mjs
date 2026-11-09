/** Notificación push del simulador (Fase 4 de facilidades, D2: el aviso de apagón llega aunque nadie
 *  tenga TRIM abierto, en el celular o en el escritorio).
 *
 *  Web Push estándar (RFC 8030) con identificación VAPID (RFC 8292), sin dependencias: el push va SIN
 *  contenido (no hace falta cifrar nada) y el service worker del navegador (`public/sw.js`) pregunta al
 *  servidor qué decir (`GET /api/push/aviso`). Así cada dispositivo recibe el aviso de su rol.
 *
 *  - `GET /api/push/llave` → `{ llave }`: la llave pública VAPID (base64url), para suscribirse.
 *  - `POST /api/push/suscripciones` `{ rol, campos, suscripcion }`: guarda el dispositivo.
 *  - `POST /api/push/suscripciones/baja` `{ endpoint }`: lo quita.
 *  - `POST /api/push/enviar` `{ campoId, eventoId, avisos: { [rol]: { titulo, cuerpo } } }` → `{ enviados,
 *    fallidos, sinDispositivo }`, con `conector:configurar` (api.mjs). En producción lo llama el propio
 *    servidor al detectar el apagón (no es una ruta pública); en el demo, el aviso de prueba del administrador.
 *  Solo se manda a los servicios de push conocidos (`esServicioDePush`) y sin seguir redirecciones. Con
 *  sesión, el rol y los campos de una suscripción salen del token; el simulador no tiene sesión.
 *  - `GET /api/push/aviso?endpoint=` → `{ titulo, cuerpo, url, evento }`: lo último que le toca a ese dispositivo.
 *
 *  Las suscripciones viven en memoria: al reiniciar el simulador, el navegador las vuelve a mandar al abrir
 *  TRIM (push.ts). La llave privada se genera una vez y se guarda en `datos/vapid.json` (fuera de git). */
import { createSign, generateKeyPairSync, createPrivateKey } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const RUTA = process.env.TRIM_VAPID ?? join(dirname(fileURLToPath(import.meta.url)), 'datos', 'vapid.json')
const b64u = b => Buffer.from(b).toString('base64url')

/** La llave VAPID: `{ publica (base64url, punto sin comprimir de 65 bytes), privada (JWK) }`. */
let llave
function llaves() {
  if (llave) return llave
  if (existsSync(RUTA)) llave = JSON.parse(readFileSync(RUTA, 'utf8'))
  else {
    const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
    const jwk = publicKey.export({ format: 'jwk' })
    llave = { publica: b64u(Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, 'base64url'), Buffer.from(jwk.y, 'base64url')])), privada: privateKey.export({ format: 'jwk' }) }
    try { writeFileSync(RUTA, JSON.stringify(llave)) } catch { /* sin disco: vale para esta sesión */ }
  }
  return llave
}
export const llavePublica = () => llaves().publica

/** El JWT de VAPID para el servicio de push de esa suscripción (ES256, firma de 64 bytes). */
export function cabeceraVapid(endpoint, ahora = Date.now()) {
  const aud = new URL(endpoint).origin
  const h = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))
  const c = b64u(JSON.stringify({ aud, exp: Math.floor(ahora / 1000) + 12 * 3600, sub: 'https://gotrim.ai' }))
  const firma = createSign('SHA256').update(`${h}.${c}`).sign({ key: createPrivateKey({ key: llaves().privada, format: 'jwk' }), dsaEncoding: 'ieee-p1363' })
  return `vapid t=${h}.${c}.${b64u(firma)}, k=${llavePublica()}`
}

/** Los servicios de push de los navegadores: solo a ellos se les manda (nunca a una dirección cualquiera
 *  que llegue en una suscripción: sería usar el servidor para pedir a la red interna). Google (Chrome,
 *  Edge en Android), Mozilla (Firefox), Microsoft (Edge en Windows) y Apple (Safari). */
const SERVICIOS_PUSH = [/^fcm\.googleapis\.com$/, /^android\.googleapis\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /\.notify\.windows\.com$/, /(^|\.)push\.apple\.com$/]
export function esServicioDePush(endpoint) {
  let u
  try { u = new URL(endpoint) } catch { return false }
  return u.protocol === 'https:' && !u.port && SERVICIOS_PUSH.some(re => re.test(u.hostname))
}

/** endpoint → { rol, campos, suscripcion } */
const suscripciones = new Map()
/** endpoint → el último aviso que le toca. */
const pendientes = new Map()

export function suscribir(b) {
  const s = b?.suscripcion
  if (typeof s?.endpoint !== 'string' || !esServicioDePush(s.endpoint)) return { estado: 422, cuerpo: { error: { codigo: 'suscripcion-invalida', mensaje: 'La suscripción no es de un servicio de push conocido (Google, Mozilla, Microsoft o Apple)' } } }
  if (typeof b.rol !== 'string' || !Array.isArray(b.campos)) return { estado: 422, cuerpo: { error: { codigo: 'rol-o-campos', mensaje: 'Faltan el rol o los campos' } } }
  suscripciones.set(s.endpoint, { rol: b.rol, campos: b.campos.filter(c => typeof c === 'string'), suscripcion: s })
  return { estado: 200, cuerpo: { ok: true, dispositivos: suscripciones.size } }
}
export function desuscribir(b) {
  suscripciones.delete(b?.endpoint)
  return { estado: 200, cuerpo: { ok: true } }
}

/** Manda el push (sin contenido) a cada dispositivo de un rol avisado con ese campo. */
export async function enviar(b, enviarHttp = fetch) {
  const avisos = b?.avisos && typeof b.avisos === 'object' ? b.avisos : {}
  if (typeof b?.campoId !== 'string') return { estado: 422, cuerpo: { error: { codigo: 'campo', mensaje: 'Falta el campo' } } }
  let enviados = 0, fallidos = 0
  const destinos = [...suscripciones.values()].filter(s => s.campos.includes(b.campoId) && Object.hasOwn(avisos, s.rol) && esServicioDePush(s.suscripcion.endpoint))
  for (const s of destinos) {
    const a = avisos[s.rol]
    pendientes.set(s.suscripcion.endpoint, { titulo: String(a.titulo ?? 'TRIM'), cuerpo: String(a.cuerpo ?? ''), url: `/#/${s.rol}`, evento: String(b.eventoId ?? '') })
    try {
      // Sin seguir redirecciones: el pedido va al servicio de push y a ningún otro lado.
      const r = await enviarHttp(s.suscripcion.endpoint, { method: 'POST', redirect: 'manual', headers: { TTL: '600', Urgency: 'high', Authorization: cabeceraVapid(s.suscripcion.endpoint), 'Content-Length': '0' } })
      if (r.status >= 200 && r.status < 300) enviados++
      else { fallidos++; if (r.status === 404 || r.status === 410) suscripciones.delete(s.suscripcion.endpoint) }
    } catch { fallidos++ }
  }
  return { estado: 200, cuerpo: { enviados, fallidos, sinDispositivo: destinos.length === 0 } }
}

export function aviso(endpoint) {
  const a = pendientes.get(endpoint)
  return a ? { estado: 200, cuerpo: a } : { estado: 404, cuerpo: { error: { codigo: 'sin-aviso', mensaje: 'No hay aviso para este dispositivo' } } }
}
