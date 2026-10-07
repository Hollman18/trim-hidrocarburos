/* Arma la carpeta del demo: la aplicación construida (dist/) más el servidor
 * estático y su lanzador (demo/). Es lo que va en el paquete como «4-demo».
 *
 *   npm run build && npm run demo -- <carpeta-destino>
 *
 * Si la carpeta ya es un demo (tiene servidor.mjs e index.html) se vacía
 * antes, para que no queden los assets con hash del build anterior. Si
 * existe y es otra cosa, no se toca.
 */
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, mkdirSync, statSync, chmodSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const DIST = join(RAIZ, 'dist')
const destino = process.argv[2] && resolve(process.argv[2])
if (!destino) { console.error('uso: npm run demo -- <carpeta-destino>'); process.exit(2) }
if (!existsSync(join(DIST, 'index.html'))) { console.error('no hay dist/index.html: corra antes «npm run build»'); process.exit(1) }
// El demo se sirve con la política de seguridad que puso el build: sin ella
// es un build viejo o de otra configuración.
if (!readFileSync(join(DIST, 'index.html'), 'utf8').includes('http-equiv="Content-Security-Policy"')) {
  console.error('dist/index.html no trae la Content-Security-Policy: vuelva a construir con «npm run build»'); process.exit(1)
}
if ((destino + sep).startsWith(resolve(RAIZ) + sep)) { console.error('el destino no puede quedar dentro del proyecto'); process.exit(1) }

if (existsSync(destino)) {
  if (!statSync(destino).isDirectory()) { console.error(`${destino} no es una carpeta`); process.exit(1) }
  const hay = readdirSync(destino).filter(f => f !== '.DS_Store')
  const esDemo = hay.includes('servidor.mjs') && hay.includes('index.html')
  if (hay.length && !esDemo) { console.error(`${destino} tiene otras cosas y no parece un demo: no se toca`); process.exit(1) }
  for (const f of hay) rmSync(join(destino, f), { recursive: true })
}
mkdirSync(destino, { recursive: true })
cpSync(DIST, destino, { recursive: true })
for (const f of ['servidor.mjs', 'cabeceras.mjs', 'abrir-demo.command']) cpSync(join(RAIZ, 'demo', f), join(destino, f))
chmodSync(join(destino, 'abrir-demo.command'), 0o755)
console.log(`demo armado en ${destino}: ${readdirSync(destino).length} entradas (abrir con abrir-demo.command)`)
