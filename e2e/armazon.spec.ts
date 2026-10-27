// C1 · Identidad y armazón: el panel lateral (claro desde la experiencia v3, decisión 5) con las
// puertas de cada rol y sus subpantallas adentro, ninguna pestaña horizontal,
// la cabecera con la franja de condiciones y, en el teléfono, la banda clara
// con el ☰ que abre el mismo panel desde la izquierda (X5 §4; CONSTRUCCION.md).
import { test } from './apoyo.ts'

/** Lo que dice cada puerta del panel, en su orden. */
const puertas = (f: { page: import('@playwright/test').Page }) => f.page.evaluate(() =>
  [...document.querySelectorAll('nav[aria-label="Navegación"] [role=group][aria-label="Puertas"] > div > button')].map(b => b.textContent?.replace(/\d+ por hacer en Hoy/, '').trim()))

test('el panel lateral: las puertas de cada rol, sus subpantallas adentro y ninguna pestaña', async ({ flujo: f }) => {
  await test.step('Cada rol ve sus puertas, en el orden fijo, y abre en su respuesta', async () => {
    // B3 · Experiencia v3 (flujos.md §2): las puertas que pasaron las tareas medidas. Con una sola
    // (oper, tec, reg y adm) no hay menú: el panel no lista ninguna puerta.
    const casos: Array<[string, string, string[]]> = [
      ['ger', 'planta-viva', ['La planta viva', 'Resultados']],
      ['conf', 'equipos', ['Equipos', 'Resultados']],
      ['sup', 'hoy', ['Hoy', 'Equipos']],
      ['jefe', 'hoy', ['Hoy', 'Equipos', 'Resultados']],
      ['prod', 'planta-viva', ['La planta viva', 'Resultados']],
      ['oper', 'hoy', []],
      ['tec', 'hoy', []],
      ['reg', 'regulatorio', []],
      ['adm', 'configuracion', []],
    ]
    for (const [rol, inicio, esperadas] of casos) {
      await f.abrir(`/#/${rol}/x/ceiba/curso`)
      const h = await f.hash(), p = await puertas(f)
      f.ok(h.startsWith(`#/${rol}/${inicio}/`), `${rol}: una pantalla que no tiene lleva a su inicio, ${inicio} (${h})`)
      f.ok(p.join(' · ') === esperadas.join(' · '), `${rol}: ${p.join(' · ')}`)
    }
  })

  await test.step('Las subpantallas van en el panel, debajo de su puerta; arriba no hay pestañas', async () => {
    // Confiabilidad: su Resultados es Confiabilidad (B-03), adentro del panel, debajo de su puerta.
    await f.abrir('/#/conf/confiabilidad/ceiba/curso')
    const subs = await f.page.evaluate(() => [...document.querySelectorAll('nav [data-subpantallas] button')].map(b => b.textContent?.trim()))
    f.ok(subs.join(',') === 'Confiabilidad', `Resultados de confiabilidad, adentro del panel: ${subs.join(', ')}`)
    const arriba = await f.page.evaluate(() => document.querySelectorAll('main [data-subpantallas], main > [role=tablist], header [role=tablist]').length)
    f.ok(arriba === 0, 'ninguna barra de subpantallas en el contenido ni en la cabecera')
    // A-15: Bombas y Electrosumergibles son filtros de Equipos; la dirección de antes abre Equipos con su filtro.
    await f.abrir('/#/sup/bombas/ceiba/curso')
    f.ok((await f.hash()).startsWith('#/sup/equipos/ceiba'), `la dirección de antes (#/sup/bombas/…) abre Equipos (${await f.hash()})`)
    f.ok((await f.texto()).includes('3 equipos'), 'con el filtro de las bombas puesto: 3 equipos')
    await f.abrir('/#/sup/turno/ceiba/curso')
    f.ok((await f.hash()).startsWith('#/sup/hoy/'), 'A-01: la dirección de Turno abre Hoy')
    await f.abrir('/#/jefe/mantenimiento/ceiba/curso')
    f.ok((await f.hash()).startsWith('#/jefe/hoy/'), 'A-12: la dirección de Mantenimiento abre el Hoy del jefe')
  })

  await test.step('A-22: la planeadora (apagada) y abastecimiento (salió) dicen que no están, sin abrir producción', async () => {
    for (const r of ['plan', 'cont']) {
      await f.page.goto(`/#/${r}/hoy/ceiba/curso`); await f.esperar(900)
      const t = await f.textoPagina()
      f.ok(t.includes('Este rol todavía no está disponible') && !t.includes('La planta viva') && (await f.hash()).startsWith(`#/${r}/`),
        `${r}: «Este rol todavía no está disponible», la dirección queda como vino (${await f.hash()})`)
    }
    f.ok(await f.clic('Entrar como'), 'y se puede entrar con el rol de siempre'); await f.esperar(600)
    f.ok(!(await f.hash()).startsWith('#/cont/'), `sale del aviso (${await f.hash()})`)
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
  test('390 px: la banda y el mismo panel, desde la izquierda; sin barra abajo', async ({ flujo: f }) => {
    await f.abrir('/#/sup/hoy/ceiba/curso')
    const panelFijo = await f.page.evaluate(() => !!document.querySelector('aside') && getComputedStyle(document.querySelector('aside')!).display !== 'none')
    f.ok(!panelFijo, 'en el teléfono no queda el panel fijo')
    const abajo = await f.page.evaluate(() => [...document.querySelectorAll('nav, [role=navigation]')].some(n => { const r = n.getBoundingClientRect(); return r.height > 0 && r.bottom >= innerHeight - 2 && r.top > innerHeight / 2 }))
    f.ok(!abajo, 'ninguna barra de navegación abajo')
    f.ok(await f.clic('Abrir la navegación'), 'el ☰ abre el panel'); await f.esperar(400)
    const panel = await f.page.evaluate(() => { const d = document.querySelector('[role=dialog][aria-label="Navegación"]'); const r = d?.getBoundingClientRect(); return r ? { x: Math.round(r.left), w: Math.round(r.width) } : null })
    f.ok(!!panel && panel.x === 0 && Math.abs(panel.w - 390 * 0.84) < 2, `desde la izquierda, al 84 % del ancho (${JSON.stringify(panel)})`)
    f.ok((await puertas(f)).join(' · ') === 'Hoy · Equipos', 'las mismas puertas del escritorio, en el mismo orden')
    await f.page.locator('[role=dialog] button', { hasText: 'Equipos' }).first().click(); await f.esperar(600)
    f.ok((await f.hash()).startsWith('#/sup/equipos/') && await f.page.locator('[role=dialog][aria-label="Navegación"]').count() === 0, 'escoger una puerta la abre y cierra el panel')
    f.cerrar()
  })
})
