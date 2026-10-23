-- Pruebas de las restricciones del esquema, contra la base con ejemplos.sql cargado.
-- Cada prueba corre en una subtransacción que se deshace: la base queda igual.
--   muerde(nombre, sentencia, sqlstate): la sentencia TIENE que fallar con ese SQLSTATE;
--     si pasa, o falla con otro, la prueba aborta todo (ON_ERROR_STOP).
--   pasa(nombre, sentencia): la sentencia TIENE que pasar (y se deshace).
-- SQLSTATE: 23505 único · 23514 check/trigger · 23503 clave foránea · 23001 solo inserción.
set search_path = trim, public;
\pset tuples_only on
\pset format unaligned

create function pg_temp.muerde(nombre text, sentencia text, esperado text) returns void language plpgsql as $$
begin
  begin
    execute sentencia;
  exception when others then
    if sqlstate = esperado then
      raise notice 'MUERDE  %  [%] %', nombre, sqlstate, sqlerrm;
      return;
    end if;
    raise exception 'FALLA  %: esperaba SQLSTATE % y llegó [%] %', nombre, esperado, sqlstate, sqlerrm;
  end;
  raise exception 'FALLA  %: la sentencia pasó y tenía que rechazarse', nombre;
end $$;

create function pg_temp.pasa(nombre text, sentencia text) returns void language plpgsql as $$
begin
  begin
    execute sentencia;
    raise exception using errcode = 'TR001', message = 'deshacer';
  exception when sqlstate 'TR001' then
    raise notice 'PASA    %', nombre;
  end;
end $$;

-- ── Las cinco que pidió el documento
select pg_temp.muerde('segunda respuesta al mismo evento (la primera gana)',
  $$insert into respuesta_parada (evento_id, texto, por, hora) values ('EP-LC06-260814-04', 'Otra persona dice otra cosa distinta', 'Jairo Peña · operador', now())$$, '23505');
select pg_temp.muerde('segundo aviso abierto del mismo equipo (K-101 de La Ceiba)',
  $$insert into aviso_sap (numero, tipo, campo_id, equipo, descripcion, prioridad, parada, creado, creado_por, origen)
    values ('99999999', 'M1', 'ceiba', 'K-101', 'Presión de cabezal del aire cayendo', 2, false, now(), 'Nelson Ortiz · desde TRIM', 'trim')$$, '23505');
select pg_temp.muerde('UPDATE a version_config', $$update version_config set motivo = 'Cambio el motivo de la firma' where version = 1$$, '23001');
select pg_temp.muerde('teléfono repetido de un no suspendido',
  $$insert into usuario (id, nombre, correo, rol_id, estado, desde, telefono, alertas) values ('u9', 'Lucía Prada', 'lucia.prada@operadora.example', 'sup', 'invitado', '2026-10-02', '+573005550103', true)$$, '23505');
select pg_temp.muerde('tanque con alto-alto 0,99',
  $$insert into tanque (version, id, orden, nombre, campo_id, bomba, capacidad_bbl, alto_alto, tag_nivel, aforo) values (1, 'TK-PRUEBA', 9, 'Tanque de prueba', 'ceiba', 'P-201B', 30000, 0.99, 'LT-2012', 'Certificado')$$, '23514');

-- ── Configuración firmada
select pg_temp.muerde('DELETE a version_config', $$delete from version_config where version = 1$$, '23001');
select pg_temp.muerde('TRUNCATE a version_config', $$truncate version_config cascade$$, '23001');
select pg_temp.muerde('UPDATE a un tramo firmado', $$update tramo_meta set produccion_bpd = 1 where version = 1 and campo_id = 'ceiba'$$, '23001');
select pg_temp.muerde('dos firmas sobre la misma base (409 version-cambio)',
  $s$do $x$ begin
      insert into version_config (version, base, fecha, por_id, por, motivo, cambios, config) select 2, 1, now(), 'adm', por, 'Primera firma sobre la 1', '{x}', config from version_config where version = 1;
      insert into version_config (version, base, fecha, por_id, por, motivo, cambios, config) select 2, 1, now(), 'ger', por, 'Segunda firma sobre la 1', '{x}', config from version_config where version = 1;
    end $x$ $s$, '23505');
select pg_temp.muerde('versión que no es base + 1',
  $$insert into version_config (version, base, fecha, por_id, por, motivo, cambios, config) select 3, 1, now(), 'adm', por, 'Firma con base vieja', '{x}', config from version_config where version = 1$$, '23514');
select pg_temp.muerde('JSON firmado sin su forma normalizada (trigger diferido)',
  $s$do $x$ begin
      insert into version_config (version, base, fecha, por_id, por, motivo, cambios, config) select 2, 1, now(), 'adm', por, 'Firma sin normalizar', '{x}', config from version_config where version = 1;
      set constraints all immediate;
    end $x$ $s$, '23514');
select pg_temp.muerde('campo con perfil y sin ningún tramo',
  $s$do $x$ begin
      insert into version_config (version, base, fecha, por_id, por, motivo, cambios, config) values (2, 1, now(), 'adm', 'Hermes Leal · administrador', 'Campo sin meta', '{x}',
        '{"empresa":"Operadora de demostración","campos":{"ceiba":{"metas":[],"perfil":{"gas":"venta","bombas":true,"electrosumergibles":true}}},"tanques":[],"respaldos":[],"programa":[]}');
      insert into membrete values (2, 'Operadora de demostración');
      insert into perfil_campo values (2, 'ceiba', 'venta', true, true);
      set constraints all immediate;
    end $x$ $s$, '23514');
select pg_temp.pasa('una versión nueva coherente (JSON = normalizado)',
  $s$do $x$ begin
      insert into version_config (version, base, fecha, por_id, por, motivo, cambios, config) values (2, 1, now(), 'ger', 'Andrés Vélez · gerente de activo', 'Meta de noviembre', '{"La Ceiba, desde el 1 nov 2026: producción 11.200 bbl/d"}',
        '{"empresa":"Operadora de demostración","campos":{"ceiba":{"metas":[{"desde":"2025-10-01","produccionBpd":10900,"diferidoMaxBpd":800,"netbackUsd":48,"criterioSinCausa":2},{"desde":"2026-11-01","produccionBpd":11200,"diferidoMaxBpd":700,"netbackUsd":null,"criterioSinCausa":2}],"perfil":{"gas":"venta","bombas":true,"electrosumergibles":true}}},"tanques":[],"respaldos":[],"programa":[{"id":"PR-ceiba-P-201B-2026-11-04","campoId":"ceiba","equipo":"P-201B","desde":"2026-11-04T06:00:00-05:00","hasta":"2026-11-04T18:00:00-05:00","motivo":"Cambio de sello programado"}]}');
      insert into membrete values (2, 'Operadora de demostración');
      insert into perfil_campo values (2, 'ceiba', 'venta', true, true);
      insert into tramo_meta values (2, 'ceiba', '2025-10-01', 10900, 800, 48, 2), (2, 'ceiba', '2026-11-01', 11200, 700, null, 2);
      insert into parada_programada values (2, 'PR-ceiba-P-201B-2026-11-04', 0, 'ceiba', 'P-201B', '2026-11-04T06:00:00-05:00', '2026-11-04T18:00:00-05:00', 'Cambio de sello programado');
      set constraints all immediate;
    end $x$ $s$);
select pg_temp.muerde('precio de 501 USD/bbl', $$insert into tramo_meta values (1, 'ceiba', '2026-12-01', 10900, 800, 501, 2)$$, '23514');
select pg_temp.muerde('máximo sin causa de 21 %', $$insert into tramo_meta values (1, 'ceiba', '2026-12-01', 10900, 800, 48, 21)$$, '23514');
select pg_temp.muerde('meta de producción 0', $$insert into tramo_meta values (1, 'ceiba', '2026-12-01', 0, 800, 48, 2)$$, '23514');
select pg_temp.muerde('producción NaN', $$insert into tramo_meta values (1, 'ceiba', '2026-12-01', 'NaN', 800, 48, 2)$$, '23514');
select pg_temp.muerde('dos tanques para la misma bomba',
  $$insert into tanque (version, id, orden, nombre, campo_id, bomba, capacidad_bbl, alto_alto, tag_nivel, aforo) values (1, 'TK-OTRO', 9, 'Otro', 'ceiba', 'P-201B', 5000, 0.9, 'LT-2099', 'Certificado')$$, '23505');
select pg_temp.muerde('parada programada que termina antes de empezar',
  $$insert into parada_programada values (1, 'PR-X', 99, 'ceiba', 'P-201B', '2026-11-04T18:00:00-05:00', '2026-11-04T06:00:00-05:00', 'Cambio de sello')$$, '23514');
select pg_temp.muerde('motivo de 4 caracteres', $$insert into parada_programada values (1, 'PR-Y', 98, 'ceiba', 'P-201B', '2026-11-04T06:00:00-05:00', '2026-11-04T18:00:00-05:00', ' ok ')$$, '23514');

-- ── Personas
select pg_temp.muerde('correo repetido (otras mayúsculas)',
  $$insert into usuario (id, nombre, correo, rol_id, estado, desde, alertas) values ('u9', 'Otra Persona', 'NELSON.ORTIZ@operadora.example', 'sup', 'invitado', '2026-10-02', false)$$, '23505');
