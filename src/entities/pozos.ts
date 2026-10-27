/** Los pozos de cada campo, con lo que dice de ellos cada equipo.
 *
 *  Premisa del producto: todo lo que se muestra sale de un equipo, con cadena
 *  de custodia. De cada pozo se lee:
 *  - su CONTROLADOR (variador de la electrosumergible, controlador de bombeo
 *    mecánico o válvula de cabeza): cuándo produce, cuándo paró y con qué código;
 *  - su PRUEBA, del separador de prueba automatizado o, si no lo hay, estimada
 *    desde la propia electrosumergible. Un pozo sin ninguna de las dos es un
 *    hueco de custodia: no se le inventa caudal.
 *
 *  Contrato: `GET /api/campos/:campo/pozos`, `…/pozos/eventos`, `…/servicios/eventos`
 *  y `…/produccion-diaria` (CONTRATO.md).
 */
import type { ParteId } from './partes'
import { insumos, perezoso, type OrigenPmo } from './insumos'
import { AHORA as AHORA_POZOS } from './reloj'

export type Levantamiento = 'electrosumergible' | 'bombeo-mecanico' | 'flujo-natural'
export type OrigenPrueba = 'instrumento' | 'estimado'

export interface Prueba {
  fecha: string
  crudoBpd: number
  aguaBpd: number
  /** Frecuencia del variador durante la prueba (electrosumergible). */
  hz?: number
}

export interface Pozo {
  id: string
  campoId: string
  levantamiento: Levantamiento
  /** Tag del controlador que dice si el pozo produce. */
  controlador: string
  /** Pórtico o subestación de la que cuelga. */
  alimentador: string
  /** Sin origen no hay prueba: el pozo no tiene custodia. */
  origen?: OrigenPrueba
  fuentePrueba?: string
  pruebas: Prueba[]
}

/** Lo que reporta el controlador al parar o cambiar de estado. */
export type CodigoControlador = 'GF' | 'PH' | 'OL' | 'UL' | 'OT' | 'UV' | 'PSH' | 'LSHH' | 'CMD' | 'HZ'

export const CODIGO: Record<CodigoControlador, string> = {
  GF: 'falla a tierra',
  PH: 'desbalance de fases',
  OL: 'sobrecarga',
  UL: 'baja carga',
  OT: 'temperatura alta del motor',
  UV: 'baja tensión',
  PSH: 'presión alta en la cabeza del pozo',
  LSHH: 'nivel muy alto del tanque de agua',
  CMD: 'parada por orden',
  HZ: 'frecuencia reducida',
}

/** Respuesta de un operario a una parada que la señal no pudo explicar. Es
 *  el único dato que entra a mano, y queda marcado como declarado. */
export interface Respuesta {
  texto: string
  /** Quién respondió, para leer («Nombre · rol»). Lo pone el servidor desde el token. */
  por: string
  /** El id de esa persona: con él se compara (¿respondió quien mira el chat?).
   *  Comparar por el texto de `por` fallaba si el servidor lo redacta distinto. */
  porId?: string
  hora: string
  /** En una bomba o una electrosumergible: la parte que se dañó. */
  parte?: ParteId
  /** Lo que vio: modo de falla de ISO 14224 (Table B.6), del catálogo de la parte. */
  modo?: string
  /** Por dónde llegó. En v1 tenía otro valor, el del canal de mensajes al teléfono:
   *  RETIRADO el 27-oct-2026 (R4, docs/backend/CAMBIOS-CONTRATO.md §3). Toda respuesta
   *  es de pantalla; el servidor puede mandarlo u omitirlo y el front no lo lee. */
  canal?: 'pantalla'
  /** A3 · «Contestar» en 1 toque: la parte se guarda sola y lo que vio llega después,
   *  como pregunta siguiente y opcional (`POST /api/paradas/:evento/vio`). Quién lo dijo
   *  y cuándo (puede ser otra persona que la que dijo la parte), y lo que escribió si fue
   *  «Otra cosa» (se queda en TRIM, D2). Ausente: lo que vio llegó con la parte, o nadie
   *  lo ha dicho. */
  vio?: { por: string; porId: string; hora: string; texto?: string }
}

