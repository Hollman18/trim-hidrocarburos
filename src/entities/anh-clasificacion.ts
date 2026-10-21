/** La clasificación ANH de una parada: los 6 pasos de la Circular 0024, en su
 *  orden (responsable → choke → impacto → planeación → N1 → N2; C24 p.5).
 *
 *  Vive AL LADO de la causa de TRIM (`causa-senal.ts`), nunca encima: la causa
 *  sigue siendo la de gestión (equipo, parte, `TipoCausa`) y de ella sale esta
 *  propuesta regulatoria (P1 §1.0). Cuatro reglas la gobiernan:
 *  - CADA DATO CON SU PROCEDENCIA. Cada paso es un `DatoClasificado`: valor, de
 *    dónde salió (señal, regla, programa, persona…), quién, a qué hora y con qué
 *    versión de la regla. De ahí sale el origen A/M/C de la tupla (P1 §1.3).
 *  - LA COHERENCIA ESTÁ BLOQUEADA. Planeada solo va con una N1 `P_`, no
 *    planeada solo con una `NP_`, y el N2 es de su N1. El tipo no deja armar la
 *    combinación cruzada y `clasificar`, el único constructor, la rechaza en
 *    palabras: la ANH rechaza la transmisión entera por esto (C24 p.7).
 *  - NADA SE INVENTA. Lo que la señal no decide va a `faltan`, con las opciones
 *    cerradas que admite la regla (nunca las 117) y la pregunta en palabras de
 *    campo (U1 §2.4). Ningún comodín rellena un hueco (P1 §1.0).
 *  - UNA SEÑAL APUNTA, NO PRUEBA (Hollman [37:34]; S1 P1-11). Lo que sale de la
 *    firma de las señales, de un código que puede venir de superficie (GF, PH,
 *    UV) o del first-out de un variador nunca queda confirmado sin una persona:
 *    su causa la confirma quien abrió el equipo.
 */
import {
  PASOS, PASO_CAMPO, PASO_CIRCULAR, RESPONSABLES, CHOKES, IMPACTOS, PLANEACIONES, CLAVES_N1,
  ETIQUETA_PLANEACION, ETIQUETA_CHOKE, VERSIONES_CATALOGO, VERSION_POR_DEFECTO, CAU_GRAL_DE_N1,
  causaGeneralDe, esClaveN1, esCodigoN2Conocido, esN1Planeada, n1DeCodigo, n1DePlaneacion, n2DeN1, planeacionDeN1, textoN1, textoN2,
  type PasoAnh, type Responsable, type ChokeAnh, type Impacto, type Planeacion, type ClaveN1, type ClaveN1Planeada,
  type ClaveN1NoPlaneada, type CodigoN2, type CodigoN2De, type CausaGeneral, type IdVersionCatalogo, type OrigenAnh,
} from './anh-catalogo'
import { chokeDeCausa, type ChokeDeParada } from './choke'
import type { Causa, Contexto, TipoCausa } from './causa-senal'
import type { ParadaProgramada } from './configuracion'
import type { CAUSAS_POZO } from './mensajes'
import { NOMBRE_PARTE } from './partes'
import { CODIGO, eventosPozos, type CodigoControlador } from './pozos'
import { paradaPorId } from './bombas'
import { perezoso } from './insumos'

/* ───────────────────────────── procedencia ───────────────────────────── */

/** De dónde salió un dato (P1 §1.3). */
export type Procedencia =
  | 'senal'        // hora del PLC o del controlador
  | 'registro'     // registro ANH del pozo (n_pozo, id_rec, uwi, form, campo)
  | 'regla'        // regla de TRIM sobre la causa deducida (id@versión)
  | 'conversion'   // tabla de conversión del árbol de la operadora (id@versión)
  | 'programa'     // programa firmado o tarea del programa del técnico
  | 'declarado'    // lo escribió o lo contestó una persona
  | 'confirmado'   // una persona aceptó lo propuesto (uno a uno o en lote)
  | 'corregido'    // una persona cambió lo propuesto

/** Las procedencias que pone una persona: llevan quién y a qué hora. */
export const DE_PERSONA: readonly Procedencia[] = ['declarado', 'confirmado', 'corregido']
export const esDePersona = (p: Procedencia) => DE_PERSONA.includes(p)

/** Un paso de la clasificación con su procedencia (P1 §1.3). `Q` es la forma
 *  de su porqué: una frase, salvo en el paso 2, que guarda los datos de la
 *  frase (`PorqueChoke`, U2 §11.1). */
export interface DatoClasificado<T, Q = string> {
  valor: T
  procedencia: Procedencia
  /** La regla, tabla o programa que lo propuso, con su versión:
   *  'REGLAS_ANH@1#esp-falla', 'choke.topologia@1', 'programa:PR-2011-260819'. */
  regla?: string
  /** Por qué, en palabras de campo: la pantalla lo pone al lado («TRIM lo dedujo: …», U1 §2). */
  porque?: Q
  /** Quién (obligatorio si la procedencia es de persona). El nombre se queda
   *  aquí, dentro de TRIM: al texto de `desc_evid` nunca va (S1 R-D). */
  por?: string
  porId?: string
  /** El rol con que lo hizo (id de `roles.ts`): decide qué pasos puede avalar. */
  rol?: string
  /** La hora del toque, no la de llegada al servidor (U1 P-9). */
  hora?: string
  /** La hora en que llegó al servidor, si difiere (captura sin señal). */
  recibido?: string
  /** `ConfirmacionLote.id` si se confirmó en lote (U1 P-10). */
  lote?: string
  /** Lo que propuso TRIM, si la persona lo cambió: para la auditoría y para
   *  el tablero de «correcciones por regla» (P1 §2.1). */
  propuesto?: T
}

/** Quién toca la clasificación. */
export interface Persona { id: string; nombre: string }

/** Lo que muestra que la parada fue del yacimiento, con un toque (U2 §4.3). */
export type AtajoYacimiento = 'prueba' | 'corte-agua' | 'presion'
/** La evidencia de «En el yacimiento»: uno de los atajos o una nota escrita
 *  por quien lo pone (U2 §11.1, `evidenciaYacimiento`). */
export type EvidenciaYacimiento = AtajoYacimiento | string
export const ATAJO_YACIMIENTO: Record<AtajoYacimiento, string> = {
  prueba: 'la prueba del pozo', 'corte-agua': 'el corte de agua', presion: 'la presión de fondo',
}
/** Solo producción y confiabilidad ponen «En el yacimiento»: necesita una
 *  prueba de pozo, el corte de agua o la presión de fondo, que no se ven desde
 *  el campo, y nunca sale de una señal (U2 §4.3; P1 §2.1). La capacidad que lo
 *  deja en el servidor la crea el contrato. */
export const PONEN_YACIMIENTO: readonly string[] = ['prod', 'conf']
/** La regla con que una persona pone el yacimiento. */
export const REGLA_YACIMIENTO = 'choke.yacimiento@1'

/** El porqué del paso 2, guardado con la clasificación: los datos de la frase
 *  y no la frase armada (U2 §4.2 y §11.1). Lo que propone TRIM se copia de
 *  `chokeDeCausa` (`ChokeDeParada.porque`, `.elemento`, `.servidos`,
 *  `.pregunta`, `.regla`); la cascada la pone el tramo (`anh-paradas.ts`). */
export interface PorqueChoke {
  /** La regla con su versión: 'choke.topologia@1' (motor del choke),
   *  'preguntas:campo@1' (de una respuesta), 'choke.yacimiento@1'. */
  regla: string
  /** El elemento donde se originó: la raíz de la cascada. */
  elemento?: string
  /** A cuántos pozos sirve ese elemento, según la topología. */
  pozosServidos?: number
  /** La raíz de la cascada y cuántos minutos después de su caída paró este pozo. */
  cascada?: { raiz: string; minutos: number }
  /** Quién lo puso, si fue una persona. */
  persona?: string
  /** La frase en palabras de campo. */
  texto?: string
  /** Lo que el motor del choke pregunta todavía a una persona. */
  pregunta?: string
  /** «En el yacimiento»: qué lo muestra (solo producción y confiabilidad). */
  evidencia?: EvidenciaYacimiento
}

/** El porqué de cada paso: una frase, salvo el del paso 2. */
type PorqueDePaso = { [P in PasoAnh]: P extends 'choke' ? PorqueChoke : string }
/** El dato de un paso, con su porqué. */
export type DatoDePaso<P extends PasoAnh> = DatoClasificado<ValoresPasos[P], PorqueDePaso[P]>

/** Regla «una señal apunta, no prueba» (`senal-apunta@1`, P1 §2.1). */
export interface SenalApunta {
  regla: 'senal-apunta@1'
  /** En palabras de campo: «las señales apuntan a…», nunca «la causa fue…». */
  porque: string
}

/* ───────────────────────── la clasificación y su borrador ───────────────────────── */

/** El valor de cada paso. */
export interface ValoresPasos {
  responsable: Responsable
  choke: ChokeAnh
  impacto: Impacto
  planeacion: Planeacion
  n1: ClaveN1
  n2: CodigoN2
}
export type ValorDePaso<P extends PasoAnh> = ValoresPasos[P]

/** Mientras falta algún paso: todo opcional, nunca una `ClasificacionAnh`
 *  (P1 §1.4). Solo una clasificación completa se serializa. */
export type BorradorClasificacion = { [P in PasoAnh]?: DatoDePaso<P> } & {
  /** `cau_gral_paro` (provisional, P1 §1.2b): una de las 18 causas de la Res.
   *  0651 o lo que escribió una persona. */
  cauGral?: DatoClasificado<CausaGeneral | string>
  /** `desc_evid`: lo arma TRIM desde `Causa.texto` y `Causa.evidencia`, sin
   *  nombres de personas (P1 §1.3; S1 R-D). */
  descEvid?: DatoClasificado<string>
  apunta?: SenalApunta
}

/* La marca de que pasó por `clasificar`: existe solo en el tipo. Así nadie arma
   una ClasificacionAnh a mano (un literal no compila sin ella). */
declare const CLASIFICADA: unique symbol

interface BaseClasificacion {
  readonly [CLASIFICADA]: true
  responsable: DatoClasificado<Responsable>
  choke: DatoClasificado<ChokeAnh, PorqueChoke>
  impacto: DatoClasificado<Impacto>
  cauGral: DatoClasificado<CausaGeneral | string>
  descEvid: DatoClasificado<string>
  apunta?: SenalApunta
}

/** Los 6 pasos completos y coherentes. La planeación y la N1 van atadas en el
 *  tipo: planeada solo con `P_`, no planeada solo con `NP_` (C24 p.7); y el
 *  N2 lleva el prefijo de su N1. Se arma solo con `clasificar`. */
export type ClasificacionAnh = BaseClasificacion & (
  | { planeacion: DatoClasificado<'planeada'>; n1: DatoClasificado<ClaveN1Planeada>; n2: DatoClasificado<CodigoN2De<ClaveN1Planeada>> }
  | { planeacion: DatoClasificado<'no-planeada'>; n1: DatoClasificado<ClaveN1NoPlaneada>; n2: DatoClasificado<CodigoN2De<ClaveN1NoPlaneada>> }
)

/** El rechazo de `clasificar`, con cada problema dicho en palabras. */
export class ErrorClasificacion extends Error {
  readonly problemas: string[]
  constructor(problemas: string[]) {
    super(problemas.join(' '))
    this.name = 'ErrorClasificacion'
    this.problemas = problemas
  }
}

const enLista = <T extends string>(xs: readonly T[], x: unknown): x is T => typeof x === 'string' && (xs as readonly string[]).includes(x)
const PROCEDENCIAS: readonly Procedencia[] = ['senal', 'registro', 'regla', 'conversion', 'programa', 'declarado', 'confirmado', 'corregido']

