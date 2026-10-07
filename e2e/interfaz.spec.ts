// De punta a punta en el navegador: los diálogos apilados, el foco que no se
// pierde, las paradas de Tab del dibujo de Planta y el contraste de «SIN FLUJO».
import { expect, test as base, type Page } from '@playwright/test'
import { test } from './apoyo.ts'

/** Dónde está el foco: dentro de qué diálogo, o el nombre de la etiqueta. */
const foco = (page: Page) => page.evaluate(() => {
  const a = document.activeElement
  if (!a || a === document.body) return 'BODY'
  const d = a.closest('[role=dialog]')
  return d ? `dialogo:${d.getAttribute('aria-label') ?? (d.hasAttribute('data-panel-equipo') ? 'ficha' : '?')}` : a.tagName
})

// Sin marcar la introducción como vista: un rol nuevo que entra por un enlace
// compartido con equipo abre la introducción y la ficha a la vez. Antes cada
// una volvía `inert` a la otra y la aplicación no respondía (ni «Cerrar»).
for (const ancho of [390, 1280]) {
  base.describe(`${ancho} px`, () => {
    base.use({ viewport: { width: ancho, height: 860 }, isMobile: ancho < 600 })

    base('la introducción y la ficha abiertas a la vez: se usa y se cierra todo', async ({ page }) => {
      const errores: string[] = []
      page.on('pageerror', e => errores.push(e.message))
      await page.goto('/#/sup/bombas/ceiba/curso/P-201B')
      const intro = page.locator('[role=dialog][aria-label="Introducción"]')
      const ficha = page.locator('[data-panel-equipo]')
      await expect(intro, 'la introducción del rol nuevo se abre').toBeVisible()
      await expect(ficha, 'la ficha de P-201B, que viene en la dirección, también').toBeVisible()

      // Arriba está la introducción (z-160): solo ella aísla; la ficha queda detrás.
      await expect.poll(() => intro.evaluate(e => !e.closest('[inert]')), { message: 'la introducción no queda inerte' }).toBe(true)
      await expect.poll(() => ficha.evaluate(e => !!e.closest('[inert]')), { message: 'la ficha, debajo, sí' }).toBe(true)
      await expect.poll(() => foco(page), { message: 'el foco está en la introducción' }).toBe('dialogo:Introducción')
      for (let i = 0; i < 6; i++) await page.keyboard.press('Tab')
      expect(await foco(page), 'Tab da la vuelta dentro de la introducción').toBe('dialogo:Introducción')

      // Se usa: pasar de paso y cerrar con su botón.
      await intro.getByRole('button', { name: /Siguiente/ }).click()
      await intro.getByRole('button', { name: 'Cerrar' }).click()
      await expect(intro, '«Cerrar» de la introducción la cierra').toHaveCount(0)

      // El control vuelve a la ficha, que ahora aísla y tiene el foco.
      await expect.poll(() => ficha.evaluate(e => !e.closest('[inert]')), { message: 'la ficha deja de estar inerte' }).toBe(true)
      await expect.poll(() => foco(page), { message: 'el foco pasa a la ficha' }).toBe('dialogo:ficha')
      expect(await page.locator('main').evaluate(e => !!e.closest('[inert]')), 'la pantalla sigue detrás de la ficha').toBe(true)
      await ficha.getByRole('button', { name: 'Cerrar' }).first().click()
      await expect(ficha, '«Cerrar» de la ficha la cierra').toHaveCount(0)

      expect(await page.evaluate(() => document.querySelectorAll('[inert]').length), 'no queda nada inerte').toBe(0)
      await page.locator('main button').filter({ visible: true }).first().click()
      expect(errores, 'sin errores de la página').toEqual([])
    })
  })
}

base('con los dos abiertos, Escape cierra el de arriba y después el de abajo', async ({ page }) => {
  await page.goto('/#/sup/bombas/ceiba/curso/P-201B')
  const intro = page.locator('[role=dialog][aria-label="Introducción"]')
  const ficha = page.locator('[data-panel-equipo]')
  await expect(intro).toBeVisible(); await expect(ficha).toBeVisible()
  await expect.poll(() => foco(page)).toBe('dialogo:Introducción')
  await page.keyboard.press('Escape')
  await expect(intro, 'el primer Escape cierra la introducción').toHaveCount(0)
  await expect(ficha, 'y no la ficha de debajo').toBeVisible()
  await expect.poll(() => foco(page)).toBe('dialogo:ficha')
  await page.keyboard.press('Escape')
  await expect(ficha, 'el segundo Escape cierra la ficha').toHaveCount(0)
  expect(await page.evaluate(() => document.querySelectorAll('[inert]').length)).toBe(0)
})

