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
    // B-02: el operador tiene una sola lista, «Por contestar»: lo del libro y lo del árbol, juntos.
    f.ok((await cifra('Por contestar')).startsWith('4 paradas'), 'antes de responder: 4 paradas por contestar')
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
    const linea = await page.evaluate(() => ([...document.querySelectorAll('h3, h5')].find(h => h.textContent === 'WhatsApp')?.nextElementSibling as HTMLElement | null)?.innerText ?? '')
    // El tanque aguanta 1,8 h (P-201A y P-201C toman parte del agua): los pozos se empiezan a cerrar antes del escalado.
    f.ok(/^03:53 parado → 03:53 pregunta → 04:22 recordatorio → 05:44 pozos cerrándose → 05:52 escalado\s+sin respuesta$/.test(linea), `el hilo en una línea, en orden (${linea})`)
    // A quién le llegó cada paso ya no va en la línea: está en el globo y sale escrito en el papel.
    const papel = await page.evaluate(() => ([...document.querySelectorAll('h3, h5')].find(h => h.textContent === 'WhatsApp')?.nextElementSibling?.nextElementSibling)?.textContent ?? '')
    f.ok(/03:53 pregunta: Jairo Peña · 04:22 recordatorio: Jairo Peña · 05:44 pozos cerrándose: Jairo Peña, Nelson Ortiz · 05:52 escalado: Nelson Ortiz/.test(papel), 'a quién le llegó cada paso: en el globo y en el papel')
    t = await f.texto()
    // F1 (UI-22): «Datos de demostración», en frase y en la línea de las migas.
    f.ok(t.includes('Datos de demostración') && !t.includes('Demo · simular') && !t.includes('en este demo'), 'una sola marca de demostración en la cabecera; ninguna nota de demo en la pantalla')
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
    f.ok((await cifra('Por contestar')).startsWith('3 paradas'), 'P-201B sale de lo que tiene por contestar (quedan 3 de 4)')
    f.ok(t.includes('Sello mecánico · fuga hacia afuera') && !t.includes('vio: fuga hacia afuera') && t.includes('por WhatsApp'), 'queda en DECLARADAS dicho una vez: parte · lo que vio, por WhatsApp')
    f.ok(t.includes('Respondido: P-201B (por WhatsApp') && t.includes('Pasó a «Declaradas»'), 'y se confirma arriba: respondido y a dónde pasó')
  })

  await test.step('Identificar: un pozo con electrosumergible se responde con sus partes', async () => {
    const partesEsp = { opcion: 'aislamiento' }
    // F1 (P-causa-1): una parada abierta a la vez; LC-08 se abre tocando su fila.
    const fila = page.locator('main button[data-parada]', { hasText: 'LC-08' })
    if (await fila.count()) { await fila.first().click(); await f.esperar(200); t = await f.texto() }
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
    f.ok(t.includes('WhatsApp del turno') && /respondió Jairo Peña[^\n]*por WhatsApp: «Sello mecánico: fuga hacia afuera»/.test(t), 'Turno muestra el hilo de P-201B con la respuesta')
    f.ok(t.includes('pozos cerrándose') && t.includes('escalado') && t.includes('orden liberada en SAP'), 'cada paso con su nombre: pozos cerrándose, escalado, orden liberada')
    // Con un título que falte, indexOf da −1 y la comparación pasaba sin comprobar nada.
    const nuevas = t.indexOf('Paradas nuevas'), registro = t.indexOf('WhatsApp del turno')
    f.ok(nuevas >= 0 && registro > nuevas, 'el registro va después de las paradas nuevas del turno')
  })

  // F1 (P-trabajo-1; X4 §3.6.3 y §3.7): Mi trabajo se fundió en Hoy del técnico; su dirección abre Hoy.
  await test.step('Hoy del técnico: su orden de SAP, con el aviso de WhatsApp (antes, Mi trabajo)', async () => {
    await f.ir('#/tec/trabajo/ceiba/curso'); await f.esperar(400)
    f.ok((await f.hash()).startsWith('#/tec/hoy/'), `la dirección de Mi trabajo abre Hoy (${await f.hash()})`)
    const orden = page.locator('main [data-tarea="orden"]').filter({ hasText: 'K-101' })
    t = await orden.innerText()
    f.ok(t.includes('40012056') && t.includes('le llegó por WhatsApp') && t.includes('Verificar que las tres unidades'), `el técnico ve su orden, lo que hay que hacer y el aviso de WhatsApp («${t.replace(/\s+/g, ' ').slice(0, 160)}»)`)
    f.ok(await orden.locator('svg[role="img"][aria-label^="Prioridad"]').count() === 0, 'la prioridad de SAP no se dibuja como alarma: la marca es la del equipo')
  })

  // F2 (P-conf-1): «¿Le creo al vigía?» (el nombre de Resultados) en una línea; el historial, detrás de «Ver lo que anunció».
  await test.step('Confiabilidad: ¿le creo al vigía?', async () => {
    await f.ir('#/conf/confiabilidad/morichal/curso'); await f.esperar(500)
    t = await f.texto()
    f.ok(t.includes('¿Le creo al vigía?') && !t.includes('¿Acierta el vigía?') && !t.includes('Lo que anunció y en qué quedó'), 'la línea del vigía a la vista; su historial, detrás de un toque')
    f.ok(await f.clic('Ver lo que anunció'), 'abre lo que anunció el vigía'); await f.esperar(300)
    t = await f.texto()
    f.ok(t.includes('Lo que anunció y en qué quedó') && /Fallas anticipadas\s*\d+ de \d+/.test(t) && /Anticipación\s*[\d,]+ d/.test(t), 'el historial de aciertos poblado: tasa, fallas anticipadas y anticipación')
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
    f.ok(t.includes('Sistemas corporativos') && t.includes('SAP S/4HANA') && t.includes('WhatsApp Business') && /conectado/i.test(t), 'Conectores muestra SAP PM y WhatsApp Business conectados')
    f.ok(t.includes('trim_que_se_dano') && t.includes('Catálogos de daño'), 'con las plantillas aprobadas y los catálogos de daño por clase')
  })

  await test.step('Accesos de solo lectura: el administrador ve la forma mínima del contrato', async () => {
    await f.ir('#/adm/configuracion/ceiba/curso')
    f.ok(await f.clic('Usuarios y accesos'), 'el administrador abre «Usuarios y accesos»')
    await f.esperarTexto('Quién entra')
    t = await f.texto()
    f.ok(!t.includes('Esta pantalla no se pudo mostrar') && t.includes('Andrés Vélez') && t.includes('Solo lectura: los da el gerente de activo'), 'la lista se dibuja, de solo lectura, sin caerse')
    f.ok(!t.includes('andres.velez@') && t.includes('hermes.leal@'), 'sin administrar no ve el correo de los demás; el suyo sí')
  })

  await test.step('Perfiles: cada rol ve las pantallas que su decisión exige', async () => {
    // C1 (experiencia v2): el menú es el panel lateral, con las puertas del rol y, debajo de la
    // puerta abierta, sus subpantallas; lo que el rol tiene fuera de sus puertas va en el menú de la
    // persona. Se recorre todo: cada puerta, sus subpantallas y ese menú. Lo que cada rol alcanza es
    // lo mismo que antes (con La planta viva y Hoy), y lo que no le toca sigue sin estar.
    const alcanza = async () => {
      const nav = 'nav[aria-label="Navegación"]'
      const puertas = await page.locator(`${nav} [role=group][aria-label="Puertas"] > div > button`).count()
      const vistas = new Set<string>()
      for (let i = 0; i < puertas; i++) {
        const puerta = page.locator(`${nav} [role=group][aria-label="Puertas"] > div > button`).nth(i)
        vistas.add((await puerta.innerText()).split('\n')[0]!.trim())
        await puerta.click(); await f.esperar(350)
        for (const x of await page.locator(`${nav} [data-subpantallas] button`).evaluateAll(bs => bs.map(b => b.textContent?.trim() || b.getAttribute('aria-label') || ''))) vistas.add(x)
      }
      await page.locator(`${nav} button[aria-label*=" · "]`).first().click(); await f.esperar(250)
      for (const x of await page.locator('[role=group][aria-label="Mi perfil"] > div > button').evaluateAll(bs => bs.map(b => b.textContent?.trim() ?? ''))) vistas.add(x)
      await page.keyboard.press('Escape')
      return [...vistas].filter(Boolean)
    }
    for (const [ruta, debe, noDebe] of [
      // C5: el Resumen, los Diferidos y la Producción del gerente se fundieron en La planta viva y Resultados (X4 §3.6).
      ['#/ger/resultados/ceiba/curso', ['La planta viva', 'Equipos', 'Resultados', 'Metas y accesos'], ['Resumen', 'Riesgo', 'Diferidos', 'Producción', 'Pozos', 'Bombas', 'Turno']],
      ['#/prod/produccion/ceiba/curso', ['Hoy', 'La planta viva', 'Resultados', 'Producción', 'Diferidos', 'Pozos', 'Electrosumergibles', 'Identificar', 'Planta', 'Agua', 'Configuración'], ['Turno', 'Riesgo']],
      ['#/sup/bombas/ceiba/curso', ['Hoy', 'Bombas', 'Electrosumergibles', 'Pozos', 'Turno', 'Identificar'], ['Riesgo', 'Planta']],
      ['#/oper/bombas/ceiba/curso', ['Hoy', 'Equipos', 'Bombas', 'Identificar', 'Turno'], ['Riesgo', 'Planta']],
      // C4: «Superficie» se fundió en Equipos (X4 §3.6): ya no se ofrece en el menú; su dirección abre Equipos.
      // K1 · P-10: el Riesgo del jefe y de confiabilidad se fundió en su Equipos: ya no se ofrece en el menú (abajo, su dirección).
      ['#/jefe/mantenimiento/ceiba/curso', ['Hoy', 'Resultados', 'Mantenimiento', 'Diferidos', 'Equipos', 'Bombas', 'Confiabilidad', 'Identificar'], ['Planta', 'Superficie', 'Riesgo']],
      ['#/conf/bombas/morichal/curso', ['Hoy', 'Resultados', 'Equipos', 'Bombas', 'Confiabilidad', 'Diferidos', 'Identificar', 'Planta', 'Agua', 'Configuración'], ['Turno', 'Mantenimiento', 'Superficie', 'Riesgo']],
      // F1 (P-trabajo-1): Mi trabajo se fundió en Hoy; lo demás, igual.
      ['#/tec/hoy/ceiba/curso', ['Hoy', 'Bombas', 'Identificar'], ['Riesgo', 'Planta', 'Mi trabajo']],
      ['#/adm/configuracion/ceiba/curso', ['Configurar', 'Configuración', 'Conectores', 'La planta viva', 'Planta', 'Agua'], ['Resumen']],
    ] as const) {
      await f.ir(ruta); await f.esperar(300)
      const m = await alcanza()
      const faltan = debe.filter(x => !m.includes(x)), sobran = noDebe.filter(x => m.includes(x))
      f.ok(!faltan.length && !sobran.length, `${ruta.split('/')[1]}: alcanza ${m.join(' · ')}${faltan.length ? ' · FALTA ' + faltan.join(', ') : ''}${sobran.length ? ' · SOBRA ' + sobran.join(', ') : ''}`)
    }
    // C5: Riesgo se fundió en La planta viva (X4 §3.6, punto 2): la de una pantalla quitada sin fusión lleva al inicio.
    await f.ir('#/sup/resultados/ceiba/curso'); await f.esperar(300)
    const h = await f.hash()
    f.ok(h.includes('/sup/hoy/'), `una dirección vieja a una pantalla quitada lleva al inicio del rol, su Hoy (${h})`)
    // K1 · P-10: la del jefe y la de confiabilidad abren su Equipos, con «Qué está en riesgo» debajo de la lista.
    for (const r of ['jefe', 'conf'] as const) {
      await f.ir(`#/${r}/riesgo/ceiba/curso`); await f.esperar(400)
      f.ok((await f.hash()).startsWith(`#/${r}/equipos/ceiba`) && await page.locator('main [data-lista-equipos] [data-riesgo]').count() === 1,
        `la dirección vieja del Riesgo de ${r} abre su Equipos, con lo que era Riesgo debajo de la lista (${await f.hash()})`)
    }
    await f.ir('#/ger/riesgo/ceiba/curso'); await f.esperar(400)
    f.ok((await f.hash()).startsWith('#/ger/planta-viva/ceiba/'), `la dirección vieja del Riesgo del gerente abre La planta viva (${await f.hash()})`)
    f.ok(await f.clicQueContenga('P-201B bomba de agua'), 'el gerente abre P-201B desde La planta viva (su fila en «Diferido por equipo»)')
    await f.esperar(500)
    t = await f.textoPagina()
    f.ok(t.includes('Le ha costado'), 'y ve su ficha ejecutiva (el panel: el gerente no abre el nivel técnico)')
    await f.ir('#/prod/diferidos/ceiba/curso'); await f.esperar(500)
    f.ok(await f.clicQueContenga('P-201B'), 'producción abre P-201B desde «a qué equipo se le cargan»')
    await f.esperar(500)
    // C4: producción la abre en su nivel 3 (una vista entera) y su historia del PLC y SAP están en el diagnóstico (nivel 4).
    f.ok(await f.page.locator('main [data-nivel3="P-201B"]').count() === 1 && (await f.hash()).includes('/prod/equipos/ceiba/P-201B'), `producción abre el nivel 3 de P-201B (${await f.hash()})`)
    await f.page.locator('main [data-ver-diagnostico]').click(); await f.esperar(500)
    t = await f.textoPagina()
    // D-3: el título en su renglón, en frase («Historia del PLC») o como estaba.
    f.ok(/(?:^|\n)\s*Historia del PLC/i.test(t) && /\d+ eventos? con pozos cerrados · [\d.]+ bbl/.test(t) && t.includes('SAP · mantenimiento'), 'y ve lo que se le cargó a la bomba, su historia del PLC y SAP, sin tener «Bombas» en el menú')
    await f.ir('#/conf/confiabilidad/morichal/curso'); await f.esperar(500)
    t = await f.texto()
    f.ok(t.includes('Reparación activa y espera') && t.includes('Reparación activa') && t.includes('Espera'), 'confiabilidad tiene los tres relojes en su pantalla')
    await f.ir('#/ger/resultados/ceiba/curso'); await f.esperar(500)
    t = await f.texto()
    // La cifra tiene que ser un renglón propio justo antes del rótulo: con «\s*» suelto
    // tomaba el «+125 %» del renglón de arriba aunque faltara el porcentaje.
    f.ok(/(?:^|\n)\d+ %\s*\n\s*mantenimiento proactivo/i.test(t), 'el gerente ve el porcentaje de mantenimiento proactivo en su Resultados')
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
