/** La electrosumergible de cada pozo vista desde su variador y su sensor de
 *  fondo: cómo está ahora, qué dicen sus señales y qué parte se está dañando.
 *
 *  Las señales del demo se generan aquí de forma determinista por pozo (son
 *  las lecturas que en producción vienen del historiador: `GET …/tags/:tag/serie`).
 *  Los límites son los AJUSTES DE PROTECCIÓN del variador de cada pozo, que
 *  son configuración del pozo, no un número del producto.
 */
import { tendencia, pronostico, type Senal } from './vigia'
import { serieHasta } from './serie'
import { PARTES_ESP, type ParteId } from './partes'
import { evaluarPartes, type SaludParte } from './salud'
import { mecanismo } from './iso14224'
import { pruebaEn, estadoAhora, type Pozo } from './pozos'
import { causaDeEvento, type Contexto } from './causa-senal'
export { estadoAhora }
import type { Plantilla, VariableId } from './bombas'
import type { EstadoDispositivo } from './tipos'
import { AHORA } from './reloj'

export const PLANTILLA_ESP: Plantilla[] = [
  { id: 'corriente', isa: 'II', nombre: 'Corriente del motor', donde: 'Variador',
    anuncia: { mecanismo: '1.6', sentido: 'sube', por: 'A frecuencia fija, la bomba se frena por sólidos o roce y la carga sube.' } },
  { id: 'frecuencia', isa: 'SI', nombre: 'Frecuencia', donde: 'Variador' },
  { id: 'pip', isa: 'PI', nombre: 'Presión de entrada', donde: 'Sensor de fondo',
    anuncia: { mecanismo: '5.1', sentido: 'baja', por: 'Cae hacia el punto en que la bomba empieza a manejar gas o a quedarse sin fluido.' } },
  { id: 't_motor', isa: 'TI', nombre: 'Temperatura del motor', donde: 'Sensor de fondo',
    anuncia: { mecanismo: '2.7', sentido: 'sube', por: 'Sube cuando falta enfriamiento o el protector deja entrar fluido.' } },
  { id: 'desbalance', isa: 'II', nombre: 'Desbalance de corriente entre fases', donde: 'Variador',
    anuncia: { mecanismo: '4.5', sentido: 'sube', por: 'Crece a medida que el aislamiento del motor o del cable se degrada.' } },
]

const AJUSTE = 'Ajuste de protección del variador del pozo (configuración del pozo)'

/* Lecturas del demo: deterministas por pozo. Unos pocos pozos llevan una
   tendencia a propósito, para que el vigía tenga qué decir. */
const semilla = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 2147483647, 7)
const azar = (s: number) => () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648 }

const TENDENCIAS: Record<string, Partial<Record<VariableId, number>>> = {
  // pendiente por día como fracción del valor base (positiva sube)
  'morichal/MN-07': { corriente: 0.016 },
  'morichal/MN-18': { pip: -0.03 },
  'morichal/MN-27': { t_motor: 0.0085 },
  'guacamayo/GU-04': { desbalance: 0.11 },
}
const YA_FUERA: Record<string, Partial<Record<VariableId, number>>> = {
  'guacamayo/GU-07': { desbalance: 10.6 },
}

/** Las lecturas del demo son un valor por día (doce días que terminan ahora). */
const PASO_DEMO_H = 24

interface Lectura { serie: number[]; normal: [number, number]; alarma: { alta?: number; baja?: number }; unidad: string; tag: string }

function lecturas(p: Pozo): Partial<Record<VariableId, Lectura>> {
  const r = azar(semilla(`${p.campoId}/${p.id}`))
  const clave = `${p.campoId}/${p.id}`
  const t = TENDENCIAS[clave] ?? {}
  const fuera = YA_FUERA[clave] ?? {}
  const ctl = p.controlador
  const corrBase = Math.round(35 + r() * 50)
  const pipBase = Math.round(350 + r() * 550)
  const tBase = Math.round(95 + r() * 30)
  const desBase = Math.round((1 + r() * 2.5) * 10) / 10
  const hz = pruebaEn(p, AHORA.getTime())?.hz ?? 55
  const serie = (base: number, id: VariableId, arranque = 1) => Array.from({ length: 12 }, (_, i) => {
    const ruido = (r() - 0.5) * 0.012 * base
    const pend = (t[id] ?? 0) * base * i
    return Math.round((base * arranque + pend + ruido) * 10) / 10
  })
  const corrIni = t.corriente ? 1.07 : 1
  const pipIni = t.pip ? 0.72 : 1
  const tIni = t.t_motor ? 1.06 : 1
  return {
    corriente: { serie: serie(corrBase, 'corriente', corrIni), normal: [corrBase * 0.85, corrBase * 1.12], alarma: { alta: Math.round(corrBase * 1.25), baja: Math.round(corrBase * 0.65) }, unidad: 'A', tag: `${ctl} · corriente` },
    frecuencia: { serie: Array(12).fill(hz), normal: [hz - 1, hz + 1], alarma: {}, unidad: 'Hz', tag: `${ctl} · frecuencia` },
    pip: { serie: serie(pipBase, 'pip', pipIni), normal: [pipBase * 0.7, pipBase * 1.2], alarma: { baja: Math.round(pipBase * 0.35) }, unidad: 'psi', tag: `PIT-${p.id.replace('-', '')} · sensor de fondo` },
    t_motor: { serie: serie(tBase, 't_motor', tIni), normal: [tBase - 10, 135], alarma: { alta: 150 }, unidad: '°C', tag: `TIT-${p.id.replace('-', '')} · sensor de fondo` },
    desbalance: {
      serie: fuera.desbalance ? Array.from({ length: 12 }, (_, i) => Math.round((fuera.desbalance! - 0.9 + i * 0.08) * 10) / 10)
        : t.desbalance ? Array.from({ length: 12 }, (_, i) => Math.round((4 + i * t.desbalance! * 4 + (r() - 0.5) * 0.1) * 10) / 10)
          : serie(desBase, 'desbalance'),
      normal: [0, 5], alarma: { alta: 10 }, unidad: '%', tag: `${ctl} · desbalance de corriente`,
    },
  }
}

