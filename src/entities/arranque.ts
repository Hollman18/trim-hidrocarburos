/** EL RE-ARRANQUE GUIADO Y EL MARGEN DE GENERACIÓN (Fase 6 de docs/experiencia-v3/PROMPT-FACILIDADES-POR-FASES.md;
 *  investigación ~/TRIM-petroleras/investigacion/19, §4.1 y §6.3: R1, R2, A1 y A2).
 *
 *  Después de un apagón, re-arrancar es lento por razones con fuente (19 §4.1): la generación no toma toda
 *  la carga de golpe, cada motor admite pocos arranques seguidos, una electrosumergible que gira al revés
 *  no se puede arrancar y, si el crudo no fluye, arrancar pozos no sirve. TRIM **sugiere y registra**:
 *  - `planDeArranque`: el orden de arranque por barriles, con los límites que respeta cada paso.
 *  - `incumplimientos`: el revisor del plan. Un plan que viola un límite no se muestra sin decirlo.
 *  - `cronometro`: cuánto duró cada fase (detección → causa → energía → primer pozo → 90 % → normal).
 *  - `margenN1`: si se cae la unidad de generación más cargada, ¿alcanza la reserva rápida? Si no, qué
 *    soltar primero, en barriles: la misma mochila del orden de cierre (`mochila`, libro.ts).
 *
 *  TRIM no opera interruptores ni el deslastre: eso es del relé y del PMS. Quien arranca es el operador.
 *
 *  Contrato: `GET /api/vistas/planta/arranque?campos=` y `POST /api/planta/eventos/:id/fase` (CONTRATO.md). */
import { EQUIPOS, equipoEnCampo } from './equipos'
import { pozosDe, type Pozo } from './pozos'
import { crudoAsignado, mochila } from './libro'
import { cargasDe, type Carga, type EventoPlanta, type TipoApagon, type RegistroEventoPlanta, type Quien, type Rechazo } from './evento-planta'
import type { FamiliaPlanta } from './familias-planta'

const MIN = 60_000

/* ─────────────────────────── los límites, con su fuente ─────────────────────────── */

/** Los minutos que se espera a que una electrosumergible deje de girar al revés. `[SUPUESTO]`: el variador
 *  de cada pozo lee el giro inverso; con ese dato, cada pozo tiene su espera. */
export const ESPERA_GIRO_INVERSO_MIN = 30
/** Pozos por lote cuando no hay tabla de generación (sin los kW no se sabe cuántos caben). `[SUPUESTO]`. */
export const LOTE_POZOS = 4
/** Minutos entre un lote de pozos y el siguiente: que la generación se recupere. `[SUPUESTO]`. */
export const ENTRE_LOTES_MIN = 5
/** Minutos entre un arranque de servicio y el siguiente (aire, diluyente, cada bomba). `[SUPUESTO]`. */
export const ENTRE_PASOS_MIN = 2

export interface Limite { id: string; regla: string; fuente: string }

