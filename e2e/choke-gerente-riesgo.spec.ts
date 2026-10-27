/* El modelo choke en las pantallas del gerente, de Riesgo y de Diferidos
   (U2 §3, §6, §7.3 y §7.4; CHOKE-CONSTRUCCION, tanda 3, P2-UI):
   - el gerente ve dónde se trabó cada campo, y la barra suma el diferido del
     libro (la misma cifra de «POR CAMPO» y de Diferidos), sin códigos de la
     ANH (P_, NP_) ni la palabra «choke», en la pantalla ni en el papel;
   - confiabilidad y el jefe ven «Si falla hoy» de mayor a menor, y la bomba
     cuesta lo mismo que en su ficha (y que en «En riesgo»); el gerente no ve
     la lista;
   - en el teléfono (390 px) nada se sale ni se pisa.

   Las cifras exactas se leen de los `data-*` de cada barra y de cada fila:
   la pantalla las redondea y aquí se comprueba la cuenta, no el redondeo. */
import { expect, type Page } from '@playwright/test'
import { test } from './apoyo.ts'
import { detectar } from './auditoria/detector.ts'

/** Un código de la ANH (NP_PROC, P_MANT…): el gerente no los ve nunca. */
const CODIGO_ANH = /\b(?:NP|P)_[A-Z]{2,}/
/** «7.716» → 7716 (miles con punto, decimales con coma). */
const num = (t: string) => Number(t.replace(/\./g, '').replace(',', '.'))

/** Lo que dice cada «dónde se trabó» de la pantalla: el total que lleva, sus segmentos y su texto. */
const bloques = (page: Page) => page.evaluate(() => [...document.querySelectorAll('main [data-donde-se-trabo]')].map(b => ({
  campo: b.getAttribute('data-donde-se-trabo') ?? '',
  total: Number(b.getAttribute('data-total')),
  segmentos: [...b.querySelectorAll('[data-barra-tramos] [data-tramo]')].map(s => ({ tramo: s.getAttribute('data-tramo') ?? '', bbl: Number(s.getAttribute('data-bbl')) })),
  texto: (b as HTMLElement).innerText,
})))

/** El texto de la pantalla más lo que oye el lector (aria-label y title): donde no pueden aparecer códigos ni «choke». */
const todoElTexto = (page: Page) => page.evaluate(() => {
  const m = document.querySelector('main')
  if (!m) return ''
  return [m.innerText, ...[...m.querySelectorAll('[aria-label],[title]')].map(e => `${e.getAttribute('aria-label') ?? ''} ${e.getAttribute('title') ?? ''}`)].join('\n')
})

