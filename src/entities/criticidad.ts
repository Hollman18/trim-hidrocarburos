/** «Si falla hoy»: lo que le costaría al campo que cada uno de sus equipos
 *  fallara hoy, con su choke, de mayor a menor (CHOKE-COMPLETO §10).
 *
 *  Ese orden decide dónde va el vigía, qué rutas predictivas van primero y qué
 *  repuesto se pide ya. Las mismas cuentas de siempre, sin una nueva:
 *  - bombas de la línea: EXACTAMENTE el costo por falla de diferido.ts
 *    (`costoDeBomba` sobre `prediccion` e `historialDeEquipo`), con el colchón
 *    del tanque cuando aplica. Un mismo número es igual en todas partes;
 *  - electrosumergible y bombeo mecánico: el crudo de su pozo, sin colchón (no
 *    hay tanque que aguante la falla del levantamiento de un pozo); el costo de
 *    una falla de electrosumergible es el de `riesgoAhora` (crudo × horas fuera
 *    promedio ÷ 24, las suyas o las de la flota del campo);
 *  - servicios (subestación, aire, compresor, separador, tratador, tanque de
 *    crudo, LACT): el crudo de los pozos que dependen de ellos según la
 *    topología y que producen ahora. Es una ESTIMACIÓN y se marca: supone que
 *    se cierran todos y no descuenta respaldo, holgura ni tanque de crudo.
 *  Lo de afuera (tercero, frontera) no entra: no es un equipo del campo ni se
 *  le pone vigía. Lo que no se puede medir (una bomba sin perfil, un elemento
 *  sin instrumentar) va aparte, con el porqué: no se le inventa un costo. */
import { pozosDe, pozoDe, estadoAhora, pruebaEn, serviciosDeCampo, LEVANTAMIENTO_NOMBRE, type Pozo } from './pozos'
import { perfilBomba, esBomba, type PerfilBomba } from './bombas'
import { EQUIPOS, equipoEnCampo } from './equipos'
import { prediccion, costoDeBomba, mdtEspDelCampo, riesgoAhora } from './diferido'
import { crudoAsignado, historialDeEquipo, perdidaPorFrecuencia } from './libro'
import { topologiaDe, topologiaDerivada, chokeDeAlcance, n0, type ChokeAnh, type AlcanceElemento, type ChokeDeElemento } from './choke'
import { textoHoras } from './salud'
import type { Contexto } from './causa-senal'
import { AHORA } from './reloj'

export type FamiliaCriticidad = 'bomba' | 'electrosumergible' | 'bombeo-mecanico' | 'pozo' | 'servicio'

export interface CriticidadEquipo {
  campoId: string
  equipo: string
  nombre: string
  familia: FamiliaCriticidad
  /** El choke del equipo: dedicado a un pozo, pozo; compartido, planta. */
  choke: ChokeAnh
  alcance: AlcanceElemento
  /** Pozos que dependen de él, según la topología. */
  servidos: number
  /** Crudo por día que el campo deja de producir si el equipo falla hoy, una
   *  vez agotado el colchón: el criterio del orden (CHOKE-COMPLETO §10). */
  bblDia: number
  /** Horas que aguanta hoy el tanque antes de cerrar pozos (bomba de
   *  disposición con tanque): el mismo colchón de diferido.ts. */
  colchonH?: number
  /** Barriles de una falla típica: en las bombas, EXACTAMENTE `costoDeBomba`;
   *  en la electrosumergible, la cuenta de `riesgoAhora`. Ausente si no hay
   *  historia con qué medir cuánto dura una falla. */
  costoFalla?: number
  costoDe?: 'propio' | 'flota'
  /** De dónde sale el costo de la falla, en palabras. */
  mdtFuente?: string
  /** Supone que se cierran todos los pozos que dependen de él: un techo. */
  estimacion: boolean
  /** Ya está parado (o con la frecuencia bajada): lo que dice ya está pasando. */
  parado: boolean
  /** Si ya está parado, lo que está costando ahora, bbl/d. */
  perdiendoBpd?: number
  /** Una frase en palabras de campo: «Si falla P-201B hoy, el campo pierde 1.426 bbl/d después de 1,8 h de colchón». */
  porque: string
}

export interface CriticidadDelCampo {
  campoId: string
  /** De mayor a menor: bbl/d si falla hoy, luego el costo de una falla. */
  ranking: CriticidadEquipo[]
  /** Elementos del campo que no se pueden medir, y por qué. */
  sinCalcular: Array<{ equipo: string; nombre: string; motivo: string }>
}

/** «1,8 h» bajo 10 h; «19 h»; «3,2 d». */
const textoH = (h: number) => (h < 10 ? `${h.toLocaleString('es-CO', { maximumFractionDigits: 1 })} h` : h < 48 ? `${Math.round(h)} h` : `${(h / 24).toLocaleString('es-CO', { maximumFractionDigits: 1 })} d`)

type Base = Pick<CriticidadEquipo, 'campoId' | 'equipo' | 'choke' | 'alcance' | 'servidos'>

