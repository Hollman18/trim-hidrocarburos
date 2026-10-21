/** «Si falla hoy»: lo que le costaría al campo que cada uno de sus equipos
 *  fallara hoy, con el tramo donde se trabaría, de mayor a menor
 *  (CHOKE-COMPLETO §10; U2 §6).
 *
 *  Ese orden decide dónde va el vigía, qué rutas predictivas van primero y qué
 *  repuesto se pide ya. Las mismas cuentas de siempre, sin una nueva:
 *  - bombas de la línea con instrumento: EXACTAMENTE el costo por falla de
 *    diferido.ts (`costoDeBomba` sobre `prediccion` e `historialDeEquipo`), con
 *    el colchón del tanque cuando aplica. Un mismo número es igual en todas partes;
 *  - sus hermanas sin instrumento (P-201A y P-201C de La Ceiba): con su perfil
 *    mínimo (`TREN_AGUA`: capacidad y papel, sin tags), el agua que entra ahora
 *    contra lo que dejan pasar las otras bombas en marcha, cerrando en el orden
 *    de TRIM (`ordenDeCierre`) y con el colchón del tanque al nivel de ahora. Si
 *    su hermana está parada, suben: cambia con lo que esté parado (U2 §6.3);
 *  - electrosumergible y bombeo mecánico: el crudo de su pozo, sin colchón (no
 *    hay tanque que aguante la falla del levantamiento de un pozo); el costo de
 *    una falla de electrosumergible es el de `riesgoAhora` (crudo × horas fuera
 *    promedio ÷ 24, las suyas o las de la flota del campo);
 *  - servicios (subestación, aire, compresor, separador, tratador, tanque de
 *    crudo, LACT), estén o no en alarma: la regla de `riesgoAhora`, «se cierra
 *    lo que esté produciendo», con los pozos que dependen de ellos según la
 *    topología. Es una ESTIMACIÓN y se marca: no descuenta respaldo, holgura ni
 *    tanque de crudo.
 *  Lo de afuera (tercero, frontera) no entra: no es un equipo del campo ni se
 *  le pone vigía. Lo que ya está parado tampoco: está en «Perdiéndose ahora».
 *  Lo que no se puede medir va aparte, con el porqué: no se le inventa un costo. */
import { pozosDe, pozoDe, estadoAhora, pruebaEn, serviciosDeCampo, NIVEL_AHORA, LEVANTAMIENTO_NOMBRE, type Pozo } from './pozos'
import { perfilBomba, esBomba, paradasDe, type PerfilBomba } from './bombas'
import { perfilDe } from './configuracion'
import { EQUIPOS, equipoEnCampo } from './equipos'
import { TREN_AGUA } from './planta'
import { prediccion, costoDeBomba, mdtEspDelCampo, riesgoAhora, ordenDeCierre, caudalesAhora } from './diferido'
import { crudoAsignado, historialDeEquipo, perdidaPorFrecuencia } from './libro'
import { topologiaDe, topologiaDerivada, chokeDeAlcance, n0, type ChokeAnh, type AlcanceElemento, type ChokeDeElemento } from './choke'
import { textoHoras } from './salud'
import type { Contexto } from './causa-senal'
import { AHORA } from './reloj'

export type FamiliaCriticidad = 'bomba' | 'electrosumergible' | 'bombeo-mecanico' | 'pozo' | 'servicio'

/** Una fila de «Si falla hoy» (U2 §11.1, `FilaCriticidad`). */
export interface FilaCriticidad {
  campoId: string
  equipo: string
  nombre: string
  familia: FamiliaCriticidad
  /** Dónde se trabaría si falla: el tramo del equipo según la topología. */
  tramo: ChokeAnh
  alcance: AlcanceElemento
  /** Pozos que dependen de él, según la topología. */
  servidos: number
  /** Si falla hoy: el crudo por día que el campo deja de sacar, una vez
   *  agotado el colchón (CHOKE-COMPLETO §10). El criterio del orden. Null: sin dato. */
  bpd: number | null
  /** Horas que aguanta hoy el tanque antes de cerrar pozos. */
  colchonH?: number
  /** Barriles de una falla típica: en las bombas con instrumento, EXACTAMENTE
   *  `costoDeBomba`; en la electrosumergible, la cuenta de `riesgoAhora`.
   *  Ausente sin historia con qué medir cuánto dura una falla. */
  costoFalla?: number
  costoDe?: 'propio' | 'flota'
  /** De dónde sale el costo de la falla, en palabras. */
  mdtFuente?: string
  /** TRIM lo vigila: tiene instrumentos que lee (U2: «¿Lo vigila TRIM?»). */
  vigilado: boolean
  /** Lo que falta para que el número sea cierto, o por qué es un techo. */
  sinDato?: string
  /** Subió porque otro equipo está parado. */
  subio?: { desde: Date; porque: string }
  /** Supone que se cierran todos los pozos que dependen de él: un techo. */
  estimacion: boolean
  /** Ya está parado (o con la frecuencia bajada). */
  parado: boolean
  /** Si ya está parado, lo que está costando ahora, bbl/d. */
  perdiendoBpd?: number
  /** Una frase en palabras de campo: «Si falla P-201B hoy, el campo pierde 783 bbl/d después de 10 h de colchón». */
  porque: string
}