export const LIMITES = {
  habilita: { id: 'habilita', regla: 'Primero lo que habilita todo: control, aire de instrumentos, diluyente y calentamiento. Si el crudo no fluye, arrancar pozos no sirve',
    fuente: 'Investigación 19 §6.3, R1; crudo pesado sin diluir ≈ 8.000 cSt a 30 °C (García et al., 2010)' },
  aguaAntes: { id: 'agua-antes', regla: 'Las bombas de agua van antes que los pozos: si no, el tanque de agua se llena',
    fuente: 'Investigación 19 §2.3: con las bombas paradas y los pozos produciendo, el tanque sube y hay que cerrar pozos' },
  unaALaVez: { id: 'una-a-la-vez', regla: `Un motor de servicio a la vez, ${ENTRE_PASOS_MIN} min entre uno y otro, para no sumar corrientes de arranque`,
    fuente: `[SUPUESTO] ${ENTRE_PASOS_MIN} min. Lo firma el ingeniero eléctrico` },
  arranques: { id: 'arranques', regla: 'Cada motor arranca una sola vez en este orden: venía en marcha, está caliente y admite un arranque (dos seguidos en frío). Si no arranca, no se reintenta hasta que enfríe',
    fuente: 'NEMA MG 1 §12.54 (EASA, «Safe starting of motors»)' },
  giroInverso: { id: 'giro-inverso', regla: `Una electrosumergible no arranca mientras gire al revés: se esperan ${ESPERA_GIRO_INVERSO_MIN} min desde que paró`,
    fuente: `Baker Hughes: el torque del arranque con giro inverso puede romper el eje. [SUPUESTO] los ${ESPERA_GIRO_INVERSO_MIN} min; el variador de cada pozo lo lee` },
  manual: { id: 'manual', regla: 'Arranque manual: el automático después de un corte va deshabilitado. Un arranque fallido de electrosumergible cuesta ≈ 6 h',
    fuente: 'Baker Hughes; SLB, caso del norte de África con cortes recurrentes (≈ 6 h por arranque fallido)' },
  lote: { id: 'lote', regla: `Pozos en lotes de ${LOTE_POZOS}, ${ENTRE_LOTES_MIN} min entre lotes. Sin los kW de cada pozo no se sabe cuántos caben en el escalón de la generación`,
    fuente: `[SUPUESTO] ${LOTE_POZOS} pozos y ${ENTRE_LOTES_MIN} min. Con la tabla de generación, el lote lo fija el escalón` },
  escalon: { id: 'escalon', regla: `Cada lote cabe en el escalón de toma de carga de la generación, ${ENTRE_LOTES_MIN} min entre lotes`,
    fuente: 'ISO 8528-5 (Kohler/Rehlko, «ISO 8528-5 and Generator Transient Performance»); turbinas: 10–15 % de golpe y luego 0,5 %/s (Chevron/SEL, IEEE PCIC 2016)' },
} as const satisfies Record<string, Limite>

/* ─────────────────────────── la tabla de generación ─────────────────────────── */

/** Una unidad de generación propia, del PMS o del ingeniero eléctrico. */
export interface UnidadGeneracion {
  id: string
  capacidadKw: number
  /** La carga de hoy. */
  cargaKw: number
  /** El escalón de carga que acepta de golpe, como fracción de su capacidad (su clase ISO 8528-5 o el fabricante). */
  escalon: number
}

/** Una carga de la planta con sus kW. Un pozo cuelga su crudo (TRIM lo sabe); lo demás se trata como
 *  esencial (no se suelta) salvo que la tabla diga lo contrario. */
export interface CargaKw { equipo: string; kw: number; esencial?: boolean }

/** La tabla que hace falta para el escalón y el margen N-1. El demo no la tiene: ningún campo trae
 *  generación propia instrumentada. */
export interface TablaGeneracion { campoId: string; unidades: UnidadGeneracion[]; cargas: CargaKw[]; fuente: string }

/* ─────────────────────────── el orden de arranque ─────────────────────────── */

export type FaseArranque = 'habilita' | 'agua' | 'pozos' | 'despacho'
const ORDEN_FASE: Readonly<Record<FaseArranque, number>> = { habilita: 0, agua: 1, pozos: 2, despacho: 3 }

export interface PasoArranque {
  n: number
  fase: FaseArranque
  que: string
  equipos: string[]
  /** Desde cuándo se puede: minutos desde que vuelve la energía. */
  minuto: number
  /** Con tabla de generación: los kW que toma el paso. */
  kw?: number
  /** El crudo que vuelve con este paso y el acumulado. */
  bblDia: number
  acumBblDia: number
  limites: Limite[]
}

export interface PlanArranque {
  eventoId: string
  campoId: string
  tipo: TipoApagon
  pasos: PasoArranque[]
  /** El crudo que vuelve con todo el orden. */
  bblDia: number
  /** El número del paso con el que vuelve el 90 % del crudo. */
  noventa?: number
  /** Cómo se ordenaron los pozos. */
  criterio: string
  /** Con tabla: pozos sin sus kW (no se pueden ordenar por kW) y pozos que no caben en la generación. */
  sinKw: string[]
  sinCaber: string[]
  conTabla: boolean
  /** La hora desde la que cuentan los minutos: la energía restablecida, si ya se marcó. */
  t0: number
}

