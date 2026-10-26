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
      // Exacto: un nombre de pantalla de la lista también dice «cerrar» («…en qué orden cerrar pozos»).
      await intro.getByRole('button', { name: 'Cerrar', exact: true }).click()
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
  // LC-16 lo cerró la bomba: su detalle enlaza a P-201B dentro de la misma ficha.
  await f.abrir('/#/prod/pozos/ceiba/curso/LC-16')
  const ficha = f.page.locator('[data-panel-equipo]')
  await expect(ficha).toBeVisible()
  const ver = ficha.getByRole('button', { name: 'Ver P-201B' })
  await expect(ver, 'el detalle del pozo ofrece ver la bomba que lo cerró').toBeVisible()
  await ver.focus(); await f.page.keyboard.press('Enter')
  await expect(ficha.locator('h2'), 'la ficha pasa a la bomba').toContainText(/P-201B|bomba/i)
  await expect.poll(() => foco(f.page), { message: 'el foco queda en la ficha, no en BODY' }).toBe('dialogo:ficha')
  f.cerrar()
})

test('las tuberías del dibujo de Planta no son paradas de Tab; el tren de agua sigue con flujo con P-201B detenida', async ({ flujo: f }) => {
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
  // P-201B es una de tres bombas en paralelo: con ella detenida, P-201A y P-201C siguen sacando
  // el agua hacia los inyectores. El conjunto lleva la marca de P-201B y dice cuál paró.
  f.ok(sinFlujo.length === 0, `La Ceiba no dibuja tuberías «SIN FLUJO»: el agua sigue llegando a los inyectores (${sinFlujo.length})`)
  f.ok(sinFlujo.every(s => s.razon >= 4.5 && s.forma), '«SIN FLUJO», donde salga, da 4,5:1 en oscuro y lleva la forma de la prioridad')
  const bombas = dibujo.locator('[data-nodo="bomba"]')
  f.ok(/P-201B · detenido/.test(await bombas.getAttribute('aria-label') ?? '') && /Prioridad 1/.test(await bombas.getAttribute('aria-label') ?? '')
    && await bombas.locator('svg path').count() > 0, 'el conjunto de bombas de agua dice que P-201B está detenida y lleva la marca de prioridad 1')
  const haciaInyectores = await lineas.evaluateAll(ls => ls.map(l => l.getAttribute('aria-label') ?? '').filter(x => x.includes('→ Pozos inyectores')))
  f.ok(haciaInyectores.length > 0 && haciaInyectores.every(x => x.includes('Estado: corriendo')), 'la tubería de las bombas a los inyectores sigue corriendo')
  f.cerrar()
})

test.describe('390 px', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true })

  test('el último toque del chat de WhatsApp deja el foco en el aviso «Respondido», con el chat abierto', async ({ flujo: f }) => {
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
    // B-05: el chat no se cierra al contestar: el cierre «Así queda…» llega en el mismo hilo, y la tarjeta sale de «Por contestar».
    await expect(chat, 'el chat sigue abierto, con el cierre en el mismo hilo').toContainText('Así queda lo que usted contestó')
    const donde = await f.page.evaluate(() => {
      const a = document.activeElement
      return a === document.body ? 'BODY' : `${a?.getAttribute('role')}: ${a?.textContent ?? ''}`
    })
    f.ok(/^status: Respondido: P-201B \(por WhatsApp/.test(donde), `el foco queda en el aviso de la respuesta, que sigue en la página (${donde})`)
    f.cerrar()
  })
})

// Menos texto: la producción y el diferido se leen como barra contra la meta.
// Las aserciones de texto del auditor pasan aunque falte la barra (no tiene
// texto): aquí se cuentan las barras y se mira que cada una tenga su raya.
test('el resumen del gerente mide contra la meta con barras', async ({ flujo: f }) => {
  await f.abrir('/#/ger/resumen/ceiba~portafolio/curso')
  const barras = await f.page.evaluate(() => [...document.querySelectorAll('main [data-barra]')].map(b => ({
    raya: !!b.querySelector('[data-raya]'),
    relleno: (b.querySelector('[data-relleno]') as HTMLElement | null)?.getBoundingClientRect().width ?? -1,
  })))
  // 2 del promedio diario + 2 del cierre proyectado + 2 por cada uno de los 5 campos.
  f.ok(barras.length === 14, `14 barras en el resumen del portafolio (${barras.length})`)
  f.ok(barras.every(b => b.raya && b.relleno >= 0), 'cada barra tiene su raya de meta y su relleno')
  f.ok((barras[0]?.relleno ?? 0) > 0, 'la producción del día llena su barra')
  f.cerrar()
})