/* Fuera de la banda normal sin llegar a la alarma es «atención», igual que en
   los instrumentos de las bombas: la misma lectura no puede ser una cosa en
   una familia y otra en la otra. */
const estadoDe = (v: number, l: Lectura): EstadoDispositivo =>
  (l.alarma.alta !== undefined && v >= l.alarma.alta) || (l.alarma.baja !== undefined && v <= l.alarma.baja) ? 'alarma'
    : v < l.normal[0] || v > l.normal[1] ? 'atencion' : 'normal'

/** Lo que el variador SÍ mide con el motor apagado: corriente y frecuencia en
 *  cero. Su alarma baja es consecuencia de la parada, que ya marca el
 *  controlador (alarmas por estado, ISA-18.2): no se repite. El sensor de
 *  fondo y el desbalance no tienen lectura en línea con el motor parado: van
 *  como hueco, nunca como cero. */
const MEDIDA_CON_MOTOR_PARADO: ReadonlySet<VariableId> = new Set(['corriente', 'frecuencia'])

/** Las señales de la electrosumergible, cada una con su pronóstico. Con el
 *  pozo parado no proyecta: no hay tendencia que leer. */
export function senalesEsp(p: Pozo): Senal[] {
  if (p.levantamiento !== 'electrosumergible') return []
  const ahora = estadoAhora(p)
  const ls = lecturas(p)
  const out: Senal[] = []
  for (const pl of PLANTILLA_ESP) {
    const l = ls[pl.id]
    if (!l) continue
    const valor = ahora.produce ? l.serie.at(-1)! : MEDIDA_CON_MOTOR_PARADO.has(pl.id) ? 0 : null
    const sentido = pl.anuncia?.sentido ?? 'sube'
    const lim = sentido === 'sube' ? l.alarma.alta : l.alarma.baja
    // Las lecturas del demo son diarias y terminan ahora; el vigía lee el paso de la serie.
    const serie = serieHasta(l.serie, PASO_DEMO_H)
    const tnd = ahora.produce ? tendencia(serie) : undefined
    const pron = !ahora.produce ? { tipo: 'sin-tendencia' as const, motivo: 'El pozo está parado: no hay tendencia que proyectar' }
      : lim === undefined ? { tipo: 'sin-limite' as const }
        : !tnd ? { tipo: 'sin-tendencia' as const, motivo: 'Faltan puntos para ajustar una tendencia' }
          : pronostico(tnd, lim, sentido)
    out.push({
      plantilla: pl, tag: l.tag, unidad: l.unidad, valor, serie,
      origen: valor === null ? `${pl.donde === 'Variador' ? 'variador del pozo' : 'sensor de fondo'} · sin lectura con el motor parado`
        : pl.donde === 'Variador' ? 'variador del pozo' : 'sensor de fondo',
      estado: valor === null ? 'sin señal' : ahora.produce ? estadoDe(valor, l) : 'normal',
      normal: l.normal, alarma: { ...l.alarma, fuente: AJUSTE },
      limite: lim !== undefined ? { valor: lim, sentido } : undefined,
      mecanismo: pl.anuncia ? mecanismo(pl.anuncia.mecanismo) : undefined,
      tendencia: tnd, pronostico: pron,
    })
  }
  return out
}

/** La parte de la electrosumergible a la que se le atribuye la parada
 *  abierta del pozo: la de la causa de su evento abierto, cuando esa causa es
 *  su PROPIA electrosumergible (código del variador o declarada con la
 *  parte). Cerrado por otro equipo, a frecuencia reducida o produciendo: ninguna. */
export function parteQueFallo(p: Pozo, ctx: Contexto): ParteId | undefined {
  const e = estadoAhora(p)
  if (e.produce || !e.evento) return undefined
  const c = causaDeEvento(e.evento, ctx)
  return c.tipo === 'electrosumergible' && c.equipo === p.id ? c.parte : undefined
}

/** Las partes de la electrosumergible con su estado. Con el pozo parado por
 *  su propia electrosumergible, la parte de esa falla sale «falló» (como en
 *  las bombas). Pide el contexto para que ningún llamador se la salte: la
 *  causa toma las respuestas y el programa firmado. */
export function saludDeEsp(p: Pozo, ctx: Contexto): SaludParte[] {
  if (p.levantamiento !== 'electrosumergible') return []
  const senales = senalesEsp(p)
  return evaluarPartes({
    partes: PARTES_ESP, plantilla: PLANTILLA_ESP, senales,
    instrumentada: () => true,
    detenido: !estadoAhora(p).produce,
    parteFallo: parteQueFallo(p, ctx),
  })
}
