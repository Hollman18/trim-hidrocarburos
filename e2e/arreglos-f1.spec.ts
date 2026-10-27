// F1 · Revisión total, fase 4 (PROMPT-REVISION-UX.md; R-revision/verificados-v1.md y -v2.md):
// el armazón (panel, banda, cabecera y franja), lo común (foco, toques, velo, avisos) y Hoy,
// Turno, Mi trabajo e Identificar. Cada prueba mira lo que ve la persona y falla sin su arreglo.
import { expect, test as base, type Page } from '@playwright/test'
import { test } from './apoyo.ts'

/** El color del anillo de foco del elemento que tiene el foco. */
/** Safari (WebKit) solo pasa con Tab por los campos de texto: a los enlaces y botones se llega
 *  con Option+Tab (o con «Usar Tab para resaltar cada elemento» en los ajustes). */
const tab = (page: Page) => page.keyboard.press(page.context().browser()?.browserType().name() === 'webkit' ? 'Alt+Tab' : 'Tab')

const anillo = (page: Page) => page.evaluate(() => {
  const a = document.activeElement as HTMLElement | null
  return a ? { color: getComputedStyle(a).outlineColor, estilo: getComputedStyle(a).outlineStyle, enNav: !!a.closest('nav[aria-label="Navegación"]') } : null
})

