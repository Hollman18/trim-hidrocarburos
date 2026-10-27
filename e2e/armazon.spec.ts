// C1 · Identidad y armazón (experiencia v2): el panel lateral azul con las
// puertas de cada rol y sus subpantallas adentro, ninguna pestaña horizontal,
// la cabecera con la franja de condiciones y, en el teléfono, la banda índigo
// con el ☰ que abre el mismo panel desde la izquierda (X5 §4; CONSTRUCCION.md).
import { test } from './apoyo.ts'

/** Lo que dice cada puerta del panel, en su orden. */
const puertas = (f: { page: import('@playwright/test').Page }) => f.page.evaluate(() =>
  [...document.querySelectorAll('nav[aria-label="Navegación"] [role=group][aria-label="Puertas"] > div > button')].map(b => b.textContent?.replace(/\d+ por hacer en Hoy/, '').trim()))

test('el panel lateral: las puertas de cada rol, sus subpantallas adentro y ninguna pestaña', async ({ flujo: f }) => {
  await test.step('Cada rol ve sus puertas, en el orden fijo, y abre en su respuesta', async () => {
    const casos: Array<[string, string, string[]]> = [
      // C4: el gerente tiene su Equipos (la versión ejecutiva) y confiabilidad abre en Equipos (X4 §3.4).
      ['ger', 'planta-viva', ['La planta viva', 'Equipos', 'Resultados']],
      ['conf', 'equipos', ['Hoy', 'La planta viva', 'Equipos', 'Resultados']],
      ['sup', 'hoy', ['Hoy', 'La planta viva', 'Equipos']],
      ['prod', 'planta-viva', ['Hoy', 'La planta viva', 'Equipos', 'Resultados']],
      ['reg', 'regulatorio', ['Reporte', 'La planta viva', 'Resultados']], // C5: su Resultados (lo anotó C4 al correr esta prueba)
      ['adm', 'configuracion', ['Configurar', 'La planta viva']],
    ]
    for (const [rol, inicio, esperadas] of casos) {
      await f.abrir(`/#/${rol}/x/ceiba/curso`)
      const h = await f.hash(), p = await puertas(f)
      f.ok(h.startsWith(`#/${rol}/${inicio}/`), `${rol}: una pantalla que no tiene lleva a su inicio, ${inicio} (${h})`)
      f.ok(p.join(' · ') === esperadas.join(' · '), `${rol}: ${p.join(' · ')}`)
    }
  })

  await test.step('Las subpantallas van en el panel, debajo de su puerta; arriba no hay pestañas', async () => {
    await f.abrir('/#/sup/bombas/ceiba/curso')
    const subs = await f.page.evaluate(() => [...document.querySelectorAll('nav [data-subpantallas] button')].map(b => b.textContent?.trim()))
    // F1 (UI-23): la primera subpantalla, que repite el nombre de su puerta, no se lista: la abre la puerta.
    f.ok(subs.join(',') === 'Bombas,Electrosumergibles,Pozos', `Equipos del supervisor, adentro del panel: ${subs.join(', ')}`)
    const arriba = await f.page.evaluate(() => document.querySelectorAll('main [data-subpantallas], main > [role=tablist], header [role=tablist]').length)
    f.ok(arriba === 0, 'ninguna barra de subpantallas en el contenido ni en la cabecera')
    f.ok((await f.hash()).startsWith('#/sup/bombas/ceiba/'), 'la dirección de antes (#/sup/bombas/…) sigue abriendo')
    f.ok(await f.clic('Pozos'), 'escoge Pozos en el panel'); await f.esperar(500)
    f.ok((await f.hash()).startsWith('#/sup/pozos/'), 'y se abre')
  })

  await test.step('«[» pliega y despliega el panel, y se recuerda', async () => {
    await f.abrir('/#/ger/planta-viva/ceiba/curso')
    const ancho = () => f.page.evaluate(() => Math.round(document.querySelector('aside')?.getBoundingClientRect().width ?? 0))
    const antes = await ancho()
    await f.page.locator('main h1').click()
    await f.page.keyboard.press('['); await f.esperar(450)
    const plegado = await ancho()
    await f.page.reload(); await f.esperar(900)
    const recordado = await ancho()
    await f.page.keyboard.press('['); await f.esperar(450)
    f.ok(antes === 240 && plegado === 88 && recordado === 88 && await ancho() === 240, `240 → 88 (se recuerda al volver) → 240: ${antes}, ${plegado}, ${recordado}`)
  })
  f.cerrar()
})

