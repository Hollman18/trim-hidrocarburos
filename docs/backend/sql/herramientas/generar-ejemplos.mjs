/* Genera ejemplos.sql: las filas REALES del demo para cargar en el esquema.
 *   Fuentes: referencia/insumos/ y referencia/<casos>/ (lo que entra y lo que sale
 *   del motor), simulador-api/datos/ (registro de ingeniería y nacimientos del
 *   borde) y herramientas/motor.json (lo que vuelca scripts/.doc-E-filas.mjs:
 *   librerías, usuarios, mensajes, libro por mes y tramos por día).
 *   Nada se inventa: donde el demo no trae un dato que la base exige (una hora de
 *   recepción, la fecha de un análisis), se usa una hora del propio demo y se dice
 *   en CONVENCIONES (va al pie de ejemplos.sql y al capítulo).
 * Uso: node generar-ejemplos.mjs <raiz del proyecto> <salida.sql> */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const [RAIZ, SALIDA] = process.argv.slice(2)
if (!RAIZ || !SALIDA) throw new Error('uso: node generar-ejemplos.mjs <raiz> <salida.sql>')
const aqui = dirname(fileURLToPath(import.meta.url))
const leer = f => JSON.parse(readFileSync(f, 'utf8'))
const REF = join(RAIZ, 'referencia')
const ins = (c, f) => leer(join(REF, 'insumos', c, f)).respuesta
const MOTOR = leer(join(aqui, 'motor.json'))
const REG = leer(join(RAIZ, 'simulador-api', 'datos', 'registro-ingenieria.json'))
const NAC = leer(join(RAIZ, 'simulador-api', 'datos', 'nacimientos.json'))
const CAT = ins('arranque', 'catalogo.json').datos
const HIST = ins('arranque', 'configuracion-historial.json').datos
const CAMPOS = ins('arranque', 'campos.json').datos
const IDS = CAMPOS.map(c => c.id)

// Horas que el demo no trae, tomadas del propio demo.
const AHORA = '2026-10-02T14:00:00-05:00'                 // src/entities/reloj.ts
const AHORA_DE_LOS_DATOS = '2026-10-02T19:00:00.000Z'      // simulador-api/api.mjs (nacimientos de la semilla)
const FIRMA_ARRANQUE = '2026-09-01T08:00:00-05:00'         // configuracion.ts (versión 1)
const INICIO_CALENDARIO = '2025-10-01T00:00:00-05:00'      // primer mes del calendario
const CONVENCIONES = [
  `gateway/dispositivo primer_visto y ultimo_visto, nacimiento.recibido = ${AHORA_DE_LOS_DATOS} (la hora con que el simulador carga la semilla).`,
  'evento*.recibido = inicio del evento; lectura.recibido = instante (el demo no tiene hora de recepción).',
  `alarma_tag.vigente_desde = ${FIRMA_ARRANQUE} (la firma de arranque de la implementación); firmada_por = el texto de firma de limites.ts.`,
  `metrologia_campo.vigente_desde = ${INICIO_CALENDARIO} (el demo tiene un solo análisis de °API para toda la historia).`,
  `ajuste_variador.leido = ${AHORA} (AHORA del demo).`,
  'mes_fiscal.publicado_en = NULL (el demo dice publicado sin hora).',
  'prediccion.calificada = el instante que decidió la calificación (inicio de la falla, cierre de la intervención o fin de la ventana).',
  'aviso_sap.creado_por_id = NULL: en el demo los avisos los crea TRIM solo o Operación directo en SAP (regla fija sobre el PLC).',
  'respuesta_parada: las respuestas históricas pegadas a los eventos del demo no traen persona ni canal (por_id y canal NULL).',
  'mensaje.telefono = el WhatsApp del destinatario en USUARIOS_INICIALES; meta_id NULL (el demo no envía).',
  'equipo.aguas_abajo y equipo.redundancia = NULL en P-201B y MPP-301 (bombas de la línea): el catálogo del demo dice «según la configuración firmada» o «sin declarar en este campo», que la API arma del respaldo firmado.',
  'libro_mes, factor_asignacion_mes y tramo_diferido salen del motor con la versión 1; T (teórico) = R/FA.',
]

