/* Salidas de referencia de los endpoints CALCULADOS (CONTRATO.md, «Endpoints
 * calculados que el front consume») y los INSUMOS con que se calcularon, para
 * que un backend en cualquier lenguaje cargue lo mismo y compruebe que da los
 * mismos números que el motor del front.
 *
 * verificar-libro.mjs prueba el motor llamando sus funciones de TypeScript;
 * un backend en Python o en otro servicio no puede correrlo. Esto sí: cada
 * caso es un endpoint con su respuesta esperada, y `comparar` los pide por HTTP.
 *
 *   node scripts/referencia.mjs generar                     # escribe referencia/ desde el motor
 *   node scripts/referencia.mjs comprobar                   # el motor de hoy contra referencia/ (deriva)
 *   node scripts/referencia.mjs comparar --base-url=URL     # una API contra referencia/
 *
 * referencia/insumos/ trae lo que entra al cálculo con la forma de los
 * endpoints de insumo y de arranque del contrato (cada archivo es
 * `{ endpoint, respuesta }`): el backend los carga como si vinieran del borde
 * y de su base, sin leer src/entities/datos/. `comprobar` arma los casos con
 * los insumos LEÍDOS DE ESOS ARCHIVOS (no con los del demo): si les faltara
 * algo que el motor usa, los números no darían y la prueba falla.
 *
 * Regla de comparación (la misma en los dos modos, scripts/referencia-diferencias.mjs):
 * la respuesta tiene que CONTENER lo que trae la referencia (puede traer más
 * campos, salvo los que el contrato dice ausentes cuando no aplican); un null
 * esperado exige null; los registros cerrados (por tramo, por escalón…) traen
 * exactamente sus claves; los números valen iguales con una diferencia de hasta
 * 1e-6 relativo o 0,005 absoluto; las fechas se comparan como instante y traen
 * su zona; el orden de las listas importa. Sale con código 1 si algo no coincide.
 *
 *   node scripts/referencia.mjs comparar --base-url=URL --token=TOKEN   # con sesión (o TRIM_TOKEN)
 *   node scripts/referencia.mjs comparar --base-url=URL --escenario=ID  # los casos de un escenario, ya cargado
 *
 * Además de los casos con la configuración de arranque, hay ESCENARIOS
 * (referencia/insumos/escenarios/): otra configuración firmada (la planta o
 * afuera limitando, un cambio de lo que limita, un empate al barril) o lo que
 * dijeron las personas en la clasificación (correcciones del paso 2 y del 4,
 * «En el yacimiento», una confirmación). Cada caso de un escenario lo dice en
 * `escenario` y en `requiere`; el backend carga ese insumo antes de pedirlo.
 */
import { createServer } from 'vite'
import { diferencias, TOL_REL, TOL_ABS } from './referencia-diferencias.mjs'
// El motor de referencia es el del demo: un .env.local que apunte a un backend
// (VITE_FUENTE=http) no lo cambia de fuente; Vite respeta lo que ya trae el proceso.
process.env.VITE_FUENTE = 'demo'
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = fileURLToPath(new URL('..', import.meta.url))
// REFERENCIA_DIR: generar o comprobar en otra carpeta (una prueba en seco, sin tocar referencia/).
const DIR = process.env.REFERENCIA_DIR ?? join(RAIZ, 'referencia')
const DIR_INSUMOS = join(DIR, 'insumos')
const [modo, ...resto] = process.argv.slice(2)
const baseUrl = resto.find(a => a.startsWith('--base-url='))?.slice('--base-url='.length)
// Un backend con sesión (CONTRATO.md, «Sesión»): sin credencial, todo da 401.
const token = resto.find(a => a.startsWith('--token='))?.slice('--token='.length) ?? process.env.TRIM_TOKEN
// Los casos de un escenario piden que el backend cargue antes su insumo (insumos/escenarios/<id>.json):
// `comparar` pide los de arranque y, con --escenario=<id>, solo los de ese escenario.
const escenarioPedido = resto.find(a => a.startsWith('--escenario='))?.slice('--escenario='.length)
if (!['generar', 'comprobar', 'comparar'].includes(modo) || (modo === 'comparar' && !baseUrl)) {
  console.error('uso: node scripts/referencia.mjs generar | comprobar | comparar --base-url=http://servidor:puerto')
  process.exit(2)
}

/* ───── Comparación: scripts/referencia-diferencias.mjs ───── */

/* ───── Insumos: del motor a archivos con la forma del contrato, y de vuelta ───── */

const esEsp = p => p.levantamiento === 'electrosumergible'

/** Cada insumo, como lo entregaría el endpoint de insumo de su campo
 *  (CONTRATO.md, «Insumos que el backend entrega»), más los GET del arranque
 *  que el cálculo lee (registro de campos, catálogo, configuración firmada y
 *  respuestas). Devuelve `[{ archivo, endpoint, respuesta }]`. */
