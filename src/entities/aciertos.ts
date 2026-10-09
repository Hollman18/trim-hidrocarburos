/** El historial de aciertos del vigía: si lo que anuncia se cumple. Sin esto,
 *  una predicción es una opinión; con esto, confiabilidad sabe cuánto creerle.
 *
 *  Cada predicción se guarda cuando sale (una parte de un equipo de alto
 *  impacto va a cruzar su límite) con su ventana, y se califica así:
 *   · acierto       la parte falló entre que salió y el fin de la ventana;
 *   · intervenida   se intervino el equipo antes (orden cerrada en SAP): es lo
 *                   que se busca, pero no prueba que iba a fallar y no cuenta
 *                   como acierto;
 *   · falsa alarma  venció la ventana sin falla y sin intervención;
 *   · seguimiento   la ventana sigue abierta.
 *  La otra cara: las fallas que nadie anunció. Unas eran de partes vigiladas
 *  (eso sí es un error del vigía); otras, de partes sin instrumento o sin
 *  parte identificada, que TRIM no podía ver.
 *
 *  Contrato: `GET /api/vistas/predicciones?campos=` (el backend guarda y califica).
 *  En el demo, el registro se arma con una regla fija sobre la historia del
 *  PLC (`prediccionesHistoricas`).
 */
import type { Riesgo } from './diferido'
import { historialDeEquipo, vigilable, contextoInicial, type FallaEquipo } from './libro'
import { flotaDe, type Familia } from './flota'
import { perfilBomba, plantillaDe } from './bombas'
import { partesDe, PARTES_ESP, type ParteId } from './partes'
import { perfilDe, configEn, PUESTA_EN_MARCHA, versionInicial, type Version, type ParadaProgramada } from './configuracion'
import { catalogoDe } from './catalogo'
import type { Contexto } from './causa-senal'
import { AHORA } from './reloj'

export type Calificacion = 'seguimiento' | 'acierto' | 'intervenida' | 'falsa-alarma'

export const NOMBRE_CALIFICACION: Record<Calificacion, string> = {
  seguimiento: 'En seguimiento', acierto: 'Aciertos', intervenida: 'Intervenidas antes', 'falsa-alarma': 'Falsas alarmas',
}

/** Una predicción del vigía (lo que anunció y en qué quedó). No es la
 *  `Prediccion` de `diferido.ts`, que es lo que pasaría si una bomba para ahora. */
export interface PrediccionVigia {
  id: string
  campoId: string
  equipo: string
  parte?: ParteId
  tag?: string
  /** Qué hacer cuando la parte avisa (del catálogo de la parte). */
  accion?: string
  /** Cuándo la emitió el vigía. */
  emitida: string
  /** Ventana en que la parte cruzaría su límite si nada cambia. */
  desde: string
  hasta: string
  calificacion: Calificacion
  /** Acierto: la falla del PLC que la confirmó. */
  falla?: { id: string; inicio: string }
  /** Intervenida: cuándo se cerró en SAP la orden que la atendió antes de fallar. */
  intervencion?: string
}

const H = 3_600_000
const ms = (s: string) => new Date(s).getTime()

/** La regla de calificación (la misma que aplica el backend). Una falla de la
 *  misma parte antes del fin de la ventana es acierto aunque llegue antes de
 *  lo previsto: lo que se anunció fue la parte. */
export function calificar(
  p: Pick<PrediccionVigia, 'campoId' | 'equipo' | 'parte' | 'emitida' | 'hasta'>,
  fallas: Array<{ campoId: string; equipo: string; parte?: ParteId; inicio: Date }>,
  intervenciones: Array<{ campoId: string; equipo: string; fecha: Date }>,
  ahora: Date,
): Calificacion {
  const a = ms(p.emitida), b = ms(p.hasta), t = ahora.getTime()
  const mismo = (x: { campoId: string; equipo: string }) => x.campoId === p.campoId && x.equipo === p.equipo
  if (fallas.some(f => mismo(f) && f.parte === p.parte && f.inicio.getTime() >= a && f.inicio.getTime() <= Math.min(b, t))) return 'acierto'
  if (intervenciones.some(i => mismo(i) && i.fecha.getTime() >= a && i.fecha.getTime() <= Math.min(b, t))) return 'intervenida'
  return t > b ? 'falsa-alarma' : 'seguimiento'
}

