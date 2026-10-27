// M4 (copiado de experiencia-v2) · Renderiza las imágenes de alta fidelidad a PNG (deviceScaleFactor 2).
// Uso: node render.mjs <html> <png> <ancho> <alto> [query]
// No levanta ningún servidor: abre el HTML desde file://.
import { chromium } from '/Users/hollman/trim-hidrocarburos/node_modules/@playwright/test/index.mjs'
import { pathToFileURL } from 'node:url'
const [, , html, png, ancho, alto, query = '', completa = ''] = process.argv
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: +ancho, height: +alto }, deviceScaleFactor: 2 })
const p = await ctx.newPage()
const errores = []
p.on('pageerror', e => errores.push(String(e)))
p.on('console', m => { if (m.type() === 'error') errores.push(m.text()) })
await p.goto(pathToFileURL(html).href + (query ? '?' + query : ''))
await p.evaluate(() => document.fonts.ready)
await p.waitForTimeout(300)
// Auditoría mínima de la propia lámina: textos de menos de 12 px y desbordes horizontales.
const revision = await p.evaluate(() => {
  const chicos = new Set(), salen = []
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden') continue
    const tieneTexto = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())
    if (tieneTexto && parseFloat(cs.fontSize) < 12 && !el.closest('[data-excepcion]')) chicos.add(`${parseFloat(cs.fontSize)}px «${el.textContent.trim().slice(0, 40)}»`)
    if (el.dataset.chequeo === 'caja' && el.scrollWidth > el.clientWidth + 1) salen.push(el.className)
  }
  for (const t of document.querySelectorAll('svg text')) {
    const fs = parseFloat(getComputedStyle(t).fontSize)
    // el número dentro de una marca de prioridad es parte del símbolo (excepción justificada)
    if (fs * (t.ownerSVGElement.getBoundingClientRect().width / (t.ownerSVGElement.viewBox.baseVal?.width || t.ownerSVGElement.getBoundingClientRect().width)) < 11.9 && !t.closest('.mk')) chicos.add(`svg ${fs}px «${t.textContent.trim().slice(0, 30)}»`)
  }
  // Textos que se pisan: cajas de texto (HTML y SVG) que se cruzan más de 2 px, salvo dentro de la misma marca.
  const cajas = []
  const visible = r => r.width > 0 && r.height > 0
  for (const el of document.querySelectorAll('body *:not(svg *)')) {
    for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) {
      const rg = document.createRange(); rg.selectNodeContents(n)
      for (const r of rg.getClientRects()) if (visible(r)) cajas.push({ r, t: n.textContent.trim().slice(0, 28), el })
    }
  }
  for (const t of document.querySelectorAll('svg text')) { if (t.closest('.mk')) continue; const r = t.getBoundingClientRect(); if (visible(r)) cajas.push({ r, t: t.textContent.trim().slice(0, 28), el: t }) }
  const pisan = []
  for (let i = 0; i < cajas.length; i++) for (let j = i + 1; j < cajas.length; j++) {
    const a = cajas[i].r, b = cajas[j].r
    const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left), iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
    if (ix > 2 && iy > 2 && cajas[i].el !== cajas[j].el && !cajas[i].el.contains(cajas[j].el) && !cajas[j].el.contains(cajas[i].el)) pisan.push(`«${cajas[i].t}» × «${cajas[j].t}»`)
  }
  // T1 de X2: cifras de 32 px o más (≤ 1) y de 20 a 31 px (≤ 4) en lo que se ve.
  const grandes = [], medianas = []
  for (const c of cajas) {
    if (!/\d/.test(c.t) || c.r.top > innerHeight) continue
    const fs = c.el instanceof SVGElement ? parseFloat(getComputedStyle(c.el).fontSize) * (c.el.ownerSVGElement.getBoundingClientRect().width / (c.el.ownerSVGElement.viewBox.baseVal?.width || 1)) : parseFloat(getComputedStyle(c.el).fontSize)
    if (fs >= 32) grandes.push(`${Math.round(fs)}px ${c.t}`); else if (fs >= 20) medianas.push(`${Math.round(fs)}px ${c.t}`)
  }
  return { chicos: [...chicos].slice(0, 30), salen, pisan: pisan.slice(0, 30), cifras32: grandes, cifras20a31: medianas, anchoPagina: document.documentElement.scrollWidth, altoPagina: document.documentElement.scrollHeight }
})
await p.screenshot({ path: png, fullPage: completa === 'completa' })
console.log(JSON.stringify({ png, errores, ...revision }, null, 1))
await b.close()
