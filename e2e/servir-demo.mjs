/* Levanta el demo tal como se entrega, para el proyecto «demo» de Playwright:
   construye (npm run build), lo arma con scripts/armar-demo.mjs en una
   carpeta temporal (el destino no puede quedar dentro del proyecto) y lo sirve
   con el servidor.mjs de esa carpeta en el puerto PUERTO.

   Se prueba lo construido y no `vite preview` porque lo que llega al cliente
   es el servidor del demo con sus cabeceras: una Content-Security-Policy que
   bloquee un trozo de la aplicación solo se ve así.

   Al recibir SIGTERM o SIGINT (Playwright al terminar) apaga el servidor y
   borra la carpeta temporal. */
import { spawn, spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const PUERTO = process.env.PUERTO ?? '4199'
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'

const construir = spawnSync(npm, ['run', 'build'], { cwd: RAIZ, stdio: 'inherit' })
if (construir.status !== 0) {
  console.error(`servir-demo: «npm run build» falló (${construir.status ?? construir.signal}): no hay demo que probar`)
  process.exit(1)
}

const temporal = mkdtempSync(join(tmpdir(), 'trim-e2e-demo-'))
const destino = join(temporal, 'demo')
const armar = spawnSync(process.execPath, [join(RAIZ, 'scripts/armar-demo.mjs'), destino], { cwd: RAIZ, stdio: 'inherit' })
if (armar.status !== 0) {
  rmSync(temporal, { recursive: true, force: true })
  console.error(`servir-demo: armar el demo falló (${armar.status ?? armar.signal})`)
  process.exit(1)
}

const servidor = spawn(process.execPath, [join(destino, 'servidor.mjs')], { stdio: 'inherit', env: { ...process.env, PUERTO } })
let saliendo = false
const salir = codigo => {
  if (saliendo) return
  saliendo = true
  if (servidor.exitCode === null) servidor.kill('SIGTERM')
  rmSync(temporal, { recursive: true, force: true })
  process.exit(codigo)
}
// Si el servidor se cae solo (puerto ocupado, error al arrancar), esto también
// termina: Playwright ve que el demo no está en vez de esperar a ciegas.
servidor.on('exit', (codigo, senal) => {
  if (!saliendo) console.error(`servir-demo: el servidor del demo terminó (${codigo ?? senal})`)
  salir(codigo ?? 1)
})
for (const s of ['SIGTERM', 'SIGINT']) process.on(s, () => salir(0))
