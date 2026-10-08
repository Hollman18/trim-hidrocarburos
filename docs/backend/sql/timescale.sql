-- ═══════════════════════════════════════════════════════════════════════════
--  TRIM Hidrocarburos · TimescaleDB OPCIONAL para la serie `lectura`
--
--  Se corre DESPUÉS de esquema.sql y SOLO si la extensión está instalada en el
--  servidor (paquete timescaledb 2.13 o más nuevo, con shared_preload_libraries
--  = 'timescaledb'):
--      psql -v ON_ERROR_STOP=1 -f timescale.sql
--  Si la extensión no está, el primer bloque se detiene con un error que lo dice
--  (no se instala nada por su cuenta). Sin este archivo la base funciona igual:
--  `lectura` queda con particiones nativas mensuales (esquema.sql).
--
--  Qué hace:
--   1. Reemplaza la tabla `lectura` particionada por una hipertabla con trozos
--      (chunks) de UN MES, copiando lo que ya tuviera.
--   2. Comprime los trozos de más de 3 meses (segmentados por tag).
--   3. Crea dos agregados continuos para las series que pide el front
--      (GET …/tags/:tag/serie con paso 1 h o 1 d), con su política de refresco.
--
--  ESTADO: revisado a mano; NO ejecutado en la validación (TimescaleDB no estaba
--  instalado en la máquina de la validación: ver validacion.log).
-- ═══════════════════════════════════════════════════════════════════════════

set search_path = trim, public;

do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'timescaledb') then
    raise exception 'TimescaleDB no está instalado en este servidor: no corra timescale.sql (lectura sigue con particiones nativas).';
  end if;
end $$;

create extension if not exists timescaledb;

-- 1. De particiones nativas a hipertabla (en una transacción: o todo o nada).
begin;

alter table lectura rename to lectura_nativa;

create table lectura (
  tag_id          bigint not null references tag(id),
  instante        timestamptz not null,
  valor           double precision,
  texto           text,
  calidad         text not null default 'buena' check (calidad in ('buena', 'incierta', 'mala')),
  codigo_calidad  bigint check (codigo_calidad between 0 and 4294967295),
  recibido        timestamptz not null default now(),
  primary key (tag_id, instante),
  check (calidad = 'mala' or valor is not null or texto is not null)
);

select create_hypertable('trim.lectura', by_range('instante', interval '1 month'));

insert into lectura select tag_id, instante, valor, texto, calidad, codigo_calidad, recibido from lectura_nativa;

-- Las particiones nativas se van con su tabla madre.
drop table lectura_nativa;
drop function asegurar_particiones_lectura(date, date);

comment on table lectura is 'Serie de tiempo de cada tag (hipertabla de TimescaleDB, trozos de un mes). De aquí sale GET /api/campos/:campo/tags/:tag/serie (SerieTag, src/entities/tipos.ts). Un hueco del historiador es la AUSENCIA de filas (o una fila de calidad mala): nunca un 0.';
comment on column lectura.tag_id is 'Tag.';
comment on column lectura.instante is 'Marca de tiempo de la fuente (la pone el PLC, el computador de flujo o quien diga dispositivo.reloj), en UTC.';
comment on column lectura.valor is 'Valor numérico. NULL solo con calidad mala (instrumento sin señal: dato inválido).';
comment on column lectura.texto is 'Valor de un tag discreto que llega como texto. NULL en los continuos.';
comment on column lectura.calidad is 'buena, incierta o mala. Una lectura mala no entra en la serie: va como null en su lugar.';
comment on column lectura.codigo_calidad is 'Código de calidad crudo de la fuente (StatusCode de OPC UA de 32 bits o calidad OPC DA de PI).';
comment on column lectura.recibido is 'Hora del servidor al recibirla.';

commit;

-- 2. Compresión: lo de más de 3 meses se comprime por tag (las consultas del
--    vigía y de las series leen un tag a la vez).
alter table lectura set (timescaledb.compress, timescaledb.compress_segmentby = 'tag_id', timescaledb.compress_orderby = 'instante desc');
select add_compression_policy('trim.lectura', interval '3 months');

-- 3. Agregados continuos para las series de paso 1 h y 1 d, en hora de Colombia.
--    `ultimo` es la última lectura válida del paso (lo que usa serie_de);
--    `promedio`, `minimo` y `maximo` quedan para quien decida otra regla.
create materialized view lectura_hora with (timescaledb.continuous) as
select tag_id,
       time_bucket(interval '1 hour', instante, 'America/Bogota') as hora,
       last(valor, instante) as ultimo,
       avg(valor) as promedio, min(valor) as minimo, max(valor) as maximo, count(*) as lecturas
from lectura
where calidad <> 'mala' and valor is not null
group by tag_id, time_bucket(interval '1 hour', instante, 'America/Bogota')
with no data;
comment on materialized view lectura_hora is 'Agregado continuo por hora (hora de Colombia) de las lecturas válidas: base de la serie con paso 1 h.';

create materialized view lectura_dia with (timescaledb.continuous) as
select tag_id,
       time_bucket(interval '1 day', instante, 'America/Bogota') as dia,
       last(valor, instante) as ultimo,
       avg(valor) as promedio, min(valor) as minimo, max(valor) as maximo, count(*) as lecturas
from lectura
where calidad <> 'mala' and valor is not null
group by tag_id, time_bucket(interval '1 day', instante, 'America/Bogota')
with no data;
comment on materialized view lectura_dia is 'Agregado continuo por día de Colombia (00:00 a 24:00) de las lecturas válidas: base de la serie con paso 1 d.';

select add_continuous_aggregate_policy('trim.lectura_hora', start_offset => interval '3 days', end_offset => interval '1 hour', schedule_interval => interval '15 minutes');
select add_continuous_aggregate_policy('trim.lectura_dia', start_offset => interval '35 days', end_offset => interval '1 day', schedule_interval => interval '1 hour');

-- Primer llenado de lo que ya había (fuera de transacción: así lo exige TimescaleDB).
call refresh_continuous_aggregate('trim.lectura_hora', null, null);
call refresh_continuous_aggregate('trim.lectura_dia', null, null);
