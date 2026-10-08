// Dibuja cada diagrama Mermaid de un Markdown como PNG (para la hoja «Diagrama» del Excel).
//   npm i --no-save mermaid@11
//   node docs/backend/herramientas/diagramas-er.mjs docs/backend/03-modelo-de-datos.md <carpeta-salida>
import { readFileSync, mkdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve, dirname } from 'node:path'
const [md, salida] = process.argv.slice(2)
import { createRequire } from 'node:module'
import { chromium } from '@playwright/test'
const requerir = createRequire(import.meta.url)
const texto = readFileSync(md, 'utf8')
// Cada bloque con el título de la sección «## …» que lo contiene.
const bloques = []
let titulo = ''
for (const parte of texto.split(/(^## .*$)/m)) {
  if (/^## /.test(parte)) { titulo = parte.replace(/^## /, '').trim(); continue }
  for (const m of parte.matchAll(/```mermaid\n([\s\S]*?)```/g)) bloques.push({ titulo, codigo: m[1] })
}
mkdirSync(salida, { recursive: true })
const nav = await chromium.launch()
const pag = await nav.newPage({ viewport: { width: 1800, height: 1200 }, deviceScaleFactor: 1.5 })
await pag.setContent(`<!doctype html><html><body style="margin:0;background:#fff;font-family:Arial"><div id="d"></div></body></html>`)
await pag.addScriptTag({ path: requerir.resolve('mermaid/dist/mermaid.min.js') })
await pag.evaluate(() => mermaid.initialize({ startOnLoad: false, theme: 'neutral', er: { useMaxWidth: false }, fontFamily: 'Arial' }))
let n = 0
for (const [i, b] of bloques.entries()) {
  const ok = await pag.evaluate(async ({ codigo, i, titulo }) => {
    try {
      const { svg } = await mermaid.render(`g${i}`, codigo)
      document.getElementById('d').innerHTML = `<div style="padding:16px"><div style="font:bold 20px Arial;color:#12287a;margin-bottom:8px">${titulo}</div>${svg}</div>`
      return true
    } catch (e) { return String(e.message || e) }
  }, { ...b, i })
  if (ok !== true) { console.error(`✗ diagrama ${i + 1} (${b.titulo}): ${ok}`); process.exitCode = 1; continue }
  const caja = await pag.locator('#d > div').boundingBox()
  await pag.setViewportSize({ width: Math.ceil(Math.max(800, caja.width)), height: Math.ceil(Math.max(400, caja.height)) })
  const ruta = `${salida}/er-${String(i + 1).padStart(2, '0')}.png`
  await pag.locator('#d > div').screenshot({ path: ruta })
  console.log(`✓ ${ruta}  ${b.titulo}`)
  n++
}
await nav.close()
console.log(`${n} de ${bloques.length} diagramas`)
