/** EL BALANCE DEL CHOKE: producido · diferido · perdido (A2 · CONSTRUCCION.md,
 *  «Lo que el dueño volvió a pedir»; necesario-por-rol §0b).
 *
 *  El dueño: «que los roles clave puedan entender cuánto produjeron, cuánto
 *  diferido quedó y cuántos barriles se perdieron, y la trazabilidad de sus causas».
 *
 *  - **Producido:** lo real del punto de medición oficial (`libro().real`), por
 *    campo; los días sin dato fiscal no entran y se dicen (`sinFiscal`). Sin un
 *    solo día con fiscal, `null` («sin dato»), nunca 0.
 *  - **Diferido:** lo que no se produjo y se puede producir después: Σ de las
 *    filas de la ANH del período (`filasDelChoke`), el MISMO diferido del libro
 *    y del árbol (`enterosDelPeriodo`, `arbolDelChoke`), por tramo con la
 *    clasificación vigente.
 *  - **Perdido:** lo que ya salió y no se vende, del registro de pérdidas
 *    (`perdidas.ts`), por el tramo donde ocurrió. Sin registros: `null` («sin
 *    registro»), nunca 0.
 *  - **El diferido y el perdido van lado a lado y NUNCA se suman** (PLAN-MAESTRO
 *    §3, «Pérdida»; CHOKE-COMPLETO §14, invariante 4). El potencial es
 *    producido + diferido; el perdido va aparte. Lo que el libro no explica con
 *    ninguna parada (`sinExplicar` = brecha del libro − diferido, el inventario
 *    de los días) se muestra y no se reparte: potencial del libro = producido +
 *    diferido + sin explicar, exacto.
 *  - **Por tramo** (yacimiento, pozos, planta, salida y lo sin identificar):
 *    dónde quedó el diferido y dónde se perdió.
 *  - **La trazabilidad, a un toque:** de cada tramo, su árbol: diferida →
 *    planeada o no → causa N1 → detalle N2 → las paradas (cada evento con quién
 *    dijo qué y cuándo, D1); pérdida → tipo → los registros (con su historia).
 *    Son las mismas filas y la misma clasificación del árbol de pérdidas del
 *    choke (`choke-arbol.ts`): el diferido de cada tramo es el primer nivel de su
 *    orden `gestion`, exacto.
 *  - **Los enteros, una vez** (`redondeo.ts`): el producido y el diferido de
 *    cada campo, su entero más cercano; el diferido de cada fila, el de
 *    `enterosDelPeriodo` (LC-08 = 108 en todas partes); cada nodo del árbol, la
 *    suma de los enteros de sus filas, así suma exacto el de su tramo; el total,
 *    la suma de los campos. El potencial entero = producido + diferido enteros.
 *  - **La jornada** (`jornada=actual|anterior`): cada campo en su jornada (el
 *    cambio de turno firmado del campo, `jornada.ts`) en vez de `desde`/`hasta`.
 *
 *  Contrato: `GET /api/vistas/balance?campos&desde&hasta` o `?campos&jornada`.
 *  D7: una vez por contexto, lo guardado, el registro de pérdidas, los campos y el período. */
import type { Contexto } from './causa-senal'
import { libro } from './libro'
import { filasDelChoke, filaEnPeriodo, bblEnPeriodo, tramoVigente, type OpcionesReparto } from './choke-reparto'
import { enterosDelPeriodo, enteroDe } from './redondeo'
import { CHOKES_Y_SIN_ASIGNAR, type ChokeAnh, type ChokeOSinAsignar } from './choke'
import { FALTA, TEXTO_FALTA, esRamaQueFalta } from './choke-arbol'
import { ETIQUETA_PLANEACION, ETIQUETA_RESPONSABLE, textoN1, textoN2, esCodigoN2Conocido, CLAVES_N1, PASOS, type ClaveN1, type PasoAnh } from './anh-catalogo'
import { esDeclaracion } from './anh-clasificacion'
import type { ParadaAnh, EstadoParadaAnh } from './anh-paradas'
import { perdidasDelPeriodo, NOMBRE_TIPO_PERDIDA, TIPOS_PERDIDA, EXPLICA_PERDIDA, type RegistroPerdida, type PerdidaVigente, type TipoPerdida, isoCo } from './perdidas'
import { jornadaDe, esJornada, type CualJornada, type Jornada } from './jornada'
import { NOMBRE_TRAMO_VIVO } from './planta-viva'
import { eventosDeCampo } from './pozos'
import { campoPorId } from './campos'
import { AHORA, fechaCorta } from './reloj'

