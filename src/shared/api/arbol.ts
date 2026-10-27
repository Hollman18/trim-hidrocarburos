import { useCtx, useSesion } from './sesion'
import { useDato, versionDe } from './consulta'
import { PARADAS_ANH, CALIDAD_ANH, type ConsultaPeriodo } from './contrato'
import {
  paradasAnh, inicioDiaCo, gruposPorCadena, CONFIRMAN_EN_LOTE,
  type ParadaAnh, type ConfirmacionLote, type EstadoParadaAnh, type RetiroAnh,
} from '@/entities/anh-paradas'
import {
  esDePersona, PASOS_QUE_CONFIRMA, PASOS_QUE_DECLARA, PONEN_YACIMIENTO, ATAJO_YACIMIENTO, N1_EN_CAMPO, ROLES_QUE_CONTESTAN,
  CONFIRMAN_LO_QUE_APUNTA, PREGUNTAS_CAMPO, NOMBRE_FILA, nombreDeRegla, esperaAQuienAbre, esNoSe, quienRevisa, esperaRevision, causaParaSalir,
  type BorradorClasificacion, type ClasificacionAnh, type DatoClasificado, type PorqueChoke, type Procedencia, type PropuestaAnh,
  type PreguntaCampo, type OpcionCampo, type AtajoYacimiento, type EvidenciaYacimiento, type RespuestaCampo, type RevisionAnh,
  type IdPregunta, type QuienContesta,
} from '@/entities/anh-clasificacion'
import {
  PASOS, PASO_CAMPO, PASO_CIRCULAR, RESPONSABLES, CHOKES, IMPACTOS, PLANEACIONES, ETIQUETA_RESPONSABLE, ETIQUETA_CHOKE,
  ETIQUETA_IMPACTO, ETIQUETA_PLANEACION, textoN1, textoN2,
  type PasoAnh, type Responsable, type Impacto, type Planeacion, type ClaveN1, type CodigoN2,
} from '@/entities/anh-catalogo'
import { calidadClasificacion, type CalidadClasificacion, type CalidadPaso, type CalidadRegla, type CalidadEquipoChoke } from '@/entities/anh-calidad'
import { eventosPozos, servicioPorId } from '@/entities/pozos'
import { paradaPorId } from '@/entities/bombas'
import { AHORA } from '@/entities/reloj'
import { enterosDelPeriodo } from '@/entities/redondeo'
import type { Contexto } from '@/entities/causa-senal'

/** LA COSTURA DEL ÁRBOL DE PARADAS DE LA ANH (Circular 024): los 6 pasos de
 *  cada parada (quién → dónde se trabó → qué pasó → ¿planeada? → causa →
 *  detalle) y la calidad de la clasificación.
 *
 *  `GET /api/vistas/anh/paradas` y `GET /api/vistas/anh/calidad`: el servidor
 *  arma las filas (`paradasAnh`, entities/anh-paradas.ts) con lo que ya dijeron
 *  las personas encima; en el demo eso vive en la sesión (`clasificacionesAnh`)
 *  y se aplica aquí. Las escrituras (clasificar, confirmar, el yacimiento, la respuesta de
 *  campo y la revisión) están en escrituras.ts: usan las ayudas de abajo para encontrar la fila, guardar
 *  solo lo que dijo una persona y extender una corrección al evento o a la cascada.
 *
 *  Las pantallas leen `useParadasAnh` y `useCalidadAnh`; las palabras y las
 *  tablas de presentación (qué paso dice cada rol, las etiquetas) se reexportan
 *  aquí. Nadie en pages/widgets llama `pedir*`. */

