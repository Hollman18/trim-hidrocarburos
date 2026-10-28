// C1 · Los 10 flujos del top de flujos-que-fallan.md, medidos en la app construida (v3).
//   TRIM_URL=http://localhost:5185 node docs/experiencia-v3/herramientas/qa-v3-flujos.mjs
// Cada flujo abre un contexto nuevo (con la introducción saltada), cuenta los toques (cada clic) y los
// desplazamientos (el botón siguiente estaba fuera de la ventana), y deja una captura al final en
// capturas/qa/flujo-<n>-<rol>-<ancho>.png. La regla de conteo es la misma de flujos-que-fallan.md.
import { chromium } from '@playwright/test'
import { writeFileSync } from 'node:fs'

const URL = (process.env.TRIM_URL ?? 'http://localhost:5185').replace(/\/$/, '')
const DIR = 'docs/experiencia-v3/capturas/qa'
const ROLES = ['ger', 'prod', 'sup', 'oper', 'jefe', 'conf', 'tec', 'reg', 'adm']
const b = await chromium.launch()
const res = []

async function flujo(n, rol, ancho, ruta, pasos) {
  const movil = ancho < 700
  const ctx = await b.newContext({ viewport: { width: ancho, height: movil ? 844 : 900 }, isMobile: movil, hasTouch: movil, locale: 'es-CO', timezoneId: 'America/Bogota' })
  await ctx.addInitScript(r => { for (const x of r) localStorage.setItem(`trim.intro.${x}`, '1') }, ROLES)
  const page = await ctx.newPage()
  const m = { n, rol, ancho, toques: 0, desplaz: 0, notas: [], ok: true, hashes: [] }
  await page.goto(`${URL}/${ruta}`)
  await page.waitForFunction(() => (document.querySelector('main')?.innerText ?? '').length > 80 && !document.querySelector('[data-cargando]'), null, { timeout: 20000 })
  await page.waitForTimeout(900)
  const t = {
    page, m,
    /** Un toque: el primer elemento visible que cumple; cuenta un desplazamiento si estaba fuera de la ventana. */
    async toque(loc, que) {
      const l = loc.filter({ visible: true }).first()
      try { await l.waitFor({ state: 'visible', timeout: 6000 }) } catch { m.ok = false; m.notas.push(`no está: ${que}`); return false }
      const r = await l.boundingBox()
      const vh = page.viewportSize().height
      if (r && (r.y + r.height > vh || r.y < 0)) m.desplaz++
      await l.click(); m.toques++
      await page.waitForTimeout(700)
      m.hashes.push(await page.evaluate(() => location.hash))
      return true
    },
    btn(nombre, exact = false) { return page.getByRole('button', { name: nombre, exact }) },
    async ve(texto) { return (await page.evaluate(() => document.body.innerText)).includes(texto) },
    nota(s) { m.notas.push(s) },
  }
  try { await pasos(t) } catch (e) { m.ok = false; m.notas.push(`error: ${e.message.split('\n')[0]}`) }
  await page.screenshot({ path: `${DIR}/flujo-${n}-${rol}-${ancho}.png` })
  res.push(m)
  console.log(n, rol, ancho, `toques ${m.toques}`, `desplaz ${m.desplaz}`, m.ok ? 'ok' : 'FALLA', m.notas.join(' | '))
  await ctx.close()
}

// 1 · Cambiar de pantalla en el teléfono (Hoy → Equipos). Decisión 4 del dueño: panel lateral con ☰, sin barra abajo.
for (const ancho of [1440, 390]) await flujo(1, 'sup', ancho, '#/sup/hoy/ceiba/curso', async t => {
  if (ancho < 700) await t.toque(t.btn('Abrir la navegación'), '☰')
  await t.toque(t.page.locator('nav[aria-label="Navegación"] button', { hasText: 'Equipos' }), 'Equipos')
  if (!/equipos/.test(await t.page.evaluate(() => location.hash))) { t.m.ok = false; t.nota('no llegó a Equipos') }
})