/** Lo que impide que un borrador sea una clasificación, en palabras. Vacío =
 *  se puede clasificar. No lanza: la pantalla lo muestra al lado del paso. */
export function problemasDeClasificacion(b: BorradorClasificacion): string[] {
  const e: string[] = []
  for (const p of PASOS) if (!b[p]) e.push(`Falta «${PASO_CAMPO[p]}» (${PASO_CIRCULAR[p]}).`)
  type Cualquiera = DatoClasificado<unknown, unknown> | undefined
  const datos: Array<[string, Cualquiera]> = [...PASOS.map((p): [string, Cualquiera] => [PASO_CAMPO[p], b[p]]),
    ['Causa general', b.cauGral], ['Descripción y evidencia', b.descEvid]]
  for (const [nombre, d] of datos) {
    if (!d) continue
    if (!enLista(PROCEDENCIAS, d.procedencia)) e.push(`«${nombre}»: «${String(d.procedencia)}» no es una procedencia conocida.`)
    else if (esDePersona(d.procedencia) && (!d.por || !d.porId || !d.hora))
      e.push(`«${nombre}»: un dato ${d.procedencia} tiene que decir quién lo hizo y a qué hora.`)
  }
  const { responsable, choke, impacto, planeacion, n1, n2 } = b
  if (responsable && !enLista(RESPONSABLES, responsable.valor)) e.push(`«${String(responsable.valor)}» no es uno de los nueve responsables de la circular (C24 p.5).`)
  if (choke && !enLista(CHOKES, choke.valor)) e.push(`«${String(choke.valor)}» no es uno de los cuatro componentes de la circular: pozo, planta, exportación o reservorio (C24 p.5).`)
  // El yacimiento nunca sale de una señal: lo pone producción o confiabilidad, con su evidencia (P1 §2.1; U2 §4.3).
  if (choke?.valor === 'reservorio' && !(esDePersona(choke.procedencia) && !!choke.rol && PONEN_YACIMIENTO.includes(choke.rol) && !!choke.porque?.evidencia?.trim()))
    e.push('«En el yacimiento» lo pone producción o confiabilidad, diciendo qué lo muestra (la prueba del pozo, el corte de agua, la presión de fondo o una nota); nunca sale de una señal (U2 §4.3).')
  if (impacto && !enLista(IMPACTOS, impacto.valor)) e.push(`«${String(impacto.valor)}» no es diferida ni pérdida (C24 p.5).`)
  if (planeacion && !enLista(PLANEACIONES, planeacion.valor)) e.push(`«${String(planeacion.valor)}» no es planeada ni no planeada (C24 p.5).`)
  const n1Valida = !!n1 && esClaveN1(n1.valor)
  if (n1 && !n1Valida) e.push(`«${String(n1.valor)}» no es una de las 20 claves de causa de la circular (C24 p.6-7): la ANH rechaza la transmisión.`)
  const n2Valida = !!n2 && esCodigoN2Conocido(n2.valor)
  if (n2 && !n2Valida) e.push(`«${String(n2.valor)}» no es una causa del catálogo de la ANH (C24 p.6-7).`)
  if (n1 && n1Valida && planeacion && enLista(PLANEACIONES, planeacion.valor) && planeacionDeN1(n1.valor) !== planeacion.valor) {
    const debe = planeacion.valor === 'planeada' ? 'una de las 8 planeadas (P_…)' : 'una de las 12 no planeadas (NP_…)'
    e.push(`«${ETIQUETA_PLANEACION[planeacion.valor]}» no va con «${textoN1(n1.valor)}» (${n1.valor}): con una parada ${ETIQUETA_PLANEACION[planeacion.valor].toLowerCase()} la causa tiene que ser ${debe}. La ANH rechaza la transmisión entera por esta incoherencia (C24 p.7).`)
  }
  if (n1 && n1Valida && n2 && n2Valida && n1DeCodigo(n2.valor) !== n1.valor)
    e.push(`«${textoN2(n2.valor)}» no es una causa de «${textoN1(n1.valor)}»: el detalle tiene que ser de su causa (C24 p.8).`)
  return e
}

/** El único constructor de una `ClasificacionAnh`: comprueba en tiempo de
 *  ejecución lo que el tipo ya ata (lo que llega del contrato o de otra pantalla
 *  no pasó por el compilador) y rechaza en palabras lo incoherente. Sin causa
 *  general, la propone `CAU_GRAL_DE_N1@1`; sin descripción, va vacía. */
export function clasificar(b: BorradorClasificacion): ClasificacionAnh {
  const e = problemasDeClasificacion(b)
  if (e.length) throw new ErrorClasificacion(e)
  const n2 = b.n2!
  const x = {
    responsable: b.responsable!, choke: b.choke!, impacto: b.impacto!, planeacion: b.planeacion!, n1: b.n1!, n2,
    cauGral: b.cauGral ?? { valor: causaGeneralDe(n2.valor), procedencia: 'regla', regla: CAU_GRAL_DE_N1.id },
    descEvid: b.descEvid ?? { valor: '', procedencia: 'regla' },
    ...(b.apunta ? { apunta: b.apunta } : {}),
  }
  // La marca existe solo en el tipo: este es el único sitio donde se pone.
  return x as unknown as ClasificacionAnh
}

/** ¿Están los 6 pasos? */
export const completa = (b: BorradorClasificacion): boolean => PASOS.every(p => !!b[p])

/** Pone (o quita) un paso del borrador. Un solo cruce de tipo: la clave es genérica. */
function conPaso<P extends PasoAnh>(b: BorradorClasificacion, p: P, d: DatoDePaso<P> | undefined): BorradorClasificacion {
  const r: Record<string, unknown> = { ...b }
  if (d) r[p] = d
  else delete r[p]
  return r as BorradorClasificacion
}

/* ───────────────────────── preguntas en palabras de campo ───────────────────────── */

/** Las opciones cerradas de cada paso. */
export type OpcionesCerradas = { [P in PasoAnh]: ReadonlyArray<ValoresPasos[P]> }

/** Las pérdidas que TRIM propone registrar aparte: la parada sigue diferida (P1 §2.4). */
export type PerdidaPropuesta = 'derrame' | 'tea' | 'rechazo'

export type IdPregunta =
  | 'que-lo-paro' | 'tanques' | 'oleoducto' | 'afecto-clima' | 'afecto-orden-publico' | 'corte' | 'trabajo'
  | 'programado' | 'se-perdio' | 'nominacion' | 'aporte' | 'evidencia-yacimiento' | 'choke' | 'raiz' | 'detalle'

/** Quién contesta una pregunta: 'campo', el operador, el técnico y quienes
 *  revisan; 'revisa', solo supervisión, producción, el jefe y confiabilidad
 *  (al operador nunca se le pide dónde se trabó; P1 §1.3, U2 §4.5);
 *  'yacimiento', solo producción y confiabilidad (U2 §4.3). */
export type QuienContesta = 'campo' | 'revisa' | 'yacimiento'
export const ROLES_QUE_CONTESTAN: Record<QuienContesta, readonly string[]> = {
  campo: ['oper', 'tec', 'sup', 'prod', 'jefe', 'conf'],
  revisa: ['sup', 'prod', 'jefe', 'conf'],
  yacimiento: PONEN_YACIMIENTO,
}

export interface OpcionCampo {
  /** El texto del botón. */
  texto: string
  /** Lo que deja propuesto, como dicho por quien contesta. Vacío en «No sé»:
   *  el paso sigue en falta y escala al supervisor (U1 §2.4: forzar certeza fabrica datos falsos). */
  deja: Partial<ValoresPasos>
  /** Lo que acota sin fijar: «Comunidad o Tercero» (U1 §2.4). */
  acota?: Partial<OpcionesCerradas>
  /** La pregunta que sigue. */
  sigue?: IdPregunta
  /** Además, la pérdida que TRIM propone registrar (la parada sigue diferida). */
  perdida?: PerdidaPropuesta
  /** Pone «En el yacimiento» con esta evidencia (`declararYacimiento`). */
  yacimiento?: AtajoYacimiento
}

export interface PreguntaCampo {
  id: IdPregunta
  /** Una pregunta por pantalla, sin códigos y sin la palabra «choke» (U1 §2.4). */
  texto: string
  /** Los pasos que resuelve. */
  pasos: readonly PasoAnh[]
  opciones: readonly OpcionCampo[]
  quien: QuienContesta
  fuente: string
}

/** La versión de las preguntas: va en `DatoClasificado.regla` de lo que se contesta (U1 P-7). */
export const PREGUNTAS_CAMPO_ID = 'preguntas:campo@1'

const NO_SE: OpcionCampo = { texto: 'No sé', deja: {} }
const NP = 'no-planeada' as const

/** Cómo se dice cada N1 en el campo, para escoger la causa sin códigos. Las
 *  `P_` son las de «¿Qué trabajo era?» (U1 §2.4); de las `NP_`, cuatro son
 *  botones de U1 («La planta no recibe…») y las demás, propuesta de este motor
 *  en el mismo estilo. */
export const N1_EN_CAMPO: Record<ClaveN1, string> = {
  P_MANT_ELE: 'Mantenimiento eléctrico', P_MANT_MEC: 'Mantenimiento mecánico', P_MANT_INS: 'Instrumentos',
  P_MANT_INT: 'Líneas y válvulas', P_WO: 'Workover o intervención', P_PRUEBAS: 'Prueba de pozo',
  P_PES: 'Arranque o puesta en servicio', P_OP: 'Se restringió por decisión de operación',
  NP_CLIMA: 'Lluvia, rayo, creciente o derrumbe', NP_OPUB: 'Bloqueo, paro, robo o amenaza',
  NP_ENEXT: 'Se fue la energía de la red del proveedor', NP_ENINT: 'Falló la energía dentro del campo',
  NP_INS: 'Falló un instrumento', NP_CTRL: 'Falló el control o las comunicaciones (PLC, SCADA)',
  NP_SUB: 'Falló algo dentro del pozo (bomba de fondo, tubería)', NP_SUP: 'Falló una máquina de superficie',
  NP_INTEG: 'Una fuga o un daño en una línea o una válvula', NP_PROC: 'La planta no recibe (agua o proceso)',
  NP_TRANSP: 'El oleoducto o el cliente no recibe', NP_AUT: 'Una autoridad lo ordenó',
}

/** El responsable que va con una N1 planeada (P1 §2.1, fila `programada`;
 *  provisional, pregunta de P1 §8). */
const RESPONSABLE_DE_TRABAJO = (n1: ClaveN1Planeada): Responsable => (n1.startsWith('P_MANT_') ? 'op-mantenimiento' : 'op-operacion')

const EQUIPO_N1: ClaveN1[] = ['NP_SUB', 'NP_SUP', 'NP_ENINT', 'NP_INS', 'NP_CTRL', 'NP_INTEG']
const P_N1 = n1DePlaneacion('planeada') as ClaveN1Planeada[]

