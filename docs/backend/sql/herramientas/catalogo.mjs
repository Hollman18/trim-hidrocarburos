/* Lectura del catálogo de PostgreSQL (compartido por armar-tablas y comprobar-tablas). */
import { spawnSync } from 'node:child_process'

export function consulta(base, sql) {
  const r = spawnSync('/opt/homebrew/bin/psql', ['-h', '127.0.0.1', '-p', '5440', '-U', 'postgres', '-d', base, '-At', '-v', 'ON_ERROR_STOP=1', '-c', sql], { encoding: 'utf8', maxBuffer: 1 << 28 })
  if (r.status !== 0) throw new Error(`psql salió con ${r.status}: ${r.stderr}`)
  return JSON.parse(r.stdout.trim() || 'null')
}

// RETIRADO (27-oct-2026): un check que nombra el canal de WhatsApp (respuesta_parada.canal y
// entrante_meta_id) lleva la marca en tablas.json, igual en armar-tablas y en comprobar-tablas.
export const conMarca = t => t && /whatsapp/i.test(t) && !t.includes('RETIRADO') ? `RETIRADO (27-oct-2026): ${t}` : t

export const SQL_CATALOGO = `
with rel as (
  select c.oid, c.relname, c.relkind from pg_class c
  where c.relnamespace = 'trim'::regnamespace and c.relkind in ('r', 'p', 'v') and not c.relispartition
)
select json_agg(json_build_object(
  'nombre', rel.relname, 'clase', case rel.relkind when 'v' then 'vista' else 'tabla' end,
  'comentario', obj_description(rel.oid, 'pg_class'),
  'columnas', (select json_agg(json_build_object('nombre', a.attname, 'tipo', format_type(a.atttypid, a.atttypmod), 'nulo', not a.attnotnull,
      'generada', a.attgenerated <> '', 'defecto', pg_get_expr(d.adbin, d.adrelid), 'comentario', col_description(rel.oid, a.attnum), 'num', a.attnum) order by a.attnum)
    from pg_attribute a left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
    where a.attrelid = rel.oid and a.attnum > 0 and not a.attisdropped),
  'restricciones', (select coalesce(json_agg(json_build_object('nombre', k.conname, 'tipo', k.contype,
      'columnas', (select json_agg(a.attname order by x.o) from unnest(k.conkey) with ordinality x(n, o) join pg_attribute a on a.attrelid = k.conrelid and a.attnum = x.n),
      'hacia', case when k.contype = 'f' then (select relname from pg_class where oid = k.confrelid) end,
      'hacia_columnas', case when k.contype = 'f' then (select json_agg(a.attname order by x.o) from unnest(k.confkey) with ordinality x(n, o) join pg_attribute a on a.attrelid = k.confrelid and a.attnum = x.n) end,
      'definicion', pg_get_constraintdef(k.oid), 'diferible', k.condeferrable) order by k.contype, k.conname), '[]'::json)
    from pg_constraint k where k.conrelid = rel.oid),
  'indices_unicos', (select coalesce(json_agg(json_build_object('nombre', ic.relname, 'definicion', pg_get_indexdef(i.indexrelid)) order by ic.relname), '[]'::json)
    from pg_index i join pg_class ic on ic.oid = i.indexrelid
    where i.indrelid = rel.oid and i.indisunique and not exists (select 1 from pg_constraint k where k.conindid = i.indexrelid)),
  'triggers', (select coalesce(json_agg(json_build_object('nombre', t.tgname, 'funcion', p.proname, 'diferido', t.tgdeferrable,
      'eventos', concat_ws(' ', case when t.tgtype & 4 <> 0 then 'INSERT' end, case when t.tgtype & 16 <> 0 then 'UPDATE' end, case when t.tgtype & 8 <> 0 then 'DELETE' end, case when t.tgtype & 32 <> 0 then 'TRUNCATE' end)) order by t.tgname), '[]'::json)
    from pg_trigger t join pg_proc p on p.oid = t.tgfoid where t.tgrelid = rel.oid and not t.tgisinternal)
) order by rel.oid) from rel`

