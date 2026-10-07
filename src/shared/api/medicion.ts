import { useCtx } from './sesion'
import { useDato, versionDe } from './consulta'
import { CAMPO_AHORA } from './contrato'
import { catalogoDelCampo, type MedicionOficial } from './catalogo'
import { NIVEL_AHORA } from '@/entities/pozos'
import { caudalesAhora } from '@/entities/diferido'
import type { Contexto } from '@/entities/causa-senal'
import { n0, n1 } from '@/shared/lib/formato'

export type { MedicionOficial }

/** Lo que dicen los instrumentos del campo fuera del libro: cómo se mide la
 *  producción oficial y la banda de asignación que acepta el regulador (del
 *  catálogo), y los caudales y el nivel de los tanques AHORA (una consulta,
 *  porque cambian a cada minuto). Ver la regla en diferidos.ts. */

/** `GET /api/catalogo` → `campos[campo].medicion`. */
export const pedirMedicionOficial = (campo: string): MedicionOficial => catalogoDelCampo(campo).medicion
export const useMedicionOficial = (campo: string): MedicionOficial => pedirMedicionOficial(campo)

/** La banda de asignación dicha para leer (Configuración · «Lo que no se
 *  configura»). Un °API que llega `null` es un análisis que falta: se dice, y
 *  nunca se pinta «crudo de 0,0 °API». Sin banda verificable, el ±% es solo la
 *  cota con la fila más ancha de la Fig. 10.2, no la banda del campo. */
export function textoBanda({ banda, metrologia: m }: Pick<MedicionOficial, 'banda' | 'metrologia'>): string {
  const pct = `±${n0(banda.valor * 100)} %`
  const api = !m ? 'el campo no tiene registro de metrología'
    : m.api === null ? `sin análisis de °API del crudo${m.apiFuente ? ` (${m.apiFuente})` : ''}`
      : `crudo de ${n1(m.api)} °API (${m.apiFuente})`
  return banda.verificable ? `${pct} · ${api}` : `sin verificar: ${api}; la tolerancia se acota con ${pct}`
}

/** Una lectura de nivel del transmisor de un tanque. */
export interface NivelTanque { tag: string; pct: number; hora: string }

export interface CampoAhora {
  /** Crudo y agua que el campo produce ahora, pozo por pozo (prueba vigente ×
   *  factor, sin los parados), bbl/d. */
  caudales: { crudo: number; agua: number }
  /** La última lectura de cada tanque de agua del campo, por id de tanque. Un
   *  tanque sin lectura no está: es un hueco, nunca un nivel supuesto. */
  niveles: Record<string, NivelTanque>
}

/** `GET /api/vistas/campos/:campo/ahora` (la respuesta del demo). */
export function pedirCampoAhora(campo: string, ctx: Contexto): CampoAhora {
  const niveles: Record<string, NivelTanque> = {}
  for (const t of ctx.config.tanques) if (t.campoId === campo && Object.hasOwn(NIVEL_AHORA, t.id)) niveles[t.id] = NIVEL_AHORA[t.id]!
  return { caudales: caudalesAhora(campo), niveles }
}
export function useCampoAhora(campo: string): CampoAhora {
  const ctx = useCtx()
  return useDato(CAMPO_AHORA, { campo }, `${versionDe(ctx)}`, () => pedirCampoAhora(campo, ctx))
}

/** El registro de pozos del campo (`GET /api/catalogo` → `campos[campo].pozos`):
 *  levantamiento, controlador, alimentador y el origen de sus pruebas. */
export const pedirPozosDelCampo = (campo: string) => catalogoDelCampo(campo).pozos
