/* F2 · Diferidos, Mantenimiento, Confiabilidad y la producción día a día (fase 4 de la revisión,
   `docs/experiencia-v2/R-revision/verificados-v1.md` y `verificados-v2.md`):
   - Mantenimiento: «1 equipo avisa» (G-15, el conteo único de «Equipos que avisan»); lo que costaría
     la falla en bbl con su nombre, nunca «si falla hoy» en bbl (G-16, D-2); la marca de cada equipo,
     la de su condición en la franja (H3: P-201B ◆1, LC-08 sin marca); lo programado en una frase
     (P-mant-1); «máximo» sin abreviar (G-10).
   - Diferidos: arriba, el mismo bloque de la cifra de Resultados (P-diferidos-1); «Potencial del
     libro» y «= Diferido» en el cuadre (G-5, G-8); «bomba de agua» en «Por equipo» (P-09); las barras
     secundarias en --dato3 (V2-1); la marca de aviso de verdad sobre el mes que pasó su máximo (H20).
   - Confiabilidad: «¿Le creo al vigía?» con las dos cifras que contestan y lo demás detrás de «Ver lo
     que anunció», entero en el papel (P-conf-1); como mucho cuatro cifras de 24 px (H11); «Fallas
     por mes» con su cifra, su año y su frase (H22) y la raya de --panel entre segmentos (H21).
   - Producción día a día: el potencial continuo y el día en curso con su punto hueco (H18). */
import { test } from './apoyo.ts'

// B3 · A-12: la pantalla Mantenimiento se borró: 6 de sus 9 paneles repetían Hoy o Resultados. Lo que traía vive
// donde se decide: «Avisan» en el número del jefe (el mismo conteo de Equipos), lo programado en Resultados y lo que
// costaría la falla, en la ficha del equipo.
test('Mantenimiento → Hoy del jefe: un conteo de «avisan», lo programado en Resultados y el costo de la falla con su nombre', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/jefe/mantenimiento/ceiba/curso')
  f.ok((await f.hash()).startsWith('#/jefe/hoy/'), `la dirección de Mantenimiento abre el Hoy del jefe (${await f.hash()})`)
  // G-15: el mismo conteo de «Equipos que avisan» (1 en La Ceiba) que el filtro «Avisan» de Equipos.
  f.ok(await page.locator('main [data-renglon="avisan"] [data-cifra]').innerText() === '1', '«Avisan 1» en el número del jefe')
  const grandes = await page.locator('main').evaluate(m => [...m.querySelectorAll('b')].filter(b => parseFloat(getComputedStyle(b).fontSize) >= 40).length)
  f.ok(grandes === 1, `una sola cifra grande en el inicio del jefe (${grandes})`)
  await f.ir('#/jefe/equipos/ceiba')
  f.ok((await page.locator('main [role=radiogroup][aria-label="Estado"] [data-opcion="avisan"]').innerText()).includes('1'), 'el mismo conteo en el filtro «Avisan» de Equipos')
  // G-16 (D-2): «le costaría la falla», nunca «… bbl si falla hoy».
  await f.ir('#/jefe/equipos/morichal/MPP-301')
  const t = await f.texto()
  f.ok(/≈ [\d.]+ bbl le costaría la falla/.test(t) && !/bbl si falla hoy/i.test(t), 'el costo de la falla va en bbl con su nombre, y «si falla hoy» no se dice en bbl')
  f.cerrar()
})

