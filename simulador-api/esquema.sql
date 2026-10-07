-- ───────────────────────────────────────────────────────────────────────────
--  Registro de la cadena de datos · ESPECIFICACIÓN
--
--  Este archivo es la entrega para quien construya el backend. El
--  simulador lo corre en SQLite; en producción va en PostgreSQL.
--
--  Un cliente nuevo son FILAS, no código. Nada de esta tabla se escribe a
--  mano por cliente: el borde se presenta con su certificado de nacimiento
--  (NBIRTH/DBIRTH de Sparkplug B) y gateway, fuente y tags se crean solos.
--  Lo único que declara una persona es a qué equipo pertenece cada tag, y
--  solo cuando el borde no lo trae resuelto.
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists campo (
  id      text primary key,
  nombre  text not null
);

-- Se crea sola al recibir el NBIRTH del borde.
create table if not exists gateway (
  id            text primary key,
  campo_id      text not null references campo(id),
  modelo        text,
  serie         text,
  firmware      text,
  enlace        text,               -- starlink | fibra | lte
  buffer_h      integer,            -- autonomía de la cola local
  primer_visto  text,
  ultimo_visto  text
);

-- Un conector del borde hacia una fuente de datos del campo.
create table if not exists fuente (
  id          text primary key,
  gateway_id  text not null references gateway(id),
  protocolo   text not null,        -- pi-web-api | opc-ua | modbus-tcp | roc-plus | atg | laboratorio | ruta-manual | sis | calculado
  endpoint    text,
  modo        text not null default 'solo-lectura',
  reloj       text not null         -- quién estampa la marca de tiempo
);

-- Registro de ingeniería: lo declara una persona una vez por campo.
-- Un mismo tipo de equipo existe en varios campos: la identidad es
-- (campo, código), no el código solo.
create table if not exists equipo (
  id          text primary key,     -- campo:codigo
  campo_id    text not null references campo(id),
  codigo      text not null,        -- P-201B
  nombre      text not null,
  clase       text not null,        -- taxonomía ISO 14224
  criticidad  integer,
  unique (campo_id, codigo)
);

-- Descubierto del DBIRTH. `equipo_id` es el único dato que a veces falta.
-- Un re-nacimiento (cada reconexión de Sparkplug) actualiza la descripción
-- del tag pero NUNCA deshace un mapeo `manual` o `regla`: eso lo declaró una
-- persona. Solo el gateway que publica el tag puede volver a declararlo.
create table if not exists tag (
  id            text primary key,     -- campo:tag
  campo_id      text not null references campo(id),
  fuente_id     text not null references fuente(id),
  equipo_id     text references equipo(id),
  nombre        text not null,
  tipo          text,
  unidad        text,
  limite_texto  text,
  limite_bajo   real,
  limite_alto   real,
  cadencia_s    real,
  clase         text not null default 'continua',   -- continua | discreta
  origen_mapeo  text not null default 'pendiente'   -- descubierto | regla | manual | pendiente
);

-- Librería del producto, versionada. Igual para todos los clientes.
-- Una fórmula produce UNA variable (`tipo_tag`) de una clase de equipo, y
-- solo se muestra en el tag que es ese cálculo (fuente `calculado`): antes se
-- unía por clase de equipo y la corriente o la temperatura de una bomba
-- aparecían «calculadas» como potencia / caudal.
create table if not exists formula (
  id            text primary key,
  clase_equipo  text not null,
  tipo_tag      text not null,      -- la variable que produce: «Derivada de presión»
  expresion     text not null,
  version       integer not null default 1,
  ventana_min   integer,
  activa        integer not null default 1
);

-- Solo donde de verdad existe: medición en custodia.
create table if not exists calibracion (
  tag_id         text primary key references tag(id),
  vigente_hasta  text,
  detalle        text
);

-- Lo que un re-nacimiento cambió de un tag (límite, unidad, cadencia,
-- calibración) no se pierde: la fila anterior queda aquí, con quién la cambió.
create table if not exists historial_tag (
  tag_id               text not null references tag(id),
  reemplazado          text not null,
  gateway_id           text not null,
  tipo                 text,
  unidad               text,
  limite_texto         text,
  limite_bajo          real,
  limite_alto          real,
  cadencia_s           real,
  clase                text,
  calibracion_hasta    text,
  calibracion_detalle  text
);

-- Nacimientos rechazados: un borde que se presenta con otro campo o que
-- declara tags de otro gateway es un hecho de seguridad y queda registrado.
create table if not exists rechazo (
  cuando      text not null,
  gateway_id  text,
  campo_id    text,
  motivo      text not null
);

-- Solo del simulador: la huella de la semilla y del esquema con que se llenó
-- la base. Si no coincide al arrancar, la base se reconstruye y se avisa.
create table if not exists semilla (
  huella  text not null
);

-- Un tag es del campo de su gateway. Lo obliga la base, no solo el código
-- que escribe: en PostgreSQL, el mismo trigger (o una FK compuesta).
create trigger if not exists tag_del_campo_de_su_gateway_i before insert on tag
when (select g.campo_id from fuente f join gateway g on g.id = f.gateway_id where f.id = new.fuente_id) is not new.campo_id
begin select raise(abort, 'el tag es de otro campo que su gateway'); end;
create trigger if not exists tag_del_campo_de_su_gateway_u before update of campo_id, fuente_id on tag
when (select g.campo_id from fuente f join gateway g on g.id = f.gateway_id where f.id = new.fuente_id) is not new.campo_id
begin select raise(abort, 'el tag es de otro campo que su gateway'); end;

create index if not exists ix_tag_equipo on tag(equipo_id);
create index if not exists ix_historial_tag on historial_tag(tag_id);
create index if not exists ix_gateway_campo on gateway(campo_id);

-- La cadena no se escribe: se consulta. Esta vista ES la procedencia.
create view if not exists v_procedencia as
select
  t.id            as tag_id,
  t.nombre        as tag,
  t.tipo          as tipo,
  t.unidad        as unidad,
  t.limite_texto  as limite_texto,
  t.limite_bajo   as limite_bajo,
  t.limite_alto   as limite_alto,
  t.cadencia_s    as cadencia_s,
  t.clase         as clase_tag,
  t.origen_mapeo  as origen_mapeo,
  t.campo_id      as campo_id,
  f.protocolo     as protocolo,
  f.endpoint      as endpoint,
  f.modo          as modo,
  f.reloj         as reloj,
  g.id            as gateway_id,
  g.modelo        as gateway_modelo,
  g.serie         as gateway_serie,
  g.firmware      as gateway_firmware,
  g.enlace        as enlace,
  g.buffer_h      as buffer_h,
  g.ultimo_visto  as ultimo_visto,
  e.codigo        as equipo_codigo,
  e.nombre        as equipo,
  e.clase         as clase_equipo,
  e.criticidad    as criticidad,
  fo.id           as formula_id,
  fo.expresion    as formula,
  fo.version      as formula_version,
  fo.ventana_min  as ventana_min,
  c.vigente_hasta as calibracion_hasta,
  c.detalle       as calibracion_detalle
from tag t
join fuente  f  on f.id  = t.fuente_id
join gateway g  on g.id  = f.gateway_id
left join equipo e on e.id = t.equipo_id
left join formula fo on f.protocolo = 'calculado' and fo.clase_equipo = e.clase and fo.tipo_tag = t.tipo and fo.activa = 1
left join calibracion c on c.tag_id = t.id;