/* ───────────────────────────── las formas ───────────────────────────── */

/** `GET /api/vistas/balance`: los campos y el período, o la jornada. */
export interface ConsultaBalance {
  campos: string[]
  desde?: Date
  hasta?: Date
  /** Cada campo en su jornada (`actual` o `anterior`); entonces `desde` y `hasta` no se mandan. */
  jornada?: CualJornada
}

/** Una cifra del balance: la exacta (el papel, la ANH) y la entera (la pantalla). */
export interface CifraBalance { exacto: number; entero: number }

/** Lo de un tramo: el diferido y el perdido, lado a lado. */
export interface TramoDelBalance {
  tramo: ChokeOSinAsignar
  /** «Yacimiento», «Pozos», «Planta», «Salida», «Sin identificar». */
  nombre: string
  diferido: CifraBalance
  /** null = sin registro de pérdidas en este tramo (nunca 0). «Sin identificar» nunca tiene pérdida: toda pérdida dice su tramo. */
  perdido: CifraBalance | null
}

/** Las tres cifras de un campo o del conjunto. */
export interface CifrasBalance {
  /** null = sin dato fiscal en el período. */
  producido: CifraBalance | null
  diferido: CifraBalance
  /** null = sin registro de pérdidas. */
  perdido: CifraBalance | null
  /** Producido + diferido; null sin producido. El perdido no entra. */
  potencial: CifraBalance | null
  /** Lo que el libro no explica con ninguna parada (brecha − diferido), bbl exactos: se muestra, no se reparte. */
  sinExplicar: number
  /** Gas perdido registrado, KPC; null sin registro de gas. Nunca entra en los barriles. */
  gasKpc: number | null
  /** Los días sin dato fiscal (AAAA-MM-DD): no entran en lo producido. */
  sinFiscal: string[]
  /** En el orden de la tubería, con lo sin identificar al final. */
  porTramo: TramoDelBalance[]
}

export interface CampoDelBalance extends CifrasBalance {
  campoId: string
  nombre: string
  /** El período del campo (con `jornada`, la suya). */
  desde: Date
  hasta: Date
}

/** Lo que dijo una persona de una parada: un paso, quién y cuándo (D1). */
export interface DichoDeParada {
  paso: PasoAnh
  valor: string
  texto: string
  procedencia: string
  por: string
  rol?: string
  hora: string
}

/** Una parada (un evento de un pozo) en la hoja del árbol. */
export interface ParadaDelBalance {
  campoId: string
  eventoId: string
  pozo: string
  equipo: string
  /** Cuándo empezó el evento y cuándo terminó (null = sigue), hora de Colombia con su zona. */
  inicio: string
  fin: string | null
  bbl: number
  bblEntero: number
  /** El más atrasado de sus filas en el período. */
  estado: EstadoParadaAnh
  /** Las filas de la ANH (`ParadaAnh.id`): «Ver una por una». */
  filas: string[]
  /** Lo que dijeron las personas (lo que propone TRIM no está aquí: si está vacío, todo es la propuesta de TRIM). */
  dijeron: DichoDeParada[]
}

