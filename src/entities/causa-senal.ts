/** La causa de cada parada, deducida de las señales. Nunca de un formulario.
 *
 *  Reglas, en este orden, para el evento de un pozo:
 *   1. Un SERVICIO del campo cayó y el pozo cerró en su CASCADA: el primer
 *      cierre a lo más 15 min antes o después de la caída, y cada uno de los
 *      siguientes a lo más 15 min del anterior. Lo que cierra horas después,
 *      con el servicio todavía caído, no es su cascada: tiene otra causa.
 *   2. Una BOMBA DE LA LÍNEA estaba parada: la multifásica que mueve ese pozo
 *      (le corta el paso directo), o la de reinyección con el tanque alto (el
 *      pozo paró por nivel muy alto, por orden o se le bajó la frecuencia). La
 *      bomba que paró ANTES de que cayera el servicio manda sobre él: el
 *      servicio no explica lo que ya venía de la bomba.
 *   3. Estaba en el PROGRAMA de paradas aprobado (configuración).
 *   4. El CÓDIGO del controlador dice qué falló en el levantamiento.
 *   5. Un operario lo DECLARÓ, porque la señal no alcanzaba.
 *   6. Si nada aplica: SIN IDENTIFICAR, y se le pregunta al operario.
 *
 *  Para una parada de bomba, el equipo siempre se sabe (es la bomba). Lo que
 *  se busca es la PARTE, en este orden: el programa; la primera alarma del
 *  PLC, si es un disparo de ESA máquina que protege una parte; la firma del
 *  caudal (perdió caudal sin disparar); un servicio que cayó a ±15 min de la
 *  parada; la firma de las señales al parar; la respuesta del operario.
 *
 *  Contrato: el backend da los eventos y las señales; esta deducción es del
 *  producto y el backend tiene que dar el mismo resultado (CONTRATO.md).
 */
import { serviciosDeCampo, eventosDeCampo, pozoDe, CODIGO, type EventoPozo, type Respuesta, type EventoServicio } from './pozos'
import { paradasDeCampo, perfilBomba, type EventoBomba, type PerfilBomba } from './bombas'
import type { Config } from './configuracion'
import { partesDe, type ParteId } from './partes'
import { saludDePartes } from './salud'
import { AHORA } from './reloj'
import { formatoFecha } from '@/shared/lib/fecha'

export type TipoCausa =
  | 'reinyeccion' | 'transporte' | 'electrosumergible' | 'levantamiento'
  | 'energia' | 'aire' | 'compresion' | 'evacuacion' | 'proceso' | 'tratamiento'
  | 'programada' | 'declarada' | 'pendiente'

export const TIPO_CAUSA: Record<TipoCausa, string> = {
  // P-09 (K1): una familia por equipo, la de campo (`FAMILIA` de planta-viva.ts): «bomba de agua».
  reinyeccion: 'Bomba de agua',
  transporte: 'Bomba multifásica',
  electrosumergible: 'Electrosumergible',
  levantamiento: 'Bombeo mecánico',
  energia: 'Energía eléctrica',
  aire: 'Aire de instrumentos',
  compresion: 'Compresión de gas',
  evacuacion: 'Evacuación del crudo',
  proceso: 'Separación',
  tratamiento: 'Tratamiento de crudo',
  programada: 'Parada programada',
  declarada: 'Declarada por el operario',
  pendiente: 'Sin identificar',
}

/** Los equipos de alto impacto: el foco del producto. */
export const ALTO_IMPACTO: TipoCausa[] = ['reinyeccion', 'electrosumergible']

export type ComoSeIdentifico = 'senal' | 'firma' | 'programa' | 'declarado' | 'ninguno'

export const COMO: Record<ComoSeIdentifico, string> = {
  senal: 'por señal',
  firma: 'por la firma de las señales',
  programa: 'por el programa aprobado',
  declarado: 'declarado por el operario',
  ninguno: 'sin identificar',
}

