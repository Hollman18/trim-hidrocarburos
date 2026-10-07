import { ROLES_VISIBLES, rolPorId } from '@/entities/roles'
import { CAMPOS, esIdPeriodo } from '@/entities/campos'
import { pedirInicioDeHistoria } from '@/shared/api/calendario'
import { AHORA } from '@/entities/reloj'
import type { Rol, IdPeriodo } from '@/entities/tipos'
import { diaIso } from '@/shared/lib/formato'
import { PANTALLAS } from '@/app/pantallas'
import { pantallaVisible } from '@/shared/config/producto'


export interface Contexto {
  rolId: string; pantalla: string; campoId: string; periodoId: IdPeriodo | 'medida'
  alcance: 'campo' | 'portafolio'
  equipoAbierto: string | null
  /** Rango escogido a mano: va en la dirección como «2026-09-01_2026-09-10». */
  rango: { desde: string; hasta: string } | null
}

const RANGO = /^(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})$/
/** Primer y último día con datos: los límites de cualquier rango (la
 *  cabecera los usa para no ofrecer fechas que no existen). */
export const PRIMER_DIA = diaIso(pedirInicioDeHistoria()), ULTIMO_DIA = diaIso(AHORA)

/** Pantallas de toda persona, sea cual sea su rol: no van en el menú del rol
 *  (se abren desde el menú de la persona), pero sí en la dirección. Sin esto,
 *  «Mi perfil» no sobrevivía a recargar ni a atrás/adelante. */
export const PANTALLAS_COMUNES = ['perfil']

/** ¿Puede este rol abrir esta pantalla? Una regla para la dirección, el
 *  estado y la vista: la pantalla existe, es del producto (no de v2) y es del
 *  rol o de todos. */
export const pantallaDelRol = (rol: Pick<Rol, 'pantallas'>, p: string) =>
  !!PANTALLAS[p] && pantallaVisible(p) && (rol.pantallas.includes(p) || PANTALLAS_COMUNES.includes(p))

/** Un rango escrito en la dirección solo vale con fechas reales: se endereza
 *  si viene al revés y se recorta a los días que tienen datos. Si queda fuera
 *  de los datos, no hay rango. */
export function rangoValido(a: string, b: string): { desde: string; hasta: string } | undefined {
  // El día se lee en hora de Colombia (mediodía, lejos de cualquier borde): leído en
  // la hora del navegador, al este de Bogotá caía en el día anterior y el rango se perdía.
  const real = (s: string) => { const d = new Date(`${s}T12:00:00-05:00`); return !Number.isNaN(d.getTime()) && diaIso(d) === s }
  if (!real(a) || !real(b)) return undefined
  let [desde, hasta] = a <= b ? [a, b] : [b, a]
  if (hasta < PRIMER_DIA || desde > ULTIMO_DIA) return undefined
  if (desde < PRIMER_DIA) desde = PRIMER_DIA
  if (hasta > ULTIMO_DIA) hasta = ULTIMO_DIA
  return { desde, hasta }
}

/** La dirección es #/rol/pantalla/campo/período. Sirve para compartir una
 *  vista tal cual: «mírate La Ceiba en septiembre con mi mismo lente».
 *  `camposDe` dice qué campos tiene asignados cada rol: los del registro de
 *  usuarios (los da el gerente), no los de fábrica del rol. `rolActual` es el
 *  rol que se está viendo: si la dirección no trae un rol válido, la pantalla
 *  y el campo se validan contra ESE rol, no contra el de arranque (antes un
 *  «#//produccion/palmar» le abría al operador una pantalla y un campo ajenos). */
export const leerHash = (camposDe: (rolId: string) => 'todos' | string[] = id => rolPorId(id).campos, rolActual?: string): Partial<Contexto> => {
  const [rolId, pantalla, campoId, periodoId, equipo] = location.hash.replace(/^#\/?/, '').split('/')
  const ctx: Partial<Contexto> = {}
  // Solo roles del producto: un enlace viejo a un rol de v2 (plan, cont, reg)
  // dejaba guardado un rol que la cabecera mostraba como producción y con el
  // que nadie podía firmar ni exportar.
  if (rolId && ROLES_VISIBLES.some(r => r.id === rolId)) ctx.rolId = rolId
  const rol = rolPorId(ctx.rolId ?? rolActual ?? '')
  // «portafolio» ya no es pantalla; se deja pasar para que el estado lo
  // traduzca a alcance y las direcciones viejas sigan sirviendo.
  if (pantalla === 'portafolio') ctx.pantalla = 'portafolio'
  else if (pantalla && pantallaDelRol(rol, pantalla)) ctx.pantalla = pantalla
  // Una pantalla que el rol no tiene (o que ya no existe) lleva a su inicio,
  // igual al cargar que con la aplicación abierta.
  else if (pantalla) ctx.pantalla = rol.inicio
  // El campo tiene que estar ASIGNADO al rol: una dirección no debe abrir un
  // campo que esa persona no tiene.
  const soloCampo = campoId?.replace('~portafolio', '')
  const campos = camposDe(rol.id)
  const asignado = (id: string) =>
    campos === 'todos' ? CAMPOS.some(c => c.id === id) : campos.includes(id)
  if (soloCampo && asignado(soloCampo)) ctx.campoId = soloCampo
  // Solo un período de la cabecera: otro texto no se cambia por «mes en curso», se ignora y la dirección se reescribe con el que se ve.
  if (periodoId && esIdPeriodo(periodoId)) ctx.periodoId = periodoId
  const r = periodoId?.match(RANGO)
  const rango = r ? rangoValido(r[1]!, r[2]!) : undefined
  if (rango) { ctx.rango = rango; ctx.periodoId = 'medida' }
  if (equipo) ctx.equipoAbierto = equipo
  // Una dirección con un solo campo es ese campo: sin esto, un enlace
  // compartido dejaba la vista en el portafolio que se estaba mirando antes.
  if (location.hash.includes('~portafolio') || ctx.pantalla === 'portafolio') ctx.alcance = 'portafolio'
  else if (ctx.campoId) ctx.alcance = 'campo'
  return ctx
}

/** Cambiar de pantalla, de rol o de campo deja una entrada en el historial
 *  (el botón «atrás» vuelve a donde se estaba); cambiar el período o abrir un
 *  equipo, no. */
export const escribirHash = (c: Contexto, nuevaEntrada = false) => {
  const periodo = c.rango ? `${c.rango.desde}_${c.rango.hasta}` : c.periodoId
  const nuevo = `#/${c.rolId}/${c.pantalla}/${c.campoId}${c.alcance === 'portafolio' ? '~portafolio' : ''}/${periodo}`
    + (c.equipoAbierto ? `/${c.equipoAbierto}` : '')
  if (location.hash === nuevo) return
  if (nuevaEntrada) history.pushState(null, '', nuevo)
  else history.replaceState(null, '', nuevo)
}