select pg_temp.pasa('el mismo WhatsApp en una persona suspendida',
  $s$do $x$ begin
      insert into usuario (id, nombre, correo, rol_id, estado, desde, telefono, alertas, antes_de_suspender) values ('u9', 'Lucía Prada', 'lucia.prada@operadora.example', 'sup', 'suspendido', '2026-10-02', '+573005550103', false, 'invitado');
      insert into usuario_campo values ('u9', 'ceiba');
      set constraints all immediate;
    end $x$ $s$);
select pg_temp.muerde('teléfono que no es E.164', $$update usuario set telefono = '300 555 0103' where id = 'sup'$$, '23514');
select pg_temp.muerde('alertas en un rol sin alertas (gerente)', $$update usuario set alertas = true where id = 'ger'$$, '23514');
select pg_temp.muerde('borrar a una persona', $$delete from usuario where id = 'tec'$$, '23001');
select pg_temp.muerde('suspender al único gerente activo',
  $s$do $x$ begin update usuario set estado = 'suspendido', antes_de_suspender = 'activo' where id = 'ger'; set constraints all immediate; end $x$ $s$, '23514');
select pg_temp.muerde('persona sin ningún campo',
  $s$do $x$ begin delete from usuario_campo where usuario_id = 'sup'; set constraints all immediate; end $x$ $s$, '23514');
select pg_temp.muerde('cambio_acceso no se borra',
  $s$do $x$ begin
      insert into cambio_acceso (por_id, por, usuario_id, usuario, cambios, motivo) values ('ger', 'Andrés Vélez · gerente de activo', 'sup', 'Nelson Ortiz', '{"alertas apagadas"}', 'Vacaciones');
      delete from cambio_acceso;
    end $x$ $s$, '23001');

-- ── Respuestas, análisis, avisos
select pg_temp.muerde('respuesta sin parte con texto de 7 caracteres',
  $$insert into respuesta_parada (evento_id, texto, por, por_id, hora, canal) values ('EP-LC21-261001-01', 'se paró', 'Jairo Peña · operador', 'oper', now(), 'pantalla')$$, '23514');
select pg_temp.muerde('modo que no es de la parte (VIB en el sello)',
  $$insert into respuesta_parada (evento_id, texto, por, por_id, hora, familia, parte, modo, canal) values ('EV-2011-1002', 'Vibraba', 'Jairo Peña · operador', 'oper', now(), 'inyeccion', 'sello', 'VIB', 'pantalla')$$, '23514');
select pg_temp.pasa('respuesta con parte y modo del catálogo',
  $$insert into respuesta_parada (evento_id, texto, por, por_id, hora, familia, parte, modo, canal) values ('EV-2011-1002', 'Sello con fuga por el lado de acople; se cambió', 'Jairo Peña · operador', 'oper', now(), 'inyeccion', 'sello', 'ELP', 'pantalla')$$);
select pg_temp.muerde('respuesta por WhatsApp sin su mensaje entrante',
  $$insert into respuesta_parada (evento_id, texto, por, por_id, hora, familia, parte, modo, canal) values ('EV-2011-1002', 'Sello con fuga', 'Jairo Peña · operador', 'oper', now(), 'inyeccion', 'sello', 'ELP', 'whatsapp')$$, '23514');
select pg_temp.muerde('respuesta a una caída de servicio',
  $$insert into respuesta_parada (evento_id, texto, por, por_id, hora, canal) values ('SV-K-101-260804', 'El compresor se disparó por temperatura', 'Jairo Peña · operador', 'oper', now(), 'pantalla')$$, '23514');
select pg_temp.muerde('análisis de una respuesta sin parte',
  $$insert into analisis (evento_id, version, mecanismo, causa_raiz, por, por_id) values ('EP-LC06-260814-04', 1, '1.1', '3', 'Edwin Maestre · confiabilidad', 'conf')$$, '23514');
select pg_temp.muerde('análisis que salta una versión',
  $s$do $x$ begin
      insert into respuesta_parada (evento_id, texto, por, por_id, hora, familia, parte, modo, canal) values ('EV-2011-1002', 'Sello con fuga por el lado de acople', 'Jairo Peña · operador', 'oper', now(), 'inyeccion', 'sello', 'ELP', 'pantalla');
      insert into analisis (evento_id, version, mecanismo, causa_raiz, por, por_id) values ('EV-2011-1002', 2, '1.1', '3', 'Edwin Maestre · confiabilidad', 'conf');
    end $x$ $s$, '23514');
select pg_temp.muerde('mecanismo que no es de la Table B.2',
  $s$do $x$ begin
      insert into respuesta_parada (evento_id, texto, por, por_id, hora, familia, parte, modo, canal) values ('EV-2011-1002', 'Sello con fuga por el lado de acople', 'Jairo Peña · operador', 'oper', now(), 'inyeccion', 'sello', 'ELP', 'pantalla');
      insert into analisis (evento_id, version, mecanismo, causa_raiz, por, por_id) values ('EV-2011-1002', 1, '9.9', '3', 'Edwin Maestre · confiabilidad', 'conf');
    end $x$ $s$, '23503');
select pg_temp.muerde('aviso desde TRIM con descripción de 7 caracteres',
  $$insert into aviso_sap (numero, tipo, campo_id, equipo, descripcion, prioridad, parada, creado, creado_por, creado_por_id, origen) values ('99999998', 'M2', 'ceiba', 'P-201B', 'parada.', 1, true, now(), 'Nelson Ortiz · desde TRIM', 'sup', 'trim')$$, '23514');
select pg_temp.pasa('un aviso abierto de otro equipo del mismo campo',
  $$insert into aviso_sap (numero, tipo, campo_id, equipo, descripcion, prioridad, parada, creado, creado_por, creado_por_id, origen) values ('99999997', 'M2', 'ceiba', 'P-201B', 'Sello mecánico: fuga por el lado de acople', 1, true, now(), 'Nelson Ortiz · desde TRIM', 'sup', 'trim')$$);

-- ── Informe, mensajes, asignación, planta, predicciones
select pg_temp.pasa('folios consecutivos por año',
  $s$do $x$ declare a text; b text; begin
      a := siguiente_folio(2026::smallint); b := siguiente_folio(2026::smallint);
      if a <> 'INF-2026-0001' or b <> 'INF-2026-0002' then raise exception 'folios % y %', a, b; end if;
    end $x$ $s$);
select pg_temp.muerde('UPDATE a un informe',
  $s$do $x$ declare f text := siguiente_folio(2026::smallint); begin
      insert into informe (folio, anio, numero, formato, titulo, alcance, periodo, desde, hasta, fecha, por, por_id, version, estado, cifras, forma_canonica, huella)
      values (f, 2026, 1, 'pdf', 'Diferidos', 'La Ceiba', 'septiembre de 2026', '2026-09-01T00:00:00-05:00', '2026-10-01T00:00:00-05:00', '2026-10-02T14:00:00-05:00', 'Andrés Vélez · gerente de activo', 'ger', 1,
              'publicable', '{}', 'campos=ceiba', (select huella_cifras from libro_mes where campo_id = 'ceiba' and mes = '2026-09-01'));
      update informe set estado = 'bloqueado' where folio = f;
    end $x$ $s$, '23001');
select pg_temp.muerde('folio que no es INF-AAAA-NNNN',
  $$insert into informe (folio, anio, numero, formato, titulo, alcance, periodo, desde, hasta, por, por_id, version, estado, cifras, forma_canonica, huella)
    values ('INF-2026-7', 2026, 7, 'pdf', 'Diferidos', 'La Ceiba', 'sep', '2026-09-01', '2026-10-01', 'x', 'ger', 1, 'publicable', '{}', 'x', repeat('a', 64))$$, '23514');
select pg_temp.muerde('reescribir el texto de un mensaje enviado', $$update mensaje set texto = 'otro texto' where id = (select min(id) from mensaje)$$, '23001');
select pg_temp.pasa('poner el id de Meta una vez', $$update mensaje set meta_id = 'wamid.HBgMNTczMDA1NTUwMTA0FQIAERgSQ0E' where id = (select min(id) from mensaje)$$);
select pg_temp.muerde('cambiar el id de Meta ya puesto',
  $s$do $x$ begin
      update mensaje set meta_id = 'wamid.A' where id = (select min(id) from mensaje);
      update mensaje set meta_id = 'wamid.B' where id = (select min(id) from mensaje);
    end $x$ $s$, '23001');
select pg_temp.muerde('mensaje con texto y no_enviado a la vez',
  $$insert into mensaje (id, regla, plantilla, parametros, campo_id, equipo, para_id, telefono, hora, texto, no_enviado, evento_id)
    values ('m-x', 'parada', 'parada', '{}', 'ceiba', 'P-201B', 'sup', '+573005550103', now(), 'TRIM · …', 'parámetro vacío', 'EV-2011-1002')$$, '23514');
select pg_temp.muerde('la segunda entrega del mismo mensaje entrante (Meta reintenta)',
  $s$do $x$ begin
      insert into respuesta_entrante (meta_id, de_telefono, resultado, motivo, payload) values ('wamid.ENTRANTE', '+573005550104', 'descartada', 'sin contexto', '{}');
      insert into respuesta_entrante (meta_id, de_telefono, resultado, motivo, payload) values ('wamid.ENTRANTE', '+573005550104', 'descartada', 'sin contexto', '{}');
    end $x$ $s$, '23505');
