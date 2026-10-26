import { create } from 'zustand'
import type { FiltroEstado, TipoEquipo, TrenEquipo, CondicionFranja } from '@/shared/api/equiposTecnico'
import type { Condicion } from '@/shared/ui/Prioridad'

/** La marca de una condición de la franja (X5 §5.6): la misma forma en la lista, la ficha y el esquema. */
export const MARCA: Record<CondicionFranja, Condicion> = {
  interlock: 'interlock', alarma: 'alarma', atencion: 'atencion', aviso: 'aviso', 'sin-comunicacion': 'sin-comunicacion',
}

/** Los filtros de la lista de Equipos (X4 §3.6): estado, tipo y tren. Viven aquí
 *  y no en la dirección: son de quien mira, y las migas del nivel 3 los ponen
 *  («La Ceiba › Agua» vuelve a la lista con el tren de agua). Al cambiar de campo
 *  se conservan. */
export interface Filtros {
  estado: FiltroEstado
  tipo: TipoEquipo | 'todos'
  tren: TrenEquipo | 'todos'
  /** Lo que se escribió para buscar por tag («P-201B»). */
  busca: string
}
interface EstadoFiltros extends Filtros {
  poner: (f: Partial<Filtros>) => void
  limpiar: () => void
}
const VACIO: Filtros = { estado: 'todos', tipo: 'todos', tren: 'todos', busca: '' }

export const useFiltrosEquipos = create<EstadoFiltros>(set => ({
  ...VACIO,
  poner: f => set(f),
  limpiar: () => set(VACIO),
}))
