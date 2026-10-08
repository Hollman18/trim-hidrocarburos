# 5D.9 · Huecos y dudas

Lo que no se pudo resolver leyendo y corriendo el código, o que parece inconsistente. Cada punto con su archivo:línea y lo que se recomienda al backend.

## Reloj y textos con fecha

1. **`fechaHoraLarga` no pasa por `formatoFecha`.** `src/entities/reloj.ts:20` arma `FMT_LARGA` con `new Intl.DateTimeFormat('es-CO', { month: 'long', hour… })` directamente. En Node 22 da «2 de octubre de 2026 a las 14:00 (hora de Colombia)», y lo mismo Chromium 153, Firefox 155 y WebKit 26.6 (comprobado el 8-oct-2026 con los navegadores de Playwright); solo el comentario del código dice «2 de octubre de 2026, 14:00». Otra versión de ICU podría cambiar el patrón. Ese texto va en documentos (membrete, filas «Generado», «Datos hasta», «Configuración» del CSV). Recomendación: fijar el patrón (como `formatoFecha` fija la abreviatura del mes) y que el servidor, si genera textos con fecha, use exactamente el mismo.
2. **Dos relojes sin separar.** El front usa `AHORA` para la hora de las escrituras y para «datos hasta». El contrato deja pendiente `generadoEn`/`datosHasta` o `GET /api/reloj` (`CONTRATO.md` · «Pendiente del lado del servidor»). Mientras no exista, las firmas del demo salen todas con la misma hora (`horaDelPlc`, `escrituras.ts:62`).
3. **El año en los textos de los mensajes depende de «ahora», no de la hora del mensaje.** `fechaHora` (`reloj.ts:28`) agrega el año si el instante es de otro año que AHORA; los parámetros `fecha`, `desde` y `hasta` de las plantillas la usan (`mensajes.ts:306, 327`). En el demo, que arma el registro entero a la hora de AHORA, un mensaje de diciembre de 2025 dice «… de 2025»; enviado de verdad en 2025 no lo habría dicho. Con un servidor que guarda el texto al enviar no pasa; con uno que lo regenere, sí.

## Configuración

4. **El colchón de las paradas históricas usa la configuración vigente.** `diferido.ts:62, 248, 314` leen `respaldoDe`/`tanqueDe` de `ctx.config` (la vigente). Firmar hoy otra capacidad de tanque o de respaldo cambia «lo que el tanque debía aguantar» (`colchon.previsto`) de paradas pasadas, mientras que los mensajes sí usan `configEn` (`mensajes.ts:274`). Recomendación: para una parada medida, `configEn(versiones, inicio)`. Esto no cambia barriles (los tramos salen del PLC), pero sí lo que se muestra de una parada vieja.
5. **Se puede cambiar el motivo de una parada del programa que ya empezó.** `validarConfig` (`configuracion.ts:449-452`) compara campo, equipo, desde y hasta, no el motivo; `diferenciasPorGrupo` lo registra como «Programa: se cambió … motivo «a» → «b»». ¿Es intencional (corregir un texto) o debería quedar inmutable como el resto de la parada?
6. **Orden de las reglas de la firma.** El demo revisa «No hay cambios que firmar» antes de las capacidades y el motivo después de `validarConfig` (`escrituras.ts:106-119`); el contrato pone la forma (422) al final. Recomendado en este capítulo: el orden de la tabla de 5D.2. El código HTTP de «sin cambios» no está en el contrato (se sugiere 422 `sin-cambios`).
7. **Ids del programa de arranque.** Los 7 ids (`PR-2011-260819`…) no incluyen el campo, contra la forma `PR-{campo}-{equipo}-{fecha}` que pide el contrato (`CONTRATO.md` · regla 7). No rompe nada porque son únicos, pero dos campos con el mismo equipo y fecha chocarían con esa forma vieja.
8. **Una versión mixta (metas + técnica) nunca se puede firmar**: ningún rol del producto tiene `metas:firmar` y `config:firmar`. Correcto como regla, pero conviene que el servidor devuelva un mensaje que lo diga («separe el cambio en dos firmas»).

