// De punta a punta en el navegador: la filosofía operacional (U2 §8). A qué
// pozos sirve cada equipo, la carga por CSV, la vista previa del impacto y la
// firma, y la misma página en el teléfono (una pregunta por pantalla).
import { readFileSync } from 'node:fs'
import { expect, type Page } from '@playwright/test'
import { test } from './apoyo.ts'
import { detectar } from './auditoria/detector.ts'

const RUTA = '/#/adm/configuracion/ceiba/curso'
const CSV_MALO = 'equipo;pozos a los que sirve\nK-101;LC-11 LC-12\nXX-99;LC-01\nSE-2;todos'

/** El administrador abre «Filosofía operacional» en Configuración. */
async function abrirFilosofia(page: Page) {
  await page.getByRole('tab', { name: 'Filosofía operacional' }).click()
  await expect(page.getByRole('heading', { name: 'Filosofía operacional · La Ceiba' })).toBeVisible()
}

/** El renglón de un equipo en la lista del escritorio. */
const renglon = (page: Page, equipo: string) => page.getByRole('button', { name: new RegExp(`^${equipo} `) })

/** Escoge un equipo: en el escritorio, de la lista; en el teléfono, del selector «Ir a otro equipo». */
async function escoger(page: Page, equipo: string) {
  const selector = page.getByLabel('Ir a otro equipo')
  if (await selector.count()) await selector.selectOption(equipo)
  else await page.getByRole('button', { name: new RegExp(`^${equipo} `) }).click()
}

/** Un equipo que TRIM cree de todo el campo y el administrador dice que es de un
 *  solo pozo: K-101 (el aire de instrumentos) solo para LC-11. Sus paradas pasan
 *  de la planta o estación al pozo. Un pozo no se escoge: solo se sirve a sí
 *  mismo (C-13), así que la prueba usa un equipo de la planta. */
async function deUnSoloPozo(page: Page) {
  await escoger(page, 'K-101')
  const pregunta = page.getByRole('group', { name: '¿A qué pozos sirve este equipo?' })
  // B-49: lo que TRIM deduce no se ve marcado mientras nadie lo acepte: va al lado, «propuesta de TRIM, sin aceptar».
  await expect(pregunta.getByRole('radio', { name: /^A todo el campo/ }), 'nadie lo ha contestado: nada marcado').not.toBeChecked()
  await expect(pregunta.locator('[data-propuesta-sin-aceptar]')).toContainText('propuesta de TRIM, sin aceptar')
  await pregunta.getByRole('radio', { name: /^A un solo pozo/ }).check()
  await page.getByLabel('Pozo al que sirve K-101').selectOption('LC-11')
}

