/* C5 · «Resultados» (X4 §4.8, §3.1 reglas 4, 7 y 8, §3.6; X5 §5.1, §5.2, §5.4):
   - la cifra grande y su frase, del motor (`GET /api/vistas/resultados`): La Ceiba, octubre,
     1.046 barriles «no se produjeron en La Ceiba.», contra el máximo firmado (1.267);
   - el período vive aquí: la cabecera lo ofrece, otro período da otra cifra (septiembre: el
     total del período, sin proyección), y un toque en un mes del mes a mes lo abre;
   - lo simulado con su palabra y nunca como cifra grande: el retorno posible del ciclo va en su
     tarjeta con «simulado», una línea por momento, sin los números 1·2·3;
   - cada rol ve lo suyo: el gerente lo que eran su Resumen, sus Diferidos y su Producción;
     producción «¿Se puede publicar?»; jefe y confiabilidad, Mantenimiento y «¿Le creo al vigía?»;
     regulatorio, la publicación primero y nada simulado;
   - las direcciones viejas del gerente (Resumen, Diferidos, Producción) abren donde se fundieron;
   - en el teléfono (390 px) nada se sale, se recorta ni se pisa, y ningún texto de SVG baja de 12 px.

   Las cifras exactas se leen de los `data-*` de la pantalla: la pantalla redondea y aquí se
   comprueba la cuenta, no el redondeo. */
import { expect, type Page } from '@playwright/test'
import { test } from './apoyo.ts'
import { detectar } from './auditoria/detector.ts'

/** «1.046» → 1046. */
const num = (t: string) => Number(t.replace(/\./g, '').replace(',', '.'))

/** La cifra grande de Resultados y lo que la rodea. */
const lectura = (page: Page) => page.evaluate(() => {
  const raiz = document.querySelector('[data-resultados]')
  return {
    rol: raiz?.getAttribute('data-resultados') ?? '', alcance: raiz?.getAttribute('data-alcance') ?? '', valor: Number(raiz?.getAttribute('data-valor')),
    cifra: document.querySelector('[data-cifra-grande] [data-cifra]')?.textContent ?? '',
    maximo: document.querySelector('[data-cifra-grande]')?.getAttribute('data-maximo') ?? '',
    previo: document.querySelector('[data-periodo-resultados]')?.textContent ?? '',
    frase: document.querySelector('[data-cifra-grande] [data-frase]')?.textContent ?? '',
    explica: document.querySelector('[data-cifra-grande] [data-explica]')?.textContent ?? '',
    secciones: [...document.querySelectorAll('[data-seccion]')].map(s => s.getAttribute('data-seccion') ?? ''),
    sello: document.querySelector('[data-sello]')?.getAttribute('data-sello') ?? '',
  }
})

