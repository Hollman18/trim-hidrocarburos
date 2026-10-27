/* F2 · Riesgo, la tubería del agua y la tubería de antes (fase 4 de la revisión; verificados-v1 y v2):
   - T-8 / G-1 / G-2 / H15: lo diferido «se deja de producir», nunca «se pierde» (regla 3);
   - H3, H16 y H17: cada equipo lleva UNA marca, la de la franja, con su palabra; sin condición, ninguna;
   - G-16 (D-2): «Si falla hoy» va en bbl/d; el costo de una falla, en bbl, lleva otro nombre;
   - P-riesgo-1, T-10 y T-11: el reparto se llama «Por qué», sin puestos numerados y sin el rótulo «modelo choke»;
   - P-09: P-201B es «bomba de agua»; A18: el salto a «Si falla hoy» respeta «reducir movimiento»;
   - P-agua-1, P-agua-2 y H32: Agua abre con la frase de X4 §6.1 y la cuenta va detrás de «Ver la cuenta»;
     «Por qué es crítica» en tres líneas con viñetas; «sin firmar» sin «dato del demo» en cada caja;
   - T-9 / P-planta-2, P-planta-3, G-6 y H22 en la tubería de antes, donde todavía se monte (Planta, Producción). */
import { type Page } from '@playwright/test'
import { test } from './apoyo.ts'

/** Lo diferido dicho como pérdida (el texto que se ve, no el código). */
const PIERDE = /\bse pierden?\b|\bpierden\b|se perdió|se está perdiendo/i

/** Cada equipo con las condiciones que muestran sus marcas en la vista (H3: una sola por equipo). */
const marcasPorEquipo = (page: Page) => page.evaluate(() => {
  const m: Record<string, string[]> = {}
  for (const el of document.querySelectorAll('main [data-condicion][data-marca-de]')) {
    const equipo = el.getAttribute('data-marca-de') ?? '', c = el.getAttribute('data-condicion') ?? ''
    if (!(m[equipo] ??= []).includes(c)) m[equipo].push(c)
  }
  return m
})

// K1 · P-10: el Riesgo del jefe y de confiabilidad vive en su Equipos («Qué está en riesgo», debajo de la lista).
test('Riesgo del jefe: se deja de producir, una marca por equipo con su palabra, «Por qué» y el costo de una falla con su nombre', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/jefe/riesgo/ceiba/curso')
  await page.waitForSelector('[data-riesgo] [data-condicion]')
  f.ok((await f.hash()).startsWith('#/jefe/equipos/ceiba'), `la dirección de Riesgo abre Equipos (${await f.hash()})`)
  // Toda la vista (la lista de Equipos y «Qué está en riesgo»).
  const t = await f.texto()
  f.ok(!PIERDE.test(t), `nada «se pierde» en Riesgo (${t.match(PIERDE)?.[0] ?? 'ninguno'})`)
  f.ok(t.includes('Por qué') && !t.includes('Se deja de producir ahora, por causa'), 'el reparto de la cifra se llama «Por qué» (no repite su rótulo)')
  f.ok(!/\d bbl si falla hoy/.test(t), 'el costo de una falla (en bbl) no se llama «si falla hoy» (D-2)')
  // P-09: en las filas que arma Riesgo, la familia es la de campo (los nombres de «Si falla hoy» los da el motor de F3).
  const porQue = (await page.locator('[data-riesgo] section', { has: page.getByRole('heading', { name: 'Por qué', exact: true }) }).innerText())
  f.ok(/P-201B[\s\S]*bomba de agua/.test(porQue) && !/bomba de reinyecci[oó]n/i.test(porQue), 'en «Por qué», P-201B es «bomba de agua», no «bomba de reinyección» (P-09)')

  // La marca de P-201B es la de la franja (alarma) y va con su palabra; LC-21, atención.
  const p201 = page.locator('[data-riesgo] [data-condicion="alarma"]').filter({ hasText: 'alarma' })
  f.ok(await p201.count() >= 1, 'P-201B lleva su marca de alarma con la palabra «alarma» al lado (H16)')
  // Una marca por equipo en toda la vista: la lista de Equipos y «Qué está en riesgo» dicen la misma.
  const marcas = await marcasPorEquipo(page)
  const dobles = Object.entries(marcas).filter(([, cs]) => cs.length > 1)
  f.ok(dobles.length === 0 && marcas['P-201B']?.[0] === 'alarma' && marcas['LC-21']?.[0] === 'atencion',
    `una sola marca por equipo, la de la franja (${JSON.stringify(marcas)})`)

  // «Si falla hoy»: sin la columna del puesto (1, 1, 3…); el puesto queda en data-puesto.
  const filas = await page.locator('[data-fila-critica]').evaluateAll(es => es.map(e => ({ texto: (e as HTMLElement).innerText.trim(), puesto: e.getAttribute('data-puesto') })))
  f.ok(filas.length > 0 && filas.every(x => !/^\d/.test(x.texto)) && filas.some(x => x.puesto === '1'),
    `las filas de «Si falla hoy» no empiezan por su puesto (${filas.slice(0, 3).map(x => x.texto.split('\n')[0]).join(' · ')})`)
  f.cerrar()
})

test('Riesgo de confiabilidad: la ⓘ del método pegada al título, sin el rótulo «modelo choke»', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/conf/riesgo/morichal/curso')
  await page.waitForSelector('#si-falla-hoy')
  f.ok((await f.hash()).startsWith('#/conf/equipos/morichal'), `la dirección de Riesgo abre Equipos (${await f.hash()})`)
  const t = await f.texto()
  f.ok(!/modelo choke/i.test(t), 'confiabilidad no lee «modelo choke» como rótulo (T-11)')
  f.ok(await page.locator('#si-falla-hoy-titulo').getByRole('img', { name: /^Modelo choke: Es el modelo choke, un método internacional para ubicar dónde se deja de producir/ }).count() === 1,
    'la ⓘ del método va pegada al título «Si falla hoy» y dice «dónde se deja de producir» (T-8)')
  f.cerrar()
})