function exportarInsumos(M, ins) {
  const { C, K, L, CAMPOS, CAT, CONF, ESP, ctx, AHORA, LOC } = M
  const cal = L.calendario()
  // El rango que se pide a los endpoints con `desde` y `hasta`: toda la
  // historia hasta AHORA. Un insumo fuera de él no lo traería el endpoint,
  // y el caso no se podría reproducir: se dice y se para.
  const desde = new Date(cal[0].desde), hasta = AHORA
  const rango = `desde=${encodeURIComponent(K.isoColombia(desde))}&hasta=${encodeURIComponent(K.isoColombia(hasta))}`
  const dentro = (x, inicio, fin) => {
    const i = Date.parse(inicio), f = fin == null ? Infinity : Date.parse(fin)
    if (!(i < hasta.getTime() && f > desde.getTime())) throw new Error(`${x.id}: ${inicio} → ${fin ?? 'abierto'} cae fuera de ${K.isoColombia(desde)} – ${K.isoColombia(hasta)}, el rango de los endpoints de insumo`)
    return true
  }
  const json = x => JSON.parse(JSON.stringify(x))
  const sale = []
  const arranque = (nombre, ep, valor) => sale.push({ archivo: `arranque/${nombre}.json`, endpoint: `/api${C.urlDe(ep, {})}`, respuesta: json(K.aRespuesta(ep.codec, valor)) })
  arranque('campos', C.LISTA_CAMPOS, CAMPOS)
  arranque('catalogo', C.CATALOGO, CAT.pedirCatalogo(CAMPOS.map(c => c.id)))
  // La versión que rige los casos: la de arranque, con el programa de paradas.
  arranque('configuracion-historial', C.CONFIGURACION_HISTORIAL, [CONF.versionInicial()])
  arranque('paradas-respuestas', C.RESPUESTAS, ctx.respuestas)
  for (const { id: c } of CAMPOS) {
    const del = xs => xs.filter(x => x.campoId === c)
    const pone = (nombre, endpoint, respuesta) => sale.push({ archivo: `${c}/${nombre}.json`, endpoint, respuesta: json(respuesta) })
    pone('pozos', `/api/campos/${c}/pozos`, del(ins.pozos))
    pone('pozos-eventos', `/api/campos/${c}/pozos/eventos?${rango}`, del(ins.eventosPozos).filter(e => dentro(e, e.inicio, e.fin)))
    pone('servicios-eventos', `/api/campos/${c}/servicios/eventos?${rango}`, del(ins.eventosServicios).filter(e => dentro(e, e.inicio, e.fin)))
    const meses = del(ins.produccionDiaria)
    if (meses.length) pone('produccion-diaria', `/api/campos/${c}/produccion-diaria?${rango}`, {
      // Sin registro del punto de medición el campo no trae `origen` (hueco), nunca uno inventado.
      ...(ins.origenPmo[c] ? { origen: ins.origenPmo[c] } : {}),
      meses: meses.map(({ mes, publicado, dias }) => ({ mes, publicado, dias })),
    })
    const paradas = del(ins.paradasBombas)
    for (const equipo of [...new Set(paradas.map(p => p.equipo))])
      pone(`bombas/${equipo}-paradas`, `/api/campos/${c}/bombas/${encodeURIComponent(equipo)}/paradas?${rango}`,
        paradas.filter(p => p.equipo === equipo && dentro(p, p.inicio, p.fin)))
    // Las lecturas de las electrosumergibles (la serie del historiador de cada
    // variable y los ajustes de protección del variador) no son todavía un
    // insumo del motor: esp.ts las arma del pozo. Van aquí, con lo que el vigía
    // lee de cada señal, para que el backend tenga los números; el contrato aún
    // no fija por qué endpoint llegan los ajustes (CONTRATO.md, «Pendiente»), así
    // que el archivo no lleva endpoint y `comprobar` no las puede tomar de aquí.
    const esp = del(ins.pozos).filter(esEsp)
    if (esp.length) sale.push({ archivo: `${c}/electrosumergibles.json`, endpoint: null, respuesta: json(esp.map(p => ({
      pozo: p.id, senales: ESP.senalesEsp(p).map(s => ({ variable: s.plantilla.id, tag: s.tag, unidad: s.unidad, serie: s.serie, normal: s.normal, alarma: s.alarma })),
    }))) })
    // La locación de los pozos, para el caso de borde del choke (U2 §8.6): no está
    // en `Pozo` ni tiene endpoint todavía (CONTRATO.md, «Pendiente»); el demo la trae
    // aparte (datos/topologia.ts). Solo los campos que la tienen.
    const loc = Object.fromEntries(del(ins.pozos).flatMap(p => { const l = LOC(c)(p.id); return l ? [[p.id, l]] : [] }))
    if (Object.keys(loc).length) sale.push({ archivo: `${c}/locaciones.json`, endpoint: null, respuesta: loc })
  }
  // Los escenarios (QA-A-07; C-29; C-08 punto 4): otra configuración firmada o lo que dijeron las personas.
  for (const e of escenariosDelMotor(M)) sale.push({ archivo: `escenarios/${e.id}.json`,
    endpoint: e.versiones ? `/api${C.urlDe(C.CONFIGURACION_HISTORIAL, {})}` : null,
    respuesta: e.versiones ? json(K.aRespuesta(C.CONFIGURACION_HISTORIAL.codec, e.versiones)) : { descripcion: e.descripcion, guardadas: json(e.guardadas) } })
  // Un insumo que no entró a ningún archivo no lo tendría el backend.
  const contados = { pozos: 0, eventosPozos: 0, eventosServicios: 0, produccionDiaria: 0, paradasBombas: 0 }
  for (const s of sale) {
    const nombre = s.archivo.split('/').at(-1)
    if (nombre === 'pozos.json') contados.pozos += s.respuesta.length
    else if (nombre === 'pozos-eventos.json') contados.eventosPozos += s.respuesta.length
    else if (nombre === 'servicios-eventos.json') contados.eventosServicios += s.respuesta.length
    else if (nombre === 'produccion-diaria.json') contados.produccionDiaria += s.respuesta.meses.length
    else if (s.archivo.includes('/bombas/')) contados.paradasBombas += s.respuesta.length
  }
  for (const [k, n] of Object.entries(contados))
    if (n !== ins[k].length) throw new Error(`insumos.${k}: ${ins[k].length} en el motor y ${n} en los archivos (alguno es de un campo que no está en el registro)`)
  return sale
}

/** Los insumos del motor (`Insumos` de entities/insumos.ts) armados SOLO con
 *  los archivos de referencia/insumos/: lo mismo que haría un backend. */
function insumosDeArchivos(K, C) {
  const leer = archivo => JSON.parse(readFileSync(join(DIR_INSUMOS, archivo), 'utf8'))
  const { insumos: lista } = JSON.parse(readFileSync(join(DIR, 'indice.json'), 'utf8'))
  const ins = { pozos: [], eventosPozos: [], eventosServicios: [], produccionDiaria: [], origenPmo: {}, paradasBombas: [], programa: [] }
  for (const { archivo } of lista) {
    const { respuesta } = leer(archivo), [campo, nombre] = archivo.split('/')
    // Las lecturas de las electrosumergibles y la locación de los pozos no son insumo del motor todavía (ver
    // exportarInsumos); los escenarios se cargan aparte, para sus casos (`escenariosDeArchivos`).
    if (nombre === 'electrosumergibles.json' || nombre === 'locaciones.json' || campo === 'escenarios') continue
    if (campo === 'arranque') {
      if (nombre === 'configuracion-historial.json') ins.programa = K.deRespuesta(C.CONFIGURACION_HISTORIAL.codec, respuesta).at(-1).config.programa
    } else if (nombre === 'pozos.json') ins.pozos.push(...respuesta)
    else if (nombre === 'pozos-eventos.json') ins.eventosPozos.push(...respuesta)
    else if (nombre === 'servicios-eventos.json') ins.eventosServicios.push(...respuesta)
    else if (nombre === 'produccion-diaria.json') {
      if (respuesta.origen) ins.origenPmo[campo] = respuesta.origen
      ins.produccionDiaria.push(...respuesta.meses.map(m => ({ campoId: campo, ...m })))
    } else if (archivo.includes('/bombas/')) ins.paradasBombas.push(...respuesta)
    else throw new Error(`referencia/insumos/${archivo}: no se sabe qué insumo es`)
  }
  return ins
}