## Plan mes a mes

9. **El aviso de repetidos cuenta como «fila con error» aunque la fila pasa.** `leerPlan` mete «Fila n: repite … vale la última.» en `errores` (`plan.ts:193`) pero conserva la fila; `PlanMensual.tsx:212-213` dice «{m} filas con error no se pasaron» contando ese mensaje. Debería ir a `avisos`.

## Usuarios y accesos

10. **Cambios de nombre y correo no quedan en el historial.** `cambiosDeUsuario` (`usuarios.ts:203-212`) no compara `nombre` ni `correo`: un `PATCH` que solo cambie el correo da «No hay cambios que guardar.» y uno que lo cambie junto con otra cosa lo guarda **sin rastro**. El formulario de cambio no los muestra, pero el endpoint los recibe (`CuerpoUsuario = { usuario: Usuario }`). Recomendación: rechazar cambios de nombre/correo en el `PATCH` o registrarlos.
11. **`CambioAcceso.usuario` es el nombre (texto), no el id** (`usuarios.ts:100-107`). Con dos personas del mismo nombre, o si un nombre cambia, el historial es ambiguo. Recomendación: guardar `usuarioId` además del nombre.
12. **El demo devuelve todos los errores de acceso juntos sin código HTTP.** `revisarAcceso` mezcla reglas de 403 (propios campos, otorgar lo que no tiene, suspenderse), 409 (último gerente) y 422 (forma). El servidor tiene que escoger el código; aquí se recomienda el más fuerte presente (403 > 409 > 422) con la lista completa en `error.errores`.
13. **El paso de `invitado` a `activo`** (primera entrada) no tiene endpoint ni regla en el código: lo hace el servicio de identidad. Hay que definirlo.
14. **`por` es texto** («Nombre · rol») en todas las escrituras; el contrato propone `{ id, nombre, rol }`. Las pantallas lo muestran tal cual.

## Informes

15. **Folio sin reinicio anual en el demo.** `escrituras.ts:253` numera `informes.length + 1` con el año de la fecha: el primero de 2027 sería `INF-2027-0004`, no `INF-2027-0001`. El contrato dice «consecutivo por año».
16. **Campo inexistente: 403 en el demo, 422 en el contrato.** Con un gerente de «todos», `["xx"]` cae en «El informe incluye campos que no tiene asignados.» (`escrituras.ts:245-246`) antes que en ««xx» no es un campo.» (`informe.ts:171-172`).
17. **Las filas del CSV no están protegidas por la huella.** El CSV pide el libro aparte (`Exportar.tsx:60`) después del `POST`; si entre los dos llegó una respuesta que cambió la causa de un tramo, las filas difieren de lo registrado. La huella solo protege el **número** de tramos. Opciones: que `POST /api/informes` devuelva también las filas (para CSV) o que la huella incluya un resumen de los tramos.
18. **Verificación pública con folio inexistente**: el contrato no dice si es `404` o `{ coincide: false }` (ver 5D.4).
19. **Redondeo en doble.** La forma canónica exige `floor(v × 100 + 0,5)` en IEEE-754 (corrido: 1,005 → «1.00», mientras que en `Decimal` exacto sale 1,01). Un backend en Java/Python/SQL con decimales exactos tiene que convertir a `double` antes de esta cuenta. Conviene un caso de prueba con 1,005 en `referencia/` (hoy no hay casos de referencia de informes, mensajes ni relojes).

## WhatsApp