test('gerente: dónde se trabó cada campo suma el diferido del libro, sin códigos ni «choke»', async ({ flujo: f }) => {
  let primero = true
  for (const periodo of ['cerrado', 'curso'] as const) {
    // C5: el Resumen del gerente se fundió en Resultados («Por campo», con su «dónde se trabó»).
    await test.step(`Resultados del portafolio · ${periodo}`, async () => {
      const ruta = `#/ger/resultados/ceiba~portafolio/${periodo}`
      if (primero) await f.abrir(`/${ruta}`); else await f.ir(ruta)
      primero = false
      await f.esperarTexto('dónde se trabó')
      const bs = await bloques(f.page)
      const campos = bs.map(b => b.campo).sort()
      f.ok(campos.join(',') === 'ceiba,guacamayo,morichal,palmar,zarza', `${periodo}: un «dónde se trabó» por campo (${campos.join(', ')})`)
      // La cifra de la fila del campo en «POR CAMPO» (los barriles diferidos del libro).
      const filas = await f.page.evaluate(() => Object.fromEntries([...document.querySelectorAll('main [data-bbl-campo]')]
        .map(e => [e.getAttribute('data-bbl-campo'), (e.textContent ?? '').match(/^[\d.]+/)?.[0] ?? ''])))
      for (const b of bs) {
        const suma = b.segmentos.reduce((a, s) => a + s.bbl, 0)
        f.ok(Math.abs(suma - b.total) < 1e-6 * Math.max(1, b.total), `${periodo} · ${b.campo}: los tramos suman ${suma.toFixed(1)} = ${b.total.toFixed(1)} bbl`)
        const fila = num(filas[b.campo] ?? 'NaN')
        f.ok(Math.abs(Math.round(b.total) - fila) <= 1, `${periodo} · ${b.campo}: la barra suma lo mismo que su fila de POR CAMPO (${Math.round(b.total)} y ${fila})`)
        f.ok(b.segmentos.every(s => s.bbl > 0) && new Set(b.segmentos.map(s => s.tramo)).size === b.segmentos.length, `${periodo} · ${b.campo}: un segmento por tramo con barriles, ninguno vacío`)
        f.ok(b.texto.trim().length > 0 && (b.total < 0.5 ? /Nada se trabó/.test(b.texto) : /%/.test(b.texto)), `${periodo} · ${b.campo}: lleva la frase del motor`)
      }
      const t = await f.texto()
      f.ok(t.includes('Pérdida') && t.includes('lo que salió y no se vendió'), `${periodo}: la pérdida va aparte`)
      f.ok(/en los pozos/.test(t) && /en la planta o estación/.test(t) && /sin identificar/.test(t), `${periodo}: la leyenda dice los tramos con palabras de campo`)
      const todo = await todoElTexto(f.page)
      f.ok(!CODIGO_ANH.test(todo), `${periodo}: sin códigos de la ANH en la pantalla${todo.match(CODIGO_ANH)?.[0] ? ` (${todo.match(CODIGO_ANH)?.[0]})` : ''}`)
      f.ok(!/choke/i.test(todo), `${periodo}: sin la palabra «choke» en la pantalla`)
      await f.page.emulateMedia({ media: 'print' })
      const papel = await f.textoPagina()
      f.ok(!CODIGO_ANH.test(papel) && !/choke/i.test(papel), `${periodo}: tampoco en el papel`)
      f.ok(papel.includes('dónde se trabó') && papel.includes('Pérdida:'), `${periodo}: en el papel salen dónde se trabó y el ⓘ de la pérdida`)
      await f.page.emulateMedia({ media: 'screen' })
      if (periodo === 'cerrado') {
        const ceiba = bs.find(b => b.campo === 'ceiba')
        f.ok(!!ceiba && /en los pozos/.test(ceiba.texto) && ceiba.texto.includes('LC-11'), 'septiembre: La Ceiba se trabó sobre todo en los pozos, con LC-11')
      }
    })
  }

  await test.step('La misma cifra en Resultados de un campo (U2 §0, principio 6), por tramo en el balance', async () => {
    const enPortafolio = (await bloques(f.page)).find(b => b.campo === 'ceiba')?.total ?? NaN
    await f.ir('#/ger/resultados/ceiba/curso')
    await f.esperarTexto('Producido · diferido · perdido')
    const t = await f.texto()
    const cifra = num(t.match(/([\d.]+)\s*\n\s*barriles\s*\n/)?.[1] ?? 'NaN')
    // v3: «Dónde se trabó» de un campo es el balance del choke por tramo (el mismo diferido, en enteros que suman).
    const b = f.page.locator('[data-balance]')
    const tramos = await b.locator('[data-tramo-balance]').evaluateAll(es => es.map(e => Number((e.querySelector('td')?.textContent ?? '').replace(/\D/g, ''))))
    const enBalance = Number(await b.getAttribute('data-diferido'))
    f.ok(Math.abs(Math.round(enPortafolio) - enBalance) <= 1 && enBalance === cifra && tramos.reduce((a, x) => a + x, 0) === enBalance,
      `La Ceiba, octubre: ${Math.round(enPortafolio)} bbl en «Por campo», ${enBalance} en el balance (los tramos suman ${tramos.join(' + ')}) y ${cifra} en la cifra grande`)
    const todo = await todoElTexto(f.page)
    f.ok(!CODIGO_ANH.test(todo) && !/choke/i.test(todo), 'Resultados del gerente: sin códigos ni «choke»')
  })

  await test.step('Antes → con TRIM por tramo («¿Está funcionando?», §0d)', async () => {
    await f.ir('#/ger/resultados/ceiba/curso')
    await f.esperarTexto('¿Está funcionando?')
    // Antes de TRIM, este mes y lo ganado; por tramo, a un toque.
    await f.page.locator('[data-funcionando-tramos]').click()
    const filas = await f.page.locator('[data-funcionando-tramo]').evaluateAll(es => es.map(e => e.getAttribute('data-funcionando-tramo')))
    f.ok(filas.includes('planta') && filas.includes('pozo'), `por tramo: ${filas.join(', ')}`)
    const t = await f.texto()
    f.ok(/Antes de TRIM/.test(t) && /Ya se ganó/.test(t) && !/¿Está bajando\?/.test(t), 'el antes, este mes y lo ganado, sin «¿Está bajando?» repetido')
  })
  f.cerrar()
})

