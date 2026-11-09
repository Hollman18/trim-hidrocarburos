/* Verificación del evento de planta: el apagón (Fase 4 de
 * docs/experiencia-v3/PROMPT-FACILIDADES-POR-FASES.md; src/entities/evento-planta.ts).
 *
 * Lo que asegura:
 *   1. Un apagón total (el relé de llegada abre y para todo) y uno parcial (se cae el circuito de las
 *      bombas de agua, los pozos siguen) se detectan y se distinguen, con sus relojes: los minutos de
 *      aire y las horas del tanque de agua. El total no llena el tanque; el parcial sí.
 *   2. El silencio del gateway es un evento aunque no llegue nada más; fallas sueltas no lo son.
 *   3. Cada rol recibe lo suyo: gerente, supervisor, operador (con su pregunta) y el de energía, que
 *      es el responsable de energía si el cliente lo tiene y el jefe de mantenimiento si no (D3).
 *   4. Los equipos que paran por un corte de energía no levantan falla propia: en los cortes del
 *      demo, cada pozo de la cascada va con la causa «energía», con el tag del relé en la evidencia,
 *      y la identidad del libro sigue exacta.
 *
 *   node scripts/verificar-planta.mjs
 */
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
process.env.VITE_FUENTE = 'demo'
const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const v = await createServer({ root: RAIZ, configFile: false, resolve: { alias: { '@': `${RAIZ}src` } }, server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'error' })
const INS = await v.ssrLoadModule('/src/entities/insumos.ts')
INS.instalarInsumos((await v.ssrLoadModule('/src/entities/datos/index.ts')).INSUMOS_DEMO)
const EP = await v.ssrLoadModule('/src/entities/evento-planta.ts')
const L = await v.ssrLoadModule('/src/entities/libro.ts')
const P = await v.ssrLoadModule('/src/entities/pozos.ts')
const R = await v.ssrLoadModule('/src/entities/reloj.ts')

let bien = 0, mal = 0
const comprobar = (ok, texto) => { if (ok) { bien++; console.log(`  ✓ ${texto}`) } else { mal++; console.log(`  ✗ ${texto}`) } }
const ctx = L.contextoInicial()
const cfg = ctx.config
const AHORA = R.AHORA.getTime()
const inicio = AHORA - 5 * 60_000
const f0 = x => Math.round(x).toLocaleString('es-CO')

console.log('\n1 · Apagón total y parcial, con sus relojes')
const total = EP.eventoDePlanta(EP.apagonDePrueba('ceiba', 'total', inicio, AHORA), cfg)
const crudoTodo = P.pozosDe('ceiba').filter(p => p.pruebas.length).reduce((a, p) => a + L.crudoAsignado(p, inicio), 0)
comprobar(total?.tipo === 'total' && total.deteccion === 'rele' && total.inicio.getTime() === inicio && total.enMarcha === 0,
  `total: ${total?.tipo}, por ${total?.deteccion}, ${total?.paradas.length} cargas paradas y ${total?.enMarcha} en marcha`)
comprobar(Math.abs((total?.bblDiaEnJuego ?? 0) - crudoTodo) < 1e-6 && crudoTodo > 0, `total: ${f0(total?.bblDiaEnJuego ?? 0)} bbl/d en juego, el crudo de todos los pozos`)
const aireT = total?.relojes.find(r => r.que === 'aire'), tanqueT = total?.relojes.find(r => r.que === 'tanque-agua')
comprobar(aireT?.minutos === 6 && /ficha de K-101/.test(aireT.fuente), `total: «${aireT?.texto}» (los 11 min del recibidor que dice la ficha de K-101, 5 ya corridos)`)
comprobar(tanqueT?.minutos === null && /no sube/.test(tanqueT.texto), `total: «${tanqueT?.texto}»: los pozos también pararon`)

const parcial = EP.eventoDePlanta(EP.apagonDePrueba('ceiba', 'parcial', inicio, AHORA), cfg)
comprobar(parcial?.tipo === 'parcial' && parcial.deteccion === 'firma-cargas' && parcial.circuitos.join() === 'CCM de las bombas de agua' && parcial.paradas.every(c => c.familia === 'bomba-agua'),
  `parcial: ${parcial?.tipo}, por ${parcial?.deteccion} (sin relé), cayó «${parcial?.circuitos.join(', ')}» y paró: ${parcial ? EP.queParo(parcial) : '—'}`)
