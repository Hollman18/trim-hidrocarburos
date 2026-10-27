/* «La planta viva», experiencia v3 (necesario-por-rol §1, §2 y §14; imágenes d1-grafito ger y prod;
   decisión 2 del dueño, opción A: SIN el control Antes · Durante · Después).
   - La cifra del gerente y su explicación, del motor (`GET /api/vistas/planta-viva`): La Ceiba,
     1.966 bbl/d que se dejan de producir, con la bomba de agua P-201B por su nombre; 1.665 en la
     planta + 301 de LC-21 = 1.966.
   - La tubería de 4 tramos con el kit SCADA (`[data-tuberia-kit]`): la planta, marcada; el tramo abre
     su hoja (la frase, sus equipos, ¿por qué? sin códigos) y un equipo, su ficha ejecutiva.
   - El Antes y el Después ya no son un control: viven en «¿Está funcionando?» (antes de TRIM, este mes,
     lo ganado), cuyo «Por tramo» suma lo ganado; el balance del choke por tramo suma el diferido.
   - «Todos mis campos»: 2.650 bbl/d, una fila por campo, de la que más pesa a la que menos.
   - Producción: su lente (9.394 salen hoy, limitan los pozos, «Si falla hoy»).
   - En el teléfono (390 y 320 px) la tubería va de pie y nada se sale, se recorta ni se pisa.

   Las cifras exactas se leen de los `data-*` de la pantalla: la pantalla redondea y aquí se
   comprueba la cuenta, no el redondeo. */
import { expect, type Page } from '@playwright/test'
import { test } from './apoyo.ts'
import { detectar } from './auditoria/detector.ts'

const cerca = (a: number, b: number) => Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b))
/** Un código de la ANH (NP_PROC, P_MANT…): el gerente no los ve nunca. */
const CODIGO_ANH = /\b(?:NP|P)_[A-Z]{2,}/
/** «1.665» → 1665; «-2.928» → -2928. */
const entero = (t: string) => Number(t.replace(/[^\d-]/g, ''))

/** La cifra del inicio (gerente o producción), su explicación y la tubería del kit. */
const lectura = (page: Page) => page.evaluate(() => {
  const raiz = document.querySelector('[data-planta-viva]')
  const tramos = [...document.querySelectorAll('[data-tuberia-kit] [data-tramo-kit]')].map(t => ({
    tramo: t.getAttribute('data-tramo-kit') ?? '',
    cifra: t.querySelector('b')?.textContent ?? '',
    texto: (t as HTMLElement).innerText,
    marcado: !!t.querySelector('[data-kit="area"][data-estado="anormal"]'),
  }))
  return {
    alcance: raiz?.getAttribute('data-planta-viva') ?? '', momento: raiz?.getAttribute('data-momento') ?? '', lente: raiz?.getAttribute('data-lente') ?? '',
    valor: Number(raiz?.getAttribute('data-valor')), entero: Number(raiz?.getAttribute('data-entero')),
    cifra: document.querySelector('[data-kit="cifra"][data-tamano="principal"] [data-cifra-numero]')?.textContent ?? '',
    explica: document.querySelector('[data-explica]')?.textContent ?? '',
    tramos, kit: document.querySelector('[data-tuberia-kit]')?.getAttribute('data-tuberia-kit') ?? '',
    dePie: document.querySelector('[data-tuberia-kit]')?.hasAttribute('data-de-pie') ?? false,
    aria: document.querySelector('[data-tuberia-kit]')?.getAttribute('aria-label') ?? '',
  }
})

