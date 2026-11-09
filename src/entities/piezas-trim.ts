/** LAS PIEZAS DE TRIM (Fase 1 de docs/experiencia-v3/PROMPT-FACILIDADES-POR-FASES.md §3).
 *
 *  TRIM se arma como Lego: un Núcleo que todo cliente tiene y piezas que encajan
 *  encima (Equipos · Energía · Planta · Barriles · Mantenimiento). Cada cliente
 *  contrata las suyas (`Config.piezas`) y un campo puede tener otras
 *  (`ConfigCampo.piezas`). Lo que ve una persona = las piezas contratadas ∩ lo
 *  necesario de su rol (`roles/<rol>.md` §8).
 *
 *  - Sin `piezas` en la configuración, todo encendido: es lo de hoy.
 *  - El Núcleo va siempre, aunque no se escriba.
 *  - Una pieza que no se contrató no deja un hueco: su pantalla no se ofrece, su
 *    sección no sale y, si un rol se queda sin nada, la aplicación lo dice.
 *
 *  La frontera entre piezas: **los barriles en juego ahora** (lo que se deja de
 *  producir en este momento, por equipo o por tramo) son de Planta y de Equipos;
 *  **el libro** (lo producido, lo diferido y lo perdido de un período, por causa,
 *  y su publicación) es de Barriles; las órdenes, las fallas y la espera, de
 *  Mantenimiento.
 *
 *  Las piezas Energía y Planta todavía no tienen pantallas propias (fases 4 y 5):
 *  hoy las de Planta son el esquema y el agua. */
import type { Config } from './configuracion'
import type { SeccionResultados } from './resultados'
import type { TipoTarea } from './hoy'

export type PiezaTrim = 'nucleo' | 'equipos' | 'energia' | 'planta' | 'barriles' | 'mantenimiento'
export const PIEZAS_TRIM: readonly PiezaTrim[] = ['nucleo', 'equipos', 'energia', 'planta', 'barriles', 'mantenimiento']
export const NOMBRE_PIEZA: Record<PiezaTrim, string> = {
  nucleo: 'Núcleo', equipos: 'Equipos', energia: 'Energía', planta: 'Planta', barriles: 'Barriles', mantenimiento: 'Mantenimiento',
}
export const esPieza = (x: unknown): x is PiezaTrim => typeof x === 'string' && (PIEZAS_TRIM as readonly string[]).includes(x)
export const TODAS: ReadonlySet<PiezaTrim> = new Set(PIEZAS_TRIM)

const conNucleo = (xs: readonly string[]): ReadonlySet<PiezaTrim> => new Set<PiezaTrim>(['nucleo', ...xs.filter(esPieza)])

/** Las piezas de un campo: las suyas, o las del cliente, o todas. */
export function piezasDeCampo(c: Config, campoId: string): ReadonlySet<PiezaTrim> {
  const delCampo = c.campos[campoId]?.piezas
  if (delCampo) return conNucleo(delCampo)
  return c.piezas ? conNucleo(c.piezas) : TODAS
}

/** Las piezas que se ven con varios campos a la vez: las que tenga alguno. Sin
 *  campos, las de todos los campos de la configuración (el menú del cliente). */
export function piezasDe(c: Config, campos: readonly string[] = Object.keys(c.campos)): ReadonlySet<PiezaTrim> {
  if (!campos.length) return c.piezas ? conNucleo(c.piezas) : TODAS
  const s = new Set<PiezaTrim>()
  for (const id of campos) for (const p of piezasDeCampo(c, id)) s.add(p)
  return s
}

/** La pieza de cada pantalla. Una pantalla con varias se ofrece si el cliente
 *  tiene alguna: Resultados junta barriles y mantenimiento, y cada sección lleva
 *  la suya (`PIEZA_DE_SECCION`). */
export const PIEZA_DE_PANTALLA: Readonly<Record<string, readonly PiezaTrim[]>> = {
  hoy: ['nucleo'], perfil: ['nucleo'], configuracion: ['nucleo'], filosofia: ['nucleo'], conectores: ['nucleo'],
  // Fase 7: «Mi panel» es del Núcleo; cada indicador de una pieza no contratada dice «sin dato» y la nombra.
  panel: ['nucleo'],
  plantaViva: ['barriles', 'planta'],
  equipos: ['equipos'],
  resultados: ['barriles', 'mantenimiento'],
  produccion: ['barriles'], pozos: ['barriles'], regulatorio: ['barriles'],
  causa: ['barriles', 'mantenimiento'],
  planta: ['planta'], agua: ['planta'],
  confiabilidad: ['mantenimiento'],
}
export const pantallaContratada = (p: string, piezas: ReadonlySet<PiezaTrim>) =>
  (PIEZA_DE_PANTALLA[p] ?? ['nucleo']).some(x => piezas.has(x))

