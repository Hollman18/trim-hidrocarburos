/** Quién entra a TRIM, con qué rol y a qué campos. Lo administra el gerente
 *  de activo (capacidad `usuarios:administrar`): invita, cambia rol o campos y
 *  suspende. Nadie se borra: una persona que ya no debe entrar queda
 *  suspendida, y su nombre sigue en las firmas y respuestas que dejó.
 *
 *  Lo que cada rol puede ver y hacer lo fija el producto (`roles.ts`); el
 *  gerente decide quién tiene cada rol, no qué hace el rol.
 *
 *  Contrato: `GET /api/usuarios`, `POST /api/usuarios`, `PATCH /api/usuarios/:id`
 *  y `GET /api/usuarios/historial` (CONTRATO.md). En producción el servidor
 *  aplica estas mismas reglas y responde 403, 409 o 422.
 */
import { ROLES_VISIBLES } from './roles'
import { CAMPOS } from './campos'
import { MOTIVO_MINIMO, NOMBRE_MINIMO, alcanza } from './reglas'

export type EstadoUsuario = 'activo' | 'invitado' | 'suspendido'

export interface Usuario {
  id: string
  nombre: string
  correo: string
  rolId: string
  campos: 'todos' | string[]
  /** Invitado = todavía no ha entrado. Suspendido = ya no puede entrar. */
  estado: EstadoUsuario
  /** Día en que se le dio acceso, AAAA-MM-DD. */
  desde: string
  // `telefono` y `alertas` (v1): RETIRADOS el 27-oct-2026 (R3, docs/backend/CAMBIOS-CONTRATO.md §3).
  // El canal de mensajes al teléfono salió del producto: si el servidor los manda, no se leen.
  /** Lo pone el servidor al suspender: el estado que tenía. Al quitar la
   *  suspensión vuelve a ese, y no a «activo»: quien nunca entró sigue
   *  invitado. */
  antesDeSuspender?: 'activo' | 'invitado'
}

/** Lo que ve de OTRA persona quien no tiene `usuarios:administrar` en
 *  `GET /api/usuarios` (CONTRATO.md, «Quién lee qué»): lo que una pantalla
 *  operativa usa y nada más. El nombre (firmas, órdenes, respuestas), el rol y
 *  los campos (quién ocupa cada rol) y el estado. El correo, el día del acceso y el estado de antes de una
 *  suspensión son del registro: los ve quien lo administra, y cada persona los
 *  suyos (Mi perfil). */
export interface PersonaVisible {
  id: string
  nombre: string
  rolId: string
  campos: 'todos' | string[]
  estado: EstadoUsuario
}

/** Lo que trae `GET /api/usuarios`: el registro entero con la capacidad, y
 *  sin ella la persona que pregunta completa y las demás en su forma mínima. */
export type PersonaDelRegistro = Usuario | PersonaVisible

/** ¿Viene con todo lo del registro? */
export const esCompleta = (u: PersonaDelRegistro): u is Usuario => 'correo' in u && 'desde' in u

/** El registro entero, para lo que solo hace quien administra (Accesos y las
 *  reglas de un cambio de acceso). Si el servidor mandó la forma mínima a
 *  quien administra, se dice aquí y no se trabaja con un registro a medias
 *  (un correo repetido no se vería, y el formulario guardaría sin correo). */
export function registroCompleto(usuarios: readonly PersonaDelRegistro[]): Usuario[] {
  const sin = usuarios.filter(u => !esCompleta(u))
  if (sin.length) throw new Error(`GET /api/usuarios trajo a ${sin.map(u => u.nombre).join(', ')} sin correo ni día de acceso: con usuarios:administrar el registro llega completo (CONTRATO.md, «Quién lee qué»).`)
  return usuarios as Usuario[]
}

/** Lo que responde `GET /api/usuarios` a quien pregunta: con la capacidad,
 *  todo; sin ella, solo quienes comparten al menos un campo con él (el
 *  operador de La Ceiba no ve al personal de otros campos), él completo y los
 *  demás en su forma mínima (`PersonaVisible`). Es la regla del servidor; el
 *  demo y la prueba del contrato la corren igual. */
export function registroVisible(usuarios: readonly Usuario[], quien: string, administra: boolean): PersonaDelRegistro[] {
  if (administra) return [...usuarios]
  const yo = usuarios.find(u => u.id === quien)
  if (!yo) return []
  const comparte = (u: Usuario) => yo.campos === 'todos' || u.campos === 'todos' || u.campos.some(c => yo.campos.includes(c))
  return usuarios.filter(u => u.id === yo.id || comparte(u)).map((u): PersonaDelRegistro => (u.id === yo.id ? u : {
    id: u.id, nombre: u.nombre, rolId: u.rolId, campos: u.campos, estado: u.estado,
  }))
}