test('gerente: la cifra, su explicación y el tramo marcado de La Ceiba, sin el control de momentos', async ({ flujo: f }) => {
  await f.abrir('/#/ger/planta-viva/ceiba/curso')
  await f.page.waitForSelector('[data-planta-viva]')

  await test.step('1.966 bbl/d se dejan de producir; la planta, marcada; 1.665 + 301 = 1.966', async () => {
    const l = await lectura(f.page)
    f.ok(l.alcance === 'campo' && l.momento === 'durante' && l.lente === 'gerente', `abre en lo de ahora, el de un campo (${l.alcance}, ${l.momento}, ${l.lente})`)
    f.ok(l.cifra === '1.966' && l.entero === 1966, `la cifra: «${l.cifra}»`)
    f.ok(l.explica.includes('La bomba de agua P-201B paró a las 03:52') && l.explica.includes('LC-21'), `la explicación nombra el equipo y su familia: «${l.explica}»`)
    f.ok(l.kit === 'reservorio,pozo,planta,exportacion', `la tubería de 4 tramos del choke (${l.kit})`)
    const marcados = l.tramos.filter(t => t.marcado).map(t => t.tramo)
    f.ok(marcados.join() === 'planta', `un solo tramo marcado: la planta (${marcados.join(', ')})`)
    const planta = entero(l.tramos.find(t => t.tramo === 'planta')!.cifra)
    const sinCausa = Number(/Los otros ([\d.]+)/.exec(l.explica)?.[1]?.replace(/\./g, '') ?? NaN)
    f.ok(planta === 1665 && sinCausa === 301 && planta + sinCausa === l.entero, `1.665 en la planta + 301 de LC-21 = la cifra (${planta} + ${sinCausa} = ${l.entero})`)
    f.ok(l.tramos.filter(t => t.tramo !== 'planta').every(t => t.cifra === ''), 'los demás tramos no dejan de pasar nada: sin cifra, con su palabra')
    f.ok(await f.page.locator('[data-tuberia-kit] [data-kit="area"]').count() === 4, 'cada tramo es un área del kit SCADA')
    f.ok(l.aria.startsWith('Se dejan de producir 1.966 barriles por día') && !l.aria.includes('bbl/d'), `el nombre accesible del dibujo es la frase: «${l.aria}»`)
    const t = await f.texto()
    f.ok(!/choke/i.test(t) && !CODIGO_ANH.test(t), 'sin la palabra «choke» ni códigos de la ANH en la pantalla')
    // Opción A (decisión 2): el control de momentos sale; lo simulado no va en la primera capa (A-30).
    f.ok(await f.page.locator('[data-momentos], [role=radiogroup][aria-label="Momento"]').count() === 0, 'sin el control Antes · Durante · Después')
    f.ok(!t.includes('Lo que todavía se puede mover') && !t.includes('Dónde bajarlo') && !t.includes('Tipo de causa'), 'sin lo simulado ni «Dónde bajarlo» ni «Tipo de causa»')
    f.ok(t.includes('Producido · diferido · perdido') && t.includes('¿Está funcionando?'), 'el balance del choke y «¿Está funcionando?»')
  })

  await test.step('«¿Está funcionando?»: antes de TRIM, este mes y lo ganado, que suma por tramo', async () => {
    const card = f.page.locator('[data-funcionando]')
    const texto = await card.innerText()
    f.ok(/Antes de TRIM\s*391/.test(texto) && /Este mes\s*436/.test(texto), `antes 391 bbl/d y este mes 436 en La Ceiba (motor): «${texto.replace(/\s+/g, ' ').slice(0, 120)}»`)
    f.ok(texto.includes('sin meta firmada'), 'sin meta de reducción firmada, lo dice')
    const ganado = Number(await card.getAttribute('data-ganado'))
    f.ok(ganado === 3934, `ya se ganó 3.934 bbl (${ganado})`)
    await card.locator('[data-funcionando-tramos]').click()
    const porTramo = await card.locator('[data-funcionando-tramo]').evaluateAll(es => es.map(e => (e.querySelectorAll('td')[2]?.textContent ?? '')))
    const suma = porTramo.reduce((a, x) => a + Number(x.replace(/[^\d-]/g, '') || 0), 0)
    f.ok(porTramo.length >= 2 && suma === ganado, `por tramo, lo ganado suma el total (${porTramo.join(' + ')} = ${suma})`)
  })

  await test.step('el balance: el diferido de cada tramo suma el del mes; el perdido, aparte', async () => {
    const b = await f.page.evaluate(() => {
      const x = document.querySelector('[data-balance]')!
      return { diferido: Number(x.getAttribute('data-diferido')), perdido: x.getAttribute('data-perdido'),
        tramos: [...x.querySelectorAll('[data-tramo-balance] td:first-of-type')].map(td => Number((td.textContent ?? '').replace(/\D/g, ''))) }
    })
    f.ok(b.diferido === 1046 && b.tramos.reduce((a, x) => a + x, 0) === 1046, `118 + 573 + 355 = 1.046, el diferido del libro (${b.tramos.join(' + ')})`)
    f.ok(b.perdido === 'sin-registro', 'el perdido: «sin registro», nunca 0')
  })

  await test.step('La hoja del tramo con el teclado: la frase, sus equipos y ¿por qué?, sin códigos', async () => {
    await f.page.locator('[data-tramo-kit="planta"]').focus()
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
    await f.page.locator('[data-tramo-kit="planta"]').click()
    await f.page.locator('[data-hoja-tramo] [data-equipo-tramo="P-201B"]').click()
    await f.page.locator('[data-panel-equipo]').waitFor()
    f.ok((await f.page.locator('[data-panel-equipo]').innerText()).includes('P-201B'), 'P-201B abre su ficha')
    await f.page.keyboard.press('Escape')
  })

  await test.step('La acción principal: «Ver P-201B», 1 toque, abre la ficha', async () => {
    await f.page.locator('[data-ver-que-se-hace="P-201B"]').click()
    await f.page.locator('[data-panel-equipo]').waitFor()
    f.ok((await f.page.locator('[data-panel-equipo]').innerText()).includes('P-201B'), 'Ver P-201B abre su ficha')
    await f.page.keyboard.press('Escape')
  })
  f.cerrar()
})

