import type { FilaEquipo } from '@/entities/libro'
import type { Severidad } from '@/entities/tipos'

/** La marca de una fila del libro por equipo (el Pareto de Diferidos y los
 *  equipos de cada campo en el Resumen del gerente): el estado de HOY de su
 *  equipo, y solo si la fila es de una falla de ese equipo. Una fila de parada
 *  programada (la de hace un año o la de hoy) no es una alarma: va sin marca y
 *  no se queda a la vista por ella detrás de «ver más». Lo declarado y lo sin
 *  identificar sí son fallas (paradas que nadie programó): llevan la del equipo. */
export const marcaDeFila = (f: Pick<FilaEquipo, 'tipo'>, hoy: Severidad | undefined): Severidad =>
  f.tipo === 'programada' ? 0 : hoy ?? 0
