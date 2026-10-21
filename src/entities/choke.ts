/** El modelo choke: dónde se originó cada parada y dónde se traba la
 *  producción de cada campo.
 *
 *  La producción fluye por una tubería en serie: yacimiento → pozos → planta o
 *  estación → afuera (oleoducto, transportador o cliente). Cada tramo tiene su
 *  capacidad y el campo entrega como mucho lo que deja pasar el más angosto
 *  (SPE-36848, Palen y Goodwin, BP 1996, el modelo que adopta la Circular ANH
 *  024; NSTA «UKSS Production Efficiency Section Guide» 2025, §5.3). Aquí se calcula:
 *   - el choke de cada parada (`chokeDeCausa`): el tramo donde se ORIGINÓ la
 *     restricción, con un solo criterio, el de Edinson: lo dedicado a un pozo es
 *     pozo y lo compartido es planta (CHOKE-COMPLETO §2 y §5);
 *   - la topología: la firmada, la que se deriva de lo que ya existe y las
 *     propuestas para firmarla (`topologiaDe`, `propuestasTopologia`);
 *   - los potenciales de cada tramo y lo que limita al campo, con «casi
 *     iguales» (`potencialesDelCampo`, §3–§4; U2 §0, principio 7);
 *   - la brecha del libro repartida por tramo y por escalón, que suma exacto
 *     (`brechaPorChoke`, §6–§7), con la eficiencia de producción (§8);
 *   - la tubería del campo para las vistas (`tuberiaCampo`, U2 §11.1), el
 *     reparto mes a mes y contra la línea base;
 *   - la serie diaria de lo que limitó y el aviso de cambio (`serieChoke`, §11).
 *
 *  Nada de esto cambia el libro (`libro.ts`), el diferido (`diferido.ts`) ni la
 *  causa (`causa-senal.ts`): los lee y los reparte. En pantalla no se dice
 *  «choke»: se dice «¿Dónde se trabó?», «Qué limita hoy» y «Si falla hoy» (U2 §1).
 */
import type { Causa, Contexto, TipoCausa } from './causa-senal'
import { causaDeEvento } from './causa-senal'
import type { CAUSAS_POZO } from './mensajes'
import { perfilDe, type ParadaProgramada } from './configuracion'
import {
  pozoDe, pozosDe, servicioPorId, serviciosDeCampo, eventosDeCampo, estadoAhora, pruebaEn,
  LEVANTAMIENTO_NOMBRE, type EventoPozo,
} from './pozos'
import { perfilBomba, paradaPorId, paradasDe, PAPEL_NOMBRE } from './bombas'
import { CAMPO_PLANTA, TREN_AGUA, CAMPOS_DE_GAS, GAS_MEDIDO_EN, trenesEnCrudo, type Caudales, type Elemento, type Simbolo } from './planta'
import {
  libro, porDia, tramosEntre, tramosDeEvento, crudoAsignado, aguaDePrueba, calendario, publicadoEnTodos,
  lineaBase, perdidaPorFrecuencia, type Tramo,
} from './libro'
import { caudalesAhora, type Riesgo } from './diferido'
import { EQUIPOS, equipoEnCampo } from './equipos'
import { campoPorId } from './campos'
import { AHORA, fechaCorta } from './reloj'

/* ───────────────────────── los cuatro tramos y sus palabras ───────────────────────── */

/** El choke de una parada: el paso 2 del árbol de la Circular 024
 *  (`choke_mod`: RESERVORIO, POZO, PLANTA, EXPORTACION). «Mercado» (NSTA) no
 *  es un quinto valor: es un subnivel de exportación (R2 §2.3). */
export type ChokeAnh = 'reservorio' | 'pozo' | 'planta' | 'exportacion'

/** Lo que limita a un campo. `pozos` incluye el yacimiento para el potencial,
 *  como la NSTA (R2 §2.2); el mercado va dentro de exportación. */
export type ChokeCampo = 'pozos' | 'planta' | 'exportacion'

/** A quién sirve un elemento. El choke sale de aquí, con el criterio de
 *  Edinson (transcript [26:48]; CHOKE-COMPLETO §2):
 *  - `dedicado`: a un solo pozo (su bomba de fondo, su variador, su
 *    transformador, su línea de flujo) → pozo;
 *  - `compartido`: a varios (pórtico, red de media, separador, bombas de agua,
 *    multifásica de un clúster) → planta;
 *  - `frontera`: el límite de la batería hacia afuera (la brida de salida, el
 *    punto de entrega) → exportación. La acometida eléctrica que ENTRA no es
 *    frontera en este sentido: sirve a varios pozos y es compartida (R2 §3.2:
 *    la restricción se materializa en el sistema eléctrico del campo; U2 §8.2);
 *  - `tercero`: de otro dueño, más allá de la batería (oleoducto,
 *    transportador, cliente) → exportación. */
export type AlcanceElemento = 'dedicado' | 'compartido' | 'frontera' | 'tercero'

/** Un elemento de la topología (P1 §1.6). Se firma en `Config.topologia`. */
export interface ChokeDeElemento {
  /** Id de equipo, tag de servicio o alimentador (`Pozo.alimentador`). */
  elemento: string
  /** DERIVADO del alcance (`chokeDeAlcance`); se guarda para la auditoría.
   *  Si no coincide con el que sale del alcance, `validarTopologia` lo dice y
   *  el motor usa el derivado. */
  choke: ChokeAnh
  alcance: AlcanceElemento
  /** «¿A qué pozos sirve?» */
  pozos?: string[]
  /** El campo donde está. Sin campo vale para todos: en el demo un mismo tag
   *  (P-201B, SE-2) está en varios campos y sirve a pozos distintos. */
  campoId?: string
  /** Un caso que espera la respuesta de Edinson (`casoBordeDe`, U2 §8.6). */
  casoBorde?: 'misma-locacion'
}

/** Los escalones de la brecha (patente US 8,195,401 B2; NSTA §5.3 y §6.4;
 *  CHOKE-COMPLETO §7). El norte vive en `disponibilidad-no-planeada`. */
export type EscalonBrecha = 'desarrollo' | 'desempeno' | 'disponibilidad-planeada' | 'disponibilidad-no-planeada' | 'capacidad'
/** Los escalones más lo que TRIM no puede clasificar sin una persona. */
export type EscalonOSinClasificar = EscalonBrecha | 'sin-clasificar'
/** Los chokes más lo que no tiene choke (la causa no lo decide: sin identificar). */
export type ChokeOSinAsignar = ChokeAnh | 'sin-asignar'

/** Los tramos, en el orden de la tubería. */
export const ORDEN_CHOKE: readonly ChokeAnh[] = ['reservorio', 'pozo', 'planta', 'exportacion']
export const ORDEN_CHOKE_CAMPO: readonly ChokeCampo[] = ['pozos', 'planta', 'exportacion']
export const CHOKES_Y_SIN_ASIGNAR: readonly ChokeOSinAsignar[] = [...ORDEN_CHOKE, 'sin-asignar']
export const ESCALONES: readonly EscalonOSinClasificar[] = ['desarrollo', 'desempeno', 'disponibilidad-planeada', 'disponibilidad-no-planeada', 'capacidad', 'sin-clasificar']

/** Cómo se dice cada tramo, en palabras de campo (U2 §1.1): el gerente y el
 *  operador no ven «PLANTA», ven dónde se trabó. «Estación» es la palabra de la
 *  propia ANH («Parada estación/bombeo afecta pozos», Tabla 1). */
export const NOMBRE_CHOKE: Record<ChokeAnh, string> = {
  reservorio: 'En el yacimiento',
  pozo: 'En el pozo',
  planta: 'En la planta o estación',
  exportacion: 'Afuera: oleoducto, transportador o cliente',
}
/** La línea que explica cada tramo (U2 §1.1). */
export const EXPLICA_TRAMO: Record<ChokeAnh, string> = {
  reservorio: 'El problema fue de la roca o del fluido, no de un equipo: el pozo no tenía qué dar.',
  pozo: 'Solo afectó a este pozo: su bomba de fondo, su varilla, su cabeza, su línea o lo eléctrico que es solo suyo.',
  planta: 'Afectó a varios pozos: lo compartido, desde el cabezal de producción hasta la salida de la batería, y los servicios del campo.',
  exportacion: 'Fuera de la batería: el oleoducto, el transportador o el cliente no recibieron.',
}
/** La línea corta debajo de cada opción del selector (U2 §1.5). */
export const RESUMEN_TRAMO: Record<ChokeAnh, string> = {
  reservorio: 'La roca o el fluido, no un equipo',
  pozo: 'Solo afectó a este pozo',
  planta: 'Afectó a varios pozos',
  exportacion: 'Fuera de la batería',
}
/** Lo mismo dentro de una frase: «queda en el pozo». */
export const DONDE_CHOKE: Record<ChokeOSinAsignar, string> = {
  reservorio: 'en el yacimiento',
  pozo: 'en el pozo',
  planta: 'en la planta',
  exportacion: 'afuera (oleoducto, transportador o cliente)',
  'sin-asignar': 'sin identificar todavía',
}
/** Como sustantivo: «la propuesta es el pozo». */
const LO_QUE_ES: Record<ChokeAnh, string> = { reservorio: 'el yacimiento', pozo: 'el pozo', planta: 'la planta', exportacion: 'afuera' }
export const NOMBRE_CHOKE_CAMPO: Record<ChokeCampo, string> = {
  pozos: 'Los pozos',
  planta: 'La planta o estación',
  exportacion: 'Afuera: oleoducto, transportador o cliente',
}
/** El subnivel de afuera que la NSTA llama mercado y la ANH no tiene. */
export const SUBNIVEL_MERCADO = 'Mercado: el terminal o el cliente no recibe, o la nominación'
export const NOMBRE_ALCANCE: Record<AlcanceElemento, string> = {
  dedicado: 'Le sirve a un solo pozo',
  compartido: 'Le sirve a varios pozos',
  frontera: 'El límite de la batería hacia afuera',
  tercero: 'De otro dueño, más allá de la batería',
}
export const NOMBRE_ESCALON: Record<EscalonOSinClasificar, string> = {
  desarrollo: 'Desarrollo: el yacimiento y los proyectos',
  desempeno: 'Desempeño: levantamiento sin optimizar',
  'disponibilidad-planeada': 'Paradas planeadas',
  'disponibilidad-no-planeada': 'Paradas no planeadas: fallas, disparos y terceros',
  capacidad: 'Capacidad: restricción sin falla (nominación, despacho)',
  'sin-clasificar': 'Sin clasificar: lo decide una persona',
}

/** Parámetros fijos del producto, versionados como los umbrales de las bandas
 *  (P1 §1.11). PROVISIONALES: se validan con Edinson (U2 §10.2, pregunta 6).
 *  - `umbralCasiIguales`: dos tramos a menos de esta diferencia (sobre el que
 *    limita) están «casi iguales»: la pantalla lo dice y no avisa un cambio. No
 *    es la banda del factor de asignación (±15 % en La Ceiba): esa es el límite
 *    regulatorio del factor, no el error de las pruebas (U2 §0, principio 7);
 *  - `diasParaCambio`: días seguidos que el tramo nuevo tiene que limitar,
 *    fuera de «casi iguales», para avisar «Cambió lo que limita» (U2 §7.2). */
export const PARAMETROS_CHOKE = { version: 'choke.parametros@1', umbralCasiIguales: 0.03, diasParaCambio: 3 } as const

/* ───────────────────────── el alcance decide el choke ───────────────────────── */

/** El choke de un elemento sale de su alcance: un solo criterio, el de Edinson,
 *  sin opción NSTA (CHOKE-COMPLETO §2: así los campos se pueden comparar). El
 *  yacimiento nunca sale de un elemento: solo lo pone una persona. */
export function chokeDeAlcance(alcance: AlcanceElemento): ChokeAnh {
  switch (alcance) {
    case 'dedicado': return 'pozo'
    case 'compartido': return 'planta'
    case 'frontera':
    case 'tercero': return 'exportacion'
  }
}

/** Dentro de la batería, el alcance sale de cuántos pozos sirve: uno, dedicado;
 *  varios, compartido. */
export const alcancePorPozos = (pozos: readonly string[]): 'dedicado' | 'compartido' =>
  (new Set(pozos).size === 1 ? 'dedicado' : 'compartido')

/** Un elemento con su choke derivado del alcance. */
export const conChoke = (e: Omit<ChokeDeElemento, 'choke'>): ChokeDeElemento => ({ ...e, choke: chokeDeAlcance(e.alcance) })

/** Lo que no deja firmar una topología. Las mismas reglas que tendrá el
 *  servidor (422): el choke guardado tiene que ser el que sale del alcance, un
 *  dedicado sirve a un solo pozo y un compartido a más de uno. */
