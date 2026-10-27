import { useApp, usePersona } from '@/app/store'
import { useCtx } from '@/shared/api/diferidos'
import { useVersiones } from '@/shared/api/sesion'
import type { Config } from '@/entities/configuracion'

/** Firmar un solo cambio técnico desde su paso del Estado (la jornada, la conversión del árbol): la
 *  misma firma de siempre (`POST /api/configuracion`, `config:firmar`), sobre la versión vigente y con
 *  su motivo. Lo que falle vuelve con las palabras del servidor (el 409 si otro firmó antes). */
export function useFirmaRapida() {
  const ctx = useCtx(); const versiones = useVersiones(); const persona = usePersona()
  const firmarConfig = useApp(s => s.firmarConfig)
  const firmar = (cambio: (c: Config) => void, motivo: string) => {
    const propuesta = structuredClone(ctx.config)
    cambio(propuesta)
    return firmarConfig(propuesta, motivo, versiones.at(-1)!.version)
  }
  return { config: ctx.config, persona, firmar }
}
