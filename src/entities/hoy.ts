/** C3 · «HOY»: lo que a cada rol le toca hacer, en un solo lugar (X4 §3.3).
 *
 *  El motor no inventa tareas: las saca de lo que ya sabe y que hoy está
 *  regado en Turno, Identificar, Mi trabajo, Mantenimiento, Riesgo y
 *  Producción (X4 §1.3.5, §3.7):
 *  - las paradas que el libro pregunta («por identificar»: qué se dañó, por qué paró);
 *  - las paradas de hoy con la misma cadena de 6 pasos, para confirmarlas en lote;
 *  - las preguntas de campo abiertas del árbol de la ANH (U1 §2.4) y lo que alguien
 *    marcó «Algo está mal»;
 *  - las órdenes de SAP abiertas sobre lo que ya pasó el límite, y las del técnico;
 *  - «Ojo: no intervenir», «Lo más frágil» y lo que viene (avisos: no piden nada);
 *  - la asignación oficial sin cargar del último mes cerrado y las metas sin firmar;
 *  - los planes del ciclo, para quien los decide.
 *  Cada tarea va con la capacidad de `roles.ts` que la autoriza: un rol no ve
 *  lo que no puede hacer (`puedeHacer`).
 *
 *  EL ORDEN (X4 §3.3): primero lo que dice «no» (los bloqueos «No arrancar …»,
 *  que van como franja y no como tarjeta), después lo que tiene hora límite,
 *  después los barriles en juego (de más a menos) y al final lo demás, por
 *  antigüedad. Los avisos que solo informan van al final y no suman a la
 *  insignia. Lo hecho hoy va aparte.
 *
 *  Todo entra por parámetro (`EntradaHoy`): la costura (`shared/api/hoy.ts`)
 *  junta lo que ya calculan el libro, el árbol, el riesgo, la tubería y SAP,
 *  y este módulo solo los cruza. Sin estado y sin reloj propio: lo mismo da
 *  lo mismo, y cabe holgado en los 300 ms de D7. */
import { puedeHacer, type Capacidad } from './tipos'
import type { Pregunta } from './libro'
import type { ParadaAnh } from './anh-paradas'
import { esperaAQuienAbre, esperaRevision, esNoSe, cadenaDe, ROLES_QUE_CONTESTAN, CONFIRMAN_LO_QUE_APUNTA, type PreguntaCampo } from './anh-clasificacion'
import { PASOS, ETIQUETA_PLANEACION, type PasoAnh } from './anh-catalogo'
import type { Riesgo } from './diferido'
import type { Mensaje, Opcion } from './mensajes'
import { CAUSAS_POZO, NO_FUE_ESP_CORTO } from './mensajes'
import type { OrdenSap, AvisoSap } from './sap'
import type { PlanAccion } from './escenarios'
import { DONDE_CHOKE, n0, type ChokeAnh, type TuberiaCampo } from './choke'
import type { TuberiaAgua } from './choke-agua'
import type { CriticidadDelCampo } from './criticidad'
import type { CondicionFranja } from './condiciones'
import { modosDeParte, nombreModo, MODO_OTRO, type Catalogo } from './catalogo'
import type { ParteId } from './partes'
import type { TipoCausa } from './causa-senal'
import { campoPorId } from './campos'

/* ─────────────────────────────── la vista ─────────────────────────────── */

/** Un pedazo de texto; lo que va en negrita lo marca el motor (la pantalla no decide qué resaltar). */
export type Trozo = string | { b: string }
export type Frase = Trozo[]

/** A dónde lleva «Ver…»: un lugar del producto, no una pantalla del código. */
export type Destino =
  | { a: 'paradas' }
  | { a: 'equipo'; campoId: string; equipo: string }
  | { a: 'planta' }
  | { a: 'agua' }
  | { a: 'turno' }
  | { a: 'asignacion' }
  | { a: 'metas' }
  | { a: 'planes' }

/** La acción de un toque de una tarjeta. */
export type AccionHoy =
  /** `POST /api/anh/paradas/confirmar` con estas filas y la cadena que se vio. */
  | { tipo: 'confirmar'; texto: string; ids: string[]; cadena: string; pozos: string[] }
  /** Abre en la misma tarjeta las preguntas que trae (`TareaHoy.preguntas`). */
  | { tipo: 'responder'; texto: string }
  | { tipo: 'ir'; texto: string; destino: Destino }

export type TipoTarea =
  | 'contestar' | 'conseguir-causa' | 'confirmar' | 'confirmar-apunta' | 'revisar' | 'precisar'
  | 'orden' | 'intervenir' | 'analisis' | 'planes' | 'asignacion' | 'metas' | 'aviso'

/** En qué parte de la lista va (X4 §3.3). `aviso`: solo informa, al final y sin insignia. */
export type GrupoHoy = 'hora' | 'barriles' | 'demas' | 'aviso'

/** Una opción de una pregunta de un toque (X5 §5.8). */
export type OpcionHoy =
  /** Una parte del equipo: después, «¿Qué vio?» con sus modos (la regla del libro: parte y lo que se vio). */
  | { tipo: 'parte'; texto: string; dato?: string; parte: ParteId; modos: ModoHoy[] }
  /** «Otra parte»: la lista entera del catálogo. */
  | { tipo: 'partes'; texto: string; dato?: string; partes: Array<{ parte: ParteId; texto: string; modos: ModoHoy[] }> }
  /** Una causa del pozo: se guarda su texto (`POST /api/paradas/:evento/respuesta`). */
  | { tipo: 'texto'; texto: string; dato?: string; valor: string }
  /** «No fue la electrosumergible»: después, las causas del pozo. */
  | { tipo: 'causas'; texto: string; dato?: string; causas: Array<{ texto: string; dato?: string; valor: string }> }
  /** Una opción de una pregunta del árbol, con su texto exacto (`POST /api/anh/paradas/:id/respuesta`). */
  | { tipo: 'anh'; texto: string; dato?: string; valor: string }
  /** «Todavía no sé»: en el árbol se guarda «No sé» (`valor`) y escala; en el libro no se escribe nada. */
  | { tipo: 'no-se'; texto: string; dato: string; valor?: string }
/** Un modo de falla en palabras de campo; «Otra cosa» pide escribir qué vio. */
export interface ModoHoy { codigo: string; texto: string; escribe?: true }

/** Una pregunta de una sola respuesta (X5 §5.8): la del libro o la del árbol. */
export interface PreguntaHoy {
  /** `libro:${evento}` o `anh:${fila}:${pregunta}`. */
  id: string
  via: 'libro' | 'anh'
  campoId: string
  equipo: string
  /** Una bomba o un equipo (femenino: «está parada») o un pozo. */
  sobre: 'bomba' | 'pozo'
  marca?: CondicionFranja
  /** «P-201B · bomba de agua · paró hoy a las 03:52, hace 10,1 h». */
  contexto: string
  texto: string
  /** «Lo que más le ha fallado a esta bomba:». */
  pista?: string
  opciones: OpcionHoy[]
  /** «No la arranque hasta decir qué se dañó». */
  bloqueo?: { texto: string; sub?: string }
  /** El tramo donde está el equipo, para la tubería chica: «planta · agua». */
  tramo: { choke: 'pozo' | 'planta' | 'exportacion'; rotulo: string }
  /** Para escribir en el libro. */
  libro?: { evento: string; campoId: string; equipo: string }
  /** Para escribir en el árbol: la fila, la pregunta, la cadena que se vio y el alcance (D1). */
  anh?: { fila: string; pregunta: string; cadena: string; aplicarAlEvento?: true; aplicarALaCascada?: true; ids?: string[] }
}

/** El equipo de una tarjeta con SU marca (la de la franja: X2 B10; X4 §3.3). */
export interface DondeHoy { equipo: string; marca?: CondicionFranja; texto: string }

