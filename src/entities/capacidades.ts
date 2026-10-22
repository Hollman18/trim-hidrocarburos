/** Las capacidades de los tramos de un campo: lo máximo que cada tramo deja
 *  pasar por día (U2 §8.4; CHOKE-COMPLETO §3). Con ellas se calcula lo que
 *  limita al campo (`potencialesDelCampo`, choke.ts), la tubería del agua
 *  (`tuberiaAgua`, choke-agua.ts) y «si falla hoy» de las bombas sin
 *  instrumento (criticidad.ts).
 *
 *  Son configuración FIRMADA (`Config.capacidades`), como los tanques y los
 *  respaldos: las firma el administrador con su fuente («¿de dónde sale este
 *  número?»). Lo que no se ha firmado sigue siendo el dato del demo (el esquema
 *  de planta y el tren de agua de planta.ts) y se dice así: «dato del demo, sin
 *  firmar». Lo que el demo no tiene queda «sin dato»: nunca se inventa.
 *
 *  Reglas que no se negocian:
 *  - el paso a crudo NUNCA se escribe: lo calcula TRIM con el corte de agua de
 *    las pruebas (el mismo de los pozos), porque cambia todos los días;
 *  - el tren de agua no se escribe entero: se escribe cada bomba con su límite y
 *    TRIM muestra la suma (la de reserva no suma); lo que deja pasar es lo menor
 *    entre esa suma, la admisión de los inyectores y el tratamiento;
 *  - un tramo no puede dejar pasar menos de lo que ya pasó por él (el máximo
 *    diario de los últimos 30 días del punto oficial);
 *  - dos potenciales iguales al barril se explican por escrito (NSTA §5.4): la
 *    explicación va dentro de la misma firma (`explicacionEmpate`).
 *  Este módulo no lee el libro: lo que necesita del pasado (el máximo diario,
 *  el potencial de los pozos) entra por parámetro (`EntradaRevision`); lo arma
 *  `vistaCapacidades` en choke.ts. Así la pantalla puede revisar lo que se va a
 *  firmar con la misma regla que el servidor (el front avisa, el servidor decide). */
import { CAMPO_PLANTA, TREN_AGUA, GAS_MEDIDO_EN, trenesEnCrudo } from './planta'
import { CAMPOS } from './campos'
import { MOTIVO_MINIMO, TOPE_BPD, alcanza } from './reglas'
import { fechaCorta } from './reloj'
import type { Version } from './configuracion'

/* ───────────────────────── lo que se firma ───────────────────────── */

/** De dónde sale un número (U2 §8.4, «¿De dónde sale este número?»). */
export type FuenteCapacidad = 'placa' | 'prueba' | 'contrato' | 'nominacion' | 'estimado'
export const FUENTES_CAPACIDAD: readonly FuenteCapacidad[] = ['placa', 'prueba', 'contrato', 'nominacion', 'estimado']
export const NOMBRE_FUENTE_CAPACIDAD: Record<FuenteCapacidad, string> = {
  placa: 'Placa del equipo', prueba: 'Prueba de capacidad', contrato: 'Contrato de transporte',
  nominacion: 'Nominación aceptada', estimado: 'Estimado de ingeniería',
}

/** Un número firmado: bbl/d (KPC/d en el gas) y de dónde sale. */
export interface CapacidadFirmada { bpd: number; fuente: FuenteCapacidad }

/** Las capacidades firmadas de un campo (`Config.capacidades`). Cada tramo es
 *  opcional: el que no viene sigue con el dato del demo. */
export interface CapacidadesCampo {
  campoId: string
  /** El tren de crudo de la planta, bbl/d de crudo. */
  crudo?: CapacidadFirmada
  /** Cada bomba del tren de agua con su límite, bbl/d de agua (no se escribe el total). */
  bombas?: Array<CapacidadFirmada & { equipo: string }>
  /** El tren de gas, KPC/d, y si se mide: uno sin medir no entra en lo que limita. */
  gas?: CapacidadFirmada & { medido: boolean }
  /** Afuera: el oleoducto o el transportador, bbl/d de crudo. */
  afuera?: CapacidadFirmada
  /** El cliente o la nominación aceptada: un subnivel de afuera (mercado), bbl/d de crudo. */
  mercado?: CapacidadFirmada
  /** El tratamiento de agua, bbl/d de agua. */
  tratamiento?: CapacidadFirmada
  /** Lo que admiten los pozos inyectores, bbl/d de agua (la prueba de inyectividad). */
  admision?: CapacidadFirmada
  /** Por qué dos tramos dan exactamente lo mismo, si es así (NSTA §5.4). Va con la firma. */
  explicacionEmpate?: string
}

