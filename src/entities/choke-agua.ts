/** La tubería del agua de cada campo: el modelo choke de inyección
 *  (CHOKE-COMPLETO §9; en pantalla, «La tubería del agua», U2 §5).
 *
 *  En un campo de 92–97 % de agua, el agua decide más paradas que el crudo. Lo
 *  dice el modelo de BP: «In a field such as Magnus or Ula the Gross Potential
 *  is very dependent on water injection capacity, and a separate choke model
 *  can be used to model injection performance» (SPE-36848). La tubería:
 *
 *    agua de los pozos → tratamiento → tanques → bombas de reinyección → inyectores
 *
 *  - agua de los pozos = Σ agua de la prueba vigente de los pozos con prueba:
 *    la misma base del potencial de los pozos y del libro;
 *  - tratamiento y admisión de los inyectores: la capacidad del tren de agua
 *    (`TREN_AGUA`, planta.ts); lo que el demo no tiene va «sin dato»;
 *  - tanques: no tienen caudal, son colchón. El colchón es el MISMO de
 *    diferido.ts: el de la parada abierta de la bomba que lo vacía (el que ya
 *    se reporta: «colchón 1,8 h · aguantó 1,8 h») o, con la bomba en marcha, el
 *    de «si para ahora» (`prediccion`);
 *  - bombas: la capacidad INSTALADA del tren con UNA sola cifra por bomba, la
 *    que usa diferido.ts (89.250 en La Ceiba, lo que deja el cabezal de
 *    disposición); la placa (90.000) va solo como referencia. Así el colchón,
 *    la predicción y la tubería dicen lo mismo. La de reserva no suma, y una
 *    parada no baja la capacidad: es pérdida, no menos tubo (NSTA p. 29); lo que
 *    queda hoy va aparte (`disponibleHoy`).
 *  El tramo con caudal de menor potencial es el que limita el agua. Cada
 *  potencial se dice también en crudo: agua × crudo por barril de agua.
 *
 *  Es la foto de ahora: el nivel de un tanque solo se conoce ahora y al parar
 *  cada bomba. */
import { pozosDe, NIVEL_AHORA } from './pozos'
import { perfilBomba, paradasDe } from './bombas'
import { respaldoDe } from './configuracion'
import { TREN_AGUA } from './planta'
import { crudoAsignado, aguaDePrueba } from './libro'
import { prediccion, paradaMedida, aguaQueMueve, type Versiones } from './diferido'
import { n0 } from './choke'
import type { Contexto } from './causa-senal'
import { AHORA, fechaHora } from './reloj'

export type TramoAgua = 'producida' | 'tratamiento' | 'tanques' | 'bombas' | 'inyectores'
/** Los tramos, en el orden de la tubería. */
export const ORDEN_AGUA: readonly TramoAgua[] = ['producida', 'tratamiento', 'tanques', 'bombas', 'inyectores']
export const NOMBRE_TRAMO_AGUA: Record<TramoAgua, string> = {
  producida: 'Agua de los pozos',
  tratamiento: 'Tratamiento de agua',
  tanques: 'Tanque de agua',
  bombas: 'Bombas de reinyección',
  inyectores: 'Pozos inyectores (disposición)',
}

/** El colchón de un tanque de agua: cuántas horas aguanta antes del alto-alto. */
export interface ColchonAgua {
  horas: number
  rango: [number, number]
  /** El nivel con que se calculó, %. */
  nivelPct: number
  /** `al-parar`: el de la parada abierta de la bomba que lo vacía, con el
   *  nivel al parar (el que ya se reporta). `si-para-ahora`: el de la
   *  predicción, con el nivel de ahora y la bomba en marcha. */
  cuando: 'al-parar' | 'si-para-ahora'
  bomba: string
  /** La parada abierta, si es `al-parar`. */
  evento?: string
  /** Lo que el respaldo no absorbe, bbl/d: lo que llena el tanque. */
  aguaSinSalidaBpd: number
}

