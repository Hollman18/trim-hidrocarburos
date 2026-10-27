import type { PerfilBomba } from '@/entities/bombas'
import type { SenalNivel3 } from '@/shared/api/equiposTecnico'

/* La vista de cada bomba (`BombaVista`, `useBombas`) es un endpoint:
   `GET /api/vistas/bombas?campos=&desde=&hasta=`, en shared/api/equipos.ts. Aquí
   queda solo cómo se nombra para mostrar. */
export type { BombaVista } from '@/shared/api/equipos'

/** La familia, la misma en todas partes (P-09): «bomba de agua» o «bomba multifásica». */
export const tipoNombre = (p?: PerfilBomba) =>
  !p ? 'Sin perfil' : p.subtipo === 'multifasica' ? 'Bomba multifásica' : 'Bomba de agua'

/** F3 · Las señales del motor por su tag (`nivelEquipo`: escala fija, banda,
 *  alarma, gris y condición), para que una pantalla de grupo (Bombas, Pozos)
 *  pinte las suyas con la misma escala que el nivel 3 (X2 I1; H5 y H12). */
export const porTag = (v: { senales: readonly SenalNivel3[]; plegadas: readonly SenalNivel3[] } | undefined): Map<string, SenalNivel3> =>
  new Map([...(v?.senales ?? []), ...(v?.plegadas ?? [])].map(s => [s.tag, s]))
