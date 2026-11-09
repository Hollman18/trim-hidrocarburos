/** EL VIGÍA DE LA PLANTA (Fase 5 de facilidades): el mismo vigía de las bombas (`vigia.ts`) sobre los
 *  equipos de planta que tienen familia (`familias-planta.ts`): tratadores, separadores, torres de
 *  enfriamiento, bombas de despacho y de diluyente, la UPS y el aire.
 *
 *  Para cada variable continua con serie y alarma (`limites.ts`, la única fuente de la banda y la alarma):
 *  la tendencia de mínimos cuadrados y las horas hasta la alarma con su rango (± 2 errores estándar). Avisa
 *  si ya la cruzó o si la cruza dentro del horizonte. Una pendiente que no supera dos errores estándar es
 *  ruido y no se proyecta: no se inventa una fecha.
 *
 *  Lo que TRIM hace con el aviso es lo mismo que con las bombas: lo pone en «Avisan» (el riesgo, que leen
 *  el jefe de mantenimiento y confiabilidad) y en la ficha del equipo. */
import { EQUIPOS, equipoEnCampo } from './equipos'
import { limiteDe } from './limites'
import { tendencia, pronostico, type Pronostico } from './vigia'
import { FAMILIAS_PLANTA, type FamiliaPlanta } from './familias-planta'
import type { TipoCausa } from './causa-senal'

/** Hasta dónde mira el vigía: lo que cruza después de 30 días no es un aviso todavía. */
export const HORIZONTE_H = 30 * 24

export interface AvisoVigiaPlanta {
  campoId: string
  equipo: string
  familia: FamiliaPlanta
  /** La parte de la familia que lee esa variable. */
  parte: string
  tag: string
  variable: string
  unidad: string
  valor: number
  limite: { valor: number; sentido: 'sube' | 'baja'; fuente: string }
  /** `cruza` con sus horas y su rango, o `cruzado`. */
  pronostico: Extract<Pronostico, { tipo: 'cruza' } | { tipo: 'cruzado' }>
  /** Lo que se hace (de la parte en la familia). */
  accion?: string
}

/** El tipo de causa que se le carga a cada familia si para (el mismo vocabulario del libro). */
export const TIPO_DE_FAMILIA: Readonly<Record<FamiliaPlanta, TipoCausa>> = {
  generador: 'energia', transformador: 'energia', ups: 'energia', 'compresor-aire': 'aire',
  'bomba-transferencia': 'evacuacion', tratador: 'tratamiento', 'torre-enfriamiento': 'proceso', separador: 'proceso', 'bomba-diluyente': 'diluyente',
}

/** Los avisos del vigía de planta en un campo: por equipo, de lo ya cruzado a lo que cruza primero. */
export function vigiaDePlanta(campoId: string): AvisoVigiaPlanta[] {
  const out: AvisoVigiaPlanta[] = []
  for (const id of Object.keys(EQUIPOS)) {
    const familia = EQUIPOS[id]!.familia
    const eq = familia ? equipoEnCampo(id, campoId) : undefined
    // Parado no tiene tendencia que proyectar: eso ya lo dice «parado».
    if (!familia || !eq?.instrumentado || eq.marcha !== 'en-marcha') continue
    const fam = FAMILIAS_PLANTA[familia]
    for (const d of eq.dispositivos) {
      if (typeof d.valor !== 'number' || !d.serie || d.estado === 'sin señal') continue
      const alarma = limiteDe(campoId, d.tag)?.alarma
      if (!alarma || (alarma.alta === undefined && alarma.baja === undefined)) continue
      const sentido: 'sube' | 'baja' = alarma.alta !== undefined ? 'sube' : 'baja'
      const valorLimite = (sentido === 'sube' ? alarma.alta : alarma.baja)!
      const t = tendencia(d.serie)
      if (!t) continue
      const p = pronostico(t, valorLimite, sentido)
      if (p.tipo !== 'cruzado' && !(p.tipo === 'cruza' && p.horas <= HORIZONTE_H)) continue
      const parte = fam.partes.find(x => x.variables.some(v => v.nombre === d.tipo))
      out.push({
        campoId, equipo: id, familia, parte: parte?.nombre ?? fam.nombre, tag: d.tag, variable: d.tipo, unidad: d.unidad, valor: d.valor,
        limite: { valor: valorLimite, sentido, fuente: alarma.fuente }, pronostico: p, ...(parte?.accion ? { accion: parte.accion } : {}),
      })
    }
  }
  const horas = (a: AvisoVigiaPlanta) => (a.pronostico.tipo === 'cruzado' ? -1 : a.pronostico.horas)
  return out.sort((a, b) => horas(a) - horas(b))
}

const n1 = (v: number) => v.toLocaleString('es-CO', { maximumFractionDigits: 1 })
const dias = (h: number) => (h < 48 ? `${Math.round(h)} h` : `${Math.round(h / 24)} d`)

/** El aviso en una frase: «Vibración de P-401: 3,1 mm/s; llega a 3,9 en 8 d (7 a 10).» */
export function fraseVigia(a: AvisoVigiaPlanta): string {
  const lim = `${n1(a.limite.valor)}${a.unidad ? ` ${a.unidad}` : ''}`
  const que = `${a.variable} de ${a.equipo}: ${n1(a.valor)}${a.unidad ? ` ${a.unidad}` : ''}`
  if (a.pronostico.tipo === 'cruzado') return `${que}; ya pasó su alarma (${lim}).`
  const [r0, r1] = a.pronostico.rango
  const rango = dias(r0) === dias(r1) ? '' : ` (${dias(r0)} a ${dias(r1)})`
  return `${que}; ${a.limite.sentido === 'sube' ? 'sube' : 'baja'} hacia su alarma (${lim}) y llega en ${dias(a.pronostico.horas)}${rango}.`
}
