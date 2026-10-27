/** A3 · LA RESPUESTA DE LA ANH Y LA HORA PARA CORREGIR (necesario-por-rol.md: reg,
 *  apoyo 3; CAMBIOS-CONTRATO.md §9, M3).
 *
 *  El reporte diario de un día operacional sale el día siguiente antes de las 07:00
 *  (C24 p.8-9). Si la ANH lo rechaza, hay **1 hora** para corregir y retransmitir;
 *  mientras tanto se tiene por no recibido (Res. 0651 art. 15.2, añadido por la Res.
 *  0052/2026; U1 §6.1).
 *
 *  Por ahora la respuesta se registra A MANO (U1 §6.3, punto 2: «La respuesta de la
 *  ANH también se registra a mano, hasta que exista integración con el canal»):
 *  aceptado o rechazado, el motivo de una lista cerrada y la hora en que llegó. Sin
 *  texto libre (D2). Solo por inserción (D1): una respuesta nueva no borra la
 *  anterior; rige la más reciente del día.
 *
 *  La lista de motivos son las reglas de rechazo de la circular que TRIM ya valida
 *  (P1 §4.2, las de gravedad «rechazo»). La ANH no publica una lista de códigos de
 *  rechazo: que su respuesta use estas palabras es NO VERIFICADO; «otro» queda para
 *  lo que no encaje. */

/** La hora para corregir (Res. 0651 art. 15.2). */
export const MINUTOS_PARA_CORREGIR = 60

/** Los motivos de rechazo, de las reglas de validación de la circular (P1 §4.2). */
export const MOTIVOS_RECHAZO_ANH = [
  { codigo: 'V-01', texto: 'Falta el nodo de paradas', fuente: 'C24 p.7' },
  { codigo: 'V-02', texto: 'Una parada no trae los 15 campos', fuente: 'C24 p.3, p.7-8' },
  { codigo: 'V-03', texto: 'Un valor no tiene la forma [valor, origen, unidad]', fuente: 'C24 p.2' },
  { codigo: 'V-04', texto: 'Un valor fuera de la lista (responsable, dónde se trabó, qué pasó o si fue planeada)', fuente: 'C24 p.5, p.8' },
  { codigo: 'V-05', texto: 'Una causa que no es de las 20 de la circular', fuente: 'C24 p.7' },
  { codigo: 'V-06', texto: '¿Planeada? no va con la causa', fuente: 'C24 p.7' },
  { codigo: 'V-07', texto: 'El detalle no es de su causa', fuente: 'C24 p.8' },
  { codigo: 'V-08', texto: 'Las horas de la parada no cuadran', fuente: 'C24 p.8' },
  { codigo: 'V-09', texto: 'Una parada sin causa', fuente: 'C24 p.7' },
  { codigo: 'V-10', texto: 'Falta el pozo, su registro o el campo', fuente: 'C24 p.7-8' },
  { codigo: 'V-14', texto: 'El nombre del archivo no cumple', fuente: 'C24 p.9' },
  { codigo: 'otro', texto: 'Otro motivo de la ANH', fuente: 'la respuesta de la ANH' },
] as const
export type MotivoRechazoAnh = (typeof MOTIVOS_RECHAZO_ANH)[number]['codigo']
export const esMotivoRechazoAnh = (x: unknown): x is MotivoRechazoAnh => MOTIVOS_RECHAZO_ANH.some(m => m.codigo === x)
export const textoMotivoRechazo = (m: MotivoRechazoAnh): string => MOTIVOS_RECHAZO_ANH.find(x => x.codigo === m)!.texto

export type EstadoRespuestaAnh = 'aceptado' | 'rechazado'

/** Lo que manda regulatorio (`POST /api/anh/respuestas`). */
export interface CuerpoRespuestaDeLaAnh {
  campoId: string
  /** El día operacional reportado (AAAA-MM-DD). */
  dia: string
  estado: EstadoRespuestaAnh
  /** Solo en un rechazo, y obligatorio: de `MOTIVOS_RECHAZO_ANH`. */
  motivo?: MotivoRechazoAnh
  /** Cuándo llegó la respuesta (ISO 8601 con zona). Desde ahí corre la hora para corregir. */
  recibida: string
  /** El folio del informe con que se reportó, si lo hay (`POST /api/informes`). */
  folio?: string
}