/** Los tramos que se firman. `agua` es el tren entero: lo que dejan pasar sus bombas. */
export type TramoCapacidad = 'crudo' | 'agua' | 'gas' | 'afuera' | 'mercado' | 'tratamiento' | 'admision'
export const NOMBRE_CAPACIDAD: Record<TramoCapacidad, string> = {
  crudo: 'Tren de crudo', agua: 'Tren de agua', gas: 'Tren de gas', afuera: 'Afuera: el oleoducto o el transportador',
  mercado: 'El cliente o la nominación (mercado)', tratamiento: 'Tratamiento de agua', admision: 'Admisión de los inyectores',
}
export type UnidadCapacidad = 'bbl/d de crudo' | 'bbl/d de agua' | 'KPC/d de gas'
export const UNIDAD_CAPACIDAD: Record<TramoCapacidad, UnidadCapacidad> = {
  crudo: 'bbl/d de crudo', agua: 'bbl/d de agua', gas: 'KPC/d de gas', afuera: 'bbl/d de crudo',
  mercado: 'bbl/d de crudo', tratamiento: 'bbl/d de agua', admision: 'bbl/d de agua',
}

/* ───────────────────────── lo que rige ───────────────────────── */

/** `firmado`: lo firmó el administrador; `demo`: el dato del demo, sin firmar;
 *  `sin-dato`: el demo no lo tiene y nadie lo firmó. */
export type EstadoCapacidad = 'firmado' | 'demo' | 'sin-dato'

/** Lo que rige de un tramo, con de dónde sale dicho en palabras. */
export interface CapacidadVigente {
  tramo: TramoCapacidad
  /** bbl/d (KPC/d en el gas). Null: sin dato. */
  valor: number | null
  unidad: UnidadCapacidad
  estado: EstadoCapacidad
  /** De dónde sale, en palabras (nunca un nombre del código). */
  fuente: string
  /** La fuente que se firmó, si se firmó. */
  fuenteFirmada?: FuenteCapacidad
}

/** Una bomba del tren de agua con lo que rige de ella. */
export interface BombaVigente {
  equipo: string
  /** La cifra única de la bomba en este campo, bbl/d de agua (la firmada o la del demo). */
  valor: number
  /** La placa, solo para leer. */
  placa: number
  papel: 'disposicion' | 'recobro'
  /** De reserva: entra solo si para otra; no suma al tren. */
  reserva: boolean
  nota?: string
  estado: Exclude<EstadoCapacidad, 'sin-dato'>
  fuente: string
  fuenteFirmada?: FuenteCapacidad
}

/** Todas las capacidades que rigen en un campo. */
export interface CapacidadesVigentes {
  campoId: string
  /** Alguna capacidad del campo está firmada. */
  firmadas: boolean
  crudo: CapacidadVigente
  /** El tren de agua: lo menor entre la suma de sus bombas en servicio, la admisión y el tratamiento. */
  agua: CapacidadVigente
  bombas: BombaVigente[]
  gas: CapacidadVigente & { medido: boolean }
  afuera: CapacidadVigente
  mercado: CapacidadVigente
  tratamiento: CapacidadVigente
  admision: CapacidadVigente
  explicacionEmpate?: string
}

const SIN_FIRMAR = 'dato del demo, sin firmar'
const firmadaTexto = (f: FuenteCapacidad) => `${NOMBRE_FUENTE_CAPACIDAD[f]} · firmada`

