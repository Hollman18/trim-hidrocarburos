import type { ComponentType } from 'react'
import { pantalla } from '@/shared/lib/carga'
import {
  Gauge, Network, MessageSquareText,
  Droplets, FileCheck2, SlidersHorizontal, UserRound, Plug,
  TrendingUp, CircleDot, ListChecks, ChartColumn, ShieldCheck, ScrollText,
} from 'lucide-react'
import { IconoPlanta } from '@/shared/brand/Logo'

const Perfil = pantalla(() => import('@/pages/Perfil'), 'Perfil')
const Planta = pantalla(() => import('@/pages/Planta'), 'Planta')
const Configuracion = pantalla(() => import('@/pages/Configuracion'), 'Configuracion')
const Conectores = pantalla(() => import('@/pages/Conectores'), 'Conectores')
const Agua = pantalla(() => import('@/pages/Agua'), 'Agua')
const Produccion = pantalla(() => import('@/pages/Produccion'), 'Produccion')
const Pozos = pantalla(() => import('@/pages/Pozos'), 'Pozos')
const Causa = pantalla(() => import('@/pages/Causa'), 'Causa')
const Confiabilidad = pantalla(() => import('@/pages/Confiabilidad'), 'Confiabilidad')
const Regulatorio = pantalla(() => import('@/pages/Regulatorio'), 'Regulatorio')
// C2 y C3 (experiencia v2): La planta viva del gerente y Hoy, lo que a cada rol le toca.
const PlantaViva = pantalla(() => import('@/pages/PlantaViva'), 'PlantaViva')
const Hoy = pantalla(() => import('@/pages/Hoy'), 'Hoy')
// C4 y C5 (experiencia v2): Equipos en un solo lugar y Resultados del período.
const Equipos = pantalla(() => import('@/pages/Equipos'), 'Equipos')
const Resultados = pantalla(() => import('@/pages/Resultados'), 'Resultados')

export interface Pantalla {
  corto: string
  titulo: string
  ruta: string
  icono: ComponentType<{ className?: string }>
  Vista: ComponentType
  /** Si tiene sentido verla con todos los campos a la vez. El esquema de
   *  planta o el tren de agua son de UN campo; los barriles se suman. */
  agrega?: boolean
  /** Es «ahora» (X4 §3.1, regla 8): sin selector de período en la cabecera.
   *  Lo llevan las pantallas que no leen el período. */
  ahora?: boolean
  /** Sin «Exportar» en la cabecera: la pantalla trae su propia salida
   *  («Compartir el informe» en La planta viva, «Entregar turno» en Hoy). */
  sinExportar?: boolean
  /** F1 · I-adm-3: el título que ve un rol cuando no es el de todos («Metas y accesos» del gerente). */
  tituloPorRol?: Readonly<Record<string, string>>
}

/** Qué pantalla entra en el primer producto NO se decide aquí: se decide en
 *  `PANTALLAS_V2` de shared/config/producto.ts, que es lo que filtran el riel y el
 *  onboarding. Tener el alcance en dos sitios fue un error: el registro
 *  marcaba como v2 pantallas que el MVP sí usa. */
