/* Genera el historial de DEMO de la línea de producción, determinista.
 *
 * Todo sale de equipos (la premisa del producto): pozos con su controlador
 * (variador de la electrosumergible, controlador de bombeo mecánico o válvula
 * de cabeza), pruebas instrumentadas, eventos del PLC de las bombas y de los
 * servicios, nivel de los tanques por transmisor y producción fiscal diaria
 * del computador de flujo. Nada de lo que escribe es un dato manual, salvo las
 * respuestas de operarios a paradas que la señal no pudo identificar.
 *
 * Calibración (fuentes reales):
 * - Bombas de reinyección: Palo Azul (una falla cada 28 a 57 días; 3,7 a 101 h);
 *   qué parte falla: European Sealing Association 2025 (sello 60 %, rodamientos 10 %).
 * - Electrosumergibles: entre fallas 516 a 1.000 días (SPE 2022, SPE 2024); de las
 *   que se ven en el variador, corto a tierra la más común (47 pozos en Libia).
 * - Bombeo mecánico: 0,66 fallas por pozo al año (Texas Tech, 25.000 pozos).
 * - Las mismas paradas de bomba que el historial anterior (misma semilla). */
import { writeFileSync } from 'node:fs'

const fuente = new URL('.', import.meta.url)
const destino = f => new URL(`../src/entities/datos/${f}`, fuente)

/* ───────────────────────── utilidades deterministas ───────────────────────── */
const rng = s => () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296 }
let rnd = rng(2026)
const entre = (a, b) => a + (b - a) * rnd()
const entero = (a, b) => Math.floor(entre(a, b + 1))
const elegir = pesos => { const t = Object.values(pesos).reduce((a, b) => a + b, 0); let r = rnd() * t
  for (const [k, w] of Object.entries(pesos)) { if ((r -= w) <= 0) return k } return Object.keys(pesos)[0] }
