/** Lo que pasa si una bomba de la línea se para AHORA, lo que costó cada
 *  parada que ya tuvo, y qué se está perdiendo o está en riesgo en este
 *  momento.
 *
 *  El libro (`libro.ts`) dice lo que ya pasó. Esto mira adelante, con las
 *  mismas piezas y nada escrito a mano:
 *  - el NIVEL del tanque de agua, de su transmisor;
 *  - el CAUDAL que mueve la bomba, de su medidor, mientras trabaja;
 *  - el CRUDO y el AGUA de cada pozo, de su prueba, con el factor del mes;
 *  - el TANQUE (capacidad, alto-alto, aforo) y el RESPALDO, de la
 *    configuración firmada.
 *
 *  Contrato: `GET /api/vistas/bombas/prediccion?campo=&equipo=`,
 *  `GET /api/vistas/bombas/paradas?campo=&equipo=`, `GET /api/vistas/riesgo?campos=`
 *  y `GET /api/vistas/estado?campos=` (formas en shared/api/contrato.ts).
 */
import { conLectura } from './serie'
import { pozosDe, pruebaEn, estadoAhora, NIVEL_AHORA, servicioPorId, type Pozo } from './pozos'
import { equipoEnCampo, EQUIPOS } from './equipos'
import { perfilBomba, paradasDe, esBomba, paradaPorId, type PerfilBomba, type EventoBomba } from './bombas'
import { tanqueDe, respaldoDe, perfilDe, configEn, type TanqueAgua, type Config, type Version } from './configuracion'
import { toleranciaAsignacion, AFORO_TANQUE, raizSumaCuadrados, type Componente } from './metrologia'
import {
  faDe, crudoAsignado, aguaDePrueba, ordenOptimo, bandaDe, fiscalPromedio, tramosDeEvento, toleranciaDe,
  evitableDeEvento, historialDeEquipo, fiscalDeAyer, perdidaPorFrecuencia, type Tramo, type HistorialEquipo,
} from './libro'
import { causaDeParada, causaDeEvento, estadoIdentificacion, textoDePersona, rolDeQuien, ALTO_IMPACTO, type Causa, type Contexto, type TipoCausa } from './causa-senal'
import { senalesDe, proyectable, type Senal } from './vigia'
import { saludDePartes, motivoDeParte, textoHoras, HORIZONTE_H, type SaludParte, type EstadoParte } from './salud'
import { saludDeEsp } from './esp'
import type { ParteId } from './partes'
import type { Severidad, IdPeriodo } from './tipos'
import { AHORA, horasEntre, calendarioDe } from './reloj'
import { n3 } from '@/shared/lib/formato'
import { formatoFecha } from '@/shared/lib/fecha'

