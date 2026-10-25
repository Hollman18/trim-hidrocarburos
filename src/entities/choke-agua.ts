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
 *    la misma base del potencial de los pozos; el agua se pasa a crudo con el
 *    crudo de esas mismas pruebas (× el factor de medición, D3), nunca con el
 *    factor de asignación del mes;
 *  - tratamiento y admisión de los inyectores: las capacidades firmadas o, sin
 *    firma, las del demo (capacidades.ts, `capacidadesDe`); lo que el demo no
 *    tiene va «sin dato»;
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
import { pozosDe, pruebaEn, NIVEL_AHORA } from './pozos'
import { perfilBomba, paradasDe } from './bombas'
import { respaldoDe } from './configuracion'
import { aguaDePrueba } from './libro'
import { prediccion, paradaMedida, aguaQueMueve, ordenDeCierre, caudalesAhora, type Versiones } from './diferido'
import { n0, PARAMETROS_CHOKE, factorMedicion, listaY, mayuscula, type EstadoTramo } from './choke'
import { CAMPOS_DE_GAS } from './planta'
import { campoPorId } from './campos'
import { capacidadesDe, type FuenteCapacidad } from './capacidades'
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
/** Lo que falta de un tramo sin número, dicho en una frase (B-18). */
const FALTA_TRAMO_AGUA: Record<TramoAgua, string> = {
  producida: 'el agua de los pozos', tratamiento: 'la capacidad del tratamiento de agua', tanques: 'el tanque de agua',
  bombas: 'la capacidad de las bombas', inyectores: 'la admisión de los inyectores',
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
  /** Su capacidad: firmada o dato del demo, y de dónde sale, en palabras. */
  estado: 'firmado' | 'demo'
  fuente: string
  fuenteFirmada?: FuenteCapacidad
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
  /** De dónde sale el número, en palabras (nunca un nombre del código). */
  fuente: string
  /** De las pruebas (el agua de los pozos), firmado, dato del demo o sin dato. */
  estado: EstadoTramo
  /** A menos del umbral de «casi iguales» del tramo de la disposición más angosto (él incluido). */
  casiIgual: boolean
  tanques?: Array<{ id: string; nombre: string; capacidadBbl: number; altoAlto: number; nivelPct?: number; colchon?: ColchonAgua; sinColchon?: string }>
  bombas?: BombaDelTren[]
  /** Lo que queda hoy con una bomba parada (el tramo no se angosta). */
  disponibleHoy?: { valor: number; equipo: string; texto: string }
}

export interface TuberiaAgua {
  campoId: string
  /** El instante de la foto, ms. */
  t: number
  /** Agua y crudo de los pozos con prueba (prueba vigente; el crudo, × el factor de medición, D3). */
  aguaBpd: number
  crudoBpd: number
  /** El crudo que trae cada barril de agua según las pruebas. En un campo de gas, 0: su agua no se pasa a crudo (B-18). */
  crudoPorAgua: number
  /** Un campo de gas: el agua se dice en agua, sin «≈ de crudo» (B-18; PLAN-MAESTRO §3). */
  campoDeGas: boolean
  tramos: TramoTuberiaAgua[]
  /** Capacidades del tratamiento y de los inyectores (null: sin dato). */
  tratamientoBpd: number | null
  admisionInyectoresBpd: number | null
  /** El tramo con caudal de menor potencial. Si es el agua de los pozos, la disposición no limita. */
  dominante: TramoAgua
  /** La disposición (no el agua de los pozos) es la que limita en régimen. Solo
   *  se dice con todos los tramos de la disposición con número (`faltanParaDecir` vacío). */
  limita: boolean
  /** El tramo de la disposición más angosto (sin el agua de los pozos). Con un
   *  empate entre las bombas y los inyectores manda el de los inyectores: lo
   *  que deja a cada bomba en su capacidad es el cabezal de disposición. */
  angosto?: TramoAgua
  /** Los tramos de la disposición a menos del umbral del más angosto (U2 §0,
   *  principio 7), o null si el más angosto gana por más del umbral. */
  casiIguales: TramoAgua[] | null
  /** Dos tramos de la disposición que dan exactamente lo mismo al barril (U2 §1.5, «Empate exacto»). */
  empate: boolean
  /** Los tramos de la disposición sin número: mientras falten, no se puede
   *  decir que uno limita (B-18) y lo que cabe se dice sin contarlos. */
  faltanParaDecir: TramoAgua[]
  /** Lo que le sobra a la disposición sobre el agua de los pozos, bbl/d (0 si limita). */
  sobraBpd: number
  /** Agua sin salida en régimen, bbl/d (0 si sobra), y el crudo que eso frena. */
  faltaBpd: number
  crudoQueFrenaBpd: number
  /** Si para la bomba de la línea de este campo: lo que el respaldo no absorbe
   *  y el crudo que se pierde en el orden de TRIM y parejo, como los calcula
   *  diferido.ts (`prediccion`). Si ya está parada, también lo que se está perdiendo. */
  sinUna?: { bomba: string; papel: 'disposicion' | 'recobro'; aguaSinSalidaBpd: number; crudoBpd: number; crudoParejoBpd: number; colchonH?: number; parada: boolean; desde?: Date; perdiendoBpd?: number }
  /** Con una bomba del tren ya parada: lo de hoy y lo que pasa si para OTRA de
   *  las que quedan (B-01; U2 §9.6, «LA TUBERÍA DEL AGUA, HOY»). Lo que entra
   *  ahora, lo que caben las que siguen en marcha y, si para la mayor de ellas,
   *  el agua sin salida, el colchón con el nivel de ahora y el orden de cierre
   *  de TRIM (`ordenDeCierre`): la misma cuenta del «si falla hoy» de sus
   *  hermanas (`criticidad.ts`). Ausente con todas en marcha. */
  siParaOtra?: SiParaOtra
  /** Tramos sin dato en el demo: no se inventan. */
  sinDato: TramoAgua[]
  /** Las frases del panel, sin teoría (U2 §5.3). */
  frases: string[]
  texto: string
}

