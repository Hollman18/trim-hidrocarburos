/* Verificación del panel de indicadores (Fase 7 de docs/experiencia-v3/PROMPT-FACILIDADES-POR-FASES.md;
 * src/entities/indicadores.ts).
 *
 * Lo que asegura (la puerta de la fase):
 *   1. Cada indicador del catálogo tiene su fórmula, su fuente y su ventana, y su prueba contra un caso
 *      calculado a mano: diferido por causa, MTBF, MTTR, horas proactivas, cortes de energía y margen N-1.
 *   2. Con los datos del demo, cada indicador cuadra con su fuente (el libro, el historial, SAP, el relé).
 *   3. Un indicador sin dato dice «sin dato» y por qué: el margen N-1 sin tabla de generación, el MTTR sin
 *      órdenes, los cortes sin el relé conectado, una señal que ya no está.
 *   4. Las señales: cualquier variable conectada con su serie; con límite firmado, la tendencia con esa
 *      escala; sin él, solo la cifra.
 *   5. El panel se guarda entero, solo por quien tiene «Mi panel», con sus campos y sus señales.
 *
 *   node scripts/verificar-indicadores.mjs
 */
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
process.env.VITE_FUENTE = 'demo'
const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const v = await createServer({ root: RAIZ, configFile: false, resolve: { alias: { '@': `${RAIZ}src` } }, server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'error' })
const INS = await v.ssrLoadModule('/src/entities/insumos.ts')
INS.instalarInsumos((await v.ssrLoadModule('/src/entities/datos/index.ts')).INSUMOS_DEMO)
const I = await v.ssrLoadModule('/src/entities/indicadores.ts')
const A = await v.ssrLoadModule('/src/entities/arranque.ts')
const L = await v.ssrLoadModule('/src/entities/libro.ts')
const S = await v.ssrLoadModule('/src/entities/sap.ts')
const P = await v.ssrLoadModule('/src/entities/pozos.ts')
const R = await v.ssrLoadModule('/src/entities/reloj.ts')
const ROLES = (await v.ssrLoadModule('/src/entities/roles.ts')).ROLES

let bien = 0, mal = 0
const comprobar = (ok, texto) => { if (ok) { bien++; console.log(`  ✓ ${texto}`) } else { mal++; console.log(`  ✗ ${texto}`) } }
const ctx = L.contextoInicial()
const AHORA = R.AHORA.getTime()
const cerca = (a, b) => Math.abs(a - b) < 1e-6

console.log('\n1 · El catálogo y su caso calculado a mano')
comprobar(I.CATALOGO.length === 6 && I.CATALOGO.every(i => i.formula.length > 40 && i.fuente.length > 20 && i.ventana && i.pregunta.endsWith('?')),
  `6 indicadores, cada uno con su fórmula, su fuente, su ventana y su pregunta: ${I.CATALOGO.map(i => i.id).join(', ')}`)

// Diferido por causa: 6 causas en dos meses; las 4 que más suman van aparte y las 2 últimas, en «Otras».
const filas = [
  { mes: 'A', causa: 'Energía', bbl: 100 }, { mes: 'A', causa: 'Bomba', bbl: 50 },
  { mes: 'B', causa: 'Bomba', bbl: 30 }, { mes: 'B', causa: 'Electro', bbl: 20 }, { mes: 'B', causa: 'Separación', bbl: 5 },
  { mes: 'B', causa: 'Aire', bbl: 4 }, { mes: 'B', causa: 'Programada', bbl: 1 },
]
const c = I.porCausaYMes(filas, ['A', 'B'])
// Totales: Energía 100, Bomba 80, Electro 20, Separación 5, Aire 4, Programada 1 → Otras = 4 + 1 = 5.
comprobar(c.partes.join() === 'Energía,Bomba,Electro,Separación,Otras' && c.periodos[0].valores.join() === '100,50,0,0,0' && c.periodos[1].valores.join() === '0,30,20,5,5'
  && c.periodos[0].total === 150 && c.periodos[1].total === 60 && c.total === 210,
  'diferido por causa: Energía 100, Bomba 80, Electro 20, Separación 5 aparte; Aire 4 + Programada 1 = 5 en «Otras»; 150 y 60 por mes, 210 en total')
