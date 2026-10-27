/** El árbol de pérdidas del choke: el «modelo choke expandido».
 *
 *  SPE-36848 (Palen y Goodwin, BP 1996), el modelo que adopta la Circular ANH
 *  024 (p. 4), abre cada tramo en niveles más bajos «down to at least another
 *  level e.g. ESP failure» (R2 §1.1). En la ANH esos niveles son los pasos del
 *  árbol de Edinson: responsable, diferida o pérdida, planeada o no, causa N1 y
 *  detalle N2 (transcript [26:48]: «esto está copiado del modelo choque»). Aquí
 *  cada barril diferido del período cuelga de UN tramo y, dentro de él, de todo
 *  el árbol, y cada nodo suma exacto lo que tiene debajo (CHOKE-COMPLETO §6):
 *
 *    diferido del libro = Σ por tramo = Σ por tramo, Σ por planeación, Σ por causa…
 *
 *  Se arma con las filas de la ANH (`paradasAnh`) y su clasificación vigente:
 *  lo que ya dijeron las personas encima de lo que propone TRIM, como en las
 *  vistas. Tres órdenes, el mismo barril:
 *   - `gestion` (el de por defecto): tramo → planeada o no → causa → detalle →
 *     equipo → parte. Es el del norte: dónde se trabó y qué hay que evitar;
 *   - `circular`: responsable → tramo → diferida o pérdida → planeada o no →
 *     causa → detalle, el orden de los 6 pasos de la circular (C24 p. 5);
 *   - `responsable`: responsable → tramo → causa → equipo.
 *
 *  Reglas:
 *   - Un paso que falta va en su propia rama, `falta` («sin identificar» en el
 *     tramo, `sin-asignar`). Nunca se reparte para que cuadre (U2 §0, principio 5).
 *   - El tramo es el paso 2 vigente (`tramoVigente`, choke-reparto.ts). Si el
 *     paso 2 espera una respuesta (el tanque de crudo lleno: «¿el oleoducto o el
 *     cliente estaba recibiendo?»), la fila cuenta donde lo propone el motor del
 *     choke mientras tanto. Son las MISMAS filas y la misma regla del reparto de
 *     todas las vistas (`brechaPorChoke`, la tubería, la serie, el mes a mes): el
 *     primer nivel del orden `gestion` es ese reparto, también después de que una
 *     persona corrige el paso 2 o el 4 (QA-A-01; C-09).
 *   - Lo no planeado de cada nodo (`noPlaneadaBbl`) es la cifra del norte (D4):
 *     el escalón `disponibilidad-no-planeada` de sus filas (`escalonDeFila`), sin
 *     el curtailment ni lo sin identificar. El paso 4 de la ANH (planeada o no,
 *     con la nominación del oleoducto como «no planeada») es su nivel propio,
 *     `planeacion`, el que lee Regulatorio.
 *   - Un período que no empieza a medianoche toma de cada fila solo sus horas
 *     dentro (QA-A-11): la raíz es siempre el diferido del libro del período.
 *   - La rama de la pérdida existe en el paso 3, pero hoy está vacía: TRIM
 *     todavía no registra pérdidas (lo producido que no se vendió). Ningún
 *     barril diferido se pasa a ella para llenarla (P1 §1.9).
 *   - Los hijos van de más a menos barriles; «falta» y «sin identificar», al final.
 *
 *  Va en su propio archivo porque lee las filas de la ANH, que a su vez leen el
 *  motor del choke: dentro de choke.ts sería una importación circular. No
 *  cambia el libro, la causa, el choke ni la clasificación: los lee y los ordena. */
import { NOMBRE_CHOKE, type EscalonOSinClasificar } from './choke'
import { paradasAnh, type ParadaAnh, type OpcionesParadas } from './anh-paradas'
import { filasDelChoke, tramoVigente, escalonDeFila, elementoDeFila, bblEnPeriodo, filaEnPeriodo } from './choke-reparto'
import {
  VERSIONES_CATALOGO, VERSION_POR_DEFECTO, ETIQUETA_RESPONSABLE, ETIQUETA_IMPACTO, ETIQUETA_PLANEACION,
  equivalente, esCodigoN2Conocido, textoN2, textoN1, CLAVES_N1,
  type IdVersionCatalogo, type PasoAnh, type CodigoN2, type ClaveN1,
} from './anh-catalogo'
import { NOMBRE_PARTE } from './partes'
import { TIPO_CAUSA, type Contexto, type TipoCausa } from './causa-senal'
import { AHORA } from './reloj'