/** Lo que manda el front al invitar (`POST /api/usuarios`): el id, el día y
 *  el estado los pone el servidor, nunca quien llama. `alertas: false` va por la
 *  línea base v1, que la pide en el cuerpo; el canal se retiró (R3) y nadie la lee. */
export type Invitacion = Pick<Usuario, 'nombre' | 'correo' | 'rolId' | 'campos'> & { alertas?: boolean }

/** Cada cambio de acceso queda escrito: quién, cuándo, a quién, qué y por qué. */
export interface CambioAcceso {
  id: number
  fecha: string
  por: string
  usuario: string
  cambios: string[]
  motivo: string
}

export const ESTADO_NOMBRE: Record<EstadoUsuario, string> = {
  activo: 'activo', invitado: 'invitado · aún no entra', suspendido: 'suspendido',
}

/** Correo de demostración: dominio reservado (RFC 2606), que no es de nadie. */
const correoDe = (nombre: string) =>
  `${nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ /g, '.')}@operadora.example`

/** Al arrancar la implementación, cada rol del producto tiene su persona. */
export const USUARIOS_INICIALES: Usuario[] = ROLES_VISIBLES.map(r => ({
  id: r.id, nombre: r.persona, correo: correoDe(r.persona), rolId: r.id,
  campos: r.campos, estado: 'activo', desde: '2026-09-01',
}))

export const nombreCampos = (c: Usuario['campos']) =>
  c === 'todos' ? 'todos los campos' : c.map(id => CAMPOS.find(x => x.id === id)?.nombre ?? id).join(', ')

const rolNombre = (id: string) => ROLES_VISIBLES.find(r => r.id === id)?.nombre ?? id

/** Lo que cambió en una persona, dicho como lo lee otra. */
/** El estado que guarda el servidor en un cambio: al suspender anota el de
 *  antes, y al quitar la suspensión vuelve a ese (un invitado que nunca entró
 *  no pasa a «activo» por haber estado suspendido). El front solo dice si
 *  queda suspendido o no. */
export function estadoAlGuardar(antes: Usuario, pedido: Usuario): Usuario {
  const { antesDeSuspender: _, ...sin } = pedido
  if (pedido.estado === 'suspendido')
    return antes.estado === 'suspendido' ? { ...sin, antesDeSuspender: antes.antesDeSuspender } : { ...sin, antesDeSuspender: antes.estado }
  if (antes.estado === 'suspendido') return { ...sin, estado: antes.antesDeSuspender ?? 'activo' }
  return { ...sin, estado: antes.estado }
}

/** Lo que queda en el historial al invitar: con qué se le dio el acceso, no
 *  solo el rol. Sin esto no se sabe después a qué campos entró. */
export function cambiosDeInvitacion(u: Usuario): string[] {
  return [`invitado como ${rolNombre(u.rolId).toLowerCase()}`, `campos: ${nombreCampos(u.campos)}`]
}

export function cambiosDeUsuario(a: Usuario, b: Usuario): string[] {
  const out: string[] = []
  if (a.rolId !== b.rolId) out.push(`rol: ${rolNombre(a.rolId)} → ${rolNombre(b.rolId)}`)
  if (nombreCampos(a.campos) !== nombreCampos(b.campos)) out.push(`campos: ${nombreCampos(a.campos)} → ${nombreCampos(b.campos)}`)
  if (a.estado !== b.estado) out.push(b.estado === 'suspendido' ? 'acceso suspendido' : a.estado === 'suspendido' ? 'acceso reactivado' : `estado: ${ESTADO_NOMBRE[b.estado]}`)
  return out
}

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
/** Los mismos campos, en cualquier orden. */
const mismosCampos = (a: Usuario['campos'], b: Usuario['campos']) =>
  a === 'todos' || b === 'todos' ? a === b : a.length === b.length && a.every(x => b.includes(x))
// Con acceso = activo: un invitado todavía no ha entrado y no puede dar accesos.
const activoGerente = (u: Usuario) => u.rolId === 'ger' && u.estado === 'activo'

/** A qué parte del formulario va cada error: el 422 del servidor lo dice
 *  por campo, y el formulario lo pone junto a su caja (aria-describedby), no
 *  en una lista suelta al final. */
export type CampoAcceso = 'nombre' | 'correo' | 'rol' | 'campos' | 'motivo' | 'general'
export interface ErrorAcceso { campo: CampoAcceso; texto: string }

/** Reglas de un cambio de acceso. `quien` es el id de la persona que firma.
 *  Devuelve los errores (vacío = se puede). Las mismas que el servidor
 *  responde con 403 (otorgar o cambiarse lo que no le toca), 409 (dejaría la
 *  operación sin gerente) o 422 (datos). */
