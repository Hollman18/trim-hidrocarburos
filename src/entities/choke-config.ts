/** Lo que cambia la configuración del modelo choke, antes de firmarla:
 *  - las RESPUESTAS de la filosofía operacional (U2 §8.2): «¿A qué pozos sirve
 *    este equipo?», el elemento que sale de cada respuesta, la topología del
 *    borrador encima de la configuración, «Todavía no sé» (el equipo queda por
 *    saber y TRIM no adivina su tramo) y la regla de la primera firma (la
 *    topología de un campo se firma completa: TRIM propone, no firma solo);
 *  - la VISTA PREVIA del impacto de una versión nueva (U2 §8.5 y §11.1,
 *    `ImpactoConfig`): qué limita hoy, qué equipos cambian en «si falla hoy» y
 *    cuántas paradas cambiarían de tramo, con las ya confirmadas aparte, que
 *    no cambian solas;
 *  - la LECTURA de la topología desde un CSV o un pegado de Excel (U2 §8.3,
 *    carga masiva): «equipo; pozos a los que sirve», con lo que bloquea dicho
 *    por fila, y la PLANTILLA que se descarga para llenarla.
 *  No cambia el motor del choke (`choke.ts`) ni el árbol (`anh-*.ts`): los corre
 *  con la configuración de hoy y con la nueva y compara. Las reglas son de los
 *  dos lados (el front avisa, el servidor decide): `POST
 *  /api/configuracion/vista-previa` y `POST /api/topologia/importar`. Las
 *  pantallas solo dicen en palabras lo que sale de aquí. */
import {
  topologiaDerivada, chokeDeCausa, chokeDeAlcance, alcancePorPozos, casoBordeDe, potencialesDelCampo,
  NOMBRE_CHOKE, NOMBRE_CHOKE_CAMPO, DONDE_CHOKE, PREGUNTA_ORIGEN, n0,
  type ChokeAnh, type ChokeCampo, type ChokeDeElemento, type AlcanceElemento, type ElementoPorSaber,
} from './choke'
import { criticidadDelCampo, type FilaCriticidad } from './criticidad'
import { filasDelChoke } from './choke-reparto'
import { esDePersona, type BorradorClasificacion } from './anh-clasificacion'
import { pozosDe } from './pozos'
import { EQUIPOS, equipoEnCampo } from './equipos'
import { calendario } from './libro'
import { campoPorId } from './campos'
import { AHORA, fechaCorta } from './reloj'
import type { Contexto } from './causa-senal'
import type { Config } from './configuracion'

/* ─────────────────── las respuestas de la filosofía operacional ─────────────────── */

/** Las respuestas posibles a «¿A qué pozos sirve este equipo?», en el orden de
 *  U2 §8.2. El administrador contesta un HECHO y TRIM deduce el tramo con el
 *  criterio único de Edinson (dedicado = pozo, compartido = planta;
 *  CHOKE-COMPLETO §2): nadie escoge «pozo» o «planta». */
export type RespuestaTopologia = 'uno' | 'varios' | 'todos' | 'tercero' | 'frontera' | 'acometida' | 'no-se'
export const RESPUESTAS_TOPOLOGIA: readonly RespuestaTopologia[] = ['uno', 'varios', 'todos', 'tercero', 'frontera', 'acometida', 'no-se']

/** Lo contestado de un equipo: la respuesta y el elemento que queda en la
 *  topología del borrador. `elemento: null` es «Todavía no sé»: el equipo sale
 *  de la topología y queda firmado como por saber (`Config.topologiaPorSaber`). */
export interface RespuestaEquipo { r: RespuestaTopologia; elemento: ChokeDeElemento | null }

/** Lo que el borrador lleva de la topología de un campo: la que regía cuando
 *  se empezó a contestar (la firmada, o la que TRIM deduce del registro) y lo
 *  contestado encima, por elemento. */
export interface TopologiaEnBorrador {
  base: ChokeDeElemento[]
  /** La que regía era la firmada (true) o la deducida del registro (false). */
  firmada: boolean
  respuestas: Record<string, RespuestaEquipo>
}

