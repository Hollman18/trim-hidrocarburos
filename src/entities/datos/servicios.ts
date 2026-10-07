/** Eventos de los servicios y equipos de proceso que apagan pozos (aire, energía, compresión, evacuación) · DATOS DE DEMO.
 *
 *  Generado por scripts/gen-linea.mjs (determinista). Todo sale de equipos:
 *  controladores de pozo, PLC de bombas y servicios, transmisores de nivel,
 *  separadores de prueba y el computador de flujo del punto de medición
 *  oficial. NO es historia de un campo real. */
import type { EventoServicio } from '../pozos'

export const EVENTOS_SERVICIOS: EventoServicio[] = [
  {id: 'SV-H-302-251007', campoId: 'ceiba', equipo: 'H-302', tipo: 'tratamiento', inicio: '2025-10-07T16:32:00-05:00', fin: '2025-10-07T22:37:00-05:00', tag: 'TSHH-3021', texto: 'temperatura muy alta en el tratador: entrada cerrada'},
  {id: 'SV-SE-2-251015', campoId: 'morichal', equipo: 'SE-2', tipo: 'energia', inicio: '2025-10-15T15:39:00-05:00', fin: '2025-10-16T09:47:00-05:00', tag: '52-SE2', texto: 'interruptor del pórtico 13,8 kV abierto'},
  {id: 'SV-LACT-01-251016', campoId: 'guacamayo', equipo: 'LACT-01', tipo: 'evacuacion', inicio: '2025-10-16T23:53:00-05:00', fin: '2025-10-19T19:53:00-05:00', tag: 'LAH-3011', texto: 'tanque de crudo alto: despacho limitado por la nominación del oleoducto'},
  {id: 'SV-C-401-251108', campoId: 'zarza', equipo: 'C-401', tipo: 'compresion', inicio: '2025-11-08T23:25:00-05:00', fin: '2025-11-09T15:48:00-05:00', tag: 'ZS-4011', texto: 'compresor de gas detenido'},
  {id: 'SV-K-101-251115', campoId: 'ceiba', equipo: 'K-101', tipo: 'aire', inicio: '2025-11-15T09:52:00-05:00', fin: '2025-11-15T14:10:00-05:00', tag: 'PAL-1011', texto: 'presión baja del aire de instrumentos'},
  {id: 'SV-V-101-251120', campoId: 'palmar', equipo: 'V-101', tipo: 'proceso', inicio: '2025-11-20T14:14:00-05:00', fin: '2025-11-21T00:06:00-05:00', tag: 'LSHH-1011', texto: 'nivel muy alto en el separador: entrada cerrada'},
  {id: 'SV-SE-2-251216', campoId: 'morichal', equipo: 'SE-2', tipo: 'energia', inicio: '2025-12-16T07:22:50-05:00', fin: '2025-12-17T10:03:04-05:00', tag: '52-SE2', texto: 'interruptor del pórtico 13,8 kV abierto'},
  {id: 'SV-C-401-251218', campoId: 'zarza', equipo: 'C-401', tipo: 'compresion', inicio: '2025-12-18T04:27:00-05:00', fin: '2025-12-18T09:04:00-05:00', tag: 'ZS-4011', texto: 'compresor de gas detenido'},
  {id: 'SV-V-101-251226', campoId: 'palmar', equipo: 'V-101', tipo: 'proceso', inicio: '2025-12-26T00:35:00-05:00', fin: '2025-12-26T06:17:00-05:00', tag: 'LSHH-1011', texto: 'nivel muy alto en el separador: entrada cerrada'},
  {id: 'SV-SE-2-260103', campoId: 'zarza', equipo: 'SE-2', tipo: 'energia', inicio: '2026-01-03T13:33:00-05:00', fin: '2026-01-03T22:28:00-05:00', tag: '52-SE2', texto: 'interruptor del pórtico 13,8 kV abierto'},
  {id: 'SV-K-101-260128', campoId: 'ceiba', equipo: 'K-101', tipo: 'aire', inicio: '2026-01-28T16:18:52-05:00', fin: '2026-01-28T23:31:51-05:00', tag: 'PAL-1011', texto: 'presión baja del aire de instrumentos'},
  {id: 'SV-C-401-260214', campoId: 'morichal', equipo: 'C-401', tipo: 'compresion', inicio: '2026-02-14T23:19:00-05:00', fin: '2026-02-15T23:37:00-05:00', tag: 'ZS-4011', texto: 'compresor de gas detenido'},
  {id: 'SV-C-401-260228', campoId: 'zarza', equipo: 'C-401', tipo: 'compresion', inicio: '2026-02-28T14:44:00-05:00', fin: '2026-02-28T20:15:00-05:00', tag: 'ZS-4011', texto: 'compresor de gas detenido'},
  {id: 'SV-LACT-01-260308', campoId: 'guacamayo', equipo: 'LACT-01', tipo: 'evacuacion', inicio: '2026-03-08T16:20:00-05:00', fin: '2026-03-11T17:42:00-05:00', tag: 'LAH-3011', texto: 'tanque de crudo alto: despacho limitado por la nominación del oleoducto'},
  {id: 'SV-SE-2-260310', campoId: 'morichal', equipo: 'SE-2', tipo: 'energia', inicio: '2026-03-10T06:40:00-05:00', fin: '2026-03-11T13:09:00-05:00', tag: '52-SE2', texto: 'interruptor del pórtico 13,8 kV abierto'},
  {id: 'SV-SE-2-260324', campoId: 'zarza', equipo: 'SE-2', tipo: 'energia', inicio: '2026-03-24T20:47:00-05:00', fin: '2026-03-24T23:30:00-05:00', tag: '52-SE2', texto: 'interruptor del pórtico 13,8 kV abierto'},
  {id: 'SV-K-101-260325', campoId: 'ceiba', equipo: 'K-101', tipo: 'aire', inicio: '2026-03-25T05:19:00-05:00', fin: '2026-03-25T15:15:00-05:00', tag: 'PAL-1011', texto: 'presión baja del aire de instrumentos'},
  {id: 'SV-LACT-01-260415', campoId: 'guacamayo', equipo: 'LACT-01', tipo: 'evacuacion', inicio: '2026-04-15T02:05:00-05:00', fin: '2026-04-19T18:58:00-05:00', tag: 'LAH-3011', texto: 'tanque de crudo alto: despacho limitado por la nominación del oleoducto'},
  {id: 'SV-H-302-260423', campoId: 'ceiba', equipo: 'H-302', tipo: 'tratamiento', inicio: '2026-04-23T21:56:00-05:00', fin: '2026-04-24T00:26:00-05:00', tag: 'TSHH-3021', texto: 'temperatura muy alta en el tratador: entrada cerrada'},
  {id: 'SV-V-101-260428', campoId: 'palmar', equipo: 'V-101', tipo: 'proceso', inicio: '2026-04-28T16:47:00-05:00', fin: '2026-04-29T00:03:00-05:00', tag: 'LSHH-1011', texto: 'nivel muy alto en el separador: entrada cerrada'},
  {id: 'SV-SE-2-260502', campoId: 'morichal', equipo: 'SE-2', tipo: 'energia', inicio: '2026-05-02T16:46:00-05:00', fin: '2026-05-03T03:37:00-05:00', tag: '52-SE2', texto: 'interruptor del pórtico 13,8 kV abierto'},
  {id: 'SV-SE-2-260518', campoId: 'morichal', equipo: 'SE-2', tipo: 'energia', inicio: '2026-05-18T19:38:00-05:00', fin: '2026-05-20T04:52:00-05:00', tag: '52-SE2', texto: 'interruptor del pórtico 13,8 kV abierto'},
  {id: 'SV-K-101-260623', campoId: 'ceiba', equipo: 'K-101', tipo: 'aire', inicio: '2026-06-23T19:44:00-05:00', fin: '2026-06-23T22:54:00-05:00', tag: 'PAL-1011', texto: 'presión baja del aire de instrumentos'},
  {id: 'SV-C-401-260706', campoId: 'morichal', equipo: 'C-401', tipo: 'compresion', inicio: '2026-07-06T18:44:00-05:00', fin: '2026-07-07T08:40:00-05:00', tag: 'ZS-4011', texto: 'compresor de gas detenido'},
  {id: 'SV-LACT-01-260711', campoId: 'guacamayo', equipo: 'LACT-01', tipo: 'evacuacion', inicio: '2026-07-11T14:15:00-05:00', fin: '2026-07-16T05:05:00-05:00', tag: 'LAH-3011', texto: 'tanque de crudo alto: despacho limitado por la nominación del oleoducto'},
  {id: 'SV-K-101-260715', campoId: 'ceiba', equipo: 'K-101', tipo: 'aire', inicio: '2026-07-15T09:28:00-05:00', fin: '2026-07-15T13:43:00-05:00', tag: 'PAL-1011', texto: 'presión baja del aire de instrumentos'},
  {id: 'SV-C-401-260725', campoId: 'morichal', equipo: 'C-401', tipo: 'compresion', inicio: '2026-07-25T08:07:00-05:00', fin: '2026-07-26T09:58:00-05:00', tag: 'ZS-4011', texto: 'compresor de gas detenido'},
  {id: 'SV-K-101-260804', campoId: 'ceiba', equipo: 'K-101', tipo: 'aire', inicio: '2026-08-04T22:13:00-05:00', fin: '2026-08-05T02:21:00-05:00', tag: 'PAL-1011', texto: 'presión baja del aire de instrumentos'},
  {id: 'SV-SE-2-260828', campoId: 'morichal', equipo: 'SE-2', tipo: 'energia', inicio: '2026-08-28T18:08:46-05:00', fin: '2026-08-29T11:07:35-05:00', tag: '52-SE2', texto: 'interruptor del pórtico 13,8 kV abierto'},
  {id: 'SV-V-101-260908', campoId: 'palmar', equipo: 'V-101', tipo: 'proceso', inicio: '2026-09-08T12:51:00-05:00', fin: '2026-09-08T21:39:00-05:00', tag: 'LSHH-1011', texto: 'nivel muy alto en el separador: entrada cerrada'},
]
