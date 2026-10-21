/** La tubería del agua de cada campo: el modelo choke de inyección
 *  (CHOKE-COMPLETO §9).
 *
 *  En un campo de 92–97 % de agua, el estrecho suele ser el agua en planta. Lo
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
 *  - bombas: la capacidad INSTALADA del tren, la placa de las que están en
 *    servicio (la de reserva no suma). Una parada no la baja: la parada es
 *    brecha, no capacidad (NSTA p. 29).
 *  El dominante del agua es el tramo con caudal de menor potencial. Cada
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
import { AHORA } from './reloj'

export type TramoAgua = 'producida' | 'tratamiento' | 'tanques' | 'bombas' | 'inyectores'
/** Los tramos, en el orden de la tubería. */
export const ORDEN_AGUA: readonly TramoAgua[] = ['producida', 'tratamiento', 'tanques', 'bombas', 'inyectores']
export const NOMBRE_TRAMO_AGUA: Record<TramoAgua, string> = {
  producida: 'Agua de los pozos',
  tratamiento: 'Tratamiento de agua',
  tanques: 'Tanques de agua',
  bombas: 'Bombas de reinyección',
  inyectores: 'Pozos inyectores (disposición)',
}
/** Dentro de una frase: «a los pozos inyectores les sobran…». */
const DATIVO: Record<TramoAgua, string> = {
  producida: 'a los pozos les', tratamiento: 'al tratamiento le', tanques: 'a los tanques les',
  bombas: 'a las bombas les', inyectores: 'a los pozos inyectores les',
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

/** Una bomba del tren, con lo que el demo sabe de ella. */
export interface BombaDelTren {
  id: string
  placaBpd: number
  reserva: boolean
  papel?: string
  /** Tiene perfil firmado en el campo (PLC, medidor, historia): las demás no se miden. */
  perfil: boolean
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
  /** El tramo con caudal de menor potencial. Si es el agua de los pozos, la disposición no limita. */
  dominante: TramoAgua
  /** La disposición (no el agua de los pozos) es la que limita en régimen. */
  limita: boolean
  /** Agua sin salida en régimen, bbl/d (0 si sobra), y el crudo que eso frena. */
  faltaBpd: number
  crudoQueFrenaBpd: number
  /** Si para la bomba de la línea de este campo: lo que el respaldo no absorbe
   *  y el crudo que se pierde en el orden de TRIM, como los calcula diferido.ts
   *  (`prediccion`). Si ya está parada, también lo que se está perdiendo. */
  sinUna?: { bomba: string; aguaSinSalidaBpd: number; crudoBpd: number; colchonH?: number; parada: boolean; perdiendoBpd?: number }
  /** Tramos sin dato en el demo: no se inventan. */
  sinDato: TramoAgua[]
  texto: string
}

/** «1,8 h» bajo 10 h; «19 h»; «3,2 d». */
const textoH = (h: number) => (!Number.isFinite(h) ? 'sin límite' : h < 10 ? `${h.toLocaleString('es-CO', { maximumFractionDigits: 1 })} h` : h < 48 ? `${Math.round(h)} h` : `${(h / 24).toLocaleString('es-CO', { maximumFractionDigits: 1 })} d`)

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

  // Las bombas: la placa de las que están en servicio.
  const bombas: BombaDelTren[] = (tren?.bombas ?? []).map(b => {
    const perfil = perfilBomba(b.id, campoId)
    const respaldo = respaldoDe(ctx.config, campoId, b.id)
    return { id: b.id, placaBpd: b.placaBpd, reserva: !!b.reserva, ...(b.papel ? { papel: b.papel } : {}), perfil: !!perfil,
      ...(perfil ? { mueveBpd: aguaQueMueve(perfil).bpd } : {}), ...(respaldo ? { respaldoLibreBpd: respaldo.libreBpd } : {}) }
  })
  const placa = bombas.filter(b => !b.reserva).reduce((a, b) => a + b.placaBpd, 0)

  // Los tanques: la capacidad y el colchón, el mismo de diferido.ts.
  const tanques = ctx.config.tanques.filter(x => x.campoId === campoId).map(x => {
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
  const tramos: TramoTuberiaAgua[] = [
    tramo('producida', agua, 'Σ agua de la prueba vigente de los pozos con prueba (la misma base del potencial de los pozos)'),
    tramo('tratamiento', tren?.tratamientoBpd ?? null, fuenteTren, {}, tren?.tratamientoBpd === undefined ? 'El demo no trae la capacidad del tratamiento de agua' : undefined),
    tramo('tanques', null, 'Tanques de agua firmados en la configuración: no tienen caudal, son colchón', { tanques },
      tanques.length ? undefined : 'El campo no tiene tanque de agua firmado en la configuración'),
    tramo('bombas', bombas.length ? placa : null, fuenteTren, { bombas }, bombas.length ? undefined : 'El campo no tiene bombas de agua en el esquema'),
    tramo('inyectores', tren?.admisionBpd ?? null, fuenteTren, {}, tren?.admisionBpd === undefined ? 'El demo no trae lo que admiten los pozos inyectores' : undefined),
  ]

  // El dominante: el menor de los tramos con caudal y dato (el tanque no entra).
  const conCaudal = tramos.filter((x): x is TramoTuberiaAgua & { potencialBpd: number } => x.potencialBpd !== null && x.tramo !== 'tanques')
  const menor = conCaudal.reduce((a, x) => (x.potencialBpd < a.potencialBpd ? x : a), conCaudal[0]!)
  const limita = menor.tramo !== 'producida'
  const faltaBpd = limita ? Math.max(0, agua - menor.potencialBpd) : 0

  // Si para la bomba de la línea (la que tiene perfil de disposición o recobro), como lo dice diferido.ts.
  const linea = bombas.find(b => b.perfil && !b.reserva)
  const pr = linea ? prediccion(perfilBomba(linea.id, campoId)!, ctx) : undefined
  const sinUna = linea && pr ? { bomba: linea.id, aguaSinSalidaBpd: pr.aguaSinSalidaBpd, crudoBpd: pr.crudoBpd, ...(pr.colchon ? { colchonH: pr.colchon.horas } : {}),
    parada: !!pr.parada, ...(pr.perdiendo ? { perdiendoBpd: pr.perdiendo.bblDia } : {}) } : undefined

  const sig = conCaudal.filter(x => x.tramo !== 'producida').sort((a, b) => a.potencialBpd - b.potencialBpd)[0]
  const enRegimen = limita
    ? `El agua limita: ${NOMBRE_TRAMO_AGUA[menor.tramo].toLowerCase()} deja pasar ${n0(menor.potencialBpd)} bbl/d y los pozos dan ${n0(agua)}; faltan ${n0(faltaBpd)} bbl/d de salida, que frenan ${n0(faltaBpd * crudoPorAgua)} bbl/d de crudo`
    : sig ? `El agua no limita con todo el tren en servicio: ${DATIVO[sig.tramo]} sobran ${n0(sig.potencialBpd - agua)} bbl/d de agua (${n0((sig.potencialBpd - agua) * crudoPorAgua)} bbl/d de crudo)`
      : 'Sin capacidades del tren de agua en el demo: no se puede decir si el agua limita'
  const conUna = !sinUna ? ''
    : sinUna.aguaSinSalidaBpd <= 0 ? `. Si para ${sinUna.bomba}, el respaldo toma toda su agua: no cierra pozos`
      : sinUna.parada ? `. ${sinUna.bomba} está parada: quedan ${n0(sinUna.aguaSinSalidaBpd)} bbl/d sin salida y se pierden ${n0(sinUna.perdiendoBpd ?? 0)} bbl/d de crudo`
        : `. Si para ${sinUna.bomba}, quedan ${n0(sinUna.aguaSinSalidaBpd)} bbl/d sin salida: ${n0(sinUna.crudoBpd)} bbl/d de crudo${sinUna.colchonH !== undefined ? ` después de ${textoH(sinUna.colchonH)} de colchón` : ''}`
  return {
    campoId, t, aguaBpd: agua, crudoBpd: crudo, crudoPorAgua, tramos, dominante: menor.tramo, limita, faltaBpd, crudoQueFrenaBpd: faltaBpd * crudoPorAgua,
    ...(sinUna ? { sinUna } : {}), sinDato: tramos.filter(x => x.sinDato).map(x => x.tramo), texto: `${enRegimen}${conUna}`,
  }
}
