// De punta a punta: «La tubería del campo» y «La tubería del agua» como las ve
// producción (U2 §2 y §5). Lo que limita va en tinta, nunca en
// rojo; lo perdido por tramo suma lo mismo que el diferido del libro; La Zarza
// muestra el estado de campo de gas; la tubería del agua de La Ceiba trae sus
// tres bombas y el colchón; y en el teléfono nada se sale de la pantalla.
import { test, type Flujo } from './apoyo.ts'

/** «11.360» → 11360 (cifras con punto de miles y coma decimal). */
const num = (t: string) => Number(t.replace(/\./g, '').replace(',', '.'))
/** 11360 → «11.360», como lo escribe la pantalla (sin depender del ICU de Node). */
const miles = (v: number) => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')

/** El color computado de un token del tema, como lo escribe el navegador. */
const colorDe = (f: Flujo, token: string) => f.page.evaluate(t => {
  const i = document.createElement('i')
  i.style.color = `var(${t})`
  document.body.append(i)
  const c = getComputedStyle(i).color
  i.remove()
  return c
}, token)

// K1 · P-16 / H8: Producción y Planta ya no montan la tubería de antes (`choke/Tuberia.tsx`, borrada): montan la de
// La planta viva con la lente técnica (`TuberiaTecnica`). Lo que se probaba de la de antes se prueba donde quedó.
test('La Ceiba: la tubería del campo, lo que limita sin rojo, lo que le sobra y lo perdido por tramo', async ({ flujo: f }) => {
  await f.abrir('/#/prod/produccion/ceiba/curso')
  await f.esperarTexto('La tubería del campo')
  const rojo = await colorDe(f, '--p1'), naranja = await colorDe(f, '--p2'), tinta = await colorDe(f, '--tinta')
  const tecnica = f.page.locator('main [data-tuberia-tecnica]')

  await test.step('Lo que limita: la palabra «◄ limita» en tinta, en su tramo, y ningún rojo', async () => {
    const x = await f.page.evaluate(() => {
      const fila = [...document.querySelectorAll<HTMLElement>('main [data-tuberia-tecnica] [data-capacidad]')].find(e => /◄\s*limita/.test(e.textContent ?? ''))
      const m = fila && [...fila.querySelectorAll<HTMLElement>('b')].find(b => /◄\s*limita/.test(b.textContent ?? ''))
      return fila && m ? { tramo: fila.dataset.capacidad, texto: m.textContent ?? '', color: getComputedStyle(m).color } : null
    })
    f.ok(x !== null, 'la tubería marca un tramo que limita')
    if (!x) return
    f.ok(x.tramo === 'pozo', `en La Ceiba limitan los pozos (${x.tramo})`)
    f.ok(x.color === tinta && x.color !== rojo && x.color !== naranja, `«◄ limita» escrito en la tinta, no en rojo ni naranja (${x.color})`)
    // En el dibujo, el tramo que limita lleva un contorno en tinta (no rojo) y su rótulo lo dice.
    const pozos = await tecnica.locator('svg[data-tuberia] [data-tramo="pozo"]').textContent() ?? ''
    f.ok(/limita/.test(pozos), `el rótulo del tramo de los pozos dice «limita» («${pozos.slice(0, 40)}»)`)
    // Ningún elemento de la tubería usa el rojo ni el naranja de alarma, salvo la marca del equipo (un SVG con su forma).
    const conColor = await f.page.evaluate(([r, n]) => [...document.querySelectorAll<HTMLElement>('main [data-tuberia-tecnica] *')]
      .filter(e => !(e instanceof SVGElement))
      .filter(e => { const c = getComputedStyle(e); return [c.color, c.borderTopColor, c.backgroundColor].some(v => v === r || v === n) })
      .map(e => e.textContent?.trim().slice(0, 30) ?? e.tagName), [rojo, naranja])
    f.ok(conColor.length === 0, `la tubería no pinta nada de rojo ni naranja fuera de la marca del equipo${conColor.length ? `: ${conColor.join(' | ')}` : ''}`)
    const pintados = await f.page.evaluate(([r, n]) => [...document.querySelectorAll<SVGElement>('main [data-tuberia-tecnica] svg[data-tuberia] *')]
      .filter(e => !e.closest('svg[viewBox="0 0 14 14"]') && !e.closest('[data-marca]'))
      .filter(e => { const c = getComputedStyle(e); return [c.fill, c.stroke].some(v => v === r || v === n) }).length, [rojo, naranja])
    f.ok(pintados === 0, `en el dibujo, el rojo y el naranja solo van en una marca (${pintados})`)
    // La marca de P-201B (alarma) va con el equipo, en la hoja de la planta.
    await tecnica.locator('svg[data-tuberia] [data-tramo="planta"]').click()
    const hoja = f.page.locator('[data-hoja-tramo="planta"], [role=dialog][aria-label^="Planta"]').first()
    await hoja.waitFor()
    const marcas = await f.page.locator('[data-equipo-tramo="P-201B"] svg[role="img"]').evaluateAll(es => es.map(e => e.getAttribute('aria-label')))
    f.ok(marcas.some(m => /prioridad 1/i.test(m ?? '')), `la marca del equipo en alarma (P-201B) va en la hoja de la planta: ${marcas.join(', ')}`)
    await f.page.keyboard.press('Escape')
  })

  await test.step('Lo que le sobra a la planta: su capacidad menos la de los pozos', async () => {
    const de = async (k: string) => (await tecnica.locator(`[data-capacidad="${k}"]`).textContent()) ?? ''
    const pozos = num(/dan ([\d.]+) bbl\/d/.exec(await de('pozo'))?.[1] ?? 'NaN')
    const planta = num(/caben ([\d.]+) bbl\/d/.exec(await de('planta'))?.[1] ?? 'NaN')
    const sobran = num(/le sobran ([\d.]+)/.exec(await de('planta'))?.[1] ?? 'NaN')
    f.ok(Number.isFinite(pozos) && Number.isFinite(planta) && Math.abs(planta - pozos - sobran) <= 1, `a la planta le sobran ${sobran} = ${planta} − ${pozos}`)
    const frase = await tecnica.locator('[data-frase-tecnica]').textContent() ?? ''
    f.ok(frase.includes(`a la planta le sobran ${miles(sobran)} bbl/d`), `la frase de arriba lo dice: «${frase}»`)
    // Lo que sale hoy y lo que no pasa ahora, en la tabla de la tubería (y en el dibujo, «Sale hoy»).
    const todo = await tecnica.textContent() ?? ''
    f.ok(todo.includes('Sale hoy') && todo.includes('No pasa ahora'), 'debajo, lo que sale hoy y lo que no pasa ahora')
  })

  await test.step('Lo perdido por tramo suma el diferido del período, el mismo del libro (en Diferidos, «Por tramo»)', async () => {
    // El libro, por un camino: la columna «Diferido» del cuadre día por día de Producción (los días del mes en curso).
    const dias = await f.page.evaluate(() => {
      const tabla = [...document.querySelectorAll('table')].find(x => [...x.querySelectorAll('thead th')].some(th => th.textContent?.trim() === 'Diferido'))
      if (!tabla) return null
      const i = [...tabla.querySelectorAll('thead th')].findIndex(th => th.textContent?.trim() === 'Diferido')
      return [...tabla.querySelectorAll('tbody tr')].filter(tr => (tr as HTMLElement).offsetParent !== null).map(tr => tr.children[i]?.textContent ?? '')
    })
    f.ok(dias !== null && dias.length > 0, 'el cuadre diario trae el diferido de cada día')
    const delLibro = (dias ?? []).reduce((a, v) => a + num(v), 0)
    // Y por tramo: «Se trabó en el período» de la tubería de antes vive en Diferidos («Por tramo», con su árbol).
    await f.ir('#/prod/diferidos/ceiba/curso')
    await f.esperarTexto('Por tramo')
    const se = await f.page.evaluate(() => {
      const c = document.querySelector<HTMLElement>('main [data-por-tramo]')
      const total = c?.querySelector<HTMLElement>('[data-total-tramos]')
      return c && total ? { total: Number(total.dataset.totalTramos), filas: [...c.querySelectorAll<HTMLElement>('[data-tramo-fila] [data-tramo]')].map(e => [e.dataset.tramo!, Number(e.dataset.bbl)] as const) } : null
    })
    f.ok(se !== null, 'está «Por tramo», con el total del libro')
    if (!se) return
    const suma = se.filas.reduce((a, [, v]) => a + v, 0)
    f.ok(se.filas.some(([k]) => k === 'sin-asignar'), '«sin identificar» va aparte, no repartido entre los tramos')
    f.ok(Math.abs(suma - se.total) < 0.01, `los tramos y «sin identificar» suman el total: ${suma.toFixed(2)} = ${se.total.toFixed(2)}`)
    f.ok(Math.abs(delLibro - se.total) <= (dias?.length ?? 0), `y suma lo mismo que el libro: ${delLibro} ≈ ${Math.round(se.total)}`)
    const t = await f.texto()
    f.ok(t.includes(`${miles(se.total)} bbl`), 'el total se escribe con su unidad')
    await f.ir('#/prod/produccion/ceiba/curso')
    await f.esperarTexto('La tubería del campo')
  })

  await test.step('Con el teclado: Tab pasa de un tramo a otro y Enter abre su hoja, con el enlace al agua', async () => {
    const pozo = tecnica.locator('svg[data-tuberia] [data-tramo="pozo"]')
    await pozo.focus()
    await f.page.keyboard.press('Tab')
    const enFoco = await f.page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.tramo)
    f.ok(enFoco === 'planta', `Tab lleva a la planta (${enFoco})`)
    await f.page.keyboard.press('Enter')
    await f.esperar(200)
    const t = await f.textoPagina()
    f.ok(t.includes('¿Por qué?') && t.includes('Ver la tubería del agua'), 'Enter abre la hoja de la planta, con el enlace al agua')
  })

  f.cerrar()
})

