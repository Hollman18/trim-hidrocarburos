/** El modelo choke: dónde se originó cada parada y dónde se traba la
 *  producción de cada campo.
 *
 *  La producción fluye por una tubería en serie: yacimiento → pozos → planta →
 *  afuera (oleoducto, transportador o cliente). Cada tramo tiene su capacidad y
 *  el campo entrega como mucho lo que deja pasar el más estrecho (SPE-36848,
 *  Palen y Goodwin, BP 1996, el modelo que adopta la Circular ANH 024; NSTA
 *  «UKSS Production Efficiency Section Guide» 2025, §5.3). Aquí se calcula:
 *   - el choke de cada parada (`chokeDeCausa`): el tramo donde se ORIGINÓ la
 *     restricción, con un solo criterio, el de Edinson: lo dedicado a un pozo es
 *     pozo y lo compartido es planta (CHOKE-COMPLETO §2 y §5);
 *   - los potenciales de cada tramo y el dominante del campo
 *     (`potencialesDelCampo`, §3–§4);
 *   - la brecha del libro repartida por choke y por escalón, que suma exacto
 *     (`brechaPorChoke`, §6–§7), con la eficiencia de producción (§8);
 *   - la serie diaria del dominante y de la brecha (`serieChoke`, §11).
 *
 *  Nada de esto cambia el libro (`libro.ts`), el diferido (`diferido.ts`) ni la
 *  causa (`causa-senal.ts`): los lee y los reparte. La topología («¿a qué pozos
 *  sirve este equipo?») es la firmada (`Config.topologia`) o, si el campo no
 *  trae ninguna, la que se deriva de lo que ya existe (`topologiaDerivada`).
 */
import type { Causa, Contexto, TipoCausa } from './causa-senal'
import type { CAUSAS_POZO } from './mensajes'
import type { ParadaProgramada } from './configuracion'
import { perfilDe } from './configuracion'
import { pozoDe, pozosDe, servicioPorId, LEVANTAMIENTO_NOMBRE } from './pozos'
import { perfilBomba, paradaPorId } from './bombas'
import { CAMPO_PLANTA, trenesEnCrudo, type Caudales, type Elemento, type Simbolo } from './planta'
import { libro, porDia, tramosEntre, crudoAsignado, aguaDePrueba, type Tramo } from './libro'
import { campoPorId } from './campos'
import { AHORA, fechaCorta } from './reloj'

/* ───────────────────────── los cuatro tramos y sus palabras ───────────────────────── */

/** El choke de una parada: el paso 2 del árbol de la Circular 024
 *  (`choke_mod`: RESERVORIO, POZO, PLANTA, EXPORTACION). «Mercado» (NSTA) no
 *  es un quinto valor: es un subnivel de exportación (R2 §2.3). */
export type ChokeAnh = 'reservorio' | 'pozo' | 'planta' | 'exportacion'

/** El choke dominante de un campo. `pozos` incluye el yacimiento para el
 *  potencial, como la NSTA (R2 §2.2); el mercado va dentro de exportación. */
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
 *    la restricción se materializa en el sistema eléctrico del campo);
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

/** Cómo se dice cada tramo, en palabras de campo (sin códigos: el gerente y el
 *  operador no ven «PLANTA», ven dónde se trabó). */
export const NOMBRE_CHOKE: Record<ChokeAnh, string> = {
  reservorio: 'En el yacimiento',
  pozo: 'En el pozo',
  planta: 'En la planta',
  exportacion: 'Afuera: oleoducto, transportador o cliente',
}
/** Lo mismo dentro de una frase: «se trabó sobre todo en la planta». */
export const DONDE_CHOKE: Record<ChokeOSinAsignar, string> = {
  reservorio: 'en el yacimiento',
  pozo: 'en el pozo',
  planta: 'en la planta',
  exportacion: 'afuera (oleoducto, transportador o cliente)',
  'sin-asignar': 'sin identificar todavía',
}
/** Lo mismo como sustantivo: «la propuesta es el pozo». */
const LO_QUE_ES: Record<ChokeAnh, string> = { reservorio: 'el yacimiento', pozo: 'el pozo', planta: 'la planta', exportacion: 'afuera' }
export const NOMBRE_CHOKE_CAMPO: Record<ChokeCampo, string> = {
  pozos: 'Los pozos',
  planta: 'La planta',
  exportacion: 'Afuera: oleoducto, transportador o cliente',
}
/** El subnivel de exportación que la NSTA llama mercado y la ANH no tiene. */
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

