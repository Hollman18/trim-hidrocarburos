// D1 · Capturas del detalle como modal y del panel lateral, antes y después.
// Uso: TRIM_URL=http://localhost:5187 node docs/experiencia-v3/herramientas/capturas-d1.mjs antes|despues
import { chromium } from '@playwright/test'
const URL = process.env.TRIM_URL ?? 'http://localhost:5187'
const cuando = process.argv[2] ?? 'despues'
const dir = 'docs/experiencia-v3/capturas/d1'

const b = await chromium.launch()
const contexto = (ancho, alto, movil, tema = 'light') => b.newContext({
  viewport: { width: ancho, height: alto }, deviceScaleFactor: movil ? 2 : 1, isMobile: movil, hasTouch: movil,
  locale: 'es-CO', timezoneId: 'America/Bogota', colorScheme: tema,
})
const foto = (p, n) => p.screenshot({ path: `${dir}/${cuando}-${n}.png` })

// 1. Los detalles: la ficha de P-201B (gerente), la trazabilidad de un tramo y la hoja del tramo.
for (const [ancho, alto, movil] of [[1440, 900, false], [390, 844, true]]) {
  const ctx = await contexto(ancho, alto, movil)
  const p = await ctx.newPage()
  await p.goto(`${URL}/#/ger/planta-viva/ceiba~portafolio/curso/P-201B`); await p.waitForTimeout(2500)
  await foto(p, `ficha-p201b-${ancho}`)
  await p.goto(`${URL}/#/prod/planta-viva/ceiba/curso`); await p.waitForTimeout(2500)
  await p.locator('main [data-balance] [data-tramo-balance="planta"] button').first().click(); await p.waitForTimeout(700)
  await foto(p, `traza-planta-${ancho}`)
  await p.goto(`${URL}/#/ger/planta-viva/ceiba/curso`); await p.waitForTimeout(2500)
  await p.locator('[data-tramo-kit="planta"]').first().click(); await p.waitForTimeout(700)
  await foto(p, `hoja-tramo-${ancho}`)
  await ctx.close()
}
// La ficha en la noche.
{
  const ctx = await contexto(1440, 900, false, 'dark')
  const p = await ctx.newPage()
  await p.goto(`${URL}/#/ger/planta-viva/ceiba~portafolio/curso/P-201B`); await p.waitForTimeout(2500)
  await foto(p, 'ficha-p201b-1440-noche')
  await ctx.close()
}

// 2. Los menús del panel: el de la persona y el selector de campo, a 1440, 1280, 1024 (plegado) y 390 (☰ y banda).
for (const [ancho, alto, movil] of [[1440, 900, false], [1280, 860, false], [1024, 800, false], [390, 844, true]]) {
  const ctx = await contexto(ancho, alto, movil)
  const p = await ctx.newPage()
  await p.goto(`${URL}/#/ger/planta-viva/ceiba~portafolio/curso`); await p.waitForTimeout(2500)
  await foto(p, `panel-${ancho}`)
  if (movil) {
    await p.locator('[data-banda] button[aria-label^="Campo"]').click(); await p.waitForTimeout(400)
    await foto(p, `campo-banda-${ancho}`)
    await p.keyboard.press('Escape')
    await p.locator('[data-banda-persona] button').first().click(); await p.waitForTimeout(400)
    await foto(p, `persona-banda-${ancho}`)
    await p.keyboard.press('Escape')
    await p.locator('[data-banda] button:has-text("Abrir la navegación")').click(); await p.waitForTimeout(500)
    await foto(p, `panel-abierto-${ancho}`)
    await p.locator('[role=dialog] nav button[aria-label^="Campo"]').click(); await p.waitForTimeout(400)
    await foto(p, `campo-${ancho}`)
    await p.keyboard.press('Escape')
    await p.locator('[role=dialog] nav button[aria-label*=" · "]').first().click(); await p.waitForTimeout(400)
    await foto(p, `persona-${ancho}`)
  } else {
    await p.locator('nav button[aria-label^="Campo"]').click(); await p.waitForTimeout(400)
    await foto(p, `campo-${ancho}`)
    await p.keyboard.press('Escape')
    await p.locator('nav button[aria-label*=" · "]').first().click(); await p.waitForTimeout(400)
    await foto(p, `persona-${ancho}`)
  }
  await ctx.close()
}
await b.close()
