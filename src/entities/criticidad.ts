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
 *  - servicios (subestación, aire, separador, tratador), estén o no en alarma:
 *    la regla de `riesgoAhora`, «se cierra lo que esté produciendo», con los
 *    pozos que dependen de ellos según la topología. Es un TECHO y se marca;
 *    va en su propio grupo, después de las cifras calculadas (D6; B-06);
 *  - un servicio con respaldo declarado cuesta 0 mientras el respaldo esté
 *    bien (CHOKE-COMPLETO §14.7); si su lectura dice que el respaldo ya está en
 *    uso (K-101 con 2 de 3 unidades), vuelve al techo;
 *  - la evacuación (tanque de crudo, LACT) y el compresor, sin dato con su
 *    porqué hasta tener el colchón del tanque de crudo o los pozos que cierra
 *    el compresor (U2 §6.3);
 *  - un campo de gas, sin cifras: lo que cuesta una falla en gas todavía no se
 *    calcula (B-18).
 *  Lo de afuera (tercero, frontera) no entra: no es un equipo del campo ni se
 *  le pone vigía. Lo que ya está parado tampoco: está en «Perdiéndose ahora».
 *  Lo que no se puede medir va aparte, con el porqué: no se le inventa un costo. */
import { pozosDe, pozoDe, estadoAhora, pruebaEn, serviciosDeCampo, NIVEL_AHORA, LEVANTAMIENTO_NOMBRE, type Pozo } from './pozos'
import { perfilBomba, esBomba, paradasDe, type PerfilBomba } from './bombas'
import { perfilDe, tanqueDe } from './configuracion'
import { EQUIPOS, equipoEnCampo, type EquipoEnCampo } from './equipos'
import { CAMPOS_DE_GAS } from './planta'
import { capacidadesDe } from './capacidades'
import { prediccion, costoDeBomba, mdtEspDelCampo, riesgoAhora, ordenDeCierre, caudalesAhora, type Prediccion } from './diferido'
import { crudoAsignado, historialDeEquipo, perdidaPorFrecuencia } from './libro'
import {
  topologiaDe, topologiaDerivada, chokeDeAlcance, potencialesDelCampo, porSaberDelCampo, sinResponderDe, n0,
  type ChokeAnh, type AlcanceElemento, type ChokeDeElemento,
} from './choke'
import { campoPorId } from './campos'
import { textoHoras } from './salud'
import type { Contexto } from './causa-senal'
import { AHORA, fechaCorta } from './reloj'

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
  /** Subió porque otro equipo está parado (`otro`). */
  subio?: { desde: Date; porque: string; otro: string }
  /** Supone que se cierran todos los pozos que dependen de él: un techo. */
  estimacion: boolean
  /** En qué lista va (D6): `medido`, las cifras calculadas, ordenadas y con
   *  puesto; `techo`, lo que supone cerrar todos sus pozos («hasta»), aparte y
   *  después, sin puesto; `sin-dato`, sin cifra y con su porqué (`sinDato`). */
  grupo: 'medido' | 'techo' | 'sin-dato'
  /** Ya está parado (o con la frecuencia bajada). */
  parado: boolean
  /** Si ya está parado, lo que está costando ahora, bbl/d. */
  perdiendoBpd?: number
  /** El puesto en la lista de lo medido: los que cuestan lo mismo lo comparten
   *  (1 + cuántos medidos cuestan más). Null: un techo, sin dato, o ya parado
   *  (va en «Perdiéndose ahora»). Un techo no corre el puesto de lo medido. */
  puesto: number | null
  /** Una frase en palabras de campo: «Si falla P-201B hoy, el campo deja de producir
   *  783 bbl/d después de 10 h de colchón»; si ya está parado o caído, lo de ahora.
   *  Lo diferido nunca «se pierde» (T-8, regla 3): se deja de producir. */
  porque: string
}

/** Un trabajo del programa sobre un equipo que hoy vale más porque otro está
 *  parado (U2 §1.5 y §6.4): para que el jefe decida si lo mueve. Proponer el
 *  plan es otra escritura (no está en esta versión). */
export interface AvisoTrabajoCritico {
  campoId: string
  /** La parada del programa firmado (`ParadaProgramada.id`). */
  tarea: string
  equipo: string
  desde: Date
  hasta: Date
  motivo: string
  /** Por qué ese equipo vale más hoy. */
  porque: string
  /** «Ojo: P-201A vale más mientras P-201B esté parada: tiene programado …. ¿Mover el trabajo?» */
  texto: string
}

