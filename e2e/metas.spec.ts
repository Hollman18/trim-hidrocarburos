// De punta a punta en el navegador: metas firmadas, accesos y permisos.
import { test } from './apoyo.ts'

test('metas firmadas y accesos', async ({ flujo: f }) => {
  await f.abrir('/#/ger/configuracion/ceiba/curso')
  let t = ''

  await test.step('Metas', async () => {
    t = await f.texto()
    f.ok(t.includes('Incluye 1 día ya corrido (hoy)'), 'por defecto lo nuevo rige desde hoy (no reescribe en silencio los días corridos)')
    // Para medir el mes entero con la meta nueva se escoge el 1 a propósito.
    f.ok(await f.escribir('input[aria-label="Día desde el que rigen los cambios"]', '2026-10-01'), 'escoge el 1 de octubre')
    await f.esperar(200)
    f.ok(await f.escribir('input[aria-label="Meta de producción de La Ceiba, bbl/d"]', 11200), 'escribe la meta de producción de La Ceiba')
    await f.esperar(300)
    t = await f.texto()
    f.ok(t.includes('40.500'), 'la meta global se recalcula sola: 40.500')
    f.ok(t.includes('La Ceiba, desde el 1 de oct de 2026: producción 10.900 → 11.200 bbl/d'), 'la firma lista el cambio con su fecha')
    await f.clic('Firmar como')
    t = await f.texto()
    f.ok(/motivo/i.test(t), 'sin motivo no se puede firmar (el botón lo pide)')
    await f.escribir('input[placeholder^="Ej.: metas acordadas"]', 'Comité de producción de octubre')
    await f.clic('Firmar como'); await f.esperar(500)
    t = await f.texto()
    f.ok(t.includes('Versión 2') && t.includes('Comité de producción de octubre') && t.includes('Andrés Vélez · gerente de activo'), 'queda la versión 2, con motivo y quién firmó')
    await f.ir('#/ger/resumen/ceiba~portafolio/curso')
    // La pantalla se carga al abrirla: se espera su contenido, no un tiempo fijo.
    await f.esperarTexto('QUIÉN SE LOS LLEVA')
    t = await f.texto()
    f.ok(t.includes('meta 40.500'), 'el resumen del gerente ya mide contra 40.500')
    f.ok(t.includes('1.255.500'), 'y el total del mes es 40.500 × 31 = 1.255.500 bbl')
  })

  await test.step('Accesos', async () => {
    await f.ir('#/ger/configuracion/ceiba/curso'); await f.clic('Usuarios y accesos'); await f.esperar(300)
    f.ok(await f.clic('Cambiar el acceso de Marcela Ríos'), 'abre el cambio de Marcela Ríos'); await f.esperar(200)
    f.ok(await f.marcar('Morichal Norte'), 'le marca Morichal Norte')
    await f.escribir('input[placeholder^="Ej.: pasa a cubrir"]', 'Cubre también Morichal Norte')
    await f.clic('Guardar el cambio'); await f.esperar(300)
    t = await f.texto()
    f.ok(t.includes('Ingeniera de producción · La Ceiba, Morichal Norte, El Palmar') || t.includes('La Ceiba, El Palmar, Morichal Norte'), 'Marcela queda con Morichal Norte')
    f.ok(t.includes('Cubre también Morichal Norte'), 'el historial guarda el motivo')
    await f.ir('#/prod/produccion/morichal/curso')
    t = await f.textoPagina()
    f.ok(t.includes('Morichal Norte'), 'al entrar como producción, Morichal Norte ya está entre sus campos')
    await f.ir('#/ger/configuracion/ceiba/curso'); await f.clic('Usuarios y accesos'); await f.esperar(300)
    await f.clic('Invitar a una persona'); await f.esperar(200)
    await f.escribir('input[autocomplete="off"]:not([type=email])', 'Lucía Prada')
    await f.escribir('input[type=email]', 'lucia.prada@operadora.example')
    await f.escribir('input[placeholder^="Ej.: nuevo supervisor"]', 'Nueva supervisora de La Ceiba')
    await f.clic('Enviar la invitación'); await f.esperar(300)
    t = await f.texto()
    f.ok(t.includes('Escoja un rol') && t.includes('Escoja al menos un campo'), 'sin rol ni campo no se puede invitar (nada viene escogido de antemano)')
    await f.escribir('form select', 'sup'); await f.esperar(200)
    await f.clic('Enviar la invitación'); await f.esperar(300)
    t = await f.texto()
    f.ok(t.includes('Lucía Prada') && t.includes('invitado · aún no entra'), 'con rol (y sus campos de fábrica) invita a Lucía Prada y queda como invitada')
    await f.clic('Cambiar el acceso de Andrés Vélez'); await f.esperar(200)
    t = await f.texto()
    f.ok(!(await f.marcar('Suspender el acceso')) && await f.page.evaluate(() => document.querySelector<HTMLSelectElement>('form select')?.disabled === true) && t.includes('Su propio rol y su acceso los cambia otro gerente'),
      'en su propia fila el gerente no tiene cómo suspenderse ni cambiarse el rol')
  })

  await test.step('Hallazgos de QA', async () => {
    // Suspendido no firma: el gerente suspende a Hermes Leal (administrador) y se entra como administrador.
    await f.clic('Cambiar el acceso de Hermes Leal'); await f.esperar(200)
    await f.marcar('Suspender el acceso')
    await f.escribir('input[placeholder^="Ej.: pasa a cubrir"]', 'Prueba: deja la implementación')
    await f.clic('Guardar el cambio'); await f.esperar(300)
    await f.ir('#/adm/configuracion/ceiba/curso'); await f.esperar(300)
    await f.escribir('input[value="Operadora de demostración"]', 'Operadora de prueba'); await f.esperar(200)
    t = await f.texto()
    f.ok(t.includes('Nadie con acceso activo tiene este rol') && !t.includes('Firmar como Hermes Leal'), 'con Hermes Leal suspendido, el rol de administrador no tiene quién firme')
    // Lo deja como estaba para lo que sigue.
    await f.ir('#/ger/configuracion/ceiba/curso'); await f.clic('Usuarios y accesos'); await f.esperar(300)
    await f.clic('Cambiar el acceso de Hermes Leal'); await f.esperar(200)
    await f.marcar('Suspender el acceso')
    await f.escribir('input[placeholder^="Ej.: pasa a cubrir"]', 'Prueba: vuelve')
    await f.clic('Guardar el cambio'); await f.esperar(300)
    // Sus propios campos los cambia otro gerente (auditoría #71): en su fila no se tocan.
    await f.clic('Cambiar el acceso de Andrés Vélez'); await f.esperar(200)
    f.ok(await f.page.evaluate(() => {
      const l = [...document.querySelectorAll('label')].find(x => x.textContent.trim().startsWith('Todos los campos'))
      const i = l?.querySelector('input[type=checkbox]')
      return !!i && i.matches(':disabled') && (i as HTMLInputElement).checked
    }), 'el gerente no se cambia sus propios campos: en su fila la casilla de campos está cerrada')
    await f.clic('Cancelar'); await f.esperar(200)
  })

  await test.step('Permisos', async () => {
    await f.ir('#/adm/configuracion/ceiba/curso'); await f.esperar(300)
    t = await f.texto()
    f.ok(t.includes('TANQUES DE AGUA') && t.includes('MEMBRETE DE LOS INFORMES'), 'el administrador ve lo técnico')
    await f.clic('Metas de los campos'); await f.esperar(300)
    t = await f.texto()
    f.ok(t.includes('los fija y firma el gerente de activo')
      && await f.page.evaluate(() => document.querySelector<HTMLInputElement>('input[aria-label="Meta de producción de La Ceiba, bbl/d"]')?.disabled === true), 'y las metas las ve sin poder cambiarlas')
    await f.clic('Usuarios y accesos'); await f.esperar(300)
    t = await f.texto()
    f.ok(t.includes('Los accesos los da el gerente de activo') && !t.includes('Invitar a una persona'), 'los accesos, igual: solo lectura')
  })

  f.cerrar()
})
