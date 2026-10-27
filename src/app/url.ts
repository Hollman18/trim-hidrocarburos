import { ROLES, ROLES_VISIBLES, ROLES_RETIRADOS, rolPorId } from '@/entities/roles'
import { CAMPOS, esIdPeriodo } from '@/entities/campos'
import { pedirInicioDeHistoria } from '@/shared/api/calendario'
import { AHORA } from '@/entities/reloj'
import type { Rol, IdPeriodo } from '@/entities/tipos'
import { diaIso } from '@/shared/lib/formato'
import { PANTALLAS } from '@/app/pantallas'
import { pantallaVisible } from '@/shared/config/producto'


/** F1 · P-18 (X4 §3.8): el momento de La planta viva va en la dirección: «#/ger/planta-viva/ceiba/antes». */
export type MomentoDireccion = 'antes' | 'durante' | 'despues'
const MOMENTOS_DIRECCION: readonly string[] = ['antes', 'durante', 'despues']

export interface Contexto {
  rolId: string; pantalla: string; campoId: string; periodoId: IdPeriodo | 'medida'
  /** El momento de La planta viva (P-18). Solo se escribe en la dirección cuando no es «durante». */
  momento?: MomentoDireccion
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

/** La pantalla de un tramo de la dirección: su `ruta` («planta-viva») o su id
 *  («plantaViva», el de siempre: así las direcciones de antes y las que se
 *  escribieron con el id siguen abriendo). */
export const pantallaDeRuta = (tramo: string): string =>
  Object.keys(PANTALLAS).find(id => PANTALLAS[id]!.ruta === tramo) ?? tramo
/** El tramo de la dirección de una pantalla: su `ruta`, o el id si no tiene. */
export const rutaDe = (pantalla: string): string => PANTALLAS[pantalla]?.ruta ?? pantalla

/** C5 · Las pantallas que se fundieron en otra (X4 §3.6 y §3.8): quien ya no las
 *  tiene y tiene la nueva, llega a la nueva. El Resumen del gerente vive en La
 *  planta viva (y en Resultados); sus Diferidos y su Producción, en Resultados;
 *  Riesgo, en La planta viva (Durante y Antes; `#/ger/riesgo/…` → La planta viva).
 *  Un enlace viejo («#/ger/diferidos/ceiba/cerrado») sigue abriendo. */
export const FUSIONADA_EN: Readonly<Record<string, string>> = { resumen: 'plantaViva', diferidos: 'resultados', produccion: 'resultados', riesgo: 'plantaViva',
  // F1 · P-trabajo-1: Mi trabajo del técnico vive en Hoy.
  trabajo: 'hoy',
  // B3 (experiencia v3, borrado.md): Turno (A-01) y Mantenimiento (A-12) viven en Hoy; Bombas, Electrosumergibles
  // (A-15), Superficie y Pozos (B-05) son filtros de Equipos (`FILTRO_DE`); Identificar es «Una por una».
  turno: 'hoy', mantenimiento: 'hoy', bombas: 'equipos', esp: 'equipos', equipo: 'equipos', pozos: 'equipos' }
/** B3 · El filtro de Equipos con que abre la dirección de una pantalla que se volvió filtro (A-15). */
export const FILTRO_DE: Readonly<Record<string, FiltroDireccion>> = {
  bombas: { tipo: 'bomba' }, esp: { tipo: 'electrosumergible' }, equipo: { tipo: 'superficie' }, pozos: { tren: 'pozos' },
}
export interface FiltroDireccion { tipo?: 'bomba' | 'electrosumergible' | 'pozo' | 'superficie'; tren?: 'pozos' }
/** K1 · P-10: una pantalla que se fundió en otra distinta según el rol. El Riesgo del jefe de
 *  mantenimiento y de confiabilidad vive en su Equipos (debajo de la lista, con lo que cada uno
 *  decide arriba); el del gerente sigue en La planta viva (`FUSIONADA_EN`). Va antes que la regla de todos. */
export const FUSIONADA_EN_ROL: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  riesgo: { jefe: 'equipos', conf: 'equipos' },
  // B3: el Hoy de confiabilidad se fundió en su Equipos; su Resultados es Confiabilidad (B-03); al jefe, su
  // Confiabilidad está en Resultados (B-07); el Equipos del gerente, en Resultados («por equipo», A-16).
  hoy: { conf: 'equipos', prod: 'plantaViva' }, resultados: { conf: 'confiabilidad', reg: 'regulatorio' }, confiabilidad: { jefe: 'resultados' },
  // Pedidos de B2: el Equipos del gerente abre su inicio; La planta viva de reg y adm, su única pantalla.
  equipos: { ger: 'plantaViva' }, plantaViva: { reg: 'regulatorio', adm: 'configuracion' },
}
/** La pantalla que abre una dirección para un rol: ella misma, o aquella en que se fundió (la de su rol primero). */
export const pantallaQueAbre = (rol: Pick<Rol, 'pantallas'> & Partial<Pick<Rol, 'id'>>, p: string): string | undefined => {
  if (pantallaDelRol(rol, p)) return p
  const delRol = rol.id && Object.hasOwn(FUSIONADA_EN_ROL, p) && Object.hasOwn(FUSIONADA_EN_ROL[p]!, rol.id) ? FUSIONADA_EN_ROL[p]![rol.id] : undefined
  if (delRol && pantallaDelRol(rol, delRol)) return delRol
  return Object.hasOwn(FUSIONADA_EN, p) && pantallaDelRol(rol, FUSIONADA_EN[p]!) ? FUSIONADA_EN[p] : undefined
}

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
/** Lo que se lee de la dirección: el contexto que se puede abrir y, aparte,
 *  el campo del registro que pedía y la persona no tiene (se dice: B-38). */