const c5 = I.porCausaYMes(filas.filter(f => f.causa !== 'Programada'), ['A', 'B'])
comprobar(c5.partes.join() === 'Energía,Bomba,Electro,Separación,Aire', 'con 5 causas no hace falta «Otras»: la quinta va con su nombre')

// MTBF: 3 equipos con 365 días cada uno y 3 + 1 + 0 fallas → 1.095 ÷ 4 = 273,75 días.
const m = I.mtbfFlota([{ dias: 365, fallas: 3 }, { dias: 365, fallas: 1 }, { dias: 365, fallas: 0 }])
comprobar(m.dias === 273.75 && m.fallas === 4 && m.equipos === 3, `MTBF: 1.095 días ÷ 4 fallas = ${m.dias} días`)
comprobar(I.mtbfFlota([{ dias: 100, fallas: 1 }]) === undefined, 'MTBF con una sola falla: no hay promedio')

// MTTR: dos PM01 cerradas en la ventana (6 y 10 h) → 8 h. Fuera: una PM01 cerrada antes, una sin cerrar y una PM02.
const iso = s => new Date(s).toISOString()
const desde = Date.parse('2026-01-01T00:00:00-05:00'), hasta = Date.parse('2026-07-01T00:00:00-05:00')
const orden = (clase, estado, cierre, horasReales) => ({ numero: String(Math.random()), clase, campoId: 'x', equipo: 'P-1', prioridad: 2, descripcion: '', estado, creada: iso('2025-12-01T00:00:00-05:00'), ...(cierre ? { cierreTecnico: iso(cierre) } : {}), horasReales, repuestos: [] })
const ordenes = [orden('PM01', 'TECO', '2026-02-10T10:00:00-05:00', 6), orden('PM01', 'TECO', '2026-06-30T23:00:00-05:00', 10), orden('PM01', 'TECO', '2025-12-20T10:00:00-05:00', 20),
  orden('PM01', 'LIB', null, 99), orden('PM02', 'TECO', '2026-03-01T10:00:00-05:00', 4)]
const t = I.mttrActivo(ordenes, desde, hasta)
comprobar(t.horas === 8 && t.ordenes === 2, `MTTR: (6 + 10) ÷ 2 = ${t.horas} h; fuera la cerrada antes (20 h), la abierta (99 h) y la preventiva`)
comprobar(I.mttrActivo(ordenes, hasta, hasta + 1e9) === undefined, 'MTTR sin correctivas cerradas en la ventana: no hay promedio')

// Horas proactivas: PM02 6 h + PM03 4 h contra PM01 10 h → 50 %.
const hs = [orden('PM02', 'TECO', '2026-02-01T10:00:00-05:00', 6), orden('PM03', 'TECO', '2026-03-01T10:00:00-05:00', 4), orden('PM01', 'TECO', '2026-04-01T10:00:00-05:00', 10)]
const h = S.horasPorClase(hs, new Date(desde), new Date(hasta))
comprobar(h.proactivo === 10 && h.correctivo === 10 && h.porcentaje === 50, `horas: (6 + 4) ÷ (6 + 4 + 10) = ${h.porcentaje} %`)
comprobar(S.horasPorClase(hs, new Date(hasta), new Date(hasta + 1e9)).porcentaje === undefined, 'horas sin órdenes en la ventana: sin porcentaje')

// Cortes por mes: agosto y septiembre de 2026, «ahora» el 15 de sept a mediodía.
const tc = Date.parse('2026-09-15T12:00:00-05:00')
const meses = I.mesesHasta(tc, 2)
const ev = (tipo, inicio, fin) => ({ tipo, inicio, fin })
const cortes = I.cortesPorMes([
  ev('energia', '2026-08-03T10:00:00-05:00', '2026-08-03T14:00:00-05:00'), // 4 h, agosto
  ev('energia', '2026-08-31T23:30:00-05:00', '2026-09-01T00:30:00-05:00'), // 1 h, agosto (hora de Bogotá; en UTC ya es 1 de sept)
  ev('energia', '2026-09-01T23:00:00-05:00', '2026-09-02T01:30:00-05:00'), // 2,5 h, septiembre
  ev('energia', '2026-09-10T10:00:00-05:00', null), // sigue caído: 5 d 2 h = 122 h hasta «ahora»
  ev('aire', '2026-09-05T10:00:00-05:00', '2026-09-05T11:00:00-05:00'), // no es energía
], meses, tc)
comprobar(meses.map(x => x.clave).join() === '2026-08,2026-09' && cortes.periodos[0].cortes === 2 && cerca(cortes.periodos[0].horas, 5) && cortes.periodos[1].cortes === 2 && cerca(cortes.periodos[1].horas, 124.5) && cortes.cortes === 4,
  `cortes: agosto 2 (4 + 1 = ${cortes.periodos[0].horas} h, el de las 23:30 del 31 es de agosto en Bogotá), septiembre 2 (2,5 + 122 = ${cortes.periodos[1].horas} h, uno sigue caído); el del aire no cuenta`)

