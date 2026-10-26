// De punta a punta: «La tubería del campo» y «La tubería del agua» como las ve
// producción (U2 §2 y §5). Lo que limita va en gris con doble contorno, nunca en
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

test('La Ceiba: la tubería del campo, lo que limita sin rojo, lo que le sobra y lo perdido por tramo', async ({ flujo: f }) => {
  await f.abrir('/#/prod/produccion/ceiba/curso')
  await f.esperarTexto('La tubería del campo')
  const rojo = await colorDe(f, '--p1'), naranja = await colorDe(f, '--p2'), tinta = await colorDe(f, '--tinta')

  await test.step('Lo que limita: doble contorno en la tinta, la palabra «limita» y ningún rojo', async () => {
    const x = await f.page.evaluate(() => {
      const b = document.querySelector<HTMLElement>('[data-dibujo="acostada"] [data-limita]')
      const m = document.querySelector<HTMLElement>('[data-dibujo="acostada"] [data-limita-marca]')
      if (!b || !m) return null
      const cs = getComputedStyle(b)
      return { tramo: b.dataset.tramo, estilo: cs.borderTopStyle, ancho: parseFloat(cs.borderTopWidth), borde: cs.borderTopColor,
        texto: m.textContent ?? '', colorTexto: getComputedStyle(m).color }
    })
    f.ok(x !== null, 'la tubería marca un tramo que limita')
    if (!x) return
    f.ok(x.tramo === 'pozo', `en La Ceiba limitan los pozos (${x.tramo})`)
    f.ok(x.estilo === 'double' && x.ancho >= 3, `doble contorno (${x.estilo}, ${x.ancho} px)`)
    f.ok(x.borde === tinta && x.borde !== rojo && x.borde !== naranja, `el contorno es de la tinta, no rojo ni naranja (${x.borde})`)
    f.ok(/◄\s*LIMITA/i.test(x.texto) && x.colorTexto !== rojo && x.colorTexto !== naranja, `«◄ limita» escrito y en gris (${x.colorTexto})`)
    // Ningún elemento del dibujo usa el rojo ni el naranja de alarma, salvo la marca del equipo (un SVG con su forma).
    const conColor = await f.page.evaluate(([r, n]) => [...document.querySelectorAll<HTMLElement>('[data-tuberia] *')]
      .filter(e => !(e instanceof SVGElement))
      .filter(e => { const c = getComputedStyle(e); return [c.color, c.borderTopColor, c.backgroundColor].some(v => v === r || v === n) })
      .map(e => e.textContent?.trim().slice(0, 30) ?? e.tagName), [rojo, naranja])
    f.ok(conColor.length === 0, `el panel no pinta nada de rojo ni naranja fuera de la marca del equipo${conColor.length ? `: ${conColor.join(' | ')}` : ''}`)
    const marcas = await f.page.locator('[data-dibujo="acostada"] svg[role="img"]').evaluateAll(es => es.map(e => e.getAttribute('aria-label')))
    f.ok(marcas.some(m => /prioridad 1/i.test(m ?? '')), `el único color es la marca del equipo en alarma (P-201B): ${marcas.join(', ')}`)
  })

  await test.step('Lo que le sobra a la planta: su capacidad menos la de los pozos', async () => {
    const leidos = await f.page.locator('[data-dibujo="acostada"] [data-tramo]').evaluateAll(es => es.map(e => [e.getAttribute('data-tramo'), e.getAttribute('aria-label') ?? '']))
    const de = (k: string) => leidos.find(([t]) => t === k)?.[1] ?? ''
    const pozos = num(/([\d.]+) barriles por día/.exec(de('pozo'))?.[1] ?? 'NaN')
    const planta = num(/([\d.]+) barriles por día/.exec(de('planta'))?.[1] ?? 'NaN')
    const sobran = num(/le sobran ([\d.]+)/.exec(de('planta'))?.[1] ?? 'NaN')
    f.ok(Number.isFinite(pozos) && Number.isFinite(planta) && Math.abs(planta - pozos - sobran) <= 1, `a la planta le sobran ${sobran} = ${planta} − ${pozos}`)
    const frase = await f.page.locator('[data-frase]').first().textContent() ?? ''
    f.ok(frase.includes(`A la planta le sobran ${miles(sobran)} bbl/d`), `la frase de abajo lo dice: «${frase}»`)
    const t = await f.texto()
    f.ok(t.includes('Pasa hoy') && t.includes('Se deja de producir ahora'), 'debajo, lo que pasa hoy y lo que se pierde ahora')
  })

  await test.step('Lo perdido por tramo suma el diferido del período, el mismo del libro', async () => {
    const se = await f.page.evaluate(() => {
      const c = document.querySelector<HTMLElement>('[data-se-trabo]')
      return c ? { total: Number(c.dataset.total), filas: [...c.querySelectorAll<HTMLElement>('[data-tramo-periodo]')].map(e => [e.dataset.tramoPeriodo!, Number(e.dataset.bbl)] as const) } : null
    })
    f.ok(se !== null, 'está «Se trabó en el período»')
    if (!se) return
    const suma = se.filas.reduce((a, [, v]) => a + v, 0)
    f.ok(se.filas.some(([k]) => k === 'sin-asignar'), '«sin identificar» va aparte, no repartido entre los tramos')
    f.ok(Math.abs(suma - se.total) < 0.01, `los tramos y «sin identificar» suman el total: ${suma.toFixed(2)} = ${se.total.toFixed(2)}`)
    // El libro, por otro camino: la columna «Diferido» del cuadre día por día (los dos días del mes en curso).
    const dias = await f.page.evaluate(() => {
      const tabla = [...document.querySelectorAll('table')].find(x => [...x.querySelectorAll('thead th')].some(th => th.textContent?.trim() === 'Diferido'))
      if (!tabla) return null
      const i = [...tabla.querySelectorAll('thead th')].findIndex(th => th.textContent?.trim() === 'Diferido')
      return [...tabla.querySelectorAll('tbody tr')].filter(tr => (tr as HTMLElement).offsetParent !== null).map(tr => tr.children[i]?.textContent ?? '')
    })
    f.ok(dias !== null && dias.length > 0, 'el cuadre diario trae el diferido de cada día')
    const delLibro = (dias ?? []).reduce((a, v) => a + num(v), 0)
    f.ok(Math.abs(delLibro - se.total) <= (dias?.length ?? 0), `y suma lo mismo que el libro: ${delLibro} ≈ ${Math.round(se.total)}`)
    const t = await f.texto()
    f.ok(t.includes(`${miles(se.total)} bbl`), 'el total se escribe con su unidad')
  })

  await test.step('Con el teclado: las flechas pasan de un tramo a otro y Enter abre su detalle', async () => {
    const pozo = f.page.locator('[data-dibujo="acostada"] [data-tramo="pozo"]')
    await pozo.focus()
    await f.page.keyboard.press('ArrowRight')
    const enFoco = await f.page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.tramo)
    f.ok(enFoco === 'planta', `la flecha lleva a la planta (${enFoco})`)
    await f.page.keyboard.press('Enter')
    await f.esperar(200)
    const t = await f.texto()
    f.ok(t.includes('De dónde sale') && t.includes('Ver la tubería del agua'), 'Enter abre el detalle de la planta, con el enlace al agua')
  })

  f.cerrar()
})