/** Un nodo del árbol de un tramo: cada uno suma exacto (y en enteros) lo que tiene debajo. */
export interface NodoBalance {
  nivel: 'impacto' | 'planeacion' | 'n1' | 'n2' | 'tipo'
  /** El código (`diferida`, `no-planeada`, `NP_SUB`, `NP_SUB/falla-esp`, `pitera`) o `falta`. */
  valor: string
  texto: string
  bbl: number
  bblEntero: number
  /** Cuántas paradas (eventos) o pérdidas cuelgan. */
  eventos: number
  hijos: NodoBalance[]
  /** En la hoja de lo diferido (N2): las paradas, de más a menos barriles. */
  paradas?: ParadaDelBalance[]
  /** En la hoja de la pérdida (el tipo): los registros que rigen, con su historia. */
  perdidas?: PerdidaVigente[]
}

/** La trazabilidad de un tramo: su diferida y su pérdida, cada una con su árbol. */
export interface ArbolDelTramo {
  tramo: ChokeOSinAsignar
  nombre: string
  diferida: NodoBalance
  /** null = sin registro de pérdidas en el tramo. */
  perdida: NodoBalance | null
}

export interface VistaBalance {
  campos: string[]
  desde: Date
  hasta: Date
  /** Con `jornada`: cuál y la de cada campo. */
  jornada: CualJornada | null
  jornadas: Jornada[]
  /** «octubre», «1 de jul a 30 de sept», «la jornada de ahora». */
  periodo: string
  total: CifrasBalance
  porCampo: CampoDelBalance[]
  /** De cada tramo, su árbol (la trazabilidad), en el orden de la tubería. */
  arbol: ArbolDelTramo[]
  /** «Produjo 16.941 bbl · quedaron diferidos 1.046 · perdido: sin registro». */
  frase: string
  explica: string
  regla: typeof REGLA_BALANCE
}

export interface OpcionesBalance extends OpcionesReparto {
  perdidas?: readonly RegistroPerdida[]
}

export const REGLA_BALANCE = 'balance@1'
/** La ⓘ del balance. */
export const EXPLICA_BALANCE = `Producido: lo que midió el punto de medición oficial. Diferido: lo que no se produjo y se puede producir después (el libro). Perdido: lo que ya salió y no se vendió (el registro de pérdidas). El potencial es producido más diferido; el perdido va aparte y nunca se suma al diferido. ${EXPLICA_PERDIDA}`
/** El nombre corto de cada tramo, el de la tubería viva (yacimiento, pozos, planta, salida). */
export const NOMBRE_TRAMO_BALANCE: Record<ChokeOSinAsignar, string> = { ...NOMBRE_TRAMO_VIVO, 'sin-asignar': 'Sin identificar' }

/* ───────────────────────────── el cálculo ───────────────────────────── */

const D = 86_400_000
const NOMBRE_MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const FMT_N0 = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const n0 = (v: number) => FMT_N0.format(v === 0 ? 0 : v)
const cifra = (exacto: number, entero: number): CifraBalance => ({ exacto, entero })
const sumaCifras = (xs: ReadonlyArray<CifraBalance | null>): CifraBalance | null => {
  const ys = xs.filter((x): x is CifraBalance => x !== null)
  return ys.length ? cifra(ys.reduce((a, x) => a + x.exacto, 0), ys.reduce((a, x) => a + x.entero, 0)) : null
}

/** El nombre del período: el mes si es un mes entero (o el que corre), si no «1 de jul a 30 de sept». */
function nombrePeriodo(desde: Date, hasta: Date): string {
  const co = new Date(desde.getTime() - 5 * 3_600_000)
  const inicioMes = co.getUTCDate() === 1 && co.getUTCHours() === 0 && co.getUTCMinutes() === 0
  const finMes = Date.UTC(co.getUTCFullYear(), co.getUTCMonth() + 1, 1, 5)
  if (inicioMes && (hasta.getTime() === finMes || (hasta.getTime() >= AHORA.getTime() && AHORA.getTime() < finMes)))
    return NOMBRE_MES[co.getUTCMonth()]!
  return `${fechaCorta(desde)} a ${fechaCorta(new Date(Math.min(hasta.getTime(), AHORA.getTime()) - 1))}`
}