// Margen N-1: el caso de la Fase 6. Cae G-1 (700 kW); reserva rápida 200 + 180 = 380 kW; faltan 320 kW.
const pozosC = P.pozosDe('ceiba').filter(p => p.pruebas.length).slice(0, 8)
const tabla = { campoId: 'ceiba', fuente: 'Sintética', unidades: [{ id: 'G-1', capacidadKw: 1000, cargaKw: 700, escalon: 0.25 }, { id: 'G-2', capacidadKw: 800, cargaKw: 500, escalon: 0.25 }, { id: 'G-3', capacidadKw: 600, cargaKw: 300, escalon: 0.3 }],
  cargas: pozosC.map(p => ({ equipo: p.id, kw: 90 })) }
const mg = A.margenN1(tabla, AHORA)
comprobar(mg.cae.id === 'G-1' && mg.reservaRapidaKw === 380 && mg.faltaKw === 320 && mg.deslastre.length === 4 && mg.deslastre.reduce((a, d) => a + d.kw, 0) === 360,
  `margen N-1: cae G-1; 700 − (200 + 180) = ${mg.faltaKw} kW; con pozos de 90 kW se sueltan 4 (360 kW ≥ 320), los de menos crudo`)

console.log('\n2 · Con los datos del demo, cada indicador cuadra con su fuente')
const dif = I.valorIndicador('diferido-por-causa', 'ceiba', ctx, AHORA)
const ms = I.mesesHasta(AHORA, I.MESES_DIFERIDO)
const delLibro = ms.reduce((a, x) => a + L.libro(['ceiba'], new Date(x.desde), new Date(x.hasta), ctx).diferido, 0)
const enCols = dif.periodos.reduce((a, p) => a + p.total, 0)
comprobar(dif.forma === 'columnas' && dif.periodos.length === 6 && dif.partes.length <= 5 && cerca(enCols, delLibro) && dif.periodos.every(p => cerca(p.total, p.valores.reduce((a, b) => a + b, 0))),
  `diferido por causa, La Ceiba: ${dif.periodos.map(p => `${p.rotulo} ${Math.round(p.total)}`).join(', ')} = ${Math.round(enCols)} bbl, lo mismo que el libro (${Math.round(delLibro)}); partes: ${dif.partes.join(', ')}`)
const mt = I.valorIndicador('mtbf', 'ceiba', ctx, AHORA)
comprobar(mt.forma === 'cifra' && mt.unidad === 'días' && mt.valor > 0, `MTBF de La Ceiba: ${Math.round(mt.valor)} días · ${mt.nota}`)
const sap = S.historiaSap(ctx).ordenes.filter(o => o.campoId === 'ceiba')
const doce = I.mesesHasta(AHORA, 12)[0].desde
const pm01 = sap.filter(o => o.clase === 'PM01' && o.estado === 'TECO' && o.cierreTecnico && Date.parse(o.cierreTecnico) >= doce && Date.parse(o.cierreTecnico) < AHORA)
const tr = I.valorIndicador('mttr', 'ceiba', ctx, AHORA)
comprobar(tr.forma === 'cifra' && pm01.length > 0 && cerca(tr.valor, pm01.reduce((a, o) => a + o.horasReales, 0) / pm01.length), `MTTR de La Ceiba: ${tr.valor.toFixed(1)} h, el promedio de sus ${pm01.length} correctivas cerradas`)
const hp = I.valorIndicador('horas-proactivas', 'ceiba', ctx, AHORA)
comprobar(hp.forma === 'cifra' && hp.unidad === '%' && hp.valor >= 0 && hp.valor <= 100, `horas proactivas de La Ceiba: ${Math.round(hp.valor)} % · ${hp.nota}`)
const co = I.valorIndicador('cortes-energia', 'morichal', ctx, AHORA)
const enVentana = P.serviciosDeCampo('morichal').filter(e => e.tipo === 'energia' && Date.parse(e.inicio) >= doce).length
comprobar(co.forma === 'columnas' && co.periodos.length === 12 && co.periodos.reduce((a, p) => a + p.total, 0) === enVentana && enVentana > 0,
  `cortes de energía en Morichal: ${enVentana} en 12 meses, los del relé 52-SE2 · ${co.nota}`)

