/* Arma tablas.json (la especificación para el Excel) leyendo el catálogo de la
   base cargada con esquema.sql + ejemplos.sql, más herramientas/metadatos.mjs.
   Uso: node armar-tablas.mjs <base> <salida.json>          (psql en 127.0.0.1:5440) */
import { consulta, SQL_CATALOGO } from './catalogo.mjs'
import { writeFileSync } from 'node:fs'
import { GRUPOS, TABLAS } from './metadatos.mjs'

const [BASE, SALIDA] = process.argv.slice(2)
if (!BASE || !SALIDA) throw new Error('uso: node armar-tablas.mjs <base> <salida.json>')

const FUNCION_REGLA = {
  solo_insercion: 'Solo inserción: UPDATE, DELETE y TRUNCATE rechazados (SQLSTATE 23001).',
  evento_solo_cierre: 'La hora del PLC no se corrige: solo se pone fin a un evento abierto (una vez) y, en una parada, la firma (una vez); no se borra.',
  tag_reglas: 'Solo su gateway lo vuelve a declarar; un nacimiento no deshace un mapeo manual o por regla.',
  usuario_reglas: 'Nadie se borra; alertas solo en roles con alertas.',
  usuario_coherente: 'Al confirmar: queda un gerente activo y cada persona tiene «todos» o al menos un campo.',
  version_config_coherente: 'Al confirmar: todo campo trae un tramo y el JSON firmado = la forma normalizada.',
  respuesta_parada_reglas: 'Solo eventos de pozo o de bomba; el modo es de la parte (u OTH).',
  analisis_reglas: 'Exige respuesta con parte; versiones consecutivas.',
  prediccion_califica: 'Lo emitido no cambia; la calificación se agrega una vez; no se borra.',
  mensaje_solo_meta_id: 'Solo inserción; el id de Meta se pone una vez.',
  estado_mensaje_de_saliente: 'El id de Meta es de un mensaje o de un mensaje_libre registrado (hace de clave foránea a las dos).',
  planta_id_unico: 'Un id no se repite entre elementos y miembros del campo.',
  precalculo_no_se_actualiza: 'No se actualiza en sitio: el mes se recalcula (borrar e insertar) y se anota en recalculo_mes.',
  topologia_pozos_del_campo: 'Cada pozo del elemento es del campo (validarTopologia, 422).',
  topologia_por_saber_unica: 'El equipo no está a la vez en la topología del mismo campo (validarConfig, 422).',
  anh_escrito_reglas: 'El evento es del campo y el rol tiene anh:clasificar.',
  revision_atendida_reglas: 'La atiende el rol al que se le pidió o, sin pedir_a, uno que revisa.',
  clasificacion_paso_reglas: 'El evento es del campo; el rol tiene anh:clasificar (anh:confirmar en lote, anh:yacimiento para «En el yacimiento»); la fila está en su lote.',
  clasificacion_coherente: 'Al confirmar: lo vigente de la parada es coherente (planeada con P_…, no planeada con NP_…, el detalle de su causa).',
  confirmacion_lote_reglas: 'Confirma en lote quien tiene anh:confirmar.',
}

const FILAS_SQL = {
  lectura: `where tag_id = (select id from trim.tag where campo_id = 'ceiba' and nombre = 'VI-2011') order by instante`,
  evento_pozo: `where id in ('EP-LC21-261001-01', 'EP-LC06-260814-04', 'EP-LC04-260906-85', 'EP-MN07-260214-32', 'EP-LC16-261002-78') order by inicio`,
  evento: `where id in ('EP-LC21-261001-01', 'EV-2011-0809', 'SV-SE-2-260828', 'EV-2011-1002', 'EP-LC04-260906-85') order by id`,
  parada_bomba: `where id in ('EV-2011-0809', 'EV-2011-1002', 'EV-2011-260128', 'EV-2011-260819') or (campo_id = 'morichal' and perdida < 1) order by inicio`,
  evento_servicio: `order by inicio desc`,
  tag: `where campo_id = 'ceiba' and nombre in ('VI-2011', 'PDT-1011', 'FQI-0101', 'LSH-2013', 'XI-1017') order by nombre`,
  calibracion: `order by tag_id`,
  produccion_fiscal_diaria: `where campo_id = 'ceiba' and dia in ('2025-10-19', '2025-10-20', '2026-09-30', '2026-10-01', '2026-10-02') order by dia`,
  mes_fiscal: `where campo_id = 'ceiba' order by mes desc`,
  prueba_pozo: `where campo_id = 'ceiba' and pozo = 'LC-01' order by fecha`,
  pozo: `where id in ('LC-01', 'LC-21', 'MN-07', 'ZA-09', 'PA-03') order by campo_id, id`,
  tramo_diferido: `order by bbl desc`,
  libro_mes: `where mes = '2026-09-01' order by campo_id`,
  factor_asignacion_mes: `where mes = '2026-09-01' order by campo_id`,
  asignacion_pozo_mes: `where campo_id = 'ceiba' and mes = '2026-09-01' order by asignado desc`,
  mensaje: `where id in (select min(id) from trim.mensaje group by regla) order by regla`,
  aviso_sap: `order by cerrado, creado desc`,
  orden_sap: `order by estado <> 'REL', creada desc`,
  prediccion: `order by calificacion, emitida desc`,
  ajuste_variador: `where campo_id = 'ceiba' and pozo = 'LC-01'`,
  alarma_tag: `order by tag_id`,
  version_config: ``,
  usuario: `order by id`,
  equipo: `where campo_id = 'ceiba' order by codigo`,
  activo: `where campo_id = 'ceiba' order by clase, codigo`,
  perfil_bomba_tag: `where campo_id = 'ceiba' order by variable`,
  respuesta_parada: `order by hora desc`,
}
const LARGO = 1500
const recortar = v => {
  if (v === null || v === undefined) return null
  const s = typeof v === 'string' ? v : JSON.stringify(v)
  if (s.length <= LARGO) return v
  return `${s.slice(0, LARGO)}… [recortado para el Excel: ${s.length} caracteres]`
}

