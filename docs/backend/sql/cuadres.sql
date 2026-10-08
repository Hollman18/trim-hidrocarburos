-- Cuadres de los datos cargados: las identidades del motor tienen que cumplirse
-- también en las tablas. Cada bloque lanza un error si no cuadra.
set search_path = trim, public;
\pset tuples_only on
\pset format unaligned

do $$ declare x numeric; begin
  -- Σ asignado por pozo = real del campo, en cada mes cerrado (asignacionPorPozo).
  select max(abs(a.s - l.real)) into x from (select campo_id, mes, sum(asignado) s from asignacion_pozo_mes group by 1, 2) a
    join libro_mes l using (campo_id, mes);
  if x is null or x > 1e-6 then raise exception 'Σ asignado ≠ real (máx. diferencia %)', x; end if;
  raise notice 'CUADRA  Σ asignado por pozo = real del campo en % (campo, mes): diferencia máxima % bbl',
    (select count(distinct (campo_id, mes)) from asignacion_pozo_mes), round(x, 9);
end $$;

do $$ declare x numeric; begin
  -- En un mes entero: potencial − real = Σ diferidos (residuo ≈ 0).
  select max(abs(potencial - real - diferido)) into x from libro_mes where dias_sin_fiscal = '{}';
  if x > 1e-6 then raise exception 'potencial − real ≠ diferido (máx. %)', x; end if;
  raise notice 'CUADRA  potencial − real = Σ diferidos en los % meses: diferencia máxima % bbl', (select count(*) from libro_mes), round(x, 9);
end $$;

do $$ declare x double precision; begin
  -- FA = R / T.
  select max(abs(fa - real / teorico)) into x from factor_asignacion_mes where fa is not null;
  if x > 1e-9 then raise exception 'FA ≠ R/T (máx. %)', x; end if;
  raise notice 'CUADRA  FA = R/T en % meses; FA de La Ceiba en sep-2026 = %', (select count(*) from factor_asignacion_mes where fa is not null),
    (select fa from factor_asignacion_mes where campo_id = 'ceiba' and mes = '2026-09-01');
end $$;

do $$ declare a numeric; b numeric; begin
  -- Σ de los tramos por día de La Ceiba en septiembre = diferido del libro del mes (aditividad).
  select sum(bbl) into a from tramo_diferido where campo_id = 'ceiba' and mes = '2026-09-01';
  select diferido into b from libro_mes where campo_id = 'ceiba' and mes = '2026-09-01';
  if abs(a - b) > 1e-6 then raise exception 'Σ tramos por día % ≠ diferido del libro %', a, b; end if;
  raise notice 'CUADRA  Σ tramo_diferido de La Ceiba, sep-2026 = % bbl = libro_mes.diferido', round(a, 6);
end $$;

do $$ declare a numeric; b numeric; begin
  -- El fiscal del mes armado por la vista = real del libro.
  select (select sum(x) from unnest(dias) x) into a from v_produccion_mes where campo_id = 'ceiba' and mes = '2026-09';
  select real into b from libro_mes where campo_id = 'ceiba' and mes = '2026-09-01';
  if a <> b then raise exception 'v_produccion_mes % ≠ libro_mes.real %', a, b; end if;
  raise notice 'CUADRA  Σ v_produccion_mes(ceiba, 2026-09).dias = % bbl = libro_mes.real', a;
end $$;

do $$ declare r record; begin
  -- Contra referencia/mensual/ceiba.json (septiembre de 2026): real 324688, diferido 21691,43528228031, tolerancia 3253,715293317683.
  select real, diferido, tolerancia, valor_usd into r from libro_mes where campo_id = 'ceiba' and mes = '2026-09-01';
  if r.real <> 324688 or abs(r.diferido - 21691.43528228031) > 1e-6 or abs(r.tolerancia - 3253.715293317683) > 1e-6 then
    raise exception 'libro_mes de La Ceiba sep-2026 no es el de referencia/: %', r;
  end if;
  raise notice 'CUADRA  libro_mes(ceiba, sep-2026) = referencia/mensual/ceiba.json: real %, diferido %, tolerancia %, valor USD %', r.real, round(r.diferido, 2), round(r.tolerancia, 2), round(r.valor_usd, 2);
end $$;

do $$ begin
  -- La configuración firmada: el JSON y lo normalizado dicen lo mismo.
  if exists (select 1 from version_config v where config_json(v.version) is distinct from config_normalizada(v.config)) then
    raise exception 'config_json() ≠ JSON firmado';
  end if;
  raise notice 'CUADRA  config_json(v) = JSON firmado en % versión(es); la vigente hoy es la %', (select count(*) from version_config), version_en(now());
end $$;

do $$ declare v double precision[]; c double precision[] := array[2.2, 2.1, 2.2, 2.3, 2.2, 2.1, 2.2, 2.2, 2.3, 2.2, 2.4, 0]; begin
  -- La serie del historiador armada con serie_de: la misma del catálogo (VI-2011 de La Ceiba, 12 días).
  select array_agg(valor order by i) into v from serie_de((select id from tag where campo_id = 'ceiba' and nombre = 'VI-2011'),
    '2026-09-21T14:00:00-05:00'::timestamptz, interval '1 day', 12);
  if v is distinct from c then raise exception 'serie_de(VI-2011) = %, esperaba %', v, c; end if;
  raise notice 'CUADRA  serie_de(VI-2011, desde 2026-09-21 14:00, paso 1 d, 12) = % (catálogo)', v;
end $$;

do $$ declare r record; begin
  select tag, protocolo, reloj, equipo, clase_equipo, formula_id, formula_version, ventana_min, gateway_id into r
    from v_procedencia where campo_id = 'ceiba' and tag = 'PDT-1011';
  if r.formula_id is distinct from 'f1-compresor-aire' or r.formula_version <> 2 then raise exception 'procedencia de PDT-1011: %', r; end if;
  raise notice 'CUADRA  v_procedencia(ceiba, PDT-1011) = %', r;
  select * into r from v_limite_tag where campo_id = 'ceiba' and tag = 'VI-2011';
  if r.alarma_alta <> 3.9 or r.normal_alta <> 3.9 then raise exception 'límite de VI-2011: %', r; end if;
  raise notice 'CUADRA  v_limite_tag(ceiba, VI-2011) = %', r;
end $$;

do $$ declare n integer; begin
  select count(*) into n from v_calendario where publicado;
  raise notice 'CUADRA  v_calendario: % meses, % publicados en todos los campos (octubre de 2026 en curso)', (select count(*) from v_calendario), n;
end $$;
