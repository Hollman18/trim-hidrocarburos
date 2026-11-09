/* Verificación del re-arranque guiado y del margen de generación (Fase 6 de
 * docs/experiencia-v3/PROMPT-FACILIDADES-POR-FASES.md; src/entities/arranque.ts).
 *
 * Lo que asegura (la puerta de la fase):
 *   1. El orden de arranque de cada apagón de prueba del demo respeta todos los límites: lo que habilita
 *      primero, el agua antes que los pozos, un arranque por motor (NEMA MG 1), el giro inverso de las
 *      electrosumergibles y los lotes. Cada pozo parado entra una vez y el crudo del orden es el que estaba en juego.
 *   2. El revisor del plan (`incumplimientos`) caza cada límite violado: no es un revisor que siempre dice sí.
 *   3. Con una tabla de generación sintética, cada lote cabe en el escalón de toma de carga (ISO 8528-5),
 *      la carga no pasa la capacidad y los pozos van por más crudo por kW.
 *   4. El margen N-1, calculado a mano: la unidad más cargada, la reserva rápida, lo que falta y qué soltar
 *      primero (la misma mochila del orden de cierre, con cargas enteras).
 *   5. El cronómetro deja registrado cuánto duró cada fase: en orden, una vez, con su hora y quién.
 *
 *   node scripts/verificar-arranque.mjs
 */
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
process.env.VITE_FUENTE = 'demo'
const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const v = await createServer({ root: RAIZ, configFile: false, resolve: { alias: { '@': `${RAIZ}src` } }, server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'error' })
const INS = await v.ssrLoadModule('/src/entities/insumos.ts')
INS.instalarInsumos((await v.ssrLoadModule('/src/entities/datos/index.ts')).INSUMOS_DEMO)
const EP = await v.ssrLoadModule('/src/entities/evento-planta.ts')
const A = await v.ssrLoadModule('/src/entities/arranque.ts')
const L = await v.ssrLoadModule('/src/entities/libro.ts')
const P = await v.ssrLoadModule('/src/entities/pozos.ts')
const R = await v.ssrLoadModule('/src/entities/reloj.ts')

let bien = 0, mal = 0
const comprobar = (ok, texto) => { if (ok) { bien++; console.log(`  ✓ ${texto}`) } else { mal++; console.log(`  ✗ ${texto}`) } }
const cfg = L.contextoInicial().config
const AHORA = R.AHORA.getTime()
const MIN = 60_000
const inicio = AHORA - 5 * MIN
const f0 = x => Math.round(x).toLocaleString('es-CO')
const evento = (campo, tipo, desde = inicio) => EP.eventoDePlanta(EP.apagonDePrueba(campo, tipo, desde, AHORA), cfg)

console.log('\n1 · El orden de cada apagón de prueba respeta todos los límites')
for (const campo of ['ceiba', 'morichal', 'guacamayo', 'palmar', 'zarza']) for (const tipo of ['total', 'parcial']) {
  const ev = evento(campo, tipo)
  if (!ev) { comprobar(false, `${campo} ${tipo}: sin evento`); continue }
  // La energía vuelve en el peor momento para el giro inverso: enseguida.
  const plan = A.planDeArranque(ev, AHORA)
  const malos = A.incumplimientos(plan, ev)
  const pozosParados = ev.paradas.filter(c => c.familia === 'pozo').map(c => c.equipo).sort()
  const enPlan = plan.pasos.filter(x => x.fase === 'pozos').flatMap(x => x.equipos).sort()
  comprobar(!malos.length && enPlan.join() === pozosParados.join() && Math.abs(plan.bblDia - ev.bblDiaEnJuego) < 1e-6,
    `${campo} ${tipo}: ${plan.pasos.length} pasos, ${enPlan.length} pozos (cada uno una vez), ${f0(plan.bblDia)} bbl/d = los que estaban en juego; ${malos.length ? malos.join(' · ') : 'ningún límite violado'}`)
}
const ceiba = evento('ceiba', 'total')
const plan = A.planDeArranque(ceiba, AHORA)
const fases = plan.pasos.map(x => x.fase)
comprobar(fases[0] === 'habilita' && fases.indexOf('agua') < fases.indexOf('pozos') && plan.pasos[0].que.startsWith('Control') && /K-101/.test(plan.pasos[1].que),
  `La Ceiba: control, luego aire (${plan.pasos[1].que}), luego ${fases.filter(f => f === 'agua').length} bombas de agua, una por paso, y después los pozos`)