/** Las preguntas fijas, con el texto exacto de U1 §2.4 donde U1 lo da. */
export const PREGUNTAS_CAMPO: Readonly<Record<Exclude<IdPregunta, 'raiz' | 'detalle' | 'choke'>, PreguntaCampo>> = {
  'que-lo-paro': {
    id: 'que-lo-paro', texto: '¿Qué lo paró?', quien: 'campo', fuente: 'U1 §2.4, Pregunta 1',
    pasos: ['responsable', 'choke', 'planeacion', 'n1'],
    opciones: [
      // «Se dañó un equipo» es una falla súbita: no planeada por definición (C24 p.4).
      { texto: 'Se dañó un equipo', deja: { responsable: 'op-mantenimiento', planeacion: NP }, acota: { n1: EQUIPO_N1 }, sigue: 'raiz' },
      { texto: 'Se fue la energía', deja: {}, sigue: 'corte' },
      { texto: 'Lluvia, rayo, creciente o derrumbe', deja: { responsable: 'fuerza-mayor', planeacion: NP }, sigue: 'afecto-clima' },
      { texto: 'Bloqueo, paro, robo o amenaza', deja: { planeacion: NP }, acota: { responsable: ['comunidad', 'tercero'] }, sigue: 'afecto-orden-publico' },
      { texto: 'La planta no recibe (agua o proceso)', deja: { responsable: 'op-operacion', choke: 'planta', planeacion: NP, n1: 'NP_PROC' }, sigue: 'detalle' },
      { texto: 'El tanque de crudo está lleno', deja: { planeacion: NP }, sigue: 'oleoducto' },
      { texto: 'El oleoducto o el cliente no recibe', deja: { responsable: 'ext-transportador', choke: 'exportacion', planeacion: NP, n1: 'NP_TRANSP' }, sigue: 'detalle' },
      { texto: 'Una autoridad lo ordenó', deja: { responsable: 'autoridad', planeacion: NP, n1: 'NP_AUT' }, sigue: 'detalle' },
      { texto: 'Era un trabajo o una prueba programada', deja: { planeacion: 'planeada' }, sigue: 'trabajo' },
      NO_SE,
    ],
  },
  tanques: {
    // Las dos opciones cerradas de U2 §4.4 (caso 3) cuando el tramo depende del
    // tanque: el agua de disposición nunca sale de la batería (P1 §3.4); el
    // crudo depende de si el oleoducto o el cliente recibía (P1 §3.3).
    id: 'tanques', texto: '¿Qué lo paró?', quien: 'campo', fuente: 'U2 §4.4, caso 3; U1 §2.4, Pregunta 1',
    pasos: ['responsable', 'choke', 'n1', 'n2'],
    opciones: [
      { texto: 'La planta no recibe (agua o proceso)', deja: { responsable: 'op-operacion', choke: 'planta', planeacion: NP, n1: 'NP_PROC' }, sigue: 'detalle' },
      { texto: 'El tanque de crudo está lleno', deja: { planeacion: NP }, sigue: 'oleoducto' },
      NO_SE,
    ],
  },
  oleoducto: {
    id: 'oleoducto', texto: '¿El oleoducto o el cliente estaba recibiendo?', quien: 'campo', fuente: 'U1 §2.4; U2 §4.4, caso 3; P1 §3.3',
    pasos: ['responsable', 'choke', 'n1', 'n2'],
    opciones: [
      { texto: 'Sí, recibía', deja: { responsable: 'op-operacion', choke: 'planta', planeacion: NP, n1: 'NP_PROC', n2: 'NP_PROC/tanques-llenos-capacidad-limitada' } },
      { texto: 'No, no recibía', deja: { responsable: 'ext-transportador', choke: 'exportacion', planeacion: NP, n1: 'NP_TRANSP' }, sigue: 'detalle' },
      NO_SE,
    ],
  },
  'afecto-clima': {
    id: 'afecto-clima', texto: '¿Qué se afectó?', quien: 'campo', fuente: 'U1 §2.4, seguimiento de clima',
    pasos: ['n1', 'n2'],
    opciones: [
      { texto: 'El pozo, la locación o la vía', deja: { n1: 'NP_CLIMA' }, sigue: 'detalle' },
      { texto: 'Un instrumento', deja: { n1: 'NP_INS' }, acota: { n2: ['NP_INS/dano-por-tormenta-electrica', 'NP_INS/dano-por-humedad-inundacion'] }, sigue: 'detalle' },
      { texto: 'El oleoducto', deja: { choke: 'exportacion', n1: 'NP_TRANSP', n2: 'NP_TRANSP/oleoducto-externo-fuera-de-servicio' } },
      NO_SE,
    ],
  },
  'afecto-orden-publico': {
    id: 'afecto-orden-publico', texto: '¿Qué se afectó?', quien: 'campo', fuente: 'U1 §2.4, seguimiento de orden público',
    pasos: ['n1', 'n2'],
    opciones: [
      { texto: 'El pozo, la locación o la vía', deja: { n1: 'NP_OPUB' }, sigue: 'detalle' },
      { texto: 'Un instrumento', deja: { n1: 'NP_INS' }, acota: { n2: ['NP_INS/hurto-de-instrumentacion', 'NP_INS/instrumentacion-manipulada-por-terceros'] }, sigue: 'detalle' },
      // La pareja más específica gana: atentado al oleoducto es NP_TRANSP, no NP_OPUB (R2 §3.2).
      { texto: 'El oleoducto', deja: { choke: 'exportacion', n1: 'NP_TRANSP', n2: 'NP_TRANSP/atentado-sabotaje-oleoducto-externo' } },
      NO_SE,
    ],
  },
  corte: {
    id: 'corte', texto: '¿De dónde vino el corte?', quien: 'campo', fuente: 'U1 §2.4, seguimiento de energía (ejemplo del transformador de Edinson [26:48])',
    pasos: ['responsable', 'choke', 'n1'],
    // U1 decía «De afuera: la red del proveedor». U2 §4.5 no deja «afuera» en
    // las opciones del operador (es la palabra del tramo de exportación), y el
    // corte del proveedor queda en la planta: se dice sin esa palabra.
    opciones: [
      { texto: 'Del proveedor: la red de la empresa de energía', deja: { responsable: 'ext-energia', choke: 'planta', planeacion: NP, n1: 'NP_ENEXT' }, sigue: 'detalle' },
      { texto: 'Del campo: pórtico, red de media o subestación', deja: { responsable: 'op-mantenimiento', choke: 'planta', planeacion: NP, n1: 'NP_ENINT' }, sigue: 'detalle' },
      { texto: 'De este pozo: su transformador, su variador o su cable', deja: { responsable: 'op-mantenimiento', choke: 'pozo', planeacion: NP, n1: 'NP_ENINT' }, sigue: 'detalle' },
      NO_SE,
    ],
  },
  trabajo: {
    id: 'trabajo', texto: '¿Qué trabajo era?', quien: 'campo', fuente: 'U1 §2.4, seguimiento de trabajo programado',
    pasos: ['responsable', 'n1'],
    opciones: [
      ...P_N1.map((k): OpcionCampo => ({ texto: N1_EN_CAMPO[k], deja: { planeacion: 'planeada', n1: k, responsable: RESPONSABLE_DE_TRABAJO(k) }, sigue: 'detalle' })),
      NO_SE,
    ],
  },
  programado: {
    id: 'programado', texto: '¿Este cierre estaba programado?', quien: 'campo', fuente: 'U1 §2.4, Pregunta 3',
    pasos: ['planeacion'],
    opciones: [
      { texto: 'Sí, estaba en el programa', deja: { planeacion: 'planeada' } },
      { texto: 'No, fue de repente', deja: { planeacion: NP } },
      NO_SE,
    ],
  },
  'se-perdio': {
    id: 'se-perdio', texto: '¿Se perdió crudo o gas que ya había salido?', quien: 'campo', fuente: 'U1 §2.4, Pregunta 4; P1 §2.4',
    pasos: ['impacto'],
    // Con el pozo cerrado la parada sigue diferida; lo regado o quemado va a
    // un evento de pérdida aparte (P1 §2.4, provisional: pregunta crítica 1).
    opciones: [
      { texto: 'No, solo dejó de producir', deja: { impacto: 'diferida' } },
      { texto: 'Sí, se regó crudo', deja: { impacto: 'diferida' }, perdida: 'derrame' },
      { texto: 'Sí, se fue gas a la tea o se venteó', deja: { impacto: 'diferida' }, perdida: 'tea' },
      NO_SE,
    ],
  },
  nominacion: {
    id: 'nominacion', texto: '¿Quién pidió bajar o cerrar el pozo?', quien: 'campo', fuente: 'P1 §2.1, fila «declarada» (chip de la orden de producción)',
    pasos: ['responsable', 'planeacion', 'n1', 'n2'],
    opciones: [
      { texto: 'El comprador o el transportador (la nominación)', deja: { responsable: 'ext-transportador', choke: 'exportacion', planeacion: NP, n1: 'NP_TRANSP', n2: 'NP_TRANSP/restriccion-nominacion-entrega' } },
      { texto: 'La operación lo decidió', deja: { responsable: 'op-operacion', planeacion: 'planeada', n1: 'P_OP', n2: 'P_OP/curtailed-por-decision-operativa' } },
      NO_SE,
    ],
  },
  aporte: {
    // Si el pozo no aportó, la restricción es del yacimiento: nunca sale de una
    // señal; lo dice producción o confiabilidad, con su evidencia (P1 §2.1; U2 §4.2-4.3).
    id: 'aporte', texto: 'Las señales apuntan a que al pozo le faltó aporte (baja carga). ¿Fue el yacimiento?', quien: 'yacimiento',
    fuente: 'U2 §4.2; P1 §2.1, fila de la electrosumergible con baja carga (UL); R2 §3.3',
    pasos: ['choke'],
    opciones: [
      { texto: 'Sí, fue el yacimiento', deja: {}, sigue: 'evidencia-yacimiento' },
      { texto: 'No, fue la bomba', deja: { choke: 'pozo' } },
    ],
  },
  'evidencia-yacimiento': {
    id: 'evidencia-yacimiento', texto: '¿Qué lo muestra?', quien: 'yacimiento', fuente: 'U2 §4.3 (los atajos; una nota escrita va por declararYacimiento)',
    pasos: ['choke'],
    opciones: (Object.keys(ATAJO_YACIMIENTO) as AtajoYacimiento[]).map((a): OpcionCampo => ({
      texto: `${ATAJO_YACIMIENTO[a][0]!.toUpperCase()}${ATAJO_YACIMIENTO[a].slice(1)}`, deja: {}, yacimiento: a })),
  },
}

/** «¿Qué falló primero?»: la N1 entre las que admite la regla, sin códigos.
 *  Entre trabajos programados es la pregunta de U1 «¿Qué trabajo era?». */
function preguntaRaiz(n1s: readonly ClaveN1[]): PreguntaCampo {
  if (n1s.every(k => planeacionDeN1(k) === 'planeada')) return { ...PREGUNTAS_CAMPO.trabajo,
    opciones: PREGUNTAS_CAMPO.trabajo.opciones.filter(o => !o.deja.n1 || n1s.includes(o.deja.n1)) }
  return {
    id: 'raiz', texto: '¿Qué falló primero?', quien: 'campo', fuente: 'Palabras de N1_EN_CAMPO (U1 §2.3: dos niveles cortos, nunca las 117)',
    pasos: ['n1'],
    opciones: [...n1s.map((k): OpcionCampo => ({ texto: N1_EN_CAMPO[k], deja: { planeacion: planeacionDeN1(k), n1: k }, sigue: 'detalle' })), NO_SE],
  }
}

/** «¿Qué fue, exactamente?»: el N2 entre los que quedan, con la cadena de la Tabla 1 (U1 §2.3). */
const preguntaDetalle = (n2s: readonly CodigoN2[]): PreguntaCampo => ({
  id: 'detalle', texto: '¿Qué fue, exactamente?', quien: 'campo', fuente: 'Tabla 1 de la circular (C24 p.6-7), filtrada por la regla',
  pasos: ['n2'],
  opciones: [...n2s.map((c): OpcionCampo => { const k = n1DeCodigo(c); return { texto: textoN2(c), deja: { planeacion: planeacionDeN1(k), n1: k, n2: c } } }), NO_SE],
})

/** La pregunta del choke cuando el motor del choke la trae y ninguna otra la
 *  resuelve. La contesta quien revisa, nunca el operador; «En el yacimiento»
 *  no es una de sus opciones: tiene su propio camino, con evidencia (U2 §4.3). */