/** Con una bomba ya parada, lo que pasa si para otra (B-01). */
export interface SiParaOtra {
  /** Las que siguen en marcha (las sin instrumento se suponen en marcha). */
  enMarcha: string[]
  /** Lo que entra ahora y lo que caben las que siguen en marcha, bbl/d de agua. */
  entraBpd: number
  cabenBpd: number
  /** La que se supone que para (la de más capacidad de las que siguen). */
  bomba: string
  aguaSinSalidaBpd: number
  /** Horas hasta el alto-alto con el nivel de ahora (sin nivel, ausente). */
  colchonH?: number
  /** El orden de cierre: primero los que menos crudo pierden por barril de agua. */
  pasos: Array<{ pozo: string; fraccion: number; crudoPorAgua: number }>
  crudoBpd: number
  crudoParejoBpd: number
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
  const fm = factorMedicion(campoId, ctx.config)
  const campoDeGas = CAMPOS_DE_GAS.includes(campoId)
  let agua = 0, crudo = 0
  for (const p of pozosDe(campoId)) if (p.pruebas.length) { agua += aguaDePrueba(p, t); crudo += (pruebaEn(p, t)?.crudoBpd ?? 0) * fm }
  const crudoPorAgua = agua > 0 && !campoDeGas ? crudo / agua : 0
  const enCrudo = (w: number | null) => (w === null || campoDeGas ? null : w * crudoPorAgua)
  const vs: Versiones = versiones ?? [{ fecha: '1970-01-01T00:00:00Z', config: ctx.config }]
  // Las capacidades que rigen: las firmadas y, donde no, las del demo (capacidades.ts).
  const cap = capacidadesDe(ctx.config, campoId)