// B3 · A-13 y FF-8: «Qué está en riesgo» (con su «Si falla hoy» entero) salió de debajo de la lista; la lista de
// confiabilidad va ordenada por «Si falla hoy» y cada equipo, en su nivel 3, dice lo mismo que su fila.
test('confiabilidad y jefe: «Si falla hoy» de mayor a menor, y P-201B cuesta lo mismo que en su ficha', async ({ flujo: f }) => {
  /** Las filas de la lista, en su orden: el equipo, si es un techo («hasta») y su cifra. */
  const filas = () => f.page.locator('main [data-fila-equipo]').evaluateAll(es => es.map(e => {
    const b = (e.querySelector('[data-cifra-fila] b') as HTMLElement | null)?.innerText ?? ''
    const que = (e.querySelector('[data-cifra-fila] small') as HTMLElement | null)?.innerText ?? ''
    return { equipo: e.getAttribute('data-fila-equipo') ?? '', techo: /hasta/.test(b), siFalla: /si falla hoy/.test(que) && /\d/.test(b), bpd: Number(b.replace(/[^\d]/g, '')) || 0, que, texto: (e as HTMLElement).innerText }
  }))
  /** Lo medido primero, de mayor a menor; después los techos, de mayor a menor (D6). */
  const ordenada = (xs: Array<{ techo: boolean; siFalla: boolean; bpd: number }>) => {
    const medido = xs.filter(x => x.siFalla && !x.techo), techos = xs.filter(x => x.siFalla && x.techo)
    const desc = (v: number[]) => v.every((x, i) => i === 0 || x <= v[i - 1]!)
    const iUltMedido = xs.findLastIndex(x => x.siFalla && !x.techo), iPrimTecho = xs.findIndex(x => x.siFalla && x.techo)
    return desc(medido.map(x => x.bpd)) && desc(techos.map(x => x.bpd)) && (iPrimTecho < 0 || iUltMedido < iPrimTecho)
  }

  await test.step('Confiabilidad · La Ceiba (P-201B parada)', async () => {
    await f.abrir('/#/conf/riesgo/ceiba/curso')
    f.ok((await f.hash()).startsWith('#/conf/equipos/ceiba'), `la dirección del Riesgo de confiabilidad abre su Equipos (${await f.hash()})`)
    const xs = await filas()
    f.ok(xs.length >= 20, `la lista trae todos los equipos del campo (${xs.length})`)
    f.ok(ordenada(xs), 'lo medido y después los techos, cada grupo de mayor a menor por lo que el campo deja de sacar por día')
    f.ok(['K-101', 'SE-2'].every(e => xs.find(x => x.equipo === e)?.techo), 'los servicios sin cifra propia van con «hasta …», después de lo medido')
    f.ok(xs[0]?.equipo === 'P-201A' && xs[0]!.texto.includes('sube porque P-201B está parada'), `P-201A va primera y su fila dice por qué subió (${xs[0]?.equipo})`)
    await expect(f.page.locator('main [data-renglon="si-falla-hoy"]')).toContainText('P-201A y P-201C · sin instrumento')
    f.ok(await f.page.locator('main [data-cambio-hoy], main [data-riesgo]').count() === 0, 'sin «Cambió hoy» ni «Qué está en riesgo» repetidos')
    const p201b = xs.find(x => x.equipo === 'P-201B')!
    const enLista = p201b.bpd.toLocaleString('es-CO')
    await f.ir('#/conf/equipos/ceiba/P-201B')
    await f.page.locator('main [data-nivel3="P-201B"]').waitFor()
    const enFicha = (await f.page.locator('main [data-heroe-equipo] [data-cifra]').innerText()).trim()
    f.ok(enFicha === enLista, `el nivel 3 de P-201B dice lo mismo que su fila (${enFicha} y ${enLista} bbl/d)`)
  })

  await test.step('Confiabilidad · Morichal Norte (P-201B en marcha)', async () => {
    await f.ir('#/conf/riesgo/morichal/curso')
    f.ok((await f.hash()).startsWith('#/conf/equipos/morichal'), `abre Equipos de Morichal (${await f.hash()})`)
    f.ok((await f.texto()).includes('¿Dónde va el próximo instrumento?'), 'donde la frase del primero no lo dice, «¿Dónde va el próximo instrumento?» va arriba de Equipos')
    const xs = await filas()
    f.ok(ordenada(xs), 'Morichal: de mayor a menor')
    const p = xs.find(x => x.equipo === 'P-201B')!
    const bpd = p.bpd.toLocaleString('es-CO')
    const colchonFila = p.que.match(/(\d+(?:,\d)?) h/)?.[1]
    await f.ir('#/conf/equipos/morichal/P-201B')
    await f.esperarTexto('Su historia')
    const tf = await f.page.locator('main [data-nivel3="P-201B"]').innerText()
    const m = tf.match(/Si falla hoy:\s*([\d.]+) bbl\/d después de ([\d,]+) h de colchón/)
    const o = tf.match(/deja de producir ([\d.]+) bbl\/d en este orden/)
    f.ok(m?.[1] === bpd && o?.[1] === bpd, `el nivel 3 de P-201B dice lo mismo si falla hoy y si se para ahora (${m?.[1]}, ${o?.[1]} y ${bpd} bbl/d)`)
    // La lista lo dice truncado («10 h», textoHoras: una reparación de menos de 10 h no cuesta crudo); la ficha, con su decimal.
    f.ok(!!m && !!colchonFila && Math.floor(Number(m[2]!.replace(',', '.'))) === Math.floor(Number(colchonFila.replace(',', '.'))), `y el mismo colchón (${m?.[2]} h y ${colchonFila} h)`)
    // D-2 (G-16): el costo de una falla, en bbl, se llama «le costaría la falla», y dice dónde se trabaría.
    await expect(f.page.locator('main [data-si-falla-ficha="P-201B"]')).toContainText(/≈ [\d.]+ bbl le costaría la falla/)
    await expect(f.page.locator('main [data-si-falla-ficha="P-201B"]')).toContainText('se trabaría en la planta')
  })

  await test.step('Jefe de mantenimiento · La Ceiba', async () => {
    await f.ir('#/jefe/riesgo/ceiba/curso')
    f.ok((await f.hash()).startsWith('#/jefe/equipos/ceiba'), `la dirección del Riesgo del jefe abre su Equipos (${await f.hash()})`)
    const t = await f.texto()
    f.ok(!/choke/i.test(t), 'el jefe no ve «choke»: es rótulo solo de confiabilidad, regulatorio y el administrador')
    await f.ir('#/jefe/hoy/ceiba/curso')
    const hoy = await f.texto()
    f.ok(/Ojo: P-201A y P-201C valen más/.test(hoy) && (hoy.match(/no conviene intervenirlas hoy/g) ?? []).length === 1, 'y lo que decide, una vez, en su Hoy: no intervenir hoy lo que hoy vale más (C-06)')
  })

  await test.step('El gerente no ve la lista (U2 §3.1)', async () => {
    // C5: su Riesgo se fundió en La planta viva (Durante y Antes) y Equipos (X4 §3.6, punto 2).
    await f.ir('#/ger/riesgo/ceiba/curso'); await f.esperar(600)
    const t = await f.texto()
    f.ok((await f.hash()).startsWith('#/ger/planta-viva/') && !t.includes('Si falla hoy') && !/choke/i.test(t), 'la dirección del Riesgo del gerente abre La planta viva, sin «Si falla hoy» ni «choke»')
  })
  f.cerrar()
})