const tq = cfg.tanques.find(t => t.campoId === 'ceiba')
const entra = P.pozosDe('ceiba').filter(p => p.pruebas.length).reduce((a, p) => a + L.aguaDePrueba(p, AHORA), 0)
const nivel = 89.6
const horas = tq.capacidadBbl * (tq.altoAlto - nivel / 100) / (entra / 24)
const tanqueP = parcial?.relojes.find(r => r.que === 'tanque-agua')
comprobar(tanqueP?.minutos === Math.round(horas * 60) && !parcial.relojes.some(r => r.que === 'aire'),
  `parcial: «${tanqueP?.texto}» = ${f0(tq.capacidadBbl * (tq.altoAlto - nivel / 100))} bbl libres ÷ ${f0(entra)} bbl/d de agua; el aire sigue (el compresor no paró)`)
comprobar(parcial?.bblDiaEnJuego === 0, 'parcial: todavía no se pierde crudo (los pozos siguen)')
const recien = ['total', 'parcial'].map(tipo => EP.eventoDePlanta(EP.apagonDePrueba('ceiba', tipo, AHORA, AHORA), cfg)?.tipo)
comprobar(recien.join() === 'total,parcial', `una prueba recién abierta (foto en el mismo instante) ya se ve: ${recien.join(', ')}`)
const palmar = EP.eventoDePlanta(EP.apagonDePrueba('palmar', 'parcial', inicio, AHORA), cfg)
comprobar(palmar?.tipo === 'parcial' && palmar.deteccion === 'rele' && palmar.rele?.tag === '52-CCM2',
  `El Palmar, con una sola bomba de agua: el parcial lo reporta el relé del CCM (${palmar?.rele?.tag})`)

console.log('\n2 · El silencio del gateway, y lo que no es un apagón')
const base = { campoId: 'ceiba', t: AHORA, cargas: EP.cargasDe('ceiba'), ultimoDato: AHORA }
const callado = EP.eventoDePlanta({ ...base, ultimoDato: AHORA - 3 * 60_000 }, cfg)
comprobar(callado?.deteccion === 'silencio-gateway' && callado.tipo === 'total' && callado.bblDiaEnJuego > 0,
  `3 min sin datos del sitio: evento por ${callado?.deteccion}, tratado como ${callado?.tipo}`)
comprobar(EP.eventoDePlanta({ ...base, ultimoDato: AHORA - 60_000 }, cfg) === null, '1 min sin datos: todavía no')
const dos = base.cargas.map((c, i) => (i < 2 ? { ...c, paroEn: inicio } : c))
comprobar(EP.eventoDePlanta({ ...base, cargas: dos }, cfg) === null, 'dos cargas que paran juntas son fallas sueltas, no un apagón')
const espaciadas = base.cargas.map((c, i) => (i < 3 ? { ...c, paroEn: inicio + i * 5 * 60_000 } : c))
comprobar(EP.eventoDePlanta({ ...base, cargas: espaciadas }, cfg) === null, 'tres que paran con cinco minutos entre una y otra, tampoco')
comprobar(EP.eventoDePlanta(base, cfg) === null, 'todo en marcha y el sitio hablando: nada')

console.log('\n3 · Cada rol lo suyo')
const a = (ev, rol, con = false) => EP.avisoPlanta(ev, rol, con)
comprobar(/^Prueba · Se fue la energía en La Ceiba\.$/.test(a(total, 'ger').titulo) && /bbl\/d en juego\. Mantenimiento ya está avisado\.$/.test(a(total, 'ger').cuerpo),
  `gerente: «${a(total, 'ger').titulo} ${a(total, 'ger').cuerpo}»`)