export {
  PASOS, PASO_CAMPO, PASO_CIRCULAR, RESPONSABLES, CHOKES, IMPACTOS, PLANEACIONES, ETIQUETA_RESPONSABLE, ETIQUETA_CHOKE,
  ETIQUETA_IMPACTO, ETIQUETA_PLANEACION, textoN1, textoN2, N1_EN_CAMPO, ATAJO_YACIMIENTO,
  // Las preguntas de campo con su texto: la tarjeta repite lo que contestó cada persona (B-04, B-23).
  PREGUNTAS_CAMPO,
  PASOS_QUE_CONFIRMA, PASOS_QUE_DECLARA, PONEN_YACIMIENTO, CONFIRMAN_EN_LOTE, ROLES_QUE_CONTESTAN, esDePersona, gruposPorCadena,
  // Las reglas del árbol que las pantallas dicen y no copian: quién confirma la
  // causa que una señal solo apunta (el jefe de mantenimiento y confiabilidad,
  // que abren o analizan el equipo), el nombre de cada regla, si la fila espera
  // a quien abre el equipo, si una opción es «No sé» y quién atiende una
  // parada marcada «Algo está mal» o pedida a un rol.
  CONFIRMAN_LO_QUE_APUNTA, NOMBRE_FILA, nombreDeRegla, esperaAQuienAbre, esNoSe, quienRevisa, esperaRevision,
  // Lo que sale de TRIM (la ANH, un CSV) lleva la causa con lo estructurado: sin el texto libre ni nombres (D2).
  causaParaSalir,
}
export type {
  ParadaAnh, ConfirmacionLote, EstadoParadaAnh, RetiroAnh, BorradorClasificacion, ClasificacionAnh, DatoClasificado, PorqueChoke, Procedencia,
  PropuestaAnh, PreguntaCampo, OpcionCampo, AtajoYacimiento, EvidenciaYacimiento, PasoAnh, Responsable, Impacto, Planeacion,
  ClaveN1, CodigoN2, CalidadClasificacion, CalidadPaso, CalidadRegla, CalidadEquipoChoke, RespuestaCampo, RevisionAnh, IdPregunta,
  QuienContesta,
}

const D = 86_400_000

/** Lo guardado como lo lee el motor (`OpcionesParadas.guardadas`): un mapa, el
 *  mismo objeto mientras la sesión no cambie (las cachés van por identidad). */
const MAPAS = new WeakMap<Record<string, BorradorClasificacion>, ReadonlyMap<string, BorradorClasificacion>>()
export function guardadasDe(r: Record<string, BorradorClasificacion>): ReadonlyMap<string, BorradorClasificacion> {
  let m = MAPAS.get(r)
  if (!m) MAPAS.set(r, m = new Map(Object.entries(r)))
  return m
}

/** La cadena de los 6 pasos tal como se ve, con «—» en los que faltan: la que
 *  manda la pantalla en `cadena` para el 409 («cambió desde que la vio»). Con los
 *  6 pasos es la misma `cadenaDe` del motor, la que guarda `ConfirmacionLote.cadena`. */
export const cadenaVista = (b: BorradorClasificacion): string => PASOS.map(p => (b[p] ? String(b[p]!.valor) : '—')).join(' · ')

/** Solo lo que dijo una persona en una fila tal como se lee (sus pasos con su
 *  consecutivo, la conversación y la revisión). Con la fuente http es lo que se
 *  copia a la sesión de una confirmación: con el mismo consecutivo, rige lo
 *  mismo (`rigeEnFila`). La descripción nunca es de una persona (D2). */
export function soloDePersona(b: BorradorClasificacion): BorradorClasificacion {
  const r: Record<string, unknown> = {}
  for (const p of PASOS) { const d = b[p]; if (d && esDePersona(d.procedencia)) r[p] = d }
  if (b.cauGral && esDePersona(b.cauGral.procedencia)) r.cauGral = b.cauGral
  if (b.respuestas?.length) r.respuestas = b.respuestas
  if (b.revision) r.revision = b.revision
  return r as BorradorClasificacion
}

/* ─────────────────────────── las paradas del período ─────────────────────────── */

/** `GET /api/vistas/anh/paradas?campos=&desde=&hasta=` · los días operacionales
 *  que toca el período, con lo que ya dijeron las personas encima. Un campo
 *  repetido cuenta una vez (C-10: `campos=ceiba,ceiba` duplicaba las filas). */
export function pedirParadasAnh(q: ConsultaPeriodo, ctx: Contexto, guardadas: Record<string, BorradorClasificacion>): FilaAnh[] {
  const campos = [...new Set(q.campos)], op = { guardadas: guardadasDe(guardadas) }
  const filas = paradasAnh(campos, q.desde, q.hasta, ctx, op)
  // K1 · H2: el entero de cada fila en el reparto de su campo en el período (`enterosDelPeriodo`, redondeo.ts).
  const porFila: Record<string, number> = {}
  for (const c of campos) Object.assign(porFila, enterosDelPeriodo(c, q.desde, q.hasta, ctx, op).porFila)
  return filas.map(f => (Object.hasOwn(porFila, f.id) ? { ...f, entero: porFila[f.id]! } : f))
}