test.describe('armazón', () => {
  // Experiencia v3 (decisión 5): el panel es claro; el anillo es el del acento, que se ve sobre él (4,1:1).
  test('A1 · en el tema claro, el foco del teclado se ve sobre el panel (anillo del acento)', async ({ flujo: f }) => {
    const { page } = f
    await page.setViewportSize({ width: 1440, height: 900 })
    await f.abrir('/#/ger/planta-viva/ceiba/curso')
    let a = await anillo(page)
    for (let i = 0; i < 8 && !a?.enNav; i++) { await tab(page); a = await anillo(page) }
    f.ok(!!a?.enNav, 'el foco llega al panel con Tab')
    f.ok(a?.color === 'rgb(44, 115, 113)' && a.estilo !== 'none', `el anillo va en el acento sobre el panel claro (${a?.color}, ${a?.estilo})`)
    f.cerrar()
  })

  test('UI-02 · 390 px: tocar afuera del panel lo cierra (el velo no queda inerte)', async ({ flujo: f }) => {
    const { page } = f
    await page.setViewportSize({ width: 390, height: 844 })
    await f.abrir('/#/sup/hoy/ceiba/curso')
    await page.getByRole('button', { name: 'Abrir la navegación' }).click()
    await expect(page.locator('[role=dialog][aria-label="Navegación"]')).toBeVisible()
    await f.esperar(300)
    await page.mouse.click(375, 500)
    await expect(page.locator('[role=dialog][aria-label="Navegación"]'), 'un toque afuera lo cierra').toHaveCount(0)
    f.cerrar()
  })

  test('UI-06 · plegado, cada subpantalla lleva su nombre; y Diferidos y Confiabilidad tienen íconos distintos', async ({ flujo: f }) => {
    const { page } = f
    await page.setViewportSize({ width: 1440, height: 900 })
    await f.abrir('/#/jefe/resultados/ceiba/curso')
    await page.locator('main h1').click()
    await page.keyboard.press('['); await f.esperar(450)
    const subs = await page.locator('nav [data-subpantallas] button').evaluateAll(bs => bs.map(b => ({ texto: (b as HTMLElement).innerText.trim(), icono: b.querySelector('svg')?.innerHTML ?? '' })))
    f.ok(subs.length > 1 && subs.every(s => s.texto.length > 0), `plegado, el nombre va debajo del ícono (${subs.map(s => s.texto).join(' · ')})`)
    const dif = subs.find(s => s.texto === 'Diferidos'), conf = subs.find(s => s.texto === 'Confiabilidad')
    f.ok(!!dif && !!conf && dif.icono !== conf.icono, 'Diferidos y Confiabilidad no comparten ícono')
    await page.keyboard.press('[')
    f.cerrar()
  })

  test('UI-22, H14, H6 y H13 · «Datos de demostración» en la línea de las migas; la franja en el mismo lugar en los niveles 1, 2 y la lista', async ({ flujo: f }) => {
    const { page } = f
    await page.setViewportSize({ width: 1440, height: 900 })
    const lugar = async (ruta: string) => {
      await f.abrir(ruta)
      return page.evaluate(() => {
        const r = document.querySelector('header [data-franja]')!.getBoundingClientRect()
        return [Math.round(r.right), Math.round(r.top)] as const
      })
    }
    await f.abrir('/#/ger/planta-viva/ceiba/curso')
    const migas = page.locator('main header nav[aria-label="Dónde está"]')
    await expect(migas).toContainText('Datos de demostración')
    f.ok(!(await page.locator('main').innerText()).includes('DATOS DE DEMOSTRACIÓN'), 'en frase, no en MAYÚSCULAS')
    f.ok((await migas.boundingBox())!.height <= 26, `la marca no agranda el renglón de las migas (${(await migas.boundingBox())!.height} px)`)
    await expect(page.locator('header [data-franja]')).toContainText('medidor oficial')
    const n1 = await lugar('/#/ger/planta-viva/ceiba/curso'), n2 = await lugar('/#/prod/planta/ceiba/curso'), lista = await lugar('/#/conf/equipos/ceiba')
    const cerca = (a: readonly number[], b: readonly number[]) => Math.abs(a[0]! - b[0]!) <= 4 && Math.abs(a[1]! - b[1]!) <= 4
    f.ok(cerca(n1, n2) && cerca(n1, lista), `la franja no se mueve: ${n1} · ${n2} · ${lista}`)
    f.cerrar()
  })

  test('T-1 · en el teléfono: sin migas con un solo campo; «‹ Todos mis campos» con varios; Hoy sin la fecha', async ({ flujo: f }) => {
    const { page } = f
    await page.setViewportSize({ width: 390, height: 844 })
    await f.abrir('/#/sup/hoy/ceiba/curso')
    f.ok(await page.locator('main header nav[aria-label="Dónde está"]').count() === 0, 'el supervisor (un campo): sin migas')
    const titulo = await page.locator('main h1').innerText()
    f.ok(titulo.includes('datos de las 14:00') && !titulo.includes('2 de oct'), `Hoy, como la imagen 3b: «${titulo.replace(/\s+/g, ' ')}»`)
    await f.abrir('/#/ger/planta-viva/ceiba/curso')
    await expect(page.locator('main header nav[aria-label="Dónde está"]')).toHaveText(/Todos mis campos/)
    // K1 (pedido de K2; imagen 2, al medio): La planta viva de un campo de varios, solo «‹ Todos mis campos» y la
    // franja; el título sigue para el lector (y para el foco), sin verse. Con todos los campos y en otra vista, se ve.
    const visto = () => page.locator('main h1[data-titulo-vista]').evaluate(h => ({ texto: h.textContent ?? '', ancho: h.getBoundingClientRect().width }))
    let h1 = await visto()
    // La fecha va dentro del título: sin verse el título, tampoco se ve la fecha.
    f.ok(h1.texto.startsWith('La planta viva') && h1.texto.includes('2 de oct') && h1.ancho <= 1,
      `La Ceiba en el teléfono: sin el título ni la fecha a la vista (el título, para el lector: «${h1.texto}»)`)
    await f.ir('#/ger/planta-viva/ceiba~portafolio/curso')
    h1 = await visto()
    f.ok(h1.ancho > 50 && (await page.locator('main h1').innerText()).includes('2 de oct'), 'Todos mis campos: el título y la fecha, como la imagen 2 a la izquierda')
    await f.ir('#/ger/resultados/ceiba/curso')
    f.ok((await visto()).ancho > 50, 'otra vista de un campo (Resultados) conserva su título')
    f.cerrar()
  })

  test('A5 · 390 px: el ☰, las cuentas de la franja, «Demo» y «Ver una por una» tienen 44 px de blanco', async ({ flujo: f }) => {
    const { page } = f
    await page.setViewportSize({ width: 390, height: 844 })
    await f.abrir('/#/sup/hoy/ceiba/curso')
    const blancos = await page.evaluate(() => {
      const mide = (e: Element | null) => {
        if (!e) return 0
        const r = e.getBoundingClientRect(), d = getComputedStyle(e, '::after')
        return Math.min(Math.max(r.height, parseFloat(d.height) || 0), Math.max(r.width, parseFloat(d.width) || 0))
      }
      const boton = (t: string) => [...document.querySelectorAll('button')].find(b => b.textContent?.trim().startsWith(t) || b.getAttribute('aria-label') === t) ?? null
      return {
        menu: mide(boton('Abrir la navegación')),
        franja: Math.min(...[...document.querySelectorAll('header [data-franja] button')].map(mide)),
        demo: mide(document.querySelector('[data-demo]')),
        unaPorUna: mide(boton('Ver una por una')),
      }
    })
    f.ok(Object.values(blancos).every(x => x >= 44), `blancos de 44 px o más: ${JSON.stringify(blancos)}`)
    f.cerrar()
  })

  test('A12 y A13 · el título de la pestaña dice la vista; «Saltar al contenido» lleva el foco al título', async ({ flujo: f }) => {
    const { page } = f
    await f.abrir('/#/sup/hoy/ceiba/curso')
    f.ok((await page.title()).startsWith('Hoy · La Ceiba'), `título de la pestaña: «${await page.title()}»`)
    await tab(page)
    const salto = page.getByRole('link', { name: 'Saltar al contenido' })
    await expect(salto).toBeFocused()
    await page.keyboard.press('Enter')
    f.ok(await page.evaluate(() => document.activeElement?.hasAttribute('data-titulo-vista') ?? false), 'el foco queda en el título de la vista')
    f.cerrar()
  })

  test('UI-08 e I-adm-3 · Equipos sin Exportar; Configurar sin período ni Exportar, con su nombre por rol', async ({ flujo: f }) => {
    const { page } = f
    await f.abrir('/#/conf/equipos/ceiba')
    f.ok(await page.locator('main header').getByRole('button', { name: /Exportar/ }).count() === 0, 'Equipos no exporta desde la cabecera')
    await f.abrir('/#/adm/configuracion/ceiba/curso')
    f.ok(await page.locator('header button[aria-label^="Período"]').count() === 0 && await page.locator('main header').getByRole('button', { name: /Exportar/ }).count() === 0,
      'Configurar: sin período ni Exportar')
    await expect(page.locator('main h1')).toContainText('Configurar')
    await f.abrir('/#/ger/configuracion/ceiba/curso')
    await expect(page.locator('main h1')).toContainText('Metas y accesos')
    f.cerrar()
  })

  test('P-17 · una dirección con un rol que no está en esta versión lo dice', async ({ flujo: f }) => {
    const { page } = f
    await f.abrir('/#/plan/hoy/ceiba/curso')
    await expect(page.locator('main [data-aviso-campo]')).toContainText('todavía no está en esta versión')
    f.cerrar()
  })

  test('P-18 · el momento de La planta viva va en la dirección y se lee de ella', async ({ flujo: f }) => {
    const { page } = f
    await f.abrir('/#/ger/planta-viva/ceiba/antes')
    await expect(page.locator('main [data-planta-viva]')).toHaveAttribute('data-momento', 'antes')
    await page.locator('main [data-momento="despues"]').first().click()
    await expect.poll(() => f.hash()).toMatch(/\/despues$/)
    f.cerrar()
  })
})

