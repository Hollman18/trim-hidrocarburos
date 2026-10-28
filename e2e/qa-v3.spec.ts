/* C1 · QA total de la experiencia v3 (docs/experiencia-v3/qa-v3.md): una prueba por cada arreglo S1/S2.
   Cada una falla sin su cambio:
   - QA-01 · el operador en el teléfono ve la franja y la hora de los datos (X2 N2 y D3; la imagen aprobada);
   - QA-02 · el supervisor avisa a SAP desde Hoy en un toque (FF-5);
   - QA-03 · la ficha del gerente se abre encima de «Todos mis campos» y vuelve ahí (FF-9);
   - QA-04 · el balance del choke llega a confiabilidad y al supervisor (CONSTRUCCION.md);
   - QA-05 · «Equipos sin topología» ya no está en Confiabilidad (A-28);
   - QA-06 · «falta» se dibuja con su forma, distinta de «sin comunicación» (X2 C8 y D2);
   - QA-07 · el estado del administrador lo da el motor (`/vistas/configuracion/estado`), no la pantalla (C3);
   - QA-08 · «Ver una por una» no pide `/opciones`: ahí no se contesta (C3; FF-2);
   - QA-09 · la cadena de una parada sin ningún paso se dice una vez (S3);
   - QA-10 · «Ya se ganó» dice desde cuándo suma (S3);
   - QA-11 · la trazabilidad de un tramo no tapa la franja en el escritorio (X2 N5);
   - QA-12 · cerrar la orden en el teléfono baja el número del técnico (S2: el número mentía). */
import { readFileSync } from 'node:fs'
import { expect, type Page } from '@playwright/test'
import { test } from './apoyo.ts'

const fuente = (rel: string) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
const hash = (page: Page) => page.evaluate(() => location.hash)

test.describe('390 px', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('QA-01 · 390 px: el operador ve la franja de condiciones y la hora de los datos sobre su pregunta', async ({ flujo: f }) => {
    const { page } = f
    await f.abrir('/#/oper/hoy/ceiba/curso')
    await expect(page.locator('main [data-operador="pregunta"]')).toBeVisible()
    const franja = page.locator('[data-franja]').first()
    await expect(franja).toBeVisible()
    await expect(franja).toBeInViewport()
    await expect(page.locator('main [data-cabecera]').getByText(/datos de las 14:00/)).toBeVisible()
    // La pregunta sigue en la primera vista: la cifra y la primera opción, sin desplazarse.
    await expect(page.locator('main [data-operador="pregunta"] [data-cifra]')).toBeInViewport()
    f.cerrar()
  })
})

test('QA-02 · el supervisor avisa a SAP de P-201B desde Hoy, en un toque', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/sup/hoy/ceiba/curso')
  const linea = page.locator('main [data-avisar-sap="P-201B"]')
  await expect(linea).toContainText('SAP no lo sabe')
  await linea.getByRole('button', { name: 'Avisar', exact: true }).click()
  await expect(linea).toContainText(/aviso \d+ en SAP/)
  await expect(linea.getByRole('button', { name: 'Avisar', exact: true })).toHaveCount(0)
  f.cerrar()
})

test('QA-03 · la ficha del gerente se abre encima de «Todos mis campos» y, al cerrarla, vuelve ahí', async ({ flujo: f }) => {
  const { page } = f
  await page.setViewportSize({ width: 1440, height: 900 })
  await f.abrir('/#/ger/planta-viva/ceiba~portafolio/curso')
  const antes = await hash(page)
  await page.locator('[data-ver-que-se-hace="P-201B"]').click()
  await expect(page.getByRole('dialog').filter({ hasText: 'P-201B' }).first()).toBeVisible()
  f.ok((await hash(page)).includes('~portafolio'), `la ficha abierta sigue en «Todos mis campos» (${await hash(page)})`)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog').filter({ hasText: 'P-201B' })).toHaveCount(0)
  f.ok(await hash(page) === antes, `al cerrar vuelve a «Todos mis campos» (${await hash(page)})`)
  await expect(page.locator('[data-gerente-cifra]')).toHaveAttribute('data-gerente-cifra', '2650')
  f.cerrar()
})