select pg_temp.muerde('carga de asignación: no se borra',
  $s$do $x$ declare c bigint; begin
      insert into carga_asignacion (por, por_id, motivo) values ('Marcela Ríos · ingeniera de producción', 'prod', 'Asignación oficial de septiembre') returning id into c;
      insert into carga_asignacion_grupo values (c, '2026-09-01', 'ceiba', 1, 0);
      insert into asignacion_oficial values (c, '2026-09-01', 'ceiba', 'LC-11', 28088.18, 635.35);
      delete from asignacion_oficial where carga_id = c;
    end $x$ $s$, '23001');
select pg_temp.muerde('asignación con más horas que el mes (721 en septiembre)',
  $s$do $x$ declare c bigint; begin
      insert into carga_asignacion (por, por_id, motivo) values ('Marcela Ríos · ingeniera de producción', 'prod', 'Asignación oficial de septiembre') returning id into c;
      insert into carga_asignacion_grupo values (c, '2026-09-01', 'ceiba', 1, 0);
      insert into asignacion_oficial values (c, '2026-09-01', 'ceiba', 'LC-11', 28088.18, 721);
    end $x$ $s$, '23514');
select pg_temp.muerde('cambio de planta: no se reescribe',
  $s$do $x$ declare c bigint; begin
      insert into cambio_planta (por, por_id, campo_id, cambio, operacion, planta_despues) values ('Hermes Leal · administrador', 'adm', 'ceiba', 'quitó tea del tren gas', '{"tipo":"quitar-elemento","tren":"gas","id":"tea"}', '{}') returning id into c;
      update cambio_planta set cambio = 'otro' where id = c;
    end $x$ $s$, '23001');
select pg_temp.muerde('id de planta repetido entre elemento y miembro',
  $$insert into planta_elemento (campo_id, id, tren, orden, simbolo, etiqueta) values ('ceiba', 'LC-14', 'agua', 9, 'bomba', 'Repetido')$$, '23505');
select pg_temp.muerde('recalificar una predicción ya calificada', $$update prediccion set calificacion = 'falsa-alarma', falla_evento_id = null, falla_inicio = null where calificacion = 'acierto'$$, '23001');
select pg_temp.muerde('acierto sin la falla que lo confirma', $$update prediccion set calificacion = 'acierto', calificada = now() where calificacion = 'seguimiento'$$, '23514');

-- ── Verificación V4: diálogo de WhatsApp, SAP, folio por año y TRUNCATE
select pg_temp.pasa('diálogo por WhatsApp: escoge la parte, TRIM pide el modo, responde y entra la respuesta',
  $s$do $x$ declare m bigint; begin
      update mensaje set meta_id = 'wamid.PREGUNTA' where id = 'causa-EV-2011-1002--oper-2026-10-02T08:53:18.000Z';
      insert into respuesta_entrante (meta_id, de_telefono, contexto_meta_id, opcion, resultado, usuario_id, evento_id, payload)
        values ('wamid.E1', '+573005550104', 'wamid.PREGUNTA', '1', 'en-curso', 'oper', 'EV-2011-1002', '{}');
      insert into mensaje_libre (entrante_meta_id, tipo, telefono, usuario_id, evento_id, familia, parte, opciones, texto)
        values ('wamid.E1', 'pide-modo', '+573005550104', 'oper', 'EV-2011-1002', 'inyeccion', 'sello',
                '[{"clave":"1","texto":"Fuga externa de producto"},{"clave":"2","texto":"Fuga interna"},{"clave":"3","texto":"Otro"}]',
                'TRIM · ¿Qué vio en sello mecánico? Responda con un número.') returning id into m;
      update mensaje_libre set meta_id = 'wamid.QUEVIO' where id = m;
      insert into estado_mensaje (meta_id, estado, cuando) values ('wamid.QUEVIO', 'delivered', now());
      insert into respuesta_entrante (meta_id, de_telefono, contexto_meta_id, opcion, resultado, usuario_id, evento_id, payload)
        values ('wamid.E2', '+573005550104', 'wamid.QUEVIO', '1', 'aceptada', 'oper', 'EV-2011-1002', '{}');
      insert into respuesta_parada (evento_id, texto, por, por_id, hora, familia, parte, modo, canal, entrante_meta_id)
        values ('EV-2011-1002', 'Sello mecánico: fuga externa de producto', 'Jairo Peña · operador de campo', 'oper', now(), 'inyeccion', 'sello', 'ELP', 'whatsapp', 'wamid.E2');
    end $x$ $s$);
select pg_temp.muerde('pedir el modo sin la parte ya escogida',
  $s$do $x$ begin
      insert into respuesta_entrante (meta_id, de_telefono, opcion, resultado, usuario_id, evento_id, payload) values ('wamid.E3', '+573005550104', '1', 'en-curso', 'oper', 'EV-2011-1002', '{}');
      insert into mensaje_libre (entrante_meta_id, tipo, telefono, usuario_id, evento_id, opciones, texto)
        values ('wamid.E3', 'pide-modo', '+573005550104', 'oper', 'EV-2011-1002', '[{"clave":"1","texto":"Fuga externa de producto"}]', 'TRIM · ¿Qué vio? Responda con un número.');
    end $x$ $s$, '23514');
select pg_temp.muerde('reescribir un mensaje libre ya enviado',
  $s$do $x$ declare m bigint; begin
      insert into respuesta_entrante (meta_id, de_telefono, resultado, motivo, payload) values ('wamid.E4', '+573009999999', 'descartada', 'número no registrado', '{}');
      insert into mensaje_libre (entrante_meta_id, tipo, telefono, texto) values ('wamid.E4', 'rechazo', '+573009999999', 'TRIM · Ese número no recibe las alertas de este campo: la respuesta no entra.') returning id into m;
      update mensaje_libre set texto = 'otro texto' where id = m;
    end $x$ $s$, '23001');
select pg_temp.muerde('estado de entrega de un saliente que TRIM no registró',
  $$insert into estado_mensaje (meta_id, estado, cuando) values ('wamid.NADIE', 'sent', now())$$, '23503');
select pg_temp.muerde('orden de SAP con un técnico que no está en el registro',
  $$insert into orden_sap (numero, clase_sap, campo_id, equipo, descripcion, estado, prioridad, creada, tecnico_id, puesto) values ('49999999', 'PM01', 'ceiba', 'P-201B', 'Revisar sello', 'CRTD', 2, now(), 'nadie', 'MEC-CEIBA')$$, '23503');
select pg_temp.muerde('segunda orden del mismo aviso (AvisoSap.orden es una)',
  $$insert into orden_sap (numero, clase_sap, campo_id, equipo, descripcion, estado, prioridad, creada, puesto, aviso) values ('49999998', 'PM03', 'ceiba', 'K-101', 'Otra orden para el mismo aviso', 'CRTD', 2, now(), 'MEC-CEIBA', '10004146')$$, '23505');
select pg_temp.muerde('folio de un año que no es el de su fecha (INF-2026 exportado el 1 de enero de 2027)',
  $$insert into informe (folio, anio, numero, formato, titulo, alcance, periodo, desde, hasta, fecha, por, por_id, version, estado, cifras, forma_canonica, huella)
    values ('INF-2026-0099', 2026, 99, 'pdf', 'Diferidos', 'La Ceiba', 'diciembre de 2026', '2026-12-01T00:00:00-05:00', '2027-01-01T00:00:00-05:00', '2027-01-01T00:30:00-05:00', 'x', 'ger', 1, 'publicable', '{}', 'x', repeat('a', 64))$$, '23514');
select pg_temp.muerde('TRUNCATE a un tramo firmado', $$truncate tramo_meta$$, '23001');
select pg_temp.muerde('TRUNCATE a los eventos del PLC', $$truncate evento cascade$$, '23001');
select pg_temp.muerde('TRUNCATE a las personas', $$truncate usuario cascade$$, '23001');
select pg_temp.muerde('TRUNCATE a la asignación oficial', $$truncate asignacion_oficial$$, '23001');

-- ── Eventos del borde y cadena de datos
select pg_temp.muerde('cambiar la hora de inicio de un evento del PLC', $$update evento_pozo set inicio = inicio + interval '1 minute' where id = 'EP-LC21-261001-01'$$, '23001');
select pg_temp.pasa('cerrar un evento abierto', $$update evento_pozo set fin = '2026-10-02T15:00:00-05:00' where id = 'EP-LC21-261001-01'$$);
select pg_temp.muerde('volver a cerrar un evento cerrado', $$update evento_pozo set fin = fin + interval '1 hour' where id = 'EP-LC06-260814-04'$$, '23001');
select pg_temp.muerde('borrar un evento del PLC', $$delete from evento_pozo where id = 'EP-LC06-260814-04'$$, '23001');
select pg_temp.muerde('evento con fin antes del inicio',
  $s$do $x$ begin
      insert into evento values ('EP-X', 'ceiba', 'pozo', 'LC-14', now());
      insert into evento_pozo (id, campo_id, pozo, inicio, fin, codigo, senal) values ('EP-X', 'ceiba', 'LC-14', '2026-10-02T10:00:00-05:00', '2026-10-02T09:00:00-05:00', 'CMD', 'VSD-LC14 · código CMD');
    end $x$ $s$, '23514');
select pg_temp.muerde('evento de pozo con un id que ya es de una bomba',
  $$insert into evento_pozo (id, campo_id, pozo, inicio, codigo, senal) values ('EV-2011-1002', 'ceiba', 'LC-14', now(), 'CMD', 'VSD-LC14 · código CMD')$$, '23503');