export interface CriticidadDelCampo {
  campoId: string
  /** Lo medido de mayor a menor (bbl/d si falla hoy; a igual cifra, el de menos
   *  colchón), después los techos y al final lo que no tiene cifra; sin lo que
   *  ya está parado. */
  ranking: FilaCriticidad[]
  /** Un campo de gas: lo que cuesta una falla en gas todavía no se calcula, y se dice (B-18). */
  campoDeGas?: string
  /** Lo que ya está parado: va en «Perdiéndose ahora», no en la lista (U2 §6.3). */
  parados: FilaCriticidad[]
  /** Elementos del campo que no se pueden medir, y por qué. */
  sinCalcular: Array<{ equipo: string; nombre: string; motivo: string }>
  /** La línea que hace dinámica la lista: «Cambió hoy: P-201A y P-201C subieron al puesto 3…». */
  cambioHoy?: string
  /** Lo que decide confiabilidad con la lista (U2 §6.4): dónde va el próximo
   *  instrumento, el primero de la lista que TRIM no ve venir. */
  proximoInstrumento?: string
  /** Lo que decide el jefe (U2 §6.4): no intervenir hoy lo que hoy vale más. */
  noIntervenir?: string
  /** Los trabajos del programa que tocan un equipo que hoy vale más (`AvisoTrabajoCritico`). */
  avisosTrabajo: AvisoTrabajoCritico[]
  /** Lo que se gana desembotellando (U2 §6.5): qué da producir más y qué da otra
   *  bomba de agua. Para el gerente y producción. Ausente sin tubería de crudo. */
  desembotellar?: string
}