test('La Zarza muestra el estado de campo de gas', async ({ flujo: f }) => {
  await f.abrir('/#/adm/planta/zarza/curso')
  await f.esperarTexto('La tubería del campo')
  const t = await f.texto()
  f.ok(t.includes('La Zarza es un campo de gas: su tubería todavía no está.'), 'dice que es un campo de gas y que su tubería todavía no está')
  f.ok(await f.page.locator('main [data-tuberia-tecnica] svg[data-tuberia]').count() === 0, 'no dibuja una tubería de crudo para un campo de gas')
  f.cerrar()
})

test('La tubería del agua de La Ceiba: sus tres bombas y el colchón', async ({ flujo: f }) => {
  await f.abrir('/#/prod/planta/ceiba/curso')
  await f.esperarTexto('La tubería del campo')
  // C1 (experiencia v2): Agua es una subpantalla de La planta viva, listada en el panel debajo de su puerta.
  const menu = await f.page.evaluate(() => [...document.querySelectorAll('nav[aria-label="Navegación"] [data-subpantallas] button')].map(b => b.textContent?.trim() || b.getAttribute('aria-label')))
  f.ok(menu.includes('Agua'), `producción tiene «Agua» en su menú (La planta viva · ${menu.join(' · ')})`)
  // Desde la planta (la hoja de su tramo en la tubería, K1 · P-16) se llega a la tubería del agua (U2 §5.7).
  await f.page.locator('main [data-tuberia-tecnica] svg[data-tuberia] [data-tramo="planta"]').click()
  f.ok(await f.clic('Ver la tubería del agua'), 'la hoja de la planta lleva a la tubería del agua')
  await f.esperarTexto('La tubería del agua')
  f.ok((await f.hash()).startsWith('#/prod/agua/ceiba'), `y abre la pantalla Agua (${await f.hash()})`)

  const bombas = await f.page.locator('[data-bomba]').evaluateAll(es => es.map(e => [e.getAttribute('data-bomba'), e.getAttribute('data-marcha')]))
  f.ok(bombas.map(([b]) => b).join(',') === 'P-201A,P-201B,P-201C', `las tres bombas: ${bombas.map(([b, m]) => `${b} ${m}`).join(', ')}`)
  f.ok(bombas.find(([b]) => b === 'P-201B')?.[1] === 'parada', 'P-201B está parada')
  // P-agua-1 (F2): arriba va la frase de X4 §6.1; las cuentas, detrás de «Ver la cuenta». Se abre y se leen ahí.
  await f.page.locator('[data-frase-agua] button', { hasText: 'Ver la cuenta' }).click()
  await f.page.locator('[data-frases-agua]').waitFor()
  const t = await f.texto()
  // En el agua se mide contra lo que entra: «cabe más agua», no «le sobran» (B-16; F2-B).
  f.ok(/Con las tres bombas, cabe más agua: [\d.]+ bbl\/d/.test(t), 'el colchón, primera frase: con las tres bombas, cabe más agua…')
  // T-8 (F3): lo diferido «deja de producirse», nunca «se pierde» (regla 3; X4 §6.1, punto 5).
  f.ok(/Cerrando primero los más acuatosos dejan de producirse [\d.]+ bbl\/d de crudo; cerrando parejo, [\d.]+\./.test(t) && !/se pierden? [\d.]+ bbl/.test(t), 'y lo que cuesta cerrar primero los más acuatosos, sin «se pierden»')
  f.ok(/aguantaba\s+1,8 h/.test(t) && t.includes('alto-alto 90 %'), 'el tanque: alto-alto 90 % y lo que aguantó al parar P-201B (1,8 h)')
  f.ok(t.includes('Por qué es crítica') && t.includes('No hay bomba de sobra'), 'por qué la bomba de reinyección es crítica, sin teoría')
  f.ok(t.includes('Tratamiento de agua') && /Tratamiento de agua\s+sin dato/.test(t), 'el tratamiento, que el demo no tiene, dice «sin dato»')
  // B-16: el agua de La Ceiba no limita (cabe más): «◄ limita» no sale; las bombas y los inyectores, iguales
  // al barril, van con su marca de «casi iguales» (borde discontinuo grueso), sin rojo.
  const marcas = await f.page.evaluate(() => ({
    limita: document.querySelectorAll('[data-tuberia-agua] [data-limita]').length,
    casi: [...document.querySelectorAll<HTMLElement>('[data-tuberia-agua] section[data-casi-igual]')].map(e => ({ tramo: e.dataset.tramoAgua, estilo: getComputedStyle(e).borderTopStyle, borde: getComputedStyle(e).borderTopColor })),
  }))
  const rojo = await colorDe(f, '--p1')
  f.ok(marcas.limita === 0, `el agua no limita, así que no lleva «◄ limita» (${marcas.limita})`)
  f.ok(marcas.casi.map(x => x.tramo).join() === 'bombas,inyectores' && marcas.casi.every(x => x.estilo === 'dashed' && x.borde !== rojo),
    `las bombas y los inyectores, casi iguales: borde discontinuo y sin rojo (${JSON.stringify(marcas.casi)})`)
  // B-01: con P-201B parada, el orden que importa es el de la que sigue en riesgo: si para otra bomba.
  const otra = await f.page.locator('[data-orden-si-para-otra]').innerText()
  f.ok(/Si para otra bomba\s+con P-201A y P-201C solas, cerrar primero los más acuatosos/.test(otra) && /se dejan de producir [\d.]+ bbl\/d de crudo; parejo, [\d.]+ · después de \d+ min de colchón/.test(otra),
    `si para otra bomba ahora: el orden de cierre, lo que se deja de producir y el colchón en minutos («${otra.replace(/\s+/g, ' ').slice(0, 160)}…»)`)
  f.cerrar()
})