const cat = consulta(BASE, SQL_CATALOGO)
const relaciones = []
const tablas = cat.map(t => {
  const meta = TABLAS[t.nombre]
  if (!meta) throw new Error(`metadatos.mjs no describe ${t.nombre}`)
  const R = t.restricciones
  const pk = R.find(k => k.tipo === 'p')?.columnas ?? []
  let filas = []
  if (true) {
    const extra = FILAS_SQL[t.nombre] ?? (pk.length ? `order by ${pk.join(', ')}` : '')
    filas = consulta(BASE, `select coalesce(json_agg(x), '[]') from (select * from trim.${t.nombre} t ${extra} limit 5) x`)
      .map(f => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, typeof v === 'object' && v !== null ? recortar(v) : typeof v === 'string' ? recortar(v) : v])))
  }
  const columnas = t.columnas.map(c => {
    const fks = R.filter(k => k.tipo === 'f' && k.columnas.includes(c.nombre))
    const uns = R.filter(k => k.tipo === 'u' && k.columnas.includes(c.nombre))
    const chk = R.filter(k => k.tipo === 'c' && new RegExp(`\\b${c.nombre}\\b`).test(k.definicion))
    const ej = filas.find(f => f[c.nombre] !== null && f[c.nombre] !== undefined)?.[c.nombre]
    return {
      nombre: c.nombre, tipo: c.tipo + (c.generada ? ' (generada)' : ''), nulo: c.nulo, pk: pk.includes(c.nombre),
      fk: fks.length ? fks.map(k => `${k.hacia}.${k.hacia_columnas[k.columnas.indexOf(c.nombre)]}`).join(' · ') : null,
      unico: uns.length ? uns.map(k => k.columnas.length === 1 ? 'único' : `único con (${k.columnas.join(', ')})`).join(' · ') : null,
      check: chk.length ? chk.map(k => k.definicion).join(' · ') : null,
      defecto: c.defecto ?? null,
      descripcion: c.comentario,
      ejemplo: ej === undefined ? null : ej,
    }
  })
  for (const k of R.filter(x => x.tipo === 'f')) {
    const fuente = t.columnas.find(c => c.nombre === k.columnas[0])
    const esUno = [pk, ...R.filter(x => x.tipo === 'u').map(x => x.columnas)].some(u => u.length > 0 && u.every(c => k.columnas.includes(c)))
    relaciones.push({ desde: `${t.nombre}.${k.columnas.join(',')}`, hacia: `${k.hacia}.${k.hacia_columnas.join(',')}`, cardinalidad: esUno ? '1:1' : 'N:1',
      descripcion: fuente?.comentario ?? '', restriccion: k.nombre, diferible: k.diferible })
  }
  const reglas = [
    ...meta.reglas,
    ...R.filter(k => k.tipo === 'u').map(k => `Único: (${k.columnas.join(', ')}).`),
    ...t.indices_unicos.map(i => `Índice único: ${i.definicion.replace(/^CREATE UNIQUE INDEX \S+ ON trim\.\S+ USING btree /, '')}.`),
    ...t.triggers.map(g => `${FUNCION_REGLA[g.funcion] ?? g.funcion} [trigger ${g.nombre}: ${g.eventos}${g.diferido ? ', diferido' : ''}]`),
  ]
  return {
    nombre: t.nombre, grupo: meta.grupo, clase: t.clase, descripcion: t.comentario, tipoTS: meta.tipoTS, endpoints: meta.endpoints,
    quienEscribe: meta.quienEscribe, reglas: [...new Set(reglas)], columnas, filas,
  }
})
const sobran = Object.keys(TABLAS).filter(n => !cat.some(t => t.nombre === n))
if (sobran.length) throw new Error(`metadatos.mjs describe tablas que no existen: ${sobran.join(', ')}`)
writeFileSync(SALIDA, JSON.stringify({ generado: 'herramientas/armar-tablas.mjs desde la base cargada con esquema.sql + ejemplos.sql', grupos: GRUPOS, tablas, relaciones }, null, 1))
console.log(`tablas.json: ${tablas.filter(t => t.clase === 'tabla').length} tablas, ${tablas.filter(t => t.clase === 'vista').length} vistas, ${relaciones.length} relaciones, ${tablas.reduce((a, t) => a + t.filas.length, 0)} filas de ejemplo`)
