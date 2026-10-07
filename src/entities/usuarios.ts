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
import { region } from '@/shared/config/region'

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
  /** Número de WhatsApp para las alertas, en E.164 («+573005550101»): así se
   *  guarda y así lo resuelve el webhook. La pantalla lo muestra agrupado
   *  (`telefonoLegible`). Sin él, no le llega nada. */
  telefono?: string
  /** Si recibe las alertas de su rol por WhatsApp. */
  alertas: boolean
  /** Lo pone el servidor al suspender: el estado que tenía. Al quitar la
   *  suspensión vuelve a ese, y no a «activo»: quien nunca entró sigue
   *  invitado. */
  antesDeSuspender?: 'activo' | 'invitado'
}

/** Lo que ve de OTRA persona quien no tiene `usuarios:administrar` en
 *  `GET /api/usuarios` (CONTRATO.md, «Quién lee qué»): lo que una pantalla
 *  operativa usa y nada más. El nombre (firmas, órdenes, respuestas), el rol y
 *  los campos (quién ocupa cada rol, a quién le llega cada alerta), el estado
 *  (un suspendido ya no recibe) y si tiene las alertas encendidas. El WhatsApp,
 *  solo de quien de verdad las recibe: para eso se guarda (el operador ve a
 *  quién le llegó la pregunta y le escribe), y el de los demás no lo usa
 *  ninguna pantalla. El correo, el día del acceso y el estado de antes de una
 *  suspensión son del registro: los ve quien lo administra, y cada persona los
 *  suyos (Mi perfil). */
export interface PersonaVisible {
  id: string
  nombre: string
  rolId: string
  campos: 'todos' | string[]
  estado: EstadoUsuario
  alertas: boolean
  telefono?: string
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
    id: u.id, nombre: u.nombre, rolId: u.rolId, campos: u.campos, estado: u.estado, alertas: u.alertas,
    ...(recibeAlertas(u) && u.telefono ? { telefono: u.telefono } : {}),
  }))
}

/** Lo que manda el front al invitar (`POST /api/usuarios`): el id, el día y
 *  el estado los pone el servidor, nunca quien llama. */
export type Invitacion = Pick<Usuario, 'nombre' | 'correo' | 'rolId' | 'campos' | 'telefono' | 'alertas'>

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

/** Roles que reciben alertas por WhatsApp: los que actúan sobre el equipo.
 *  Los demás no tienen regla que les mande nada (`mensajes.ts`). */
export const ROLES_CON_ALERTAS = ['sup', 'oper', 'tec', 'conf', 'jefe']

/** Lo que le llega a cada rol, dicho como lo lee quien lo recibe. Es la regla
 *  de `mensajes.ts` y nada más: lo que aquí se promete, el backend lo copia. */
export const ALERTAS_DEL_ROL: Record<string, string> = {
  sup: 'equipo de alto impacto parado, pozos cerrándose por una bomba y «¿qué se dañó?» cuando nadie responde en 2 h (o de una vez, si no hay operador con WhatsApp)',
  oper: 'equipo de alto impacto parado, pozos cerrándose por una bomba y «¿qué se dañó?» con su recordatorio a los 30 min',
  tec: 'las órdenes que SAP le libera',
  conf: 'cada predicción del vigía cuando sale, con su ventana',
  jefe: 'cada predicción del vigía cuando sale, con su ventana',
}

/** Si a la persona le llegan las alertas de su rol por WhatsApp (de ese campo, si se dice). */
export function recibeAlertas(u: PersonaVisible, campoId?: string): boolean {
  return u.estado === 'activo' && u.alertas && !!u.telefono?.trim() && ROLES_CON_ALERTAS.includes(u.rolId)
    && (!campoId || u.campos === 'todos' || u.campos.includes(campoId))
}

/** El número en E.164: «+» y solo dígitos («+573001234567»). Es la identidad
 *  del canal (el webhook resuelve el número a la persona): con él se compara,
 *  nunca con el texto como se escribió. Sin «+» no hay indicativo: undefined. */
export function e164(t: string | undefined): string | undefined {
  const s = (t ?? '').trim()
  if (!s.startsWith('+')) return undefined
  const d = s.slice(1).replace(/[\s().-]/g, '')
  return /^\d{8,15}$/.test(d) ? `+${d}` : undefined
}

/** El número como se GUARDA: E.164, como dice el contrato y como lo resuelve
 *  el webhook. Un celular del país sin indicativo lo recibe («300 123 4567» →
 *  «+573001234567») y uno con indicativo pierde los espacios y separadores
 *  («+57 300 123 4567» → «+573001234567»). Lo que no se puede volver E.164 se
 *  deja como se escribió, para que la regla de forma lo rechace con su
 *  mensaje (nunca se guarda a medias). Vacío sigue vacío: sin número. */
export function normalizarTelefono(t: string, celular?: { indicativo: string; patron: RegExp }): string {
  const s = t.trim(), d = s.replace(/[\s().-]/g, '')
  if (!s) return ''
  if (celular && celular.patron.test(d)) return `${celular.indicativo}${d}`
  return e164(s) ?? s
}

/** El número como se LEE: el celular del país agrupado («+57 300 123 4567»);
 *  otro número, en su E.164 tal cual (no se adivina cómo se agrupa en otro
 *  país). Solo para mostrar: nunca se compara ni se guarda así. */