console.log('\n3 · Sin dato, dice «sin dato» y por qué')
const mn = I.valorIndicador('margen-n1', 'ceiba', ctx, AHORA)
comprobar(mn.forma === 'sin-dato' && /tabla de generación/.test(mn.motivo), `margen N-1 en el demo: «${mn.motivo.slice(0, 70)}…»`)
const campos = ['ceiba', 'morichal', 'guacamayo', 'palmar', 'zarza']
const sinRele = campos.filter(cp => I.valorIndicador('cortes-energia', cp, ctx, AHORA).forma === 'sin-dato')
const conRele = campos.filter(cp => !sinRele.includes(cp))
comprobar(conRele.every(cp => I.valorIndicador('cortes-energia', cp, ctx, AHORA).forma === 'columnas'),
  `cortes: con el relé conectado, columnas (${conRele.join(', ')}); sin él, «sin dato» y no un cero${sinRele.length ? ` (${sinRele.join(', ')})` : ''}`)
const todos = campos.flatMap(cp => I.CATALOGO.map(i => ({ cp, id: i.id, v: I.valorIndicador(i.id, cp, ctx, AHORA) })))
const sinDato = todos.filter(x => x.v.forma === 'sin-dato')
comprobar(sinDato.every(x => x.v.motivo.length > 15) && todos.every(x => x.v.forma === 'sin-dato' || (x.v.forma === 'cifra' ? Number.isFinite(x.v.valor) : x.v.periodos.length > 0)),
  `los 30 (6 indicadores × 5 campos) dan un valor o «sin dato» con su motivo: ${sinDato.length} sin dato (${[...new Set(sinDato.map(x => x.id))].join(', ')})`)
comprobar(I.valorSenal('ceiba', 'P-201A', 'NO-EXISTE').forma === 'sin-dato', 'una señal que ya no está conectada: «sin dato»')
// Sin la pieza Energía contratada en La Ceiba, sus cortes dicen «sin dato» y nombran la pieza (el panel es del Núcleo).
const sinEnergia = { ...ctx, config: { ...ctx.config, campos: { ...ctx.config.campos, ceiba: { ...ctx.config.campos.ceiba, piezas: ['nucleo', 'equipos', 'barriles'] } } } }
const vp = I.vistaPanel('conf', ['ceiba'], { elementos: [{ id: 'a', tipo: 'indicador', indicador: 'cortes-energia', campoId: 'ceiba' }, { id: 'b', tipo: 'indicador', indicador: 'diferido-por-causa', campoId: 'ceiba' }], actualizado: '', por: '' }, sinEnergia, AHORA)
comprobar(vp.elementos[0].valor.forma === 'sin-dato' && vp.elementos[0].valor.motivo === 'La pieza Energía no está contratada en La Ceiba.' && vp.elementos[1].valor.forma === 'columnas',
  `sin la pieza contratada: «${vp.elementos[0].valor.motivo}»; el diferido (Barriles) sigue`)

console.log('\n4 · Las señales conectadas')
const sen = I.senalesDisponibles(['ceiba'])
comprobar(sen.length >= 10 && sen.every(s => s.campoId === 'ceiba' && s.tag && s.unidad !== undefined), `La Ceiba: ${sen.length} señales con su serie (${sen.slice(0, 4).map(s => s.tag).join(', ')}…)`)
const valores = sen.map(s => ({ s, v: I.valorSenal('ceiba', s.equipo, s.tag) }))
const conTend = valores.filter(x => x.v.forma === 'tendencia'), sinEsc = valores.filter(x => x.v.forma === 'cifra')
comprobar(conTend.length > 0 && conTend.every(x => x.v.senal.escala[1] > x.v.senal.escala[0] && x.v.senal.serie.length > 1 && Date.parse(x.v.hasta) > Date.parse(x.v.desde)),
  `${conTend.length} con límite firmado van como tendencia, con la escala de sus límites`)
