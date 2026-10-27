/* Auditor visual: recorre cada rol en cada pantalla, en seis anchos (de
   escritorio grande a teléfono chico), y falla si algo se sale de su tarjeta, se
   recorta sin querer, se pisa con otro texto o desborda la pantalla; si una
   pantalla queda vacía o la página lanza un error; o si un rol no ve lo que
   su decisión exige (o ve lo que no le toca).

   F4 (revisión total, PROMPT-REVISION-UX §11) suma, en `auditoria/detector.ts`:
   el desborde de lado dentro de `.vista`, las tarjetas por su fondo y su radio,
   el texto de SVG chico o recortado, más de una cifra grande por vista, el color
   de estado sin forma y palabra, las pestañas horizontales y los títulos en
   MAYÚSCULAS (D-3); el ancho de 320 px; y, aparte, el inicio de cada rol a 390 px:
   el presupuesto de palabras y cifras de lo necesario de la v3 (`auditoria/presupuesto.ts`)
   y una sola cifra grande sin desplazarse.

   A diferencia de los flujos, aquí NO se marca la introducción de cada rol
   como vista: la primera vez que se entra con un rol también se audita
   (salvo en el inicio de cada rol, que mide lo que queda detrás de ella).

   Para ver solo una ruta o un ancho: npx playwright test auditor -g "390 px" */
import { expect, test, type Page } from '@playwright/test'
import { detectar, type Hallazgo } from './auditoria/detector.ts'
import { medirInicio } from './auditoria/inicio.ts'
import { CIFRAS_TELEFONO, GRANDES, PRESUPUESTO } from './auditoria/presupuesto.ts'
import { ABRIR_BOMBA, ABRIR_BOTON, ABRIR_FILA, ANCHOS, ASERCIONES, RUTAS as TODAS } from './auditoria/rutas.ts'

/** Para recorrer solo los roles de quien está trabajando (AUDITOR_ROLES=sup,oper): la suite completa los recorre todos. */
const SOLO = process.env.AUDITOR_ROLES?.split(',').filter(Boolean)
const RUTAS = SOLO?.length ? TODAS.filter(r => SOLO.some(x => r.startsWith(`#/${x}/`))) : TODAS

test.describe.configure({ mode: 'parallel' })

const esperar = (page: Page, ms: number) => page.waitForTimeout(ms)

/** Los errores de la página mientras se recorre: las excepciones sin
 *  atrapar y lo que se escribe con console.error. Una pantalla que revienta
 *  queda vacía y no tendría «hallazgos»: se cuenta aparte. */
function oirErrores(page: Page, donde: () => string) {
  const errores: string[] = []
  page.on('pageerror', e => errores.push(`${donde()}: ${e.message.split('\n')[0]}`))
  page.on('console', m => { if (m.type() === 'error') errores.push(`${donde()}: console.error ${m.text().slice(0, 160)}`) })
  return errores
}