const preguntaChoke = (texto: string, chokes: readonly ChokeAnh[]): PreguntaCampo => ({
  id: 'choke', texto, quien: 'revisa', fuente: 'Motor del choke (choke.ts, chokeDeCausa)',
  pasos: ['choke'],
  opciones: [...chokes.filter(c => c !== 'reservorio').map((c): OpcionCampo => ({ texto: ETIQUETA_CHOKE[c], deja: { choke: c } })), NO_SE],
})

/* ─────────────────────────────── REGLAS_ANH v1 ─────────────────────────────── */

/** La versión de la tabla de reglas: va en `DatoClasificado.regla` de cada
 *  paso que propone. Una v2 se agrega; lo ya reportado conserva su `@1` (P1 §3.1). */
export const REGLAS_ANH_ID = 'REGLAS_ANH@1'

/** Las filas de `REGLAS_ANH` v1 (P1 §2.1), en su orden. */
export type IdFila =
  | 'esp-falla' | 'esp-admision' | 'bombeo-mecanico'
  | 'linea-rodamientos' | 'linea-motor' | 'linea-lubricacion' | 'linea-variador' | 'linea-sin-n2' | 'linea-capacidad'
  | 'energia-uv-o-dedicado' | 'energia-compartido' | 'energia-frontera'
  | 'aire' | 'compresion' | 'evacuacion' | 'proceso' | 'tratamiento'
  | 'programada-con-pareja' | 'programada-sin-pareja' | 'declarada-chip' | 'declarada-libre'

export interface FilaRegla {
  id: IdFila
  /** La condición de la fila, en palabras (P1 §2.1, primera columna). */
  cuando: string
  tipos: readonly TipoCausa[]
  /** Lo que la fila decide. Un paso que no está aquí va a `faltan`. */
  propone: Partial<ValoresPasos>
  /** El choke que espera la tabla. NO es el que se usa: ese sale de la
   *  topología, del motor del choke (`chokeDeCausa`; P1 §2.1 punto 4). */
  chokeEsperado?: ChokeAnh
  /** Las opciones cerradas que admite la fila para lo que falta (nunca las 117). */
  opciones: Partial<OpcionesCerradas>
  /** Lo que TRIM sugiere para un paso que falta: preselecciona, no es dato. */
  sugiere?: Partial<ValoresPasos>
  /** Las preguntas de campo que resuelven lo que falta. */
  preguntas: readonly IdPregunta[]
  /** Parejas a las que una persona puede cambiar con un toque. */
  alternativas?: readonly CodigoN2[]
  /** «Una señal apunta» vale para toda la fila (además de la firma y de GF, PH y UV). */
  apunta?: boolean
  /** El tramo depende de lo que conteste una persona y la cadena no se puede
   *  confirmar antes: el choke va a `faltan`, con lo del motor del choke como
   *  sugerencia (tanques llenos, U2 §4.4 caso 3). En las demás filas la
   *  pregunta del motor del choke viaja con la propuesta sin frenarla. */
  chokeEnFalta?: boolean
  /** La pérdida que TRIM propone registrar aparte (P1 §2.4). */
  perdida?: PerdidaPropuesta
  /** Un hueco de la Tabla 1: «sin causa exacta en la ANH» (U1 §2.3). */
  hueco?: string
  /** Por qué, en palabras de campo: va en `DatoClasificado.porque`. */
  porque: string
  fuente: string
}

const MANT: Pick<ValoresPasos, 'responsable' | 'impacto' | 'planeacion'> = { responsable: 'op-mantenimiento', impacto: 'diferida', planeacion: NP }
const OPER: Pick<ValoresPasos, 'responsable' | 'impacto' | 'planeacion'> = { responsable: 'op-operacion', impacto: 'diferida', planeacion: NP }
const DIFERIDA_NP: Pick<ValoresPasos, 'impacto' | 'planeacion'> = { impacto: 'diferida', planeacion: NP }
const todos = (...ks: ClaveN1[]): CodigoN2[] => ks.flatMap(k => [...n2DeN1(k)])
const LINEA: readonly TipoCausa[] = ['reinyeccion', 'transporte']

/** `REGLAS_ANH` v1: cómo lleva TRIM cada causa a los 6 pasos (P1 §2.1, con las
 *  decisiones de §3). El choke de cada fila es el que espera la tabla; el que
 *  se propone sale siempre del motor del choke. */
export const REGLAS_ANH: { id: string; filas: readonly FilaRegla[] } = {
  id: REGLAS_ANH_ID,
  filas: [
    { id: 'esp-falla', tipos: ['electrosumergible'],
      cuando: 'Electrosumergible con la parte motor, aislamiento, protector o bomba: códigos OT, GF, PH u OL del variador, o la parte que declaró una persona',
      propone: { ...MANT, n1: 'NP_SUB', n2: 'NP_SUB/falla-esp' }, chokeEsperado: 'pozo', opciones: {}, preguntas: [],
      // GF y PH pueden venir del cable de superficie o del variador: quien abra el equipo puede cambiar a esta.
      alternativas: ['NP_ENINT/falla-vsd'],
      porque: 'La falla es de la propia electrosumergible', fuente: 'P1 §2.1, fila 1; R2 §3.3' },
    { id: 'esp-admision', tipos: ['electrosumergible'],
      cuando: 'Electrosumergible con la parte admisión (código UL, baja carga): puede ser la bomba, arena o que el pozo dejó de aportar',
      propone: { ...MANT, n1: 'NP_SUB' }, chokeEsperado: 'pozo',
      opciones: { n2: ['NP_SUB/falla-esp', 'NP_SUB/arenamiento-obstruccion', 'NP_SUB/alto-bsw-corte-de-agua'], choke: ['pozo', 'reservorio'] },
      preguntas: ['aporte', 'detalle'],
      porque: 'La electrosumergible paró por baja carga: eso no dice si fue la bomba, arena o el yacimiento', fuente: 'P1 §2.1, fila 2; R2 §3.3' },
    { id: 'bombeo-mecanico', tipos: ['levantamiento'],
      cuando: 'Bombeo mecánico parado por su controlador (OL o UL)',
      propone: { ...MANT, n1: 'NP_SUP' }, chokeEsperado: 'pozo',
      opciones: { n2: todos('NP_SUP') }, sugiere: { n2: 'NP_SUP/falla-sistema-de-levantamiento-artificial' }, preguntas: ['detalle'],
      hueco: 'La varilla y la bomba de subsuelo no tienen causa propia en la Tabla 1: lo más cercano es «Falla Sistema de Levantamiento Artificial» (pregunta para Edinson, P1 §8)',
      porque: 'El controlador del bombeo mecánico paró la unidad', fuente: 'P1 §2.1, fila 3; R2 §3.3' },
    { id: 'linea-rodamientos', tipos: LINEA, cuando: 'Bomba de la línea (reinyección o multifásica) con la parte rodamientos',
      propone: { ...MANT, n1: 'NP_SUP', n2: 'NP_SUP/falla-rodamiento-cojinete-bearing-box' }, chokeEsperado: 'planta', opciones: {}, preguntas: [],
      porque: 'Fallaron los rodamientos de la bomba: la Tabla 1 tiene esa causa exacta', fuente: 'P1 §2.1, fila 4; §3.1' },
    { id: 'linea-motor', tipos: LINEA, cuando: 'Bomba de la línea con la parte motor',
      propone: { ...MANT, n1: 'NP_SUP', n2: 'NP_SUP/falla-motor-superficie' }, chokeEsperado: 'planta', opciones: {}, preguntas: [],
      porque: 'Falló el motor de la bomba: la Tabla 1 tiene esa causa exacta', fuente: 'P1 §2.1, fila 5; §3.1' },
    { id: 'linea-lubricacion', tipos: LINEA, cuando: 'Bomba de la línea con la parte lubricación',
      propone: { ...MANT, n1: 'NP_SUP', n2: 'NP_SUP/falla-caja-reductora-lubricacion' }, chokeEsperado: 'planta', opciones: {}, preguntas: [],
      porque: 'Falló la lubricación de la bomba: la Tabla 1 tiene esa causa exacta', fuente: 'P1 §2.1, fila 6; §3.1' },
    { id: 'linea-variador', tipos: LINEA,
      cuando: 'Bomba de la línea cuya primera alarma (first-out) es del variador o del arrancador/MCC, según la clase del tag que declara la configuración (Config.protecciones, P1 §2.9)',
      propone: { ...MANT, n1: 'NP_ENINT' }, chokeEsperado: 'planta', opciones: { n2: ['NP_ENINT/falla-vsd', 'NP_ENINT/falla-mcc-switchgear'] }, preguntas: [],
      apunta: true,
      porque: 'La primera alarma de la bomba es de su variador o de su arrancador', fuente: 'P1 §2.1, fila 7; S1 P1-15' },
    { id: 'linea-sin-n2', tipos: LINEA,
      cuando: 'Bomba de la línea con la parte sello, succión, filtro, desgaste interno o tornillos, o sin parte: la Tabla 1 no tiene causa para la bomba de reinyección ni para la multifásica',
      propone: { ...MANT, n1: 'NP_PROC', n2: 'NP_PROC/parada-estacion-bombeo-afecta-pozos' }, chokeEsperado: 'planta', opciones: {}, preguntas: [],
      porque: 'La bomba de la línea paró y le cortó el paso al pozo; la parte va en la descripción', fuente: 'P1 §2.1, fila 8; §3.1' },
    { id: 'linea-capacidad', tipos: LINEA,
      cuando: 'El pozo se cerró porque el tanque de agua llegó a su límite sin que la bomba fallara (capacidad)',
      propone: { ...OPER, n1: 'NP_PROC', n2: 'NP_PROC/tanques-llenos-capacidad-limitada' }, chokeEsperado: 'planta', opciones: {}, preguntas: [],
      porque: 'La bomba no falló: el agua llegó al límite de lo que la planta puede disponer', fuente: 'P1 §2.1, fila 9' },
    { id: 'energia-uv-o-dedicado', tipos: ['energia'],
      cuando: 'Energía: baja tensión (UV) en el controlador del pozo, o un elemento eléctrico dedicado a un solo pozo',
      propone: { ...MANT, n1: 'NP_ENINT' }, chokeEsperado: 'pozo', opciones: { n2: todos('NP_ENINT') }, preguntas: ['corte', 'detalle'],
      porque: 'La energía le faltó al pozo; si vino de afuera, lo dice una persona (Externo · Proveedor de energía)', fuente: 'P1 §2.1, fila 10; R2 §3.3' },
    { id: 'energia-compartido', tipos: ['energia'],
      cuando: 'Energía: cayó un elemento compartido del campo (pórtico, red de media)',
      propone: { ...MANT, n1: 'NP_ENINT' }, chokeEsperado: 'planta', opciones: { n2: todos('NP_ENINT') }, preguntas: ['detalle'],
      porque: 'Cayó un elemento eléctrico que les sirve a varios pozos', fuente: 'P1 §2.1, fila 11; transcript [26:48]' },
    { id: 'energia-frontera', tipos: ['energia'],
      cuando: 'Energía: cayó la acometida o la subestación de llegada (frontera o de otro dueño): TRIM no tiene la señal que diga si fue afuera o adentro',
      propone: { ...DIFERIDA_NP }, chokeEsperado: 'planta',
      opciones: { responsable: ['ext-energia', 'op-mantenimiento'], n1: ['NP_ENEXT', 'NP_ENINT'], n2: todos('NP_ENEXT', 'NP_ENINT') },
      preguntas: ['corte', 'detalle'],
      porque: 'Cayó la energía en la frontera del campo', fuente: 'P1 §2.1, fila 12; R2 §3.3' },
    { id: 'aire', tipos: ['aire'], cuando: 'Cayó el aire de instrumentos',
      propone: { ...MANT }, chokeEsperado: 'planta',
      opciones: { n1: ['NP_SUP', 'NP_ENINT', 'NP_INS', 'NP_CTRL'], n2: ['NP_SUP/falla-motor-superficie', ...todos('NP_ENINT', 'NP_INS', 'NP_CTRL')] },
      preguntas: ['raiz', 'detalle'],
      hueco: 'La Tabla 1 no tiene causa para los servicios industriales (aire de instrumentos): se escoge por lo que falló primero (R2 §3.3; pregunta para Edinson)',
      porque: 'Cayó el aire de instrumentos, que les sirve a varios pozos', fuente: 'P1 §2.1, fila 13; R2 §3.3' },
    { id: 'compresion', tipos: ['compresion'], cuando: 'Se detuvo el compresor de gas',
      propone: { ...MANT, n1: 'NP_PROC', n2: 'NP_PROC/capacidad-compresion-transferencia-gas-limitada' }, chokeEsperado: 'planta', opciones: {}, preguntas: [],
      perdida: 'tea',
      porque: 'Se detuvo la compresión del gas: es la única causa no planeada de la Tabla 1 que la nombra', fuente: 'P1 §2.1, fila 14; R2 §3.3' },
    { id: 'evacuacion', tipos: ['evacuacion'], cuando: 'Evacuación del crudo con un equipo propio de la batería (tanque, LACT)',
      propone: { ...DIFERIDA_NP }, chokeEsperado: 'planta',
      opciones: { responsable: ['op-operacion', 'ext-transportador'], choke: ['planta', 'exportacion'], n1: ['NP_PROC', 'NP_TRANSP'],
        n2: ['NP_PROC/tanques-llenos-capacidad-limitada', ...todos('NP_TRANSP')] },
      sugiere: { responsable: 'op-operacion', n1: 'NP_PROC', n2: 'NP_PROC/tanques-llenos-capacidad-limitada' },
      preguntas: ['tanques', 'detalle'], chokeEnFalta: true,
      porque: 'Se llenó el tanque de crudo o se limitó el despacho de la batería', fuente: 'P1 §2.1, fila 15; §3.3; U2 §4.4 caso 3' },
    { id: 'proceso', tipos: ['proceso'], cuando: 'El separador cerró la entrada',
      propone: { ...OPER, n1: 'NP_PROC', n2: 'NP_PROC/capacidad-tratamiento-agua-crudo-limitada' }, chokeEsperado: 'planta', opciones: {}, preguntas: [],
      alternativas: ['NP_INS/falla-transmisor-de-nivel'],
      porque: 'El separador no recibió: capacidad de tratamiento. Si la raíz fue un instrumento, se cambia a «Falla transmisor de nivel»', fuente: 'P1 §2.1, fila 16' },
    { id: 'tratamiento', tipos: ['tratamiento'], cuando: 'El tratador de crudo cerró la entrada',
      propone: { ...OPER, n1: 'NP_PROC', n2: 'NP_PROC/capacidad-tratamiento-agua-crudo-limitada' }, chokeEsperado: 'planta', opciones: {}, preguntas: [],
      perdida: 'rechazo',
      porque: 'El tratador no recibió: capacidad de tratamiento', fuente: 'P1 §2.1, fila 17' },
    { id: 'programada-con-pareja', tipos: ['programada'],
      cuando: 'Parada del programa firmado que trae su pareja ANH (la tarea del programa del técnico, P1 §1.12)',
      propone: { impacto: 'diferida', planeacion: 'planeada' }, opciones: {}, preguntas: [],
      porque: 'Estaba en el programa firmado, con su causa', fuente: 'P1 §2.1, fila 18' },
    { id: 'programada-sin-pareja', tipos: ['programada'],
      cuando: 'Parada del programa firmado que solo trae el motivo en texto libre (el programa de hoy)',
      propone: { impacto: 'diferida', planeacion: 'planeada' },
      opciones: { responsable: ['op-mantenimiento', 'op-operacion'], n1: P_N1, n2: todos(...P_N1) }, preguntas: ['trabajo', 'detalle'],
      porque: 'Estaba en el programa firmado', fuente: 'P1 §2.1, fila 19' },
    { id: 'declarada-chip', tipos: ['declarada'],
      cuando: 'Declarada con uno de los cuatro motivos cerrados de CAUSAS_POZO (mensajes.ts): lo que propone cada uno está en CHIPS_ANH',
      propone: { impacto: 'diferida' }, opciones: {}, preguntas: [],
      porque: 'Lo declaró una persona con un motivo cerrado', fuente: 'P1 §2.1, fila 20' },
    { id: 'declarada-libre', tipos: ['declarada'],
      cuando: 'Declarada en texto libre: TRIM no interpreta lo que escribió la persona',
      propone: { impacto: 'diferida' }, opciones: {}, preguntas: ['que-lo-paro', 'programado', 'detalle'],
      porque: 'Lo declaró una persona con sus palabras', fuente: 'P1 §2.1, fila 21' },
  ],
}
const FILA_POR_ID = new Map(REGLAS_ANH.filas.map(f => [f.id, f]))