const ahora = AHORA.getTime()
/** «1,8 h» bajo 10 h; «2 min» bajo una hora; «19 h»; «3,2 d». */
const textoH = (h: number) => (h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : h < 10 ? `${h.toLocaleString('es-CO', { maximumFractionDigits: 1 })} h` : h < 48 ? `${Math.round(h)} h` : `${(h / 24).toLocaleString('es-CO', { maximumFractionDigits: 1 })} d`)
const lista = (xs: readonly string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}`)

type Base = Pick<FilaCriticidad, 'campoId' | 'equipo' | 'tramo' | 'alcance' | 'servidos' | 'puesto'>

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
    : parado ? `${p.id} ya está ${e.produce ? 'con la frecuencia bajada' : 'parado'}: se dejan de producir ${n0(perdiendo ?? 0)} bbl/d ahora`
      : `Si ${p.id} falla hoy, se dejan de producir sus ${n0(crudo)} bbl/d: no hay tanque que aguante`
  return { ...base, nombre: `${p.id} · ${LEVANTAMIENTO_NOMBRE[p.levantamiento].toLowerCase()}`,
    familia: esp ? 'electrosumergible' : p.levantamiento === 'bombeo-mecanico' ? 'bombeo-mecanico' : 'pozo',
    bpd: crudo, ...costo, vigilado: esp && perfilDe(ctx.config, p.campoId).electrosumergibles,
    ...(!p.pruebas.length ? { sinDato: 'Sin prueba: no se sabe cuánto da' } : {}),
    estimacion: false, grupo: 'medido', parado, ...(perdiendo !== undefined ? { perdiendoBpd: perdiendo } : {}), porque }
}

/** El colchón de una bomba de disposición cuando vuelva: con el nivel típico
 *  al parar (la mediana de `nivelAlParar` de sus paradas), no con el de ahora,
 *  que es el del tanque con ella parada (QA-A-09). Undefined sin tanque firmado,
 *  sin niveles al parar o si su agua no queda sin salida. */
function colchonAlVolver(p: PerfilBomba, pr: Prediccion, ctx: Contexto): { horas: number; nivelPct: number } | undefined {
  const tk = tanqueDe(ctx.config, p.campoId, p.equipo)
  const niveles = paradasDe(p.equipo, p.campoId).flatMap(e => (typeof e.nivelAlParar?.pct === 'number' ? [e.nivelAlParar.pct] : [])).sort((a, b) => a - b)
  if (p.papel !== 'disposicion' || !tk || !niveles.length || pr.aguaSinSalidaBpd <= 0) return undefined
  const i = niveles.length >> 1
  const nivelPct = niveles.length % 2 ? niveles[i]! : (niveles[i - 1]! + niveles[i]!) / 2
  return { horas: Math.max(0, (tk.altoAlto - nivelPct / 100) * tk.capacidadBbl) / (pr.aguaSinSalidaBpd / 24), nivelPct }
}

/** Una bomba de la línea con instrumento: la predicción y el costo por falla de
 *  diferido.ts, tal cual. Ya parada, lo de «cuando vuelva» se mide con el
 *  colchón típico al parar (QA-A-09). */
function deBomba(p: PerfilBomba, base: Base, ctx: Contexto): FilaCriticidad {
  const pr0 = prediccion(p, ctx)
  const parado = !!pr0.parada
  const alVolver = parado ? colchonAlVolver(p, pr0, ctx) : undefined
  const pr: Prediccion = alVolver && pr0.colchon ? { ...pr0, colchon: { ...pr0.colchon, horas: alVolver.horas, agotado: alVolver.horas <= 0 } } : pr0
  const cf = costoDeBomba(p, pr, historialDeEquipo(p.campoId, p.equipo, ctx))
  const colchonH = cf.colchonH ?? (p.papel === 'disposicion' && pr.aguaSinSalidaBpd > 0 ? pr.colchon?.horas : undefined)
  const perdiendo = pr.perdiendo?.bblDia
  const siFalla = p.papel === 'recobro' ? `${p.equipo} inyecta para recobro: si falla hoy no cierra pozos; baja la presión del yacimiento en semanas`
    : p.papel === 'disposicion' && pr.aguaSinSalidaBpd <= 0 ? `Si falla ${p.equipo} hoy, el respaldo toma toda su agua: no cierra pozos`
      : p.papel === 'transporte' ? `Si falla ${p.equipo} hoy, se frenan ${pr.orden?.pasos.length ?? p.pozos?.length ?? 0} pozos que mueve: ${n0(pr.crudoBpd)} bbl/d`
        : `Si falla ${p.equipo} hoy, el campo deja de producir ${n0(pr.crudoBpd)} bbl/d${colchonH !== undefined ? ` después de ${textoH(colchonH)} de colchón` : ''}`
  const despues = alVolver ? ` después de unas ${textoH(alVolver.horas)} de colchón (con el tanque al ${alVolver.nivelPct.toLocaleString('es-CO', { maximumFractionDigits: 1 })} %, como suele estar al parar)` : ''
  return { ...base, nombre: EQUIPOS[p.equipo]?.nombre ?? p.equipo, familia: 'bomba', bpd: pr.crudoBpd,
    ...(colchonH !== undefined ? { colchonH } : {}), ...(cf.costoFalla !== undefined ? { costoFalla: cf.costoFalla } : {}),
    ...(cf.costoDe ? { costoDe: cf.costoDe } : {}), ...(cf.mdtFuente ? { mdtFuente: alVolver ? `${cf.mdtFuente.replace(/ que aguanta hoy el tanque$/, '')}${/ que aguanta hoy el tanque$/.test(cf.mdtFuente) ? ' que aguanta el tanque al nivel típico al parar' : ''}` : cf.mdtFuente } : {}),
    vigilado: true, estimacion: false, grupo: 'medido', parado, ...(perdiendo !== undefined ? { perdiendoBpd: perdiendo } : {}),
    // Ya parada: lo que cuesta ahora (los pozos que se cerraron por ella) y,
    // cuando vuelva, lo que costaría otra falla en el orden de TRIM.
    porque: parado && p.papel !== 'recobro' && pr.crudoBpd > 0
      ? `${p.equipo} está parada: se dejan de producir ${n0(perdiendo ?? 0)} bbl/d ahora. Cuando vuelva, si falla otra vez: ${n0(pr.crudoBpd)} bbl/d cerrando en el orden de TRIM${despues}`
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
  // La capacidad de cada bomba: la firmada o, sin firma, la del demo (capacidades.ts).
  const bombas = capacidadesDe(ctx.config, c).bombas
  const esta = bombas.find(b => b.equipo === id)!
  // P-09 · Una familia por equipo: la del motor (`FAMILIA.reinyeccion`, planta-viva.ts), «bomba de agua»,
  // sea de disposición o de recobro (el papel lo dice `porque`).
  const nombre = `${id} · bomba de agua`
  const paradaDe = (b: string) => (perfilBomba(b, c) ? paradasDe(b, c).find(e => !e.fin) : undefined)
  const comun = { ...base, nombre, familia: 'bomba' as const, vigilado: vigiladoEn(id, c), estimacion: false, grupo: 'medido' as const, parado: false,
    mdtFuente: 'Sin historia propia: no tiene instrumento' }
  if (esta.reserva) return { ...comun, bpd: 0, porque: `${id} es de reserva${esta.nota ? ` (${esta.nota})` : ''}: si falla hoy no cierra pozos` }
  const paradas = bombas.filter(b => b.equipo !== id && !b.reserva && paradaDe(b.equipo))
  const otras = bombas.filter(b => b.equipo !== id && !b.reserva && !paradaDe(b.equipo)).reduce((a, b) => a + b.valor, 0)
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
    bombas.some(b => b.reserva) ? 'La reserva no se cuenta: solo está declarada para otra bomba' : '',
  ].filter(Boolean).join('. ')
  const parada = paradas[0]
  const desde = parada ? paradaDe(parada.equipo) : undefined
  const porque = sinSalida <= 0 ? `Si ${id} falla hoy, las otras bombas sacan toda el agua: no cierra pozos`
    : `Si ${id} falla hoy, quedan ${n0(sinSalida)} bbl/d de agua sin salida: el campo deja de producir ${n0(bpd)} bbl/d${despues}`
  return { ...comun, bpd, ...(colchonH !== undefined ? { colchonH } : {}), ...(sinDato ? { sinDato } : {}),
    ...(desde && parada && bpd > 0 ? { subio: { desde: new Date(desde.inicio), otro: parada.equipo, porque: `${id} sube porque ${parada.equipo} está parada: si ${id} falla ahora, el campo deja de producir ${n0(bpd)} bbl/d${despues}` } } : {}),
    porque }
}

/** Si el respaldo declarado de un equipo está bien hoy, según su lectura: un
 *  equipo de unidades N+1 con menos unidades en servicio que las que tiene ya
 *  gastó su respaldo (K-101: «2 de 3»). Sin lectura que diga otra cosa, bien. */
function respaldoHoy(eq: EquipoEnCampo): { bien: boolean; lectura?: string } {
  const d = eq.dispositivos.find(x => /unidades en servicio/i.test(x.tipo))
  const m = d && typeof d.valor === 'string' ? /^(\d+)\s*de\s*(\d+)$/.exec(d.valor.trim()) : null
  if (!m) return { bien: true }
  const en = Number(m[1]), de = Number(m[2])
  return en >= de ? { bien: true } : { bien: false, lectura: `${en} de ${de} unidades en servicio` }
}

/** Un servicio o un equipo de proceso compartido, esté o no en alarma (D6):
 *  - la evacuación (tanque de crudo, LACT): sin dato hasta tener el colchón del
 *    tanque de crudo; el compresor: sin dato hasta saber a qué pozos cierra (U2 §6.3);
 *  - con respaldo declarado que está bien: 0 mientras siga bien (U2 §6.2, el
 *    tercer caso; CHOKE-COMPLETO §14.7);
 *  - sin respaldo, o con el respaldo ya en uso hoy: el crudo de los pozos que
 *    dependen de él y producen ahora (la regla de `riesgoAhora`, «se cierra lo
 *    que esté produciendo»). Es un TECHO: va en su grupo, después de lo medido. */
function deServicio(e: ChokeDeElemento, base: Base, ctx: Contexto): FilaCriticidad {
  const servidos = new Set(e.pozos ?? pozosDe(base.campoId).map(p => p.id))
  const produciendo = pozosDe(base.campoId).filter(p => servidos.has(p.id) && estadoAhora(p).produce)
  const bbl = produciendo.reduce((a, p) => a + crudoAsignado(p), 0)
  const eq = Object.hasOwn(EQUIPOS, e.elemento) ? equipoEnCampo(e.elemento, base.campoId) : undefined
  const respaldo = eq?.redundancia && !/sin respaldo/i.test(eq.redundancia) ? eq.redundancia : undefined
  const caido = serviciosDeCampo(base.campoId).some(s => s.equipo === e.elemento && !s.fin)
  const perdiendo = caido ? riesgoAhora([base.campoId], ctx).find(r => r.equipo === e.elemento && r.estado === 'perdiendo')?.bblDia : undefined
  // Ya caído, la frase es la de ahora, no la de «si cae hoy».
  const caidoTexto = `${e.elemento} está caído: se dejan de producir ${n0(perdiendo ?? 0)} bbl/d ahora`
  const comun = { ...base, nombre: eq?.nombre ?? `Alimentador ${e.elemento}`, familia: 'servicio' as const, vigilado: vigiladoEn(e.elemento, base.campoId),
    parado: caido, ...(perdiendo !== undefined ? { perdiendoBpd: perdiendo } : {}) }
  const sinCifra = (sinDato: string): FilaCriticidad => ({ ...comun, bpd: null, estimacion: false, grupo: 'sin-dato', sinDato,
    porque: caido ? caidoTexto : `Si ${e.elemento} falla hoy: sin dato. ${sinDato}` })
  if (eq?.servicio === 'evacuacion') return sinCifra('Falta el colchón del tanque de crudo: sin él no se sabe cuánto aguanta antes de cerrar pozos')
  if (eq?.servicio === 'compresion') return sinCifra('Falta saber a qué pozos cierra: sin eso no se calcula cuánto cuesta')
  const hoy = eq && respaldo ? respaldoHoy(eq) : undefined
  if (respaldo && hoy?.bien) return { ...comun, bpd: 0, estimacion: false, grupo: 'medido', sinDato: `Cero mientras el respaldo esté bien (${respaldo})`,
    porque: caido ? caidoTexto : `Si ${e.elemento} cae hoy, toma su carga ${/^respaldo/i.test(respaldo) ? `el ${respaldo}` : `su respaldo (${respaldo})`}: no cierra pozos mientras el respaldo esté bien` }
  const sinDato = [
    'Techo: supone que se cierran todos los pozos que dependen de él',
    respaldo && hoy && !hoy.bien ? `su respaldo ya está en uso hoy (${hoy.lectura}; ${respaldo})` : '',
  ].filter(Boolean).join('; ')
  return { ...comun, bpd: bbl, estimacion: true, grupo: 'techo', sinDato,
    porque: caido ? caidoTexto : `Si ${e.elemento} cae hoy, se frenan los ${produciendo.length} pozos que producen y dependen de él: hasta ${n0(bbl)} bbl/d, desde el primer minuto` }
}

/** Una fila de un campo de gas: sin cifra (B-18), y su porqué tampoco dice
 *  barriles de crudo (5E·H36: «Si ZA-01 falla hoy, se dejan de producir sus 479 bbl/d»).
 *  La que tenía una cifra dice que no la hay y por qué; la que ya no la tenía
 *  («no cierra pozos», «no tiene prueba») queda como estaba. Sin «sube»: su
 *  porqué es una cifra de crudo. */
function deGas(x: FilaCriticidad, gas: string): FilaCriticidad {
  const { subio: _, ...sinSubir } = x
  return { ...sinSubir, bpd: null, grupo: 'sin-dato', estimacion: false, sinDato: gas,
    porque: x.bpd !== null && x.bpd > 0 ? `Si ${x.equipo} falla hoy: sin dato. ${gas}` : x.porque }
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
  const delTren = new Set(capacidadesDe(ctx.config, campoId).bombas.map(b => b.equipo))
  const filas: FilaCriticidad[] = []
  const sinCalcular: CriticidadDelCampo['sinCalcular'] = []
  for (const e of topologiaDe(campoId, ctx)) {
    // Lo de afuera no es un equipo del campo.
    if (e.alcance === 'tercero' || e.alcance === 'frontera') continue
    const base: Base = { campoId, equipo: e.elemento, tramo: chokeDeAlcance(e.alcance), alcance: e.alcance, servidos: new Set(e.pozos ?? []).size, puesto: null }
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
  // Lo que la topología no sabe todavía tampoco se mide: no se le inventa un costo.
  for (const id of porSaberDelCampo(campoId, ctx))
    sinCalcular.push({ equipo: id, nombre: EQUIPOS[id]?.nombre ?? derivada.get(id)?.nombre ?? id, motivo: 'Falta saber a qué pozos sirve: el administrador contestó «Todavía no sé»' })
  for (const e of sinResponderDe(campoId, ctx))
    sinCalcular.push({ equipo: e.elemento, nombre: EQUIPOS[e.elemento]?.nombre ?? e.nombre, motivo: 'Es nuevo en el registro y la topología firmada no lo tiene: falta contestar a qué pozos sirve' })
  // Un campo de gas: lo que cuesta una falla en gas todavía no se calcula (B-18;
  // PLAN-MAESTRO §3, solo crudo). Sin cifras: el condensado no se ordena con el crudo.
  const gas = CAMPOS_DE_GAS.includes(campoId) ? `${campoPorId(campoId).nombre} es un campo de gas: lo que cuesta una falla en gas todavía no se calcula.` : undefined
  const enLista = filas.filter(x => !x.parado).map((x): FilaCriticidad => (gas ? deGas(x, gas) : x)).sort(orden)
  // El puesto, solo en lo medido: los que cuestan lo mismo lo comparten (1 + cuántos medidos cuestan más).
  const medidos = enLista.filter(x => x.grupo === 'medido' && x.bpd !== null)
  const puestoDe = (x: FilaCriticidad) => (x.grupo !== 'medido' || x.bpd === null ? null : 1 + medidos.filter(y => y.bpd! > x.bpd!).length)
  const ranking = enLista.map(x => ({ ...x, puesto: puestoDe(x) }))
  const parados = filas.filter(x => x.parado).sort((a, b) => (b.perdiendoBpd ?? 0) - (a.perdiendoBpd ?? 0) || (a.equipo < b.equipo ? -1 : 1))
  // La línea de abajo: lo que subió porque otro equipo está parado (U2 §6.3).
  const suben = ranking.filter(x => x.subio)
  const otro = suben[0]?.subio?.otro
  const ninguna = (n: number) => (n === 1 ? 'No tiene' : `Ninguna de las ${n === 2 ? 'dos' : n} tiene`)
  const cambioHoy = suben.length && otro
    ? `Cambió hoy: ${lista(suben.map(x => x.equipo))} ${suben.length === 1 ? 'subió' : 'subieron'} al puesto ${suben[0]!.puesto} porque ${otro} está parada.${suben.every(x => !x.vigilado) ? ` ${ninguna(suben.length)} instrumento: TRIM no verá venir su falla.` : ''}`
    : undefined
  // Lo que decide cada rol con la lista (U2 §6.4).
  const sinVigia = ranking.filter(x => !x.vigilado && (x.bpd ?? 0) > 0)
  const primeros = sinVigia.filter(x => x.puesto === sinVigia[0]?.puesto)
  const proximoInstrumento = primeros.length
    ? `Lo primero de la lista sin instrumento: ${lista(primeros.map(x => x.equipo))} (puesto ${primeros[0]!.puesto}, ${n0(primeros[0]!.bpd ?? 0)} bbl/d si falla hoy). TRIM no ve venir su falla.`
    : undefined
  const noIntervenir = suben.length && otro
    ? `Ojo: ${lista(suben.map(x => x.equipo))} ${suben.length === 1 ? 'vale' : 'valen'} más mientras ${otro} esté parada: no conviene ${suben.length === 1 ? 'intervenirla' : 'intervenirlas'} hoy.`
    : undefined
  const avisosTrabajo = avisosDeTrabajo(campoId, suben, ctx)
  const desembotellar = desembotellarDe(campoId, ctx)
  const r: CriticidadDelCampo = { campoId, ranking, parados, sinCalcular, ...(gas ? { campoDeGas: gas } : {}), ...(cambioHoy ? { cambioHoy } : {}),
    ...(proximoInstrumento ? { proximoInstrumento } : {}), ...(noIntervenir ? { noIntervenir } : {}), avisosTrabajo,
    ...(desembotellar ? { desembotellar } : {}) }
  m.set(campoId, r)
  return r
}

/** Los trabajos del programa firmado que todavía no terminan y tocan un equipo
 *  que hoy vale más porque otro está parado (U2 §1.5, «Trabajo programado sobre
 *  un equipo que hoy vale más»): el cruce de `ParadaProgramada` con «si falla hoy». */
function avisosDeTrabajo(campoId: string, suben: readonly FilaCriticidad[], ctx: Contexto): AvisoTrabajoCritico[] {
  const out: AvisoTrabajoCritico[] = []
  for (const p of ctx.config.programa) {
    if (p.campoId !== campoId || Date.parse(p.hasta) <= ahora) continue
    const f = suben.find(x => x.equipo === p.equipo)
    if (!f?.subio) continue
    const desde = new Date(p.desde), hasta = new Date(p.hasta)
    out.push({ campoId, tarea: p.id, equipo: p.equipo, desde, hasta, motivo: p.motivo, porque: f.subio.porque,
      texto: `Ojo: ${p.equipo} vale más mientras ${f.subio.otro} esté parada: tiene programado «${p.motivo}» ${desde.getTime() <= ahora ? 'desde' : 'el'} ${fechaCorta(desde)}. ¿Mover el trabajo?` })
  }
  return out.sort((a, b) => a.desde.getTime() - b.desde.getTime() || a.equipo.localeCompare(b.equipo))
}

const SUJETO_TRAMO = { pozos: 'los pozos', planta: 'la planta', exportacion: 'afuera' } as const
const TREN_PALABRA = { crudo: 'el tren de crudo', agua: 'el agua', gas: 'el gas' } as const

/** Lo que se gana desembotellando (U2 §6.5; CHOKE-COMPLETO §10), en una frase
 *  para el gerente y producción: qué da producir más (lo que limita hoy) y qué
 *  da otra bomba de agua (que una falla no cierre pozos), con lo que ha costado
 *  en promedio cada falla de la bomba de disposición del campo. */
function desembotellarDe(campoId: string, ctx: Contexto): string | undefined {
  const p = potencialesDelCampo(campoId, ahora, ctx)
  if (p.campoDeGas || p.dominante === null) return undefined
  const nombre = campoPorId(campoId).nombre
  const producir = p.casiIguales && p.casiIguales.length > 1
    ? `Para producir más hay que ampliar ${lista(p.casiIguales.map(k => SUJETO_TRAMO[k]))} a la vez: están casi iguales, y lo que se gane en uno lo frena el otro.`
    : p.dominante === 'pozos' ? 'Para producir más hay que sacarles más a los pozos: la planta y afuera dejan pasar más.'
      : p.dominante === 'planta' ? `Para producir más hay que ampliar ${TREN_PALABRA[p.trenQueLimita ?? 'crudo']} de la planta: abrir más pozos no da nada.`
        : 'Para producir más hace falta más salida afuera: oleoducto, transportador o nominación.'
  const bomba = capacidadesDe(ctx.config, campoId).bombas.map(b => perfilBomba(b.equipo, campoId)).find(x => x?.papel === 'disposicion')
  const costo = bomba ? historialDeEquipo(campoId, bomba.equipo, ctx).bblPorFalla : undefined
  if (!bomba || !costo) return `En ${nombre}, ${producir[0]!.toLowerCase()}${producir.slice(1)}`
  // Es historia (lo que ya costaron sus fallas), no «si falla hoy», que descuenta el colchón de hoy (QA-A-08).
  const cuesta = `Cada falla de ${bomba.equipo} le ha costado en promedio unos ${n0(costo)} bbl.`
  return p.dominante === 'planta' && p.trenQueLimita === 'agua'
    ? `En ${nombre}, otra bomba de agua sí sube la producción: hoy el agua es lo que limita, y además evita que una falla cierre pozos. ${cuesta}`
    : `En ${nombre}, otra bomba de agua no sube la producción: evita que una falla cierre pozos. ${cuesta} ${producir}`
}

/** Primero lo medido, después los techos y al final lo que no tiene cifra
 *  (D6); dentro de cada grupo, de mayor a menor bbl/d si falla hoy; a igual
 *  cifra, el de menos colchón (sin colchón cuenta como 0); luego el costo de
 *  una falla y el código. */
const GRUPO: Record<FilaCriticidad['grupo'], number> = { medido: 0, techo: 1, 'sin-dato': 2 }
const orden = (a: FilaCriticidad, b: FilaCriticidad) =>
  GRUPO[a.grupo] - GRUPO[b.grupo] || (b.bpd ?? -1) - (a.bpd ?? -1) || (a.colchonH ?? 0) - (b.colchonH ?? 0)
  || (b.costoFalla ?? -1) - (a.costoFalla ?? -1) || (a.equipo < b.equipo ? -1 : a.equipo > b.equipo ? 1 : 0)

/** «Si falla hoy» de varios campos juntos: lo medido de mayor a menor, después los techos y lo sin dato. */
export const criticidad = (campoIds: string[], ctx: Contexto): FilaCriticidad[] =>
  campoIds.flatMap(c => criticidadDelCampo(c, ctx).ranking).sort(orden)
