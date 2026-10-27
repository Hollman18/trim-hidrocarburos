// M4 · Junta las cifras leídas del motor (datos/*.json, de leer-*.mjs) en datos/cifras.js,
// que cargan las imágenes por file:// (Chromium no deja leer JSON por fetch desde file://).
// No calcula nada nuevo: solo copia y redondea como la app (enteros del motor).
import { readFileSync, writeFileSync } from 'node:fs'
const L = f => JSON.parse(readFileSync(new URL(`../datos/${f}`, import.meta.url), 'utf8'))
const pv = L('planta-viva.json'), n3 = L('nivel3-p201b.json'), hoy = L('hoy.json'), txt = L('texto-demo.json'), R = L('roles.json'), k1 = L('nivel3-k101.json')
const P = pv.portafolio, C = pv.ceiba, N = n3.nivel3, S = hoy.sup
const DEMO = {
  _fuente: { leido: [pv._leido, n3._leido, hoy._leido, txt._leido], como: [pv._como, n3._como, hoy._como], reloj: 'demo: 2 de oct de 2026, datos de las 14:00' },
  franja: { portafolio: { p1: 4, p2: 8, p3: 2, sincom: 0 }, ceiba: { p1: 2, p2: 2, p3: 1, sincom: 0 }, _ruta: '#/ger/planta-viva/ceiba~portafolio/curso y …/ceiba/curso (texto-demo.json)' },
  ger: {
    ahora: P.cifras.durante.entero, ahoraFrase: P.cifras.durante.frase, explica: P.cifras.durante.explica,
    pozos: { parados: 4, total: 87 },
    filas: P.filas.map(f => ({ campo: f.nombre, bpd: f.entero, tramo: f.tramo, equipo: f.primerEquipo?.equipo ?? null, familia: f.primerEquipo?.familia ?? null, prioridad: f.primerEquipo?.prioridad ?? 0, linea: f.linea, gas: f.campoDeGas })),
    esteMes: { bbl: P.esteMes.bblEntero, rango: P.esteMes.rango.map(Math.round), usd: Math.round(P.esteMes.valorUsd / 1000), nota: P.esteMes.nota },
    produccion: { real: Math.round(P.produccion.realBpd), meta: P.produccion.metaBpd, bajoMeta: P.produccion.bajoMeta },
    mesAMes: { maximo: Math.round(P.mesAMes.maximoBpd), actual: Math.round(P.mesAMes.actualBpd), meses: P.mesAMes.meses.map(m => ({ r: m.rotulo, t: Math.round(m.totalBpd), a: Math.round(m.altoBpd), enCurso: m.enCurso })) },
    bajando: P.bajando.filas.map(f => ({ donde: f.nombre, antes: Math.round(f.antesBpd), ahora: Math.round(f.ahoraBpd), pct: Math.round(f.cambio * 100) })), bajandoNota: P.bajando.nota,
    perdida: P.perdida, planes: P.planes.texto,
  },
  ceiba: {
    ahora: C.cifras.durante.entero, sale: C.tecnica.cifra.entero, meta: 10900,
    tramos: C.planta.tramos.map(t => ({ tramo: t.tramo, nombre: t.nombre, limita: t.limita, marcado: t.marcado, cabe: t.cabeBpd, entero: t.entero, linea: t.linea.map(x => typeof x === 'string' ? x : x.b).join(''), sinDato: t.sinDato })),
    pasa: Math.round(C.planta.pasaBpd ?? 0), produccion: { real: Math.round(C.produccion.realBpd), meta: C.produccion.metaBpd },
  },
  sup: {
    porConfirmar: S.insignia, limite: 'mañana antes de las 07:00', frase: S.inicio.frase,
    ahora: +S.inicio.cifra.replace('.', ''), turnoBbl: Math.round(S.turno.diferidoBbl), turnoH: S.turno.horas,
    bloqueo: S.bloqueos[0], tareas: S.tareas, campo: S.campo,
  },
  p201b: N,
  k101: k1.nivel3,
  gerCierre: R.resGer.produccion.cierre,
  momentos: { antes: R.pvAntes.antes.entero, antesUnidad: R.pvAntes.antes.unidad, durante: R.pvAntes.durante.entero, despues: R.pvAntes.despues.entero },
  oper: { inicio: R.hoy_oper.inicio, pregunta: R.hoy_oper.tareas[0].preguntas[0], tarea: R.hoy_oper.tareas[0], bloqueo: R.hoy_oper.bloqueos[0], preguntas: R.hoy_oper.insignia },
  jefe: { avisan: R.lista.cuentas.estado.avisan, avisa: R.lista.filas.find(f => (f.filtros || []).includes('avisan')), porIdentificar: R.hoy_jefe.tareas.find(t => t.tipo === 'conseguir-causa'), orden: R.hoy_jefe.tareas.find(t => t.tipo === 'orden'),
    esperaD: R.relojes.esperaH / 24, totalD: R.relojes.totalH / 24, fallasHistoria: R.relojes.fallas, noIntervenir: R.lista.noIntervenir[0], fallasCriticasOct: { valor: 1, _fuente: 'necesario-por-rol.md §5 (M1, verificado contra historialDeEquipo: P-201B, 2-oct)' } },
  prod: { sale: R.pvCeiba.tecnica.cifra.entero, tramos: R.pvCeiba.tecnica.tramos, explica: R.pvCeiba.tecnica.cifra.fraseCorta, porConfirmar: R.hoy_prod.tareas.filter(t => t.tipo === 'confirmar').length ? 2 : 0, confirmar: R.hoy_prod.tareas.find(t => t.tipo === 'confirmar'),
    esteMes: { bbl: R.pvCeiba.esteMes.bblEntero, nota: R.pvCeiba.esteMes.nota, usd: Math.round(R.pvCeiba.esteMes.valorUsd / 1000) }, siFallaHoy: Math.round(R.lista.primero.valor), siFallaEquipos: R.lista.primero.equipos.map(e => e.equipo) },
  reg: { titulo: R.reg.titulo, sinCausa: R.reg.cifra.valor, bbl: R.reg.bblSinCausa, paradas: R.reg.paradas.map(x => ({ pozo: x.pozo, bbl: x.bbl, debe: x.debe.nombre, cuando: x.cuando, falta: x.falta })), periodo: R.reg.periodo, estado: R.reg.estado },
}
writeFileSync(new URL('../datos/cifras.js', import.meta.url), `// Generado por scripts/armar-cifras.mjs: cifras del motor del demo, leídas en http://localhost:5183. No editar a mano.\nwindow.DEMO = ${JSON.stringify(DEMO, null, 1)}\n`)
console.log('ok', Object.keys(DEMO))
