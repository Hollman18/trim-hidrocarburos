// R3 · Captura cada dibujo (SVG de más de 40 px de ancho que no sea una marca o un
// ícono) con la tarjeta que lo contiene, para revisarlos uno por uno.
// Uso: node r3-dibujos.mjs <salida> <ancho> <tema> <hash>...
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
const [,, SALIDA, ANCHO, TEMA, ...HASHES] = process.argv
mkdirSync(SALIDA, { recursive: true })
const b = await chromium.launch()
const lista = []
for (const hash of HASHES) {
  const ctx = await b.newContext({ viewport: { width: +ANCHO, height: 900 }, locale: 'es-CO', timezoneId: 'America/Bogota', isMobile: +ANCHO <= 430, hasTouch: +ANCHO <= 430 })
  await ctx.addInitScript(t => { for (const r of ['ger','prod','sup','oper','jefe','conf','plan','tec','cont','reg','adm']) localStorage.setItem(`trim.intro.${r}`,'1'); localStorage.setItem('trim.tema', t) }, TEMA)
  const p = await ctx.newPage()
  await p.goto(`http://localhost:5183/${hash}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(900)
  // Abre lo plegado que esconde dibujos («ver», «Producción día a día»).
  for (const t of ['Ver el día a día', 'ver']) { const l = p.getByRole('button', { name: t, exact: true }); if (await l.count()) await l.first().click().catch(() => {}) }
  await p.waitForTimeout(300)
  const n = await p.evaluate(() => {
    const svgs = [...document.querySelectorAll('svg')].filter(s => {
      const vb = (s.getAttribute('viewBox') ?? '').split(/\s+/).map(Number)
      const r = s.getBoundingClientRect()
      return s.getAttribute('viewBox') !== '0 0 14 14' && !s.closest('button > svg') && r.width > 40 && r.height > 14 && !s.classList.contains('lucide') && !(vb[2] === 24 && vb[3] === 24)
    })
    svgs.forEach((s, i) => { const c = s.closest('section, figure, [data-planta-viva] > div, .rounded') ?? s.parentElement; c.setAttribute('data-r3-dibujo', String(i)) })
    return svgs.length
  })
  console.error(hash, n)
  const id = hash.replace(/[#/~]+/g, '_').replace(/^_|_$/g, '')
  const vistos = new Set()
  for (let i = 0; i < n; i++) {
    const l = p.locator(`[data-r3-dibujo="${i}"]`).first()
    if (!(await l.count())) continue
    const box = await l.boundingBox(); const k = box ? `${Math.round(box.x)}-${Math.round(box.y)}-${Math.round(box.width)}` : i
    if (vistos.has(k)) continue; vistos.add(k)
    const archivo = `${id}__${i}_${TEMA}_${ANCHO}.png`
    try { await l.scrollIntoViewIfNeeded(); await l.screenshot({ path: join(SALIDA, archivo) }); lista.push({ hash, i, archivo, alto: box?.height }) } catch (e) { lista.push({ hash, i, fallo: String(e).slice(0, 80) }) }
  }
  await ctx.close()
}
await b.close()
writeFileSync(join(SALIDA, `lista-${TEMA}-${ANCHO}.json`), JSON.stringify(lista, null, 1))
console.log(lista.length)
