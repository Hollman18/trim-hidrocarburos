// K1 · El cierre de los pendientes cruzados de la revisión (fase 4): el Riesgo del jefe y de confiabilidad
// fundido en su Equipos sin perder nada (P-10), la tubería de La planta viva en Planta (P-16 / H8), una
// familia por equipo (P-09), lo diferido sin «se pierde» en las ⓘ (T-8), el color siempre con su forma o su
// palabra (H20, la celda de «¿Cuadra?» y H13.2), los niveles de títulos del diagnóstico (A15) y la cabecera
// del teléfono en La planta viva de un campo (T-1, pedido de K2). Se prueba lo que ve la persona; cada caso
// falla con la pantalla de antes.
import { expect } from '@playwright/test'
import { test } from './apoyo.ts'

// B3 · A-13 y A-14: «Qué está en riesgo» (y su «Cambió hoy») salió de debajo de la lista: repetía la cabeza, la franja y
// la lista. Lo que solo él traía queda donde se decide: lo que costaría la falla y el colchón, en la ficha del equipo; lo
// que avisa, en el número del jefe; «No intervenir hoy», una vez, en su Hoy.
test('P-10 y A-13 · jefe: la dirección de Riesgo abre Equipos sin «Qué está en riesgo»; lo que costaría la falla y el colchón, en la ficha', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/jefe/riesgo/ceiba/curso')
  f.ok((await f.hash()).startsWith('#/jefe/equipos/ceiba'), `la dirección de Riesgo abre Equipos (${await f.hash()})`)
  await expect(page.locator('main [data-riesgo]')).toHaveCount(0)
  f.ok(await page.locator('main [data-decide="jefe"]').count() === 0 && await page.locator('main [data-cambio-hoy]').count() === 0, 'sin «Ojo» ni «Cambió hoy» repetidos en la lista')
  await expect(page.locator('main [data-fila-equipo="K-101"] [data-cifra-fila]')).toContainText(/hasta\s*9\.394/)
  await f.ir('#/jefe/equipos/morichal/P-201B')
  const ficha = page.locator('main [data-si-falla-ficha="P-201B"]')
  await expect(ficha).toContainText(/≈ [\d.]+ bbl le costaría la falla/)
  await expect(ficha).toContainText(/0 si vuelve\santes\sde\s10\sh/)
  await f.ir('#/jefe/hoy/ceiba/curso')
  await expect(page.locator('main [data-renglon="avisan"]')).toContainText('K-101')
  await expect(page.locator('main [data-no-intervenir]')).toHaveCount(1)
  f.cerrar()
})

test('P-10 · confiabilidad: la dirección de Riesgo abre Equipos; el próximo instrumento, una vez, arriba', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/conf/riesgo/morichal/curso')
  f.ok((await f.hash()).startsWith('#/conf/equipos/morichal'), `la dirección de Riesgo abre Equipos (${await f.hash()})`)
  f.ok(await page.locator('main [data-decide="conf"]').count() === 1, '«¿Dónde va el próximo instrumento?» va una vez: arriba de la lista')
  await f.ir('#/conf/equipos/ceiba')
  f.ok(await page.locator('main [data-cambio-hoy]').count() === 0, 'sin «Cambió hoy» repetido debajo de la lista')
  f.ok(await page.locator('main [data-ir-en-riesgo], main [data-riesgo]').count() === 0, 'sin el enlace ni el bloque de Riesgo')
  f.cerrar()
})

// v3 (A-10): la tubería del campo va UNA vez, en el inicio de producción (con el kit SCADA); la pantalla Planta es el
// nivel 2 y se abre desde la hoja del tramo de la planta, con el esquema y la tubería del agua.
test('P-16 / H8 · la tubería va una vez, en el inicio de producción; la hoja de la planta lleva al esquema y al agua', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/prod/planta-viva/ceiba/curso')
  await expect(page.locator('main [data-tuberia-kit]')).toHaveCount(1)
  await expect(page.locator('main [data-produccion-cifra] [data-explica]')).toHaveText(/^Limitan los pozos: a la planta le sobran [\d.]+ bbl\/d\. Con P-201B parada/)
  await page.locator('main [data-tramo-kit="planta"]').click()
  const acciones = page.locator('[data-acciones-tramo]')
  await expect(acciones.getByRole('button')).toHaveText(['Ver la planta en el esquema', 'Ver la tubería del agua'])
  await acciones.getByRole('button', { name: 'Ver la planta en el esquema' }).click()
  const esquema = page.locator('main svg[role=group][aria-label^="Planta de "]')
  await expect.poll(() => esquema.evaluate(e => { const r = e.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0 })).toBe(true)
  f.ok(await page.locator('[data-acciones-tramo]').count() === 0, 'la hoja se cierra al ir al esquema')
  f.ok(await page.locator('main [data-tuberia-kit], main [data-tuberia-tecnica]').count() === 0, 'la pantalla Planta no repite la tubería (A-10)')
  // Un campo de gas: la frase del motor, sin dibujo de crudo.
  await f.ir('#/ger/planta-viva/zarza/curso')
  await expect(page.locator('main [data-gas]')).toHaveText('La Zarza es un campo de gas: su tubería todavía no está.')
  f.cerrar()
})