/** Una tarjeta de Hoy (X4 §3.3; X5 §5.7): verbo + qué, dónde, por qué importa y la acción. */
export interface TareaHoy {
  id: string
  tipo: TipoTarea
  campoId: string
  /** La capacidad de `roles.ts` que la autoriza. Ausente en lo que solo informa. */
  capacidad?: Capacidad
  /** Pide una acción: suma a la insignia. */
  pide: boolean
  grupo: GrupoHoy
  titulo: string
  donde?: DondeHoy
  porque?: Frase
  accion?: AccionHoy
  ver?: { texto: string; destino: Destino }
  /** Las preguntas que se contestan desde la tarjeta, en orden. */
  preguntas?: PreguntaHoy[]
  /** Lo del ciclo que toca este equipo (simulado), para quien decide los planes. */
  planes?: string[]
  /** Para el orden y para leer: la hora límite, los barriles en juego y desde cuándo. */
  limite?: string
  bblAhora?: number
  bblSiPara?: number
  desde?: string
}

/** La franja «No arrancar … hasta identificar qué se dañó» (X5 §5.6): va en tinta, nunca en color. */
export interface BloqueoHoy { campoId: string; equipos: string[]; texto: string; sub: string; planes?: string[] }

/** Lo que se hizo hoy (se pliega al final: «Hecho hoy (n)»). */
export interface HechaHoy { id: string; titulo: string; detalle: string; hora: string }

/** La cifra con su frase (X5 §5.1; X4 §3.4). */
export interface InicioHoy {
  /** La frase de una línea de X4 §3.4. */
  frase: string
  previo?: string
  cifra: string
  unidad?: string
  remate?: string
  explica?: Frase
}

/** «Su campo, ahora»: la tubería en chico y dos frases (lo que se deja de producir y el agua). */
export interface CampoAhoraHoy {
  campoId: string
  tramos: Array<{ choke: 'pozo' | 'planta' | 'exportacion'; rotulo: string; limita: boolean; trabado: boolean }>
  frases: Frase[]
}

/** «El turno en WhatsApp»: un hilo por parada u orden, de las últimas 12 h. */
export interface WhatsappHoy { mensajes: number; hilos: Array<{ equipo: string; pasos: string; estado?: Frase }> }

export interface VistaHoy {
  rol: string
  campos: string[]
  inicio: InicioHoy
  bloqueos: BloqueoHoy[]
  /** En orden: hora, barriles, lo demás y, al final, los avisos. */
  tareas: TareaHoy[]
  /** Las tarjetas que piden una acción (los avisos no cuentan). */
  insignia: number
  hechas: HechaHoy[]
  /** «Nada pendiente. El campo está normal.» cuando no hay tarjetas ni bloqueos. */
  vacio?: string
  /** «Entregar turno» (el supervisor): abre la entrega de turno que ya existe. */
  entregarTurno: boolean
  campo?: CampoAhoraHoy
  whatsapp?: WhatsappHoy
  turno?: { horas: number; diferidoBbl: number }
}

/* ─────────────────────────────── la entrada ─────────────────────────────── */

/** Lo que el libro sabe de las opciones de una parada (`OpcionesRespuesta` de la costura). */
export interface OpcionesDelLibro { catalogo?: Catalogo; sugeridas?: { opciones: Opcion[]; conEvidencia: boolean } }

export interface EntradaHoy {
  rol: { id: string; puede: Record<Capacidad, boolean> }
  /** Quien mira (la persona del rol): «a su nombre» y «hecho hoy». */
  persona?: { id: string; nombre: string }
  campos: string[]
  /** El reloj de los datos, ms. */
  ahora: number
  /** Las paradas que el libro pregunta (toda la historia). */
  preguntas: readonly Pregunta[]
  /** Las opciones de cada pregunta del libro, por evento. */
  opciones: Readonly<Record<string, OpcionesDelLibro>>
  /** Las filas de la ANH del mes en curso, con lo que dijeron las personas encima. */
  paradas: readonly ParadaAnh[]
  riesgo: readonly Riesgo[]
  /** La condición de cada equipo, la misma de la franja de la cabecera (`${campo}|${equipo}`). */
  condiciones: Readonly<Record<string, CondicionFranja>>
  mensajes: readonly Mensaje[]
  ordenes: readonly OrdenSap[]
  avisosSap: readonly AvisoSap[]
  planes: readonly PlanAccion[]
  tuberias: Readonly<Record<string, TuberiaCampo>>
  aguas: Readonly<Record<string, TuberiaAgua>>
  criticidad: ReadonlyArray<Pick<CriticidadDelCampo, 'campoId' | 'noIntervenir' | 'avisosTrabajo'>>
  /** Los tres relojes de las fallas cerradas (horas): para la cifra del jefe. */
  relojes?: { totalH?: number; esperaH?: number }
  /** Las fallas que el vigía podía ver y las que anunció. */
  vigia?: { anunciadas: number; vigiladas: number }
  /** Los meses cerrados sin asignación oficial cargada, por campo (el último de cada uno). */
  asignacionSinCargar: ReadonlyArray<{ campoId: string; mes: string; nombreMes: string }>
  /** Los campos sin meta firmada que rija hoy. */
  sinMeta: readonly string[]
  /** Las fallas declaradas con su parte que esperan el análisis de confiabilidad. */
  sinAnalisis: readonly Pregunta[]
  /** Las paradas programadas que vienen (el programa firmado). */
  programa: ReadonlyArray<{ id: string; campoId: string; equipo: string; desde: string; hasta: string; motivo: string }>
  /** Los nombres de las personas, por id: «liberada a Óscar Daza». */
  nombres: Readonly<Record<string, string>>
  /** El diferido de las últimas 12 h (el turno). */
  diferidoTurnoBbl?: number
}

/* ─────────────────────────────── palabras ─────────────────────────────── */

const H = 3_600_000, D = 86_400_000, COT = 5 * H
/** El turno, 12 h (rotación 7×7 sobre una operación 24/7; Turno.tsx). */
export const TURNO_H = 12
/** La hora límite del reporte diario a la ANH: el día siguiente, antes de las 07:00 (C24 p.8-9; P1 §2.6). */
export const HORA_REPORTE = '07:00'
/** Cuánto dura el aviso con «Deshacer» (X4 §5.5: 5 segundos). */
export const DESHACER_MS = 5_000
/** El motivo con que queda lo deshecho (D1: nada se borra, se retira con motivo). */
export const MOTIVO_DESHACER = 'deshecho por quien contestó'

const FMT1 = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1, minimumFractionDigits: 1 })
const uno = (v: number) => FMT1.format(v)
const lista = (xs: readonly string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}`)
const ms = (s: string | Date) => (s instanceof Date ? s.getTime() : Date.parse(s))
/** «05:43», en hora de Colombia. */
export const horaCo = (t: number) => new Date(t - COT).toISOString().slice(11, 16)
/** «a la 01:10» · «a las 20:20». */
const aLas = (t: number) => `${horaCo(t).startsWith('01:') ? 'a la' : 'a las'} ${horaCo(t)}`
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic']
const diaCo = (t: number) => new Date(t - COT).toISOString().slice(0, 10)
/** «hoy a las 03:52» · «el 1 de oct a las 18:20». */
function cuando(t: number, ahora: number): string {
  if (diaCo(t) === diaCo(ahora)) return `hoy ${aLas(t)}`
  const d = new Date(t - COT)
  return `el ${d.getUTCDate()} de ${MES[d.getUTCMonth()]} ${aLas(t)}`
}
const horasDesde = (t: number, ahora: number) => `${uno(Math.max(0, (ahora - t) / H))} h`
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`
const minus = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

/** La familia en palabras de campo (X5 §5.5: «bomba de agua», «aire de instrumentos»). */
const FAMILIA: Record<TipoCausa, string> = {
  reinyeccion: 'bomba de agua', transporte: 'bomba multifásica', electrosumergible: 'electrosumergible', levantamiento: 'bombeo mecánico',
  energia: 'energía eléctrica', aire: 'aire de instrumentos', compresion: 'compresor de gas', evacuacion: 'despacho del crudo',
  proceso: 'separador', tratamiento: 'tratamiento de crudo', programada: 'parada programada', declarada: 'pozo', pendiente: 'pozo',
}
const ROTULO_CHOKE: Record<'pozo' | 'planta' | 'exportacion', string> = { pozo: 'pozos', planta: 'planta', exportacion: 'salida' }
const deChoke = (c: ChokeAnh | null | undefined): 'pozo' | 'planta' | 'exportacion' | undefined =>
  c === 'pozo' || c === 'planta' || c === 'exportacion' ? c : c === 'reservorio' ? 'pozo' : undefined

