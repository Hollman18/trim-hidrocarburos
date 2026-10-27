/* Comprueba v1-cadena.sql contra el SQL que rige, simulador-api/esquema.sql:
   el esquema v1 tiene exactamente sus tablas y su vista v_procedencia, cada una
   con las mismas columnas en el mismo orden y con el tipo equivalente
   (text → text, integer → integer, real → double precision); cada vista da las
   filas que le tocan (las de su tabla del modelo nuevo; semilla, ninguna), los
   ids de texto no se repiten y las referencias de la v1 cierran. Sale con 1 si
   algo no coincide.
   Uso: node comprobar-v1.mjs <raiz del proyecto> <base con esquema.sql, ejemplos.sql y v1-cadena.sql> */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { consulta } from './catalogo.mjs'

const [RAIZ, BASE] = process.argv.slice(2)
if (!RAIZ || !BASE) throw new Error('uso: node comprobar-v1.mjs <raiz> <base>')
const sql = readFileSync(join(RAIZ, 'simulador-api', 'esquema.sql'), 'utf8')
const TIPO = { text: 'text', integer: 'integer', real: 'double precision' }
const fallas = []
const mal = m => fallas.push(m)

// ── Lo que dice la v1: tablas (columna y tipo, en orden) y la vista v_procedencia.
const v1 = new Map()
for (const [, nombre, cuerpo] of sql.matchAll(/create table if not exists (\w+) \(([\s\S]*?)\n\);/g)) {
  const cols = []
  for (const l of cuerpo.split('\n')) {
    const x = l.replace(/--.*$/, '').trim()
    if (!x || /^(unique|primary|foreign|check|constraint)\b/i.test(x)) continue
    const [col, tipo] = x.replace(/,$/, '').split(/\s+/)
    if (!TIPO[tipo]) throw new Error(`${nombre}.${col}: tipo ${tipo} sin equivalente`)
    cols.push({ nombre: col, tipo: TIPO[tipo] })
  }
  v1.set(nombre, cols)
}
const vista = sql.match(/create view if not exists (\w+) as\s+select([\s\S]*?)\nfrom ([\s\S]*?);/)
if (!vista) throw new Error('no encuentro la vista de simulador-api/esquema.sql')
const alias = Object.fromEntries([...`from ${vista[3]}`.matchAll(/(?:from|join)\s+(\w+)\s+(\w+)/g)].map(([, t, a]) => [a, t]))
v1.set(vista[1], [...vista[2].matchAll(/(\w+)\.(\w+)\s+as\s+(\w+)/g)].map(([, a, c, como]) => {
  const t = v1.get(alias[a])?.find(x => x.nombre === c)
  if (!t) throw new Error(`${vista[1]}.${como}: no encuentro ${a}.${c}`)
  return { nombre: como, tipo: t.tipo }
}))

// ── Lo que hay en la base: el esquema v1.
const hay = consulta(BASE, `select coalesce(json_agg(json_build_object('t', table_name, 'c', column_name, 'tipo', data_type) order by table_name, ordinal_position), '[]')
  from information_schema.columns where table_schema = 'v1'`)
const enBase = new Map()
for (const x of hay) { if (!enBase.has(x.t)) enBase.set(x.t, []); enBase.get(x.t).push({ nombre: x.c, tipo: x.tipo }) }
for (const n of v1.keys()) if (!enBase.has(n)) mal(`falta v1.${n}`)
for (const n of enBase.keys()) if (!v1.has(n)) mal(`sobra v1.${n}: no está en simulador-api/esquema.sql`)
for (const [n, cols] of v1) {
  const b = enBase.get(n)
  if (!b) continue
  const a = cols.map(c => c.nombre).join(', '), z = b.map(c => c.nombre).join(', ')
  if (a !== z) { mal(`v1.${n}: columnas distintas o en otro orden\n      v1:    ${a}\n      base:  ${z}`); continue }
  cols.forEach((c, i) => { if (c.tipo !== b[i].tipo) mal(`v1.${n}.${c.nombre}: tipo ${b[i].tipo}, la v1 pide ${c.tipo}`) })
}

