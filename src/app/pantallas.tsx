import type { ComponentType } from 'react'
import { pantalla } from '@/shared/lib/carga'
import {
  Gauge, Network, TriangleAlert, MessageSquareText, Wrench,
  Droplets, Activity, Scale, FileCheck2, SlidersHorizontal, UserRound, Plug,
  TrendingUp, CircleDot, ClipboardCheck, Hammer, Scale3d, Fan, Zap, Boxes,
} from 'lucide-react'

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
const Equipo = pantalla(() => import('@/pages/Equipo'), 'Equipo')
const Confiabilidad = pantalla(() => import('@/pages/Confiabilidad'), 'Confiabilidad')
const Evidencia = pantalla(() => import('@/pages/Evidencia'), 'Evidencia')
const Regulatorio = pantalla(() => import('@/pages/Regulatorio'), 'Regulatorio')
const Bombas = pantalla(() => import('@/pages/Bombas'), 'Bombas')
const Esp = pantalla(() => import('@/pages/Esp'), 'Esp')

export interface Pantalla {
  corto: string
  titulo: string
  ruta: string
  icono: ComponentType<{ className?: string }>
  Vista: ComponentType
  /** Si tiene sentido verla con todos los campos a la vez. El esquema de
   *  planta o el tren de agua son de UN campo; los barriles se suman. */
  agrega?: boolean
}

/** Qué pantalla entra en el primer producto NO se decide aquí: se decide en
 *  `PANTALLAS_V2` de shared/config/producto.ts, que es lo que filtran el riel y el
 *  onboarding. Tener el alcance en dos sitios fue un error: el registro
 *  marcaba como v2 pantallas que el MVP sí usa. */
export const PANTALLAS: Record<string, Pantalla> = {
  bombas:       { corto: 'Bombas',        titulo: 'Bombas de la línea', ruta: 'bombas', agrega: true, icono: Fan,                Vista: Bombas },
  esp:          { corto: 'Electrosumergibles', titulo: 'Electrosumergibles', ruta: 'esp', agrega: true, icono: Zap,               Vista: Esp },
  produccion:   { corto: 'Producción',    titulo: 'Producción contra plan',      ruta: 'produccion', agrega: true,   icono: TrendingUp,         Vista: Produccion },
  pozos:        { corto: 'Pozos',         titulo: 'Pozos',                       ruta: 'pozos', agrega: true,        icono: CircleDot,          Vista: Pozos },
  turno:        { corto: 'Turno',         titulo: 'Entrega de turno',            ruta: 'turno', agrega: true,        icono: ClipboardCheck,     Vista: Turno },
  trabajo:      { corto: 'Mi trabajo',    titulo: 'Mi trabajo de hoy',           ruta: 'trabajo',                    icono: Hammer,             Vista: Trabajo },
  mantenimiento:{ corto: 'Mantenimiento', titulo: 'Mantenimiento: lo que hay que atacar',    ruta: 'mantenimiento', agrega: true, icono: Scale3d,            Vista: Mantenimiento },
  resumen:      { corto: 'Resumen',       titulo: 'Resumen del activo',          ruta: 'resumen', agrega: true,                         icono: Gauge,              Vista: Resumen },
  diferidos:    { corto: 'Diferidos',     titulo: 'Libro de diferidos',          ruta: 'diferidos', agrega: true,                       icono: Activity,           Vista: Diferidos },
  riesgo:       { corto: 'Riesgo',        titulo: 'Qué está en riesgo',          ruta: 'riesgo', agrega: true,                          icono: TriangleAlert,      Vista: Riesgo },
  perfil:       { corto: 'Mi perfil',     titulo: 'Mi perfil',                   ruta: 'perfil',                          icono: UserRound,          Vista: Perfil },
  planta:       { corto: 'Planta',        titulo: 'Planta',                      ruta: 'planta',                          icono: Network,            Vista: Planta },
  causa:        { corto: 'Identificar',   titulo: 'Paradas por identificar',     ruta: 'causa', agrega: true,             icono: MessageSquareText,  Vista: Causa },
  equipo:       { corto: 'Superficie',    titulo: 'Equipos de superficie',          ruta: 'equipo', agrega: true,                          icono: Wrench,             Vista: Equipo },
  agua:         { corto: 'Agua',          titulo: 'Agua y almacenamiento',       ruta: 'agua',                            icono: Droplets,           Vista: Agua },
  confiabilidad:{ corto: 'Confiabilidad', titulo: 'Confiabilidad',               ruta: 'confiabilidad', agrega: true,                   icono: Activity,           Vista: Confiabilidad },
  evidencia:    { corto: 'Evidencia',     titulo: 'Evidencia de parada',         ruta: 'evidencia', agrega: true,                       icono: Scale,              Vista: Evidencia },
  regulatorio:  { corto: 'Regulatorio',   titulo: 'Reporte al regulador',        ruta: 'regulatorio',                     icono: FileCheck2,         Vista: Regulatorio },
  configuracion:{ corto: 'Configuración', titulo: 'Metas, accesos y configuración', ruta: 'configuracion',                  icono: SlidersHorizontal,  Vista: Configuracion },
  // La misma vista que Configuración, abierta en la filosofía operacional: así el
  // enlace la conserva y el borrador no se pierde al pasar de una a otra.
  filosofia:    { corto: 'Filosofía operacional', titulo: 'Filosofía operacional', ruta: 'filosofia',                    icono: SlidersHorizontal,  Vista: Configuracion },
  conectores:   { corto: 'Conectores',    titulo: 'Conectores y tags del campo', ruta: 'conectores',                      icono: Plug,               Vista: Conectores },
}

/** Pantallas que viven DENTRO de otra: tienen dirección propia, pero en el
 *  menú y en la introducción va la de afuera (la filosofía operacional es una
 *  pestaña de Configuración con su propio enlace). */
export const DENTRO_DE: Readonly<Record<string, string>> = { filosofia: 'configuracion' }
/** ¿Va como entrada propia en el menú y en la introducción? */
export const enElMenu = (id: string) => !Object.hasOwn(DENTRO_DE, id)
/** La entrada del menú que se marca para una pantalla: ella misma, o la de afuera. */
export const entradaDe = (id: string) => (Object.hasOwn(DENTRO_DE, id) ? DENTRO_DE[id]! : id)

/** Pantallas que en el menú van juntas, como subpantallas de una sola. Cada
 *  subpantalla aparece si el rol la tiene y el campo tiene ese tipo de equipo
 *  (perfil firmado). Siguen siendo pantallas con su dirección propia: los
 *  enlaces de antes funcionan igual. */
export const GRUPOS: Record<string, { corto: string; icono: ComponentType<{ className?: string }>; miembros: string[] }> = {
  // El orden de las pestañas es uno para todos; cada rol abre en la suya.
  equipos: { corto: 'Pozos y equipos', icono: Boxes, miembros: ['bombas', 'esp', 'pozos'] },
}
export const grupoDe = (pantalla: string) => Object.keys(GRUPOS).find(g => GRUPOS[g]!.miembros.includes(pantalla))
/** Nombre del grupo en el menú: «Equipos» para quien no ve pozos. */
export const nombreGrupo = (grupo: string, pantallasDelRol: string[]) =>
  grupo === 'equipos' && !pantallasDelRol.includes('pozos') ? 'Equipos' : GRUPOS[grupo]!.corto
