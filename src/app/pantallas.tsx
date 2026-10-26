import type { ComponentType } from 'react'
import { pantalla } from '@/shared/lib/carga'
import {
  Gauge, Network, TriangleAlert, MessageSquareText, Wrench,
  Droplets, Activity, Scale, FileCheck2, SlidersHorizontal, UserRound, Plug,
  TrendingUp, CircleDot, ClipboardCheck, Hammer, Scale3d, Fan, Zap,
  ListChecks, ChartColumn, LayoutDashboard,
} from 'lucide-react'
import { IconoPlanta } from '@/shared/brand/Logo'

const Resumen = pantalla(() => import('@/pages/Resumen'), 'Resumen')
const Diferidos = pantalla(() => import('@/pages/Diferidos'), 'Diferidos')
const Riesgo = pantalla(() => import('@/pages/Riesgo'), 'Riesgo')
const Perfil = pantalla(() => import('@/pages/Perfil'), 'Perfil')
const Planta = pantalla(() => import('@/pages/Planta'), 'Planta')
const Configuracion = pantalla(() => import('@/pages/Configuracion'), 'Configuracion')
const Conectores = pantalla(() => import('@/pages/Conectores'), 'Conectores')
const Agua = pantalla(() => import('@/pages/Agua'), 'Agua')
const Produccion = pantalla(() => import('@/pages/Produccion'), 'Produccion')
const Pozos = pantalla(() => import('@/pages/Pozos'), 'Pozos')
const Turno = pantalla(() => import('@/pages/Turno'), 'Turno')
const Trabajo = pantalla(() => import('@/pages/Trabajo'), 'Trabajo')
const Mantenimiento = pantalla(() => import('@/pages/Mantenimiento'), 'Mantenimiento')
const Causa = pantalla(() => import('@/pages/Causa'), 'Causa')
// C4 · «Superficie» se fundió en Equipos (X4 §3.6): su dirección abre Equipos con el filtro de servicios y proceso.
const Equipo = pantalla(() => import('@/pages/Equipos'), 'EquiposDeSuperficie')
const Confiabilidad = pantalla(() => import('@/pages/Confiabilidad'), 'Confiabilidad')
const Evidencia = pantalla(() => import('@/pages/Evidencia'), 'Evidencia')
const Regulatorio = pantalla(() => import('@/pages/Regulatorio'), 'Regulatorio')
const Bombas = pantalla(() => import('@/pages/Bombas'), 'Bombas')
const Esp = pantalla(() => import('@/pages/Esp'), 'Esp')
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
}

/** Qué pantalla entra en el primer producto NO se decide aquí: se decide en
 *  `PANTALLAS_V2` de shared/config/producto.ts, que es lo que filtran el riel y el
 *  onboarding. Tener el alcance en dos sitios fue un error: el registro
 *  marcaba como v2 pantallas que el MVP sí usa. */
export const PANTALLAS: Record<string, Pantalla> = {
  // La experiencia v2: la vista del gerente se llama «La planta viva» (lo decidió el dueño).
  plantaViva:   { corto: 'La planta viva', titulo: 'La planta viva',             ruta: 'planta-viva', agrega: true, ahora: true, sinExportar: true, icono: IconoPlanta, Vista: PlantaViva },
  hoy:          { corto: 'Hoy',           titulo: 'Hoy',                         ruta: 'hoy', agrega: true, ahora: true, sinExportar: true, icono: ListChecks,         Vista: Hoy },
  equipos:      { corto: 'Equipos',       titulo: 'Equipos',                     ruta: 'equipos', agrega: true, ahora: true, icono: Gauge,              Vista: Equipos },
  resultados:   { corto: 'Resultados',    titulo: 'Resultados',                  ruta: 'resultados', agrega: true,                      icono: ChartColumn,        Vista: Resultados },
  bombas:       { corto: 'Bombas',        titulo: 'Bombas de la línea', ruta: 'bombas', agrega: true, icono: Fan,                Vista: Bombas },
  esp:          { corto: 'Electrosumergibles', titulo: 'Electrosumergibles', ruta: 'esp', agrega: true, icono: Zap,               Vista: Esp },
  produccion:   { corto: 'Producción',    titulo: 'Producción contra plan',      ruta: 'produccion', agrega: true,   icono: TrendingUp,         Vista: Produccion },
  pozos:        { corto: 'Pozos',         titulo: 'Pozos',                       ruta: 'pozos', agrega: true,        icono: CircleDot,          Vista: Pozos },
  turno:        { corto: 'Turno',         titulo: 'Entrega de turno',            ruta: 'turno', ahora: true, agrega: true,        icono: ClipboardCheck,     Vista: Turno },
  trabajo:      { corto: 'Mi trabajo',    titulo: 'Mi trabajo de hoy',           ruta: 'trabajo', ahora: true,                    icono: Hammer,             Vista: Trabajo },
  mantenimiento:{ corto: 'Mantenimiento', titulo: 'Mantenimiento: lo que hay que atacar',    ruta: 'mantenimiento', agrega: true, icono: Scale3d,            Vista: Mantenimiento },
  resumen:      { corto: 'Resumen',       titulo: 'Resumen del activo',          ruta: 'resumen', agrega: true,                         icono: Gauge,              Vista: Resumen },
  diferidos:    { corto: 'Diferidos',     titulo: 'Libro de diferidos',          ruta: 'diferidos', agrega: true,                       icono: Activity,           Vista: Diferidos },
  // C5: Riesgo ya no lee el período (sin el bloque del ciclo): es «ahora» (X4 §3.1, regla 8).
  riesgo:       { corto: 'Riesgo',        titulo: 'Qué está en riesgo',          ruta: 'riesgo', agrega: true, ahora: true,             icono: TriangleAlert,      Vista: Riesgo },
  perfil:       { corto: 'Mi perfil',     titulo: 'Mi perfil',                   ruta: 'perfil', ahora: true,                          icono: UserRound,          Vista: Perfil },
  planta:       { corto: 'Planta',        titulo: 'Planta',                      ruta: 'planta',                          icono: Network,            Vista: Planta },
  causa:        { corto: 'Identificar',   titulo: 'Paradas por identificar',     ruta: 'causa', agrega: true,             icono: MessageSquareText,  Vista: Causa },
  equipo:       { corto: 'Servicios y proceso', titulo: 'Equipos',                ruta: 'equipo', agrega: true, ahora: true,             icono: Wrench,             Vista: Equipo },
  agua:         { corto: 'Agua',          titulo: 'Agua y almacenamiento',       ruta: 'agua',                            icono: Droplets,           Vista: Agua },
  confiabilidad:{ corto: 'Confiabilidad', titulo: 'Confiabilidad',               ruta: 'confiabilidad', agrega: true,                   icono: Activity,           Vista: Confiabilidad },
  evidencia:    { corto: 'Evidencia',     titulo: 'Evidencia de parada',         ruta: 'evidencia', agrega: true,                       icono: Scale,              Vista: Evidencia },
  regulatorio:  { corto: 'Regulatorio',   titulo: 'Reporte al regulador',        ruta: 'regulatorio',                     icono: FileCheck2,         Vista: Regulatorio },
  configuracion:{ corto: 'Configuración', titulo: 'Metas, accesos y configuración', ruta: 'configuracion',                  icono: SlidersHorizontal,  Vista: Configuracion },
  // La misma vista que Configuración, abierta en la filosofía operacional: así el
  // enlace la conserva y el borrador no se pierde al pasar de una a otra.
  filosofia:    { corto: 'Filosofía operacional', titulo: 'Filosofía operacional', ruta: 'filosofia',                    icono: SlidersHorizontal,  Vista: Configuracion },
  conectores:   { corto: 'Conectores',    titulo: 'Conectores y tags del campo', ruta: 'conectores', ahora: true,                      icono: Plug,               Vista: Conectores },
}

