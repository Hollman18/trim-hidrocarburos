import type { CondicionKit } from '@/shared/ui/scada'
import type { Severidad } from '@/entities/tipos'

/** La prioridad del motor (1, 2, 3) como condición del kit SCADA. */
export const condicionDe = (s: Severidad | null | undefined): CondicionKit | undefined =>
  s === 1 ? 'alarma' : s === 2 ? 'atencion' : s === 3 ? 'aviso' : undefined
