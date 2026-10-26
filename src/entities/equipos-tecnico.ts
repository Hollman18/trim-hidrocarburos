/** C4 · EQUIPOS Y EL NIVEL TÉCNICO (X4 §3.6, §3.7 y §5; X5 §5.4 y §5.5; X2 §5.1 y §5.3).
 *
 *  Dos vistas, las dos «ahora»:
 *
 *  1. **La lista de Equipos** (`listaEquipos`): todos los equipos de los campos
 *     —bombas de la línea (también las que no tienen instrumento), electrosumergibles,
 *     pozos y equipos de superficie— en UNA lista. Bombas, Electrosumergibles,
 *     Pozos y Superficie se funden aquí (X4 §3.6, fusión 1).
 *     - La marca de cada equipo es la de la franja (`condiciones.ts`): una por
 *       equipo, la misma en todas partes (X2 F2).
 *     - El orden: por estado (la condición, de la más grave a ninguna; dentro de
 *       cada una, lo parado primero) y, dentro de cada estado, por «Si falla hoy»
 *       (`criticidad.ts`): lo medido de mayor a menor, después los techos («hasta»)
 *       y al final lo que no tiene cifra (D6). Lo parado, por lo que ya deja de producir.
 *     - Los filtros: parados, avisan, sin instrumento y todos; por tipo y por tren.
 *       Cada fila dice en cuáles entra: la pantalla solo filtra.
 *     - «¿Lo vigila TRIM?» es `vigilado` de «Si falla hoy»: lo que TRIM lee.
 *     - Para confiabilidad, el acierto del vigía en una línea (`aciertos.ts`).
 *
 *  2. **El nivel 3 de un equipo** (`nivelEquipo`, la imagen 4): la cifra y su
 *     frase, el bloqueo «No arrancar», sus señales con el indicador analógico y la
 *     minitendencia (escala fija, banda normal, alarma; en gris si está parado), el
 *     esquema de su tren de agua, «Mientras esté parada», los días antes de parar,
 *     su historia y los repuestos que faltan. Con sus vecinos del mismo tren (‹ ›).
 *
 *  El motor no inventa: lo que no tiene, no lo trae (el rango del instrumento y el
 *  disparo de cada protección, X2 §7 pedido 4: `sinDisparo`). Todo es JSON puro
 *  (las horas van en ISO con zona): viaja tal cual por el contrato. */
import type { Contexto } from './causa-senal'
import type { Dispositivo, EstadoDispositivo } from './tipos'
import { EQUIPOS } from './equipos'
import { equipoVivo, type EquipoVivo } from './equipo-vivo'
import { perfilBomba, paradasDe, type PerfilBomba, type VariableId, type Subtipo } from './bombas'
import { pozoDe, pozosDe, estadoAhora } from './pozos'
import { prediccion, riesgoAhora, type Riesgo, type Versiones } from './diferido'
import { criticidadDelCampo, type FilaCriticidad } from './criticidad'
import { franja, ORDEN_FRANJA, type CondicionFranja } from './condiciones'
import { tuberiaAgua, type TuberiaAgua } from './choke-agua'
import { historialDeEquipo, eventosCargadosA, libro, calendario, type Pregunta } from './libro'
import { repuestosDe } from './sap'
import { limiteDe } from './limites'
import { tendencia } from './vigia'
import { registroDePredicciones } from './aciertos'
import { NOMBRE_PARTE } from './partes'
import { textoHoras } from './salud'
import { PUESTA_EN_MARCHA } from './configuracion'
import { campoPorId } from './campos'
import { AHORA } from './reloj'
import { banda, decimalesDe } from '@/shared/lib/formato'

/* ─────────────────────────────── los nombres ─────────────────────────────── */

export type TipoEquipo = 'bomba' | 'electrosumergible' | 'pozo' | 'superficie'
/** En el orden de los filtros. «Superficie» desaparece como nombre (X4 §3.6): son servicios y proceso. */
export const TIPOS_EQUIPO: readonly TipoEquipo[] = ['bomba', 'electrosumergible', 'pozo', 'superficie']
export const NOMBRE_TIPO: Record<TipoEquipo, string> = {
  bomba: 'Bombas', electrosumergible: 'Electrosumergibles', pozo: 'Pozos', superficie: 'Servicios y proceso',
}

/** Los trenes del nivel 2 (X4 §3.8 y §5.1): pozos, recolección, crudo, agua, gas y servicios. */
export type TrenEquipo = 'pozos' | 'recoleccion' | 'crudo' | 'agua' | 'gas' | 'servicios'
export const TRENES: readonly TrenEquipo[] = ['pozos', 'recoleccion', 'crudo', 'agua', 'gas', 'servicios']
export const NOMBRE_TREN: Record<TrenEquipo, string> = {
  pozos: 'Pozos', recoleccion: 'Recolección', crudo: 'Crudo', agua: 'Agua', gas: 'Gas', servicios: 'Servicios',
}

export type FiltroEstado = 'parados' | 'avisan' | 'sin-instrumento' | 'todos'
export const FILTROS_ESTADO: readonly FiltroEstado[] = ['parados', 'avisan', 'sin-instrumento', 'todos']
export const NOMBRE_FILTRO: Record<FiltroEstado, string> = {
  parados: 'Parados', avisan: 'Avisan', 'sin-instrumento': 'Sin instrumento', todos: 'Todos',
}

/** La palabra de cada condición, para la fila y la cabecera de la ficha (X5 §5.6). */
export const PALABRA_CONDICION: Record<CondicionFranja, string> = {
  interlock: 'Interlock', alarma: 'Alarma', atencion: 'Atención', aviso: 'Aviso', 'sin-comunicacion': 'Sin comunicación',
}

/** Las variables que mejor dicen el estado de cada familia de bomba (las de la
 *  placa): en el nivel 3 van siempre abiertas; las demás en banda, en un renglón (X4 §5.1, N3). */