const esp = P.pozosDe('ceiba').filter(p => p.levantamiento === 'electrosumergible').map(p => p.id)
const lote1 = plan.pasos.find(x => x.fase === 'pozos')
// Las cargas paran escalonadas unos segundos: cuenta la electrosumergible del lote que paró de última.
const ultimoParo = Math.max(...ceiba.paradas.filter(c => lote1.equipos.includes(c.equipo) && esp.includes(c.equipo)).map(c => c.paroEn))
comprobar(lote1.minuto === Math.ceil((ultimoParo + A.ESPERA_GIRO_INVERSO_MIN * MIN - AHORA) / MIN) && lote1.minuto >= A.ESPERA_GIRO_INVERSO_MIN - 5 && lote1.limites.some(l => l.id === 'giro-inverso'),
  `el primer lote espera el giro inverso: pararon hace unos 5 min, arranca a los ${lote1.minuto} min (${A.ESPERA_GIRO_INVERSO_MIN} desde que paró la última) [SUPUESTO]`)
const tarde = A.planDeArranque(ceiba, inicio + 2 * 3_600_000).pasos.find(x => x.fase === 'pozos')
comprobar(tarde.minuto === plan.pasos.filter(x => x.fase !== 'pozos').length * A.ENTRE_PASOS_MIN && !tarde.limites.some(l => l.id === 'giro-inverso'),
  `si la energía vuelve 2 h después, el giro inverso ya paró: el primer lote va a los ${tarde.minuto} min, después de los servicios`)
const crudoPozo = id => L.crudoAsignado(P.pozosDe('ceiba').find(p => p.id === id), ceiba.inicio.getTime())
const seguidos = plan.pasos.filter(x => x.fase === 'pozos').flatMap(x => x.equipos)
comprobar(seguidos.every((e, i) => i === 0 || crudoPozo(seguidos[i - 1]) >= crudoPozo(e)) && plan.pasos.filter(x => x.fase === 'pozos').every(x => x.equipos.length <= A.LOTE_POZOS),
  `los pozos van por más crudo primero (${seguidos.slice(0, 3).join(', ')}…), en lotes de ${A.LOTE_POZOS} como mucho; ${plan.criterio}`)
const noventa = plan.pasos.find(x => x.n === plan.noventa)
comprobar(noventa && noventa.acumBblDia >= 0.9 * plan.bblDia && plan.pasos[plan.noventa - 2].acumBblDia < 0.9 * plan.bblDia,
  `con el paso ${plan.noventa} vuelve el 90 % del crudo (${f0(noventa?.acumBblDia ?? 0)} de ${f0(plan.bblDia)} bbl/d)`)

const parcial = evento('ceiba', 'parcial')
const planP = A.planDeArranque(parcial, AHORA)
comprobar(planP.pasos.every(x => x.fase === 'agua') && planP.pasos.length === parcial.paradas.length && planP.bblDia === 0,
  `parcial: solo las ${planP.pasos.length} bombas de agua que pararon, una a la vez; no hay pozos que arrancar`)
const morichal = A.planDeArranque(evento('morichal', 'total'), AHORA)
const que = morichal.pasos.map(x => `${x.fase}:${x.equipos.join('+')}`)
comprobar(que.indexOf('habilita:P-701') > 0 && que.indexOf('habilita:TE-501') > 0 && que.some(q => q === 'agua:CT-601') && que.at(-1) === 'despacho:P-401',
  `Morichal: diluyente (P-701) y tratador (TE-501) antes de los pozos, la torre con el agua y el despacho (P-401) al final`)