test('La Zarza muestra el estado de campo de gas', async ({ flujo: f }) => {
  await f.abrir('/#/adm/planta/zarza/curso')
  await f.esperarTexto('La tubería del campo')
  const t = await f.texto()
  f.ok(t.includes('La Zarza es un campo de gas. La tubería del gas todavía no está'), 'dice que es un campo de gas y que su tubería todavía no está')
  f.ok(await f.page.locator('[data-dibujo]').count() === 0, 'no dibuja una tubería de crudo para un campo de gas')
  f.cerrar()
})

test('La tubería del agua de La Ceiba: sus tres bombas y el colchón', async ({ flujo: f }) => {
  await f.abrir('/#/prod/planta/ceiba/curso')
  await f.esperarTexto('La tubería del campo')
  // C1 (experiencia v2): Agua es una subpantalla de La planta viva, listada en el panel debajo de su puerta.
  const menu = await f.page.evaluate(() => [...document.querySelectorAll('nav[aria-label="Navegación"] [data-subpantallas] button')].map(b => b.textContent?.trim() || b.getAttribute('aria-label')))
  f.ok(menu.includes('Agua'), `producción tiene «Agua» en su menú (La planta viva · ${menu.join(' · ')})`)
  // Desde la planta por dentro (el carril del agua) se llega a la tubería del agua (U2 §5.7).
  f.ok(await f.clic('Ver la tubería del agua'), 'el carril del agua lleva a la tubería del agua')
  await f.esperarTexto('La tubería del agua')
  f.ok((await f.hash()).startsWith('#/prod/agua/ceiba'), `y abre la pantalla Agua (${await f.hash()})`)

  const bombas = await f.page.locator('[data-bomba]').evaluateAll(es => es.map(e => [e.getAttribute('data-bomba'), e.getAttribute('data-marcha')]))
  f.ok(bombas.map(([b]) => b).join(',') === 'P-201A,P-201B,P-201C', `las tres bombas: ${bombas.map(([b, m]) => `${b} ${m}`).join(', ')}`)
  f.ok(bombas.find(([b]) => b === 'P-201B')?.[1] === 'parada', 'P-201B está parada')
  const t = await f.texto()
  // En el agua se mide contra lo que entra: «cabe más agua», no «le sobran» (B-16; F2-B).
  f.ok(/Con las tres bombas, cabe más agua: [\d.]+ bbl\/d/.test(t), 'el colchón, primera frase: con las tres bombas, cabe más agua…')
  f.ok(/Cerrando primero los más acuatosos se pierden [\d.]+ bbl\/d de crudo; cerrando parejo, [\d.]+\./.test(t), 'y lo que cuesta cerrar primero los más acuatosos')
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
  f.ok(/Si para otra bomba\s+con P-201A y P-201C solas, cerrar primero los más acuatosos/.test(otra) && /se pierden [\d.]+ bbl\/d de crudo; parejo, [\d.]+ · después de \d+ min de colchón/.test(otra),
    `si para otra bomba ahora: el orden de cierre, lo que se pierde y el colchón en minutos («${otra.replace(/\s+/g, ' ').slice(0, 160)}…»)`)
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
