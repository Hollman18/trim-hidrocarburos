-- ═══════════════════════════════════════════════════════════════════════════
--  TRIM Hidrocarburos · esquema de la base del servidor (PostgreSQL 16)
--
--  Capítulo 3 del documento técnico. Ejecutable de punta a punta:
--      psql -v ON_ERROR_STOP=1 -f esquema.sql
--  TimescaleDB es OPCIONAL: `timescale.sql` se corre DESPUÉS, solo si la
--  extensión está instalada (convierte `lectura` en hipertabla por mes).
--
--  Convenciones
--   · Instantes: timestamptz (se guardan en UTC; se muestran en America/Bogota).
--   · Días del campo: date (el día de Colombia, 00:00 a 24:00 hora de Bogotá).
--   · Meses: date con día 1 (el contrato los escribe 'AAAA-MM').
--   · Barriles, bbl/d y dinero: numeric (sin redondeo binario).
--   · Lecturas de instrumento: double precision (como las da el PLC).
--   · Un dato ausente es NULL, nunca 0 (fiscal sin dato, precio sin configurar,
--     instrumento sin señal).
--   · Tablas de solo inserción: un trigger impide UPDATE, DELETE y TRUNCATE
--     (SQLSTATE 23001, «restrict_violation»).
--   · Cada tabla que corresponde a un tipo TypeScript del motor lo dice en su
--     comentario (archivo de src/entities/).
-- ═══════════════════════════════════════════════════════════════════════════

create schema if not exists trim;
set search_path = trim, public;
comment on schema trim is 'TRIM Hidrocarburos: registro de campos y planta, cadena de datos, series, insumos del motor, configuración firmada, personas, escrituras a mano, espejo de SAP PM y precálculo de meses cerrados.';

-- ───────────────────────────── funciones comunes ─────────────────────────────

-- Solo inserción: la fila escrita es un registro firmado o un hecho; no se
-- corrige ni se borra. Se usa en version_config, cambio_acceso, mensaje,
-- carga_asignacion, cambio_planta, informe y demás bitácoras.
create or replace function solo_insercion() returns trigger language plpgsql as $$
begin
  raise exception 'la tabla % es de solo inserción: no admite %', tg_table_name, tg_op
    using errcode = '23001', hint = 'Un cambio es una fila nueva (otra versión, otra carga, otro cambio).';
end $$;
comment on function solo_insercion() is 'Trigger: rechaza UPDATE, DELETE y TRUNCATE en las tablas de solo inserción (SQLSTATE 23001).';

-- Texto no vacío y de al menos n caracteres sin los espacios de los bordes
-- (`alcanza` de src/entities/reglas.ts).
create or replace function alcanza(t text, n int) returns boolean language sql immutable as $$
  select char_length(btrim(coalesce(t, ''))) >= n
$$;
comment on function alcanza(text, int) is 'Igual que alcanza() de src/entities/reglas.ts: el texto sin espacios de los bordes tiene n caracteres o más.';

-- El primer instante (00:00 de Bogotá) de un mes dado como date.
create or replace function inicio_mes_co(m date) returns timestamptz language sql immutable as $$
  select (m::timestamp at time zone 'America/Bogota')
$$;
comment on function inicio_mes_co(date) is 'Medianoche de Colombia del primer día del mes (o de cualquier día): el borde de los períodos del motor.';

-- ═══════════════════════════════════════════════════════════════════════════
--  (a) REGISTRO DE CAMPOS Y PLANTA
-- ═══════════════════════════════════════════════════════════════════════════

create table campo (
  id      text primary key check (btrim(id) <> '' and id = btrim(id)),
  nombre  text not null check (btrim(nombre) <> ''),
  cuenca  text not null,
  choke   text not null check (choke in ('Pozos', 'Planta', 'Evacuación', 'Mercado')),
  nota    text not null default ''
);
comment on table campo is 'Registro de campos de la empresa (tipo Campo, src/entities/tipos.ts). GET /api/campos. Un cliente nuevo son filas aquí, no código. Las metas, el perfil y el precio NO viven aquí: son configuración firmada.';
comment on column campo.id is 'Id del campo: único, no vacío y sin espacios en los bordes (ceiba, morichal…). Es la clave que usan todas las demás tablas.';
comment on column campo.nombre is 'Nombre para leer (La Ceiba).';
comment on column campo.cuenca is 'Cuenca sedimentaria (Magdalena Medio, Llanos, Putumayo…).';
comment on column campo.choke is 'Qué limita al campo, dicho por la operación: Pozos, Planta, Evacuación o Mercado. Descriptivo.';
comment on column campo.nota is 'Nota libre del registro.';

-- Todo lo que tiene código en un campo: un equipo de superficie (catálogo) o un
-- pozo. Es el destino común de las claves foráneas que pueden apuntar a
-- cualquiera de los dos (avisos de SAP, predicciones, programa, tags…).
create table activo (
  campo_id  text not null references campo(id),
  codigo    text not null check (btrim(codigo) <> ''),
  clase     text not null check (clase in ('catalogo', 'pozo')),
  primary key (campo_id, codigo),
  unique (campo_id, codigo, clase)
);
comment on table activo is 'Supertipo: todo lo que tiene código en un campo. clase=catalogo es un equipo de superficie (tabla equipo); clase=pozo es un pozo (tabla pozo). Corresponde a ClaseEquipo de src/entities/equipo-vivo.ts. Un mismo código existe en varios campos (P-201B): la identidad es (campo, código).';
comment on column activo.campo_id is 'Campo del activo.';
comment on column activo.codigo is 'Código del activo en el campo (P-201B, K-101, LC-14).';
comment on column activo.clase is 'catalogo (equipo de superficie del registro de ingeniería) o pozo.';

create table equipo (
  campo_id                 text not null,
  codigo                   text not null,
  clase                    text not null default 'catalogo' check (clase = 'catalogo'),
  nombre                   text not null check (btrim(nombre) <> ''),
  sistema                  text not null,
  clase_iso                text not null check (btrim(clase_iso) <> ''),
  criticidad               smallint not null check (criticidad between 1 and 5),
  servicio                 text check (servicio in ('aire', 'energia', 'compresion', 'evacuacion', 'proceso', 'tratamiento')),
  modo_falla               text,
  norma                    text,
  intervencion_ubicacion   text,
  intervencion_accion      text,
  intervencion_avisar_a    text,
  distribucion_falla       jsonb,
  aguas_abajo              text check (btrim(aguas_abajo) <> ''),
  redundancia              text check (btrim(redundancia) <> ''),
  primary key (campo_id, codigo),
  foreign key (campo_id, codigo, clase) references activo(campo_id, codigo, clase),
  check ((intervencion_ubicacion is null) = (intervencion_accion is null) and (intervencion_accion is null) = (intervencion_avisar_a is null))
);
comment on table equipo is 'Registro de ingeniería: un equipo de superficie en un campo (la parte estática de Equipo/EquipoEnCampo, src/entities/tipos.ts y equipos.ts). Lo declara el cliente una vez. Sale en GET /api/catalogo → campos[c].registroEquipos y en el inventario de Conectores. Lo vivo (marcha, estado, severidad, lecturas) NO se guarda aquí: lo calcula el servidor.';
comment on column equipo.campo_id is 'Campo.';
comment on column equipo.codigo is 'Código del equipo (P-201B).';
comment on column equipo.clase is 'Siempre catalogo: amarra la fila al supertipo activo.';
comment on column equipo.nombre is 'Nombre del equipo.';
comment on column equipo.sistema is 'Sistema al que pertenece (Tratamiento de agua, Servicios industriales…).';
comment on column equipo.clase_iso is 'Clase de equipo de la taxonomía ISO 14224 (bomba-centrifuga, compresor-aire, unidad-lact…). De ella y del papel de la bomba sale el catálogo de daños (clase_iso_catalogo).';
comment on column equipo.criticidad is 'Criticidad 1 a 5 del registro del cliente.';
comment on column equipo.servicio is 'Si al caer apaga pozos: el tipo de causa que se le carga (aire, energia, compresion, evacuacion, proceso, tratamiento). NULL si no es un servicio.';
comment on column equipo.modo_falla is 'Modo de falla dominante de la familia, para leer.';
comment on column equipo.norma is 'Norma o referencia técnica que rige la vigilancia del equipo.';
comment on column equipo.intervencion_ubicacion is 'Dónde está, para ir al equipo (Equipo.intervencion.ubicacion). Es de ESTE campo.';
comment on column equipo.intervencion_accion is 'Acción inmediata (Equipo.intervencion.accionInmediata).';
comment on column equipo.intervencion_avisar_a is 'A quién avisar (Equipo.intervencion.avisarA).';
comment on column equipo.distribucion_falla is 'Reparto de modos de falla de la familia con su fuente bibliográfica: {"reparto":[["Mecánicas",44.1],…],"fuente":"…"} (Equipo.distribucionFalla).';
comment on column equipo.aguas_abajo is 'Lo que queda sin servicio si el equipo para, como lo declara el registro del campo (Equipo.aguasAbajo: «todo el campo», «4 pozos», «tren de gas», «sin impacto»). El motor lo compara: un servicio en alarma con «todo el campo» entra en el riesgo de ahora. NULL en las bombas de la línea: ahí lo dice el respaldo firmado (respaldoEnCampo de equipos.ts), y en una bomba sin perfil en el campo la API dice «sin declarar en este campo».';
comment on column equipo.redundancia is 'Respaldo del equipo en el campo, para leer (Equipo.redundancia: «3 unidades (N+1)», «respaldo en línea (H-301)», «sin respaldo»). NULL en las bombas de la línea: lo dice el respaldo firmado (respaldo.detalle, o «sin respaldo» con libre_bpd = 0).';

-- Topología de planta (PlantaCampo, src/entities/planta.ts). La dibuja el front
-- (planta.armar); el servidor guarda QUÉ hay y aplica los cambios.
create table planta_campo (
  campo_id          text primary key references campo(id),
  crudo_bpd         numeric not null check (crudo_bpd >= 0),
  crudo_cap_bpd     numeric not null check (crudo_cap_bpd >= 0),
  agua_bpd          numeric not null check (agua_bpd >= 0),
  agua_cap_bpd      numeric not null check (agua_cap_bpd >= 0),
  gas_bpd           numeric not null check (gas_bpd >= 0),
  gas_cap_bpd       numeric not null check (gas_cap_bpd >= 0),
  choke_pozos       numeric not null,
  choke_planta      numeric not null,
  choke_evacuacion  numeric not null,
  choke_mercado     numeric not null,
  nota              text not null default ''
);
comment on table planta_campo is 'Cabecera del esquema de planta de un campo: caudales de diseño y los cuatro cuellos de botella (Caudales y Chokes de PlantaCampo, src/entities/planta.ts). Sale en GET /api/catalogo → campos[c].planta. Un campo sin fila aquí no trae planta (hueco), nunca la de otro.';
comment on column planta_campo.campo_id is 'Campo.';
comment on column planta_campo.crudo_bpd is 'Caudales.crudo: crudo que mueve la planta, bbl/d.';
comment on column planta_campo.crudo_cap_bpd is 'Caudales.crudoCap: capacidad del tren de crudo, bbl/d.';
comment on column planta_campo.agua_bpd is 'Caudales.agua: agua producida, bbl/d.';
comment on column planta_campo.agua_cap_bpd is 'Caudales.aguaCap: capacidad del tren de agua, bbl/d.';
comment on column planta_campo.gas_bpd is 'Caudales.gas, en la unidad del tren de gas.';
comment on column planta_campo.gas_cap_bpd is 'Caudales.gasCap. 0 = el campo no tiene tren de gas.';
comment on column planta_campo.choke_pozos is 'Chokes.pozos (modelo NSTA/SPE).';
comment on column planta_campo.choke_planta is 'Chokes.planta.';
comment on column planta_campo.choke_evacuacion is 'Chokes.evacuacion.';
comment on column planta_campo.choke_mercado is 'Chokes.mercado.';
comment on column planta_campo.nota is 'PlantaCampo.nota.';

create table planta_elemento (
  campo_id            text not null references planta_campo(campo_id),
  id                  text not null check (btrim(id) <> ''),
  tren                text not null check (tren in ('tronco', 'gas', 'crudo', 'agua', 'servicios')),
  orden               smallint not null check (orden >= 0),
  simbolo             text not null check (simbolo in ('pozos', 'manifold', 'separador', 'depurador', 'tratador', 'tanque', 'medicion', 'compresor', 'bomba', 'inyeccion', 'tea', 'subestacion', 'aire', 'salida')),
  etiqueta            text not null,
  equipo              text,
  pie                 text,
  nivel_tag           text,
  nivel_tope          double precision,
  fluido              text check (fluido in ('multi', 'crudo', 'gas', 'agua', 'elec', 'aire')),
  pmo                 text,
  rama                boolean not null default false,
  restantes_cuantos   integer check (restantes_cuantos >= 0),
  restantes_etiqueta  text,
  primary key (campo_id, id),
  unique (campo_id, tren, orden),
  foreign key (campo_id, equipo) references activo(campo_id, codigo),
  check ((nivel_tag is null) = (nivel_tope is null)),
  check ((restantes_cuantos is null) = (restantes_etiqueta is null))
);
comment on table planta_elemento is 'Un elemento de un tren del esquema de planta (Elemento, src/entities/planta.ts). Cambia solo con POST /api/planta/cambios (agregar-elemento, quitar-elemento), que registra cambio_planta.';
comment on column planta_elemento.campo_id is 'Campo.';
comment on column planta_elemento.id is 'Id del elemento. Un id identifica una sola cosa en el campo: no se repite entre elementos ni miembros (trigger planta_id_unico).';
comment on column planta_elemento.tren is 'Tren: tronco, gas, crudo, agua o servicios.';
comment on column planta_elemento.orden is 'Posición dentro del tren (0 primero).';
comment on column planta_elemento.simbolo is 'Símbolo del dibujo (Simbolo).';
comment on column planta_elemento.etiqueta is 'Texto del elemento.';
comment on column planta_elemento.equipo is 'Activo del campo que representa. NULL = configurado pero sin instrumentar.';
comment on column planta_elemento.pie is 'Texto al pie.';
comment on column planta_elemento.nivel_tag is 'nivelDe.tag: tag de nivel que se pinta en el símbolo.';
comment on column planta_elemento.nivel_tope is 'nivelDe.tope: valor que llena el símbolo.';
comment on column planta_elemento.fluido is 'Corriente que lleva (Corriente).';
comment on column planta_elemento.pmo is 'Si es punto de medición oficial, su código (PMO-02): cambia quién lo puede tocar.';
comment on column planta_elemento.rama is 'Cuelga del anterior y no continúa la cadena (la tea).';
comment on column planta_elemento.restantes_cuantos is 'restantes.cuantos: miembros configurados que no se dibujan uno a uno.';
comment on column planta_elemento.restantes_etiqueta is 'restantes.etiqueta.';

create table planta_miembro (
  campo_id     text not null,
  elemento_id  text not null,
  id           text not null check (btrim(id) <> ''),
  orden        smallint not null check (orden >= 0),
  etiqueta     text not null,
  equipo       text,
  pie          text,
  nivel_tag    text,
  nivel_tope   double precision,
  fluido       text check (fluido in ('multi', 'crudo', 'gas', 'agua', 'elec', 'aire')),
  pmo          text,
  primary key (campo_id, id),
  unique (campo_id, elemento_id, orden),
  foreign key (campo_id, elemento_id) references planta_elemento(campo_id, id),
  foreign key (campo_id, equipo) references activo(campo_id, codigo),
  check ((nivel_tag is null) = (nivel_tope is null))
);
comment on table planta_miembro is 'Miembro de un elemento con varios del mismo tipo (pozos, tanques en especificación): Miembro de src/entities/planta.ts. Cambia con agregar-miembro / quitar-miembro.';
comment on column planta_miembro.campo_id is 'Campo.';
comment on column planta_miembro.elemento_id is 'Elemento (grupo) al que pertenece.';
comment on column planta_miembro.id is 'Id del miembro, único en el campo junto con los de los elementos.';
comment on column planta_miembro.orden is 'Posición dentro del grupo.';
comment on column planta_miembro.etiqueta is 'Texto del miembro.';
comment on column planta_miembro.equipo is 'Activo que representa (un pozo o un equipo). NULL = sin instrumentar.';
comment on column planta_miembro.pie is 'Texto al pie.';
comment on column planta_miembro.nivel_tag is 'nivelDe.tag.';
comment on column planta_miembro.nivel_tope is 'nivelDe.tope.';
comment on column planta_miembro.fluido is 'Corriente.';
comment on column planta_miembro.pmo is 'Código del punto de medición oficial, si lo es.';

create or replace function planta_id_unico() returns trigger language plpgsql as $$
begin
  if exists (select 1 from planta_elemento e where e.campo_id = new.campo_id and e.id = new.id and tg_table_name = 'planta_miembro')
     or exists (select 1 from planta_miembro m where m.campo_id = new.campo_id and m.id = new.id and tg_table_name = 'planta_elemento') then
    raise exception 'ya hay un elemento % en el campo %: un id identifica una sola cosa', new.id, new.campo_id using errcode = '23505';
  end if;
  return new;
end $$;
comment on function planta_id_unico() is 'Un id del esquema de planta no se repite entre elementos y miembros del mismo campo (idsDe en planta.ts).';
create trigger planta_elemento_id_unico before insert or update of id on planta_elemento for each row execute function planta_id_unico();
create trigger planta_miembro_id_unico before insert or update of id on planta_miembro for each row execute function planta_id_unico();

-- ═══════════════════════════════════════════════════════════════════════════
--  (b) CADENA DE DATOS: gateway → fuente → dispositivo → tag
--  Se llena sola con el certificado de nacimiento del borde (NBIRTH/DBIRTH de
--  Sparkplug B). Una persona solo declara a qué equipo pertenece un tag cuando
--  el borde no lo trae resuelto. La cadena no se escribe: se consulta
--  (v_procedencia).
-- ═══════════════════════════════════════════════════════════════════════════

create table gateway (
  id                  text primary key check (btrim(id) <> ''),
  campo_id            text not null references campo(id),
  modelo              text,
  serie               text,
  firmware            text,
  enlace              text,
  buffer_h            numeric check (buffer_h > 0),
  certificado_huella  text check (certificado_huella ~ '^[0-9a-f]{64}$'),
  primer_visto        timestamptz not null,
  ultimo_visto        timestamptz not null,
  unique (id, campo_id),
  check (ultimo_visto >= primer_visto)
);
comment on table gateway is 'Gateway del borde (nodo de Sparkplug B): se crea solo al recibir su NBIRTH. Es del campo donde se inscribió; si se presenta con otro, el nacimiento se rechaza (403 gateway-de-otro-campo, tabla rechazo). GET /api/campos/:campo/inventario y bloque tecnico de la procedencia.';
comment on column gateway.id is 'Id del gateway (EPIC-CEIBA-01). En producción sale del certificado de cliente, nunca del cuerpo.';
comment on column gateway.campo_id is 'Campo donde se inscribió. Los tags que publica son de este campo (FK compuesta en fuente/dispositivo/tag).';
comment on column gateway.modelo is 'Modelo del equipo (GRV-EPIC-PR1).';
comment on column gateway.serie is 'Número de serie.';
comment on column gateway.firmware is 'Versión de firmware declarada en el NBIRTH.';
comment on column gateway.enlace is 'Enlace de comunicaciones: starlink, fibra, lte…';
comment on column gateway.buffer_h is 'Autonomía de la cola local (store-and-forward), horas: cuánto aguanta sin enlace sin perder datos.';
comment on column gateway.certificado_huella is 'SHA-256 (hex) del certificado de cliente con que se autentica por TLS. NULL en el simulador, que no tiene certificados.';
comment on column gateway.primer_visto is 'Primer nacimiento recibido.';
comment on column gateway.ultimo_visto is 'Último nacimiento o mensaje recibido.';

create table inscripcion (
  id             bigint generated always as identity primary key,
  campo_id       text not null references campo(id),
  codigo_huella  text not null unique check (codigo_huella ~ '^[0-9a-f]{64}$'),
  emitido        timestamptz not null default now(),
  expira         timestamptz not null,
  emitido_por    text not null,
  canjeado       timestamptz,
  gateway_id     text references gateway(id),
  check (expira > emitido),
  check ((canjeado is null) = (gateway_id is null))
);
comment on table inscripcion is 'Código de un solo uso con que un gateway nuevo se inscribe en un campo (POST /api/inscripcion, capacidad conector:configurar). En producción se canjea por el certificado de cliente en el primer contacto. Se guarda la huella del código, nunca el código.';
comment on column inscripcion.id is 'Consecutivo.';
comment on column inscripcion.campo_id is 'Campo para el que se emitió: el gateway que lo canjea queda de este campo.';
comment on column inscripcion.codigo_huella is 'SHA-256 (hex) del código entregado (KEV4Y-SQCMN). El código en claro solo viaja en la respuesta.';
comment on column inscripcion.emitido is 'Hora de emisión.';
comment on column inscripcion.expira is 'Vence (24 h después en el contrato).';
comment on column inscripcion.emitido_por is 'Id de la persona que lo pidió (del token; capacidad conector:configurar).';
comment on column inscripcion.canjeado is 'Cuándo se canjeó; NULL = sin usar.';
comment on column inscripcion.gateway_id is 'Gateway que lo canjeó.';

create table nacimiento (
  id          bigint generated always as identity primary key,
  gateway_id  text not null references gateway(id),
  campo_id    text not null references campo(id),
  recibido    timestamptz not null default now(),
  bd_seq      integer check (bd_seq between 0 and 255),
  tags        integer not null check (tags >= 0),
  pendientes  integer not null check (pendientes >= 0 and pendientes <= tags),
  carga       jsonb not null
);
comment on table nacimiento is 'Bitácora de nacimientos aceptados (NBIRTH + DBIRTH; POST /api/ingesta/nacimiento → { gateway, tags, pendientes }). Solo inserción: cada reconexión de Sparkplug es una fila.';
comment on column nacimiento.id is 'Consecutivo.';
comment on column nacimiento.gateway_id is 'Gateway que nació.';
comment on column nacimiento.campo_id is 'Campo (del certificado).';
comment on column nacimiento.recibido is 'Hora del servidor al aceptarlo.';
comment on column nacimiento.bd_seq is 'bdSeq de Sparkplug B (0–255): empareja el NBIRTH con su NDEATH.';
comment on column nacimiento.tags is 'Tags declarados en el nacimiento.';
comment on column nacimiento.pendientes is 'Tags que quedaron sin equipo (origen_mapeo = pendiente).';
comment on column nacimiento.carga is 'El certificado de nacimiento tal como llegó (forma del contrato: campo, gateway, dispositivos[]).';

