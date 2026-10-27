import type { VistaHoy, TareaHoy } from '@/shared/api/hoy'
import type { ParadaDeJornada } from '@/shared/api/balance'

/** El orden de cierre (D-01): sale solo cuando para una bomba de agua; el motor lo trae como
 *  el aviso del agua («Si para otra bomba, cierre primero…»). Es barril evitable. */
export const ordenDeCierre = (v: VistaHoy): TareaHoy | undefined => v.tareas.find(t => t.grupo === 'aviso' && t.ver?.destino.a === 'agua')

/** Los pasos de la cadena que se leen en la fila (el paso 1, «quién», va en «Ver una por una»). */
const PASOS_FILA = ['choke', 'impacto', 'planeacion', 'n2'] as const
/** La cadena del choke de una parada, en una línea: tramo · diferida o pérdida · planeada · causa. */
export const cadenaCorta = (p: ParadaDeJornada) =>
  PASOS_FILA.map(paso => p.cadena.find(c => c.paso === paso)).map(c => (!c || c.valor === null ? 'falta' : c.texto)).join(' · ')
