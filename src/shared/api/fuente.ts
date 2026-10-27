import { hayInsumos, instalarInsumos } from '@/entities/insumos'

/** De dónde salen los datos de esta instalación. Lo decide el build con
 *  `VITE_FUENTE` (ver .env.example):
 *  - sin definir (o `demo`): el demo. Los insumos de demostración
 *    (`entities/datos`) se cargan aquí con import dinámico, y la costura los
 *    calcula en el navegador con la misma fórmula que el backend.
 *  - `http`: un build de producto. Cada consulta de la costura es un GET al
 *    servidor (consulta.ts) y cada escritura un POST/PATCH (escrituras.ts),
 *    con las formas de contrato.ts. La rama del demo queda muerta y Vite ni
 *    siquiera genera el paquete de datos: la historia de demostración no
 *    llega a ningún navegador.
 *
 *  Por qué no un import normal de los datos: el motor y las pantallas se
 *  cargan con todo lo que importan, y los datos iban dentro aunque el backend
 *  ya respondiera (el build los precargaba en index.html). */
export const FUENTE: 'demo' | 'http' = import.meta.env.VITE_FUENTE === 'http' ? 'http' : 'demo'

/** Dónde está la API: `VITE_API_URL` tal cual, o `/api` sin definir. Una raíz
 *  relativa es el mismo dominio del front, en desarrollo y en el build. Una
 *  absoluta, en desarrollo, se pide como `/api` del mismo origen: Vite la
 *  manda allá con su proxy (vite.config.ts) y el navegador no choca con CORS. */