for (const ancho of [390, 320]) {
  test.describe(`${ancho} px`, () => {
    test.use({ viewport: { width: ancho, height: 860 }, isMobile: true })

    test(`en el teléfono (${ancho} px) nada se sale: tubería de pie, escalera, mes a mes y agua`, async ({ flujo: f }) => {
      for (const ruta of ['/#/prod/produccion/ceiba/curso', '/#/prod/planta/ceiba/curso', '/#/prod/agua/ceiba/curso', '/#/prod/produccion/ceiba/cerrado']) {
        await f.abrir(ruta)
        await f.esperar(300)
        const r = await f.page.evaluate(() => {
          const vw = document.documentElement.clientWidth
          const paneles = [...document.querySelectorAll<HTMLElement>('[data-tuberia], [data-tuberia-agua], [data-serie], [data-escalera], [data-mensual]')]
          const fuera: string[] = []
          for (const p of paneles) {
            const caja = p.getBoundingClientRect()
            for (const e of p.querySelectorAll<HTMLElement>('*')) {
              if (e instanceof SVGElement && e.tagName.toLowerCase() !== 'svg') continue
              const r = e.getBoundingClientRect()
              if (r.width < 1 || r.height < 1) continue
              // Lo que vive dentro de un desplazable de lado se ve desplazando: no se sale.
              let a: HTMLElement | null = e.parentElement, desplaza = false
              while (a && a !== p) { const cs = getComputedStyle(a); if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && a.scrollWidth > a.clientWidth) { desplaza = true; break } a = a.parentElement }
              if (desplaza) continue
              if (r.right > caja.right + 1.5 || r.left < caja.left - 1.5) fuera.push(`${e.tagName.toLowerCase()} «${(e.textContent ?? '').trim().slice(0, 30)}» ${Math.round(r.right - caja.right)} px`)
            }
          }
          const dePie = document.querySelector<HTMLElement>('[data-dibujo="de-pie"]')
          const acostada = document.querySelector<HTMLElement>('[data-dibujo="acostada"]')
          return { pagina: document.documentElement.scrollWidth - vw, paneles: paneles.length, fuera: [...new Set(fuera)].slice(0, 6),
            dePie: dePie ? dePie.offsetParent !== null : null, acostada: acostada ? acostada.offsetParent !== null : null }
        })
        f.ok(r.pagina <= 0, `${ruta}: la página no se desplaza de lado (${r.pagina} px de más)`)
        f.ok(r.paneles > 0 && r.fuera.length === 0, `${ruta}: nada se sale de su panel${r.fuera.length ? `: ${r.fuera.join(' | ')}` : ''}`)
        if (r.dePie !== null) f.ok(r.dePie && !r.acostada, `${ruta}: la tubería va de pie en el teléfono`)
      }
      f.cerrar()
    })
  })
}
