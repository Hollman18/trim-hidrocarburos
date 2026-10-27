// F3 · Configuración, Conectores y Perfil (fase 4 de la revisión): el administrador abre en «N de M pasos
// listos» (P-04), ninguna pestaña horizontal (UI-01), un título por parte (I-adm-3), títulos en frase
// (UI-04/UI-15), el «?» dibujado (UI-16), el nombre del campo sin cortar (UI-17), la filosofía sin el rótulo
// «modelo choke» y sin «se pierde» (T-11, T-8), «Lo que dedujo TRIM» plegado (P-filosofia-1), Conectores con
// filas y una acción principal (P-conectores-1, UI-19), el registro sin servicio en el demo (A24) y el avatar
// en el índigo (UI-10). Se prueba lo que ve la persona.
import { expect, type Page } from '@playwright/test'
import { test } from './apoyo.ts'

/** Títulos de tarjeta en MAYÚSCULAS espaciadas (dos palabras o más en mayúsculas). */
const mayusculas = (page: Page) => page.evaluate(() => [...document.querySelectorAll('main h2, main h3, main h4')]
  .map(h => (h as HTMLElement).innerText.trim()).filter(t => /[A-ZÁÉÍÓÚÑ]{3,}\s+[A-ZÁÉÍÓÚÑ]{2,}/.test(t) && t === t.toUpperCase()))
/** Lo que se sale de la vista a lo ancho. */
const sale = (page: Page) => page.evaluate(() => { const v = document.querySelector('.vista')!; return v.scrollWidth - v.clientWidth })

test('Configurar · el administrador abre en el estado del campo, sin pestañas, y cada paso lleva a donde se hace', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/adm/configuracion/ceiba/curso')
  // P-04: la cifra «3 de 6», lo que falta y una fila por paso, sin desplazarse.
  const estado = page.locator('main [data-estado-config="ceiba"]')
  await expect(estado.locator('[data-cifra]')).toHaveText('3 de 6')
  await expect(estado.locator('[data-falta]')).toHaveText('Falta firmar a qué pozos sirve cada equipo.')
  f.ok(await estado.locator('[data-cifra]').evaluate(e => e.getBoundingClientRect().bottom <= innerHeight), 'la cifra se ve sin desplazarse')
  const pasos = await estado.locator('[data-paso]').evaluateAll(es => es.map(e => `${e.getAttribute('data-paso')}:${e.getAttribute('data-listo')}`))
  f.ok(pasos.join(' ') === 'perfil:si tanques:si topologia:no capacidades:no factor:no metas:si', `una fila por paso, en su orden (${pasos.join(' ')})`)
  // UI-01: ninguna pestaña; las partes, en una lista.
  f.ok(await page.locator('[role=tablist], [role=tab]').count() === 0, 'ninguna pestaña en Configuración')
  await expect(page.locator('main nav[data-partes] button')).toHaveText(['Configuración técnica', 'Filosofía operacional', 'Metas de los campos', 'Usuarios y accesos'])
  // Los otros campos con su cuenta, a un toque.
  await expect(page.locator('main [data-otros-campos]')).toContainText('Morichal Norte · 3 de 6')

  // Un paso lleva a donde se hace: «Lo que deja pasar cada tramo» abre la filosofía en su paso 2.
  await page.locator('main [data-paso="capacidades"]').click()
  await expect(page.getByRole('heading', { name: 'Paso 2 · Capacidades' })).toBeVisible({ timeout: 15_000 })
  f.ok((await f.hash()).startsWith('#/adm/filosofia/ceiba'), `el paso abre la filosofía operacional (${await f.hash()})`)
  // T-11 y T-8: sin el rótulo «modelo choke»; la ⓘ junto al título dice «dónde se deja de producir».
  const t = await f.texto()
  f.ok(!/modelo choke/i.test(t), 'la filosofía ya no dice «modelo choke» de segundo')
  const info = await page.locator('main [aria-label^="Modelo choke:"]').first().getAttribute('aria-label')
  f.ok(!!info && info.includes('dónde se deja de producir') && !info.includes('se pierde'), 'la ⓘ explica el modelo y dice «se deja de producir», no «se pierde»')

  // El borrador vive mientras se navega: aceptar un grupo en el paso 1 lo dice el estado.
  await page.getByRole('button', { name: /Equipos y pozos/ }).click()
  await f.esperarTexto('Paso 1 · Equipos y pozos')
  const grupo = page.locator('main button[aria-label^="Aceptar lo que TRIM dedujo para"]').first()
  const n = Number((await grupo.getAttribute('aria-label'))!.match(/para (\d+) equipos?/)![1])
  await grupo.click(); await f.esperar(300)
  await page.locator('main [data-volver-estado]').click()
  await expect(estado.locator('[data-paso="topologia"]')).toContainText(`en el borrador faltan ${36 - n} de 36 equipos por contestar`)
  await expect(estado.locator('[data-borrador]')).toContainText('sin firmar en el borrador')

  // Una parte, con su título y los suyos en frase (I-adm-3, UI-04).
  await f.clic('Configuración técnica'); await f.esperar(300)
  await expect(page.locator('main h2').first()).toHaveText('Configuración técnica')
  const tecnica = await f.texto()
  f.ok(tecnica.includes('Tanques de agua') && tecnica.includes('Membrete del informe') && !tecnica.includes('TANQUES DE AGUA'), 'lo técnico, con sus títulos en frase')
  f.ok((await mayusculas(page)).length === 0, `ningún título en MAYÚSCULAS (${(await mayusculas(page)).join(' | ')})`)
  await page.locator('main [data-volver-estado]').click()
  await expect(estado.locator('[data-cifra]')).toHaveText('3 de 6')
  f.cerrar()
})