comprobar(sinEsc.every(x => /Sin límite firmado/.test(x.v.nota)), `${sinEsc.length} sin límite firmado van solo como cifra, y lo dicen`)

console.log('\n5 · Guardar el panel')
const rol = id => { const r = ROLES.find(x => x.id === id); return { id: r.id, nombre: r.nombre, pantallas: r.pantallas } }
const q = (id, cs) => ({ rol: rol(id), persona: { nombre: 'Prueba' }, campos: cs })
comprobar(['ger', 'prod', 'conf'].every(id => ROLES.find(r => r.id === id).pantallas.includes('panel')) && !ROLES.filter(r => !['ger', 'prod', 'conf'].includes(r.id)).some(r => r.pantallas.includes('panel')),
  '«Mi panel» es del gerente, producción y confiabilidad')
const uno = { id: 'a', tipo: 'indicador', indicador: 'mtbf', campoId: 'ceiba' }
const senal = { id: 'b', tipo: 'senal', campoId: 'ceiba', equipo: sen[0].equipo, tag: sen[0].tag }
const ok = I.aceptarPanel({ elementos: [uno, senal] }, q('conf', ['ceiba', 'morichal']), '2026-10-02T14:00:00-05:00')
comprobar(ok.ok && ok.panel.elementos.length === 2 && ok.panel.por === 'Prueba · Ingeniero de confiabilidad', 'confiabilidad guarda un indicador y una señal')
const casos = [
  ['el supervisor (sin «Mi panel»)', I.aceptarPanel({ elementos: [uno] }, q('sup', ['ceiba']), ''), 403, 'sin-pantalla'],
  ['un campo que no es suyo', I.aceptarPanel({ elementos: [{ ...uno, campoId: 'zarza' }] }, q('conf', ['ceiba']), ''), 404, 'campo-ajeno'],
  ['un indicador fuera del catálogo', I.aceptarPanel({ elementos: [{ ...uno, indicador: 'oee' }] }, q('conf', ['ceiba']), ''), 422, 'panel-invalido'],
  ['una señal que no está conectada', I.aceptarPanel({ elementos: [{ ...senal, tag: 'XX-1' }] }, q('conf', ['ceiba']), ''), 422, 'panel-invalido'],
  ['dos elementos con el mismo id', I.aceptarPanel({ elementos: [uno, { ...senal, id: 'a' }] }, q('conf', ['ceiba']), ''), 422, 'panel-invalido'],
  [`más de ${I.MAX_ELEMENTOS}`, I.aceptarPanel({ elementos: Array.from({ length: 13 }, (_, i) => ({ ...uno, id: `e${i}` })) }, q('conf', ['ceiba']), ''), 422, 'panel-invalido'],
  ['sin lista', I.aceptarPanel({}, q('conf', ['ceiba']), ''), 422, 'panel-invalido'],
]
for (const [nombre, r, estado, codigo] of casos) comprobar(!r.ok && r.estado === estado && r.codigo === codigo, `${nombre}: ${r.estado} ${r.codigo}`)
const ej = I.vistaPanel('ger', campos, undefined, ctx, AHORA)
comprobar(ej.ejemplo && ej.elementos.length === 4 && ej.elementos.every(e => e.indicador), `sin panel guardado, el de ejemplo del gerente: ${ej.elementos.map(e => `${e.titulo} (${e.campo})`).join(', ')}`)
const suyo = I.vistaPanel('conf', ['ceiba'], ok.panel, ctx, AHORA)
comprobar(!suyo.ejemplo && suyo.elementos.length === 2 && suyo.elementos[1].titulo === `${sen[0].nombre} de ${sen[0].equipo}`, `con panel guardado, el suyo: ${suyo.elementos.map(e => e.titulo).join(', ')}`)
comprobar(I.vistaPanel('conf', ['morichal'], ok.panel, ctx, AHORA).elementos.length === 0, 'si le quitan el campo, sus elementos de ese campo no se muestran')

console.log(`\n${bien} de ${bien + mal} comprobaciones del panel de indicadores.\n`)
await v.close()
process.exit(mal ? 1 : 0)
