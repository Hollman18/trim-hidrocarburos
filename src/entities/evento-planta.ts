/** EL EVENTO DE PLANTA: EL APAGÓN (Fase 4 de docs/experiencia-v3/PROMPT-FACILIDADES-POR-FASES.md;
 *  investigación ~/TRIM-petroleras/investigacion/19, §2.3, §5.2 y §6.2).
 *
 *  TRIM no pone energía ni opera interruptores: ve el apagón en minutos y le dice a cada rol lo
 *  suyo. La entrada es la FOTO del momento que manda el gateway (`EstadoEnergia`): qué cargas
 *  pararon y cuándo (el marcha → paro de cada electrosumergible, bomba y compresor), si el relé
 *  del interruptor reportó el disparo y cuándo llegó el último dato del sitio.
 *
 *  Tres vías de detección, de la más precisa a la que queda cuando todo se apaga:
 *  - `rele`: el relé del interruptor reporta el disparo con su hora (IEC 61850 o DNP3).
 *  - `firma-cargas`: muchas cargas paran en el mismo minuto. No son fallas sueltas: es un
 *    evento de energía, y se dice como uno solo.
 *  - `silencio-gateway`: el sitio dejó de mandar datos (el `NDEATH` de Sparkplug, o el silencio
 *    pasado el plazo). Funciona aunque la planta esté a oscuras.
 *
 *  **Total o parcial** (19 §2.3): si caen todos los circuitos también paran los pozos y el tanque
 *  de agua no sube: el problema es el re-arranque. Si cae una parte (el circuito de las bombas de
 *  agua con los pozos produciendo), el tanque se llena y hay que cerrar pozos: es lo más peligroso
 *  de las primeras horas. La acción es distinta, y se distingue en el primer minuto.
 *
 *  **Relojes de consecuencia:** los minutos de aire de instrumentos que le quedan al recibidor y
 *  las horas hasta el alto-alto del tanque de agua.
 *
 *  Lo que esta foto NO hace: atribuir barriles. El diferido del corte lo carga el libro con la
 *  causa «energía» y la hora del relé, por la cascada del servicio caído (`causa-senal.ts`).
 *
 *  Contrato: `GET /api/vistas/planta/evento?campos=` (CONTRATO.md). */
import { CAMPO_PLANTA } from './planta'
import { pozosDe, type Pozo } from './pozos'
import { crudoAsignado, aguaDePrueba } from './libro'
import { EQUIPOS, equipoEnCampo } from './equipos'
import { campoPorId } from './campos'
import type { Config } from './configuracion'
import type { MarcaFase } from './arranque'
import { formatoFecha } from '@/shared/lib/fecha'

export type TipoApagon = 'total' | 'parcial'
export type Deteccion = 'rele' | 'firma-cargas' | 'silencio-gateway'
export type FamiliaCarga = 'pozo' | 'bomba-agua' | 'aire' | 'otro'

/** Una carga eléctrica del campo y su estado: `paroEn` es la hora del marcha → paro (ms), o null si
 *  sigue en marcha. `circuito`: el alimentador o el CCM del que cuelga. */
export interface Carga { equipo: string; familia: FamiliaCarga; circuito: string; paroEn: number | null }

/** La foto del momento que manda el gateway. */
export interface EstadoEnergia {
  campoId: string
  /** El momento de la foto (ms). */
  t: number
  cargas: Carga[]
  /** El disparo que reportó el relé, si lo reportó. */
  rele?: { tag: string; equipo: string; abrioEn: number; texto: string }
  /** El último dato que llegó del sitio (ms). */
  ultimoDato: number
  /** Un aviso de prueba (el administrador lo dispara para probar la cadena): se dice como prueba. */
  prueba?: boolean
}

