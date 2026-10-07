/* Auditor visual: recorre cada rol en cada pantalla, en cinco anchos (de
   escritorio grande a teléfono), y falla si algo se sale de su tarjeta, se
   recorta sin querer, se pisa con otro texto o desborda la pantalla; si una
   pantalla queda vacía o la página lanza un error; o si un rol no ve lo que
   su decisión exige (o ve lo que no le toca).

   A diferencia de los flujos, aquí NO se marca la introducción de cada rol
   como vista: la primera vez que se entra con un rol también se audita.

   Para ver solo una ruta o un ancho: npx playwright test auditor -g "390 px" */
import { expect, test, type Page } from '@playwright/test'
import { detectar, type Hallazgo } from './auditoria/detector.ts'
import { ABRIR_BOMBA, ABRIR_FILA, ANCHOS, ASERCIONES, RUTAS } from './auditoria/rutas.ts'

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
  // Se plantan dos defectos conocidos dentro de la placa de una bomba: un
  // valor que se sale de su tarjeta y dos textos encimados.
  await page.goto('/#/sup/bombas/ceiba/curso')
  const placa = page.locator('[aria-label*="Abrir el detalle"]').first()
  await expect(placa, 'la pantalla de bombas tiene al menos una placa donde plantar los defectos').toBeAttached()
  await placa.evaluate(m => {
    const a = document.createElement('div'); a.style.cssText = 'border:1px solid;width:80px'
    a.innerHTML = '<span style="white-space:nowrap">VALOR-QUE-SE-SALE-DE-LA-TARJETA</span>'
    const b = document.createElement('div'); b.style.cssText = 'position:relative;height:20px'
    b.innerHTML = '<span style="position:absolute;left:0">PISADO-UNO</span><span style="position:absolute;left:10px">PISADO-DOS</span>'
    m.prepend(b); m.prepend(a)
  })
  const prueba = JSON.stringify(await page.evaluate(detectar))
  expect.soft(prueba, 'el detector ve lo que se sale de su tarjeta').toContain('VALOR-QUE-SE-SALE')
  expect.soft(prueba, 'el detector ve dos textos que se pisan').toContain('PISADO-UNO')
})

test('cada aserción de lo que ve un rol cae en una ruta que se recorre', () => {
  // Una aserción cuya ruta se quitó de RUTAS no fallaría nunca: no se comprobaría.
  const alcanzables = new Set([...RUTAS, ...RUTAS.filter(r => ABRIR_BOMBA.has(r)).map(r => `${r} [detalle]`)])
  expect(Object.keys(ASERCIONES).filter(k => !alcanzables.has(k))).toEqual([])
})

for (const ancho of ANCHOS) {
  test.describe(`${ancho} px`, () => {
    test.use({ viewport: { width: ancho, height: 900 }, isMobile: ancho < 600 })

    test(`${RUTAS.length} rutas: nada se sale ni se pisa, ninguna vacía ni con errores, cada rol ve lo suyo`, async ({ page }) => {
      test.setTimeout(600_000)
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
      // estar (títulos de paneles técnicos) se busca tal cual.
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
        for (const t of a.no) { comprobaciones++; if (texto.includes(t)) fallasAsercion.push(`${clave}: sobra «${t}»`) }
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
        if (await cerrar.count()) { await cerrar.click(); await esperar(page, 250) }
        await detectarEn(ruta)
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
      }

      const orden = { pantalla: 0, sale: 1, recortado: 2, encimado: 3 }
      const lista = [...hallazgos.entries()]
        .sort((a, b) => orden[a[1].tipo] - orden[b[1].tipo] || b[1].donde.size - a[1].donde.size)
        .map(([clave, x]) => `[${x.tipo}] máx ${x.max}  ${clave}  · en ${x.donde.size}: ${[...x.donde].slice(0, 4).join(' · ')}${x.donde.size > 4 ? ' …' : ''}`)
      test.info().annotations.push({ type: 'auditoría', description: `${RUTAS.length} rutas · ${comprobaciones} comprobaciones de lo que ve cada rol · ${lista.length} hallazgos · ${errores.length} errores` })
      expect.soft([...new Set(fallasAsercion)], 'lo que cada rol ve').toEqual([])
      expect.soft([...new Set(errores)], 'errores de la página').toEqual([])
      expect.soft(lista, 'lo que se sale, se recorta, se pisa o queda vacío').toEqual([])
    })
  })
}
