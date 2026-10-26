// De punta a punta en el navegador: «atrás» tras una redirección y los meses que heredan.
import { test } from './apoyo.ts'

test('atrás tras una redirección y meses que heredan', async ({ flujo: f }) => {
  await f.abrir('/#/prod/pozos/ceiba/curso')
  let t = ''

  await test.step('Atrás después de una redirección', async () => {
    await f.ir('#/prod/esp/palmar/curso'); await f.esperar(500)
    const llego = await f.hash()
    await f.page.evaluate(() => history.back()); await f.esperar(900)
    const volvio = await f.hash()
    // C4: Equipos es la primera de su puerta: una subpantalla que el campo no tiene lleva a ella.
    f.ok((llego.includes('/equipos/palmar') || llego.includes('/pozos/palmar')) && volvio.includes('/pozos/ceiba'), `«atrás» sale de la redirección (${llego} → ${volvio})`)
  })

  await test.step('Meses que heredan', async () => {
    await f.ir('#/ger/configuracion/ceiba/curso'); await f.clic('Plan mes a mes'); await f.esperar(300)
    await f.escribir('input[aria-label="Producción de La Ceiba en noviembre de 2026, bbl/d"]', 12000); await f.esperar(300)
    const dic = await f.page.locator('input[aria-label="Producción de La Ceiba en diciembre de 2026, bbl/d"]').inputValue()
    f.ok(dic === '12000', `diciembre muestra lo que hereda de noviembre (${dic})`)
    await f.escribir('input[aria-label="Producción de La Ceiba en diciembre de 2026, bbl/d"]', 10900); await f.esperar(300)
    t = await f.texto()
    f.ok(t.includes('La Ceiba, desde el 1 de dic de 2026'), 'volver diciembre a 10.900 sí queda como cambio (no se pierde)')
    await f.escribir('textarea[aria-label="Filas del presupuesto"]', 'Mes;Campo;Producción\nnov-26;La Ceiba;352.000;750'); await f.clic('Revisar'); await f.esperar(300)
    t = await f.texto()
    // Antes «veces» y «del mes» sueltos: los cumplían otros textos de la pantalla.
    f.ok(/veces la meta de hoy/.test(t) && t.includes('son del mes y no bbl/d'), 'avisa que 352.000 bbl/d parece una cifra del mes')
  })

  f.cerrar()
})
