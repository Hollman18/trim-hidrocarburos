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
import { tanqueDe, respaldoDe, perfilDe, type TanqueAgua } from './configuracion'
import { toleranciaAsignacion, AFORO_TANQUE, raizSumaCuadrados, type Componente } from './metrologia'
import {
  faDe, crudoAsignado, aguaDePrueba, ordenOptimo, bandaDe, fiscalPromedio, tramosDeEvento, toleranciaDe,
  evitableDeEvento, historialDeEquipo, fiscalDeAyer, perdidaPorFrecuencia, type Tramo, type HistorialEquipo,
} from './libro'
import { causaDeParada, causaDeEvento, estadoIdentificacion, ALTO_IMPACTO, type Causa, type Contexto, type TipoCausa } from './causa-senal'
import { senalesDe, proyectable, type Senal } from './vigia'
import { saludDePartes, motivoDeParte, type SaludParte, type EstadoParte } from './salud'
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

/** Capacidad libre del respaldo: de la configuración firmada. */
const respaldoLibre = (p: PerfilBomba, ctx: Contexto) => respaldoDe(ctx.config, p.campoId, p.equipo)?.libreBpd ?? 0

/** El medidor de la bomba no es fiscal y su incertidumbre no está declarada:
 *  se acota con la banda del agua asignada de la Fig. 10.2, y se dice. La
 *  banda del agua no depende del °API y es la misma por encima y por debajo
 *  de 1.000 bpd (0,90–1,10): sin producción fiscal publicada no cambia, y la
 *  fuente lo dice en vez de suponer una fila. */
const toleranciaAgua = (campoId: string): Componente => {
  const prom = fiscalPromedio(campoId)
  const c = toleranciaAsignacion('agua', Number.NaN, prom ?? 0)
  const fuente = prom === undefined ? `${c.fuente.split(' · campo ')[0]} · banda 0,90–1,10 para cualquier producción (el campo no tiene mes publicado)` : c.fuente
  return { ...c, nombre: 'Caudal de agua', fuente: `Incertidumbre del medidor no declarada; se acota con la banda del agua. ${fuente}` }
}

/* ─────────────────────────── el orden de cierre ─────────────────────────── */