test('la cifra del período contra el máximo firmado, con su frase, y lo simulado aparte con su palabra', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/ger/resultados/ceiba/curso')
  await expect(page.locator('[data-resultados]')).toHaveAttribute('data-resultados', 'ger')
  const l = await lectura(page)
  f.ok(l.cifra === '1.046' && Math.round(l.valor) === 1046 && l.frase === 'no se produjeron en La Ceiba.',
    `la cifra grande: ${l.cifra} barriles «${l.frase}»`)
  f.ok(l.previo === 'Lo que pasó · octubre, en curso' && Math.round(Number(l.maximo)) === 1267
      && l.explica.startsWith('El máximo firmado para lo que va de octubre es 1.267 bbl: va 221 por debajo.'),
    `contra el máximo firmado, en palabras («${l.explica.slice(0, 80)}…»)`)
  const t = await f.texto()
  f.ok(/calculado\s*entre 889 y 1\.203 bbl/.test(t) && t.includes('50 mil USD') && l.sello === 'provisional', 'calculado, con su rango, su valor y el sello «provisional» (el mes sigue abierto)')
  // La cifra grande no es simulada y nunca va en color: ni la palabra, ni el chip.
  const enCifra = await page.locator('[data-cifra-grande] > p').first().innerText()
  f.ok(!/simulad/i.test(await page.locator('[data-cifra-grande] [data-frase]').innerText()) && !/simulad/i.test(enCifra), 'la cifra grande no es simulada')
  // Lo simulado: su tarjeta, con «simulado» en el chip y en cada línea, sin 1·2·3.
  const ciclo = page.locator('[data-ciclo]')
  await expect(ciclo).toContainText('Retorno posible del ciclo')
  await expect(ciclo.getByText('simulado', { exact: true })).toHaveCount(1)
  const lineas = await ciclo.locator('[data-linea-simulada]').allInnerTexts()
  f.ok(lineas.length === 3 && lineas.every(x => /simulado/.test(x)), `una línea por momento, cada una con «simulado» (${lineas.length})`)
  const momentos = await ciclo.locator('[data-fase]').allInnerTexts()
  f.ok(momentos.map(x => x.split('·')[0]!.trim()).join() === 'Antes,Durante,Después' && !momentos.some(x => /^\s*[123]\s/.test(x)), 'Antes · Durante · Después, sin los números de las prioridades')
  f.ok(Math.round(Number(await ciclo.getAttribute('data-ciclo'))) === 2133 && !t.includes('bbl · retorno') && !t.includes('Ver planes de acción'), 'el retorno (2.133 bbl) no es la cifra principal ni hay acordeón de planes')
  // ¿Está bajando? y el mantenimiento proactivo.
  f.ok(/en la planta\s*268 → 51/.test(t) && /en los pozos\s*122 → 215/.test(t) && /14 %\s*mantenimiento proactivo/.test(t), '¿está bajando? por tramo (las dos flechas) y el mantenimiento proactivo')
  // La producción contra la meta y el cierre proyectado, en barras de Few.
  f.ok(await page.locator('[data-produccion-meta] [data-barra] [data-raya]').count() === 4 && await page.locator('[data-cierre="proyectado"]').count() === 1,
    'cuatro barras con su raya: lo de cada día y el cierre proyectado')
  f.cerrar()
})

test('el período vive aquí: la cabecera lo ofrece, otro período cambia la cifra y un mes del mes a mes se abre', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/ger/resultados/ceiba/curso')
  await expect(page.locator('header button[aria-label^="Período"]').filter({ visible: true }).first()).toBeVisible()
  // Septiembre, por la dirección: el total del período, sin proyectar.
  await f.ir('#/ger/resultados/ceiba/cerrado')
  const sep = await lectura(page)
  f.ok(sep.cifra === '7.716' && sep.previo === 'Lo que pasó · septiembre' && sep.sello === 'publicable', `septiembre: ${sep.cifra} bbl, «${sep.previo}», ${sep.sello}`)
  f.ok(await page.locator('[data-cierre="total"]').count() === 1 && !(await f.texto()).includes('Cierre proyectado'), 'un mes cerrado no proyecta: dice el total del período')
  // Un toque en un mes del mes a mes: ese mes pasa a ser el período (y lo dice la cabecera).
  await page.locator('[data-mes-a-mes] g[data-mes="2026-02"]').click()
  await f.esperar(600)
  const feb = await lectura(page)
  f.ok(feb.previo.startsWith('Lo que pasó · febrero') && (await f.hash()).includes('2026-02-01_2026-02-28'), `febrero abierto como período («${feb.previo}», ${await f.hash()})`)
  f.ok(await page.locator('[data-mes-a-mes] g[data-en-periodo]').count() === 1, 'el mes del período va marcado, uno')
  // «Por dónde se trabó» parte las mismas barras.
  f.ok(await f.clic('Por dónde se trabó'), 'el mes a mes se puede partir por dónde se trabó')
  await expect(page.locator('[data-mes-a-mes]')).toHaveAttribute('data-mes-a-mes', 'tramo')
  f.cerrar()
})

