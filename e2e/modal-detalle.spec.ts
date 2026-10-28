/* D1 · El detalle como modal y el panel lateral (el dueño, 27-oct, con capturas).
   - El modal de detalle (`shared/ui/Modal`): la ficha de P-201B del gerente, la trazabilidad de un tramo del
     balance y la hoja del tramo de La planta viva. Centrado, de 720 a 880 px, con la cabecera fija y el
     contenido que se desplaza adentro; velo; role="dialog", aria-modal y aria-labelledby; el foco entra y
     se queda adentro; Escape y tocar afuera lo cierran y el foco vuelve a quien lo abrió; entra en 200 ms
     o menos y sin moverse con «menos movimiento»; en el teléfono, hoja casi completa desde abajo.
   - Los menús del panel lateral (la persona y el selector de campo) no se recortan: van en un portal, con
     su ancho, dentro de la pantalla, sin texto partido, a 1440, 1280, 1024 (plegado) y 390 px (banda y ☰).
   Cada prueba falla sin el cambio: antes la ficha era un panel no modal pegado a la derecha y los menús
   vivían dentro del panel, que los recortaba («Operad…», «Sistema · Claro · O…») o los apretaba. */
import { expect, type Locator, type Page } from '@playwright/test'
import { test } from './apoyo.ts'

const tab = (page: Page, atras = false) => page.keyboard.press(`${page.context().browser()?.browserType().name() === 'webkit' ? 'Alt+' : ''}${atras ? 'Shift+' : ''}Tab`)
/** Espera a que termine la entrada (≤ 200 ms) para medir el lugar final. */
const quieto = (page: Page) => page.waitForFunction(() => document.getAnimations().every(a => a.playState !== 'running'))
const dentro = (page: Page, sel: string) => page.evaluate(s => !!document.activeElement && !!document.querySelector(s)?.contains(document.activeElement), sel)

/** Lo que dice el modal de sí mismo: su nombre, su caja, su cabecera y su cuerpo. */
const medir = (modal: Locator) => modal.evaluate(d => {
  const caja = d.querySelector('[data-modal-caja]')!.getBoundingClientRect()
  const cab = d.querySelector('[data-modal-cabecera]')!, cuerpo = d.querySelector<HTMLElement>('[data-modal-cuerpo]')!
  const titulo = document.getElementById(d.getAttribute('aria-labelledby') ?? '')
  const t = getComputedStyle(d.querySelector('[data-modal-caja]')!).transitionDuration.split(',').map(x => parseFloat(x) * (x.trim().endsWith('ms') ? 1 : 1000))
  return {
    rol: d.getAttribute('role'), modal: d.getAttribute('aria-modal'), titulo: titulo?.textContent?.trim() ?? '', tituloAdentro: !!titulo && d.contains(titulo),
    izq: caja.left, der: innerWidth - caja.right, arriba: caja.top, abajo: innerHeight - caja.bottom, ancho: caja.width, alto: caja.height,
    cabeceraArriba: cab.getBoundingClientRect().top, desplaza: cuerpo.scrollHeight > cuerpo.clientHeight, ms: Math.max(...t),
    velo: !!d.querySelector('[data-velo]'), atrasInerte: !!document.querySelector('main')?.closest('[inert]'),
  }
})