select pg_temp.muerde('hz en un código que no es HZ',
  $s$do $x$ begin
      insert into evento values ('EP-Y', 'ceiba', 'pozo', 'LC-14', now());
      insert into evento_pozo (id, campo_id, pozo, inicio, codigo, senal, hz) values ('EP-Y', 'ceiba', 'LC-14', now(), 'CMD', 'VSD-LC14 · código CMD', 45);
    end $x$ $s$, '23514');
select pg_temp.pasa('poner la firma de una parada una vez', $$update parada_bomba set firma_parte = 'sello', firma_familia = 'inyeccion', firma_tag = 'PI-2010', firma_texto = 'succión cayendo al parar' where id = 'EV-2011-1002'$$);
select pg_temp.muerde('cambiar la firma ya puesta',
  $s$do $x$ begin
      update parada_bomba set firma_parte = 'sello', firma_familia = 'inyeccion', firma_texto = 'succión cayendo al parar' where id = 'EV-2011-1002';
      update parada_bomba set firma_parte = 'rodamientos', firma_texto = 'otra' where id = 'EV-2011-1002';
    end $x$ $s$, '23001');
select pg_temp.muerde('cambiar la pérdida de una parada registrada', $$update parada_bomba set perdida = 0.5 where id = 'EV-2011-1002'$$, '23001');
select pg_temp.muerde('parada con pérdida de 1,2 de la capacidad',
  $s$do $x$ begin
      insert into evento values ('EV-X', 'ceiba', 'bomba', 'P-201B', now());
      insert into parada_bomba (id, campo_id, equipo, inicio, perdida, senal) values ('EV-X', 'ceiba', 'P-201B', now(), 1.2, 'ZS-2011 · marcha → paro');
    end $x$ $s$, '23514');
select pg_temp.muerde('tag de un campo distinto al de su gateway',
  $$insert into tag (campo_id, nombre, dispositivo_id, tipo) values ('morichal', 'XX-9999', (select dispositivo_id from tag where campo_id = 'ceiba' and nombre = 'VI-2011'), 'Vibración')$$, '23503');
select pg_temp.muerde('tag repetido en su campo',
  $$insert into tag (campo_id, nombre, dispositivo_id, tipo) values ('ceiba', 'VI-2011', (select dispositivo_id from tag where campo_id = 'ceiba' and nombre = 'VI-2011'), 'Vibración')$$, '23505');
select pg_temp.muerde('un nacimiento no deshace un mapeo manual',
  $s$do $x$ begin
      update tag set equipo_codigo = 'P-201B', origen_mapeo = 'manual' where campo_id = 'ceiba' and nombre = 'XI-1017';
      update tag set equipo_codigo = null, origen_mapeo = 'pendiente' where campo_id = 'ceiba' and nombre = 'XI-1017';
    end $x$ $s$, '23514');
select pg_temp.muerde('otro gateway declara un tag ajeno',
  $$update tag set dispositivo_id = (select d.id from dispositivo d where d.gateway_id = 'EPIC-CEIBA-02' limit 1) where campo_id = 'ceiba' and nombre = 'VI-2011'$$, '23514');
select pg_temp.muerde('tag pendiente con equipo', $$update tag set origen_mapeo = 'pendiente' where campo_id = 'ceiba' and nombre = 'VI-2011'$$, '23514');
select pg_temp.muerde('cambiar una versión vieja de la banda normal', $s$do $x$ begin insert into historial_tag (tag_id, reemplazado, gateway_id, limite_texto) values ((select id from tag where campo_id = 'ceiba' and nombre = 'VI-2011'), now(), 'EPIC-CEIBA-01', '< 4,5'); delete from historial_tag; end $x$ $s$, '23001');
select pg_temp.muerde('lectura sin valor y con calidad buena',
  $$insert into lectura (tag_id, instante, valor, calidad) values ((select id from tag where campo_id = 'ceiba' and nombre = 'VI-2011'), '2026-10-02T14:00:00-05:00', null, 'buena')$$, '23514');
select pg_temp.pasa('lectura sin valor marcada mala (dato inválido)',
  $$insert into lectura (tag_id, instante, valor, calidad, codigo_calidad) values ((select id from tag where campo_id = 'ceiba' and nombre = 'VI-2011'), '2026-10-02T14:00:01-05:00', null, 'mala', 2150694912)$$);
select pg_temp.muerde('lectura fuera de las particiones (2030)',
  $$insert into lectura (tag_id, instante, valor) values ((select id from tag where campo_id = 'ceiba' and nombre = 'VI-2011'), '2030-01-01T00:00:00-05:00', 2.2)$$, '23514');
select pg_temp.muerde('fiscal negativo', $$insert into produccion_fiscal_diaria (campo_id, dia, bbl, tag) values ('ceiba', '2026-10-03', -1, 'FQI-0101')$$, '23514');
select pg_temp.pasa('día fiscal sin dato (NULL, nunca 0)', $$insert into produccion_fiscal_diaria (campo_id, dia, bbl, cerrado, tag) values ('ceiba', '2026-10-03', null, false, 'FQI-0101')$$);
select pg_temp.muerde('alarma baja por encima de la alta', $$insert into alarma_tag values ((select id from tag where campo_id = 'ceiba' and nombre = 'VI-2011'), now(), 3, 5, 'API 610', 'Edwin Maestre')$$, '23514');
select pg_temp.muerde('cambiar una alarma firmada en sitio', $$update alarma_tag set alta = 4.5$$, '23001');

-- ── Precálculo
select pg_temp.muerde('corregir un mes precalculado en sitio', $$update libro_mes set real = real + 1 where campo_id = 'ceiba' and mes = '2026-09-01'$$, '23001');
select pg_temp.muerde('libro publicable con motivos',
  $$insert into libro_mes select * from jsonb_populate_record(null::libro_mes, (select to_jsonb(l) || '{"mes":"2026-10-01","motivos":[{"codigo":"en-curso","texto":"Días sin cierre publicado"}]}' from libro_mes l where campo_id = 'ceiba' and mes = '2026-09-01'))$$, '23514');
select pg_temp.pasa('recalcular un mes: borrar e insertar (y anotarlo)',
  $s$do $x$ begin
      delete from tramo_diferido where campo_id = 'ceiba' and mes = '2026-09-01';
      insert into recalculo_mes (campo_id, mes, motivo, huella_antes, huella_despues) select 'ceiba', '2026-09-01', 'Respuesta tardía a EV-2011-1002', huella_cifras, huella_cifras from libro_mes where campo_id = 'ceiba' and mes = '2026-09-01';
    end $x$ $s$);

-- ── La topología del modelo choke (Config.topologia)
select pg_temp.muerde('topología con un tramo que no sale del alcance (compartido en el pozo)',
  $$insert into topologia (version, orden, campo_id, elemento, alcance, choke, pozos) values (1, 0, 'ceiba', 'P-201B', 'compartido', 'pozo', array['LC-01', 'LC-02'])$$, '23514');
select pg_temp.muerde('topología: un dedicado que sirve a dos pozos',
  $$insert into topologia (version, orden, campo_id, elemento, alcance, choke, pozos) values (1, 0, 'ceiba', 'LC-01', 'dedicado', 'pozo', array['LC-01', 'LC-02'])$$, '23514');
select pg_temp.muerde('topología: un pozo que no es del campo',
  $$insert into topologia (version, orden, campo_id, elemento, alcance, choke, pozos) values (1, 0, 'ceiba', 'K-101', 'compartido', 'planta', array['LC-01', 'MN-07'])$$, '23514');
select pg_temp.muerde('topología: el mismo elemento dos veces en el campo',
  $$insert into topologia (version, orden, campo_id, elemento, alcance, choke) values (1, 0, 'ceiba', 'SE-2', 'compartido', 'planta'), (1, 1, 'ceiba', 'SE-2', 'compartido', 'planta')$$, '23505');
select pg_temp.muerde('topología: el mismo elemento dos veces para todos los campos (sin campo no es distinto)',
  $$insert into topologia (version, orden, campo_id, elemento, alcance, choke) values (1, 0, null, 'SE-2', 'compartido', 'planta'), (1, 1, null, 'SE-2', 'compartido', 'planta')$$, '23505');
select pg_temp.pasa('una versión con topología: el JSON firmado = lo normalizado',
  $s$do $x$ begin
      insert into version_config (version, base, fecha, por_id, por, motivo, cambios, config)
        select 2, 1, now(), 'adm', por, 'Topología de La Ceiba', '{"Topología de La Ceiba: se firma con 1 elemento"}',
          config || '{"topologia":[{"elemento":"LC-01","choke":"pozo","alcance":"dedicado","pozos":["LC-01"],"campoId":"ceiba"},{"elemento":"SE-2","choke":"planta","alcance":"compartido"}]}'::jsonb
        from version_config where version = 1;
      insert into membrete select 2, empresa from membrete where version = 1;
      insert into perfil_campo select 2, campo_id, gas, bombas, electrosumergibles from perfil_campo where version = 1;
      insert into tramo_meta select 2, campo_id, desde, produccion_bpd, diferido_max_bpd, netback_usd, criterio_sin_causa from tramo_meta where version = 1;
      insert into tanque select 2, id, orden, nombre, campo_id, bomba, capacidad_bbl, alto_alto, tag_nivel, aforo from tanque where version = 1;
      insert into respaldo select 2, campo_id, equipo, orden, libre_bpd, detalle from respaldo where version = 1;
      insert into parada_programada select 2, id, orden, campo_id, equipo, desde, hasta, motivo from parada_programada where version = 1;
      insert into topologia (version, orden, campo_id, elemento, alcance, choke, pozos) values (2, 0, 'ceiba', 'LC-01', 'dedicado', 'pozo', array['LC-01']), (2, 1, null, 'SE-2', 'compartido', 'planta', null);
      set constraints all immediate;
    end $x$ $s$);