/* ───────────────────────────── los órdenes y sus niveles ───────────────────────────── */

/** Los tres órdenes del árbol. */
export type OrdenArbol = 'gestion' | 'circular' | 'responsable'
export const ORDENES_ARBOL: readonly OrdenArbol[] = ['gestion', 'circular', 'responsable']

/** Un nivel del árbol: un paso de la circular (el tramo es el paso 2) o un nivel de gestión. */
export type NivelArbol = 'tramo' | 'responsable' | 'impacto' | 'planeacion' | 'n1' | 'n2' | 'equipo' | 'parte'
export type DimensionArbol = 'raiz' | NivelArbol

/** Los niveles de cada orden, debajo de la raíz. */
export const NIVELES_ARBOL: Readonly<Record<OrdenArbol, readonly NivelArbol[]>> = {
  gestion: ['tramo', 'planeacion', 'n1', 'n2', 'equipo', 'parte'],
  circular: ['responsable', 'tramo', 'impacto', 'planeacion', 'n1', 'n2'],
  responsable: ['responsable', 'tramo', 'n1', 'equipo'],
}

/** Cómo se dice cada orden. */
export const NOMBRE_ORDEN: Record<OrdenArbol, string> = {
  gestion: 'Por dónde se trabó: tramo, planeada o no, causa, detalle, equipo y parte',
  circular: 'Como la circular: quién, dónde se trabó, diferida o pérdida, planeada o no, causa y detalle',
  responsable: 'Por quién: quién, dónde se trabó, causa y equipo',
}

/** El rótulo de cada nivel en palabras de campo (los de la circular son los de `PASO_CAMPO`). */
export const NOMBRE_NIVEL: Record<NivelArbol, string> = {
  tramo: 'Dónde se trabó', responsable: 'Quién', impacto: 'Qué pasó', planeacion: '¿Planeada?',
  n1: 'Causa', n2: 'Detalle', equipo: 'Equipo', parte: 'Parte',
}

/** El paso de la circular de cada nivel que lo es (el tramo es el paso 2, `choke`). */
export const PASO_DE_NIVEL: Partial<Record<NivelArbol, PasoAnh>> = {
  responsable: 'responsable', tramo: 'choke', impacto: 'impacto', planeacion: 'planeacion', n1: 'n1', n2: 'n2',
}

/** El campo de `paradas_pozo` donde viaja cada paso (C24 p. 8). */
export const CAMPO_ANH: Partial<Record<NivelArbol, string>> = {
  responsable: 'resp_par', tramo: 'choke_mod', impacto: 'dif_perd', planeacion: 'pla_no_plan', n1: 'cau_niv1', n2: 'cau_niv2',
}

/** El valor de un paso que falta: va en su propia rama, nunca se reparte. */
export const FALTA = 'falta'
/** El tramo de lo que no se sabe dónde se trabó: «sin identificar» (el mismo
 *  código de `brechaPorChoke`). No es un tramo, es lo que todavía no se sabe. */
export const SIN_ASIGNAR = 'sin-asignar'
/** ¿Es una rama de lo que falta? Va al final de sus hermanas. */
export const esRamaQueFalta = (valor: string) => valor === FALTA || valor === SIN_ASIGNAR

/** Lo que dice cada rama que falta. */
export const TEXTO_FALTA: Record<NivelArbol, string> = {
  tramo: 'Sin identificar', responsable: 'Falta quién', impacto: 'Falta qué pasó', planeacion: 'Falta saber si fue planeada',
  n1: 'Falta la causa', n2: 'Falta el detalle', equipo: 'Sin equipo', parte: 'Sin parte',
}