const H = 3_600_000
const ahora = AHORA.getTime()
const FMT_N0 = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const n0 = (v: number) => FMT_N0.format(v)
const FMT_HORA = formatoFecha({ timeZone: 'America/Bogota', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
const mediana = (xs: number[]) => {
  const o = [...xs].sort((a, b) => a - b), m = Math.floor(o.length / 2)
  return o.length % 2 ? o[m]! : (o[m - 1]! + o[m]!) / 2
}

/* ───────────────────────────── el agua ───────────────────────────── */

/** Agua que mueve la bomba cuando trabaja: la mediana de su medidor de
 *  caudal mientras está en marcha. Sin medidor, la capacidad nominal, y se
 *  dice. */
export function aguaQueMueve(p: PerfilBomba): { bpd: number; fuente: string; medido: boolean } {
  const tag = p.tags.caudal
  const serie = tag ? equipoEnCampo(p.equipo, p.campoId)?.dispositivos.find(d => d.tag === tag)?.serie : undefined
  // Los huecos del historiador no son caudal cero: no entran.
  const enMarcha = conLectura(serie).filter(v => v > 0)
  if (enMarcha.length) return { bpd: mediana(enMarcha), medido: true, fuente: `Mediana de ${tag} mientras la bomba trabaja` }
  return { bpd: p.capacidadBpd, medido: false, fuente: 'Sin medidor de caudal: se toma la capacidad nominal (es un techo)' }
}

/** Capacidad libre del respaldo: de la configuración firmada (la vigente para
 *  lo que pasa ahora; la que regía, para una parada vieja). */
const respaldoLibre = (p: PerfilBomba, config: Config) => respaldoDe(config, p.campoId, p.equipo)?.libreBpd ?? 0

/** El medidor de la bomba no es fiscal y su incertidumbre no está declarada:
 *  se acota con la banda del agua asignada de la Fig. 10.2, y se dice. La
 *  banda del agua no depende del °API y es la misma por encima y por debajo
 *  de 1.000 bpd (0,90–1,10): sin producción fiscal publicada no cambia, y la
 *  fuente lo dice en vez de suponer una fila. */
const toleranciaAgua = (campoId: string, origen: 'medidor' | 'pruebas' = 'medidor'): Componente => {
  const prom = fiscalPromedio(campoId)
  const c = toleranciaAsignacion('agua', Number.NaN, prom ?? 0)
  const fuente = prom === undefined ? `${c.fuente.split(' · campo ')[0]} · banda 0,90–1,10 para cualquier producción (el campo no tiene mes publicado)` : c.fuente
  return origen === 'medidor'
    ? { ...c, nombre: 'Caudal de agua', fuente: `Incertidumbre del medidor no declarada; se acota con la banda del agua. ${fuente}` }
    // El agua que entra con la bomba parada: la de las pruebas de los pozos, con la banda del agua asignada.
    : { ...c, nombre: 'Agua de los pozos', fuente: `Agua de la prueba vigente de los pozos que producen; se acota con la banda del agua. ${fuente}` }
}

/* ─────────────────────────── el orden de cierre ─────────────────────────── */

export interface PasoCierre {
  pozo: Pozo
  /** Lo que se deja de producir al cerrarlo (la parte, si es el último). */
  crudoBpd: number
  aguaBpd: number
  /** Crudo por barril de agua: el criterio del orden. */
  crudoPorAgua: number
  /** 1 se cierra entero; menos, se le baja la frecuencia o se estrangula (una
   *  electrosumergible, a lo más `BAJA_MAXIMA_ESP`: 25 %). */
  fraccion: number
  aguaAcumBpd: number
}

export interface OrdenDeCierre {
  aguaAQuitarBpd: number
  pasos: PasoCierre[]
  /** Crudo perdido por día cerrando en este orden. */
  crudoBpd: number
  /** Cerrando parejo: la misma fracción a todos los pozos. */
  crudoParejoBpd: number
  ahorroBpd: number
  /** Pozos que producen y entran en el orden. */
  produciendo: number
  /** Pozos sin prueba: no se pueden ordenar (no se sabe cuánta agua dan). */
  sinPrueba: Pozo[]
}

/** Qué pozos cerrar para quitar cierta agua perdiendo el menor crudo:
 *  primero los que menos crudo dan por barril de agua. */
export function ordenDeCierre(campoId: string, aguaAQuitarBpd: number, t: number = ahora, todos = false): OrdenDeCierre {
  const pozos = pozosDe(campoId).filter(p => todos || estadoAhora(p).produce)
  const conPrueba = pozos.filter(p => p.pruebas.length)
  // Sin ningún factor medido en el campo no hay crudo asignado (cero, como crudoAsignado).
  const fa = faDe(campoId, t) ?? 0
  const totalAgua = conPrueba.reduce((a, p) => a + aguaDePrueba(p, t), 0)
  const totalCrudo = conPrueba.reduce((a, p) => a + crudoAsignado(p, t), 0)
  const quitar = Math.min(aguaAQuitarBpd, totalAgua)
  const o = ordenOptimo(conPrueba, quitar, t)
  let acum = 0
  const pasos = o.pasos.map(x => {
    acum += x.agua
    return { pozo: x.pozo, crudoBpd: x.crudo * fa, aguaBpd: x.agua, fraccion: x.fraccion, aguaAcumBpd: acum,
      crudoPorAgua: (pruebaEn(x.pozo, t)?.crudoBpd ?? 0) / Math.max(1, aguaDePrueba(x.pozo, t)) }
  })
  const crudoBpd = o.crudo * fa
  const crudoParejoBpd = totalAgua > 0 ? totalCrudo * quitar / totalAgua : 0
  return { aguaAQuitarBpd: quitar, pasos, crudoBpd, crudoParejoBpd, ahorroBpd: Math.max(0, crudoParejoBpd - crudoBpd),
    produciendo: pozos.length, sinPrueba: pozos.filter(p => !p.pruebas.length) }
}

/* ────────────────────────────── el colchón ────────────────────────────── */

export interface Colchon {
  tanque: TanqueAgua
  nivel: { tag: string; pct: number; hora?: string }
  /** Volumen libre hasta el alto-alto. */
  libreBbl: number
  aguaSinSalidaBpd: number
  /** Horas hasta que el tanque llega al alto-alto y hay que cerrar pozos. */
  horas: number
  rango: [number, number]
  /** El tanque ya está en el alto-alto. */
  agotado: boolean
  componentes: Componente[]
}

function colchonDe(tanque: TanqueAgua, pct: number, aguaSinSalidaBpd: number, campoId: string, tag: string, hora?: string, origen: 'medidor' | 'pruebas' = 'medidor'): Colchon {
  const libreBbl = Math.max(0, (tanque.altoAlto - pct / 100) * tanque.capacidadBbl)
  const porHora = aguaSinSalidaBpd / 24
  const horas = porHora > 0 ? libreBbl / porHora : Infinity
  const aforo: Componente = { ...AFORO_TANQUE, valor: libreBbl > 0 ? AFORO_TANQUE.valor * tanque.capacidadBbl / libreBbl : 0 }
  const componentes = [aforo, toleranciaAgua(campoId, origen)]
  const rel = raizSumaCuadrados(componentes.map(c => c.valor))
  return { tanque, nivel: { tag, pct, hora }, libreBbl, aguaSinSalidaBpd, horas,
    rango: [horas * (1 - rel), horas * (1 + rel)], agotado: libreBbl <= 0, componentes }
}

/* ───────────────────────── si se para ahora ───────────────────────── */

export interface Prediccion {
  perfil: PerfilBomba
  /** Recobro: parar no cierra pozos hoy. */
  inmediato: boolean
  /** Si ya está parada, la parada abierta. */
  parada?: EventoBomba
  /** Con la bomba parada: lo que se está perdiendo ahora por ella. */
  perdiendo?: { bblDia: number; pozos: Pozo[] }
  mueve?: { bpd: number; fuente: string; medido: boolean }
  respaldoLibreBpd: number
  aguaSinSalidaBpd: number
  /** Lo que aguantaría el tanque si la bomba parara AHORA con todo el campo
   *  produciendo (la predicción). Con la bomba ya parada NO es cuándo se
   *  llena: eso es `llenado`. */
  colchon?: Colchon
  /** Disposición ya parada, con tanque y nivel: cómo se está llenando el
   *  tanque AHORA, con el agua que de verdad entra (`Llenado`). */
  llenado?: Llenado
  orden?: OrdenDeCierre
  /** Crudo por día que se pierde una vez agotado el colchón (orden recomendado). */
  crudoBpd: number
  /** El mismo, cerrando parejo. */
  crudoParejoBpd: number
  /** Tolerancia relativa del crudo: la banda de asignación del campo. */
  tolerancia: number
  componentes: Componente[]
  metodo: string
  supuestos: string[]
}

/** El tanque de una bomba de disposición que YA está parada: sube con el agua
 *  que entra ahora, no con la que movía la bomba. */
export interface Llenado {
  /** Agua que entra ahora al tanque, para leer: la de los pozos que producen
   *  (prueba vigente, con la parte que pierde el que va a frecuencia reducida;
   *  la misma cuenta de `caudalesAhora`). Con el campo cerrado, 0. */
  aguaEntraBpd: number
  /** El tanque con lo que la parada dejó sin salida (pérdida × lo que movía
   *  − respaldo libre) menos el agua de los pozos que ya cerró o frenó:
   *  `aguaSinSalidaBpd`, `horas` hasta el alto-alto y su `rango`. Sin agua sin
   *  salida, `horas` = Infinity (`null` en el cable): el tanque no sube. */
  colchon: Colchon
  /** La prioridad del tanque (ISA-18.2: por el tiempo hasta la consecuencia,
   *  la regla de la salud de las partes): ya en el alto-alto 1; llega en menos
   *  de un día 2; dentro del horizonte (90 días) 3; no sube, o más allá, 0. */
  prioridad: Severidad
}

/** Lo que pasaría si la bomba se parara ahora (o lo que está pasando, si ya
 *  está parada). */
export function prediccion(p: PerfilBomba, ctx: Contexto): Prediccion {
  const parada = paradasDe(p.equipo, p.campoId).find(e => !e.fin)
  const banda = bandaDe(p.campoId)
  const crudoComp: Componente = { nombre: 'Crudo asignado a los pozos', valor: banda.valor, fuente: banda.fuente, correlado: true }
  const base = { perfil: p, parada, respaldoLibreBpd: respaldoLibre(p, ctx.config), tolerancia: banda.valor, componentes: [crudoComp] }

  if (p.papel === 'recobro') {
    // Parada o no, no cierra pozos hoy: lo que está perdiendo es cero, dicho.
    return { ...base, inmediato: false, aguaSinSalidaBpd: 0, crudoBpd: 0, crudoParejoBpd: 0, componentes: [],
      ...(parada ? { perdiendo: { bblDia: 0, pozos: [] } } : {}),
      metodo: 'Inyección para recobro con salida alterna para el agua: parar no cierra pozos hoy. Baja el soporte de presión del yacimiento y el efecto llega en semanas.',
      supuestos: [respaldoDe(ctx.config, p.campoId, p.equipo)?.detalle ?? 'Sin respaldo configurado'] }
  }

  if (p.papel === 'transporte') {
    const servidos = pozosDe(p.campoId).filter(w => p.pozos?.includes(w.id))
    const con = servidos.filter(w => w.pruebas.length && estadoAhora(w).produce)
    const crudo = con.reduce((a, w) => a + crudoAsignado(w), 0) * p.sinBomba.fraccion
    const fa = faDe(p.campoId)
    // Ya parada: lo que está costando son los pozos que cerró ella.
    const perdiendo = parada ? perdiendoPor(p, parada, ctx) : undefined
    return { ...base, inmediato: true, aguaSinSalidaBpd: 0, crudoBpd: crudo, crudoParejoBpd: crudo,
      ...(perdiendo ? { perdiendo } : {}),
      metodo: perdiendo ? `Parada desde ${FMT_HORA.format(new Date(parada!.inicio))}: ${perdiendo.pozos.length} ${perdiendo.pozos.length === 1 ? 'pozo cerrado' : 'pozos cerrados'} por ella`
        : `Crudo de los ${con.length} pozos que pasan por la bomba: prueba vigente × factor de asignación del mes (${fa !== undefined ? n3(fa) : 'sin factor medido'})`,
      supuestos: [
        ...con.map(w => `${w.id}: ${n0(crudoAsignado(w))} bbl/d · prueba del ${pruebaEn(w, ahora)!.fecha.slice(0, 10)}`),
        ...servidos.filter(w => !con.includes(w)).map(w => `${w.id}: ${w.pruebas.length ? 'ya está parado' : 'sin prueba, no se cuenta'}`),
        p.sinBomba.fuente,
      ] }
  }

  // Ya parada: lo que importa es lo que está costando, pozo por pozo.
  if (parada) {
    const perdiendo = perdiendoPor(p, parada, ctx)
    const pr = prediccionEnMarcha(p, ctx, base, crudoComp)
    const llenado = llenadoDe(p, parada, pr, perdiendo.pozos)
    return { ...pr, perdiendo, ...(llenado ? { llenado } : {}),
      metodo: `Parada desde ${FMT_HORA.format(new Date(parada.inicio))}: ${perdiendo.pozos.length} ${perdiendo.pozos.length === 1 ? 'pozo cerrado' : 'pozos cerrados'} por ella` }
  }
  return prediccionEnMarcha(p, ctx, base, crudoComp)
}

/** Con la bomba de disposición ya parada, el tanque sube con lo que la parada
 *  dejó sin salida y que todavía no se quitó cerrando pozos:
 *
 *    agua sin salida = max(0, (pérdida × lo que mueve − respaldo libre) × fracción sin bomba
 *                      − agua de los pozos que la parada cerró o frenó)
 *    horas           = libre hasta el alto-alto / (agua sin salida / 24)
 *
 *  Lo que mueve la bomba es su parte del agua que entraba (la mediana de su
 *  medidor), y el respaldo, lo que el resto del tren toma de más: lo que entra
 *  de más al parar es la diferencia. Cada pozo que se cierra por la parada le
 *  quita su agua (la de su prueba; uno a frecuencia reducida, la parte que deja
 *  de dar). No es el colchón de la predicción («si parara ahora con todo
 *  produciendo»): con los pozos que hacía falta cerrar ya cerrados, el tanque
 *  no sube, esté donde esté. Sin tanque firmado o sin su nivel no hay cuenta
 *  (ausente). `aguaEntraBpd` es el agua que entra ahora, para leer. */
function llenadoDe(p: PerfilBomba, parada: EventoBomba, pr: Prediccion, cerrados: Pozo[]): Llenado | undefined {
  const tanque = pr.colchon?.tanque, nivel = tanque ? NIVEL_AHORA[tanque.id] : undefined
  if (!tanque || !nivel) return undefined
  const aguaEntraBpd = caudalesAhora(p.campoId).agua
  const quitada = cerrados.reduce((a, w) => {
    const e = estadoAhora(w)
    return a + aguaDePrueba(w) * (e.produce ? perdidaPorFrecuencia(e.hz, pruebaEn(w, ahora)?.hz) : 1)
  }, 0)
  const sinSalida = Math.max(0, (parada.perdida * (pr.mueve?.bpd ?? 0) - pr.respaldoLibreBpd) * p.sinBomba.fraccion - quitada)
  const colchon = colchonDe(tanque, nivel.pct, sinSalida, p.campoId, nivel.tag, nivel.hora, 'pruebas')
  // La misma regla que la salud de una parte que avisa (salud.ts): lo que llega
  // a su límite en menos de un día pide atención ya; más allá del horizonte, nada.
  const prioridad: Severidad = colchon.agotado ? 1 : colchon.horas > HORIZONTE_H ? 0 : colchon.horas < 24 ? 2 : 3
  return { aguaEntraBpd, colchon, prioridad }
}

/** Lo que una parada abierta está costando ahora: los pozos cuyo evento
 *  abierto se le carga a ella (o al servicio que la paró), cada uno con su
 *  crudo y, si está a frecuencia reducida, la parte que deja de dar. La misma
 *  cuenta para la de disposición y la multifásica. */
function perdiendoPor(p: PerfilBomba, parada: EventoBomba, ctx: Contexto): { bblDia: number; pozos: Pozo[] } {
  const id = causaDeParada(parada, ctx).evento ?? parada.id
  const pozos = pozosDe(p.campoId).filter(w => {
    const e = estadoAhora(w).evento
    return e && causaDeEvento(e, ctx).evento === id
  })
  const bblDia = pozos.reduce((a, w) => {
    const e = estadoAhora(w)
    return a + crudoAsignado(w) * (e.produce ? perdidaPorFrecuencia(e.hz, pruebaEn(w, ahora)?.hz) : 1)
  }, 0)
  return { bblDia, pozos }
}

/** Disposición en marcha: el agua que el respaldo no absorbe llena el
 *  tanque; cuando llega al alto-alto hay que dejar de producirla, cerrando
 *  pozos. Con todos los pozos produciendo (no los de ahora, si hay cerrados),
 *  porque es lo que se perdería en la próxima parada. */
function prediccionEnMarcha(p: PerfilBomba, ctx: Contexto, base: Pick<Prediccion, 'perfil' | 'parada' | 'respaldoLibreBpd' | 'tolerancia' | 'componentes'>, crudoComp: Componente): Prediccion {
  const mueve = aguaQueMueve(p)
  const sinSalida = Math.max(0, mueve.bpd - respaldoLibre(p, ctx.config)) * p.sinBomba.fraccion
  const tanque = tanqueDe(ctx.config, p.campoId, p.equipo)
  const nivel = tanque ? NIVEL_AHORA[tanque.id] : undefined
  const colchon = tanque && nivel ? colchonDe(tanque, nivel.pct, sinSalida, p.campoId, nivel.tag, nivel.hora) : undefined
  // Sin respaldo, toda el agua se queda sin salida: se cierra todo el campo.
  // Con respaldo, lo que el respaldo no absorbe (medido en la bomba) se
  // quita de los pozos según sus pruebas.
  const aQuitar = respaldoLibre(p, ctx.config) > 0 ? sinSalida : sinSalida > 0 ? Infinity : 0
  const orden = aQuitar > 0 ? ordenDeCierre(p.campoId, aQuitar, ahora, !!base.parada) : undefined
  return {
    ...base, inmediato: true, mueve, aguaSinSalidaBpd: sinSalida, colchon, orden,
    crudoBpd: orden?.crudoBpd ?? 0, crudoParejoBpd: orden?.crudoParejoBpd ?? 0,
    componentes: [crudoComp, ...(colchon ? colchon.componentes : [])],
    metodo: sinSalida <= 0
      ? 'El respaldo absorbe toda el agua: parar no cierra pozos'
      : respaldoLibre(p, ctx.config) <= 0
        ? 'Sin respaldo, el agua no tiene salida: al llenarse el tanque se cierra todo el campo'
        : `Hay que quitar ${n0(sinSalida)} bbl/d de agua: se cierran primero los pozos con menos crudo por barril de agua`,
    supuestos: [
      mueve.fuente,
      respaldoDe(ctx.config, p.campoId, p.equipo)?.detalle ?? 'Sin respaldo configurado',
      ...(tanque ? [`${tanque.nombre}: ${n0(tanque.capacidadBbl)} bbl, alto-alto al ${Math.round(tanque.altoAlto * 100)} % · ${tanque.aforo}`] : ['Sin tanque configurado: no se puede calcular el colchón']),
      ...(nivel ? [`Nivel ${nivel.tag}: ${nivel.pct.toLocaleString('es-CO')} %`] : []),
      ...(orden?.sinPrueba.length ? [`Sin prueba, fuera del orden: ${orden.sinPrueba.map(w => w.id).join(', ')}`] : []),
    ],
  }
}

/* ───────────────────────── una parada medida ───────────────────────── */

export interface ParadaMedida {
  evento: EventoBomba
  causa: Causa
  /** A quién se le cargan los barriles: la bomba, o el servicio que la paró. */
  cargadoA: string
  abierto: boolean
  inicio: Date
  fin: Date
  horasParada: number
  /** Disposición: lo que el tanque debía aguantar y lo que aguantó. */
  colchon?: { previsto: Colchon; observadoH?: number }
  tramos: Tramo[]
  pozos: number
  bbl: number
  /** Fracción relativa. */
  tolerancia: number
  rango: [number, number]
  /** Barriles de pozos a frecuencia reducida (aproximados). */
  aproximado: number
  /** Lo que se habría ahorrado cerrando en el orden recomendado. */
  evitable: number
  pide: boolean
  arrancoSinIdentificar: boolean
}

/** El historial de la configuración firmada, de la más vieja a la vigente
 *  (`GET /api/configuracion/historial`). */
export type Versiones = ReadonlyArray<Pick<Version, 'fecha' | 'config'>>

/** Una parada de bomba medida. El tanque y el respaldo con que se calcula lo
 *  que el tanque debía aguantar son los de la configuración que regía cuando
 *  paró (`configEn(versiones, inicio)`), como en los mensajes: firmar hoy otro
 *  respaldo no reescribe una parada de septiembre. */
export function paradaMedida(ev: EventoBomba, ctx: Contexto, versiones: Versiones): ParadaMedida | undefined {
  const p = perfilBomba(ev.equipo, ev.campoId)
  if (!p) return undefined
  const causa = causaDeParada(ev, ctx)
  const id = causa.evento ?? ev.id
  const inicio = new Date(ev.inicio), fin = ev.fin ? new Date(ev.fin) : AHORA
  // Si la paró un servicio, sus barriles son del servicio: aquí solo los que
  // cayeron durante esta parada.
  const tramos = tramosDeEvento(ev.campoId, id, ctx).filter(t => id === ev.id || (t.inicio < fin && t.fin > inicio))
  const bbl = tramos.reduce((a, t) => a + t.bbl, 0)
  const tol = toleranciaDe(tramos)
  let colchon: ParadaMedida['colchon']
  const regia = configEn(versiones, inicio.getTime())
  const tanque = tanqueDe(regia, ev.campoId, ev.equipo)
  if (p.papel === 'disposicion' && tanque && ev.nivelAlParar && causa.equipo === ev.equipo) {
    const sinSalida = Math.max(0, aguaQueMueve(p).bpd - respaldoLibre(p, regia)) * ev.perdida * p.sinBomba.fraccion
    const previsto = colchonDe(tanque, ev.nivelAlParar.pct, sinSalida, ev.campoId, ev.nivelAlParar.tag)
    const primero = tramos.length ? Math.min(...tramos.map(t => new Date(t.evento.inicio).getTime())) : undefined
    colchon = { previsto, observadoH: primero !== undefined ? (primero - inicio.getTime()) / H : undefined }
  }
  return {
    evento: ev, causa, cargadoA: causa.equipo, abierto: !ev.fin, inicio, fin,
    horasParada: Math.max(0, horasEntre(inicio, fin)), colchon, tramos,
    pozos: new Set(tramos.map(t => t.pozo.id)).size, bbl,
    tolerancia: bbl > 0 ? tol / bbl : 0, rango: [bbl - tol, bbl + tol],
    aproximado: tramos.filter(t => t.aproximado).reduce((a, t) => a + t.bbl, 0),
    evitable: causa.tipo === 'reinyeccion' ? evitableDeEvento(tramos) : 0,
    ...estadoIdentificacion(causa, ev.fin),
  }
}

/* ─────────────────────────── el veredicto ─────────────────────────── */

type SenalQueCruza = Senal & { pronostico: { tipo: 'cruza'; horas: number; rango: [number, number] } }

/** Lo que hay que decir de una bomba: la señal que antes cruza, lo que se
 *  perdería si se para, y lo que le cuesta en promedio cada falla suya. */
export interface Veredicto {
  primera?: SenalQueCruza
  cruzadas: Senal[]
  prediccion: Prediccion
  historial: HistorialEquipo
  /** Barriles promedio de cada falla suya CERRADA en la historia (las que el
   *  tanque absorbió cuentan como cero; la abierta todavía no termina). */
  porFalla?: number
}

export function veredicto(p: PerfilBomba, ctx: Contexto): Veredicto {
  const senales = senalesDe(p)
  const cruzan = senales
    .filter((s): s is SenalQueCruza => s.pronostico.tipo === 'cruza' && proyectable(s))
    .sort((a, b) => a.pronostico.horas - b.pronostico.horas)
  const historial = historialDeEquipo(p.campoId, p.equipo, ctx)
  return {
    primera: cruzan[0], cruzadas: senales.filter(s => s.pronostico.tipo === 'cruzado'),
    prediccion: prediccion(p, ctx), historial,
    porFalla: historial.bblPorFalla,
  }
}

/* ─────────────────────── qué se pierde y qué está en riesgo ─────────────────────── */

export interface Riesgo {
  campoId: string
  equipo: string
  tipo: TipoCausa
  /** Perdiendo: ya está costando. En riesgo: produce, pero una parte avisa. */
  estado: 'perdiendo' | 'en-riesgo'
  /** Prioridad para la marca (ISA-18.2), la misma que la salud de la parte:
   *  la pantalla no la deduce de las horas. */
  prioridad: Severidad
  /** En riesgo por una parte: su estado (fuera de banda o avisa). */
  estadoParte?: EstadoParte
  bblDia: number
  /** `bblDia` es un TECHO, no una cifra calculada: supone que se cierra todo lo
   *  que esté produciendo y dependa del equipo (un servicio o un equipo de
   *  proceso que cuelga de todo el campo). La pantalla lo dice «hasta», como en
   *  «Si falla hoy» (D6; K-101 de La Ceiba). Ausente en lo calculado: lo que ya
   *  se pierde, las bombas de la línea y las electrosumergibles. */
  techo?: true
  /** `motivo` es lo que respondió una persona con sus palabras (una parada
   *  declarada): quién, por su rol («el operador de campo»). En el papel va
   *  «Lo contestó …», nunca el texto ni el nombre (D2). Ausente si `motivo` es de TRIM. */
  declaradoPor?: string
  pozos: number
  /** Cuándo empezó la causa: la parada de la bomba o del servicio, o el
   *  evento del pozo. */
  desde?: Date
  /** Perdiendo: cuándo se cerró el primer pozo (puede ser horas después de
   *  que paró la bomba: el tanque aguantó). */
  cierreDesde?: Date
  parte?: ParteId
  /** En riesgo: horas hasta que la primera variable llegue a su alarma, y su
   *  rango. Undefined si ya llegó. */
  horas?: number
  rango?: [number, number]
  motivo: string
  /** Qué hacer cuando la parte avisa (del catálogo de partes). */
  accion?: string
  /** El instrumento que da el aviso. */
  tag?: string
  /** Contrato v1 (`cde8214`), con su significado de v1: barriles que cuesta
   *  una falla así. Bomba: lo que el equipo YA costó, en promedio, por falla
   *  (`HistorialEquipo.bblPorFalla`). Electrosumergible: crudo por día × horas
   *  fuera promedio / 24 (las propias; sin historia propia, las de su flota en
   *  el campo). Sin fallas cerradas: ausente. Lo que costaría si fallara HOY es
   *  `costoFallaHoy` (C1, docs/backend/CAMBIOS-CONTRATO.md §4.1). */
  costoFalla?: number
  /** AGREGADO (C1): barriles que costaría que el equipo fallara HOY: el crudo
   *  por día que se pierde si para hoy por las horas que duran sus fallas
   *  cerradas, sin las que aguanta hoy el tanque (bomba de disposición). Una
   *  cuenta para todas las familias, así las filas se pueden sumar. Recobro, o
   *  un respaldo que absorbe toda el agua: 0. Sin fallas cerradas propias (ni
   *  flota, en una electrosumergible): ausente, no 0. Es la cifra que pinta el
   *  front («Si falla hoy», «le costaría la falla»). */
  costoFallaHoy?: number
  /** Bomba de disposición con tanque: horas que aguanta hoy el tanque si
   *  para (el colchón de la predicción). Una reparación más corta no cuesta
   *  crudo. Ausente si el respaldo absorbe toda el agua o si no hay colchón
   *  calculado (sin tanque o sin su nivel). */
  colchonH?: number
  /** De dónde sale `costoFallaHoy`, en palabras (solo para leer). En v1 decía
   *  de dónde salía `costoFalla` (C11). */
  mdtFuente?: string
  /** Con qué historia se estimó `costoFallaHoy`: la del propio equipo o, si nunca
   *  ha fallado, la de su flota en el campo (menos confiable). La pantalla lo
   *  marca sin leer el texto de `mdtFuente`. Ausente cuando `costoFallaHoy` es 0
   *  por definición (recobro, respaldo que absorbe toda el agua). */
  costoDe?: 'propio' | 'flota'
  altoImpacto: boolean
}

/** Horas fuera promedio de las fallas de electrosumergible del campo (sin
 *  disparos). Para la que no ha fallado en la historia que hay. */
export function mdtEspDelCampo(campoId: string, ctx: Contexto): number | undefined {
  const hs = pozosDe(campoId).filter(p => p.levantamiento === 'electrosumergible')
    .flatMap(p => historialDeEquipo(campoId, p.id, ctx).eventos.filter(e => !e.disparo && e.fin).map(e => e.horas))
  return hs.length ? hs.reduce((a, b) => a + b, 0) / hs.length : undefined
}

const peorParte = (ps: SaludParte[]) => ps.find(s => s.estado === 'fuera' || s.estado === 'avisa')

/** Lo que costaría que el equipo fallara HOY (`costoFalla` aquí es esa cifra:
 *  en `Riesgo` viaja como `costoFallaHoy`, C1) y de dónde sale. */
type CostoFalla = Pick<Riesgo, 'colchonH' | 'mdtFuente' | 'costoDe'> & { costoFalla?: number }
/** La cuenta de hoy, con el nombre del contrato (`costoFallaHoy`), y la de v1 (`costoFalla`) al lado. */
const conCostoV1 = ({ costoFalla: hoy, ...resto }: CostoFalla, v1: number | undefined): Pick<Riesgo, 'costoFalla' | 'costoFallaHoy' | 'colchonH' | 'mdtFuente' | 'costoDe'> =>
  ({ ...resto, ...(hoy !== undefined ? { costoFallaHoy: hoy } : {}), ...(v1 !== undefined ? { costoFalla: v1 } : {}) })

/** Lo que costaría que una bomba de la línea fallara HOY (decisión del dueño,
 *  8-oct-2026). Con Q = el crudo por día que se pierde si para hoy (la
 *  predicción, en el orden de cierre), dᵢ = las horas de cada falla suya
 *  cerrada y h = el colchón de hoy:
 *   - disposición con tanque: Q × promedio(max(0, dᵢ − h)) / 24;
 *   - disposición sin colchón calculado (sin tanque o sin su nivel): Q × d̄ / 24,
 *     un techo, y se dice;
 *   - multifásica: Q × d̄ / 24 (no tiene tanque);
 *   - recobro, o un respaldo que absorbe toda el agua: 0, dure lo que dure.
 *  Sin fallas cerradas: sin cifra. */
export function costoDeBomba(p: PerfilBomba, pr: Prediccion, h: HistorialEquipo): CostoFalla {
  if (p.papel === 'recobro') return { costoFalla: 0, mdtFuente: 'una bomba de recobro no cierra pozos hoy' }
  if (p.papel === 'disposicion' && pr.aguaSinSalidaBpd <= 0) return { costoFalla: 0, mdtFuente: 'el respaldo absorbe toda el agua: parar no cierra pozos' }
  const d = h.eventos.filter(e => !e.disparo && e.fin).map(e => e.horas)
  if (!d.length) return {}
  const sus = `el promedio de ${d.length === 1 ? 'su falla cerrada' : `sus ${d.length} fallas cerradas`}`
  const media = (xs: number[]) => xs.reduce((a, x) => a + x, 0) / xs.length
  if (p.papel === 'disposicion' && pr.colchon) {
    const hc = pr.colchon.horas
    return { costoFalla: pr.crudoBpd * media(d.map(x => Math.max(0, x - hc))) / 24, colchonH: hc, costoDe: 'propio',
      // Las horas del colchón, truncadas (`textoHoras(h, true)`): las mismas que dice la fila («0 si vuelve antes de 19 h»).
      mdtFuente: pr.colchon.agotado ? `${sus}; el tanque ya está en el alto-alto, no aguanta nada` : `${sus}, sin las ${textoHoras(hc, true)} que aguanta hoy el tanque` }
  }
  return { costoFalla: pr.crudoBpd * media(d) / 24, costoDe: 'propio',
    mdtFuente: p.papel === 'disposicion' ? `${sus}, sin descontar el tanque (no hay colchón calculado): es un techo` : sus }
}

/** Lo que se está perdiendo AHORA (eventos abiertos, cada uno con su causa) y
 *  lo que está en riesgo (equipos de alto impacto que producen y tienen una
 *  parte que avisa). Nada de esto sale de una tabla: sale de los eventos, las
 *  pruebas y el vigía. */
export function riesgoAhora(campoIds: string[], ctx: Contexto): Riesgo[] {
  // Cada campo es independiente (nada de un campo mira otro): se calcula una
  // vez por contexto y campo, y aquí solo se juntan y se ordenan. La misma
  // cuenta la pedían el riel, la cabecera y la pantalla en cada render.
  return campoIds.flatMap(c => porContextoYCampo(RIESGO, ctx, c, () => riesgoDeCampo(c, ctx)))
    .sort((a, b) => Number(b.estado === 'perdiendo') - Number(a.estado === 'perdiendo') || b.bblDia - a.bblDia)
}

/** Caché por contexto (configuración firmada + respuestas) y campo: un
 *  contexto nuevo es otra entrada, y el viejo se libera solo. */
function porContextoYCampo<T>(m: WeakMap<Contexto, Map<string, T>>, ctx: Contexto, campoId: string, f: () => T): T {
  let x = m.get(ctx)
  if (!x) m.set(ctx, x = new Map())
  if (!x.has(campoId)) x.set(campoId, f())
  return x.get(campoId)!
}
const RIESGO = new WeakMap<Contexto, Map<string, Riesgo[]>>()
const ESTADO = new WeakMap<Contexto, Map<string, EstadoCampo>>()

/** Lo de un campo, sin ordenar: `riesgoAhora` ordena todo junto. */
function riesgoDeCampo(campoId: string, ctx: Contexto): Riesgo[] {
  const out: Riesgo[] = []
  {
    // Perdiendo: cada pozo apagado (o frenado) le cuesta su crudo a su causa.
    const por = new Map<string, Riesgo>()
    for (const p of pozosDe(campoId)) {
      const e = estadoAhora(p)
      if (!e.evento) continue
      const c = causaDeEvento(e.evento, ctx)
      const factor = e.produce ? perdidaPorFrecuencia(e.hz, pruebaEn(p, ahora)?.hz) : 1
      const k = `${c.equipo}|${c.tipo}`
      const cierre = new Date(e.evento.inicio)
      const alto = ALTO_IMPACTO.includes(c.tipo)
      const r = por.get(k) ?? { campoId, equipo: c.equipo, tipo: c.tipo, estado: 'perdiendo' as const, prioridad: (alto ? 1 : 2) as Severidad, bblDia: 0, pozos: 0,
        desde: inicioDeCausa(c) ?? cierre, cierreDesde: cierre, parte: c.parte, motivo: c.texto,
        // Lo que escribió una persona con sus palabras se dice en el papel por su rol (D2).
        ...(textoDePersona(c) ? { declaradoPor: rolDeQuien(c.declarado!.por) } : {}), altoImpacto: alto }
      r.bblDia += crudoAsignado(p) * factor
      r.pozos++
      if (cierre < r.cierreDesde!) r.cierreDesde = cierre
      if (!inicioDeCausa(c) && cierre < r.desde!) r.desde = cierre
      por.set(k, r)
    }
    out.push(...por.values())

    // Lo que ya se está perdiendo lo dice el controlador y se cuenta siempre. Lo
    // que se predice (una parte que avisa) es vigilancia: solo de las familias
    // que el perfil firmado del campo tiene.
    const perfil = perfilDe(ctx.config, campoId)

    // En riesgo: bombas de la línea en marcha con una parte que avisa.
    for (const id of perfil.bombas ? Object.keys(EQUIPOS).filter(esBomba) : []) {
      const p = perfilBomba(id, campoId)
      if (!p || paradasDe(id, campoId).some(e => !e.fin)) continue
      const sp = peorParte(saludDePartes(p))
      if (!sp) continue
      const pr = prediccion(p, ctx)
      const h = historialDeEquipo(campoId, id, ctx)
      out.push({ campoId, equipo: id, tipo: p.subtipo === 'multifasica' ? 'transporte' : 'reinyeccion', estado: 'en-riesgo',
        prioridad: sp.prioridad || 3, estadoParte: sp.estado,
        bblDia: pr.crudoBpd, pozos: pr.orden?.pasos.length ?? (p.pozos?.length ?? 0), parte: sp.parte.id,
        horas: sp.primera?.senal.pronostico.horas, rango: sp.primera?.senal.pronostico.rango, accion: sp.parte.accion,
        tag: sp.primera?.senal.tag ?? sp.fuera[0]?.senal.tag,
        // C1: `costoFalla` con el significado de v1 (lo que ya costó por falla) y `costoFallaHoy` al lado.
        ...conCostoV1(costoDeBomba(p, pr, h), h.bblPorFalla),
        altoImpacto: p.subtipo !== 'multifasica',
        motivo: motivoDeParte(sp) })
    }
    // En riesgo: servicios y equipos de proceso en alarma que cuelgan de todo
    // el campo (aire, energía): si caen, se cierra lo que esté produciendo.
    for (const id of Object.keys(EQUIPOS).filter(id => !esBomba(id))) {
      const eq = equipoEnCampo(id, campoId)
      if (!eq?.instrumentado || !(eq.severidad === 1 || eq.severidad === 2) || eq.aguasAbajo !== 'todo el campo') continue
      if (out.some(r => r.campoId === campoId && r.equipo === id)) continue
      const produciendo = pozosDe(campoId).filter(p => estadoAhora(p).produce).reduce((a, p) => a + crudoAsignado(p), 0)
      // «Se cierra lo que esté produciendo»: un techo, no una cifra calculada (D6), el mismo de «Si falla hoy».
      out.push({ campoId, equipo: id, tipo: eq.servicio ?? 'proceso', estado: 'en-riesgo', prioridad: eq.severidad, bblDia: produciendo, techo: true,
        pozos: pozosDe(campoId).filter(p => estadoAhora(p).produce).length, altoImpacto: false,
        motivo: `${eq.nombre}: ${eq.estado}. ${eq.lectura}`, accion: eq.intervencion?.accionInmediata })
    }

    // En riesgo: electrosumergibles que producen con una parte que avisa.
    const mdtCampo = mdtEspDelCampo(campoId, ctx)
    for (const p of perfil.electrosumergibles ? pozosDe(campoId) : []) {
      if (p.levantamiento !== 'electrosumergible' || !estadoAhora(p).produce) continue
      const sp = peorParte(saludDeEsp(p, ctx))
      if (!sp) continue
      const h = historialDeEquipo(campoId, p.id, ctx)
      const mdt = h.mdtH ?? mdtCampo
      out.push({ campoId, equipo: p.id, tipo: 'electrosumergible', estado: 'en-riesgo', prioridad: sp.prioridad || 3, estadoParte: sp.estado,
        bblDia: crudoAsignado(p), pozos: 1,
        parte: sp.parte.id, horas: sp.primera?.senal.pronostico.horas, rango: sp.primera?.senal.pronostico.rango, accion: sp.parte.accion,
        tag: sp.primera?.senal.tag ?? sp.fuera[0]?.senal.tag,
        // En la electrosumergible las dos cifras son la misma cuenta (v1 ya la hacía así).
        ...(mdt !== undefined ? { costoFalla: crudoAsignado(p) * mdt / 24, costoFallaHoy: crudoAsignado(p) * mdt / 24 } : {}),
        // Las horas con la regla de las pantallas (`textoHoras`): «26,0 d», «30 h»; nunca «1 días».
        mdtFuente: h.mdtH !== undefined ? `${textoHoras(h.mdtH)} fuera, el promedio de ${h.fallasCerradas === 1 ? 'su falla cerrada' : `sus ${h.fallasCerradas} fallas cerradas`}`
          : mdt !== undefined ? `${textoHoras(mdt)} fuera, el promedio de las electrosumergibles del campo (esta no ha fallado)` : undefined,
        costoDe: h.mdtH !== undefined ? 'propio' : mdt !== undefined ? 'flota' : undefined,
        altoImpacto: true,
        motivo: motivoDeParte(sp) })
    }
  }
  return out
}

/** Hora en que empezó la causa de un cierre: la parada de la bomba o del
 *  servicio. Undefined si la causa es el propio pozo. */
function inicioDeCausa(c: Causa): Date | undefined {
  if (!c.evento) return undefined
  const b = paradaPorId(c.evento)
  if (b) return new Date(b.inicio)
  const s = servicioPorId(c.evento)
  return s ? new Date(s.inicio) : undefined
}


/* ─────────────────────── el campo, ahora ─────────────────────── */

export interface EstadoCampo {
  campoId: string
  /** Fiscal del último día completo, del punto de medición oficial; null si
   *  el computador de flujo no lo reportó (hueco, no cero). */
  ayer: { fecha: Date; bbl: number | null }
  /** Pozos con prueba × factor del mes: lo que daría con todo produciendo. */
  potencialBpd: number
  perdiendoBpd: number
  /** Del perdiendo, lo de equipos de alto impacto. */
  perdiendoAltoBpd: number
  pozos: number
  parados: number
  /** Equipos de alto impacto produciendo con una parte que avisa. */
  enRiesgo: number
  /** Para la marca del campo: 1 si un equipo de alto impacto lo está
   *  frenando, 2 si lo frena otra cosa o una parada sin identificar, 3 si
   *  hay algo en riesgo. */
  severidad: Severidad
}

export const estadoCampo = (campoId: string, ctx: Contexto): EstadoCampo =>
  porContextoYCampo(ESTADO, ctx, campoId, () => calcularEstado(campoId, ctx))
function calcularEstado(campoId: string, ctx: Contexto): EstadoCampo {
  const r = riesgoAhora([campoId], ctx)
  const pozos = pozosDe(campoId)
  const perd = r.filter(x => x.estado === 'perdiendo')
  const perdAlto = perd.filter(x => x.altoImpacto)
  const potencialBpd = pozos.reduce((a, p) => a + crudoAsignado(p), 0)
  return {
    campoId, ayer: fiscalDeAyer(campoId), potencialBpd,
    perdiendoBpd: perd.reduce((a, x) => a + x.bblDia, 0),
    perdiendoAltoBpd: perdAlto.reduce((a, x) => a + x.bblDia, 0),
    pozos: pozos.length, parados: pozos.filter(p => !estadoAhora(p).produce).length,
    enRiesgo: r.filter(x => x.estado === 'en-riesgo').length,
    severidad: perdAlto.length ? 1 : perd.length ? 2 : r.length ? 3 : 0,
  }
}

/** Crudo y agua que el campo está produciendo ahora, pozo por pozo: prueba
 *  vigente × factor del mes, sin los parados y con la parte que pierde el
 *  que está a frecuencia reducida. */
export function caudalesAhora(campoId: string): { crudo: number; agua: number } {
  let crudo = 0, agua = 0
  for (const p of pozosDe(campoId)) {
    const e = estadoAhora(p)
    if (!e.produce) continue
    // Lo que produce a frecuencia reducida: lo que no pierde (misma regla del libro).
    const f = e.hz ? 1 - perdidaPorFrecuencia(e.hz, pruebaEn(p, ahora)?.hz) : 1
    crudo += crudoAsignado(p) * f
    agua += aguaDePrueba(p) * f
  }
  return { crudo, agua }
}

/* ─────────────────────────── el período ─────────────────────────── */

const CALENDARIO = calendarioDe(AHORA)

/** Los límites del período en curso y del cerrado, sobre el reloj del demo. */
export const PERIODO_BOMBAS = { curso: CALENDARIO.curso, cerrado: CALENDARIO.cerrado }

/** El período de la cabecera, como intervalo sobre el reloj del PLC. */
export function rangoDePeriodo(periodoId: IdPeriodo | 'medida', aMano?: { desde: string; hasta: string } | null): { desde: Date; hasta: Date; nombre: string } {
  const d = (s: string) => new Date(`${s}T00:00:00-05:00`)
  if (aMano) {
    // «hasta» es el último día incluido: el intervalo llega al día siguiente,
    // y nunca más allá de la hora del PLC.
    const h = new Date(d(aMano.hasta).getTime() + 86_400_000)
    return { desde: d(aMano.desde), hasta: h > AHORA ? AHORA : h, nombre: 'Rango escogido' }
  }
  switch (periodoId) {
    case 'cerrado': return CALENDARIO.cerrado
    case 'trimestre': return CALENDARIO.trimestre
    case 'ytd': return CALENDARIO.ytd
    case 'doce': return CALENDARIO.doce
    case 'curso': return CALENDARIO.curso
    // Un rango a mano sin sus días no es ningún período: se dice, no se cambia por el mes en curso.
    case 'medida': throw new Error('El período «rango escogido» llegó sin su rango.')
  }
}