export interface Reloj {
  que: 'aire' | 'tanque-agua'
  /** Lo que queda, en minutos; null: no corre (el tanque no sube) o no hay con qué contarlo. */
  minutos: number | null
  /** Cómo se dice: «Aire: 18 min», «Tanque de agua: 2,1 h», «Tanque de agua: no sube». */
  texto: string
  fuente: string
}

export interface EventoPlanta {
  /** `AP-<campo>-<inicio en ms>`. */
  id: string
  campoId: string
  tipo: TipoApagon
  inicio: Date
  deteccion: Deteccion
  rele?: EstadoEnergia['rele']
  /** Las cargas que pararon en el evento. */
  paradas: Carga[]
  /** Las que siguen en marcha. */
  enMarcha: number
  /** Los circuitos que se cayeron enteros. */
  circuitos: string[]
  relojes: Reloj[]
  /** Crudo que se deja de producir ahora, bbl/d: el de los pozos que pararon. */
  bblDiaEnJuego: number
  prueba: boolean
}

/** Cargas que paran dentro de este lapso son un mismo evento. */
export const VENTANA_FIRMA_MS = 60_000
/** Cuántas cargas tienen que parar juntas para que sea un evento de energía y no fallas sueltas. */
export const MIN_CARGAS = 3
/** Sin datos del sitio por más de esto, el silencio es un evento. */
export const SILENCIO_MS = 2 * 60_000

/** [SUPUESTO] Minutos de aire de instrumentos que da el recibidor con los compresores parados. La
 *  norma da 5 a 30 min (investigación 19 §2.2; 03 §2.9); el valor de cada planta sale de su
 *  recibidor y su consumo, y se firma. Los del demo no son de campo. */
export const AUTONOMIA_AIRE_MIN: Readonly<Record<string, { minutos: number; fuente: string }>> = {
  ceiba: { minutos: 11, fuente: 'La ficha de K-101: con la presión de cabezal de hoy, el recibidor da 11 min de autonomía (la norma pide de 5 a 30). Dato de demostración: el de la planta se mide y se firma' },
  morichal: { minutos: 22, fuente: '[SUPUESTO] Recibidor de K-101: 22 min. Dato de demostración' },
  guacamayo: { minutos: 15, fuente: '[SUPUESTO] Recibidor de K-101: 15 min. Dato de demostración' },
  palmar: { minutos: 12, fuente: '[SUPUESTO] Recibidor de K-101: 12 min. Dato de demostración' },
  zarza: { minutos: 20, fuente: '[SUPUESTO] Recibidor de K-101: 20 min. Dato de demostración' },
}

const MIN = 60_000
const n1 = (v: number) => v.toLocaleString('es-CO', { maximumFractionDigits: 1, minimumFractionDigits: 1 })

/** Las cargas eléctricas de un campo, del registro: los pozos que producen (cuelgan de su
 *  alimentador), las bombas de agua y el compresor de aire. Todas en marcha. */
export function cargasDe(campoId: string): Carga[] {
  const plant = CAMPO_PLANTA[campoId]
  const pozos = pozosDe(campoId).filter(p => p.pruebas.length)
    .map((p): Carga => ({ equipo: p.id, familia: 'pozo', circuito: p.alimentador, paroEn: null }))
  const bombas = (plant?.agua ?? []).filter(e => e.simbolo === 'bomba')
    .flatMap(e => (e.miembros?.length ? e.miembros.map(m => m.id) : e.equipo ? [e.equipo] : []))
    .map((id): Carga => ({ equipo: id, familia: 'bomba-agua', circuito: 'CCM de las bombas de agua', paroEn: null }))
  // El aire de instrumentos: el equipo de esa familia que el campo tiene (del registro, no un id fijo).
  const aire = Object.values(EQUIPOS).filter(e => e.familia === 'compresor-aire' && equipoEnCampo(e.id, campoId)?.instrumentado)
    .map((e): Carga => ({ equipo: e.id, familia: 'aire', circuito: 'CCM de servicios', paroEn: null }))
  return [...pozos, ...bombas, ...aire]
}

