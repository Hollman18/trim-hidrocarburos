import { useCtx, useVersiones } from './sesion'
import { useDato, versionDe } from './consulta'
import { LISTA_EQUIPOS, NIVEL_EQUIPO } from './contrato'
import {
  listaEquipos, nivelEquipo, resumenPlegadas,
  TIPOS_EQUIPO, NOMBRE_TIPO, TRENES, NOMBRE_TREN, FILTROS_ESTADO, NOMBRE_FILTRO, PALABRA_CONDICION, VARIABLES_CLAVE, SENALES_ABIERTAS,
  type TipoEquipo, type TrenEquipo, type FiltroEstado, type CifraFila, type FilaEquipoTecnico, type AciertoVigia, type VistaEquipos,
  type SenalNivel3, type DiscretaNivel3, type TendenciaNivel3, type EsquemaAgua, type MientrasParada, type HistoriaNivel3,
  type RepuestoNivel3, type VistaNivel3,
} from '@/entities/equipos-tecnico'
import type { Versiones } from '@/entities/diferido'
export type { CondicionFranja } from '@/entities/condiciones'
import type { Contexto } from '@/entities/causa-senal'

/** C4 · LA COSTURA DE EQUIPOS Y DEL NIVEL TÉCNICO (X4 §3.6 y §5).
 *
 *  `GET /api/vistas/lista-equipos?campos=`: todos los equipos de los campos en una
 *  lista, ordenada por estado y por «Si falla hoy», con sus filtros.
 *  `GET /api/vistas/equipos/:campo/:equipo/tecnico`: el nivel 3 de un equipo.
 *  El servidor corre `listaEquipos` y `nivelEquipo` (entities/equipos-tecnico.ts)
 *  con la configuración firmada y su historial; en el demo responde el motor en el
 *  navegador con la sesión. Las pantallas leen `useListaEquipos` y `useNivelEquipo`;
 *  nadie en pages/widgets llama `pedir*`. Las palabras se reexportan aquí para que
 *  las pantallas no importen el motor. */

export { TIPOS_EQUIPO, NOMBRE_TIPO, TRENES, NOMBRE_TREN, FILTROS_ESTADO, NOMBRE_FILTRO, PALABRA_CONDICION, VARIABLES_CLAVE, SENALES_ABIERTAS, resumenPlegadas }
export type {
  TipoEquipo, TrenEquipo, FiltroEstado, CifraFila, FilaEquipoTecnico, AciertoVigia, VistaEquipos,
  SenalNivel3, DiscretaNivel3, TendenciaNivel3, EsquemaAgua, MientrasParada, HistoriaNivel3, RepuestoNivel3, VistaNivel3,
}

/** `GET /api/vistas/lista-equipos?campos=`: la respuesta del demo. */
export const pedirListaEquipos = (campos: string[], ctx: Contexto, versiones?: Versiones): VistaEquipos => listaEquipos(campos, ctx, versiones)
/** La lista de Equipos de los campos que se miran. */
export function useListaEquipos(campos: string[]): VistaEquipos {
  const ctx = useCtx(), versiones = useVersiones()
  return useDato(LISTA_EQUIPOS, { campos }, `${versionDe(ctx)}.${versionDe(versiones)}`, () => pedirListaEquipos(campos, ctx, versiones))
}

/** `GET /api/vistas/equipos/:campo/:equipo/tecnico`: la respuesta del demo. */
export const pedirNivelEquipo = (campo: string, equipo: string, ctx: Contexto, versiones?: Versiones): VistaNivel3 | undefined =>
  nivelEquipo(campo, equipo, ctx, versiones)
/** El nivel 3 de un equipo en su campo; undefined si el campo no lo tiene. */
export function useNivelEquipo(campo: string, equipo: string): VistaNivel3 | undefined {
  const ctx = useCtx(), versiones = useVersiones()
  return useDato(NIVEL_EQUIPO, { campo, equipo }, `${versionDe(ctx)}.${versionDe(versiones)}`, () => pedirNivelEquipo(campo, equipo, ctx, versiones))
}