export const PANTALLAS: Record<string, Pantalla> = {
  // La experiencia v2: la vista del gerente se llama «La planta viva» (lo decidió el dueño).
  plantaViva:   { corto: 'La planta viva', titulo: 'La planta viva',             ruta: 'planta-viva', agrega: true, ahora: true, sinExportar: true, icono: IconoPlanta, Vista: PlantaViva },
  hoy:          { corto: 'Hoy',           titulo: 'Hoy',                         ruta: 'hoy', agrega: true, ahora: true, sinExportar: true, icono: ListChecks,         Vista: Hoy },
  equipos:      { corto: 'Equipos',       titulo: 'Equipos',                     ruta: 'equipos', agrega: true, ahora: true, sinExportar: true, icono: Gauge,              Vista: Equipos },
  resultados:   { corto: 'Resultados',    titulo: 'Resultados',                  ruta: 'resultados', agrega: true,                      icono: ChartColumn,        Vista: Resultados },
  // B3 · A-15: Bombas y Electrosumergibles ya no son pantallas: son filtros de Equipos; sus direcciones
  // abren Equipos con el filtro puesto (`FILTRO_DE`, url.ts) y, con un equipo, su nivel 3.
  produccion:   { corto: 'Producción',    titulo: 'Producción contra plan',      ruta: 'produccion', agrega: true,   icono: TrendingUp,         Vista: Produccion },
  pozos:        { corto: 'Pozos',         titulo: 'Pozos',                       ruta: 'pozos', agrega: true,        icono: CircleDot,          Vista: Pozos },
  // B3 · A-01: la pantalla Turno se borró (repetía Hoy); «Entregar turno» vive en Hoy y su dirección abre Hoy.
  // F1 · P-trabajo-1 y K1 · G-15: Mi trabajo se fundió en Hoy del técnico y ningún rol la ofrece: la pantalla se
  // borró; su dirección («#/tec/trabajo/…») sigue abriendo Hoy (`FUSIONADA_EN`, url.ts).
  // B3 · A-12: Mantenimiento como estaba se borró; lo suyo vive en el Hoy del jefe y su dirección abre ahí.
  // F1 · P-21: el Resumen del gerente ya no es una pantalla (C5 lo fundió en La planta viva y Resultados);
  // su dirección sigue abriendo La planta viva (`FUSIONADA_EN`, url.ts).
  // K1 · P-10: Riesgo ya no es una pantalla. El del gerente vive en La planta viva (C5) y el del jefe y de
  // confiabilidad, en su Equipos, debajo de la lista; su dirección abre ahí (`FUSIONADA_EN` y `FUSIONADA_EN_ROL`, url.ts).
  perfil:       { corto: 'Mi perfil',     titulo: 'Mi perfil',                   ruta: 'perfil', ahora: true, sinExportar: true,       icono: UserRound,          Vista: Perfil },
  planta:       { corto: 'Planta',        titulo: 'Planta',                      ruta: 'planta',                          icono: Network,            Vista: Planta },
  // B3 · B-06: ya no es una puerta. Contestar vive en Hoy; aquí queda la cadena de 6 pasos, «Ver una por una».
  causa:        { corto: 'Una por una',   titulo: 'Paradas una por una',         ruta: 'causa', agrega: true,             icono: MessageSquareText,  Vista: Causa },
  // B3 · «Superficie» ya no es pantalla: su dirección abre Equipos con el filtro de servicios (`FILTRO_DE`, url.ts).
  agua:         { corto: 'Agua',          titulo: 'Agua y almacenamiento',       ruta: 'agua',                            icono: Droplets,           Vista: Agua },
  confiabilidad:{ corto: 'Confiabilidad', titulo: 'Confiabilidad',               ruta: 'confiabilidad', agrega: true,                   icono: ShieldCheck,           Vista: Confiabilidad },
  // B3 · A-21: Evidencia salió del producto con el rol de abastecimiento.
  regulatorio:  { corto: 'Regulatorio',   titulo: 'Reporte al regulador',        ruta: 'regulatorio', sinExportar: true,                     icono: FileCheck2,         Vista: Regulatorio },
  // I-adm-3: un nombre por pantalla; cada parte trae su título adentro (F3). UI-08: sin período ni Exportar (un formulario).
  configuracion:{ corto: 'Configuración', titulo: 'Configurar', tituloPorRol: { ger: 'Metas y accesos' }, ruta: 'configuracion', ahora: true, sinExportar: true, icono: SlidersHorizontal,  Vista: Configuracion },
  // La misma vista que Configuración, abierta en la filosofía operacional: así el
  // enlace la conserva y el borrador no se pierde al pasar de una a otra.
  filosofia:    { corto: 'Filosofía operacional', titulo: 'Filosofía operacional', ruta: 'filosofia', ahora: true, sinExportar: true, icono: ScrollText,  Vista: Configuracion },
  conectores:   { corto: 'Conectores',    titulo: 'Conectores y tags del campo', ruta: 'conectores', ahora: true, sinExportar: true,   icono: Plug,               Vista: Conectores },
}

/** El título de una pantalla para un rol (I-adm-3): el suyo, si lo tiene, o el de todos. */
export const tituloDe = (id: string, rolId: string): string | undefined => {
  const p = PANTALLAS[id]
  return p && Object.hasOwn(p.tituloPorRol ?? {}, rolId) ? p.tituloPorRol![rolId] : p?.titulo
}

/** Pantallas que viven DENTRO de otra: tienen dirección propia, pero en el
 *  menú y en la introducción va la de afuera (la filosofía operacional es una
 *  pestaña de Configuración con su propio enlace). */
export const DENTRO_DE: Readonly<Record<string, string>> = {
  filosofia: 'configuracion', conectores: 'configuracion',
  // B3 (flujos.md §2; borrado.md B-04 a B-06): siguen a un toque desde su puerta, sin entrada propia en el panel.
  causa: 'hoy', pozos: 'equipos', planta: 'plantaViva', agua: 'plantaViva',
}
/** ¿Va como entrada propia en el menú y en la introducción? */
export const enElMenu = (id: string) => !Object.hasOwn(DENTRO_DE, id)
/** La entrada del menú que se marca para una pantalla: ella misma, o la de afuera. */
export const entradaDe = (id: string) => (Object.hasOwn(DENTRO_DE, id) ? DENTRO_DE[id]! : id)