test.describe('teléfono', () => {
  test.use({ viewport: { width: 390, height: 860 }, isMobile: true, hasTouch: true })

  test('390 px: dónde se trabó, «Si falla hoy» y el reparto por tramo no se salen ni se pisan', async ({ flujo: f }) => {
    const hallazgos: string[] = []
    const revisar = async (donde: string) => {
      for (const h of await f.page.evaluate(detectar)) hallazgos.push(`${donde}: [${h[0]}] ${h[1]}${h[3] ? ` ⟶ ${h[3]}` : ''} (${h[2]})`)
      const ancho = await f.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      if (ancho > 1) hallazgos.push(`${donde}: la página se desplaza de lado ${ancho} px`)
    }
    let primero = true
    for (const [ruta, clic] of [
      // v3: el reparto por tramo es el balance del choke; su trazabilidad se abre con un toque en el tramo.
      ['#/ger/resultados/ceiba~portafolio/curso', 'Pozos'],
      ['#/ger/resultados/ceiba/cerrado', 'Pozos'],
      // B3 · FF-8: confiabilidad abre con «Si falla hoy» tipo número y la lista ordenada por él; los filtros, en «Filtrar».
      ['#/conf/equipos/ceiba', 'Filtrar'],
      ['#/jefe/equipos/ceiba~portafolio', ''],
      ['#/prod/resultados/ceiba~portafolio/curso', 'Planta'],
      // A-09: Diferidos salió; el árbol de cada tramo de Morichal se abre desde el balance de Resultados.
      ['#/ger/resultados/morichal/curso', 'Pozos'],
    ] as const) {
      if (primero) await f.abrir(`/${ruta}`); else await f.ir(ruta)
      primero = false
      await revisar(ruta)
      if (clic) {
        f.ok(await f.clic(clic), `${ruta}: se puede tocar «${clic}»`)
        await f.esperar(300)
        await revisar(`${ruta} [${clic}]`)
      }
    }
    expect.soft(hallazgos, 'nada se sale, se recorta ni se pisa a 390 px').toEqual([])
    f.cerrar()
  })
})