/* ─────────────────────────────── el orden ─────────────────────────────── */

const RANGO: Record<GrupoHoy, number> = { hora: 0, barriles: 1, demas: 2, aviso: 3 }
/** El orden de X4 §3.3: lo que tiene hora (la más cercana primero), los barriles
 *  en juego (lo que se pierde ahora y después lo que se perdería si para), lo
 *  demás por antigüedad y al final los avisos. */
export function ordenar(ts: readonly TareaHoy[]): TareaHoy[] {
  const bbl = (t: TareaHoy) => [t.bblAhora ?? 0, t.bblSiPara ?? 0] as const
  return [...ts].sort((a, b) => {
    if (a.grupo !== b.grupo) return RANGO[a.grupo] - RANGO[b.grupo]
    if (a.grupo === 'hora' && a.limite !== b.limite) return ms(a.limite ?? '9999') - ms(b.limite ?? '9999')
    if (a.grupo === 'hora' || a.grupo === 'barriles') {
      const [x1, x2] = bbl(a), [y1, y2] = bbl(b)
      if (x1 !== y1) return y1 - x1
      if (x2 !== y2) return y2 - x2
    }
    return ms(a.desde ?? '9999') - ms(b.desde ?? '9999') || a.id.localeCompare(b.id)
  })
}

/* ─────────────────────────────── el motor ─────────────────────────────── */