/** Las predicciones vigentes, tal como las ve el vigía hoy: alto impacto, con
 *  horizonte y ventana. La emisión es la de la tendencia que la sostiene: unas
 *  horas antes de ahora. */
export function prediccionesVigentes(riesgo: Riesgo[]): PrediccionVigia[] {
  return riesgo.filter(r => r.estado === 'en-riesgo' && r.altoImpacto && r.horas !== undefined).map(r => {
    const [a, b] = r.rango ?? [r.horas!, r.horas!]
    const id = `PR-${r.campoId}-${r.equipo}-${r.parte ?? 'x'}-vigente`
    const p = { id, campoId: r.campoId, equipo: r.equipo, parte: r.parte, tag: r.tag, accion: r.accion,
      emitida: new Date(AHORA.getTime() - (6 + Math.floor(azar(`v|${id}`) * 42)) * H).toISOString(),
      desde: new Date(AHORA.getTime() + a * H).toISOString(), hasta: new Date(AHORA.getTime() + b * H).toISOString() }
    return { ...p, calificacion: calificar(p, [], [], AHORA) }
  }).sort((x, y) => x.hasta.localeCompare(y.hasta))
}

/** Un número fijo entre 0 y 1 para cada texto (FNV-1a): la misma regla da
 *  siempre el mismo registro. */
const azar = (s: string) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return (h >>> 0) / 4294967296
}
const D = 24 * H

/** La parte de una intervención que pidió el vigía: una parada del programa que
 *  sale de una orden predictiva (PM03) para cambiar la electrosumergible antes de
 *  que falle. 🔴 DEMOSTRACIÓN: el demo la reconoce por su id
 *  (`PR-VIG-<pozo>-<día>-<parte>`, lo arma scripts/gen-linea.mjs); en producción
 *  la predicción y su orden las guarda el backend. */
export function intervencionDelVigia(p: Pick<ParadaProgramada, 'id'>): ParteId | undefined {
  const parte = /^PR-VIG-.+-([a-z_]+)$/.exec(p.id)?.[1]
  return PARTES_ESP.find(x => x.id === parte)?.id
}

/** El registro de predicciones desde la puesta en marcha, ya calificadas.
 *  🔴 DEMOSTRACIÓN: el servidor guarda cada predicción cuando sale; el demo la
 *  arma con una regla fija sobre la historia del PLC, coherente con ella:
 *   · de las fallas de partes con instrumento, el vigía anticipó unas siete de
 *     cada diez, entre 2 y 9 días antes (las demás se le escaparon); una que
 *     habría salido antes de la puesta en marcha no cuenta: TRIM no estaba;
 *   · las electrosumergibles que anticipó con tiempo se cambiaron antes de
 *     fallar, en una parada programada que salió de una orden predictiva
 *     (`intervencionDelVigia`): esas no tienen falla y quedan intervenidas;
 *   · sobre equipos que no fallaron hubo predicciones que vencieron sin nada
 *     (falsas alarmas) y otras que se atendieron con una orden predictiva en
 *     SAP antes de fallar (intervenidas).
 *  Un acierto solo existe donde esa parte falló de verdad. */