/** La electrosumergible, el bombeo mecánico o el pozo que fluye solo: el crudo de su pozo, sin colchón. */
function dePozo(p: Pozo, base: Base, ctx: Contexto): CriticidadEquipo {
  const e = estadoAhora(p)
  const crudo = crudoAsignado(p)
  const esp = p.levantamiento === 'electrosumergible'
  let costo: Pick<CriticidadEquipo, 'costoFalla' | 'costoDe' | 'mdtFuente'>
  if (esp) {
    // La misma cuenta de `riesgoAhora`: las horas fuera de sus fallas cerradas o, si nunca ha fallado, las de la flota del campo.
    const h = historialDeEquipo(p.campoId, p.id, ctx)
    const mdt = h.mdtH ?? mdtEspDelCampo(p.campoId, ctx)
    costo = mdt === undefined ? { mdtFuente: 'Ninguna electrosumergible del campo tiene fallas cerradas: no hay duración típica' }
      : { costoFalla: crudo * mdt / 24, costoDe: h.mdtH !== undefined ? 'propio' : 'flota',
        mdtFuente: h.mdtH !== undefined ? `${textoHoras(h.mdtH)} fuera, el promedio de ${h.fallasCerradas === 1 ? 'su falla cerrada' : `sus ${h.fallasCerradas} fallas cerradas`}`
          : `${textoHoras(mdt)} fuera, el promedio de las electrosumergibles del campo (esta no ha fallado)` }
  } else costo = { mdtFuente: p.levantamiento === 'bombeo-mecanico' ? 'El bombeo mecánico no tiene historia de fallas en TRIM: no hay duración típica con qué medirla' : 'Un pozo que fluye solo no tiene levantamiento que falle' }
  const parado = !!e.evento
  const perdiendo = parado ? crudo * (e.produce ? perdidaPorFrecuencia(e.hz, pruebaEn(p, AHORA.getTime())?.hz) : 1) : undefined
  const porque = !p.pruebas.length ? `${p.id} no tiene prueba: no se le inventa caudal`
    : parado ? `${p.id} ya está ${e.produce ? 'con la frecuencia bajada' : 'parado'}: se pierden ${n0(perdiendo ?? 0)} bbl/d ahora`
      : `Si ${p.id} falla hoy, se pierden sus ${n0(crudo)} bbl/d: no hay tanque que aguante`
  return { ...base, nombre: `${p.id} · ${LEVANTAMIENTO_NOMBRE[p.levantamiento].toLowerCase()}`,
    familia: esp ? 'electrosumergible' : p.levantamiento === 'bombeo-mecanico' ? 'bombeo-mecanico' : 'pozo',
    bblDia: crudo, ...costo, estimacion: false, parado, ...(perdiendo !== undefined ? { perdiendoBpd: perdiendo } : {}), porque }
}

/** Una bomba de la línea: la predicción y el costo por falla de diferido.ts, tal cual. */
function deBomba(p: PerfilBomba, base: Base, ctx: Contexto): CriticidadEquipo {
  const pr = prediccion(p, ctx)
  const cf = costoDeBomba(p, pr, historialDeEquipo(p.campoId, p.equipo, ctx))
  const colchonH = cf.colchonH ?? (p.papel === 'disposicion' && pr.aguaSinSalidaBpd > 0 ? pr.colchon?.horas : undefined)
  const parado = !!pr.parada
  const perdiendo = pr.perdiendo?.bblDia
  const siFalla = p.papel === 'recobro' ? `${p.equipo} inyecta para recobro: si falla hoy no cierra pozos; baja la presión del yacimiento en semanas`
    : p.papel === 'disposicion' && pr.aguaSinSalidaBpd <= 0 ? `Si falla ${p.equipo} hoy, el respaldo toma toda su agua: no cierra pozos`
      : p.papel === 'transporte' ? `Si falla ${p.equipo} hoy, se frenan ${pr.orden?.pasos.length ?? p.pozos?.length ?? 0} pozos que mueve: ${n0(pr.crudoBpd)} bbl/d`
        : `Si falla ${p.equipo} hoy, el campo pierde ${n0(pr.crudoBpd)} bbl/d${colchonH !== undefined ? ` después de ${textoH(colchonH)} de colchón` : ''}`
  return { ...base, nombre: EQUIPOS[p.equipo]?.nombre ?? p.equipo, familia: 'bomba', bblDia: pr.crudoBpd,
    ...(colchonH !== undefined ? { colchonH } : {}), ...(cf.costoFalla !== undefined ? { costoFalla: cf.costoFalla } : {}),
    ...(cf.costoDe ? { costoDe: cf.costoDe } : {}), ...(cf.mdtFuente ? { mdtFuente: cf.mdtFuente } : {}),
    estimacion: false, parado, ...(perdiendo !== undefined ? { perdiendoBpd: perdiendo } : {}),
    // Ya parada: lo que cuesta ahora (los pozos que se cerraron por ella) y lo
    // que costaría cerrando en el orden de TRIM (`prediccion.crudoBpd`).
    porque: parado && p.papel !== 'recobro' && pr.crudoBpd > 0
      ? `${p.equipo} está parada: se pierden ${n0(perdiendo ?? 0)} bbl/d ahora; cerrando en el orden de TRIM serían ${n0(pr.crudoBpd)}`
      : parado ? `${p.equipo} está parada. ${siFalla}` : siFalla }
}

