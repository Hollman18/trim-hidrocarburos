/* R4 · §9 prefers-reduced-motion, prefers-contrast y forced-colors.
   node docs/experiencia-v2/R-revision/herramientas/r4-movimiento.mjs <url>
   Con «menos movimiento»: abre el panel del teléfono, la hoja del tramo y la
   introducción, y anota toda animación o transición que dure más de 10 ms.
   Con «más contraste» y «colores forzados»: ¿cambia algo? (estilos que respondan
   a la consulta) y una captura de cada caso. */
import { lanzar, SIN_INTRO, INICIOS, lista, guardar, esperar, RAIZ } from './r4-comun.mjs'
import { join } from 'node:path'
const [base = 'http://localhost:5184'] = process.argv.slice(2)
const CAP = join(RAIZ, 'docs/experiencia-v2/R-revision/capturas/r4')
const navegador = await lanzar()
const MOVIDO = () => [...document.querySelectorAll('*')].map(e => { const s = getComputedStyle(e); const d = x => Math.max(...x.split(',').map(v => parseFloat(v) * (v.includes('ms') ? 1 : 1000))); return { e, an: s.animationName !== 'none' ? d(s.animationDuration) : 0, tr: d(s.transitionDuration) } })
  .filter(x => x.an > 10 || x.tr > 10).slice(0, 8).map(x => `${x.e.tagName.toLowerCase()}.${String(x.e.className).split(' ').slice(0, 3).join('.')} anim ${x.an} ms · trans ${x.tr} ms`)
const salida = {}
for (const [nombre, media, vp] of [['reduce-390', { reducedMotion: 'reduce' }, { width: 390, height: 844 }], ['reduce-1280', { reducedMotion: 'reduce' }, { width: 1280, height: 900 }], ['sin-preferencia-1280', { reducedMotion: 'no-preference' }, { width: 1280, height: 900 }]]) {
  const ctx = await navegador.newContext({ viewport: vp, isMobile: vp.width < 600, hasTouch: vp.width < 600, reducedMotion: media.reducedMotion })
  await ctx.addInitScript(SIN_INTRO)
  const page = await ctx.newPage()
  await page.goto(`${base}/${INICIOS.ger}`); await lista(page); await esperar(600)
  const r = { reposo: await page.evaluate(MOVIDO) }
  if (vp.width < 600) { await page.locator('button:has-text("Abrir la navegación")').click(); await esperar(50); r.panel = await page.evaluate(MOVIDO); await page.keyboard.press('Escape'); await esperar(300) }
  await page.locator('[data-tramo="planta"]').filter({ visible: true }).first().click(); await esperar(50); r.hoja = await page.evaluate(MOVIDO)
  salida[nombre] = r
  await ctx.close()
}
// Más contraste y colores forzados: ¿alguna regla responde? Se compara el estilo de muestras.
const MUESTRA = () => ['--tinta2', '--tinta3', '--linea'].map(v => `${v}=${getComputedStyle(document.documentElement).getPropertyValue(v).trim()}`).join(' ')
  + ` · reglas con prefers-contrast: ${[...document.styleSheets].flatMap(s => { try { return [...s.cssRules] } catch { return [] } }).filter(r => /prefers-contrast|forced-colors/.test(r.conditionText ?? r.media?.mediaText ?? '')).length}`
for (const [nombre, opt] of [['contraste-normal', {}], ['contraste-mas', { contrast: 'more' }], ['colores-forzados', { forcedColors: 'active' }]]) {
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 900 }, ...opt })
  await ctx.addInitScript(SIN_INTRO)
  const page = await ctx.newPage()
  await page.goto(`${base}/${INICIOS.ger}`); await lista(page); await esperar(700)
  salida[nombre] = await page.evaluate(MUESTRA)
  await page.screenshot({ path: join(CAP, `${nombre}-ger-1280.png`) })
  await ctx.close()
}
await navegador.close()
const f = guardar('movimiento-contraste.json', salida)
console.log(JSON.stringify(salida, null, 1), '\n→', f)