/** Lo que dice cada nodo. */
function textoDe(nivel: NodoBalance['nivel'], v: string): string {
  if (esRamaQueFalta(v)) return nivel === 'planeacion' || nivel === 'n1' || nivel === 'n2' ? TEXTO_FALTA[nivel] : 'Falta'
  switch (nivel) {
    case 'impacto': return v === 'perdida' ? 'Perdida' : 'Diferida'
    case 'planeacion': return Object.hasOwn(ETIQUETA_PLANEACION, v) ? ETIQUETA_PLANEACION[v as keyof typeof ETIQUETA_PLANEACION] : v
    case 'n1': return (CLAVES_N1 as readonly string[]).includes(v) ? textoN1(v as ClaveN1) : v
    case 'n2': return esCodigoN2Conocido(v) ? textoN2(v) : v
    case 'tipo': return Object.hasOwn(NOMBRE_TIPO_PERDIDA, v) ? NOMBRE_TIPO_PERDIDA[v as TipoPerdida] : v
  }
}
/** El texto de un paso que dijo una persona. */
function textoPaso(paso: PasoAnh, v: string): string {
  switch (paso) {
    case 'responsable': return Object.hasOwn(ETIQUETA_RESPONSABLE, v) ? ETIQUETA_RESPONSABLE[v as keyof typeof ETIQUETA_RESPONSABLE] : v
    case 'choke': return Object.hasOwn(NOMBRE_TRAMO_BALANCE, v) ? NOMBRE_TRAMO_BALANCE[v as ChokeOSinAsignar] : v
    case 'impacto': return textoDe('impacto', v)
    case 'planeacion': case 'n1': case 'n2': return textoDe(paso, v)
  }
}

/** Las hermanas: de más a menos barriles; lo que falta, al final; a igual cifra, por su código. */
const antes = (a: { valor: string; bbl: number }, b: { valor: string; bbl: number }) =>
  Number(esRamaQueFalta(a.valor)) - Number(esRamaQueFalta(b.valor)) || b.bbl - a.bbl || (a.valor < b.valor ? -1 : a.valor > b.valor ? 1 : 0)

/** Una fila del período con sus barriles y su entero. */
interface FilaDelBalance { p: ParadaAnh; bbl: number; entero: number }

const ORDEN_ESTADO: Record<EstadoParadaAnh, number> = { pendiente: 0, 'por-precisar': 1, propuesta: 2, confirmada: 3 }

/** Las paradas de una hoja: las filas agrupadas por evento, con lo que dijeron las personas. */
function paradasDe(fs: readonly FilaDelBalance[]): ParadaDelBalance[] {
  const por = new Map<string, FilaDelBalance[]>()
  for (const f of fs) { const k = `${f.p.campoId}|${f.p.eventoId}`; const g = por.get(k); if (g) g.push(f); else por.set(k, [f]) }
  return [...por.values()].map(g => {
    const p = g.at(-1)!.p
    const ev = eventosDeCampo(p.campoId).find(e => e.id === p.eventoId)
    const fin = ev?.fin ? (Date.parse(ev.fin) > AHORA.getTime() ? null : isoCo(Date.parse(ev.fin))) : null
    const dichos = new Map<string, DichoDeParada>()
    for (const { p: f } of g) for (const paso of PASOS) {
      const d = f.clasificacion[paso]
      if (!d || !esDeclaracion(d.procedencia) || !d.por || !d.hora) continue
      const valor = String(d.valor)
      dichos.set(`${paso}|${d.n ?? ''}|${valor}|${d.hora}`, { paso, valor, texto: textoPaso(paso, valor), procedencia: d.procedencia, por: d.por, ...(d.rol ? { rol: d.rol } : {}), hora: d.hora })
    }
    return {
      campoId: p.campoId, eventoId: p.eventoId, pozo: p.pozo, equipo: p.causa.equipo, inicio: p.inicioEvento, fin,
      bbl: g.reduce((a, f) => a + f.bbl, 0), bblEntero: g.reduce((a, f) => a + f.entero, 0),
      estado: g.map(f => f.p.estado).sort((a, b) => ORDEN_ESTADO[a] - ORDEN_ESTADO[b])[0]!,
      filas: g.map(f => f.p.id),
      dijeron: [...dichos.values()].sort((a, b) => a.hora.localeCompare(b.hora) || PASOS.indexOf(a.paso) - PASOS.indexOf(b.paso)),
    }
  }).sort((a, b) => b.bbl - a.bbl || a.eventoId.localeCompare(b.eventoId))
}