  // Las bombas: la cifra única de cada una (firmada o del demo); la placa, de referencia.
  const bombas: BombaDelTren[] = cap.bombas.map(b => {
    const perfil = perfilBomba(b.equipo, campoId)
    const respaldo = respaldoDe(ctx.config, campoId, b.equipo)
    const marcha: BombaDelTren['marcha'] = !perfil ? 'sin-lectura' : paradasDe(b.equipo, campoId).some(e => !e.fin) ? 'parada' : 'en-marcha'
    return { id: b.equipo, capacidadBpd: b.valor, placaBpd: b.placa, papel: b.papel, reserva: b.reserva, ...(b.nota ? { nota: b.nota } : {}),
      instrumentada: !!perfil, marcha, ...(perfil ? { mueveBpd: aguaQueMueve(perfil).bpd } : {}), ...(respaldo ? { respaldoLibreBpd: respaldo.libreBpd } : {}),
      estado: b.estado, fuente: b.fuente, ...(b.fuenteFirmada ? { fuenteFirmada: b.fuenteFirmada } : {}) }
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

  const tramo = (k: TramoAgua, potencialBpd: number | null, fuente: string, estado: EstadoTramo, extra: Partial<TramoTuberiaAgua> = {}, sinDato?: string): TramoTuberiaAgua => ({
    tramo: k, nombre: NOMBRE_TRAMO_AGUA[k], potencialBpd, crudoBpd: enCrudo(potencialBpd),
    holguraBpd: potencialBpd === null || k === 'producida' ? null : potencialBpd - agua, fuente, estado, casiIgual: false, ...(sinDato ? { sinDato } : {}), ...extra,
  })
  const tratamientoBpd = cap.tratamiento.valor, admisionInyectoresBpd = cap.admision.valor
  // Las bombas: firmadas si todas las que están en servicio lo están.
  const estadoBombas: EstadoTramo = !enServicio.length ? 'sin-dato' : enServicio.every(b => b.estado === 'firmado') ? 'firmado' : 'demo'
  const tramos: TramoTuberiaAgua[] = [
    tramo('producida', agua, 'La suma del agua de los pozos con su prueba vigente: la misma base de lo que pueden dar los pozos', 'pruebas'),
    tramo('tratamiento', tratamientoBpd, cap.tratamiento.fuente, cap.tratamiento.estado, {}, tratamientoBpd === null ? cap.tratamiento.fuente : undefined),
    tramo('tanques', null, 'Los tanques de agua de la configuración firmada: no tienen caudal, son colchón', tanques.length ? 'firmado' : 'sin-dato', { tanques },
      tanques.length ? undefined : 'El campo no tiene tanque de agua firmado en la configuración'),
    tramo('bombas', bombas.length ? capacidad : null,
      bombas.length ? `La suma de las bombas en servicio (la de reserva no suma), con la cifra de cada una en este campo: la placa, o lo que deja el cabezal de disposición. ${estadoBombas === 'firmado' ? 'Firmadas' : 'Dato del demo, sin firmar'}; la placa va solo de referencia` : 'El campo no tiene bombas de agua en el esquema',
      estadoBombas, { bombas, ...(disponibleHoy ? { disponibleHoy } : {}) }, bombas.length ? undefined : 'El campo no tiene bombas de agua en el esquema'),
    tramo('inyectores', admisionInyectoresBpd, cap.admision.fuente, cap.admision.estado, {}, admisionInyectoresBpd === null ? cap.admision.fuente : undefined),
  ]

  // Lo que limita el agua: el menor de los tramos con caudal y dato (el tanque
  // no entra). Si a la disposición le falta el número de un tramo, no se puede
  // decir que la disposición limita: ese tramo podría ser más angosto (B-18).
  const conCaudal = tramos.filter((x): x is TramoTuberiaAgua & { potencialBpd: number } => x.potencialBpd !== null && x.tramo !== 'tanques')
  const menor = conCaudal.reduce((a, x) => (x.potencialBpd < a.potencialBpd ? x : a), conCaudal[0]!)
  const faltanParaDecir = tramos.filter(x => x.tramo !== 'producida' && x.tramo !== 'tanques' && x.potencialBpd === null).map(x => x.tramo)
  const limita = menor.tramo !== 'producida' && !faltanParaDecir.length
  const disposicion = conCaudal.filter(x => x.tramo !== 'producida')
  const angosto = disposicion.reduce<(typeof disposicion)[number] | undefined>((a, x) => (!a || Math.round(x.potencialBpd) <= Math.round(a.potencialBpd) ? x : a), undefined)
  const faltaBpd = limita ? Math.max(0, agua - menor.potencialBpd) : 0
  const sobraBpd = angosto && menor.tramo === 'producida' ? angosto.potencialBpd - agua : 0
  // «Casi iguales» dentro de la disposición, con el mismo umbral de la tubería del
  // campo; dos al barril son un empate exacto, que se dice como tal (U2 §1.5; B-16).
  const umbral = PARAMETROS_CHOKE.umbralCasiIguales
  const cerca = angosto && angosto.potencialBpd > 0 ? disposicion.filter(x => (x.potencialBpd - angosto.potencialBpd) / angosto.potencialBpd < umbral).map(x => x.tramo) : []
  const casiIguales = cerca.length > 1 ? cerca : null
  if (casiIguales) for (const x of tramos) x.casiIgual = casiIguales.includes(x.tramo)
  const empatados = angosto ? disposicion.filter(x => Math.round(x.potencialBpd) === Math.round(angosto.potencialBpd)).map(x => x.tramo) : []
  const empate = empatados.length > 1
  const nombres = (ks: readonly TramoAgua[]) => listaY(ks.map(k => NOMBRE_TRAMO_AGUA[k].toLowerCase().replace(/ \(disposición\)$/, '')))
  const queFalta = (ks: readonly TramoAgua[]) => listaY(ks.map(k => FALTA_TRAMO_AGUA[k]))

  // Si para la bomba de la línea (la que tiene perfil), como lo dice diferido.ts.
  const linea = enServicio.find(b => b.instrumentada)
  const perfilLinea = linea ? perfilBomba(linea.id, campoId) : undefined
  const pr = perfilLinea ? prediccion(perfilLinea, ctx) : undefined
  const sinUna = linea && pr ? {
    bomba: linea.id, papel: linea.papel, aguaSinSalidaBpd: pr.aguaSinSalidaBpd, crudoBpd: pr.crudoBpd, crudoParejoBpd: pr.crudoParejoBpd,
    ...(pr.colchon ? { colchonH: pr.colchon.horas } : {}), parada: !!pr.parada,
    ...(pr.parada ? { desde: new Date(pr.parada.inicio) } : {}), ...(pr.perdiendo ? { perdiendoBpd: pr.perdiendo.bblDia } : {}),
  } : undefined

  // Con una bomba ya parada: si para otra de las que quedan (B-01). La misma
  // cuenta del «si falla hoy» de las hermanas (criticidad.ts, `deHermana`): lo que
  // entra ahora, menos lo que toman las que quedarían; agotado el colchón, se
  // cierra en el orden de TRIM. Una sin instrumento se supone en marcha.
  const enMarcha = enServicio.filter(b => b.marcha !== 'parada')
  const siParaOtra: SiParaOtra | undefined = paradas.length && enMarcha.length ? (() => {
    const entraBpd = caudalesAhora(campoId).agua
    const cabenBpd = enMarcha.reduce((a, b) => a + b.capacidadBpd, 0)
    const mayor = enMarcha.reduce((a, b) => (b.capacidadBpd > a.capacidadBpd ? b : a))
    const aguaSinSalidaBpd = Math.max(0, entraBpd - (cabenBpd - mayor.capacidadBpd))
    const o = aguaSinSalidaBpd > 0 ? ordenDeCierre(campoId, aguaSinSalidaBpd, t) : undefined
    const tk = ctx.config.tanques.find(x => x.campoId === campoId)
    const nivel = tk && Object.hasOwn(NIVEL_AHORA, tk.id) ? NIVEL_AHORA[tk.id] : undefined
    const colchonH = tk && nivel && aguaSinSalidaBpd > 0 ? Math.max(0, (tk.altoAlto - nivel.pct / 100) * tk.capacidadBbl) / (aguaSinSalidaBpd / 24) : undefined
    return { enMarcha: enMarcha.map(b => b.id), entraBpd, cabenBpd, bomba: mayor.id, aguaSinSalidaBpd, ...(colchonH !== undefined ? { colchonH } : {}),
      pasos: (o?.pasos ?? []).map(x => ({ pozo: x.pozo.id, fraccion: x.fraccion, crudoPorAgua: x.crudoPorAgua })),
      crudoBpd: o?.crudoBpd ?? 0, crudoParejoBpd: o?.crudoParejoBpd ?? 0 }
  })() : undefined

  // Las frases del panel (U2 §5.3 y §5.5), sin teoría.
  const frases: string[] = []
  const cuantas = enServicio.length === 1 ? 'Con su bomba' : `Con las ${PALABRA[enServicio.length] ?? n0(enServicio.length)} bombas`
  const sinContar = faltanParaDecir.length ? ` (sin contar ${queFalta(faltanParaDecir)}: ${faltanParaDecir.length === 1 ? 'no tiene' : 'no tienen'} dato)` : ''
  if (campoDeGas) frases.push(`${campoPorId(campoId).nombre} es un campo de gas: su agua se dice en agua, sin pasarla a crudo.`)
  if (limita) frases.push(`El agua limita: ${NOMBRE_TRAMO_AGUA[menor.tramo].toLowerCase()} deja pasar ${n0(menor.potencialBpd)} bbl/d y los pozos dan ${n0(agua)}; faltan ${n0(faltaBpd)} bbl/d de salida${campoDeGas ? '' : `, que frenan ${n0(faltaBpd * crudoPorAgua)} bbl/d de crudo`}.`)
  else if (menor.tramo !== 'producida') frases.push(`No se puede decir qué limita el agua: falta ${queFalta(faltanParaDecir)}. La firma el administrador.`)
  else if (angosto) frases.push(`${cuantas}, cabe más agua: ${n0(sobraBpd)} bbl/d${sinContar}.`)
  else frases.push('Sin capacidades del tren de agua en el demo: no se puede decir si el agua limita.')
  // Dos tramos iguales al barril o casi iguales: se dice con quién (B-16).
  // Un empate con la admisión sin firmar es del dato del demo (la deduce del mismo límite del cabezal): se dice;
  // con todo firmado, producción tiene que explicarlo (NSTA §5.4).
  const delDemo = empatados.includes('inyectores') && cap.admision.estado !== 'firmado'
  if (empate) frases.push(`${mayuscula(nombres(empatados))} dan exactamente lo mismo: ${n0(angosto!.potencialBpd)} bbl/d. Lo que se gane en uno lo frena el otro; ${delDemo ? 'la admisión de los inyectores no está firmada: el demo la deduce del mismo límite del cabezal que deja a cada bomba en su capacidad' : 'producción tiene que explicar por qué (lo pide el método)'}.`)
  else if (casiIguales) frases.push(`${mayuscula(nombres(casiIguales))} están casi iguales (menos de ${(umbral * 100).toLocaleString('es-CO', { maximumFractionDigits: 1 })} % de diferencia): lo que se gane en uno lo frena el otro.`)
  const tk = tanques.find(x => x.colchon)?.colchon
  const llena = (n: number) => `faltan ${n0(n)} bbl/d de salida: ${tk ? `el tanque se llena en ${textoH(tk.horas)} y ` : ''}hay que cerrar pozos`
  if (sinUna && sinUna.papel === 'recobro') frases.push(`Si para ${sinUna.bomba} hoy, no cierra pozos: el agua tiene otra salida. Si sigue parada semanas, el yacimiento pierde presión: eso se trabaría «en el yacimiento».`)
  else if (sinUna && sinUna.aguaSinSalidaBpd <= 0) frases.push(`Si para ${sinUna.bomba}, el respaldo toma toda su agua: no cierra pozos.`)
  else if (sinUna && sinUna.parada) {
    // En condicional lo de «si para» y en pasado lo que ya pasó: con los pozos ya cerrados, el nivel no sube (B-17).
    const cerrados = pr?.perdiendo?.pozos.map(w => w.id).sort() ?? []
    frases.push(`Si para una con todos los pozos produciendo, ${llena(sinUna.aguaSinSalidaBpd)}.`)
    frases.push(`${sinUna.bomba} está parada desde el ${fechaHora(sinUna.desde!)}: ${cerrados.length ? `se ${cerrados.length === 1 ? 'cerró' : 'cerraron'} ${listaY(cerrados)} y ` : ''}se pierden ${n0(sinUna.perdiendoBpd ?? 0)} bbl/d de crudo.`)
  } else if (sinUna) frases.push(`Si para ${sinUna.bomba}, ${llena(sinUna.aguaSinSalidaBpd)}.`)
  if (sinUna && sinUna.papel === 'disposicion' && sinUna.aguaSinSalidaBpd > 0)
    frases.push(`Cerrando primero los más acuatosos se pierden ${n0(sinUna.crudoBpd)} bbl/d de crudo; cerrando parejo, ${n0(sinUna.crudoParejoBpd)}.`)
  return {
    campoId, t, aguaBpd: agua, crudoBpd: crudo, crudoPorAgua, campoDeGas, tramos, tratamientoBpd, admisionInyectoresBpd,
    dominante: menor.tramo, limita, ...(angosto ? { angosto: angosto.tramo } : {}), casiIguales, empate, faltanParaDecir, sobraBpd, faltaBpd, crudoQueFrenaBpd: faltaBpd * crudoPorAgua,
    ...(sinUna ? { sinUna } : {}), ...(siParaOtra ? { siParaOtra } : {}), sinDato: tramos.filter(x => x.sinDato).map(x => x.tramo), frases, texto: frases.join(' '),
  }
}