create table rechazo (
  id          bigint generated always as identity primary key,
  cuando      timestamptz not null default now(),
  gateway_id  text,
  campo_id    text,
  codigo      text not null check (codigo in ('gateway-de-otro-campo', 'tag-de-otro-gateway', 'campo-desconocido', 'nacimiento-mal-formado', 'certificado-invalido')),
  motivo      text not null,
  tags        text[]
);
comment on table rechazo is 'Nacimientos rechazados: un borde que se presenta con otro campo o declara tags de otro gateway es un hecho de seguridad y queda escrito (fuera de la transacción del nacimiento, que se deshizo). Solo inserción. Sin FK: el gateway o el campo pueden no existir.';
comment on column rechazo.id is 'Consecutivo.';
comment on column rechazo.cuando is 'Hora del rechazo.';
comment on column rechazo.gateway_id is 'Gateway que se presentó (como lo dijo).';
comment on column rechazo.campo_id is 'Campo con que se presentó.';
comment on column rechazo.codigo is 'Código del error devuelto (403 gateway-de-otro-campo, 409 tag-de-otro-gateway, 404 campo-desconocido, 400 nacimiento mal formado, certificado inválido).';
comment on column rechazo.motivo is 'Mensaje completo.';
comment on column rechazo.tags is 'Con tag-de-otro-gateway: los tags ajenos.';

create table fuente (
  id          bigint generated always as identity primary key,
  gateway_id  text not null,
  campo_id    text not null,
  protocolo   text not null check (protocolo in ('pi-web-api', 'opc-ua', 'modbus-tcp', 'roc-plus', 'atg', 'laboratorio', 'ruta-manual', 'sis', 'calculado')),
  endpoint    text,
  modo        text not null default 'solo-lectura' check (modo = 'solo-lectura'),
  foreign key (gateway_id, campo_id) references gateway(id, campo_id),
  unique nulls not distinct (gateway_id, protocolo, endpoint),
  unique (id, gateway_id, campo_id)
);
comment on table fuente is 'Conector del borde hacia una fuente de datos del campo (un historiador PI, un servidor OPC UA, un PLC por Modbus, el computador de flujo por ROC Plus…). Sale de dispositivos[].fuente del nacimiento. El simulador junta fuente y dispositivo en una sola fila (id gateway:protocolo:dispositivo); aquí se separan.';
comment on column fuente.id is 'Consecutivo interno.';
comment on column fuente.gateway_id is 'Gateway que la lee.';
comment on column fuente.campo_id is 'Campo del gateway (FK compuesta: no puede ser otro).';
comment on column fuente.protocolo is 'pi-web-api, opc-ua, modbus-tcp, roc-plus, atg, laboratorio, ruta-manual, sis o calculado.';
comment on column fuente.endpoint is 'Dirección del servidor (opc.tcp://…:4840, https://pi…/piwebapi). NULL en laboratorio, ruta manual, SIS y calculado.';
comment on column fuente.modo is 'Siempre solo-lectura: TRIM nunca escribe en el PLC.';

create table dispositivo (
  id            bigint generated always as identity primary key,
  gateway_id    text not null,
  campo_id      text not null,
  fuente_id     bigint not null,
  nombre        text not null check (btrim(nombre) <> ''),
  reloj         text not null check (btrim(reloj) <> ''),
  primer_visto  timestamptz not null,
  ultimo_visto  timestamptz not null,
  en_linea      boolean not null default true,
  foreign key (fuente_id, gateway_id, campo_id) references fuente(id, gateway_id, campo_id),
  unique (fuente_id, nombre),
  unique (id, campo_id),
  unique (id, gateway_id),
  check (ultimo_visto >= primer_visto)
);
comment on table dispositivo is 'Dispositivo de Sparkplug B declarado en un DBIRTH (dispositivos[] del nacimiento). Su nombre resuelve el mapeo: si coincide con el código de un equipo del campo, sus tags nacen descubiertos; si no, pendientes.';
comment on column dispositivo.id is 'Consecutivo interno.';
comment on column dispositivo.gateway_id is 'Gateway (nodo) que lo publica.';
comment on column dispositivo.campo_id is 'Campo del gateway.';
comment on column dispositivo.fuente_id is 'Conector por el que se lee.';
comment on column dispositivo.nombre is 'Device id de Sparkplug tal como lo nombra el borde (P-201B, SKID-AMPLIACION).';
comment on column dispositivo.reloj is 'Quién estampa la marca de tiempo de sus lecturas (el PLC de la batería, el computador de flujo, la hora de la toma de muestra…). Va a lectura.reloj de la procedencia.';
comment on column dispositivo.primer_visto is 'Primer DBIRTH.';
comment on column dispositivo.ultimo_visto is 'Último DBIRTH o DDATA.';
comment on column dispositivo.en_linea is 'false después de un DDEATH (o NDEATH del gateway) hasta el siguiente DBIRTH.';

create table tag (
  id             bigint generated always as identity primary key,
  campo_id       text not null,
  nombre         text not null check (btrim(nombre) <> ''),
  dispositivo_id bigint not null,
  equipo_codigo  text,
  tipo           text,
  unidad         text,
  limite_texto   text,
  limite_bajo    double precision,
  limite_alto    double precision,
  cadencia_s     double precision check (cadencia_s > 0),
  clase          text not null default 'continua' check (clase in ('continua', 'discreta')),
  origen_mapeo   text not null default 'pendiente' check (origen_mapeo in ('descubierto', 'regla', 'manual', 'pendiente')),
  actualizado    timestamptz not null default now(),
  unique (campo_id, nombre),
  foreign key (dispositivo_id, campo_id) references dispositivo(id, campo_id),
  foreign key (campo_id, equipo_codigo) references activo(campo_id, codigo),
  check ((origen_mapeo = 'pendiente') = (equipo_codigo is null)),
  check (limite_bajo is null or limite_alto is null or limite_bajo <= limite_alto)
);
comment on table tag is 'Registro de tags (descubierto del DBIRTH). Un tag es único en su campo y es del campo de su gateway (FK compuesta tag→dispositivo→fuente→gateway). La banda normal declarada aquí es la ÚNICA fuente de LimiteTag.normal; si un re-nacimiento la cambia, lo anterior queda en historial_tag. GET …/procedencia, …/inventario, …/tags/pendientes, POST …/tags/:tag/equipo.';
comment on column tag.id is 'Consecutivo interno (clave de las lecturas).';
comment on column tag.campo_id is 'Campo (el de su gateway).';
comment on column tag.nombre is 'Nombre del tag (VI-2011). Único en el campo.';
comment on column tag.dispositivo_id is 'Dispositivo que lo publica. Solo el gateway que lo publica puede volver a declararlo (trigger tag_reglas; 409 tag-de-otro-gateway en la ingesta).';
comment on column tag.equipo_codigo is 'Activo al que pertenece (equipo o pozo). NULL = pendiente de asociar.';
comment on column tag.tipo is 'Variable que mide (Vibración global, Derivada de presión).';
comment on column tag.unidad is 'Unidad (mm/s, psi, bbl/d).';
comment on column tag.limite_texto is 'Banda normal como la declara el instrumento («< 3,9», «180 – 240»). Es LimiteTag.texto.';
comment on column tag.limite_bajo is 'Lado bajo de la banda normal; NULL = abierto (Senal.normal[0] = null).';
comment on column tag.limite_alto is 'Lado alto de la banda normal; NULL = abierto.';
comment on column tag.cadencia_s is 'Cadencia de publicación declarada, segundos (47, 1, 28800).';
comment on column tag.clase is 'continua (lleva serie y minigráfica) o discreta (estado: marcha/paro, armado).';
comment on column tag.origen_mapeo is 'descubierto (el borde nombró el dispositivo con el código del activo), regla, manual o pendiente. Un nacimiento nunca deshace un mapeo manual o por regla.';
comment on column tag.actualizado is 'Último cambio de la fila.';

create table historial_tag (
  id                   bigint generated always as identity primary key,
  tag_id               bigint not null references tag(id),
  reemplazado          timestamptz not null,
  gateway_id           text not null references gateway(id),
  tipo                 text,
  unidad               text,
  limite_texto         text,
  limite_bajo          double precision,
  limite_alto          double precision,
  cadencia_s           double precision,
  clase                text,
  calibracion_hasta    date,
  calibracion_detalle  text
);
comment on table historial_tag is 'Versiones anteriores de la descripción de un tag: lo que un re-nacimiento cambió (banda normal, unidad, cadencia, clase o calibración) no se pierde. La banda que regía en un instante t es la de la primera fila con reemplazado > t, o la del tag si no la hay. Solo inserción.';
comment on column historial_tag.id is 'Consecutivo.';
comment on column historial_tag.tag_id is 'Tag.';
comment on column historial_tag.reemplazado is 'Hasta cuándo rigió esta versión (la hora del nacimiento que la cambió).';
comment on column historial_tag.gateway_id is 'Gateway del nacimiento que la cambió.';
comment on column historial_tag.tipo is 'Tipo anterior.';
comment on column historial_tag.unidad is 'Unidad anterior.';
comment on column historial_tag.limite_texto is 'Banda normal anterior (texto).';
comment on column historial_tag.limite_bajo is 'Lado bajo anterior.';
comment on column historial_tag.limite_alto is 'Lado alto anterior.';
comment on column historial_tag.cadencia_s is 'Cadencia anterior.';
comment on column historial_tag.clase is 'Clase anterior.';
comment on column historial_tag.calibracion_hasta is 'Vigencia de calibración anterior.';
comment on column historial_tag.calibracion_detalle is 'Detalle de calibración anterior.';

create table formula (
  id            text not null,
  version       integer not null check (version >= 1),
  clase_equipo  text not null,
  tipo_tag      text not null,
  expresion     text not null,
  ventana_min   integer check (ventana_min > 0),
  activa        boolean not null default true,
  primary key (id, version)
);
create unique index formula_una_activa on formula (clase_equipo, tipo_tag) where activa;
comment on table formula is 'Librería de fórmulas del producto, versionada e igual para todos los clientes. Una fórmula produce UNA variable (tipo_tag) de una clase de equipo. Solo aparece en un tag que ES ese cálculo (fuente calculado). Hoy la única es f1-compresor-aire (PDT-1011).';
comment on column formula.id is 'Id de la fórmula (f1-compresor-aire).';
comment on column formula.version is 'Versión. Una versión nueva es una fila nueva.';
comment on column formula.clase_equipo is 'Clase ISO 14224 del equipo al que aplica.';
comment on column formula.tipo_tag is 'Variable que produce (Derivada de presión).';
comment on column formula.expresion is 'La fórmula dicha para leer.';
comment on column formula.ventana_min is 'Ventana de cálculo, minutos.';
comment on column formula.activa is 'La versión vigente; una sola activa por (clase, variable).';

create table calculo (
  tag_id           bigint primary key references tag(id),
  formula_id       text not null,
  formula_version  integer not null,
  foreign key (formula_id, formula_version) references formula(id, version)
);
comment on table calculo is 'Qué fórmula (y qué versión) produce un tag calculado. Se llena al registrar un tag de fuente calculado con la fórmula activa de (clase del equipo, tipo del tag). Es procedencia.calculo.';
comment on column calculo.tag_id is 'Tag calculado (PDT-1011).';
comment on column calculo.formula_id is 'Fórmula.';
comment on column calculo.formula_version is 'Versión de la fórmula con que se calcula.';

create table calculo_entrada (
  tag_id          bigint not null references calculo(tag_id),
  entrada_tag_id  bigint not null references tag(id),
  primary key (tag_id, entrada_tag_id),
  check (tag_id <> entrada_tag_id)
);
comment on table calculo_entrada is 'Tags de los que se deriva un tag calculado (PDT-1011 ← PT-1011): su reloj es «el tag del que se deriva».';
comment on column calculo_entrada.tag_id is 'Tag calculado.';
comment on column calculo_entrada.entrada_tag_id is 'Tag de entrada.';

create table calibracion (
  tag_id         bigint primary key references tag(id),
  vigente_hasta  date,
  detalle        text not null check (btrim(detalle) <> '')
);
comment on table calibracion is 'Calibración vigente de un tag de medición en custodia (solo donde de verdad existe: computador de flujo, analizador de BSW, medidores de tanque). La declara el DBIRTH (metricas[].calibracion); lo anterior pasa a historial_tag. Es custodia.calibracion de la procedencia.';
comment on column calibracion.tag_id is 'Tag.';
comment on column calibracion.vigente_hasta is 'Fecha de vencimiento del certificado. NULL si el borde solo declara el texto (el demo trae «abril de 2027»).';
comment on column calibracion.detalle is 'Texto del certificado (Probado el 12 de abril de 2026 · factor 1,0021 · vigente hasta abril de 2027).';

-- Un tag no cambia de gateway, y un nacimiento no deshace un mapeo de persona o de regla.
create or replace function tag_reglas() returns trigger language plpgsql as $$
declare g_viejo text; g_nuevo text;
begin
  if new.dispositivo_id <> old.dispositivo_id then
    select gateway_id into g_viejo from dispositivo where id = old.dispositivo_id;
    select gateway_id into g_nuevo from dispositivo where id = new.dispositivo_id;
    if g_viejo <> g_nuevo then
      raise exception 'el tag % lo publica el gateway %: % no puede declararlo', old.nombre, g_viejo, g_nuevo using errcode = '23514';
    end if;
  end if;
  if old.origen_mapeo in ('manual', 'regla') and new.origen_mapeo in ('descubierto', 'pendiente') then
    raise exception 'el tag % fue asociado por % y un nacimiento no lo deshace', old.nombre, old.origen_mapeo using errcode = '23514';
  end if;
  new.actualizado := now();
  return new;
end $$;
comment on function tag_reglas() is 'Trigger de tag: solo su gateway lo vuelve a declarar y un nacimiento no deshace un mapeo manual o por regla (CONTRATO.md, «Cadena de datos»).';
create trigger tag_reglas before update on tag for each row execute function tag_reglas();

create trigger historial_tag_solo_insercion before update or delete on historial_tag for each row execute function solo_insercion();
create trigger historial_tag_sin_truncate before truncate on historial_tag for each statement execute function solo_insercion();
create trigger nacimiento_solo_insercion before update or delete on nacimiento for each row execute function solo_insercion();
create trigger nacimiento_sin_truncate before truncate on nacimiento for each statement execute function solo_insercion();
create trigger rechazo_solo_insercion before update or delete on rechazo for each row execute function solo_insercion();
create trigger rechazo_sin_truncate before truncate on rechazo for each statement execute function solo_insercion();

create index tag_equipo on tag (campo_id, equipo_codigo);
create index tag_pendientes on tag (campo_id) where origen_mapeo = 'pendiente';
create index historial_tag_por_tag on historial_tag (tag_id, reemplazado);
create index gateway_por_campo on gateway (campo_id);
create index dispositivo_por_gateway on dispositivo (gateway_id);

-- ═══════════════════════════════════════════════════════════════════════════
--  (c) SERIES: lectura (tag, instante, valor, calidad)
--  Particionada por mes (hora de Colombia) con particionamiento nativo, para
--  que funcione sin TimescaleDB. timescale.sql la reemplaza por una hipertabla
--  con trozos de un mes si la extensión existe.
-- ═══════════════════════════════════════════════════════════════════════════

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
) partition by range (instante);
comment on table lectura is 'Serie de tiempo de cada tag: lo que llega del borde en DDATA (Sparkplug B) o del historiador. Particionada por mes. De aquí sale GET /api/campos/:campo/tags/:tag/serie (SerieTag, src/entities/tipos.ts: desde, pasoH, valores con null en los huecos) y la serie de cada dispositivo y señal en las vistas. Un hueco del historiador es la AUSENCIA de filas (o una fila de calidad mala): nunca un 0.';
comment on column lectura.tag_id is 'Tag.';
comment on column lectura.instante is 'Marca de tiempo de la fuente (la pone el PLC, el computador de flujo o quien diga dispositivo.reloj), en UTC.';
comment on column lectura.valor is 'Valor numérico. NULL solo con calidad mala (instrumento sin señal: dato inválido).';
comment on column lectura.texto is 'Valor de un tag discreto que llega como texto (sin fuga, 2 de 3, armado). NULL en los continuos.';
comment on column lectura.calidad is 'buena, incierta o mala (calidad de OPC UA / Sparkplug resumida). Una lectura mala no entra en la serie: va como null en su lugar.';
comment on column lectura.codigo_calidad is 'Código de calidad crudo de la fuente, para auditar: StatusCode de OPC UA (entero sin signo de 32 bits; 0x80310000 = Bad_NoCommunication) o calidad OPC DA de PI (192 = buena).';
comment on column lectura.recibido is 'Hora del servidor al recibirla. recibido − instante es la latencia; si pasa de buffer_h del gateway, el dato llegó del almacenamiento local.';

create index lectura_por_instante on lectura (instante);

-- Crea las particiones mensuales que falten entre dos meses (incluidos). Lo
-- corre el despliegue y un trabajo diario que asegura el mes siguiente.
create or replace function asegurar_particiones_lectura(desde date, hasta date) returns integer language plpgsql as $$
declare m date := date_trunc('month', desde)::date; n integer := 0; nombre text;
begin
  while m <= hasta loop
    nombre := format('lectura_%s', to_char(m, 'YYYY_MM'));
    if to_regclass(nombre) is null then
      execute format('create table %I partition of lectura for values from (%L) to (%L)',
        nombre, inicio_mes_co(m), inicio_mes_co((m + interval '1 month')::date));
      n := n + 1;
    end if;
    m := (m + interval '1 month')::date;
  end loop;
  return n;
end $$;
comment on function asegurar_particiones_lectura(date, date) is 'Crea las particiones mensuales de lectura (lectura_AAAA_MM, bordes a medianoche de Colombia) que falten entre dos meses. Devuelve cuántas creó. No hay partición por defecto: una lectura fuera de rango es un error visible, no un dato escondido.';

select asegurar_particiones_lectura(date '2025-10-01', date '2026-12-01');

-- La serie de un tag con paso fijo: el valor del lugar i es la última lectura
-- válida en (desde + (i−1)·paso, desde + i·paso]; sin ninguna, null en su lugar.
create or replace function serie_de(p_tag bigint, p_desde timestamptz, p_paso interval, p_n integer)
returns table (i integer, instante timestamptz, valor double precision) language sql stable as $$
  select g.i, p_desde + g.i * p_paso,
         (select l.valor from lectura l
           where l.tag_id = p_tag and l.calidad <> 'mala' and l.valor is not null
             and l.instante >  p_desde + (g.i - 1) * p_paso
             and l.instante <= p_desde + g.i * p_paso
           order by l.instante desc limit 1)
  from generate_series(0, p_n - 1) as g(i)
$$;
comment on function serie_de(bigint, timestamptz, interval, integer) is 'Arma SerieTag (desde, pasoH, valores): el valor del lugar i es la última lectura válida dentro del paso que termina en desde + i·paso; sin lectura, null EN SU LUGAR (no se salta). Propuesta: el contrato no fija si el valor es el último o el promedio del paso (capítulo 4, Huecos).';

-- ═══════════════════════════════════════════════════════════════════════════
--  (d) INSUMOS DEL MOTOR (interfaz Insumos de src/entities/insumos.ts)
-- ═══════════════════════════════════════════════════════════════════════════

create table pozo (
  campo_id        text not null,
  id              text not null,
  clase           text not null default 'pozo' check (clase = 'pozo'),
  levantamiento   text not null check (levantamiento in ('electrosumergible', 'bombeo-mecanico', 'flujo-natural')),
  controlador     text not null check (btrim(controlador) <> ''),
  alimentador     text not null,
  origen          text check (origen in ('instrumento', 'estimado')),
  fuente_prueba   text,
  primary key (campo_id, id),
  foreign key (campo_id, id, clase) references activo(campo_id, codigo, clase),
  foreign key (campo_id, alimentador) references activo(campo_id, codigo),
  check (origen is not null or fuente_prueba is null)
);
comment on table pozo is 'Pozo de un campo (Pozo, src/entities/pozos.ts). GET /api/campos/:campo/pozos y refs.pozos["campo/pozo"]. Sin origen y sin pruebas el pozo no tiene custodia: no se le asigna caudal.';
comment on column pozo.campo_id is 'Campo.';
comment on column pozo.id is 'Código del pozo (LC-14).';
comment on column pozo.clase is 'Siempre pozo: amarra la fila al supertipo activo.';
comment on column pozo.levantamiento is 'electrosumergible, bombeo-mecanico o flujo-natural.';
comment on column pozo.controlador is 'Tag del controlador que dice si el pozo produce (VSD-LC14, POC-LC21).';
comment on column pozo.alimentador is 'Pórtico o subestación de la que cuelga (SE-2): a él se carga una baja tensión (código UV).';
comment on column pozo.origen is 'De dónde salen sus pruebas: instrumento (separador de prueba) o estimado (desde la propia electrosumergible). NULL = sin custodia.';
comment on column pozo.fuente_prueba is 'Instrumentos de la prueba (Separador de prueba automatizado SP-CE1 · FT-… · AT-…).';

create table prueba_pozo (
  campo_id   text not null,
  pozo       text not null,
  fecha      timestamptz not null,
  crudo_bpd  numeric not null check (crudo_bpd >= 0 and crudo_bpd <> 'Infinity'),
  agua_bpd   numeric not null check (agua_bpd >= 0 and agua_bpd <> 'Infinity'),
  hz         double precision check (hz > 0),
  primary key (campo_id, pozo, fecha),
  foreign key (campo_id, pozo) references pozo(campo_id, id)
);
comment on table prueba_pozo is 'Prueba de pozo (Prueba, src/entities/pozos.ts; Pozo.pruebas). Rige desde su fecha hasta la siguiente; antes de la primera rige la primera (pruebaEn). Con el factor de asignación del mes da el crudo del pozo.';
comment on column prueba_pozo.campo_id is 'Campo.';
comment on column prueba_pozo.pozo is 'Pozo.';
comment on column prueba_pozo.fecha is 'Hora de la prueba.';
comment on column prueba_pozo.crudo_bpd is 'Crudo neto de la prueba, bbl/d.';
comment on column prueba_pozo.agua_bpd is 'Agua de la prueba, bbl/d (con el crudo da el corte de agua y el orden de cierre).';
comment on column prueba_pozo.hz is 'Frecuencia del variador durante la prueba (electrosumergible). Con la del evento HZ da la fracción perdida f = 1 − hz/hz_prueba. NULL = sin frecuencia: el tramo de frecuencia reducida se cobra como cerrado y queda aproximado.';