/** Las capacidades firmadas de un campo en una configuración, si las tiene. */
export const capacidadesFirmadas = (c: { capacidades?: readonly CapacidadesCampo[] }, campoId: string): CapacidadesCampo | undefined =>
  c.capacidades?.find(x => x.campoId === campoId)

/** Lo que rige en un campo: lo firmado y, donde no se firmó, el dato del demo
 *  (el esquema de planta y su tren de agua). */
export function capacidadesDe(c: { capacidades?: readonly CapacidadesCampo[] }, campoId: string): CapacidadesVigentes {
  const f = capacidadesFirmadas(c, campoId)
  const pl = Object.hasOwn(CAMPO_PLANTA, campoId) ? CAMPO_PLANTA[campoId] : undefined
  const tren = Object.hasOwn(TREN_AGUA, campoId) ? TREN_AGUA[campoId] : undefined
  const una = (tramo: TramoCapacidad, firmada: CapacidadFirmada | undefined, demo: number | undefined, fuenteDemo: string, sinDato: string): CapacidadVigente => {
    const unidad = UNIDAD_CAPACIDAD[tramo]
    if (firmada) return { tramo, valor: firmada.bpd, unidad, estado: 'firmado', fuente: firmadaTexto(firmada.fuente), fuenteFirmada: firmada.fuente }
    if (demo !== undefined && demo > 0) return { tramo, valor: demo, unidad, estado: 'demo', fuente: `${fuenteDemo}: ${SIN_FIRMAR}` }
    return { tramo, valor: null, unidad, estado: 'sin-dato', fuente: sinDato }
  }
  const crudo = una('crudo', f?.crudo, pl?.caudales.crudoCap, 'La capacidad del tren de crudo en el esquema de planta', 'Sin esquema de planta: no se sabe cuánto deja pasar')
  const afuera = una('afuera', f?.afuera, pl?.chokes.evacuacion, 'La capacidad del oleoducto o del transportador en el esquema de planta', 'Sin esquema de planta: no se sabe cuánto sale')
  const mercado = una('mercado', f?.mercado, pl?.chokes.mercado, 'Lo que recibe el cliente o la nominación, en el esquema de planta', 'Sin dato de lo que recibe el cliente')
  const gasBase = una('gas', f?.gas, pl?.caudales.gasCap, 'La capacidad del tren de gas en el esquema de planta', 'Sin tren de gas en el esquema')
  const gas = { ...gasBase, medido: f?.gas?.medido ?? GAS_MEDIDO_EN.includes(campoId) }
  const tratamiento = una('tratamiento', f?.tratamiento, tren?.tratamientoBpd, 'El tratamiento de agua del esquema',
    'El demo no trae la capacidad del tratamiento de agua')
  const admision = una('admision', f?.admision, tren?.admisionBpd, 'Lo que admiten los inyectores, deducido del límite del cabezal de disposición',
    'El demo no trae lo que admiten los pozos inyectores')
  const bombas: BombaVigente[] = (tren?.bombas ?? []).map(b => {
    const x = f?.bombas?.find(y => y.equipo === b.id)
    return { equipo: b.id, valor: x?.bpd ?? b.capacidadBpd, placa: b.placaBpd, papel: b.papel, reserva: !!b.reserva, ...(b.nota ? { nota: b.nota } : {}),
      ...(x ? { estado: 'firmado' as const, fuente: firmadaTexto(x.fuente), fuenteFirmada: x.fuente }
        : { estado: 'demo' as const, fuente: `Lo que da en este campo (la placa, o lo que deja el cabezal de disposición): ${SIN_FIRMAR}` }) }
  })
  // El tren de agua: lo menor entre lo que dejan pasar las bombas en servicio y lo
  // que admiten los inyectores o deja el tratamiento, si se sabe.
  const enServicio = bombas.filter(b => !b.reserva)
  const suma = enServicio.length ? enServicio.reduce((a, b) => a + b.valor, 0) : pl?.caudales.aguaCap
  const tope = [admision, tratamiento].filter(x => x.valor !== null && suma !== undefined && x.valor < suma)
  const entran = [...enServicio.map(b => b.estado), ...tope.map(x => x.estado)]
  const valorAgua = tope.length ? Math.min(...tope.map(x => x.valor!)) : suma
  const agua: CapacidadVigente = valorAgua === undefined || !(valorAgua > 0)
    ? { tramo: 'agua', valor: null, unidad: 'bbl/d de agua', estado: 'sin-dato', fuente: 'El campo no tiene bombas de agua en el esquema' }
    : { tramo: 'agua', valor: valorAgua, unidad: 'bbl/d de agua',
      estado: entran.length && entran.every(e => e === 'firmado') ? 'firmado' : 'demo',
      fuente: `${tope.length ? `Lo que ${tope[0]!.tramo === 'admision' ? 'admiten los inyectores' : 'deja el tratamiento'}, menos que la suma de las bombas en servicio` : 'La suma de las bombas en servicio (la de reserva no suma)'}${entran.every(e => e === 'firmado') && entran.length ? ' · firmada' : `: ${SIN_FIRMAR}`}` }
  return {
    campoId, firmadas: !!f && (!!f.crudo || !!f.afuera || !!f.mercado || !!f.gas || !!f.tratamiento || !!f.admision || !!f.bombas?.length),
    crudo, agua, bombas, gas, afuera, mercado, tratamiento, admision,
    ...(f?.explicacionEmpate ? { explicacionEmpate: f.explicacionEmpate } : {}),
  }
}

