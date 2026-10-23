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
 *     iguales» (`potencialesDelCampo`, §3–§4; U2 §0, principio 7): los pozos
 *     con sus pruebas × el factor de medición, nunca con el factor de
 *     asignación del mes (D3);
 *   - cada día del libro frente a los tramos (`diasDelCampo`): lo estructural y
 *     el potencial del sistema;
 *   - el escalón de cada barril según la causa (`escalonDeCausa`, §7).
 *  El reparto de lo perdido por tramo y por escalón, la tubería del campo, la
 *  serie, el mes a mes y la línea base leen las filas de la ANH con su
 *  clasificación vigente: están en choke-reparto.ts (QA-A-01).
 *
 *  Nada de esto cambia el libro (`libro.ts`), el diferido (`diferido.ts`) ni la
 *  causa (`causa-senal.ts`): los lee y los reparte. En pantalla no se dice
 *  «choke»: se dice «¿Dónde se trabó?», «Qué limita hoy» y «Si falla hoy» (U2 §1).
 */
import type { Causa, Contexto, TipoCausa } from './causa-senal'
import type { CAUSAS_POZO } from './mensajes'
import { perfilDe, configEn, type Config, type ParadaProgramada, type Version } from './configuracion'
import {
  pozoDe, pozosDe, servicioPorId, serviciosDeCampo, eventosDeCampo, pruebaEn,
  LEVANTAMIENTO_NOMBRE, type EventoPozo,
} from './pozos'
import { perfilBomba, paradaPorId, PAPEL_NOMBRE } from './bombas'
import { CAMPO_PLANTA, CAMPOS_DE_GAS, type Elemento, type Simbolo } from './planta'
import {
  capacidadesDe, firmaDeCapacidades, trenesDePlanta, trenMenor, revisarCapacidades, capacidadesFirmadas,
  type TrenTuberia, type TrenPlanta, type CapacidadesVigentes, type FirmaCapacidades,
  type HallazgoCapacidad, type EntradaRevision,
} from './capacidades'
import { porDia, tramosEntre, tramosDeEvento, crudoAsignado, aguaDePrueba, calendario, type Tramo, type Dia } from './libro'
import { EQUIPOS, equipoEnCampo } from './equipos'
import { campoPorId } from './campos'
import { hayInsumos } from './insumos'
import { AHORA, fechaCorta, fechaHora } from './reloj'

export type { TrenTuberia, TrenPlanta }

/** El historial de versiones firmadas, de la más vieja a la vigente: con él,
 *  cada día usa las capacidades que regían ese día (U2 §8.5: «meses cerrados:
 *  no cambian»). Sin él, rige la configuración del contexto. */
export type Historial = ReadonlyArray<Pick<Version, 'version' | 'fecha' | 'por' | 'config'>>
/** La configuración que regía en el instante `t`. */
const configDe = (ctx: Contexto, t: number, versiones?: Historial): Config => (versiones?.length ? configEn(versiones, t) : ctx.config)

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

/** Un equipo del que el administrador contestó «Todavía no sé» a «¿A qué pozos
 *  sirve?» (U2 §8.2). Se firma en `Config.topologiaPorSaber`: el motor no
 *  adivina su tramo (ni por el tipo de falla): el paso 2 de sus paradas queda
 *  en «falta», con su pregunta, hasta que alguien lo diga. */
export interface ElementoPorSaber { elemento: string; campoId: string }

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
 *    fuera de «casi iguales», para avisar «Cambió lo que limita» (U2 §7.2);
 *  - `factorMedicion`: el factor fijo con que se leen las pruebas de los pozos
 *    para lo que limita (D3; QA-A-02): el sesgo del separador de prueba contra
 *    el punto oficial, medido en días sin restricción. Mientras no se mida y se
 *    firme por campo, 1. NUNCA el factor de asignación del mes: ese sale de lo
 *    que ya pasó por la planta y escondería lo que la limita. La @2 (22-oct) lo agregó. */
export const PARAMETROS_CHOKE = { version: 'choke.parametros@2', umbralCasiIguales: 0.03, diasParaCambio: 3, factorMedicion: 1 } as const

/** Los factores de medición medidos y firmados por campo. Vacío: ningún campo
 *  lo tiene todavía y rige el de `PARAMETROS_CHOKE` (1). */
const FACTOR_MEDICION_FIRMADO: Readonly<Record<string, number>> = {}
/** El factor de medición de un campo (D3): el firmado o, sin firma, 1. */
export const factorMedicion = (campoId: string): number =>
  (Object.hasOwn(FACTOR_MEDICION_FIRMADO, campoId) ? FACTOR_MEDICION_FIRMADO[campoId]! : PARAMETROS_CHOKE.factorMedicion)

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

/** ¿El pozo es de ese campo? Con los insumos del motor (el demo, el servidor).
 *  Sin ellos (el front con la fuente http) no se sabe: undefined, y esa regla
 *  la decide el servidor, que la vuelve a correr (sus 422 mandan). */
const pozoDelRegistro = (campoId: string, pozo: string): boolean | undefined => (hayInsumos() ? !!pozoDe(campoId, pozo) : undefined)

/** Lo que no deja firmar una topología. Las mismas reglas que tendrá el
 *  servidor (422): el choke guardado tiene que ser el que sale del alcance, un
 *  dedicado sirve a un solo pozo y un compartido a más de uno. `esPozoDe` dice
 *  si un pozo es del campo (por defecto, el registro de los insumos; quien no
 *  los tiene puede pasar el del catálogo). Es regla de los dos lados
 *  (`validarConfig`): no puede leer los insumos sin preguntar si están. */
