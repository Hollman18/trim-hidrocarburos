/* Arma y revisa el paquete de entrega (la carpeta con LEEME.md, 1-aplicacion,
 * 2-documentos, 3-investigacion y 4-demo).
 *
 *   npm run paquete -- <carpeta-del-paquete>             # copia el código a 1-aplicacion, construye y arma 4-demo, y revisa
 *   npm run paquete:comprobar -- <carpeta-del-paquete>   # solo revisa
 *
 * Por qué existe: el paquete se armaba copiando a mano, y el LEEME del 7 de
 * octubre remitía a secciones de CONTRATO.md, a referencia/ y a scripts que la
 * copia del 6 no tenía. Quien abría la carpeta encontraba corregido en el
 * LEEME lo que en el código seguía igual. Ahora la copia sale del proyecto
 * con la misma regla de .gitignore, y la revisión falla si:
 *   - un archivo de 1-aplicacion no es el del proyecto (copia desfasada), o
 *     falta o sobra alguno;
 *   - 4-demo no trae el servidor, las cabeceras y el lanzador de demo/;
 *   - LEEME.md o 2-documentos/OBSOLETO.md nombran un `1-aplicacion/…` que no
 *     existe, un «npm run …» que package.json no tiene, o una sección
 *     «…» de CONTRATO.md que no está.
 */
