// M4 · Prueba las cifras tabulares de cada letra candidata en Chromium: con
// `font-variant-numeric: tabular-nums`, «1111111» y «0000000» deben medir lo mismo.
import { chromium } from '/Users/hollman/trim-hidrocarburos/node_modules/@playwright/test/index.mjs'
import { pathToFileURL } from 'node:url'
const dir = new URL('../fuentes/', import.meta.url).href
const air = pathToFileURL('/Users/hollman/trim-hidrocarburos/public/fonts/').href
const html = `<style>
@font-face{font-family:P;src:url(${dir}PlexSans-var.woff2)}
@font-face{font-family:PC;src:url(${dir}PlexSansCond-600.woff2)}
@font-face{font-family:PM;src:url(${dir}PlexMono-500.woff2)}
@font-face{font-family:G;src:url(${dir}Geist-var.woff2)}
@font-face{font-family:GM;src:url(${dir}GeistMono-var.woff2)}
@font-face{font-family:A;src:url(${air}Air-Bold.woff2)}
@font-face{font-family:AC;src:url(${air}AirCondensed-Semibold.woff2)}
span{font-size:40px;white-space:pre}</style><body></body>`
const b = await chromium.launch(); const p = await b.newPage()
const { writeFileSync } = await import('node:fs'); const tmp = new URL('../prueba-cifras.html', import.meta.url); writeFileSync(tmp, html); await p.goto(tmp.href); (await import('node:fs')).rmSync(tmp)
const r = await p.evaluate(async () => {
  const out = {}
  for (const f of ['P', 'PC', 'PM', 'G', 'GM', 'A', 'AC']) for (const tab of [false, true]) {
    const w = s => { const e = document.createElement('span'); e.style.fontFamily = f; e.style.fontVariantNumeric = tab ? 'tabular-nums' : 'normal'; e.textContent = s; document.body.append(e); return e }
    const a = w('1111111'), z = w('0000000')
    await document.fonts.ready
    out[`${f}${tab ? ' tnum' : ''}`] = [a.getBoundingClientRect().width.toFixed(1), z.getBoundingClientRect().width.toFixed(1), [...document.fonts].filter(x => x.family === f).map(x => x.status).join()]
  }
  return out
})
console.log(r); await b.close()
