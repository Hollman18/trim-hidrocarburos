/* 28-oct · «Qué atacar» de un vistazo (el dueño): lo frenado (urgente e importante) en rojo pálido, lo que está en
   riesgo en amarillo pálido y lo que está bien en verde pálido. Decisión del dueño: el verde, SOLO donde «bien» es un
   resultado (meta cumplida, mejor que antes); lo normal de la planta sigue en gris (ISA-101). La marca ISA sigue encima.
   Cada pieza dice su tono en `data-tono` y pinta su fondo con el token (`--frenado-f`, `--riesgo-f`, `--bien-f`). */
import { expect, type Locator } from '@playwright/test'
import { test } from './apoyo.ts'

/** El fondo pintado de un elemento contra el valor del token en la página: así la prueba no depende del hex. */
const pintadoCon = (l: Locator, token: string) => l.evaluate((e, t) => {
  const sonda = document.createElement('div')
  sonda.style.background = `var(${t})`
  document.body.append(sonda)
  const esperado = getComputedStyle(sonda).backgroundColor
  sonda.remove()
  return getComputedStyle(e).backgroundColor === esperado
}, token)

test('los tonos pálidos: frenado en rojo, en riesgo en amarillo y bien en verde, solo en resultados', async ({ flujo: f }) => {
  const { page } = f

  await test.step('la franja: la alarma en rojo pálido; la atención y el aviso en amarillo pálido', async () => {
    await f.abrir('/#/sup/hoy/ceiba/curso')
    const franja = page.locator('[data-franja]').first()
    await expect(franja.locator('[data-tono="frenado"]').first()).toBeVisible()
    f.ok(await pintadoCon(franja.locator('[data-tono="frenado"]').first(), '--frenado-f'), 'la píldora de alarmas, con el fondo --frenado-f')
    f.ok(await franja.locator('[data-tono="riesgo"]').count() > 0, 'la de atención o aviso, en amarillo pálido')
  })

  await test.step('Hoy: la tarjeta de P-201B (alarma) en rojo pálido', async () => {
    const tarjeta = page.locator('main section[data-tarea]').filter({ hasText: 'P-201B' }).first()
    await expect(tarjeta).toHaveAttribute('data-tono', 'frenado')
    f.ok(await pintadoCon(tarjeta, '--frenado-f'), 'la tarjeta pinta --frenado-f')
  })

  await test.step('Equipos: la fila en alarma en rojo pálido, en atención en amarillo, y la normal sin color (ISA-101)', async () => {
    await f.abrir('/#/jefe/equipos/ceiba')
    const filas = page.locator('main [data-fila-equipo]')
    await expect(filas.first()).toBeVisible()
    const tonos = await filas.evaluateAll(es => es.map(e => [e.getAttribute('data-condicion') ?? '', e.getAttribute('data-tono') ?? '']))
    const mal = tonos.filter(([c, t]) => (c === 'alarma' || c === 'interlock' ? t !== 'frenado' : c === 'atencion' || c === 'aviso' ? t !== 'riesgo' : t !== ''))
    f.ok(tonos.some(([, t]) => t === 'frenado') && mal.length === 0, `cada fila con el tono de su condición (${mal.map(x => x.join('→')).join(', ') || 'todas bien'})`)
    f.ok(!tonos.some(([, t]) => t === 'bien'), 'ninguna fila de equipo en verde: lo normal va en gris')
  })

  await test.step('La planta viva del gerente: el verde solo en resultados, contra su meta', async () => {
    await f.abrir('/#/ger/planta-viva/ceiba~portafolio/curso')
    const prod = page.locator('main section[aria-label="Producción por día"]')
    await expect(prod).toHaveAttribute('data-tono', 'bien')
    f.ok(await pintadoCon(prod, '--bien-f'), 'producción por día sobre la meta (40.514 contra 40.200), en verde pálido')
    await expect(page.locator('main section[aria-label="Cierre del mes"]')).toHaveAttribute('data-tono', 'riesgo')
    const funciona = page.locator('main [data-funcionando]')
    await expect(funciona.locator('[data-funcionando-ganado]')).toHaveAttribute('data-tono', 'bien')
    await expect(funciona.locator('[data-funcionando-mes]')).toHaveAttribute('data-tono', 'bien')
    await f.abrir('/#/ger/planta-viva/ceiba/curso')
    // La Ceiba este mes (436) va peor que antes (391): en amarillo pálido, no se esconde.
    await expect(page.locator('main [data-funcionando] [data-funcionando-mes]')).toHaveAttribute('data-tono', 'riesgo')
  })

  await test.step('la ficha de P-201B: «Ahora» en rojo pálido (parada y cerrando pozos)', async () => {
    await f.abrir('/#/ger/planta-viva/ceiba/curso/P-201B')
    const ahora = page.locator('[data-panel-equipo] section[aria-label="Ahora"]')
    await expect(ahora).toHaveAttribute('data-tono', 'frenado')
  })

  await test.step('las tendencias: más allá de la alarma en rojo pálido; entre la banda y la alarma, en amarillo pálido', async () => {
    await f.abrir('/#/conf/equipos/morichal/MPP-301/diagnostico')
    const zonas = page.locator('main svg [data-zonas]').first()
    await expect(zonas.locator('[data-zona="frenado"]')).toHaveCount(1)
    f.ok(await zonas.locator('[data-zona="frenado"]').getAttribute('fill') === 'var(--frenado-f)', 'la zona de la alarma, en --frenado-f')
  })
  f.cerrar()
})