test('QA-04 · el balance del choke (producido · diferido · perdido, por tramo, con su árbol) en confiabilidad y en el supervisor', async ({ flujo: f }) => {
  const { page } = f
  for (const ruta of ['/#/conf/confiabilidad/ceiba/curso', '/#/sup/hoy/ceiba/curso']) {
    await f.abrir(ruta)
    const b = page.locator('main [data-balance="ceiba"]')
    await expect(b).toBeVisible()
    f.ok(Number(await b.getAttribute('data-producido')) > 0, `${ruta}: lo producido, medido`)
    f.ok(await b.getAttribute('data-diferido') === '1046', `${ruta}: el diferido del mes, 1.046 bbl (${await b.getAttribute('data-diferido')})`)
    // La pérdida sin registro dice «sin registro», nunca 0; y va aparte del diferido.
    f.ok(await b.getAttribute('data-perdido') === 'sin-registro', `${ruta}: el perdido dice «sin registro»`)
    const tramos = await b.locator('[data-tramo-balance]').evaluateAll(xs => xs.map(x => Number((x.querySelectorAll('td')[0]?.textContent ?? '').replace(/\D/g, ''))))
    f.ok(tramos.reduce((a, x) => a + x, 0) === 1046, `${ruta}: los tramos suman el diferido (${tramos.join(' + ')})`)
    // La trazabilidad a un toque: el tramo de la planta abre su árbol hasta la parada.
    await b.locator('[data-tramo-balance="planta"] button').click()
    const traza = page.locator('[data-traza="planta"]')
    await expect(traza).toBeVisible()
    await expect(traza.locator('[data-parada-balance]').first()).toBeVisible()
    await page.keyboard.press('Escape')
  }
  f.cerrar()
})

test('QA-05 · Confiabilidad ya no trae «Equipos sin topología» (A-28: es del administrador)', async ({ flujo: f }) => {
  await f.abrir('/#/conf/confiabilidad/ceiba/curso')
  await f.esperarTexto('Calidad de la clasificación')
  f.ok(!(await f.texto()).includes('Equipos sin topología'), 'sin «Equipos sin topología»')
  f.cerrar()
})

test('QA-06 · «falta» en el estado del administrador es el rectángulo discontinuo, no el círculo de «sin comunicación»', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/adm/configuracion/ceiba/curso')
  const marca = page.locator('main [data-paso="topologia"] svg').first()
  await expect(marca).toBeVisible()
  f.ok(await marca.locator('rect[stroke-dasharray]').count() === 1, 'la marca «falta» es un rectángulo discontinuo')
  f.ok(await marca.locator('circle').count() === 0, 'sin el círculo punteado de «sin comunicación»')
  f.cerrar()
})

