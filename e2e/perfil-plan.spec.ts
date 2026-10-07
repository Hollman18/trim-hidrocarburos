// De punta a punta en el navegador: el perfil del campo y el plan mes a mes.
import { test } from './apoyo.ts'

test('perfil del campo y plan mes a mes', async ({ flujo: f }) => {
  await f.abrir('/#/adm/configuracion/ceiba/curso')
  let t = ''

  await test.step('Perfil del campo', async () => {
    t = await f.texto()
    f.ok(t.includes('PERFIL DEL CAMPO') && t.includes('15 pozos con electrosumergible en el registro'), 'el administrador ve el perfil de La Ceiba con lo que tiene registrado')
    f.ok(await f.marcar('Electrosumergibles'), 'le quita las electrosumergibles a La Ceiba'); await f.esperar(200)
    t = await f.texto()
    f.ok(t.includes('dejan de vigilarse') && t.includes('electrosumergibles sí → no'), 'avisa que quedan fuera y lo lista para firmar')
    await f.escribir('input[placeholder^="Ej.: nuevo certificado"]', 'Prueba: sin vigilancia de electrosumergibles')
    await f.clic('Firmar como'); await f.esperar(500)
    await f.ir('#/sup/bombas/ceiba/curso'); await f.esperar(300)
    // S5: las subpantallas dejaron de ser role=tab (navegación con aria-current, #69).
    const tabs = await f.page.evaluate(() => [...document.querySelectorAll('[data-subpantallas] button')].map(b => b.textContent.trim()).join(','))
    f.ok(!tabs.includes('Electrosumergibles') && tabs.includes('Bombas'), `sin esa familia, «Pozos y equipos» de La Ceiba ya no ofrece Electrosumergibles (${tabs})`)
    await f.ir('#/sup/esp/ceiba/curso'); await f.esperar(400)
    const h = await f.hash()
    f.ok(h.includes('/bombas/') || h.includes('/pozos/'), 'una dirección a Electrosumergibles de La Ceiba cae en otra subpantalla')
    // Guacamayo sin gas: el administrador lo cambia y firma.
    await f.ir('#/adm/configuracion/guacamayo/curso'); await f.esperar(400)
    // Antes esta comprobación terminaba en «|| true» y no podía fallar.
    f.ok(await f.escribir('select:not([aria-label])', 'no'), 'escoge «no tiene tren de gas»')
    await f.esperar(200)
    await f.escribir('input[placeholder^="Ej.: nuevo certificado"]', 'Prueba: Guacamayo sin gas')
    await f.clic('Firmar como'); await f.esperar(500)
    await f.ir('#/adm/planta/guacamayo/curso'); await f.esperar(500)
    t = await f.texto()
    f.ok(!t.includes('TREN DE GAS') && t.includes('no tiene tren de gas'), 'la planta de Guacamayo ya no dibuja tren de gas')
  })

  await test.step('Plan mes a mes', async () => {
    await f.ir('#/ger/configuracion/ceiba/curso'); await f.esperar(400)
    f.ok(await f.clic('Plan mes a mes'), 'pasa al plan mes a mes'); await f.esperarTexto('CARGAR EL PRESUPUESTO')
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
    f.ok(t.includes('Firmada la versión') && t.includes('PLAN MES A MES'), 'firma el plan y se queda en el plan')
    f.ok(t.includes('cifra propia'), 'los meses con cifra del presupuesto se marcan como propios')
  })

  f.cerrar()
})
