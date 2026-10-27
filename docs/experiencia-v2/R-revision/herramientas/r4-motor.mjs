/* R4 · §10 D7: cuánto tarda cada cálculo del motor, en el navegador, con la
   misma sesión que la aplicación (los módulos que sirve Vite son los mismos que
   usa la pantalla: misma instancia, misma memoria).

   node docs/experiencia-v2/R-revision/herramientas/r4-motor.mjs <url-dev> [freno-cpu]
     freno-cpu: 1 = CPU normal; 4 = como un teléfono de gama media (DevTools).

   Para cada función se mide en una página NUEVA (nada calculado antes, salvo lo
   que pide la pantalla de arranque, que es Configuración del administrador):
   la primera llamada (fría), la misma consulta otra vez (guardada) y otra
   consulta parecida (otro momento, otro rol o un solo campo). */
import { lanzar, SIN_INTRO, lista, guardar, esperar } from './r4-comun.mjs'

const [base = 'http://localhost:5184', frenoTxt = '1'] = process.argv.slice(2)
const freno = Number(frenoTxt)
const VUELTAS = Number(process.env.R4_VUELTAS ?? 3)

const CASOS = ['plantaViva', 'hoy', 'resultados', 'listaEquipos']

async function medir(caso) {
  const navegador = await lanzar()
  const page = await navegador.newPage({ viewport: { width: 1280, height: 900 } })
  await page.addInitScript(SIN_INTRO)
  await page.goto(`${base}/#/adm/configuracion/ceiba/curso`)
  await lista(page); await esperar(500)
  if (freno > 1) { const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: freno }) }
  const r = await page.evaluate(async caso => {
    const S = await import('/src/shared/api/sesion.ts')
    const D = await import('/src/entities/diferido.ts')
    const C = await import('/src/entities/campos.ts')
    const s = S.sesion()
    const todos = C.CAMPOS.map(c => c.id)
    const curso = D.rangoDePeriodo('curso')
    const t = f => { const t0 = performance.now(); const v = f(); return { ms: performance.now() - t0, v } }
    const out = { campos: todos }
    if (caso === 'plantaViva') {
      const PV = await import('/src/shared/api/plantaViva.ts')
      const q = m => ({ campos: todos, momento: m, desde: curso.desde, hasta: curso.hasta })
      const f = m => PV.pedirPlantaViva(q(m), s.ctx, s.versiones, s.clasificacionesAnh)
      out.fria = t(() => f('durante')).ms
      out.guardada = t(() => f('durante')).ms
      out.otra = t(() => f('antes')).ms + t(() => f('despues')).ms
      out.otraQue = 'Antes + Después (todos los campos)'
      out.unCampo = t(() => PV.pedirPlantaViva({ campos: ['morichal'], momento: 'durante', desde: curso.desde, hasta: curso.hasta }, s.ctx, s.versiones, s.clasificacionesAnh)).ms
    }
    if (caso === 'hoy') {
      const H = await import('/src/shared/api/hoy.ts')
      const f = rol => H.pedirHoy({ rol, campos: todos }, s)
      out.fria = t(() => f('jefe')).ms
      out.guardada = t(() => f('jefe')).ms
      out.otra = t(() => f('conf')).ms
      out.otraQue = 'conf en todos sus campos'
      out.unCampo = t(() => H.pedirHoy({ rol: 'sup', campos: ['ceiba'] }, s)).ms
    }
    if (caso === 'resultados') {
      const R = await import('/src/shared/api/resultados.ts')
      const f = rol => R.pedirResultados({ rol, campos: todos, desde: curso.desde, hasta: curso.hasta }, s)
      out.fria = t(() => f('ger')).ms
      out.guardada = t(() => f('ger')).ms
      out.otra = t(() => f('jefe')).ms
      out.otraQue = 'jefe en todos los campos (con relojes y vigía)'
      out.unCampo = t(() => R.pedirResultados({ rol: 'prod', campos: ['ceiba'], desde: curso.desde, hasta: curso.hasta }, s)).ms
    }
    if (caso === 'listaEquipos') {
      const E = await import('/src/shared/api/equiposTecnico.ts')
      const f = () => E.pedirListaEquipos(todos, s.ctx, s.versiones)
      const a = t(f); out.fria = a.ms; out.filas = a.v?.filas?.length ?? null
      out.guardada = t(f).ms
      out.otra = t(() => E.pedirNivelEquipo('ceiba', 'P-201B', s.ctx, s.versiones)).ms
      out.otraQue = 'nivel 3 de P-201B'
      out.unCampo = t(() => E.pedirListaEquipos(['morichal'], s.ctx, s.versiones)).ms
    }
    return out
  }, caso)
  await navegador.close()
  return r
}

const filas = {}
for (const caso of CASOS) {
  filas[caso] = []
  for (let i = 0; i < VUELTAS; i++) filas[caso].push(await medir(caso))
}
const med = xs => { const a = [...xs].sort((x, y) => x - y); return a[Math.floor(a.length / 2)] }
const resumen = Object.fromEntries(CASOS.map(c => [c, {
  fria: med(filas[c].map(x => x.fria)), max: Math.max(...filas[c].map(x => x.fria)), guardada: med(filas[c].map(x => x.guardada)),
  otra: med(filas[c].map(x => x.otra)), otraQue: filas[c][0].otraQue, unCampo: med(filas[c].map(x => x.unCampo)), campos: filas[c][0].campos, filas: filas[c][0].filas,
}]))
const f = guardar(`motor-cpu${freno}.json`, { base, freno, vueltas: VUELTAS, resumen, crudo: filas })
console.log(`D7 en el navegador (dev), CPU ${freno}×, mediana de ${VUELTAS} páginas nuevas → ${f}`)
for (const [c, x] of Object.entries(resumen))
  console.log(`  ${c.padEnd(13)} fría ${x.fria.toFixed(0)} ms (máx ${x.max.toFixed(0)}) · guardada ${x.guardada.toFixed(1)} ms · ${x.otraQue}: ${x.otra.toFixed(0)} ms · un campo: ${x.unCampo.toFixed(0)} ms`)