const silencio = EP.eventoDePlanta({ campoId: 'ceiba', t: AHORA, cargas: EP.cargasDe('ceiba'), ultimoDato: inicio }, cfg)
const planS = A.planDeArranque(silencio, AHORA)
comprobar(silencio.deteccion === 'silencio-gateway' && planS.pasos.filter(x => x.fase === 'pozos').flatMap(x => x.equipos).length === plan.pasos.filter(x => x.fase === 'pozos').flatMap(x => x.equipos).length && !A.incumplimientos(planS, silencio).length,
  'sin datos del sitio se planea como un total: los mismos pozos, y respeta los límites')

console.log('\n2 · El revisor caza cada límite violado')
const copia = p => structuredClone(p)
const casos = [
  ['un motor dos veces', p => { p.pasos.at(-1).equipos.push(p.pasos.find(x => x.fase === 'agua').equipos[0]) }, /dos veces/],
  ['pozos antes que el agua', p => { const i = p.pasos.findIndex(x => x.fase === 'agua'); p.pasos[i].fase = 'pozos'; p.pasos[i + 1].fase = 'habilita' }, /va después/],
  ['una electrosumergible con giro inverso', p => { p.pasos.find(x => x.fase === 'pozos').minuto = 1 }, /giro inverso/],
  ['un lote de más', p => { const ls = p.pasos.filter(x => x.fase === 'pozos'); ls[0].equipos.push(...ls[1].equipos.splice(0, 1)) }, /lote del paso/],
  ['dos bombas de agua juntas', p => { const ag = p.pasos.filter(x => x.fase === 'agua'); ag[0].equipos.push(...ag[1].equipos.splice(0)) }, /a la vez/],
  ['el orden al revés', p => { const ls = p.pasos.filter(x => x.fase === 'pozos'); [ls[0].equipos, ls[1].equipos] = [ls[1].equipos, ls[0].equipos] }, /da más crudo/],
  ['lotes pegados', p => { const ls = p.pasos.filter(x => x.fase === 'pozos'); ls[1].minuto = ls[0].minuto + 1 }, /menos de 5 min/],
]
for (const [nombre, dañar, espera] of casos) {
  const p = copia(plan); dañar(p)
  const malos = A.incumplimientos(p, ceiba)
  comprobar(malos.some(m => espera.test(m)), `${nombre}: «${malos.find(m => espera.test(m)) ?? malos[0] ?? 'nada'}»`)
}

console.log('\n3 · Con una tabla de generación (sintética): el escalón ISO 8528-5')
const pozosC = P.pozosDe('ceiba').filter(p => ceiba.paradas.some(c => c.equipo === p.id))
// kW sintéticos: 45 a 95 kW por pozo, sin relación con su crudo (para que el orden por kW se note).
const kwSint = new Map(pozosC.map((p, i) => [p.id, 45 + (i * 37) % 51]))
const sinKw = pozosC[3].id
const tabla = {
  campoId: 'ceiba', fuente: 'Sintética, para la prueba',
  unidades: [{ id: 'G-1', capacidadKw: 1000, cargaKw: 700, escalon: 0.25 }, { id: 'G-2', capacidadKw: 800, cargaKw: 500, escalon: 0.25 }, { id: 'G-3', capacidadKw: 600, cargaKw: 300, escalon: 0.3 }],
  cargas: [...pozosC.filter(p => p.id !== sinKw).map(p => ({ equipo: p.id, kw: kwSint.get(p.id) })), { equipo: 'K-101', kw: 75 }, ...EP.cargasDe('ceiba').filter(c => c.familia === 'bomba-agua').map(c => ({ equipo: c.equipo, kw: 110 }))],
}
const escalonKw = 1000 * 0.25 + 800 * 0.25 + 600 * 0.3
const planT = A.planDeArranque(ceiba, AHORA, tabla)
const lotesT = planT.pasos.filter(x => x.fase === 'pozos')
comprobar(!A.incumplimientos(planT, ceiba, tabla).length && lotesT.every(x => x.kw <= escalonKw) && lotesT.some(x => x.equipos.length > A.LOTE_POZOS),
  `${lotesT.length} lotes, cada uno ≤ ${escalonKw} kW (Σ escalón × capacidad); el lote lo fija el escalón, no el número (${lotesT.map(x => `${x.equipos.length} pozos/${x.kw} kW`).join(', ')})`)
