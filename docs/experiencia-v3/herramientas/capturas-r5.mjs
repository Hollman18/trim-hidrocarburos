// R5 · Capturas de «100 % responsive», antes y después.
// Uso: TRIM_URL=http://localhost:5189 node docs/experiencia-v3/herramientas/capturas-r5.mjs antes|despues
// («antes» se tomó contra el árbol de HEAD servido aparte, sin los cambios de R5 ni de D1).
import { chromium } from '@playwright/test'
const URL = process.env.TRIM_URL ?? 'http://localhost:5189'
const cuando = process.argv[2] ?? 'despues'
const dir = 'docs/experiencia-v3/capturas/r5'
const ROLES = ['ger', 'prod', 'sup', 'oper', 'jefe', 'conf', 'tec', 'reg', 'adm']

const b = await chromium.launch()
/** `escala`: la del zoom (una pantalla Retina de 2× al 90 % dibuja a 1,8). `panel`: forzar el panel lateral. */
const abrir = async (ruta, { ancho, alto = 900, escala = 1, tema = 'light', panel } = {}) => {
  const ctx = await b.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: escala, locale: 'es-CO', timezoneId: 'America/Bogota', colorScheme: tema })
  await ctx.addInitScript(([roles, panel, tema]) => {
    for (const r of roles) {
      localStorage.setItem(`trim.intro.${r}`, '1')
      // La clave de antes de R5 y las de ahora (una por ancho).
      if (panel) for (const k of [`trim.riel.${r}`, `trim.riel.${r}@medio`, `trim.riel.${r}@ancho`]) localStorage.setItem(k, panel)
    }
    if (tema === 'dark') localStorage.setItem('trim.tema', 'dark')
  }, [ROLES, panel ?? '', tema])
  const p = await ctx.newPage()
  await p.goto(`${URL}/${ruta}`)
  await p.waitForFunction(() => (document.querySelector('main')?.innerText ?? '').length > 80 && !document.querySelector('[data-cargando]'))
  await p.waitForTimeout(800)
  return p
}
const foto = (p, n, opciones = {}) => p.screenshot({ path: `${dir}/${cuando}-${n}.png`, ...opciones })
const persona = p => p.locator('aside nav button[aria-label*=" · "], [data-banda-persona] button[aria-label*=" · "]').first()

// 1. La vista de la captura del dueño: 1512 px al 90 % = 1680 px CSS, Retina (1,8), menú de la persona
//    abierto, el foco adentro y un desplazamiento de lado sobre el panel (el trackpad del Mac).
for (const tema of ['light', 'dark']) {
  const p = await abrir('#/prod/planta-viva/ceiba/curso', { ancho: 1680, alto: 945, escala: 1.8, tema })
  await persona(p).click(); await p.waitForTimeout(300)
  await p.keyboard.press('Tab')
  const nav = await p.locator('aside nav').boundingBox()
  await p.mouse.move(nav.x + nav.width / 2, nav.y + nav.height * 0.7)
  await p.mouse.wheel(120, 0); await p.waitForTimeout(400)
  await foto(p, `duenio-1680-zoom90${tema === 'dark' ? '-noche' : ''}`)
  await p.context().close()
}

// 2. La cabecera con la franja, con el panel desplegado, en los anchos medianos (y el zoom al 110 %: 1375).
for (const ancho of [1100, 1280, 1375, 1440]) {
  const p = await abrir('#/prod/planta-viva/ceiba/curso', { ancho, panel: 'desplegado' })
  await foto(p, `cabecera-${ancho}-desplegado`, { clip: { x: 0, y: 0, width: ancho, height: 260 } })
  await p.context().close()
}
// 3. Sin escoger nada, a 1180 el panel arranca plegado.
{
  const p = await abrir('#/prod/planta-viva/ceiba/curso', { ancho: 1180 })
  await foto(p, 'cabecera-1180-sin-escoger', { clip: { x: 0, y: 0, width: 1180, height: 260 } })
  await p.context().close()
}
// 4. La lista de una cuenta de la franja, a 768 px (la franja va a la izquierda, debajo del título).
{
  const p = await abrir('#/prod/planta-viva/ceiba/curso', { ancho: 768, alto: 760 })
  await p.locator('header [data-franja] button:not([disabled])').first().click(); await p.waitForTimeout(300)
  await foto(p, 'franja-lista-768')
  await p.context().close()
}
// 5. Las rejillas: Confiabilidad a 1024 («Los más costosos») y Resultados a 900 («¿Está funcionando?»).
{
  const p = await abrir('#/conf/confiabilidad/morichal/curso', { ancho: 1024 })
  const t = p.locator('main div.grid').filter({ hasText: 'Los más costosos' }).first()
  await t.scrollIntoViewIfNeeded()
  await t.screenshot({ path: `${dir}/${cuando}-confiabilidad-1024.png` })
  await p.context().close()
}
{
  const p = await abrir('#/ger/resultados/ceiba/curso', { ancho: 900 })
  const t = p.locator('main [data-funcionando]').locator('xpath=..')
  await t.scrollIntoViewIfNeeded()
  await t.screenshot({ path: `${dir}/${cuando}-funcionando-900.png` })
  await p.context().close()
}
await b.close()
