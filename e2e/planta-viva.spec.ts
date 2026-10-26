/* C2 · «La planta viva» (X4 §4; X5 §5.1, §5.3, §5.9; imágenes 1, 2 y 6 de experiencia-v2):
   - la cifra grande y su frase, del motor (`GET /api/vistas/planta-viva`): La Ceiba, 1.966 bbl/d
     «se dejan de producir en La Ceiba.», con la bomba de agua P-201B por su nombre;
   - la tubería acostada con el tramo marcado (la planta) y lo que no pasa: 1.665 + 301 = 1.966;
   - los tres momentos sobre el mismo dibujo: Antes (1 equipo avisa, la línea punteada de riesgo),
     Durante (el angostamiento rayado) y Después (118 + 573 + 355 = 1.046, el diferido del libro);
   - la hoja del tramo con el teclado (Tab y Enter): la frase, sus equipos, ¿por qué? sin códigos;
     un equipo abre su ficha ejecutiva;
   - «Todos mis campos»: 2.650 bbl/d, una fila por campo, de la que más pesa a la que menos;
   - producción ve lo mismo; en el teléfono (390 px) la tubería va de pie y nada se sale ni se pisa.

   Las cifras exactas se leen de los `data-*` de la pantalla: la pantalla redondea y aquí se
   comprueba la cuenta, no el redondeo. */
import { expect, type Page } from '@playwright/test'
import { test } from './apoyo.ts'
import { detectar } from './auditoria/detector.ts'

const cerca = (a: number, b: number) => Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b))
/** Un código de la ANH (NP_PROC, P_MANT…): el gerente no los ve nunca. */
const CODIGO_ANH = /\b(?:NP|P)_[A-Z]{2,}/

/** La cifra grande, su frase y lo que dice cada tramo del dibujo. */
const lectura = (page: Page) => page.evaluate(() => {
  const raiz = document.querySelector('[data-planta-viva]')
  const tramos = [...document.querySelectorAll('[data-tuberia] [data-tramo]')].map(t => ({
    tramo: t.getAttribute('data-tramo') ?? '', valor: Number(t.getAttribute('data-valor')), marcado: t.hasAttribute('data-marcado'),
  }))
  const sin = document.querySelector('[data-tuberia] [data-sin-identificar]')
  return {
    alcance: raiz?.getAttribute('data-planta-viva') ?? '', momento: raiz?.getAttribute('data-momento') ?? '', valor: Number(raiz?.getAttribute('data-valor')),
    cifra: document.querySelector('[data-cifra-grande] [data-cifra]')?.textContent ?? '',
    frase: document.querySelector('[data-cifra-grande] [data-frase]')?.textContent ?? '',
    explica: document.querySelector('[data-explica]')?.textContent ?? '',
    tramos, sinIdentificar: sin ? Number(sin.getAttribute('data-valor')) : 0,
    aria: document.querySelector('[data-tuberia]')?.getAttribute('aria-label') ?? '',
    tuberia: document.querySelector('[data-tuberia]')?.getAttribute('data-tuberia') ?? '',
  }
})

/** Escoge un momento con el control de píldora (un grupo de radios). */
async function momento(page: Page, m: 'antes' | 'durante' | 'despues') {
  await page.locator(`[data-momentos] [data-momento="${m}"]`).click()
  await page.waitForFunction(x => document.querySelector('[data-planta-viva]')?.getAttribute('data-momento') === x, m)
}