/** Quién firmó por última vez las capacidades de un campo y cuándo: la versión
 *  desde la que rigen las de hoy. Undefined si nunca se firmaron (rigen las del demo). */
export interface FirmaCapacidades { version: number; fecha: string; por: string }
export function firmaDeCapacidades(versiones: ReadonlyArray<Pick<Version, 'version' | 'fecha' | 'por' | 'config'>>, campoId: string): FirmaCapacidades | undefined {
  const clave = (v: Pick<Version, 'config'>) => JSON.stringify(capacidadesFirmadas(v.config, campoId) ?? null)
  const ultima = versiones.at(-1)
  if (!ultima || clave(ultima) === 'null') return undefined
  const k = clave(ultima)
  let i = versiones.length - 1
  while (i > 0 && clave(versiones[i - 1]!) === k) i--
  const v = versiones[i]!
  return { version: v.version, fecha: v.fecha, por: v.por }
}

/* ───────────────────────── la planta por dentro ───────────────────────── */

export type TrenPlanta = 'crudo' | 'agua' | 'gas'
/** Un carril de la planta (U2 §2.3 y §11.1). */
export interface TrenTuberia {
  tren: TrenPlanta
  /** La capacidad instalada, en su unidad. */
  capacidad: number
  unidad: UnidadCapacidad
  /** La misma capacidad en crudo. Null si no se puede pasar a crudo: un tren
   *  sin medir, o el agua sin agua en las pruebas. */
  enCrudo: number | null
  /** Se mide en el campo. Solo un tren medido entra en el mínimo de la planta:
   *  uno sin medir decidiría lo que limita con un número declarado (U2 §11.3, punto 1). */
  medido: boolean
  /** % de la capacidad que usaría todo el potencial de los pozos; null sin medir. */
  uso: number | null
  /** Firmada o dato del demo. */
  estado: EstadoCapacidad
}

/** Los trenes de la planta con la capacidad INSTALADA (no baja por una parada:
 *  NSTA p. 29). El agua se pasa a crudo con `trenesEnCrudo` y la relación
 *  crudo/agua de las pruebas vigentes (`crudo` y `agua` de los pozos), la misma
 *  base del potencial de los pozos. El gas solo se pasa a crudo si se mide, con
 *  la relación crudo/gas del esquema (`caudales`). */
