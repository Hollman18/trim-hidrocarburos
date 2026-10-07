/* Servidor estático mínimo para ver el demo. Hace falta porque el navegador
   bloquea los módulos de JavaScript cuando la página se abre con doble clic
   (file://): no es un fallo de la aplicación, es una regla de seguridad del
   navegador. Sin dependencias: solo Node.

   Vive en el proyecto (demo/) para mantenerse con el código; el README dice
   cómo se copia al paquete junto a la aplicación construida. */
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cabecerasSeguridad } from './cabeceras.mjs'

const RAIZ = fileURLToPath(new URL('.', import.meta.url))
const PUERTO = Number(process.env.PUERTO ?? 4173)
// Solo este equipo: el demo se muestra en un portátil, a menudo en la red
// Wi-Fi de un cliente, y nadie más de esa red tiene por qué abrirlo.
const HOST = '127.0.0.1'
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.ttf': 'font/ttf', '.woff2': 'font/woff2',
}
// Lo único que se sirve: la aplicación construida. Ni este archivo, ni
// cabeceras.mjs, ni el lanzador .command.
const PERMITIDO = ['assets', 'brand', 'fonts']

const indice = await readFile(join(RAIZ, 'index.html'), 'utf8')
const SEGURIDAD_HTML = cabecerasSeguridad(indice)
const SEGURIDAD = cabecerasSeguridad()

const responder = (res, codigo, cuerpo, tipo, extra = SEGURIDAD) => {
  res.writeHead(codigo, { 'content-type': tipo, ...extra })
  res.end(cuerpo)
}
const pagina = res => responder(res, 200, indice, TIPOS['.html'], SEGURIDAD_HTML)

async function atender(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { responder(res, 405, 'método no permitido', 'text/plain; charset=utf-8'); return }
  let ruta
  // Un % mal formado («/%E0%A4%A») es un 400; antes lanzaba y apagaba el demo.
  try { ruta = decodeURIComponent((req.url ?? '/').split('?')[0]) }
  catch { responder(res, 400, 'ruta mal codificada', 'text/plain; charset=utf-8'); return }
  if (ruta === '/' || ruta === '/index.html') { pagina(res); return }
  // normalize corta los «../»: nadie sale de esta carpeta.
  const rel = normalize(ruta.slice(1))
  if (rel.startsWith('..') || !PERMITIDO.includes(rel.split(sep)[0])) {
    // Es una sola página con rutas en el hash: lo que no tiene extensión es la
    // página; un archivo fuera de la lista no existe para el demo.
    if (extname(rel)) responder(res, 404, 'no encontrado', 'text/plain; charset=utf-8')
    else pagina(res)
    return
  }
  let cuerpo
  try { cuerpo = await readFile(join(RAIZ, rel)) }
  catch (e) {
    if (e.code === 'ENOENT' || e.code === 'EISDIR') { responder(res, 404, 'no encontrado', 'text/plain; charset=utf-8'); return }
    throw e
  }
  responder(res, 200, cuerpo, TIPOS[extname(rel)] ?? 'application/octet-stream')
}

createServer((req, res) => {
  // Ninguna petición apaga el demo: lo inesperado se registra y se responde 500.
  atender(req, res).catch(e => {
    console.error(`  Error atendiendo ${req.method} ${req.url}:`, e)
    if (!res.headersSent) responder(res, 500, 'error interno', 'text/plain; charset=utf-8')
    else res.end()
  })
}).listen(PUERTO, HOST, () => {
  console.log(`\n  Trim · Hidrocarburos\n  Abra  http://127.0.0.1:${PUERTO}\n`)
  console.log('  Para cerrar el demo: Control + C\n')
})