test('autoprueba: el detector ve lo que se sale y lo que se pisa', async ({ page }) => {
  // Se plantan dos defectos conocidos dentro de la fila de un equipo: un
  // valor que se sale de su tarjeta y dos textos encimados. Sin la introducción
  // abierta: con un diálogo modal encima, el detector revisa solo el diálogo.
  // B3 (v3, A-15): la pantalla Bombas se borró; sus placas son las filas de Equipos.
  await page.addInitScript(() => localStorage.setItem('trim.intro.sup', '1'))
  await page.goto('/#/sup/equipos/ceiba')
  const placa = page.locator('main [data-fila-equipo]').first()
  await expect(placa, 'la lista de equipos tiene al menos una fila donde plantar los defectos').toBeAttached()
  await placa.evaluate(m => {
    const a = document.createElement('div'); a.style.cssText = 'border:1px solid;width:80px'
    a.innerHTML = '<span style="white-space:nowrap">VALOR-QUE-SE-SALE-DE-LA-TARJETA</span>'
    const b = document.createElement('div'); b.style.cssText = 'position:relative;height:20px'
    b.innerHTML = '<span style="position:absolute;left:0">PISADO-UNO</span><span style="position:absolute;left:10px">PISADO-DOS</span>'
    m.prepend(b); m.prepend(a)
  })
  // C5 · La regla de X3 §5.5: un texto de SVG que se sale de su dibujo (cortado), uno que el viewBox
  // encoge por debajo de 12 px, y la excepción: el número de una marca de prioridad (14 × 14).
  await page.locator('main').evaluate(m => {
    const d = document.createElement('div'); d.style.cssText = 'width:220px'
    d.innerHTML = '<svg width="200" height="40" viewBox="0 0 200 40"><text x="150" y="20" font-size="14">SVG-CORTADO-AFUERA</text></svg>'
      + '<svg width="100" height="20" viewBox="0 0 400 80"><text x="10" y="40" font-size="14">SVG-CHICO</text></svg>'
      // F4: la excepción es el número de una prioridad (1, 2 o 3); otra letra en una marca sí cuenta.
      + '<svg width="14" height="14" viewBox="0 0 14 14"><text x="7" y="10" font-size="7.8">1</text></svg>'
    m.prepend(d)
  })
  const hallazgos = await page.evaluate(detectar)
  const prueba = JSON.stringify(hallazgos)
  expect.soft(prueba, 'el detector ve lo que se sale de su tarjeta').toContain('VALOR-QUE-SE-SALE')
  expect.soft(prueba, 'el detector ve dos textos que se pisan').toContain('PISADO-UNO')
  expect.soft(hallazgos.some(h => h[0] === 'recortado' && h[1].includes('SVG-CORTADO-AFUERA')), 'el detector ve el texto de un SVG que se sale de su dibujo').toBe(true)
  expect.soft(hallazgos.some(h => h[0] === 'chico' && h[1].includes('SVG-CHICO') && h[2] < 6), 'el detector ve el texto de un SVG que queda de menos de 12 px (14 de un dibujo a la cuarta: 3,5 px)').toBe(true)
  expect.soft(hallazgos.some(h => h[1].includes('«1»')), 'el número de una marca de prioridad no cuenta').toBe(false)
})

