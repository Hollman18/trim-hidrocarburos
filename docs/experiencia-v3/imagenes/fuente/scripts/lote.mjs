// M4 · Renderiza un lote de imágenes con un solo navegador (la misma auditoría de render.mjs).
// Uso: node lote.mjs <trabajos.json>  ·  cada trabajo: { html, png, ancho, alto, query, completa, revision }
import { chromium } from '/Users/hollman/trim-hidrocarburos/node_modules/@playwright/test/index.mjs'
import { pathToFileURL } from 'node:url'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
const trabajos = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const b = await chromium.launch()
const resumen = []
for (const t of trabajos) {
  const ctx = await b.newContext({ viewport: { width: t.ancho, height: t.alto }, deviceScaleFactor: 2 })
  const p = await ctx.newPage()
  const errores = []
  p.on('pageerror', e => errores.push(String(e)))
  p.on('console', m => { if (m.type() === 'error') errores.push(m.text()) })
  await p.goto(pathToFileURL(resolve(t.html)).href + (t.query ? '?' + t.query : ''))
  await p.evaluate(() => document.fonts.ready)
  await p.waitForTimeout(250)
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
  await p.screenshot({ path: t.png, fullPage: !!t.completa })
  const r = { png: t.png, errores, ...revision }
  if (t.revision) writeFileSync(t.revision, JSON.stringify(r, null, 1))
  resumen.push({ png: t.png, errores: errores.length, chicos: revision.chicos.length, pisan: revision.pisan, ancho: revision.anchoPagina, alto: revision.altoPagina, c32: revision.cifras32.length, c20: revision.cifras20a31.length })
  await ctx.close()
}
await b.close()
console.log(JSON.stringify(resumen))