const p2 = n => String(n).padStart(2, '0')
const H = 3600e3, D = 86400e3, MIN = 60e3
const ms = (y, m, d = 1, h = 0, mi = 0, s = 0) => Date.UTC(y, m - 1, d, h + 5, mi, s)
const iso = t => { const d = new Date(t - 5 * H)
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}T${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())}-05:00` }
const corto = t => { const d = new Date(t - 5 * H); return `${String(d.getUTCFullYear()).slice(2)}${p2(d.getUTCMonth() + 1)}${p2(d.getUTCDate())}` }
const redondoMin = t => Math.round(t / MIN) * MIN
const INICIO = ms(2025, 10, 1), AHORA = ms(2026, 10, 2, 14)
const lit = v => JSON.stringify(v).replace(/"([a-zA-Z]+)":/g, '$1: ').replace(/"/g, "'").replace(/,(?=[a-zA-Z]+: )/g, ', ')

/* ─────────────────────────────────── pozos ─────────────────────────────────── */
const CAMPOS = {
  ceiba: { potencial: 11800, agua: Math.round(19180 * 11800 / 10450), sep: 'SP-CE1', alimentador: 'SE-2',
    ids: ['LC-01', 'LC-02', 'LC-03', 'LC-04', 'LC-05', 'LC-06', 'LC-07', 'LC-08', 'LC-09', 'LC-10', 'LC-11', 'LC-12', 'LC-14', 'LC-15', 'LC-16', 'LC-17', 'LC-19', 'LC-21'],
    fijos: { 'LC-14': 820, 'LC-09': 640, 'LC-21': 310 }, mecanico: ['LC-03', 'LC-19', 'LC-21'], estimados: ['LC-17'] },
  morichal: { potencial: 17950, agua: Math.round(36400 * 17950 / 14800), sep: 'SP-MN1', alimentador: 'SE-2',
    ids: Array.from({ length: 41 }, (_, i) => `MN-${p2(i + 1)}`),
    fijos: { 'MN-07': 620, 'MN-18': 540, 'MN-33': 480, 'MN-41': 700 }, estimados: ['MN-11', 'MN-29'] },
  guacamayo: { potencial: 6800, agua: Math.round(7600 * 6800 / 6200), sep: 'SP-GU1', alimentador: 'SE-2',
    ids: Array.from({ length: 12 }, (_, i) => `GU-${p2(i + 1)}`), fijos: { 'GU-03': 740, 'GU-07': 610 }, estimados: ['GU-09'] },
  palmar: { potencial: 3295, agua: Math.round(2400 * 3295 / 3100), sep: 'SP-PA1', alimentador: 'SE-2',
    ids: Array.from({ length: 7 }, (_, i) => `PA-${p2(i + 1)}`), fijos: { 'PA-01': 520, 'PA-02': 480 }, todosMecanico: true },
  zarza: { potencial: 3372, agua: Math.round(1100 * 3372 / 2900), sep: 'SP-ZA1', alimentador: 'SE-2',
    ids: Array.from({ length: 9 }, (_, i) => `ZA-${p2(i + 1)}`), fijos: { 'ZA-02': 460, 'ZA-05': 390 }, todosNatural: true, sinPrueba: ['ZA-09'],
    // Pozo marginal que nunca se probó: su crudo llega al punto de medición
    // pero nadie lo asigna, y empuja el factor del campo hacia arriba.
    ocultos: { 'ZA-09': 40 } },
}
const FECHAS_PRUEBA = [ms(2025, 10, 6), ms(2026, 1, 8), ms(2026, 4, 9), ms(2026, 7, 9)]

const POZOS = []
const OCULTO = {} // caudal real de los pozos sin prueba: entra en lo fiscal, no en lo asignado
for (const [campoId, c] of Object.entries(CAMPOS)) {
  const libres = c.ids.filter(id => !(id in c.fijos))
  const resto = c.potencial - Object.values(c.fijos).reduce((a, b) => a + b, 0)
  const pesos = libres.map(() => entre(0.5, 1.5))
  const sp = pesos.reduce((a, b) => a + b, 0)
  const crudo = Object.fromEntries([...Object.entries(c.fijos), ...libres.map((id, i) => [id, Math.round(resto * pesos[i] / sp)])])
  Object.assign(crudo, c.ocultos ?? {})
  const wor = c.agua / c.potencial
  const r = Object.fromEntries(c.ids.map(id => [id, wor * entre(0.4, 1.8)]))
  const aguaBruta = c.ids.reduce((a, id) => a + crudo[id] * r[id], 0)
  c.ids.forEach((id, n) => {
    const lev = c.todosMecanico || c.mecanico?.includes(id) ? 'bombeo-mecanico' : c.todosNatural ? 'flujo-natural' : 'electrosumergible'
    const ctl = lev === 'electrosumergible' ? `VSD-${id.replace('-', '')}` : lev === 'bombeo-mecanico' ? `POC-${id.replace('-', '')}` : `XV-${id.replace('-', '')}`
    const agua = Math.round(crudo[id] * r[id] * c.agua / aguaBruta)
    const hz = lev === 'electrosumergible' ? Math.round(entre(52, 60) * 2) / 2 : undefined
    const sinPrueba = c.sinPrueba?.includes(id)
    const estimado = c.estimados?.includes(id)
    const ultima = ms(2026, 8, 25) + Math.floor(rnd() * 34) * D + entero(7, 16) * H
    const pruebas = sinPrueba ? [] : [...FECHAS_PRUEBA.map(f => f + entero(0, 4) * D + entero(7, 16) * H), ultima].map((f, k) => {
      const caida = 1 + 0.012 * (4 - k)
      return {
        fecha: iso(f),
        crudoBpd: Math.round(crudo[id] * caida * entre(0.985, 1.015)),
        aguaBpd: Math.round(agua * (1 - 0.01 * (4 - k)) * entre(0.985, 1.015)),
        ...(hz ? { hz } : {}),
      }
    })
    if (sinPrueba) OCULTO[id] = crudo[id]
    const origen = sinPrueba ? undefined : estimado ? 'estimado' : 'instrumento'
    const fuentePrueba = sinPrueba ? undefined : estimado
      ? `Estimación desde la electrosumergible ${ctl}: curva de la bomba, frecuencia y presión de entrada`
      : `Separador de prueba automatizado ${c.sep} · FT-${c.sep.slice(3)}${p2(n + 1)}1 crudo · FT-${c.sep.slice(3)}${p2(n + 1)}2 agua · AT-${c.sep.slice(3)}${p2(n + 1)}3 corte de agua`
    POZOS.push({ id, campoId, levantamiento: lev, controlador: ctl, alimentador: c.alimentador,
      ...(origen ? { origen, fuentePrueba } : {}), pruebas })
  })
}
const pozosDe = c => POZOS.filter(p => p.campoId === c)
const pruebaEn = (p, t) => { let u; for (const x of p.pruebas) if (new Date(x.fecha).getTime() <= t) u = x; return u ?? p.pruebas[0] }
const crudoEn = (p, t) => pruebaEn(p, t)?.crudoBpd ?? OCULTO[p.id] ?? 0
const aguaEn = (p, t) => pruebaEn(p, t)?.aguaBpd ?? 0

/* ───────────────────────────── eventos de pozo ───────────────────────────── */
const EVENTOS = [] // { id, campoId, pozo, inicio, fin, codigo, senal, hz?, respuesta? }
const ocupado = {} // pozo → [[a, b]]
const libre = (pozo, a, b) => !(ocupado[pozo] ?? []).some(([x, y]) => a < y && b > x)
let nEv = 0
function evento(campoId, pozo, a, b, codigo, extra = {}) {
  a = redondoMin(a); b = b === null ? null : redondoMin(b)
  const fin = b ?? AHORA + 365 * D
  if (a >= AHORA || !libre(`${campoId}/${pozo}`, a, fin)) return false
  ;(ocupado[`${campoId}/${pozo}`] ??= []).push([a, fin])
  const p = POZOS.find(x => x.id === pozo && x.campoId === campoId)
  const fin2 = b !== null && b > AHORA ? null : b
  EVENTOS.push({ id: `EP-${pozo.replace('-', '')}-${corto(a)}-${p2(++nEv % 100)}`, campoId, pozo, inicio: iso(a), fin: fin2 === null ? null : iso(fin2),
    codigo, senal: `${p.controlador} · ${codigo === 'HZ' ? `frecuencia a ${extra.hz} Hz` : `código ${codigo}`}`, ...extra })
  return true
}

/* ─────────────── paradas de bombas: las MISMAS del historial anterior ─────────────── */
function paradasDeBombas() {
  const r7 = rng(7); const e7 = (a, b) => a + (b - a) * r7()
  const el7 = pesos => { const t = Object.values(pesos).reduce((a, b) => a + b, 0); let x = r7() * t
    for (const [k, w] of Object.entries(pesos)) { if ((x -= w) <= 0) return k } return Object.keys(pesos)[0] }
  const INY = { sello: 0.55, succion: 0.18, rodamientos: 0.12, motor: 0.08, hidraulica: 0.07 }
  const MPP = { sello: 0.45, tornillos: 0.20, filtro: 0.15, rodamientos: 0.10, motor: 0.06, lubricacion: 0.04 }
  const DUR = { sello: [18, 80], succion: [2, 10], rodamientos: [24, 96], motor: [10, 60], hidraulica: [30, 90],
    tornillos: [40, 120], filtro: [2, 8], lubricacion: [6, 30], externa: [3, 40], pm: [8, 14] }
  const ALARMA = { // primera alarma que congela el PLC (first-out), por parte
    sello: [['LSH-2013', 'fuga de sello detectada']],
    succion: [['PSL-2010', 'presión de succión baja'], ['PDSH-2010', 'filtro de succión con caída de presión alta']],
    rodamientos: [['TSH-2011', 'temperatura alta en la cámara de empuje'], ['VSH-2011', 'vibración alta en la caja de rodamientos']],
    motor: [['TSH-2014', 'temperatura alta de devanado'], ['ISH-2011', 'sobrecorriente del motor']],
    hidraulica: [], tornillos: [], // no disparan: bajan el caudal; los dice la firma
    filtro: [['PDSH-3011', 'filtro de entrada con caída de presión alta']],
    lubricacion: [['TSH-3018', 'temperatura alta del aceite de lubricación']],
  }
  // La multifásica dispara con los interruptores de SU lazo (30xx): el sello
  // avisa por el nivel del depósito de barrera (API 682). Mismo número de
  // opciones por parte que la centrífuga, para no mover los sorteos.
  const ALARMA_MPP = { ...ALARMA,
    sello: [['LSL-3017', 'nivel bajo del depósito de barrera del sello']],
    rodamientos: [['TSH-3013', 'temperatura alta de rodamiento'], ['VSH-3013', 'vibración alta en la caja de rodamientos']],
    motor: [['TSH-3014', 'temperatura alta de devanado'], ['ISH-3016', 'sobrecorriente del motor']],
  }
  const BOMBAS = [
    { campo: 'ceiba', equipo: 'P-201B', pref: '2011', zs: 'ZS-2011', lt: 'LT-2012', tanque: 10000, desde: ms(2025, 10, 3), hasta: ms(2026, 8, 25),
      n: 6, libre: [1500, 6000], partes: INY, externa: { atribuirA: 'K-101', tag: 'PAL-1011', texto: 'presión baja del aire de instrumentos' } },
    { campo: 'morichal', equipo: 'P-201B', pref: 'M2011', zs: 'ZS-2011', lt: 'LT-2012', tanque: 18000, desde: ms(2025, 10, 5), hasta: ms(2026, 9, 26),
      n: 8, libre: [2000, 12000], partes: INY, externa: { atribuirA: 'SE-2', tag: '52-SE2', texto: 'interruptor del pórtico 13,8 kV abierto' } },
    { campo: 'morichal', equipo: 'MPP-301', pref: '3016', zs: 'ZS-3016', desde: ms(2025, 10, 8), hasta: ms(2026, 9, 26),
      n: 7, partes: MPP, externa: { atribuirA: 'SE-2', tag: '52-SE2', texto: 'interruptor del pórtico 13,8 kV abierto' } },
    { campo: 'guacamayo', equipo: 'P-201B', pref: 'G2011', zs: 'ZS-2011', lt: 'LT-2012', tanque: 8000, desde: ms(2025, 10, 10), hasta: ms(2026, 9, 24),
      n: 5, libre: [1000, 5000], partes: INY },
  ]
  let PARADAS = []; const PROGRAMA = []
  for (const b of BOMBAS) {
    const tipos = [...Array(b.n).fill('falla'), ...(b.externa ? ['externa'] : []), 'pm']
    const inicios = []
    for (const _ of tipos) {
      let t, k = 0
      do { t = b.desde + r7() * (b.hasta - b.desde); k++ } while (inicios.some(x => Math.abs(x - t) < 12 * D) && k < 200)
      inicios.push(t)
    }
    inicios.sort((a, c) => a - c)
    const orden = tipos.map(t => [t, r7()]).sort((a, c) => a[1] - c[1]).map(x => x[0])
    orden.forEach((tipo, i) => {
      const ini = Math.round(inicios[i] / 1000) * 1000
      let parte, dur, perdida = 1, alarma, planeada = false
      if (tipo === 'pm') { dur = e7(...DUR.pm); planeada = true }
      else if (tipo === 'externa') { dur = e7(...DUR.externa); alarma = { tag: b.externa.tag, texto: b.externa.texto } }
      else {
        parte = el7(b.partes); dur = e7(...DUR[parte])
        // Mismo orden de sorteos que el historial anterior: allí este número
        // elegía el modo de falla; aquí elige la primera alarma de esa parte.
        const sorteo = r7()
        const op = (b.partes === MPP ? ALARMA_MPP : ALARMA)[parte]
        if (op.length) { const x = op[Math.floor(sorteo * op.length)]; alarma = { tag: x[0], texto: x[1] } }
        if (parte === 'hidraulica' || parte === 'tornillos') perdida = Math.round(e7(0.35, 0.6) * 100) / 100
      }
      const fin = ini + Math.round(dur * 3600) * 1000
      const libreBbl = b.libre ? Math.round(e7(...b.libre) / 50) * 50 : undefined
      const ev = { id: `EV-${b.pref}-${corto(ini)}`, campoId: b.campo, equipo: b.equipo, inicio: ini, fin, perdida, zs: b.zs, parte, alarma, planeada, externa: tipo === 'externa' ? b.externa : undefined, libreBbl, lt: b.lt, tanque: b.tanque }
      PARADAS.push(ev)
      if (planeada) PROGRAMA.push({ id: `PR-${b.pref}-${corto(ini)}`, campoId: b.campo, equipo: b.equipo, desde: iso(ini - 30 * MIN), hasta: iso(fin + 2 * H), motivo: 'Mantenimiento preventivo programado de la bomba' })
    })
  }
  // La última falla de Morichal P-201B quedó sin primera alarma: el PLC no la congeló.
  const ultimaM = PARADAS.filter(e => e.campoId === 'morichal' && e.equipo === 'P-201B' && !e.planeada && !e.externa).at(-1)
  if (ultimaM) { ultimaM.alarma = undefined; ultimaM.parte = undefined; ultimaM.sinFirma = true }
  // Las tres paradas originales de La Ceiba (septiembre y la abierta de hoy), sin tocar sus horas.
  PARADAS = PARADAS.filter(e => !(e.campoId === 'ceiba' && e.inicio >= ms(2026, 9, 1)))
  PARADAS.push(
    { id: 'EV-2011-0909', campoId: 'ceiba', equipo: 'P-201B', inicio: ms(2026, 9, 9, 21, 14), fin: ms(2026, 9, 11, 7, 59, 36), perdida: 1, zs: 'ZS-2011', parte: 'sello', alarma: { tag: 'LSH-2013', texto: 'fuga de sello detectada' }, libreBbl: 3800, lt: 'LT-2012', tanque: 10000 },
    { id: 'EV-2011-0922', campoId: 'ceiba', equipo: 'P-201B', inicio: ms(2026, 9, 22, 10, 5), fin: ms(2026, 9, 23, 2, 4, 28), perdida: 1, zs: 'ZS-2011', parte: 'rodamientos', alarma: { tag: 'TSH-2011', texto: 'temperatura alta en la cámara de empuje' }, libreBbl: 2950, lt: 'LT-2012', tanque: 10000 },
    { id: 'EV-2011-1002', campoId: 'ceiba', equipo: 'P-201B', inicio: ms(2026, 10, 2, 3, 52, 18), fin: null, perdida: 1, zs: 'ZS-2011', libreBbl: 3400, lt: 'LT-2012', tanque: 10000 },
  )
  PARADAS.sort((a, c) => a.inicio - c.inicio)
  return { PARADAS, PROGRAMA }
}
const { PARADAS, PROGRAMA } = paradasDeBombas()
const SERVICIOS = [] // aire, energía, compresión, evacuación, separación, tratamiento

/* ─────────── paradas que la señal no explica: se le pregunta al operario ─────────── */
const PREGUNTAS = [
  // [campo, pozo, inicio, fin|null, respuesta|null]
  ['ceiba', 'LC-21', ms(2026, 10, 1, 18, 20), null, null],
  ['ceiba', 'LC-08', ms(2026, 10, 1, 22, 15), ms(2026, 10, 2, 1, 10), null],
  ['morichal', 'MN-22', ms(2026, 9, 30, 16, 20), ms(2026, 10, 1, 6, 5), { texto: 'Fuga en la línea de flujo del pozo: se cerró para repararla', por: 'Jairo Peña · operador de campo', hora: iso(ms(2026, 9, 30, 17, 2)) }],
  ['ceiba', 'LC-06', ms(2026, 8, 14, 3, 30), ms(2026, 8, 14, 11, 45), { texto: 'Cabeza de pozo con fuga en el prensaestopas: cierre para cambiarlo', por: 'Nelson Ortiz · supervisor', hora: iso(ms(2026, 8, 14, 4, 10)) }],
  ['palmar', 'PA-04', ms(2026, 6, 21, 13, 0), ms(2026, 6, 22, 8, 0), { texto: 'Varilla pulida rayada: cierre para cambiarla', por: 'Óscar Daza · técnico', hora: iso(ms(2026, 6, 22, 9, 30)) }],
]
for (const [campo, pozo, a, b, resp] of PREGUNTAS) {
  const ok = evento(campo, pozo, a, b, 'CMD', resp ? { respuesta: resp } : {})
  if (!ok) throw new Error(`no se pudo plantar la pregunta de ${pozo}`)
}
// La electrosumergible de MN-41 en Morichal está caída desde el 3 de septiembre, esperando taladro.
evento('morichal', 'MN-41', ms(2026, 9, 3, 6, 40), null, 'GF')

/* ─────── lo que hacen los pozos cuando para una bomba de la línea ─────── */
const todosParan = codigo => sv => pozosDe(sv.campoId).forEach(p =>
  evento(sv.campoId, p.id, sv.inicio + (codigo === 'UV' ? entero(0, 4) * 1000 : entero(2, 12) * MIN), sv.fin + entero(10, 80) * MIN, codigo))

const ALTO_ALTO = 0.9
for (const ev of PARADAS) {
  const fin = ev.fin ?? AHORA + 30 * D
  const pozos = pozosDe(ev.campoId)
  // Una parada por servicio (aire, pórtico): es el servicio el que apaga los pozos.
  if (ev.externa) {
    // El servicio cae primero; la bomba y los pozos paran con él.
    const sv = { id: `SV-${ev.externa.atribuirA}-${corto(ev.inicio)}`, campoId: ev.campoId, equipo: ev.externa.atribuirA,
      tipo: ev.externa.atribuirA === 'K-101' ? 'aire' : 'energia', inicio: ev.inicio - 2 * MIN, fin: fin - 20 * MIN, tag: ev.externa.tag, texto: ev.externa.texto }
    SERVICIOS.push(sv)
    todosParan(sv.tipo === 'energia' ? 'UV' : 'PSH')(sv)
    continue
  }
  if (ev.planeada) {
    // Mantenimiento programado: en disposición sin respaldo se programa con el tanque vacío,
    // y si no alcanza, se cierra lo necesario (programado también).
  }
  if (ev.equipo === 'MPP-301') {
    for (const id of ['MN-07', 'MN-18', 'MN-33'])
      evento(ev.campoId, id, ev.inicio + entero(1, 5) * MIN, ev.fin === null ? null : ev.fin + entero(10, 50) * MIN, 'PSH')
    continue
  }
  if (ev.campoId === 'guacamayo') continue // recobro: el agua tiene otra salida
  const nivel = Math.round(((ALTO_ALTO * ev.tanque - ev.libreBbl) / ev.tanque) * 1000) / 10
  ev.nivel = nivel
  // El agua que se queda sin salida es la que la bomba movía (mediana de su
  // FI-2011 mientras trabaja: lo mismo que lee el producto) menos lo que el
  // respaldo absorbe. Ceiba no tiene respaldo; Morichal tiene P-201A con
  // 15.100 bbl/d libres.
  const sinSalida = (ev.campoId === 'ceiba' ? 19190 : 21495 - 15100) * ev.perdida
  const bufferH = ev.libreBbl / (sinSalida / 24)
  // Sin respaldo, toda el agua del campo se queda sin salida: se cierra todo
  // (en la base de las pruebas). Con respaldo, solo lo que P-201A no absorbe.
  const exceso = ev.campoId === 'ceiba' ? pozos.reduce((a, p) => a + aguaEn(p, ev.inicio), 0) * ev.perdida : sinSalida
  const desde = ev.inicio + bufferH * H
  if (desde >= fin) continue // el tanque lo absorbió
  // Los operarios cierran en su propio orden hasta quitar el agua que sobra.
  const orden = pozos.map(p => [p, rnd()]).sort((a, c) => a[1] - c[1]).map(x => x[0])
  let quitada = 0, k = 0
  for (const p of orden) {
    if (quitada >= exceso - 1) break
    const a = desde + k * entre(1, 4) * MIN
    const reabre = ev.fin === null ? null : ev.fin + entero(10, 75) * MIN
    const w = aguaEn(p, a)
    const falta = exceso - quitada
    if (ev.perdida < 1 && p.levantamiento === 'electrosumergible' && w > falta * 0.4) {
      // Falla parcial: en vez de cerrar, se le baja la frecuencia (el agua baja con la frecuencia).
      const pr = pruebaEn(p, a)
      const hz = Math.max(40, Math.round(pr.hz * Math.max(0.6, 1 - falta / w) * 2) / 2)
      if (evento(ev.campoId, p.id, a, reabre, 'HZ', { hz })) { quitada += w * (1 - hz / pr.hz); k++ }
      continue
    }
    if (evento(ev.campoId, p.id, a, reabre, k === 0 ? 'LSHH' : 'CMD')) { quitada += w; k++ }
  }
}

/* ─────────────────────── servicios que apagan pozos ─────────────────────── */
function servicio(campoId, equipo, tipo, tag, texto, n, durH, efecto) {
  for (let i = 0; i < n; i++) {
    let t, k = 0
    do { t = INICIO + rnd() * (AHORA - 20 * D - INICIO); k++ } while (SERVICIOS.some(s => s.campoId === campoId && Math.abs(s.inicio - t) < 10 * D) && k < 100)
    t = redondoMin(t)
    const dur = entre(...durH) * H
    const sv = { id: `SV-${equipo}-${corto(t)}`, campoId, equipo, tipo, inicio: t, fin: redondoMin(t + dur), tag, texto }
    SERVICIOS.push(sv)
    efecto(sv)
  }
}
const algunosBajan = (frac, porc) => sv => pozosDe(sv.campoId).filter(() => rnd() < porc).forEach(p => {
  const pr = pruebaEn(p, sv.inicio)
  if (p.levantamiento === 'electrosumergible') evento(sv.campoId, p.id, sv.inicio + entero(5, 30) * MIN, sv.fin + entero(10, 60) * MIN, 'HZ', { hz: Math.round(pr.hz * frac * 2) / 2 })
  else evento(sv.campoId, p.id, sv.inicio + entero(5, 30) * MIN, sv.fin + entero(10, 60) * MIN, 'CMD')
})
servicio('ceiba', 'K-101', 'aire', 'PAL-1011', 'presión baja del aire de instrumentos', 5, [1, 10], todosParan('PSH'))
servicio('ceiba', 'H-302', 'tratamiento', 'TSHH-3021', 'temperatura muy alta en el tratador: entrada cerrada', 2, [2, 8], todosParan('PSH'))
servicio('morichal', 'SE-2', 'energia', '52-SE2', 'interruptor del pórtico 13,8 kV abierto', 4, [1, 40], todosParan('UV'))
servicio('morichal', 'C-401', 'compresion', 'ZS-4011', 'compresor de gas detenido', 3, [4, 30], algunosBajan(0.8, 0.3))
servicio('guacamayo', 'LACT-01', 'evacuacion', 'LAH-3011', 'tanque de crudo alto: despacho limitado por la nominación del oleoducto', 4, [48, 160], algunosBajan(0.75, 0.6))
servicio('palmar', 'V-101', 'proceso', 'LSHH-1011', 'nivel muy alto en el separador: entrada cerrada', 4, [2, 10], todosParan('PSH'))
servicio('zarza', 'C-401', 'compresion', 'ZS-4011', 'compresor de gas detenido', 3, [4, 24], todosParan('CMD'))
servicio('zarza', 'SE-2', 'energia', '52-SE2', 'interruptor del pórtico 13,8 kV abierto', 2, [1, 12], todosParan('CMD'))

/* ─────────────── fallas y disparos del propio levantamiento ─────────────── */
const CODIGOS_FALLA = { GF: 0.35, PH: 0.15, OL: 0.30, OT: 0.10, UL: 0.10 }
const CODIGOS_DISPARO = { UL: 0.5, OL: 0.2, UV: 0.15, OT: 0.05, PH: 0.10 }
for (const p of POZOS) {
  if (p.campoId === 'morichal' && p.id === 'MN-41') continue // ya plantada arriba
  if (p.levantamiento === 'electrosumergible') {
    // Falla que pide taladro: una cada ~700 días en promedio.
    let t = INICIO + entre(0, 700) * D
    while (t < AHORA - 5 * D) {
      const cod = elegir(CODIGOS_FALLA)
      evento(p.campoId, p.id, t, t + entre(12, 35) * D, cod)
      t += entre(450, 950) * D
    }
    // Disparos cortos que el variador rearranca solo.
    for (let m = INICIO; m < AHORA; m += 30 * D) {
      const n = rnd() < 0.55 ? 1 : rnd() < 0.2 ? 2 : 0
      for (let i = 0; i < n; i++) {
        const a = m + entre(0, 29) * D
        evento(p.campoId, p.id, a, a + entre(10, 240) * MIN, elegir(CODIGOS_DISPARO))
      }
    }
  } else if (p.levantamiento === 'bombeo-mecanico') {
    // 0,66 fallas por pozo al año; cambio con taladro de 3 a 10 días.
    let t = INICIO + entre(0, 550) * D
    while (t < AHORA - 3 * D) { evento(p.campoId, p.id, t, t + entre(3, 10) * D, 'OL'); t += entre(350, 750) * D }
  }
}

/* ─────────────────── programa de paradas (configuración) ─────────────────── */
for (const id of ['PA-03', 'PA-05', 'LC-19']) {
  const p = POZOS.find(x => x.id === id)
  const t = redondoMin(INICIO + entre(30, 300) * D + 7 * H)
  const fin = t + entre(8, 20) * H
  if (evento(p.campoId, id, t, fin, 'CMD')) PROGRAMA.push({ id: `PR-${id.replace('-', '')}-${corto(t)}`, campoId: p.campoId, equipo: id, desde: iso(t - 15 * MIN), hasta: iso(fin + 3 * H), motivo: 'Cambio programado de la bomba de subsuelo' })
}

// En Zarza el comprador nomina menos: la señal ve el cierre, no el porqué.
for (let i = 0; i < 6; i++) {
  const t = redondoMin(INICIO + entre(5, 360) * D + 6 * H)
  const fin = t + entre(10, 60) * H
  const pozo = ['ZA-01', 'ZA-03', 'ZA-04', 'ZA-06'][i % 4]
  evento('zarza', pozo, t, fin, 'CMD', { respuesta: { texto: 'El comprador nominó menos gas: se cerró el pozo', por: 'Nelson Ortiz · supervisor', hora: iso(t + entero(20, 90) * MIN) } })
}

/* ───────────────────── producción fiscal diaria (PMO) ───────────────────── */
const FA = {}
const BSW = { ceiba: 'analizador', morichal: 'analizador', guacamayo: 'laboratorio', palmar: 'laboratorio', zarza: 'analizador' }
const PMO = { ceiba: 'FQI-0101 · computador de flujo de la unidad LACT-01', morichal: 'FQI-0101 · computador de flujo de la unidad LACT-01',
  guacamayo: 'FQI-0101 · computador de flujo de la unidad LACT-01', palmar: 'LIT-1021 y LIT-1022 · medidores automáticos de los tanques de despacho',
  zarza: 'FQI-0201 · computador de flujo del condensado' }
const DIARIO = []
const horasEn = (a, b, x, y) => Math.max(0, Math.min(b, y) - Math.max(a, x)) / H
for (const campoId of Object.keys(CAMPOS)) {
  const ps = pozosDe(campoId)
  const evs = EVENTOS.filter(e => e.campoId === campoId)
  for (let mes = INICIO; mes < AHORA;) {
    const d0 = new Date(mes - 5 * H)
    const sig = ms(d0.getUTCFullYear() + (d0.getUTCMonth() === 11 ? 1 : 0), d0.getUTCMonth() === 11 ? 1 : d0.getUTCMonth() + 2)
    const fin = Math.min(sig, AHORA)
    const clave = `${campoId}/${d0.getUTCFullYear()}-${p2(d0.getUTCMonth() + 1)}`
    let fa = entre(0.94, 1.03)
    if (clave === 'palmar/2026-04') fa = 0.81
    const teorico = [], oculto = []
    for (let d = mes; d < fin; d += D) {
      const e = Math.min(d + D, fin)
      let t = 0, o = 0
      for (const p of ps) {
        const q = crudoEn(p, d)
        let horas = (e - d) / H, perdidas = 0
        for (const ev of evs.filter(x => x.pozo === p.id)) {
          const a = new Date(ev.inicio).getTime(), b = ev.fin ? new Date(ev.fin).getTime() : AHORA
          const h = horasEn(a, b, d, e)
          if (!h) continue
          if (ev.codigo === 'HZ') perdidas += h * (1 - ev.hz / pruebaEn(p, d).hz)
          else perdidas += h
        }
        const prod = q * Math.max(0, horas - perdidas) / 24
        if (p.pruebas.length) t += prod; else o += prod
      }
      teorico.push(t); oculto.push(o)
    }
    // Lo fiscal: el factor del mes sobre lo teórico, más el efecto del inventario de cada día.
    // El pozo sin prueba también produce y entra en lo fiscal, pero no se puede asignar.
    const ruido = teorico.map(() => entre(-0.015, 0.015))
    const brutoDia = teorico.map((t, i) => (t + oculto[i]) * fa * (1 + ruido[i]))
    const objetivo = teorico.reduce((a, b) => a + b, 0) * fa + oculto.reduce((a, b) => a + b, 0) * fa
    const k = objetivo / brutoDia.reduce((a, b) => a + b, 0)
    const dias = brutoDia.map(v => Math.round(v * k))
    FA[clave] = fa
    DIARIO.push({ campoId, mes: clave.split('/')[1], publicado: fin === sig, dias })
    mes = sig
  }
}

/* ─────────────────────────────── escribir ─────────────────────────────── */
const ids = new Set(); for (const e of EVENTOS) { if (ids.has(e.id)) throw new Error('id repetido ' + e.id); ids.add(e.id) }
EVENTOS.sort((a, b) => a.inicio.localeCompare(b.inicio))
SERVICIOS.sort((a, b) => a.inicio - b.inicio)
const CAB = q => `/** ${q} · DATOS DE DEMO.
 *
 *  Generado por scripts/gen-linea.mjs (determinista). Todo sale de equipos:
 *  controladores de pozo, PLC de bombas y servicios, transmisores de nivel,
 *  separadores de prueba y el computador de flujo del punto de medición
 *  oficial. NO es historia de un campo real. */`

writeFileSync(destino('pozos.ts'), `${CAB('Pozos de los campos, con su controlador y sus pruebas instrumentadas')}
import type { Pozo } from '../pozos'