export type DeLaDireccion = Partial<Contexto> & { campoAjeno?: string
  /** P-17 y A-22: un rol que existe pero no se ofrece en esta versión (plan) o que salió del
   *  producto (cont): la aplicación dice que no está disponible, sin abrir otro rol. */
  rolAjeno?: string
  /** B3 · A-15: la dirección era de una pantalla que hoy es un filtro de Equipos. */
  filtro?: FiltroDireccion }
/** El nombre de un rol que no se ofrece (apagado o retirado), para decirlo. */
export const nombreRolAjeno = (id: string): string | undefined =>
  ROLES.find(r => r.id === id)?.nombre ?? (Object.hasOwn(ROLES_RETIRADOS, id) ? ROLES_RETIRADOS[id] : undefined)

/** C4 · Equipos: ¿este rol abre el nivel 3 técnico (una vista entera, no el panel
 *  flotante)? Los roles técnicos que tienen Equipos; el gerente sigue con su ficha
 *  ejecutiva en el panel (X4 §3.7, «Ficha del equipo»). */
export const abreNivel3 = (rol: Pick<Rol, 'nivel' | 'pantallas'>) =>
  rol.nivel !== 'decision' && rol.pantallas.includes('equipos') && pantallaVisible('equipos')
/** C4 · El nivel 4 (diagnóstico) va en la dirección del equipo: «…/P-201B/diagnostico» (X4 §5.1). */
export const DIAGNOSTICO = 'diagnostico'

export const leerHash = (camposDe: (rolId: string) => 'todos' | string[] = id => rolPorId(id).campos, rolActual?: string): DeLaDireccion => {
  const tramos = location.hash.replace(/^#\/?/, '').split('/')
  const [rolId, tramo, campoId] = tramos
  // C4 · Equipos va sin período (X4 §3.8): #/<rol>/equipos/<campo>[/<equipo>[/diagnostico]].
  // Si trae un período en su lugar de siempre, también se lee.
  const sinPeriodo = !!tramo && pantallaDeRuta(tramo) === 'equipos' && !!tramos[3] && !esIdPeriodo(tramos[3]) && !RANGO.test(tramos[3])
  const periodoId = sinPeriodo ? undefined : tramos[3]
  const [equipo, nivel4] = tramos.slice(sinPeriodo ? 3 : 4)
  const pantalla = tramo === undefined ? undefined : tramo && pantallaDeRuta(tramo)
  const ctx: DeLaDireccion = {}
  // Solo roles del producto: un enlace viejo a un rol de v2 (plan, cont, reg)
  // dejaba guardado un rol que la cabecera mostraba como producción y con el
  // que nadie podía firmar ni exportar.
  if (rolId && ROLES_VISIBLES.some(r => r.id === rolId)) ctx.rolId = rolId
  else if (rolId && nombreRolAjeno(rolId)) ctx.rolAjeno = rolId
  const rol = rolPorId(ctx.rolId ?? rolActual ?? '')
  // «portafolio» ya no es pantalla; se deja pasar para que el estado lo
  // traduzca a alcance y las direcciones viejas sigan sirviendo.
  if (pantalla === 'portafolio') ctx.pantalla = 'portafolio'
  else if (pantalla && pantallaQueAbre(rol, pantalla)) {
    ctx.pantalla = pantallaQueAbre(rol, pantalla)
    if (ctx.pantalla === 'equipos' && Object.hasOwn(FILTRO_DE, pantalla)) ctx.filtro = FILTRO_DE[pantalla]
  }
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
  else if (soloCampo && CAMPOS.some(c => c.id === soloCampo)) ctx.campoAjeno = soloCampo
  // P-18: en La planta viva el lugar del período lleva el momento («antes», «despues»).
  if (periodoId && MOMENTOS_DIRECCION.includes(periodoId)) ctx.momento = periodoId as MomentoDireccion
  // Solo un período de la cabecera: otro texto no se cambia por «mes en curso», se ignora y la dirección se reescribe con el que se ve.
  else if (periodoId && esIdPeriodo(periodoId)) ctx.periodoId = periodoId
  const r = periodoId?.match(RANGO)
  const rango = r ? rangoValido(r[1]!, r[2]!) : undefined
  if (rango) { ctx.rango = rango; ctx.periodoId = 'medida' }
  if (equipo) ctx.equipoAbierto = equipo
  // C4 · Toda dirección con un equipo abre su nivel 3 a un rol técnico: la de antes
  // (#/sup/bombas/ceiba/curso/P-201B) pasa a la nueva (#/sup/equipos/ceiba/P-201B), y
  // «/diagnostico» abre su nivel 4. El gerente sigue abriendo su ficha en el panel.
  if (equipo && ctx.pantalla && ctx.pantalla !== 'portafolio' && abreNivel3(rol)) {
    ctx.pantalla = 'equipos'
    if (nivel4 === DIAGNOSTICO) ctx.equipoAbierto = `${equipo}/${DIAGNOSTICO}`
  }
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
  // C4 · Equipos es «ahora»: su dirección no lleva período (X4 §3.8).
  // P-18: La planta viva lleva su momento en el lugar del período, si no es «durante».
  const cuarto = c.pantalla === 'plantaViva' && c.momento && c.momento !== 'durante' ? c.momento : periodo
  const nuevo = `#/${c.rolId}/${rutaDe(c.pantalla)}/${c.campoId}${c.alcance === 'portafolio' ? '~portafolio' : ''}${c.pantalla === 'equipos' ? '' : `/${cuarto}`}`
    + (c.equipoAbierto ? `/${c.equipoAbierto}` : '')
  if (location.hash === nuevo) return
  if (nuevaEntrada) history.pushState(null, '', nuevo)
  else history.replaceState(null, '', nuevo)
}