-- Registro de eventos del borde: un id por hecho, sea de un pozo, de una bomba
-- o de un servicio. Las respuestas, los análisis, los avisos y las órdenes
-- apuntan aquí (POST /api/paradas/:evento/respuesta no dice de qué clase es).
create table evento (
  id        text primary key check (btrim(id) <> ''),
  campo_id  text not null,
  clase     text not null check (clase in ('pozo', 'bomba', 'servicio')),
  activo    text not null,
  recibido  timestamptz not null default now(),
  unique (id, clase, campo_id, activo),
  foreign key (campo_id, activo) references activo(campo_id, codigo)
);
comment on table evento is 'Supertipo de los eventos del borde: un id único para todo el sistema (refs.eventos["id"] del contrato). clase pozo → evento_pozo, bomba → parada_bomba, servicio → evento_servicio.';
comment on column evento.id is 'Id del evento como lo emite el borde (EP-LC21-261001-01, EV-2011-0809, SV-SE-2-260828).';
comment on column evento.campo_id is 'Campo.';
comment on column evento.clase is 'pozo, bomba o servicio.';
comment on column evento.activo is 'Pozo o equipo del evento.';
comment on column evento.recibido is 'Hora del servidor al recibirlo.';

-- Los hechos del PLC no se reescriben: solo se cierra lo abierto (fin de NULL a
-- un valor, una vez) y, en una parada de bomba, se pone la firma una vez.
create or replace function evento_solo_cierre() returns trigger language plpgsql as $$
declare libres text[] := array[]::text[];
begin
  if tg_op = 'DELETE' then
    raise exception 'los eventos del borde no se borran (%: %)', tg_table_name, old.id using errcode = '23001';
  end if;
  if (to_jsonb(old) ->> 'fin') is null then libres := array_append(libres, 'fin'); end if;
  if tg_table_name = 'parada_bomba' and (to_jsonb(old) ->> 'firma_parte') is null then
    libres := libres || array['firma_parte', 'firma_familia', 'firma_tag', 'firma_texto'];
  end if;
  if (to_jsonb(new) - libres - 'recibido') is distinct from (to_jsonb(old) - libres - 'recibido') then
    raise exception 'el evento % del borde no se reescribe: solo se cierra (fin) y la firma se pone una vez', old.id using errcode = '23001';
  end if;
  return new;
end $$;
comment on function evento_solo_cierre() is 'Trigger de evento_pozo, evento_servicio y parada_bomba: la hora la pone el PLC y no se corrige. Solo se permite poner fin a un evento abierto (una vez) y la firma de una parada (una vez).';

create table evento_pozo (
  id        text primary key,
  clase     text not null default 'pozo' check (clase = 'pozo'),
  campo_id  text not null,
  pozo      text not null,
  inicio    timestamptz not null,
  fin       timestamptz,
  codigo    text not null check (codigo in ('GF', 'PH', 'OL', 'UL', 'OT', 'UV', 'PSH', 'LSHH', 'CMD', 'HZ')),
  senal     text not null,
  hz        double precision check (hz > 0),
  recibido  timestamptz not null default now(),
  foreign key (id, clase, campo_id, pozo) references evento(id, clase, campo_id, activo),
  foreign key (campo_id, pozo) references pozo(campo_id, id),
  check (fin is null or fin > inicio),
  check (hz is null or codigo = 'HZ')
);
comment on table evento_pozo is 'Evento del controlador de un pozo (EventoPozo, src/entities/pozos.ts): variador, controlador de bombeo o válvula de cabeza. GET /api/campos/:campo/pozos/eventos y refs.eventos. Es la unidad de cobro del libro. Eventos que se pisan en el mismo pozo: se guardan como llegan y el motor los normaliza (intervalosEfectivos, libro.ts) — capítulo 4.';
comment on column evento_pozo.id is 'Id del evento (EP-LC21-261001-01).';
comment on column evento_pozo.clase is 'Siempre pozo.';
comment on column evento_pozo.campo_id is 'Campo.';
comment on column evento_pozo.pozo is 'Pozo.';
comment on column evento_pozo.inicio is 'Hora del PLC en que el controlador cambió de estado.';
comment on column evento_pozo.fin is 'Hora en que volvió a producir; NULL = sigue abierto.';
comment on column evento_pozo.codigo is 'Código del controlador: GF, PH, OL, UL, OT, UV, PSH, LSHH, CMD o HZ (frecuencia reducida).';
comment on column evento_pozo.senal is 'Tag y texto para leer (POC-LC21 · código CMD).';
comment on column evento_pozo.hz is 'Solo con HZ: la frecuencia a la que quedó el variador.';
comment on column evento_pozo.recibido is 'Hora del servidor al recibirlo.';

create table evento_servicio (
  id        text primary key,
  clase     text not null default 'servicio' check (clase = 'servicio'),
  campo_id  text not null,
  equipo    text not null,
  tipo      text not null check (tipo in ('aire', 'energia', 'compresion', 'evacuacion', 'proceso', 'tratamiento')),
  inicio    timestamptz not null,
  fin       timestamptz,
  tag       text not null,
  texto     text not null,
  recibido  timestamptz not null default now(),
  foreign key (id, clase, campo_id, equipo) references evento(id, clase, campo_id, activo),
  foreign key (campo_id, equipo) references equipo(campo_id, codigo),
  check (fin is null or fin > inicio)
);
comment on table evento_servicio is 'Caída de un servicio o equipo de proceso que apaga o frena pozos (EventoServicio, src/entities/pozos.ts). GET /api/campos/:campo/servicios/eventos. OJO: el tipo TS exige fin; la base admite NULL (servicio caído ahora) y el endpoint de insumo decide cómo entregarlo (capítulo 4, Huecos).';
comment on column evento_servicio.id is 'Id del evento (SV-SE-2-260828).';
comment on column evento_servicio.clase is 'Siempre servicio.';
comment on column evento_servicio.campo_id is 'Campo.';
comment on column evento_servicio.equipo is 'Equipo del servicio (SE-2, K-101).';
comment on column evento_servicio.tipo is 'Tipo de causa que se carga: aire, energia, compresion, evacuacion, proceso o tratamiento.';
comment on column evento_servicio.inicio is 'Hora del PLC/IED de la caída.';
comment on column evento_servicio.fin is 'Hora de la reposición; NULL = sigue caído.';
comment on column evento_servicio.tag is 'Tag que marca la caída (52-SE2, PAL-1011).';
comment on column evento_servicio.texto is 'Qué pasó, para leer.';
comment on column evento_servicio.recibido is 'Hora del servidor al recibirlo.';

create table parada_bomba (
  id                    text primary key,
  clase                 text not null default 'bomba' check (clase = 'bomba'),
  campo_id              text not null,
  equipo                text not null,
  inicio                timestamptz not null,
  fin                   timestamptz,
  perdida               numeric not null check (perdida > 0 and perdida <= 1),
  senal                 text not null,
  primera_alarma_tag    text,
  primera_alarma_texto  text,
  firma_parte           text,
  firma_familia         text,
  firma_tag             text,
  firma_texto           text,
  nivel_al_parar_tag    text,
  nivel_al_parar_pct    double precision check (nivel_al_parar_pct between 0 and 100),
  recibido              timestamptz not null default now(),
  foreign key (id, clase, campo_id, equipo) references evento(id, clase, campo_id, activo),
  foreign key (campo_id, equipo) references equipo(campo_id, codigo),
  check (fin is null or fin > inicio),
  check ((primera_alarma_tag is null) = (primera_alarma_texto is null)),
  check ((firma_parte is null) = (firma_texto is null) and (firma_parte is null) = (firma_familia is null)),
  check (firma_tag is null or firma_parte is not null),
  check ((nivel_al_parar_tag is null) = (nivel_al_parar_pct is null))
);
comment on table parada_bomba is 'Parada (o pérdida de caudal) de una bomba de la línea según su PLC (EventoBomba, src/entities/bombas.ts). GET /api/campos/:campo/bombas/:equipo/paradas. La parte NO viene escrita a mano: sale de la primera alarma o de la firma de las señales al parar.';
comment on column parada_bomba.id is 'Id de la parada (EV-2011-0809).';
comment on column parada_bomba.clase is 'Siempre bomba.';
comment on column parada_bomba.campo_id is 'Campo.';
comment on column parada_bomba.equipo is 'Bomba (P-201B, MPP-301).';
comment on column parada_bomba.inicio is 'Hora del PLC del paso marcha → paro.';
comment on column parada_bomba.fin is 'Hora del arranque; NULL = sigue parada.';
comment on column parada_bomba.perdida is 'Fracción de la capacidad perdida: 1 parada total; < 1 siguió en marcha con menos caudal.';
comment on column parada_bomba.senal is 'Señal del PLC que marca el evento (ZS-2011 · marcha → paro).';
comment on column parada_bomba.primera_alarma_tag is 'Primera alarma (first-out) que congeló el PLC al disparar. Solo identifica parte si la máquina la declara (perfil_bomba_primera_alarma).';
comment on column parada_bomba.primera_alarma_texto is 'Texto de la primera alarma.';
comment on column parada_bomba.firma_parte is 'Parte que la firma de las señales señalaba EN EL INSTANTE DE PARAR. La decide el servidor con las lecturas de ese instante y no cambia después (se pone una vez).';
comment on column parada_bomba.firma_familia is 'Familia de la parte de la firma (inyeccion, multifasica): con firma_parte apunta al catálogo de partes.';
comment on column parada_bomba.firma_tag is 'Instrumento que delató la parte.';
comment on column parada_bomba.firma_texto is 'Texto de la firma.';
comment on column parada_bomba.nivel_al_parar_tag is 'Transmisor del tanque de agua (LT-2012).';
comment on column parada_bomba.nivel_al_parar_pct is 'Nivel del tanque en el instante de parar, % (con el aforo da el colchón previsto).';
comment on column parada_bomba.recibido is 'Hora del servidor al recibirla.';

create trigger evento_pozo_solo_cierre before update or delete on evento_pozo for each row execute function evento_solo_cierre();
create trigger evento_servicio_solo_cierre before update or delete on evento_servicio for each row execute function evento_solo_cierre();
create trigger parada_bomba_solo_cierre before update or delete on parada_bomba for each row execute function evento_solo_cierre();
create trigger evento_solo_insercion before update or delete on evento for each row execute function solo_insercion();
create trigger evento_sin_truncate before truncate on evento for each statement execute function solo_insercion();
create trigger evento_pozo_sin_truncate before truncate on evento_pozo for each statement execute function solo_insercion();
create trigger evento_servicio_sin_truncate before truncate on evento_servicio for each statement execute function solo_insercion();
create trigger parada_bomba_sin_truncate before truncate on parada_bomba for each statement execute function solo_insercion();

create index evento_pozo_rango on evento_pozo (campo_id, inicio, fin);
create index evento_pozo_por_pozo on evento_pozo (campo_id, pozo, inicio);
create index evento_pozo_abiertos on evento_pozo (campo_id) where fin is null;
create index evento_servicio_rango on evento_servicio (campo_id, inicio, fin);
create index parada_bomba_rango on parada_bomba (campo_id, equipo, inicio, fin);

-- Punto de medición oficial (PMO) y producción fiscal.
create table punto_medicion (
  campo_id       text primary key references campo(id),
  equipo         text not null,
  tag_fiscal     text not null,
  fuente         text not null,
  bsw            text not null check (bsw in ('analizador', 'laboratorio')),
  hora_contrato  time not null default '00:00',
  foreign key (campo_id, equipo) references equipo(campo_id, codigo)
);
comment on table punto_medicion is 'Punto de medición oficial de un campo (OrigenPmo de src/entities/insumos.ts, y Equipo.fiscal). GET /api/catalogo → medicion.origen y produccion-diaria.origen. Uno por campo: el motor lleva un fiscal por campo.';
comment on column punto_medicion.campo_id is 'Campo.';
comment on column punto_medicion.equipo is 'Equipo del PMO (LACT-01). La API pone equipo.fiscal = tag_fiscal en ese equipo.';
comment on column punto_medicion.tag_fiscal is 'Tag del computador de flujo cuyo valor es el fiscal del día (FQI-0101).';
comment on column punto_medicion.fuente is 'Texto de origen (FQI-0101 · computador de flujo de la unidad LACT-01).';
comment on column punto_medicion.bsw is 'De dónde sale el corte de agua del fiscal: analizador en línea o laboratorio.';
comment on column punto_medicion.hora_contrato is 'Hora de cierre del día del computador de flujo. El motor supone días de 00:00 a 24:00 de Colombia: con otra hora de contrato el ticket diario no cae en el día del libro (capítulo 4).';

create table mes_fiscal (
  campo_id      text not null references campo(id),
  mes           date not null check (extract(day from mes) = 1),
  publicado     boolean not null default false,
  publicado_en  timestamptz,
  primary key (campo_id, mes),
  check (publicado_en is null or publicado)
);
comment on table mes_fiscal is 'Estado fiscal de un mes de un campo (la parte publicado de ProduccionMes, src/entities/pozos.ts). Cada campo publica su mes por su cuenta. El calendario de GET /api/catalogo sale de aquí (publicado = todos los campos con fiscal lo publicaron).';
comment on column mes_fiscal.campo_id is 'Campo.';
comment on column mes_fiscal.mes is 'Mes (día 1). El contrato lo escribe AAAA-MM.';
comment on column mes_fiscal.publicado is 'El campo cerró y publicó el fiscal del mes.';
comment on column mes_fiscal.publicado_en is 'Cuándo lo publicó (NULL si la fuente no lo dice; nunca con publicado = false).';

create table produccion_fiscal_diaria (
  campo_id  text not null,
  dia       date not null,
  mes       date generated always as (date_trunc('month', dia::timestamp)::date) stored,
  bbl       numeric check (bbl >= 0 and bbl <> 'Infinity'),
  cerrado   boolean not null default true,
  tag       text not null,
  recibido  timestamptz not null default now(),
  primary key (campo_id, dia),
  foreign key (campo_id, mes) references mes_fiscal(campo_id, mes),
  foreign key (campo_id) references punto_medicion(campo_id)
);
comment on table produccion_fiscal_diaria is 'Barriles netos de cada día en el punto de medición oficial (ProduccionMes.dias). GET /api/campos/:campo/produccion-diaria arma por mes el arreglo dias[] con null donde no hay fila o bbl es NULL. Un día sin dato del computador de flujo NO es cero: no entra ni en lo real ni en el potencial y el libro no se publica.';
comment on column produccion_fiscal_diaria.campo_id is 'Campo.';
comment on column produccion_fiscal_diaria.dia is 'Día del campo (Colombia).';
comment on column produccion_fiscal_diaria.mes is 'Mes del día (calculado).';
comment on column produccion_fiscal_diaria.bbl is 'Barriles netos del día. NULL = el computador de flujo lo reportó sin dato (hueco de custodia, nunca cero).';
comment on column produccion_fiscal_diaria.cerrado is 'false mientras el día corre (el último día del mes en curso es parcial: acumulado hasta ahora).';
comment on column produccion_fiscal_diaria.tag is 'Tag del que salió (el tag_fiscal del PMO cuando llegó).';
comment on column produccion_fiscal_diaria.recibido is 'Hora del servidor al recibirlo.';

create table metrologia_campo (
  campo_id           text not null references campo(id),
  vigente_desde      timestamptz not null,
  api                numeric check (api > 0 and api < 100),
  api_fuente         text not null,
  demostrada_nombre  text,
  demostrada_valor   numeric check (demostrada_valor > 0 and demostrada_valor < 1),
  demostrada_fuente  text,
  primary key (campo_id, vigente_desde),
  check ((demostrada_valor is null) = (demostrada_fuente is null) and (demostrada_valor is null) = (demostrada_nombre is null))
);
comment on table metrologia_campo is 'Registro de metrología de un campo, versionado (MetrologiaCampo, src/entities/metrologia.ts). GET /api/campos/:campo/metrologia y catalogo.medicion.metrologia toman la fila vigente. Con °API y la producción fiscal publicada se escoge la fila de la Fig. 10.2 (banda_regulatoria); un presupuesto demostrado (API MPMS 13.3 / ISO 5168) la reemplaza.';
comment on column metrologia_campo.campo_id is 'Campo.';
comment on column metrologia_campo.vigente_desde is 'Desde cuándo rige este análisis.';
comment on column metrologia_campo.api is 'Gravedad °API del último análisis del crudo. NULL = el laboratorio no lo ha reportado: la banda no es verificable y el libro no se publica (nunca 0 °API).';
comment on column metrologia_campo.api_fuente is 'De dónde sale el °API.';
comment on column metrologia_campo.demostrada_nombre is 'Nombre del presupuesto de incertidumbre propio (Componente.nombre).';
comment on column metrologia_campo.demostrada_valor is 'Tolerancia relativa demostrada (0,05 = ±5 %). NULL = se usa la banda regulatoria.';
comment on column metrologia_campo.demostrada_fuente is 'Documento que la demuestra.';

create table banda_regulatoria (
  pais           text not null default 'CO',
  fluido         text not null check (fluido in ('crudo', 'gas', 'agua')),
  api_mayor_que  numeric,
  api_hasta      numeric,
  desde_bpd      numeric not null check (desde_bpd >= 0),
  fa_min         numeric not null check (fa_min > 0),
  fa_max         numeric not null,
  nombre         text not null,
  fuente         text not null,
  primary key (pais, fluido, desde_bpd, nombre),
  check (fa_max > fa_min)
);
comment on table banda_regulatoria is 'Banda aceptada del factor de asignación (Res. MME 40236/2022, Anexo 2, Tabla 10, Fig. 10.2; FIGURA_10_2 de src/entities/metrologia.ts). Librería del producto: otro país trae su tabla con la misma forma. La tolerancia de asignación es (fa_max − fa_min)/2.';
comment on column banda_regulatoria.pais is 'País de la norma (CO).';
comment on column banda_regulatoria.fluido is 'crudo, gas o agua.';
comment on column banda_regulatoria.api_mayor_que is 'La fila aplica con °API > este valor (NULL = sin límite inferior).';
comment on column banda_regulatoria.api_hasta is 'La fila aplica con °API ≤ este valor (NULL = sin límite superior).';
comment on column banda_regulatoria.desde_bpd is 'Producción fiscal promedio desde la que aplica: 0 (menos de 1.000 bpd) o 1000.';
comment on column banda_regulatoria.fa_min is 'Factor mínimo aceptado.';
comment on column banda_regulatoria.fa_max is 'Factor máximo aceptado.';
comment on column banda_regulatoria.nombre is 'Fila dicha para leer (crudo de 22,3 °API o menos).';
comment on column banda_regulatoria.fuente is 'Norma.';

-- Perfil de bomba (PerfilBomba = Maquina & PerfilCampo, src/entities/bombas.ts).
create table perfil_bomba (
  campo_id            text not null,
  equipo              text not null,
  subtipo             text not null check (subtipo in ('multifasica', 'inyeccion')),
  tecnologia          text not null check (tecnologia in ('doble-tornillo', 'helico-axial', 'centrifuga-hps', 'centrifuga-api610', 'reciprocante')),
  norma               text not null,
  papel               text not null check (papel in ('transporte', 'disposicion', 'recobro')),
  capacidad_bpd       numeric not null check (capacidad_bpd > 0 and capacidad_bpd <= 10000000),
  sin_bomba_fraccion  numeric not null check (sin_bomba_fraccion between 0 and 1),
  sin_bomba_fuente    text not null,
  primary key (campo_id, equipo),
  unique (campo_id, equipo, subtipo),
  foreign key (campo_id, equipo) references equipo(campo_id, codigo),
  check ((subtipo = 'multifasica') = (papel = 'transporte'))
);
comment on table perfil_bomba is 'Perfil de una bomba de la línea en su campo (PerfilBomba, src/entities/bombas.ts): qué máquina es y qué papel cumple. GET /api/catalogo → perfilesBomba y refs.perfiles["campo/equipo"]. Ya NO trae respaldo ni tanque (configuración firmada) ni alarmas (alarma_tag). Una bomba sin perfil es un hueco de configuración.';
comment on column perfil_bomba.campo_id is 'Campo.';
comment on column perfil_bomba.equipo is 'Bomba.';
comment on column perfil_bomba.subtipo is 'multifasica o inyeccion (es también la familia de su catálogo de partes).';
comment on column perfil_bomba.tecnologia is 'doble-tornillo, helico-axial, centrifuga-hps, centrifuga-api610 o reciprocante (de ella sale la clase ISO: CLASE_ISO).';
comment on column perfil_bomba.norma is 'Norma de la máquina (API 610 Tabla 8, API 676 …).';
comment on column perfil_bomba.papel is 'transporte (multifásica), disposicion (parar es cerrar pozos) o recobro (el agua tiene otra salida).';
comment on column perfil_bomba.capacidad_bpd is 'Capacidad nominal en el fluido que mueve, bbl/d.';
comment on column perfil_bomba.sin_bomba_fraccion is 'Fracción de lo servido que NO fluye sin la bomba (1 sin derivación; 0 en recobro).';
comment on column perfil_bomba.sin_bomba_fuente is 'Quién lo declara y por qué.';

create table perfil_bomba_tag (
  campo_id  text not null,
  equipo    text not null,
  variable  text not null check (variable in ('p_succion', 't_succion', 'dp_filtro', 'p_descarga', 't_descarga', 't_rod_bomba', 'v_bomba', 't_devanado', 't_rod_motor', 'v_motor', 'velocidad', 'corriente', 'p_barrera', 'nivel_barrera', 'p_aceite', 't_aceite', 'nivel_tanque', 'caudal', 'energia', 't_empuje', 'nivel_aceite_empuje', 'fuga_sello', 'p_cabezal')),
  tag       text not null,
  primary key (campo_id, equipo, variable),
  unique (campo_id, equipo, tag),
  foreign key (campo_id, equipo) references perfil_bomba(campo_id, equipo)
);
comment on table perfil_bomba_tag is 'Tag del PLC de cada variable instrumentada de la plantilla de la bomba (Maquina.tags, VariableId → tag). Las variables de la plantilla que no tienen fila son el hueco a instalar. Sin FK a tag: el perfil puede firmarse antes de que el borde nazca.';
comment on column perfil_bomba_tag.campo_id is 'Campo.';
comment on column perfil_bomba_tag.equipo is 'Bomba.';
comment on column perfil_bomba_tag.variable is 'Variable de la plantilla (VariableId).';
comment on column perfil_bomba_tag.tag is 'Tag que la mide (PI-2010).';

create table perfil_bomba_pozo (
  campo_id  text not null,
  equipo    text not null,
  pozo      text not null,
  primary key (campo_id, equipo, pozo),
  foreign key (campo_id, equipo) references perfil_bomba(campo_id, equipo),
  foreign key (campo_id, pozo) references pozo(campo_id, id)
);
comment on table perfil_bomba_pozo is 'Pozos cuyo crudo pasa por una multifásica (PerfilCampo.pozos): si la bomba para, esos pozos dejan de fluir.';
comment on column perfil_bomba_pozo.campo_id is 'Campo.';
comment on column perfil_bomba_pozo.equipo is 'Bomba multifásica.';
comment on column perfil_bomba_pozo.pozo is 'Pozo servido.';

