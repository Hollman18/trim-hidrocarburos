import '@/index.css'
import { createRoot } from 'react-dom/client'
import { MuestraKit } from './MuestraKit'

/* La entrada de la muestra del kit (muestra.html), solo para desarrollo. */
createRoot(document.getElementById('muestra')!).render(<MuestraKit />)