/** Un servicio o un equipo de proceso compartido: el crudo de los pozos que
 *  dependen de él y producen ahora. Estimación: supone que se cierran todos. */
function deServicio(e: ChokeDeElemento, base: Base, ctx: Contexto): CriticidadEquipo {
  const servidos = new Set(e.pozos ?? pozosDe(base.campoId).map(p => p.id))
  const produciendo = pozosDe(base.campoId).filter(p => servidos.has(p.id) && estadoAhora(p).produce)
  const bbl = produciendo.reduce((a, p) => a + crudoAsignado(p), 0)
  const eq = Object.hasOwn(EQUIPOS, e.elemento) ? equipoEnCampo(e.elemento, base.campoId) : undefined
  const respaldo = eq?.redundancia && !/sin respaldo/i.test(eq.redundancia) ? eq.redundancia : undefined
  const caido = serviciosDeCampo(base.campoId).some(s => s.equipo === e.elemento && !s.fin)
  const perdiendo = caido ? riesgoAhora([base.campoId], ctx).find(r => r.equipo === e.elemento && r.estado === 'perdiendo')?.bblDia : undefined
  return { ...base, nombre: eq?.nombre ?? `Alimentador ${e.elemento}`, familia: 'servicio', bblDia: bbl, estimacion: true, parado: caido,
    ...(perdiendo !== undefined ? { perdiendoBpd: perdiendo } : {}),
    porque: `Si ${e.elemento} cae hoy, se frenan los ${produciendo.length} pozos que producen y dependen de él: hasta ${n0(bbl)} bbl/d (estimación${respaldo ? `; tiene respaldo declarado: ${respaldo}` : ''})` }
}

/* Se pide por cada pantalla de confiabilidad: una vez por contexto y campo. */
const MEMO = new WeakMap<Contexto, Map<string, CriticidadDelCampo>>()

/** «Si falla hoy» de todos los equipos de un campo, de mayor a menor. */
export function criticidadDelCampo(campoId: string, ctx: Contexto): CriticidadDelCampo {
  let m = MEMO.get(ctx)
  if (!m) MEMO.set(ctx, m = new Map())
  const ya = m.get(campoId)
  if (ya) return ya
  // Los nombres y la clase de cada elemento, de la topología derivada del registro.
  const demo = new Map(topologiaDerivada(campoId).map(e => [e.elemento, e]))
  const alimentadores = new Set(pozosDe(campoId).map(p => p.alimentador))
  const ranking: CriticidadEquipo[] = []
  const sinCalcular: CriticidadDelCampo['sinCalcular'] = []
  for (const e of topologiaDe(campoId, ctx)) {
    // Lo de afuera no es un equipo del campo.
    if (e.alcance === 'tercero' || e.alcance === 'frontera') continue
    const base: Base = { campoId, equipo: e.elemento, choke: chokeDeAlcance(e.alcance), alcance: e.alcance, servidos: new Set(e.pozos ?? []).size }
    const pozo = pozoDe(campoId, e.elemento)
    if (pozo) { ranking.push(dePozo(pozo, base, ctx)); continue }
    const perfil = perfilBomba(e.elemento, campoId)
    if (perfil) { ranking.push(deBomba(perfil, base, ctx)); continue }
    const nombre = EQUIPOS[e.elemento]?.nombre ?? demo.get(e.elemento)?.nombre ?? e.elemento
    // Una bomba sin perfil en el campo: no se sabe cuánta agua mueve ni cuánto le duran las fallas.
    if (esBomba(e.elemento) || demo.get(e.elemento)?.clase === 'bomba') {
      sinCalcular.push({ equipo: e.elemento, nombre, motivo: 'Bomba sin perfil en este campo: no se sabe cuánta agua mueve ni cuánto duran sus fallas' })
      continue
    }
    if (Object.hasOwn(EQUIPOS, e.elemento) || alimentadores.has(e.elemento)) { ranking.push(deServicio(e, base, ctx)); continue }
    sinCalcular.push({ equipo: e.elemento, nombre, motivo: 'Sin instrumentar en TRIM: no hay con qué medir su falla' })
  }
  ranking.sort(orden)
  const r = { campoId, ranking, sinCalcular }
  m.set(campoId, r)
  return r
}

/** De mayor a menor: bbl/d si falla hoy; luego el costo de una falla; luego el código. */
const orden = (a: CriticidadEquipo, b: CriticidadEquipo) =>
  b.bblDia - a.bblDia || (b.costoFalla ?? -1) - (a.costoFalla ?? -1) || (a.equipo < b.equipo ? -1 : a.equipo > b.equipo ? 1 : 0)

/** «Si falla hoy» de varios campos juntos, de mayor a menor. */
export const criticidad = (campoIds: string[], ctx: Contexto): CriticidadEquipo[] =>
  campoIds.flatMap(c => criticidadDelCampo(c, ctx).ranking).sort(orden)