select pg_temp.muerde('una versión con topología en el JSON firmado y sin sus filas',
  $s$do $x$ begin
      insert into version_config (version, base, fecha, por_id, por, motivo, cambios, config)
        select 2, 1, now(), 'adm', por, 'Topología sin normalizar', '{x}', config || '{"topologia":[{"elemento":"LC-01","choke":"pozo","alcance":"dedicado","pozos":["LC-01"],"campoId":"ceiba"}]}'::jsonb
        from version_config where version = 1;
      insert into membrete select 2, empresa from membrete where version = 1;
      insert into perfil_campo select 2, campo_id, gas, bombas, electrosumergibles from perfil_campo where version = 1;
      insert into tramo_meta select 2, campo_id, desde, produccion_bpd, diferido_max_bpd, netback_usd, criterio_sin_causa from tramo_meta where version = 1;
      insert into tanque select 2, id, orden, nombre, campo_id, bomba, capacidad_bbl, alto_alto, tag_nivel, aforo from tanque where version = 1;
      insert into respaldo select 2, campo_id, equipo, orden, libre_bpd, detalle from respaldo where version = 1;
      insert into parada_programada select 2, id, orden, campo_id, equipo, desde, hasta, motivo from parada_programada where version = 1;
      set constraints all immediate;
    end $x$ $s$, '23514');

-- ── «Todavía no sé» y las capacidades firmadas (Config.topologiaPorSaber, Config.capacidades)
select pg_temp.muerde('«Todavía no sé» de un equipo que está en la topología del mismo campo',
  $s$do $x$ begin
      insert into topologia (version, orden, campo_id, elemento, alcance, choke) values (1, 0, 'ceiba', 'K-101', 'compartido', 'planta');
      insert into topologia_por_saber (version, orden, campo_id, elemento) values (1, 0, 'ceiba', 'K-101');
    end $x$ $s$, '23514');
select pg_temp.muerde('una capacidad en cero',
  $s$do $x$ begin
      insert into capacidades_campo (version, orden, campo_id) values (1, 0, 'ceiba');
      insert into capacidad_firmada (version, campo_id, tramo, orden, bpd, fuente) values (1, 'ceiba', 'crudo', 0, 0, 'placa');
    end $x$ $s$, '23514');
select pg_temp.muerde('una capacidad sin fuente reconocida',
  $s$do $x$ begin
      insert into capacidades_campo (version, orden, campo_id) values (1, 0, 'ceiba');
      insert into capacidad_firmada (version, campo_id, tramo, orden, bpd, fuente) values (1, 'ceiba', 'crudo', 0, 12000, 'me-lo-dijeron');
    end $x$ $s$, '23514');
select pg_temp.muerde('una bomba sin su equipo',
  $s$do $x$ begin
      insert into capacidades_campo (version, orden, campo_id) values (1, 0, 'ceiba');
      insert into capacidad_firmada (version, campo_id, tramo, orden, bpd, fuente) values (1, 'ceiba', 'bomba', 0, 89250, 'placa');
    end $x$ $s$, '23514');
select pg_temp.muerde('el tren de gas sin decir si se mide',
  $s$do $x$ begin
      insert into capacidades_campo (version, orden, campo_id) values (1, 0, 'ceiba');
      insert into capacidad_firmada (version, campo_id, tramo, orden, bpd, fuente) values (1, 'ceiba', 'gas', 0, 2400, 'placa');
    end $x$ $s$, '23514');
select pg_temp.pasa('una versión con «Todavía no sé» y capacidades: el JSON firmado = lo normalizado',
  $s$do $x$ begin
      insert into version_config (version, base, fecha, por_id, por, motivo, cambios, config)
        select 2, 1, now(), 'adm', por, 'Capacidades de La Ceiba', '{"Capacidades de La Ceiba (se firman por primera vez)"}',
          config || '{"topologiaPorSaber":[{"elemento":"K-101","campoId":"ceiba"}],"capacidades":[{"campoId":"ceiba","crudo":{"bpd":12000,"fuente":"prueba"},"gas":{"bpd":2400,"fuente":"placa","medido":false},"bombas":[{"equipo":"P-201A","bpd":89250,"fuente":"placa"},{"equipo":"P-201B","bpd":89250,"fuente":"placa"}],"explicacionEmpate":"El oleoducto se dimensionó con la planta"}]}'::jsonb
        from version_config where version = 1;
      insert into membrete select 2, empresa from membrete where version = 1;
      insert into perfil_campo select 2, campo_id, gas, bombas, electrosumergibles from perfil_campo where version = 1;
      insert into tramo_meta select 2, campo_id, desde, produccion_bpd, diferido_max_bpd, netback_usd, criterio_sin_causa from tramo_meta where version = 1;
      insert into tanque select 2, id, orden, nombre, campo_id, bomba, capacidad_bbl, alto_alto, tag_nivel, aforo from tanque where version = 1;
      insert into respaldo select 2, campo_id, equipo, orden, libre_bpd, detalle from respaldo where version = 1;
      insert into parada_programada select 2, id, orden, campo_id, equipo, desde, hasta, motivo from parada_programada where version = 1;
      insert into topologia_por_saber (version, orden, campo_id, elemento) values (2, 0, 'ceiba', 'K-101');
      insert into capacidades_campo (version, orden, campo_id, explicacion_empate) values (2, 0, 'ceiba', 'El oleoducto se dimensionó con la planta');
      insert into capacidad_firmada (version, campo_id, tramo, equipo, orden, bpd, fuente, medido) values
        (2, 'ceiba', 'crudo', '', 0, 12000, 'prueba', null), (2, 'ceiba', 'gas', '', 0, 2400, 'placa', false),
        (2, 'ceiba', 'bomba', 'P-201A', 0, 89250, 'placa', null), (2, 'ceiba', 'bomba', 'P-201B', 1, 89250, 'placa', null);
      set constraints all immediate;
    end $x$ $s$);
select pg_temp.muerde('una versión con capacidades en el JSON firmado y sin sus filas',
  $s$do $x$ begin
      insert into version_config (version, base, fecha, por_id, por, motivo, cambios, config)
        select 2, 1, now(), 'adm', por, 'Capacidades sin normalizar', '{x}', config || '{"capacidades":[{"campoId":"ceiba","crudo":{"bpd":12000,"fuente":"prueba"}}]}'::jsonb
        from version_config where version = 1;
      insert into membrete select 2, empresa from membrete where version = 1;
      insert into perfil_campo select 2, campo_id, gas, bombas, electrosumergibles from perfil_campo where version = 1;
      insert into tramo_meta select 2, campo_id, desde, produccion_bpd, diferido_max_bpd, netback_usd, criterio_sin_causa from tramo_meta where version = 1;
      insert into tanque select 2, id, orden, nombre, campo_id, bomba, capacidad_bbl, alto_alto, tag_nivel, aforo from tanque where version = 1;
      insert into respaldo select 2, campo_id, equipo, orden, libre_bpd, detalle from respaldo where version = 1;
      insert into parada_programada select 2, id, orden, campo_id, equipo, desde, hasta, motivo from parada_programada where version = 1;
      set constraints all immediate;
    end $x$ $s$, '23514');

-- ── La respuesta de campo y la revisión de una parada (POST …/respuesta, …/revision)
select pg_temp.pasa('el operador contesta «¿De dónde vino el corte?» para el evento',
  $$insert into respuesta_campo (clave, alcance, evento_id, campo_id, pregunta, opcion, sigue, por_id, por, rol_id, hora)
    values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'corte', 'De este pozo: su transformador, su variador o su cable', 'detalle', 'oper', 'Jairo Peña', 'oper', now())$$);
select pg_temp.muerde('una respuesta de un rol que no clasifica (el gerente)',
  $$insert into respuesta_campo (clave, alcance, evento_id, campo_id, pregunta, opcion, por_id, por, rol_id, hora)
    values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'corte', 'Del campo: pórtico, red de media o subestación', 'ger', 'Andrés Vélez', 'ger', now())$$, '23514');
select pg_temp.muerde('«No sé» que abre otra pregunta',
  $$insert into respuesta_campo (clave, alcance, evento_id, campo_id, pregunta, opcion, sigue, no_se, por_id, por, rol_id, hora)
    values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'corte', 'No sé', 'detalle', true, 'oper', 'Jairo Peña', 'oper', now())$$, '23514');
select pg_temp.muerde('una revisión sin motivo',
  $$insert into revision_parada (clave, alcance, evento_id, campo_id, motivo, por_id, por, rol_id, hora)
    values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'mal', 'oper', 'Jairo Peña', 'oper', now())$$, '23514');