test('la franja de condiciones: la cuenta del motor y su lista', async ({ flujo: f }) => {
  // F1 (H13): «sin comunicación» dice su alcance después del punto («TRIM todavía solo sabe…»).
  const franja = () => f.page.evaluate(() => [...document.querySelectorAll('header [data-franja] button')].map(b => (b.getAttribute('aria-label') ?? '').replace(': ver la lista', '').replace(/\. TRIM todavía.*$/, '')).join(' · '))
  await f.abrir('/#/ger/planta-viva/ceiba/curso')
  const ce = await franja()
  f.ok(ce === '2 alarmas · 2 en atención · 1 aviso · 0 sin comunicación', `La Ceiba: ${ce}`)
  f.ok(await f.clic('2 alarmas: ver la lista'), 'abre la lista de las alarmas'); await f.esperar(300)
  const lista = await f.page.evaluate(() => document.querySelector('header [data-franja] [role=group]')?.textContent ?? '')
  f.ok(lista.includes('P-201B') && lista.includes('K-101') && lista.includes('1.665'), `la lista dice cuáles y cuánto dejan de producir (${lista.slice(0, 120)})`)
  await f.page.locator('header [data-franja] [role=group] button', { hasText: 'P-201B' }).click(); await f.esperar(600)
  f.ok(await f.page.locator('[data-panel-equipo]').count() > 0, 'cada fila abre el equipo')
  await f.abrir('/#/ger/planta-viva/ceiba~portafolio/curso')
  const todos = await franja()
  f.ok(todos === '4 alarmas · 8 en atención · 2 avisos · 0 sin comunicación', `todos sus campos: ${todos}`)
  f.cerrar()
})

test.describe('en el teléfono', () => {
  test.use({ viewport: { width: 390, height: 844 } })
  test('390 px: la banda índigo y el mismo panel, desde la izquierda; sin barra abajo', async ({ flujo: f }) => {
    await f.abrir('/#/sup/hoy/ceiba/curso')
    const panelFijo = await f.page.evaluate(() => !!document.querySelector('aside') && getComputedStyle(document.querySelector('aside')!).display !== 'none')
    f.ok(!panelFijo, 'en el teléfono no queda el panel fijo')
    const abajo = await f.page.evaluate(() => [...document.querySelectorAll('nav, [role=navigation]')].some(n => { const r = n.getBoundingClientRect(); return r.height > 0 && r.bottom >= innerHeight - 2 && r.top > innerHeight / 2 }))
    f.ok(!abajo, 'ninguna barra de navegación abajo')
    f.ok(await f.clic('Abrir la navegación'), 'el ☰ abre el panel'); await f.esperar(400)
    const panel = await f.page.evaluate(() => { const d = document.querySelector('[role=dialog][aria-label="Navegación"]'); const r = d?.getBoundingClientRect(); return r ? { x: Math.round(r.left), w: Math.round(r.width) } : null })
    f.ok(!!panel && panel.x === 0 && Math.abs(panel.w - 390 * 0.84) < 2, `desde la izquierda, al 84 % del ancho (${JSON.stringify(panel)})`)
    f.ok((await puertas(f)).join(' · ') === 'Hoy · La planta viva · Equipos', 'las mismas puertas del escritorio, en el mismo orden')
    await f.page.locator('[role=dialog] button', { hasText: 'La planta viva' }).first().click(); await f.esperar(600)
    f.ok((await f.hash()).startsWith('#/sup/planta-viva/') && await f.page.locator('[role=dialog][aria-label="Navegación"]').count() === 0, 'escoger una puerta la abre y cierra el panel')
    f.cerrar()
  })
})