test.describe('reducir movimiento', () => {
  test.use({ reducedMotion: 'reduce' })
  test('el salto a «Si falla hoy» llega sin animar (A18)', async ({ flujo: f }) => {
    const { page } = f
    await f.abrir('/#/jefe/riesgo/ceiba/curso')
    await page.waitForSelector('#si-falla-hoy')
    const top = () => page.evaluate(() => document.getElementById('si-falla-hoy')!.getBoundingClientRect().top)
    // En Equipos, «Qué está en riesgo» va debajo de la lista: se baja hasta su panel y desde ahí se salta.
    await page.getByRole('button', { name: 'ver «Si falla hoy»' }).scrollIntoViewIfNeeded()
    const t0 = await top()
    await page.getByRole('button', { name: 'ver «Si falla hoy»' }).click()
    // Sin animación, el salto ya terminó cuando vuelve el clic; con «smooth», sigue a mitad de camino.
    const t1 = await top()
    await f.esperar(800)
    const t2 = await top()
    f.ok(t0 - t2 > 20 && Math.abs(t1 - t2) < 2, `«Si falla hoy» llega de una vez (${Math.round(t0)} → ${Math.round(t1)} → ${Math.round(t2)} px)`)
    f.cerrar()
  })
})

test('Agua: la frase de X4, la cuenta detrás de «Ver la cuenta» y «Por qué es crítica» en tres líneas', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/prod/agua/ceiba/curso')
  await page.waitForSelector('[data-frase-agua]')
  const frase = (await page.locator('[data-frase-agua]').innerText()).trim()
  f.ok(frase.startsWith('Con las tres bombas, al agua le sobra espacio. Si para una, hay que cerrar pozos.'), `la frase de arriba es la de X4 §6.1 («${frase}»)`)
  const cuenta = page.locator('[data-frases-agua]')
  f.ok(!(await cuenta.isVisible()), 'las frases con sus cuentas no están en la primera capa (P-agua-1)')
  const t = await f.texto()
  f.ok(!PIERDE.test(t), `nada «se pierde» en Agua (${t.match(PIERDE)?.[0] ?? 'ninguno'})`)
  f.ok(!/\bPARADA\b|\bHOY\b/.test(t) && !t.includes('dato del demo'), 'sin MAYÚSCULAS de máquina («PARADA», «HOY») y «dato del demo» solo en la ⓘ (P-agua-2)')
  const porQue = page.locator('[data-por-que]')
  f.ok(await porQue.locator('ol').count() === 0 && await porQue.locator('ul > li').count() === 3
      && (await porQue.locator('li').first().innerText()).trim().startsWith('No hay bomba de sobra.'),
    '«Por qué es crítica» va en tres líneas con viñetas, no numeradas (H32)')
  await page.locator('[data-frase-agua] button', { hasText: 'Ver la cuenta' }).click()
  f.ok(await cuenta.isVisible() && (await cuenta.locator('li').count()) >= 2, '«Ver la cuenta» abre las frases del motor')
  f.cerrar()
})

test('la tubería de antes (Planta y Producción): «Sale hoy», una línea de lo que limita y la cuenta detrás de «Ver la cuenta»', async ({ flujo: f }) => {
  const { page } = f
  for (const ruta of ['/#/prod/planta/ceiba/curso', '/#/prod/produccion/ceiba/curso']) {
    await f.abrir(ruta)
    const t = await f.texto()
    f.ok(!PIERDE.test(t), `${ruta}: nada «se pierde» (${t.match(PIERDE)?.[0] ?? 'ninguno'})`)
    f.ok(!/\bPasa hoy\b/.test(t), `${ruta}: lo que sale hoy se llama «Sale hoy», como en La planta viva (G-6)`)
    // La tubería de antes puede ya no montarse aquí (P-16: la reemplaza la de La planta viva): se prueba donde está.
    const corta = page.locator('[data-tuberia] [data-frase-corta]')
    if (await corta.count()) {
      f.ok((await corta.innerText()).startsWith('Limitan los pozos. Con P-201B parada, el agua solo deja pasar 236 bbl/d más de crudo.'),
        `${ruta}: una línea de lo que limita (T-9, P-planta-2)`)
      f.ok(!(await page.locator('[data-tuberia] [data-cuenta]').isVisible()) && !(await page.locator('[data-tuberia] [data-cuadre-hoy]').isVisible()),
        `${ruta}: la cuenta y el cuadre con las pruebas, detrás de «Ver la cuenta»`)
      await corta.locator('button', { hasText: 'Ver la cuenta' }).click()
      f.ok(await page.locator('[data-tuberia] [data-cuenta]').isVisible(), `${ruta}: «Ver la cuenta» la abre`)
      const medidor = page.locator('[data-tuberia] [data-medidor]')
      if (await medidor.count()) f.ok(/^Medidor oficial (en línea|sin comunicación)/.test((await medidor.innerText()).trim()), `${ruta}: el medidor oficial en corto, el tag en su ⓘ (P-planta-3)`)
    }
    const eje = page.locator('[data-serie] svg text', { hasText: /^bbl$/ })
    if (await page.locator('[data-serie] svg').count()) f.ok(await eje.count() === 1, `${ruta}: el eje de «Qué limitó, día por día» dice su unidad (H22)`)
  }
  f.cerrar()
})