/** La pieza de cada sección de Resultados. */
export const PIEZA_DE_SECCION: Readonly<Record<SeccionResultados, PiezaTrim>> = {
  produccion: 'barriles', bajando: 'barriles', mesAMes: 'barriles', porEquipo: 'barriles', porCampo: 'barriles',
  publicar: 'barriles', dondeSeTrabo: 'barriles', dondeBajarlo: 'barriles', tipos: 'barriles', diaADia: 'barriles', ciclo: 'barriles',
  mantenimiento: 'mantenimiento', confiabilidad: 'mantenimiento',
}

/** Las piezas de cada tarea de Hoy: sale si el cliente tiene alguna. Decir la
 *  causa de una parada sirve al libro y al mantenimiento. */
export const PIEZA_DE_TAREA: Readonly<Record<TipoTarea, readonly PiezaTrim[]>> = {
  contestar: ['barriles', 'mantenimiento'], 'conseguir-causa': ['barriles', 'mantenimiento'],
  confirmar: ['barriles'], 'confirmar-apunta': ['barriles'], revisar: ['barriles'], precisar: ['barriles'],
  asignacion: ['barriles'], metas: ['barriles'],
  orden: ['mantenimiento'], analisis: ['mantenimiento'], planes: ['mantenimiento'],
  intervenir: ['equipos', 'mantenimiento'],
  aviso: ['nucleo'],
}

/** Los avisos que solo informan son de la pieza de lo que dicen: «lo más frágil» (el orden
 *  de cierre si para otra bomba) es de la planta; «no intervenir», de mantenimiento. */
const PIEZA_DE_AVISO: ReadonlyArray<[string, readonly PiezaTrim[]]> = [['aviso:fragil:', ['planta']], ['aviso:no-intervenir:', ['mantenimiento']]]
/** Las piezas de una tarea de Hoy: las de su tipo o, si es un aviso, las de lo que dice. */
export const piezasDeTarea = (t: { tipo: TipoTarea; id: string }): readonly PiezaTrim[] =>
  (t.tipo === 'aviso' ? PIEZA_DE_AVISO.find(([pre]) => t.id.startsWith(pre))?.[1] : undefined) ?? PIEZA_DE_TAREA[t.tipo]

/** Donde abre un rol: su inicio, si está contratado; si no, la primera de sus
 *  pantallas que sí lo esté (sin contar el perfil ni lo de configurar). `null`: el rol no tiene
 *  nada contratado, y la aplicación lo dice en vez de abrir una pantalla vacía. */
export function inicioContratado(rol: { inicio: string; pantallas: readonly string[] }, piezas: ReadonlySet<PiezaTrim>): string | null {
  if (pantallaContratada(rol.inicio, piezas)) return rol.inicio
  return rol.pantallas.find(p => !DE_CONFIGURAR.has(p) && pantallaContratada(p, piezas)) ?? null
}
/** Lo que no es un inicio de reemplazo: el perfil y lo de configurar. El gerente sin
 *  Barriles no aterriza en «Metas y accesos»: se le dice qué pieza falta. */
const DE_CONFIGURAR = new Set(['perfil', 'configuracion', 'filosofia', 'conectores'])

/** Las piezas que harían falta para abrir el inicio de un rol, para decirlo. */
export const piezasQueFaltan = (rol: { inicio: string }): PiezaTrim[] => [...(PIEZA_DE_PANTALLA[rol.inicio] ?? ['nucleo'])]

/** La firma: cada pieza escrita tiene que existir. */
export function validarPiezas(xs: unknown, donde: string): string[] {
  if (xs == null) return []
  if (!Array.isArray(xs)) return [`${donde}: las piezas tienen que ser una lista.`]
  return xs.filter(x => !esPieza(x)).map(x => `${donde}: «${String(x)}» no es una pieza de TRIM (son ${PIEZAS_TRIM.map(p => NOMBRE_PIEZA[p]).join(', ')}).`)
}
