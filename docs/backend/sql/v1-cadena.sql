-- ═══════════════════════════════════════════════════════════════════════════
--  TRIM Hidrocarburos · la cadena de datos de la versión 1, leída del modelo nuevo
--
--  RIGE EL SQL DE LA VERSIÓN 1: simulador-api/esquema.sql (SQLite en el
--  simulador; PostgreSQL en producción). Ese archivo no cambió y no se toca.
--  docs/backend/sql/esquema.sql (PostgreSQL 16) es AGREGADO, al lado: la
--  versión 2 del modelo, sin quitarle nada a la v1 (CAMBIOS-CONTRATO.md §4.6,
--  C19 y Q1 a Q5).
--
--  Este archivo crea el esquema `v1` con una vista por cada tabla de la v1 y su
--  vista v_procedencia, con los MISMOS nombres y las MISMAS columnas en el mismo
--  orden. Así lo que el desarrollador escribió contra la v1 (select … from
--  campo, tag, v_procedencia…) lee igual, poniendo `set search_path = v1`.
--  Las vistas son de solo lectura: lo que se escribe va al modelo nuevo (`trim`).
--
--  Cómo se arma cada columna de la v1 desde el modelo nuevo:
--   · Ids de texto como en el simulador (simulador-api/base.mjs y generar-semilla.mjs):
--       fuente.id  = gateway:protocolo:dispositivo  (una fila por dispositivo; Q1)
--       equipo.id  = campo:codigo                   (Q2)
--       tag.id     = campo:tag                      (C19; también calibracion.tag_id,
--                                                    historial_tag.tag_id y v_procedencia.tag_id)
--       tag.fuente_id = el id de fuente de su dispositivo (Q3)
--       tag.equipo_id = campo:equipo_codigo          (Q4; NULL si está pendiente)
--   · fuente.reloj sale de dispositivo.reloj (Q1).
--   · Las fechas de la v1 son text: aquí van en ISO 8601, como las escribe el
--     simulador (new Date().toISOString(): 2026-10-02T19:00:00.000Z, en UTC);
--     las de un día (calibracion.vigente_hasta, historial_tag.calibracion_hasta)
--     como AAAA-MM-DD.
--   · formula.activa es integer (1 o 0), como en la v1; de una fórmula con varias
--     versiones se da UNA fila por id (la activa o, si ninguna lo está, la más
--     nueva), porque en la v1 el id es la clave.
--   · integer de la v1 → integer; real de la v1 (8 bytes en SQLite) → double
--     precision; text → text.
--   · semilla queda VACÍA: es solo del simulador (Q5).
--   · equipo trae los equipos de superficie (el registro de ingeniería de la v1).
--     Un tag que el modelo nuevo asocia a un pozo (no pasa en el demo) trae su
--     equipo_id con la forma de la v1, sin fila en v1.equipo.
--
--  v_procedencia: v1.v_procedencia da las 32 columnas de la v1. Las columnas
--  nuevas (dispositivo, alarma_alta, alarma_baja y alarma_fuente) son AGREGADO y
--  solo están en trim.v_procedencia, donde además tag_id es el número del tag.
--
--  Se corre DESPUÉS de esquema.sql (y de ejemplos.sql, si se quieren filas):
--      psql -v ON_ERROR_STOP=1 -f esquema.sql -f v1-cadena.sql
--  herramientas/validar.sh lo corre y herramientas/comprobar-v1.mjs comprueba
--  nombres, orden y tipos de las columnas contra simulador-api/esquema.sql.
-- ═══════════════════════════════════════════════════════════════════════════

create schema if not exists v1;
comment on schema v1 is 'La cadena de datos de la versión 1 (simulador-api/esquema.sql, la que rige), leída del modelo nuevo (trim): mismas tablas, mismas columnas, mismo orden. Solo lectura.';

