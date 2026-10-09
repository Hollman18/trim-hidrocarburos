// De punta a punta: carril caliente (WhatsApp), SAP, aciertos, asignación oficial y lo que ve cada rol.
import { test } from './apoyo.ts'

test('carril caliente, SAP, aciertos y perfiles', async ({ flujo: f }) => {
  await f.abrir('/#/oper/causa/ceiba/curso')
  const page = f.page
  let t = ''
  // La cifra de un panel de Identificar, por su título: no depende de la marca de prioridad que va al lado.
  const cifra = (titulo: string) => page.evaluate(x => [...document.querySelectorAll('main h2')].find(h => h.textContent === x)?.nextElementSibling?.textContent ?? '', titulo)

  await test.step('Identificar: causas sugeridas y el hilo de WhatsApp', async () => {
    t = await f.texto()
    f.ok(await cifra('POR IDENTIFICAR · SIN ARRANCAR') === '2 sin arrancar', 'antes de responder: 2 pendientes')
    f.ok(t.includes('Pista · historia del equipo') && /· \d+ de \d+ fallas?/.test(t), 'la bomba trae las sugeridas de su historia, con su porqué (fallas anteriores)')
    f.ok(!t.includes('señal e historia'), 'no se le atribuye a la señal lo que viene de la historia')
    f.ok(await f.clic('Sello mecánico'), 'se puede escoger la sugerida con un toque')
    await f.esperar(200)
    const sel = await (await f.lista({ opcion: 'sello' }))?.evaluate(s => s.value)
    f.ok(sel === 'sello', `la sugerida llena la parte de la bomba (${sel})`)
    const marcada = await page.evaluate(() => [...document.querySelectorAll('button[aria-pressed="true"]')].some(b => b.textContent.startsWith('Sello mecánico')))
    f.ok(marcada, 'la sugerida escogida queda marcada (aria-pressed)')
    const alto = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(x => x.textContent.startsWith('Sello mecánico'))
      return b ? b.getBoundingClientRect().height : 0
    })
    f.ok(alto >= 18, `la sugerida tiene un alto usable en escritorio (${Math.round(alto)} px; en el teléfono, 40)`)
    const linea = await page.evaluate(() => ([...document.querySelectorAll('h5')].find(h => h.textContent === 'WHATSAPP')?.nextElementSibling as HTMLElement | null)?.innerText ?? '')
    // El tanque aguanta 1,8 h (P-201A y P-201C toman parte del agua): los pozos se empiezan a cerrar antes del escalado.
    f.ok(/^03:53 parado → 03:53 pregunta → 04:22 recordatorio → 05:44 pozos cerrándose → 05:52 escalado\s+sin respuesta$/.test(linea), `el hilo en una línea, en orden (${linea})`)
    // A quién le llegó cada paso ya no va en la línea: está en el globo y sale escrito en el papel.
    const papel = await page.evaluate(() => ([...document.querySelectorAll('h5')].find(h => h.textContent === 'WHATSAPP')?.nextElementSibling?.nextElementSibling)?.textContent ?? '')
    f.ok(/03:53 pregunta: Jairo Peña · 04:22 recordatorio: Jairo Peña · 05:44 pozos cerrándose: Jairo Peña, Nelson Ortiz · 05:52 escalado: Nelson Ortiz/.test(papel), 'a quién le llegó cada paso: en el globo y en el papel')
    t = await f.texto()
    f.ok(t.includes('DATOS DE DEMOSTRACIÓN') && !t.includes('Demo · simular') && !t.includes('en este demo'), 'una sola marca de demostración en la cabecera; ninguna nota de demo en la pantalla')
    // En pantalla, «Otra cosa» como lo que vio exige escribirlo.
    f.ok(await f.clic('Otra cosa'), 'en pantalla escoge «Otra cosa» como lo que vio en el sello')
    await f.enviar(await f.lista({ valor: 'sello' })); await f.esperar(300)
    t = await f.texto()
    f.ok(t.includes('Escribió «Otra cosa»: diga qué vio'), '«Otra cosa» sin escribir qué vio no entra')
    f.ok(await f.clic('Ver mi chat de WhatsApp'), 'el operador abre su propio chat de WhatsApp a un clic')
    await f.esperar(300)
    t = await f.texto()
    f.ok(t.includes('cuenta de empresa verificada') && t.includes('Responda con un número') && t.includes('1) Sello mecánico'), 'el teléfono muestra la pregunta tal como le llegó')
    f.ok(await f.clic('0Otra cosa'), 'responde «0» desde el teléfono')
    await f.esperar(200)
    await f.escribir('input[aria-label="Escribir la respuesta"]', 'corto')
    await f.enviar(await page.$('input[aria-label="Escribir la respuesta"]')); await f.esperar(300)
    t = await f.texto()
    f.ok(t.includes('Con «0» hay que escribir qué encontró'), '«0» con un texto muy corto no entra y TRIM lo dice en el chat')
    f.ok(await f.clic('↩Volver a las opciones'), 'desde el texto se puede volver a las opciones')
    await f.esperar(200)
    f.ok(await f.clic('3Otra parte del equipo'), 'pide ver todas las partes de la bomba')
    await f.esperar(200)
    t = await f.texto()
    f.ok(t.includes('¿Qué parte?') && t.includes('Impulsores y desgaste interno'), 'TRIM le manda todas las partes del catálogo')
    f.ok(await f.clic('↩Escoger otra parte'), 'y puede volver a las opciones')
    await f.esperar(200)
    f.ok(await f.clic('1Sello mecánico'), 'escoge la parte: un toque')
    await f.esperar(300)
    t = await f.texto()
    f.ok(t.includes('¿Qué vio en sello mecánico?'), 'TRIM pregunta qué vio, con el catálogo de esa parte')
    f.ok(await f.clic('1Fuga hacia afuera'), 'escoge lo que vio: segundo toque')
    await f.esperar(500)
    t = await f.texto()
    f.ok(await cifra('POR IDENTIFICAR · SIN ARRANCAR') === '1 sin arrancar', 'P-201B sale de lo pendiente (quedan 1 de 2)')
    f.ok(t.includes('Sello mecánico · fuga hacia afuera') && !t.includes('vio: fuga hacia afuera') && t.includes('por WhatsApp'), 'queda en DECLARADAS dicho una vez: parte · lo que vio, por WhatsApp')
    f.ok(t.includes('Respondido: P-201B (por WhatsApp') && t.includes('Pasó a «Declaradas»'), 'y se confirma arriba: respondido y a dónde pasó')
  })

  await test.step('Identificar: un pozo con electrosumergible se responde con sus partes', async () => {
    const partesEsp = { opcion: 'aislamiento' }
    f.ok(await f.lista(partesEsp) !== null, 'el pozo LC-08 (electrosumergible) ofrece las partes de la electrosumergible')
    f.ok(t.includes('No fue la electrosumergible'), 'y la salida «no fue la electrosumergible»')
    await f.escoger(await f.lista(partesEsp), 'motor')
    await f.esperar(200)
    await f.enviar(await f.lista(partesEsp)); await f.esperar(200)
    t = await f.texto()
    f.ok(t.includes('Diga qué vio en esa parte'), 'con la parte y sin lo que vio, no entra')
    f.ok(await f.clic('Recalentada'), 'escoge lo que vio en el motor de fondo')
    await f.enviar(await f.lista(partesEsp)); await f.esperar(500)
    t = await f.texto()
    f.ok(t.includes('Motor de fondo · recalentada'), 'LC-08 queda declarada con la parte de la electrosumergible y lo que vio')
    f.ok(/LC-08[^\n]*\n[^\n]*Motor de fondo · recalentada[\s\S]{0,160}disparo, no falla/.test(t), 'LC-08: la etiqueta «disparo, no falla»')
    f.ok(await page.locator('main [data-declarada] [aria-label^="Disparo: Arrancó en"]').count() === 1, 'y su porqué: arrancó en menos de un día, cuenta como disparo')
  })

  await test.step('Análisis: confiabilidad completa mecanismo y causa raíz', async () => {
    await f.ir('#/jefe/causa/ceiba/curso'); await f.esperar(500)
    f.ok(await f.clic('Completar el análisis'), 'el jefe de mantenimiento abre el análisis de una falla declarada')
    await f.esperar(200)
    const preMec = await (await f.lista({ opcion: '1.1' }))?.evaluate(s => s.value)
    f.ok(preMec === '1.1', `el mecanismo arranca en el que suele tener lo que se vio (fuga → 1.1): ${preMec}`)
    // La causa raíz: la lista corta (hasta 7) que tiene la opción 5.
    await f.escoger(await f.lista({ opcion: '5', maxOpciones: 7 }), '3')
    await f.esperar(200)
    f.ok(await f.clic('Guardar el análisis'), 'lo guarda')
    await f.esperar(400)
    t = await f.texto()
    f.ok(/Análisis: 1\.1 fuga · causa raíz: operación o mantenimiento/.test(t), 'el análisis queda con mecanismo (B.2), causa raíz (B.3) y quién lo hizo')
    f.ok(await page.evaluate(() => document.activeElement?.textContent?.startsWith('Análisis: 1.1') ?? false), 'al guardar, el foco queda en el análisis guardado')
    f.ok(t.includes('Corregir'), 'y se puede corregir después')
  })

  await test.step('Turno: el registro por hilo', async () => {
    await f.ir('#/sup/turno/ceiba/curso'); await f.esperar(400)
    t = await f.texto()
    f.ok(t.includes('WHATSAPP DEL TURNO') && /respondió Jairo Peña[^\n]*por WhatsApp: «Sello mecánico: fuga hacia afuera»/.test(t), 'Turno muestra el hilo de P-201B con la respuesta')
    f.ok(t.includes('pozos cerrándose') && t.includes('escalado') && t.includes('orden liberada en SAP'), 'cada paso con su nombre: pozos cerrándose, escalado, orden liberada')
    // Con un título que falte, indexOf da −1 y la comparación pasaba sin comprobar nada.
    const nuevas = t.indexOf('PARADAS NUEVAS'), registro = t.indexOf('WHATSAPP DEL TURNO')
    f.ok(nuevas >= 0 && registro > nuevas, 'el registro va después de las paradas nuevas del turno')
  })

  await test.step('Mi trabajo: órdenes de SAP del técnico', async () => {
    await f.ir('#/tec/trabajo/ceiba/curso'); await f.esperar(400)
    t = await f.texto()
    f.ok(t.includes('ÓRDENES EN SAP') && t.includes('40012056') && t.includes('a su nombre') && t.includes('TRIM le avisó por WhatsApp'), 'el técnico ve su orden liberada y el aviso de WhatsApp')
    const marcasEnOrdenes = await page.evaluate(() => {
      const h = [...document.querySelectorAll('*')].find(e => e.children.length === 0 && e.textContent.trim() === 'ÓRDENES EN SAP')
      const panel = h?.closest('section') ?? h?.parentElement?.parentElement?.parentElement
      return panel ? panel.querySelectorAll('svg[role="img"]').length : -1
    })
    f.ok(marcasEnOrdenes === 0, `la prioridad de SAP no se dibuja como alarma (${marcasEnOrdenes} marcas en el panel)`)
    f.ok(t.includes('liberada a su nombre: vea «Órdenes en SAP»') && !t.includes('la primera en ya fuera'), 'lo que hay que hacer con K-101 no se repite: remite a la orden')
  })

  await test.step('Confiabilidad: ¿acierta el vigía?', async () => {
    await f.ir('#/conf/confiabilidad/morichal/curso'); await f.esperar(500)
    t = await f.texto()
    f.ok(t.includes('¿ACIERTA EL VIGÍA?') && t.includes('LO QUE ANUNCIÓ Y EN QUÉ QUEDÓ') && /Fallas anticipadas\s*\d+ de \d+/.test(t) && /Anticipación\s*[\d,]+ d/.test(t), 'el historial de aciertos poblado: tasa, fallas anticipadas y anticipación')
    f.ok(t.includes('Se le escaparon') && t.includes('falsa alarma') && t.includes('intervenida antes'), 'realista: se le escaparon fallas, tuvo falsas alarmas y predicciones intervenidas')
    f.ok(!t.includes('no se afirma') && !t.includes('sin registro anterior'), 'ya no habla de que no hay registro')
    f.ok(/En seguimiento\s*4/.test(t), 'Morichal: cuatro predicciones en seguimiento')
  })

  await test.step('Producción: cuadre con la asignación oficial', async () => {
    await f.ir('#/prod/produccion/ceiba/curso'); await f.esperar(500)
    const opciones = await page.evaluate(() => [...document.querySelectorAll('select')].flatMap(s => [...s.options].map(o => o.textContent)).join('|'))
    f.ok(opciones.includes('septiembre de 2026') && !opciones.includes('octubre de 2026'), 'el mes en curso no se ofrece para cotejar')
    await f.escribir('textarea[aria-label="Filas de la asignación oficial"]', 'Mes;Campo;Pozo;Crudo;Horas\n2026-09;La Ceiba;LC-11;40000;\n2026-09;La Ceiba;LC-08;abc;')
    await f.clic('Cotejar'); await f.esperar(400)
    t = await f.texto()
    f.ok(t.includes('No se cargó nada') && !t.includes('pozos cotejados'), 'con una fila mala no se carga nada (si no, ese pozo saldría como «falta»)')
    // Sin motivo no se reemplaza la oficial: la carga deja rastro de quién, cuándo y por qué (cambio a propósito, R16).
    await f.escribir('textarea[aria-label="Filas de la asignación oficial"]', 'Mes;Campo;Pozo;Crudo;Horas\n2026-09;La Ceiba;LC-11;40000;\n2026-09;La Ceiba;ZZ-99;100;')
    await f.clic('Cotejar'); await f.esperar(400)
    t = await f.texto()
    f.ok(t.includes('Falta el motivo') && !t.includes('pozos cotejados'), 'sin motivo no se carga: se pide de dónde sale la asignación')
    await f.escribir('input[aria-label="Motivo de la carga"]', 'Asignación de septiembre reportada a la ANH')
    await f.escribir('textarea[aria-label="Filas de la asignación oficial"]', 'Mes;Campo;Pozo;Crudo;Horas\n2026-09;La Ceiba;LC-11;40000;\n2026-09;La Ceiba;ZZ-99;100;')
    f.ok(await f.clic('Cotejar'), 'coteja lo pegado')
    await f.esperar(500)
    t = await f.texto()
    f.ok(/Cargada el .+ por Marcela Ríos · ingeniera de producción: «Asignación de septiembre reportada a la ANH»/.test(t) && t.includes('Rastro de las cargas'),
      'la carga queda a la vista con quién, cuándo y por qué, y con el rastro de las cargas')
    f.ok(t.includes('TRIM no tiene ZZ-99 en La Ceiba'), 'el pozo que TRIM no conoce se dice primero, como dato inválido')
    f.ok(/Faltan 17 pozos de La Ceiba/.test(t) && t.includes('¿está completo el archivo?'), 'los pozos que faltan van en una línea, no como 17 filas de diferencia')
    f.ok(/La oficial suma [\d.]+ bbl menos que lo que midió/.test(t) && !/difieren en -/.test(t), 'la diferencia de totales se dice en palabras, sin un número negativo')
    f.ok(/1 de 1 pozo cotejado|de 1 pozo cotejado/.test(t), 'solo se cotejan los pozos que están en las dos')
  })

  await test.step('Conectores: SAP y WhatsApp como conectados', async () => {
    await f.ir('#/adm/conectores/ceiba/curso'); await f.esperar(600)
    t = await f.texto()
    f.ok(t.includes('SISTEMAS CORPORATIVOS') && t.includes('SAP S/4HANA') && t.includes('WhatsApp Business') && /conectado/i.test(t), 'Conectores muestra SAP PM y WhatsApp Business conectados')
    f.ok(t.includes('trim_que_se_dano') && t.includes('CATÁLOGOS DE DAÑO'), 'con las plantillas aprobadas y los catálogos de daño por clase')
  })

  await test.step('Accesos de solo lectura: el administrador ve la forma mínima del contrato', async () => {
    await f.ir('#/adm/configuracion/ceiba/curso')
    f.ok(await f.clic('Usuarios y accesos'), 'el administrador abre «Usuarios y accesos»')
    await f.esperarTexto('USUARIOS Y ACCESOS')
    t = await f.texto()
    f.ok(!t.includes('Esta pantalla no se pudo mostrar') && t.includes('Andrés Vélez') && t.includes('Solo lectura: los da el gerente de activo'), 'la lista se dibuja, de solo lectura, sin caerse')
    f.ok(!t.includes('andres.velez@') && t.includes('hermes.leal@'), 'sin administrar no ve el correo de los demás; el suyo sí')
  })

  await test.step('Perfiles: cada rol ve las pantallas que su decisión exige', async () => {
    const menu = () => page.evaluate(() => [...document.querySelectorAll('nav button[aria-current]')].map(b => b.textContent.trim()).filter(Boolean))
    for (const [ruta, debe, noDebe] of [
      ['#/ger/resumen/ceiba/curso', ['Resumen', 'Diferidos', 'Producción', 'Riesgo', 'Configuración'], ['Equipos', 'Pozos y equipos', 'Turno']],
      ['#/prod/produccion/ceiba/curso', ['Producción', 'Diferidos', 'Pozos y equipos', 'Identificar', 'Planta'], ['Turno', 'Riesgo']],
      ['#/sup/bombas/ceiba/curso', ['Pozos y equipos', 'Turno', 'Identificar'], ['Riesgo', 'Planta']],
      ['#/oper/bombas/ceiba/curso', ['Equipos', 'Identificar', 'Turno'], ['Riesgo', 'Planta']],
      ['#/jefe/mantenimiento/ceiba/curso', ['Mantenimiento', 'Diferidos', 'Equipos', 'Superficie', 'Confiabilidad', 'Riesgo', 'Identificar'], ['Equipo']],
      ['#/conf/bombas/morichal/curso', ['Equipos', 'Superficie', 'Confiabilidad', 'Diferidos', 'Riesgo', 'Identificar', 'Planta'], ['Equipo']],
      ['#/tec/trabajo/ceiba/curso', ['Mi trabajo', 'Equipos', 'Identificar'], ['Riesgo', 'Planta']],
      ['#/adm/configuracion/ceiba/curso', ['Configuración', 'Conectores', 'Planta'], ['Resumen']],
    ] as const) {
      await f.ir(ruta); await f.esperar(300)
      const m = await menu()
      const faltan = debe.filter(x => !m.includes(x)), sobran = noDebe.filter(x => m.includes(x))
      f.ok(!faltan.length && !sobran.length, `${ruta.split('/')[1]}: menú ${m.join(' · ')}${faltan.length ? ' · FALTA ' + faltan.join(', ') : ''}${sobran.length ? ' · SOBRA ' + sobran.join(', ') : ''}`)
    }
    await f.ir('#/sup/riesgo/ceiba/curso'); await f.esperar(300)
    const h = await f.hash()
    f.ok(h.includes('/sup/bombas/'), `una dirección vieja a una pantalla quitada lleva al inicio del rol (${h})`)
    await f.ir('#/ger/riesgo/ceiba/curso'); await f.esperar(400)
    f.ok(await f.clicQueContenga('P-201B'), 'el gerente abre P-201B desde Riesgo')
    await f.esperar(500)
    t = await f.textoPagina()
    f.ok(t.includes('Le ha costado'), 'y ve su ficha ejecutiva sin tener «Equipos» en el menú')
    await f.ir('#/prod/diferidos/ceiba/curso'); await f.esperar(500)
    f.ok(await f.clicQueContenga('P-201B'), 'producción abre P-201B desde «a qué equipo se le cargan»')
    await f.esperar(500)
    t = await f.textoPagina()
    f.ok(t.includes('HISTORIA DEL PLC') && /\d+ eventos? con pozos cerrados · [\d.]+ bbl/.test(t) && t.includes('SAP · MANTENIMIENTO'), 'y ve lo que se le cargó a la bomba, su historia del PLC y SAP, sin tener «Bombas» en el menú')
    await f.ir('#/conf/confiabilidad/morichal/curso'); await f.esperar(500)
    t = await f.texto()
    f.ok(t.includes('REPARACIÓN ACTIVA Y ESPERA') && t.includes('Reparación activa') && t.includes('Espera'), 'confiabilidad tiene los tres relojes en su pantalla')
    await f.ir('#/ger/resumen/ceiba/curso'); await f.esperar(500)
    t = await f.texto()
    // La cifra tiene que ser un renglón propio justo antes del rótulo: con «\s*» suelto
    // tomaba el «+125 %» del renglón de arriba aunque faltara el porcentaje.
    f.ok(/(?:^|\n)\d+ %\s*\n\s*mantenimiento proactivo/i.test(t), 'el gerente ve el porcentaje de mantenimiento proactivo en su Resumen')
  })

  await test.step('Accesos: el registro de lo enviado no se reescribe', async () => {
    await f.ir('#/ger/configuracion/ceiba/curso'); await f.esperar(400)
    await f.clic('Usuarios y accesos'); await f.esperar(400)
    f.ok(await f.clic('Cambiar el acceso de Jairo Peña'), 'abre el acceso del operador')
    await f.esperar(300)
    await f.marcar('Suspender el acceso')
    await f.escribir('input[placeholder^="Ej.: pasa a cubrir"]', 'prueba: deja la operación')
    await f.clic('Guardar el cambio'); await f.esperar(500)
    await f.ir('#/sup/causa/ceiba/curso'); await f.esperar(500)
    // A quién le llegó cada paso está en el globo y en la nota del papel (textContent la incluye).
    const todo = await page.evaluate(() => document.querySelector('main')?.textContent ?? '')
    f.ok(/pregunta: Jairo Peña/.test(todo), 'suspender al operador no borra lo que ya se le mandó: el hilo sigue diciendo a quién fue')
  })

  f.cerrar()
})