/** Las tareas de Hoy de un rol en unos campos. */
export function hoy(e: EntradaHoy): VistaHoy {
  const puede = (k: Capacidad) => puedeHacer(e.rol.puede, k)
  const rol = e.rol.id
  const campos = new Set(e.campos)
  const enCampos = <T extends { campoId: string }>(xs: readonly T[]) => xs.filter(x => campos.has(x.campoId))
  const marca = (campoId: string, equipo: string) => e.condiciones[`${campoId}|${equipo}`]
  const hoyDia = diaCo(e.ahora)
  const limiteReporte = (dia: string) => {
    const d = new Date(`${dia}T00:00:00-05:00`).getTime() + D
    return `${diaCo(d)}T${HORA_REPORTE}:00-05:00`
  }
  const riesgo = enCampos(e.riesgo)
  const perdiendo = (campoId: string, equipo: string) => riesgo.find(r => r.estado === 'perdiendo' && r.campoId === campoId && r.equipo === equipo)

  const deCampo = !ROLES_QUE_CONTESTAN.revisa.includes(rol)
  const revisa = ROLES_QUE_CONTESTAN.revisa.includes(rol)
  const tareas: TareaHoy[] = []
  const bloqueos: BloqueoHoy[] = []

  /* — las paradas que el libro pregunta — */
  const preguntas = enCampos(e.preguntas).filter(p => p.pide)
  const esperaElLibro = new Set(preguntas.map(p => `${p.campoId}|${p.id}`))
  const delLibro = (f: ParadaAnh) => esperaElLibro.has(`${f.campoId}|${f.eventoId}`) || esperaElLibro.has(`${f.campoId}|${f.raiz}`)
  const declara = puede('causa:declarar')

  // Lo que dice «no» (X4 §3.3, punto 1): una franja por campo, con lo que sigue parado sin identificar.
  if (declara) for (const c of e.campos) {
    const parados = preguntas.filter(p => p.campoId === c && !p.fin)
    if (!parados.length) continue
    bloqueos.push({ campoId: c, equipos: parados.map(p => p.equipo),
      texto: `No arrancar ${parados.length === 1 ? parados[0]!.equipo : `${parados.slice(0, -1).map(p => p.equipo).join(', ')} ni ${parados.at(-1)!.equipo}`} hasta identificar qué se dañó`,
      sub: 'Si arranca antes, queda como no conformidad.' })
  }

  /** Lo que más tiene que ver con una pregunta del libro: los barriles que se pierden ahora o desde cuándo. */
  const ordenDe = (p: Pregunta): Pick<TareaHoy, 'grupo' | 'bblAhora' | 'desde'> => {
    const r = !p.fin ? perdiendo(p.campoId, p.equipo) : undefined
    return r ? { grupo: 'barriles', bblAhora: r.bblDia, desde: p.inicio.toISOString() } : { grupo: 'demas', desde: p.inicio.toISOString() }
  }

  /** La pregunta del libro, como se contesta de un toque. */
  const preguntaDelLibro = (p: Pregunta): PreguntaHoy => {
    const op = e.opciones[p.id] ?? {}
    const familia = p.sobre === 'bomba' ? FAMILIA[p.causa.tipo] : 'pozo'
    const t0 = p.inicio.getTime()
    const contexto = `${p.equipo} · ${familia} · ${p.fin ? `paró ${cuando(t0, e.ahora)} y arrancó ${cuando(p.fin.getTime(), e.ahora)} sin identificar` : `paró ${cuando(t0, e.ahora)}, hace ${horasDesde(t0, e.ahora)}`}`
    const conPartes = !!op.catalogo
    const esp = op.catalogo?.clase === 'bomba-electrosumergible'
    const modos = (parte: ParteId): ModoHoy[] => {
      const pa = op.catalogo?.partes.find(x => x.id === parte)
      return pa ? modosDeParte(pa).map(m => ({ codigo: m.codigo, texto: nombreModo(m.codigo, parte), ...(m.codigo === MODO_OTRO ? { escribe: true as const } : {}) })) : []
    }
    const causas = CAUSAS_POZO.map(c => {
      const [t, ...resto] = c.split(': ')
      return { texto: t!, ...(resto.length ? { dato: resto.join(': ') } : {}), valor: c }
    })
    const opciones: OpcionHoy[] = []
    if (conPartes) {
      const sugeridas = (op.sugeridas?.opciones ?? []).filter(o => o.parte)
      for (const o of sugeridas) opciones.push({ tipo: 'parte', texto: o.texto, parte: o.parte!, modos: modos(o.parte!),
        ...(o.veces !== undefined && o.total !== undefined ? { dato: `${o.veces} de sus ${o.total} ${o.total === 1 ? 'falla' : 'fallas'}` } : o.porque ? { dato: o.porque } : {}) })
      const resto = op.catalogo!.partes.filter(x => !sugeridas.some(o => o.parte === x.id))
      if (resto.length) opciones.push({ tipo: 'partes', texto: sugeridas.length ? 'Otra parte' : 'La parte', dato: 'escoja de la lista',
        partes: resto.map(x => ({ parte: x.id, texto: x.nombre, modos: modos(x.id) })) })
      if (esp) opciones.push({ tipo: 'causas', texto: NO_FUE_ESP_CORTO, dato: 'otra causa del pozo', causas })
    } else for (const c of causas) opciones.push({ tipo: 'texto', ...c })
    opciones.push({ tipo: 'no-se', texto: 'Todavía no sé', dato: 'se la vuelven a preguntar en la próxima ronda' })
    const trabado = e.tuberias[p.campoId]?.perdiendoAhora.find(x => x.equipo === p.equipo)
    const choke = deChoke(trabado?.tramo) ?? (p.sobre === 'pozo' ? 'pozo' : 'planta')
    const rotulo = `${ROTULO_CHOKE[choke]}${p.causa.tipo === 'reinyeccion' ? ' · agua' : ''}`
    return {
      id: `libro:${p.id}`, via: 'libro', campoId: p.campoId, equipo: p.equipo, sobre: p.sobre, ...(marca(p.campoId, p.equipo) ? { marca: marca(p.campoId, p.equipo) } : {}),
      contexto, texto: conPartes ? (esp ? '¿Qué se dañó?' : '¿Qué parte se dañó?') : '¿Por qué paró?',
      ...(conPartes && op.sugeridas?.conEvidencia ? { pista: `Lo que más le ha fallado a esta ${p.sobre === 'bomba' ? 'bomba' : 'electrosumergible'}:` } : {}),
      opciones,
      ...(!p.fin ? { bloqueo: p.sobre === 'bomba'
        ? { texto: 'No la arranque hasta decir qué se dañó', sub: 'Si arranca antes, queda como no conformidad.' }
        : { texto: 'No lo arranque hasta decir qué pasó', sub: 'Si arranca antes, queda como no conformidad.' } } : {}),
      tramo: { choke, rotulo },
      libro: { evento: p.id, campoId: p.campoId, equipo: p.equipo },
    }
  }

  /** Cuándo se le escaló una pregunta al supervisor (el registro de WhatsApp). */
  const escalada = (p: Pregunta) => {
    const m = e.mensajes.filter(x => x.evento === p.id && x.insistencia === 'escalamiento').sort((a, b) => ms(a.hora) - ms(b.hora))[0]
    return m ? ms(m.hora) : undefined
  }
  const filasHoyDe = (eventos: readonly string[]) => enCampos(e.paradas).filter(f => f.diaOperacional === hoyDia && eventos.includes(f.eventoId))

  if (declara) {
    if (deCampo) {
      // El operador y el técnico: una pregunta por parada (X4 §5.5).
      for (const p of preguntas) {
        const q = preguntaDelLibro(p)
        const tec = rol === 'tec'
        tareas.push({
          id: `contestar:${p.campoId}:${p.id}`, tipo: 'contestar', campoId: p.campoId, capacidad: 'causa:declarar', pide: true, ...ordenDe(p),
          titulo: tec ? `Diga qué encontró en ${p.equipo}` : p.sobre === 'bomba' ? `Contestar qué se dañó en ${p.equipo}` : `Contestar por qué paró ${p.equipo}`,
          donde: { equipo: p.equipo, ...(q.marca ? { marca: q.marca } : {}), texto: q.contexto.split(' · ').slice(1).join(' · ') },
          porque: p.fin ? ['Arrancó sin identificar: queda como no conformidad hasta que alguien diga qué pasó.']
            : [`Sigue ${p.sobre === 'bomba' ? 'parada' : 'parado'}: no se arranca hasta decir qué ${p.sobre === 'bomba' ? 'se dañó' : 'pasó'}.`],
          accion: { tipo: 'responder', texto: tec ? 'Registrar qué encontré' : 'Contestar' },
          ver: { texto: `Ver ${p.equipo}`, destino: { a: 'equipo', campoId: p.campoId, equipo: p.equipo } },
          preguntas: [q],
        })
      }
    } else {
      // Quien revisa: las paradas que nadie contestó, juntas (X4 §3.3: «escalar lo que nadie
      // contestó»). Al supervisor le tocan las que dejan una parada sin causa para el reporte;
      // la parte de una bomba es del operador y del técnico, y para él ya está en la franja.
      // El jefe de mantenimiento y confiabilidad también ven la parte (abren o analizan el equipo).
      for (const c of e.campos) {
        const suyas = preguntas.filter(p => p.campoId === c && (rol !== 'sup' || p.sobre === 'pozo'))
        if (!suyas.length) continue
        const enOrden = ordenar(suyas.map(p => ({ id: p.id, tipo: 'conseguir-causa' as const, campoId: c, pide: true, titulo: '', ...ordenDe(p) })))
          .map(t => suyas.find(p => p.id === t.id)!)
        const primera = enOrden[0]!
        const t0 = primera.inicio.getTime(), esc = escalada(primera)
        const decirUna = (p: Pregunta): string => p.fin
          ? `arrancó ${aLas(p.fin.getTime())} sin identificar`
          : `lleva ${horasDesde(p.inicio.getTime(), e.ahora)} ${p.sobre === 'bomba' ? 'sin saber qué se dañó' : 'sin causa'}`
        const otras = enOrden.slice(1)
        const deHoy = filasHoyDe(suyas.map(p => p.id)).reduce((a, f) => a + f.diferidaTrimBbl, 0)
        const desdeQueParo = suyas.reduce((a, p) => a + p.bbl, 0)
        const ahoraBbl = suyas.reduce((a, p) => a + (!p.fin ? perdiendo(p.campoId, p.equipo)?.bblDia ?? 0 : 0), 0)
        const porque: Frase = []
        for (const p of otras) porque.push({ b: p.equipo }, ` ${decirUna(p)}`, ' · ')
        if (deHoy > 0) porque.push({ b: `${n0(deHoy)} bbl hoy` }, Math.round(desdeQueParo) > Math.round(deHoy) ? `, ${n0(desdeQueParo)} desde que pararon` : '')
        else porque.push(`${n0(desdeQueParo)} bbl desde que pararon`)
        tareas.push({
          id: `conseguir-causa:${c}`, tipo: 'conseguir-causa', campoId: c, capacidad: 'causa:declarar', pide: true,
          grupo: ahoraBbl > 0 ? 'barriles' : 'demas', ...(ahoraBbl > 0 ? { bblAhora: ahoraBbl } : {}), desde: primera.inicio.toISOString(),
          titulo: suyas.length === 1 ? `Conseguir la causa de ${primera.equipo}` : `Conseguir la causa de ${suyas.length} paradas`,
          donde: { equipo: primera.equipo, ...(marca(c, primera.equipo) ? { marca: marca(c, primera.equipo) } : {}),
            texto: `${decirUna(primera)}${esc && esc >= t0 ? `; se escaló ${aLas(esc)}` : ''}` },
          porque,
          accion: { tipo: 'responder', texto: 'Responder yo' },
          ver: { texto: 'Ver el chat', destino: { a: 'paradas' } },
          preguntas: enOrden.map(preguntaDelLibro),
        })
      }
    }
  }

  /* — el árbol de la ANH — */
  const filas = enCampos(e.paradas)
  const clasifica = puede('anh:clasificar')
  // Confirmar en lote lo de hoy (sup y prod: quienes firman el día).
  if (puede('anh:confirmar')) {
    const deHoy = filas.filter(f => f.diaOperacional === hoyDia && f.estado === 'propuesta' && !esperaAQuienAbre(f.clasificacion) && !(f.revision && !f.revision.atendida))
    const lotes = new Map<string, ParadaAnh[]>()
    for (const f of deHoy) {
      const k = `${f.campoId}|${cadenaDe(f.clasificacion)}`
      const g = lotes.get(k)
      if (g) g.push(f); else lotes.set(k, [f])
    }
    for (const [k, fs] of lotes) {
      const p = fs[0]!
      const pozos = [...new Set(fs.map(f => f.pozo))]
      const raices = [...new Set(fs.map(f => f.raiz))]
      const equipo = raices.length === 1 && p.raiz !== p.eventoId ? p.causa.equipo : p.pozo
      const inicio = Math.min(...fs.map(f => ms(f.inicio)))
      const donde = raices.length === 1 && p.raiz !== p.eventoId ? `cerró ${lista(pozos)} · ${horaCo(inicio)}` : `${lista(pozos.filter(x => x !== equipo))} · ${horaCo(inicio)}`.replace(/^ · /, '')
      const tramo = p.clasificacion.choke ? DONDE_CHOKE[p.clasificacion.choke.valor] : undefined
      const pl = p.clasificacion.planeacion ? minus(ETIQUETA_PLANEACION[p.clasificacion.planeacion.valor]) : undefined
      const bbl = fs.reduce((a, f) => a + (perdiendo(f.campoId, f.causa.equipo)?.bblDia ?? 0), 0)
      const n = new Set(fs.map(f => f.eventoId)).size
      tareas.push({
        id: `confirmar:${k}`, tipo: 'confirmar', campoId: p.campoId, capacidad: 'anh:confirmar', pide: true, grupo: 'hora',
        limite: limiteReporte(hoyDia), ...(bbl > 0 ? { bblAhora: perdiendo(p.campoId, p.causa.equipo)?.bblDia ?? bbl } : {}), desde: new Date(inicio).toISOString(),
        titulo: n === 1 ? `Confirmar la parada de ${pozos[0]}` : `Confirmar ${n} paradas iguales`,
        donde: { equipo, ...(marca(p.campoId, equipo) ? { marca: marca(p.campoId, equipo) } : {}), texto: donde },
        porque: [`TRIM ${n === 1 ? 'la dedujo' : 'las dedujo'}: `, { b: [tramo, pl].filter(Boolean).join(', ') }, '. Falta su confirmación.'],
        accion: { tipo: 'confirmar', texto: n === 1 ? 'Confirmar' : `Confirmar las ${n}`, ids: fs.map(f => f.id), cadena: PASOS.map(x => String(p.clasificacion[x]?.valor ?? '—')).join(' · '), pozos },
        ver: { texto: 'Ver una por una', destino: { a: 'paradas' } },
      })
    }
  }

  // Las preguntas de campo del árbol (U1 §2.4). Al operador y al técnico, las del mes
  // en curso (su «Por contestar»); a quien revisa, las de hoy (el reporte de mañana).
  if (clasifica) {
    const contesta = (q: PreguntaCampo) => ROLES_QUE_CONTESTAN[q.quien].includes(rol) && (q.quien !== 'yacimiento' || puede('anh:yacimiento'))
    const abiertas = filas.filter(f => f.estado !== 'confirmada' && !f.exceso && !delLibro(f) && (deCampo || f.diaOperacional === hoyDia)
      && f.propuesta.preguntas.some(contesta))
    const porGrupo = new Map<string, ParadaAnh[]>()
    for (const f of abiertas) {
      const k = `${f.campoId}|${f.raiz !== f.eventoId ? f.raiz : f.eventoId}`
      const g = porGrupo.get(k)
      if (g) g.push(f); else porGrupo.set(k, [f])
    }
    const preguntasAnh: Array<{ q: PreguntaHoy; fs: ParadaAnh[] }> = []
    for (const [, fs] of porGrupo) {
      const f = fs[0]!
      const cascada = f.raiz !== f.eventoId
      const q = f.propuesta.preguntas.filter(contesta)[0]!
      const equipo = cascada ? f.causa.equipo : f.pozo
      const t0 = Math.min(...fs.map(x => ms(x.inicioEvento)))
      const choke = deChoke(f.clasificacion.choke?.valor) ?? 'pozo'
      preguntasAnh.push({ fs, q: {
        id: `anh:${f.id}:${q.id}`, via: 'anh', campoId: f.campoId, equipo, sobre: cascada ? 'bomba' : 'pozo', ...(marca(f.campoId, equipo) ? { marca: marca(f.campoId, equipo) } : {}),
        contexto: `${equipo} · ${cascada ? `cerró ${lista([...new Set(fs.map(x => x.pozo))])}` : 'pozo'} · paró ${cuando(t0, e.ahora)}`,
        texto: q.texto,
        opciones: [
          ...q.opciones.filter(o => !esNoSe(o)).map((o): OpcionHoy => ({ tipo: 'anh', texto: o.texto, valor: o.texto })),
          ...q.opciones.filter(esNoSe).map((o): OpcionHoy => ({ tipo: 'no-se', texto: 'Todavía no sé', dato: 'la pregunta sigue abierta y la ve su supervisor', valor: o.texto })),
        ],
        tramo: { choke, rotulo: ROTULO_CHOKE[choke] },
        anh: { fila: f.id, pregunta: q.id, cadena: PASOS.map(x => String(f.clasificacion[x]?.valor ?? '—')).join(' · '),
          ...(cascada ? { aplicarALaCascada: true as const, ids: fs.map(x => x.id) } : { aplicarAlEvento: true as const }) },
      } })
    }
    for (const { q, fs } of preguntasAnh) {
      const f = fs[0]!
      tareas.push({
        id: `${deCampo ? 'contestar' : 'precisar'}:${f.campoId}:${f.raiz !== f.eventoId ? f.raiz : f.eventoId}`, tipo: deCampo ? 'contestar' : 'precisar', campoId: f.campoId,
        capacidad: 'anh:clasificar', pide: true, grupo: 'demas', desde: new Date(Math.min(...fs.map(x => ms(x.inicioEvento)))).toISOString(),
        titulo: deCampo ? `Contestar «${q.texto}» de ${q.equipo}` : `Precisar ${q.equipo}: ${minus(q.texto.replace(/^¿|\?$/g, ''))}`,
        donde: { equipo: q.equipo, ...(q.marca ? { marca: q.marca } : {}), texto: q.contexto.split(' · ').slice(1).join(' · ') },
        porque: [`Para el reporte a la ANH falta ${f.faltan.length ? lista(f.faltan.map(x => PASO_EN_PALABRAS[x])) : 'un dato'}.`],
        accion: { tipo: 'responder', texto: 'Contestar' },
        ver: { texto: 'Ver la parada', destino: { a: 'paradas' } },
        preguntas: [q],
      })
    }

    // Lo que alguien marcó «Algo está mal» o le pidió a este rol (U1 §2.7).
    const aRevisar = filas.filter(f => esperaRevision(f.revision, rol))
    const porRevision = new Map<string, ParadaAnh[]>()
    for (const f of aRevisar) { const k = `${f.campoId}|${f.raiz}|${f.revision!.n ?? f.revision!.hora}`; const g = porRevision.get(k); if (g) g.push(f); else porRevision.set(k, [f]) }
    for (const [k, fs] of porRevision) {
      const f = fs[0]!, r = f.revision!
      const pozos = [...new Set(fs.map(x => x.pozo))]
      tareas.push({
        id: `revisar:${k}`, tipo: 'revisar', campoId: f.campoId, capacidad: 'anh:clasificar', pide: true,
        grupo: f.diaOperacional === hoyDia ? 'hora' : 'demas', ...(f.diaOperacional === hoyDia ? { limite: limiteReporte(hoyDia) } : {}), desde: r.hora,
        titulo: `Revisar ${lista(pozos)}: ${r.pedirA ? 'se lo pidieron' : 'alguien dijo que algo está mal'}`,
        donde: { equipo: pozos[0]!, ...(marca(f.campoId, pozos[0]!) ? { marca: marca(f.campoId, pozos[0]!) } : {}), texto: `${r.por} ${cuando(ms(r.hora), e.ahora)}` },
        porque: ['«', { b: r.motivo }, '»'],
        ver: { texto: 'Ver la parada', destino: { a: 'paradas' } },
      })
    }

    // La causa que una señal solo apunta: la confirma quien abre o analiza el equipo (P1 §2.1).
    if (CONFIRMAN_LO_QUE_APUNTA.includes(rol)) {
      const apuntan = filas.filter(f => f.estado === 'propuesta' && esperaAQuienAbre(f.clasificacion))
      const porRaiz = new Map<string, ParadaAnh[]>()
      for (const f of apuntan) { const k = `${f.campoId}|${f.raiz}`; const g = porRaiz.get(k); if (g) g.push(f); else porRaiz.set(k, [f]) }
      for (const [k, fs] of porRaiz) {
        const f = fs[0]!
        const equipo = f.raiz !== f.eventoId ? f.causa.equipo : f.pozo
        tareas.push({
          id: `confirmar-apunta:${k}`, tipo: 'confirmar-apunta', campoId: f.campoId, capacidad: 'anh:clasificar', pide: true,
          grupo: f.diaOperacional === hoyDia ? 'hora' : 'demas', ...(f.diaOperacional === hoyDia ? { limite: limiteReporte(hoyDia) } : {}), desde: f.inicioEvento,
          titulo: `Confirmar la causa de ${equipo}`,
          donde: { equipo, ...(marca(f.campoId, equipo) ? { marca: marca(f.campoId, equipo) } : {}), texto: `${lista([...new Set(fs.map(x => x.pozo))])} · ${horaCo(ms(f.inicioEvento))}` },
          porque: [f.clasificacion.apunta?.porque ?? 'Las señales apuntan a una causa: la confirma quien abre o analiza el equipo.'],
          ver: { texto: 'Ver la parada', destino: { a: 'paradas' } },
        })
      }
    }
  }

  /* — SAP: lo que ya pasó el límite y las órdenes — */
  const abiertas = enCampos(e.ordenes).filter(o => o.estado === 'REL' || o.estado === 'PCNF' || o.estado === 'CRTD')
  const avisosAbiertos = enCampos(e.avisosSap).filter(a => !a.cerrado)
  const nombre = (id?: string) => (id && Object.hasOwn(e.nombres, id) ? e.nombres[id]! : undefined)
  const yaPaso = riesgo.filter(r => r.estado === 'en-riesgo' && r.horas === undefined)
  const ordenEnPalabras = (o: OrdenSap) => `Orden ${o.numero}, ${o.liberada ? `liberada a ${o.tecnico === e.persona?.id ? 'su nombre' : nombre(o.tecnico) ?? `el puesto ${o.puesto}`} ${aLas(ms(o.liberada))}` : 'creada, sin liberar'}.`
  const siPara = (r: Riesgo): Frase => [`Si para, ${r.techo ? 'hasta ' : ''}`, { b: `${n0(r.bblDia)} bbl/d` }, '. ']
  const familiaDe = (r: Riesgo) => FAMILIA[r.tipo]
  if (revisa && puede('sap:aviso')) for (const r of yaPaso) {
    const o = abiertas.find(x => x.campoId === r.campoId && x.equipo === r.equipo)
    const a = avisosAbiertos.find(x => x.campoId === r.campoId && x.equipo === r.equipo)
    const base = { campoId: r.campoId, capacidad: 'sap:aviso' as const, pide: true, grupo: 'barriles' as const, bblSiPara: r.bblDia,
      donde: { equipo: r.equipo, ...(marca(r.campoId, r.equipo) ? { marca: marca(r.campoId, r.equipo) } : {}), texto: `${familiaDe(r)} · ya pasó el límite` } }
    if (o) tareas.push({ ...base, id: `orden:${r.campoId}:${o.numero}`, tipo: 'orden', titulo: `Seguir la orden de ${r.equipo}`, desde: o.liberada ?? o.creada,
      porque: [...siPara(r), ordenEnPalabras(o)], ver: { texto: 'Ver la orden', destino: { a: 'equipo', campoId: r.campoId, equipo: r.equipo } } })
    else if (a) tareas.push({ ...base, id: `aviso-sap:${r.campoId}:${a.numero}`, tipo: 'orden', titulo: `Seguir el aviso de ${r.equipo}`, desde: a.creado,
      porque: [...siPara(r), `Aviso ${a.numero} en SAP, todavía sin orden.`], ver: { texto: 'Ver el aviso', destino: { a: 'equipo', campoId: r.campoId, equipo: r.equipo } } })
    else if (rol === 'jefe' || rol === 'conf') tareas.push({ ...base, id: `intervenir:${r.campoId}:${r.equipo}`, tipo: 'intervenir', titulo: `Intervenir ${r.equipo}: ya pasó el límite`,
      porque: [...siPara(r), r.accion ?? r.motivo], accion: { tipo: 'ir', texto: 'Crear el aviso', destino: { a: 'equipo', campoId: r.campoId, equipo: r.equipo } } })
  }
  // Las órdenes a nombre de quien mira (el técnico): una tarjeta por orden, sin repetir el equipo.
  if (rol === 'tec' && e.persona) for (const o of abiertas.filter(x => x.tecnico === e.persona!.id)) {
    const r = riesgo.find(x => x.campoId === o.campoId && x.equipo === o.equipo)
    tareas.push({
      id: `orden:${o.campoId}:${o.numero}`, tipo: 'orden', campoId: o.campoId, pide: true,
      grupo: r ? 'barriles' : 'demas', ...(r?.estado === 'perdiendo' ? { bblAhora: r.bblDia } : r ? { bblSiPara: r.bblDia } : {}), desde: o.liberada ?? o.creada,
      titulo: `Atender la orden de ${o.equipo}`,
      donde: { equipo: o.equipo, ...(marca(o.campoId, o.equipo) ? { marca: marca(o.campoId, o.equipo) } : {}),
        texto: r ? `${familiaDe(r)}${r.estado === 'en-riesgo' && r.horas === undefined ? ' · ya pasó el límite' : ''}` : `orden ${o.numero}` },
      porque: [o.descripcion, ` Orden ${o.numero}, liberada a su nombre${o.liberada ? ` ${aLas(ms(o.liberada))}` : ''}; se notifica y se cierra en SAP.`],
      ver: { texto: 'Ver la orden', destino: { a: 'equipo', campoId: o.campoId, equipo: o.equipo } },
    })
  }

  /* — el análisis de las fallas declaradas (confiabilidad y el jefe) — */
  if (puede('causa:completar')) {
    const sin = enCampos(e.sinAnalisis)
    if (sin.length) {
      const p = sin[0]!
      tareas.push({
        id: `analisis:${[...new Set(sin.map(x => x.campoId))].join(',')}`, tipo: 'analisis', campoId: p.campoId, capacidad: 'causa:completar', pide: true, grupo: 'demas',
        desde: p.inicio.toISOString(),
        titulo: sin.length === 1 ? `Completar el análisis de ${p.equipo}` : `Completar el análisis de ${sin.length} fallas`,
        donde: { equipo: p.equipo, ...(marca(p.campoId, p.equipo) ? { marca: marca(p.campoId, p.equipo) } : {}), texto: `declarada ${cuando(p.inicio.getTime(), e.ahora)}` },
        porque: ['La parte ya la dijo quien la vio: falta el mecanismo y la causa raíz.'],
        ver: { texto: 'Ver las declaradas', destino: { a: 'paradas' } },
      })
    }
  }

  /* — producción: la asignación oficial del último mes cerrado — */
  if (puede('asignacion:cargar')) for (const a of enCampos(e.asignacionSinCargar)) tareas.push({
    id: `asignacion:${a.campoId}:${a.mes}`, tipo: 'asignacion', campoId: a.campoId, capacidad: 'asignacion:cargar', pide: true, grupo: 'demas',
    desde: `${a.mes}-01T00:00:00-05:00`,
    titulo: `Cargar la asignación de ${a.nombreMes}`,
    donde: { equipo: campoPorId(a.campoId).nombre, texto: 'sin asignación oficial cargada' },
    porque: ['Sin ella, lo que asigna TRIM no se coteja con lo que reportó la operadora.'],
    ver: { texto: 'Cargarla', destino: { a: 'asignacion' } },
  })

  /* — el gerente: las metas que no rigen — */
  if (puede('metas:firmar')) for (const c of e.sinMeta.filter(x => campos.has(x))) tareas.push({
    id: `metas:${c}`, tipo: 'metas', campoId: c, capacidad: 'metas:firmar', pide: true, grupo: 'demas',
    titulo: `Firmar la meta de ${campoPorId(c).nombre}`,
    donde: { equipo: campoPorId(c).nombre, texto: 'sin meta firmada que rija hoy' },
    porque: ['Sin meta no se mide si el diferido baja: la suma de los campos queda sin dato.'],
    ver: { texto: 'Ir a las metas', destino: { a: 'metas' } },
  })

  /* — avisos: solo informan (X4 §3.3, regla 6: no suman a la insignia) — */
  // «Lo más frágil» (sup, oper): si para otra bomba de agua, el orden de cierre que menos cuesta.
  if (rol === 'sup' || rol === 'oper') for (const c of e.campos) {
    const s = e.aguas[c]?.siParaOtra
    if (!s || s.aguaSinSalidaBpd <= 0 || !s.pasos.length) continue
    const primeros = s.pasos.filter(x => x.fraccion >= 1).slice(0, 3).map(x => x.pozo)
    const colchon = s.colchonH === undefined ? '' : s.colchonH < 1 ? ` después de ${Math.max(1, Math.round(s.colchonH * 60))} min` : ` después de ${uno(s.colchonH)} h`
    tareas.push({
      id: `aviso:fragil:${c}`, tipo: 'aviso', campoId: c, pide: false, grupo: 'aviso',
      titulo: 'Lo más frágil: el agua.',
      porque: [`Si para otra bomba, cierre primero ${lista(primeros.length ? primeros : s.pasos.slice(0, 3).map(x => x.pozo))}: dejan de producirse ${n0(s.crudoBpd)} bbl/d${colchon}.`],
      ver: { texto: 'Ver el orden', destino: { a: 'agua' } },
    })
  }
  // «Ojo: no intervenir» (el jefe y la planeadora): lo que hoy vale más porque otro está parado.
  if (rol === 'jefe' || rol === 'plan') for (const k of e.criticidad.filter(x => campos.has(x.campoId))) {
    if (k.noIntervenir) tareas.push({ id: `aviso:no-intervenir:${k.campoId}`, tipo: 'aviso', campoId: k.campoId, pide: false, grupo: 'aviso',
      titulo: 'Ojo: no intervenir hoy.', porque: [k.noIntervenir.replace(/^Ojo: /, '')], ver: { texto: 'Ver los equipos', destino: { a: 'planta' } } })
    for (const a of k.avisosTrabajo) tareas.push({ id: `aviso:trabajo:${a.campoId}:${a.tarea}`, tipo: 'aviso', campoId: a.campoId, pide: false, grupo: 'aviso',
      titulo: `Ojo con el trabajo de ${a.equipo}.`, porque: [a.texto.replace(/^Ojo: /, '')], ver: { texto: `Ver ${a.equipo}`, destino: { a: 'equipo', campoId: a.campoId, equipo: a.equipo } } })
  }
  // «Lo que viene» (el técnico): las paradas programadas, al final (X4 §5.5).
  if (rol === 'tec') for (const p of e.programa.filter(x => campos.has(x.campoId) && ms(x.hasta) >= e.ahora)) tareas.push({
    id: `aviso:viene:${p.id}`, tipo: 'aviso', campoId: p.campoId, pide: false, grupo: 'aviso', desde: p.desde,
    titulo: `Lo que viene: ${p.equipo}`, porque: [`${p.motivo} · ${cuando(ms(p.desde), e.ahora)}.`],
    ver: { texto: `Ver ${p.equipo}`, destino: { a: 'equipo', campoId: p.campoId, equipo: p.equipo } },
  })

  /* — los planes del ciclo, para quien los decide (sin repetir el equipo de otra tarjeta) — */
  if (puede('planes:decidir')) {
    // Los que no mueven crudo (identificar el daño) ya son una tarjeta o la franja: no se repiten.
    const propuestos = enCampos(e.planes).filter(p => !p.estado && p.bbl > 0)
    const enTarjeta = (p: PlanAccion) => tareas.find(t => t.campoId === p.campoId && (t.donde?.equipo === p.equipo || t.preguntas?.some(q => q.equipo === p.equipo)))
    const enBloqueo = (p: PlanAccion) => bloqueos.find(b => b.campoId === p.campoId && b.equipos.includes(p.equipo))
    const linea = (p: PlanAccion) => `Plan simulado: ${minus(p.titulo)}${p.bbl > 0 ? ` (${n0(p.bbl)} bbl)` : ''}`
    const sueltos: PlanAccion[] = []
    for (const p of propuestos) {
      const t = enTarjeta(p), b = enBloqueo(p)
      if (t) t.planes = [...(t.planes ?? []), linea(p)]
      else if (b) b.planes = [...(b.planes ?? []), linea(p)]
      else sueltos.push(p)
    }
    for (const c of e.campos) {
      const ps = sueltos.filter(p => p.campoId === c)
      if (!ps.length) continue
      const bbl = ps.reduce((a, p) => a + p.bbl, 0)
      tareas.push({
        id: `planes:${c}`, tipo: 'planes', campoId: c, capacidad: 'planes:decidir', pide: true, grupo: 'demas',
        titulo: ps.length === 1 ? `Decidir el plan de ${ps[0]!.equipo}` : `Decidir ${ps.length} planes de acción`,
        donde: { equipo: ps[0]!.equipo, ...(marca(c, ps[0]!.equipo) ? { marca: marca(c, ps[0]!.equipo) } : {}), texto: minus(ps[0]!.titulo) },
        porque: [`Simulado: `, { b: `${n0(bbl)} bbl` }, ' que se pueden mover si se ejecutan.'],
        ver: { texto: 'Ver los planes', destino: { a: 'planes' } },
      })
    }
  }

  /* — lo hecho hoy — */
  const hechas = hechasHoy(e, filas, hoyDia)

  const enOrden = ordenar(tareas)
  const insignia = enOrden.filter(t => t.pide).length
  const vacio = !enOrden.some(t => t.pide) && !bloqueos.length ? `Nada pendiente. ${e.campos.length <= 1 ? 'El campo está normal.' : 'Sus campos están normales.'}` : undefined
  const unCampo = e.campos.length === 1 ? e.campos[0] : undefined
  return {
    rol, campos: e.campos,
    inicio: inicioDe(e, enOrden, filas, hoyDia, bloqueos),
    bloqueos, tareas: enOrden, insignia, hechas,
    ...(vacio ? { vacio } : {}),
    entregarTurno: rol === 'sup',
    ...(unCampo && e.tuberias[unCampo] ? { campo: campoAhora(unCampo, e.tuberias[unCampo]!, e.aguas[unCampo]) } : {}),
    ...(rol === 'sup' || rol === 'oper' ? { whatsapp: whatsappDelTurno(e) } : {}),
    ...(rol === 'sup' && e.diferidoTurnoBbl !== undefined ? { turno: { horas: TURNO_H, diferidoBbl: e.diferidoTurnoBbl } } : {}),
  }
}