export function telefonoLegible(t: string, celular: { indicativo: string; patron: RegExp } | undefined = region.celular): string {
  const n = e164(t)
  if (!n) return t
  const resto = celular && n.startsWith(celular.indicativo) ? n.slice(celular.indicativo.length) : undefined
  return resto && celular!.patron.test(resto) ? `${celular!.indicativo} ${resto.slice(0, 3)} ${resto.slice(3, 6)} ${resto.slice(6)}` : n
}

/** Al arrancar la implementación, cada rol del producto tiene su persona. Los
 *  teléfonos son de demostración (el 555 no se asigna a nadie). */
export const USUARIOS_INICIALES: Usuario[] = ROLES_VISIBLES.map((r, i) => ({
  id: r.id, nombre: r.persona, correo: correoDe(r.persona), rolId: r.id,
  campos: r.campos, estado: 'activo', desde: '2026-09-01',
  telefono: `+5730055501${String(i + 1).padStart(2, '0')}`, alertas: ROLES_CON_ALERTAS.includes(r.id),
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
  return [`invitado como ${rolNombre(u.rolId).toLowerCase()}`, `campos: ${nombreCampos(u.campos)}`,
    `WhatsApp: ${u.telefono ? telefonoLegible(u.telefono) : 'sin número'}`, ...(u.alertas ? ['recibe alertas por WhatsApp'] : [])]
}

export function cambiosDeUsuario(a: Usuario, b: Usuario): string[] {
  const out: string[] = []
  if (a.rolId !== b.rolId) out.push(`rol: ${rolNombre(a.rolId)} → ${rolNombre(b.rolId)}`)
  if (nombreCampos(a.campos) !== nombreCampos(b.campos)) out.push(`campos: ${nombreCampos(a.campos)} → ${nombreCampos(b.campos)}`)
  if (a.estado !== b.estado) out.push(b.estado === 'suspendido' ? 'acceso suspendido' : a.estado === 'suspendido' ? 'acceso reactivado' : `estado: ${ESTADO_NOMBRE[b.estado]}`)
  // Se compara lo guardado (E.164) y se escribe como se lee: el historial lo lee una persona.
  if ((a.telefono ?? '') !== (b.telefono ?? '')) out.push(`WhatsApp: ${a.telefono ? telefonoLegible(a.telefono) : 'sin número'} → ${b.telefono ? telefonoLegible(b.telefono) : 'sin número'}`)
  if (a.alertas !== b.alertas) out.push(b.alertas ? 'recibe alertas por WhatsApp' : 'deja de recibir alertas por WhatsApp')
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
export type CampoAcceso = 'nombre' | 'correo' | 'rol' | 'campos' | 'whatsapp' | 'alertas' | 'motivo' | 'general'
export interface ErrorAcceso { campo: CampoAcceso; texto: string }

/** Reglas de un cambio de acceso. `quien` es el id de la persona que firma.
 *  Devuelve los errores (vacío = se puede). Las mismas que el servidor
 *  responde con 403 (otorgar o cambiarse lo que no le toca), 409 (dejaría la
 *  operación sin gerente) o 422 (datos, WhatsApp repetido). */
export function revisarAcceso(usuarios: Usuario[], nuevo: Usuario, quien: string, motivo: string): ErrorAcceso[] {
  const e: ErrorAcceso[] = []
  const antes = usuarios.find(u => u.id === nuevo.id)
  if (!alcanza(nuevo.nombre, NOMBRE_MINIMO)) e.push({ campo: 'nombre', texto: 'Falta el nombre completo.' })
  if (!CORREO.test(nuevo.correo.trim())) e.push({ campo: 'correo', texto: 'Escriba un correo válido, como nombre@empresa.com.' })
  else if (usuarios.some(u => u.id !== nuevo.id && u.correo.toLowerCase() === nuevo.correo.trim().toLowerCase()))
    e.push({ campo: 'correo', texto: 'Ya hay una persona con ese correo.' })
  if (!ROLES_VISIBLES.some(r => r.id === nuevo.rolId)) e.push({ campo: 'rol', texto: 'Escoja un rol.' })
  if (nuevo.campos !== 'todos' && nuevo.campos.length === 0) e.push({ campo: 'campos', texto: 'Escoja al menos un campo.' })
  // Lo que llega ya pasó por `normalizarTelefono`: lo que no quedó en E.164 no tiene forma de número.
  if (nuevo.telefono && !/^\+\d{8,15}$/.test(nuevo.telefono)) e.push({ campo: 'whatsapp', texto: 'El WhatsApp va con indicativo (+57 300 123 4567) o como celular de 10 dígitos (300 123 4567).' })
  // El número es la identidad en WhatsApp: con dos personas en el mismo, una
  // respuesta quedaría a nombre de la equivocada. Se compara en E.164 y entre
  // quienes pueden recibir (un suspendido ya no recibe ni responde).
  const tel = e164(nuevo.telefono)
  const otro = tel && nuevo.estado !== 'suspendido' ? usuarios.find(u => u.id !== nuevo.id && u.estado !== 'suspendido' && e164(u.telefono) === tel) : undefined
  if (otro) e.push({ campo: 'whatsapp', texto: `Ese WhatsApp ya es de ${otro.nombre}: cada número es de una sola persona.` })
  if (nuevo.alertas && !nuevo.telefono?.trim()) e.push({ campo: 'whatsapp', texto: 'Para recibir alertas necesita un número de WhatsApp.' })
  if (nuevo.alertas && !ROLES_CON_ALERTAS.includes(nuevo.rolId)) e.push({ campo: 'alertas', texto: 'Ese rol no recibe alertas por WhatsApp: quite la marca.' })
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
