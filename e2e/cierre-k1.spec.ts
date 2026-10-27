// K1 · El cierre de los pendientes cruzados de la revisión (fase 4): el Riesgo del jefe y de confiabilidad
// fundido en su Equipos sin perder nada (P-10), la tubería de La planta viva en Planta (P-16 / H8), una
// familia por equipo (P-09), lo diferido sin «se pierde» en las ⓘ (T-8), el color siempre con su forma o su
// palabra (H20, la celda de «¿Cuadra?» y H13.2), los niveles de títulos del diagnóstico (A15) y la cabecera
// del teléfono en La planta viva de un campo (T-1, pedido de K2). Se prueba lo que ve la persona; cada caso
// falla con la pantalla de antes.
import { expect } from '@playwright/test'
import { test } from './apoyo.ts'

test('P-10 · Riesgo del jefe en su Equipos: la exposición, «cruza en», «qué hacer», el colchón y «le costaría la falla»', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/jefe/equipos/ceiba')
  // El menú ya no ofrece Riesgo; lo que traía va debajo de la lista, con su título.
  const riesgo = page.locator('main [data-lista-equipos] [data-riesgo]')
  await expect(riesgo.getByRole('heading', { name: 'Qué está en riesgo', exact: true })).toHaveCount(1)
  // El enlace de arriba de las filas lleva ahí y le pasa el foco.
  await page.locator('main [data-ir-en-riesgo]').click()
  await expect(page.locator('#en-riesgo')).toBeFocused()
  // El salto anima (sin «reducir movimiento»): se espera a que llegue.
  await expect.poll(() => page.locator('#en-riesgo').evaluate(e => { const r = e.getBoundingClientRect(), v = e.closest('.vista')!.getBoundingClientRect(); return Math.round(r.top - v.top) }),
    { message: '«Qué está en riesgo» queda arriba de la vista después del salto' }).toBeLessThan(40)
  f.ok(await page.evaluate(() => document.documentElement.scrollTop) === 0, 'se desplaza la vista, no la página (la banda del ☰ no se va)')
  // Las cifras de la cabeza de Riesgo, con su nombre: lo que se deja de producir, lo que está en juego y la exposición.
  await expect(riesgo.locator('[data-se-deja-de-producir]')).toContainText(/1\.966\s*bbl\/d/)
  await expect(riesgo.locator('[data-en-juego]')).toHaveText(/si paran, hasta [\d.]+ bbl\/d en juego/)
  // En La Ceiba solo avisa K-101, un servicio: la exposición lo dice con su porqué (en Morichal, abajo, la cifra).
  await expect(riesgo.locator('[data-exposicion]')).toContainText('solo servicios del campo')
  await expect(riesgo.locator('[data-mas-cercano]')).toContainText(/K-101|cruza en/)
  // Cada equipo que avisa: «cruza en», «si para», lo que le costaría la falla y «qué hacer».
  const k101 = riesgo.locator('[data-fila-riesgo="K-101"]')
  await expect(k101).toContainText('ya pasó el límite')
  await expect(k101).toContainText('hasta 9.394 bbl/d')
  await expect(k101.getByRole('img', { name: /^Qué hacer · K-101:/ })).toHaveCount(1)
  // «Por qué» (lo parado, con sus pozos) y «Si falla hoy» entero, con dónde se trabaría y el colchón.
  await expect(riesgo.locator('section', { has: page.getByRole('heading', { name: 'Por qué', exact: true }) })).toContainText(/P-201B[\s\S]*pozos/)
  await expect(riesgo.locator('[data-si-falla="ceiba"] [data-fila-critica="P-201A"]')).toContainText(/3\.059[\s\S]*min/)
  // Lo que el jefe decide va una vez, arriba de la lista: «Si falla hoy» no lo repite.
  f.ok(await page.locator('main [data-decide="jefe"]').count() === 1 && await page.locator('main [data-cambio-hoy]').count() === 1,
    '«Ojo: no conviene intervenirlas hoy» y «Cambió hoy», una vez cada uno')
  // Morichal: el colchón de P-201B («0 si vuelve antes de 10 h») y lo que le costaría la falla.
  await f.ir('#/jefe/equipos/morichal')
  await expect(page.locator('main [data-riesgo] [data-exposicion]')).toContainText(/≈ [\d.]+ bbl de exposición si fallan hoy/)
  const p201 = page.locator('main [data-riesgo] [data-fila-riesgo="P-201B"]')
  await expect(p201).toContainText(/≈ [\d.]+ bbl le costaría la falla/)
  await expect(p201).toContainText(/0 si vuelve\santes\sde\s10\sh/)
  f.cerrar()
})