const PASO_EN_PALABRAS: Record<PasoAnh, string> = {
  responsable: 'quién', choke: 'dónde se trabó', impacto: 'qué pasó', planeacion: 'si era planeada', n1: 'la causa', n2: 'el detalle',
}

/* ─────────────────────────────── la cifra y su frase ─────────────────────────────── */

/** La cifra y la frase del inicio de cada rol (X4 §3.4), con lo que el motor ya sabe. */
function inicioDe(e: EntradaHoy, tareas: readonly TareaHoy[], filas: readonly ParadaAnh[], hoyDia: string, bloqueos: readonly BloqueoHoy[]): InicioHoy {
  const rol = e.rol.id
  const nombreCampo = e.campos.length === 1 ? campoPorId(e.campos[0]!).nombre : undefined
  const pide = tareas.filter(t => t.pide)
  if (rol === 'sup') {
    const ahora = e.riesgo.filter(r => r.estado === 'perdiendo' && e.campos.includes(r.campoId)).reduce((a, r) => a + r.bblDia, 0)
    const deHoy = filas.filter(f => f.diaOperacional === hoyDia)
    const faltan = new Set(deHoy.filter(f => f.estado !== 'confirmada').map(f => f.eventoId)).size
    const explica: Frase = faltan
      ? ['Le faltan ', { b: plural(faltan, 'parada por confirmar', 'paradas por confirmar') }, `: el reporte sale mañana antes de las ${HORA_REPORTE}.`]
      : [deHoy.length ? 'Las paradas de hoy ya están confirmadas para el reporte.' : 'Hoy no ha parado ningún pozo: no hay nada que confirmar.']
    return {
      frase: `Se dejan de producir ${n0(ahora)} bbl/d. ${explica.map(x => (typeof x === 'string' ? x : x.b)).join('')}`,
      previo: 'Ahora mismo', cifra: n0(ahora), unidad: 'barriles por día',
      remate: `se dejan de producir${nombreCampo ? ` en ${nombreCampo}` : ' en sus campos'}.`, explica,
    }
  }
  if (rol === 'oper') {
    const qs = pide.flatMap(t => t.preguntas ?? [])
    if (!qs.length) return { frase: 'No tiene preguntas por contestar.', cifra: '0', unidad: 'preguntas' }
    const q = qs[0]!
    const parado = bloqueos.some(b => b.campoId === q.campoId && b.equipos.includes(q.equipo))
    const empiece = `Empiece por ${q.equipo}${parado ? `: está ${q.sobre === 'bomba' ? 'parada' : 'parado'} y no se puede arrancar` : ''}.`
    return { frase: `Tiene ${plural(qs.length, 'pregunta', 'preguntas')}. ${empiece}`, cifra: `1 de ${qs.length}`, unidad: qs.length === 1 ? 'pregunta' : 'preguntas', remate: empiece }
  }
  if (rol === 'jefe' && e.relojes?.totalH && e.relojes.esperaH !== undefined) {
    const total = e.relojes.totalH / 24, espera = e.relojes.esperaH / 24
    const vigia = e.vigia && e.vigia.vigiladas > 0 ? ` El vigía anunció ${e.vigia.anunciadas} de ${e.vigia.vigiladas} fallas.` : ''
    return {
      frase: `De ${uno(total)} días que dura una falla, ${uno(espera)} son espera.${vigia}`,
      previo: 'De lo que dura una falla', cifra: `${uno(espera)} de ${uno(total)}`, unidad: 'días son espera',
      remate: 'el repuesto, los permisos o la cuadrilla: no la reparación.', explica: vigia ? [vigia.trim()] : undefined,
    }
  }
  const primero = pide[0]
  if (!primero) return { frase: 'Nada pendiente.', cifra: '0', unidad: 'cosas por hacer' }
  const que = primero.tipo === 'contestar' && rol === 'tec' ? `${primero.donde?.equipo ?? ''}: diga qué encontró`
    : primero.tipo === 'orden' && rol === 'tec' ? `${primero.donde?.equipo ?? ''}: su orden` : minus(primero.titulo)
  return {
    frase: `Le ${pide.length === 1 ? 'toca 1 cosa' : `tocan ${pide.length} cosas`} hoy. Primero ${que}.`,
    cifra: String(pide.length), unidad: pide.length === 1 ? 'cosa le toca hoy' : 'cosas le tocan hoy', remate: `Primero ${que}.`,
  }
}

