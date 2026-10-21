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
const MSJ = await v.ssrLoadModule('/src/entities/mensajes.ts')
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

console.log('\n=== 8. SAP, WhatsApp, aciertos y asignación oficial ===')
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

// WhatsApp: el registro se arma con el historial de la configuración (cada mensaje con la versión que regía a su hora).
const V1 = [C.versionInicial()]
const preguntas = L.libro(TODOS, new Date(L.calendario()[0].desde), R.AHORA, ctx0).preguntas
const riesgoT = D.riesgoAhora(TODOS, ctx0)
const registroPr = AC.registroDePredicciones(TODOS, ctx0, riesgoT)
const msjs = MSJ.mensajesDe({ campos: TODOS, preguntas, predicciones: registroPr, ordenes: hs.ordenes, usuarios: U.USUARIOS_INICIALES, ctx: ctx0, versiones: V1, desde: new Date(L.calendario()[0].desde) })
comprobar(msjs.length > 0 && msjs.every(m => new Date(m.hora).getTime() <= ahora), `${msjs.length} mensajes, ninguno con hora futura`)
comprobar(msjs.every(m => { const u = U.USUARIOS_INICIALES.find(x => x.id === m.para); return u && u.alertas && u.telefono && u.estado === 'activo' && (u.campos === 'todos' || u.campos.includes(m.campoId)) }),
  'cada mensaje va a una persona activa, con alertas, con teléfono y con ese campo')
const pide = preguntas.find(p => p.pide && p.equipo === 'P-201B' && p.campoId === 'ceiba')
const p201 = msjs.filter(m => m.evento === pide.id && (m.regla === 'parada' || m.regla === 'cierre')).sort((a, b) => a.hora.localeCompare(b.hora))
const alParar = p201.find(m => m.regla === 'parada'), alCerrar = p201.find(m => m.regla === 'cierre')
// El respaldo firmado sí va (es configuración y se sabe al parar); los pozos y los barriles, no.
const sinElRespaldo = (alParar?.texto ?? '').replace(C.respaldoDe(ctx0.config, 'ceiba', 'P-201B').detalle, '')
comprobar(!!alParar && !!alCerrar && new Date(alParar.hora).getTime() === pide.inicio.getTime() + 60_000 && !/\d+ pozos|bbl/.test(sinElRespaldo)
  && new Date(alCerrar.hora) > new Date(alParar.hora) && /se empezaron a cerrar pozos/.test(alCerrar.texto),
  'P-201B: al parar (03:53) avisa sin cifras que todavía no se sabían (solo el respaldo firmado); el cierre de pozos va en su propio mensaje, a su hora')
comprobar(msjs.filter(m => m.insistencia === 'escalamiento').every(m => !/bbl/.test(m.texto)), 'el escalamiento no trae barriles: a las 2 h no se sabe cuánto va a costar')
// Las sugerencias son las que se sabían al parar: no cambian si después alguien responde.
const ctxResp = { config: ctx0.config, respuestas: { [pide.id]: { texto: 'Sello', por: 'x', parte: 'sello', hora: R.AHORA.toISOString(), canal: 'whatsapp' } } }
const sugAntes = MSJ.causasSugeridas(pide, ctx0).opciones.map(o => `${o.texto}|${o.porque}`).join(';')
const sugDespues = MSJ.causasSugeridas(pide, ctxResp).opciones.map(o => `${o.texto}|${o.porque}`).join(';')
comprobar(sugAntes === sugDespues && /fallas anteriores/.test(sugAntes), 'las causas sugeridas se cuentan con las fallas anteriores a la parada, y responder después no las cambia')
const esEspP = p => P.pozoDe(p.campoId, p.equipo)?.levantamiento === 'electrosumergible'
const pozoComun = preguntas.find(p => p.sobre === 'pozo' && !esEspP(p)), pozoEsp = preguntas.find(p => p.sobre === 'pozo' && esEspP(p))
comprobar(!!pozoComun && MSJ.causasSugeridas(pozoComun, ctx0).opciones.every(o => !o.parte), `un pozo sin electrosumergible (${pozoComun?.equipo}) recibe el catálogo de pozo, sin partes ni orden`)
const sugEsp = pozoEsp ? MSJ.causasSugeridas(pozoEsp, ctx0).opciones : []
comprobar(!!pozoEsp && sugEsp.some(o => o.parte) && sugEsp.every(o => !o.parte || CAT.catalogoDe(pozoEsp.campoId, pozoEsp.equipo).partes.some(x => x.id === o.parte)) && sugEsp.some(o => o.texto === MSJ.NO_FUE_ESP),
  `un pozo con electrosumergible (${pozoEsp?.equipo}) recibe las partes de la electrosumergible y la salida «no fue ella»`)
const bombaNueva = { ...pide, inicio: new Date(L.calendario()[0].desde) }
const sugNueva = MSJ.causasSugeridas(bombaNueva, ctx0)
comprobar(!sugNueva.conEvidencia && sugNueva.opciones.filter(o => o.clave !== '0').every(o => o.parte), 'una bomba sin historia antes de la parada ofrece sus partes, no las causas de un pozo')
const avisosParte = msjs.filter(m => m.regla === 'parte')
comprobar(avisosParte.length > 0 && avisosParte.every(m => registroPr.some(p => p.id === m.evento && p.emitida === m.hora)), 'el aviso de parte sale cuando el vigía emite la predicción, con su hora')
// El número se guarda en E.164 (como dice el contrato) y se muestra agrupado.
comprobar(U.normalizarTelefono('300 123 4567', { indicativo: '+57', patron: /^3\d{9}$/ }) === '+573001234567'
  && U.telefonoLegible('+573001234567', { indicativo: '+57', patron: /^3\d{9}$/ }) === '+57 300 123 4567'
  && U.validarAcceso(U.USUARIOS_INICIALES, { ...U.USUARIOS_INICIALES.find(u => u.rolId === 'prod'), alertas: true }, 'ger', 'prueba de alertas').some(e => /no recibe alertas/.test(e)),
  'un celular de 10 dígitos se guarda con +57 en E.164 (+573001234567) y se lee agrupado (+57 300 123 4567); a un rol sin reglas de WhatsApp no se le encienden alertas')
const deP = msjs.filter(m => m.evento === pide.id)
comprobar(deP.some(m => !m.insistencia) && deP.some(m => m.insistencia === 'recordatorio') && deP.some(m => m.insistencia === 'escalamiento' && U.USUARIOS_INICIALES.find(u => u.id === m.para)?.rolId === 'sup'),
  'parada sin causa: pregunta y recordatorio al operador, escalamiento al supervisor a las 2 h')
// Con respuesta a los 20 minutos no hay recordatorio ni escalamiento.
const pResp = { ...pide, causa: { ...pide.causa, declarado: { texto: 'Sello mecánico', por: 'x', hora: new Date(pide.inicio.getTime() + 20 * 60_000).toISOString(), canal: 'whatsapp' } } }
const conResp = MSJ.mensajesDe({ campos: TODOS, preguntas: [pResp], predicciones: [], ordenes: [], usuarios: U.USUARIOS_INICIALES, ctx: ctx0, versiones: V1, desde: new Date(L.calendario()[0].desde) })
comprobar(conResp.length > 0 && conResp.every(m => !m.insistencia), 'respondida a los 20 min: no se le insiste a nadie')
// Sin operador con alertas, la pregunta va al supervisor y no hay escalamiento.
const sinOper = U.USUARIOS_INICIALES.map(u => (u.rolId === 'oper' ? { ...u, alertas: false } : u))
const alSup = MSJ.mensajesDe({ campos: TODOS, preguntas: [pide], predicciones: [], ordenes: [], usuarios: sinOper, ctx: ctx0, versiones: V1, desde: new Date(L.calendario()[0].desde) })
comprobar(alSup.length > 0 && alSup.every(m => U.USUARIOS_INICIALES.find(u => u.id === m.para)?.rolId === 'sup') && !alSup.some(m => m.insistencia === 'escalamiento'),
  'sin operador con alertas, la pregunta va directo al supervisor (sin escalarse a sí mismo)')