export function validarTopologia(t: readonly ChokeDeElemento[]): string[] {
  const e: string[] = []
  const vistos = new Set<string>()
  for (const x of t) {
    const id = x.elemento.trim(), donde = x.campoId ? ` (${x.campoId})` : ''
    if (!id) { e.push('Hay un elemento sin nombre: de él sale el identificador.'); continue }
    const k = `${x.campoId ?? '*'}|${id}`
    if (vistos.has(k)) e.push(`${id}${donde}: está dos veces en la topología.`)
    vistos.add(k)
    const debe = chokeDeAlcance(x.alcance)
    if (x.choke !== debe) e.push(`${id}${donde}: el choke guardado («${NOMBRE_CHOKE[x.choke]}») no es el que sale de su alcance («${NOMBRE_ALCANCE[x.alcance]}» → «${NOMBRE_CHOKE[debe]}»).`)
    const n = new Set(x.pozos ?? []).size
    if (x.alcance === 'dedicado' && n !== 1) e.push(`${id}${donde}: es dedicado, así que le sirve a un solo pozo (tiene ${n}).`)
    if (x.alcance === 'compartido' && n === 1) e.push(`${id}${donde}: le sirve a un solo pozo, así que es dedicado y no compartido.`)
    if (x.campoId) for (const p of x.pozos ?? []) if (!pozoDe(x.campoId, p)) e.push(`${id}${donde}: el pozo ${p} no es de ese campo.`)
  }
  return e
}

/** El ⓘ del caso de borde (U2 §8.6). */
export const EXPLICA_CASO_BORDE = 'Falta que Edinson confirme si un transformador que alimenta 2 o 3 pozos de una misma locación va al pozo o a la planta. Hoy va a la planta, porque sirve a varios. Si la regla cambia, todos los equipos con esta etiqueta cambian juntos, con vista previa y firma.'

/** El caso de borde de CHOKE-COMPLETO §16: un equipo compartido por 2 o 3
 *  pozos de la MISMA locación. La regla dice planta, porque sirve a varios, y
 *  el administrador no puede escoger otra cosa; se marca para que, el día que
 *  Edinson conteste, se vea cuántos equipos y paradas cambian (U2 §8.6). La
 *  locación de cada pozo no está en `Pozo`: la da quien llama (en el demo,
 *  `LOCACIONES_DEMO` de `datos/topologia.ts`, que entra por la costura como
 *  todo dato de demostración; el motor no importa `datos/*`). */
export function casoBordeDe(e: Pick<ChokeDeElemento, 'alcance' | 'pozos'>, locacionDe: (pozo: string) => string | undefined): 'misma-locacion' | undefined {
  const ps = [...new Set(e.pozos ?? [])]
  if (e.alcance !== 'compartido' || ps.length < 2 || ps.length > 3) return undefined
  const ls = ps.map(locacionDe)
  return ls[0] !== undefined && ls.every(l => l === ls[0]) ? 'misma-locacion' : undefined
}
/** La topología con sus casos de borde marcados. */
export const marcarCasosBorde = <E extends ChokeDeElemento>(t: readonly E[], locacionDe: (pozo: string) => string | undefined): E[] =>
  t.map(e => { const k = casoBordeDe(e, locacionDe); return k ? { ...e, casoBorde: k } : e })

/* ───────────────────────── la topología de cada campo ───────────────────────── */

/** Qué clase de elemento es. Sirve para las palabras; no cambia su choke. */
export type ClaseElemento =
  | 'levantamiento' | 'pozo' | 'alimentador' | 'bomba' | 'proceso'
  | 'tanque' | 'medicion' | 'servicio' | 'salida' | 'inyectores'

/** Un elemento de la topología derivada, con su nombre y su clase. */
export interface ElementoDerivado extends ChokeDeElemento {
  campoId: string
  pozos: string[]
  nombre: string
  clase: ClaseElemento
}

const CLASE: Record<Simbolo, ClaseElemento> = {
  pozos: 'pozo', manifold: 'proceso', separador: 'proceso', depurador: 'proceso', tratador: 'proceso',
  tanque: 'tanque', medicion: 'medicion', compresor: 'servicio', bomba: 'bomba', inyeccion: 'inyectores',
  tea: 'proceso', subestacion: 'servicio', aire: 'servicio', salida: 'salida',
}

/** Uno, dedicado; varios (o ninguno: lo de la planta que no se ata a un pozo),
 *  compartido. Lo de otro dueño o la frontera no cambia por el número de pozos. */
function alcanceServidos(pozos: readonly string[], antes?: AlcanceElemento): AlcanceElemento {
  if (antes === 'tercero' || antes === 'frontera') return antes
  return alcancePorPozos(pozos)
}

/** La topología de un campo que se deriva de lo que el motor YA tiene, sin
 *  escribir nada a mano (CHOKE-CONSTRUCCION, regla 4; CHOKE-COMPLETO §2). Es la
 *  del demo, y la de cualquier campo sin una topología firmada:
 *   - cada pozo es dedicado a sí mismo: su levantamiento (bomba de fondo, motor,
 *     cable, variador y transformador dedicado; o la unidad de bombeo mecánico;
 *     o la válvula de cabeza si fluye solo) le sirve solo a él;
 *   - las bombas de la línea sirven a los pozos que les asigna su perfil
 *     (`bombas.ts`: MPP-301 a MN-07, MN-18 y MN-33); las de agua, a todos los
 *     pozos del campo, porque toda el agua de los pozos pasa por ellas;
 *   - lo del esquema de planta (`CAMPO_PLANTA`: manifold, separador, tratador,
 *     tanques, LACT, depurador, compresor, tea, tanque y bombas de agua,
 *     inyectores, subestación y aire) le sirve a todos los pozos: compartido;
 *   - lo que sale del límite de batería (el oleoducto, el gas a venta) es de
 *     otro dueño: tercero;
 *   - los alimentadores se agrupan por `Pozo.alimentador` (en el demo, todos
 *     los pozos cuelgan del pórtico SE-2).
 *  El alcance sale del número de pozos servidos y el choke, del alcance. Un
 *  elemento que no está en el registro no está aquí: el choke de su parada sale
 *  de la regla por tipo de causa (P1 §2.1), y se dice.
 *
 *  Vive en el motor y no en `datos/`: no es historia de demostración sino una
 *  regla sobre el registro, y el motor no importa `datos/*` (insumos.ts; lo
 *  comprueba verificar-libro, sección 14). */
export function topologiaDerivada(campoId: string): ElementoDerivado[] {
  const pozos = pozosDe(campoId)
  const todos = pozos.map(p => p.id)
  const out = new Map<string, Omit<ElementoDerivado, 'choke'>>()
  const poner = (e: Omit<ElementoDerivado, 'choke'>) => {
    const ya = out.get(e.elemento)
    // Un mismo tag en dos lugares (la subestación es también el alimentador de
    // los pozos) es UN elemento: sirve a la unión de sus pozos.
    if (ya) { ya.pozos = [...new Set([...ya.pozos, ...e.pozos])]; ya.alcance = alcanceServidos(ya.pozos, ya.alcance) }
    else out.set(e.elemento, e)
  }
  // 1. Cada pozo: su levantamiento le sirve solo a él.
  for (const p of pozos) poner({
    campoId, elemento: p.id, nombre: `${p.id} · ${LEVANTAMIENTO_NOMBRE[p.levantamiento].toLowerCase()}`,
    clase: p.levantamiento === 'flujo-natural' ? 'pozo' : 'levantamiento', alcance: 'dedicado', pozos: [p.id],
  })
  // 2. La planta: cada equipo, o cada miembro de un grupo (cada bomba, cada tanque).
  const planta = Object.hasOwn(CAMPO_PLANTA, campoId) ? CAMPO_PLANTA[campoId] : undefined
  const elementos: Elemento[] = planta ? [...planta.tronco, ...planta.gas, ...planta.crudo, ...planta.agua, ...planta.servicios] : []
  for (const el of elementos) {
    if (el.simbolo === 'pozos') continue
    const clase = CLASE[el.simbolo]
    const unos = el.miembros?.length ? el.miembros.map(m => ({ id: m.equipo ?? m.id, nombre: m.etiqueta })) : [{ id: el.equipo ?? el.id, nombre: el.etiqueta }]
    for (const u of unos) {
      if (clase === 'salida') { poner({ campoId, elemento: u.id, nombre: u.nombre, clase, alcance: 'tercero', pozos: todos }); continue }
      // Una multifásica sirve a los pozos de su perfil; lo demás, a todos.
      const servidos = perfilBomba(u.id, campoId)?.pozos ?? todos
      poner({ campoId, elemento: u.id, nombre: u.nombre, clase, alcance: alcanceServidos(servidos), pozos: [...servidos] })
    }
  }
  // 3. Los alimentadores: de qué pórtico o subestación cuelga cada pozo.
  const porAlimentador = new Map<string, string[]>()
  for (const p of pozos) porAlimentador.set(p.alimentador, [...(porAlimentador.get(p.alimentador) ?? []), p.id])
  for (const [id, ps] of porAlimentador) poner({ campoId, elemento: id, nombre: `Alimentador ${id}`, clase: 'alimentador', alcance: alcanceServidos(ps), pozos: ps })
  return [...out.values()].map(e => ({ ...e, choke: chokeDeAlcance(e.alcance) }))
}

/** La topología derivada de un campo. Depende solo de los insumos y del
 *  esquema de planta, no de la configuración: una vez por campo. */
const DERIVADA = new Map<string, ElementoDerivado[]>()
function derivadaDe(campoId: string): ElementoDerivado[] {
  let d = DERIVADA.get(campoId)
  if (!d) DERIVADA.set(campoId, d = topologiaDerivada(campoId))
  return d
}

interface Indice {
  /** El campo trae al menos una entrada firmada. */
  firmada: boolean
  /** Lo que rige, como se firmó (o como se deriva del registro). */
  lista: ChokeDeElemento[]
  /** Por elemento, con el choke que sale del alcance. */
  elementos: Map<string, ChokeDeElemento>
}
/* El choke se pide por cada tramo del libro: el índice va por contexto (la
   configuración firmada) y campo. */
const INDICE = new WeakMap<Contexto, Map<string, Indice>>()
function indiceDe(campoId: string, ctx: Contexto): Indice {
  let m = INDICE.get(ctx)
  if (!m) INDICE.set(ctx, m = new Map())
  const ya = m.get(campoId)
  if (ya) return ya
  const firmadas = (ctx.config.topologia ?? []).filter(e => e.campoId === undefined || e.campoId === campoId)
  // Las del campo mandan sobre las que valen para todos.
  const vigentes = new Map<string, ChokeDeElemento>()
  for (const e of firmadas.filter(x => x.campoId === undefined)) vigentes.set(e.elemento, e)
  for (const e of firmadas.filter(x => x.campoId === campoId)) vigentes.set(e.elemento, e)
  const lista = firmadas.length ? [...vigentes.values()] : derivadaDe(campoId)
  const elementos = new Map<string, ChokeDeElemento>()
  for (const e of lista) elementos.set(e.elemento, { ...e, choke: chokeDeAlcance(e.alcance) })
  const r: Indice = { firmada: firmadas.length > 0, lista, elementos }
  m.set(campoId, r)
  return r
}

/** La topología que rige en un campo: la firmada (`Config.topologia`) si trae
 *  alguna entrada para él; si no, la que se deriva de lo que ya existe
 *  (`topologiaDerivada`). Una entrada firmada sin campo vale para todos. */
export const topologiaDe = (campoId: string, ctx: Contexto): ChokeDeElemento[] => indiceDe(campoId, ctx).lista
/** ¿La topología del campo es la firmada? */
export const topologiaFirmada = (campoId: string, ctx: Contexto): boolean => indiceDe(campoId, ctx).firmada
/** Un elemento de la topología del campo, con el choke que sale de su alcance. */
export const elementoDe = (campoId: string, elemento: string, ctx: Contexto): ChokeDeElemento | undefined =>
  indiceDe(campoId, ctx).elementos.get(elemento)

/* ───────────────────────── las propuestas de topología ───────────────────────── */

/** Una topología que TRIM propone desde sus datos, para que el administrador
 *  la confirme y no tenga que escribirla (U2 §8.3). Nunca se firma sola. */
export interface PropuestaTopologia {
  elemento: string
  /** Los pozos que la fuente dice que sirve (vacío si la fuente no los nombra). */
  pozos: string[]
  /** La pregunta, con su porqué en palabras de campo. */
  porque: string
  fuente: 'alimentador' | 'bomba' | 'cascadas' | 'registro'
  evidencia: string[]
  /** Dos fuentes que no cuadran: se muestra y una persona decide. */
  conflicto?: string
}

