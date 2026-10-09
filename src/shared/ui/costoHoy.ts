import type { Riesgo } from '@/entities/diferido'
import type { NivelDetalle } from '@/entities/tipos'
import { HORIZONTE_H, textoHoras } from '@/entities/salud'
import { n0 } from '@/shared/lib/formato'

/* «Si falla hoy» (`Riesgo.costoFalla`, decisión del dueño, 8-oct-2026): lo que
   costaría que el equipo fallara HOY, con el tiempo fuera de sus fallas
   cerradas y sin las horas que aguanta hoy el tanque. Se dice igual en Riesgo
   y en Mantenimiento. Lo que el equipo YA costó por falla es otra cifra
   (`bblPorFalla`, «le ha costado por falla»). */

type Costo = Pick<Riesgo, 'costoFalla' | 'colchonH' | 'mdtFuente'>

/** «≈ 2.086 bbl si falla hoy»; sin cifra (sin historia con que estimarla), nada. */
export const costoHoy = (r: Costo): string | undefined =>
  r.costoFalla === undefined ? undefined : `≈ ${n0(r.costoFalla)} bbl si falla hoy`

/** Con tanque: una reparación más corta que el colchón de hoy no cuesta
 *  crudo. «0 si vuelve antes de 19 h», con las horas truncadas (la regla de
 *  `textoHoras`, hacia abajo: un colchón de 18,6 h dice «18 h», porque una
 *  reparación de 18,8 h sí cuesta). Menos de una hora no se dice. */
export const colchonCorto = (r: Costo): string | undefined =>
  r.costoFalla !== undefined && r.colchonH !== undefined && r.colchonH >= 1 && r.colchonH <= HORIZONTE_H
    // Espacios duros en «antes de 19 h»: en la columna angosta parte en «0 si vuelve» / «antes de 19 h», nunca deja la «h» sola.
    ? `0 si vuelve ${`antes de ${textoHoras(r.colchonH, true)}`.replace(/ /g, '\u00a0')}` : undefined

/** El ⓘ: de dónde sale la cifra (`mdtFuente`; la cifra ya está a la vista) y,
 *  con colchón, que una reparación corta no cuesta crudo. */
export const detalleCostoHoy = (r: Costo): string | undefined =>
  r.costoFalla === undefined || !r.mdtFuente ? undefined
    : `${r.mdtFuente.charAt(0).toUpperCase()}${r.mdtFuente.slice(1)}.${colchonCorto(r) ? ' Una reparación más corta no cuesta crudo.' : ''}`

/** Ingeniería: la cifra se estimó con la flota del campo (el equipo nunca ha
 *  fallado) y vale menos que la historia propia. Igual en Riesgo y Mantenimiento. */
export const deFlota = (r: Pick<Riesgo, 'costoDe'>, nivel: NivelDetalle): boolean =>
  nivel === 'ingenieria' && r.costoDe === 'flota'