comprobar(/^Prueba · Apagón \d{2}:\d{2}\.$/.test(a(total, 'sup').titulo) && a(total, 'sup').cuerpo === 'Aire: 6 min. Tanque de agua: no sube, los pozos también pararon. Paró: 18 pozos, 3 bombas de agua y el compresor de aire.',
  `supervisor: «${a(total, 'sup').titulo} ${a(total, 'sup').cuerpo}»`)
comprobar(a(total, 'oper').pregunta?.texto === '¿Ve luz en la subestación 2?' && a(total, 'oper').pregunta.opciones.join() === 'Sí,No',
  `operador: «${a(total, 'oper').pregunta?.texto}» [Sí] [No]`)
comprobar(/^Prueba · Disparo 52-SE2 \d{2}:\d{2}:\d{2}\.$/.test(a(total, 'jefe').titulo), `sin responsable de energía, el jefe: «${a(total, 'jefe').titulo} ${a(total, 'jefe').cuerpo}»`)
comprobar(!!a(total, 'ener', true) && a(total, 'jefe', true) === undefined && /El responsable de energía ya está avisado/.test(a(total, 'ger', true).cuerpo),
  'con responsable de energía (D3): él recibe el disparo, y el gerente lo sabe')
comprobar(EP.rolesAvisados(false).join() === 'sup,oper,ger,jefe' && EP.rolesAvisados(true).join() === 'sup,oper,ger,ener', `a quién se avisa: ${EP.rolesAvisados(false).join(', ')} · con responsable: ${EP.rolesAvisados(true).join(', ')}`)
comprobar(/Todavía no se pierde crudo; el tanque de agua da 1 min antes de que haya que cerrar pozos\./.test(a(parcial, 'ger').cuerpo), `gerente, parcial: «${a(parcial, 'ger').cuerpo}»`)
comprobar(/Apagón parcial/.test(a(parcial, 'sup').titulo) && a(parcial, 'sup').cuerpo === 'Tanque de agua: 1 min. Paró: 3 bombas de agua.', `supervisor, parcial: «${a(parcial, 'sup').titulo} ${a(parcial, 'sup').cuerpo}»`)
comprobar(['prod', 'conf', 'tec', 'reg', 'adm'].every(r => a(total, r) === undefined), 'los demás roles no reciben el aviso del apagón')

console.log('\n4 · Lo que para por un corte no es falla propia, y el libro lo carga a «energía»')
const cortes = P.serviciosDeCampo('morichal').filter(s => s.tipo === 'energia')
let tramos = 0
const malos = []
for (const s of cortes) {
  const ts = L.tramosDeEvento('morichal', s.id, ctx)
  tramos += ts.length
  for (const t of ts) if (t.causa.tipo !== 'energia' || !t.causa.evidencia.some(x => x.includes(s.tag))) malos.push(`${t.pozo.id}@${s.id} (${t.causa.tipo})`)
}
comprobar(cortes.length >= 5 && tramos > 0 && malos.length === 0,
  `${cortes.length} cortes de SE-2 en Morichal: los ${tramos} pozos de sus cascadas van con causa «energía» y el tag del relé (52-SE2) en la evidencia${malos.length ? `; mal: ${malos.slice(0, 4).join(', ')}` : ''}`)
const meses = [...new Set(cortes.map(s => s.inicio.slice(0, 7)))]
const cal = L.calendario()
const descuadre = meses.map(m => cal.find(x => x.mes === m)).filter(Boolean).map(m => { const lb = L.libro(['morichal'], new Date(m.desde), new Date(m.hasta), ctx); return Math.abs(lb.potencial - lb.real - lb.diferido) })
comprobar(descuadre.every(d => d < 1e-6), `en los ${descuadre.length} meses con cortes, potencial − real = Σ diferidos (el mayor descuadre: ${Math.max(...descuadre).toExponential(1)})`)
comprobar(meses.every(m => { const x = cal.find(y => y.mes === m); return L.libro(['morichal'], new Date(x.desde), new Date(x.hasta), ctx).porTipo.some(t => t.tipo === 'energia' && t.bbl > 0) }),
  'y en cada uno, «energía» suma en el libro por tipo')