test('cada rol ve lo suyo, con la misma cifra', async ({ flujo: f }) => {
  const { page } = f
  const casos: Array<[string, string[], string[], string[]]> = [
    ['#/ger/resultados/ceiba/curso', ['bajando', 'mesAMes', 'porEquipo', 'dondeSeTrabo', 'dondeBajarlo', 'tipos', 'diaADia', 'ciclo'], ['Dónde bajarlo', 'Tipo de causa', 'Producción día a día'], ['¿Se puede publicar?', 'Medición oficial']],
    ['#/prod/resultados/ceiba/curso', ['publicar', 'bajando', 'mesAMes', 'porEquipo', 'ciclo'], ['¿Se puede publicar?', 'Ver el libro de diferidos'], ['Dónde bajarlo', 'Producción día a día']],
    ['#/jefe/resultados/ceiba/curso', ['mantenimiento', 'bajando', 'mesAMes', 'porEquipo', 'confiabilidad', 'ciclo'], ['De 8,1 días que dura una falla, 7,7 son espera', '¿Le creo al vigía?'], ['¿Se puede publicar?']],
    ['#/conf/resultados/ceiba/curso', ['confiabilidad', 'bajando', 'mesAMes', 'porEquipo', 'mantenimiento', 'ciclo'], ['¿Le creo al vigía?', 'de lo que se puede juzgar fue verdad'], ['¿Se puede publicar?']],
    ['#/reg/resultados/ceiba/curso', ['publicar', 'mesAMes', 'porEquipo'], ['¿Se puede publicar?', 'Ver el reporte'], ['Retorno posible del ciclo', 'simulado']],
  ]
  let primero = true
  for (const [ruta, secciones, si, no] of casos) {
    if (primero) await f.abrir(`/${ruta}`); else await f.ir(ruta)
    primero = false
    await expect(page.locator('[data-resultados]')).toHaveAttribute('data-resultados', ruta.split('/')[1]!)
    const l = await lectura(page)
    const t = await f.texto()
    f.ok(l.cifra === '1.046', `${ruta}: la misma cifra (${l.cifra})`)
    // En el escritorio lo corto va a la derecha: aquí se cuenta qué partes hay; el orden, en el teléfono (una columna).
    f.ok([...l.secciones].sort().join() === [...secciones].sort().join(), `${ruta}: sus partes (${l.secciones.join(' · ')})`)
    f.ok(si.every(x => t.includes(x)) && !no.some(x => t.includes(x)), `${ruta}: dice ${si.map(x => `«${x}»`).join(', ')} y no ${no.map(x => `«${x}»`).join(', ')}`)
  }
  // Todos los campos: «Por campo» (con su «dónde se trabó») en vez del panel de un campo.
  await f.ir('#/ger/resultados/ceiba~portafolio/curso')
  const todos = await lectura(page)
  f.ok(todos.alcance === 'portafolio' && todos.cifra === '2.377' && todos.secciones.includes('porCampo') && !todos.secciones.includes('dondeSeTrabo')
      && await page.locator('main [data-bbl-campo]').count() === 5, `todos los campos: ${todos.cifra} bbl, con «Por campo» (cinco campos)`)
  f.cerrar()
})

test('las direcciones viejas del gerente abren donde se fundieron, y su menú ya no las ofrece', async ({ flujo: f }) => {
  await f.abrir('/#/ger/diferidos/ceiba/cerrado')
  f.ok((await f.hash()).startsWith('#/ger/resultados/ceiba/cerrado'), `Diferidos → Resultados (${await f.hash()})`)
  await f.ir('#/ger/produccion/ceiba/curso')
  f.ok((await f.hash()).startsWith('#/ger/resultados/ceiba/'), `Producción → Resultados (${await f.hash()})`)
  await f.ir('#/ger/resumen/ceiba~portafolio/curso')
  f.ok((await f.hash()).startsWith('#/ger/planta-viva/ceiba~portafolio/'), `Resumen → La planta viva (${await f.hash()})`)
  await f.ir('#/ger/riesgo/ceiba/curso')
  f.ok((await f.hash()).startsWith('#/ger/planta-viva/ceiba/'), `Riesgo → La planta viva (${await f.hash()})`)
  const menu = await f.page.locator('nav[aria-label="Navegación"]').innerText()
  f.ok(!/\bResumen\b|\bRiesgo\b|\bDiferidos\b/.test(menu) && menu.includes('Resultados'), 'el panel ya no ofrece el Resumen, el Riesgo ni los Diferidos del gerente')
  // La cifra de La planta viva («Después» y «Este mes») es la de Resultados: un nombre, una cifra.
  await f.ir('#/ger/planta-viva/ceiba/curso')
  await expect(f.page.locator('[data-planta-viva]')).toHaveAttribute('data-planta-viva', 'campo')
  const esteMes = await f.page.locator('[data-este-mes]').getAttribute('data-este-mes')
  await f.ir('#/ger/resultados/ceiba/curso')
  await expect(f.page.locator('[data-resultados]')).toHaveAttribute('data-alcance', 'campo')
  const r = await lectura(f.page)
  f.ok(Math.abs(Number(esteMes) - r.valor) < 1e-6, `«Este mes» de La planta viva = la cifra de Resultados (${Math.round(Number(esteMes))})`)
  f.cerrar()
})

