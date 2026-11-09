/* Verificación de las piezas que contrata cada cliente (Fase 1 de
 * docs/experiencia-v3/PROMPT-FACILIDADES-POR-FASES.md).
 *
 * Lo que asegura:
 *   1. Sin `piezas` en la configuración, todo queda encendido: lo de hoy no cambia.
 *   2. Cada pantalla, cada sección de Resultados y cada tarea de Hoy declara su pieza.
 *   3. Con una combinación real (solo Equipos · solo Energía · Planta + Equipos · todo),
 *      ningún rol ve algo de una pieza que no se contrató, y el rol que se queda sin
 *      nada lo dice en vez de abrir una pantalla vacía.
 *   4. La firma rechaza una pieza que no existe, y el Núcleo va siempre.
 *
 *   node scripts/verificar-piezas.mjs
 */
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
process.env.VITE_FUENTE = 'demo'
const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const v = await createServer({ root: RAIZ, configFile: false, resolve: { alias: { '@': `${RAIZ}src` } }, server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'error' })
const INS = await v.ssrLoadModule('/src/entities/insumos.ts')
INS.instalarInsumos((await v.ssrLoadModule('/src/entities/datos/index.ts')).INSUMOS_DEMO)
const PZ = await v.ssrLoadModule('/src/entities/piezas-trim.ts')
const C = await v.ssrLoadModule('/src/entities/configuracion.ts')
const RS = await v.ssrLoadModule('/src/entities/resultados.ts')
const HOY = await v.ssrLoadModule('/src/entities/hoy.ts')
const RO = await v.ssrLoadModule('/src/entities/roles.ts')
const PA = await v.ssrLoadModule('/src/app/pantallas.tsx')
const R = await v.ssrLoadModule('/src/entities/reloj.ts')

let bien = 0, mal = 0
const comprobar = (ok, texto) => { if (ok) { bien++; console.log(`  ✓ ${texto}`) } else { mal++; console.log(`  ✗ ${texto}`) } }
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const lista = s => [...s].sort()

const config = C.configInicial()
const campos = Object.keys(config.campos)
const ctx = { config, respuestas: {} }
const con = piezas => ({ config: { ...config, piezas }, respuestas: {} })
const COMBOS = {
  'solo Equipos': ['equipos'],
  'solo Energía': ['energia'],
  'Planta + Equipos': ['planta', 'equipos'],
  'todo': [...PZ.PIEZAS_TRIM],
}

console.log('\n1 · Sin «piezas», todo encendido')
comprobar(igual(lista(PZ.piezasDe(config, campos)), lista(PZ.PIEZAS_TRIM)), 'una configuración sin «piezas» tiene las 6 piezas')
comprobar(PZ.piezasDe({ ...config, piezas: ['equipos'] }, campos).has('nucleo'), 'el Núcleo va siempre, aunque no se escriba')
const porCampo = { ...config, piezas: ['equipos'], campos: { ...config.campos, [campos[0]]: { ...config.campos[campos[0]], piezas: ['barriles'] } } }
comprobar(PZ.piezasDeCampo(porCampo, campos[0]).has('barriles') && !PZ.piezasDeCampo(porCampo, campos[0]).has('equipos'), 'las piezas de un campo mandan sobre las del cliente')
comprobar(PZ.piezasDe(porCampo, campos).has('equipos') && PZ.piezasDe(porCampo, campos).has('barriles'), 'con varios campos, se ve lo que tenga alguno')

console.log('\n2 · Todo declara su pieza')
const sinPieza = Object.keys(PA.PANTALLAS).filter(p => !Object.hasOwn(PZ.PIEZA_DE_PANTALLA, p))
comprobar(!sinPieza.length, `cada pantalla declara su pieza${sinPieza.length ? ` (faltan: ${sinPieza.join(', ')})` : ''}`)
const SECCIONES = ['produccion', 'bajando', 'mesAMes', 'porEquipo', 'porCampo', 'publicar', 'mantenimiento', 'confiabilidad', 'dondeSeTrabo', 'dondeBajarlo', 'tipos', 'diaADia', 'ciclo']
comprobar(SECCIONES.every(s => Object.hasOwn(PZ.PIEZA_DE_SECCION, s)), 'cada sección de Resultados declara su pieza')
const TAREAS = ['contestar', 'conseguir-causa', 'confirmar', 'confirmar-apunta', 'revisar', 'precisar', 'orden', 'intervenir', 'analisis', 'planes', 'asignacion', 'metas', 'aviso']
comprobar(TAREAS.every(t => Object.hasOwn(PZ.PIEZA_DE_TAREA, t)), 'cada tipo de tarea de Hoy declara su pieza')
comprobar(Object.keys(PA.PANTALLAS).every(p => PZ.pantallaContratada(p, PZ.TODAS)), 'con todas las piezas, toda pantalla se ofrece (lo de hoy no cambia)')

