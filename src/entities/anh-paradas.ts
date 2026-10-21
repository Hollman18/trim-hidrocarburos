/** El tramo reportable a la ANH: una fila de `paradas_pozo` es un pozo × un
 *  día operacional × una causa (P1 §1.5). Sale de los tramos del libro, que no
 *  cambian: aquí solo se parten por día y se clasifican.
 *
 *  Reglas (P1 §2.1 y §2.6; provisionales hasta la pregunta 4 de P1 §8):
 *  - DÍA OPERACIONAL: el día calendario con corte a las 23:59:59 (C24 p.9), en
 *    hora de Colombia (−05:00), como ya corta el día a día del libro (`porDia`).
 *  - MEDIANOCHE: una parada que la cruza se parte en una fila por día, con el
 *    mismo evento: la primera termina a las 23:59:59 y la siguiente empieza a
 *    las 00:00:00. En el JSON las 23:59:59 COT son las 04:59:59Z del día
 *    siguiente (C24 p.8; `horaAnh`).
 *  - ABIERTA AL CORTE: si a las 23:59:59 seguía parada, la fila termina ahí y
 *    lo dice («Continúa al corte del día»): `h_fin_paro` nunca va vacío (R1 §1.7).
 *  - «Tramo n de m del evento» en la descripción cuando se partió (S1 R-F):
 *    sin él, la ANH leería más paradas de las que hubo.
 *  - PARCIAL (frecuencia reducida, HZ): también es parada («total o parcial»,
 *    C24 p.3-4), con su fracción y «parcial: X Hz de Y Hz de la prueba».
 *  - DISPAROS de la electrosumergible (< 24 h): también son filas, aunque no
 *    cuenten como falla para el MTBF (C24 p.4, «con independencia de su duración»).
 *  - CASCADA: un servicio que cierra N pozos da N filas con la misma raíz y la
 *    misma clasificación (Unicidad, C24 p.5).
 *  - EXCESO de una parada programada: lo que siguió cerrado después de la
 *    ventana del programa es otra fila, no planeada (P1 §2.2).
 *  - UNA HORA DEL POZO, UNA FILA: un evento que llega con el pozo ya cerrado no
 *    abre otra fila (se anota en la descripción), y si la primera causa termina
 *    y el pozo sigue cerrado por otra, se parte (R1 A-15). Es la misma regla con
 *    que el libro cobra cada hora una sola vez.
 *  Los barriles de cada fila son los del libro en ese tramo: no viajan a la ANH
 *  (la diferida ANH es otra cifra, P1 §1.8) y suman exacto lo del libro.
 */
import { tramosEntre, esDisparo, perdidaPorFrecuencia, type Tramo } from './libro'
import { eventosDeCampo, pozoDe, pruebaEn, servicioPorId, CODIGO, type EventoPozo } from './pozos'
import { paradaPorId } from './bombas'
import { AHORA } from './reloj'
import type { Causa, Contexto } from './causa-senal'
import { PASOS, VERSION_POR_DEFECTO, type IdVersionCatalogo, type PasoAnh } from './anh-catalogo'
import {
  proponerClasificacion, propuestaDeExceso, aplicarGuardada, conDescripcion, conCascada, reevaluar, programaDeCausa, confirmarPasos, cadenaDe,
  PASOS_QUE_CONFIRMA,
  type PropuestaAnh, type BorradorClasificacion, type ClasificacionAnh, type EstadoParadaAnh, type OpcionesPropuesta, type Persona,
  type EvidenciaYacimiento,
} from './anh-clasificacion'

export type { EstadoParadaAnh }

const H = 3_600_000, D = 86_400_000, COT = 5 * H
const ahora = AHORA.getTime()
const ms = (s: string) => new Date(s).getTime()
/** El corte del día operacional: las 23:59:59, un segundo antes de la medianoche (C24 p.9). */
const CORTE_MS = 1000