test('adm: un equipo de la planta que sirve a un solo pozo pasa sus paradas de la planta o estación al pozo', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir(RUTA)
  await abrirFilosofia(page)
  let t = await f.texto()
  f.ok(t.includes('modelo choke') && /Sin responder \d+/.test(t) && /Propuestas de TRIM \d+/.test(t) && t.includes('Todos 36'),
    'la página dice «modelo choke» de segundo y filtra lo que falta, lo que propone TRIM y todo (36 equipos)')
  f.ok(!/\b(dedicado|compartido|frontera|tercero)\b/.test(t), 'el administrador no ve los nombres internos del alcance: ve botones y frases')
  // B-29: sin tag, el equipo se llama por su nombre, nunca por la clave del esquema.
  const nombres = (await page.locator('main button[aria-pressed] b').allInnerTexts()).map(x => x.trim())
  f.ok(['Manifold de producción', 'Depurador de gas', 'Tea / quemador', 'Tanque de agua'].every(x => nombres.includes(x))
    && !nombres.some(x => ['manifold', 'depurador', 'tea', 'tanqueAgua', 'gasventa', 'oleoducto', 'inyeccion'].includes(x)),
    `los equipos sin tag van con su nombre, no con la clave interna (${nombres.filter(x => !/\d/.test(x)).join(', ')})`)
  // B-49: lo que nadie contestó dice que es lo que TRIM deduce, y el ⓘ de los filtros dice en qué se diferencian.
  f.ok(t.includes('TRIM deduce: sirve solo a LC-01 → se traba en el pozo'), 'un renglón sin responder dice «TRIM deduce: …»')
  await expect(page.getByRole('img', { name: /^Sin responder y propuestas de TRIM: / })).toHaveCount(1)
  // C-13: un pozo solo se sirve a sí mismo: su única respuesta es él, sin escoger.
  await escoger(page, 'LC-11')
  const pozo = page.getByRole('group', { name: '¿A qué pozos sirve este equipo?' })
  await expect(pozo.getByRole('radio')).toHaveCount(1)
  await expect(pozo.getByRole('radio', { name: /^A un solo pozo: LC-11/ })).toHaveCount(1)
  await expect(pozo.locator('[data-pozo-propio]')).toContainText('Es un pozo: solo se sirve a sí mismo.')

  await deUnSoloPozo(page)
  await f.esperarTexto('Si para, se traba en el pozo: es solo de LC-11.')
  const k101 = await renglon(page, 'K-101').innerText()
  f.ok(k101.includes('sirve solo a LC-11 → se traba en el pozo') && k101.includes('en el borrador') && !k101.includes('TRIM deduce'),
    `la lista dice lo contestado y que está en el borrador (${k101.replace(/\n/g, ' · ')})`)

  await page.getByRole('button', { name: '3 Ver el impacto y firmar' }).click()
  await f.esperarTexto('pasan de «En la planta o estación» a «En el pozo»')
  t = await f.texto()
  f.ok(/\d+ paradas cambiarían de tramo desde el 1 de jul/.test(t), 'la vista previa cuenta las paradas de los últimos meses que cambian de tramo')
  f.ok(/\b[1-9]\d* pasan de «En la planta o estación» a «En el pozo»/.test(t), 'y dice que pasan de «En la planta o estación» a «En el pozo»')
  f.ok(/K-101[^\n]*se trabaría en el pozo \(antes en la planta o estación\)/.test(t), '«si falla hoy» dice dónde se trabaría K-101 ahora')
  f.ok(t.includes('los pozos → los pozos (no cambia)'), 'qué limita hoy no cambia')
  f.ok(t.includes('no cambia: la topología no mueve barriles'), 'y el libro no cambia')
  f.ok(t.includes('Ninguna la había confirmado una persona') || t.includes('que ya confirmó una persona no cambian solas'), 'dice qué pasa con las ya confirmadas')
  f.cerrar()
})

test('un CSV con una fila mala dice el hallazgo de esa fila y no pasa nada al borrador', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir(RUTA)
  await abrirFilosofia(page)
  await page.getByRole('button', { name: 'Subir Excel o CSV' }).click()

  // La plantilla trae lo que rige hoy, con las mismas palabras que lee la carga.
  const [descarga] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Descargar la plantilla' }).click()])
  const plantilla = readFileSync(await descarga.path(), 'utf8')
  f.ok(descarga.suggestedFilename() === 'TRIM-topologia-ceiba.csv', `la plantilla se llama TRIM-topologia-ceiba.csv (${descarga.suggestedFilename()})`)
  f.ok(plantilla.includes('equipo;pozos a los que sirve') && plantilla.includes('SE-2;todos') && plantilla.includes('LC-11;LC-11') && plantilla.includes('oleoducto;otro dueño'),
    'la plantilla lleva el encabezado y cada equipo con «todos», su pozo u «otro dueño»')

  const caja = page.getByLabel('O pegue las filas copiadas de Excel')
  await caja.fill(CSV_MALO)
  await page.getByRole('button', { name: 'Revisar', exact: true }).click()
  await f.esperarTexto('Fila 3: XX-99 no está en el registro de La Ceiba')
  let t = await f.texto()
  f.ok(t.includes('3 filas leídas: 2 equipos listos, 1 fila bloquea'), 'cuenta lo leído, lo listo y lo que bloquea')
  f.ok(await page.getByRole('img', { name: 'Bloquea: dato que no corresponde' }).count() === 1, 'la fila mala lleva la marca de dato inválido (forma y texto)')
  f.ok(await page.getByRole('button', { name: 'Pasar 2 equipos al borrador' }).isDisabled() && t.includes('Con una fila que bloquea no pasa nada al borrador'),
    'con una fila mala no pasa nada al borrador, y se dice')

  // Un pozo que no es del campo también se dice en su fila.
  await caja.fill('equipo;pozos a los que sirve\nLC-11;LC-11 MN-07')
  await page.getByRole('button', { name: 'Revisar', exact: true }).click()
  await f.esperarTexto('Fila 2: MN-07 no es un pozo de La Ceiba.')

  // Un pozo que sirve a otro tampoco (C-13): lo mismo que la firma, dicho en su fila.
  await caja.fill('equipo;pozos a los que sirve\nLC-11;LC-11 LC-12')
  await page.getByRole('button', { name: 'Revisar', exact: true }).click()
  await f.esperarTexto('Fila 2: LC-11 es un pozo: solo se sirve a sí mismo')

  // Corregido, pasa al borrador y la lista lo muestra.
  await caja.fill('equipo;pozos a los que sirve\nK-101;LC-11 LC-12\nSE-2;todos')
  await page.getByRole('button', { name: 'Revisar', exact: true }).click()
  await page.getByRole('button', { name: 'Pasar 2 equipos al borrador' }).click()
  await f.esperarTexto('2 equipos pasaron al borrador')
  t = await f.texto()
  f.ok(t.includes('sirve a LC-11 y LC-12 → se traba en la planta'), 'K-101 queda en el borrador sirviendo a LC-11 y LC-12')
  f.cerrar()
})