/** La rama de la pérdida, que hoy está vacía. */
export const TEXTO_PERDIDA = 'Pérdida: TRIM todavía no tiene registro de pérdidas'
/** Por qué está vacía, para el ⓘ. */
export const EXPLICA_PERDIDA = 'La pérdida es lo producido que no se vendió (derrame, tea, pitera). Va aparte y nunca se suma a lo diferido. TRIM todavía no tiene el registro de pérdidas: esta rama queda vacía hasta que lo tenga, y ningún barril diferido se pasa a ella.'

/** La versión de la regla con que se arma el árbol. */
export const REGLA_ARBOL = 'choke.arbol@1'

/* ───────────────────────────── el árbol ───────────────────────────── */

/** Un nodo del árbol: un valor de un nivel, con lo que cuelga de él. */
export interface NodoArbol {
  dimension: DimensionArbol
  /** El código interno: `planta`, `no-planeada`, `NP_SUB`, `NP_SUB/falla-esp`,
   *  `op-mantenimiento`, `P-201B`, `sello`… `falta` si el paso falta; en el
   *  tramo, `sin-asignar` («sin identificar»). En la raíz, `total`. */
  valor: string
  /** En palabras de campo: «En la planta o estación», «No planeada», «Falló algo dentro del pozo…». */
  texto: string
  /** Lo que viaja a la ANH en la forma de salida vigente (`choke_mod`,
   *  `resp_par`, `dif_perd`, `pla_no_plan`, `cau_niv1`, `cau_niv2`). Solo en los
   *  pasos de la circular que tienen valor: nunca se inventa una cadena. */
  cadena?: string
  /** La diferida del libro que cuelga del nodo: Σ de sus ramas, exacto. */
  bbl: number
  /** Las filas de la ANH (pozo × día × causa) y los eventos del controlador que cuelgan de él. */
  filas: number
  eventos: number
  /** Los barriles con los 6 pasos avalados por una persona (estado `confirmada`). */
  confirmadoBbl: number
  /** Los barriles de las paradas no planeadas: el escalón
   *  `disponibilidad-no-planeada` de sus filas, la cifra del norte (D4). No
   *  cuenta la nominación del oleoducto ni lo sin identificar. */
  noPlaneadaBbl: number
  /** De más a menos barriles; «falta» y «sin identificar» al final. */
  hijos: NodoArbol[]
}

/** El árbol de un período y un orden. */
export interface ArbolChoke {
  orden: OrdenArbol
  /** Los niveles debajo de la raíz, en orden. */
  niveles: NivelArbol[]
  desde: Date
  hasta: Date
  campos: string[]
  /** La forma de salida de las cadenas. */
  version: IdVersionCatalogo
  regla: typeof REGLA_ARBOL
  raiz: NodoArbol
}

export interface OpcionesArbol extends OpcionesParadas {
  /** `gestion` si no se dice. */
  orden?: OrdenArbol
}

/** Una fila de la ANH con el valor que toma en cada nivel, su escalón y sus barriles en el período. */
interface FilaArbol { p: ParadaAnh; tipo: TipoCausa; bbl: number; escalon: EscalonOSinClasificar; valores: Record<NivelArbol, string> }

/** El valor de cada nivel de una fila, con su clasificación vigente. */
function filaDe(p: ParadaAnh, ctx: Contexto, d0: number, hh: number): FilaArbol {
  const c = p.clasificacion
  return {
    p, tipo: p.causa.tipo, bbl: bblEnPeriodo(p, d0, hh), escalon: escalonDeFila(p),
    valores: {
      // El paso 2 vigente; si espera una respuesta, donde lo propone el motor del choke (ver arriba).
      tramo: tramoVigente(p),
      responsable: c.responsable?.valor ?? FALTA,
      impacto: c.impacto?.valor ?? FALTA,
      planeacion: c.planeacion?.valor ?? FALTA,
      n1: c.n1?.valor ?? FALTA,
      n2: c.n2?.valor ?? FALTA,
      // El elemento donde se originó (la raíz de la cascada), el mismo de `brechaPorChoke.porChokeEquipo`.
      equipo: elementoDeFila(p, ctx),
      parte: p.causa.parte ?? FALTA,
    },
  }
}