type Chip = (typeof CAUSAS_POZO)[number]
interface FilaChip {
  propone: Partial<ValoresPasos>
  opciones: Partial<OpcionesCerradas>
  preguntas: readonly IdPregunta[]
  perdida?: PerdidaPropuesta
  porque: string
}
/** Los cuatro motivos cerrados de `CAUSAS_POZO` en el árbol (P1 §2.1, fila
 *  «declarada con chip»). Las claves son las cadenas de mensajes.ts: si una
 *  cambia, esto no compila. */
export const CHIPS_ANH: Readonly<Record<Chip, FilaChip>> = {
  'Cierre para prueba o intervención del pozo': {
    propone: { responsable: 'op-operacion', impacto: 'diferida', planeacion: 'planeada' },
    opciones: { n1: ['P_PRUEBAS', 'P_WO'], n2: todos('P_PRUEBAS', 'P_WO') }, preguntas: ['raiz', 'detalle'],
    porque: 'Escogió «Cierre para prueba o intervención del pozo»: es una decisión intencional del operador (planeada, C24 p.4)' },
  'Fuga o daño en la línea de flujo': {
    propone: { ...MANT, n1: 'NP_INTEG', n2: 'NP_INTEG/fuga-dano-en-linea-interna' }, opciones: {}, preguntas: [], perdida: 'derrame',
    porque: 'Escogió «Fuga o daño en la línea de flujo»' },
  'Orden de producción: nominación o restricción del comprador': {
    propone: { impacto: 'diferida' },
    opciones: { responsable: ['ext-transportador', 'op-operacion'], n1: ['NP_TRANSP', 'P_OP'],
      n2: ['NP_TRANSP/restriccion-nominacion-entrega', 'P_OP/curtailed-por-decision-operativa'] },
    preguntas: ['nominacion'],
    porque: 'Escogió «Orden de producción»: vale para el comprador (no planeada) o para una decisión de la operación (planeada)' },
  'Falla del controlador o de un instrumento del pozo': {
    propone: { ...MANT }, opciones: { n1: ['NP_CTRL', 'NP_INS'], n2: todos('NP_CTRL', 'NP_INS') }, preguntas: ['raiz', 'detalle'],
    porque: 'Escogió «Falla del controlador o de un instrumento del pozo»' },
}

/* ──────────────────────────────── la propuesta ──────────────────────────────── */

/** El estado de una parada para la ANH (P1 §1.5). En pantalla (U1 §2):
 *  «falta confirmar», «falta un dato», «completa», «sin causa». */
export type EstadoParadaAnh = 'propuesta' | 'por-precisar' | 'confirmada' | 'pendiente'

/** Lo que el motor todavía no tiene y le da la configuración o una persona. */
export interface OpcionesPropuesta {
  /** La clase de cada tag de primera alarma, por equipo: variador o
   *  arrancador/MCC (`Config.protecciones`, P1 §2.9). Todavía no existe en la
   *  configuración: sin ella, la parada sigue en «sin parte» (P1, P1-15). */
  protecciones?: Readonly<Record<string, Readonly<Record<string, 'variador' | 'mcc'>>>>
  /** La bomba no falló: el pozo se cerró porque el tanque de agua llegó a su
   *  límite. TRIM no tiene hoy esa señal (P1 §2.1, fila 9): la marca una persona. */
  capacidadSinFalla?: boolean
  /** La pareja ANH de cada parada del programa, por su id (la traerá
   *  `TareaPrograma.pareja`, P1 §1.12; el programa de hoy solo tiene el motivo). */
  parejaDelPrograma?: Readonly<Record<string, CodigoN2>>
}

export interface PropuestaAnh {
  estado: EstadoParadaAnh
  borrador: BorradorClasificacion
  /** Solo cuando los 6 pasos están y son coherentes. */
  clasificacion?: ClasificacionAnh
  /** Los pasos que pide una persona. */
  faltan: PasoAnh[]
  /** Las opciones cerradas de cada paso que falta. */
  opciones: Partial<OpcionesCerradas>
  /** Lo que TRIM sugiere para lo que falta: preselección, no dato. */
  sugerido: Partial<ValoresPasos>
  /** En palabras de campo, lo que resuelve lo que falta (U1 §2.4). */
  preguntas: PreguntaCampo[]
  /** Lo que impide clasificar, en palabras (vacío si nada). */
  problemas: string[]
  /** La fila de `REGLAS_ANH` que aplicó. */
  fila: IdFila | 'pendiente'
  regla: string
  apunta?: SenalApunta
  perdida?: PerdidaPropuesta
  alternativas?: readonly CodigoN2[]
  hueco?: string
  /** La pregunta del motor del choke, tal cual: viaja con la propuesta
   *  (CHOKE-CONSTRUCCION, interfaz de `chokeDeCausa`). */
  preguntaChoke?: string
  /** El porqué del motor del choke (con su pregunta y, en el tramo, la
   *  cascada), también cuando el choke está en falta (U2 §11.1). */
  porqueChoke?: PorqueChoke
  /** Alguien contestó «No sé»: el paso escala al supervisor (U1 §2.4). */
  escalada?: { pregunta: IdPregunta; porId: string; hora: string }
  /** Para volver a evaluar después de cada respuesta. */
  causaPendiente: boolean
  opcionesRegla: Partial<OpcionesCerradas>
  preguntasPendientes: readonly IdPregunta[]
}

/* Los eventos de los controladores por id, una vez (la propuesta se pide por cada tramo). */
const EVENTO_POR_ID = perezoso(() => new Map(eventosPozos().map(e => [e.id, e])))
/** Solo claves propias: un id que llega de la configuración no puede devolver algo del prototipo. */
const propio = <T,>(o: Readonly<Record<string, T>> | undefined, k: string): T | undefined => (o && Object.hasOwn(o, k) ? o[k] : undefined)

/** El código del controlador, si la causa es un evento del propio pozo (no
 *  la cascada de un servicio ni una bomba de la línea). */
function codigoDeCausa(c: Causa): CodigoControlador | undefined {
  return c.evento ? EVENTO_POR_ID().get(c.evento)?.codigo : undefined
}

/** La parada del programa firmado en la que cae una causa programada: la regla
 *  de `causa-senal.ts` (el equipo, el campo y el inicio de la parada raíz dentro
 *  de la ventana). La usa también el corte del exceso (`anh-paradas.ts`). */
export function programaDeCausa(c: Causa, campoId: string, ctx: Contexto): ParadaProgramada | undefined {
  if (c.tipo !== 'programada' || !c.evento) return undefined
  const inicio = paradaPorId(c.evento)?.inicio ?? EVENTO_POR_ID().get(c.evento)?.inicio
  if (!inicio) return undefined
  const t = Date.parse(inicio)
  return ctx.config.programa.find(p => p.campoId === campoId && p.equipo === c.equipo && Date.parse(p.desde) <= t && t <= Date.parse(p.hasta))
}