/* ───────────────────────── el choke de cada parada ───────────────────────── */

/** La versión de la regla: va con cada propuesta (`DatoClasificado.regla`, P1 §1.3). */
export const REGLA_CHOKE = 'choke.topologia@1'

/** El choke de una parada, con su porqué. */
export interface ChokeDeParada {
  choke: ChokeAnh
  /** Una frase en palabras de campo: «P-201B mueve el agua de 18 pozos: si para, se frenan varios». */
  porque: string
  /** El elemento donde se originó: la raíz de la cascada (`Causa.equipo`). */
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

/** Choke de una parada desde su causa: origen + dedicado/compartido + raíz de
 *  la cascada. null = la señal no lo decide (externo, clima, orden público,
 *  yacimiento): se le pregunta a una persona. Al operador nunca se le pide el
 *  choke: lo confirman supervisión, producción, el jefe o confiabilidad (P1 §1.3).
 *
 *  Reglas (CHOKE-COMPLETO §5, P1 §2.1, R2 §3.1–3.3):
 *   1. Manda el ORIGEN: `Causa.equipo` ya es la raíz de la cascada (el servicio
 *      que cayó, la bomba que paró antes, el propio pozo), así que todas las
 *      paradas de una cascada llevan el choke de su raíz.
 *   2. Dedicado o compartido, según la topología; para `UV`, el alimentador del
 *      pozo (`Pozo.alimentador`, que `causa-senal.ts` ya pone como equipo).
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

function deducirChoke(c: Causa, campoId: string, ctx: Contexto): ChokeDeParada | null {
  // 6. Sin causa no hay origen: lo dice una persona (el yacimiento tampoco sale de una señal).
  if (c.tipo === 'pendiente') return null
  const idx = indiceDe(campoId, ctx)
  // 1–2. El elemento raíz: la causa ya lo trae (el servicio, la bomba, el
  // alimentador del pozo en un UV, o el propio pozo).
  const el = idx.elementos.get(c.equipo)
  const servidos = el?.pozos ? new Set(el.pozos).size : undefined
  const base: Pick<ChokeDeParada, 'elemento' | 'regla' | 'fuente' | 'alcance' | 'servidos'> = {
    elemento: c.equipo, regla: REGLA_CHOKE,
    fuente: el ? (idx.firmada ? 'firmada' : 'derivada') : 'regla',
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
        pregunta: '¿El oleoducto o el cliente estaba recibiendo?' }
    }
    case 'energia': {
      // La energía que llega de afuera se materializa en el sistema eléctrico
      // del campo: nunca es «afuera» (R2 §3.2; P1 §2.1, fila «energía · frontera»).
      // Quién la cortó (el proveedor o el campo) es el responsable, otro paso.
      const choke = delElemento === 'exportacion' || !delElemento ? 'planta' : delElemento
      if (choke === 'pozo') return { ...base, choke, porque: `${c.equipo} le sirve solo a ${solo}: la falla de energía queda en el pozo` }
      // Un UV que reporta el variador de UN pozo (no la cascada de un servicio):
      // la causa trae su alimentador, pero la baja tensión puede ser de su
      // transformador o su variador dedicados, y UV no lo distingue (R2 §3.3).
      const delPozo = !!c.evento && !servicioPorId(c.evento) && !paradaPorId(c.evento)
      if (delPozo) return { ...base, choke,
        porque: `Baja tensión en un pozo que cuelga de ${c.equipo}${servidos !== undefined ? `, que alimenta ${pozosTexto(servidos)}` : ''}: se propone la planta`,
        pregunta: '¿La baja tensión llegó por la red del campo o fue del transformador o el variador del pozo?' }
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

/** El choke de un tramo del libro: el de la causa de su evento, en su campo. */
export const chokeDeTramo = (t: Tramo, ctx: Contexto): ChokeDeParada | null => chokeDeCausa(t.causa, t.pozo.campoId, ctx)

/* ───────────────────────── potenciales y dominante del campo ───────────────────────── */

const D = 86_400_000
const ahora = AHORA.getTime()
const mayuscula = (s: string) => (s ? `${s[0]!.toUpperCase()}${s.slice(1)}` : s)
const ceros = <K extends string>(ks: readonly K[]) => Object.fromEntries(ks.map(k => [k, 0])) as Record<K, number>
/** Para decirlo dentro de una frase: «limita la planta», «a la planta le sobran». */
const SUJETO: Record<ChokeCampo, string> = { pozos: 'los pozos', planta: 'la planta', exportacion: 'la salida (oleoducto, transportador o cliente)' }
const DATIVO: Record<ChokeCampo, string> = { pozos: 'a los pozos les', planta: 'a la planta le', exportacion: 'a la salida le' }

/** El dominante entre tres potenciales, con su empate y su holgura. */
export interface Dominio {
  /** El menor: el potencial del sistema (SMPP de la NSTA, §5.3). */
  sistema: number
  dominante: ChokeCampo
  /** Dos o más iguales al barril: la NSTA (§5.4) pide una explicación escrita. */
  empate: boolean
  empatados: ChokeCampo[]
  /** Lo que le sobra a cada tramo sobre el sistema, bbl/d (al dominante, 0). */
  holgura: Record<ChokeCampo, number>
  /** Con empate: por qué y qué se toma. */
  explicacion?: string
}

/** El dominante es el tramo de menor potencial. «By design, no two potentials
 *  should be exactly the same. If they are you must provide an explanation»
 *  (NSTA §5.4): un empate al barril se marca y se explica, y se toma el primero
 *  de la tubería, que es donde el flujo se frena primero. */
export function dominanteDe(p: Record<ChokeCampo, number>): Dominio {
  const sistema = Math.min(p.pozos, p.planta, p.exportacion)
  const empatados = ORDEN_CHOKE_CAMPO.filter(k => Math.round(p[k]) === Math.round(sistema))
  const dominante = empatados[0] ?? 'pozos'
  const holgura: Record<ChokeCampo, number> = { pozos: p.pozos - sistema, planta: p.planta - sistema, exportacion: p.exportacion - sistema }
  if (empatados.length < 2) return { sistema, dominante, empate: false, empatados, holgura }
  return { sistema, dominante, empate: true, empatados, holgura,
    explicacion: `${mayuscula(empatados.map(k => SUJETO[k]).join(' y '))} dan lo mismo, ${n0(sistema)} bbl/d: la NSTA (§5.4) pide explicarlo por escrito. Ampliar uno solo no da un barril más; se toma como dominante ${SUJETO[dominante]}, el primero de la tubería.` }
}

/** Los potenciales de un campo en un instante, en bbl/d de crudo. */
export interface PotencialesCampo extends Dominio {
  campoId: string
  /** El instante, en ms. */
  t: number
  /** Σ crudo asignado de los pozos con prueba (prueba vigente × factor del
   *  mes): la misma base del libro. Incluye el yacimiento, como la NSTA. Un
   *  pozo cerrado cuenta mientras pueda fluir; una frecuencia bajada no lo baja. */
  pozos: number
  /** El menor de los trenes en crudo con la capacidad INSTALADA: no baja por
   *  una parada, planeada o no (NSTA p. 29). */
  planta: number
  /** La capacidad de evacuación declarada (`Chokes.evacuacion`). */
  exportacion: number
  /** Los trenes de la planta en barriles de crudo (`trenesEnCrudo`). */
  trenes: Array<{ tren: string; cap: number; uso: number }>
  /** El tren que manda en la planta: «Crudo», «Agua» o «Gas». */
  trenQueLimita?: string
  /** El subnivel mercado de exportación: lo que el comprador recibe
   *  (`Chokes.mercado`). No baja el potencial de exportación (NSTA p. 29). */
  mercado?: number
  /** El comprador recibe menos de lo que el sistema puede dar. */
  mercadoBajo: boolean
  /** El agua de los pozos con prueba, bbl/d, y el crudo que trae cada barril de agua. */
  agua: number
  crudoPorAgua: number
  /** Tramos sin capacidad declarada: no se les inventa una, no entran al mínimo (∞) y se dice. */
  sinDato: ChokeCampo[]
  /** «Hoy limitan los pozos: a la planta le sobran 40 bbl/d». */
  texto: string
}

/** Los trenes de la planta en barriles de crudo, con `trenesEnCrudo` y la
 *  capacidad INSTALADA del esquema. La relación crudo/agua es la de las pruebas
 *  vigentes en ese instante, la misma base del potencial de los pozos: con la
 *  foto del esquema (`caudales`, la lectura de un día) el agua de Morichal
 *  quedaba en 15.440 bbl/d de crudo y su real pasaba ese «potencial» todos los
 *  meses. El gas no viene en las pruebas: su relación con el crudo es la del
 *  esquema, y se dice. Un campo sin crudo o sin agua en sus pruebas solo tiene
 *  el tren de crudo que pueda limitar. */
function trenesDe(cau: Caudales, crudo: number, agua: number, conGas: boolean): PotencialesCampo['trenes'] {
  if (crudo <= 0 || agua <= 0) return [{ tren: 'Crudo', cap: cau.crudoCap, uso: cau.crudoCap > 0 ? (crudo / cau.crudoCap) * 100 : 0 }]
  const gas = conGas && cau.gasCap > 0 && cau.crudo > 0 && cau.gas > 0
  return trenesEnCrudo({ crudo, crudoCap: cau.crudoCap, agua, aguaCap: cau.aguaCap, gas: gas ? crudo * cau.gas / cau.crudo : 0, gasCap: gas ? cau.gasCap : 0 })
}

/** Los potenciales de los tramos de un campo en el instante `t` (CHOKE-COMPLETO §3):
 *  - pozos = Σ crudo asignado de los pozos con prueba (la base del libro);
 *  - planta = el menor de los trenes en crudo, con la capacidad instalada;
 *  - exportación = la capacidad de evacuación declarada; el mercado, subnivel.
 *  El dominante es el menor; un empate al barril pide explicación. El tren de
 *  gas entra solo si el perfil firmado del campo tiene gas (`perfilDe`). */
export function potencialesDelCampo(campoId: string, t: number, ctx: Contexto): PotencialesCampo {
  let pozos = 0, agua = 0
  for (const p of pozosDe(campoId)) if (p.pruebas.length) { pozos += crudoAsignado(p, t); agua += aguaDePrueba(p, t) }
  const pl = Object.hasOwn(CAMPO_PLANTA, campoId) ? CAMPO_PLANTA[campoId] : undefined
  const trenes = pl ? trenesDe(pl.caudales, pozos, agua, perfilDe(ctx.config, campoId).gas !== 'no') : []
  const menor = trenes.reduce<PotencialesCampo['trenes'][number] | undefined>((a, x) => (!a || x.cap < a.cap ? x : a), undefined)
  const planta = menor?.cap ?? Infinity
  const exportacion = pl?.chokes.evacuacion ?? Infinity
  const d = dominanteDe({ pozos, planta, exportacion })
  const mercado = pl?.chokes.mercado
  const sinDato: ChokeCampo[] = pl ? [] : ['planta', 'exportacion']
  const r: PotencialesCampo = { ...d, campoId, t, pozos, planta, exportacion, trenes,
    ...(menor ? { trenQueLimita: menor.tren } : {}), ...(mercado !== undefined ? { mercado } : {}),
    mercadoBajo: mercado !== undefined && mercado < d.sistema, agua, crudoPorAgua: agua > 0 ? pozos / agua : 0, sinDato, texto: '' }
  r.texto = textoHoy(r)
  return r
}

/** «Hoy limita la planta · agua: a los pozos les sobran 1.200 bbl/d» (CHOKE-COMPLETO §4). */
function textoHoy(p: PotencialesCampo): string {
  if (p.empate) return `Hoy limitan a la vez ${p.empatados.map(k => SUJETO[k]).join(' y ')}: ${n0(p.sistema)} bbl/d`
  const tren = p.dominante === 'planta' && p.trenQueLimita ? ` · ${p.trenQueLimita.toLowerCase()}` : ''
  // El que sigue: el tramo con menos holgura después del dominante.
  const sig = ORDEN_CHOKE_CAMPO.filter(k => k !== p.dominante && Number.isFinite(p.holgura[k])).sort((a, b) => p.holgura[a] - p.holgura[b])[0]
  const mercado = p.mercadoBajo && p.mercado !== undefined ? `; el comprador recibe hasta ${n0(p.mercado)} bbl/d (mercado)` : ''
  return `Hoy ${p.dominante === 'pozos' ? 'limitan' : 'limita'} ${SUJETO[p.dominante]}${tren}${sig ? `: ${DATIVO[sig]} sobran ${n0(p.holgura[sig])} bbl/d` : ''}${mercado}`
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
  /** Potencial del sistema del día, bbl: el menor de los tres, o el de los
   *  pozos si el real pasó la capacidad declarada (`superado`). */
  sistema: number
  /** Pozos − sistema, bbl: lo que no pasa aunque nada pare. */
  estructural: number
  dominante: ChokeCampo
  empate: boolean
  /** El real pasó la capacidad declarada del tramo que debía limitar. */
  superado?: { choke: ChokeCampo; capacidad: number }
}

/** Los días de un campo con dato fiscal, con el potencial de los pozos del
 *  libro de ese día (la misma cifra que suma el período) y la planta y la
 *  salida del instante en que empieza el día.
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
    const d = dominanteDe({ pozos: x.potencial / f, planta: p.planta, exportacion: p.exportacion })
    const capacidad = d.dominante === 'pozos' ? x.potencial : d.sistema * f
    const superado = d.dominante !== 'pozos' && x.real > capacidad + 1e-6
    const estructural = d.dominante !== 'pozos' && !superado ? Math.max(0, x.potencial - capacidad) : 0
    out.push({ dia: x.dia.getTime(), horas: x.horas, real: x.real, potencial: x.potencial, diferido: x.diferido, residuo: x.residuo ?? 0,
      sistema: x.potencial - estructural, estructural, dominante: d.dominante, empate: d.empate,
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
  /** Brecha − Σ por choke: lo que no explica ningún evento (el inventario de
   *  los días, el residuo del libro). Se muestra, nunca se reparte. */
  sinExplicar: number
  /** |sin explicar| ≤ 2,5 % del potencial: el umbral de cierre de la NSTA (§6.2, p. 38). */
  cuadra: boolean
  /** Barriles cuyo choke es una propuesta que espera a una persona (`ChokeDeParada.pregunta`). */
  porConfirmar: number
  /** Lo que el sistema no deja pasar aunque nada pare: Σ por día de
   *  (pozos − sistema) cuando el dominante no son los pozos, bbl, y por el
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
  /** El tramo que más horas limitó en el período, y las horas de cada uno. */
  dominante: ChokeCampo
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
  porConfirmar: number
}
const acumulado = (): Acumulado => ({
  porChoke: ceros(CHOKES_Y_SIN_ASIGNAR), porEscalon: ceros(ESCALONES), porConfirmar: 0,
  cruce: Object.fromEntries(CHOKES_Y_SIN_ASIGNAR.map(k => [k, ceros(ESCALONES)])) as Acumulado['cruce'],
})

