/** Simulador autónomo · NO es el backend de producción. En desarrollo el mismo `manejar` lo monta Vite sobre
 *  su propio puerto; aquí corre solo, sirviendo también el front construido. */
import { createServer } from 'node:http'
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { arrancar, manejar } from './api.mjs'
import { cabecerasSeguridad } from '../demo/cabeceras.mjs'

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const TIPO = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf', '.woff2': 'font/woff2',
}

/** Sirve el front construido en el MISMO origen que la API: así no hay CORS
 *  ni proxy, y la aplicación funciona con un solo proceso. */
function estatico(req, res) {
  if (!existsSync(dist)) return false
  let ruta
  // Un % mal formado es un 400; antes lanzaba y apagaba el proceso.
  try { ruta = decodeURIComponent(new URL(req.url, 'http://local').pathname) }
  catch { res.writeHead(400, cabecerasSeguridad()); res.end(); return true }
  let archivo = join(dist, normalize(ruta))
  if (archivo !== dist && !archivo.startsWith(dist + sep)) { res.writeHead(403, cabecerasSeguridad()); res.end(); return true }
  if (!existsSync(archivo) || statSync(archivo).isDirectory()) archivo = join(dist, 'index.html')
  if (!existsSync(archivo)) return false
  const tipo = TIPO[extname(archivo)] ?? 'application/octet-stream'
  if (extname(archivo) === '.html') {
    // La página lleva la política con las huellas de SUS scripts en línea.
    const html = readFileSync(archivo, 'utf8')
    res.writeHead(200, { 'content-type': tipo, ...cabecerasSeguridad(html) })
    res.end(html)
    return true
  }
  res.writeHead(200, { 'content-type': tipo, ...cabecerasSeguridad() })
  createReadStream(archivo).pipe(res)
  return true
}

arrancar()
const puerto = Number(process.env.PUERTO ?? 8787)
// Solo este equipo, salvo que se pida otra interfaz a propósito: el atajo de
// desarrollo `x-capacidades` lo acepta de cualquiera que llegue.
const host = process.env.HOST ?? '127.0.0.1'
createServer((req, res) => {
  // manejar no rechaza (responde sus errores); esto es la red de seguridad
  // para lo estático: ninguna petición termina el proceso.
  (async () => {
    if (await manejar(req, res)) return
    if (estatico(req, res)) return
    res.writeHead(404, cabecerasSeguridad()); res.end()
  })().catch(e => {
    console.error(`[simulador] ${req.method} ${req.url}:`, e)
    if (!res.headersSent) res.writeHead(500, cabecerasSeguridad())
    res.end()
  })
}).listen(puerto, host, () => console.log(`trim en http://${host}:${puerto}`))