/** La locación de los pozos leída SOLO de referencia/insumos/<campo>/locaciones.json. */
function locacionesDeArchivos() {
  const { insumos: lista } = JSON.parse(readFileSync(join(DIR, 'indice.json'), 'utf8'))
  const por = Object.fromEntries(lista.filter(i => i.archivo.endsWith('/locaciones.json'))
    .map(i => [i.archivo.split('/')[0], JSON.parse(readFileSync(join(DIR_INSUMOS, i.archivo), 'utf8')).respuesta]))
  return campo => pozo => (Object.hasOwn(por, campo) && Object.hasOwn(por[campo], pozo) ? por[campo][pozo] : undefined)
}

/* ───── Escenarios: otra configuración firmada o lo que dijeron las personas ───── */

/** Lo que firma el administrador en un escenario: las capacidades de un campo, rigiendo desde antes del calendario. */
const DESDE_SIEMPRE = '2025-09-01T00:00:00-05:00'

/** Los escenarios, armados con el motor (al generar). Cada uno es lo que un
 *  backend cargaría antes de sus casos: un historial de la configuración
 *  firmada, o lo que dijeron las personas en la clasificación (por fila o por
 *  evento, solo lo de las personas: la forma de `guardadas` de las escrituras). */
function escenariosDelMotor(M) {
  const { CONF, ctx, PA, CL, ARB } = M
  const v0 = CONF.versionInicial()
  const firma = (version, fecha, capacidades, motivo) => ({ ...v0, version, fecha, por: 'Referencia · administrador de la implementación', motivo, cambios: [], config: { ...v0.config, capacidades } })
  // Lo que dijeron las personas: el paso 2 corregido (LC-11, septiembre), «el oleoducto no recibía» (el tanque de
  // crudo de Guacamayo), el paso 4 (una falla que el jefe dice que fue planeada), «En el yacimiento» (MN-23) y
  // una parada confirmada de punta a punta (P-201B, octubre).
  const filas = (c, mes) => { const m = M.L.calendario().find(x => x.mes === mes); return PA.paradasAnh([c], new Date(m.desde), new Date(m.hasta), ctx) }
  const quien = (id, nombre) => ({ id, nombre }), hora = '2026-10-02T13:30:00-05:00'
  const ceSep = filas('ceiba', '2026-09'), guOct = filas('guacamayo', '2025-10'), moSep = filas('morichal', '2026-09'), ceOct = filas('ceiba', '2026-10')
  const mayor = (ps, f) => ps.filter(f).sort((a, b) => b.diferidaTrimBbl - a.diferidaTrimBbl || a.id.localeCompare(b.id))[0]
  const lc11 = mayor(ceSep, p => p.pozo === 'LC-11' && p.clasificacion.choke?.valor === 'pozo')
  const lc04 = mayor(ceSep, p => p.pozo === 'LC-04' && p.causa.tipo === 'electrosumergible')
  const lact = mayor(guOct, p => p.causa.tipo === 'evacuacion' && !p.clasificacion.choke)
  const mn23 = mayor(moSep, p => p.pozo === 'MN-23' && p.causa.tipo === 'electrosumergible' && p.causa.parte === 'admision')
  const p201 = mayor(ceOct, p => p.causa.equipo === 'P-201B' && p.estado === 'propuesta')
  const dicho = [
    [lc11.eventoId, CL.declararPaso(lc11.clasificacion, 'choke', 'planta', quien('u-sup', 'Nelson Ortiz'), 'sup', hora)],
    [lact.eventoId, CL.declararPaso(lact.clasificacion, 'choke', 'exportacion', quien('u-conf', 'Edwin Maestre'), 'conf', hora)],
    [lc04.eventoId, CL.declararPaso(lc04.clasificacion, 'planeacion', 'planeada', quien('u-jefe', 'Jefe de mantenimiento'), 'jefe', hora)],
    [mn23.eventoId, CL.declararYacimiento(mn23.clasificacion, 'prueba', quien('u-prod', 'Producción'), 'prod', hora)],
    [p201.eventoId, PA.confirmarParada(p201, 'conf', quien('u-conf', 'Edwin Maestre'), hora).clasificacion],
  ]
  return [
    { id: 'capacidades-de-antes', descripcion: 'Las capacidades que regían antes del 21-oct, firmadas desde el comienzo: el tren de crudo de La Ceiba en 12.000 y, en Guacamayo, el crudo en 7.400 y afuera en 6.800. La planta y afuera limitan, casi iguales a los pozos, con días en que el real pasó la capacidad',
      versiones: [firma(1, DESDE_SIEMPRE, [{ campoId: 'ceiba', crudo: { bpd: 12000, fuente: 'prueba' } }, { campoId: 'guacamayo', crudo: { bpd: 7400, fuente: 'prueba' }, afuera: { bpd: 6800, fuente: 'contrato' } }], 'Las capacidades de antes del 21-oct')] },
    { id: 'cambio-de-limita', descripcion: 'El tren de crudo de La Ceiba en 11.500 desde el comienzo (limita la planta) y en 13.500 desde el 1 de mayo (limitan los pozos): un aviso «Cambió lo que limita»',
      versiones: [firma(1, DESDE_SIEMPRE, [{ campoId: 'ceiba', crudo: { bpd: 11500, fuente: 'prueba' } }], 'Tren de crudo medido'), firma(2, '2026-05-01T00:00:00-05:00', [{ campoId: 'ceiba', crudo: { bpd: 13500, fuente: 'placa' } }], 'Ampliación del tren de crudo')] },
    { id: 'empate', descripcion: 'La planta y afuera de La Ceiba en 11.000 cada uno, con su explicación: un empate al barril en lo que limita',
      versiones: [firma(1, DESDE_SIEMPRE, [{ campoId: 'ceiba', crudo: { bpd: 11000, fuente: 'prueba' }, afuera: { bpd: 11000, fuente: 'contrato' }, explicacionEmpate: 'El oleoducto se dimensionó con el tren de crudo' }], 'Empate al barril')] },
    { id: 'correcciones', descripcion: 'Lo que dijeron las personas: el supervisor pone LC-11 (septiembre) en la planta; confiabilidad contesta que el oleoducto no recibía (tanque de crudo de Guacamayo, octubre de 2025); el jefe dice que la falla de LC-04 (septiembre) fue planeada; producción pone MN-23 en el yacimiento con la prueba del pozo; confiabilidad confirma los 6 pasos de una parada de P-201B (octubre)',
      guardadas: Object.fromEntries(dicho.map(([k, b]) => [k, ARB.soloDePersona(b)])) },
  ]
}

