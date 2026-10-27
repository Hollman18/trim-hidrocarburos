/* El build con VITE_FUENTE=http servido como lo serviría un despliegue: estático con las
   cabeceras de seguridad del demo y /api al simulador (mismo origen: connect-src 'self'). */
import { createServer, request } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { cabecerasSeguridad } from '/Users/hollman/trim-hidrocarburos/demo/cabeceras.mjs'
const RAIZ = process.argv[2], PUERTO = Number(process.argv[3]), API = Number(process.argv[4])
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' }
const indice = await readFile(join(RAIZ, 'index.html'), 'utf8')
createServer(async (req, res) => {
  if (req.url.startsWith('/api/')) {
    const p = request({ host: '127.0.0.1', port: API, path: req.url, method: req.method, headers: req.headers }, r => { res.writeHead(r.statusCode, r.headers); r.pipe(res) })
    p.on('error', () => { res.writeHead(502); res.end() }); req.pipe(p); return
  }
  const ruta = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^\/+/, '')
  if (!ruta || !extname(ruta)) { res.writeHead(200, { 'content-type': TIPOS['.html'], ...cabecerasSeguridad(indice) }); res.end(indice); return }
  try { const b = await readFile(join(RAIZ, ruta)); res.writeHead(200, { 'content-type': TIPOS[extname(ruta)] ?? 'application/octet-stream', ...cabecerasSeguridad() }); res.end(b) }
  catch { res.writeHead(404); res.end() }
}).listen(PUERTO, '127.0.0.1', () => console.log(`http-fuente en ${PUERTO} → api ${API}`))
