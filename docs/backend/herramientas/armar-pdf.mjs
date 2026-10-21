// Arma el PDF del documento del backend: Markdown → HTML (fórmulas con KaTeX ya dibujadas,
// diagramas con Mermaid en el navegador) → PDF con el Chromium de Playwright del proyecto.
//
//   npm i --no-save marked@15 marked-katex-extension@5 katex@0.16 mermaid@11
//   node docs/backend/herramientas/armar-pdf.mjs docs/backend/herramientas/pdf.json <salida.pdf>
//
// pdf.json: { "titulo", "subtitulo", "fecha", "archivos": [rutas relativas a la raíz del repositorio] }
// Sale con 1 si un archivo no existe, si una imagen no existe o si Mermaid no dibuja un diagrama.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, resolve, basename } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import { Marked } from 'marked'
import markedKatex from 'marked-katex-extension'
import { chromium } from '@playwright/test'

const [lista, salida] = process.argv.slice(2)
if (!lista || !salida) throw new Error('uso: node armar-pdf.mjs <lista.json> <salida.pdf>')
const RAIZ = resolve(dirname(new URL(import.meta.url).pathname), '../../..')
const L = JSON.parse(readFileSync(lista, 'utf8'))
L.archivos = L.archivos.map(a => resolve(RAIZ, a))
const requerir = createRequire(import.meta.url)

const faltan = L.archivos.filter(a => !existsSync(a))
if (faltan.length) throw new Error(`no existen: ${faltan.join(', ')}`)

// Ancla de cada archivo: los enlaces entre capítulos (otro.md#x) llevan a ella.
const ancla = new Map(L.archivos.map((a, i) => [resolve(a), `f${i}`]))
const problemas = []
const slug = t => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/<[^>]+>/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)

/** Tamaño de un PNG (ancho, alto) leyendo su cabecera. */
function tamPng(ruta) {
  const b = readFileSync(ruta)
  if (b.toString('ascii', 1, 4) !== 'PNG') return null
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }
}

// Página A4 con márgenes de 16 mm a los lados: 178 mm de ancho útil. Una captura más alta que
// lo que cabe en una página se corta en franjas (cada franja en su página), en vez de achicarla
// hasta que no se lea.
const ANCHO_MM = 178, ALTO_MAX_MM = 228
function imagen(src, alt) {
  const t = src.endsWith('.png') ? tamPng(src) : null
  const url = pathToFileURL(src).href
  if (!t) return `<figure><img src="${url}" alt="${alt}"><figcaption>${alt}</figcaption></figure>`
  // Las capturas de teléfono (390 px de ancho a 2x = 780) van a 90 mm, no a lo ancho.
  const anchoMm = t.w <= 900 ? 90 : ANCHO_MM
  const altoMm = anchoMm * t.h / t.w
  if (altoMm <= ALTO_MAX_MM)
    return `<figure><img src="${url}" alt="${alt}" style="width:${anchoMm}mm"><figcaption>${alt}</figcaption></figure>`
  const n = Math.ceil(altoMm / ALTO_MAX_MM)
  const franjas = Array.from({ length: n }, (_, k) => {
    const h = Math.min(ALTO_MAX_MM, altoMm - k * ALTO_MAX_MM)
    return `<div class="franja" style="width:${anchoMm}mm;height:${h}mm;background-image:url('${url}');background-size:${anchoMm}mm auto;background-position:0 -${k * ALTO_MAX_MM}mm"></div>`
  }).join('')
  return `<figure class="larga">${franjas}<figcaption>${alt} (captura completa, en ${n} partes)</figcaption></figure>`
}

let numeroArchivo = 0
const toc = []
function convertir(archivo) {
  const base = dirname(archivo)
  const id = ancla.get(resolve(archivo))
  const marked = new Marked()
  marked.use(markedKatex({ throwOnError: false, nonStandard: true, strict: false }))
  let primero = true
  marked.use({
    renderer: {
      heading({ tokens, depth }) {
        const html = this.parser.parseInline(tokens)
        const hid = primero ? id : `${id}-${slug(html)}`
        if (depth <= 2) toc.push({ depth, html: html.replace(/<a [^>]*>|<\/a>/g, ''), id: hid })
        primero = false
        return `<h${depth} id="${hid}">${html}</h${depth}>\n`
      },
      image({ href, text }) {
        const ruta = resolve(base, decodeURI(href))
        if (!existsSync(ruta)) { problemas.push(`${basename(archivo)}: imagen que no existe: ${href}`); return `<p class="falta">[falta la imagen ${href}]</p>` }
        return imagen(ruta, text)
      },
      link({ href, tokens }) {
        const texto = this.parser.parseInline(tokens)
        if (/^https?:/.test(href)) return `<a href="${href}">${texto}</a>`
        if (href.startsWith('#')) return `<a href="#${id}-${slug(href.slice(1))}">${texto}</a>`
        const [ruta, frag] = href.split('#')
        if (ruta.endsWith('.md')) {
          const destino = ancla.get(resolve(base, ruta))
          if (destino) return `<a href="#${frag ? `${destino}-${slug(frag)}` : destino}">${texto}</a>`
        }
        // Un archivo del repositorio: en el papel se cita, no se enlaza.
        return `<span class="ref">${texto}</span>`
      },
      code({ text, lang }) {
        if (lang === 'mermaid') return `<pre class="mermaid">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre>`
        return `<pre><code>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</code></pre>`
      },
    },
  })
  numeroArchivo++
  const md = readFileSync(archivo, 'utf8')
  return `<section class="capitulo${numeroArchivo === 1 ? ' primero' : ''}">${marked.parse(md)}</section>`
}