/* ─────────────────────────────── lo hecho hoy ─────────────────────────────── */

/** Lo que la persona dijo hoy: las confirmaciones (por lote o por parada), las
 *  respuestas del árbol y las del libro. Lo deshecho (retirado) ya no rige y no sale. */
function hechasHoy(e: EntradaHoy, filas: readonly ParadaAnh[], hoyDia: string): HechaHoy[] {
  const yo = e.persona?.id
  if (!yo) return []
  const out: HechaHoy[] = []
  const confirmadas = new Map<string, { filas: ParadaAnh[]; hora: string; raices: Set<string> }>()
  for (const f of filas) {
    const pasos = PASOS.map(x => f.clasificacion[x]).filter(d => !!d && d.procedencia === 'confirmado' && d.porId === yo && !!d.hora && diaCo(ms(d.hora)) === hoyDia)
    if (!pasos.length) continue
    const k = pasos[0]!.lote ?? `${f.campoId}|${f.raiz}`
    const g = confirmadas.get(k) ?? { filas: [], hora: pasos[0]!.hora!, raices: new Set<string>() }
    g.filas.push(f); g.raices.add(f.raiz !== f.eventoId ? f.causa.equipo : f.pozo)
    confirmadas.set(k, g)
  }
  for (const [k, g] of confirmadas) {
    const n = new Set(g.filas.map(f => f.eventoId)).size
    const de = g.raices.size === 1 ? ` de ${[...g.raices][0]}` : ''
    out.push({ id: `hecha:confirmar:${k}`, titulo: n === 1 ? `Confirmó la parada${de}` : `Confirmó ${n} paradas${de}`,
      detalle: n === 1 ? `la parada${de}` : `las ${n} paradas${de}`, hora: g.hora })
  }
  const respondidas = new Map<string, HechaHoy>()
  for (const f of filas) for (const r of f.clasificacion.respuestas ?? []) {
    if (r.porId !== yo || diaCo(ms(r.hora)) !== hoyDia) continue
    const k = `${f.campoId}|${f.raiz}|${r.pregunta}|${r.n ?? r.hora}`
    if (!respondidas.has(k)) respondidas.set(k, { id: `hecha:anh:${k}`, titulo: `Contestó ${f.raiz !== f.eventoId ? f.causa.equipo : f.pozo}`, detalle: `«${r.opcion}»`, hora: r.hora })
  }
  out.push(...respondidas.values())
  for (const p of e.preguntas) {
    const r = p.causa.declarado
    if (!r || r.porId !== yo || diaCo(ms(r.hora)) !== hoyDia || !e.campos.includes(p.campoId)) continue
    out.push({ id: `hecha:libro:${p.id}`, titulo: `Contestó ${p.equipo}`, detalle: `«${r.texto}»`, hora: r.hora })
  }
  return out.sort((a, b) => ms(b.hora) - ms(a.hora) || a.id.localeCompare(b.id))
}

