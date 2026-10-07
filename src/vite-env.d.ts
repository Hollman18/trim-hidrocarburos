/// <reference types="vite/client" />

/** Las variables del build que lee el front (ver .env.example). */
interface ImportMetaEnv {
  /** `http`: los datos del backend; sin definir o `demo`: los del demo. */
  readonly VITE_FUENTE?: string
  /** La raíz de la API del backend (con `http`). */
  readonly VITE_API_URL?: string
}
interface ImportMeta { readonly env: ImportMetaEnv }