export const POZOS_DEMO: Pozo[] = [
${POZOS.map(p => `  ${lit(p)},`).join('\n')}
]
`)
writeFileSync(destino('eventos-pozos.ts'), `${CAB('Eventos de los controladores de pozo: paros, arranques y cambios de frecuencia')}
import type { EventoPozo } from '../pozos'

export const EVENTOS_POZOS: EventoPozo[] = [
${EVENTOS.map(e => `  ${lit(e)},`).join('\n')}
]
`)
writeFileSync(destino('servicios.ts'), `${CAB('Eventos de los servicios y equipos de proceso que apagan pozos (aire, energía, compresión, evacuación)')}
import type { EventoServicio } from '../pozos'

export const EVENTOS_SERVICIOS: EventoServicio[] = [
${SERVICIOS.map(s => `  ${lit({ ...s, inicio: iso(s.inicio), fin: iso(s.fin) })},`).join('\n')}
]
`)
writeFileSync(destino('produccion-diaria.ts'), `${CAB('Producción fiscal diaria por campo (punto de medición oficial)')}
import type { ProduccionMes } from '../pozos'

export const ORIGEN_PMO: Record<string, { fuente: string; bsw: 'analizador' | 'laboratorio' }> = ${lit(Object.fromEntries(Object.keys(CAMPOS).map(c => [c, { fuente: PMO[c], bsw: BSW[c] }])))}