/** Medianoche de Colombia del día de un instante (la misma cuenta que `porDia` del libro). */
export const inicioDiaCo = (t: number) => Math.floor((t - COT) / D) * D + COT
/** El día operacional de un instante, 'AAAA-MM-DD' en hora de Colombia (C24 p.9; zona provisional). */
export const diaOperacional = (t: number) => new Date(t - COT).toISOString().slice(0, 10)
/** Un instante en hora de Colombia, con su zona: «2026-10-02T03:52:18-05:00». */
export const isoCo = (t: number) => `${new Date(t - COT).toISOString().slice(0, 19)}-05:00`

/** Cómo viajan las horas: en UTC con Z, como el formato de C24 p.8 y la
 *  plantilla («2026-07-31T10:00:00Z»), o con la zona de Colombia si la ANH lo
 *  pide (`Config.anh.zonaSalida`, P1 §2.6; R1 A-12). */
export type ZonaSalida = 'utc-z' | 'cot-offset'

/** Una hora como va en `h_ini_paro` y `h_fin_paro`. Las 23:59:59 COT son las
 *  04:59:59Z del día siguiente: es la misma hora, escrita en UTC. */
export function horaAnh(iso: string, zona: ZonaSalida = 'utc-z'): string {
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) throw new Error(`«${iso}» no es una hora.`)
  return zona === 'utc-z' ? `${new Date(t).toISOString().slice(0, 19)}Z` : isoCo(t)
}

/** Una fila de `paradas_pozo` (P1 §1.5). */
export interface ParadaAnh {
  /** `${eventoId}@${diaOperacional}#${n}`, con n el tramo del evento. */
  id: string
  /** El evento del controlador del pozo: une los tramos de un mismo evento. */
  eventoId: string
  /** La raíz: el servicio, la bomba o el propio evento que la causó. Una
   *  cascada de N pozos son N filas con la misma raíz (Unicidad, C24 p.5): se
   *  agrupa por aquí sin volver a calcular (U2 §11.1). */
  raiz: string
  /** Minutos entre la caída de la raíz y la parada de este pozo, si la raíz es otra (una cascada). */
  minutosDesdeRaiz?: number
  /** «En el yacimiento»: lo que lo muestra, si producción o confiabilidad lo puso (U2 §11.1). */
  evidenciaYacimiento?: EvidenciaYacimiento
  pozo: string
  campoId: string
  diaOperacional: string
  /** Hora de Colombia con su zona; en el JSON va como la escribe `horaAnh`. */
  inicio: string
  /** Nunca vacío: si seguía parada al corte, las 23:59:59 de su día. */
  fin: string
  abiertaAlCorte: boolean
  /** El día todavía no corta (es hoy): la fila puede cambiar. */
  diaEnCurso: boolean
  /** Fracción del caudal que se dejó de producir: 1 cerrado; menos de 1, parcial. */
  fraccion: number
  /** Frecuencia reducida (código HZ): parada parcial. */
  parcial: boolean
  /** Disparo de electrosumergible que volvió a arrancar en menos de 24 h. */
  disparo: boolean
  /** Lo que siguió cerrado después de la ventana del programa firmado. */
  exceso: boolean
  /** Tramo n de m del evento; m es null mientras el evento siga abierto. */
  tramo: { n: number; m: number | null }
  /** Horas del tramo (las que el libro cobra; el corte de las 23:59:59 es solo de la fila). */
  horas: number
  /** La diferida del libro en este tramo: solo lectura, no viaja (P1 §1.5). */
  diferidaTrimBbl: number
  /** La causa de TRIM, sin tocar: la vista de gestión. */
  causa: Causa
  clasificacion: ClasificacionAnh | BorradorClasificacion
  estado: EstadoParadaAnh
  faltan: PasoAnh[]
  /** La propuesta de TRIM para este tramo: opciones cerradas, preguntas y sugerencias de lo que falta. */
  propuesta: PropuestaAnh
  versionCatalogo: IdVersionCatalogo
}

