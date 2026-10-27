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
 *   node scripts/referencia.mjs comparar --base-url=URL --referencia=docs/backend/linea-base/v1/referencia   # contra la de v1
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
 *   node scripts/referencia.mjs comparar --base-url=URL --escrituras    # las escrituras rechazadas (ESCRIBEN: ver abajo)
 *
 * ESCRITURAS (referencia/escrituras/, C-08 punto 3): secuencias de POST del
 * árbol de paradas de la ANH (`/api/anh/paradas/…`) con el HTTP y el código del
 * contrato que tiene que dar cada uno (CONTRATO.md, «Las escrituras de la
 * clasificación ANH», C-22): 403, 404, 409, 422 y 400, y las escrituras
 * aceptadas (200) que los preparan («el jefe corrige; el supervisor cambia sin
 * motivo»). En el demo `src/shared/api/escrituras.ts` ES el servidor y da cada
 * resultado; `comprobar` lo vuelve a correr. Contra una API, `--escrituras`
 * manda los pasos en orden: las aceptadas ESCRIBEN en ese backend, así que va
 * contra uno recién cargado con el arranque (sin escrituras, y una sola vez);
 * cada caso toca filas y eventos que ningún otro toca. El rol de cada paso va en
 * la cabecera `x-rol` del prototipo y, con sesión, con el token de ese rol:
 * `--tokens=archivo.json` ({ "sup": "…", "jefe": "…" }, o TRIM_TOKENS) o, si no,
 * el de `--token`.
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
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const [modo, ...resto] = process.argv.slice(2)
// REFERENCIA_DIR o --referencia=: generar, comprobar o comparar en otra carpeta (una prueba en seco, sin
// tocar referencia/, o la referencia de la versión 1: docs/backend/linea-base/v1/referencia, C18).
const otraReferencia = resto.find(a => a.startsWith('--referencia='))?.slice('--referencia='.length)
const DIR = otraReferencia ? resolve(otraReferencia) : process.env.REFERENCIA_DIR ?? join(RAIZ, 'referencia')
const DIR_INSUMOS = join(DIR, 'insumos')
const baseUrl = resto.find(a => a.startsWith('--base-url='))?.slice('--base-url='.length)
// Un backend con sesión (CONTRATO.md, «Sesión»): sin credencial, todo da 401.
const token = resto.find(a => a.startsWith('--token='))?.slice('--token='.length) ?? process.env.TRIM_TOKEN
// Los casos de un escenario piden que el backend cargue antes su insumo (insumos/escenarios/<id>.json):
// `comparar` pide los de arranque y, con --escenario=<id>, solo los de ese escenario.
const escenarioPedido = resto.find(a => a.startsWith('--escenario='))?.slice('--escenario='.length)
// Las escrituras rechazadas: con --escrituras, `comparar` manda solo esas (escriben en el backend).
const conEscrituras = resto.includes('--escrituras')
const archivoTokens = resto.find(a => a.startsWith('--tokens='))?.slice('--tokens='.length) ?? process.env.TRIM_TOKENS
const tokensPorRol = archivoTokens ? JSON.parse(readFileSync(archivoTokens, 'utf8')) : {}
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
    // D3 (5E·H9, 5E·H30): el factor de medición firmado, lo que TRIM propone en Guacamayo y El Palmar, desde el comienzo.
    { id: 'factor-de-medicion', descripcion: 'El factor de medición firmado desde el comienzo en Guacamayo y en El Palmar, con lo que TRIM propone (la mediana de lo real ÷ las pruebas en los días sin paradas de los últimos 90): los pozos se leen con él y la eficiencia de septiembre se puede creer',
      versiones: [firma(1, DESDE_SIEMPRE, ['guacamayo', 'palmar'].map(c => { const p = M.CHK.pedirCapacidades(c, ctx, [v0]).factorMedicionPropuesto; return { campoId: c, factorMedicion: { valor: p.valor, porque: p.texto } } }),
        'El factor de medición de Guacamayo y El Palmar')] },
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

/* ───── Escrituras rechazadas (C-08, punto 3): el HTTP y el código del contrato ───── */

/** A qué escritura del servidor del demo va cada ruta (`escrituras.ts`). */
function escribirEnElMotor(M, paso) {
  const q = { rolId: paso.rol }
  if (paso.endpoint === '/api/anh/paradas/confirmar') return M.E.confirmarParadasAnh(q, paso.cuerpo)
  // A3 · Las acciones que faltan: «Contestar» en 1 toque (la parte y lo que vio), el cierre de la
  // orden, la respuesta de la ANH y la conversión del árbol.
  const a3 = escribirA3(M, q, paso)
  if (a3) return a3
  // A2 · El registro de pérdidas.
  if (paso.endpoint === '/api/perdidas') return M.PER.registrarPerdida(q, paso.cuerpo)
  const m = /^\/api\/anh\/paradas\/([^/]+)\/(clasificacion|yacimiento|respuesta|revision)$/.exec(paso.endpoint)
  if (!m) throw new Error(`escritura sin servidor en el demo: ${paso.endpoint}`)
  const f = { clasificacion: M.E.clasificarParada, yacimiento: M.E.declararYacimientoAnh, respuesta: M.E.responderPreguntaAnh, revision: M.E.revisarParadaAnh }[m[2]]
  return f(q, decodeURIComponent(m[1]), paso.cuerpo)
}
/** A3 · Las escrituras de las acciones que faltan, en el servidor del demo; undefined si la ruta no es de A3. */
function escribirA3(M, q, paso) {
  const e = paso.endpoint, c = paso.cuerpo
  if (e === '/api/anh/respuestas') return M.E.registrarRespuestaAnh(q, c)
  if (e === '/api/anh/conversion/importar') return M.E.importarConversion(q, c)
  let m = /^\/api\/paradas\/([^/]+)\/(respuesta|vio)$/.exec(e)
  if (m) return m[2] === 'vio' ? M.E.responderLoQueVio(q, decodeURIComponent(m[1]), c) : M.E.responderParada(q, c)
  m = /^\/api\/sap\/ordenes\/([^/]+)\/cierre$/.exec(e)
  if (m) return M.E.cerrarOrden(q, decodeURIComponent(m[1]), c)
  return undefined
}
/** Lo que se compara de una respuesta: el HTTP y, en un rechazo, el código del contrato. */
const resultadoDe = r => (r.ok ? { estado: 200 } : { estado: r.estado ?? 0, ...(r.codigo ? { codigo: r.codigo } : {}) })

/** Las escrituras de cada caso, armadas con el servidor del demo a partir del
 *  arranque (sin nada escrito): cada paso se arma con lo que la pantalla vería en
 *  ese momento (la cadena, las filas de la cascada) y se manda; su resultado es lo
 *  esperado. Las aceptadas tienen que dar 200 y la última, un rechazo. Cada caso
 *  toca eventos y raíces que ningún otro toca: contra una API, sin volver al
 *  arranque entre caso y caso, cada uno empieza donde lo dejaría el demo. */