// F4 · Cada regla nueva ve su defecto y no ve lo que se le parece y está bien (sin falsos positivos).
test('autoprueba F4: el detector ve las reglas de §11 y no ve lo que está bien', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('trim.intro.sup', '1'))
  await page.goto('/#/sup/equipos/ceiba')
  await expect(page.locator('main [data-fila-equipo]').first(), 'la pantalla cargó').toBeAttached()
  const antes = await page.evaluate(detectar)
  const ya = new Set(antes.map(h => JSON.stringify(h)))
  await page.locator('main').evaluate(m => {
    const ROMBO = (etiqueta: string) => `<svg width="14" height="14" viewBox="0 0 14 14" ${etiqueta}><path d="M7 .5 13.5 7 7 13.5.5 7Z" fill="var(--p1)"/><text x="7" y="9.75" font-size="7.8">1</text></svg>`
    const d = document.createElement('div')
    d.innerHTML = [
      // «desborde» no: un desplazable a propósito (su clase lo dice) puede ser más ancho.
      '<div class="overflow-x-auto" style="width:200px"><div style="width:900px">ANCHO-A-PROPOSITO</div></div>',
      // «sale»: la tarjeta de B (fondo y radio, sin borde).
      '<div style="background:var(--panel2);border-radius:20px;width:90px"><span style="white-space:nowrap">SALE-DE-LA-TARJETA-SIN-BORDE</span></div>',
      // «sale» no: puntos suspensivos en el contenedor que corta.
      '<div style="width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><span>CORTE-CON-PUNTOS-SUSPENSIVOS-A-PROPOSITO</span></div>',
      // «recortado»: el texto de un SVG que corta un contenedor sin desplazarse.
      '<div style="width:60px;overflow:hidden"><svg width="200" height="30" viewBox="0 0 200 30"><text x="10" y="20" font-size="14">SVG-QUE-CORTA-SU-CAJA</text></svg></div>',
      // «chico»: el «?» dentro de una marca no es un número de prioridad (UI-16).
      '<svg width="12" height="12" viewBox="0 0 14 14"><text x="7" y="10" font-size="8.4">?</text></svg>',
      // «grande»: dos cifras de 40 px o más.
      '<p style="font-size:48px">1.966</p><p style="font-size:44px">CIFRA-GRANDE 2.650</p>',
      // «color»: un color de estado sin forma; una marca sin nombre; una marca sin palabra en su botón.
      '<span style="background:var(--p1);display:inline-block;width:30px;height:10px">&nbsp;</span>',
      `<p>${ROMBO('')} MARCA-SIN-NOMBRE</p>`,
      `<button>${ROMBO('role="img" aria-label="Prioridad 1, alarma"')}<b>0</b></button>`,
      // «color» no: la marca con su nombre y su palabra al lado; la etiqueta pintada con su forma y su palabra.
      `<p>${ROMBO('role="img" aria-label="Prioridad 1, alarma"')} MARCA-BIEN alarma</p>`,
      `<span style="background:var(--p1-f)">${ROMBO('aria-hidden="true"')} ETIQUETA-BIEN alarma</span>`,
      // B4 · El kit en estado anormal: el límite cruzado (`data-alarma`) en el color de su prioridad está bien con la marca y
      // la frase en la misma pieza; sin la marca, sale. (Un rect de 2 px: Chrome y Firefox lo miden igual.)
      `<div role="img" data-kit="barra" data-estado="anormal" aria-label="Vibración, 11 mm/s; en alarma"><svg width="60" height="28" aria-hidden="true"><rect class="kit-bien" data-alarma="" x="30" y="5" width="2" height="18" fill="var(--p2)"/></svg>${ROMBO('aria-hidden="true"')}<b>11</b> <small>mm/s</small></div>`,
      `<div role="img" data-kit="barra" data-estado="anormal" aria-label="Vibración, 11 mm/s; en alarma"><svg width="60" height="28" aria-hidden="true"><rect class="kit-sin-marca" data-alarma="" x="30" y="5" width="2" height="18" fill="var(--p2)"/></svg><b>11</b> <small>mm/s</small></div>`,
      // «pestañas»: un tablist acostado y una fila con «el actual»; no, un asistente por pasos.
      '<div role="tablist" style="display:flex"><button role="tab" aria-selected="true">PESTAÑA-UNO</button><button role="tab">PESTAÑA-DOS</button></div>',
      '<div style="display:flex"><button aria-current="page">FILA-ACTUAL</button><button>FILA-OTRA</button></div>',
      '<ol style="display:flex"><li><button aria-current="step">PASO-UNO</button></li><li><button>PASO-DOS</button></li></ol>',
      // «mayúsculas»: un título gritado; no, uno en frase con su sigla.
      '<h2>TÍTULO GRITADO</h2><h2>Historia del PLC en frase</h2>',
      // «simulado»: la cifra simulada más grande que todas las medidas (P-05).
      '<div><b style="font-size:96px">45.233</b> <span>bbl · SIMULADA-GRANDE simulado</span></div>',
      // «pérdida»: lo diferido dicho como pérdida (T-8); no, la pérdida de verdad.
      '<p>Hoy SE-DICE-MAL: se pierden 1.665 bbl/d</p><p>Pérdida BIEN-DICHA: lo que salió y no se vendió</p>',
      // «encimado» no: un diálogo que no es modal flota sobre la vista (la ficha sin velo, las señas de la introducción).
      '<div role="dialog" style="position:fixed;left:0;top:0;width:420px;padding:8px;background:var(--elevado)">CAPA-QUE-FLOTA encima de la página</div>',
    ].join('')
    m.prepend(d)
  })
  const nuevos = (await page.evaluate(detectar)).filter(h => !ya.has(JSON.stringify(h)))
  const hay = (tipo: Hallazgo[0], texto: string) => nuevos.some(h => h[0] === tipo && (h[1] + (h[3] ?? '')).includes(texto))
  const algo = (texto: string) => nuevos.filter(h => (h[1] + (h[3] ?? '')).includes(texto)).map(h => h[0])
  expect.soft(algo('ANCHO-A-PROPOSITO'), 'un desplazable a propósito no es desborde').toEqual([])
  expect.soft(hay('sale', 'SALE-DE-LA-TARJETA-SIN-BORDE'), 'lo que se sale de una tarjeta sin borde (fondo y radio)').toBe(true)
  expect.soft(algo('CORTE-CON-PUNTOS'), 'el corte con puntos suspensivos es a propósito').toEqual([])
  expect.soft(nuevos.some(h => h[0] === 'recortado' && h[1].startsWith('text') && h[1].includes('SVG-QUE-CORTA-SU-CAJA')), 'el texto de un SVG que corta su contenedor').toBe(true)
  expect.soft(hay('chico', '«?»'), 'el «?» de una marca sí se mide (solo el número de prioridad se salva)').toBe(true)
  expect.soft(nuevos.some(h => h[0] === 'grande' && h[1].includes('1.966') && h[1].includes('2.650') && h[2] >= 2), 'dos cifras grandes en la vista').toBe(true)
  expect.soft(nuevos.some(h => h[0] === 'color' && /--p1 sin forma: span/.test(h[1])), 'un color de estado sin forma').toBe(true)
  expect.soft(nuevos.some(h => h[0] === 'color' && h[1].includes('marca sin nombre accesible') && h[1].includes('MARCA-SIN-NOMBRE')), 'una marca sin nombre accesible').toBe(true)
  expect.soft(nuevos.some(h => h[0] === 'color' && /marca sin palabra al lado: Prioridad 1, alarma en button/.test(h[1])), 'una marca con solo una cifra en su botón').toBe(true)
  expect.soft([...algo('MARCA-BIEN'), ...algo('ETIQUETA-BIEN')], 'la marca con su nombre y su palabra, y la etiqueta con su forma y su palabra, están bien').toEqual([])
  expect.soft(algo('kit-bien'), 'el límite cruzado del kit, con la marca y la frase en su pieza, está bien').toEqual([])
  expect.soft(nuevos.some(h => h[0] === 'color' && /--p2 sin forma: rect\.kit-sin-marca/.test(h[1])), 'el límite cruzado del kit sin la marca en su pieza es color sin forma').toBe(true)
  expect.soft(hay('pestañas', 'PESTAÑA-UNO'), 'un role=tablist acostado').toBe(true)
  expect.soft(hay('pestañas', 'FILA-ACTUAL'), 'una fila de botones con «el actual»').toBe(true)
  expect.soft(algo('PASO-UNO'), 'un asistente por pasos no es una barra de pestañas').toEqual([])
  expect.soft(hay('mayúsculas', 'TÍTULO GRITADO'), 'un título en MAYÚSCULAS').toBe(true)
  expect.soft(algo('Historia del PLC en frase'), 'un título en frase con su sigla está bien').toEqual([])
  expect.soft(nuevos.some(h => h[0] === 'simulado' && h[1].includes('45.233')), 'una cifra simulada más grande que la medida').toBe(true)
  expect.soft(hay('pérdida', 'se pierden 1.665'), 'lo diferido dicho como pérdida').toBe(true)
  expect.soft(algo('BIEN-DICHA'), 'la pérdida de verdad («lo que salió y no se vendió») está bien').toEqual([])
  expect.soft(nuevos.filter(h => h[0] === 'encimado' && (h[1] + (h[3] ?? '')).includes('CAPA-QUE-FLOTA')).map(h => h[1]), 'un diálogo que flota no «pisa» la página que tapa').toEqual([])

  // «desborde»: `.vista` se desplaza de lado (no es un desplazable a propósito); la página no.
  await page.locator('.vista').evaluate(m => {
    const d = document.createElement('div'); d.style.cssText = 'width:2400px'; d.textContent = 'ENSANCHA-LA-VISTA'
    m.prepend(d)
  })
  const conDesborde = await page.evaluate(detectar)
  expect.soft(conDesborde.some(h => h[0] === 'desborde' && h[1].includes('vista') && h[2] > 500 && (h[3] ?? '').includes('ENSANCHA-LA-VISTA')),
    'lo que ensancha `.vista` sale como desborde, con quién la ensancha').toBe(true)
})