test('Diferidos se fundió en Resultados: la misma cifra, el cuadre, por equipo con sus nombres y el máximo del mes a mes', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/prod/diferidos/ceiba/curso')
  f.ok((await f.hash()).startsWith('#/prod/resultados/ceiba/'), `la dirección de Diferidos abre Resultados (${await f.hash()})`)
  const cifra = page.locator('main [data-cifra-grande]')
  await cifra.waitFor()
  const c = await cifra.locator('[data-cifra]').innerText(), frase = await cifra.locator('[data-frase]').innerText(), previo = await cifra.locator('[data-periodo-resultados]').innerText()
  f.ok(c === '1.046' && frase === 'no se produjeron en La Ceiba.' && previo === 'Lo que pasó · octubre, en curso', `arriba, «${previo} · ${c} · ${frase}»`)
  const t = await f.texto()
  f.ok(!t.includes('barriles diferidos') && !/\+\d+ % frente a/.test(t) && !/Dónde bajarlo|Tipo de causa/.test(t), 'sin el bloque de antes ni «Dónde bajarlo» ni «Tipo de causa» (A-07, A-08)')
  // El diferido por día contra el máximo no se pierde: va en la barra del kit, con su máximo firmado.
  const diferido = page.locator('[data-produccion-meta] [data-barra-meta="diferido"]')
  f.ok(/máximo 800/.test(await diferido.innerText()) && await diferido.locator('[data-kit="barra"]').count() === 1, 'el diferido por día contra el máximo firmado (800), con la barra del kit')
  // C-02: el cuadre con los nombres de siempre, en «¿Se puede publicar?» y en «¿Cuadra?» de Producción.
  f.ok(/¿Se puede publicar\?/.test(t) && /Todavía no: el mes está en curso/.test(t), '«¿Se puede publicar?»: todavía no, el mes está en curso')
  // P-09: P-201B es «bomba de agua» en «Diferido por equipo», no «bomba de reinyección».
  const te = await page.locator('main [data-por-equipo]').innerText()
  f.ok(/P-201B[\s\S]{0,40}bomba de agua/.test(te) && !/reinyección/i.test(te), '«Diferido por equipo»: P-201B, bomba de agua')
  // H20: el mes a mes es la tendencia del kit, contra la raya del máximo firmado y con su unidad.
  const mm = page.locator('main [data-mes-a-mes]')
  f.ok(await mm.locator('[data-kit="tendencia"] [data-alarma]').count() === 1 && /máximo firmado \(800\)/.test(await mm.innerText()) && /bbl\/d/.test(await mm.innerText()),
    'el mes a mes contra la raya del máximo firmado (800), en bbl/d')
  await f.ir('#/prod/produccion/ceiba/curso')
  const potencial = await page.locator('main [data-del-potencial]').innerText()
  f.ok(/Potencial del libro/.test(potencial) && (await f.texto()).includes('¿Cuadra? Día por día'), 'en Producción: «Potencial del libro» y «¿Cuadra? Día por día»')
  f.cerrar()
})

test('Confiabilidad: «¿Le creo al vigía?» en dos cifras, a lo sumo cuatro de 24 px, y las fallas por mes con su cifra y su frase', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/conf/confiabilidad/morichal/curso')
  await f.esperarTexto('¿Le creo al vigía?')
  const t = await f.texto()
  f.ok(!t.includes('¿Acierta el vigía?'), 'un solo título para lo mismo: «¿Le creo al vigía?», el de Resultados')
  const resumen = await page.locator('main [data-vigia-resumen]').innerText()
  f.ok(/^Acertó \d+ de \d+( · anticipó [\d,]+ días en promedio)?/.test(resumen) || resumen.startsWith('Todavía no tiene'), `las dos que contestan, en una línea («${resumen}»)`)
  // Lo demás, a un toque; en el papel, entero.
  f.ok(!(await page.locator('main [data-vigia-detalle]').isVisible()), 'lo que anunció, plegado')
  await page.locator('main [data-ver-lo-que-anuncio]').click()
  f.ok(await page.locator('main [data-vigia-detalle]').isVisible() && (await page.locator('main [data-vigia-detalle]').innerText()).includes('Lo que anunció y en qué quedó'), '«Ver lo que anunció» lo abre')
  await page.locator('main [data-ver-lo-que-anuncio]').click()
  await page.emulateMedia({ media: 'print' })
  f.ok((await f.textoPagina()).includes('Lo que anunció y en qué quedó'), 'en el papel va entero')
  await page.emulateMedia({ media: 'screen' })
  // H11: como mucho cuatro cifras de 24 px o más en la primera vista.
  const grandes = await page.locator('main').evaluate(m => [...m.querySelectorAll('b')].filter(b => {
    const r = b.getBoundingClientRect()
    return r.height > 0 && r.top < innerHeight && parseFloat(getComputedStyle(b).fontSize) >= 24
  }).length)
  f.ok(grandes <= 4, `como mucho cuatro cifras de 24 px en la primera vista (${grandes})`)
  f.ok(await page.locator('main .font-mono').count() === 0, 'ningún tag en letra de máquina')
  // H22 y H21: «Fallas por mes».
  const g = page.locator('main [data-fallas-por-mes]')
  const aria = await g.getAttribute('aria-label') ?? ''
  f.ok(/^Fallas de los equipos de alto impacto por mes, sin disparos, de [a-z]+ \d{4} a [a-z]+ \d{4}: \d+ fallas? en total/.test(aria), `la frase con sus cifras («${aria}»)`)
  const meses = await g.locator('[data-mes]').evaluateAll(es => es.map(e => ({ n: Number(e.getAttribute('data-fallas')), cifra: [...e.querySelectorAll('text')].some(x => x.textContent === e.getAttribute('data-fallas')) })))
  f.ok(meses.length > 0 && meses.every(m => (m.n > 0) === m.cifra), `cada mes con fallas lleva su cifra sobre la barra (${meses.filter(m => m.n > 0).length} meses)`)
  const anios = await g.locator('text').evaluateAll(es => es.map(e => e.textContent ?? '').filter(x => /^\d{4}$/.test(x)))
  f.ok(anios.length >= 2, `los meses con su año (${anios.join(', ')})`)
  const rayas = await g.locator('rect').evaluateAll(es => es.every(e => e.getAttribute('stroke') === 'var(--panel)'))
  f.ok(rayas, '1 px de --panel entre los segmentos apilados')
  f.cerrar()
})

