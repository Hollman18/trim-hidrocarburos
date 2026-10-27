/* Verificación numérica del libro de diferidos y de la predicción.
 *
 * Corre las identidades que el backend también tiene que cumplir. Sale con
 * código 1 si alguna falla: nunca se da por bueno un resultado sin mirarlo.
 *
 *   node scripts/verificar-libro.mjs
 */
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
// Estas comprobaciones son del demo: un .env.local que apunte a un backend
// (VITE_FUENTE=http, como pide CONTRATO.md al comprobar uno) no las cambia de
// fuente. Vite respeta lo que ya trae el proceso antes que los archivos .env.
process.env.VITE_FUENTE = 'demo'
// fileURLToPath y no `.pathname`: con espacios o tildes en la carpeta («Mis
// proyectos», «Producción») `.pathname` da la ruta en %20/%C3%B3 y Vite no la
// encuentra; en Windows además da «/C:/…».
const RAIZ = fileURLToPath(new URL('..', import.meta.url))
// Sin la configuración del proyecto: la verificación no levanta el simulador
// de la API ni escribe su base (y no depende de node:sqlite).
const v = await createServer({ root: RAIZ, configFile: false, resolve: { alias: { '@': `${RAIZ}src` } }, server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'error' })
// Los insumos del motor se instalan antes de calcular, como lo hace main.tsx en
// el navegador: el motor no importa los datos de demostración (insumos.ts).
const INS = await v.ssrLoadModule('/src/entities/insumos.ts')
INS.instalarInsumos((await v.ssrLoadModule('/src/entities/datos/index.ts')).INSUMOS_DEMO)
const L = await v.ssrLoadModule('/src/entities/libro.ts')
const D = await v.ssrLoadModule('/src/entities/diferido.ts')
const B = await v.ssrLoadModule('/src/entities/bombas.ts')
const P = await v.ssrLoadModule('/src/entities/pozos.ts')
const C = await v.ssrLoadModule('/src/entities/configuracion.ts')
const U = await v.ssrLoadModule('/src/entities/usuarios.ts')
const I = await v.ssrLoadModule('/src/entities/informe.ts')
const R = await v.ssrLoadModule('/src/entities/reloj.ts')
const PL = await v.ssrLoadModule('/src/entities/plan.ts')
const PT = await v.ssrLoadModule('/src/entities/planta.ts')
const BO = await v.ssrLoadModule('/src/entities/bombas.ts')
const EQ = await v.ssrLoadModule('/src/entities/equipos.ts')
const SAP = await v.ssrLoadModule('/src/entities/sap.ts')
const CSU = await v.ssrLoadModule('/src/entities/causas-sugeridas.ts')
const AC = await v.ssrLoadModule('/src/entities/aciertos.ts')
const AS = await v.ssrLoadModule('/src/entities/asignacion.ts')
const CAT = await v.ssrLoadModule('/src/entities/catalogo.ts')

const f = n => Math.round(n).toLocaleString('es-CO')
let fallos = 0, pruebas = 0
const comprobar = (cond, msg) => { pruebas++; if (!cond) { fallos++; console.log('  ✗ FALLA:', msg) } else console.log('  ✓', msg) }
const cerca = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b))
const TODOS = ['ceiba', 'morichal', 'guacamayo', 'palmar', 'zarza']
const ctx0 = L.contextoInicial()
/** El historial de versiones firmadas del arranque: una sola, la de ctx0. */
const V0 = [C.versionInicial()]
/** La parada real de P-201B que la sección 11 responde en pantalla y la 13 revisa. */
let EV3

console.log('\n=== 1. Identidades de cada mes y campo ===')
let malas = 0, residuoMax = 0
for (const c of TODOS) for (const m of L.serieMensual([c], ctx0)) {
  const b = m.libro
  residuoMax = Math.max(residuoMax, Math.abs(b.residuo))
  const ok = cerca(b.potencial - b.real, b.diferido, 1e-9)
    && cerca(b.identificado + b.declarado + b.pendiente, b.diferido)
    && cerca(b.planeado + b.noPlaneado, b.diferido)
    && cerca(b.porEquipo.reduce((a, e) => a + e.bbl, 0), b.diferido)
    && cerca(b.porTipo.reduce((a, e) => a + e.bbl, 0), b.diferido)
    && cerca(b.porPozo.reduce((a, e) => a + e.bbl, 0), b.diferido)
    && cerca(b.altoImpacto, b.anticipable + b.sinInstrumento + b.sinParte)
  if (!ok) { malas++; console.log('    ', c, m.mes, 'pot−real', b.potencial - b.real, 'dif', b.diferido) }
}
comprobar(malas === 0, `65 meses-campo: potencial − real = Σ eventos; por señal + declarado + sin identificar = Σ; programado + no = Σ; Paretos por equipo, tipo y pozo suman Σ; alto impacto = vigilado + sin instrumento + sin parte`)
comprobar(residuoMax < 1e-6, `residuo de inventario en meses enteros: ${residuoMax.toExponential(1)} bbl`)

console.log('\n=== 2. Portafolio por período ===')
for (const per of ['cerrado', 'curso', 'trimestre', 'ytd', 'doce']) {
  const r = D.rangoDePeriodo(per)
  const lb = L.libro(TODOS, r.desde, r.hasta, ctx0)
  console.log(`  ${r.nombre}: real ${f(lb.real)} · potencial ${f(lb.potencial)} · diferido ${f(lb.diferido)} ±${f(lb.tolerancia)} · alto impacto ${f(lb.altoImpacto)} · evitable por orden ${f(lb.evitablePorOrden)} · publicable ${lb.publicable}`)
  comprobar(cerca(lb.porCampo.reduce((a, c) => a + c.brecha, 0), lb.brecha), `${r.nombre}: los campos suman la brecha del portafolio`)
  comprobar(cerca(lb.brecha - lb.diferido, lb.residuo), `${r.nombre}: brecha − Σ eventos = inventario (${f(lb.residuo)} bbl)`)
  const dias = L.porDia(TODOS, r.desde, r.hasta, ctx0)
  comprobar(cerca(dias.reduce((a, d) => a + d.real, 0), lb.real, 1e-9) && cerca(dias.reduce((a, d) => a + d.potencial, 0), lb.potencial, 1e-9)
    && cerca(dias.reduce((a, d) => a + d.diferido, 0), lb.diferido, 1e-9), `${r.nombre}: la serie diaria suma lo mismo que el libro`)
}

console.log('\n=== 3. Factor de asignación y custodia ===')
const doce = L.libro(TODOS, new Date(L.calendario()[0].desde), new Date(L.calendario().at(-1).hasta), ctx0)
const fuera = doce.fa.filter(x => !x.dentro).map(x => `${x.campoId} ${x.mes}`)
comprobar(fuera.length === 1 && fuera[0] === 'palmar 2026-04', `solo El Palmar en abril sale de banda (sembrado): ${fuera.join(', ')}`)
comprobar(doce.custodia.sinPrueba.map(p => p.id).join() === 'ZA-09', 'el único pozo sin prueba es ZA-09')
comprobar(doce.tramos.every(t => t.causa.evidencia.length > 0 && t.causa.equipo), `los ${doce.tramos.length} tramos traen su causa, su equipo y su evidencia`)
comprobar(doce.tramos.filter(t => t.sinCustodia).every(t => t.bbl === 0), 'un pozo sin prueba no tiene barriles: no se le inventa caudal')
comprobar(doce.tramos.filter(t => t.aproximado).every(t => t.evento.codigo === 'HZ'), 'solo los tramos a frecuencia reducida son aproximados')

console.log('\n=== 4. Bombas: colchón previsto contra el que aguantó ===')
let comparadas = 0, desvio = 0
for (const ev of B.eventosBomba()) {
  const m = D.paradaMedida(ev, ctx0, V0)
  if (!m?.colchon || m.colchon.observadoH === undefined) continue
  comparadas++
  desvio = Math.max(desvio, Math.abs(m.colchon.previsto.horas - m.colchon.observadoH))
}
comprobar(comparadas >= 8 && desvio < 0.1, `${comparadas} paradas con cierre de pozos: el colchón previsto y el observado difieren a lo más ${desvio.toFixed(3)} h`)
const pc = D.prediccion(B.perfilBomba('P-201B', 'ceiba'), ctx0)
// La Ceiba tiene P-201A y P-201C en paralelo: una parada total de P-201B deja sin salida
// lo que el respaldo no absorbe, y los operarios cierran pozos hasta quitar ESA agua (su
// prueba al cerrarlos), no todo el campo.
const ceibaTotal = B.eventosBomba().filter(e => e.campoId === 'ceiba' && e.perdida === 1).map(e => D.paradaMedida(e, ctx0, V0))
  .filter(m => m.causa.equipo === 'P-201B' && m.bbl > 0)
const aguaCerrada = m => [...new Map(m.tramos.map(t => [t.pozo.id, L.aguaDePrueba(t.pozo, Date.parse(t.evento.inicio))])).values()].reduce((a, w) => a + w, 0)
comprobar(ceibaTotal.length >= 8 && ceibaTotal.every(m => m.pozos < P.pozosDe('ceiba').length && aguaCerrada(m) >= pc.aguaSinSalidaBpd - 1),
  `La Ceiba con respaldo: cada parada total propia cierra pozos hasta quitar los ${f(pc.aguaSinSalidaBpd)} bbl/d sin salida, nunca todo el campo (${ceibaTotal.map(m => m.pozos).join(', ')} de ${P.pozosDe('ceiba').length} pozos)`)
const rc = D.riesgoAhora(['ceiba'], ctx0).find(r => r.equipo === 'P-201B' && r.estado === 'perdiendo')
comprobar(pc.perdiendo && rc && cerca(pc.perdiendo.bblDia, rc.bblDia), `P-201B de La Ceiba parada: la predicción y el riesgo dicen lo mismo (${f(pc.perdiendo?.bblDia ?? 0)} bbl/d)`)
const pm = D.prediccion(B.perfilBomba('P-201B', 'morichal'), ctx0)
comprobar(pm.orden && pm.orden.crudoBpd <= pm.orden.crudoParejoBpd + 1e-9, `Morichal: cerrar en orden pierde ${f(pm.orden.crudoBpd)} bbl/d contra ${f(pm.orden.crudoParejoBpd)} parejo`)

console.log('\n=== 5. Preguntas y no conformidades ===')
const preg = L.libro(TODOS, new Date(L.calendario()[0].desde), new Date(Date.parse('2026-10-02T14:00:00-05:00')), ctx0).preguntas
const nc = preg.filter(p => p.arrancoSinIdentificar).map(p => p.id).sort()
comprobar(nc.join() === ['EP-LC08-261001-02', 'EP-PA04-260621-05', 'EV-M2011-260924'].sort().join(), `no conformidades: ${nc.join(', ')}`)
comprobar(preg.some(p => p.id === 'EP-LC21-261001-01' && p.pide && !p.fin), 'LC-21 sigue parado sin identificar: no arrancar')

console.log('\n=== 6. Lo que entra a mano cambia el cálculo como debe ===')
const oct = { d: new Date('2026-10-01T00:00:00-05:00'), h: new Date('2026-10-02T14:00:00-05:00') }
const antes = L.libro(['ceiba'], oct.d, oct.h, ctx0)
const ctx1 = { config: ctx0.config, respuestas: { 'EP-LC21-261001-01': { texto: 'Cierre para cambiar la válvula de la cabeza', por: 'prueba', hora: '2026-10-02T14:00:00-05:00' } } }
const despues = L.libro(['ceiba'], oct.d, oct.h, ctx1)
comprobar(cerca(despues.pendiente, antes.pendiente - antes.tramos.filter(t => t.evento.id === 'EP-LC21-261001-01').reduce((a, t) => a + t.bbl, 0))
  && cerca(despues.diferido, antes.diferido), `responder LC-21 pasa ${f(antes.pendiente - despues.pendiente)} bbl de «sin identificar» a «declarado» sin cambiar el total`)
const sep = D.rangoDePeriodo('cerrado')
const s0 = L.libro(['morichal'], sep.desde, sep.hasta, ctx0)
const ctx2 = { config: ctx0.config, respuestas: { 'EV-M2011-260924': { texto: 'Sello con fuga', por: 'prueba', hora: '2026-10-02T14:00:00-05:00', parte: 'sello' } } }
const s2 = L.libro(['morichal'], sep.desde, sep.hasta, ctx2)
comprobar(s2.sinParte < s0.sinParte && cerca(s2.altoImpacto, s0.altoImpacto), `declarar la parte de P-201B (Morichal) baja «sin parte» de ${f(s0.sinParte)} a ${f(s2.sinParte)} bbl`)
// Una meta nueva que rige desde el 15 de octubre: cambia el total del mes,
// no lo que va a la fecha (hoy es 2 de octubre) ni septiembre, ni el diferido.
const cur = D.rangoDePeriodo('curso')
const cfg3 = C.conTramo(ctx0.config, 'ceiba', { desde: '2026-10-15', produccionBpd: 12000, diferidoMaxBpd: 600, netbackUsd: 48, criterioSinCausa: 2 })
const ctx3 = { config: cfg3, respuestas: {} }
const o0 = L.libro(['ceiba'], cur.desde, cur.hasta, ctx0), o3 = L.libro(['ceiba'], cur.desde, cur.hasta, ctx3)
const sep3 = L.libro(['ceiba'], sep.desde, sep.hasta, ctx3), sep0 = L.libro(['ceiba'], sep.desde, sep.hasta, ctx0)
comprobar(cerca(o3.meta.produccion, o0.meta.produccion) && cerca(o3.meta.produccionTotal - o0.meta.produccionTotal, (12000 - 10900) * 17)
  && cerca(sep3.meta.produccion, sep0.meta.produccion) && cerca(o3.diferido, o0.diferido),
  `una meta firmada desde el 15-oct suma ${f((12000 - 10900) * 17)} bbl al total de octubre y no toca lo que va a la fecha, ni septiembre, ni el diferido`)
const cfg4 = structuredClone(ctx0.config); cfg4.respaldos.find(r => r.campoId === 'morichal' && r.equipo === 'P-201B').libreBpd = 10000
const p4 = D.prediccion(B.perfilBomba('P-201B', 'morichal'), { config: cfg4, respuestas: {} })
comprobar(p4.aguaSinSalidaBpd > pm.aguaSinSalidaBpd && p4.colchon.horas < pm.colchon.horas, `menos respaldo (${f(pm.respaldoLibreBpd)} → 10.000 bbl/d): más agua sin salida y menos colchón (${pm.colchon.horas.toFixed(1)} → ${p4.colchon.horas.toFixed(1)} h)`)
comprobar(C.diferencias(ctx0.config, cfg4).length === 1, 'la firma lista exactamente el cambio hecho')

console.log('\n=== 6b. Metas en barriles: la global es la suma ===')
const sumaCampos = k => TODOS.reduce((a, c) => a + L.libro([c], cur.desde, cur.hasta, ctx0).meta[k], 0)
const glob = L.libro(TODOS, cur.desde, cur.hasta, ctx0)
comprobar(['produccion', 'diferido', 'produccionTotal', 'diferidoTotal'].every(k => cerca(glob.meta[k], sumaCampos(k))),
  `la meta global es la suma de los campos: ${f(glob.meta.produccionDia)} bbl/d de producción y ${f(glob.meta.diferidoDia)} de máximo de diferido`)
const semP = 10900 + 16700 + 6300 + 3250 + 3050, semD = 800 + 950 + 450 + 50 + 50
comprobar(cerca(glob.meta.produccionTotal, semP * 31) && cerca(glob.meta.diferidoTotal, semD * 31) && cerca(glob.meta.diasTotal, 31),
  `el total de octubre es la meta por día × 31 días: ${f(semP * 31)} bbl a producir y ${f(semD * 31)} como máximo de diferido`)
comprobar(cerca(glob.meta.produccion, semP * glob.meta.dias) && glob.meta.dias < 2,
  `lo que va a la fecha se prorratea: ${glob.meta.dias.toFixed(2)} días × ${f(semP)} = ${f(glob.meta.produccion)} bbl`)
const dOct = L.porDia(['ceiba'], cur.desde, cur.hasta, ctx3)
comprobar(dOct.every(d => cerca(d.meta, 10900 * d.horas / 24)), 'la meta de cada día de la gráfica es la del tramo que rige ese día')
const mal = C.validarConfig(C.conTramo(ctx0.config, 'ceiba', { desde: '2026-09-15', produccionBpd: 1, diferidoMaxBpd: 1, netbackUsd: 48, criterioSinCausa: 2 }), ctx0.config, '2026-10-01')
comprobar(mal.some(e => e.includes('mes que ya cerró')), 'no se puede firmar una meta que reescriba un mes cerrado')
// El precio lleva fecha: subirlo desde hoy cambia el valor de octubre y no el de septiembre.
const cfgP = C.conTramo(ctx0.config, 'ceiba', { desde: '2026-10-02', produccionBpd: 10900, diferidoMaxBpd: 800, netbackUsd: 60, criterioSinCausa: 2 })
const ctxP = { config: cfgP, respuestas: {} }
const sepP = L.libro(['ceiba'], sep.desde, sep.hasta, ctxP), octP = L.libro(['ceiba'], cur.desde, cur.hasta, ctxP)
comprobar(cerca(sepP.valorUsd, sep0.valorUsd) && octP.valorUsd > o0.valorUsd,
  `un precio nuevo desde hoy no toca septiembre (${f(sep0.valorUsd)} USD) y sí octubre (${f(o0.valorUsd)} → ${f(octP.valorUsd)} USD)`)
const g4 = C.diferenciasPorGrupo(ctx0.config, cfg4), g3 = C.diferenciasPorGrupo(ctx0.config, cfg3)
comprobar(g4.metas.length === 0 && g4.tecnica.length === 1 && g3.metas.length === 1 && g3.tecnica.length === 0,
  'un respaldo lo firma el administrador; una meta, el gerente')

// Lo que ya pasó no se reescribe por ningún lado: ni metas, ni el programa de paradas.
const ahoraMs = R.AHORA.getTime()
const conParadaPasada = structuredClone(ctx0.config)
conParadaPasada.programa.push({ id: 'PR-prueba', campoId: 'ceiba', equipo: 'P-201B', desde: '2026-09-01T00:00:00-05:00', hasta: '2026-09-30T23:00:00-05:00', motivo: 'prueba de reglas' })
const sinParadaPasada = structuredClone(ctx0.config)
const pasada = sinParadaPasada.programa.find(p => Date.parse(p.desde) < ahoraMs)
sinParadaPasada.programa = sinParadaPasada.programa.filter(p => p !== pasada)
const sinTramoViejo = structuredClone(cfg3); sinTramoViejo.campos.ceiba.metas = sinTramoViejo.campos.ceiba.metas.filter(t => t.desde !== '2025-10-01')
comprobar(C.validarConfig(conParadaPasada, ctx0.config, '2026-10-01', ahoraMs).some(e => e.includes('ya empezó'))
  && C.validarConfig(sinParadaPasada, ctx0.config, '2026-10-01', ahoraMs).some(e => e.includes('ya empezó'))
  && C.validarConfig(sinTramoViejo, cfg3, '2026-10-01', ahoraMs).some(e => e.includes('mes cerrado')),
  'una parada no entra ni sale del programa después de empezar, y una meta de un mes cerrado no se quita')
// La huella de una ficha es la de ESE equipo en SU campo, aunque se abra desde el portafolio.
const portSep = L.libro(TODOS, sep.desde, sep.hasta, ctx0)
const huellaCeiba = I.cifrasDe(portSep, TODOS, 1, { equipo: 'P-201B', campoId: 'ceiba' })
const soloCeiba = L.libro(['ceiba'], sep.desde, sep.hasta, ctx0).porEquipo.filter(x => x.equipo === 'P-201B').reduce((a, x) => a + x.bbl, 0)
comprobar(cerca(huellaCeiba.bblEquipo, Math.round(soloCeiba * 100) / 100, 1e-6),
  `la huella de la ficha de P-201B de La Ceiba lleva sus ${f(soloCeiba)} bbl, no los de las P-201B de otros campos`)
// Precio solo desde hoy para La Zarza: el campo queda «sin precio en parte del período» y lo valorado es solo lo que tiene precio.
const cfgZ = C.conTramo(ctx0.config, 'zarza', { desde: '2026-10-02', produccionBpd: 3050, diferidoMaxBpd: 50, netbackUsd: 40, criterioSinCausa: 2 })
const oz = L.libro(['zarza'], cur.desde, cur.hasta, { config: cfgZ, respuestas: {} })
comprobar(oz.sinPrecio.includes('zarza') && oz.valorCampos.con === 0 && oz.valorUsd !== undefined,
  'un campo con precio solo en parte del período no cuenta como «con precio», y sus días con precio sí se valoran')
// El valor de una ficha usa el precio de cada día, como el libro.
const cfgM = C.conTramo(ctx0.config, 'morichal', { desde: '2026-10-02', produccionBpd: 16700, diferidoMaxBpd: 950, netbackUsd: 60, criterioSinCausa: 2 })
const tsM = L.diferidoDeEquipo('morichal', 'MN-41', cur.desde, cur.hasta, { config: cfgM, respuestas: {} }).tramos
const esperado = tsM.reduce((a, t) => {
  let x = 0
  for (let d = Date.parse('2026-10-01T00:00:00-05:00'); d < t.fin.getTime(); d += 864e5) {
    const parte = (Math.min(t.fin.getTime(), d + 864e5) - Math.max(t.inicio.getTime(), d)) / (t.fin.getTime() - t.inicio.getTime())
    if (parte > 0) x += t.bbl * parte * (d >= Date.parse('2026-10-02T00:00:00-05:00') ? 60 : 48)
  }
  return a + x
}, 0)
comprobar(tsM.length > 0 && cerca(L.valorDeTramos(tsM, { config: cfgM, respuestas: {} }), esperado, 1e-9),
  `la ficha valora cada día con su precio: MN-41 en octubre vale ${f(esperado)} USD con 48 el 1 y 60 desde el 2`)

console.log('\n=== 6c. Accesos ===')
const us = U.USUARIOS_INICIALES
const ger = us.find(u => u.rolId === 'ger')
comprobar(U.validarAcceso(us, { ...ger, estado: 'suspendido' }, 'adm', 'prueba de reglas').some(e => e.includes('al menos un gerente')),
  'no se puede dejar la operación sin gerente con acceso')
comprobar(U.validarAcceso(us, { ...ger, rolId: 'prod' }, ger.id, 'prueba de reglas').some(e => e.includes('a sí mismo')),
  'nadie se quita su propio rol')
const conInvitado = [...us, { id: 'u90', nombre: 'Gerente Nuevo', correo: 'gerente.nuevo@operadora.example', rolId: 'ger', campos: 'todos', estado: 'invitado', desde: '2026-10-02' }]
comprobar(U.validarAcceso(conInvitado, { ...ger, estado: 'suspendido' }, 'adm', 'prueba de reglas').some(e => e.includes('al menos un gerente')),
  'un gerente invitado (que todavía no entra) no cuenta como gerente con acceso')
comprobar(U.validarAcceso(us, { id: 'u99', nombre: 'Persona Nueva', correo: us[1].correo, rolId: 'sup', campos: ['ceiba'], estado: 'invitado', desde: '' }, ger.id, 'nuevo supervisor').some(e => e.includes('ese correo')),
  'no hay dos personas con el mismo correo')
comprobar(U.validarAcceso(us, { ...us.find(u => u.rolId === 'sup'), campos: ['ceiba', 'morichal'] }, ger.id, '').some(e => e.includes('motivo'))
  && U.validarAcceso(us, { ...us.find(u => u.rolId === 'sup'), campos: ['ceiba', 'morichal'] }, ger.id, 'cubre también Morichal').length === 0,
  'todo cambio de acceso exige motivo, y con motivo pasa')

console.log('\n=== 6d. Plan mes a mes (presupuesto) ===')
const opc = { enBblMes: false, desdeMes: '2026-10', permitidos: TODOS }
const pegado = 'Mes\tCampo\tProducción\tMáx\tPrecio\n2026-11\tLa Ceiba\t11.200\t750\t48,5\nnoviembre de 2026\tMorichal Norte\t16900\t900\t\n12/2026\tla ceiba\t11300\t700\t'
const lp = PL.leerPlan(pegado, opc)
comprobar(lp.errores.length === 0 && lp.filas.length === 3
  && lp.filas[0].produccionBpd === 11200 && lp.filas[0].netbackUsd === 48.5 && lp.filas[1].mes === '2026-11' && lp.filas[1].campoId === 'morichal'
  && lp.filas[2].mes === '2026-12' && lp.filas[2].netbackUsd === undefined,
  'lee lo pegado de Excel: cabecera, miles «11.200», decimal «48,5», meses «noviembre de 2026» y «12/2026», campo sin importar mayúsculas')
const malos = PL.leerPlan('2026-09;La Ceiba;11000;800\n2026-11;Campo X;100;1\n2026-11;La Ceiba;-5;1\n2026-11;La Ceiba;abc;1', opc)
comprobar(malos.filas.length === 0 && malos.errores.some(e => e.includes('ya cerró')) && malos.errores.some(e => e.includes('no es un campo'))
  && malos.errores.some(e => e.includes('mayor que cero')) && malos.errores.some(e => e.includes('«abc» no es un número')),
  'rechaza un mes cerrado, un campo que no existe y una producción negativa o que no es número')
const enMes = PL.leerPlan('2026-11;La Ceiba;330000;24000', { ...opc, enBblMes: true })
comprobar(enMes.filas[0].produccionBpd === 11000 && enMes.filas[0].diferidoMaxBpd === 800, 'un presupuesto en bbl del mes se convierte a bbl/d (330.000 ÷ 30 días = 11.000)')
const ajeno = PL.leerPlan('2026-11;La Zarza;3000;50', { ...opc, permitidos: ['ceiba'] })
comprobar(ajeno.filas.length === 0 && ajeno.errores.some(e => e.includes('no tiene asignado')), 'no carga campos que quien carga no tiene asignados')
// Cada mes del plan es un tramo desde su día 1: noviembre y diciembre se miden con su cifra.
let cfgPlan = ctx0.config
for (const [mes, prod] of [['2026-11', 11200], ['2026-12', 11300]]) cfgPlan = C.conTramo(cfgPlan, 'ceiba', { desde: `${mes}-01`, produccionBpd: prod, diferidoMaxBpd: 750, netbackUsd: 48, criterioSinCausa: 2 })
const nov = L.metaEntre(cfgPlan, 'ceiba', Date.parse('2026-11-01T00:00:00-05:00'), Date.parse('2026-12-01T00:00:00-05:00'))
const dic = L.metaEntre(cfgPlan, 'ceiba', Date.parse('2026-12-01T00:00:00-05:00'), Date.parse('2027-01-01T00:00:00-05:00'))
const ene = L.metaEntre(cfgPlan, 'ceiba', Date.parse('2027-01-01T00:00:00-05:00'), Date.parse('2027-02-01T00:00:00-05:00'))
comprobar(cerca(nov.produccion, 11200 * 30) && cerca(dic.produccion, 11300 * 31) && cerca(ene.produccion, 11300 * 31) && cerca(nov.diferido, 750 * 30),
  'el plan mide cada mes con su cifra (nov 11.200 × 30, dic 11.300 × 31) y el mes sin cifra sigue con la última')

console.log('\n=== 6e. Perfil de cada campo ===')
let contradice = []
for (const c of TODOS) {
  const pf = C.perfilDe(ctx0.config, c)
  const esp = P.pozosDe(c).filter(p => p.levantamiento === 'electrosumergible').length
  const bombas = Object.keys(EQ.EQUIPOS).filter(id => BO.esBomba(id) && (BO.perfilBomba(id, c) || EQ.equipoEnCampo(id, c))).length
  const gas = PT.CAMPO_PLANTA[c].gas.length
  if ((esp > 0) !== pf.electrosumergibles || (bombas > 0) !== pf.bombas || (gas > 0) !== (pf.gas !== 'no')) contradice.push(c)
}
comprobar(contradice.length === 0, `el perfil semilla de cada campo cuadra con su registro (electrosumergibles, bombas, tren de gas)${contradice.length ? ': no cuadra ' + contradice.join(', ') : ''}`)
// Apagar una familia la saca de la vigilancia (avisos y predicciones), no del libro.
const cfgSinEsp = structuredClone(ctx0.config); cfgSinEsp.campos.morichal.perfil.electrosumergibles = false
const rConEsp = D.riesgoAhora(['morichal'], ctx0), rSinEsp = D.riesgoAhora(['morichal'], { config: cfgSinEsp, respuestas: {} })
const espAvisando = rConEsp.filter(r => r.estado === 'en-riesgo' && r.tipo === 'electrosumergible').length
comprobar(espAvisando > 0 && !rSinEsp.some(r => r.estado === 'en-riesgo' && r.tipo === 'electrosumergible')
  && cerca(L.libro(['morichal'], sep.desde, sep.hasta, { config: cfgSinEsp, respuestas: {} }).diferido, L.libro(['morichal'], sep.desde, sep.hasta, ctx0).diferido),
  `sin electrosumergibles en el perfil, sus ${espAvisando} avisos salen de la vigilancia y el libro sigue contando lo mismo`)
const sinGas = PT.armar(PT.CAMPO_PLANTA.palmar, new Set()), conGas = PT.armar(PT.CAMPO_PLANTA.ceiba, new Set())
comprobar(!sinGas.bandas.some(b => b.titulo === 'Tren de gas') && conGas.bandas.some(b => b.titulo === 'Tren de gas') && sinGas.alto < conGas.alto,
  'un campo sin gas no dibuja tren de gas ni le reserva el carril')

console.log('\n=== 6f. Sin meta firmada (una configuración incompleta del servidor) ===')
// GET /api/configuracion/historial puede traer una versión sin un campo, o con el campo y sin
// tramos. Ni la semilla de la demostración ni un 0: el libro dice «sin meta firmada», no se
// publica, no valoriza con el precio de la demo y el total global lo dice aunque falte uno solo.
const cfgSinCeiba = structuredClone(ctx0.config); delete cfgSinCeiba.campos.ceiba
const cfgCeibaVacia = structuredClone(ctx0.config); cfgCeibaVacia.campos.ceiba.metas = []
const ctxSin = { config: cfgSinCeiba, respuestas: {} }, ctxVacia = { config: cfgCeibaVacia, respuestas: {} }
const lSinMeta = L.libro(['ceiba'], sep.desde, sep.hasta, ctxSin), lVacia = L.libro(['ceiba'], sep.desde, sep.hasta, ctxVacia)
const lConMeta = L.libro(['ceiba'], sep.desde, sep.hasta, ctx0)
const portSin = L.libro(TODOS, sep.desde, sep.hasta, ctxSin)
const diasSin = L.porDia(['ceiba', 'morichal'], sep.desde, sep.hasta, ctxSin)
comprobar([lSinMeta, lVacia].every(lb => lb.meta.sinMeta.join() === 'ceiba' && lb.meta.produccion === 0 && !L.conMeta(lb.meta) && !lb.publicable
    && lb.motivos.some(m => m.codigo === 'sin-meta' && m.campoId === 'ceiba') && lb.valorUsd === undefined && lb.sinPrecio.join() === 'ceiba' && lb.porCampo[0].sinMeta)
  && C.metaEn(cfgSinCeiba, 'ceiba', sep.desde.getTime()) === undefined && C.criterioEn(cfgSinCeiba, 'ceiba', sep.desde.getTime()) === undefined
  && C.precioEn(cfgSinCeiba, 'ceiba', sep.desde.getTime()) === undefined
  && !C.perfilDe(cfgSinCeiba, 'ceiba').bombas && !C.perfilDe(cfgSinCeiba, 'ceiba').electrosumergibles && !C.tienePerfil(cfgSinCeiba, 'ceiba')
  && L.conMeta(lConMeta.meta) && lConMeta.meta.produccion > 0
  && portSin.meta.sinMeta.join() === 'ceiba' && !L.conMeta(portSin.meta) && /sin meta firmada en La Ceiba/.test(L.textoSinMeta(portSin.meta, true))
  && portSin.porCampo.filter(c => c.sinMeta).map(c => c.campoId).join() === 'ceiba' && diasSin.every(d => d.meta === null)
  && L.metaEntre(cfgSinCeiba, 'ceiba', sep.desde.getTime(), sep.hasta.getTime()).sinMeta,
  `La Ceiba sin meta en la configuración (o con el campo y sin tramos): «sin meta firmada», no publicable (sin-meta), sin valor en USD ni precio de la demo, sin perfil inventado; el portafolio dice «${L.textoSinMeta(portSin.meta, true)}» y el día a día no da meta`)
// Coma como separador: «9000,500,100» es legítima y entra sin error; «16700,1,200» entra leída como
// dos columnas pero con un aviso visible antes de firmar (no se acepta en silencio).
const plLegit = PL.leerPlan('2026-11,La Ceiba,9000,500,100', { enBblMes: false, desdeMes: '2026-10', permitidos: ['ceiba', 'morichal'] })
const plDuda = PL.leerPlan('2026-11,Morichal,16700,1,200', { enBblMes: false, desdeMes: '2026-10', permitidos: ['ceiba', 'morichal'] })
comprobar(plLegit.errores.length === 0 && plLegit.filas.length === 1 && plDuda.errores.length === 0 && plDuda.filas[0]?.diferidoMaxBpd === 1
  && plDuda.avisos.some(a => a.includes('«1,200» se leyó como dos columnas')),
  'plan con coma: «9000,500,100» entra limpia y «16700,1,200» entra con el aviso de que «1,200» se leyó como dos columnas')
// Mi perfil: el operador ve «responder» concedido y solo «completar el análisis» negado, sin volver a
// negar lo que hace; el jefe ve las dos concedidas (completar incluye responder).
const TI = await v.ssrLoadModule('/src/entities/tipos.ts'), RO = await v.ssrLoadModule('/src/entities/roles.ts')
const pOper = TI.permisosDelRol(RO.rolPorId('oper').puede), pJefe = TI.permisosDelRol(RO.rolPorId('jefe').puede)
comprobar(pOper.concedidas.includes('causa:declarar') && pOper.negadas.includes('causa:completar') && !/[Rr]esponder/.test(TI.CAPACIDAD_NOMBRE['causa:completar'])
  && pJefe.concedidas.includes('causa:declarar') && pJefe.concedidas.includes('causa:completar'),
  'Mi perfil: el operador tiene «responder» y le falta solo «completar el análisis»; el jefe tiene las dos')
// Un tramo que todavía no empezó no se usa hacia atrás: si La Ceiba tiene su primer tramo el 1-oct,
// septiembre queda «sin meta firmada» (ni meta, ni precio, ni regla de cierre que nadie firmó para ese mes).
const cfgTarde = structuredClone(ctx0.config); cfgTarde.campos.ceiba.metas = cfgTarde.campos.ceiba.metas.map(m => ({ ...m, desde: '2026-10-01' }))
const lTarde = L.libro(['ceiba'], sep.desde, sep.hasta, { config: cfgTarde, respuestas: {} })
comprobar(C.metaEn(cfgTarde, 'ceiba', sep.desde.getTime()) === undefined && C.precioEn(cfgTarde, 'ceiba', sep.desde.getTime()) === undefined
  && C.criterioEn(cfgTarde, 'ceiba', sep.desde.getTime()) === undefined && C.metaEn(cfgTarde, 'ceiba', new Date('2026-10-02T12:00:00-05:00').getTime()) !== undefined
  && lTarde.meta.sinMeta.join() === 'ceiba' && !lTarde.publicable && lTarde.valorUsd === undefined,
  'un tramo que empieza el 1-oct no rige en septiembre: septiembre sale «sin meta firmada», sin precio ni regla de cierre, y octubre sí la tiene')
// Firmar la meta de un campo que la configuración no traía lo agrega (no revienta), y la firma pide las casillas vacías.
const conNueva = C.conTramo(cfgSinCeiba, 'ceiba', { desde: '2026-10-02', produccionBpd: 10000, diferidoMaxBpd: 700, criterioSinCausa: 2 })
comprobar(conNueva.campos.ceiba.metas.length === 1 && !conNueva.campos.ceiba.perfil.bombas && C.diferencias(cfgSinCeiba, conNueva).some(x => /La Ceiba: campo nuevo/.test(x))
  && C.validarConfig(C.conTramo(cfgSinCeiba, 'ceiba', { desde: '2026-10-02', produccionBpd: NaN, diferidoMaxBpd: NaN, criterioSinCausa: NaN }), cfgSinCeiba, '2026-10-01', R.AHORA.getTime()).some(e => /La Ceiba: la meta de producción/.test(e)),
  'el gerente puede firmar la meta de un campo que la configuración no traía: entra como campo nuevo y, con las casillas vacías, la firma se rechaza')

console.log('\n=== 7. Historia de fallas ===')
let espMal = 0
for (const p of P.todosLosPozos().filter(x => x.levantamiento === 'electrosumergible')) {
  const h = L.historialDeEquipo(p.campoId, p.id, ctx0)
  if (h.fallas < 2 ? h.mtbfDias !== undefined : !cerca(h.mtbfDias, h.dias / h.fallas)) espMal++
}
comprobar(espMal === 0, 'el tiempo entre fallas solo se calcula con dos fallas o más, y es días ÷ fallas')
const hc = L.historialDeEquipo('ceiba', 'P-201B', ctx0)
console.log(`  P-201B de La Ceiba: ${hc.fallas} fallas, una cada ${hc.mtbfDias?.toFixed(0)} días, ${hc.mdtH?.toFixed(1)} h fuera, ${f(hc.bbl)} bbl · partes ${hc.porParte.map(x => `${x.parte} ${x.fallas}`).join(', ')}`)
const hg = L.historialDeEquipo('guacamayo', 'P-201B', ctx0)
comprobar(hg.fallas > 0 && hg.bbl === 0, `Guacamayo (recobro): sus ${hg.fallas} fallas cuentan aunque no costaron barriles`)

console.log('\n=== 8. SAP, causas sugeridas, aciertos y asignación oficial ===')
const ahora = R.AHORA.getTime()
const hs = SAP.historiaSap(ctx0)
// SAP: cada correctiva atiende una falla cerrada del PLC, aviso y orden se apuntan entre sí, nada liberado en el futuro.
const fallasCerradas = new Set(TODOS.flatMap(c => [...new Set(hs.ordenes.filter(o => o.campoId === c && o.evento).map(o => o.equipo))]
  .flatMap(eq => L.historialDeEquipo(c, eq, ctx0).eventos.filter(e => !e.disparo && e.fin).map(e => e.id))))
const correctivas = hs.ordenes.filter(o => o.clase === 'PM01')
comprobar(correctivas.length > 0 && correctivas.every(o => o.evento && fallasCerradas.has(o.evento)), `las ${correctivas.length} correctivas de SAP atienden cada una una falla cerrada del PLC`)
comprobar(hs.avisos.every(a => !a.orden || hs.ordenes.find(o => o.numero === a.orden)?.aviso === a.numero), 'aviso y orden se apuntan entre sí')
comprobar(hs.ordenes.every(o => (!o.liberada || new Date(o.liberada).getTime() <= ahora) && new Date(o.creada).getTime() <= ahora
  && (o.estado !== 'REL' || !!o.liberada)), 'ninguna orden creada o liberada en el futuro; una liberada tiene su hora')
// La historia de SAP es lo que quedó registrado: firmar o responder hoy no la renumera;
// la parte declarada después sí llega al aviso y a la orden, con el mismo número.
const cfgFut = structuredClone(ctx0.config)
cfgFut.programa = [...cfgFut.programa, { id: 'PR-FUT-1', campoId: 'ceiba', equipo: 'P-201B', desde: '2026-10-05T06:00:00-05:00', hasta: '2026-10-05T18:00:00-05:00', motivo: 'Preventivo de prueba' }]
cfgFut.campos.morichal.perfil.electrosumergibles = false
const hf = SAP.historiaSap({ config: cfgFut, respuestas: {} })
const numeros = h => h.ordenes.map(o => o.numero).join(',') + '|' + h.avisos.map(a => a.numero).join(',')
comprobar(numeros(hf) === numeros(hs), 'firmar hoy un programa o apagar una familia no borra ni renumera nada de la historia de SAP')
const sinParte = hs.avisos.find(a => a.evento && !a.parte && a.tipo === 'M2')
const hR = sinParte ? SAP.historiaSap({ config: ctx0.config, respuestas: { [sinParte.evento]: { texto: 'Sello', por: 'x', parte: 'sello', modo: 'ELP', hora: R.AHORA.toISOString(), canal: 'pantalla' } } }) : undefined
const avisoR = hR?.avisos.find(a => a.numero === sinParte?.numero), ordenR = hR?.ordenes.find(o => o.aviso === sinParte?.numero)
comprobar(!!sinParte && avisoR?.parte === 'sello' && /sello/i.test(ordenR?.descripcion ?? '') && numeros(hR) === numeros(hs),
  `una parte declarada después (${sinParte?.equipo}) llega al aviso ${sinParte?.numero} y a su orden, sin cambiar los números`)
const hpc = SAP.horasPorClase(hs.ordenes, new Date(L.calendario()[0].desde), R.AHORA)
const dentroH = hs.ordenes.filter(o => { const t = new Date(o.cierreTecnico ?? o.liberada ?? o.creada).getTime(); return t >= L.calendario()[0].desde && t < ahora })
comprobar(cerca(hpc.proactivo + hpc.correctivo, dentroH.reduce((a, o) => a + o.horasReales, 0)), 'horas proactivas + correctivas = todas las horas confirmadas del período')
const rj = SAP.relojes(hs.ordenes, ev => { for (const c of TODOS) for (const eq of new Set(hs.ordenes.filter(o => o.campoId === c).map(o => o.equipo))) { const f = L.historialDeEquipo(c, eq, ctx0).eventos.find(e => e.id === ev); if (f) return f.horas } })
comprobar(!!rj && rj.esperaH >= 0 && cerca(rj.totalH, rj.activaH + rj.esperaH), 'tres relojes: total = reparación activa + espera, y la espera nunca es negativa')

// Las paradas del libro y lo que el vigía emitió (el canal de mensajes al teléfono se retiró el 27-oct-2026: R1 a R8).
const V1 = [C.versionInicial()]
const preguntas = L.libro(TODOS, new Date(L.calendario()[0].desde), R.AHORA, ctx0).preguntas
const riesgoT = D.riesgoAhora(TODOS, ctx0)
const registroPr = AC.registroDePredicciones(TODOS, ctx0, riesgoT)
const pide = preguntas.find(p => p.pide && p.equipo === 'P-201B' && p.campoId === 'ceiba')
// Las sugerencias son las que se sabían al parar: no cambian si después alguien responde.
const ctxResp = { config: ctx0.config, respuestas: { [pide.id]: { texto: 'Sello', por: 'x', parte: 'sello', hora: R.AHORA.toISOString(), canal: 'pantalla' } } }
const sugAntes = CSU.causasSugeridas(pide, ctx0).opciones.map(o => `${o.texto}|${o.porque}`).join(';')
const sugDespues = CSU.causasSugeridas(pide, ctxResp).opciones.map(o => `${o.texto}|${o.porque}`).join(';')
comprobar(sugAntes === sugDespues && /fallas anteriores/.test(sugAntes), 'las causas sugeridas se cuentan con las fallas anteriores a la parada, y responder después no las cambia')
const esEspP = p => P.pozoDe(p.campoId, p.equipo)?.levantamiento === 'electrosumergible'
const pozoComun = preguntas.find(p => p.sobre === 'pozo' && !esEspP(p)), pozoEsp = preguntas.find(p => p.sobre === 'pozo' && esEspP(p))
comprobar(!!pozoComun && CSU.causasSugeridas(pozoComun, ctx0).opciones.every(o => !o.parte), `un pozo sin electrosumergible (${pozoComun?.equipo}) recibe el catálogo de pozo, sin partes ni orden`)
const sugEsp = pozoEsp ? CSU.causasSugeridas(pozoEsp, ctx0).opciones : []
comprobar(!!pozoEsp && sugEsp.some(o => o.parte) && sugEsp.every(o => !o.parte || CAT.catalogoDe(pozoEsp.campoId, pozoEsp.equipo).partes.some(x => x.id === o.parte)) && sugEsp.some(o => o.texto === CSU.NO_FUE_ESP),
  `un pozo con electrosumergible (${pozoEsp?.equipo}) recibe las partes de la electrosumergible y la salida «no fue ella»`)
const bombaNueva = { ...pide, inicio: new Date(L.calendario()[0].desde) }
const sugNueva = CSU.causasSugeridas(bombaNueva, ctx0)
comprobar(!sugNueva.conEvidencia && sugNueva.opciones.filter(o => o.clave !== '0').every(o => o.parte), 'una bomba sin historia antes de la parada ofrece sus partes, no las causas de un pozo')
const sugP = CSU.causasSugeridas(pide, ctx0).opciones
comprobar(sugP.some(o => o.texto === CSU.OTRA_PARTE) && sugP.filter(o => o.parte).length <= 3, 'con partes sugeridas, la pregunta ofrece además «otra parte del equipo» (todas las del catálogo a un toque)')
comprobar(CAT.nombreModo('BRD', 'aislamiento') === 'Se quemó o dio a tierra' && CAT.nombreModo('UST') === 'Se disparó sin daño a la vista', 'el modo de falla se dice en palabras de campo, y cambia con la parte (aislamiento: se quemó o dio a tierra)')
// Causas sugeridas: hasta tres más «otra»; una parada cerrada no usa las lecturas de hoy.
let malSug = 0
for (const p of preguntas) {
  const cs = CSU.causasSugeridas(p, ctx0)
  const conParte = cs.opciones.filter(o => o.parte)
  const cat = CAT.catalogoDe(p.campoId, p.equipo)
  // Con evidencia, hasta tres; sin ella, todas las partes del catálogo de su clase.
  if (cs.opciones.at(-1).clave !== '0' || (cs.conEvidencia ? conParte.length > 3 : conParte.length !== (cat?.partes.length ?? 0))) malSug++
  if (p.fin && conParte.some(o => /fuera de límite|salió de su banda|llegó a su alarma|venía avisando/.test(o.porque ?? ''))) malSug++
}
comprobar(malSug === 0, `causas sugeridas de ${preguntas.length} paradas: a lo sumo tres con su porqué, la última es «otra», y una parada cerrada no usa las lecturas de hoy`)

// Aciertos
const pr = { campoId: 'c', equipo: 'E', parte: 'sello', emitida: '2026-10-01T00:00:00-05:00', hasta: '2026-10-05T00:00:00-05:00' }
const t0 = new Date('2026-10-03T00:00:00-05:00'), tFin = new Date('2026-10-06T00:00:00-05:00')
comprobar(AC.calificar(pr, [{ campoId: 'c', equipo: 'E', parte: 'sello', inicio: t0 }], [], tFin) === 'acierto'
  && AC.calificar(pr, [{ campoId: 'c', equipo: 'E', parte: 'motor', inicio: t0 }], [], tFin) === 'falsa-alarma'
  && AC.calificar(pr, [], [{ campoId: 'c', equipo: 'E', fecha: t0 }], tFin) === 'intervenida'
  && AC.calificar(pr, [], [], new Date('2026-10-04T00:00:00-05:00')) === 'seguimiento'
  && AC.calificar(pr, [{ campoId: 'c', equipo: 'E', parte: 'sello', inicio: t0 }], [{ campoId: 'c', equipo: 'E', fecha: new Date('2026-10-02T00:00:00-05:00') }], tFin) === 'acierto',
  'calificación: acierto (aunque se haya intervenido), otra parte = falsa alarma, intervenida, en seguimiento')
const vig = AC.prediccionesVigentes(riesgoT)
comprobar(vig.length > 0 && vig.every(p => p.calificacion === 'seguimiento' && p.desde <= p.hasta && p.emitida <= R.AHORA.toISOString()), `${vig.length} predicciones vigentes, todas en seguimiento, emitidas antes de ahora y con su ventana en orden`)
const fv = AC.fallasVistas(TODOS, new Date(`${C.PUESTA_EN_MARCHA}T00:00:00-05:00`), ctx0, [C.versionInicial()])
// El registro de predicciones del demo, coherente con el PLC y con SAP.
const hist = AC.prediccionesHistoricas(TODOS, ctx0), inicioT = new Date(`${C.PUESTA_EN_MARCHA}T00:00:00-05:00`)
const fallaDe = id => fv.find(f => f.falla.id === id)
const malAcierto = hist.filter(p => p.calificacion === 'acierto').filter(p => {
  const f = p.falla && fallaDe(p.falla.id)
  return !f || f.equipo !== p.equipo || f.falla.parte !== p.parte || f.falla.inicio < new Date(p.emitida) || f.falla.inicio > new Date(p.hasta)
})
comprobar(hist.some(p => p.calificacion === 'acierto') && malAcierto.length === 0, `cada acierto del registro es una falla real del PLC, de esa parte y dentro de su ventana${malAcierto.length ? ': ' + malAcierto.map(p => p.id).join(', ') : ''}`)
comprobar(hist.filter(p => p.calificacion === 'falsa-alarma').every(p => new Date(p.hasta) < R.AHORA && !fv.some(f => f.equipo === p.equipo && f.campoId === p.campoId && f.falla.parte === p.parte && f.falla.inicio >= new Date(p.emitida) && f.falla.inicio <= new Date(p.hasta))),
  'una falsa alarma venció sin que esa parte fallara')
comprobar(hist.filter(p => p.calificacion === 'intervenida').length > 0 && hist.filter(p => p.calificacion === 'intervenida').every(p => hs.ordenes.some(o => o.clase === 'PM03' && o.estado === 'TECO' && o.equipo === p.equipo && o.cierreTecnico === p.intervencion)),
  'cada predicción intervenida tiene su orden predictiva cerrada en SAP')
comprobar(hist.every(p => new Date(p.emitida) >= inicioT && p.calificacion !== 'seguimiento'), 'nada del registro se emitió antes de la puesta en marcha, y lo vencido está calificado')
// Responder hoy una parada no crea una predicción en el pasado: el registro es lo que salió.
const idsAntes = hist.map(p => p.id).join(',')
const ctxHoy = { config: ctx0.config, respuestas: { [pide.id]: { texto: 'Sello', por: 'x', parte: 'sello', modo: 'ELP', hora: R.AHORA.toISOString(), canal: 'pantalla' } } }
comprobar(AC.prediccionesHistoricas(TODOS, ctxHoy).map(p => p.id).join(',') === idsAntes, 'responder hoy una parada no agrega al registro una predicción de días atrás')
const vigiladasF = fv.filter(f => f.visibilidad === 'vigilada'), anticipadas = vigiladasF.filter(f => hist.some(p => p.falla?.id === f.falla.id))
comprobar(anticipadas.length > 0 && anticipadas.length < vigiladasF.length && hist.some(p => p.calificacion === 'falsa-alarma'),
  `registro realista: anticipó ${anticipadas.length} de ${vigiladasF.length} fallas de partes con instrumento, y tuvo falsas alarmas`)
comprobar(fv.length > 0 && fv.every(f => !f.falla.disparo && f.falla.inicio >= new Date(`${C.PUESTA_EN_MARCHA}T00:00:00-05:00`)) && fv.every(f => f.visibilidad !== 'sin-parte' || !f.falla.parte),
  `${fv.length} fallas desde la puesta en marcha, sin disparos, cada una con si el vigía la podía ver`)

// Asignación oficial
let asigMal = 0, mesesVistos = 0
for (const c of TODOS) for (const m of L.calendario().filter(L.mesCerrado)) {
  const a = L.asignacionPorPozo(c, m.mes, ctx0)
  if (!a.length) continue
  mesesVistos++
  if (!cerca(a.reduce((x, f) => x + f.asignado, 0), L.libro([c], new Date(m.desde), new Date(m.hasta), ctx0).real, 1e-9)) asigMal++
  if (a.some(f => f.horas < -1e-9 || f.horas > (m.hasta - m.desde) / 3.6e6 + 1e-9)) asigMal++
}
comprobar(mesesVistos > 0 && asigMal === 0, `en ${mesesVistos} meses cerrados, la asignación de TRIM pozo por pozo suma lo real del punto de medición oficial y las horas están dentro del mes`)
comprobar(L.asignacionPorPozo('ceiba', L.calendario().at(-1).mes, ctx0).length === 0 && !L.mesCerrado(L.calendario().at(-1)), 'el mes en curso no se coteja: todavía no cerró')
const aCeiba = L.asignacionPorPozo('ceiba', '2026-09', ctx0)
const igual = AS.cotejar(aCeiba.map(f => ({ mes: '2026-09', campoId: 'ceiba', pozo: f.pozo, bbl: f.asignado, horas: f.horas })), aCeiba, 0.05)
comprobar(igual.filas.every(f => !f.fuera && f.motivo === 'Cuadra.') && cerca(igual.totalOficial, igual.totalTrim), 'una asignación oficial igual a la de TRIM cuadra pozo por pozo y en el total')
const mover = aCeiba[0], tasa = mover.asignado / mover.horas
const corrida = AS.cotejar(aCeiba.map((f, i) => ({ mes: '2026-09', campoId: 'ceiba', pozo: f.pozo, bbl: i === 0 ? f.asignado + tasa * 10 : f.asignado, horas: i === 0 ? f.horas + 10 : f.horas })), aCeiba, 0.05)
const fila0 = corrida.filas.find(f => f.pozo === mover.pozo)
comprobar(cerca(fila0.porHoras, fila0.diferencia, 1e-9) && !/El resto/.test(fila0.motivo), '10 h más en la oficial: la diferencia la explican las horas, completa')
const lr = AS.leerAsignacion('Mes;Campo;Pozo;Crudo;Horas\n2026-09;La Ceiba;lc-01;"12.345,5";700\n2026-10;ceiba;LC-02;100;\n2026-09;ceiba;LC-03;-4;\n2026-09;ceiba;LC-04;10;800', { permitidos: ['ceiba'], cerrados: ['2026-09'] })
comprobar(lr.filas.length === 1 && lr.filas[0].pozo === 'LC-01' && lr.filas[0].bbl === 12345.5 && lr.errores.length === 3, 'la carga lee «12.345,5», pasa el pozo a mayúsculas y rechaza el mes abierto, el volumen negativo y 800 horas')

console.log('\n=== 8b. Dominio: huella, firma, accesos, mensajes (auditoría) ===')
const { createHash } = await import('node:crypto')
const PUB = await v.ssrLoadModule('/src/widgets/diferidos/publicacion.ts')
const CAMP = await v.ssrLoadModule('/src/entities/campos.ts')
const ROL = await v.ssrLoadModule('/src/entities/roles.ts')
const FL = await v.ssrLoadModule('/src/entities/flota.ts')
const TIP = await v.ssrLoadModule('/src/entities/tipos.ts')

// La huella: forma canónica escrita (no JSON del lenguaje), reproducible por otra implementación.
const cif = { campos: ['zarza', 'ceiba'], desde: '2026-09-01T05:00:00Z', hasta: '2026-10-01T05:00:00Z', version: 3, real: 10900, potencial: 1.005,
  noProducido: -1.5, diferido: 0, tolerancia: 12.344, metaProduccion: 1e6, metaDiferido: 0.1, eventos: 7, equipo: 'P-201B', campoEquipo: 'ceiba', bblEquipo: 99.995 }
const canon = I.formaCanonica(cif)
const lineas = canon.split('\n')
comprobar(lineas[0] === 'campos=ceiba,zarza' && lineas.includes('real=10900.00') && lineas.includes('noProducido=-1.50') && lineas.includes('metaProduccion=1000000.00')
  && lineas.includes('version=3') && lineas.includes('desde=2026-09-01T05:00:00Z') && lineas.slice(-3).join('|') === 'equipo=P-201B|campoEquipo=ceiba|bblEquipo=100.00' && !canon.endsWith('\n'),
  'la forma canónica: una línea clave=valor en orden fijo, campos ordenados, dos decimales con punto, ISO en UTC al segundo y el equipo al final')
comprobar(await I.huellaDe(cif) === createHash('sha256').update(canon, 'utf8').digest('hex'), 'la huella es el SHA-256 de la forma canónica: otra implementación (Node) da la misma')
const consulta = { formato: 'pdf', titulo: 'x', alcance: 'x', periodo: 'x', campos: ['ceiba'], desde: sep.desde.toISOString(), hasta: sep.hasta.toISOString() }
const reg = await I.registrarCifras(consulta, ctx0, 1)
const libSep = L.libro(['ceiba'], sep.desde, sep.hasta, ctx0)
comprobar(I.formaCanonica(reg.cifras) === I.formaCanonica(I.cifrasDe(libSep, ['ceiba'], 1)) && reg.huella === createHash('sha256').update(I.formaCanonica(reg.cifras)).digest('hex') && reg.version === 1,
  'el registro calcula las cifras con el libro del servidor a partir de la CONSULTA (el front ya no manda la huella)')
const rechazos = await Promise.all([{ ...consulta, campos: ['rubiales'] }, { ...consulta, hasta: consulta.desde }, { ...consulta, equipo: { equipo: 'P-201B', campoId: 'morichal' } }]
  .map(q => I.registrarCifras(q, ctx0, 1).then(() => 'aceptó', e => e.message)))
comprobar(rechazos.every(r => r !== 'aceptó'), `el registro rechaza un campo que no existe, un período al revés y una ficha de otro campo (${rechazos.join(' / ')})`)
let estadosMal = 0
for (const per of ['cerrado', 'curso', 'trimestre', 'ytd', 'doce']) for (const cs of [TODOS, ...TODOS.map(c => [c])]) {
  const r = D.rangoDePeriodo(per), lb = L.libro(cs, r.desde, r.hasta, ctx0)
  if (I.estadoDelLibro(lb) !== PUB.publicacion(lb).estado) estadosMal++
}
comprobar(estadosMal === 0, 'el estado que registra el folio (publicable, provisional, bloqueado) es el mismo que muestra la pantalla, en todos los períodos y campos')

// La firma: todo lo técnico que cambia aparece, y lo que ya empezó no se mueve.
comprobar(C.validarConfig(ctx0.config, ctx0.config, '2026-10-01', ahoraMs).length === 0 && C.diferencias(ctx0.config, structuredClone(ctx0.config)).length === 0,
  'la configuración de arranque cumple todas las reglas de firma y no tiene diferencias consigo misma')
const empezada = ctx0.config.programa.find(p => p.id === 'PR-2011-260819')
const movida = structuredClone(ctx0.config); Object.assign(movida.programa.find(p => p.id === 'PR-2011-260819'), { desde: '2025-10-01T00:00:00-05:00', hasta: '2026-08-25T09:34:04-05:00' })
const gMov = C.diferenciasPorGrupo(ctx0.config, movida), eMov = C.validarConfig(movida, ctx0.config, '2026-10-01', ahoraMs)
comprobar(!!empezada && gMov.tecnica.some(x => x.includes('se cambió P-201B')) && eMov.some(x => x.includes('ya empezó')),
  'cambiarle las fechas a una parada que ya empezó aparece como cambio técnico y no se puede firmar')
const quitado = structuredClone(ctx0.config)
quitado.tanques = quitado.tanques.filter(t => t.id !== 'TK-AG-CE'); quitado.respaldos = quitado.respaldos.filter(r => r.campoId !== 'morichal'); delete quitado.campos.zarza
const gQ = C.diferenciasPorGrupo(ctx0.config, quitado)
comprobar(gQ.tecnica.some(x => x.includes('se quitó el tanque')) && gQ.tecnica.filter(x => x.includes('se quitó el respaldo')).length === 2 && gQ.tecnica.some(x => x.includes('La Zarza: se quitó el campo'))
  && C.validarConfig(quitado, ctx0.config, '2026-10-01', ahoraMs).some(x => x.includes('no se puede quitar el campo')),
  'quitar un tanque, un respaldo o un campo aparece como cambio técnico, y un campo con meses cerrados no se quita')
const otroCampo = structuredClone(ctx0.config); otroCampo.programa.push({ ...empezada, campoId: 'morichal' })
comprobar(C.validarConfig(otroCampo, ctx0.config, '2026-10-01', ahoraMs).some(x => x.includes('dos paradas con el código')),
  'una parada nueva con el código de otra (P-201B de otro campo) no pasa por «existente»: códigos repetidos no se firman')
const conTanque = structuredClone(ctx0.config); conTanque.tanques.push({ ...conTanque.tanques[0], id: 'TK-AG-CE2' })
comprobar(C.tanqueDe(ctx0.config, 'ceiba', 'P-201B')?.id === 'TK-AG-CE' && C.tanqueDe(ctx0.config, 'ceiba', 'MPP-301') === undefined
  && C.validarConfig(conTanque, ctx0.config, '2026-10-01', ahoraMs).some(x => x.includes('más de un tanque')),
  'el tanque es el de esa bomba en ese campo, y una bomba no puede tener dos tanques')
const precioMalo = (v) => C.validarConfig(C.conTramo(ctx0.config, 'ceiba', { desde: '2026-11-01', produccionBpd: 10900, diferidoMaxBpd: 800, netbackUsd: v, criterioSinCausa: 2 }), ctx0.config, '2026-10-01', ahoraMs)
const desdeMalo = C.validarConfig(C.conTramo(ctx0.config, 'ceiba', { desde: 'x2026', produccionBpd: 10900, diferidoMaxBpd: 800, netbackUsd: 48, criterioSinCausa: 2 }), ctx0.config, '2026-10-01', ahoraMs)
const paradaHoy = structuredClone(ctx0.config); paradaHoy.programa.push({ id: 'PR-ceiba-P-201B-hoy', campoId: 'ceiba', equipo: 'P-201B', desde: '2026-10-01T08:00:00-05:00', hasta: '2026-10-03T08:00:00-05:00', motivo: 'Preventivo de prueba' })
comprobar(precioMalo(48125).length > 0 && precioMalo(Infinity).length > 0 && precioMalo(48.125).length === 0 && desdeMalo.some(x => x.includes('no es un día'))
  && C.validarConfig(paradaHoy, ctx0.config, '2026-10-01', ahoraMs).some(x => x.includes('antes de que empiece')),
  'el precio tiene tope (48.125 o Infinity no pasan; 48,125 sí), el día del tramo tiene que ser un día, y una parada que empezó hoy temprano no se programa')
const conNull = structuredClone(ctx0.config); conNull.campos.zarza.metas[0].netbackUsd = null
const vNull = L.libro(TODOS, sep.desde, sep.hasta, { config: conNull, respuestas: {} }), vUnd = L.libro(TODOS, sep.desde, sep.hasta, ctx0)
comprobar(C.diferencias(ctx0.config, conNull).length === 0 && vNull.sinPrecio.includes('zarza') && vNull.valorCampos.con === vUnd.valorCampos.con && cerca(vNull.valorUsd, vUnd.valorUsd)
  && !('netbackUsd' in C.normalizarConfig(conNull).campos.zarza.metas[0]),
  'un precio que llega como null es «sin precio»: no es un cambio, no se valora en 0 USD y el borde lo vuelve ausente')
// Las fechas del historial firmado y el año se deciden en Colombia, no en la zona del navegador.
const tzAntes = process.env.TZ
process.env.TZ = 'Asia/Tokyo'
const textoTokio = C.diferencias(ctx0.config, C.conTramo(ctx0.config, 'ceiba', { desde: '2026-11-01', produccionBpd: 11000, diferidoMaxBpd: 800, netbackUsd: 48, criterioSinCausa: 2 }))[0]
process.env.TZ = 'Europe/Madrid'
const finDeAnio = R.fechaHora(new Date('2025-12-31T21:00:00-05:00'))
if (tzAntes === undefined) delete process.env.TZ; else process.env.TZ = tzAntes
comprobar(textoTokio.includes('1 de nov') && /2025/.test(finDeAnio), `con el navegador en Tokio el historial dice «${textoTokio.split(':')[0]}», y en Madrid el 31-dic-2025 de Bogotá lleva su año (${finDeAnio})`)

// Accesos: nadie otorga ni se cambia lo que no le toca.
const gerLim = us.map(u => (u.id === ger.id ? { ...u, campos: ['ceiba', 'palmar'] } : u)), yoLim = gerLim.find(u => u.id === ger.id)
const prodU = gerLim.find(u => u.rolId === 'prod')
comprobar(U.validarAcceso(gerLim, { ...yoLim, campos: 'todos' }, ger.id, 'prueba de alcance').some(x => x.includes('propios campos'))
  && U.validarAcceso(gerLim, { ...prodU, campos: 'todos' }, ger.id, 'prueba de alcance').some(x => x.includes('«todos los campos»'))
  && U.validarAcceso(gerLim, { ...prodU, campos: ['ceiba', 'palmar', 'morichal'] }, ger.id, 'prueba de alcance').some(x => x.includes('que usted no tiene'))
  && U.validarAcceso(gerLim, { ...prodU, campos: ['ceiba'] }, ger.id, 'prueba de alcance').length === 0,
  'un gerente de algunos campos no se cambia los suyos, no da «todos» ni campos que no tiene; sí quita de los que tiene')
comprobar(ROL.ROLES.every(r => Object.keys(r.puede).every(k => k in TIP.CAPACIDAD_NOMBRE)) && !ROL.ROLES.some(r => 'mes:cerrar' in r.puede || 'rol:suplantar' in r.puede),
  'las capacidades son las que algún endpoint revisa (sin «cerrar el mes» ni «suplantar», que nada controlaba)')

// Aciertos: la historia se juzga con el perfil que regía, no con el de hoy.
const sinEspHoy = structuredClone(ctx0.config); sinEspHoy.campos.morichal.perfil.electrosumergibles = false
const vers2 = [C.versionInicial(), { fecha: R.AHORA.toISOString(), config: sinEspHoy }]
const cuenta = fs => fs.reduce((a, f) => ({ ...a, [f.visibilidad]: (a[f.visibilidad] ?? 0) + 1 }), {})
const inicioPM = new Date(`${C.PUESTA_EN_MARCHA}T00:00:00-05:00`)
comprobar(JSON.stringify(cuenta(AC.fallasVistas(['morichal'], inicioPM, ctx0, vers2))) === JSON.stringify(cuenta(AC.fallasVistas(['morichal'], inicioPM, ctx0, [C.versionInicial()])))
  && AC.fallasVistas(['morichal'], inicioPM, ctx0, [{ fecha: '2025-01-01T00:00:00-05:00', config: sinEspHoy }]).some(f => f.visibilidad === 'fuera-de-perfil'),
  'firmar hoy «sin electrosumergibles» en Morichal no vuelve «fuera de perfil» sus fallas pasadas; con ese perfil vigente entonces, sí')

// SAP: el repuesto es el de la familia del equipo; lo que no se cruza con el PLC se cuenta.
const espMat = hs.ordenes.filter(o => FL.flotaDe(o.campoId).find(f => f.equipo === o.equipo)?.familia !== 'electrosumergible' && o.repuestos.some(r => r.material.endsWith('-ESP')))
comprobar(espMat.length === 0 && hs.ordenes.some(o => o.equipo === 'P-201B' && /motor/i.test(o.descripcion)), 'ninguna bomba de superficie pide un repuesto de electrosumergible (el motor de P-201B no es un motor de fondo)')
const rjX = SAP.relojes(hs.ordenes, ev => (ev === correctivas[0].evento ? undefined : 5))
comprobar(rjX.excluidas === 1 && rjX.fallas === correctivas.filter(o => o.estado === 'TECO').length - 1, 'los tres relojes cuentan las órdenes cuya parada del PLC no se encontró, en vez de descartarlas en silencio')

// Cargas: lo ambiguo no se adivina, el precio no lleva miles y las horas son las del mes.
const coma1 = PL.leerPlan('2026-11,La Ceiba,11,200,700', opc), coma2 = PL.leerPlan('2026-11,La Ceiba,11200,750,48', opc)
const precio3 = PL.leerPlan('2026-11;La Ceiba;11200;700;48,125', opc), precioTope = PL.leerPlan('2026-11;La Ceiba;11200;700;48125', opc)
comprobar(coma1.filas.length === 0 && coma1.errores.some(x => x.includes('puede ser un número con miles')) && coma2.errores.length === 0 && coma2.filas[0].produccionBpd === 11200
  && precio3.filas[0]?.netbackUsd === 48.125 && precioTope.errores.some(x => x.includes('precio neto va entre')),
  'con coma de separador, «11,200» sin comillas se rechaza (11200,750 sí pasa); «48,125» de precio es 48,125 USD/bbl y 48.125 no pasa')
const asigS = o => AS.leerAsignacion(o, { permitidos: ['ceiba'], cerrados: ['2026-09'] })
comprobar(asigS('2026-09,La Ceiba,LC-14,12,450').errores.length === 1 && asigS('2026-09;ceiba;LC-14;100;740').errores.some(x => x.includes('0 a 720'))
  && asigS('2026-09;ceiba;LC-14;100;720').errores.length === 0, 'la asignación rechaza «12,450» ambiguo y 740 h en septiembre (tiene 720)')
const cero = AS.cotejar([{ mes: '2026-09', campoId: 'ceiba', pozo: 'LC-99', bbl: 5000, horas: 300 }], [{ pozo: 'LC-99', horas: 0, asignado: 0 }], 0.01).filas[0]
comprobar(!/Mismas horas/.test(cero.motivo) && /no produjo/.test(cero.motivo), `TRIM con 0 h y la oficial con 300 h no es «mismas horas»: ${cero.motivo}`)

// Un campo que el registro no conoce se muestra como hueco, no como La Ceiba.
const raro = CAMP.campoPorId('rubiales')
comprobar(raro.desconocido && raro.nombre.includes('rubiales') && raro.nombre !== CAMP.CAMPOS[0].nombre, `un id de campo desconocido se rotula «${raro.nombre}», no «La Ceiba»`)

// R8 (#108): un período desconocido no se vuelve «mes en curso»: la dirección lo descarta y periodoPorId lo dice.
let periodoRaro = ''
try { CAMP.periodoPorId('semestre') } catch (e) { periodoRaro = e.message }
comprobar(/no es un período/.test(periodoRaro) && CAMP.esIdPeriodo('cerrado') && !CAMP.esIdPeriodo('semestre') && CAMP.periodoPorId('cerrado').id === 'cerrado',
  `un id de período que no es de la cabecera no se disfraza de «mes en curso» (${periodoRaro || 'devolvió otro período'})`)
let rangoRaro = ''
try { D.rangoDePeriodo('medida') } catch (e) { rangoRaro = e.message }
comprobar(/sin su rango/.test(rangoRaro), 'un «rango escogido» sin sus días no se calcula como el mes en curso: se dice')

// R11 (#41): la regla de la coma no rechaza filas legítimas. Una fila que escribe sus
// cifras sin separador de miles («9000») no está partiendo un número: «500,100» son dos columnas.
const legit = PL.leerPlan('2026-11,La Ceiba,9000,500,100', opc), ambig = PL.leerPlan('2026-11,La Ceiba,11,200,700', opc)
const ambig2 = PL.leerPlan('2026-11,La Ceiba,11,200', opc), conComillas = PL.leerPlan('2026-11,La Ceiba,"11,200",700', opc)
comprobar(legit.errores.length === 0 && legit.filas[0]?.produccionBpd === 9000 && legit.filas[0]?.diferidoMaxBpd === 500 && legit.filas[0]?.netbackUsd === 100
  && ambig.errores.some(x => x.includes('puede ser un número con miles')) && ambig2.errores.some(x => x.includes('puede ser un número con miles'))
  && conComillas.errores.length === 0 && conComillas.filas[0]?.produccionBpd === 11200,
  `«2026-11,La Ceiba,9000,500,100» se lee (9000 · 500 · 100 USD/bbl); «11,200,700» y «11,200» siguen siendo ambiguos; «"11,200"» entre comillas es 11.200`)
comprobar(asigS('2026-09,La Ceiba,LC-11,29650,672').errores.length === 0 && asigS('2026-09,La Ceiba,LC-11,29650,672').filas[0]?.horas === 672
  && PL.comaAmbigua('2026-09,LC-100,5,200', ',', 1) === '5,200' && PL.comaAmbigua('46327,La Ceiba,11,200', ',', 2) === '11,200',
  'en la asignación, 29650 sin agrupar deja leer «29650,672» como bbl y horas; el mes (aunque sea el número de serie de Excel) y el pozo no cuentan como cifras')

// R9 (#195): un nombre por concepto. Ningún tipo exportado del motor se llama igual en dos módulos.
{
  const { readdirSync } = await import('node:fs')
  const dir = new URL('../src/entities/', import.meta.url), nombres = new Map()
  for (const f of readdirSync(dir).filter(x => x.endsWith('.ts'))) {
    const txt = (await import('node:fs')).readFileSync(new URL(f, dir), 'utf8')
    for (const m of txt.matchAll(/^export (?:interface|type) (\w+)/gm)) nombres.set(m[1], [...(nombres.get(m[1]) ?? []), f])
  }
  const dobles = [...nombres].filter(([, fs]) => fs.length > 1).map(([n, fs]) => `${n} (${fs.join(', ')})`)
  comprobar(dobles.length === 0, `ningún tipo exportado de src/entities tiene el mismo nombre en dos módulos${dobles.length ? `: ${dobles.join('; ')}` : ' (la topología de planta es PlantaCampo; ConfigCampo es solo la configuración firmada)'}`)
}
// El catálogo de daños sale de la clase ISO 14224 del registro (`claseDeCatalogo`), la misma tabla del contrato.
{
  const REG = JSON.parse((await import('node:fs')).readFileSync(new URL('../simulador-api/datos/registro-ingenieria.json', import.meta.url), 'utf8'))
  const bombasReg = REG.equipos.filter(e => BO.perfilBomba(e.id, e.campoId))
  const malas = bombasReg.filter(e => { const pb = BO.perfilBomba(e.id, e.campoId); return BO.CLASE_ISO[pb.tecnologia] !== e.clase || CAT.claseDeCatalogo(e.clase, pb.papel) !== CAT.catalogoDe(e.campoId, e.id)?.clase })
  comprobar(bombasReg.length > 0 && malas.length === 0 && CAT.catalogoDe('morichal', 'MPP-301')?.clase === 'bomba-multifasica' && CAT.claseDeCatalogo('bomba-reciprocante') === undefined
    && CAT.claseDeCatalogo('bomba-centrifuga', 'transporte') === 'bomba-multifasica' && CAT.claseDeCatalogo('bomba-centrifuga', 'recobro') === 'bomba-inyeccion',
    `el catálogo de cada bomba del registro (${bombasReg.map(e => `${e.campoId}/${e.id}: ${e.clase}`).join(', ')}) es el que da claseDeCatalogo con su clase ISO y su papel${malas.length ? `; no cuadran: ${malas.map(e => e.id).join(', ')}` : ''}`)
}

console.log('\n=== 9. Reglas de causa y del motor (auditoría) ===')
const CS = await v.ssrLoadModule('/src/entities/causa-senal.ts')
const EVV = await v.ssrLoadModule('/src/entities/equipo-vivo.ts')
const VG = await v.ssrLoadModule('/src/entities/vigia.ts')
const ISO = await v.ssrLoadModule('/src/entities/iso14224.ts')
const ESP = await v.ssrLoadModule('/src/entities/esp.ts')
const CA = await v.ssrLoadModule('/src/entities/campos.ts')
const bombaId = id => B.eventosBomba().find(e => e.id === id)

// Un servicio explica su cascada, no todo lo que pase mientras está caído; la
// bomba que paró antes manda; la primera alarma propia y la firma mandan.
// La Ceiba 25-mar: K-101 cae 49 min después de parar la P-201B. Su cascada (los pozos que
// cerraron uno tras otro al caer el aire) es de K-101; los que la bomba cerró horas después,
// con el aire todavía caído pero fuera de esa cascada, son de la bomba.
const p0325 = D.paradaMedida(bombaId('EV-2011-260325'), ctx0, V0)
const deK101 = new Set(L.tramosDeEvento('ceiba', 'SV-K-101-260325', ctx0).map(t => t.pozo.id))
const deBomba0325 = new Set(p0325.tramos.map(t => t.pozo.id))
comprobar(p0325.causa.parte === 'sello' && p0325.pozos > 0 && p0325.bbl > 0 && Math.abs(p0325.colchon.previsto.horas - p0325.colchon.observadoH) < 0.1
  && deK101.size > 0 && [...deBomba0325].every(id => !deK101.has(id)) && deK101.size + deBomba0325.size <= P.pozosDe('ceiba').length,
  `La Ceiba 25-mar: la P-201B paró 49 min antes que K-101; los ${deK101.size} pozos de la cascada del aire son de K-101 y los ${p0325.pozos} que cerró la bomba (${f(p0325.bbl)} bbl), de la bomba, a las ${p0325.colchon.observadoH.toFixed(2)} h del colchón previsto de ${p0325.colchon.previsto.horas.toFixed(2)} h`)
comprobar(CS.causaDeParada(bombaId('EV-G2011-260309'), ctx0).parte === 'rodamientos',
  'Guacamayo 9-mar: la P-201B con TSH-2011, 22 h después de restringirse el oleoducto, es falla de rodamientos, no evacuación')
const hMpp = L.historialDeEquipo('morichal', 'MPP-301', ctx0)
comprobar(['EV-3016-260310', 'EV-3016-260725'].every(id => { const c = CS.causaDeParada(bombaId(id), ctx0); return c.tipo === 'transporte' && c.parte === 'tornillos' && c.como === 'firma' })
  && hMpp.porParte.find(x => x.parte === 'tornillos')?.fallas === 2,
  `MPP-301: perder caudal sin disparar es desgaste de tornillos aunque un servicio lleve horas caído (historial: ${hMpp.porParte.map(x => `${x.parte} ${x.fallas}`).join(', ')})`)
const cascada = P.eventosServicios().flatMap(sv => P.eventosPozos().filter(e => e.campoId === sv.campoId && Date.parse(e.inicio) >= Date.parse(sv.inicio) - 15 * 60e3 && Date.parse(e.inicio) <= Date.parse(sv.inicio) + 30 * 60e3)
  .filter(e => !B.eventosBomba().some(b => b.campoId === e.campoId && Date.parse(b.inicio) < Date.parse(sv.inicio) - 15 * 60e3 && Date.parse(e.inicio) <= (b.fin ? Date.parse(b.fin) : ahoraMs) && Date.parse(e.inicio) >= Date.parse(b.inicio)))
  .map(e => [sv, e]))
comprobar(cascada.length > 100 && cascada.every(([sv, e]) => CS.causaDeEvento(e, ctx0).evento === sv.id),
  `los ${cascada.length} cierres en cascada de la primera media hora de cada servicio siguen cargados a su servicio`)
// Un pozo del clúster que se cierra mientras la P-201B y la MPP-301 están paradas: manda la
// multifásica que lo mueve (sin ella no fluye, haya o no tanque).
const parada = (eq, t) => B.eventosBomba().some(b => b.campoId === 'morichal' && b.equipo === eq && Date.parse(b.inicio) <= t && t <= (b.fin ? Date.parse(b.fin) : ahoraMs))
const conLasDos = P.eventosPozos().filter(e => e.campoId === 'morichal' && B.perfilBomba('MPP-301', 'morichal').pozos.includes(e.pozo)
  && parada('MPP-301', Date.parse(e.inicio)) && parada('P-201B', Date.parse(e.inicio)))
comprobar(conLasDos.length > 0 && conLasDos.every(e => CS.causaDeEvento(e, ctx0).equipo === 'MPP-301'),
  `${conLasDos.map(e => `${e.pozo} el ${e.inicio.slice(0, 10)} (${e.codigo})`).join(', ')}: con la P-201B y la MPP-301 paradas, manda la multifásica que lo mueve`)
const disparoPropio = B.eventosBomba().filter(e => e.primeraAlarma && !['52-SE2', 'PAL-1011'].includes(e.primeraAlarma.tag))
comprobar(disparoPropio.every(e => Object.hasOwn(B.maquina(e.equipo).primerasAlarmas, e.primeraAlarma.tag) && CS.causaDeParada(e, ctx0).como !== 'ninguno'),
  `las ${disparoPropio.length} primeras alarmas propias son disparos de SU máquina (la MPP-301 avisa el sello por LSL-3017, no por el LSH-2013 de la centrífuga)`)

// El panel del equipo usa el contexto de la sesión, como el libro.
const ctxLC21 = { config: ctx0.config, respuestas: { 'EP-LC21-261001-01': { texto: 'Válvula de cabeza cerrada para cambiarla', por: 'prueba', hora: R.AHORA.toISOString() } } }
comprobar(/identificarlo/.test(EVV.equipoVivo('LC-21', 'ceiba', ctx0).lectura) && /Válvula de cabeza/.test(EVV.equipoVivo('LC-21', 'ceiba', ctxLC21).lectura),
  'responder LC-21 cambia también el panel del pozo: deja de pedir que se identifique')

// El respaldo sale de la configuración firmada, en la ficha igual que en la predicción.
// Firmar otro respaldo (P-201C sale a mantenimiento: solo queda P-201A con 8.000 libres) o
// quitarlo (0: «sin respaldo», todo el campo) cambia la ficha y la predicción a la vez.
const conRespaldoDe = (libreBpd, detalle) => { const c = structuredClone(ctx0.config); Object.assign(c.respaldos.find(r => r.campoId === 'ceiba' && r.equipo === 'P-201B'), { libreBpd, detalle }); return { config: c, respuestas: {} } }
const ctxResp8 = conRespaldoDe(8000, 'Solo P-201A en paralelo, con 8.000 bbl/d libres (P-201C en mantenimiento)'), ctxResp0 = conRespaldoDe(0, 'Sin bomba en paralelo')
const fichaAntes = EVV.equipoVivo('P-201B', 'ceiba', ctx0), fichaDespues = EVV.equipoVivo('P-201B', 'ceiba', ctxResp8), fichaSin = EVV.equipoVivo('P-201B', 'ceiba', ctxResp0)
comprobar(fichaAntes.redundancia.startsWith('P-201A y P-201C en paralelo') && fichaAntes.aguasAbajo === 'la parte del campo que el respaldo no cubre'
  && fichaDespues.redundancia.startsWith('Solo P-201A') && fichaDespues.aguasAbajo === 'la parte del campo que el respaldo no cubre'
  && fichaSin.redundancia === 'sin respaldo' && fichaSin.aguasAbajo === 'todo el campo'
  && D.prediccion(B.perfilBomba('P-201B', 'ceiba'), ctxResp8).respaldoLibreBpd === 8000 && D.prediccion(B.perfilBomba('P-201B', 'ceiba'), ctxResp0).respaldoLibreBpd === 0
  && B.perfilBomba('P-201B', 'ceiba').respaldo === undefined,
  'firmar otro respaldo para La Ceiba (o quitarlo) cambia la ficha y la predicción a la vez; el perfil de la bomba ya no trae respaldo propio')

// Un id que llega de un enlace no puede devolver el prototipo.
comprobar(['constructor', '__proto__', 'toString', 'hasOwnProperty'].every(id => ['ceiba', 'morichal'].every(c => EVV.equipoVivo(id, c, ctx0) === undefined && B.perfilBomba(id, c) === undefined) && !B.esBomba(id)),
  'equipos «constructor», «__proto__», «toString» o «hasOwnProperty» no existen (no tumban la pantalla)')

// Electrosumergible parada: lo que no se lee es hueco (valor null, como manda el contrato), no cero «normal».
const espParadas = P.todosLosPozos().filter(p => p.levantamiento === 'electrosumergible' && !P.estadoAhora(p).produce)
const malEsp = espParadas.flatMap(p => ESP.senalesEsp(p)).filter(s => ['pip', 't_motor', 'desbalance'].includes(s.plantilla.id) ? s.valor !== null || s.estado !== 'sin señal' : s.valor !== 0)
// Con TRIM las electrosumergibles vuelven en días (taladro programado): hoy quedan pocas paradas.
const unaParada = espParadas[0], gu07 = unaParada ? EVV.equipoVivo(unaParada.id, unaParada.campoId, ctx0).dispositivos : []
comprobar(espParadas.length >= 3 && malEsp.length === 0 && gu07.find(d => d.tipo === 'Presión de entrada')?.valor === null && !gu07.some(d => d.valor === 0 && /psi|°C|%/.test(d.unidad)),
  `${espParadas.length} electrosumergibles paradas: presión de entrada, temperatura del motor y desbalance van como hueco; corriente y frecuencia, en cero medido`)

// Fuera de banda y llega a su alarma en N h: se dice así, con la prioridad de la salud.
const rMor = D.riesgoAhora(['morichal', 'guacamayo'], ctx0).filter(r => r.estado === 'en-riesgo')
const rP201 = rMor.find(r => r.equipo === 'P-201B'), rGu04 = rMor.find(r => r.equipo === 'GU-04')
comprobar(rP201?.prioridad === 2 && rP201.estadoParte === 'fuera' && /salió de su banda normal; llega a su alarma en 43 h/.test(rP201.motivo) && !rMor.some(r => /fuera de límite/.test(r.motivo))
  && rGu04?.estadoParte === 'fuera',
  `PI-2010 de Morichal: «${rP201?.motivo}» (prioridad ${rP201?.prioridad}); el desbalance de GU-04 fuera de banda también es «fuera»`)
comprobar(P.todosLosPozos().flatMap(p => ESP.senalesEsp(p)).every(s => s.estado !== 'aviso'), 'fuera de banda sin llegar a la alarma es «atención» en electrosumergibles y bombas por igual')

// Lo que ve operación de las señales de un pozo (DetallePozo): sin señal con el pozo parado
// es lo esperado y no sale; bajo «fuera de banda» solo va lo que el instrumento reporta fuera.
const EPZ = await v.ssrLoadModule('/src/widgets/pozos/estado.ts')
const espTodas = P.todosLosPozos().filter(p => p.levantamiento === 'electrosumergible')
const vistasOp = espTodas.map(p => ({ p, produce: P.estadoAhora(p).produce, o: EPZ.senalesParaOperar(ESP.senalesEsp(p), P.estadoAhora(p).produce) }))
// Una de La Ceiba parada (la cerró P-201B o su propia falla).
const lc01op = vistasOp.find(x => x.p.campoId === 'ceiba' && !x.produce)
const gu04op = vistasOp.find(x => x.p.campoId === 'guacamayo' && x.p.id === 'GU-04')
comprobar(!!lc01op && !lc01op.produce && lc01op.o.fuera.length === 0 && lc01op.o.sinSenal.length === 0
  && vistasOp.filter(x => !x.produce).every(x => x.o.sinSenal.length === 0 && x.o.fuera.every(s => s.estado !== 'sin señal'))
  && vistasOp.every(x => x.o.fuera.every(s => ['aviso', 'atencion', 'alarma'].includes(s.estado)))
  && !!gu04op?.produce && !!gu04op.o.fuera.some(s => s.plantilla.id === 'desbalance'),
  `operación: las ${vistasOp.filter(x => !x.produce).length} electrosumergibles paradas no muestran «fuera de banda» por estar sin señal (${lc01op?.p.id} de La Ceiba, nada); el desbalance de GU-04, que produce fuera de banda, sí sale`)

// Paretos: una fila por equipo y tipo; una por familia y parte; horas del equipo, no de cada pozo.
const tri = D.rangoDePeriodo('trimestre')
const lTri = L.libro(TODOS, tri.desde, tri.hasta, ctx0), lSep = L.libro(TODOS, sep.desde, sep.hasta, ctx0)
const clavesEq = lTri.porEquipo.map(x => `${x.campoId}:${x.equipo}:${x.tipo}`)
const mppProg = lTri.porEquipo.find(x => x.equipo === 'MPP-301' && x.tipo === 'programada'), mppTr = lTri.porEquipo.find(x => x.equipo === 'MPP-301' && x.tipo === 'transporte')
comprobar(new Set(clavesEq).size === clavesEq.length && lTri.porEquipo.every(x => lTri.tramos.filter(t => t.bbl > 0 && t.pozo.campoId === x.campoId && t.causa.equipo === x.equipo).every(t => t.causa.tipo === x.tipo || clavesEq.includes(`${x.campoId}:${x.equipo}:${t.causa.tipo}`)))
  && !!mppProg && !!mppTr,
  `por equipo, una fila por tipo de causa: la MPP-301 en julio-septiembre son ${f(mppTr?.bbl ?? 0)} bbl de transporte y ${f(mppProg?.bbl ?? 0)} de programada, por separado`)
// En el trimestre (julio-septiembre), donde paró el sello de las dos familias.
const clavesPt = lTri.porParte.map(x => `${x.familia}|${x.parte}`)
const selloIny = lTri.porParte.find(x => x.familia === 'inyeccion' && x.parte === 'sello'), selloMpp = lTri.porParte.find(x => x.familia === 'multifasica' && x.parte === 'sello')
// Cada fila cuadra con sus tramos: los barriles de la fila son los de los tramos de esa familia y parte.
const famDe = { reinyeccion: 'inyeccion', transporte: 'multifasica', electrosumergible: 'electrosumergible' }
const horasDePozos = x => lTri.tramos.filter(t => t.causa.parte === x.parte && famDe[t.causa.tipo] === x.familia).reduce((a, t) => a + t.horas, 0)
comprobar(new Set(clavesPt).size === clavesPt.length && lTri.porParte.every(x => cerca(x.bbl, lTri.tramos.filter(t => t.causa.parte === x.parte && famDe[t.causa.tipo] === x.familia).reduce((a, t) => a + t.bbl, 0), 1e-9))
  && selloIny && selloMpp && selloIny.horas < horasDePozos(selloIny) && selloMpp.horas < horasDePozos(selloMpp),
  `por parte, una fila por familia: en julio-septiembre el sello de reinyección estuvo fuera ${selloIny?.horas.toFixed(1)} h y el de la multifásica ${selloMpp?.horas.toFixed(1)} h (no la suma de cada pozo: ${selloIny ? horasDePozos(selloIny).toFixed(0) : '—'} y ${selloMpp ? horasDePozos(selloMpp).toFixed(0) : '—'} h)`)
// Las horas y las fallas salen de los EVENTOS del equipo: una parada que el tanque absorbió
// (0 bbl, ningún pozo cerrado) también es una falla con sus horas fuera. Antes la fila
// solo veía tramos con barriles y en marzo quedaba en 2 fallas y 74,3 h. Cambio a propósito:
// ahora una fila puede ir en 0 bbl (P-201B de Guacamayo, recobro, en marzo).
const mar = { desde: new Date('2026-03-01T00:00:00-05:00'), hasta: new Date('2026-04-01T00:00:00-05:00') }
const lMar = L.libro(TODOS, mar.desde, mar.hasta, ctx0)
// La parada que el tanque absorbió (sin cerrar pozos) y su mes: su fila de parte la cuenta
// como falla, con sus horas, junto a las demás fallas de esa parte en el mes.
const absorbida = B.eventosBomba().map(e => D.paradaMedida(e, ctx0, V0)).find(m => m?.colchon && m.bbl === 0 && m.causa.equipo === m.evento.equipo && m.causa.parte)?.evento
const parteAbs = absorbida && CS.causaDeParada(absorbida, ctx0).parte
const mesAbs = absorbida && (() => { const d = new Date(Date.parse(absorbida.inicio) - 5 * 3_600_000); return { desde: Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 5), hasta: Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 5) } })()
const lAbs = absorbida && L.libro(TODOS, new Date(mesAbs.desde), new Date(mesAbs.hasta), ctx0)
const filaAbs = lAbs?.porParte.find(x => x.familia === 'inyeccion' && x.parte === parteAbs)
const mismaParte = absorbida ? B.eventosBomba().filter(e => Date.parse(e.inicio) < mesAbs.hasta && (e.fin ? Date.parse(e.fin) : ahoraMs) > mesAbs.desde && B.perfilBomba(e.equipo, e.campoId)
  && famDe[CS.causaDeParada(e, ctx0).tipo] === 'inyeccion' && CS.causaDeParada(e, ctx0).parte === parteAbs) : []
const horasMismaParte = mismaParte.reduce((a, e) => a + (Math.min(e.fin ? Date.parse(e.fin) : ahoraMs, mesAbs.hasta) - Math.max(Date.parse(e.inicio), mesAbs.desde)) / 3_600_000, 0)
const horasAbs = absorbida ? (Date.parse(absorbida.fin) - Date.parse(absorbida.inicio)) / 3_600_000 : 0
const tramosAbs = absorbida ? L.tramosEntre([absorbida.campoId], new Date(mesAbs.desde), new Date(mesAbs.hasta), ctx0).filter(t => t.causa.evento === absorbida.id) : []
const recobroMar = lMar.porParte.find(x => x.equipos.some(e => e.campoId === 'guacamayo' && e.equipo === 'P-201B'))
comprobar(!!absorbida && tramosAbs.every(t => t.bbl === 0) && mismaParte.some(e => e.id === absorbida.id) && filaAbs?.fallas === mismaParte.length
  && cerca(filaAbs.horas, horasMismaParte, 1e-6) && filaAbs.equipos.some(e => e.campoId === absorbida.campoId && e.equipo === absorbida.equipo)
  && !!recobroMar && recobroMar.bbl === 0 && recobroMar.fallas >= 1 && recobroMar.horas > 0,
  `por parte, de los eventos del equipo: ${absorbida?.id} (${absorbida?.equipo} de ${absorbida?.campoId}, ${parteAbs}, ${horasAbs.toFixed(1)} h, 0 bbl: el tanque la absorbió) entra a «${parteAbs}» de su mes: ${filaAbs?.fallas} fallas y ${filaAbs?.horas.toFixed(1)} h; la parada de recobro de Guacamayo va con 0 bbl y ${recobroMar?.horas.toFixed(1)} h en marzo`)

// Una sola regla de proyección: lo súbito no da fecha.
const plantillas = [...B.PLANTILLA_INYECCION, ...B.PLANTILLA_MULTIFASICA, ...ESP.PLANTILLA_ESP].filter(x => x.anuncia)
comprobar(!VG.proyectable({ mecanismo: ISO.mecanismo('4.1') }) && plantillas.every(x => VG.proyectable({ mecanismo: ISO.mecanismo(x.anuncia.mecanismo) })),
  'el vigía y la salud proyectan con la misma regla: un mecanismo súbito (cortocircuito) no da fecha, y todo lo que anuncia una plantilla es degradación')

// El vigía lee el paso de la serie (CONTRATO.md · «Forma de las series»), no supone un
// punto por día: la misma rampa por hora cruza en horas; un hueco no comprime el eje.
const rampa = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]
const tHora = VG.tendencia({ desde: '2026-10-02T03:00:00-05:00', pasoH: 1, valores: rampa })
const tDia = VG.tendencia({ desde: '2026-09-21T14:00:00-05:00', pasoH: 24, valores: rampa })
const tHueco = VG.tendencia({ desde: '2026-10-02T03:00:00-05:00', pasoH: 1, valores: rampa.map((x, i) => (i === 3 || i === 4 ? null : x)) })
const pHora = VG.pronostico(tHora, 25, 'sube'), pDia = VG.pronostico(tDia, 25, 'sube'), pHueco = VG.pronostico(tHueco, 25, 'sube')
let pasoMalo = ''
try { VG.tendencia({ desde: '2026-10-02T03:00:00-05:00', pasoH: 0, valores: rampa }) } catch (e) { pasoMalo = e.message }
comprobar(pHora.tipo === 'cruza' && cerca(pHora.horas, 4) && pDia.tipo === 'cruza' && cerca(pDia.horas, 96)
  && tHueco.n === 10 && cerca(tHueco.pendiente, 1) && pHueco.tipo === 'cruza' && cerca(pHueco.horas, 4) && /pasoH/.test(pasoMalo),
  `el vigía usa el paso de la serie: la misma rampa cruza en ${pHora.horas} h por hora y en ${pDia.horas} h por día; con dos huecos ajusta 10 puntos sin mover el eje; con paso 0 se niega («${pasoMalo.slice(0, 50)}…»)`)

// El calendario sale de «ahora».
const calNov = R.calendarioDe(new Date('2026-11-15T10:00:00-05:00')), calEne = R.calendarioDe(new Date('2027-01-10T10:00:00-05:00'))
const isoDia = d => d.toISOString().slice(0, 10)
comprobar(isoDia(calNov.curso.desde) === '2026-11-01' && calNov.cerrado.nombre === 'Octubre, cerrado' && isoDia(calNov.trimestre.desde) === '2026-08-01' && isoDia(calNov.doce.desde) === '2025-11-01'
  && calEne.cerrado.nombre === 'Diciembre, cerrado' && isoDia(calEne.cerrado.desde) === '2026-12-01' && isoDia(calEne.ytd.desde) === '2027-01-01' && calEne.trimestre.nombre === 'Octubre a diciembre'
  && CA.PERIODOS[0].detalle === '2 de 31 días de octubre' && CA.PERIODOS[1].nombre === 'Septiembre · cerrado',
  'los períodos se mueven con «ahora»: el 15-nov el cerrado es octubre; el 10-ene, diciembre del año anterior')

// La historia se calcula una vez y los promedios usan fallas cerradas.
const hCe = L.historialDeEquipo('ceiba', 'P-201B', ctx0)
const cerradasCe = hCe.eventos.filter(e => !e.disparo && e.fin)
comprobar(L.historialDeEquipo('ceiba', 'P-201B', ctx0) === hCe && cerradasCe.length === hCe.fallas - 1
  && cerca(hCe.mdtH, cerradasCe.reduce((a, e) => a + e.horas, 0) / cerradasCe.length) && cerca(hCe.bblPorFalla, cerradasCe.reduce((a, e) => a + e.bbl, 0) / cerradasCe.length)
  && D.veredicto(B.perfilBomba('P-201B', 'ceiba'), ctx0).porFalla === hCe.bblPorFalla,
  `P-201B de La Ceiba: ${hCe.fallas} fallas, el promedio de horas fuera (${hCe.mdtH.toFixed(1)} h) y de barriles (${f(hCe.bblPorFalla)}) sale de las ${cerradasCe.length} cerradas`)
const tsEv = L.tramosDeEvento('ceiba', 'EV-2011-0909', ctx0), tsFresco = L.tramosEntre(['ceiba'], new Date(L.calendario()[0].desde), R.AHORA, { config: ctx0.config, respuestas: {} }).filter(t => (t.causa.evento ?? t.evento.id) === 'EV-2011-0909')
comprobar(tsEv.length === tsFresco.length && cerca(tsEv.reduce((a, t) => a + t.bbl, 0), tsFresco.reduce((a, t) => a + t.bbl, 0)), 'los tramos de una parada salen de la historia ya calculada y son los mismos')

console.log('\n=== 10. Datos que faltan, se pisan o no cuadran (mundo de prueba) ===')
// Un servidor aparte: aquí se tocan los datos del demo para probar lo que
// el demo no trae (huecos fiscales, eventos que se pisan, alarmas ajenas...).
// Sin la configuración del proyecto: el mundo de prueba no levanta otro simulador de la API.
const raiz = RAIZ
const w = await createServer({ root: raiz, configFile: false, resolve: { alias: { '@': `${raiz}src` } }, server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'error' })
const WD = await w.ssrLoadModule('/src/entities/datos/produccion-diaria.ts')
const WE = await w.ssrLoadModule('/src/entities/datos/eventos-pozos.ts')
const WB = await w.ssrLoadModule('/src/entities/datos/paradas-bombas.ts')
const WPZ = await w.ssrLoadModule('/src/entities/datos/pozos.ts')
const WM = await w.ssrLoadModule('/src/entities/metrologia.ts')
// Guacamayo: le faltan los tres últimos días de septiembre. El Palmar: el 10-ago llega en null.
const guSep = WD.PRODUCCION_DIARIA.find(m => m.campoId === 'guacamayo' && m.mes === '2026-09')
const ultimos3 = guSep.dias.slice(-3).reduce((a, b) => a + b, 0)
guSep.dias = guSep.dias.slice(0, -3)
WD.PRODUCCION_DIARIA.find(m => m.campoId === 'palmar' && m.mes === '2026-08').dias[9] = null
// Morichal todavía no publica septiembre; La Ceiba sí.
WD.PRODUCCION_DIARIA.find(m => m.campoId === 'morichal' && m.mes === '2026-09').publicado = false
// Eventos que se pisan en GU-03 (un paro y una baja carga dentro de él) y una
// frecuencia reducida de GU-02 sin la frecuencia de la prueba, cruzada con su UL.
WE.EVENTOS_POZOS.push(
  { id: 'EP-PRUEBA-GU03-CMD', campoId: 'guacamayo', pozo: 'GU-03', inicio: '2026-08-10T00:00:00-05:00', fin: '2026-08-12T00:00:00-05:00', codigo: 'CMD', senal: 'prueba' },
  { id: 'EP-PRUEBA-GU03-UL', campoId: 'guacamayo', pozo: 'GU-03', inicio: '2026-08-11T00:00:00-05:00', fin: '2026-08-11T12:00:00-05:00', codigo: 'UL', senal: 'prueba' },
  { id: 'EP-PRUEBA-GU02-HZ', campoId: 'guacamayo', pozo: 'GU-02', inicio: '2026-08-20T00:00:00-05:00', fin: '2026-08-21T00:00:00-05:00', codigo: 'HZ', hz: 45, senal: 'prueba' },
  // GU-03 hoy: una frecuencia reducida abierta y encima un paro abierto.
  { id: 'EP-PRUEBA-GU03-HZ-HOY', campoId: 'guacamayo', pozo: 'GU-03', inicio: '2026-10-01T00:00:00-05:00', fin: null, codigo: 'HZ', hz: 45, senal: 'prueba' },
  { id: 'EP-PRUEBA-GU03-CMD-HOY', campoId: 'guacamayo', pozo: 'GU-03', inicio: '2026-10-02T08:00:00-05:00', fin: null, codigo: 'CMD', senal: 'prueba' },
  // MN-07 cerrado por la MPP-301, que paró hoy.
  { id: 'EP-PRUEBA-MN07', campoId: 'morichal', pozo: 'MN-07', inicio: '2026-10-02T11:05:00-05:00', fin: null, codigo: 'CMD', senal: 'prueba' },
)
for (const pr of WPZ.POZOS_DEMO.find(p => p.campoId === 'guacamayo' && p.id === 'GU-02').pruebas) delete pr.hz
// Paradas de bomba: una alarma que no es de la máquina, una abierta sin
// alarma (firma) y la multifásica parada hoy. Y el arreglo en otro orden.
WB.PARADAS_BOMBAS.push(
  { id: 'EV-PRUEBA-ALARMA', campoId: 'ceiba', equipo: 'P-201B', inicio: '2026-06-10T10:00:00-05:00', fin: '2026-06-10T14:00:00-05:00', perdida: 1, senal: 'prueba', primeraAlarma: { tag: 'PSHH-2011', texto: 'presión muy alta de descarga' } },
  { id: 'EV-PRUEBA-FIRMA', campoId: 'morichal', equipo: 'P-201B', inicio: '2026-10-02T12:00:00-05:00', fin: null, perdida: 1, senal: 'prueba' },
  { id: 'EV-PRUEBA-MPP', campoId: 'morichal', equipo: 'MPP-301', inicio: '2026-10-02T11:00:00-05:00', fin: null, perdida: 1, senal: 'prueba' },
)
WB.PARADAS_BOMBAS.reverse()
// La Zarza sin análisis de °API: llega `api: null`, como lo permite el contrato (el tipo lo admite).
WM.METROLOGIA_CAMPO.zarza.api = null
// Con los datos ya tocados, se instalan como insumos de este mundo.
;(await w.ssrLoadModule('/src/entities/insumos.ts')).instalarInsumos((await w.ssrLoadModule('/src/entities/datos/index.ts')).INSUMOS_DEMO)
const WL = await w.ssrLoadModule('/src/entities/libro.ts')
const WDf = await w.ssrLoadModule('/src/entities/diferido.ts')
const WCS = await w.ssrLoadModule('/src/entities/causa-senal.ts')
const WP = await w.ssrLoadModule('/src/entities/pozos.ts')
const WBo = await w.ssrLoadModule('/src/entities/bombas.ts')
const WEV = await w.ssrLoadModule('/src/entities/equipo-vivo.ts')
const wctx = { config: WL.contextoInicial().config, respuestas: {} }

// Un hueco fiscal no es cero: el factor sale de los días con dato y el libro no se publica.
const guReal = L.libro(['guacamayo'], sep.desde, sep.hasta, ctx0), guHueco = WL.libro(['guacamayo'], sep.desde, sep.hasta, wctx)
const faReal = guReal.fa[0].fa, faHueco = guHueco.fa[0].fa
const diasGu = WL.porDia(['guacamayo'], sep.desde, sep.hasta, wctx)
comprobar(Math.abs(faHueco - faReal) < 0.02 && cerca(guHueco.real, guReal.real - ultimos3, 1e-9) && !guHueco.publicable
  && guHueco.motivos.some(m => /faltan 3 días de producción fiscal/.test(m.texto)) && diasGu.filter(d => d.real === null).length === 3,
  `Guacamayo sin los 3 últimos días de septiembre: el factor queda en ${faHueco.toFixed(3)} (con todo, ${faReal.toFixed(3)}), lo real no los cuenta, el día a día los muestra como hueco y el libro no se publica`)
const paAgo = WL.libro(['palmar'], new Date('2026-08-01T00:00:00-05:00'), new Date('2026-09-01T00:00:00-05:00'), wctx)
comprobar(!paAgo.publicable && paAgo.motivos.some(m => /faltan 1 día/.test(m.texto)) && WL.porDia(['palmar'], new Date('2026-08-10T00:00:00-05:00'), new Date('2026-08-11T00:00:00-05:00'), wctx)[0].real === null,
  'El Palmar con el 10-ago en null: ese día es un hueco, no un cero, y agosto no se publica')
const moSep = WL.libro(['morichal'], sep.desde, sep.hasta, wctx), ceSep = WL.libro(['ceiba'], sep.desde, sep.hasta, wctx)
comprobar(!moSep.fa[0].publicado && !moSep.publicable && ceSep.fa[0].publicado && ceSep.publicable && !WL.calendario().find(m => m.mes === '2026-09').publicado
  && WL.serieMensual(['ceiba'], wctx).find(m => m.mes === '2026-09').parcial === false,
  'cada campo publica su mes: Morichal sin publicar septiembre no sale publicable aunque La Ceiba ya lo publicó')
const zaSep = WL.libro(['zarza'], sep.desde, sep.hasta, wctx)
comprobar(!WL.bandaDe('zarza').verificable && !zaSep.publicable && zaSep.motivos.some(m => /Sin análisis de °API/.test(m.texto)) && zaSep.motivos.every(m => !/fuera de la banda/.test(m.texto)),
  'La Zarza sin °API: no se escoge fila de la Fig. 10.2 a ciegas; el factor no se puede verificar y se dice')
// F4 y F5 (5A·H8, H9): la pantalla dice el factor y «publicable» con los motivos del libro, no con su propia regla.
{
  const PUB = await w.ssrLoadModule('/src/widgets/diferidos/publicacion.ts')
  const lbSepW = WL.libro(TODOS, sep.desde, sep.hasta, wctx)
  const faZarzaSep = lbSepW.fa.find(x => x.campoId === 'zarza' && x.mes === '2026-09'), faCeibaSep = lbSepW.fa.find(x => x.campoId === 'ceiba' && x.mes === '2026-09')
  comprobar(!!faZarzaSep && !faZarzaSep.dentro && PUB.estadoFactor(lbSepW, faZarzaSep) === 'sin-verificar' && PUB.estadoFactor(lbSepW, faCeibaSep) === 'dentro',
    `F4: La Zarza sin °API en septiembre (factor ${faZarzaSep?.fa.toFixed(3)}, «dentro» falso) sale «banda sin verificar», no «fuera de banda»; La Ceiba, dentro`)
  comprobar(PUB.campoPublicable(lbSepW, 'guacamayo') === false && PUB.campoPublicable(lbSepW, 'ceiba') === true && lbSepW.motivos.some(m => m.codigo === 'sin-fiscal' && m.campoId === 'guacamayo'),
    'F5: Guacamayo sin 3 días de fiscal en septiembre no es «publicable» en «Por campo» (el mismo motivo del sello); La Ceiba sí')
}

// Eventos que se pisan: cada hora del pozo se cobra una vez.
const guAgo = WL.libro(['guacamayo'], new Date('2026-08-01T00:00:00-05:00'), new Date('2026-09-01T00:00:00-05:00'), wctx)
const t03 = guAgo.tramos.filter(t => t.evento.id.startsWith('EP-PRUEBA-GU03'))
const t02 = guAgo.tramos.find(t => t.evento.id === 'EP-PRUEBA-GU02-HZ')
comprobar(cerca(guAgo.potencial - guAgo.real, guAgo.diferido, 1e-9) && cerca(t03.reduce((a, t) => a + t.horas, 0), 48) && t03.find(t => t.evento.codigo === 'UL').bbl === 0,
  `GU-03 con una baja carga dentro de un paro: se cobran ${t03.reduce((a, t) => a + t.horas, 0)} h (no 60) y potencial − real sigue siendo Σ diferidos en agosto`)
comprobar(t02.factor === 1 && t02.bbl >= 0 && t02.aproximado && cerca(t02.horas, 24 - 63 / 60, 1e-6) && guAgo.diferido >= 0,
  `GU-02 a 45 Hz con una prueba sin frecuencia: se cuenta como cerrado (factor 1, aproximado), nunca negativo, y su baja carga manda en la hora que se cruzan (${t02.horas.toFixed(2)} h)`)
const gu03 = WP.estadoAhora(WP.todosLosPozos().find(p => p.campoId === 'guacamayo' && p.id === 'GU-03'))
comprobar(!gu03.produce && gu03.evento.codigo === 'CMD', 'con una frecuencia reducida y un paro abiertos a la vez, el pozo está parado: manda el paro')

// Una alarma que no es de la máquina no identifica la parte; la respuesta sí.
const evAl = WBo.paradaPorId('EV-PRUEBA-ALARMA')
const cAl0 = WCS.causaDeParada(evAl, wctx)
const cAl1 = WCS.causaDeParada(evAl, { config: wctx.config, respuestas: { 'EV-PRUEBA-ALARMA': { texto: 'Rodamiento caliente', por: 'prueba', hora: '2026-06-10T13:00:00-05:00', parte: 'rodamientos', modo: 'OHE' } } })
comprobar(cAl0.como === 'ninguno' && WCS.estadoIdentificacion(cAl0, evAl.fin).pide && cAl1.como === 'declarado' && cAl1.parte === 'rodamientos' && !WCS.estadoIdentificacion(cAl1, evAl.fin).pide,
  'P-201B con primera alarma PSHH-2011 (no es un disparo de su catálogo): pide la parte, y la respuesta del operario la cierra')

// La firma se decide al parar y se conserva al cerrar.
const evF = WBo.paradaPorId('EV-PRUEBA-FIRMA')
const cF0 = WCS.causaDeParada(evF, wctx)
const evFc = { ...evF, fin: '2026-10-02T13:30:00-05:00' }
const cF1 = WCS.causaDeParada(evFc, { config: wctx.config, respuestas: {} })
comprobar(cF0.como === 'firma' && cF0.parte === 'succion' && cF1.como === 'firma' && cF1.parte === 'succion' && !WCS.estadoIdentificacion(cF1, evFc.fin).pide && !WCS.estadoIdentificacion(cF1, evFc.fin).arrancoSinIdentificar,
  'P-201B de Morichal sin primera alarma: la firma (succión) se decide al parar y sigue igual cuando la parada se cierra; no queda como no conformidad')

// La multifásica parada dice lo que está perdiendo; el orden del arreglo no cambia la causa.
const prMpp = WDf.prediccion(WBo.perfilBomba('MPP-301', 'morichal'), wctx)
comprobar(prMpp.perdiendo && prMpp.perdiendo.pozos.some(p => p.id === 'MN-07') && prMpp.perdiendo.bblDia > 0,
  `MPP-301 parada: la predicción trae lo que está perdiendo (${prMpp.perdiendo?.pozos.map(p => p.id).join(', ')}, ${f(prMpp.perdiendo?.bblDia ?? 0)} bbl/d)`)
comprobar(conLasDos.length > 0 && conLasDos.every(e0 => WCS.causaDeEvento(WP.eventosPozos().find(e => e.id === e0.id), wctx).equipo === 'MPP-301'),
  `con las paradas de bomba en otro orden, ${conLasDos.map(e => `${e.pozo} el ${e.inicio.slice(0, 10)}`).join(', ')} sigue siendo de la multifásica`)
const lc01 = WEV.equipoVivo('LACT-01', 'guacamayo', wctx)
const ult5 = WL.fiscalUltimosDias('guacamayo', 5)
comprobar(ult5.slice(1, 4).every(x => x === null) && ult5[0] !== null && ult5[4] !== null && WL.fiscalUltimosDias('ceiba', 5).every(x => typeof x === 'number')
  && (s => s?.valores.length === 12 && s.valores.filter(v => v === null).length === 3 && s.pasoH === 24
    && Date.parse(s.desde) + 11 * 24 * 3_600_000 === WL.fiscalDeAyer('guacamayo').fecha.getTime())(lc01.dispositivos.find(d => d.tag === 'FQI-0101')?.serie),
  'el computador de flujo sin dato da null, no cero: la serie del LACT-01 de Guacamayo lleva los tres días que faltan como hueco EN SU DÍA (antes se saltaban y el eje se comprimía)')

// El evitable escoge entre los pozos que producían.
const evM = L.tramosDeEvento('morichal', 'EV-M2011-260924', ctx0).filter(t => t.bbl > 0)
comprobar(evM.length > 0 && cerca(L.evitableDeEvento(evM), (() => {
  const cierre = Math.min(...evM.map(t => Date.parse(t.evento.inicio))), cerrados = new Set(evM.map(t => t.pozo.id))
  const todos = P.todosLosPozos().filter(p => p.campoId === 'morichal' && p.pruebas.length && (cerrados.has(p.id) || !P.eventosPozos().some(e => e.campoId === 'morichal' && e.pozo === p.id && e.codigo !== 'HZ' && Date.parse(e.inicio) < cierre && (!e.fin || Date.parse(e.fin) > cierre))))
  const dia = evM[0].inicio.getTime()
  let cr = 0, ag = 0
  for (const t of evM) { const pr = P.pruebaEn(t.pozo, dia); cr += pr.crudoBpd * t.factor; ag += pr.aguaBpd * t.factor }
  const opt = L.ordenOptimo(todos, ag, dia).crudo
  return cr > 0 && opt < cr ? evM.reduce((a, t) => a + t.bbl, 0) * (1 - opt / cr) : 0
})()), `evitable por orden de EV-M2011-260924: ${f(L.evitableDeEvento(evM))} bbl, escogiendo solo entre los pozos que producían al empezar los cierres`)
await w.close()

console.log('\n=== 11. Estado, dirección y costura (auditoría S3) ===')
{
// El store vive en el navegador: se le da lo mínimo del navegador (dirección,
// historial, eventos, almacenamiento) y se carga en el MISMO servidor que el
// libro, para que la identidad de CONTEXTO_INICIAL sea la misma.
const nav = { hash: '#/ger/resumen/ceiba/curso', oyentes: {} }
const definir = (k, val) => Object.defineProperty(globalThis, k, { value: val, configurable: true, writable: true })
definir('location', { get hash() { return nav.hash }, set hash(h) { nav.hash = h.startsWith('#') ? h : `#${h}`; nav.oyentes.hashchange?.() } })
definir('history', { pushState: (_e, _t, u) => { nav.hash = u }, replaceState: (_e, _t, u) => { nav.hash = u } })
definir('addEventListener', (tipo, f) => { nav.oyentes[tipo] = f })
definir('matchMedia', () => ({ matches: false, addEventListener() {} }))
definir('localStorage', { getItem: () => '1', setItem() {} })
definir('document', { documentElement: { setAttribute() {}, style: {} } })
const ST = await v.ssrLoadModule('/src/app/store.ts')
// Los oyentes del navegador ya no se registran al cargar el estado: los pone iniciarApp().
ST.iniciarApp()
const SES = await v.ssrLoadModule('/src/shared/api/sesion.ts')
const URLM = await v.ssrLoadModule('/src/app/url.ts')
const PANT = await v.ssrLoadModule('/src/app/pantallas.tsx')
const CSV = await v.ssrLoadModule('/src/shared/lib/csv.ts')
const CARGA = await v.ssrLoadModule('/src/shared/lib/carga.ts')
// La configuración, las respuestas y los accesos viven en la sesión (shared/api/sesion.ts).
const app = ST.useApp, est = () => ({ ...app.getState(), ...SES.sesion() })
const ir = h => { location.hash = h }

comprobar(est().ctx === L.contextoInicial(), 'la sesión arranca con el mismo objeto de contexto inicial que la historia de SAP y los mensajes (una sola vuelta de cachés)')

nav.hash = '#/cont/resumen/ceiba/curso'
comprobar(URLM.leerHash(undefined, 'ger').rolId === undefined, 'una dirección con un rol de v2 (cont) no trae rol')
nav.hash = '#//produccion/palmar/curso'
const sinRol = URLM.leerHash(undefined, 'oper')
// C1 (25-oct): el operador abre en su Hoy (X4 §3.4); la pantalla ajena lleva a su inicio, sea cual sea.
comprobar(sinRol.pantalla === ROL.rolPorId('oper').inicio && sinRol.campoId === undefined, `sin rol en la dirección se valida contra el rol que se ve: el operador no abre Producción ni El Palmar (${JSON.stringify(sinRol)})`)
nav.hash = '#/x/bombas/palmar/curso'
comprobar(URLM.leerHash(undefined, 'sup').campoId === undefined, 'con un rol inválido, el supervisor (solo La Ceiba) no abre El Palmar')
nav.hash = '#/ger/perfil/ceiba/curso'
comprobar(URLM.leerHash(undefined, 'ger').pantalla === 'perfil', '«Mi perfil» se acepta en la dirección de cualquier rol')

est().setRol('ger'); ir('#/ger/resumen/ceiba/curso')
ir('#/cont/resumen/ceiba/curso')
comprobar(est().rolId === 'ger' && nav.hash.startsWith('#/ger/'), `pegar un enlace con un rol de v2 no deja guardado un rol fantasma (rol ${est().rolId}, dirección ${nav.hash})`)
est().setRol('oper'); ir('#/oper/bombas/ceiba/curso')
ir('#//produccion/palmar/curso')
comprobar(est().rolId === 'oper' && est().pantalla === ROL.rolPorId('oper').inicio && est().campoId === 'ceiba', `operador con «#//produccion/palmar»: sigue en lo suyo de La Ceiba (${est().pantalla}, ${est().campoId})`)
// C5 (25-oct): el Resumen y los Diferidos del gerente se fundieron en La planta viva y Resultados (X4 §3.6);
// lo mismo se prueba con Resultados, que también suma campos, y sus direcciones viejas abren la nueva.
est().setRol('ger'); ir('#/ger/resultados/ceiba~portafolio/curso')
ir('#/ger/resultados/zarza~portafolio/curso')
comprobar(est().alcance === 'portafolio' && est().campoId === 'zarza' && nav.hash === '#/ger/resultados/zarza~portafolio/curso', `pegar un portafolio sobre otro portafolio lo conserva (${nav.hash})`)
ir('#/ger/resultados/ceiba/curso/P-201B')
ir('#/ger/planta-viva/ceiba/curso/P-201B')
comprobar(est().pantalla === 'plantaViva' && est().equipoAbierto === 'P-201B', `cambiar de pantalla por la dirección con el mismo equipo lo deja abierto (${nav.hash})`)
ir('#/ger/diferidos/ceiba/cerrado')
const fusionDif = est().pantalla
ir('#/ger/riesgo/ceiba/curso')
const fusionRiesgo = est().pantalla
ir('#/ger/resumen/ceiba/curso')
comprobar(fusionDif === 'resultados' && fusionRiesgo === 'plantaViva' && est().pantalla === 'plantaViva' && nav.hash.startsWith('#/ger/planta-viva/ceiba/'),
  `las direcciones viejas del gerente abren donde se fundieron: Diferidos → ${fusionDif}, Riesgo → ${fusionRiesgo}, Resumen → ${est().pantalla} (${nav.hash})`)
ir('#/ger/perfil/ceiba/curso')
comprobar(est().pantalla === 'perfil', 'atrás/adelante a «Mi perfil» lo vuelve a abrir')

est().setRol('ger'); est().setAlcance('portafolio'); est().setRol('adm')
// C1 (25-oct): La planta viva suma campos y el administrador la tiene: puede ver todos sus campos, solo por ella.
const sumanAdm = ROL.rolPorId('adm').pantallas.filter(x => PANT.PANTALLAS[x]?.agrega)
comprobar(est().alcance === 'portafolio' && sumanAdm.join() === 'plantaViva', `el administrador queda en «Todos mis campos» solo porque La planta viva suma campos (${sumanAdm.join(', ')})`)
est().setRol('tec'); est().setAlcance('portafolio')
comprobar(est().alcance === 'campo', 'el técnico (un solo campo) no queda en portafolio')
est().setRol('prod'); est().setCampo('ceiba'); est().redirigir('pozos', 'aviso de prueba'); est().setCampo('palmar')
comprobar(est().avisoSub === null, 'cambiar de campo borra el aviso de una redirección hecha en el campo anterior')
est().setCampo('zarza')
comprobar(est().campoId === 'palmar', 'setCampo no abre un campo que el rol no tiene (producción no tiene La Zarza)')
est().setPantalla('mantenimiento')
comprobar(est().pantalla !== 'mantenimiento', 'setPantalla no abre una pantalla que el rol no tiene')
comprobar(!est().setRango('2024-01-01', '2024-12-31').ok && est().setRango('2026-09-01', '2026-09-10').ok, 'un rango sin días con datos se rechaza con motivo; uno con datos se aplica')

// Respuestas: capacidad, parte en una bomba, la primera gana. Sobre una parada
// REAL de P-201B en La Ceiba: el servidor saca el campo del evento del PLC y un
// id inventado ya no se responde (CONTRATO.md, S8). Una con primera alarma, para
// que la respuesta no le cambie la causa al libro de las comprobaciones siguientes.
EV3 = B.eventosBomba().find(e => e.campoId === 'ceiba' && e.equipo === 'P-201B' && e.primeraAlarma && !est().ctx.respuestas[e.id]).id
const catP = CAT.catalogoDe('ceiba', 'P-201B'), parteP = catP.partes[0], modoP = CAT.modosDeParte(parteP)[0].codigo
est().setRol('ger')
comprobar(!(await est().responder({ evento: EV3, campoId: 'ceiba', equipo: 'P-201B', texto: 'Sello con fuga por el acople', parte: parteP.id, modo: modoP })).ok, 'el gerente (sin causa:declarar) no responde paradas')
// Mi perfil no niega lo que la escritura deja hacer (ni promete lo que no):
// cada rol responde con un campo que no es el del evento. La capacidad se
// revisa primero, así que el rechazo «Su rol no responde paradas» sale solo
// si Mi perfil la muestra como negada; los demás se rechazan por el campo o
// la persona, y la parada no se gasta.
const perfilVsEscritura = []
for (const r of ROL.ROLES) {
  est().setRol(r.id)
  if (est().rolId !== r.id) continue
  const res = await est().responder({ evento: EV3, campoId: 'zarza', equipo: 'P-201B', texto: '', parte: parteP.id, modo: modoP })
  const niegaPerfil = TIP.permisosDelRol(r.puede).negadas.includes('causa:declarar')
  if (res.ok || (res.error === 'Su rol no responde paradas.') !== niegaPerfil) perfilVsEscritura.push(`${r.id}: perfil ${niegaPerfil ? 'niega' : 'deja'}, escritura ${res.ok ? 'acepta' : res.error}`)
}
const jefePerfil = TIP.permisosDelRol(ROL.rolPorId('jefe').puede)
comprobar(perfilVsEscritura.length === 0 && !est().ctx.respuestas[EV3]
  && !jefePerfil.negadas.includes('causa:declarar') && /^Responder qué se dañó/.test(TIP.CAPACIDAD_NOMBRE[jefePerfil.concedidas.find(k => k.startsWith('causa:'))]),
  `Mi perfil dice de responder paradas lo mismo que la escritura (el jefe, con completar, responde y no se le niega)${perfilVsEscritura.length ? ': ' + perfilVsEscritura.join(' · ') : ''}`)
est().setRol('oper')
comprobar(!(await est().responder({ evento: EV3, campoId: 'ceiba', equipo: 'P-201B', texto: 'Se dañó algo en la bomba' })).ok, 'en pantalla, una parada de bomba sin parte se rechaza')
comprobar(!(await est().responder({ evento: EV3, campoId: 'palmar', equipo: 'P-201B', texto: '', parte: parteP.id, modo: modoP })).ok, 'el operador no responde una parada diciendo que es de otro campo (el campo sale del evento)')
const r1 = (await est().responder({ evento: EV3, campoId: 'ceiba', equipo: 'P-201B', texto: '', parte: parteP.id, modo: modoP }))
const r2 = (await est().responder({ evento: EV3, campoId: 'ceiba', equipo: 'P-201B', texto: '', parte: parteP.id, modo: modoP }))
comprobar(r1.ok && !r2.ok && /Ya respondió Jairo/.test(r2.error) && est().ctx.respuestas[EV3].canal === 'pantalla', `la primera respuesta gana también en pantalla (${r2.ok ? '' : r2.error})`)
est().setRol('jefe')
const a1 = (await est().completarAnalisis(EV3, { mecanismo: '1.1', causaRaiz: '3' })), a2 = (await est().completarAnalisis(EV3, { mecanismo: '1.1', causaRaiz: '1' }))
comprobar(a1.ok && a2.ok && est().analisis[EV3].causaRaiz === '1' && est().analisisAnteriores[EV3]?.[0]?.causaRaiz === '3', 'corregir un análisis deja el anterior en la historia')

// Avisos, firma y asignación con las reglas del contrato.
est().setRol('sup')
const av = (await est().enviarAviso({ tipo: 'M1', campoId: 'palmar', equipo: 'P-201B', descripcion: 'Vibración alta en el cojinete', prioridad: '2' }))
comprobar(!av.ok && /no lo tiene asignado/.test(av.error), 'el supervisor no envía avisos de un campo que no tiene')
est().setRol('ger')
const vig = est().versiones.at(-1).version
const vieja = (await est().firmarConfig(est().ctx.config, 'motivo de prueba', vig - 1))
comprobar(!vieja.ok && /Mientras editaba/.test(vieja.error), 'firmar sobre una versión que ya no es la vigente se rechaza (el 409 del contrato)')
comprobar(!(await est().firmarConfig(est().ctx.config, 'motivo de prueba', vig)).ok, 'sobre la vigente y sin cambios, no hay nada que firmar')
est().setRol('prod')
const mesAbierto = L.calendario().at(-1).mes, mesCerr = L.calendario().filter(L.mesCerrado).at(-1).mes
const MOT = 'asignación del mes reportada a la ANH'
comprobar(!(await est().cargarAsignacion([{ mes: mesAbierto, campoId: 'ceiba', pozo: 'LC-14', bbl: 100 }], MOT)).ok, 'la asignación oficial de un mes abierto no se carga')
comprobar(!(await est().cargarAsignacion([{ mes: mesCerr, campoId: 'zarza', pozo: 'LZ-01', bbl: 100 }], MOT)).ok, 'ni la de un campo que la persona no tiene')
comprobar(!(await est().cargarAsignacion([{ mes: mesCerr, campoId: 'ceiba', pozo: 'LC-14', bbl: 100, horas: 9999 }], MOT)).ok, 'ni horas imposibles para el mes')
const sinMotivo = await est().cargarAsignacion([{ mes: mesCerr, campoId: 'ceiba', pozo: 'LC-14', bbl: 100 }], '  ')
comprobar(!sinMotivo.ok && /motivo/.test(sinMotivo.error) && est().asignacionOficial.length === 0 && est().cargasAsignacion.length === 0, 'ni sin motivo: reemplazar la oficial de un mes sin decir por qué no deja rastro útil')
// R15 (#179): la capacidad la revisa la escritura, no la pantalla. Los cuatro roles que la reproducían ya no la pisan.
const ajenas = []
for (const r of ['oper', 'tec', 'sup', 'ger']) {
  est().setRol(r)
  const x = await est().cargarAsignacion([{ mes: '2026-08', campoId: 'ceiba', pozo: 'LC-14', bbl: 100 }], MOT)
  if (x.ok || !/producción/.test(x.error)) ajenas.push(r)
}
est().setRol('prod')
comprobar(ajenas.length === 0 && est().asignacionOficial.length === 0 && ROL.ROLES.filter(r => r.puede['asignacion:cargar']).map(r => r.id).join() === 'prod',
  `solo producción (asignacion:cargar) carga la asignación oficial: operador, técnico, supervisor y gerente reciben el 403 (${ajenas.join(', ') || 'ninguno pasa'})`)
comprobar((await est().cargarAsignacion([{ mes: mesCerr, campoId: 'ceiba', pozo: 'LC-14', bbl: 100 }], MOT)).ok && est().asignacionOficial.length === 1, 'una carga válida entra')
// R16 (#86): cada carga deja quién, cuándo, por qué y qué reemplazó; reemplazar no borra el rastro de la anterior.
const c1 = est().cargasAsignacion.at(-1)
comprobar(!!c1 && /^Marcela Ríos · /.test(c1.por) && c1.motivo === MOT && /-05:00$/.test(c1.fecha) && c1.grupos.length === 1 && c1.grupos[0].reemplazados === 0
  && est().asignacionOficial[0].carga === c1.id, `la carga queda con quién, cuándo y por qué (${c1?.por}, ${c1?.fecha}, «${c1?.motivo}») y cada fila dice qué carga la trajo`)
await est().cargarAsignacion([{ mes: mesCerr, campoId: 'ceiba', pozo: 'LC-14', bbl: 120 }, { mes: mesCerr, campoId: 'ceiba', pozo: 'LC-15', bbl: 80 }], 'corrección del reporte de la operadora')
const c2 = est().cargasAsignacion.at(-1)
comprobar(est().cargasAsignacion.length === 2 && c2.grupos[0].reemplazados === 1 && c2.grupos[0].pozos === 2 && est().asignacionOficial.every(f => f.carga === c2.id)
  && AS.cargaVigente(est().asignacionOficial, est().cargasAsignacion, mesCerr, 'ceiba') === c2,
  'un reemplazo queda como otra carga (reemplazó 1 pozo, trajo 2); la anterior sigue en el rastro y la vigente es la nueva')

// Esquema de planta: capacidad, ids únicos, historial.
const grupoPozos = ['tronco', 'gas', 'crudo', 'agua', 'servicios'].flatMap(t => est().plantas.ceiba[t]).find(e => e.miembros?.length)
const yaEsta = grupoPozos.miembros[0]
est().setRol('ger')
comprobar(!(await est().agregarMiembro('ceiba', grupoPozos.id, { id: 'NUEVO-1', etiqueta: 'NUEVO-1' })).ok, 'el gerente (sin conector:configurar) no edita el esquema de planta')
est().setRol('adm')
const antesN = grupoPozos.miembros.length
const dup = (await est().agregarMiembro('ceiba', grupoPozos.id, { id: yaEsta.id, etiqueta: yaEsta.id }))
comprobar(!dup.ok, `un id repetido (${yaEsta.id}) se rechaza`)
const nuevo = (await est().agregarMiembro('ceiba', grupoPozos.id, { id: 'LC-99', etiqueta: 'LC-99' }))
const quit = (await est().quitarMiembro('ceiba', grupoPozos.id, 'LC-99'))
const despues = ['tronco', 'gas', 'crudo', 'agua', 'servicios'].flatMap(t => est().plantas.ceiba[t]).find(e => e.id === grupoPozos.id)
comprobar(nuevo.ok && quit.ok && despues.miembros.length === antesN && despues.miembros.some(m => m.id === yaEsta.id) && est().cambiosPlanta.length === 2,
  'agregar y quitar deja el conjunto como estaba, sin perder el original, y los dos cambios quedan en el historial')

// CSV y carga de pantallas.
comprobar(CSV.textoCsv('=HYPERLINK("http://x","VER")').startsWith(`"'=`) && CSV.textoCsv('+57') === "'+57" && CSV.textoCsv('LC-14') === 'LC-14',
  'el CSV neutraliza fórmulas (= + - @) en los textos y deja lo demás igual')
{ const r0 = D.rangoDePeriodo('cerrado'), csvInf = I.csvDeLibro(L.libro(['ceiba'], r0.desde, r0.hasta, ctx0), [['Empresa', '=1+1'], ['Nota', 'línea\rotra']])
  comprobar(csvInf.includes("'=1+1") && csvInf.includes('"línea\rotra"'), 'el CSV del informe con folio usa la misma regla: fórmulas neutralizadas y el retorno entre comillas') }
comprobar(CARGA.archivoDelFallo(new TypeError('Failed to fetch dynamically imported module: http://localhost:5173/src/pages/Diferidos.tsx')) === 'http://localhost:5173/src/pages/Diferidos.tsx'
  && CARGA.archivoDelFallo(new TypeError('error loading dynamically imported module: https://x.co/assets/Diferidos-Y7U6.js?t=1')) === 'https://x.co/assets/Diferidos-Y7U6.js'
  && CARGA.archivoDelFallo(new TypeError('Importing a module script failed.')) === null,
  'del fallo de una carga se saca el archivo que no llegó (Chromium y Firefox; Safari no lo dice)')

// Exportar: el operador no tiene evidencia:exportar (el 403 de POST /api/informes).
app.setState({ rolId: 'oper' })
const infOper = await est().emitirInforme({ formato: 'csv', titulo: 'x', alcance: 'x', periodo: 'x', campos: ['ceiba'], desde: '2026-09-01T00:00:00-05:00', hasta: '2026-10-01T00:00:00-05:00' })
comprobar(!infOper.ok && /no exporta/.test(infOper.error) && est().informes.length === 0, 'el operador (sin evidencia:exportar) no emite informes: el rechazo dice por qué y no se gasta folio')

// La costura HTTP: una página en vez de JSON es «no hay servicio»; «no está en
// el registro» solo cuando el servidor lo dice con su código. El error del
// contrato tiene una sola forma: { error: { codigo, mensaje } }.
const HTTP = await v.ssrLoadModule('/src/shared/api/fuente.ts')
const fetchReal = globalThis.fetch
const responder404 = (cuerpo, tipo = 'application/json') => async () => new Response(cuerpo, { status: 404, headers: { 'content-type': tipo } })
const intentar = async f => { globalThis.fetch = f; try { await HTTP.pedirJson('/x'); return null } catch (e) { return e } finally { globalThis.fetch = fetchReal } }
const eHtml = await intentar(async () => new Response('<!doctype html><html></html>', { status: 200, headers: { 'content-type': 'text/html' } }))
const eTag = await intentar(responder404(JSON.stringify({ error: { codigo: 'tag-no-registrado', mensaje: 'el tag no está registrado' } })))
const eRuta = await intentar(responder404(JSON.stringify({ error: { codigo: 'ruta-no-encontrada', mensaje: 'ruta no encontrada' } })))
const eSinForma = await intentar(responder404(JSON.stringify({ error: 'texto suelto' })))
const eRed = await intentar(async () => { throw new TypeError('Failed to fetch') })
comprobar(eHtml?.message === HTTP.SIN_SERVICIO && eHtml.codigo === 'sin-servicio' && !/Unexpected token/.test(eHtml.message),
  'una página HTML en vez de JSON se dice «no hay servicio», no con un error de sintaxis de JavaScript')
comprobar(eTag instanceof HTTP.ErrorApi && eTag.estado === 404 && eTag.codigo === 'tag-no-registrado' && eTag.message === 'el tag no está registrado'
  && eRuta?.estado === 404 && eRuta.codigo === 'ruta-no-encontrada' && eSinForma?.codigo === 'http-404' && eRed?.estado === 0 && eRed.codigo === 'sin-conexion',
  'un 404 solo es «tag no registrado» con el código del contrato; un 404 de una ruta que no existe (o sin el error del contrato) no afirma nada del tag; sin red, «sin conexión»')

}

console.log('\n=== 12. Pantallas (auditoría S4) ===')
{
// Las pantallas piden a la capa de servicio (shared/api): se carga después de
// la sección 11, que ya le dio al store lo mínimo del navegador.
const API = await v.ssrLoadModule('/src/shared/api/diferidos.ts')
const F = await v.ssrLoadModule('/src/shared/lib/formato.ts')

// «Por su ESP» (Electrosumergibles): solo las fallas de la propia electrosumergible.
// Sumada en el campo, es la línea «electrosumergible» del Pareto por tipo del libro.
let malEsp = 0, ajenoEsp = 0, sinIdentificarFuera = 0
for (const c of TODOS) for (const per of ['cerrado', 'curso', 'ytd']) {
  const r = D.rangoDePeriodo(per)
  const filas = API.pedirPozos(c, r.desde, r.hasta, ctx0)
  const lb = L.libro([c], r.desde, r.hasta, ctx0)
  const delLibro = lb.porTipo.find(t => t.tipo === 'electrosumergible')?.bbl ?? 0
  if (!cerca(filas.reduce((a, x) => a + x.diferidoEsp, 0), delLibro, 1e-9)) { malEsp++; console.log('    ', c, per, filas.reduce((a, x) => a + x.diferidoEsp, 0), delLibro) }
  ajenoEsp += filas.filter(x => x.pozo.levantamiento !== 'electrosumergible' && x.diferidoEsp > 0).length
  // Una parada sin identificar del propio pozo no se le carga a su ESP.
  const ts = L.tramosEntre([c], r.desde, r.hasta, ctx0)
  for (const x of filas.filter(x => x.pozo.levantamiento === 'electrosumergible')) {
    const pend = ts.filter(t => t.pozo.id === x.pozo.id && t.causa.equipo === x.pozo.id && t.causa.tipo !== 'electrosumergible').reduce((a, t) => a + t.bbl, 0)
    if (pend > 0 && x.diferidoEsp > x.diferido - pend + 1e-6) sinIdentificarFuera++
  }
}
comprobar(malEsp === 0, '«Por su ESP»: en cada campo y período, Σ de la columna = la línea «electrosumergible» del Pareto por tipo (la tarjeta de arriba)')
comprobar(ajenoEsp === 0 && sinIdentificarFuera === 0, '«Por su ESP» no le carga nada a un pozo sin electrosumergible, ni a la ESP las paradas sin identificar o de otra causa del pozo')

// «Mes a mes» con un rango que corta meses: cada mes recortado al rango suma lo
// mismo que el rango (real, potencial y diferido), como las cifras de arriba.
for (const campos of [['ceiba'], TODOS]) {
  const desde = new Date('2026-07-15T00:00:00-05:00'), hasta = R.AHORA
  const meses = L.serieMensual(campos, ctx0).filter(m => m.desde < hasta && m.hasta > desde)
  const partes = meses.map(m => L.libro(campos, new Date(Math.max(m.desde.getTime(), desde.getTime())), new Date(Math.min(m.hasta.getTime(), hasta.getTime())), ctx0))
  const todo = L.libro(campos, desde, hasta, ctx0)
  const suma = k => partes.reduce((a, b) => a + b[k], 0)
  comprobar(cerca(suma('real'), todo.real, 1e-9) && cerca(suma('potencial'), todo.potencial, 1e-9) && cerca(suma('diferido'), todo.diferido, 1e-9)
    && suma('real') < meses.reduce((a, m) => a + m.libro.real, 0),
    `${campos.length > 1 ? 'portafolio' : campos[0]}, 15-jul a hoy: los meses recortados suman lo del rango (${f(todo.real)} bbl reales); julio entero lo inflaba`)
}

// Evidencia: una parada que cruza el borde del período no se cuenta entera en
// los dos lados. Se parte cada parada propia por la mitad: las dos mitades suman
// sus horas y sus barriles, y las dos dicen que cruzan el borde.
let partidas = 0, malPartida = 0
const inicioHistoria = new Date(L.calendario()[0].desde)
for (const c of TODOS) for (const id of Object.keys(EQ.EQUIPOS).filter(id => BO.esBomba(id) && BO.perfilBomba(id, c))) {
  for (const m of API.pedirParadas(c, id, ctx0)) {
    if (m.cargadoA !== m.evento.equipo || m.inicio < inicioHistoria || m.horasParada < 1) continue
    const mitad = new Date((m.inicio.getTime() + m.fin.getTime()) / 2)
    const a = API.pedirParadasEnPeriodo(c, id, inicioHistoria, mitad, ctx0).find(x => x.evento.id === m.evento.id)
    const b = API.pedirParadasEnPeriodo(c, id, mitad, new Date(R.AHORA.getTime() + 1), ctx0).find(x => x.evento.id === m.evento.id)
    partidas++
    if (!a || !b || !a.cruzaBorde || !b.cruzaBorde || !cerca(a.horasEnPeriodo + b.horasEnPeriodo, m.horasParada, 1e-9)
      || !cerca(a.bblEnPeriodo + b.bblEnPeriodo, m.bbl, 1e-9) || a.horasEnPeriodo >= m.horasParada) { malPartida++; console.log('    ', c, id, m.evento.id) }
  }
}
comprobar(partidas > 0 && malPartida === 0, `Evidencia: ${partidas} paradas propias partidas a la mitad; las dos mitades suman sus horas y sus barriles, y cada una dice que cruza el borde`)

// Un °API que llega null es un análisis que falta: Configuración lo dice y nunca pinta «0,0 °API».
const MED = await v.ssrLoadModule('/src/shared/api/medicion.ts')
const tApiNulo = MED.textoBanda({ banda: { valor: 0.15, fuente: '', verificable: false }, metrologia: { api: null, apiFuente: 'Laboratorio sin reporte' } })
const tSinRegistro = MED.textoBanda({ banda: { valor: 0.15, fuente: '', verificable: false }, metrologia: undefined })
const tCeiba = MED.textoBanda(MED.pedirMedicionOficial('ceiba'))
comprobar(!/0,0 °API/.test(tApiNulo) && /sin análisis de °API/.test(tApiNulo) && /sin verificar/.test(tApiNulo) && /registro de metrología/.test(tSinRegistro) && /crudo de 19,4 °API/.test(tCeiba),
  `°API ausente de punta a punta: «${tApiNulo}»; con análisis, «${tCeiba}»`)

// El factor de asignación con la coma del país: con toFixed, «1.008» se leía mil ocho.
comprobar(F.n3(1.008) === '1,008' && F.n3(0.969) === '0,969' && F.n3(1) === '1,000', 'el factor de asignación sale con coma decimal y tres cifras (1,008; 0,969; 1,000)')
}

console.log('\n=== 13. Componentes, accesibilidad y contraste (auditoría S5) ===')
{
const { readFileSync, existsSync } = await import('node:fs')
const raiz = RAIZ
const { createElement: h } = await import('react')
const { renderToStaticMarkup } = await import('react-dom/server')
const ST = await v.ssrLoadModule('/src/app/store.ts')
const API = await v.ssrLoadModule('/src/shared/api/diferidos.ts')
const SES2 = await v.ssrLoadModule('/src/shared/api/sesion.ts')
const est = () => ({ ...ST.useApp.getState(), ...SES2.sesion() })

// Contraste de los tokens (WCAG 2.2): se leen del CSS, en los dos temas.
const css = readFileSync(`${raiz}src/index.css`, 'utf8')
const bloque = sel => { const i = css.indexOf(`${sel}{`); return css.slice(i, css.indexOf('}', i)) }
const tokens = b => Object.fromEntries([...b.matchAll(/--([\w-]+):(#[0-9a-fA-F]{6})\b/g)].map(m => [m[1], m[2]]))
const lum = x => { const c = [1, 3, 5].map(i => parseInt(x.slice(i, i + 2), 16) / 255).map(q => q <= 0.03928 ? q / 12.92 : ((q + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] }
const razon = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
const temas = { claro: tokens(bloque(':root')), oscuro: tokens(bloque(':root[data-theme="dark"]')) }
const FONDOS = ['suelo', 'superficie', 'panel', 'panel2', 'elevado']
const textoMalo = [], formaMala = [], chipMalo = []
for (const [t, k] of Object.entries(temas)) {
  for (const tx of ['tinta', 'tinta2', 'tinta3']) for (const f of FONDOS) if (razon(k[tx], k[f]) < 4.5) textoMalo.push(`${t} ${tx}/${f} ${razon(k[tx], k[f]).toFixed(2)}`)
  // Las formas de estado van sobre los paneles y la superficie (no sobre el suelo).
  // C1 · Identidad (25-oct): la paleta de X2 §4 — rojo solo el interlock, naranja la
  // alarma (1), amarillo con trazo la atención (2) y el aviso (3), morado «no le crea».
  for (const fo of ['interlock', 'p1', 'sincom']) for (const f of ['superficie', 'panel', 'panel2', 'elevado']) if (razon(k[fo], k[f]) < 3) formaMala.push(`${t} ${fo}/${f} ${razon(k[fo], k[f]).toFixed(2)}`)
  for (const s of ['interlock', 'p1', 'p2', 'p3', 'sincom']) if (razon(k.tinta, k[`${s}-f`]) < 4.5) chipMalo.push(`${t} tinta/${s}-f`)
  // El número dentro de la forma, contra el color de la forma (3:1, es parte del gráfico).
  if (razon(k['marca-num'], k.p1) < 3) formaMala.push(`${t} número/p1 ${razon(k['marca-num'], k.p1).toFixed(2)}`)
  // El amarillo (atención y aviso) lleva trazo y número oscuros: los dos dan 3:1 contra el amarillo.
  for (const s of ['p2', 'p3']) if (razon(k['marca-trazo'], k[s]) < 3) formaMala.push(`${t} trazo/${s} ${razon(k['marca-trazo'], k[s]).toFixed(2)}`)
  // Ningún estado es azul (X2 §4.1): el --p4 de antes ya no existe.
  if ('p4' in k) formaMala.push(`${t} --p4 sigue definido`)
}
comprobar(textoMalo.length === 0, `todo texto en tinta, tinta2 y tinta3 da 4,5:1 sobre los cinco fondos, en claro y en oscuro${textoMalo.length ? ': ' + textoMalo.join('; ') : ''}`)
comprobar(formaMala.length === 0, `el interlock, la alarma y «sin comunicación» dan 3:1 sobre los paneles, el número de adentro se lee, el amarillo lleva trazo que se ve y ningún estado es azul${formaMala.length ? ': ' + formaMala.join('; ') : ''}`)
comprobar(chipMalo.length === 0 && razon(temas.claro.p2, temas.claro.panel) < 3 && razon(temas.claro.p3, temas.claro.panel) < 3 && temas.claro.p1 !== temas.claro.interlock,
  'el texto de las etiquetas de estado va en tinta sobre su fondo; el triángulo y el cuadrado amarillos (menos de 3:1 contra el panel) llevan trazo oscuro, y la alarma no es el rojo del interlock')

// Las marcas: el cuadrado P3 lleva trazo; la etiqueta no repite la prioridad al lector.
const PR = await v.ssrLoadModule('/src/shared/ui/Prioridad.tsx'), PRIM = await v.ssrLoadModule('/src/shared/ui/primitivas.tsx')
const m3 = renderToStaticMarkup(h(PR.MarcaPrioridad, { s: 3 })), chip1 = renderToStaticMarkup(h(PRIM.Severidad_, { s: 1 }))
comprobar(/stroke="var\(--marca-trazo\)"/.test(m3) && /aria-label="Prioridad 3/.test(m3) && /aria-hidden="true"/.test(chip1) && !/text-\[var\(--p1\)\]/.test(chip1) && chip1.includes('P1 · alarma'),
  // F1 (D-3): la etiqueta en frase, no en MAYÚSCULAS.
  'MarcaPrioridad 3 lleva trazo y nombre; la etiqueta «P1 · alarma» pinta la forma sin anunciarla dos veces y el texto no va en rojo')

// Tip: alcanzable con teclado y con nombre dentro de un dibujo.
const TIP = await v.ssrLoadModule('/src/shared/ui/Tip.tsx')
const g = renderToStaticMarkup(h('svg', null, h(TIP.Tip, { as: 'g', titulo: '2 oct', filas: [['Real', '11.059 bbl']] }, h('rect'))))
const gb = renderToStaticMarkup(h('svg', null, h(TIP.Tip, { as: 'g', titulo: 'Septiembre', filas: [['Total', '1.234 bbl']], pista: 'Clic para ver este mes', onClick: () => {} }, h('rect'))))
const div = renderToStaticMarkup(h(TIP.Tip, { titulo: 'Rango', filas: [['Margen', '±5 %']] }, 'texto'))
comprobar(/role="img"/.test(g) && /aria-label="2 oct; Real: 11.059 bbl"/.test(g) && /tabindex="0"/.test(g) && /role="button"/.test(gb) && /Clic para ver este mes/.test(gb) && /tabindex="0"/.test(div),
  'un Tip recibe el foco aunque no tenga acción; en un dibujo es imagen (o botón, si hace algo) con el título y las cifras como nombre')
// …salvo que todo lo suyo ya esté a la vista (una tubería de Planta): sin acción no es parada de Tab, con acción sí.
const vista = renderToStaticMarkup(h('svg', null, h(TIP.Tip, { as: 'g', aLaVista: true, titulo: 'Agua · P-201B → pozos', filas: [['Caudal ahora', '9.000 bbl/d']] }, h('path'))))
const vistaClic = renderToStaticMarkup(h('svg', null, h(TIP.Tip, { as: 'g', aLaVista: true, titulo: 'x', filas: [], onClick: () => {} }, h('path'))))
comprobar(!/tabindex/.test(vista) && /role="img"/.test(vista) && /aria-label="Agua · P-201B → pozos; Caudal ahora: 9.000 bbl\/d"/.test(vista) && /tabindex="0"/.test(vistaClic),
  'un Tip con todo a la vista y sin acción no recibe el foco (el lector lo sigue leyendo por su nombre); si hace algo, sí')

// El papel promete a quien lo recibe lo que el contrato le da sin sesión: la
// verificación pública (coincide y fecha), no las cifras del registro completo.
const MEM = await v.ssrLoadModule('/src/widgets/informe/Membrete.tsx')
const pie = renderToStaticMarkup(h(MEM.PieDelInforme, { inf: { folio: 'INF-2026-0001', fecha: '2026-10-02T14:00:00-05:00', por: 'Prueba', version: 1, estado: 'publicable', cifras: {}, huella: '0'.repeat(64),
  formato: 'pdf', titulo: 'x', alcance: 'x', periodo: 'x', campos: ['ceiba'], desde: '2026-09-01T00:00:00-05:00', hasta: '2026-10-01T00:00:00-05:00' } }))
comprobar(/verificación pública recibe el folio y esta huella y responde solo si coinciden/.test(pie) && /no devuelve cifras/.test(pie) && !/devuelve las cifras registradas/.test(pie),
  'el pie del informe remite a la verificación pública del folio (coincide y fecha), no promete las cifras del registro, que piden sesión')

// El riel en portafolio: la peor prioridad de los campos, no la del último escogido.
const PRL = await v.ssrLoadModule('/src/shared/lib/prioridad.ts')
comprobar(PRL.peorSeveridad([0, 3, 1, 2]) === 1 && PRL.peorSeveridad([0, 3, 2]) === 2 && PRL.peorSeveridad([0, 0]) === 0 && PRL.peorSeveridad([]) === 0,
  'la marca del portafolio es la prioridad más urgente de sus campos (1 > 2 > 3 > normal)')

// El detalle de un pozo usa la regla de la lista: un pozo que cerró la bomba es gris.
// F3 (26-oct, H3 y H17): la regla ya no es de la pantalla (`sevPozo` se fue): la lista de Pozos, la de
// Electrosumergibles y la ficha del pozo leen la misma condición, la de la franja (`useCondiciones`). Se prueba
// lo mismo de antes contra esa regla: los que cerró la bomba van sin marca (gris) y con marcha «cerrado por otro»,
// y cada pozo con marca la tiene porque su estado o su fila de Riesgo la piden (no la inventa nadie).
const POZ = await v.ssrLoadModule('/src/widgets/pozos/estado.ts'), EV = await v.ssrLoadModule('/src/entities/equipo-vivo.ts')
const FRPZ = await v.ssrLoadModule('/src/entities/condiciones.ts'), DFPZ = await v.ssrLoadModule('/src/entities/diferido.ts')
const filas = API.pedirPozos('ceiba', new Date(L.calendario().at(-1).desde), R.AHORA, ctx0)
const marcaPozo = new Map(FRPZ.franja(['ceiba'], ctx0).equipos.map(e => [e.equipo, e.condicion]))
const riesgoPozo = DFPZ.riesgoAhora(['ceiba'], ctx0)
const porBomba = filas.filter(fp => POZ.cerradoPorOtro(fp))
const distintos = filas.filter(fp => marcaPozo.has(fp.pozo.id) !== ((EV.equipoVivo(fp.pozo.id, 'ceiba', ctx0)?.severidad ?? 0) > 0 || riesgoPozo.some(r => r.equipo === fp.pozo.id && r.prioridad > 0))).map(fp => fp.pozo.id)
comprobar(typeof POZ.useCondiciones === 'function' && !('sevPozo' in POZ)
    && porBomba.length > 0 && porBomba.every(fp => !marcaPozo.has(fp.pozo.id) && EV.equipoVivo(fp.pozo.id, 'ceiba', ctx0)?.marcha === 'cerrado-por-otro') && distintos.length === 0,
  `${porBomba.length} pozos de La Ceiba que cerró la bomba: gris en la lista y en el detalle (sin marca en la franja), con marcha «cerrado por otro»; la ficha y la lista dan la misma marca, la de la franja, a los ${filas.length}${distintos.length ? ` (difieren ${distintos.join(', ')})` : ''}`)

// Estados por código, no por frase.
const P201 = EV.equipoVivo('P-201B', 'ceiba', ctx0), P201m = EV.equipoVivo('P-201B', 'morichal', ctx0)
const sinInstancia = TODOS.flatMap(c => Object.keys(EQ.EQUIPOS).map(id => EV.equipoVivo(id, c, ctx0))).filter(e => e && !e.instrumentado)
comprobar(P201?.marcha === 'detenido' && P201m?.marcha === 'en-marcha' && sinInstancia.length > 0 && sinInstancia.every(e => e.marcha === 'sin-lectura'),
  `cada equipo trae su marcha como código (P-201B de La Ceiba detenido, la de Morichal en marcha, ${sinInstancia.length} sin instancia «sin lectura»): el vigía y SAP no leen la frase del estado`)
const PUB = await v.ssrLoadModule('/src/widgets/diferidos/publicacion.ts')
const rc = D.rangoDePeriodo('curso'), lbCurso = L.libro(['ceiba'], rc.desde, rc.hasta, ctx0)
const reescrito = { ...lbCurso, motivos: lbCurso.motivos.map(m => ({ ...m, texto: `Otra redacción del servidor: ${m.codigo}` })) }
comprobar(lbCurso.motivos.length > 0 && lbCurso.motivos.every(m => m.codigo === 'en-curso') && PUB.publicacion(lbCurso).estado === 'provisional'
  && PUB.publicacion(reescrito).estado === 'provisional' && I.estadoDelLibro(reescrito) === 'provisional',
  'el mes en curso es provisional por el código de su motivo: si el servidor redacta distinto la frase, sigue provisional (pantalla e informe)')

// Una parada abierta que todavía no cierra pozos no «lo absorbió todo».
const BC = await v.ssrLoadModule('/src/widgets/bombas/comun.ts')
comprobar(BC.tanqueAbierto(8, 4) === 'el tanque todavía absorbe: faltan 4,0 h del colchón' && /ya pasó el colchón previsto/.test(BC.tanqueAbierto(3, 5)),
  `parada abierta sin pozos cerrados: «${BC.tanqueAbierto(8, 4)}»; si el colchón previsto ya pasó, se dice sin inventar cuándo cierra`)

// Usuarios: el id, el día y el estado los pone el servidor; reactivar devuelve al estado de antes.
est().setRol('ger')
const antesN = est().usuarios.length
// R3 (CAMBIOS-CONTRATO §3): un cuerpo de v1 con número y alertas se acepta, y el número y las alertas se ignoran.
const inv = (await est().invitarUsuario({ nombre: 'Lucía Prueba', correo: 'lucia.prueba@operadora.example', rolId: 'sup', campos: ['ceiba', 'morichal'], telefono: '+573001112233', alertas: true }, 'supervisora de prueba de La Ceiba y Morichal'))
const lucia = inv.ok ? est().usuarios.find(u => u.id === inv.id) : undefined
const hist = est().accesos.at(-1)
comprobar(inv.ok && est().usuarios.length === antesN + 1 && lucia?.estado === 'invitado' && lucia?.desde === '2026-10-02' && /^u\d+$/.test(lucia?.id ?? '')
  && hist.cambios.some(c => c.startsWith('campos: ')) && !('telefono' in lucia) && !('alertas' in lucia) && hist.cambios.length === 2,
  `invitar: el servidor pone el id (${lucia?.id}), el día del reloj y «invitado»; el historial dice con qué campos (${hist?.cambios.join(' · ')}); el número y las alertas de un cuerpo de v1 se ignoran sin 422 (R3)`)
const sus = lucia && (await est().guardarUsuario({ ...lucia, estado: 'suspendido' }, 'prueba de suspensión antes de entrar'))
const suspendida = est().usuarios.find(u => u.id === lucia?.id)
const rea = suspendida && (await est().guardarUsuario({ ...suspendida, estado: 'activo' }, 'prueba de reactivación'))
comprobar(!!sus?.ok && suspendida?.estado === 'suspendido' && !!rea?.ok && est().usuarios.find(u => u.id === lucia?.id)?.estado === 'invitado',
  'suspender a quien nunca entró y quitarle la suspensión la devuelve a «invitado», no a «activo»')
const fantasma = (await est().guardarUsuario({ ...lucia, id: 'u999' }, 'cambio de alguien que no existe'))
const malCorreo = U.revisarAcceso(est().usuarios, { ...lucia, id: 'nuevo', correo: 'x@' }, est().usuarios.find(u => u.rolId === 'ger').id, '')
comprobar(!fantasma.ok && fantasma.errores[0].campo === 'general' && malCorreo.some(e => e.campo === 'correo') && malCorreo.some(e => e.campo === 'motivo'),
  'un PATCH a una persona que no existe se rechaza (invitar es otra llamada) y cada error dice de qué caja es (correo, motivo)')

// La respuesta lleva el id de quien respondió: se compara por id, no por el nombre.
const resp = est().ctx.respuestas[EV3], operU = U.personaDelRol(est().usuarios, 'oper')
comprobar(resp && resp.porId === operU?.id, `la respuesta guarda el id de quien respondió (${resp?.porId}) además de «${resp?.por}»`)

// Aviso a SAP: el error de la descripción dice de qué caja es.
est().setRol('sup')
const avisoCorto = (await est().enviarAviso({ tipo: 'M1', campoId: 'ceiba', equipo: 'P-201B', descripcion: 'corto', prioridad: 3, parada: false, evidencia: [] }))
comprobar(!avisoCorto.ok && avisoCorto.campo === 'descripcion', 'un aviso a SAP con una descripción corta se rechaza y dice que el error es de «Qué pasa»')

// Fuentes: WOFF2 sin la cara Light, y cada archivo declarado existe. B1 (experiencia v3, decisión 5):
// IBM Plex (OFL) en lugar de Air: Plex Sans en 4 pesos con sus cortes oficiales Latin1 y Pi, la
// Condensed en 3 y la Mono en 2 (13 caras); el resto lo mide scripts/verificar-kit.mjs.
const caras = [...css.matchAll(/url\(\/fonts\/([^)]+)\)/g)].map(m => m[1])
comprobar(caras.length === 13 && caras.every(c => c.startsWith('IBMPlex') && c.endsWith('.woff2') && existsSync(`${raiz}public/fonts/${c}`)) && !/Light[-.]|font-weight:300/.test(css)
  && readFileSync(`${raiz}index.html`, 'utf8').match(/rel="preload"[^>]+\.woff2/g)?.length === 3,
  `las 13 caras de IBM Plex van en WOFF2 y existen (${caras.length}); la Light no se declara; se precargan las 3 de arriba`)
}

console.log('\n=== 14. Simulador del registro: peticiones malas, ingesta y semilla (auditoría S6) ===')
{
// Una base desechable: la verificación no toca simulador-api/datos/trim.db.
const { mkdtempSync, rmSync, readFileSync } = await import('node:fs')
const { tmpdir } = await import('node:os')
const { join } = await import('node:path')
const { createServer: servidorHttp } = await import('node:http')
const { execFileSync } = await import('node:child_process')
const { DatabaseSync } = await import('node:sqlite')
const tmp = mkdtempSync(join(tmpdir(), 'trim-verif-'))
const rutaDb = join(tmp, 'trim.db')
process.env.TRIM_DB = rutaDb
const SIM = await import(new URL('../simulador-api/api.mjs', import.meta.url).href)
const BASE = await import(new URL('../simulador-api/base.mjs', import.meta.url).href)
SIM.arrancar()
const srv = servidorHttp((req, res) => { SIM.manejar(req, res).then(h => { if (!h) { res.writeHead(404); res.end() } }) })
await new Promise(ok => srv.listen(0, '127.0.0.1', ok))
const url = `http://127.0.0.1:${srv.address().port}`
const CAP = { 'x-capacidades': 'conector:configurar' }
const pedir = async (ruta, init = {}) => { const r = await fetch(url + ruta, init); return { estado: r.status, cuerpo: await r.json() } }
const postear = (ruta, cuerpo) => pedir(ruta, { method: 'POST', headers: { ...CAP, 'content-type': 'application/json' }, body: typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo) })

const malas = [
  await postear('/api/campos/ceiba/tags/XI-1017/equipo', '{mal'),
  await postear('/api/campos/ceiba/tags/XI-1017/equipo', 'null'),
  await pedir('/api/campos/%E0%A4%A/inventario'),
  await postear('/api/inscripcion', 'null'),
  await postear('/api/ingesta/nacimiento', '[1]'),
]
const sigue = await pedir('/api/salud')
comprobar(malas.every(r => r.estado === 400 && typeof r.cuerpo.error?.codigo === 'string' && typeof r.cuerpo.error.mensaje === 'string') && sigue.estado === 200,
  `un JSON roto, un cuerpo null, un % mal formado o un cuerpo que no es objeto dan 400 con el error del contrato ({ error: { codigo, mensaje } }), y el servidor sigue vivo (${malas.map(r => r.estado).join(', ')})`)

// Cada tag que el catálogo tiene conectado en cada campo está en el registro, con su equipo.
let sinRegistro = [], calculoMal = []
for (const [campoId, cfg] of Object.entries(PT.CAMPO_PLANTA)) {
  const ids = new Set([...cfg.tronco, ...cfg.gas, ...cfg.crudo, ...cfg.agua, ...cfg.servicios].flatMap(e => [e.equipo, ...(e.miembros ?? []).map(m => m.equipo)]).filter(Boolean))
  for (const id of ids) {
    const eq = EQ.equipoEnCampo(id, campoId)
    if (!eq?.instrumentado) continue
    for (const d of eq.dispositivos) {
      const r = await pedir(`/api/campos/${campoId}/tags/${encodeURIComponent(d.tag)}/procedencia`)
      if (r.estado !== 200 || r.cuerpo.instrumento.equipo !== id) sinRegistro.push(`${campoId}:${d.tag}`)
      // La fórmula va solo en el tag que ES un cálculo; lo que mide un instrumento no se «calcula».
      else if (!!r.cuerpo.calculo !== d.origen.startsWith('calculado')) calculoMal.push(`${campoId}:${d.tag}`)
    }
  }
}
comprobar(sinRegistro.length === 0, `cada tag conectado de cada campo tiene su nacimiento en la semilla y su equipo${sinRegistro.length ? ` (faltan ${sinRegistro.slice(0, 6).join(', ')})` : ''}`)
comprobar(calculoMal.length === 0 && (await pedir('/api/campos/ceiba/tags/JI-2011/procedencia')).estado === 404,
  `la fórmula sale solo en el tag calculado, no en la corriente o la temperatura de una bomba, y la energía por barril ya no está${calculoMal.length ? ` (${calculoMal.slice(0, 4).join(', ')})` : ''}`)

const nac = (campo, gw, dispositivos) => ({ campo, gateway: { id: gw, modelo: 'GRV-EPIC-PR1', serie: 'S', firmware: '3.6.2', enlace: 'starlink', bufferH: 48 }, dispositivos })
const metrica = (nombre, limite = '< 5', alto = 5) => ({ nombre, tipo: 'Prueba', unidad: '%', limite, bajo: null, alto, cadenciaS: 5, clase: 'continua' })
const limiteDe = async (campo, tag) => (await pedir(`/api/campos/${campo}/tags/${tag}/procedencia`)).cuerpo.instrumento?.limite?.texto

// Una sola fuente para el límite de cada tag (limites.ts · CONTRATO.md «Límite de cada tag»):
// la banda que el registro del simulador cita en la procedencia es la del límite del tag en
// cada tag de cada campo; el vigía proyecta contra la alarma de ese mismo registro, y VI-2011
// dice 3,9 en los tres lugares (antes el simulador decía 4,5).
const LIM = await v.ssrLoadModule('/src/entities/limites.ts')
const VGl = await v.ssrLoadModule('/src/entities/vigia.ts')
const sinNulo = x => (Number.isFinite(x) ? x : null)
const desacuerdos = []
for (const n of JSON.parse(readFileSync(new URL('../simulador-api/datos/nacimientos.json', import.meta.url), 'utf8')).filter(n => n.gateway.id.endsWith('-01')))
  for (const m of n.dispositivos.flatMap(d => d.metricas)) {
    const l = LIM.limiteDe(n.campo, m.nombre)
    if (!l || (m.limite ?? '—') !== l.texto || m.bajo !== sinNulo(l.normal?.[0] ?? null) || m.alto !== sinNulo(l.normal?.[1] ?? null)) desacuerdos.push(`${n.campo}:${m.nombre} (${m.limite} contra ${l?.texto})`)
  }
const senalesBomba = TODOS.flatMap(c => ['P-201B', 'MPP-301'].map(e => BO.perfilBomba(e, c)).filter(Boolean).flatMap(p => VGl.senalesDe(p).map(s => ({ c: p.campoId, s }))))
const ajenas = senalesBomba.filter(({ c, s }) => s.alarma !== LIM.limiteDe(c, s.tag)?.alarma || JSON.stringify(s.normal) !== JSON.stringify(LIM.limiteDe(c, s.tag)?.normal))
const vi = LIM.limiteDe('ceiba', 'VI-2011'), viProc = (await pedir('/api/campos/ceiba/tags/VI-2011/procedencia')).cuerpo.instrumento?.limite
comprobar(desacuerdos.length === 0 && senalesBomba.length > 20 && ajenas.length === 0 && !('alarmas' in BO.perfilBomba('P-201B', 'ceiba'))
  && vi.alarma.alta === 3.9 && vi.normal[1] === 3.9 && viProc?.alto === 3.9 && viProc?.texto === vi.texto && /ISA-18\.2/.test(vi.firma.alarma) && /DBIRTH/.test(vi.firma.normal),
  `el límite de cada tag sale de una sola fuente: la procedencia del simulador cita la misma banda en todos los tags (${desacuerdos.slice(0, 3).join('; ') || 'ninguno distinto'}), las ${senalesBomba.length} señales de bombas toman banda y alarma de ella (${ajenas.length} no) y VI-2011 dice < 3,9 con alarma 3,9 (API 610), cada número con quién lo firma`)

// Nacimiento a medias: dice qué falta y no deja nada escrito.
const roto = await postear('/api/ingesta/nacimiento', nac('ceiba', 'GW-PRUEBA', [
  { nombre: 'P-201B', fuente: { protocolo: 'opc-ua', reloj: 'el PLC' }, metricas: [metrica('ZZ-1')] },
  { nombre: 'P-201B', fuente: { protocolo: 'modbus-tcp' }, metricas: [metrica('ZZ-2')] }]))
comprobar(roto.estado === 400 && roto.cuerpo.error.mensaje.includes('dispositivos[1].fuente.reloj') && (await pedir('/api/campos/ceiba/tags/ZZ-1/procedencia')).estado === 404
  && !(await pedir('/api/campos/ceiba/inventario')).cuerpo.gateways.some(g => g.id === 'GW-PRUEBA'),
  'un nacimiento mal formado dice qué campo falta (dispositivos[1].fuente.reloj) y no deja nada escrito: ni el gateway ni el primer tag')

// Un gateway de Morichal no se apropia de los tags de La Ceiba.
const limAntes = await limiteDe('ceiba', 'LT-2012')
const ajenoCampo = await postear('/api/ingesta/nacimiento', nac('ceiba', 'EPIC-MORICHAL-02', [{ nombre: 'P-201B', fuente: { protocolo: 'opc-ua', reloj: 'el PLC' }, metricas: [metrica('LT-2012', '< 999', 999)] }]))
const ajenoTag = await postear('/api/ingesta/nacimiento', nac('ceiba', 'GW-INTRUSO', [{ nombre: 'P-201B', fuente: { protocolo: 'opc-ua', reloj: 'el PLC' }, metricas: [metrica('LT-2012', '< 999', 999)] }]))
const proc = (await pedir('/api/campos/ceiba/tags/LT-2012/procedencia', { headers: CAP })).cuerpo
const rechazos = BASE.base().prepare('select count(*) as n from rechazo').get().n
comprobar(ajenoCampo.estado === 403 && ajenoTag.estado === 409 && proc.instrumento.limite.texto === limAntes && proc.tecnico.gateway.id === 'EPIC-CEIBA-01' && rechazos === 2
  && !(await pedir('/api/campos/ceiba/inventario')).cuerpo.gateways.some(g => g.id === 'GW-INTRUSO'),
  `un gateway de otro campo (403) o uno nuevo que declara un tag ajeno (409) no le cambia límite ni fuente al tag de custodia, y los dos rechazos quedan registrados (${ajenoCampo.estado}, ${ajenoTag.estado})`)

// Re-nacimiento: el mapeo que hizo una persona sigue, y lo que cambió queda en el historial.
const skid = JSON.parse(readFileSync(new URL('../simulador-api/datos/nacimientos.json', import.meta.url), 'utf8')).find(n => n.gateway.id === 'EPIC-CEIBA-02')
const tagSkid = skid.dispositivos[0].metricas[0].nombre
const asociado = await postear(`/api/campos/ceiba/tags/${tagSkid}/equipo`, { equipo: 'V-101', origen: 'manual' })
const otraVez = structuredClone(skid); otraVez.dispositivos[0].metricas[0].limite = '30 – 70'
const renac = await postear('/api/ingesta/nacimiento', otraVez)
const trasRenacer = (await pedir(`/api/campos/ceiba/tags/${tagSkid}/procedencia`)).cuerpo.instrumento
const hist = BASE.base().prepare('select limite_texto from historial_tag where tag_id = ?').all(`ceiba:${tagSkid}`)
comprobar(asociado.estado === 200 && renac.estado === 200 && trasRenacer.mapeo === 'manual' && trasRenacer.equipo === 'V-101'
  && trasRenacer.limite.texto === '30 – 70' && hist.length === 1 && hist[0].limite_texto === skid.dispositivos[0].metricas[0].limite,
  `una reconexión del borde (nuevo NBIRTH) no deshace la asociación manual de ${tagSkid}, y el límite que cambió deja el anterior en el historial`)

// Un campo sin borde todavía: 0 por asociar, no null. Un campo que no existe: 404.
BASE.base().prepare("insert into campo (id, nombre) values ('nuevo', 'Campo nuevo')").run()
const invNuevo = await pedir('/api/campos/nuevo/inventario')
comprobar(invNuevo.estado === 200 && invNuevo.cuerpo.tags.total === 0 && invNuevo.cuerpo.tags.pendientes === 0 && (await pedir('/api/campos/rubiales/inventario')).estado === 404
  && (await pedir('/api/campos/rubiales/tags/pendientes')).estado === 404,
  'el inventario de un campo sin tags da 0 por asociar (no null) y el de un campo que no existe da 404')
await new Promise(ok => srv.close(ok))

// La semilla cambió: el arranque reconstruye la base y lo dice, en vez de servir lo viejo.
const vieja = new DatabaseSync(rutaDb)
vieja.exec("update semilla set huella = 'otra'; update tag set limite_texto = 'VIEJO' where id = 'ceiba:LT-2012'")
vieja.close()
const salida = execFileSync(process.execPath, ['--no-warnings', '--input-type=module', '-e',
  `const { arrancar } = await import(${JSON.stringify(new URL('../simulador-api/api.mjs', import.meta.url).href)}); arrancar()`],
  { env: { ...process.env, TRIM_DB: rutaDb }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
const releida = new DatabaseSync(rutaDb)
const limite = releida.prepare("select limite_texto from tag where id = 'ceiba:LT-2012'").get()?.limite_texto
releida.close()
comprobar(limite === limAntes && /registro cargado desde la semilla/.test(salida),
  `con otra semilla u otro esquema la base se reconstruye al arrancar (LT-2012 vuelve a «${limite}»)`)
rmSync(tmp, { recursive: true, force: true })
delete process.env.TRIM_DB

// Las salidas de referencia (referencia/) son las que un backend en otro
// lenguaje compara por HTTP: si el motor cambió, se regeneran a propósito.
let refSalida = '', refBien = true
try { refSalida = execFileSync(process.execPath, [fileURLToPath(new URL('./referencia.mjs', import.meta.url)), 'comprobar'], { encoding: 'utf8' }) }
catch (e) { refBien = false; refSalida = String(e.stdout ?? e.message) }
comprobar(refBien, `las salidas de referencia de los endpoints calculados coinciden con el motor (${refSalida.trim().split('\n').at(-1)}${refBien ? '' : '; si el cambio es a propósito: npm run referencia'})`)
}

console.log('\n=== 14. Una sola entrada de datos, capas y cachés (auditoría S7a) ===')
{
const { readFileSync, readdirSync, statSync } = await import('node:fs')
const { join } = await import('node:path')
const { execFileSync } = await import('node:child_process')

// La costura se carga en Node sin navegador: antes importaba el estado de la
// aplicación, que registraba oyentes del navegador al cargarse, y no había cómo
// probarla ni compararla con un backend. Se corre en un proceso aparte para
// que no la ayuden los objetos del navegador que la sección 11 simuló aquí.
const hijo = `
const { createServer } = await import('vite')
const raiz = process.cwd() + '/'
const navegador = ['window', 'document', 'location', 'addEventListener', 'matchMedia', 'localStorage'].filter(k => k in globalThis)
const v = await createServer({ root: raiz, configFile: false, resolve: { alias: { '@': raiz + 'src' } }, server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'error' })
try {
  const ins = await v.ssrLoadModule('/src/entities/insumos.ts')
  const antes = ins.hayInsumos()
  ins.instalarInsumos((await v.ssrLoadModule('/src/entities/datos/index.ts')).INSUMOS_DEMO)
  const m = {}
  for (const n of ['diferidos', 'equipos', 'medicion', 'calendario', 'predicciones', 'sap', 'usuarios', 'sesion', 'informes', 'fuente'])
    m[n] = await v.ssrLoadModule('/src/shared/api/' + n + '.ts')
  const ctx = m.sesion.sesion().ctx, desde = new Date('2026-09-01T00:00:00-05:00'), hasta = new Date('2026-10-01T00:00:00-05:00')
  console.log(JSON.stringify({ navegador, antes, fuente: m.fuente.FUENTE,
    pozos: m.diferidos.pedirPozos('ceiba', desde, hasta, ctx).reduce((a, f) => a + f.diferido, 0),
    esp: m.diferidos.pedirFlotaEsp(['ceiba', 'morichal'], desde, hasta, ctx).length,
    bombas: m.equipos.pedirBombas(['ceiba', 'morichal', 'guacamayo'], desde, hasta, ctx).map(b => b.clave),
    libro: m.diferidos.pedirLibro({ campos: ['ceiba'], desde, hasta }, ctx).diferido }))
} finally { await v.close() }
`
let enNode, errorNode = ''
try { enNode = JSON.parse(execFileSync(process.execPath, ['--no-warnings', '--input-type=module', '-e', hijo], { cwd: RAIZ, encoding: 'utf8' }).trim().split('\n').at(-1)) }
catch (e) { errorNode = String(e.stderr ?? e.message).slice(0, 400) }
const sepS7 = { desde: new Date('2026-09-01T00:00:00-05:00'), hasta: new Date('2026-10-01T00:00:00-05:00') }
const API7 = await v.ssrLoadModule('/src/shared/api/diferidos.ts')
const EQ7 = await v.ssrLoadModule('/src/shared/api/equipos.ts')
const ctx7 = L.contextoInicial()
comprobar(!!enNode && enNode.navegador.length === 0 && enNode.antes === false && enNode.fuente === 'demo'
  && cerca(enNode.libro, L.libro(['ceiba'], sepS7.desde, sepS7.hasta, ctx7).diferido, 1e-9)
  && cerca(enNode.pozos, API7.pedirPozos('ceiba', sepS7.desde, sepS7.hasta, ctx7).reduce((a, f) => a + f.diferido, 0), 1e-9),
  `la costura (src/shared/api, 11 módulos) se carga y responde en Node sin navegador, con los insumos instalados a mano (${errorNode || `${enNode?.bombas.length} bombas, ${enNode?.esp} electrosumergibles`})`)

// Ninguna pantalla, widget ni el estado de la aplicación importa datos de
// demostración ni insumos; solo la costura los carga (fuente.ts), y con import dinámico.
const archivos = d => readdirSync(d).flatMap(n => { const r = join(d, n); return statSync(r).isDirectory() ? archivos(r) : /\.tsx?$/.test(n) ? [r] : [] })
const fuentes = archivos(join(RAIZ, 'src'))
const conDatos = fuentes.filter(f => !f.includes(`${join('entities', 'datos')}`) && /from '@\/entities\/datos|import\('@\/entities\/datos|from '\.\/datos\//.test(readFileSync(f, 'utf8')))
const dinamico = /import\('@\/entities\/datos'\)/.test(readFileSync(join(RAIZ, 'src/shared/api/fuente.ts'), 'utf8'))
comprobar(conDatos.length === 1 && conDatos[0].endsWith(join('shared', 'api', 'fuente.ts')) && dinamico,
  `los datos de demostración entran por un solo lugar, shared/api/fuente.ts, con import dinámico (${conDatos.map(f => f.slice(RAIZ.length)).join(', ')})`)
const deUi = fuentes.filter(f => /src\/(pages|widgets|app)\//.test(f) || /src\/App\.tsx$/.test(f))
const llamanMotor = deUi.filter(f => /\b(libro|serieMensual|riesgoAhora|estadoCampo|historialDeEquipo|eventosCargadosA|diferidoDeEquipo|equipoVivo|caudalesAhora|registroDePredicciones|fallasVistas|historiaSap|flotaDe|catalogoDe|perfilBomba|pozosDe|bandaDe|causasSugeridas|identidadSap|repuestosDe|registrarCifras)\(/.test(readFileSync(f, 'utf8').replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '')))
comprobar(llamanMotor.length === 0, `ninguna pantalla, widget ni el estado llama al motor para pedir datos (${llamanMotor.map(f => f.slice(RAIZ.length)).join(', ') || 'todo pasa por shared/api'})`)
const capas = fuentes.filter(f => /src\/(shared|entities)\//.test(f) && /from '@\/(app|pages|widgets)\//.test(readFileSync(f, 'utf8')))
comprobar(capas.length === 0, `shared/ y entities/ no importan de app/, pages/ ni widgets/ (${capas.map(f => f.slice(RAIZ.length)).join(', ') || 'ninguno'})`)

// Las vistas que se movieron a la costura dan los mismos números del libro.
const lbSep = L.libro(TODOS, sepS7.desde, sepS7.hasta, ctx7)
const delLibro = (c, e) => lbSep.porEquipo.find(x => x.campoId === c && x.equipo === e)?.bbl ?? 0
const bombas7 = EQ7.pedirBombas(TODOS, sepS7.desde, sepS7.hasta, ctx7)
comprobar(bombas7.length > 0 && bombas7.every(b => !b.perfil || cerca(b.periodo.bbl, delLibro(b.campo.id, b.eq.id), 1e-9)),
  `Bombas (GET /api/bombas): lo cargado a cada una en septiembre es lo del Pareto por equipo del libro (${bombas7.length} bombas)`)
const ficha = EQ7.pedirFichaEquipo('ceiba', 'P-201B', sepS7.desde, sepS7.hasta, ctx7)
const tsFicha = L.diferidoDeEquipo('ceiba', 'P-201B', sepS7.desde, sepS7.hasta, ctx7)
comprobar(!!ficha && cerca(ficha.periodo.bbl, delLibro('ceiba', 'P-201B'), 1e-9) && ficha.periodo.usd === L.valorDeTramos(tsFicha.tramos, ctx7)
  && ficha.hist === L.historialDeEquipo('ceiba', 'P-201B', ctx7) && EQ7.pedirFichaEquipo('ceiba', 'NO-EXISTE', sepS7.desde, sepS7.hasta, ctx7) === undefined,
  'la ficha ejecutiva (GET …/equipos/:equipo/ficha) da los barriles y el dinero del libro, la misma historia de fallas, y nada para un equipo que no está en el campo')
const flota = EQ7.pedirConfiabilidad(TODOS, ctx7)
comprobar(flota.length > 0 && flota.every(e => e.h === L.historialDeEquipo(e.campoId, e.equipo, ctx7)),
  `Confiabilidad (GET /api/confiabilidad): ${flota.length} equipos de alto impacto en un pedido, cada uno con la historia del libro`)
const esp7 = API7.pedirFlotaEsp(TODOS, sepS7.desde, sepS7.hasta, ctx7)
comprobar(esp7.length > 0 && esp7.every(x => x.historial === L.historialDeEquipo(x.fila.pozo.campoId, x.fila.pozo.id, ctx7) && x.fila.pozo.levantamiento === 'electrosumergible'),
  `Electrosumergibles (GET /api/electrosumergibles): ${esp7.length} pozos, solo con electrosumergible y con su historia del libro`)

// Cachés del motor: los mismos resultados que sin caché, y una sola cuenta por contexto.
const ctxFresco = { config: ctx7.config, respuestas: { ...ctx7.respuestas } }
comprobar(JSON.stringify(D.riesgoAhora(TODOS, ctx7)) === JSON.stringify(D.riesgoAhora(TODOS, ctxFresco))
  && JSON.stringify(D.riesgoAhora(['morichal', 'ceiba'], ctx7)) === JSON.stringify(D.riesgoAhora(['morichal', 'ceiba'], ctxFresco)),
  'el riesgo de varios campos, armado con lo guardado de cada campo, es el mismo que calculado de cero')
comprobar(D.estadoCampo('ceiba', ctx7) === D.estadoCampo('ceiba', ctx7) && JSON.stringify(D.estadoCampo('ceiba', ctx7)) === JSON.stringify(D.estadoCampo('ceiba', ctxFresco)),
  'el estado de un campo se calcula una vez por contexto (el riel, la cabecera y la pantalla lo comparten) y da lo mismo que de cero')
let malIndice = 0
for (const c of TODOS) {
  if (JSON.stringify(P.pozosDe(c)) !== JSON.stringify(P.todosLosPozos().filter(p => p.campoId === c))) malIndice++
  for (const p of P.pozosDe(c)) {
    if (JSON.stringify(P.eventosDePozo(c, p.id)) !== JSON.stringify(P.eventosPozos().filter(e => e.campoId === c && e.pozo === p.id))) malIndice++
    if (P.pozoDe(c, p.id) !== p) malIndice++
    for (const t of [Date.parse('2025-10-15T00:00:00-05:00'), Date.parse('2026-06-01T00:00:00-05:00'), R.AHORA.getTime()]) {
      let u; for (const x of p.pruebas) if (new Date(x.fecha).getTime() <= t) u = x
      if (P.pruebaEn(p, t) !== (u ?? p.pruebas[0])) malIndice++
    }
  }
  for (const id of ['P-201B', 'MPP-301']) if (JSON.stringify(B.paradasDe(id, c)) !== JSON.stringify(B.eventosBomba().filter(e => e.equipo === id && e.campoId === c))) malIndice++
}
comprobar(malIndice === 0, 'los índices por campo, pozo y bomba dan lo mismo que recorrer los insumos enteros (pozos, eventos, prueba vigente y paradas)')
const banda1 = L.bandaDe('ceiba')
comprobar(banda1 === L.bandaDe('ceiba') && L.fiscalPromedio('ceiba') === (() => { const m = [...P.produccionDiaria()].reverse().find(x => x.campoId === 'ceiba' && x.publicado); const vs = m.dias.filter(v => typeof v === 'number'); return vs.reduce((a, b) => a + b, 0) / vs.length })(),
  'la banda de asignación se calcula una vez por campo y el promedio fiscal es el del último mes publicado, sin copiar la producción')

// Reglas del motor que no dependen del id ni del tag del demo: el tipo de causa
// de un servicio y el computador fiscal salen del registro del equipo.
const motorTxt = ['diferido.ts', 'equipo-vivo.ts', 'causa-senal.ts'].map(n => readFileSync(join(RAIZ, 'src/entities', n), 'utf8').replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '')).join('\n')
const literales = ['K-101', 'SE-2', 'C-401', 'LACT-01', 'V-101', 'H-302', 'TK-102', 'FQI-0101', 'P-201B', 'MPP-301', 'LSH-2013'].filter(id => motorTxt.includes(`'${id}'`))
const servicios = Object.values(EQ.EQUIPOS).filter(e => e.servicio)
comprobar(literales.length === 0 && servicios.length === 7,
  `las reglas del motor (causa, riesgo, equipo de hoy) no nombran equipos ni tags del demo (${literales.join(', ') || 'ninguno'}); el tipo de servicio va en el registro de ${servicios.length} equipos`)
const lact = EVV.equipoVivo('LACT-01', 'morichal', ctx7)
const serieFiscal = L.fiscalUltimosDias('morichal', 12)
comprobar(JSON.stringify(lact.dispositivos.find(d => d.tag === EQ.EQUIPOS['LACT-01'].fiscal).serie.valores) === JSON.stringify(serieFiscal),
  'el computador de flujo del punto oficial (marcado `fiscal` en el registro) lleva la serie del fiscal de cada día, la del libro')
const PLAN = await v.ssrLoadModule('/src/entities/planta.ts')
comprobar(!Object.hasOwn(PLAN.CAMPO_PLANTA, 'campo-nuevo') && /Object\.hasOwn\(planta, campoId\) \? planta\[campoId\] : undefined/.test(readFileSync(join(RAIZ, 'src/app/store.ts'), 'utf8')),
  'un campo sin esquema de planta registrado no recibe la planta de La Ceiba: usePlanta da undefined y la pantalla muestra el hueco')
}


console.log('\n=== 15. Costura asíncrona, contrato y escrituras (auditoría S7b) ===')
{
const { readFileSync, readdirSync } = await import('node:fs')
const { join } = await import('node:path')
// Las formas JSON de cada endpoint y la fuente http se prueban en
// scripts/verificar-contrato.mjs; aquí, lo que cambió del dominio y del demo.
const RG = await v.ssrLoadModule('/src/entities/reglas.ts')
const E = await v.ssrLoadModule('/src/shared/api/escrituras.ts')
const SES3 = await v.ssrLoadModule('/src/shared/api/sesion.ts')
const API = await v.ssrLoadModule('/src/shared/api/diferidos.ts')
const EQS = await v.ssrLoadModule('/src/shared/api/equipos.ts')
const CALS = await v.ssrLoadModule('/src/shared/api/calendario.ts')
const CON = await v.ssrLoadModule('/src/shared/api/consulta.ts')
const CTO = await v.ssrLoadModule('/src/shared/api/contrato.ts')

// Los umbrales de lo que entra a mano son UNO, en entities/reglas.ts: la
// pantalla, el servidor del demo y el contrato dicen lo mismo.
const s0 = SES3.sesion(), nVersiones = s0.versiones.length
const firmaOk = await E.firmarConfiguracion({ rolId: 'adm' }, { config: { ...s0.ctx.config, empresa: `${s0.ctx.config.empresa} ` + 'x' }, motivo: 'ok', base: s0.versiones.at(-1).version })
comprobar(RG.MOTIVO_MINIMO === 5 && RG.NOMBRE_MINIMO === 3 && RG.TEXTO_LIBRE_MINIMO === 8 && !firmaOk.ok && /Falta el motivo/.test(firmaOk.error) && SES3.sesion().versiones.length === nVersiones,
  `una firma con motivo «ok» se rechaza (motivo de ${RG.MOTIVO_MINIMO} o más) y no deja versión`)
const ger = U.personaDelRol(s0.usuarios, 'ger')
const nuevaP = { id: 'nuevo-x', nombre: 'Ana Prueba', correo: 'ana.prueba.reglas@operadora.example', rolId: 'sup', campos: ['ceiba'], estado: 'activo', desde: '2026-10-02', alertas: false }
const motivoCorto = U.revisarAcceso(s0.usuarios, nuevaP, ger.id, 'abcd').map(e => e.campo), motivoJusto = U.revisarAcceso(s0.usuarios, nuevaP, ger.id, 'abcde').map(e => e.campo)
const nombreCorto = U.revisarAcceso(s0.usuarios, { ...nuevaP, nombre: 'Al' }, ger.id, 'motivo suficiente').map(e => e.campo)
comprobar(motivoCorto.includes('motivo') && !motivoJusto.includes('motivo') && nombreCorto.includes('nombre'),
  'un cambio de acceso pide motivo de 5 o más y nombre de 3 o más, con los mismos umbrales')
const literales = ['src/app', 'src/pages', 'src/widgets', 'src/shared/api'].flatMap(d => readdirSync(join(RAIZ, d), { recursive: true }).filter(f => /\.tsx?$/.test(f))
  .filter(f => /\.trim\(\)\.length\s*[<>]=?\s*\d/.test(readFileSync(join(RAIZ, d, f), 'utf8'))).map(f => `${d}/${f}`))
comprobar(literales.length === 0, `ninguna pantalla, acción ni escritura escribe un umbral de texto a mano (${literales.join(', ') || 'todas usan entities/reglas.ts'})`)

// El esquema de planta se cambia por OPERACIÓN, con las reglas del servidor en el motor.
const PLA = await v.ssrLoadModule('/src/entities/planta.ts')
const cfgC = SES3.sesion().plantas.ceiba, grupoC = ['tronco', 'gas', 'crudo', 'agua', 'servicios'].flatMap(t => cfgC[t]).find(e => e.miembros?.length)
const yaC = grupoC.miembros[0]
const dupC = PLA.aplicarCambioPlanta(cfgC, { tipo: 'agregar-miembro', grupo: grupoC.id, miembro: { id: yaC.id, etiqueta: yaC.id } })
const sinC = PLA.aplicarCambioPlanta(cfgC, { tipo: 'quitar-elemento', tren: 'gas', id: 'NO-ESTA' })
const okC = PLA.aplicarCambioPlanta(cfgC, { tipo: 'agregar-miembro', grupo: grupoC.id, miembro: { id: 'LC-REGLA', etiqueta: 'LC-REGLA' } })
const tieneRegla = c => ['tronco', 'gas', 'crudo', 'agua', 'servicios'].some(t => c[t].some(e => e.miembros?.some(m => m.id === 'LC-REGLA')))
comprobar('error' in dupC && 'error' in sinC && !('error' in okC) && /agregó LC-REGLA/.test(okC.texto) && tieneRegla(okC.planta) && cfgC === SES3.sesion().plantas.ceiba && !tieneRegla(cfgC),
  'aplicarCambioPlanta rechaza un id repetido y un elemento que no está, y aplica el cambio sin tocar la planta de la sesión')

// La serie mensual va sin los tramos de cada mes, con las mismas cifras.
const serieApi = API.pedirSerie(TODOS, ctx0), serieMotor = L.serieMensual(TODOS, ctx0)
comprobar(serieApi.length === serieMotor.length && serieApi.every((m, i) => !('tramos' in m.libro) && !('porPozo' in m.libro) && !('preguntas' in m.libro) && !('custodia' in m.libro)
  && m.libro.diferido === serieMotor[i].libro.diferido && m.libro.real === serieMotor[i].libro.real && m.libro.meta.diferido === serieMotor[i].libro.meta.diferido && m.desde.getTime() === serieMotor[i].desde.getTime()),
  'la serie mensual de la costura trae las cifras de cada mes del libro, sin sus tramos, detalle por pozo, preguntas ni custodia')

// El estado de los campos va por lote, en el orden pedido: el riel y la cabecera hacen un pedido.
const lote = API.pedirEstadoCampos(['zarza', 'ceiba'], ctx0)
comprobar(lote.map(e => e.campoId).join() === 'zarza,ceiba' && lote[1] === API.pedirEstadoCampo('ceiba', ctx0),
  'GET /api/vistas/estado?campos= devuelve un estado por campo, en el orden pedido, el mismo de cada campo')

// El catálogo (GET /api/catalogo) es la única fuente de los datos fijos del campo.
comprobar(TODOS.every(c => EQS.pedirPerfilesBomba(c).map(p => p.equipo).join() === Object.keys(EQ.EQUIPOS).filter(BO.esBomba).filter(id => BO.perfilBomba(id, c)).join())
  && CALS.pedirCalendario().map(m => m.mes).join() === L.calendario().map(m => m.mes).join() && EQS.pedirCatalogoDeDanos('ceiba', 'P-201B')?.clase === CAT.catalogoDe('ceiba', 'P-201B')?.clase
  && EQS.pedirPerfilesBomba('campo-nuevo').length === 0,
  'el catálogo del campo (perfiles de bombas, calendario, catálogo de daños) dice lo mismo que el motor, y un campo sin registro no trae nada')

// La caché de consultas: la misma consulta con el mismo contexto es el mismo
// objeto (una vez para la cabecera, el riel y la pantalla); otro contexto, otra entrada.
const qS = { campos: ['ceiba'], desde: new Date('2026-09-01T00:00:00-05:00'), hasta: new Date('2026-10-01T00:00:00-05:00') }
const l1 = await API.traerLibro(qS, ctx0), l2 = await API.traerLibro(qS, ctx0), l3 = await API.traerLibro(qS, { ...ctx0 })
comprobar(l1 === l2 && l3 !== l1 && l3.diferido === l1.diferido && CON.versionDe(ctx0) === CON.versionDe(ctx0) && CON.versionDe({ ...ctx0 }) !== CON.versionDe(ctx0)
  && CTO.urlDe(CTO.DIFERIDOS, qS) === CTO.urlDe(CTO.DIFERIDOS, { hasta: qS.hasta, desde: qS.desde, campos: ['ceiba'] }),
  'la misma consulta con el mismo contexto sale de la caché (mismo objeto); un contexto nuevo es otra entrada; la clave no depende del orden de los parámetros')
}

console.log('\n=== 16. Las escrituras se limitan a los campos de la persona (auditoría S8, CONTRATO.md) ===')
{
const E = await v.ssrLoadModule('/src/shared/api/escrituras.ts')
const SES = await v.ssrLoadModule('/src/shared/api/sesion.ts')
const API = await v.ssrLoadModule('/src/shared/api/diferidos.ts')

// camposTocados: lo que el 403 por campo revisa al firmar la configuración.
const base = SES.sesion().ctx.config
const ult = base.campos.morichal.metas.at(-1)
const otraMeta = C.conTramo(base, 'morichal', { ...ult, desde: '2026-11-01', produccionBpd: ult.produccionBpd + 100 })
const tq = base.tanques.find(t => t.campoId === 'ceiba')
const tanqueMovido = { ...structuredClone(base), tanques: base.tanques.map(t => (t === tq ? { ...t, campoId: 'morichal' } : t)) }
comprobar(C.camposTocados(base, otraMeta).join() === 'morichal' && C.camposTocados(base, tanqueMovido).join() === 'ceiba,morichal'
  && C.camposTocados(base, { ...structuredClone(base), empresa: 'Otra empresa' }).length === 0 && C.camposTocados(base, structuredClone(base)).length === 0,
  'camposTocados: una meta toca su campo; un tanque que cambia de campo toca los dos; el membrete y una copia idéntica no tocan ninguno')

// Un gerente con solo La Ceiba no firma una meta de Morichal (403), y no queda versión.
const s0 = SES.sesion(), ger = U.personaDelRol(s0.usuarios, 'ger')
SES.cambiarSesion({ usuarios: s0.usuarios.map(u => (u.id === ger.id ? { ...u, campos: ['ceiba'] } : u)) })
const firmaAjena = await E.firmarConfiguracion({ rolId: 'ger' }, { config: otraMeta, motivo: 'meta de noviembre', base: s0.versiones.at(-1).version })
const sinVersion = SES.sesion().versiones.length === s0.versiones.length
SES.cambiarSesion({ usuarios: s0.usuarios })
comprobar(!firmaAjena.ok && /No tiene asignado Morichal/.test(firmaAjena.error) && sinVersion,
  'POST /api/configuracion: quien no tiene asignado un campo no firma lo de ese campo, aunque tenga la capacidad (403), y no queda versión')

// Responder: el campo sale del evento del PLC, no del cuerpo.
const ajena = API.pedirPreguntas(['morichal'], s0.ctx).find(p => p.pide && !s0.ctx.respuestas[p.id])
const disfrazada = ajena && await E.responderParada({ rolId: 'sup' }, { evento: ajena.id, campoId: 'ceiba', equipo: ajena.equipo, texto: 'Se encontró la línea de flujo rota' })
const directa = ajena && await E.responderParada({ rolId: 'sup' }, { evento: ajena.id, campoId: 'morichal', equipo: ajena.equipo, texto: 'Se encontró la línea de flujo rota' })
const inexistente = await E.responderParada({ rolId: 'sup' }, { evento: 'NO-EXISTE-1', campoId: 'ceiba', equipo: 'LC-14', texto: 'Se encontró la línea de flujo rota' })
comprobar(!!ajena && !disfrazada.ok && /no es de ese campo/.test(disfrazada.error) && !directa.ok && /no tiene asignado/.test(directa.error)
  && !inexistente.ok && /no está en el registro/.test(inexistente.error) && !SES.sesion().ctx.respuestas[ajena.id],
  'POST /api/paradas/:evento/respuesta: una parada de Morichal no la responde quien solo tiene La Ceiba, ni cambiando el campo del cuerpo; un evento que no existe no se responde')

// Analizar: el cuerpo no trae campo; sale del evento. Confiabilidad no tiene El Palmar ni La Zarza.
const evAjeno = B.eventosBomba().find(e => e.campoId === 'zarza' || e.campoId === 'palmar') ?? P.eventosPozos().find(e => e.campoId === 'zarza' || e.campoId === 'palmar')
const analisisAjeno = await E.completarAnalisis({ rolId: 'conf' }, { evento: evAjeno.id, mecanismo: '1.1', causaRaiz: '3' })
comprobar(!analisisAjeno.ok && /no tiene asignado/.test(analisisAjeno.error) && !Object.hasOwn(SES.sesion().analisis, evAjeno.id),
  `POST /api/analisis/:evento: confiabilidad no analiza una falla de ${evAjeno.campoId} (no la tiene asignada; el campo sale del evento ${evAjeno.id})`)
}

console.log('\n=== 17. Las fechas dicen lo mismo en todos los navegadores ===')
{
  // Safari escribía «3 de sep. de 2026» donde Chrome, Firefox y Node escriben
  // «3 de sept de 2026»: el mismo informe impreso desde dos navegadores decía
  // dos cosas. `formatoFecha` (shared/lib/fecha.ts) fija la abreviatura del mes.
  const { readFileSync, readdirSync, statSync } = await import('node:fs')
  const FE = await v.ssrLoadModule('/src/shared/lib/fecha.ts')
  const OPCIONES = [
    { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Bogota' },
    { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Bogota' },
  ]
  const distintas = []
  for (const o of OPCIONES) for (let m = 0; m < 12; m++) {
    const d = new Date(Date.UTC(2026, m, 15, 17))
    const propia = FE.formatoFecha(o).format(d), servidor = new Intl.DateTimeFormat('es-CO', o).format(d)
    if (propia !== servidor) distintas.push(`«${propia}» ≠ «${servidor}»`)
  }
  comprobar(!distintas.length, `formatoFecha escribe los 12 meses como Node, que es el servidor${distintas.length ? ': ' + distintas.join(', ') : ''}`)

  // El motor de Safari no corre en Node: se le hace escribir el mes como Safari.
  const original = Intl.DateTimeFormat.prototype.formatToParts
  Intl.DateTimeFormat.prototype.formatToParts = function (d) {
    return original.call(this, d).map(x => x.type === 'month' ? { ...x, value: x.value === 'sept' ? 'sep.' : `${x.value}.` } : x)
  }
  let comoSafari, nodeComoSafari
  try {
    const opc = { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Bogota' }, d = new Date('2026-09-03T12:00:00-05:00')
    comoSafari = FE.formatoFecha(opc).format(d)
    nodeComoSafari = new Intl.DateTimeFormat('es-CO', opc).formatToParts(d).map(x => x.value).join('')
  } finally { Intl.DateTimeFormat.prototype.formatToParts = original }
  comprobar(nodeComoSafari === '3 de sep. de 2026' && comoSafari === '3 de sept de 2026',
    `con el mes como lo escribe Safari («${nodeComoSafari}»), formatoFecha da lo mismo que los demás: «${comoSafari}»`)

  // Que ninguna fecha con mes abreviado se escape de formatoFecha.
  const fuera = []
  const recorrer = dir => { for (const n of readdirSync(dir)) {
    const ruta = `${dir}/${n}`
    if (statSync(ruta).isDirectory()) { recorrer(ruta); continue }
    if (!/\.tsx?$/.test(n) || ruta.endsWith('shared/lib/fecha.ts')) continue
    readFileSync(ruta, 'utf8').split('\n').forEach((l, i) => {
      if ((/month: 'short'/.test(l) && !l.includes('formatoFecha(')) || /toLocaleDateString\(/.test(l)) fuera.push(`${ruta.slice(RAIZ.length)}:${i + 1}`)
    })
  } }
  recorrer(`${RAIZ}src`)
  comprobar(!fuera.length, `toda fecha con mes abreviado pasa por formatoFecha (y nadie usa toLocaleDateString)${fuera.length ? ': ' + fuera.join(', ') : ''}`)
}

console.log('\n=== 18. Corrección del motor (8-oct-2026): costo por falla, salud, causas ===')
{
  const API = await v.ssrLoadModule('/src/shared/api/diferidos.ts')
  const SA = await v.ssrLoadModule('/src/entities/salud.ts')
  const CO = await v.ssrLoadModule('/src/widgets/bombas/comun.ts')
  const rTodos = D.riesgoAhora(TODOS, ctx0)
  const fila = (c, e) => rTodos.find(r => r.campoId === c && r.equipo === e && r.estado === 'en-riesgo')
  const cerradasDe = (c, e, ctx = ctx0) => L.historialDeEquipo(c, e, ctx).eventos.filter(x => !x.disparo && x.fin).map(x => x.horas)
  const media = xs => xs.reduce((a, x) => a + x, 0) / xs.length

  // 1. Costo por falla = lo que cuesta si el equipo falla HOY (decisión del dueño, 8-oct): `costoFallaHoy`.
  //    `costoFalla` vuelve a su significado de v1 (C1, CAMBIOS-CONTRATO §4.1): al lado, nunca encima.
  //    Disposición con tanque: Q × promedio(max(0, d − colchón de hoy)) / 24.
  const rMo = fila('morichal', 'P-201B'), prMo = D.prediccion(B.perfilBomba('P-201B', 'morichal'), ctx0), dMo = cerradasDe('morichal', 'P-201B')
  const historicoMo = L.historialDeEquipo('morichal', 'P-201B', ctx0).bblPorFalla
  comprobar(!!rMo && Math.abs(rMo.costoFallaHoy - 1235) < 1 && cerca(rMo.costoFallaHoy, prMo.crudoBpd * media(dMo.map(d => Math.max(0, d - prMo.colchon.horas))) / 24, 1e-12)
    && rMo.colchonH === prMo.colchon.horas && rMo.costoDe === 'propio' && /^el promedio de sus 8 fallas cerradas, sin las 10 h que aguanta hoy el tanque$/.test(rMo.mdtFuente),
    `P-201B de Morichal: si falla hoy cuesta ≈ ${f(rMo?.costoFallaHoy ?? 0)} bbl = ${f(prMo.crudoBpd)} bbl/d × promedio(max(0, d − ${prMo.colchon.horas.toFixed(2)} h)) / 24 de sus ${dMo.length} fallas cerradas (lo histórico es otra cifra: ${f(historicoMo)}); colchonH ${rMo?.colchonH?.toFixed(2)} h`)
  //    Multifásica: Q × d̄ / 24, sin tanque.
  const rMpp = fila('morichal', 'MPP-301'), prMpp = D.prediccion(B.perfilBomba('MPP-301', 'morichal'), ctx0)
  comprobar(!!rMpp && Math.abs(rMpp.costoFallaHoy - 3244.5) < 0.5 && cerca(rMpp.costoFallaHoy, prMpp.crudoBpd * media(cerradasDe('morichal', 'MPP-301')) / 24, 1e-12)
    && rMpp.colchonH === undefined && rMpp.costoDe === 'propio' && rMpp.mdtFuente === 'el promedio de sus 7 fallas cerradas',
    `MPP-301 (multifásica, sin tanque): ≈ ${f(rMpp?.costoFallaHoy ?? 0)} bbl = crudo de hoy × horas fuera promedio / 24, y su texto ya no nombra un tanque que no tiene`)
  //    Electrosumergible: crudo del pozo hoy × d̄ / 24, propio o de la flota del campo; la misma cuenta en todas.
  const espR = rTodos.filter(r => r.tipo === 'electrosumergible' && r.estado === 'en-riesgo')
  const mdtEsp = (c, id) => {
    const propias = cerradasDe(c, id)
    if (propias.length) return { d: media(propias), de: 'propio' }
    const flota = P.pozosDe(c).filter(p => p.levantamiento === 'electrosumergible').flatMap(p => cerradasDe(c, p.id))
    return flota.length ? { d: media(flota), de: 'flota' } : undefined
  }
  comprobar(espR.length >= 4 && espR.every(r => { const m = mdtEsp(r.campoId, r.equipo); return m && cerca(r.costoFallaHoy, r.bblDia * m.d / 24, 1e-12) && r.costoDe === m.de && r.colchonH === undefined }),
    `las ${espR.length} electrosumergibles en riesgo: crudo del pozo hoy × horas fuera promedio / 24 (las suyas o, sin fallas, las de la flota del campo, marcado «flota»)`)
  //    El respaldo absorbe toda el agua (colchón infinito): 0, sin colchón ni historia que citar.
  const cfgInf = structuredClone(ctx0.config)
  cfgInf.respaldos.find(r => r.campoId === 'morichal' && r.equipo === 'P-201B').libreBpd = 1e6
  const rInf = D.riesgoAhora(['morichal'], { config: cfgInf, respuestas: {} }).find(r => r.equipo === 'P-201B' && r.estado === 'en-riesgo')
  comprobar(rInf?.costoFallaHoy === 0 && rInf.colchonH === undefined && rInf.costoDe === undefined && /absorbe toda el agua/.test(rInf.mdtFuente),
    `con un respaldo que toma toda el agua, P-201B de Morichal cuesta 0 bbl si falla («${rInf?.mdtFuente}»)`)
  //    Disposición sin colchón calculado (sin tanque firmado): Q × d̄ / 24, dicho como techo.
  const cfgSinTk = structuredClone(ctx0.config)
  cfgSinTk.tanques = cfgSinTk.tanques.filter(t => t.campoId !== 'morichal')
  const ctxSinTk = { config: cfgSinTk, respuestas: {} }
  const rSinTk = D.riesgoAhora(['morichal'], ctxSinTk).find(r => r.equipo === 'P-201B' && r.estado === 'en-riesgo')
  comprobar(!!rSinTk && cerca(rSinTk.costoFallaHoy, D.prediccion(B.perfilBomba('P-201B', 'morichal'), ctxSinTk).crudoBpd * media(dMo) / 24, 1e-12) && rSinTk.colchonH === undefined && /es un techo/.test(rSinTk.mdtFuente),
    `sin tanque firmado no hay colchón que descontar: P-201B de Morichal ≈ ${f(rSinTk?.costoFallaHoy ?? 0)} bbl, dicho como techo`)
  //    Recobro: no cierra pozos hoy, cuesta 0 dure lo que dure (el demo no la tiene en riesgo: la regla, con su predicción y su historia reales).
  const pGu = B.perfilBomba('P-201B', 'guacamayo'), cRec = D.costoDeBomba(pGu, D.prediccion(pGu, ctx0), L.historialDeEquipo('guacamayo', 'P-201B', ctx0))
  comprobar(pGu.papel === 'recobro' && cerradasDe('guacamayo', 'P-201B').length > 0 && cRec.costoFalla === 0 && cRec.costoDe === undefined && cRec.colchonH === undefined && /recobro/.test(cRec.mdtFuente),
    `la bomba de recobro de Guacamayo, con ${cerradasDe('guacamayo', 'P-201B').length} fallas cerradas, costaría 0 bbl si falla hoy («${cRec.mdtFuente}»)`)
  //    Lo que ya costó por falla sigue siendo otra cifra (la ficha y Confiabilidad: «le ha costado por falla»).
  comprobar(cerca(D.veredicto(B.perfilBomba('P-201B', 'morichal'), ctx0).porFalla, historicoMo) && Math.abs(historicoMo - 2765) < 1 && Math.abs(historicoMo - rMo.costoFallaHoy) > 1,
    `lo que P-201B de Morichal le ha costado por falla (histórico, ${f(historicoMo)} bbl) no cambia: es otra cifra que el costo si falla hoy`)
  //    C1 · al lado: `costoFalla` dice lo de v1 (cde8214): en una bomba, lo que ya costó por falla
  //    (`bblPorFalla`); en una electrosumergible, la misma cuenta de `costoFallaHoy`.
  comprobar(!!rMo && rMo.costoFalla === historicoMo && !!rMpp && rMpp.costoFalla === L.historialDeEquipo('morichal', 'MPP-301', ctx0).bblPorFalla
    && rInf?.costoFalla === historicoMo && espR.every(r => r.costoFalla === r.costoFallaHoy),
    `C1: Riesgo.costoFalla con su significado de v1 (P-201B de Morichal ${f(rMo?.costoFalla ?? 0)} bbl por falla, también con el respaldo que absorbe todo) y la cifra de hoy al lado en costoFallaHoy (${f(rMo?.costoFallaHoy ?? 0)} bbl)`)

  // 2. Una electrosumergible parada por sí misma sale «falló» en la parte de su causa (MN-41: aislamiento).
  const flotaEsp = API.pedirFlotaEsp(TODOS, sep.desde, sep.hasta, ctx0)
  const propia = x => !x.fila.produce && x.fila.causa?.tipo === 'electrosumergible' && x.fila.causa.equipo === x.fila.pozo.id
  const fallo = x => x.partes.filter(s => s.estado === 'fallo').map(s => s.parte.id).join()
  const mn41 = flotaEsp.find(x => x.fila.pozo.campoId === 'morichal' && x.fila.pozo.id === 'MN-41')
  const detMn41 = API.pedirPozo('morichal', 'MN-41', sep.desde, sep.hasta, ctx0)
  const filaMn41 = API.pedirPozos('morichal', sep.desde, sep.hasta, ctx0).find(x => x.pozo.id === 'MN-41')
  const ajenas = flotaEsp.filter(x => !x.fila.produce && !propia(x))
  comprobar(fallo(mn41) === 'aislamiento' && detMn41.partes[0].estado === 'fallo' && detMn41.partes[0].parte.id === 'aislamiento' && filaMn41.salud?.estado === 'fallo' && filaMn41.salud.prioridad === 1
    && flotaEsp.filter(propia).length >= 1 && flotaEsp.filter(propia).every(x => fallo(x) === x.fila.causa.parte)
    && ajenas.length > 0 && ajenas.every(x => fallo(x) === '') && flotaEsp.filter(x => x.fila.produce).every(x => fallo(x) === ''),
    `MN-41 (parada por falla a tierra desde el 25-sep) sale con su aislamiento «falló»; las ${flotaEsp.filter(propia).length} electrosumergibles paradas por sí mismas, con la parte de su causa; las ${ajenas.length} cerradas por otro equipo, ninguna`)

  // 4. El motivo dice las horas como la pantalla (fmtHoras): «10,9 d», no «262 h».
  const horasPrueba = [0.4, 3, 23.5, 47.4, 47.6, 48, 61, 124, 262, 2159, 2160, 2161, 5000]
  const distintasH = horasPrueba.filter(h => SA.textoHoras(h) !== CO.fmtHoras(h))
  const conHoras = rTodos.filter(r => /llega a su alarma en/.test(r.motivo))
  comprobar(!distintasH.length && conHoras.length >= 4 && conHoras.every(r => r.motivo.endsWith(`llega a su alarma en ${CO.fmtHoras(r.horas)}`))
    && fila('morichal', 'MN-27').motivo.endsWith('en 10,9 d') && fila('morichal', 'MPP-301').motivo.endsWith('en 5,2 d') && !conHoras.some(r => /\d{2,} h$/.test(r.motivo) && r.horas >= 48),
    `el motivo del riesgo escribe las horas con la regla de fmtHoras (${conHoras.map(r => `${r.equipo}: «${r.motivo.split(' en ').at(-1)}»`).join(', ')})${distintasH.length ? `; distintas en ${distintasH.join(', ')} h` : ''}`)

  // 5. Una parada vieja se mide con el tanque y el respaldo que regían cuando paró.
  const sepMedidas = B.eventosBomba().map(e => D.paradaMedida(e, ctx0, V0)).filter(m => m?.colchon && m.inicio >= sep.desde && m.inicio < sep.hasta)
  const m0 = sepMedidas[0]
  const cfgHoy = structuredClone(ctx0.config)
  cfgHoy.respaldos.find(r => r.campoId === m0.evento.campoId && r.equipo === m0.evento.equipo).libreBpd += 5000
  const ctxHoy = { config: cfgHoy, respuestas: {} }
  const vHoy = { ...V0[0], version: 2, fecha: R.AHORA.toISOString(), config: cfgHoy }
  const vAntes = { ...vHoy, fecha: new Date(m0.inicio.getTime() - 86_400_000).toISOString() }
  const mHoy = D.paradaMedida(m0.evento, ctxHoy, [V0[0], vHoy]), mAntes = D.paradaMedida(m0.evento, ctxHoy, [V0[0], vAntes])
  const apiHoy = API.pedirParadas(m0.evento.campoId, m0.evento.equipo, ctxHoy, [V0[0], vHoy]).find(x => x.evento.id === m0.evento.id)
  comprobar(mHoy.colchon.previsto.horas === m0.colchon.previsto.horas && apiHoy.colchon.previsto.horas === m0.colchon.previsto.horas
    && mHoy.colchon.previsto.aguaSinSalidaBpd === m0.colchon.previsto.aguaSinSalidaBpd && mAntes.colchon.previsto.horas !== m0.colchon.previsto.horas,
    `${m0.evento.id} (${m0.evento.equipo} de ${m0.evento.campoId}, septiembre): firmar hoy 5.000 bbl/d más de respaldo no cambia lo que el tanque debía aguantar (${m0.colchon.previsto.horas.toFixed(2)} h); firmado antes de la parada, sí (${mAntes.colchon.previsto.horas.toFixed(2)} h)`)

  // 6. La evidencia no repite líneas y toda causa sin identificar dice por qué (también la heredada de la bomba).
  const causasPozo = P.eventosPozos().map(e => CS.causaDeEvento(e, ctx0)), causasBomba = B.eventosBomba().map(e => CS.causaDeParada(e, ctx0))
  const repetidas = [...causasPozo, ...causasBomba].filter(c => new Set(c.evidencia).size !== c.evidencia.length)
  const sinPorQue = [...causasPozo, ...causasBomba].filter(c => c.como === 'ninguno' && (!c.porQueNo || c.evidencia.at(-1) !== c.porQueNo))
  const filasCe = API.pedirPozos('ceiba', sep.desde, sep.hasta, ctx0)
  // Los pozos que cerró la parada abierta de La Ceiba.
  const cerradosCe = D.prediccion(B.perfilBomba('P-201B', 'ceiba'), ctx0).perdiendo.pozos.map(p => p.id)
  const causasCe = cerradosCe.map(id => filasCe.find(x => x.pozo.id === id)?.causa)
  const paroCe = 'ZS-2011 · marcha → paro · 2 de oct, 03:52', cbCe = CS.causaDeParada(bombaId('EV-2011-1002'), ctx0)
  comprobar(!repetidas.length && !sinPorQue.length && causasCe.length >= 2 && causasCe.every(c => c && c.evidencia.filter(x => x === paroCe).length === 1 && c.como === 'ninguno' && c.porQueNo === cbCe.porQueNo && c.evidencia.at(-1) === cbCe.porQueNo)
    && causasPozo.filter(c => c.como === 'ninguno' && c.evento?.startsWith('EV-')).length > 0,
    `ninguna de las ${causasPozo.length + causasBomba.length} causas repite un renglón; ${cerradosCe.join(', ')} nombran una vez «${paroCe}» y heredan el porqué de la P-201B («${cbCe.porQueNo}»)${repetidas.length ? `; repetidas: ${repetidas.slice(0, 3).map(c => c.evento).join(', ')}` : ''}`)

  // 9. «Por identificar» con una sola cuenta: las que piden respuesta, y de esas las que ya arrancaron.
  const pregTodas = API.pedirPreguntas(TODOS, ctx0), cuenta = API.contarPorIdentificar(pregTodas)
  const ctxTarde = { config: ctx0.config, respuestas: { 'EV-M2011-260924': { texto: 'Sello de la bomba', por: 'prueba', hora: R.AHORA.toISOString(), parte: 'sello' } } }
  const pregTarde = API.pedirPreguntas(TODOS, ctxTarde), cuentaTarde = API.contarPorIdentificar(pregTarde)
  comprobar(cuenta.porIdentificar === 4 && cuenta.arrancaronSinIdentificar === 2 && cuenta.porIdentificar === pregTodas.filter(p => p.pide).length
    && cuentaTarde.porIdentificar === 3 && cuentaTarde.arrancaronSinIdentificar === 1 && pregTarde.find(p => p.id === 'EV-M2011-260924')?.arrancoSinIdentificar === true,
    `«por identificar» = ${cuenta.porIdentificar} (las que piden respuesta), de ellas ${cuenta.arrancaronSinIdentificar} ya arrancaron; respondida tarde, EV-M2011-260924 deja de contar (${cuentaTarde.porIdentificar} y ${cuentaTarde.arrancaronSinIdentificar}) y sigue no conforme`)

  // Fallas y disparos por equipo en el libro (la fila de «Por equipo» y la lista de «Por campo» del gerente):
  // las mismas que la pantalla contaba con la historia de fallas recortada al período.
  const periodosF = [...['curso', 'cerrado', 'trimestre', 'ytd', 'doce'].map(x => D.rangoDePeriodo(x)),
    { nombre: '15-ago a 10-sep', desde: new Date('2026-08-15T00:00:00-05:00'), hasta: new Date('2026-09-10T00:00:00-05:00') }]
  const FAMILIAS_F = ['reinyeccion', 'transporte', 'electrosumergible']
  let filasF = 0, conFallas = 0
  const malasF = []
  for (const r of periodosF) for (const x of L.libro(TODOS, r.desde, r.hasta, ctx0).porEquipo) {
    filasF++
    if (!FAMILIAS_F.includes(x.tipo)) { if ('fallas' in x || 'disparos' in x) malasF.push(`${r.nombre} ${x.campoId}/${x.equipo}/${x.tipo} trae fallas`); continue }
    conFallas++
    const en = L.historialDeEquipo(x.campoId, x.equipo, ctx0).eventos.filter(e => e.inicio < r.hasta && (e.fin === null || e.fin > r.desde))
    const ok = x.fallas === en.filter(e => !e.disparo).length && x.disparos === en.filter(e => e.disparo).length
      && (x.tipo === 'electrosumergible' ? x.fallas + x.disparos === x.eventos : x.disparos === 0 && x.fallas >= x.eventos)
    if (!ok) malasF.push(`${r.nombre} ${x.campoId}/${x.equipo}/${x.tipo}: ${x.fallas}+${x.disparos} contra ${en.length} (${x.eventos} con barriles)`)
  }
  const moDoce = L.libro(TODOS, D.rangoDePeriodo('doce').desde, D.rangoDePeriodo('doce').hasta, ctx0).porEquipo.find(x => x.campoId === 'morichal' && x.equipo === 'P-201B' && x.tipo === 'reinyeccion')
  comprobar(!malasF.length && conFallas > 30 && moDoce?.fallas === 8 && moDoce.eventos === 7,
    `«Por equipo» del libro trae fallas y disparos del período en las ${conFallas} filas de bombas y electrosumergibles de 6 períodos (de ${filasF} filas; las demás no los traen), iguales a la historia de fallas del equipo; P-201B de Morichal en 12 meses: ${moDoce?.fallas} fallas, ${moDoce?.eventos} con barriles${malasF.length ? `; distintas: ${malasF.slice(0, 4).join(' · ')}` : ''}`)

  // Mundos de prueba: lo que el demo no trae.
  const mundo = async preparar => {
    const m = await createServer({ root: RAIZ, configFile: false, resolve: { alias: { '@': `${RAIZ}src` } }, server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'error' })
    const datos = { S: await m.ssrLoadModule('/src/entities/datos/servicios.ts'), E: await m.ssrLoadModule('/src/entities/datos/eventos-pozos.ts'),
      B: await m.ssrLoadModule('/src/entities/datos/paradas-bombas.ts'), PZ: await m.ssrLoadModule('/src/entities/datos/pozos.ts'), EQ: await m.ssrLoadModule('/src/entities/equipos.ts') }
    preparar(datos)
    ;(await m.ssrLoadModule('/src/entities/insumos.ts')).instalarInsumos((await m.ssrLoadModule('/src/entities/datos/index.ts')).INSUMOS_DEMO)
    const L2 = await m.ssrLoadModule('/src/entities/libro.ts')
    return { m, L: L2, D: await m.ssrLoadModule('/src/entities/diferido.ts'), CS: await m.ssrLoadModule('/src/entities/causa-senal.ts'),
      P: await m.ssrLoadModule('/src/entities/pozos.ts'), Bo: await m.ssrLoadModule('/src/entities/bombas.ts'), VG: await m.ssrLoadModule('/src/entities/vigia.ts'),
      SA: await m.ssrLoadModule('/src/entities/salud.ts'), ctx: { config: L2.contextoInicial().config, respuestas: {} } }
  }
  const sv = (id, campoId, equipo, tipo, inicio, fin) => ({ id, campoId, equipo, tipo, inicio, fin, tag: 'prueba', texto: `prueba: ${id}` })
  const ep = (id, campoId, pozo, inicio, fin) => ({ id, campoId, pozo, inicio, fin, codigo: 'CMD', senal: 'prueba' })
  const conServicios = alReves => d => {
    d.S.EVENTOS_SERVICIOS.push(
      // Palmar, hoy: un servicio que sigue caído (fin null).
      sv('SV-PRUEBA-ABIERTO', 'palmar', 'SE-2', 'energia', '2026-10-02T10:00:00-05:00', null),
      // Zarza, 10-sep: un cierre en la cascada de dos servicios; llega primero el que cayó después.
      sv('SV-PRUEBA-TARDE', 'zarza', 'K-101', 'aire', '2026-09-10T09:05:00-05:00', '2026-09-10T11:00:00-05:00'),
      sv('SV-PRUEBA-TEMPRANO', 'zarza', 'SE-2', 'energia', '2026-09-10T09:00:00-05:00', '2026-09-10T10:00:00-05:00'),
      // Zarza, 12-sep: dos que caen a la vez; llega primero el de id mayor.
      sv('SV-PRUEBA-Z', 'zarza', 'K-101', 'aire', '2026-09-12T09:00:00-05:00', '2026-09-12T10:00:00-05:00'),
      sv('SV-PRUEBA-A', 'zarza', 'SE-2', 'energia', '2026-09-12T09:00:00-05:00', '2026-09-12T10:00:00-05:00'),
      // Guacamayo, 15-sep: una parada de bomba sin alarma entre dos servicios a ±15 min.
      sv('SV-PRUEBA-BOMBA-2', 'guacamayo', 'K-101', 'aire', '2026-09-15T09:10:00-05:00', '2026-09-15T10:00:00-05:00'),
      sv('SV-PRUEBA-BOMBA-1', 'guacamayo', 'SE-2', 'energia', '2026-09-15T08:50:00-05:00', '2026-09-15T10:00:00-05:00'),
    )
    d.E.EVENTOS_POZOS.push(
      ep('EP-PRUEBA-SV-1', 'palmar', 'PA-01', '2026-10-02T10:05:00-05:00', null),
      ep('EP-PRUEBA-SV-2', 'palmar', 'PA-02', '2026-10-02T10:15:00-05:00', null),
      ep('EP-PRUEBA-SV-3', 'palmar', 'PA-03', '2026-10-02T12:00:00-05:00', null),
      ep('EP-PRUEBA-ORDEN', 'zarza', 'ZA-01', '2026-09-10T09:08:00-05:00', '2026-09-10T12:00:00-05:00'),
      ep('EP-PRUEBA-EMPATE', 'zarza', 'ZA-02', '2026-09-12T09:03:00-05:00', '2026-09-12T12:00:00-05:00'),
    )
    d.B.PARADAS_BOMBAS.push({ id: 'EV-PRUEBA-SV', campoId: 'guacamayo', equipo: 'P-201B', inicio: '2026-09-15T09:00:00-05:00', fin: '2026-09-15T13:00:00-05:00', perdida: 1, senal: 'prueba' })
    if (alReves) d.S.EVENTOS_SERVICIOS.reverse()
  }
  const wa = await mundo(conServicios(false))
  const causaA = id => wa.CS.causaDeEvento(wa.P.eventosPozos().find(e => e.id === id), wa.ctx)
  // 7. Un servicio todavía caído: su cascada llega hasta ahora.
  const perdPalmar = wa.D.riesgoAhora(['palmar'], wa.ctx).find(r => r.estado === 'perdiendo' && r.equipo === 'SE-2')
  comprobar(causaA('EP-PRUEBA-SV-1').evento === 'SV-PRUEBA-ABIERTO' && causaA('EP-PRUEBA-SV-2').evento === 'SV-PRUEBA-ABIERTO' && causaA('EP-PRUEBA-SV-3').tipo === 'pendiente'
    && perdPalmar?.pozos === 2 && perdPalmar.desde.getTime() === Date.parse('2026-10-02T10:00:00-05:00'),
    `un servicio todavía caído (fin null) usa el ahora como fin: PA-01 y PA-02, que cerraron en su cascada, son suyos (${perdPalmar?.pozos ?? 0} pozos perdiendo desde las 10:00); PA-03, dos horas después, no`)
  // 8. Con dos servicios candidatos gana el que cayó primero; en empate, el de id menor.
  const cParada = wa.CS.causaDeParada(wa.Bo.paradaPorId('EV-PRUEBA-SV'), wa.ctx)
  comprobar(causaA('EP-PRUEBA-ORDEN').evento === 'SV-PRUEBA-TEMPRANO' && causaA('EP-PRUEBA-EMPATE').evento === 'SV-PRUEBA-A' && cParada.evento === 'SV-PRUEBA-BOMBA-1',
    'dos servicios a la vez: el cierre de ZA-01 y la parada de la P-201B de Guacamayo son del servicio que cayó primero aunque llegue segundo; en empate, del de id menor (ZA-02 → SV-PRUEBA-A)')
  const wr = await mundo(conServicios(true))
  const huella = w => [...w.P.eventosPozos().map(e => `${e.id}:${w.CS.causaDeEvento(e, w.ctx).evento}`), ...w.Bo.eventosBomba().map(e => `${e.id}:${w.CS.causaDeParada(e, w.ctx).evento}`)].join('|')
  const ordenA = wa.P.serviciosDeCampo('zarza').map(s => s.id).join(), ordenR = wr.P.serviciosDeCampo('zarza').map(s => s.id).join()
  comprobar(ordenA !== ordenR && huella(wa) === huella(wr),
    `con la lista de servicios al revés, las ${wa.P.eventosPozos().length + wa.Bo.eventosBomba().length} causas son las mismas: el resultado no depende del orden en que lleguen`)
  await wa.m.close(); await wr.m.close()

  const wb = await mundo(d => {
    // La vibración de la P-201B de La Ceiba (lee el catálogo tal cual) llega sin lectura: valor null, como manda el contrato.
    d.EQ.EQUIPOS['P-201B'].dispositivos.find(x => x.tag === 'VI-2011').valor = null
    // La MPP-301 sin historia de paradas; las electrosumergibles de Guacamayo sin fallas propias.
    const quitar = (xs, f) => { for (let i = xs.length - 1; i >= 0; i--) if (f(xs[i])) xs.splice(i, 1) }
    quitar(d.B.PARADAS_BOMBAS, x => x.campoId === 'morichal' && x.equipo === 'MPP-301')
    const espGu = new Set(d.PZ.POZOS_DEMO.filter(p => p.campoId === 'guacamayo' && p.levantamiento === 'electrosumergible').map(p => p.id))
    quitar(d.E.EVENTOS_POZOS, x => x.campoId === 'guacamayo' && espGu.has(x.pozo) && (['GF', 'PH', 'OL', 'UL', 'OT'].includes(x.codigo) || x.respuesta?.parte))
  })
  // 3. Un instrumento de bomba con valor null es una señal sin lectura, no se descarta.
  const pCeB = wb.Bo.perfilBomba('P-201B', 'ceiba')
  const sVi = wb.VG.senalesDe(pCeB).find(s => s.tag === 'VI-2011')
  const parteVi = wb.SA.saludDePartes(pCeB).find(sp => sp.sinSenal.some(x => x.senal.tag === 'VI-2011'))
  comprobar(!!sVi && sVi.valor === null && sVi.estado === 'sin señal' && sVi.pronostico.tipo === 'sin-tendencia' && /^Sin señal en línea/.test(sVi.pronostico.motivo)
    && !!parteVi && !parteVi.medidas.some(x => x.senal.tag === 'VI-2011') && !parteVi.discretas.some(x => x.tag === 'VI-2011'),
    `VI-2011 de La Ceiba con valor null: entra al vigía como «${sVi?.pronostico.motivo}» y a la salud de «${parteVi?.parte.nombre}» como sin señal (antes se descartaba)`)
  const rB = wb.D.riesgoAhora(['morichal', 'guacamayo'], wb.ctx)
  const rMppB = rB.find(r => r.campoId === 'morichal' && r.equipo === 'MPP-301' && r.estado === 'en-riesgo')
  const espGuB = rB.filter(r => r.campoId === 'guacamayo' && r.tipo === 'electrosumergible' && r.estado === 'en-riesgo')
  comprobar(!!rMppB && rMppB.costoFalla === undefined && rMppB.costoFallaHoy === undefined && rMppB.costoDe === undefined && rMppB.mdtFuente === undefined
    && espGuB.length >= 1 && espGuB.every(r => r.costoFalla === undefined && r.costoFallaHoy === undefined && r.costoDe === undefined),
    `sin fallas cerradas propias ni flota no hay cifra (ausente, no 0): la MPP-301 sin historia y ${espGuB.map(r => r.equipo).join(', ')} con la flota de Guacamayo sin fallas`)
  await wb.m.close()
}

console.log('\n=== 19. Corrección de la revisión (8-oct-2026): tanque con la bomba parada, horas, sin lectura, fallas sin costo ===')
{
  const { readFileSync } = await import('node:fs')
  const fuente = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8')
  const sinComentarios = t => t.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '')
  const SA = await v.ssrLoadModule('/src/entities/salud.ts')
  const CH = await v.ssrLoadModule('/src/shared/ui/costoHoy.ts')
  const EV = await v.ssrLoadModule('/src/entities/equipo-vivo.ts')
  const K = await v.ssrLoadModule('/src/shared/api/cable.ts')
  const CT = await v.ssrLoadModule('/src/shared/api/contrato.ts')

  // 1. El tanque con la bomba de disposición YA parada sube con lo que la parada dejó sin
  //    salida y no se ha quitado cerrando pozos, no con el colchón de «si parara ahora con
  //    todo produciendo». La Ceiba hoy: P-201B parada, los pozos que hacía falta cerrar ya
  //    cerrados, tanque en 89,6 % (alto-alto 90 %). Y cuadra con Planta: lo que entra no pasa
  //    de lo que P-201A y P-201C sacan (su capacidad en el campo, la que limita el cabezal), y
  //    la holgura es la misma que dice el llenado (lo cerrado de más), a menos de 1 %.
  const pCe = B.perfilBomba('P-201B', 'ceiba'), prCe = D.prediccion(pCe, ctx0)
  const produciendoCe = P.pozosDe('ceiba').filter(w => P.estadoAhora(w).produce).length
  const cerradoCe = prCe.perdiendo.pozos.reduce((a, w) => a + L.aguaDePrueba(w), 0)
  const sacanAyC = 2 * pCe.capacidadBpd
  const entraCe = prCe.llenado?.aguaEntraBpd ?? NaN
  comprobar(!!prCe.parada && produciendoCe > 0 && produciendoCe < P.pozosDe('ceiba').length && prCe.colchon.horas < 1 && !!prCe.llenado
    && entraCe === D.caudalesAhora('ceiba').agua && cerradoCe >= prCe.aguaSinSalidaBpd && entraCe <= sacanAyC && (sacanAyC - entraCe) / entraCe < 0.05
    && Math.abs((sacanAyC - entraCe) - (cerradoCe - prCe.aguaSinSalidaBpd)) / entraCe < 0.01
    && prCe.llenado.colchon.aguaSinSalidaBpd === 0 && prCe.llenado.colchon.horas === Infinity && prCe.llenado.prioridad === 0,
    `La Ceiba (P-201B parada, ${produciendoCe} de ${P.pozosDe('ceiba').length} pozos produciendo): se cerraron ${f(cerradoCe)} bbl/d de agua para ${f(prCe.aguaSinSalidaBpd)} sin salida; entran ${f(entraCe)} y P-201A y P-201C sacan hasta ${f(sacanAyC)}: el tanque no sube (llenado ${prCe.llenado?.colchon.horas} h, prioridad ${prCe.llenado?.prioridad}); el colchón de «si parara con todo produciendo» (${prCe.colchon.horas.toFixed(2)} h) no es cuándo se llena`)
  const enMarcha = [['morichal', 'P-201B'], ['morichal', 'MPP-301'], ['guacamayo', 'P-201B']].map(([c, e]) => D.prediccion(B.perfilBomba(e, c), ctx0))
  comprobar(enMarcha.every(pr => !pr.parada && pr.llenado === undefined), 'una bomba en marcha, una multifásica o una de recobro no traen llenado')
  //    En el cable: sin subir, las horas viajan como null (horasSinFin) y vuelven como Infinity.
  const jCe = JSON.parse(JSON.stringify(K.aRespuesta(CT.PREDICCION.codec, prCe)))
  comprobar(jCe.datos.llenado.colchon.horas === null && jCe.datos.llenado.prioridad === 0 && K.deRespuesta(CT.PREDICCION.codec, jCe).llenado.colchon.horas === Infinity,
    '/vistas/bombas/prediccion de la P-201B de La Ceiba: llenado.colchon.horas viaja como null (no sube) y vuelve como Infinity')
  //    Mundo de prueba: los pozos que cerró la P-201B vuelven a producir con la bomba parada:
  //    entra su agua, lo que P-201A y P-201C no alcanzan a sacar llena el tanque y llega al
  //    alto-alto en lo que dice la fórmula, con la prioridad de su tiempo.
  const reabiertos = prCe.perdiendo.pozos.map(w => w.id)
  const m = await createServer({ root: RAIZ, configFile: false, resolve: { alias: { '@': `${RAIZ}src` } }, server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'error' })
  const ev = await m.ssrLoadModule('/src/entities/datos/eventos-pozos.ts')
  for (let i = ev.EVENTOS_POZOS.length - 1; i >= 0; i--) {
    const x = ev.EVENTOS_POZOS[i]
    if (x.campoId === 'ceiba' && x.fin === null && reabiertos.includes(x.pozo)) ev.EVENTOS_POZOS.splice(i, 1)
  }
  ;(await m.ssrLoadModule('/src/entities/insumos.ts')).instalarInsumos((await m.ssrLoadModule('/src/entities/datos/index.ts')).INSUMOS_DEMO)
  const L2 = await m.ssrLoadModule('/src/entities/libro.ts'), D2 = await m.ssrLoadModule('/src/entities/diferido.ts')
  const B2 = await m.ssrLoadModule('/src/entities/bombas.ts'), P2 = await m.ssrLoadModule('/src/entities/pozos.ts'), C2 = await m.ssrLoadModule('/src/entities/configuracion.ts')
  const ctx2 = L2.contextoInicial(), p2 = B2.perfilBomba('P-201B', 'ceiba'), pr2 = D2.prediccion(p2, ctx2)
  const tk = C2.tanqueDe(ctx2.config, 'ceiba', 'P-201B'), nv = P2.NIVEL_AHORA[tk.id]
  const entra = D2.caudalesAhora('ceiba').agua
  // Sin pozos cerrados por la parada no se ha quitado nada: queda toda el agua sin salida de la parada.
  const sinSalida = Math.max(0, (pr2.parada.perdida * pr2.mueve.bpd - pr2.respaldoLibreBpd) * p2.sinBomba.fraccion)
  const horas = (tk.altoAlto - nv.pct / 100) * tk.capacidadBbl / (sinSalida / 24)
  const prio = h => (h > SA.HORIZONTE_H ? 0 : h < 24 ? 2 : 3)
  comprobar(P2.pozosDe('ceiba').filter(w => P2.estadoAhora(w).produce).length === produciendoCe + reabiertos.length && pr2.perdiendo.pozos.length === 0 && sinSalida > 0 && cerca(pr2.llenado.aguaEntraBpd, entra)
    && cerca(pr2.llenado.colchon.aguaSinSalidaBpd, sinSalida) && cerca(pr2.llenado.colchon.horas, horas) && pr2.llenado.prioridad === prio(horas)
    && pr2.llenado.colchon.componentes.some(x => x.nombre === 'Agua de los pozos'),
    `con ${reabiertos.join(', ')} produciendo otra vez y la P-201B parada entran ${f(entra)} bbl/d al tanque y vuelven a sobrar ${f(sinSalida)}: llega al alto-alto en ${pr2.llenado?.colchon.horas.toFixed(2)} h = libre / (agua sin salida / 24), prioridad ${pr2.llenado?.prioridad}`)
  const cfgResp = structuredClone(ctx2.config)
  cfgResp.respaldos.find(r => r.campoId === 'ceiba' && r.equipo === 'P-201B').libreBpd = 1e6
  const prResp = D2.prediccion(p2, { config: cfgResp, respuestas: {} })
  comprobar(prResp.llenado.aguaEntraBpd > 0 && prResp.llenado.colchon.horas === Infinity && prResp.llenado.prioridad === 0,
    'si el respaldo toma toda el agua que entra, el tanque no sube aunque haya pozos produciendo: sin hora y sin prioridad')
  //    Por tiempo hasta el alto-alto (ISA-18.2, la regla de la salud de las partes): < 24 h → 2, hasta 90 días → 3, más allá → 0.
  const pruebaPrio = [[0.4, 2], [23.9, 2], [24, 3], [500, 3], [SA.HORIZONTE_H + 1, 0], [Infinity, 0]]
  comprobar(pruebaPrio.every(([h, pr]) => prio(h) === pr), 'la prioridad del tanque: menos de un día P2, hasta 90 días P3, más allá o sin subir, gris')
  await m.close()
  //    La pantalla pinta el tanque con el llenado del motor, no con el colchón de la predicción.
  const planta = sinComentarios(fuente('src/pages/Planta.tsx'))
  comprobar(/prReiny\?\.llenado/.test(planta) && !/prReiny\?\.colchon/.test(planta) && /llenado\?\.prioridad/.test(planta),
    'Planta: la prioridad y el aviso del tanque salen de Prediccion.llenado (el agua que entra), no de colchon.horas')

  // 5. Las horas de «si falla hoy» con una sola regla (textoHoras) y el colchón truncado.
  const trunc = [[19.05, '19 h'], [18.6, '18 h'], [47.9, '47 h'], [55.2, '2,3 d'], [62, '2,5 d'], [60, '2,5 d']]
  comprobar(trunc.every(([h, t]) => SA.textoHoras(h, true) === t) && SA.textoHoras(18.6) === '19 h',
    `textoHoras(h, true) trunca a lo que escribe (${trunc.map(([h, t]) => `${h} h → «${t}»`).join(', ')}); sin truncar, 18,6 h sigue siendo «19 h»`)
  const rTodos = D.riesgoAhora(TODOS, ctx0)
  const rMo = rTodos.find(r => r.campoId === 'morichal' && r.equipo === 'P-201B' && r.estado === 'en-riesgo')
  const sinDuros = t => t?.replace(/\u00a0/g, ' ')
  comprobar(sinDuros(CH.colchonCorto(rMo)) === '0 si vuelve antes de 10 h' && /sin las 10 h que aguanta hoy el tanque$/.test(rMo.mdtFuente)
    && sinDuros(CH.colchonCorto({ costoFallaHoy: 1, colchonH: 18.6 })) === '0 si vuelve antes de 18 h'
    && CH.detalleCostoHoy(rMo) === 'El promedio de sus 8 fallas cerradas, sin las 10 h que aguanta hoy el tanque. Una reparación más corta no cuesta crudo.',
    `P-201B de Morichal (colchón ${rMo.colchonH.toFixed(2)} h): la fila dice «${sinDuros(CH.colchonCorto(rMo))}» y su ⓘ «${CH.detalleCostoHoy(rMo)}»: la misma hora, sin redondear hacia arriba; con 18,6 h, «18 h»`)
  const espR = rTodos.filter(r => r.tipo === 'electrosumergible' && r.estado === 'en-riesgo' && r.mdtFuente)
  const mdtDe = r => { const h = L.historialDeEquipo(r.campoId, r.equipo, ctx0); return h.mdtH ?? null }
  comprobar(espR.length >= 4 && espR.every(r => r.mdtFuente.startsWith(`${SA.textoHoras(mdtDe(r) ?? r.costoFalla * 24 / r.bblDia)} fuera, `)) && !rTodos.some(r => /días fuera/.test(r.mdtFuente ?? '')),
    `las electrosumergibles dicen su tiempo fuera con textoHoras («${espR[0]?.mdtFuente.split(' fuera')[0]} fuera»), nunca «N días fuera» («1 días»)`)

  // 3. Un instrumento sin lectura viaja con valor null en /vistas/equipos/:campo/:equipo, nunca «—».
  let guion = 0, nulos = 0, nulosSinEstado = 0
  for (const c of TODOS) for (const id of [...P.pozosDe(c).map(w => w.id), ...Object.keys(EQ.EQUIPOS)]) {
    const e = EV.equipoVivo(id, c, ctx0)
    for (const d of e?.dispositivos ?? []) {
      if (d.valor === '—' || (typeof d.valor === 'string' && d.valor.trim() === '')) guion++
      if (d.valor === null) { nulos++; if (d.estado !== 'sin señal' || d.unidad !== '') nulosSinEstado++ }
    }
  }
  comprobar(guion === 0 && nulos > 0 && nulosSinEstado === 0,
    `/vistas/equipos: ningún dispositivo con «—» por valor (${guion}); los ${nulos} sin lectura van con valor null, estado «sin señal» y sin unidad`)

  // 8. Equipos que fallaron sin costar crudo (Libro.sinCosto): con fallas o disparos en el período
  //    y sin fila de su familia en porEquipo; ni uno de más ni uno de menos, y los Paretos igual.
  const periodosS = [...['curso', 'cerrado', 'trimestre', 'ytd', 'doce'].map(x => D.rangoDePeriodo(x)),
    { nombre: '15-ago a 10-sep', desde: new Date('2026-08-15T00:00:00-05:00'), hasta: new Date('2026-09-10T00:00:00-05:00') }]
  const familia = (c, id) => { const pb = B.perfilBomba(id, c); return pb ? (pb.subtipo === 'multifasica' ? 'transporte' : 'reinyeccion') : 'electrosumergible' }
  const malasS = []
  let totalS = 0
  for (const r of periodosS) {
    const lb = L.libro(TODOS, r.desde, r.hasta, ctx0)
    totalS += lb.sinCosto.length
    const k = x => `${x.campoId}:${x.equipo}:${x.tipo}`
    const conFila = new Set(lb.porEquipo.map(k)), sin = new Set(lb.sinCosto.map(k))
    for (const c of TODOS) {
      const linea = [...new Set(B.paradasDeCampo(c).map(e => e.equipo))].filter(id => B.perfilBomba(id, c))
        .concat(P.pozosDe(c).filter(w => w.levantamiento === 'electrosumergible').map(w => w.id))
      for (const id of linea) {
        const en = L.historialDeEquipo(c, id, ctx0).eventos.filter(e => e.inicio < r.hasta && (e.fin === null || e.fin > r.desde))
        const clave = `${c}:${id}:${familia(c, id)}`
        const debe = en.length > 0 && !conFila.has(clave)
        if (debe !== sin.has(clave)) malasS.push(`${r.nombre} ${clave}: ${en.length} eventos, ${conFila.has(clave) ? 'con' : 'sin'} fila, ${sin.has(clave) ? 'en' : 'fuera de'} sinCosto`)
        const x = lb.sinCosto.find(y => k(y) === clave)
        if (x && (x.fallas !== en.filter(e => !e.disparo).length || x.disparos !== en.filter(e => e.disparo).length || (x.tipo !== 'electrosumergible' && x.disparos !== 0)))
          malasS.push(`${r.nombre} ${clave}: ${x.fallas}+${x.disparos} contra la historia`)
      }
    }
    if (lb.sinCosto.some(x => 'bbl' in x || conFila.has(k(x)))) malasS.push(`${r.nombre}: una fila de sinCosto con barriles o con fila en porEquipo`)
    if (!cerca(lb.porEquipo.reduce((a, x) => a + x.bbl, 0), lb.diferido, 1e-9)) malasS.push(`${r.nombre}: porEquipo ya no suma el diferido`)
  }
  const doceS = L.libro(TODOS, D.rangoDePeriodo('doce').desde, D.rangoDePeriodo('doce').hasta, ctx0).sinCosto
  const triS = L.libro(TODOS, D.rangoDePeriodo('trimestre').desde, D.rangoDePeriodo('trimestre').hasta, ctx0).sinCosto
  const guDoce = doceS.find(x => x.campoId === 'guacamayo' && x.equipo === 'P-201B')
  comprobar(!malasS.length && totalS > 0 && guDoce?.fallas === 5 && guDoce.tipo === 'reinyeccion' && triS.find(x => x.campoId === 'guacamayo' && x.equipo === 'P-201B')?.fallas === 1
    && L.libro(TODOS, D.rangoDePeriodo('curso').desde, D.rangoDePeriodo('curso').hasta, ctx0).sinCosto.length === 0,
    `«sin costo» del libro en 6 períodos: los equipos de la línea con fallas o disparos y sin fila de barriles, ni uno más ni uno menos; P-201B de Guacamayo (recobro): ${guDoce?.fallas} fallas en 12 meses, ${triS.find(x => x.equipo === 'P-201B')?.fallas} en el trimestre; porEquipo sigue sumando el diferido${malasS.length ? `; mal: ${malasS.slice(0, 4).join(' · ')}` : ''}`)
  //    La serie mensual (el mismo libro sin tramos) también lo trae.
  const serieS = L.serieMensual(TODOS, ctx0).filter(x => x.libro.sinCosto.length)
  comprobar(serieS.length > 0 && serieS.every(x => x.libro.sinCosto.every(y => y.fallas + y.disparos > 0)),
    `la serie mensual trae sinCosto en ${serieS.length} meses (${serieS.map(x => x.mes).join(', ')})`)

  // 2, 6 y 7. Rótulos, cuentas y papel.
  // F4 · P-21: `widgets/riesgo/Ahora.tsx` (con el Resumen y el Portafolio del gerente) se borra después de la
  // revisión. Lo que se comprueba de él vale mientras exista; borrado, `tsc -b` ya prueba que nadie lo importa.
  // «Por campo» se busca donde quede (hoy `widgets/resumen/`, que también se vacía).
  const { existsSync: existeF4, readdirSync: dirF4 } = await import('node:fs')
  const existe = rel => existeF4(new URL(`../${rel}`, import.meta.url))
  const dondeEsta = nombre => ['resumen', 'resultados', 'diferidos'].map(d => `src/widgets/${d}/${nombre}`).find(existe)
    ?? dirF4(new URL('../src/widgets/', import.meta.url)).map(d => `src/widgets/${d}/${nombre}`).find(existe)
  const pantallas = ['src/pages/Esp.tsx', 'src/widgets/equipos/Lista.tsx', 'src/widgets/riesgo/Ahora.tsx', 'src/pages/Riesgo.tsx', 'src/pages/Mantenimiento.tsx', 'src/pages/Turno.tsx', 'src/widgets/equipo/FichaEjecutiva.tsx'].filter(existe)
  const siFallaBpd = pantallas.filter(rel => /bbl\/d si fallan?\b|[Ee]n juego si falla|por día si fallan?\b/.test(fuente(rel)))
  comprobar(!siFallaBpd.length, `los bbl/d se rotulan «si para» o «en juego», nunca «si falla(n)» (que es la cifra en bbl de hoy)${siFallaBpd.length ? `: ${siFallaBpd.join(', ')}` : ''}`)
  const ahoraTxt = existe('src/widgets/riesgo/Ahora.tsx') ? sinComentarios(fuente('src/widgets/riesgo/Ahora.tsx')) : null, mantTxt = sinComentarios(fuente('src/pages/Mantenimiento.tsx'))
  comprobar((ahoraTxt === null || (/contarPorIdentificar\(usePreguntas\(/.test(ahoraTxt) && !/\.filter\(p => p\.pide\)/.test(ahoraTxt) && !/ninguna parte va hacia su límite/.test(ahoraTxt))) && /deFlota\(r, rol\.nivel\)/.test(mantTxt),
    `${ahoraTxt === null ? 'Ahora ya no existe (P-21)' : 'Ahora cuenta «por identificar» con contarPorIdentificar y usa la frase del Resumen'}; Mantenimiento marca «flota» con la misma regla que Riesgo (deFlota)`)
  const rutaPorCampo = dondeEsta('PorCampo.tsx')
  const css = fuente('src/index.css'), porCampo = rutaPorCampo ? fuente(rutaPorCampo) : ''
  comprobar(/section \.border-b\[data-partible\] \{ break-inside: auto; \}/.test(css) && /<div data-partible className="border-b/.test(porCampo),
    'en el papel, un campo desplegado de «POR CAMPO» se parte entre sus filas (no salta de hoja entero)')
}

console.log('\n=== 20. Revisión de realismo (9-oct-2026): trenes en equilibrio, orden del operador, tope de frecuencia, antes y con TRIM ===')
{
  // 1. Cada bomba de un tren en paralelo mueve su parte del agua que entra. Morichal (en marcha):
  //    7 × la mediana de FI-2011 = lo que entra hoy. La Ceiba (parada): 3 × la mediana = lo que
  //    entraba al parar = lo que entra hoy + lo que se cerró por la parada. A menos de 0,5 %.
  const pMo = B.perfilBomba('P-201B', 'morichal'), prMo2 = D.prediccion(pMo, ctx0)
  const pCe2 = B.perfilBomba('P-201B', 'ceiba'), prCe2 = D.prediccion(pCe2, ctx0)
  const entraMo = D.caudalesAhora('morichal').agua
  const entrabaCe = D.caudalesAhora('ceiba').agua + prCe2.perdiendo.pozos.reduce((a, w) => a + L.aguaDePrueba(w), 0)
  comprobar(Math.abs(7 * prMo2.mueve.bpd - entraMo) / entraMo < 0.005 && Math.abs(3 * prCe2.mueve.bpd - entrabaCe) / entrabaCe < 0.005
    && prMo2.aguaSinSalidaBpd === 40400 && prCe2.aguaSinSalidaBpd === 44100
    && Math.abs(6 * (pMo.capacidadBpd - prMo2.mueve.bpd) - prMo2.respaldoLibreBpd) / prMo2.respaldoLibreBpd < 0.01
    && Math.abs(2 * (pCe2.capacidadBpd - prCe2.mueve.bpd) - prCe2.respaldoLibreBpd) / prCe2.respaldoLibreBpd < 0.01
    && PT.CAMPO_PLANTA.ceiba.caudales.aguaCap === 3 * pCe2.capacidadBpd && PT.CAMPO_PLANTA.morichal.caudales.aguaCap === 7 * pMo.capacidadBpd,
    `trenes en equilibrio: Morichal 7 × ${f(prMo2.mueve.bpd)} ≈ ${f(entraMo)} que entran; La Ceiba 3 × ${f(prCe2.mueve.bpd)} ≈ ${f(entrabaCe)} que entraban al parar; el respaldo es lo que les falta a las otras para su límite (${f(pCe2.capacidadBpd)} y ${f(pMo.capacidadBpd)}), y la capacidad del tren en Planta es la suma de esos límites`)

  // 2. El orden de TRIM no baja una electrosumergible más de 25 % (≈ 45 Hz): entera o a lo más
  //    un 25 %, y lo que falta lo da el siguiente pozo del orden.
  const pasosEsp = [prMo2, prCe2].flatMap(pr => pr.orden.pasos).filter(x => x.pozo.levantamiento === 'electrosumergible')
  const aguaOrden = prMo2.orden.pasos.reduce((a, x) => a + x.aguaBpd, 0)
  comprobar(pasosEsp.length > 0 && pasosEsp.every(x => x.fraccion >= 0.999 || x.fraccion <= L.BAJA_MAXIMA_ESP + 1e-9) && cerca(aguaOrden, prMo2.aguaSinSalidaBpd, 1e-9)
    && prMo2.orden.pasos.filter(x => x.fraccion < 0.999).length >= 2,
    `orden de TRIM con tope de 25 % por electrosumergible: Morichal ${prMo2.orden.pasos.map(x => `${x.pozo.id} ${x.fraccion >= 0.999 ? 'entero' : `${Math.round(x.fraccion * 100)} %`}`).join(', ')} = ${f(prMo2.crudoBpd)} bbl/d`)
  //    Si casi toda el agua hay que quitarla, lo que se bajó en parte se cierra entero: el orden
  //    siempre llega al agua pedida.
  const conPruebaMo = P.pozosDe('morichal').filter(w => w.pruebas.length)
  const casiTodo = conPruebaMo.reduce((a, w) => a + L.aguaDePrueba(w), 0) * 0.98
  const oTodo = L.ordenOptimo(conPruebaMo, casiTodo, ahoraMs)
  comprobar(cerca(oTodo.agua, casiTodo, 1e-6) || oTodo.agua > casiTodo, `con el 98 % del agua de Morichal por quitar, el orden con tope llega al agua pedida (${f(oTodo.agua)} de ${f(casiTodo)})`)

  // 3. Los operarios cierran como un operador: el alto-alto dispara el pozo que más agua da y se
  //    sigue con el que más agua da, enteros. En cada parada de disposición, los pozos que cerró
  //    van de más agua a menos.
  const malOrden = B.eventosBomba().filter(e => e.equipo === 'P-201B' && e.perdida === 1).map(e => D.paradaMedida(e, ctx0, V0))
    .filter(m => m?.colchon && m.causa.equipo === 'P-201B' && m.tramos.length).filter(m => {
      const primeros = [...new Map([...m.tramos].sort((a, c) => a.evento.inicio.localeCompare(c.evento.inicio)).map(t => [t.pozo.id, L.aguaDePrueba(t.pozo, Date.parse(t.evento.inicio))])).values()]
      return primeros.some((w, i) => i > 0 && w > primeros[i - 1] + 1)
    })
  comprobar(malOrden.length === 0, `los operarios cierran primero los pozos que más agua dan, en todas las paradas de disposición${malOrden.length ? `; no: ${malOrden.map(m => m.evento.id).join(', ')}` : ''}`)

  // 4. Antes y con TRIM (desde la puesta en marcha): las electrosumergibles que fallan vuelven en
  //    2 a 5 días (taladro y bomba programados), salvo MN-41 (falla a tierra del 25-sep, súbita, que
  //    sigue esperando taladro: plantada); al arrancar una bomba de la línea, los pozos vuelven en
  //    menos de 40 min (las de disposición: los de la multifásica arrancan con ella).
  const puesta = Date.parse(`${C.PUESTA_EN_MARCHA}T00:00:00-05:00`)
  const fallasEsp = P.eventosPozos().filter(e => ['GF', 'PH', 'OL', 'OT', 'UL'].includes(e.codigo) && Date.parse(e.inicio) >= puesta && P.pozoDe(e.campoId, e.pozo)?.levantamiento === 'electrosumergible'
    && !(e.campoId === 'morichal' && e.pozo === 'MN-41') && CS.causaDeEvento(e, ctx0).tipo === 'electrosumergible'
    // Fallas, no disparos que el variador rearranca solo (minutos a horas).
    && ((e.fin ? Date.parse(e.fin) : ahoraMs) - Date.parse(e.inicio)) / 86_400_000 > 0.5)
  const largas = fallasEsp.filter(e => ((e.fin ? Date.parse(e.fin) : ahoraMs) - Date.parse(e.inicio)) / 86_400_000 > 5.01)
  const reaperturas = B.eventosBomba().filter(e => e.fin && Date.parse(e.fin) >= puesta && B.perfilBomba(e.equipo, e.campoId)?.papel === 'disposicion').flatMap(e => L.tramosDeEvento(e.campoId, e.id, ctx0).map(t => (Date.parse(t.evento.fin ?? '') - Date.parse(e.fin)) / 60_000))
  comprobar(fallasEsp.length > 0 && largas.length === 0 && reaperturas.length > 0 && reaperturas.every(x => x <= 41),
    `con TRIM: ${fallasEsp.length} fallas de electrosumergible desde la puesta en marcha, ninguna de más de 5 días (sin MN-41); los pozos vuelven a los ${Math.round(Math.min(...reaperturas))}-${Math.round(Math.max(...reaperturas))} min de arrancar la bomba`)

  // 5. El vigía anticipa las fallas de desgaste de las electrosumergibles (bomba, motor, admisión)
  //    y con TRIM se cambian antes, en una parada programada que sale de una orden predictiva: no
  //    hay falla, es programada (no alto impacto), la predicción queda «intervenida» y SAP tiene
  //    su PM03 (no una PM02). Las de aislamiento fallan igual: el registro no es 100 % de aciertos.
  const AC2 = await v.ssrLoadModule('/src/entities/aciertos.ts')
  const delVigia = ctx0.config.programa.filter(x => AC2.intervencionDelVigia(x))
  const hist = AC2.prediccionesHistoricas(TODOS, ctx0)
  const sap = SAP.historiaSap(ctx0)
  const bienVigia = delVigia.every(pr => {
    const ev = P.eventosPozos().find(e => e.campoId === pr.campoId && e.pozo === pr.equipo && Date.parse(e.inicio) >= Date.parse(pr.desde) && Date.parse(e.inicio) <= Date.parse(pr.hasta))
    const p = hist.find(x => x.id === pr.id)
    return ev && CS.causaDeEvento(ev, ctx0).tipo === 'programada' && p?.calificacion === 'intervenida' && p.parte === AC2.intervencionDelVigia(pr)
      && sap.ordenes.some(o => o.clase === 'PM03' && o.equipo === pr.equipo && o.cierreTecnico === p.intervencion) && !sap.ordenes.some(o => o.clase === 'PM02' && o.equipo === pr.equipo && o.descripcion === pr.motivo)
  })
  const vistasDesde = AC2.fallasVistas(TODOS, new Date(puesta), ctx0, V0).filter(x => x.visibilidad === 'vigilada')
  const aciertos = hist.filter(x => x.calificacion === 'acierto').length
  comprobar(delVigia.length > 0 && bienVigia && aciertos > 0 && aciertos < vistasDesde.length && hist.some(x => x.calificacion === 'falsa-alarma'),
    `el vigía anticipó ${delVigia.length} fallas de desgaste (${delVigia.map(x => x.equipo).join(', ')}): parada programada, predicción intervenida y PM03 en SAP; de las ${vistasDesde.length} fallas vigiladas que sí ocurrieron anunció ${aciertos}, y hubo falsas alarmas`)

  // 6. Antes y con TRIM: el diferido de alto impacto por día, la cuenta del Resumen (tres meses
  //    antes de la puesta en marcha contra lo que va desde ella), baja entre 15 y 25 % en el
  //    portafolio y en La Ceiba. Es una comparación, no la prueba de que lo bajó TRIM.
  const antes0 = new Date(`${C.PUESTA_EN_MARCHA.slice(0, 5)}${String(Number(C.PUESTA_EN_MARCHA.slice(5, 7)) - 3).padStart(2, '0')}-01T00:00:00-05:00`)
  const cambio = ids => { const a = L.libro(ids, antes0, new Date(puesta), ctx0), d = L.libro(ids, new Date(puesta), R.AHORA, ctx0)
    return (d.altoImpacto / d.meta.dias) / (a.altoImpacto / a.meta.dias) - 1 }
  const cP = cambio(TODOS), cC = cambio(['ceiba'])
  comprobar(cP <= -0.15 && cP >= -0.25 && cC <= -0.15 && cC >= -0.25,
    `antes y con TRIM, alto impacto por día: portafolio ${(cP * 100).toFixed(1)} %, La Ceiba ${(cC * 100).toFixed(1)} % (desde el ${antes0.toISOString().slice(0, 10)} hasta la puesta en marcha, contra lo que va)`)
}

console.log('\n=== 21. Ciclo ANTES / DURANTE / DESPUÉS ===')
{
  const ESC = await v.ssrLoadModule('/src/entities/escenarios.ts')
  const cal = L.calendario(), curso = cal.at(-1)
  const c = ESC.cicloValor(TODOS, new Date(curso.desde), new Date(curso.hasta), ctx0, V0)
  comprobar(cerca(c.antes.bbl + c.durante.bbl + c.despues.bbl, c.retornoBbl),
    `retorno = ANTES + DURANTE + DESPUÉS (${f(c.antes.bbl)} + ${f(c.durante.bbl)} + ${f(c.despues.bbl)} = ${f(c.retornoBbl)})`)
  const enRiesgo = D.riesgoAhora(TODOS, ctx0).filter(r => r.estado === 'en-riesgo' && r.altoImpacto)
  const costoHoy = enRiesgo.reduce((a, r) => a + (r.costoFallaHoy ?? 0), 0)
  comprobar(cerca(c.antes.bbl, costoHoy),
    `ANTES es la suma de costoFallaHoy de alto impacto en riesgo (${f(c.antes.bbl)} = ${f(costoHoy)})`)
  comprobar(c.antes.planes.every(p => p.simulado === true) && c.durante.planes.every(p => p.simulado) && c.despues.planes.every(p => p.simulado),
    'cada plan lleva simulado: true (no entra al libro)')
  const perdiendo = D.riesgoAhora(TODOS, ctx0).filter(r => r.estado === 'perdiendo' && r.altoImpacto)
  const bblDia = perdiendo.reduce((a, r) => a + r.bblDia, 0)
  comprobar(cerca(c.durante.bblDia, bblDia),
    `DURANTE.bblDia es lo que se pierde ahora de alto impacto (${f(c.durante.bblDia)})`)
  const lb = L.libro(TODOS, new Date(curso.desde), new Date(curso.hasta), ctx0)
  comprobar(c.despues.planes.some(p => p.id.endsWith(':orden')) === (lb.evitablePorOrden > 0)
    && (!c.despues.planes.some(p => p.id.endsWith(':orden')) || cerca(c.despues.planes.find(p => p.id.endsWith(':orden')).bbl, lb.evitablePorOrden)),
    `DESPUÉS trae el evitable por orden del período cuando hay (${f(lb.evitablePorOrden)} bbl)`)
  const aceptado = ESC.conDecisiones(c, { [c.despues.planes[0]?.id ?? '_']: { id: c.despues.planes[0]?.id ?? '_', estado: 'aceptado', por: 'prueba', porId: 'jefe', fecha: '2026-10-02T14:00:00.000-05:00', motivo: 'prueba' } })
  comprobar(!c.despues.planes[0] || aceptado.despues.planes[0].estado === 'aceptado',
    'conDecisiones pone el estado sobre el plan, sin cambiar los barriles')
  comprobar(ESC.planPorId(c, 'no-existe') === undefined && (!c.antes.planes[0] || ESC.planPorId(c, c.antes.planes[0].id)?.id === c.antes.planes[0].id),
    'planPorId encuentra el plan o no existe')
}

console.log('\n=== 22. Modelo choke: los cuatro tramos, la topología y «¿Dónde se trabó?» (CHOKE-COMPLETO §2 y §5) ===')
{
  const CH = await v.ssrLoadModule('/src/entities/choke.ts')
  const RP = await v.ssrLoadModule('/src/entities/choke-reparto.ts')
  const TOPO = await v.ssrLoadModule('/src/entities/datos/topologia.ts')
  // §14.11 · La derivación alcance → tramo: un solo criterio, el de Edinson.
  comprobar(CH.chokeDeAlcance('dedicado') === 'pozo' && CH.chokeDeAlcance('compartido') === 'planta' && CH.chokeDeAlcance('frontera') === 'exportacion'
    && CH.chokeDeAlcance('tercero') === 'exportacion' && CH.alcancePorPozos(['LC-14']) === 'dedicado' && CH.alcancePorPozos(['LC-14', 'LC-14']) === 'dedicado'
    && CH.alcancePorPozos(['LC-14', 'LC-09']) === 'compartido' && CH.conChoke({ elemento: 'X', alcance: 'compartido', pozos: ['LC-14', 'LC-09'] }).choke === 'planta',
    'el tramo se deriva del alcance: un solo pozo = dedicado = «En el pozo»; varios = compartido = «En la planta o estación»; tercero o frontera hacia afuera = «Afuera»')
  comprobar(CH.ORDEN_CHOKE.join() === 'reservorio,pozo,planta,exportacion' && CH.NOMBRE_CHOKE.reservorio === 'En el yacimiento' && CH.NOMBRE_CHOKE.pozo === 'En el pozo'
    && CH.NOMBRE_CHOKE.planta === 'En la planta o estación' && CH.NOMBRE_CHOKE.exportacion === 'Afuera: oleoducto, transportador o cliente' && !('mercado' in CH.NOMBRE_CHOKE)
    && CH.ORDEN_CHOKE.every(k => CH.EXPLICA_TRAMO[k]?.length > 20 && CH.RESUMEN_TRAMO[k]) && CH.EXPLICA_TRAMO.pozo.startsWith('Solo afectó a este pozo') && /mercado/i.test(CH.SUBNIVEL_MERCADO),
    'los cuatro tramos con sus palabras y la línea que explica cada uno («En la planta o estación», U2 §1.1); «Mercado» es un subnivel de afuera, nunca un quinto valor')
  // La topología del demo sale de lo que ya existe, y nada en ella contradice su alcance.
  const topos = TODOS.map(c => [c, CH.topologiaDe(c, ctx0)])
  const malDerivado = topos.flatMap(([c, t]) => t.filter(e => e.choke !== CH.chokeDeAlcance(e.alcance)).map(e => `${c}:${e.elemento}`))
  const errores = topos.flatMap(([, t]) => CH.validarTopologia(t))
  comprobar(malDerivado.length === 0 && errores.length === 0 && topos.every(([, t]) => t.length > 0),
    `la topología del demo sale de lo que ya existe y cada elemento lleva el tramo de su alcance (${topos.map(([c, t]) => `${c} ${t.length}`).join(', ')} elementos)${errores.length ? `: ${errores.join('; ')}` : ''}`)
  const el = (c, id) => CH.elementoDe(c, id, ctx0)
  const todosCeiba = P.pozosDe('ceiba').map(p => p.id).sort().join()
  comprobar(P.pozosDe('ceiba').every(p => el('ceiba', p.id)?.alcance === 'dedicado' && el('ceiba', p.id)?.pozos?.join() === p.id)
    && el('ceiba', 'P-201B')?.alcance === 'compartido' && [...el('ceiba', 'P-201B').pozos].sort().join() === todosCeiba
    && el('morichal', 'MPP-301')?.pozos?.join() === B.perfilBomba('MPP-301', 'morichal').pozos.join() && el('morichal', 'MPP-301')?.choke === 'planta'
    && el('ceiba', 'SE-2')?.alcance === 'compartido' && el('ceiba', 'oleoducto')?.alcance === 'tercero' && el('ceiba', 'oleoducto')?.choke === 'exportacion',
    'cada pozo es dedicado a sí mismo; P-201B sirve a los 18 pozos de La Ceiba, MPP-301 a los 3 de su perfil, SE-2 (el alimentador) a todos; el oleoducto es de un tercero')

  const lbH = L.libro(TODOS, new Date(L.calendario()[0].desde), R.AHORA, ctx0)
  const ch = t => CH.chokeDeCausa(t.causa, t.pozo.campoId, ctx0)
  // §14.7 · Una electrosumergible dedicada da «En el pozo»; P-201B da «En la planta».
  const esp = lbH.tramos.find(t => t.causa.tipo === 'electrosumergible' && t.pozo.campoId === 'ceiba')
  const bomba = lbH.tramos.find(t => t.causa.tipo === 'reinyeccion' && t.causa.equipo === 'P-201B' && t.pozo.campoId === 'ceiba')
  const chEsp = ch(esp), chB = ch(bomba)
  // B-11 · El porqué de un pozo cerrado por P-201B dice el tanque y lleva «porque» (U2 §4.1–§4.2).
  const paroB = B.paradaPorId(bomba.causa.evento)
  comprobar(chEsp?.choke === 'pozo' && chEsp.alcance === 'dedicado' && chEsp.servidos === 1 && chB?.choke === 'planta' && chB.alcance === 'compartido'
    && chB.porque === `P-201B mueve el agua de 18 pozos: el pozo se cerró porque el tanque de agua se llenó con P-201B parada (paró el ${R.fechaHora(new Date(paroB.inicio))}), así que se trabó en la planta`
    && chB.regla === 'choke.topologia@3' && chB.fuente === 'derivada',
    `una electrosumergible dedicada da «${CH.NOMBRE_CHOKE[chEsp?.choke]}» («${chEsp?.porque}»); P-201B da «${CH.NOMBRE_CHOKE[chB?.choke]}»: «${chB?.porque}»`)
  const mpp = lbH.tramos.find(t => t.causa.tipo === 'transporte' && t.causa.equipo === 'MPP-301' && t.causa.evento && B.paradaPorId(t.causa.evento))
  comprobar(!!mpp && /^MPP-301 lleva la producción de 3 pozos: el pozo paró porque MPP-301 dejó de moverle la producción \(paró el /.test(ch(mpp)?.porque ?? ''),
    `la multifásica también dice qué le pasó al pozo: «${mpp && ch(mpp)?.porque}»`)
  // §14.5 · En cascada manda la raíz: todas las paradas de una misma caída llevan el tramo y el elemento de su raíz.
  const porEvento = new Map()
  for (const t of lbH.tramos) if (t.causa.evento && t.causa.evento !== t.evento.id) porEvento.set(t.causa.evento, [...(porEvento.get(t.causa.evento) ?? []), t])
  const cascadas = [...porEvento.values()].filter(g => new Set(g.map(t => t.pozo.id)).size >= 2)
  const rotas = cascadas.filter(g => { const cs = g.map(ch); return cs.some(x => !x || x.choke !== cs[0].choke || x.elemento !== g[0].causa.equipo) })
  const se2 = porEvento.get('SV-SE-2-251015') ?? [], aire = porEvento.get('SV-K-101-260128') ?? []
  const paroAire = B.paradaPorId('EV-2011-260128')
  comprobar(cascadas.length >= 20 && rotas.length === 0 && se2.length >= 10 && se2.every(t => ch(t)?.choke === 'planta' && ch(t)?.elemento === 'SE-2')
    && paroAire && CS.causaDeParada(paroAire, ctx0).equipo === 'K-101' && new Set(aire.map(t => t.pozo.id)).size === 18 && aire.every(t => ch(t)?.choke === 'planta' && ch(t)?.elemento === 'K-101'),
    `en cascada manda la raíz: ${cascadas.length} cascadas reales del demo, todas sus paradas con el tramo y el elemento de su raíz (SE-2 cerró ${new Set(se2.map(t => t.pozo.id)).size} pozos de Morichal el 15-oct-2025; la caída de K-101 del 28-ene, que paró también a P-201B, queda en K-101)`)
  // Sin causa no hay tramo; tanques de crudo llenos y programadas.
  const pend = lbH.tramos.filter(t => t.causa.tipo === 'pendiente')
  const evac = lbH.tramos.find(t => t.causa.tipo === 'evacuacion'), chE = evac && ch(evac)
  const prog = lbH.tramos.filter(t => t.causa.tipo === 'programada')
  comprobar(pend.length > 0 && pend.every(t => ch(t) === null) && chE?.choke === 'planta' && chE.pregunta === '¿El oleoducto o el cliente estaba recibiendo?'
    && prog.length > 0 && prog.every(t => ch(t)?.choke === (P.pozoDe(t.pozo.campoId, t.causa.equipo) ? 'pozo' : 'planta')),
    `sin causa no hay tramo (${pend.length} paradas sin identificar dan null); el tanque de crudo lleno se propone «en la planta» con la pregunta «${chE?.pregunta}»; ${prog.length} paradas programadas llevan el tramo del elemento intervenido`)
  // Declarada: según el motivo que escogió la persona; en texto libre, la topología como propuesta y la pregunta.
  const decl = lbH.tramos.find(t => t.causa.tipo === 'declarada')
  const conMotivo = txt => CH.chokeDeCausa({ ...decl.causa, texto: txt, declarado: { ...decl.causa.declarado, texto: txt } }, decl.pozo.campoId, ctx0)
  comprobar(CSU.CAUSAS_POZO.map(x => conMotivo(x)?.choke).join() === 'pozo,pozo,exportacion,pozo' && conMotivo(CSU.CAUSAS_POZO[2])?.subnivel === 'mercado'
    && ch(decl)?.choke === 'pozo' && !!ch(decl)?.pregunta,
    'declarada: el tramo del motivo que escogió la persona (la nominación del comprador es afuera, subnivel mercado); en texto libre se propone el pozo y se pregunta')
  // Coordinador, punto 3 · Baja tensión en UN pozo del alimentador: «En el pozo» con la pregunta de energía; en varios a la vez, la planta (regla @2).
  const uvPropios = lbH.tramos.filter(t => t.evento.codigo === 'UV' && t.causa.tipo === 'energia' && t.causa.evento === t.evento.id)
  const lc05 = L.libro(['ceiba'], D.rangoDePeriodo('curso').desde, R.AHORA, ctx0).tramos.find(t => t.pozo.id === 'LC-05' && t.evento.codigo === 'UV')
  const enCascada = P.eventosDeCampo('morichal').find(e => e.codigo === 'UV' && CS.causaDeEvento(e, ctx0).evento !== e.id)
  const varios = enCascada && CH.chokeDeCausa({ tipo: 'energia', equipo: 'SE-2', como: 'senal', evento: enCascada.id, evidencia: ['prueba'], texto: 'Baja tensión en el alimentador del pozo' }, 'morichal', ctx0)
  comprobar(uvPropios.length > 0 && uvPropios.every(t => ch(t)?.choke === 'pozo' && ch(t)?.elemento === t.pozo.id && ch(t)?.pregunta === CH.PREGUNTA_ENERGIA)
    && lc05 && ch(lc05)?.choke === 'pozo' && varios?.choke === 'planta' && !varios.pregunta && /a la vez/.test(varios.porque) && CH.REGLA_CHOKE === 'choke.topologia@3',
    `baja tensión: un solo pozo del alimentador caído es «En el pozo», con la pregunta de energía (las ${uvPropios.length} del demo, LC-05 el 1-oct: «${lc05 && ch(lc05)?.porque}»); varios a la vez en la ventana de cascada, «En la planta» («${varios?.porque.slice(0, 60)}…»)`)
  // Config.topologia manda; lo que la firma no trae sale de la regla por tipo; un campo sin entradas sigue con la derivada.
  const ctxT = { config: { ...ctx0.config, topologia: [CH.conChoke({ elemento: 'P-201B', alcance: 'dedicado', pozos: ['LC-14'], campoId: 'ceiba' })] }, respuestas: {} }
  const chT = CH.chokeDeCausa(bomba.causa, 'ceiba', ctxT), chK = CH.chokeDeCausa({ ...bomba.causa, tipo: 'aire', equipo: 'K-101' }, 'ceiba', ctxT)
  comprobar(chT?.choke === 'pozo' && chT.fuente === 'firmada' && chK?.choke === 'planta' && chK.fuente === 'regla' && CH.topologiaFirmada('ceiba', ctxT) && !CH.topologiaFirmada('morichal', ctxT),
    'Config.topologia manda: firmada P-201B como dedicada a un pozo, su parada pasa a «En el pozo»; lo que la firma no trae sale de la regla por tipo; un campo sin entradas sigue con la derivada')
  const malas = CH.validarTopologia([
    { elemento: 'P-201B', choke: 'pozo', alcance: 'compartido', pozos: ['LC-14', 'LC-09'], campoId: 'ceiba' },
    { elemento: 'TR-1', choke: 'pozo', alcance: 'dedicado', pozos: ['LC-14', 'LC-09'], campoId: 'ceiba' },
    { elemento: 'TR-2', choke: 'planta', alcance: 'compartido', pozos: ['LC-14'], campoId: 'ceiba' },
    { elemento: 'TR-2', choke: 'planta', alcance: 'compartido', pozos: ['LC-14', 'XX-99'], campoId: 'ceiba' },
  ])
  comprobar(malas.length === 5, `la firma de una topología rechaza un tramo que no sale del alcance, un dedicado con dos pozos, un compartido con uno, un elemento repetido y un pozo de otro campo (${malas.length} errores)`)
  // Coordinador, punto 8 · El caso de borde «misma locación»: la locación vive en datos/topologia.ts, no en Pozo.
  const marcada = CH.marcarCasosBorde(CH.topologiaDe('morichal', ctx0), TOPO.locacionDemo('morichal')).filter(e => e.casoBorde)
  comprobar(marcada.map(e => `${e.elemento}:${e.casoBorde}:${e.choke}`).join() === 'MPP-301:misma-locacion:planta'
    && CH.casoBordeDe({ alcance: 'compartido', pozos: ['MN-07', 'MN-18', 'MN-33', 'MN-01'] }, TOPO.locacionDemo('morichal')) === undefined
    && CH.casoBordeDe({ alcance: 'compartido', pozos: ['LC-12', 'LC-14'] }, TOPO.locacionDemo('ceiba')) === undefined && /^Falta confirmar con la operadora/.test(CH.EXPLICA_CASO_BORDE) && !/Edinson/.test(CH.EXPLICA_CASO_BORDE),
    'caso de borde: MPP-301 sirve a los 3 pozos del clúster norte (una sola locación) y queda marcado, sin dejar de ir a la planta; sin la locación de los pozos (el resto del demo) no se marca nada')
  // Coordinador, punto 8 · Las propuestas de topología, con evidencia y conflictos.
  const prC = CH.propuestasTopologia('ceiba', ctx0), prM = CH.propuestasTopologia('morichal', ctx0)
  const de = (ps, fuente, id) => ps.find(x => x.fuente === fuente && x.elemento === id)
  comprobar(de(prC, 'alimentador', 'SE-2')?.pozos.length === 18 && de(prC, 'cascadas', 'K-101')?.evidencia.length >= 5 && de(prC, 'cascadas', 'K-101')?.pozos.length === 18
    && /4 pozos/.test(de(prC, 'registro', 'V-101')?.conflicto ?? '') && de(prM, 'bomba', 'MPP-301')?.pozos.join() === 'MN-07,MN-18,MN-33' && !!de(prM, 'cascadas', 'C-401')?.conflicto
    && [...prC, ...prM].every(x => x.evidencia.length > 0 && x.porque.endsWith('?') || x.fuente === 'registro'),
    `propuestas de topología con su evidencia: «${de(prC, 'alimentador', 'SE-2')?.porque}» · «${de(prC, 'cascadas', 'K-101')?.porque}» · conflicto: «${de(prC, 'registro', 'V-101')?.conflicto}»`)
}

/** Las capacidades que el demo declaraba hasta el 21-oct (La Ceiba 12.000 en el tren de crudo;
 *  Guacamayo 6.800 afuera y 7.400 en crudo) estaban por debajo de lo que el campo ya produjo
 *  (12.930 y 7.440 bbl/d): con ellas el real pasaba la capacidad 315 días-campo, y se corrigieron
 *  en planta.ts (C1, paso 1). Con las corregidas limitan los pozos todos los días, así que lo que
 *  solo se ve cuando limita otro tramo (lo estructural, el real sobre la capacidad, el aviso de
 *  cambio) se prueba aquí con las de antes, como un escenario, y se devuelven al terminar. El
 *  motor lee CAMPO_PLANTA en cada llamada (no lo guarda por contexto). */
// El motor guarda en memoria, por contexto, las capacidades y los días de cada
// campo (QA-A-15): el mundo de prueba que cambia el esquema en el sitio se calcula
// con un contexto nuevo, como lo haría una configuración nueva.
const conCapacidadesDeAntes = f => {
  const ce = PT.CAMPO_PLANTA.ceiba, gu = PT.CAMPO_PLANTA.guacamayo
  const hoy = [ce.caudales.crudoCap, gu.chokes.evacuacion, gu.caudales.crudoCap]
  ce.caudales.crudoCap = 12000; gu.chokes.evacuacion = 6800; gu.caudales.crudoCap = 7400
  try { return f({ ...ctx0, config: { ...ctx0.config } }) } finally { [ce.caudales.crudoCap, gu.chokes.evacuacion, gu.caudales.crudoCap] = hoy }
}

console.log('\n=== 23. Qué limita hoy: potenciales, gas sin medir, «casi iguales» y campo de gas (CHOKE-COMPLETO §3–§4, U2 §0 y §11.3) ===')
{
  const CH = await v.ssrLoadModule('/src/entities/choke.ts')
  const RP = await v.ssrLoadModule('/src/entities/choke-reparto.ts')
  const ahoraC = R.AHORA.getTime()
  const pots = TODOS.map(c => CH.potencialesDelCampo(c, ahoraC, ctx0))
  const crudos = pots.filter(p => !p.campoDeGas)
  const pc = id => pots.find(p => p.campoId === id)
  // §14.1 · Potencial del sistema = el menor de pozos, planta y afuera.
  comprobar(crudos.length === 4 && crudos.every(p => p.sistema === Math.min(p.pozos, p.planta ?? Infinity, p.exportacion ?? Infinity) && p.holgura[p.dominante] === 0
      && CH.ORDEN_CHOKE_CAMPO.every(k => p.holgura[k] === null || p.holgura[k] >= 0)) && Object.keys(pots[0].holgura).join() === 'pozos,planta,exportacion',
    `lo que limita es el menor de pozos, planta y afuera: ${crudos.map(p => `${p.campoId} ${f(p.sistema)} (${p.dominante})`).join(', ')}`)
  // D3 (QA-A-02) · Para lo que limita, el potencial de los pozos es Σ de la prueba vigente × el factor de medición
  // firmado (1), NUNCA el factor de asignación del mes, que sale de lo que ya pasó por la planta. La cifra de
  // Producción (prueba × factor del mes) sigue aparte, en `pozosAsignado`: el libro valora con ella.
  // C1, paso 1: afuera de Guacamayo es 7.500 (antes 6.800, por debajo de los 7.440 que ya salieron).
  const sumaPruebas = c => P.pozosDe(c).filter(w => w.pruebas.length).reduce((a, w) => a + (P.pruebaEn(w, ahoraC)?.crudoBpd ?? 0), 0)
  comprobar(pots.every(p => cerca(p.pozos, sumaPruebas(p.campoId) * CH.factorMedicion(p.campoId, ctx0.config), 1e-12) && p.factorMedicion === 1 && !p.factorFirmado
      && cerca(p.pozosAsignado, D.estadoCampo(p.campoId, ctx0).potencialBpd, 1e-9)) && CH.PARAMETROS_CHOKE.factorMedicion === 1
    && Math.round(pc('ceiba').pozos) === 11857 && Math.round(pc('ceiba').pozosAsignado) === 11360
    && Math.round(pc('guacamayo').pozos) === 6828 && pc('guacamayo').exportacion === 7500 && pc('guacamayo').dominante === 'pozos',
    `el potencial de los pozos es Σ de las pruebas (× factor de medición 1), no × el factor de asignación del mes: La Ceiba ${f(pc('ceiba').pozos)} (Producción ${f(pc('ceiba').pozosAsignado)}); en Guacamayo los pozos (${f(pc('guacamayo').pozos)}) quedan por debajo de afuera (7.500)`)
  // Coordinador, punto 1 · Un tren sin medir no decide lo que limita: el gas sale «sin medir».
  // C1, paso 1: el tren de crudo de La Ceiba es 13.000 (antes 12.000, por debajo de los 12.930 que ya pasaron).
  const ce = pc('ceiba'), mo = pc('morichal'), gasCe = ce.trenes.find(x => x.tren === 'gas')
  comprobar(ce.planta === 13000 && ce.trenQueLimita === 'crudo' && Math.round(ce.holgura.planta) === 1143 && Math.round(mo.planta) === 18666 && mo.trenQueLimita === 'agua' && Math.round(mo.holgura.planta) === 729
    && gasCe && !gasCe.medido && gasCe.enCrudo === null && gasCe.capacidad === 4200 && gasCe.unidad === 'KPC/d de gas' && /le sobran 1\.143/.test(ce.texto)
    && crudos.every(p => p.trenes.filter(x => !x.medido).every(x => x.enCrudo === null) && p.planta === Math.min(...p.trenes.filter(x => x.medido && x.enCrudo !== null).map(x => x.enCrudo))),
    `el gas sin medir queda fuera del mínimo: La Ceiba planta ${f(ce.planta)} (tren de crudo), le sobran ${f(ce.holgura.planta)}; Morichal ${f(mo.planta)} (agua), le sobran ${f(mo.holgura.planta)}`)
  comprobar(crudos.every(p => p.trenes.find(x => x.tren === 'crudo').capacidad === PT.CAMPO_PLANTA[p.campoId].caudales.crudoCap
      && Math.abs(p.trenes.find(x => x.tren === 'agua').enCrudo - PT.CAMPO_PLANTA[p.campoId].caudales.aguaCap * p.pozos / p.agua) <= 0.5
      && p.exportacion === PT.CAMPO_PLANTA[p.campoId].chokes.evacuacion && p.mercado === PT.CAMPO_PLANTA[p.campoId].chokes.mercado),
    'planta = el menor de los trenes medidos con la capacidad instalada (el agua pasada a crudo con las pruebas); afuera = la evacuación declarada, con el mercado de subnivel')
  // §14.1 · Empate con explicación, y «casi iguales» con su umbral.
  const emp = CH.dominanteDe({ pozos: 3400.4, planta: 3400, exportacion: 4100 }), noEmp = CH.dominanteDe({ pozos: 3401, planta: 3400, exportacion: 4100 })
  comprobar(emp.empate && emp.empatados.join() === 'pozos,planta' && emp.dominante === 'pozos' && /NSTA/.test(emp.explicacion) && /3\.400/.test(emp.explicacion)
    && !noEmp.empate && noEmp.dominante === 'planta' && noEmp.explicacion === undefined && crudos.every(p => !p.empate),
    `empate al barril: se marca, se toma el primero de la tubería y se explica («${emp.explicacion}»); en el demo, ningún campo empatado hoy`)
  const gu = pc('guacamayo')
  // C1, paso 1: con afuera en 7.500, Guacamayo ya no está «casi igual» (13,4 %); con los 6.800 de antes sí lo estaba (2,8 %).
  const guAntes = conCapacidadesDeAntes(c => CH.potencialesDelCampo('guacamayo', ahoraC, c))
  comprobar(CH.PARAMETROS_CHOKE.umbralCasiIguales === 0.03 && CH.PARAMETROS_CHOKE.diasParaCambio === 3 && CH.dominanteDe({ pozos: 6615, planta: 7400, exportacion: 6800 }).casiIguales?.join() === 'pozos,exportacion'
    && CH.dominanteDe({ pozos: 11360, planta: 12000, exportacion: 14000 }).casiIguales === null && gu.casiIguales === null && gu.umbral === 0.03 && ce.casiIguales === null
    && guAntes.casiIguales?.join() === 'pozos,exportacion' && /casi iguales/.test(guAntes.texto),
    `«casi iguales» con un umbral fijo y versionado (${CH.PARAMETROS_CHOKE.version}: 3 %, ${CH.PARAMETROS_CHOKE.diasParaCambio} días): Guacamayo, pozos y afuera a ${((gu.exportacion - gu.pozos) / gu.pozos * 100).toFixed(1)} % («${gu.texto}»); con los 6.800 que declaraba antes, a ${((guAntes.exportacion - guAntes.pozos) / guAntes.pozos * 100).toFixed(1)} % («${guAntes.texto}»)`)
  // Coordinador, punto 5 · La Zarza es un campo de gas: sin tubería de crudo ni holgura.
  const za = pc('zarza')
  comprobar(za.campoDeGas && za.dominante === null && za.planta === null && za.sistema === null && Object.values(za.holgura).every(h => h === null) && /campo de gas/.test(za.texto)
    && pots.filter(p => p.campoId !== 'zarza').every(p => !p.campoDeGas),
    `La Zarza es un campo de gas: no da tubería de crudo ni holgura («${za.texto.slice(0, 70)}…»)`)
  // §14.8 · El potencial de la planta no baja durante la parada de P-201B (NSTA p. 29).
  const paradas = B.paradasDe('P-201B', 'ceiba').filter(e => e.perdida === 1)
  const mismasPruebas = (a, b) => P.pozosDe('ceiba').every(w => P.pruebaEn(w, a) === P.pruebaEn(w, b))
  const casos = paradas.map(e => ({ e, a: Date.parse(e.inicio) - 3_600_000, b: Math.min(e.fin ? Date.parse(e.fin) : ahoraC, Date.parse(e.inicio) + 6 * 3_600_000) }))
    .filter(x => mismasPruebas(x.a, x.b) && L.faDe('ceiba', x.a) === L.faDe('ceiba', x.b))
  const bajo = casos.filter(x => { const a = CH.potencialesDelCampo('ceiba', x.a, ctx0), b = CH.potencialesDelCampo('ceiba', x.b, ctx0); return a.planta !== b.planta || a.pozos !== b.pozos })
  const abierta = paradas.find(e => !e.fin)
  comprobar(casos.length >= 5 && bajo.length === 0 && abierta && casos.some(x => x.e === abierta),
    `el potencial de la planta (y el de los pozos) no baja durante la parada de P-201B: igual antes y durante ${casos.length} paradas, también la abierta del 2-oct (${f(ce.planta)} bbl/d)`)
  // C1, paso 1: con el tren de crudo en 13.000, en marzo también limitaban los pozos; con los 12.000 de antes limitaba la planta.
  const marzo = Date.parse('2026-03-15T12:00:00-05:00')
  const marzoHoy = CH.potencialesDelCampo('ceiba', marzo, ctx0), marzoAntes = conCapacidadesDeAntes(c => CH.potencialesDelCampo('ceiba', marzo, c))
  comprobar(crudos.every(p => p.textoCorto.startsWith('Qué limita hoy: ')) && ce.textoCorto === 'Qué limita hoy: los pozos (11.857 bbl/d)'
    && marzoHoy.dominante === 'pozos' && marzoAntes.dominante === 'planta' && marzoAntes.casiIguales?.join() === 'pozos,planta' && /casi iguales/.test(marzoAntes.texto),
    `lo que dice en palabras: «${ce.textoCorto}» · «${ce.texto}»; en marzo limitaban los pozos («${marzoHoy.texto}»), y con los 12.000 de antes, la planta, casi igual a los pozos: «${marzoAntes.texto}»`)
}

console.log('\n=== 24. Lo que se perdió, por tramo y por escalón, con el total del libro (CHOKE-COMPLETO §6–§8) ===')
{
  const CH = await v.ssrLoadModule('/src/entities/choke.ts')
  const RP = await v.ssrLoadModule('/src/entities/choke-reparto.ts')
  const suma = o => Object.values(o).reduce((a, x) => a + x, 0)
  const periodos = [['un mes cerrado', D.rangoDePeriodo('cerrado')], ['el mes en curso', D.rangoDePeriodo('curso')], ['los 13 meses', { desde: new Date(L.calendario()[0].desde), hasta: R.AHORA }]]
  let cuadres = 0
  const malasId = [], malasEsc = [], malasEq = []
  for (const [nombre, r] of periodos) for (const ids of [...TODOS.map(c => [c]), TODOS]) {
    const b = RP.brechaPorChoke(ids, r.desde, r.hasta, ctx0), lb = L.libro(ids, r.desde, r.hasta, ctx0)
    const sc = suma(b.porChoke)
    cuadres++
    // §14.2 · potencial − real = Σ por tramo + sin explicar, exacto; Σ por tramo = Σ de los tramos del libro.
    if (!(cerca(sc + b.sinExplicar, lb.potencial - lb.real, 1e-9) && cerca(sc, lb.diferido, 1e-9) && cerca(b.sinExplicar, lb.residuo, 1e-6) && b.cuadra
      && b.porCampo.every(x => { const l = lb.porCampo.find(y => y.campoId === x.campoId); return cerca(suma(x.porChoke) + x.sinExplicar, l.potencial - l.real, 1e-9) }))) malasId.push(`${nombre} ${ids.join('+')}`)
    // §14.3 · Σ por escalón = Σ por tramo, y la escalera dentro de cada tramo suma su tramo.
    if (!(cerca(suma(b.porEscalon), sc, 1e-9) && CH.CHOKES_Y_SIN_ASIGNAR.every(k => cerca(suma(b.porChokeEscalon[k]), b.porChoke[k], 1e-9))
      && CH.ESCALONES.every(e => cerca(CH.CHOKES_Y_SIN_ASIGNAR.reduce((a, k) => a + b.porChokeEscalon[k][e], 0), b.porEscalon[e], 1e-9)))) malasEsc.push(`${nombre} ${ids.join('+')}`)
    if (!CH.CHOKES_Y_SIN_ASIGNAR.every(k => cerca(b.porChokeEquipo[k].reduce((a, x) => a + x.bbl, 0), b.porChoke[k], 1e-9))) malasEq.push(`${nombre} ${ids.join('+')}`)
  }
  comprobar(malasId.length === 0, `potencial − real = Σ por tramo + sin explicar, exacto, en cada campo y en el portafolio, en un mes cerrado, en el mes en curso y en los 13 meses (${cuadres} cuadres; sin explicar ≤ 2,5 % del potencial)${malasId.length ? `: ${malasId.join(', ')}` : ''}`)
  comprobar(malasEsc.length === 0 && malasEq.length === 0, `Σ por escalón = Σ por tramo en los mismos ${cuadres} cuadres; la escalera de cada tramo y sus equipos suman el tramo${[...malasEsc, ...malasEq].length ? `: ${[...malasEsc, ...malasEq].join(', ')}` : ''}`)
  // §14.4 · La pérdida no entra. Todavía no hay pérdidas en el motor (EventoPerdida, P1 §1.9): la prueba queda lista.
  const sep = D.rangoDePeriodo('cerrado')
  const sinP = RP.brechaPorChoke(['ceiba'], sep.desde, sep.hasta, ctx0)
  const conP = RP.brechaPorChoke(['ceiba'], sep.desde, sep.hasta, { ...ctx0, perdidas: [{ campoId: 'ceiba', tipo: 'derrame', bbl: 500, fecha: '2026-09-10T08:00:00-05:00' }] })
  comprobar(CH.CHOKES_Y_SIN_ASIGNAR.every(k => conP.porChoke[k] === sinP.porChoke[k]) && conP.brecha === sinP.brecha && cerca(suma(conP.porChoke), L.libro(['ceiba'], sep.desde, sep.hasta, ctx0).diferido, 1e-9),
    'la pérdida no entra: solo suman los tramos del libro (el motor todavía no tiene pérdidas; esta prueba queda lista para EventoPerdida, P1 §1.9)')
  // Escalones del demo: el exceso de una parada programada sobre su ventana es otro tramo, no planeado.
  const ago = L.libro(['ceiba'], new Date('2026-08-01T00:00:00-05:00'), new Date('2026-09-01T00:00:00-05:00'), ctx0)
  const fin = Date.parse(ctx0.config.programa.find(x => x.id === 'PR-2011-260819').hasta)
  const exceso = ago.tramos.filter(t => t.causa.tipo === 'programada' && t.causa.equipo === 'P-201B' && t.fin.getTime() > fin)
    .map(t => ({ t, p: CH.escalonesDe(t, CH.chokeDeCausa(t.causa, 'ceiba', ctx0), ctx0) }))
  comprobar(exceso.length === 3 && exceso.every(x => x.p.length === 2 && x.p[1][0] === 'disponibilidad-no-planeada' && x.p[1][1] > 0 && cerca(x.p[0][1] + x.p[1][1], x.t.bbl, 1e-12)),
    `el exceso de una parada programada sobre su ventana es no planeado: los ${exceso.length} pozos que siguieron cerrados después del fin del programa de P-201B (09:34 del 20-ago) pasan ${f(exceso.reduce((a, x) => a + x.p[1][1], 0))} bbl a no planeada`)
  const b12 = RP.brechaPorChoke(TODOS, new Date(L.calendario()[0].desde), R.AHORA, ctx0)
  comprobar(b12.porEscalon.capacidad > 0 && b12.porChoke['sin-asignar'] === b12.porChokeEscalon['sin-asignar']['sin-clasificar'] && b12.porEscalon.desarrollo === 0 && b12.porChoke.reservorio === 0
    && b12.porEscalon['disponibilidad-no-planeada'] > b12.porEscalon['disponibilidad-planeada'],
    `la escalera del año: ${CH.ESCALONES.map(e => `${CH.NOMBRE_ESCALON[e].split(':')[0].toLowerCase()} ${f(b12.porEscalon[e])}`).join(', ')} bbl; el yacimiento nunca sale de una señal; lo sin identificar va sin tramo y sin escalón`)
  // C1, paso 1: con las capacidades corregidas ningún día pasa una capacidad declarada, y como
  // limitan los pozos todos los días no hay brecha estructural en el demo.
  comprobar(b12.superado.length === 0 && b12.estructural === 0 && b12.textoEstructural === undefined && cerca(b12.potencialSistema, b12.potencialPruebas, 1e-12)
    && b12.cabiaEnHolgura === 0 && cerca(b12.noPlaneadaSistema, b12.porEscalon['disponibilidad-no-planeada'], 1e-12)
    && b12.porCampo.filter(x => x.dominante !== null).every(x => x.dominante === 'pozos'),
    `con las capacidades del demo (corregidas el 21-oct) ningún día el real pasa una capacidad declarada y limitan los pozos en los 13 meses: 0 bbl estructurales (${b12.porCampo.map(x => `${x.campoId} ${x.dominante ?? 'sin tubería'}`).join(', ')})`)
  // La brecha estructural se separa y se dice; un día con el real sobre la capacidad declarada no lleva estructural.
  // Se prueba con las capacidades de antes, que dejaban limitar a la planta (La Ceiba) y a afuera (Guacamayo).
  const b12a = conCapacidadesDeAntes(c => RP.brechaPorChoke(TODOS, new Date(L.calendario()[0].desde), R.AHORA, c))
  comprobar(cerca(b12a.potencialSistema, b12a.potencialPruebas - b12a.estructural, 1e-12) && b12a.estructural > 0
    && b12a.porCampo.every(x => x.estructural >= 0 && x.estructuralPorChoke.pozos === 0 && cerca(x.potencialSistema, x.potencialPruebas - x.estructural, 1e-12)) && /estructural|no deja pasar/.test(b12a.textoEstructural ?? '')
    && b12a.superado.length === 316 && cerca(b12a.potencial - b12a.real, b12.potencial - b12.real, 1e-12),
    `si lo que limita no son los pozos, la brecha estructural se separa y se dice (con las capacidades de antes): ${f(b12a.estructural)} bbl en 13 meses (${b12a.porCampo.filter(x => x.estructural > 0).map(x => `${x.campoId} ${f(x.estructural)}`).join(', ')}); ${b12a.superado.length} días-campo con el real sobre la capacidad declarada, que es lo que se corrigió; la brecha del libro es la misma`)
  // QA-A-06 · Contra el potencial del sistema la identidad también es exacta, por campo y en el conjunto:
  // potencial del sistema − real = Σ por tramo + sin explicar + brecha de las pruebas − estructural. Y lo que
  // cabía en la holgura de los pozos (días en que limitaba otro tramo) sale de la PE no planeada: PE + PE no
  // planeada no pasa del 100 % en ningún campo cuyas pruebas no den menos que el punto oficial (si dan menos y el
  // factor de medición no está firmado, la PE no se puede creer: sección 32, 5E·H30).
  const idSistema = x => cerca(x.brechaSistema, CH.CHOKES_Y_SIN_ASIGNAR.reduce((a, k) => a + x.porChoke[k], 0) + x.sinExplicar + x.brechaPruebas - x.estructural, 1e-9)
  comprobar(idSistema(b12a) && b12a.porCampo.every(idSistema) && b12a.cabiaEnHolgura > 0 && b12a.cabiaEnHolgura <= b12a.diferido
    && b12a.porCampo.every(x => (x.brechaPruebas < 0 || x.pe + x.peNoPlaneada <= 100 + 1e-9) && x.noPlaneadaSistema <= x.porEscalon['disponibilidad-no-planeada'] + 1e-9 && x.noPlaneadaSistema >= 0)
    && b12a.noPlaneadaSistema < b12a.porEscalon['disponibilidad-no-planeada'] && idSistema(b12) && b12.porCampo.every(idSistema),
    `contra el potencial del sistema la identidad cuadra exacta (potencial del sistema − real = Σ por tramo + sin explicar + brecha de las pruebas − estructural) y, con la planta y afuera limitando, ${f(b12a.cabiaEnHolgura)} bbl cabían en la holgura de los pozos: no costaron nada y salen de la PE no planeada (${b12a.porCampo.filter(x => x.dominante !== 'pozos' && x.dominante).map(x => `${x.campoId}: PE ${x.pe.toFixed(1)} % + no planeada ${x.peNoPlaneada.toFixed(2)} %`).join('; ')})`)
  // §8 · PE = real ÷ potencial del sistema; PE no planeada = disponibilidad no planeada ÷ potencial del sistema.
  // En un campo de gas la eficiencia de crudo no aplica (5E·H30): va en 0 y el conjunto es el de sus campos de crudo.
  const bs = RP.brechaPorChoke(TODOS, sep.desde, sep.hasta, ctx0), ef = RP.eficienciaProduccion(TODOS, sep.desde, sep.hasta, ctx0)
  const deCrudo = bs.porCampo.filter(x => !PT.CAMPOS_DE_GAS.includes(x.campoId)), sumaDe = k => deCrudo.reduce((a, x) => a + x[k], 0)
  comprobar(cerca(bs.pe, sumaDe('real') / sumaDe('potencialSistema') * 100, 1e-12) && cerca(bs.peNoPlaneada, sumaDe('noPlaneadaSistema') / sumaDe('potencialSistema') * 100, 1e-12)
    && cerca(bs.realPe, sumaDe('real'), 1e-12) && cerca(bs.potencialPe, sumaDe('potencialSistema'), 1e-12)
    && ef.porCampo.every(x => { const c = bs.porCampo.find(y => y.campoId === x.campoId)
      return PT.CAMPOS_DE_GAS.includes(x.campoId) ? x.pe === 0 && x.peNoPlaneada === 0 && !x.peCreible
        : cerca(x.pe, c.real / c.potencialSistema * 100, 1e-12) && cerca(x.peNoPlaneada, c.porEscalon['disponibilidad-no-planeada'] / c.potencialSistema * 100, 1e-12) })
    && cerca(ef.total.pe, bs.pe, 1e-12) && ef.total.peCreible === bs.peCreible,
    `PE y PE no planeada por campo y período: septiembre ${bs.pe.toFixed(1)} % y ${bs.peNoPlaneada.toFixed(2)} % en los campos de crudo (${ef.porCampo.map(x => `${x.campoId} ${x.pe.toFixed(1)} %`).join(', ')})`)
}

console.log('\n=== 25. La tubería del campo, mes a mes y antes → con TRIM (U2 §2, §7.3–§7.4, §11.1) ===')
{
  const CH = await v.ssrLoadModule('/src/entities/choke.ts')
  const RP = await v.ssrLoadModule('/src/entities/choke-reparto.ts')
  const oct = D.rangoDePeriodo('curso'), sep = D.rangoDePeriodo('cerrado')
  const tu = RP.tuberiaCampo('ceiba', oct.desde, oct.hasta, ctx0)
  const lbO = L.libro(['ceiba'], oct.desde, oct.hasta, ctx0)
  const perdido = k => tu.perdidoPeriodo.find(x => x.tramo === k)
  const pozosT = tu.tramos.find(x => x.tramo === 'pozo'), plantaT = tu.tramos.find(x => x.tramo === 'planta')
  comprobar(cerca(tu.diferido, lbO.diferido, 1e-9) && cerca(tu.perdidoPeriodo.reduce((a, x) => a + x.bbl, 0) + tu.sinTramoBbl, lbO.diferido, 1e-9)
    && Math.round(perdido('planta').bbl) === 573 && perdido('planta').equiposTop[0]?.equipo === 'P-201B' && Math.round(perdido('pozo').bbl) === 118 && perdido('pozo').equiposTop[0]?.equipo === 'LC-05'
    && Math.round(tu.sinTramoBbl) === 355 && tu.sinTramoEquipos.map(x => x.equipo).join() === 'LC-21,LC-08',
    `la tubería del campo lleva el MISMO total del libro: La Ceiba en octubre, ${f(perdido('planta').bbl)} en la planta (P-201B) + ${f(perdido('pozo').bbl)} en los pozos (LC-05) + ${f(tu.sinTramoBbl)} sin identificar = ${f(tu.diferido)} bbl`)
  // Lo que deja pasar el tramo que limita − lo que pasa hoy = perdiéndose ahora (U2 §2.2), y el tramo de cada riesgo.
  const perd = D.riesgoAhora(['ceiba'], ctx0).filter(r => r.estado === 'perdiendo')
  const enRiesgo = D.riesgoAhora(TODOS, ctx0).filter(r => r.estado === 'en-riesgo')
  // U2 §2.2 con D3: lo que dan los pozos según sus pruebas − lo que pasa hoy − lo que se pierde ahora = lo que
  // las pruebas dan de más que el punto oficial (el factor de asignación del mes; cero si coinciden).
  const pCe = CH.potencialesDelCampo('ceiba', R.AHORA.getTime(), ctx0)
  comprobar(tu.limita === 'pozos' && cerca(tu.perdiendoAhoraBpd, perd.reduce((a, r) => a + r.bblDia, 0), 1e-9)
    && cerca(pozosT.potencialBpd - tu.pasaHoyBpd - tu.perdiendoAhoraBpd, tu.brechaPruebasBpd, 1e-9) && cerca(tu.brechaPruebasBpd, pCe.pozos - pCe.pozosAsignado, 1e-9) && Math.round(tu.brechaPruebasBpd) === 497
    && cerca(tu.pasaHoyBpd, D.caudalesAhora('ceiba').crudo, 1e-12)
    && perd.every(r => RP.tramoDeRiesgo(r, ctx0) === (r.equipo === 'P-201B' ? 'planta' : null)) && enRiesgo.every(r => RP.tramoDeRiesgo(r, ctx0) === (r.tipo === 'electrosumergible' ? 'pozo' : 'planta'))
    && plantaT.disponibleHoy?.agua.valor === 178500 && plantaT.disponibleHoy.unidad === 'bbl/d de crudo' && plantaT.disponibleHoy.valor > 0 && plantaT.potencialBpd === 13000,
    `lo que dan los pozos − lo que pasa hoy − perdiéndose ahora = lo que las pruebas dan de más que el punto oficial: ${f(pozosT.potencialBpd)} − ${f(tu.pasaHoyBpd)} − ${f(tu.perdiendoAhoraBpd)} = ${f(tu.brechaPruebasBpd)} bbl/d (P-201B en la planta; LC-21 sin identificar); el tramo de cada riesgo; «${plantaT.disponibleHoy?.texto}»`)
  // B-14 · Con P-201B parada el agua de la planta queda por debajo de lo que dan los pozos: la frase de hoy lo dice.
  const dh = plantaT.disponibleHoy
  comprobar(!!dh && cerca(dh.entraBpd, D.caudalesAhora('ceiba').agua, 1e-12) && cerca(dh.cabeBpd, Math.max(0, (178500 - dh.entraBpd) * pCe.crudoPorAgua), 1e-9) && dh.cabeBpd > 0 && dh.cabeBpd < 300
    && /^Hoy, con P-201B parada, el agua de la planta deja pasar 178\.500 bbl\/d y ya entran 174\.033: lo que den de más los pozos pasa solo hasta unos \d+ bbl\/d de crudo, hasta que vuelva\.$/.test(tu.fraseHoy ?? '')
    && RP.tuberiaCampo('morichal', oct.desde, oct.hasta, ctx0).fraseHoy === undefined,
    `con P-201B parada, «${tu.frase}» se completa con lo de hoy: «${tu.fraseHoy}»`)
  const tuS = RP.tuberiaCampo('ceiba', sep.desde, sep.hasta, ctx0), tuZ = RP.tuberiaCampo('zarza', oct.desde, oct.hasta, ctx0)
  // B-13: la frase dice dónde se trabó y qué equipos, con su familia; lo sin identificar, aparte.
  comprobar(tuS.fraseGerente === 'Se trabó sobre todo en los pozos: LC-11 y LC-04 (electrosumergibles).'
    && tu.fraseGerente === 'Se trabó sobre todo en la planta: P-201B (bomba de agua). 355 bbl todavía sin identificar.' && tuZ.campoDeGas && tuZ.limita === null && /campo de gas/.test(tuZ.frase),
    `la frase del gerente sale hecha del motor: «${tuS.fraseGerente}»; octubre: «${tu.fraseGerente}»; La Zarza, estado de campo de gas`)
  // Mes a mes por tramo: el mismo total del libro cada mes.
  const rm = RP.repartoPorMes(TODOS, ctx0), sm = L.serieMensual(TODOS, ctx0)
  comprobar(rm.length === sm.length && rm.every((m, i) => m.mes === sm[i].mes && cerca(Object.values(m.porTramo).reduce((a, x) => a + x, 0), sm[i].libro.diferido, 1e-9) && cerca(m.diferido, sm[i].libro.diferido, 1e-9)
      && m.noPlaneado['sin-asignar'] === 0 && cerca(Object.values(m.noPlaneado).reduce((a, x) => a + x, 0), RP.brechaPorChoke(TODOS, m.desde, m.hasta, ctx0).porEscalon['disponibilidad-no-planeada'], 1e-9)),
    `lo perdido por tramo, mes a mes: los ${rm.length} meses suman el diferido de cada mes del libro, y su «no planeado» es el escalón del norte (lo sin identificar no cuenta)`)
  // Antes → con TRIM, por tramo: la misma base de la línea base del libro.
  const puesta = new Date(`${C.PUESTA_EN_MARCHA}T00:00:00-05:00`)
  const lbt = RP.lineaBasePorTramo(['ceiba'], puesta, R.AHORA, ctx0), base = L.lineaBase(['ceiba'], puesta, R.AHORA, ctx0)
  const diasB = (base.hasta.getTime() - base.desde.getTime()) / 86_400_000
  const b0 = RP.brechaPorChoke(['ceiba'], base.desde, base.hasta, ctx0)
  // D4 · Lo no planeado de cada tramo es su escalón no planeado; lo sin identificar no es no planeado.
  comprobar(lbt && lbt.base.desde.getTime() === base.desde.getTime() && lbt.base.hasta.getTime() === base.hasta.getTime()
    && CH.CHOKES_Y_SIN_ASIGNAR.every(k => cerca(lbt.diferido[k].baseDia * diasB, b0.porChoke[k], 1e-9) && cerca(lbt.noPlaneado[k].baseDia * diasB, b0.porChokeEscalon[k]['disponibilidad-no-planeada'], 1e-9))
    && lbt.noPlaneado['sin-asignar'].baseDia === 0 && lbt.noPlaneado['sin-asignar'].periodoDia === 0
    && lbt.noPlaneado.planta.periodoDia < lbt.noPlaneado.planta.baseDia && lbt.noPlaneado.pozo.periodoDia > lbt.noPlaneado.pozo.baseDia,
    `antes → con TRIM, lo no planeado por tramo (${lbt?.base.nombre}): planta ${f(lbt?.noPlaneado.planta.baseDia)} → ${f(lbt?.noPlaneado.planta.periodoDia)} bbl/d, pozos ${f(lbt?.noPlaneado.pozo.baseDia)} → ${f(lbt?.noPlaneado.pozo.periodoDia)}: «${lbt?.texto}»`)
}

console.log('\n=== 26. Qué limitó cada día y el aviso «Cambió lo que limita» (CHOKE-COMPLETO §11, U2 §7) ===')
{
  const CH = await v.ssrLoadModule('/src/entities/choke.ts')
  const RP = await v.ssrLoadModule('/src/entities/choke-reparto.ts')
  const d0 = new Date(L.calendario()[0].desde)
  const s = RP.serieChoke(TODOS, d0, R.AHORA, ctx0), b = RP.brechaPorChoke(TODOS, d0, R.AHORA, ctx0), dias = L.porDia(TODOS, d0, R.AHORA, ctx0)
  const sumaK = k => s.dias.reduce((a, d) => a + d.porChoke[k], 0), sumaE = e => s.dias.reduce((a, d) => a + d.porEscalon[e], 0)
  comprobar(CH.CHOKES_Y_SIN_ASIGNAR.every(k => cerca(sumaK(k), b.porChoke[k], 1e-9)) && CH.ESCALONES.every(e => cerca(sumaE(e), b.porEscalon[e], 1e-9)) && s.dias.length === dias.length
    && s.dias.every((d, i) => cerca(Object.values(d.porChoke).reduce((a, x) => a + x, 0), dias[i].diferido, 1e-9))
    && cerca(s.dias.reduce((a, d) => a + d.estructural, 0), b.estructural, 1e-9) && cerca(s.dias.reduce((a, d) => a + d.potencialSistema, 0), b.potencialSistema, 1e-9)
    && cerca(s.dias.reduce((a, d) => a + d.brechaPruebas, 0), b.brechaPruebas, 1e-9) && s.dias.reduce((a, d) => a + d.cabiaEnHolgura, 0) === b.cabiaEnHolgura,
    `serie diaria: cada día, lo perdido por tramo suma el diferido de ese día del libro; los ${s.dias.length} días suman lo del período por tramo y por escalón`)
  // C1, paso 1: con las capacidades corregidas limitan los pozos todos los días: no hay vueltas ni avisos en el demo.
  comprobar(s.cambios.length === 0 && TODOS.every(c => s.vueltas[c] === 0) && s.dias.every(d => Object.values(d.dominante).every(k => k === 'pozos') && Object.keys(d.superado).length === 0),
    `con las capacidades del demo (corregidas el 21-oct) limitan los pozos los ${s.dias.length} días en todos los campos: ninguna vuelta del dominante y ningún aviso «Cambió lo que limita»`)
  // Coordinador, punto 2 · El aviso respeta el umbral y la persistencia. Con las capacidades de antes (el tren
  // de crudo de La Ceiba en 12.000, Guacamayo afuera en 6.800) lo que limita cambia, pero casi igual a los pozos
  // (D3: las pruebas dan 12.212 en marzo): no hay aviso. Con un historial firmado que la hace cambiar de verdad (el
  // tren de crudo en 11.500 y, desde el 1 de mayo, en 13.500) hay UN aviso, con su persistencia.
  const { sa, ba, sc } = conCapacidadesDeAntes(c => ({ sa: RP.serieChoke(TODOS, d0, R.AHORA, c), ba: RP.brechaPorChoke(TODOS, d0, R.AHORA, c), sc: RP.serieChoke(['ceiba'], d0, R.AHORA, c) }))
  const firmaCrudo = (version, fecha, bpd) => ({ version, fecha, por: 'Prueba · administrador', motivo: 'prueba', cambios: [], config: { ...ctx0.config, capacidades: [{ campoId: 'ceiba', crudo: { bpd, fuente: 'prueba' } }] } })
  const sv = RP.serieChoke(['ceiba'], d0, R.AHORA, ctx0, [firmaCrudo(1, '2025-09-01T00:00:00-05:00', 11500), firmaCrudo(2, '2026-05-01T00:00:00-05:00', 13500)])
  const persiste = x => x.cambios.every(c => {
    const i = x.dias.findIndex(d => d.dia.getTime() === c.dia.getTime())
    const siguientes = x.dias.slice(i).filter(d => d.dominante[c.campoId]).slice(0, CH.PARAMETROS_CHOKE.diasParaCambio)
    return siguientes.length === CH.PARAMETROS_CHOKE.diasParaCambio && siguientes.every(d => d.dominante[c.campoId] === c.a && !d.casiIguales[c.campoId]) && c.de !== c.a
  })
  const ceiba = sv.cambios
  comprobar(sa.vueltas.ceiba >= 1 && sa.cambios.length === 0 && sv.vueltas.ceiba === 1 && ceiba.length === 1 && ceiba[0].a === 'pozos' && ceiba[0].de === 'planta'
    && ceiba[0].dia.toISOString().startsWith('2026-05-01') && Math.round(ceiba[0].valorBpd) === Math.round(sv.dias.find(d => d.dia.getTime() === ceiba[0].dia.getTime()).potenciales.ceiba.pozos)
    && persiste(sv) && persiste(sa) && /desde el 1 de may limitan los pozos \([\d.]+ bbl\/d\); antes, la planta · tren de crudo \(11\.500\)\. .*revise «Si falla hoy»/.test(ceiba[0].texto),
    `«Cambió lo que limita» solo con más del umbral y ${CH.PARAMETROS_CHOKE.diasParaCambio} días seguidos: con las capacidades de antes La Ceiba da ${sa.vueltas.ceiba} vuelta(s) casi iguales y ningún aviso; con un cambio firmado de verdad, ${sv.vueltas.ceiba} vuelta y un aviso: «${ceiba[0]?.texto}»`)
  const sup = sc.dias.filter(d => d.superado.ceiba)
  comprobar(sup.length > 0 && sup.every(d => d.estructural === 0 && d.potencialSistema === d.potencialPruebas) && sup.length === ba.superado.filter(x => x.campoId === 'ceiba').length,
    `un día en que el real pasó la capacidad declarada no lleva brecha estructural y se avisa (con el tren de crudo de 12.000 de antes, La Ceiba: ${sup.length} días; por eso se corrigió a 13.000)`)
}

console.log('\n=== 27. La tubería del agua (CHOKE-COMPLETO §9, U2 §5) ===')
{
  const AG = await v.ssrLoadModule('/src/entities/choke-agua.ts')
  const CH = await v.ssrLoadModule('/src/entities/choke.ts')
  const RP = await v.ssrLoadModule('/src/entities/choke-reparto.ts')
  const a = AG.tuberiaAgua('ceiba', ctx0, V0), tr = k => a.tramos.find(x => x.tramo === k)
  const p201b = tr('bombas').bombas.find(x => x.id === 'P-201B'), tk = tr('tanques').tanques[0]
  const perfil = B.perfilBomba('P-201B', 'ceiba'), abierta = B.paradasDe('P-201B', 'ceiba').find(e => !e.fin)
  const reportado = D.paradaMedida(abierta, ctx0, V0).colchon.previsto.horas, pr = D.prediccion(perfil, ctx0)
  comprobar(tr('bombas').bombas.length === 3 && tr('bombas').bombas.every(x => x.placaBpd === 90000 && x.capacidadBpd === perfil.capacidadBpd) && tr('bombas').potencialBpd === 3 * 89250
    && p201b.mueveBpd === 74200 && p201b.mueveBpd === D.aguaQueMueve(perfil).bpd && p201b.respaldoLibreBpd === 30100 && 2 * (p201b.capacidadBpd - p201b.mueveBpd) === p201b.respaldoLibreBpd
    && tk.capacidadBbl === 30000 && tk.colchon.cuando === 'al-parar' && tk.colchon.evento === abierta.id && tk.colchon.horas === reportado && tk.colchon.horas.toFixed(2) === '1.84'
    && tr('inyectores').potencialBpd === 267750 && a.sinUna.aguaSinSalidaBpd === 44100 && a.sinUna.aguaSinSalidaBpd === pr.aguaSinSalidaBpd,
    `la tubería del agua de La Ceiba: 3 bombas de 90.000 de placa que dan ${f(p201b.capacidadBpd)} cada una (la cifra única de diferido.ts: 2 × (89.250 − ${f(p201b.mueveBpd)}) = el respaldo de ${f(p201b.respaldoLibreBpd)}), tanque de ${f(tk.capacidadBbl)} bbl con el colchón que ya se reporta, ${tk.colchon.horas.toFixed(2)} h; sin P-201B quedan ${f(a.sinUna.aguaSinSalidaBpd)} bbl/d sin salida`)
  const agua = P.pozosDe('ceiba').filter(w => w.pruebas.length).reduce((s, w) => s + L.aguaDePrueba(w, R.AHORA.getTime()), 0)
  comprobar(cerca(tr('producida').potencialBpd, agua, 1e-12) && a.tramos.filter(x => x.potencialBpd !== null).every(x => cerca(x.crudoBpd, x.potencialBpd * a.crudoPorAgua, 1e-12))
    && Math.abs(tr('inyectores').crudoBpd - CH.potencialesDelCampo('ceiba', R.AHORA.getTime(), ctx0).trenes.find(t => t.tren === 'agua').enCrudo) <= 0.5
    && a.dominante === 'producida' && !a.limita && a.angosto === 'inyectores' && Math.round(a.sobraBpd) === 43675 && tr('bombas').disponibleHoy?.valor === 178500
    && a.frases[0] === 'Con las tres bombas, cabe más agua: 43.675 bbl/d (sin contar la capacidad del tratamiento de agua: no tiene dato).' && a.frases.at(-1) === 'Cerrando primero los más acuatosos dejan de producirse 1.426 bbl/d de crudo; cerrando parejo, 2.236.'
    // F3 · P-agua-1 (X4 §6.1): la misma tubería en una frase de campo, sin las cuentas (van a la ⓘ).
    && a.fraseCorta === 'Con las tres bombas, al agua le sobra espacio. Si para una, hay que cerrar pozos.',
    `cada tramo en agua y en crudo (con el crudo de las pruebas, D3); con el tren completo el agua no limita, es lo más frágil: ${a.texto}`)
  // B-16 · Las bombas y los inyectores dan lo mismo al barril: se dice como empate, con los dos nombres; «cabe más», no «le sobran».
  // B-17 · Lo de «si para» va en condicional y lo que ya pasó, en pasado: no dice «quedan sin salida» con los pozos ya cerrados.
  comprobar(a.empate && a.casiIguales?.join() === 'bombas,inyectores' && a.frases[1] === 'Bombas de agua y pozos inyectores dan exactamente lo mismo: 267.750 bbl/d. Lo que se gane en uno lo frena el otro; la admisión de los inyectores no está firmada: el demo la deduce del mismo límite del cabezal que deja a cada bomba en su capacidad.'
    && a.frases.includes('Si para una con todos los pozos produciendo, faltan 44.100 bbl/d de salida: el tanque se llena en 1,8 h y hay que cerrar pozos.')
    && a.frases.includes('P-201B está parada desde el 2 de oct, 03:52: se cerraron LC-07 y LC-16 y dejan de producirse 1.665 bbl/d de crudo.')
    && !/le sobran|quedan [\d.]+ bbl\/d sin salida/.test(a.texto),
    `el agua dice con quién está igual y en qué tiempo: «${a.frases[1]}» · «${a.frases.find(x => x.startsWith('Si para una'))}» · «${a.frases.find(x => x.startsWith('P-201B está parada'))}»`)
  // B-18 · La Zarza es de gas: el agua no se pasa a crudo, y sin la admisión de los inyectores no se dice qué limita.
  const zaA = AG.tuberiaAgua('zarza', ctx0, V0)
  // Sin la admisión firmada no se puede decir que las bombas limiten; con el agua de los pozos por debajo de lo conocido, se dice lo que cabe sin contarla.
  const sinAdmision = { ...ctx0, config: { ...ctx0.config, capacidades: [{ campoId: 'zarza', bombas: [{ equipo: 'P-201B', bpd: 1000, fuente: 'placa' }] }] } }
  const zaB = AG.tuberiaAgua('zarza', sinAdmision, V0)
  comprobar(zaA.campoDeGas && zaA.crudoPorAgua === 0 && zaA.tramos.every(t => t.crudoBpd === null) && !zaA.limita && zaA.faltanParaDecir.includes('inyectores')
    && /^La Zarza es un campo de gas: su agua se dice en agua, sin pasarla a crudo\.$/.test(zaA.frases[0]) && /^Con su bomba, cabe más agua: [\d.]+ bbl\/d \(sin contar la capacidad del tratamiento de agua y la admisión de los inyectores: no tienen dato\)\.$/.test(zaA.frases[1])
    && !/de crudo/.test(zaA.texto) && zaB.dominante === 'bombas' && !zaB.limita && /^No se puede decir qué limita el agua: falta la capacidad del tratamiento de agua y la admisión de los inyectores\. La firma el administrador\.$/.test(zaB.frases[1]),
    `La Zarza (gas): «${zaA.frases.slice(0, 2).join(' ')}»; con las bombas por debajo del agua de los pozos y sin la admisión firmada: «${zaB.frases[1]}»`)
  const am = AG.tuberiaAgua('morichal', ctx0, V0), prM = D.prediccion(B.perfilBomba('P-201B', 'morichal'), ctx0)
  const todas = TODOS.map(c => AG.tuberiaAgua(c, ctx0, V0))
  comprobar(am.tramos.find(x => x.tramo === 'tanques').tanques[0].colchon.cuando === 'si-para-ahora' && am.tramos.find(x => x.tramo === 'tanques').tanques[0].colchon.horas === prM.colchon.horas
    && /faltan 40\.400 bbl\/d de salida: el tanque se llena en 10 h/.test(am.texto) && /783 bbl\/d de crudo; cerrando parejo, 1\.222/.test(am.texto)
    && todas.every(x => x.tratamientoBpd === null && x.tramos.find(t => t.tramo === 'tratamiento').potencialBpd === null)
    && todas.every(x => x.tramos.every(t => t.tramo === 'tanques' || (t.potencialBpd === null) === !!t.sinDato)) && AG.tuberiaAgua('guacamayo', ctx0, V0).admisionInyectoresBpd === null,
    `un tramo sin dato en el demo va «sin dato», nunca inventado (${todas.map(x => `${x.campoId}: ${x.sinDato.join(', ') || 'ninguno'}`).join('; ')}); con la bomba en marcha el colchón es el de «si para ahora» (Morichal ${prM.colchon.horas.toFixed(1)} h)`)
}

console.log('\n=== 28. «Si falla hoy» para todos los equipos (CHOKE-COMPLETO §10, U2 §6) ===')
{
  const CR = await v.ssrLoadModule('/src/entities/criticidad.ts')
  const todas = TODOS.flatMap(c => { const r = CR.criticidadDelCampo(c, ctx0); return [...r.ranking, ...r.parados] })
  // §14.9 · La criticidad de cada bomba instrumentada es el costo por falla de diferido.ts en el mismo instante.
  const bombas = TODOS.flatMap(c => ['P-201B', 'MPP-301'].map(id => B.perfilBomba(id, c)).filter(Boolean))
  const filas = bombas.map(p => ({ p, cr: todas.find(x => x.campoId === p.campoId && x.equipo === p.equipo), pr: D.prediccion(p, ctx0), cf: D.costoDeBomba(p, D.prediccion(p, ctx0), L.historialDeEquipo(p.campoId, p.equipo, ctx0)) }))
  const riesgo = D.riesgoAhora(TODOS, ctx0)
  const enMarcha = filas.filter(x => !x.pr.parada), parada = filas.find(x => x.pr.parada)
  comprobar(filas.length === 4 && enMarcha.length === 3 && enMarcha.every(({ cr, cf }) => cr && cr.costoFalla === cf.costoFalla && (cf.colchonH === undefined || cr.colchonH === cf.colchonH))
    && filas.every(({ cr, pr }) => cr && cr.bpd === pr.crudoBpd && cr.tramo === 'planta' && cr.vigilado && cr.grupo === 'medido')
    && riesgo.filter(r => r.estado === 'en-riesgo' && B.perfilBomba(r.equipo, r.campoId)).every(r => todas.find(x => x.campoId === r.campoId && x.equipo === r.equipo)?.costoFalla === r.costoFallaHoy),
    `la criticidad de cada bomba con instrumento en marcha es el costo por falla de diferido.ts en el mismo instante: ${enMarcha.map(({ p, cr }) => `${p.equipo} de ${p.campoId} ${f(cr.costoFalla ?? 0)} bbl`).join(', ')}`)
  // QA-A-09 · La bomba ya parada: «cuando vuelva, si falla otra vez» se mide con el colchón típico al parar (la
  // mediana del nivel con que se pararon sus paradas), no con el de ahora (el tanque con ella parada: minutos).
  const niveles = B.paradasDe('P-201B', 'ceiba').flatMap(e => (e.nivelAlParar ? [e.nivelAlParar.pct] : [])).sort((x, y) => x - y)
  const medianaNivel = niveles.length % 2 ? niveles[(niveles.length - 1) / 2] : (niveles[niveles.length / 2 - 1] + niveles[niveles.length / 2]) / 2
  const tkCe = C.tanqueDe(ctx0.config, 'ceiba', 'P-201B'), hAlVolver = (tkCe.altoAlto - medianaNivel / 100) * tkCe.capacidadBbl / (parada.pr.aguaSinSalidaBpd / 24)
  const cfVolver = D.costoDeBomba(parada.p, { ...parada.pr, colchon: { ...parada.pr.colchon, horas: hAlVolver, agotado: hAlVolver <= 0 } }, L.historialDeEquipo('ceiba', 'P-201B', ctx0))
  comprobar(parada && parada.p.campoId === 'ceiba' && parada.pr.colchon.horas < 0.2 && cerca(parada.cr.colchonH, hAlVolver, 1e-12) && hAlVolver > 1.5 && hAlVolver < 2.5
    && cerca(parada.cr.costoFalla, cfVolver.costoFalla, 1e-12) && parada.cr.costoFalla < parada.cf.costoFalla
    && new RegExp(`Cuando vuelva, si falla otra vez: 1\\.426 bbl/d cerrando en el orden de TRIM después de unas \\d+(,\\d)? h de colchón \\(con el tanque al ${String(medianaNivel).replace('.', ',')} %, como suele estar al parar\\)`).test(parada.cr.porque),
    `P-201B de La Ceiba ya parada: «${parada?.cr.porque}» (una falla ≈ ${f(parada?.cr.costoFalla ?? 0)} bbl con ${(hAlVolver).toFixed(2)} h de colchón; con el de ahora, ${(parada?.pr.colchon.horas * 60).toFixed(0)} min, daba ${f(parada?.cf.costoFalla ?? 0)})`)
  // Coordinador, punto 7 · Las hermanas sin instrumento, con su capacidad y su papel: suben cuando P-201B está parada.
  const ce = CR.criticidadDelCampo('ceiba', ctx0)
  const a = ce.ranking.find(x => x.equipo === 'P-201A'), cc = ce.ranking.find(x => x.equipo === 'P-201C')
  const esperado = D.ordenDeCierre('ceiba', D.caudalesAhora('ceiba').agua - 89250, R.AHORA.getTime()).crudoBpd
  comprobar(a && cc && cerca(a.bpd, esperado, 1e-12) && Math.round(a.bpd) === 3059 && a.colchonH < 0.05 && !a.vigilado && a.subio && cerca(cc.bpd, a.bpd, 1e-12)
    && /P-201A y P-201C subieron al puesto \d+ porque P-201B está parada/.test(ce.cambioHoy ?? '') && ce.parados.some(x => x.equipo === 'P-201B' && cerca(x.perdiendoBpd, D.prediccion(B.perfilBomba('P-201B', 'ceiba'), ctx0).perdiendo.bblDia, 1e-12)),
    `las hermanas sin instrumento cuentan: si P-201A falla hoy con P-201B parada, ${f(a?.bpd)} bbl/d después de ${Math.round((a?.colchonH ?? 0) * 60)} min de colchón; «${ce.cambioHoy}»; P-201B va en «Perdiéndose ahora», no en la lista`)
  // Servicios con la regla «se cierra lo que esté produciendo», estén o no en alarma; un respaldo en línea cuesta cero.
  const produciendo = P.pozosDe('ceiba').filter(w => P.estadoAhora(w).produce).reduce((s, w) => s + L.crudoAsignado(w), 0)
  // D6 (QA-A-04, B-06) · Los servicios: un techo («hasta», si cierran todos sus pozos) va en su grupo, después de lo
  // medido; un respaldo que está bien cuesta 0 (§14.7) y uno ya en uso vuelve al techo (K-101: 2 de 3 unidades);
  // la evacuación (LACT-01, TK-102) y el compresor (C-401) van sin dato con su porqué (U2 §6.3).
  const se2 = ce.ranking.find(x => x.equipo === 'SE-2'), h302 = ce.ranking.find(x => x.equipo === 'H-302'), k101 = ce.ranking.find(x => x.equipo === 'K-101')
  const sinCifra = ['LACT-01', 'TK-102', 'C-401'].map(id => ce.ranking.find(x => x.equipo === id))
  comprobar(se2 && cerca(se2.bpd, produciendo, 1e-12) && se2.estimacion && se2.grupo === 'techo' && se2.puesto === null && se2.tramo === 'planta' && !riesgo.some(r => r.campoId === 'ceiba' && r.equipo === 'SE-2')
    && h302?.bpd === 0 && h302.grupo === 'medido' && /respaldo/.test(h302.sinDato ?? '')
    && k101?.grupo === 'techo' && cerca(k101.bpd, produciendo, 1e-12) && /respaldo ya está en uso hoy \(2 de 3 unidades en servicio/.test(k101.sinDato ?? '')
    && sinCifra.every(x => x && x.bpd === null && x.grupo === 'sin-dato' && x.puesto === null) && /colchón del tanque de crudo/.test(sinCifra[0].sinDato) && /colchón del tanque de crudo/.test(sinCifra[1].sinDato) && /a qué pozos cierra/.test(sinCifra[2].sinDato)
    && ce.ranking.filter(x => x.grupo === 'techo').every(x => x.familia === 'servicio' && cerca(x.bpd, produciendo, 1e-12)),
    `los servicios: SE-2 y V-101 «hasta ${f(se2?.bpd)} bbl/d» en el grupo de los techos; K-101 también (${k101?.sinDato}); H-302 cero mientras su respaldo en línea esté bien; LACT-01 y TK-102 sin dato (${sinCifra[0]?.sinDato}); C-401 sin dato (${sinCifra[2]?.sinDato})`)
  // QA-R, vecino 1 · Un techo es «hasta N» en todas partes: K-101 en Riesgo y Turno («En riesgo», «si para») lleva
  // la misma cifra que en «Si falla hoy» y el motor la marca como techo; lo calculado (bombas, electrosumergibles,
  // lo que ya se pierde) no lleva la marca.
  const k101R = riesgo.find(r => r.campoId === 'ceiba' && r.equipo === 'K-101' && r.estado === 'en-riesgo')
  comprobar(k101R?.techo === true && cerca(k101R.bblDia, k101?.bpd ?? -1, 1e-9) && riesgo.filter(r => r.techo).every(r => r.estado === 'en-riesgo' && !r.altoImpacto && !B.perfilBomba(r.equipo, r.campoId))
    && riesgo.filter(r => r.estado === 'perdiendo' || B.perfilBomba(r.equipo, r.campoId) || r.tipo === 'electrosumergible').every(r => r.techo === undefined),
    `K-101 de La Ceiba en «En riesgo»: ${f(k101R?.bblDia ?? 0)} bbl/d con la marca de techo (la misma cifra de «Si falla hoy»: hasta ${f(k101?.bpd ?? 0)}); lo calculado va sin ella`)
  // Donde K-101 tiene las tres unidades en servicio (3 de 3), cuesta 0 mientras el respaldo esté bien.
  const sanos = TODOS.filter(c => c !== 'zarza' && EQ.equipoEnCampo('K-101', c)?.dispositivos.some(x => x.tag === 'ZI-1011' && x.valor === '3 de 3'))
  const k101Bien = sanos.map(c => CR.criticidadDelCampo(c, ctx0).ranking.find(x => x.equipo === 'K-101')).filter(Boolean)
  comprobar(sanos.length > 0 && k101Bien.length === sanos.length && k101Bien.every(x => x.bpd === 0 && x.grupo === 'medido' && /mientras el respaldo esté bien \(3 unidades \(N\+1\)\)/.test(x.sinDato ?? '')),
    `donde K-101 tiene las tres unidades en servicio (${sanos.join(', ')}), cuesta 0 mientras el respaldo esté bien («${k101Bien[0]?.porque}»)`)
  // Electrosumergible y bombeo mecánico: el crudo de su pozo, sin colchón; el costo de una falla es el de «en riesgo».
  const espR = riesgo.filter(r => r.estado === 'en-riesgo' && r.tipo === 'electrosumergible')
  comprobar(ce.ranking.filter(x => x.familia === 'electrosumergible' || x.familia === 'bombeo-mecanico').every(x => x.bpd === L.crudoAsignado(P.pozoDe('ceiba', x.equipo)) && x.colchonH === undefined && x.tramo === 'pozo' && x.servidos === 1)
    && espR.every(r => todas.find(x => x.campoId === r.campoId && x.equipo === r.equipo)?.costoFalla === r.costoFallaHoy),
    `electrosumergible y bombeo mecánico: el crudo de su pozo, sin colchón, «en el pozo»; el costo de una falla de electrosumergible es el de «en riesgo» (${espR.length} hoy)`)
  // §14.7 · Una falla que la holgura o el respaldo absorbe cuesta 0 bbl/d; la lista va de mayor a menor y deja aparte lo que no se puede medir.
  const gu = CR.criticidadDelCampo('guacamayo', ctx0).ranking.find(x => x.equipo === 'P-201B')
  const GR = { medido: 0, techo: 1, 'sin-dato': 2 }
  const enOrden = xs => xs.every((x, i) => i === 0 || GR[xs[i - 1].grupo] < GR[x.grupo] || (GR[xs[i - 1].grupo] === GR[x.grupo] && (xs[i - 1].bpd ?? -1) >= (x.bpd ?? -1)))
  const za = CR.criticidadDelCampo('zarza', ctx0), port = CR.criticidad(TODOS, ctx0)
  comprobar(gu && gu.bpd === 0 && gu.costoFalla === 0 && enOrden(ce.ranking) && enOrden(port) && ce.ranking.every(x => x.alcance !== 'tercero')
    && ce.ranking[0].grupo === 'medido' && ['P-201A', 'P-201C'].every(id => ce.ranking.find(x => x.equipo === id)?.puesto === 1)
    && ce.sinCalcular.every(x => !ce.ranking.some(y => y.equipo === x.equipo)) && TODOS.every(c => CR.criticidadDelCampo(c, ctx0).ranking.length > 0)
    && za.campoDeGas === 'La Zarza es un campo de gas: lo que cuesta una falla en gas todavía no se calcula.' && za.ranking.every(x => x.bpd === null && x.grupo === 'sin-dato' && x.puesto === null)
    && port.filter(x => x.campoId === 'zarza').every(x => x.bpd === null),
    `una falla que el respaldo absorbe cuesta 0 bbl/d (P-201B de Guacamayo: «${gu?.porque}»); primero lo medido de mayor a menor (P-201A y P-201C, sin instrumento, en el puesto 1), después los techos y lo sin dato; La Zarza sin cifras («${za.campoDeGas}»); lo que no se puede medir va aparte (${ce.sinCalcular.map(x => x.equipo).join(', ')})`)
}

console.log('\n=== 29. Tanda 4: el mercado, «Todavía no sé», las capacidades firmadas y lo que piden las pantallas ===')
{
  const CH = await v.ssrLoadModule('/src/entities/choke.ts')
  const RP = await v.ssrLoadModule('/src/entities/choke-reparto.ts')
  const CR = await v.ssrLoadModule('/src/entities/criticidad.ts')
  const CAP = await v.ssrLoadModule('/src/entities/capacidades.ts')
  const AG = await v.ssrLoadModule('/src/entities/choke-agua.ts')
  const ahora = R.AHORA.getTime()
  const lbH = L.libro(TODOS, new Date(L.calendario()[0].desde), R.AHORA, ctx0)
  // ZA-06: «el comprador nominó menos» es el mercado, afuera, con responsable externo (decisión del coordinador, punto 1).
  const za = lbH.tramos.filter(t => t.pozo.campoId === 'zarza' && t.causa.tipo === 'declarada' && /comprador nominó/.test(t.causa.declarado?.texto ?? ''))
  const chZa = za.map(t => CH.chokeDeTramo(t, ctx0))
  const libre = lbH.tramos.find(t => t.causa.tipo === 'declarada' && !/comprador/.test(t.causa.declarado?.texto ?? ''))
  comprobar(za.length === 6 && chZa.every(c => c?.choke === 'exportacion' && c.subnivel === 'mercado' && c.alcance === 'tercero' && !c.pregunta)
    && za.every(t => CH.escalonesDe(t, CH.chokeDeTramo(t, ctx0), ctx0)[0][0] === 'capacidad') && za.some(t => t.pozo.id === 'ZA-06')
    && CH.chokeDeTramo(libre, ctx0)?.choke === 'pozo' && !!CH.chokeDeTramo(libre, ctx0)?.pregunta,
    `las ${za.length} declaraciones «El comprador nominó menos gas» de La Zarza (ZA-06 entre ellas) son afuera, en el mercado, con responsable externo y escalón de capacidad: «${chZa[0]?.porque}»; otra declaración libre sigue sin interpretarse (${libre?.pozo.id}: el pozo, con su pregunta)`)
  const bZa = RP.brechaPorChoke(['zarza'], new Date(L.calendario()[0].desde), R.AHORA, ctx0)
  comprobar(bZa.porChoke.exportacion > 0 && cerca(bZa.porChoke.exportacion, za.reduce((x, t) => x + t.bbl, 0) + lbH.tramos.filter(t => t.pozo.campoId === 'zarza' && t.causa.tipo !== 'declarada' && CH.chokeDeTramo(t, ctx0)?.choke === 'exportacion').reduce((x, t) => x + t.bbl, 0), 1e-9),
    `en La Zarza lo del comprador queda afuera: ${f(bZa.porChoke.exportacion)} bbl en 13 meses`)
  // Guacamayo: el crudo de la planta sube a 8.000 y la salida se queda en 7.500 (punto 2): sin empate artificial.
  const gu = CH.potencialesDelCampo('guacamayo', ahora, ctx0)
  comprobar(PT.CAMPO_PLANTA.guacamayo.caudales.crudoCap === 8000 && gu.exportacion === 7500 && gu.planta !== null && Math.round(gu.planta) !== Math.round(gu.exportacion)
    && gu.dominante === 'pozos' && gu.holgura.exportacion < gu.holgura.planta && /^Afuera reciben/.test(gu.texto)
    && !CAP.revisarCapacidades(undefined, CH.vistaCapacidades('guacamayo', ctx0).entrada).some(h => h.tramo === 'empate'),
    `Guacamayo: planta ${f(gu.planta)} y salida ${f(gu.exportacion)}, sin empate; lo que sigue a los pozos es la salida («${gu.texto}»)`)

  // Las capacidades: sin firma rigen las del demo, con los mismos números de antes (punto 4).
  const demoIgual = TODOS.every(c => { const k = CAP.capacidadesDe(ctx0.config, c), pl = PT.CAMPO_PLANTA[c]
    return k.crudo.valor === pl.caudales.crudoCap && k.afuera.valor === pl.chokes.evacuacion && k.mercado.valor === pl.chokes.mercado && k.agua.valor === pl.caudales.aguaCap
      && k.crudo.estado === 'demo' && !k.firmadas && !/[A-Za-z]+\.[a-z]+Cap|Chokes\.|diferido\.ts|equipos\.ts/.test([k.crudo, k.agua, k.afuera, k.mercado, k.gas, k.tratamiento, k.admision].map(x => x.fuente).join(' ')) })
  comprobar(demoIgual, 'sin firma rigen las capacidades del demo, con su estado «demo» y su fuente en palabras (ningún nombre del código): los mismos números de antes en los cinco campos')
  const firmar = (config, caps) => ({ ...ctx0, config: { ...config, capacidades: caps } })
  const ctxF = firmar(ctx0.config, [{ campoId: 'ceiba', crudo: { bpd: 11000, fuente: 'prueba' } }])
  const pF = CH.potencialesDelCampo('ceiba', ahora, ctxF), tF = RP.tuberiaCampo('ceiba', new Date('2026-10-01T00:00:00-05:00'), R.AHORA, ctxF)
  comprobar(pF.planta === 11000 && pF.dominante === 'planta' && pF.trenQueLimita === 'crudo' && pF.capacidades.crudo.estado === 'firmado' && /abrir más pozos no da nada/.test(pF.texto)
    && tF.tramos.find(x => x.tramo === 'planta').estado === 'firmado' && tF.tramos.find(x => x.tramo === 'planta').trenQueLimita === 'crudo'
    && tF.capacidades.estado === 'parte' && pF.textoCorto === 'Qué limita hoy: la planta · tren de crudo (11.000 bbl/d)',
    `firmado el tren de crudo de La Ceiba en 11.000, lo que limita hoy es la planta: «${pF.textoCorto}»; la tubería lo dice firmado («${tF.capacidades.texto}»)`)
  // Con el historial, cada día usa las capacidades que regían: firmar hoy no cambia septiembre.
  const vF = [C.versionInicial(), { version: 2, fecha: '2026-10-02T14:00:00-05:00', por: 'Hermes Leal · administrador de la implementación', motivo: 'prueba', cambios: [], config: ctxF.config }]
  const sep = [new Date('2026-09-01T00:00:00-05:00'), new Date('2026-10-01T00:00:00-05:00')]
  const b0 = RP.brechaPorChoke(['ceiba'], ...sep, ctx0), bSin = RP.brechaPorChoke(['ceiba'], ...sep, ctxF), bCon = RP.brechaPorChoke(['ceiba'], ...sep, ctxF, vF)
  const tV = RP.tuberiaCampo('ceiba', new Date('2026-10-01T00:00:00-05:00'), R.AHORA, ctxF, vF)
  comprobar(cerca(bCon.estructural, b0.estructural, 1e-9) && bSin.estructural > b0.estructural && tV.capacidades.firma?.version === 2 && /firmadas el 2 de oct por Hermes Leal/.test(tV.capacidades.texto),
    `con el historial, septiembre se mide con las capacidades que regían (estructural ${f(bCon.estructural)} = ${f(b0.estructural)} bbl; sin el historial serían ${f(bSin.estructural)}); la tubería dice quién y cuándo las firmó: «${tV.capacidades.texto}»`)
  // La revisión de lo que se va a firmar (U2 §8.4): las mismas reglas en la pantalla y en el servidor.
  const vista = CH.vistaCapacidades('ceiba', ctx0, V0)
  const rev = prop => CAP.revisarCapacidades({ campoId: 'ceiba', ...prop }, vista.entrada)
  const bajo = rev({ crudo: { bpd: 5000, fuente: 'placa' } }), sinFuente = rev({ afuera: { bpd: 14000, fuente: 'otra' } }), grande = rev({ crudo: { bpd: 17000, fuente: 'placa' } })
  const empata = rev({ afuera: { bpd: 13000, fuente: 'contrato' } }), explicado = rev({ afuera: { bpd: 13000, fuente: 'contrato' }, explicacionEmpate: 'El oleoducto se dimensionó con la planta' })
  comprobar(vista.entrada.maximoCrudo && vista.entrada.maximoCrudo.bpd > 11000 && bajo.some(h => h.tramo === 'crudo' && h.bloquea && /ya pasaron/.test(h.texto))
    && sinFuente.some(h => h.tramo === 'afuera' && h.bloquea && /de dónde sale/.test(h.texto)) && grande.some(h => h.tramo === 'crudo' && !h.bloquea && /cambia 31 %/.test(h.texto))
    && empata.some(h => h.tramo === 'empate' && h.bloquea) && explicado.some(h => h.tramo === 'empate' && !h.bloquea) && !explicado.some(h => h.bloquea)
    && !vista.hallazgos.some(h => h.bloquea) && vista.hallazgos.some(h => h.tramo === 'fuentes'),
    `la revisión: menos de lo que ya pasó (${f(vista.entrada.maximoCrudo?.bpd ?? 0)} bbl/d el ${R.fechaCorta(vista.entrada.maximoCrudo?.dia ?? R.AHORA)}) bloquea; sin fuente bloquea; un cambio grande pide confirmar sin bloquear; un empate exacto bloquea hasta que se explica («${empata.find(h => h.tramo === 'empate')?.texto}»)`)
  const malas = CAP.validarCapacidades([{ campoId: 'nada', crudo: { bpd: 1, fuente: 'placa' } }, { campoId: 'ceiba', crudo: { bpd: -1, fuente: 'placa' }, bombas: [{ equipo: 'P-999', bpd: 100, fuente: 'placa' }] }, { campoId: 'ceiba' }])
  const cfgF = { ...ctx0.config, capacidades: [{ campoId: 'ceiba', crudo: { bpd: 11000, fuente: 'prueba' } }, { campoId: 'guacamayo', crudo: null, afuera: { bpd: 7500, fuente: 'contrato' }, explicacionEmpate: '  ' }] }
  const norm = C.normalizarConfig(cfgF)
  comprobar(malas.some(e => /«nada» no es un campo/.test(e)) && malas.some(e => /mayor que cero/.test(e)) && malas.some(e => /P-999 no es una bomba/.test(e)) && malas.some(e => /dos veces/.test(e))
    && !norm.capacidades[1].crudo && !('explicacionEmpate' in norm.capacidades[1]) && C.normalizarConfig({ ...ctx0.config, capacidades: [] }).capacidades === undefined
    && C.diferencias(ctx0.config, norm).some(x => x === 'Capacidades de La Ceiba (se firman por primera vez): tren de crudo 11.000 bbl/d de crudo (prueba de capacidad)')
    && C.camposTocados(ctx0.config, norm).join() === 'ceiba,guacamayo' && C.validarConfig(norm, ctx0.config, '2026-10-01', ahora).length === 0,
    'las capacidades firmadas se validan en la forma (campo registrado, una vez, número mayor que cero, bomba del tren), se normalizan, el historial las dice en palabras y tocan su campo')

  // «Todavía no sé» (punto 3): el motor no adivina; el tramo de sus paradas queda en falta.
  const ctxPS = { ...ctx0, config: { ...ctx0.config, topologiaPorSaber: [{ elemento: 'K-101', campoId: 'ceiba' }] } }
  const aire = lbH.tramos.filter(t => t.pozo.campoId === 'ceiba' && t.causa.equipo === 'K-101')
  const crPS = CR.criticidadDelCampo('ceiba', ctxPS)
  const bPS = RP.brechaPorChoke(['ceiba'], new Date(L.calendario()[0].desde), R.AHORA, ctxPS), bBase = RP.brechaPorChoke(['ceiba'], new Date(L.calendario()[0].desde), R.AHORA, ctx0)
  comprobar(aire.length > 0 && aire.every(t => CH.chokeDeTramo(t, ctxPS) === null && CH.porSaberDe(t.causa, 'ceiba', ctxPS)?.pregunta === CH.PREGUNTA_ORIGEN)
    && cerca(bPS.porChoke['sin-asignar'] - bBase.porChoke['sin-asignar'], aire.reduce((x, t) => x + t.bbl, 0), 1e-9) && cerca(bPS.diferido, bBase.diferido, 1e-9)
    && !crPS.ranking.some(x => x.equipo === 'K-101') && crPS.sinCalcular.some(x => x.equipo === 'K-101' && /Todavía no sé/.test(x.motivo))
    && CH.topologiaDe('ceiba', ctxPS).every(e => e.elemento !== 'K-101'),
    `K-101 «por saber»: sus ${aire.length} paradas quedan sin tramo (${f(aire.reduce((x, t) => x + t.bbl, 0))} bbl pasan a «sin identificar», el total no cambia), «si falla hoy» no le inventa un costo y nada lo adivina por el tipo de falla`)
  const conTopo = { ...ctx0.config, topologia: CH.topologiaDerivada('ceiba').map(e => ({ elemento: e.elemento, choke: e.choke, alcance: e.alcance, pozos: e.pozos, campoId: 'ceiba' })), topologiaPorSaber: [{ elemento: 'SE-2', campoId: 'ceiba' }] }
  comprobar(C.validarConfig(conTopo, ctx0.config, '2026-10-01', ahora).some(e => /a la vez como «Todavía no sé»/.test(e))
    && C.diferencias(ctx0.config, { ...ctx0.config, topologiaPorSaber: [{ elemento: 'K-101', campoId: 'ceiba' }] }).some(x => /K-101 \(La Ceiba\): todavía no se sabe a qué pozos sirve/.test(x)),
    '«Todavía no sé» se firma, se dice en el historial y no puede estar a la vez contestado')
  // Topología firmada: los equipos nuevos del registro aparecen para contestar sin perder lo firmado (punto 10).
  const firmadaSinC401 = { ...ctx0, config: { ...ctx0.config, topologia: CH.topologiaDerivada('ceiba').filter(e => e.elemento !== 'C-401').map(e => ({ elemento: e.elemento, choke: e.choke, alcance: e.alcance, pozos: e.pozos, campoId: 'ceiba' })) } }
  comprobar(CH.sinResponderDe('ceiba', firmadaSinC401).map(e => e.elemento).join() === 'C-401' && CH.sinResponderDe('ceiba', ctx0).length === 0
    && CR.criticidadDelCampo('ceiba', firmadaSinC401).sinCalcular.some(x => x.equipo === 'C-401' && /nuevo en el registro/.test(x.motivo)) && CH.topologiaFirmada('ceiba', firmadaSinC401),
    'con la topología firmada, lo que el registro tiene y la firma no (C-401) queda para contestar, sin perder lo firmado')

  // D5 (QA-A-05) · «Todavía no sé» quita el tramo, no el escalón: los barriles de K-101 siguen siendo no planeados
  // (la causa se conoce: falló el aire), y la PE no planeada no baja por contestar con honestidad.
  comprobar(cerca(bPS.porEscalon['disponibilidad-no-planeada'], bBase.porEscalon['disponibilidad-no-planeada'], 1e-9) && cerca(bPS.porEscalon['sin-clasificar'], bBase.porEscalon['sin-clasificar'], 1e-9)
    && cerca(bPS.peNoPlaneada, bBase.peNoPlaneada, 1e-9) && cerca(bPS.porChokeEscalon['sin-asignar']['disponibilidad-no-planeada'] - bBase.porChokeEscalon['sin-asignar']['disponibilidad-no-planeada'], aire.reduce((x, t) => x + t.bbl, 0), 1e-9)
    && aire.every(t => CH.escalonesDe(t, CH.chokeDeTramo(t, ctxPS), ctxPS)[0][0] === 'disponibilidad-no-planeada'),
    `«Todavía no sé» deja los ${f(aire.reduce((x, t) => x + t.bbl, 0))} bbl de K-101 sin tramo pero no planeados: lo no planeado de La Ceiba sigue en ${f(bPS.porEscalon['disponibilidad-no-planeada'])} bbl y su PE no planeada en ${bPS.peNoPlaneada.toFixed(2)} %`)

  // «Si falla hoy» (punto 5): el puesto, las frases del jefe y de confiabilidad y la del desembotellamiento salen del motor.
  const ce = CR.criticidadDelCampo('ceiba', ctx0)
  const medidos = ce.ranking.filter(y => y.grupo === 'medido' && y.bpd !== null)
  comprobar(ce.ranking.every(x => x.puesto === (x.grupo !== 'medido' || x.bpd === null ? null : 1 + medidos.filter(y => y.bpd > x.bpd).length)) && ce.parados.every(x => x.puesto === null)
    && new RegExp(`subieron al puesto ${ce.ranking.find(x => x.equipo === 'P-201A').puesto} porque P-201B`).test(ce.cambioHoy)
    && /^Ojo: P-201A y P-201C valen más mientras P-201B esté parada: no conviene intervenirlas hoy\.$/.test(ce.noIntervenir ?? '')
    && /^Lo primero de la lista sin instrumento: P-201A y P-201C \(puesto \d+, 3\.059 bbl\/d si falla hoy\)/.test(ce.proximoInstrumento ?? '') && ce.avisosTrabajo.length === 0,
    `el puesto de cada fila sale del motor (los que cuestan lo mismo lo comparten) y con él las líneas de cada rol: «${ce.noIntervenir}» · «${ce.proximoInstrumento}»`)
  const p201b = L.historialDeEquipo('ceiba', 'P-201B', ctx0).bblPorFalla
  // QA-A-08 · Es historia (lo que ya costaron sus fallas), no «si falla hoy»: lo dice así.
  comprobar(ce.desembotellar === `En La Ceiba, otra bomba de agua no sube la producción: evita que una falla cierre pozos. Cada falla de P-201B le ha costado en promedio unos ${f(p201b)} bbl. Para producir más hay que sacarles más a los pozos: la planta y afuera dejan pasar más.`
    && Math.round(p201b) === 4593 && /^En Guacamayo, para producir más/.test(CR.criticidadDelCampo('guacamayo', ctx0).desembotellar) && CR.criticidadDelCampo('zarza', ctx0).desembotellar === undefined,
    `la frase de U2 §6.5, hecha en el motor: «${ce.desembotellar}»`)
  // El cruce con el programa: un trabajo sobre un equipo que hoy vale más se avisa al jefe.
  const conTrabajo = { ...ctx0, config: { ...ctx0.config, programa: [...ctx0.config.programa, { id: 'PR-PRUEBA-P201A', campoId: 'ceiba', equipo: 'P-201A', desde: '2026-10-04T07:00:00-05:00', hasta: '2026-10-04T15:00:00-05:00', motivo: 'Preventivo de la bomba' }] } }
  const av = CR.criticidadDelCampo('ceiba', conTrabajo).avisosTrabajo
  comprobar(av.length === 1 && av[0].equipo === 'P-201A' && av[0].tarea === 'PR-PRUEBA-P201A' && /^Ojo: P-201A vale más mientras P-201B esté parada: tiene programado «Preventivo de la bomba» el 4 de oct\. ¿Mover el trabajo\?$/.test(av[0].texto),
    `un trabajo programado sobre una bomba que hoy vale más se avisa: «${av[0]?.texto}»`)

  // La tubería trae lo que pidieron las pantallas (punto 9).
  const t = RP.tuberiaCampo('ceiba', new Date('2026-10-01T00:00:00-05:00'), R.AHORA, ctx0, V0)
  const tp = k => t.tramos.find(x => x.tramo === k)
  const p201 = t.perdiendoAhora.find(x => x.equipo === 'P-201B')
  const codigo = /[a-z]+Cap\b|Chokes\.|\.ts\b|caudales\.|Σ/
  comprobar(tp('planta').trenQueLimita === 'crudo' && tp('planta').disponibleHoy?.unidad === 'bbl/d de crudo' && tp('planta').disponibleHoy.agua.valor === 178500
    && cerca(tp('planta').disponibleHoy.valor, Math.round(178500 * CH.potencialesDelCampo('ceiba', ahora, ctx0).crudoPorAgua), 1e-12)
    && tp('pozo').pruebaMasVieja?.dias >= 0 && /la prueba más vieja es de hace \d+ días/.test(tp('pozo').pruebaMasVieja.texto)
    && t.medidor?.estado === 'en-linea' && /FQI-0101/.test(t.medidor.medidor) && t.capacidades.estado === 'demo' && t.capacidades.texto === 'capacidades del demo, sin firmar'
    && p201?.listaPozos.join() === 'LC-07,LC-16' && p201.desde.getTime() === Date.parse('2026-10-02T05:43:00-05:00') && cerca(t.perdiendoAhoraBpd, t.perdiendoAhora.reduce((x, y) => x + y.bpd, 0), 1e-12)
    && cerca(t.sinTramoAhoraBpd, t.perdiendoAhora.filter(x => x.tramo === null).reduce((x, y) => x + y.bpd, 0), 1e-12)
    && !t.tramos.some(x => codigo.test(x.fuente) || (x.subniveles ?? []).some(s => codigo.test(s.fuente))),
    `la tubería trae el tren que limita, lo que queda hoy en crudo («${tp('planta').disponibleHoy?.texto}»), la prueba más vieja, el medidor («${t.medidor?.texto}»), quién firmó las capacidades, desde cuándo y qué pozos se pierden ahora (P-201B: ${p201?.listaPozos.join(' y ')}), y cada fuente en palabras`)
  const ag = AG.tuberiaAgua('ceiba', ctx0, V0)
  comprobar(ag.casiIguales?.join() === 'bombas,inyectores' && ag.tramos.find(x => x.tramo === 'bombas').casiIgual && ag.tramos.find(x => x.tramo === 'inyectores').casiIgual
    && ag.tramos.find(x => x.tramo === 'producida').estado === 'pruebas' && ag.tramos.find(x => x.tramo === 'bombas').estado === 'demo' && ag.tramos.find(x => x.tramo === 'tratamiento').estado === 'sin-dato'
    && ag.tramos.every(x => !codigo.test(x.fuente)),
    `la tubería del agua dice el estado de cada tramo y lo que está casi igual: las bombas y los inyectores de La Ceiba (${ag.casiIguales?.join(' y ')}); cada fuente en palabras`)
  // B-01 · Con P-201B parada, «si para otra bomba ahora» es la misma cuenta del «si falla hoy» de las hermanas:
  // lo que entra menos lo que toman las que quedarían, el colchón del tanque y el orden de cierre de TRIM.
  const spo = ag.siParaOtra, critA = CR.criticidadDelCampo('ceiba', ctx0).ranking.find(x => x.equipo === 'P-201A')
  comprobar(spo && spo.enMarcha.join() === 'P-201A,P-201C' && spo.bomba === 'P-201A' && cerca(spo.entraBpd, D.caudalesAhora('ceiba').agua, 1e-12)
    && cerca(spo.aguaSinSalidaBpd, spo.entraBpd - (spo.cabenBpd - 89250), 1e-9) && critA && cerca(spo.crudoBpd, critA.bpd, 1e-9) && cerca(spo.colchonH, critA.colchonH, 1e-9)
    && spo.pasos.length > 0 && spo.pasos[0].pozo === 'LC-02' && spo.crudoParejoBpd > spo.crudoBpd
    && ['morichal', 'guacamayo', 'palmar', 'zarza'].every(c => AG.tuberiaAgua(c, ctx0, V0).siParaOtra === undefined),
    `si para otra bomba de reinyección ahora (P-201B ya parada): ${f(spo?.aguaSinSalidaBpd)} bbl/d de agua sin salida, ${(spo?.colchonH * 60).toFixed(0)} min de colchón y ${f(spo?.crudoBpd)} bbl/d de crudo cerrando primero los más acuatosos (parejo, ${f(spo?.crudoParejoBpd)}): lo mismo que el «si falla hoy» de P-201A; sin una bomba parada no se calcula`)

  // Un servicio ya caído dice lo de ahora, no «si cae hoy»; un medidor sin dato dice desde cuándo (mundo de prueba).
  const w = await createServer({ root: RAIZ, configFile: false, resolve: { alias: { '@': `${RAIZ}src` } }, server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'error' })
  const S = await w.ssrLoadModule('/src/entities/datos/servicios.ts'), E = await w.ssrLoadModule('/src/entities/datos/eventos-pozos.ts'), PD = await w.ssrLoadModule('/src/entities/datos/produccion-diaria.ts')
  S.EVENTOS_SERVICIOS.push({ id: 'SV-PRUEBA-CAIDO', campoId: 'palmar', equipo: 'SE-2', tipo: 'energia', inicio: '2026-10-02T10:00:00-05:00', fin: null, tag: 'prueba', texto: 'prueba' })
  E.EVENTOS_POZOS.push({ id: 'EP-PRUEBA-CAIDO-1', campoId: 'palmar', pozo: 'PA-01', inicio: '2026-10-02T10:05:00-05:00', fin: null, codigo: 'CMD', senal: 'prueba' })
  const oct = PD.PRODUCCION_DIARIA.find(m => m.campoId === 'ceiba' && m.mes === '2026-10')
  oct.dias = []
  ;(await w.ssrLoadModule('/src/entities/insumos.ts')).instalarInsumos((await w.ssrLoadModule('/src/entities/datos/index.ts')).INSUMOS_DEMO)
  const wL = await w.ssrLoadModule('/src/entities/libro.ts'), wCR = await w.ssrLoadModule('/src/entities/criticidad.ts'), wRP = await w.ssrLoadModule('/src/entities/choke-reparto.ts')
  const wctx = { config: wL.contextoInicial().config, respuestas: {} }
  const caido = wCR.criticidadDelCampo('palmar', wctx).parados.find(x => x.equipo === 'SE-2')
  const tw = wRP.tuberiaCampo('ceiba', new Date('2026-09-01T00:00:00-05:00'), R.AHORA, wctx)
  comprobar(caido && /^SE-2 está caído: se dejan de producir [\d.]+ bbl\/d ahora$/.test(caido.porque) && tw.medidor?.estado === 'sin-comunicacion' && /desde el 1 de oct/.test(tw.medidor.texto),
    `un servicio ya caído lo dice el motor («${caido?.porque}»); un medidor sin el dato del último día, también («${tw.medidor?.texto}»)`)
  await w.close()
}

console.log('\n=== 30. El árbol de pérdidas del choke: cada barril cuelga de su tramo y de los pasos del árbol (SPE-36848, «modelo expandido»; CHOKE-COMPLETO §6) ===')
{
  const CH = await v.ssrLoadModule('/src/entities/choke.ts')
  const RP = await v.ssrLoadModule('/src/entities/choke-reparto.ts')
  const AR = await v.ssrLoadModule('/src/entities/choke-arbol.ts')
  const PA = await v.ssrLoadModule('/src/entities/anh-paradas.ts')
  const CL = await v.ssrLoadModule('/src/entities/anh-clasificacion.ts')
  const KA = await v.ssrLoadModule('/src/entities/anh-catalogo.ts')
  const nodos = (n, out = []) => { out.push(n); for (const h of n.hijos) nodos(h, out); return out }
  const hojas = n => (n.hijos.length ? n.hijos.flatMap(hojas) : [n])
  const deNivel = (n, nivel) => nodos(n).filter(x => x.dimension === nivel)
  // Exacto: cada cifra de un nodo con ramas es la suma de sus ramas, en su orden, sin tolerancia.
  const sumaExacta = n => !n.hijos.length || (['bbl', 'filas', 'confirmadoBbl', 'noPlaneadaBbl'].every(k => n.hijos.reduce((a, h) => a + h[k], 0) === n[k]) && n.hijos.every(sumaExacta))
  const suma = (ps, f = () => true) => ps.filter(f).reduce((a, p) => a + p.diferidaTrimBbl, 0)
  const grupos = [...TODOS.map(c => [c]), TODOS]
  const malas = { suma: [], raiz: [], hojas: [], cotas: [], revision: [], tramo: [], equipos: [], n1: [], noPlaneada: [] }
  let arboles = 0
  for (const [nombre, r] of [['un mes cerrado', D.rangoDePeriodo('cerrado')], ['el mes en curso', D.rangoDePeriodo('curso')]]) for (const ids of grupos) {
    const ps = PA.paradasAnh(ids, r.desde, r.hasta, ctx0)
    const lb = L.libro(ids, r.desde, r.hasta, ctx0)
    const b = RP.brechaPorChoke(ids, r.desde, r.hasta, ctx0)
    const conc = PA.conciliarAnh(ps)
    for (const orden of AR.ORDENES_ARBOL) {
      const a = AR.arbolDelChoke(ids, r.desde, r.hasta, ctx0, { orden })
      const quien = `${nombre} ${ids.length === 1 ? ids[0] : 'portafolio'} (${orden})`
      arboles++
      if (!sumaExacta(a.raiz)) malas.suma.push(quien)
      if (!(cerca(a.raiz.bbl, lb.diferido, 1e-9) && cerca(a.raiz.bbl, suma(ps), 1e-9) && a.raiz.filas === ps.length
        && a.raiz.eventos === new Set(ps.map(p => p.eventoId)).size)) malas.raiz.push(`${quien}: ${a.raiz.bbl} contra ${lb.diferido}`)
      if (hojas(a.raiz).reduce((x, h) => x + h.filas, 0) !== ps.length) malas.hojas.push(quien)
      if (!nodos(a.raiz).every(n => n.confirmadoBbl <= n.bbl && n.noPlaneadaBbl <= n.bbl && n.eventos <= n.filas)) malas.cotas.push(quien)
      const rev = AR.revisarArbol(a)
      if (rev.length) malas.revision.push(`${quien}: ${rev[0].ruta} ${rev[0].texto}`)
      // D4 · Lo no planeado del árbol es el escalón del norte de sus filas, el mismo del reparto.
      if (!cerca(a.raiz.noPlaneadaBbl, b.porEscalon['disponibilidad-no-planeada'], 1e-9)) malas.noPlaneada.push(quien)
      // Σ por N1 (lo que falta es «sin-causa») = la conciliación de la ANH.
      const porN1 = {}
      for (const n of deNivel(a.raiz, 'n1')) { const k = n.valor === AR.FALTA ? 'sin-causa' : n.valor; porN1[k] = (porN1[k] ?? 0) + n.bbl }
      if (![...new Set([...Object.keys(porN1), ...Object.keys(conc.porN1)])].every(k => cerca(porN1[k] ?? 0, conc.porN1[k] ?? 0, 1e-9))) malas.n1.push(quien)
      if (orden !== 'gestion') continue
      // El primer nivel de `gestion` es el reparto por tramo de la tubería y de «Por dónde se trabó», tramo por tramo.
      const primero = Object.fromEntries(a.raiz.hijos.map(h => [h.valor, h.bbl]))
      if (!(a.raiz.hijos.every(h => h.dimension === 'tramo' && CH.CHOKES_Y_SIN_ASIGNAR.includes(h.valor))
        && CH.CHOKES_Y_SIN_ASIGNAR.every(k => cerca(primero[k] ?? 0, b.porChoke[k], 1e-9)))) malas.tramo.push(quien)
      // Y dentro de cada tramo, sus equipos son los mismos de la tubería, con los mismos barriles.
      for (const t of a.raiz.hijos) {
        const eq = {}
        for (const n of deNivel(t, 'equipo')) eq[n.valor] = (eq[n.valor] ?? 0) + n.bbl
        const es = b.porChokeEquipo[t.valor] ?? []
        if (!(es.length === Object.keys(eq).length && es.every(x => cerca(eq[x.equipo] ?? 0, x.bbl, 1e-9)))) malas.equipos.push(`${quien} · ${t.valor}`)
      }
    }
  }
  const dice = xs => (xs.length ? `: ${xs.slice(0, 4).join('; ')}` : '')
  comprobar(malas.suma.length === 0, `cada nodo = Σ de sus ramas, exacto (barriles, filas, lo confirmado y lo no planeado), en los ${arboles} árboles: cada campo y el portafolio, un mes cerrado y el mes en curso, en los tres órdenes${dice(malas.suma)}`)
  comprobar(malas.raiz.length === 0 && malas.hojas.length === 0,
    `la raíz es el diferido del libro del período (Σ diferidaTrimBbl = libro().diferido) con todas sus filas y eventos, y las hojas suman el número de filas de la ANH: ningún barril se queda afuera ni se cuenta dos veces${dice([...malas.raiz, ...malas.hojas])}`)
  comprobar(malas.tramo.length === 0 && malas.equipos.length === 0,
    `el primer nivel del orden «gestion» es brechaPorChoke().porChoke, tramo por tramo (con «sin identificar»), y dentro de cada tramo los equipos son los de porChokeEquipo${dice([...malas.tramo, ...malas.equipos])}`)
  comprobar(malas.n1.length === 0, `Σ por causa (N1) en los tres órdenes = conciliarAnh().porN1 (lo que falta = «sin-causa»)${dice(malas.n1)}`)
  comprobar(malas.cotas.length === 0 && malas.noPlaneada.length === 0 && malas.revision.length === 0,
    `lo confirmado y lo no planeado nunca pasan del nodo, lo no planeado es el escalón del norte del reparto (D4), y revisarArbol no encuentra nada: niveles en su lugar, hermanas de más a menos y lo que falta al final${dice([...malas.cotas, ...malas.noPlaneada, ...malas.revision])}`)

  // En los 13 meses: las filas cuyo paso 2 espera una respuesta cuentan donde las propone TRIM, como en la tubería.
  const hD = new Date(L.calendario()[0].desde), hH = R.AHORA
  const malasH = grupos.filter(ids => {
    const a = AR.arbolDelChoke(ids, hD, hH, ctx0), b = RP.brechaPorChoke(ids, hD, hH, ctx0)
    const primero = Object.fromEntries(a.raiz.hijos.map(h => [h.valor, h.bbl]))
    return !CH.CHOKES_Y_SIN_ASIGNAR.every(k => cerca(primero[k] ?? 0, b.porChoke[k], 1e-9)) || !sumaExacta(a.raiz)
  })
  const espera = PA.paradasAnh(['guacamayo'], hD, hH, ctx0).filter(p => !p.clasificacion.choke && p.propuesta.sugerido.choke)
  comprobar(malasH.length === 0 && espera.length > 0 && espera.every(p => p.causa.tipo === 'evacuacion' && p.propuesta.sugerido.choke === 'planta' && p.faltan.includes('choke')),
    `en los 13 meses también: las ${espera.length} filas de Guacamayo (LACT-01, ${f(suma(espera))} bbl) que esperan «¿el oleoducto o el cliente estaba recibiendo?» cuentan en la planta, donde las propone TRIM, como en la tubería; no se reparten${dice(malasH.map(x => x.join('+')))}`)

  // Los tres órdenes reparten el mismo barril.
  const sep = D.rangoDePeriodo('cerrado')
  const tres = AR.ORDENES_ARBOL.map(orden => AR.arbolDelChoke(TODOS, sep.desde, sep.hasta, ctx0, { orden }))
  comprobar(tres.every(a => cerca(a.raiz.bbl, tres[0].raiz.bbl, 1e-12) && a.raiz.filas === tres[0].raiz.filas && a.raiz.eventos === tres[0].raiz.eventos
      && cerca(a.raiz.noPlaneadaBbl, tres[0].raiz.noPlaneadaBbl, 1e-12) && a.raiz.confirmadoBbl === tres[0].raiz.confirmadoBbl)
    && tres.map(a => a.niveles.join(' → ')).join(' | ') === 'tramo → planeacion → n1 → n2 → equipo → parte | responsable → tramo → impacto → planeacion → n1 → n2 | responsable → tramo → n1 → equipo'
    && tres.every(a => a.regla === AR.REGLA_ARBOL && a.version === 'C024-2026'),
    `los tres órdenes (gestión, circular y por responsable) reparten el mismo barril: ${f(tres[0].raiz.bbl)} bbl, ${tres[0].raiz.filas} filas y ${tres[0].raiz.eventos} eventos en septiembre`)
  comprobar(/no es un orden del árbol/.test((() => { try { AR.arbolDelChoke(['ceiba'], sep.desde, sep.hasta, ctx0, { orden: 'otro' }); return '' } catch (e) { return e.message } })()),
    'un orden que no existe se rechaza en palabras')

  // La rama de la pérdida existe en el paso 3 y está vacía: no hay registro de pérdidas.
  const pasos3 = deNivel(tres[1].raiz, 'tramo').map(t => t.hijos)
  comprobar(pasos3.length > 0 && pasos3.every(hs => hs.every(h => h.dimension === 'impacto') && hs.some(h => h.valor === 'perdida' && h.bbl === 0 && h.filas === 0 && h.hijos.length === 0
      && h.texto === AR.TEXTO_PERDIDA && h.cadena === 'PERDIDA')) && !deNivel(tres[0].raiz, 'impacto').length,
    `la rama de la pérdida existe en cada paso 3 del orden de la circular (${pasos3.length}), vacía y diciendo por qué («${AR.TEXTO_PERDIDA}»): ningún barril diferido se pasa a ella`)

  // Las cadenas del árbol son las que viajan a la ANH, fila por fila, en las dos formas de salida.
  for (const version of ['C024-2026', 'DICC-V3.2']) {
    const a = AR.arbolDelChoke(TODOS, sep.desde, sep.hasta, ctx0, { orden: 'circular', version })
    const esperado = new Map(), delArbol = new Map()
    for (const p of PA.paradasAnh(TODOS, sep.desde, sep.hasta, ctx0, { version })) {
      const c = p.clasificacion
      if (!KA.PASOS.every(x => c[x])) continue
      const s = KA.cadenasAnh({ responsable: c.responsable.valor, choke: c.choke.valor, impacto: c.impacto.valor, planeacion: c.planeacion.valor, n1: c.n1.valor, n2: c.n2.valor, cauGral: c.cauGral.valor }, version)
      const k = [s.resp_par, s.choke_mod, s.dif_perd, s.pla_no_plan, s.cau_niv1, s.cau_niv2].join(' | ')
      esperado.set(k, (esperado.get(k) ?? 0) + p.diferidaTrimBbl)
    }
    const bajar = (n, camino) => {
      const c = n.dimension === 'raiz' ? camino : [...camino, n.cadena]
      if (n.hijos.length) { for (const h of n.hijos) bajar(h, c); return }
      if (n.filas && c.length === 6 && c.every(Boolean)) delArbol.set(c.join(' | '), (delArbol.get(c.join(' | ')) ?? 0) + n.bbl)
    }
    bajar(a.raiz, [])
    comprobar(esperado.size > 0 && esperado.size === delArbol.size && [...esperado].every(([k, x]) => cerca(delArbol.get(k) ?? NaN, x, 1e-9)) && a.version === version,
      `${version}: las cadenas del árbol son las de cadenasAnh fila por fila (${esperado.size} cadenas de 6 pasos; por ejemplo «${[...esperado.keys()][0]}»)`)
  }

  // Lo que dijeron las personas: lo confirmado sube en su rama; lo corregido mueve sus barriles, sin repartir.
  const oct = D.rangoDePeriodo('curso')
  const filasOct = PA.paradasAnh(['ceiba'], oct.desde, oct.hasta, ctx0)
  const EDWIN = { id: 'u-conf', nombre: 'Edwin Maestre' }, NELSON = { id: 'u-sup', nombre: 'Nelson Ortiz' }, HORA = '2026-10-02T14:30:00-05:00'
  const p201 = filasOct.find(p => p.causa.equipo === 'P-201B' && p.estado === 'propuesta')
  const confirmada = PA.confirmarParada(p201, 'conf', EDWIN, HORA)
  const a1 = AR.arbolDelChoke(['ceiba'], oct.desde, oct.hasta, ctx0, { guardadas: new Map([[p201.eventoId, confirmada.clasificacion]]) })
  const delEvento = suma(filasOct, p => p.eventoId === p201.eventoId)
  const planta1 = a1.raiz.hijos.find(h => h.valor === 'planta')
  comprobar(confirmada.estado === 'confirmada' && cerca(a1.raiz.confirmadoBbl, delEvento, 1e-12) && cerca(planta1.confirmadoBbl, delEvento, 1e-12) && sumaExacta(a1.raiz),
    `lo que confirma una persona sube a «confirmado» en su rama: confiabilidad confirma los 6 pasos de ${p201.pozo} (P-201B) y la planta de La Ceiba en octubre queda con ${f(planta1.confirmadoBbl)} de ${f(planta1.bbl)} bbl confirmados`)
  const pozo = filasOct.find(p => p.clasificacion.choke?.valor === 'pozo')
  const corregida = CL.declararPaso(pozo.clasificacion, 'choke', 'planta', NELSON, 'sup', HORA)
  const a0 = AR.arbolDelChoke(['ceiba'], oct.desde, oct.hasta, ctx0)
  const a2 = AR.arbolDelChoke(['ceiba'], oct.desde, oct.hasta, ctx0, { guardadas: new Map([[pozo.eventoId, corregida]]) })
  const de = (a, k) => a.raiz.hijos.find(h => h.valor === k)?.bbl ?? 0
  const movido = suma(filasOct, p => p.eventoId === pozo.eventoId)
  comprobar(corregida.choke.procedencia === 'corregido' && movido > 0 && cerca(de(a2, 'pozo'), de(a0, 'pozo') - movido, 1e-9) && cerca(de(a2, 'planta'), de(a0, 'planta') + movido, 1e-9)
    && cerca(a2.raiz.bbl, a0.raiz.bbl, 1e-12) && AR.revisarArbol(a2).length === 0,
    `lo que corrige una persona mueve sus barriles de rama: el supervisor dice que ${pozo.pozo} se trabó en la planta y ${f(movido)} bbl pasan del pozo a la planta; la raíz no cambia`)

  // Lo que muestra el demo: La Ceiba en octubre y en septiembre, por tramo.
  const t = (a, k) => a.raiz.hijos.find(h => h.valor === k)
  const pl = t(a0, 'planta'), sin = t(a0, 'sin-asignar')
  const sepCe = AR.arbolDelChoke(['ceiba'], sep.desde, sep.hasta, ctx0)
  const pozoSep = t(sepCe, 'pozo'), n1Mayor = pozoSep.hijos[0].hijos[0]
  comprobar(pl.noPlaneadaBbl === pl.bbl && pl.hijos[0].hijos[0].valor === 'NP_PROC' && deNivel(pl, 'equipo').map(n => n.valor).join() === 'P-201B'
    && sin.noPlaneadaBbl === 0 && sin.hijos[0].valor === AR.FALTA && deNivel(sin, 'equipo').map(n => n.valor).join() === 'LC-21,LC-08'
    && a0.raiz.hijos.map(h => h.valor).join() === 'planta,pozo,sin-asignar' && n1Mayor.valor === 'NP_SUB' && n1Mayor.hijos[0].valor === 'NP_SUB/falla-esp',
    `La Ceiba, octubre: la planta ${f(pl.bbl)} bbl, ${Math.round(pl.noPlaneadaBbl / pl.bbl * 100)} % no planeado («${pl.hijos[0].hijos[0].texto}», P-201B); sin identificar ${f(sin.bbl)} (LC-21, LC-08), sin saber si fue planeado, al final. Septiembre: en el pozo ${f(pozoSep.bbl)}, la causa mayor «${n1Mayor.texto}» (${f(n1Mayor.bbl)} bbl; «${n1Mayor.hijos[0].texto}» ${f(n1Mayor.hijos[0].bbl)})`)

  // revisarArbol: lo que no suma o va fuera de orden no pasa (es la regla del códec del contrato).
  const roto = structuredClone(sepCe)
  roto.raiz.hijos[0].hijos[0].bbl += 1
  const volteado = structuredClone(sepCe)
  volteado.raiz.hijos.reverse()
  const bajo = structuredClone(sepCe)
  bajo.raiz.hijos[0].dimension = 'n1'
  comprobar(/no suma sus ramas/.test(AR.revisarArbol(roto).map(x => x.texto).join()) && /fuera de orden/.test(AR.revisarArbol(volteado).map(x => x.texto).join())
    && /en ese lugar va «tramo»/.test(AR.revisarArbol(bajo).map(x => x.texto).join()) && AR.revisarArbol(sepCe).length === 0,
    `revisarArbol dice lo que no se puede creer: un nodo que no suma sus ramas («${AR.revisarArbol(roto)[0]?.texto}»), hermanas fuera de orden y una rama del nivel equivocado`)
}

console.log('\n=== 31. Correcciones del QA (F2-B): todas las vistas sobre las mismas filas, una cifra del norte y los bordes ===')
{
  const CH = await v.ssrLoadModule('/src/entities/choke.ts')
  const RP = await v.ssrLoadModule('/src/entities/choke-reparto.ts')
  const AR = await v.ssrLoadModule('/src/entities/choke-arbol.ts')
  const PA = await v.ssrLoadModule('/src/entities/anh-paradas.ts')
  const CL = await v.ssrLoadModule('/src/entities/anh-clasificacion.ts')
  const sep = D.rangoDePeriodo('cerrado'), oct = D.rangoDePeriodo('curso')
  const h13 = { desde: new Date(L.calendario()[0].desde), hasta: R.AHORA }
  const suma = o => Object.values(o).reduce((a, x) => a + x, 0)
  const primer = a => Object.fromEntries(a.raiz.hijos.map(h => [h.valor, h]))
  const NELSON = { id: 'u-sup', nombre: 'Nelson Ortiz' }, EDWIN = { id: 'u-conf', nombre: 'Edwin Maestre' }, HORA = '2026-10-02T14:30:00-05:00'
  // Todas las vistas que reparten por tramo o por escalón, con lo guardado, contra el árbol (QA-A-01; C-09).
  const vistas = (ids, r, g) => {
    const op = { guardadas: g }
    const b = RP.brechaPorChoke(ids, r.desde, r.hasta, ctx0, undefined, op), a = AR.arbolDelChoke(ids, r.desde, r.hasta, ctx0, { guardadas: g })
    const s = RP.serieChoke(ids, r.desde, r.hasta, ctx0, undefined, op)
    const t = ids.length === 1 ? RP.tuberiaCampo(ids[0], r.desde, r.hasta, ctx0, undefined, op) : undefined
    const mes = RP.repartoPorMes(ids, ctx0, undefined, op).find(m => m.desde.getTime() === r.desde.getTime())
    const p1 = primer(a)
    const iguales = CH.CHOKES_Y_SIN_ASIGNAR.every(k => cerca(p1[k]?.bbl ?? 0, b.porChoke[k], 1e-9) && cerca(p1[k]?.noPlaneadaBbl ?? 0, b.porChokeEscalon[k]['disponibilidad-no-planeada'], 1e-9)
      && cerca(s.dias.reduce((x, d) => x + d.porChoke[k], 0), b.porChoke[k], 1e-9)
      && (!t || cerca(k === 'sin-asignar' ? t.sinTramoBbl : t.perdidoPeriodo.find(x => x.tramo === k).bbl, b.porChoke[k], 1e-9))
      && (!mes || (cerca(mes.porTramo[k], b.porChoke[k], 1e-9) && cerca(mes.noPlaneado[k], b.porChokeEscalon[k]['disponibilidad-no-planeada'], 1e-9))))
      && CH.ESCALONES.every(e => cerca(s.dias.reduce((x, d) => x + d.porEscalon[e], 0), b.porEscalon[e], 1e-9)) && cerca(a.raiz.noPlaneadaBbl, b.porEscalon['disponibilidad-no-planeada'], 1e-9)
    return { b, a, t, iguales }
  }
  // 1. El supervisor corrige el paso 2 de LC-11 en septiembre (pozo → planta) para todo el evento.
  const filasSep = PA.paradasAnh(['ceiba'], sep.desde, sep.hasta, ctx0)
  const lc11 = filasSep.filter(p => p.pozo === 'LC-11' && p.clasificacion.choke?.valor === 'pozo').sort((x, y) => y.diferidaTrimBbl - x.diferidaTrimBbl)[0]
  const delEvento = filasSep.filter(p => p.eventoId === lc11.eventoId).reduce((x, p) => x + p.diferidaTrimBbl, 0)
  const corregida = CL.declararPaso(lc11.clasificacion, 'choke', 'planta', NELSON, 'sup', HORA)
  const g1 = new Map([[lc11.eventoId, corregida]])
  const v0 = vistas(['ceiba'], sep, undefined), v1 = vistas(['ceiba'], sep, g1)
  comprobar(v0.iguales && v1.iguales && delEvento > 3000 && cerca(v1.b.porChoke.pozo, v0.b.porChoke.pozo - delEvento, 1e-9) && cerca(v1.b.porChoke.planta, v0.b.porChoke.planta + delEvento, 1e-9)
    && cerca(v1.b.diferido, v0.b.diferido, 1e-12) && v1.t.fraseGerente === 'Se trabó sobre todo en la planta: LC-11 (electrosumergible) y P-201B (bomba de agua).' && v0.t.fraseGerente === 'Se trabó sobre todo en los pozos: LC-11 y LC-04 (electrosumergibles).',
    `QA-A-01 · corregir el paso 2 de LC-11 (${f(delEvento)} bbl) mueve a la vez el árbol, el reparto, la tubería, la serie y el mes a mes: pozos ${f(v0.b.porChoke.pozo)} → ${f(v1.b.porChoke.pozo)}, planta ${f(v0.b.porChoke.planta)} → ${f(v1.b.porChoke.planta)}; el gerente lee «${v1.t.fraseGerente}»`)
  // 2. Y el paso 4: el jefe dice que esa parada fue planeada (C-09): sale de lo no planeado en todas las vistas.
  const planeada = CL.declararPaso(corregida, 'planeacion', 'planeada', { id: 'u-jefe', nombre: 'Jefe' }, 'jefe', HORA)
  const v2 = vistas(['ceiba'], sep, new Map([[lc11.eventoId, planeada]]))
  const lineaCon = g => RP.lineaBasePorTramo(['ceiba'], oct.desde, oct.hasta, ctx0, undefined, g ? { guardadas: g } : {})
  const base0 = lineaCon(undefined), base1 = lineaCon(g1), base2 = lineaCon(new Map([[lc11.eventoId, planeada]]))
  const diasBase = base0 ? (base0.base.hasta.getTime() - base0.base.desde.getTime()) / 86_400_000 : 1
  comprobar(v2.iguales && cerca(v2.b.porEscalon['disponibilidad-no-planeada'], v1.b.porEscalon['disponibilidad-no-planeada'] - delEvento, 1e-9) && cerca(v2.b.porEscalon['disponibilidad-planeada'], v1.b.porEscalon['disponibilidad-planeada'] + delEvento, 1e-9)
    && v2.b.peNoPlaneada < v1.b.peNoPlaneada && cerca(v2.a.raiz.noPlaneadaBbl, v1.a.raiz.noPlaneadaBbl - delEvento, 1e-9)
    && !!base0 && base0.base.hasta.getTime() === sep.hasta.getTime() && cerca((base1.noPlaneado.planta.baseDia - base0.noPlaneado.planta.baseDia) * diasBase, delEvento, 1e-9)
    && cerca(base2.noPlaneado.planta.baseDia, base0.noPlaneado.planta.baseDia, 1e-9) && cerca((base0.noPlaneado.pozo.baseDia - base2.noPlaneado.pozo.baseDia) * diasBase, delEvento, 1e-9),
    `C-09 · y el paso 4: «planeada» saca esos ${f(delEvento)} bbl de lo no planeado del árbol, del reparto, de la serie, del mes a mes y de la línea base (PE no planeada ${v1.b.peNoPlaneada.toFixed(2)} % → ${v2.b.peNoPlaneada.toFixed(2)} %)`)
  // 3. «No, no recibía»: confiabilidad pone afuera el tanque de crudo de Guacamayo; deja de estar por confirmar.
  const filasGu = PA.paradasAnh(['guacamayo'], h13.desde, h13.hasta, ctx0)
  const espera = filasGu.filter(p => p.causa.tipo === 'evacuacion' && !p.clasificacion.choke && p.propuesta.sugerido.choke === 'planta')
  const gGu = new Map(espera.map(p => [p.id, CL.declararPaso(p.clasificacion, 'choke', 'exportacion', EDWIN, 'conf', HORA)]))
  const bGu0 = RP.brechaPorChoke(['guacamayo'], h13.desde, h13.hasta, ctx0), bGu1 = RP.brechaPorChoke(['guacamayo'], h13.desde, h13.hasta, ctx0, undefined, { guardadas: gGu })
  const tGu1 = RP.tuberiaCampo('guacamayo', h13.desde, h13.hasta, ctx0, undefined, { guardadas: gGu }), aGu1 = AR.arbolDelChoke(['guacamayo'], h13.desde, h13.hasta, ctx0, { guardadas: gGu })
  const deEspera = espera.reduce((x, p) => x + p.diferidaTrimBbl, 0)
  comprobar(espera.length === 127 && Math.round(deEspera) === 15179 && cerca(bGu1.porChoke.exportacion, bGu0.porChoke.exportacion + deEspera, 1e-9) && cerca(bGu1.porChoke.planta, bGu0.porChoke.planta - deEspera, 1e-9)
    && cerca(bGu1.porConfirmar, bGu0.porConfirmar - deEspera, 1e-9) && cerca(tGu1.perdidoPeriodo.find(x => x.tramo === 'exportacion').bbl, bGu1.porChoke.exportacion, 1e-9)
    && cerca(primer(aGu1).exportacion.bbl, bGu1.porChoke.exportacion, 1e-9) && cerca(bGu1.porEscalon.capacidad, bGu0.porEscalon.capacidad, 1e-9),
    `«No, no recibía» en las ${espera.length} filas del tanque de crudo de Guacamayo pone ${f(deEspera)} bbl afuera en el reparto, la tubería y el árbol, y salen de «por confirmar» (${f(bGu0.porConfirmar)} → ${f(bGu1.porConfirmar)} bbl); siguen siendo capacidad, no no planeado`)
  // 4. «En el yacimiento» (producción, con la prueba del pozo): desarrollo, fuera de la PE no planeada.
  const filasMo = PA.paradasAnh(['morichal'], h13.desde, h13.hasta, ctx0)
  const ul = filasMo.filter(p => p.causa.tipo === 'electrosumergible' && p.causa.parte === 'admision').sort((x, y) => y.diferidaTrimBbl - x.diferidaTrimBbl)[0]
  const yac = CL.declararYacimiento(ul.clasificacion, 'prueba', { id: 'u-prod', nombre: 'Producción' }, 'prod', HORA)
  const gY = new Map([[ul.eventoId, yac]])
  const bY0 = RP.brechaPorChoke(['morichal'], h13.desde, h13.hasta, ctx0), bY1 = RP.brechaPorChoke(['morichal'], h13.desde, h13.hasta, ctx0, undefined, { guardadas: gY })
  const delUl = filasMo.filter(p => p.eventoId === ul.eventoId).reduce((x, p) => x + p.diferidaTrimBbl, 0)
  comprobar(cerca(bY1.porChoke.reservorio, delUl, 1e-9) && cerca(bY1.porEscalon.desarrollo, delUl, 1e-9) && cerca(bY1.porEscalon['disponibilidad-no-planeada'], bY0.porEscalon['disponibilidad-no-planeada'] - delUl, 1e-9)
    && bY1.peNoPlaneada < bY0.peNoPlaneada,
    `«En el yacimiento» sobre la baja carga de ${ul.pozo} (${f(delUl)} bbl) es desarrollo en todas las vistas, y sale de la PE no planeada (${bY0.peNoPlaneada.toFixed(3)} % → ${bY1.peNoPlaneada.toFixed(3)} %)`)
  // 5. La costura vuelve a pedir esas vistas después de una escritura: su clave lleva la versión de lo guardado.
  const costura = (await import('node:fs')).readFileSync(new URL('../src/shared/api/choke.ts', import.meta.url), 'utf8')
  const usos = ['useTuberia', 'useSerieChoke', 'useRepartoChoke', 'useRepartoMensual', 'useBaseChoke'].map(n => [n, new RegExp(`export function ${n}\\([^]*?\\n}`).exec(costura)?.[0] ?? ''])
  comprobar(usos.every(([, cuerpo]) => /clasificacionesAnh/.test(cuerpo) && /vhg\(ctx, versiones, guardadas\)/.test(cuerpo) && /, guardadas\)\)$/m.test(cuerpo)),
    `las cinco vistas que reparten por tramo (${usos.map(([n]) => n).join(', ')}) llevan en su clave la versión de lo guardado y se lo pasan al motor`)

  // D4 · Una sola cifra del norte: el escalón no planeado, en el reparto, el árbol, el mes a mes y la línea base; el
  // curtailment (el despacho limitado de Guacamayo, la nominación de La Zarza) no entra; «no programado (libro)» es otra.
  const bH = RP.brechaPorChoke(TODOS, h13.desde, h13.hasta, ctx0), aH = AR.arbolDelChoke(TODOS, h13.desde, h13.hasta, ctx0), lbH = L.libro(TODOS, h13.desde, h13.hasta, ctx0)
  const mH = RP.repartoPorMes(TODOS, ctx0).reduce((x, m) => x + suma(m.noPlaneado), 0)
  const gu13 = AR.arbolDelChoke(['guacamayo'], h13.desde, h13.hasta, ctx0)
  comprobar(cerca(aH.raiz.noPlaneadaBbl, bH.porEscalon['disponibilidad-no-planeada'], 1e-9) && cerca(mH, bH.porEscalon['disponibilidad-no-planeada'], 1e-9)
    && Math.round(gu13.raiz.noPlaneadaBbl) === 63916 && Math.round(bH.porEscalon['disponibilidad-no-planeada']) === 462267 && lbH.noPlaneado > bH.porEscalon['disponibilidad-no-planeada'],
    `una sola cifra del norte en todas las vistas: ${f(bH.porEscalon['disponibilidad-no-planeada'])} bbl en 13 meses (árbol, reparto, mes a mes); en Guacamayo ${f(gu13.raiz.noPlaneadaBbl)}, sin los ${f(15179)} del despacho limitado; el «no programado (libro)» es otra pregunta (${f(lbH.noPlaneado)})`)

  // QA-A-10 · La conciliación que sí puede fallar: Σ por N1 de las filas = el diferido del libro, y cada tipo de
  // causa cae solo en la N1 que propone su fila de REGLAS_ANH (o en «sin causa»).
  const malN1 = []
  for (const [nombre, r] of [['septiembre', sep], ['octubre', oct], ['13 meses', h13]]) for (const ids of [...TODOS.map(c => [c]), TODOS]) {
    const ps = PA.paradasAnh(ids, r.desde, r.hasta, ctx0), lb = L.libro(ids, r.desde, r.hasta, ctx0)
    if (!cerca(suma(PA.conciliarAnh(ps).porN1), lb.diferido, 1e-9)) malN1.push(`${nombre} ${ids.join('+')}`)
  }
  const reglas = new Map(CL.REGLAS_ANH.filas.map(x => [x.id, x]))
  const fueraDeSuFila = PA.paradasAnh(TODOS, h13.desde, h13.hasta, ctx0).filter(p => {
    const n1 = p.clasificacion.n1
    if (!n1 || n1.procedencia !== 'regla' || p.exceso) return false
    const fila = reglas.get(p.propuesta.fila)
    const chip = p.propuesta.fila === 'declarada-chip' ? CL.CHIPS_ANH[(p.causa.declarado?.texto ?? p.causa.texto).trim()] : undefined
    return n1.valor !== (chip?.propone.n1 ?? fila?.propone.n1)
  })
  comprobar(malN1.length === 0 && fueraDeSuFila.length === 0,
    `Σ por causa (N1) de las filas de la ANH = el diferido del libro en 3 períodos × 6 alcances, y ninguna fila lleva una N1 de TRIM que no sea la de su fila de REGLAS_ANH${malN1.length || fueraDeSuFila.length ? `: ${[...malN1, ...fueraDeSuFila.slice(0, 3).map(p => p.id)].join(', ')}` : ''}`)

  // QA-A-11 · Un período que no empieza a medianoche: el árbol y el reparto toman de cada fila solo sus horas dentro.
  const hora = { desde: new Date(R.AHORA.getTime() - 3_600_000), hasta: R.AHORA }
  const aHora = AR.arbolDelChoke(['ceiba'], hora.desde, hora.hasta, ctx0), bHora = RP.brechaPorChoke(['ceiba'], hora.desde, hora.hasta, ctx0), lHora = L.libro(['ceiba'], hora.desde, hora.hasta, ctx0)
  const mitad = { desde: new Date('2026-09-10T08:30:00-05:00'), hasta: new Date('2026-09-20T17:45:00-05:00') }
  const aMit = AR.arbolDelChoke(TODOS, mitad.desde, mitad.hasta, ctx0), lMit = L.libro(TODOS, mitad.desde, mitad.hasta, ctx0), bMit = RP.brechaPorChoke(TODOS, mitad.desde, mitad.hasta, ctx0)
  comprobar(cerca(aHora.raiz.bbl, lHora.diferido, 1e-9) && cerca(bHora.diferido, lHora.diferido, 1e-9) && Math.round(aHora.raiz.bbl) === 82
    && cerca(aMit.raiz.bbl, lMit.diferido, 1e-9) && cerca(bMit.diferido, lMit.diferido, 1e-9) && cerca(bMit.potencial, lMit.potencial, 1e-9) && cerca(bMit.real, lMit.real, 1e-9) && AR.revisarArbol(aMit).length === 0,
    `un período que corta días: la última hora de La Ceiba da ${f(aHora.raiz.bbl)} bbl en el árbol y en el reparto (el libro, ${f(lHora.diferido)}); del 10-sep 08:30 al 20-sep 17:45, ${f(aMit.raiz.bbl)} bbl en los tres`)

  // QA-A-14 · La convención: un día se mide con la configuración de su medianoche; firmada a mitad del día, rige desde el siguiente.
  const vMitad = [C.versionInicial(), { version: 2, fecha: '2026-09-15T12:00:00-05:00', por: 'Prueba · administrador', motivo: 'prueba', cambios: [], config: { ...ctx0.config, capacidades: [{ campoId: 'ceiba', crudo: { bpd: 11000, fuente: 'prueba' } }] } }]
  const sMitad = RP.serieChoke(['ceiba'], sep.desde, sep.hasta, ctx0, vMitad)
  const dia = d => sMitad.dias.find(x => x.dia.toISOString().startsWith(d)).potenciales.ceiba.planta
  comprobar(dia('2026-09-15') === 13000 && dia('2026-09-16') === 11000,
    `una capacidad firmada el 15-sep a las 12:00 rige desde el 16 (el 15 sigue con ${f(dia('2026-09-15'))}; el 16, ${f(dia('2026-09-16'))}): cada día operacional usa la configuración de su medianoche`)

  // Un empate al barril firmado con su explicación: la frase dice la de producción, no una del motor.
  const ctxEmp = { ...ctx0, config: { ...ctx0.config, capacidades: [{ campoId: 'ceiba', crudo: { bpd: 11000, fuente: 'prueba' }, afuera: { bpd: 11000, fuente: 'contrato' }, explicacionEmpate: 'El oleoducto se dimensionó con el tren de crudo' }] } }
  const pEmp = CH.potencialesDelCampo('ceiba', R.AHORA.getTime(), ctxEmp)
  comprobar(pEmp.empate && pEmp.empatados.join() === 'planta,exportacion' && pEmp.explicacion === 'El oleoducto se dimensionó con el tren de crudo'
    && pEmp.texto === 'Dos tramos dan exactamente lo mismo: la planta y afuera. Por qué, según la firma: «El oleoducto se dimensionó con el tren de crudo».',
    `un empate firmado dice la explicación de quien firmó: «${pEmp.texto}»`)

  // C-08 · La comparación de la referencia ve lo que el contrato prohíbe (scripts/referencia-diferencias.mjs).
  const { diferencias } = await import('./referencia-diferencias.mjs')
  const K = await v.ssrLoadModule('/src/shared/api/cable.ts'), CT = await v.ssrLoadModule('/src/shared/api/contrato.ts')
  const json = (ep, x) => JSON.parse(JSON.stringify(K.aRespuesta(ep.codec, x)))
  const rep = json(CT.REPARTO_CHOKE, RP.brechaPorChoke(['ceiba'], sep.desde, sep.hasta, ctx0))
  const fila = { pozo: 'LC-01', colchonH: null, inicio: '2026-09-01T03:00:00-05:00', hijos: [{ valor: 'falta', bbl: 1 }] }
  const con = (x, f) => { const y = structuredClone(x); f(y); return y }
  const derivas = {
    'colchonH en null donde va ausente': [{ pozo: 'LC-01' }, { pozo: 'LC-01', colchonH: null }],
    'costoFalla en 0 donde va ausente': [{ equipo: 'K-101', bpd: null }, { equipo: 'K-101', bpd: null, costoFalla: 0 }],
    'una revisión inventada': [{ id: 'x' }, { id: 'x', revision: { motivo: 'no' } }],
    'la evidencia del yacimiento donde no la hay': [{ id: 'x' }, { id: 'x', evidenciaYacimiento: 'prueba' }],
    'una cadena en un nodo que no la lleva': [{ valor: 'falta', bbl: 1 }, { valor: 'falta', bbl: 1, cadena: 'NO PLANEADA' }],
    'una fecha sin zona': [fila, con(fila, y => { y.inicio = '2026-09-01T08:00:00' })],
    'un null esperado que llega ausente': [fila, con(fila, y => { delete y.colchonH })],
    'un tramo de más en porChoke': [rep, con(rep, y => { y.datos.porChoke.mercado = 1000 })],
    'un escalón de más dentro de un tramo': [rep, con(rep, y => { y.datos.porChokeEscalon.pozo.otro = 1 })],
    'una fila de más en una lista': [{ xs: [1] }, { xs: [1, 2] }],
    // QA-R (C-08): los campos que F2-C, F2-B y F3 agregaron y que dicen algo con solo venir.
    '«si para otra bomba» donde no va': [{ campoId: 'palmar' }, { campoId: 'palmar', siParaOtra: { entraBpd: 0, cabeBpd: 0 } }],
    '«si para una» donde no va': [{ campoId: 'palmar' }, { campoId: 'palmar', sinUna: { bomba: 'P-1' } }],
    'las frecuencias en una fila sin frecuencia': [{ id: 'x', parcial: false }, { id: 'x', parcial: false, hz: { parada: 0, prueba: 0 } }],
    '«sube» en un equipo que no subió': [{ equipo: 'LC-01', bpd: 1 }, { equipo: 'LC-01', bpd: 1, subio: { otro: 'P-201B' } }],
    'una frase de «Si falla hoy» que el motor no dijo': [{ campoId: 'palmar' }, { campoId: 'palmar', cambioHoy: 'Cambió hoy', noIntervenir: 'Ojo', proximoInstrumento: 'X' }],
    'un «sin dato» donde hay cifra': [{ equipo: 'LC-01', bpd: 1 }, { equipo: 'LC-01', bpd: 1, sinDato: 'falta' }],
    'un techo donde la cifra es calculada': [{ equipo: 'LC-11', bblDia: 1 }, { equipo: 'LC-11', bblDia: 1, techo: true }],
    'quien escribió el motivo donde lo escribió TRIM': [{ equipo: 'LC-21', motivo: 'x' }, { equipo: 'LC-21', motivo: 'x', declaradoPor: 'el operador de campo' }],
    'un retiro que nadie hizo': [{ id: 'x' }, { id: 'x', retiros: [] }],
    'una respuesta de persona en una causa de TRIM': [{ tipo: 'pendiente' }, { tipo: 'pendiente', declarado: { texto: 'x' } }],
    '«una señal apunta», «se perdió» o «No sé» que el motor no dijo': [{ estado: 'propuesta' }, { estado: 'propuesta', apunta: { regla: 'x' }, perdida: 'tea', escalada: { pregunta: 'x' } }],
  }
  const noVe = Object.entries(derivas).filter(([, [e, r]]) => diferencias(e, r).length === 0).map(([k]) => k)
  comprobar(noVe.length === 0 && diferencias(rep, rep).length === 0 && diferencias(fila, con(fila, y => { y.inicio = '2026-09-01T08:00:00Z'; y.extra = 1 })).length === 0,
    `comparar ve cada deriva que el contrato prohíbe (${Object.keys(derivas).length}: ${Object.keys(derivas).join('; ')}) y deja pasar lo que puede traer de más y la misma hora en otra zona${noVe.length ? `; no ve: ${noVe.join(', ')}` : ''}`)

  // B-12 · Un equipo con barriles de dos tipos de causa los dice: LC-04, su electrosumergible y la baja tensión que lo tumbó solo a él.
  const lc04 = RP.brechaPorChoke(['ceiba'], sep.desde, sep.hasta, ctx0).porChokeEquipo.pozo.find(x => x.equipo === 'LC-04')
  comprobar(lc04 && lc04.porTipo?.length === 2 && lc04.porTipo[0].tipo === 'electrosumergible' && lc04.porTipo[1].tipo === 'energia' && cerca(lc04.porTipo.reduce((x, y) => x + y.bbl, 0), lc04.bbl, 1e-9),
    `LC-04 en septiembre: ${f(lc04?.bbl ?? 0)} bbl «en el pozo», de ellos ${lc04?.porTipo?.map(x => `${f(x.bbl)} de ${x.tipo}`).join(' y ')}`)
}

console.log('\n=== 32. Correcciones del documento del backend (F4): el factor de medición, la eficiencia que no se puede creer y las frases (5E·H9, 5E·H30 a 5E·H37) ===')
{
  const CH = await v.ssrLoadModule('/src/entities/choke.ts')
  const RP = await v.ssrLoadModule('/src/entities/choke-reparto.ts')
  const CR = await v.ssrLoadModule('/src/entities/criticidad.ts')
  const CAP = await v.ssrLoadModule('/src/entities/capacidades.ts')
  const PA = await v.ssrLoadModule('/src/entities/anh-paradas.ts')
  const { readFileSync } = await import('node:fs')
  const ahora = R.AHORA.getTime(), DIA = 86_400_000
  const sep = D.rangoDePeriodo('cerrado'), oct = D.rangoDePeriodo('curso')
  const h13 = { desde: new Date(L.calendario()[0].desde), hasta: R.AHORA }
  const crudo = TODOS.filter(c => !PT.CAMPOS_DE_GAS.includes(c))

  // 5E·H9 · TRIM propone el factor de medición: la mediana de lo real ÷ las pruebas (sin factor) en los días completos
  // sin paradas y con los pozos limitando de los 90 antes de hoy. Aquí se rehace con el libro día por día y las pruebas.
  const hoy = PA.inicioDiaCo(ahora), desde90 = hoy - 90 * DIA
  const esperado = c => {
    const conPrueba = P.pozosDe(c).filter(w => w.pruebas.length)
    const r = L.porDia([c], new Date(desde90), new Date(hoy), ctx0)
      .filter(d => d.real !== null && d.horas >= 24 - 1e-9 && d.diferido <= 1e-9 && CH.potencialesDelCampo(c, d.dia.getTime(), ctx0).dominante === 'pozos')
      .map(d => d.real / conPrueba.reduce((a, w) => a + (P.pruebaEn(w, d.dia.getTime())?.crudoBpd ?? 0), 0)).sort((a, b) => a - b)
    const m = r.length >> 1
    return { dias: r.length, valor: r.length ? Math.round((r.length % 2 ? r[m] : (r[m - 1] + r[m]) / 2) * 1000) / 1000 : undefined }
  }
  const props = Object.fromEntries(TODOS.map(c => [c, CH.factorMedicionPropuesto(c, ctx0)]))
  comprobar(crudo.every(c => { const e = esperado(c); return props[c].valor === e.valor && props[c].dias === e.dias && e.dias >= 7 })
      && props.ceiba.valor === 0.966 && props.ceiba.dias === 42 && props.guacamayo.valor === 1.004 && props.guacamayo.dias === 24 && props.palmar.valor === 0.998 && props.palmar.dias === 80
      && props.morichal.valor === 0.961 && props.morichal.dias === 9 && props.zarza.valor === undefined && /campo de gas/.test(props.zarza.texto)
      && props.ceiba.desde.getTime() === desde90 && props.ceiba.hasta.getTime() === hoy && CH.PARAMETROS_CHOKE.ventanaFactorDias === 90 && CH.PARAMETROS_CHOKE.minimoDiasFactor === 7
      && /^La mediana de lo que midió el punto oficial ÷ lo que dan las pruebas en 42 días sin paradas y con los pozos limitando, del 4 de jul al 1 de oct: el punto oficial mide 3,4 % menos que las pruebas\.$/.test(props.ceiba.texto),
    `5E·H9 · TRIM propone el factor de medición con los días sin paradas en que limitan los pozos (del ${R.fechaCorta(props.ceiba.desde)} al ${R.fechaCorta(new Date(hoy - DIA))}): ${crudo.map(c => `${c} ${props[c].valor} en ${props[c].dias} días`).join(', ')}; La Zarza, de gas, no («${props.zarza.texto}»)`)
  const corto = CH.factorMedicionPropuesto('morichal', ctx0, undefined, { dias: 30 })
  comprobar(corto.valor === undefined && corto.dias < 7 && /hacen falta 7/.test(corto.texto) && /^TRIM todavía no lo propone/.test(corto.resumen),
    `con menos de 7 días que sirvan no propone: Morichal en 30 días tiene ${corto.dias} («${corto.resumen}»)`)

  // D3 · El motor usa el factor FIRMADO (con las capacidades) o, sin firma, 1: nunca la propuesta sin firmar.
  const sumaPruebas = c => P.pozosDe(c).filter(w => w.pruebas.length).reduce((a, w) => a + (P.pruebaEn(w, ahora)?.crudoBpd ?? 0), 0)
  const cfgF = pares => ({ ...ctx0.config, capacidades: pares.map(([c, valor]) => ({ campoId: c, factorMedicion: { valor, porque: `Medido con el separador de prueba de ${c}` } })) })
  const ctxGu = { ...ctx0, config: cfgF([['guacamayo', props.guacamayo.valor]]) }
  const gu0 = CH.potencialesDelCampo('guacamayo', ahora, ctx0), gu1 = CH.potencialesDelCampo('guacamayo', ahora, ctxGu)
  comprobar(cerca(gu0.pozos, sumaPruebas('guacamayo'), 1e-12) && gu0.factorMedicion === 1 && !gu0.factorFirmado
      && cerca(gu1.pozos, sumaPruebas('guacamayo') * 1.004, 1e-12) && gu1.factorMedicion === 1.004 && gu1.factorFirmado
      && CH.factorMedicionDe(ctx0.config, 'guacamayo').estado === 'sin-firmar' && CH.factorMedicionDe(ctxGu.config, 'guacamayo').estado === 'firmado'
      && /× el factor de medición firmado \(1,004\)/.test(RP.tuberiaCampo('guacamayo', sep.desde, sep.hasta, ctxGu).tramos.find(x => x.tramo === 'pozo').fuente),
    `el motor lee las pruebas con el factor firmado o, sin firma, con 1, nunca con la propuesta: Guacamayo ${f(gu0.pozos)} bbl/d sin firma (TRIM propone ${props.guacamayo.valor}) y ${f(gu1.pozos)} con 1,004 firmado`)
  // Con el historial, cada día con el factor que regía en su medianoche: firmado el 15-sep a mediodía, rige desde el 16.
  const vGu = [C.versionInicial(), { version: 2, fecha: '2026-09-15T12:00:00-05:00', por: 'Prueba · administrador', motivo: 'prueba', cambios: [], config: ctxGu.config }]
  const diasGu = CH.diasDelCampo('guacamayo', sep.desde.getTime(), sep.hasta.getTime(), ctxGu, vGu)
  const deDia = d => diasGu.find(x => new Date(x.dia).toISOString().startsWith(d))
  comprobar(deDia('2026-09-15').factorMedicion === 1 && !deDia('2026-09-15').factorFirmado && deDia('2026-09-16').factorMedicion === 1.004 && deDia('2026-09-16').factorFirmado
      && cerca(deDia('2026-09-16').potencialPruebas, CH.diasDelCampo('guacamayo', sep.desde.getTime(), sep.hasta.getTime(), ctx0).find(x => x.dia === deDia('2026-09-16').dia).potencialPruebas * 1.004, 1e-12),
    'con el historial cada día usa el factor que regía en su medianoche: firmado el 15-sep a mediodía, el 15 sigue con 1 y el 16 ya va con 1,004')

  // 5E·H30 · La PE: sin el factor firmado y con las pruebas por debajo de lo que midió el punto oficial, no se puede creer.
  const bSep = RP.brechaPorChoke(TODOS, sep.desde, sep.hasta, ctx0), cSep = id => bSep.porCampo.find(x => x.campoId === id)
  const plantilla = c => `Las pruebas dan menos de lo que midió el punto oficial: la eficiencia no se puede creer hasta firmar el factor de medición. TRIM propone ${CAP.cifraFactor(props[c].valor)}, medido en ${props[c].dias} días sin paradas.`
  comprobar(['guacamayo', 'palmar'].every(c => !cSep(c).peCreible && cSep(c).brechaPruebas < 0 && cSep(c).textoPe === plantilla(c) && cSep(c).pe + cSep(c).peNoPlaneada > 100)
      && ['ceiba', 'morichal'].every(c => cSep(c).peCreible && cSep(c).textoPe === undefined && cSep(c).pe + cSep(c).peNoPlaneada <= 100)
      && !cSep('zarza').peCreible && cSep('zarza').textoPe === 'La Zarza es un campo de gas: la eficiencia de crudo no aplica.' && cSep('zarza').pe === 0 && cSep('zarza').potencialPe === 0,
    `septiembre: Guacamayo y El Palmar no se pueden creer («${cSep('guacamayo').textoPe}»); La Ceiba y Morichal sí (${cSep('ceiba').pe.toFixed(2)} y ${cSep('morichal').pe.toFixed(2)} %); «${cSep('zarza').textoPe}»`)
  comprobar(!bSep.peCreible && /^La eficiencia del conjunto no se puede creer: en Guacamayo y El Palmar las pruebas dan menos de lo que midió el punto oficial y falta firmar su factor de medición\./.test(bSep.textoPe)
      && /Sin La Zarza: en un campo de gas la eficiencia de crudo no aplica\.$/.test(bSep.textoPe)
      && cerca(bSep.potencialPe, bSep.porCampo.filter(x => x.campoId !== 'zarza').reduce((a, x) => a + x.potencialSistema, 0), 1e-12),
    `el conjunto no se puede creer si no se puede la de uno de sus campos de crudo, y La Zarza no entra: «${bSep.textoPe}»`)
  // NUNCA un número sobre 100 %: lo que se puede creer no pasa de 100, y lo que no, dice por qué.
  const sobre = []
  for (const [nombre, r] of [['septiembre', sep], ['octubre', oct], ['13 meses', h13]]) for (const ids of [...TODOS.map(c => [c]), TODOS, ['ceiba', 'palmar']]) {
    const b = RP.brechaPorChoke(ids, r.desde, r.hasta, ctx0)
    for (const x of [b, ...b.porCampo]) if (x.peCreible ? x.pe > 100 + 1e-9 : !x.textoPe) sobre.push(`${nombre} ${ids.join('+')} ${x.campoId ?? ''}`)
  }
  comprobar(sobre.length === 0, `ninguna eficiencia que se pueda creer pasa de 100 %, y la que no se puede creer dice por qué (3 períodos × 7 alcances, cada campo y el conjunto)${sobre.length ? `: ${sobre.join(', ')}` : ''}`)
  // Con el factor firmado se puede creer; con uno que deja la PE sobre 100 %, no; firmado después del período, tampoco, y lo dice.
  const bF = RP.brechaPorChoke(['guacamayo', 'palmar'], sep.desde, sep.hasta, { ...ctx0, config: cfgF([['guacamayo', props.guacamayo.valor], ['palmar', props.palmar.valor]]) })
  const bBajo = RP.brechaPorChoke(['guacamayo'], sep.desde, sep.hasta, { ...ctx0, config: cfgF([['guacamayo', 0.95]]) })
  const bTarde = RP.brechaPorChoke(['guacamayo'], sep.desde, sep.hasta, ctxGu, vGu)
  comprobar(bF.peCreible && bF.porCampo.every(x => x.peCreible && x.textoPe === undefined && x.pe <= 100) && cerca(bF.porCampo[0].potencialPruebas, cSep('guacamayo').potencialPruebas * 1.004, 1e-9)
      && !bBajo.peCreible && bBajo.pe > 100 && /^Lo que salió pasa lo que dan las pruebas con el factor de medición firmado \(0,950\): la eficiencia no se puede creer hasta revisarlo\. TRIM propone 1,004/.test(bBajo.textoPe)
      && !bTarde.peCreible && /y en estos días el factor de medición todavía no estaba firmado: la eficiencia no se puede creer\. El firmado \(1,004\) rige desde el 16 de sept\.$/.test(bTarde.textoPe),
    `con el factor firmado se cree (septiembre: Guacamayo ${bF.porCampo[0].pe.toFixed(1)} %, El Palmar ${bF.porCampo[1].pe.toFixed(1)} %; PE + no planeada ${(bF.porCampo[0].pe + bF.porCampo[0].peNoPlaneada).toFixed(1)} y ${(bF.porCampo[1].pe + bF.porCampo[1].peNoPlaneada).toFixed(1)} %: lo asume la firma); con 0,950 la PE daría ${bBajo.pe.toFixed(1)} % y no se cree; firmado a mitad de mes: «${bTarde.textoPe}»`)
  // La firma: dentro de las capacidades, con quién (la versión), cuándo y por qué; la revisión y la forma.
  const vistaGu = CH.vistaCapacidades('guacamayo', ctx0, V0)
  const revF = fm => CAP.revisarCapacidades({ campoId: 'guacamayo', factorMedicion: fm }, vistaGu.entrada)
  const lejos = revF({ valor: 1.05, porque: 'Medido con el separador nuevo' }), fuera = revF({ valor: 2, porque: 'Medido con el separador nuevo' })
  const sinPorque = revF({ valor: 1.004, porque: ' ' }), igual = revF({ valor: 1.004, porque: props.guacamayo.texto })
  const deGas = CAP.revisarCapacidades({ campoId: 'zarza', factorMedicion: { valor: 1.01, porque: 'Medido con el separador' } }, CH.vistaCapacidades('zarza', ctx0, V0).entrada)
  comprobar(lejos.some(h => h.tramo === 'factor' && !h.bloquea && h.texto === 'Factor de medición: usted escribe 1,050 y TRIM mide 1,004 en 24 días sin paradas. ¿Es correcto?') && !lejos.some(h => h.tramo === 'factor' && h.bloquea)
      && fuera.some(h => h.tramo === 'factor' && h.bloquea && /entre 0,5 y 1,5/.test(h.texto)) && sinPorque.some(h => h.tramo === 'factor' && h.bloquea && /diga por qué/.test(h.texto))
      && !igual.some(h => h.tramo === 'factor') && deGas.some(h => h.tramo === 'factor' && h.bloquea && /campo de gas/.test(h.texto))
      && vistaGu.vigentes.factorMedicion.estado === 'sin-firmar' && vistaGu.vigentes.factorMedicion.valor === 1 && !vistaGu.firmaFactor && vistaGu.factorMedicionPropuesto.valor === 1.004 && vistaGu.entrada.factorMedicionPropuesto?.valor === 1.004,
    `la revisión del factor: lejos de lo que TRIM mide pide confirmar sin bloquear («${lejos.find(h => h.tramo === 'factor')?.texto}»); fuera de 0,5–1,5, sin porqué o en un campo de gas, bloquea`)
  const malasF = CAP.validarCapacidades([{ campoId: 'guacamayo', factorMedicion: { valor: 0, porque: 'x' } }, { campoId: 'zarza', factorMedicion: { valor: 1.01, porque: 'Medido con el separador' } }])
  const cfgN = C.normalizarConfig({ ...ctx0.config, capacidades: [{ campoId: 'guacamayo', factorMedicion: { valor: 1.004, porque: '  Medido en 24 días sin paradas  ' } }] })
  const vFirm = [C.versionInicial(), { version: 2, fecha: '2026-10-02T14:00:00-05:00', por: 'Hermes Leal · administrador de la implementación', motivo: 'prueba', cambios: [], config: cfgN }]
  comprobar(malasF.some(e => /^Factor de medición de Guacamayo: escriba un número entre 0,5 y 1,5/.test(e)) && malasF.some(e => /^Factor de medición de Guacamayo: diga por qué/.test(e)) && malasF.some(e => /^Factor de medición de La Zarza: en un campo de gas/.test(e))
      && cfgN.capacidades[0].factorMedicion.porque === 'Medido en 24 días sin paradas' && C.validarConfig(cfgN, ctx0.config, '2026-10-01', ahora).length === 0
      && C.diferencias(ctx0.config, cfgN).includes('Capacidades de Guacamayo (se firman por primera vez): factor de medición 1,004 («Medido en 24 días sin paradas»)')
      && C.camposTocados(ctx0.config, cfgN).join() === 'guacamayo' && CAP.firmaDeFactorMedicion(vFirm, 'guacamayo')?.version === 2 && CAP.firmaDeFactorMedicion(V0, 'guacamayo') === undefined
      && CH.vistaCapacidades('guacamayo', { ...ctx0, config: cfgN }, vFirm).firmaFactor?.por === 'Hermes Leal · administrador de la implementación',
    'el factor se firma dentro de las capacidades, con quién y cuándo (la versión) y por qué: se valida (entre 0,5 y 1,5, con su porqué, nunca en un campo de gas), se normaliza, el historial lo dice en palabras y toca su campo')

  // 5E·H31 · Lo estructural, una frase por campo y tramo con su cifra (antes, el total en el tramo mayor).
  const bAntes = conCapacidadesDeAntes(c => RP.brechaPorChoke(['ceiba', 'guacamayo'], h13.desde, h13.hasta, c))
  const soloCe = conCapacidadesDeAntes(c => RP.brechaPorChoke(['ceiba'], h13.desde, h13.hasta, c))
  const ceA = bAntes.porCampo.find(x => x.campoId === 'ceiba'), guA = bAntes.porCampo.find(x => x.campoId === 'guacamayo')
  const cifrasTexto = [...(bAntes.textoEstructural ?? '').matchAll(/: ([\d.]+) bbl de lo que no se produjo/g)].map(m => Number(m[1].replace(/\./g, '')))
  comprobar(bAntes.textoEstructural.includes(`En La Ceiba, la planta no deja pasar todo lo que pueden dar los pozos: ${f(ceA.estructuralPorChoke.planta)} bbl de lo que no se produjo son de ahí, aunque nada pare.`)
      && bAntes.textoEstructural.includes(`En Guacamayo, afuera no deja pasar todo lo que pueden dar los pozos: ${f(guA.estructuralPorChoke.exportacion)} bbl de lo que no se produjo son de ahí, aunque nada pare.`)
      && cifrasTexto.length === 2 && Math.abs(cifrasTexto.reduce((a, x) => a + x, 0) - bAntes.estructural) <= 1 && !bAntes.textoEstructural.includes(`${f(bAntes.estructural)} bbl`)
      && soloCe.textoEstructural.startsWith(`La planta no deja pasar todo lo que pueden dar los pozos: ${f(soloCe.estructural)} bbl de lo que no se produjo son de ahí, aunque nada pare. Ningún arreglo de equipos los recupera; solo más capacidad.`),
    `5E·H31 · lo estructural va por campo y tramo, cada uno con su cifra: «${bAntes.textoEstructural.slice(0, 260)}…»`)
  // 5E·H32 · El empate en singular: «se toma el tramo de los pozos», no «se toma los pozos».
  const empPozos = CH.dominanteDe({ pozos: 3400.4, planta: 3400, exportacion: 4100 }), empPlanta = CH.dominanteDe({ pozos: 12000, planta: 11000, exportacion: 11000 })
  comprobar(/se toma el tramo de los pozos, el primero de la tubería\.$/.test(empPozos.explicacion) && !/se toma los /.test(empPozos.explicacion) && /se toma el tramo de la planta, el primero de la tubería\.$/.test(empPlanta.explicacion),
    `5E·H32 · el empate dice «se toma el tramo de …»: «${empPozos.explicacion}»`)
  // 5E·H34 y el comentario de la PE (5E·H30): los comentarios no dicen cifras ni reglas que el motor no sostiene.
  const fuenteReparto = readFileSync(new URL('../src/entities/choke-reparto.ts', import.meta.url), 'utf8'), fuenteChoke = readFileSync(new URL('../src/entities/choke.ts', import.meta.url), 'utf8')
  // El comentario en una sola línea, sin los « * » de cada renglón: «siete\n *  veces» es «siete veces».
  const docSerie = (/\/\*\*((?:(?!\*\/)[^])*)\*\/\s*export function serieChoke/.exec(fuenteReparto)?.[1] ?? '').replace(/\s*\n\s*\*\s*/g, ' ')
  const vueltasHoy = RP.serieChoke(['ceiba'], h13.desde, h13.hasta, ctx0).vueltas.ceiba, vueltasAntes = conCapacidadesDeAntes(c => RP.serieChoke(['ceiba'], h13.desde, h13.hasta, c)).vueltas.ceiba
  comprobar(docSerie.length > 100 && !/\b(una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|\d+) veces\b/.test(docSerie) && !/nunca pasa de 100/.test(fuenteChoke),
    `5E·H34 · el comentario de serieChoke no da una cifra de vueltas (La Ceiba da ${vueltasHoy} en 13 meses con el demo y ${vueltasAntes} con las capacidades de antes), y el de la PE ya no dice que nunca pasa de 100 %`)
  // 5E·H36 · En un campo de gas «si falla hoy» va sin cifra y su porqué no dice barriles de crudo.
  const za = CR.criticidadDelCampo('zarza', ctx0)
  const conCifraAntes = ['P-201B', 'SE-2', 'V-101', 'ZA-01', 'ZA-08']
  comprobar(za.ranking.length > 0 && za.ranking.every(x => x.bpd === null && x.grupo === 'sin-dato' && !/bbl/.test(x.porque) && !x.subio)
      && conCifraAntes.every(e => za.ranking.find(x => x.equipo === e)?.porque === `Si ${e} falla hoy: sin dato. La Zarza es un campo de gas: lo que cuesta una falla en gas todavía no se calcula.`)
      && za.ranking.find(x => x.equipo === 'ZA-09')?.porque === 'ZA-09 no tiene prueba: no se le inventa caudal',
    `5E·H36 · en La Zarza (gas) ninguna fila de «si falla hoy» dice barriles de crudo: «${za.ranking.find(x => x.equipo === 'ZA-01')?.porque}»`)
  // 5E·H37 · El umbral de cierre de la NSTA, puesto a prueba: un día con lo sin explicar distinto de cero y dos horas que no cuadran.
  const dia22 = RP.brechaPorChoke(['ceiba'], new Date('2026-09-22T00:00:00-05:00'), new Date('2026-09-23T00:00:00-05:00'), ctx0)
  const horas22 = RP.brechaPorChoke(['ceiba'], new Date('2026-09-22T12:00:00-05:00'), new Date('2026-09-22T14:00:00-05:00'), ctx0)
  comprobar(Math.abs(dia22.sinExplicar - 88.441) < 0.001 && dia22.cuadra && Math.abs(horas22.sinExplicar) > 0.025 * horas22.potencial && !horas22.cuadra,
    `5E·H37 · el 22-sep La Ceiba deja ${dia22.sinExplicar.toFixed(1)} bbl sin explicar (${(dia22.sinExplicar / dia22.potencial * 100).toFixed(2)} %, cuadra); de 12:00 a 14:00, con P-201B parada, ${horas22.sinExplicar.toFixed(1)} (${(horas22.sinExplicar / horas22.potencial * 100).toFixed(1)} %, no cuadra)`)
}

// C1 · Identidad y armazón: la franja de condiciones de la cabecera (X2 §3.5, X5 §5.6).
console.log('\n=== C1. La franja de condiciones: una marca por equipo, contada por el motor ===')
{
  const FR = await v.ssrLoadModule('/src/entities/condiciones.ts')
  const EVF = await v.ssrLoadModule('/src/entities/equipo-vivo.ts')
  const ctxF = L.contextoInicial()
  const ids = (fr, c) => fr.equipos.filter(e => e.condicion === c).map(e => e.equipo).sort().join(' ')
  const t0 = performance.now()
  const ce = FR.franja(['ceiba'], ctxF)
  const msCe = performance.now() - t0
  // La Ceiba, con las cifras del demo (imagen 1): ◆ 2 alarmas · ▲ 2 en atención · ■ 1 aviso · 0 sin comunicación.
  comprobar(ce.cuentas.alarma === 2 && ce.cuentas.atencion === 2 && ce.cuentas.aviso === 1 && ce.cuentas['sin-comunicacion'] === 0 && ce.cuentas.interlock === 0
      && ids(ce, 'alarma') === 'K-101 P-201B' && ids(ce, 'atencion') === 'LC-21 TK-102' && ids(ce, 'aviso') === 'H-302',
    `La Ceiba: ${ce.cuentas.alarma} alarmas (${ids(ce, 'alarma')}), ${ce.cuentas.atencion} en atención (${ids(ce, 'atencion')}), ${ce.cuentas.aviso} aviso (${ids(ce, 'aviso')}), 0 sin comunicación`)
  // Todos los campos (imagen 2): 4 · 8 · 2 · 0. Cada equipo cuenta en su campo: la P-201B de Morichal no es la de La Ceiba.
  const todos = FR.franja(TODOS, ctxF)
  comprobar(todos.cuentas.alarma === 4 && todos.cuentas.atencion === 8 && todos.cuentas.aviso === 2 && todos.cuentas['sin-comunicacion'] === 0
      && todos.equipos.filter(e => e.equipo === 'P-201B').map(e => `${e.campoId}:${e.condicion}`).sort().join() === 'ceiba:alarma,morichal:atencion',
    `todos los campos: ${todos.cuentas.alarma} alarmas · ${todos.cuentas.atencion} en atención · ${todos.cuentas.aviso} avisos · ${todos.cuentas['sin-comunicacion']} sin comunicación`)
  // Una sola marca por equipo, la más grave: MPP-301 es aviso en su estado y atención en Riesgo → atención, una vez.
  const mo = FR.franja(['morichal'], ctxF)
  const mpp = mo.equipos.filter(e => e.equipo === 'MPP-301')
  const repetidos = todos.equipos.filter((e, i) => todos.equipos.findIndex(x => x.campoId === e.campoId && x.equipo === e.equipo) !== i)
  comprobar(EVF.equipoVivo('MPP-301', 'morichal', ctxF)?.severidad === 3 && mpp.length === 1 && mpp[0].condicion === 'atencion' && repetidos.length === 0,
    `una marca por equipo, la más grave de su estado y de Riesgo (MPP-301: aviso en su estado, atención en Riesgo → atención); ningún equipo se cuenta dos veces`)
  // La cuenta es el largo de su lista, en el orden de la franja, y la suma de los campos es la del portafolio.
  const sumaCampos = TODOS.map(c => FR.franja([c], ctxF)).reduce((a, x) => a + x.equipos.length, 0)
  const enOrden = todos.equipos.every((e, i) => i === 0 || FR.ORDEN_FRANJA.indexOf(todos.equipos[i - 1].condicion) <= FR.ORDEN_FRANJA.indexOf(e.condicion))
  comprobar(FR.ORDEN_FRANJA.every(c => todos.cuentas[c] === todos.equipos.filter(e => e.condicion === c).length) && sumaCampos === todos.equipos.length && enOrden
      && ce.equipos[0].equipo === 'P-201B' && ce.equipos[0].bblDia > 1600,
    `cada cuenta es el largo de su lista, de la más grave a la más leve, y primero lo que más deja de producir (P-201B, ${f(ce.equipos[0].bblDia)} bbl/d)`)
  // «Sin comunicación» es el medidor oficial sin el dato del último día: sin él, el computador de flujo sale morado.
  const fiscal = EVF.equipoVivo(Object.keys(EQ.EQUIPOS).find(id => EQ.EQUIPOS[id].fiscal), 'ceiba', ctxF)
  const sinDato = { ...fiscal, dispositivos: fiscal.dispositivos.map(d => d.tag === fiscal.fiscal ? { ...d, valor: null, estado: 'sin señal' } : d) }
  const conCorte = FR.franjaDe([{ campoId: 'ceiba', equipos: [sinDato], riesgo: [] }])
  const termografia = FR.franjaDe([{ campoId: 'ceiba', equipos: [EVF.equipoVivo('SE-2', 'ceiba', ctxF)], riesgo: [] }])
  comprobar(conCorte.cuentas['sin-comunicacion'] === 1 && conCorte.equipos[0].equipo === fiscal.id && termografia.cuentas['sin-comunicacion'] === 0,
    `sin el dato del último día, ${fiscal.id} sale «sin comunicación»; la termografía por campaña de SE-2 (sin lectura) no`)
  comprobar(msCe < 300, `la franja de La Ceiba se calcula en ${msCe.toFixed(0)} ms (menos de 300)`)
}


// C2 · La planta viva (X4 §4): los cuadres que no se rompen, las frases del motor y cada
// cifra igual a la de la pantalla de donde sale hoy (Resumen, Diferidos, Riesgo, el ciclo, la tubería).
console.log('\n=== C2. La planta viva: cuadres, frases y cifras de donde salen hoy ===')
{
  const PV = await v.ssrLoadModule('/src/entities/planta-viva.ts')
  const RPV = await v.ssrLoadModule('/src/entities/choke-reparto.ts')
  const ESV = await v.ssrLoadModule('/src/entities/escenarios.ts')
  const CRV = await v.ssrLoadModule('/src/entities/criticidad.ts')
  const CFV = await v.ssrLoadModule('/src/entities/configuracion.ts')
  const curso = D.rangoDePeriodo('curso')
  const q = (campos, momento) => ({ campos, momento, desde: curso.desde, hasta: curso.hasta })
  // D7: la primera lectura de todos los campos, menos de 300 ms; cambiar de momento no recalcula.
  let t0 = performance.now()
  const todosD = PV.plantaViva(q(TODOS, 'durante'), ctx0, V0)
  const msPrimera = performance.now() - t0
  t0 = performance.now()
  const todosA = PV.plantaViva(q(TODOS, 'antes'), ctx0, V0), todosP = PV.plantaViva(q(TODOS, 'despues'), ctx0, V0)
  const msMomentos = performance.now() - t0
  comprobar(msPrimera < 300 && msMomentos < 30 && PV.plantaViva(q(TODOS, 'durante'), ctx0, V0) === todosD,
    `D7 · todos los campos en ${msPrimera.toFixed(0)} ms (menos de 300); los otros dos momentos en ${msMomentos.toFixed(1)} ms, y la misma consulta devuelve lo guardado`)

  const ceD = PV.plantaViva(q(['ceiba'], 'durante'), ctx0, V0), ceA = PV.plantaViva(q(['ceiba'], 'antes'), ctx0, V0), ceP = PV.plantaViva(q(['ceiba'], 'despues'), ctx0, V0)
  const tub = RPV.tuberiaCampo('ceiba', curso.desde, curso.hasta, ctx0, V0)
  const est = D.estadoCampo('ceiba', ctx0)
  const lb = L.libro(['ceiba'], curso.desde, curso.hasta, ctx0)
  const tr = (v, k) => v.planta.tramos.find(t => t.tramo === k)
  // Durante: 1.665 + 301 = 1.966, el total del campo (un nombre, una cifra: nunca 1.665).
  const sumaD = ceD.planta.tramos.reduce((a, t) => a + t.valor, 0) + (ceD.planta.sinIdentificar?.valor ?? 0)
  comprobar(f(tr(ceD, 'planta').valor) === '1.665' && f(ceD.planta.sinIdentificar.valor) === '301' && f(ceD.cifras.durante.valor) === '1.966'
      && cerca(sumaD, ceD.cifras.durante.valor) && cerca(ceD.cifras.durante.valor, tub.perdiendoAhoraBpd) && cerca(ceD.cifras.durante.valor, est.perdiendoBpd),
    `Durante · 1.665 + 301 = 1.966 = lo que se deja de producir ahora en Resumen y en la tubería (${f(sumaD)}; ${f(est.perdiendoBpd)})`)
  // Después: 118 + 573 + 355 = 1.046 = el diferido del libro.
  const sumaP = ceP.planta.tramos.reduce((a, t) => a + t.valor, 0) + (ceP.planta.sinIdentificar?.valor ?? 0)
  comprobar(f(tr(ceP, 'pozo').valor) === '118' && f(tr(ceP, 'planta').valor) === '573' && f(ceP.planta.sinIdentificar.valor) === '355'
      && cerca(sumaP, lb.diferido) && cerca(ceP.cifras.despues.valor, lb.diferido) && f(lb.diferido) === '1.046' && cerca(ceP.esteMes.bbl, lb.diferido),
    `Después · 118 + 573 + 355 = 1.046 = el diferido del libro de octubre (${f(sumaP)})`)
  // Un nombre, una cifra: «se dejan de producir» es el total de cada campo y de todos (2.650 = 1.966 + 684).
  const sumaFilas = todosD.filas.reduce((a, x) => a + x.valor, 0)
  comprobar(f(todosD.cifras.durante.valor) === '2.650' && cerca(sumaFilas, todosD.cifras.durante.valor)
      && todosD.filas.map(x => x.campoId).join() === 'ceiba,morichal,guacamayo,palmar,zarza' && todosD.filas.every(x => cerca(x.valor, D.estadoCampo(x.campoId, ctx0).perdiendoBpd))
      && /^Ahora mismo, en sus 5 campos$/.test(todosD.cifras.durante.previo) && todosD.cifras.durante.explica === 'Lo que más pesa: la bomba de agua P-201B, en La Ceiba. Hay 4 de 87 pozos parados.',
    `todos los campos · 2.650 bbl/d = la suma de las filas, de la que más pesa a la que menos; cada fila es el total de su campo («${todosD.cifras.durante.explica}»)`)
  // Las frases del motor: la de ahora (la de la imagen aprobada) y la de lo que viene.
  const corta = ceD.cifras.durante.fraseCorta
  comprobar(ceD.cifras.durante.frase === 'se dejan de producir en La Ceiba.'
      && ceD.cifras.durante.explica === 'La bomba de agua P-201B paró a las 03:52 y obligó a cerrar dos pozos: 1.665 de esos barriles. Los otros 301 son de LC-21, que todavía no tiene causa.'
      && corta === 'Se dejan de producir 1.966 bbl/d: P-201B (bomba de agua) paró a las 03:52 y cerró LC-07 y LC-16.' && corta.split(/\s+/).length <= 20
      // F2 (26-oct, A16): el nombre accesible es la misma frase con las unidades en palabras.
      && ceD.planta.ariaLabel.startsWith(corta.replace('bbl/d', 'barriles por día')) && !ceD.planta.ariaLabel.includes('bbl/d'),
    `la frase de ahora: «${corta}» (${corta.split(/\s+/).length} palabras; es el nombre accesible de la tubería)`)
  comprobar(ceA.cifras.antes.valor === 1 && ceA.cifras.antes.unidad === 'equipo avisa' && ceA.cifras.antes.frase === 'K-101 (aire de instrumentos) ya pasó el límite.'
      && todosA.cifras.antes.valor === 8 && todosA.cifras.antes.fraseCorta === '8 equipos avisan; el más cercano, K-101 (La Ceiba), ya pasó el límite.'
      && todosA.cifras.antes.valor === D.riesgoAhora(TODOS, ctx0).filter(r => r.estado === 'en-riesgo').length
      && Object.values(ceD.cifras).every(c => c.fraseCorta.split(/\s+/).length <= 20 && c.frase.length > 0),
    `la frase de lo que viene: un conteo y un nombre, nunca una suma de techos («${todosA.cifras.antes.fraseCorta}»); las tres frases cortas, 20 palabras o menos`)
  // Un tramo marcado por momento, el de más barriles: Durante y Después la planta; Antes la planta (K-101).
  const marcados = [ceA, ceD, ceP].map(x => x.planta.tramos.filter(t => t.marcado).map(t => t.tramo).join())
  comprobar(marcados.join('|') === 'planta|planta|planta' && tr(ceD, 'planta').angostoBpd === 9445 && tr(ceD, 'pozo').limita && !tr(ceD, 'planta').limita
      && ceD.cifras.durante.primerEquipo?.equipo === 'P-201B' && ceA.cifras.antes.primerEquipo?.equipo === 'K-101' && ceP.cifras.despues.primerEquipo?.equipo === 'P-201B',
    `un tramo marcado por momento (${marcados.join(' · ')}); la planta se angosta hasta 9.445 bbl/d (lo que deja pasar sin P-201B); limitan los pozos`)
  // La rama del agua, «sin identificar», la venta y la pérdida.
  const r = ceD.planta.ramal
  comprobar(r.hay && r.tanque.nivelPct === 89.6 && r.tanque.altoAltoPct === 90 && f(r.entraBpd) === '174.033' && r.bombas.map(b => `${b.id}:${b.estado}`).join() === 'P-201A:sin-instrumento,P-201B:parada,P-201C:sin-instrumento'
      && ceD.planta.sinIdentificar.titulo === 'LC-21 · 301 bbl/d' && f(ceD.planta.venta.valor) === '9.394' && ceD.planta.venta.metaTexto === 'meta 10.900'
      && f(ceA.planta.venta.valor) === '293.287' && ceA.planta.venta.metaTexto === 'meta 337.900' && f(ceP.planta.venta.valor) === '16.941'
      // F2 (26-oct, H14 e I-ger-3): la pérdida en una línea, como la leyenda de X5 §5.10; qué es, en su ⓘ.
      && ceD.perdida === 'Pérdida: nada registrado en octubre' && /salió y no se vendió/.test(ceD.perdidaExplica) && /nunca se suma/.test(ceD.perdidaExplica),
    'la rama del agua (tanque 89,6 % · alto-alto 90 % · entran 174.033 bbl/d · P-201B parada, las otras dos sin instrumento), LC-21 aparte, la venta contra la meta en cada momento y la pérdida aparte')
  // Las cifras de A, iguales a las de donde salen hoy.
  const c = ESV.cicloValor(['ceiba'], curso.desde, curso.hasta, ctx0, V0)
  const serie = L.serieMensual(['ceiba'], ctx0)
  const base = RPV.lineaBasePorTramo(['ceiba'], new Date(`${CFV.PUESTA_EN_MARCHA}T00:00:00-05:00`), R.AHORA, ctx0, V0)
  const m = ceD.mesAMes.meses
  comprobar(f(ceD.mover.totalBbl) === '2.133' && cerca(ceD.mover.porMomento.durante, c.durante.bbl) && f(ceD.mover.porMomento.antes) === '0' && f(ceD.mover.porMomento.despues) === '30'
      // F2 (26-oct, H2): lo que se muestra es el entero repartido de la cifra (573 + 247 + 118 + 108 = 1.046; 55 + 24 + 11 + 10 = 100); el exacto sigue en `bbl`.
      && ceD.porEquipo.map(x => `${x.equipo} ${x.bblEntero} ${x.pctEntero}`).join(', ') === 'P-201B 573 55, LC-21 247 24, SE-2 118 11, LC-08 108 10'
      && ceD.porEquipo[0].prioridad === 1 && ceD.porEquipo[1].prioridad === 2 && ceD.porEquipo.every((x, i) => cerca(x.bbl, lb.porEquipo[i].bbl))
      && m.length === 13 && m.length === serie.length && f(m[0].totalBpd) === '544' && f(m[0].altoBpd) === '421' && m[4].sobre && f(m[4].totalBpd) === '834'
      && m.filter(x => x.sobre).length === 1 && m[12].enCurso && f(ceD.mesAMes.actualBpd) === '661' && f(ceD.mesAMes.maximoBpd) === '800'
      && ceD.bajando.filas.map(x => `${x.tramo} ${f(x.antesBpd)}→${f(x.ahoraBpd)}`).join(', ') === 'planta 268→51, pozo 122→215'
      && cerca(ceD.bajando.filas[0].antesBpd, base.noPlaneado.planta.baseDia) && /muestra corta$/.test(ceD.bajando.nota)
      && f(ceD.produccion.realBpd) === '10.700' && ceD.produccion.metaBpd === 10900 && ceD.produccion.bajoMeta
      && ceD.esteMes.rango.map(f).join('–') === '889–1.203' && ceD.esteMes.nota === 'P-201B, más de la mitad · 355 sin causa',
    'las cifras de A: lo que se puede mover (el ciclo: 0 · 2.102 · 30 = 2.133, simulado), el diferido por equipo (el Pareto del libro), los 13 meses contra el máximo (febrero 834 pasa 800; octubre 661), ¿está bajando? (268 → 51 en la planta, 122 → 215 en los pozos), la producción 10.700 de 10.900 y el rango 889–1.203')
  // La hoja del tramo: el árbol en el orden de gestión, sin códigos; para producir más.
  const planta = tr(ceD, 'planta')
  comprobar(planta.porque.map(x => `${x.texto} ${f(x.bbl)}`).join(', ') === 'No planeada 573, Planeada 0, Sin saber si fue planeada 0'
      && planta.porque.flatMap(x => x.detalle).every(d => !/\b(?:NP|P)_[A-Z]/.test(d)) && planta.equipos.map(e => e.equipo).join() === 'P-201B,K-101,P-201A,P-201C'
      && planta.frase === 'P-201B (bomba de agua) está parada desde las 03:52 y obligó a cerrar LC-07 y LC-16.'
      && ceD.planta.paraProducirMas === CRV.criticidadDelCampo('ceiba', ctx0).desembotellar && planta.desdeTrim?.texto.includes('268 → 51'),
    `la hoja de la planta: «${planta.frase}», sus equipos (P-201B, K-101, P-201A y P-201C), ¿por qué? sin códigos (${planta.porque[0].detalle.join(' | ')}) y para producir más`)
  // Los estados (X4 §4.10): campo de gas, nada parado, comienzo de mes.
  const za = PV.plantaViva(q(['zarza'], 'durante'), ctx0, V0), gu = PV.plantaViva(q(['guacamayo'], 'durante'), ctx0, V0)
  comprobar(za.planta.campoDeGas && za.planta.textoGas === 'La Zarza es un campo de gas: su tubería todavía no está.'
      && gu.cifras.durante.valor === 0 && gu.cifras.durante.explica === 'Guacamayo produce sin paradas ahora.' && !gu.planta.tramos.some(t => t.marcado)
      && ceP.cifras.despues.explica.endsWith('Septiembre cerró en 7.716 bbl.') && ceP.esteMes.anterior?.bbl > 7715,
    'los estados: La Zarza es de gas (su tubería todavía no está), Guacamayo produce sin paradas (nada marcado) y a comienzo de mes Después dice el mes anterior cerrado (septiembre, 7.716 bbl)')
  void todosP
}

// C5 · Resultados (X4 §4.8) y «un nombre, una cifra» (X4 §1.3.3, §3.1 regla 4; pedido 3 de §4.11): cada rótulo
// con UNA definición, la cifra grande de Resultados igual a la del libro y a la de La planta viva, lo simulado
// nunca como cifra grande, cada rol lo suyo, y en las pantallas de C5 ni «Perdiéndose ahora» ni los 1·2·3 del ciclo.
console.log('\n=== C5. Resultados y un nombre, una cifra ===')
{
  const RS = await v.ssrLoadModule('/src/entities/resultados.ts')
  const PV = await v.ssrLoadModule('/src/entities/planta-viva.ts')
  const RPV = await v.ssrLoadModule('/src/entities/choke-reparto.ts')
  const ESV = await v.ssrLoadModule('/src/entities/escenarios.ts')
  const { readFileSync, readdirSync, statSync } = await import('node:fs')
  const curso = D.rangoDePeriodo('curso'), cerrado = D.rangoDePeriodo('cerrado')
  const qPV = (campos, momento) => ({ campos, momento, desde: curso.desde, hasta: curso.hasta })
  const unNombre = cs => { const ri = D.riesgoAhora(cs, ctx0); return RS.cifrasDeUnNombre(ri, cs.map(c => D.estadoCampo(c, ctx0))) }
  const ce = unNombre(['ceiba']), todos = unNombre(TODOS)

  // 1. «Se deja de producir ahora» es el total del campo (1.966); lo de las bombas, «por bombas paradas» (1.665).
  const tub = RPV.tuberiaCampo('ceiba', curso.desde, curso.hasta, ctx0, V0)
  const p201 = D.prediccion(B.perfilBomba('P-201B', 'ceiba'), ctx0)
  comprobar(f(ce.ahoraBpd) === '1.966' && cerca(ce.ahoraBpd, tub.perdiendoAhoraBpd) && f(ce.porBombasBpd) === '1.665' && cerca(ce.porBombasBpd, p201.perdiendo?.bblDia ?? 0)
      && RS.NOMBRE_CIFRA.ahora === 'Se deja de producir ahora' && RS.NOMBRE_CIFRA.porBombas === 'por bombas paradas'
      && cerca(PV.plantaViva(qPV(['ceiba'], 'durante'), ctx0, V0).cifras.durante.valor, ce.ahoraBpd),
    `«${RS.NOMBRE_CIFRA.ahora}» es el total del campo (${f(ce.ahoraBpd)} bbl/d = la tubería = La planta viva) y lo de P-201B se llama «${RS.NOMBRE_CIFRA.porBombas}» (${f(ce.porBombasBpd)})`)
  // 2. «Durante» de todos los campos: un solo total (2.650), no el del ciclo de alto impacto (2.349 bbl/d, que ya no lleva ese nombre).
  const cic = ESV.cicloValor(TODOS, curso.desde, curso.hasta, ctx0, V0)
  comprobar(f(todos.ahoraBpd) === '2.650' && cerca(todos.ahoraBpd, PV.plantaViva(qPV(TODOS, 'durante'), ctx0, V0).cifras.durante.valor) && f(cic.durante.bblDia) !== f(todos.ahoraBpd),
    `«Durante» en todos los campos es ${f(todos.ahoraBpd)} bbl/d; los ${f(cic.durante.bblDia)} bbl/d del ciclo (solo lo de alto impacto) no se muestran con ese nombre`)
  // 3. «Antes» es un conteo, uno solo para todo el producto: los equipos que avisan (8), no los 6 de alto impacto.
  const riT = D.riesgoAhora(TODOS, ctx0)
  comprobar(todos.avisan === 8 && todos.avisan === PV.plantaViva(qPV(TODOS, 'antes'), ctx0, V0).cifras.antes.valor && riT.filter(r => r.estado === 'en-riesgo' && r.altoImpacto).length === 6
      && ce.avisan === 1 && ce.primero?.equipo === 'K-101' && todos.primero?.equipo === 'K-101' && RS.NOMBRE_CIFRA.avisan === 'Equipos que avisan',
    `«${RS.NOMBRE_CIFRA.avisan}»: ${todos.avisan} en todos los campos (el mismo de La planta viva; de alto impacto son 6, y no se llaman igual) y 1 en La Ceiba, el más cercano K-101`)
  // 4. La exposición: la suma de lo que costaría cada uno que avisa si fallara hoy (45.262), distinta del retorno simulado (45.233), con otro nombre.
  comprobar(f(todos.exposicionBbl) === '45.262' && f(cic.retornoBbl) === '45.233' && RS.NOMBRE_CIFRA.exposicion !== RS.NOMBRE_CIFRA.retorno && todos.sinExposicion === 1,
    `«${RS.NOMBRE_CIFRA.exposicion}» ≈ ${f(todos.exposicionBbl)} bbl (estimado; ${todos.sinExposicion} sin esa cifra) y «${RS.NOMBRE_CIFRA.retorno}» ${f(cic.retornoBbl)} bbl (simulado): dos cifras, dos nombres`)
  // 5. Lo que dan los pozos: según sus pruebas (la tubería, 11.857) no es el potencial del libro (con el factor del mes, 11.360).
  const pozosT = tub.tramos.find(t => t.tramo === 'pozo')
  comprobar(f(pozosT.potencialBpd) === '11.857' && f(D.estadoCampo('ceiba', ctx0).potencialBpd) === '11.360' && RS.NOMBRE_CIFRA.pozos !== RS.NOMBRE_CIFRA.potencial,
    `«${RS.NOMBRE_CIFRA.pozos}» (${f(pozosT.potencialBpd)} bbl/d, según sus pruebas) y «${RS.NOMBRE_CIFRA.potencial}» (${f(D.estadoCampo('ceiba', ctx0).potencialBpd)}, con el factor de asignación): dos preguntas, dos nombres`)
  // 6. El supuesto del plan de un equipo dice de quién es (antes «Perdiéndose ahora 1665 bbl/d.», el nombre del total).
  const cc = ESV.cicloValor(['ceiba'], curso.desde, curso.hasta, ctx0, V0)
  const sup = cc.durante.planes.find(x => x.id === 'durante:ceiba:P-201B:mttr')?.supuestos ?? []
  comprobar(sup[0] === 'Por P-201B se dejan de producir ahora 1665 bbl/d.' && !JSON.stringify(ESV.cicloValor(TODOS, curso.desde, curso.hasta, ctx0, V0)).includes('Perdiéndose'),
    `el plan de P-201B dice «${sup[0]}», y ningún plan del ciclo dice «Perdiéndose»`)

  // 7. Resultados: la cifra grande es el diferido del libro = «Después» y «Este mes» de La planta viva, contra el máximo firmado.
  const ordenes = SAP.historiaSap(ctx0).ordenes
  let t0 = performance.now()
  const rt = RS.resultados({ rol: 'ger', campos: TODOS, desde: curso.desde, hasta: curso.hasta }, ctx0, V0, { ordenes })
  const ms = performance.now() - t0
  const rc = RS.resultados({ rol: 'ger', campos: ['ceiba'], desde: curso.desde, hasta: curso.hasta }, ctx0, V0, { ordenes })
  const lb = L.libro(['ceiba'], curso.desde, curso.hasta, ctx0), pvP = PV.plantaViva(qPV(['ceiba'], 'despues'), ctx0, V0)
  comprobar(ms < 300 && f(rc.cifra.valor) === '1.046' && cerca(rc.cifra.valor, lb.diferido) && cerca(rc.cifra.valor, pvP.cifras.despues.valor) && cerca(rc.cifra.valor, pvP.esteMes.bbl)
      && f(rc.cifra.maximo) === '1.267' && !rc.cifra.sobreMaximo && rc.cifra.frase === 'no se produjeron en La Ceiba.'
      // F2 (26-oct, P-resultados-1): la conclusión primero; la diferencia con enteros (1.267 − 1.046 = 221).
      && rc.cifra.explica === 'Va 221 bbl por debajo del máximo firmado a la fecha (1.267). P-201B, más de la mitad · 355 sin causa. Septiembre cerró en 7.716 bbl.'
      && rc.cifra.fraseCorta.split(/\s+/).length <= 20 && rc.cifra.previo === 'Lo que pasó · octubre, en curso' && rc.cifra.primerEquipo?.equipo === 'P-201B'
      // F2 (26-oct, H2): encima de la raíz, la suma de las raíces (1.253 + 1.046 + 77 = 2.376); el exacto, 2.376,75, se conserva.
      && rt.cifra.entero === 2376 && f(rt.cifra.valor) === '2.377',
    `la cifra grande: ${f(rc.cifra.valor)} bbl «${rc.cifra.frase}» (el libro, «Después» y «Este mes»), contra el máximo de ${f(rc.cifra.maximo)}; todos los campos ${f(rt.cifra.entero)} en ${ms.toFixed(0)} ms (D7)`)
  // 8. La producción contra la meta y el cierre proyectado: lo que va más el ritmo de hoy hasta el último día.
  const p = rc.produccion, est = D.estadoCampo('ceiba', ctx0)
  const cierre = lb.real + (est.potencialBpd - est.perdiendoBpd) * (lb.meta.diasTotal - lb.meta.dias)
  comprobar(f(p.realBpd) === '10.700' && p.metaBpd === 10900 && p.bajoMeta && p.cierre.proyectado && cerca(p.cierre.produccion, cierre) && p.cierre.metaProduccion === lb.meta.produccionTotal
      && cerca(p.cierre.diferido, lb.diferido + est.perdiendoBpd * (lb.meta.diasTotal - lb.meta.dias)) && p.cierre.sobreMaximo,
    `la producción ${f(p.realBpd)} de ${f(p.metaBpd)} bbl/d, y el cierre proyectado de octubre: ${f(p.cierre.produccion)} de ${f(p.cierre.metaProduccion)} bbl; diferido ${f(p.cierre.diferido)} contra ${f(p.cierre.maximoDiferido)}`)
  // 9. ¿Está bajando?, lo de alto impacto y el mantenimiento proactivo; el mes a mes con su parte por tramo.
  const m = rc.mesAMes.meses
  comprobar(rc.bajando.filas.map(x => `${x.tramo} ${f(x.antesBpd)}→${f(x.ahoraBpd)}`).join(', ') === 'planta 268→51, pozo 122→215'
      && f(rc.bajando.altoImpacto.antesBpd) === '310' && f(rc.bajando.altoImpacto.ahoraBpd) === '255' && rc.bajando.altoImpacto.texto.endsWith('−18 %')
      && f(rc.proactivo.porcentaje) === '14' && rc.proactivo.proactivoH === 4 && rc.proactivo.correctivoH === 24
      && m.length === 13 && m.every(x => cerca(Object.values(x.porTramo).reduce((a, y) => a + y, 0), x.totalBpd) || x.totalBpd < 0.5)
      && m.filter(x => x.enPeriodo).map(x => x.mes).join() === '2026-10' && m[12].desdeDia === '2026-10-01' && m[11].hastaDia === '2026-09-30' && m[4].sobre,
    `¿está bajando? (planta 268 → 51, pozos 122 → 215; alto impacto 310 → 255, −18 %), proactivo 14 %, y los 13 meses partidos por tramo sin perder un barril (octubre en el período)`)
  // 10. Lo simulado nunca es la cifra grande: el ciclo va en su tarjeta, por momento, con «simulado».
  comprobar(f(rc.ciclo.totalBbl) === '2.133' && rc.ciclo.momentos.map(x => f(x.bbl)).join(' · ') === '0 · 2.102 · 30' && rc.ciclo.momentos.every(x => /simulado/.test(x.texto))
      && !cerca(rc.cifra.valor, rc.ciclo.totalBbl) && !Object.values(rc.cifra).some(x => typeof x === 'string' && /simulad/.test(x)),
    `el retorno posible del ciclo, ${f(rc.ciclo.totalBbl)} bbl (0 · 2.102 · 30), va aparte con «simulado» en cada línea; la cifra grande no lo dice ni lo es`)
  // 11. Cada rol lo suyo (X4 §4.8; jefe y confiabilidad: mantenimiento y confiabilidad).
  const de = rol => RS.resultados({ rol, campos: ['ceiba'], desde: curso.desde, hasta: curso.hasta }, ctx0, V0, {
    ordenes, relojes: { fallas: 3, totalH: 194, activaH: 9, esperaH: 185 }, vigia: { aciertos: 3, falsas: 1, intervenidas: 2, seguimiento: 1, anticipoDias: 4.2, anunciadas: 3, vigiladas: 3 } })
  const jefe = de('jefe'), conf = de('conf'), reg = de('reg'), prod = de('prod'), ger = de('ger')
  comprobar(ger.secciones.join() === 'produccion,bajando,mesAMes,porEquipo,dondeSeTrabo,dondeBajarlo,tipos,diaADia,ciclo' && ger.mantenimiento === null && ger.confiabilidad === null
      && rt.secciones.join() === 'produccion,bajando,mesAMes,porEquipo,porCampo,dondeBajarlo,tipos,diaADia,ciclo'
      && jefe.secciones[0] === 'mantenimiento' && jefe.mantenimiento.frase === 'De 8,1 días que dura una falla, 7,7 son espera (repuesto, permisos, cuadrilla).'
      && conf.secciones[0] === 'confiabilidad' && conf.confiabilidad.tasa === 75 && /acertó 3 veces de 4/.test(conf.confiabilidad.frase)
      && reg.secciones[0] === 'publicar' && !reg.secciones.includes('ciclo') && reg.publicar.estado === 'provisional' && prod.secciones.slice(0, 2).join() === 'produccion,publicar',
    `cada rol lo suyo: gerente (lo que eran su Resumen, sus Diferidos y su Producción), jefe «${jefe.mantenimiento.frase}», confiabilidad «${conf.confiabilidad.frase}», regulatorio con «¿Se puede publicar?» primero`)
  // 12. Un mes cerrado: el total del período (sin proyección) y su sello.
  const rcc = RS.resultados({ rol: 'ger', campos: ['ceiba'], desde: cerrado.desde, hasta: cerrado.hasta }, ctx0, V0, { ordenes })
  comprobar(!rcc.enCurso && rcc.produccion.cierre.titulo === 'Total del período' && f(rcc.cifra.valor) === '7.716' && rcc.publicar.estado === 'publicable' && rcc.cifra.previo === 'Lo que pasó · septiembre',
    `septiembre: ${f(rcc.cifra.valor)} bbl, el total del período y «se puede publicar»`)

  // 13. En las pantallas de C5: ni «Perdiéndose ahora», ni los dígitos 1·2·3 del ciclo, ni títulos de panel en MAYÚSCULAS.
  const RAIZ_SRC = `${RAIZ}src/`
  // F4 · P-21: el Resumen y sus widgets se borran después de la revisión; se lee lo que exista.
  const { existsSync: existeC5 } = await import('node:fs')
  const archivos = ['pages/Resultados.tsx', 'pages/Diferidos.tsx', 'pages/Produccion.tsx', 'pages/Confiabilidad.tsx', 'pages/Mantenimiento.tsx', 'pages/Riesgo.tsx', 'pages/Turno.tsx', 'pages/Trabajo.tsx', 'pages/Causa.tsx', 'pages/Regulatorio.tsx']
    .filter(a => existeC5(`${RAIZ_SRC}${a}`))
  for (const d of ['resultados', 'diferidos', 'produccion', 'confiabilidad', 'ciclo', 'resumen', 'riesgo', 'choke', 'arbol'].filter(d => existeC5(`${RAIZ_SRC}widgets/${d}`)))
    for (const x of readdirSync(`${RAIZ_SRC}widgets/${d}`)) if (statSync(`${RAIZ_SRC}widgets/${d}/${x}`).isFile()) archivos.push(`widgets/${d}/${x}`)
  const fuenteDe = a => readFileSync(`${RAIZ_SRC}${a}`, 'utf8').split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')
  const perdiendo = archivos.filter(a => /Perdiéndose|PERDIÉNDOSE|perdiéndose/.test(fuenteDe(a)))
  const ciclo = fuenteDe('widgets/ciclo/Ciclo.tsx')
  const enMayus = t => /[A-ZÁÉÍÓÚÑ]{4,}/.test(t) && t === t.toUpperCase() && !/^[A-Z]{2,}[-/]?\d*$/.test(t)
  const mayus = archivos.flatMap(a => [...[...fuenteDe(a).matchAll(/titulo[=:]\s*["']([^"']+)["']/g)].map(x => x[1]),
    ...[...fuenteDe(a).matchAll(/>\s*([A-ZÁÉÍÓÚÑ¿][A-ZÁÉÍÓÚÑ ·,¿?]{5,})\s*</g)].map(x => x[1].trim())].filter(enMayus).map(t => `${a}: ${t}`))
  comprobar(perdiendo.length === 0 && !/ORDEN_FASE|antes: '1', durante: '2', despues: '3'/.test(ciclo) && mayus.length === 0,
    `en las ${archivos.length} pantallas y widgets de C5 no queda «Perdiéndose ahora» (${perdiendo.join(', ') || 'ninguno'}), el ciclo no numera sus momentos y ningún título de panel va en mayúsculas (${mayus.slice(0, 4).join(' · ') || 'ninguno'})`)
}

// C4 · Equipos y nivel técnico (X4 §3.6, §3.7 y §5; la imagen 4): la lista de todos los equipos en su
// orden y con sus filtros, y el nivel 3 de P-201B con las cifras del demo. Y las direcciones (X4 §3.8).
console.log('\n=== C4. Equipos y el nivel 3: la lista, sus filtros y su orden; P-201B como la imagen 4; las direcciones ===')
{
  const ET = await v.ssrLoadModule('/src/entities/equipos-tecnico.ts')
  const FRC = await v.ssrLoadModule('/src/entities/condiciones.ts')
  const CRC = await v.ssrLoadModule('/src/entities/criticidad.ts')
  const ctx = L.contextoInicial()
  let t0 = performance.now()
  const ce = ET.listaEquipos(['ceiba'], ctx, V0)
  const msLista = performance.now() - t0
  const ids = fs => fs.map(x => x.equipo).join(' ')
  // El orden: por estado (la marca, de la más grave a ninguna; lo parado primero) y por «Si falla hoy».
  comprobar(ids(ce.filas.slice(0, 9)) === 'P-201B K-101 LC-21 TK-102 H-302 LC-16 LC-07 P-201A P-201C'
      && ce.filas.slice(9).filter(f => !f.parado && f.cifra.valor !== null && !f.cifra.techo).every((f, i, xs) => i === 0 || xs[i - 1].cifra.valor >= f.cifra.valor)
      && ids(ce.filas.slice(-4)) === 'SE-2 V-101 C-401 LACT-01' && ce.filas.at(-4).cifra.techo && ce.filas.at(-1).cifra.valor === null,
    `La Ceiba, en su orden: ${ids(ce.filas.slice(0, 9))} …; lo medido de mayor a menor, después los techos («hasta»: SE-2, V-101) y al final lo que no tiene cifra (C-401, LACT-01)`)
  // Una marca por equipo: la de la franja, en cada campo y en todos.
  const todos = ET.listaEquipos(TODOS, ctx, V0)
  const marcasIguales = TODOS.every(c => { const fr = FRC.franja([c], ctx); return todos.filas.filter(f => f.campoId === c).every(f => (fr.equipos.find(e => e.equipo === f.equipo)?.condicion ?? null) === (f.condicion ?? null)) })
  comprobar(marcasIguales && todos.filas.filter(f => f.condicion).length === FRC.franja(TODOS, ctx).equipos.length,
    `la marca de cada fila es la de la franja, en cada campo (${todos.filas.filter(f => f.condicion).length} con marca en los cinco campos) y ningún equipo sin marca la lleva`)
  // Los filtros: parados, avisan, sin instrumento y todos; por tipo (una electrosumergible también es pozo) y por tren.
  const en = k => ids(ce.filas.filter(f => f.filtros.includes(k)))
  // F3 · G-15 (por diseño): «Avisan» cuenta lo mismo que «Equipos que avisan» (lo en riesgo): K-101; TK-102 y H-302 siguen con su marca.
  comprobar(en('parados') === 'P-201B LC-21 LC-16 LC-07' && en('avisan') === 'K-101' && en('sin-instrumento') === 'LC-21 P-201A P-201C LC-19 LC-03'
      && ce.cuentas.estado.todos === 28 && ce.cuentas.tipo.bomba === 3 && ce.cuentas.tipo.electrosumergible === 15 && ce.cuentas.tipo.pozo === 18 && ce.cuentas.tipo.superficie === 7
      && ce.cuentas.tren.agua === 3 && ce.cuentas.tren.pozos === 18 && ce.cuentas.tren.servicios === 2
      && ce.filas.find(f => f.equipo === 'P-201A').vigilaTexto === 'no: sin instrumento' && ce.filas.find(f => f.equipo === 'P-201B').vigilaTexto === 'sí · 8 señales',
    `los filtros: parados (${en('parados')}), avisan (${en('avisan')}), sin instrumento (${en('sin-instrumento')}); 3 bombas, 15 electrosumergibles que también son pozos (18), 7 de servicios y proceso; «¿Lo vigila TRIM?»`)
  // Lo que decía Superficie de cada equipo y la lista no puede perder: los que no tienen respaldo (los pozos no lo llevan).
  comprobar(ids(ce.filas.filter(f => f.sinRespaldo)) === 'SE-2 V-101 C-401 LACT-01' && !ce.filas.some(f => f.sinRespaldo && f.tipos.includes('pozo')),
    `sin respaldo, como lo marcaba Superficie: ${ids(ce.filas.filter(f => f.sinRespaldo))}`)
  // La palabra y la cifra de cada fila (X5 §5.5), y «Cambió hoy».
  const fila = id => ce.filas.find(f => f.equipo === id)
  comprobar(fila('P-201B').palabra === 'parada desde hoy, 03:52' && f(fila('P-201B').cifra.valor) === '1.665' && fila('P-201B').cifra.que === 'se deja de producir'
      && fila('K-101').palabra === 'ya pasó el límite' && fila('K-101').cifra.techo && f(fila('K-101').cifra.valor) === '9.394'
      && fila('LC-21').palabra === 'parado sin causa desde el 1 de oct, 18:20' && fila('LC-16').palabra === 'cerrado por P-201B'
      && f(fila('P-201A').cifra.valor) === '3.059' && fila('P-201A').cifra.detalle === 'después de 2 min de colchón' && fila('P-201A').sube === 'sube porque P-201B está parada'
      && fila('P-201B').familia === 'bomba de agua' && fila('K-101').familia === 'aire de instrumentos' && fila('LC-21').familia === 'pozo · bombeo mecánico'
      && ce.cambioHoy[0] === CRC.criticidadDelCampo('ceiba', ctx).cambioHoy,
    `cada fila: «${fila('P-201B').palabra}» 1.665 se deja de producir; K-101 «ya pasó el límite», hasta 9.394 si falla hoy; P-201A 3.059 después de 2 min, «${fila('P-201A').sube}»`)
  const vg = ET.aciertoVigia(['ceiba', 'morichal', 'guacamayo'], ctx)
  // K2 · Una línea que contesta: «desde que entró TRIM» (el nombre de Resultados), sin fecha ni las intervenidas (van al detalle).
  comprobar(vg.aciertos === 5 && vg.juzgadas === 7 && vg.falsas === 2 && vg.intervenidas === 5 && vg.frase === '¿Le creo al vigía? Desde que entró TRIM, acertó 5 de 7 avisos.',
    `el acierto del vigía para confiabilidad, en una línea: «${vg.frase}»`)

  // El nivel 3 de P-201B, con las cifras de la imagen 4.
  t0 = performance.now()
  const n = ET.nivelEquipo('ceiba', 'P-201B', ctx, V0)
  const msN3 = performance.now() - t0
  const sen = tag => n.senales.find(x => x.tag === tag)
  comprobar(n.previo === 'Alarma · parada desde hoy, 03:52 · hace 10,1 h' && f(n.cifra.valor) === '1.665' && n.cifra.frase === 'se dejan de producir: cerró LC-07 y LC-16.'
      && n.bloqueo?.texto === 'No arrancar hasta identificar qué se dañó' && n.bloqueo.sub === 'Si arranca antes, queda como no conformidad.' && n.pregunta?.sobre === 'bomba'
      && n.vecinos.anterior === 'P-201A' && n.vecinos.siguiente === 'P-201C' && n.tren === 'agua'
      && n.subtitulo === 'bomba multietapa de transferencia de agua · tratamiento de agua · criticidad 5 de 5',
    `la cabecera y la cifra: «${n.previo}», 1.665 «${n.cifra.frase}», «${n.bloqueo?.texto}», y sus vecinos del tren (‹ ${n.vecinos.anterior} · ${n.vecinos.siguiente} ›)`)
  // Sus señales: las 7 con indicador y el interruptor; parada: en gris y sin marca (X2 B9). Escala fija, banda y alarma.
  comprobar(n.senales.length === 7 && n.plegadas.length === 0 && n.discretas.map(d => `${d.tag} ${d.valor}`).join() === 'LSH-2013 sin fuga'
      && n.senales.every(x => x.gris && !x.condicion) && sen('PI-2010').limite === 'normal > 10 · alarma 8' && sen('FI-2011').limite === 'normal 66.800 – 89.250'
      && sen('TI-2011').limite === 'normal < 85 · alarma 85' && sen('VI-2011').limite === 'normal < 3,9 · alarma 3,9' && sen('LT-2012').escala.join() === '0,100'
      && n.senales.every(x => x.escala[0] <= Math.min(...x.alarmas, x.banda?.[0] ?? Infinity) && x.escala[1] >= Math.max(...x.alarmas, x.banda?.[1] ?? -Infinity) && x.serie.length === 12)
      && n.sinDisparo,
    'sus señales: 7 con su indicador y la fuga del sello en palabras; paradas, en gris y sin marca; la escala de cada una cubre su banda y su alarma (y el % va de 0 a 100); «falta el disparo» se dice')
  // F3 · H5 (por diseño; X2 I1): la escala sale SOLO de los límites firmados, nunca de las lecturas. Antes esta
  // prueba exigía lo contrario (que la escala cambiara con la ventana); ahora, la misma señal con otras lecturas
  // tiene la misma escala, porque las lecturas ni entran: `escalaDe(unidad, banda, alarmas)`.
  const pi = sen('PI-2010')
  comprobar(ET.escalaDe.length === 3 && ET.escalaDe('psi', [10, Infinity], [8]).join() === pi.escala.join() && pi.escala.join() === '0,20'
      && n.senales.every(x => ET.escalaDe(x.unidad, [x.banda?.[0] ?? -Infinity, x.banda?.[1] ?? Infinity], x.alarmas)?.join() === x.escala?.join()),
    `la escala de PI-2010 (${pi.escala.map(x => x.toLocaleString('es-CO')).join(' a ')} psi) sale de sus límites (normal > 10 · alarma 8), no de las lecturas: no se mueve con el valor de ahora`)
  // El tren de agua, «mientras esté parada», los días antes de parar, la historia y los repuestos.
  const e = n.esquemaAgua, m = n.mientras
  comprobar(e.tanque.nivelPct === 89.6 && e.tanque.altoAltoPct === 90 && e.bombas.map(b => `${b.id}:${b.marcha}:${b.instrumentada ? 'i' : 's'}`).join() === 'P-201A:sin-lectura:s,P-201B:parada:i,P-201C:sin-lectura:s'
      && e.instrumentos.map(i => `${i.letras} ${i.valor}`).join(', ') === 'PI 18.2, PDI 0, FI 0' && f(e.entraBpd) === '174.033' && e.toman.join() === 'P-201A,P-201C',
    'en su tren de agua: el tanque al 89,6 % (alto-alto 90 %), P-201B parada y las otras dos sin instrumento, PI 18,2 · PDI 0 · FI 0, entran 174.033 bbl/d y las toman P-201A y P-201C')
  comprobar(f(m.entraBpd) === '174.033' && f(m.cabenBpd) === '178.500' && m.tanquePct === 89.6 && m.frase === 'El nivel no sube: P-201A y P-201C toman lo que entra.'
      && m.pasos.map(x => `${x.pozo}${x.fraccion < 0.999 ? ` ${f(x.fraccion * 100)}` : ''}`).join(' · ') === 'LC-02 · LC-10 · LC-01 · LC-17 · LC-14 · LC-06 25 · LC-09 25 · LC-11 20'
      && f(m.crudoBpd) === '3.059' && f(m.parejoBpd) === '4.577' && m.colchon === '2 min',
    'mientras esté parada: entran 174.033, caben 178.500, el tanque al 89,6 %; si para otra, LC-02 · LC-10 · LC-01 · LC-17 · LC-14 · LC-06 al 25 % · LC-09 al 25 % · LC-11 al 20 %: 3.059 bbl/d después de 2 min (parejo, 4.577)')
  const h = n.historia
  comprobar(n.tendencias.titulo === 'Los 12 días antes de parar' && n.tendencias.series.slice(0, 2).map(x => x.tag).join() === 'TI-2011,II-2011' && n.tendencias.series.length <= 3
      && n.tendencias.modoFalla === 'Lubricación de cojinete'
      && h.fallas === 9 && f(h.cadaDias) === '41' && h.fueraH.toFixed(1) === '40.0' && f(h.bblPorFalla) === '4.593' && h.porParte.map(x => `${x.parte} ${x.fallas}`).join(' · ') === 'Sello mecánico 5 · Rodamientos 3'
      && h.ultimas.map(u => `${u.dia} ${u.que} ${f(u.bbl)}`).join(' | ') === '22 de sept rodamientos 1.041 | 9 de ago sello mecánico 3.806'
      && n.repuestos.map(r => `${r.descripcion}${r.llega ? ` ${r.llega}` : ` ${r.plazoDias} d`}${r.aviso ? ' ■3' : ''}`).join(' | ') === 'Kit de sello mecánico llega 1 el 9 de oct | Impulsor y anillos de desgaste 45 d ■3',
    `los días antes de parar (${n.tendencias.series.map(x => x.tag).join(', ')}: lo que se movió), su historia (9 fallas, una cada 41 d, 40,0 h fuera, 4.593 bbl por falla; 22 de sept rodamientos 1.041 · 9 de ago sello 3.806) y los repuestos que faltan`)
  // Sin instrumento, en marcha con muchas señales, y lo que no existe.
  const a = ET.nivelEquipo('ceiba', 'P-201A', ctx, V0), mpp = ET.nivelEquipo('morichal', 'MPP-301', ctx, V0)
  comprobar(!a.registrado && !a.cifra && !a.vigila && a.senales.length === 0 && a.esquemaAgua && a.vecinos.siguiente === 'P-201B' && !a.vecinos.anterior && !a.diagnostico
      && a.mientras?.titulo === 'Mientras P-201B esté parada' && n.mientras.titulo === 'Mientras esté parada'
      && mpp.senales.length === 4 && mpp.plegadas.length === 12 && mpp.senales.find(x => x.tag === 'PDT-3011').condicion === 'atencion' && mpp.cifra.valor === 0
      && ET.resumenPlegadas(mpp.plegadas) === '12 señales más: 6 temperaturas, 4 presiones, 1 de vibración y 1 de corriente · todas en banda'
      && mpp.tendencias.titulo === 'Los últimos 12 días' && mpp.tendencias.series[0].tag === 'PDT-3011'
      && ET.nivelEquipo('ceiba', 'NO-EXISTE', ctx, V0) === undefined,
    `P-201A sin instrumento (lo que se sabe, su esquema y «Mientras P-201B esté parada», sin cifra ni diagnóstico); MPP-301 en marcha: 4 señales abiertas (la de atención con su marca) y «${ET.resumenPlegadas(mpp.plegadas)}»; un equipo que no existe, nada`)
  comprobar(msLista < 300 && msN3 < 300, `D7: la lista de La Ceiba en ${msLista.toFixed(0)} ms y el nivel 3 en ${msN3.toFixed(0)} ms (menos de 300)`)

  // Las direcciones (X4 §3.8): Equipos sin período, las de antes abren el nivel 3, el nivel 4 con «/diagnostico».
  const URLC = await v.ssrLoadModule('/src/app/url.ts')
  const ROLC = await v.ssrLoadModule('/src/entities/roles.ts')
  const navC = { hash: '' }
  Object.defineProperty(globalThis, 'location', { value: { get hash() { return navC.hash } }, configurable: true, writable: true })
  Object.defineProperty(globalThis, 'history', { value: { pushState: (_e, _t, u) => { navC.hash = u }, replaceState: (_e, _t, u) => { navC.hash = u } }, configurable: true, writable: true })
  const lee = (h, rol) => { navC.hash = h; return URLC.leerHash(undefined, rol) }
  const viejo = lee('#/sup/bombas/ceiba/curso/P-201B'), nuevo = lee('#/sup/equipos/ceiba/P-201B'), diag = lee('#/conf/equipos/ceiba/P-201B/diagnostico')
  const conPer = lee('#/conf/equipos/ceiba/curso/P-201B'), ger = lee('#/ger/riesgo/ceiba/curso/P-201B'), gerEq = lee('#/ger/equipos/ceiba/P-201B/diagnostico'), lista = lee('#/conf/equipos/ceiba')
  const pozoProd = lee('#/prod/pozos/ceiba/curso/LC-16')
  URLC.escribirHash({ rolId: 'conf', pantalla: 'equipos', campoId: 'ceiba', periodoId: 'curso', alcance: 'campo', equipoAbierto: 'P-201B', rango: null })
  const escrito = navC.hash
  URLC.escribirHash({ rolId: 'conf', pantalla: 'equipos', campoId: 'ceiba', periodoId: 'curso', alcance: 'campo', equipoAbierto: 'P-201B/diagnostico', rango: null })
  const escritoDiag = navC.hash
  comprobar(viejo.pantalla === 'equipos' && viejo.equipoAbierto === 'P-201B' && viejo.periodoId === 'curso' && nuevo.pantalla === 'equipos' && nuevo.equipoAbierto === 'P-201B' && nuevo.periodoId === undefined
      && diag.equipoAbierto === 'P-201B/diagnostico' && conPer.equipoAbierto === 'P-201B' && conPer.periodoId === 'curso' && lista.pantalla === 'equipos' && lista.equipoAbierto === undefined
      // C5 (26-oct): el Riesgo del gerente se fundió en La planta viva: su dirección abre ahí, con su ficha.
      && ger.pantalla === 'plantaViva' && ger.equipoAbierto === 'P-201B' && gerEq.pantalla === 'equipos' && gerEq.equipoAbierto === 'P-201B' && pozoProd.pantalla === 'equipos' && pozoProd.equipoAbierto === 'LC-16'
      && escrito === '#/conf/equipos/ceiba/P-201B' && escritoDiag === '#/conf/equipos/ceiba/P-201B/diagnostico',
    `las direcciones: #/sup/bombas/ceiba/curso/P-201B abre su nivel 3 (#/sup/equipos/ceiba/P-201B), «/diagnostico» el 4, la de producción a un pozo también; el gerente sigue con su ficha (${ger.pantalla} + P-201B); Equipos se escribe sin período (${escrito})`)
  comprobar(ROLC.rolPorId('conf').inicio === 'equipos' && URLC.abreNivel3(ROLC.rolPorId('conf')) && !URLC.abreNivel3(ROLC.rolPorId('ger')) && !URLC.abreNivel3(ROLC.rolPorId('adm'))
      && ['prod', 'sup', 'oper', 'jefe', 'conf', 'plan', 'tec'].every(r => URLC.abreNivel3(ROLC.rolPorId(r)) || !ROLC.rolPorId(r).pantallas.includes('equipos')),
    'confiabilidad abre en Equipos; los roles técnicos abren el nivel 3 como vista; el gerente y el administrador, el panel')
}

// F3 · Configuración (P-04; X4 §2 y §3.4, adm): el estado de la configuración de un campo, «N de M pasos listos»,
// DERIVADO de la configuración firmada y de lo contestado en el borrador (pendientesDe). Nada se supone.
console.log('\n=== F3. Configuración: el estado de cada campo (N de M pasos listos), derivado de lo firmado y del borrador ===')
{
  const CC = await v.ssrLoadModule('/src/entities/choke-config.ts')
  const CHO = await v.ssrLoadModule('/src/entities/choke.ts')
  const ctx = L.contextoInicial()
  const t0 = performance.now()
  const e = CC.estadoConfiguracion('ceiba', ctx)
  const ms = performance.now() - t0
  const marca = x => x.pasos.map(p => `${p.paso}:${p.listo ? 'sí' : 'no'}`).join(' ')
  comprobar(e.listos === 3 && e.total === 6 && e.siguiente === 'topologia' && marca(e) === 'perfil:sí tanques:sí topologia:no capacidades:no factor:no metas:sí'
      && e.frase === 'La Ceiba: 3 de 6 pasos listos. Falta firmar a qué pozos sirve cada equipo.' && e.falta === 'Falta firmar a qué pozos sirve cada equipo.',
    `La Ceiba: «${e.frase}» (${marca(e)})`)
  // Cada paso es su fuente: el perfil firmado, la topología firmada, las capacidades con el dato del demo, el factor, la meta.
  const paso = (x, k) => x.pasos.find(p => p.paso === k)
  // K2 · La fila en el teléfono: el estado en una o dos palabras; el detalle entero sigue en `detalle`.
  comprobar(e.pasos.map(p => p.corto).join(' | ') === 'firmado | completos | sin firmar | sin firmar | sin firmar | firmada por el gerente'
      && e.pasos.every(p => p.corto.split(' ').length <= 4 && !/\d/.test(p.corto)),
    `cada paso, corto para el teléfono: ${e.pasos.map(p => `${p.nombre} «${p.corto}»`).join(', ')}`)
  comprobar(paso(e, 'perfil').listo === C.tienePerfil(ctx.config, 'ceiba') && paso(e, 'topologia').listo === CHO.topologiaFirmada('ceiba', ctx)
      && paso(e, 'topologia').detalle === `TRIM la deduce del registro: faltan ${CHO.topologiaDe('ceiba', ctx).length} equipos por confirmar y firmar`
      && paso(e, 'capacidades').detalle.startsWith('dato del demo, sin firmar: tren de crudo, tren de agua, tren de gas, afuera')
      && paso(e, 'factor').detalle === 'sin firmar: rige 1' && paso(e, 'metas').firma === 'gerente' && paso(e, 'metas').listo === !!C.metaEn(ctx.config, 'ceiba', R.AHORA.getTime()),
    `cada paso sale de lo firmado: «${paso(e, 'topologia').detalle}», «${paso(e, 'capacidades').detalle}», el factor «${paso(e, 'factor').detalle}», y la meta la firma el gerente`)
  // Los tanques solo cuentan si el campo los tiene; el tren de gas, si el perfil dice que hay gas.
  const pal = CC.estadoConfiguracion('palmar', ctx)
  comprobar(pal.total === 5 && !paso(pal, 'tanques') && !paso(pal, 'capacidades').detalle.includes('tren de gas') && pal.frase.startsWith('El Palmar: 2 de 5 pasos listos.'),
    `un campo sin tanques ni gas no los pide: «${pal.frase}» («${paso(pal, 'capacidades').detalle}»)`)
  // Lo contestado en el borrador lo dice la regla de la primera firma (pendientesDe), sin firmar todavía.
  const base = CHO.topologiaDe('ceiba', ctx)
  const todosPozos = P.pozosDe('ceiba').map(p => p.id)
  const respuesta = el => ({ r: CC.respuestaDe(el, todosPozos).r, elemento: el })
  const unaSola = { ceiba: { base, firmada: false, respuestas: { [base[0].elemento]: respuesta(base[0]) } } }
  const conBorrador = CC.estadoConfiguracion('ceiba', ctx, unaSola)
  comprobar(paso(conBorrador, 'topologia').detalle === `en el borrador faltan ${CC.pendientesDe(unaSola.ceiba).length} de ${base.length} equipos por contestar` && conBorrador.listos === 3,
    `con una respuesta en el borrador: «${paso(conBorrador, 'topologia').detalle}» y nada cambia de listo hasta firmar`)
  // Al firmar, la cuenta cambia: la topología completa (4 de 6) y después el factor de medición (5 de 6).
  const todas = { ceiba: { base, firmada: false, respuestas: Object.fromEntries(base.map(el => [el.elemento, respuesta(el)])) } }
  comprobar(paso(CC.estadoConfiguracion('ceiba', ctx, todas), 'topologia').detalle === 'contestada en el borrador: falta firmarla', 'contestada entera en el borrador: «falta firmarla»')
  const firmadaTopo = { ...ctx, config: CC.conTopologia(ctx.config, todas) }
  const e2 = CC.estadoConfiguracion('ceiba', firmadaTopo)
  const conFactor = { ...firmadaTopo, config: { ...firmadaTopo.config, capacidades: [{ campoId: 'ceiba', factorMedicion: { valor: 0.98, porque: 'prueba de F3' } }] } }
  const e3 = CC.estadoConfiguracion('ceiba', conFactor)
  comprobar(e2.listos === 4 && e2.siguiente === 'capacidades' && paso(e2, 'topologia').detalle === 'firmada' && paso(e2, 'topologia').corto === 'firmada' && e3.listos === 5 && e3.siguiente === 'capacidades'
      && paso(e3, 'factor').detalle === 'firmado: 0,980' && paso(e3, 'factor').corto === 'firmado' && CC.estadoConfiguracion('morichal', conFactor).listos === 3,
    `al firmar cambia la cuenta: la topología → «${e2.frase}»; el factor → «${e3.frase}» (y los otros campos no cambian)`)
  // Sin meta firmada falta, pero lo siguiente del administrador sigue siendo lo suyo.
  const sinMeta = { ...ctx, config: { ...ctx.config, campos: { ...ctx.config.campos, ceiba: { ...ctx.config.campos.ceiba, metas: [] } } } }
  const e4 = CC.estadoConfiguracion('ceiba', sinMeta)
  comprobar(e4.listos === 2 && !paso(e4, 'metas').listo && paso(e4, 'metas').detalle === 'sin meta firmada para hoy' && paso(e4, 'metas').corto === 'la firma el gerente' && e4.siguiente === 'topologia',
    'sin meta firmada, el paso falta y lo firma el gerente; lo siguiente del administrador sigue siendo lo suyo')
  comprobar(ms < 300, `D7: el estado de La Ceiba en ${ms.toFixed(0)} ms (menos de 300)`)
}

// F2 · Regulatorio (P-03; X4 §2 y §3.4): el inicio de regulatorio dice qué falta para el reporte a la ANH, quién lo
// debe y para cuándo. Las paradas sin causa (sin el paso 5) salen de las filas de la ANH, sus barriles con la regla de
// redondeo (LC-21 247 + LC-08 108 = 355, no 356) y la hora límite del reporte diario; la pantalla ya no lleva los
// códigos en la primera capa, ni los pasos numerados, ni «se pierde» (T-8, T-10, T-11, P-reg-1, G-5, I-reg-2, UI-17).
console.log('\n=== F2 · Regulatorio: qué falta para el reporte a la ANH, quién lo debe y para cuándo ===')
{
  const RG = await v.ssrLoadModule('/src/entities/regulatorio.ts')
  const RD = await v.ssrLoadModule('/src/entities/redondeo.ts')
  const curso = D.rangoDePeriodo('curso'), cerrado = D.rangoDePeriodo('cerrado')
  let t0 = performance.now()
  const ce = RG.reporteAnh({ campos: ['ceiba'], desde: curso.desde, hasta: curso.hasta }, ctx0)
  const ms = performance.now() - t0
  const en = RD.enterosDelPeriodo('ceiba', curso.desde, curso.hasta, ctx0)
  const fila = eq => ce.paradas.find(p => p.equipo === eq)
  comprobar(ce.cifra.valor === 2 && ce.cifra.unidad === 'paradas sin causa' && ce.paradas.map(p => `${p.equipo} ${p.bbl}`).join(', ') === 'LC-21 247, LC-08 108'
      && ce.bblSinCausa === 355 && ce.bblSinCausa === en.porTramo['sin-asignar'] && f(L.libro(['ceiba'], curso.desde, curso.hasta, ctx0).pendiente) === '355'
      && fila('LC-08').bbl === en.porEquipo['LC-08'] && Math.abs(fila('LC-08').exacto - 108.52) < 0.01,
    `La Ceiba, octubre: ${ce.cifra.valor} ${ce.cifra.unidad}, ${ce.paradas.map(p => `${p.equipo} ${p.bbl}`).join(' + ')} = ${ce.bblSinCausa} bbl (el entero de «sin identificar»; LC-08 dice 108 y no 109)`)
  // K2 · Bajo la cifra grande («2 paradas sin causa») la frase no repite la cuenta, y quién y para cuándo van en una
  // oración; la pregunta que le llegó al operador sigue en cada parada (`pregunta`), a un toque.
  comprobar(ce.estado === 'provisional' && ce.cifra.frase === 'No se puede publicar todavía: octubre sigue abierto y les falta la causa (355 bbl).'
      && !/\b2 paradas\b/.test(ce.cifra.frase)
      && ce.paradas.every(p => p.faltan.length === 6 && p.falta === 'faltan todos los pasos' && p.debe.rol === 'oper' && p.debe.nombre === 'operador de campo'
        && p.pregunta?.texto === '¿Qué lo paró?' && p.limite === '2026-10-03T07:00:00-05:00' && !p.vencido && p.cuando === 'mañana antes de las 07:00')
      && ce.cifra.explica === 'Las contesta el operador de campo mañana antes de las 07:00.',
    `la frase de X4 §3.4 sin repetir la cifra: «${ce.cifra.frase}» y quién lo debe y para cuándo: «${ce.cifra.explica}»`)
  // Una parada cuyo último día ya se reportó dice que venció (MN-22 de Morichal, cerrada el 1 de oct); septiembre se puede publicar.
  const mo = RG.reporteAnh({ campos: ['morichal'], desde: curso.desde, hasta: curso.hasta }, ctx0)
  const se = RG.reporteAnh({ campos: ['ceiba'], desde: cerrado.desde, hasta: cerrado.hasta }, ctx0)
  const to = RG.reporteAnh({ campos: TODOS, desde: curso.desde, hasta: curso.hasta }, ctx0)
  comprobar(mo.paradas.length === 1 && mo.paradas[0].equipo === 'MN-22' && mo.paradas[0].vencido && mo.paradas[0].cuando === 'venció el 2 de oct a las 07:00'
      && mo.paradas[0].falta === 'falta quién, si fue planeada, la causa y el detalle'
      && se.estado === 'publicable' && se.titulo === 'Se puede publicar' && se.cifra.valor === 0
      && to.cifra.valor === 3 && to.bblSinCausa === ce.bblSinCausa + mo.bblSinCausa && ms < 300,
    `MN-22 (Morichal) «${mo.paradas[0]?.cuando}»; septiembre en La Ceiba «${se.titulo}» sin paradas sin causa; todos los campos ${to.cifra.valor} (${to.bblSinCausa} bbl = la suma de cada campo); D7 en ${ms.toFixed(0)} ms`)
  // La pantalla: sin los códigos en la primera capa, sin pasos numerados, sin «se pierde», con «Potencial del libro»
  // y un solo «Exportar» (el CSV para la ANH va en la cabecera).
  const { readFileSync } = await import('node:fs')
  const fuente = a => readFileSync(`${RAIZ}src/${a}`, 'utf8')
  const reg = fuente('pages/Regulatorio.tsx'), arb = fuente('widgets/choke/ArbolCircular.tsx'), exp = fuente('widgets/informe/Exportar.tsx') + fuente('widgets/informe/useExportar.ts')
  comprobar(reg.includes('useReporteAnh') && !/font-mono|truncate|Exportar CSV|Potencial \(pruebas|descargarCsv/.test(reg) && reg.includes('NOMBRE_CIFRA.potencial')
      && !/se pierde|\{i \+ 1\}\.|>modelo choke</.test(arb) && /\[&_\[data-cadena\]\]:hidden/.test(arb) && arb.includes('Ver los códigos ANH')
      && exp.includes('CSV para la ANH') && exp.includes("pantalla === 'regulatorio'"),
    'la pantalla: la cifra del motor arriba; sin monoespaciada ni calibraciones cortadas; «Potencial del libro»; los códigos detrás de «Ver los códigos ANH»; sin pasos numerados ni «se pierde»; el CSV para la ANH en «Exportar»')
}

// F3 · Bombas y pozos (fase 4 de la revisión: T-8/H15, G-16, G-5, H3, H5, H12, H17, UI-04 y UI-15). En Bombas,
// Electrosumergibles, Pozos, Planta, Agua y la ficha ejecutiva: lo diferido no «se pierde» (se deja de producir);
// «Si falla hoy» no se llama «si se para»; ningún título va en MAYÚSCULAS ni en letra de máquina; la marca de un
// equipo no la decide la pantalla (la da la franja: una por equipo); y ninguna variable se dibuja con el indicador
// viejo, cuya escala se movía con la lectura: la escala fija la da el motor. Y el motor la da para cada variable
// que pinta la placa de una bomba o la ficha de un pozo (el mismo tag), así ninguna queda sin su indicador.
console.log('\n=== F3 · Bombas y pozos: se deja de producir, «Si falla hoy», títulos en frase, la marca de la franja y la escala del motor ===')
{
  const { readFileSync, readdirSync, statSync } = await import('node:fs')
  const SRC = `${RAIZ}src/`
  const archivos = ['pages/Bombas.tsx', 'pages/Esp.tsx', 'pages/Pozos.tsx', 'pages/Planta.tsx', 'pages/Agua.tsx', 'widgets/equipo/FichaEjecutiva.tsx']
  for (const d of ['bombas', 'pozos', 'planta'])
    for (const x of readdirSync(`${SRC}widgets/${d}`)) if (statSync(`${SRC}widgets/${d}/${x}`).isFile()) archivos.push(`widgets/${d}/${x}`)
  // Sin los comentarios: lo que se lee en la pantalla es el código, no la nota que explica por qué.
  const fuente = a => readFileSync(`${SRC}${a}`, 'utf8').split('\n').filter(l => !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(l)).join('\n')
  const con = re => archivos.filter(a => re.test(fuente(a)))
  const pierde = con(/\bse pierden?\b|\bpierde\s+[<$\d{]|habrían perdido/i)
  const seSePara = con(/si se para|SI SE PARA|Si para ahora/)
  const enMayus = t => /[A-ZÁÉÍÓÚÑ]{4,}/.test(t) && t === t.toUpperCase() && !/^[A-Z]{2,}[-/]?\d*$/.test(t)
  const mayus = archivos.flatMap(a => [...[...fuente(a).matchAll(/titulo[=:]\s*["'`]([^"'`]+)["'`]/g)].map(x => x[1]),
    ...[...fuente(a).matchAll(/>\s*([A-ZÁÉÍÓÚÑ¿][A-ZÁÉÍÓÚÑ ·,¿?]{5,})\s*</g)].map(x => x[1].trim())].filter(enMayus).map(t => `${a}: ${t}`))
  const maquina = con(/font-mono|toUpperCase\(\)\}/)
  const prioridadDePantalla = con(/MarcaPrioridad s=\{[a-z.]*severidad\}|sevPozo|altoImpacto \? 1 : 2|s=\{1\} tamano=\{14\}/)
  const viejo = con(/<Analogico\b/)
  comprobar(pierde.length === 0 && seSePara.length === 0 && mayus.length === 0 && maquina.length === 0 && prioridadDePantalla.length === 0 && viejo.length === 0
      && con(/Potencial ahora/).length === 0,
    `en las ${archivos.length} pantallas y widgets: nada «se pierde» (${pierde.join(', ') || 'ninguno'}), ningún «si se para» (${seSePara.join(', ') || 'ninguno'}), ningún título en MAYÚSCULAS (${mayus.slice(0, 3).join(' · ') || 'ninguno'}) ni en letra de máquina (${maquina.join(', ') || 'ninguno'}), ninguna marca de equipo decidida en la pantalla (${prioridadDePantalla.join(', ') || 'ninguna'}), ningún indicador con la escala móvil (${viejo.join(', ') || 'ninguno'}) y «Potencial del libro»`)
  // El motor da la escala (y el gris y la marca) de cada variable que pinta la placa o la ficha del pozo.
  const ETF = await v.ssrLoadModule('/src/entities/equipos-tecnico.ts')
  const APIE = await v.ssrLoadModule('/src/shared/api/equipos.ts')
  const APID = await v.ssrLoadModule('/src/shared/api/diferidos.ts')
  const FRF = await v.ssrLoadModule('/src/entities/condiciones.ts')
  const ctx = L.contextoInicial()
  const cal = L.calendario()[0]
  const bombas = APIE.pedirBombas(['ceiba', 'morichal'], new Date(cal.desde), new Date(cal.hasta), ctx, V0)
  const tags = (c, e) => { const n = ETF.nivelEquipo(c, e, ctx, V0); return new Set([...(n?.senales ?? []), ...(n?.plegadas ?? [])].map(s => s.tag)) }
  const sinEscala = bombas.flatMap(b => b.senales.filter(s => !tags(b.campo.id, b.eq.id).has(s.tag)).map(s => `${b.eq.id}:${s.tag}`))
  const pozo = APID.pedirPozo('ceiba', 'LC-14', new Date(cal.desde), new Date(cal.hasta), ctx)
  const sinEscalaPozo = (pozo?.senales ?? []).filter(s => !tags('ceiba', 'LC-14').has(s.tag)).map(s => s.tag)
  // La marca de cada placa: la de la franja, no la severidad de su estado (MPP-301: ▲ atención, aunque su estado diga aviso).
  const mpp = bombas.find(b => b.eq.id === 'MPP-301')
  const deFranja = FRF.franja(['morichal'], ctx).equipos.find(e => e.equipo === 'MPP-301')?.condicion
  comprobar(bombas.length >= 3 && sinEscala.length === 0 && pozo && sinEscalaPozo.length === 0
      && ETF.nivelEquipo('morichal', 'MPP-301', ctx, V0).condicion === deFranja && deFranja === 'atencion' && mpp.eq.severidad === 3,
    `el motor da la escala fija de cada variable de las ${bombas.length} placas (${sinEscala.join(', ') || 'todas'}) y de la ficha de LC-14 (${sinEscalaPozo.join(', ') || 'todas'}); la marca de MPP-301 es la de la franja (${deFranja}), no la de su estado (prioridad ${mpp.eq.severidad})`)
}

// F2 · Riesgo y agua (fase 4 de la revisión: T-8/G-1/G-2/H15, H3, H16, H17, G-16, T-9/P-planta-2, P-planta-3, G-6,
// P-agua-1, P-agua-2, H32, P-09, P-riesgo-1, T-10, T-11, A18, H22, UI-04 y UI-15). En Riesgo, «Si falla hoy» y los
// widgets de la tubería y del agua (`widgets/choke`): lo diferido no «se pierde»; lo que sale hoy se llama «Sale hoy»
// (como en La planta viva); la marca de cada equipo es la de la franja (una por equipo) y lleva su palabra, y sin
// condición no hay marca; el costo de una falla no se llama «si falla hoy» (D-2); ni puestos numerados, ni «modelo
// choke» como rótulo, ni listas numeradas junto a una marca; sin letra de máquina ni condensada; el salto a «Si falla
// hoy» respeta «reducir movimiento». Y la línea corta de lo que limita sale de las cifras del motor.
console.log('\n=== F2 · Riesgo y agua: se deja de producir, la marca de la franja, la cuenta detrás de «Ver la cuenta» ===')
{
  const { readFileSync } = await import('node:fs')
  const SRC = `${RAIZ}src/`
  // K1 · P-10: Riesgo del jefe y de confiabilidad vive en Equipos (`widgets/riesgo/EnRiesgo.tsx`, con su salto en
  // `ancla.ts`); K1 · P-16: la tubería de antes (`choke/Tuberia.tsx`) se borró. Se lee lo que exista.
  const { existsSync: existeRie } = await import('node:fs')
  const archivos = ['widgets/riesgo/EnRiesgo.tsx', 'widgets/riesgo/ancla.ts', 'widgets/riesgo/SiFallaHoy.tsx', 'widgets/riesgo/condicion.ts',
    ...['Tuberia.tsx', 'Agua.tsx', 'AguaHoy.tsx', 'Serie.tsx', 'Escalera.tsx', 'Ramas.tsx', 'Campos.tsx', 'palabras.ts'].map(x => `widgets/choke/${x}`)]
    .filter(a => existeRie(`${SRC}${a}`))
  // Sin los comentarios: lo que se lee en la pantalla es el código, no la nota que explica por qué.
  const fuente = a => readFileSync(`${SRC}${a}`, 'utf8').split('\n').filter(l => !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(l)).join('\n')
  const con = (re, xs = archivos) => xs.filter(a => re.test(fuente(a)))
  const pierde = con(/\bse pierden?\b|\bpierden\b|se perdió|se está perdiendo|dónde se pierde/i)
  const pasaHoy = con(/[Pp]asa hoy/)
  // Letra de máquina o condensada en lo que se lee (los meses y las abreviaturas de un eje sí van condensados: Serie).
  const maquina = con(/font-mono|font-cond|>\s*(PARADA|HOY)\s*</, archivos.filter(a => !a.endsWith('Serie.tsx')))
  const marcaDePantalla = con(/MarcaPrioridad s=\{(r\.altoImpacto|perdiendo\[0\]\.altoImpacto|r\.prioridad|sev\(f\))|severidad \?\? 0/, ['widgets/riesgo/EnRiesgo.tsx', 'widgets/riesgo/SiFallaHoy.tsx'])
  const costoComoSiFalla = con(/\['Si falla hoy', `≈|rotulo="si falla hoy"/, ['widgets/riesgo/EnRiesgo.tsx'])
  const numerados = con(/list-decimal|\[grid-area:n\]|<span>modelo choke<\/span>/)
  const rd = `${fuente('widgets/riesgo/EnRiesgo.tsx')}\n${fuente('widgets/riesgo/ancla.ts')}`
  const suave = /behavior: 'smooth'/.test(rd) && !/prefers-reduced-motion/.test(rd)
  comprobar(pierde.length === 0 && pasaHoy.length === 0 && maquina.length === 0 && marcaDePantalla.length === 0 && costoComoSiFalla.length === 0 && numerados.length === 0 && !suave
      && /titulo="Por qué"/.test(rd) && !/Se deja de producir ahora, por causa/.test(rd) && /FAMILIA\[/.test(rd),
    `Riesgo, «Si falla hoy» y los widgets de la tubería y del agua: nada «se pierde» (${pierde.join(', ') || 'ninguno'}), «Sale hoy» y no «Pasa hoy» (${pasaHoy.join(', ') || 'ninguno'}), sin letra de máquina (${maquina.join(', ') || 'ninguno'}), ninguna marca decidida en la pantalla (${marcaDePantalla.join(', ') || 'ninguna'}), el costo de una falla con su nombre (${costoComoSiFalla.join(', ') || 'bien'}), sin puestos ni listas numeradas ni el rótulo «modelo choke» (${numerados.join(', ') || 'ninguno'}), el reparto se llama «Por qué», la familia es la de campo y el salto respeta «reducir movimiento»`)

  // Las palabras de la tubería: la línea corta sale de las cifras del motor; «sin firmar» una vez, lo del demo en su ⓘ.
  const PAL = await v.ssrLoadModule('/src/widgets/choke/palabras.ts')
  const RPA = await v.ssrLoadModule('/src/entities/choke-reparto.ts')
  const FA = await v.ssrLoadModule('/src/shared/lib/formato.ts')
  const curso = D.rangoDePeriodo('curso')
  const tub = RPA.tuberiaCampo('ceiba', curso.desde, curso.hasta, ctx0, V0)
  const hoy = tub.tramos.find(x => x.tramo === 'planta')?.disponibleHoy
  const corta = PAL.limitaEnCorto(tub.limita, hoy, FA.n0)
  const textos = Object.values(PAL.TEXTO).join(' ')
  comprobar(corta === 'Limitan los pozos. Con P-201B parada, el agua solo deja pasar 236 bbl/d más de crudo.' && PAL.limitaEnCorto('planta') === 'Limita la planta.'
      && PAL.ESTADO_TRAMO.demo === 'sin firmar' && !/perd/.test(textos) && /dato del demo/.test(PAL.TEXTO.sinFirmar),
    `la línea de lo que limita, de las cifras del motor: «${corta}»; «sin firmar» en cada caja y «dato del demo» en su ⓘ; los textos de la tubería no dicen «perder»`)

  // Una marca por equipo: la de la franja (la misma de la cabecera y de Equipos), con su palabra; sin condición, ninguna.
  const CDR = await v.ssrLoadModule('/src/widgets/riesgo/condicion.ts')
  const FRR = await v.ssrLoadModule('/src/entities/condiciones.ts')
  const fr = FRR.franja(['ceiba'], ctx0)
  const filas = D.riesgoAhora(['ceiba'], ctx0)
  const conMarca = filas.map(r => `${r.equipo}:${CDR.condicionDe(fr, r.campoId, r.equipo) ?? '—'}`)
  comprobar(CDR.condicionDe(fr, 'ceiba', 'P-201B') === 'alarma' && CDR.condicionDe(fr, 'ceiba', 'LC-21') === 'atencion' && CDR.condicionDe(fr, 'ceiba', 'LC-14') === undefined
      && filas.every(r => CDR.condicionDe(fr, r.campoId, r.equipo) === fr.equipos.find(e => e.equipo === r.equipo)?.condicion)
      && CDR.PALABRA_CONDICION.alarma === 'alarma' && CDR.PALABRA_CONDICION.atencion === 'atención',
    `cada fila de Riesgo lleva la marca de su equipo en la franja, con su palabra (${conMarca.join(', ')}); un pozo sin condición, sin marca`)
}

// F2 · Diferidos, mantenimiento y confiabilidad (fase 4 de la revisión: P-mant-1, G-15, G-16, H3, G-5, G-8, P-09,
// H11, H18, H20, H22, V2-1, P-conf-1, UI-04 y UI-15). Lo programado contra lo que no, en una frase del motor con
// enteros que suman la raíz (la regla de redondeo); y en el código de esas pantallas, lo que no debe volver.
console.log('\n=== F2 · Diferidos, mantenimiento y confiabilidad ===')
{
  const MT = await v.ssrLoadModule('/src/entities/mantenimiento.ts')
  const { readFileSync } = await import('node:fs')
  const curso = D.rangoDePeriodo('curso')
  const lbC = L.libro(['ceiba'], curso.desde, curso.hasta, ctx0)
  const pc = MT.programadoDe(lbC)
  // P-mant-1: el ejemplo literal de X4 §6.1, con la raíz del libro (1.046).
  comprobar(pc.frase === 'Ninguna parada de este mes estaba programada: los 1.046 bbl fueron fallas o siguen sin identificar.'
      && pc.diferido === 1046 && pc.programado === 0 && pc.noProgramado === 1046 && pc.pct === 0,
    `P-mant-1 · La Ceiba, octubre: «${pc.frase}»`)
  // Con algo programado, las dos partes suman la raíz y el porcentaje cierra con lo no programado.
  const conProg = []
  for (const per of ['cerrado', 'trimestre', 'ytd', 'doce']) for (const c of TODOS) {
    const r = D.rangoDePeriodo(per), lb = L.libro([c], r.desde, r.hasta, ctx0)
    if (lb.planeado > 0.5 && lb.noPlaneado > 0.5) conProg.push({ per, c, lb, x: MT.programadoDe(lb) })
  }
  const malos = conProg.filter(({ lb, x }) => x.programado + x.noProgramado !== x.diferido || x.diferido !== Math.round(lb.diferido)
    || !x.frase.includes(`${x.programado.toLocaleString('es-CO')} estaban programados (${x.pct} %)`) || !x.frase.startsWith('De los ') || !/del período/.test(x.frase))
  comprobar(conProg.length > 0 && malos.length === 0,
    `P-mant-1 · con paradas programadas (${conProg.length} períodos-campo): programado + no programado = la raíz del libro, y la frase lo dice (${conProg[0] ? `«${conProg[0].x.frase}»` : 'ninguno'}${malos.length ? `; mal: ${malos.map(m => `${m.c} ${m.per}`).join(', ')}` : ''})`)

  // En el código de las pantallas: lo que la revisión quitó no vuelve.
  const fuente = a => readFileSync(`${RAIZ}src/${a}`, 'utf8').split('\n').filter(l => !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(l)).join('\n')
  const mant = fuente('pages/Mantenimiento.tsx'), conf = fuente('pages/Confiabilidad.tsx'), aci = fuente('widgets/confiabilidad/Aciertos.tsx')
  const par = fuente('widgets/diferidos/Paretos.tsx'), cua = fuente('widgets/diferidos/Cuadre.tsx'), mes = fuente('widgets/diferidos/MesAMes.tsx'), dia = fuente('widgets/produccion/Diaria.tsx')
  const dif = fuente('pages/Diferidos.tsx')
  // La rama de todos los roles (la de «decision» se va con P-21): desde su `return (` a dos espacios.
  const principal = dif.slice(dif.indexOf('\n  return ('))
  comprobar(!/\['Si falla hoy', `≈/.test(mant) && /Le costaría la falla/.test(mant) && !/equipo avisando|equipos avisando/.test(mant) && /useCifrasDeUnNombre\(ids\)\.avisan/.test(mant),
    'G-15 y G-16 · Mantenimiento: «N equipo avisa» con el conteo único de «Equipos que avisan», y el costo de la falla en bbl con su nombre (no «si falla hoy»)')
  comprobar(!/MarcaPrioridad s=\{(p\.arrancoSinIdentificar|r\.prioridad)/.test(mant) && /useCondiciones\(ids\)/.test(mant),
    'H3 · Mantenimiento: la marca de cada equipo es la de su condición en la franja, no la de la tarea ni la de la fila de riesgo')
  comprobar(![mant, conf, aci, principal].some(x => /font-mono|text-\[(3\d|4\d)px\]/.test(x)) && !/text-\[26px\]/.test(conf) && (conf.match(/text-\[24px\]/g) ?? []).length === 1 && !/text-\[24px\]/.test(aci),
    'UI-15 y H11 · sin letra de máquina ni cifras de 36 o 40 px; en Confiabilidad, a 24 px solo la de cada flota (tres o menos); el vigía a 18')
  comprobar(!/<Encabezado /.test(principal) && /<Cifra v=\{res\}/.test(principal) && /conMaximo/.test(principal) && /Potencial del libro/.test(cua) && !/No producido/.test(cua) && /= Diferido/.test(cua),
    'P-diferidos-1, G-5 y G-8 · Diferidos abre con el bloque de la cifra de Resultados; el diferido por día va en «Dónde bajarlo»; «Potencial del libro» y «= Diferido» en el cuadre')
  comprobar(!/dato-5/.test(par) && /FAMILIA_EQUIPO\[f\.tipo\]/.test(par) && !/máx\. \$/.test(par) && !/<rect[^>]*width=\{7\}/.test(mes) && /MarcaCondicion c="aviso"/.test(mes),
    'V2-1, P-09, G-10 y H20 · las barras secundarias en --dato3, la familia «bomba de agua», «máximo» sin abreviar y la marca de aviso de verdad sobre el mes que pasó su máximo')
  comprobar(!/strokeDasharray="5 3"/.test(dia) && !/strokeDasharray="3 3"/.test(dia) && /día en curso/.test(dia) && /potencial del libro/.test(dia),
    'H18 · en la producción día a día lo discontinuo es solo la meta: el potencial va continuo y claro, y el día en curso, con su punto hueco y su palabra')
  comprobar(/¿Le creo al vigía\?/.test(aci) && !/¿Acierta el vigía\?/.test(aci) && /Ver lo que anunció/.test(aci) && /data-fallas-por-mes/.test(conf) && /aria-label=\{ariaFallas\}/.test(conf),
    'P-conf-1 y H22 · «¿Le creo al vigía?» con las dos cifras que contestan y lo demás detrás de «Ver lo que anunció»; «Fallas por mes» con su cifra por mes y su frase')
}

// F3 · Equipos y el motor de «Si falla hoy» (fase 4 de la revisión: P-02, P-10, G-15, G-1b, H2, H5, T-8/H15 en
// criticidad.ts y choke-agua.ts, P-agua-1). Cada comprobación falla con el motor de antes.
console.log('\n=== F3 · Equipos: la respuesta de confiabilidad, «Avisan» = «Equipos que avisan», la lista suma lo que se deja de producir ===')
{
  const ET = await v.ssrLoadModule('/src/entities/equipos-tecnico.ts')
  const RS = await v.ssrLoadModule('/src/entities/resultados.ts')
  const CR = await v.ssrLoadModule('/src/entities/criticidad.ts')
  const AG = await v.ssrLoadModule('/src/entities/choke-agua.ts')
  const ctx = L.contextoInicial()
  const alcances = [...TODOS.map(c => [c]), TODOS]
  const nombre = cs => (cs.length > 1 ? 'todos' : cs[0])
  // G-15: el filtro «Avisan» es el mismo conteo de «Equipos que avisan» (NOMBRE_CIFRA), en cada campo y en todos.
  const avisan = alcances.map(cs => ({ cs, lista: ET.listaEquipos(cs, ctx, V0).cuentas.estado.avisan, cifra: RS.cifrasDeUnNombre(D.riesgoAhora(cs, ctx), cs.map(c => D.estadoCampo(c, ctx))).avisan }))
  comprobar(avisan.every(x => x.lista === x.cifra) && avisan.find(x => x.cs[0] === 'ceiba').lista === 1,
    `G-15 · «Avisan» cuenta lo mismo que «Equipos que avisan»: ${avisan.map(x => `${nombre(x.cs)} ${x.lista}/${x.cifra}`).join(', ')}`)
  // G-1b y H2: las cifras propias de lo parado son enteros que suman la raíz de cada campo (1.665 + 301 = 1.966); un pozo
  // cerrado por otro equipo no suma aparte: va «dentro de los 1.665 de P-201B». En todos, la suma de las raíces (2.650).
  const sumas = alcances.map(cs => {
    const vv = ET.listaEquipos(cs, ctx, V0)
    const propias = vv.filas.filter(f => f.parado && f.cifra.valor !== null)
    return { cs, suma: propias.reduce((a, f) => a + f.cifra.valor, 0), raiz: cs.reduce((a, c) => a + Math.round(D.estadoCampo(c, ctx).perdiendoBpd), 0), enteros: propias.every(f => Number.isInteger(f.cifra.valor)) }
  })
  const ce = ET.listaEquipos(['ceiba'], ctx, V0), fila = id => ce.filas.find(f => f.equipo === id)
  comprobar(sumas.every(x => x.suma === x.raiz && x.enteros) && sumas.find(x => x.cs[0] === 'ceiba').suma === 1966 && sumas.at(-1).suma === 2650
      && fila('LC-16').cifra.valor === null && fila('LC-16').cifra.dentroDe?.equipo === 'P-201B' && fila('LC-16').cifra.detalle === 'dentro de los 1.665 de P-201B'
      && fila('LC-07').cifra.dentroDe?.valor === 1665 && fila('P-201B').cifra.valor === 1665 && fila('LC-21').cifra.valor === 301,
    `G-1b y H2 · la columna «se deja de producir» suma la raíz de cada campo, en enteros: ${sumas.map(x => `${nombre(x.cs)} ${f(x.suma)}`).join(', ')}; LC-16 y LC-07, «${fila('LC-16').cifra.detalle}»`)
  const n3 = ET.nivelEquipo('ceiba', 'P-201B', ctx, V0), lc16 = ET.nivelEquipo('ceiba', 'LC-16', ctx, V0), lc07 = ET.nivelEquipo('ceiba', 'LC-07', ctx, V0)
  comprobar(n3.cifra.valor === fila('P-201B').cifra.valor && lc16.cifra.valor + lc07.cifra.valor === n3.cifra.valor && Number.isInteger(lc16.cifra.valor),
    `H2 · el nivel 3 dice el mismo entero que la lista (P-201B ${f(n3.cifra.valor)}), y sus pozos cerrados son partes de él (${f(lc16.cifra.valor)} + ${f(lc07.cifra.valor)})`)
  // H2 · el diferido del período de cada pozo (Pozos y su detalle en el nivel 3) sale del reparto único del campo:
  // las filas suman la raíz y LC-08 dice 108, como en La planta viva, Resultados e Identificar (antes, 109 suelto).
  const DFP = await v.ssrLoadModule('/src/shared/api/diferidos.ts'), RDP = await v.ssrLoadModule('/src/entities/redondeo.ts')
  const oct0 = new Date('2026-10-01T00:00:00-05:00'), oct1 = new Date('2026-10-31T23:59:59-05:00')
  const pozosOk = TODOS.map(c => ({ c, suma: DFP.pedirPozos(c, oct0, oct1, ctx).reduce((a, x) => a + x.diferidoEntero, 0), raiz: RDP.enterosDelPeriodo(c, oct0, oct1, ctx).raiz }))
  const lc08 = DFP.pedirPozos('ceiba', oct0, oct1, ctx).find(x => x.pozo.id === 'LC-08')
  comprobar(pozosOk.every(x => x.suma === x.raiz) && lc08.diferidoEntero === 108 && Object.values(lc08.enteroPorEvento).reduce((a, x) => a + x, 0) === 108,
    `H2 · el diferido de cada pozo en octubre, en enteros que suman la raíz (${pozosOk.map(x => `${x.c} ${f(x.suma)}`).join(', ')}); LC-08 = ${lc08.diferidoEntero}`)
  // P-02: la respuesta de confiabilidad (X4 §3.4): el primero de «Si falla hoy», su frase y los tres primeros.
  const mo = ET.listaEquipos(['morichal'], ctx, V0)
  comprobar(f(ce.primero.valor) === '3.059' && ce.primero.detalle === 'después de 2 min de colchón' && ce.primero.equipos.map(e => e.equipo).join() === 'P-201A,P-201C'
      && ce.primero.frase === 'Ataque primero P-201A y P-201C: hoy valen más y TRIM no las vigila. Ahí va el próximo instrumento.'
      && ce.primero.filas.map(x => x.equipo).join(' ') === 'P-201A P-201C LC-11'
      && mo.primero.frase === 'Ataque primero MPP-301: ya avisa.' && f(mo.primero.valor) === '1.600',
    `P-02 · La Ceiba: ${f(ce.primero.valor)} bbl/d, «${ce.primero.frase}» (${ce.primero.filas.map(x => x.equipo).join(', ')}); Morichal: «${mo.primero.frase}» (${f(mo.primero.valor)})`)
  // P-10: «¿Dónde va el próximo instrumento?» no se repite cuando la frase ya lo dice; el jefe ve lo que no conviene intervenir.
  comprobar(ce.instrumento.length === 0 && mo.instrumento.length === 1 && mo.instrumento[0] === CR.criticidadDelCampo('morichal', ctx).proximoInstrumento
      && ce.noIntervenir.join() === CR.criticidadDelCampo('ceiba', ctx).noIntervenir && ET.listaEquipos(TODOS, ctx, V0).instrumento.some(t => t.startsWith('La Ceiba: ')),
    `P-10 · el próximo instrumento arriba de Equipos (Morichal: «${mo.instrumento[0]?.slice(0, 60)}…»; en La Ceiba ya lo dice la frase) y «${ce.noIntervenir[0]}»`)
  // H5: sin ningún límite declarado no hay escala (no se dibuja); con límites, de ellos solos; las tendencias, siempre con escala.
  comprobar(ET.escalaDe('psi', undefined, []) === null && ET.escalaDe('psi', [10, Infinity], [8]).join() === '0,20' && ET.escalaDe('bbl/d', [66800, 89250], []).join() === '44350,111700'
      && ET.escalaDe('°C', [-Infinity, 85], [85]).join() === '0,170' && ET.escalaDe('%', undefined, []).join() === '0,100'
      && n3.tendencias.series.every(x => Array.isArray(x.escala)),
    'H5 · la escala sale de los límites firmados (la banda en el tercio del medio); sin límites, ninguna; en %, 0 a 100')
  // T-8 / H15: lo diferido no «se pierde» en las frases del motor de «Si falla hoy» y del agua, en ningún campo.
  const pierde = /\bse pierden?\b|\bpierde\s+[\d.]+|\bpierden\b/
  const frasesCr = TODOS.flatMap(c => { const x = CR.criticidadDelCampo(c, ctx); return [...x.ranking, ...x.parados].flatMap(r => [r.porque, r.subio?.porque ?? '']) })
  const frasesAg = TODOS.flatMap(c => AG.tuberiaAgua(c, ctx, V0).frases)
  const malas = [...frasesCr, ...frasesAg].filter(t => pierde.test(t))
  comprobar(malas.length === 0 && frasesCr.some(t => /se dejan de producir|deja de producir/.test(t)) && frasesAg.some(t => /dejan de producirse/.test(t)),
    `T-8 · nada «se pierde» en ${frasesCr.length} frases de «Si falla hoy» y ${frasesAg.length} del agua (${malas[0] ?? 'ninguna'})`)
  // P-agua-1: la frase de campo de cada campo, sin las cuentas.
  comprobar(AG.tuberiaAgua('guacamayo', ctx, V0).fraseCorta === 'Con las dos bombas, al agua le sobra espacio.' && TODOS.every(c => AG.tuberiaAgua(c, ctx, V0).fraseCorta.length > 0),
    'P-agua-1 · la tubería del agua en una frase de campo; las cuentas, en su ⓘ')
}

// F2 · La planta viva y Resultados (fase 4 de la revisión: H2, H1, P-01, P-12, P-13, P-14, G-7, H10, H28, P-19,
// P-20, A16, I-ger-3, P-resultados-1, P-mant-1 en Resultados). La regla de redondeo (V2): se redondea una vez, en
// el motor, de arriba abajo; las partes, por mayor residuo; encima de la raíz, la suma de las raíces. Cada
// comprobación falla sin su arreglo (antes: LC-08 = 109 suelto, 247 + 109 = 356 bajo «355 sin causa», 2.377 contra
// 2.376 de las filas, la barra de La Zarza llena, producción con la cifra del gerente…).
console.log('\n=== F2 · La planta viva y Resultados: la regla de redondeo, la lente técnica y las frases ===')
{
  const RD = await v.ssrLoadModule('/src/entities/redondeo.ts')
  const PV = await v.ssrLoadModule('/src/entities/planta-viva.ts')
  const RS = await v.ssrLoadModule('/src/entities/resultados.ts')
  const CHA = await v.ssrLoadModule('/src/shared/api/choke.ts')
  const curso = D.rangoDePeriodo('curso')
  const q = (campos, momento) => ({ campos, momento, desde: curso.desde, hasta: curso.hasta })
  const suma = xs => xs.reduce((a, x) => a + x, 0)

  // 1. El reparto por mayor residuo: suma el total, desempata siempre igual y no da negativos.
  const r1 = RD.repartirEnteros(1046, [{ id: 'P-201B', valor: 573.06 }, { id: 'LC-21', valor: 246.53 }, { id: 'SE-2', valor: 117.92 }, { id: 'LC-08', valor: 108.52 }])
  const r2 = RD.repartirEnteros(355, [{ id: 'LC-21', valor: 246.525 }, { id: 'LC-08', valor: 108.518 }])
  const empate = RD.repartirEnteros(3, [{ id: 'b', valor: 1.5 }, { id: 'a', valor: 1.5 }])
  comprobar(r1.join() === '573,247,118,108' && r2.join() === '247,108' && empate.join() === '1,2' && RD.repartirEnteros(5, [{ id: 'x', valor: -2 }, { id: 'y', valor: 4.6 }]).join() === '0,5'
      && RD.porcentajesEnteros([{ id: 'a', valor: 573.06 }, { id: 'b', valor: 246.53 }, { id: 'c', valor: 117.92 }, { id: 'd', valor: 108.52 }]).join() === '55,24,11,10',
    'H2 · el reparto por mayor residuo: 573 + 247 + 118 + 108 = 1.046, 247 + 108 = 355, el empate al id, sin negativos y 55 + 24 + 11 + 10 = 100 %')

  // 2. La Ceiba, octubre: un entero por nodo, el mismo en todas las vistas (LC-08 = 108).
  const ce = RD.enterosDelPeriodo('ceiba', curso.desde, curso.hasta, ctx0)
  const ceP = PV.plantaViva(q(['ceiba'], 'despues'), ctx0, V0), ceD = PV.plantaViva(q(['ceiba'], 'durante'), ctx0, V0)
  const rc = RS.resultados({ rol: 'ger', campos: ['ceiba'], desde: curso.desde, hasta: curso.hasta }, ctx0, V0)
  const tramosP = ceP.planta.tramos.map(t => t.entero), sinP = ceP.planta.sinIdentificar.entero
  const lc08 = [ceP.porEquipo.find(e => e.equipo === 'LC-08')?.bblEntero, rc.porEquipo.filas.find(e => e.equipo === 'LC-08')?.bblEntero, ce.porEquipo['LC-08'],
    ce.porElemento['sin-asignar']['LC-08'], suma(Object.entries(ce.porEvento).filter(([k]) => k.includes('LC08')).map(([, n]) => n))]
  comprobar(ce.raiz === 1046 && suma(tramosP) + sinP === 1046 && tramosP.join() === '0,118,573,0' && sinP === 355 && ceP.cifras.despues.entero === 1046
      && ceP.esteMes.bblEntero === 1046 && rc.cifra.entero === 1046 && lc08.every(n => n === 108) && ce.porEquipo['LC-21'] === 247
      && suma(ceP.porEquipo.map(e => e.bblEntero)) === 1046 && suma(ceP.porEquipo.map(e => e.pctEntero)) === 100
      && suma(rc.porEquipo.filas.map(e => e.bblEntero)) === 1046 && cerca(ceP.cifras.despues.valor, L.libro(['ceiba'], curso.desde, curso.hasta, ctx0).diferido),
    `H2 · La Ceiba: 118 + 573 + 355 = 1.046 en la tubería, en «Este mes» y en Resultados; por equipo 573 + 247 + 118 + 108; LC-08 = 108 en las cinco lecturas (${lc08.join(', ')}); el exacto se conserva`)
  const hoja = ceP.planta.tramos.find(t => t.tramo === 'planta')
  comprobar(hoja.porque.reduce((a, r) => a + r.entero, 0) === hoja.entero && ceD.planta.tramos.find(t => t.tramo === 'planta').entero + ceD.planta.sinIdentificar.entero === ceD.cifras.durante.entero
      && ceD.cifras.durante.entero === 1966 && ceD.cifras.durante.explica.includes('1.665 de esos barriles') && ceD.cifras.durante.explica.includes('Los otros 301'),
    'H2 · las ramas del ¿por qué? suman su tramo, y ahora 1.665 + 301 = 1.966 con las mismas cifras en la frase')

  // 3. Todos los campos: encima de la raíz, la suma de las raíces (2.376), y cada fila con la de su campo.
  const toP = PV.plantaViva(q(TODOS, 'despues'), ctx0, V0), toD = PV.plantaViva(q(TODOS, 'durante'), ctx0, V0)
  const rt = RS.resultados({ rol: 'ger', campos: TODOS, desde: curso.desde, hasta: curso.hasta }, ctx0, V0)
  const pa = PV.plantaViva(q(['palmar'], 'despues'), ctx0, V0)
  const rep = CHA.pedirRepartoChoke({ campos: TODOS, desde: curso.desde, hasta: curso.hasta }, ctx0, V0, {})
  comprobar(toP.cifras.despues.entero === 2376 && suma(toP.filas.map(x => x.entero)) === 2376 && toP.esteMes.bblEntero === 2376 && rt.cifra.entero === 2376
      && toP.filas.find(x => x.campoId === 'palmar').entero === 77 && pa.cifras.despues.entero === 77 && toD.cifras.durante.entero === 2650 && suma(toD.filas.map(x => x.entero)) === 2650
      && rep.enteros.raiz === 2376 && suma(Object.values(rep.enteros.porTramo)) === 2376 && suma(Object.values(rep.enteros.porEscalon)) === 2376 && f(rep.diferido) === '2.377',
    'H2 · todos los campos: 2.376 = 1.253 + 1.046 + 77 en la cifra, en las filas, en Resultados y en el reparto de «Por dónde se trabó» (por tramo y por escalón); El Palmar 77 en su fila y en su vista; ahora 2.650')

  // 4. H1: un campo que produjo sobre su potencial no tiene diferido por día (antes: una barra llena).
  const lbT = L.libro(TODOS, curso.desde, curso.hasta, ctx0)
  const za = lbT.porCampo.find(c => c.campoId === 'zarza'), gu = lbT.porCampo.find(c => c.campoId === 'guacamayo')
  comprobar(za.brecha <= 0 && za.diferidoDia === 0 && gu.diferidoDia === 0 && lbT.porCampo.every(c => c.diferidoDia >= 0)
      && cerca(lbT.porCampo.find(c => c.campoId === 'ceiba').diferidoDia * lbT.meta.dias, lbT.porCampo.find(c => c.campoId === 'ceiba').brecha),
    'H1 · «Por campo»: lo diferido por día con piso en 0 (La Zarza y Guacamayo, brecha ≤ 0, dan 0); La Ceiba, su brecha entre los días')

  // 5. P-01: la lente técnica de producción (X4 §3.4): lo que sale hoy, lo que limita y los 3 primeros de «Si falla hoy».
  const t = ceD.tecnica
  comprobar(PV.conLenteTecnica('prod') && !PV.conLenteTecnica('ger') && t.cifra.entero === 9394 && t.cifra.frase === 'salen hoy de La Ceiba.'
      && t.cifra.explica === 'Limitan los pozos: a la planta le sobran 1.143 bbl/d. Con P-201B parada, el agua solo deja pasar 236 bbl/d más de crudo.'
      && t.cifra.fraseCorta === 'Limitan los pozos: a la planta le sobran 1.143 bbl/d. Hoy salen 9.394.' && t.cifra.fraseCorta.split(/\s+/).length <= 20
      && t.siFallaHoy.map(x => `${x.equipo} ${x.texto}`).join(' | ') === 'P-201A 3.059 bbl/d después de 2 min | P-201C 3.059 bbl/d después de 2 min | LC-11 1.031 bbl/d · sin colchón'
      && t.siFallaHoy[0].familia === 'bomba de agua' && t.siFallaHoy[0].sinInstrumento
      && t.tramos.map(x => x.texto).join(' | ') === 'dan 11.857 bbl/d | caben 13.000 bbl/d · le sobran 1.143 | caben 14.000 bbl/d · le sobran 2.143'
      && PV.plantaViva(q(TODOS, 'durante'), ctx0, V0).tecnica === null && PV.plantaViva(q(['zarza'], 'durante'), ctx0, V0).tecnica === null,
    `P-01 · producción: «${f(t.cifra.entero)} barriles por día ${t.cifra.frase}» / «${t.cifra.explica}»; Si falla hoy: ${t.siFallaHoy.map(x => x.equipo).join(', ')}`)

  // 6. P-12, P-13, P-14, G-7, H10, H28: lo que dice la tubería del gerente.
  const pozoT = ceD.planta.tramos.find(x => x.tramo === 'pozo'), plantaT = ceD.planta.tramos.find(x => x.tramo === 'planta')
  const zaD = PV.plantaViva(q(['zarza'], 'durante'), ctx0, V0)
  const ceA = PV.plantaViva(q(['ceiba'], 'antes'), ctx0, V0)
  comprobar(pozoT.limita && pozoT.titulo.includes(' ⓘ') && /sin firmar/.test(ceD.planta.limitaSinFirmar ?? '') && plantaT.capacidad === 'sin firmar' && pozoT.capacidad === null,
    `P-12 · «limita» lleva su ⓘ: ${ceD.planta.limitaSinFirmar}`)
  comprobar(zaD.cifras.durante.unidad === 'barriles por día de crudo' && !/sin paradas/.test(zaD.cifras.durante.explica + zaD.cifras.durante.fraseCorta) && /tubería del gas todavía no está/.test(zaD.cifras.durante.fraseCorta),
    `P-13 · La Zarza: «0 ${zaD.cifras.durante.unidad} ${zaD.cifras.durante.frase}» / «${zaD.cifras.durante.explica}»`)
  comprobar(plantaT.nota.join(' ') === 'se angostó: con P-201B parada el agua solo deja pasar 236 bbl/d más de crudo' && !JSON.stringify(ceD).includes('el agua da para'),
    'P-14 · «el agua solo deja pasar 236 bbl/d más de crudo» (no «da para», que se leía como que sobra)')
  comprobar(ceD.produccion.texto === 'promedio por día, bajo la meta' && f(ceD.produccion.realBpd) === '10.700',
    'G-7 · «Promedio por día, bajo la meta · 10.700 de 10.900 bbl/d»: el mismo nombre de Resultados; lo que sale hoy es otra cifra')
  comprobar(ceA.planta.venta.calidad === 'proyectado' && ceD.planta.venta.calidad === undefined && ceP.planta.venta.calidad === undefined,
    'H10 · «Al cierre» de Antes lleva su palabra, «proyectado» (y la pantalla, el trazo discontinuo)')
  comprobar(ceP.planta.ramal.texto[0] === 'ahora: ' && ceD.planta.ramal.texto[0] !== 'ahora: ' && ceP.esteMes.mesAnterior?.nombre === 'septiembre' && ceP.esteMes.mesAnterior.bblEntero === 7716,
    'H28 · en Después el estado del ramal va dicho como de ahora, y «Este mes» da el mes cerrado de antes (septiembre, 7.716): la cifra grande ya es la del período')

  // 7. P-19: el porqué en palabras del gerente; P-20: «N de M planes en marcha» con las decisiones guardadas.
  const det = hoja.porque[0].detalle[0]
  comprobar(det === 'falla de la planta (P-201B, bomba de agua) → afectó a varios pozos · 573 bbl' && !/proceso \/ facilidades|estación\/bombeo/.test(hoja.porque.flatMap(r => r.detalle).join(' ')),
    `P-19 · la hoja de la planta: «${det}»`)
  const planes = ceD.planes
  const cicloCe = (await v.ssrLoadModule('/src/entities/escenarios.ts')).cicloValor(['ceiba'], curso.desde, curso.hasta, ctx0, V0)
  const plan = [...cicloCe.antes.planes, ...cicloCe.durante.planes, ...cicloCe.despues.planes].find(x => x.bbl > 0).id
  const conDecision = PV.plantaViva(q(['ceiba'], 'durante'), ctx0, V0, { decisiones: { [plan]: { id: plan, estado: 'aceptado', por: 'Prueba', porId: 'u', fecha: '2026-10-02T10:00:00-05:00', motivo: '' } } })
  comprobar(planes && planes.enMarcha === 0 && planes.total >= 1 && conDecision.planes.enMarcha === 1 && conDecision.planes.texto === `1 de ${planes.total} ${planes.total === 1 ? 'plan' : 'planes'} en marcha`
      && conDecision.cifras === ceD.cifras && PV.plantaViva(q(['ceiba'], 'durante'), ctx0, V0) === ceD,
    `P-20 · «${conDecision.planes.texto}» al aceptar uno (sin decisiones, «${planes.texto}»); lo demás de la vista no se recalcula`)

  // 8. A16 e I-ger-3: los nombres accesibles dicen las unidades en palabras; la pérdida, en una línea.
  comprobar(!/bbl/.test(ceD.mesAMes.aria) && /barriles por día/.test(ceD.mesAMes.aria) && !/bbl/.test(rc.mesAMes.aria) && /barriles por día/.test(rc.mesAMes.aria) && ceD.planta.ariaLabel.includes('barriles por día'),
    `A16 · «${ceD.mesAMes.aria.slice(0, 90)}…»`)

  // 9. Resultados del jefe: lo programado en la frase de X4 §6.1, con enteros que suman la cifra (P-mant-1).
  const rj = RS.resultados({ rol: 'jefe', campos: ['ceiba'], desde: curso.desde, hasta: curso.hasta }, ctx0, V0, { relojes: { fallas: 3, totalH: 194, activaH: 9, esperaH: 185 } })
  comprobar(rj.mantenimiento.programado.frase === 'Ninguna parada de este mes estaba programada: los 1.046 bbl fueron fallas o siguen sin identificar.'
      && rj.mantenimiento.programado.bbl + rj.mantenimiento.programado.noBbl === 1046,
    `P-mant-1 · Resultados del jefe: «${rj.mantenimiento.programado.frase}»`)

  // 10. P-16 y H8: Producción dibuja la MISMA tubería de La planta viva (la lente técnica); la de antes, en cajas, ya no.
  //     A21: en el papel, la barra de «Dónde se trabó» y su leyenda no se separan de hoja. P-21: el código sin uso se fue.
  const { readFileSync: leerF2, existsSync: existeF2 } = await import('node:fs')
  const srcF2 = rel => leerF2(new URL(`../src/${rel}`, import.meta.url), 'utf8')
  const prodF2 = srcF2('pages/Produccion.tsx'), dondeF2 = srcF2('widgets/resumen/DondeSeTrabo.tsx')
  comprobar(/<TuberiaTecnica\b/.test(prodF2) && !/TuberiaDelCampo/.test(prodF2) && /data-sin-partir=\{campos\.length === 1/.test(dondeF2) && /print:break-before-avoid/.test(dondeF2)
      && !['pages/Resumen.tsx', 'pages/Portafolio.tsx', 'widgets/resumen/ResumenDirectivo.tsx', 'widgets/riesgo/Ahora.tsx', 'widgets/resumen/enAlarma.ts', 'widgets/diferidos/Encabezado.tsx'].some(r => existeF2(new URL(`../src/${r}`, import.meta.url)))
      // K1 · P-10: Riesgo ya no es una pantalla: lo suyo vive en `widgets/riesgo/EnRiesgo.tsx` (Equipos del jefe y de confiabilidad).
      && !/nivel === 'decision'|useNivel\(\) !== 'decision'|directivo/.test(srcF2('pages/Diferidos.tsx') + prodF2 + srcF2(existeF2(new URL('../src/pages/Riesgo.tsx', import.meta.url)) ? 'pages/Riesgo.tsx' : 'widgets/riesgo/EnRiesgo.tsx')),
    'P-16 y H8 · Producción con la tubería de La planta viva (lente técnica); A21 · la barra y su leyenda en un bloque en el papel; P-21 · sin el Resumen, el Portafolio, ResumenDirectivo, riesgo/Ahora, enAlarma, el Encabezado viejo ni las ramas «decision»')
  // UI-10 y UI-18: el lema del momento escogido sale de los tokens (sin un color escrito a mano) y cada opción lleva su blanco de 44 px.
  const momF2 = srcF2('widgets/plantaviva/Momentos.tsx').split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')
  comprobar(!/#[0-9a-f]{3,8}\b/i.test(momF2) && /\btoque\b/.test(momF2) && /var\(--primario-sobre\)/.test(momF2),
    'UI-10 y UI-18 · Antes · Durante · Después sin colores escritos a mano y con 44 px de blanco en cada opción')
}


// F4 · El glosario como prueba: un nombre, una cifra (PROMPT-REVISION-UX §4 regla 3; X4 §1.3.3; glosario.md,
// confirmado por V1). Cada nombre del glosario dice UNA cifra en todas las vistas del motor que la traen y
// va siempre con UNA unidad, también en lo que escriben las pantallas (D-2: «Si falla hoy», en bbl/d). Y los
// sinónimos que el glosario retiró no vuelven, ni en el motor ni en las pantallas. Las vistas se piden por
// la costura (`@/shared/api/*`), como las pide la pantalla; los nombres, de `NOMBRE_CIFRA`
// (`@/shared/api/resultados`), y la cifra de referencia de `cifrasDeUnNombre` (el motor que lo publica).
console.log('\n=== F4 · El glosario como prueba: un nombre, una cifra y una unidad ===')
{
  const SESF = await v.ssrLoadModule('/src/shared/api/sesion.ts')
  const PVF = await v.ssrLoadModule('/src/shared/api/plantaViva.ts')
  const HOYF = await v.ssrLoadModule('/src/shared/api/hoy.ts')
  const RSAF = await v.ssrLoadModule('/src/shared/api/resultados.ts')
  const EQTF = await v.ssrLoadModule('/src/shared/api/equiposTecnico.ts')
  const CHKF = await v.ssrLoadModule('/src/shared/api/choke.ts')
  const RSF = await v.ssrLoadModule('/src/entities/resultados.ts')
  const REPF = await v.ssrLoadModule('/src/entities/choke-reparto.ts')
  const { readFileSync, readdirSync, statSync } = await import('node:fs')
  const s = SESF.sesion(), cursoF = D.rangoDePeriodo('curso')
  const NC = RSAF.NOMBRE_CIFRA
  const ALC = { 'La Ceiba': ['ceiba'], 'Morichal Norte': ['morichal'], 'todos': TODOS }
  const pv = (cs, momento) => PVF.pedirPlantaViva({ campos: cs, momento, desde: cursoF.desde, hasta: cursoF.hasta }, s.ctx, s.versiones)
  const res = (rol, cs) => RSAF.pedirResultados({ rol, campos: cs, desde: cursoF.desde, hasta: cursoF.hasta }, s)
  const hoy = (rol, cs) => { try { return HOYF.pedirHoy({ rol, campos: cs }, s) } catch { return null } }
  const lista = cs => EQTF.pedirListaEquipos(cs, s.ctx, s.versiones)
  const ent = n => Math.round(n)
  const num = t => Number(String(t).replace(/\./g, '').replace(',', '.'))

  // 1. Las cifras de un nombre: la misma en cada vista que la trae, en cada alcance.
  const cifras = []
  for (const [nombre, cs] of Object.entries(ALC)) {
    const ref = RSF.cifrasDeUnNombre(D.riesgoAhora(cs, ctx0), cs.map(c => D.estadoCampo(c, ctx0)))
    const durante = pv(cs, 'durante').cifras.durante, antes = pv(cs, 'antes').cifras.antes
    const sup = cs.length === 1 ? hoy('sup', cs) : null
    const tuberia = cs.reduce((a, c) => a + REPF.tuberiaCampo(c, cursoF.desde, cursoF.hasta, ctx0, V0).perdiendoAhoraBpd, 0)
    const ahora = [['la referencia', ent(ref.ahoraBpd)], ['La planta viva (Durante)', ent(durante.valor)], ['la tubería', ent(tuberia)]]
    if (sup?.inicio?.cifra && sup.campos.length) ahora.push(['Hoy del supervisor', num(sup.inicio.cifra)])
    const avisan = [['la referencia', ref.avisan], ['La planta viva (Antes)', antes.valor], ['el filtro de Equipos', lista(cs).cuentas.estado.avisan]]
    const ciclo = [['La planta viva', ent(pv(cs, 'durante').mover.totalBbl)], ['Resultados', ent(res('ger', cs).ciclo.totalBbl)]]
    cifras.push({ nombre, filas: [[NC.ahora, ahora, durante.unidad], [NC.avisan, avisan], [NC.retorno, ciclo]] })
  }
  const distintas = cifras.flatMap(a => a.filas.filter(([, xs]) => new Set(xs.map(x => x[1])).size > 1).map(([n, xs]) => `${a.nombre} · «${n}»: ${xs.map(x => `${x[0]} ${f(x[1])}`).join(', ')}`))
  const ce = cifras.find(a => a.nombre === 'La Ceiba').filas, to = cifras.find(a => a.nombre === 'todos').filas
  comprobar(!distintas.length && ce[0][1][0][1] === 1966 && to[0][1][0][1] === 2650 && ce[1][1][0][1] === 1 && to[1][1][0][1] === 8 && ce[2][1][0][1] === 2133
      && cifras.every(a => a.filas[0][2] === 'barriles por día'),
    `«${NC.ahora}» (1.966 · 684 · 2.650 bbl/d), «${NC.avisan}» (1 en La Ceiba, 8 en todos) y «${NC.retorno}» (2.133 en La Ceiba): una cifra en cada vista que la trae${distintas.length ? `; distintas: ${distintas.join(' | ')}` : ''}`)

  // 2. «Si falla hoy» de cada equipo: la misma cifra en el motor de criticidad, la lista de Equipos y La planta viva.
  const siFalla = new Map()
  const anota = (c, e, valor, donde) => { const k = `${c}:${e}`; const x = siFalla.get(k) ?? []; x.push([donde, ent(valor)]); siFalla.set(k, x) }
  for (const c of ['ceiba', 'morichal']) {
    for (const r of CHKF.pedirCriticidad([c], s.ctx).ranking) if (!r.parado && Number.isFinite(r.bpd)) anota(c, r.equipo, r.bpd, 'criticidad')
    for (const fl of lista([c]).filas) if (fl.cifra?.que === 'si falla hoy' && Number.isFinite(fl.cifra.valor)) anota(c, fl.equipo, fl.cifra.valor, 'Equipos')
    const vista = pv([c], 'antes')
    for (const x of vista.tecnica?.siFallaHoy ?? []) anota(c, x.equipo, x.bpd, 'La planta viva (técnica)')
    for (const t of vista.planta.tramos) for (const x of t.equipos ?? []) if (/si falla hoy/.test(x.texto ?? '') && Number.isFinite(x.valor ?? x.bpd)) anota(c, x.equipo, x.valor ?? x.bpd, 'La planta viva (tramo)')
  }
  const dosCifras = [...siFalla].filter(([, xs]) => xs.length > 1 && new Set(xs.map(x => x[1])).size > 1).map(([k, xs]) => `${k}: ${xs.map(x => `${x[0]} ${f(x[1])}`).join(', ')}`)
  comprobar(!dosCifras.length && siFalla.get('ceiba:P-201A')?.length > 1 && siFalla.get('ceiba:P-201A').every(x => x[1] === 3059),
    `«Si falla hoy» dice la misma cifra de cada equipo en criticidad, Equipos y La planta viva (${siFalla.size} equipos; P-201A 3.059 bbl/d)${dosCifras.length ? `; distintas: ${dosCifras.slice(0, 4).join(' | ')}` : ''}`)

  // 3. Una unidad por nombre, en todo lo que dicen las vistas del motor y en lo que escriben las pantallas.
  //    D-2: «Si falla hoy» es un ritmo (bbl/d); lo que costaría la falla entera es «le costaría la falla» (bbl),
  //    y su suma, «Exposición si fallan hoy» (bbl).
  const textosDe = (x, out = []) => { if (typeof x === 'string') out.push(x); else if (Array.isArray(x)) for (const y of x) textosDe(y, out); else if (x && typeof x === 'object') for (const y of Object.values(x)) textosDe(y, out); return out }
  const vistas = []
  for (const [nombre, cs] of Object.entries(ALC)) {
    for (const m of ['antes', 'durante', 'despues']) vistas.push([`La planta viva (${m}, ${nombre})`, pv(cs, m)])
    for (const r of ['ger', 'prod', 'jefe', 'conf', 'reg']) vistas.push([`Resultados de ${r} (${nombre})`, res(r, cs)])
    for (const r of ['sup', 'oper', 'tec', 'jefe', 'prod', 'conf']) { const h = hoy(r, cs); if (h) vistas.push([`Hoy de ${r} (${nombre})`, h]) }
    vistas.push([`Equipos (${nombre})`, lista(cs)], [`Riesgo (${nombre})`, CHKF.pedirCriticidad(cs, s.ctx)])
  }
  for (const [c, e] of [['ceiba', 'P-201B'], ['ceiba', 'P-201A'], ['ceiba', 'K-101'], ['morichal', 'MPP-301'], ['morichal', 'P-201B'], ['ceiba', 'LC-21']])
    vistas.push([`nivel 3 de ${e} (${c})`, EQTF.pedirNivelEquipo(c, e, s.ctx, s.versiones)])
  const deVistas = vistas.flatMap(([donde, x]) => textosDe(x).map(t => [donde, t]))
  const RAIZ_SRC = `${RAIZ}src/`
  const pantallasF4 = []
  const recorrer = d => { for (const x of readdirSync(d)) { const p = `${d}/${x}`; if (statSync(p).isDirectory()) recorrer(p); else if (/\.tsx?$/.test(x)) pantallasF4.push(p) } }
  for (const d of ['pages', 'widgets', 'shared/ui', 'shared/lib']) recorrer(`${RAIZ_SRC}${d}`)
  const sinComentariosF4 = t => t.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).map(l => l.replace(/\s\/\/ .*$/, '')).join('\n')
  const dePantallas = pantallasF4.map(p => [p.slice(RAIZ_SRC.length), sinComentariosF4(readFileSync(p, 'utf8'))])
  const CIFRA = String.raw`(?:≈\s*)?(?:hasta\s+)?(?:[\d.,]+|\$\{[^}]+\})\s*`
  const UNIDAD = String.raw`(bbl\/d|bbl|barriles por día|barriles)`
  const unidades = [
    { nombre: 'si falla hoy', unidad: ['bbl/d', 'barriles por día'], antes: /si (?:una )?falla hoy/i },
    { nombre: 'le costaría la falla', unidad: ['bbl', 'barriles'], antes: /le costaría la falla/i },
    { nombre: NC.exposicion, unidad: ['bbl', 'barriles'], antes: /de exposición si fallan hoy|exposición si fallan hoy/i },
  ].map(u => {
    const re = [new RegExp(`${CIFRA}${UNIDAD}\\s+(?:·\\s*)?(?:de\\s+)?(?:${u.antes.source})`, 'gi'), new RegExp(`(?:${u.antes.source})[,:]?\\s+${CIFRA}${UNIDAD}`, 'gi')]
    const vistos = []
    for (const [donde, t] of [...deVistas, ...dePantallas]) for (const r of re) for (const m of t.matchAll(r)) vistos.push([donde, m[1].toLowerCase(), m[0].replace(/\s+/g, ' ').slice(0, 60)])
    return { ...u, vistos, malos: vistos.filter(x => !u.unidad.includes(x[1])) }
  })
  const malasU = unidades.flatMap(u => u.malos.map(x => `«${u.nombre}» en ${x[1]} (${x[0]}: «${x[2]}»)`))
  comprobar(!malasU.length && unidades[0].vistos.length > 0,
    `una unidad por nombre: «si falla hoy» en bbl/d (${unidades[0].vistos.length} veces), «le costaría la falla» y «${NC.exposicion}» en bbl (${unidades[1].vistos.length + unidades[2].vistos.length}), en el motor y en las pantallas${malasU.length ? `; mal: ${[...new Set(malasU)].slice(0, 4).join(' | ')}` : ''}`)

  // 4. Los sinónimos que retiró el glosario (V1) no vuelven, ni en el motor ni en las pantallas.
  const RETIRADOS = [
    ['G-5', /Potencial ahora|Potencial \(pruebas × factor\)/, `«${NC.potencial}»`],
    ['G-7', /producción por día, bajo la meta/i, '«Promedio por día»'],
    ['G-8', /= No producido/, '«= Diferido»'],
    ['G-13', /bbl en el ciclo/, `«${NC.retorno}»`],
    ['G-15', /\bequipos? avisando\b/i, '«equipo avisa»'],
    ['G-16', /\bsi se para\b/i, '«Si falla hoy»'],
  ]
  const vuelven = RETIRADOS.flatMap(([g, re, nuevo]) => [...deVistas, ...dePantallas].filter(([, t]) => re.test(t)).map(([donde]) => `${g} (${nuevo}) en ${donde}`))
  comprobar(!vuelven.length, `los sinónimos que retiró el glosario no vuelven: «Potencial ahora», «producción por día» (el promedio), «= No producido», «bbl en el ciclo», «equipos avisando», «si se para»${vuelven.length ? `; siguen: ${[...new Set(vuelven)].slice(0, 6).join(' | ')}` : ''}`)

  // 5. P-09 · Una familia por equipo: las bombas del tren de agua de La Ceiba y de Morichal son «bomba de agua»
  //    en cada vista (el subtítulo largo del nivel 3 es el de la imagen 4 y se queda: no lleva el tag delante).
  const familias = []
  for (const [donde, x] of vistas.filter(([d]) => /La Ceiba|Morichal|ceiba|morichal/.test(d)))
    for (const t of textosDe(x)) for (const m of t.matchAll(/\b(P-201[A-G])\s*(?:·|,|\()\s*(bomba(?: [a-záéíóúñ]+){1,3})/g)) familias.push([donde, m[1], m[2]])
  const otras = familias.filter(x => !x[2].startsWith('bomba de agua'))
  comprobar(!otras.length && familias.length > 0,
    `P-09 · las bombas del tren de agua se llaman «bomba de agua» en las ${familias.length} veces que una vista las nombra${otras.length ? `; distinto: ${[...new Set(otras.map(x => `${x[1]} «${x[2]}» (${x[0]})`))].slice(0, 4).join(' | ')}` : ''}`)
}

// K1 · El cierre de los pendientes cruzados de la revisión (fase 4): el Riesgo del jefe y de confiabilidad fundido en su
// Equipos (P-10), Mi trabajo y la tubería de antes fuera del código (G-15, P-16), una familia por equipo (P-09), lo
// diferido sin «se pierde» en las ⓘ (T-8), el color con su forma o su palabra (H20, «¿Cuadra?», H13.2) y el nivel del
// título de «Planes» (A15). Lo que se ve lo prueban las e2e (`cierre-k1.spec.ts` y las ajustadas); aquí, las direcciones,
// el motor y que lo de antes no vuelva.
console.log('\n=== K1 · Cierre: Riesgo en Equipos, sin Mi trabajo ni la tubería de antes, una familia, T-8 en las ⓘ, color con forma ===')
{
  const { existsSync: existeK1, readFileSync: leerK1 } = await import('node:fs')
  const SRCK = `${RAIZ}src/`
  const hay = a => existeK1(`${SRCK}${a}`)
  const fuenteK1 = a => leerK1(`${SRCK}${a}`, 'utf8').split('\n').filter(l => !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(l)).join('\n')
  const ROLK = await v.ssrLoadModule('/src/entities/roles.ts')
  const URLK = await v.ssrLoadModule('/src/app/url.ts')
  const PANK = await v.ssrLoadModule('/src/app/pantallas.tsx')
  const rol = id => ROLK.ROLES.find(r => r.id === id)

  // 1. P-10: ningún rol tiene Riesgo; la dirección del jefe y de confiabilidad abre su Equipos, la del gerente La planta viva.
  //    Lo que traía Riesgo vive debajo de la lista de Equipos (`EnRiesgo`), con cada pieza.
  const enRiesgo = hay('widgets/riesgo/EnRiesgo.tsx') ? fuenteK1('widgets/riesgo/EnRiesgo.tsx') : ''
  const lista = fuenteK1('widgets/equipos/Lista.tsx')
  comprobar(!ROLK.ROLES.some(r => r.pantallas.includes('riesgo')) && !PANK.PANTALLAS.riesgo && !hay('pages/Riesgo.tsx')
      && URLK.pantallaQueAbre(rol('jefe'), 'riesgo') === 'equipos' && URLK.pantallaQueAbre(rol('conf'), 'riesgo') === 'equipos'
      && URLK.pantallaQueAbre(rol('ger'), 'riesgo') === 'plantaViva'
      && /\(conf \|\| jefe\) && <EnRiesgo/.test(lista)
      && ['NOMBRE_CIFRA.ahora', 'NOMBRE_CIFRA.avisan', 'NOMBRE_CIFRA.exposicion', 'en juego', 'cruza en', 'rotulo="qué hacer"', 'costoHoy(r)', 'colchonCorto(r)', 'deFlota(', 'titulo="Por qué"', '<SiFallaHoy'].every(x => enRiesgo.includes(x)),
    'P-10 · Riesgo se fundió: ningún rol lo tiene; «#/jefe/riesgo» y «#/conf/riesgo» abren Equipos (el gerente, La planta viva) y debajo de la lista va todo lo suyo: lo que se deja de producir, los que avisan, lo que está en juego, la exposición, «cruza en», «qué hacer», lo que le costaría la falla, el colchón, «flota», «Por qué» y «Si falla hoy»')

  // 2. G-15: Mi trabajo ya no existe (se fundió en Hoy) y su dirección abre Hoy; P-16: la tubería de antes tampoco.
  const usaVieja = ['pages/Planta.tsx', 'pages/Produccion.tsx', 'pages/Causa.tsx'].filter(a => /TuberiaDelCampo|choke\/Tuberia'/.test(fuenteK1(a)))
  comprobar(!hay('pages/Trabajo.tsx') && !PANK.PANTALLAS.trabajo && !Object.values(PANK.GRUPOS).some(g => g.miembros.includes('trabajo'))
      && URLK.pantallaQueAbre(rol('tec'), 'trabajo') === 'hoy'
      && !hay('widgets/choke/Tuberia.tsx') && !usaVieja.length && /<TuberiaTecnica/.test(fuenteK1('pages/Planta.tsx')),
    `G-15 y P-16 · Mi trabajo y la tubería de antes salieron del código; «#/tec/trabajo» abre Hoy y Planta monta la tubería de La planta viva${usaVieja.length ? `; todavía: ${usaVieja.join(', ')}` : ''}`)

  // 3. P-09: una familia por equipo, la del motor («bomba de agua»), también en el nombre de las hermanas sin instrumento y en Confiabilidad.
  const CRK = await v.ssrLoadModule('/src/entities/criticidad.ts')
  const FLK = await v.ssrLoadModule('/src/entities/flota.ts')
  const PVK = await v.ssrLoadModule('/src/entities/planta-viva.ts')
  const CSK = await v.ssrLoadModule('/src/entities/causa-senal.ts')
  const CAK = await v.ssrLoadModule('/src/entities/choke-agua.ts')
  const hermanas = ['ceiba', 'morichal'].flatMap(c => CRK.criticidadDelCampo(c, ctx0).ranking.filter(x => /^P-201[AC]$/.test(x.equipo)).map(x => x.nombre))
  // Y el nombre del tipo de causa (Mantenimiento, Pozos, el árbol, los Paretos, «Por campo», el informe), la frase del
  // gerente y el tramo de la tubería del agua: ninguno dice «reinyección» como familia.
  const REPK = await v.ssrLoadModule('/src/entities/choke-reparto.ts'), cursoK = D.rangoDePeriodo('curso')
  const fraseCe = REPK.tuberiaCampo('ceiba', cursoK.desde, cursoK.hasta, ctx0, V0).fraseGerente
  comprobar(hermanas.length >= 2 && hermanas.every(n => n.endsWith(` · ${PVK.FAMILIA.reinyeccion}`)) && FLK.NOMBRE_FAMILIA.inyeccion === 'Bombas de agua'
      && CSK.TIPO_CAUSA.reinyeccion.toLowerCase() === PVK.FAMILIA.reinyeccion && CAK.NOMBRE_TRAMO_AGUA.bombas === 'Bombas de agua' && !/reinyecci/.test(fraseCe),
    `P-09 · una familia: las hermanas sin instrumento («${hermanas[0]}»), Confiabilidad («${FLK.NOMBRE_FAMILIA.inyeccion}»), el tipo de causa («${CSK.TIPO_CAUSA.reinyeccion}»), el agua («${CAK.NOMBRE_TRAMO_AGUA.bombas}») y la frase del gerente («${fraseCe}»)`)

  // 4. T-8: las ⓘ del método (Identificar, Confiabilidad, el árbol de la circular) y la configuración no dicen que lo diferido «se pierde».
  const ARK = await v.ssrLoadModule('/src/widgets/arbol/palabras.ts')
  const conPierde = ['widgets/arbol/palabras.ts', 'widgets/choke/ArbolCircular.tsx', 'widgets/riesgo/SiFallaHoy.tsx', 'pages/Configuracion.tsx']
    .filter(a => /dónde se pierde|lo que pierdan|\bse pierden?\b/.test(fuenteK1(a)))
  comprobar(/dónde se deja de producir/.test(ARK.INFO_METODO) && !/pierde/.test(ARK.INFO_METODO) && !conPierde.length,
    `T-8 · «ubicar dónde se deja de producir» en la ⓘ de Identificar y de Confiabilidad; ninguna ⓘ dice «se pierde»${conPierde.length ? ` (${conPierde.join(', ')})` : ''}`)

  // 5. Color con forma y palabra: el mes fuera de banda del factor es la marca de aviso; la celda «Real» de «¿Cuadra?»
  //    dice «bajo la meta»; el indicador sin lectura no pinta el morado sin su forma (H13.2).
  const factor = fuenteK1('widgets/diferidos/Factor.tsx'), prodK = fuenteK1('pages/Produccion.tsx'), anal = fuenteK1('shared/ui/Analogico.tsx')
  comprobar(!/fill="var\(--p3\)"/.test(factor) && /<MarcaCondicion c="aviso"/.test(factor)
      && !/<FueraDeMeta/.test(prodK) && /bajo la meta/.test(prodK) && !/--sincom/.test(anal)
      && !/\.analogico\b/.test(leerK1(`${SRCK}index.css`, 'utf8')),
    'color con forma: el factor fuera de banda lleva el cuadrado «3», «¿Cuadra?» dice «bajo la meta» al lado de su marca y el indicador sin lectura va en gris (y las clases del analógico viejo ya no están)')

  // 6. H2 (pendiente de F1 y F2): Identificar y Mantenimiento leen el entero de cada parada del mes en curso del reparto
  //    del campo, el mismo de Hoy y Pozos: LC-08 = 108 (exacto 108,5), LC-21 = 247; una parada de antes, sin entero.
  const DFK = await v.ssrLoadModule('/src/shared/api/diferidos.ts')
  const psK = DFK.pedirPreguntas(['ceiba'], ctx0), de = e => psK.find(p => p.equipo === e && p.inicio >= cursoK.desde)
  // Y las tarjetas de Identificar (las filas de la ANH, agrupadas por raíz): sus enteros suman la raíz del campo.
  const ARBK = await v.ssrLoadModule('/src/shared/api/arbol.ts'), GRK = await v.ssrLoadModule('/src/widgets/arbol/grupos.ts'), RDK = await v.ssrLoadModule('/src/entities/redondeo.ts')
  const gruposK = GRK.agrupar(ARBK.pedirParadasAnh({ campos: ['ceiba'], desde: cursoK.desde, hasta: cursoK.hasta }, ctx0, {}))
  const raizK = RDK.enterosDelPeriodo('ceiba', cursoK.desde, cursoK.hasta, ctx0).raiz
  comprobar(de('LC-08')?.entero === 108 && Math.round(de('LC-08').bbl) === 109 && de('LC-21')?.entero === 247
      && psK.filter(p => p.inicio < cursoK.desde).every(p => p.entero === undefined)
      && gruposK.find(g => g.pozos.join() === 'LC-08')?.entero === 108 && gruposK.reduce((a, g) => a + g.entero, 0) === raizK,
    `H2 · las paradas por identificar del mes en curso con el entero del reparto: LC-08 = ${de('LC-08')?.entero} (exacto ${de('LC-08')?.bbl.toFixed(2)}), LC-21 = ${de('LC-21')?.entero}; las tarjetas de Identificar suman ${gruposK.reduce((a, g) => a + g.entero, 0)} = la raíz (${raizK})`)

  // 7. A15: «Planes» toma el nivel de título de donde va; en el diagnóstico (antes del primer h2), h2.
  comprobar(/titulo\?: 'h2' \| 'h3'/.test(fuenteK1('widgets/ciclo/Ciclo.tsx')) && /<PlanesDe planes=\{planes\} titulo="h2"/.test(fuenteK1('widgets/bombas/Detalle.tsx')),
    'A15 · «Planes» va en h2 en el diagnóstico y en h3 dentro de la ficha (como `BloqueSap`)')
}

// A2 · El balance del choke: producido · diferido · perdido (CONSTRUCCION.md, «Lo que el dueño volvió a pedir»), el
// registro de pérdidas, la jornada del supervisor, «¿Está funcionando?» y las fallas por mes en el motor. Los cuadres:
// el diferido es el del libro y la raíz del árbol, cada tramo es el primer nivel del orden de gestión, el potencial es
// producido + diferido y el perdido NUNCA se suma; sin registro, null (nunca 0); D7.
console.log('\n=== A2 · El balance del choke, las pérdidas, la jornada y «¿Está funcionando?» ===')
{
  const BA = await v.ssrLoadModule('/src/entities/balance.ts')
  const PE = await v.ssrLoadModule('/src/entities/perdidas.ts')
  const JO = await v.ssrLoadModule('/src/entities/jornada.ts')
  const EF = await v.ssrLoadModule('/src/entities/efectividad.ts')
  const AR = await v.ssrLoadModule('/src/entities/choke-arbol.ts')
  const RD = await v.ssrLoadModule('/src/entities/redondeo.ts')
  const PV = await v.ssrLoadModule('/src/entities/planta-viva.ts')
  const curso = D.rangoDePeriodo('curso'), cerrado = D.rangoDePeriodo('cerrado')
  const ms = fn => { const t0 = performance.now(); const r = fn(); return [r, performance.now() - t0] }

  // 1. La Ceiba, octubre (el número del resumen): producido · diferido · perdido, con los cuadres del libro.
  const [ce, msCe] = ms(() => BA.balance({ campos: ['ceiba'], desde: curso.desde, hasta: curso.hasta }, ctx0))
  const lbCe = L.libro(['ceiba'], curso.desde, curso.hasta, ctx0)
  const arCe = AR.arbolDelChoke(['ceiba'], curso.desde, curso.hasta, ctx0, { orden: 'gestion' })
  const enCe = RD.enterosDelPeriodo('ceiba', curso.desde, curso.hasta, ctx0)
  const t = ce.total
  comprobar(t.producido.entero === 16941 && t.diferido.entero === 1046 && t.perdido === null && t.potencial.entero === 17987
      && cerca(t.producido.exacto, lbCe.real) && cerca(t.diferido.exacto, lbCe.diferido) && cerca(t.diferido.exacto, arCe.raiz.bbl)
      && cerca(t.potencial.exacto, t.producido.exacto + t.diferido.exacto) && cerca(t.potencial.exacto + t.sinExplicar, lbCe.potencial)
      && t.diferido.entero === enCe.raiz && ce.frase === 'La Ceiba, octubre: produjo 16.941 bbl · quedaron diferidos 1.046 bbl · perdido: sin registro.',
    `La Ceiba, octubre: produjo ${f(t.producido.exacto)} · diferido ${t.diferido.entero} · perdido sin registro (null) · potencial ${t.potencial.entero} = producido + diferido; el potencial del libro = potencial + sin explicar (${t.sinExplicar.toFixed(6)})`)
  // 2. Por tramo: el diferido de cada tramo es el entero de redondeo.ts y el primer nivel del árbol de gestión; los enteros suman la raíz.
  const pt = Object.fromEntries(t.porTramo.map(x => [x.tramo, x.diferido.entero]))
  comprobar(pt.pozo === 118 && pt.planta === 573 && pt['sin-asignar'] === 355 && pt.reservorio === 0 && pt.exportacion === 0
      && t.porTramo.every(x => x.diferido.entero === enCe.porTramo[x.tramo] && cerca(x.diferido.exacto, arCe.raiz.hijos.find(h => h.valor === x.tramo)?.bbl ?? 0))
      && t.porTramo.reduce((a, x) => a + x.diferido.entero, 0) === t.diferido.entero && t.porTramo.map(x => x.nombre).join() === 'Yacimiento,Pozos,Planta,Salida,Sin identificar',
    `por tramo (yacimiento, pozos, planta, salida, sin identificar): ${t.porTramo.map(x => `${x.nombre} ${x.diferido.entero}`).join(' · ')} = ${t.diferido.entero}; cada uno es el primer nivel del árbol de gestión`)
  // 3. La trazabilidad: cada tramo abre diferida → planeada → N1 → N2 → paradas; cada nodo suma (exacto y en enteros) sus
  //    ramas; las paradas traen el entero de cada fila de redondeo.ts (LC-08 = 108) y quién dijo qué.
  const malos3 = []
  const ver = (n, ruta) => {
    if (n.hijos.length) {
      if (!cerca(n.hijos.reduce((a, h) => a + h.bbl, 0), n.bbl)) malos3.push(`${ruta}: no suma sus ramas`)
      if (n.hijos.reduce((a, h) => a + h.bblEntero, 0) !== n.bblEntero) malos3.push(`${ruta}: los enteros no suman`)
      n.hijos.forEach((h, i) => ver(h, `${ruta}.${h.valor}`))
    } else if (n.paradas) {
      if (n.paradas.reduce((a, p) => a + p.bblEntero, 0) !== n.bblEntero) malos3.push(`${ruta}: las paradas no suman`)
    }
  }
  for (const a of ce.arbol) ver(a.diferida, a.tramo)
  const hojas = ce.arbol.flatMap(a => { const out = []; const ir = n => (n.paradas ? out.push(...n.paradas) : n.hijos.forEach(ir)); ir(a.diferida); return out })
  const lc08 = hojas.find(p => p.pozo === 'LC-08')
  comprobar(malos3.length === 0 && lc08?.bblEntero === 108 && ce.arbol.find(a => a.tramo === 'sin-asignar').diferida.hijos[0].valor === AR.FALTA
      && ce.arbol.find(a => a.tramo === 'planta').diferida.hijos.every(h => h.nivel === 'planeacion') && hojas.every(p => Array.isArray(p.dijeron) && p.filas.length > 0),
    `la trazabilidad: diferida → planeada → N1 → N2 → paradas, cada nodo suma sus ramas (exacto y en enteros); LC-08 = ${lc08?.bblEntero} en la hoja, como en todas partes${malos3.length ? `; ${malos3.slice(0, 3).join('; ')}` : ''}`)
  // 4. Septiembre (mes cerrado) y el portafolio: el total es la suma de los campos (los enteros también), y D7.
  const se = BA.balance({ campos: ['ceiba'], desde: cerrado.desde, hasta: cerrado.hasta }, ctx0)
  const desde13 = new Date(L.calendario()[0].desde)
  const [to, msTo] = ms(() => BA.balance({ campos: TODOS, desde: desde13, hasta: curso.hasta }, ctx0))
  const lbTo = L.libro(TODOS, desde13, curso.hasta, ctx0)
  comprobar(se.total.diferido.entero === 7716 && cerca(se.total.producido.exacto, 338662) && se.periodo === 'septiembre'
      && cerca(to.total.diferido.exacto, lbTo.diferido) && cerca(to.total.producido.exacto, lbTo.real)
      && to.total.diferido.entero === to.porCampo.reduce((a, c) => a + c.diferido.entero, 0) && to.total.producido.entero === to.porCampo.reduce((a, c) => a + c.producido.entero, 0)
      && msCe < 300 && msTo < 300,
    `septiembre en La Ceiba: ${f(se.total.producido.exacto)} producidos y ${se.total.diferido.entero} diferidos; el portafolio en 13 meses suma sus campos (${f(to.total.diferido.entero)} diferidos, enteros incluidos); D7: ${msCe.toFixed(0)} ms y ${msTo.toFixed(0)} ms`)

  // 5. El registro de pérdidas: las reglas de POST /api/perdidas (el orden y el código de cada rechazo), solo por inserción.
  const yo = { rol: { id: 'oper', nombre: 'Operador de campo', puede: { 'perdidas:registrar': true } }, persona: { id: 'oper', nombre: 'Jairo Peña' }, campos: ['ceiba'] }
  const campos = TODOS, hora = '2026-10-02T14:00:00-05:00'
  const base = { campoId: 'ceiba', tipo: 'derrame', tramo: 'planta', donde: 'Manifold de la batería', inicio: '2026-10-02T08:00:00-05:00', fin: '2026-10-02T08:30:00-05:00',
    volumen: { bbl: 10.4, fuente: 'estimado', como: 'Mancha de 5 × 4 m en el dique' } }
  const codigo = (c, q = yo, regs = []) => { const r = PE.aceptarPerdida(c, q, regs, campos, hora); return r.ok ? 'ok' : `${r.estado} ${r.codigo}` }
  const casos5 = [
    [null, '400 peticion-invalida'], [{ ...base, tipo: undefined }, '400 peticion-invalida'], [{ ...base, volumen: { ...base.volumen, bbl: '10' } }, '400 peticion-invalida'],
    [base, '403 rol-desconocido', { ...yo, rol: undefined }], [base, '403 sin-capacidad', { ...yo, rol: { ...yo.rol, puede: {} } }], [base, '403 sin-persona', { ...yo, persona: undefined }],
    [{ ...base, campoId: 'rubiales' }, '404 campo-desconocido'], [{ ...base, campoId: 'morichal' }, '403 campo-ajeno'],
    [{ ...base, tramo: 'mercado' }, '422 tramo-desconocido'], [{ ...base, inicio: '2026-10-02T08:00:00' }, '422 hora-invalida'],
    [{ ...base, volumen: { ...base.volumen, bbl: 0 } }, '422 sin-volumen'], [{ ...base, volumen: { ...base.volumen, bbl: 0, gasKpc: 12 } }, 'ok'],
    [{ ...base, volumen: { ...base.volumen, bbl: -1 } }, '422 volumen-invalido'], [{ ...base, volumen: { ...base.volumen, fuente: 'a ojo' } }, '422 fuente-desconocida'],
    [{ ...base, donde: '   ' }, '422 sin-donde'], [{ ...base, retirar: true }, '422 retirar-sin-corrige'], [base, 'ok'],
  ]
  const malos5 = casos5.filter(([c, esperado, q]) => codigo(c, q) !== esperado).map(([c, e, q]) => `${e} → ${codigo(c, q)}`)
  const a1 = PE.aceptarPerdida(base, yo, [], campos, hora)
  const regs1 = [a1.perdida]
  const a2 = PE.aceptarPerdida({ ...base, corrige: a1.perdida.id, motivo: 'Se midió con el aforo', volumen: { ...base.volumen, bbl: 12, fuente: 'medido' } }, yo, regs1, campos, hora)
  const regs2 = [...regs1, a2.perdida]
  const otra = PE.aceptarPerdida({ ...base, corrige: a1.perdida.id, motivo: 'Otra corrección' }, yo, regs2, campos, hora)
  comprobar(malos5.length === 0 && a1.perdida.id === 'PER-ceiba-0001' && a1.perdida.por === 'Jairo Peña · operador de campo' && a1.perdida.hora === hora
      && a2.ok && a2.perdida.n === 2 && a2.perdida.corrige === a1.perdida.id && !otra.ok && otra.estado === 409 && otra.codigo === 'ya-corregida'
      && PE.vigentes(regs2).map(r => r.id).join() === a2.perdida.id && PE.historiaDe(regs2, a2.perdida.id).length === 2,
    `POST /api/perdidas: ${casos5.length} cuerpos con el HTTP y el código del contrato (400 primero); corregir es otra inserción con motivo y rige la nueva; corregir la vieja otra vez, 409${malos5.length ? `; ${malos5.join('; ')}` : ''}`)
  // 6. La vista y el balance con el registro: la pérdida va en su tramo, entera donde empezó, y nunca se suma al diferido.
  const fuera = PE.aceptarPerdida({ ...base, tipo: 'tea', tramo: 'planta', inicio: '2026-09-30T22:00:00-05:00', fin: '2026-10-01T02:00:00-05:00', volumen: { bbl: 0, gasKpc: 40, fuente: 'estimado', como: 'Medidor de la tea' } }, yo, regs2, campos, hora)
  const regs3 = [...regs2, fuera.perdida]
  const vp = PE.vistaPerdidas({ campos: ['ceiba'], desde: curso.desde, hasta: curso.hasta }, regs3)
  const vpSep = PE.vistaPerdidas({ campos: ['ceiba'], desde: cerrado.desde, hasta: cerrado.hasta }, regs3)
  const vacia = PE.vistaPerdidas({ campos: ['ceiba'], desde: curso.desde, hasta: curso.hasta }, [])
  const ceP = BA.balance({ campos: ['ceiba'], desde: curso.desde, hasta: curso.hasta }, ctx0, { perdidas: regs3 })
  comprobar(vp.estado === 'con-registro' && vp.bbl === 12 && vp.bblEntero === 12 && vp.filas.length === 1 && vp.filas[0].historia.length === 1
      && vpSep.bbl === 0 && vpSep.gasKpc === 40 && vpSep.porTipo[0].tipo === 'tea'
      && vacia.estado === 'sin-registro' && vacia.bbl === null && vacia.bblEntero === null && vacia.gasKpc === null && /^Sin registro/.test(vacia.texto)
      && ceP.total.perdido.entero === 12 && ceP.total.porTramo.find(x => x.tramo === 'planta').perdido.entero === 12
      && ceP.total.diferido.exacto === t.diferido.exacto && ceP.total.potencial.exacto === t.potencial.exacto
      && ceP.arbol.find(a => a.tramo === 'planta').perdida.hijos[0].perdidas[0].id === a2.perdida.id && /perdido: 12 bbl/.test(ceP.frase),
    `con registro: 12 bbl perdidos en la planta en octubre, al lado de los ${t.diferido.entero} diferidos y nunca sumados (el potencial no cambia); la tea que empezó el 30 de sept cuenta en septiembre (40 KPC de gas, 0 bbl); sin registros, null y «${vacia.texto}»`)

  // 7. La jornada: el cambio de turno firmado del campo (o el de por defecto, y se dice), con la noche que cruza la medianoche.
  const conf7 = structuredClone(ctx0.config)
  const jDef = JO.jornadaDe(conf7, 'ceiba', 'actual'), jAnt = JO.jornadaDe(conf7, 'ceiba', 'anterior')
  conf7.campos.ceiba.turnos = ['19:00', '07:00']
  const jFir = JO.jornadaDe(conf7, 'ceiba', 'actual'), jNoche = JO.jornadaDe(conf7, 'ceiba', 'actual', Date.parse('2026-10-02T03:00:00-05:00'))
  comprobar(!jDef.firmada && jDef.nombre === 'De 06:00 a 18:00 del 2 de oct' && jDef.enCurso && jAnt.nombre === 'De 18:00 a 06:00 del 1 de oct' && jAnt.hasta.getTime() === jDef.desde.getTime()
      && jFir.firmada && jFir.turnos.join() === '07:00,19:00' && jFir.nombre === 'De 07:00 a 19:00 del 2 de oct'
      && jNoche.nombre === 'De 19:00 a 07:00 del 1 de oct' && (jNoche.hasta.getTime() - jNoche.desde.getTime()) === 12 * 3_600_000,
    `la jornada: «${jDef.nombre}» por defecto (sin firmar), la anterior «${jAnt.nombre}»; firmado 07:00 y 19:00, «${jFir.nombre}»; a las 03:00, «${jNoche.nombre}» (cruza la medianoche)`)
  const [vj, msJ] = ms(() => JO.vistaJornada({ campo: 'ceiba', jornada: 'actual' }, ctx0))
  const enJ = RD.enterosDelPeriodo('ceiba', jDef.desde, jDef.hasta, ctx0)
  const filasJ = vj.paradas.flatMap(p => p.filas)
  comprobar(vj.diferido.entero === enJ.raiz && vj.paradas.reduce((a, p) => a + p.bblEntero, 0) === enJ.raiz && cerca(vj.paradas.reduce((a, p) => a + p.bbl, 0), enJ.exacto)
      && vj.porConfirmar === vj.paradas.filter(p => p.porConfirmar).length && vj.perdido === null && /Horario por defecto, sin firmar/.test(vj.nota ?? '')
      && vj.paradas.every(p => (p.sigue ? p.fin === null && /sigue$/.test(p.cuando) : typeof p.fin === 'string') && p.cadena.length === 6 && p.impacto === 'diferida')
      && new Set(filasJ).size === filasJ.length && msJ < 300,
    `«Mi turno» en La Ceiba (${jDef.nombre}): ${vj.porConfirmar} paradas por confirmar y ${vj.diferido.entero} bbl diferidos (la raíz de la ventana; las paradas suman su entero): ${vj.paradas.map(p => `${p.pozo} «${p.cuando}»`).join(', ')}; D7 ${msJ.toFixed(0)} ms`)
  // 8. Las fallas por mes: la cuenta que hacía la pantalla, ahora en el motor (sin disparos; cuenta donde empezó).
  const fm = EF.fallasPorMes(['ceiba'], ctx0)
  const flota = (await v.ssrLoadModule('/src/entities/flota.ts')).flotaDe('ceiba')
  const todas = flota.flatMap(e => L.historialDeEquipo('ceiba', e.equipo, ctx0).eventos.filter(x => !x.disparo && x.inicio.getTime() >= fm[0].desde.getTime() && x.inicio.getTime() < fm.at(-1).hasta.getTime()))
  comprobar(fm.reduce((a, m) => a + m.fallas, 0) === todas.length && fm.at(-1).fallas === 1 && fm.at(-1).porEquipo[0].equipo === 'P-201B' && fm.at(-1).parcial && !fm.at(-2).parcial
      && fm.every(m => m.fallas === Object.values(m.porFamilia).reduce((a, x) => a + x, 0) && m.fallas === Object.values(m.porTramo).reduce((a, x) => a + x, 0)),
    `las fallas por mes en el motor: ${fm.reduce((a, m) => a + m.fallas, 0)} en 13 meses en La Ceiba (= las de la historia de su flota, sin disparos); octubre, 1 (P-201B), parcial`)
  // 9. «¿Está funcionando?»: la base es la de «¿Está bajando?»; lo ganado = (base − desde el arranque) × días; sin meta de
  //    reducción firmada, null; con ella, la base × (1 − %).
  const [ef, msEf] = ms(() => EF.efectividad({ campos: TODOS }, ctx0, V0))
  const pv = PV.plantaViva({ campos: TODOS, momento: 'despues', desde: curso.desde, hasta: curso.hasta }, ctx0, V0)
  const fl = pv.bajando.filas.find(x => x.tramo === 'planta')
  const pl = ef.porTramo.find(x => x.tramo === 'planta')
  const lbt = (await v.ssrLoadModule('/src/entities/choke-reparto.ts')).lineaBasePorTramo(TODOS, ef.desde, ef.ahora, ctx0, V0)
  const ganado = Object.values(lbt.noPlaneado).reduce((a, x) => a + (x.baseDia - x.periodoDia), 0) * ef.ganado.dias
  comprobar(Math.round(fl.antesBpd) === 561 && Math.round(fl.ahoraBpd) === 308 && cerca(pl.antesDia.exacto, fl.antesBpd) && cerca(ef.ganado.bbl.exacto, ganado)
      && ef.meta === null && ef.cumple.noPlaneado === null && ef.ganado.fallasAnticipadas === 5 && ef.ganado.juzgadas === 7 && ef.base.firmada === false
      && ef.porTramo.reduce((a, x) => a + x.ahoraDia.entero, 0) === ef.esteMes.noPlaneadoDia.entero && ef.esteMes.fallas === EF.fallasPorMes(TODOS, ctx0).at(-1).fallas && msEf < 300,
    `«¿Está funcionando?» (5 campos): antes ${ef.antes.noPlaneadoDia.entero} bbl/d no planeados (planta ${pl.antesDia.entero}, la base de «¿Está bajando?»: 561 → 308), este mes ${ef.esteMes.noPlaneadoDia.entero}; se dejaron de diferir ${f(ef.ganado.bbl.entero)} bbl en ${ef.ganado.dias.toFixed(1)} días; el vigía anticipó ${ef.ganado.fallasAnticipadas}; sin meta de reducción firmada; D7 ${msEf.toFixed(0)} ms`)
  const conMeta = structuredClone(ctx0.config)
  for (const c of TODOS) conMeta.campos[c].metas.push({ ...conMeta.campos[c].metas.at(-1), desde: '2026-10-01', reduccionPct: 25 })
  const ef25 = EF.efectividad({ campos: ['ceiba'] }, { ...ctx0, config: conMeta }, V0)
  comprobar(ef25.meta?.reduccionPct === 25 && cerca(ef25.meta.noPlaneadoDia.exacto, ef25.antes.noPlaneadoDia.exacto * 0.75) && cerca(ef25.meta.fallasMes, ef25.antes.fallasMes * 0.75)
      && ef25.cumple.noPlaneado === (ef25.esteMes.noPlaneadoDia.exacto <= ef25.meta.noPlaneadoDia.exacto),
    `con la meta de reducción del 25 % firmada, La Ceiba: meta ${ef25.meta?.noPlaneadoDia.entero} bbl/d no planeados (antes ${ef25.antes.noPlaneadoDia.entero}) y ${ef25.meta?.fallasMes.toFixed(2)} fallas al mes; este mes ${ef25.esteMes.noPlaneadoDia.entero}: ${ef25.cumple.noPlaneado ? 'dentro' : 'fuera'} de la meta`)
  // 10. La configuración: el cambio de turno es técnico (adm) y la meta de reducción, de las metas (ger); se validan; null es «sin firmar».
  const c0 = ctx0.config
  const conT = structuredClone(c0); conT.campos.ceiba.turnos = ['06:00', '18:00', '06:00']
  const conR = structuredClone(c0); conR.campos.ceiba.metas.push({ ...conR.campos.ceiba.metas.at(-1), desde: '2026-10-01', reduccionPct: 120 })
  const okT = structuredClone(c0); okT.campos.ceiba.turnos = ['05:30', '17:30']
  const okR = structuredClone(c0); okR.campos.ceiba.metas.push({ ...okR.campos.ceiba.metas.at(-1), desde: '2026-10-01', reduccionPct: 20 })
  const gT = C.diferenciasPorGrupo(c0, okT), gR = C.diferenciasPorGrupo(c0, okR)
  const nulos = C.normalizarConfig({ ...c0, campos: { ...c0.campos, ceiba: { ...c0.campos.ceiba, turnos: null, metas: c0.campos.ceiba.metas.map(m => ({ ...m, reduccionPct: null })) } } })
  comprobar(C.validarConfig(conT, c0, '2026-10-01', R.AHORA.getTime()).some(e => /repetida/.test(e)) && C.validarConfig(conR, c0, '2026-10-01', R.AHORA.getTime()).some(e => /entre 0 y 100/.test(e))
      && C.validarConfig(okT, c0, '2026-10-01', R.AHORA.getTime()).length === 0 && C.validarConfig(okR, c0, '2026-10-01', R.AHORA.getTime()).length === 0
      && gT.metas.length === 0 && gT.tecnica.join() === 'La Ceiba: cambio de turno el de por defecto (06:00 y 18:00) → 05:30 y 17:30'
      && gR.tecnica.length === 0 && /meta de reducción frente a antes de TRIM sin configurar → 20 %/.test(gR.metas.join()) && !C.mismoTramo(okR.campos.ceiba.metas.at(-1), { ...okR.campos.ceiba.metas.at(-1), reduccionPct: undefined })
      && !('turnos' in nulos.campos.ceiba) && nulos.campos.ceiba.metas.every(m => !('reduccionPct' in m)),
    `la configuración: el cambio de turno lo firma el administrador («${gT.tecnica[0]}»), la meta de reducción el gerente; «06:00» repetido y 120 % no se firman; en null, «sin firmar»`)
}

await v.close()
console.log(`\n${pruebas - fallos} de ${pruebas} comprobaciones bien.`)
if (fallos) { console.log(`${fallos} FALLARON.`); process.exit(1) }