console.log('\n5 · El aviso de prueba, la respuesta del campo y el viaje por la red')
const RO = await v.ssrLoadModule('/src/entities/roles.ts')
const q = id => { const r = RO.ROLES.find(x => x.id === id); return { rol: { id: r.id, nombre: r.nombre, puede: r.puede }, persona: { nombre: r.persona }, campos: ['ceiba', 'palmar'] } }
const H = '2026-10-02T13:55:00-05:00'
const p1 = EP.aceptarPrueba({ campoId: 'ceiba', tipo: 'total' }, q('adm'), [], H)
comprobar(p1.ok && p1.evento.prueba && p1.evento.por === 'Hermes Leal · Administrador de la implementación', `el administrador abre la prueba (${p1.ok ? p1.evento.id : p1.error})`)
const reg = p1.ok ? [p1.evento] : []
const rechazos = [
  ['sin conector:configurar', EP.aceptarPrueba({ campoId: 'ceiba', tipo: 'total' }, q('sup'), [], H), 403],
  ['un tipo que no existe', EP.aceptarPrueba({ campoId: 'ceiba', tipo: 'medio' }, q('adm'), [], H), 422],
  ['un campo ajeno', EP.aceptarPrueba({ campoId: 'zarza', tipo: 'total' }, q('adm'), [], H), 404],
  ['otra prueba abierta en el campo', EP.aceptarPrueba({ campoId: 'ceiba', tipo: 'parcial' }, q('adm'), reg, H), 409],
  ['responder sin causa:declarar', EP.aceptarRespuestaPlanta(reg[0]?.id, { respuesta: 'No' }, q('ger'), reg, H), 403],
  ['responder «quizá»', EP.aceptarRespuestaPlanta(reg[0]?.id, { respuesta: 'quizá' }, q('oper'), reg, H), 422],
]
for (const [que, r, estado] of rechazos) comprobar(!r.ok && r.estado === estado, `${que}: ${r.ok ? 'se aceptó' : `${r.estado} ${r.codigo}`}`)
const resp = EP.aceptarRespuestaPlanta(reg[0].id, { respuesta: 'No' }, q('oper'), reg, '2026-10-02T13:57:00-05:00')
const vista = resp.ok ? EP.vistaEventosPlanta(['ceiba'], [resp.evento], cfg, AHORA) : []
comprobar(vista.length === 1 && vista[0].respuestas[0]?.respuesta === 'No' && vista[0].respuestas[0].por === 'Jairo Peña' && vista[0].tipo === 'total',
  'el operador responde «No» y la vista del evento lo trae, con quién y cuándo')
const term = EP.aceptarTerminar(reg[0].id, q('adm'), [resp.evento], '2026-10-02T14:00:00-05:00')
comprobar(term.ok && EP.vistaEventosPlanta(['ceiba'], [term.evento], cfg, AHORA).length === 0, 'terminada la prueba, ya no está abierta')
const C = await v.ssrLoadModule('/src/shared/api/contrato.ts')
const K = await v.ssrLoadModule('/src/shared/api/cable.ts')
const vuelta = K.deRespuesta(C.PLANTA_EVENTO.codec, JSON.parse(JSON.stringify(K.aRespuesta(C.PLANTA_EVENTO.codec, vista))))
comprobar(vuelta[0]?.inicio instanceof Date && vuelta[0].inicio.getTime() === vista[0].inicio.getTime() && vuelta[0].relojes.length === vista[0].relojes.length,
  'por la red (GET /vistas/planta/evento), el inicio vuelve como fecha y los relojes enteros')
const libroAntes = L.libro(['ceiba'], new Date(L.calendario().at(-1).desde), R.AHORA, ctx).diferido
comprobar(L.libro(['ceiba'], new Date(L.calendario().at(-1).desde), R.AHORA, ctx).diferido === libroAntes && !('eventosPlanta' in ctx), 'la prueba no toca el libro')