/** La respuesta como la guarda el servidor (por inserción). */
export interface RespuestaAnh extends CuerpoRespuestaDeLaAnh {
  /** El consecutivo del registro: el orden en que se dijo. */
  n: number
  /** En un rechazo: `recibida` + 1 h. */
  limiteCorreccion?: string
  /** Quién la registró («Nombre · rol»), su id y a qué hora. Los pone el servidor. */
  por: string
  porId: string
  hora: string
}

/** Lo que rige de un día: su respuesta más reciente, con lo que queda de la hora. */
export interface DiaRespondido {
  campoId: string
  dia: string
  estado: EstadoRespuestaAnh
  motivo?: MotivoRechazoAnh
  /** El motivo en palabras. */
  motivoTexto?: string
  recibida: string
  limiteCorreccion?: string
  /** En un rechazo: los minutos que quedan para corregir (0 si ya venció). */
  quedanMin?: number
  /** En un rechazo: ya pasó la hora. */
  vencida?: boolean
  /** Cuántas respuestas tiene el día (la historia no se borra). */
  respuestas: number
  por: string
}

/** `GET /api/vistas/anh/respuestas?campos=&desde=&hasta=`. */
export interface VistaRespuestasAnh {
  campos: string[]
  /** Uno por día con respuesta: primero los rechazos con hora por delante (el que vence antes), después del más reciente al más viejo. */
  dias: DiaRespondido[]
  /** Toda la historia del período, en el orden en que se registró. */
  respuestas: RespuestaAnh[]
  /** Rechazos que todavía están dentro de la hora para corregir. */
  porCorregir: number
}

const MIN = 60_000
/** El instante en que empieza un día operacional (00:00 de Colombia). */
const inicioDia = (dia: string) => Date.parse(`${dia}T00:00:00-05:00`)
/** «AAAA-MM-DD» que además es un día del calendario. */
export const esDia = (d: unknown): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)
  && new Date(`${d}T12:00:00Z`).toISOString().slice(0, 10) === d

/** El límite para corregir un rechazo: la hora en que llegó más 1 h, en hora de Colombia. */
export function limiteDeCorreccion(recibida: string): string {
  const t = Date.parse(recibida) + MINUTOS_PARA_CORREGIR * MIN
  return `${new Date(t - 5 * 3_600_000).toISOString().slice(0, 19)}-05:00`
}

/** Lo que no pasa una regla de la respuesta (las de forma y permiso van antes). */
export interface FallaRespuesta { estado: 409 | 422; codigo: string; error: string }

/** Las reglas del dominio de una respuesta nueva, contra las del mismo día. */
export function revisarRespuestaAnh(c: CuerpoRespuestaDeLaAnh, previas: readonly RespuestaAnh[], ahora: number): FallaRespuesta | undefined {
  if (!esDia(c.dia)) return { estado: 422, codigo: 'dia-invalido', error: `«${c.dia}» no es un día (AAAA-MM-DD).` }
  if (c.estado !== 'aceptado' && c.estado !== 'rechazado') return { estado: 422, codigo: 'estado-invalido', error: 'La respuesta de la ANH es «aceptado» o «rechazado».' }
  if (c.estado === 'rechazado' && c.motivo === undefined) return { estado: 422, codigo: 'falta-motivo', error: 'Un rechazo va con su motivo, de la lista.' }
  if (c.estado === 'aceptado' && c.motivo !== undefined) return { estado: 422, codigo: 'motivo-ajeno', error: 'Una respuesta aceptada no lleva motivo.' }
  if (c.motivo !== undefined && !esMotivoRechazoAnh(c.motivo)) return { estado: 422, codigo: 'motivo-ajeno', error: 'Ese motivo no está en la lista.' }
  const t = Date.parse(c.recibida)
  if (!Number.isFinite(t)) return { estado: 422, codigo: 'hora-invalida', error: 'La hora en que llegó la respuesta no se puede leer.' }
  if (t > ahora) return { estado: 422, codigo: 'hora-invalida', error: 'La respuesta no puede llegar después de ahora.' }
  // El reporte del día sale cuando el día cierra: la respuesta llega después.
  if (t < inicioDia(c.dia) + 86_400_000) return { estado: 422, codigo: 'hora-invalida', error: 'La respuesta de un día llega después de que el día cierra (el reporte sale al día siguiente).' }
  const delDia = previas.filter(r => r.campoId === c.campoId && r.dia === c.dia)
  const vigente = vigenteDe(delDia)
  if (vigente?.estado === 'aceptado') return { estado: 409, codigo: 'ya-aceptada', error: `La ANH ya aceptó el reporte de ese día (registrado por ${vigente.por}).` }
  if (vigente && t < Date.parse(vigente.recibida)) return { estado: 409, codigo: 'hora-anterior', error: 'Ya hay una respuesta de ese día que llegó después: la nueva no puede ser más vieja.' }
  return undefined
}

