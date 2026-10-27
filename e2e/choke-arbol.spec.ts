/* El árbol de pérdidas del choke en las pantallas (el «modelo choke expandido»
   de SPE-36848; CHOKE-COMPLETO §6):
   - producción abre el tramo de la planta de La Ceiba y ve planeada o no, la
     causa, el detalle y los equipos con su parte; las ramas suman el tramo y
     cada rama suma las suyas; en el papel todo sale desplegado;
   - el gerente ve lo NO planeado de cada tramo (bbl y %), con la misma cifra de
     la barra de «dónde se trabó», sin códigos de la ANH ni la palabra «choke»;
   - regulatorio ve el árbol en el orden de la circular, con la cadena que viaja
     a la ANH en cada paso, la rama vacía de la pérdida y el cuadre con el libro;
     las casillas de PRODML quedan debajo;
   - a 390 px, con el árbol abierto, nada se sale ni se pisa.

   Las cifras se leen de los `data-*` de cada rama: la pantalla las redondea y
   aquí se comprueba la cuenta, no el redondeo. */
import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { test } from './apoyo.ts'
import { detectar } from './auditoria/detector.ts'

/** Un código de la ANH (NP_PROC, P_MANT…): el gerente y producción no los ven. */
const CODIGO_ANH = /\b(?:NP|P)_[A-Z]{2,}/
const cerca = (a: number, b: number) => Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b))

/** Una rama como la pinta la pantalla. */
interface Rama { nodo: string; valor: string; bbl: number; noPlaneada: number; visible: boolean; hijos: Rama[]
  /** Un eslabón de una cadena de un solo hijo: va en el renglón de su cabeza (B-34). */
  enCadena?: boolean }

/** Las ramas que cuelgan de un contenedor, con las que cuelgan de cada una. Una
 *  rama de un solo hijo va en un renglón (B-34): sus eslabones van marcados con
 *  `data-nodo-cadena`, y aquí se vuelven a anidar para leer el árbol entero. */
const ramas = (page: Page, sel: string) => page.evaluate((s): Rama[] | null => {
  const raiz = document.querySelector(s)
  if (!raiz) return null
  const leer = (ul: Element | null): Rama[] => (ul ? [...ul.children].filter(li => li.matches('li[data-nodo]')).map(li => {
    const visible = (li as HTMLElement).offsetParent !== null
    const de = (e: Element, k: string) => ({ nodo: e.getAttribute(k) ?? '', valor: e.getAttribute('data-valor') ?? '',
      bbl: Number(e.getAttribute('data-bbl')), noPlaneada: Number(e.getAttribute('data-no-planeada')) })
    const eslabones = [...li.querySelectorAll(':scope > div [data-nodo-cadena]')].map(e => de(e, 'data-nodo-cadena'))
    const cadena = eslabones.length ? eslabones : [de(li, 'data-nodo')]
    let abajo = leer(li.querySelector(':scope > ul'))
    cadena.forEach((x, i) => { if (i > 0) Object.assign(x, { enCadena: true }) })
    for (const x of [...cadena].reverse()) abajo = [{ ...x, visible, hijos: abajo }]
    return abajo[0]!
  }) : [])
  // K2: las ramas van en un contenedor que se pliega en el teléfono (`plegadoEnTelefono`).
  return leer(raiz.querySelector(':scope > ul') ?? raiz.querySelector(':scope > div > ul'))
}, sel)

const todas = (rs: Rama[]): Rama[] => rs.flatMap(r => [r, ...todas(r.hijos)])
/** Lo que cuelga de una rama y se pliega con ella: debajo del último eslabón de su renglón. */
const plegado = (r: Rama): Rama[] => (r.hijos.length === 1 && r.hijos[0]!.enCadena ? plegado(r.hijos[0]!) : r.hijos)
/** Las ramas que no suman lo que cuelga de ellas. */
const sinCuadre = (rs: Rama[]): string[] => rs.flatMap(r => [
  ...(r.hijos.length && !cerca(r.hijos.reduce((a, h) => a + h.bbl, 0), r.bbl) ? [`${r.nodo} ${r.valor}`] : []), ...sinCuadre(r.hijos)])
