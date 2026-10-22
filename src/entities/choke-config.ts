/** Lo que cambia la configuración del modelo choke, antes de firmarla:
 *  - la VISTA PREVIA del impacto de una versión nueva (U2 §8.5 y §11.1,
 *    `ImpactoConfig`): qué limita hoy, qué equipos cambian en «si falla hoy» y
 *    cuántas paradas cambiarían de tramo, con las ya confirmadas aparte, que
 *    no cambian solas;
 *  - la LECTURA de la topología desde un CSV o un pegado de Excel (U2 §8.3,
 *    carga masiva): «equipo; pozos a los que sirve», con lo que bloquea dicho
 *    por fila.
 *  No cambia el motor del choke (`choke.ts`) ni el árbol (`anh-*.ts`): los corre
 *  con la configuración de hoy y con la nueva y compara. Las dos son reglas de
 *  los dos lados (el front avisa, el servidor decide): `POST
 *  /api/configuracion/vista-previa` y `POST /api/topologia/importar`. */
import {
  topologiaDerivada, chokeDeCausa, chokeDeAlcance, alcancePorPozos, casoBordeDe, potencialesDelCampo,
  NOMBRE_CHOKE, NOMBRE_CHOKE_CAMPO, n0,
  type ChokeAnh, type ChokeCampo, type ChokeDeElemento, type AlcanceElemento,
} from './choke'
import { criticidadDelCampo, type FilaCriticidad } from './criticidad'
import { paradasAnh } from './anh-paradas'
import { esDePersona, type BorradorClasificacion } from './anh-clasificacion'
import { pozosDe } from './pozos'
import { EQUIPOS, equipoEnCampo } from './equipos'
import { calendario } from './libro'
import { campoPorId } from './campos'
import { AHORA, fechaCorta } from './reloj'
import type { Contexto } from './causa-senal'
import type { Config } from './configuracion'

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
    for (const p of paradasAnh([campoId], desde, hasta, ctx, guardadas ? { guardadas } : {})) {
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
  hallazgos: HallazgoTopologia[]
  /** Filas con datos (sin el encabezado ni las vacías). */
  filas: number
}

/** Las palabras de la columna de pozos que no son una lista de pozos (U2 §8.2). */
const TODOS_LOS_POZOS = /^(todos|todo el campo|todos los pozos)$/i
const DE_OTRO_DUENO = /^(de )?otro due[ñn]o$|^tercero$/i
const PUNTO_DE_ENTREGA = /^punto de entrega$|^frontera$|^brida de salida$/i

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

/** «LC-01, LC-02 y LC-03». */
const lista = (xs: readonly string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}`)

/** Lee la topología de un campo desde un CSV o un pegado de Excel (U2 §8.3):
 *  dos columnas, el equipo y los pozos a los que sirve, separadas por punto y
 *  coma, tabulador o coma (la primera fila con datos decide). Los pozos van en
 *  lista (espacios, comas dentro de comillas, «/» o «+») o con una palabra:
 *  «todos», «otro dueño» (más allá de la batería) o «punto de entrega» (la brida
 *  de salida). Un encabezado que empieza por «equipo» o «elemento» se salta.
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
    let alcance: AlcanceElemento, servidos: string[]
    if (TODOS_LOS_POZOS.test(resto)) { servidos = pozos; alcance = alcancePorPozos(servidos) }
    else if (DE_OTRO_DUENO.test(resto)) { servidos = pozos; alcance = 'tercero' }
    else if (PUNTO_DE_ENTREGA.test(resto)) { servidos = pozos; alcance = 'frontera' }
    else {
      const escritos = resto.split(/[\s,;|+/]+/).filter(Boolean)
      if (!escritos.length) { bloquea(`Fila ${fila}: diga a qué pozos sirve ${equipo}: uno, varios, «todos», «otro dueño» o «punto de entrega».`, equipo); return }
      const ajenos = escritos.filter(p => !pozoPorClave.has(p.toUpperCase()))
      if (ajenos.length) { bloquea(`Fila ${fila}: ${lista(ajenos)} ${ajenos.length === 1 ? 'no es un pozo' : 'no son pozos'} de ${nombreCampo}.`, equipo); return }
      servidos = [...new Set(escritos.map(p => pozoPorClave.get(p.toUpperCase())!))].sort()
      alcance = alcancePorPozos(servidos)
    }
    const e: ChokeDeElemento = { elemento: equipo, choke: chokeDeAlcance(alcance), alcance, pozos: servidos, campoId }
    const borde = locacionDe ? casoBordeDe(e, locacionDe) : undefined
    if (borde) hallazgos.push({ fila, equipo, bloquea: false,
      texto: `Fila ${fila}: ${equipo} sirve a ${servidos.length} pozos de una misma locación (${lista(servidos)}): va a la planta, y queda marcado como caso de borde hasta que Edinson confirme la regla.` })
    topologia.push(borde ? { ...e, casoBorde: borde } : e)
  })
  if (!filas) hallazgos.push({ fila: 1, texto: 'El archivo no trae ninguna fila: va una por equipo, con «equipo; pozos a los que sirve».', bloquea: true })
  return { campoId, topologia, hallazgos, filas }
}