/** Las cargas que pararon en el mismo minuto que la primera de las recientes. */
function primeraFirma(cargas: Carga[], t: number): Carga[] {
  const paradas = cargas.filter(c => c.paroEn !== null && c.paroEn <= t).sort((a, b) => a.paroEn! - b.paroEn!)
  for (let i = 0; i < paradas.length; i++) {
    const grupo = paradas.filter(c => c.paroEn! >= paradas[i]!.paroEn! && c.paroEn! - paradas[i]!.paroEn! <= VENTANA_FIRMA_MS)
    if (grupo.length >= MIN_CARGAS) return grupo
  }
  return []
}

/** Los minutos de aire que le quedan al recibidor desde que pararon los compresores. */
function relojAire(e: EstadoEnergia, inicio: number): Reloj | undefined {
  if (!e.cargas.some(c => c.familia === 'aire' && c.paroEn !== null)) return undefined
  const a = AUTONOMIA_AIRE_MIN[e.campoId]
  if (!a) return { que: 'aire', minutos: null, texto: 'Aire: sin dato del recibidor', fuente: 'Sin autonomía del recibidor firmada' }
  const quedan = Math.max(0, Math.round(a.minutos - (e.t - inicio) / MIN))
  return { que: 'aire', minutos: quedan, texto: quedan > 0 ? `Aire: ${quedan} min` : 'Aire: agotado, las válvulas van a posición segura', fuente: a.fuente }
}

/** Las horas hasta el alto-alto del tanque de agua con las bombas paradas: el espacio libre sobre el
 *  nivel ÷ el agua que siguen mandando los pozos en marcha. Si los pozos también pararon, no sube. */
export function relojTanque(e: EstadoEnergia, config: Config): Reloj | undefined {
  if (!e.cargas.some(c => c.familia === 'bomba-agua' && c.paroEn !== null)) return undefined
  const tq = config.tanques.find(x => x.campoId === e.campoId)
  if (!tq) return { que: 'tanque-agua', minutos: null, texto: 'Tanque de agua: sin tanque firmado', fuente: 'La configuración no tiene el tanque de agua de este campo' }
  const enMarcha = new Set(e.cargas.filter(c => c.familia === 'pozo' && c.paroEn === null).map(c => c.equipo))
  const pozos: Pozo[] = pozosDe(e.campoId).filter(p => enMarcha.has(p.id))
  const entra = pozos.reduce((a, p) => a + aguaDePrueba(p, e.t), 0)
  if (entra <= 0) return { que: 'tanque-agua', minutos: null, texto: 'Tanque de agua: no sube, los pozos también pararon', fuente: 'Sin pozos en marcha no entra agua' }
  const nivel = equipoEnCampo(tq.bomba, e.campoId)?.dispositivos.find(d => d.tag === tq.tagNivel)?.valor
  if (typeof nivel !== 'number') return { que: 'tanque-agua', minutos: null, texto: 'Tanque de agua: sin lectura de nivel', fuente: `${tq.tagNivel} sin lectura` }
  const libre = Math.max(0, tq.capacidadBbl * (tq.altoAlto - nivel / 100))
  const horas = libre / (entra / 24)
  const minutos = Math.round(horas * 60)
  // Con menos de una hora se dice en minutos: «0,0 h» no se lee.
  const texto = libre <= 0 ? 'Tanque de agua: en el alto-alto' : horas < 1 ? `Tanque de agua: ${Math.max(1, minutos)} min` : `Tanque de agua: ${n1(horas)} h`
  return { que: 'tanque-agua', minutos, texto,
    fuente: `${tq.nombre}: ${Math.round(libre).toLocaleString('es-CO')} bbl libres hasta el alto-alto (${Math.round(tq.altoAlto * 100)} %, ${tq.tagNivel} al ${n1(nivel)} %) ÷ ${Math.round(entra).toLocaleString('es-CO')} bbl/d de agua de los pozos en marcha` }
}

