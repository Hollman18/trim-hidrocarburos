import { mesCerrado, type Mes } from '@/entities/libro'
import { calendarioDelCatalogo } from './catalogo'

/** El calendario de los datos: los meses que tienen producción fiscal en
 *  algún campo, del más viejo al más nuevo, con su marca de publicado. Lo
 *  decide el servidor (es la producción que tiene), no el front: viene en
 *  `GET /api/catalogo` → `calendario`. */
export const pedirCalendario = (): readonly Mes[] => calendarioDelCatalogo()

/** Los meses ya cerrados (empezó el siguiente), como «AAAA-MM». Del mismo
 *  calendario: un mes está cerrado cuando ya empezó el siguiente. */
export const pedirMesesCerrados = (): string[] => calendarioDelCatalogo().filter(mesCerrado).map(m => m.mes)

/** El primer instante con datos: desde ahí cuenta «toda la historia». */
export const pedirInicioDeHistoria = (): Date => new Date(calendarioDelCatalogo()[0]!.desde)
