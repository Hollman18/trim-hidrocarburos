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

  await test.step('La misma cifra en Resultados de un campo (U2 §0, principio 6)', async () => {
    const enPortafolio = (await bloques(f.page)).find(b => b.campo === 'ceiba')?.total ?? NaN
    await f.ir('#/ger/resultados/ceiba/curso')
    await f.esperarTexto('Dónde se trabó')
    const t = await f.texto()
    const cifra = num(t.match(/([\d.]+)\s*\n\s*barriles\s*\n/)?.[1] ?? 'NaN')
    const enCampo = (await bloques(f.page)).find(b => b.campo === 'ceiba')?.total ?? NaN
    f.ok(Math.abs(enCampo - enPortafolio) < 1e-6 && Math.abs(Math.round(enCampo) - cifra) <= 1,
      `La Ceiba, octubre: ${Math.round(enPortafolio)} bbl en «Por campo», ${Math.round(enCampo)} en «Dónde se trabó» y ${cifra} en la cifra grande`)
    f.ok(await f.clic('Por dónde se trabó'), 'Resultados del gerente: el mes a mes se puede ver por dónde se trabó')
    const todo = await todoElTexto(f.page)
    f.ok(!CODIGO_ANH.test(todo) && !/choke/i.test(todo), 'Resultados del gerente: sin códigos ni «choke»')
  })

  await test.step('Antes → con TRIM por tramo y el mes a mes por tramo (U2 §7.3 y §7.4)', async () => {
    await f.ir('#/ger/resultados/ceiba/curso')
    await f.esperarTexto('Dónde se trabó')
    const t = await f.texto()
    f.ok(/¿Está bajando\? Desde que entró TRIM/.test(t) && /Lo no planeado por día/.test(t) && /baja \d+ %/.test(t) && /sube \d+ %/.test(t), 'el antes → con TRIM se abre por tramo, con las dos flechas: la que baja y la que sube')
    f.ok(await f.clic('Por dónde se trabó'), 'el mes a mes del gerente cambia a «Por dónde se trabó»')
    const svg = await f.page.evaluate(() => [...document.querySelectorAll('main svg[role=group]')].some(s => (s.getAttribute('aria-label') ?? '').includes('por dónde se trabó')))
    f.ok(svg, 'y la gráfica dice que está partida por dónde se trabó')
  })
  f.cerrar()
})