test.describe('lo común', () => {
  test('H19 y A16 · ninguna marca de prioridad mide menos de 12 px (14 en el teléfono), y se lee «Prioridad 1, alarma»', async ({ flujo: f }) => {
    const { page } = f
    const minima = () => page.evaluate(() => Math.min(...[...document.querySelectorAll('svg[viewBox="0 0 14 14"]')]
      .map(s => s.getBoundingClientRect()).filter(r => r.width > 0).map(r => r.width)))
    await f.abrir('/#/sup/causa/ceiba/curso')
    f.ok(await minima() >= 12, `escritorio: la marca más chica mide ${await minima()} px`)
    f.ok(await page.locator('nav [role=img][aria-label="Prioridad 1, alarma"]').count() > 0, 'la marca del campo se lee «Prioridad 1, alarma»')
    await page.setViewportSize({ width: 390, height: 844 })
    await f.abrir('/#/sup/turno/ceiba/curso')
    f.ok(await minima() >= 14, `teléfono: la marca más chica mide ${await minima()} px`)
    f.cerrar()
  })

  test('UI-04 · el título de un panel va a 16 px Semibold, en tinta', async ({ flujo: f }) => {
    const { page } = f
    await f.abrir('/#/sup/turno/ceiba/curso')
    const t = await page.locator('main section > header > h2', { hasText: 'Por vigilar' }).evaluate(e => {
      const c = getComputedStyle(e), tinta = getComputedStyle(document.documentElement).getPropertyValue('--tinta').trim()
      const probe = document.createElement('i'); probe.style.color = tinta; document.body.append(probe)
      const enTinta = getComputedStyle(probe).color; probe.remove()
      return { tam: c.fontSize, peso: c.fontWeight, color: c.color, enTinta }
    })
    f.ok(t.tam === '16px' && t.peso === '600' && t.color === t.enTinta, `«Por vigilar»: ${JSON.stringify(t)}`)
    f.cerrar()
  })

  test('A10 y A11 · el período sin aria-controls cerrado; «Demo» con su nombre en el teléfono', async ({ flujo: f }) => {
    const { page } = f
    await f.abrir('/#/jefe/resultados/ceiba/curso')
    const periodo = page.locator('header button[aria-label^="Período"]')
    f.ok(await periodo.getAttribute('aria-controls') === null, 'cerrado, no apunta a un panel que no existe')
    await periodo.click()
    f.ok(!!(await periodo.getAttribute('aria-controls')), 'abierto, sí')
    await page.keyboard.press('Escape')
    await page.setViewportSize({ width: 390, height: 844 })
    await f.abrir('/#/sup/hoy/ceiba/curso')
    await expect(page.getByRole('button', { name: 'Datos de demostración' })).toBeVisible()
    f.cerrar()
  })

  test('A17 · un globo que no hace nada se anuncia como botón que despliega', async ({ flujo: f }) => {
    const { page } = f
    await f.abrir('/#/sup/turno/ceiba/curso')
    f.ok(await page.locator('main [role=button][aria-expanded]').count() > 0, 'los renglones con globo dicen qué son')
    f.cerrar()
  })

  test('UI-09, UI-10, A8, A19 y A21 · los tokens: el aviso claro en la noche, las casillas en la mano, el papel claro, más contraste', async ({ page }) => {
    await page.addInitScript(() => { localStorage.setItem('trim.intro.sup', '1'); localStorage.setItem('trim.tema', 'dark') })
    await page.goto('/#/sup/hoy/ceiba/curso')
    await page.waitForSelector('main [data-inicio]')
    const v = (n: string) => page.evaluate(x => getComputedStyle(document.querySelector('[data-aviso-hoy]')!).getPropertyValue(x).trim(), n)
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('[data-aviso-hoy]')!).backgroundColor), 'el aviso en la noche es claro').toBe('rgb(242, 241, 238)')
    expect(await v('--aviso-accion')).toBe('#2c7371')
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).accentColor), 'las casillas, en la mano').not.toBe('auto')
    await page.emulateMedia({ media: 'print' })
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme), 'el papel, en claro').toBe('light')
    // A21: en el papel un título no queda al pie de la hoja sin lo suyo.
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('main h2')!).breakAfter), 'un título no se separa de lo que sigue').toBe('avoid')
    await page.emulateMedia({ media: 'screen', contrast: 'more' })
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tinta2').trim()), 'más contraste: la tinta secundaria sube').toBe('#e3e1dc')
  })

  test('A4 · al cerrar la hoja de un tramo con Escape, el foco vuelve al tramo (un <g> del dibujo)', async ({ flujo: f }) => {
    const { page } = f
    await page.setViewportSize({ width: 1440, height: 900 })
    await f.abrir('/#/ger/planta-viva/ceiba/curso')
    const tramo = page.locator('main [data-tramo="planta"]').first()
    await tramo.focus(); await page.keyboard.press('Enter'); await f.esperar(400)
    await page.keyboard.press('Escape'); await f.esperar(300)
    f.ok(await page.evaluate(() => document.activeElement?.getAttribute('data-tramo')) === 'planta', 'y es el de la planta')
    f.cerrar()
  })
})