/** Abre con el teclado (Safari no le da el foco a un botón con un clic) y comprueba lo de todo modal de escritorio. */
async function probarModal(page: Page, abrir: Locator, sel: string, nombre: RegExp) {
  await abrir.focus()
  await page.keyboard.press('Enter')
  const modal = page.locator(sel)
  await expect(modal).toBeVisible()
  const ms = (await medir(modal)).ms
  await quieto(page)
  const m = { ...(await medir(modal)), ms }
  expect.soft(m.rol === 'dialog' && m.modal === 'true' && m.tituloAdentro, 'role="dialog", aria-modal y aria-labelledby a su título').toBe(true)
  expect.soft(m.titulo, 'el nombre del diálogo es su título').toMatch(nombre)
  expect.soft(Math.abs(m.izq - m.der) <= 2 && Math.abs(m.arriba - m.abajo) <= 2, `centrado (${Math.round(m.izq)}/${Math.round(m.der)} · ${Math.round(m.arriba)}/${Math.round(m.abajo)})`).toBe(true)
  expect.soft(m.ancho >= 720 && m.ancho <= 880, `de 720 a 880 px (${Math.round(m.ancho)})`).toBe(true)
  expect.soft(m.arriba >= 24 && m.abajo >= 24, 'cabe en la pantalla, con aire').toBe(true)
  expect.soft(m.velo && m.atrasInerte, 'velo detrás y lo de atrás inerte').toBe(true)
  expect.soft(m.ms > 0 && m.ms <= 200, `entra en 200 ms o menos (${m.ms})`).toBe(true)
  await expect.poll(() => dentro(page, sel), { message: 'el foco entra al abrir' }).toBe(true)
  // El foco se queda adentro: ni hacia adelante ni hacia atrás sale del modal.
  for (let i = 0; i < 14; i++) await tab(page)
  expect.soft(await dentro(page, sel), 'Tab no saca el foco del modal').toBe(true)
  for (let i = 0; i < 6; i++) await tab(page, true)
  expect.soft(await dentro(page, sel), 'Mayús+Tab tampoco').toBe(true)
  // La cabecera es fija: el cuerpo se desplaza y ella no se mueve.
  if (m.desplaza) {
    await modal.locator('[data-modal-cuerpo]').evaluate(e => { e.scrollTop = 400 })
    const despues = await medir(modal)
    expect.soft(Math.abs(despues.cabeceraArriba - m.cabeceraArriba) <= 1, 'la cabecera queda fija mientras el contenido se desplaza').toBe(true)
  }
  // Escape desde el diálogo (un globo ⓘ abierto por el foco se cerraría primero con su propio Escape).
  await modal.focus()
  await page.keyboard.press('Escape')
  await expect(modal, 'Escape lo cierra').toHaveCount(0)
  await expect(abrir, 'el foco vuelve a quien lo abrió').toBeFocused()
  expect.soft(await page.evaluate(() => document.querySelectorAll('[inert]').length), 'no queda nada inerte').toBe(0)
  // Tocar afuera (el velo) también lo cierra, y el foco vuelve.
  await abrir.focus()
  await page.keyboard.press('Enter')
  await expect(modal).toBeVisible()
  await page.mouse.click(12, Math.round((page.viewportSize()?.height ?? 900) / 2))
  await expect(modal, 'tocar afuera lo cierra').toHaveCount(0)
  await expect(abrir).toBeFocused()
}

test.describe('1440 px', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('D1 · 1440 px · la ficha de P-201B del gerente es el modal de detalle', async ({ flujo: f }) => {
    await f.abrir('/#/ger/planta-viva/ceiba~portafolio/curso')
    await probarModal(f.page, f.page.locator('main [data-ver-que-se-hace="P-201B"]'), '[data-panel-equipo]', /Bomba multietapa/)
    // «Ampliar» la lleva casi a toda la pantalla, y «Contraer» la devuelve.
    await f.page.locator('main [data-ver-que-se-hace="P-201B"]').focus()
    await f.page.keyboard.press('Enter')
    const ficha = f.page.locator('[data-panel-equipo]')
    await ficha.getByRole('button', { name: 'Expandir' }).click()
    await quieto(f.page)
    const a = await medir(ficha)
    f.ok(a.ancho >= 1280 && a.arriba <= 24 && a.abajo <= 24, `ampliada, casi toda la pantalla (${Math.round(a.ancho)})`)
    await ficha.getByRole('button', { name: 'Contraer' }).click()
    f.ok((await medir(ficha)).ancho <= 880, 'contraída, otra vez de 880 o menos')
    f.cerrar()
  })

  test('D1 · 1440 px · la trazabilidad de un tramo del balance es el modal de detalle', async ({ flujo: f }) => {
    await f.abrir('/#/prod/planta-viva/ceiba/curso')
    await probarModal(f.page, f.page.locator('main [data-balance] [data-tramo-balance="planta"] button'), '[data-traza="planta"]', /^Planta$/)
    f.cerrar()
  })

  test('D1 · 1440 px · la hoja del tramo de La planta viva es el modal de detalle', async ({ flujo: f }) => {
    await f.abrir('/#/ger/planta-viva/ceiba/curso')
    await probarModal(f.page, f.page.locator('[data-tramo-kit="planta"]'), '[data-hoja-tramo="planta"]', /^Planta$/)
    f.cerrar()
  })

  test('D1 · 1440 px · con «menos movimiento», el modal entra sin moverse', async ({ flujo: f }) => {
    await f.page.emulateMedia({ reducedMotion: 'reduce' })
    await f.abrir('/#/ger/resultados/ceiba/curso/P-201B')
    const m = await medir(f.page.locator('[data-panel-equipo]'))
    f.ok(m.ms <= 1, `sin transición (${m.ms} ms)`)
    f.cerrar()
  })
})