export function validarTopologia(t: readonly ChokeDeElemento[], esPozoDe: (campoId: string, pozo: string) => boolean | undefined = pozoDelRegistro): string[] {
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
    if (x.campoId) for (const p of x.pozos ?? []) if (esPozoDe(x.campoId, p) === false) e.push(`${id}${donde}: el pozo ${p} no es de ese campo.`)
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
  /** Los que el administrador contestó «Todavía no sé»: su tramo no se adivina. */
  porSaber: Set<string>
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
  // «Todavía no sé» manda sobre lo que se derivaría del registro: no se adivina.
  const porSaber = new Set((ctx.config.topologiaPorSaber ?? []).filter(x => x.campoId === campoId).map(x => x.elemento))
  const lista = (firmadas.length ? [...vigentes.values()] : derivadaDe(campoId)).filter(e => !porSaber.has(e.elemento))
  const elementos = new Map<string, ChokeDeElemento>()
  for (const e of lista) elementos.set(e.elemento, { ...e, choke: chokeDeAlcance(e.alcance) })
  const r: Indice = { firmada: firmadas.length > 0, lista, elementos, porSaber }
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
/** Los equipos del campo de los que el administrador contestó «Todavía no sé». */
export const porSaberDelCampo = (campoId: string, ctx: Contexto): string[] => [...indiceDe(campoId, ctx).porSaber]
/** Con una topología firmada, lo que el registro tiene y la firma no (un
 *  equipo nuevo): espera su respuesta, sin perder lo firmado (U2 §8.3). Mientras
 *  tanto el tramo de su parada sale de la regla por tipo de causa, como antes de
 *  firmar nada. Sin topología firmada, ninguno: rige entera la del registro. */
export function sinResponderDe(campoId: string, ctx: Contexto): ElementoDerivado[] {
  const idx = indiceDe(campoId, ctx)
  if (!idx.firmada) return []
  return derivadaDe(campoId).filter(e => !idx.elementos.has(e.elemento) && !idx.porSaber.has(e.elemento))
}

/** La pregunta del paso 2 cuando TRIM no lo puede proponer: la contesta quien revisa, nunca el operador. */
export const PREGUNTA_ORIGEN = '¿Dónde se originó la parada: en el pozo, en la planta o afuera?'

/** El paso 2 de una parada cuyo equipo está «por saber» (U2 §4.2, «equipo sin
 *  topología»): no se adivina; queda en falta con su porqué y su pregunta. */
export function porSaberDe(c: Causa, campoId: string, ctx: Contexto): { elemento: string; porque: string; pregunta: string } | undefined {
  if (c.tipo === 'pendiente' || !indiceDe(campoId, ctx).porSaber.has(c.equipo)) return undefined
  return { elemento: c.equipo, pregunta: PREGUNTA_ORIGEN,
    porque: `Falta saber a qué pozos sirve ${c.equipo}: el administrador contestó «Todavía no sé» y TRIM no lo adivina` }
}

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
 *  P1 §1.3; lo ya clasificado conserva la suya). La @2 cambió la baja tensión de
 *  un solo pozo (U2 §4.4, caso 8). La @3 (22-oct): la declaración que dice que
 *  el comprador nominó menos es afuera, en el mercado (ZA-06; U2 §4.2, R2 §2.2),
 *  y el equipo del que el administrador contestó «Todavía no sé» no se adivina. */
export const REGLA_CHOKE = 'choke.topologia@3'

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

/* La declaración que nombra al comprador (o al cliente, o al transportador) Y
   la nominación: «El comprador nominó menos gas: se cerró el pozo» (La Zarza).
   Es una regla cerrada sobre dos palabras, no una lectura del texto: cualquier
   otra declaración libre sigue sin interpretarse. */
const MERCADO_QUIEN = /\b(?:comprador|cliente|transportador)(?![\p{L}\p{N}])/iu
// Sin `\b` al final: en JavaScript la «ó» no es letra para `\b`.
const MERCADO_QUE = /\bnomin(?:ó|o|aron|ación|acion)(?![\p{L}\p{N}])/iu
/** ¿Quien declaró dijo que el comprador nominó menos? Es el mercado: afuera, un
 *  subnivel de exportación, con responsable externo (U2 §4.2: ZA-06 → afuera;
 *  R2 §2.2, «Restricción nominación/entrega»). Lo propone TRIM y lo confirma una persona. */
export function esDeclaracionDeMercado(c: Causa): boolean {
  if (c.tipo !== 'declarada' || chipDe(c)) return false
  const t = c.declarado?.texto ?? c.texto
  return MERCADO_QUIEN.test(t) && MERCADO_QUE.test(t)
}
/** El escalón que dice el motivo cerrado de una declaración, si lo hay. La
 *  nominación del comprador es capacidad: restricción sin falla. */
export const escalonDeDeclaracion = (c: Causa): EscalonBrecha | undefined =>
  (c.tipo === 'declarada' ? chipDe(c)?.escalon ?? (esDeclaracionDeMercado(c) ? 'capacidad' : undefined) : undefined)

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
  // «Todavía no sé» (U2 §8.2): el administrador no sabe a qué pozos sirve el
  // equipo. Ni la topología derivada ni el tipo de falla lo adivinan: el paso 2
  // queda en falta, con su pregunta (`porSaberDe`).
  if (idx.porSaber.has(c.equipo)) return null
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
      // El comprador nominó menos: el mercado, afuera, con responsable externo.
      if (esDeclaracionDeMercado(c)) {
        const quien = c.declarado?.por?.split(' · ')[0]?.trim() || 'Quien declaró'
        return { ...base, choke: 'exportacion', subnivel: 'mercado', alcance: 'tercero', fuente: 'regla',
          porque: `${quien} dijo «${(c.declarado?.texto ?? c.texto).trim()}»: el comprador no recibió todo, así que es afuera, en el mercado` }
      }
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
      // Una bomba de la línea que paró: el porqué dice qué le pasó al pozo, con
      // la palabra «porque» (U2 §4.1–§4.2; B-11). La de disposición lo cierra
      // por el tanque de agua lleno; la multifásica, porque no mueve su producción.
      const parada = (c.tipo === 'reinyeccion' || c.tipo === 'transporte') && c.evento ? paradaPorId(c.evento) : undefined
      const papel = parada ? perfilBomba(c.equipo, campoId)?.papel : undefined
      const que = servidos !== undefined ? `${c.equipo} ${verboDe(c.equipo, campoId, c.tipo)} ${pozosTexto(servidos)}` : `${c.equipo} es de la planta`
      const porque = choke === 'pozo' ? `${c.equipo} le sirve solo a ${solo}: queda en el pozo`
        : choke === 'exportacion' ? deAfuera
          : parada && papel === 'disposicion' ? `${que}: el pozo se cerró porque el tanque de agua se llenó con ${c.equipo} parada (paró el ${fechaHora(new Date(parada.inicio))}), así que se trabó en la planta`
            : parada && papel === 'transporte' ? `${que}: el pozo paró porque ${c.equipo} dejó de moverle la producción (paró el ${fechaHora(new Date(parada.inicio))}), así que se trabó en la planta`
              : servidos !== undefined ? `${que}: ${seFrenan(servidos, paraOCae(c.tipo))}`
                : `${que}: ${seFrenan(undefined, paraOCae(c.tipo))}`
      return { ...base, choke, porque }
    }
  }
}