/** El árbol de lo diferido de un tramo: planeada o no → N1 → N2 → paradas. */
function arbolDiferida(fs: readonly FilaDelBalance[]): NodoBalance {
  const NIVELES = ['planeacion', 'n1', 'n2'] as const
  const valor = (f: FilaDelBalance, nivel: typeof NIVELES[number]) => (f.p.clasificacion[nivel]?.valor as string | undefined) ?? FALTA
  const armar = (nivel: NodoBalance['nivel'], v: string, xs: readonly FilaDelBalance[], i: number): NodoBalance => {
    const n: NodoBalance = { nivel, valor: v, texto: textoDe(nivel, v), bbl: xs.reduce((a, f) => a + f.bbl, 0), bblEntero: xs.reduce((a, f) => a + f.entero, 0),
      eventos: new Set(xs.map(f => `${f.p.campoId}|${f.p.eventoId}`)).size, hijos: [] }
    const sig = NIVELES[i]
    if (!sig) { n.paradas = paradasDe(xs); return n }
    const grupos = new Map<string, FilaDelBalance[]>()
    for (const f of xs) { const k = valor(f, sig); const g = grupos.get(k); if (g) g.push(f); else grupos.set(k, [f]) }
    n.hijos = [...grupos].map(([k, g]) => armar(sig, k, g, i + 1)).sort(antes)
    return n
  }
  return armar('impacto', 'diferida', fs, 0)
}

/** El árbol de la pérdida de un tramo: tipo → registros. */
function arbolPerdida(fs: readonly PerdidaVigente[]): NodoBalance {
  const hijos = TIPOS_PERDIDA.flatMap(tipo => {
    const xs = fs.filter(f => f.tipo === tipo)
    return xs.length ? [{ nivel: 'tipo' as const, valor: tipo, texto: textoDe('tipo', tipo), bbl: xs.reduce((a, f) => a + f.volumen.bbl, 0),
      bblEntero: xs.reduce((a, f) => a + f.bblEntero, 0), eventos: xs.length, hijos: [], perdidas: xs }] : []
  }).sort(antes)
  return { nivel: 'impacto', valor: 'perdida', texto: textoDe('impacto', 'perdida'), bbl: hijos.reduce((a, h) => a + h.bbl, 0),
    bblEntero: hijos.reduce((a, h) => a + h.bblEntero, 0), eventos: fs.length, hijos }
}