export const PRODUCCION_DIARIA: ProduccionMes[] = [
${DIARIO.map(m => `  ${lit(m)},`).join('\n')}
]
`)
writeFileSync(destino('paradas-bombas.ts'), `${CAB('Paradas de las bombas de la línea, como las registra su PLC')}
import type { EventoBomba } from '../bombas'

export const PARADAS_BOMBAS: EventoBomba[] = [
${PARADAS.map(e => `  ${lit({
  id: e.id, campoId: e.campoId, equipo: e.equipo, inicio: iso(e.inicio), fin: e.fin === null ? null : iso(e.fin), perdida: e.perdida,
  senal: `${e.zs} · marcha → paro`,
  ...(e.alarma ? { primeraAlarma: e.alarma } : {}),
  ...(e.libreBbl !== undefined ? { nivelAlParar: { tag: e.lt, pct: Math.round(((ALTO_ALTO * e.tanque - e.libreBbl) / e.tanque) * 1000) / 10 } } : {}),
})},`).join('\n')}
]
`)
writeFileSync(destino('programa.ts'), `${CAB('Programa de paradas aprobado (es configuración, como las metas)')}
import type { ParadaProgramada } from '../configuracion'

export const PROGRAMA_INICIAL: ParadaProgramada[] = [
${PROGRAMA.map(p => `  ${lit(p)},`).join('\n')}
]
`)

const cuenta = (xs, f) => xs.reduce((a, x) => { const k = f(x); a[k] = (a[k] ?? 0) + 1; return a }, {})
console.log('pozos', POZOS.length, cuenta(POZOS, p => p.levantamiento))
console.log('eventos de pozo', EVENTOS.length, cuenta(EVENTOS, e => e.codigo))
console.log('servicios', SERVICIOS.length, cuenta(SERVICIOS, s => `${s.campoId}/${s.equipo}`))
console.log('paradas de bomba', PARADAS.length, ' programa', PROGRAMA.length)
console.log('factor de asignación (generación):', Object.entries(FA).filter(([k]) => k.startsWith('palmar/2026-0') || k.startsWith('ceiba/2026-09')).map(([k, v]) => `${k} ${v.toFixed(3)}`).join(' · '))
