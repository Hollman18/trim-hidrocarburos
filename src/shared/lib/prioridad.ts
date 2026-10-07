import type { Severidad, EstadoDispositivo } from '@/entities/tipos'

/** Nombre de cada prioridad, para lectores de pantalla y tooltips. */
export const NOMBRE_PRIORIDAD: Record<Severidad, string> = {
  0: 'Normal', 1: 'Prioridad 1 · alarma', 2: 'Prioridad 2 · atención', 3: 'Prioridad 3 · aviso',
}

/** Del estado que reporta un instrumento a su prioridad. «Sin señal» no es
 *  una prioridad: es un dato que no se puede creer. */
export const DE_ESTADO: Record<EstadoDispositivo, Severidad | null> = {
  normal: 0, aviso: 3, atencion: 2, alarma: 1, 'sin señal': null,
}

/** La prioridad más urgente de varias: 1 > 2 > 3 > normal. No es el máximo
 *  numérico (3 no es más grave que 1) ni el mínimo (0 es lo normal). */
export const peorSeveridad = (lista: Severidad[]): Severidad =>
  lista.reduce<Severidad>((peor, s) => (s !== 0 && (peor === 0 || s < peor) ? s : peor), 0)
