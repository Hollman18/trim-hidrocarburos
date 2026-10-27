import type { Riesgo } from '@/entities/diferido'
import type { NivelDetalle } from '@/entities/tipos'
import { HORIZONTE_H, textoHoras } from '@/entities/salud'
import { n0 } from '@/shared/lib/formato'

/* «Si falla hoy» (`Riesgo.costoFallaHoy`, decisión del dueño, 8-oct-2026): lo que
   costaría que el equipo fallara HOY, con el tiempo fuera de sus fallas
   cerradas y sin las horas que aguanta hoy el tanque. Se dice igual en Riesgo
   y en Mantenimiento. Lo que el equipo YA costó por falla es otra cifra
   (`bblPorFalla`, «le ha costado por falla»). */

type Costo = Pick<Riesgo, 'costoFallaHoy' | 'colchonH' | 'mdtFuente'>

/** «≈ 2.086 bbl le costaría la falla»; sin cifra (sin historia con que estimarla), nada.
 *  «Si falla hoy» es siempre una tasa en bbl/d (D-2, G-16): el costo de una
 *  falla, en barriles, lleva su propio nombre. */
export const costoHoy = (r: Costo): string | undefined =>
  r.costoFallaHoy === undefined ? undefined : `≈ ${n0(r.costoFallaHoy)} bbl le costaría la falla`

/** Con tanque: una reparación más corta que el colchón de hoy no cuesta
 *  crudo. «0 si vuelve antes de 19 h», con las horas truncadas (la regla de
 *  `textoHoras`, hacia abajo: un colchón de 18,6 h dice «18 h», porque una
 *  reparación de 18,8 h sí cuesta). Menos de una hora no se dice. */
export const colchonCorto = (r: Costo): string | undefined =>
  r.costoFallaHoy !== undefined && r.colchonH !== undefined && r.colchonH >= 1 && r.colchonH <= HORIZONTE_H
    // Espacios duros en «antes de 19 h»: en la columna angosta parte en «0 si vuelve» / «antes de 19 h», nunca deja la «h» sola.
    ? `0 si vuelve ${`antes de ${textoHoras(r.colchonH, true)}`.replace(/ /g, '\u00a0')}` : undefined

/** El ⓘ: de dónde sale la cifra (`mdtFuente`; la cifra ya está a la vista) y,
 *  con colchón, que una reparación corta no cuesta crudo. */
export const detalleCostoHoy = (r: Costo): string | undefined =>
  r.costoFallaHoy === undefined || !r.mdtFuente ? undefined
    : `${r.mdtFuente.charAt(0).toUpperCase()}${r.mdtFuente.slice(1)}.${colchonCorto(r) ? ' Una reparación más corta no cuesta crudo.' : ''}`

/** Ingeniería: la cifra se estimó con la flota del campo (el equipo nunca ha
 *  fallado) y vale menos que la historia propia. Igual en Riesgo y Mantenimiento. */
export const deFlota = (r: Pick<Riesgo, 'costoDe'>, nivel: NivelDetalle): boolean =>
  nivel === 'ingenieria' && r.costoDe === 'flota'

/** «Si para»: lo que se pierde por día si el equipo para, dicho igual en Riesgo,
 *  Turno, Mantenimiento y Equipos. Un techo del motor (`Riesgo.techo`: supone que
 *  se cierra todo lo que produce y depende del equipo) se dice «hasta», como en
 *  «Si falla hoy», nunca como cifra exacta (D6; QA-R, vecino 1). Un servicio del
 *  campo sin nada produciendo cierra «todo el campo». */
export const siPara = (r: Pick<Riesgo, 'bblDia' | 'techo'>, servicio = false): string =>
  servicio && r.bblDia === 0 ? 'todo el campo' : `${r.techo ? 'hasta ' : ''}${n0(r.bblDia)} bbl/d`
/** Lo mismo en un globo (y en el papel), con el porqué del techo. */
export const siParaLargo = (r: Pick<Riesgo, 'bblDia' | 'techo'>, servicio = false): string =>
  servicio && r.bblDia === 0 ? 'cierra lo que esté produciendo en el campo'
    : `${siPara(r)}${r.techo ? ' (un techo: si se cierran todos los pozos que dependen de él)' : ''}`
/** Varias filas sumadas: si alguna es un techo, la suma también («hasta»). */
export const sumaSiPara = (rs: ReadonlyArray<Pick<Riesgo, 'bblDia' | 'techo'>>): { bblDia: number; techo?: true } => {
  const bblDia = rs.reduce((a, r) => a + r.bblDia, 0)
  return rs.some(r => r.techo) ? { bblDia, techo: true } : { bblDia }
}