/** «LC-01, LC-02 y LC-03». */
const lista = (xs: readonly string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}`)

/** Lo que TRIM puede proponer de la topología de un campo con lo que ya sabe
 *  (U2 §8.3): de qué alimentador cuelga cada pozo, qué pozos mueve cada bomba,
 *  qué pozos cerraron en cada caída de un servicio y lo que dice el registro
 *  de cada equipo. Cada propuesta lleva su evidencia; lo que no cuadra va como
 *  conflicto (V-101 dice «4 pozos», pero el esquema lo pone después del cabezal
 *  común de todos, U2 §11.3 punto 4). */
export function propuestasTopologia(campoId: string, ctx: Contexto): PropuestaTopologia[] {
  const todos = pozosDe(campoId).map(p => p.id), n = todos.length
  const out: PropuestaTopologia[] = []
  const derivada = new Map(derivadaDe(campoId).map(e => [e.elemento, e]))
  // 1. El alimentador de cada pozo.
  const porAlimentador = new Map<string, string[]>()
  for (const p of pozosDe(campoId)) porAlimentador.set(p.alimentador, [...(porAlimentador.get(p.alimentador) ?? []), p.id])
  for (const [a, ps] of porAlimentador) out.push({ elemento: a, pozos: ps, fuente: 'alimentador',
    porque: ps.length === n ? `Los ${n} pozos cuelgan de ${a}: ¿${a} sirve a todo el campo?` : `${lista(ps)} cuelgan de ${a}: ¿${a} sirve a esos ${ps.length}?`,
    evidencia: [`Alimentador de ${lista(ps)}: ${a}`] })
  // 2. Los pozos que mueve cada bomba de la línea con perfil.
  for (const e of derivada.values()) {
    const p = perfilBomba(e.elemento, campoId)
    if (!p) continue
    out.push({ elemento: e.elemento, pozos: [...(p.pozos ?? todos)], fuente: 'bomba',
      porque: p.pozos ? `${e.elemento} mueve ${lista(p.pozos)}: ¿sirve a esos ${p.pozos.length}?` : `${e.elemento} saca el agua de los ${n} pozos: ¿sirve a todo el campo?`,
      evidencia: [`Perfil de ${e.elemento} en este campo: ${PAPEL_NOMBRE[p.papel].toLowerCase()}${p.pozos ? `, pozos ${lista(p.pozos)}` : ''}`] })
  }
  // 3. Las cascadas: los pozos que cerró cada caída de un servicio (la regla de causa-senal.ts).
  const porServicio = new Map<string, Array<{ inicio: string; pozos: Set<string> }>>()
  for (const s of serviciosDeCampo(campoId)) {
    const ps = new Set(tramosDeEvento(campoId, s.id, ctx).map(t => t.pozo.id))
    if (ps.size) porServicio.set(s.equipo, [...(porServicio.get(s.equipo) ?? []), { inicio: s.inicio, pozos: ps }])
  }
  for (const [equipo, caidas] of porServicio) {
    const union = [...new Set(caidas.flatMap(c => [...c.pozos]))].sort()
    const ult = caidas.reduce((a, c) => (Date.parse(c.inicio) > Date.parse(a.inicio) ? c : a))
    const supone = derivada.get(equipo)?.pozos.length
    out.push({ elemento: equipo, pozos: union, fuente: 'cascadas',
      porque: `Cuando cayó ${equipo} el ${fechaCorta(new Date(ult.inicio))}, cerraron ${ult.pozos.size === n ? `los ${n} pozos` : pozosTexto(ult.pozos.size)} en cascada. Pasó ${caidas.length} ${caidas.length === 1 ? 'vez' : 'veces'}: ¿${equipo} sirve a ${union.length === n ? 'todo el campo' : `esos ${union.length}`}?`,
      evidencia: caidas.map(c => `${fechaCorta(new Date(c.inicio))}: ${pozosTexto(c.pozos.size)}`),
      ...(supone !== undefined && union.length < supone ? { conflicto: `En sus caídas cerraron ${union.length} de los ${supone} pozos que la topología le supone` } : {}) })
  }
  // 4. Lo que dice el registro del equipo (`aguasAbajo`).
  for (const e of derivada.values()) {
    if (!Object.hasOwn(EQUIPOS, e.elemento)) continue
    const a = equipoEnCampo(e.elemento, campoId)?.aguasAbajo
    if (a === 'todo el campo') { out.push({ elemento: e.elemento, pozos: todos, fuente: 'registro', porque: `El registro dice que ${e.elemento} llega a «todo el campo».`, evidencia: [`Registro del equipo: aguas abajo, «${a}»`] }); continue }
    const m = a ? /^(\d+) pozos/.exec(a) : null
    if (!a || !m) continue
    const dice = Number(m[1]), esquema = e.pozos.length
    out.push({ elemento: e.elemento, pozos: dice === esquema ? e.pozos : [], fuente: 'registro', porque: `El registro dice que ${e.elemento} sirve a «${a}».`,
      evidencia: [`Registro del equipo: aguas abajo, «${a}»`, `Esquema de planta: le pasa la producción de ${esquema === n ? `los ${n} pozos` : pozosTexto(esquema)}`],
      ...(dice !== esquema ? { conflicto: `El registro dice que ${e.elemento} sirve a «${a}», pero el esquema lo pone donde pasa la producción de ${esquema === n ? 'todos los pozos' : pozosTexto(esquema)}. ¿Cuál es?` } : {}) })
  }
  return out
}

/* ───────────────────────── el choke de cada parada ───────────────────────── */

/** La versión de la regla: va con cada propuesta (`DatoClasificado.regla`,
 *  P1 §1.3). La @2 cambia la baja tensión de un solo pozo (U2 §4.4, caso 8). */
export const REGLA_CHOKE = 'choke.topologia@2'

/** El choke de una parada, con su porqué. */
export interface ChokeDeParada {
  choke: ChokeAnh
  /** Una frase en palabras de campo: «P-201B mueve el agua de 18 pozos: si para, se frenan varios». */
  porque: string
  /** El elemento donde se originó: la raíz de la cascada (`Causa.equipo`), o el
   *  propio pozo cuando la baja tensión lo tumbó solo a él. */
  elemento?: string
  /** A cuántos pozos sirve ese elemento, según la topología. */
  servidos?: number
  /** TRIM propone, pero falta un dato que solo sabe una persona («¿el
   *  oleoducto estaba recibiendo?»). La propuesta no pasa a confirmada sola. */
  pregunta?: string
  alcance?: AlcanceElemento
  /** Exportación porque el comprador o la nominación no recibieron: el
   *  subnivel mercado de la NSTA, nunca un quinto choke. */
  subnivel?: 'mercado'
  /** De dónde salió: la topología firmada, la derivada del registro (la del
   *  demo), o la regla por tipo de causa cuando el elemento no está en la
   *  topología (P1 §2.1). */
  fuente: 'firmada' | 'derivada' | 'regla'
  regla: typeof REGLA_CHOKE
}

/** La pregunta de energía al operador: un hecho, nunca el tramo (U1 §2.4; U2 §4.5). */
export const PREGUNTA_ENERGIA = '¿De dónde vino el corte: de afuera (el proveedor), del campo (pórtico, red de media o subestación) o de este pozo (su transformador, su variador o su cable)?'
/** La pregunta del tanque de crudo lleno (P1 §3.3). */
export const PREGUNTA_OLEODUCTO = '¿El oleoducto o el cliente estaba recibiendo?'

/** Choke de una parada desde su causa: origen + dedicado/compartido + raíz de
 *  la cascada. null = la señal no lo decide (externo, clima, orden público,
 *  yacimiento): se le pregunta a una persona. Al operador nunca se le pide el
 *  choke: lo confirman supervisión, producción, el jefe o confiabilidad (P1 §1.3).
 *
 *  Reglas (CHOKE-COMPLETO §5, P1 §2.1, R2 §3.1–3.3, U2 §4.4):
 *   1. Manda el ORIGEN: `Causa.equipo` ya es la raíz de la cascada (el servicio
 *      que cayó, la bomba que paró antes, el propio pozo), así que todas las
 *      paradas de una cascada llevan el choke de su raíz.
 *   2. Dedicado o compartido, según la topología; para `UV`, el alimentador del
 *      pozo (`Pozo.alimentador`, que `causa-senal.ts` ya pone como equipo).
 *      Regla @2: si la baja tensión tumbó UN solo pozo de su alimentador en la
 *      ventana de cascada, se propone el pozo y se pregunta de dónde vino el
 *      corte; si tumbó varios, la planta. Si el pórtico hubiera fallado, habrían
 *      caído todos sus pozos, como en las caídas de SE-2 en Morichal.
 *   3. Reinyección y multifásica → planta (compartidas). Evacuación → planta,
 *      salvo que el elemento sea de un tercero; sin ese dato se propone planta y
 *      se pregunta «¿El oleoducto o el cliente estaba recibiendo?» (P1 §3.3).
 *   4. Programada → el choke del elemento intervenido (workover y pruebas → pozo).
 *   5. Declarada → según lo que declaró la persona (uno de los cuatro
 *      `CAUSAS_POZO`); en texto libre, la topología como propuesta y la pregunta.
 *   6. Pendiente → null. El yacimiento nunca sale de una señal.
 *  Una parada parcial (frecuencia reducida) lleva el choke de su causa: lo que
 *  cambia es su escalón (`brechaPorChoke`). */
export function chokeDeCausa(causa: Causa, campoId: string, ctx: Contexto): ChokeDeParada | null {
  let porCtx = MEMO.get(ctx)
  if (!porCtx) MEMO.set(ctx, porCtx = new WeakMap())
  let porCausa = porCtx.get(causa)
  if (!porCausa) porCtx.set(causa, porCausa = new Map())
  const ya = porCausa.get(campoId)
  if (ya !== undefined) return ya
  const r = deducirChoke(causa, campoId, ctx)
  porCausa.set(campoId, r)
  return r
}
/* Se pide por cada tramo de cada libro: una vez por contexto, causa y campo
   (las causas ya vienen memorizadas por contexto en causa-senal.ts). */
const MEMO = new WeakMap<Contexto, WeakMap<Causa, Map<string, ChokeDeParada | null>>>()

/** El choke de un tramo del libro: el de la causa de su evento, en su campo. */
export const chokeDeTramo = (t: Tramo, ctx: Contexto): ChokeDeParada | null => chokeDeCausa(t.causa, t.pozo.campoId, ctx)

type Chip = (typeof CAUSAS_POZO)[number]
/** Los cuatro motivos cerrados que puede escoger quien declara un cierre
 *  (`CAUSAS_POZO`, mensajes.ts): cada uno dice dónde se originó y en qué
 *  escalón cae (P1 §2.1, fila «declarada»). */
const CHIPS: Record<Chip, { choke: ChokeAnh; escalon: EscalonBrecha; porque: string; subnivel?: 'mercado' }> = {
  'Cierre para prueba o intervención del pozo': { choke: 'pozo', escalon: 'disponibilidad-planeada',
    porque: 'Se cerró para probar o intervenir el pozo: queda en el pozo' },
  'Fuga o daño en la línea de flujo': { choke: 'pozo', escalon: 'disponibilidad-no-planeada',
    porque: 'La línea de flujo es del pozo y le sirve solo a él: queda en el pozo' },
  'Orden de producción: nominación o restricción del comprador': { choke: 'exportacion', escalon: 'capacidad', subnivel: 'mercado',
    porque: 'El comprador o la nominación no recibieron todo: es afuera, en el mercado' },
  'Falla del controlador o de un instrumento del pozo': { choke: 'pozo', escalon: 'disponibilidad-no-planeada',
    porque: 'El controlador o el instrumento es del pozo y le sirve solo a él: queda en el pozo' },
}
/** El motivo cerrado que escogió quien declaró, si escogió uno. */
function chipDe(c: Causa): (typeof CHIPS)[Chip] | undefined {
  const t = (c.declarado?.texto ?? c.texto).trim()
  return Object.hasOwn(CHIPS, t) ? CHIPS[t as Chip] : undefined
}
/** El escalón que dice el motivo cerrado de una declaración, si lo hay. */
export const escalonDeDeclaracion = (c: Causa): EscalonBrecha | undefined => (c.tipo === 'declarada' ? chipDe(c)?.escalon : undefined)

const FMT_N0 = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
/** Un número como lo lee una persona en Colombia: «1.665». */
export const n0 = (v: number) => FMT_N0.format(v)
const pozosTexto = (n: number) => (n === 1 ? 'un pozo' : `${n0(n)} pozos`)
/** «si para, se frenan varios»; con dos o tres, cuáles: «se frenan los 3». */
const seFrenan = (n: number | undefined, verbo: string) => `si ${verbo}, se frenan ${n !== undefined && n > 1 && n <= 3 ? `los ${n}` : 'varios'}`

/** Lo que hace un elemento compartido, para decirlo: «mueve el agua de 18 pozos». */
const VERBO: Partial<Record<TipoCausa, string>> = {
  reinyeccion: 'mueve el agua de', transporte: 'lleva la producción de', energia: 'alimenta',
  aire: 'le da aire de instrumentos a', compresion: 'comprime el gas de', proceso: 'separa lo que llega de',
  tratamiento: 'trata el crudo de', evacuacion: 'despacha el crudo de',
}
function verboDe(equipo: string, campoId: string, tipo: TipoCausa): string {
  const p = perfilBomba(equipo, campoId)
  if (p) return p.papel === 'transporte' ? 'lleva la producción de' : p.papel === 'recobro' ? 'inyecta el agua de' : 'mueve el agua de'
  return VERBO[tipo] ?? 'le sirve a'
}
/** Un servicio «cae»; una máquina «para». */
const paraOCae = (tipo: TipoCausa) => (tipo === 'energia' || tipo === 'aire' ? 'cae' : 'para')

/** La ventana de cascada: la misma de causa-senal.ts (15 min entre un cierre y el siguiente). */
const VENTANA_CASCADA_MS = 15 * 60_000

/** Los pozos que cayeron por baja tensión (UV) junto con un evento: los del
 *  mismo alimentador encadenados en la ventana de cascada. Depende solo de los
 *  eventos del controlador: una vez por campo. */
const CORTES = new Map<string, Map<string, { pozo: string; juntos: string[] }>>()
function cortesDe(campoId: string): Map<string, { pozo: string; juntos: string[] }> {
  const ya = CORTES.get(campoId)
  if (ya) return ya
  const m = new Map<string, { pozo: string; juntos: string[] }>()
  const porAlimentador = new Map<string, EventoPozo[]>()
  for (const e of eventosDeCampo(campoId)) {
    const p = e.codigo === 'UV' ? pozoDe(campoId, e.pozo) : undefined
    if (p) porAlimentador.set(p.alimentador, [...(porAlimentador.get(p.alimentador) ?? []), e])
  }
  for (const evs of porAlimentador.values()) {
    const orden = [...evs].sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio))
    let grupo: EventoPozo[] = [], ultimo = -Infinity
    const cerrar = () => { const juntos = [...new Set(grupo.map(e => e.pozo))]; for (const e of grupo) m.set(e.id, { pozo: e.pozo, juntos }) }
    for (const e of orden) {
      const t = Date.parse(e.inicio)
      if (grupo.length && t > ultimo + VENTANA_CASCADA_MS) { cerrar(); grupo = [] }
      grupo.push(e)
      ultimo = Math.max(ultimo, t)
    }
    if (grupo.length) cerrar()
  }
  CORTES.set(campoId, m)
  return m
}

function deducirChoke(c: Causa, campoId: string, ctx: Contexto): ChokeDeParada | null {
  // 6. Sin causa no hay origen: lo dice una persona (el yacimiento tampoco sale de una señal).
  if (c.tipo === 'pendiente') return null
  const idx = indiceDe(campoId, ctx)
  // 1–2. El elemento raíz: la causa ya lo trae (el servicio, la bomba, el
  // alimentador del pozo en un UV, o el propio pozo).
  const el = idx.elementos.get(c.equipo)
  const servidos = el?.pozos ? new Set(el.pozos).size : undefined
  const fuenteDe = (e: ChokeDeElemento | undefined): ChokeDeParada['fuente'] => (e ? (idx.firmada ? 'firmada' : 'derivada') : 'regla')
  const base: Pick<ChokeDeParada, 'elemento' | 'regla' | 'fuente' | 'alcance' | 'servidos'> = {
    elemento: c.equipo, regla: REGLA_CHOKE, fuente: fuenteDe(el),
    ...(el ? { alcance: el.alcance } : {}),
    ...(servidos !== undefined ? { servidos } : {}),
  }
  const delElemento = el?.choke
  const esPozo = !!pozoDe(campoId, c.equipo)
  const solo = el?.pozos?.[0] ?? c.equipo
  const deAfuera = `${c.equipo} es de afuera (otro dueño, más allá de la batería): el tramo es afuera`

  switch (c.tipo) {
    case 'declarada': {
      // 5. Lo que escogió quien declaró, si fue uno de los motivos cerrados.
      const chip = chipDe(c)
      if (chip) return { ...base, choke: chip.choke, porque: chip.porque, ...(chip.subnivel ? { subnivel: chip.subnivel } : {}) }
      // En texto libre TRIM no interpreta lo que escribió la persona: propone
      // la topología (el pozo) y pregunta (P1 §2.1, «declarada en texto libre»).
      const choke = delElemento ?? 'pozo'
      return { ...base, choke, porque: `Lo declaró el operario con sus palabras: la propuesta es ${LO_QUE_ES[choke]} y la confirma una persona`,
        pregunta: '¿Dónde se originó lo que se declaró: en el pozo, en la planta o afuera?' }
    }
    case 'programada': {
      // 4. El elemento intervenido: un pozo (workover, prueba) es pozo.
      const choke = delElemento ?? (esPozo ? 'pozo' : 'planta')
      const porque = esPozo && choke === 'pozo' ? `Parada programada en ${c.equipo} (prueba o intervención del pozo): queda en el pozo`
        : servidos !== undefined && choke === 'planta' ? `Parada programada de ${c.equipo}, que ${verboDe(c.equipo, campoId, c.tipo)} ${pozosTexto(servidos)}: queda en la planta`
          : `Parada programada de ${c.equipo}: queda ${DONDE_CHOKE[choke]}`
      return { ...base, choke, porque }
    }
    case 'electrosumergible':
    case 'levantamiento': {
      const choke = delElemento ?? 'pozo'
      const sistema = c.tipo === 'electrosumergible' ? 'su propia electrosumergible' : 'su propio bombeo mecánico'
      const porque = choke === 'pozo' ? `${c.equipo} tiene ${sistema}: la falla queda en el pozo`
        : choke === 'exportacion' ? deAfuera : `${c.equipo} está en la topología firmada como compartido: queda en la planta`
      // Baja carga (UL): puede ser la bomba o que el pozo dejó de aportar; eso
      // último es el yacimiento, y solo lo dice una persona (P1 §2.1, fila UL).
      const pregunta = c.tipo === 'electrosumergible' && c.parte === 'admision' ? '¿Falló la bomba o el pozo dejó de aportar? Si no aportó, es el yacimiento' : undefined
      return { ...base, choke, porque, ...(pregunta ? { pregunta } : {}) }
    }
    case 'evacuacion': {
      // 3. Evacuación: el tanque y la LACT son de la batería (planta). Solo es
      // afuera si el oleoducto o el cliente no recibía, y TRIM no tiene esa
      // señal: se propone planta y se pregunta (P1 §3.3).
      const choke = delElemento ?? 'planta'
      if (choke === 'exportacion') return { ...base, choke, porque: deAfuera }
      if (choke === 'pozo') return { ...base, choke, porque: `${c.equipo} le sirve solo a ${solo}: queda en el pozo` }
      return { ...base, choke, porque: `${c.equipo} es de la planta${servidos !== undefined ? ` y despacha el crudo de ${pozosTexto(servidos)}` : ''}: si el oleoducto o el cliente no recibía, es afuera`,
        pregunta: PREGUNTA_OLEODUCTO }
    }
    case 'energia': {
      // La energía que llega de afuera se materializa en el sistema eléctrico
      // del campo: nunca es «afuera» (R2 §3.2; P1 §2.1, fila «energía · frontera»).
      // Quién la cortó (el proveedor o el campo) es el responsable, otro paso.
      const choke = delElemento === 'exportacion' || !delElemento ? 'planta' : delElemento
      if (choke === 'pozo') return { ...base, choke, porque: `${c.equipo} le sirve solo a ${solo}: la falla de energía queda en el pozo` }
      // Un UV que reporta el variador de un pozo, sin servicio caído: la regla @2.
      const corte = c.evento && !servicioPorId(c.evento) && !paradaPorId(c.evento) ? cortesDe(campoId).get(c.evento) : undefined
      if (corte && corte.juntos.length <= 1) {
        const propio = idx.elementos.get(corte.pozo)
        return { ...base, choke: 'pozo', elemento: corte.pozo, alcance: propio?.alcance ?? 'dedicado', servidos: 1, fuente: fuenteDe(propio),
          porque: `La baja tensión tumbó solo a ${corte.pozo}: ${c.equipo} siguió alimentando a los demás pozos, así que se propone el pozo`,
          pregunta: PREGUNTA_ENERGIA }
      }
      if (corte) return { ...base, choke,
        porque: `La baja tensión tumbó ${corte.juntos.length} pozos de ${c.equipo} a la vez (${lista(corte.juntos)}): se propone la planta` }
      return { ...base, choke, porque: servidos !== undefined ? `${c.equipo} alimenta ${pozosTexto(servidos)}: ${seFrenan(servidos, 'cae')}` : `${c.equipo} es de la red del campo: si cae, se frenan varios pozos` }
    }
    default: {
      // 3. Reinyección, multifásica, aire, compresión, separación, tratamiento:
      // lo que sirve a varios es de la planta.
      const choke = delElemento ?? 'planta'
      const porque = choke === 'pozo' ? `${c.equipo} le sirve solo a ${solo}: queda en el pozo`
        : choke === 'exportacion' ? deAfuera
          : servidos !== undefined ? `${c.equipo} ${verboDe(c.equipo, campoId, c.tipo)} ${pozosTexto(servidos)}: ${seFrenan(servidos, paraOCae(c.tipo))}`
            : `${c.equipo} es de la planta: ${seFrenan(undefined, paraOCae(c.tipo))}`
      return { ...base, choke, porque }
    }
  }
}

/** Sin topología, el tramo de un tipo de causa (P1 §2.1). */
const chokePorTipo = (t: TipoCausa): ChokeAnh => (t === 'electrosumergible' || t === 'levantamiento' ? 'pozo' : 'planta')

/* ───────────────────────── lo que limita al campo ───────────────────────── */

const D = 86_400_000
const ahora = AHORA.getTime()
const mayuscula = (s: string) => (s ? `${s[0]!.toUpperCase()}${s.slice(1)}` : s)
const ceros = <K extends string>(ks: readonly K[]) => Object.fromEntries(ks.map(k => [k, 0])) as Record<K, number>
/** Para decirlo dentro de una frase: «limita la planta», «Qué limita hoy: los pozos». */
const SUJETO: Record<ChokeCampo, string> = { pozos: 'los pozos', planta: 'la planta', exportacion: 'afuera' }

/** El dominante entre tres potenciales, con su empate, «casi iguales» y holgura. */
export interface Dominio {
  /** El menor: el potencial del sistema (SMPP de la NSTA, §5.3). */
  sistema: number
  dominante: ChokeCampo
  /** Dos o más iguales al barril: la NSTA (§5.4) pide una explicación escrita. */
  empate: boolean
  empatados: ChokeCampo[]
  /** Los tramos a menos del umbral del que limita (el que limita incluido), o
   *  null si el que limita gana por más del umbral (U2 §0, principio 7). */
  casiIguales: ChokeCampo[] | null
  /** El umbral con que se decidió. */
  umbral: number
  /** Lo que le sobra a cada tramo sobre el sistema, bbl/d (al dominante, 0). */
  holgura: Record<ChokeCampo, number>
  /** Con empate: por qué y qué se toma. */
  explicacion?: string
}

/** El dominante es el tramo de menor potencial. «By design, no two potentials
 *  should be exactly the same. If they are you must provide an explanation»
 *  (NSTA §5.4): un empate al barril se marca y se explica, y se toma el primero
 *  de la tubería, que es donde el flujo se frena primero. Si otro tramo está a
 *  menos del umbral, están «casi iguales»: lo que se gane en uno lo frena el otro. */
export function dominanteDe(p: Record<ChokeCampo, number>, umbral: number = PARAMETROS_CHOKE.umbralCasiIguales): Dominio {
  const sistema = Math.min(p.pozos, p.planta, p.exportacion)
  const empatados = ORDEN_CHOKE_CAMPO.filter(k => Math.round(p[k]) === Math.round(sistema))
  const dominante = empatados[0] ?? 'pozos'
  const holgura: Record<ChokeCampo, number> = { pozos: p.pozos - sistema, planta: p.planta - sistema, exportacion: p.exportacion - sistema }
  const cerca = sistema > 0 ? ORDEN_CHOKE_CAMPO.filter(k => (p[k] - sistema) / sistema < umbral) : []
  const base = { sistema, dominante, empatados, casiIguales: cerca.length > 1 ? cerca : null, umbral, holgura }
  if (empatados.length < 2) return { ...base, empate: false }
  return { ...base, empate: true,
    explicacion: `${mayuscula(empatados.map(k => SUJETO[k]).join(' y '))} dan lo mismo, ${n0(sistema)} bbl/d: la NSTA (§5.4) pide explicarlo por escrito. Ampliar uno solo no da un barril más; se toma ${SUJETO[dominante]}, el primero de la tubería.` }
}

export type TrenPlanta = 'crudo' | 'agua' | 'gas'
/** Un carril de la planta (U2 §2.3 y §11.1). */
export interface TrenTuberia {
  tren: TrenPlanta
  /** La capacidad instalada, en su unidad. */
  capacidad: number
  unidad: 'bbl/d de crudo' | 'bbl/d de agua' | 'KPC/d de gas'
  /** La misma capacidad en crudo. Null si no se puede pasar a crudo: un tren
   *  sin medir, o el agua sin agua en las pruebas. */
  enCrudo: number | null
  /** Se mide en el campo. Solo un tren medido entra en el mínimo de la planta:
   *  uno sin medir decidiría lo que limita con un número declarado (U2 §11.3, punto 1). */
  medido: boolean
  /** % de la capacidad que usaría todo el potencial de los pozos; null sin medir. */
  uso: number | null
}

/** Los trenes de la planta, con la capacidad INSTALADA del esquema (no baja por
 *  una parada: NSTA p. 29). El agua se pasa a crudo con `trenesEnCrudo` y la
 *  relación crudo/agua de las pruebas vigentes en ese instante, la misma base
 *  del potencial de los pozos: con la foto del esquema (`caudales`, la lectura
 *  de un día) el real de Morichal pasaba ese «potencial» todos los meses. El
 *  gas no se mide en esta fase (`GAS_MEDIDO_EN`): queda «sin medir», sin pasarlo
 *  a crudo, y fuera del mínimo. */
function trenesDe(cau: Caudales, crudo: number, agua: number, conGas: boolean, gasMedido: boolean): TrenTuberia[] {
  const out: TrenTuberia[] = [{ tren: 'crudo', capacidad: cau.crudoCap, unidad: 'bbl/d de crudo', enCrudo: cau.crudoCap, medido: true, uso: cau.crudoCap > 0 ? (crudo / cau.crudoCap) * 100 : null }]
  if (cau.aguaCap > 0) {
    const enCrudo = crudo > 0 && agua > 0
      ? trenesEnCrudo({ crudo, crudoCap: cau.crudoCap, agua, aguaCap: cau.aguaCap, gas: 0, gasCap: 0 }).find(x => x.tren === 'Agua')?.cap ?? null
      : null
    out.push({ tren: 'agua', capacidad: cau.aguaCap, unidad: 'bbl/d de agua', enCrudo, medido: true, uso: (agua / cau.aguaCap) * 100 })
  }
  if (conGas && cau.gasCap > 0) out.push({ tren: 'gas', capacidad: cau.gasCap, unidad: 'KPC/d de gas',
    enCrudo: gasMedido && cau.gas > 0 ? Math.round(cau.gasCap * cau.crudo / cau.gas) : null, medido: gasMedido, uso: null })
  return out
}

/** Los potenciales de un campo en un instante, en bbl/d de crudo. */
export interface PotencialesCampo {
  campoId: string
  /** El instante, en ms. */
  t: number
  /** Σ crudo asignado de los pozos con prueba (prueba vigente × factor del
   *  mes): la misma cifra de Producción y del libro (U2 §11.2, punto 1).
   *  Incluye el yacimiento, como la NSTA. Un pozo cerrado cuenta mientras pueda
   *  fluir; una frecuencia bajada no lo baja. */
  pozos: number
  /** El menor de los trenes MEDIDOS en crudo, con la capacidad instalada: no
   *  baja por una parada (NSTA p. 29). Null: sin tren medido, sin esquema o
   *  campo de gas. */
  planta: number | null
  /** La capacidad de evacuación declarada (`Chokes.evacuacion`). Null sin esquema o en un campo de gas. */
  exportacion: number | null
  /** El menor de los tres (null sin tubería de crudo). */
  sistema: number | null
  /** Lo que limita; null si el campo no tiene tubería de crudo (campo de gas, sin esquema). */
  dominante: ChokeCampo | null
  empate: boolean
  empatados: ChokeCampo[]
  casiIguales: ChokeCampo[] | null
  umbral: number
  /** Lo que le sobra a cada tramo, bbl/d. Null si no se puede decir. */
  holgura: Record<ChokeCampo, number | null>
  /** La planta por dentro: un carril por tren. */
  trenes: TrenTuberia[]
  /** El tren que manda dentro de la planta. */
  trenQueLimita?: TrenPlanta
  /** El subnivel mercado de afuera: lo que el comprador recibe
   *  (`Chokes.mercado`). No baja el potencial de afuera (NSTA p. 29). */
  mercado?: number
  /** El comprador recibe menos de lo que el sistema puede dar. */
  mercadoBajo: boolean
  /** El agua de los pozos con prueba, bbl/d, y el crudo que trae cada barril de agua. */
  agua: number
  crudoPorAgua: number
  /** Un campo de gas: la tubería de crudo no es lo que lo limita y la del gas
   *  espera (U2 §1.5; PLAN-MAESTRO §3). No da holgura ni lo que limita. */
  campoDeGas: boolean
  /** Tramos sin capacidad que se pueda usar: no se inventan y se dice. */
  sinDato: ChokeCampo[]
  explicacion?: string
  /** La frase de abajo de la tubería (U2 §1.5). */
  texto: string
  /** «Qué limita hoy: los pozos (11.360 bbl/d)» (U2 §2.4, Turno). */
  textoCorto: string
}

/** Cómo se dice lo que da ampliar el tren que limita. */
const TREN_FRASE: Record<TrenPlanta, string> = { crudo: 'el tren de crudo', agua: 'el agua', gas: 'el gas' }

/** Los potenciales de los tramos de un campo en el instante `t` (CHOKE-COMPLETO §3):
 *  - pozos = Σ crudo asignado de los pozos con prueba (la base del libro);
 *  - planta = el menor de los trenes medidos en crudo, con la capacidad instalada;
 *  - afuera = la capacidad de evacuación declarada; el mercado, subnivel.
 *  Lo que limita es el menor; un empate al barril pide explicación y dos a
 *  menos del umbral están «casi iguales». Un campo de gas no tiene tubería de
 *  crudo: se dice y no se da holgura. */
export function potencialesDelCampo(campoId: string, t: number, ctx: Contexto): PotencialesCampo {
  let pozos = 0, agua = 0
  for (const p of pozosDe(campoId)) if (p.pruebas.length) { pozos += crudoAsignado(p, t); agua += aguaDePrueba(p, t) }
  const umbral = PARAMETROS_CHOKE.umbralCasiIguales
  const nombre = campoPorId(campoId).nombre
  const comun = { campoId, t, pozos, agua, crudoPorAgua: agua > 0 ? pozos / agua : 0, umbral }
  const sinTuberia = (campoDeGas: boolean, sinDato: ChokeCampo[], texto: string, textoCorto: string): PotencialesCampo => ({
    ...comun, planta: null, exportacion: null, sistema: null, dominante: null, empate: false, empatados: [], casiIguales: null,
    holgura: { pozos: null, planta: null, exportacion: null }, trenes: [], mercadoBajo: false, campoDeGas, sinDato, texto, textoCorto })
  if (CAMPOS_DE_GAS.includes(campoId)) return sinTuberia(true, [],
    `${nombre} es un campo de gas. La tubería del gas todavía no está: el gas tiene «una tolerancia diferente» (Edinson) y falta definir cómo se mide su potencial.`,
    'Campo de gas: su tubería todavía no está')
  const pl = Object.hasOwn(CAMPO_PLANTA, campoId) ? CAMPO_PLANTA[campoId] : undefined
  if (!pl) return sinTuberia(false, ['planta', 'exportacion'], `${nombre} no tiene esquema de planta registrado: sin él no se sabe qué limita.`,
    'Sin esquema de planta: no se sabe qué limita')
  const trenes = trenesDe(pl.caudales, pozos, agua, perfilDe(ctx.config, campoId).gas !== 'no', GAS_MEDIDO_EN.includes(campoId))
  const menor = trenes.filter(x => x.medido && x.enCrudo !== null).reduce<TrenTuberia | undefined>((a, x) => (!a || x.enCrudo! < a.enCrudo! ? x : a), undefined)
  const planta = menor?.enCrudo ?? null
  const exportacion = pl.chokes.evacuacion
  const d = dominanteDe({ pozos, planta: planta ?? Infinity, exportacion }, umbral)
  const mercado = pl.chokes.mercado
  const r: PotencialesCampo = { ...comun, planta, exportacion, sistema: d.sistema, dominante: d.dominante, empate: d.empate, empatados: d.empatados,
    casiIguales: d.casiIguales, holgura: { pozos: d.holgura.pozos, planta: planta === null ? null : d.holgura.planta, exportacion: d.holgura.exportacion },
    trenes, ...(menor ? { trenQueLimita: menor.tren } : {}), mercado, mercadoBajo: mercado < d.sistema, campoDeGas: false,
    sinDato: planta === null ? ['planta'] : [], ...(d.explicacion ? { explicacion: d.explicacion } : {}), texto: '', textoCorto: '' }
  return { ...r, ...textosDeHoy(r) }
}

/** Las frases de lo que limita hoy (U2 §1.5). */
function textosDeHoy(p: PotencialesCampo): { texto: string; textoCorto: string } {
  const dom = p.dominante ?? 'pozos'
  const valor = dom === 'pozos' ? p.pozos : dom === 'planta' ? p.planta ?? 0 : p.exportacion ?? 0
  const tren = dom === 'planta' && p.trenQueLimita ? ` · ${p.trenQueLimita}` : ''
  const textoCorto = `Qué limita hoy: ${SUJETO[dom]}${tren} (${n0(valor)} bbl/d)`
  const pct = (p.umbral * 100).toLocaleString('es-CO', { maximumFractionDigits: 1 })
  const mercado = p.mercadoBajo && p.mercado !== undefined ? ` El comprador recibe hasta ${n0(p.mercado)} bbl/d: es el mercado, un subnivel de afuera.` : ''
  const h = (k: ChokeCampo) => n0(p.holgura[k] ?? 0)
  if (p.empate) return { textoCorto, texto: `Dos tramos dan exactamente lo mismo: ${p.empatados.map(k => SUJETO[k]).join(' y ')}. Producción tiene que explicar por qué (lo pide el método).${mercado}` }
  if (p.casiIguales) return { textoCorto, texto: `${mayuscula(p.casiIguales.map(k => SUJETO[k]).join(' y '))} están casi iguales (menos de ${pct} % de diferencia): lo que se gane en uno lo frena el otro.${mercado}` }
  if (dom === 'planta') return { textoCorto, texto: `A los pozos les sobran ${h('pozos')} bbl/d: abrir más pozos no da nada. Lo que da es ampliar ${TREN_FRASE[p.trenQueLimita ?? 'crudo']}.${mercado}` }
  if (dom === 'exportacion') return { textoCorto, texto: `Afuera no reciben más: a los pozos les sobran ${h('pozos')} bbl/d. Lo que da es más nominación o más evacuación.${mercado}` }
  // Limitan los pozos: lo que le sobra al tramo siguiente (el de menos holgura).
  const sig = (['planta', 'exportacion'] as const).filter(k => p.holgura[k] !== null).sort((a, b) => p.holgura[a]! - p.holgura[b]!)[0]
  if (!sig) return { textoCorto, texto: `Limitan los pozos: lo que den de más pasa.${mercado}` }
  return { textoCorto, texto: sig === 'planta'
    ? `A la planta le sobran ${h('planta')} bbl/d: lo que den de más los pozos pasa, hasta ${h('planta')} bbl/d.${mercado}`
    : `Afuera reciben ${h('exportacion')} bbl/d más: lo que den de más los pozos pasa, hasta ${h('exportacion')} bbl/d.${mercado}` }
}

/* ───────────────────────── un día de un campo ───────────────────────── */

/** Un día de un campo frente a sus tres tramos. */
interface DiaCampo {
  dia: number
  horas: number
  real: number
  potencial: number
  diferido: number
  residuo: number
  /** Los potenciales del día, bbl/d: los pozos del libro, la planta y afuera del instante. */
  tasas: { pozos: number; planta: number | null; exportacion: number | null }
  /** Potencial del sistema del día, bbl: el menor de los tres, o el de los
   *  pozos si el real pasó la capacidad declarada (`superado`). */
  sistema: number
  /** Pozos − sistema, bbl: lo que no pasa aunque nada pare. */
  estructural: number
  /** Null sin tubería de crudo (campo de gas, sin esquema). */
  dominante: ChokeCampo | null
  empate: boolean
  casiIguales: ChokeCampo[] | null
  /** El real pasó la capacidad declarada del tramo que debía limitar. */
  superado?: { choke: ChokeCampo; capacidad: number }
}

/** Los días de un campo con dato fiscal, con el potencial de los pozos del
 *  libro de ese día (la misma cifra que suma el período) y la planta y afuera
 *  del instante en que empieza el día.
 *
 *  El dominante sale solo de los potenciales, como en la NSTA, nunca de lo
 *  real (si no, cambiaría con el ruido diario del fiscal). Pero un potencial es
 *  un máximo: si el real lo pasó, la capacidad declarada está corta. Ese día se
 *  avisa (`superado`; NSTA §5.4: un potencial que no cuadra se explica), no se
 *  separa nada estructural porque no se sabe cuánto es, y el sistema se mide
 *  contra los pozos. */
function diasDelCampo(campoId: string, d0: number, hh: number, ctx: Contexto): DiaCampo[] {
  const out: DiaCampo[] = []
  for (const x of porDia([campoId], new Date(d0), new Date(hh), ctx)) {
    // Sin fiscal, el día no entra ni en lo real ni en el potencial (igual que el libro).
    if (x.real === null || x.horas <= 0) continue
    const f = x.horas / 24
    const p = potencialesDelCampo(campoId, x.dia.getTime(), ctx)
    const pozosDia = x.potencial / f
    const base = { dia: x.dia.getTime(), horas: x.horas, real: x.real, potencial: x.potencial, diferido: x.diferido, residuo: x.residuo ?? 0,
      tasas: { pozos: pozosDia, planta: p.planta, exportacion: p.exportacion } }
    // Sin tubería de crudo no hay qué limite ni brecha estructural.
    if (p.dominante === null) { out.push({ ...base, sistema: x.potencial, estructural: 0, dominante: null, empate: false, casiIguales: null }); continue }
    const d = dominanteDe({ pozos: pozosDia, planta: p.planta ?? Infinity, exportacion: p.exportacion ?? Infinity })
    const capacidad = d.dominante === 'pozos' ? x.potencial : d.sistema * f
    const superado = d.dominante !== 'pozos' && x.real > capacidad + 1e-6
    const estructural = d.dominante !== 'pozos' && !superado ? Math.max(0, x.potencial - capacidad) : 0
    out.push({ ...base, sistema: x.potencial - estructural, estructural, dominante: d.dominante, empate: d.empate, casiIguales: d.casiIguales,
      ...(superado ? { superado: { choke: d.dominante, capacidad } } : {}) })
  }
  return out
}

/* ───────────────────────── la brecha por choke y por escalón ───────────────────────── */

/** La parada programada que cubre una causa programada: la del equipo
 *  intervenido que contiene el arranque de lo que la causó (la parada de la
 *  bomba, o el evento del propio pozo), con la misma regla que `causa-senal.ts`. */
function ventanaDe(t: Tramo, ctx: Contexto): ParadaProgramada | undefined {
  const c = t.causa
  const origen = c.evento && c.evento !== t.evento.id ? paradaPorId(c.evento)?.inicio : t.evento.inicio
  if (!origen) return undefined
  const t0 = Date.parse(origen)
  return ctx.config.programa.find(p => p.campoId === t.pozo.campoId && p.equipo === c.equipo && Date.parse(p.desde) <= t0 && t0 <= Date.parse(p.hasta))
}

/** El escalón de los barriles de un tramo (CHOKE-COMPLETO §7). Devuelve una o
 *  dos partes que suman exacto el tramo:
 *  - sin causa → sin clasificar; yacimiento → desarrollo;
 *  - programada → planeada; lo que pasó de su ventana es otro tramo, no
 *    planeado (§5.5: así no se esconde una falla bajo un mantenimiento; la
 *    NSTA lo dejaría en planeada y la ANH no lo dice: NO VERIFICADO);
 *  - restricción sin falla → capacidad: la evacuación (el tanque de crudo alto
 *    porque el despacho está limitado: en el demo, «despacho limitado por la
 *    nominación del oleoducto») y la nominación del comprador declarada;
 *  - frecuencia reducida por una causa del propio pozo → desempeño (el pozo
 *    produce por debajo de su prueba: levantamiento sin optimizar);
 *  - declarada en texto libre → sin clasificar: TRIM no sabe si fue falla,
 *    prueba o restricción, y no lo adivina;
 *  - lo demás, cierre o frecuencia reducida por una falla del levantamiento o
 *    de la planta → disponibilidad no planeada. Una parada de servicio se toma
 *    como falla: la señal dice que el equipo paró. Si fue una decisión
 *    comercial (el compresor de La Zarza cuando el comprador nomina menos), lo
 *    corrige una persona en el árbol. */
export function escalonesDe(t: Tramo, ch: ChokeDeParada | null, ctx: Contexto): Array<[EscalonOSinClasificar, number]> {
  const c = t.causa
  if (c.tipo === 'pendiente' || !ch) return [['sin-clasificar', t.bbl]]
  if (ch.choke === 'reservorio') return [['desarrollo', t.bbl]]
  if (c.tipo === 'programada') {
    const v = ventanaDe(t, ctx)
    const fin = v ? Date.parse(v.hasta) : undefined
    if (fin === undefined || t.fin.getTime() <= fin) return [['disponibilidad-planeada', t.bbl]]
    // El exceso, con el libro mismo: el tramo del evento después del fin de la ventana.
    const despues = tramosEntre([t.pozo.campoId], new Date(Math.max(fin, t.inicio.getTime())), t.fin, ctx).find(x => x.evento.id === t.evento.id)?.bbl ?? 0
    const exceso = Math.min(t.bbl, Math.max(0, despues))
    return [['disponibilidad-planeada', t.bbl - exceso], ['disponibilidad-no-planeada', exceso]]
  }
  const declarado = escalonDeDeclaracion(c)
  if (declarado === 'capacidad' || c.tipo === 'evacuacion') return [['capacidad', t.bbl]]
  if (declarado) return [[declarado, t.bbl]]
  if (t.evento.codigo === 'HZ' && c.equipo === t.pozo.id) return [['desempeno', t.bbl]]
  if (c.tipo === 'declarada') return [['sin-clasificar', t.bbl]]
  return [['disponibilidad-no-planeada', t.bbl]]
}

/** Un equipo con lo que se perdió por él. */
export interface EquipoBbl { equipo: string; bbl: number }

/** La brecha de un campo (o del conjunto) repartida por choke y por escalón. */
export interface BrechaCampoChoke {
  campoId: string
  /** Del libro: el potencial de los pozos, lo real del punto de medición oficial y su diferencia. */
  potencial: number
  real: number
  brecha: number
  /** Σ de los tramos del libro. */
  diferido: number
  porChoke: Record<ChokeOSinAsignar, number>
  porEscalon: Record<EscalonOSinClasificar, number>
  /** Los equipos de cada tramo, de mayor a menor (el elemento donde se originó). */
  porChokeEquipo: Record<ChokeOSinAsignar, EquipoBbl[]>
  /** Brecha − Σ por choke: lo que no explica ningún evento (el inventario de
   *  los días, el residuo del libro). Se muestra, nunca se reparte. */
  sinExplicar: number
  /** |sin explicar| ≤ 2,5 % del potencial: el umbral de cierre de la NSTA (§6.2, p. 38). */
  cuadra: boolean
  /** Barriles cuyo choke es una propuesta que espera a una persona (`ChokeDeParada.pregunta`). */
  porConfirmar: number
  /** Lo que el sistema no deja pasar aunque nada pare: Σ por día de
   *  (pozos − sistema) cuando lo que limita no son los pozos, bbl, y por el
   *  tramo que limitó. Es parte de la brecha del libro; no se suma aparte. */
  estructural: number
  estructuralPorChoke: Record<ChokeCampo, number>
  /** Potencial del sistema del período (potencial − estructural) y la brecha contra él. */
  potencialSistema: number
  brechaSistema: number
  /** Eficiencia de producción, %: real ÷ potencial del sistema (NSTA §5.3, ISO/TS 3250). */
  pe: number
  /** Disponibilidad no planeada ÷ potencial del sistema, %: lo que el norte busca bajar. */
  peNoPlaneada: number
  /** El tramo que más horas limitó en el período (null sin tubería de crudo), y las horas de cada uno. */
  dominante: ChokeCampo | null
  horasPorDominante: Record<ChokeCampo, number>
  /** Días en que el real pasó la capacidad declarada del tramo que debía limitar. */
  superado: Array<{ dia: Date; choke: ChokeCampo; capacidad: number; real: number }>
}

export interface BrechaChoke extends Omit<BrechaCampoChoke, 'campoId' | 'superado'> {
  desde: Date
  hasta: Date
  /** Cada choke repartido en sus escalones: la escalera de §7 dentro de cada tramo. */
  porChokeEscalon: Record<ChokeOSinAsignar, Record<EscalonOSinClasificar, number>>
  porCampo: BrechaCampoChoke[]
  superado: Array<{ campoId: string; dia: Date; choke: ChokeCampo; capacidad: number; real: number }>
  /** «La Ceiba se trabó sobre todo en la planta: 3.100 bbl de 4.200». */
  texto: string
  /** La brecha estructural en palabras, y los días con la capacidad declarada superada. */
  textoEstructural?: string
}

const DONDE_PERIODO: Record<ChokeAnh, string> = { reservorio: 'en el yacimiento', pozo: 'en los pozos', planta: 'en la planta', exportacion: 'afuera (oleoducto, transportador o cliente)' }

interface Acumulado {
  porChoke: Record<ChokeOSinAsignar, number>
  porEscalon: Record<EscalonOSinClasificar, number>
  cruce: Record<ChokeOSinAsignar, Record<EscalonOSinClasificar, number>>
  equipos: Record<ChokeOSinAsignar, Map<string, number>>
  porConfirmar: number
}
const acumulado = (): Acumulado => ({
  porChoke: ceros(CHOKES_Y_SIN_ASIGNAR), porEscalon: ceros(ESCALONES), porConfirmar: 0,
  cruce: Object.fromEntries(CHOKES_Y_SIN_ASIGNAR.map(k => [k, ceros(ESCALONES)])) as Acumulado['cruce'],
  equipos: Object.fromEntries(CHOKES_Y_SIN_ASIGNAR.map(k => [k, new Map<string, number>()])) as Acumulado['equipos'],
})
/** Suma un tramo a lo acumulado. */
function acumular(a: Acumulado, t: Tramo, ch: ChokeDeParada | null, partes: Array<[EscalonOSinClasificar, number]>) {
  const k: ChokeOSinAsignar = ch?.choke ?? 'sin-asignar'
  a.porChoke[k] += t.bbl
  for (const [e, bbl] of partes) { a.porEscalon[e] += bbl; a.cruce[k][e] += bbl }
  const eq = ch?.elemento ?? t.causa.equipo
  a.equipos[k].set(eq, (a.equipos[k].get(eq) ?? 0) + t.bbl)
  if (ch?.pregunta) a.porConfirmar += t.bbl
}

/** La brecha del libro repartida por choke y por escalón (CHOKE-COMPLETO §6–§8).
 *  Cada barril de cada tramo va a UN choke (el de su causa; «sin-asignar» si la
 *  causa no lo decide) y a un escalón. La identidad es EXACTA, por campo y en
 *  el conjunto:
 *
 *    potencial − real (libro) = Σ por choke + sin explicar = Σ por escalón + sin explicar
 *
 *  Si lo que limita no son los pozos, una parte de esa brecha es estructural
 *  (pozos − sistema): se separa, se dice y no se suma aparte; la brecha contra
 *  el potencial del sistema es la del libro menos la estructural. La pérdida
 *  (lo producido que no se vende) nunca entra: aquí solo hay tramos del libro. */
export function brechaPorChoke(campoIds: string[], desde: Date, hasta: Date, ctx: Contexto): BrechaChoke {
  const d0 = desde.getTime(), hh = Math.min(hasta.getTime(), ahora)
  const lb = libro(campoIds, desde, hasta, ctx)
  const total = acumulado()
  const porCampoAcc = new Map(campoIds.map(c => [c, acumulado()]))
  for (const t of lb.tramos) {
    const ch = chokeDeTramo(t, ctx)
    const partes = escalonesDe(t, ch, ctx)
    acumular(total, t, ch, partes)
    const a = porCampoAcc.get(t.pozo.campoId)
    if (a) acumular(a, t, ch, partes)
  }

  const porCampo: BrechaCampoChoke[] = campoIds.map(c => {
    const l = lb.porCampo.find(x => x.campoId === c)
    const dias = diasDelCampo(c, d0, hh, ctx)
    const estructuralPorChoke = ceros(ORDEN_CHOKE_CAMPO), horasPorDominante = ceros(ORDEN_CHOKE_CAMPO)
    for (const x of dias) if (x.dominante) { estructuralPorChoke[x.dominante] += x.estructural; horasPorDominante[x.dominante] += x.horas }
    return cifras(c, l?.potencial ?? 0, l?.real ?? 0, l?.diferido ?? 0, porCampoAcc.get(c) ?? acumulado(), estructuralPorChoke, horasPorDominante,
      dias.filter(x => x.superado).map(x => ({ dia: new Date(x.dia), choke: x.superado!.choke, capacidad: x.superado!.capacidad, real: x.real })))
  })

  const estructuralPorChoke = ceros(ORDEN_CHOKE_CAMPO), horasPorDominante = ceros(ORDEN_CHOKE_CAMPO)
  for (const x of porCampo) for (const k of ORDEN_CHOKE_CAMPO) { estructuralPorChoke[k] += x.estructuralPorChoke[k]; horasPorDominante[k] += x.horasPorDominante[k] }
  const { campoId: _, superado: __, ...todo } = cifras('', lb.potencial, lb.real, porCampo.reduce((a, x) => a + x.diferido, 0), total, estructuralPorChoke, horasPorDominante, [])
  const superado = porCampo.flatMap(x => x.superado.map(s => ({ campoId: x.campoId, ...s }))).sort((a, b) => a.dia.getTime() - b.dia.getTime())
  const quien = campoIds.length === 1 ? campoPorId(campoIds[0]!).nombre : 'El conjunto de campos'
  const mayor = ORDEN_CHOKE.reduce((a, k) => (todo.porChoke[k] > todo.porChoke[a] ? k : a), 'pozo' as ChokeAnh)
  const texto = todo.diferido > 0 && todo.porChoke[mayor] > 0
    ? `${quien} se trabó sobre todo ${DONDE_PERIODO[mayor]}: ${n0(todo.porChoke[mayor])} bbl de ${n0(todo.diferido)}`
    : `${quien} no tuvo paradas que costaran crudo en el período`
  const textoEstructural = textoDeEstructural(todo.estructural, estructuralPorChoke, superado)
  return { ...todo, desde, hasta, porChokeEscalon: total.cruce, porCampo, superado, texto, ...(textoEstructural ? { textoEstructural } : {}) }
}

/** Las cifras de un campo (o del conjunto) a partir de lo acumulado. */
function cifras(campoId: string, potencial: number, real: number, diferido: number, a: Acumulado,
  estructuralPorChoke: Record<ChokeCampo, number>, horasPorDominante: Record<ChokeCampo, number>,
  superado: BrechaCampoChoke['superado']): BrechaCampoChoke {
  const brecha = potencial - real
  const sumaChoke = CHOKES_Y_SIN_ASIGNAR.reduce((x, k) => x + a.porChoke[k], 0)
  const sinExplicar = brecha - sumaChoke
  const estructural = ORDEN_CHOKE_CAMPO.reduce((x, k) => x + estructuralPorChoke[k], 0)
  const potencialSistema = potencial - estructural
  const conHoras = ORDEN_CHOKE_CAMPO.filter(k => horasPorDominante[k] > 0)
  const dominante = conHoras.length ? conHoras.reduce((x, k) => (horasPorDominante[k] > horasPorDominante[x] ? k : x)) : null
  const porChokeEquipo = Object.fromEntries(CHOKES_Y_SIN_ASIGNAR.map(k => [k,
    [...a.equipos[k]].map(([equipo, bbl]) => ({ equipo, bbl })).filter(x => x.bbl > 0)
      .sort((x, y) => y.bbl - x.bbl || (x.equipo < y.equipo ? -1 : 1))])) as Record<ChokeOSinAsignar, EquipoBbl[]>
  return {
    campoId, potencial, real, brecha, diferido, porChoke: a.porChoke, porEscalon: a.porEscalon, porChokeEquipo, sinExplicar,
    cuadra: Math.abs(sinExplicar) <= 0.025 * Math.abs(potencial) + 1e-9, porConfirmar: a.porConfirmar,
    estructural, estructuralPorChoke, potencialSistema, brechaSistema: potencialSistema - real,
    pe: potencialSistema > 0 ? (real / potencialSistema) * 100 : 0,
    peNoPlaneada: potencialSistema > 0 ? (a.porEscalon['disponibilidad-no-planeada'] / potencialSistema) * 100 : 0,
    dominante, horasPorDominante, superado,
  }
}

/** La brecha estructural dicha en palabras, o por qué no se separó. */
function textoDeEstructural(estructural: number, porChoke: Record<ChokeCampo, number>, superado: BrechaChoke['superado']): string | undefined {
  const partes: string[] = []
  if (estructural >= 0.5) {
    const k = ORDEN_CHOKE_CAMPO.reduce((a, x) => (porChoke[x] > porChoke[a] ? x : a), 'planta' as ChokeCampo)
    partes.push(`${mayuscula(SUJETO[k])} no deja pasar todo lo que pueden dar los pozos: ${n0(estructural)} bbl de lo que no se produjo son de ahí, aunque nada pare. Ningún arreglo de equipos los recupera; solo más capacidad.`)
  }
  if (superado.length) {
    // Por campo y tramo: «La Ceiba, la planta: 16 días».
    const por = new Map<string, number>()
    for (const s of superado) por.set(`${s.campoId}|${s.choke}`, (por.get(`${s.campoId}|${s.choke}`) ?? 0) + 1)
    const cuales = [...por].map(([k, n]) => { const [c, ch] = k.split('|') as [string, ChokeCampo]; return `${campoPorId(c).nombre}, ${SUJETO[ch]}: ${n} ${n === 1 ? 'día' : 'días'}` })
    partes.push(`El real pasó la capacidad declarada (${cuales.join('; ')}): ese número está por debajo de lo que ya pasó y hay que revisarlo. Esos días no se separa nada estructural.`)
  }
  return partes.length ? partes.join(' ') : undefined
}

/** La eficiencia de producción de cada campo y del conjunto (CHOKE-COMPLETO §8). */
export interface EficienciaProduccion {
  campoId?: string
  real: number
  potencialSistema: number
  /** Real ÷ potencial del sistema, %. */
  pe: number
  /** Disponibilidad no planeada ÷ potencial del sistema, %. */
  peNoPlaneada: number
  /** El tramo que más horas limitó (null sin tubería de crudo). */
  dominante: ChokeCampo | null
}
/** PE y PE no planeada por campo y período: la misma cuenta de `brechaPorChoke`. */
export function eficienciaProduccion(campoIds: string[], desde: Date, hasta: Date, ctx: Contexto): { porCampo: EficienciaProduccion[]; total: EficienciaProduccion } {
  const b = brechaPorChoke(campoIds, desde, hasta, ctx)
  const de = (x: Pick<BrechaCampoChoke, 'real' | 'potencialSistema' | 'pe' | 'peNoPlaneada' | 'dominante'>) =>
    ({ real: x.real, potencialSistema: x.potencialSistema, pe: x.pe, peNoPlaneada: x.peNoPlaneada, dominante: x.dominante })
  return { porCampo: b.porCampo.map(x => ({ campoId: x.campoId, ...de(x) })), total: de(b) }
}

/* ───────────────────────── la tubería del campo, para las vistas ───────────────────────── */

/** De dónde sale el número de un tramo (U2 §11.1): de las pruebas, del demo
 *  sin firmar, de la configuración firmada, o no hay. */
export type EstadoTramo = 'pruebas' | 'demo' | 'firmado' | 'sin-firmar' | 'sin-dato'

/** Un tramo de la tubería del campo (U2 §2 y §11.1). */
export interface TramoTuberia {
  tramo: ChokeAnh
  nombre: string
  explica: string
  /** Lo que puede dejar pasar, bbl/d de crudo. Null: el yacimiento (va con los
   *  pozos), sin dato, o un campo de gas. */
  potencialBpd: number | null
  fuente: string
  estado: EstadoTramo
  /** Lo que le sobra sobre el que limita, bbl/d. */
  holguraBpd: number | null
  limita: boolean
  casiIgual: boolean
  /** La planta por dentro: un carril por tren. */
  trenes?: TrenTuberia[]
  /** Lo que queda hoy con un equipo parado. El tramo NO se angosta: su alto
   *  sigue siendo la capacidad instalada (NSTA p. 29); esto solo dice cuánto queda. */
  disponibleHoy?: { valor: number; unidad: string; equipo: string; texto: string }
  /** Afuera por dentro: el oleoducto y el cliente. */
  subniveles?: Array<{ nombre: string; potencialBpd: number; fuente: string }>
  /** Perdiéndose ahora en este tramo, bbl/d, y lo que se perdió en el período, bbl. */
  perdiendoAhoraBpd: number
  perdidoBbl: number
  equiposTop: EquipoBbl[]
}

/** La tubería de un campo en una sola lectura (U2 §11.1, `TuberiaCampo`). */
export interface TuberiaCampo {
  campoId: string
  desde: Date
  hasta: Date
  tramos: TramoTuberia[]
  limita: ChokeCampo | null
  casiIguales: ChokeCampo[] | null
  umbral: number
  empate: boolean
  /** El crudo que sale ahora (`caudalesAhora`). */
  pasaHoyBpd: number
  /** Lo que se pierde ahora, por tramo y equipo (null = sin identificar). */
  perdiendoAhora: Array<{ tramo: ChokeAnh | null; bpd: number; equipo: string; pozos: number }>
  /** Lo que se perdió en el período por tramo, con los equipos que más pesan. */
  perdidoPeriodo: Array<{ tramo: ChokeAnh; bbl: number; equiposTop: EquipoBbl[] }>
  /** «Sin identificar»: no es un tramo, es lo que todavía no se sabe (U2 §2.3). */
  sinTramoBbl: number
  sinTramoEquipos: EquipoBbl[]
  /** El diferido del libro: Σ perdido por tramo + sin identificar (U2 §0, principio 6). */
  diferido: number
  campoDeGas: boolean
  /** «Qué limita hoy: los pozos (11.360 bbl/d)» y la frase de abajo (U2 §1.5). */
  textoCorto: string
  frase: string
  /** La frase del gerente: dónde se trabó en el período, con sus equipos (U2 §3). */
  fraseGerente: string
}

/** Lo que se pierde ahora, pozo por pozo, juntado por tramo y equipo: la misma
 *  cuenta de `riesgoAhora` (crudo asignado de cada pozo con un evento abierto,
 *  la parte que pierde si está a frecuencia reducida), con el tramo de su causa. */
function perdiendoPorTramo(campoId: string, ctx: Contexto): TuberiaCampo['perdiendoAhora'] {
  const por = new Map<string, TuberiaCampo['perdiendoAhora'][number]>()
  for (const p of pozosDe(campoId)) {
    const e = estadoAhora(p)
    if (!e.evento) continue
    const c = causaDeEvento(e.evento, ctx)
    const ch = chokeDeCausa(c, campoId, ctx)
    const tramo = ch?.choke ?? null, equipo = ch?.elemento ?? c.equipo
    const k = `${tramo}|${equipo}`
    const x = por.get(k) ?? { tramo, bpd: 0, equipo, pozos: 0 }
    x.bpd += crudoAsignado(p) * (e.produce ? perdidaPorFrecuencia(e.hz, pruebaEn(p, ahora)?.hz) : 1)
    x.pozos++
    por.set(k, x)
  }
  return [...por.values()].sort((a, b) => b.bpd - a.bpd)
}

/** El tramo de una fila de `riesgoAhora` (U2 §11.1, «perdiéndose ahora por
 *  tramo»). Perdiendo: el de la causa de los pozos que la fila junta; si juntara
 *  dos tramos (una baja tensión de un pozo y una de la red tienen el mismo
 *  equipo), el que más pierde. En riesgo: el del equipo, donde se trabaría si
 *  falla. Null: sin identificar. */
export function tramoDeRiesgo(r: Riesgo, ctx: Contexto): ChokeAnh | null {
  if (r.estado === 'perdiendo') {
    const por = new Map<ChokeAnh | null, number>()
    for (const p of pozosDe(r.campoId)) {
      const e = estadoAhora(p)
      if (!e.evento) continue
      const c = causaDeEvento(e.evento, ctx)
      if (c.equipo !== r.equipo || c.tipo !== r.tipo) continue
      const k = chokeDeCausa(c, r.campoId, ctx)?.choke ?? null
      por.set(k, (por.get(k) ?? 0) + crudoAsignado(p) * (e.produce ? perdidaPorFrecuencia(e.hz, pruebaEn(p, ahora)?.hz) : 1))
    }
    let mejor: ChokeAnh | null = null, max = -1
    for (const [k, v] of por) if (v > max) { mejor = k; max = v }
    return mejor
  }
  return elementoDe(r.campoId, r.equipo, ctx)?.choke ?? chokePorTipo(r.tipo)
}

/** Lo que queda hoy del tren de agua con una bomba parada: las bombas en
 *  marcha (una sin instrumento se cuenta en marcha: TRIM no la ve parar). */
function aguaDisponibleHoy(campoId: string): TramoTuberia['disponibleHoy'] | undefined {
  const tren = Object.hasOwn(TREN_AGUA, campoId) ? TREN_AGUA[campoId] : undefined
  if (!tren) return undefined
  const enServicio = tren.bombas.filter(b => !b.reserva)
  const paradas = enServicio.filter(b => perfilBomba(b.id, campoId) && paradasDe(b.id, campoId).some(e => !e.fin))
  if (!paradas.length) return undefined
  const total = enServicio.reduce((a, b) => a + b.capacidadBpd, 0)
  const valor = total - paradas.reduce((a, b) => a + b.capacidadBpd, 0)
  const equipo = paradas.map(b => b.id).join(', ')
  return { valor, unidad: 'bbl/d de agua', equipo, texto: `hoy, sin ${equipo}: ${n0(valor)} de ${n0(total)} bbl/d de agua` }
}

/** La tubería de un campo para las vistas, en una sola lectura (U2 §11.1):
 *  los tramos de hoy con lo que limita, lo que pasa ahora, lo que se está
 *  perdiendo por tramo y lo que se perdió en el período por tramo, con el
 *  MISMO total del libro. Se cumplen los dos cuadres de U2 §2.2: lo que deja
 *  pasar el tramo que limita − lo que pasa hoy = perdiéndose ahora (si limitan
 *  los pozos), y el reparto por tramo + sin identificar = el diferido del libro. */
export function tuberiaCampo(campoId: string, desde: Date, hasta: Date, ctx: Contexto): TuberiaCampo {
  const p = potencialesDelCampo(campoId, ahora, ctx)
  const b = brechaPorChoke([campoId], desde, hasta, ctx)
  const ahoraPorTramo = perdiendoPorTramo(campoId, ctx)
  const pl = Object.hasOwn(CAMPO_PLANTA, campoId) ? CAMPO_PLANTA[campoId] : undefined
  const enTramo = (k: ChokeAnh) => ahoraPorTramo.filter(x => x.tramo === k).reduce((a, x) => a + x.bpd, 0)
  const tramo = (k: ChokeAnh, x: Pick<TramoTuberia, 'potencialBpd' | 'fuente' | 'estado'> & Partial<TramoTuberia>): TramoTuberia => ({
    tramo: k, nombre: NOMBRE_CHOKE[k], explica: EXPLICA_TRAMO[k], holguraBpd: null, limita: false, casiIgual: false,
    perdiendoAhoraBpd: enTramo(k), perdidoBbl: b.porChoke[k], equiposTop: b.porChokeEquipo[k].slice(0, 3), ...x })
  const casi = (k: ChokeCampo) => !!p.casiIguales?.includes(k)
  const disponible = aguaDisponibleHoy(campoId)
  const tramos: TramoTuberia[] = [
    tramo('reservorio', { potencialBpd: null, estado: 'sin-dato', fuente: 'El yacimiento no tiene un número propio: lo que puede dar se mide con las pruebas de los pozos' }),
    tramo('pozo', { potencialBpd: p.pozos, estado: 'pruebas', fuente: 'Σ prueba vigente × factor de asignación del mes de los pozos con prueba',
      holguraBpd: p.holgura.pozos, limita: p.dominante === 'pozos', casiIgual: casi('pozos') }),
    tramo('planta', { potencialBpd: p.planta, estado: p.planta === null ? 'sin-dato' : 'demo',
      fuente: p.campoDeGas ? 'Campo de gas: la tubería del gas todavía no está' : pl ? 'El menor de los trenes medidos (crudoCap y aguaCap del esquema), con el agua pasada a crudo con las pruebas; el gas no se mide en esta fase. Dato del demo, sin firmar' : 'Sin esquema de planta',
      holguraBpd: p.holgura.planta, limita: p.dominante === 'planta', casiIgual: casi('planta'), trenes: p.trenes,
      ...(disponible && !p.campoDeGas ? { disponibleHoy: disponible } : {}) }),
    tramo('exportacion', { potencialBpd: p.exportacion, estado: p.exportacion === null ? 'sin-dato' : 'demo',
      fuente: p.campoDeGas ? 'Campo de gas: la tubería del gas todavía no está' : pl ? 'Capacidad de evacuación del esquema (Chokes.evacuacion). Dato del demo, sin firmar' : 'Sin esquema de planta',
      holguraBpd: p.holgura.exportacion, limita: p.dominante === 'exportacion', casiIgual: casi('exportacion'),
      ...(pl && !p.campoDeGas ? { subniveles: [
        { nombre: 'El oleoducto o el transportador', potencialBpd: pl.chokes.evacuacion, fuente: 'Chokes.evacuacion: dato del demo, sin firmar' },
        { nombre: 'El terminal o el cliente (mercado)', potencialBpd: pl.chokes.mercado, fuente: 'Chokes.mercado: subnivel de afuera; no baja su potencial (NSTA p. 29)' },
      ] } : {}) }),
  ]
  const nombre = campoPorId(campoId).nombre
  const sinTramoBbl = b.porChoke['sin-asignar']
  const mayor = ORDEN_CHOKE.reduce((a, k) => (b.porChoke[k] > b.porChoke[a] ? k : a), 'pozo' as ChokeAnh)
  const pct = (x: number) => Math.round((x / b.diferido) * 100)
  const fraseGerente = b.diferido <= 0 ? `Nada se trabó en ${nombre} en el período.`
    : `${nombre}: ${pct(b.porChoke[mayor])} % ${DONDE_PERIODO[mayor]}${b.porChokeEquipo[mayor].length ? ` (${b.porChokeEquipo[mayor].slice(0, 2).map(x => x.equipo).join(', ')})` : ''}${sinTramoBbl > 0 ? `; ${pct(sinTramoBbl)} % sin identificar` : ''}`
  return {
    campoId, desde, hasta, tramos, limita: p.dominante, casiIguales: p.casiIguales, umbral: p.umbral, empate: p.empate,
    pasaHoyBpd: caudalesAhora(campoId).crudo, perdiendoAhora: ahoraPorTramo,
    perdidoPeriodo: ORDEN_CHOKE.map(k => ({ tramo: k, bbl: b.porChoke[k], equiposTop: b.porChokeEquipo[k].slice(0, 3) })),
    sinTramoBbl, sinTramoEquipos: b.porChokeEquipo['sin-asignar'], diferido: b.diferido, campoDeGas: p.campoDeGas,
    textoCorto: p.textoCorto, frase: p.texto, fraseGerente,
  }
}

/* ───────────────────────── mes a mes y contra la línea base ───────────────────────── */

/** Lo no planeado de cada tramo: todo menos lo planeado dentro de su ventana
 *  (lo sin identificar es no planeado, como en el libro). */
const noPlaneadoPorTramo = (b: Pick<BrechaChoke, 'porChoke' | 'porChokeEscalon'>) =>
  Object.fromEntries(CHOKES_Y_SIN_ASIGNAR.map(k => [k, b.porChoke[k] - b.porChokeEscalon[k]['disponibilidad-planeada']])) as Record<ChokeOSinAsignar, number>

/** Lo perdido en un mes, por tramo (U2 §7.4, `MesLibro.porTramo`). */
export interface MesPorTramo {
  mes: string
  desde: Date
  hasta: Date
  /** El mes no está publicado en todos los campos. */
  parcial: boolean
  porTramo: Record<ChokeOSinAsignar, number>
  noPlaneado: Record<ChokeOSinAsignar, number>
  /** El diferido del libro del mes: Σ por tramo. */
  diferido: number
}
/** El reparto por tramo de cada mes del calendario, con los mismos meses de
 *  `serieMensual` (libro.ts) y el mismo total. */
export function repartoPorMes(campoIds: string[], ctx: Contexto): MesPorTramo[] {
  return calendario().map(m => {
    const b = brechaPorChoke(campoIds, new Date(m.desde), new Date(m.hasta), ctx)
    return { mes: m.mes, desde: new Date(m.desde), hasta: new Date(m.hasta), parcial: !publicadoEnTodos(campoIds, m.mes),
      porTramo: b.porChoke, noPlaneado: noPlaneadoPorTramo(b), diferido: b.diferido }
  })
}

/** Una cifra por día, antes y en el período, y su cambio. */
export interface AntesYDespues { baseDia: number; periodoDia: number; cambio: number | null }
/** «Antes → con TRIM» por tramo (U2 §7.3, `LineaBase.porTramo`). */
export interface LineaBasePorTramo {
  base: { desde: Date; hasta: Date; nombre: string }
  periodo: { desde: Date; hasta: Date }
  /** Lo no planeado por día de cada tramo: lo que pide CHOKE-COMPLETO §11. */
  noPlaneado: Record<ChokeOSinAsignar, AntesYDespues>
  /** Todo lo perdido por día de cada tramo. */
  diferido: Record<ChokeOSinAsignar, AntesYDespues>
  /** Las dos flechas, la que baja y la que sube: «bajó lo de la planta y subió lo de los pozos». */
  texto: string
}
/** La línea base por tramo: la misma base de `lineaBase` (libro.ts, los tres
 *  meses publicados antes del período) repartida por tramo. Sin tres meses de
 *  historia, no hay base. */
export function lineaBasePorTramo(campoIds: string[], desde: Date, hasta: Date, ctx: Contexto): LineaBasePorTramo | undefined {
  const lb = lineaBase(campoIds, desde, hasta, ctx)
  if (!lb) return undefined
  const b0 = brechaPorChoke(campoIds, lb.desde, lb.hasta, ctx), b1 = brechaPorChoke(campoIds, desde, hasta, ctx)
  const dias = (a: Date, z: Date) => Math.max(1e-9, (Math.min(z.getTime(), ahora) - a.getTime()) / D)
  const d0 = dias(lb.desde, lb.hasta), d1 = dias(desde, hasta)
  const fila = (x: number, y: number): AntesYDespues => ({ baseDia: x / d0, periodoDia: y / d1, cambio: x > 0 ? (y / d1 - x / d0) / (x / d0) : null })
  const np0 = noPlaneadoPorTramo(b0), np1 = noPlaneadoPorTramo(b1)
  const noPlaneado = Object.fromEntries(CHOKES_Y_SIN_ASIGNAR.map(k => [k, fila(np0[k], np1[k])])) as Record<ChokeOSinAsignar, AntesYDespues>
  const diferido = Object.fromEntries(CHOKES_Y_SIN_ASIGNAR.map(k => [k, fila(b0.porChoke[k], b1.porChoke[k])])) as Record<ChokeOSinAsignar, AntesYDespues>
  const quien = campoIds.length === 1 ? `En ${campoPorId(campoIds[0]!).nombre}` : 'En el conjunto de campos'
  const bajo = ORDEN_CHOKE.filter(k => (noPlaneado[k].cambio ?? 0) < 0).map(k => DONDE_PERIODO[k])
  const subio = ORDEN_CHOKE.filter(k => (noPlaneado[k].cambio ?? 0) > 0).map(k => DONDE_PERIODO[k])
  const texto = !bajo.length && !subio.length ? `${quien} lo no planeado no cambió por tramo.`
    : `${quien} ${[bajo.length ? `bajó lo que se trabó ${lista(bajo)}` : '', subio.length ? `subió lo ${lista(subio)}` : ''].filter(Boolean).join(' y ')}.`
  return { base: { desde: lb.desde, hasta: lb.hasta, nombre: lb.nombre }, periodo: { desde, hasta }, noPlaneado, diferido, texto }
}

/* ───────────────────────── el choke en el tiempo ───────────────────────── */

/** Un día de la serie (CHOKE-COMPLETO §11; U2 §7.1). */
export interface DiaChoke {
  dia: Date
  /** Horas del día dentro del período (el de hoy, parcial). */
  horas: number
  /** Null si ningún campo tiene el fiscal de ese día (como `porDia`). */
  real: number | null
  potencial: number
  potencialSistema: number
  estructural: number
  diferido: number
  residuo: number | null
  porChoke: Record<ChokeOSinAsignar, number>
  porEscalon: Record<EscalonOSinClasificar, number>
  /** Por campo: lo que limitó ese día. Un campo sin fiscal o sin tubería de crudo no está. */
  dominante: Record<string, ChokeCampo>
  /** Por campo: los tramos casi iguales ese día, o null. */
  casiIguales: Record<string, ChokeCampo[] | null>
  /** Por campo: los potenciales del día, bbl/d. */
  potenciales: Record<string, { pozos: number; planta: number | null; exportacion: number | null }>
  /** Los campos donde el real pasó la capacidad declarada del tramo que debía limitar. */
  superado: Record<string, ChokeCampo>
}

/** El aviso «Cambió lo que limita» (U2 §7.2, `AvisoCambioLimita`): solo cuando
 *  el tramo nuevo gana por más del umbral de «casi iguales» y lo sostiene
 *  `diasParaCambio` días seguidos. `dia` es el primero de esos días. */
export interface CambioDominante { campoId: string; dia: Date; de: ChokeCampo; a: ChokeCampo; valorBpd: number; texto: string }

/** La serie diaria de lo que limitó y de la brecha por tramo y por escalón,
 *  con `porDia` y los tramos de cada día: cada día suma lo mismo que el libro de
 *  ese día y los días suman la brecha del período (`brechaPorChoke`). El aviso
 *  de cambio respeta el umbral y la persistencia (PARAMETROS_CHOKE); `vueltas`
 *  cuenta, por campo, los cambios del dominante sin ese filtro (U2 §7.1: sin
 *  él, La Ceiba cambiaría siete veces en trece meses). */
export function serieChoke(campoIds: string[], desde: Date, hasta: Date, ctx: Contexto): { dias: DiaChoke[]; cambios: CambioDominante[]; vueltas: Record<string, number> } {
  const d0 = desde.getTime(), hh = Math.min(hasta.getTime(), ahora)
  const dias = new Map<number, DiaChoke>()
  for (const x of porDia(campoIds, desde, hasta, ctx)) dias.set(x.dia.getTime(), {
    dia: x.dia, horas: x.horas, real: x.real, potencial: x.potencial, potencialSistema: 0, estructural: 0,
    diferido: x.diferido, residuo: x.residuo, porChoke: ceros(CHOKES_Y_SIN_ASIGNAR), porEscalon: ceros(ESCALONES),
    dominante: {}, casiIguales: {}, potenciales: {}, superado: {},
  })
  for (const c of campoIds) {
    for (const x of diasDelCampo(c, d0, hh, ctx)) {
      const d = dias.get(x.dia)
      if (!d) continue
      d.potencialSistema += x.sistema
      d.estructural += x.estructural
      d.potenciales[c] = x.tasas
      if (x.dominante) { d.dominante[c] = x.dominante; d.casiIguales[c] = x.casiIguales }
      if (x.superado) d.superado[c] = x.superado.choke
    }
    // Los tramos de cada día, con el libro mismo: el barril de cada día es el de `porDia`.
    for (const d of dias.values()) {
      const a = Math.max(d.dia.getTime(), d0), b = Math.min(d.dia.getTime() + D, hh)
      if (b <= a) continue
      for (const t of tramosEntre([c], new Date(a), new Date(b), ctx)) {
        const ch = chokeDeTramo(t, ctx)
        d.porChoke[ch?.choke ?? 'sin-asignar'] += t.bbl
        for (const [e, bbl] of escalonesDe(t, ch, ctx)) d.porEscalon[e] += bbl
      }
    }
  }
  const orden = [...dias.values()].sort((a, b) => a.dia.getTime() - b.dia.getTime())
  const { diasParaCambio } = PARAMETROS_CHOKE
  const cambios: CambioDominante[] = []
  const vueltas: Record<string, number> = {}
  for (const c of campoIds) {
    let vigente: ChokeCampo | undefined, anterior: ChokeCampo | undefined
    let racha: { k: ChokeCampo; desde: DiaChoke; dias: number } | undefined
    vueltas[c] = 0
    for (const d of orden) {
      const k = d.dominante[c]
      if (!k) continue
      if (anterior && k !== anterior) vueltas[c]++
      anterior = k
      // Casi iguales: no cuenta para ningún tramo (U2 §7.2).
      if (d.casiIguales[c]) { racha = undefined; continue }
      // El primer estado claro: no hay «antes» que avisar.
      if (vigente === undefined) { vigente = k; continue }
      if (k === vigente) { racha = undefined; continue }
      racha = racha?.k === k ? { ...racha, dias: racha.dias + 1 } : { k, desde: d, dias: 1 }
      if (racha.dias < diasParaCambio) continue
      const valorBpd = racha.desde.potenciales[c]?.[k] ?? 0
      cambios.push({ campoId: c, dia: racha.desde.dia, de: vigente, a: k, valorBpd,
        texto: `Cambió lo que limita en ${campoPorId(c).nombre}: desde el ${fechaCorta(racha.desde.dia)} ${k === 'pozos' ? 'limitan' : 'limita'} ${SUJETO[k]} (${n0(valorBpd)} bbl/d); antes, ${SUJETO[vigente]}. Cambian los equipos que más cuestan si fallan: revise «Si falla hoy».` })
      vigente = k
      racha = undefined
    }
  }
  cambios.sort((a, b) => a.dia.getTime() - b.dia.getTime() || a.campoId.localeCompare(b.campoId))
  return { dias: orden, cambios, vueltas }
}