// 2 · Decir qué se dañó en P-201B.
for (const ancho of [1440, 390]) {
  await flujo(2, 'oper', ancho, '#/oper/hoy/ceiba/curso', async t => {
    await t.toque(t.page.locator('main [data-opcion="Sello mecánico"]'), 'Sello mecánico')
    if (!await t.ve('Deshacer')) { t.m.ok = false; t.nota('sin «Deshacer»') }
  })
  await flujo(2, 'tec', ancho, '#/tec/hoy/ceiba/curso', async t => {
    const abierta = await t.page.locator('main [data-opcion="Sello mecánico"]').filter({ visible: true }).count()
    if (!abierta) await t.toque(t.btn('Contestar').first(), 'Contestar')
    await t.toque(t.page.locator('main [data-opcion="Sello mecánico"]'), 'Sello mecánico')
    if (!await t.ve('Deshacer')) { t.m.ok = false; t.nota('sin «Deshacer»') }
  })
  for (const rol of ['jefe', 'sup']) await flujo(2, rol, ancho, `#/${rol}/hoy/ceiba/curso`, async t => {
    await t.toque(t.btn('Contestar yo'), 'Contestar yo')
    const op = t.page.locator('[data-opcion]').filter({ visible: true }).first()
    t.nota(`primera opción: ${(await op.textContent())?.trim().slice(0, 40)}`)
    await t.toque(op, 'una opción')
    if (!await t.ve('Deshacer')) { t.m.ok = false; t.nota('sin «Deshacer»') }
  })
  await flujo(2, 'conf', ancho, '#/conf/equipos/ceiba', async t => {
    await t.toque(t.btn('Ver lo que le toca'), 'Ver lo que le toca')
    await t.toque(t.btn('Contestar yo'), 'Contestar yo')
    await t.toque(t.page.locator('[data-opcion]'), 'una opción')
    if (!await t.ve('Deshacer')) { t.m.ok = false; t.nota('sin «Deshacer»') }
  })
}

// 3 · Decidir los planes de P-201B (sup y jefe; conf no tiene la tarjeta en su inicio).
for (const ancho of [1440, 390]) for (const rol of ['sup', 'jefe']) await flujo(3, rol, ancho, `#/${rol}/hoy/ceiba/curso`, async t => {
  await t.toque(t.btn('Ver los planes'), 'Ver los planes')
  const aceptar = t.btn('Aceptar', true)
  if (!await aceptar.filter({ visible: true }).count()) t.nota(`tras «Ver los planes» no hay «Aceptar» a la vista (${await t.page.evaluate(() => location.hash)})`)
  await t.toque(aceptar, 'Aceptar')
  if (!await t.ve('Deshacer')) t.nota('sin «Deshacer» a la vista')
})

// 4 · Entregar el turno (sup).
for (const ancho of [1440, 390]) await flujo(4, 'sup', ancho, '#/sup/hoy/ceiba/curso', async t => {
  await t.toque(t.btn('Entregar turno'), 'Entregar turno')
  await t.toque(t.btn('Compartir en PDF'), 'Compartir en PDF')
})

// 5 · Avisar a SAP que P-201B está parada (jefe, sup, oper y conf).
for (const ancho of [1440, 390]) for (const [rol, ruta] of [['jefe', '#/jefe/hoy/ceiba/curso'], ['sup', '#/sup/hoy/ceiba/curso'], ['conf', '#/conf/equipos/ceiba'], ['oper', '#/oper/hoy/ceiba/curso']]) await flujo(5, rol, ancho, ruta, async t => {
  if (await t.btn('Avisar', true).filter({ visible: true }).count()) { await t.toque(t.btn('Avisar', true), 'Avisar') }
  else {
    t.nota('sin «Avisar» en el inicio: por la ficha')
    await t.toque(t.page.getByRole('button', { name: /^Ver P-201B/ }), 'Ver P-201B')
    await t.toque(t.page.getByRole('button', { name: /aviso/i }), 'Crear aviso')
    const enviar = t.page.getByRole('button', { name: /Enviar aviso/ })
    if (await enviar.filter({ visible: true }).count()) await t.toque(enviar, 'Enviar aviso')
  }
  if (!await t.ve('Deshacer')) t.nota('sin «Deshacer» a la vista')
})