// ── Filas: las de su tabla del modelo nuevo; ids únicos; referencias que cierran.
const FUENTE_DE_FILAS = {
  campo: 'select count(*) from trim.campo', gateway: 'select count(*) from trim.gateway', fuente: 'select count(*) from trim.dispositivo',
  equipo: 'select count(*) from trim.equipo', tag: 'select count(*) from trim.tag', formula: 'select count(distinct id) from trim.formula',
  calibracion: 'select count(*) from trim.calibracion', historial_tag: 'select count(*) from trim.historial_tag', rechazo: 'select count(*) from trim.rechazo',
  semilla: 'select 0', v_procedencia: 'select count(*) from trim.v_procedencia',
}
const CON_FILAS_EN_EL_DEMO = ['campo', 'gateway', 'fuente', 'equipo', 'tag', 'formula', 'calibracion', 'v_procedencia']
const CUENTAS = consulta(BASE, `select json_build_object(${Object.entries(FUENTE_DE_FILAS).map(([n, q]) =>
  `'${n}', json_build_array((select count(*) from v1.${n}), (${q}))`).join(', ')})`)
const CERRADO = {
  'ids únicos': `select json_agg(x) from (
      select 'campo.id' as x from v1.campo group by id having count(*) > 1 union all
      select 'gateway.id' from v1.gateway group by id having count(*) > 1 union all
      select 'fuente.id ' || id from v1.fuente group by id having count(*) > 1 union all
      select 'equipo.id ' || id from v1.equipo group by id having count(*) > 1 union all
      select 'tag.id ' || id from v1.tag group by id having count(*) > 1 union all
      select 'formula.id ' || id from v1.formula group by id having count(*) > 1 union all
      select 'calibracion.tag_id ' || tag_id from v1.calibracion group by tag_id having count(*) > 1) s`,
  'referencias de la v1': `select json_agg(x) from (
      select 'fuente.gateway_id ' || gateway_id as x from v1.fuente where gateway_id not in (select id from v1.gateway) union all
      select 'gateway.campo_id ' || campo_id from v1.gateway where campo_id not in (select id from v1.campo) union all
      select 'tag.fuente_id ' || fuente_id from v1.tag where fuente_id not in (select id from v1.fuente) union all
      select 'tag.equipo_id ' || equipo_id from v1.tag where equipo_id is not null and equipo_id not in (select id from v1.equipo) union all
      select 'equipo.campo_id ' || campo_id from v1.equipo where campo_id not in (select id from v1.campo) union all
      select 'calibracion.tag_id ' || tag_id from v1.calibracion where tag_id not in (select id from v1.tag) union all
      select 'historial_tag.tag_id ' || tag_id from v1.historial_tag where tag_id not in (select id from v1.tag) union all
      select 'v_procedencia.tag_id ' || tag_id from v1.v_procedencia where tag_id not in (select id from v1.tag)) s`,
  'fechas ISO como las escribe el simulador': `select json_agg(x) from (
      select 'gateway ' || id as x from v1.gateway where primer_visto !~ '^\\d{4}-\\d\\d-\\d\\dT\\d\\d:\\d\\d:\\d\\d\\.\\d{3}Z$' or ultimo_visto !~ '^\\d{4}-\\d\\d-\\d\\dT\\d\\d:\\d\\d:\\d\\d\\.\\d{3}Z$' union all
      select 'calibracion ' || tag_id from v1.calibracion where vigente_hasta !~ '^\\d{4}-\\d\\d-\\d\\d$') s`,
}
for (const [n, cols] of v1) {
  const [filas, esperadas] = CUENTAS[n] ?? []
  if (filas === undefined) { mal(`v1.${n}: sin cuenta de filas`); continue }
  if (filas !== esperadas) mal(`v1.${n}: ${filas} filas y su tabla del modelo nuevo tiene ${esperadas}`)
  if (CON_FILAS_EN_EL_DEMO.includes(n) && filas === 0) mal(`v1.${n}: sin filas, y el demo las carga`)
  console.log(`v1.${n}: ${cols.length} columnas como en simulador-api/esquema.sql (nombre, orden y tipo) · ${filas} filas`)
}
for (const [que, q] of Object.entries(CERRADO)) {
  const r = consulta(BASE, q)
  if (r?.length) mal(`${que}: ${r.slice(0, 10).join(' · ')}`)
  else console.log(`${que}: bien`)
}
if (fallas.length) { console.log(`v1-cadena.sql NO COINCIDE con la v1 (${fallas.length}):`); for (const f of fallas) console.log(`  · ${f}`); process.exit(1) }
console.log(`v1-cadena.sql COINCIDE con simulador-api/esquema.sql: ${v1.size} tablas y vistas de la v1, mismas columnas en el mismo orden`)