/** K1 · H2 (pendiente de F1 y F2): la fila de la ANH con su entero en el reparto del campo: la diferida que se ve en
 *  Identificar suma igual que en Hoy, en Pozos y en el nivel 3 (LC-08 = 108, no 109). Las filas de un evento suman
 *  el entero del evento. Lo exacto (`diferidaTrimBbl`) es lo que viaja y ordena. */
export type FilaAnh = ParadaAnh & { entero?: number }

export function useParadasAnh(q: ConsultaPeriodo): FilaAnh[] {
  const ctx = useCtx()
  const guardadas = useSesion(s => s.clasificacionesAnh)
  return useDato(PARADAS_ANH, q, `${versionDe(ctx)}.${versionDe(guardadas)}`, () => pedirParadasAnh(q, ctx, guardadas))
}

/** Las filas de las cascadas que muestra la pantalla, enteras aunque el período
 *  las corte (QA-R, vecino 12): «para la cascada» viajan TODAS las filas de la
 *  raíz y el servidor las busca en el día en que cayó la raíz y el siguiente
 *  (`eventosDeLaCascada`). Si el período deja fuera ese día o el siguiente, la
 *  pantalla mandaba solo las del período y la escritura respondía 409 siempre. Se
 *  piden las filas de esa ventana (por el mismo `GET /api/vistas/anh/paradas`) y
 *  se agrupan por raíz; si el período ya la cubre, es la misma consulta. */
export function useRaicesDeCascadas(q: ConsultaPeriodo, filas: readonly ParadaAnh[]): ReadonlyMap<string, ParadaAnh[]> {
  let desde = q.desde.getTime(), hasta = q.hasta.getTime()
  for (const f of filas) {
    if (f.raiz === f.eventoId || f.minutosDesdeRaiz === undefined) continue
    // La raíz cayó minutos antes de que cerrara el pozo; un minuto de margen por el redondeo.
    const d0 = inicioDiaCo(Date.parse(f.inicioEvento) - (f.minutosDesdeRaiz + 1) * 60_000)
    desde = Math.min(desde, d0)
    hasta = Math.max(hasta, Math.min(AHORA.getTime(), d0 + 3 * D))
  }
  const todas = useParadasAnh({ campos: q.campos, desde: new Date(desde), hasta: new Date(hasta) })
  const deCascada = new Set(filas.filter(f => f.raiz !== f.eventoId).map(f => `${f.campoId}|${f.raiz}`))
  const m = new Map<string, ParadaAnh[]>()
  for (const f of [...todas, ...filas]) {
    const k = `${f.campoId}|${f.raiz}`
    if (!deCascada.has(k) && !filas.includes(f)) continue
    const xs = m.get(k)
    if (!xs) m.set(k, [f])
    else if (!xs.some(x => x.id === f.id)) xs.push(f)
  }
  return m
}

/** `GET /api/vistas/anh/calidad?campos=&desde=&hasta=` */
export const pedirCalidadAnh = (q: ConsultaPeriodo, ctx: Contexto, guardadas: Record<string, BorradorClasificacion>): CalidadClasificacion =>
  calidadClasificacion(pedirParadasAnh(q, ctx, guardadas), ctx)

export function useCalidadAnh(q: ConsultaPeriodo): CalidadClasificacion {
  const ctx = useCtx()
  const guardadas = useSesion(s => s.clasificacionesAnh)
  return useDato(CALIDAD_ANH, q, `${versionDe(ctx)}.${versionDe(guardadas)}`, () => pedirCalidadAnh(q, ctx, guardadas))
}

/* ─────────────────────── lo que usan las escrituras ─────────────────────── */

/** El evento y el día operacional de una fila (`${eventoId}@${día}#${n}`); undefined si el id no tiene esa forma. */
export const partesDelId = (id: string): { eventoId: string; dia: string } | undefined => {
  const m = typeof id === 'string' ? /^(.+)@(\d{4}-\d{2}-\d{2})#\d+$/.exec(id) : null
  return m ? { eventoId: m[1]!, dia: m[2]! } : undefined
}

