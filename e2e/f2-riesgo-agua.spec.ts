/* F2 · Riesgo, la tubería del agua y la tubería de antes (fase 4 de la revisión; verificados-v1 y v2):
   - T-8 / G-1 / G-2 / H15: lo diferido «se deja de producir», nunca «se pierde» (regla 3);
   - H3, H16 y H17: cada equipo lleva UNA marca, la de la franja, con su palabra; sin condición, ninguna;
   - G-16 (D-2): «Si falla hoy» va en bbl/d; el costo de una falla, en bbl, lleva otro nombre;
   - P-riesgo-1, T-10 y T-11: el reparto se llama «Por qué», sin puestos numerados y sin el rótulo «modelo choke»;
   - P-09: P-201B es «bomba de agua»; A18: el salto a «Si falla hoy» respeta «reducir movimiento»;
   - P-agua-1, P-agua-2 y H32: Agua abre con la frase de X4 §6.1 y la cuenta va detrás de «Ver la cuenta»;
     «Por qué es crítica» en tres líneas con viñetas; «sin firmar» sin «dato del demo» en cada caja;
   - T-9 / P-planta-2, P-planta-3, G-6 y H22 en la tubería de antes, donde todavía se monte (Planta, Producción). */
import { expect } from '@playwright/test'
import { test } from './apoyo.ts'

/** Lo diferido dicho como pérdida (el texto que se ve, no el código). */
const PIERDE = /\bse pierden?\b|\bpierden\b|se perdió|se está perdiendo/i

// B3 · A-13: «Qué está en riesgo» salió de debajo de la lista de Equipos (repetía la cabeza, la franja y la lista). Lo
// que se probaba de él vale para la lista: nada «se pierde», una marca por equipo con su palabra y «bomba de agua».
test('Equipos del jefe (antes Riesgo): se deja de producir, una marca por equipo con su palabra y la familia de campo', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/jefe/riesgo/ceiba/curso')
  f.ok((await f.hash()).startsWith('#/jefe/equipos/ceiba'), `la dirección de Riesgo abre Equipos (${await f.hash()})`)
  await page.locator('main [data-fila-equipo]').first().waitFor()
  const t = await f.texto()
  f.ok(!PIERDE.test(t), `nada «se pierde» en Equipos (${t.match(PIERDE)?.[0] ?? 'ninguno'})`)
  f.ok(!/\d bbl si falla hoy/.test(t), 'el costo de una falla (en bbl) no se llama «si falla hoy» (D-2)')
  await expect(page.locator('main [data-fila-equipo="P-201B"]')).toContainText('Alarma · parada')
  await expect(page.locator('main [data-fila-equipo="P-201B"]')).toContainText('bomba de agua')
  await expect(page.locator('main [data-fila-equipo="LC-21"]')).toContainText('Atención')
  const marcas = await page.locator('main [data-fila-equipo]').evaluateAll(es => es.map(e => ({ eq: e.getAttribute('data-fila-equipo'), c: e.getAttribute('data-condicion'), n: e.querySelectorAll('svg[viewBox="0 0 14 14"]').length })))
  f.ok(marcas.find(m => m.eq === 'P-201B')?.c === 'alarma' && marcas.find(m => m.eq === 'LC-21')?.c === 'atencion', 'la marca de la franja en cada fila')
  f.ok(await page.locator('#si-falla-hoy, main [data-riesgo]').count() === 0, 'sin el bloque de Riesgo debajo de la lista')
  f.cerrar()
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