const RAIZ_API = import.meta.env.VITE_API_URL?.trim() || '/api'
export const API_URL: string = (import.meta.env.DEV && /^https?:\/\//i.test(RAIZ_API) ? '/api' : RAIZ_API).replace(/\/$/, '')

/** Un rechazo del servidor o la falta de servicio, con el formato único de
 *  error del contrato: `{ "error": { "codigo": "…", "mensaje": "…" } }`.
 *  `estado` es el HTTP (0 si no hubo respuesta); `codigo` es lo que se
 *  compara (`tag-no-registrado`, `version-cambio`…); `mensaje`, lo que se lee. */
export class ErrorApi extends Error {
  readonly estado: number
  readonly codigo: string
  /** El objeto `error` entero, por si trae más que el mensaje (los errores
   *  por caja de un 422 de accesos, la caja de un aviso). */
  readonly detalle: unknown
  constructor(estado: number, codigo: string, mensaje: string, detalle?: unknown) {
    super(mensaje); this.name = 'ErrorApi'; this.estado = estado; this.codigo = codigo; this.detalle = detalle
  }
}

/** Lo que se le dice a la persona cuando detrás de la ruta no hay servicio
 *  (un hosting estático que devuelve la página para cualquier dirección). */
export const SIN_SERVICIO = 'no hay un servicio conectado en esta instalación que responda esa ruta'

export interface OpcionesPedido {
  signal?: AbortSignal
  metodo?: 'GET' | 'POST' | 'PATCH' | 'PUT'
  /** Se manda como JSON. */
  cuerpo?: unknown
  cabeceras?: Record<string, string>
  /** F1 · P-08: el navegador manda el pedido aunque la página se cierre (una
   *  respuesta de Hoy que se escribe al salir). */
  keepalive?: boolean
}

/** El único camino por el que el front le pide algo al servidor. `ruta` va
 *  sin el prefijo de la API (`/vistas/diferidos?…`); `params` se suman a la
 *  consulta. Devuelve el cuerpo JSON tal como llegó: revivirlo al dominio es
 *  trabajo de contrato.ts. */
export async function pedirJson<T = unknown>(ruta: string, params?: Record<string, string>, o: OpcionesPedido = {}): Promise<T> {
  // Texto y no `new URL`: la raíz puede ser relativa (`/api`) y el navegador la
  // resuelve contra la página; así no depende de `location`.
  const extra = new URLSearchParams(params ?? {}).toString()
  const url = `${API_URL}${ruta}${extra ? `${ruta.includes('?') ? '&' : '?'}${extra}` : ''}`
  let res: Response
  try {
    res = await fetch(url, {
      method: o.metodo ?? 'GET', signal: o.signal, ...(o.keepalive ? { keepalive: true } : {}),
      headers: { accept: 'application/json', ...(o.cuerpo !== undefined ? { 'content-type': 'application/json' } : {}), ...o.cabeceras },
      ...(o.cuerpo !== undefined ? { body: JSON.stringify(o.cuerpo) } : {}),
    })
  } catch (e) {
    // Cancelado a propósito (cambió el campo o el tag): no es un error que mostrar, sigue su camino.
    if (cancelado(e)) throw e
    throw new ErrorApi(0, 'sin-conexion', `no se pudo hablar con el servidor (${mensajeDe(e)})`)
  }
  const esJson = res.headers.get('content-type')?.includes('application/json') ?? false
  // Si la respuesta no es JSON, detrás de esta ruta no hay servicio. Sin esta
  // guarda, res.json() revienta con un error de sintaxis de JavaScript y la
  // persona ve un mensaje que no significa nada para ella.
  if (!esJson) throw new ErrorApi(res.status, 'sin-servicio', SIN_SERVICIO)
  let cuerpo: unknown
  try { cuerpo = await res.json() }
  catch { throw new ErrorApi(res.status, 'ilegible', `el servidor respondió algo que no se puede leer (${res.status})`) }
  if (!res.ok) {
    const e = (cuerpo as { error?: { codigo?: unknown; mensaje?: unknown } } | null)?.error
    throw new ErrorApi(res.status, typeof e?.codigo === 'string' ? e.codigo : `http-${res.status}`,
      typeof e?.mensaje === 'string' ? e.mensaje : `el servidor respondió ${res.status} sin el error del contrato`, e)
  }
  return cuerpo as T
}

/** ¿Se canceló a propósito (cambió el campo o el tag)? No es un error que mostrar. */
export const cancelado = (e: unknown) => e instanceof DOMException && e.name === 'AbortError'

/** El texto de un error para la persona. */
export const mensajeDe = (e: unknown) => (e instanceof Error ? e.message : String(e))

/** La locación de los pozos de un campo (el caso de borde del choke, U2 §8.6):
 *  `(campoId) => (pozo) => locación`. Un dato de demostración que no está en
 *  `Pozo` (`datos/topologia.ts`): entra por aquí, como los demás datos del demo,
 *  y el motor la recibe por parámetro (`marcarCasosBorde`, `leerTopologia`). Con
 *  la fuente http no hace falta: el servidor manda la topología ya marcada. */
type Locaciones = (campoId: string) => (pozo: string) => string | undefined
let locaciones: Locaciones | undefined
/** La instalan `prepararFuente` en el demo y los scripts que arman el motor a mano. */
export function instalarLocaciones(l: Locaciones): void { locaciones = l }
/** La locación de cada pozo del campo; sin locaciones instaladas, ninguna (el caso de borde no se marca). */
export const locacionDe = (campoId: string) => (pozo: string): string | undefined => locaciones?.(campoId)(pozo)

/** Deja lista la fuente antes de pintar. main.tsx la espera y solo entonces
 *  carga la aplicación. */
export async function prepararFuente(): Promise<void> {
  if (FUENTE === 'http') {
    // El catálogo y la sesión (configuración firmada, respuestas, accesos)
    // se traen del servidor antes de pintar: las pantallas los leen sin esperar.
    const { arrancarDelServidor } = await import('./servidor')
    await arrancarDelServidor()
    return
  }
  if (!locaciones) instalarLocaciones((await import('@/entities/datos/topologia')).locacionDemo)
  if (hayInsumos()) return
  const { INSUMOS_DEMO } = await import('@/entities/datos')
  instalarInsumos(INSUMOS_DEMO)
}
