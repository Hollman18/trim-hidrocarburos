// De punta a punta en el navegador: lo que ve cada nivel de las señales de una
// electrosumergible parada (DetallePozo · ISA-101: a operación, solo lo anormal).
import { test } from './apoyo.ts'

test('operación: una electrosumergible parada no sale «fuera de banda» por estar sin señal', async ({ flujo: f }) => {
  await f.abrir('/#/sup/pozos/ceiba/curso')
  // LC-16 (la cerró la P-201B): se abren todas las filas con «ver N más» y se escoge.
  await f.page.getByRole('button', { name: /^ver \d+ más$/ }).click()
  await f.page.locator('tr').filter({ hasText: 'LC-16' }).first().click()
  await f.esperarTexto('Pozo LC-16')
  const t = await f.texto()
  // Sin señal con el motor apagado es lo esperado: ni «fuera de banda» ni «sin señal en línea».
  f.ok(t.includes('parado') && !t.includes('FUERA DE BANDA') && !t.includes('SIN SEÑAL'),
    'el supervisor no ve «fuera de banda» en LC-16 parada: sus señales sin lectura son lo esperado con el motor apagado')
  f.cerrar()
})

test('ingeniería: el mismo pozo parado con todas sus señales', async ({ flujo: f }) => {
  await f.abrir('/#/prod/pozos/ceiba/curso')
  await f.page.getByRole('button', { name: /^ver \d+ más$/ }).click()
  await f.page.locator('tr').filter({ hasText: 'LC-16' }).first().click()
  await f.esperarTexto('Pozo LC-16')
  const t = await f.texto()
  f.ok(t.includes('SEÑALES DEL POZO') && t.includes('Presión de entrada') && t.includes('sin lectura: motor parado') && !t.includes('FUERA DE BANDA'),
    'ingeniería ve todas las señales del pozo, también las que no tienen lectura, bajo su propio título')
  f.cerrar()
})