async function escriturasDelMotor(M) {
  const { SES, ARB, CAT2, L, AHORA } = M
  // `cambiarSesion` mezcla: lo que el arranque no trae (lo escrito por A2 y A3) se vacía a propósito entre casos y al final.
  const foto = { cierresOrden: undefined, respuestasAnh: undefined, perdidas: undefined, ...SES.sesion() }
  const cal = L.calendario(), cerrado = cal.filter(L.mesCerrado).at(-1)
  const ver = id => ARB.pedirParadaAnh(id, SES.sesion().ctx, SES.sesion().clasificacionesAnh)
  const cadena = id => ARB.cadenaVista(ver(id).clasificacion)
  const historia = c => ARB.pedirParadasAnh({ campos: [c], desde: new Date(cal[0].desde), hasta: AHORA }, foto.ctx, foto.clasificacionesAnh)
  const ceiba = historia('ceiba').filter(p => !p.exceso)
  const usados = new Set()
  const libre = p => !usados.has(p.eventoId) && !usados.has(p.raiz)
  const tomar = (...ps) => { for (const p of ps) { usados.add(p.eventoId); usados.add(p.raiz) } return ps[0] }
  const completa = p => ['responsable', 'choke', 'impacto', 'planeacion', 'n1', 'n2'].every(x => p.clasificacion[x])
  const otroN2 = p => CAT2.N2_CIRCULAR.find(n => n.n1 === p.clasificacion.n1.valor && n.codigo !== p.clasificacion.n2.valor)?.codigo
  const otroResp = v => (v === 'op-operacion' ? 'op-mantenimiento' : 'op-operacion')
  const porRaiz = new Map()
  for (const p of ceiba) if (p.raiz !== p.eventoId) (porRaiz.get(p.raiz) ?? porRaiz.set(p.raiz, []).get(p.raiz)).push(p)
  const cascada = n => { const [r, fs] = [...porRaiz.entries()].find(([r, fs]) => !usados.has(r) && new Set(fs.map(f => f.eventoId)).size >= n && fs.every(f => libre(f) && completa(f))) ?? []; if (!r) throw new Error(`el demo no trae una cascada de ${n} eventos libre`); tomar(...fs); return fs }
  const una = (f = () => true) => { const p = ceiba.find(x => libre(x) && x.raiz === x.eventoId && completa(x) && x.estado === 'propuesta' && f(x)); if (!p) throw new Error('el demo no trae una parada libre'); return tomar(p) }
  const clasif = id => `/api/anh/paradas/${encodeURIComponent(id)}/clasificacion`
  const ruta = (id, que) => `/api/anh/paradas/${encodeURIComponent(id)}/${que}`
  // Una fila sola que cada rechazo de forma y de permiso usa (los rechazos no escriben: la comparten).
  const F = una()
  const morichal = historia('morichal').find(p => !p.exceso)
  const R1 = cascada(3), idsR1 = R1.map(p => p.id)
  const R2 = cascada(2), A2 = R2[0], B2 = R2.find(f => f.eventoId !== A2.eventoId)
  const K = una(p => !!otroN2(p))
  const conCorte = ceiba.find(p => libre(p) && p.propuesta.preguntas.some(q => q.id === 'corte'))
  if (!conCorte) throw new Error('el demo no trae una parada con la pregunta del corte libre')
  tomar(conCorte)
  const delMes = ARB.pedirParadasAnh({ campos: ['ceiba'], desde: new Date(cerrado.desde), hasta: new Date(cerrado.hasta) }, foto.ctx, foto.clasificacionesAnh)
  const lote = [...ARB.gruposPorCadena(delMes.filter(p => libre(p) && !p.exceso)).values()].map(g => g.filter((p, i) => g.findIndex(x => x.raiz === p.raiz) === i)).find(g => g.length >= 2)?.slice(0, 2)
  if (!lote) throw new Error('el demo no trae dos paradas distintas con la misma cadena libres')
  tomar(...lote)
  const C = (id, descripcion, ...pasos) => ({ id, descripcion, pasos })
  const paso = (rol, endpoint, cuerpo) => () => ({ metodo: 'POST', endpoint, rol, cuerpo: typeof cuerpo === 'function' ? cuerpo() : cuerpo })
  const definidos = [
    C('403-sin-capacidad', 'El gerente (sin anh:clasificar) clasifica una parada',
      paso('ger', clasif(F.id), () => ({ pasos: { impacto: 'diferida' }, cadena: cadena(F.id) }))),
    C('403-rol-desconocido', 'Un rol que no es del producto (cont, de la versión 2) clasifica una parada (C-14)',
      paso('cont', clasif(F.id), () => ({ pasos: { impacto: 'diferida' }, cadena: cadena(F.id) }))),
    C('403-paso-ajeno', 'El operador corrige el detalle (N2): no es de su terreno (PASOS_QUE_DECLARA)',
      paso('oper', clasif(F.id), () => ({ pasos: { n2: otroN2(ver(F.id)) ?? 'NP_SUB/falla-esp' }, cadena: cadena(F.id) }))),
    C('403-paso-ajeno-confirmar', 'El operador confirma «Dónde se trabó» (PASOS_QUE_CONFIRMA)',
      paso('oper', '/api/anh/paradas/confirmar', () => ({ ids: [F.id], cadena: cadena(F.id), pasos: ['choke'] }))),
    C('403-sin-capacidad-yacimiento', 'El supervisor pone «En el yacimiento» (solo producción y confiabilidad, anh:yacimiento)',
      paso('sup', ruta(F.id, 'yacimiento'), () => ({ evidencia: 'prueba', cadena: cadena(F.id) }))),
    C('404-no-encontrado', 'El operador (solo La Ceiba) clasifica una parada de Morichal: la misma respuesta que una que no existe (C-20)',
      paso('oper', clasif(morichal.id), { pasos: { impacto: 'diferida' } })),
    C('400-peticion-invalida', 'Un paso con un número donde va un texto (C-11)',
      paso('sup', clasif(F.id), { pasos: { impacto: 1 } })),
    C('409-cadena-cambio', 'La cadena que vio la persona ya no es la de la fila',
      paso('sup', clasif(F.id), { pasos: { impacto: 'diferida' }, cadena: 'otra cadena' })),
    C('422-clasificacion-incoherente', 'Una causa que no es de las 20 de la circular',
      paso('sup', clasif(F.id), () => ({ pasos: { n1: 'NP_INVENTADA' }, cadena: cadena(F.id) }))),
    C('422-cascada-sin-ids', '«Para la cascada» sin las filas que mostró la pantalla',
      paso('sup', clasif(R1[0].id), () => ({ pasos: { impacto: 'diferida' }, aplicarALaCascada: true, cadena: cadena(R1[0].id) }))),
    C('409-cascada-cambio', '«Para la cascada» cuando la raíz trae un evento que la pantalla no mostró',
      paso('sup', clasif(R1[0].id), () => ({ pasos: { impacto: 'diferida' }, aplicarALaCascada: true, ids: idsR1.filter(id => !id.startsWith(`${R1.at(-1).eventoId}@`)), cadena: cadena(R1[0].id) }))),
    C('409-cambia-a-otra-persona', 'El jefe dice «Quién» de un pozo de la cascada (para su evento, con motivo); el supervisor cambia «Quién» para la cascada desde otro pozo sin motivo',
      paso('jefe', clasif(B2.id), () => ({ pasos: { responsable: otroResp(ver(B2.id).clasificacion.responsable.valor) }, motivo: 'El equipo es de operación', aplicarAlEvento: true, cadena: cadena(B2.id) })),
      paso('sup', clasif(A2.id), () => ({ pasos: { responsable: otroResp(ver(B2.id).clasificacion.responsable.valor) }, aplicarALaCascada: true, ids: R2.map(p => p.id), cadena: cadena(A2.id) }))),
    C('422-falta-motivo', 'El jefe corrige el detalle (para su evento, con motivo); el supervisor cambia «¿Planeada?» sin motivo, y eso retiraría la causa del jefe (C-05)',
      paso('jefe', clasif(K.id), () => ({ pasos: { n2: otroN2(ver(K.id)) }, motivo: 'Se abrió el equipo: fue otra cosa', aplicarAlEvento: true, cadena: cadena(K.id) })),
      paso('sup', clasif(K.id), () => ({ pasos: { planeacion: ver(K.id).clasificacion.planeacion.valor === 'planeada' ? 'no-planeada' : 'planeada' }, aplicarAlEvento: true, cadena: cadena(K.id) }))),
    C('409-pregunta-cerrada', 'El operador contesta «¿De dónde vino el corte?»; el supervisor contesta la misma pregunta después',
      paso('oper', ruta(conCorte.id, 'respuesta'), () => ({ pregunta: 'corte', opcion: ver(conCorte.id).propuesta.preguntas.find(q => q.id === 'corte').opciones[0].texto, aplicarAlEvento: true, cadena: cadena(conCorte.id) })),
      paso('sup', ruta(conCorte.id, 'respuesta'), { pregunta: 'corte', opcion: 'Del campo: pórtico, red de media o subestación', aplicarAlEvento: true })),
    C('422-pregunta-ajena', 'Una pregunta que TRIM no tiene (C-18)',
      paso('oper', ruta(F.id, 'respuesta'), { pregunta: 'no-existe', opcion: 'Sí' })),
    C('422-texto-largo', '«Algo está mal» con un motivo de 501 caracteres (C-12)',
      paso('oper', ruta(F.id, 'revision'), () => ({ motivo: 'x'.repeat(501), cadena: cadena(F.id) }))),
    C('422-texto-corto', '«Algo está mal» sin decir qué (un motivo de 2 caracteres)',
      paso('oper', ruta(F.id, 'revision'), () => ({ motivo: 'no', cadena: cadena(F.id) }))),
    C('409-lote-sin-pasos', 'El supervisor confirma en lote dos paradas con la misma cadena; el mismo lote otra vez no sube ningún paso (C-19)',
      paso('sup', '/api/anh/paradas/confirmar', () => ({ ids: lote.map(p => p.id), cadena: cadena(lote[0].id) })),
      paso('sup', '/api/anh/paradas/confirmar', () => ({ ids: lote.map(p => p.id), cadena: cadena(lote[0].id) }))),
    // A3 · Las acciones que faltan (los rechazos de cada escritura nueva, con su HTTP y su código).
    ...casosA3(M, foto, C, paso),
  ]
  const casos = []
  try {
    for (const c of definidos) {
      SES.cambiarSesion(foto)
      const pasos = []
      for (const f of c.pasos) {
        const x = f()
        pasos.push({ ...x, esperado: resultadoDe(await escribirEnElMotor(M, x)) })
      }
      const malos = pasos.slice(0, -1).filter(x => x.esperado.estado !== 200)
      if (malos.length || pasos.at(-1).esperado.estado === 200)
        throw new Error(`escrituras/${c.id}: lo que prepara tiene que pasar y lo último tiene que rechazarse (${pasos.map(x => JSON.stringify(x.esperado)).join(' → ')})`)
      casos.push({ id: c.id, descripcion: c.descripcion, pasos })
    }
  } finally { SES.cambiarSesion(foto) }
  return casos
}