select pg_temp.muerde('una revisión pedida al propio rol',
  $$insert into revision_parada (clave, alcance, evento_id, campo_id, motivo, pedir_a, por_id, por, rol_id, hora)
    values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', '¿Fue el yacimiento?', 'prod', 'prod', 'Marcela Ríos', 'prod', now())$$, '23514');
select pg_temp.muerde('«Pedir a producción» atendida por el supervisor',
  $s$do $x$ declare r bigint; begin
      insert into revision_parada (clave, alcance, evento_id, campo_id, motivo, pedir_a, por_id, por, rol_id, hora)
        values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', '¿Fue el yacimiento? Revise la prueba', 'prod', 'sup', 'Nelson Ortiz', 'sup', now()) returning id into r;
      insert into revision_atendida (revision_id, por_id, por, rol_id, hora) values (r, 'sup', 'Nelson Ortiz', 'sup', now());
    end $x$ $s$, '23514');
select pg_temp.pasa('«Algo está mal» del operador, atendida por el supervisor',
  $s$do $x$ declare r bigint; begin
      insert into revision_parada (clave, alcance, evento_id, campo_id, motivo, por_id, por, rol_id, hora)
        values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'No paró por la energía: lo cerraron para una prueba', 'oper', 'Jairo Peña', 'oper', now()) returning id into r;
      insert into revision_atendida (revision_id, por_id, por, rol_id, hora) values (r, 'sup', 'Nelson Ortiz', 'sup', now());
    end $x$ $s$);

-- ── La clasificación ANH (Circular 024): lo que dice una persona, paso por paso
select pg_temp.muerde('clasificación: planeada con una causa no planeada (trigger diferido)',
  $s$do $x$ begin
      insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, por_id, por, rol_id, hora) values
        ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'planeacion', 'planeada', 'declarado', 'sup', 'Nelson Ortiz', 'sup', now()),
        ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'n1', 'NP_SUB', 'declarado', 'sup', 'Nelson Ortiz', 'sup', now());
      set constraints all immediate;
    end $x$ $s$, '23514');
select pg_temp.muerde('clasificación: un detalle que no es de su causa',
  $s$do $x$ begin
      insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, por_id, por, rol_id, hora) values
        ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'n1', 'NP_PROC', 'declarado', 'sup', 'Nelson Ortiz', 'sup', now()),
        ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'n2', 'NP_SUB/falla-esp', 'declarado', 'sup', 'Nelson Ortiz', 'sup', now());
      set constraints all immediate;
    end $x$ $s$, '23514');
select pg_temp.muerde('clasificación: planeada en el evento y una causa no planeada en una de sus filas (lo que rige en la fila)',
  $s$do $x$ begin
      insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, por_id, por, rol_id, hora) values
        ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'planeacion', 'planeada', 'declarado', 'sup', 'Nelson Ortiz', 'sup', now()),
        ('EP-LC21-261001-01@2026-10-01#1', 'fila', 'EP-LC21-261001-01', 'ceiba', 'n1', 'NP_SUB', 'declarado', 'sup', 'Nelson Ortiz', 'sup', now());
      set constraints all immediate;
    end $x$ $s$, '23514');
select pg_temp.muerde('clasificación: una fila dice «no planeada» después de que su evento dijo una causa planeada (lo que rige en la fila)',
  $s$do $x$ begin
      insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, por_id, por, rol_id, hora) values
        ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'n1', 'P_MANT_ELE', 'declarado', 'sup', 'Nelson Ortiz', 'sup', now()),
        ('EP-LC21-261001-01@2026-10-01#1', 'fila', 'EP-LC21-261001-01', 'ceiba', 'planeacion', 'no-planeada', 'declarado', 'sup', 'Nelson Ortiz', 'sup', now());
      set constraints all immediate;
    end $x$ $s$, '23514');
select pg_temp.pasa('clasificación: lo guardado en el evento después reemplaza lo de sus filas (no se mezclan)',
  $s$do $x$ begin
      insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, por_id, por, rol_id, hora) values
        ('EP-LC21-261001-01@2026-10-01#1', 'fila', 'EP-LC21-261001-01', 'ceiba', 'planeacion', 'no-planeada', 'declarado', 'sup', 'Nelson Ortiz', 'sup', now()),
        ('EP-LC21-261001-01@2026-10-01#1', 'fila', 'EP-LC21-261001-01', 'ceiba', 'n1', 'NP_SUB', 'declarado', 'sup', 'Nelson Ortiz', 'sup', now()),
        ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'planeacion', 'planeada', 'declarado', 'sup', 'Nelson Ortiz', 'sup', now()),
        ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'n1', 'P_MANT_ELE', 'declarado', 'sup', 'Nelson Ortiz', 'sup', now());
      set constraints all immediate;
    end $x$ $s$);
select pg_temp.pasa('clasificación: el tramo de exceso no hereda la planeación de su evento',
  $s$do $x$ begin
      insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, por_id, por, rol_id, hora) values
        ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'planeacion', 'planeada', 'declarado', 'sup', 'Nelson Ortiz', 'sup', now()),
        ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'n1', 'P_MANT_ELE', 'declarado', 'sup', 'Nelson Ortiz', 'sup', now());
      insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, por_id, por, rol_id, hora, exceso) values
        ('EP-LC21-261001-01@2026-10-01#2', 'fila', 'EP-LC21-261001-01', 'ceiba', 'n1', 'NP_SUB', 'declarado', 'sup', 'Nelson Ortiz', 'sup', now(), true);
      set constraints all immediate;
    end $x$ $s$);
select pg_temp.muerde('clasificación: «exceso» en una clave de evento',
  $$insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, por_id, por, rol_id, hora, exceso)
    values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'impacto', 'diferida', 'declarado', 'sup', 'Nelson Ortiz', 'sup', now(), true)$$, '23514');
select pg_temp.pasa('clasificación: el evento planeado y una fila que corrige planeación, causa y detalle (lo que rige es coherente en los dos)',
  $s$do $x$ begin
      insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, por_id, por, rol_id, hora) values
        ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'planeacion', 'planeada', 'declarado', 'sup', 'Nelson Ortiz', 'sup', now()),
        ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'n1', 'P_MANT_ELE', 'declarado', 'sup', 'Nelson Ortiz', 'sup', now()),
        ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'n2', 'P_MANT_ELE/transformador', 'declarado', 'sup', 'Nelson Ortiz', 'sup', now()),
        ('EP-LC21-261001-01@2026-10-01#1', 'fila', 'EP-LC21-261001-01', 'ceiba', 'planeacion', 'no-planeada', 'declarado', 'sup', 'Nelson Ortiz', 'sup', now()),
        ('EP-LC21-261001-01@2026-10-01#1', 'fila', 'EP-LC21-261001-01', 'ceiba', 'n1', 'NP_ENINT', 'declarado', 'sup', 'Nelson Ortiz', 'sup', now()),
        ('EP-LC21-261001-01@2026-10-01#1', 'fila', 'EP-LC21-261001-01', 'ceiba', 'n2', 'NP_ENINT/falla-transformador', 'declarado', 'sup', 'Nelson Ortiz', 'sup', now());
      set constraints all immediate;
    end $x$ $s$);
select pg_temp.muerde('clasificación: «En el yacimiento» puesto por el supervisor',
  $$insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, porque, por_id, por, rol_id, hora)
    values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'choke', 'reservorio', 'declarado', '{"regla":"choke.yacimiento@1","evidencia":"prueba"}', 'sup', 'Nelson Ortiz', 'sup', now())$$, '23514');
select pg_temp.muerde('clasificación: «En el yacimiento» sin evidencia',
  $$insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, por_id, por, rol_id, hora)
    values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'choke', 'reservorio', 'declarado', 'prod', 'Marcela Ríos', 'prod', now())$$, '23514');
select pg_temp.muerde('clasificación: corregido sin lo que proponía TRIM',
  $$insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, por_id, por, rol_id, hora)
    values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'choke', 'planta', 'corregido', 'sup', 'Nelson Ortiz', 'sup', now())$$, '23514');
select pg_temp.muerde('clasificación: una causa que no es del catálogo',
  $$insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, por_id, por, rol_id, hora)
    values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'n1', 'np_sub', 'declarado', 'sup', 'Nelson Ortiz', 'sup', now())$$, '23514');
select pg_temp.muerde('clasificación: lo que propone TRIM no se guarda (procedencia regla)',
  $$insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, por_id, por, rol_id, hora)
    values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'impacto', 'diferida', 'regla', 'sup', 'Nelson Ortiz', 'sup', now())$$, '23514');
select pg_temp.muerde('clasificación: el gerente no clasifica (sin anh:clasificar)',
  $$insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, por_id, por, rol_id, hora)
    values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'impacto', 'diferida', 'declarado', 'ger', 'Andrés Vélez', 'ger', now())$$, '23514');
select pg_temp.muerde('clasificación: el evento es de otro campo',
  $$insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, por_id, por, rol_id, hora)
    values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'morichal', 'impacto', 'diferida', 'declarado', 'sup', 'Nelson Ortiz', 'sup', now())$$, '23514');
select pg_temp.muerde('clasificación: una fila que no es de su evento',
  $$insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, por_id, por, rol_id, hora)
    values ('EP-OTRO@2026-10-01#1', 'fila', 'EP-LC21-261001-01', 'ceiba', 'impacto', 'diferida', 'declarado', 'sup', 'Nelson Ortiz', 'sup', now())$$, '23514');
select pg_temp.muerde('corregir una clasificación en sitio (se corrige con una fila nueva)',
  $s$do $x$ begin
      insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, por_id, por, rol_id, hora)
        values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'impacto', 'diferida', 'declarado', 'sup', 'Nelson Ortiz', 'sup', now());
      update clasificacion_paso set valor = 'perdida' where clave = 'EP-LC21-261001-01';
    end $x$ $s$, '23001');