/** Los escenarios leídos SOLO de referencia/insumos/escenarios/: lo que haría un backend. */
function escenariosDeArchivos(K, C) {
  const { insumos: lista } = JSON.parse(readFileSync(join(DIR, 'indice.json'), 'utf8'))
  return lista.filter(i => i.archivo.startsWith('escenarios/')).map(i => {
    const { endpoint, respuesta } = JSON.parse(readFileSync(join(DIR_INSUMOS, i.archivo), 'utf8'))
    const id = i.archivo.slice('escenarios/'.length, -'.json'.length)
    return endpoint ? { id, versiones: K.deRespuesta(C.CONFIGURACION_HISTORIAL.codec, respuesta) } : { id, descripcion: respuesta.descripcion, guardadas: respuesta.guardadas }
  })
}

/** Las filas de REGLAS_ANH que el demo no puede producir: piden lo que ninguna
 *  costura pasa todavía (las protecciones del variador, la capacidad sin falla,
 *  la pareja del programa) o lo que el demo no trae (una caída de energía en la
 *  frontera, una declaración con uno de los motivos cerrados). El día que una
 *  aparezca en los casos, sale de esta lista. */
const SIN_CASO_EN_EL_DEMO = ['linea-variador', 'linea-capacidad', 'energia-frontera', 'programada-con-pareja', 'declarada-chip']

/** Meses y campos que traen lo que septiembre no trae (C-29): cada fila de
 *  REGLAS_ANH con al menos un caso, filas parciales y de exceso del programa,
 *  sin causa y del día en curso, abiertas al corte, disparos, cascadas y las
 *  preguntas del tanque, de la raíz y de lo que se perdió. */
const MESES_ANH = [
  ['ceiba', '2026-10', 'el mes en curso: sin causa, el día que no ha cortado y «¿Se perdió crudo o gas?»'],
  ['guacamayo', '2025-10', 'el tanque de crudo lleno («¿El oleoducto recibía?»), parciales y disparos'],
  ['morichal', '2026-02', 'compresión, una parada del programa con su exceso y parciales'],
  ['zarza', '2026-01', 'energía de un elemento compartido'],
  ['ceiba', '2025-11', 'el aire de instrumentos y la pregunta de la raíz'],
  ['ceiba', '2025-10', 'el tratador'],
  ['morichal', '2026-06', 'la lubricación de una bomba de la línea'],
  ['morichal', '2025-12', 'el motor de una bomba de la línea'],
]

/* ───── Casos, calculados con el motor ───── */

/** Arranca el motor con los insumos que se le den (o los del demo) y corre el
 *  trabajo con sus módulos. Un servidor de Vite por corrida: los insumos se
 *  instalan una sola vez por proceso de módulos (insumos.ts). */
async function conMotor(trabajo, insumosDe) {
  const v = await createServer({ root: RAIZ, configFile: false, resolve: { alias: { '@': `${RAIZ}src` } },
    server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'error' })
  try {
    const cargar = n => v.ssrLoadModule(n)
    const M = {
      C: await cargar('/src/shared/api/contrato.ts'), K: await cargar('/src/shared/api/cable.ts'),
      DEMO: (await cargar('/src/entities/datos/index.ts')).INSUMOS_DEMO,
    }
    // Los insumos se instalan antes de calcular, como en el navegador (insumos.ts),
    // y la locación de los pozos por la costura (fuente.ts), como la instala el demo.
    const ins = insumosDe ? insumosDe(M.K, M.C) : M.DEMO
    ;(await cargar('/src/entities/insumos.ts')).instalarInsumos(ins)
    M.LOC = insumosDe ? locacionesDeArchivos() : (await cargar('/src/entities/datos/topologia.ts')).locacionDemo
    ;(await cargar('/src/shared/api/fuente.ts')).instalarLocaciones(M.LOC)
    Object.assign(M, {
      ins, L: await cargar('/src/entities/libro.ts'), CAMPOS: (await cargar('/src/entities/campos.ts')).CAMPOS,
      AHORA: (await cargar('/src/entities/reloj.ts')).AHORA, CONF: await cargar('/src/entities/configuracion.ts'),
      CAT: await cargar('/src/shared/api/catalogo.ts'), DIF: await cargar('/src/shared/api/diferidos.ts'),
      EQ: await cargar('/src/shared/api/equipos.ts'), SAP: await cargar('/src/shared/api/sap.ts'),
      PRE: await cargar('/src/shared/api/predicciones.ts'), ESP: await cargar('/src/entities/esp.ts'),
      CIC: await cargar('/src/shared/api/ciclo.ts'), CHK: await cargar('/src/shared/api/choke.ts'), ARB: await cargar('/src/shared/api/arbol.ts'),
      PA: await cargar('/src/entities/anh-paradas.ts'), CL: await cargar('/src/entities/anh-clasificacion.ts'),
    })
    M.ctx = M.L.contextoInicial()
    return await trabajo(M)
  } finally { await v.close() }
}