test('gerente: «Todos mis campos», 2.650 bbl/d, una fila por campo, de la que más pesa', async ({ flujo: f }) => {
  await f.abrir('/#/ger/planta-viva/ceiba~portafolio/curso')
  await f.page.waitForSelector('[data-planta-viva="portafolio"]')
  const l = await lectura(f.page)
  f.ok(l.cifra === '2.650', `la cifra de todos: «${l.cifra}»`)
  f.ok(l.explica.includes('P-201B') && l.explica.includes('La Ceiba'), `lo que más pesa, por su nombre: «${l.explica}»`)
  const filas = await f.page.locator('[data-por-campo] [data-campo]').evaluateAll(es => es.map(e => ({ campo: e.getAttribute('data-campo'), valor: Number(e.getAttribute('data-valor')) })))
  f.ok(filas.length === 2 && filas[0]!.campo === 'ceiba' && filas[1]!.campo === 'morichal', `una fila por campo con paradas, de la que más pesa (${filas.map(x => x.campo).join(', ')})`)
  f.ok(cerca(filas.reduce((a, x) => a + x.valor, 0), l.valor), 'un nombre, una cifra: las filas suman la cifra de todos')
  const sin = await f.page.locator('[data-sin-paradas]').innerText()
  f.ok(await f.page.locator('[data-sin-paradas]').getAttribute('data-sin-paradas') === '3' && sin.includes('La Zarza') && sin.includes('gas'), `los demás, en una línea, La Zarza dice que es de gas: «${sin}»`)
  const eq = await f.page.locator('[data-por-campo] [data-primer-equipo]').evaluateAll(es => es.map(e => e.getAttribute('data-primer-equipo')))
  f.ok(eq.join() === 'P-201B,MN-41', `el equipo que más pesa en cada campo, con su marca (${eq.join(', ')})`)
  // El balance de los 5 campos cuadra con el mes del libro: 2.376.
  const dif = Number(await f.page.locator('[data-balance]').getAttribute('data-diferido'))
  f.ok(dif === 2376, `el diferido del mes en los 5 campos: 2.376 (${dif})`)
  // La fila abre el campo.
  await f.page.locator('[data-campo="morichal"] button').first().click()
  await f.page.waitForFunction(() => location.hash.startsWith('#/ger/planta-viva/morichal/'))
  await f.page.waitForSelector('[data-planta-viva="campo"]')
  f.ok(!(await f.hash()).includes('portafolio') && (await lectura(f.page)).cifra === '684', `la fila abre el campo (${await f.hash()})`)
  f.cerrar()
})