select pg_temp.muerde('lote del operador (sin anh:confirmar)',
  $$insert into confirmacion_lote (id, por_id, por, rol_id, hora, paradas, cadena, pasos)
    values ('LOTE-PRUEBA', 'oper', 'Jairo Peña', 'oper', now(), array['EP-LC21-261001-01@2026-10-01#1', 'EP-LC21-261001-01@2026-10-02#2'], 'op-operacion · pozo · diferida · no-planeada · NP_SUP · NP_SUP/falla-motor-superficie', array['planeacion', 'impacto'])$$, '23514');
select pg_temp.pasa('una clasificación coherente, confirmada en lote por el supervisor',
  $s$do $x$ begin
      insert into confirmacion_lote (id, por_id, por, rol_id, hora, paradas, cadena, pasos)
        values ('LOTE-PRUEBA', 'sup', 'Nelson Ortiz', 'sup', now(), array['EP-LC21-261001-01@2026-10-01#1', 'EP-LC21-261001-01@2026-10-02#2'],
          'op-operacion · pozo · diferida · no-planeada · NP_SUP · NP_SUP/falla-motor-superficie', array['responsable', 'choke', 'impacto', 'planeacion', 'n1', 'n2']);
      insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, regla, por_id, por, rol_id, hora, lote_id) values
        ('EP-LC21-261001-01@2026-10-01#1', 'fila', 'EP-LC21-261001-01', 'ceiba', 'planeacion', 'no-planeada', 'confirmado', 'REGLAS_ANH@1#bombeo-mecanico', 'sup', 'Nelson Ortiz', 'sup', now(), 'LOTE-PRUEBA'),
        ('EP-LC21-261001-01@2026-10-01#1', 'fila', 'EP-LC21-261001-01', 'ceiba', 'n1', 'NP_SUP', 'confirmado', 'REGLAS_ANH@1#bombeo-mecanico', 'sup', 'Nelson Ortiz', 'sup', now(), 'LOTE-PRUEBA'),
        ('EP-LC21-261001-01@2026-10-01#1', 'fila', 'EP-LC21-261001-01', 'ceiba', 'n2', 'NP_SUP/falla-motor-superficie', 'confirmado', 'REGLAS_ANH@1#bombeo-mecanico', 'sup', 'Nelson Ortiz', 'sup', now(), 'LOTE-PRUEBA');
      insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, porque, por_id, por, rol_id, hora, propuesto)
        values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'choke', 'reservorio', 'corregido', '{"regla":"choke.yacimiento@1","evidencia":"corte-agua"}', 'prod', 'Marcela Ríos', 'prod', now(), 'pozo');
      set constraints all immediate;
    end $x$ $s$);

-- ── Tanda 5 (QA-C, CORRECCIONES-QA D1): candados de persona, campo, rol y pasos (C-07)
select pg_temp.muerde('clasificación: el supervisor (solo La Ceiba) en una parada de Morichal',
  $$insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, por_id, por, rol_id, hora)
    values ('EP-MN01-251015-78', 'evento', 'EP-MN01-251015-78', 'morichal', 'impacto', 'diferida', 'declarado', 'sup', 'Nelson Ortiz', 'sup', now())$$, '23514');
select pg_temp.muerde('revisión: el operador (solo La Ceiba) en Morichal',
  $$insert into revision_parada (clave, alcance, evento_id, campo_id, motivo, por_id, por, rol_id, hora)
    values ('EP-MN01-251015-78', 'evento', 'EP-MN01-251015-78', 'morichal', 'esto no fue así', 'oper', 'Jairo Peña', 'oper', now())$$, '23514');
select pg_temp.muerde('respuesta: el operador (solo La Ceiba) contesta en Morichal',
  $$insert into respuesta_campo (clave, alcance, evento_id, campo_id, pregunta, opcion, por_id, por, rol_id, hora)
    values ('EP-MN01-251015-78', 'evento', 'EP-MN01-251015-78', 'morichal', 'programado', 'No, fue de repente', 'oper', 'Jairo Peña', 'oper', now())$$, '23514');
select pg_temp.muerde('clasificación: rol_id distinto del rol de la persona (el operador firmando como prod pone el yacimiento)',
  $$insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, porque, por_id, por, rol_id, hora)
    values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'choke', 'reservorio', 'declarado', '{"regla":"choke.yacimiento@1","evidencia":"prueba"}', 'oper', 'Jairo Peña', 'prod', now())$$, '23514');
select pg_temp.muerde('lote: el operador firmando como sup',
  $$insert into confirmacion_lote (id, por_id, por, rol_id, hora, paradas, cadena, pasos)
    values ('LOTE-QA', 'oper', 'Jairo Peña', 'sup', now(), array['EP-LC21-261001-01@2026-10-01#1', 'EP-LC21-261001-01@2026-10-02#2'], 'x', array['choke'])$$, '23514');
select pg_temp.muerde('revisión atendida por el operador firmando como sup',
  $s$do $x$ declare r bigint; begin
      insert into revision_parada (clave, alcance, evento_id, campo_id, motivo, por_id, por, rol_id, hora)
        values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'No paró por la energía', 'oper', 'Jairo Peña', 'oper', now()) returning id into r;
      insert into revision_atendida (revision_id, por_id, por, rol_id, hora) values (r, 'oper', 'Jairo Peña', 'sup', now());
    end $x$ $s$, '23514');
select pg_temp.muerde('clasificación: una persona suspendida',
  $s$do $x$ begin
      update usuario set estado = 'suspendido', antes_de_suspender = 'activo' where id = 'tec';
      insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, por_id, por, rol_id, hora)
        values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'impacto', 'diferida', 'declarado', 'tec', 'Óscar Daza', 'tec', now());
    end $x$ $s$, '23514');
select pg_temp.muerde('una persona con un rol de la versión 2 (cont): nadie lo tiene (C-14)',
  $$insert into usuario (id, nombre, correo, rol_id, todos_los_campos, estado, desde)
    values ('u-cont', 'Paula Gómez', 'paula.gomez@operadora.example', 'cont', true, 'activo', current_date)$$, '23514');
select pg_temp.muerde('el operador CONFIRMA «Dónde se trabó»',
  $$insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, regla, por_id, por, rol_id, hora)
    values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'choke', 'pozo', 'confirmado', 'choke.topologia@3', 'oper', 'Jairo Peña', 'oper', now())$$, '23514');
select pg_temp.muerde('el operador CORRIGE el detalle',
  $$insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, propuesto, por_id, por, rol_id, hora)
    values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'n2', 'NP_SUB/falla-esp', 'corregido', 'NP_SUB/falla-pcp', 'oper', 'Jairo Peña', 'oper', now())$$, '23514');
select pg_temp.muerde('el técnico confirma «Quién» (solo confirma la planeación y qué pasó)',
  $$insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, regla, por_id, por, rol_id, hora)
    values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'responsable', 'op-mantenimiento', 'confirmado', 'REGLAS_ANH@2#esp-falla', 'tec', 'Óscar Daza', 'tec', now())$$, '23514');
select pg_temp.pasa('el operador deja el tramo por una respuesta de campo (declarado, regla preguntas:campo@1: no avalado)',
  $$insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, regla, por_id, por, rol_id, hora)
    values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'choke', 'pozo', 'declarado', 'preguntas:campo@1', 'oper', 'Jairo Peña', 'oper', now())$$);
select pg_temp.muerde('respuesta: el operador contesta la pregunta del tramo (la contesta quien revisa)',
  $$insert into respuesta_campo (clave, alcance, evento_id, campo_id, pregunta, opcion, por_id, por, rol_id, hora)
    values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'choke', 'En la planta o estación', 'oper', 'Jairo Peña', 'oper', now())$$, '23514');
select pg_temp.muerde('respuesta: el operador contesta el detalle (lo contesta quien abre el equipo o revisa)',
  $$insert into respuesta_campo (clave, alcance, evento_id, campo_id, pregunta, opcion, por_id, por, rol_id, hora)
    values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'detalle', 'No sé', 'oper', 'Jairo Peña', 'oper', now())$$, '23514');
select pg_temp.muerde('respuesta: el supervisor contesta «¿Fue el yacimiento?» (solo producción y confiabilidad)',
  $$insert into respuesta_campo (clave, alcance, evento_id, campo_id, pregunta, opcion, por_id, por, rol_id, hora)
    values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'aporte', 'No, fue la bomba', 'sup', 'Nelson Ortiz', 'sup', now())$$, '23514');
select pg_temp.muerde('respuesta: una opción que no es de la pregunta («De la luna»)',
  $$insert into respuesta_campo (clave, alcance, evento_id, campo_id, pregunta, opcion, por_id, por, rol_id, hora)
    values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'corte', 'De la luna', 'oper', 'Jairo Peña', 'oper', now())$$, '23503');
select pg_temp.muerde('respuesta: «sigue» a una pregunta que no existe',
  $$insert into respuesta_campo (clave, alcance, evento_id, campo_id, pregunta, opcion, sigue, por_id, por, rol_id, hora)
    values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'corte', 'Del campo: pórtico, red de media o subestación', 'no-existe', 'oper', 'Jairo Peña', 'oper', now())$$, '23503');
select pg_temp.muerde('respuesta: acota un paso que no existe',
  $$insert into respuesta_campo (clave, alcance, evento_id, campo_id, pregunta, opcion, acota, por_id, por, rol_id, hora)
    values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'que-lo-paro', 'Bloqueo, paro, robo o amenaza', '{"inventado":["x"]}', 'oper', 'Jairo Peña', 'oper', now())$$, '23514');

