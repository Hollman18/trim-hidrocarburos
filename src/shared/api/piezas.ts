import { useMemo } from 'react'
import { pantallaVisible } from '@/shared/config/producto'
import { piezasDe, pantallaContratada, inicioContratado, type PiezaTrim } from '@/entities/piezas-trim'
import { sesion, useSesion } from './sesion'

/** Las piezas de TRIM que contrató el cliente (Fase 1 de facilidades), para el
 *  menú y la dirección: las de todos sus campos. Sin suscripción. */
export const piezasDelCliente = (): ReadonlySet<PiezaTrim> => piezasDe(sesion().ctx.config)

/** ¿Se ofrece esta pantalla? Es del producto (no de v2) y su pieza está contratada.
 *  Una regla para el menú, la dirección y el inicio. */
export const pantallaOfrecida = (p: string) => pantallaVisible(p) && pantallaContratada(p, piezasDelCliente())

/** Donde abre un rol con las piezas del cliente; `null` si no tiene nada contratado. */
export const inicioOfrecido = (rol: { inicio: string; pantallas: readonly string[] }) => inicioContratado(rol, piezasDelCliente())

/** Las piezas contratadas en unos campos, con suscripción: para las secciones de una pantalla. */
export function usePiezas(campos: readonly string[]): ReadonlySet<PiezaTrim> {
  const config = useSesion(s => s.ctx.config)
  const k = campos.join(',')
  return useMemo(() => piezasDe(config, k ? k.split(',') : []), [config, k])
}