test('producción: la lente técnica, su respuesta (lo que sale hoy, lo que limita y «Si falla hoy»)', async ({ flujo: f }) => {
  await f.abrir('/#/prod/planta-viva/ceiba/curso')
  await f.page.waitForSelector('[data-planta-viva]')
  const l = await lectura(f.page)
  f.ok(l.lente === 'tecnica' && l.cifra === '9.394' && l.explica.startsWith('Limitan los pozos: a la planta le sobran 1.143 bbl/d.'),
    `producción: «${l.cifra}» / «${l.explica}»`)
  f.ok(l.kit === 'pozo,planta,exportacion', `Pozos → Planta → Salida (${l.kit})`)
  const pozo = l.tramos.find(t => t.tramo === 'pozo')!, planta = l.tramos.find(t => t.tramo === 'planta')!, salida = l.tramos.find(t => t.tramo === 'exportacion')!
  f.ok(pozo.texto.includes('limita') && pozo.cifra === '11.857' && /dan/.test(pozo.texto), `los pozos limitan: dan 11.857 («${pozo.texto.replace(/\s+/g, ' ')}»)`)
  f.ok(planta.cifra === '13.000' && /sobran 1\.143/.test(planta.texto) && planta.marcado, `la planta: caben 13.000, sobran 1.143, marcada (P-201B parada)`)
  f.ok(salida.cifra === '9.394' && /salen hoy/.test(salida.texto), 'la salida: 9.394 salen hoy, la misma cifra')
  f.ok(Number(await f.page.locator('[data-si-falla-hoy]').getAttribute('data-si-falla-hoy')) === 3059, '«Si falla hoy», el primero: 3.059 bbl/d')
  f.ok((await f.page.locator('[data-si-falla-hoy]').innerText()).includes('P-201A'), 'con su equipo: P-201A')
  f.ok(await f.page.locator('[data-confirmar-lote]').count() >= 1 && await f.page.getByRole('button', { name: 'Compartir el informe' }).count() === 0, 'su acción es «Confirmar las 2», no el informe')
  f.ok(await f.page.locator('[data-momentos]').count() === 0, 'sin el control de momentos')
  f.cerrar()
})