export interface CriticidadDelCampo {
  campoId: string
  /** De mayor a menor (bbl/d si falla hoy; a igual cifra, el de menos colchón), sin lo que ya está parado. */
  ranking: FilaCriticidad[]
  /** Lo que ya está parado: va en «Perdiéndose ahora», no en la lista (U2 §6.3). */
  parados: FilaCriticidad[]
  /** Elementos del campo que no se pueden medir, y por qué. */
  sinCalcular: Array<{ equipo: string; nombre: string; motivo: string }>
  /** La línea que hace dinámica la lista: «Cambió hoy: P-201A y P-201C subieron al puesto 3…». */
  cambioHoy?: string
}

const ahora = AHORA.getTime()
/** «1,8 h» bajo 10 h; «2 min» bajo una hora; «19 h»; «3,2 d». */
const textoH = (h: number) => (h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : h < 10 ? `${h.toLocaleString('es-CO', { maximumFractionDigits: 1 })} h` : h < 48 ? `${Math.round(h)} h` : `${(h / 24).toLocaleString('es-CO', { maximumFractionDigits: 1 })} d`)
const lista = (xs: readonly string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}`)

type Base = Pick<FilaCriticidad, 'campoId' | 'equipo' | 'tramo' | 'alcance' | 'servidos'>

/** ¿Lo vigila TRIM? Una bomba con perfil, o un equipo del registro con instrumentos en este campo. */
const vigiladoEn = (id: string, campoId: string) => {
  if (perfilBomba(id, campoId)) return true
  const eq = Object.hasOwn(EQUIPOS, id) ? equipoEnCampo(id, campoId) : undefined
  return !!eq?.instrumentado && eq.dispositivos.length > 0
}

/** La electrosumergible, el bombeo mecánico o el pozo que fluye solo: el crudo de su pozo, sin colchón. */
function dePozo(p: Pozo, base: Base, ctx: Contexto): FilaCriticidad {
  const e = estadoAhora(p)
  const crudo = crudoAsignado(p)
  const esp = p.levantamiento === 'electrosumergible'
  let costo: Pick<FilaCriticidad, 'costoFalla' | 'costoDe' | 'mdtFuente'>
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
  const perdiendo = parado ? crudo * (e.produce ? perdidaPorFrecuencia(e.hz, pruebaEn(p, ahora)?.hz) : 1) : undefined
  const porque = !p.pruebas.length ? `${p.id} no tiene prueba: no se le inventa caudal`
    : parado ? `${p.id} ya está ${e.produce ? 'con la frecuencia bajada' : 'parado'}: se pierden ${n0(perdiendo ?? 0)} bbl/d ahora`
      : `Si ${p.id} falla hoy, se pierden sus ${n0(crudo)} bbl/d: no hay tanque que aguante`
  return { ...base, nombre: `${p.id} · ${LEVANTAMIENTO_NOMBRE[p.levantamiento].toLowerCase()}`,
    familia: esp ? 'electrosumergible' : p.levantamiento === 'bombeo-mecanico' ? 'bombeo-mecanico' : 'pozo',
    bpd: crudo, ...costo, vigilado: esp && perfilDe(ctx.config, p.campoId).electrosumergibles,
    ...(!p.pruebas.length ? { sinDato: 'Sin prueba: no se sabe cuánto da' } : {}),
    estimacion: false, parado, ...(perdiendo !== undefined ? { perdiendoBpd: perdiendo } : {}), porque }
}

/** Una bomba de la línea con instrumento: la predicción y el costo por falla de diferido.ts, tal cual. */
function deBomba(p: PerfilBomba, base: Base, ctx: Contexto): FilaCriticidad {
  const pr = prediccion(p, ctx)
  const cf = costoDeBomba(p, pr, historialDeEquipo(p.campoId, p.equipo, ctx))
  const colchonH = cf.colchonH ?? (p.papel === 'disposicion' && pr.aguaSinSalidaBpd > 0 ? pr.colchon?.horas : undefined)
  const parado = !!pr.parada
  const perdiendo = pr.perdiendo?.bblDia
  const siFalla = p.papel === 'recobro' ? `${p.equipo} inyecta para recobro: si falla hoy no cierra pozos; baja la presión del yacimiento en semanas`
    : p.papel === 'disposicion' && pr.aguaSinSalidaBpd <= 0 ? `Si falla ${p.equipo} hoy, el respaldo toma toda su agua: no cierra pozos`
      : p.papel === 'transporte' ? `Si falla ${p.equipo} hoy, se frenan ${pr.orden?.pasos.length ?? p.pozos?.length ?? 0} pozos que mueve: ${n0(pr.crudoBpd)} bbl/d`
        : `Si falla ${p.equipo} hoy, el campo pierde ${n0(pr.crudoBpd)} bbl/d${colchonH !== undefined ? ` después de ${textoH(colchonH)} de colchón` : ''}`
  return { ...base, nombre: EQUIPOS[p.equipo]?.nombre ?? p.equipo, familia: 'bomba', bpd: pr.crudoBpd,
    ...(colchonH !== undefined ? { colchonH } : {}), ...(cf.costoFalla !== undefined ? { costoFalla: cf.costoFalla } : {}),
    ...(cf.costoDe ? { costoDe: cf.costoDe } : {}), ...(cf.mdtFuente ? { mdtFuente: cf.mdtFuente } : {}),
    vigilado: true, estimacion: false, parado, ...(perdiendo !== undefined ? { perdiendoBpd: perdiendo } : {}),
    // Ya parada: lo que cuesta ahora (los pozos que se cerraron por ella) y,
    // cuando vuelva, lo que costaría otra falla en el orden de TRIM.
    porque: parado && p.papel !== 'recobro' && pr.crudoBpd > 0
      ? `${p.equipo} está parada: se pierden ${n0(perdiendo ?? 0)} bbl/d ahora. Cuando vuelva, si falla otra vez: ${n0(pr.crudoBpd)} bbl/d cerrando en el orden de TRIM`
      : parado ? `${p.equipo} está parada. ${siFalla}` : siFalla }
}

/** Una bomba del tren de agua sin instrumento (P-201A y P-201C de La Ceiba):
 *  con su perfil mínimo de `TREN_AGUA`. Si falla hoy, el agua que entra ahora
 *  (`caudalesAhora`) tiene que salir por las otras bombas en marcha; lo que no
 *  cabe llena el tanque al nivel de ahora y, agotado el colchón, se cierran
 *  pozos en el orden de TRIM (`ordenDeCierre`). Sin instrumento, TRIM no sabe
 *  si está en marcha: se supone que sí, y se dice. */
function deHermana(id: string, base: Base, ctx: Contexto): FilaCriticidad {
  const c = base.campoId
  const tren = TREN_AGUA[c]!
  const esta = tren.bombas.find(b => b.id === id)!
  const nombre = `${id} · bomba de ${esta.papel === 'recobro' ? 'recobro' : 'reinyección'}`
  const paradaDe = (b: string) => (perfilBomba(b, c) ? paradasDe(b, c).find(e => !e.fin) : undefined)
  const comun = { ...base, nombre, familia: 'bomba' as const, vigilado: vigiladoEn(id, c), estimacion: false, parado: false,
    mdtFuente: 'Sin historia propia: no tiene instrumento' }
  if (esta.reserva) return { ...comun, bpd: 0, porque: `${id} es de reserva${esta.nota ? ` (${esta.nota})` : ''}: si falla hoy no cierra pozos` }
  const paradas = tren.bombas.filter(b => b.id !== id && !b.reserva && paradaDe(b.id))
  const otras = tren.bombas.filter(b => b.id !== id && !b.reserva && !paradaDe(b.id)).reduce((a, b) => a + b.capacidadBpd, 0)
  const entra = caudalesAhora(c).agua
  const sinSalida = Math.max(0, entra - otras)
  const bpd = sinSalida > 0 ? ordenDeCierre(c, sinSalida, ahora).crudoBpd : 0
  const tk = ctx.config.tanques.find(x => x.campoId === c)
  const nivel = tk && Object.hasOwn(NIVEL_AHORA, tk.id) ? NIVEL_AHORA[tk.id] : undefined
  // El colchón con la misma cuenta del de diferido.ts: lo libre hasta el alto-alto ÷ lo que no sale.
  const colchonH = tk && nivel && sinSalida > 0 ? Math.max(0, (tk.altoAlto - nivel.pct / 100) * tk.capacidadBbl) / (sinSalida / 24) : undefined
  const despues = colchonH !== undefined ? ` después de ${textoH(colchonH)} de colchón` : ''
  const sinDato = [
    vigiladoEn(id, c) ? '' : 'Sin instrumento: TRIM no ve si está en marcha; se supone que sí',
    tk && nivel ? '' : sinSalida > 0 ? 'Sin tanque de agua firmado o sin su nivel: no se sabe cuánto aguanta' : '',
    tren.bombas.some(b => b.reserva) ? 'La reserva no se cuenta: solo está declarada para otra bomba' : '',
  ].filter(Boolean).join('. ')
  const parada = paradas[0]
  const desde = parada ? paradaDe(parada.id) : undefined
  const porque = sinSalida <= 0 ? `Si ${id} falla hoy, las otras bombas sacan toda el agua: no cierra pozos`
    : `Si ${id} falla hoy, quedan ${n0(sinSalida)} bbl/d de agua sin salida: el campo pierde ${n0(bpd)} bbl/d${despues}`
  return { ...comun, bpd, ...(colchonH !== undefined ? { colchonH } : {}), ...(sinDato ? { sinDato } : {}),
    ...(desde && parada && bpd > 0 ? { subio: { desde: new Date(desde.inicio), porque: `${id} sube porque ${parada.id} está parada: si ${id} falla ahora, el campo pierde ${n0(bpd)} bbl/d${despues}` } } : {}),
    porque }
}

/** Un servicio o un equipo de proceso compartido, esté o no en alarma: el
 *  crudo de los pozos que dependen de él y producen ahora (la regla de
 *  `riesgoAhora`, «se cierra lo que esté produciendo»). Estimación: supone que
 *  se cierran todos. */
function deServicio(e: ChokeDeElemento, base: Base, ctx: Contexto): FilaCriticidad {
  const servidos = new Set(e.pozos ?? pozosDe(base.campoId).map(p => p.id))
  const produciendo = pozosDe(base.campoId).filter(p => servidos.has(p.id) && estadoAhora(p).produce)
  const bbl = produciendo.reduce((a, p) => a + crudoAsignado(p), 0)
  const eq = Object.hasOwn(EQUIPOS, e.elemento) ? equipoEnCampo(e.elemento, base.campoId) : undefined
  const respaldo = eq?.redundancia && !/sin respaldo/i.test(eq.redundancia) ? eq.redundancia : undefined
  const caido = serviciosDeCampo(base.campoId).some(s => s.equipo === e.elemento && !s.fin)
  const perdiendo = caido ? riesgoAhora([base.campoId], ctx).find(r => r.equipo === e.elemento && r.estado === 'perdiendo')?.bblDia : undefined
  // Un respaldo EN LÍNEA toma toda su carga: cuesta cero mientras el respaldo
  // esté bien (U2 §6.2, el tercer caso; equipos.ts del tratador: «su
  // desviación no difiere barriles de proceso»). Otro respaldo (unidades N+1,
  // un tanque de reserva) no se sabe si alcanza: se deja la regla y se dice.
  if (respaldo && /^respaldo en l[ií]nea/i.test(respaldo)) return { ...base, nombre: eq?.nombre ?? e.elemento, familia: 'servicio', bpd: 0,
    vigilado: vigiladoEn(e.elemento, base.campoId), sinDato: `Cero mientras el respaldo esté bien (${respaldo})`, estimacion: true, parado: caido,
    ...(perdiendo !== undefined ? { perdiendoBpd: perdiendo } : {}),
    porque: `Si ${e.elemento} cae hoy, toma su carga el ${respaldo}: no cierra pozos mientras el respaldo esté bien` }
  const sinDato = [
    'Estimación: supone que se cierran todos los pozos que dependen de él',
    respaldo ? `tiene respaldo declarado (${respaldo}): es un techo` : '',
    eq?.servicio === 'evacuacion' ? 'no descuenta el tanque de crudo: falta su colchón' : '',
  ].filter(Boolean).join('; ')
  return { ...base, nombre: eq?.nombre ?? `Alimentador ${e.elemento}`, familia: 'servicio', bpd: bbl, vigilado: vigiladoEn(e.elemento, base.campoId),
    sinDato, estimacion: true, parado: caido, ...(perdiendo !== undefined ? { perdiendoBpd: perdiendo } : {}),
    porque: `Si ${e.elemento} cae hoy, se frenan los ${produciendo.length} pozos que producen y dependen de él: hasta ${n0(bbl)} bbl/d, desde el primer minuto` }
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
  const derivada = new Map(topologiaDerivada(campoId).map(e => [e.elemento, e]))
  const alimentadores = new Set(pozosDe(campoId).map(p => p.alimentador))
  const delTren = new Set((Object.hasOwn(TREN_AGUA, campoId) ? TREN_AGUA[campoId]!.bombas : []).map(b => b.id))
  const filas: FilaCriticidad[] = []
  const sinCalcular: CriticidadDelCampo['sinCalcular'] = []
  for (const e of topologiaDe(campoId, ctx)) {
    // Lo de afuera no es un equipo del campo.
    if (e.alcance === 'tercero' || e.alcance === 'frontera') continue
    const base: Base = { campoId, equipo: e.elemento, tramo: chokeDeAlcance(e.alcance), alcance: e.alcance, servidos: new Set(e.pozos ?? []).size }
    const pozo = pozoDe(campoId, e.elemento)
    if (pozo) { filas.push(dePozo(pozo, base, ctx)); continue }
    const perfil = perfilBomba(e.elemento, campoId)
    if (perfil) { filas.push(deBomba(perfil, base, ctx)); continue }
    if (delTren.has(e.elemento)) { filas.push(deHermana(e.elemento, base, ctx)); continue }
    const nombre = EQUIPOS[e.elemento]?.nombre ?? derivada.get(e.elemento)?.nombre ?? e.elemento
    if (esBomba(e.elemento) || derivada.get(e.elemento)?.clase === 'bomba') {
      sinCalcular.push({ equipo: e.elemento, nombre, motivo: 'Bomba sin perfil en este campo: no se sabe cuánto mueve ni cuánto duran sus fallas' })
      continue
    }
    if (Object.hasOwn(EQUIPOS, e.elemento) || alimentadores.has(e.elemento)) { filas.push(deServicio(e, base, ctx)); continue }
    sinCalcular.push({ equipo: e.elemento, nombre, motivo: 'Sin equipo registrado en TRIM: no hay con qué medir su falla' })
  }
  const ranking = filas.filter(x => !x.parado).sort(orden)
  const parados = filas.filter(x => x.parado).sort((a, b) => (b.perdiendoBpd ?? 0) - (a.perdiendoBpd ?? 0) || (a.equipo < b.equipo ? -1 : 1))
  // La línea de abajo: lo que subió porque otro equipo está parado (U2 §6.3).
  const suben = ranking.filter(x => x.subio)
  const puesto = (x: FilaCriticidad) => 1 + ranking.filter(y => (y.bpd ?? -1) > (x.bpd ?? -1)).length
  const causa = suben[0]?.subio?.porque.match(/porque (.+?) está parada/)?.[1]
  const cambioHoy = suben.length && causa
    ? `Cambió hoy: ${lista(suben.map(x => x.equipo))} ${suben.length === 1 ? 'subió' : 'subieron'} al puesto ${puesto(suben[0]!)} porque ${causa} está parada.${suben.every(x => !x.vigilado) ? ` ${suben.length === 1 ? 'No tiene' : `Ninguna de las ${suben.length === 2 ? 'dos' : suben.length} tiene`} instrumento: TRIM no verá venir su falla.` : ''}`
    : undefined
  const r: CriticidadDelCampo = { campoId, ranking, parados, sinCalcular, ...(cambioHoy ? { cambioHoy } : {}) }
  m.set(campoId, r)
  return r
}

/** De mayor a menor: bbl/d si falla hoy (sin dato, al final); a igual cifra, el
 *  de menos colchón (sin colchón cuenta como 0); luego el costo de una falla y
 *  el código. */
const orden = (a: FilaCriticidad, b: FilaCriticidad) =>
  (b.bpd ?? -1) - (a.bpd ?? -1) || (a.colchonH ?? 0) - (b.colchonH ?? 0)
  || (b.costoFalla ?? -1) - (a.costoFalla ?? -1) || (a.equipo < b.equipo ? -1 : a.equipo > b.equipo ? 1 : 0)

/** «Si falla hoy» de varios campos juntos, de mayor a menor. */
export const criticidad = (campoIds: string[], ctx: Contexto): FilaCriticidad[] =>
  campoIds.flatMap(c => criticidadDelCampo(c, ctx).ranking).sort(orden)