test('gerente: la cifra, la frase y el tramo marcado de La Ceiba, en los tres momentos', async ({ flujo: f }) => {
  await f.abrir('/#/ger/planta-viva/ceiba/curso')
  await f.page.waitForSelector('[data-planta-viva]')

  await test.step('Durante: 1.966 bbl/d se dejan de producir; la planta, marcada; 1.665 + 301 = 1.966', async () => {
    const l = await lectura(f.page)
    f.ok(l.alcance === 'campo' && l.momento === 'durante', `abre en Durante, el de un campo (${l.alcance}, ${l.momento})`)
    f.ok(l.cifra === '1.966' && l.frase === 'se dejan de producir en La Ceiba.', `la cifra y la frase: «${l.cifra} … ${l.frase}»`)
    f.ok(l.explica.includes('La bomba de agua P-201B paró a las 03:52') && l.explica.includes('LC-21'), `la explicación nombra el equipo y su familia: «${l.explica}»`)
    const marcados = l.tramos.filter(t => t.marcado).map(t => t.tramo)
    f.ok(marcados.join() === 'planta', `un solo tramo marcado: la planta (${marcados.join(', ')})`)
    const suma = l.tramos.reduce((a, t) => a + t.valor, 0) + l.sinIdentificar
    f.ok(cerca(suma, l.valor) && Math.round(l.tramos.find(t => t.tramo === 'planta')!.valor) === 1665 && Math.round(l.sinIdentificar) === 301,
      `los tramos y «sin identificar» suman la cifra (${suma.toFixed(1)} = ${l.valor.toFixed(1)}): 1.665 en la planta y 301 de LC-21`)
    f.ok(await f.page.locator('[data-tuberia] [data-rayado]').count() === 1, 'donde se trabó, la pared se angosta y el hueco va rayado')
    f.ok(l.aria.startsWith('Se dejan de producir 1.966 bbl/d') && l.aria.split(/[.:]/)[0]!.length > 0, `el nombre accesible del dibujo es la frase: «${l.aria}»`)
    const t = await f.texto()
    f.ok(!/choke/i.test(t) && !CODIGO_ANH.test(t), 'sin la palabra «choke» ni códigos de la ANH en la pantalla')
    f.ok(t.includes('Lo que todavía se puede mover') && t.includes('simulado') && t.includes('Diferido por equipo') && t.includes('¿Está bajando? Desde que entró TRIM'),
      'a la derecha: lo que se puede mover (simulado), el diferido por equipo, mes a mes y ¿está bajando?')
    f.ok(t.includes('Pérdida') && t.includes('sin eventos registrados'), 'la pérdida va aparte')
  })

  await test.step('Antes: un conteo y un nombre, la línea punteada de riesgo', async () => {
    await momento(f.page, 'antes')
    const l = await lectura(f.page)
    f.ok(l.cifra === '1' && l.frase === 'K-101 (aire de instrumentos) ya pasó el límite.', `Antes: «${l.cifra} equipo avisa · ${l.frase}»`)
    f.ok(await f.page.locator('[data-tuberia] [data-riesgo]').count() === 1 && await f.page.locator('[data-tuberia] [data-rayado]').count() === 0,
      'la tubería va llena (sin rayado) y el tramo que avisa lleva la línea punteada de riesgo')
  })

  await test.step('Después: 118 + 573 + 355 = 1.046, el diferido del libro', async () => {
    await momento(f.page, 'despues')
    const l = await lectura(f.page)
    const suma = l.tramos.reduce((a, t) => a + t.valor, 0) + l.sinIdentificar
    f.ok(l.cifra === '1.046' && l.frase === 'no se produjeron en La Ceiba.', `Después: «${l.cifra} … ${l.frase}»`)
    f.ok(cerca(suma, l.valor) && Math.round(l.sinIdentificar) === 355, `los tramos y «sin identificar» suman el diferido (${suma.toFixed(1)} = ${l.valor.toFixed(1)})`)
    f.ok(await f.page.locator('[data-tuberia] [data-barra-despues]').count() >= 2, 'una barra gris bajo cada tramo con lo que no se produjo')
    const esteMes = Number(await f.page.locator('[data-este-mes]').getAttribute('data-este-mes'))
    f.ok(cerca(esteMes, l.valor), `es la misma cifra de «Este mes» (${esteMes.toFixed(1)})`)
    f.ok(await f.page.locator('[data-periodo-despues]').count() === 1, 'el período de Después va en su propia ficha («octubre ▾»)')
    await momento(f.page, 'durante')
  })

  await test.step('La hoja del tramo con el teclado: la frase, sus equipos y ¿por qué?, sin códigos', async () => {
    await f.page.locator('[data-tuberia] [data-tramo="planta"]').focus()
    await f.page.keyboard.press('Enter')
    const hoja = f.page.locator('[data-hoja-tramo="planta"]')
    await hoja.waitFor()
    const t = await hoja.innerText()
    f.ok(t.includes('P-201B (bomba de agua) está parada desde las 03:52 y obligó a cerrar LC-07 y LC-16.'), 'la frase del tramo')
    const equipos = await hoja.locator('[data-equipo-tramo]').evaluateAll(es => es.map(e => e.getAttribute('data-equipo-tramo')))
    f.ok(equipos.join() === 'P-201B,K-101,P-201A,P-201C', `sus equipos, con su marca y sus barriles (${equipos.join(', ')})`)
    f.ok(t.includes('No planeada') && t.includes('573 bbl') && !CODIGO_ANH.test(t), '¿por qué?: el árbol del tramo en palabras, sin códigos')
    f.ok(t.includes('Desde que entró TRIM') && t.includes('Para producir más'), 'la flecha desde que entró TRIM y para producir más')
    await f.page.keyboard.press('Escape')
    f.ok(await hoja.count() === 0, 'Escape cierra la hoja')
    // Un equipo abre la ficha ejecutiva que ya existe.
    await f.page.locator('[data-tuberia] [data-tramo="planta"]').click()
    await f.page.locator('[data-hoja-tramo] [data-equipo-tramo="P-201B"]').click()
    await f.page.locator('[data-panel-equipo]').waitFor()
    f.ok((await f.page.locator('[data-panel-equipo]').innerText()).includes('P-201B'), 'P-201B abre su ficha')
    await f.page.keyboard.press('Escape')
  })
  f.cerrar()
})