export interface OpcionesParadas extends OpcionesPropuesta {
  /** La forma de salida de la operadora (`Config.anh.versionCatalogo`; por defecto la circular). */
  version?: IdVersionCatalogo
  /** `Config.anh.reportarParciales` (por defecto sí, P1 §2.1): apagarlo no toca datos. */
  reportarParciales?: boolean
  /** Lo que ya dijeron las personas, por id de la fila o por evento (Unicidad:
   *  un evento, una clasificación, que se copia a sus tramos; P1 §2.6). */
  guardadas?: ReadonlyMap<string, BorradorClasificacion>
}

/* Lo que de verdad cobra cada evento de un pozo: su intervalo menos lo que ya
   cubre otro evento del mismo pozo que manda (un paro manda sobre una
   frecuencia reducida; entre dos del mismo tipo, el que empezó primero). Es
   la regla de `intervalosEfectivos` de libro.ts, que allí es privada, repetida
   al pie de la letra: la fila de la ANH empieza y termina donde el libro cobra,
   y verificar-arbol comprueba que las horas de las filas suman las del libro. */
const EFECTIVOS = new Map<string, Map<string, Array<[number, number]>>>()
function efectivos(campoId: string): Map<string, Array<[number, number]>> {
  const ya = EFECTIVOS.get(campoId)
  if (ya) return ya
  const out = new Map<string, Array<[number, number]>>()
  const porPozo = new Map<string, EventoPozo[]>()
  for (const ev of eventosDeCampo(campoId)) {
    const g = porPozo.get(ev.pozo)
    if (g) g.push(ev); else porPozo.set(ev.pozo, [ev])
  }
  for (const evs of porPozo.values()) {
    const orden = [...evs].sort((a, b) => Number(a.codigo === 'HZ') - Number(b.codigo === 'HZ') || ms(a.inicio) - ms(b.inicio) || a.id.localeCompare(b.id))
    const cubierto: Array<[number, number]> = []
    for (const ev of orden) {
      let libres: Array<[number, number]> = [[ms(ev.inicio), ev.fin ? ms(ev.fin) : ahora]]
      for (const [c0, c1] of cubierto) {
        libres = libres.flatMap(([a, b]): Array<[number, number]> => (c1 <= a || c0 >= b) ? [[a, b]]
          : [...(c0 > a ? [[a, c0] as [number, number]] : []), ...(c1 < b ? [[c1, b] as [number, number]] : [])])
      }
      out.set(ev.id, libres)
      cubierto.push(...libres)
    }
  }
  EFECTIVOS.set(campoId, out)
  return out
}

/** Un pedazo de un evento: dentro de un solo día y de un solo lado del fin de la ventana del programa. */
interface Pedazo { a: number; b: number; exceso: boolean }

/** Los pedazos de un evento en toda su vida, en orden: lo que cobra, partido
 *  en la medianoche de Colombia y en el fin de la ventana del programa. */
function pedazosDe(ev: EventoPozo, campoId: string, finVentana: number | undefined): Pedazo[] {
  const out: Pedazo[] = []
  for (const [x, y] of efectivos(campoId).get(ev.id) ?? []) {
    for (let a = x; a < y;) {
      let b = Math.min(y, inicioDiaCo(a) + D)
      if (finVentana !== undefined && a < finVentana && finVentana < b) b = finVentana
      out.push({ a, b, exceso: finVentana !== undefined && a >= finVentana })
      a = b
    }
  }
  return out
}

const HORA_CO = (t: number) => new Date(t - COT).toISOString().slice(11, 16)
/** Una frecuencia como la escribe una persona en Colombia: «39,5». */
const FMT_HZ = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })
const HZ = (v: number) => FMT_HZ.format(v)

/** Las primeras líneas de `desc_evid` de un tramo (P1 §2.1, §2.6; S1 R-F). */
function lineasDelTramo(x: { abierta: boolean; n: number; m: number | null; eventoId: string; parcial: string | undefined;
  exceso: string | undefined; disparo: boolean; cubiertos: string[] }): string[] {
  return [
    ...(x.abierta ? ['Continúa al corte del día'] : []),
    ...(x.m === null ? (x.n > 1 || x.abierta ? [`Tramo ${x.n} del evento ${x.eventoId}, que sigue abierto`] : [])
      : x.m > 1 ? [`Tramo ${x.n} de ${x.m} del evento ${x.eventoId}`] : []),
    ...(x.parcial ? [x.parcial] : []),
    ...(x.exceso ? [x.exceso] : []),
    ...(x.disparo ? ['Disparo: volvió a arrancar en menos de 24 h'] : []),
    ...x.cubiertos,
  ]
}