/** A3 · Los casos de las escrituras nuevas. Cada uno toca lo suyo: los eventos de la
 *  parte y lo que vio, la orden de K-101 (solo rechazos: no se cierra), los días de la
 *  respuesta de la ANH y la carga de la conversión (que no escribe). */
function casosA3(M, foto, C, paso) {
  const preguntas = M.DIF.pedirPreguntas(['ceiba'], foto.ctx).filter(p => p.pide)
  const conCat = p => M.EQ.pedirCatalogoDeDanos(p.campoId, p.equipo)
  const bomba = preguntas.find(p => p.sobre === 'bomba' && conCat(p)), esp = preguntas.find(p => conCat(p)?.clase === 'bomba-electrosumergible')
  const sinCat = preguntas.find(p => !conCat(p))
  if (!bomba || !esp || !sinCat) throw new Error('el demo no trae en La Ceiba una bomba, una electrosumergible y un pozo sin catálogo por identificar')
  const ordenes = M.SAP.pedirOrdenesSap(M.CAMPOS.map(c => c.id), foto.ctx)
  const abierta = ordenes.find(o => o.campoId === 'ceiba' && ['REL', 'PCNF'].includes(o.estado) && o.tecnico === 'tec')
  const cerrada = ordenes.find(o => o.campoId === 'ceiba' && o.estado === 'TECO' && o.tecnico === 'tec')
  const ajena = ordenes.find(o => o.campoId !== 'ceiba')
  if (!abierta || !cerrada || !ajena) throw new Error('el demo no trae una orden abierta y una cerrada del técnico en La Ceiba, y una de otro campo')
  const vio = ev => `/api/paradas/${encodeURIComponent(ev)}/vio`, resp = ev => `/api/paradas/${encodeURIComponent(ev)}/respuesta`
  const cierre = n => `/api/sap/ordenes/${encodeURIComponent(n)}/cierre`
  const trabajo = { actividad: 'ajuste', inicio: '2026-10-02T10:00:00-05:00', fin: '2026-10-02T12:00:00-05:00' }
  const parteDe = p => conCat(p).partes[0].id
  return [
    C('400-vio-peticion-invalida', '«Lo que vio» con un número donde va el modo', paso('oper', vio(bomba.id), { modo: 1 })),
    C('403-vio-sin-capacidad', 'El gerente (sin causa:declarar) dice lo que vio', paso('ger', vio(bomba.id), { modo: 'ELP' })),
    C('404-vio-no-encontrado', '«Lo que vio» de una parada que no está en el registro del PLC', paso('oper', vio('EV-NO-EXISTE'), { modo: 'ELP' })),
    C('422-vio-sin-parte', '«Lo que vio» de una parada que nadie ha contestado: va con la parte', paso('oper', vio(sinCat.id), { modo: 'ELP' })),
    C('409-vio-ya-dicho', 'El operador contesta la parte en 1 toque y lo que vio; el técnico dice otra cosa después: lo que vio se dice una vez (D1)',
      paso('oper', resp(bomba.id), { evento: bomba.id, campoId: bomba.campoId, equipo: bomba.equipo, texto: '', parte: parteDe(bomba) }),
      paso('oper', vio(bomba.id), { modo: 'ELP' }),
      paso('tec', vio(bomba.id), { modo: 'VIB' })),
    C('422-vio-modo-ajeno', 'El operador contesta la parte de una electrosumergible en 1 toque; lo que vio no es de esa parte',
      paso('oper', resp(esp.id), { evento: esp.id, campoId: esp.campoId, equipo: esp.equipo, texto: '', parte: parteDe(esp) }),
      paso('oper', vio(esp.id), { modo: 'NO-EXISTE' })),
    C('400-cierre-peticion-invalida', 'El cierre con las lecturas en un texto', paso('tec', cierre(abierta.numero), { ...trabajo, lecturas: 'PT-1011=118' })),
    C('403-cierre-sin-capacidad', 'El operador (sin orden:cerrar) cierra una orden', paso('oper', cierre(abierta.numero), trabajo)),
    C('404-cierre-no-encontrado', 'El técnico cierra una orden que no está en SAP', paso('tec', cierre('00000000'), trabajo)),
    C('403-cierre-sin-permiso', 'El técnico (solo La Ceiba) cierra una orden de otro campo', paso('tec', cierre(ajena.numero), trabajo)),
    C('409-cierre-ya-cerrada', 'El técnico cierra una orden que SAP ya tiene cerrada (TECO)', paso('tec', cierre(cerrada.numero), trabajo)),
    C('422-cierre-parte-ajena', `El técnico cierra la orden de ${abierta.equipo}, que no tiene partes en el catálogo, con una parte`, paso('tec', cierre(abierta.numero), { ...trabajo, parte: 'sello' })),
    C('422-cierre-horas-invalidas', 'El técnico cierra con la hora de fin antes de la de inicio', paso('tec', cierre(abierta.numero), { ...trabajo, inicio: trabajo.fin, fin: trabajo.inicio })),
    C('400-respuesta-anh-peticion-invalida', 'La respuesta de la ANH con un número donde va el estado', paso('reg', '/api/anh/respuestas', { campoId: 'ceiba', dia: '2026-10-01', estado: 1, recibida: '2026-10-02T07:20:00-05:00' })),
    C('403-respuesta-anh-sin-capacidad', 'Producción (sin anh:enviar) registra la respuesta de la ANH', paso('prod', '/api/anh/respuestas', { campoId: 'ceiba', dia: '2026-10-01', estado: 'aceptado', recibida: '2026-10-02T07:20:00-05:00' })),
    C('404-respuesta-anh-campo-desconocido', 'La respuesta de la ANH de un campo que no está en el registro', paso('reg', '/api/anh/respuestas', { campoId: 'no-existe', dia: '2026-10-01', estado: 'aceptado', recibida: '2026-10-02T07:20:00-05:00' })),
    C('422-respuesta-anh-falta-motivo', 'Un rechazo de la ANH sin su motivo de la lista', paso('reg', '/api/anh/respuestas', { campoId: 'ceiba', dia: '2026-10-01', estado: 'rechazado', recibida: '2026-10-02T07:20:00-05:00' })),
    C('409-respuesta-anh-ya-aceptada', 'La ANH acepta el reporte de un día; después se registra un rechazo del mismo día',
      paso('reg', '/api/anh/respuestas', { campoId: 'ceiba', dia: '2026-09-30', estado: 'aceptado', recibida: '2026-10-01T06:50:00-05:00' }),
      paso('reg', '/api/anh/respuestas', { campoId: 'ceiba', dia: '2026-09-30', estado: 'rechazado', motivo: 'V-07', recibida: '2026-10-01T07:20:00-05:00' })),
    C('400-conversion-peticion-invalida', 'La conversión del árbol con un número donde va el texto', paso('adm', '/api/anh/conversion/importar', { campo: 'ceiba', texto: 3 })),
    C('403-conversion-sin-capacidad', 'Producción (sin config:firmar) carga la conversión del árbol', paso('prod', '/api/anh/conversion/importar', { campo: 'ceiba', texto: 'OP-1;Falla;NP_SUB;Falla ESP' })),
    C('404-conversion-campo-desconocido', 'La conversión del árbol de un campo que no está en el registro', paso('adm', '/api/anh/conversion/importar', { campo: 'no-existe', texto: 'OP-1;Falla;NP_SUB;Falla ESP' })),
    C('422-conversion-archivo-vacio', 'La conversión del árbol con el archivo vacío', paso('adm', '/api/anh/conversion/importar', { campo: 'ceiba', texto: '  ' })),
    // A2 · POST /api/perdidas: solo rechazos que no dependen de los ids de otro registro (el consecutivo es del servidor).
    ...perdidasRechazadas(C, paso),
  ]
}