/** El camino más hondo: los niveles en el orden en que se abren. */
const camino = (rs: Rama[]): string[] => {
  const r = rs.find(x => x.hijos.length) ?? rs[0]
  return r ? [r.nodo, ...camino(r.hijos)] : []
}

/** El texto de la pantalla más lo que oye el lector (aria-label y title). */
const todoElTexto = (page: Page) => page.evaluate(() => {
  const m = document.querySelector('main')
  if (!m) return ''
  return [m.innerText, ...[...m.querySelectorAll('[aria-label],[title]')].map(e => `${e.getAttribute('aria-label') ?? ''} ${e.getAttribute('title') ?? ''}`)].join('\n')
})

// K1 · P-16 / H8: «Se trabó en el período» de la tubería de antes (Producción) vive en Diferidos, «Por tramo», con el
// mismo árbol de cada tramo (`Ramas`): se prueba ahí.
test('producción abre la planta de La Ceiba: planeada o no, causa, detalle y equipos, y las ramas suman el tramo', async ({ flujo: f }) => {
  await f.abrir('/#/prod/diferidos/ceiba/curso')
  await f.esperarTexto('Por tramo')

  await test.step('Octubre: el tramo de la planta se abre con un toque y sus ramas suman el tramo', async () => {
    const fila = f.page.locator('[data-por-tramo] [data-tramo-fila="planta"]')
    const tramo = Number(await fila.locator('[data-tramo="planta"]').getAttribute('data-bbl'))
    // El botón del tramo, no los de sus ramas.
    const boton = fila.locator(':scope > div > button[aria-expanded]')
    const caja = f.page.locator('[data-por-tramo] [data-ramas="planta"]')
    f.ok(await boton.getAttribute('aria-expanded') === 'false' && !(await caja.isVisible()), 'el tramo de la planta empieza cerrado')
    await boton.click()
    f.ok(await boton.getAttribute('aria-expanded') === 'true' && await caja.isVisible(), 'un toque lo abre (aria-expanded)')
    const rs = await ramas(f.page, '[data-ramas="planta"]') ?? []
    const suma = rs.reduce((a, r) => a + r.bbl, 0)
    f.ok(rs.length > 0 && rs.every(r => r.nodo === 'planeacion'), `lo primero es planeada o no (${rs.map(r => r.valor).join(', ')})`)
    f.ok(tramo > 0 && cerca(suma, tramo), `las ramas suman el tramo: ${suma.toFixed(2)} = ${tramo.toFixed(2)} bbl`)
    const malas = sinCuadre(rs)
    f.ok(malas.length === 0, `y cada rama suma las suyas${malas.length ? `: ${malas.join(', ')}` : ''}`)
    f.ok(camino(rs).join(' → ') === 'planeacion → n1 → n2 → equipo', `planeada o no → causa → detalle → equipo (${camino(rs).join(' → ')})`)
    f.ok(todas(rs).every(r => r.visible), 'abierto, todo se ve: causas, detalles y equipos')
    const texto = (await caja.innerText()).replace(/\s+/g, ' ')
    // B-27: la causa con el mismo nombre que en Identificar (el de la Tabla 1).
    f.ok(/No planeada/.test(texto) && texto.includes('No planeada - Proceso / Facilidades') && texto.includes('Parada estación/bombeo afecta pozos'),
      'la causa y el detalle, en palabras')
    // B-34: una rama de un solo hijo va en un renglón, con los barriles una vez.
    const renglones = await caja.locator('li[data-cadena-larga]').count()
    const cifras = texto.match(/\b573 bbl/g)?.length ?? 0
    f.ok(renglones === 1 && cifras === 1, `la cadena de un solo equipo va en un renglón, sin repetir «573 bbl» en cada nivel (${renglones} renglón, ${cifras} vez)`)
    // Safari junta lo que el lector oye aparte («bbl,100 %»): se compara sin depender de ese espacio.
    // P-09 (K1): la familia de campo, «bomba de agua», también en el árbol.
    f.ok(/P-201B · bomba de agua · sin parte 573 bbl, ?100 % ?del tramo/.test(texto), `el equipo, su parte y lo que pesa en el tramo: «${texto.slice(0, 200)}»`)
    f.ok(!CODIGO_ANH.test(texto) && !/choke/i.test(texto), 'producción no ve códigos de la ANH ni «choke»')
    // Con el teclado: el mismo botón la cierra con Enter.
    await boton.focus()
    await f.page.keyboard.press('Enter')
    f.ok(await boton.getAttribute('aria-expanded') === 'false' && !(await caja.isVisible()), 'Enter lo vuelve a cerrar')
  })

  await test.step('Septiembre: el pozo se abre hasta la parte de cada electrosumergible', async () => {
    await f.ir('#/prod/diferidos/ceiba/cerrado')
    await f.esperarTexto('Por tramo')
    const fila = f.page.locator('[data-por-tramo] [data-tramo-fila="pozo"]')
    const tramo = Number(await fila.locator('[data-tramo="pozo"]').getAttribute('data-bbl'))
    await fila.locator(':scope > div > button[aria-expanded]').click()
    const rs = await ramas(f.page, '[data-por-tramo] [data-ramas="pozo"]') ?? []
    const suma = rs.reduce((a, r) => a + r.bbl, 0)
    const n1 = rs[0]?.hijos ?? []
    f.ok(cerca(suma, tramo) && sinCuadre(rs).length === 0, `las ramas del pozo suman el tramo (${suma.toFixed(1)} = ${tramo.toFixed(1)} bbl) y cada una las suyas`)
    f.ok(n1.length >= 2 && n1.every((x, i) => i === 0 || x.bbl <= n1[i - 1]!.bbl || x.valor === 'falta'), `las causas van de más a menos barriles (${n1.map(x => `${x.valor} ${x.bbl.toFixed(0)}`).join(', ')})`)
    const texto = (await f.page.locator('[data-por-tramo] [data-ramas="pozo"]').innerText()).replace(/\s+/g, ' ')
    f.ok(texto.includes('No planeada - Mecánica subsuelo') && texto.includes('Falla ESP') && texto.includes('LC-11 · electrosumergible · parte: Aislamiento del motor y del cable'),
      'la causa mayor, su detalle y cada electrosumergible con su parte')
    f.ok(/Falta el detalle/.test(texto), 'lo que falta va en su rama, «Falta el detalle», sin repartirse')
  })

  await test.step('En el papel, todos los tramos salen desplegados', async () => {
    await f.page.emulateMedia({ media: 'print' })
    const abiertos = await f.page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-por-tramo] [data-ramas]')].map(e => [e.dataset.ramas, e.offsetParent !== null] as const))
    f.ok(abiertos.length >= 2 && abiertos.every(([, v]) => v), `cada tramo con barriles sale con sus ramas (${abiertos.map(([k]) => k).join(', ')})`)
    const papel = await f.textoPagina()
    f.ok(papel.includes('Falla rodamiento/cojinete (bearing box)') && papel.includes('parte: Rodamientos'), 'también la planta, que en la pantalla estaba cerrada')
    await f.page.emulateMedia({ media: 'screen' })
  })
  f.cerrar()
})