test.describe('Hoy', () => {
  test('UI-20, I-oper-4, A15 · el bloqueo no lleva lo simulado: los planes van en su tarjeta y abren P-201B', async ({ flujo: f }) => {
    const { page } = f
    await page.setViewportSize({ width: 1440, height: 900 })
    await f.abrir('/#/sup/hoy/ceiba/curso')
    const bloqueo = await page.locator('main [data-bloqueo]').innerText()
    f.ok(!/simulad|plan/i.test(bloqueo), `el bloqueo no trae planes («${bloqueo.replace(/\s+/g, ' ')}»)`)
    const planes = page.locator('main [data-tarea="planes"]')
    await expect(planes.locator('h2')).toHaveText('Decidir 3 planes de P-201B · simulado', { useInnerText: true })
    await planes.getByRole('button', { name: /Ver los planes/ }).click()
    await expect.poll(() => f.hash()).toContain('P-201B')
    await page.setViewportSize({ width: 1280, height: 900 })
    await f.abrir('/#/oper/hoy/ceiba/curso')
    const porque = await page.locator('main [data-tarea="contestar"]').first().innerText()
    f.ok(porque.includes('Sigue parada.') && !porque.includes('no se arranca hasta'), 'la tarjeta no repite lo que dice la franja')
    f.cerrar()
  })

  test('I-sup-1, I-sup-2, I-sup-3, I-sup-5 · en el teléfono del supervisor, lo que la imagen 3b no lleva', async ({ flujo: f }) => {
    const { page } = f
    await page.setViewportSize({ width: 390, height: 844 })
    await f.abrir('/#/sup/hoy/ceiba/curso')
    const t = await page.locator('main').innerText()
    f.ok(t.includes('se dejan de producir.') && !t.includes('en La Ceiba.'), 'el remate corto')
    f.ok(!t.includes('Falta su confirmación.') && !t.includes('3.059'), 'sin «Falta su confirmación.» ni la cifra de «Lo más frágil»')
    f.ok(!t.includes('Si arranca antes, queda como no conformidad.') && await page.locator('main [data-bloqueo] [role=img][aria-label^="No arrancar: Si arranca antes"]').count() === 1,
      'la salvedad del bloqueo, en su ⓘ')
    f.cerrar()
  })

  test('I-jefe-1, I-jefe-2, P-10 · la espera a la ⓘ; «Entre las 3»; «Ver P-201A y P-201C» lleva a Equipos', async ({ flujo: f }) => {
    const { page } = f
    await f.abrir('/#/jefe/hoy/ceiba/curso')
    const t = await page.locator('main').innerText()
    f.ok(!t.includes('el repuesto, los permisos') && await page.locator('main [data-inicio] [role=img][aria-label*="el repuesto, los permisos"]').count() === 1, 'la espera, en la ⓘ')
    f.ok(t.includes('Entre las 3: '), 'la suma dice que es de las tres')
    await page.getByRole('button', { name: /Ver P-201A y P-201C/ }).click()
    await expect.poll(() => f.hash()).toMatch(/^#\/jefe\/equipos\//)
    f.cerrar()
  })

  test('I-tec-2 · la orden del técnico dice en una línea qué hacer', async ({ flujo: f }) => {
    const { page } = f
    await f.abrir('/#/tec/hoy/ceiba/curso')
    const orden = await page.locator('main [data-tarea="orden"]').first().innerText()
    f.ok(!orden.includes('se notifica') && !orden.includes('autonomía') && orden.includes('Verificar que las tres unidades'), `«${orden.replace(/\s+/g, ' ')}»`)
    f.cerrar()
  })

  test('A2 y A3 · confirmar con el teclado no pierde el foco; el aviso tiene su región montada y «Deshacer» fuera de ella', async ({ flujo: f }) => {
    const { page } = f
    await f.abrir('/#/sup/hoy/ceiba/curso')
    f.ok(await page.locator('[data-aviso-hoy] [role=status]').count() === 1, 'la región del aviso está montada antes de hacer nada')
    await page.getByRole('button', { name: 'Confirmar las 2' }).focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('[data-aviso-hoy] [role=status]')).toContainText('Confirmadas LC-07 y LC-16')
    f.ok(await page.evaluate(() => document.activeElement?.tagName !== 'BODY' && !!document.activeElement?.closest('[data-tarea]')), 'el foco pasa a la tarjeta que quedó en su lugar')
    f.ok(await page.locator('[data-aviso-hoy] [role=status] button').count() === 0 && await page.locator('[data-aviso-hoy] button', { hasText: 'Deshacer' }).count() === 1,
      '«Deshacer» va al lado de la región, no adentro')
    // El reloj no corre con el puntero encima.
    await page.locator('[data-aviso-hoy]').hover()
    await f.esperar(6_000)
    await expect(page.locator('[data-aviso-hoy] button', { hasText: 'Deshacer' })).toBeVisible()
    f.cerrar()
  })

  test('P-08 · la respuesta que se sostiene no dice «Registrado» antes de escribirse, y vive en el navegador mientras tanto', async ({ flujo: f }) => {
    const { page } = f
    await page.setViewportSize({ width: 390, height: 844 })
    await f.abrir('/#/oper/hoy/ceiba/curso')
    await page.locator('main [data-opcion="Todavía no sé"]').click()
    await page.locator('main [data-opcion="Fuga o daño en la línea de flujo"]').click()
    const aviso = page.locator('[data-aviso-hoy]')
    await expect(aviso).toContainText('Se registra en 5 s:')
    f.ok(!(await aviso.innerText()).includes('Registrado'), 'mientras se sostiene, no dice «Registrado»')
    f.ok(await page.evaluate(() => !!localStorage.getItem('trim.hoy.pendiente')), 'lo pendiente queda guardado en el navegador')
    await expect(aviso).toContainText('Registrado: fuga o daño en la línea de flujo en LC-21', { timeout: 8_000 })
    f.ok(await page.evaluate(() => !localStorage.getItem('trim.hoy.pendiente')), 'escrito, ya no queda pendiente')
    f.cerrar()
  })

  test('P-06 · «Entregar turno» abre la entrega: lo que paró, lo pendiente y «Compartir en PDF»', async ({ flujo: f }) => {
    const { page } = f
    await page.setViewportSize({ width: 1440, height: 900 })
    await f.abrir('/#/sup/hoy/ceiba/curso')
    await page.getByRole('button', { name: 'Entregar turno' }).first().click()
    const e = page.locator('main [data-entrega]')
    await expect(e).toContainText('Entrega de turno · La Ceiba')
    await expect(e).toContainText('P-201B · bomba de agua')
    await expect(e).toContainText('Confirmar 2 paradas iguales')
    await expect(e.getByRole('button', { name: 'Compartir en PDF' })).toBeVisible()
    f.ok((await f.hash()).startsWith('#/sup/hoy/'), 'sin salir de Hoy')
    f.cerrar()
  })

  test('H27 · «Su campo, ahora» usa la tubería en chico de La planta viva', async ({ flujo: f }) => {
    const { page } = f
    await page.setViewportSize({ width: 1440, height: 900 })
    await f.abrir('/#/sup/hoy/ceiba/curso')
    f.ok(await page.locator('main [data-su-campo] svg[data-mini-tuberia]').count() === 1, 'la misma tubería en chico')
    f.cerrar()
  })
})

