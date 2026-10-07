/** Los insumos del demo, en el orden en que los entrega el backend. Este es
 *  el ÚNICO módulo que junta `datos/*`: lo carga `shared/api/fuente.ts` con
 *  import dinámico solo en el demo, y los scripts de verificación al arrancar.
 *  Nada más los importa (si algo lo hiciera, la historia de demostración
 *  volvería al paquete de un build conectado al servidor). */
import type { Insumos } from '../insumos'
import { POZOS_DEMO } from './pozos'
import { EVENTOS_POZOS } from './eventos-pozos'
import { EVENTOS_SERVICIOS } from './servicios'
import { PRODUCCION_DIARIA, ORIGEN_PMO } from './produccion-diaria'
import { PARADAS_BOMBAS } from './paradas-bombas'
import { PROGRAMA_INICIAL } from './programa'

export const INSUMOS_DEMO: Insumos = {
  pozos: POZOS_DEMO,
  eventosPozos: EVENTOS_POZOS,
  eventosServicios: EVENTOS_SERVICIOS,
  produccionDiaria: PRODUCCION_DIARIA,
  origenPmo: ORIGEN_PMO,
  paradasBombas: PARADAS_BOMBAS,
  programa: PROGRAMA_INICIAL,
}