20. **Variantes que el registro del demo nunca ejercita.** Con las 8 personas iniciales solo La Ceiba tiene supervisor y operador con alertas: las consecuencias «con respaldo parcial» y «con respaldo total» y la plantilla `trim_recordatorio_arranco` no aparecen en `GET /api/mensajes` del demo (se obtuvieron en este capítulo cambiando los campos de dos personas). Conviene agregarlas a la referencia.
21. **El tipo `Mensaje` no trae el id de Meta del saliente** (`wamid`), que el webhook necesita para resolver `context.id` (`mensajes.ts:84-109`). El contrato lo pide en la tabla `mensaje`; falta en el tipo y en `GET /api/mensajes` si alguna pantalla lo fuera a usar.
22. **El registro del demo se recalcula, no se dispara.** `mensajesDe` reconstruye el registro desde la historia (`shared/api/mensajes.ts:18-29`). El servidor real tiene que disparar cada mensaje en su momento (incluidos los recordatorios a los 30 min y el escalamiento a las 120 min con un job) y guardarlo; los textos de este capítulo son la especificación de lo que se guarda.
23. **Respuestas históricas sin `canal` ni `porId`.** La respuesta de `EP-LC06-260814-04` en los insumos no trae `canal` (corrido). El servidor siempre los pone; la pantalla las trata como «respondido en pantalla».

## SAP

24. **`horasPorClase` cuenta órdenes abiertas por su fecha de liberación.** `sap.ts:324` usa `cierreTecnico ?? liberada ?? creada`; el comentario y el panel dicen «órdenes cerradas en el período». En octubre en curso la respuesta trae `ordenes: 1` con 0 h (la PM03 liberada hoy); la pantalla no lo escribe (sin horas no hay porcentaje: dice «Sin órdenes cerradas en el período»), pero un cálculo del servidor que use `ordenes` lo contaría. Recomendación: contar solo las cerradas (TECO o CNF) o decirlo en el texto.
25. **El aviso no valida equipo, tipo, prioridad, parte, modo ni evento** (`escrituras.ts:209-223`): el demo aceptó `evento: "X"`. El servidor tiene que validarlos (y que el equipo sea de la flota del campo).
26. **«PLC ↔ SAP · equipos {n} de {n}»** (`Integraciones.tsx`) cuenta la flota contra sí misma; con SAP real debe ser «asociados de la flota».
27. **Reparación activa ≤ 8 h por construcción** (`JORNADA_H`, `sap.ts:185`): los promedios del demo de «reparación activa» son casi siempre 8 h. No usar esos números como referencia de producción.

## Planta

28. **Los cambios de planta no llevan motivo** (`CambioPlanta`, `planta.ts:579`), a diferencia de configuración, accesos y asignación oficial; tampoco versión base. El encargo de este capítulo habla de «cambios del administrador con motivo»: **en el código no hay motivo**. Si el negocio lo exige, hay que agregarlo al cuerpo y al historial.
29. **`quitar-elemento` sobre el tronco** (separador, manifold) está permitido por `aplicarCambioPlanta` (`planta.ts:609-611`); la pantalla no lo ofrece. El servidor debería restringirlo (o validar que la topología siga conectada).
30. **Ids de elementos nuevos generados en el cliente** (`{símbolo}-{Date.now() base 36}`, `Esquema.tsx:182`).

## Cadena de datos

31. **La sugerencia de asociación por dígitos puede proponer el equipo equivocado.** Corrido: `XI-1017` «Nivel de interfase» se sugiere a K-101 (aire de instrumentos) por compartir «101» con PT-1011 (`registro.ts:85-104`); «Aplicar las N» lo asocia con `origen: regla`, que **ningún nacimiento deshace**. Recomendación: no aplicar en bloque sugerencias de confianza «media», o validar clase de equipo contra tipo de tag.
32. **El simulador no revisa el campo asignado** en asociar e inscribir (`api.mjs:155-177`, solo `x-capacidades`), mide el límite de 2 MB en caracteres y genera el código con un sesgo de módulo (`% 31`). El servidor real: token, campo asignado, bytes, muestreo sin sesgo.
33. **Lecturas de las electrosumergibles** (los ajustes de protección del variador) no tienen endpoint (`CONTRATO.md` · «Pendiente del lado del servidor»).
