/* Las capturas anotadas del documento del backend (docs/backend/img/), por grupo.
 * Se regeneran con `npm run pantallazos:doc` (scripts/pantallazos-doc.mjs). */
import * as g0 from './capturas/01-propuesta.mjs'
import * as g1 from './capturas/06a-libro-gerencia.mjs'
import * as g2 from './capturas/06b-operacion.mjs'
import * as g3 from './capturas/06c-mantenimiento-marco.mjs'

export const CAPTURAS = [
  ...g0.CAPTURAS, ...(g0.CAPTURAS_ESCRITAS ?? []),
  ...g1.CAPTURAS, ...(g1.CAPTURAS_ESCRITAS ?? []),
  ...g2.CAPTURAS, ...(g2.CAPTURAS_ESCRITAS ?? []),
  ...g3.CAPTURAS, ...(g3.CAPTURAS_ESCRITAS ?? []),
]