/* ───────────────────────── lo que limita al campo ───────────────────────── */

const D = 86_400_000
const H = 3_600_000
const ahora = AHORA.getTime()
/** «La planta» → «La planta»; «los pozos» → «Los pozos». */
export const mayuscula = (s: string) => (s ? `${s[0]!.toUpperCase()}${s.slice(1)}` : s)
/** Un registro con cada clave en cero. */
export const ceros = <K extends string>(ks: readonly K[]) => Object.fromEntries(ks.map(k => [k, 0])) as Record<K, number>
/** «LC-01, LC-02 y LC-03». */
export const listaY = lista
/** Para decirlo dentro de una frase: «limita la planta», «Qué limita hoy: los pozos». */
export const SUJETO: Record<ChokeCampo, string> = { pozos: 'los pozos', planta: 'la planta', exportacion: 'afuera' }

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

/** Los potenciales de un campo en un instante, en bbl/d de crudo. */
export interface PotencialesCampo {
  campoId: string
  /** El instante, en ms. */
  t: number
  /** Lo que pueden dar los pozos: Σ de la prueba vigente de los pozos con
   *  prueba × el factor de medición firmado (D3; CHOKE-COMPLETO §3). NUNCA el
   *  factor de asignación del mes: sale de lo que ya pasó por la planta, y con
   *  la planta limitando escondería lo que la limita (QA-A-02). Incluye el
   *  yacimiento, como la NSTA. Un pozo cerrado cuenta mientras pueda fluir;
   *  una frecuencia bajada no lo baja. */
  pozos: number
  /** Lo mismo con el factor de asignación del mes (prueba × factor): la cifra
   *  de Producción y del libro, que valora el diferido. Es otra pregunta
   *  («cuánto se asigna», no «cuánto pudo dar el pozo»): no decide lo que limita. */
  pozosAsignado: number
  /** El factor de medición con que se leyeron las pruebas (1 mientras no se firme). */
  factorMedicion: number
  /** El menor de los trenes MEDIDOS en crudo, con la capacidad instalada: no
   *  baja por una parada (NSTA p. 29). Null: sin tren medido, sin esquema o
   *  campo de gas. */
  planta: number | null
  /** Lo que deja salir el oleoducto o el transportador: la capacidad firmada o,
   *  sin firma, la del demo. Null sin esquema o en un campo de gas. */
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
  /** El subnivel mercado de afuera: lo que el comprador recibe. No baja el
   *  potencial de afuera (NSTA p. 29). */
  mercado?: number
  /** Las capacidades con que se calculó (firmadas o del demo), con su estado y su fuente. */
  capacidades: CapacidadesVigentes
  /** El comprador recibe menos de lo que el sistema puede dar. */
  mercadoBajo: boolean
  /** El agua de los pozos con prueba, bbl/d, y el crudo que trae cada barril de
   *  agua según las pruebas (la misma base de `pozos`). */
  agua: number
  crudoPorAgua: number
  /** Un campo de gas: la tubería de crudo no es lo que lo limita y la del gas
   *  espera (U2 §1.5; PLAN-MAESTRO §3). No da holgura ni lo que limita. */
  campoDeGas: boolean
  /** Tramos sin capacidad que se pueda usar: no se inventan y se dice. */
  sinDato: ChokeCampo[]
  /** Con empate al barril: la explicación firmada por producción con las
   *  capacidades (NSTA §5.4) o, sin ella, por qué el motor toma el primero de la tubería. */
  explicacion?: string
  /** La frase de abajo de la tubería (U2 §1.5). */
  texto: string
  /** «Qué limita hoy: los pozos (11.857 bbl/d)» (U2 §2.4, Turno). */
  textoCorto: string
}

/** Cómo se dice lo que da ampliar el tren que limita, y el tren mismo. */
export const TREN_FRASE: Record<TrenPlanta, string> = { crudo: 'el tren de crudo', agua: 'el agua', gas: 'el gas' }
export const TREN_NOMBRE: Record<TrenPlanta, string> = { crudo: 'tren de crudo', agua: 'agua', gas: 'gas' }

/* Las capacidades que rigen en un campo con una configuración: se piden por
   cada día de la serie y del reparto, y la configuración es casi siempre la misma. */
const CAPACIDADES = new WeakMap<Config, Map<string, CapacidadesVigentes>>()
function capacidadesEn(config: Config, campoId: string): CapacidadesVigentes {
  let m = CAPACIDADES.get(config)
  if (!m) CAPACIDADES.set(config, m = new Map())
  let c = m.get(campoId)
  if (!c) m.set(campoId, c = capacidadesDe(config, campoId))
  return c
}

/** Lo que dan los pozos según sus pruebas (× el factor de medición) y su agua,
 *  bbl/d, en el instante `t` (D3). Un pozo sin prueba no entra: no se le inventa caudal. */
function pruebasDelCampo(campoId: string, t: number): { pozos: number; agua: number } {
  const fm = factorMedicion(campoId)
  let pozos = 0, agua = 0
  for (const p of pozosDe(campoId)) if (p.pruebas.length) { pozos += (pruebaEn(p, t)?.crudoBpd ?? 0) * fm; agua += aguaDePrueba(p, t) }
  return { pozos, agua }
}

/** La planta y afuera de un campo con una configuración, con los trenes pasados
 *  a crudo con las pruebas. Sin tubería de crudo: campo de gas o sin esquema. */
function tramosDelCampo(campoId: string, config: Config, pozos: number, agua: number): {
  capacidades: CapacidadesVigentes; sinTuberia?: 'gas' | 'sin-esquema'; trenes: TrenTuberia[]; menor?: TrenTuberia; planta: number | null; exportacion: number | null
} {
  const capacidades = capacidadesEn(config, campoId)
  if (CAMPOS_DE_GAS.includes(campoId)) return { capacidades, sinTuberia: 'gas', trenes: [], planta: null, exportacion: null }
  const pl = Object.hasOwn(CAMPO_PLANTA, campoId) ? CAMPO_PLANTA[campoId] : undefined
  if (!pl) return { capacidades, sinTuberia: 'sin-esquema', trenes: [], planta: null, exportacion: null }
  const trenes = trenesDePlanta(capacidades, pozos, agua, perfilDe(config, campoId).gas !== 'no', pl.caudales)
  const menor = trenMenor(trenes)
  return { capacidades, trenes, ...(menor ? { menor } : {}), planta: menor?.enCrudo ?? null, exportacion: capacidades.afuera.valor }
}

