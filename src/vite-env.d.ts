/// <reference types="vite/client" />

/** Las variables del build que lee el front (ver .env.example). */
interface ImportMetaEnv {
  /** `http`: los datos del backend; sin definir o `demo`: los del demo. */
  readonly VITE_FUENTE?: string
  /** La raíz de la API del backend (con `http`). */
  readonly VITE_API_URL?: string
  /** Solo el demo: las piezas contratadas, separadas por comas (`shared/config/producto.ts`). */
  readonly VITE_PIEZAS?: string
  /** Solo el demo: `1` enciende el rol «Responsable de energía» (Fase 4 de facilidades, D3). */
  readonly VITE_ROL_ENERGIA?: string
}
interface ImportMeta { readonly env: ImportMetaEnv }