export function trenesDePlanta(cap: CapacidadesVigentes, crudo: number, agua: number, conGas: boolean, caudales: { crudo: number; gas: number }): TrenTuberia[] {
  const out: TrenTuberia[] = []
  if (cap.crudo.valor !== null) out.push({ tren: 'crudo', capacidad: cap.crudo.valor, unidad: 'bbl/d de crudo', enCrudo: cap.crudo.valor, medido: true,
    uso: cap.crudo.valor > 0 ? (crudo / cap.crudo.valor) * 100 : null, estado: cap.crudo.estado })
  if (cap.agua.valor !== null && cap.agua.valor > 0) {
    const enCrudo = crudo > 0 && agua > 0
      ? trenesEnCrudo({ crudo, crudoCap: cap.crudo.valor ?? 0, agua, aguaCap: cap.agua.valor, gas: 0, gasCap: 0 }).find(x => x.tren === 'Agua')?.cap ?? null
      : null
    out.push({ tren: 'agua', capacidad: cap.agua.valor, unidad: 'bbl/d de agua', enCrudo, medido: true, uso: (agua / cap.agua.valor) * 100, estado: cap.agua.estado })
  }
  if (conGas && cap.gas.valor !== null && cap.gas.valor > 0) out.push({ tren: 'gas', capacidad: cap.gas.valor, unidad: 'KPC/d de gas',
    enCrudo: cap.gas.medido && caudales.gas > 0 ? Math.round(cap.gas.valor * caudales.crudo / caudales.gas) : null, medido: cap.gas.medido, uso: null, estado: cap.gas.estado })
  return out
}

/** El tren que manda dentro de la planta: el menor de los medidos en crudo. */
export const trenMenor = (trenes: readonly TrenTuberia[]): TrenTuberia | undefined =>
  trenes.filter(x => x.medido && x.enCrudo !== null).reduce<TrenTuberia | undefined>((a, x) => (!a || x.enCrudo! < a.enCrudo! ? x : a), undefined)

/* ───────────────────────── las reglas de la firma ───────────────────────── */

/** Un cambio de más de esta fracción frente a lo vigente pide confirmar, sin
 *  bloquear (U2 §8.4: 20 %, un umbral de producto). */
export const CAMBIO_GRANDE = 0.2

/** Algo que se encontró al revisar las capacidades. Lo que bloquea no deja firmar. */
export interface HallazgoCapacidad {
  /** El tramo (o `bomba`, con su equipo; o `empate`, entre dos tramos). */
  tramo: TramoCapacidad | 'bomba' | 'empate' | 'fuentes'
  equipo?: string
  texto: string
  bloquea: boolean
}

/** Lo que la revisión necesita del pasado y de hoy: lo arma `vistaCapacidades` (choke.ts). */
export interface EntradaRevision {
  campoId: string
  /** Lo que rige hoy. */
  vigentes: CapacidadesVigentes
  /** Lo máximo que pasó en un día por los tramos de crudo (el punto oficial) en los últimos 30 días. */
  maximoCrudo?: { bpd: number; dia: Date }
  /** El potencial de los pozos hoy (bbl/d de crudo) y su agua (bbl/d de agua): para pasar el agua a crudo y para el empate. */
  pozosBpd: number
  aguaPozosBpd: number
  /** El campo tiene tren de gas (perfil firmado), y la relación crudo/gas del esquema. */
  conGas: boolean
  caudalesGas: { crudo: number; gas: number }
}