/** El evento de planta de una foto, o null si la foto no muestra ninguno. */
export function eventoDePlanta(e: EstadoEnergia, config: Config): EventoPlanta | null {
  const firma = primeraFirma(e.cargas, e.t)
  const silencio = e.t - e.ultimoDato >= SILENCIO_MS
  const deteccion: Deteccion | undefined = e.rele ? 'rele' : firma.length ? 'firma-cargas' : silencio ? 'silencio-gateway' : undefined
  if (!deteccion) return null
  const inicio = e.rele?.abrioEn ?? (firma.length ? firma[0]!.paroEn! : e.ultimoDato)
  // Las que pararon con el evento: desde su inicio, dentro de la ventana (el relé no espera a nadie).
  const paradas = deteccion === 'silencio-gateway' ? [] : e.cargas.filter(c => c.paroEn !== null && c.paroEn >= inicio - VENTANA_FIRMA_MS && c.paroEn <= inicio + VENTANA_FIRMA_MS)
  const porCircuito = new Map<string, Carga[]>()
  for (const c of e.cargas) porCircuito.set(c.circuito, [...(porCircuito.get(c.circuito) ?? []), c])
  const caidos = [...porCircuito].filter(([, cs]) => cs.every(c => paradas.includes(c))).map(([k]) => k)
  // Sin datos no se sabe qué cayó: se trata como total (lo que más cuesta no avisar).
  const tipo: TipoApagon = deteccion === 'silencio-gateway' || caidos.length === porCircuito.size ? 'total' : 'parcial'
  const paradosPozo = new Set(paradas.filter(c => c.familia === 'pozo').map(c => c.equipo))
  const bblDiaEnJuego = (deteccion === 'silencio-gateway' ? pozosDe(e.campoId).filter(p => p.pruebas.length) : pozosDe(e.campoId).filter(p => paradosPozo.has(p.id)))
    .reduce((a, p) => a + crudoAsignado(p, inicio), 0)
  const relojes = [relojAire(e, inicio), relojTanque(e, config)].filter((r): r is Reloj => !!r)
  return {
    id: `AP-${e.campoId}-${inicio}`, campoId: e.campoId, tipo, inicio: new Date(inicio), deteccion,
    ...(e.rele ? { rele: e.rele } : {}),
    paradas, enMarcha: e.cargas.length - paradas.length, circuitos: caidos, relojes, bblDiaEnJuego, prueba: !!e.prueba,
  }
}

/* ─────────────────────────── el aviso de cada rol ─────────────────────────── */

/** Quién recibe lo de energía (D3, 4-nov-2026): el responsable de energía si el cliente lo tiene;
 *  si no, el jefe de mantenimiento. */
export const rolDeEnergia = (conResponsable: boolean): 'ener' | 'jefe' => (conResponsable ? 'ener' : 'jefe')

/** Los roles a los que se les avisa un evento de planta (§3 del prompt de fases). */
export const rolesAvisados = (conResponsable: boolean): readonly string[] => ['sup', 'oper', 'ger', rolDeEnergia(conResponsable)]

export interface AvisoPlanta {
  titulo: string
  cuerpo: string
  /** Solo al operador: una pregunta con dos botones. */
  pregunta?: { texto: string; opciones: readonly ['Sí', 'No'] }
}