test.describe('teléfono', () => {
  test.use({ viewport: { width: 390, height: 860 }, isMobile: true, hasTouch: true })

  test('390 px: una columna, la cifra arriba, nada se sale ni se pisa y ningún texto de SVG baja de 12 px', async ({ flujo: f }) => {
    const hallazgos: string[] = []
    const revisar = async (donde: string) => {
      for (const h of await f.page.evaluate(detectar)) hallazgos.push(`${donde}: [${h[0]}] ${h[1]}${h[3] ? ` ⟶ ${h[3]}` : ''} (${h[2]})`)
      const ancho = await f.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      if (ancho > 1) hallazgos.push(`${donde}: la página se desplaza de lado ${ancho} px`)
    }
    let primero = true
    for (const ruta of ['#/ger/resultados/ceiba/curso', '#/ger/resultados/ceiba~portafolio/curso', '#/prod/resultados/ceiba/curso', '#/jefe/resultados/ceiba~portafolio/curso', '#/conf/resultados/morichal/curso', '#/reg/resultados/ceiba/cerrado']) {
      if (primero) await f.abrir(`/${ruta}`); else await f.ir(ruta)
      primero = false
      await revisar(ruta)
      if (await f.clic('Por dónde se trabó')) { await f.esperar(250); await revisar(`${ruta} [por dónde se trabó]`) }
    }
    // La cifra va arriba de todo, con su frase, antes de cualquier tarjeta.
    await f.ir('#/ger/resultados/ceiba/curso')
    const orden = await f.page.evaluate(() => {
      const c = document.querySelector('[data-cifra-grande]')?.getBoundingClientRect().top ?? Infinity
      const resto = [...document.querySelectorAll('[data-seccion]')].map(s => s.getBoundingClientRect().top)
      return { c, primera: Math.min(...resto), visible: c < innerHeight }
    })
    f.ok(orden.visible && orden.c < orden.primera, 'la cifra está a la vista sin desplazarse y va antes que todo lo demás')
    f.ok(num((await lectura(f.page)).cifra) === 1046, 'la misma cifra en el teléfono')
    // En una columna, el orden es el de la pregunta de cada rol (lo dice el motor).
    await f.ir('#/jefe/resultados/ceiba/curso')
    await expect(f.page.locator('[data-resultados]')).toHaveAttribute('data-resultados', 'jefe')
    f.ok((await lectura(f.page)).secciones.join() === 'mantenimiento,bajando,mesAMes,porEquipo,confiabilidad,ciclo', 'el jefe: primero Mantenimiento, luego ¿está bajando?, el mes a mes, por equipo, el vigía y el ciclo')
    await f.ir('#/reg/resultados/ceiba/curso')
    await expect(f.page.locator('[data-resultados]')).toHaveAttribute('data-resultados', 'reg')
    f.ok((await lectura(f.page)).secciones.join() === 'publicar,mesAMes,porEquipo', 'regulatorio: primero ¿se puede publicar?')
    expect.soft(hallazgos, 'nada se sale, se recorta ni se pisa a 390 px').toEqual([])
    f.cerrar()
  })
})