export function revisarAcceso(usuarios: Usuario[], nuevo: Usuario, quien: string, motivo: string): ErrorAcceso[] {
  const e: ErrorAcceso[] = []
  const antes = usuarios.find(u => u.id === nuevo.id)
  if (!alcanza(nuevo.nombre, NOMBRE_MINIMO)) e.push({ campo: 'nombre', texto: 'Falta el nombre completo.' })
  if (!CORREO.test(nuevo.correo.trim())) e.push({ campo: 'correo', texto: 'Escriba un correo válido, como nombre@empresa.com.' })
  else if (usuarios.some(u => u.id !== nuevo.id && u.correo.toLowerCase() === nuevo.correo.trim().toLowerCase()))
    e.push({ campo: 'correo', texto: 'Ya hay una persona con ese correo.' })
  if (!ROLES_VISIBLES.some(r => r.id === nuevo.rolId)) e.push({ campo: 'rol', texto: 'Escoja un rol.' })
  if (nuevo.campos !== 'todos' && nuevo.campos.length === 0) e.push({ campo: 'campos', texto: 'Escoja al menos un campo.' })
  if (antes && nuevo.id === quien && (nuevo.estado === 'suspendido' || nuevo.rolId !== antes.rolId))
    e.push({ campo: 'general', texto: 'No puede suspenderse ni quitarse el rol a sí mismo: pídaselo a otro gerente.' })
  // Su propio acceso lo cambia otro: nadie se da (ni se quita) campos a sí mismo.
  if (antes && nuevo.id === quien && !mismosCampos(nuevo.campos, antes.campos))
    e.push({ campo: 'campos', texto: 'Sus propios campos los cambia otro gerente.' })
  // Nadie otorga lo que no tiene: un gerente de algunos campos no da «todos» ni
  // un campo fuera de los suyos. Lo que la persona ya tenía no se le revisa.
  const firmante = usuarios.find(u => u.id === quien)
  if (firmante && firmante.campos !== 'todos') {
    const suyos = firmante.campos
    if (nuevo.campos === 'todos' && antes?.campos !== 'todos') e.push({ campo: 'campos', texto: 'No puede dar «todos los campos»: usted no los tiene.' })
    else if (nuevo.campos !== 'todos') {
      // Quien ya tenía «todos» no recibe nada nuevo al quedar con una lista.
      const tenia = antes?.campos === 'todos' ? undefined : antes?.campos ?? []
      const ajenos = tenia ? nuevo.campos.filter(c => !tenia.includes(c) && !suyos.includes(c)) : []
      if (ajenos.length) e.push({ campo: 'campos', texto: `No puede dar campos que usted no tiene: ${nombreCampos(ajenos)}.` })
    }
  }
  const despues = [...usuarios.filter(u => u.id !== nuevo.id), nuevo]
  if (!despues.some(activoGerente))
    e.push({ campo: 'general', texto: 'Tiene que quedar al menos un gerente de activo con acceso: sin él nadie podría dar accesos ni firmar metas.' })
  if (!alcanza(motivo, MOTIVO_MINIMO)) e.push({ campo: 'motivo', texto: 'Falta el motivo: todo cambio de acceso queda escrito con su porqué.' })
  return e
}

/** Los mismos errores, solo el texto. */
export const validarAcceso = (usuarios: Usuario[], nuevo: Usuario, quien: string, motivo: string): string[] =>
  revisarAcceso(usuarios, nuevo, quien, motivo).map(x => x.texto)

/** La persona que se muestra para un rol: la primera con acceso a ese rol
 *  (la persona original del rol primero). Sin nadie, el rol queda vacío. */
export const personaDelRol = <U extends PersonaVisible>(usuarios: readonly U[], rolId: string): U | undefined =>
  usuarios.find(u => u.rolId === rolId && u.estado === 'activo' && u.id === rolId)
  ?? usuarios.find(u => u.rolId === rolId && u.estado === 'activo')

/** Los campos que tiene asignados quien ocupa un rol: los que el gerente le
 *  dio a esa persona en el registro de usuarios; si nadie lo ocupa, los del
 *  rol. La misma regla en la pantalla y en el servidor: nadie ve ni actúa
 *  sobre un campo que no tiene. */
export function camposAsignados(rol: { id: string; campos: 'todos' | string[] }, usuarios: readonly PersonaVisible[]) {
  const campos = personaDelRol(usuarios, rol.id)?.campos ?? rol.campos
  return campos === 'todos' ? CAMPOS : CAMPOS.filter(c => campos.includes(c.id))
}