/** La brecha del libro repartida por choke y por escalón (CHOKE-COMPLETO §6–§8).
 *  Cada barril de cada tramo va a UN choke (el de su causa; «sin-asignar» si la
 *  causa no lo decide) y a un escalón. La identidad es EXACTA, por campo y en
 *  el conjunto:
 *
 *    potencial − real (libro) = Σ por choke + sin explicar = Σ por escalón + sin explicar
 *
 *  Si el dominante no son los pozos, una parte de esa brecha es estructural
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
    const k: ChokeOSinAsignar = ch?.choke ?? 'sin-asignar'
    const partes = escalonesDe(t, ch, ctx)
    for (const a of [total, porCampoAcc.get(t.pozo.campoId)]) {
      if (!a) continue
      a.porChoke[k] += t.bbl
      for (const [e, bbl] of partes) { a.porEscalon[e] += bbl; a.cruce[k][e] += bbl }
      if (ch?.pregunta) a.porConfirmar += t.bbl
    }
  }

  const porCampo: BrechaCampoChoke[] = campoIds.map(c => {
    const l = lb.porCampo.find(x => x.campoId === c)
    const acc = porCampoAcc.get(c) ?? acumulado()
    const dias = diasDelCampo(c, d0, hh, ctx)
    const estructuralPorChoke = ceros(ORDEN_CHOKE_CAMPO), horasPorDominante = ceros(ORDEN_CHOKE_CAMPO)
    for (const x of dias) { estructuralPorChoke[x.dominante] += x.estructural; horasPorDominante[x.dominante] += x.horas }
    return cifras(c, l?.potencial ?? 0, l?.real ?? 0, l?.diferido ?? 0, acc, estructuralPorChoke, horasPorDominante,
      dias.filter(x => x.superado).map(x => ({ dia: new Date(x.dia), choke: x.superado!.choke, capacidad: x.superado!.capacidad, real: x.real })))
  })

  const suma = (f: (x: BrechaCampoChoke) => number) => porCampo.reduce((a, x) => a + f(x), 0)
  const estructuralPorChoke = ceros(ORDEN_CHOKE_CAMPO), horasPorDominante = ceros(ORDEN_CHOKE_CAMPO)
  for (const x of porCampo) for (const k of ORDEN_CHOKE_CAMPO) { estructuralPorChoke[k] += x.estructuralPorChoke[k]; horasPorDominante[k] += x.horasPorDominante[k] }
  const { campoId: _, superado: __, ...todo } = cifras('', lb.potencial, lb.real, suma(x => x.diferido), total, estructuralPorChoke, horasPorDominante, [])
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
  const dominante = ORDEN_CHOKE_CAMPO.reduce((x, k) => (horasPorDominante[k] > horasPorDominante[x] ? k : x), 'pozos' as ChokeCampo)
  return {
    campoId, potencial, real, brecha, diferido, porChoke: a.porChoke, porEscalon: a.porEscalon, sinExplicar,
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
    partes.push(`${mayuscula(SUJETO[k])} no deja pasar todo lo que pueden dar los pozos: ${n0(estructural)} bbl de la brecha son estructurales. Ningún arreglo de equipos los recupera; solo más capacidad.`)
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
  /** El tramo que más horas limitó. */
  dominante: ChokeCampo
}
/** PE y PE no planeada por campo y período: la misma cuenta de `brechaPorChoke`. */
export function eficienciaProduccion(campoIds: string[], desde: Date, hasta: Date, ctx: Contexto): { porCampo: EficienciaProduccion[]; total: EficienciaProduccion } {
  const b = brechaPorChoke(campoIds, desde, hasta, ctx)
  const de = (x: Pick<BrechaCampoChoke, 'real' | 'potencialSistema' | 'pe' | 'peNoPlaneada' | 'dominante'>) =>
    ({ real: x.real, potencialSistema: x.potencialSistema, pe: x.pe, peNoPlaneada: x.peNoPlaneada, dominante: x.dominante })
  return { porCampo: b.porCampo.map(x => ({ campoId: x.campoId, ...de(x) })), total: de(b) }
}

