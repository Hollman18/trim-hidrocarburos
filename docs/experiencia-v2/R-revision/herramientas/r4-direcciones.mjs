/* R4 · §10 Direcciones: cada dirección vieja abre su lugar nuevo, y «atrás»
   funciona después de la redirección (vuelve a donde estaba, sin quedar
   atrapado en un rebote).

   Dos formas de llegar a la dirección vieja:
   - «enlace»: con la aplicación abierta en otra pantalla, se cambia el hash
     (como un enlace dentro de la página); después, «atrás»;
   - «compartida»: una carga nueva con la dirección (un enlace que llegó por
     WhatsApp o por correo); después, «atrás» tiene que salir de la aplicación.

   node docs/experiencia-v2/R-revision/herramientas/r4-direcciones.mjs <url> */
import { lanzar, SIN_INTRO, lista, guardar, esperar } from './r4-comun.mjs'

const [base = 'http://localhost:5184'] = process.argv.slice(2)
/** [vieja, lo que se espera (expresión sobre el hash final), de dónde se sale] */
const CASOS = [
  ['#/ger/resumen/ceiba/curso', /^#\/ger\/planta-viva\/ceiba\/curso$/, '#/ger/equipos/ceiba'],
  ['#/ger/diferidos/ceiba/cerrado', /^#\/ger\/resultados\/ceiba\/cerrado$/, '#/ger/planta-viva/ceiba/curso'],
  ['#/ger/produccion/ceiba~portafolio/doce', /^#\/ger\/resultados\/ceiba~portafolio\/doce$/, '#/ger/planta-viva/ceiba/curso'],
  ['#/ger/riesgo/ceiba/curso', /^#\/ger\/planta-viva\/ceiba\/curso$/, '#/ger/resultados/ceiba/curso'],
  ['#/ger/plantaViva/ceiba/curso', /^#\/ger\/planta-viva\/ceiba\/curso$/, '#/ger/resultados/ceiba/curso'],
  ['#/sup/bombas/ceiba/curso/P-201B', /^#\/sup\/equipos\/ceiba\/P-201B$/, '#/sup/hoy/ceiba/curso'],
  ['#/jefe/riesgo/ceiba/curso/P-201B', /^#\/jefe\/equipos\/ceiba\/P-201B$/, '#/jefe/hoy/ceiba/curso'],
  ['#/conf/bombas/morichal/curso/MPP-301', /^#\/conf\/equipos\/morichal\/MPP-301$/, '#/conf/resultados/morichal/curso'],
  ['#/prod/equipo/ceiba/curso', /^#\/prod\/equipos\/ceiba/, '#/prod/planta-viva/ceiba/curso'],
  ['#/ger/portafolio/ceiba/curso', /^#\/ger\/planta-viva\/ceiba~portafolio\/curso$/, '#/ger/resultados/ceiba/curso'],
  ['#/oper/produccion/ceiba/curso', /^#\/oper\/hoy\/ceiba\/curso$/, '#/oper/equipos/ceiba'],
  ['#/plan/hoy/ceiba/curso', /^#\/prod\//, '#/prod/resultados/ceiba/curso'],
  ['#/ger/resultados/ceiba/cerrado/P-201B', /^#\/ger\/resultados\/ceiba\/cerrado\/P-201B$/, '#/ger/planta-viva/ceiba/curso'],
  ['#/sup/hoy/morichal/curso', /^#\/sup\/hoy\/ceiba\/curso$/, '#/sup/turno/ceiba/curso'],
]
const navegador = await lanzar()
const salida = []
const titulo = p => p.evaluate(() => document.querySelector('main h1')?.textContent?.trim().slice(0, 60) ?? '(sin h1)')
for (const [vieja, espera, desde] of CASOS) {
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.addInitScript(SIN_INTRO)
  const page = await ctx.newPage()
  const r = { vieja, desde }
  // «enlace»: desde otra pantalla abierta.
  await page.goto(`${base}/${desde}`); await lista(page); await esperar(500)
  const hashDesde = await page.evaluate(() => location.hash)
  await page.evaluate(h => { location.hash = h }, vieja.slice(1)); await esperar(400); await lista(page); await esperar(400)
  r.enlace = await page.evaluate(() => location.hash); r.enlaceOk = espera.test(r.enlace); r.enlaceTitulo = await titulo(page)
  await page.goBack(); await esperar(600); await lista(page)
  r.atras = await page.evaluate(() => location.hash); r.atrasOk = r.atras === hashDesde; r.atrasTitulo = await titulo(page)
  // Y adelante otra vez: no debe rebotar a la vieja sin redirigir.
  await page.goForward(); await esperar(600); await lista(page)
  r.adelante = await page.evaluate(() => location.hash)
  // «compartida»: carga nueva.
  await page.goto('about:blank'); await page.goto(`${base}/${vieja}`); await lista(page); await esperar(500)
  r.compartida = await page.evaluate(() => location.hash); r.compartidaOk = espera.test(r.compartida)
  r.aviso = await page.locator('[data-aviso-campo]').innerText().catch(() => null)
  await page.goBack(); await esperar(600)
  r.atrasCompartida = page.url()
  salida.push(r)
  await ctx.close()
}
await navegador.close()
const f = guardar('direcciones.json', salida)
console.log(`Direcciones → ${f}`)
for (const r of salida) console.log(`  ${r.enlaceOk && r.compartidaOk && r.atrasOk ? 'bien' : 'MAL '} ${r.vieja}\n       enlace → ${r.enlace} «${r.enlaceTitulo}» · atrás → ${r.atras} (${r.atrasOk ? 'vuelve' : 'NO vuelve a ' + r.desde}) · adelante → ${r.adelante}\n       compartida → ${r.compartida}${r.aviso ? ` · aviso «${r.aviso}»` : ''} · atrás → ${r.atrasCompartida}`)