/** Las filas de `paradas_pozo` de los días operacionales que toca el período
 *  (el período se lleva a días enteros: de la medianoche del primero a la del
 *  día siguiente al último). Ordenadas por día, campo, pozo e inicio. */
export function paradasAnh(campoIds: string[], desde: Date, hasta: Date, ctx: Contexto, op: OpcionesParadas = {}): ParadaAnh[] {
  const version = op.version ?? VERSION_POR_DEFECTO
  const parciales = op.reportarParciales ?? true
  const d0 = inicioDiaCo(desde.getTime()), d1 = inicioDiaCo(hasta.getTime() - 1) + D
  // Una propuesta por causa y una lista de pedazos por evento, en esta llamada.
  const propuestas = new Map<Causa, PropuestaAnh>()
  const pedazos = new Map<string, Pedazo[]>()
  const out: ParadaAnh[] = []
  for (let dia = d0; dia < d1; dia += D) {
    const finDia = dia + D
    const tramos = tramosEntre(campoIds, new Date(dia), new Date(finDia), ctx)
    // Los eventos que llegaron con el pozo ya cerrado: no abren fila, se anotan en la del pozo.
    const cubiertos = new Map<string, Tramo[]>()
    for (const t of tramos) if (t.horas <= 0) {
      const k = `${t.pozo.campoId}|${t.pozo.id}`
      const g = cubiertos.get(k)
      if (g) g.push(t); else cubiertos.set(k, [t])
    }
    for (const t of tramos) {
      const ev = t.evento, campoId = t.pozo.campoId, causa = t.causa
      if (ev.codigo === 'HZ' && !parciales) continue
      const pr = programaDeCausa(causa, campoId, ctx)
      let todos = pedazos.get(ev.id)
      if (!todos) pedazos.set(ev.id, todos = pedazosDe(ev, campoId, pr ? ms(pr.hasta) : undefined))
      let base = propuestas.get(causa)
      if (!base) propuestas.set(causa, base = proponerClasificacion(causa, campoId, ctx, op))
      const p = pozoDe(campoId, ev.pozo) ?? t.pozo
      todos.forEach((pz, i) => {
        if (pz.a < dia || pz.a >= finDia) return
        const n = i + 1, m = ev.fin ? todos.length : null
        const ultimo = i === todos.length - 1
        // Seguía parada al corte: el pedazo llega a la medianoche y el evento
        // sigue después, o es el último de un evento todavía abierto (hoy).
        const abierta = (pz.b === finDia && (!ev.fin || ms(ev.fin) > finDia)) || (!ev.fin && ultimo)
        const fin = abierta || pz.b === finDia ? finDia - CORTE_MS : pz.b
        const horas = (pz.b - pz.a) / H
        const bbl = t.horas > 0 ? t.bbl * horas / t.horas : 0
        const fraccion = ev.codigo === 'HZ' ? perdidaPorFrecuencia(ev.hz, pruebaEn(p, dia)?.hz) : 1
        const hzPrueba = pruebaEn(p, dia)?.hz
        const parcial = ev.codigo === 'HZ'
          ? (ev.hz && hzPrueba ? `Parcial: ${HZ(ev.hz)} Hz de ${HZ(hzPrueba)} Hz de la prueba` : 'Parcial: frecuencia reducida; sin la frecuencia de la prueba se cuenta como cerrado')
          : undefined
        const exceso = pz.exceso && pr ? `Se pasó de la ventana del programa ${pr.id}, que terminaba a las ${HORA_CO(ms(pr.hasta))}` : undefined
        const disparo = esDisparo({ causa, evento: ev })
        // Lo que llegó con el pozo ya cerrado dentro de este tramo (Unicidad, C24 p.5).
        const notas = (cubiertos.get(`${campoId}|${ev.pozo}`) ?? [])
          .filter(c => c.evento.id !== ev.id && ms(c.evento.inicio) >= pz.a && ms(c.evento.inicio) < pz.b)
          .map(c => `Mientras seguía cerrado llegó ${c.evento.codigo} (${CODIGO[c.evento.codigo]}) a las ${HORA_CO(ms(c.evento.inicio))}: no abre otra fila`)
        const lineas = lineasDelTramo({ abierta, n, m, eventoId: ev.id, parcial, exceso, disparo, cubiertos: notas })
        const deTramo = pz.exceso && pr ? propuestaDeExceso(base, pr) : base
        const id = `${ev.id}@${diaOperacional(pz.a)}#${n}`
        let propuesta = conDescripcion(deTramo, [...lineas, deTramo.borrador.descEvid?.valor ?? ''].filter(Boolean).join('. '))
        // La cascada: la raíz es otro evento (el servicio que cayó o la bomba que paró).
        const raiz = causa.evento ?? ev.id
        const inicioRaiz = raiz === ev.id ? undefined : servicioPorId(raiz)?.inicio ?? paradaPorId(raiz)?.inicio
        const minutos = inicioRaiz ? Math.round((ms(ev.inicio) - ms(inicioRaiz)) / 60_000) : undefined
        if (minutos !== undefined) propuesta = conCascada(propuesta, { raiz, minutos })
        const guardada = op.guardadas?.get(id) ?? (pz.exceso ? undefined : op.guardadas?.get(ev.id))
        if (guardada) propuesta = aplicarGuardada(propuesta, guardada)
        const clasificacion = propuesta.clasificacion ?? propuesta.borrador
        const evidencia = clasificacion.choke?.valor === 'reservorio' ? clasificacion.choke.porque?.evidencia : undefined
        out.push({
          id, eventoId: ev.id, raiz, ...(minutos !== undefined ? { minutosDesdeRaiz: minutos } : {}),
          ...(evidencia ? { evidenciaYacimiento: evidencia } : {}), pozo: ev.pozo, campoId,
          diaOperacional: diaOperacional(pz.a), inicio: isoCo(pz.a), fin: isoCo(fin),
          abiertaAlCorte: abierta, diaEnCurso: finDia > ahora,
          fraccion, parcial: ev.codigo === 'HZ', disparo, exceso: pz.exceso,
          tramo: { n, m }, horas, diferidaTrimBbl: bbl, causa, clasificacion,
          estado: propuesta.estado, faltan: propuesta.faltan, propuesta, versionCatalogo: version,
        })
      })
    }
  }
  return out.sort((x, y) => x.diaOperacional.localeCompare(y.diaOperacional) || x.campoId.localeCompare(y.campoId)
    || x.pozo.localeCompare(y.pozo) || ms(x.inicio) - ms(y.inicio) || x.id.localeCompare(y.id))
}