test('la hoja del tramo no tapa la franja en el escritorio, la cifra es un grupo con nombre y el papel', async ({ flujo: f }) => {
  await f.page.setViewportSize({ width: 1440, height: 900 })
  await f.abrir('/#/ger/planta-viva/ceiba/curso')
  await f.page.waitForSelector('[data-planta-viva]')
  // A6: la cifra con su nombre accesible, en una sola lectura.
  const nombre = await f.page.locator('[data-kit="cifra"][data-tamano="principal"] [role=img]').getAttribute('aria-label')
  f.ok(!!nombre && nombre.includes('Se deja de producir ahora') && nombre.includes('1.966'), `la cifra se anuncia con su rótulo: «${nombre}»`)
  // H7 / UI-02: en el escritorio la hoja no es modal ni lleva velo, y empieza debajo de la cabecera.
  await f.page.locator('[data-tramo-kit="planta"]').focus()
  await f.page.keyboard.press('Enter')
  const hoja = f.page.locator('[data-hoja-tramo="planta"]')
  await hoja.waitFor()
  const h = await f.page.evaluate(() => {
    const d = document.querySelector('[data-hoja-tramo]')!, fr = document.querySelector('[data-franja]')
    const r = fr?.getBoundingClientRect()
    const encima = r ? document.elementFromPoint(r.left + Math.min(20, r.width / 2), r.top + r.height / 2) : null
    return { modal: d.getAttribute('aria-modal'), arriba: d.getBoundingClientRect().top, cabecera: document.querySelector('[data-cabecera]')?.getBoundingClientRect().bottom ?? 0,
      franjaLibre: !fr || (!!encima && fr.contains(encima) && !fr.closest('[inert]')), foco: d.contains(document.activeElement) }
  })
  f.ok(h.modal === null && h.arriba >= h.cabecera - 1 && h.franjaLibre && h.foco, `no modal, debajo de la cabecera (${Math.round(h.arriba)} ≥ ${Math.round(h.cabecera)}), la franja libre y el foco adentro`)
  await f.page.keyboard.press('Escape')
  f.ok(await hoja.count() === 0 && await f.page.evaluate(() => document.activeElement?.getAttribute('data-tramo-kit')) === 'planta', 'Escape la cierra y el foco vuelve al tramo')
  await f.page.locator('[data-tramo-kit="planta"]').click()
  await hoja.waitFor()
  await f.page.mouse.click(300, 220)
  f.ok(await hoja.count() === 0, 'un clic afuera la cierra')
  // Lo proyectado va con su palabra y nunca más grande que lo medido.
  const cierre = await f.page.locator('[data-cierre] [data-kit="cifra"]').getAttribute('data-tamano')
  f.ok(cierre === 'apoyo' && (await f.page.locator('[data-cierre]').innerText()).includes('proyectado'), 'el cierre del mes: «proyectado», de apoyo')
  // A15: los títulos no saltan de nivel.
  const niveles = await f.page.evaluate(() => [...document.querySelectorAll('h1, h2, h3, h4')].filter(h => h.getClientRects().length).map(h => Number(h.tagName[1])))
  f.ok(niveles[0] === 1 && niveles.every((n, i) => i === 0 || n <= niveles[i - 1]! + 1), `los encabezados no saltan de nivel (${niveles.join(' ')})`)
  // V2-2: en el papel, los botones no salen.
  await f.page.emulateMedia({ media: 'print' })
  const enPapel = await f.page.evaluate(() => [...document.querySelectorAll('[data-planta-viva] button')]
    .filter(e => /Ver P-201B|Compartir el informe/.test(e.textContent ?? '') && getComputedStyle(e).display !== 'none' && e.getClientRects().length > 0).length)
  await f.page.emulateMedia({ media: 'screen' })
  f.ok(enPapel === 0, 'en el papel no salen «Ver P-201B» ni «Compartir el informe»')
  // P-18: una dirección vieja con un momento abre lo de ahora (el control ya no existe).
  await f.ir('#/ger/planta-viva/ceiba/despues')
  f.ok((await lectura(f.page)).cifra === '1.966', 'una dirección vieja con «despues» abre igual, en lo de ahora')
  f.cerrar()
})

test('1440 × 900: el número, «Ver P-201B» y la explicación del número caben sin desplazarse', async ({ flujo: f }) => {
  await f.page.setViewportSize({ width: 1440, height: 900 })
  await f.abrir('/#/ger/planta-viva/ceiba/curso')
  await f.page.waitForSelector('[data-planta-viva]')
  const dentro = await f.page.evaluate(() => ['[data-gerente-cifra]', '[data-ver-que-se-hace]', '[data-tuberia-kit]', '[data-produccion]', '[data-cierre]']
    .map(s => [s, (document.querySelector(s)?.getBoundingClientRect().bottom ?? 9999) <= innerHeight] as const))
  f.ok(dentro.every(([, d]) => d), `a la vista sin desplazarse: ${dentro.filter(([, d]) => !d).map(([s]) => s).join(', ') || 'todo'}`)
  f.cerrar()
})