const cuerpo = L.archivos.map(convertir).join('\n')
const indice = toc.map(t => `<li class="n${t.depth}"><a href="#${t.id}">${t.html}</a></li>`).join('')
const katexCss = pathToFileURL(requerir.resolve('katex/dist/katex.min.css')).href
const mermaidJs = pathToFileURL(requerir.resolve('mermaid/dist/mermaid.min.js')).href

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>${L.titulo}</title>
<link rel="stylesheet" href="${katexCss}">
<style>
  @page { size: A4; margin: 18mm 16mm 18mm 16mm; }
  :root { --tinta:#1f2328; --tinta2:#4d535a; --linea:#d0d3d7; --suave:#f3f4f5; --acento:#12287a; }
  html { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 9.6pt; color: var(--tinta); line-height: 1.45; }
  body { margin: 0; }
  h1, h2, h3, h4 { font-weight: 700; line-height: 1.2; break-after: avoid; text-wrap: balance; }
  h1 { font-size: 19pt; color: var(--acento); margin: 0 0 6mm; padding-bottom: 2mm; border-bottom: 1.5px solid var(--acento); }
  h2 { font-size: 13.5pt; margin: 8mm 0 3mm; color: var(--acento); }
  h3 { font-size: 11pt; margin: 6mm 0 2mm; }
  h4 { font-size: 10pt; margin: 4mm 0 1.5mm; }
  section.capitulo { break-before: page; }
  p, li { orphans: 3; widows: 3; }
  table { border-collapse: collapse; width: 100%; margin: 2.5mm 0 4mm; font-size: 8pt; break-inside: auto; }
  th, td { border: 0.6px solid var(--linea); padding: 1.2mm 1.6mm; vertical-align: top; text-align: left; overflow-wrap: break-word; hyphens: auto; }
  td code, th code { overflow-wrap: anywhere; hyphens: none; }
  /* Tablas anchas (las de las pantallas: # · lo que se ve · en la captura · cómo se calcula · texto · viene de):
     letra más chica y un ancho mínimo para el rótulo y el origen, que si no se parten letra por letra. */
  table:has(th:nth-child(6)) { font-size: 7.1pt; }
  table:has(th:nth-child(6)) td:first-child { width: 5mm; }
  table:has(th:nth-child(6)) td:nth-child(2) { min-width: 19mm; }
  table:has(th:nth-child(6)) td:nth-child(3) { min-width: 16mm; }
  table:has(th:nth-child(6)) td:last-child { min-width: 27mm; }
  table:has(th:nth-child(5)) td:first-child:not(:has(code)) { hyphens: manual; }
  th { background: var(--suave); font-weight: 700; }
  tr { break-inside: avoid; }
  thead { display: table-header-group; }
  code { font-family: Menlo, Monaco, monospace; font-size: 0.86em; background: var(--suave); padding: 0.2mm 0.8mm; border-radius: 1mm; overflow-wrap: anywhere; }
  pre { background: var(--suave); padding: 2.5mm 3mm; border-radius: 1.5mm; font-size: 7.6pt; white-space: pre-wrap; overflow-wrap: anywhere; break-inside: avoid; }
  pre code { background: none; padding: 0; }
  pre.mermaid { background: none; text-align: center; }
  pre.mermaid svg { width: 100% !important; max-width: 100% !important; height: auto; }
  blockquote { margin: 3mm 0; padding: 2mm 4mm; border-left: 2.5px solid var(--acento); background: #f5f6fa; color: var(--tinta2); }
  figure { margin: 3mm 0 5mm; text-align: center; }
  figure img { max-width: 100%; border: 0.6px solid var(--linea); }
  figure .franja { margin: 0 auto 2mm; border: 0.6px solid var(--linea); background-repeat: no-repeat; break-inside: avoid; break-after: page; }
  figure .franja:last-of-type { break-after: auto; }
  figcaption { font-size: 7.8pt; color: var(--tinta2); margin-top: 1.2mm; }
  .katex-display { margin: 2.5mm 0; overflow-x: hidden; }
  .katex { font-size: 1.05em; }
  .ref { font-family: Menlo, Monaco, monospace; font-size: 0.86em; }
  a { color: var(--acento); text-decoration: none; }
  .falta { color: #b71c1c; font-weight: 700; }
  /* Portada e índice */
  .portada { height: 250mm; display: flex; flex-direction: column; justify-content: center; }
  .portada .marca { font-size: 10pt; letter-spacing: .18em; color: var(--tinta2); text-transform: uppercase; }
  .portada h1.t { font-size: 30pt; border: none; margin: 4mm 0 3mm; }
  .portada .sub { font-size: 13pt; color: var(--tinta2); max-width: 140mm; }
  .portada .datos { margin-top: 18mm; font-size: 9pt; color: var(--tinta2); line-height: 1.7; }
  .indice { break-before: page; }
  .indice ol { list-style: none; padding: 0; columns: 1; }
  .indice li.n1 { font-weight: 700; margin-top: 2.5mm; }
  .indice li.n2 { margin-left: 6mm; font-size: 8.6pt; }
</style></head><body>
<div class="portada">
  <div class="marca">${L.marca ?? 'TRIM Hidrocarburos · documento técnico'}</div>
  <h1 class="t">${L.titulo}</h1>
  <div class="sub">${L.subtitulo}</div>
  <div class="datos">${L.fecha}<br>${L.notaPortada ?? 'Repositorio: Hollman18/trim-hidrocarburos · carpeta docs/backend/<br>Las cifras de ejemplo salen del motor del front con los datos de demostración (ahora = 2 de octubre de 2026, 14:00, hora de Colombia).'}</div>
</div>
<nav class="indice"><h1>Contenido</h1><ol>${indice}</ol></nav>
${cuerpo}
<script src="${mermaidJs}"></script>
<script>
  window.__mermaid = (async () => {
    mermaid.initialize({ startOnLoad: false, theme: 'neutral', themeVariables: { fontSize: '15px' }, securityLevel: 'loose', flowchart: { htmlLabels: true }, fontFamily: 'Helvetica Neue, Arial, sans-serif' })
    const nodos = [...document.querySelectorAll('pre.mermaid')]
    try { await mermaid.run({ nodes: nodos }); return { ok: true, n: nodos.length } }
    catch (e) { return { ok: false, error: String(e && e.message || e) } }
  })()
</script>
</body></html>`

if (problemas.length) { console.error(problemas.join('\n')); process.exit(1) }
const htmlRuta = salida.replace(/\.pdf$/, '.html')
writeFileSync(htmlRuta, html)

const nav = await chromium.launch()
try {
  const pag = await nav.newPage()
  const errores = []
  pag.on('pageerror', e => errores.push(e.message))
  await pag.goto(pathToFileURL(htmlRuta).href, { waitUntil: 'load' })
  const m = await pag.evaluate(() => window.__mermaid)
  if (!m.ok) throw new Error(`Mermaid no dibujó: ${m.error}`)
  const sinDibujar = await pag.evaluate(() => [...document.querySelectorAll('pre.mermaid')].filter(p => !p.querySelector('svg')).length)
  if (sinDibujar) throw new Error(`${sinDibujar} diagramas Mermaid sin dibujar`)
  const katexErr = await pag.evaluate(() => [...document.querySelectorAll('.katex-error')].map(e => e.getAttribute('title') || e.textContent).slice(0, 10))
  if (katexErr.length) console.log(`aviso: ${katexErr.length} fórmulas con error de KaTeX:\n  ${katexErr.join('\n  ')}`)
  if (errores.length) throw new Error(`la página lanzó: ${errores.join(' | ')}`)
  await pag.pdf({
    path: salida, format: 'A4', printBackground: true, displayHeaderFooter: true,
    margin: { top: '18mm', bottom: '18mm', left: '16mm', right: '16mm' },
    headerTemplate: `<div style="font-size:7pt;color:#6a7077;width:100%;padding:0 16mm;font-family:Helvetica Neue,Arial;">${L.titulo}</div>`,
    footerTemplate: '<div style="font-size:7pt;color:#6a7077;width:100%;padding:0 16mm;text-align:right;font-family:Helvetica Neue,Arial;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
  })
  console.log(`PDF: ${salida} · ${m.n} diagramas · ${toc.length} entradas en el índice`)
} finally { await nav.close() }
