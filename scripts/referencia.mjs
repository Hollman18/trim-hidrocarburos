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
 * Regla de comparación (la misma en los dos modos): la respuesta tiene que
 * CONTENER lo que trae la referencia (puede traer más campos); los números
 * valen iguales con una diferencia de hasta 1e-6 relativo o 0,005 absoluto;
 * las fechas se comparan como instante (da igual -05:00 o Z); el orden de
 * las listas importa. Sale con código 1 si algo no coincide.
 */
import { createServer } from 'vite'
// El motor de referencia es el del demo: un .env.local que apunte a un backend
// (VITE_FUENTE=http) no lo cambia de fuente; Vite respeta lo que ya trae el proceso.
process.env.VITE_FUENTE = 'demo'
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const DIR = join(RAIZ, 'referencia')
const DIR_INSUMOS = join(DIR, 'insumos')
const [modo, ...resto] = process.argv.slice(2)
const baseUrl = resto.find(a => a.startsWith('--base-url='))?.slice('--base-url='.length)
if (!['generar', 'comprobar', 'comparar'].includes(modo) || (modo === 'comparar' && !baseUrl)) {
  console.error('uso: node scripts/referencia.mjs generar | comprobar | comparar --base-url=http://servidor:puerto')
  process.exit(2)
}

/* ───── Comparación ───── */
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/
const TOL_REL = 1e-6, TOL_ABS = 0.005

/** Diferencias entre lo esperado y lo recibido, con la ruta de cada una. */
function diferencias(esperado, real, ruta = '$', salida = []) {
  if (salida.length >= 20) return salida
  if (typeof esperado === 'number') {
    if (typeof real !== 'number' || !(Math.abs(esperado - real) <= Math.max(TOL_ABS, TOL_REL * Math.abs(esperado))))
      salida.push(`${ruta}: se esperaba ${esperado}, llegó ${JSON.stringify(real)}`)
  } else if (typeof esperado === 'string' && ISO.test(esperado)) {
    if (typeof real !== 'string' || Date.parse(esperado) !== Date.parse(real))
      salida.push(`${ruta}: se esperaba el instante ${esperado}, llegó ${JSON.stringify(real)}`)
  } else if (Array.isArray(esperado)) {
    if (!Array.isArray(real) || real.length !== esperado.length)
      salida.push(`${ruta}: se esperaba una lista de ${esperado.length}, llegó ${Array.isArray(real) ? `una de ${real.length}` : JSON.stringify(real)?.slice(0, 60)}`)
    else esperado.forEach((e, i) => diferencias(e, real[i], `${ruta}[${i}]`, salida))
  } else if (esperado !== null && typeof esperado === 'object') {
    if (real === null || typeof real !== 'object' || Array.isArray(real)) salida.push(`${ruta}: se esperaba un objeto, llegó ${JSON.stringify(real)?.slice(0, 60)}`)
    else for (const k of Object.keys(esperado)) {
      if (!(k in real)) salida.push(`${ruta}.${k}: falta`)
      else diferencias(esperado[k], real[k], `${ruta}.${k}`, salida)
    }
  } else if (esperado !== real) salida.push(`${ruta}: se esperaba ${JSON.stringify(esperado)}, llegó ${JSON.stringify(real)?.slice(0, 60)}`)
  return salida
}

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
    // Las lecturas de las electrosumergibles y la locación de los pozos no son insumo del motor todavía (ver exportarInsumos).
    if (nombre === 'electrosumergibles.json' || nombre === 'locaciones.json') continue
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
    })
    M.ctx = M.L.contextoInicial()
    return await trabajo(M)
  } finally { await v.close() }
}

function casosDe(M) {
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
  }
  return casos
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
  const { casos, insumos } = await conMotor(M => ({ casos: casosDe(M), insumos: exportarInsumos(M, M.ins) }))
  rmSync(DIR, { recursive: true, force: true })
  const escribir = (archivo, x) => { mkdirSync(join(archivo, '..'), { recursive: true }); writeFileSync(archivo, JSON.stringify(x) + '\n') }
  for (const c of casos) escribir(join(DIR, `${c.id}.json`), c)
  for (const i of insumos) escribir(join(DIR_INSUMOS, i.archivo), { endpoint: i.endpoint, respuesta: i.respuesta })
  writeFileSync(join(DIR, 'indice.json'), JSON.stringify({
    generado: 'node scripts/referencia.mjs generar', tolerancia: { relativa: TOL_REL, absoluta: TOL_ABS },
    regla: 'la respuesta contiene lo esperado; fechas como instante; el orden de las listas importa',
    insumos: insumos.map(i => ({ archivo: i.archivo, endpoint: i.endpoint })),
    casos: casos.map(c => ({ id: c.id, endpoint: c.endpoint, descripcion: c.descripcion, ...(c.requiere ? { requiere: c.requiere } : {}) })),
  }, null, 1) + '\n')
  console.log(`${casos.length} casos y ${insumos.length} archivos de insumos en ${DIR}`)
} else {
  const referencia = leerReferencia()
  if (!referencia.length) { console.error(`no hay casos en ${DIR}: corra primero «npm run referencia»`); process.exit(1) }
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
      const casos = casosDe(M)
      const marcados = indice.casos.filter(c => c.requiere).map(c => `${c.id}:${c.requiere}`).join()
      if (marcados !== casos.filter(c => c.requiere).map(c => `${c.id}:${c.requiere}`).join()) deriva.push('los casos que leen lo que todavía no tiene endpoint (las lecturas de las electrosumergibles, la locación de los pozos: «requiere» del índice) cambiaron')
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
        const r = await fetch(new URL(caso.endpoint, baseUrl), { headers: { accept: 'application/json' } })
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