test('gerente: «Todos mis campos», 2.650 bbl/d, una fila por campo con su tubería en chico', async ({ flujo: f }) => {
  await f.abrir('/#/ger/planta-viva/ceiba~portafolio/curso')
  await f.page.waitForSelector('[data-planta-viva="portafolio"]')
  const l = await lectura(f.page)
  f.ok(l.cifra === '2.650' && l.frase === 'se dejan de producir.', `la cifra de todos: «${l.cifra} ${l.frase}»`)
  const filas = await f.page.locator('[data-campos] [data-campo]').evaluateAll(es => es.map(e => ({ campo: e.getAttribute('data-campo'), valor: Number(e.getAttribute('data-valor')) })))
  f.ok(filas.length === 5 && filas[0]!.campo === 'ceiba' && filas[1]!.campo === 'morichal', `una fila por campo, de la que más pesa a la que menos (${filas.map(x => x.campo).join(', ')})`)
  f.ok(cerca(filas.reduce((a, x) => a + x.valor, 0), l.valor), 'un nombre, una cifra: las filas suman la cifra de todos')
  f.ok(await f.page.locator('[data-campos] [data-mini-tuberia="planta"]').count() === 1 && await f.page.locator('[data-campos] [data-mini-tuberia="pozo"]').count() === 1,
    'la tubería en chico, angostada donde se trabó: la planta en La Ceiba, los pozos en Morichal')
  f.ok((await f.texto()).includes('campo de gas: su tubería todavía no está'), 'La Zarza, campo de gas, sigue en la lista y lo dice')
  // El primer equipo de una fila abre su ficha; la fila, su campo.
  await f.page.locator('[data-campo="morichal"] button').first().click()
  await f.page.waitForFunction(() => location.hash.startsWith('#/ger/planta-viva/morichal/'))
  f.ok(!(await f.hash()).includes('portafolio') && (await lectura(f.page)).cifra === '684', `la fila abre el campo (${await f.hash()})`)
  f.cerrar()
})

test('producción: la misma planta viva de La Ceiba', async ({ flujo: f }) => {
  await f.abrir('/#/prod/planta-viva/ceiba/curso')
  await f.page.waitForSelector('[data-planta-viva]')
  const l = await lectura(f.page)
  f.ok(l.cifra === '1.966' && l.tuberia === 'acostada' && l.tramos.find(t => t.marcado)?.tramo === 'planta', `producción ve 1.966 bbl/d y la planta marcada (${l.cifra})`)
  f.cerrar()
})

test.describe('teléfono', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('390 px: la tubería de pie, los tres momentos y «Todos mis campos» sin desbordes', async ({ flujo: f }) => {
    const hallazgos: string[] = []
    const revisar = async (donde: string) => {
      for (const h of await f.page.evaluate(detectar)) hallazgos.push(`${donde}: [${h[0]}] ${h[1]}${h[3] ? ` ⟶ ${h[3]}` : ''} (${h[2]})`)
      const ancho = await f.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      if (ancho > 1) hallazgos.push(`${donde}: la página se desplaza de lado ${ancho} px`)
    }
    await f.abrir('/#/ger/planta-viva/ceiba/curso')
    await f.page.waitForSelector('[data-planta-viva]')
    const l = await lectura(f.page)
    f.ok(l.cifra === '1.966' && l.tuberia === 'de-pie', `en el teléfono la tubería va de pie (${l.tuberia}) con la misma cifra`)
    for (const m of ['antes', 'durante', 'despues'] as const) {
      await momento(f.page, m)
      await revisar(`La Ceiba · ${m}`)
    }
    await f.page.locator('[data-tuberia] [data-tramo="planta"]').click()
    await f.page.locator('[data-hoja-tramo]').waitFor()
    await revisar('La Ceiba · la hoja de la planta')
    await f.page.keyboard.press('Escape')
    await f.ir('#/ger/planta-viva/ceiba~portafolio/curso')
    await f.page.waitForSelector('[data-planta-viva="portafolio"]')
    // El momento escogido se queda al cambiar de campo (el ciclo de arriba terminó en Después): se vuelve a Durante.
    await momento(f.page, 'durante')
    const p = await lectura(f.page)
    const filas = await f.page.locator('[data-campos] [data-campo]').count()
    f.ok(p.cifra === '2.650' && filas === 5, `«Todos mis campos» en el teléfono, Durante: 2.650 y cinco filas (${p.cifra}, ${filas})`)
    await revisar('Todos mis campos')
    expect.soft(hallazgos, 'nada se sale, se recorta ni se pisa a 390 px').toEqual([])
    f.cerrar()
  })
})