test('Configurar · los demás roles: sus partes en una lista, sin estado ni pestañas', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/ger/configuracion/ceiba/curso')
  f.ok(await page.locator('main [data-estado-config]').count() === 0, 'el gerente no ve el estado (no configura lo técnico)')
  await expect(page.locator('main nav[data-partes] button')).toHaveText(['Metas de los campos', 'Usuarios y accesos'])
  await expect(page.locator('main nav[data-partes] [aria-current="page"]')).toHaveText('Metas de los campos')
  f.ok(await page.locator('[role=tablist], [role=tab]').count() === 0, 'ninguna pestaña')
  await f.clic('Usuarios y accesos'); await f.esperar(300)
  await expect(page.locator('main h2').first()).toHaveText('Usuarios y accesos')
  await expect(page.locator('main nav[data-partes] [aria-current="page"]')).toHaveText('Usuarios y accesos')
  f.ok((await f.texto()).includes('Quién entra'), 'la tarjeta de accesos no repite el título de la parte')

  await f.ir('#/prod/configuracion/ceiba/curso')
  await expect(page.locator('main nav[data-partes] button')).toHaveText(['Filosofía operacional', 'Configuración técnica', 'Metas de los campos'])
  f.ok((await f.texto()).includes('Solo lectura: lo prepara y lo firma el administrador'), 'producción la lee en solo lectura')
  f.cerrar()
})

test('Configurar · en el teléfono el nombre del campo no se corta y nada se sale', async ({ flujo: f }) => {
  const { page } = f
  await page.setViewportSize({ width: 390, height: 844 })
  await f.abrir('/#/adm/configuracion/morichal/curso')
  await expect(page.locator('main [data-estado-config] [data-cifra]')).toHaveText('3 de 6')
  f.ok(await sale(page) <= 0, 'el estado no se sale a 390 px')
  await f.clic('Metas de los campos'); await f.esperar(400)
  const cortados = await page.locator('main [data-nombre-campo]').evaluateAll(es => es.filter(e => e.scrollWidth > e.clientWidth + 1 || getComputedStyle(e).textOverflow === 'ellipsis').map(e => e.textContent))
  f.ok(cortados.length === 0 && await page.locator('main [data-nombre-campo]', { hasText: 'Morichal Norte' }).count() > 0, `«Morichal Norte» completo en las metas (cortados: ${cortados.join(', ') || 'ninguno'})`)
  f.ok(await sale(page) <= 0, 'las metas no se salen a 390 px')
  f.cerrar()
})

