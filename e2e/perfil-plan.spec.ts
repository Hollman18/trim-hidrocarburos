// De punta a punta en el navegador: el perfil del campo y el plan mes a mes.
import { test } from './apoyo.ts'

test('perfil del campo y plan mes a mes', async ({ flujo: f }) => {
  await f.abrir('/#/adm/configuracion/ceiba/curso')
  // F3 (P-04): el administrador abre en el estado; el perfil está en la configuración técnica, a un toque.
  await f.clic('Configuración técnica'); await f.esperar(300)
  let t = ''

  await test.step('Perfil del campo', async () => {
    t = await f.texto()
    f.ok(t.includes('Perfil del campo') && t.includes('15 pozos registrados'), 'el administrador ve el perfil de La Ceiba con lo que tiene registrado')
    f.ok(await f.marcar('Electrosumergibles'), 'le quita las electrosumergibles a La Ceiba'); await f.esperar(200)
    t = await f.texto()
    f.ok(t.includes('dejan de vigilarse') && t.includes('electrosumergibles sí → no'), 'avisa que quedan fuera y lo lista para firmar')
    await f.escribir('input[placeholder^="Ej.: nuevo certificado"]', 'Prueba: sin vigilancia de electrosumergibles')
    await f.clic('Firmar como'); await f.esperar(500)
    // B3 · A-15: Bombas y Electrosumergibles son filtros de Equipos: sin esa familia, el filtro de tipo no la ofrece.
    await f.ir('#/sup/equipos/ceiba'); await f.esperar(300)
    await f.page.locator('main [data-mas-filtros]').click(); await f.esperar(200)
    const tipos = await f.page.locator('main [role=radiogroup][aria-label="Tipo"] [data-opcion]').evaluateAll(es => es.map(e => e.getAttribute('data-opcion')).join(','))
    f.ok(!tipos.includes('electrosumergible') && tipos.includes('bomba'), `sin esa familia, el filtro de tipo de La Ceiba ya no ofrece Electrosumergibles (${tipos})`)
    await f.ir('#/sup/esp/ceiba/curso'); await f.esperar(400)
    const h = await f.hash()
    f.ok(h.includes('/equipos/'), 'una dirección a Electrosumergibles de La Ceiba abre Equipos')
    // Guacamayo sin gas: el administrador lo cambia y firma.
    await f.ir('#/adm/configuracion/guacamayo/curso'); await f.clic('Configuración técnica'); await f.esperar(400)
    // Antes esta comprobación terminaba en «|| true» y no podía fallar.
    f.ok(await f.escribir('select:not([aria-label])', 'no'), 'escoge «no tiene tren de gas»')
    await f.esperar(200)
    await f.escribir('input[placeholder^="Ej.: nuevo certificado"]', 'Prueba: Guacamayo sin gas')
    await f.clic('Firmar como'); await f.esperar(500)
    await f.ir('#/adm/planta/guacamayo/curso'); await f.esperar(500)
    t = await f.texto()
    f.ok(!t.includes('Tren de gas') && t.includes('no tiene tren de gas'), 'la planta de Guacamayo ya no dibuja tren de gas (C4: el rótulo del tren va en minúsculas, como B)')
  })

  await test.step('Plan mes a mes', async () => {
    await f.ir('#/ger/configuracion/ceiba/curso'); await f.esperar(400)
    f.ok(await f.clic('Plan mes a mes'), 'pasa al plan mes a mes'); await f.esperarTexto('Cargar el presupuesto')
    const pegado = '2026-11\tLa Ceiba\t11.200\t750\t48\n2026-12\tLa Ceiba\t11.400\t700\t48\n2026-11\tMorichal Norte\t17000\t900\t\n2026-09\tLa Ceiba\t1\t1\t'
    await f.escribir('textarea[aria-label="Filas del presupuesto"]', pegado)
    f.ok(await f.clic('Revisar'), 'revisa lo pegado'); await f.esperarTexto('Listas:')
    t = await f.texto()
    f.ok(t.includes('Listas: 3 filas') && t.includes('ya cerró'), 'revisa: 3 filas listas y avisa la de septiembre (mes cerrado)')
    f.ok(await f.clic('Pasar 3 filas al borrador'), 'pasa las filas al borrador'); await f.esperarTexto('desde el 1 de dic de 2026')
    t = await f.texto()
    f.ok(t.includes('La Ceiba, desde el 1 de nov de 2026') && t.includes('La Ceiba, desde el 1 de dic de 2026'), 'cada mes queda como un cambio con su fecha en la firma')
    await f.escribir('input[placeholder^="Ej.: presupuesto"]', 'Presupuesto 2027 aprobado')
    f.ok(await f.clic('Firmar como'), 'firma'); await f.esperarTexto('Firmada la versión')
    t = await f.texto()
    // «Plan mes a mes» también es el selector: lo que solo está en el plan es «Cargar el presupuesto».
    f.ok(t.includes('Firmada la versión') && t.includes('Cargar el presupuesto'), 'firma el plan y se queda en el plan')
    f.ok(t.includes('cifra propia'), 'los meses con cifra del presupuesto se marcan como propios')
  })

  f.cerrar()
})