/* ───────────────────────── el choke en el tiempo ───────────────────────── */

/** Un día de la serie (CHOKE-COMPLETO §11). */
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
  /** El tramo que limitó a cada campo ese día. Un campo sin fiscal ese día no está. */
  dominante: Record<string, ChokeCampo>
  /** Los campos donde el real pasó la capacidad declarada del tramo que debía limitar. */
  superado: Record<string, ChokeCampo>
}

/** Cuando el estrecho de un campo cambia de tramo: cambian los equipos críticos. */
export interface CambioDominante { campoId: string; dia: Date; de: ChokeCampo; a: ChokeCampo; texto: string }

/** La serie diaria del dominante y de la brecha por choke y por escalón, con
 *  `porDia` y los tramos de cada día. Cada día suma lo mismo que el libro de
 *  ese día; los días suman la brecha del período (`brechaPorChoke`). */
export function serieChoke(campoIds: string[], desde: Date, hasta: Date, ctx: Contexto): { dias: DiaChoke[]; cambios: CambioDominante[] } {
  const d0 = desde.getTime(), hh = Math.min(hasta.getTime(), ahora)
  const dias = new Map<number, DiaChoke>()
  for (const x of porDia(campoIds, desde, hasta, ctx)) dias.set(x.dia.getTime(), {
    dia: x.dia, horas: x.horas, real: x.real, potencial: x.potencial, potencialSistema: 0, estructural: 0,
    diferido: x.diferido, residuo: x.residuo, porChoke: ceros(CHOKES_Y_SIN_ASIGNAR), porEscalon: ceros(ESCALONES), dominante: {}, superado: {},
  })
  for (const c of campoIds) {
    for (const x of diasDelCampo(c, d0, hh, ctx)) {
      const d = dias.get(x.dia)
      if (!d) continue
      d.potencialSistema += x.sistema
      d.estructural += x.estructural
      d.dominante[c] = x.dominante
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
  const cambios: CambioDominante[] = []
  for (const c of campoIds) {
    let antes: ChokeCampo | undefined
    for (const d of orden) {
      const k = d.dominante[c]
      if (!k) continue
      if (antes && k !== antes) cambios.push({ campoId: c, dia: d.dia, de: antes, a: k,
        texto: `${campoPorId(c).nombre}: desde el ${fechaCorta(d.dia)} limita${k === 'pozos' ? 'n' : ''} ${SUJETO[k]} (antes, ${SUJETO[antes]}). Cambian los equipos críticos.` })
      antes = k
    }
  }
  cambios.sort((a, b) => a.dia.getTime() - b.dia.getTime() || a.campoId.localeCompare(b.campoId))
  return { dias: orden, cambios }
}