// Meta no acepta saltos de línea dentro de un parámetro de plantilla: las opciones van en una sola línea.
comprobar(msjs.filter(m => m.regla === 'causa').every(m => m.texto.split('\n').length === 2), 'las opciones de «¿qué se dañó?» van en una sola línea (parámetro de plantilla sin saltos)')
const sugP = MSJ.causasSugeridas(pide, ctx0).opciones
comprobar(sugP.some(o => o.texto === MSJ.OTRA_PARTE) && sugP.filter(o => o.parte).length <= 3, 'con partes sugeridas, WhatsApp ofrece además «otra parte del equipo» (todas las del catálogo a un toque)')
comprobar(CAT.nombreModo('BRD', 'aislamiento') === 'Se quemó o dio a tierra' && CAT.nombreModo('UST') === 'Se disparó sin daño a la vista', 'el modo de falla se dice en palabras de campo, y cambia con la parte (aislamiento: se quemó o dio a tierra)')
const ordTec = msjs.filter(m => m.regla === 'orden')
// El aviso sale cuando SAP libera la orden y queda en el registro aunque hoy esté cerrada (TECO).
const liberadasTec = hs.ordenes.filter(o => o.liberada && o.tecnico && Date.parse(o.liberada) >= L.calendario()[0].desde && Date.parse(o.liberada) <= ahora && U.recibeAlertas(U.USUARIOS_INICIALES.find(u => u.id === o.tecnico), o.campoId))
comprobar(ordTec.length > 0 && ordTec.every(m => hs.ordenes.some(o => o.numero === m.orden && o.tecnico === m.para && o.liberada))
  && liberadasTec.every(o => ordTec.some(m => m.orden === o.numero)) && ordTec.some(m => hs.ordenes.find(o => o.numero === m.orden)?.estado === 'TECO'),
  `cada orden liberada le llega al técnico asignado, con su número, aunque hoy esté cerrada (${ordTec.length} avisos de ${liberadasTec.length} órdenes liberadas)`)