test('el foco no se pierde cuando la ficha cambia de equipo', async ({ flujo: f }) => {
  // LC-08 lo cerró la bomba: su detalle enlaza a P-201B dentro de la misma ficha.
  await f.abrir('/#/prod/pozos/ceiba/curso/LC-08')
  const ficha = f.page.locator('[data-panel-equipo]')
  await expect(ficha).toBeVisible()
  const ver = ficha.getByRole('button', { name: 'Ver P-201B' })
  await expect(ver, 'el detalle del pozo ofrece ver la bomba que lo cerró').toBeVisible()
  await ver.focus(); await f.page.keyboard.press('Enter')
  await expect(ficha.locator('h2'), 'la ficha pasa a la bomba').toContainText(/P-201B|bomba/i)
  await expect.poll(() => foco(f.page), { message: 'el foco queda en la ficha, no en BODY' }).toBe('dialogo:ficha')
  f.cerrar()
})

test('las tuberías del dibujo de Planta no son paradas de Tab; «SIN FLUJO» se lee y lleva forma', async ({ flujo: f }) => {
  await f.page.addInitScript(() => localStorage.setItem('trim.tema', 'dark'))
  await f.abrir('/#/conf/planta/ceiba/curso')
  const dibujo = f.page.locator('main svg[role=group]').first()
  const lineas = dibujo.locator('[data-linea]')
  f.ok(await lineas.count() > 0, 'el dibujo tiene tuberías')
  f.ok(await dibujo.locator('[data-linea][tabindex]').count() === 0, 'ninguna tubería recibe el foco')
  f.ok(await lineas.evaluateAll(ls => ls.every(l => l.getAttribute('role') === 'img' && (l.getAttribute('aria-label') ?? '').length > 0)), 'cada tubería sigue con su nombre para el lector')
  const paradas = await dibujo.locator('[tabindex="0"]').count()
  f.ok(paradas < 20, `las paradas de Tab del dibujo son los equipos, no las tuberías (${paradas})`)

  // ISA-101: el texto en tinta (≥ 4,5:1 sobre su recuadro) y el color en una forma.
  const sinFlujo = await f.page.evaluate(() => {
    const lum = (c: string) => {
      const [r, g, b] = (c.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number).map(x => x / 255).map(q => (q <= 0.03928 ? q / 12.92 : ((q + 0.055) / 1.055) ** 2.4))
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
    }
    return [...document.querySelectorAll('main svg text')].filter(t => t.textContent === 'SIN FLUJO').map(t => {
      const caja = t.parentElement!.querySelector('rect:not([fill=transparent])')!
      const [a, b] = [lum(getComputedStyle(t).fill), lum(getComputedStyle(caja).fill)].sort((x, y) => y - x)
      return { razon: (a! + 0.05) / (b! + 0.05), forma: !!t.parentElement!.querySelector('svg path, svg rect') }
    })
  })
  f.ok(sinFlujo.length > 0, `La Ceiba tiene tuberías sin flujo (P-201B detenida): ${sinFlujo.length}`)
  f.ok(sinFlujo.every(s => s.razon >= 4.5), `«SIN FLUJO» da 4,5:1 en oscuro (${sinFlujo.map(s => s.razon.toFixed(2)).join(', ')})`)
  f.ok(sinFlujo.every(s => s.forma), '«SIN FLUJO» lleva la forma de la prioridad del equipo que paró')
  f.cerrar()
})

test.describe('390 px', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true })

  test('el último toque del chat de WhatsApp deja el foco en el aviso «Respondido»', async ({ flujo: f }) => {
    await f.abrir('/#/oper/causa/ceiba/curso')
    f.ok(await f.clic('Ver mi chat de WhatsApp'), 'abre su chat de WhatsApp')
    const chat = f.page.getByRole('group', { name: /^Chat de WhatsApp de / })
    await expect(chat).toBeVisible()
    // Con el teclado, como en el hallazgo: foco en la respuesta y Enter.
    await chat.getByRole('button', { name: /^1\s*Sello mecánico/ }).focus(); await f.page.keyboard.press('Enter')
    const vio = chat.getByRole('button', { name: /^1\s*Fuga hacia afuera/ })
    await expect(vio, 'TRIM pregunta qué vio').toBeVisible()
    f.ok(await vio.evaluate(b => b === document.activeElement), 'el paso intermedio deja el foco en la primera respuesta nueva')
    await f.page.keyboard.press('Enter')
    await expect(chat, 'la respuesta cierra la conversación y la tarjeta sale de «por identificar»').toHaveCount(0)
    const donde = await f.page.evaluate(() => {
      const a = document.activeElement
      return a === document.body ? 'BODY' : `${a?.getAttribute('role')}: ${a?.textContent ?? ''}`
    })
    f.ok(/^status: Respondido: P-201B \(por WhatsApp/.test(donde), `el foco queda en el aviso de la respuesta, que sigue en la página (${donde})`)
    f.cerrar()
  })
})