export interface Causa {
  tipo: TipoCausa
  /** A quién se le cargan los barriles. */
  equipo: string
  parte?: ParteId
  como: ComoSeIdentifico
  /** Tags y hechos que la sostienen: la cadena de custodia de la causa. */
  evidencia: string[]
  /** Con `como: 'ninguno'`: por qué ninguna señal alcanzó. Va también como último
   *  renglón de `evidencia`, que es la cadena de custodia y no cambia; la pantalla
   *  lo lee de aquí y no por su lugar en la lista. */
  porQueNo?: string
  /** Evento que la produjo (parada de bomba o de servicio). */
  evento?: string
  texto: string
  declarado?: Respuesta
}

/** Quien respondió, dicho por su rol («el operador de campo») y nunca por su
 *  nombre: `Respuesta.por` es «Nombre · rol» (lo pone el servidor). Así lo dice
 *  todo lo que sale de TRIM: la ANH (`desc_evid`), el papel y el PDF (D2; S1 R-D). */
export function rolDeQuien(por: string): string {
  const i = por.lastIndexOf(' · ')
  if (i < 0) return 'una persona del campo'
  const rol = por.slice(i + 3).trim()
  // «la ingeniera de producción», «la planeadora»; «el operador de campo», «el jefe».
  return `${/^\p{L}+a(?:\s|$)/u.test(rol) ? 'la' : 'el'} ${rol}`
}

/** ¿El texto de la causa es lo que escribió una persona con sus palabras (la
 *  respuesta de quien declaró, tal cual)? Ese texto se queda en TRIM: no va a la
 *  ANH ni a ningún informe o exportación (D2). */
export const textoDePersona = (c: Pick<Causa, 'texto' | 'declarado'>): boolean => !!c.declarado && c.texto === c.declarado.texto

export interface Contexto {
  config: Config
  /** Respuestas de operarios a paradas sin identificar, por id de evento. */
  respuestas: Record<string, Respuesta>
}

const ms = (s: string) => new Date(s).getTime()
const TOLERANCIA_MS = 15 * 60_000
/* Un solo formateador para todo el módulo: armar uno por llamada costaba la
   mitad del tiempo de cada pantalla (la evidencia lleva una hora por evento). */