/** A2 · Los rechazos de `POST /api/perdidas`, con el HTTP y el código del contrato (entities/perdidas.ts, `aceptarPerdida`). */
function perdidasRechazadas(C, paso) {
  const p = { campoId: 'ceiba', tipo: 'pitera', tramo: 'pozo', donde: 'Línea de flujo de LC-07', inicio: '2026-10-02T09:10:00-05:00', fin: '2026-10-02T09:40:00-05:00',
    volumen: { bbl: 3.5, fuente: 'estimado', como: 'Charco de 3 × 2 m, de unos 2 cm' } }
  const r = (rol, cuerpo) => paso(rol, '/api/perdidas', cuerpo)
  return [
    C('400-perdida-peticion-invalida', 'Una pérdida con el volumen en texto', r('oper', { ...p, volumen: { ...p.volumen, bbl: '3,5' } })),
    C('403-perdida-sin-capacidad', 'El técnico (sin perdidas:registrar) registra una pérdida', r('tec', p)),
    C('403-perdida-campo-ajeno', 'El operador (solo La Ceiba) registra una pérdida en Morichal Norte', r('oper', { ...p, campoId: 'morichal' })),
    C('404-perdida-campo-desconocido', 'Una pérdida de un campo que no está en el registro', r('oper', { ...p, campoId: 'no-existe' })),
    C('422-perdida-sin-volumen', 'Una pérdida sin barriles ni gas', r('oper', { ...p, volumen: { ...p.volumen, bbl: 0 } })),
    C('422-perdida-sin-como', 'Una pérdida sin decir cómo se estimó el volumen', r('oper', { ...p, volumen: { ...p.volumen, como: 'ok' } })),
    C('422-perdida-en-el-futuro', 'Una pérdida que empieza mañana', r('sup', { ...p, inicio: '2026-10-03T09:10:00-05:00', fin: null })),
    C('404-perdida-desconocida', 'Corregir una pérdida que no está registrada', r('prod', { ...p, corrige: 'PER-ceiba-9999', motivo: 'Se aforó el tanque' })),
  ]
}