export function prediccionesHistoricas(campos: string[], ctx: Contexto): PrediccionVigia[] {
  const inicio = new Date(`${PUESTA_EN_MARCHA}T00:00:00-05:00`).getTime(), ahora = AHORA.getTime()
  // Qué predicciones existen se decidió cuando salieron: con el estado con que
  // arrancó la operación, no con las respuestas ni el perfil de hoy (una
  // respuesta de hoy no crea una predicción de hace una semana). El estado de
  // hoy solo califica: una parte declarada después puede volver acierto una
  // predicción que ya estaba emitida.
  const base = contextoInicial()
  const vistas = fallasVistas(campos, new Date(inicio), base, [versionInicial()])
  const fallas = fallasVistas(campos, new Date(inicio), ctx, [versionInicial()])
    .map(f => ({ campoId: f.campoId, equipo: f.equipo, parte: f.falla.parte, inicio: f.falla.inicio, id: f.falla.id }))
  const out: Array<Omit<PrediccionVigia, 'calificacion'>> = []
  const parte = (c: string, eq: string, id?: ParteId) => catalogoDe(c, eq)?.partes.find(x => x.id === id)

  for (const f of vistas) {
    if (f.visibilidad !== 'vigilada' || !f.falla.parte || azar(`a|${f.falla.id}`) >= 0.7) continue
    const anticipo = (2 + Math.floor(azar(`l|${f.falla.id}`) * 8)) * D
    const emitida = f.falla.inicio.getTime() - anticipo
    if (emitida < inicio) continue
    out.push({ id: `PR-${f.falla.id}`, campoId: f.campoId, equipo: f.equipo, parte: f.falla.parte, accion: parte(f.campoId, f.equipo, f.falla.parte)?.accion,
      emitida: new Date(emitida).toISOString(), desde: new Date(emitida + anticipo * 0.6).toISOString(), hasta: new Date(emitida + anticipo * 1.4).toISOString() })
  }
  // Las que anticipó con tiempo de intervenir: la emitió unos días antes del cambio
  // programado, con la ventana en que habría fallado; la orden se cerró al terminar.
  for (const pr of base.config.programa) {
    const pt = intervencionDelVigia(pr)
    if (!pt || !campos.includes(pr.campoId) || ms(pr.desde) < inicio) continue
    // Nunca antes de la puesta en marcha: TRIM no estaba.
    const anticipo = (3 + Math.floor(azar(`l|${pr.id}`) * 5)) * D, emitida = Math.max(inicio, ms(pr.desde) - anticipo * 0.5)
    out.push({ id: pr.id, campoId: pr.campoId, equipo: pr.equipo, parte: pt, accion: parte(pr.campoId, pr.equipo, pt)?.accion,
      emitida: new Date(emitida).toISOString(), desde: new Date(emitida + anticipo * 0.6).toISOString(), hasta: new Date(emitida + anticipo * 1.4).toISOString(),
      intervencion: new Date(ms(pr.hasta) - 3 * H).toISOString() })
  }
  for (const c of campos) {
    const perfil = perfilDe(base.config, c)
    for (const { equipo, familia } of flotaDe(c)) {
      const esp = familia === 'electrosumergible'
      if (esp ? !perfil.electrosumergibles : !perfil.bombas) continue
      const clave = `${c}|${equipo}`, x = azar(`x|${clave}`)
      if (x >= 0.35) continue
      const vigiladas = (catalogoDe(c, equipo)?.partes ?? []).filter(pt => vigilable(c, esp ? 'electrosumergible' : familia === 'multifasica' ? 'transporte' : 'reinyeccion', equipo, pt.id))
      const pt = vigiladas[Math.floor(azar(`p|${clave}`) * vigiladas.length)]
      if (!pt) continue
      const emitida = inicio + (2 + azar(`e|${clave}`) * 22) * D, plazo = (3 + Math.floor(azar(`d|${clave}`) * 5)) * D
      const hasta = emitida + plazo * 1.4
      if (hasta > ahora) continue
      out.push({ id: `PR-${c}-${equipo}-${pt.id}`, campoId: c, equipo, parte: pt.id, accion: pt.accion,
        emitida: new Date(emitida).toISOString(), desde: new Date(emitida + plazo * 0.6).toISOString(), hasta: new Date(hasta).toISOString(),
        // Cerca de la mitad se atendió con una orden predictiva antes de que venciera.
        ...(azar(`i|${clave}`) < 0.5 ? { intervencion: new Date(emitida + 1.5 * D).toISOString() } : {}) })
    }
  }
  const intervenciones = out.filter(p => p.intervencion).map(p => ({ campoId: p.campoId, equipo: p.equipo, fecha: new Date(p.intervencion!) }))
  return out.map(p => {
    const calificacion = calificar(p, fallas, intervenciones, AHORA)
    const falla = calificacion === 'acierto' ? fallas.find(f => f.campoId === p.campoId && f.equipo === p.equipo && f.parte === p.parte
      && f.inicio.getTime() >= ms(p.emitida) && f.inicio.getTime() <= ms(p.hasta)) : undefined
    return { ...p, calificacion, ...(falla ? { falla: { id: falla.id, inicio: falla.inicio.toISOString() } } : {}) }
  }).sort((a, b) => b.emitida.localeCompare(a.emitida))
}