const FAMILIAS_HABILITA: readonly FamiliaPlanta[] = ['bomba-diluyente', 'tratador']

/** Los equipos de un campo de una familia (del registro, no ids fijos). */
const deFamilia = (campoId: string, familias: readonly FamiliaPlanta[]) =>
  Object.values(EQUIPOS).filter(e => e.familia && familias.includes(e.familia) && equipoEnCampo(e.id, campoId)?.instrumentado)

/** El orden de arranque de un evento. `t0`: cuándo volvió la energía (o, si no ha vuelto, desde cuándo se
 *  planea). Sin tabla de generación, los pozos van en lotes fijos y por más crudo primero; con ella, por
 *  más crudo por kW, y cada lote cabe en el escalón. */
export function planDeArranque(ev: EventoPlanta, t0: number, tabla?: TablaGeneracion): PlanArranque {
  // Sin datos del sitio no se sabe qué paró: se planea como si hubiera parado todo (el total).
  const paradas: Carga[] = ev.deteccion === 'silencio-gateway' ? cargasDe(ev.campoId).map(c => ({ ...c, paroEn: ev.inicio.getTime() })) : ev.paradas
  const total = ev.tipo === 'total'
  const kwDe = new Map(tabla?.cargas.map(c => [c.equipo, c.kw]))
  const pasos: PasoArranque[] = []
  let minuto = 0
  const servicio = (fase: FaseArranque, que: string, equipos: string[], limites: Limite[]) => {
    const kw = tabla ? equipos.reduce((a, e) => a + (kwDe.get(e) ?? 0), 0) : undefined
    pasos.push({ n: pasos.length + 1, fase, que, equipos, minuto, ...(kw !== undefined ? { kw } : {}), bblDia: 0, acumBblDia: 0, limites })
    minuto += ENTRE_PASOS_MIN
  }

  // 1 · Lo que habilita todo.
  if (total) {
    const ups = deFamilia(ev.campoId, ['ups']).map(e => e.id)
    servicio('habilita', 'Control y comunicaciones: SCADA, radios y gateway', ups, [LIMITES.habilita])
  }
  for (const c of paradas.filter(x => x.familia === 'aire'))
    servicio('habilita', `Aire de instrumentos (${c.equipo})`, [c.equipo], [LIMITES.habilita, LIMITES.arranques, LIMITES.unaALaVez])
  if (total) for (const e of deFamilia(ev.campoId, FAMILIAS_HABILITA))
    servicio('habilita', `${e.nombre} (${e.id})`, [e.id], [LIMITES.habilita, LIMITES.arranques, LIMITES.unaALaVez])

  // 2 · El agua, una bomba a la vez.
  for (const c of paradas.filter(x => x.familia === 'bomba-agua'))
    servicio('agua', `Bomba de agua ${c.equipo}`, [c.equipo], [LIMITES.aguaAntes, LIMITES.arranques, LIMITES.unaALaVez])
  if (total) for (const e of deFamilia(ev.campoId, ['torre-enfriamiento']))
    servicio('agua', `${e.nombre} (${e.id})`, [e.id], [LIMITES.aguaAntes, LIMITES.arranques, LIMITES.unaALaVez])

  // 3 · Los pozos, por lotes.
  const paroDe = new Map(paradas.map(c => [c.equipo, c.paroEn ?? ev.inicio.getTime()]))
  const parados = new Set(paradas.filter(c => c.familia === 'pozo').map(c => c.equipo))
  const pozos = pozosDe(ev.campoId).filter(p => parados.has(p.id))
  const crudo = (p: Pozo) => crudoAsignado(p, ev.inicio.getTime())
  const sinKw = tabla ? pozos.filter(p => !kwDe.has(p.id)).map(p => p.id) : []
  const ordenables = pozos.filter(p => !sinKw.includes(p.id))
  const porKw = (p: Pozo) => crudo(p) / Math.max(1, kwDe.get(p.id) ?? 0)
  const orden = [...ordenables].sort((a, b) => (tabla ? porKw(b) - porKw(a) : crudo(b) - crudo(a)) || a.id.localeCompare(b.id))
  const lotes: Pozo[][] = []
  const sinCaber: string[] = []
  if (tabla) {
    const escalonKw = tabla.unidades.reduce((a, u) => a + u.capacidadKw * u.escalon, 0)
    const capacidadKw = tabla.unidades.reduce((a, u) => a + u.capacidadKw, 0)
    let cargaKw = pasos.reduce((a, x) => a + (x.kw ?? 0), 0)
    let lote: Pozo[] = [], loteKw = 0
    for (const p of orden) {
      const kw = kwDe.get(p.id)!
      if (kw > escalonKw || cargaKw + kw > capacidadKw) { sinCaber.push(p.id); continue }
      if (loteKw + kw > escalonKw) { lotes.push(lote); lote = []; loteKw = 0 }
      lote.push(p); loteKw += kw; cargaKw += kw
    }
    if (lote.length) lotes.push(lote)
  } else for (let i = 0; i < orden.length; i += LOTE_POZOS) lotes.push(orden.slice(i, i + LOTE_POZOS))
  for (const [i, lote] of lotes.entries()) {
    // La espera del giro inverso cuenta desde que paró cada electrosumergible, no desde que volvió la energía.
    const giro = lote.filter(p => p.levantamiento === 'electrosumergible')
      .reduce((a, p) => Math.max(a, Math.ceil((paroDe.get(p.id)! + ESPERA_GIRO_INVERSO_MIN * MIN - t0) / MIN)), 0)
    const empieza = Math.max(minuto, giro)
    const bbl = lote.reduce((a, p) => a + crudo(p), 0)
    const kw = tabla ? lote.reduce((a, p) => a + kwDe.get(p.id)!, 0) : undefined
    pasos.push({
      n: pasos.length + 1, fase: 'pozos', que: `Lote ${i + 1} de pozos: ${lote.map(p => p.id).join(', ')}`, equipos: lote.map(p => p.id), minuto: empieza,
      ...(kw !== undefined ? { kw } : {}), bblDia: bbl, acumBblDia: 0,
      limites: [LIMITES.arranques, ...(giro ? [LIMITES.giroInverso, LIMITES.manual] : []), tabla ? LIMITES.escalon : LIMITES.lote],
    })
    minuto = empieza + ENTRE_LOTES_MIN
  }

  // 4 · El despacho, cuando ya hay crudo que mandar.
  if (total) for (const e of deFamilia(ev.campoId, ['bomba-transferencia']))
    servicio('despacho', `${e.nombre} (${e.id})`, [e.id], [LIMITES.arranques])

  let acum = 0
  for (const x of pasos) { acum += x.bblDia; x.acumBblDia = acum }
  const noventa = acum > 0 ? pasos.find(x => x.acumBblDia >= 0.9 * acum - 1e-9)?.n : undefined
  return {
    eventoId: ev.id, campoId: ev.campoId, tipo: ev.tipo, pasos, bblDia: acum, ...(noventa ? { noventa } : {}),
    criterio: tabla ? 'Primero los pozos que más crudo dan por kW' : 'Primero los pozos que más crudo dan (sin los kW de cada pozo)',
    sinKw, sinCaber, conTabla: !!tabla, t0,
  }
}