test('QA-07 · «3 de 6 pasos» lo da el motor (useEstadoConfiguracion), y los otros campos también', async ({ flujo: f }) => {
  const src = fuente('src/pages/Configuracion.tsx')
  f.ok(/useEstadoConfiguracion\(campoId\)/.test(src) && /useEstadoConfiguracion\(id\)/.test(src), 'la pantalla lee el estado del campo y de los otros por la costura')
  f.ok(!/estadoConfiguracion\(c\.id, ctx/.test(src) && !/const estado = estadoConfiguracion\(/.test(src), 'la pantalla ya no corre estadoConfiguracion para la cifra ni para los otros campos')
  const { page } = f
  await f.abrir('/#/adm/configuracion/ceiba/curso')
  await expect(page.locator('main [data-estado-config="ceiba"] [data-cifra]')).toContainText(/3\s*de 6 pasos listos/)
  await expect(page.locator('main [data-otros-campos]')).toContainText('Morichal Norte · 3 de 6')
  f.cerrar()
})

test('QA-08 · «Ver una por una» confirma y corrige la cadena: no pide `/opciones` ni trae formulario para contestar', async ({ flujo: f }) => {
  const src = fuente('src/pages/Causa.tsx')
  f.ok(!/useOpcionesRespuesta/.test(src), 'la pantalla no pide las opciones de respuesta')
  const { page } = f
  await f.abrir('/#/sup/causa/ceiba/curso')
  await expect(page.locator('main [data-se-contesta-en-hoy]')).toContainText('Se contesta en Hoy')
  f.ok(await page.locator('main [data-parada] form').count() === 0, 'ninguna tarjeta trae un formulario para contestar')
  f.ok(!(await f.texto()).includes('Sospechosa:'), 'sin la pista para contestar (se contesta en Hoy)')
  // Lo necesario sí está: la cadena con «Confirmar» y «Corregir».
  await expect(page.getByRole('button', { name: /^Confirmar los 2/ })).toBeVisible()
  f.cerrar()
})

test('QA-09 · «Mi turno»: una parada sin ningún paso dice «falta toda la cadena», no cuatro veces «falta»', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/sup/hoy/ceiba/curso')
  const lc21 = page.locator('main [data-mi-turno="actual"] [data-parada-jornada]').filter({ hasText: 'LC-21' }).first()
  await expect(lc21.locator('[data-cadena]')).toHaveText('falta toda la cadena')
  // Una con su cadena la dice entera, paso por paso.
  await expect(page.locator('main [data-parada-jornada="EP-LC16-261002-78"] [data-cadena]')).toHaveText('Planta · Diferida · No planeada · Parada estación/bombeo afecta pozos')
  f.cerrar()
})

test('QA-10 · «¿Está funcionando?»: lo ganado dice desde cuándo suma (desde que entró TRIM), para no leerse contra «este mes»', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/ger/planta-viva/ceiba/curso')
  const t = page.locator('main [data-funcionando]')
  await expect(t).toContainText('Antes de TRIM')
  await expect(t).toContainText(/Ya se ganó\s*3\.934\s*bbl\s*dejaron de diferirse desde el 1 de septiembre/)
  f.cerrar()
})

test('QA-11 · la trazabilidad de un tramo, en el escritorio, no tapa la franja ni oscurece lo de atrás (X2 N5)', async ({ flujo: f }) => {
  const { page } = f
  await page.setViewportSize({ width: 1440, height: 900 })
  await f.abrir('/#/prod/planta-viva/ceiba/curso')
  const boton = page.locator('main [data-balance] [data-tramo-balance="planta"] button')
  // Con el teclado: en Safari un clic no le da el foco a un botón (macOS); quien vuelve con el foco es quien llegó con él.
  await boton.focus()
  await page.keyboard.press('Enter')
  const traza = page.locator('[data-traza="planta"]')
  await expect(traza).toBeVisible()
  await expect(traza).toContainText('LC-16')
  const libre = await page.evaluate(() => [...document.querySelectorAll('[data-franja] button, [data-franja] [role=group] *')].filter(e => e.checkVisibility()).every(e => {
    const r = e.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2
    const arriba = document.elementFromPoint(x, y); return !!arriba && !!arriba.closest('[data-franja]')
  }))
  f.ok(libre, 'cada cuenta de la franja sigue a la vista y se puede tocar')
  f.ok(await page.locator('[data-traza] [data-velo], [data-velo]').filter({ visible: true }).count() === 0, 'sin velo: lo de atrás no se oscurece')
  await page.keyboard.press('Escape')
  await expect(traza).toHaveCount(0)
  await expect(boton).toBeFocused()
  f.cerrar()
})

test('QA-12 · el técnico cierra la orden de K-101 y su número baja: «5 cosas» pasa a 4, y la insignia también', async ({ flujo: f }) => {
  const { page } = f
  await f.abrir('/#/tec/hoy/ceiba/curso')
  const cosas = page.locator('main [data-renglon="cosas"]').first()
  await expect(cosas).toContainText('5')
  await expect(page.locator('main [data-hoy]')).toHaveAttribute('data-insignia', '5')
  await page.locator('main [data-su-orden] [data-orden="40012056"]').getByRole('button', { name: 'Cerrar la orden' }).click()
  const cierre = page.locator('[data-cierre-orden="40012056"]')
  await cierre.locator('[data-actividades] button', { hasText: 'Reparé' }).click()
  await cierre.getByRole('button', { name: 'Cerrar la orden' }).click()
  await expect(page.locator('main [data-orden-cerrada="40012056"]')).toContainText('Orden 40012056 cerrada')
  await expect(cosas).toContainText('4')
  await expect(page.locator('main [data-hoy]')).toHaveAttribute('data-insignia', '4')
  f.cerrar()
})