console.log('\n7 · Las familias de energía y aire, con fuente o [SUPUESTO]')
const FP = await v.ssrLoadModule('/src/entities/familias-planta.ts')
const LIM = await v.ssrLoadModule('/src/entities/limites.ts')
const EQ = await v.ssrLoadModule('/src/entities/equipos.ts')
const fams = Object.values(FP.FAMILIAS_PLANTA)
const vars = fams.flatMap(f => f.partes.flatMap(p => p.variables.map(x => ({ f: f.id, ...x }))))
comprobar(fams.map(f => f.id).slice(0, 4).join() === 'generador,transformador,ups,compresor-aire' && fams.every(f => f.partes.length && f.referencia.fuente && f.claseIso),
  `las de energía y aire primero (${fams.length} familias en total) (${fams.map(f => f.nombre).join(' · ')}), cada una con sus partes, su clase de ISO 14224 y su referencia con fuente`)
comprobar(vars.every(x => x.limite && x.fuente), `las ${vars.length} variables traen límite y de dónde sale; ${vars.filter(x => x.fuente.startsWith('[SUPUESTO]')).length} dicen [SUPUESTO]: ninguna se presenta como dato`)
const REG = JSON.parse((await import('node:fs')).readFileSync(new URL('../simulador-api/datos/registro-ingenieria.json', import.meta.url), 'utf8'))
const deClase = id => FP.FAMILIA_DE_CLASE[REG.equipos.find(e => e.id === id)?.clase]
comprobar(deClase('K-101') === 'compresor-aire' && deClase('UPS-SALA') === 'ups', `por su clase del registro de ingeniería: K-101 es ${deClase('K-101')} y UPS-SALA es ${deClase('UPS-SALA')}`)
const ups = EQ.equipoEnCampo('UPS-SALA', 'palmar'), limUps = LIM.limiteDe('palmar', 'EIB-0031')
comprobar(!!ups?.instrumentado && !EQ.equipoEnCampo('UPS-SALA', 'ceiba')?.instrumentado && limUps?.texto === '> 80' && limUps.alarma?.baja === 50 && /^\[SUPUESTO\]/.test(limUps.alarma.fuente),
  `la UPS de El Palmar es un equipo instrumentado (en La Ceiba no está): banda «${limUps?.texto}» y alarma en ${limUps?.alarma?.baja} %, [SUPUESTO] hasta tener su hoja de datos`)

console.log('\n8 · Fase 5: el vigía de planta y las listas por tren')
const VP = await v.ssrLoadModule('/src/entities/vigia-planta.ts')
const DF = await v.ssrLoadModule('/src/entities/diferido.ts')
const ET = await v.ssrLoadModule('/src/entities/equipos-tecnico.ts')
const PT = await v.ssrLoadModule('/src/entities/planta.ts')
const NUEVAS = ['bomba-transferencia', 'tratador', 'torre-enfriamiento', 'separador', 'bomba-diluyente']
const avisos = ['ceiba', 'morichal', 'guacamayo', 'palmar', 'zarza'].flatMap(c => VP.vigiaDePlanta(c))
for (const f of NUEVAS) {
  const a = avisos.find(x => x.familia === f)
  comprobar(!!a && (a.pronostico.tipo === 'cruzado' || a.pronostico.horas <= VP.HORIZONTE_H), `${FP.FAMILIAS_PLANTA[f].nombre}: el vigía avisa · ${a ? VP.fraseVigia(a) : 'ningún aviso'}`)
}
comprobar(!avisos.some(a => ['FI-4014', 'TI-5012', 'VI-6012'].includes(a.tag)), 'las variables planas (caudal de despacho, temperatura del tratador, vibración del ventilador) no avisan: sin tendencia no hay fecha')
const riesgo = DF.riesgoAhora(['morichal'], ctx)
const deVigia = avisos.filter(a => NUEVAS.includes(a.familia))
comprobar(deVigia.every(a => riesgo.some(r => r.equipo === a.equipo && r.estado === 'en-riesgo' && r.tag === a.tag && r.horas === a.pronostico.horas)),
  `los ${deVigia.length} avisos están en el riesgo de Morichal (lo que leen jefe y confiabilidad en «Avisan»), con sus horas`)