const porKw = id => crudoPozo(id) / kwSint.get(id)
const seguidosT = lotesT.flatMap(x => x.equipos)
comprobar(seguidosT.every((e, i) => i === 0 || porKw(seguidosT[i - 1]) >= porKw(e)) && planT.sinKw.join() === sinKw && !seguidosT.includes(sinKw),
  `por más crudo por kW; ${sinKw} no tiene sus kW en la tabla y queda fuera del orden, dicho`)
const chica = { ...tabla, unidades: [{ id: 'G-1', capacidadKw: 900, cargaKw: 0, escalon: 0.25 }] }
const planC = A.planDeArranque(ceiba, AHORA, chica)
const cargaC = planC.pasos.reduce((a, x) => a + (x.kw ?? 0), 0)
comprobar(planC.sinCaber.length > 0 && cargaC <= 900 && !A.incumplimientos(planC, ceiba, chica).length,
  `con una sola unidad de 900 kW caben ${planC.pasos.filter(x => x.fase === 'pozos').flatMap(x => x.equipos).length} pozos (${f0(cargaC)} kW) y ${planC.sinCaber.length} no caben, dicho`)
const pasado = copia(planT); pasado.pasos.filter(x => x.fase === 'pozos')[0].equipos.push(...lotesT[1].equipos)
comprobar(A.incumplimientos(pasado, ceiba, tabla).some(m => /escalón/.test(m)), 'el revisor caza un lote que pasa el escalón')

console.log('\n4 · El margen N-1, calculado a mano')
const m = A.margenN1(tabla, AHORA)
// G-1 es la más cargada (700 kW). Reserva rápida de las otras: min(800 − 500, 0,25 × 800) + min(600 − 300, 0,3 × 600) = 200 + 180.
// En régimen: 1.500 kW de carga contra 1.400 de capacidad. Falta lo mayor: 700 − 380 = 320 kW.
comprobar(m.cae.id === 'G-1' && m.reservaRapidaKw === 380 && m.capacidadKw === 1400 && m.cargaKw === 1500 && m.faltaKw === 320 && !m.alcanza,
  `cae G-1 (700 kW); reserva rápida 200 + 180 = ${m.reservaRapidaKw} kW; faltan ${m.faltaKw} kW (más que los 100 de régimen)`)
const candidatos = tabla.cargas.filter(c => kwSint.has(c.equipo)).map(c => ({ ...c, crudo: crudoPozo(c.equipo) })).sort((a, b) => a.crudo / a.kw - b.crudo / b.kw)
const aMano = []; let kw = 0
for (const c of candidatos) { if (kw >= 320) break; aMano.push(c); kw += c.kw }
comprobar(m.deslastre.map(d => d.equipo).join() === aMano.map(c => c.equipo).join() && Math.abs(m.crudoBpd - aMano.reduce((a, c) => a + c.crudo, 0)) < 1e-6 && !m.deslastre.some(d => d.equipo === 'K-101' || /^P-/.test(d.equipo)),
  `soltar ${m.deslastre.length} pozos enteros (${kw} kW ≥ 320), primero los de menos crudo por kW: ${f0(m.crudoBpd)} bbl/d; el aire y las bombas de agua son esenciales`)
comprobar(kw - aMano.at(-1).kw < 320, 'sin el último de la lista no alcanza: no suelta de más')
const holgada = A.margenN1({ ...tabla, unidades: [{ id: 'G-1', capacidadKw: 1000, cargaKw: 400, escalon: 0.5 }, { id: 'G-2', capacidadKw: 1000, cargaKw: 300, escalon: 0.5 }] }, AHORA)
comprobar(holgada.alcanza && !holgada.deslastre.length && A.fraseMargen(holgada) === 'Si se cae G-1 (la más cargada, 400 kW), la reserva rápida alcanza: sobran 100 kW.',
  `«${A.fraseMargen(holgada)}»`)
comprobar(/^Si se cae G-1 \(la más cargada, 700 kW\), faltan 320 kW: hay que soltar \d+ cargas: [\d.]+ bbl\/d\./.test(A.fraseMargen(m)), `«${A.fraseMargen(m)}»`)
comprobar(A.margenN1({ ...tabla, unidades: [tabla.unidades[0]] }, AHORA) === undefined, 'con una sola unidad no hay N-1 que calcular')
const vista = A.vistaArranque(ceiba, [], AHORA)
comprobar(vista.margen === null && /tabla de generación/.test(vista.falta), `sin tabla (el demo): «${vista.falta.slice(0, 60)}…»`)