test('Filosofía · el «?» de la propuesta es un dibujo y «Lo que dedujo TRIM» va plegado', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/adm/filosofia/ceiba/curso')
  await f.esperarTexto('Paso 1 · Equipos y pozos')
  // UI-16: ninguna marca de 14 unidades lleva texto escrito; la de la propuesta es un trazo.
  // (El número de una marca de prioridad sí es texto: es la excepción de X5 §3.4.)
  const escritos = await page.locator('main svg[viewBox="0 0 14 14"] text').evaluateAll(ts => ts.map(t => t.textContent ?? '').filter(x => !/^[123]$/.test(x)))
  f.ok(escritos.length === 0, `ninguna marca de la filosofía lleva otro <text> (saldría a 7 px): ${escritos.join(' ') || 'ninguno'}`)
  f.ok(await page.locator('main path[data-pregunta]').count() > 0, 'la propuesta de TRIM lleva su «?» dibujado')
  // P-filosofia-1: lo que TRIM solo dedujo, plegado.
  const plegados = page.locator('main details[data-dedujo]')
  f.ok(await plegados.count() > 0 && await plegados.evaluateAll(ds => ds.every(d => !(d as HTMLDetailsElement).open)), '«Lo que dedujo TRIM» está plegado')
  f.ok(!(await f.texto()).includes('LO QUE TRIM DEDUJO DEL REGISTRO'), 'sin el rótulo en mayúsculas')
  f.ok((await mayusculas(page)).length === 0, `ningún título en MAYÚSCULAS (${(await mayusculas(page)).join(' | ')})`)
  await plegados.first().locator('summary').click()
  await expect(plegados.first()).toContainText('Así lo deduce TRIM del registro del campo')
  f.cerrar()
})

test('Conectores · las filas de SAP dicen qué va y qué viene; una sola acción principal; el demo sin registro lo dice', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/adm/conectores/ceiba/curso')
  const t = await f.texto()
  f.ok(/Avisos a SAP\s*\d+/.test(t) && /Órdenes de SAP\s*18 · 1 abierta/.test(t) && !t.includes('TRIM → SAP') && !t.includes('SAP → TRIM'),
    'P-conectores-1: «Avisos a SAP», «Órdenes de SAP · 18 · 1 abierta», sin las flechas')
  f.ok(t.includes('Sistemas corporativos') && t.includes('Catálogos de daño') && (await mayusculas(page)).length === 0, 'los títulos en frase')
  // UI-19: los tags por asociar son filas que abren su asociación; a la vista, una sola acción principal.
  const filas = page.locator('main [data-tag-pendiente]')
  if (await filas.count()) {
    f.ok(await page.locator('main button', { hasText: /^Asociar/ }).count() === 0, 'ningún «Asociar» suelto a la vista: solo «Aplicar las N»')
    await filas.first().locator('button[aria-expanded]').click()
    await expect(filas.first().locator('select')).toBeVisible()
    await expect(filas.first().locator('button', { hasText: /^Asociar/ })).toBeVisible()
  } else f.ok(true, 'sin tags por asociar en este campo')

  // A24: con la fuente del demo y nada detrás de la ruta (el demo construido), se dice qué es y adónde ir.
  await page.route('**/campos/*/inventario', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>trim</title>' }))
  await page.route('**/campos/*/tags/pendientes', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>trim</title>' }))
  // Una carga nueva (no un cambio de hash): todo lo que pide la página pasa por esas rutas.
  await f.abrir('/#/adm/conectores/morichal/curso')
  await expect(page.locator('main [data-registro-sin-servicio]')).toContainText('En el demo no hay bordes conectados: el registro lo sirve el backend.')
  f.ok(!(await f.texto()).includes('no hay un servicio conectado'), 'sin el error técnico de la ruta')
  await page.locator('main [data-registro-sin-servicio] button', { hasText: 'Ver la configuración' }).click()
  await expect(page.locator('main [data-estado-config]')).toBeVisible()
  f.cerrar()
})

test('Mi perfil · el avatar en el índigo de la marca y los títulos en frase', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/adm/perfil/ceiba/curso')
  const [fondo, marca] = await page.evaluate(() => {
    const a = document.querySelector('main [data-avatar]')!
    const p = document.createElement('i'); p.style.color = 'var(--marca)'; document.body.append(p)
    const m = getComputedStyle(p).color; p.remove()
    return [getComputedStyle(a).backgroundColor, m]
  })
  f.ok(fondo === marca, `el avatar va en --marca (${fondo})`)
  const t = await f.texto()
  f.ok(t.includes('Identidad') && t.includes('Sesiones y contraseña') && (await mayusculas(page)).length === 0, 'los títulos en frase')
  f.ok(t.includes('su foco') && !/\btu foco\b/.test(t), 'de usted: «su foco»')
  f.cerrar()
})
