import { useCtx } from './sesion'
import { useDato, versionDe } from './consulta'
import { ESTADO_CONFIGURACION } from './contrato'
import { estadoConfiguracion, type EstadoConfiguracion } from '@/entities/choke-config'
import type { Contexto } from '@/entities/causa-senal'

/** LA COSTURA DEL ESTADO DE LA CONFIGURACIÓN (M8, A1).
 *
 *  `GET /api/vistas/configuracion/estado?campo=`: «La Ceiba: 3 de 6 pasos listos»,
 *  cada paso y lo primero que falta. El servidor corre `estadoConfiguracion`
 *  (entities/choke-config.ts) con la configuración firmada; en el demo responde el
 *  motor en el navegador con la sesión. Lo contestado en el borrador de la topología
 *  (sin firmar) es de la pantalla y no viaja.
 *
 *  Las pantallas leen `useEstadoConfiguracion`; nadie en pages/widgets llama `pedir*`. */

export type { EstadoConfiguracion }

/** La respuesta del demo de `GET /api/vistas/configuracion/estado`: la misma fórmula que el backend. */
export const pedirEstadoConfiguracion = (campo: string, ctx: Contexto): EstadoConfiguracion => estadoConfiguracion(campo, ctx)

export function useEstadoConfiguracion(campo: string): EstadoConfiguracion {
  const ctx = useCtx()
  return useDato(ESTADO_CONFIGURACION, { campo }, String(versionDe(ctx)), () => pedirEstadoConfiguracion(campo, ctx))
}