/** Solo claves propias: un valor que llega de afuera no devuelve algo del prototipo. */
const propio = <T,>(o: Readonly<Record<string, T>>, k: string): T | undefined => (Object.hasOwn(o, k) ? o[k] : undefined)

/** El tipo de causa que más pesa en las filas de un equipo: «P-201B · bomba de agua». */
function tipoMayor(fs: readonly FilaArbol[]): TipoCausa | undefined {
  const por = new Map<TipoCausa, number>()
  for (const f of fs) por.set(f.tipo, (por.get(f.tipo) ?? 0) + f.bbl)
  let mayor: TipoCausa | undefined, max = -Infinity
  for (const [t, v] of por) if (v > max) { mayor = t; max = v }
  return mayor
}

/** Lo que dice un nodo, en palabras de campo. */
function textoDe(nivel: NivelArbol, v: string, fs: readonly FilaArbol[]): string {
  if (esRamaQueFalta(v)) return TEXTO_FALTA[nivel]
  switch (nivel) {
    case 'tramo': return propio(NOMBRE_CHOKE, v) ?? v
    case 'responsable': return propio(ETIQUETA_RESPONSABLE, v) ?? v
    case 'impacto': return v === 'perdida' ? TEXTO_PERDIDA : propio(ETIQUETA_IMPACTO, v) ?? v
    case 'planeacion': return propio(ETIQUETA_PLANEACION, v) ?? v
    // La causa con el MISMO nombre de la cadena de Identificar y del editor (B-27): el de la Tabla 1.
    case 'n1': return (CLAVES_N1 as readonly string[]).includes(v) ? textoN1(v as ClaveN1) : v
    case 'n2': return esCodigoN2Conocido(v) ? textoN2(v) : v
    case 'equipo': {
      const t = tipoMayor(fs)
      return t ? `${v} · ${TIPO_CAUSA[t].toLowerCase()}` : v
    }
    case 'parte': return propio(NOMBRE_PARTE, v) ?? v
  }
}

/** Lo que viaja a la ANH por un nodo, en la forma de salida (la de `cadenasAnh`). */
function cadenaDe(nivel: NivelArbol, v: string, version: IdVersionCatalogo): string | undefined {
  if (esRamaQueFalta(v)) return undefined
  const { forma } = VERSIONES_CATALOGO[version]
  switch (nivel) {
    case 'tramo': return propio(forma.choke, v)
    case 'responsable': return propio(forma.responsable, v)
    case 'impacto': return propio(forma.impacto, v)
    case 'planeacion': return propio(forma.planeacion, v)
    case 'n1': return Object.hasOwn(forma.n1Texto, v) ? (forma.cauNiv1 === 'clave' ? v : forma.n1Texto[v as keyof typeof forma.n1Texto]) : undefined
    case 'n2': return esCodigoN2Conocido(v) ? propio(forma.n2, equivalente(v as CodigoN2, version)) : undefined
    default: return undefined
  }
}

/** Las hermanas: de más a menos barriles; lo que falta, al final; a igual cifra, por su código. */
const antes = (a: NodoArbol, b: NodoArbol) =>
  Number(esRamaQueFalta(a.valor)) - Number(esRamaQueFalta(b.valor)) || b.bbl - a.bbl || (a.valor < b.valor ? -1 : a.valor > b.valor ? 1 : 0)

/** Un nodo con todo lo que cuelga de él. Las cifras de un nodo con ramas son
 *  la suma de sus ramas, en el orden en que quedan: cada nodo = Σ de sus hijos, exacto. */
