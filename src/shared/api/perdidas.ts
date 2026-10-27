import { useSesion, sesion, cambiarSesion } from './sesion'
import { useDato, versionDe } from './consulta'
import { FUENTE, pedirJson, ErrorApi, mensajeDe } from './fuente'
import { deRespuesta } from './cable'
import { PERDIDAS, R_PERDIDA, type ConsultaPeriodo, type CuerpoPerdida } from './contrato'
import {
  aceptarPerdida, vistaPerdidas, TIPOS_PERDIDA, NOMBRE_TIPO_PERDIDA, EXPLICA_TIPO_PERDIDA, FUENTES_VOLUMEN, NOMBRE_FUENTE_VOLUMEN,
  SIN_REGISTRO, EXPLICA_PERDIDA, MAXIMO_DONDE,
  type RegistroPerdida, type VistaPerdidas, type PerdidaVigente, type TipoPerdida, type FuenteVolumen, type VolumenPerdida, type CifraPerdida,
} from '@/entities/perdidas'
import { rolExacto } from '@/entities/roles'
import { personaDelRol, camposAsignados } from '@/entities/usuarios'
import { CAMPOS } from '@/entities/campos'
import { AHORA } from '@/entities/reloj'

/** LA COSTURA DEL REGISTRO DE PÉRDIDAS (A2 · necesario-por-rol §0b; CAMBIOS-CONTRATO §9, M1).
 *
 *  - `GET /api/vistas/perdidas?campos=&desde=&hasta=`: lo que rige en el período,
 *    por tipo y por tramo; sin registros, «sin registro» (`bbl: null`), nunca 0.
 *  - `POST /api/perdidas`: registrar, corregir o retirar con motivo (`perdidas:registrar`:
 *    oper, sup y prod). Solo por inserción (D1).
 *
 *  El servidor corre `vistaPerdidas` y `aceptarPerdida` (entities/perdidas.ts) con su
 *  registro; en el demo, este módulo ES el servidor y el registro vive en la sesión
 *  (`perdidas`), que arranca vacío: no se inventan pérdidas.
 *
 *  Las pantallas leen `usePerdidas` y escriben con `registrarPerdida`; nadie en
 *  pages/widgets llama `pedirPerdidas` ni importa el motor (oxlint). Las palabras
 *  (los botones del operador) se reexportan aquí. */

export {
  TIPOS_PERDIDA, NOMBRE_TIPO_PERDIDA, EXPLICA_TIPO_PERDIDA, FUENTES_VOLUMEN, NOMBRE_FUENTE_VOLUMEN, SIN_REGISTRO, EXPLICA_PERDIDA, MAXIMO_DONDE,
}
export type { RegistroPerdida, VistaPerdidas, PerdidaVigente, TipoPerdida, FuenteVolumen, VolumenPerdida, CifraPerdida, CuerpoPerdida }

/** El registro vacío: una referencia fija (entra en la clave de la caché). */
const NINGUNA: readonly RegistroPerdida[] = Object.freeze([])
/** El registro de la sesión (el del demo, o la copia de lo que respondió el servidor). */
const registroDe = (s: { perdidas?: readonly RegistroPerdida[] }) => s.perdidas ?? NINGUNA

/** `GET /api/vistas/perdidas`: la respuesta del demo, la misma fórmula que el backend. */
export const pedirPerdidas = (q: ConsultaPeriodo, registros: readonly RegistroPerdida[] | undefined): VistaPerdidas =>
  vistaPerdidas(q, registros ?? NINGUNA)

export function usePerdidas(q: ConsultaPeriodo): VistaPerdidas {
  const registros = useSesion(registroDe)
  return useDato(PERDIDAS, q, String(versionDe(registros)), () => pedirPerdidas(q, registros))
}

/** La hora con que el servidor del demo registra (la del reloj, que está congelado). */
const horaDelPlc = () => `${new Date(AHORA.getTime() - 5 * 3_600_000).toISOString().slice(0, 19)}-05:00`

export type ResultadoRegistro = { ok: true; perdida: RegistroPerdida } | { ok: false; error: string; estado?: number; codigo?: string }

/** `POST /api/perdidas` → `{ perdida }`. Con la fuente http, el 403, el 404, el 409 y el 422
 *  del servidor vuelven con sus palabras; en el demo, `aceptarPerdida` aplica las mismas
 *  reglas, en el mismo orden, sobre la sesión. */
export async function registrarPerdida(q: { rolId: string }, c: CuerpoPerdida): Promise<ResultadoRegistro> {
  if (FUENTE === 'http') {
    try {
      const r = deRespuesta(R_PERDIDA, await pedirJson('/perdidas', undefined, { metodo: 'POST', cuerpo: c, cabeceras: { 'x-rol': q.rolId } }))
      cambiarSesion({ perdidas: [...registroDe(sesion()), r.perdida] })
      return { ok: true, perdida: r.perdida }
    } catch (e) {
      if (e instanceof ErrorApi) {
        const contrato = [400, 403, 404, 409, 422].includes(e.estado)
        return { ok: false, estado: e.estado, ...(e.codigo ? { codigo: e.codigo } : {}), error: contrato ? e.message : `No se guardó: ${e.message}.` }
      }
      return { ok: false, estado: 0, error: `No se guardó: ${mensajeDe(e)}.` }
    }
  }
  const s = sesion()
  const rol = rolExacto(q.rolId)
  const persona = personaDelRol(s.usuarios, q.rolId)
  const r = aceptarPerdida(c, {
    ...(rol ? { rol: { id: rol.id, nombre: rol.nombre, puede: rol.puede } } : {}),
    ...(persona ? { persona: { id: persona.id, nombre: persona.nombre } } : {}),
    campos: rol ? camposAsignados(rol, s.usuarios).map(x => x.id) : [],
  }, registroDe(s), CAMPOS.map(x => x.id), horaDelPlc())
  if (!r.ok) return { ok: false, error: r.error, estado: r.estado, codigo: r.codigo }
  cambiarSesion({ perdidas: [...registroDe(s), r.perdida] })
  return r
}