/** Una bomba del tren, con lo que se sabe de ella. */
export interface BombaDelTren {
  id: string
  /** La cifra única: lo que da en este campo (la que usa diferido.ts). */
  capacidadBpd: number
  /** La placa, solo como referencia. */
  placaBpd: number
  papel: 'disposicion' | 'recobro'
  reserva: boolean
  nota?: string
  /** Tiene perfil con instrumentos (PLC, medidor, historia): las demás no se ven. */
  instrumentada: boolean
  /** Parada o en marcha según su PLC; una sin instrumento, sin lectura. */
  marcha: 'en-marcha' | 'parada' | 'sin-lectura'
  /** Lo que mueve en marcha: la mediana de su medidor (`aguaQueMueve`, diferido.ts). */
  mueveBpd?: number
  /** Lo que el resto del tren toma de más si ella para (respaldo firmado). */
  respaldoLibreBpd?: number
}

export interface TramoTuberiaAgua {
  tramo: TramoAgua
  nombre: string
  /** Potencial del tramo, bbl/d de agua. Null: sin dato, o el tanque, que no
   *  tiene caudal (es colchón) y no entra al mínimo. */
  potencialBpd: number | null
  /** El mismo potencial en crudo: agua × crudo por barril de agua del campo. */
  crudoBpd: number | null
  /** Lo que le sobra sobre el agua de los pozos, bbl/d de agua. */
  holguraBpd: number | null
  /** Por qué no hay número. */
  sinDato?: string
  fuente: string
  tanques?: Array<{ id: string; nombre: string; capacidadBbl: number; altoAlto: number; nivelPct?: number; colchon?: ColchonAgua; sinColchon?: string }>
  bombas?: BombaDelTren[]
  /** Lo que queda hoy con una bomba parada (el tramo no se angosta). */
  disponibleHoy?: { valor: number; equipo: string; texto: string }
}

export interface TuberiaAgua {
  campoId: string
  /** El instante de la foto, ms. */
  t: number
  /** Agua y crudo de los pozos con prueba (prueba vigente; el crudo, asignado). */
  aguaBpd: number
  crudoBpd: number
  crudoPorAgua: number
  tramos: TramoTuberiaAgua[]
  /** Capacidades del tratamiento y de los inyectores (null: sin dato). */
  tratamientoBpd: number | null
  admisionInyectoresBpd: number | null
  /** El tramo con caudal de menor potencial. Si es el agua de los pozos, la disposición no limita. */
  dominante: TramoAgua
  /** La disposición (no el agua de los pozos) es la que limita en régimen. */
  limita: boolean
  /** El tramo de la disposición más angosto (sin el agua de los pozos). Con un
   *  empate entre las bombas y los inyectores manda el de los inyectores: lo
   *  que deja a cada bomba en su capacidad es el cabezal de disposición. */
  angosto?: TramoAgua
  /** Lo que le sobra a la disposición sobre el agua de los pozos, bbl/d (0 si limita). */
  sobraBpd: number
  /** Agua sin salida en régimen, bbl/d (0 si sobra), y el crudo que eso frena. */
  faltaBpd: number
  crudoQueFrenaBpd: number
  /** Si para la bomba de la línea de este campo: lo que el respaldo no absorbe
   *  y el crudo que se pierde en el orden de TRIM y parejo, como los calcula
   *  diferido.ts (`prediccion`). Si ya está parada, también lo que se está perdiendo. */
  sinUna?: { bomba: string; papel: 'disposicion' | 'recobro'; aguaSinSalidaBpd: number; crudoBpd: number; crudoParejoBpd: number; colchonH?: number; parada: boolean; desde?: Date; perdiendoBpd?: number }
  /** Tramos sin dato en el demo: no se inventan. */
  sinDato: TramoAgua[]
  /** Las frases del panel, sin teoría (U2 §5.3). */
  frases: string[]
  texto: string
}