/** La clase del first-out de la bomba que paró, si la configuración la declara. */
function claseFirstOut(c: Causa, op: OpcionesPropuesta): 'variador' | 'mcc' | undefined {
  const ev = c.evento ? paradaPorId(c.evento) : undefined
  const tag = ev?.primeraAlarma?.tag
  return ev && tag ? propio(propio(op.protecciones, ev.equipo), tag) : undefined
}

const esChip = (t: string): t is Chip => Object.hasOwn(CHIPS_ANH, t)
/** El motivo cerrado que escogió quien declaró, si escogió uno. */
function chipDe(c: Causa): Chip | undefined {
  const t = (c.declarado?.texto ?? c.texto).trim()
  return esChip(t) ? t : undefined
}

/** La fila de `REGLAS_ANH` v1 de una causa. */
function filaDe(c: Causa, campoId: string, ctx: Contexto, op: OpcionesPropuesta, ch: ChokeDeParada | null): IdFila | 'pendiente' {
  switch (c.tipo) {
    case 'pendiente': return 'pendiente'
    case 'electrosumergible': return c.parte && c.parte !== 'admision' ? 'esp-falla' : 'esp-admision'
    case 'levantamiento': return 'bombeo-mecanico'
    case 'reinyeccion':
    case 'transporte':
      // El first-out del variador manda sobre la parte que diga la firma: disparó primero.
      if (claseFirstOut(c, op)) return 'linea-variador'
      if (op.capacidadSinFalla) return 'linea-capacidad'
      return c.parte === 'rodamientos' ? 'linea-rodamientos' : c.parte === 'motor' ? 'linea-motor'
        : c.parte === 'lubricacion' ? 'linea-lubricacion' : 'linea-sin-n2'
    case 'energia':
      // UV es del controlador del pozo; un servicio, según su alcance en la topología.
      if (codigoDeCausa(c) === 'UV' || ch?.alcance === 'dedicado') return 'energia-uv-o-dedicado'
      return ch?.alcance === 'frontera' || ch?.alcance === 'tercero' ? 'energia-frontera' : 'energia-compartido'
    case 'aire':
    case 'compresion':
    case 'evacuacion':
    case 'proceso':
    case 'tratamiento':
      return c.tipo
    case 'programada': {
      const pr = programaDeCausa(c, campoId, ctx)
      return pr && propio(op.parejaDelPrograma, pr.id) ? 'programada-con-pareja' : 'programada-sin-pareja'
    }
    case 'declarada': return chipDe(c) ? 'declarada-chip' : 'declarada-libre'
  }
}

/** Regla «una señal apunta, no prueba» (P1 §2.1; Hollman [37:34]). */
function senalQueApunta(c: Causa, fila: IdFila | 'pendiente'): SenalApunta | undefined {
  const regla = 'senal-apunta@1' as const
  if (c.como === 'firma') return { regla, porque: 'Las señales al parar apuntan a esta parte, no la prueban: la confirma quien abra el equipo' }
  const codigo = c.como === 'senal' ? codigoDeCausa(c) : undefined
  if (codigo === 'GF' || codigo === 'PH' || codigo === 'UV')
    return { regla, porque: `El código ${codigo} (${CODIGO[codigo]}) puede venir de superficie (el cable, el variador o la red): las señales apuntan a esta causa, no la prueban. La confirma quien abra el equipo` }
  if (fila !== 'pendiente' && FILA_POR_ID.get(fila)?.apunta)
    return { regla, porque: 'La primera alarma es del variador o del arrancador: apunta a la causa, no la prueba. La confirma quien abra el equipo' }
  return undefined
}

/** La versión del armado de `desc_evid`. */
export const DESC_EVID_ID = 'desc-evid@1'

/** Quien declaró, dicho por su rol («el supervisor»), nunca por su nombre (S1 R-D). */
function comoRol(por: string): string {
  const i = por.lastIndexOf(' · ')
  return i >= 0 ? `el ${por.slice(i + 3).trim()}` : 'una persona del campo'
}

/** `desc_evid` armado por TRIM desde la causa: lo que dice, la parte y la
 *  evidencia, con la persona dicha por su rol (P1 §1.3; S1 R-D). Lo armó TRIM:
 *  procedencia de regla, origen C. */
export function descripcionDeCausa(c: Causa): DatoClasificado<string> {
  const quien = c.declarado?.por
  const sinNombre = (s: string) => (quien ? s.split(quien).join(comoRol(quien)) : s)
  const lineas = [c.texto, ...(c.parte ? [`Parte: ${NOMBRE_PARTE[c.parte]}`] : []), ...c.evidencia]
    .map(s => sinNombre(s).trim().replace(/[.\s]+$/, '')).filter(Boolean)
  return { valor: lineas.join('. '), procedencia: 'regla', regla: DESC_EVID_ID, porque: 'TRIM la armó con la causa y su evidencia' }
}

const dato = <T,>(valor: T, regla: string, porque: string, procedencia: Procedencia = 'regla'): DatoClasificado<T> => ({ valor, procedencia, regla, porque })

/** La causa general sigue al N2 mientras la ponga TRIM (P1 §1.2b); la de una persona se respeta. */
function conCausaGeneral(b: BorradorClasificacion): BorradorClasificacion {
  if (b.cauGral && b.cauGral.procedencia !== 'regla') return b
  const r: BorradorClasificacion = { ...b }
  const valor = b.n2 ? causaGeneralDe(b.n2.valor) : b.n1 ? CAU_GRAL_DE_N1.porN1[b.n1.valor] : undefined
  if (valor) r.cauGral = { valor, procedencia: 'regla', regla: CAU_GRAL_DE_N1.id, porque: 'Sale de la causa (tabla provisional CAU_GRAL_DE_N1@1)' }
  else delete r.cauGral
  return r
}

/** La propuesta de TRIM para la clasificación ANH de una causa (P1 §2.1).
 *  Corre después de `deducirEvento` (`causa-senal.ts`), que no cambia:
 *  1. Causa `pendiente` → estado `pendiente`, los 6 pasos en `faltan`, nada propuesto.
 *  2. Si no, `REGLAS_ANH` v1 sobre la causa de TRIM.
 *  3. El choke sale SIEMPRE del motor del choke (`chokeDeCausa`, E1): si no lo
 *     decide, va a `faltan`; si trae pregunta, la pregunta viaja.
 *  4. Lo que la fila no decide queda en `faltan` con sus opciones cerradas y
 *     sus preguntas en palabras de campo → `por-precisar`; si todo se dedujo → `propuesta`.
 *  Nada sale confirmado: lo confirma una persona (`confirmarPasos`). */
export function proponerClasificacion(causa: Causa, campoId: string, ctx: Contexto, op: OpcionesPropuesta = {}): PropuestaAnh {
  const descEvid = descripcionDeCausa(causa)
  const ch = causa.tipo === 'pendiente' ? null : chokeDeCausa(causa, campoId, ctx)
  const id = filaDe(causa, campoId, ctx, op, ch)
  if (id === 'pendiente') return evaluar({
    estado: 'pendiente', borrador: { descEvid }, faltan: [...PASOS], opciones: {}, sugerido: {}, preguntas: [], problemas: [],
    fila: 'pendiente', regla: `${REGLAS_ANH_ID}#pendiente`, causaPendiente: true, opcionesRegla: {},
    preguntasPendientes: ['que-lo-paro', 'programado', 'se-perdio'],
  })
  const fila = FILA_POR_ID.get(id)!
  const chip = id === 'declarada-chip' ? CHIPS_ANH[chipDe(causa)!] : undefined
  const regla = `${REGLAS_ANH_ID}#${id}`
  const porque = chip?.porque ?? fila.porque
  const propone: Partial<ValoresPasos> = { ...(chip?.propone ?? fila.propone) }
  const pr = programaDeCausa(causa, campoId, ctx)
  if (id === 'linea-variador') propone.n2 = claseFirstOut(causa, op) === 'mcc' ? 'NP_ENINT/falla-mcc-switchgear' : 'NP_ENINT/falla-vsd'
  const pareja = id === 'programada-con-pareja' && pr ? propio(op.parejaDelPrograma, pr.id) : undefined
  if (pareja) {
    const k = n1DeCodigo(pareja)
    propone.n1 = k
    propone.n2 = pareja
    if (esN1Planeada(k)) propone.responsable = RESPONSABLE_DE_TRABAJO(k)
  }

  let b: BorradorClasificacion = { descEvid }
  if (propone.responsable) b = conPaso(b, 'responsable', dato(propone.responsable, regla, porque))
  if (propone.impacto) b = conPaso(b, 'impacto', dato(propone.impacto, regla,
    'El pozo dejó de producir y lo que no produjo se recupera después: diferida. Una pérdida la declara una persona (P1 §2.4)'))
  if (propone.planeacion) b = conPaso(b, 'planeacion', pr && propone.planeacion === 'planeada'
    ? dato(propone.planeacion, `programa:${pr.id}`, `Estaba en el programa firmado: ${pr.motivo}`, 'programa')
    : dato(propone.planeacion, regla, propone.planeacion === 'planeada' ? porque : 'No estaba en el programa firmado (P1 §2.2)'))
  if (propone.n1) b = conPaso(b, 'n1', dato(propone.n1, regla, porque))
  if (propone.n2) b = conPaso(b, 'n2', dato(propone.n2, regla, porque))

  // Paso 2: el motor del choke, con su porqué guardado como datos (U2 §11.1).
  // Si la fila depende de una respuesta (tanques llenos), queda sugerido y en
  // falta; si no, se propone y su pregunta, si la trae, viaja sin frenar la cadena.
  const sugerido: Partial<ValoresPasos> = { ...(chip ? {} : fila.sugiere) }
  const porqueChoke = ch ? porqueDeChoke(ch) : undefined
  if (ch && porqueChoke && !fila.chokeEnFalta) b = conPaso(b, 'choke', { valor: ch.choke, procedencia: 'regla', regla: ch.regla, porque: porqueChoke })
  else if (ch) sugerido.choke = ch.choke

  const apunta = senalQueApunta(causa, id)
  if (apunta) b = { ...b, apunta }
  const perdida = chip ? chip.perdida : fila.perdida
  return evaluar({
    estado: 'por-precisar', borrador: conCausaGeneral(b), faltan: [], opciones: {}, sugerido, preguntas: [], problemas: [],
    fila: id, regla, causaPendiente: false,
    opcionesRegla: { ...(chip ? chip.opciones : fila.opciones) },
    preguntasPendientes: chip ? chip.preguntas : fila.preguntas,
    ...(apunta ? { apunta } : {}),
    ...(perdida ? { perdida } : {}),
    ...(fila.alternativas ? { alternativas: fila.alternativas } : {}),
    ...(fila.hueco ? { hueco: fila.hueco } : {}),
    ...(ch?.pregunta ? { preguntaChoke: ch.pregunta } : {}),
    ...(porqueChoke ? { porqueChoke } : {}),
  })
}

/** El porqué del paso 2 copiado del motor del choke: regla, elemento, pozos
 *  servidos, la frase y lo que todavía pregunta (U2 §11.1). */
function porqueDeChoke(ch: ChokeDeParada): PorqueChoke {
  return {
    regla: ch.regla, texto: ch.porque,
    ...(ch.elemento !== undefined ? { elemento: ch.elemento } : {}),
    ...(ch.servidos !== undefined ? { pozosServidos: ch.servidos } : {}),
    ...(ch.pregunta ? { pregunta: ch.pregunta } : {}),
  }
}

/** ¿El choke propuesto lleva una pregunta del motor del choke que nadie ha contestado? */
const chokeConPregunta = (b: BorradorClasificacion): boolean =>
  !!b.choke && !esDePersona(b.choke.procedencia) && !!b.choke.porque?.pregunta