/** Los potenciales de los tramos de un campo en el instante `t` (CHOKE-COMPLETO §3):
 *  - pozos = Σ prueba vigente × el factor de medición firmado (D3; sin el
 *    factor de asignación del mes, que sale de lo real y es la pregunta del libro);
 *  - planta = el menor de los trenes medidos en crudo, con la capacidad instalada
 *    (el agua se pasa a crudo con el corte de las mismas pruebas);
 *  - afuera = lo que deja salir el oleoducto o el transportador; el mercado, subnivel.
 *  Las capacidades son las firmadas (`Config.capacidades`) y, donde no se
 *  firmó, las del demo, con su estado (capacidades.ts). Con el historial de
 *  versiones, las que regían en `t`: firmar hoy no cambia un día cerrado.
 *  Lo que limita es el menor; un empate al barril pide explicación y dos a
 *  menos del umbral están «casi iguales». Un campo de gas no tiene tubería de
 *  crudo: se dice y no se da holgura. */
export function potencialesDelCampo(campoId: string, t: number, ctx: Contexto, versiones?: Historial): PotencialesCampo {
  const { pozos, agua } = pruebasDelCampo(campoId, t)
  let pozosAsignado = 0
  for (const p of pozosDe(campoId)) if (p.pruebas.length) pozosAsignado += crudoAsignado(p, t)
  const umbral = PARAMETROS_CHOKE.umbralCasiIguales
  const nombre = campoPorId(campoId).nombre
  const tr = tramosDelCampo(campoId, configDe(ctx, t, versiones), pozos, agua)
  const comun = { campoId, t, pozos, pozosAsignado, factorMedicion: factorMedicion(campoId), agua, crudoPorAgua: agua > 0 ? pozos / agua : 0, umbral, capacidades: tr.capacidades }
  const sinTuberia = (campoDeGas: boolean, sinDato: ChokeCampo[], texto: string, textoCorto: string): PotencialesCampo => ({
    ...comun, planta: null, exportacion: null, sistema: null, dominante: null, empate: false, empatados: [], casiIguales: null,
    holgura: { pozos: null, planta: null, exportacion: null }, trenes: [], mercadoBajo: false, campoDeGas, sinDato, texto, textoCorto })
  if (tr.sinTuberia === 'gas') return sinTuberia(true, [],
    `${nombre} es un campo de gas. La tubería del gas todavía no está: el gas tiene «una tolerancia diferente» (Edinson) y falta definir cómo se mide su potencial.`,
    'Campo de gas: su tubería todavía no está')
  if (tr.sinTuberia === 'sin-esquema') return sinTuberia(false, ['planta', 'exportacion'], `${nombre} no tiene esquema de planta registrado: sin él no se sabe qué limita.`,
    'Sin esquema de planta: no se sabe qué limita')
  const { trenes, menor, planta, exportacion, capacidades } = tr
  const d = dominanteDe({ pozos, planta: planta ?? Infinity, exportacion: exportacion ?? Infinity }, umbral)
  const mercado = capacidades.mercado.valor ?? undefined
  const sinDato: ChokeCampo[] = [...(planta === null ? ['planta' as const] : []), ...(exportacion === null ? ['exportacion' as const] : [])]
  const r: PotencialesCampo = { ...comun, planta, exportacion, sistema: d.sistema, dominante: d.dominante, empate: d.empate, empatados: d.empatados,
    casiIguales: d.casiIguales, holgura: { pozos: d.holgura.pozos, planta: planta === null ? null : d.holgura.planta, exportacion: exportacion === null ? null : d.holgura.exportacion },
    trenes, ...(menor ? { trenQueLimita: menor.tren } : {}), ...(mercado !== undefined ? { mercado } : {}), mercadoBajo: mercado !== undefined && mercado < d.sistema, campoDeGas: false,
    sinDato, ...(d.empate && capacidades.explicacionEmpate?.trim() ? { explicacion: capacidades.explicacionEmpate.trim() } : d.explicacion ? { explicacion: d.explicacion } : {}), texto: '', textoCorto: '' }
  return { ...r, ...textosDeHoy(r) }
}