test.describe('Turno, Mi trabajo e Identificar', () => {
  test('P-05, UI-15, P-09 · en Turno lo medido es la cifra grande; lo proyectado, chico, discontinuo y con su palabra', async ({ flujo: f }) => {
    const { page } = f
    await f.abrir('/#/sup/turno/ceiba/curso')
    const r = await page.evaluate(() => {
      const caja = document.querySelector('main [data-turno-cifras]')!
      const tam = (e: Element | null) => (e ? parseFloat(getComputedStyle(e).fontSize) : 0)
      const mayor = Math.max(...[...document.querySelectorAll('main b, main strong')].map(tam))
      const pro = caja.querySelector('[data-proyectado]')!
      return { medida: tam(caja.querySelector('[data-medida]')), mayor, proyectado: tam(pro), borde: getComputedStyle(pro).borderTopStyle, texto: pro.textContent ?? '' }
    })
    f.ok(r.medida === r.mayor && r.proyectado < r.medida, `la cifra grande es la medida (${r.medida} px); la proyectada, ${r.proyectado} px`)
    f.ok(r.borde === 'dashed' && r.texto.includes('proyectado'), `lo proyectado lleva su trazo y su palabra («${r.texto}»)`)
    const t = await page.locator('main').innerText()
    f.ok(t.includes('bomba de agua') && !t.includes('bomba de reinyección'), 'P-201B es «bomba de agua» (un nombre por familia)')
    f.cerrar()
  })

  test('P-turno-2 y P-turno-3 · el cierre de hoy dice la cuenta una vez y la frase de Hoy, no la cadena', async ({ flujo: f }) => {
    const { page } = f
    await f.abrir('/#/sup/turno/ceiba/curso')
    const cierre = page.locator('main section').filter({ has: page.getByRole('heading', { name: 'Cierre de hoy' }) })
    await expect(cierre).toContainText('faltan 4 de 4 · antes de las 07:00')
    const t = await cierre.innerText()
    f.ok(!t.includes('0 completas') && !/No planeada - Proceso/.test(t) && t.includes('en la planta, no planeada'), 'sin la cuenta repetida ni la cadena de la ANH')
    f.cerrar()
  })

  test('H3, H16 y P-trabajo-1 · Turno: cada equipo con la marca de la franja y su palabra; Mi trabajo abre Hoy', async ({ flujo: f }) => {
    const { page } = f
    await f.abrir('/#/tec/trabajo/ceiba/curso')
    f.ok((await f.hash()).startsWith('#/tec/hoy/'), 'la dirección de Mi trabajo abre Hoy del técnico')
    await expect(page.locator('main [data-tarea="orden"]').filter({ hasText: 'K-101' })).toContainText('40012056')
    await f.abrir('/#/sup/turno/ceiba/curso')
    f.ok(await page.locator('main [role=img][aria-label="Normal"]').count() === 0, 'un equipo sin condición (LC-08) va sin marca, no con un punto «normal»')
    const t = await page.locator('main').innerText()
    f.ok(/Alarma ·\s*P-201B/.test(t), 'la fila de P-201B dice «Alarma», la marca de la franja')
    f.ok(!/Atención ·\s*P-201B/.test(t) && await page.locator('main [role=img][aria-label^="Prioridad 2"]').count() === 0, 'nunca como prioridad 2')
    f.cerrar()
  })

  test('UI-05, P-causa-1, T-10, T-11 · Identificar: la franja «No arrancar» de Hoy, una parada abierta a la vez, sin números de paso', async ({ flujo: f }) => {
    const { page } = f
    await page.setViewportSize({ width: 1440, height: 900 })
    await f.abrir('/#/jefe/causa/ceiba/curso')
    await expect(page.locator('main [data-bloqueo]').first()).toContainText('No arrancar hasta identificar el daño')
    f.ok(await page.locator('main [data-abierta]').count() === 1, 'una sola parada abierta')
    const cerradas = page.locator('main button[data-parada][aria-expanded="false"]')
    f.ok(await cerradas.count() > 0, 'las demás, en una fila con «›»')
    await cerradas.first().click()
    f.ok(await page.locator('main [data-abierta]').count() === 1, 'tocar otra la abre y cierra la de antes')
    const t = await page.locator('main').innerText()
    f.ok(!/\b1 · Parte|\b2 · Qué vio|Paso 2 ·/.test(t) && !/modelo choke/.test(t), 'sin números de paso ni el rótulo «modelo choke»')
    const altos = await page.locator('main [data-abierta] form button[aria-pressed]').evaluateAll(bs => bs.map(b => b.getBoundingClientRect().height))
    f.ok(altos.every(h => h >= 56), `las opciones son las de Hoy: 56 px o más (${altos.map(Math.round).join(', ')})`)
    f.cerrar()
  })
})