test('firmar la filosofía operacional exige motivo y deja la versión con la topología', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir(RUTA)
  await abrirFilosofia(page)
  await deUnSoloPozo(page)

  // Con lo demás sin contestar no se firma: TRIM propone, pero no firma nada solo.
  await page.getByRole('button', { name: '3 Ver el impacto y firmar' }).click()
  await f.esperarTexto('35 sin contestar')
  const firmar = page.getByRole('button', { name: /^Firmar como/ })
  f.ok(await firmar.isDisabled() && (await f.texto()).includes('35 equipos quedan sin contestar'), 'con 35 equipos sin contestar, la firma no se deja')

  // Se acepta por tipo de equipo lo que TRIM dedujo, con un toque por tipo…
  await page.getByRole('button', { name: 'Ver lo que falta' }).click()
  await page.getByRole('button', { name: 'Todos 36' }).click()
  let lotes = 0
  for (const lote = page.getByRole('button', { name: /^Aceptar lo que TRIM dedujo para/ }); await lote.count() && lotes < 15; lotes++) await lote.first().click()
  f.ok(lotes >= 5, `se acepta por tipo de equipo (${lotes} toques)`)
  // …menos V-101: su registro dice «4 pozos» y el esquema lo pone después del cabezal común. Eso lo decide una persona.
  await escoger(page, 'V-101')
  f.ok((await f.texto()).includes('Dos fuentes no cuadran'), 'V-101 muestra que dos fuentes no cuadran')
  await page.getByRole('button', { name: /^Aceptar para V-101/ }).click()

  await page.getByRole('button', { name: '3 Ver el impacto y firmar' }).click()
  await f.esperarTexto('la topología del campo queda completa')
  await firmar.click()
  await f.esperarTexto('Falta el motivo')
  f.ok(!(await f.texto()).includes('Firmada la versión'), 'sin motivo no se firma, y se dice')
  f.ok(await page.getByPlaceholder(/^Ej\.: topología revisada/).evaluate(e => e === document.activeElement), 'el foco va a la caja del motivo')

  await page.getByPlaceholder(/^Ej\.: topología revisada/).fill('Topología revisada en campo con el jefe de planta')
  await firmar.click()
  await f.esperarTexto('Firmada la versión 2')
  const t = await f.texto()
  f.ok(t.includes('Topología de La Ceiba: se firma con 36 elementos'), 'el historial dice la topología en palabras')
  f.ok(t.includes('«Topología revisada en campo con el jefe de planta»') && t.includes('Hermes Leal · administrador de la implementación'), 'con el motivo y quién firmó')
  await page.getByRole('button', { name: '1 Equipos y pozos' }).click()
  await f.esperarTexto('Todos 36')
  f.ok((await renglon(page, 'K-101').innerText()).includes('sirve solo a LC-11 → se traba en el pozo') && /Sin responder 0/.test(await f.texto()), 'firmada, K-101 sirve solo a LC-11 y no queda nada sin responder')
  f.cerrar()
})