create table alarma_tag (
  tag_id         bigint not null references tag(id),
  vigente_desde  timestamptz not null,
  alta           double precision,
  baja           double precision,
  fuente         text not null check (btrim(fuente) <> ''),
  firmada_por    text not null,
  primary key (tag_id, vigente_desde),
  check (baja is null or alta is null or baja < alta)
);
comment on table alarma_tag is 'Base maestra de alarmas (ISA-18.2): el punto de alarma de cada tag con su norma u hoja de datos (Alarma de src/entities/bombas.ts, LimiteTag.alarma de limites.ts). Versionada y de solo inserción: rige la fila más nueva con vigente_desde ≤ t. Sin fila, el vigía responde «sin límite».';
comment on column alarma_tag.tag_id is 'Tag.';
comment on column alarma_tag.vigente_desde is 'Desde cuándo rige.';
comment on column alarma_tag.alta is 'Alarma alta; NULL = ese lado no existe (nunca 0).';
comment on column alarma_tag.baja is 'Alarma baja; NULL = ese lado no existe.';
comment on column alarma_tag.fuente is 'Norma u hoja de datos (API 610, Tabla 8 …).';
comment on column alarma_tag.firmada_por is 'Quién la firmó (ingeniería de confiabilidad del cliente).';

create table ajuste_variador (
  campo_id     text not null,
  pozo         text not null,
  variable     text not null check (variable in ('corriente', 'frecuencia', 'pip', 't_motor', 'desbalance')),
  tag          text not null,
  unidad       text not null,
  normal_baja  double precision,
  normal_alta  double precision,
  alarma_baja  double precision,
  alarma_alta  double precision,
  fuente       text not null,
  leido        timestamptz not null default now(),
  primary key (campo_id, pozo, variable),
  foreign key (campo_id, pozo) references pozo(campo_id, id),
  check (normal_baja is null or normal_alta is null or normal_baja <= normal_alta),
  check (alarma_baja is null or alarma_alta is null or alarma_baja < alarma_alta)
);
comment on table ajuste_variador is 'Ajustes de protección del variador de cada electrosumergible (configuración del pozo): banda normal y alarma de sus cinco señales. Hoy NO tienen endpoint en el contrato: referencia/insumos/<campo>/electrosumergibles.json los trae con "endpoint": null (Pendiente del lado del servidor).';
comment on column ajuste_variador.campo_id is 'Campo.';
comment on column ajuste_variador.pozo is 'Pozo con electrosumergible.';
comment on column ajuste_variador.variable is 'corriente, frecuencia, pip (presión de entrada), t_motor o desbalance.';
comment on column ajuste_variador.tag is 'Tag de la señal como la publica el variador o el sensor de fondo.';
comment on column ajuste_variador.unidad is 'Unidad.';
comment on column ajuste_variador.normal_baja is 'Lado bajo de la banda normal; NULL = abierto.';
comment on column ajuste_variador.normal_alta is 'Lado alto de la banda normal; NULL = abierto.';
comment on column ajuste_variador.alarma_baja is 'Disparo por bajo del variador; NULL = no existe.';
comment on column ajuste_variador.alarma_alta is 'Disparo por alto; NULL = no existe.';
comment on column ajuste_variador.fuente is 'De dónde sale (ajuste de protección del variador del pozo).';
comment on column ajuste_variador.leido is 'Cuándo se leyó del variador.';

create trigger alarma_tag_solo_insercion before update or delete on alarma_tag for each row execute function solo_insercion();
create trigger alarma_tag_sin_truncate before truncate on alarma_tag for each statement execute function solo_insercion();
create index produccion_fiscal_por_mes on produccion_fiscal_diaria (campo_id, mes);

-- Catálogo de daños (ISO 14224) y su mapeo a SAP PM. Librería del producto.
create table modo_falla (
  codigo              text primary key check (codigo ~ '^[A-Z]{3}$'),
  nombre              text not null,
  nombre_en           text not null,
  nombre_campo        text not null,
  mecanismo_sugerido  text
);
comment on table modo_falla is 'Modos de falla de ISO 14224:2016, Anexo B (tablas B.6–B.15): MODOS de src/entities/iso14224.ts, con el nombre en palabras de campo (MODO_EN_CAMPO de catalogo.ts). Es «lo que se vio».';
comment on column modo_falla.codigo is 'Código de tres letras (ELP, VIB, OTH…).';
comment on column modo_falla.nombre is 'Nombre de la norma en español.';
comment on column modo_falla.nombre_en is 'Nombre en inglés de la norma.';
comment on column modo_falla.nombre_campo is 'Cómo lo dice quien lo vio (Fuga hacia afuera).';
comment on column modo_falla.mecanismo_sugerido is 'Mecanismo con que suele empezar el análisis (MECANISMO_SUGERIDO). Punto de partida, no respuesta.';

create table mecanismo_falla (
  codigo     text primary key check (codigo ~ '^[1-6]\.[0-9]$'),
  nombre     text not null,
  nombre_en  text not null,
  familia    text not null check (familia in ('degradacion', 'choque'))
);
comment on table mecanismo_falla is 'Mecanismos de falla de ISO 14224:2016 Table B.2 (MECANISMOS de src/entities/iso14224.ts). Transcrita, pendiente de cotejo con la norma comprada. Solo lo de degradación se proyecta con una tendencia.';
comment on column mecanismo_falla.codigo is 'Código (1.1 Fuga, 2.1 Cavitación…).';
comment on column mecanismo_falla.nombre is 'Nombre en español.';
comment on column mecanismo_falla.nombre_en is 'Nombre en inglés de la norma.';
comment on column mecanismo_falla.familia is 'degradacion (evoluciona en el tiempo: el vigía la anticipa) o choque (súbita).';

alter table modo_falla add foreign key (mecanismo_sugerido) references mecanismo_falla(codigo);

create table causa_raiz (
  codigo  text primary key check (codigo ~ '^[1-5]$'),
  nombre  text not null
);
comment on table causa_raiz is 'Las cinco categorías de causa raíz de primer nivel de ISO 14224 Table B.3 (CAUSAS_RAIZ de src/entities/iso14224.ts).';
comment on column causa_raiz.codigo is 'Código 1 a 5.';
comment on column causa_raiz.nombre is 'Diseño, Fabricación o instalación, Operación o mantenimiento, Gestión, Misceláneo.';

create table modo_por_clase (
  clase_iso  text not null,
  modo       text not null references modo_falla(codigo),
  orden      smallint not null,
  primary key (clase_iso, modo),
  unique (clase_iso, orden)
);
comment on table modo_por_clase is 'Qué modos aplican a cada clase de equipo (ISO 14224 B.2.6; MODOS_POR_CLASE de src/entities/iso14224.ts).';
comment on column modo_por_clase.clase_iso is 'Clase ISO 14224 (bomba-centrifuga, compresor-aire…).';
comment on column modo_por_clase.modo is 'Modo que aplica.';
comment on column modo_por_clase.orden is 'Orden en que se ofrece.';

create table clase_catalogo (
  clase    text primary key check (clase in ('bomba-inyeccion', 'bomba-multifasica', 'bomba-electrosumergible')),
  familia  text not null unique check (familia in ('inyeccion', 'multifasica', 'electrosumergible')),
  nombre   text not null
);
comment on table clase_catalogo is 'Clases del catálogo de daños (ClaseCatalogo y NOMBRE_CLASE_EQUIPO de src/entities/catalogo.ts) y la familia de partes de cada una.';
comment on column clase_catalogo.clase is 'bomba-inyeccion, bomba-multifasica o bomba-electrosumergible.';
comment on column clase_catalogo.familia is 'Familia de partes (Familia de partes.ts).';
comment on column clase_catalogo.nombre is 'Nombre para leer.';

create table clase_iso_catalogo (
  clase_iso  text not null,
  papel      text not null default '*' check (papel in ('*', 'transporte', 'disposicion', 'recobro')),
  clase      text not null references clase_catalogo(clase),
  primary key (clase_iso, papel)
);
comment on table clase_iso_catalogo is 'De la clase ISO del registro y el papel de la bomba al catálogo de daños (claseDeCatalogo de src/entities/catalogo.ts). Se busca primero el papel exacto y si no, *. Una clase sin fila no tiene catálogo de partes.';
comment on column clase_iso_catalogo.clase_iso is 'Clase ISO 14224 del registro de ingeniería.';
comment on column clase_iso_catalogo.papel is 'Papel de la bomba, o * para cualquiera.';
comment on column clase_iso_catalogo.clase is 'Clase del catálogo de daños.';

create table parte (
  familia       text not null references clase_catalogo(familia),
  id            text not null check (id in ('sello', 'succion', 'rodamientos', 'hidraulica', 'motor', 'tornillos', 'filtro', 'lubricacion', 'aislamiento', 'protector', 'bomba', 'admision')),
  orden         smallint not null,
  nombre        text not null,
  item_iso      text not null,
  peso_texto    text not null,
  peso_fuente   text not null,
  anticipacion  text not null,
  accion        text not null,
  primary key (familia, id),
  unique (familia, orden)
);
comment on table parte is 'Partes (ítem mantenible, nivel 8 de ISO 14224) de cada familia (Parte de src/entities/partes.ts; PARTES_INYECCION, PARTES_MULTIFASICA, PARTES_ESP). Librería del producto, versionada con el código.';
comment on column parte.familia is 'inyeccion, multifasica o electrosumergible.';
comment on column parte.id is 'ParteId.';
comment on column parte.orden is 'Orden en el catálogo.';
comment on column parte.nombre is 'Nombre de la parte.';
comment on column parte.item_iso is 'Ítem mantenible de ISO 14224 contra el que se registra la falla.';
comment on column parte.peso_texto is 'Cuánto pesa entre las fallas.';
comment on column parte.peso_fuente is 'Fuente del peso.';
comment on column parte.anticipacion is 'Qué anticipación se puede prometer.';
comment on column parte.accion is 'Lo que se hace cuando avisa (va al mensaje del vigía y a la predicción).';

create table parte_variable (
  familia   text not null,
  parte     text not null,
  variable  text not null,
  papel     text not null check (papel in ('avisa', 'causa', 'confirma')),
  primary key (familia, parte, variable),
  foreign key (familia, parte) references parte(familia, id)
);
comment on table parte_variable is 'Variables de la familia que dicen algo de la parte, con su papel: avisa (anticipa), causa (la daña) o confirma (cambia cuando ya empezó). Parte.variables de partes.ts.';
comment on column parte_variable.familia is 'Familia.';
comment on column parte_variable.parte is 'Parte.';
comment on column parte_variable.variable is 'VariableId (p_succion, v_bomba…).';
comment on column parte_variable.papel is 'avisa, causa o confirma.';

create table parte_modo (
  familia  text not null,
  parte    text not null,
  modo     text not null references modo_falla(codigo),
  orden    smallint not null,
  primary key (familia, parte, modo),
  foreign key (familia, parte) references parte(familia, id)
);
comment on table parte_modo is 'Modos de falla que produce la parte (Parte.modos). Además de estos, toda parte admite OTH («otro»: modosDeParte).';
comment on column parte_modo.familia is 'Familia.';
comment on column parte_modo.parte is 'Parte.';
comment on column parte_modo.modo is 'Modo de ISO 14224.';
comment on column parte_modo.orden is 'Orden en que se ofrece.';

create table mapeo_catalogo_sap (
  nivel                text not null check (nivel in ('parte', 'modo', 'mecanismo', 'causa')),
  codigo_trim          text not null,
  familia              text references clase_catalogo(familia),
  perfil_catalogo_sap  text not null,
  catalogo_sap         text not null,
  grupo_codigos        text not null,
  codigo_sap           text not null,
  primary key (nivel, codigo_trim, perfil_catalogo_sap),
  check ((nivel = 'parte') = (familia is not null))
);
comment on table mapeo_catalogo_sap is 'Cómo se dice cada código de TRIM en el perfil de catálogo de SAP PM del cliente: parte → catálogo B (parte del objeto), modo → C (daño), mecanismo → daño o causa según el perfil, causa raíz → 5 (causa). Se llena en la implementación; el demo no trae filas.';
comment on column mapeo_catalogo_sap.nivel is 'parte, modo, mecanismo o causa.';
comment on column mapeo_catalogo_sap.codigo_trim is 'Código de TRIM (sello, ELP, 1.1, 3).';
comment on column mapeo_catalogo_sap.familia is 'Solo en partes: la familia (sello de inyección no es el de la multifásica).';
comment on column mapeo_catalogo_sap.perfil_catalogo_sap is 'Perfil de catálogo de la clase de equipo en SAP (RBNR).';
comment on column mapeo_catalogo_sap.catalogo_sap is 'Catálogo de SAP (B, C, 5…).';
comment on column mapeo_catalogo_sap.grupo_codigos is 'Grupo de códigos.';
comment on column mapeo_catalogo_sap.codigo_sap is 'Código en SAP.';

alter table parada_bomba add foreign key (firma_familia, firma_parte) references parte(familia, id);

create table perfil_bomba_primera_alarma (
  campo_id  text not null,
  equipo    text not null,
  tag       text not null,
  familia   text not null,
  parte     text not null,
  primary key (campo_id, equipo, tag),
  foreign key (campo_id, equipo, familia) references perfil_bomba(campo_id, equipo, subtipo),
  foreign key (familia, parte) references parte(familia, id)
);
comment on table perfil_bomba_primera_alarma is 'Interruptores de disparo que el PLC de ESTA máquina congela como primera alarma, y la parte que cada uno protege (Maquina.primerasAlarmas). Un tag que no está aquí no identifica la parte: queda en la evidencia.';
comment on column perfil_bomba_primera_alarma.campo_id is 'Campo.';
comment on column perfil_bomba_primera_alarma.equipo is 'Bomba.';
comment on column perfil_bomba_primera_alarma.tag is 'Tag del interruptor (LSH-2013, TSH-2011).';
comment on column perfil_bomba_primera_alarma.familia is 'Familia de la bomba (igual a su subtipo).';
comment on column perfil_bomba_primera_alarma.parte is 'Parte que protege.';

-- ═══════════════════════════════════════════════════════════════════════════
--  (e) CONFIGURACIÓN FIRMADA (Version y Config, src/entities/configuracion.ts)
--  Cada firma es una versión COMPLETA (no un delta) y nunca se sobrescribe: el
--  libro de un mes viejo se rehace con la versión que regía (version_en).
--  version_config guarda el JSON tal como se firmó; las tablas normalizadas
--  dicen lo mismo en filas (lo comprueba un trigger diferido al confirmar).
-- ═══════════════════════════════════════════════════════════════════════════

create table version_config (
  version  integer primary key check (version >= 1),
  base     integer,
  fecha    timestamptz not null default now(),
  por_id   text not null,
  por      text not null,
  motivo   text not null check (alcanza(motivo, 5)),
  cambios  text[] not null,
  config   jsonb not null check (jsonb_typeof(config) = 'object'),
  check ((version = 1 and base is null) or (base is not null and version = base + 1))
);
comment on table version_config is 'Una versión firmada de la configuración (Version, src/entities/configuracion.ts). GET /api/configuracion/historial (de la más vieja a la vigente) y POST /api/configuracion. Solo inserción. version = base + 1 con la clave primaria hace de candado optimista: si otro firmó en el medio, el INSERT choca y el servidor responde 409 version-cambio.';
comment on column version_config.version is 'Número consecutivo de la versión (1 = arranque de la implementación).';
comment on column version_config.base is 'Versión sobre la que se editó (cuerpo del POST). NULL solo en la 1.';
comment on column version_config.fecha is 'Hora del servidor al firmar. configEn(t) toma la última con fecha ≤ t.';
comment on column version_config.por_id is 'Id de la persona que firmó (del token).';
comment on column version_config.por is 'Firma para leer: «Nombre · rol».';
comment on column version_config.motivo is 'Por qué se cambió: 5 caracteres o más.';
comment on column version_config.cambios is 'Lo que cambió dicho para leer (diferencias de configuracion.ts), metas primero.';
comment on column version_config.config is 'La Config completa como se firmó (empresa, campos{metas, perfil}, tanques, respaldos, programa); precio sin configurar = ausente.';

create table membrete (
  version  integer primary key references version_config(version),
  empresa  text not null check (btrim(empresa) <> '')
);
comment on table membrete is 'Config.empresa de cada versión: el nombre de la empresa en el membrete de los informes. Es de la empresa, no de un campo (firma config:firmar).';
comment on column membrete.version is 'Versión.';
comment on column membrete.empresa is 'Nombre de la empresa. No vacío.';

create table perfil_campo (
  version             integer not null references version_config(version),
  campo_id            text not null references campo(id),
  gas                 text not null check (gas in ('no', 'tea', 'consumo', 'venta')),
  bombas              boolean not null,
  electrosumergibles  boolean not null,
  primary key (version, campo_id)
);
comment on table perfil_campo is 'Perfil firmado de cada campo en cada versión (PerfilCampo de configuracion.ts): qué familias de equipo tiene y qué hace con el gas. Una familia apagada sale de la vigilancia (riesgo, predicciones, bombas) pero lo que pierde se sigue contando en el libro. Un campo de Config.campos es una fila aquí.';
comment on column perfil_campo.version is 'Versión.';
comment on column perfil_campo.campo_id is 'Campo (tiene que estar en el registro: 422 si no).';
comment on column perfil_campo.gas is 'no, tea, consumo o venta.';
comment on column perfil_campo.bombas is 'Tiene bombas de la línea (reinyección, multifásicas).';
comment on column perfil_campo.electrosumergibles is 'Tiene pozos con electrosumergible.';

create table tramo_meta (
  version             integer not null,
  campo_id            text not null,
  desde               date not null,
  produccion_bpd      numeric not null check (produccion_bpd > 0 and produccion_bpd <= 10000000),
  diferido_max_bpd    numeric not null check (diferido_max_bpd >= 0 and diferido_max_bpd <= 10000000),
  netback_usd         numeric check (netback_usd >= 0 and netback_usd <= 500),
  criterio_sin_causa  numeric not null check (criterio_sin_causa >= 0 and criterio_sin_causa <= 20),
  primary key (version, campo_id, desde),
  foreign key (version, campo_id) references perfil_campo(version, campo_id)
);
comment on table tramo_meta is 'Tramo de meta de un campo (TramoMeta de configuracion.ts): rige desde su día (hora de Colombia) hasta que empiece el siguiente, con el precio neto y el máximo sin causa de la misma fecha. La meta global es la suma de los campos y nunca se guarda. Firma metas:firmar.';
comment on column tramo_meta.version is 'Versión.';
comment on column tramo_meta.campo_id is 'Campo.';
comment on column tramo_meta.desde is 'Día desde el que rige (no dos tramos el mismo día: clave primaria).';
comment on column tramo_meta.produccion_bpd is 'Meta de producción en el PMO, bbl/d: > 0 y ≤ 10.000.000 (TOPE_BPD).';
comment on column tramo_meta.diferido_max_bpd is 'Máximo de diferido aceptado, bbl/d: 0 a 10.000.000.';
comment on column tramo_meta.netback_usd is 'Precio neto, USD/bbl: 0 a 500 (TOPE_PRECIO_USD). NULL = sin configurar: esos días no se pasan a dinero (nunca vale 0).';
comment on column tramo_meta.criterio_sin_causa is 'Máximo de barriles sin causa identificada para publicar, % del potencial: 0 a 20.';

create table tanque (
  version       integer not null references version_config(version),
  id            text not null check (btrim(id) <> ''),
  orden         smallint not null,
  nombre        text not null,
  campo_id      text not null references campo(id),
  bomba         text not null check (btrim(bomba) <> ''),
  capacidad_bbl numeric not null check (capacidad_bbl > 0 and capacidad_bbl <> 'NaN' and capacidad_bbl <> 'Infinity'),
  alto_alto     numeric not null check (alto_alto >= 0.5 and alto_alto <= 0.98),
  tag_nivel     text not null check (btrim(tag_nivel) <> ''),
  aforo         text not null,
  primary key (version, id),
  unique (version, campo_id, bomba),
  unique (version, orden)
);
comment on table tanque is 'Tanque de agua de una bomba de reinyección (TanqueAgua de configuracion.ts), firmado. Se busca por (campo, bomba): como máximo uno por bomba. Con el nivel y el aforo da el colchón de horas. Firma config:firmar.';
comment on column tanque.version is 'Versión.';
comment on column tanque.id is 'Código del tanque (TK-AG-CE), único en la versión.';
comment on column tanque.orden is 'Lugar en la lista firmada (para devolver el JSON tal como se firmó).';
comment on column tanque.nombre is 'Nombre.';
comment on column tanque.campo_id is 'Campo.';
comment on column tanque.bomba is 'Bomba que lo vacía (obligatoria).';
comment on column tanque.capacidad_bbl is 'Capacidad, bbl: mayor que cero y finita.';
comment on column tanque.alto_alto is 'Fracción de la capacidad a la que dispara el nivel muy alto: 0,50 a 0,98.';
comment on column tanque.tag_nivel is 'Transmisor de nivel (LT-2012), obligatorio.';
comment on column tanque.aforo is 'Certificado de la tabla de aforo con que el nivel se vuelve barriles.';

create table respaldo (
  version    integer not null references version_config(version),
  campo_id   text not null references campo(id),
  equipo     text not null,
  orden      smallint not null,
  libre_bpd  numeric not null check (libre_bpd >= 0 and libre_bpd <= 10000000),
  detalle    text not null,
  primary key (version, campo_id, equipo),
  unique (version, orden)
);
comment on table respaldo is 'Respaldo de una bomba de la línea (RespaldoBomba de configuracion.ts): cuánto fluido libre toma el equipo en paralelo cuando ella para. Uno por (campo, equipo). Cambia el colchón, el orden de cierre y el texto del WhatsApp de la parada. Firma config:firmar.';
comment on column respaldo.version is 'Versión.';
comment on column respaldo.campo_id is 'Campo.';
comment on column respaldo.equipo is 'Bomba respaldada.';
comment on column respaldo.orden is 'Lugar en la lista firmada.';
comment on column respaldo.libre_bpd is 'Capacidad libre del respaldo, bbl/d: 0 (sin respaldo) a 10.000.000.';
comment on column respaldo.detalle is 'Qué es el respaldo (P-201A en paralelo…).';