test('P-09 y T-8 · una familia por equipo, y lo diferido «se deja de producir» también en las ⓘ', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/conf/equipos/ceiba')
  for (const eq of ['P-201A', 'P-201C']) {
    const fila = page.locator(`main [data-fila-equipo="${eq}"]`)
    await expect(fila).toContainText('bomba de agua')
    f.ok(!/reinyecci[oó]n/i.test(await fila.innerText()), `${eq} no se llama «bomba de reinyección» en la lista`)
  }
  f.ok(!/reinyecci[oó]n/i.test(await page.locator('main [data-renglon="si-falla-hoy"]').innerText()), '«Si falla hoy» tampoco')
  await f.ir('#/conf/confiabilidad/ceiba/curso')
  const t = await f.texto()
  f.ok(t.includes('Bombas de agua') && !t.includes('Bombas de reinyección'), 'Confiabilidad: la familia «Bombas de agua»')
  await f.ir('#/prod/causa/ceiba/curso')
  await expect(page.getByRole('img', { name: /^¿Qué método es\?: Es un método internacional para ubicar dónde se deja de producir:/ }).first()).toBeAttached()
  f.ok(await page.getByRole('img', { name: /dónde se pierde/ }).count() === 0, 'ninguna ⓘ de Identificar dice «dónde se pierde producción»')
  f.cerrar()
})

test('Color con forma y palabra · el factor fuera de banda, «bajo la meta» y la señal sin lectura', async ({ flujo: f }) => {
  const { page } = f
  // H20 (el mismo caso): el mes fuera de banda del factor lleva el cuadrado «3», no un cuadrito sin número.
  await f.abrir('/#/prod/produccion/palmar/doce')
  // v3: el factor es la tendencia del kit con su banda; los meses fuera de banda se dicen con la marca de aviso y su nombre.
  const fuera = page.locator('main [data-factor] ~ [data-fuera-de-banda], main [data-fuera-de-banda]').first()
  f.ok(await fuera.count() > 0 && /Fuera de la banda: \S/i.test(await fuera.innerText()), `hay meses fuera de banda, por su nombre («${await fuera.innerText().catch(() => '')}»)`)
  f.ok(await fuera.evaluate(g => g.querySelector('svg[viewBox="0 0 14 14"] text')?.textContent === '3'), 'con la marca de aviso y su «3»')
  f.ok(await page.locator('main [data-factor] [data-kit="tendencia"] [data-banda]').count() === 1, 'la banda regulatoria, sombreada en la tendencia')
  // «¿Cuadra?»: la marca de la celda «Real» lleva su palabra al lado.
  await f.ir('#/prod/produccion/ceiba/curso')
  const bajo = page.locator('main [data-bajo-meta]')
  f.ok(await bajo.count() > 0 && (await bajo.allTextContents()).every(x => /bajo la meta$/.test(x.trim()))
    && await bajo.evaluateAll(es => es.every(e => !!e.querySelector('svg[viewBox="0 0 14 14"]'))), '«bajo la meta» al lado de la marca, en la misma celda')
  // H13.2: MN-41 está parada; sus señales sin lectura van en gris, sin morado sin forma.
  await f.ir('#/conf/equipos/morichal/MN-41')
  await page.locator('main [data-senal-fija]').first().waitFor()
  const sinLectura = await page.locator('main [data-senal-fija][data-gris="si"]').evaluateAll(es => es.filter(e => e.querySelector('[data-valor]')?.textContent?.trim() === '---')
    .map(e => ({ tag: e.getAttribute('data-senal-fija'), morado: [...e.querySelectorAll('rect, circle, path')].filter(x => !x.closest('svg[viewBox="0 0 14 14"]')).some(x => getComputedStyle(x).stroke === getComputedStyle(document.body).getPropertyValue('--sincom').trim() || (x.getAttribute('stroke') ?? '').includes('sincom')) })))
  f.ok(sinLectura.length > 0 && sinLectura.every(x => !x.morado), `«---» sin lectura, sin el morado fuera de su marca (${sinLectura.map(x => x.tag).join(', ')})`)
  f.cerrar()
})

test('A15 · el diagnóstico de P-201B no salta de nivel: «Planes» va en h2', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/conf/equipos/ceiba/P-201B/diagnostico')
  await page.locator('main [data-nivel4]').waitFor()
  const niveles = await page.evaluate(() => [...document.querySelectorAll('main h1, main h2, main h3, main h4, main h5')].filter(h => h.getClientRects().length).map(h => Number(h.tagName[1])))
  f.ok(niveles[0] === 1 && niveles.every((n, i) => i === 0 || n <= niveles[i - 1]! + 1), `los encabezados no saltan de nivel (${niveles.join(' ')})`)
  const planes = page.locator('main [data-planes]')
  if (await planes.count()) await expect(planes.locator('h2')).toHaveText('Planes · lo que todavía se puede mover')
  f.cerrar()
})

test('H2 · Identificar dice el entero de cada parada, el mismo de Hoy: LC-08 = 108 bbl', async ({ flujo: f }) => {
  await f.abrir('/#/prod/causa/ceiba/curso')
  await f.esperarTexto('LC-08')
  const t = await f.texto()
  // La tarjeta (la fila de la ANH) y la pregunta dicen lo mismo.
  f.ok(/LC-08[\s\S]{0,200}?108 bbl/.test(t) && !/LC-08[\s\S]{0,200}?109 bbl/.test(t), 'LC-08: 108 bbl (el exacto, 108,5, redondeado daba 109)')
  f.ok(!/109 bbl/.test(t), 'en ninguna parte de Identificar dice 109')
  f.ok(/LC-21[\s\S]{0,200}?247 bbl/.test(t), 'LC-21: 247 bbl (247 + 108 = 355, como Hoy)')
  // A-12: Mantenimiento se borró; su dirección abre el Hoy del jefe.
  await f.ir('#/jefe/mantenimiento/ceiba/curso')
  f.ok((await f.hash()).startsWith('#/jefe/hoy/'), 'la dirección de Mantenimiento abre el Hoy del jefe')
  f.cerrar()
})