test('cada aserción de lo que ve un rol cae en una ruta que se recorre', () => {
  // Una aserción cuya ruta se quitó de RUTAS no fallaría nunca: no se comprobaría.
  const alcanzables = new Set([...TODAS, ...TODAS.filter(r => ABRIR_BOMBA.has(r)).map(r => `${r} [detalle]`),
    ...TODAS.flatMap(r => (ABRIR_BOTON[r] ?? []).map(b => `${r} [${b}]`))])
  expect(Object.keys(ASERCIONES).filter(k => !alcanzables.has(k))).toEqual([])
  // F4 · Un botón que se toca está en una ruta que se recorre.
  expect(Object.keys(ABRIR_BOTON).filter(r => !TODAS.includes(r))).toEqual([])
})

for (const ancho of ANCHOS) {
  test.describe(`${ancho} px`, () => {
    test.use({ viewport: { width: ancho, height: 900 }, isMobile: ancho < 600 })

    test(`${RUTAS.length} rutas: nada se sale ni se pisa, ninguna vacía ni con errores, cada rol ve lo suyo`, async ({ page }) => {
      test.setTimeout(900_000)
      let rutaActual = '(inicio)'
      const errores = oirErrores(page, () => rutaActual)
      const hallazgos = new Map<string, { tipo: Hallazgo[0]; max: number; donde: Set<string> }>()
      const anotar = (ruta: string, h: Hallazgo) => {
        const clave = `${h[0]} | ${h[1]}${h[3] ? '  ⟶  ' + h[3] : ''}`
        const x = hallazgos.get(clave) ?? { tipo: h[0], max: 0, donde: new Set<string>() }
        x.max = Math.max(x.max, h[2]); x.donde.add(ruta); hallazgos.set(clave, x)
      }
      const detectarEn = async (ruta: string) => { for (const h of await page.evaluate(detectar)) anotar(ruta, h) }
      const fallasAsercion: string[] = []
      let comprobaciones = 0
      // Lo que debe estar se busca sin importar mayúsculas; lo que no debe
      // estar (títulos de paneles técnicos) se busca tal cual, o con una expresión
      // regular (un título en su renglón, en frase o en MAYÚSCULAS: D-3).
      const asertar = async (clave: string) => {
        const a = ASERCIONES[clave]
        if (!a) return
        const texto = await page.evaluate(() => document.body.innerText)
        const bajo = texto.toLowerCase()
        for (const t of a.si) {
          comprobaciones++
          const esta = t instanceof RegExp ? t.test(texto) : bajo.includes(t.toLowerCase())
          if (!esta) fallasAsercion.push(`${clave}: falta «${t}»`)
        }
        for (const t of a.no) {
          comprobaciones++
          if (t instanceof RegExp ? t.test(texto) : texto.includes(t)) fallasAsercion.push(`${clave}: sobra «${t}»`)
        }
        // F4 · Lo que salió de la primera capa sigue en la página (detrás de «ver más», una ⓘ o el
        // papel), y no a la vista: ninguna función se pierde y la primera capa no lo repite.
        if (a.atras?.length) {
          const todo = (await page.evaluate(() => document.body.textContent ?? '')).toLowerCase()
          for (const t of a.atras) {
            comprobaciones++
            if (!todo.includes(t.toLowerCase())) fallasAsercion.push(`${clave}: ya no está en la página «${t}» (debía quedar detrás de un toque)`)
            else if (bajo.includes(t.toLowerCase())) fallasAsercion.push(`${clave}: «${t}» sigue a la vista (debía quedar detrás de un toque)`)
          }
        }
      }

      await page.goto('/' + RUTAS[0])
      await esperar(page, 2200)
      for (const ruta of RUTAS) {
        rutaActual = ruta
        await page.evaluate(h => { location.hash = h }, ruta.slice(1))
        await esperar(page, 650)
        // La primera visita a una pantalla trae su código aparte; en Safari y
        // Firefox con el servidor de desarrollo tarda más que los 650 ms. Se
        // espera a que no quede nada «Cargando…» (App.tsx, `data-cargando`);
        // si a los 15 s sigue, la pantalla sale como vacía o cargando.
        await page.waitForFunction(() => !document.querySelector('[data-cargando]'), undefined, { timeout: 15_000 })
          .catch((e: unknown) => { if (!(e instanceof Error && e.name === 'TimeoutError')) throw e; anotar(ruta, ['pantalla', 'sigue «Cargando…» a los 15 s', 0]) })
        const largo = await page.evaluate(() => (document.querySelector('main')?.innerText ?? '').length)
        if (!(largo > 80)) anotar(ruta, ['pantalla', `vacía (${largo} caracteres)`, 0])
        // Se comprueba antes de cerrar: hay rutas que abren el panel del equipo por la URL.
        await asertar(ruta)
        const cerrar = page.locator('[aria-label="Cerrar"][class*="cursor-pointer"], [role=dialog] [aria-label="Cerrar"]').first()
        // La ficha abierta también se audita: antes se cerraba sin revisarla y un texto
        // encimado en ella («hoy» sobre «+0,2 d») pasaba sin que nadie lo viera.
        if (await cerrar.count()) { await detectarEn(`${ruta} [ficha]`); await cerrar.click(); await esperar(page, 250) }
        await detectarEn(ruta)
        // F1 (P-15): la introducción ya no es un diálogo modal sino señas que flotan sobre el inicio. Se
        // audita con la ruta (arriba) y se cierra antes de tocar nada: en el teléfono tapa lo que se toca.
        const sena = page.locator('[data-introduccion]').getByRole('button', { name: /^(Ya entendí|Cerrar)/ }).filter({ visible: true }).first()
        if ((ABRIR_FILA.has(ruta) || ABRIR_BOMBA.has(ruta) || ABRIR_BOTON[ruta]) && await sena.count()) { await sena.click(); await esperar(page, 250) }
        if (ABRIR_FILA.has(ruta)) {
          // La primera fila que se ve: en el teléfono la tabla se esconde y
          // cada pozo es una tarjeta (la lista «sm:hidden» de botones).
          const fila = page.locator('main tbody tr, main div.sm\\:hidden > button').filter({ visible: true }).first()
          await expect(fila, `${ruta}: hay una fila que abrir`).toBeAttached()
          await fila.click(); await esperar(page, 600)
          await detectarEn(ruta + ' [fila]')
        }
        if (ABRIR_BOMBA.has(ruta)) {
          const placa = page.locator('[aria-label*="Abrir el detalle"]').filter({ visible: true }).first()
          await expect(placa, `${ruta}: hay una bomba que abrir`).toBeAttached()
          await placa.click(); await esperar(page, 500)
          await asertar(ruta + ' [detalle]')
          await detectarEn(ruta + ' [detalle]')
        }
        // F4 · Lo que está a un toque también se audita (y se comprueba que siga a un toque).
        for (const nombre of ABRIR_BOTON[ruta] ?? []) {
          const boton = page.locator('main').getByRole('button', { name: new RegExp(`^\\s*${nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }).filter({ visible: true }).first()
          await expect(boton, `${ruta}: hay un botón «${nombre}» que tocar`).toBeAttached()
          await boton.click(); await esperar(page, 500)
          await asertar(`${ruta} [${nombre}]`)
          await detectarEn(`${ruta} [${nombre}]`)
        }
      }

      const orden: Record<Hallazgo[0], number> = { pantalla: 0, desborde: 1, sale: 2, recortado: 3, encimado: 4, chico: 5, grande: 6, simulado: 7, color: 8, pestañas: 9, mayúsculas: 10, pérdida: 11 }
      const lista = [...hallazgos.entries()]
        .sort((a, b) => orden[a[1].tipo] - orden[b[1].tipo] || b[1].donde.size - a[1].donde.size)
        .map(([clave, x]) => `[${x.tipo}] máx ${x.max}  ${clave}  · en ${x.donde.size}: ${[...x.donde].slice(0, 4).join(' · ')}${x.donde.size > 4 ? ' …' : ''}`)
      test.info().annotations.push({ type: 'auditoría', description: `${RUTAS.length} rutas · ${comprobaciones} comprobaciones de lo que ve cada rol · ${lista.length} hallazgos · ${errores.length} errores` })
      expect.soft([...new Set(fallasAsercion)], 'lo que cada rol ve').toEqual([])
      expect.soft([...new Set(errores)], 'errores de la página').toEqual([])
      expect.soft(lista, 'lo que se sale, se recorta, se pisa, queda vacío o chico; las cifras grandes y simuladas; el color sin forma; las pestañas; los títulos en MAYÚSCULAS; lo diferido dicho como pérdida').toEqual([])
    })
  })
}

// F4 · El inicio de cada rol en el teléfono de las imágenes (D-1: la meta del −40 % se mide
// a 390 px). Responde su pregunta sin desplazarse con pocas palabras (el presupuesto de
// `auditoria/presupuesto.ts`), como mucho 5 cifras (sin la franja ni la hora de los datos,
// D-1) y una sola cifra grande (PROMPT-REVISION-UX §4 y §11; X4 §3.1; X5 §2.1).
test.describe('inicio de cada rol · 390 px', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('presupuesto de palabras, como mucho 5 cifras y una cifra grande, sin desplazarse', async ({ context }) => {
    test.setTimeout(300_000)
    const roles = Object.keys(PRESUPUESTO)
    await context.addInitScript(rs => { for (const r of rs) localStorage.setItem(`trim.intro.${r}`, '1') }, roles)
    const fallas: string[] = []
    const tabla: string[] = []
    for (const rol of roles) {
      // Una página nueva por rol: al cambiar la dirección, la app conserva la pantalla de antes.
      const page = await context.newPage()
      const errores = oirErrores(page, () => rol)
      await page.goto(`/#/${rol}`)
      // Que no quede nada «Cargando…» y que el texto deje de crecer tres veces seguidas: una parte
      // de la vista puede llegar después que la cabecera (como lo mide R1).
      const largo = () => page.evaluate(() => document.querySelector('[data-cargando]') ? -1
        : ((document.querySelector('.vista') ?? document.querySelector('main')) as HTMLElement | null)?.innerText.length ?? 0)
      for (let quietas = 0, antes = -1, hasta = Date.now() + 20_000; quietas < 3 && Date.now() < hasta;) {
        const l = await largo()
        quietas = l > 80 && l === antes ? quietas + 1 : 0
        antes = l
        await esperar(page, 250)
      }
      await page.evaluate(() => { const v = document.querySelector('.vista'); if (v) v.scrollTop = 0; scrollTo(0, 0) })
      const m = await page.evaluate(medirInicio)
      const p = PRESUPUESTO[rol]!
      const donde = `${rol} (${new URL(page.url()).hash})`
      tabla.push(`${rol}: ${m.palabras} palabras (antes ${p.antes}, tope ${p.tope}) · ${m.cifras.length} cifras (tope ${p.cifras ?? CIFRAS_TELEFONO}) · ${m.grandes.length} grandes`)
      // v3 (B4): el tope es lo necesario del rol (necesario-por-rol §14) medido en su inicio; si sobra texto, se recorta la pantalla.
      if (m.palabras > p.tope) fallas.push(`${donde}: ${m.palabras} palabras sin desplazarse; el tope es ${p.tope} (antes ${p.antes}; ${p.porque})`)
      // K2 · D-1: como el de palabras, el tope de cifras de un rol sube solo si lo necesario trae más (con su `porqueCifras`).
      const topeCifras = p.cifras ?? CIFRAS_TELEFONO
      if (m.cifras.length > topeCifras) fallas.push(`${donde}: ${m.cifras.length} cifras sin desplazarse (como mucho ${topeCifras}${p.porqueCifras ? `; ${p.porqueCifras}` : ''}): ${m.cifras.join(' · ')}`)
      if (m.grandes.length > GRANDES) fallas.push(`${donde}: ${m.grandes.length} cifras grandes (una sola): ${m.grandes.join(' · ')}`)
      if (errores.length) fallas.push(...errores)
      await page.close()
    }
    test.info().annotations.push({ type: 'inicios a 390 px', description: tabla.join(' | ') })
    expect.soft(fallas, 'el inicio de cada rol, sin desplazarse').toEqual([])
  })
})
