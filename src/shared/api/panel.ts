import { useSesion, sesion, cambiarSesion } from './sesion'
import { useDato, versionDe } from './consulta'
import { FUENTE, pedirJson, ErrorApi, mensajeDe } from './fuente'
import { deRespuesta } from './cable'
import { INDICADORES_CATALOGO, PANEL, PANEL_SENALES, R_PANEL } from './contrato'
import {
  CATALOGO, MAX_ELEMENTOS, vistaPanel, senalesDisponibles, aceptarPanel,
  type Indicador, type VistaPanel, type ElementoVista, type ElementoPanel, type PanelGuardado, type SenalDisponible, type ValorIndicador, type IdIndicador,
} from '@/entities/indicadores'
import { rolExacto } from '@/entities/roles'
import { personaDelRol, camposAsignados } from '@/entities/usuarios'
import { AHORA } from '@/entities/reloj'

/** LA COSTURA DEL PANEL DE INDICADORES (Fase 7 de facilidades, pieza Núcleo).
 *
 *  - `GET /api/indicadores/catalogo`: el catálogo, con la fórmula y la fuente de cada indicador.
 *  - `GET /api/vistas/panel?rol=&campos=`: el panel de quien llama con el valor de cada elemento; sin panel
 *    guardado, el de ejemplo de su rol (`ejemplo: true`).
 *  - `GET /api/vistas/panel/senales?campos=`: las señales conectadas que se pueden poner en el panel.
 *  - `POST /api/paneles` `{ elementos }`: lo guarda entero quien tiene «Mi panel». 403 sin-pantalla,
 *    404 campo-ajeno, 422 panel-invalido.
 *
 *  En el demo este módulo ES el servidor: el panel vive en la sesión, uno por rol. */

export type { Indicador, VistaPanel, ElementoVista, ElementoPanel, SenalDisponible, ValorIndicador, IdIndicador }
export { MAX_ELEMENTOS, CATALOGO as CATALOGO_INDICADORES }

const NINGUNO: Readonly<Record<string, PanelGuardado>> = Object.freeze({})
const panelesDe = (s: { paneles?: Record<string, PanelGuardado> }) => s.paneles ?? NINGUNO

/** `GET /api/indicadores/catalogo`. */
export const useCatalogoIndicadores = (): readonly Indicador[] => useDato(INDICADORES_CATALOGO, {}, '1', () => [...CATALOGO])

/** `GET /api/vistas/panel`: la respuesta del demo, la misma regla que el backend. */
export const pedirPanel = (q: { rol: string; campos: string[] }, paneles: Readonly<Record<string, PanelGuardado>> | undefined): VistaPanel =>
  vistaPanel(q.rol, q.campos, (paneles ?? NINGUNO)[q.rol], sesion().ctx, AHORA.getTime())

export function usePanel(rol: string, campos: string[]): VistaPanel {
  const paneles = useSesion(panelesDe)
  return useDato(PANEL, { rol, campos }, String(versionDe(paneles)), () => pedirPanel({ rol, campos }, paneles))
}

/** `GET /api/vistas/panel/senales`. */
export const pedirSenales = (q: { campos: string[] }): SenalDisponible[] => senalesDisponibles(q.campos)
export const useSenalesDelPanel = (campos: string[]): SenalDisponible[] => useDato(PANEL_SENALES, { campos }, '1', () => pedirSenales({ campos }))

export type ResultadoPanel = { ok: true; panel: PanelGuardado } | { ok: false; error: string; estado?: number; codigo?: string }

const horaDelServidor = () => `${new Date(AHORA.getTime() - 5 * 3_600_000).toISOString().slice(0, 19)}-05:00`

/** `POST /api/paneles`. */
export async function guardarPanel(rolId: string, elementos: ElementoPanel[]): Promise<ResultadoPanel> {
  const guardar = (p: PanelGuardado) => cambiarSesion({ paneles: { ...panelesDe(sesion()), [rolId]: p } })
  if (FUENTE === 'http') {
    try {
      const r = deRespuesta(R_PANEL, await pedirJson('/paneles', undefined, { metodo: 'POST', cuerpo: { elementos }, cabeceras: { 'x-rol': rolId } }))
      guardar(r.panel)
      return { ok: true, panel: r.panel }
    } catch (e) {
      if (e instanceof ErrorApi) return { ok: false, estado: e.estado, ...(e.codigo ? { codigo: e.codigo } : {}), error: [403, 404, 422].includes(e.estado) ? e.message : `No se guardó: ${e.message}.` }
      return { ok: false, estado: 0, error: `No se guardó: ${mensajeDe(e)}.` }
    }
  }
  const rol = rolExacto(rolId), persona = personaDelRol(sesion().usuarios, rolId)
  const r = aceptarPanel({ elementos }, {
    ...(rol ? { rol: { id: rol.id, nombre: rol.nombre, pantallas: rol.pantallas } } : {}),
    ...(persona ? { persona: { nombre: persona.nombre } } : {}),
    campos: rol ? camposAsignados(rol, sesion().usuarios).map(x => x.id) : [],
  }, horaDelServidor())
  if (!r.ok) return r
  guardar(r.panel)
  return r
}