-- El instante como lo escribe el simulador (toISOString, en UTC).
create or replace function v1.iso(t timestamptz) returns text language sql immutable as $$
  select to_char(t at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
$$;
comment on function v1.iso(timestamptz) is 'Un instante en ISO 8601 y UTC con milisegundos (2026-10-02T19:00:00.000Z), igual que new Date().toISOString() del simulador.';

create or replace view v1.campo as
select c.id, c.nombre
from trim.campo c;
comment on view v1.campo is 'campo de la v1 (id, nombre). Las columnas nuevas (cuenca, choke, nota) son AGREGADO en trim.campo.';

create or replace view v1.gateway as
select g.id, g.campo_id, g.modelo, g.serie, g.firmware, g.enlace,
       g.buffer_h::integer as buffer_h,
       v1.iso(g.primer_visto) as primer_visto,
       v1.iso(g.ultimo_visto) as ultimo_visto
from trim.gateway g;
comment on view v1.gateway is 'gateway de la v1: buffer_h integer y las fechas como texto ISO. certificado_huella es AGREGADO en trim.gateway.';

create or replace view v1.fuente as
select g.id || ':' || f.protocolo || ':' || d.nombre as id,
       d.gateway_id, f.protocolo, f.endpoint, f.modo, d.reloj
from trim.dispositivo d
join trim.fuente f on f.id = d.fuente_id
join trim.gateway g on g.id = d.gateway_id;
comment on view v1.fuente is 'fuente de la v1: una fila por dispositivo, con id gateway:protocolo:dispositivo y el reloj del dispositivo (Q1). En el modelo nuevo son dos tablas: trim.fuente y trim.dispositivo.';

create or replace view v1.equipo as
select e.campo_id || ':' || e.codigo as id, e.campo_id, e.codigo, e.nombre,
       e.clase_iso as clase, e.criticidad::integer as criticidad
from trim.equipo e;
comment on view v1.equipo is 'equipo de la v1: id campo:codigo (Q2) y clase = la clase de ISO 14224 (trim.equipo.clase_iso). Las columnas nuevas (sistema, servicio, modo_falla…) son AGREGADO en trim.equipo.';

create or replace view v1.tag as
select t.campo_id || ':' || t.nombre as id,
       t.campo_id,
       d.gateway_id || ':' || f.protocolo || ':' || d.nombre as fuente_id,
       case when t.equipo_codigo is not null then t.campo_id || ':' || t.equipo_codigo end as equipo_id,
       t.nombre, t.tipo, t.unidad, t.limite_texto, t.limite_bajo, t.limite_alto, t.cadencia_s, t.clase, t.origen_mapeo
from trim.tag t
join trim.dispositivo d on d.id = t.dispositivo_id
join trim.fuente f on f.id = d.fuente_id;
comment on view v1.tag is 'tag de la v1: id campo:tag (C19), fuente_id con el id de v1.fuente (Q3) y equipo_id campo:codigo (Q4). dispositivo_id, equipo_codigo y actualizado son AGREGADO en trim.tag.';

create or replace view v1.formula as
select distinct on (fo.id)
       fo.id, fo.clase_equipo, fo.tipo_tag, fo.expresion, fo.version, fo.ventana_min,
       case when fo.activa then 1 else 0 end as activa
from trim.formula fo
order by fo.id, fo.activa desc, fo.version desc;
comment on view v1.formula is 'formula de la v1: una fila por id (la versión activa o la más nueva) y activa como integer 1/0 (C19). Todas las versiones están en trim.formula.';

create or replace view v1.calibracion as
select t.campo_id || ':' || t.nombre as tag_id,
       to_char(c.vigente_hasta, 'YYYY-MM-DD') as vigente_hasta,
       c.detalle
from trim.calibracion c
join trim.tag t on t.id = c.tag_id;
comment on view v1.calibracion is 'calibracion de la v1: tag_id campo:tag y vigente_hasta como texto AAAA-MM-DD (C19).';

create or replace view v1.historial_tag as
select t.campo_id || ':' || t.nombre as tag_id,
       v1.iso(h.reemplazado) as reemplazado,
       h.gateway_id, h.tipo, h.unidad, h.limite_texto, h.limite_bajo, h.limite_alto, h.cadencia_s, h.clase,
       to_char(h.calibracion_hasta, 'YYYY-MM-DD') as calibracion_hasta,
       h.calibracion_detalle
from trim.historial_tag h
join trim.tag t on t.id = h.tag_id;
comment on view v1.historial_tag is 'historial_tag de la v1: tag_id campo:tag y las fechas como texto (C19). El id consecutivo es AGREGADO en trim.historial_tag.';

create or replace view v1.rechazo as
select v1.iso(r.cuando) as cuando, r.gateway_id, r.campo_id, r.motivo
from trim.rechazo r;
comment on view v1.rechazo is 'rechazo de la v1: cuando como texto ISO. id, codigo y tags son AGREGADO en trim.rechazo.';

create or replace view v1.semilla as
select null::text as huella
where false;
comment on view v1.semilla is 'semilla de la v1: VACÍA. Es solo del simulador (la huella de la semilla con que se llenó su base); el modelo nuevo no la tiene (Q5).';

create or replace view v1.v_procedencia as
select
  p.campo_id || ':' || p.tag as tag_id,
  p.tag,
  p.tipo,
  p.unidad,
  p.limite_texto,
  p.limite_bajo,
  p.limite_alto,
  p.cadencia_s,
  p.clase_tag,
  p.origen_mapeo,
  p.campo_id,
  p.protocolo,
  p.endpoint,
  p.modo,
  p.reloj,
  p.gateway_id,
  p.gateway_modelo,
  p.gateway_serie,
  p.gateway_firmware,
  p.enlace,
  p.buffer_h::integer as buffer_h,
  v1.iso(p.ultimo_visto) as ultimo_visto,
  p.equipo_codigo,
  p.equipo,
  p.clase_equipo,
  p.criticidad::integer as criticidad,
  p.formula_id,
  p.formula,
  p.formula_version,
  p.ventana_min,
  to_char(p.calibracion_hasta, 'YYYY-MM-DD') as calibracion_hasta,
  p.calibracion_detalle
from trim.v_procedencia p;
comment on view v1.v_procedencia is 'v_procedencia de la v1 (32 columnas), leída de trim.v_procedencia: tag_id campo:tag y fechas como texto. Las columnas dispositivo, alarma_alta, alarma_baja y alarma_fuente son AGREGADO y solo están en trim.v_procedencia.';
