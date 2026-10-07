import type { PerfilBomba } from '@/entities/bombas'

/* La vista de cada bomba (`BombaVista`, `useBombas`) es un endpoint:
   `GET /api/vistas/bombas?campos=&desde=&hasta=`, en shared/api/equipos.ts. Aquí
   queda solo cómo se nombra para mostrar. */
export type { BombaVista } from '@/shared/api/equipos'

export const tipoNombre = (p?: PerfilBomba) =>
  !p ? 'Sin perfil' : p.subtipo === 'multifasica' ? 'Multifásica' : 'Reinyección'