test.describe('390 px', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('D1 · 390 px · en el teléfono el detalle es una hoja casi completa desde abajo, con su agarradera', async ({ flujo: f }) => {
    const { page } = f
    for (const [ruta, abrir, sel] of [
      ['/#/ger/planta-viva/ceiba~portafolio/curso', 'main [data-ver-que-se-hace="P-201B"]', '[data-panel-equipo]'],
      ['/#/prod/planta-viva/ceiba/curso', 'main [data-balance] [data-tramo-balance="planta"] button', '[data-traza="planta"]'],
      ['/#/ger/planta-viva/ceiba/curso', '[data-tramo-kit="planta"]', '[data-hoja-tramo="planta"]'],
    ] as const) {
      await f.abrir(ruta)
      const boton = page.locator(abrir).first()
      await boton.focus()
      await page.keyboard.press('Enter')
      const modal = page.locator(sel)
      await expect(modal).toHaveAttribute('data-modal', 'hoja')
      const m = await medir(modal)
      f.ok(m.abajo <= 1 && m.izq <= 0.5 && m.der <= 0.5, `${sel}: pegada abajo y a todo el ancho`)
      f.ok(m.alto >= 844 * 0.6 && m.arriba >= 40, `${sel}: casi completa (${Math.round(m.alto)} px), con una franja de velo arriba para tocar`)
      f.ok(m.modal === 'true' && m.atrasInerte && await modal.locator('[data-agarradera]').isVisible(), `${sel}: modal, lo de atrás inerte y la agarradera`)
      f.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${sel}: nada se sale de lado`)
      // Tocar el velo de arriba la cierra; el foco vuelve a quien la abrió.
      await page.mouse.click(195, 16)
      await expect(modal, `${sel}: tocar afuera la cierra`).toHaveCount(0)
      await expect(boton).toBeFocused()
      // La agarradera también, y «Cerrar».
      await boton.focus(); await page.keyboard.press('Enter')
      await modal.locator('[data-agarradera]').click()
      await expect(modal, `${sel}: la agarradera la cierra`).toHaveCount(0)
    }
    f.cerrar()
  })
})

/* ───── Los menús del panel lateral, sin recortes ───── */

/** El panel de un desplegable: dentro de la pantalla, con su ancho, y nada adentro recortado ni partido. */
const revisarMenu = (page: Page, sel: string) => page.evaluate(s => {
  const p = document.querySelector<HTMLElement>(s)
  if (!p) return { hay: false, fuera: true, ancho: 0, cortes: ['no se abrió'] }
  const r = p.getBoundingClientRect()
  const fuera = r.left < 0 || r.top < 0 || r.right > innerWidth + 0.5 || r.bottom > innerHeight + 0.5
  const cortes: string[] = []
  for (const e of p.querySelectorAll<HTMLElement>('b, span, small, button, p')) {
    if (!e.checkVisibility() || !(e.textContent ?? '').trim() || e.closest('.sr-only')) continue
    const c = e.getBoundingClientRect()
    // Recortado por algo: el centro de lo que se ve tiene que ser él (o algo suyo) y estar dentro del panel.
    if (c.left < r.left - 0.5 || c.right > r.right + 0.5) cortes.push(`se sale: ${e.textContent!.trim().slice(0, 30)}`)
    if (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible') cortes.push(`cortado: ${e.textContent!.trim().slice(0, 30)}`)
    const arriba = document.elementFromPoint(c.left + c.width / 2, c.top + c.height / 2)
    if (c.top >= 0 && c.bottom <= innerHeight && arriba && !p.contains(arriba)) cortes.push(`tapado: ${e.textContent!.trim().slice(0, 30)}`)
  }
  // Una fila por campo: el nombre, la región y la cifra, cada uno en un solo renglón.
  for (const f of p.querySelectorAll<HTMLElement>('[data-opcion-campo]')) {
    for (const x of f.querySelectorAll<HTMLElement>(':scope > span > span, :scope > span.tabular'))
      if (x.getClientRects().length > 1 || x.getBoundingClientRect().height > 26) cortes.push(`partido: ${x.textContent!.trim()}`)
  }
  return { hay: true, fuera, ancho: r.width, cortes }
}, sel)

for (const [ancho, alto] of [[1440, 900], [1280, 860], [1024, 800]] as const) {
  test.describe(`${ancho} px`, () => {
    test.use({ viewport: { width: ancho, height: alto } })
    test(`D1 · ${ancho} px · el menú de la persona y el selector de campo no se recortan`, async ({ flujo: f }) => {
      const { page } = f
      await f.abrir('/#/ger/planta-viva/ceiba~portafolio/curso')
      const nav = page.locator('aside nav[aria-label="Navegación"]')
      if (ancho === 1024) f.ok(await nav.locator('[data-compacto]').count() > 0, 'a 1024 px el panel arranca plegado (88 px)')
      // El selector de campo.
      await nav.locator('button[aria-label^="Campo"]').click()
      const campo = await revisarMenu(page, '[role=group][aria-label="Escoger campo"]')
      f.ok(campo.hay && !campo.fuera && campo.ancho >= 300 && campo.ancho <= 340, `campo: dentro de la pantalla, de 300 a 340 px (${Math.round(campo.ancho)})`)
      f.ok(campo.cortes.length === 0, `campo: nada recortado ni partido (${campo.cortes.join(' · ')})`)
      const primera = page.locator('[role=group][aria-label="Escoger campo"] [data-opcion-campo]').first()
      f.ok((await primera.innerText()).includes('Todos mis campos'), '«Todos mis campos» arriba')
      await page.keyboard.press('Escape')
      // El menú de la persona: nombre, rol y empresa enteros, y la apariencia de tres que cabe entera.
      await nav.locator('button[aria-label*=" · "]').first().click()
      const persona = await revisarMenu(page, '[role=group][aria-label="Mi perfil"]')
      f.ok(persona.hay && !persona.fuera && persona.ancho >= 300 && persona.ancho <= 340, `persona: dentro de la pantalla, de 300 a 340 px (${Math.round(persona.ancho)})`)
      f.ok(persona.cortes.length === 0, `persona: nada recortado (${persona.cortes.join(' · ')})`)
      const menu = page.locator('[role=group][aria-label="Mi perfil"]')
      await expect(menu).toContainText('Operadora de demostración')
      for (const t of ['Sistema', 'Claro', 'Noche']) await expect(menu.getByRole('button', { name: t })).toBeVisible()
      // Con el teclado: Tab desde el botón abierto entra al menú; Escape lo cierra y el foco vuelve al botón.
      const boton = nav.locator('button[aria-label*=" · "]').first()
      await boton.focus()
      await tab(page)
      f.ok(await dentro(page, '[role=group][aria-label="Mi perfil"]'), 'Tab desde el botón entra al menú')
      await page.keyboard.press('Escape')
      await expect(menu).toHaveCount(0)
      await expect(boton).toBeFocused()
      // Escoger un campo funciona desde el portal.
      await nav.locator('button[aria-label^="Campo"]').click()
      await page.locator('[role=group][aria-label="Escoger campo"] [data-opcion-campo="ceiba"]').click()
      await expect.poll(() => f.hash()).toContain('/ceiba/')
      await expect(page.locator('[role=group][aria-label="Escoger campo"]')).toHaveCount(0)
      f.cerrar()
    })
  })
}

test.describe('390 px', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  test('D1 · 390 px · los menús de la banda y del panel (☰) no se recortan', async ({ flujo: f }) => {
    const { page } = f
    await f.abrir('/#/ger/planta-viva/ceiba~portafolio/curso')
    for (const [abrir, menu] of [['[data-banda] button[aria-label^="Campo"]', 'Escoger campo'], ['[data-banda-persona] button', 'Mi perfil']] as const) {
      await page.locator(abrir).first().click()
      const r = await revisarMenu(page, `[role=group][aria-label="${menu}"]`)
      f.ok(r.hay && !r.fuera && r.ancho >= 300, `banda · ${menu}: dentro de la pantalla (${Math.round(r.ancho)} px)`)
      f.ok(r.cortes.length === 0, `banda · ${menu}: nada recortado (${r.cortes.join(' · ')})`)
      await page.keyboard.press('Escape')
    }
    await page.locator('[data-banda] button:has-text("Abrir la navegación")').click()
    const panel = page.locator('[role=dialog][aria-label="Navegación"]')
    await expect(panel).toBeVisible()
    // La X del panel va al borde derecho de su fila, no pegada al logo.
    const x = await panel.getByRole('button', { name: 'Cerrar la navegación' }).evaluate(b => {
      const n = b.closest('nav')!.getBoundingClientRect(), r = b.getBoundingClientRect(); return n.right - r.right
    })
    f.ok(x <= 20, `la X del panel, a la derecha (${Math.round(x)} px del borde)`)
    for (const [abrir, menu] of [['nav button[aria-label^="Campo"]', 'Escoger campo'], ['nav button[aria-label*=" · "]', 'Mi perfil']] as const) {
      await panel.locator(abrir).first().click()
      const r = await revisarMenu(page, `[role=group][aria-label="${menu}"]`)
      f.ok(r.hay && !r.fuera && r.ancho >= 300, `☰ · ${menu}: dentro de la pantalla (${Math.round(r.ancho)} px)`)
      f.ok(r.cortes.length === 0, `☰ · ${menu}: nada recortado (${r.cortes.join(' · ')})`)
      f.ok(await page.locator(`[role=dialog][aria-label="Navegación"] [role=group][aria-label="${menu}"]`).count() === 1, `☰ · ${menu}: dentro del diálogo del panel (no queda inerte)`)
      await page.keyboard.press('Escape')
      await expect(panel, 'Escape cierra el menú y no el panel').toBeVisible()
    }
    f.cerrar()
  })
})