/** B-13: cada campo dice en dos renglones dónde se trabó; lo demás va plegado en «Ver más de {campo}». Lo abre todo. */
const abrirVerMas = async (page: Page) => {
  const boton = page.getByRole('button', { name: /^Ver más de / })
  for (let i = 0; i < 10 && await boton.count(); i++) await boton.first().click()
}

test('el gerente ve lo no planeado de cada tramo, con la cifra de la barra y sin códigos ni «choke»', async ({ flujo: f }) => {
  // C5: el Resumen del gerente se fundió en Resultados («Por campo» trae el «dónde se trabó» de cada campo).
  await f.abrir('/#/ger/resultados/ceiba~portafolio/cerrado')
  await f.esperarTexto('dónde se trabó')
  // Dos renglones por campo: la barra con la parte de cada tramo y la frase; lo demás, plegado (B-13).
  const frases = await f.page.locator('main [data-frase-gerente]').allInnerTexts()
  f.ok(frases.length === 5 && frases.every(x => /^(Se trabó|Nada se trabó)/.test(x.trim())), `una frase por campo, que empieza por «Se trabó…» (${frases[0]})`)
  await expect(f.page.locator('main [data-ver-mas]').first()).toBeHidden()
  await abrirVerMas(f.page)
  await f.esperarTexto('lo no planeado de cada tramo')
  const bloques = await f.page.evaluate(() => [...document.querySelectorAll('main [data-donde-se-trabo]')].map(b => ({
    campo: b.getAttribute('data-donde-se-trabo') ?? '',
    barra: Object.fromEntries([...b.querySelectorAll('[data-barra-tramos] [data-tramo]')].map(s => [s.getAttribute('data-tramo') ?? '', Number(s.getAttribute('data-bbl'))])),
    tramos: [...b.querySelectorAll('[data-tramo-no-planeado]')].map(e => ({ k: e.getAttribute('data-tramo-no-planeado') ?? '', bbl: Number(e.getAttribute('data-bbl')),
      np: Number(e.getAttribute('data-no-planeada')), texto: (e as HTMLElement).innerText.replace(/\s+/g, ' ') })),
  })))
  f.ok(bloques.length === 5, `un «dónde se trabó» por campo (${bloques.map(b => b.campo).join(', ')})`)
  for (const b of bloques.filter(x => Object.keys(x.barra).length)) {
    const conBarriles = Object.entries(b.barra).filter(([, v]) => v >= 0.5).map(([k]) => k).sort()
    f.ok(b.tramos.map(t => t.k).sort().join() === conBarriles.join() && b.tramos.every(t => cerca(t.bbl, b.barra[t.k] ?? NaN)),
      `${b.campo}: cada tramo de la barra con lo no planeado, con la misma cifra (${b.tramos.map(t => `${t.k} ${t.bbl.toFixed(0)}`).join(', ')})`)
    f.ok(b.tramos.every(t => t.np <= t.bbl + 1e-9 && (t.np < 0.5 ? /sin saber si fue planeado|nada no planeado/.test(t.texto)
      : t.texto.includes(`no planeado`) && t.texto.includes(`(${t.np / t.bbl < 0.01 ? '< 1' : Math.round(t.np / t.bbl * 100)} %)`))),
      `${b.campo}: lo no planeado en bbl y en su parte del tramo («${b.tramos[0]?.texto}»)`)
  }
  const ceiba = bloques.find(b => b.campo === 'ceiba')?.tramos.find(t => t.k === 'pozo')
  f.ok(!!ceiba && cerca(ceiba.np, ceiba.bbl) && /no planeado [\d.]+ \(100 %\)/.test(ceiba.texto) && ceiba.texto.includes('LC-11'),
    `septiembre: lo que se trabó en los pozos de La Ceiba fue todo no planeado, con sus equipos («${ceiba?.texto}»)`)
  const todo = await todoElTexto(f.page)
  f.ok(!CODIGO_ANH.test(todo) && !/choke/i.test(todo), `sin códigos de la ANH ni «choke» en la pantalla${todo.match(CODIGO_ANH)?.[0] ? ` (${todo.match(CODIGO_ANH)?.[0]})` : ''}`)
  f.ok(!/(?:^|\s)(?:N1|N2)(?:\s|$)/.test(todo) && !/Falla ESP|Parada estación/.test(todo), 'ni causas ni detalles de la ANH: solo el tramo, planeado o no y los equipos')
  await f.page.emulateMedia({ media: 'print' })
  const papel = await f.textoPagina()
  f.ok(!CODIGO_ANH.test(papel) && !/choke/i.test(papel) && papel.includes('lo no planeado de cada tramo'), 'tampoco en el papel, donde también sale lo no planeado')
  await f.page.emulateMedia({ media: 'screen' })

  await test.step('Octubre en Resultados: lo sin identificar no se cuenta como planeado ni como no planeado', async () => {
    await f.ir('#/ger/resultados/ceiba/curso')
    await f.esperarTexto('dónde se trabó')
    await abrirVerMas(f.page)
    await f.esperarTexto('lo no planeado de cada tramo')
    const sin = await f.page.locator('[data-tramo-no-planeado="sin-asignar"]').first()
    f.ok(Number(await sin.getAttribute('data-no-planeada')) === 0 && /sin saber si fue planeado/.test(await sin.innerText()),
      `lo sin identificar dice «sin saber si fue planeado» («${(await sin.innerText()).replace(/\s+/g, ' ')}»)`)
    const todoD = await todoElTexto(f.page)
    f.ok(!CODIGO_ANH.test(todoD) && !/choke/i.test(todoD), 'Resultados del gerente: sin códigos ni «choke»')
  })
  f.cerrar()
})