test('capacidades: lo que bloquea la firma lo dice con la marca de aviso y la palabra, y el paso 3 muestra el impacto aunque haya errores', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir(RUTA)
  await abrirFilosofia(page)
  await page.getByRole('button', { name: '2 Capacidades' }).click()
  await page.getByLabel('Tren de crudo, bbl/d de crudo').fill('5000')
  const revision = page.locator('main section').filter({ has: page.getByText('REVISIÓN CON LAS REGLAS DE LA FIRMA', { exact: true }) })
  await expect(revision.locator('[data-bloquea]').first()).toContainText('Bloquea la firma:')
  const reglas = await revision.locator('li').allInnerTexts()
  // B-30: el morado es solo de «sin comunicación» y «dato inválido»; bloquear o no se dice con palabra y forma.
  f.ok(reglas.length > 0 && reglas.every(x => /(Bloquea la firma|Revise):/.test(x)), `cada hallazgo empieza por «Bloquea la firma:» o «Revise:» (${reglas.length})`)
  await expect(revision.getByRole('img', { name: 'Bloquea la firma' })).toHaveCount(0)
  // B-53: con errores, «SI FIRMA ESTA VERSIÓN» dice igual lo que cambiaría, marcado como borrador con errores.
  await page.getByRole('button', { name: /^3 Ver el impacto/ }).first().click()
  const errores = page.locator('main [data-borrador-con-errores]')
  await expect(errores).toContainText('Borrador con errores: así quedaría. No se puede firmar hasta corregir esto:')
  await expect(errores).toContainText('Tren de crudo de La Ceiba')
  await expect(page.getByRole('region', { name: 'Lo que cambia en La Ceiba' })).toContainText('Qué limita hoy')
  await expect(page.getByRole('button', { name: /^Firmar como/ })).toBeDisabled()
  f.cerrar()
})

// El teléfono (390 y 320 px: una pregunta por pantalla, U2 §8.7) y el escritorio
// (1280 y 1512 px: la lista y la pregunta lado a lado), con el detector del auditor.
for (const ancho of [390, 320, 1280, 1512]) {
  const telefono = ancho < 600
  test.describe(`${ancho} px`, () => {
    // `isMobile` solo en 390, como el auditor: Firefox no lo acepta y sus proyectos no excluyen los 320 px.
    test.use({ viewport: { width: ancho, height: telefono ? 844 : 900 }, isMobile: ancho === 390 })

    test(`la filosofía operacional a ${ancho} px: ${telefono ? 'una pregunta por pantalla' : 'la lista y la pregunta'}, sin desbordes`, async ({ flujo: f }) => {
      const { page } = f
      const revisar = async (donde: string) => {
        const h = await page.evaluate(detectar)
        f.ok(h.length === 0, `${donde}: nada se sale, se recorta ni se pisa${h.length ? ` · ${JSON.stringify(h.slice(0, 4))}` : ''}`)
      }
      await f.abrir(RUTA)
      await abrirFilosofia(page)
      f.ok(telefono ? (await f.texto()).includes('Equipo 1 de 36 · borrador') : (await f.texto()).includes('EQUIPOS · 36'),
        telefono ? 'en el teléfono va una pregunta por pantalla' : 'en el escritorio, la lista de los 36 equipos al lado de la pregunta')
      await revisar('paso 1')
      await deUnSoloPozo(page)
      await f.esperarTexto('Si para, se traba en el pozo: es solo de LC-11.')
      await revisar('paso 1 · a un solo pozo')
      await escoger(page, 'K-101')
      await page.getByRole('button', { name: /^Ver las \d+ caídas/ }).click()
      await revisar('paso 1 · propuesta con sus caídas')
      await page.getByRole('button', { name: 'Subir Excel o CSV' }).click()
      await page.getByLabel('O pegue las filas copiadas de Excel').fill(CSV_MALO)
      await page.getByRole('button', { name: 'Revisar', exact: true }).click()
      await f.esperarTexto('Fila 3: XX-99')
      await revisar('carga con una fila mala')
      await page.getByRole('button', { name: '2 Capacidades' }).click()
      await f.esperarTexto('REVISIÓN CON LAS REGLAS DE LA FIRMA')
      await revisar('paso 2')
      await page.getByRole('button', { name: '3 Ver el impacto y firmar' }).click()
      await f.esperarTexto('pasan de «En la planta o estación»')
      const t = await f.texto()
      f.ok(telefono ? t.includes('La firma se hace en el escritorio') && !t.includes('FIRMAR LA VERSIÓN') : t.includes('FIRMAR LA VERSIÓN'),
        telefono ? 'en el teléfono la firma se hace en el escritorio (U2 §8.7)' : 'en el escritorio la firma va debajo de la vista previa')
      await revisar('paso 3')
      f.cerrar()
    })
  })
}