/** La misma fila con otra clasificación (después de confirmar o de corregir). */
export function conClasificacion(p: ParadaAnh, b: BorradorClasificacion): ParadaAnh {
  const propuesta = reevaluar(p.propuesta, b)
  const clasificacion = propuesta.clasificacion ?? propuesta.borrador
  const evidencia = clasificacion.choke?.valor === 'reservorio' ? clasificacion.choke.porque?.evidencia : undefined
  const r: ParadaAnh = { ...p, propuesta, clasificacion, estado: propuesta.estado, faltan: propuesta.faltan }
  if (evidencia) r.evidenciaYacimiento = evidencia
  else delete r.evidenciaYacimiento
  return r
}

/** El toque «Confirmar» de una persona sobre una fila (confirmación por paso, P1 §1.3). */
export const confirmarParada = (p: ParadaAnh, rol: string, quien: Persona, hora: string): ParadaAnh =>
  conClasificacion(p, confirmarPasos(p.clasificacion, rol, quien, hora))

/* ─────────────────────────── confirmación en lote ─────────────────────────── */

/** Qué se mostró y qué se confirmó de una vez (P1 §1.3; U1 P-10). */
export interface ConfirmacionLote {
  id: string
  porId: string
  por: string
  hora: string
  /** `ParadaAnh.id` de cada fila del lote. */
  paradas: string[]
  /** La cadena de 6 pasos que vio, en códigos internos. */
  cadena: string
  /** Los pasos que subió a confirmado según su rol (y la regla «una señal apunta»). */
  pasos: PasoAnh[]
}

