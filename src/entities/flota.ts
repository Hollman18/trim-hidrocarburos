/** La flota de alto impacto de un campo: las bombas de la línea que tienen
 *  perfil (reinyección y multifásicas) y los pozos con electrosumergible. Son
 *  los equipos que vigila TRIM; una sola lista para todas las pantallas. */
import { EQUIPOS } from './equipos'
import { esBomba, perfilBomba } from './bombas'
import { pozosDe } from './pozos'
import type { Familia } from './partes'

// Una sola definición de la familia (la de `partes.ts`): dos copias iguales
// compilarían juntas hasta el día en que una cambie y la otra no.
export type { Familia }

export const NOMBRE_FAMILIA: Record<Familia, string> = {
  // P-09 · La familia del motor (`FAMILIA.reinyeccion`): «bomba de agua».
  inyeccion: 'Bombas de agua', multifasica: 'Bombas multifásicas', electrosumergible: 'Electrosumergibles',
}

export function flotaDe(campoId: string): Array<{ equipo: string; familia: Familia }> {
  const bombas = Object.keys(EQUIPOS).flatMap(id => {
    const p = esBomba(id) ? perfilBomba(id, campoId) : undefined
    return p ? [{ equipo: id, familia: (p.subtipo === 'multifasica' ? 'multifasica' : 'inyeccion') as Familia }] : []
  })
  const esp = pozosDe(campoId).filter(p => p.levantamiento === 'electrosumergible').map(p => ({ equipo: p.id, familia: 'electrosumergible' as Familia }))
  return [...bombas, ...esp]
}