// 6 · La orden de K-101: el técnico la cierra; el jefe la ve.
for (const ancho of [1440, 390]) {
  await flujo(6, 'tec', ancho, '#/tec/hoy/ceiba/curso', async t => {
    await t.toque(t.btn('Cerrar la orden'), 'Cerrar la orden')
    const form = t.page.locator('[data-cerrar-orden], form').filter({ visible: true }).first()
    t.nota(`abre: ${(await form.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 90)}`)
  })
  await flujo(6, 'jefe', ancho, '#/jefe/hoy/ceiba/curso', async t => {
    await t.toque(t.btn('Ver la orden'), 'Ver la orden')
    t.nota(`queda en ${await t.page.evaluate(() => location.hash)} · ${await t.ve('40012056') ? 'se ve la orden 40012056' : 'NO se ve el número de la orden'}`)
  })
  await flujo(6, 'sup', ancho, '#/sup/hoy/ceiba/curso', async t => {
    t.nota(await t.ve('K-101') ? 'K-101 sigue en el Hoy del supervisor' : 'sin K-101 en el Hoy del supervisor (A-24)')
  })
}

// 7 · reg: de «quién lo debe» a la parada (ya no hay «Pedir»: necesario-por-rol §10 lo quitó a propósito).
for (const ancho of [1440, 390]) await flujo(7, 'reg', ancho, '#/reg/regulatorio/ceiba/curso', async t => {
  await t.toque(t.page.locator('main button', { hasText: 'LC-21' }), 'la fila LC-21')
  const txt = await t.page.evaluate(() => (document.querySelector('[role=dialog]') ?? document.querySelector('main')).innerText.replace(/\s+/g, ' ').slice(0, 160))
  t.nota(`abre: ${txt}`)
})

// 8 · conf: qué atacar primero (sin desplazarse) y abrirlo.
for (const ancho of [1440, 390]) await flujo(8, 'conf', ancho, '#/conf/equipos/ceiba', async t => {
  const veces = await t.page.evaluate(() => (document.querySelector('main').innerText.match(/P-201A/g) ?? []).length)
  t.nota(`P-201A aparece ${veces} veces en la página`)
  await t.toque(t.btn('Abrir P-201A'), 'Abrir P-201A')
})

// 9 · ger: dónde se trabó y quién está en ello, desde «Todos mis campos», y volver.
for (const ancho of [1440, 390]) await flujo(9, 'ger', ancho, '#/ger/planta-viva/ceiba~portafolio/curso', async t => {
  const antes = await t.page.evaluate(() => location.hash)
  const ver = t.page.getByRole('button', { name: /^Ver (P-201B|qué se está haciendo)/ })
  await t.toque(ver, 'Ver P-201B')
  const ficha = await t.page.locator('[role=dialog]').filter({ visible: true }).count()
  t.nota(ficha ? 'la ficha se abre encima' : `no abre ficha encima (${await t.page.evaluate(() => location.hash)})`)
  await t.toque(t.page.locator('[role=dialog] button[aria-label^="Cerrar"]').first(), 'Cerrar')
  const despues = await t.page.evaluate(() => location.hash)
  t.nota(despues === antes ? 'vuelve a Todos mis campos' : `queda en ${despues}, no en ${antes}`)
  if (despues !== antes) t.m.ok = false
})

// 10 · prod: confirmar las paradas del día desde su inicio.
for (const ancho of [1440, 390]) await flujo(10, 'prod', ancho, '#/prod', async t => {
  await t.toque(t.page.getByRole('button', { name: /^Confirmar las/ }), 'Confirmar las 2')
  if (!await t.ve('Deshacer')) { t.m.ok = false; t.nota('sin «Deshacer»') }
})

await b.close()
writeFileSync('docs/experiencia-v3/herramientas/qa-v3-flujos.json', JSON.stringify(res, null, 1))