function casosDe(M, escenarios) {
  const { C, K, L, CAMPOS, DIF, EQ, SAP, PRE, CONF, CIC, CHK, ARB, ctx, ins } = M
  const todos = CAMPOS.map(c => c.id)
  const cerrados = L.calendario().filter(L.mesCerrado)
  const ultimo = cerrados.at(-1)
  const rango = m => ({ desde: new Date(m.desde), hasta: new Date(m.hasta) })
  // Lo que el backend tiene que responder es la forma del contrato
  // (src/shared/api/contrato.ts): la misma que prueba verificar-contrato.mjs.
  // El JSON tal como viaja: { datos, refs }, fechas ISO con zona.
  const caso = (id, descripcion, ep, p, valor, requiere) => ({ id, descripcion, endpoint: `/api${C.urlDe(ep, p)}`,
    ...(requiere ? { requiere } : {}), esperado: JSON.parse(JSON.stringify(K.aRespuesta(ep.codec, valor))) })
  // El vigía de las electrosumergibles lee sus lecturas, que todavía no son un
  // insumo con endpoint (ver exportarInsumos): esos casos lo dicen en `requiere`.
  // Se comprobó moviendo esas lecturas en una copia: cambian el riesgo, los
  // aciertos y la salud de los pozos de los campos con electrosumergibles, y nada más.
  const conEsp = grupo => {
    const cs = grupo.filter(c => ins.pozos.some(p => p.campoId === c && esEsp(p)))
    return cs.length ? cs.map(c => `insumos/${c}/electrosumergibles.json`) : undefined
  }
  const casos = []
  for (const grupo of [...todos.map(c => [c]), todos]) {
    const nombre = grupo.length === 1 ? grupo[0] : 'portafolio'
    const q = { campos: grupo, ...rango(ultimo) }
    casos.push(caso(`diferidos/${nombre}-${ultimo.mes}`, `Libro de ${nombre}, ${ultimo.mes} (último mes cerrado)`, C.DIFERIDOS, q, DIF.pedirLibro(q, ctx)))
    casos.push(caso(`mensual/${nombre}`, `Serie mensual de ${nombre} (las cifras de cada mes, sin sus tramos)`, C.DIFERIDOS_MENSUAL, { campos: grupo }, DIF.pedirSerie(grupo, ctx)))
    casos.push(caso(`diaria/${nombre}-${ultimo.mes}`, `Producción día a día de ${nombre}, ${ultimo.mes}`, C.PRODUCCION_DIARIA, q, DIF.pedirDias(q, ctx)))
    // Vigía: lo que va hacia su límite y cuándo llega.
    casos.push(caso(`riesgo/${nombre}`, `Riesgo de ${nombre} a esta hora (vigía)`, C.RIESGO, { campos: grupo }, DIF.pedirRiesgo(grupo, ctx), conEsp(grupo)))
    casos.push(caso(`ciclo/${nombre}-${ultimo.mes}`, `Ciclo ANTES / DURANTE / DESPUÉS de ${nombre}, ${ultimo.mes}`, C.CICLO, q,
      CIC.pedirCiclo(grupo, q.desde, q.hasta, ctx, [CONF.versionInicial()], {}), conEsp(grupo)))
    // Aciertos: el registro de predicciones del vigía y su calificación, con la versión de arranque.
    casos.push(caso(`aciertos/${nombre}`, `Registro de predicciones y fallas de ${nombre} (aciertos)`, C.PREDICCIONES, { campos: grupo },
      PRE.pedirPredicciones(grupo, ctx, [CONF.versionInicial()]), conEsp(grupo)))
    // SAP: avisos y órdenes que salen de la historia con reglas fijas (sin avisos enviados en la sesión).
    casos.push(caso(`sap/avisos-${nombre}`, `Avisos SAP de ${nombre}`, C.SAP_AVISOS, { campos: grupo }, SAP.pedirAvisosSap(grupo, ctx, [])))
    casos.push(caso(`sap/ordenes-${nombre}`, `Órdenes SAP de ${nombre}`, C.SAP_ORDENES, { campos: grupo }, SAP.pedirOrdenesSap(grupo, ctx)))
    // El modelo choke: lo perdido por tramo y por escalón con la eficiencia, mes a mes, contra la línea base, y «si falla hoy».
    casos.push(caso(`choke/reparto-${nombre}-${ultimo.mes}`, `Lo perdido por tramo y por escalón en ${nombre}, ${ultimo.mes}, con la eficiencia de producción`, C.REPARTO_CHOKE, q, CHK.pedirRepartoChoke(q, ctx)))
    casos.push(caso(`choke/mensual-${nombre}`, `Lo perdido por tramo cada mes en ${nombre}`, C.REPARTO_CHOKE_MENSUAL, { campos: grupo }, CHK.pedirRepartoMensual(grupo, ctx)))
    casos.push(caso(`choke/base-${nombre}-${ultimo.mes}`, `Antes → con TRIM por tramo en ${nombre}, ${ultimo.mes} (línea base de tres meses publicados)`, C.BASE_CHOKE, q, CHK.pedirBaseChoke(q, ctx)))
    casos.push(caso(`choke/criticidad-${nombre}`, `«Si falla hoy» de todos los equipos de ${nombre} a esta hora`, C.CRITICIDAD, { campos: grupo }, CHK.pedirCriticidad(grupo, ctx)))
    // El árbol de paradas de la ANH: las filas del mes, con su clasificación propuesta, y su calidad (sin nada dicho por una persona).
    casos.push(caso(`anh/paradas-${nombre}-${ultimo.mes}`, `Paradas ANH (paradas_pozo) de ${nombre}, ${ultimo.mes}, con la clasificación que propone TRIM`, C.PARADAS_ANH, q, ARB.pedirParadasAnh(q, ctx, {})))
    casos.push(caso(`anh/calidad-${nombre}-${ultimo.mes}`, `Calidad de la clasificación ANH de ${nombre}, ${ultimo.mes}`, C.CALIDAD_ANH, q, ARB.pedirCalidadAnh(q, ctx, {})))
    // El árbol de pérdidas del choke: cada barril diferido de su tramo y de los pasos del árbol, en los
    // tres órdenes (con las cadenas de la ANH en la circular), sin nada dicho por una persona.
    for (const [orden, como] of [['gestion', 'de gestión: tramo → planeada o no → causa → detalle → equipo → parte'],
      ['circular', 'de la circular: responsable → tramo → diferida o pérdida → planeada o no → causa → detalle'],
      ['responsable', 'por quién: responsable → tramo → causa → equipo']]) {
      const qo = { ...q, orden }
      casos.push(caso(`choke-arbol/${nombre}-${ultimo.mes}-${orden}`, `El árbol de pérdidas del choke de ${nombre}, ${ultimo.mes}, en el orden ${como}`, C.ARBOL_CHOKE, qo, CHK.pedirArbolChoke(qo, ctx, {})))
    }
  }
  // Lo que septiembre no trae (C-29): las demás filas de REGLAS_ANH, parciales, excesos del programa, sin causa
  // y el día en curso, en el campo y el mes que los tienen. Sus filas y su árbol de gestión.
  const filasVistas = new Set()
  for (const [c, mes, por] of MESES_ANH) {
    const m = L.calendario().find(x => x.mes === mes)
    const q = { campos: [c], ...rango(m) }, ps = ARB.pedirParadasAnh(q, ctx, {})
    for (const p of ps) filasVistas.add(p.propuesta.fila)
    casos.push(caso(`anh/paradas-${c}-${mes}`, `Paradas ANH de ${c}, ${mes}: ${por}`, C.PARADAS_ANH, q, ps))
    casos.push(caso(`choke-arbol/${c}-${mes}-gestion`, `El árbol de pérdidas del choke de ${c}, ${mes} (${por}), en el orden de gestión`, C.ARBOL_CHOKE, { ...q, orden: 'gestion' }, CHK.pedirArbolChoke({ ...q, orden: 'gestion' }, ctx, {})))
  }
  for (const p of ARB.pedirParadasAnh({ campos: todos, ...rango(ultimo) }, ctx, {})) filasVistas.add(p.propuesta.fila)
  // La locación de los pozos (el caso de borde de la topología) no tiene endpoint: los casos que la leen lo dicen.
  const conLocacion = c => (ins.pozos.some(p => p.campoId === c && M.LOC(c)(p.id)) ? [`insumos/${c}/locaciones.json`] : undefined)
  for (const c of todos) {
    const q = { campos: [c], ...rango(ultimo) }
    // Salud por parte: la de las bombas va en /vistas/bombas y la de las electrosumergibles en las filas de /vistas/pozos.
    casos.push(caso(`salud/bombas-${c}-${ultimo.mes}`, `Bombas de ${c} con la salud de cada parte, ${ultimo.mes}`, C.BOMBAS, q, EQ.pedirBombas([c], q.desde, q.hasta, ctx)))
    casos.push(caso(`salud/pozos-${c}-${ultimo.mes}`, `Pozos de ${c} con la salud de su electrosumergible, ${ultimo.mes}`, C.POZOS, q, DIF.pedirFilasPozos([c], q.desde, q.hasta, ctx), conEsp([c])))
    // Predicción: si la bomba se para ahora.
    for (const p of EQ.pedirPerfilesBomba(c))
      casos.push(caso(`prediccion/${c}-${p.equipo}`, `Si ${p.equipo} de ${c} se para ahora`, C.PREDICCION, { campo: c, equipo: p.equipo }, DIF.pedirPrediccion(p, ctx)))
    for (const m of cerrados)
      casos.push(caso(`asignacion/${c}-${m.mes}`, `Asignación por pozo de ${c}, ${m.mes}`, C.ASIGNACION, { campo: c, mes: m.mes }, L.asignacionPorPozo(c, m.mes, ctx)))
    // La tubería del campo y la del agua, lo que limitó cada día, y la topología con sus propuestas.
    const qc = { campo: c, ...rango(ultimo) }
    casos.push(caso(`choke/tuberia-${c}-${ultimo.mes}`, `La tubería de ${c}: lo que limita a esta hora y lo perdido por tramo en ${ultimo.mes}`, C.TUBERIA, qc, CHK.pedirTuberia(c, qc.desde, qc.hasta, ctx)))
    casos.push(caso(`choke/serie-${c}-${ultimo.mes}`, `Qué limitó cada día en ${c}, ${ultimo.mes}, y el aviso de cambio`, C.SERIE_CHOKE, qc, CHK.pedirSerieChoke(c, qc.desde, qc.hasta, ctx)))
    casos.push(caso(`choke/topologia-${c}`, `La topología que rige en ${c} (la que se deriva del registro), con el tramo de cada elemento`, C.TOPOLOGIA, { campo: c }, CHK.pedirTopologia(c, ctx), conLocacion(c)))
    casos.push(caso(`choke/propuestas-${c}`, `Lo que TRIM propone de la topología de ${c}`, C.PROPUESTAS_TOPOLOGIA, { campo: c }, CHK.pedirPropuestasTopologia(c, ctx), conLocacion(c)))
    casos.push(caso(`agua-choke/${c}`, `La tubería del agua de ${c} a esta hora`, C.TUBERIA_AGUA, { campo: c }, CHK.pedirTuberiaAgua(c, ctx, [CONF.versionInicial()])))
    // Lo que rige en las capacidades, lo que la revisión necesita del pasado y lo que encuentra (C-29).
    casos.push(caso(`choke/capacidades-${c}`, `Las capacidades de ${c}: lo que rige (del demo, sin firmar), lo máximo que ya pasó y la revisión`, C.CAPACIDADES, { campo: c }, CHK.pedirCapacidades(c, ctx, [CONF.versionInicial()])))
  }
  // Los escenarios (QA-A-07; C-29; C-08 punto 4): la misma cuenta con otra configuración firmada o con lo que
  // dijeron las personas. El contexto de un escenario de configuración es su última versión, como en un backend.
  const esc = Object.fromEntries(escenarios.map(e => [e.id, e]))
  const deEsc = (e, id, descripcion, ep, p, valor) => ({ ...caso(id, descripcion, ep, p, valor, [`insumos/escenarios/${e.id}.json`]), escenario: e.id })
  const mes = x => rango(L.calendario().find(m => m.mes === x))
  const h13 = { desde: new Date(L.calendario()[0].desde), hasta: M.AHORA }
  for (const id of ['capacidades-de-antes', 'cambio-de-limita', 'empate']) {
    // Una referencia generada antes de los escenarios no los trae: sus casos no se arman y el conteo pide regenerar.
    const e = esc[id], v = e?.versiones
    if (!e || !v?.length) continue
    const cx = { ...ctx, config: v.at(-1).config }
    const tub = (c, r) => deEsc(e, `escenarios/${id}/tuberia-${c}`, `${e.descripcion}. La tubería de ${c}`, C.TUBERIA, { campo: c, ...r }, CHK.pedirTuberia(c, r.desde, r.hasta, cx, v))
    const serie = (c, r, cual) => deEsc(e, `escenarios/${id}/serie-${c}-${cual}`, `${e.descripcion}. Qué limitó cada día en ${c} (${cual}), con lo estructural y el aviso de cambio`, C.SERIE_CHOKE, { campo: c, ...r }, CHK.pedirSerieChoke(c, r.desde, r.hasta, cx, v))
    const reparto = (cs, r, cual) => deEsc(e, `escenarios/${id}/reparto-${cs.join('+')}-${cual}`, `${e.descripcion}. Lo perdido por tramo y por escalón en ${cs.join(' y ')} (${cual}), con lo estructural, lo que cabía en la holgura y la eficiencia`, C.REPARTO_CHOKE, { campos: cs, ...r }, CHK.pedirRepartoChoke({ campos: cs, ...r }, cx, v))
    if (id === 'capacidades-de-antes') {
      casos.push(reparto(['ceiba', 'guacamayo'], h13, '13-meses'), serie('ceiba', mes('2026-03'), '2026-03'), serie('guacamayo', mes('2026-03'), '2026-03'), tub('ceiba', mes('2026-09')), tub('guacamayo', mes('2026-09')))
      for (const c of ['ceiba', 'guacamayo']) casos.push(deEsc(e, `escenarios/${id}/capacidades-${c}`, `${e.descripcion}. Las capacidades de ${c} y su revisión`, C.CAPACIDADES, { campo: c }, CHK.pedirCapacidades(c, cx, v)))
    } else if (id === 'cambio-de-limita') casos.push(serie('ceiba', { desde: mes('2026-04').desde, hasta: mes('2026-05').hasta }, '2026-04-a-2026-05'), tub('ceiba', mes('2026-10')))
    else casos.push(tub('ceiba', mes('2026-10')), serie('ceiba', mes('2026-09'), '2026-09'), reparto(['ceiba'], mes('2026-09'), '2026-09'))
  }
  const ec = esc.correcciones
  if (!ec?.guardadas) return { casos, filasVistas }
  const g = ec.guardadas
  const con = (id, descripcion, ep, p, valor) => deEsc(ec, `escenarios/correcciones/${id}`, `${ec.descripcion}. ${descripcion}`, ep, p, valor)
  for (const [c, x] of [['ceiba', '2026-09'], ['guacamayo', '2025-10'], ['morichal', '2026-09'], ['ceiba', '2026-10']]) {
    const q = { campos: [c], ...mes(x) }
    casos.push(con(`paradas-${c}-${x}`, `Paradas ANH de ${c}, ${x}`, C.PARADAS_ANH, q, ARB.pedirParadasAnh(q, ctx, g)))
    casos.push(con(`arbol-${c}-${x}-gestion`, `El árbol de ${c}, ${x}, en el orden de gestión`, C.ARBOL_CHOKE, { ...q, orden: 'gestion' }, CHK.pedirArbolChoke({ ...q, orden: 'gestion' }, ctx, g)))
    casos.push(con(`reparto-${c}-${x}`, `Lo perdido por tramo y por escalón en ${c}, ${x}: el primer nivel del árbol`, C.REPARTO_CHOKE, q, CHK.pedirRepartoChoke(q, ctx, undefined, g)))
  }
  const qce = { campos: ['ceiba'], ...mes('2026-09') }
  casos.push(con('arbol-ceiba-2026-09-circular', 'El árbol de La Ceiba, septiembre, en el orden de la circular', C.ARBOL_CHOKE, { ...qce, orden: 'circular' }, CHK.pedirArbolChoke({ ...qce, orden: 'circular' }, ctx, g)))
  casos.push(con('calidad-ceiba-2026-09', 'La calidad de la clasificación de La Ceiba, septiembre', C.CALIDAD_ANH, qce, ARB.pedirCalidadAnh(qce, ctx, g)))
  casos.push(con('tuberia-ceiba-2026-09', 'La tubería de La Ceiba, septiembre', C.TUBERIA, { campo: 'ceiba', ...mes('2026-09') }, CHK.pedirTuberia('ceiba', qce.desde, qce.hasta, ctx, undefined, g)))
  casos.push(con('serie-ceiba-2026-09', 'Qué limitó cada día en La Ceiba, septiembre', C.SERIE_CHOKE, { campo: 'ceiba', ...mes('2026-09') }, CHK.pedirSerieChoke('ceiba', qce.desde, qce.hasta, ctx, undefined, g)))
  casos.push(con('mensual-portafolio', 'Lo perdido por tramo cada mes en el portafolio', C.REPARTO_CHOKE_MENSUAL, { campos: todos }, CHK.pedirRepartoMensual(todos, ctx, undefined, g)))
  casos.push(con('base-ceiba-2026-10', 'Antes → con TRIM por tramo en La Ceiba, octubre (la base trae septiembre)', C.BASE_CHOKE, { campos: ['ceiba'], ...mes('2026-10') }, CHK.pedirBaseChoke({ campos: ['ceiba'], ...mes('2026-10') }, ctx, undefined, g)))
  return { casos, filasVistas }
}

