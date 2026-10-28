import type { SenalNivel3 } from '@/shared/api/equiposTecnico'
import type { EstadoKit, CondicionKit } from '@/shared/ui/scada'

/** El estado de la señal en el kit SCADA (kit-scada.md §0): parado (el equipo), sin
 *  comunicación, sin dato, anormal (la prioridad que da el motor) o normal. */
export function estadoKit(s: Pick<SenalNivel3, 'gris' | 'valor' | 'condicion'>): { estado: EstadoKit; condicion?: CondicionKit } {
  if (s.gris) return { estado: 'parado' }
  if (s.condicion === 'sin-comunicacion') return { estado: 'sin-comunicacion' }
  if (s.valor === null) return { estado: 'sin-dato' }
  return s.condicion ? { estado: 'anormal', condicion: s.condicion } : { estado: 'normal' }
}
/** El límite que cruzó una señal anormal: el de alarma del lado por donde salió de su banda. */
export const cruzoDe = (s: Pick<SenalNivel3, 'valor' | 'condicion' | 'alarmas' | 'banda'>) => {
  if (s.valor === null || !s.condicion || !s.alarmas.length) return undefined
  const v = s.valor
  return s.alarmas.filter(a => (s.banda?.[0] !== null && s.banda?.[0] !== undefined && a <= s.banda[0] ? v <= a : v >= a))[0] ?? s.alarmas[0]
}
