/** CÓMO SE CONECTA TRIM A CADA PLANTA (Fase 3 de docs/experiencia-v3/PROMPT-FACILIDADES-POR-FASES.md;
 *  docs/backend/04-cadena-de-datos.md §4.2).
 *
 *  TRIM va a donde está el dato en esa planta, y se decide en la visita técnica:
 *  - `historiador`: las señales que hacen falta ya llegan al historiador; se lee de ahí.
 *  - `mezcla`: el historiador para lo que tiene y el gateway directo a los equipos para lo
 *    que le falta (casi siempre energía, generación, aire, UPS). Es lo de los campos de hoy.
 *  - `directa`: no hay historiador, o no llega a la planta. El gateway lee directo el PLC,
 *    el analizador de red y el controlador del compresor o del generador (Modbus RTU), el
 *    relé del interruptor (IEC 61850 o DNP3), la UPS (SNMP) y su propia entrada «hay tensión».
 *  - `minima`: no hay ni de dónde leer la energía: el gateway, con su batería y la entrada
 *    digital «hay tensión», basta para avisar el apagón.
 *
 *  En los cuatro: solo lectura, la conexión sale desde adentro y la lista de tags es cerrada.
 *  El estado de cada planta viaja en el registro de campos (`Campo.conexion`, `GET /api/campos`);
 *  sin él, `mezcla`. */
import { campoPorId } from './campos'
import type { Dispositivo } from './tipos'

export type ConexionPlanta = 'historiador' | 'mezcla' | 'directa' | 'minima'
export const CONEXIONES: readonly ConexionPlanta[] = ['historiador', 'mezcla', 'directa', 'minima']
export const NOMBRE_CONEXION: Record<ConexionPlanta, string> = {
  historiador: 'Del historiador',
  mezcla: 'Historiador y directo a los equipos',
  directa: 'Directo a los equipos, sin historiador',
  minima: 'Solo la entrada «hay tensión» del gateway',
}
export const esConexion = (x: unknown): x is ConexionPlanta => typeof x === 'string' && (CONEXIONES as readonly string[]).includes(x)

/** Cómo se conecta TRIM a un campo. */
export const conexionDe = (campoId: string): ConexionPlanta => campoPorId(campoId).conexion ?? 'mezcla'

/** De dónde sale, sin historiador, lo que en una planta con historiador se lee del PI:
 *  el controlador del compresor y el analizador de red de la subestación hablan Modbus RTU;
 *  lo demás está en el PLC de la batería. Se conserva la cadencia («· 47 s»). */
export function origenDirecto(equipo: string, origen: string): string {
  if (!/^PI\b/.test(origen)) return origen
  const resto = origen.replace(/^PI\b/, '')
  const fuente = equipo === 'K-101' ? 'controlador del compresor (Modbus RTU)'
    : equipo === 'SE-2' ? 'analizador de red de la subestación (Modbus RTU)'
      : 'PLC'
  return `${fuente}${resto}`
}

/** Lo que el gateway lee de la subestación cuando se conecta directo: el estado del
 *  interruptor de llegada por su relé y su propia entrada «hay tensión», que sigue
 *  avisando aunque se caiga todo lo demás (su batería la mantiene). */
export const DIRECTOS_SUBESTACION: readonly Dispositivo[] = [
  { tag: '52-SE2', tipo: 'Interruptor de llegada', valor: 'cerrado', unidad: '', estado: 'normal', origen: 'relé de la subestación (IEC 61850) · 1 s', limite: '—' },
  { tag: 'EI-0020', tipo: 'Hay tensión en el gabinete del gateway', valor: 'sí', unidad: '', estado: 'normal', origen: 'entrada digital del gateway · 1 s', limite: '—' },
]

/** Los instrumentos de un equipo como se leen en ese campo. */
export function dispositivosEnCampo(equipo: string, campoId: string, ds: readonly Dispositivo[]): Dispositivo[] {
  if (conexionDe(campoId) !== 'directa') return [...ds]
  const leidos = ds.map(d => ({ ...d, origen: origenDirecto(equipo, d.origen) }))
  return equipo === 'SE-2' ? [...leidos, ...DIRECTOS_SUBESTACION] : leidos
}
