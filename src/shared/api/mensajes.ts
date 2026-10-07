import { pedirPreguntas, pedirRiesgo } from './diferidos'
import { useDato, versionDe } from './consulta'
import { useCtx } from './sesion'
import { MENSAJES } from './contrato'
import { mensajesDe, type Mensaje } from '@/entities/mensajes'
import { historiaSap } from '@/entities/sap'
import { registroDePredicciones } from '@/entities/aciertos'
import { contextoInicial, calendario } from '@/entities/libro'
import { USUARIOS_INICIALES } from '@/entities/usuarios'
import { versionInicial } from '@/entities/configuracion'
import { CAMPOS } from '@/entities/campos'

/** `GET /api/mensajes?campos=` → lo que TRIM mandó por WhatsApp, del más
 *  reciente al más viejo. Es un registro: el servidor lo guarda al enviar, y
 *  lo enviado no se reescribe si después cambia un acceso, una respuesta o la
 *  configuración. En el demo se arma una vez, con el estado con que arranca
 *  la sesión y las reglas de `entities/mensajes.ts`; nadie recibe nada. */
let registro: Mensaje[] | undefined
const registroDelDemo = () => {
  if (registro) return registro
  const campos = CAMPOS.map(c => c.id), ctx = contextoInicial()
  registro = mensajesDe({
    campos, preguntas: pedirPreguntas(campos, ctx), predicciones: registroDePredicciones(campos, ctx, pedirRiesgo(campos, ctx)), ordenes: historiaSap(ctx).ordenes,
    // El historial de la configuración con que arranca la sesión: cada mensaje
    // toma la versión que regía a su hora, no la que se firme después.
    usuarios: USUARIOS_INICIALES, ctx, versiones: [versionInicial()], desde: new Date(calendario()[0]!.desde),
  })
  return registro
}

/** La respuesta del demo de `GET /api/mensajes?campos=`. */
export const pedirMensajes = (campos: string[]): Mensaje[] => registroDelDemo().filter(m => campos.includes(m.campoId))

/** En el demo lo enviado no cambia en la sesión; con el servidor llegan
 *  mensajes nuevos (la confirmación de una respuesta): se pide de nuevo cuando
 *  cambia el contexto. */
export function useMensajes(campos: string[]): Mensaje[] {
  const ctx = useCtx()
  return useDato(MENSAJES, { campos }, String(versionDe(ctx)), () => pedirMensajes(campos))
}
