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
import { type Page } from '@playwright/test'
import { test } from './apoyo.ts'

/** La marca de cada equipo de La Ceiba en la franja (C1: 2 · 2 · 1 · 0). */
const MARCA_CEIBA: Record<string, RegExp> = {
  'P-201B': /^Prioridad 1\b/, 'K-101': /^Prioridad 1\b/, 'LC-21': /^Prioridad 2\b/, 'TK-102': /^Prioridad 2\b/, 'H-302': /^Prioridad 3\b/,
}

/** Las marcas de las filas de una lista: el equipo y el nombre accesible de su marca (o nada). */
const marcasDe = (page: Page, sel: string, atributo: string) => page.locator(sel).evaluateAll((es, a) => es.map(e => ({
  equipo: e.getAttribute(a) ?? '', marca: e.querySelector('svg[role=img]')?.getAttribute('aria-label') ?? '',
})), atributo)

test('Mantenimiento: un conteo de «avisan», el costo de la falla con su nombre, la marca del equipo y lo programado en una frase', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/jefe/mantenimiento/ceiba/curso')
  await f.esperarTexto('Intervenir ya')
  const t = await f.texto()
  // G-15: el mismo conteo de La planta viva y de Riesgo («Equipos que avisan»: 1 en La Ceiba).
  f.ok(t.includes('1 equipo avisa') && !/equipos? avisando/.test(t) && await page.locator('main [data-avisan="1"]').count() === 1,
    '«Intervenir ya» dice «1 equipo avisa», el conteo único de «Equipos que avisan»')
  // P-mant-1: el ejemplo de X4 §6.1, con la raíz del libro.
  const prog = await page.locator('main [data-programado]').innerText()
  f.ok(prog === 'Ninguna parada de este mes estaba programada: los 1.046 bbl fueron fallas o siguen sin identificar.' && !t.includes('del diferido, programado'),
    `lo programado en una frase («${prog}»)`)
  // G-10 y UI-15: «máximo» sin abreviar; sin cifras de 36 px.
  f.ok(/máximo 800/.test(t) && !/máx\. 800/.test(t), 'el máximo firmado, «máximo», sin abreviar')
  const grandes = await page.locator('main').evaluate(m => [...m.querySelectorAll('b')].filter(b => parseFloat(getComputedStyle(b).fontSize) > 26).length)
  f.ok(grandes === 0, `ninguna cifra de más de 26 px en la cabecera de Mantenimiento (${grandes})`)
  // H3: la marca de cada fila es la del equipo en la franja; un equipo sin condición va sin marca.
  const sin = await marcasDe(page, 'main [data-por-identificar]', 'data-por-identificar')
  const malas = sin.filter(x => (MARCA_CEIBA[x.equipo] ? !MARCA_CEIBA[x.equipo]!.test(x.marca) : x.marca !== ''))
  f.ok(sin.length > 0 && malas.length === 0, `«Paradas por identificar»: cada fila con la marca de su equipo (${sin.map(x => `${x.equipo} ${x.marca || 'sin marca'}`).join(' · ')})`)
  const p201 = sin.find(x => x.equipo === 'P-201B'), lc08 = sin.find(x => x.equipo === 'LC-08')
  f.ok((!p201 || /^Prioridad 1\b/.test(p201.marca)) && (!lc08 || lc08.marca === ''), 'P-201B con su ◆1 (no ▲2) y LC-08, que arrancó sin identificar, sin marca')
  // En el papel, las cifras de lo programado siguen escritas (el globo sale en el papel).
  await page.emulateMedia({ media: 'print' })
  const papel = await f.textoPagina()
  await page.emulateMedia({ media: 'screen' })
  f.ok(/Programado: 0 bbl · 0 %/.test(papel) && /No programado \(libro\): 1\.046 bbl/.test(papel), 'en el papel, lo programado y lo no programado con sus cifras')

  // G-16 (D-2): con todos los campos hay costo por falla: se dice «le costaría la falla», nunca «… bbl si falla hoy».
  await f.ir('#/jefe/mantenimiento/ceiba~portafolio/curso')
  await f.esperarTexto('Intervenir ya')
  const todos = await f.texto()
  f.ok(/≈ [\d.]+ bbl le costaría la falla/.test(todos) && !/bbl si falla hoy/i.test(todos), 'el costo de la falla va en bbl con su nombre, y «si falla hoy» no se dice en bbl')
  f.cerrar()
})