/** Las frases de lo que limita hoy (U2 §1.5). */
function textosDeHoy(p: PotencialesCampo): { texto: string; textoCorto: string } {
  const dom = p.dominante ?? 'pozos'
  const valor = dom === 'pozos' ? p.pozos : dom === 'planta' ? p.planta ?? 0 : p.exportacion ?? 0
  const tren = dom === 'planta' && p.trenQueLimita ? ` · ${TREN_NOMBRE[p.trenQueLimita]}` : ''
  const textoCorto = `Qué limita hoy: ${SUJETO[dom]}${tren} (${n0(valor)} bbl/d)`
  const pct = (p.umbral * 100).toLocaleString('es-CO', { maximumFractionDigits: 1 })
  const mercado = p.mercadoBajo && p.mercado !== undefined ? ` El comprador recibe hasta ${n0(p.mercado)} bbl/d: es el mercado, un subnivel de afuera.` : ''
  const h = (k: ChokeCampo) => n0(p.holgura[k] ?? 0)
  // Un empate al barril lo explica producción por escrito, dentro de la firma de las capacidades (NSTA §5.4): si ya
  // está, se dice la suya; si no, se pide. El motor no inventa una explicación.
  const firmada = p.capacidades.explicacionEmpate?.trim()
  if (p.empate) return { textoCorto, texto: `Dos tramos dan exactamente lo mismo: ${p.empatados.map(k => SUJETO[k]).join(' y ')}. ${firmada ? `Por qué, según la firma: «${firmada}».` : 'Producción tiene que explicar por qué (lo pide el método).'}${mercado}` }
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
export interface DiaCampo {
  /** El comienzo del día operacional (la medianoche de Colombia), ms. */
  dia: number
  horas: number
  real: number
  /** El potencial del libro de ese día (prueba × factor de asignación del mes), bbl. */
  potencial: number
  diferido: number
  residuo: number
  /** Lo que dan los pozos según sus pruebas × el factor de medición, en las horas del día, bbl (D3). */
  potencialPruebas: number
  /** Los potenciales del día, bbl/d: los pozos (pruebas), la planta y afuera del comienzo del día, y el tren que manda en la planta. */
  tasas: { pozos: number; planta: number | null; exportacion: number | null; tren?: TrenPlanta }
  /** Potencial del sistema del día, bbl: el menor de los tres en las horas del
   *  día, o el de los pozos si el real pasó la capacidad declarada (`superado`). */
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

/** Un día del libro (`porDia`) frente a los tres tramos. El dominante sale
 *  solo de los potenciales, como en la NSTA, nunca de lo real (si no, cambiaría
 *  con el ruido diario del fiscal). Pero un potencial es un máximo: si el real
 *  lo pasó, la capacidad declarada está corta. Ese día se avisa (`superado`;
 *  NSTA §5.4: un potencial que no cuadra se explica), no se separa nada
 *  estructural porque no se sabe cuánto es, y el sistema se mide contra los pozos.
 *
 *  Convención (QA-A-14): un día operacional se mide con la configuración que
 *  regía en su medianoche; una capacidad firmada a mitad del día rige desde el
 *  día siguiente. Sin fiscal, el día no entra (igual que el libro). */
function diaCampoDe(campoId: string, x: Dia, ctx: Contexto, versiones?: Historial): DiaCampo | undefined {
  if (x.real === null || x.horas <= 0) return undefined
  const f = x.horas / 24, t = x.dia.getTime()
  const { pozos, agua } = pruebasDelCampo(campoId, t)
  const tr = tramosDelCampo(campoId, configDe(ctx, t, versiones), pozos, agua)
  const potencialPruebas = pozos * f
  const base = { dia: t, horas: x.horas, real: x.real, potencial: x.potencial, diferido: x.diferido, residuo: x.residuo ?? 0, potencialPruebas,
    tasas: { pozos, planta: tr.planta, exportacion: tr.exportacion, ...(tr.menor ? { tren: tr.menor.tren } : {}) } }
  // Sin tubería de crudo no hay qué limite ni brecha estructural.
  if (tr.sinTuberia) return { ...base, sistema: potencialPruebas, estructural: 0, dominante: null, empate: false, casiIguales: null }
  const d = dominanteDe({ pozos, planta: tr.planta ?? Infinity, exportacion: tr.exportacion ?? Infinity })
  const capacidad = d.sistema * f
  const superado = d.dominante !== 'pozos' && x.real > capacidad + 1e-6
  const estructural = d.dominante !== 'pozos' && !superado ? Math.max(0, potencialPruebas - capacidad) : 0
  return { ...base, sistema: potencialPruebas - estructural, estructural, dominante: d.dominante, empate: d.empate, casiIguales: d.casiIguales,
    ...(superado ? { superado: { choke: d.dominante, capacidad } } : {}) }
}

/* Los días de cada campo, una vez por contexto, historial y campo: la serie,
   el reparto de cada mes, la línea base y la tubería piden los mismos días
   (QA-A-15). Cada entrada es un día completo del calendario (el de hoy, hasta
   ahora); un período que corta un día a la mitad lo pide aparte. */
interface EntradaDia { dia: number; fin: number; x: DiaCampo | undefined }
const SIN_HISTORIAL: Historial = []
const DIAS = new WeakMap<Contexto, WeakMap<Historial, Map<string, EntradaDia[]>>>()
function diasCompletos(campoId: string, ctx: Contexto, versiones?: Historial): EntradaDia[] {
  let porV = DIAS.get(ctx)
  if (!porV) DIAS.set(ctx, porV = new WeakMap())
  const v = versiones?.length ? versiones : SIN_HISTORIAL
  let porCampo = porV.get(v)
  if (!porCampo) porV.set(v, porCampo = new Map())
  let ds = porCampo.get(campoId)
  if (!ds) {
    const cal = calendario()
    ds = cal.length ? porDia([campoId], new Date(cal[0]!.desde), AHORA, ctx).map(x => ({ dia: x.dia.getTime(), fin: x.dia.getTime() + x.horas * H, x: diaCampoDe(campoId, x, ctx, v) })) : []
    porCampo.set(campoId, ds)
  }
  return ds
}

/** Los días de un campo con dato fiscal en [d0, hh), frente a sus tres tramos:
 *  el potencial de los pozos de ese día (pruebas × factor de medición, D3), el
 *  del libro (la misma cifra que suma el período), y la planta y afuera del
 *  comienzo del día. Un día que el período corta se calcula con sus horas. */
export function diasDelCampo(campoId: string, d0: number, hh: number, ctx: Contexto, versiones?: Historial): DiaCampo[] {
  const out: DiaCampo[] = []
  for (const e of diasCompletos(campoId, ctx, versiones)) {
    if (e.fin <= d0 || e.dia >= hh) continue
    if (e.dia >= d0 && e.fin <= hh) { if (e.x) out.push(e.x); continue }
    for (const y of porDia([campoId], new Date(Math.max(e.dia, d0)), new Date(Math.min(e.fin, hh)), ctx)) {
      const z = diaCampoDe(campoId, y, ctx, versiones)
      if (z) out.push(z)
    }
  }
  return out
}

/* ───────────────────────── el escalón de cada barril ───────────────────────── */

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

/** El escalón que dice la causa de TRIM (CHOKE-COMPLETO §7), antes de lo que
 *  digan las personas:
 *  - sin causa → sin clasificar;
 *  - programada → planeada; lo que se pasó de su ventana (`exceso`) es no
 *    planeado (§5.5: así no se esconde una falla bajo un mantenimiento; la
 *    NSTA lo dejaría en planeada y la ANH no lo dice: NO VERIFICADO);
 *  - restricción sin falla → capacidad: la evacuación (el tanque de crudo alto
 *    porque el despacho está limitado: en el demo, «despacho limitado por la
 *    nominación del oleoducto») y la nominación del comprador declarada;
 *  - otro motivo cerrado de una declaración → el suyo;
 *  - frecuencia reducida por una causa del propio pozo → desempeño (el pozo
 *    produce por debajo de su prueba: levantamiento sin optimizar);
 *  - declarada en texto libre → sin clasificar: TRIM no sabe si fue falla,
 *    prueba o restricción, y no lo adivina;
 *  - lo demás, cierre o frecuencia reducida por una falla del levantamiento o
 *    de la planta → disponibilidad no planeada. Una parada de servicio se toma
 *    como falla: la señal dice que el equipo paró. Si fue una decisión
 *    comercial (el compresor de La Zarza cuando el comprador nomina menos), lo
 *    corrige una persona en el árbol.
 *  No depende del tramo: con el tramo sin saber («Todavía no sé»), el escalón
 *  sale igual de la causa (D5; QA-A-05). */
export function escalonDeCausa(c: Causa, parcial: boolean, pozo: string, exceso: boolean): EscalonOSinClasificar {
  if (c.tipo === 'pendiente') return 'sin-clasificar'
  if (c.tipo === 'programada') return exceso ? 'disponibilidad-no-planeada' : 'disponibilidad-planeada'
  const declarado = escalonDeDeclaracion(c)
  if (declarado === 'capacidad' || c.tipo === 'evacuacion') return 'capacidad'
  if (declarado) return declarado
  if (parcial && c.equipo === pozo) return 'desempeno'
  if (c.tipo === 'declarada') return 'sin-clasificar'
  return 'disponibilidad-no-planeada'
}

/** El escalón de los barriles de un tramo del libro, con la causa de TRIM
 *  (`escalonDeCausa`). Devuelve una o dos partes que suman exacto el tramo: una
 *  programada que se pasó de su ventana se parte en lo planeado y el exceso. El
 *  yacimiento (`ch.choke` reservorio, que solo pone una persona) es desarrollo.
 *  Lo que dicen las personas en la clasificación lo lee el reparto por filas
 *  (`escalonDeFila`, choke-reparto.ts). */
export function escalonesDe(t: Tramo, ch: ChokeDeParada | null, ctx: Contexto): Array<[EscalonOSinClasificar, number]> {
  const c = t.causa
  if (ch?.choke === 'reservorio') return [['desarrollo', t.bbl]]
  if (c.tipo === 'programada') {
    const v = ventanaDe(t, ctx)
    const fin = v ? Date.parse(v.hasta) : undefined
    if (fin === undefined || t.fin.getTime() <= fin) return [['disponibilidad-planeada', t.bbl]]
    // El exceso, con el libro mismo: el tramo del evento después del fin de la ventana.
    const despues = tramosEntre([t.pozo.campoId], new Date(Math.max(fin, t.inicio.getTime())), t.fin, ctx).find(x => x.evento.id === t.evento.id)?.bbl ?? 0
    const exceso = Math.min(t.bbl, Math.max(0, despues))
    return [['disponibilidad-planeada', t.bbl - exceso], ['disponibilidad-no-planeada', exceso]]
  }
  return [[escalonDeCausa(c, t.evento.codigo === 'HZ', t.pozo.id, false), t.bbl]]
}

/* ───────────────────────── lo que leen las vistas ───────────────────────── */

/** Un equipo con lo que se perdió por él. Si sus barriles vienen de causas de
 *  distinto tipo (LC-04: su electrosumergible y una baja tensión que lo tumbó
 *  solo a él), `porTipo` las dice, de mayor a menor (B-12). */
export interface EquipoBbl { equipo: string; bbl: number; porTipo?: Array<{ tipo: TipoCausa; bbl: number }> }

/** La brecha de un campo (o del conjunto) repartida por choke y por escalón. */
export interface BrechaCampoChoke {
  campoId: string
  /** Del libro: el potencial de los pozos (prueba × factor de asignación), lo
   *  real del punto de medición oficial y su diferencia. */
  potencial: number
  real: number
  brecha: number
  /** Σ de los barriles de las filas de la ANH del período (los del libro). */
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
  /** Barriles contados en un tramo que todavía es la propuesta de TRIM y espera
   *  a una persona: el paso 2 en falta (el tanque de crudo: «¿el oleoducto
   *  recibía?») o con la pregunta del motor sin contestar. Lo avalado o dicho
   *  por una persona ya no cuenta. */
  porConfirmar: number
  /** Lo que dan los pozos según sus pruebas × el factor de medición en los días
   *  con fiscal, bbl (D3): la base de lo que limita, lo estructural y la PE. */
  potencialPruebas: number
  /** Pruebas − libro, bbl: lo que las pruebas dicen de más que el punto oficial
   *  (el factor de asignación del mes). Sesgo de medición o desempeño de los
   *  pozos, sin separar mientras el factor de medición sea 1. No es de ninguna parada. */
  brechaPruebas: number
  /** Lo que el sistema no deja pasar aunque nada pare: Σ por día de
   *  (pozos − sistema) cuando lo que limita no son los pozos, bbl, y por el
   *  tramo que limitó. */
  estructural: number
  estructuralPorChoke: Record<ChokeCampo, number>
  /** Potencial del sistema del período (pruebas − estructural, D3) y la brecha
   *  contra él. Identidad exacta (QA-A-06): potencial del sistema − real =
   *  Σ por tramo + sin explicar + brecha de las pruebas − estructural. */
  potencialSistema: number
  brechaSistema: number
  /** De lo diferido, lo que no le costó al campo: cayó en días en que no
   *  limitaban los pozos y cabía en su holgura (el real llegó a lo que dejaba
   *  pasar el tramo que limitaba). En los días en que limitan los pozos, 0. */
  cabiaEnHolgura: number
  /** El escalón no planeado menos lo que de él cabía en la holgura: lo no
   *  planeado que le costó al campo, la base de la PE no planeada. Con los pozos
   *  limitando (todo el demo) es el mismo escalón, la cifra del norte (D4). */
  noPlaneadaSistema: number
  /** Eficiencia de producción, %: real ÷ potencial del sistema (NSTA §5.3, ISO/TS 3250). */
  pe: number
  /** Lo no planeado que le costó al campo ÷ potencial del sistema, %: lo que el
   *  norte busca bajar. PE + PE no planeada nunca pasa de 100 % por lo que cupo en la holgura. */
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

/** «en los pozos», dentro de una frase sobre el período. */
export const DONDE_PERIODO: Record<ChokeAnh, string> = { reservorio: 'en el yacimiento', pozo: 'en los pozos', planta: 'en la planta', exportacion: 'afuera (oleoducto, transportador o cliente)' }

/** La eficiencia de producción de cada campo y del conjunto (CHOKE-COMPLETO §8). */
export interface EficienciaProduccion {
  campoId?: string
  real: number
  potencialSistema: number
  /** Real ÷ potencial del sistema, %. */
  pe: number
  /** Lo no planeado que le costó al campo ÷ potencial del sistema, %. */
  peNoPlaneada: number
  /** El tramo que más horas limitó (null sin tubería de crudo). */
  dominante: ChokeCampo | null
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
  /** De dónde sale el número, en palabras (nunca un nombre del código). */
  fuente: string
  estado: EstadoTramo
  /** Lo que le sobra sobre el que limita, bbl/d. */
  holguraBpd: number | null
  limita: boolean
  casiIgual: boolean
  /** La planta por dentro: un carril por tren. */
  trenes?: TrenTuberia[]
  /** El tren que manda dentro de la planta: el menor de los medidos. */
  trenQueLimita?: TrenPlanta
  /** Lo que queda hoy con un equipo parado, en CRUDO (y el agua de donde sale).
   *  El tramo NO se angosta: su alto sigue siendo la capacidad instalada (NSTA
   *  p. 29); esto solo dice cuánto queda mientras dura la parada. `entraBpd`
   *  es el agua que entra ahora y `cabeBpd`, el crudo que todavía cabe con lo
   *  que queda (0 si el agua ya está llena). */
  disponibleHoy?: { valor: number; unidad: 'bbl/d de crudo'; agua: { valor: number; de: number }; equipo: string; texto: string; entraBpd: number; cabeBpd: number }
  /** Afuera por dentro: el oleoducto y el cliente. */
  subniveles?: Array<{ nombre: string; potencialBpd: number; fuente: string; estado: EstadoTramo }>
  /** La prueba más vieja de los pozos con prueba (U2 §1.5: «la prueba más vieja es de hace {n} días»). */
  pruebaMasVieja?: { pozo: string; fecha: Date; dias: number; texto: string }
  /** Perdiéndose ahora en este tramo, bbl/d, y lo que se perdió en el período, bbl. */
  perdiendoAhoraBpd: number
  perdidoBbl: number
  equiposTop: EquipoBbl[]
}

/** Lo que se pierde ahora por un equipo (o sin identificar), con sus pozos y desde cuándo. */
export interface PerdiendoAhora {
  /** Null: sin identificar todavía. */
  tramo: ChokeAnh | null
  bpd: number
  equipo: string
  pozos: number
  /** Los pozos, por nombre, en orden. */
  listaPozos: string[]
  /** Desde cuándo: el primero de sus pozos que paró. */
  desde: Date
}

/** Si las capacidades de la planta y de afuera están firmadas (quién y cuándo) o son del demo. */
export interface CapacidadesDeLaTuberia {
  estado: 'firmadas' | 'demo' | 'parte'
  firma?: FirmaCapacidades
  texto: string
}

/** El medidor del punto oficial: el que da lo real del campo. */
export interface MedidorDelCampo {
  /** El medidor, en palabras: «FQI-0101 · computador de flujo de la unidad LACT-01». */
  medidor: string
  estado: 'en-linea' | 'sin-comunicacion'
  /** Sin comunicación: desde qué día no llega su dato. */
  desde?: Date
  /** El último día completo con dato y lo que dio, bbl. */
  ultimoDia?: { dia: Date; bbl: number }
  texto: string
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
  /** El crudo que sale ahora (`caudalesAhora`, valorado como el libro). */
  pasaHoyBpd: number
  /** Lo que se pierde ahora, por tramo y equipo (null = sin identificar), con
   *  el tramo de la clasificación vigente de sus filas de hoy. */
  perdiendoAhora: PerdiendoAhora[]
  /** Σ de lo que se pierde ahora, y de eso, lo que todavía no tiene tramo. */
  perdiendoAhoraBpd: number
  sinTramoAhoraBpd: number
  /** Lo que las pruebas dicen de más que el punto oficial hoy, bbl/d (D3): el
   *  cuadre de U2 §2.2 es lo que dan los pozos − lo que pasa hoy − lo que se
   *  pierde ahora = esto. Con el factor de asignación del mes en 1, cero. */
  brechaPruebasBpd: number
  /** Lo que se perdió en el período por tramo, con los equipos que más pesan. */
  perdidoPeriodo: Array<{ tramo: ChokeAnh; bbl: number; equiposTop: EquipoBbl[] }>
  /** «Sin identificar»: no es un tramo, es lo que todavía no se sabe (U2 §2.3). */
  sinTramoBbl: number
  sinTramoEquipos: EquipoBbl[]
  /** El diferido del libro: Σ perdido por tramo + sin identificar (U2 §0, principio 6). */
  diferido: number
  campoDeGas: boolean
  /** Las capacidades: firmadas, quién y cuándo, o del demo. */
  capacidades: CapacidadesDeLaTuberia
  /** El medidor del punto oficial y si comunica. Ausente si el campo no lo tiene registrado. */
  medidor?: MedidorDelCampo
  /** «Qué limita hoy: los pozos (11.857 bbl/d)» y la frase de abajo (U2 §1.5). */
  textoCorto: string
  frase: string
  /** La frase de hoy cuando un equipo parado deja la planta por debajo de lo
   *  que caben los pozos (B-14): «Hoy no: con P-201B parada…». Ausente si nada la angosta hoy. */
  fraseHoy?: string
  /** La frase del gerente: dónde se trabó en el período, con sus equipos (U2 §3). */
  fraseGerente: string
}

/* ───────────────────────── las capacidades, para firmarlas ───────────────────────── */

/** Lo máximo que pasó por los tramos de crudo en un día completo de los
 *  últimos `dias` (el fiscal del punto oficial): una capacidad no puede ser
 *  menor que eso (U2 §8.4). Undefined sin días completos con fiscal. */
export function maximoCrudoDiario(campoId: string, ctx: Contexto, dias = 30): { bpd: number; dia: Date } | undefined {
  let m: { bpd: number; dia: Date } | undefined
  for (const x of porDia([campoId], new Date(ahora - dias * D), new Date(ahora), ctx)) {
    if (x.real === null || x.horas < 24) continue
    if (!m || x.real > m.bpd) m = { bpd: x.real, dia: x.dia }
  }
  return m
}

/** Lo que necesita la firma de las capacidades de un campo (U2 §8.4,
 *  `GET /api/vistas/campos/:campo/capacidades`): lo que rige (firmado o del demo), quién lo
 *  firmó, lo que la revisión necesita del pasado (lo máximo que ya pasó, el
 *  potencial de los pozos) y la revisión de lo que rige. La pantalla revisa lo
 *  que se va a firmar con `revisarCapacidades` y esta `entrada`; el servidor lo
 *  vuelve a revisar al firmar (sus 422 mandan). */
export interface VistaCapacidades {
  campoId: string
  vigentes: CapacidadesVigentes
  firma?: FirmaCapacidades
  entrada: EntradaRevision
  hallazgos: HallazgoCapacidad[]
}
export function vistaCapacidades(campoId: string, ctx: Contexto, versiones?: Historial): VistaCapacidades {
  const p = potencialesDelCampo(campoId, ahora, ctx, versiones)
  const pl = Object.hasOwn(CAMPO_PLANTA, campoId) ? CAMPO_PLANTA[campoId] : undefined
  const maximo = maximoCrudoDiario(campoId, ctx)
  const entrada: EntradaRevision = { campoId, vigentes: p.capacidades, ...(maximo ? { maximoCrudo: maximo } : {}), pozosBpd: p.pozos, aguaPozosBpd: p.agua,
    conGas: perfilDe(ctx.config, campoId).gas !== 'no', caudalesGas: { crudo: pl?.caudales.crudo ?? 0, gas: pl?.caudales.gas ?? 0 } }
  const firma = versiones?.length ? firmaDeCapacidades(versiones, campoId) : undefined
  return { campoId, vigentes: p.capacidades, ...(firma ? { firma } : {}), entrada, hallazgos: revisarCapacidades(capacidadesFirmadas(ctx.config, campoId), entrada) }
}

/** Lo que no deja firmar unas capacidades (U2 §8.4): lo que bloquea de
 *  `revisarCapacidades` (menos de lo que ya pasó, sin fuente, un número que no
 *  es mayor que cero, un empate sin explicar), solo en los campos cuyas
 *  capacidades cambian con esta firma: lo ya firmado no traba firmar otra cosa.
 *  Las mismas reglas en la pantalla y en el servidor (`POST /api/configuracion`
 *  y la vista previa responden 422 con estas palabras). Un campo que no está en
 *  el registro lo dice `validarConfig`. */
export function capacidadesQueBloquean(antes: Config, despues: Config, ctx: Contexto, versiones?: Historial): string[] {
  const ids = [...new Set([...(antes.capacidades ?? []), ...(despues.capacidades ?? [])].map(c => c.campoId))]
  return ids.flatMap(id => {
    const a = capacidadesFirmadas(antes, id), d = capacidadesFirmadas(despues, id)
    if (!d || mismaForma(a, d) || campoPorId(id).desconocido) return []
    return revisarCapacidades(d, vistaCapacidades(id, ctx, versiones).entrada).filter(h => h.bloquea).map(h => `${campoPorId(id).nombre}: ${h.texto}`)
  })
}
/** Dos valores JSON iguales, sin mirar el orden de las claves. */
function mismaForma(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false
  if (Array.isArray(a)) return a.length === (b as unknown[]).length && a.every((x, i) => mismaForma(x, (b as unknown[])[i]))
  const x = a as Record<string, unknown>, y = b as Record<string, unknown>
  const kx = Object.keys(x).filter(k => x[k] !== undefined), ky = Object.keys(y).filter(k => y[k] !== undefined)
  return kx.length === ky.length && kx.every(k => Object.hasOwn(y, k) && mismaForma(x[k], y[k]))
}

/* ───────────────────────── mes a mes y contra la línea base ───────────────────────── */

/** Lo perdido en un mes, por tramo (U2 §7.4, `MesLibro.porTramo`). */
export interface MesPorTramo {
  mes: string
  desde: Date
  hasta: Date
  /** El mes no está publicado en todos los campos. */
  parcial: boolean
  porTramo: Record<ChokeOSinAsignar, number>
  /** Lo no planeado de cada tramo: el escalón `disponibilidad-no-planeada` de
   *  sus filas, la cifra del norte (D4). Lo sin identificar no es no planeado. */
  noPlaneado: Record<ChokeOSinAsignar, number>
  /** El diferido del libro del mes: Σ por tramo. */
  diferido: number
}

/** Una cifra por día, antes y en el período, y su cambio. */
export interface AntesYDespues { baseDia: number; periodoDia: number; cambio: number | null }
/** «Antes → con TRIM» por tramo (U2 §7.3, `LineaBase.porTramo`). */
export interface LineaBasePorTramo {
  base: { desde: Date; hasta: Date; nombre: string }
  periodo: { desde: Date; hasta: Date }
  /** Lo no planeado por día de cada tramo: el escalón no planeado (D4), lo que pide CHOKE-COMPLETO §11. */
  noPlaneado: Record<ChokeOSinAsignar, AntesYDespues>
  /** Todo lo perdido por día de cada tramo. */
  diferido: Record<ChokeOSinAsignar, AntesYDespues>
  /** Las dos flechas, la que baja y la que sube: «bajó lo de la planta y subió lo de los pozos». */
  texto: string
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
  /** Lo que dan los pozos según sus pruebas en los campos con fiscal ese día, bbl (D3). */
  potencialPruebas: number
  potencialSistema: number
  estructural: number
  /** Pruebas − libro de ese día, bbl (`BrechaCampoChoke.brechaPruebas`). */
  brechaPruebas: number
  /** Lo diferido de ese día que no le costó al campo: cabía en la holgura de los pozos. */
  cabiaEnHolgura: number
  diferido: number
  residuo: number | null
  porChoke: Record<ChokeOSinAsignar, number>
  porEscalon: Record<EscalonOSinClasificar, number>
  /** Por campo: lo que limitó ese día. Un campo sin fiscal o sin tubería de crudo no está. */
  dominante: Record<string, ChokeCampo>
  /** Por campo: los tramos casi iguales ese día, o null. */
  casiIguales: Record<string, ChokeCampo[] | null>
  /** Por campo: los potenciales del día, bbl/d, y el tren que manda en la planta. */
  potenciales: Record<string, { pozos: number; planta: number | null; exportacion: number | null; tren?: TrenPlanta }>
  /** Los campos donde el real pasó la capacidad declarada del tramo que debía limitar. */
  superado: Record<string, ChokeCampo>
}

/** El aviso «Cambió lo que limita» (U2 §7.2, `AvisoCambioLimita`): solo cuando
 *  el tramo nuevo gana por más del umbral de «casi iguales» y lo sostiene
 *  `diasParaCambio` días seguidos. `dia` es el primero de esos días. */
export interface CambioDominante { campoId: string; dia: Date; de: ChokeCampo; a: ChokeCampo; valorBpd: number; texto: string }