/** La respuesta que rige entre las de un día: la que llegó de último (y, a la misma hora, la registrada de último). */
function vigenteDe(xs: readonly RespuestaAnh[]): RespuestaAnh | undefined {
  return [...xs].sort((a, b) => Date.parse(b.recibida) - Date.parse(a.recibida) || b.n - a.n)[0]
}

/** La respuesta como se guarda, con lo que pone el servidor. */
export function armarRespuestaAnh(c: CuerpoRespuestaDeLaAnh, n: number, quien: { por: string; porId: string; hora: string }): RespuestaAnh {
  return {
    campoId: c.campoId, dia: c.dia, estado: c.estado, ...(c.motivo !== undefined ? { motivo: c.motivo } : {}), recibida: c.recibida,
    ...(c.folio !== undefined ? { folio: c.folio } : {}), n,
    ...(c.estado === 'rechazado' ? { limiteCorreccion: limiteDeCorreccion(c.recibida) } : {}), ...quien,
  }
}

/** Lo que rige de cada día, con lo que queda de la hora (a la hora `ahora`, ms). */
export function vistaRespuestasAnh(todas: readonly RespuestaAnh[], q: { campos: string[]; desde: Date; hasta: Date }, ahora: number): VistaRespuestasAnh {
  const campos = [...new Set(q.campos)]
  const d0 = q.desde.getTime(), d1 = q.hasta.getTime()
  const respuestas = todas.filter(r => campos.includes(r.campoId) && inicioDia(r.dia) >= d0 && inicioDia(r.dia) < d1).sort((a, b) => a.n - b.n)
  const claves = [...new Set(respuestas.map(r => `${r.campoId}|${r.dia}`))]
  const dias: DiaRespondido[] = claves.map(k => {
    const delDia = respuestas.filter(r => `${r.campoId}|${r.dia}` === k)
    const v = vigenteDe(delDia)!
    const rechazo = v.estado === 'rechazado' && v.limiteCorreccion
      ? { quedanMin: Math.max(0, Math.floor((Date.parse(v.limiteCorreccion) - ahora) / MIN)), vencida: Date.parse(v.limiteCorreccion) <= ahora } : {}
    return {
      campoId: v.campoId, dia: v.dia, estado: v.estado, ...(v.motivo ? { motivo: v.motivo, motivoTexto: textoMotivoRechazo(v.motivo) } : {}),
      recibida: v.recibida, ...(v.limiteCorreccion ? { limiteCorreccion: v.limiteCorreccion } : {}), ...rechazo, respuestas: delDia.length, por: v.por,
    }
  })
  const abierto = (x: DiaRespondido) => x.estado === 'rechazado' && x.vencida === false
  dias.sort((a, b) => Number(abierto(b)) - Number(abierto(a))
    || (abierto(a) && abierto(b) ? Date.parse(a.limiteCorreccion!) - Date.parse(b.limiteCorreccion!) : Date.parse(b.recibida) - Date.parse(a.recibida))
    || a.campoId.localeCompare(b.campoId))
  return { campos, dias, respuestas, porCorregir: dias.filter(abierto).length }
}

/** El campo opcional `respuestaAnh` de `GET /api/vistas/anh/reporte`: lo primero de
 *  `dias` (un rechazo con hora por delante, o la respuesta más reciente). Ausente si
 *  el período no tiene ninguna: la pantalla dice «ANH: sin respuesta registrada». */
export const respuestaDelReporte = (v: VistaRespuestasAnh): DiaRespondido | undefined => v.dias[0]