/** Vuelve a calcular lo que falta, sus opciones (acotadas por lo que ya se
 *  sabe: el paso 4 filtra el 5 y el 5 filtra el 6, U1 §2.5), las preguntas
 *  abiertas y el estado. */
function evaluar(p: PropuestaAnh): PropuestaAnh {
  const b = p.borrador
  const faltan = PASOS.filter(x => !b[x])
  const r = p.opcionesRegla
  const plan = b.planeacion?.valor, n1 = b.n1?.valor
  const o: Partial<OpcionesCerradas> = {}
  if (!b.responsable) o.responsable = r.responsable ?? RESPONSABLES
  if (!b.choke) o.choke = r.choke ?? CHOKES
  if (!b.impacto) o.impacto = r.impacto ?? IMPACTOS
  if (!b.planeacion) o.planeacion = r.planeacion ?? PLANEACIONES
  if (!n1) {
    const base = (r.n1 ?? CLAVES_N1).filter(k => !plan || planeacionDeN1(k) === plan)
    // Si la planeación que dijo la persona saca todas las de la fila, quedan las de esa planeación.
    o.n1 = base.length ? base : plan ? n1DePlaneacion(plan) : CLAVES_N1
  }
  if (!b.n2) {
    const n1s: readonly ClaveN1[] = n1 ? [n1] : o.n1 ?? []
    const base = (r.n2 ?? []).filter(c => n1s.includes(n1DeCodigo(c)))
    const n2s = base.length ? base : n1 ? n2DeN1(n1) : []
    if (n2s.length) o.n2 = n2s
  }

  // Una pregunta sigue abierta si resuelve un paso que falta, o si resuelve
  // el choke que TRIM propuso con una pregunta del motor del choke sin contestar.
  const abierto = (x: PasoAnh) => faltan.includes(x) || (x === 'choke' && chokeConPregunta(b))
  const preguntas: PreguntaCampo[] = []
  const agregar = (q: PreguntaCampo | undefined) => {
    if (q && q.pasos.some(abierto) && !preguntas.some(y => y.id === q.id)) preguntas.push(q)
  }
  for (const id of p.preguntasPendientes) {
    if (id === 'raiz') agregar(o.n1 && o.n1.length > 1 ? preguntaRaiz(o.n1) : undefined)
    // El detalle va cuando ya se sabe la causa (o hay una sola posible): dos niveles cortos (U1 §2.3).
    else if (id === 'detalle') agregar(o.n2?.length && (n1 || (o.n1?.length ?? 0) <= 1) ? preguntaDetalle(o.n2) : undefined)
    else if (id !== 'choke') agregar(PREGUNTAS_CAMPO[id])
  }
  if (abierto('choke') && !preguntas.some(q => q.opciones.some(x => x.deja.choke)))
    agregar(preguntaChoke(p.preguntaChoke ?? '¿Dónde se originó la parada: en el pozo, en la planta o afuera?', o.choke ?? CHOKES))

  const problemas = faltan.length ? [] : problemasDeClasificacion(b)
  const sugerido: Partial<ValoresPasos> = {}
  for (const [k, v] of Object.entries(p.sugerido)) if (faltan.includes(k as PasoAnh)) Object.assign(sugerido, { [k]: v })
  const salida: PropuestaAnh = { ...p, estado: estadoDe(b, p.causaPendiente), faltan, opciones: o, sugerido, preguntas, problemas }
  if (!faltan.length && !problemas.length) salida.clasificacion = clasificar(b)
  else delete salida.clasificacion
  return salida
}

/* ───────────────────────── lo que hace una persona ───────────────────────── */

/** Lo que el toque «Confirmar» de cada rol sube a confirmado (P1 §1.3; S1
 *  §2.2 d; cambio P1-6). El operador y el técnico, solo lo de su terreno: si
 *  estaba programado y si se regó algo. Supervisión, producción, el jefe de
 *  mantenimiento y confiabilidad, los 6. Un rol que no está aquí no confirma. */
export const PASOS_QUE_CONFIRMA: Readonly<Record<string, readonly PasoAnh[]>> = {
  oper: ['planeacion', 'impacto'], tec: ['planeacion', 'impacto'],
  sup: PASOS, prod: PASOS, jefe: PASOS, conf: PASOS,
}

/** Lo que la respuesta de cada rol deja dicho por una persona (origen M). Lo
 *  demás que deja su respuesta es propuesta de TRIM (origen C) hasta que lo
 *  confirma un rol de la segunda fila: ninguna marca M se fabrica con el
 *  toque de quien no ve esos pasos como suyos (P1 §1.3). El técnico abre el
 *  equipo: lo que encontró es la causa (N1 y N2; P1 §2.1, «una señal apunta»). */
export const PASOS_QUE_DECLARA: Readonly<Record<string, readonly PasoAnh[]>> = {
  oper: ['planeacion', 'impacto'], tec: ['planeacion', 'impacto', 'n1', 'n2'],
  sup: PASOS, prod: PASOS, jefe: PASOS, conf: PASOS,
}

/** Quienes abren o analizan el equipo: confirman la causa que una señal solo
 *  apunta (P1 §2.1; P1-6 «hecho distinto»: jefe y confiabilidad). */
export const CONFIRMAN_LO_QUE_APUNTA: readonly string[] = ['jefe', 'conf']

/** ¿Lo avaló una persona de un rol que puede avalarlo? Es lo que pide
 *  `confirmada` para cada uno de los 6 pasos (P1 §1.5). */
export function avalado(b: BorradorClasificacion, paso: PasoAnh): boolean {
  const d = b[paso]
  if (!d || !esDePersona(d.procedencia) || !d.rol) return false
  if (d.procedencia !== 'confirmado') return (propio(PASOS_QUE_DECLARA, d.rol) ?? []).includes(paso)
  if (!(propio(PASOS_QUE_CONFIRMA, d.rol) ?? []).includes(paso)) return false
  return !(b.apunta && (paso === 'n1' || paso === 'n2') && !CONFIRMAN_LO_QUE_APUNTA.includes(d.rol))
}

/** El estado de una clasificación (P1 §1.5). `causaPendiente`: la causa de
 *  TRIM es «sin identificar»; si una persona completó los 6 pasos, ya se puede reportar. */
export function estadoDe(b: BorradorClasificacion, causaPendiente = false): EstadoParadaAnh {
  if (!completa(b) || problemasDeClasificacion(b).length) return causaPendiente ? 'pendiente' : 'por-precisar'
  return PASOS.every(x => avalado(b, x)) ? 'confirmada' : 'propuesta'
}

/** Una persona dice el valor de un paso. Si el paso faltaba, queda
 *  `declarado`; si TRIM proponía otro, `corregido` (con lo propuesto al lado);
 *  si es el mismo, `confirmado`. Si el paso no es del terreno de su rol
 *  (`PASOS_QUE_DECLARA`), lo que dijo queda como propuesta de TRIM (origen C).
 *  La coherencia no se rompe (P1 §2.2; U1 §2.5): cambiar la planeación borra la
 *  causa de la otra planeación; una N1 de la otra planeación se rechaza; un N2
 *  arrastra su N1. */
export function declararPaso<P extends PasoAnh>(b: BorradorClasificacion, paso: P, valor: ValoresPasos[P], quien: Persona, rol: string,
  hora: string, regla: string = PREGUNTAS_CAMPO_ID): BorradorClasificacion {
  const antes = b[paso] as DatoDePaso<P> | undefined
  if (paso === 'choke' && valor === 'reservorio' && antes?.valor !== 'reservorio')
    throw new ErrorClasificacion(['«En el yacimiento» lo ponen producción o confiabilidad diciendo qué lo muestra (declararYacimiento; U2 §4.3).'])
  const suyo = (propio(PASOS_QUE_DECLARA, rol) ?? []).includes(paso)
  const persona = { por: quien.nombre, porId: quien.id, rol, hora }
  let d: DatoDePaso<P>
  if (!suyo) {
    // Lo que contestó quien no avala este paso no pisa lo que dijo otra
    // persona. Si coincide con lo propuesto, solo da por contestada la
    // pregunta del motor del choke: el paso sigue siendo propuesta (origen C).
    if (antes && esDePersona(antes.procedencia)) return b
    const preguntaba = paso === 'choke' && !!(antes as DatoClasificado<ChokeAnh, PorqueChoke> | undefined)?.porque?.pregunta
    if (antes && antes.valor === valor && !preguntaba) return b
    const porque = porqueDePersona(paso, antes, regla, quien, `TRIM lo dedujo de lo que contestó ${quien.nombre} a las ${hora}`)
    d = { valor, procedencia: 'regla', regla, ...(porque !== undefined ? { porque } : {}), ...(antes && antes.valor !== valor ? { propuesto: antes.valor } : {}) }
  } else if (antes && antes.valor === valor) d = esDePersona(antes.procedencia) ? antes : { ...antes, procedencia: 'confirmado', ...persona }
  else {
    const porque = porqueDePersona(paso, antes, regla, quien)
    d = { valor, procedencia: antes ? 'corregido' : 'declarado', regla, ...persona, ...(porque !== undefined ? { porque } : {}),
      ...(antes ? { propuesto: antes.propuesto ?? antes.valor } : {}) }
  }

  let r = conPaso(b, paso, d)
  if (paso === 'planeacion' && r.n1 && planeacionDeN1(r.n1.valor) !== valor)
    r = conPaso(conPaso(r, 'n1', undefined), 'n2', undefined)
  if (paso === 'n1') {
    const k = valor as ClaveN1
    if (r.planeacion && planeacionDeN1(k) !== r.planeacion.valor)
      throw new ErrorClasificacion([`«${textoN1(k)}» es una causa ${ETIQUETA_PLANEACION[planeacionDeN1(k)].toLowerCase()}: cambie primero «¿Planeada?» (U1 §2.5).`])
    if (r.n2 && n1DeCodigo(r.n2.valor) !== k) r = conPaso(r, 'n2', undefined)
  }
  if (paso === 'n2') {
    const k = n1DeCodigo(valor as CodigoN2)
    if (!r.n1 || r.n1.valor !== k) r = declararPaso(r, 'n1', k, quien, rol, hora, regla)
  }
  return conCausaGeneral(r)
}

/** El porqué de lo que dice (o hace decir) una persona en un paso. En el
 *  paso 2 se guarda quién y lo que ya se sabía del elemento (U2 §11.1); en los
 *  demás, la pantalla escribe «dijo {persona} · {hora}» con `por` y `hora`. */
function porqueDePersona<P extends PasoAnh>(paso: P, antes: DatoDePaso<P> | undefined, regla: string, quien: Persona, texto?: string): PorqueDePaso[P] | undefined {
  if (paso !== 'choke') return texto as PorqueDePaso[P] | undefined
  const previo = (antes as DatoClasificado<ChokeAnh, PorqueChoke> | undefined)?.porque
  const p: PorqueChoke = {
    regla, persona: quien.nombre,
    ...(previo?.elemento !== undefined ? { elemento: previo.elemento } : {}),
    ...(previo?.pozosServidos !== undefined ? { pozosServidos: previo.pozosServidos } : {}),
    ...(previo?.cascada ? { cascada: previo.cascada } : {}),
    ...(texto ? { texto } : {}),
  }
  return p as PorqueDePaso[P]
}

/** «En el yacimiento» (P1 §2.1; U2 §4.3): solo producción o confiabilidad lo
 *  ponen, y diciendo qué lo muestra (un atajo o una nota). Nunca sale de una
 *  señal ni de la respuesta del operador. */