// Lo que la pantalla deja en un ⓘ o detrás de «ver N más» sale escrito en el
// papel: el informe es la pantalla impresa y en el papel no hay globos.
test('en el papel salen los ⓘ, los globos de cada fila y las filas escondidas', async ({ flujo: f }) => {
  await f.abrir('/#/jefe/riesgo/ceiba~portafolio/curso')
  await f.page.emulateMedia({ media: 'print' })
  let t = await f.textoPagina()
  f.ok(t.includes('Qué hacer · K-101:') && t.includes('Exposición:') && t.includes('Si falla hoy · '), 'Riesgo: el «qué hacer», el costo y su origen salen escritos')
  f.ok(t.includes('MPP-301') && !t.includes('ver 2 más'), 'Riesgo: las filas que «ver 2 más» esconde salen en el papel, y el botón no')
  f.ok(/salió de su banda normal|ya llegó a su alarma/.test(t), 'Riesgo: el porqué de cada fila (su globo) sale escrito')
  await f.page.emulateMedia({ media: 'screen' })
  await f.ir('#/ger/resumen/ceiba~portafolio/curso')
  await f.page.emulateMedia({ media: 'print' })
  t = await f.textoPagina()
  f.ok(t.includes('Cierre proyectado: Si todo sigue') && t.includes('Valor: Sin contar'), 'Resumen: los ⓘ salen escritos')
  f.ok(/A la fecha: [\d.]+ de [\d.]+ bbl/.test(t), 'Resumen: los totales a la fecha, que protege el folio, salen en el papel')
  await f.page.emulateMedia({ media: 'screen' })
  // «POR CAMPO» sale desplegado en el papel: los equipos de cada campo, con su parte del campo
  // («< 1 %», nunca «0 %») y, al final, los que fallaron sin costar crudo (P-201B de Guacamayo).
  await f.ir('#/ger/resumen/ceiba~portafolio/doce')
  await f.page.emulateMedia({ media: 'print' })
  t = await f.textoPagina()
  f.ok(/MN-41[\s\S]{0,80}bbl · \d+ %/.test(t) && t.includes('bbl · < 1 %') && !/bbl · 0 %/.test(t), 'Resumen: POR CAMPO sale desplegado, y lo menor de 1 % se dice «< 1 %»')
  f.ok(/P-201B\s+bomba de reinyección · 5 fallas · no costó crudo/.test(t), 'Resumen: el equipo que falló sin costar crudo sale al final de su campo')
  await f.page.emulateMedia({ media: 'screen' })
  await f.ir('#/sup/turno/ceiba/curso')
  await f.page.emulateMedia({ media: 'print' })
  t = await f.textoPagina()
  f.ok(t.includes('Jairo Peña') && t.includes('Se cerró porque'), 'Turno: a quién le llegó cada WhatsApp y la causa de las paradas nuevas salen escritos')

  // Identificar: «ver N más» esconde declaradas en la pantalla y en el papel salen todas.
  await f.page.emulateMedia({ media: 'screen' })
  await f.ir('#/jefe/causa/ceiba~portafolio/curso')
  const declaradas = () => f.page.evaluate(() => [...document.querySelectorAll('main [data-declarada]')].filter(e => e.checkVisibility()).length)
  const total = await f.page.evaluate(() => document.querySelectorAll('main [data-declarada]').length)
  const ocultas = Number((await f.texto()).match(/ver (\d+) más/)?.[1] ?? 0)
  f.ok(ocultas > 0 && await declaradas() === total - ocultas, `Identificar: «ver ${ocultas} más» esconde ${ocultas} de ${total} declaradas en la pantalla`)
  await f.page.emulateMedia({ media: 'print' })
  t = await f.textoPagina()
  f.ok(await declaradas() === total && !/ver \d+ más/.test(t), 'Identificar: en el papel salen todas las declaradas, y el botón no')
  f.ok(t.includes('Regla de operación: Un pozo o una bomba') && /pregunta: Jairo Peña/.test(t) && t.includes('Sin destinatario: Nadie de este campo')
    && t.includes('Por qué no alcanzó la señal:'), 'Identificar: la regla, a quién le llegó cada WhatsApp, el hueco de WhatsApp y el porqué de la señal salen escritos')

  // Diferidos del portafolio, 12 meses: el motivo de «no publicable» y todos los equipos van al papel.
  await f.page.emulateMedia({ media: 'screen' })
  await f.ir('#/ger/diferidos/ceiba~portafolio/doce')
  await f.page.emulateMedia({ media: 'print' })
  t = await f.textoPagina()
  f.ok(t.includes('Todavía no se puede publicar') && !/ver \d+ más/.test(t), 'Diferidos: por qué no se puede publicar y todas las filas, sin el botón')

  // Conectores, metas y permisos: lo que quedó en un ⓘ, un globo o detrás de «ver N más».
  await f.page.emulateMedia({ media: 'screen' })
  await f.ir('#/adm/conectores/ceiba/curso')
  await f.page.emulateMedia({ media: 'print' })
  t = await f.textoPagina()
  f.ok(t.includes('trim_orden_liberada') && t.includes('Avisos: Con su evidencia') && !/ver \d+ más/.test(t), 'Conectores: la plantilla escondida y el ⓘ de los avisos salen en el papel')
  await f.page.emulateMedia({ media: 'screen' })
  await f.ir('#/ger/configuracion/ceiba/curso')
  await f.page.emulateMedia({ media: 'print' })
  t = await f.textoPagina()
  f.ok(t.includes('Rige desde: 1 de oct de 2025') && t.includes('Desde cuándo rige: Lo que va del mes se medirá con lo nuevo'), 'Metas: desde cuándo rige cada meta sale en el papel')
  await f.page.emulateMedia({ media: 'screen' })
  await f.ir('#/adm/perfil/ceiba/curso')
  await f.page.emulateMedia({ media: 'print' })
  t = await f.textoPagina()
  f.ok(t.includes('Firmar la configuración técnica: tanques, respaldos de bombas'), 'Mi perfil: el nombre completo de cada permiso sale en el papel')

  // Planta: el contenido de «Capacidad por tren» sale en el papel, y no el control.
  await f.page.emulateMedia({ media: 'screen' })
  await f.ir('#/prod/planta/ceiba/curso')
  await f.page.emulateMedia({ media: 'print' })
  t = await f.textoPagina()
  f.ok(/Capacidad por tren[\s\S]{0,60}Crudo/.test(t) && !t.includes('▾'), 'Planta: la capacidad por tren sale escrita y el desplegable no')

  // El papel de la demostración lo dice (también sin folio, con su período).
  await f.page.emulateMedia({ media: 'screen' })
  await f.ir('#/ger/resumen/ceiba~portafolio/curso')
  await f.page.emulateMedia({ media: 'print' })
  t = await f.textoPagina()
  f.ok(t.includes('DATOS DE DEMOSTRACIÓN'), 'el membrete marca los datos de demostración')
  f.ok(t.includes('Impresión sin folio') && /Portafolio · Octubre, en curso · \d+ de \w+ de \d{4} a/.test(t), 'el membrete sin folio lleva el período')
  await f.page.emulateMedia({ media: 'screen' })
  f.cerrar()
})