create table parada_programada (
  version   integer not null references version_config(version),
  id        text not null check (btrim(id) <> ''),
  orden     smallint not null,
  campo_id  text not null references campo(id),
  equipo    text not null,
  desde     timestamptz not null,
  hasta     timestamptz not null,
  motivo    text not null check (alcanza(motivo, 5)),
  primary key (version, id),
  unique (version, orden),
  check (hasta > desde)
);
comment on table parada_programada is 'Programa de paradas aprobado (ParadaProgramada de configuracion.ts). Un evento del equipo que empieza dentro de [desde, hasta] es programado. Inmutable hacia atrás: una parada solo entra, sale o se mueve antes de empezar (lo revisa validarConfig contra la versión anterior). Firma config:firmar. Ids recomendados PR-{campo}-{equipo}-{fecha} (o los asigna el servidor).';
comment on column parada_programada.version is 'Versión.';
comment on column parada_programada.id is 'Id de la parada, único en la versión.';
comment on column parada_programada.orden is 'Lugar en la lista firmada.';
comment on column parada_programada.campo_id is 'Campo.';
comment on column parada_programada.equipo is 'Bomba o pozo que se para.';
comment on column parada_programada.desde is 'Inicio aprobado.';
comment on column parada_programada.hasta is 'Fin aprobado (después del inicio).';
comment on column parada_programada.motivo is 'Motivo: 5 caracteres o más.';

-- El instante en ISO 8601 con milisegundos en hora de Colombia, como viaja.
create or replace function fecha_iso_co(t timestamptz) returns text language sql immutable as $$
  select to_char(t at time zone 'America/Bogota', 'YYYY-MM-DD"T"HH24:MI:SS.MS') || '-05:00'
$$;
comment on function fecha_iso_co(timestamptz) is 'Instante en ISO 8601 con milisegundos y zona de Colombia (-05:00): la forma de las fechas del contrato.';

-- La Config de una versión, rearmada desde las tablas normalizadas.
create or replace function config_json(v integer) returns jsonb language sql stable as $$
  select jsonb_build_object(
    'empresa', (select empresa from membrete where version = v),
    'campos', coalesce((select jsonb_object_agg(p.campo_id, jsonb_build_object(
        'metas', coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
            'desde', to_char(t.desde, 'YYYY-MM-DD'), 'produccionBpd', t.produccion_bpd, 'diferidoMaxBpd', t.diferido_max_bpd,
            'netbackUsd', t.netback_usd, 'criterioSinCausa', t.criterio_sin_causa)) order by t.desde)
          from tramo_meta t where t.version = v and t.campo_id = p.campo_id), '[]'::jsonb),
        'perfil', jsonb_build_object('gas', p.gas, 'bombas', p.bombas, 'electrosumergibles', p.electrosumergibles)))
      from perfil_campo p where p.version = v), '{}'::jsonb),
    'tanques', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'nombre', nombre, 'campoId', campo_id, 'bomba', bomba,
        'capacidadBbl', capacidad_bbl, 'altoAlto', alto_alto, 'tagNivel', tag_nivel, 'aforo', aforo) order by orden)
      from tanque where version = v), '[]'::jsonb),
    'respaldos', coalesce((select jsonb_agg(jsonb_build_object('campoId', campo_id, 'equipo', equipo, 'libreBpd', libre_bpd, 'detalle', detalle) order by orden)
      from respaldo where version = v), '[]'::jsonb),
    'programa', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'campoId', campo_id, 'equipo', equipo,
        'desde', fecha_iso_co(desde), 'hasta', fecha_iso_co(hasta), 'motivo', motivo) order by orden)
      from parada_programada where version = v), '[]'::jsonb))
$$;
comment on function config_json(integer) is 'Rearma la Config de una versión desde membrete, perfil_campo, tramo_meta, tanque, respaldo y parada_programada (fechas del programa en ISO de Colombia con milisegundos).';

-- El JSON firmado con las fechas del programa escritas igual que config_json
-- y el precio sin configurar como ausente (normalizarConfig).
create or replace function config_normalizada(c jsonb) returns jsonb language sql immutable as $$
  select c
    || jsonb_build_object('programa', coalesce((select jsonb_agg(p || jsonb_build_object(
          'desde', fecha_iso_co((p ->> 'desde')::timestamptz), 'hasta', fecha_iso_co((p ->> 'hasta')::timestamptz)) order by o)
        from jsonb_array_elements(c -> 'programa') with ordinality as x(p, o)), '[]'::jsonb))
    || jsonb_build_object('campos', coalesce((select jsonb_object_agg(k, cc || jsonb_build_object('metas', coalesce((
          select jsonb_agg(jsonb_strip_nulls(t) order by o) from jsonb_array_elements(cc -> 'metas') with ordinality as y(t, o)), '[]'::jsonb)))
        from jsonb_each(c -> 'campos') as z(k, cc)), '{}'::jsonb))
$$;
comment on function config_normalizada(jsonb) is 'El JSON de una Config con las fechas del programa en ISO de Colombia y el precio null quitado: para compararlo con config_json().';

-- La versión que regía en un instante (configEn): la última firmada hasta
-- entonces; antes de la primera, la de arranque.
create or replace function version_en(t timestamptz) returns integer language sql stable as $$
  select coalesce((select max(version) from version_config where fecha <= t), (select min(version) from version_config))
$$;
comment on function version_en(timestamptz) is 'configEn de configuracion.ts: la versión vigente en t. Con ella se rehace el libro de un mes viejo, se arma cada mensaje de WhatsApp y se juzga cada falla del registro de aciertos.';

create or replace function version_config_coherente() returns trigger language plpgsql as $$
declare sin_tramo text;
begin
  select p.campo_id into sin_tramo from perfil_campo p
   where p.version = new.version and not exists (select 1 from tramo_meta t where t.version = p.version and t.campo_id = p.campo_id) limit 1;
  if sin_tramo is not null then
    raise exception 'versión %: el campo % no tiene meta firmada; necesita al menos un tramo', new.version, sin_tramo using errcode = '23514';
  end if;
  if config_json(new.version) is distinct from config_normalizada(new.config) then
    raise exception 'versión %: las tablas normalizadas no dicen lo mismo que el JSON firmado', new.version using errcode = '23514';
  end if;
  return null;
end $$;
comment on function version_config_coherente() is 'Al confirmar la transacción de una firma: todo campo trae al menos un tramo (regla 2 de validarConfig) y el JSON firmado es igual a lo normalizado.';
create constraint trigger version_config_coherente after insert on version_config deferrable initially deferred
  for each row execute function version_config_coherente();

create trigger version_config_solo_insercion before update or delete on version_config for each row execute function solo_insercion();
create trigger version_config_sin_truncate before truncate on version_config for each statement execute function solo_insercion();
create trigger membrete_solo_insercion before update or delete on membrete for each row execute function solo_insercion();
create trigger perfil_campo_solo_insercion before update or delete on perfil_campo for each row execute function solo_insercion();
create trigger tramo_meta_solo_insercion before update or delete on tramo_meta for each row execute function solo_insercion();
create trigger tanque_solo_insercion before update or delete on tanque for each row execute function solo_insercion();
create trigger respaldo_solo_insercion before update or delete on respaldo for each row execute function solo_insercion();
create trigger parada_programada_solo_insercion before update or delete on parada_programada for each row execute function solo_insercion();
create trigger membrete_sin_truncate before truncate on membrete for each statement execute function solo_insercion();
create trigger perfil_campo_sin_truncate before truncate on perfil_campo for each statement execute function solo_insercion();
create trigger tramo_meta_sin_truncate before truncate on tramo_meta for each statement execute function solo_insercion();
create trigger tanque_sin_truncate before truncate on tanque for each statement execute function solo_insercion();
create trigger respaldo_sin_truncate before truncate on respaldo for each statement execute function solo_insercion();
create trigger parada_programada_sin_truncate before truncate on parada_programada for each statement execute function solo_insercion();
create index parada_programada_por_equipo on parada_programada (campo_id, equipo, desde);

-- ═══════════════════════════════════════════════════════════════════════════
--  (f) PERSONAS: roles, capacidades, usuarios y su rastro
-- ═══════════════════════════════════════════════════════════════════════════

create table rol (
  id              text primary key,
  nombre          text not null,
  nivel           text not null check (nivel in ('decision', 'operacion', 'ingenieria')),
  area            text not null check (area in ('direccion', 'produccion', 'mantenimiento', 'soporte', 'plataforma')),
  inicio          text not null,
  pantallas       text[] not null,
  campos_fabrica  text[],
  recibe_alertas  boolean not null default false,
  visible         boolean not null default true,
  check (inicio = any (pantallas))
);
comment on table rol is 'Roles del producto (Rol de src/entities/tipos.ts; ROLES de roles.ts). Los fija el producto: el gerente decide quién tiene cada rol, no qué hace el rol. visible=false son los de la versión 2 (plan, cont, reg), que no se ofrecen.';
comment on column rol.id is 'Id del rol (ger, prod, sup, oper, jefe, conf, tec, adm).';
comment on column rol.nombre is 'Nombre (Gerente de activo).';
comment on column rol.nivel is 'Nivel de detalle: decision, operacion o ingenieria. Cambia lo que se muestra, no los números.';
comment on column rol.area is 'Área del organigrama.';
comment on column rol.inicio is 'Pantalla con que entra.';
comment on column rol.pantallas is 'Pantallas del rol.';
comment on column rol.campos_fabrica is 'Campos de fábrica del rol (los de una persona salen de usuario_campo). NULL = todos.';
comment on column rol.recibe_alertas is 'Tiene reglas de WhatsApp (ROLES_CON_ALERTAS: sup, oper, tec, conf, jefe).';
comment on column rol.visible is 'Rol del primer producto (true) o de la versión 2 (false).';

create table capacidad (
  id       text primary key check (id in ('causa:declarar', 'causa:completar', 'evidencia:exportar', 'conector:configurar', 'config:firmar', 'metas:firmar', 'usuarios:administrar', 'sap:aviso', 'asignacion:cargar')),
  nombre   text not null,
  incluye  text references capacidad(id)
);
comment on table capacidad is 'Las nueve capacidades (Capacidad y CAPACIDAD_NOMBRE de src/entities/tipos.ts): cada una es un permiso que el servidor revisa en un endpoint (403 sin ella).';
comment on column capacidad.id is 'Id de la capacidad.';
comment on column capacidad.nombre is 'Qué permite, dicho para leer.';
comment on column capacidad.incluye is 'Otra capacidad que esta trae consigo (causa:completar incluye causa:declarar: INCLUYE de tipos.ts).';

create table rol_capacidad (
  rol_id        text not null references rol(id),
  capacidad_id  text not null references capacidad(id),
  primary key (rol_id, capacidad_id)
);
comment on table rol_capacidad is 'Reparto de capacidades por rol (Rol.puede de roles.ts). Las capacidades de la sesión salen de aquí (más lo que cada una incluye).';
comment on column rol_capacidad.rol_id is 'Rol.';
comment on column rol_capacidad.capacidad_id is 'Capacidad concedida.';