test.describe('teléfono', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  test('390 px: «Fallas por mes» sin texto de menos de 12 px', async ({ flujo: f }) => {
    await f.abrir('/#/conf/confiabilidad/morichal/curso')
    await f.page.locator('main [data-fallas-por-mes]').waitFor()
    const chicos = await f.page.locator('main [data-fallas-por-mes] text').evaluateAll(es => es.map(e => (e as SVGTextElement).getBoundingClientRect().height).filter(h => h > 0 && h < 11))
    f.ok(chicos.length === 0, `ningún rótulo de menos de 12 px en pantalla (${chicos.length})`)
    f.cerrar()
  })
})

test('La producción día a día con el kit: lo medido oscuro, el potencial continuo y claro, la meta lo único discontinuo, y el día en curso con su palabra', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/prod/produccion/ceiba/curso')
  const g = page.locator('main [data-diaria] [data-kit="tendencia"]').first()
  await g.waitFor()
  // H18 (confirmado; `verificar-libro`): lo discontinuo es solo la meta. Lo real y el potencial van continuos y se
  // separan por el tono y el grosor: lo medido oscuro y más grueso, el potencial claro.
  const series = await g.locator('[data-serie]').evaluateAll(es => es.map(e => {
    const p = e.querySelector('path')!, cs = getComputedStyle(p)
    return { nombre: e.getAttribute('data-serie'), trazo: e.getAttribute('data-trazo'), raya: cs.strokeDasharray, color: cs.stroke, grosor: parseFloat(cs.strokeWidth) }
  }))
  const de = (n: string) => series.find(x => x.nombre === n)
  const real = de('Real medido'), pot = de('Potencial del libro'), meta = de('Meta firmada')
  const sinRaya = (x?: { raya: string }) => !!x && (x.raya === 'none' || x.raya === '')
  f.ok(series.map(x => `${x.nombre}:${x.trazo}`).join() === 'Real medido:continuo,Potencial del libro:continuo,Meta firmada:discontinuo',
    `tres trazas: real y potencial continuos, la meta discontinua (${series.map(x => `${x.nombre}:${x.trazo}`).join(', ')})`)
  f.ok(sinRaya(real) && sinRaya(pot) && !!meta && !sinRaya(meta) && series.filter(x => !sinRaya(x)).length === 1,
    `lo único con raya en el dibujo es la meta (real ${real?.raya}, potencial ${pot?.raya}, meta ${meta?.raya})`)
  f.ok(!!real && !!pot && real.color !== pot.color && real.grosor > pot.grosor, `el potencial, claro y más fino que lo medido (${real?.color} ${real?.grosor} px · ${pot?.color} ${pot?.grosor} px)`)
  f.ok((await page.locator('main [data-diaria]').innerText()).includes('Oscura: real medido · clara: potencial del libro · discontinua: meta firmada'), 'la leyenda lo dice con palabras')
  // El día en curso lo dice el eje y la leyenda.
  f.ok((await g.innerText()).includes('en curso') || (await page.locator('main [data-diaria]').innerText()).includes('(en curso)'), 'el día en curso, con su palabra')
  f.ok(!(await g.locator('[data-provisional]').count()), 'la escala sale de la meta firmada (no es provisional)')
  f.cerrar()
})
