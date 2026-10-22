import { useCtx, useSesion } from './sesion'
import { useDato, versionDe } from './consulta'
import { PARADAS_ANH, CALIDAD_ANH, type ConsultaPeriodo } from './contrato'
import {
  paradasAnh, inicioDiaCo, gruposPorCadena, CONFIRMAN_EN_LOTE,
  type ParadaAnh, type ConfirmacionLote, type EstadoParadaAnh,
} from '@/entities/anh-paradas'
import {
  esDePersona, PASOS_QUE_CONFIRMA, PASOS_QUE_DECLARA, PONEN_YACIMIENTO, ATAJO_YACIMIENTO, N1_EN_CAMPO, ROLES_QUE_CONTESTAN,
  type BorradorClasificacion, type ClasificacionAnh, type DatoClasificado, type PorqueChoke, type Procedencia, type PropuestaAnh,
  type PreguntaCampo, type OpcionCampo, type AtajoYacimiento, type EvidenciaYacimiento,
} from '@/entities/anh-clasificacion'
import {
  PASOS, PASO_CAMPO, PASO_CIRCULAR, RESPONSABLES, CHOKES, IMPACTOS, PLANEACIONES, ETIQUETA_RESPONSABLE, ETIQUETA_CHOKE,
  ETIQUETA_IMPACTO, ETIQUETA_PLANEACION, textoN1, textoN2,
  type PasoAnh, type Responsable, type Impacto, type Planeacion, type ClaveN1, type CodigoN2,
} from '@/entities/anh-catalogo'
import { calidadClasificacion, type CalidadClasificacion, type CalidadPaso, type CalidadRegla, type CalidadEquipoChoke } from '@/entities/anh-calidad'
import { eventosPozos, servicioPorId } from '@/entities/pozos'
import { paradaPorId } from '@/entities/bombas'
import type { Contexto } from '@/entities/causa-senal'

/** LA COSTURA DEL ÁRBOL DE PARADAS DE LA ANH (Circular 024): los 6 pasos de
 *  cada parada (quién → dónde se trabó → qué pasó → ¿planeada? → causa →
 *  detalle) y la calidad de la clasificación.
 *
 *  `GET /api/vistas/anh/paradas` y `GET /api/vistas/anh/calidad`: el servidor
 *  arma las filas (`paradasAnh`, entities/anh-paradas.ts) con lo que ya dijeron
 *  las personas encima; en el demo eso vive en la sesión (`clasificacionesAnh`)
 *  y se aplica aquí. Las escrituras (clasificar, confirmar, el yacimiento) están
 *  en escrituras.ts: usan las ayudas de abajo para encontrar la fila, guardar
 *  solo lo que dijo una persona y extender una corrección al evento o a la cascada.
 *
 *  Las pantallas leen `useParadasAnh` y `useCalidadAnh`; las palabras y las
 *  tablas de presentación (qué paso dice cada rol, las etiquetas) se reexportan
 *  aquí. Nadie en pages/widgets llama `pedir*`. */

export {
  PASOS, PASO_CAMPO, PASO_CIRCULAR, RESPONSABLES, CHOKES, IMPACTOS, PLANEACIONES, ETIQUETA_RESPONSABLE, ETIQUETA_CHOKE,
  ETIQUETA_IMPACTO, ETIQUETA_PLANEACION, textoN1, textoN2, N1_EN_CAMPO, ATAJO_YACIMIENTO,
  PASOS_QUE_CONFIRMA, PASOS_QUE_DECLARA, PONEN_YACIMIENTO, CONFIRMAN_EN_LOTE, ROLES_QUE_CONTESTAN, esDePersona, gruposPorCadena,
}
export type {
  ParadaAnh, ConfirmacionLote, EstadoParadaAnh, BorradorClasificacion, ClasificacionAnh, DatoClasificado, PorqueChoke, Procedencia,
  PropuestaAnh, PreguntaCampo, OpcionCampo, AtajoYacimiento, EvidenciaYacimiento, PasoAnh, Responsable, Impacto, Planeacion,
  ClaveN1, CodigoN2, CalidadClasificacion, CalidadPaso, CalidadRegla, CalidadEquipoChoke,
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

/** Solo lo que dijo una persona: es lo que se guarda (lo de TRIM se vuelve a
 *  proponer con la regla de hoy al leer la fila; `aplicarGuardada`, anh-clasificacion.ts). */
export function soloDePersona(b: BorradorClasificacion): BorradorClasificacion {
  const r: Record<string, unknown> = {}
  for (const p of PASOS) { const d = b[p]; if (d && esDePersona(d.procedencia)) r[p] = d }
  if (b.cauGral && b.cauGral.procedencia !== 'regla') r.cauGral = b.cauGral
  if (b.descEvid && esDePersona(b.descEvid.procedencia)) r.descEvid = b.descEvid
  return r as BorradorClasificacion
}

/* ─────────────────────────── las paradas del período ─────────────────────────── */

/** `GET /api/vistas/anh/paradas?campos=&desde=&hasta=` · los días operacionales
 *  que toca el período, con lo que ya dijeron las personas encima. */
export const pedirParadasAnh = (q: ConsultaPeriodo, ctx: Contexto, guardadas: Record<string, BorradorClasificacion>): ParadaAnh[] =>
  paradasAnh(q.campos, q.desde, q.hasta, ctx, { guardadas: guardadasDe(guardadas) })

export function useParadasAnh(q: ConsultaPeriodo): ParadaAnh[] {
  const ctx = useCtx()
  const guardadas = useSesion(s => s.clasificacionesAnh)
  return useDato(PARADAS_ANH, q, `${versionDe(ctx)}.${versionDe(guardadas)}`, () => pedirParadasAnh(q, ctx, guardadas))
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
const partesDelId = (id: string): { eventoId: string; dia: string } | undefined => {
  const m = /^(.+)@(\d{4}-\d{2}-\d{2})#\d+$/.exec(id)
  return m ? { eventoId: m[1]!, dia: m[2]! } : undefined
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

/** Las claves de lo guardado que son tramos de un evento (`${eventoId}@…`). */
export const filasGuardadasDe = (guardadas: Record<string, BorradorClasificacion>, eventoId: string): string[] =>
  Object.keys(guardadas).filter(k => k.startsWith(`${eventoId}@`))