export function declararYacimiento(b: BorradorClasificacion, evidencia: EvidenciaYacimiento, quien: Persona, rol: string, hora: string): BorradorClasificacion {
  if (!PONEN_YACIMIENTO.includes(rol))
    throw new ErrorClasificacion(['«En el yacimiento» solo lo ponen producción o confiabilidad: necesita una prueba de pozo, el corte de agua o la presión de fondo, que no se ven desde el campo (U2 §4.3).'])
  const ev = evidencia.trim()
  if (!ev) throw new ErrorClasificacion(['Para poner «En el yacimiento» diga qué lo muestra: la prueba del pozo, el corte de agua, la presión de fondo o una nota (U2 §4.3).'])
  const antes = b.choke
  const queMuestra = Object.hasOwn(ATAJO_YACIMIENTO, ev) ? ATAJO_YACIMIENTO[ev as AtajoYacimiento] : ev
  const d: DatoDePaso<'choke'> = {
    valor: 'reservorio', procedencia: antes && antes.valor !== 'reservorio' ? 'corregido' : 'declarado', regla: REGLA_YACIMIENTO,
    por: quien.nombre, porId: quien.id, rol, hora,
    porque: { regla: REGLA_YACIMIENTO, persona: quien.nombre, evidencia: ev, texto: `Lo puso ${quien.nombre}: ${queMuestra}`,
      ...(antes?.porque?.elemento !== undefined ? { elemento: antes.porque.elemento } : {}) },
    ...(antes && antes.valor !== 'reservorio' ? { propuesto: antes.propuesto ?? antes.valor } : {}),
  }
  return conCausaGeneral(conPaso(b, 'choke', d))
}

/** En qué orden se aplica lo que deja una respuesta: la planeación antes de la
 *  causa (el paso 4 filtra el 5) y la causa antes del detalle. */
const ORDEN_DEJA: readonly PasoAnh[] = ['planeacion', 'n1', 'n2', 'responsable', 'choke', 'impacto']

const QUIEN_CONTESTA: Record<QuienContesta, string> = {
  campo: 'operación, mantenimiento, supervisión, producción o confiabilidad',
  revisa: 'supervisión, producción, el jefe de mantenimiento o confiabilidad (al operador nunca se le pide dónde se trabó)',
  yacimiento: 'producción o confiabilidad',
}

/** Una persona contesta una pregunta de campo con una de sus opciones. */
export function responder(p: PropuestaAnh, pregunta: IdPregunta, opcion: number, quien: Persona, rol: string, hora: string): PropuestaAnh {
  const q = p.preguntas.find(x => x.id === pregunta)
  if (!q) throw new Error(`La pregunta «${pregunta}» no está abierta en esta parada.`)
  const o = q.opciones[opcion]
  if (!o) throw new Error(`La pregunta «${q.texto}» no tiene la opción ${opcion}.`)
  if (!ROLES_QUE_CONTESTAN[q.quien].includes(rol)) throw new ErrorClasificacion([`«${q.texto}» la contesta ${QUIEN_CONTESTA[q.quien]}.`])
  let b = p.borrador
  for (const paso of ORDEN_DEJA) {
    const v = o.deja[paso]
    if (v !== undefined) b = declararPaso(b, paso, v, quien, rol, hora)
  }
  if (o.yacimiento) b = declararYacimiento(b, o.yacimiento, quien, rol, hora)
  // «No sé» no fija nada: la pregunta sigue abierta y escala al supervisor (U1 §2.4).
  const noSe = !o.sigue && !o.acota && !o.yacimiento && Object.keys(o.deja).length === 0
  const siguen = noSe ? p.preguntasPendientes
    : [...p.preguntasPendientes.filter(x => x !== pregunta), ...(o.sigue && o.sigue !== pregunta ? [o.sigue] : [])]
  const perdida = o.perdida ?? p.perdida
  return evaluar({
    ...p, borrador: b, opcionesRegla: { ...p.opcionesRegla, ...o.acota }, preguntasPendientes: siguen,
    ...(perdida ? { perdida } : {}),
    ...(noSe ? { escalada: { pregunta, porId: quien.id, hora } } : {}),
  })
}

/** El toque «Confirmar» de una persona: sube a `confirmado` solo los pasos que
 *  su rol puede avalar (`PASOS_QUE_CONFIRMA`) y que nadie había dicho todavía;
 *  lo que ella misma contestó ya es suyo. Con «una señal apunta», la N1 y la N2
 *  solo las confirma quien abre o analiza el equipo (P1 §1.3, §2.1). */
export function confirmarPasos(c: ClasificacionAnh, rol: string, quien: Persona, hora: string, lote?: string): ClasificacionAnh
export function confirmarPasos(c: BorradorClasificacion, rol: string, quien: Persona, hora: string, lote?: string): BorradorClasificacion
export function confirmarPasos(c: BorradorClasificacion, rol: string, quien: Persona, hora: string, lote?: string): BorradorClasificacion {
  const puede = propio(PASOS_QUE_CONFIRMA, rol) ?? []
  let r = c
  for (const paso of PASOS) {
    const d = r[paso]
    if (!d || esDePersona(d.procedencia) || !puede.includes(paso)) continue
    if (r.apunta && (paso === 'n1' || paso === 'n2') && !CONFIRMAN_LO_QUE_APUNTA.includes(rol)) continue
    r = conPaso(r, paso, { ...d, procedencia: 'confirmado', por: quien.nombre, porId: quien.id, rol, hora, ...(lote ? { lote } : {}) })
  }
  return completa(r) ? clasificar(r) : r
}

/** Una propuesta con lo que ya dijeron las personas encima (lo guardado por
 *  evento: Unicidad, un evento una clasificación; P1 §2.6). Lo que TRIM
 *  propuso y ya no va con lo que dijo una persona se quita (P1 §2.2). */
export function aplicarGuardada(p: PropuestaAnh, g: BorradorClasificacion): PropuestaAnh {
  let b: BorradorClasificacion = { ...p.borrador }
  for (const paso of ORDEN_DEJA) {
    const d = g[paso]
    if (d && esDePersona(d.procedencia)) b = conPaso(b, paso, d)
  }
  if (g.cauGral && g.cauGral.procedencia !== 'regla') b = { ...b, cauGral: g.cauGral }
  if (g.descEvid && esDePersona(g.descEvid.procedencia)) b = { ...b, descEvid: g.descEvid }
  if (b.n1 && b.planeacion && planeacionDeN1(b.n1.valor) !== b.planeacion.valor && !esDePersona(b.n1.procedencia))
    b = conPaso(conPaso(b, 'n1', undefined), 'n2', undefined)
  if (b.n2 && b.n1 && n1DeCodigo(b.n2.valor) !== b.n1.valor && !esDePersona(b.n2.procedencia)) b = conPaso(b, 'n2', undefined)
  return evaluar({ ...p, borrador: conCausaGeneral(b) })
}

/** La regla del exceso de una parada planeada (P1 §2.2; CHOKE-COMPLETO §5.5). */
export const REGLA_EXCESO = 'programa-exceso@1'

/** El tramo que se pasó de la ventana del programa: no planeado, con el
 *  responsable y la causa por precisar. Así no se esconde una falla bajo un
 *  mantenimiento (P1 §2.2; NO VERIFICADO con la ANH). El choke y el impacto
 *  siguen siendo los del equipo intervenido. */
export function propuestaDeExceso(base: PropuestaAnh, programa: { id: string; hasta: string }): PropuestaAnh {
  const { choke, impacto, descEvid } = base.borrador
  const b: BorradorClasificacion = {
    ...(choke ? { choke } : {}), ...(impacto ? { impacto } : {}), ...(descEvid ? { descEvid } : {}),
    planeacion: { valor: NP, procedencia: 'regla', regla: REGLA_EXCESO,
      porque: `Se pasó de la ventana del programa ${programa.id} (hasta ${programa.hasta}): lo que siguió cerrado no es planeado` },
  }
  return evaluar({
    estado: 'por-precisar', borrador: conCausaGeneral(b), faltan: [], opciones: {}, sugerido: {}, preguntas: [], problemas: [],
    fila: base.fila, regla: REGLA_EXCESO, causaPendiente: false,
    opcionesRegla: { responsable: ['op-mantenimiento', 'op-operacion', 'op-planeacion'], ...(choke ? {} : { choke: base.opcionesRegla.choke ?? CHOKES }) },
    preguntasPendientes: ['raiz', 'detalle'],
    ...(base.preguntaChoke ? { preguntaChoke: base.preguntaChoke } : {}),
  })
}

/** La cadena de los 6 pasos en códigos internos, para agrupar lo idéntico
 *  (confirmación en lote, U1 §2.2) y para guardar qué vio quien confirmó (P1 §1.3). */
export const cadenaDe = (b: BorradorClasificacion): string | undefined =>
  completa(b) ? PASOS.map(x => String(b[x]!.valor)).join(' · ') : undefined

/* ──────────────────────────────── el origen ──────────────────────────────── */

/** El origen A/M/C de un dato según su procedencia (P1 §1.3, provisional):
 *  la señal y el registro, A; lo deducido sin persona, el de la forma de salida
 *  (C por defecto); lo de una persona, M. */
export function origenDe(procedencia: Procedencia, version: IdVersionCatalogo = VERSION_POR_DEFECTO): OrigenAnh {
  const { forma } = VERSIONES_CATALOGO[version]
  if (procedencia === 'senal' || procedencia === 'registro') return 'A'
  return esDePersona(procedencia) ? forma.origenConfirmado : forma.origenDeducido
}

/** El origen de cada campo de clasificación. Un paso con marca de persona que
 *  su rol no puede avalar viaja como deducido: la M no se fabrica (P1 §1.3). */
export function origenesDe(b: BorradorClasificacion, version: IdVersionCatalogo = VERSION_POR_DEFECTO): Partial<Record<PasoAnh | 'cauGral' | 'descEvid', OrigenAnh>> {
  const r: Partial<Record<PasoAnh | 'cauGral' | 'descEvid', OrigenAnh>> = {}
  for (const paso of PASOS) {
    const d = b[paso]
    if (d) r[paso] = esDePersona(d.procedencia) && !avalado(b, paso) ? VERSIONES_CATALOGO[version].forma.origenDeducido : origenDe(d.procedencia, version)
  }
  if (b.cauGral) r.cauGral = origenDe(b.cauGral.procedencia, version)
  if (b.descEvid) r.descEvid = origenDe(b.descEvid.procedencia, version)
  return r
}

/* ───────────────────────── para el tramo reportable ───────────────────────── */

/** La misma propuesta con la descripción de su tramo («Tramo n de m…»,
 *  «Continúa al corte del día»), armada por TRIM. La que escribió una persona no se toca. */
export function conDescripcion(p: PropuestaAnh, valor: string): PropuestaAnh {
  if (p.borrador.descEvid && esDePersona(p.borrador.descEvid.procedencia)) return p
  return evaluar({ ...p, borrador: { ...p.borrador, descEvid: { valor, procedencia: 'regla', regla: DESC_EVID_ID, porque: 'TRIM la armó con la causa, su evidencia y el tramo' } } })
}

/** La propuesta vuelta a evaluar con otro borrador (después de confirmar o de corregir). */
export const reevaluar = (p: PropuestaAnh, b: BorradorClasificacion): PropuestaAnh => evaluar({ ...p, borrador: conCausaGeneral(b) })

/** El porqué del choke con la cascada de su tramo: la raíz y cuántos minutos
 *  después de su caída paró este pozo (U2 §4.2: «porque LC-16 cerró 3 min
 *  después de que cayó K-101…»). Lo que dijo una persona no se toca. */
export function conCascada(p: PropuestaAnh, cascada: { raiz: string; minutos: number }): PropuestaAnh {
  const ch = p.borrador.choke
  const borrador = ch?.porque && !esDePersona(ch.procedencia) ? { ...p.borrador, choke: { ...ch, porque: { ...ch.porque, cascada } } } : p.borrador
  return evaluar({ ...p, borrador, ...(p.porqueChoke ? { porqueChoke: { ...p.porqueChoke, cascada } } : {}) })
}