/** El revisor del plan: cada límite que el orden viola, en palabras. Vacío = respeta todos. */
export function incumplimientos(plan: PlanArranque, ev: EventoPlanta, tabla?: TablaGeneracion): string[] {
  const out: string[] = []
  const vistos = new Map<string, number>()
  for (const x of plan.pasos) for (const e of x.equipos) {
    if (vistos.has(e)) out.push(`${e} arranca dos veces (pasos ${vistos.get(e)} y ${x.n}): NEMA MG 1 admite un arranque en caliente`)
    vistos.set(e, x.n)
  }
  for (const [a, b] of plan.pasos.slice(1).map((x, i) => [plan.pasos[i]!, x] as const)) {
    if (ORDEN_FASE[b.fase] < ORDEN_FASE[a.fase]) out.push(`El paso ${b.n} (${b.fase}) va después de ${a.n} (${a.fase})`)
    if (b.minuto < a.minuto) out.push(`El paso ${b.n} empieza antes que el ${a.n}`)
    if (b.fase !== 'pozos' && b.minuto - a.minuto < ENTRE_PASOS_MIN) out.push(`Entre los pasos ${a.n} y ${b.n} hay menos de ${ENTRE_PASOS_MIN} min`)
    if (a.fase === 'pozos' && b.fase === 'pozos' && b.minuto - a.minuto < ENTRE_LOTES_MIN) out.push(`Entre los lotes de los pasos ${a.n} y ${b.n} hay menos de ${ENTRE_LOTES_MIN} min`)
  }
  for (const x of plan.pasos.filter(p => p.fase !== 'pozos'))
    if (x.equipos.length > 1) out.push(`El paso ${x.n} arranca ${x.equipos.length} motores de servicio a la vez`)
  const paro = new Map(ev.paradas.map(c => [c.equipo, c.paroEn ?? ev.inicio.getTime()]))
  const pozos = new Map(pozosDe(ev.campoId).map(p => [p.id, p]))
  for (const x of plan.pasos.filter(p => p.fase === 'pozos')) for (const e of x.equipos) {
    if (pozos.get(e)?.levantamiento !== 'electrosumergible') continue
    const desde = paro.get(e) ?? ev.inicio.getTime()
    if (plan.t0 + x.minuto * MIN < desde + ESPERA_GIRO_INVERSO_MIN * MIN) out.push(`${e} arranca a los ${x.minuto} min, antes de que pare el giro inverso`)
  }
  const kwDe = new Map(tabla?.cargas.map(c => [c.equipo, c.kw]))
  const escalonKw = tabla?.unidades.reduce((a, u) => a + u.capacidadKw * u.escalon, 0) ?? 0
  const capacidadKw = tabla?.unidades.reduce((a, u) => a + u.capacidadKw, 0) ?? 0
  let carga = 0
  for (const x of plan.pasos) {
    const kw = x.equipos.reduce((a, e) => a + (kwDe.get(e) ?? 0), 0)
    carga += kw
    if (tabla && x.fase === 'pozos' && kw > escalonKw + 1e-9) out.push(`El paso ${x.n} toma ${kw} kW, más que el escalón de la generación (${escalonKw} kW)`)
    if (!tabla && x.fase === 'pozos' && x.equipos.length > LOTE_POZOS) out.push(`El lote del paso ${x.n} tiene ${x.equipos.length} pozos (el lote es de ${LOTE_POZOS})`)
  }
  if (tabla && carga > capacidadKw + 1e-9) out.push(`El orden suma ${carga} kW y la generación da ${capacidadKw} kW`)
  const lotes = plan.pasos.filter(p => p.fase === 'pozos')
  const pozo = (id: string) => pozos.get(id)!
  const clave = (id: string) => crudoAsignado(pozo(id), ev.inicio.getTime()) / (tabla ? Math.max(1, kwDe.get(id) ?? 0) : 1)
  const seguidos = lotes.flatMap(x => x.equipos).filter(id => pozos.has(id))
  for (let i = 1; i < seguidos.length; i++)
    if (clave(seguidos[i]!) > clave(seguidos[i - 1]!) + 1e-9) out.push(`${seguidos[i]} va después de ${seguidos[i - 1]} y da más crudo${tabla ? ' por kW' : ''}`)
  return out
}

