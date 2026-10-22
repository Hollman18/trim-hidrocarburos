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
    await test.step(`Resumen del portafolio · ${periodo}`, async () => {
      const ruta = `#/ger/resumen/ceiba~portafolio/${periodo}`
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
      f.ok(t.includes('PÉRDIDA') && t.includes('lo que salió y no se vendió'), `${periodo}: la pérdida va aparte`)
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

  await test.step('La misma cifra en Diferidos (U2 §0, principio 6)', async () => {
    const enResumen = (await bloques(f.page)).find(b => b.campo === 'ceiba')?.total ?? NaN
    await f.ir('#/ger/diferidos/ceiba/curso')
    await f.esperarTexto('DÓNDE SE TRABÓ')
    const t = await f.texto()
    const encabezado = num(t.match(/([\d.]+)\s*\n\s*barriles diferidos/)?.[1] ?? 'NaN')
    const enDiferidos = (await bloques(f.page)).find(b => b.campo === 'ceiba')?.total ?? NaN
    f.ok(Math.abs(enDiferidos - enResumen) < 1e-6 && Math.abs(Math.round(enDiferidos) - encabezado) <= 1,
      `La Ceiba, octubre: ${Math.round(enResumen)} bbl en el Resumen, ${Math.round(enDiferidos)} en «Dónde se trabó» de Diferidos y ${encabezado} arriba`)
    f.ok(await f.clic('Por dónde se trabó'), 'Diferidos del gerente: el mes a mes se puede ver por dónde se trabó')
    const todo = await todoElTexto(f.page)
    f.ok(!CODIGO_ANH.test(todo) && !/choke/i.test(todo), 'Diferidos del gerente: sin códigos ni «choke»')
  })

  await test.step('Antes → con TRIM por tramo y el mes a mes por tramo (U2 §7.3 y §7.4)', async () => {
    await f.ir('#/ger/resumen/ceiba/curso')
    await f.esperarTexto('DÓNDE SE TRABÓ')
    const t = await f.texto()
    f.ok(/Por dónde se trabó · lo no planeado por día/.test(t) && /[↑↓]/.test(t), 'el antes → con TRIM se abre por tramo, con sus flechas')
    f.ok(await f.clic('Por dónde se trabó'), 'el mes a mes del gerente cambia a «Por dónde se trabó»')
    const svg = await f.page.evaluate(() => [...document.querySelectorAll('main svg[role=group]')].some(s => (s.getAttribute('aria-label') ?? '').includes('por dónde se trabó')))
    f.ok(svg, 'y la gráfica dice que está partida por dónde se trabó')
  })
  f.cerrar()
})