/** La confirmación en lote es de quien firma el día: supervisión o producción (U1 §2.4; P1 §2.1). */
export const CONFIRMAN_EN_LOTE: readonly string[] = ['sup', 'prod']

/** Las filas con la misma cadena de 6 pasos, para confirmarlas de una vez
 *  («Confirmar las 9», U1 §2.2). Las que tienen pasos en falta no se agrupan. */
export function gruposPorCadena(ps: readonly ParadaAnh[]): Map<string, ParadaAnh[]> {
  const m = new Map<string, ParadaAnh[]>()
  for (const p of ps) {
    const k = cadenaDe(p.clasificacion)
    if (!k) continue
    const g = m.get(k)
    if (g) g.push(p); else m.set(k, [p])
  }
  return m
}

/** Confirma de una vez las filas de una misma cadena (una cascada, un grupo
 *  del cierre del día). Cambiar algo de una fila la saca del lote (P1 §2.1). */
export function confirmarLote(ps: readonly ParadaAnh[], rol: string, quien: Persona, hora: string, id: string): { lote: ConfirmacionLote; paradas: ParadaAnh[] } {
  if (!CONFIRMAN_EN_LOTE.includes(rol)) throw new Error('Su rol no confirma en lote: lo hace supervisión o producción.')
  const cadenas = new Set(ps.map(p => cadenaDe(p.clasificacion)))
  const cadena = [...cadenas][0]
  if (!ps.length || cadenas.size !== 1 || !cadena) throw new Error('Un lote es de filas con la misma cadena completa de 6 pasos: confírmelas por grupo.')
  const paradas = ps.map(p => conClasificacion(p, confirmarPasos(p.clasificacion, rol, quien, hora, id)))
  const subio = new Set<PasoAnh>()
  for (const p of paradas) for (const paso of PASOS) if (p.clasificacion[paso]?.lote === id) subio.add(paso)
  const pasos = (PASOS_QUE_CONFIRMA[rol] ?? []).filter(x => subio.has(x))
  return { lote: { id, porId: quien.id, por: quien.nombre, hora, paradas: ps.map(p => p.id), cadena, pasos }, paradas }
}

/* ───────────────────────────── la conciliación ───────────────────────────── */

export interface ConciliacionAnh {
  /** Σ de la diferida del libro en las filas. */
  total: number
  /** Por N1; lo que todavía no tiene N1 va a «sin-causa». */
  porN1: Record<string, number>
  /** Por `TipoCausa` de TRIM. */
  porTipo: Record<string, number>
  /** Σ por N1 = Σ por `TipoCausa` = total: el mismo volumen agrupado de dos formas (P1 §2.3). */
  cuadra: boolean
}

/** La conciliación de un período (P1 §2.3, invariante probado). */
export function conciliarAnh(ps: readonly ParadaAnh[]): ConciliacionAnh {
  const porN1: Record<string, number> = {}, porTipo: Record<string, number> = {}
  let total = 0
  for (const p of ps) {
    const k = p.clasificacion.n1?.valor ?? 'sin-causa'
    porN1[k] = (porN1[k] ?? 0) + p.diferidaTrimBbl
    porTipo[p.causa.tipo] = (porTipo[p.causa.tipo] ?? 0) + p.diferidaTrimBbl
    total += p.diferidaTrimBbl
  }
  const suma = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0)
  const tol = 1e-6 * Math.max(1, Math.abs(total))
  return { total, porN1, porTipo, cuadra: Math.abs(suma(porN1) - total) <= tol && Math.abs(suma(porTipo) - total) <= tol }
}