/* ─────────────────────────── el cronómetro por fases ─────────────────────────── */

/** Las fases que marca el supervisor. La detección no se marca: es la hora del evento. */
export type FaseCronometro = 'causa' | 'energia' | 'primer-pozo' | 'noventa' | 'normal'
export const NOMBRE_FASE: Readonly<Record<'deteccion' | FaseCronometro, string>> = {
  deteccion: 'Detección', causa: 'Causa identificada', energia: 'Energía restablecida', 'primer-pozo': 'Primer pozo arriba',
  noventa: '90 % de la producción', normal: 'Producción normal',
}

/** Las fases de un evento: un parcial de las bombas de agua no para pozos, así que no tiene «primer pozo» ni «90 %». */
export const fasesDe = (tipo: TipoApagon): readonly FaseCronometro[] =>
  tipo === 'total' ? ['causa', 'energia', 'primer-pozo', 'noventa', 'normal'] : ['causa', 'energia', 'normal']

/** Lo que marcó el supervisor: la fase, la hora del servidor y quién. */
export interface MarcaFase { fase: FaseCronometro; hora: string; por: string }

export interface TramoCronometro {
  fase: 'deteccion' | FaseCronometro
  nombre: string
  /** La hora de la marca (la detección: el inicio del evento). */
  hora: number
  /** Lo que duró desde la marca anterior. */
  ms?: number
}