/** «LC-01, LC-02 y LC-03». */
const lista = (xs: readonly string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}`)

/** ¿Sirve a todos los pozos del campo? */
const aTodos = (pozos: readonly string[] | undefined, todos: readonly string[]) =>
  todos.length > 1 && todos.every(p => (pozos ?? []).includes(p))

/** «en el pozo», «en la planta o estación», «afuera», «en el yacimiento»: las palabras de U2 §1.1. */
export const dondeTramo = (k: ChokeAnh): string => {
  const t = NOMBRE_CHOKE[k].split(':')[0]!
  return `${t[0]!.toLowerCase()}${t.slice(1)}`
}
/** Lo mismo, corto, para el renglón de la lista: «en el pozo», «en la planta», «afuera». */
export const dondeCorto = (k: ChokeAnh): string => (k === 'exportacion' ? 'afuera' : DONDE_CHOKE[k])

/** El elemento que sale de una respuesta. El alcance lo deduce TRIM del hecho
 *  (uno, varios, otro dueño, la brida de salida) y el tramo, del alcance; el
 *  caso de borde (2 o 3 pozos de una misma locación) lo marca la misma regla
 *  de la carga por CSV. Lo de otro dueño, la frontera y la acometida sirven a
 *  todo el campo, como en la carga (`leerTopologia`). «Todavía no sé»: null. */
export function elementoDeRespuesta(elemento: string, campoId: string, r: RespuestaTopologia, pozos: readonly string[],
  todos: readonly string[], locacion: (pozo: string) => string | undefined): ChokeDeElemento | null {
  if (r === 'no-se') return null
  const escogidos = new Set(pozos)
  const servidos = r === 'uno' || r === 'varios' ? todos.filter(p => escogidos.has(p)) : [...todos]
  const alcance = r === 'tercero' ? 'tercero' : r === 'frontera' ? 'frontera' : alcancePorPozos(servidos)
  const e: ChokeDeElemento = { elemento, campoId, alcance, choke: chokeDeAlcance(alcance), pozos: servidos }
  const borde = casoBordeDe(e, locacion)
  return borde ? { ...e, casoBorde: borde } : e
}

/** La respuesta que corresponde a un elemento que ya rige (o que TRIM deduce
 *  del registro): es la que la pregunta muestra marcada. La de unos pozos que
 *  una propuesta nombra sale igual: uno, varios o todos. */
export function respuestaDe(e: Pick<ChokeDeElemento, 'alcance' | 'pozos'>, todos: readonly string[]): { r: RespuestaTopologia; pozos: string[] } {
  if (e.alcance === 'tercero' || e.alcance === 'frontera') return { r: e.alcance, pozos: [] }
  const ps = [...new Set(e.pozos ?? [])]
  if (e.alcance === 'dedicado') return { r: 'uno', pozos: ps.slice(0, 1) }
  return aTodos(ps, todos) ? { r: 'todos', pozos: ps } : { r: 'varios', pozos: ps }
}
/** La respuesta de los pozos que nombra una propuesta: uno, varios o todos. */
export const respuestaDePozos = (pozos: readonly string[], todos: readonly string[]) => respuestaDe({ alcance: alcancePorPozos(pozos), pozos: [...pozos] }, todos)

/** La frase que se muestra al instante (U2 §8.2). Con «Todavía no sé», lo que
 *  hace el motor: el equipo queda sin tramo y sus paradas lo preguntan. */
export function fraseDe(r: RespuestaTopologia, e: ChokeDeElemento | null, todos: readonly string[]): string {
  if (!e) return `Mientras no se sepa, TRIM no adivina: sus paradas quedan sin tramo y en Identificar cada una pregunta «${PREGUNTA_ORIGEN}».`
  const donde = `Si para, se traba ${dondeTramo(e.choke)}`
  if (r === 'acometida') return `${donde}. Quién respondió (el proveedor o nosotros) se pregunta en cada parada.`
  if (e.choke === 'exportacion') return `${donde}.`
  const ps = [...new Set(e.pozos ?? [])]
  if (e.choke === 'pozo') return `${donde}: es solo de ${ps[0] ?? 'un pozo'}.`
  return `${donde}: sirve a ${aTodos(ps, todos) ? `los ${n0(ps.length)} pozos` : `${n0(ps.length)} pozos`}.`
}

/** Lo que TRIM deduce, en un renglón de la lista (U2 §8.2):
 *  «sirve a todo el campo (18 pozos) → se traba en la planta». Sin elemento:
 *  «por saber» (contestado «Todavía no sé») o sin responder todavía. */
export function renglonDe(e: ChokeDeElemento | null, r: RespuestaTopologia | undefined, todos: readonly string[]): string {
  if (!e) return r === 'no-se' ? 'todavía no se sabe: sus paradas quedan sin tramo hasta que se diga' : 'sin responder: el tramo de sus paradas sale de la regla por tipo de falla'
  const tramo = `→ se traba ${dondeCorto(e.choke)}`
  if (e.alcance === 'tercero') return `de otro dueño, más allá de la batería ${tramo}`
  if (e.alcance === 'frontera') return `punto de entrega ${tramo}`
  const ps = [...new Set(e.pozos ?? [])]
  if (r === 'acometida') return `llegada de la energía (${n0(ps.length)} pozos) ${tramo}`
  if (e.alcance === 'dedicado') return `sirve solo a ${ps[0] ?? 'un pozo'} ${tramo}`
  if (aTodos(ps, todos)) return `sirve a todo el campo (${n0(ps.length)} pozos) ${tramo}`
  return `sirve a ${ps.length <= 3 ? lista(ps) : `${n0(ps.length)} pozos`} ${tramo}`
}

/** El elemento tal como se firma: sin el nombre ni la clase que trae la vista. */
const comoSeFirma = (e: ChokeDeElemento, campoId: string): ChokeDeElemento => ({
  elemento: e.elemento, alcance: e.alcance, choke: chokeDeAlcance(e.alcance), campoId,
  ...(e.pozos ? { pozos: [...e.pozos] } : {}), ...(e.casoBorde ? { casoBorde: e.casoBorde } : {}),
})

/** La configuración con la topología del borrador encima. Un campo cuya
 *  topología regía deducida del registro la estrena entera: si trajera solo lo
 *  contestado, el motor dejaría sin topología a los demás equipos del campo
 *  (una topología firmada manda entera, `topologiaDe`). Uno con topología
 *  firmada cambia solo lo contestado. «Todavía no sé» saca el equipo de la
 *  topología y lo firma como por saber (`topologiaPorSaber`): su tramo queda en
 *  falta, con su pregunta, hasta que se diga. Contestado de otra forma, deja de
 *  estar por saber. */
export function conTopologia(c: Config, borrador: Readonly<Record<string, TopologiaEnBorrador>>): Config {
  const campos = Object.entries(borrador).filter(([, t]) => Object.keys(t.respuestas).length > 0)
  if (!campos.length) return c
  let topo = [...(c.topologia ?? [])]
  let porSaber: ElementoPorSaber[] = [...(c.topologiaPorSaber ?? [])]
  for (const [campoId, t] of campos) {
    const respondido = (id: string) => Object.hasOwn(t.respuestas, id)
    const nuevo = (id: string) => t.respuestas[id]!.elemento
    const enBase = new Set(t.base.map(e => e.elemento))
    const extra = Object.keys(t.respuestas).filter(id => !enBase.has(id)).flatMap(id => (nuevo(id) ? [nuevo(id)!] : []))
    if (!t.firmada) {
      const delCampo = t.base.flatMap(e => (!respondido(e.elemento) ? [comoSeFirma(e, campoId)] : nuevo(e.elemento) ? [nuevo(e.elemento)!] : []))
      topo = [...topo.filter(e => e.campoId !== campoId), ...delCampo, ...extra]
    } else {
      const cambian = t.base.filter(e => respondido(e.elemento)).flatMap(e => (nuevo(e.elemento) ? [nuevo(e.elemento)!] : []))
      topo = [...topo.filter(e => !(e.campoId === campoId && respondido(e.elemento))), ...cambian, ...extra]
    }
    const noSe = Object.keys(t.respuestas).filter(id => t.respuestas[id]!.elemento === null)
    porSaber = [...porSaber.filter(x => !(x.campoId === campoId && respondido(x.elemento))), ...noSe.map(elemento => ({ elemento, campoId }))]
  }
  const { topologiaPorSaber: _antes, ...resto } = c
  return { ...resto, topologia: topo, ...(porSaber.length ? { topologiaPorSaber: porSaber } : {}) }
}

/** Lo que falta contestar en un campo antes de firmar: TRIM propone, pero no
 *  firma nada solo (U2 §8.3). Solo cuenta en un campo que estrena su topología:
 *  se firma completa, así que cada equipo tiene que tener respuesta. Con una
 *  firmada, cada equipo ya lo contestó alguien (y uno nuevo del registro espera
 *  su respuesta sin trabar la firma de lo demás). */
export function pendientesDe(t: TopologiaEnBorrador | undefined): ChokeDeElemento[] {
  if (!t || t.firmada || !Object.keys(t.respuestas).length) return []
  return t.base.filter(e => !Object.hasOwn(t.respuestas, e.elemento))
}
/** La regla de la primera firma, en palabras: un renglón por campo con equipos sin contestar. */
export function faltanParaFirmar(borrador: Readonly<Record<string, TopologiaEnBorrador>>): string[] {
  return Object.entries(borrador).flatMap(([id, t]) => {
    const n = pendientesDe(t).length
    return n ? [`${campoPorId(id).nombre}: ${n === 1 ? 'un equipo queda' : `${n0(n)} equipos quedan`} sin contestar en la filosofía operacional. TRIM propone, pero no firma nada solo: contéstelos o acéptelos por tipo.`] : []
  })
}

/* ───────────────────────── la vista previa ───────────────────────── */

/** Un equipo cuyo «si falla hoy» cambia con la versión nueva. */
export interface CambioCriticidad {
  equipo: string
  nombre: string
  /** bbl/d si falla hoy, antes y después; null: sin dato (o el equipo no está en esa versión). */
  antes: number | null
  despues: number | null
  /** Dónde se trabaría si falla, antes y después. */
  tramoAntes: ChokeAnh | null
  tramoDespues: ChokeAnh | null
}

/** Cuántas paradas pasan de un tramo a otro. */
export interface CambioDeTramo { de: ChokeAnh | null; a: ChokeAnh | null; paradas: number }

/** Lo que cambia en un campo si se firma la versión nueva (U2 §8.5). */
export interface ImpactoCampo {
  campoId: string
  /** Lo que limita hoy con la versión vigente y con la nueva (null: sin tubería de crudo). */
  limitaAntes: ChokeCampo | null
  limitaDespues: ChokeCampo | null
  /** Solo los equipos cuyo «si falla hoy» o cuyo tramo cambian. */
  criticidad: CambioCriticidad[]
  /** Las paradas del período de la vista previa cuyo tramo propuesto cambia.
   *  `confirmadas`: de esas, las que una persona ya dijo o confirmó: no cambian
   *  solas, quedan para revisar en Identificar. */
  paradasQueCambian: { total: number; confirmadas: number; porTramo: CambioDeTramo[] }
  /** Lo mismo dicho en renglones, como lo pinta la pantalla (U2 §8.5). */
  texto: string[]
}

export interface ImpactoConfig {
  /** Las paradas que se miran: desde el primer día del tercer mes cerrado antes del actual, hasta ahora. */
  desde: Date
  hasta: Date
  campos: ImpactoCampo[]
}

/** «los pozos», «la planta o estación», «afuera». */
const sujeto = (k: ChokeCampo | null) => (k === null ? 'sin tubería de crudo' : NOMBRE_CHOKE_CAMPO[k].split(':')[0]!.toLowerCase())
/** «el pozo», «la planta o estación», «afuera», «sin tramo». */
const tramoTexto = (k: ChokeAnh | null) => (k === null ? 'sin tramo' : NOMBRE_CHOKE[k].replace(/^En /, '').split(':')[0]!.toLowerCase())
const bpd = (v: number | null) => (v === null ? 'sin dato' : `${n0(v)} bbl/d`)

/** Las filas de «si falla hoy» de un campo, ya paradas o no, por equipo. */
const filasDe = (campoId: string, ctx: Contexto): Map<string, FilaCriticidad> => {
  const c = criticidadDelCampo(campoId, ctx)
  return new Map([...c.ranking, ...c.parados].map(f => [f.equipo, f]))
}

/** Lo que cambiaría en cada campo si se firmara `nueva` en vez de la
 *  configuración de `ctx` (U2 §8.5, `ImpactoConfig`). `guardadas` es lo que ya
 *  dijeron las personas en la clasificación (por fila o por evento, como en
 *  `paradasAnh`): una parada cuyo paso 2 lo dijo o lo confirmó una persona no
 *  cambia sola. La topología no mueve barriles: el libro es el mismo con las dos. */
export function impactoConfig(ctx: Contexto, nueva: Config, campoIds: string[], guardadas?: ReadonlyMap<string, BorradorClasificacion>): ImpactoConfig {
  const despues: Contexto = { ...ctx, config: nueva }
  const cal = calendario()
  const desde = new Date(cal[Math.max(0, cal.length - 4)]!.desde), hasta = AHORA
  const t = AHORA.getTime()
  const campos = campoIds.map((campoId): ImpactoCampo => {
    const limitaAntes = potencialesDelCampo(campoId, t, ctx).dominante, limitaDespues = potencialesDelCampo(campoId, t, despues).dominante
    const fa = filasDe(campoId, ctx), fd = filasDe(campoId, despues)
    const criticidad = [...new Set([...fa.keys(), ...fd.keys()])].flatMap((equipo): CambioCriticidad[] => {
      const a = fa.get(equipo), d = fd.get(equipo)
      if (a && d && a.bpd === d.bpd && a.tramo === d.tramo) return []
      return [{ equipo, nombre: (d ?? a)!.nombre, antes: a?.bpd ?? null, despues: d?.bpd ?? null, tramoAntes: a?.tramo ?? null, tramoDespues: d?.tramo ?? null }]
    }).sort((x, y) => Math.abs((y.despues ?? 0) - (y.antes ?? 0)) - Math.abs((x.despues ?? 0) - (x.antes ?? 0)) || x.equipo.localeCompare(y.equipo))
    // Las paradas: el tramo que TRIM propondría con cada versión. La causa es la
    // misma (la topología no la cambia); solo cambia dónde se trabó.
    const porTramo = new Map<string, CambioDeTramo>()
    let total = 0, confirmadas = 0
    // Las mismas filas del reparto y del árbol, ya calculadas (QA-A-15).
    for (const p of filasDelChoke([campoId], desde, hasta, ctx, guardadas)) {
      if (p.causa.tipo === 'pendiente') continue
      const de = chokeDeCausa(p.causa, campoId, ctx)?.choke ?? null, a = chokeDeCausa(p.causa, campoId, despues)?.choke ?? null
      if (de === a) continue
      total++
      const ch = p.clasificacion.choke
      if (ch && esDePersona(ch.procedencia)) confirmadas++
      const k = `${de}|${a}`
      porTramo.set(k, { de, a, paradas: (porTramo.get(k)?.paradas ?? 0) + 1 })
    }
    const tramos = [...porTramo.values()].sort((x, y) => y.paradas - x.paradas)
    const texto = [
      `Qué limita hoy: ${sujeto(limitaAntes)} → ${sujeto(limitaDespues)}${limitaAntes === limitaDespues ? ' (no cambia)' : ''}`,
      criticidad.length
        ? `Si falla hoy: ${criticidad.map(x => `${x.equipo} ${bpd(x.antes)} → ${bpd(x.despues)}${x.tramoAntes !== x.tramoDespues ? ` (se trabaría en ${tramoTexto(x.tramoDespues)}, antes en ${tramoTexto(x.tramoAntes)})` : ''}`).join('; ')}`
        : 'Si falla hoy: no cambia ningún equipo',
      total
        ? `Dónde se trabó: ${n0(total)} ${total === 1 ? 'parada cambiaría' : 'paradas cambiarían'} de tramo desde el ${fechaCorta(desde)} (${tramos.map(x => `${n0(x.paradas)}: ${tramoTexto(x.de)} → ${tramoTexto(x.a)}`).join('; ')}).${confirmadas ? ` ${confirmadas === 1 ? 'La que ya confirmó una persona no cambia sola: queda' : `Las ${n0(confirmadas)} que ya confirmó una persona no cambian solas: quedan`} para revisar en Identificar.` : ''}`
        : `Dónde se trabó: ninguna parada cambia de tramo desde el ${fechaCorta(desde)}`,
      'El libro no cambia: la topología no mueve barriles, solo dónde se trabó cada parada',
    ]
    return { campoId, limitaAntes, limitaDespues, criticidad, paradasQueCambian: { total, confirmadas, porTramo: tramos }, texto }
  })
  return { desde, hasta, campos }
}

/* ───────────────────────── la carga masiva ───────────────────────── */

/** Algo que se encontró en una fila del archivo. Lo que bloquea no entra a la
 *  topología leída: la pantalla lo dice en la fila y no deja firmar. */
export interface HallazgoTopologia {
  /** La fila del archivo, contando desde 1 (como la numera la hoja de cálculo). */
  fila: number
  equipo?: string
  texto: string
  bloquea: boolean
}

export interface TopologiaLeida {
  campoId: string
  /** Los elementos de las filas sin nada que bloquee, con el tramo que sale de su alcance. */
  topologia: ChokeDeElemento[]
  /** Los equipos contestados «todavía no sé»: quedan por saber, sin tramo. */
  porSaber: string[]
  hallazgos: HallazgoTopologia[]
  /** Filas con datos (sin el encabezado ni las vacías). */
  filas: number
}

/** Las palabras de la columna de pozos que no son una lista de pozos (U2 §8.2). */
const TODOS_LOS_POZOS = /^(todos|todo el campo|todos los pozos)$/i
const DE_OTRO_DUENO = /^(de )?otro due[ñn]o$|^tercero$/i
const PUNTO_DE_ENTREGA = /^punto de entrega$|^frontera$|^brida de salida$/i
const TODAVIA_NO_SE = /^(todav[ií]a )?no s[eé]$|^por saber$/i

/** Las palabras de la columna de pozos en la plantilla, las mismas que lee la
 *  carga (U2 §8.3): «todos», «otro dueño», «punto de entrega» o la lista. */
export function pozosEnPlantilla(e: ChokeDeElemento, todos: readonly string[]): string {
  if (e.alcance === 'tercero') return 'otro dueño'
  if (e.alcance === 'frontera') return 'punto de entrega'
  return aTodos(e.pozos, todos) ? 'todos' : [...new Set(e.pozos ?? [])].join(' ')
}
/** La plantilla de la carga (U2 §8.3): lo que quedaría hoy, una fila por
 *  equipo, en las mismas palabras que lee `leerTopologia`; lo que está por
 *  saber dice «todavía no sé». Descargarla, cambiarla y subirla da lo mismo. */
export function plantillaTopologia(elementos: readonly ChokeDeElemento[], porSaber: readonly string[], todos: readonly string[]): string[][] {
  return [
    ['equipo', 'pozos a los que sirve'],
    ...elementos.map(e => [e.elemento, pozosEnPlantilla(e, todos)]),
    ...porSaber.map(id => [id, 'todavía no sé']),
  ]
}

/** Las celdas de una línea con su separador, respetando comillas dobles («"LC-01, LC-02"»). */
function celdas(linea: string, sep: string): string[] {
  const out: string[] = []
  let cur = '', comillas = false
  for (let i = 0; i < linea.length; i++) {
    const ch = linea[i]!
    if (ch === '"') {
      if (comillas && linea[i + 1] === '"') { cur += '"'; i++ } else comillas = !comillas
    } else if (ch === sep && !comillas) { out.push(cur); cur = '' }
    else cur += ch
  }
  out.push(cur)
  return out.map(c => c.trim())
}

/** Lee la topología de un campo desde un CSV o un pegado de Excel (U2 §8.3):
 *  dos columnas, el equipo y los pozos a los que sirve, separadas por punto y
 *  coma, tabulador o coma (la primera fila con datos decide). Los pozos van en
 *  lista (espacios, comas dentro de comillas, «/» o «+») o con una palabra:
 *  «todos», «otro dueño» (más allá de la batería), «punto de entrega» (la brida
 *  de salida) o «todavía no sé» (queda por saber, sin tramo). Un encabezado que empieza por «equipo» o «elemento» se salta.
 *  El alcance y el tramo salen del número de pozos, como en la pantalla: nadie
 *  escoge «pozo» o «planta» (U2 §8.2). Bloquea: equipo vacío o que TRIM no
 *  tiene en el registro del campo, equipo repetido, sin pozos o con un pozo
 *  que no es del campo. El caso de borde (2 o 3 pozos de una misma locación)
 *  se avisa sin bloquear. `locacionDe` da la locación de cada pozo, si se sabe. */
export function leerTopologia(texto: string, campoId: string, locacionDe?: (pozo: string) => string | undefined): TopologiaLeida {
  const nombreCampo = campoPorId(campoId).nombre
  const pozos = pozosDe(campoId).map(p => p.id)
  const pozoPorClave = new Map(pozos.map(p => [p.toUpperCase(), p]))
  // Lo que TRIM tiene del campo: los elementos de su topología derivada (pozos,
  // planta, alimentadores) y los equipos registrados en él.
  const conocidos = new Map<string, string>()
  for (const e of topologiaDerivada(campoId)) conocidos.set(e.elemento.toUpperCase(), e.elemento)
  for (const id of Object.keys(EQUIPOS)) if (equipoEnCampo(id, campoId)) conocidos.set(id.toUpperCase(), id)
  const lineas = texto.replace(/^﻿/, '').split(/\r?\n/)
  const primera = lineas.find(l => l.trim()) ?? ''
  const sep = primera.includes(';') ? ';' : primera.includes('\t') ? '\t' : ','
  const hallazgos: HallazgoTopologia[] = []
  const topologia: ChokeDeElemento[] = []
  const porSaber: string[] = []
  const vistos = new Map<string, number>()
  let filas = 0, encabezado = false
  lineas.forEach((linea, i) => {
    const fila = i + 1
    if (!linea.trim()) return
    const c = celdas(linea, sep)
    if (!filas && !encabezado && /^(equipo|elemento)/i.test(c[0] ?? '')) { encabezado = true; return }
    filas++
    const escrito = (c[0] ?? '').trim()
    const bloquea = (mensaje: string, equipo?: string) => hallazgos.push({ fila, ...(equipo ? { equipo } : {}), texto: mensaje, bloquea: true })
    if (!escrito) { bloquea(`Fila ${fila}: falta el equipo.`); return }
    const equipo = conocidos.get(escrito.toUpperCase())
    if (!equipo) { bloquea(`Fila ${fila}: ${escrito} no está en el registro de ${nombreCampo}: regístrelo primero (esquema de planta o Conectores).`, escrito); return }
    const antes = vistos.get(equipo)
    if (antes !== undefined) { bloquea(`Fila ${fila}: ${equipo} ya está en la fila ${antes}.`, equipo); return }
    vistos.set(equipo, fila)
    const resto = c.slice(1).filter(Boolean).join(' ').trim()
    if (TODAVIA_NO_SE.test(resto)) { porSaber.push(equipo); return }
    let alcance: AlcanceElemento, servidos: string[]
    if (TODOS_LOS_POZOS.test(resto)) { servidos = pozos; alcance = alcancePorPozos(servidos) }
    else if (DE_OTRO_DUENO.test(resto)) { servidos = pozos; alcance = 'tercero' }
    else if (PUNTO_DE_ENTREGA.test(resto)) { servidos = pozos; alcance = 'frontera' }
    else {
      const escritos = resto.split(/[\s,;|+/]+/).filter(Boolean)
      if (!escritos.length) { bloquea(`Fila ${fila}: diga a qué pozos sirve ${equipo}: uno, varios, «todos», «otro dueño», «punto de entrega» o «todavía no sé».`, equipo); return }
      const ajenos = escritos.filter(p => !pozoPorClave.has(p.toUpperCase()))
      if (ajenos.length) { bloquea(`Fila ${fila}: ${lista(ajenos)} ${ajenos.length === 1 ? 'no es un pozo' : 'no son pozos'} de ${nombreCampo}.`, equipo); return }
      servidos = [...new Set(escritos.map(p => pozoPorClave.get(p.toUpperCase())!))].sort()
      alcance = alcancePorPozos(servidos)
    }
    // Un pozo solo se sirve a sí mismo (C-13): lo que la firma rechaza, la carga lo dice en su fila.
    if (pozoPorClave.has(equipo.toUpperCase()) && !(alcance === 'dedicado' && servidos.length === 1 && servidos[0] === equipo)) {
      bloquea(`Fila ${fila}: ${equipo} es un pozo: solo se sirve a sí mismo (escriba «${equipo}» en sus pozos).`, equipo); return
    }
    const e: ChokeDeElemento = { elemento: equipo, choke: chokeDeAlcance(alcance), alcance, pozos: servidos, campoId }
    const borde = locacionDe ? casoBordeDe(e, locacionDe) : undefined
    if (borde) hallazgos.push({ fila, equipo, bloquea: false,
      texto: `Fila ${fila}: ${equipo} sirve a ${servidos.length} pozos de una misma locación (${lista(servidos)}): va a la planta, y queda marcado como caso de borde hasta que se confirme la regla con la operadora.` })
    topologia.push(borde ? { ...e, casoBorde: borde } : e)
  })
  if (!filas) hallazgos.push({ fila: 1, texto: 'El archivo no trae ninguna fila: va una por equipo, con «equipo; pozos a los que sirve».', bloquea: true })
  return { campoId, topologia, porSaber, hallazgos, filas }
}