import { cpSync, existsSync, readFileSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const [modo, carpeta] = process.argv.slice(2)
if (!['armar', 'comprobar'].includes(modo) || !carpeta) {
  console.error('uso: node scripts/empaquetar.mjs armar | comprobar <carpeta-del-paquete>')
  process.exit(2)
}
const PAQUETE = resolve(carpeta)
const APP = join(PAQUETE, '1-aplicacion'), DEMO = join(PAQUETE, '4-demo')
if (!existsSync(join(PAQUETE, 'LEEME.md'))) { console.error(`${PAQUETE} no tiene LEEME.md: no parece el paquete de entrega`); process.exit(1) }
if ((PAQUETE + sep).startsWith(resolve(RAIZ) + sep)) { console.error('el paquete no puede quedar dentro del proyecto'); process.exit(1) }

/** Lo que no se entrega: lo mismo que .gitignore deja fuera del repositorio
 *  (dependencias, builds, la base local del simulador, las copias de
 *  respaldo, los resultados de las pruebas de navegador y las herramientas
 *  locales), y la historia de git: el paquete es la copia del código de hoy. */
const FUERA = [/^\.git(\/|$)/, /^\.claude(\/|$)/, /^node_modules(\/|$)/, /^dist(\/|$)/, /^dist-ssr(\/|$)/, /^\.respaldos(\/|$)/, /^e2e\/\.resultados(\/|$)/, /^e2e\/\.informe(\/|$)/,
  /^simulador-api\/datos\/.*\.db/, /(^|\/)\.DS_Store$/, /\.local$/, /^(?!docs\/backend\/sql\/validacion\.log$).*\.log$/, /^\.vscode(\/|$)/, /^\.idea(\/|$)/, /^\.codegraph(\/|$)/,
  /^docs\/backend\/sql\/herramientas\/(motor|cuenta-ejemplos)\.json$/]
const seEntrega = rel => !FUERA.some(r => r.test(rel))

/** Los archivos que se entregan, con su ruta relativa (con «/»). */
function archivosDe(base) {
  const salida = []
  const recorrer = dir => {
    for (const n of readdirSync(dir)) {
      const abs = join(dir, n), rel = relative(base, abs).split(sep).join('/')
      if (!seEntrega(rel)) continue
      if (statSync(abs).isDirectory()) recorrer(abs)
      else salida.push(rel)
    }
  }
  recorrer(base)
  return salida.sort()
}

if (modo === 'armar') {
  // La copia anterior se reemplaza entera (un archivo borrado del proyecto no
  // puede quedar vivo en el paquete), pero solo si es la aplicación.
  if (existsSync(APP)) {
    const pkg = join(APP, 'package.json')
    if (!existsSync(pkg) || JSON.parse(readFileSync(pkg, 'utf8')).name !== 'trim-hidrocarburos') {
      console.error(`${APP} existe y no es la aplicación: no se toca`); process.exit(1)
    }
  }
  console.log('construyendo (npm run build)…')
  execFileSync('npm', ['run', 'build'], { cwd: RAIZ, stdio: 'inherit' })
  const nueva = `${APP}.nueva`
  rmSync(nueva, { recursive: true, force: true })
  cpSync(RAIZ, nueva, { recursive: true, filter: src => seEntrega(relative(RAIZ, src).split(sep).join('/')) })
  rmSync(APP, { recursive: true, force: true })
  renameSync(nueva, APP)
  console.log(`1-aplicacion: ${archivosDe(APP).length} archivos copiados del proyecto`)
  execFileSync(process.execPath, [join(RAIZ, 'scripts', 'armar-demo.mjs'), DEMO], { cwd: RAIZ, stdio: 'inherit' })
}

/* ───── Revisión ───── */
let fallas = 0
const falla = m => { fallas++; console.log(`  ✗ ${m}`) }

if (!existsSync(APP)) falla('no hay 1-aplicacion')
else {
  const delProyecto = archivosDe(RAIZ), delPaquete = archivosDe(APP)
  const faltan = delProyecto.filter(f => !delPaquete.includes(f)), sobran = delPaquete.filter(f => !delProyecto.includes(f))
  const distintos = delProyecto.filter(f => delPaquete.includes(f) && !readFileSync(join(RAIZ, f)).equals(readFileSync(join(APP, f))))
  if (faltan.length) falla(`a 1-aplicacion le faltan ${faltan.length} archivos del proyecto: ${faltan.slice(0, 6).join(', ')}${faltan.length > 6 ? '…' : ''}`)
  if (sobran.length) falla(`1-aplicacion trae ${sobran.length} archivos que el proyecto ya no tiene: ${sobran.slice(0, 6).join(', ')}${sobran.length > 6 ? '…' : ''}`)
  if (distintos.length) falla(`1-aplicacion está desfasada en ${distintos.length} archivos: ${distintos.slice(0, 6).join(', ')}${distintos.length > 6 ? '…' : ''} (vuelva a armar con «npm run paquete»)`)
}
for (const f of ['servidor.mjs', 'cabeceras.mjs', 'abrir-demo.command']) {
  const p = join(DEMO, f)
  if (!existsSync(p)) falla(`4-demo no trae ${f}`)
  else if (!readFileSync(p).equals(readFileSync(join(RAIZ, 'demo', f)))) falla(`4-demo/${f} no es el de demo/ (vuelva a armar con «npm run paquete»)`)
}
if (!existsSync(join(DEMO, 'index.html')) || !readFileSync(join(DEMO, 'index.html'), 'utf8').includes('http-equiv="Content-Security-Policy"'))
  falla('4-demo no trae un index.html construido con la Content-Security-Policy')

const contrato = existsSync(join(APP, 'CONTRATO.md')) ? readFileSync(join(APP, 'CONTRATO.md'), 'utf8') : ''
const titulos = contrato.split('\n').filter(l => l.startsWith('#'))
const scripts = existsSync(join(APP, 'package.json')) ? JSON.parse(readFileSync(join(APP, 'package.json'), 'utf8')).scripts : {}
for (const doc of ['LEEME.md', '2-documentos/OBSOLETO.md']) {
  const p = join(PAQUETE, doc)
  if (!existsSync(p)) { falla(`no hay ${doc}`); continue }
  const texto = readFileSync(p, 'utf8')
  const rutas = [...texto.matchAll(/`1-aplicacion\/([^`\s]+)`/g)].map(m => m[1].replace(/\/$/, ''))
  for (const r of rutas) if (!existsSync(join(APP, r))) falla(`${doc} nombra 1-aplicacion/${r}, que no existe`)
  const npm = [...texto.matchAll(/npm run ([\w:-]+)/g)].map(m => m[1])
  for (const s of npm) if (!(s in scripts)) falla(`${doc} nombra «npm run ${s}», que package.json no tiene`)
  if (/npm test/.test(texto) && !('test' in scripts)) falla(`${doc} nombra «npm test», que package.json no tiene`)
  // El nombre puede partirse en dos renglones del Markdown: se compara con un solo espacio.
  const secciones = [...texto.matchAll(/secci[oó]n(?:es)? «([^»]+)»/g)].map(m => m[1].replace(/\s+/g, ' '))
  for (const s of secciones) if (!titulos.some(t => t.includes(s))) falla(`${doc} cita la sección «${s}» de CONTRATO.md, que no está`)
  console.log(`  ${doc}: ${rutas.length} rutas, ${npm.length} scripts y ${secciones.length} secciones citadas`)
}
console.log(fallas ? `\n${fallas} ${fallas === 1 ? 'problema' : 'problemas'} en el paquete ${PAQUETE}.` : `\nEl paquete ${PAQUETE} está al día con el proyecto.`)
if (fallas) process.exit(1)