/** Todo el registro: lo calificado y lo que está en seguimiento. */
export const registroDePredicciones = (campos: string[], ctx: Contexto, riesgo: Riesgo[]): PrediccionVigia[] =>
  [...prediccionesVigentes(riesgo), ...prediccionesHistoricas(campos, ctx)]

export type Visibilidad = 'vigilada' | 'sin-instrumento' | 'sin-parte' | 'fuera-de-perfil'

export const NOMBRE_VISIBILIDAD: Record<Visibilidad, string> = {
  vigilada: 'Parte con instrumento: el vigía la mira',
  'sin-instrumento': 'Parte sin instrumento: el vigía no la ve',
  'sin-parte': 'Sin parte identificada: no se sabe qué mirar',
  'fuera-de-perfil': 'Familia apagada en el perfil del campo',
}

export interface FallaVista {
  campoId: string
  equipo: string
  familia: Familia
  falla: FallaEquipo
  visibilidad: Visibilidad
  /** Sin instrumento: las variables que harían falta para verla. */
  faltan: string[]
}

/** Las fallas de la flota de alto impacto desde `desde`, cada una con si el
 *  vigía la podía ver. Sin disparos: un disparo no es una falla. Si la familia
 *  estaba apagada se juzga con el perfil que REGÍA cuando falló (la versión
 *  firmada de ese momento), igual que las predicciones: firmar hoy un perfil
 *  no reescribe la historia de aciertos. `ctx` pone las respuestas (la parte
 *  declarada después sí cuenta). */
export function fallasVistas(campos: string[], desde: Date, ctx: Contexto, versiones: ReadonlyArray<Pick<Version, 'fecha' | 'config'>>): FallaVista[] {
  const out: FallaVista[] = []
  for (const c of campos) {
    for (const { equipo, familia } of flotaDe(c)) {
      const esEsp = familia === 'electrosumergible'
      const bomba = esEsp ? undefined : perfilBomba(equipo, c)
      for (const falla of historialDeEquipo(c, equipo, ctx).eventos) {
        if (falla.disparo || falla.inicio < desde) continue
        const perfil = perfilDe(configEn(versiones, falla.inicio.getTime()), c)
        const apagada = esEsp ? !perfil.electrosumergibles : !perfil.bombas
        let visibilidad: Visibilidad, faltan: string[] = []
        if (apagada) visibilidad = 'fuera-de-perfil'
        else if (!falla.parte) visibilidad = 'sin-parte'
        else if (vigilable(c, esEsp ? 'electrosumergible' : familia === 'multifasica' ? 'transporte' : 'reinyeccion', equipo, falla.parte)) visibilidad = 'vigilada'
        else {
          visibilidad = 'sin-instrumento'
          if (bomba) {
            const plantilla = plantillaDe(bomba.subtipo)
            faltan = (partesDe(bomba.subtipo).find(x => x.id === falla.parte)?.variables ?? [])
              .filter(v => v.papel !== 'confirma' && !bomba.tags[v.id])
              .map(v => plantilla.find(x => x.id === v.id)?.nombre ?? v.id)
          }
        }
        out.push({ campoId: c, equipo, familia, falla, visibilidad, faltan })
      }
    }
  }
  return out.sort((a, b) => b.falla.inicio.getTime() - a.falla.inicio.getTime())
}
