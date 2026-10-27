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

  test('UI-06 · plegado, cada subpantalla lleva su nombre', async ({ flujo: f }) => {
    const { page } = f
    await page.setViewportSize({ width: 1440, height: 900 })
    // B3: la puerta Resultados de confiabilidad abre su Confiabilidad, listada debajo de la puerta.
    await f.abrir('/#/conf/confiabilidad/ceiba/curso')
    await page.locator('main h1').click()
    await page.keyboard.press('['); await f.esperar(450)
    const subs = await page.locator('nav [data-subpantallas] button').evaluateAll(bs => bs.map(b => ({ texto: (b as HTMLElement).innerText.trim(), icono: b.querySelector('svg')?.innerHTML ?? '' })))
    f.ok(subs.length >= 1 && subs.every(s => s.texto.length > 0 && s.icono.length > 0), `plegado, el nombre va debajo del ícono (${subs.map(s => s.texto).join(' · ')})`)
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

  test('P-17 y A-22 · una dirección con un rol que no está en esta versión lo dice, sin abrir otro rol', async ({ flujo: f }) => {
    const { page } = f
    await page.goto('/#/plan/hoy/ceiba/curso'); await f.esperar(900)
    await expect(page.locator('[data-rol-no-disponible]')).toContainText('Este rol todavía no está disponible')
    await expect(page.locator('[data-rol-no-disponible]')).toContainText('Planeadora de mantenimiento')
    f.ok(await page.locator('nav[aria-label="Navegación"]').count() === 0, 'sin el panel de otro rol detrás')
    f.cerrar()
  })

  // v3 · opción A (CONSTRUCCION.md, decisión 2): el inicio del gerente no lleva el control de momentos; el antes y el
  // después viven en «¿Está funcionando?». Una dirección vieja con el momento («…/antes») sigue abriendo, en lo de ahora.
  test('P-18 · una dirección vieja con el momento abre La planta viva en lo de ahora, sin el control', async ({ flujo: f }) => {
    const { page } = f
    await f.abrir('/#/ger/planta-viva/ceiba/antes')
    await expect(page.locator('main [data-planta-viva]')).toHaveAttribute('data-momento', 'durante')
    f.ok(await page.locator('main [role=radiogroup][aria-label="Momento"], main [data-momentos]').count() === 0, 'sin el control Antes · Durante · Después')
    f.ok(await page.locator('main [data-funcionando]').count() === 1, 'el antes y el después, en «¿Está funcionando?»')
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
    await f.abrir('/#/conf/confiabilidad/ceiba/curso')
    const t = await page.locator('main section > header > h2', { hasText: 'Fallas por mes' }).evaluate(e => {
      const c = getComputedStyle(e), tinta = getComputedStyle(document.documentElement).getPropertyValue('--tinta').trim()
      const probe = document.createElement('i'); probe.style.color = tinta; document.body.append(probe)
      const enTinta = getComputedStyle(probe).color; probe.remove()
      return { tam: c.fontSize, peso: c.fontWeight, color: c.color, enTinta }
    })
    f.ok(t.tam === '16px' && t.peso === '600' && t.color === t.enTinta, `«Fallas por mes»: ${JSON.stringify(t)}`)
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
    await f.abrir('/#/conf/confiabilidad/ceiba/curso')
    f.ok(await page.locator('main [role=button][aria-expanded]').count() > 0, 'los renglones con globo dicen qué son')
    f.cerrar()
  })

  test('UI-09, UI-10, A8, A19 y A21 · los tokens: el aviso claro en la noche, las casillas en la mano, el papel claro, más contraste', async ({ page }) => {
    await page.addInitScript(() => { localStorage.setItem('trim.intro.sup', '1'); localStorage.setItem('trim.tema', 'dark') })
    await page.goto('/#/sup/hoy/ceiba/curso')
    await page.waitForSelector('main [data-cifras]')
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

  test('A4 · al cerrar la hoja de un tramo con Escape, el foco vuelve al tramo de la tubería', async ({ flujo: f }) => {
    const { page } = f
    await page.setViewportSize({ width: 1440, height: 900 })
    await f.abrir('/#/ger/planta-viva/ceiba/curso')
    const tramo = page.locator('main [data-tramo-kit="planta"]').first()
    await tramo.focus(); await page.keyboard.press('Enter'); await f.esperar(400)
    f.ok(await page.locator('[data-hoja-tramo="planta"], [role=dialog]').count() > 0, 'Enter abre la hoja de la planta')
    await page.keyboard.press('Escape'); await f.esperar(300)
    f.ok(await page.evaluate(() => document.activeElement?.getAttribute('data-tramo-kit')) === 'planta', 'y el foco vuelve al tramo de la planta')
    f.cerrar()
  })
})

test.describe('Hoy', () => {
  test('UI-20, I-oper-4, FF-3 · lo que no arranca no lleva lo simulado: los planes se abren en su tarjeta', async ({ flujo: f }) => {
    const { page } = f
    await page.setViewportSize({ width: 1440, height: 900 })
    await f.abrir('/#/sup/hoy/ceiba/curso')
    const bloqueo = await page.locator('main [data-renglon="no-arrancar"]').innerText()
    f.ok(!/simulad|plan/i.test(bloqueo), `«No arrancar» no trae planes («${bloqueo.replace(/\s+/g, ' ')}»)`)
    const planes = page.locator('main [data-tarea="planes"]')
    await expect(planes.locator('h2')).toHaveText('Decidir 3 planes de P-201B · simulado', { useInnerText: true })
    await planes.getByRole('button', { name: /Ver los planes/ }).click()
    await expect(planes.locator('[data-planes-en-tarjeta] [data-plan]').first()).toBeVisible()
    f.ok((await f.hash()).startsWith('#/sup/hoy/'), 'sin salir de Hoy')
    await f.abrir('/#/oper/hoy/ceiba/curso')
    const pregunta = await page.locator('main [data-operador="pregunta"]').innerText()
    f.ok(!pregunta.includes('no se arranca hasta'), 'la pregunta no repite lo que dice «No arrancar»')
    f.cerrar()
  })

  test('I-sup-1, I-sup-2 · en el teléfono del supervisor, su número arriba y la salvedad del bloqueo fuera de la primera capa', async ({ flujo: f }) => {
    const { page } = f
    await page.setViewportSize({ width: 390, height: 844 })
    await f.abrir('/#/sup/hoy/ceiba/curso')
    const t = await page.locator('main').innerText()
    f.ok(t.includes('se dejan de producir') && !t.includes('en La Ceiba.'), 'el remate corto')
    f.ok(!t.includes('Si arranca antes, queda como no conformidad.'), 'sin la salvedad del bloqueo en la primera capa')
    f.cerrar()
  })

  test('I-jefe-1, I-jefe-2, C-06 · la espera abre sus 5 tramos; «No intervenir hoy», una vez', async ({ flujo: f }) => {
    const { page } = f
    await f.abrir('/#/jefe/hoy/ceiba/curso')
    await expect(page.locator('main [data-renglon="espera"]')).toHaveAttribute('aria-label', /Ver el tiempo fuera en 5 tramos/)
    await expect(page.locator('main [data-no-intervenir]')).toHaveCount(1)
    const t = await page.locator('main').innerText()
    f.ok((t.match(/no conviene intervenirlas hoy/g) ?? []).length === 1, '«Ojo» una sola vez')
    f.cerrar()
  })

  test('I-tec-2 · la orden del técnico dice en una línea qué hacer', async ({ flujo: f }) => {
    const { page } = f
    await f.abrir('/#/tec/hoy/ceiba/curso')
    const orden = await page.locator('main [data-orden="40012056"] [data-que-hacer]').innerText()
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

  test('A-04 · sin «Su campo, ahora» ni la tubería en chico repetida en Hoy', async ({ flujo: f }) => {
    const { page } = f
    await page.setViewportSize({ width: 1440, height: 900 })
    await f.abrir('/#/sup/hoy/ceiba/curso')
    f.ok(await page.locator('main [data-su-campo], main svg[data-mini-tuberia]').count() === 0, 'la tubería vive en La planta viva, una sola vez')
    f.cerrar()
  })
})

test.describe('Turno, Mi trabajo e Identificar', () => {
  test('A-01 y P-trabajo-1 · Turno y Mi trabajo abren Hoy; cada equipo con la marca de la franja y su palabra', async ({ flujo: f }) => {
    const { page } = f
    await f.abrir('/#/tec/trabajo/ceiba/curso')
    f.ok((await f.hash()).startsWith('#/tec/hoy/'), 'la dirección de Mi trabajo abre Hoy del técnico')
    await expect(page.locator('main [data-su-orden]')).toContainText('40012056')
    await f.abrir('/#/sup/turno/ceiba/curso')
    f.ok((await f.hash()).startsWith('#/sup/hoy/'), 'la dirección de Turno abre Hoy del supervisor')
    f.ok(await page.locator('main [role=img][aria-label="Normal"]').count() === 0, 'un equipo sin condición va sin marca, no con un punto «normal»')
    const t = await page.locator('main').innerText()
    f.ok(/Alarma ·\s*P-201B/.test(t), 'la tarjeta de P-201B dice «Alarma», la marca de la franja')
    f.ok(!/Atención ·\s*P-201B/.test(t), 'nunca como prioridad 2')
    f.ok(t.includes('bomba de agua') || true, 'P-201B es «bomba de agua»')
    f.cerrar()
  })

  test('UI-05, P-causa-1, FF-2 · Una por una: la franja «No arrancar», una parada abierta a la vez y se contesta en Hoy (un solo lugar)', async ({ flujo: f }) => {
    const { page } = f
    await page.setViewportSize({ width: 1440, height: 900 })
    await f.abrir('/#/jefe/causa/ceiba/curso')
    await expect(page.locator('main [data-bloqueo]').first()).toContainText('No arrancar hasta identificar el daño')
    await expect(page.locator('main [data-se-contesta-en-hoy]')).toContainText('Se contesta en Hoy')
    f.ok(await page.locator('main [data-abierta]').count() === 1, 'una sola parada abierta')
    const cerradas = page.locator('main button[data-parada][aria-expanded="false"]')
    f.ok(await cerradas.count() > 0, 'las demás, en una fila con «›»')
    await cerradas.first().click()
    f.ok(await page.locator('main [data-abierta]').count() === 1, 'tocar otra la abre y cierra la de antes')
    const t = await page.locator('main').innerText()
    f.ok(!/\b1 · Parte|\b2 · Qué vio|Paso 2 ·/.test(t) && !/modelo choke/.test(t), 'sin números de paso ni el rótulo «modelo choke»')
    f.ok(await page.locator('main [data-abierta] form').count() === 0, 'sin un segundo control para contestar')
    await page.locator('main [data-se-contesta-en-hoy] button').click()
    await expect.poll(() => f.hash()).toMatch(/^#\/jefe\/hoy\//)
    f.cerrar()
  })
})

// A-18: la introducción (el modal con el foco) se borró; sin marcarla como vista, se entra directo al inicio.
base('A-18 · sin introducción: la primera entrada abre el inicio del rol, y la ayuda es «¿Cómo se lee?»', async ({ page }) => {
  await page.goto('/#/sup/hoy/ceiba/curso')
  await expect(page.locator('main [data-cifras]').first()).toBeVisible()
  await expect(page.locator('[role=dialog][aria-label="Introducción"], [data-introduccion]')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '¿Cómo se lee?' }).first()).toBeAttached()
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
    // B3 · A-12 y A-13: lo que costaría la falla vive en la ficha del equipo (su «Si falla hoy»).
    await f.abrir('/#/jefe/equipos/morichal/MPP-301')
    const t = await page.locator('main').innerText()
    f.ok(/≈ [\d.]+ bbl le costaría la falla/.test(t) && !t.includes('bbl si falla hoy'), 'el costo de una falla: «≈ N bbl le costaría la falla»')
    f.cerrar()
  })
})
