import './index.css'
import { prepararFuente } from '@/shared/api/fuente'

/** Primero la fuente de los datos, después la aplicación: el estado y las
 *  pantallas se cargan cuando los insumos ya están (con import dinámico, para
 *  que nada los evalúe antes). Si algo falla aquí, se dice en la página y en
 *  la consola: una pantalla en blanco no le dice nada a nadie. */
prepararFuente()
  .then(() => import('./arranque'))
  .then(({ arrancar }) => arrancar())
  .catch((e: unknown) => {
    const raiz = document.getElementById('root')
    if (raiz) {
      raiz.textContent = ''
      const p = document.createElement('p')
      p.style.cssText = 'margin:2rem;font:14px/1.5 system-ui,sans-serif;max-width:60ch'
      p.textContent = `TRIM no pudo arrancar: ${e instanceof Error ? e.message : String(e)}`
      raiz.append(p)
    }
    console.error(e)
  })