function armar(dimension: DimensionArbol, valor: string, texto: string, cadena: string | undefined, filas: readonly FilaArbol[],
  niveles: readonly NivelArbol[], i: number, version: IdVersionCatalogo): NodoArbol {
  const n: NodoArbol = {
    dimension, valor, texto, ...(cadena !== undefined ? { cadena } : {}),
    bbl: 0, filas: filas.length, eventos: new Set(filas.map(f => f.p.eventoId)).size, confirmadoBbl: 0, noPlaneadaBbl: 0, hijos: [],
  }
  const nivel = niveles[i]
  if (!nivel) {
    for (const f of filas) {
      n.bbl += f.bbl
      if (f.p.estado === 'confirmada') n.confirmadoBbl += f.bbl
      if (f.escalon === 'disponibilidad-no-planeada') n.noPlaneadaBbl += f.bbl
    }
    return n
  }
  const grupos = new Map<string, FilaArbol[]>()
  for (const f of filas) {
    const v = f.valores[nivel]
    const g = grupos.get(v)
    if (g) g.push(f); else grupos.set(v, [f])
  }
  // La rama de la pérdida existe aunque esté vacía: TRIM todavía no registra pérdidas.
  if (nivel === 'impacto' && !grupos.has('perdida')) grupos.set('perdida', [])
  n.hijos = [...grupos].map(([v, fs]) => armar(nivel, v, textoDe(nivel, v, fs), cadenaDe(nivel, v, version), fs, niveles, i + 1, version)).sort(antes)
  for (const h of n.hijos) { n.bbl += h.bbl; n.confirmadoBbl += h.confirmadoBbl; n.noPlaneadaBbl += h.noPlaneadaBbl }
  return n
}

/** El árbol de pérdidas del choke de unos campos en un período, en un orden.
 *  La raíz es el diferido del libro del período (Σ de los barriles de las
 *  filas en el período); con los 6 pasos que dijeron las personas encima de lo
 *  que propone TRIM (`op.guardadas`). Las filas son las del reparto
 *  (`filasDelChoke`, una vez por contexto y por lo guardado); con otras
 *  opciones de la propuesta (las protecciones, sin parciales…), se arman aparte. */
export function arbolDelChoke(campoIds: string[], desde: Date, hasta: Date, ctx: Contexto, op: OpcionesArbol = {}): ArbolChoke {
  const { orden = 'gestion', ...opParadas } = op
  if (!ORDENES_ARBOL.includes(orden)) throw new Error(`«${String(orden)}» no es un orden del árbol: ${ORDENES_ARBOL.join(', ')}.`)
  const version = op.version ?? VERSION_POR_DEFECTO
  const niveles = NIVELES_ARBOL[orden]
  const d0 = desde.getTime(), hh = Math.min(hasta.getTime(), AHORA.getTime())
  const { guardadas, version: _v, ...otras } = opParadas
  const ps = Object.values(otras).some(x => x !== undefined) ? paradasAnh(campoIds, desde, hasta, ctx, opParadas) : filasDelChoke(campoIds, desde, hasta, ctx, guardadas)
  const filas = ps.filter(p => filaEnPeriodo(p, d0, hh)).map(p => filaDe(p, ctx, d0, hh))
  const raiz = armar('raiz', 'total', 'Lo diferido del período', undefined, filas, niveles, 0, version)
  return { orden, niveles: [...niveles], desde, hasta, campos: [...campoIds], version, regla: REGLA_ARBOL, raiz }
}

/* ───────────────────────────── la revisión ───────────────────────────── */

/** Lo que no está bien en un árbol, con dónde. */
export interface ProblemaArbol { ruta: string; texto: string }

/** Lo que hace que un árbol no se pueda creer, en palabras: un nodo que no
 *  suma sus ramas, ramas del nivel equivocado, un nodo con paradas y sin sus
 *  ramas, lo confirmado o lo no planeado por encima del nodo, o las hermanas
 *  fuera de orden. Lo usa el códec del contrato (lo que llega del servidor se
 *  revisa al entrar) y verificar-libro. La tolerancia es la de la referencia
 *  (1e-6 relativo): un backend puede sumar en otro orden. */