/** El campo del evento de una fila, del registro del controlador (nunca del
 *  cuerpo); undefined si el id no tiene la forma de una fila o el evento no existe. */
export const campoDeLaFila = (id: string): string | undefined => {
  const p = partesDelId(id)
  return p ? eventosPozos().find(e => e.id === p.eventoId)?.campoId : undefined
}

/** La fila con ese id, armada como la arma la vista (con lo guardado encima);
 *  undefined si no existe. El campo sale del evento del controlador, nunca del cuerpo. */
export function pedirParadaAnh(id: string, ctx: Contexto, guardadas: Record<string, BorradorClasificacion>): ParadaAnh | undefined {
  const p = partesDelId(id)
  const ev = p ? eventosPozos().find(e => e.id === p.eventoId) : undefined
  if (!p || !ev) return undefined
  const d0 = new Date(`${p.dia}T00:00:00-05:00`)
  return paradasAnh([ev.campoId], d0, new Date(d0.getTime() + D), ctx, { guardadas: guardadasDe(guardadas) }).find(x => x.id === id)
}

/** Las filas de unos eventos de pozo de un campo, en todos sus días (un evento
 *  que cruza la medianoche tiene una por día), armadas como las arma la vista.
 *  Las del tramo de exceso del programa vienen marcadas (`exceso`). */
export function filasDeEventos(campoId: string, eventoIds: readonly string[], ctx: Contexto, guardadas: Record<string, BorradorClasificacion>): ParadaAnh[] {
  const ids = new Set(eventoIds)
  const evs = eventosPozos().filter(e => ids.has(e.id) && e.campoId === campoId)
  if (!evs.length) return []
  const desde = Math.min(...evs.map(e => Date.parse(e.inicio)))
  const hasta = Math.max(...evs.map(e => (e.fin ? Date.parse(e.fin) : AHORA.getTime())))
  const d0 = inicioDiaCo(desde), d1 = inicioDiaCo(Math.max(desde, hasta - 1)) + D
  return paradasAnh([campoId], new Date(d0), new Date(d1), ctx, { guardadas: guardadasDe(guardadas) }).filter(x => ids.has(x.eventoId))
}

/** Los eventos de la cascada de una fila: los que tienen su misma raíz (el
 *  servicio que cayó o la bomba que paró), buscados en el día en que cayó la raíz
 *  y el siguiente (la ventana de cascada es de minutos; el día siguiente cubre la
 *  medianoche). Sin cascada, solo su evento. */
export function eventosDeLaCascada(p: ParadaAnh, ctx: Contexto, guardadas: Record<string, BorradorClasificacion>): string[] {
  if (p.raiz === p.eventoId) return [p.eventoId]
  const inicio = servicioPorId(p.raiz)?.inicio ?? paradaPorId(p.raiz)?.inicio
  if (!inicio) return [p.eventoId]
  const d0 = inicioDiaCo(Date.parse(inicio))
  const filas = paradasAnh([p.campoId], new Date(d0), new Date(d0 + 2 * D), ctx, { guardadas: guardadasDe(guardadas) })
  return [...new Set([p.eventoId, ...filas.filter(x => x.raiz === p.raiz).map(x => x.eventoId)])].sort()
}

/** Las filas de la cascada de una raíz (el servicio que cayó o la bomba que
 *  paró), en todos los días de sus eventos: las de los pozos que cerró, buscadas
 *  desde el día en que cayó la raíz y el siguiente, como `eventosDeLaCascada`. */
export function filasDeRaiz(campoId: string, raiz: string, ctx: Contexto, guardadas: Record<string, BorradorClasificacion>): ParadaAnh[] {
  const inicio = servicioPorId(raiz)?.inicio ?? paradaPorId(raiz)?.inicio
  if (!inicio) return []
  const d0 = inicioDiaCo(Date.parse(inicio))
  const eventos = [...new Set(paradasAnh([campoId], new Date(d0), new Date(d0 + 2 * D), ctx, { guardadas: guardadasDe(guardadas) })
    .filter(x => x.raiz === raiz).map(x => x.eventoId))]
  return filasDeEventos(campoId, eventos, ctx, guardadas)
}