create table usuario (
  id                  text primary key check (btrim(id) <> ''),
  nombre              text not null check (alcanza(nombre, 3)),
  correo              text not null check (correo ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  rol_id              text not null references rol(id),
  todos_los_campos    boolean not null default false,
  estado              text not null check (estado in ('activo', 'invitado', 'suspendido')),
  desde               date not null,
  telefono            text check (telefono ~ '^\+[0-9]{8,15}$'),
  alertas             boolean not null default false,
  antes_de_suspender  text check (antes_de_suspender in ('activo', 'invitado')),
  check ((estado = 'suspendido') = (antes_de_suspender is not null)),
  check (not alertas or telefono is not null)
);
create unique index usuario_correo_unico on usuario (lower(btrim(correo)));
create unique index usuario_telefono_unico on usuario (telefono) where estado <> 'suspendido';
comment on table usuario is 'Registro de personas (Usuario de src/entities/usuarios.ts). GET/POST /api/usuarios, PATCH /api/usuarios/:id. Nadie se borra: quien ya no debe entrar queda suspendido y su nombre sigue en lo que firmó. Correo único en minúsculas; WhatsApp en E.164 único entre los no suspendidos (es la identidad del webhook).';
comment on column usuario.id is 'Id que asigna el servidor (u9). Lo lleva el token.';
comment on column usuario.nombre is 'Nombre completo: 3 caracteres o más.';
comment on column usuario.correo is 'Correo con forma de correo; único sin distinguir mayúsculas.';
comment on column usuario.rol_id is 'Rol del producto.';
comment on column usuario.todos_los_campos is 'true = campos "todos" (incluye los que se agreguen después); false = la lista de usuario_campo.';
comment on column usuario.estado is 'activo, invitado (aún no entra) o suspendido.';
comment on column usuario.desde is 'Día en que se le dio acceso (reloj del servidor, Colombia).';
comment on column usuario.telefono is 'WhatsApp en E.164 (+573005550101): así se guarda, viaja y compara. NULL = sin número.';
comment on column usuario.alertas is 'Recibe las alertas de su rol por WhatsApp (solo con teléfono y en un rol con alertas).';
comment on column usuario.antes_de_suspender is 'Lo pone el servidor al suspender: el estado que tenía, al que vuelve al quitar la suspensión.';

create table usuario_campo (
  usuario_id  text not null references usuario(id),
  campo_id    text not null references campo(id),
  primary key (usuario_id, campo_id)
);
comment on table usuario_campo is 'Campos asignados a una persona cuando no tiene «todos» (camposAsignados de usuarios.ts). La capacidad dice QUÉ puede hacer; los campos, DÓNDE: toda lectura y escritura se limita a ellos.';
comment on column usuario_campo.usuario_id is 'Persona.';
comment on column usuario_campo.campo_id is 'Campo asignado.';

create table identidad_oidc (
  emisor      text not null,
  sujeto      text not null,
  usuario_id  text not null references usuario(id),
  desde       timestamptz not null default now(),
  primary key (emisor, sujeto)
);
comment on table identidad_oidc is 'De la identidad del servicio de SSO del cliente (OIDC: iss + sub del token) a la persona de TRIM. TRIM no guarda contraseñas.';
comment on column identidad_oidc.emisor is 'iss del token.';
comment on column identidad_oidc.sujeto is 'sub del token.';
comment on column identidad_oidc.usuario_id is 'Persona.';
comment on column identidad_oidc.desde is 'Cuándo se asoció.';

create table cambio_acceso (
  id          bigint generated always as identity primary key,
  fecha       timestamptz not null default now(),
  por_id      text not null references usuario(id),
  por         text not null,
  usuario_id  text not null references usuario(id),
  usuario     text not null,
  cambios     text[] not null check (cardinality(cambios) > 0),
  motivo      text not null check (alcanza(motivo, 5))
);
comment on table cambio_acceso is 'Rastro de cada cambio de acceso (CambioAcceso de usuarios.ts): quién, cuándo, a quién, qué y por qué. GET /api/usuarios/historial (solo con usuarios:administrar). Solo inserción.';
comment on column cambio_acceso.id is 'Consecutivo.';
comment on column cambio_acceso.fecha is 'Hora del servidor.';
comment on column cambio_acceso.por_id is 'Quién firmó (del token).';
comment on column cambio_acceso.por is '«Nombre · rol» del firmante.';
comment on column cambio_acceso.usuario_id is 'Persona a quien se cambió el acceso.';
comment on column cambio_acceso.usuario is 'Su nombre como quedó (CambioAcceso.usuario).';
comment on column cambio_acceso.cambios is 'Lo que cambió, para leer (invitado como…, campos: …, WhatsApp: …).';
comment on column cambio_acceso.motivo is 'Motivo: 5 caracteres o más.';

create or replace function usuario_reglas() returns trigger language plpgsql as $$
begin
  if tg_op = 'TRUNCATE' then
    raise exception 'nadie se borra: la tabla usuario no admite TRUNCATE' using errcode = '23001';
  end if;
  if tg_op = 'DELETE' then
    raise exception 'nadie se borra: suspenda a % en vez de borrarlo', old.id using errcode = '23001';
  end if;
  if new.alertas and not (select recibe_alertas from rol where id = new.rol_id) then
    raise exception 'el rol % no recibe alertas por WhatsApp', new.rol_id using errcode = '23514';
  end if;
  return new;
end $$;
comment on function usuario_reglas() is 'Trigger de usuario: no se borra a nadie (ni DELETE ni TRUNCATE) y las alertas solo van en roles que las tienen.';
create trigger usuario_reglas before insert or update or delete on usuario for each row execute function usuario_reglas();
create trigger usuario_sin_truncate before truncate on usuario for each statement execute function usuario_reglas();

create or replace function usuario_coherente() returns trigger language plpgsql as $$
declare u text;
begin
  if not exists (select 1 from usuario where rol_id = 'ger' and estado = 'activo') and exists (select 1 from usuario) then
    raise exception 'tiene que quedar al menos un gerente de activo con acceso' using errcode = '23514';
  end if;
  select x.id into u from usuario x
   where x.todos_los_campos = exists (select 1 from usuario_campo c where c.usuario_id = x.id) limit 1;
  if u is not null then
    raise exception 'la persona % tiene que tener «todos» los campos o al menos uno, no las dos cosas ni ninguna', u using errcode = '23514';
  end if;
  return null;
end $$;
comment on function usuario_coherente() is 'Al confirmar: queda al menos un gerente activo (409 en el contrato) y cada persona tiene «todos» o una lista no vacía de campos.';
create constraint trigger usuario_coherente after insert or update on usuario deferrable initially deferred for each row execute function usuario_coherente();
create constraint trigger usuario_campo_coherente after insert or delete on usuario_campo deferrable initially deferred for each row execute function usuario_coherente();
create trigger cambio_acceso_solo_insercion before update or delete on cambio_acceso for each row execute function solo_insercion();
create trigger cambio_acceso_sin_truncate before truncate on cambio_acceso for each statement execute function solo_insercion();

alter table version_config add foreign key (por_id) references usuario(id) deferrable initially deferred;
alter table inscripcion add foreign key (emitido_por) references usuario(id);

-- ═══════════════════════════════════════════════════════════════════════════
--  (h) LO QUE SE LEE DE SAP PM (TRIM no crea órdenes: manda avisos y lee)
--  Va antes que (g) porque las escrituras apuntan a avisos y órdenes.
-- ═══════════════════════════════════════════════════════════════════════════

create table equipo_sap (
  campo_id    text not null,
  equipo      text not null,
  equipo_sap  text not null unique,
  ubicacion   text not null,
  primary key (campo_id, equipo),
  foreign key (campo_id, equipo) references activo(campo_id, codigo)
);
comment on table equipo_sap is 'Identidad del activo en el maestro de SAP PM (identidadSap de src/entities/sap.ts): número de equipo y ubicación técnica. Se asocia en Conectores. GET /api/sap/equipos?campo y GET /api/sap/equipos/:equipo → identidad. En el demo sale de una regla fija.';
comment on column equipo_sap.campo_id is 'Campo.';
comment on column equipo_sap.equipo is 'Activo de TRIM (equipo o pozo).';
comment on column equipo_sap.equipo_sap is 'Número de equipo de SAP (EQUNR).';
comment on column equipo_sap.ubicacion is 'Ubicación técnica de SAP (TPLNR), CO-CEI-BAT1-AGU-P-201B.';

create table clase_orden_sap (
  clase_sap  text primary key,
  clase      text not null check (clase in ('PM01', 'PM02', 'PM03')),
  nombre     text not null
);
comment on table clase_orden_sap is 'Mapeo de las clases de orden de la operadora a las tres de TRIM (ClaseOrden: PM01 correctivo, PM02 preventivo, PM03 predictivo). Se configura en la implementación.';
comment on column clase_orden_sap.clase_sap is 'Clase de orden en SAP del cliente (AUART).';
comment on column clase_orden_sap.clase is 'PM01, PM02 o PM03.';
comment on column clase_orden_sap.nombre is 'correctivo, preventivo o predictivo.';

create table aviso_sap (
  numero         text primary key check (btrim(numero) <> ''),
  tipo           text not null check (tipo in ('M1', 'M2')),
  campo_id       text not null,
  equipo         text not null,
  descripcion    text not null,
  prioridad      smallint not null check (prioridad between 1 and 4),
  familia        text,
  parte          text,
  modo           text references modo_falla(codigo),
  inicio_averia  timestamptz,
  parada         boolean not null,
  evidencia      text[] not null default '{}',
  creado         timestamptz not null,
  creado_por     text not null,
  creado_por_id  text,
  origen         text not null check (origen in ('trim', 'sap')),
  evento_id      text references evento(id),
  cerrado        boolean not null default false,
  actualizado    timestamptz not null default now(),
  foreign key (campo_id, equipo) references activo(campo_id, codigo),
  foreign key (familia, parte) references parte(familia, id),
  check ((familia is null) = (parte is null)),
  check (origen = 'sap' or alcanza(descripcion, 8))
);
create unique index aviso_sap_uno_abierto on aviso_sap (campo_id, equipo) where not cerrado;
comment on table aviso_sap is 'Avisos de mantenimiento de SAP PM (AvisoSap de src/entities/sap.ts): los que TRIM envía (POST /api/sap/avisos, origen trim) y los creados directo en SAP (origen sap), sincronizados. GET /api/sap/avisos. Uno abierto por (campo, equipo): índice único parcial; el POST responde 409 con el número del abierto.';
comment on column aviso_sap.numero is 'Número de aviso de SAP (QMNUM). Lo devuelve SAP al crearlo.';
comment on column aviso_sap.tipo is 'M1 solicitud (el equipo marcha y una parte avisa) o M2 avería (el equipo paró).';
comment on column aviso_sap.campo_id is 'Campo.';
comment on column aviso_sap.equipo is 'Equipo o pozo de TRIM (la identidad SAP sale de equipo_sap).';
comment on column aviso_sap.descripcion is 'Texto corto. Desde TRIM: 8 caracteres o más (422 campo descripcion).';
comment on column aviso_sap.prioridad is '1 muy alta … 4 baja.';
comment on column aviso_sap.familia is 'Familia de la parte (para la FK al catálogo de partes).';
comment on column aviso_sap.parte is 'Parte del objeto (catálogo B de SAP vía mapeo_catalogo_sap).';
comment on column aviso_sap.modo is 'Daño: el modo de ISO 14224 que se vio (catálogo C).';
comment on column aviso_sap.inicio_averia is 'Inicio de la avería: la hora del PLC.';
comment on column aviso_sap.parada is 'Indicador de parada de SAP: el equipo está parado.';
comment on column aviso_sap.evidencia is 'Texto largo: la evidencia de TRIM (tags, lecturas, causa).';
comment on column aviso_sap.creado is 'Cuándo se creó.';
comment on column aviso_sap.creado_por is 'Quién, para leer (Nombre · desde TRIM, o Operación, directo en SAP).';
comment on column aviso_sap.creado_por_id is 'Persona de TRIM que lo envió por POST /api/sap/avisos (del token). NULL en los creados directo en SAP y en los que arma TRIM solo (en el demo, la regla fija sobre el PLC).';
comment on column aviso_sap.origen is 'trim o sap.';
comment on column aviso_sap.evento_id is 'Evento del PLC que lo originó. (AvisoSap.orden no es columna: sale de orden_sap.aviso, única por aviso.)';
comment on column aviso_sap.cerrado is 'Cerrado en SAP (lo dice la sincronización).';
comment on column aviso_sap.actualizado is 'Última sincronización con SAP.';

create table orden_sap (
  numero          text primary key check (btrim(numero) <> ''),
  clase_sap       text not null references clase_orden_sap(clase_sap),
  campo_id        text not null,
  equipo          text not null,
  descripcion     text not null,
  estado          text not null check (estado in ('CRTD', 'REL', 'PCNF', 'CNF', 'TECO')),
  prioridad       smallint not null check (prioridad between 1 and 4),
  creada          timestamptz not null,
  liberada        timestamptz,
  cierre_tecnico  timestamptz,
  tecnico_id      text references usuario(id),
  puesto          text not null,
  aviso           text references aviso_sap(numero),
  horas_reales    numeric not null default 0 check (horas_reales >= 0),
  evento_id       text references evento(id),
  actualizado     timestamptz not null default now(),
  foreign key (campo_id, equipo) references activo(campo_id, codigo),
  check (estado <> 'TECO' or cierre_tecnico is not null),
  check (estado = 'CRTD' or liberada is not null)
);
comment on table orden_sap is 'Órdenes de trabajo de SAP PM (OrdenSap de src/entities/sap.ts), leídas de SAP: las crea, libera y cierra el planeador allá. GET /api/sap/ordenes (el front suma las horas por clase). Con la parada del PLC (evento_id) dan los tres relojes de ISO 14224. En el demo se derivan del PLC con una regla fija.';
comment on column orden_sap.numero is 'Número de orden (AUFNR).';
comment on column orden_sap.clase_sap is 'Clase de orden de la operadora; la clase de TRIM sale de clase_orden_sap.';
comment on column orden_sap.campo_id is 'Campo.';
comment on column orden_sap.equipo is 'Equipo o pozo.';
comment on column orden_sap.descripcion is 'Texto corto de la orden.';
comment on column orden_sap.estado is 'Estado de sistema: CRTD creada, REL liberada, PCNF en ejecución, CNF ejecutada, TECO cerrada.';
comment on column orden_sap.prioridad is '1 a 4.';
comment on column orden_sap.creada is 'Creación.';
comment on column orden_sap.liberada is 'Liberación (dispara el WhatsApp al técnico asignado).';
comment on column orden_sap.cierre_tecnico is 'Cierre técnico (TECO).';
comment on column orden_sap.tecnico_id is 'Persona de TRIM asignada (OrdenSap.tecnico: el id del registro de usuarios, resuelto por su correo en SAP). NULL si va a un contratista: solo puesto.';
comment on column orden_sap.puesto is 'Puesto de trabajo (MEC-CEIBA, MEC-CONTRATISTA).';
comment on column orden_sap.aviso is 'Aviso que la originó. Un aviso tiene a lo más una orden (en SAP, QMEL-AUFNR es un solo número; índice único orden_sap_un_aviso): de aquí sale AvisoSap.orden de GET /api/sap/avisos.';
comment on column orden_sap.horas_reales is 'Horas confirmadas en SAP (reparación activa), como las suma SAP en la cabecera de la orden.';
comment on column orden_sap.evento_id is 'En una correctiva: la parada del PLC que atendió (indisponibilidad total).';
comment on column orden_sap.actualizado is 'Última sincronización.';

create table confirmacion_sap (
  orden         text not null references orden_sap(numero),
  confirmacion  text not null,
  contador      integer not null,
  horas         numeric not null check (horas >= 0),
  fecha         timestamptz not null,
  final         boolean not null default false,
  primary key (orden, confirmacion, contador)
);
comment on table confirmacion_sap is 'Confirmaciones de horas de una orden en SAP (AFRU), para auditar orden_sap.horas_reales. Opcional: el demo no trae detalle.';
comment on column confirmacion_sap.orden is 'Orden.';
comment on column confirmacion_sap.confirmacion is 'Número de confirmación (RUECK).';
comment on column confirmacion_sap.contador is 'Contador de la confirmación (RMZHL).';
comment on column confirmacion_sap.horas is 'Horas confirmadas.';
comment on column confirmacion_sap.fecha is 'Fecha de la confirmación.';
comment on column confirmacion_sap.final is 'Confirmación final.';

create table material_sap (
  material     text primary key,
  descripcion  text not null
);
comment on table material_sap is 'Maestro de materiales de los repuestos críticos (SAP MM).';
comment on column material_sap.material is 'Número de material (MATNR).';
comment on column material_sap.descripcion is 'Descripción.';

create table repuesto_orden (
  orden        text not null references orden_sap(numero),
  material     text not null references material_sap(material),
  descripcion  text not null,
  cantidad     numeric not null check (cantidad > 0),
  primary key (orden, material)
);
comment on table repuesto_orden is 'Repuestos reservados en una orden (RepuestoOrden de src/entities/sap.ts).';
comment on column repuesto_orden.orden is 'Orden.';
comment on column repuesto_orden.material is 'Material.';
comment on column repuesto_orden.descripcion is 'Descripción como viene en la orden.';
comment on column repuesto_orden.cantidad is 'Cantidad.';

create table stock_sap (
  material              text not null references material_sap(material),
  campo_id              text not null references campo(id),
  stock                 numeric not null check (stock >= 0),
  minimo                numeric not null check (minimo >= 0),
  plazo_dias            integer not null check (plazo_dias >= 0),
  en_transito_cantidad  numeric check (en_transito_cantidad > 0),
  en_transito_llega     date,
  leido                 timestamptz not null default now(),
  primary key (material, campo_id),
  check ((en_transito_cantidad is null) = (en_transito_llega is null))
);
comment on table stock_sap is 'Stock de libre utilización de un repuesto crítico en la bodega del campo (Repuesto de src/entities/sap.ts). GET /api/sap/equipos/:equipo → repuestos.';
comment on column stock_sap.material is 'Material.';
comment on column stock_sap.campo_id is 'Campo (bodega).';
comment on column stock_sap.stock is 'Libre utilización.';
comment on column stock_sap.minimo is 'Stock mínimo.';
comment on column stock_sap.plazo_dias is 'Días que tarda en llegar si hay que pedirlo.';
comment on column stock_sap.en_transito_cantidad is 'Cantidad en camino.';
comment on column stock_sap.en_transito_llega is 'Cuándo llega lo que está en camino.';
comment on column stock_sap.leido is 'Última lectura de SAP.';

create table repuesto_equipo (
  material  text not null,
  campo_id  text not null,
  equipo    text not null,
  primary key (material, campo_id, equipo),
  foreign key (material, campo_id) references stock_sap(material, campo_id),
  foreign key (campo_id, equipo) references activo(campo_id, codigo)
);
comment on table repuesto_equipo is 'Qué equipos usan un repuesto (Repuesto.equipos). Un material del campo sin filas aquí es de la flota de electrosumergibles del campo (repuestosDe de sap.ts).';
comment on column repuesto_equipo.material is 'Material.';
comment on column repuesto_equipo.campo_id is 'Campo.';
comment on column repuesto_equipo.equipo is 'Equipo que lo usa.';

create index aviso_sap_por_campo on aviso_sap (campo_id, creado desc);
create index orden_sap_por_campo on orden_sap (campo_id, creada desc);
create index orden_sap_por_evento on orden_sap (evento_id) where evento_id is not null;
create unique index orden_sap_un_aviso on orden_sap (aviso) where aviso is not null;

-- ═══════════════════════════════════════════════════════════════════════════
--  (g) LO QUE ENTRA A MANO (y lo que TRIM envía y recibe por WhatsApp)
-- ═══════════════════════════════════════════════════════════════════════════

create table plantilla_whatsapp (
  clave      text primary key check (clave in ('parada', 'paradaEsp', 'cierre', 'causa', 'recordatorio', 'recordatorioArranco', 'escalamiento', 'parte', 'parteSinTag', 'orden')),
  nombre     text not null unique,
  cuerpo     text not null,
  categoria  text not null default 'utilidad',
  idioma     text not null default 'es'
);
comment on table plantilla_whatsapp is 'Las diez plantillas aprobadas por Meta (PLANTILLAS de src/entities/mensajes.ts). El mensaje que inicia la empresa tiene que ser una de ellas; el texto de cada mensaje es exactamente su cuerpo con los parámetros.';
comment on column plantilla_whatsapp.clave is 'Clave interna (NombrePlantilla).';
comment on column plantilla_whatsapp.nombre is 'Nombre aprobado en Meta (trim_equipo_parado…).';
comment on column plantilla_whatsapp.cuerpo is 'Cuerpo aprobado con sus variables entre llaves.';
comment on column plantilla_whatsapp.categoria is 'Categoría de Meta: utilidad.';
comment on column plantilla_whatsapp.idioma is 'Idioma de la plantilla.';

create table prediccion (
  id               text primary key,
  campo_id         text not null,
  equipo           text not null,
  familia          text,
  parte            text,
  tag              text,
  accion           text,
  emitida          timestamptz not null,
  desde            timestamptz not null,
  hasta            timestamptz not null,
  calificacion     text not null default 'seguimiento' check (calificacion in ('seguimiento', 'acierto', 'intervenida', 'falsa-alarma')),
  falla_evento_id  text references evento(id),
  falla_inicio     timestamptz,
  intervencion     timestamptz,
  calificada       timestamptz,
  foreign key (campo_id, equipo) references activo(campo_id, codigo),
  foreign key (familia, parte) references parte(familia, id),
  check ((familia is null) = (parte is null)),
  check (hasta >= desde),
  check ((falla_evento_id is null) = (falla_inicio is null)),
  check ((calificacion = 'acierto') = (falla_evento_id is not null)),
  check ((calificacion = 'intervenida') = (intervencion is not null)),
  check ((calificacion = 'seguimiento') = (calificada is null))
);
comment on table prediccion is 'Registro de predicciones del vigía (PrediccionVigia de src/entities/aciertos.ts). Se guarda cuando sale, con su ventana; la calificación (acierto, intervenida, falsa alarma) se agrega una sola vez al vencer (calificar). GET /api/vistas/predicciones. Nada se califica hacia atrás: el registro empieza con la puesta en marcha.';
comment on column prediccion.id is 'Id de la predicción.';
comment on column prediccion.campo_id is 'Campo.';
comment on column prediccion.equipo is 'Equipo de alto impacto (bomba o pozo con electrosumergible).';
comment on column prediccion.familia is 'Familia de la parte.';
comment on column prediccion.parte is 'Parte que va a fallar.';
comment on column prediccion.tag is 'Tag cuya tendencia la sostiene (NULL: plantilla parteSinTag).';
comment on column prediccion.accion is 'Qué hacer (del catálogo de la parte).';
comment on column prediccion.emitida is 'Cuándo la emitió el vigía (sale el WhatsApp a confiabilidad y jefe de mantenimiento).';
comment on column prediccion.desde is 'Inicio de la ventana en que cruzaría su límite.';
comment on column prediccion.hasta is 'Fin de la ventana.';
comment on column prediccion.calificacion is 'seguimiento mientras la ventana está abierta; luego acierto, intervenida o falsa-alarma.';
comment on column prediccion.falla_evento_id is 'Acierto: la falla del PLC que la confirmó.';
comment on column prediccion.falla_inicio is 'Inicio de esa falla.';
comment on column prediccion.intervencion is 'Intervenida: cierre en SAP de la orden que la atendió antes de fallar.';
comment on column prediccion.calificada is 'Cuándo se calificó.';

create or replace function prediccion_califica() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'las predicciones no se borran (%)', old.id using errcode = '23001';
  end if;
  if old.calificacion <> 'seguimiento' then
    raise exception 'la predicción % ya se calificó (%): no se recalifica', old.id, old.calificacion using errcode = '23001';
  end if;
  if (to_jsonb(new) - array['calificacion', 'falla_evento_id', 'falla_inicio', 'intervencion', 'calificada'])
     is distinct from (to_jsonb(old) - array['calificacion', 'falla_evento_id', 'falla_inicio', 'intervencion', 'calificada']) then
    raise exception 'la predicción % se guardó al emitirse: solo se le agrega la calificación', old.id using errcode = '23001';
  end if;
  return new;
end $$;
comment on function prediccion_califica() is 'Trigger de prediccion: lo emitido no cambia; la calificación se agrega una vez.';
create trigger prediccion_califica before update or delete on prediccion for each row execute function prediccion_califica();
create trigger prediccion_sin_truncate before truncate on prediccion for each statement execute function solo_insercion();

create table respuesta_entrante (
  meta_id           text primary key,
  recibido          timestamptz not null default now(),
  de_telefono       text not null check (de_telefono ~ '^\+[0-9]{8,15}$'),
  contexto_meta_id  text,
  texto             text,
  opcion            text,
  resultado         text not null check (resultado in ('aceptada', 'en-curso', 'descartada')),
  motivo            text,
  usuario_id        text references usuario(id),
  evento_id         text references evento(id),
  payload           jsonb not null,
  check ((resultado = 'descartada') = (motivo is not null)),
  check (resultado = 'descartada' or (usuario_id is not null and evento_id is not null))
);
comment on table respuesta_entrante is 'Mensajes entrantes del webhook de WhatsApp (POST /api/webhooks/whatsapp), ya con la firma X-Hub-Signature-256 válida. La clave primaria es el id de Meta (messages[].id): Meta reintenta y el segundo intento choca (deduplicación). Se guarda aceptado, en curso (un paso del diálogo que pide el siguiente: la parte o lo que vio) o descartado, con el motivo. Solo inserción.';
comment on column respuesta_entrante.meta_id is 'Id del mensaje entrante en Meta (wamid). Clave de deduplicación.';
comment on column respuesta_entrante.recibido is 'Hora del servidor.';
comment on column respuesta_entrante.de_telefono is 'Número que escribe (from), en E.164.';
comment on column respuesta_entrante.contexto_meta_id is 'context.id: el mensaje saliente que la persona respondió, una plantilla (mensaje.meta_id) o un mensaje libre del diálogo (mensaje_libre.meta_id, que además trae la parte y el modo ya escogidos). El evento se resuelve SOLO por aquí, nunca por «la última pregunta abierta». Sin FK: puede apuntar a cualquiera de las dos tablas o a nada (se descarta).';
comment on column respuesta_entrante.texto is 'Lo que escribió.';
comment on column respuesta_entrante.opcion is 'Clave escogida de las opciones de ESE mensaje («1», «0»): de mensaje.opciones si responde a la plantilla, de mensaje_libre.opciones si responde a «¿Qué vio…?», «¿Qué parte?» o «¿Qué fue?».';
comment on column respuesta_entrante.resultado is 'aceptada (con ella entró la respuesta_parada), en-curso (paso aceptado del diálogo: el servidor contestó con un mensaje_libre que pide lo que falta) o descartada.';
comment on column respuesta_entrante.motivo is 'Por qué se descartó (número no registrado, ya respondieron, opción inválida, texto corto…).';
comment on column respuesta_entrante.usuario_id is 'Persona resuelta: activa, con alertas y con el campo de la parada.';
comment on column respuesta_entrante.evento_id is 'Evento resuelto por el context.id.';
comment on column respuesta_entrante.payload is 'El cuerpo de Meta (para auditar).';

create table respuesta_parada (
  evento_id         text primary key references evento(id),
  texto             text not null,
  por               text not null,
  por_id            text references usuario(id),
  hora              timestamptz not null,
  familia           text,
  parte             text,
  modo              text references modo_falla(codigo),
  canal             text check (canal in ('whatsapp', 'pantalla')),
  entrante_meta_id  text unique references respuesta_entrante(meta_id),
  foreign key (familia, parte) references parte(familia, id),
  check ((familia is null) = (parte is null)),
  check (modo is null or parte is not null),
  check ((parte is not null and coalesce(modo, '') <> 'OTH') or alcanza(texto, 8)),
  check ((canal = 'whatsapp') = (entrante_meta_id is not null)),
  check (canal is null or por_id is not null)
);
comment on table respuesta_parada is 'Respuesta de un operario a una parada que ninguna señal explica (Respuesta de src/entities/pozos.ts): el único dato del libro que entra a mano, marcado como declarado. POST /api/paradas/:evento/respuesta (pantalla) o webhook (WhatsApp); GET /api/paradas/respuestas. Una por evento: la PRIMERA gana (clave primaria → 409). Solo inserción: no se edita ni se reemplaza.';
comment on column respuesta_parada.evento_id is 'Evento del PLC (de pozo o de bomba).';
comment on column respuesta_parada.texto is 'Lo que encontró. Sin parte, o con el modo OTH, 8 caracteres o más.';
comment on column respuesta_parada.por is '«Nombre · rol» (lo pone el servidor desde el token).';
comment on column respuesta_parada.por_id is 'Id de la persona. NULL solo en respuestas históricas importadas sin persona registrada.';
comment on column respuesta_parada.hora is 'Hora del servidor (si llega después del arranque del equipo, la parada es no conformidad).';
comment on column respuesta_parada.familia is 'Familia de la parte.';
comment on column respuesta_parada.parte is 'En una bomba o una electrosumergible: la parte que se dañó (obligatoria en una bomba de la línea).';
comment on column respuesta_parada.modo is 'Lo que vio: modo de ISO 14224 de la parte (o OTH).';
comment on column respuesta_parada.canal is 'whatsapp (solo por el webhook firmado) o pantalla. NULL en respuestas históricas importadas.';
comment on column respuesta_parada.entrante_meta_id is 'Con canal whatsapp: el mensaje entrante que la completó (el último del diálogo; los pasos anteriores quedan en respuesta_entrante como en-curso y en mensaje_libre).';

create or replace function respuesta_parada_reglas() returns trigger language plpgsql as $$
declare c text;
begin
  select clase into c from evento where id = new.evento_id;
  if c not in ('pozo', 'bomba') then
    raise exception 'el evento % es de un servicio: no se responde', new.evento_id using errcode = '23514';
  end if;
  if new.modo is not null and new.modo <> 'OTH'
     and not exists (select 1 from parte_modo m where m.familia = new.familia and m.parte = new.parte and m.modo = new.modo) then
    raise exception 'el modo % no es de la parte % (%)', new.modo, new.parte, new.familia using errcode = '23514';
  end if;
  return new;
end $$;
comment on function respuesta_parada_reglas() is 'Trigger de respuesta_parada: solo eventos de pozo o de bomba, y el modo es de la parte (u OTH).';
create trigger respuesta_parada_reglas before insert on respuesta_parada for each row execute function respuesta_parada_reglas();

create table analisis (
  evento_id   text not null references respuesta_parada(evento_id),
  version     integer not null check (version >= 1),
  mecanismo   text not null references mecanismo_falla(codigo),
  causa_raiz  text not null references causa_raiz(codigo),
  nota        text,
  por         text not null,
  por_id      text not null references usuario(id),
  hora        timestamptz not null default now(),
  primary key (evento_id, version)
);
comment on table analisis is 'Análisis de confiabilidad de una falla declarada (Analisis de src/entities/catalogo.ts): mecanismo (ISO 14224 B.2) y causa raíz (B.3). POST /api/analisis/:evento (causa:completar); GET /api/analisis → vigentes (la versión más alta) y anteriores. Un segundo POST es una versión nueva. Solo inserción.';
comment on column analisis.evento_id is 'Evento con respuesta declarada CON parte (si no, 422).';
comment on column analisis.version is 'Versión: 1, 2, 3… sin huecos (trigger).';
comment on column analisis.mecanismo is 'Código de la Table B.2.';
comment on column analisis.causa_raiz is 'Código de la Table B.3 (primer nivel).';
comment on column analisis.nota is 'Nota libre.';
comment on column analisis.por is '«Nombre · rol».';
comment on column analisis.por_id is 'Persona.';
comment on column analisis.hora is 'Hora del servidor.';

create or replace function analisis_reglas() returns trigger language plpgsql as $$
begin
  if (select parte from respuesta_parada where evento_id = new.evento_id) is null then
    raise exception 'la parada % no tiene una respuesta declarada con parte: no hay qué analizar', new.evento_id using errcode = '23514';
  end if;
  if new.version <> coalesce((select max(version) from analisis where evento_id = new.evento_id), 0) + 1 then
    raise exception 'el análisis de % va en la versión %, no en la %', new.evento_id,
      coalesce((select max(version) from analisis where evento_id = new.evento_id), 0) + 1, new.version using errcode = '23514';
  end if;
  return new;
end $$;
comment on function analisis_reglas() is 'Trigger de analisis: exige respuesta con parte y versiones consecutivas.';
create trigger analisis_reglas before insert on analisis for each row execute function analisis_reglas();

create table folio_contador (
  anio    smallint primary key check (anio between 2000 and 2999),
  ultimo  integer not null check (ultimo >= 1)
);
comment on table folio_contador is 'Último consecutivo de folio emitido por año. Se incrementa en la misma transacción del informe (siguiente_folio): sin huecos y nunca reutilizado.';
comment on column folio_contador.anio is 'Año del folio.';
comment on column folio_contador.ultimo is 'Último número emitido.';

create or replace function siguiente_folio(p_anio smallint) returns text language sql as $$
  insert into folio_contador as f (anio, ultimo) values (p_anio, 1)
  on conflict (anio) do update set ultimo = f.ultimo + 1
  returning 'INF-' || p_anio || '-' || lpad(ultimo::text, 4, '0')
$$;
comment on function siguiente_folio(smallint) is 'El folio siguiente del año (INF-AAAA-NNNN): bloquea la fila del año hasta el fin de la transacción, así dos exportaciones a la vez no comparten folio y un rollback no deja hueco.';

create table informe (
  folio           text primary key check (folio ~ '^INF-[0-9]{4}-[0-9]{4,}$'),
  anio            smallint not null,
  numero          integer not null check (numero >= 1),
  formato         text not null check (formato in ('pdf', 'csv')),
  titulo          text not null,
  alcance         text not null,
  periodo         text not null,
  desde           timestamptz not null,
  hasta           timestamptz not null,
  equipo          text,
  equipo_campo    text,
  fecha           timestamptz not null default now(),
  por             text not null,
  por_id          text not null references usuario(id),
  version         integer not null references version_config(version),
  estado          text not null check (estado in ('publicable', 'provisional', 'bloqueado')),
  cifras          jsonb not null check (jsonb_typeof(cifras) = 'object'),
  forma_canonica  text not null,
  huella          text not null check (huella ~ '^[0-9a-f]{64}$'),
  unique (anio, numero),
  check (folio = 'INF-' || anio || '-' || lpad(numero::text, 4, '0')),
  check (anio = extract(year from fecha at time zone 'America/Bogota')),
  check (hasta > desde),
  check ((equipo is null) = (equipo_campo is null)),
  foreign key (equipo_campo, equipo) references activo(campo_id, codigo)
);
comment on table informe is 'Informe exportado con folio y huella (Informe de src/entities/informe.ts). POST /api/informes (evidencia:exportar) registra la CONSULTA; el servidor calcula las cifras con su libro y su versión vigente, la forma canónica y la huella SHA-256. GET /api/informes, /api/informes/:folio y /:folio/verificacion. Solo inserción.';
comment on column informe.folio is 'INF-AAAA-NNNN, consecutivo por año y nunca reutilizado (siguiente_folio).';
comment on column informe.anio is 'Año del folio: el de la fecha de exportación en hora de Colombia (CHECK). El consecutivo vuelve a 1 cada año (folio_contador).';
comment on column informe.numero is 'Consecutivo del año.';
comment on column informe.formato is 'pdf o csv.';
comment on column informe.titulo is 'Rótulo del papel.';
comment on column informe.alcance is 'Rótulo del papel (La Ceiba).';
comment on column informe.periodo is 'Rótulo del papel (septiembre de 2026).';
comment on column informe.desde is 'Inicio del período de las cifras.';
comment on column informe.hasta is 'Fin del período (no incluido).';
comment on column informe.equipo is 'Solo en la ficha de un equipo: cuál.';
comment on column informe.equipo_campo is 'Campo del equipo de la ficha.';
comment on column informe.fecha is 'Hora del servidor.';
comment on column informe.por is '«Nombre · rol».';
comment on column informe.por_id is 'Persona.';
comment on column informe.version is 'Versión de la configuración con que se calcularon las cifras.';
comment on column informe.estado is 'publicable, provisional (único motivo en-curso) o bloqueado (estadoDelLibro).';
comment on column informe.cifras is 'CifrasInforme: campos, desde, hasta, version, real, potencial, noProducido, diferido, tolerancia, metaProduccion, metaDiferido, eventos (y equipo, campoEquipo, bblEquipo en una ficha), redondeadas a dos decimales.';
comment on column informe.forma_canonica is 'El texto exacto que se hashea (formaCanonica): clave=valor por línea, LF, sin salto final, UTF-8.';
comment on column informe.huella is 'SHA-256 de la forma canónica, hexadecimal minúscula.';

create table informe_campo (
  folio     text not null references informe(folio),
  campo_id  text not null references campo(id),
  primary key (folio, campo_id)
);
comment on table informe_campo is 'Campos del informe (ConsultaInforme.campos). GET /api/informes/:folio exige que TODOS sean de la persona. Solo inserción.';
comment on column informe_campo.folio is 'Informe.';
comment on column informe_campo.campo_id is 'Campo.';

create trigger informe_solo_insercion before update or delete on informe for each row execute function solo_insercion();
create trigger informe_sin_truncate before truncate on informe for each statement execute function solo_insercion();
create trigger informe_campo_solo_insercion before update or delete on informe_campo for each row execute function solo_insercion();
create trigger respuesta_parada_solo_insercion before update or delete on respuesta_parada for each row execute function solo_insercion();
create trigger respuesta_parada_sin_truncate before truncate on respuesta_parada for each statement execute function solo_insercion();
create trigger respuesta_entrante_solo_insercion before update or delete on respuesta_entrante for each row execute function solo_insercion();
create trigger analisis_solo_insercion before update or delete on analisis for each row execute function solo_insercion();
create trigger informe_campo_sin_truncate before truncate on informe_campo for each statement execute function solo_insercion();
create trigger respuesta_entrante_sin_truncate before truncate on respuesta_entrante for each statement execute function solo_insercion();
create trigger analisis_sin_truncate before truncate on analisis for each statement execute function solo_insercion();

create table mensaje (
  id             text primary key,
  regla          text not null check (regla in ('parada', 'cierre', 'causa', 'parte', 'orden')),
  plantilla      text not null references plantilla_whatsapp(clave),
  parametros     jsonb not null check (jsonb_typeof(parametros) = 'object'),
  campo_id       text not null,
  equipo         text not null,
  para_id        text not null references usuario(id),
  telefono       text not null check (telefono ~ '^\+[0-9]{8,15}$'),
  hora           timestamptz not null,
  texto          text,
  no_enviado     text,
  opciones       jsonb check (jsonb_typeof(opciones) = 'array'),
  evento_id      text references evento(id),
  prediccion_id  text references prediccion(id),
  orden          text references orden_sap(numero),
  insistencia    text check (insistencia in ('recordatorio', 'escalamiento')),
  meta_id        text unique,
  foreign key (campo_id, equipo) references activo(campo_id, codigo),
  check ((texto is null) <> (no_enviado is null)),
  check (no_enviado is null or meta_id is null),
  check ((regla = 'parte') = (prediccion_id is not null)),
  check ((regla = 'orden') = (orden is not null)),
  check (regla not in ('parada', 'cierre', 'causa') or evento_id is not null),
  check (insistencia is null or regla = 'causa')
);
comment on table mensaje is 'Registro de lo que TRIM manda por WhatsApp (Mensaje de src/entities/mensajes.ts). GET /api/mensajes. Se guarda al intentar enviar y no se reescribe: el que salió trae texto (exactamente la plantilla con sus parámetros) y el que no se pudo armar trae no_enviado (el motivo). Cada mensaje se arma con la versión de la configuración que regía a su hora. Solo inserción, salvo poner una vez el id de Meta.';
comment on column mensaje.id is 'Id del mensaje (lo pone el servidor).';
comment on column mensaje.regla is 'parada, cierre, causa, parte u orden.';
comment on column mensaje.plantilla is 'Plantilla aprobada con que salió.';
comment on column mensaje.parametros is 'Parámetros de la plantilla {nombre: texto}: ninguno vacío ni con saltos de línea.';
comment on column mensaje.campo_id is 'Campo.';
comment on column mensaje.equipo is 'Equipo o pozo del que habla.';
comment on column mensaje.para_id is 'Persona que lo recibe.';
comment on column mensaje.telefono is 'Número E.164 al que se mandó (el de la persona en ese momento).';
comment on column mensaje.hora is 'Hora del envío.';
comment on column mensaje.texto is 'Lo que se envió (cuerpo de la plantilla con sus parámetros). NULL si no se envió.';
comment on column mensaje.no_enviado is 'Por qué no se pudo enviar (un parámetro vacío o de varias líneas que Meta rechazaría). No cuenta como avisado.';
comment on column mensaje.opciones is 'Opciones numeradas de una pregunta: [{clave, texto, parte?, porque?, fuente?, veces?, total?}] (Opcion). La respuesta por WhatsApp escoge una clave de ESTE mensaje.';
comment on column mensaje.evento_id is 'Evento del PLC del que habla (parada, cierre, pregunta). En el JSON viaja como evento.';
comment on column mensaje.prediccion_id is 'Con regla parte: la predicción del vigía. En el JSON viaja también como evento.';
comment on column mensaje.orden is 'Con regla orden: la orden de SAP liberada.';
comment on column mensaje.insistencia is 'recordatorio (30 min) o escalamiento (2 h) de una pregunta sin respuesta.';
comment on column mensaje.meta_id is 'Id de Meta del mensaje saliente (wamid). El webhook resuelve el evento con el context.id que lo cita.';

create or replace function mensaje_solo_meta_id() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' or old.meta_id is not null
     or (to_jsonb(new) - 'meta_id') is distinct from (to_jsonb(old) - 'meta_id') then
    raise exception 'el registro de mensajes no se reescribe (%)', old.id using errcode = '23001';
  end if;
  return new;
end $$;
comment on function mensaje_solo_meta_id() is 'Trigger de mensaje: solo inserción; lo único que se permite es poner el id de Meta una vez, cuando la Cloud API lo devuelve.';
create trigger mensaje_solo_meta_id before update or delete on mensaje for each row execute function mensaje_solo_meta_id();
create trigger mensaje_sin_truncate before truncate on mensaje for each statement execute function solo_insercion();

-- Lo que TRIM contesta dentro de la ventana de 24 h que abre la respuesta de la
-- persona: no es plantilla (Meta lo permite libre) y no va en el registro de
-- GET /api/mensajes, pero tiene id de Meta (el siguiente context.id lo cita y
-- los statuses[] lo nombran) y guarda el paso del diálogo: la parte y el modo
-- ya escogidos y las opciones numeradas que ofrece.
create table mensaje_libre (
  id                bigint generated always as identity primary key,
  entrante_meta_id  text not null references respuesta_entrante(meta_id),
  tipo              text not null check (tipo in ('pide-parte', 'pide-modo', 'pide-causa', 'pide-texto', 'registrada', 'ya-respondida', 'rechazo')),
  telefono          text not null check (telefono ~ '^\+[0-9]{8,15}$'),
  usuario_id        text references usuario(id),
  evento_id         text references evento(id),
  familia           text,
  parte             text,
  modo              text references modo_falla(codigo),
  opciones          jsonb check (jsonb_typeof(opciones) = 'array' and jsonb_array_length(opciones) > 0),
  texto             text not null check (btrim(texto) <> ''),
  hora              timestamptz not null default now(),
  meta_id           text unique,
  no_enviado        text,
  foreign key (familia, parte) references parte(familia, id),
  check ((familia is null) = (parte is null)),
  check (modo is null or parte is not null),
  check (tipo not in ('pide-parte', 'pide-modo', 'pide-causa', 'pide-texto') or (usuario_id is not null and evento_id is not null)),
  check ((tipo in ('pide-parte', 'pide-modo', 'pide-causa')) = (opciones is not null)),
  check (tipo <> 'pide-modo' or (parte is not null and modo is null)),
  check (no_enviado is null or meta_id is null)
);
comment on table mensaje_libre is 'Mensajes libres que TRIM manda dentro de la ventana de 24 h que abre la respuesta de la persona (CONTRATO.md, «WhatsApp» y «El webhook»; 5D.5): «¿Qué vio en {parte}?», «¿Qué parte?», «¿Qué fue?», «Escriba qué encontró», «Registrado…», «Ya respondió…» y los rechazos («Ese número no recibe las alertas de este campo…»). No son plantillas y no salen en GET /api/mensajes. Guardan el estado del diálogo: la siguiente respuesta cita su meta_id (context.id) y de aquí salen el evento, la parte y el modo ya escogidos y las opciones válidas; la respuesta_parada se inserta solo con el último paso. Solo inserción, salvo poner una vez el id de Meta.';
comment on column mensaje_libre.id is 'Consecutivo del servidor.';
comment on column mensaje_libre.entrante_meta_id is 'Mensaje entrante al que contesta (abre la ventana de 24 h de Meta).';
comment on column mensaje_libre.tipo is 'pide-parte (tras «Otra parte del equipo»), pide-modo (tras escoger una parte), pide-causa (tras «No fue la electrosumergible»), pide-texto (tras «0» o el modo «otro»), registrada, ya-respondida (la primera ganó) o rechazo (número sin alertas del campo, opción inválida, texto corto…).';
comment on column mensaje_libre.telefono is 'Número E.164 al que se mandó (el from del entrante).';
comment on column mensaje_libre.usuario_id is 'Persona resuelta por el número. NULL en un rechazo a un número que no es de nadie.';
comment on column mensaje_libre.evento_id is 'Parada del diálogo (la que resolvió el context.id del entrante). Obligatoria en los pide-*.';
comment on column mensaje_libre.familia is 'Familia de la parte ya escogida.';
comment on column mensaje_libre.parte is 'Parte ya escogida en un paso anterior (obligatoria en pide-modo; en pide-texto tras el modo «otro»).';
comment on column mensaje_libre.modo is 'Modo ya escogido (OTH en el pide-texto que sigue al modo «otro»).';
comment on column mensaje_libre.opciones is 'Opciones numeradas que ofrece, con la forma de Opcion ([{clave, texto, parte?}…]): la clave de la respuesta siguiente se busca aquí. Solo en pide-parte, pide-modo y pide-causa.';
comment on column mensaje_libre.texto is 'Lo que se mandó, exacto («TRIM · ¿Qué vio en sello mecánico? Responda con un número.⏎1) …»).';
comment on column mensaje_libre.hora is 'Hora del envío (dentro de las 24 h del entrante: lo revisa el servidor).';
comment on column mensaje_libre.meta_id is 'Id de Meta del mensaje (wamid), puesto una vez cuando la Cloud API lo devuelve. Lo cita el context.id de la respuesta siguiente y los statuses[] de entrega.';
comment on column mensaje_libre.no_enviado is 'Si la Cloud API lo rechazó: el motivo (entonces no hay meta_id).';
create trigger mensaje_libre_solo_meta_id before update or delete on mensaje_libre for each row execute function mensaje_solo_meta_id();
create trigger mensaje_libre_sin_truncate before truncate on mensaje_libre for each statement execute function solo_insercion();
create index mensaje_libre_por_entrante on mensaje_libre (entrante_meta_id);

create table estado_mensaje (
  meta_id  text not null,
  estado   text not null check (estado in ('sent', 'delivered', 'read', 'failed')),
  cuando   timestamptz not null,
  error    text,
  primary key (meta_id, estado, cuando),
  check ((estado = 'failed') = (error is not null))
);
comment on table estado_mensaje is 'Estados de entrega que Meta informa por el webhook (statuses[]): enviado, entregado, leído o fallido, de una plantilla (mensaje) o de un mensaje libre del diálogo (mensaje_libre). Se agregan; el mensaje no se toca. Solo inserción.';
comment on column estado_mensaje.meta_id is 'Mensaje saliente: mensaje.meta_id o mensaje_libre.meta_id (trigger estado_mensaje_de_saliente en vez de FK, porque puede ser de cualquiera de las dos).';
comment on column estado_mensaje.estado is 'sent, delivered, read o failed.';
comment on column estado_mensaje.cuando is 'Hora que informa Meta.';
comment on column estado_mensaje.error is 'Con failed: el error de Meta.';
create trigger estado_mensaje_solo_insercion before update or delete on estado_mensaje for each row execute function solo_insercion();
create trigger estado_mensaje_sin_truncate before truncate on estado_mensaje for each statement execute function solo_insercion();
create or replace function estado_mensaje_de_saliente() returns trigger language plpgsql as $$
begin
  if not exists (select 1 from mensaje where meta_id = new.meta_id) and not exists (select 1 from mensaje_libre where meta_id = new.meta_id) then
    raise exception 'el estado % es de un mensaje saliente que TRIM no registró (%)', new.estado, new.meta_id using errcode = '23503';
  end if;
  return new;
end $$;
comment on function estado_mensaje_de_saliente() is 'Trigger de estado_mensaje: el id de Meta es de un mensaje o de un mensaje libre que TRIM guardó (hace de clave foránea hacia las dos tablas).';
create trigger estado_mensaje_de_saliente before insert on estado_mensaje for each row execute function estado_mensaje_de_saliente();

create table carga_asignacion (
  id      bigint generated always as identity primary key,
  fecha   timestamptz not null default now(),
  por     text not null,
  por_id  text not null references usuario(id),
  motivo  text not null check (alcanza(motivo, 5))
);
comment on table carga_asignacion is 'Una carga de la asignación oficial (CargaAsignacion de src/entities/asignacion.ts): quién la subió, cuándo y por qué. POST /api/asignacion-oficial (asignacion:cargar), todo o nada. Solo inserción: un reemplazo no borra el rastro.';
comment on column carga_asignacion.id is 'Consecutivo del servidor.';
comment on column carga_asignacion.fecha is 'Hora del servidor al aceptarla.';
comment on column carga_asignacion.por is '«Nombre · rol» (del token).';
comment on column carga_asignacion.por_id is 'Persona.';
comment on column carga_asignacion.motivo is 'Motivo: 5 caracteres o más.';

create table carga_asignacion_grupo (
  carga_id      bigint not null references carga_asignacion(id),
  mes           date not null check (extract(day from mes) = 1),
  campo_id      text not null references campo(id),
  pozos         integer not null check (pozos >= 1),
  reemplazados  integer not null check (reemplazados >= 0),
  primary key (carga_id, mes, campo_id)
);
comment on table carga_asignacion_grupo is 'Cada (mes, campo) que trajo una carga (CargaAsignacion.grupos): cuántos pozos entraron y cuántos tenía la carga que reemplazó (0 si no había).';
comment on column carga_asignacion_grupo.carga_id is 'Carga.';
comment on column carga_asignacion_grupo.mes is 'Mes cerrado (día 1).';
comment on column carga_asignacion_grupo.campo_id is 'Campo (tiene que ser de la persona: 403).';
comment on column carga_asignacion_grupo.pozos is 'Pozos que entraron.';
comment on column carga_asignacion_grupo.reemplazados is 'Pozos de la carga anterior de ese (mes, campo).';

create table asignacion_oficial (
  carga_id  bigint not null,
  mes       date not null,
  campo_id  text not null,
  pozo      text not null check (btrim(pozo) <> ''),
  bbl       numeric not null check (bbl >= 0 and bbl <> 'Infinity'),
  horas     numeric check (horas >= 0 and horas <= 24 * extract(day from (mes + interval '1 month' - interval '1 day'))),
  primary key (carga_id, mes, campo_id, pozo),
  foreign key (carga_id, mes, campo_id) references carga_asignacion_grupo(carga_id, mes, campo_id)
);
comment on table asignacion_oficial is 'Filas de la asignación oficial que reportó la operadora, pozo por pozo (FilaCargada de src/entities/asignacion.ts), con la carga que las trajo. Lo que rige en un (mes, campo) son las filas de su carga más reciente (v_asignacion_oficial); las anteriores quedan como rastro. Sin FK a pozo: un pozo que TRIM no tiene se muestra como dato inválido, no se rechaza.';
comment on column asignacion_oficial.carga_id is 'Carga que la trajo (FilaCargada.carga).';
comment on column asignacion_oficial.mes is 'Mes cerrado (día 1).';
comment on column asignacion_oficial.campo_id is 'Campo.';
comment on column asignacion_oficial.pozo is 'Pozo como lo escribió la operadora (en mayúsculas).';
comment on column asignacion_oficial.bbl is 'Crudo asignado en el mes, bbl (0 o más).';
comment on column asignacion_oficial.horas is 'Horas produciendo que reportó (opcional): 0 a días del mes × 24.';

create table cambio_planta (
  id              bigint generated always as identity primary key,
  fecha           timestamptz not null default now(),
  por             text not null,
  por_id          text not null references usuario(id),
  campo_id        text not null references campo(id),
  cambio          text not null,
  operacion       jsonb not null check (operacion ->> 'tipo' in ('agregar-miembro', 'quitar-miembro', 'agregar-elemento', 'quitar-elemento')),
  planta_despues  jsonb not null
);
comment on table cambio_planta is 'Historial del esquema de planta (CambioPlanta de src/entities/planta.ts). POST /api/planta/cambios manda la operación (CambioDePlanta) y el servidor la aplica con aplicarCambioPlanta sobre su planta; GET /api/planta/cambios. Solo inserción.';
comment on column cambio_planta.id is 'Consecutivo.';
comment on column cambio_planta.fecha is 'Hora del servidor.';
comment on column cambio_planta.por is '«Nombre · rol».';
comment on column cambio_planta.por_id is 'Persona (conector:configurar).';
comment on column cambio_planta.campo_id is 'Campo.';
comment on column cambio_planta.cambio is 'Cómo se lee (agregó LC-22 · ESP (LC-22) a pozos).';
comment on column cambio_planta.operacion is 'La operación tal como llegó.';
comment on column cambio_planta.planta_despues is 'La PlantaCampo completa después del cambio: con ella se reconstruye la planta de cualquier fecha.';

create trigger carga_asignacion_solo_insercion before update or delete on carga_asignacion for each row execute function solo_insercion();
create trigger carga_asignacion_sin_truncate before truncate on carga_asignacion for each statement execute function solo_insercion();
create trigger carga_asignacion_grupo_solo_insercion before update or delete on carga_asignacion_grupo for each row execute function solo_insercion();
create trigger asignacion_oficial_solo_insercion before update or delete on asignacion_oficial for each row execute function solo_insercion();
create trigger cambio_planta_solo_insercion before update or delete on cambio_planta for each row execute function solo_insercion();
create trigger cambio_planta_sin_truncate before truncate on cambio_planta for each statement execute function solo_insercion();
create trigger carga_asignacion_grupo_sin_truncate before truncate on carga_asignacion_grupo for each statement execute function solo_insercion();
create trigger asignacion_oficial_sin_truncate before truncate on asignacion_oficial for each statement execute function solo_insercion();

create index mensaje_por_campo on mensaje (campo_id, hora desc);
create index mensaje_por_evento on mensaje (evento_id) where evento_id is not null;
create index prediccion_por_campo on prediccion (campo_id, emitida);
create index informe_campo_por_campo on informe_campo (campo_id);
create index respuesta_entrante_contexto on respuesta_entrante (contexto_meta_id);
create index asignacion_oficial_mes on asignacion_oficial (mes, campo_id);

-- ═══════════════════════════════════════════════════════════════════════════
--  (i) PRECÁLCULO DE MESES CERRADOS
--  Caché verificable del motor: solo meses cerrados (ya empezó el siguiente) y
--  publicados por el campo (mes_fiscal.publicado). Las cifras de barriles de un
--  mes así no cambian; lo que una respuesta tardía puede cambiar es la
--  clasificación (pendiente → declarada), y entonces se recalcula el mes
--  entero, se borra lo viejo y se escribe recalculo_mes. Ninguna fila se
--  actualiza en sitio.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function precalculo_no_se_actualiza() returns trigger language plpgsql as $$
begin
  raise exception 'el precálculo de % no se actualiza en sitio: se recalcula el mes (borrar e insertar) y se anota en recalculo_mes', tg_table_name
    using errcode = '23001';
end $$;
comment on function precalculo_no_se_actualiza() is 'Trigger del precálculo: un mes calculado no se corrige fila por fila.';

create table factor_asignacion_mes (
  campo_id           text not null,
  mes                date not null,
  real               numeric not null check (real >= 0),
  teorico            numeric not null check (teorico >= 0),
  dias_con_dato      smallint not null check (dias_con_dato between 0 and 31),
  dias_sin_dato      smallint not null check (dias_sin_dato between 0 and 31),
  fa                 double precision check (fa > 0),
  banda              numeric not null check (banda > 0 and banda < 1),
  banda_verificable  boolean not null,
  dentro             boolean,
  version_config     integer not null references version_config(version),
  calculado          timestamptz not null default now(),
  primary key (campo_id, mes),
  foreign key (campo_id, mes) references mes_fiscal(campo_id, mes),
  check ((fa is null) = (dias_con_dato = 0 or teorico = 0)),
  check ((fa is null) = (dentro is null))
);
comment on table factor_asignacion_mes is 'Factor de asignación de un campo en un mes cerrado: FA = R/T con solo los días con dato fiscal (FilaFA de src/entities/libro.ts, más R y T). Va en Libro.fa y en el panel de medición oficial.';
comment on column factor_asignacion_mes.campo_id is 'Campo.';
comment on column factor_asignacion_mes.mes is 'Mes (día 1).';
comment on column factor_asignacion_mes.real is 'R: Σ del fiscal de los días con dato, bbl.';
comment on column factor_asignacion_mes.teorico is 'T: Σ días con dato Σ pozos con prueba de crudo de la prueba × (horas del día − horas perdidas)/24, bbl.';
comment on column factor_asignacion_mes.dias_con_dato is 'Días con dato del computador de flujo.';
comment on column factor_asignacion_mes.dias_sin_dato is 'Días sin dato (no entran; el libro no se publica).';
comment on column factor_asignacion_mes.fa is 'R/T. NULL si el mes no tiene un solo día con dato (sin-factor).';
comment on column factor_asignacion_mes.banda is 'Tolerancia de asignación del campo (mitad del ancho de la fila de la Fig. 10.2, o la demostrada).';
comment on column factor_asignacion_mes.banda_verificable is 'Hubo con qué escoger la fila (°API y producción publicada).';
comment on column factor_asignacion_mes.dentro is '|FA − 1| ≤ banda. NULL sin FA.';
comment on column factor_asignacion_mes.version_config is 'Versión de la configuración con que se calculó.';
comment on column factor_asignacion_mes.calculado is 'Cuándo se calculó.';

create table libro_mes (
  campo_id            text not null,
  mes                 date not null,
  real                numeric not null,
  potencial           numeric not null,
  brecha              numeric not null,
  diferido            numeric not null,
  residuo             numeric not null,
  tolerancia          numeric not null check (tolerancia >= 0),
  aproximado          numeric not null check (aproximado >= 0),
  identificado        numeric not null,
  declarado           numeric not null,
  pendiente           numeric not null,
  planeado            numeric not null,
  no_planeado         numeric not null,
  alto_impacto        numeric not null,
  anticipable         numeric not null,
  sin_instrumento     numeric not null,
  sin_parte           numeric not null,
  evitable_por_orden  numeric not null,
  pe                  double precision,
  meta_produccion     numeric not null,
  meta_diferido       numeric not null,
  sin_meta            boolean not null,
  valor_usd           numeric,
  sin_precio          boolean not null,
  dias_sin_fiscal     date[] not null default '{}',
  sin_factor          boolean not null,
  publicable          boolean not null,
  motivos             jsonb not null check (jsonb_typeof(motivos) = 'array'),
  por_tipo            jsonb not null check (jsonb_typeof(por_tipo) = 'array'),
  por_equipo          jsonb not null check (jsonb_typeof(por_equipo) = 'array'),
  por_parte           jsonb not null check (jsonb_typeof(por_parte) = 'array'),
  custodia            jsonb not null check (jsonb_typeof(custodia) = 'object'),
  eventos             integer not null check (eventos >= 0),
  huella_cifras       text not null check (huella_cifras ~ '^[0-9a-f]{64}$'),
  version_config      integer not null references version_config(version),
  calculado           timestamptz not null default now(),
  primary key (campo_id, mes),
  foreign key (campo_id, mes) references mes_fiscal(campo_id, mes),
  check (publicable = (jsonb_array_length(motivos) = 0))
);
comment on table libro_mes is 'El libro de un campo en un mes cerrado y publicado (Libro de src/entities/libro.ts sin tramos, porPozo, preguntas ni custodia detallada; la fila de GET /api/vistas/diferidos/mensual). El portafolio se arma sumando barriles por campo (tolerancia en cuadratura entre campos; pe y tasas recalculados). huella_cifras = SHA-256 de la forma canónica de informe.ts para ese campo y mes: si un recálculo la cambia, cambiaron los insumos.';
comment on column libro_mes.campo_id is 'Campo.';
comment on column libro_mes.mes is 'Mes (día 1).';
comment on column libro_mes.real is 'Producción real: Σ fiscal de los días con dato, bbl.';
comment on column libro_mes.potencial is 'Σ pozos con prueba de crudo × FA × horas/24 de los días con dato, bbl.';
comment on column libro_mes.brecha is 'Potencial − real (no producido), bbl.';
comment on column libro_mes.diferido is 'Σ de los tramos (barriles diferidos), bbl. En un mes entero = brecha.';
comment on column libro_mes.residuo is 'Brecha − diferido (≈0 en un mes entero).';
comment on column libro_mes.tolerancia is 'Tolerancia del diferido, bbl (Σ bbl×banda en línea y reloj del PLC en cuadratura).';
comment on column libro_mes.aproximado is 'Barriles por frecuencia reducida (ley de afinidad), fuera de la tolerancia.';
comment on column libro_mes.identificado is 'Diferido identificado por señal, firma o programa.';
comment on column libro_mes.declarado is 'Diferido declarado por un operario.';
comment on column libro_mes.pendiente is 'Diferido sin identificar.';
comment on column libro_mes.planeado is 'Diferido programado.';
comment on column libro_mes.no_planeado is 'Diferido no programado.';
comment on column libro_mes.alto_impacto is 'Diferido de reinyección + electrosumergibles.';
comment on column libro_mes.anticipable is 'Alto impacto con parte identificada y variable instrumentada que la anuncia o la daña.';
comment on column libro_mes.sin_instrumento is 'Alto impacto con parte pero sin instrumento que la vigile.';
comment on column libro_mes.sin_parte is 'Alto impacto sin parte identificada.';
comment on column libro_mes.evitable_por_orden is 'Lo que se habría perdido de menos cerrando primero los pozos con menos crudo por barril de agua.';
comment on column libro_mes.pe is 'Real/potencial × 100. NULL sin potencial.';
comment on column libro_mes.meta_produccion is 'Meta de producción del mes (tramos firmados × horas/24), bbl.';
comment on column libro_mes.meta_diferido is 'Máximo de diferido del mes, bbl.';
comment on column libro_mes.sin_meta is 'Algún día del mes sin tramo firmado: la meta no es comparable.';
comment on column libro_mes.valor_usd is 'Σ (potencial − real) del día × precio de ese día, solo días con dato y con precio. NULL si ningún día tuvo precio.';
comment on column libro_mes.sin_precio is 'Algún día del mes sin precio neto.';
comment on column libro_mes.dias_sin_fiscal is 'Días sin dato del computador de flujo (Libro.sinFiscal).';
comment on column libro_mes.sin_factor is 'El mes no tiene FA (Libro.sinFactor).';
comment on column libro_mes.publicable is 'Sin motivos: el libro se puede publicar.';
comment on column libro_mes.motivos is 'MotivoLibro[]: {codigo, texto, campoId?, mes?} (en-curso, sin-fiscal, sin-factor, banda-sin-verificar, fa-fuera-de-banda, sin-causa, sin-meta).';
comment on column libro_mes.por_tipo is 'Libro.porTipo: [{tipo, bbl}].';
comment on column libro_mes.por_equipo is 'Libro.porEquipo: FilaEquipo[].';
comment on column libro_mes.por_parte is 'Libro.porParte: FilaParte[].';
comment on column libro_mes.custodia is 'Libro.custodia por clave: {sinPrueba:[campo/pozo], estimados:[campo/pozo], bswLaboratorio:[campo]}.';
comment on column libro_mes.eventos is 'Tramos evento × pozo del mes (cifra eventos de la huella).';
comment on column libro_mes.huella_cifras is 'SHA-256 de la forma canónica de las cifras del campo y mes.';
comment on column libro_mes.version_config is 'Versión con que se calculó (las metas, el precio y el programa de un mes cerrado son iguales en todas las versiones posteriores: son inmutables hacia atrás).';
comment on column libro_mes.calculado is 'Cuándo se calculó.';

create table tramo_diferido (
  evento_id         text not null references evento_pozo(id),
  dia               date not null,
  campo_id          text not null,
  mes               date generated always as (date_trunc('month', dia::timestamp)::date) stored,
  pozo              text not null,
  inicio            timestamptz not null,
  fin               timestamptz not null,
  horas             numeric not null check (horas > 0 and horas <= 24),
  factor            numeric not null check (factor >= 0 and factor <= 1),
  crudo_prueba_bpd  numeric not null check (crudo_prueba_bpd >= 0),
  fa                double precision,
  bbl               numeric not null check (bbl >= 0),
  aproximado        boolean not null,
  sin_custodia      boolean not null,
  sin_factor        boolean not null,
  sesgo             numeric not null,
  causa_tipo        text not null check (causa_tipo in ('reinyeccion', 'transporte', 'electrosumergible', 'levantamiento', 'energia', 'aire', 'compresion', 'evacuacion', 'proceso', 'tratamiento', 'programada', 'declarada', 'pendiente')),
  causa_equipo      text not null,
  causa_familia     text,
  causa_parte       text,
  causa_como        text not null check (causa_como in ('senal', 'firma', 'programa', 'declarado', 'ninguno')),
  causa_evento_id   text references evento(id),
  version_config    integer not null references version_config(version),
  calculado         timestamptz not null default now(),
  primary key (evento_id, dia),
  foreign key (campo_id, mes) references mes_fiscal(campo_id, mes),
  foreign key (campo_id, pozo) references pozo(campo_id, id),
  foreign key (causa_familia, causa_parte) references parte(familia, id),
  check (fin > inicio),
  check ((fa is null) = sin_factor),
  check ((causa_familia is null) = (causa_parte is null))
);
comment on table tramo_diferido is 'Lo que costó un evento de pozo, partido por día (un Tramo de src/entities/libro.ts recortado a cada día: cambian la prueba vigente y el FA). Sumar los días de un período da sus tramos (aditividad). Solo meses cerrados y publicados; el mes en curso se calcula en vivo.';
comment on column tramo_diferido.evento_id is 'Evento de pozo que cobra (Tramo.evento).';
comment on column tramo_diferido.dia is 'Día del campo.';
comment on column tramo_diferido.campo_id is 'Campo.';
comment on column tramo_diferido.mes is 'Mes del día (calculado).';
comment on column tramo_diferido.pozo is 'Pozo.';
comment on column tramo_diferido.inicio is 'Inicio dentro del día de lo que el evento cobra (ya normalizados los eventos que se pisan).';
comment on column tramo_diferido.fin is 'Fin dentro del día.';
comment on column tramo_diferido.horas is 'Horas cobradas en el día.';
comment on column tramo_diferido.factor is 'Fracción del caudal perdida: 1 apagado; 1 − hz/hz_prueba con frecuencia reducida.';
comment on column tramo_diferido.crudo_prueba_bpd is 'Crudo de la prueba vigente ese día, bbl/d.';
comment on column tramo_diferido.fa is 'Factor de asignación del mes. NULL = sin factor (no suma barriles).';
comment on column tramo_diferido.bbl is 'crudo × FA × horas × factor / 24.';
comment on column tramo_diferido.aproximado is 'Frecuencia reducida (ley de afinidad): fuera de la tolerancia.';
comment on column tramo_diferido.sin_custodia is 'El pozo no tiene prueba.';
comment on column tramo_diferido.sin_factor is 'El mes no tiene FA.';
comment on column tramo_diferido.sesgo is 'Banda de asignación del campo (componente de la tolerancia, igual en todos los pozos).';
comment on column tramo_diferido.causa_tipo is 'TipoCausa.';
comment on column tramo_diferido.causa_equipo is 'A quién se le cargan los barriles.';
comment on column tramo_diferido.causa_familia is 'Familia de la parte.';
comment on column tramo_diferido.causa_parte is 'Parte identificada.';
comment on column tramo_diferido.causa_como is 'senal, firma, programa, declarado o ninguno.';
comment on column tramo_diferido.causa_evento_id is 'Evento que la produjo (la parada de bomba o la caída de servicio), o el propio.';
comment on column tramo_diferido.version_config is 'Versión de la configuración usada.';
comment on column tramo_diferido.calculado is 'Cuándo se calculó.';

create table asignacion_pozo_mes (
  campo_id   text not null,
  mes        date not null,
  pozo       text not null,
  horas      numeric not null check (horas >= 0),
  potencial  numeric not null check (potencial >= 0),
  diferido   numeric not null check (diferido >= 0),
  asignado   numeric not null,
  calculado  timestamptz not null default now(),
  primary key (campo_id, mes, pozo),
  foreign key (campo_id, mes) references mes_fiscal(campo_id, mes),
  foreign key (campo_id, pozo) references pozo(campo_id, id)
);
comment on table asignacion_pozo_mes is 'Lo que TRIM asigna a cada pozo en un mes cerrado (AsignacionPozo de src/entities/libro.ts): lo real del PMO repartido por prueba × FA × horas abierto. GET /api/vistas/asignacion?campo&mes; se coteja con la oficial. Σ asignado = real del campo.';
comment on column asignacion_pozo_mes.campo_id is 'Campo.';
comment on column asignacion_pozo_mes.mes is 'Mes (día 1).';
comment on column asignacion_pozo_mes.pozo is 'Pozo con prueba.';
comment on column asignacion_pozo_mes.horas is 'Horas produciendo según el PLC (las de frecuencia reducida cuentan).';
comment on column asignacion_pozo_mes.potencial is 'Prueba × FA × horas del mes, bbl.';
comment on column asignacion_pozo_mes.diferido is 'Σ de sus tramos, bbl.';
comment on column asignacion_pozo_mes.asignado is '(potencial − diferido) × real/Σ(potencial − diferido): incluye su parte del inventario.';
comment on column asignacion_pozo_mes.calculado is 'Cuándo se calculó.';

create table recalculo_mes (
  id              bigint generated always as identity primary key,
  campo_id        text not null references campo(id),
  mes             date not null check (extract(day from mes) = 1),
  cuando          timestamptz not null default now(),
  motivo          text not null check (alcanza(motivo, 5)),
  huella_antes    text check (huella_antes ~ '^[0-9a-f]{64}$'),
  huella_despues  text not null check (huella_despues ~ '^[0-9a-f]{64}$')
);
comment on table recalculo_mes is 'Bitácora del precálculo: cada vez que se (re)calcula un mes de un campo, por qué y si cambiaron las cifras protegidas (huella). Una huella distinta en un mes publicado es un incidente: cambiaron los insumos. Solo inserción.';
comment on column recalculo_mes.id is 'Consecutivo.';
comment on column recalculo_mes.campo_id is 'Campo.';
comment on column recalculo_mes.mes is 'Mes.';
comment on column recalculo_mes.cuando is 'Hora del recálculo.';
comment on column recalculo_mes.motivo is 'Por qué (primer cálculo al publicarse el mes, respuesta tardía a EV-…, corrección del historiador…).';
comment on column recalculo_mes.huella_antes is 'Huella de las cifras antes (NULL en el primer cálculo).';
comment on column recalculo_mes.huella_despues is 'Huella después.';

create trigger factor_asignacion_mes_sin_update before update on factor_asignacion_mes for each row execute function precalculo_no_se_actualiza();
create trigger libro_mes_sin_update before update on libro_mes for each row execute function precalculo_no_se_actualiza();
create trigger tramo_diferido_sin_update before update on tramo_diferido for each row execute function precalculo_no_se_actualiza();
create trigger asignacion_pozo_mes_sin_update before update on asignacion_pozo_mes for each row execute function precalculo_no_se_actualiza();
create trigger recalculo_mes_solo_insercion before update or delete on recalculo_mes for each row execute function solo_insercion();
create trigger recalculo_mes_sin_truncate before truncate on recalculo_mes for each statement execute function solo_insercion();
create index tramo_diferido_por_campo on tramo_diferido (campo_id, dia);
create index tramo_diferido_por_causa on tramo_diferido (campo_id, causa_equipo, dia);
create index tramo_diferido_por_evento_causa on tramo_diferido (causa_evento_id) where causa_evento_id is not null;

-- ═══════════════════════════════════════════════════════════════════════════
--  VISTAS: lo que la API lee armado
-- ═══════════════════════════════════════════════════════════════════════════

-- La procedencia de un tag: la cadena no se escribe, se consulta.
create view v_procedencia as
select
  t.id                 as tag_id,
  t.nombre             as tag,
  t.tipo               as tipo,
  t.unidad             as unidad,
  t.limite_texto       as limite_texto,
  t.limite_bajo        as limite_bajo,
  t.limite_alto        as limite_alto,
  t.cadencia_s         as cadencia_s,
  t.clase              as clase_tag,
  t.origen_mapeo       as origen_mapeo,
  t.campo_id           as campo_id,
  f.protocolo          as protocolo,
  f.endpoint           as endpoint,
  f.modo               as modo,
  d.reloj              as reloj,
  d.nombre             as dispositivo,
  g.id                 as gateway_id,
  g.modelo             as gateway_modelo,
  g.serie              as gateway_serie,
  g.firmware           as gateway_firmware,
  g.enlace             as enlace,
  g.buffer_h           as buffer_h,
  g.ultimo_visto       as ultimo_visto,
  t.equipo_codigo      as equipo_codigo,
  coalesce(e.nombre, case when a.clase = 'pozo' then 'Pozo ' || a.codigo end) as equipo,
  coalesce(e.clase_iso, case when a.clase = 'pozo' and p.levantamiento = 'electrosumergible' then 'bomba-electrosumergible' end) as clase_equipo,
  e.criticidad         as criticidad,
  c.formula_id         as formula_id,
  fo.expresion         as formula,
  c.formula_version    as formula_version,
  fo.ventana_min       as ventana_min,
  ca.vigente_hasta     as calibracion_hasta,
  ca.detalle           as calibracion_detalle,
  al.alta              as alarma_alta,
  al.baja              as alarma_baja,
  al.fuente            as alarma_fuente
from tag t
join dispositivo d   on d.id = t.dispositivo_id
join fuente f        on f.id = d.fuente_id
join gateway g       on g.id = d.gateway_id
left join activo a   on a.campo_id = t.campo_id and a.codigo = t.equipo_codigo
left join equipo e   on e.campo_id = a.campo_id and e.codigo = a.codigo
left join pozo p     on p.campo_id = a.campo_id and p.id = a.codigo
left join calculo c  on c.tag_id = t.id
left join formula fo on fo.id = c.formula_id and fo.version = c.formula_version
left join calibracion ca on ca.tag_id = t.id
left join lateral (select x.alta, x.baja, x.fuente from alarma_tag x where x.tag_id = t.id and x.vigente_desde <= now()
                   order by x.vigente_desde desc limit 1) al on true;
comment on view v_procedencia is 'GET /api/campos/:campo/tags/:tag/procedencia: instrumento, lectura, calculo, custodia y (solo con conector:configurar) tecnico. Las frases las escribe el front (cadena.ts). 404 tag-no-registrado si no hay fila.';

-- El límite de cada tag (LimiteTag): banda normal del registro + alarma vigente.
create view v_limite_tag as
select t.campo_id, t.nombre as tag, t.equipo_codigo as equipo, coalesce(t.limite_texto, '—') as texto,
       t.limite_bajo as normal_baja, t.limite_alto as normal_alta,
       al.alta as alarma_alta, al.baja as alarma_baja, al.fuente as alarma_fuente, al.firmada_por as alarma_firmada_por
from tag t
left join lateral (select x.alta, x.baja, x.fuente, x.firmada_por from alarma_tag x where x.tag_id = t.id and x.vigente_desde <= now()
                   order by x.vigente_desde desc limit 1) al on true
where t.equipo_codigo is not null;
comment on view v_limite_tag is 'catalogo.campos[c].limites (LimiteTag de src/entities/limites.ts): la única fuente de la banda normal (registro de tags) y de la alarma (base maestra). normal con null del lado abierto; sin alarma, el vigía dice «sin límite».';

-- La producción fiscal de un mes como la pide el motor (ProduccionMes).
create view v_produccion_mes as
select m.campo_id, to_char(m.mes, 'YYYY-MM') as mes, m.publicado,
       array(select d.bbl from generate_series(m.mes, least((m.mes + interval '1 month' - interval '1 day')::date,
                                                         (now() at time zone 'America/Bogota')::date), interval '1 day') as g(dia)
             left join produccion_fiscal_diaria d on d.campo_id = m.campo_id and d.dia = g.dia::date
             order by g.dia) as dias
from mes_fiscal m;
comment on view v_produccion_mes is 'ProduccionMes por campo y mes: dias[] con NULL donde no hay dato del computador de flujo (nunca 0), hasta el día de hoy en el mes en curso. Base de GET /api/campos/:campo/produccion-diaria.';

-- El calendario: un mes está publicado si todos los campos con fiscal lo publicaron.
create view v_calendario as
select to_char(mes, 'YYYY-MM') as mes, inicio_mes_co(mes) as desde,
       least(inicio_mes_co((mes + interval '1 month')::date), now()) as hasta,
       bool_and(publicado) as publicado
from mes_fiscal group by mes;
comment on view v_calendario is 'catalogo.calendario (Mes de src/entities/libro.ts): desde y hasta del mes (el de hoy termina ahora) y publicado en TODOS los campos con fiscal.';

create view v_analisis_vigente as
select distinct on (evento_id) * from analisis order by evento_id, version desc;
comment on view v_analisis_vigente is 'GET /api/analisis → vigentes: la última versión de cada evento. Las demás son anteriores.';

create view v_asignacion_oficial as
select a.mes, a.campo_id, a.pozo, a.bbl, a.horas, a.carga_id
from asignacion_oficial a
where a.carga_id = (select max(g.carga_id) from carga_asignacion_grupo g where g.mes = a.mes and g.campo_id = a.campo_id);
comment on view v_asignacion_oficial is 'GET /api/asignacion-oficial → filas (FilaCargada): lo que rige en cada (mes, campo) = las filas de su carga más reciente.';

create view v_orden_sap as
select o.numero, c.clase, o.clase_sap, o.campo_id, o.equipo, o.descripcion, o.estado, o.prioridad, o.creada, o.liberada,
       o.cierre_tecnico, o.tecnico_id as tecnico, o.puesto, o.aviso, o.horas_reales, o.evento_id as evento,
       coalesce((select jsonb_agg(jsonb_build_object('material', r.material, 'descripcion', r.descripcion, 'cantidad', r.cantidad) order by r.material)
                 from repuesto_orden r where r.orden = o.numero), '[]'::jsonb) as repuestos
from orden_sap o join clase_orden_sap c on c.clase_sap = o.clase_sap;
comment on view v_orden_sap is 'GET /api/sap/ordenes (OrdenSap): la clase de TRIM mapeada y los repuestos de la orden.';

create view v_usuario as
select u.*, case when u.todos_los_campos then null else array(select c.campo_id from usuario_campo c where c.usuario_id = u.id order by c.campo_id) end as campos
from usuario u;
comment on view v_usuario is 'Usuario con campos: NULL = "todos", si no la lista. La forma mínima (PersonaVisible) la recorta la API según quién pregunta.';

create view v_capacidades_rol as
select rc.rol_id, rc.capacidad_id from rol_capacidad rc
union
select rc.rol_id, c.incluye from rol_capacidad rc join capacidad c on c.id = rc.capacidad_id where c.incluye is not null;
comment on view v_capacidades_rol is 'Capacidades efectivas de cada rol, con lo que cada una incluye (puedeHacer de tipos.ts): las de GET /api/sesion.';