export interface PasoCierre {
  pozo: Pozo
  /** Lo que se deja de producir al cerrarlo (la parte, si es el último). */
  crudoBpd: number
  aguaBpd: number
  /** Crudo por barril de agua: el criterio del orden. */
  crudoPorAgua: number
  /** 1 se cierra entero; menos, se le baja la frecuencia o se estrangula. */
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

function colchonDe(tanque: TanqueAgua, pct: number, aguaSinSalidaBpd: number, campoId: string, tag: string, hora?: string): Colchon {
  const libreBbl = Math.max(0, (tanque.altoAlto - pct / 100) * tanque.capacidadBbl)
  const porHora = aguaSinSalidaBpd / 24
  const horas = porHora > 0 ? libreBbl / porHora : Infinity
  const aforo: Componente = { ...AFORO_TANQUE, valor: libreBbl > 0 ? AFORO_TANQUE.valor * tanque.capacidadBbl / libreBbl : 0 }
  const componentes = [aforo, toleranciaAgua(campoId)]
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
  colchon?: Colchon
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

/** Lo que pasaría si la bomba se parara ahora (o lo que está pasando, si ya
 *  está parada). */
export function prediccion(p: PerfilBomba, ctx: Contexto): Prediccion {
  const parada = paradasDe(p.equipo, p.campoId).find(e => !e.fin)
  const banda = bandaDe(p.campoId)
  const crudoComp: Componente = { nombre: 'Crudo asignado a los pozos', valor: banda.valor, fuente: banda.fuente, correlado: true }
  const base = { perfil: p, parada, respaldoLibreBpd: respaldoLibre(p, ctx), tolerancia: banda.valor, componentes: [crudoComp] }

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
    return { ...pr, perdiendo,
      metodo: `Parada desde ${FMT_HORA.format(new Date(parada.inicio))}: ${perdiendo.pozos.length} ${perdiendo.pozos.length === 1 ? 'pozo cerrado' : 'pozos cerrados'} por ella` }
  }
  return prediccionEnMarcha(p, ctx, base, crudoComp)
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
  const sinSalida = Math.max(0, mueve.bpd - respaldoLibre(p, ctx)) * p.sinBomba.fraccion
  const tanque = tanqueDe(ctx.config, p.campoId, p.equipo)
  const nivel = tanque ? NIVEL_AHORA[tanque.id] : undefined
  const colchon = tanque && nivel ? colchonDe(tanque, nivel.pct, sinSalida, p.campoId, nivel.tag, nivel.hora) : undefined
  // Sin respaldo, toda el agua se queda sin salida: se cierra todo el campo.
  // Con respaldo, lo que el respaldo no absorbe (medido en la bomba) se
  // quita de los pozos según sus pruebas.
  const aQuitar = respaldoLibre(p, ctx) > 0 ? sinSalida : sinSalida > 0 ? Infinity : 0
  const orden = aQuitar > 0 ? ordenDeCierre(p.campoId, aQuitar, ahora, !!base.parada) : undefined
  return {
    ...base, inmediato: true, mueve, aguaSinSalidaBpd: sinSalida, colchon, orden,
    crudoBpd: orden?.crudoBpd ?? 0, crudoParejoBpd: orden?.crudoParejoBpd ?? 0,
    componentes: [crudoComp, ...(colchon ? colchon.componentes : [])],
    metodo: sinSalida <= 0
      ? 'El respaldo absorbe toda el agua: parar no cierra pozos'
      : respaldoLibre(p, ctx) <= 0
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

export function paradaMedida(ev: EventoBomba, ctx: Contexto): ParadaMedida | undefined {
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
  const tanque = tanqueDe(ctx.config, ev.campoId, ev.equipo)
  if (p.papel === 'disposicion' && tanque && ev.nivelAlParar && causa.equipo === ev.equipo) {
    const sinSalida = Math.max(0, aguaQueMueve(p).bpd - respaldoLibre(p, ctx)) * ev.perdida * p.sinBomba.fraccion
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
  /** Barriles que cuesta una falla así: crudo por día × horas fuera promedio
   *  (las del propio equipo; sin historia propia, las de su flota en el campo). */
  costoFalla?: number
  /** De dónde sale el tiempo fuera que usa `costoFalla`. */
  mdtFuente?: string
  altoImpacto: boolean
}

/** Horas fuera promedio de las fallas de electrosumergible del campo (sin
 *  disparos). Para la que no ha fallado en la historia que hay. */
function mdtEspDelCampo(campoId: string, ctx: Contexto): number | undefined {
  const hs = pozosDe(campoId).filter(p => p.levantamiento === 'electrosumergible')
    .flatMap(p => historialDeEquipo(campoId, p.id, ctx).eventos.filter(e => !e.disparo && e.fin).map(e => e.horas))
  return hs.length ? hs.reduce((a, b) => a + b, 0) / hs.length : undefined
}

const peorParte = (ps: SaludParte[]) => ps.find(s => s.estado === 'fuera' || s.estado === 'avisa')

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
        desde: inicioDeCausa(c) ?? cierre, cierreDesde: cierre, parte: c.parte, motivo: c.texto, altoImpacto: alto }
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
        costoFalla: h.bblPorFalla,
        mdtFuente: h.fallasCerradas ? `el promedio de sus ${h.fallasCerradas} fallas cerradas (el tanque absorbe una parte)` : undefined,
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
      out.push({ campoId, equipo: id, tipo: eq.servicio ?? 'proceso', estado: 'en-riesgo', prioridad: eq.severidad, bblDia: produciendo,
        pozos: pozosDe(campoId).filter(p => estadoAhora(p).produce).length, altoImpacto: false,
        motivo: `${eq.nombre}: ${eq.estado}. ${eq.lectura}`, accion: eq.intervencion?.accionInmediata })
    }

    // En riesgo: electrosumergibles que producen con una parte que avisa.
    const mdtCampo = mdtEspDelCampo(campoId, ctx)
    for (const p of perfil.electrosumergibles ? pozosDe(campoId) : []) {
      if (p.levantamiento !== 'electrosumergible' || !estadoAhora(p).produce) continue
      const sp = peorParte(saludDeEsp(p))
      if (!sp) continue
      const h = historialDeEquipo(campoId, p.id, ctx)
      const mdt = h.mdtH ?? mdtCampo
      out.push({ campoId, equipo: p.id, tipo: 'electrosumergible', estado: 'en-riesgo', prioridad: sp.prioridad || 3, estadoParte: sp.estado,
        bblDia: crudoAsignado(p), pozos: 1,
        parte: sp.parte.id, horas: sp.primera?.senal.pronostico.horas, rango: sp.primera?.senal.pronostico.rango, accion: sp.parte.accion,
        tag: sp.primera?.senal.tag ?? sp.fuera[0]?.senal.tag,
        costoFalla: mdt !== undefined ? crudoAsignado(p) * mdt / 24 : undefined,
        mdtFuente: h.mdtH !== undefined ? `${Math.round(h.mdtH / 24)} días fuera, el promedio de sus ${h.fallasCerradas} fallas cerradas`
          : mdt !== undefined ? `${Math.round(mdt / 24)} días fuera, el promedio de las electrosumergibles del campo (esta no ha fallado)` : undefined,
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