/* ─────────────────────────────── al lado ─────────────────────────────── */

/** «Su campo, ahora»: dónde se trabó lo que se deja de producir, qué limita y el agua. */
function campoAhora(campoId: string, t: TuberiaCampo, a: TuberiaAgua | undefined): CampoAhoraHoy {
  const porTramo = new Map<string, number>()
  for (const p of t.perdiendoAhora) if (p.tramo) porTramo.set(p.tramo, (porTramo.get(p.tramo) ?? 0) + p.bpd)
  const peor = [...porTramo.entries()].sort((x, y) => y[1] - x[1])[0]
  const tramos = (['pozo', 'planta', 'exportacion'] as const).map(c => ({
    choke: c, rotulo: ROTULO_CHOKE[c], limita: t.tramos.some(x => x.tramo === c && x.limita), trabado: peor?.[0] === c,
  }))
  const frases: Frase[] = []
  const limita = t.tramos.find(x => x.limita)
  const nombreLimita = limita ? (limita.tramo === 'pozo' ? 'los pozos' : limita.tramo === 'planta' ? 'la planta' : 'afuera') : undefined
  if (peor) frases.push([`${DONDE_CHOKE[peor[0] as ChokeAnh].replace(/^en /, 'En ')} no pasan `, { b: `${n0(peor[1])} bbl/d` }, nombreLimita ? `; ${limita!.tramo === 'pozo' ? 'limitan' : 'limita'} ${nombreLimita}.` : '.'])
  else if (nombreLimita) frases.push([`Nada se deja de producir ahora; ${limita!.tramo === 'pozo' ? 'limitan' : 'limita'} ${nombreLimita}.`])
  const tanque = a?.tramos.flatMap(x => x.tanques ?? []).find(x => x.nivelPct !== undefined)
  if (tanque && a) {
    const s = a.siParaOtra
    const sube = s ? s.entraBpd > s.cabenBpd : undefined
    frases.push([`Tanque de agua `, { b: `${uno(tanque.nivelPct!).replace(/,0$/, '')} %` },
      sube === undefined ? '.' : sube ? ': sube; las bombas no alcanzan a tomar lo que entra.' : `: no sube, ${lista(s!.enMarcha)} toman lo que entra.`])
  }
  return { campoId, tramos, frases }
}