/** Lo de un campo en su período: las cifras y sus filas (para el árbol). */
function campoDelBalance(campoId: string, desde: Date, hasta: Date, ctx: Contexto, op: OpcionesBalance): { campo: CampoDelBalance; filas: FilaDelBalance[]; perdidas: PerdidaVigente[] } {
  const d0 = desde.getTime(), hh = Math.min(hasta.getTime(), AHORA.getTime())
  const lb = libro([campoId], desde, hasta, ctx)
  const en = enterosDelPeriodo(campoId, desde, hasta, ctx, op.guardadas ? { guardadas: op.guardadas } : {})
  const filas: FilaDelBalance[] = filasDelChoke([campoId], desde, hasta, ctx, op.guardadas)
    .filter(p => p.campoId === campoId && filaEnPeriodo(p, d0, hh))
    .map(p => ({ p, bbl: bblEnPeriodo(p, d0, hh), entero: en.porFila[p.id] ?? 0 }))
  const per = perdidasDelPeriodo([campoId], desde, hasta, op.perdidas ?? [])
  const pc = per.porCampo.get(campoId)
  const lc = lb.porCampo.find(x => x.campoId === campoId)
  const sinFiscal = (lb.sinFiscal.find(x => x.campoId === campoId)?.dias ?? []).map(d => isoCo(d.getTime()).slice(0, 10))
  // Sin un solo día con fiscal no hay producido: «sin dato», nunca 0.
  const diasPeriodo = Math.max(1, Math.ceil((hh - d0) / D))
  const conFiscal = !!lc && sinFiscal.length < diasPeriodo && !(lc.real === 0 && lc.potencial === 0 && sinFiscal.length > 0)
  const producido = conFiscal ? cifra(lc!.real, enteroDe(lc!.real)) : null
  const diferido = cifra(en.exacto, en.raiz)
  const perdido = pc ? cifra(pc.exacto, pc.entero) : null
  const porTramo = CHOKES_Y_SIN_ASIGNAR.map((tramo): TramoDelBalance => {
    const ps = tramo === 'sin-asignar' ? [] : (pc?.filas ?? []).filter(f => f.tramo === tramo)
    return {
      tramo, nombre: NOMBRE_TRAMO_BALANCE[tramo],
      diferido: cifra(filas.filter(f => tramoVigente(f.p) === tramo).reduce((a, f) => a + f.bbl, 0), en.porTramo[tramo]),
      perdido: ps.length ? cifra(ps.reduce((a, f) => a + f.volumen.bbl, 0), ps.reduce((a, f) => a + f.bblEntero, 0)) : null,
    }
  })
  const gas = pc && pc.filas.some(f => f.volumen.gasKpc !== undefined) ? pc.gasKpc : null
  const campo: CampoDelBalance = {
    campoId, nombre: campoPorId(campoId).nombre, desde, hasta,
    producido, diferido, perdido, potencial: producido ? cifra(producido.exacto + diferido.exacto, producido.entero + diferido.entero) : null,
    sinExplicar: lc ? lc.brecha - en.exacto : 0, gasKpc: gas, sinFiscal, porTramo,
  }
  return { campo, filas, perdidas: pc?.filas ?? [] }
}

const SIN = {}
const GUARDADO = new WeakMap<Contexto, WeakMap<object, WeakMap<object, Map<string, VistaBalance>>>>()

/** `GET /api/vistas/balance?campos&desde&hasta[&jornada]`. */
export function balance(q: ConsultaBalance, ctx: Contexto, op: OpcionesBalance = {}): VistaBalance {
  if (q.jornada !== undefined && !esJornada(q.jornada)) throw new Error(`«${String(q.jornada)}» no es una jornada: actual o anterior.`)
  if (q.jornada === undefined && (!q.desde || !q.hasta)) throw new Error('El balance pide el período (desde y hasta) o la jornada.')
  let porG = GUARDADO.get(ctx)
  if (!porG) GUARDADO.set(ctx, porG = new WeakMap())
  const kg = (op.guardadas ?? SIN) as object, kp = (op.perdidas ?? SIN) as object
  let porP = porG.get(kg)
  if (!porP) porG.set(kg, porP = new WeakMap())
  let m = porP.get(kp)
  if (!m) porP.set(kp, m = new Map())
  const clave = `${q.campos.join(',')}|${q.jornada ?? `${q.desde!.getTime()}|${q.hasta!.getTime()}`}`
  const ya = m.get(clave)
  if (ya) return ya
  const v = calcular(q, ctx, op)
  m.set(clave, v)
  return v
}