export interface EventoPozo {
  id: string
  campoId: string
  pozo: string
  inicio: string
  /** null: sigue apagado (o con la frecuencia reducida). */
  fin: string | null
  codigo: CodigoControlador
  senal: string
  /** Solo en `HZ`: la frecuencia a la que quedó. */
  hz?: number
  respuesta?: Respuesta
}

export type TipoServicio = 'aire' | 'energia' | 'compresion' | 'evacuacion' | 'proceso' | 'tratamiento'

/** Un servicio o equipo de proceso que, al caer, apaga o frena pozos. */
export interface EventoServicio {
  id: string
  campoId: string
  equipo: string
  tipo: TipoServicio
  inicio: string
  /** null: el servicio sigue caído. Su cascada llega hasta ahora. */
  fin: string | null
  tag: string
  texto: string
}

/** Producción fiscal del mes, día por día, del punto de medición oficial. */
export interface ProduccionMes {
  campoId: string
  mes: string
  publicado: boolean
  /** Barriles netos de cada día. El último día del mes en curso es parcial.
   *  Un día que el computador de flujo no reportó va como null (o falta al
   *  final del arreglo): es un hueco de custodia, nunca un cero. */
  dias: Array<number | null>
}

/* Los insumos se leen de `insumos.ts`, nunca de `datos/*`: ver allí por qué. */
/** Todos los pozos de todos los campos. */
export const todosLosPozos = (): readonly Pozo[] => insumos().pozos
/** Los eventos de los controladores de todos los campos. */
export const eventosPozos = (): readonly EventoPozo[] => insumos().eventosPozos
/** Los eventos de los servicios que apagan pozos, de todos los campos. */
export const eventosServicios = (): readonly EventoServicio[] => insumos().eventosServicios
/** La producción fiscal de cada campo y mes. */
export const produccionDiaria = (): readonly ProduccionMes[] => insumos().produccionDiaria
/** Cómo se mide la producción fiscal de un campo; undefined si el registro no lo trae. */
export const origenPmo = (campoId: string): OrigenPmo | undefined =>
  Object.hasOwn(insumos().origenPmo, campoId) ? insumos().origenPmo[campoId] : undefined

/** Agrupa una lista por clave, en su orden. Con `push` y no copiando el
 *  arreglo en cada elemento: copiar volvía cuadrática la carga de un campo. */