/** «El turno en WhatsApp»: los hilos de las últimas 12 h, uno por parada u orden
 *  (el mismo armado de Turno: cada paso con su hora y, al final, si respondieron). */
function whatsappDelTurno(e: EntradaHoy): WhatsappHoy {
  const desde = e.ahora - TURNO_H * H
  const enviados = e.mensajes.filter(m => e.campos.includes(m.campoId) && ms(m.hora) >= desde && !m.noEnviado)
  const PASO: Record<string, string> = { parada: 'parado', cierre: 'pozos cerrándose', causa: 'pregunta', parte: 'aviso del vigía', orden: 'orden liberada en SAP', recordatorio: 'recordatorio', escalamiento: 'escalado' }
  const RANGO_PASO: Record<string, number> = { parada: 0, causa: 1, recordatorio: 2, escalamiento: 3, cierre: 4, parte: 5, orden: 6 }
  const hilos = new Map<string, { equipo: string; evento?: string; ultima: number; pasos: Array<{ t: number; r: number; que: string }> }>()
  for (const m of enviados) {
    const k = `${m.campoId}|${m.evento ?? m.orden ?? `${m.regla}|${m.equipo}`}`
    const h = hilos.get(k) ?? { equipo: m.equipo, ...(m.evento ? { evento: m.evento } : {}), ultima: 0, pasos: [] }
    const clave = m.insistencia ?? m.regla
    const t = ms(m.hora)
    if (!h.pasos.some(x => x.t === t && x.que === PASO[clave])) h.pasos.push({ t, r: RANGO_PASO[clave] ?? 9, que: PASO[clave] ?? clave })
    h.ultima = Math.max(h.ultima, t)
    hilos.set(k, h)
  }
  return {
    mensajes: enviados.length,
    hilos: [...hilos.values()].sort((a, b) => b.ultima - a.ultima).map(h => {
      const p = h.evento ? e.preguntas.find(x => x.id === h.evento) : undefined
      const estado: Frase | undefined = !p ? undefined : p.causa.declarado ? [`respondió ${p.causa.declarado.por.split(' · ')[0]}`] : [{ b: 'sin respuesta' }]
      return { equipo: h.equipo, pasos: h.pasos.sort((a, b) => a.t - b.t || a.r - b.r).map(x => `${horaCo(x.t)} ${x.que}`).join(' → '), ...(estado ? { estado } : {}) }
    }),
  }
}