// K1 · P-10: el Riesgo de confiabilidad y del jefe se fundió en su Equipos (debajo de la lista); sus direcciones abren ahí.
test('confiabilidad y jefe: «Si falla hoy» de mayor a menor, y P-201B cuesta lo mismo que en su ficha', async ({ flujo: f }) => {
  /** Las filas de la lista de un campo, en el orden en que se ven (las de «ver más» también están: van al papel). */
  const filas = (campo: string) => f.page.evaluate(c => [...document.querySelectorAll(`main [data-si-falla="${c}"] [data-fila-critica]`)].map(e => ({
    equipo: e.getAttribute('data-fila-critica') ?? '', grupo: e.getAttribute('data-grupo') ?? '', bpd: e.getAttribute('data-bpd') ?? '', costo: e.getAttribute('data-costo') ?? '', texto: (e as HTMLElement).innerText,
    puesto: e.getAttribute('data-puesto') ?? '',
  })), campo)
  /** D6 (B-06): tres grupos en su orden (lo medido, con puesto; los techos; lo que no tiene dato) y,
   *  dentro de cada uno, de mayor a menor. Un techo no se compara con una cifra medida. */
  const GRUPOS = ['medido', 'techo', 'sin-dato']
  const ordenada = (xs: Array<{ bpd: string; grupo: string }>) => {
    const g = xs.map(x => GRUPOS.indexOf(x.grupo))
    if (g.some(i => i < 0) || !g.every((x, i) => i === 0 || x >= g[i - 1]!)) return false
    return GRUPOS.every(k => {
      const v = xs.filter(x => x.grupo === k).map(x => (x.bpd === '' ? -1 : Number(x.bpd)))
      return v.every((x, i) => i === 0 || x <= v[i - 1]!)
    })
  }
  /** Abre P-201B desde su placa en Bombas y devuelve el texto de su nivel 3 (C4: la ficha técnica es una vista). */
  const ficha = async (campo: string) => {
    await f.ir(`#/conf/bombas/${campo}/curso`)
    const placa = f.page.locator('article', { hasText: 'P-201B' }).locator('button[aria-label^="Abrir el detalle de"]').first()
    await placa.click()
    const n3 = f.page.locator('main [data-nivel3="P-201B"]')
    await n3.waitFor()
    await f.esperarTexto('Su historia')
    return n3.innerText()
  }

  await test.step('Confiabilidad · La Ceiba (P-201B parada)', async () => {
    await f.abrir('/#/conf/riesgo/ceiba/curso')
    await f.esperarTexto('Si falla hoy')
    f.ok((await f.hash()).startsWith('#/conf/equipos/ceiba'), `la dirección del Riesgo de confiabilidad abre su Equipos (${await f.hash()})`)
    const xs = await filas('ceiba')
    f.ok(xs.length >= 20, `la lista trae todos los equipos del campo (${xs.length})`)
    f.ok(ordenada(xs), 'en tres grupos (lo medido, los techos, sin dato) y, en cada uno, de mayor a menor por lo que el campo deja de sacar por día')
    f.ok(['K-101', 'SE-2', 'P-201A', 'P-201C', 'LC-11'].every(e => xs.some(x => x.equipo === e)), 'con servicios, bombas y pozos')
    // D6: los servicios sin cifra propia van en el grupo de los techos («hasta …»), sin puesto; LACT-01 sin dato.
    f.ok(['K-101', 'SE-2'].every(e => xs.find(x => x.equipo === e)?.grupo === 'techo') && xs.find(x => x.equipo === 'LACT-01')?.grupo === 'sin-dato'
      && xs.filter(x => x.grupo === 'techo').every(x => /hasta\s*[\d.]+\s*bbl\/d/.test(x.texto)), 'los techos dicen «hasta …» y van aparte de lo medido')
    f.ok(!xs.some(x => x.equipo === 'P-201B'), 'P-201B, que ya está parada, no entra en la lista: va arriba, aparte')
    const t = await f.texto()
    // T-11 (F2): «modelo choke» ya no es un rótulo: es la ⓘ pegada al título «Si falla hoy», solo de confiabilidad.
    f.ok(await f.page.locator('#si-falla-hoy-titulo').getByRole('img', { name: /^Modelo choke:/ }).count() === 1 && !/modelo choke/i.test(t),
      'confiabilidad ve la ⓘ del modelo choke, sin el rótulo a la vista')
    // F3 · P-02 y K1 · P-10: lo que decía «Cambió hoy» (P-201A y P-201C subieron al primer puesto porque P-201B está
    // parada, y no tienen instrumento) y dónde va el próximo instrumento los dice la cabeza de su Equipos y cada fila.
    const frase = await f.page.locator('main [data-primero] [data-frase]').innerText()
    f.ok(/Ataque primero P-201A y P-201C: hoy valen más y TRIM no las vigila\. Ahí va el próximo instrumento\./.test(frase),
      `y lo que decide, arriba: lo que cambió hoy y dónde va el próximo instrumento (U2 §6.4): «${frase}»`)
    f.ok(await f.page.locator('main [data-cambio-hoy]').count() === 0, 'sin la línea «Cambió hoy» repetida')
    // Subieron al primer puesto: P-201A va primera en «Si falla hoy» (T-10: el puesto, en data-puesto) y su fila lo dice.
    const fila = xs.find(x => x.equipo === 'P-201A')
    f.ok(!!fila && fila.puesto === '1' && xs[0]?.equipo === 'P-201A', `P-201A está en el primer puesto (${fila?.puesto})`)
    await expect(f.page.locator('main [data-fila-equipo="P-201A"]')).toContainText('sube porque P-201B está parada')
    const parada = await f.page.evaluate(() => {
      const p = document.querySelector('main [data-parado="P-201B"]')
      return { perdiendo: Number(p?.getAttribute('data-perdiendo')), texto: (p as HTMLElement | null)?.innerText ?? '' }
    })
    const enLista = Math.round(parada.perdiendo).toLocaleString('es-CO')
    f.ok(parada.texto.includes(`${enLista} bbl/d`), `el renglón de P-201B dice lo que se pierde ahora: ${enLista} bbl/d`)
    await ficha('ceiba')
    const enFicha = (await f.page.locator('main [data-heroe-equipo] [data-cifra]').innerText()).trim()
    f.ok(enFicha === enLista, `el nivel 3 de P-201B dice lo mismo (${enFicha} y ${enLista} bbl/d)`)
  })

  await test.step('Confiabilidad · Morichal Norte (P-201B en marcha)', async () => {
    await f.ir('#/conf/riesgo/morichal/curso')
    await f.esperarTexto('Si falla hoy')
    f.ok((await f.hash()).startsWith('#/conf/equipos/morichal'), `abre Equipos de Morichal (${await f.hash()})`)
    f.ok((await f.texto()).includes('¿Dónde va el próximo instrumento?'), 'donde la frase del primero no lo dice, «¿Dónde va el próximo instrumento?» va arriba de Equipos')
    const xs = await filas('morichal')
    f.ok(ordenada(xs), 'Morichal: de mayor a menor')
    const p = xs.find(x => x.equipo === 'P-201B')
    const bpd = p ? Math.round(Number(p.bpd)).toLocaleString('es-CO') : '?'
    const costo = p && p.costo !== '' ? Math.round(Number(p.costo)).toLocaleString('es-CO') : '?'
    f.ok(!!p && p.texto.includes(`${bpd} bbl/d`) && p.texto.includes(`≈ ${costo} bbl`), `la fila de P-201B: ${bpd} bbl/d si falla hoy, una falla ≈ ${costo} bbl`)
    // La misma cifra de «En riesgo», en la misma vista: el panel «Equipos que avisan» de «Qué está en riesgo».
    // D-2 (G-16): el costo de una falla, en bbl, se llama «le costaría la falla».
    const enRiesgo = await f.page.locator('main [data-riesgo] section', { has: f.page.getByRole('heading', { name: 'Equipos que avisan', exact: true }) }).innerText()
    const deEnRiesgo = enRiesgo.match(/P-201B[\s\S]*?≈ ([\d.]+) bbl le costaría la falla/)?.[1]
    f.ok(deEnRiesgo === costo, `«Equipos que avisan» dice lo mismo de una falla de P-201B (${deEnRiesgo} y ${costo} bbl)`)
    f.ok(/P-201B[\s\S]{0,200}?se trabaría en la planta/.test(enRiesgo), '«Equipos que avisan» dice dónde se trabaría')
    const colchonFila = p?.texto.match(/(\d+(?:,\d)?) h/)?.[1]
    const tf = await ficha('morichal')
    const m = tf.match(/Si falla hoy:\s*([\d.]+) bbl\/d después de ([\d,]+) h de colchón/)
    const o = tf.match(/deja de producir ([\d.]+) bbl\/d en este orden/)
    f.ok(m?.[1] === bpd && o?.[1] === bpd, `el nivel 3 de P-201B dice lo mismo si falla hoy y si se para ahora (${m?.[1]}, ${o?.[1]} y ${bpd} bbl/d)`)
    f.ok(m?.[2] === colchonFila, `y el mismo colchón (${m?.[2]} h y ${colchonFila} h)`)
  })

  await test.step('Jefe de mantenimiento · La Ceiba', async () => {
    await f.ir('#/jefe/riesgo/ceiba/curso')
    await f.esperarTexto('Si falla hoy')
    f.ok((await f.hash()).startsWith('#/jefe/equipos/ceiba'), `la dirección del Riesgo del jefe abre su Equipos (${await f.hash()})`)
    const xs = await filas('ceiba')
    f.ok(xs.length >= 20 && ordenada(xs), `el jefe ve la misma lista, de mayor a menor (${xs.length})`)
    const t = await f.texto()
    f.ok(/Ojo: P-201A y P-201C valen más/.test(t) && t.includes('no conviene intervenirlas hoy'), 'y lo que decide: no intervenir hoy lo que hoy vale más (U2 §6.4)')
    f.ok(await f.page.locator('main [data-decide="jefe"]').count() === 1, 'lo dice una vez, arriba de la lista (no se repite en «Si falla hoy»)')
    f.ok(!/choke/i.test(t), 'el jefe no ve «choke»: es rótulo solo de confiabilidad, regulatorio y el administrador')
  })

  await test.step('El gerente no ve la lista (U2 §3.1)', async () => {
    // C5: su Riesgo se fundió en La planta viva (Durante y Antes) y Equipos (X4 §3.6, punto 2).
    await f.ir('#/ger/riesgo/ceiba/curso')
    await f.esperarTexto('se dejan de producir en La Ceiba.')
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
      ['#/ger/resultados/ceiba~portafolio/curso', 'Por dónde se trabó'],
      ['#/ger/resultados/ceiba/cerrado', 'Por dónde se trabó'],
      // K1 · P-10: Riesgo de confiabilidad y del jefe vive en su Equipos, debajo de la lista.
      ['#/conf/equipos/ceiba', 'ver «Si falla hoy»'],
      ['#/jefe/equipos/ceiba~portafolio', ''],
      ['#/prod/diferidos/ceiba~portafolio/curso', 'Por dónde se trabó'],
      ['#/conf/diferidos/morichal/curso', 'Cada tramo por qué no se produjo'],
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