test.describe('teléfono angosto', () => {
  test.use({ viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true })

  test('320 px: ningún texto de los dibujos baja de 12 px, nada se sale, y tocar el velo cierra la hoja', async ({ flujo: f }) => {
    const chicos: string[] = []
    const medir = async (donde: string) => {
      chicos.push(...await f.page.evaluate(x => [...document.querySelectorAll('[data-planta-viva] svg text')].flatMap(t => {
        const svg = (t as SVGTextElement).ownerSVGElement!, vb = svg.viewBox.baseVal
        const escala = vb && vb.width ? svg.getBoundingClientRect().width / vb.width : 1
        const px = parseFloat(getComputedStyle(t).fontSize) * escala
        // La excepción de X5 §3.4: el número dentro de una marca de prioridad.
        return px < 11.95 && !t.closest('svg[viewBox="0 0 14 14"], svg[viewBox="0 0 16 16"]') && (t.textContent ?? '').trim() ? [`${x} · «${t.textContent}» ${px.toFixed(1)} px`] : []
      }), donde))
      const sale = await f.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      if (sale > 1) chicos.push(`${donde}: la página se desplaza de lado ${sale} px`)
      chicos.push(...(await f.page.evaluate(detectar)).filter(h => /recortado|sale/.test(String(h[0]))).map(h => `${donde}: [${h[0]}] ${h[1]}`))
    }
    await f.abrir('/#/ger/planta-viva/ceiba/curso')
    await f.page.waitForSelector('[data-planta-viva]')
    f.ok((await lectura(f.page)).dePie, 'la tubería va de pie')
    await medir('La Ceiba')
    await f.ir('#/ger/planta-viva/ceiba~portafolio/curso')
    await f.page.waitForSelector('[data-planta-viva="portafolio"]')
    await medir('todos')
    expect.soft(chicos, 'a 320 px, ningún texto de los dibujos baja de 12 px ni se sale (H9)').toEqual([])
    await f.ir('#/ger/planta-viva/ceiba/curso')
    await f.page.waitForSelector('[data-planta-viva="campo"]')
    // UI-02: en el teléfono la hoja es modal, con su velo: tocarlo la cierra.
    await f.page.locator('[data-tramo-kit="planta"]').click()
    const hoja = f.page.locator('[data-hoja-tramo]')
    await hoja.waitFor()
    await f.page.locator('[data-hoja-tramo] [data-velo]').click({ position: { x: 20, y: 20 } })
    f.ok(await hoja.count() === 0, 'tocar el velo cierra la hoja')
    f.cerrar()
  })
})

test.describe('teléfono', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('390 px: la tubería de pie, la hoja, el balance y «Todos mis campos» sin desbordes', async ({ flujo: f }) => {
    const hallazgos: string[] = []
    const revisar = async (donde: string) => {
      for (const h of await f.page.evaluate(detectar)) hallazgos.push(`${donde}: [${h[0]}] ${h[1]}${h[3] ? ` ⟶ ${h[3]}` : ''} (${h[2]})`)
      const ancho = await f.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      if (ancho > 1) hallazgos.push(`${donde}: la página se desplaza de lado ${ancho} px`)
    }
    await f.abrir('/#/ger/planta-viva/ceiba/curso')
    await f.page.waitForSelector('[data-planta-viva]')
    const l = await lectura(f.page)
    f.ok(l.cifra === '1.966' && l.dePie, `en el teléfono la tubería va de pie con la misma cifra (${l.cifra})`)
    await revisar('La Ceiba')
    await f.page.locator('[data-tramo-kit="planta"]').click()
    await f.page.locator('[data-hoja-tramo]').waitFor()
    await revisar('La Ceiba · la hoja de la planta')
    await f.page.keyboard.press('Escape')
    await f.page.locator('[data-tramo-balance="planta"] button').click()
    await f.page.locator('[data-traza="planta"]').waitFor()
    await revisar('La Ceiba · la trazabilidad de la planta')
    await f.page.keyboard.press('Escape')
    await f.ir('#/ger/planta-viva/ceiba~portafolio/curso')
    await f.page.waitForSelector('[data-planta-viva="portafolio"]')
    const p = await lectura(f.page)
    const filas = await f.page.locator('[data-por-campo] [data-campo]').count()
    f.ok(p.cifra === '2.650' && filas === 2, `«Todos mis campos» en el teléfono: 2.650 y las filas con paradas (${p.cifra}, ${filas})`)
    await revisar('Todos mis campos')
    expect.soft(hallazgos, 'nada se sale, se recorta ni se pisa a 390 px').toEqual([])
    f.cerrar()
  })
})