// Causas sugeridas: hasta tres más «otra»; una parada cerrada no usa las lecturas de hoy.
let malSug = 0
for (const p of preguntas) {
  const cs = MSJ.causasSugeridas(p, ctx0)
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
const ctxHoy = { config: ctx0.config, respuestas: { [pide.id]: { texto: 'Sello', por: 'x', parte: 'sello', modo: 'ELP', hora: R.AHORA.toISOString(), canal: 'whatsapp' } } }
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

// Accesos: el WhatsApp es de una sola persona, y nadie otorga ni se cambia lo que no le toca.
const supU = us.find(u => u.rolId === 'sup'), operU = us.find(u => u.rolId === 'oper')
const mismoNumero = { ...operU, telefono: U.normalizarTelefono(supU.telefono.replace(/\s/g, ''), { indicativo: '+57', patron: /^3\d{9}$/ }) }
comprobar(U.validarAcceso(us, mismoNumero, ger.id, 'prueba de número').some(x => x.includes('ya es de')) && mismoNumero.telefono === supU.telefono
  && U.e164('+57 300 555 0103') === U.e164('+573005550103')
  && U.validarAcceso(us.map(u => (u.id === supU.id ? { ...u, estado: 'suspendido' } : u)), mismoNumero, ger.id, 'prueba de número').every(x => !x.includes('ya es de')),
  'un WhatsApp no puede ser de dos personas activas, se compara en E.164 (+573005550103 = +57 300 555 0103), y el de un suspendido se puede reasignar')
const gerLim = us.map(u => (u.id === ger.id ? { ...u, campos: ['ceiba', 'palmar'] } : u)), yoLim = gerLim.find(u => u.id === ger.id)
const prodU = gerLim.find(u => u.rolId === 'prod')
comprobar(U.validarAcceso(gerLim, { ...yoLim, campos: 'todos' }, ger.id, 'prueba de alcance').some(x => x.includes('propios campos'))
  && U.validarAcceso(gerLim, { ...prodU, campos: 'todos' }, ger.id, 'prueba de alcance').some(x => x.includes('«todos los campos»'))
  && U.validarAcceso(gerLim, { ...prodU, campos: ['ceiba', 'palmar', 'morichal'] }, ger.id, 'prueba de alcance').some(x => x.includes('que usted no tiene'))
  && U.validarAcceso(gerLim, { ...prodU, campos: ['ceiba'] }, ger.id, 'prueba de alcance').length === 0,
  'un gerente de algunos campos no se cambia los suyos, no da «todos» ni campos que no tiene; sí quita de los que tiene')
comprobar(!Object.values(U.ALERTAS_DEL_ROL).some(t => /menos de un día/.test(t)) && /pozos cerrándose/.test(U.ALERTAS_DEL_ROL.sup) && /predicción/.test(U.ALERTAS_DEL_ROL.conf),
  'lo que la pantalla de accesos promete que llega por WhatsApp es la regla que se envía')
comprobar(ROL.ROLES.every(r => Object.keys(r.puede).every(k => k in TIP.CAPACIDAD_NOMBRE)) && !ROL.ROLES.some(r => 'mes:cerrar' in r.puede || 'rol:suplantar' in r.puede),
  'las capacidades son las que algún endpoint revisa (sin «cerrar el mes» ni «suplantar», que nada controlaba)')

// Mensajes: el texto es el de la plantilla con sus parámetros, sin parámetros vacíos.
comprobar(msjs.every(m => m.texto === MSJ.textoDe(m.plantilla, m.parametros) && Object.values(m.parametros).every(x => x.trim() && !/\n/.test(x)))
  && Object.values(MSJ.PLANTILLAS).every(p => p.cuerpo.startsWith('TRIM · ')),
  `los ${msjs.length} mensajes del registro son exactamente lo que sus plantillas aprobadas producen, sin un parámetro vacío`)
const sinTag = msjs.filter(m => m.regla === 'parte' && !m.parametros.tag)
comprobar(sinTag.length > 0 && sinTag.every(m => m.plantilla === 'parteSinTag' && !/\(\)/.test(m.texto)), `las ${sinTag.length} predicciones sin tag salen con su propia plantilla, sin «()»`)
const espMsj = msjs.filter(m => m.plantilla === 'paradaEsp')
const citaFutura = espMsj.filter(m => /última prueba/.test(m.texto) && !P.pozoDe(m.campoId, m.equipo).pruebas.some(p => Date.parse(p.fecha) <= Date.parse(m.hora) - 60_000))
const lc06 = espMsj.find(m => m.equipo === 'LC-06' && m.hora.startsWith('2025-10-01'))
comprobar(citaFutura.length === 0 && !!lc06 && /no tiene prueba/.test(lc06.texto), `ninguna parada de electrosumergible cita una prueba posterior (LC-06 el 1-oct-2025: «${lc06?.parametros.consecuencia}»)`)
const conSupEnTodos = U.USUARIOS_INICIALES.map(u => (u.rolId === 'sup' ? { ...u, campos: 'todos' } : u))
const deBombas = MSJ.mensajesDe({ campos: ['guacamayo', 'morichal', 'ceiba'], preguntas: [], predicciones: [], ordenes: [], usuarios: conSupEnTodos, ctx: ctx0, versiones: V1, desde: new Date(L.calendario()[0].desde) })
const consec = (c, eq) => deBombas.find(m => m.plantilla === 'parada' && m.campoId === c && m.equipo === eq)?.parametros.consecuencia ?? ''
comprobar(/no hay que cerrar pozos/.test(consec('guacamayo', 'P-201B')) && /no para todo su caudal/.test(consec('morichal', 'P-201B'))
  && /no para todo su caudal/.test(consec('ceiba', 'P-201B')) && /hay que cerrar los pozos/.test(consec('morichal', 'MPP-301')),
  'la parada de una bomba dice lo que su respaldo declarado permite: Guacamayo no cierra pozos (todo su caudal), Morichal y La Ceiba quizá (parte), la MPP-301 sí (sin respaldo)')
const corta = { ...pide, fin: new Date(pide.inicio.getTime() + 20 * 60_000), causa: { ...pide.causa, declarado: undefined } }
const recCorta = MSJ.mensajesDe({ campos: TODOS, preguntas: [corta], predicciones: [], ordenes: [], usuarios: U.USUARIOS_INICIALES, ctx: ctx0, versiones: V1, desde: new Date(L.calendario()[0].desde) }).find(m => m.insistencia === 'recordatorio')
comprobar(!!recCorta && recCorta.plantilla === 'recordatorioArranco' && !/Antes de arrancar/.test(recCorta.texto) && /arrancó a las/.test(recCorta.texto),
  'si el equipo arrancó antes de los 30 min, el recordatorio no pide «antes de arrancar»: dice que arrancó sin causa')

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

// R12 (#129, #123): el registro no se reescribe. Una versión firmada HOY (respaldo
// total para P-201B de La Ceiba: una cuarta bomba que toma todo su caudal) no cambia
// ningún mensaje enviado antes; una firmada a mitad de la historia cambia solo lo que
// salió después de ella.
{
  const conRespaldo = structuredClone(C.versionInicial().config)
  const todoSuCaudal = B.perfilBomba('P-201B', 'ceiba').capacidadBpd
  conRespaldo.respaldos = conRespaldo.respaldos.map(r => (r.campoId === 'ceiba' && r.equipo === 'P-201B' ? { ...r, libreBpd: todoSuCaudal, detalle: 'P-201D nueva en paralelo' } : r))
  const base = { campos: ['ceiba'], preguntas: [], predicciones: [], ordenes: [], usuarios: U.USUARIOS_INICIALES, ctx: ctx0, desde: new Date(L.calendario()[0].desde) }
  const antes = MSJ.mensajesDe({ ...base, versiones: V1 })
  const hoy = MSJ.mensajesDe({ ...base, versiones: [...V1, { fecha: R.AHORA.toISOString(), config: conRespaldo }] })
  const corte = '2026-03-01T00:00:00-05:00'
  const medio = MSJ.mensajesDe({ ...base, versiones: [...V1, { fecha: corte, config: conRespaldo }] })
  const deBomba = ms => ms.filter(m => m.plantilla === 'parada' && m.equipo === 'P-201B')
  const viejos = deBomba(medio).filter(m => Date.parse(m.hora) < Date.parse(corte)), nuevos = deBomba(medio).filter(m => Date.parse(m.hora) >= Date.parse(corte) + 60_000)
  comprobar(JSON.stringify(hoy) === JSON.stringify(antes) && viejos.length > 0 && nuevos.length > 0
    && viejos.every(m => /puede haber que cerrar pozos/.test(m.texto) && /P-201A y P-201C/.test(m.texto)) && nuevos.every(m => /no hay que cerrar pozos/.test(m.texto) && /P-201D/.test(m.texto)),
    `firmar un respaldo hoy no reescribe ningún mensaje viejo; firmado a mitad de la historia, ${viejos.length} paradas de antes siguen diciendo «puede haber que cerrar pozos» (P-201A y P-201C) y ${nuevos.length} de después citan el respaldo nuevo`)
}

// R13 (#93): un dato malo de SAP (una descripción vacía o de dos líneas) no tumba
// el registro: ESE mensaje queda como no enviado, con su motivo, y los demás salen.
{
  const ord = hs.ordenes.filter(o => o.liberada && o.tecnico)
  const sano = MSJ.mensajesDe({ campos: TODOS, preguntas: [], predicciones: [], ordenes: ord, usuarios: U.USUARIOS_INICIALES, ctx: ctx0, versiones: V1, desde: new Date(L.calendario()[0].desde) })
  const malas = ord.map((o, i) => (i === 0 ? { ...o, descripcion: '  ' } : i === 1 ? { ...o, descripcion: 'Cambio de sello\ny revisión' } : o))
  let roto = '', conMalo = []
  try { conMalo = MSJ.mensajesDe({ campos: TODOS, preguntas: [], predicciones: [], ordenes: malas, usuarios: U.USUARIOS_INICIALES, ctx: ctx0, versiones: V1, desde: new Date(L.calendario()[0].desde) }) } catch (e) { roto = e.message }
  const fallidos = conMalo.filter(m => m.noEnviado)
  comprobar(!roto && ord.length > 2 && conMalo.length === sano.length && fallidos.length === sano.filter(m => m.orden === ord[0].numero || m.orden === ord[1].numero).length
    && fallidos.every(m => m.texto === undefined && /descripcion/.test(m.noEnviado)) && conMalo.filter(m => !m.noEnviado).every(m => m.texto === MSJ.textoDe(m.plantilla, m.parametros)),
    `con dos órdenes de SAP mal descritas, sus ${fallidos.length} avisos quedan «no enviado» con el motivo y los otros ${conMalo.length - fallidos.length} salen${roto ? ` (reventó: ${roto})` : ''}`)
  let otro = ''
  try { MSJ.textoDe('orden', { orden: '1', clase: 'x', prioridad: '1', equipo: 'P', campo: 'C', descripcion: 'd', sobra: 'x' }) } catch (e) { otro = e.name }
  comprobar(otro === 'ErrorDePlantilla', 'el error de una plantilla es un ErrorDePlantilla: el registro atrapa solo ese y deja pasar cualquier otro')
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
comprobar(sinRol.pantalla === 'bombas' && sinRol.campoId === undefined, `sin rol en la dirección se valida contra el rol que se ve: el operador no abre Producción ni El Palmar (${JSON.stringify(sinRol)})`)
nav.hash = '#/x/bombas/palmar/curso'
comprobar(URLM.leerHash(undefined, 'sup').campoId === undefined, 'con un rol inválido, el supervisor (solo La Ceiba) no abre El Palmar')
nav.hash = '#/ger/perfil/ceiba/curso'
comprobar(URLM.leerHash(undefined, 'ger').pantalla === 'perfil', '«Mi perfil» se acepta en la dirección de cualquier rol')

est().setRol('ger'); ir('#/ger/resumen/ceiba/curso')
ir('#/cont/resumen/ceiba/curso')
comprobar(est().rolId === 'ger' && nav.hash.startsWith('#/ger/'), `pegar un enlace con un rol de v2 no deja guardado un rol fantasma (rol ${est().rolId}, dirección ${nav.hash})`)
est().setRol('oper'); ir('#/oper/bombas/ceiba/curso')
ir('#//produccion/palmar/curso')
comprobar(est().rolId === 'oper' && est().pantalla === 'bombas' && est().campoId === 'ceiba', `operador con «#//produccion/palmar»: sigue en sus bombas de La Ceiba (${est().pantalla}, ${est().campoId})`)
est().setRol('ger'); ir('#/ger/resumen/ceiba~portafolio/curso')
ir('#/ger/resumen/zarza~portafolio/curso')
comprobar(est().alcance === 'portafolio' && est().campoId === 'zarza' && nav.hash === '#/ger/resumen/zarza~portafolio/curso', `pegar un portafolio sobre otro portafolio lo conserva (${nav.hash})`)
ir('#/ger/resumen/ceiba/curso/P-201B')
ir('#/ger/diferidos/ceiba/curso/P-201B')
comprobar(est().pantalla === 'diferidos' && est().equipoAbierto === 'P-201B', `cambiar de pantalla por la dirección con el mismo equipo lo deja abierto (${nav.hash})`)
ir('#/ger/perfil/ceiba/curso')
comprobar(est().pantalla === 'perfil', 'atrás/adelante a «Mi perfil» lo vuelve a abrir')

est().setRol('ger'); est().setAlcance('portafolio'); est().setRol('adm')
comprobar(est().alcance === 'campo', 'el administrador (ninguna pantalla suma campos) no queda en portafolio')
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
// R14 (#42): el WhatsApp se guarda en E.164. El mismo número escrito con espacios y sin indicativo no es un cambio.
est().setRol('ger')
const supTel = est().usuarios.find(u => u.rolId === 'sup')
const mismoTel = await est().guardarUsuario({ ...supTel, telefono: supTel.telefono.replace('+57', '').replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3') }, 'mismo número escrito distinto')
comprobar(/^\+\d{8,15}$/.test(supTel.telefono) && !mismoTel.ok && mismoTel.errores.some(e => /No hay cambios/.test(e.texto)),
  `el teléfono guardado está en E.164 (${supTel.telefono}) y escrito «300 555 …» sin indicativo es el mismo: no hay cambio que guardar`)
est().setRol('prod')

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
  // Las formas de prioridad van sobre los paneles y la superficie (no sobre el suelo).
  for (const fo of ['p1', 'p2', 'p4', 'invalido']) for (const f of ['superficie', 'panel', 'panel2', 'elevado']) if (razon(k[fo], k[f]) < 3) formaMala.push(`${t} ${fo}/${f} ${razon(k[fo], k[f]).toFixed(2)}`)
  for (const s of ['p1', 'p2', 'p3', 'p4']) if (razon(k.tinta, k[`${s}-f`]) < 4.5) chipMalo.push(`${t} tinta/${s}-f`)
  // El número dentro de la forma, contra el color de la forma (3:1, es parte del gráfico).
  for (const s of ['p1', 'p2', 'p4']) if (razon(k['marca-num'], k[s]) < 3) formaMala.push(`${t} número/${s} ${razon(k['marca-num'], k[s]).toFixed(2)}`)
}
comprobar(textoMalo.length === 0, `todo texto en tinta, tinta2 y tinta3 da 4,5:1 sobre los cinco fondos, en claro y en oscuro${textoMalo.length ? ': ' + textoMalo.join('; ') : ''}`)
comprobar(formaMala.length === 0, `las formas de prioridad 1, 2, 4 y el dato inválido dan 3:1 sobre los paneles, y el número de adentro se lee${formaMala.length ? ': ' + formaMala.join('; ') : ''}`)
comprobar(chipMalo.length === 0 && razon(temas.claro.p3, temas.claro.panel) < 3 && razon(temas.claro['marca-trazo'], temas.claro.p3) >= 3,
  'el texto de las etiquetas de prioridad va en tinta sobre su fondo, y el cuadrado amarillo (1,6:1 contra el panel) lleva trazo oscuro')

// Las marcas: el cuadrado P3 lleva trazo; la etiqueta no repite la prioridad al lector.
const PR = await v.ssrLoadModule('/src/shared/ui/Prioridad.tsx'), PRIM = await v.ssrLoadModule('/src/shared/ui/primitivas.tsx')
const m3 = renderToStaticMarkup(h(PR.MarcaPrioridad, { s: 3 })), chip1 = renderToStaticMarkup(h(PRIM.Severidad_, { s: 1 }))
comprobar(/stroke="var\(--marca-trazo\)"/.test(m3) && /aria-label="Prioridad 3/.test(m3) && /aria-hidden="true"/.test(chip1) && !/text-\[var\(--p1\)\]/.test(chip1) && chip1.includes('P1 · ALARMA'),
  'MarcaPrioridad 3 lleva trazo y nombre; la etiqueta «P1 · ALARMA» pinta la forma sin anunciarla dos veces y el texto no va en rojo')

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
const POZ = await v.ssrLoadModule('/src/widgets/pozos/estado.ts'), EV = await v.ssrLoadModule('/src/entities/equipo-vivo.ts')
const filas = API.pedirPozos('ceiba', new Date(L.calendario().at(-1).desde), R.AHORA, ctx0)
const porBomba = filas.filter(fp => POZ.cerradoPorOtro(fp))
const distintos = filas.filter(fp => EV.equipoVivo(fp.pozo.id, 'ceiba', ctx0)?.severidad !== POZ.sevPozo(fp)).map(fp => fp.pozo.id)
comprobar(porBomba.length > 0 && porBomba.every(fp => POZ.sevPozo(fp) === 0 && EV.equipoVivo(fp.pozo.id, 'ceiba', ctx0)?.marcha === 'cerrado-por-otro') && distintos.length === 0,
  `${porBomba.length} pozos de La Ceiba que cerró la bomba: gris en la lista y en el detalle, con marcha «cerrado por otro»; la ficha y la lista dan la misma prioridad a los ${filas.length}${distintos.length ? ` (difieren ${distintos.join(', ')})` : ''}`)

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
const inv = (await est().invitarUsuario({ nombre: 'Lucía Prueba', correo: 'lucia.prueba@operadora.example', rolId: 'sup', campos: ['ceiba', 'morichal'], telefono: '', alertas: false }, 'supervisora de prueba de La Ceiba y Morichal'))
const lucia = inv.ok ? est().usuarios.find(u => u.id === inv.id) : undefined
const hist = est().accesos.at(-1)
comprobar(inv.ok && est().usuarios.length === antesN + 1 && lucia?.estado === 'invitado' && lucia?.desde === '2026-10-02' && /^u\d+$/.test(lucia?.id ?? '')
  && hist.cambios.some(c => c.startsWith('campos: ')) && hist.cambios.some(c => c.startsWith('WhatsApp: ')),
  `invitar: el servidor pone el id (${lucia?.id}), el día del reloj y «invitado»; el historial dice con qué campos y qué WhatsApp (${hist?.cambios.join(' · ')})`)
const sus = lucia && (await est().guardarUsuario({ ...lucia, estado: 'suspendido' }, 'prueba de suspensión antes de entrar'))
const suspendida = est().usuarios.find(u => u.id === lucia?.id)
const rea = suspendida && (await est().guardarUsuario({ ...suspendida, estado: 'activo' }, 'prueba de reactivación'))
comprobar(!!sus?.ok && suspendida?.estado === 'suspendido' && !!rea?.ok && est().usuarios.find(u => u.id === lucia?.id)?.estado === 'invitado',
  'suspender a quien nunca entró y quitarle la suspensión la devuelve a «invitado», no a «activo»')
const fantasma = (await est().guardarUsuario({ ...lucia, id: 'u999' }, 'cambio de alguien que no existe'))
const malCorreo = U.revisarAcceso(est().usuarios, { ...lucia, id: 'nuevo', correo: 'x@' }, est().usuarios.find(u => u.rolId === 'ger').id, '')
comprobar(!fantasma.ok && fantasma.errores[0].campo === 'general' && malCorreo.some(e => e.campo === 'correo') && malCorreo.some(e => e.campo === 'motivo'),
  'un PATCH a una persona que no existe se rechaza (invitar es otra llamada) y cada error dice de qué caja es (correo, motivo)')

// WhatsApp: la respuesta lleva el id de quien respondió; el chat compara por id, no por el nombre.
const resp = est().ctx.respuestas[EV3], operU = U.personaDelRol(est().usuarios, 'oper')
comprobar(resp && resp.porId === operU?.id, `la respuesta guarda el id de quien respondió (${resp?.porId}) además de «${resp?.por}»`)

// Aviso a SAP: el error de la descripción dice de qué caja es.
est().setRol('sup')
const avisoCorto = (await est().enviarAviso({ tipo: 'M1', campoId: 'ceiba', equipo: 'P-201B', descripcion: 'corto', prioridad: 3, parada: false, evidencia: [] }))
comprobar(!avisoCorto.ok && avisoCorto.campo === 'descripcion', 'un aviso a SAP con una descripción corta se rechaza y dice que el error es de «Qué pasa»')

// Fuentes: WOFF2 sin la cara Light, y cada archivo declarado existe.
const caras = [...css.matchAll(/url\(\/fonts\/([^)]+)\)/g)].map(m => m[1])
comprobar(caras.length === 8 && caras.every(c => c.endsWith('.woff2') && existsSync(`${raiz}public/fonts/${c}`)) && !/Light\.|font-weight:300/.test(css)
  && readFileSync(`${raiz}index.html`, 'utf8').match(/rel="preload"[^>]+\.woff2/g)?.length === 3,
  `las 8 caras de la marca van en WOFF2 y existen (${caras.length}); la Light no se declara; se precargan las 3 de arriba`)
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
  for (const n of ['diferidos', 'equipos', 'medicion', 'calendario', 'predicciones', 'sap', 'mensajes', 'usuarios', 'sesion', 'informes', 'fuente'])
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
const persona = s0.usuarios.find(u => u.alertas && u.estado === 'activo' && (u.campos === 'todos' || u.campos.includes('ceiba')))
const preguntaAbierta = API.pedirPreguntas(['ceiba'], s0.ctx).find(p => p.pide && !s0.ctx.respuestas[p.id])
const MSJ3 = await v.ssrLoadModule('/src/entities/mensajes.ts')
const cero7 = persona && preguntaAbierta && await E.recibirWhatsapp({ evento: preguntaAbierta.id, campoId: 'ceiba', equipo: preguntaAbierta.equipo, usuarioId: persona.id, opcion: MSJ3.OTRA, texto: 'siete c' })
comprobar(!!cero7 && !cero7.ok && /al menos una frase corta/.test(cero7.error) && !SES3.sesion().ctx.respuestas[preguntaAbierta.id],
  'por WhatsApp, «0» con un texto de 7 caracteres se rechaza (8 o más) y la parada sigue sin responder')
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

  // 1. Costo por falla = lo que cuesta si el equipo falla HOY (decisión del dueño, 8-oct).
  //    Disposición con tanque: Q × promedio(max(0, d − colchón de hoy)) / 24.
  const rMo = fila('morichal', 'P-201B'), prMo = D.prediccion(B.perfilBomba('P-201B', 'morichal'), ctx0), dMo = cerradasDe('morichal', 'P-201B')
  const historicoMo = L.historialDeEquipo('morichal', 'P-201B', ctx0).bblPorFalla
  comprobar(!!rMo && Math.abs(rMo.costoFalla - 1235) < 1 && cerca(rMo.costoFalla, prMo.crudoBpd * media(dMo.map(d => Math.max(0, d - prMo.colchon.horas))) / 24, 1e-12)
    && rMo.colchonH === prMo.colchon.horas && rMo.costoDe === 'propio' && /^el promedio de sus 8 fallas cerradas, sin las 10 h que aguanta hoy el tanque$/.test(rMo.mdtFuente),
    `P-201B de Morichal: si falla hoy cuesta ≈ ${f(rMo?.costoFalla ?? 0)} bbl = ${f(prMo.crudoBpd)} bbl/d × promedio(max(0, d − ${prMo.colchon.horas.toFixed(2)} h)) / 24 de sus ${dMo.length} fallas cerradas (lo histórico es otra cifra: ${f(historicoMo)}); colchonH ${rMo?.colchonH?.toFixed(2)} h`)
  //    Multifásica: Q × d̄ / 24, sin tanque.
  const rMpp = fila('morichal', 'MPP-301'), prMpp = D.prediccion(B.perfilBomba('MPP-301', 'morichal'), ctx0)
  comprobar(!!rMpp && Math.abs(rMpp.costoFalla - 3244.5) < 0.5 && cerca(rMpp.costoFalla, prMpp.crudoBpd * media(cerradasDe('morichal', 'MPP-301')) / 24, 1e-12)
    && rMpp.colchonH === undefined && rMpp.costoDe === 'propio' && rMpp.mdtFuente === 'el promedio de sus 7 fallas cerradas',
    `MPP-301 (multifásica, sin tanque): ≈ ${f(rMpp?.costoFalla ?? 0)} bbl = crudo de hoy × horas fuera promedio / 24, y su texto ya no nombra un tanque que no tiene`)
  //    Electrosumergible: crudo del pozo hoy × d̄ / 24, propio o de la flota del campo; la misma cuenta en todas.
  const espR = rTodos.filter(r => r.tipo === 'electrosumergible' && r.estado === 'en-riesgo')
  const mdtEsp = (c, id) => {
    const propias = cerradasDe(c, id)
    if (propias.length) return { d: media(propias), de: 'propio' }
    const flota = P.pozosDe(c).filter(p => p.levantamiento === 'electrosumergible').flatMap(p => cerradasDe(c, p.id))
    return flota.length ? { d: media(flota), de: 'flota' } : undefined
  }
  comprobar(espR.length >= 4 && espR.every(r => { const m = mdtEsp(r.campoId, r.equipo); return m && cerca(r.costoFalla, r.bblDia * m.d / 24, 1e-12) && r.costoDe === m.de && r.colchonH === undefined }),
    `las ${espR.length} electrosumergibles en riesgo: crudo del pozo hoy × horas fuera promedio / 24 (las suyas o, sin fallas, las de la flota del campo, marcado «flota»)`)
  //    El respaldo absorbe toda el agua (colchón infinito): 0, sin colchón ni historia que citar.
  const cfgInf = structuredClone(ctx0.config)
  cfgInf.respaldos.find(r => r.campoId === 'morichal' && r.equipo === 'P-201B').libreBpd = 1e6
  const rInf = D.riesgoAhora(['morichal'], { config: cfgInf, respuestas: {} }).find(r => r.equipo === 'P-201B' && r.estado === 'en-riesgo')
  comprobar(rInf?.costoFalla === 0 && rInf.colchonH === undefined && rInf.costoDe === undefined && /absorbe toda el agua/.test(rInf.mdtFuente),
    `con un respaldo que toma toda el agua, P-201B de Morichal cuesta 0 bbl si falla («${rInf?.mdtFuente}»)`)
  //    Disposición sin colchón calculado (sin tanque firmado): Q × d̄ / 24, dicho como techo.
  const cfgSinTk = structuredClone(ctx0.config)
  cfgSinTk.tanques = cfgSinTk.tanques.filter(t => t.campoId !== 'morichal')
  const ctxSinTk = { config: cfgSinTk, respuestas: {} }
  const rSinTk = D.riesgoAhora(['morichal'], ctxSinTk).find(r => r.equipo === 'P-201B' && r.estado === 'en-riesgo')
  comprobar(!!rSinTk && cerca(rSinTk.costoFalla, D.prediccion(B.perfilBomba('P-201B', 'morichal'), ctxSinTk).crudoBpd * media(dMo) / 24, 1e-12) && rSinTk.colchonH === undefined && /es un techo/.test(rSinTk.mdtFuente),
    `sin tanque firmado no hay colchón que descontar: P-201B de Morichal ≈ ${f(rSinTk?.costoFalla ?? 0)} bbl, dicho como techo`)
  //    Recobro: no cierra pozos hoy, cuesta 0 dure lo que dure (el demo no la tiene en riesgo: la regla, con su predicción y su historia reales).
  const pGu = B.perfilBomba('P-201B', 'guacamayo'), cRec = D.costoDeBomba(pGu, D.prediccion(pGu, ctx0), L.historialDeEquipo('guacamayo', 'P-201B', ctx0))
  comprobar(pGu.papel === 'recobro' && cerradasDe('guacamayo', 'P-201B').length > 0 && cRec.costoFalla === 0 && cRec.costoDe === undefined && cRec.colchonH === undefined && /recobro/.test(cRec.mdtFuente),
    `la bomba de recobro de Guacamayo, con ${cerradasDe('guacamayo', 'P-201B').length} fallas cerradas, costaría 0 bbl si falla hoy («${cRec.mdtFuente}»)`)
  //    Lo que ya costó por falla sigue siendo otra cifra (la ficha y Confiabilidad: «le ha costado por falla»).
  comprobar(cerca(D.veredicto(B.perfilBomba('P-201B', 'morichal'), ctx0).porFalla, historicoMo) && Math.abs(historicoMo - 2765) < 1 && Math.abs(historicoMo - rMo.costoFalla) > 1,
    `lo que P-201B de Morichal le ha costado por falla (histórico, ${f(historicoMo)} bbl) no cambia: es otra cifra que el costo si falla hoy`)

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
  comprobar(!!rMppB && !('costoFalla' in rMppB && rMppB.costoFalla !== undefined) && rMppB.costoDe === undefined && rMppB.mdtFuente === undefined
    && espGuB.length >= 1 && espGuB.every(r => r.costoFalla === undefined && r.costoDe === undefined),
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
    && sinDuros(CH.colchonCorto({ costoFalla: 1, colchonH: 18.6 })) === '0 si vuelve antes de 18 h'
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
  const pantallas = ['src/pages/Esp.tsx', 'src/pages/Equipo.tsx', 'src/widgets/riesgo/Ahora.tsx', 'src/pages/Riesgo.tsx', 'src/pages/Mantenimiento.tsx', 'src/pages/Turno.tsx', 'src/widgets/equipo/FichaEjecutiva.tsx']
  const siFallaBpd = pantallas.filter(rel => /bbl\/d si fallan?\b|[Ee]n juego si falla|por día si fallan?\b/.test(fuente(rel)))
  comprobar(!siFallaBpd.length, `los bbl/d se rotulan «si para» o «en juego», nunca «si falla(n)» (que es la cifra en bbl de hoy)${siFallaBpd.length ? `: ${siFallaBpd.join(', ')}` : ''}`)
  const ahoraTxt = sinComentarios(fuente('src/widgets/riesgo/Ahora.tsx')), mantTxt = sinComentarios(fuente('src/pages/Mantenimiento.tsx'))
  comprobar(/contarPorIdentificar\(usePreguntas\(/.test(ahoraTxt) && !/\.filter\(p => p\.pide\)/.test(ahoraTxt) && !/ninguna parte va hacia su límite/.test(ahoraTxt) && /deFlota\(r, rol\.nivel\)/.test(mantTxt),
    'Ahora cuenta «por identificar» con contarPorIdentificar y usa la frase del Resumen; Mantenimiento marca «flota» con la misma regla que Riesgo (deFlota)')
  const css = fuente('src/index.css'), porCampo = fuente('src/widgets/resumen/PorCampo.tsx')
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
  const costoHoy = enRiesgo.reduce((a, r) => a + (r.costoFalla ?? 0), 0)
  comprobar(cerca(c.antes.bbl, costoHoy),
    `ANTES es la suma de costoFalla de alto impacto en riesgo (${f(c.antes.bbl)} = ${f(costoHoy)})`)
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
  comprobar(chEsp?.choke === 'pozo' && chEsp.alcance === 'dedicado' && chEsp.servidos === 1 && chB?.choke === 'planta' && chB.alcance === 'compartido'
    && chB.porque === 'P-201B mueve el agua de 18 pozos: si para, se frenan varios' && chB.regla === 'choke.topologia@2' && chB.fuente === 'derivada',
    `una electrosumergible dedicada da «${CH.NOMBRE_CHOKE[chEsp?.choke]}» («${chEsp?.porque}»); P-201B da «${CH.NOMBRE_CHOKE[chB?.choke]}»: «${chB?.porque}»`)
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
  comprobar(MSJ.CAUSAS_POZO.map(x => conMotivo(x)?.choke).join() === 'pozo,pozo,exportacion,pozo' && conMotivo(MSJ.CAUSAS_POZO[2])?.subnivel === 'mercado'
    && ch(decl)?.choke === 'pozo' && !!ch(decl)?.pregunta,
    'declarada: el tramo del motivo que escogió la persona (la nominación del comprador es afuera, subnivel mercado); en texto libre se propone el pozo y se pregunta')
  // Coordinador, punto 3 · Baja tensión en UN pozo del alimentador: «En el pozo» con la pregunta de energía; en varios a la vez, la planta (regla @2).
  const uvPropios = lbH.tramos.filter(t => t.evento.codigo === 'UV' && t.causa.tipo === 'energia' && t.causa.evento === t.evento.id)
  const lc05 = L.libro(['ceiba'], D.rangoDePeriodo('curso').desde, R.AHORA, ctx0).tramos.find(t => t.pozo.id === 'LC-05' && t.evento.codigo === 'UV')
  const enCascada = P.eventosDeCampo('morichal').find(e => e.codigo === 'UV' && CS.causaDeEvento(e, ctx0).evento !== e.id)
  const varios = enCascada && CH.chokeDeCausa({ tipo: 'energia', equipo: 'SE-2', como: 'senal', evento: enCascada.id, evidencia: ['prueba'], texto: 'Baja tensión en el alimentador del pozo' }, 'morichal', ctx0)
  comprobar(uvPropios.length > 0 && uvPropios.every(t => ch(t)?.choke === 'pozo' && ch(t)?.elemento === t.pozo.id && ch(t)?.pregunta === CH.PREGUNTA_ENERGIA)
    && lc05 && ch(lc05)?.choke === 'pozo' && varios?.choke === 'planta' && !varios.pregunta && /a la vez/.test(varios.porque) && CH.REGLA_CHOKE === 'choke.topologia@2',
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
    && CH.casoBordeDe({ alcance: 'compartido', pozos: ['LC-12', 'LC-14'] }, TOPO.locacionDemo('ceiba')) === undefined && /Edinson/.test(CH.EXPLICA_CASO_BORDE),
    'caso de borde: MPP-301 sirve a los 3 pozos del clúster norte (una sola locación) y queda marcado, sin dejar de ir a la planta; sin la locación de los pozos (el resto del demo) no se marca nada')
  // Coordinador, punto 8 · Las propuestas de topología, con evidencia y conflictos.
  const prC = CH.propuestasTopologia('ceiba', ctx0), prM = CH.propuestasTopologia('morichal', ctx0)
  const de = (ps, fuente, id) => ps.find(x => x.fuente === fuente && x.elemento === id)
  comprobar(de(prC, 'alimentador', 'SE-2')?.pozos.length === 18 && de(prC, 'cascadas', 'K-101')?.evidencia.length >= 5 && de(prC, 'cascadas', 'K-101')?.pozos.length === 18
    && /4 pozos/.test(de(prC, 'registro', 'V-101')?.conflicto ?? '') && de(prM, 'bomba', 'MPP-301')?.pozos.join() === 'MN-07,MN-18,MN-33' && !!de(prM, 'cascadas', 'C-401')?.conflicto
    && [...prC, ...prM].every(x => x.evidencia.length > 0 && x.porque.endsWith('?') || x.fuente === 'registro'),
    `propuestas de topología con su evidencia: «${de(prC, 'alimentador', 'SE-2')?.porque}» · «${de(prC, 'cascadas', 'K-101')?.porque}» · conflicto: «${de(prC, 'registro', 'V-101')?.conflicto}»`)
}

console.log('\n=== 23. Qué limita hoy: potenciales, gas sin medir, «casi iguales» y campo de gas (CHOKE-COMPLETO §3–§4, U2 §0 y §11.3) ===')
{
  const CH = await v.ssrLoadModule('/src/entities/choke.ts')
  const ahoraC = R.AHORA.getTime()
  const pots = TODOS.map(c => CH.potencialesDelCampo(c, ahoraC, ctx0))
  const crudos = pots.filter(p => !p.campoDeGas)
  const pc = id => pots.find(p => p.campoId === id)
  // §14.1 · Potencial del sistema = el menor de pozos, planta y afuera.
  comprobar(crudos.length === 4 && crudos.every(p => p.sistema === Math.min(p.pozos, p.planta ?? Infinity, p.exportacion ?? Infinity) && p.holgura[p.dominante] === 0
      && CH.ORDEN_CHOKE_CAMPO.every(k => p.holgura[k] === null || p.holgura[k] >= 0)) && Object.keys(pots[0].holgura).join() === 'pozos,planta,exportacion',
    `lo que limita es el menor de pozos, planta y afuera: ${crudos.map(p => `${p.campoId} ${f(p.sistema)} (${p.dominante})`).join(', ')}`)
  // Coordinador, punto 10 · El potencial de los pozos lleva factor de asignación: la misma cifra de Producción.
  comprobar(pots.every(p => cerca(p.pozos, D.estadoCampo(p.campoId, ctx0).potencialBpd, 1e-9)) && Math.round(pc('guacamayo').pozos) === 6615 && pc('guacamayo').exportacion === 6800
    && pc('guacamayo').dominante === 'pozos',
    `el potencial de los pozos es Σ prueba × factor de asignación, el mismo de Producción; en Guacamayo los pozos (${f(pc('guacamayo').pozos)}) quedan por debajo de afuera (6.800)`)
  // Coordinador, punto 1 · Un tren sin medir no decide lo que limita: el gas sale «sin medir».
  const ce = pc('ceiba'), mo = pc('morichal'), gasCe = ce.trenes.find(x => x.tren === 'gas')
  comprobar(ce.planta === 12000 && ce.trenQueLimita === 'crudo' && Math.round(ce.holgura.planta) === 640 && mo.planta === 18320 && mo.trenQueLimita === 'agua' && Math.round(mo.holgura.planta) === 716
    && gasCe && !gasCe.medido && gasCe.enCrudo === null && gasCe.capacidad === 4200 && gasCe.unidad === 'KPC/d de gas' && /le sobran 640/.test(ce.texto)
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
  comprobar(CH.PARAMETROS_CHOKE.umbralCasiIguales === 0.03 && CH.PARAMETROS_CHOKE.diasParaCambio === 3 && CH.dominanteDe({ pozos: 6615, planta: 7400, exportacion: 6800 }).casiIguales?.join() === 'pozos,exportacion'
    && CH.dominanteDe({ pozos: 11360, planta: 12000, exportacion: 14000 }).casiIguales === null && gu.casiIguales?.join() === 'pozos,exportacion' && gu.umbral === 0.03 && ce.casiIguales === null,
    `«casi iguales» con un umbral fijo y versionado (${CH.PARAMETROS_CHOKE.version}: 3 %, ${CH.PARAMETROS_CHOKE.diasParaCambio} días): Guacamayo, pozos y afuera a ${((gu.exportacion - gu.pozos) / gu.pozos * 100).toFixed(1)} % («${gu.texto}»)`)
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
  comprobar(crudos.every(p => p.textoCorto.startsWith('Qué limita hoy: ')) && ce.textoCorto === 'Qué limita hoy: los pozos (11.360 bbl/d)'
    && /abrir más pozos no da nada/.test(CH.potencialesDelCampo('ceiba', Date.parse('2026-03-15T12:00:00-05:00'), ctx0).texto),
    `lo que dice en palabras: «${ce.textoCorto}» · «${ce.texto}»; en marzo limitaba la planta: «${CH.potencialesDelCampo('ceiba', Date.parse('2026-03-15T12:00:00-05:00'), ctx0).texto}»`)
}

console.log('\n=== 24. Lo que se perdió, por tramo y por escalón, con el total del libro (CHOKE-COMPLETO §6–§8) ===')
{
  const CH = await v.ssrLoadModule('/src/entities/choke.ts')
  const suma = o => Object.values(o).reduce((a, x) => a + x, 0)
  const periodos = [['un mes cerrado', D.rangoDePeriodo('cerrado')], ['el mes en curso', D.rangoDePeriodo('curso')], ['los 13 meses', { desde: new Date(L.calendario()[0].desde), hasta: R.AHORA }]]
  let cuadres = 0
  const malasId = [], malasEsc = [], malasEq = []
  for (const [nombre, r] of periodos) for (const ids of [...TODOS.map(c => [c]), TODOS]) {
    const b = CH.brechaPorChoke(ids, r.desde, r.hasta, ctx0), lb = L.libro(ids, r.desde, r.hasta, ctx0)
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
  const sinP = CH.brechaPorChoke(['ceiba'], sep.desde, sep.hasta, ctx0)
  const conP = CH.brechaPorChoke(['ceiba'], sep.desde, sep.hasta, { ...ctx0, perdidas: [{ campoId: 'ceiba', tipo: 'derrame', bbl: 500, fecha: '2026-09-10T08:00:00-05:00' }] })
  comprobar(CH.CHOKES_Y_SIN_ASIGNAR.every(k => conP.porChoke[k] === sinP.porChoke[k]) && conP.brecha === sinP.brecha && cerca(suma(conP.porChoke), L.libro(['ceiba'], sep.desde, sep.hasta, ctx0).diferido, 1e-9),
    'la pérdida no entra: solo suman los tramos del libro (el motor todavía no tiene pérdidas; esta prueba queda lista para EventoPerdida, P1 §1.9)')
  // Escalones del demo: el exceso de una parada programada sobre su ventana es otro tramo, no planeado.
  const ago = L.libro(['ceiba'], new Date('2026-08-01T00:00:00-05:00'), new Date('2026-09-01T00:00:00-05:00'), ctx0)
  const fin = Date.parse(ctx0.config.programa.find(x => x.id === 'PR-2011-260819').hasta)
  const exceso = ago.tramos.filter(t => t.causa.tipo === 'programada' && t.causa.equipo === 'P-201B' && t.fin.getTime() > fin)
    .map(t => ({ t, p: CH.escalonesDe(t, CH.chokeDeCausa(t.causa, 'ceiba', ctx0), ctx0) }))
  comprobar(exceso.length === 3 && exceso.every(x => x.p.length === 2 && x.p[1][0] === 'disponibilidad-no-planeada' && x.p[1][1] > 0 && cerca(x.p[0][1] + x.p[1][1], x.t.bbl, 1e-12)),
    `el exceso de una parada programada sobre su ventana es no planeado: los ${exceso.length} pozos que siguieron cerrados después del fin del programa de P-201B (09:34 del 20-ago) pasan ${f(exceso.reduce((a, x) => a + x.p[1][1], 0))} bbl a no planeada`)
  const b12 = CH.brechaPorChoke(TODOS, new Date(L.calendario()[0].desde), R.AHORA, ctx0)
  comprobar(b12.porEscalon.capacidad > 0 && b12.porChoke['sin-asignar'] === b12.porChokeEscalon['sin-asignar']['sin-clasificar'] && b12.porEscalon.desarrollo === 0 && b12.porChoke.reservorio === 0
    && b12.porEscalon['disponibilidad-no-planeada'] > b12.porEscalon['disponibilidad-planeada'],
    `la escalera del año: ${CH.ESCALONES.map(e => `${CH.NOMBRE_ESCALON[e].split(':')[0].toLowerCase()} ${f(b12.porEscalon[e])}`).join(', ')} bbl; el yacimiento nunca sale de una señal; lo sin identificar va sin tramo y sin escalón`)
  // La brecha estructural se separa y se dice; un día con el real sobre la capacidad declarada no lleva estructural.
  comprobar(cerca(b12.potencialSistema, b12.potencial - b12.estructural, 1e-12) && cerca(b12.brechaSistema, b12.brecha - b12.estructural, 1e-12) && b12.estructural > 0
    && b12.porCampo.every(x => x.estructural >= 0 && x.estructuralPorChoke.pozos === 0 && cerca(x.potencialSistema, x.potencial - x.estructural, 1e-12)) && /estructural|no deja pasar/.test(b12.textoEstructural ?? ''),
    `si lo que limita no son los pozos, la brecha estructural se separa y se dice: ${f(b12.estructural)} bbl en 13 meses (${b12.porCampo.filter(x => x.estructural > 0).map(x => `${x.campoId} ${f(x.estructural)}`).join(', ')}); ${b12.superado.length} días-campo con el real sobre la capacidad declarada`)
  // §8 · PE = real ÷ potencial del sistema; PE no planeada = disponibilidad no planeada ÷ potencial del sistema.
  const bs = CH.brechaPorChoke(TODOS, sep.desde, sep.hasta, ctx0), ef = CH.eficienciaProduccion(TODOS, sep.desde, sep.hasta, ctx0)
  comprobar(cerca(bs.pe, bs.real / bs.potencialSistema * 100, 1e-12) && cerca(bs.peNoPlaneada, bs.porEscalon['disponibilidad-no-planeada'] / bs.potencialSistema * 100, 1e-12)
    && ef.porCampo.every(x => { const c = bs.porCampo.find(y => y.campoId === x.campoId); return cerca(x.pe, c.real / c.potencialSistema * 100, 1e-12) && cerca(x.peNoPlaneada, c.porEscalon['disponibilidad-no-planeada'] / c.potencialSistema * 100, 1e-12) })
    && cerca(ef.total.pe, bs.pe, 1e-12),
    `PE y PE no planeada por campo y período: septiembre ${bs.pe.toFixed(1)} % y ${bs.peNoPlaneada.toFixed(2)} % (${ef.porCampo.map(x => `${x.campoId} ${x.pe.toFixed(1)} %`).join(', ')})`)
}

console.log('\n=== 25. La tubería del campo, mes a mes y antes → con TRIM (U2 §2, §7.3–§7.4, §11.1) ===')
{
  const CH = await v.ssrLoadModule('/src/entities/choke.ts')
  const oct = D.rangoDePeriodo('curso'), sep = D.rangoDePeriodo('cerrado')
  const tu = CH.tuberiaCampo('ceiba', oct.desde, oct.hasta, ctx0)
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
  comprobar(tu.limita === 'pozos' && cerca(tu.perdiendoAhora.reduce((a, x) => a + x.bpd, 0), perd.reduce((a, r) => a + r.bblDia, 0), 1e-9)
    && cerca(pozosT.potencialBpd - tu.pasaHoyBpd, tu.perdiendoAhora.reduce((a, x) => a + x.bpd, 0), 1e-9) && cerca(tu.pasaHoyBpd, D.caudalesAhora('ceiba').crudo, 1e-12)
    && perd.every(r => CH.tramoDeRiesgo(r, ctx0) === (r.equipo === 'P-201B' ? 'planta' : null)) && enRiesgo.every(r => CH.tramoDeRiesgo(r, ctx0) === (r.tipo === 'electrosumergible' ? 'pozo' : 'planta'))
    && plantaT.disponibleHoy?.valor === 178500 && plantaT.potencialBpd === 12000,
    `lo que limita − lo que pasa hoy = perdiéndose ahora: ${f(pozosT.potencialBpd)} − ${f(tu.pasaHoyBpd)} = ${f(pozosT.potencialBpd - tu.pasaHoyBpd)} bbl/d (P-201B en la planta; LC-21 sin identificar); el tramo de cada riesgo; «${plantaT.disponibleHoy?.texto}»`)
  const tuS = CH.tuberiaCampo('ceiba', sep.desde, sep.hasta, ctx0), tuZ = CH.tuberiaCampo('zarza', oct.desde, oct.hasta, ctx0)
  comprobar(tuS.fraseGerente === 'La Ceiba: 87 % en los pozos (LC-11, LC-04)' && tuZ.campoDeGas && tuZ.limita === null && /campo de gas/.test(tuZ.frase),
    `la frase del gerente sale hecha del motor: «${tuS.fraseGerente}»; octubre: «${tu.fraseGerente}»; La Zarza, estado de campo de gas`)
  // Mes a mes por tramo: el mismo total del libro cada mes.
  const rm = CH.repartoPorMes(TODOS, ctx0), sm = L.serieMensual(TODOS, ctx0)
  comprobar(rm.length === sm.length && rm.every((m, i) => m.mes === sm[i].mes && cerca(Object.values(m.porTramo).reduce((a, x) => a + x, 0), sm[i].libro.diferido, 1e-9) && cerca(m.diferido, sm[i].libro.diferido, 1e-9)),
    `lo perdido por tramo, mes a mes: los ${rm.length} meses suman el diferido de cada mes del libro`)
  // Antes → con TRIM, por tramo: la misma base de la línea base del libro.
  const puesta = new Date(`${C.PUESTA_EN_MARCHA}T00:00:00-05:00`)
  const lbt = CH.lineaBasePorTramo(['ceiba'], puesta, R.AHORA, ctx0), base = L.lineaBase(['ceiba'], puesta, R.AHORA, ctx0)
  const diasB = (base.hasta.getTime() - base.desde.getTime()) / 86_400_000
  const b0 = CH.brechaPorChoke(['ceiba'], base.desde, base.hasta, ctx0)
  comprobar(lbt && lbt.base.desde.getTime() === base.desde.getTime() && lbt.base.hasta.getTime() === base.hasta.getTime()
    && CH.CHOKES_Y_SIN_ASIGNAR.every(k => cerca(lbt.diferido[k].baseDia * diasB, b0.porChoke[k], 1e-9))
    && lbt.noPlaneado.planta.periodoDia < lbt.noPlaneado.planta.baseDia && lbt.noPlaneado.pozo.periodoDia > lbt.noPlaneado.pozo.baseDia,
    `antes → con TRIM, lo no planeado por tramo (${lbt?.base.nombre}): planta ${f(lbt?.noPlaneado.planta.baseDia)} → ${f(lbt?.noPlaneado.planta.periodoDia)} bbl/d, pozos ${f(lbt?.noPlaneado.pozo.baseDia)} → ${f(lbt?.noPlaneado.pozo.periodoDia)}: «${lbt?.texto}»`)
}

console.log('\n=== 26. Qué limitó cada día y el aviso «Cambió lo que limita» (CHOKE-COMPLETO §11, U2 §7) ===')
{
  const CH = await v.ssrLoadModule('/src/entities/choke.ts')
  const d0 = new Date(L.calendario()[0].desde)
  const s = CH.serieChoke(TODOS, d0, R.AHORA, ctx0), b = CH.brechaPorChoke(TODOS, d0, R.AHORA, ctx0), dias = L.porDia(TODOS, d0, R.AHORA, ctx0)
  const sumaK = k => s.dias.reduce((a, d) => a + d.porChoke[k], 0), sumaE = e => s.dias.reduce((a, d) => a + d.porEscalon[e], 0)
  comprobar(CH.CHOKES_Y_SIN_ASIGNAR.every(k => cerca(sumaK(k), b.porChoke[k], 1e-9)) && CH.ESCALONES.every(e => cerca(sumaE(e), b.porEscalon[e], 1e-9)) && s.dias.length === dias.length
    && s.dias.every((d, i) => cerca(Object.values(d.porChoke).reduce((a, x) => a + x, 0), dias[i].diferido, 1e-9))
    && cerca(s.dias.reduce((a, d) => a + d.estructural, 0), b.estructural, 1e-9) && cerca(s.dias.reduce((a, d) => a + d.potencialSistema, 0), b.potencialSistema, 1e-9),
    `serie diaria: cada día, lo perdido por tramo suma el diferido de ese día del libro; los ${s.dias.length} días suman lo del período por tramo y por escalón`)
  // Coordinador, punto 2 · El aviso respeta el umbral y la persistencia: sin ellos, La Ceiba cambiaría 7 veces en 13 meses.
  const persiste = s.cambios.every(c => {
    const i = s.dias.findIndex(d => d.dia.getTime() === c.dia.getTime())
    const siguientes = s.dias.slice(i).filter(d => d.dominante[c.campoId]).slice(0, CH.PARAMETROS_CHOKE.diasParaCambio)
    return siguientes.length === CH.PARAMETROS_CHOKE.diasParaCambio && siguientes.every(d => d.dominante[c.campoId] === c.a && !d.casiIguales[c.campoId]) && c.de !== c.a
  })
  const ceiba = s.cambios.filter(c => c.campoId === 'ceiba')
  comprobar(s.vueltas.ceiba === 7 && s.vueltas.guacamayo === 5 && ceiba.length === 1 && ceiba[0].a === 'pozos' && ceiba[0].de === 'planta' && ceiba[0].dia.toISOString().startsWith('2026-08')
    && Math.round(ceiba[0].valorBpd) === 11265 && persiste && TODOS.every(c => s.cambios.filter(x => x.campoId === c).length <= s.vueltas[c]) && s.cambios.every(c => /revise «Si falla hoy»/.test(c.texto)),
    `«Cambió lo que limita» solo con más del umbral y ${CH.PARAMETROS_CHOKE.diasParaCambio} días seguidos: La Ceiba ${s.vueltas.ceiba} vueltas → ${ceiba.length} aviso («${ceiba[0]?.texto}»); en todo el portafolio ${s.cambios.length} avisos (${TODOS.map(c => `${c} ${s.vueltas[c]}→${s.cambios.filter(x => x.campoId === c).length}`).join(', ')})`)
  const sc = CH.serieChoke(['ceiba'], d0, R.AHORA, ctx0), sup = sc.dias.filter(d => d.superado.ceiba)
  comprobar(sup.every(d => d.estructural === 0 && d.potencialSistema === d.potencial) && sup.length === b.superado.filter(x => x.campoId === 'ceiba').length,
    `un día en que el real pasó la capacidad declarada no lleva brecha estructural y se avisa (La Ceiba: ${sup.length} días, el tren de crudo de 12.000 bbl/d)`)
}

console.log('\n=== 27. La tubería del agua (CHOKE-COMPLETO §9, U2 §5) ===')
{
  const AG = await v.ssrLoadModule('/src/entities/choke-agua.ts')
  const CH = await v.ssrLoadModule('/src/entities/choke.ts')
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
    && a.frases[0] === 'Con las tres bombas, al agua le sobran 43.675 bbl/d.' && a.frases.at(-1) === 'Cerrando primero los más acuatosos se pierden 1.426 bbl/d de crudo; cerrando parejo, 2.236.',
    `cada tramo en agua y en crudo; con el tren completo el agua no limita, es lo más frágil: ${a.texto}`)
  const am = AG.tuberiaAgua('morichal', ctx0, V0), prM = D.prediccion(B.perfilBomba('P-201B', 'morichal'), ctx0)
  const todas = TODOS.map(c => AG.tuberiaAgua(c, ctx0, V0))
  comprobar(am.tramos.find(x => x.tramo === 'tanques').tanques[0].colchon.cuando === 'si-para-ahora' && am.tramos.find(x => x.tramo === 'tanques').tanques[0].colchon.horas === prM.colchon.horas
    && /faltan 40\.400 bbl\/d: el tanque se llena en 10 h/.test(am.texto) && /783 bbl\/d de crudo; cerrando parejo, 1\.222/.test(am.texto)
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
  comprobar(filas.length === 4 && filas.every(({ cr, pr, cf }) => cr && cr.costoFalla === cf.costoFalla && (cf.colchonH === undefined || cr.colchonH === cf.colchonH) && cr.bpd === pr.crudoBpd && cr.tramo === 'planta' && cr.vigilado)
    && riesgo.filter(r => r.estado === 'en-riesgo' && B.perfilBomba(r.equipo, r.campoId)).every(r => todas.find(x => x.campoId === r.campoId && x.equipo === r.equipo)?.costoFalla === r.costoFalla),
    `la criticidad de cada bomba con instrumento es el costo por falla de diferido.ts en el mismo instante: ${filas.map(({ p, cr }) => `${p.equipo} de ${p.campoId} ${f(cr.costoFalla ?? 0)} bbl`).join(', ')}`)
  // Coordinador, punto 7 · Las hermanas sin instrumento, con su capacidad y su papel: suben cuando P-201B está parada.
  const ce = CR.criticidadDelCampo('ceiba', ctx0)
  const a = ce.ranking.find(x => x.equipo === 'P-201A'), cc = ce.ranking.find(x => x.equipo === 'P-201C')
  const esperado = D.ordenDeCierre('ceiba', D.caudalesAhora('ceiba').agua - 89250, R.AHORA.getTime()).crudoBpd
  comprobar(a && cc && cerca(a.bpd, esperado, 1e-12) && Math.round(a.bpd) === 3059 && a.colchonH < 0.05 && !a.vigilado && a.subio && cerca(cc.bpd, a.bpd, 1e-12)
    && /P-201A y P-201C subieron al puesto \d+ porque P-201B está parada/.test(ce.cambioHoy ?? '') && ce.parados.some(x => x.equipo === 'P-201B' && cerca(x.perdiendoBpd, D.prediccion(B.perfilBomba('P-201B', 'ceiba'), ctx0).perdiendo.bblDia, 1e-12)),
    `las hermanas sin instrumento cuentan: si P-201A falla hoy con P-201B parada, ${f(a?.bpd)} bbl/d después de ${Math.round((a?.colchonH ?? 0) * 60)} min de colchón; «${ce.cambioHoy}»; P-201B va en «Perdiéndose ahora», no en la lista`)
  // Servicios con la regla «se cierra lo que esté produciendo», estén o no en alarma; un respaldo en línea cuesta cero.
  const produciendo = P.pozosDe('ceiba').filter(w => P.estadoAhora(w).produce).reduce((s, w) => s + L.crudoAsignado(w), 0)
  const se2 = ce.ranking.find(x => x.equipo === 'SE-2'), h302 = ce.ranking.find(x => x.equipo === 'H-302')
  comprobar(se2 && cerca(se2.bpd, produciendo, 1e-12) && se2.estimacion && se2.tramo === 'planta' && !riesgo.some(r => r.campoId === 'ceiba' && r.equipo === 'SE-2')
    && h302?.bpd === 0 && /respaldo/.test(h302.sinDato ?? '') && ce.ranking.filter(x => x.familia === 'servicio' && x !== h302).every(x => cerca(x.bpd, produciendo, 1e-12)),
    `los servicios, estén o no en alarma: SE-2 ${f(se2?.bpd)} bbl/d aunque no esté en alarma (estimación: lo que esté produciendo); H-302 cero mientras su respaldo en línea esté bien`)
  // Electrosumergible y bombeo mecánico: el crudo de su pozo, sin colchón; el costo de una falla es el de «en riesgo».
  const espR = riesgo.filter(r => r.estado === 'en-riesgo' && r.tipo === 'electrosumergible')
  comprobar(ce.ranking.filter(x => x.familia === 'electrosumergible' || x.familia === 'bombeo-mecanico').every(x => x.bpd === L.crudoAsignado(P.pozoDe('ceiba', x.equipo)) && x.colchonH === undefined && x.tramo === 'pozo' && x.servidos === 1)
    && espR.every(r => todas.find(x => x.campoId === r.campoId && x.equipo === r.equipo)?.costoFalla === r.costoFalla),
    `electrosumergible y bombeo mecánico: el crudo de su pozo, sin colchón, «en el pozo»; el costo de una falla de electrosumergible es el de «en riesgo» (${espR.length} hoy)`)
  // §14.7 · Una falla que la holgura o el respaldo absorbe cuesta 0 bbl/d; la lista va de mayor a menor y deja aparte lo que no se puede medir.
  const gu = CR.criticidadDelCampo('guacamayo', ctx0).ranking.find(x => x.equipo === 'P-201B')
  comprobar(gu && gu.bpd === 0 && gu.costoFalla === 0 && ce.ranking.every((x, i, xs) => i === 0 || (xs[i - 1].bpd ?? -1) >= (x.bpd ?? -1)) && ce.ranking.every(x => x.alcance !== 'tercero')
    && ce.sinCalcular.every(x => !ce.ranking.some(y => y.equipo === x.equipo)) && TODOS.every(c => CR.criticidadDelCampo(c, ctx0).ranking.length > 0),
    `una falla que el respaldo absorbe cuesta 0 bbl/d (P-201B de Guacamayo: «${gu?.porque}»); la lista va de mayor a menor y lo que no se puede medir va aparte (${ce.sinCalcular.map(x => x.equipo).join(', ')})`)
}

await v.close()
console.log(`\n${pruebas - fallos} de ${pruebas} comprobaciones bien.`)
if (fallos) { console.log(`${fallos} FALLARON.`); process.exit(1) }