/** Los casos de referencia/, sin el índice ni los insumos. */
const leerReferencia = () => readdirSync(DIR, { recursive: true })
  .filter(f => f.endsWith('.json') && f !== 'indice.json' && !f.startsWith('insumos')).sort()
  .map(f => JSON.parse(readFileSync(join(DIR, f), 'utf8')))

/** Mismo contenido, sin depender del orden entre campos (cada endpoint de
 *  insumo es por campo; el orden DENTRO de cada uno sí se conserva). */
const canonico = ins => JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(JSON.stringify(ins))).map(([k, v]) =>
  [k, Array.isArray(v) ? [...v].sort((a, b) => (`${a.campoId}|${a.id ?? a.mes}` < `${b.campoId}|${b.id ?? b.mes}` ? -1 : 1)) : v])))

if (modo === 'generar') {
  const { casos, insumos } = await conMotor(M => ({ casos: casosDe(M, escenariosDelMotor(M)).casos, insumos: exportarInsumos(M, M.ins) }))
  rmSync(DIR, { recursive: true, force: true })
  const escribir = (archivo, x) => { mkdirSync(join(archivo, '..'), { recursive: true }); writeFileSync(archivo, JSON.stringify(x) + '\n') }
  for (const c of casos) escribir(join(DIR, `${c.id}.json`), c)
  for (const i of insumos) escribir(join(DIR_INSUMOS, i.archivo), { endpoint: i.endpoint, respuesta: i.respuesta })
  writeFileSync(join(DIR, 'indice.json'), JSON.stringify({
    generado: 'node scripts/referencia.mjs generar', tolerancia: { relativa: TOL_REL, absoluta: TOL_ABS },
    regla: 'la respuesta contiene lo esperado (sin los campos que van ausentes cuando no aplican); null exige null; los registros cerrados traen sus claves; fechas como instante y con zona; el orden de las listas importa',
    insumos: insumos.map(i => ({ archivo: i.archivo, endpoint: i.endpoint })),
    casos: casos.map(c => ({ id: c.id, endpoint: c.endpoint, descripcion: c.descripcion, ...(c.requiere ? { requiere: c.requiere } : {}), ...(c.escenario ? { escenario: c.escenario } : {}) })),
  }, null, 1) + '\n')
  console.log(`${casos.length} casos y ${insumos.length} archivos de insumos en ${DIR}`)
} else {
  const todos = leerReferencia()
  if (!todos.length) { console.error(`no hay casos en ${DIR}: corra primero «npm run referencia»`); process.exit(1) }
  // Contra una API, un escenario a la vez (el backend lo carga antes); el motor los calcula todos.
  const referencia = modo === 'comparar' ? todos.filter(c => (c.escenario ?? undefined) === escenarioPedido) : todos
  if (modo === 'comparar') {
    const otros = [...new Set(todos.filter(c => c.escenario && c.escenario !== escenarioPedido).map(c => c.escenario))]
    if (otros.length) console.log(`(${todos.length - referencia.length} casos de ${escenarioPedido ? 'otros escenarios y del arranque' : 'escenarios'} no se piden: cargue el insumo de cada escenario y corra con --escenario=${otros.join(' | ')})`)
    if (escenarioPedido && !referencia.length) { console.error(`no hay casos del escenario «${escenarioPedido}»`); process.exit(2) }
  }
  // `malos`: casos que no coinciden; `aparte`: lo que falla fuera de los casos (deriva de insumos, conteo).
  let malos = 0, aparte = 0
  let motor = null
  if (modo === 'comprobar') {
    // Los casos se calculan con los insumos de los ARCHIVOS, como los cargaría
    // un backend; y esos archivos tienen que ser, sin perder nada, los del demo.
    const r = await conMotor(M => {
      const deriva = []
      if (canonico(M.ins) !== canonico(M.DEMO)) deriva.push('los insumos de referencia/insumos/ no son los de src/entities/datos/')
      // Los de arranque (catálogo, configuración) y las lecturas de las
      // electrosumergibles salen del código: este cotejo es el que ve si
      // cambiaron. Los demás salen de los mismos archivos, y por eso se
      // cotejan arriba contra los del demo.
      const exportados = exportarInsumos(M, M.ins)
      const indice = JSON.parse(readFileSync(join(DIR, 'indice.json'), 'utf8'))
      if (exportados.map(i => i.archivo).join() !== indice.insumos.map(i => i.archivo).join()) deriva.push('la lista de archivos de insumos cambió')
      else for (const i of exportados) {
        const disco = JSON.parse(readFileSync(join(DIR_INSUMOS, i.archivo), 'utf8'))
        if (disco.endpoint !== i.endpoint || JSON.stringify(disco.respuesta) !== JSON.stringify(i.respuesta)) deriva.push(`insumos/${i.archivo} no es lo que arma el motor de hoy`)
      }
      // Los escenarios, leídos de sus archivos: lo que cargaría un backend.
      const escenarios = escenariosDeArchivos(M.K, M.C)
      const faltan = escenariosDelMotor(M).map(e => e.id).filter(id => !escenarios.some(e => e.id === id))
      if (faltan.length) deriva.push(`faltan los escenarios ${faltan.join(', ')} en referencia/insumos/escenarios/`)
      const { casos, filasVistas } = casosDe(M, escenarios)
      const marcados = indice.casos.filter(c => c.requiere).map(c => `${c.id}:${c.requiere}`).join()
      if (marcados !== casos.filter(c => c.requiere).map(c => `${c.id}:${c.requiere}`).join()) deriva.push('los casos que leen lo que todavía no tiene endpoint o un escenario (las lecturas de las electrosumergibles, la locación de los pozos, los escenarios: «requiere» del índice) cambiaron')
      // Cada fila de REGLAS_ANH con al menos un caso (C-29), salvo las que el demo no puede producir.
      const filas = [...M.CL.REGLAS_ANH.filas.map(x => x.id), 'pendiente']
      const sinCaso = filas.filter(f => !filasVistas.has(f) && !SIN_CASO_EN_EL_DEMO.includes(f)), yaTiene = SIN_CASO_EN_EL_DEMO.filter(f => filasVistas.has(f))
      if (sinCaso.length) deriva.push(`estas filas de REGLAS_ANH no tienen ningún caso en referencia/anh: ${sinCaso.join(', ')} (agregue el mes y el campo que las traen en MESES_ANH)`)
      if (yaTiene.length) deriva.push(`estas filas de REGLAS_ANH ya tienen caso y siguen en SIN_CASO_EN_EL_DEMO: ${yaTiene.join(', ')} (sáquelas de la lista)`)
      return { casos, deriva }
    }, insumosDeArchivos)
    for (const d of r.deriva) { console.log(`  ✗ ${d}: regenerar con «npm run referencia»`); aparte++ }
    motor = new Map(r.casos.map(c => [c.id, c]))
    if (motor.size !== referencia.length) {
      console.log(`  ✗ el motor arma ${motor.size} casos y la referencia trae ${referencia.length}: regenerar con «npm run referencia»`)
      aparte++
    }
  }
  for (const caso of referencia) {
    let real
    if (motor) {
      if (!motor.has(caso.id)) { console.log(`  ✗ ${caso.id}: el motor ya no arma este caso`); malos++; continue }
      real = motor.get(caso.id).esperado
    } else {
      try {
        const r = await fetch(new URL(caso.endpoint, baseUrl), { headers: { accept: 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) } })
        if (!r.ok) { console.log(`  ✗ ${caso.id}: ${caso.endpoint} respondió ${r.status}`); malos++; continue }
        real = await r.json()
      } catch (e) { console.log(`  ✗ ${caso.id}: ${caso.endpoint} no respondió (${e.message})`); malos++; continue }
    }
    const d = diferencias(caso.esperado, real)
    if (d.length) { malos++; console.log(`  ✗ ${caso.id}${caso.requiere ? ` (lee también ${caso.requiere.join(', ')})` : ''}\n      ${d.slice(0, 8).join('\n      ')}`) }
  }
  console.log(`\n${referencia.length - malos} de ${referencia.length} casos de referencia coinciden${modo === 'comprobar' ? ' con el motor de hoy, calculados con los insumos de referencia/insumos/' : ` en ${baseUrl}`}.`)
  if (aparte) console.log(`Además, ${aparte} ${aparte === 1 ? 'falla' : 'fallas'} fuera de los casos (arriba).`)
  if (malos || aparte) process.exit(1)
}