export function revisarArbol(a: Pick<ArbolChoke, 'orden' | 'niveles' | 'raiz'>): ProblemaArbol[] {
  const out: ProblemaArbol[] = []
  if (!ORDENES_ARBOL.includes(a.orden)) return [{ ruta: 'orden', texto: `«${String(a.orden)}» no es un orden del árbol: ${ORDENES_ARBOL.join(', ')}` }]
  const niveles = NIVELES_ARBOL[a.orden]
  if (!Array.isArray(a.niveles) || a.niveles.join() !== niveles.join())
    out.push({ ruta: 'niveles', texto: `el orden «${a.orden}» va ${niveles.join(' → ')} y llegó ${Array.isArray(a.niveles) ? a.niveles.join(' → ') : JSON.stringify(a.niveles)}` })
  const tol = (x: number) => 1e-6 * Math.max(1, Math.abs(x))
  const cifra = (x: unknown) => typeof x === 'number' && Number.isFinite(x)
  // Con tres decimales: lo que se lee en el error, no la cifra entera del doble.
  const cifraLeible = (x: number) => (Number.isFinite(x) ? String(Math.round(x * 1000) / 1000) : String(x))
  const ver = (n: NodoArbol, ruta: string, i: number) => {
    if (!n || typeof n !== 'object' || !Array.isArray(n.hijos)) { out.push({ ruta, texto: 'no es un nodo del árbol' }); return }
    const dim: DimensionArbol = i === 0 ? 'raiz' : niveles[i - 1]!
    if (n.dimension !== dim) out.push({ ruta, texto: `es del nivel «${n.dimension}» y en ese lugar va «${dim}»` })
    if (![n.bbl, n.confirmadoBbl, n.noPlaneadaBbl, n.filas, n.eventos].every(cifra)) { out.push({ ruta, texto: 'trae una cifra que no es un número' }); return }
    if (n.confirmadoBbl > n.bbl + tol(n.bbl)) out.push({ ruta, texto: `lo confirmado (${n.confirmadoBbl} bbl) pasa del nodo (${n.bbl})` })
    if (n.noPlaneadaBbl > n.bbl + tol(n.bbl)) out.push({ ruta, texto: `lo no planeado (${n.noPlaneadaBbl} bbl) pasa del nodo (${n.bbl})` })
    if (!n.hijos.length) {
      if (n.filas > 0 && i < niveles.length) out.push({ ruta, texto: `tiene ${n.filas} paradas y le faltan sus ramas` })
      return
    }
    if (i >= niveles.length) out.push({ ruta, texto: 'tiene ramas debajo del último nivel' })
    const suma = (k: 'bbl' | 'filas' | 'confirmadoBbl' | 'noPlaneadaBbl') => n.hijos.reduce((x, h) => x + (cifra(h?.[k]) ? h[k] : NaN), 0)
    if (!(Math.abs(suma('bbl') - n.bbl) <= tol(n.bbl))) out.push({ ruta, texto: `no suma sus ramas: ${cifraLeible(n.bbl)} bbl y sus ramas ${cifraLeible(suma('bbl'))}` })
    if (suma('filas') !== n.filas) out.push({ ruta, texto: `sus ramas suman ${suma('filas')} paradas y el nodo dice ${n.filas}` })
    if (!(Math.abs(suma('confirmadoBbl') - n.confirmadoBbl) <= tol(n.confirmadoBbl))) out.push({ ruta, texto: 'lo confirmado no suma lo de sus ramas' })
    if (!(Math.abs(suma('noPlaneadaBbl') - n.noPlaneadaBbl) <= tol(n.noPlaneadaBbl))) out.push({ ruta, texto: 'lo no planeado no suma lo de sus ramas' })
    n.hijos.forEach((h, k) => {
      const previa = n.hijos[k - 1]
      if (previa && h && (esRamaQueFalta(previa.valor) && !esRamaQueFalta(h.valor)
        || (esRamaQueFalta(previa.valor) === esRamaQueFalta(h.valor) && h.bbl > previa.bbl + tol(previa.bbl))))
        out.push({ ruta: `${ruta}.hijos[${k}]`, texto: 'fuera de orden: las ramas van de más a menos barriles y lo que falta al final' })
      ver(h, `${ruta}.hijos[${k}]`, i + 1)
    })
  }
  ver(a.raiz, 'raiz', 0)
  return out
}