test('P-10 · confiabilidad: la ⓘ del método y «Cambió hoy» en «Si falla hoy»; el próximo instrumento, una vez, arriba', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/conf/riesgo/morichal/curso')
  f.ok((await f.hash()).startsWith('#/conf/equipos/morichal'), `la dirección de Riesgo abre Equipos (${await f.hash()})`)
  await expect(page.locator('#si-falla-hoy-titulo').getByRole('img', { name: /^Modelo choke:/ })).toHaveCount(1)
  f.ok(await page.locator('main [data-decide="conf"]').count() === 1, '«¿Dónde va el próximo instrumento?» va una vez: arriba de la lista')
  // A confiabilidad lo de hoy se lo dicen su cabeza y cada fila (F3 · P-02): «Si falla hoy» no repite «Cambió hoy».
  await f.ir('#/conf/equipos/ceiba')
  f.ok(await page.locator('main [data-cambio-hoy]').count() === 0, 'sin «Cambió hoy» repetido debajo de la lista')
  f.ok(await page.locator('main [data-ir-en-riesgo]').count() === 0, 'a confiabilidad no se le suma el enlace (Equipos es su inicio y su cabeza ya abre en «Si falla hoy»)')
  f.cerrar()
})

test('P-16 / H8 · Planta monta la tubería de La planta viva; la hoja de la planta lleva al esquema y al agua', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/prod/planta/ceiba/curso')
  const tecnica = page.locator('main [data-tuberia-tecnica]')
  await expect(tecnica).toHaveCount(1)
  await expect(tecnica.locator('[data-frase-tecnica]')).toHaveText(/^Limitan los pozos: a la planta le sobran [\d.]+ bbl\/d\. Con P-201B parada/)
  f.ok(await page.locator('main [data-dibujo-y-frase], main [data-se-trabo]').count() === 0, 'sin la tubería de antes')
  await tecnica.locator('svg[data-tuberia] [data-tramo="planta"]').click()
  const acciones = page.locator('[data-acciones-tramo]')
  await expect(acciones.getByRole('button')).toHaveText(['Ver la tubería del agua ›', 'Ver la planta en el esquema ›'])
  await acciones.getByRole('button', { name: 'Ver la planta en el esquema ›' }).click()
  const esquema = page.locator('main svg[role=group][aria-label^="Planta de "]')
  await expect.poll(() => esquema.evaluate(e => { const r = e.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0 })).toBe(true)
  f.ok(await page.locator('[data-acciones-tramo]').count() === 0, 'la hoja se cierra al ir al esquema')
  // Un campo de gas: la frase del motor, sin dibujo de crudo.
  await f.ir('#/adm/planta/zarza/curso')
  await expect(page.locator('main [data-tuberia-tecnica] [data-campo-de-gas]')).toHaveText('La Zarza es un campo de gas: su tubería todavía no está.')
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
  f.ok(!/bomba de reinyecci[oó]n/i.test(await page.locator('main [data-si-falla="ceiba"]').innerText()), '«Si falla hoy» tampoco')
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
  const fuera = page.locator('main svg[aria-label^="Factor de asignación"] [data-fuera-de-banda]')
  f.ok(await fuera.count() > 0, `hay meses fuera de banda (${await fuera.count()})`)
  f.ok(await fuera.evaluateAll(gs => gs.every(g => g.querySelector('svg[viewBox="0 0 14 14"] text')?.textContent === '3')), 'cada uno con la marca de aviso y su «3»')
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
  const { page } = f
  await f.abrir('/#/prod/causa/ceiba/curso')
  await f.esperarTexto('LC-08')
  const t = await f.texto()
  // La tarjeta (la fila de la ANH) y la pregunta dicen lo mismo.
  f.ok(/LC-08[\s\S]{0,200}?108 bbl/.test(t) && !/LC-08[\s\S]{0,200}?109 bbl/.test(t), 'LC-08: 108 bbl (el exacto, 108,5, redondeado daba 109)')
  f.ok(!/109 bbl/.test(t), 'en ninguna parte de Identificar dice 109')
  f.ok(/LC-21[\s\S]{0,200}?247 bbl/.test(t), 'LC-21: 247 bbl (247 + 108 = 355, como Hoy)')
  await f.ir('#/jefe/mantenimiento/ceiba/curso')
  await expect(page.locator('main [data-por-identificar="LC-08"]')).toContainText('108 bbl')
  f.cerrar()
})