test('regulatorio ve el árbol en el orden de la circular, con la cadena de cada paso y el cuadre con el libro', async ({ flujo: f }) => {
  await f.abrir('/#/reg/regulatorio/ceiba/cerrado')
  await f.esperarTexto('Árbol de causas · como la circular')
  f.ok((await f.hash()).startsWith('#/reg/regulatorio/ceiba'), `cumplimiento regulatorio entra a su pantalla (${await f.hash()})`)
  const caja = f.page.locator('[data-arbol-circular]')
  const raiz = Number(await caja.getAttribute('data-bbl'))
  const libro = Number(await f.page.locator('[data-cuadre-libro]').getAttribute('data-cuadre-libro'))
  const rs = await ramas(f.page, '[data-arbol-circular]') ?? []
  f.ok(raiz > 0 && cerca(raiz, libro) && cerca(rs.reduce((a, r) => a + r.bbl, 0), raiz), `la raíz es el diferido del libro y sus ramas la suman (${raiz.toFixed(1)} = ${libro.toFixed(1)} bbl)`)
  f.ok(sinCuadre(rs).length === 0, `cada paso suma lo que cuelga de él${sinCuadre(rs).length ? `: ${sinCuadre(rs).join(', ')}` : ''}`)
  f.ok(camino(rs).join(' → ') === 'responsable → tramo → impacto → planeacion → n1 → n2', `el orden de la circular: ${camino(rs).join(' → ')}`)
  // F2 · P-reg-1: los códigos ANH van detrás de «Ver los códigos ANH» (en el papel, siempre): se abren y se leen.
  await f.page.locator('[data-ver-codigos]').click()
  await expect(caja).toHaveAttribute('data-codigos', 'vista')
  const texto = (await caja.innerText()).replace(/\s+/g, ' ')
  const cadenas = ['resp_par Operador-Mantenimiento', 'choke_mod POZO', 'choke_mod PLANTA', 'dif_perd DIFERIDA', 'pla_no_plan NO PLANEADA', 'cau_niv1 NP_SUB', 'cau_niv2 Falla ESP']
  f.ok(cadenas.every(x => texto.includes(x)), `cada paso con la cadena que viaja a la ANH${cadenas.filter(x => !texto.includes(x)).map(x => `; falta «${x}»`).join('')}`)
  // T-10: los pasos sin numerar (los números son de las prioridades); el orden lo da la lista.
  const orden = (await f.page.locator('[data-arbol-circular] ol[aria-label="El orden de la circular"] li').allInnerTexts()).map(x => x.replace(/^→\s*/, '').trim())
  f.ok(orden.length === 6 && orden[0]!.startsWith('Quién') && orden[0]!.includes('(resp_par)') && orden[5]!.includes('(cau_niv2)') && !/^\d/.test(orden[0]!),
    `arriba, el orden de los seis pasos con su campo de paradas_pozo (${orden.join(' → ')})`)
  const perdidas = todas(rs).filter(r => r.nodo === 'impacto' && r.valor === 'perdida')
  const tramos = todas(rs).filter(r => r.nodo === 'tramo')
  f.ok(perdidas.length === tramos.length && perdidas.every(p => p.bbl === 0) && texto.includes('Pérdida: TRIM todavía no tiene registro de pérdidas'),
    `la rama de la pérdida está en cada tramo (${perdidas.length}), vacía y diciendo por qué`)
  const prodml = await f.page.evaluate(() => {
    const arbol = document.querySelector('[data-arbol-circular]')
    const panel = [...document.querySelectorAll('main h2')].find(h => h.textContent?.trim() === 'También en PRODML')
    return !!arbol && !!panel && !!(arbol.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING)
  })
  f.ok(prodml, 'el árbol va primero; las casillas de PRODML, debajo, como «también en PRODML»')
  // Un paso se cierra y se abre con su botón.
  const primero = caja.locator('button[aria-expanded]').first()
  await primero.click()
  const cerrada = (await ramas(f.page, '[data-arbol-circular]'))?.[0]
  f.ok(await primero.getAttribute('aria-expanded') === 'false' && !!cerrada && plegado(cerrada).length > 0 && plegado(cerrada).every(h => !h.visible),
    'un toque cierra el paso y lo que cuelga de él deja de verse')
  await primero.click()
  f.ok(await primero.getAttribute('aria-expanded') === 'true', 'y otro lo vuelve a abrir')
  f.cerrar()
})