// P-15 y A14: sin marcar la introducción como vista.
base('P-15 y A14 · la introducción son tres señas sobre el inicio, de usted; al cerrar, el foco va al título', async ({ page }) => {
  await page.goto('/#/sup/hoy/ceiba/curso')
  const intro = page.locator('[role=dialog][aria-label="Introducción"]')
  await expect(intro).toContainText('1 de 3')
  await expect(intro).toContainText('Lo que se deja de producir ahora en su campo.')
  expect(await intro.innerText(), 'sin el párrafo del foco').not.toContain('Lo que usted decide')
  expect(await page.locator('main').evaluate(e => !!e.closest('[inert]')), 'el inicio de verdad queda a la vista y se puede tocar').toBe(false)
  await intro.getByRole('button', { name: 'Siguiente' }).click()
  await expect(intro).toContainText('2 de 3')
  await intro.getByRole('button', { name: 'Siguiente' }).click()
  await expect(intro).toContainText('3 de 3')
  await intro.getByRole('button', { name: 'Ya entendí' }).click()
  await expect(intro).toHaveCount(0)
  await expect.poll(() => page.evaluate(() => document.activeElement?.hasAttribute('data-titulo-vista') ?? false), { message: 'el foco va al título de la vista' }).toBe(true)
})

// A20: la primera carga no salta (CLS ≈ 0): la cabecera espera con su alto.
test('A20 · la primera carga de Equipos no salta al llegar la cabecera', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('trim.intro.conf', '1')
    ;(window as unknown as { cls: number }).cls = 0
    new PerformanceObserver(l => { for (const e of l.getEntries() as Array<PerformanceEntry & { value: number; hadRecentInput: boolean }>) if (!e.hadRecentInput) (window as unknown as { cls: number }).cls += e.value })
      .observe({ type: 'layout-shift', buffered: true })
  })
  await page.goto('/#/conf/equipos/morichal')
  await page.waitForSelector('main [data-cabecera]')
  await page.waitForTimeout(1_500)
  const cls = await page.evaluate(() => (window as unknown as { cls: number }).cls)
  expect(cls, `CLS ${cls.toFixed(4)}`).toBeLessThan(0.01)
})