test('confiabilidad y jefe: «Si falla hoy» de mayor a menor, y P-201B cuesta lo mismo que en su ficha', async ({ flujo: f }) => {
  /** Las filas de la lista de un campo, en el orden en que se ven (las de «ver más» también están: van al papel). */
  const filas = (campo: string) => f.page.evaluate(c => [...document.querySelectorAll(`main [data-si-falla="${c}"] [data-fila-critica]`)].map(e => ({
    equipo: e.getAttribute('data-fila-critica') ?? '', bpd: e.getAttribute('data-bpd') ?? '', costo: e.getAttribute('data-costo') ?? '', texto: (e as HTMLElement).innerText,
  })), campo)
  const ordenada = (xs: Array<{ bpd: string }>) => {
    const v = xs.map(x => (x.bpd === '' ? -1 : Number(x.bpd)))
    return v.every((x, i) => i === 0 || x <= v[i - 1]!)
  }
  /** Abre la ficha de P-201B en Bombas y devuelve su texto. */
  const ficha = async (campo: string) => {
    await f.ir(`#/conf/bombas/${campo}/curso`)
    const placa = f.page.locator('article', { hasText: 'P-201B' }).locator('button[aria-label^="Abrir el detalle de"]').first()
    await placa.click()
    await f.esperarTexto('Le ha costado por falla')
    return f.texto()
  }

  await test.step('Confiabilidad · La Ceiba (P-201B parada)', async () => {
    await f.abrir('/#/conf/riesgo/ceiba/curso')
    await f.esperarTexto('SI FALLA HOY')
    const xs = await filas('ceiba')
    f.ok(xs.length >= 20, `la lista trae todos los equipos del campo (${xs.length})`)
    f.ok(ordenada(xs), 'de mayor a menor por lo que el campo deja de sacar por día')
    f.ok(['K-101', 'SE-2', 'P-201A', 'P-201C', 'LC-11'].every(e => xs.some(x => x.equipo === e)), 'con servicios, bombas y pozos')
    f.ok(!xs.some(x => x.equipo === 'P-201B'), 'P-201B, que ya está parada, no entra en la lista: va arriba, aparte')
    const t = await f.texto()
    f.ok(t.includes('modelo choke') && /Cambió hoy: P-201A y P-201C subieron al puesto \d+/.test(t), 'confiabilidad ve «modelo choke» y la línea «Cambió hoy»')
    f.ok(t.includes('¿Dónde va el próximo instrumento?'), 'y lo que decide: dónde va el próximo instrumento (U2 §6.4)')
    // El puesto que dice «Cambió hoy» es el de la fila.
    const puesto = t.match(/subieron al puesto (\d+)/)?.[1]
    const fila = xs.find(x => x.equipo === 'P-201A')
    f.ok(!!fila && !!puesto && fila.texto.trim().startsWith(puesto), `P-201A está en el puesto que dice «Cambió hoy» (${puesto})`)
    const parada = await f.page.evaluate(() => {
      const p = document.querySelector('main [data-parado="P-201B"]')
      return { perdiendo: Number(p?.getAttribute('data-perdiendo')), texto: (p as HTMLElement | null)?.innerText ?? '' }
    })
    const enLista = Math.round(parada.perdiendo).toLocaleString('es-CO')
    f.ok(parada.texto.includes(`${enLista} bbl/d`), `el renglón de P-201B dice lo que se pierde ahora: ${enLista} bbl/d`)
    const tf = await ficha('ceiba')
    const enFicha = tf.match(/Perdiéndose ahora[\s\S]{0,20}?([\d.]+) bbl\/d/)?.[1]
    f.ok(enFicha === enLista, `la ficha de P-201B dice lo mismo (${enFicha} y ${enLista} bbl/d)`)
  })

  await test.step('Confiabilidad · Morichal Norte (P-201B en marcha)', async () => {
    await f.ir('#/conf/riesgo/morichal/curso')
    await f.esperarTexto('SI FALLA HOY')
    const xs = await filas('morichal')
    f.ok(ordenada(xs), 'Morichal: de mayor a menor')
    const p = xs.find(x => x.equipo === 'P-201B')
    const bpd = p ? Math.round(Number(p.bpd)).toLocaleString('es-CO') : '?'
    const costo = p && p.costo !== '' ? Math.round(Number(p.costo)).toLocaleString('es-CO') : '?'
    f.ok(!!p && p.texto.includes(`${bpd} bbl/d`) && p.texto.includes(`≈ ${costo} bbl`), `la fila de P-201B: ${bpd} bbl/d si falla hoy, una falla ≈ ${costo} bbl`)
    // La misma cifra de «En riesgo», en la misma pantalla.
    const t = await f.texto()
    const enRiesgo = t.slice(t.indexOf('EN RIESGO'), t.indexOf('SI FALLA HOY'))
    const deEnRiesgo = enRiesgo.match(/P-201B[\s\S]*?≈ ([\d.]+) bbl si falla hoy/)?.[1]
    f.ok(deEnRiesgo === costo, `«En riesgo» dice lo mismo de una falla de P-201B (${deEnRiesgo} y ${costo} bbl)`)
    f.ok(/P-201B[\s\S]{0,200}?se trabaría en la planta/.test(enRiesgo), '«En riesgo» dice dónde se trabaría')
    const colchonFila = p?.texto.match(/(\d+(?:,\d)?) h/)?.[1]
    const tf = await ficha('morichal')
    const m = tf.match(/Si se para ahora[\s\S]{0,10}?([\d.]+) bbl\/d[\s\S]{0,10}?tras ([\d,]+) h de colchón/)
    f.ok(m?.[1] === bpd, `la ficha de P-201B dice lo mismo si se para ahora (${m?.[1]} y ${bpd} bbl/d)`)
    f.ok(m?.[2] === colchonFila, `y el mismo colchón (${m?.[2]} h y ${colchonFila} h)`)
  })

  await test.step('Jefe de mantenimiento · La Ceiba', async () => {
    await f.ir('#/jefe/riesgo/ceiba/curso')
    await f.esperarTexto('SI FALLA HOY')
    const xs = await filas('ceiba')
    f.ok(xs.length >= 20 && ordenada(xs), `el jefe ve la misma lista, de mayor a menor (${xs.length})`)
    const t = await f.texto()
    f.ok(/Ojo: P-201A y P-201C valen más/.test(t) && t.includes('no conviene intervenirlas hoy'), 'y lo que decide: no intervenir hoy lo que hoy vale más (U2 §6.4)')
    f.ok(!/choke/i.test(t), 'el jefe no ve «choke»: es rótulo solo de confiabilidad, regulatorio y el administrador')
  })

  await test.step('El gerente no ve la lista (U2 §3.1)', async () => {
    await f.ir('#/ger/riesgo/ceiba/curso')
    await f.esperarTexto('EN RIESGO')
    const t = await f.texto()
    f.ok(!t.includes('SI FALLA HOY') && !/choke/i.test(t), 'en el Riesgo del gerente no está «Si falla hoy» ni «choke»')
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
      ['#/ger/resumen/ceiba~portafolio/curso', 'Por dónde se trabó'],
      ['#/ger/resumen/ceiba/cerrado', ''],
      ['#/ger/diferidos/ceiba~portafolio/curso', 'Por dónde se trabó'],
      ['#/conf/riesgo/ceiba/curso', 'ver «Si falla hoy»'],
      ['#/jefe/riesgo/ceiba~portafolio/curso', ''],
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
