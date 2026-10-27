import type { Franja, CondicionFranja } from '@/shared/api/condiciones'

/** La palabra de cada condición de la franja, al lado de su marca (H16; X2 F1). */
export const PALABRA_CONDICION: Record<CondicionFranja, string> = {
  interlock: 'interlock', alarma: 'alarma', atencion: 'atención', aviso: 'aviso', 'sin-comunicacion': 'sin comunicación',
}

/** La condición de un equipo: la de la franja, UNA por equipo en todo el producto
 *  (H3; X2 F2). La regla es del motor (`franjaDe`); sin condición, ninguna marca (H17). */
export const condicionDe = (f: Franja, campoId: string, equipo: string): CondicionFranja | undefined =>
  f.equipos.find(x => x.campoId === campoId && x.equipo === equipo)?.condicion
