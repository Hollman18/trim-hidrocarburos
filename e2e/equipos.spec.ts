// C4 · Equipos y el nivel técnico (X4 §3.6, §3.7, §3.8 y §5; X5 §5.4 y §5.5; la imagen 4), de punta a
// punta con los datos del demo: el 2-oct a las 14:00 la P-201B de La Ceiba está parada desde las 03:52 y
// cerró LC-07 y LC-16; sus hermanas P-201A y P-201C no tienen instrumento; K-101 ya pasó el límite.
import { expect, type Page } from '@playwright/test'
import { test } from './apoyo.ts'

/** Los tags de las filas de la lista, en el orden en que se ven. */
const filas = (page: Page) => page.locator('main [data-fila-equipo]').evaluateAll(es => es.map(e => e.getAttribute('data-fila-equipo') ?? ''))
/** Escoge una píldora de un filtro (un grupo de radios). F3 (P-02): el tipo y el tren van detrás de «Más filtros». */
const filtrar = async (page: Page, grupo: string, opcion: string) => {
  const grupoEl = page.locator(`main [role=radiogroup][aria-label="${grupo}"]`)
  if (!await grupoEl.isVisible()) await page.locator('main [data-mas-filtros]').click()
  await grupoEl.locator(`[data-opcion="${opcion}"]`).click()
  await page.waitForTimeout(150)
}
/** Lo que se sale de la pantalla a lo ancho y el texto (HTML y SVG) de menos de 12 px, en el contenido. */
const medidas = (page: Page) => page.evaluate(() => {
  const ancho = document.documentElement.clientWidth
  const fuera = [...document.querySelectorAll('main *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > ancho + 1 }).length
  const chicos: string[] = []
  for (const e of document.querySelectorAll('main *')) {
    if (e.closest('svg') && e.tagName.toLowerCase() !== 'text') continue
    const texto = e.tagName.toLowerCase() === 'text' ? (e.textContent ?? '') : [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent ?? '').join('').trim()
    if (!texto || e.getBoundingClientRect().width === 0) continue
    let px = parseFloat(getComputedStyle(e).fontSize)
    if (e instanceof SVGGraphicsElement) { const m = e.getScreenCTM(); if (m) px *= Math.hypot(m.a, m.b) }
    // El número de una marca de prioridad es parte del símbolo (X5 §3.4).
    if (px < 11.95 && !(/^[123]$/.test(texto) && e.closest('svg[viewBox="0 0 14 14"]'))) chicos.push(`${texto.slice(0, 24)} (${px.toFixed(1)})`)
  }
  return { fuera, chicos }
})

test('Equipos · la lista: todos los equipos del campo, en su orden, con sus filtros y «¿Lo vigila TRIM?»', async ({ flujo: f }) => {
  const { page } = f
  // Confiabilidad abre en Equipos (X4 §3.4).
  await f.abrir('/#/conf/x/ceiba/curso')
  f.ok((await f.hash()).startsWith('#/conf/equipos/ceiba'), `confiabilidad abre en Equipos (${await f.hash()})`)
  // B3: tipo número, «Vigía 3 de 3 aciertos»; y su lista va ordenada por «Si falla hoy» (FF-8).
  await expect(page.locator('main [data-renglon="vigia"]')).toContainText(/\d+ de \d+/)
  const deConf = await filas(page)
  f.ok(deConf.slice(0, 2).join(' ') === 'P-201A P-201C' && deConf.length === 28, `confiabilidad, por «Si falla hoy»: ${deConf.slice(0, 3).join(' ')} … (${deConf.length})`)
  // El orden de los demás (el jefe): por estado (la marca, de la más grave; lo parado primero) y por «Si falla hoy».
  await f.ir('#/jefe/equipos/ceiba')
  const todas = await filas(page)
  f.ok(todas.slice(0, 9).join(' ') === 'P-201B K-101 LC-21 TK-102 H-302 LC-16 LC-07 P-201A P-201C' && todas.length === 28,
    `el orden: ${todas.slice(0, 9).join(' ')} … (${todas.length} equipos)`)
  const p201b = page.locator('main [data-fila-equipo="P-201B"]')
  await expect(p201b).toContainText('bomba de agua')
  await expect(p201b).toContainText('Alarma · parada desde hoy, 03:52')
  await expect(p201b.locator('[data-cifra-fila]')).toContainText('1.665')
  await expect(page.locator('main [data-fila-equipo="K-101"] [data-cifra-fila]')).toContainText(/hasta\s*9\.394/)
  // «¿Lo vigila TRIM?»: P-201A no tiene instrumento, con sus corchetes y su palabra.
  await expect(page.locator('main [data-fila-equipo="P-201A"]')).toContainText('no: sin instrumento')
  await expect(page.locator('main [data-fila-equipo="P-201A"]')).toContainText('sube porque P-201B está parada')
  // A-14: «Cambió hoy» lo dice cada fila («sube porque…»): la línea aparte no se repite.
  f.ok(await page.locator('main [data-cambio-hoy]').count() === 0, 'sin la línea «Cambió hoy» repetida')
  // La marca de cada fila es la de la franja: solo los equipos con condición la llevan.
  const conMarca = await page.locator('main [data-fila-equipo][data-condicion]:not([data-condicion=""])').evaluateAll(es => es.map(e => e.getAttribute('data-fila-equipo')))
  f.ok(conMarca.join(' ') === 'P-201B K-101 LC-21 TK-102 H-302', `con marca, los cinco de la franja (${conMarca.join(' ')})`)
  // Los filtros: parados, avisan, sin instrumento; por tipo y por tren; y buscar por tag.
  await filtrar(page, 'Estado', 'parados')
  f.ok((await filas(page)).join(' ') === 'P-201B LC-21 LC-16 LC-07', `parados: ${(await filas(page)).join(' ')}`)
  await filtrar(page, 'Estado', 'avisan')
  // F3 · G-15: «Avisan» cuenta lo mismo que «Equipos que avisan» (lo en riesgo); TK-102 y H-302 siguen con su marca.
  f.ok((await filas(page)).join(' ') === 'K-101', `avisan: ${(await filas(page)).join(' ')}`)
  await filtrar(page, 'Estado', 'sin-instrumento')
  f.ok((await filas(page)).join(' ') === 'LC-21 P-201A P-201C LC-19 LC-03', `sin instrumento: ${(await filas(page)).join(' ')}`)
  await filtrar(page, 'Estado', 'todos')
  await filtrar(page, 'Tipo', 'bomba')
  f.ok((await filas(page)).join(' ') === 'P-201B P-201A P-201C', `bombas: ${(await filas(page)).join(' ')}`)
  await filtrar(page, 'Tipo', 'todos')
  await filtrar(page, 'Tren', 'agua')
  f.ok((await filas(page)).join(' ') === 'P-201B P-201A P-201C', `el tren de agua: ${(await filas(page)).join(' ')}`)
  await filtrar(page, 'Tren', 'todos')
  await filtrar(page, 'Tipo', 'electrosumergible')
  f.ok((await filas(page)).length === 15, `electrosumergibles: ${(await filas(page)).length}`)
  await filtrar(page, 'Tipo', 'pozo')
  f.ok((await filas(page)).length === 18, `pozos (las electrosumergibles también son pozos): ${(await filas(page)).length}`)
  await filtrar(page, 'Tipo', 'todos')
  await page.locator('main input[type=search]').fill('K-101')
  f.ok((await filas(page)).join(' ') === 'K-101', `buscar por tag: ${(await filas(page)).join(' ')}`)
  await page.locator('main input[type=search]').fill('')
  // «Superficie» ya no se ofrece en el panel; su dirección abre Equipos con servicios y proceso.
  const subs = await page.evaluate(() => [...document.querySelectorAll('nav [data-subpantallas] button')].map(b => b.textContent?.trim() || b.getAttribute('aria-label') || ''))
  f.ok(!subs.some(x => /Superficie|Servicios y proceso/.test(x)), `el panel ya no ofrece «Superficie» (${subs.join(', ')})`)
  await f.ir('#/jefe/equipo/ceiba/curso')
  await expect(page.locator('main [role=radiogroup][aria-label="Tipo"] [data-opcion="superficie"]')).toHaveAttribute('aria-checked', 'true')
  f.ok((await filas(page)).join(' ') === 'K-101 TK-102 H-302 SE-2 V-101 C-401 LACT-01', `la dirección de Superficie: ${(await filas(page)).join(' ')}`)
  f.cerrar()
})

test('Equipos · el nivel 3 de P-201B como la imagen 4: la cifra, el bloqueo, sus señales, su tren, «mientras esté parada», su historia', async ({ flujo: f }) => {
  const { page } = f
  await page.setViewportSize({ width: 1440, height: 900 })
  await f.abrir('/#/conf/equipos/ceiba')
  await page.locator('main [data-fila-equipo="P-201B"]').click()
  await expect(page.locator('main [data-nivel3="P-201B"]')).toBeVisible()
  f.ok((await f.hash()) === '#/conf/equipos/ceiba/P-201B', `la dirección del nivel 3 (${await f.hash()})`)
  // Una vista, no el panel flotante; con su propia cabecera: las migas, los vecinos y la franja.
  f.ok(await page.locator('[data-panel-equipo]').count() === 0 && await page.locator('[data-cabecera]').count() === 0, 'sin panel flotante ni la cabecera de la lista')
  const cab = page.locator('main [data-cabecera-equipo]')
  await expect(cab.locator('nav')).toContainText(/La Ceiba\s*Agua\s*P-201B/)
  await expect(cab.locator('[data-vecinos]')).toContainText(/P-201A\s*P-201C/)
  await expect(cab.locator('h1')).toContainText('P-201B')
  await expect(cab.locator('h1')).toContainText('bomba multietapa de transferencia de agua · tratamiento de agua · criticidad 5 de 5')
  await expect(cab.locator('[data-franja]')).toBeVisible()
  // La cifra (X5 §5.1) y el bloqueo en tinta con ⊘, nunca amarillo.
  const heroe = page.locator('main [data-heroe-equipo]')
  await expect(heroe.locator('[data-previo]')).toHaveText('Alarma · parada desde hoy, 03:52 · hace 10,1 h')
  await expect(heroe.locator('[data-cifra]')).toHaveText('1.665')
  await expect(heroe.locator('[data-frase]')).toHaveText('se dejan de producir: cerró LC-07 y LC-16.')
  const bloqueo = heroe.locator('[data-bloqueo]')
  await expect(bloqueo).toContainText('No arrancar hasta identificar qué se dañó')
  await expect(bloqueo).toContainText('Si arranca antes, queda como no conformidad.')
  f.ok(await bloqueo.evaluate(e => !/(249, 168, 37|246, 238, 212|191, 64, 0)/.test(getComputedStyle(e).backgroundColor + getComputedStyle(e).boxShadow)), 'el bloqueo va en tinta: ni amarillo ni naranja')
  await expect(heroe.getByRole('button', { name: 'Crear aviso en SAP' })).toBeVisible()
  await expect(heroe.getByRole('button', { name: 'Diga qué se dañó' })).toBeVisible()
  // Sus señales: 7 indicadores analógicos con su minitendencia, en gris y sin marca (parada), y el interruptor.
  const senales = page.locator('main [data-sus-senales]')
  await expect(senales.locator('[data-senal]')).toHaveCount(8)
  // B3 · la barra del kit SCADA (§1): su nombre accesible dice el valor, la banda, la alarma y que el equipo está parado.
  const indicadores = await senales.locator('[data-kit="barra"]').evaluateAll(es => es.map(e => e.getAttribute('aria-label') ?? ''))
  f.ok(indicadores.length === 7 && indicadores.every(x => x.includes('equipo parado')) && /^Presión de succión, 18,2 psi; normal sobre 10(,0)?; alarma en 8(,0)?/.test(indicadores[0]!),
    `7 indicadores con su escala, su banda y su alarma, en gris (${indicadores[0]})`)
  f.ok(await senales.locator('[data-senal][data-condicion]:not([data-condicion=""])').count() === 0, 'parada: ninguna señal lleva marca propia (X2 B9)')
  await expect(senales.locator('[data-senal="LSH-2013"]')).toContainText('sin fuga')
  // F3 · H5 e I1: la escala sale de los límites y es provisional; lo dice, con su ⓘ.
  await expect(senales).toContainText('escala provisional')
  f.ok((await senales.locator('[aria-label^="Escala provisional"]').getAttribute('aria-label') ?? '').includes('falta el rango de cada instrumento'), 'la ⓘ dice por qué es provisional')
  // En su tren de agua: el tanque, las tres bombas por su brillo y las burbujas PI, PDI y FI.
  const tren = page.locator('main [data-esquema-agua]')
  await expect(tren).toBeVisible()
  const bombas = await tren.locator('[data-bomba-esquema]').evaluateAll(es => es.map(e => `${e.getAttribute('data-bomba-esquema')}:${e.getAttribute('data-marcha')}`))
  f.ok(bombas.join(',') === 'P-201A:sin-lectura,P-201B:parada,P-201C:sin-lectura', `las tres bombas del tren (${bombas.join(', ')})`)
  f.ok((await tren.locator('[data-burbuja]').evaluateAll(es => es.map(e => e.getAttribute('data-burbuja')))).join(',') === 'PI,PDI,FI', 'las burbujas PI, PDI y FI')
  await expect(tren).toContainText('174.033')
  // Mientras esté parada: el agua y el orden de cierre.
  const mientras = page.locator('main [data-mientras]')
  await expect(mientras).toContainText('Mientras esté parada')
  await expect(mientras).toContainText('178.500')
  await expect(mientras).toContainText('El nivel no sube: P-201A y P-201C toman lo que entra.')
  await expect(mientras.locator('[data-orden-si-para-otra]')).toContainText(/LC-02 · LC-10 · LC-01 · LC-17 · LC-14 · LC-06 al 25 % · LC-09 al 25 % · LC-11 al 20 %\. Dejan de producirse 3\.059 bbl\/d después de 2 min de colchón \(parejo, 4\.577\)/)
  // Los 12 días antes de parar, su historia y los repuestos.
  const dias = page.locator('main [data-dias-antes]')
  await expect(dias).toContainText('Los 12 días antes de parar')
  f.ok((await dias.locator('[data-tendencia]').evaluateAll(es => es.map(e => e.getAttribute('data-tendencia')))).slice(0, 2).join(',') === 'TI-2011,II-2011', 'la temperatura de cojinete y la corriente del motor')
  await expect(dias).toContainText('Modo de falla registrado: lubricación de cojinete.')
  const historia = page.locator('main [data-su-historia]')
  await expect(historia).toContainText('9 fallas, una cada 41 d, 40,0 h fuera cada vez. Le ha costado 4.593 bbl por falla. Sello mecánico 5 · rodamientos 3.')
  f.ok((await historia.locator('[data-ultima]').allInnerTexts()).map(x => x.replace(/\s+/g, ' ')).join(' | ') === '22 de sept rodamientos 1.041 bbl | 9 de ago sello mecánico 3.806 bbl', 'las dos últimas fallas')
  await expect(historia.locator('[data-repuestos]')).toContainText('Kit de sello mecánico 0 en bodega · llega 1 el 9 de oct')
  await expect(historia.locator('[data-repuestos]')).toContainText('Aviso · Impulsor y anillos de desgaste 0 en bodega · pedirlo: 45 días')
  // «Crear aviso en SAP» abre SAP aquí mismo.
  await heroe.getByRole('button', { name: 'Crear aviso en SAP' }).click()
  await expect(page.locator('main [data-sap-equipo]')).toContainText('SAP · mantenimiento')
  // De lado, sin subir: el vecino del tren, y «atrás» vuelve.
  await cab.locator('[data-vecinos] button', { hasText: 'P-201C' }).click()
  await expect(page.locator('main [data-nivel3="P-201C"]')).toBeVisible()
  await expect(page.locator('main [data-heroe-equipo]')).toContainText('sin instrumento')
  await expect(page.locator('main [data-mientras]')).toContainText('Mientras P-201B esté parada')
  await page.goBack()
  await expect(page.locator('main [data-nivel3="P-201B"]')).toBeVisible()
  // Subir es por las migas: «Agua» vuelve a la lista con el tren de agua.
  await cab.locator('nav button', { hasText: 'Agua' }).click()
  await expect(page.locator('main [data-lista-equipos]')).toBeVisible()
  // Confiabilidad ve su lista por «Si falla hoy» (FF-8): las dos que valen más primero.
  f.ok((await filas(page)).join(' ') === 'P-201A P-201C P-201B', `la miga del tren vuelve a la lista con su filtro (${(await filas(page)).join(' ')})`)
  // Nada de texto de menos de 12 px ni nada que se salga, a 1440.
  await page.locator('main [data-fila-equipo="P-201B"]').click()
  await expect(page.locator('main [data-nivel3="P-201B"]')).toBeVisible()
  const m = await medidas(page)
  f.ok(m.fuera === 0 && m.chicos.length === 0, `a 1440 px nada se sale (${m.fuera}) ni mide menos de 12 px (${m.chicos.slice(0, 5).join(' · ')})`)
  f.cerrar()
})

test('Equipos · el nivel 4: el diagnóstico detrás de «Ver el diagnóstico», con su dirección', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/conf/equipos/ceiba/P-201B')
  await page.locator('main [data-ver-diagnostico]').click()
  await expect(page.locator('main [data-nivel4="P-201B"]')).toBeVisible()
  f.ok((await f.hash()) === '#/conf/equipos/ceiba/P-201B/diagnostico', `la dirección del nivel 4 (${await f.hash()})`)
  await expect(page.locator('main [data-cabecera-equipo] nav')).toContainText(/La Ceiba\s*Agua\s*P-201B\s*Diagnóstico/)
  const t = await f.texto()
  f.ok(t.includes('Salud por parte') && t.includes('Vigía') && t.includes('Paradas del PLC') && t.includes('Puntos ciegos') && t.includes('Historia del PLC') && t.includes('SAP · mantenimiento'),
    'la salud por parte, el vigía, las paradas del PLC, los puntos ciegos, la historia del PLC y SAP')
  await expect(page.locator('main [data-diagnostico-bomba="P-201B"]')).toBeVisible()
  // Cada instrumento abre la cadena de su dato.
  await page.locator('main [data-instrumentos] button').first().click()
  await expect(page.locator('main')).toContainText(/PI-2010/)
  // «atrás» sube al nivel 3 (la cadena del dato no deja entrada en el historial).
  await page.goBack()
  await expect(page.locator('main [data-nivel3="P-201B"]')).toBeVisible()
  // Una dirección compartida abre el nivel 4 directo.
  await f.abrir('/#/conf/equipos/morichal/MPP-301/diagnostico')
  await expect(page.locator('main [data-nivel4="MPP-301"]')).toBeVisible()
  await page.locator('main [data-cabecera-equipo] nav button', { hasText: 'MPP-301' }).click()
  await expect(page.locator('main [data-nivel3="MPP-301"]')).toBeVisible()
  // En marcha: 4 señales abiertas (la que avisa, con su marca) y las demás plegadas en un renglón.
  await expect(page.locator('main [data-senal="PDT-3011"]')).toHaveAttribute('data-condicion', 'atencion')
  await expect(page.locator('main [data-plegadas]')).toContainText('12 señales más: 6 temperaturas, 4 presiones, 1 de vibración y 1 de corriente · todas en banda')
  await page.locator('main [data-plegadas]').click()
  await expect(page.locator('main [data-sus-senales] [data-senal]')).toHaveCount(16)
  f.cerrar()
})

test('Equipos · las direcciones de antes y desde cualquier lugar: el nivel 3 para los técnicos, la ficha ejecutiva para el gerente', async ({ flujo: f }) => {
  const { page } = f
  // X4 §3.8: #/sup/bombas/ceiba/curso/P-201B pasa a #/sup/equipos/ceiba/P-201B.
  await f.abrir('/#/sup/bombas/ceiba/curso/P-201B')
  await expect(page.locator('main [data-nivel3="P-201B"]')).toBeVisible()
  f.ok((await f.hash()) === '#/sup/equipos/ceiba/P-201B' && await page.locator('[data-panel-equipo]').count() === 0, `la dirección de antes abre el nivel 3 (${await f.hash()})`)
  // Al supervisor, sin el modo de falla ni el vigía (son del diagnóstico).
  f.ok(!(await f.texto()).includes('Modo de falla'), 'al supervisor, sin el modo de falla')
  // Un pozo, desde su dirección de antes: su nivel 3 con su detalle.
  await f.abrir('/#/prod/pozos/ceiba/curso/LC-16')
  await expect(page.locator('main [data-nivel3="LC-16"]')).toBeVisible()
  await expect(page.locator('main [data-heroe-equipo]')).toContainText('cerrado por P-201B')
  // El pozo que cerró la bomba enlaza a ella: su nivel 3.
  await page.getByRole('button', { name: 'Ver P-201B' }).click()
  await expect(page.locator('main [data-nivel3="P-201B"]')).toBeVisible()
  // Desde la franja de Hoy, el equipo abre su nivel 3, y «atrás» vuelve a Hoy sin volverlo a abrir.
  await f.abrir('/#/sup/hoy/ceiba/curso')
  await page.locator('header [data-franja] button', { hasText: 'alarmas' }).click()
  await page.locator('header [data-franja] [role=group] button', { hasText: 'K-101' }).click()
  await expect(page.locator('main [data-nivel3="K-101"]')).toBeVisible()
  f.ok((await f.hash()) === '#/sup/equipos/ceiba/K-101', `desde la franja, el nivel 3 (${await f.hash()})`)
  await expect(page.locator('main [data-si-falla-ficha="K-101"]')).toContainText(/Si falla hoy: hasta [\d.]+ bbl\/d/)
  await page.goBack(); await f.esperar(600)
  f.ok((await f.hash()).startsWith('#/sup/hoy/ceiba') && await page.locator('main [data-nivel3]').count() === 0, `«atrás» vuelve a Hoy (${await f.hash()})`)
  // El gerente (A-16: sin Equipos): su dirección abre su inicio, y un equipo abre su ficha ejecutiva en el panel.
  await f.abrir('/#/ger/equipos/ceiba')
  f.ok(!(await f.hash()).startsWith('#/ger/equipos'), `la dirección de Equipos del gerente abre su inicio (${await f.hash()})`)
  await f.abrir('/#/ger/resultados/ceiba/curso/P-201B')
  await expect(page.locator('[data-panel-equipo]')).toBeVisible()
  await expect(page.locator('[data-panel-equipo]')).toContainText('Le ha costado')
  f.ok(await page.locator('main [data-nivel3]').count() === 0, 'el gerente no abre el nivel técnico')
  f.cerrar()
})

test('Equipos · 390 px: la lista y el nivel 3 caben en el teléfono, sin nada de menos de 12 px', async ({ flujo: f }) => {
  const { page } = f
  await page.setViewportSize({ width: 390, height: 844 })
  await f.abrir('/#/sup/equipos/ceiba')
  await expect(page.locator('main [data-fila-equipo="P-201B"]')).toBeVisible()
  let m = await medidas(page)
  f.ok(m.fuera === 0 && m.chicos.length === 0, `la lista a 390 px: nada se sale (${m.fuera}), nada de menos de 12 px (${m.chicos.slice(0, 5).join(' · ')})`)
  await page.locator('main [data-fila-equipo="P-201B"]').click()
  await expect(page.locator('main [data-nivel3="P-201B"]')).toBeVisible()
  await expect(page.locator('main [data-heroe-equipo] [data-cifra]')).toHaveText('1.665')
  await expect(page.locator('main [data-heroe-equipo] [data-bloqueo]')).toBeVisible()
  // El tren de agua: el dibujo si cabe con letra de 12 px; si no, en renglones.
  f.ok(await page.locator('main [data-esquema-agua]').filter({ visible: true }).count() + await page.locator('main [data-tren-renglones]').filter({ visible: true }).count() === 1, 'el tren de agua se ve (dibujo o renglones)')
  m = await medidas(page)
  f.ok(m.fuera === 0 && m.chicos.length === 0, `el nivel 3 a 390 px: nada se sale (${m.fuera}), nada de menos de 12 px (${m.chicos.slice(0, 5).join(' · ')})`)
  // Los botones de acción, de 48 px para el dedo.
  const altos = await page.locator('main [data-heroe-equipo] button').evaluateAll(es => es.map(e => e.getBoundingClientRect().height))
  f.ok(altos.length >= 1 && altos.every(h => h >= 44), `los botones miden 44 px o más (${altos.map(Math.round).join(', ')})`)
  f.cerrar()
})

test('Planta (nivel 2): el texto del esquema mide 12 px o más a 1440 px y nada se recorta', async ({ flujo: f }) => {
  const { page } = f
  await page.setViewportSize({ width: 1440, height: 900 })
  await f.abrir('/#/prod/planta/ceiba/curso')
  await expect(page.locator('main [data-caudales]')).toContainText('9.394 bbl/d de crudo')
  const textos = await page.evaluate(() => [...document.querySelectorAll('main svg[role=group] text')].flatMap(t => {
    const m = (t as SVGTextElement).getScreenCTM(); if (!m || t.getBoundingClientRect().width === 0) return []
    const px = parseFloat(getComputedStyle(t).fontSize) * Math.hypot(m.a, m.b)
    const dibujo = t.closest('svg[role=group]')!.getBoundingClientRect(), r = t.getBoundingClientRect()
    const marca = /^[123]$/.test(t.textContent ?? '') && !!t.closest('svg[viewBox="0 0 14 14"]')
    return [{ texto: t.textContent ?? '', px, dentro: r.left >= dibujo.left - 1 && r.right <= dibujo.right + 1, marca }]
  }))
  const chicos = textos.filter(x => !x.marca && x.px < 11.95), fuera = textos.filter(x => !x.dentro)
  f.ok(textos.length > 20 && chicos.length === 0, `el esquema: ${textos.length} textos, ninguno de menos de 12 px (${chicos.map(x => `${x.texto} ${x.px.toFixed(1)}`).slice(0, 4).join(' · ')})`)
  f.ok(fuera.length === 0, `ninguno se sale del dibujo (${fuera.map(x => x.texto).join(', ')})`)
  // El equipo se ve por su brillo: la caja no se tiñe; la bomba detenida, con contorno de 2 px.
  const caja = await page.locator('main [data-nodo="bomba"] rect.marco').evaluate(e => ({ marcha: e.getAttribute('data-marcha'), relleno: getComputedStyle(e).fill, borde: getComputedStyle(e).strokeWidth }))
  f.ok(caja.marcha === 'detenido' && !/245, 226, 212/.test(caja.relleno) && caja.borde === '2px', `las bombas de agua: detenida, sin teñir (${caja.relleno}), contorno de 2 px`)
  f.cerrar()
})
