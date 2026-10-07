import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { iniciarApp } from '@/app/store'

/** Monta la aplicación. Lo llama main.tsx cuando la fuente de los datos ya
 *  está lista: los oyentes del navegador (impresión, tema, dirección) se
 *  registran aquí, una vez, y no al cargar el estado. */
export function arrancar(): void {
  iniciarApp()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