const CR = await v.ssrLoadModule('/src/entities/criticidad.ts')
const crit = CR.criticidadDelCampo('morichal', ctx).ranking
const mismo = deVigia.map(a => { const r = riesgo.find(x => x.equipo === a.equipo), f = crit.find(x => x.equipo === a.equipo)
  return { e: a.equipo, ok: f?.bpd === null ? !!r?.sinCifra : f?.grupo === 'techo' ? !!r?.techo && Math.abs(r.bblDia - f.bpd) < 1e-6 : !r?.techo && !r?.sinCifra && r?.bblDia === f?.bpd,
    dice: `${a.equipo}: ${f?.bpd === null ? 'sin dato' : f?.grupo === 'techo' ? `hasta ${Math.round(f.bpd)}` : f?.bpd}` } })
comprobar(mismo.every(x => x.ok), `lo que costaría si para es lo mismo en el aviso y en «Si falla hoy»: ${mismo.map(x => x.dice).join(' · ')}`)
const lista = ET.listaEquipos(['morichal'], ctx)
comprobar(deVigia.every(a => lista.filas.find(f => f.equipo === a.equipo)?.filtros.includes('avisan')), `en la lista de Equipos de Morichal entran en «Avisan»: ${deVigia.map(a => a.equipo).join(', ')}`)
const fichas = deVigia.map(a => ET.nivelEquipo('morichal', a.equipo, ctx))
comprobar(fichas.every((n, i) => n?.vigia?.some(x => x.tag === deVigia[i].tag && /alarma/.test(x.frase))), 'y en la ficha de cada uno, «Lo que avisa el vigía» con la frase y la acción')
comprobar(ET.nivelEquipo('ceiba', 'V-101', ctx)?.vigia === undefined, 'un equipo que no avisa no trae la sección')
// Las listas por tren cuadran con el catálogo: cada equipo del catálogo que el campo tiene en su esquema, una vez, en el tren de su familia.
for (const c of ['ceiba', 'morichal', 'palmar']) {
  const l = ET.listaEquipos([c], ctx)
  const cfg = PT.CAMPO_PLANTA[c]
  const delEsquema = new Set([...cfg.tronco, ...cfg.gas, ...cfg.crudo, ...cfg.agua, ...cfg.servicios].map(e => e.equipo).filter(id => id && EQ.equipoEnCampo(id, c)?.instrumentado))
  const filas = l.filas.filter(f => f.tipo === 'superficie' || f.tipo === 'bomba')
  const repetidos = filas.map(f => f.equipo).filter((x, i, xs) => xs.indexOf(x) !== i)
  const faltan = [...delEsquema].filter(id => !filas.some(f => f.equipo === id))
  const malTren = filas.filter(f => EQ.EQUIPOS[f.equipo]?.familia && f.tren !== FP.FAMILIAS_PLANTA[EQ.EQUIPOS[f.equipo].familia].tren).map(f => f.equipo)
  const suma = Object.values(l.cuentas.tren).reduce((a, x) => a + x, 0)
  comprobar(!repetidos.length && !faltan.length && !malTren.length && suma === l.filas.length,
    `${c}: los ${filas.length} equipos de la planta del esquema, una vez cada uno y en el tren de su familia; las cuentas por tren suman las ${l.filas.length} filas${faltan.length ? ` (faltan ${faltan.join(', ')})` : ''}${malTren.length ? ` (mal tren: ${malTren.join(', ')})` : ''}`)
}
const ct = ET.listaEquipos(['morichal'], ctx).filas.find(f => f.equipo === 'CT-601')
comprobar(ct?.tren === 'agua' && ct.familia === 'torre de enfriamiento de agua', `la torre de enfriamiento va en el tren de agua («${ct?.familia}»)`)

