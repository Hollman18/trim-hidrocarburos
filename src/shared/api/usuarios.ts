import { useSesion } from './sesion'
import { registroCompleto, registroVisible, type PersonaDelRegistro, type CambioAcceso } from '@/entities/usuarios'
import { FUENTE } from './fuente'

/** Servicio de accesos. Cada función es un endpoint del contrato
 *  (CONTRATO.md · Usuarios y accesos). En el demo responde la sesión
 *  (`sesion.ts`), con las mismas reglas que el servidor tiene que aplicar.
 *
 *  Se leen de la copia de la sesión: el arranque la trae del servidor
 *  (servidor.ts) y cada escritura la actualiza con lo que el servidor guardó.
 *  Las escrituras (`PATCH /api/usuarios/:id`, `POST /api/usuarios`) están en
 *  escrituras.ts; la vista las llama por las acciones de `app/store.ts`. */

/** `GET /api/usuarios`. Sin `usuarios:administrar`, la persona que mira llega
 *  completa y las demás en su forma mínima (`PersonaVisible`): lo que usan las
 *  pantallas operativas. El demo guarda el registro entero (hace de servidor y
 *  se cambia de rol); la forma mínima se la aplica `useRegistroDeAccesos`. */
export const useUsuarios = (): PersonaDelRegistro[] => useSesion(s => s.usuarios)
/** El registro como lo pinta Accesos.
 *  - Quien administra (`usuarios:administrar`) recibe el registro completo: el
 *    formulario lo necesita. Si llegó a medias, `esCompleta` lo dice en la
 *    pantalla en vez de dejar editar sin correo.
 *  - Quien solo mira recibe la forma mínima del contrato. Con el servidor llega
 *    ya así; en el demo se le aplica la misma regla (`registroVisible`), para
 *    que la pantalla de solo lectura se pruebe con lo que de verdad le llegará. */
export function useRegistroDeAccesos(quien: string | undefined, administra: boolean): PersonaDelRegistro[] {
  const usuarios = useSesion(s => s.usuarios)
  const visibles = FUENTE === 'http' || !quien ? usuarios : registroVisible(registroCompleto(usuarios), quien, administra)
  return administra ? registroCompleto(visibles) : visibles
}
/** ¿La persona viene con todo lo del registro (correo, día de acceso)? */
export { esCompleta } from '@/entities/usuarios'
/** `GET /api/usuarios/historial` */
export const useAccesos = (): CambioAcceso[] => useSesion(s => s.accesos)