/** Vuelve a mandar los pasos guardados al servidor del demo, desde el arranque: lo que da hoy. */
async function escriturasEnElMotor(M, casos) {
  // `cambiarSesion` mezcla: lo que el arranque no trae (lo escrito por A2 y A3) se vacía a propósito entre casos y al final.
  const foto = { cierresOrden: undefined, respuestasAnh: undefined, perdidas: undefined, ...M.SES.sesion() }
  try {
    const out = []
    for (const c of casos) {
      M.SES.cambiarSesion(foto)
      const pasos = []
      for (const x of c.pasos) pasos.push(resultadoDe(await escribirEnElMotor(M, x)))
      out.push({ id: c.id, pasos })
    }
    return out
  } finally { M.SES.cambiarSesion(foto) }
}

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
      CAT2: await cargar('/src/entities/anh-catalogo.ts'),
      // El servidor del demo (las escrituras) y su sesión: para las escrituras rechazadas.
      SES: await cargar('/src/shared/api/sesion.ts'), E: await cargar('/src/shared/api/escrituras.ts'),
      // C5 · Las vistas nuevas de la experiencia v2: La planta viva (C2), Hoy (C3) y Resultados (C5).
      PVA: await cargar('/src/shared/api/plantaViva.ts'), HOYA: await cargar('/src/shared/api/hoy.ts'),
      RSA: await cargar('/src/shared/api/resultados.ts'), USR: await cargar('/src/entities/usuarios.ts'),
      EQT: await cargar('/src/shared/api/equiposTecnico.ts'), // C4 · Equipos (la lista y el nivel 3)
      BAL: await cargar('/src/shared/api/balance.ts'), PER: await cargar('/src/shared/api/perdidas.ts'), // A2 · Balance y pérdidas
      AC: await cargar('/src/shared/api/acciones.ts'), // A3 · Las acciones que faltan
      CE: await cargar('/src/shared/api/configuracionEstado.ts'), // A1 · M8: el estado de la configuración
      RGA: await cargar('/src/shared/api/regulatorio.ts'), // A1 · E15: el reporte a la ANH (no tenía caso)
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
    // A1 · E15: el reporte a la ANH del período (¿se puede publicar?, las paradas sin causa, quién las debe y la hora límite), sin nada dicho.
    casos.push(caso(`anh/reporte-${nombre}-${ultimo.mes}`, `El reporte a la ANH de ${nombre}, ${ultimo.mes}: ¿se puede publicar?, las paradas sin causa y quién las debe`, C.REPORTE_ANH, q, M.RGA.pedirReporteAnh(q, ctx, {})))
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
  // 5E·H37: el umbral de cierre de la NSTA (lo sin explicar ≤ 2,5 % del potencial, `cuadra`) puesto a prueba. En un
  // mes entero lo sin explicar es 0; en un día no: es el inventario del tanque de venta (La Ceiba, 22-sep: 88 bbl,
  // 0,8 %). En dos horas de ese día, con P-201B parada, pasa el 2,5 %: el fiscal es diario, lo real se reparte
  // parejo por hora y lo diferido de esas horas no. Los escenarios no sirven aquí: lo sin explicar sale del libro.
  for (const [id, descripcion, desde, hasta] of [
    ['reparto-ceiba-2026-09-22', 'Lo perdido por tramo y por escalón en La Ceiba el 22 de septiembre (un día): lo sin explicar no es 0, es el inventario del tanque de venta, y cuadra', '2026-09-22T00:00:00-05:00', '2026-09-23T00:00:00-05:00'],
    ['reparto-ceiba-2026-09-22-12a14', 'Lo perdido por tramo y por escalón en La Ceiba el 22 de septiembre de 12:00 a 14:00, con P-201B parada: lo sin explicar pasa el 2,5 % del potencial (no cuadra), porque el fiscal es diario', '2026-09-22T12:00:00-05:00', '2026-09-22T14:00:00-05:00'],
  ]) {
    const q = { campos: ['ceiba'], desde: new Date(desde), hasta: new Date(hasta) }
    casos.push(caso(`choke/${id}`, descripcion, C.REPARTO_CHOKE, q, CHK.pedirRepartoChoke(q, ctx)))
  }
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
    // A1 · M8: «N de M pasos listos» de la configuración del campo, con la configuración de arranque (nada firmado).
    casos.push(caso(`configuracion/estado-${c}`, `El estado de la configuración de ${c}: cada paso, listo o no, y lo primero que falta`, C.ESTADO_CONFIGURACION, { campo: c }, M.CE.pedirEstadoConfiguracion(c, ctx)))
  }
  // A3 · Las acciones que faltan, con el arranque (sin nada escrito): el tiempo fuera en sus 5 tramos
  // (`tramos` de /vistas/relojes: detección y administrativo de los avisos y las órdenes, la reparación de
  // las horas de SAP, la logística y el arranque sin dato hasta el cierre en el teléfono), y la respuesta de
  // la ANH y la conversión del árbol, vacías (la pantalla dice «sin respuesta registrada» y «sin tabla»).
  {
    const historia = { desde: new Date(L.calendario()[0].desde), hasta: new Date(L.calendario().at(-1).hasta) }
    for (const grupo of [['ceiba'], todos]) {
      const nombre = grupo.length === 1 ? grupo[0] : 'portafolio'
      const qh = { campos: grupo, ...historia }
      casos.push(caso(`sap/relojes-${nombre}-historia`, `Los relojes de las fallas cerradas de ${nombre} en toda la historia, con el tiempo fuera en sus 5 tramos`, C.RELOJES, qh, SAP.pedirRelojes(grupo, qh.desde, qh.hasta, ctx)))
    }
    const q = { campos: ['ceiba'], ...rango(L.calendario().at(-1)) }
    casos.push(caso(`anh/respuestas-ceiba-${L.calendario().at(-1).mes}`, 'Las respuestas de la ANH de La Ceiba en el mes en curso, sin ninguna registrada', C.RESPUESTAS_ANH, q, M.AC.pedirRespuestasAnh(q, [])))
    casos.push(caso('anh/conversion-ceiba', 'La conversión del árbol de La Ceiba, sin tabla firmada', C.CONVERSION_ANH, { campo: 'ceiba' }, M.AC.pedirConversionAnh('ceiba', ctx, [CONF.versionInicial()])))
  }
  // C5 · Las vistas nuevas de la experiencia v2, con la configuración de arranque y sin nada dicho por una persona:
  // La planta viva por momento (C2), Hoy por rol (C3), lo de hoy de cada equipo (de donde sale la franja de
  // condiciones de la cabecera, C1, junto con /vistas/riesgo) y Resultados por rol (C5).
  {
    const v0 = [CONF.versionInicial()]
    const sesionHoy = { ctx, versiones: v0, usuarios: M.USR.USUARIOS_INICIALES }
    for (const grupo of [['ceiba'], ['morichal'], todos]) {
      const nombre = grupo.length === 1 ? grupo[0] : 'portafolio'
      const q = { campos: grupo, ...rango(ultimo) }
      for (const momento of ['antes', 'durante', 'despues'])
        casos.push(caso(`planta-viva/${nombre}-${ultimo.mes}-${momento}`, `La planta viva de ${nombre} en el momento «${momento}», con ${ultimo.mes} como período`, C.PLANTA_VIVA, { ...q, momento },
          M.PVA.pedirPlantaViva({ ...q, momento }, ctx, v0, {}), conEsp(grupo)))
      casos.push(caso(`franja/equipos-hoy-${nombre}`, `Lo de hoy de cada equipo de ${nombre} (con /vistas/riesgo, la franja de condiciones de la cabecera)`, C.EQUIPOS_HOY, { campos: grupo }, EQ.pedirEquiposDeHoy(grupo, ctx)))
      for (const rol of ['sup', 'oper', 'tec', 'jefe', 'conf', 'prod'])
        casos.push(caso(`hoy/${rol}-${nombre}`, `Hoy del rol ${rol} en ${nombre}: sus tareas en su orden, su cifra y su frase`, C.HOY, { rol, campos: grupo },
          M.HOYA.pedirHoy({ rol, campos: grupo }, sesionHoy), conEsp(grupo)))
      casos.push(caso(`equipos/lista-${nombre}`, `La lista de Equipos de ${nombre} (C4): cada equipo con su condición, «¿Lo vigila TRIM?» y su cifra, en su orden`, C.LISTA_EQUIPOS, { campos: grupo },
        M.EQT.pedirListaEquipos(grupo, ctx, v0), conEsp(grupo)))
      for (const rol of ['ger', 'prod', 'jefe', 'conf', 'reg'])
        casos.push(caso(`resultados/${rol}-${nombre}-${ultimo.mes}`, `Resultados del rol ${rol} en ${nombre}, ${ultimo.mes}: la cifra contra el máximo, el mes a mes y lo de su rol`, C.RESULTADOS, { ...q, rol },
          M.RSA.pedirResultados({ ...q, rol }, { ctx, versiones: v0 }), conEsp(grupo)))
    }
    // El nivel 3 de los equipos que la imagen 4 y las pruebas miran (C4): una bomba parada, sus hermanas sin
    // instrumento, una en marcha, un servicio, una electrosumergible y un pozo.
    for (const [c, e] of [['ceiba', 'P-201B'], ['ceiba', 'P-201A'], ['morichal', 'P-201B'], ['ceiba', 'K-101'], ['morichal', 'MN-07'], ['ceiba', 'LC-21']])
      casos.push(caso(`equipos/nivel3-${c}-${e}`, `El nivel 3 de ${e} en ${c} (C4): la cifra, el bloqueo, sus señales, su tren de agua y su historia`, C.NIVEL_EQUIPO, { campo: c, equipo: e },
        M.EQT.pedirNivelEquipo(c, e, ctx, v0) ?? null, conEsp([c])))
  }
  // A2 · El balance del choke (producido · diferido · perdido, por tramo y con su árbol), el registro de pérdidas
  // (vacío en el demo: «sin registro», nunca 0), la jornada del supervisor, «¿Está funcionando?» y las fallas por mes.
  // Con la configuración de arranque, sin nada dicho por una persona y sin pérdidas registradas.
  {
    const v0 = [CONF.versionInicial()]
    const curso = rango(L.calendario().at(-1))
    for (const [nombre, grupo] of [['ceiba', ['ceiba']], ['portafolio', todos]]) {
      for (const [mes, r] of [[ultimo.mes, rango(ultimo)], [L.calendario().at(-1).mes, curso]]) {
        const q = { campos: grupo, ...r }
        casos.push(caso(`balance/${nombre}-${mes}`, `El balance de ${nombre}, ${mes}: producido · diferido · perdido por tramo, con el árbol de cada tramo`, C.BALANCE, q, M.BAL.pedirBalance(q, ctx, {}, [])))
        casos.push(caso(`perdidas/${nombre}-${mes}`, `El registro de pérdidas de ${nombre}, ${mes}: sin registro (null, nunca 0)`, C.PERDIDAS, q, M.PER.pedirPerdidas(q, [])))
      }
      casos.push(caso(`efectividad/${nombre}`, `«¿Está funcionando?» en ${nombre}: antes de TRIM, este mes contra la meta y lo ganado, por tramo`, C.EFECTIVIDAD, { campos: grupo },
        M.BAL.pedirEfectividad(grupo, ctx, v0, {}), conEsp(grupo)))
      casos.push(caso(`fallas/${nombre}`, `Las fallas de los equipos críticos de ${nombre}, mes a mes (sin disparos)`, C.FALLAS_MENSUAL, { campos: grupo }, M.BAL.pedirFallasMensual(grupo, ctx)))
    }
    for (const jornada of ['actual', 'anterior']) {
      casos.push(caso(`balance/ceiba-jornada-${jornada}`, `El balance de La Ceiba en la jornada ${jornada} (el cambio de turno por defecto, 06:00 y 18:00)`, C.BALANCE, { campos: ['ceiba'], jornada },
        M.BAL.pedirBalance({ campos: ['ceiba'], jornada }, ctx, {}, [])))
      for (const c of ['ceiba', 'morichal'])
        casos.push(caso(`jornada/${c}-${jornada}`, `«Mi turno» en ${c}, jornada ${jornada}: las paradas con su hora de inicio y fin, por confirmar y lo diferido`, C.JORNADA, { campo: c, jornada },
          M.BAL.pedirJornada({ campo: c, jornada }, ctx, {}, [])))
    }
  }
  // Los escenarios (QA-A-07; C-29; C-08 punto 4): la misma cuenta con otra configuración firmada o con lo que
  // dijeron las personas. El contexto de un escenario de configuración es su última versión, como en un backend.
  const esc = Object.fromEntries(escenarios.map(e => [e.id, e]))
  const deEsc = (e, id, descripcion, ep, p, valor) => ({ ...caso(id, descripcion, ep, p, valor, [`insumos/escenarios/${e.id}.json`]), escenario: e.id })
  const mes = x => rango(L.calendario().find(m => m.mes === x))
  const h13 = { desde: new Date(L.calendario()[0].desde), hasta: M.AHORA }
  for (const id of ['capacidades-de-antes', 'cambio-de-limita', 'empate', 'factor-de-medicion']) {
    // Una referencia generada antes de los escenarios no los trae: sus casos no se arman y el conteo pide regenerar.
    const e = esc[id], v = e?.versiones
    if (!e || !v?.length) continue
    const cx = { ...ctx, config: v.at(-1).config }
    const tub = (c, r) => deEsc(e, `escenarios/${id}/tuberia-${c}`, `${e.descripcion}. La tubería de ${c}`, C.TUBERIA, { campo: c, ...r }, CHK.pedirTuberia(c, r.desde, r.hasta, cx, v))
    const serie = (c, r, cual) => deEsc(e, `escenarios/${id}/serie-${c}-${cual}`, `${e.descripcion}. Qué limitó cada día en ${c} (${cual}), con lo estructural y el aviso de cambio`, C.SERIE_CHOKE, { campo: c, ...r }, CHK.pedirSerieChoke(c, r.desde, r.hasta, cx, v))
    const reparto = (cs, r, cual) => deEsc(e, `escenarios/${id}/reparto-${cs.join('+')}-${cual}`, `${e.descripcion}. Lo perdido por tramo y por escalón en ${cs.join(' y ')} (${cual}), con lo estructural, lo que cabía en la holgura y la eficiencia`, C.REPARTO_CHOKE, { campos: cs, ...r }, CHK.pedirRepartoChoke({ campos: cs, ...r }, cx, v))
    const capacidades = c => deEsc(e, `escenarios/${id}/capacidades-${c}`, `${e.descripcion}. Las capacidades de ${c} y su revisión`, C.CAPACIDADES, { campo: c }, CHK.pedirCapacidades(c, cx, v))
    if (id === 'capacidades-de-antes') {
      casos.push(reparto(['ceiba', 'guacamayo'], h13, '13-meses'), serie('ceiba', mes('2026-03'), '2026-03'), serie('guacamayo', mes('2026-03'), '2026-03'), tub('ceiba', mes('2026-09')), tub('guacamayo', mes('2026-09')))
      for (const c of ['ceiba', 'guacamayo']) casos.push(capacidades(c))
    } else if (id === 'cambio-de-limita') casos.push(serie('ceiba', { desde: mes('2026-04').desde, hasta: mes('2026-05').hasta }, '2026-04-a-2026-05'), tub('ceiba', mes('2026-10')))
    // Con el factor firmado: los pozos se leen con él (la tubería), la eficiencia de septiembre se puede creer
    // (el reparto) y la vista dice quién lo firmó y lo que TRIM propone (las capacidades).
    else if (id === 'factor-de-medicion') casos.push(reparto(['guacamayo', 'palmar'], mes('2026-09'), '2026-09'), tub('guacamayo', mes('2026-09')), capacidades('guacamayo'))
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
  .filter(f => f.endsWith('.json') && f !== 'indice.json' && !f.startsWith('insumos') && !f.startsWith('escrituras')).sort()
  .map(f => JSON.parse(readFileSync(join(DIR, f), 'utf8')))
/** Las escrituras rechazadas de referencia/escrituras/, en el orden del índice. */
const leerEscrituras = () => (JSON.parse(readFileSync(join(DIR, 'indice.json'), 'utf8')).escrituras ?? [])
  .map(e => JSON.parse(readFileSync(join(DIR, 'escrituras', `${e.id}.json`), 'utf8')))

/** Mismo contenido, sin depender del orden entre campos (cada endpoint de
 *  insumo es por campo; el orden DENTRO de cada uno sí se conserva). */
const canonico = ins => JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(JSON.stringify(ins))).map(([k, v]) =>
  [k, Array.isArray(v) ? [...v].sort((a, b) => (`${a.campoId}|${a.id ?? a.mes}` < `${b.campoId}|${b.id ?? b.mes}` ? -1 : 1)) : v])))