console.log('\n6 · La notificación push (VAPID, sin contenido)')
const { verify, createPublicKey } = await import('node:crypto')
const { mkdtempSync, rmSync } = await import('node:fs')
const { tmpdir } = await import('node:os')
const { join } = await import('node:path')
const tmp = mkdtempSync(join(tmpdir(), 'trim-vapid-'))
process.env.TRIM_VAPID = join(tmp, 'vapid.json')
const PUSH = await import(new URL('../simulador-api/push.mjs', import.meta.url).href)
try {
  const llave = Buffer.from(PUSH.llavePublica(), 'base64url')
  const cab = PUSH.cabeceraVapid('https://fcm.googleapis.com/fcm/send/abc', AHORA)
  const [, jwt] = cab.match(/^vapid t=([^,]+), k=/) ?? []
  const [h, c, f] = (jwt ?? '').split('.')
  const pub = createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: llave.subarray(1, 33).toString('base64url'), y: llave.subarray(33).toString('base64url') }, format: 'jwk' })
  const valida = verify('SHA256', Buffer.from(`${h}.${c}`), { key: pub, dsaEncoding: 'ieee-p1363' }, Buffer.from(f ?? '', 'base64url'))
  const claims = JSON.parse(Buffer.from(c ?? '', 'base64url').toString())
  comprobar(llave.length === 65 && llave[0] === 4 && valida && claims.aud === 'https://fcm.googleapis.com' && claims.exp > AHORA / 1000,
    `la llave pública es un punto P-256 sin comprimir (65 bytes) y la firma ES256 del JWT valida con ella (aud ${claims.aud})`)
  const sub = e => ({ rol: 'sup', campos: ['ceiba'], suscripcion: { endpoint: e, keys: { p256dh: 'x', auth: 'y' } } })
  const ajenos = ['http://fcm.googleapis.com/fcm/send/x', 'https://169.254.169.254/latest', 'https://localhost/x', 'https://fcm.googleapis.com.malo.com/x', 'https://fcm.googleapis.com:8443/x', 'https://intranet.empresa/x']
  comprobar(ajenos.every(e => PUSH.suscribir(sub(e)).estado === 422),
    `solo se aceptan los servicios de push conocidos: ${ajenos.length} direcciones ajenas (http, la red interna, un dominio que imita a Google, otro puerto) se rechazan`)
  comprobar(PUSH.suscribir(sub('https://fcm.googleapis.com/fcm/send/1')).estado === 200
    && PUSH.suscribir({ ...sub('https://updates.push.services.mozilla.com/wpush/v2/2'), rol: 'ger' }).estado === 200 && PUSH.suscribir({ ...sub('https://web.push.apple.com/3'), rol: 'tec' }).estado === 200,
    'se guardan los dispositivos de Google, Mozilla y Apple con su rol')
  const llamados = []
  const falso = async (url, init) => { llamados.push({ url, init }); return { status: url.endsWith('/2') ? 410 : 201 } }
  const r = await PUSH.enviar({ campoId: 'ceiba', eventoId: 'AP-x', avisos: { sup: { titulo: 'Apagón 13:55.', cuerpo: 'Aire: 6 min.' }, ger: { titulo: 'Se fue la energía', cuerpo: '' } } }, falso)
  comprobar(r.cuerpo.enviados === 1 && r.cuerpo.fallidos === 1 && llamados.length === 2 && llamados.every(l => l.init.redirect === 'manual' && l.init.headers['Content-Length'] === '0' && /^vapid t=/.test(l.init.headers.Authorization) && l.init.headers.Urgency === 'high'),
    `al supervisor y al gerente (no al técnico): ${r.cuerpo.enviados} enviado, ${r.cuerpo.fallidos} que el servicio dio por vencido; sin contenido, sin seguir redirecciones, con VAPID y urgencia alta`)
  const a1 = PUSH.aviso('https://fcm.googleapis.com/fcm/send/1')
  comprobar(a1.estado === 200 && a1.cuerpo.titulo === 'Apagón 13:55.' && a1.cuerpo.url === '/#/sup', `el service worker del supervisor pregunta y recibe lo suyo: «${a1.cuerpo.titulo} ${a1.cuerpo.cuerpo}», abre ${a1.cuerpo.url}`)
  const r2 = await PUSH.enviar({ campoId: 'ceiba', eventoId: 'AP-y', avisos: { ger: { titulo: 'x', cuerpo: '' } } }, falso)
  comprobar(r2.cuerpo.sinDispositivo === true, 'el dispositivo vencido (410) se quitó: ya no hay a quién mandarle al gerente')
} finally { rmSync(tmp, { recursive: true, force: true }) }

await v.close()
console.log(`\n${bien} de ${bien + mal} comprobaciones bien.`)
process.exit(mal ? 1 : 0)