export function agrupar<T>(xs: readonly T[], clave: (x: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>()
  for (const x of xs) {
    const k = clave(x), g = m.get(k)
    if (g) g.push(x); else m.set(k, [x])
  }
  return m
}

/* Los pozos y los eventos indexados por campo y por pozo, una vez: el estado
   de cada pozo y la historia de cada equipo los piden en bucle, y recorrer
   todos los eventos por cada pozo volvía el estado del campo pozos × eventos. */
const POZOS_POR_CAMPO = perezoso(() => agrupar(insumos().pozos, p => p.campoId))
const POZO_POR_ID = perezoso(() => new Map(insumos().pozos.map(p => [`${p.campoId}|${p.id}`, p])))
const EVENTOS_POR_CAMPO = perezoso(() => agrupar(insumos().eventosPozos, e => e.campoId))
const EVENTOS_POR_POZO = perezoso(() => agrupar(insumos().eventosPozos, e => `${e.campoId}|${e.pozo}`))

const SERVICIOS_POR_CAMPO = perezoso(() => agrupar(insumos().eventosServicios, e => e.campoId))
/** Los eventos de servicios de un campo. */
export const serviciosDeCampo = (campoId: string): readonly EventoServicio[] => SERVICIOS_POR_CAMPO().get(campoId) ?? []
const SERVICIO_POR_ID = perezoso(() => new Map(insumos().eventosServicios.map(e => [e.id, e])))
/** Un evento de servicio por su id. */
export const servicioPorId = (id: string): EventoServicio | undefined => SERVICIO_POR_ID().get(id)

/** Los pozos de un campo. La lista es compartida: no se ordena ni se cambia en el sitio. */
export const pozosDe = (campoId: string): readonly Pozo[] => POZOS_POR_CAMPO().get(campoId) ?? []
export const pozoDe = (campoId: string, id: string): Pozo | undefined => POZO_POR_ID().get(`${campoId}|${id}`)
/** Los eventos de los controladores de un campo. */
export const eventosDeCampo = (campoId: string): readonly EventoPozo[] => EVENTOS_POR_CAMPO().get(campoId) ?? []
export const eventosDePozo = (campoId: string, id: string): readonly EventoPozo[] => EVENTOS_POR_POZO().get(`${campoId}|${id}`) ?? []

/** Estado del pozo ahora, del controlador: el evento que sigue abierto
 *  manda. Con frecuencia reducida sigue produciendo, pero menos. Si hay un
 *  paro abierto y una frecuencia reducida abierta a la vez, manda el paro:
 *  con el pozo cerrado no hay frecuencia que reducir. */
export function estadoAhora(p: Pozo, ahora: Date = AHORA_POZOS): { produce: boolean; evento?: EventoPozo; hz?: number } {
  const abiertos = eventosDePozo(p.campoId, p.id).filter(e => !e.fin && new Date(e.inicio) <= ahora)
  const abierto = abiertos.find(e => e.codigo !== 'HZ') ?? abiertos[0]
  if (!abierto) return { produce: true }
  if (abierto.codigo === 'HZ') return { produce: true, evento: abierto, hz: abierto.hz }
  return { produce: false, evento: abierto }
}

/** La prueba vigente en un momento: la última hecha antes. Antes de la
 *  primera prueba del historial vale la primera. */
export function pruebaEn(p: Pozo, t: number): Prueba | undefined {
  const fechas = fechasDePruebas(p)
  let u: Prueba | undefined
  for (let i = 0; i < fechas.length; i++) if (fechas[i]! <= t) u = p.pruebas[i]
  return u ?? p.pruebas[0]
}
/* Las fechas de las pruebas como número, una vez por pozo: el libro pide la
   prueba vigente por pozo y por día, y leer el texto de cada fecha en cada
   llamada era la mitad del costo de armar un mes. */
const FECHAS_PRUEBAS = new WeakMap<Pozo, number[]>()
function fechasDePruebas(p: Pozo): number[] {
  let f = FECHAS_PRUEBAS.get(p)
  if (!f) FECHAS_PRUEBAS.set(p, f = p.pruebas.map(x => new Date(x.fecha).getTime()))
  return f
}

export const LEVANTAMIENTO_NOMBRE: Record<Levantamiento, string> = {
  electrosumergible: 'Electrosumergible',
  'bombeo-mecanico': 'Bombeo mecánico',
  'flujo-natural': 'Flujo natural',
}

/** Nivel de los tanques de agua AHORA, del transmisor de nivel. Sirve para
 *  predecir cuántas horas aguantan si la bomba de reinyección se para.
 *  La Ceiba tiene la bomba parada y el tanque en el nivel muy alto: por eso
 *  sus pozos están cerrados. */
export const NIVEL_AHORA: Record<string, { tag: string; pct: number; hora: string }> = {
  'TK-AG-CE': { tag: 'LT-2012', pct: 89.6, hora: '2026-10-02T13:59:00-05:00' },
  'TK-AG-MN': { tag: 'LT-2012', pct: 61.8, hora: '2026-10-02T13:59:00-05:00' },
  'TK-AG-GU': { tag: 'LT-2012', pct: 42.3, hora: '2026-10-02T13:59:00-05:00' },
}