test.describe('lo que pintan las piezas comunes', () => {
  test('H1 y G-10 · una barra con 0 bbl/d no se llena; la raya dice «máximo», sin abreviar', async ({ flujo: f }) => {
    const { page } = f
    await f.abrir('/#/ger/resultados/ceiba~portafolio/curso')
    const barras = await page.locator('main [role=img][aria-label*="diferido: 0 bbl/d"]').evaluateAll(es => es.map(e => {
      const r = e.querySelector('[data-relleno]')
      return { ancho: r ? r.getBoundingClientRect().width : -1, nombre: e.getAttribute('aria-label') ?? '' }
    }))
    f.ok(barras.every(b => b.ancho === 0), `ninguna barra de 0 bbl/d llena su pista (${barras.map(b => b.ancho).join(', ') || 'ninguna en 0'})`)
    const nombres = await page.locator('main [data-barra]').evaluateAll(es => es.map(e => (e.closest('[role=img]')?.getAttribute('aria-label') ?? e.parentElement?.textContent ?? '')))
    f.ok(nombres.every(n => !/máx\./.test(n) && !/máximo máximo/.test(n)), `«máximo», una vez y sin abreviar (${nombres.find(n => /máx/.test(n)) ?? ''})`)
    f.cerrar()
  })

  test('G-16 · «Si falla hoy» es una tasa: el costo de una falla en bbl lleva su propio nombre', async ({ flujo: f }) => {
    const { page } = f
    await f.abrir('/#/jefe/mantenimiento/ceiba~portafolio/curso')
    const t = await page.locator('main').innerText()
    f.ok(t.includes('le costaría la falla') && !t.includes('bbl si falla hoy'), 'el costo de una falla: «≈ N bbl le costaría la falla»')
    f.cerrar()
  })
})