if (modo === 'generar') {
  const { casos, insumos, escrituras } = await conMotor(async M => ({ casos: casosDe(M, escenariosDelMotor(M)).casos, insumos: exportarInsumos(M, M.ins), escrituras: await escriturasDelMotor(M) }))
  rmSync(DIR, { recursive: true, force: true })
  const escribir = (archivo, x) => { mkdirSync(join(archivo, '..'), { recursive: true }); writeFileSync(archivo, JSON.stringify(x) + '\n') }
  for (const c of casos) escribir(join(DIR, `${c.id}.json`), c)
  for (const i of insumos) escribir(join(DIR_INSUMOS, i.archivo), { endpoint: i.endpoint, respuesta: i.respuesta })
  for (const e of escrituras) escribir(join(DIR, 'escrituras', `${e.id}.json`), e)
  writeFileSync(join(DIR, 'indice.json'), JSON.stringify({
    generado: 'node scripts/referencia.mjs generar', tolerancia: { relativa: TOL_REL, absoluta: TOL_ABS },
    regla: 'la respuesta contiene lo esperado (sin los campos que van ausentes cuando no aplican); null exige null; los registros cerrados traen sus claves; fechas como instante y con zona; el orden de las listas importa',
    insumos: insumos.map(i => ({ archivo: i.archivo, endpoint: i.endpoint })),
    casos: casos.map(c => ({ id: c.id, endpoint: c.endpoint, descripcion: c.descripcion, ...(c.requiere ? { requiere: c.requiere } : {}), ...(c.escenario ? { escenario: c.escenario } : {}) })),
    escrituras: escrituras.map(e => ({ id: e.id, descripcion: e.descripcion, esperado: e.pasos.at(-1).esperado })),
  }, null, 1) + '\n')
  console.log(`${casos.length} casos, ${escrituras.length} escrituras rechazadas y ${insumos.length} archivos de insumos en ${DIR}`)
} else {
  const todos = leerReferencia()
  if (!todos.length) { console.error(`no hay casos en ${DIR}: corra primero «npm run referencia»`); process.exit(1) }
  const escrituras = leerEscrituras()
  // Contra una API, un escenario a la vez (el backend lo carga antes); el motor los calcula todos. Con
  // --escrituras, solo las escrituras rechazadas: escriben en el backend.
  const referencia = modo === 'comparar' ? (conEscrituras ? [] : todos.filter(c => (c.escenario ?? undefined) === escenarioPedido)) : todos
  if (modo === 'comparar' && !conEscrituras) {
    const otros = [...new Set(todos.filter(c => c.escenario && c.escenario !== escenarioPedido).map(c => c.escenario))]
    if (otros.length) console.log(`(${todos.length - referencia.length} casos de ${escenarioPedido ? 'otros escenarios y del arranque' : 'escenarios'} no se piden: cargue el insumo de cada escenario y corra con --escenario=${otros.join(' | ')})`)
    if (escrituras.length) console.log(`(${escrituras.length} escrituras rechazadas no se mandan: escriben en el backend; córralas con --escrituras contra uno recién cargado con el arranque)`)
    if (escenarioPedido && !referencia.length) { console.error(`no hay casos del escenario «${escenarioPedido}»`); process.exit(2) }
  }
  // `malos`: casos que no coinciden; `aparte`: lo que falla fuera de los casos (deriva de insumos, conteo).
  let malos = 0, aparte = 0, malasEscrituras = 0
  let motor = null, escriturasMotor = null
  if (modo === 'comprobar') {
    // Los casos se calculan con los insumos de los ARCHIVOS, como los cargaría
    // un backend; y esos archivos tienen que ser, sin perder nada, los del demo.
    const r = await conMotor(async M => {
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
      // 5E·H37: el umbral de cierre de la NSTA tiene sus casos en la referencia que lee un backend: uno del reparto
      // con lo sin explicar distinto de cero y que cuadra, y uno que pasa el 2,5 % (`cuadra: false`).
      const repartos = todos.filter(c => c.endpoint.startsWith('/api/vistas/choke/reparto?')).map(c => c.esperado.datos)
      if (!repartos.some(d => Math.abs(d.sinExplicar) >= 0.5 && d.cuadra)) deriva.push('ningún caso del reparto trae lo sin explicar distinto de cero (5E·H37)')
      if (!repartos.some(d => d.cuadra === false)) deriva.push('ningún caso del reparto pasa el umbral de cierre de la NSTA, 2,5 % del potencial (`cuadra: false`; 5E·H37)')
      // Las escrituras rechazadas: las que arma hoy el servidor del demo, y lo que da hoy con los pasos guardados.
      const armadas = await escriturasDelMotor(M)
      const hoy = await escriturasEnElMotor(M, escrituras)
      return { casos, deriva, armadas, hoy }
    }, insumosDeArchivos)
    for (const d of r.deriva) { console.log(`  ✗ ${d}: regenerar con «npm run referencia»`); aparte++ }
    motor = new Map(r.casos.map(c => [c.id, c]))
    if (motor.size !== referencia.length) {
      console.log(`  ✗ el motor arma ${motor.size} casos y la referencia trae ${referencia.length}: regenerar con «npm run referencia»`)
      aparte++
    }
    // Las mismas escrituras (los pasos, sus cuerpos y lo esperado) que arma el servidor del demo desde el arranque.
    const sinEsperado = e => JSON.stringify(e.pasos.map(({ esperado: _, ...x }) => x))
    if (r.armadas.map(e => e.id).join() !== escrituras.map(e => e.id).join()) {
      console.log(`  ✗ el servidor del demo arma las escrituras ${r.armadas.map(e => e.id).join(', ')} y la referencia trae ${escrituras.map(e => e.id).join(', ') || 'ninguna'}: regenerar con «npm run referencia»`)
      aparte++
    } else for (const [i, e] of escrituras.entries()) if (sinEsperado(r.armadas[i]) !== sinEsperado(e)) {
      console.log(`  ✗ escrituras/${e.id}: el servidor del demo arma otros pasos (otra fila, otra cadena u otro cuerpo): regenerar con «npm run referencia»`)
      aparte++
    }
    escriturasMotor = new Map(r.hoy.map(e => [e.id, e.pasos]))
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
  // Las escrituras: en el demo, lo que da hoy el servidor con los mismos pasos; contra una API, cada paso por HTTP.
  /** Un POST de una escritura, con el rol del paso (`x-rol` y su token): el HTTP y, en un rechazo, el código. */
  const mandar = async x => {
    const t = tokensPorRol[x.rol] ?? token
    const r = await fetch(new URL(x.endpoint, baseUrl), { method: x.metodo, body: JSON.stringify(x.cuerpo),
      headers: { accept: 'application/json', 'content-type': 'application/json', 'x-rol': x.rol, ...(t ? { authorization: `Bearer ${t}` } : {}) } })
    let codigo
    if (!r.ok) try { codigo = (await r.json())?.error?.codigo } catch { codigo = undefined }
    return { estado: r.status, ...(codigo ? { codigo } : {}) }
  }
  const aMandar = modo === 'comprobar' || conEscrituras ? escrituras : []
  for (const e of aMandar) {
    let reales
    if (escriturasMotor) reales = escriturasMotor.get(e.id)
    else {
      reales = []
      try { for (const x of e.pasos) reales.push(await mandar(x)) } catch (err) { console.log(`  ✗ escrituras/${e.id}: no respondió (${err.message})`); malasEscrituras++; continue }
    }
    const d = e.pasos.flatMap((x, i) => {
      const real = reales?.[i], esp = x.esperado
      const bien = real && (esp.estado === 200 ? real.estado >= 200 && real.estado < 300 : real.estado === esp.estado && real.codigo === esp.codigo)
      return bien ? [] : [`paso ${i + 1} (${x.rol}, POST ${x.endpoint.replace('/api/anh/paradas/', '…/')}): se esperaba ${esp.estado}${esp.codigo ? ` ${esp.codigo}` : ''}, llegó ${real ? `${real.estado}${real.codigo ? ` ${real.codigo}` : ''}` : 'nada'}`]
    })
    if (d.length) { malasEscrituras++; console.log(`  ✗ escrituras/${e.id}\n      ${d.join('\n      ')}`) }
  }
  if (referencia.length) console.log(`\n${referencia.length - malos} de ${referencia.length} casos de referencia coinciden${modo === 'comprobar' ? ' con el motor de hoy, calculados con los insumos de referencia/insumos/' : ` en ${baseUrl}`}.`)
  if (aMandar.length) console.log(`${referencia.length ? '' : '\n'}${aMandar.length - malasEscrituras} de ${aMandar.length} escrituras rechazadas dan el HTTP y el código del contrato${modo === 'comprobar' ? ' en el servidor del demo' : ` en ${baseUrl}`}.`)
  if (aparte) console.log(`Además, ${aparte} ${aparte === 1 ? 'falla' : 'fallas'} fuera de los casos (arriba).`)
  if (malos || malasEscrituras || aparte) process.exit(1)
}
