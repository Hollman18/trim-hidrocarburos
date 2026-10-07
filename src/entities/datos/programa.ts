/** Programa de paradas aprobado (es configuración, como las metas) · DATOS DE DEMO.
 *
 *  Generado por scripts/gen-linea.mjs (determinista). Todo sale de equipos:
 *  controladores de pozo, PLC de bombas y servicios, transmisores de nivel,
 *  separadores de prueba y el computador de flujo del punto de medición
 *  oficial. NO es historia de un campo real. */
import type { ParadaProgramada } from '../configuracion'

export const PROGRAMA_INICIAL: ParadaProgramada[] = [
  {id: 'PR-2011-260819', campoId: 'ceiba', equipo: 'P-201B', desde: '2026-08-19T17:49:23-05:00', hasta: '2026-08-20T09:34:04-05:00', motivo: 'Mantenimiento preventivo programado de la bomba'},
  {id: 'PR-M2011-260217', campoId: 'morichal', equipo: 'P-201B', desde: '2026-02-17T00:21:34-05:00', hasta: '2026-02-17T15:48:55-05:00', motivo: 'Mantenimiento preventivo programado de la bomba'},
  {id: 'PR-3016-260825', campoId: 'morichal', equipo: 'MPP-301', desde: '2026-08-25T14:36:55-05:00', hasta: '2026-08-26T05:10:37-05:00', motivo: 'Mantenimiento preventivo programado de la bomba'},
  {id: 'PR-G2011-251202', campoId: 'guacamayo', equipo: 'P-201B', desde: '2025-12-02T04:44:50-05:00', hasta: '2025-12-02T18:37:11-05:00', motivo: 'Mantenimiento preventivo programado de la bomba'},
  {id: 'PR-PA03-260429', campoId: 'palmar', equipo: 'PA-03', desde: '2026-04-29T19:59:00-05:00', hasta: '2026-04-30T10:44:06-05:00', motivo: 'Cambio programado de la bomba de subsuelo'},
  {id: 'PR-PA05-260510', campoId: 'palmar', equipo: 'PA-05', desde: '2026-05-10T07:49:00-05:00', hasta: '2026-05-11T06:00:15-05:00', motivo: 'Cambio programado de la bomba de subsuelo'},
  {id: 'PR-LC19-260123', campoId: 'ceiba', equipo: 'LC-19', desde: '2026-01-22T23:51:00-05:00', hasta: '2026-01-23T17:50:06-05:00', motivo: 'Cambio programado de la bomba de subsuelo'},
]