function calcular(q: ConsultaBalance, ctx: Contexto, op: OpcionesBalance): VistaBalance {
  const campos = [...new Set(q.campos)]
  const jornadas = q.jornada ? campos.map(c => jornadaDe(ctx.config, c, q.jornada)) : []
  const ventana = (c: string) => { const j = jornadas.find(x => x.campoId === c); return j ? { desde: j.desde, hasta: j.hasta } : { desde: q.desde!, hasta: q.hasta! } }
  const xs = campos.map(c => { const w = ventana(c); return campoDelBalance(c, w.desde, w.hasta, ctx, op) })
  const porCampo = xs.map(x => x.campo)
  const desde = new Date(Math.min(...porCampo.map(c => c.desde.getTime())))
  const hasta = new Date(Math.max(...porCampo.map(c => c.hasta.getTime())))
  // El total: la suma de los campos (enteros incluidos: la regla 3 del redondeo).
  const conTodos = porCampo.every(c => c.producido !== null)
  const producido = conTodos ? sumaCifras(porCampo.map(c => c.producido)) : null
  const diferido = sumaCifras(porCampo.map(c => c.diferido))!
  const perdido = sumaCifras(porCampo.map(c => c.perdido))
  const gases = porCampo.filter(c => c.gasKpc !== null)
  const total: CifrasBalance = {
    producido, diferido, perdido,
    potencial: producido ? cifra(producido.exacto + diferido.exacto, producido.entero + diferido.entero) : null,
    sinExplicar: porCampo.reduce((a, c) => a + c.sinExplicar, 0),
    gasKpc: gases.length ? gases.reduce((a, c) => a + c.gasKpc!, 0) : null,
    sinFiscal: [...new Set(porCampo.flatMap(c => c.sinFiscal))].sort(),
    porTramo: CHOKES_Y_SIN_ASIGNAR.map(tramo => {
      const ts = porCampo.map(c => c.porTramo.find(t => t.tramo === tramo)!)
      return { tramo, nombre: NOMBRE_TRAMO_BALANCE[tramo], diferido: sumaCifras(ts.map(t => t.diferido))!, perdido: sumaCifras(ts.map(t => t.perdido)) }
    }),
  }
  // La trazabilidad: el árbol de cada tramo, con las filas y las pérdidas de todos los campos.
  const filas = xs.flatMap(x => x.filas), perdidas = xs.flatMap(x => x.perdidas)
  const arbol: ArbolDelTramo[] = CHOKES_Y_SIN_ASIGNAR.map(tramo => {
    const ps = tramo === 'sin-asignar' ? [] : perdidas.filter(f => f.tramo === (tramo as ChokeAnh))
    return { tramo, nombre: NOMBRE_TRAMO_BALANCE[tramo], diferida: arbolDiferida(filas.filter(f => tramoVigente(f.p) === tramo)), perdida: ps.length ? arbolPerdida(ps) : null }
  })
  const periodo = q.jornada ? (q.jornada === 'actual' ? 'la jornada de ahora' : 'la jornada anterior') : nombrePeriodo(desde, hasta)
  const quien = campos.length === 1 ? porCampo[0]!.nombre : 'Los campos'
  const frase = `${quien}, ${periodo}: ${producido ? `produjo ${n0(producido.entero)} bbl` : 'producido sin dato fiscal'} · quedaron diferidos ${n0(diferido.entero)} bbl · perdido: ${perdido ? `${n0(perdido.entero)} bbl` : 'sin registro'}.`
  return {
    campos, desde, hasta, jornada: q.jornada ?? null, jornadas, periodo, total, porCampo, arbol, frase, explica: EXPLICA_BALANCE, regla: REGLA_BALANCE,
  }
}