const cifra = (v: number) => v.toLocaleString('es-CO', { maximumFractionDigits: 0 })
const lista = (xs: readonly string[], y = 'y') => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ${y} ${xs.at(-1)}`)
/** «placa del equipo, prueba de capacidad, … o estimado de ingeniería». */
const FUENTES_EN_PALABRAS = lista(FUENTES_CAPACIDAD.map(f => NOMBRE_FUENTE_CAPACIDAD[f].toLowerCase()), 'o')

/** Las capacidades que quedarían si se firmara `prop` (lo no firmado, del demo). */
const conPropuesta = (prop: CapacidadesCampo | undefined, campoId: string) => capacidadesDe(prop ? { capacidades: [prop] } : {}, campoId)

/** Los potenciales de los tres tramos con unas capacidades: pozos, planta (el
 *  menor de los trenes medidos) y afuera. La misma cuenta de `potencialesDelCampo`. */
export function potencialesCon(cap: CapacidadesVigentes, e: Pick<EntradaRevision, 'pozosBpd' | 'aguaPozosBpd' | 'conGas' | 'caudalesGas'>): { pozos: number; planta: number | null; afuera: number | null } {
  const menor = trenMenor(trenesDePlanta(cap, e.pozosBpd, e.aguaPozosBpd, e.conGas, e.caudalesGas))
  return { pozos: e.pozosBpd, planta: menor?.enCrudo ?? null, afuera: cap.afuera.valor }
}
const SUJETO_POT = { pozos: 'los pozos', planta: 'la planta', afuera: 'afuera' } as const

/** Revisa las capacidades que se van a firmar con las reglas de U2 §8.4. Sin
 *  `prop` revisa lo que rige (el dato del demo): lo que encuentre se dice, pero
 *  no bloquea nada porque no se está firmando nada. */
export function revisarCapacidades(prop: CapacidadesCampo | undefined, e: EntradaRevision): HallazgoCapacidad[] {
  const out: HallazgoCapacidad[] = []
  const nuevas = conPropuesta(prop, e.campoId)
  const firmando = !!prop
  // 1. Cada número firmado: mayor que cero, con su fuente, y si cambia mucho, que lo confirme.
  const revisar = (tramo: HallazgoCapacidad['tramo'], nombre: string, x: CapacidadFirmada, antes: number | null, unidad: string, equipo?: string) => {
    const donde = equipo ? { equipo } : {}
    if (!(Number.isFinite(x.bpd) && x.bpd > 0 && x.bpd <= TOPE_BPD))
      out.push({ tramo, ...donde, bloquea: true, texto: `${nombre}: escriba un número mayor que cero (y menor de ${cifra(TOPE_BPD)}).` })
    if (!FUENTES_CAPACIDAD.includes(x.fuente))
      out.push({ tramo, ...donde, bloquea: true, texto: `${nombre}: ¿de dónde sale este número? ${FUENTES_EN_PALABRAS[0]!.toUpperCase()}${FUENTES_EN_PALABRAS.slice(1)}.` })
    if (antes !== null && antes > 0 && Number.isFinite(x.bpd) && x.bpd > 0 && Math.abs(x.bpd - antes) / antes > CAMBIO_GRANDE)
      out.push({ tramo, ...donde, bloquea: false, texto: `${nombre}: cambia ${cifra(Math.abs(x.bpd - antes) / antes * 100)} % frente a lo vigente (${cifra(antes)} ${unidad}). ¿Es correcto?` })
  }
  const v = e.vigentes
  if (prop) {
    for (const k of ['crudo', 'gas', 'afuera', 'mercado', 'tratamiento', 'admision'] as const) {
      const x = prop[k]
      if (x) revisar(k, NOMBRE_CAPACIDAD[k], x, v[k].valor, UNIDAD_CAPACIDAD[k])
    }
    for (const b of prop.bombas ?? []) revisar('bomba', `Bomba ${b.equipo}`, b, v.bombas.find(x => x.equipo === b.equipo)?.valor ?? null, 'bbl/d de agua', b.equipo)
  }
  // 2. No menos de lo que ya pasó: los tramos de crudo contra el punto oficial (el agua, el gas y el cliente no tienen medida diaria en TRIM).
  if (e.maximoCrudo) {
    const m = e.maximoCrudo
    for (const k of ['crudo', 'afuera'] as const) {
      const c = nuevas[k].valor
      if (c === null || !(c < m.bpd)) continue
      const escrito = prop?.[k] ? `usted escribe ${cifra(c)}` : `el dato del demo dice ${cifra(c)}`
      out.push({ tramo: k, bloquea: firmando && !!prop?.[k], texto: `${NOMBRE_CAPACIDAD[k]}: por este tramo ya pasaron ${cifra(m.bpd)} bbl/d de crudo el ${fechaCorta(m.dia)}, y ${escrito}: no puede dejar pasar menos de lo que ya pasó. Revise el número o la unidad.` })
    }
  }
  // 3. Un empate exacto entre dos tramos se explica por escrito (NSTA §5.4).
  const p = potencialesCon(nuevas, e)
  const pares = (['pozos', 'planta', 'afuera'] as const).flatMap((a, i, ks) => ks.slice(i + 1).flatMap(b => {
    const x = p[a], y = p[b]
    return x !== null && y !== null && Math.round(x) === Math.round(y) ? [{ a, b, valor: x }] : []
  }))
  const explicado = alcanza(prop?.explicacionEmpate ?? v.explicacionEmpate, MOTIVO_MINIMO)
  for (const x of pares) out.push({ tramo: 'empate', bloquea: firmando && !explicado,
    texto: explicado
      ? `${SUJETO_POT[x.a][0]!.toUpperCase()}${SUJETO_POT[x.a].slice(1)} y ${SUJETO_POT[x.b]} dan exactamente lo mismo (${cifra(x.valor)} bbl/d), y está explicado: «${(prop?.explicacionEmpate ?? v.explicacionEmpate)!.trim()}».`
      : `Con estos números, ${SUJETO_POT[x.a]} y ${SUJETO_POT[x.b]} dan exactamente lo mismo (${cifra(x.valor)} bbl/d). El método pide explicar un empate: escriba por qué.` })
  // 4. Lo que no se firmó sigue siendo del demo: se dice una vez.
  const delDemo = [nuevas.crudo, nuevas.agua, nuevas.afuera, nuevas.mercado, nuevas.gas, nuevas.tratamiento, nuevas.admision].filter(x => x.estado === 'demo')
  if (delDemo.length) out.push({ tramo: 'fuentes', bloquea: false,
    texto: `Sin firmar, con el dato del demo: ${lista(delDemo.map(x => NOMBRE_CAPACIDAD[x.tramo].split(':')[0]!.toLowerCase()))}. Al firmarlas, cada una dirá de dónde sale: ${FUENTES_EN_PALABRAS}.` })
  return out
}

/** Lo que no deja guardar unas capacidades firmadas, sin mirar el pasado: la
 *  forma (las mismas reglas que el servidor responde con 422). El pasado (lo
 *  que ya pasó por el tramo, el empate) lo revisa `revisarCapacidades`. */
export function validarCapacidades(caps: readonly CapacidadesCampo[] | undefined): string[] {
  const e: string[] = []
  const nombre = (id: string) => CAMPOS.find(c => c.id === id)?.nombre ?? id
  const vistos = new Set<string>()
  const numero = (donde: string, x: CapacidadFirmada | undefined) => {
    if (!x) return
    if (!(Number.isFinite(x.bpd) && x.bpd > 0 && x.bpd <= TOPE_BPD)) e.push(`${donde}: escriba un número mayor que cero (y menor de ${cifra(TOPE_BPD)}).`)
    if (!FUENTES_CAPACIDAD.includes(x.fuente)) e.push(`${donde}: falta de dónde sale el número (${FUENTES_EN_PALABRAS}).`)
  }
  for (const c of caps ?? []) {
    const n = nombre(c.campoId)
    if (!CAMPOS.some(x => x.id === c.campoId)) e.push(`Capacidades: «${c.campoId}» no es un campo registrado.`)
    if (vistos.has(c.campoId)) e.push(`Capacidades de ${n}: están dos veces.`)
    vistos.add(c.campoId)
    for (const k of ['crudo', 'afuera', 'mercado', 'tratamiento', 'admision', 'gas'] as const) numero(`${NOMBRE_CAPACIDAD[k]} de ${n}`, c[k])
    if (c.gas && typeof c.gas.medido !== 'boolean') e.push(`Tren de gas de ${n}: diga si se mide o no.`)
    const tren = Object.hasOwn(TREN_AGUA, c.campoId) ? TREN_AGUA[c.campoId]! : undefined
    const bombas = new Set<string>()
    for (const b of c.bombas ?? []) {
      if (!b.equipo?.trim()) { e.push(`Una bomba de agua de ${n} no tiene nombre.`); continue }
      if (bombas.has(b.equipo)) e.push(`Bomba ${b.equipo} de ${n}: está dos veces.`)
      bombas.add(b.equipo)
      if (tren && !tren.bombas.some(x => x.id === b.equipo)) e.push(`${b.equipo} no es una bomba del tren de agua de ${n}.`)
      numero(`Bomba ${b.equipo} de ${n}`, b)
    }
  }
  return e
}

/** Las capacidades tal como se firman: sin lo vacío ni lo que llega en `null`.
 *  Un campo sin nada firmado no viaja; una lista vacía tampoco. */
export function normalizarCapacidades(caps: readonly CapacidadesCampo[] | undefined): CapacidadesCampo[] | undefined {
  const una = (x: CapacidadFirmada | null | undefined) => (x == null ? undefined : { bpd: x.bpd, fuente: x.fuente })
  const out = (caps ?? []).flatMap((c): CapacidadesCampo[] => {
    const r: CapacidadesCampo = { campoId: c.campoId }
    for (const k of ['crudo', 'afuera', 'mercado', 'tratamiento', 'admision'] as const) { const x = una(c[k]); if (x) r[k] = x }
    if (c.gas != null) r.gas = { bpd: c.gas.bpd, fuente: c.gas.fuente, medido: c.gas.medido }
    const bombas = (c.bombas ?? []).filter(b => b != null).map(b => ({ equipo: b.equipo, bpd: b.bpd, fuente: b.fuente }))
    if (bombas.length) r.bombas = bombas
    const ex = c.explicacionEmpate?.trim()
    if (ex) r.explicacionEmpate = ex
    return Object.keys(r).length > 1 ? [r] : []
  })
  return out.length ? out : undefined
}

/** Lo que cambió en las capacidades de un campo, dicho para el historial de la firma. */
export function diferenciasCapacidades(a: CapacidadesCampo | undefined, b: CapacidadesCampo | undefined, nombreCampo: string): string[] {
  if (!a && !b) return []
  if (!b) return [`Capacidades de ${nombreCampo}: se quitaron las firmadas; rigen las del demo, sin firmar`]
  const dice = (x: CapacidadFirmada, unidad: string) => `${cifra(x.bpd)} ${unidad} (${NOMBRE_FUENTE_CAPACIDAD[x.fuente]?.toLowerCase() ?? 'sin fuente'})`
  const partes: string[] = []
  for (const k of ['crudo', 'afuera', 'mercado', 'gas', 'tratamiento', 'admision'] as const) {
    const x = a?.[k], y = b[k]
    const medidoDe = (z: CapacidadFirmada | undefined) => (z && 'medido' in z ? (z as CapacidadFirmada & { medido: boolean }).medido : undefined)
    const mismo = x && y && x.bpd === y.bpd && x.fuente === y.fuente && medidoDe(x) === medidoDe(y)
    if (mismo || (!x && !y)) continue
    const medido = (z: CapacidadFirmada | undefined) => (medidoDe(z) === undefined ? '' : medidoDe(z) ? ', se mide' : ', sin medir')
    const nom = NOMBRE_CAPACIDAD[k].split(':')[0]!.toLowerCase()
    partes.push(!y ? `${nom}: se quitó la firmada (${dice(x!, UNIDAD_CAPACIDAD[k])})` : `${nom} ${x ? `${dice(x, UNIDAD_CAPACIDAD[k])}${medido(x)} → ` : ''}${dice(y, UNIDAD_CAPACIDAD[k])}${medido(y)}`)
  }
  const ids = [...new Set([...(a?.bombas ?? []), ...(b.bombas ?? [])].map(x => x.equipo))]
  for (const id of ids) {
    const x = a?.bombas?.find(z => z.equipo === id), y = b.bombas?.find(z => z.equipo === id)
    if (x && y && x.bpd === y.bpd && x.fuente === y.fuente) continue
    partes.push(!y ? `bomba ${id}: se quitó la firmada` : `bomba ${id} ${x ? `${dice(x, 'bbl/d de agua')} → ` : ''}${dice(y, 'bbl/d de agua')}`)
  }
  if ((a?.explicacionEmpate ?? '') !== (b.explicacionEmpate ?? '')) partes.push(b.explicacionEmpate ? `explicación del empate: «${b.explicacionEmpate}»` : 'se quitó la explicación del empate')
  if (!partes.length) return []
  return [`Capacidades de ${nombreCampo}${a ? '' : ' (se firman por primera vez)'}: ${partes.join('; ')}`]
}
