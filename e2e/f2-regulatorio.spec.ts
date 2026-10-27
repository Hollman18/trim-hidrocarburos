/* F2 · Regulatorio (P-03; X4 §2 y §3.4; T-8, T-10, T-11, P-reg-1, G-5, I-reg-2, UI-17):
   - el inicio de regulatorio responde «¿qué falta, quién lo debe y para cuándo?»: la cifra
     (2 paradas sin causa en La Ceiba, octubre), la frase de X4 §3.4 y una fila por parada,
     con sus barriles enteros que suman (LC-21 247 + LC-08 108 = 355), quién lo debe y la hora;
   - el árbol como la circular va debajo, sin los códigos de la ANH en la primera capa: salen
     con «Ver los códigos ANH»; sin pasos numerados y sin el rótulo «modelo choke»;
   - la medición oficial y PRODML, detrás de «ver más»; «Potencial del libro»;
   - un solo «Exportar», en la cabecera, con la opción «CSV para la ANH»;
   - en el teléfono (390 px) nada se sale, se recorta ni se pisa. */
import { expect } from '@playwright/test'
import { test } from './apoyo.ts'
import { detectar } from './auditoria/detector.ts'

/** «1.046» → 1046. */
const num = (t: string) => Number(t.replace(/\./g, '').replace(',', '.'))

test('regulatorio abre en lo que falta: 2 paradas sin causa, quién lo debe y para cuándo; el árbol debajo', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/reg/regulatorio/ceiba/curso')
  const cabeza = page.locator('[data-reporte-anh]')
  await expect(cabeza).toBeVisible()

  await test.step('la cifra, la frase y una fila por parada (los barriles suman)', async () => {
    const cifra = await cabeza.locator('[data-cifra]').innerText()
    const frase = await cabeza.locator('[data-frase]').innerText()
    const explica = await cabeza.locator('[data-explica]').innerText()
    f.ok(cifra === '2' && (await cabeza.innerText()).includes('paradas sin causa'), `la cifra grande: ${cifra} paradas sin causa`)
    // K2: la frase no repite la cifra grande («2 paradas sin causa»).
    f.ok(frase === 'No se puede publicar todavía: octubre sigue abierto y les falta la causa (355 bbl).', `la frase de X4 §3.4, sin repetir la cifra: «${frase}»`)
    f.ok(explica.includes('operador de campo') && explica.includes('mañana antes de las 07:00'), `quién lo debe y para cuándo: «${explica}»`)
    const filas = await page.locator('[data-parada-sin-causa]').evaluateAll(es => es.map(e => ({ equipo: e.getAttribute('data-parada-sin-causa'), bbl: Number(e.getAttribute('data-bbl')), texto: (e as HTMLElement).innerText })))
    f.ok(filas.map(x => `${x.equipo} ${x.bbl}`).join(', ') === 'LC-21 247, LC-08 108' && filas.reduce((a, x) => a + x.bbl, 0) === Number(await cabeza.getAttribute('data-bbl')),
      `una fila por parada, de mayor a menor, que suman los 355 bbl de la frase (${filas.map(x => `${x.equipo} ${x.bbl}`).join(' + ')})`)
    // K2: si a todas les falta lo mismo y las debe la misma persona para la misma hora, la fila no lo repite a la
    // vista (ya lo dicen la cifra y la explicación); queda para el lector de pantalla (e2e/inicios-k2.spec.ts).
    f.ok(filas.every(x => /faltan todos los pasos/.test(x.texto) && /Lo debe el operador de campo/.test(x.texto) && /\b(247|108) bbl/.test(x.texto)), 'cada fila dice qué falta, quién lo debe y sus barriles enteros')
    f.ok(!/Exportar CSV|solo lectura/.test(await cabeza.innerText()), 'la respuesta no compite con «Exportar CSV» ni con «solo lectura» (va en su ⓘ)')
  })

  await test.step('el árbol debajo, sin códigos en la primera capa; con «Ver los códigos ANH», salen', async () => {
    const arbol = page.locator('[data-arbol-circular]')
    f.ok(await page.evaluate(() => {
      const a = document.querySelector('[data-reporte-anh]'), b = document.querySelector('[data-arbol-circular]')
      return !!a && !!b && !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
    }), 'lo que falta va arriba y el árbol de la circular debajo')
    const sin = (await arbol.innerText()).replace(/\s+/g, ' ')
    f.ok(!/resp_par|choke_mod|cau_niv1|paradas_pozo/.test(sin) && !/\b[1-6]\. (Quién|Detalle)/.test(sin), 'en la primera capa, el nombre de cada paso y su cifra: sin códigos ni pasos numerados')
    f.ok(!(await page.locator('main').innerText()).includes('modelo choke'), 'sin el rótulo «modelo choke»: la ⓘ va pegada al título')
    await page.locator('[data-ver-codigos]').click()
    await expect(arbol).toHaveAttribute('data-codigos', 'vista')
    const con = (await arbol.innerText()).replace(/\s+/g, ' ')
    f.ok(/resp_par/.test(con) && /choke_mod/.test(con) && /cau_niv1/.test(con), 'con «Ver los códigos ANH», cada paso trae la cadena que viaja a la ANH')
    await page.locator('[data-ver-codigos]').click()
  })

  await test.step('la medición oficial y PRODML detrás de «ver más»; «Potencial del libro»', async () => {
    const t0 = await f.texto()
    f.ok(!t0.includes('Calibración declarada') && !t0.includes('También en PRODML'), 'la medición oficial y PRODML no van en la primera capa')
    await page.locator('[aria-controls="medicion-oficial-detalle"]').click()
    const t1 = await f.texto()
    f.ok(t1.includes('Puntos de medición oficial') && t1.includes('Calibración declarada') && t1.includes('Potencial del libro') && t1.includes('También en PRODML')
      && !t1.includes('Potencial (pruebas × factor)'), 'con «ver más»: los puntos, su calibración, la producción con «Potencial del libro» y PRODML')
    const cortadas = await page.locator('[data-calibracion]').evaluateAll(es => es.filter(e => (e as HTMLElement).scrollWidth > (e as HTMLElement).clientWidth + 1).length)
    f.ok(cortadas === 0, 'ninguna calibración queda cortada')
  })

  await test.step('un solo «Exportar», en la cabecera, con el CSV para la ANH', async () => {
    f.ok(await page.locator('main').getByRole('button', { name: /Exportar CSV/ }).count() === 0, 'la tarjeta ya no trae «Exportar CSV»')
    await page.getByRole('button', { name: 'Exportar', exact: true }).first().click()
    await expect(page.locator('[data-csv-anh]')).toBeVisible()
    f.ok((await page.locator('[data-csv-anh]').innerText()).includes('CSV para la ANH'), '«Exportar» ofrece el CSV para la ANH')
    await page.keyboard.press('Escape')
  })
  f.cerrar()
})