// Un período parcial lo dice en la cabecera (ya no existe el chip «PERÍODO EN CURSO»).
test('año a la fecha: la cabecera dice que está en curso', async ({ flujo: f }) => {
  await f.abrir('/#/ger/resumen/ceiba~portafolio/ytd')
  // «en curso» lleva espacio duro (no se parte en el teléfono): se compara normalizado.
  const etiqueta = (await f.page.locator('header button[aria-label^="Período"]').first().getAttribute('aria-label'))?.replace(/\u00a0/g, ' ')
  f.ok(etiqueta === 'Período: Año a la fecha, en curso', `el botón dice «en curso» (${etiqueta})`)
  f.cerrar()
})

// Introducción: un segundo Enter no se salta la lista de pantallas.
base('introducción: tras «Siguiente» el foco va a la primera pantalla', async ({ page }) => {
  await page.goto('/#/sup/bombas/ceiba/curso')
  const intro = page.locator('[role=dialog][aria-label="Introducción"]')
  await intro.getByRole('button', { name: /Siguiente/ }).focus(); await page.keyboard.press('Enter')
  await expect.poll(() => page.evaluate(() => document.activeElement?.closest('[role=dialog]') ? (document.activeElement?.textContent ?? '') : '')).not.toBe('')
  expect(await page.evaluate(() => document.activeElement?.tagName), 'el foco queda en un botón de la lista de pantallas').toBe('BUTTON')
  expect(await page.evaluate(() => /Siguiente|Cerrar/.test(document.activeElement?.textContent ?? '')), 'y no en «Siguiente» ni «Cerrar»').toBe(false)
})

// En el teléfono el período se ve entero (antes el subtítulo lo cortaba y el calendario era solo un ícono).
for (const ancho of [390, 320]) {
  base(`teléfono ${ancho} px: la cabecera dice el período sin cortarlo`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 860 })
    await page.addInitScript(() => localStorage.setItem('trim.intro.ger', '1'))
    await page.goto('/#/ger/resumen/ceiba~portafolio/curso')
    // C1 (experiencia v2): el período va en su píldora de la cabecera, con su texto entero también en
    // el teléfono, y la marca de demostración al lado de las migas. «en curso» lleva espacio duro (\s lo incluye).
    const periodo = page.locator('header button[aria-label^="Período"]').filter({ visible: true }).first()
    await expect(periodo).toContainText(/,\s+en\s+curso/)
    expect(await periodo.evaluate(e => e.scrollWidth <= e.clientWidth + 1 && e.getBoundingClientRect().right <= innerWidth + 1), 'el período no se corta ni se sale').toBe(true)
    await expect(page.locator('header').first()).toContainText(/DEMO/)
  })
}

// Planta en el teléfono: el tanque de agua (cerca de su alto-alto) se ve sin abrir «ver N más».
base('teléfono: Planta muestra el tanque de agua sin «ver más»', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 860 })
  await page.addInitScript(() => localStorage.setItem('trim.intro.prod', '1'))
  await page.goto('/#/prod/planta/ceiba/curso')
  await expect(page.locator('main')).toContainText('CAPTURANDO DATOS')
  const visibles = await page.evaluate(() => (document.querySelector('main') as HTMLElement).innerText)
  expect(visibles, 'el tanque de agua de La Ceiba está a la vista').toContain('TK-AG-CE')
})