const out = []
const esc = s => String(s).replace(/'/g, "''")
const q = v => v === null || v === undefined || (typeof v === 'number' && !Number.isFinite(v)) ? 'null'
  : typeof v === 'boolean' ? String(v) : typeof v === 'number' ? String(v)
    : `'${esc(v)}'`
const arr = xs => xs === null || xs === undefined ? 'null' : `array[${xs.map(q).join(', ')}]::text[]`
const darr = xs => `array[${xs.map(q).join(', ')}]::date[]`
const js = v => v === null || v === undefined ? 'null' : `'${esc(JSON.stringify(v))}'::jsonb`
const fila = (tabla, obj) => {
  const ks = Object.keys(obj)
  out.push(`insert into ${tabla} (${ks.join(', ')}) values (${ks.map(k => obj[k]).join(', ')});`)
}
const lit = obj => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, q(v)]))
const titulo = t => out.push('', `-- ── ${t}`)
const diaCo = iso => new Date(new Date(iso).getTime() - 5 * 3_600_000).toISOString().slice(0, 10)
const masDias = (dia, n) => { const d = new Date(`${dia}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const cuenta = {}
const contar = t => { cuenta[t] = (cuenta[t] ?? 0) + 1 }
const meter = (tabla, obj) => { fila(tabla, obj); contar(tabla) }

out.push('-- Filas reales del demo de TRIM Hidrocarburos (generado por herramientas/generar-ejemplos.mjs; no editar a mano).',
  'set search_path = trim, public;', 'begin;')

// ─── (a) campos, activos, equipos, planta
titulo('campo')
for (const c of CAMPOS) meter('campo', lit({ id: c.id, nombre: c.nombre, cuenca: c.cuenca, choke: c.choke, nota: c.nota }))

const CLASE_ISO = { 'P-201B': 'bomba-centrifuga', 'MPP-301': 'bomba-multifasica', 'K-101': 'compresor-aire', 'H-302': 'tratador-termico',
  'V-101': 'separador-trifasico', 'TK-102': 'tanque-atmosferico', 'LACT-01': 'unidad-lact', 'C-401': 'compresor-gas', 'SE-2': 'switchgear' } // generar-semilla.mjs
const activos = new Set()
titulo('activo · equipo')
for (const c of IDS) for (const e of CAT.campos[c].registroEquipos) {
  meter('activo', lit({ campo_id: c, codigo: e.id, clase: 'catalogo' })); activos.add(`${c}|${e.id}`)
  meter('equipo', { ...lit({ campo_id: c, codigo: e.id, nombre: e.nombre, sistema: e.sistema, clase_iso: CLASE_ISO[e.id], criticidad: e.criticidad,
    servicio: e.servicio ?? null, modo_falla: e.modoFalla, norma: e.norma, intervencion_ubicacion: e.intervencion?.ubicacion ?? null,
    intervencion_accion: e.intervencion?.accionInmediata ?? null, intervencion_avisar_a: e.intervencion?.avisarA ?? null,
    // En una bomba de la línea los dice el respaldo firmado (la API manda «según la configuración firmada»): no se guardan.
    aguas_abajo: CAT.maquinasBomba.includes(e.id) ? null : e.aguasAbajo, redundancia: CAT.maquinasBomba.includes(e.id) ? null : e.redundancia }),
    distribucion_falla: js(e.distribucionFalla ?? null) })
}
titulo('activo · pozo (el supertipo; la tabla pozo va en (d))')
const POZOS = Object.fromEntries(IDS.map(c => [c, ins(c, 'pozos.json')]))
for (const c of IDS) for (const p of POZOS[c]) { meter('activo', lit({ campo_id: c, codigo: p.id, clase: 'pozo' })); activos.add(`${c}|${p.id}`) }

titulo('planta')
for (const [c, pl] of Object.entries(MOTOR.planta)) {
  meter('planta_campo', lit({ campo_id: c, crudo_bpd: pl.caudales.crudo, crudo_cap_bpd: pl.caudales.crudoCap, agua_bpd: pl.caudales.agua,
    agua_cap_bpd: pl.caudales.aguaCap, gas_bpd: pl.caudales.gas, gas_cap_bpd: pl.caudales.gasCap, choke_pozos: pl.chokes.pozos,
    choke_planta: pl.chokes.planta, choke_evacuacion: pl.chokes.evacuacion, choke_mercado: pl.chokes.mercado, nota: pl.nota }))
  for (const tren of ['tronco', 'gas', 'crudo', 'agua', 'servicios']) pl[tren].forEach((e, i) => {
    meter('planta_elemento', lit({ campo_id: c, id: e.id, tren, orden: i, simbolo: e.simbolo, etiqueta: e.etiqueta, equipo: e.equipo ?? null,
      pie: e.pie ?? null, nivel_tag: e.nivelDe?.tag ?? null, nivel_tope: e.nivelDe?.tope ?? null, fluido: e.fluido ?? null, pmo: e.pmo ?? null,
      rama: !!e.rama, restantes_cuantos: e.restantes?.cuantos ?? null, restantes_etiqueta: e.restantes?.etiqueta ?? null }))
    ;(e.miembros ?? []).forEach((m, j) => meter('planta_miembro', lit({ campo_id: c, elemento_id: e.id, id: m.id, orden: j, etiqueta: m.etiqueta,
      equipo: m.equipo ?? null, pie: m.pie ?? null, nivel_tag: m.nivelDe?.tag ?? null, nivel_tope: m.nivelDe?.tope ?? null, fluido: m.fluido ?? null, pmo: m.pmo ?? null })))
  })
}

// ─── (b) cadena de datos
titulo('gateway · fuente · dispositivo · tag · calibracion · nacimiento')
const fuenteRef = (gw, f) => `(select id from fuente where gateway_id = ${q(gw)} and protocolo = ${q(f.protocolo)} and endpoint is not distinct from ${q(f.endpoint)})`
const dispRef = (gw, f, nombre) => `(select id from dispositivo where fuente_id = ${fuenteRef(gw, f)} and nombre = ${q(nombre)})`
const tagRef = (c, t) => `(select id from tag where campo_id = ${q(c)} and nombre = ${q(t)})`
const tags = new Set(), fuentes = new Set()
for (const n of NAC) {
  const g = n.gateway
  meter('gateway', lit({ id: g.id, campo_id: n.campo, modelo: g.modelo, serie: g.serie, firmware: g.firmware, enlace: g.enlace, buffer_h: g.bufferH,
    primer_visto: AHORA_DE_LOS_DATOS, ultimo_visto: AHORA_DE_LOS_DATOS }))
  let ntags = 0, npend = 0
  for (const d of n.dispositivos) {
    const kf = `${g.id}|${d.fuente.protocolo}|${d.fuente.endpoint}`
    if (!fuentes.has(kf)) { fuentes.add(kf); meter('fuente', lit({ gateway_id: g.id, campo_id: n.campo, protocolo: d.fuente.protocolo, endpoint: d.fuente.endpoint ?? null })) }
    meter('dispositivo', { gateway_id: q(g.id), campo_id: q(n.campo), fuente_id: fuenteRef(g.id, d.fuente), nombre: q(d.nombre), reloj: q(d.fuente.reloj),
      primer_visto: q(AHORA_DE_LOS_DATOS), ultimo_visto: q(AHORA_DE_LOS_DATOS) })
    const equipo = activos.has(`${n.campo}|${d.nombre}`) ? d.nombre : null
    for (const m of d.metricas) {
      meter('tag', { campo_id: q(n.campo), nombre: q(m.nombre), dispositivo_id: dispRef(g.id, d.fuente, d.nombre), equipo_codigo: q(equipo),
        tipo: q(m.tipo), unidad: q(m.unidad), limite_texto: q(m.limite), limite_bajo: q(m.bajo), limite_alto: q(m.alto), cadencia_s: q(m.cadenciaS),
        clase: q(m.clase ?? 'continua'), origen_mapeo: q(equipo ? 'descubierto' : 'pendiente'), actualizado: q(AHORA_DE_LOS_DATOS) })
      tags.add(`${n.campo}|${m.nombre}`); ntags++; if (!equipo) npend++
      if (m.calibracion) meter('calibracion', { tag_id: tagRef(n.campo, m.nombre), vigente_hasta: 'null', detalle: q(m.calibracion.detalle) })
    }
  }
  meter('nacimiento', { gateway_id: q(g.id), campo_id: q(n.campo), recibido: q(AHORA_DE_LOS_DATOS), bd_seq: 'null', tags: String(ntags), pendientes: String(npend), carga: js(n) })
}
titulo('formula · calculo')
for (const f of REG.formulas) meter('formula', lit({ id: f.id, version: f.version, clase_equipo: f.claseEquipo, tipo_tag: f.tipoTag, expresion: f.expresion, ventana_min: f.ventanaMin ?? null, activa: true }))
for (const n of NAC) for (const d of n.dispositivos) if (d.fuente.protocolo === 'calculado') for (const m of d.metricas) {
  const f = REG.formulas.find(x => x.claseEquipo === CLASE_ISO[d.nombre] && x.tipoTag === m.tipo)
  if (!f) throw new Error(`${n.campo} ${m.nombre}: tag calculado sin fórmula`)
  meter('calculo', { tag_id: tagRef(n.campo, m.nombre), formula_id: q(f.id), formula_version: String(f.version) })
  for (const e of f.expresion.match(/[A-Z]{2,4}-\d{3,4}/g) ?? []) if (tags.has(`${n.campo}|${e}`))
    meter('calculo_entrada', { tag_id: tagRef(n.campo, m.nombre), entrada_tag_id: tagRef(n.campo, e) })
}

// ─── (c) series
titulo('lectura (las series del registro de equipos del catálogo)')
let sinTag = 0
for (const c of IDS) for (const e of CAT.campos[c].registroEquipos) for (const d of e.dispositivos ?? []) {
  if (!d.serie) continue
  if (!tags.has(`${c}|${d.tag}`)) { sinTag++; continue }
  const t0 = new Date(d.serie.desde).getTime()
  d.serie.valores.forEach((v, i) => {
    if (v === null) return
    const instante = new Date(t0 + i * d.serie.pasoH * 3_600_000).toISOString()
    meter('lectura', { tag_id: tagRef(c, d.tag), instante: q(instante), valor: q(v), calidad: q('buena'), recibido: q(instante) })
  })
}

// ─── (d) insumos
titulo('pozo · prueba_pozo')
for (const c of IDS) for (const p of POZOS[c]) {
  meter('pozo', lit({ campo_id: c, id: p.id, levantamiento: p.levantamiento, controlador: p.controlador, alimentador: p.alimentador,
    origen: p.origen ?? null, fuente_prueba: p.fuentePrueba ?? null }))
  for (const t of p.pruebas) meter('prueba_pozo', lit({ campo_id: c, pozo: p.id, fecha: t.fecha, crudo_bpd: t.crudoBpd, agua_bpd: t.aguaBpd, hz: t.hz ?? null }))
}
titulo('evento · evento_pozo · evento_servicio · parada_bomba')
const respuestas = []
const eventos = new Set()
for (const c of IDS) {
  for (const e of ins(c, 'pozos-eventos.json')) {
    meter('evento', lit({ id: e.id, campo_id: c, clase: 'pozo', activo: e.pozo, recibido: e.inicio })); eventos.add(e.id)
    meter('evento_pozo', lit({ id: e.id, campo_id: c, pozo: e.pozo, inicio: e.inicio, fin: e.fin, codigo: e.codigo, senal: e.senal, hz: e.hz ?? null, recibido: e.inicio }))
    if (e.respuesta) respuestas.push({ evento: e.id, ...e.respuesta })
  }
  for (const e of ins(c, 'servicios-eventos.json')) {
    meter('evento', lit({ id: e.id, campo_id: c, clase: 'servicio', activo: e.equipo, recibido: e.inicio })); eventos.add(e.id)
    meter('evento_servicio', lit({ id: e.id, campo_id: c, equipo: e.equipo, tipo: e.tipo, inicio: e.inicio, fin: e.fin, tag: e.tag, texto: e.texto, recibido: e.inicio }))
  }
  for (const b of CAT.campos[c].perfilesBomba) for (const e of ins(c, `bombas/${b.equipo}-paradas.json`)) {
    meter('evento', lit({ id: e.id, campo_id: c, clase: 'bomba', activo: e.equipo, recibido: e.inicio })); eventos.add(e.id)
    meter('parada_bomba', lit({ id: e.id, campo_id: c, equipo: e.equipo, inicio: e.inicio, fin: e.fin, perdida: e.perdida, senal: e.senal,
      primera_alarma_tag: e.primeraAlarma?.tag ?? null, primera_alarma_texto: e.primeraAlarma?.texto ?? null,
      nivel_al_parar_tag: e.nivelAlParar?.tag ?? null, nivel_al_parar_pct: e.nivelAlParar?.pct ?? null, recibido: e.inicio }))
  }
}
titulo('punto_medicion · mes_fiscal · produccion_fiscal_diaria')
for (const c of IDS) {
  const pd = ins(c, 'produccion-diaria.json')
  const pmo = CAT.campos[c].registroEquipos.find(e => e.fiscal)
  meter('punto_medicion', lit({ campo_id: c, equipo: pmo.id, tag_fiscal: pmo.fiscal, fuente: pd.origen.fuente, bsw: pd.origen.bsw }))
  for (const m of pd.meses) {
    meter('mes_fiscal', lit({ campo_id: c, mes: `${m.mes}-01`, publicado: m.publicado }))
    m.dias.forEach((v, i) => { const dia = masDias(`${m.mes}-01`, i)
      meter('produccion_fiscal_diaria', lit({ campo_id: c, dia, bbl: v, cerrado: dia !== diaCo(AHORA), tag: pmo.fiscal, recibido: `${masDias(dia, 1)}T00:00:00-05:00` })) })
  }
}
titulo('metrologia_campo · banda_regulatoria')
for (const [c, m] of Object.entries(MOTOR.metrologia)) meter('metrologia_campo', lit({ campo_id: c, vigente_desde: INICIO_CALENDARIO, api: m.api, api_fuente: m.apiFuente }))
const FUENTE_BANDA = 'Res. MME 40236/2022, Anexo 2, Tabla 10, Figura 10.2 · Límites de los factores de campo y de asignación'
for (const [fluido, mayor, hasta, nombre, a, b] of [ // FIGURA_10_2 de src/entities/metrologia.ts
  ['crudo', 22.3, null, 'crudo de más de 22,3 °API', [0.95, 1.05], [0.85, 1.15]],
  ['crudo', null, 22.3, 'crudo de 22,3 °API o menos', [0.85, 1.15], [0.80, 1.20]],
  ['gas', null, null, 'gas', [0.90, 1.10], [0.80, 1.20]],
  ['agua', null, null, 'agua', [0.90, 1.10], [0.90, 1.10]]]) {
  meter('banda_regulatoria', lit({ fluido, api_mayor_que: mayor, api_hasta: hasta, desde_bpd: 1000, fa_min: a[0], fa_max: a[1], nombre, fuente: FUENTE_BANDA }))
  meter('banda_regulatoria', lit({ fluido, api_mayor_que: mayor, api_hasta: hasta, desde_bpd: 0, fa_min: b[0], fa_max: b[1], nombre, fuente: FUENTE_BANDA }))
}
titulo('catálogo de daños')
for (const m of MOTOR.mecanismos) meter('mecanismo_falla', lit({ codigo: m.codigo, nombre: m.nombre, nombre_en: m.en, familia: m.familia }))
for (const m of MOTOR.modos) meter('modo_falla', lit({ codigo: m.codigo, nombre: m.nombre, nombre_en: m.en, nombre_campo: MOTOR.modoEnCampo[m.codigo] ?? m.nombre, mecanismo_sugerido: MOTOR.mecanismoSugerido[m.codigo] ?? null }))
for (const c of MOTOR.causasRaiz) meter('causa_raiz', lit({ codigo: c.codigo, nombre: c.nombre }))
for (const [clase, modos] of Object.entries(MOTOR.modosPorClase)) modos.forEach((m, i) => meter('modo_por_clase', lit({ clase_iso: clase, modo: m, orden: i })))
const FAM = { 'bomba-inyeccion': 'inyeccion', 'bomba-multifasica': 'multifasica', 'bomba-electrosumergible': 'electrosumergible' }
for (const [clase, nombre] of Object.entries(MOTOR.nombreClase)) meter('clase_catalogo', lit({ clase, familia: FAM[clase], nombre }))
for (const [ci, papel, clase] of [ // claseDeCatalogo de src/entities/catalogo.ts
  ['bomba-electrosumergible', '*', 'bomba-electrosumergible'], ['bomba-tornillo', '*', 'bomba-multifasica'], ['bomba-multifasica', '*', 'bomba-multifasica'],
  ['bomba-centrifuga', 'transporte', 'bomba-multifasica'], ['bomba-centrifuga', '*', 'bomba-inyeccion']]) meter('clase_iso_catalogo', lit({ clase_iso: ci, papel, clase }))
for (const [familia, ps] of Object.entries(MOTOR.partes)) ps.forEach((p, i) => {
  meter('parte', lit({ familia, id: p.id, orden: i, nombre: p.nombre, item_iso: p.itemIso, peso_texto: p.peso.texto, peso_fuente: p.peso.fuente, anticipacion: p.anticipacion, accion: p.accion }))
  for (const v of p.variables) meter('parte_variable', lit({ familia, parte: p.id, variable: v.id, papel: v.papel }))
  p.modos.forEach((m, j) => meter('parte_modo', lit({ familia, parte: p.id, modo: m, orden: j })))
})
titulo('perfil_bomba y sus tags, pozos y primeras alarmas')
for (const c of IDS) for (const b of CAT.campos[c].perfilesBomba) {
  meter('perfil_bomba', lit({ campo_id: c, equipo: b.equipo, subtipo: b.subtipo, tecnologia: b.tecnologia, norma: b.norma, papel: b.papel,
    capacidad_bpd: b.capacidadBpd, sin_bomba_fraccion: b.sinBomba.fraccion, sin_bomba_fuente: b.sinBomba.fuente }))
  for (const [variable, tag] of Object.entries(b.tags)) meter('perfil_bomba_tag', lit({ campo_id: c, equipo: b.equipo, variable, tag }))
  for (const p of b.pozos ?? []) meter('perfil_bomba_pozo', lit({ campo_id: c, equipo: b.equipo, pozo: p }))
  for (const [tag, parte] of Object.entries(b.primerasAlarmas)) meter('perfil_bomba_primera_alarma', lit({ campo_id: c, equipo: b.equipo, tag, familia: b.subtipo, parte }))
}
titulo('alarma_tag (base maestra) · ajuste_variador')
for (const c of IDS) for (const l of Object.values(CAT.campos[c].limites)) if (l.alarma) {
  if (!tags.has(`${c}|${l.tag}`)) throw new Error(`${c} ${l.tag}: alarma de un tag sin registrar`)
  meter('alarma_tag', { tag_id: tagRef(c, l.tag), vigente_desde: q(FIRMA_ARRANQUE), alta: q(l.alarma.alta ?? null), baja: q(l.alarma.baja ?? null), fuente: q(l.alarma.fuente), firmada_por: q(l.firma.alarma) })
}
for (const c of IDS) {
  // Palmar y La Zarza no tienen electrosumergibles: no traen archivo (se dice en la cuenta).
  if (!existsSync(join(REF, 'insumos', c, 'electrosumergibles.json'))) { (cuenta._sinArchivoEsp ??= []).push(c); continue }
  const esp = ins(c, 'electrosumergibles.json')
  for (const p of esp) for (const s of p.senales) meter('ajuste_variador', lit({ campo_id: c, pozo: p.pozo, variable: s.variable, tag: s.tag, unidad: s.unidad,
    normal_baja: s.normal?.[0] ?? null, normal_alta: s.normal?.[1] ?? null, alarma_baja: s.alarma?.baja ?? null, alarma_alta: s.alarma?.alta ?? null, fuente: s.alarma.fuente, leido: AHORA }))
}

// ─── (f) personas
titulo('rol · capacidad · usuario')
for (const r of MOTOR.roles) meter('rol', { ...lit({ id: r.id, nombre: r.nombre, nivel: r.nivel, area: r.area, inicio: r.inicio, recibe_alertas: MOTOR.rolesConAlertas.includes(r.id), visible: r.visible }),
  pantallas: arr(r.pantallas), campos_fabrica: r.campos === 'todos' ? 'null' : arr(r.campos) })
for (const [id, nombre] of Object.entries(MOTOR.capacidadNombre)) if (id !== 'causa:completar') meter('capacidad', lit({ id, nombre, incluye: null }))
meter('capacidad', lit({ id: 'causa:completar', nombre: MOTOR.capacidadNombre['causa:completar'], incluye: 'causa:declarar' }))
for (const r of MOTOR.roles) for (const k of r.capacidades) meter('rol_capacidad', lit({ rol_id: r.id, capacidad_id: k }))
const USU = Object.fromEntries(MOTOR.usuarios.map(u => [u.id, u]))
for (const u of MOTOR.usuarios) {
  meter('usuario', lit({ id: u.id, nombre: u.nombre, correo: u.correo, rol_id: u.rolId, todos_los_campos: u.campos === 'todos', estado: u.estado, desde: u.desde,
    telefono: u.telefono ?? null, alertas: u.alertas, antes_de_suspender: u.antesDeSuspender ?? null }))
  if (u.campos !== 'todos') for (const c of u.campos) meter('usuario_campo', lit({ usuario_id: u.id, campo_id: c }))
}

// ─── (e) configuración firmada
titulo('version_config y su forma normalizada')
for (const v of HIST) {
  meter('version_config', { ...lit({ version: v.version, base: v.version === 1 ? null : v.version - 1, fecha: v.fecha, por_id: 'adm', por: v.por, motivo: v.motivo }),
    cambios: arr(v.cambios), config: js(v.config) })
  const c = v.config
  meter('membrete', lit({ version: v.version, empresa: c.empresa }))
  for (const [cid, cc] of Object.entries(c.campos)) {
    meter('perfil_campo', lit({ version: v.version, campo_id: cid, gas: cc.perfil.gas, bombas: cc.perfil.bombas, electrosumergibles: cc.perfil.electrosumergibles }))
    for (const t of cc.metas) meter('tramo_meta', lit({ version: v.version, campo_id: cid, desde: t.desde, produccion_bpd: t.produccionBpd, diferido_max_bpd: t.diferidoMaxBpd,
      netback_usd: t.netbackUsd ?? null, criterio_sin_causa: t.criterioSinCausa }))
  }
  c.tanques.forEach((t, i) => meter('tanque', lit({ version: v.version, id: t.id, orden: i, nombre: t.nombre, campo_id: t.campoId, bomba: t.bomba, capacidad_bbl: t.capacidadBbl, alto_alto: t.altoAlto, tag_nivel: t.tagNivel, aforo: t.aforo })))
  c.respaldos.forEach((r, i) => meter('respaldo', lit({ version: v.version, campo_id: r.campoId, equipo: r.equipo, orden: i, libre_bpd: r.libreBpd, detalle: r.detalle })))
  c.programa.forEach((p, i) => meter('parada_programada', lit({ version: v.version, id: p.id, orden: i, campo_id: p.campoId, equipo: p.equipo, desde: p.desde, hasta: p.hasta, motivo: p.motivo })))
}

// ─── (g) escrituras a mano
titulo('respuesta_parada (las históricas pegadas a los eventos del demo)')
for (const r of respuestas) meter('respuesta_parada', lit({ evento_id: r.evento, texto: r.texto, por: r.por, por_id: null, hora: r.hora, canal: null }))

// ─── (h) SAP
titulo('SAP: clases, materiales, avisos, órdenes, stock, identidad')
for (const [k, n] of [['PM01', 'correctivo'], ['PM02', 'preventivo'], ['PM03', 'predictivo']]) meter('clase_orden_sap', lit({ clase_sap: k, clase: k, nombre: n }))
const familiaDe = (c, eq) => MOTOR.flota[c].find(f => f.equipo === eq)?.familia ?? null
const materiales = new Map()
const AVISOS = IDS.flatMap(c => leer(join(REF, 'sap', `avisos-${c}.json`)).esperado.datos)
const ORDENES = IDS.flatMap(c => leer(join(REF, 'sap', `ordenes-${c}.json`)).esperado.datos)
for (const o of ORDENES) for (const r of o.repuestos) materiales.set(r.material, r.descripcion)
for (const r of MOTOR.repuestos) materiales.set(r.material, r.descripcion)
for (const [m, d] of materiales) meter('material_sap', lit({ material: m, descripcion: d }))
for (const a of AVISOS) meter('aviso_sap', { ...lit({ numero: a.numero, tipo: a.tipo, campo_id: a.campoId, equipo: a.equipo, descripcion: a.descripcion, prioridad: a.prioridad,
  familia: a.parte ? familiaDe(a.campoId, a.equipo) : null, parte: a.parte ?? null, modo: a.modo ?? null, inicio_averia: a.inicioAveria ?? null, parada: a.parada,
  creado: a.creado, creado_por: a.creadoPor, creado_por_id: null, origen: a.origen, evento_id: a.evento ?? null, cerrado: a.cerrado, actualizado: AHORA }), evidencia: arr(a.evidencia) })
for (const o of ORDENES) {
  meter('orden_sap', lit({ numero: o.numero, clase_sap: o.clase, campo_id: o.campoId, equipo: o.equipo, descripcion: o.descripcion, estado: o.estado, prioridad: o.prioridad,
    creada: o.creada, liberada: o.liberada ?? null, cierre_tecnico: o.cierreTecnico ?? null, tecnico_id: o.tecnico ?? null, puesto: o.puesto, aviso: o.aviso ?? null,
    horas_reales: o.horasReales, evento_id: o.evento ?? null, actualizado: AHORA }))
  for (const r of o.repuestos) meter('repuesto_orden', lit({ orden: o.numero, material: r.material, descripcion: r.descripcion, cantidad: r.cantidad }))
}
const stock = new Map()
for (const r of MOTOR.repuestos) stock.set(`${r.material}|${r.campoId}`, r)
for (const r of stock.values()) {
  meter('stock_sap', lit({ material: r.material, campo_id: r.campoId, stock: r.stock, minimo: r.minimo, plazo_dias: r.plazoDias,
    en_transito_cantidad: r.enTransito?.cantidad ?? null, en_transito_llega: r.enTransito?.llega ?? null, leido: AHORA }))
  for (const e of r.equipos) meter('repuesto_equipo', lit({ material: r.material, campo_id: r.campoId, equipo: e }))
}
for (const x of MOTOR.identidad) if (activos.has(`${x.campoId}|${x.equipo}`)) meter('equipo_sap', lit({ campo_id: x.campoId, equipo: x.equipo, equipo_sap: x.equipoSap, ubicacion: x.ubicacion }))

// ─── (g) WhatsApp y predicciones
titulo('plantilla_whatsapp · prediccion · mensaje')
for (const [clave, p] of Object.entries(MOTOR.plantillas)) meter('plantilla_whatsapp', lit({ clave, nombre: p.nombre, cuerpo: p.cuerpo }))
const PRED = IDS.flatMap(c => leer(join(REF, 'aciertos', `${c}.json`)).esperado.datos.registro)
const predIds = new Set()
for (const p of PRED) {
  predIds.add(p.id)
  const calificada = p.calificacion === 'acierto' ? p.falla.inicio : p.calificacion === 'intervenida' ? p.intervencion : p.calificacion === 'falsa-alarma' ? p.hasta : null
  meter('prediccion', lit({ id: p.id, campo_id: p.campoId, equipo: p.equipo, familia: p.parte ? familiaDe(p.campoId, p.equipo) : null, parte: p.parte ?? null,
    tag: p.tag ?? null, accion: p.accion ?? null, emitida: p.emitida, desde: p.desde, hasta: p.hasta, calificacion: p.calificacion,
    falla_evento_id: p.falla?.id ?? null, falla_inicio: p.falla?.inicio ?? null, intervencion: p.intervencion ?? null, calificada }))
}
for (const m of MOTOR.mensajes) {
  const pred = m.regla === 'parte'
  if (pred && !predIds.has(m.evento)) throw new Error(`mensaje ${m.id}: predicción ${m.evento} sin registro`)
  meter('mensaje', { ...lit({ id: m.id, regla: m.regla, plantilla: m.plantilla, campo_id: m.campoId, equipo: m.equipo, para_id: m.para, telefono: USU[m.para].telefono,
    hora: m.hora, texto: m.texto ?? null, no_enviado: m.noEnviado ?? null, evento_id: pred ? null : m.evento ?? null, prediccion_id: pred ? m.evento : null,
    orden: m.orden ?? null, insistencia: m.insistencia ?? null }), parametros: js(m.parametros), opciones: js(m.opciones ?? null) })
}

// ─── (i) precálculo de meses cerrados y publicados
titulo('factor_asignacion_mes · libro_mes · recalculo_mes')
const publicado = new Map()
for (const c of IDS) for (const m of ins(c, 'produccion-diaria.json').meses) publicado.set(`${c}|${m.mes}`, { pub: m.publicado, dias: m.dias })
for (const x of MOTOR.libros) {
  const pm = publicado.get(`${x.campoId}|${x.mes}`)
  if (!pm?.pub) continue
  const lb = x.libro, fa = lb.fa.find(f => f.campoId === x.campoId && f.mes === x.mes)
  const conDato = pm.dias.filter(v => typeof v === 'number').length
  const banda = CAT.campos[x.campoId].medicion.banda
  meter('factor_asignacion_mes', lit({ campo_id: x.campoId, mes: `${x.mes}-01`, real: lb.real, teorico: fa ? lb.real / fa.fa : 0, dias_con_dato: conDato,
    dias_sin_dato: pm.dias.length - conDato, fa: fa?.fa ?? null, banda: fa?.banda ?? banda.valor, banda_verificable: banda.verificable, dentro: fa ? fa.dentro : null, version_config: 1 }))
  meter('libro_mes', { ...lit({ campo_id: x.campoId, mes: `${x.mes}-01`, real: lb.real, potencial: lb.potencial, brecha: lb.brecha, diferido: lb.diferido, residuo: lb.residuo,
    tolerancia: lb.tolerancia, aproximado: lb.aproximado, identificado: lb.identificado, declarado: lb.declarado, pendiente: lb.pendiente, planeado: lb.planeado,
    no_planeado: lb.noPlaneado, alto_impacto: lb.altoImpacto, anticipable: lb.anticipable, sin_instrumento: lb.sinInstrumento, sin_parte: lb.sinParte,
    evitable_por_orden: lb.evitablePorOrden, pe: lb.pe, meta_produccion: lb.meta.produccion, meta_diferido: lb.meta.diferido, sin_meta: lb.meta.sinMeta.length > 0,
    valor_usd: lb.valorUsd ?? null, sin_precio: lb.sinPrecio.includes(x.campoId), sin_factor: lb.sinFactor.length > 0, publicable: lb.publicable,
    eventos: x.eventos, huella_cifras: x.huella, version_config: 1 }),
    dias_sin_fiscal: darr(lb.sinFiscal.flatMap(s => s.dias.map(diaCo))), motivos: js(lb.motivos), por_tipo: js(lb.porTipo), por_equipo: js(lb.porEquipo),
    por_parte: js(lb.porParte), custodia: js(x.custodia) })
  meter('recalculo_mes', lit({ campo_id: x.campoId, mes: `${x.mes}-01`, motivo: 'Primer cálculo: carga del ejemplo desde el motor del demo', huella_antes: null, huella_despues: x.huella }))
}
titulo('tramo_diferido (La Ceiba, septiembre de 2026, por día)')
for (const t of MOTOR.tramosDia) meter('tramo_diferido', lit({ evento_id: t.evento, dia: t.dia, campo_id: t.campoId, pozo: t.pozo, inicio: t.inicio, fin: t.fin, horas: t.horas,
  factor: t.factor, crudo_prueba_bpd: t.crudo, fa: t.sinFactor ? null : MOTOR.faSep[t.campoId], bbl: t.bbl, aproximado: t.aproximado, sin_custodia: t.sinCustodia,
  sin_factor: t.sinFactor, sesgo: t.sesgo, causa_tipo: t.causa.tipo, causa_equipo: t.causa.equipo, causa_familia: t.causa.parte ? familiaDe(t.campoId, t.causa.equipo) : null,
  causa_parte: t.causa.parte ?? null, causa_como: t.causa.como, causa_evento_id: t.causa.evento ?? null, version_config: 1 }))
titulo('asignacion_pozo_mes (referencia/asignacion)')
for (const c of IDS) for (const x of MOTOR.libros.filter(l => l.campoId === c)) {
  if (!publicado.get(`${c}|${x.mes}`)?.pub) continue
  const f = join(REF, 'asignacion', `${c}-${x.mes}.json`)
  if (!existsSync(f)) { (cuenta._sinCasoAsignacion ??= []).push(`${c}-${x.mes}`); continue }
  const filas = leer(f).esperado.datos
  for (const a of filas) meter('asignacion_pozo_mes', lit({ campo_id: c, mes: `${x.mes}-01`, pozo: a.pozo, horas: a.horas, potencial: a.potencial, diferido: a.diferido, asignado: a.asignado }))
}

out.push('', 'commit;', '', '-- Convenciones de la carga (horas que el demo no trae):', ...CONVENCIONES.map(c => `--   · ${c}`))
writeFileSync(SALIDA, out.join('\n') + '\n')
writeFileSync(join(aqui, 'cuenta-ejemplos.json'), JSON.stringify({ cuenta, convenciones: CONVENCIONES, seriesSinTag: sinTag }, null, 1))
console.log(`ejemplos.sql: ${Object.values(cuenta).filter(n => typeof n === 'number').reduce((a, b) => a + b, 0)} filas en ${Object.keys(cuenta).length} tablas; series sin tag registrado: ${sinTag}`)