export interface Cronometro {
  tramos: TramoCronometro[]
  /** La próxima fase por marcar; undefined si ya terminó. */
  siguiente?: FaseCronometro
  /** Del evento a la última marca. */
  totalMs: number
  /** La hora en que volvió la energía, si ya se marcó. */
  energia?: number
}

export function cronometro(ev: Pick<EventoPlanta, 'tipo' | 'inicio'>, marcas: readonly MarcaFase[]): Cronometro {
  const inicio = ev.inicio.getTime()
  const tramos: TramoCronometro[] = [{ fase: 'deteccion', nombre: NOMBRE_FASE.deteccion, hora: inicio }]
  for (const m of marcas) {
    const hora = new Date(m.hora).getTime()
    tramos.push({ fase: m.fase, nombre: NOMBRE_FASE[m.fase], hora, ms: hora - tramos.at(-1)!.hora })
  }
  const siguiente = fasesDe(ev.tipo).find(f => !marcas.some(m => m.fase === f))
  const energia = marcas.find(m => m.fase === 'energia')
  return { tramos, ...(siguiente ? { siguiente } : {}), totalMs: tramos.at(-1)!.hora - inicio, ...(energia ? { energia: new Date(energia.hora).getTime() } : {}) }
}

/** «12 min», «1 h 05 min», «40 s». */
export function duracion(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return `${s} s`
  const m = Math.floor(s / 60)
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`
}

/** `POST /api/planta/eventos/:id/fase` `{ fase }`: el supervisor marca el cierre de una fase (`causa:declarar`).
 *  En orden y una sola vez: solo por inserción, como todo registro. */
export function aceptarFase(id: string, c: { fase?: unknown }, q: Quien, registros: readonly RegistroEventoPlanta[], hora: string): { ok: true; evento: RegistroEventoPlanta } | Rechazo {
  if (!q.rol?.puede['causa:declarar']) return { ok: false, estado: 403, codigo: 'sin-capacidad', error: 'Las fases del arranque las marca quien está en el campo (supervisor u operador).' }
  const r = registros.find(x => x.id === id)
  if (!r || !q.campos.includes(r.campoId) || r.terminado) return { ok: false, estado: 404, codigo: 'evento-desconocido', error: 'Ese evento ya no está abierto.' }
  const fases = fasesDe(r.tipo)
  if (typeof c.fase !== 'string' || !(fases as readonly string[]).includes(c.fase)) return { ok: false, estado: 422, codigo: 'fase-invalida', error: `La fase es una de: ${fases.join(', ')}.` }
  const marcas = r.fases ?? []
  const siguiente = fases.find(f => !marcas.some(m => m.fase === f))
  if (c.fase !== siguiente) return { ok: false, estado: 409, codigo: 'fuera-de-orden', error: siguiente ? `Primero va «${NOMBRE_FASE[siguiente]}».` : 'El arranque ya terminó.' }
  return { ok: true, evento: { ...r, fases: [...marcas, { fase: c.fase as FaseCronometro, hora, por: q.persona?.nombre ?? q.rol.nombre }] } }
}

/* ─────────────────────────── el margen N-1 y el deslastre ─────────────────────────── */

export interface Deslastre { equipo: string; kw: number; crudoBpd: number }

export interface MargenN1 {
  /** La unidad más cargada: la que se cae. */
  cae: UnidadGeneracion
  /** Lo que pueden tomar de golpe las demás: lo libre de cada una, sin pasar su escalón. */
  reservaRapidaKw: number
  /** Lo que dan las demás en régimen. */
  capacidadKw: number
  cargaKw: number
  /** Lo que hay que soltar: lo que no cubre la reserva rápida o la capacidad, lo mayor. */
  faltaKw: number
  alcanza: boolean
  /** Qué soltar primero: lo que menos crudo da por kW, carga entera (la suelta un interruptor). */
  deslastre: Deslastre[]
  crudoBpd: number
  /** Si soltar todo lo que se puede soltar tampoco alcanza. */
  noAlcanzaDeslastre: boolean
}

export function margenN1(tabla: TablaGeneracion, t: number): MargenN1 | undefined {
  if (tabla.unidades.length < 2) return undefined
  const cae = [...tabla.unidades].sort((a, b) => b.cargaKw - a.cargaKw || a.id.localeCompare(b.id))[0]!
  const otras = tabla.unidades.filter(u => u !== cae)
  const reservaRapidaKw = otras.reduce((a, u) => a + Math.max(0, Math.min(u.capacidadKw - u.cargaKw, u.capacidadKw * u.escalon)), 0)
  const capacidadKw = otras.reduce((a, u) => a + u.capacidadKw, 0)
  const cargaKw = tabla.unidades.reduce((a, u) => a + u.cargaKw, 0)
  const faltaKw = Math.max(0, cae.cargaKw - reservaRapidaKw, cargaKw - capacidadKw)
  const pozos = new Map(pozosDe(tabla.campoId).map(p => [p.id, p]))
  const crudoDe = (c: CargaKw) => { const p = pozos.get(c.equipo); return p ? crudoAsignado(p, t) : 0 }
  const candidatas = tabla.cargas.filter(c => !(c.esencial ?? !pozos.has(c.equipo)))
  const m = faltaKw > 0 ? mochila(candidatas, crudoDe, c => c.kw, faltaKw, () => 1) : { valor: 0, peso: 0, pasos: [] }
  return {
    cae, reservaRapidaKw, capacidadKw, cargaKw, faltaKw, alcanza: faltaKw <= 0,
    deslastre: m.pasos.map(x => ({ equipo: x.item.equipo, kw: x.item.kw, crudoBpd: crudoDe(x.item) })),
    crudoBpd: m.valor, noAlcanzaDeslastre: m.peso < faltaKw - 1e-9,
  }
}

const n0 = (v: number) => Math.round(v).toLocaleString('es-CO')

/** El margen en una frase, para el de energía y el supervisor. */
export function fraseMargen(m: MargenN1): string {
  const cae = `Si se cae ${m.cae.id} (la más cargada, ${n0(m.cae.cargaKw)} kW)`
  if (m.alcanza) return `${cae}, la reserva rápida alcanza: sobran ${n0(m.reservaRapidaKw - m.cae.cargaKw)} kW.`
  const pozos = m.deslastre.length
  const soltar = `hay que soltar ${pozos === 1 ? '1 carga' : `${pozos} cargas`}: ${n0(m.crudoBpd)} bbl/d. Primero lo que menos crudo da por kW`
  return `${cae}, faltan ${n0(m.faltaKw)} kW: ${soltar}${m.noAlcanzaDeslastre ? ', y ni soltando todo alcanza' : ''}.`
}

/* ─────────────────────────── la vista ─────────────────────────── */

/** `GET /api/vistas/planta/arranque?campos=` → una por evento abierto. */
export interface ArranqueVista {
  eventoId: string
  campoId: string
  plan: PlanArranque
  cronometro: Cronometro
  /** El margen N-1; `null` si el campo no tiene tabla de generación. */
  margen: MargenN1 | null
  /** Lo que falta para el escalón y el margen, en palabras. */
  falta?: string
}

export const FALTA_TABLA = 'Sin la tabla de generación y de cargas (los kW de cada unidad y de cada carga) no se puede calcular el escalón ni el margen N-1. Con ella, TRIM dice qué soltar primero, en barriles.'

export function vistaArranque(ev: EventoPlanta, marcas: readonly MarcaFase[], t: number, tabla?: TablaGeneracion): ArranqueVista {
  const crono = cronometro(ev, marcas)
  const plan = planDeArranque(ev, crono.energia ?? t, tabla)
  const margen = tabla ? margenN1(tabla, t) ?? null : null
  return { eventoId: ev.id, campoId: ev.campoId, plan, cronometro: crono, margen, ...(tabla ? {} : { falta: FALTA_TABLA }) }
}