export const VARIABLES_CLAVE: Record<Subtipo, VariableId[]> = {
  multifasica: ['dp_filtro', 'v_bomba', 'velocidad', 'nivel_barrera'],
  inyeccion: ['p_succion', 'p_descarga', 'caudal', 'v_bomba'],
}
/** Más de estas señales y las que están en banda se pliegan en un renglón. */
export const SENALES_ABIERTAS = 8

/* ─────────────────────────────── ayudas ─────────────────────────────── */

const H = 3_600_000, COT = 5 * H
const FMT1 = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const n1 = (v: number) => FMT1.format(v)
const lista = (xs: readonly string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}`)
const iso = (t: number | Date) => new Date(t).toISOString()
const diaCo = (t: number) => new Date(t - COT).toISOString().slice(0, 10)
const horaCo = (t: number) => new Date(t - COT).toISOString().slice(11, 16)
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic']
/** «hoy, 03:52» · «el 1 de oct, 18:20». */
export function cuandoCo(t: number, ahora: number = AHORA.getTime()): string {
  if (diaCo(t) === diaCo(ahora)) return `hoy, ${horaCo(t)}`
  const d = new Date(t - COT)
  return `el ${d.getUTCDate()} de ${MES[d.getUTCMonth()]}, ${horaCo(t)}`
}
/** «22 de sept»: el día de una falla de la historia; de otro año, con el año. */
const diaCorto = (t: number) => {
  const d = new Date(t - COT), anio = new Date(AHORA.getTime() - COT).getUTCFullYear()
  return `${d.getUTCDate()} de ${MES[d.getUTCMonth()]}${d.getUTCFullYear() !== anio ? ` de ${d.getUTCFullYear()}` : ''}`
}
/** «10,1 h» bajo dos días; «3,2 d» después. */
const hace = (t: number, ahora: number) => { const h = Math.max(0, (ahora - t) / H); return h < 48 ? `${n1(h)} h` : `${n1(h / 24)} d` }
/** El colchón como lo dice «Si falla hoy»: bajo una hora, en minutos. */
const colchon = (h: number) => (h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : textoHoras(h))
const finito = (v: number | null | undefined): v is number => typeof v === 'number' && Number.isFinite(v)

/** La familia en palabras de campo (X5 §5.5). */
const FAMILIA_SERVICIO: Record<string, string> = {
  aire: 'aire de instrumentos', energia: 'energía eléctrica', compresion: 'compresor de gas',
  tratamiento: 'tratamiento de crudo', proceso: 'separador',
}
function familiaDe(campoId: string, id: string, perfil?: PerfilBomba, agua?: TuberiaAgua): string {
  const pozo = pozoDe(campoId, id)
  if (pozo) return pozo.levantamiento === 'electrosumergible' ? 'electrosumergible'
    : pozo.levantamiento === 'bombeo-mecanico' ? 'pozo · bombeo mecánico' : 'pozo · flujo natural'
  if (perfil) return perfil.subtipo === 'multifasica' ? 'bomba multifásica' : 'bomba de agua'
  if (bombasDelTren(agua).some(b => b.id === id)) return 'bomba de agua'
  const eq = Object.hasOwn(EQUIPOS, id) ? EQUIPOS[id] : undefined
  if (!eq) return 'equipo'
  if (eq.servicio && Object.hasOwn(FAMILIA_SERVICIO, eq.servicio)) return FAMILIA_SERVICIO[eq.servicio]!
  // Lo de evacuación es el tanque o la medición oficial: lo dice su sistema.
  return eq.sistema === 'Almacenamiento' ? 'tanque de crudo' : eq.sistema === 'Medición fiscal' ? 'medición oficial' : eq.sistema.toLowerCase()
}

const bombasDelTren = (agua?: TuberiaAgua) => (agua && !agua.campoDeGas ? agua.tramos.find(t => t.tramo === 'bombas')?.bombas ?? [] : [])

/** El tren del equipo: el de su lugar en la planta (X4 §5.1). */
function trenDe(campoId: string, id: string, perfil?: PerfilBomba, agua?: TuberiaAgua): TrenEquipo {
  if (pozoDe(campoId, id)) return 'pozos'
  if (perfil) return perfil.subtipo === 'multifasica' ? 'recoleccion' : 'agua'
  if (bombasDelTren(agua).some(b => b.id === id)) return 'agua'
  const s = Object.hasOwn(EQUIPOS, id) ? EQUIPOS[id]!.servicio : undefined
  return s === 'aire' || s === 'energia' ? 'servicios' : s === 'compresion' ? 'gas' : 'crudo'
}

const tipoDe = (campoId: string, id: string, fila?: Pick<FilaCriticidad, 'familia'>): TipoEquipo => {
  const pozo = pozoDe(campoId, id)
  if (pozo) return pozo.levantamiento === 'electrosumergible' ? 'electrosumergible' : 'pozo'
  return fila?.familia === 'bomba' || perfilBomba(id, campoId) ? 'bomba' : 'superficie'
}

/** Las preguntas abiertas del campo (toda la historia: una pregunta sin responder
 *  no prescribe), una vez por contexto y campo. */
const PREGUNTAS = new WeakMap<Contexto, Map<string, readonly Pregunta[]>>()
function preguntasDe(campoId: string, ctx: Contexto): readonly Pregunta[] {
  let m = PREGUNTAS.get(ctx)
  if (!m) PREGUNTAS.set(ctx, m = new Map())
  let x = m.get(campoId)
  if (!x) { x = libro([campoId], new Date(calendario()[0]!.desde), AHORA, ctx).preguntas; m.set(campoId, x) }
  return x
}
const preguntaAbierta = (campoId: string, id: string, ctx: Contexto) =>
  preguntasDe(campoId, ctx).find(p => p.equipo === id && p.pide && !p.fin)

/** Desde cuándo está parado: la parada abierta de la bomba, el evento del pozo o la fila de Riesgo. */
function paradoDesde(campoId: string, id: string, riesgo: readonly Riesgo[]): number | undefined {
  const ab = paradasDe(id, campoId).find(e => !e.fin)
  if (ab) return Date.parse(ab.inicio)
  const pozo = pozoDe(campoId, id)
  const ev = pozo ? estadoAhora(pozo).evento : undefined
  if (ev && ev.codigo !== 'HZ') return Date.parse(ev.inicio)
  const r = riesgo.find(x => x.equipo === id && x.estado === 'perdiendo')
  return r?.desde?.getTime()
}

/* ─────────────────────────────── 1. la lista ─────────────────────────────── */

export interface CifraFila {
  /** bbl/d; null: sin dato. */
  valor: number | null
  /** «hasta»: un techo (D6), no una cifra calculada. */
  techo?: true
  /** Qué es la cifra: «se deja de producir» o «si falla hoy». */
  que: 'se deja de producir' | 'si falla hoy'
  /** Lo que la acompaña: «después de 2 min de colchón», «sin dato: falta…». */
  detalle?: string
}

export interface FilaEquipoTecnico {
  campoId: string
  campoNombre: string
  equipo: string
  /** «Bomba multietapa de transferencia de agua». */
  nombre: string
  tipo: TipoEquipo
  /** Los filtros de tipo donde entra: una electrosumergible también es pozo. */
  tipos: TipoEquipo[]
  tren: TrenEquipo
  /** En palabras de campo: «bomba de agua», «aire de instrumentos». */
  familia: string
  /** La marca: la de la franja. Ausente: sin condición (la fila no lleva marca, X5 §5.5). */
  condicion?: CondicionFranja
  parado: boolean
  /** ¿Lo vigila TRIM? Tiene instrumentos que lee y le dan su tendencia. */
  vigila: boolean
  /** «sí · 8 señales», «no: sin instrumento», «no: solo su controlador». */
  vigilaTexto: string
  /** La palabra de la condición o del estado: «parada desde hoy, 03:52», «ya pasó el límite». */
  palabra: string
  /** «sube porque P-201B está parada»: «Cambió hoy» en su fila. */
  sube?: string
  cifra: CifraFila
  /** Los filtros de estado donde entra (siempre «todos»). */
  filtros: FiltroEstado[]
  /** Tiene registro en TRIM: su nivel 3 es completo. Sin él (P-201A), una ficha mínima. */
  registrado: boolean
  /** Un equipo de superficie o una bomba sin respaldo firmado (lo que decía Superficie). Los pozos no lo llevan: ninguno tiene. */
  sinRespaldo?: true
}

export interface AciertoVigia {
  aciertos: number
  /** Las que se pueden juzgar: aciertos más falsas alarmas. */
  juzgadas: number
  falsas: number
  intervenidas: number
  seguimiento: number
  /** Desde la puesta en marcha (ISO). */
  desde: string
  frase: string
}

export interface VistaEquipos {
  filas: FilaEquipoTecnico[]
  cuentas: { estado: Record<FiltroEstado, number>; tipo: Record<TipoEquipo, number>; tren: Record<TrenEquipo, number> }
  /** «Cambió hoy: …» de cada campo (`criticidad.ts`), con el campo delante si son varios. */
  cambioHoy: string[]
  /** Lo del esquema de planta que no tiene equipo registrado: no se mide, y se dice. */
  sinRegistro: Array<{ campoId: string; nombre: string }>
  /** ¿Le creo al vigía? (para confiabilidad; X4 §3.7). */
  vigia: AciertoVigia
}

/** Para el orden de «Si falla hoy»: lo medido, los techos y lo que no tiene cifra (D6). */
const GRUPO = { medido: 0, techo: 1, 'sin-dato': 2 } as const

function filasDelCampo(campoId: string, ctx: Contexto, versiones?: Versiones): Array<FilaEquipoTecnico & { _k: number[] }> {
  const crit = criticidadDelCampo(campoId, ctx)
  const marcas = new Map(franja([campoId], ctx).equipos.map(e => [e.equipo, e.condicion]))
  const riesgo = riesgoAhora([campoId], ctx)
  const agua = tuberiaAgua(campoId, ctx, versiones)
  const campoNombre = campoPorId(campoId).nombre
  const vistos = new Set<string>()
  const out: Array<FilaEquipoTecnico & { _k: number[] }> = []
  for (const f of [...crit.parados, ...crit.ranking]) {
    if (vistos.has(f.equipo)) continue
    vistos.add(f.equipo)
    const id = f.equipo
    const eq = equipoVivo(id, campoId, ctx)
    const perfil = perfilBomba(id, campoId)
    const pozo = pozoDe(campoId, id)
    const tipo = tipoDe(campoId, id, f)
    const condicion = marcas.get(id)
    const parado = f.parado
    const n = eq?.dispositivos.length ?? 0
    const vigila = f.vigilado
    const vigilaTexto = vigila ? `sí · ${n === 1 ? '1 señal' : `${n} señales`}` : pozo ? 'no: solo su controlador' : 'no: sin instrumento'
    const r = riesgo.find(x => x.equipo === id)
    const desde = parado ? paradoDesde(campoId, id, riesgo) : undefined
    const pregunta = preguntaAbierta(campoId, id, ctx)
    let palabra: string
    if (parado) {
      const porOtro = eq?.marcha === 'cerrado-por-otro'
      palabra = porOtro ? eq!.estado
        : `${pozo ? `parado${pregunta ? ' sin causa' : ''}` : 'parada'}${desde !== undefined ? ` desde ${cuandoCo(desde)}` : ''}`
    } else if (!eq) palabra = 'sin instrumento: se supone en marcha'
    else if (r?.estado === 'en-riesgo' && r.parte) palabra = `${NOMBRE_PARTE[r.parte].toLowerCase()} · ${r.horas !== undefined ? `alarma en ${textoHoras(r.horas)}` : 'ya en alarma'}`
    else if (r?.estado === 'en-riesgo') palabra = r.horas !== undefined ? `en marcha · alarma en ${textoHoras(r.horas)}` : 'ya pasó el límite'
    else palabra = eq.estado
    const cifra: CifraFila = parado && f.perdiendoBpd !== undefined
      ? { valor: f.perdiendoBpd, que: 'se deja de producir' }
      : f.grupo === 'sin-dato' || f.bpd === null
        ? { valor: null, que: 'si falla hoy', detalle: 'sin dato' }
        : { valor: f.bpd, que: 'si falla hoy', ...(f.grupo === 'techo' ? { techo: true as const } : {}),
          ...(f.colchonH !== undefined && Number.isFinite(f.colchonH) && f.bpd > 0 ? { detalle: `después de ${colchon(f.colchonH)} de colchón` } : {}) }
    const filtros: FiltroEstado[] = [...(parado ? ['parados' as const] : []), ...(!parado && condicion ? ['avisan' as const] : []),
      ...(!vigila ? ['sin-instrumento' as const] : []), 'todos']
    const rango = condicion ? ORDEN_FRANJA.indexOf(condicion) : ORDEN_FRANJA.length
    out.push({
      campoId, campoNombre, equipo: id, nombre: eq?.nombre ?? f.nombre, tipo,
      tipos: tipo === 'electrosumergible' ? ['electrosumergible', 'pozo'] : [tipo],
      tren: trenDe(campoId, id, perfil, agua), familia: familiaDe(campoId, id, perfil, agua),
      ...(condicion ? { condicion } : {}), parado, vigila, vigilaTexto, palabra,
      ...(f.subio ? { sube: `sube porque ${f.subio.otro} está parada` } : {}),
      cifra, filtros, registrado: !!eq, ...(!pozo && eq?.redundancia === 'sin respaldo' ? { sinRespaldo: true as const } : {}),
      // Estado (la condición, y dentro de ella lo parado primero), después «Si falla hoy».
      _k: [rango, parado ? 0 : 1, parado ? 0 : GRUPO[f.grupo], -(parado ? f.perdiendoBpd ?? 0 : f.bpd ?? 0)],
    })
  }
  return out
}

/** La lista de Equipos de unos campos (uno, o «todos mis campos»), en su orden. */
export function listaEquipos(campos: readonly string[], ctx: Contexto, versiones?: Versiones): VistaEquipos {
  const todas = campos.flatMap((c, i) => filasDelCampo(c, ctx, versiones).map(f => ({ ...f, _k: [...f._k, i] })))
  todas.sort((a, b) => {
    for (let i = 0; i < a._k.length; i++) if (a._k[i] !== b._k[i]) return a._k[i]! - b._k[i]!
    return a.equipo.localeCompare(b.equipo)
  })
  const filas: FilaEquipoTecnico[] = todas.map(f => { const { _k, ...fila } = f; void _k; return fila })
  const contar = <K extends string>(claves: readonly K[], en: (f: FilaEquipoTecnico, k: K) => boolean) =>
    Object.fromEntries(claves.map(k => [k, filas.filter(f => en(f, k)).length])) as Record<K, number>
  const varios = campos.length > 1
  const cambioHoy = campos.flatMap(c => { const t = criticidadDelCampo(c, ctx).cambioHoy; return t ? [varios ? `${campoPorId(c).nombre}: ${t}` : t] : [] })
  const sinRegistro = campos.flatMap(c => criticidadDelCampo(c, ctx).sinCalcular.map(x => ({ campoId: c, nombre: x.nombre })))
  return {
    filas,
    cuentas: {
      estado: contar(FILTROS_ESTADO, (f, k) => f.filtros.includes(k)),
      tipo: contar(TIPOS_EQUIPO, (f, k) => f.tipos.includes(k)),
      tren: contar(TRENES, (f, k) => f.tren === k),
    },
    cambioHoy, sinRegistro,
    vigia: aciertoVigia(campos, ctx),
  }
}

/** «¿Le creo al vigía?»: lo que anunció desde la puesta en marcha y en qué quedó. */
export function aciertoVigia(campos: readonly string[], ctx: Contexto): AciertoVigia {
  const reg = registroDePredicciones([...campos], ctx, riesgoAhora([...campos], ctx))
  const cuenta = (c: string) => reg.filter(p => p.calificacion === c).length
  const aciertos = cuenta('acierto'), falsas = cuenta('falsa-alarma'), intervenidas = cuenta('intervenida'), seguimiento = cuenta('seguimiento')
  const juzgadas = aciertos + falsas
  const desde = `${PUESTA_EN_MARCHA}T00:00:00-05:00`
  const d = new Date(Date.parse(desde) - COT)
  const partes = [juzgadas ? `acertó ${aciertos} de ${juzgadas} avisos` : 'todavía no hay avisos vencidos para calificar',
    falsas ? `${falsas === 1 ? '1 falsa alarma' : `${falsas} falsas alarmas`}` : '',
    intervenidas ? `${intervenidas === 1 ? '1 intervenida' : `${intervenidas} intervenidas`} sin calificar` : '',
    seguimiento ? `${seguimiento} en seguimiento` : ''].filter(Boolean)
  return {
    aciertos, juzgadas, falsas, intervenidas, seguimiento, desde: iso(Date.parse(desde)),
    frase: `¿Le creo al vigía? Desde el ${d.getUTCDate()} de ${MES[d.getUTCMonth()]}: ${lista(partes)}.`,
  }
}

/* ─────────────────────────────── 2. el nivel 3 ─────────────────────────────── */

export interface SenalNivel3 {
  tag: string
  nombre: string
  unidad: string
  /** null: sin lectura (se dice «sin señal», nunca cero). */
  valor: number | null
  decimales: number
  /** Escala fija del instrumento (X2 §5.1, punto 1): no depende del valor de ahora.
   *  Mientras el motor no tenga el rango declarado, va de cero (o del límite menor
   *  menos un margen) al mayor de los límites y las lecturas de la ventana, más
   *  20 %; en porcentaje, de 0 a 100. Sus extremos no se rotulan. */
  escala: [number, number]
  /** Banda normal; null del lado abierto («> 10» no tiene techo). */
  banda: [number | null, number | null] | null
  /** Los límites de alarma (la base maestra de alarmas, ISA-18.2). */
  alarmas: number[]
  /** «normal > 10 · alarma 8». */
  limite: string
  /** Las lecturas de la ventana (12 días), con sus huecos. */
  serie: Array<number | null>
  /** La marca de la señal: solo con el equipo en marcha y la señal anormal (X2 B9). */
  condicion?: CondicionFranja
  /** Con el equipo parado: gris y sin marca propia. */
  gris: boolean
  /** El valor se sale de la escala: el puntero queda en el borde con «◄» o «►». */
  fuera?: 'abajo' | 'arriba'
}

export interface DiscretaNivel3 { tag: string; nombre: string; valor: string }

export interface TendenciaNivel3 {
  tag: string
  nombre: string
  unidad: string
  serie: Array<number | null>
  escala: [number, number]
  banda: [number | null, number | null] | null
  alarmas: number[]
  decimales: number
}

export interface EsquemaAgua {
  tanque?: { id: string; nivelPct: number | null; altoAltoPct: number }
  /** Las bombas del tren, en su orden; `esta`, la que se mira. */
  bombas: Array<{ id: string; instrumentada: boolean; marcha: 'en-marcha' | 'parada' | 'sin-lectura'; esta: boolean }>
  /** Las burbujas de la bomba que se mira (PI, PDI, FI): de su tag, con su valor. */
  instrumentos: Array<{ letras: string; tag: string; donde: 'succion' | 'descarga' | 'caudal'; valor: number | null; decimales: number }>
  /** «174.033 bbl/d entran: las toman P-201A y P-201C». */
  entraBpd?: number
  toman: string[]
}

export interface MientrasParada {
  /** «Mientras esté parada» (la que se mira) o «Mientras P-201B esté parada» (una hermana del tren). */
  titulo: string
  entraBpd: number
  cabenBpd: number
  enMarcha: string[]
  tanquePct?: number
  altoAltoPct?: number
  /** El nivel sube: entra más de lo que caben las que siguen. */
  sube: boolean
  frase: string
  /** Si para otra bomba ahora: el orden de cierre, primero los más acuatosos. */
  pasos: Array<{ pozo: string; fraccion: number }>
  crudoBpd: number
  parejoBpd: number
  /** «2 min»; ausente sin nivel del tanque. */
  colchon?: string
}

export interface HistoriaNivel3 {
  /** Fallas propias (bombas y electrosumergibles); en los demás, eventos con pozos cerrados. */
  fallas: number
  que: 'fallas' | 'eventos'
  meses: number
  cadaDias?: number
  fueraH?: number
  bblPorFalla?: number
  /** «Sello mecánico 5 · rodamientos 3». */
  porParte: Array<{ parte: string; fallas: number }>
  /** Las dos últimas cerradas: el día, qué fue y lo que costó. */
  ultimas: Array<{ dia: string; que: string; bbl: number }>
}

export interface RepuestoNivel3 {
  descripcion: string
  stock: number
  minimo: number
  /** «llega 1 el 9 de oct». */
  llega?: string
  plazoDias: number
  /** Sin stock y sin nada en camino: lleva la marca de aviso (■3). */
  aviso: boolean
}

export interface VistaNivel3 {
  campoId: string
  campoNombre: string
  equipo: string
  /** «bomba multietapa de transferencia de agua · tratamiento de agua · criticidad 5 de 5». */
  subtitulo: string
  familia: string
  tipo: TipoEquipo
  tren: TrenEquipo
  /** Los vecinos del mismo tren, en su orden (‹ P-201A · P-201C ›). */
  vecinos: { anterior?: string; siguiente?: string }
  /** Tiene registro propio en TRIM; sin él, lo que se sabe y nada más (B-37). */
  registrado: boolean
  vigila: boolean
  condicion?: CondicionFranja
  parado: boolean
  /** «Alarma · parada desde hoy, 03:52 · hace 10,1 h». */
  previo: string
  /** La cifra (X5 §5.1): lo que se deja de producir por él, medido. Ausente sin registro. */
  cifra?: { valor: number; frase: string }
  /** El bloqueo de procedimiento, en tinta (X5 §5.6). */
  bloqueo?: { texto: string; sub: string }
  /** Hay una pregunta abierta: «Diga qué se dañó» (bomba) o «Diga por qué paró» (pozo). */
  pregunta?: { sobre: 'bomba' | 'pozo'; evento: string }
  senales: SenalNivel3[]
  /** Las que están en banda, plegadas en un renglón: «9 señales más · todas en banda». */
  plegadas: SenalNivel3[]
  discretas: DiscretaNivel3[]
  /** El motor no trae el disparo de cada protección (X2 §7, pedido 4): no se dibuja y se dice. */
  sinDisparo: boolean
  esquemaAgua?: EsquemaAgua
  mientras?: MientrasParada
  tendencias?: { titulo: string; desde: string; hasta: string; series: TendenciaNivel3[]; modoFalla?: string }
  historia?: HistoriaNivel3
  /** Los repuestos críticos bajo su mínimo (los demás, en el diagnóstico). */
  repuestos: RepuestoNivel3[]
  /** Hay qué mostrar en el nivel 4 (salud por parte, historia del PLC, instrumentos). */
  diagnostico: boolean
}

/** La escala fija de una señal (ver `SenalNivel3.escala`). */
export function escalaDe(unidad: string, bandaN: readonly [number, number] | undefined, alarmas: readonly number[], serie: ReadonlyArray<number | null>): [number, number] {
  if (unidad === '%') return [0, 100]
  const limites = [...(bandaN ?? []).filter(Number.isFinite), ...alarmas]
  const lecturas = serie.filter(finito)
  const todos = [...limites, ...lecturas]
  if (!todos.length) return [0, 1]
  const max = Math.max(...todos), min = Math.min(...todos)
  const lo = min >= 0 ? 0 : min - 0.2 * (max - min || Math.abs(min) || 1)
  const hi = max + 0.2 * (max - lo || Math.abs(max) || 1)
  return [lo, hi > lo ? hi : lo + 1]
}

const DE_ESTADO: Partial<Record<EstadoDispositivo, CondicionFranja>> = {
  alarma: 'alarma', atencion: 'atencion', aviso: 'aviso', 'sin señal': 'sin-comunicacion',
}

/** Un límite como lo firmó quien lo declaró: «10», «3,9», «66.800». */
const fmtLim = (v: number) => v.toLocaleString('es-CO', { maximumFractionDigits: 3 })
function textoLimite(bandaN: readonly [number, number] | undefined, alarmas: readonly number[]): string {
  const b = !bandaN ? '' : !Number.isFinite(bandaN[0]) ? `normal < ${fmtLim(bandaN[1])}`
    : !Number.isFinite(bandaN[1]) ? `normal > ${fmtLim(bandaN[0])}` : `normal ${fmtLim(bandaN[0])} – ${fmtLim(bandaN[1])}`
  const a = alarmas.length ? `alarma ${alarmas.map(fmtLim).join(' y ')}` : ''
  return [b, a].filter(Boolean).join(' · ') || 'sin límite declarado'
}

function senalDe(campoId: string, d: Dispositivo, parado: boolean): SenalNivel3 {
  const valor = typeof d.valor === 'number' ? d.valor : null
  const serie = d.serie?.valores ?? []
  const bandaN = banda(d.limite)
  const al = limiteDe(campoId, d.tag)?.alarma
  const alarmas = [al?.baja, al?.alta].filter(finito)
  const dec = decimalesDe(serie, valor)
  const escala = escalaDe(d.unidad, bandaN, alarmas, [...serie, valor])
  const cond = !parado ? (valor === null ? 'sin-comunicacion' as const : DE_ESTADO[d.estado]) : undefined
  return {
    tag: d.tag, nombre: d.tipo, unidad: d.unidad, valor, decimales: dec, escala,
    banda: bandaN ? [Number.isFinite(bandaN[0]) ? bandaN[0] : null, Number.isFinite(bandaN[1]) ? bandaN[1] : null] : null,
    alarmas, limite: textoLimite(bandaN, alarmas), serie: [...serie],
    ...(cond ? { condicion: cond } : {}), gris: parado,
    ...(valor !== null && valor < escala[0] ? { fuera: 'abajo' as const } : valor !== null && valor > escala[1] ? { fuera: 'arriba' as const } : {}),
  }
}

/** Las señales que se movieron: tendencia real (la pendiente supera dos errores
 *  estándar, la regla del vigía) en las lecturas de los días antes de parar (sin
 *  el día anterior, que ya trae la parada), o en la ventana si está en marcha. Las
 *  que más cambiaron, primero; como mucho tres gráficas chicas (X2 §5.3, punto 7). */
function tendenciasDe(eq: EquipoVivo, campoId: string, parado: boolean, desde?: number): TendenciaNivel3[] {
  const cand: Array<{ s: TendenciaNivel3; peso: number }> = []
  for (const d of eq.dispositivos) {
    if (!d.serie || typeof d.valor === 'string') continue
    const corte = parado && desde !== undefined ? desde - 24 * H : Infinity
    const t0 = Date.parse(d.serie.desde)
    const antes = d.serie.valores.filter((_, i) => t0 + i * d.serie!.pasoH * H < corte)
    const t = tendencia({ ...d.serie, valores: antes })
    if (!t || Math.abs(t.pendiente) <= 2 * t.errorPendiente || !t.ordenada) continue
    const s = senalDe(campoId, d, parado)
    cand.push({ s: { tag: s.tag, nombre: s.nombre, unidad: s.unidad, serie: s.serie, escala: s.escala, banda: s.banda, alarmas: s.alarmas, decimales: s.decimales },
      peso: Math.abs((t.pendiente * t.finH) / t.ordenada) })
  }
  return cand.sort((a, b) => b.peso - a.peso).slice(0, 3).map(x => x.s)
}

const ultimasDos = <T,>(xs: readonly T[]) => xs.slice(0, 2)

/** El nivel 3 de un equipo en un campo; undefined si el campo no lo tiene. */
export function nivelEquipo(campoId: string, equipo: string, ctx: Contexto, versiones?: Versiones): VistaNivel3 | undefined {
  const ahora = AHORA.getTime()
  const crit = criticidadDelCampo(campoId, ctx)
  const fc = [...crit.parados, ...crit.ranking].find(f => f.equipo === equipo)
  const eq = equipoVivo(equipo, campoId, ctx)
  if (!eq && !fc) return undefined
  const perfil = perfilBomba(equipo, campoId)
  const pozo = pozoDe(campoId, equipo)
  const agua = tuberiaAgua(campoId, ctx, versiones)
  const riesgo = riesgoAhora([campoId], ctx)
  const tipo = tipoDe(campoId, equipo, fc)
  const tren = trenDe(campoId, equipo, perfil, agua)
  const familia = familiaDe(campoId, equipo, perfil, agua)
  const condicion = franja([campoId], ctx).equipos.find(e => e.equipo === equipo)?.condicion
  const parado = fc?.parado ?? (eq?.marcha === 'detenido' || eq?.marcha === 'cerrado-por-otro')
  const desde = parado ? paradoDesde(campoId, equipo, riesgo) : undefined
  const preg = preguntaAbierta(campoId, equipo, ctx)

  // Los vecinos del mismo tren, en el orden de la planta.
  const delTren: string[] = tren === 'agua' && bombasDelTren(agua).some(b => b.id === equipo) ? bombasDelTren(agua).map(b => b.id)
    : tren === 'pozos' ? pozosDe(campoId).map(p => p.id)
      : [...crit.parados, ...crit.ranking].map(f => f.equipo).filter(id => trenDe(campoId, id, perfilBomba(id, campoId), agua) === tren)
          .sort((a, b) => Object.keys(EQUIPOS).indexOf(a) - Object.keys(EQUIPOS).indexOf(b))
  const i = delTren.indexOf(equipo)
  const vecinos = { ...(i > 0 ? { anterior: delTren[i - 1]! } : {}), ...(i >= 0 && i < delTren.length - 1 ? { siguiente: delTren[i + 1]! } : {}) }

  // La cabecera: la palabra de la condición y el estado, con desde cuándo.
  const palabra = condicion ? `${PALABRA_CONDICION[condicion]} · ` : ''
  const porOtro = eq?.marcha === 'cerrado-por-otro'
  const estado = !eq ? 'sin instrumento: TRIM no ve si está en marcha; se supone que sí'
    : parado ? `${porOtro ? eq.estado : pozo ? 'parado' : 'parada'}${desde !== undefined ? ` desde ${cuandoCo(desde, ahora)} · hace ${hace(desde, ahora)}` : ''}`
      : eq.estado
  const previo = `${palabra}${estado}`

  // La cifra: lo que se deja de producir por él, ahora (medido). En marcha, cero.
  let cifra: VistaNivel3['cifra']
  if (eq) {
    const pr = perfil && perfil.papel !== 'recobro' ? prediccion(perfil, ctx) : undefined
    const perdiendo = parado ? fc?.perdiendoBpd ?? riesgo.find(r => r.equipo === equipo && r.estado === 'perdiendo')?.bblDia ?? 0 : 0
    const cerro = pr?.perdiendo?.pozos.map(p => p.id) ?? []
    cifra = {
      valor: perdiendo,
      frase: perdiendo <= 0 ? (parado ? 'se dejan de producir: no cierra pozos.' : 'se dejan de producir por él: está en marcha.')
        : cerro.length ? `se dejan de producir: cerró ${lista(cerro)}.`
          : porOtro ? `se dejan de producir: lo cerró ${eq.estado.replace(/^cerrado por /, '')} y se le cargan a esa.`
            : pozo ? 'se dejan de producir: el pozo está parado.' : 'se dejan de producir.',
    }
  }
  const bloqueo = parado && preg && !porOtro
    ? { texto: `No arrancar hasta identificar ${preg.sobre === 'bomba' ? 'qué se dañó' : 'por qué paró'}`, sub: 'Si arranca antes, queda como no conformidad.' }
    : undefined

  // Las señales: las numéricas con su indicador; los interruptores, en palabras.
  const disp = eq?.dispositivos ?? []
  const todas = disp.filter(d => typeof d.valor !== 'string').map(d => senalDe(campoId, d, parado))
  const discretas = disp.filter(d => typeof d.valor === 'string').map(d => ({ tag: d.tag, nombre: d.tipo, valor: String(d.valor) }))
  const clave = new Set(perfil ? VARIABLES_CLAVE[perfil.subtipo].map(v => perfil.tags[v]).filter(Boolean) as string[] : [])
  const abierta = (s: SenalNivel3) => todas.length <= SENALES_ABIERTAS || clave.has(s.tag) || !!s.condicion
  const senales = todas.filter(abierta), plegadas = todas.filter(s => !abierta(s))

  // El esquema del tren de agua: el tanque, las bombas en paralelo y las burbujas de la que se mira.
  let esquemaAgua: EsquemaAgua | undefined
  const bombas = bombasDelTren(agua)
  if (bombas.some(b => b.id === equipo)) {
    const tk = agua.tramos.find(t => t.tramo === 'tanques')?.tanques?.[0]
    const tagDe = (v: VariableId) => perfil?.tags[v]
    const instrumentos = (['p_succion', 'p_descarga', 'caudal'] as const).flatMap(v => {
      const tag = tagDe(v), d = tag ? disp.find(x => x.tag === tag) : undefined
      if (!tag || !d) return []
      const valor = typeof d.valor === 'number' ? d.valor : null
      return [{ letras: tag.split('-')[0]!, tag, donde: v === 'p_succion' ? 'succion' as const : v === 'p_descarga' ? 'descarga' as const : 'caudal' as const,
        valor, decimales: decimalesDe(d.serie?.valores, valor) }]
    })
    const o = agua.siParaOtra
    esquemaAgua = {
      ...(tk ? { tanque: { id: tk.id, nivelPct: finito(tk.nivelPct) ? tk.nivelPct : null, altoAltoPct: tk.altoAlto * 100 } } : {}),
      bombas: bombas.map(b => ({ id: b.id, instrumentada: b.instrumentada, marcha: b.marcha, esta: b.id === equipo })),
      instrumentos,
      ...(o ? { entraBpd: o.entraBpd } : {}),
      toman: o?.enMarcha ?? bombas.filter(b => b.marcha !== 'parada' && !b.reserva).map(b => b.id),
    }
  }

  // Mientras esté parada: el agua de hoy y el orden de cierre si para otra (B-01). Con una
  // hermana del tren parada, lo mismo le sirve a quien mira una de las que siguen (B-37).
  let mientras: MientrasParada | undefined
  const o = agua.siParaOtra
  const laParada = bombas.find(b => b.marcha === 'parada')
  if (o && laParada && bombas.some(b => b.id === equipo)) {
    const tk = agua.tramos.find(t => t.tramo === 'tanques')?.tanques?.[0]
    const sube = o.entraBpd > o.cabenBpd
    mientras = {
      titulo: laParada.id === equipo ? 'Mientras esté parada' : `Mientras ${laParada.id} esté parada`,
      entraBpd: o.entraBpd, cabenBpd: o.cabenBpd, enMarcha: o.enMarcha,
      ...(tk && finito(tk.nivelPct) ? { tanquePct: tk.nivelPct, altoAltoPct: tk.altoAlto * 100 } : {}),
      sube,
      frase: sube ? `El nivel sube: entra más de lo que caben ${lista(o.enMarcha)}.`
        : `El nivel no sube: ${lista(o.enMarcha)} ${o.enMarcha.length === 1 ? 'toma' : 'toman'} lo que entra.`,
      pasos: o.pasos.map(p => ({ pozo: p.pozo, fraccion: p.fraccion })),
      crudoBpd: o.crudoBpd, parejoBpd: o.crudoParejoBpd,
      ...(o.colchonH !== undefined && Number.isFinite(o.colchonH) ? { colchon: colchon(o.colchonH) } : {}),
    }
  }

  // Los días antes de parar (o los últimos), en gráficas chicas iguales.
  let tendencias: VistaNivel3['tendencias']
  if (eq) {
    const series = tendenciasDe(eq, campoId, parado, desde)
    const conSerie = disp.find(d => d.serie)?.serie
    if (series.length && conSerie) {
      const t0 = Date.parse(conSerie.desde), t1 = t0 + (conSerie.valores.length - 1) * conSerie.pasoH * H
      tendencias = {
        titulo: parado ? `Los ${conSerie.valores.length} días antes de parar` : `Los últimos ${conSerie.valores.length} días`,
        desde: iso(t0), hasta: iso(t1), series,
        ...(perfil && eq.modoFalla && eq.modoFalla !== '—' ? { modoFalla: eq.modoFalla } : {}),
      }
    }
  }

  // Su historia: las fallas (bombas y electrosumergibles) o los eventos que se le cargaron.
  let historia: HistoriaNivel3 | undefined
  const conFallas = !!perfil || pozo?.levantamiento === 'electrosumergible'
  if (eq && conFallas) {
    const h = historialDeEquipo(campoId, equipo, ctx)
    historia = {
      fallas: h.fallas, que: 'fallas', meses: h.dias / 30.4,
      ...(finito(h.mtbfDias) ? { cadaDias: h.mtbfDias } : {}), ...(finito(h.mdtH) ? { fueraH: h.mdtH } : {}),
      ...(finito(h.bblPorFalla) ? { bblPorFalla: h.bblPorFalla } : {}),
      porParte: h.porParte.filter(p => p.fallas > 0).map(p => ({ parte: NOMBRE_PARTE[p.parte], fallas: p.fallas })),
      ultimas: ultimasDos(h.eventos.filter(e => e.fin && !e.disparo)).map(e => ({ dia: diaCorto(e.inicio.getTime()), que: e.parte ? NOMBRE_PARTE[e.parte].toLowerCase() : 'sin identificar', bbl: e.bbl })),
    }
  } else if (eq) {
    const ev = eventosCargadosA(campoId, equipo, ctx)
    const dias = (ahora - calendario()[0]!.desde) / 86_400_000
    historia = {
      fallas: ev.length, que: 'eventos', meses: dias / 30.4,
      ...(ev.length >= 2 ? { cadaDias: dias / ev.length } : {}),
      porParte: [],
      ultimas: ultimasDos(ev.filter(e => e.fin)).map(e => ({ dia: diaCorto(e.inicio.getTime()), que: e.causa.parte ? NOMBRE_PARTE[e.causa.parte].toLowerCase() : e.causa.texto.split(/[.:]/)[0]!.toLowerCase(), bbl: e.bbl })),
    }
  }

  // Los repuestos críticos que faltan (bajo su mínimo).
  const repuestos: RepuestoNivel3[] = repuestosDe(campoId, equipo).filter(r => r.stock < r.minimo).map(r => ({
    descripcion: r.descripcion, stock: r.stock, minimo: r.minimo, plazoDias: r.plazoDias,
    ...(r.enTransito ? { llega: `llega${r.enTransito.cantidad === 1 ? '' : 'n'} ${r.enTransito.cantidad} el ${diaCorto(Date.parse(`${r.enTransito.llega}T12:00:00-05:00`))}` } : {}),
    aviso: !r.enTransito,
  }))

  const crit5 = eq ? `criticidad ${eq.criticidad} de 5` : ''
  const subtitulo = eq ? [eq.nombre.charAt(0).toLowerCase() + eq.nombre.slice(1), eq.sistema.toLowerCase(), crit5].join(' · ')
    : `${familia} · sin instrumento`
  return {
    campoId, campoNombre: campoPorId(campoId).nombre, equipo, subtitulo, familia, tipo, tren, vecinos,
    registrado: !!eq, vigila: fc?.vigilado ?? !!eq?.instrumentado,
    ...(condicion ? { condicion } : {}), parado, previo,
    ...(cifra ? { cifra } : {}), ...(bloqueo ? { bloqueo } : {}),
    ...(preg ? { pregunta: { sobre: preg.sobre, evento: preg.id } } : {}),
    senales, plegadas, discretas, sinDisparo: todas.length > 0,
    ...(esquemaAgua ? { esquemaAgua } : {}), ...(mientras ? { mientras } : {}), ...(tendencias ? { tendencias } : {}),
    ...(historia ? { historia } : {}), repuestos, diagnostico: !!eq,
  }
}

/** «9 temperaturas · todas en banda»: lo plegado en un renglón (X4 §5.1, N3). */
export function resumenPlegadas(ss: readonly Pick<SenalNivel3, 'nombre'>[]): string {
  if (!ss.length) return ''
  const PLURAL: Record<string, string> = { Temperatura: 'temperaturas', Presión: 'presiones', Vibración: 'vibraciones', Nivel: 'niveles', Corriente: 'corrientes' }
  const grupos = new Map<string, number>()
  for (const s of ss) { const k = s.nombre.split(' ')[0]!; grupos.set(k, (grupos.get(k) ?? 0) + 1) }
  const partes = [...grupos.entries()].sort((a, b) => b[1] - a[1])
    .map(([k, n]) => (n > 1 && Object.hasOwn(PLURAL, k) ? `${n} ${PLURAL[k]}` : n > 1 ? `${n} señales de ${k.toLowerCase()}` : `1 de ${k.toLowerCase()}`))
  return `${ss.length === 1 ? '1 señal más' : `${ss.length} señales más`}: ${lista(partes)} · todas en banda`
}