console.log('\n5 · El cronómetro deja registrado cuánto duró cada fase')
const sup = { rol: { id: 'sup', nombre: 'Supervisor', puede: { 'causa:declarar': true } }, persona: { nombre: 'Rubén Díaz' }, campos: ['ceiba'] }
const ger = { rol: { id: 'ger', nombre: 'Gerente', puede: {} }, campos: ['ceiba'] }
const iso = ms => `${new Date(ms - 5 * 3_600_000).toISOString().slice(0, 19)}-05:00`
let regs = [{ id: 'AP-1', campoId: 'ceiba', tipo: 'total', inicio: iso(inicio), por: 'adm', prueba: true, respuestas: [] }]
const marcar = (fase, ms, q = sup) => { const r = A.aceptarFase('AP-1', { fase }, q, regs, iso(ms)); if (r.ok) regs = [r.evento]; return r }
comprobar(marcar('causa', inicio + 12 * MIN, ger).codigo === 'sin-capacidad', 'el gerente no marca fases (403)')
comprobar(marcar('energia', inicio + 12 * MIN).codigo === 'fuera-de-orden', 'no se salta una fase: primero «Causa identificada» (409)')
comprobar(marcar('rara', inicio).codigo === 'fase-invalida', 'una fase que no existe (422)')
const duraciones = [['causa', 12], ['energia', 95], ['primer-pozo', 33], ['noventa', 120], ['normal', 600]]
let t = inicio
for (const [fase, min] of duraciones) { t += min * MIN; comprobar(marcar(fase, t).ok, `marca «${A.NOMBRE_FASE[fase]}» a los ${min} min de la anterior`) }
comprobar(marcar('normal', t + MIN).codigo === 'fuera-de-orden', 'una fase marcada no se vuelve a marcar: solo por inserción')
const crono = A.cronometro(ceiba, regs[0].fases)
comprobar(crono.tramos.slice(1).map(x => x.ms / MIN).join() === duraciones.map(d => d[1]).join() && !crono.siguiente && crono.totalMs === t - inicio && regs[0].fases.every(f => f.por === 'Rubén Díaz'),
  `cada fase con su duración (${crono.tramos.slice(1).map(x => `${x.nombre}: ${A.duracion(x.ms)}`).join('; ')}); total ${A.duracion(crono.totalMs)}, y quién marcó`)
const conEnergia = A.vistaArranque(ceiba, regs[0].fases, AHORA)
comprobar(conEnergia.plan.t0 === crono.energia && crono.energia === inicio + 107 * MIN, 'con la energía marcada, el orden cuenta desde esa hora')
let regsP = [{ id: 'AP-2', campoId: 'ceiba', tipo: 'parcial', inicio: iso(inicio), por: 'adm', prueba: true, respuestas: [] }]
const r1 = A.aceptarFase('AP-2', { fase: 'causa' }, sup, regsP, iso(inicio + MIN)); regsP = [r1.evento]
const r2 = A.aceptarFase('AP-2', { fase: 'primer-pozo' }, sup, regsP, iso(inicio + 2 * MIN))
comprobar(A.fasesDe('parcial').join() === 'causa,energia,normal' && r2.codigo === 'fase-invalida', 'un parcial de las bombas no tiene «primer pozo» ni «90 %»')
comprobar(A.aceptarFase('AP-1', { fase: 'causa' }, sup, [{ ...regs[0], terminado: iso(AHORA) }], iso(AHORA)).codigo === 'evento-desconocido', 'un evento terminado ya no se marca (404)')
comprobar(A.duracion(40_000) === '40 s' && A.duracion(65 * MIN) === '1 h 05 min' && A.duracion(12 * MIN) === '12 min', 'las duraciones se leen: 40 s, 12 min, 1 h 05 min')

console.log(`\n${bien} de ${bien + mal} comprobaciones del re-arranque guiado y del margen de generación.\n`)
await v.close()
process.exit(mal ? 1 : 0)