test('Diferidos: el bloque de la cifra de Resultados, el libro con sus nombres y las barras en la rampa de datos', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/prod/diferidos/ceiba/curso')
  await page.locator('main [data-cifra-diferidos]').waitFor()
  // P-diferidos-1: el mismo bloque de Resultados, con sus nombres.
  const cifra = page.locator('main [data-cifra-diferidos]')
  const c = await cifra.locator('[data-cifra]').innerText(), frase = await cifra.locator('[data-frase]').innerText(), previo = await cifra.locator('[data-periodo-resultados]').innerText()
  f.ok(c === '1.046' && frase === 'no se produjeron en La Ceiba.' && previo === 'Lo que pasó · octubre, en curso', `arriba, «${previo} · ${c} · ${frase}» (el de Resultados)`)
  const t = await f.texto()
  f.ok(!t.includes('barriles diferidos') && !/\+\d+ % frente a/.test(t), 'sin el bloque de antes con otros nombres («barriles diferidos», «+80 % frente a…»)')
  // El diferido por día contra el máximo no se pierde: va en «Dónde bajarlo».
  const donde = page.locator('main section', { has: page.getByRole('heading', { name: 'Dónde bajarlo', exact: true }) })
  f.ok(/diferido por día/.test(await donde.innerText()) && /máximo 800/.test(await donde.innerText()), 'el diferido por día contra el máximo firmado, en «Dónde bajarlo»')
  // G-5 y G-8: el cuadre con los nombres de siempre.
  const cuadre = page.locator('main section', { has: page.getByRole('heading', { name: '¿Se puede publicar? Cuadre y custodia', exact: true }) })
  const tc = await cuadre.innerText()
  f.ok(/Potencial del libro · octubre/.test(tc) && /= Diferido/.test(tc) && !/No producido/.test(tc), '«Potencial del libro · octubre» y «= Diferido» en el cuadre')
  // P-09: P-201B es «bomba de agua» en «Por equipo», no «bomba de reinyección».
  const porEquipo = page.locator('main section', { has: page.getByRole('heading', { name: 'Por equipo', exact: true }) })
  const te = await porEquipo.innerText()
  f.ok(/P-201B[\s\S]{0,40}bomba de agua/.test(te) && !/reinyección/i.test(te), '«Por equipo»: P-201B, bomba de agua')
  // V2-1: ninguna barra de dato en el gris de 2,12:1 (--dato-5).
  const dato5 = await page.locator('main').evaluate(m => {
    const prueba = document.createElement('i'); prueba.style.background = 'var(--dato-5)'; m.appendChild(prueba)
    const gris = getComputedStyle(prueba).backgroundColor; prueba.remove()
    return [...m.querySelectorAll('i')].filter(i => getComputedStyle(i).backgroundColor === gris).length
  })
  f.ok(dato5 === 0, `las barras secundarias de «Por equipo» y «Tipo de causa» en --dato3, no en --dato-5 (${dato5})`)
  // H20: el mes que pasó su máximo lleva el cuadrado «3» de verdad (12 px o más), con su nombre accesible en el mes.
  // El tamaño de la marca es su caja (X5 §3.3): el ancho del <svg> en pantalla, no el del cuadrado de adentro (getBoundingClientRect de un svg anidado mide su contenido).
  const marcas = await page.locator('main [data-marca-mes="aviso"] svg').evaluateAll(es => es.map(e => {
    const s = e as SVGSVGElement, padre = s.ownerSVGElement!, vb = padre.viewBox.baseVal
    return s.width.baseVal.value * (vb && vb.width ? padre.getBoundingClientRect().width / vb.width : 1)
  }))
  f.ok(marcas.length >= 1 && marcas.every(w => w >= 11.5), `el mes que pasó su máximo, con su marca de aviso (${marcas.map(w => w.toFixed(1)).join(', ')} px)`)
  f.ok(await page.locator('main section', { has: page.getByRole('heading', { name: 'Mes a mes', exact: true }) }).getByText('bbl', { exact: true }).count() >= 1, '«Mes a mes» dice su unidad en el título')
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

test('La producción día a día: lo discontinuo es solo la meta; el día en curso, con su punto hueco y su palabra', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/prod/produccion/ceiba/curso')
  const g = page.locator('main svg[aria-label^="Producción diaria"]').first()
  await g.waitFor()
  const pot = g.locator('[data-curva="potencial"]')
  f.ok(await pot.count() === 1 && !(await pot.getAttribute('stroke-dasharray')), 'el potencial del libro va continuo')
  const discontinuas = await g.locator('polyline[stroke-dasharray], line[stroke-dasharray]').evaluateAll(es => es.map(e => e.getAttribute('stroke-dasharray')))
  f.ok(discontinuas.every(d => d === '2 3'), `lo único discontinuo es la meta (${discontinuas.join(', ') || 'ninguna'})`)
  f.ok(await g.locator('[data-dia-en-curso]').count() === 1 && (await page.locator('main [data-leyenda-en-curso]').innerText()).includes('día en curso'), 'el día en curso, con su punto hueco y su palabra en la leyenda')
  f.cerrar()
})