test.describe('teléfono', () => {
  test.use({ viewport: { width: 390, height: 860 }, isMobile: true, hasTouch: true })

  test('390 px: el árbol abierto no se sale ni se pisa', async ({ flujo: f }) => {
    const hallazgos: string[] = []
    const revisar = async (donde: string) => {
      for (const h of await f.page.evaluate(detectar)) hallazgos.push(`${donde}: [${h[0]}] ${h[1]}${h[3] ? ` ⟶ ${h[3]}` : ''} (${h[2]})`)
      const ancho = await f.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      if (ancho > 1) hallazgos.push(`${donde}: la página se desplaza de lado ${ancho} px`)
    }
    let primero = true
    for (const [ruta, abrir] of [
      // K1 · P-16: el árbol de cada tramo vive en Diferidos («Por tramo»), no en la tubería de antes.
      ['#/prod/diferidos/ceiba/cerrado', '[data-por-tramo] [data-tramo-fila="pozo"] button'],
      ['#/prod/diferidos/ceiba/curso', '[data-por-tramo] [data-tramo-fila="planta"] button'],
      ['#/conf/diferidos/morichal/cerrado', '[data-tramo-fila="planta"] button'],
      ['#/ger/resultados/ceiba~portafolio/cerrado', ''],
      ['#/reg/regulatorio/ceiba/curso', ''],
      ['#/reg/regulatorio/morichal/cerrado', ''],
    ] as const) {
      if (primero) await f.abrir(`/${ruta}`); else await f.ir(ruta)
      primero = false
      if (abrir) {
        const b = f.page.locator(abrir).first()
        f.ok(await b.count() === 1, `${ruta}: está el tramo para abrir`)
        await b.click()
        await f.esperar(250)
      }
      await revisar(`${ruta}${abrir ? ' [abierto]' : ''}`)
    }
    expect.soft(hallazgos, 'nada se sale, se recorta ni se pisa a 390 px').toEqual([])
    f.cerrar()
  })
})