/** Las puertas del panel lateral (X4 §3.2, X5 §4.1, CONSTRUCCION.md): cada una
 *  junta las pantallas que hoy viven dentro de ella, mientras las tandas 2 y 3
 *  las fusionan. Las subpantallas de la puerta abierta se listan en el mismo
 *  panel, debajo de su puerta: nunca en pestañas horizontales. Cada subpantalla
 *  aparece si el rol la tiene y el campo tiene ese tipo de equipo (perfil
 *  firmado). Siguen siendo pantallas con su dirección propia: los enlaces de
 *  antes funcionan igual. El orden de los miembros es uno para todos. */
export interface Puerta { corto: string; icono: ComponentType<{ className?: string }>; miembros: string[] }
export const GRUPOS: Record<string, Puerta> = {
  hoy:        { corto: 'Hoy',            icono: ListChecks,        miembros: ['hoy', 'causa'] },
  // C5: el Resumen del gerente ya no se ofrece (cada panel tiene su lugar: X4 §3.7); su dirección abre La planta viva.
  plantaViva: { corto: 'La planta viva', icono: IconoPlanta,       miembros: ['plantaViva', 'planta', 'agua'] },
  equipos:    { corto: 'Equipos',        icono: Gauge,             miembros: ['equipos', 'pozos'] },
  resultados: { corto: 'Resultados',     icono: ChartColumn,       miembros: ['resultados', 'produccion', 'confiabilidad'] },
  reporte:    { corto: 'Reporte',        icono: FileCheck2,        miembros: ['regulatorio'] },
  configurar: { corto: 'Configurar',     icono: SlidersHorizontal, miembros: ['configuracion', 'filosofia', 'conectores'] },
}
/** Las puertas de cada rol, en su orden (experiencia v3, `flujos.md` §2): las que pasaron sus tareas
 *  medidas. Un rol con UNA sola puerta no lleva menú (oper, tec, reg y adm; §9.4): el panel sigue
 *  (el campo, la ayuda y la persona), sin lista de puertas. En el teléfono, el panel se abre con ☰
 *  y no hay barra abajo (decisión 4). Lo que un rol tiene y no cae en ninguna puerta (la
 *  configuración en solo lectura) va en el menú de la persona: nada se pierde. */
export const PUERTAS_DEL_ROL: Readonly<Record<string, readonly string[]>> = {
  ger: ['plantaViva', 'resultados'],
  prod: ['plantaViva', 'resultados'],
  sup: ['hoy', 'equipos'],
  oper: ['hoy'],
  jefe: ['hoy', 'equipos', 'resultados'],
  conf: ['equipos', 'resultados'],
  plan: ['hoy', 'equipos', 'resultados'],
  tec: ['hoy'],
  reg: ['reporte'],
  adm: ['configurar'],
}
/** ¿El rol lleva menú de puertas? Con una sola, no (flujos.md §2). */
export const conMenu = (rolId: string) => (PUERTAS_DEL_ROL[rolId] ?? []).length > 1
/** La puerta de una pantalla. */
export const grupoDe = (pantalla: string) => Object.keys(GRUPOS).find(g => GRUPOS[g]!.miembros.includes(pantalla))
/** Nombre de la puerta en el panel. */
export const nombreGrupo = (grupo: string, _pantallasDelRol?: string[]) => GRUPOS[grupo]!.corto
/** Las pantallas del rol que no caen en ninguna de sus puertas: van en el menú de la persona. */
export const fueraDePuertas = (rol: { id: string; pantallas: string[] }) => {
  const suyas = PUERTAS_DEL_ROL[rol.id] ?? []
  return rol.pantallas.filter(p => enElMenu(p) && !suyas.some(g => GRUPOS[g]!.miembros.includes(p)) && !(SOLO_A_UN_TOQUE[rol.id] ?? []).includes(p))
}
/** B3 · B-02: lo que un rol de una sola pantalla abre solo desde su tarjeta (el operador y el técnico, la ficha
 *  del equipo en Equipos): no va en el menú de la persona, que no es un segundo menú. */
const SOLO_A_UN_TOQUE: Readonly<Record<string, readonly string[]>> = { oper: ['equipos'], tec: ['equipos'] }