-- ── Catálogo y forma (C-07, C-19, C-26; D2)
select pg_temp.muerde('una N1 que no es de las 20 (NP_INVENTADA)',
  $$insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, por_id, por, rol_id, hora)
    values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'n1', 'NP_INVENTADA', 'declarado', 'sup', 'Nelson Ortiz', 'sup', now())$$, '23503');
select pg_temp.muerde('un N2 que no es del catálogo (NP_SUB/no-existe)',
  $$insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, por_id, por, rol_id, hora)
    values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'n2', 'NP_SUB/no-existe', 'declarado', 'sup', 'Nelson Ortiz', 'sup', now())$$, '23503');
select pg_temp.muerde('una causa general escrita a mano (texto libre: no viaja a la ANH, D2)',
  $$insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, por_id, por, rol_id, hora)
    values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'cau_gral', 'Lo que dijo Jairo en el campo', 'declarado', 'sup', 'Nelson Ortiz', 'sup', now())$$, '23503');
select pg_temp.muerde('una descripción (desc_evid) escrita por una persona (D2: la arma TRIM)',
  $$insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, por_id, por, rol_id, hora)
    values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'desc_evid', 'Lo encontró Jairo Peña', 'declarado', 'sup', 'Nelson Ortiz', 'sup', now())$$, '23514');
select pg_temp.muerde('una fila cuyo día no es fecha',
  $$insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, por_id, por, rol_id, hora)
    values ('EP-LC21-261001-01@nunca#x', 'fila', 'EP-LC21-261001-01', 'ceiba', 'impacto', 'diferida', 'declarado', 'sup', 'Nelson Ortiz', 'sup', now())$$, '23514');
select pg_temp.muerde('un motivo de seis espacios no separables',
  $$insert into revision_parada (clave, alcance, evento_id, campo_id, motivo, por_id, por, rol_id, hora)
    values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', repeat(chr(160), 6), 'oper', 'Jairo Peña', 'oper', now())$$, '23514');
select pg_temp.muerde('un motivo de cinco espacios de ancho cero',
  $$insert into revision_parada (clave, alcance, evento_id, campo_id, motivo, por_id, por, rol_id, hora)
    values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', repeat(chr(8203), 5), 'oper', 'Jairo Peña', 'oper', now())$$, '23514');
select pg_temp.muerde('un motivo de más de 500 caracteres (C-12)',
  $$insert into revision_parada (clave, alcance, evento_id, campo_id, motivo, por_id, por, rol_id, hora)
    values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', repeat('a', 501), 'oper', 'Jairo Peña', 'oper', now())$$, '23514');
select pg_temp.muerde('un lote que no sube ningún paso (C-19)',
  $$insert into confirmacion_lote (id, por_id, por, rol_id, hora, paradas, cadena, pasos)
    values ('LOTE-VACIO', 'sup', 'Nelson Ortiz', 'sup', now(), array['EP-LC21-261001-01@2026-10-01#1', 'EP-LC21-261001-01@2026-10-02#2'], 'x', array[]::text[])$$, '23514');

-- ── Lo que rige, paso por paso (D1; C-01, C-03, C-05)
select pg_temp.pasa('lo que el jefe dijo del evento B sigue vigente después de que otra escritura guarda otro paso en B',
  $s$do $x$ begin
      insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, propuesto, por_id, por, rol_id, hora)
        values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'n2', 'NP_SUB/falla-pcp', 'corregido', 'NP_SUB/falla-esp', 'jefe', 'Camilo Rueda', 'jefe', now());
      insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, propuesto, por_id, por, rol_id, hora)
        values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'responsable', 'op-operacion', 'corregido', 'op-mantenimiento', 'sup', 'Nelson Ortiz', 'sup', now());
      if (select valor from v_clasificacion_fuente where clave = 'EP-LC21-261001-01' and paso = 'n2') <> 'NP_SUB/falla-pcp' then
        raise exception 'se perdió lo que dijo el jefe' using errcode = '23514';
      end if;
    end $x$ $s$);
select pg_temp.pasa('en una fila rige, paso por paso, lo más reciente entre la fila y su evento',
  $s$do $x$ begin
      insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, por_id, por, rol_id, hora) values
        ('EP-LC21-261001-01@2026-10-01#1', 'fila', 'EP-LC21-261001-01', 'ceiba', 'responsable', 'op-operacion', 'declarado', 'sup', 'Nelson Ortiz', 'sup', now()),
        ('EP-LC21-261001-01@2026-10-01#1', 'fila', 'EP-LC21-261001-01', 'ceiba', 'impacto', 'diferida', 'declarado', 'sup', 'Nelson Ortiz', 'sup', now()),
        ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'responsable', 'op-mantenimiento', 'declarado', 'jefe', 'Camilo Rueda', 'jefe', now());
      if (select valor from v_clasificacion_fuente where clave = 'EP-LC21-261001-01@2026-10-01#1' and paso = 'responsable') <> 'op-mantenimiento'
         or (select rige from v_clasificacion_fuente where clave = 'EP-LC21-261001-01@2026-10-01#1' and paso = 'impacto') <> 'fila' then
        raise exception 'no rige lo más reciente paso por paso' using errcode = '23514';
      end if;
    end $x$ $s$);
select pg_temp.muerde('cambiar «¿Planeada?» sobre la causa que dijo otra persona sin retirarla: lo que rige quedaría incoherente',
  $s$do $x$ begin
      insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, por_id, por, rol_id, hora) values
        ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'n1', 'NP_SUB', 'declarado', 'jefe', 'Camilo Rueda', 'jefe', now());
      insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, propuesto, por_id, por, rol_id, hora) values
        ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'planeacion', 'planeada', 'corregido', 'no-planeada', 'sup', 'Nelson Ortiz', 'sup', now());
      set constraints all immediate;
    end $x$ $s$, '23514');
select pg_temp.pasa('cambiar «¿Planeada?» retirando la causa de otra persona, con su marca (procedencia retirado) y motivo',
  $s$do $x$ begin
      insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, por_id, por, rol_id, hora) values
        ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'n1', 'NP_SUB', 'declarado', 'jefe', 'Camilo Rueda', 'jefe', now());
      set constraints all immediate;
      insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, porque, propuesto, por_id, por, rol_id, hora) values
        ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'n1', 'NP_SUB', 'retirado', '"Estaba en el programa"', null, 'sup', 'Nelson Ortiz', 'sup', now()),
        ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'planeacion', 'planeada', 'corregido', '"Estaba en el programa"', 'no-planeada', 'sup', 'Nelson Ortiz', 'sup', now());
      set constraints all immediate;
      if exists (select 1 from v_clasificacion_fuente where clave = 'EP-LC21-261001-01' and paso = 'n1') then
        raise exception 'la causa retirada sigue rigiendo' using errcode = '23514';
      end if;
    end $x$ $s$);
select pg_temp.muerde('un retiro sin motivo',
  $$insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, por_id, por, rol_id, hora)
    values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'n1', 'NP_SUB', 'retirado', 'sup', 'Nelson Ortiz', 'sup', now())$$, '23514');

-- ── Capacidades y topología (C-13, C-28)
select pg_temp.muerde('una bomba que no es del tren de agua del campo',
  $s$do $x$ begin
      insert into capacidades_campo (version, orden, campo_id) values (1, 0, 'ceiba');
      insert into capacidad_firmada (version, campo_id, tramo, equipo, orden, bpd, fuente) values (1, 'ceiba', 'bomba', 'P-999', 0, 5000, 'placa');
    end $x$ $s$, '23503');
select pg_temp.muerde('un compartido con un pozo repetido (LC-01, LC-01)',
  $$insert into topologia (version, orden, campo_id, elemento, alcance, choke, pozos) values (1, 0, 'ceiba', 'K-101', 'compartido', 'planta', array['LC-01', 'LC-01'])$$, '23514');
select pg_temp.muerde('un pozo que le sirve a otro pozo',
  $$insert into topologia (version, orden, campo_id, elemento, alcance, choke, pozos) values (1, 0, 'ceiba', 'LC-01', 'dedicado', 'pozo', array['LC-02'])$$, '23514');
select pg_temp.muerde('un pozo como elemento compartido (sus fallas pasarían a la planta)',
  $$insert into topologia (version, orden, campo_id, elemento, alcance, choke, pozos) values (1, 0, 'ceiba', 'LC-01', 'compartido', 'planta', array['LC-01', 'LC-02'])$$, '23514');
select pg_temp.muerde('«Todavía no sé» insertado antes que la misma topología',
  $s$do $x$ begin
      insert into topologia_por_saber (version, orden, campo_id, elemento) values (1, 0, 'ceiba', 'K-101');
      insert into topologia (version, orden, campo_id, elemento, alcance, choke, pozos) values (1, 0, 'ceiba', 'K-101', 'compartido', 'planta', array['LC-01', 'LC-02']);
    end $x$ $s$, '23514');
select pg_temp.muerde('un equipo para todos los campos y a la vez «Todavía no sé» en La Ceiba',
  $s$do $x$ begin
      insert into topologia (version, orden, campo_id, elemento, alcance, choke, pozos) values (1, 0, null, 'K-101', 'compartido', 'planta', array['LC-01', 'LC-02']);
      insert into topologia_por_saber (version, orden, campo_id, elemento) values (1, 0, 'ceiba', 'K-101');
    end $x$ $s$, '23514');