const FMT_HORA = formatoFecha({ timeZone: 'America/Bogota', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
const hora = (s: string) => FMT_HORA.format(new Date(s))

const SERVICIO_A_TIPO: Record<EventoServicio['tipo'], TipoCausa> = {
  aire: 'aire', energia: 'energia', compresion: 'compresion', evacuacion: 'evacuacion', proceso: 'proceso', tratamiento: 'tratamiento',
}

/** De varios servicios candidatos, el que cayó primero; si cayeron a la vez,
 *  el de id menor (orden de código del texto, el mismo en cualquier lenguaje).
 *  Así el resultado no depende del orden en que lleguen los eventos. */
function elPrimero(xs: readonly EventoServicio[]): EventoServicio | undefined {
  let p: EventoServicio | undefined
  for (const s of xs) if (!p || ms(s.inicio) < ms(p.inicio) || (ms(s.inicio) === ms(p.inicio) && s.id < p.id)) p = s
  return p
}

/** El servicio que cayó a ±15 min de la parada de una bomba: una bomba que
 *  para por un servicio para cuando el servicio cae, no horas después. Con
 *  dos, el que cayó primero. */
const servicioAlParar = (campoId: string, t: number): EventoServicio | undefined =>
  elPrimero(serviciosDeCampo(campoId).filter(s => Math.abs(ms(s.inicio) - t) <= TOLERANCIA_MS))

/* La cascada de cada servicio: los eventos de pozo que cerraron uno tras
   otro desde su caída. Depende solo de los eventos del PLC: una vez. Un
   servicio todavía caído (`fin: null`) llega hasta ahora. */
const CASCADA = new Map<string, Set<string>>()
function cascadaDe(s: EventoServicio): Set<string> {
  const ya = CASCADA.get(s.id)
  if (ya) return ya
  const a = ms(s.inicio), b = s.fin ? ms(s.fin) : AHORA.getTime()
  const enVentana = eventosDeCampo(s.campoId)
    .filter(e => ms(e.inicio) >= a - TOLERANCIA_MS && ms(e.inicio) <= b)
    .sort((x, y) => ms(x.inicio) - ms(y.inicio))
  const ids = new Set<string>()
  let ultimo = a
  for (const e of enVentana) {
    const t = ms(e.inicio)
    if (t > ultimo + TOLERANCIA_MS) break
    ids.add(e.id)
    ultimo = Math.max(ultimo, t)
  }
  CASCADA.set(s.id, ids)
  return ids
}

/** El servicio en cuya cascada cerró el pozo. Si cerró en la de dos, el que
 *  cayó primero. */
const servicioDeCascada = (ev: EventoPozo): EventoServicio | undefined =>
  elPrimero(serviciosDeCampo(ev.campoId).filter(s => cascadaDe(s).has(ev.id)))

function enPrograma(ctx: Contexto, campoId: string, equipo: string, t: number) {
  return ctx.config.programa.find(p => p.campoId === campoId && p.equipo === equipo && ms(p.desde) <= t && t <= ms(p.hasta))
}

const respuestaDe = (ctx: Contexto, id: string, propia?: Respuesta) => propia ?? ctx.respuestas[id]

/** La parte que protege un disparo de ESA máquina, si es de su catálogo. Un
 *  tag de otra bomba o que la máquina no declara no identifica nada. */
function parteDeAlarma(perfil: PerfilBomba | undefined, tag: string): ParteId | undefined {
  if (!perfil || !Object.hasOwn(perfil.primerasAlarmas, tag)) return undefined
  const parte = perfil.primerasAlarmas[tag]
  return partesDe(perfil.subtipo).some(x => x.id === parte) ? parte : undefined
}

/* La firma de una parada sin primera alarma se decide UNA vez, al parar, y
   se conserva: no se pierde cuando la parada se cierra ni cuando la lectura
   vuelve a banda. En producción la guarda el backend con el evento (`firma`);
   aquí, si no viene, se decide con la primera lectura que se ve de la parada
   abierta y se recuerda por id. Una parada que llega ya cerrada y sin firma
   guardada no se reconstruye con las lecturas de hoy. */
const FIRMAS = new Map<string, EventoBomba['firma'] | null>()
function firmaAlParar(ev: EventoBomba, perfil: PerfilBomba): EventoBomba['firma'] {
  if (ev.firma) return ev.firma
  if (FIRMAS.has(ev.id)) return FIRMAS.get(ev.id) ?? undefined
  if (ev.fin) return undefined
  const sospechosa = saludDePartes(perfil).find(s => s.estado === 'fuera')
  const v = sospechosa?.fuera[0]?.senal
  const f = sospechosa ? { parte: sospechosa.parte.id, tag: v?.tag,
    texto: v ? `${v.tag} · ${v.plantilla.nombre.toLowerCase()} pasó su límite antes de parar` : 'Un instrumento de la parte reporta alarma' } : null
  FIRMAS.set(ev.id, f)
  return f ?? undefined
}

/* La causa de una parada de bomba se pide por cada pozo que cerró, y la de
   cada evento de pozo por cada libro: se calcula una vez por contexto
   (configuración + respuestas). */
const MEMO = new WeakMap<Contexto, Map<string, Causa>>()
const MEMO_POZO = new WeakMap<Contexto, Map<string, Causa>>()
function memo(m: WeakMap<Contexto, Map<string, Causa>>, ctx: Contexto, id: string, f: () => Causa): Causa {
  let x = m.get(ctx)
  if (!x) m.set(ctx, x = new Map())
  const ya = x.get(id)
  if (ya) return ya
  const c = f()
  x.set(id, c)
  return c
}

/** La causa de una parada de bomba de la línea. */
export const causaDeParada = (ev: EventoBomba, ctx: Contexto): Causa => memo(MEMO, ctx, ev.id, () => deducirParada(ev, ctx))

function deducirParada(ev: EventoBomba, ctx: Contexto): Causa {
  const perfil = perfilBomba(ev.equipo, ev.campoId)
  const tipo: TipoCausa = perfil?.subtipo === 'multifasica' ? 'transporte' : 'reinyeccion'
  const t = ms(ev.inicio)
  const base = [`${ev.senal} · ${hora(ev.inicio)}`]
  const pr = enPrograma(ctx, ev.campoId, ev.equipo, t)
  if (pr) return { tipo: 'programada', equipo: ev.equipo, como: 'programa', evento: ev.id,
    evidencia: [`Programa ${pr.id}: ${pr.motivo}`, ...base], texto: pr.motivo }
  // La primera alarma identifica solo si es un disparo de esta máquina que
  // protege una parte suya. Si no, se dice y se sigue buscando.
  const alarma = ev.primeraAlarma
  const parteAlarma = alarma ? parteDeAlarma(perfil, alarma.tag) : undefined
  if (alarma && parteAlarma) return { tipo, equipo: ev.equipo, parte: parteAlarma, como: 'senal', evento: ev.id,
    evidencia: [`Primera alarma ${alarma.tag} · ${alarma.texto}`, ...base],
    texto: `Primera alarma: ${alarma.texto}` }
  const conAlarma = alarma ? [...base, `Primera alarma ${alarma.tag} · ${alarma.texto}: no es un disparo de una parte de esta máquina`] : base
  // Perdió caudal sin disparar: ningún servicio la paró, siguió en marcha.
  if (ev.perdida < 1 && perfil) {
    const parte: ParteId = perfil.subtipo === 'multifasica' ? 'tornillos' : 'hidraulica'
    return { tipo, equipo: ev.equipo, parte, como: 'firma', evento: ev.id,
      evidencia: [`Perdió el ${Math.round(ev.perdida * 100)} % del caudal sin disparar: ${perfil.subtipo === 'multifasica' ? 'la velocidad subió a caudal constante' : 'el caudal bajó con la bomba en marcha'}`, ...base],
      texto: perfil.subtipo === 'multifasica' ? 'Desgaste de los tornillos: bajó el caudal con la bomba en marcha' : 'Desgaste interno: bajó el caudal con la bomba en marcha' }
  }
  const sv = servicioAlParar(ev.campoId, t)
  if (sv) return { tipo: SERVICIO_A_TIPO[sv.tipo], equipo: sv.equipo, como: 'senal', evento: sv.id,
    evidencia: [`${sv.tag} · ${sv.texto}`, ...base], texto: `Paró porque ${sv.texto}` }
  const firma = perfil ? firmaAlParar(ev, perfil) : undefined
  if (firma) {
    const nombre = perfil && partesDe(perfil.subtipo).find(x => x.id === firma.parte)?.nombre
    return { tipo, equipo: ev.equipo, parte: firma.parte, como: 'firma', evento: ev.id,
      evidencia: [firma.texto, ...conAlarma],
      texto: `${nombre ?? firma.parte}: estaba fuera de límite al parar` }
  }
  const r = respuestaDe(ctx, ev.id)
  if (r) return { tipo, equipo: ev.equipo, parte: r.parte, como: 'declarado', evento: ev.id, declarado: r,
    evidencia: [...conAlarma, `Declarado por ${r.por} · ${hora(r.hora)}`], texto: r.texto }
  const porQueNo = alarma ? 'Sin firma: el PLC no dice qué parte falló' : 'Sin primera alarma y sin firma: el PLC no dice qué parte falló'
  return { tipo, equipo: ev.equipo, como: 'ninguno', evento: ev.id, porQueNo,
    evidencia: [...conAlarma, porQueNo],
    texto: alarma ? 'Paró con una alarma que no señala una parte: hay que identificar qué se dañó' : 'Paró sin primera alarma: hay que identificar qué se dañó' }
}

/** La bomba de la línea que le corta el paso a un pozo en `t`, si alguna. Con
 *  dos paradas a la vez manda la multifásica que lo mueve (sin ella el pozo no
 *  fluye, haya o no tanque); entre dos del mismo papel, la que paró primero.
 *  No depende del orden en que lleguen las paradas. */
function bombaQueLeCorta(ev: EventoPozo, t: number): { bomba: EventoBomba; perfil: PerfilBomba } | undefined {
  const sirven: Array<{ bomba: EventoBomba; perfil: PerfilBomba }> = []
  for (const bomba of paradasDeCampo(ev.campoId)) {
    if (ms(bomba.inicio) > t || t > (bomba.fin ? ms(bomba.fin) : AHORA.getTime())) continue
    const perfil = perfilBomba(bomba.equipo, bomba.campoId)
    if (!perfil) continue
    const sirve = perfil.papel === 'transporte' ? !!perfil.pozos?.includes(ev.pozo)
      : perfil.papel === 'disposicion' && ['LSHH', 'CMD', 'HZ'].includes(ev.codigo)
    if (sirve) sirven.push({ bomba, perfil })
  }
  const rango = (x: { perfil: PerfilBomba }) => (x.perfil.papel === 'transporte' ? 0 : 1)
  return sirven.sort((a, b) => rango(a) - rango(b) || ms(a.bomba.inicio) - ms(b.bomba.inicio) || a.bomba.id.localeCompare(b.bomba.id))[0]
}

/** La causa de un evento del controlador de un pozo. */
export const causaDeEvento = (ev: EventoPozo, ctx: Contexto): Causa => memo(MEMO_POZO, ctx, ev.id, () => deducirEvento(ev, ctx))

function deducirEvento(ev: EventoPozo, ctx: Contexto): Causa {
  const p = pozoDe(ev.campoId, ev.pozo)
  const t = ms(ev.inicio)
  const base = [`${ev.senal} · ${hora(ev.inicio)}`]
  const sv = servicioDeCascada(ev)
  const lb = bombaQueLeCorta(ev, t)
  // 1. Un servicio caído, salvo que la bomba ya estuviera parada antes de que
  //    cayera: lo que viene de la bomba no lo explica el servicio.
  const bombaPrimero = !!lb && !!sv && ms(lb.bomba.inicio) < ms(sv.inicio) - TOLERANCIA_MS
  if (sv && !bombaPrimero) return { tipo: SERVICIO_A_TIPO[sv.tipo], equipo: sv.equipo, como: 'senal', evento: sv.id,
    evidencia: [`${sv.tag} · ${sv.texto}`, ...base], texto: `${sv.texto[0]!.toUpperCase()}${sv.texto.slice(1)}` }
  // 2. Una bomba de la línea parada.
  if (lb) {
    const { bomba, perfil } = lb
    const cb = causaDeParada(bomba, ctx)
    // La evidencia del pozo: el paro de la bomba, lo que identificó su causa
    // (el programa, la primera alarma, la firma o el servicio, que van
    // primero; la declaración, que va al final) y el cierre del pozo. Sin
    // nada que la identifique, el paro no se repite y el porqué va de último
    // renglón, como en toda causa sin identificar.
    const paro = `${bomba.senal} · ${hora(bomba.inicio)}`
    const queLaIdentifico = cb.como === 'ninguno' ? [] : cb.como === 'declarado' ? cb.evidencia.slice(-1) : cb.evidencia.slice(0, 1)
    const ev2 = [paro, ...queLaIdentifico.filter(x => x !== paro), ...base, ...(cb.porQueNo ? [cb.porQueNo] : [])]
    if (cb.tipo !== 'reinyeccion' && cb.tipo !== 'transporte') return { ...cb, evidencia: ev2 }
    return { tipo: cb.tipo, equipo: bomba.equipo, parte: cb.parte, como: cb.como, evento: bomba.id, declarado: cb.declarado,
      // Sin parte, el pozo dice por qué con las palabras de su bomba.
      ...(cb.porQueNo ? { porQueNo: cb.porQueNo } : {}),
      evidencia: ev2,
      texto: perfil.papel === 'transporte' ? 'La bomba multifásica que lo mueve estaba parada'
        : ev.codigo === 'HZ' ? 'Se le bajó la frecuencia: la bomba de agua no daba abasto'
          : 'Se cerró porque la bomba de agua estaba parada y el tanque de agua lleno' }
  }
  // 3. Programa de paradas.
  const pr = enPrograma(ctx, ev.campoId, ev.pozo, t)
  if (pr) return { tipo: 'programada', equipo: ev.pozo, como: 'programa', evento: ev.id,
    evidencia: [`Programa ${pr.id}: ${pr.motivo}`, ...base], texto: pr.motivo }
  // 4. El código del controlador.
  if (p?.levantamiento === 'electrosumergible') {
    const parte: ParteId | undefined = ({ GF: 'aislamiento', PH: 'aislamiento', OL: 'bomba', UL: 'admision', OT: 'motor' } as const)[ev.codigo as 'GF']
    if (parte) return { tipo: 'electrosumergible', equipo: ev.pozo, parte, como: 'senal', evento: ev.id,
      evidencia: base, texto: `El variador disparó por ${CODIGO[ev.codigo]}` }
  }
  if (p?.levantamiento === 'bombeo-mecanico' && (ev.codigo === 'OL' || ev.codigo === 'UL'))
    return { tipo: 'levantamiento', equipo: ev.pozo, como: 'senal', evento: ev.id,
      evidencia: base, texto: `El controlador de bombeo paró por ${CODIGO[ev.codigo]}` }
  if (ev.codigo === 'UV' && p)
    return { tipo: 'energia', equipo: p.alimentador, como: 'senal', evento: ev.id,
      evidencia: base, texto: 'Baja tensión en el alimentador del pozo' }
  // 5. Lo declaró un operario. Si dijo qué parte de la electrosumergible se
  //    dañó, es una falla de la electrosumergible (alto impacto, con su parte).
  const r = respuestaDe(ctx, ev.id, ev.respuesta)
  if (r && r.parte && p?.levantamiento === 'electrosumergible')
    return { tipo: 'electrosumergible', equipo: ev.pozo, parte: r.parte, como: 'declarado', evento: ev.id, declarado: r,
      evidencia: [...base, `Declarado por ${r.por} · ${hora(r.hora)}`], texto: r.texto }
  if (r) return { tipo: 'declarada', equipo: ev.pozo, como: 'declarado', evento: ev.id, declarado: r,
    evidencia: [...base, `Declarado por ${r.por} · ${hora(r.hora)}`], texto: r.texto }
  // 6. Nada lo explica.
  const porQueNo = 'Ningún servicio caído, ninguna bomba de la línea parada, fuera del programa y sin código de falla'
  return { tipo: 'pendiente', equipo: ev.pozo, como: 'ninguno', evento: ev.id, porQueNo,
    evidencia: [...base, porQueNo],
    texto: 'Ninguna señal explica por qué paró: hay que identificarlo' }
}

/** «Por identificar», con UNA definición para todas las pantallas (Mi
 *  trabajo, Turno, Identificar, Mantenimiento) y para el servidor:
 *  - `porIdentificar`: las paradas que todavía piden respuesta (`pide`),
 *    hayan arrancado o no;
 *  - `arrancaronSinIdentificar`: de esas, las que ya arrancaron sin respuesta
 *    (no conformidad). Una respuesta que llegó tarde ya no pide nada y no
 *    está aquí (sigue siendo no conforme: `arrancoSinIdentificar`). */
export interface PorIdentificar { porIdentificar: number; arrancaronSinIdentificar: number }
export function cuentaPorIdentificar(xs: ReadonlyArray<{ pide: boolean; arrancoSinIdentificar: boolean }>): PorIdentificar {
  const piden = xs.filter(x => x.pide)
  return { porIdentificar: piden.length, arrancaronSinIdentificar: piden.filter(x => x.arrancoSinIdentificar).length }
}

/** ¿La parada necesita que alguien identifique el daño? ¿Arrancó antes? */
export function estadoIdentificacion(c: Causa, fin: string | null): { pide: boolean; arrancoSinIdentificar: boolean } {
  const sinIdentificar = c.tipo === 'pendiente' || ((c.tipo === 'reinyeccion' || c.tipo === 'transporte') && !c.parte && c.como !== 'declarado')
  const respondidaTarde = !!c.declarado && !!fin && ms(c.declarado.hora) > ms(fin)
  return {
    pide: sinIdentificar,
    arrancoSinIdentificar: (sinIdentificar && !!fin) || respondidaTarde,
  }
}
