/** Las causas que se le sugieren a una parada sin identificar: la pregunta
 *  «¿qué se dañó?» de la pantalla (Hoy, «Contestar») y las opciones de
 *  `GET /api/vistas/paradas/:evento/opciones` (`Opcion`, contrato v1).
 *
 *  Vivía en `entities/mensajes.ts`, junto al canal de mensajes al teléfono, que
 *  quedó RETIRADO (27-oct-2026, docs/backend/CAMBIOS-CONTRATO.md §3): lo que sigue
 *  sirviendo en pantalla se mudó aquí, sin cambiar nada de lo que calcula. */
import { historialDeEquipo, type Pregunta } from './libro'
import type { Contexto } from './causa-senal'
import { perfilBomba } from './bombas'
import { saludDePartes } from './salud'
import { saludDeEsp } from './esp'
import { catalogoDe } from './catalogo'
import { pozoDe } from './pozos'
import { NOMBRE_PARTE, type ParteId } from './partes'

/** Las causas frecuentes cuando la señal no explica por qué se cerró un pozo:
 *  ayudas para responder, sin orden de probabilidad (no hay señal que lo dé).
 *  Es también el catálogo de causas de pozo del árbol de la ANH. */
export const CAUSAS_POZO = [
  'Cierre para prueba o intervención del pozo',
  'Fuga o daño en la línea de flujo',
  'Orden de producción: nominación o restricción del comprador',
  'Falla del controlador o de un instrumento del pozo',
] as const

export interface Opcion {
  /** «1», «2»…; «0» es otra cosa (contrato v1: la pantalla no la usa). */
  clave: string
  texto: string
  parte?: ParteId
  /** Por qué se sugiere (vacío si es el catálogo sin orden). */
  porque?: string
  /** De dónde sale la sugerencia: una lectura fuera de límite o la historia del equipo. */
  fuente?: 'senal' | 'historia'
  /** Con `fuente: 'historia'`: cuántas de las fallas anteriores del equipo fueron
   *  de esa parte (`veces`) y cuántas hubo en total. La pantalla escribe de aquí;
   *  `porque` es la misma cifra dicha en una frase. */
  veces?: number
  total?: number
}

/** La opción abierta: la persona escribe lo que encontró. */
export const OTRA: Opcion = { clave: '0', texto: 'Otra cosa: escríbala' }

const numeradas = (xs: Array<Omit<Opcion, 'clave'>>): Opcion[] => [...xs.map((x, i) => ({ ...x, clave: String(i + 1) })), OTRA]

/** La opción de un pozo con electrosumergible cuando no fue ella. La pantalla
 *  muestra la parte corta (lo que sigue lo dice el paso siguiente). */
export const NO_FUE_ESP_CORTO = 'No fue la electrosumergible'
export const NO_FUE_ESP = `${NO_FUE_ESP_CORTO}: otra causa del pozo`

/** Cuando se sugieren solo algunas partes: la puerta a todas las del catálogo. */
export const OTRA_PARTE = 'Otra parte del equipo'

/** Las causas que se le sugieren a una parada sin identificar, con su porqué.
 *  Bomba de la línea o pozo con electrosumergible: sus partes (del catálogo de
 *  su clase). De la historia, solo lo que se sabía al parar: las fallas de ese
 *  equipo antes de esta parada, con la parte que ya se conocía entonces. Con
 *  `lecturas` (la pantalla, con la parada abierta) van primero las partes que
 *  hoy están fuera de límite o avisando. Sin historia: todas sus partes, sin
 *  orden. Un pozo sin electrosumergible: el catálogo de causas de pozo. */
export function causasSugeridas(p: Pregunta, ctx: Contexto, lecturas = false): { opciones: Opcion[]; conEvidencia: boolean } {
  const cat = catalogoDe(p.campoId, p.equipo)
  if (!cat) return { conEvidencia: false, opciones: numeradas(CAUSAS_POZO.map(texto => ({ texto }))) }
  const esp = cat.clase === 'bomba-electrosumergible'
  // En un pozo con electrosumergible puede no haber sido ella: esa salida va siempre.
  const otraDelPozo: Array<Omit<Opcion, 'clave'>> = esp ? [{ texto: NO_FUE_ESP }] : []
  const candidatas: Array<Omit<Opcion, 'clave' | 'texto'> & { parte: ParteId }> = []
  const agregar = (c: (typeof candidatas)[number]) => { if (!candidatas.some(x => x.parte === c.parte)) candidatas.push(c) }
  if (lecturas && !p.fin) {
    const bomba = perfilBomba(p.equipo, p.campoId), pozo = pozoDe(p.campoId, p.equipo)
    const salud = bomba ? saludDePartes(bomba) : pozo ? saludDeEsp(pozo, ctx) : []
    // La banda normal y la alarma son dos límites: se dice cuál pasó.
    for (const s of salud) if (s.estado === 'fuera') {
      const v = s.fuera[0]?.senal
      agregar({ parte: s.parte.id, fuente: 'senal', porque: `${v?.tag ?? 'una variable'} ${v && (v.estado === 'alarma' || v.pronostico.tipo === 'cruzado') ? 'llegó a su alarma' : 'salió de su banda normal'}` })
    }
    for (const s of salud) if (s.estado === 'avisa') agregar({ parte: s.parte.id, fuente: 'senal', porque: `${s.primera?.senal.tag ?? 'una variable'} venía avisando` })
  }
  // Una parte declarada después de esta parada no se sabía cuando paró.
  const sabida = (id: string) => { const r = ctx.respuestas[id]; return !r || new Date(r.hora) < p.inicio }
  const antes = historialDeEquipo(p.campoId, p.equipo, ctx).eventos.filter(e => !e.disparo && e.id !== p.id && e.inicio < p.inicio)
  const porParte = new Map<ParteId, number>()
  for (const e of antes) if (e.parte && sabida(e.id)) porParte.set(e.parte, (porParte.get(e.parte) ?? 0) + 1)
  for (const [parte, n] of [...porParte].sort((a, b) => b[1] - a[1]))
    agregar({ parte, fuente: 'historia', veces: n, total: antes.length, porque: `${n} de las ${antes.length} fallas anteriores de este equipo` })
  const nombre = (id: ParteId) => cat.partes.find(x => x.id === id)?.nombre ?? NOMBRE_PARTE[id]
  if (candidatas.length) return { conEvidencia: true, opciones: numeradas([...candidatas.slice(0, 3).map(c => ({ ...c, texto: nombre(c.parte) })), { texto: OTRA_PARTE }, ...otraDelPozo]) }
  return { conEvidencia: false, opciones: numeradas([...cat.partes.map(x => ({ texto: x.nombre, parte: x.id })), ...otraDelPozo]) }
}