console.log('\n3 · Resultados: con todo, igual que hoy; con menos, solo lo contratado')
const unCampo = [campos[0]]
const q = rol => ({ rol, campos: unCampo, desde: new Date('2026-09-01T00:00:00-05:00'), hasta: new Date('2026-09-30T23:59:59-05:00') })
for (const rol of ['ger', 'prod', 'jefe', 'conf', 'reg']) {
  const hoy = RS.resultados(q(rol), ctx).secciones
  const todo = RS.resultados(q(rol), con([...PZ.PIEZAS_TRIM])).secciones
  comprobar(igual(hoy, todo), `${rol}: con todas las piezas, las mismas secciones de hoy (${hoy.length})`)
  for (const [n, ps] of Object.entries(COMBOS)) {
    const s = RS.resultados(q(rol), con(ps)).secciones
    const piezas = PZ.piezasDe({ ...config, piezas: ps }, unCampo)
    comprobar(s.every(x => piezas.has(PZ.PIEZA_DE_SECCION[x])), `${rol} · ${n}: ${s.length} secciones, todas de piezas contratadas`)
  }
}

console.log('\n4 · Hoy: solo las tareas de lo contratado')
const tarea = (tipo, id) => ({ id, tipo, campoId: campos[0], pide: true, titulo: id })
const vista = { tareas: TAREAS.map((t, i) => tarea(t, `t${i}`)), hechas: [] }
const todas = HOY.tareasContratadas(vista.tareas, PZ.TODAS)
comprobar(todas.length === TAREAS.length, 'con todas las piezas, ninguna tarea sale')
for (const [n, ps] of Object.entries(COMBOS)) {
  const piezas = PZ.piezasDe({ ...config, piezas: ps }, campos)
  const quedan = HOY.tareasContratadas(vista.tareas, piezas)
  comprobar(quedan.every(t => PZ.piezasDeTarea(t).some(p => piezas.has(p))), `${n}: quedan ${quedan.length} de ${TAREAS.length}, todas de piezas contratadas`)
}
const fragil = tarea('aviso', 'aviso:fragil:ceiba'), noIntervenir = tarea('aviso', 'aviso:no-intervenir:ceiba')
comprobar(HOY.tareasContratadas([fragil, noIntervenir], PZ.piezasDe({ ...config, piezas: ['energia'] }, campos)).length === 0,
  'solo Energía: ni «lo más frágil» (orden de cierre, de Planta) ni «no intervenir» (de Mantenimiento)')
comprobar(HOY.tareasContratadas([fragil, noIntervenir], PZ.piezasDe({ ...config, piezas: ['planta'] }, campos)).map(t => t.id).join() === fragil.id,
  'con Planta: el orden de cierre sí; «no intervenir», no')

console.log('\n5 · Cada rol, en cada combinación')
for (const [n, ps] of Object.entries(COMBOS)) {
  const piezas = PZ.piezasDe({ ...config, piezas: ps }, campos)
  for (const rol of RO.ROLES_VISIBLES) {
    const ofrecidas = rol.pantallas.filter(p => PZ.pantallaContratada(p, piezas))
    const inicio = PZ.inicioContratado(rol, piezas)
    const ok = inicio === null ? !PZ.pantallaContratada(rol.inicio, piezas) : PZ.pantallaContratada(inicio, piezas) && rol.pantallas.includes(inicio)
    comprobar(ok, `${n} · ${rol.id}: ${ofrecidas.length} pantallas; inicio ${inicio ?? '«sin pieza contratada» (lo dice)'}`)
  }
}
for (const rol of RO.ROLES_VISIBLES) comprobar(PZ.inicioContratado(rol, PZ.TODAS) === rol.inicio, `todo · ${rol.id}: abre en ${rol.inicio}, como hoy`)
const ger = RO.ROLES_VISIBLES.find(r => r.id === 'ger')
// Fase 7: «Mi panel» es del Núcleo. Con solo Energía, el gerente aterriza en su panel (los cortes de energía), nunca en «Metas y accesos».
comprobar(PZ.inicioContratado(ger, PZ.piezasDe({ ...config, piezas: ['energia'] }, campos)) === 'panel', 'solo Energía · ger: aterriza en «Mi panel» (Núcleo, con lo de Energía), no en «Metas y accesos»')
const configurar = new Set(['perfil', 'configuracion', 'filosofia', 'conectores'])
comprobar(Object.values(COMBOS).every(ps => RO.ROLES_VISIBLES.every(r => { const i = PZ.inicioContratado(r, PZ.piezasDe({ ...config, piezas: ps }, campos)); return i === null || i === r.inicio || !configurar.has(i) })),
  'ningún rol cambia su inicio por el perfil o lo de configurar')

console.log('\n6 · La firma')
const firmar = c => C.validarConfig(c, config, '2026-01-01', R.AHORA)
comprobar(!firmar({ ...config, piezas: ['equipos', 'barriles'] }).some(e => /pieza/i.test(e)), 'piezas que existen: se firman')
comprobar(firmar({ ...config, piezas: ['equipos', 'turbinas'] }).some(e => /turbinas/.test(e)), 'una pieza que no existe: la firma la rechaza y la nombra')
comprobar(firmar({ ...config, campos: { ...config.campos, [campos[0]]: { ...config.campos[campos[0]], piezas: ['nada'] } } }).some(e => /nada/.test(e)), 'en un campo, también')

await v.close()
console.log(`\n${bien} de ${bien + mal} comprobaciones bien.`)
process.exit(mal ? 1 : 0)
