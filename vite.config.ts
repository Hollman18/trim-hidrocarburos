import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, pathToFileURL, URL } from 'node:url'

/** Simulador de la API. NO es el backend ni el contrato entero: implementa
 *  solo el registro de la cadena de datos (salud, inventario, pendientes,
 *  procedencia, asociar un tag, inscripción y nacimiento del borde;
 *  `simulador-api/api.mjs`). No sirve las vistas calculadas (`/api/vistas/*`),
 *  ni los GET del arranque, ni las escrituras del contrato: con
 *  `VITE_FUENTE=http` contra él la aplicación no arranca (A9 de la revisión,
 *  pendiente; es trabajo de backend). Lo que un backend debe responder está en
 *  `referencia/` y se compara con `node scripts/referencia.mjs comparar
 *  --base-url=…`; `verificar-contrato --http` prueba el cliente contra un
 *  servidor de prueba dentro de su propio proceso, no contra este.
 *  Solo se monta en desarrollo; el build no lo incluye. */
const api = (): Plugin => ({
  name: 'trim-simulador-api',
  async configureServer(server) {
    const { arrancar, manejar } = await import(
      pathToFileURL(fileURLToPath(new URL('./simulador-api/api.mjs', import.meta.url))).href)
    arrancar()
    // manejar responde sus propios errores; el .catch es la última red: una
    // promesa rechazada sin manejar terminaría el proceso de Vite y con él el front.
    server.middlewares.use((req, res, next) => {
      manejar(req, res).then((atendida: boolean) => { if (!atendida) next() }, next)
    })
  },
})

/** Content-Security-Policy como <meta> en el index.html CONSTRUIDO, con la
 *  huella de cada script en línea calculada del HTML final (no copiada a
 *  mano). Solo en el build: en desarrollo Vite inyecta su propio script de
 *  recarga y estilos en línea, y una política estricta los bloquearía. La
 *  política es la misma que mandan como cabecera el demo y el simulador
 *  (demo/cabeceras.mjs); `frame-ancestors` solo vale en la cabecera. */
const politicaDeSeguridad = (origenApi?: string): Plugin => ({
  name: 'trim-csp',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',
    async handler(html) {
      const { politica } = await import(
        pathToFileURL(fileURLToPath(new URL('./demo/cabeceras.mjs', import.meta.url))).href)
      const meta = `<meta http-equiv="Content-Security-Policy" content="${politica(html, { meta: true, api: origenApi })}" />`
      // Antes de cualquier script: una política en <meta> solo cubre lo que viene después.
      // Sin el <meta charset> no hay dónde ponerla, y un build sin política no se entrega callado.
      if (!/<meta charset="[^"]*"\s*\/?>/i.test(html)) throw new Error('index.html sin <meta charset>: no hay dónde poner la Content-Security-Policy')
      return html.replace(/(<meta charset="[^"]*"\s*\/?>)/i, `$1\n    ${meta}`)
    },
  },
})

/** Con `VITE_FUENTE=http` y una `VITE_API_URL` ABSOLUTA (ver .env.example),
 *  en desarrollo `/api` va al backend de verdad por el proxy de Vite y el
 *  simulador no se monta, y la política del build deja hablar con ese origen:
 *  así se prueba el front contra el servidor sin tocar este archivo.
 *
 *  Una raíz RELATIVA (`/api`, que .env.example y fuente.ts permiten) es el
 *  mismo dominio del front: la política ya lo cubre con 'self' y no hay otro
 *  origen a dónde mandar el proxy, así que se trata como sin definir (antes
 *  `new URL('/api')` lanzaba y tumbaba el build y el desarrollo). Lo que no es
 *  ni una ni otra se rechaza diciendo qué se esperaba, no con «Invalid URL».
 *  Sin destino absoluto, el simulador atiende el registro de la cadena de datos. */
function destinoApi(env: Record<string, string | undefined>): { target: string; prefijo: string } | undefined {
  const raiz = env.VITE_API_URL?.trim()
  if (env.VITE_FUENTE !== 'http' || !raiz) return undefined
  // «//servidor/api» no es relativa: es otro dominio sin esquema, y la política
  // de seguridad (connect-src 'self') bloquearía cada pedido sin que el build lo diga.
  if (raiz.startsWith('//')) throw new Error(`VITE_API_URL=«${raiz}» no sirve: le falta el esquema. Escriba https:${raiz} (o http: si es local), o una ruta del mismo dominio como /api.`)
  if (raiz.startsWith('/')) return undefined
  const u = URL.canParse(raiz) ? new URL(raiz) : undefined
  if (u?.protocol !== 'http:' && u?.protocol !== 'https:')
    throw new Error(`VITE_API_URL=«${raiz}» no sirve: va absoluta con http(s) (http://servidor:8080/api) o relativa al dominio del front (/api).`)
  return { target: u.origin, prefijo: u.pathname.replace(/\/$/, '') }
}

export default defineConfig(({ mode }) => {
  const destino = destinoApi(loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), 'VITE_'))
  return {
    // La política deja hablar con el backend cuando está en otro dominio.
    plugins: [react(), tailwindcss(), ...(destino ? [] : [api()]), politicaDeSeguridad(destino?.target)],
    // La copia local del proyecto (.respaldos/) no es código: ni se vigila ni se
    // escanea buscando dependencias (Vite lee TODOS los .html de la raíz, y el de
    // la copia arrastraba su propio src/main.tsx).
    server: {
      watch: { ignored: ['**/.respaldos/**'] },
      // El navegador pide /api/… a este mismo origen; el proxy lo cambia por la
      // raíz del backend (`/api/vistas/x` → `${VITE_API_URL}/vistas/x`).
      ...(destino ? { proxy: { '/api': { target: destino.target, changeOrigin: true, rewrite: (p: string) => `${destino.prefijo}${p.slice('/api'.length)}` } } } : {}),
    },
    optimizeDeps: { entries: ['index.html'] },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    // Paquetes que cambian a ritmos distintos van aparte: React casi nunca, los
    // datos del demo cuando se regeneran, el código con cada cambio. Las
    // pantallas se cargan al abrirse (registro.tsx).
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
              { name: 'librerias', test: /node_modules/ },
              { name: 'datos', test: /src[\\/]entities[\\/]datos[\\/]/ },
              // La costura y el motor, juntos y aparte. Sueltos, el empaquetador
              // armaba con ellos un paquete común y le metía el auxiliar de
              // CommonJS que React necesita; ese paquete importa React, y con la
              // fuente http React lo importaba de vuelta: al cargar, el auxiliar
              // todavía no existía y la aplicación no arrancaba.
              { name: 'costura', test: /src[\\/](shared[\\/]api|entities)[\\/]/ },
            ],
          },
        },
      },
    },
  }
})
