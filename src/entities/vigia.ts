/** El vigía: cuántos días faltan para que una variable cruce su límite, y
 *  con qué rango. Lo que está en juego si la bomba se para lo dice
 *  `diferido.ts` (`veredicto`).
 *
 *  Solo anticipa mecanismos de DEGRADACIÓN (ISO 14224 / SINTEF): lo súbito no
 *  da aviso. Y solo proyecta cuando la tendencia es estadísticamente real: una
 *  pendiente que no supera dos errores estándar no es tendencia, es ruido, y
 *  proyectarla sería inventar una fecha.
 */
import { equipoEnCampo } from './equipos'
import { mecanismo, type Mecanismo } from './iso14224'
import { plantillaDe, type PerfilBomba, type Plantilla, type Alarma } from './bombas'
import { limiteDe as limiteDelTag } from './limites'
import { faltaEnSerie } from './serie'
import type { EstadoDispositivo, SerieTag } from './tipos'

export interface Tendencia {
  /** Unidades por hora. */
  pendiente: number
  /** Valor ajustado en `desde` de la serie (x = 0 h). */
  ordenada: number
  errorPendiente: number
  r2: number
  /** Puntos con lectura que entraron al ajuste (los huecos no cuentan). */
  n: number
  /** Horas desde el primer valor hasta el último lugar de la serie: el «ahora»
   *  de la serie, desde donde se cuentan las horas para cruzar. */
  finH: number
  /** Valor ajustado en `finH`. */
  actual: number
}

/** Mínimos cuadrados sobre la serie, con el error estándar de la pendiente.
 *  Cada valor va en su tiempo real (`i × pasoH` horas desde `desde`) y los
 *  huecos (null) se quedan fuera sin mover a los demás: la pendiente sale en
 *  unidades por hora con el paso que traiga la serie, no con uno supuesto. */
export function tendencia(serie: SerieTag): Tendencia | undefined {
  // Una serie mal formada no se ajusta con un paso inventado: es un error del
  // contrato y se dice (el códec ya la rechaza al entrar).
  const falta = faltaEnSerie(serie)
  if (falta) throw new Error(`Serie del historiador mal formada: ${falta}`)
  const xs: number[] = [], ys: number[] = []
  serie.valores.forEach((v, i) => { if (v !== null) { xs.push(i * serie.pasoH); ys.push(v) } })
  const n = xs.length
  if (n < 4) return undefined
  const mx = xs.reduce((a, x) => a + x, 0) / n
  const my = ys.reduce((a, y) => a + y, 0) / n
  let sxx = 0, sxy = 0, syy = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i]! - mx, dy = ys[i]! - my
    sxx += dx * dx; sxy += dx * dy; syy += dy * dy
  }
  if (sxx === 0) return undefined
  const b = sxy / sxx, a = my - b * mx
  let res = 0
  for (let i = 0; i < n; i++) res += (ys[i]! - (a + b * xs[i]!)) ** 2
  const s2 = res / (n - 2)
  const finH = (serie.valores.length - 1) * serie.pasoH
  return {
    pendiente: b, ordenada: a, n, finH,
    errorPendiente: Math.sqrt(s2 / sxx),
    r2: syy > 0 ? 1 - res / syy : 1,
    actual: a + b * finH,
  }
}

export type Pronostico =
  | { tipo: 'cruza'; horas: number; rango: [number, number] }
  | { tipo: 'cruzado' }
  | { tipo: 'sin-tendencia'; motivo: string }
  | { tipo: 'sin-limite' }
  | { tipo: 'no-atribuible'; motivo: string }

/** Horas hasta cruzar el límite. El rango sale de la pendiente ± 2 errores
 *  estándar: cerca del 95 % si los residuos son normales. */
export function pronostico(t: Tendencia, limite: number, sentido: 'sube' | 'baja'): Pronostico {
  const signo = sentido === 'sube' ? 1 : -1
  const b = t.pendiente * signo
  const falta = (limite - t.actual) * signo
  if (falta <= 0) return { tipo: 'cruzado' }
  if (b <= 2 * t.errorPendiente) {
    return { tipo: 'sin-tendencia', motivo: b <= 0 ? 'La variable no va hacia el límite' : 'La pendiente no supera dos errores estándar: es ruido' }
  }
  const rapido = falta / (b + 2 * t.errorPendiente)
  const lento = falta / (b - 2 * t.errorPendiente)
  return { tipo: 'cruza', horas: falta / b, rango: [rapido, lento] }
}

