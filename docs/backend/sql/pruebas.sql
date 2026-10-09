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