test('regulatorio, un mes cerrado: se puede publicar y no falta ninguna causa', async ({ flujo: f }) => {
  await f.abrir('/#/reg/regulatorio/ceiba/cerrado')
  const cabeza = f.page.locator('[data-reporte-anh]')
  await expect(cabeza).toHaveAttribute('data-reporte-anh', 'publicable')
  f.ok(num(await cabeza.locator('[data-cifra]').innerText()) === 0 && (await cabeza.locator('[data-frase]').innerText()).startsWith('Se puede publicar'),
    'septiembre: 0 paradas sin causa, «Se puede publicar»')
  f.ok(await f.page.locator('[data-parada-sin-causa]').count() === 0, 'sin filas de lo que falta')
  f.cerrar()
})

test.describe('teléfono', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('390 px: la cifra y las paradas sin desplazarse, y nada se sale ni se pisa', async ({ flujo: f }) => {
    await f.abrir('/#/reg/regulatorio/ceiba/curso')
    await expect(f.page.locator('[data-reporte-anh]')).toBeVisible()
    const alto = await f.page.evaluate(() => innerHeight)
    const abajo = await f.page.locator('[data-parada-sin-causa]').last().evaluate(e => e.getBoundingClientRect().bottom)
    f.ok(abajo <= alto, `la cifra, la frase y las dos paradas se ven sin desplazarse (${Math.round(abajo)} de ${alto} px)`)
    const hallazgos: string[] = []
    for (const h of await f.page.evaluate(detectar)) hallazgos.push(`[${h[0]}] ${h[1]}${h[3] ? ` ⟶ ${h[3]}` : ''} (${h[2]})`)
    const ancho = await f.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    if (ancho > 1) hallazgos.push(`la página se desplaza de lado ${ancho} px`)
    expect.soft(hallazgos, 'nada se sale, se recorta ni se pisa a 390 px').toEqual([])
    f.cerrar()
  })
})