/** «1,8 h» bajo 10 h; «19 h»; «3,2 d». */
const textoH = (h: number) => (!Number.isFinite(h) ? 'sin límite' : h < 10 ? `${h.toLocaleString('es-CO', { maximumFractionDigits: 1 })} h` : h < 48 ? `${Math.round(h)} h` : `${(h / 24).toLocaleString('es-CO', { maximumFractionDigits: 1 })} d`)
const PALABRA = ['', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez']

/** La tubería del agua de un campo, ahora. `versiones` es el historial de la
 *  configuración firmada: con él, el colchón de una parada abierta se calcula
 *  con el tanque y el respaldo que regían al parar (`paradaMedida`); sin él,
 *  con los de `ctx`. */
export function tuberiaAgua(campoId: string, ctx: Contexto, versiones?: Versiones): TuberiaAgua {
  const t = AHORA.getTime()
  let agua = 0, crudo = 0
  for (const p of pozosDe(campoId)) if (p.pruebas.length) { agua += aguaDePrueba(p, t); crudo += crudoAsignado(p, t) }
  const crudoPorAgua = agua > 0 ? crudo / agua : 0
  const enCrudo = (w: number | null) => (w === null ? null : w * crudoPorAgua)
  const tren = Object.hasOwn(TREN_AGUA, campoId) ? TREN_AGUA[campoId] : undefined
  const fuenteTren = tren?.fuente ?? 'El campo no tiene tren de agua en el esquema de planta: sin dato.'
  const vs: Versiones = versiones ?? [{ fecha: '1970-01-01T00:00:00Z', config: ctx.config }]

  // Las bombas: la cifra única de cada una; la placa, de referencia.
  const bombas: BombaDelTren[] = (tren?.bombas ?? []).map(b => {
    const perfil = perfilBomba(b.id, campoId)
    const respaldo = respaldoDe(ctx.config, campoId, b.id)
    const marcha: BombaDelTren['marcha'] = !perfil ? 'sin-lectura' : paradasDe(b.id, campoId).some(e => !e.fin) ? 'parada' : 'en-marcha'
    return { id: b.id, capacidadBpd: b.capacidadBpd, placaBpd: b.placaBpd, papel: b.papel, reserva: !!b.reserva, ...(b.nota ? { nota: b.nota } : {}),
      instrumentada: !!perfil, marcha, ...(perfil ? { mueveBpd: aguaQueMueve(perfil).bpd } : {}), ...(respaldo ? { respaldoLibreBpd: respaldo.libreBpd } : {}) }
  })
  const enServicio = bombas.filter(b => !b.reserva)
  const capacidad = enServicio.reduce((a, b) => a + b.capacidadBpd, 0)
  const paradas = enServicio.filter(b => b.marcha === 'parada')
  const disponibleHoy = paradas.length ? (() => {
    const valor = capacidad - paradas.reduce((a, b) => a + b.capacidadBpd, 0), equipo = paradas.map(b => b.id).join(', ')
    return { valor, equipo, texto: `hoy, sin ${equipo}: ${n0(valor)} de ${n0(capacidad)} bbl/d de agua` }
  })() : undefined

  // Los tanques: la capacidad y el colchón, el mismo de diferido.ts.
  const tanques: NonNullable<TramoTuberiaAgua['tanques']> = ctx.config.tanques.filter(x => x.campoId === campoId).map(x => {
    const perfil = perfilBomba(x.bomba, campoId)
    const nivel = Object.hasOwn(NIVEL_AHORA, x.id) ? NIVEL_AHORA[x.id] : undefined
    const base = { id: x.id, nombre: x.nombre, capacidadBbl: x.capacidadBbl, altoAlto: x.altoAlto, ...(nivel ? { nivelPct: nivel.pct } : {}) }
    if (!perfil) return { ...base, sinColchon: `${x.bomba} no tiene perfil en este campo: no se sabe cuánta agua saca` }
    if (perfil.papel === 'recobro') return { ...base, sinColchon: 'La bomba es de recobro y la reserva toma toda su agua: si para, el tanque no sube' }
    const abierta = paradasDe(x.bomba, campoId).find(e => !e.fin)
    const medida = abierta?.nivelAlParar ? paradaMedida(abierta, ctx, vs)?.colchon?.previsto : undefined
    if (abierta && medida) return { ...base, colchon: { horas: medida.horas, rango: medida.rango, nivelPct: medida.nivel.pct, cuando: 'al-parar' as const,
      bomba: x.bomba, evento: abierta.id, aguaSinSalidaBpd: medida.aguaSinSalidaBpd } }
    const pr = prediccion(perfil, ctx).colchon
    if (pr) return { ...base, colchon: { horas: pr.horas, rango: pr.rango, nivelPct: pr.nivel.pct, cuando: 'si-para-ahora' as const, bomba: x.bomba, aguaSinSalidaBpd: pr.aguaSinSalidaBpd } }
    return { ...base, sinColchon: 'Sin el nivel del tanque: no se puede calcular el colchón' }
  })

  const tramo = (k: TramoAgua, potencialBpd: number | null, fuente: string, extra: Partial<TramoTuberiaAgua> = {}, sinDato?: string): TramoTuberiaAgua => ({
    tramo: k, nombre: NOMBRE_TRAMO_AGUA[k], potencialBpd, crudoBpd: enCrudo(potencialBpd),
    holguraBpd: potencialBpd === null || k === 'producida' ? null : potencialBpd - agua, fuente, ...(sinDato ? { sinDato } : {}), ...extra,
  })
  const tratamientoBpd = tren?.tratamientoBpd ?? null, admisionInyectoresBpd = tren?.admisionBpd ?? null
  const tramos: TramoTuberiaAgua[] = [
    tramo('producida', agua, 'Σ agua de la prueba vigente de los pozos con prueba (la misma base del potencial de los pozos)'),
    tramo('tratamiento', tratamientoBpd, fuenteTren, {}, tratamientoBpd === null ? 'El demo no trae la capacidad del tratamiento de agua' : undefined),
    tramo('tanques', null, 'Tanques de agua firmados en la configuración: no tienen caudal, son colchón', { tanques },
      tanques.length ? undefined : 'El campo no tiene tanque de agua firmado en la configuración'),
    tramo('bombas', bombas.length ? capacidad : null, `${fuenteTren} La capacidad es la que usa diferido.ts; la placa va de referencia.`,
      { bombas, ...(disponibleHoy ? { disponibleHoy } : {}) }, bombas.length ? undefined : 'El campo no tiene bombas de agua en el esquema'),
    tramo('inyectores', admisionInyectoresBpd, fuenteTren, {}, admisionInyectoresBpd === null ? 'El demo no trae lo que admiten los pozos inyectores' : undefined),
  ]

  // Lo que limita el agua: el menor de los tramos con caudal y dato (el tanque no entra).
  const conCaudal = tramos.filter((x): x is TramoTuberiaAgua & { potencialBpd: number } => x.potencialBpd !== null && x.tramo !== 'tanques')
  const menor = conCaudal.reduce((a, x) => (x.potencialBpd < a.potencialBpd ? x : a), conCaudal[0]!)
  const limita = menor.tramo !== 'producida'
  const disposicion = conCaudal.filter(x => x.tramo !== 'producida')
  const angosto = disposicion.reduce<(typeof disposicion)[number] | undefined>((a, x) => (!a || Math.round(x.potencialBpd) <= Math.round(a.potencialBpd) ? x : a), undefined)
  const faltaBpd = limita ? Math.max(0, agua - menor.potencialBpd) : 0
  const sobraBpd = angosto && !limita ? angosto.potencialBpd - agua : 0

  // Si para la bomba de la línea (la que tiene perfil), como lo dice diferido.ts.
  const linea = enServicio.find(b => b.instrumentada)
  const perfilLinea = linea ? perfilBomba(linea.id, campoId) : undefined
  const pr = perfilLinea ? prediccion(perfilLinea, ctx) : undefined
  const sinUna = linea && pr ? {
    bomba: linea.id, papel: linea.papel, aguaSinSalidaBpd: pr.aguaSinSalidaBpd, crudoBpd: pr.crudoBpd, crudoParejoBpd: pr.crudoParejoBpd,
    ...(pr.colchon ? { colchonH: pr.colchon.horas } : {}), parada: !!pr.parada,
    ...(pr.parada ? { desde: new Date(pr.parada.inicio) } : {}), ...(pr.perdiendo ? { perdiendoBpd: pr.perdiendo.bblDia } : {}),
  } : undefined

  // Las frases del panel (U2 §5.3 y §5.5).
  const frases: string[] = []
  const cuantas = enServicio.length === 1 ? 'Con su bomba' : `Con las ${PALABRA[enServicio.length] ?? n0(enServicio.length)} bombas`
  if (limita) frases.push(`El agua limita: ${NOMBRE_TRAMO_AGUA[menor.tramo].toLowerCase()} deja pasar ${n0(menor.potencialBpd)} bbl/d y los pozos dan ${n0(agua)}; faltan ${n0(faltaBpd)} bbl/d de salida, que frenan ${n0(faltaBpd * crudoPorAgua)} bbl/d de crudo.`)
  else if (angosto) frases.push(`${cuantas}, al agua le sobran ${n0(sobraBpd)} bbl/d.`)
  else frases.push('Sin capacidades del tren de agua en el demo: no se puede decir si el agua limita.')
  if (sinUna && sinUna.papel === 'recobro') frases.push(`Si para ${sinUna.bomba} hoy, no cierra pozos: el agua tiene otra salida. Si sigue parada semanas, el yacimiento pierde presión: eso se trabaría «en el yacimiento».`)
  else if (sinUna && sinUna.aguaSinSalidaBpd <= 0) frases.push(`Si para ${sinUna.bomba}, el respaldo toma toda su agua: no cierra pozos.`)
  else if (sinUna && sinUna.parada) frases.push(`${sinUna.bomba} está parada desde el ${fechaHora(sinUna.desde!)}: quedan ${n0(sinUna.aguaSinSalidaBpd)} bbl/d sin salida y se pierden ${n0(sinUna.perdiendoBpd ?? 0)} bbl/d de crudo.`)
  else if (sinUna) {
    const tk = tanques.find(x => x.colchon)?.colchon
    frases.push(`Si para ${sinUna.bomba}, faltan ${n0(sinUna.aguaSinSalidaBpd)} bbl/d: ${tk ? `el tanque se llena en ${textoH(tk.horas)} y ` : ''}hay que cerrar pozos.`)
  }
  if (sinUna && sinUna.papel === 'disposicion' && sinUna.aguaSinSalidaBpd > 0)
    frases.push(`Cerrando primero los más acuatosos se pierden ${n0(sinUna.crudoBpd)} bbl/d de crudo; cerrando parejo, ${n0(sinUna.crudoParejoBpd)}.`)
  return {
    campoId, t, aguaBpd: agua, crudoBpd: crudo, crudoPorAgua, tramos, tratamientoBpd, admisionInyectoresBpd,
    dominante: menor.tramo, limita, ...(angosto ? { angosto: angosto.tramo } : {}), sobraBpd, faltaBpd, crudoQueFrenaBpd: faltaBpd * crudoPorAgua,
    ...(sinUna ? { sinUna } : {}), sinDato: tramos.filter(x => x.sinDato).map(x => x.tramo), frases, texto: frases.join(' '),
  }
}