export interface Senal {
  plantilla: Plantilla
  tag: string
  unidad: string
  /** null si el instrumento no tiene señal: nunca se muestra como cero. */
  valor: number | null
  /** La del historiador; undefined si el instrumento no la tiene. */
  serie?: SerieTag
  /** De dónde viene la lectura: PLC, variador, portátil. */
  origen: string
  /** El estado que reporta el sistema de alarmas. Manda sobre cualquier
   *  cosa que la pantalla pudiera deducir del número. */
  estado: EstadoDispositivo
  /** Banda normal y alarma: las del límite del tag (`limites.ts`), la misma
   *  fuente que lee la salud y que entrega el catálogo. */
  normal?: [number, number]
  alarma?: Alarma
  limite?: { valor: number; sentido: 'sube' | 'baja' }
  mecanismo?: Mecanismo
  tendencia?: Tendencia
  pronostico: Pronostico
}

/** ¿La señal se puede proyectar? Solo lo que anuncia un mecanismo que no es
 *  súbito: la regla única del vigía, para la salud de las partes y para el
 *  veredicto. Una variable sin mecanismo declarado (una presión de barrera,
 *  una de aceite) se proyecta contra su alarma. */
export const proyectable = (s: Pick<Senal, 'mecanismo'>) => s.mecanismo?.familia !== 'choque'

const limiteDe = (a: Alarma | undefined, sentido: 'sube' | 'baja') =>
  sentido === 'sube' ? a?.alta : a?.baja

/** Las variables instrumentadas de la bomba, cada una con su pronóstico. */
export function senalesDe(p: PerfilBomba): Senal[] {
  const eq = equipoEnCampo(p.equipo, p.campoId)
  if (!eq) return []
  const dev = (tag?: string) => tag ? eq.dispositivos.find(d => d.tag === tag) : undefined
  const parada = eq.marcha === 'detenido'

  // A presión diferencial constante, más velocidad es menos eficiencia. Si la
  // presión diferencial cambió, la velocidad puede haber subido por proceso.
  // Las dos series se restan instante por instante: solo si van en el mismo
  // tiempo (mismo inicio, paso y largo), y un hueco en cualquiera es hueco.
  const pd = dev(p.tags.p_descarga)?.serie, ps = dev(p.tags.p_succion)?.serie
  const alineadas = !!pd && !!ps && Date.parse(pd.desde) === Date.parse(ps.desde) && pd.pasoH === ps.pasoH && pd.valores.length === ps.valores.length
  const dp = alineadas ? pd!.valores.flatMap((v, i) => { const w = ps!.valores[i]; return v === null || w === null || w === undefined ? [] : [v - w] }) : undefined
  const dpMedia = dp?.length ? dp.reduce((a, v) => a + v, 0) / dp.length : 0
  const dpEstable = !!dp?.length && dp.every(v => Math.abs(v - dpMedia) <= 0.05 * dpMedia)

  const out: Senal[] = []
  for (const pl of plantillaDe(p.subtipo)) {
    const d = dev(p.tags[pl.id])
    // Un instrumento sin lectura llega con `valor: null` (el contrato): es una
    // señal sin señal, no una variable que no existe. Un texto es un
    // interruptor y lo lee la salud como discreta.
    if (!d || (d.valor !== null && typeof d.valor !== 'number')) continue
    const sinLectura = d.valor === null
    const serie = d.serie
    // Banda y alarma salen del límite del tag: una sola fuente para las dos.
    const lt = limiteDelTag(p.campoId, d.tag)
    const alarma = lt?.alarma
    const sentido = pl.anuncia?.sentido ?? (alarma?.baja !== undefined && alarma.alta === undefined ? 'baja' : 'sube')
    const lim = limiteDe(alarma, sentido)
    const t = parada || !serie ? undefined : tendencia(serie)
    let pron: Pronostico
    const sinSenal = sinLectura || d.estado === 'sin señal'
    if (sinSenal) pron = { tipo: 'sin-tendencia', motivo: `Sin señal en línea: ${d.origen}` }
    else if (parada) pron = { tipo: 'sin-tendencia', motivo: 'La bomba está detenida: no hay tendencia que proyectar' }
    else if (lim === undefined) pron = { tipo: 'sin-limite' }
    else if (!t) pron = { tipo: 'sin-tendencia', motivo: 'Faltan puntos para ajustar una tendencia' }
    else if (pl.id === 'velocidad' && p.subtipo === 'multifasica' && !dpEstable)
      pron = { tipo: 'no-atribuible', motivo: 'La presión diferencial cambió más de 5 %: la velocidad pudo subir por proceso, no por desgaste' }
    else pron = pronostico(t, lim, sentido)
    out.push({
      plantilla: pl, tag: d.tag, unidad: d.unidad, valor: sinSenal || typeof d.valor !== 'number' ? null : d.valor, serie, origen: d.origen,
      // Sin lectura no hay estado que leer del número: es «sin señal».
      estado: sinLectura ? 'sin señal' : d.estado,
      normal: lt?.normal, alarma,
      limite: lim !== undefined ? { valor: lim, sentido } : undefined,
      mecanismo: pl.anuncia ? mecanismo(pl.anuncia.mecanismo) : undefined,
      tendencia: t, pronostico: pron,
    })
  }
  return out
}