/** Pantallas que viven DENTRO de otra: tienen dirección propia, pero en el
 *  menú y en la introducción va la de afuera (la filosofía operacional es una
 *  pestaña de Configuración con su propio enlace). */
export const DENTRO_DE: Readonly<Record<string, string>> = { filosofia: 'configuracion', equipo: 'equipos' }
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
  hoy:        { corto: 'Hoy',            icono: ListChecks,        miembros: ['hoy', 'causa', 'turno', 'trabajo'] },
  // C5: el Resumen del gerente ya no se ofrece (cada panel tiene su lugar: X4 §3.7); su dirección abre La planta viva.
  plantaViva: { corto: 'La planta viva', icono: IconoPlanta,       miembros: ['plantaViva', 'planta', 'agua', 'riesgo'] },
  equipos:    { corto: 'Equipos',        icono: Gauge,             miembros: ['equipos', 'bombas', 'esp', 'pozos', 'equipo'] },
  resultados: { corto: 'Resultados',     icono: ChartColumn,       miembros: ['resultados', 'diferidos', 'produccion', 'confiabilidad', 'mantenimiento'] },
  reporte:    { corto: 'Reporte',        icono: FileCheck2,        miembros: ['regulatorio'] },
  configurar: { corto: 'Configurar',     icono: SlidersHorizontal, miembros: ['configuracion', 'filosofia', 'conectores'] },
  paradas:    { corto: 'Paradas y evidencia', icono: LayoutDashboard, miembros: ['evidencia'] },
}
/** Las puertas de cada rol, en su orden (CONSTRUCCION.md, «Las puertas»): Hoy ·
 *  La planta viva · Equipos · Resultados, y las propias de regulatorio, del
 *  administrador y de abastecimiento. Lo que un rol tiene y no cae en ninguna de
 *  sus puertas (las metas del gerente, la configuración en solo lectura) va en
 *  el menú de la persona: nada se pierde. */
export const PUERTAS_DEL_ROL: Readonly<Record<string, readonly string[]>> = {
  ger: ['plantaViva', 'equipos', 'resultados'],
  prod: ['hoy', 'plantaViva', 'equipos', 'resultados'],
  sup: ['hoy', 'plantaViva', 'equipos'],
  oper: ['hoy', 'plantaViva', 'equipos'],
  jefe: ['hoy', 'plantaViva', 'equipos', 'resultados'],
  conf: ['hoy', 'plantaViva', 'equipos', 'resultados'],
  plan: ['hoy', 'equipos', 'resultados'],
  tec: ['hoy', 'plantaViva', 'equipos'],
  reg: ['reporte', 'plantaViva', 'resultados'],
  adm: ['configurar', 'plantaViva'],
  cont: ['paradas'],
}
/** La puerta de una pantalla. */
export const grupoDe = (pantalla: string) => Object.keys(GRUPOS).find(g => GRUPOS[g]!.miembros.includes(pantalla))
/** Nombre de la puerta en el panel. */
export const nombreGrupo = (grupo: string, _pantallasDelRol?: string[]) => GRUPOS[grupo]!.corto
/** Las pantallas del rol que no caen en ninguna de sus puertas: van en el menú de la persona. */
export const fueraDePuertas = (rol: { id: string; pantallas: string[] }) => {
  const suyas = PUERTAS_DEL_ROL[rol.id] ?? []
  return rol.pantallas.filter(p => enElMenu(p) && !suyas.some(g => GRUPOS[g]!.miembros.includes(p)))
}