const FMT_HM = formatoFecha({ timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hour12: false })
const FMT_HMS = formatoFecha({ timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
const hora = (d: Date, segundos = false) => (segundos ? FMT_HMS : FMT_HM).format(d)
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

/** Lo que paró, en palabras: «18 pozos, 3 bombas de agua y el compresor de aire». */
export function queParo(ev: EventoPlanta): string {
  const n = (f: FamiliaCarga) => ev.paradas.filter(c => c.familia === f).length
  const partes = [n('pozo') ? plural(n('pozo'), 'pozo', 'pozos') : '', n('bomba-agua') ? plural(n('bomba-agua'), 'bomba de agua', 'bombas de agua') : '',
    n('aire') ? 'el compresor de aire' : '', n('otro') ? plural(n('otro'), 'equipo más', 'equipos más') : ''].filter(Boolean)
  return partes.length < 2 ? partes.join('') : `${partes.slice(0, -1).join(', ')} y ${partes.at(-1)}`
}

/** El mismo evento dicho a cada rol (§3: «un mismo evento se dice distinto a cada rol»). */
export function avisoPlanta(ev: EventoPlanta, rol: string, conResponsable: boolean): AvisoPlanta | undefined {
  const campo = campoPorId(ev.campoId).nombre
  const p = ev.prueba ? 'Prueba · ' : ''
  const relojes = ev.relojes.length ? `${ev.relojes.map(r => r.texto).join('. ')}.` : ''
  const bbl = Math.round(ev.bblDiaEnJuego).toLocaleString('es-CO')
  const subestacion = ev.rele?.equipo ?? 'la subestación'
  if (rol === 'ger') {
    const que = ev.tipo === 'total' ? `Se fue la energía en ${campo}.` : `Se fue la energía en parte de ${campo}.`
    const cuanto = ev.bblDiaEnJuego >= 0.5 ? `${bbl} bbl/d en juego.` : ev.relojes.find(r => r.que === 'tanque-agua' && r.minutos !== null)
      ? `Todavía no se pierde crudo; ${ev.relojes.find(r => r.que === 'tanque-agua')!.texto.replace(/^Tanque de agua: /, 'el tanque de agua da ')} antes de que haya que cerrar pozos.` : 'Todavía no se pierde crudo.'
    return { titulo: `${p}${que}`, cuerpo: `${cuanto} ${rolDeEnergia(conResponsable) === 'ener' ? 'El responsable de energía' : 'Mantenimiento'} ya está avisado.` }
  }
  if (rol === 'sup') {
    const que = ev.deteccion === 'silencio-gateway' ? `Sin datos de ${campo} desde las ${hora(ev.inicio)}: puede ser un apagón.` : `${ev.tipo === 'total' ? 'Apagón' : 'Apagón parcial'} ${hora(ev.inicio)}.`
    return { titulo: `${p}${que}`, cuerpo: [relojes, ev.paradas.length ? `Paró: ${queParo(ev)}.` : ''].filter(Boolean).join(' ') }
  }
  if (rol === 'oper') return {
    titulo: `${p}Se fue la energía en ${campo}`, cuerpo: ev.relojes.find(r => r.que === 'aire')?.texto ?? '',
    pregunta: { texto: `¿Ve luz en ${subestacion === 'SE-2' ? 'la subestación 2' : /^CCM/.test(subestacion) ? `el ${subestacion}` : subestacion}?`, opciones: ['Sí', 'No'] as const },
  }
  if (rol === rolDeEnergia(conResponsable)) {
    const disparo = ev.rele ? `Disparo ${ev.rele.tag} ${hora(new Date(ev.rele.abrioEn), true)}.`
      : ev.deteccion === 'firma-cargas' ? `Pararon ${ev.paradas.length} cargas a la vez a las ${hora(ev.inicio, true)}; el relé no reportó disparo.`
        : `El sitio dejó de mandar datos a las ${hora(ev.inicio, true)}.`
    const circuitos = ev.circuitos.length && ev.tipo === 'parcial' ? ` Cayó: ${ev.circuitos.join(', ')}.` : ''
    return { titulo: `${p}${disparo}`, cuerpo: `${ev.paradas.length ? `Paró: ${queParo(ev)}.` : ''}${circuitos}`.trim() }
  }
  return undefined
}

/* ─────────────────────────── el aviso de prueba ─────────────────────────── */

/** La foto de un apagón de prueba que el administrador dispara para probar la cadena del aviso:
 *  - `total`: el relé de llegada (52-SE2) abre y para todo: pozos, bombas de agua y compresor.
 *  - `parcial`: se cae el circuito de las bombas de agua; los pozos y el compresor siguen. Con tres
 *    bombas o más no hace falta el relé: lo detecta la firma de las cargas que paran juntas; con
 *    menos, lo reporta el relé del alimentador del CCM.
 *  Las cargas paran escalonadas unos segundos, como en un disparo real. Nada de esto entra al libro. */
export function apagonDePrueba(campoId: string, tipo: TipoApagon, inicio: number, t: number): EstadoEnergia {
  const cargas = cargasDe(campoId).map((c, i): Carga => {
    const cae = tipo === 'total' || c.familia === 'bomba-agua'
    // Escalonadas, pero nunca después de la foto: una prueba recién abierta ya tiene todo parado.
    return { ...c, paroEn: cae ? Math.min(inicio + (i % 20) * 1000, t) : null }
  })
  const bombas = cargas.filter(c => c.familia === 'bomba-agua').length
  // La subestación del campo, del registro (el equipo de servicio «energía»); su interruptor de llegada lleva el
  // código ANSI 52 delante.
  const sub = Object.values(EQUIPOS).find(e => e.servicio === 'energia' && equipoEnCampo(e.id, campoId)?.instrumentado)?.id ?? 'la subestación'
  const rele = tipo === 'total' ? { tag: `52-${sub.replace(/-/g, '')}`, equipo: sub, abrioEn: inicio, texto: 'interruptor de llegada abierto por protección' }
    : bombas < MIN_CARGAS ? { tag: '52-CCM2', equipo: 'CCM de las bombas de agua', abrioEn: inicio, texto: 'alimentador del CCM de las bombas de agua abierto' } : undefined
  return { campoId, t, cargas, ultimoDato: t, prueba: true, ...(rele ? { rele } : {}) }
}

/* ─────────────────────────── el registro: pruebas y respuestas ─────────────────────────── */

/** Lo que dijo el operador desde el campo: si ve luz en la subestación. */
export interface RespuestaPlanta { por: string; rol: string; respuesta: 'Sí' | 'No'; hora: string }

/** Un aviso de prueba como lo guarda el servidor: quién lo disparó, cuándo, si ya terminó y lo que
 *  respondieron. Solo por inserción: terminar es otra marca, nada se borra. */
export interface RegistroEventoPlanta {
  id: string
  campoId: string
  tipo: TipoApagon
  /** ISO con zona. */
  inicio: string
  por: string
  prueba: true
  /** ISO con zona: cuándo se dio por terminada. */
  terminado?: string
  respuestas: RespuestaPlanta[]
  /** Fase 6: las fases del arranque que marcó el supervisor, para el cronómetro (`arranque.ts`). */
  fases?: MarcaFase[]
}

/** `GET /api/vistas/planta/evento?campos=` → los eventos de planta abiertos de esos campos, con lo que
 *  respondieron. Con el servidor, también los que detectó en vivo; en el demo, las pruebas. */
export type EventoPlantaVista = EventoPlanta & { respuestas: RespuestaPlanta[] }

export function vistaEventosPlanta(campos: readonly string[], registros: readonly RegistroEventoPlanta[], config: Config, t: number): EventoPlantaVista[] {
  return registros.filter(r => campos.includes(r.campoId) && !r.terminado).flatMap(r => {
    const ev = eventoDePlanta(apagonDePrueba(r.campoId, r.tipo, new Date(r.inicio).getTime(), t), config)
    return ev ? [{ ...ev, id: r.id, respuestas: r.respuestas }] : []
  })
}

export type Rechazo = { ok: false; estado: number; codigo: string; error: string }
export interface Quien { rol?: { id: string; nombre: string; puede: Record<string, boolean> }; persona?: { nombre: string }; campos: readonly string[] }

/** `POST /api/planta/eventos/prueba` `{ campoId, tipo }`: el administrador prueba la cadena del aviso
 *  (`conector:configurar`). Una prueba abierta por campo. */
export function aceptarPrueba(c: { campoId?: unknown; tipo?: unknown }, q: Quien, registros: readonly RegistroEventoPlanta[], hora: string): { ok: true; evento: RegistroEventoPlanta } | Rechazo {
  if (!q.rol?.puede['conector:configurar']) return { ok: false, estado: 403, codigo: 'sin-capacidad', error: 'Probar el aviso de apagón lo hace el administrador (conector:configurar).' }
  if (c.tipo !== 'total' && c.tipo !== 'parcial') return { ok: false, estado: 422, codigo: 'tipo-invalido', error: 'El apagón de prueba es «total» o «parcial».' }
  if (typeof c.campoId !== 'string' || !q.campos.includes(c.campoId)) return { ok: false, estado: 404, codigo: 'campo-ajeno', error: 'No tiene asignado ese campo.' }
  if (registros.some(r => r.campoId === c.campoId && !r.terminado)) return { ok: false, estado: 409, codigo: 'prueba-abierta', error: 'Ya hay una prueba abierta en ese campo: termínela antes de empezar otra.' }
  const inicio = new Date(hora).getTime()
  return { ok: true, evento: { id: `AP-${c.campoId}-${inicio}`, campoId: c.campoId, tipo: c.tipo, inicio: hora, por: `${q.persona?.nombre ?? 'sin nombre'} · ${q.rol.nombre}`, prueba: true, respuestas: [] } }
}

/** `POST /api/planta/eventos/:id/terminar`: el administrador cierra la prueba. */
export function aceptarTerminar(id: string, q: Quien, registros: readonly RegistroEventoPlanta[], hora: string): { ok: true; evento: RegistroEventoPlanta } | Rechazo {
  if (!q.rol?.puede['conector:configurar']) return { ok: false, estado: 403, codigo: 'sin-capacidad', error: 'Terminar la prueba lo hace el administrador.' }
  const r = registros.find(x => x.id === id)
  if (!r || !q.campos.includes(r.campoId)) return { ok: false, estado: 404, codigo: 'evento-desconocido', error: 'No hay ese evento.' }
  if (r.terminado) return { ok: false, estado: 409, codigo: 'ya-terminado', error: 'Esa prueba ya terminó.' }
  return { ok: true, evento: { ...r, terminado: hora } }
}

/** `POST /api/planta/eventos/:id/respuesta` `{ respuesta: 'Sí' | 'No' }`: el operador (o el supervisor)
 *  dice si ve luz (`causa:declarar`). Vale la última de cada persona. */
export function aceptarRespuestaPlanta(id: string, c: { respuesta?: unknown }, q: Quien, registros: readonly RegistroEventoPlanta[], hora: string): { ok: true; evento: RegistroEventoPlanta } | Rechazo {
  if (!q.rol?.puede['causa:declarar']) return { ok: false, estado: 403, codigo: 'sin-capacidad', error: 'Responde quien está en el campo (operador o supervisor).' }
  const r = registros.find(x => x.id === id)
  if (!r || !q.campos.includes(r.campoId) || r.terminado) return { ok: false, estado: 404, codigo: 'evento-desconocido', error: 'Ese evento ya no está abierto.' }
  if (c.respuesta !== 'Sí' && c.respuesta !== 'No') return { ok: false, estado: 422, codigo: 'respuesta-invalida', error: 'La respuesta es «Sí» o «No».' }
  const por = q.persona?.nombre ?? q.rol.nombre
  return { ok: true, evento: { ...r, respuestas: [...r.respuestas.filter(x => x.por !== por), { por, rol: q.rol.id, respuesta: c.respuesta, hora }] } }
}
