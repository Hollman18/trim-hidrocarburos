import { useApp } from '@/app/store'
import { clasificarParada, declararYacimientoAnh, confirmarParadasAnh, type Credencial } from '@/shared/api/escrituras'
import type { CuerpoClasificacion, CuerpoConfirmacion, CuerpoYacimiento } from '@/shared/api/contrato'

/** Las tres escrituras del árbol de paradas (Circular 024) con el rol que se
 *  está viendo (en producción, el del token), la misma regla del estado de la
 *  aplicación (`quien()` en app/store.ts, que todavía no las tiene). Responden
 *  `{ ok: true, … }` o `{ ok: false, error }` con las palabras del servidor:
 *  el 403 (no le toca), el 409 (otro cambió la parada mientras la miraba) y el
 *  422 (incoherente) se dicen tal cual en la pantalla. */
const quien = (): Credencial => ({ rolId: useApp.getState().rolId })

/** `POST /api/anh/paradas/:id/clasificacion` */
export const clasificar = (id: string, c: CuerpoClasificacion) => clasificarParada(quien(), id, c)
/** `POST /api/anh/paradas/:id/yacimiento` */
export const ponerYacimiento = (id: string, c: CuerpoYacimiento) => declararYacimientoAnh(quien(), id, c)
/** `POST /api/anh/paradas/confirmar` (una sola, o varias en lote) */
export const confirmar = (c: CuerpoConfirmacion) => confirmarParadasAnh(quien(), c)
