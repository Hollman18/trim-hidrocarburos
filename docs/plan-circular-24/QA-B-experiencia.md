# QA-B · La experiencia por rol del choke y del árbol de causas

**22-oct-2026 · Auditor adversarial QA-B · commit `d028202`** («Árbol de pérdidas del choke: el árbol de Edinson cuelga de cada tramo»). Pedido del dueño: que sea «muy amigable, que se entienda, fácil, entendible para cualquiera que lo haga». Este informe busca dónde no lo es. Corren en paralelo QA-A (motor y números) y QA-C (contrato, SQL y seguridad): donde un hallazgo toca su terreno, se dice.

> Estado: COMPLETO. Partes: resumen · método · §1 por rol · hallazgos B-01 a B-54 · §2 colores y tema oscuro · §3 el árbol en Identificar · §4 tuberías, «si falla hoy», árbol del choke y filosofía · §5 papel · §6 contraste y movimiento · §7 las 10 mejoras · anexo.

## Resumen

- **54 hallazgos:** 1 bloqueante · 9 altos · 27 medios · 17 bajos.
- **Los 5 más graves:**
  1. **B-01 (bloqueante).** El supervisor no ve en ninguna de sus pantallas el orden de cierre («cerrar primero los más acuatosos») ni las tres frases del colchón, justo con P-201B parada. La prueba S-3 de U2 §10.1 no se puede pasar.
  2. **B-04 (alto).** Contestar una pregunta deja «confirmó {persona}» en otro paso que nadie tocó: el operador contesta «¿De dónde vino el corte?» y queda «¿Estaba programado? … confirmó Jairo Peña». Es una confirmación fabricada en el rastro que va a la ANH (también para QA-C).
  3. **B-02 y B-03 (altos).** El operador ve la misma parada dos veces, con dos juegos de preguntas distintos, y además le piden «Confirmar LC-07», «Confirmar LC-16» y «Confirmar lo que contesté» sobre lo que dedujo TRIM sin que él contestara nada. A «¿Qué me falta contestar ahora?» no se responde en 10 segundos.
  4. **B-06 (alto).** «Si falla hoy» pone seis equipos empatados en el puesto 1 con techos «hasta 9.394», y P-201A y P-201C, que hoy valen más y no tienen instrumento, caen al puesto 7. Se pierde el mensaje que la lista existe para dar (U2 §6.4).
  5. **B-05 (alto).** En WhatsApp, «2) Algo está mal» no queda registrado y le devuelve el trabajo al operador («Avísele a su supervisor…»). En la pantalla, el mismo botón sí crea la revisión.
- **Lo que sí cumple** (se probó, no se repite abajo):
  - el gerente no ve códigos de la ANH, ni N1/N2, ni la palabra «choke» (texto, `aria-label` y papel);
  - «limita» nunca va en rojo: es gris con doble contorno en la tubería, en el agua, en Turno y en la Filosofía;
  - la tubería se recorre con teclado (Tab, flechas, Enter), con `aria-expanded`, foco visible y una frase completa para el lector;
  - el operador nunca ve «¿Dónde se trabó?», «afuera» ni «yacimiento» como opción;
  - «Pedir a producción» cuesta 2 toques y producción lo ve en «REVISAR»;
  - los textos de validación de las capacidades coinciden palabra por palabra con U2 §8.4;
  - el estado vacío de La Zarza en la tubería del campo usa el texto de U2 §1.5;
  - el panel de calidad de confiabilidad sigue U2 §4.6;
  - con «reducir movimiento» no queda ninguna animación;
  - a 320, 390 y 1280 px no hay desplazamiento de lado en las 201 capturas del primer lote.

## Cómo se hizo

- **Servidor y datos.** Servidor de desarrollo en `http://localhost:5173`, con `VITE_FUENTE=demo` y el reloj del demo en el 2-oct-2026 a las 14:00. Las escrituras del demo viven en el navegador de cada contexto: no se tocó el estado de QA-A ni el de QA-C, ni el repositorio.
- **Navegador.** Scripts propios con Playwright: Chromium y, para el teléfono del operador, WebKit con el perfil «iPhone 14». No se corrió `npm run e2e`.
- **Recorrido.**
  - Primer lote: 67 direcciones a 1280, 390 y 320 px (201 capturas), con texto, desbordes y letra chica medidos en cada una.
  - Tema oscuro: 10 pantallas a 1280 y 390 px.
  - Papel: 9 pantallas en PDF A4 con `emulateMedia({ media: 'print' })`.
  - Movimiento: 5 pantallas con y sin `prefers-reduced-motion`.
- **Escenarios con clics.** Corregir dónde se trabó (sup, prod, jefe, conf); «En el yacimiento» y «¿Qué lo muestra?»; «Pedir a producción»; «Algo está mal»; «¿De dónde vino el corte?»; el chat de WhatsApp de punta a punta; la tubería con teclado; abrir los tramos del árbol; «Ver como tabla»; la Filosofía con sus pasos 2 y 3 y una capacidad inválida; el tanque de crudo de Guacamayo; las cascadas de 12 meses; la confirmación en lote en Turno.
- **Rutas de capturas.** La carpeta base es `/private/tmp/claude-501/-Users-hollman/0809a9f7-4f6b-4a1e-b5b0-972baa33e07f/scratchpad/qa-b/` (en adelante, `qa-b/`):
  - `qa-b/cap1/` primer lote · `qa-b/cap-oscuro/` tema oscuro · `qa-b/esc/` escenarios, PDF y `_log.txt` · `qa-b/trozos/` y `qa-b/evidencia/` recortes;
  - scripts: `qa-b/capturar.mjs`, `qa-b/escenarios.mjs`, `qa-b/textos-info.mjs`, `qa-b/movimiento.mjs`.
  - Es una carpeta temporal de la sesión: si se borra, los scripts regeneran todo contra el mismo servidor.
- **Lo que no se pudo recorrer como se pidió:**
  - `plan` y `cont` están apagados en el MVP (`ROLES_V2`): `#/plan/…` y `#/cont/…` abren Producción como Marcela Ríos. Es así por diseño (`url.ts`).
  - `prod` solo tiene La Ceiba y El Palmar: `#/prod/produccion/zarza/curso` abre La Ceiba sin aviso (B-38). La Zarza se recorrió con `ger`, `jefe`, `reg` y `adm`; Morichal, con `ger`, `jefe`, `conf`, `reg` y `adm`.
  - `sup`, `oper` y `tec` solo tienen La Ceiba.
  - Regulatorio no tiene vista de portafolio (`#/reg/regulatorio/ceiba~portafolio/curso` abre La Ceiba).

**Cómo leer cada hallazgo:** id y severidad · rol · ruta y ancho · *Qué se ve* (con la captura) · *Lo que dice la especificación* (con su sección) · *Arreglo* (con el texto exacto cuando es de palabras).

Severidades:
- **bloqueante:** impide la tarea del rol o una prueba de U2 §10;
- **alto:** engaña o hace fallar una prueba con usuarios;
- **medio:** confunde, contradice la especificación o cuesta toques de más;
- **bajo:** pulido.

## §1 Por rol: ¿responde en 10 segundos su pregunta?

| Rol | Pregunta (PLAN-MAESTRO §4 · U2 §3.1) | Pantalla | ¿En 10 s? | Por qué |
|---|---|---|---|---|
| ger | «¿Qué campo y qué equipos me están costando barriles…?» · «¿En qué tramo se me trabó cada campo, y con qué equipos?» | Resumen › POR CAMPO y DÓNDE SE TRABÓ | **Sí a 1280; a 390 no** | La frase «La Ceiba: 87 % en los pozos (LC-11, LC-04)» responde. Pero cada campo ocupa de 5 a 7 renglones (B-13), el mismo barril sale con dos equipos (B-12) y en el teléfono el bloque está a 4 o 5 pantallas del comienzo |
| prod | «¿Qué limita hoy al campo y dónde rinde más evitar la próxima parada?» | Producción › LA TUBERÍA DEL CAMPO | **Sí, con trampa** | «◄ LIMITA · 11.360» y la frase se leen enseguida. Pero «a la planta le sobran 1.640: lo que den de más los pozos pasa» es falso hoy, con P-201B parada (B-14) |
| sup | «¿Qué paró en mi turno… y qué me falta confirmar?» · «¿…en qué orden cierro si se llena el tanque?» | Turno, Bombas, Identificar | **Lo primero sí; lo segundo no** | CIERRE DE HOY y «Pasando ahora» responden lo primero. El orden de cierre no está en ninguna de sus pantallas (B-01) |
| oper | «¿Qué me falta contestar ahora?» | Identificar en el teléfono | **No** | Siete «filas», paradas repetidas con preguntas distintas (B-02), botones para confirmar lo que no contestó (B-03), 17 botones por tarjeta (B-23) |
| jefe | «¿Qué equipo me quita más barriles si falla hoy, y qué no debo intervenir…?» | Riesgo › SI FALLA HOY | **A medias** | «Ojo: P-201A y P-201C valen más… no conviene intervenirlas hoy» responde J-1. Pero la tabla tiene seis equipos empatados en el puesto 1 (B-06) |
| conf | «¿Dónde pongo el próximo instrumento…?» | Riesgo › SI FALLA HOY | **A medias** | La línea «¿Dónde va el próximo instrumento? … P-201A y P-201C (puesto 7…)» responde. La tabla la contradice: dice que no son de lo primero (B-06) |
| tec | «¿Qué me toca hoy?» | Mi trabajo | **Sí** | No hay nada del modelo en Mi trabajo. En Identificar, lo mismo que oper (B-02, B-23) |
| reg | «¿Mi reporte a la ANH pasa?» | Regulatorio | **Sí en pantalla; no en papel** | «No se puede publicar todavía · El período incluye días sin cierre publicado» y el árbol de la circular responden. El árbol impreso es ilegible (B-10) |
| adm | «¿Está bien configurado el campo…?» | Configuración › Filosofía operacional | **Sí** | Filtros «Sin responder · Propuestas de TRIM · Casos de borde», la propuesta con su porqué y la validación de capacidades responden. Detalles en B-30 y B-49 |
| plan, cont | — | — | **No aplica** | Apagados en el MVP: su dirección abre Producción |

## Hallazgos bloqueantes y altos

### B-01 · bloqueante · sup (también oper, tec y jefe en La Ceiba) · el orden de cierre no está en ninguna pantalla del supervisor
- **Ruta y ancho:** `#/sup/bombas/ceiba/curso` (detalle de P-201B), `#/sup/bombas/ceiba/curso/P-201B` (ficha), `#/sup/turno/ceiba/curso`, `#/sup/causa/ceiba/curso`, `#/sup/pozos/ceiba/curso` · 390 y 1280 px.
- **Qué se ve:**
  - Con P-201B parada, el detalle de la bomba dice «MIENTRAS ESTÉ PARADA · POZOS QUE CERRÓ · 2 · LC-07, LC-16» y «EL TANQUE · Al parar 78,7 % · Agua sin salida 44.100 bbl/d · Debía aguantar 1,8 h». La ficha dice «Detenida. P-201A y P-201C no alcanzan a tomar toda su agua…».
  - Se buscó por texto en las seis pantallas del supervisor «acuatoso», «LC-02», «orden de cierre», «cerrar primero», «43.675» y «nivel no sube»: **0 coincidencias**.
  - El supervisor no tiene la pantalla Agua.
  - P-201A y P-201C, las dos bombas que hoy sacan toda el agua, ni siquiera salen en su lista de Bombas: dice «1 bomba» y «Próxima en fallar: ninguna» (`qa-b/cap1/sup_bombas_ceiba_curso__1280.png`).
  - En Morichal, con la bomba en marcha, confiabilidad sí ve «ORDEN DE CIERRE». En La Ceiba, con P-201B parada y dos de tres bombas sin instrumento, nadie de campo lo ve.
  - Capturas: `qa-b/esc/detalle-bomba-sup-ceiba-390.png`, `qa-b/esc/sup-ficha-P201B-390.png`. Comparar con `qa-b/esc/detalle-bomba-conf-morichal-1280.png`.
- **Lo que dice la especificación:**
  - U2 §3.1, fila sup: «¿Qué está frenando el campo ahora, y en qué orden cierro si se llena el tanque?»; «en la ficha de la bomba, el colchón y el orden de cierre».
  - U2 §5.6: Bombas › ficha de la bomba de reinyección, «En corto: las tres frases de §5.3», para sup, oper, jefe, conf y tec.
  - U2 §9.6: el boceto «LA TUBERÍA DEL AGUA, HOY».
  - U2 §10.1, prueba S-3: «≤ 30 s, con LC-02, LC-10 y LC-01, en 4 de 5».
  - `roles.ts`, foco del supervisor: «Si una para, cierras en el orden que menos cuesta».
- **Arreglo:** en el detalle y en la ficha de toda bomba de reinyección, para los roles con Bombas, el bloque de U2 §9.6:
  > «LA TUBERÍA DEL AGUA, HOY · Entra 174.033 bbl/d · Caben 178.500 (P-201A + P-201C) · Tanque 89,6 % · alto-alto 90 % · El nivel no sube: P-201A y P-201C toman lo que entra.»
  > «Si para otra bomba, cierre primero los más acuatosos: {orden del motor} → se pierden {x} bbl/d (parejo, {y}).»

  Con la bomba parada, el orden que se muestra es el de **la que sigue en riesgo** (`ordenDeCierre` con una sola bomba), no solo «POZOS QUE CERRÓ».

### B-02 · alto · oper, tec · la misma parada se pregunta dos veces, con dos juegos de opciones
- **Ruta y ancho:** `#/oper/causa/ceiba/curso` y `#/tec/causa/ceiba/curso` · 390, 320 y 1280 px.
- **Qué se ve:**
  - LC-21 aparece en «POR IDENTIFICAR · SIN ARRANCAR» con «POR QUÉ PARÓ» (4 botones: «Cierre para prueba o intervención del pozo», «Fuga o daño en la línea de flujo», «Orden de producción: nominación o restricción del comprador», «Falla del controlador o de un instrumento del pozo»), «Qué encontró» y «Registrar respuesta».
  - Más abajo aparece otra vez en «POR CONTESTAR · ÁRBOL DE CAUSAS», con «¿Qué lo paró?» (10 botones distintos), «¿Este cierre estaba programado?» y «¿Se perdió crudo o gas que ya había salido?».
  - Entre los dos, la tarjeta del árbol dice: «Lo que encontró se registra en «Por identificar» (o en «No conformidades», si ya arrancó): con eso TRIM propone los 6 pasos.» Y debajo pone sus propios botones.
  - Lo mismo pasa con LC-08 («NO CONFORMIDADES» y «SIN CAUSA»).
  - En el teléfono, la pantalla mide 4.830 px de alto: casi seis pantallas.
  - Capturas: `qa-b/trozos/oper_causa_ceiba_curso__390__1.png`, `__3.png` y `__5.png`.
- **Lo que dice la especificación:**
  - U1 §2.7: oper y tec ven «POR CONTESTAR (solo las preguntas)».
  - U1 §2.4: «una pregunta por pantalla, de 2 a 6 botones».
  - PLAN-MAESTRO §4: «Una pregunta por vez».
  - U2 §10.1, O-1.
- **Arreglo:**
  - Para oper y tec, una sola lista «POR CONTESTAR», con una tarjeta por parada. La pregunta del árbol reemplaza a la de «Por identificar», o al revés, pero no las dos.
  - Quitar la línea «Lo que encontró se registra en «Por identificar»…» donde la tarjeta ya pregunta.
  - Encabezado de la lista: «Conteste aquí, una pregunta a la vez. Lo técnico lo revisa su supervisor.»

### B-03 · alto · oper, tec · se le pide confirmar lo que dedujo TRIM, sin haber contestado nada
- **Ruta y ancho:** `#/oper/causa/ceiba/curso` · 390 px.
- **Qué se ve:**
  - En «POR CONFIRMAR · 2», la cascada LC-07 y LC-16 (deducida por señal) le dice al operador «Confirme lo suyo una por una, en las filas de abajo», con «Confirmar LC-07» y «Confirmar LC-16».
  - En LC-05, el botón principal «Confirmar lo que contesté» está activo antes de que el operador conteste nada. Lo que confirma son los «¿Estaba programado?» y «¿Se perdió algo?» que dedujo TRIM.
  - Capturas: `qa-b/trozos/oper_causa_ceiba_curso__390__2.png`, `qa-b/esc/oper-lc05-antes-390.png`.
- **Lo que dice la especificación:**
  - U1 §2.2, caso A: «el operador no la confirma, porque no contestó nada».
  - U1 §2.4: «Para oper y tec: «Confirmar lo que contesté»», después de contestar.
  - S1, riesgo R-E: lo confirmado tiene que significar que una persona lo miró.
- **Arreglo:**
  - Las paradas sin pregunta abierta no van en la lista del operador. Si se dejan, plegadas y con el texto: «Estas ya las dedujo TRIM: no tiene que hacer nada.»
  - «Confirmar lo que contesté» aparece solo después de una respuesta suya.
  - Si se quiere que avale lo que es de su terreno, preguntarlo: «¿Está bien? No estaba programado y no se perdió nada» → «Sí, así fue» · «Algo está mal».

### B-04 · alto · oper, jefe (todo el que contesta una pregunta de campo) · contestar una pregunta deja «confirmó» en otro paso
- **Ruta y ancho:** `#/oper/causa/ceiba/curso` (LC-05) · 390 px; `#/jefe/causa/guacamayo/doce` (LACT-01) · 1280 px.
- **Qué se ve:**
  - El operador solo toca «Del campo: pórtico, red de media o subestación» en «¿De dónde vino el corte?». La tarjeta pasa a decir «¿Estaba programado? No, fue de repente · **confirmó Jairo Peña · 14:00**».
  - Igual con el jefe en LACT-01: contesta «El tanque de crudo está lleno» y el paso 4 queda «No planeada · confirmó Camilo Rueda · 14:00».
  - Nadie confirmó ese paso.
  - Además, el operador no ve lo que contestó: la pregunta desaparece y su respuesta solo queda, plegada en lo técnico, como «¿Dónde se trabó? En la planta o estación · **dijo Jairo Peña** · 14:00 · TRIM lo dedujo de lo que contestó…». El rastro le atribuye el tramo, que es justo lo que nunca se le pregunta.
  - Captura: `qa-b/esc/oper-lc05-tecnico-390.png`. Secuencia en `qa-b/esc/_log.txt` (líneas `[oper-lc05]` y `[lact]`).
- **Lo que dice la especificación:**
  - U1 §1.0, punto 2.
  - U1 §2, marcas de procedencia: «dijo {persona}» no es lo mismo que «confirmó {persona}».
  - U2 §3.2: al operador «nunca se le pide escoger el tramo».
  - S1, riesgo R-E.
- **Arreglo:**
  - Una respuesta solo cambia los pasos que esa respuesta deduce, y con «dijo {persona}». Los demás siguen con «TRIM lo dedujo».
  - En la tarjeta del operador, repetir su respuesta: «Usted contestó: Del campo: pórtico, red de media o subestación · 14:00 · Cambiar».
  - En lo técnico: «En la planta o estación · TRIM lo dedujo de lo que contestó Jairo Peña».
  - **Para QA-C:** revisar `responderPreguntaAnh` y el paso `planeacion`.

### B-05 · alto · oper · en WhatsApp, «Algo está mal» no queda registrado y el cierre no se ve
- **Ruta y ancho:** `#/oper/causa/ceiba/curso` › «Ver mi chat de WhatsApp» · iPhone 14 (WebKit).
- **Qué se ve:**
  - Tras «2 Rodamientos» y «1 Recalentada», el chat se cierra y la parada pasa a «Declaradas».
  - El cierre «TRIM · Así queda lo que usted contestó: P-201B, rodamientos y cámara de empuje: recalentada… 1) Está bien · 2) Algo está mal» solo aparece si el operador busca la parada en «Declaradas» y abre «Ver el chat de Jairo Peña». Es su propio chat, nombrado en tercera persona.
  - Si toca «2 Algo está mal», TRIM contesta: «Entendido. Avísele a su supervisor qué está mal: él lo corrige en la pantalla de Identificar.» La parada no queda «para revisar»: 0 en la página.
  - El código lo admite: «Algo está mal todavía no se guarda en la parada» (`src/widgets/whatsapp/Telefono.tsx`).
  - El primer mensaje trae «con 30.100 bbl/d libres entre las dos: el cabezal de disposición las limita a unos 89.250 cada una».
  - Capturas: `qa-b/esc/oper-chat-iphone.png`, `qa-b/esc/chat-algo-mal.png`.
- **Lo que dice la especificación:**
  - U1 §2.6: «"2) Algo está mal" responde: «Entendido. Lo revisa el supervisor en la pantalla de Identificar; usted no tiene que hacer nada más»».
  - PENDIENTES-TANDA3, P3-UI punto 3: la escritura de revisión ya existe.
- **Arreglo:**
  - «2 Algo está mal» usa la misma escritura que el botón de la pantalla (`POST /api/anh/paradas/:id/revision`) y responde: «TRIM · Entendido. Lo revisa su supervisor en Identificar; usted no tiene que hacer nada más.»
  - El cierre «Así queda lo que usted contestó» sale en el mismo chat, sin cerrarlo.
  - Para el propio operador, el botón dice «Ver mi chat de WhatsApp».
  - Primer mensaje sin cifras de cabezal: «TRIM · P-201B de La Ceiba paró a las 03:52. Las otras dos bombas toman parte del agua: si no arranca a tiempo, puede haber que cerrar pozos.»

### B-06 · alto · jefe, conf · «Si falla hoy»: seis empates con techo y las bombas sin instrumento en el puesto 7
- **Ruta y ancho:** `#/jefe/riesgo/ceiba/curso`, `#/conf/riesgo/ceiba/curso`, `#/conf/riesgo/morichal/curso` · 1280 y 390 px.
- **Qué se ve:**
  - Seis equipos empatados en el puesto 1 con «hasta 9.394 bbl/d · sin colchón»: C-401, K-101, LACT-01, SE-2, TK-102 y V-101. En Morichal, «hasta 16.920».
  - P-201A y P-201C, las hermanas de la bomba parada y sin instrumento, quedan en el puesto 7.
  - La nota de abajo dice que «hasta» «es un techo… no descuenta respaldo ni tanque de crudo». Aun así, el techo de un equipo con tanque (LACT-01, TK-102) se ordena igual que una cifra exacta.
  - La línea de arriba dice «subieron al puesto 7».
  - Captura: `qa-b/evidencia/si-falla-hoy-empates.png`.
- **Lo que dice la especificación:**
  - U2 §6.3: K-101 y SE-2 en los puestos 1 y 2; P-201A y P-201C «suben al tercer puesto»; LACT-01 «sin dato: falta el colchón del tanque de crudo»; C-401 «sin dato: falta saber a qué pozos cierra»; H-302 «0 mientras el respaldo esté bien».
  - U2 §6.4: «2 de los 3 primeros no tienen instrumento».
  - U2 §10.1, C-1.
  - Las cifras son de QA-A; aquí se juzga el orden y su lectura.
- **Arreglo:**
  - No ordenar techos junto con cifras. Los «hasta» van aparte, bajo «Sin cifra todavía · techo si cierran todos sus pozos», o como «sin dato: {lo que falta}» (U2 §6.3).
  - La lista ordenada empieza por las cifras calculadas.
  - Línea de arriba: «Cambió hoy: P-201A y P-201C subieron al puesto 3 porque P-201B está parada. Ninguna de las dos tiene instrumento: TRIM no verá venir su falla.»

### B-07 · alto · jefe, conf · confirmar una cascada o una parada de varios días es fila por fila
- **Ruta y ancho:** `#/jefe/causa/morichal/doce`, `#/conf/causa/morichal/curso`, `#/jefe/causa/ceiba/curso` · 1280 px.
- **Qué se ve:**
  - Ni el jefe ni confiabilidad tienen «Confirmar» en una parada con varias filas. Ven: «Varias de una vez las confirman supervisión o producción, que firman el día: confírmelas una por una, en las filas de abajo.»
  - La caída de SE-2 del 18-may en Morichal (41 pozos, 26.215 bbl) tiene 123 filas: **123 toques**.
  - MN-41, una sola parada de dos días, pide 2 toques. LC-07 y LC-16, 2 toques.
  - Fuente: `qa-b/esc/_log.txt` (`[se2]`, `[corregir-jefe]`, `[corregir-conf]`).
- **Lo que dice la especificación:**
  - U2 §4.3: «Confirmar la cadena propuesta de una parada · sup, prod, jefe, conf · 1: «Confirmar»».
  - U2 §4.4, caso 1: «Toques: uno solo. Para la ANH son 41 filas».
- **Arreglo:**
  - Para jefe y conf, un botón por parada: «Confirmar esta parada (41 pozos · 123 filas)».
  - Si producto deja el lote solo para sup y prod, entonces al jefe no se le ofrece confirmar fila por fila: «Esta cascada la confirma supervisión o producción de un toque. Usted puede corregir un paso.»

### B-08 · alto · prod, jefe, conf · MES A MES por tramo: los meses atenuados cambian el significado del gris
- **Ruta y ancho:** `#/prod/diferidos/ceiba/cerrado` › «Por dónde se trabó» (también `#/jefe/diferidos/morichal/…`) · 1280 px.
- **Qué se ve:**
  - Los meses que no son el escogido se pintan más claros. El gris de «en los pozos» de esos meses queda igual al de «en la planta o estación» de la leyenda, y el de la planta, igual al de «afuera».
  - Solo septiembre (el escogido) usa los grises de la leyenda.
  - Julio (16.549 bbl en la planta) se lee como «afuera».
  - El mismo gráfico del gerente (bbl/d, en Resumen y Diferidos) no atenúa y se lee bien.
  - Capturas: `qa-b/evidencia/mes-a-mes-desvanecido.png`; comparar con `qa-b/trozos/mesames_ger_zoom.png`.
- **Lo que dice la especificación:** U2 §7.4, «cada barra se apila en los cuatro tramos, en grises de distinta luminancia (`--dato-1` a `--dato-4`)… La leyenda es de texto»; U1 §9.3.
- **Arreglo:** en la vista por tramo, no atenuar. El mes escogido se marca con contorno, como en el gráfico del gerente, y con su rótulo en negrilla.

### B-09 · alto · prod, conf, adm · «QUÉ LIMITÓ, DÍA POR DÍA»: la leyenda de la planta es la de «sin identificar»
- **Ruta y ancho:** `#/prod/produccion/ceiba/curso` (también en Planta) · 1280 px.
- **Qué se ve:**
  - La leyenda dice: «Po · los pozos» liso oscuro, «Pl · la planta» rayado, «Af · afuera» punteado y «sin identificar» rayado claro con borde discontinuo.
  - En las barras de abajo, la planta es gris liso (2-oct, 573 bbl) y lo rayado es «sin identificar».
  - Quien lee la leyenda toma lo rayado por la planta.
  - Captura: `qa-b/evidencia/que-limito-leyenda.png`.
- **Lo que dice la especificación:** U2 §7.1: cada celda de la franja con «un patrón de gris propio de ese tramo»; debajo, barras «en grises apilados, más un tramo gris discontinuo para «sin identificar»».
- **Arreglo:** una leyenda por dibujo: «Franja: Po los pozos · Pl la planta · Af afuera» y «Barras: ■ en los pozos · ■ en la planta · ┄ sin identificar». O bien, en las barras, los mismos patrones de la franja.

### B-10 · alto · reg · el árbol de la circular impreso sale una letra por renglón
- **Ruta y ancho:** `#/reg/regulatorio/morichal/cerrado` › imprimir (PDF A4).
- **Qué se ve:**
  - En el papel, cada renglón «Pérdida: TRIM todavía no tiene registro de pérdidas · dif_perd PERDIDA» sale con **una letra por renglón**. La columna queda de cero de ancho porque el texto del ⓘ («Pérdida: La pérdida es lo producido que no se vendió…») se imprime en la misma fila y la pisa («Pér0da»).
  - Se gastan unas dos hojas y media por tramo.
  - El encabezado «ÁRBOL DE CAUSAS · COMO LA CIRCULAR» sale en tres renglones apretados.
  - En pantalla, a 320 px, se lee bien.
  - Captura: `qa-b/esc/papel-reg_regulatorio_morichal_cerrado.pdf`, hojas 1 a 3.
- **Lo que dice la especificación:** la tarea, «en papel, lo plegado sale desplegado y no hay tablas cortadas»; U2 §2.7, «el bloque no se parte».
- **Arreglo:** en el papel, el texto del ⓘ va en su propio renglón debajo del rótulo, no en la misma fila. O una sola vez al final del árbol, como ya hace la tubería con sus ⓘ: «Pérdida: lo producido que no se vendió (derrame, tea, pitera). Va aparte y nunca se suma a lo diferido.»

## Hallazgos medios

### B-11 · medio · sup, prod, jefe, conf · el porqué de LC-07 y LC-16 no dice «tanque» ni «porque»
- **Ruta y ancho:** `#/sup/causa/ceiba/curso` (también prod y jefe) · 1280 y 390 px.
- **Qué se ve:**
  - Paso 2: «TRIM lo dedujo: P-201B mueve el agua de 18 pozos: si para, se frenan varios». En toda la tarjeta no aparece por qué cerraron los pozos: el tanque de agua llegó al alto-alto.
  - Paso 1: «…le cortó el paso al pozo; la parte va en la descripción» (no hay ninguna descripción a la vista).
  - Pasos 5 y 6: «la misma razón del paso 1».
  - Falta «┄ falta la parte de P-201B».
  - Captura: `qa-b/esc/corregir-sup-1280.png`.
- **Lo que dice la especificación:**
  - U2 §4.1: el porqué del eslabón 2 va «siempre con la palabra «porque»».
  - U2 §4.2: «porque {pozo} cerró por el tanque de agua lleno mientras {bomba} estaba parada».
  - U2 §9.3: «03:52 P-201B paró ─ 1,85 h de colchón ─ 05:43 tanque lleno: cerraron» y «┄ falta la parte de P-201B: la dice quien la abra».
  - U2 §10.1, S-1: explicar «porque se llenó el tanque con P-201B parada».
- **Arreglo:**
  - Paso 2: «TRIM lo dedujo porque LC-16 y LC-07 cerraron por el tanque de agua lleno mientras P-201B estaba parada (03:52 paró · 05:43 tanque lleno).»
  - Paso 1: «TRIM lo dedujo: la falla es de la bomba P-201B; la parte la dice quien la abra.»
  - Paso 6: «Parada estación/bombeo afecta pozos · ┄ falta la parte de P-201B: la dice quien la abra».

### B-12 · medio · ger, prod · el mismo barril con dos equipos y dos tramos en la misma pantalla
- **Ruta y ancho:** `#/ger/resumen/ceiba/curso`, `#/ger/diferidos/ceiba/cerrado`, `#/prod/diferidos/ceiba/cerrado` · 1280 y 390 px.
- **Qué se ve:**
  - «POR EQUIPO» dice «SE-2 · energía eléctrica · 118» en octubre y «SE-2 · energía eléctrica · 3 pozos · 239» en septiembre.
  - «DÓNDE SE TRABÓ» cuenta esos mismos barriles «en los pozos (LC-05)» y dentro de «La Ceiba: 87 % en los pozos (LC-11, LC-04)».
  - El chip «3 pozos» y la línea de la planta («Afectó a varios pozos») dicen lo contrario de «en los pozos».
  - En Diferidos de producción, LC-04 vale 2.261 en «POR TRAMO» y 2.126 en «POR EQUIPO», en la misma pantalla.
  - Capturas: `qa-b/evidencia/ger-diferidos-se2-vs-pozos.png`, `qa-b/trozos/ger_resumen_ceiba_curso__390__0.png`, `qa-b/esc/diferidos-prod-ceiba-portramo.png`.
- **Lo que dice la especificación:**
  - U2 §0, principio 6 (la misma cifra arriba de todas las vistas).
  - U2 §4.4, caso 8 (la baja tensión que tumba un solo pozo va «En el pozo»).
  - U2 §10.1, G-1.
- **Arreglo:**
  - En «POR EQUIPO», una baja tensión de un solo pozo se nombra por el pozo: «LC-04, LC-12 y LC-06 · baja tensión, cada una de un solo pozo (SE-2 siguió) · 239».
  - Si se deja SE-2, el chip dice «3 paradas de un solo pozo» y no «3 pozos».
  - En «POR TRAMO», el ⓘ de LC-04: «2.126 de su electrosumergible y 135 de baja tensión».

### B-13 · medio · ger · «Dónde se trabó» ocupa de 5 a 7 renglones por campo y sus palabras no se entienden solas
- **Ruta y ancho:** `#/ger/resumen/ceiba~portafolio/curso`, `#/ger/resumen/ceiba/curso`, `#/ger/diferidos/ceiba/cerrado` · 1280, 390 y 320 px.
- **Qué se ve:**
  - Por campo, siete piezas una debajo de otra:
    - la barra;
    - «pozos 1.253 bbl · 158 por confirmar ⓘ»;
    - «Morichal Norte: 100 % en los pozos (MN-41, MN-22)»;
    - «lo no planeado de cada tramo ⓘ»;
    - un renglón por tramo, por ejemplo «en los pozos 1.253 bbl · no planeado 1.167 (93 %) · 86 sin saber · MN-41, MN-22»;
    - la frase de desembotellar;
    - la leyenda.
  - La frase no dice qué es cada equipo: «P-201B» y «LC-05» van sin familia.
  - «158 por confirmar» y «86 sin saber» no se entienden sin el ⓘ.
  - La primera porción de la barra (pozos, 118) no lleva su palabra encima.
  - A 390 px, el bloque queda a 4 o 5 pantallas del comienzo del Resumen.
  - Capturas: `qa-b/evidencia/ger-donde-se-trabo-390.png`, `qa-b/cap1/ger_resumen_ceiba_portafolio_curso__1280.png`.
- **Lo que dice la especificación:**
  - U2 §3.1: el gerente ve «una barra por campo… con su frase».
  - U2 §9.2: «Se trabó sobre todo en los pozos: LC-11 y LC-04 (electrosumergibles).» y los segmentos «con su palabra encima».
  - U1 §1.1: «nombre corto y familia».
  - U2 §10.1, G-1: ≤ 10 s.
- **Arreglo:**
  - Dos renglones por campo. Primero, la barra con la palabra en cada segmento (al lado, si no cabe encima). Después, la frase del motor con la familia:
    > «Se trabó sobre todo en los pozos: LC-11 y LC-04 (electrosumergibles). 355 bbl todavía sin identificar.»
  - Lo no planeado y la frase de desembotellar van plegados bajo «Ver más de La Ceiba».
  - «158 por confirmar» → «158 bbl con el tramo sin confirmar».
  - «86 sin saber» → «86 bbl sin saber si fueron planeados».

### B-14 · medio · prod, conf, adm · «A la planta le sobran 1.640: lo que den de más los pozos pasa», cuando hoy no pasa
- **Ruta y ancho:** `#/prod/produccion/ceiba/curso`, `#/prod/planta/ceiba/curso` · 1280, 390 y 320 px.
- **Qué se ve:**
  - La frase grande dice: «A la planta le sobran 1.640 bbl/d: lo que den de más los pozos pasa, hasta 1.640 bbl/d.»
  - Debajo de la planta, en letra de 10,5 px: «hoy, sin P-201B: 178.500 de 267.750 bbl/d de agua, unos 9.050 bbl/d de crudo».
  - Eso es menos de lo que «PASA HOY» (9.394). Hoy, con el agua llena (174.033 de 178.500), un barril más de pozo no pasa.
  - La línea discontinua de «lo que queda hoy» no se dibuja dentro de la caja, y los carriles (crudo, agua, gas) van como texto debajo.
  - Captura: `qa-b/evidencia/tuberia-planta-hoy.png`.
- **Lo que dice la especificación:**
  - U2 §2.3: «Lo que queda hoy por un equipo parado | Línea gris discontinua por dentro del subtramo»; en escritorio, los carriles van dentro de la caja.
  - U2 §2.2, «Lo que esto le dice a producción».
  - U2 §10.1, P-1.
- **Arreglo:**
  - Cuando un equipo parado deja la planta por debajo de lo que pueden dar los pozos, una segunda frase:
    > «Hoy no: con P-201B parada, el agua de la planta está llena (174.033 de 178.500 bbl/d). Lo que den de más los pozos no pasa hasta que vuelva.»
  - Dibujar la raya discontinua dentro de la caja de la planta.
  - **Para QA-A:** por qué «unos 9.050» queda por debajo de «pasa hoy 9.394».

### B-15 · medio · todos los que ven la tubería · en tema oscuro, «lo oscuro es lo que pasa ahora» es falso
- **Ruta y ancho:** `#/prod/produccion/ceiba/curso` en oscuro · 1280 y 390 px.
- **Qué se ve:**
  - El «¿cómo se lee?» dice «Lo oscuro es lo que pasa ahora; lo claro, lo que cabría».
  - En oscuro es al revés: el relleno de «pasa hoy» sale claro (`--dato-2` = #c9ccd0) y lo vacío sale oscuro. El cuadrito de «PASA HOY» también sale claro.
  - Captura: `qa-b/evidencia/tuberia-oscuro.png`.
- **Lo que dice la especificación:**
  - U2 §1.5, línea de lectura.
  - U2 §2.3: «el oscuro es `--dato-2` y el claro, `--panel2`… en claro y en oscuro».
  - U2 §2.8: «Tema oscuro: los mismos tokens».
- **Arreglo:** un texto que no dependa del tema: «Lo relleno es lo que pasa ahora; lo vacío, lo que cabría.» Cambiarlo también en U2 §1.5.

### B-16 · medio · prod, conf, adm · la tubería del agua: «casi iguales» sin decir con quién, un empate exacto y un «le sobran» con otro sentido
- **Ruta y ancho:** `#/prod/agua/ceiba/curso` (también conf y adm) · 1280, 390 y 320 px.
- **Qué se ve:**
  - «BOMBAS DE REINYECCIÓN 267.750 · le sobran 43.675 · casi iguales» y «POZOS INYECTORES 267.750 · le sobran 43.675 · ◄ LIMITA casi iguales».
  - Dos cajas con la misma cifra y la misma holgura. «Casi iguales» no dice con quién ni cuánto, y es un empate exacto.
  - En el agua, «le sobran» se mide contra lo que entra; en la tubería del campo, contra el tramo que limita.
  - A 320 px, «casi iguales» queda solo dentro de la tarjeta de las bombas.
  - Capturas: `qa-b/evidencia/agua-casi-iguales.png`, `qa-b/trozos/prod_agua_ceiba_curso__320__0.png`.
- **Lo que dice la especificación:**
  - U2 §1.5, «Casi iguales»: «{Tramo A} y {tramo B} están casi iguales (menos de {u} % de diferencia): lo que se gane en uno lo frena el otro.»
  - U2 §1.5, «Empate exacto».
  - U2 §1.5, ⓘ de «le sobran».
  - U2 §2.3: «contorno de doble grosor discontinuo en los dos tramos».
  - U2 §5.2: las bombas tienen 270.000 de placa.
- **Arreglo:**
  - Bajo el dibujo: «Las bombas y los inyectores están casi iguales (las bombas, 270.000 de placa; el cabezal las deja en 267.750): lo que se gane en uno lo frena el otro.»
  - En el agua, «le sobran 43.675» → «cabe más: 43.675 bbl/d».
  - **Para QA-A:** si el empate es exacto, va el texto de empate de §1.5.

### B-17 · medio · prod, conf, adm, sup · el agua dice en presente dos cosas contrarias
- **Ruta y ancho:** `#/prod/agua/ceiba/curso`, `#/sup/bombas/ceiba/curso/P-201B` · 1280 y 390 px.
- **Qué se ve:**
  - En Agua: «P-201B está parada desde el 2 de oct, 03:52: quedan 44.100 bbl/d sin salida y se pierden 1.665 bbl/d de crudo», y dos renglones abajo: «HOY · P-201A y P-201C toman lo que entra (174.033 de 178.500). El nivel no sube.»
  - En la ficha de P-201B: «Detenida. P-201A y P-201C no alcanzan a tomar toda su agua: el tanque llegó al alto-alto y hubo que cerrar parte de los pozos.»
  - Capturas: `qa-b/cap1/prod_agua_ceiba_curso__1280.png`, `qa-b/esc/sup-ficha-P201B-390.png`.
- **Lo que dice la especificación:** U2 §5.3 (las tres frases, en condicional: «Si para una, faltan 44.100…») y §9.6.
- **Arreglo:**
  - En Agua: «Si para una con todos los pozos produciendo, faltan 44.100 bbl/d: el tanque se llena en 1 a 3 h y hay que cerrar pozos.»
  - En la ficha: «Detenida desde las 03:52. A las 05:43 el tanque llegó al alto-alto y se cerraron LC-16 y LC-07. Ahora P-201A y P-201C toman lo que entra y el nivel no sube.»

### B-18 · medio · adm, conf, jefe · La Zarza (gas): la tubería del agua y «Si falla hoy» hablan en crudo
- **Ruta y ancho:** `#/adm/agua/zarza/curso`, `#/jefe/riesgo/zarza/curso` · 1280 px.
- **Qué se ve:**
  - En Agua: «BOMBAS DE REINYECCIÓN 4.000 bbl/d ≈ 8.841 de crudo · ◄ LIMITA», con los inyectores en «sin dato».
  - En «Si falla hoy», C-401 (el compresor, el equipo clave de un campo de gas) y los demás valen «hasta 3.159 bbl/d» de condensado.
  - En Planta, la tubería del campo dice: «La Zarza es un campo de gas. La tubería del gas todavía no está…».
  - Captura: `qa-b/cap1/adm_agua_zarza_curso__1280.png`.
- **Lo que dice la especificación:**
  - U2 §1.5: «Falta una capacidad firmada… «No se puede decir qué limita: falta la capacidad de {…}»», y el estado del campo de gas.
  - U2 §12, punto 19.
  - PLAN-MAESTRO §3 (solo crudo).
- **Arreglo:**
  - En Agua: «◄ limita» solo si todos los tramos tienen número. Si no: «No se puede decir qué limita: falta la admisión de los inyectores. La firma el administrador.» Sin «≈ de crudo» en un campo de gas.
  - En «Si falla hoy» de La Zarza: «La Zarza es un campo de gas: lo que cuesta una falla en gas todavía no se calcula.»

### B-19 · medio · sup · Turno trae «Si falla hoy» en lista y un puesto de una lista que el supervisor no tiene
- **Ruta y ancho:** `#/sup/turno/ceiba/curso` · 1280, 390 y 320 px.
- **Qué se ve:**
  - «Lo más frágil: el agua · Cambió hoy: P-201A y P-201C subieron al puesto 7 porque P-201B está parada…»
  - «Lo que más cuesta si falla hoy: C-401, K-101, LACT-01 y 3 más · 9.394 bbl/d cada uno, se trabaría en la planta · estimación: supone que se cierran todos sus pozos ⓘ»
  - El supervisor no tiene Riesgo: el «puesto 7» no lo puede ver en ninguna parte.
  - Captura: `qa-b/evidencia/turno-hoy-limita.png`.
- **Lo que dice la especificación:**
  - U2 §2.4, Turno: «Solo texto: «Qué limita hoy: los pozos (11.360 bbl/d)», más «Perdiéndose ahora»».
  - U2 §3.1: sup no ve «Si falla hoy» como lista.
- **Arreglo:**
  - Dos renglones: «Qué limita hoy: los pozos (11.360 bbl/d)» y «Lo más frágil: el agua. Si para otra bomba de reinyección hay que cerrar pozos, y P-201A y P-201C no tienen instrumento.»
  - Sin «puesto 7» y sin la lista «hasta 9.394».

### B-20 · medio · sup, oper, jefe · P-201B con dos marcas de prioridad en la misma pantalla
- **Ruta y ancho:** `#/sup/turno/ceiba/curso`, `#/oper/causa/ceiba/curso`, `#/sup/causa/ceiba/curso` · todos los anchos.
- **Qué se ve:**
  - En Turno, P-201B lleva ◆1 rojo en «Pasando ahora» y ▲2 naranja en «Identificar», una tarjeta al lado de la otra.
  - En Identificar («POR IDENTIFICAR · SIN ARRANCAR»), también ▲2.
  - Captura: `qa-b/evidencia/turno-p201b-dos-marcas.png`.
- **Lo que dice la especificación:**
  - U1 §9.2: «Una sola condición por equipo a la vez».
  - U2 §2.3: «La marca de un equipo es la de hoy (su prioridad)».
- **Arreglo:** el equipo lleva su marca de hoy (◆1) en todas partes. La urgencia de identificar va solo como texto: «no arrancar».

### B-21 · medio · oper, tec, sup, prod, jefe, conf · los contadores cuentan filas del reporte, no paradas
- **Ruta y ancho:** `#/oper/causa/ceiba/curso`, `#/sup/turno/ceiba/curso`, `#/jefe/causa/guacamayo/doce` · todos los anchos.
- **Qué se ve:**
  - «SIN CAUSA · 4» encima de dos tarjetas (LC-21 y LC-08, de dos días cada una); «7 filas»; «falta confirmar 2 · falta un dato 1 · sin causa 4».
  - En Turno: «[2] sin causa: LC-08 y LC-21 · 219 bbl». En Identificar, «SIN CAUSA · 4» y 247 + 109 = 356 bbl.
  - La tarjeta de LACT-01 dice «falta un dato» con cuatro pasos en «falta».
  - Capturas: `qa-b/trozos/oper_causa_ceiba_curso__390__2.png`, `qa-b/trozos/sup_turno_ceiba_curso__320__1.png`, `qa-b/esc/lact-tarjeta.png`.
- **Lo que dice la especificación:**
  - U2 §9.3: «POR CONFIRMAR 2 · FALTA UN DATO 1 · SIN CAUSA 2» (cuenta paradas).
  - U2 §0, principio 6.
- **Arreglo:**
  - El título cuenta paradas y dice las filas aparte: «SIN CAUSA · 2 paradas (4 filas del reporte)».
  - En Turno, el período escrito: «2 paradas sin causa: LC-08 y LC-21 · 219 bbl hoy (356 desde que pararon)».
  - «falta un dato» → «faltan 4 pasos» cuando falta más de uno.

### B-22 · medio · jefe, conf · la tarjeta dice una hora de cierre que no es y «cerraron» a pozos que siguieron produciendo
- **Ruta y ancho:** `#/conf/causa/morichal/curso`, `#/jefe/causa/guacamayo/doce` · 1280 px.
- **Qué se ve:**
  - «MN-41 · cerró 1 de oct, 00:00 · electrosumergible». Según Riesgo, MN-41 está parada desde el 25 de sept, 06:40: el 1 de oct es solo el comienzo del período.
  - «7 pozos · cerraron 15 de abr, 02:10 · por LACT-01 · … parcial · 25 % del caudal». No cerraron: se les bajó la frecuencia.
- **Lo que dice la especificación:** U2 §4.4, caso 4: la fila dice «parcial: {x} de {y} Hz».
- **Arreglo:**
  - «MN-41 · parada desde el 25 de sept, 06:40 (en este período, desde el 1 de oct)».
  - «7 pozos con la frecuencia bajada desde el 15 de abr, 02:10 · por LACT-01 · parcial: {x} de {y} Hz».

### B-23 · medio · oper, tec · todas las preguntas a la vez, la de seguimiento al final y la respuesta dada no se repite
- **Ruta y ancho:** `#/oper/causa/ceiba/curso` · 390 px.
- **Qué se ve:**
  - Cada parada sin causa muestra a la vez «¿Qué lo paró?» (10 botones), «¿Este cierre estaba programado?» (3) y «¿Se perdió crudo o gas que ya había salido?» (4): 17 botones por tarjeta.
  - Tras «Se fue la energía», la pregunta que sigue («¿De dónde vino el corte?») aparece al final, debajo de las otras dos.
  - Lo contestado no se repite en la tarjeta: «¿Estaba programado? falta» sigue igual y «Se fue la energía» no aparece.
  - Capturas: `qa-b/trozos/oper_causa_ceiba_curso__390__3.png`, `qa-b/esc/oper-sincausa-energia-390.png`.
- **Lo que dice la especificación:**
  - U1 §2.4: «una pregunta por pantalla, de 2 a 6 botones»; «cada una se salta si la anterior ya la resolvió»; en el teléfono, «5 botones y «Más opciones…»».
  - U1 §2.6.
- **Arreglo:** una pregunta a la vez. La siguiente aparece en el lugar de la que se contestó. Arriba va lo contestado: «Usted dijo: Se fue la energía · Cambiar». En el teléfono, 5 botones y «Más opciones…».

### B-24 · medio · oper, tec · los botones miden 40 px
- **Ruta y ancho:** `#/oper/causa/ceiba/curso` · 390 px.
- **Qué se ve:** 74 de los 77 controles miden menos de 44 px de alto. Las respuestas y «Confirmar lo que contesté» miden 40 px. Medición en `qa-b/esc/_log.txt`, `[dedos-oper]`.
- **Lo que dice la especificación:** U1 §2.6: «botones de 48 px o más, en el tercio de abajo, con una mano»; U2 §10.1, O-1: «con guantes».
- **Arreglo:** en el teléfono, las respuestas y los botones de confirmar a 48 px (`min-h-12`).

### B-25 · medio · todos los de Identificar · fechas ISO y con cero delante
- **Ruta y ancho:** `#/oper/causa/ceiba/curso` (filas), `#/jefe/causa/morichal/doce`, `#/conf/causa/morichal/curso`, Filosofía paso 2 · 390 y 1280 px.
- **Qué se ve:**
  - «2026-10-02 · 05:46–23:59 (sigue al corte)».
  - «2026-10-01 · 1 de oct, 00:00–1 de oct, 23:59».
  - «cerraron 03 de nov de 2025».
  - «Desde el 01 de oct de 2025».
  - En la misma tarjeta, «1 de oct, 09:16».
- **Lo que dice la especificación:** la regla del proyecto (fechas por `formatoFecha`); U1 §1.0, punto 7.
- **Arreglo:**
  - «2 de oct · 05:46 a 23:59 (sigue al cierre del día)».
  - El día, sin cero delante.

### B-26 · medio · prod, jefe, conf · la escalera nombra distinto lo mismo
- **Ruta y ancho:** `#/prod/produccion/ceiba/curso` («LO QUE NO SE PRODUJO, POR ESCALÓN»), `#/prod/diferidos/ceiba/cerrado` · 1280 px.
- **Qué se ve:**
  - Los mismos 355 bbl son «Sin clasificar: lo decide una persona» en la escalera y «sin identificar» en la tubería, en la misma pantalla.
  - Los escalones se llaman distinto en las dos pantallas:
    - Producción: «Desarrollo: el yacimiento y los proyectos», «Desempeño: levantamiento sin optimizar», «Capacidad: restricción sin falla (nominación, despacho)».
    - Diferidos: «El yacimiento y los proyectos», «Frecuencia bajada: el levantamiento sin optimizar», «Restricción sin falla: nominación o despacho».
  - «POR ESCALÓN» no se entiende sin el ⓘ.
- **Lo que dice la especificación:** U2 §2.3: «Se llama igual que en Identificar y en el Resumen… Es una palabra por idea»; U2 §1.4.
- **Arreglo:**
  - «sin identificar» también en la escalera.
  - Un solo juego de nombres: los de Diferidos se entienden mejor.
  - Título: «LO QUE NO SE PRODUJO, POR TIPO».

### B-27 · medio · reg, prod, jefe, conf · la causa (N1) tiene dos nombres
- **Ruta y ancho:** `#/reg/regulatorio/ceiba/curso` y el árbol de Producción y Diferidos frente a `#/sup/causa/ceiba/curso` · 1280 px.
- **Qué se ve:**
  - En el árbol: «La planta no recibe (agua o proceso)», «Falló la energía dentro del campo», «Falló una máquina de superficie».
  - En la cadena de Identificar, la misma N1: «No planeada - Proceso / Facilidades», «No planeada - Eléctrica interna», «No planeada - Mecánica superficie».
- **Lo que dice la especificación:** U1 §2 (las N1 y N2 «en tipo oración», del texto de la Tabla 1); U2 §2.3 (una palabra por idea).
- **Arreglo:**
  - El mismo texto en las dos vistas.
  - Para reg, la etiqueta de la Tabla 1 al lado del código: «No planeada - Proceso / Facilidades · cau_niv1 NP_PROC».

### B-28 · medio · prod (papel) · Producción impresa: hoja en blanco, tubería partida en tres y un formulario vacío
- **Ruta y ancho:** `#/prod/produccion/ceiba/curso` › imprimir (PDF A4).
- **Qué se ve:**
  - La hoja 1 queda en blanco en un 70 %, porque la tubería no cabe y salta. Aun así, se parte en las hojas 2, 3 y 4.
  - El pie «La tubería del campo, en números…» queda al final de la hoja 3 y su tabla, en la 4.
  - «DÍA A DÍA» ocupa sola la hoja 5.
  - «CUADRE · ASIGNACIÓN OFICIAL» se imprime con sus campos vacíos.
  - Captura: `qa-b/esc/papel-prod_produccion_ceiba_curso.pdf`.
- **Lo que dice la especificación:** U2 §2.7: «El bloque no se parte entre dos hojas»; tabla con los mismos números debajo.
- **Arreglo:**
  - `break-inside: avoid` solo para el dibujo con su frase, y para la tabla con su pie. El detalle de los tramos y «Se trabó» pueden ir a la hoja siguiente.
  - `no-imprimir` en el formulario del cuadre.

### B-29 · medio · varios · palabras internas del proyecto en pantalla y en papel
- **Qué se ve:**
  - «(Edinson)» en el estado vacío de La Zarza (`#/adm/planta/zarza/curso`, también en Producción).
  - «El umbral y los días son de producto y se validan con Edinson» (ⓘ de «QUÉ LIMITÓ», impreso en la hoja 4 de `qa-b/esc/papel-prod_produccion_ceiba_curso.pdf`).
  - «El LLM no produce estos números» (ⓘ del retorno: ger, sup y oper; texto en modo papel).
  - «patente US 8,195,401» (ⓘ de la escalera).
  - «(lote LOTE-1)» en los avisos de confirmación (Turno e Identificar).
  - Claves en minúscula en lugar del nombre del equipo en la Filosofía: «manifold», «depurador», «tea».
- **Lo que dice la especificación:** U1 §1.0, punto 7 (palabras de campo); U2 §1.4.
- **Arreglo:**
  - «…el gas tiene una tolerancia diferente y falta definir cómo se mide su potencial.»
  - «El umbral y los días los fija TRIM; se pueden ajustar.»
  - «Esta cifra la calcula TRIM con reglas fijas.»
  - Quitar la patente.
  - «en un solo lote».
  - El nombre del equipo en lugar de la clave.

### B-30 · medio · adm · capacidades: el morado de «dato inválido» marca «bloquea la firma», y bloquear o no se distingue solo por color
- **Ruta y ancho:** `#/adm/filosofia/ceiba/curso` › 2 Capacidades, con el tren de crudo en 5.000 · 1280 px.
- **Qué se ve:**
  - En «REVISIÓN CON LAS REGLAS DE LA FIRMA», lo que bloquea lleva el círculo punteado morado de «dato inválido», y lo que no bloquea lleva el mismo círculo en gris.
  - Los textos sí coinciden con U2 §8.4.
  - Captura: `qa-b/evidencia/capacidades-morado.png`.
- **Lo que dice la especificación:**
  - U1 §9.2: el morado es solo para «sin comunicación» y «dato inválido»; «La excepción no se extiende a nada más».
  - U1 §9.3: nunca solo color.
- **Arreglo:**
  - Lo que bloquea, con la marca de aviso y la palabra al comienzo: «Bloquea la firma: …».
  - Lo que no: «Revise: …».

### B-31 · medio · jefe, conf · tanque de crudo (LACT-01): se pregunta otra cosa que lo que la tarjeta dice que falta
- **Ruta y ancho:** `#/jefe/causa/guacamayo/doce` · 1280 px.
- **Qué se ve:**
  - La tarjeta dice «falta: «¿El oleoducto o el cliente estaba recibiendo?»», pero lo que pregunta primero es «¿Qué lo paró?» («La planta no recibe (agua o proceso)» · «El tanque de crudo está lleno» · «No sé»).
  - La nota del evento («despacho limitado por la nominación del oleoducto») no aparece junto a la pregunta.
  - Tras «No, no recibía», el detalle sigue sugiriendo «Tanques llenos / capacidad limitada», que es de la planta, cuando la causa ya es «No planeada - Transporte externo».
  - Captura: `qa-b/esc/lact-tarjeta.png`. Secuencia en `qa-b/esc/_log.txt` (`[lact]`).
- **Lo que dice la especificación:** U2 §4.2, tanque de crudo: «En la planta o estación, como propuesta, más la pregunta «¿El oleoducto o el cliente estaba recibiendo?»», con la nota al lado; §4.4, caso 3.
- **Arreglo:**
  - Si la señal ya dice que el tanque de crudo se llenó, la pregunta va directa: «¿El oleoducto o el cliente estaba recibiendo?»
  - Debajo, la nota: «Nota del evento: «despacho limitado por la nominación del oleoducto»».
  - Al cambiar la causa, se borra la sugerencia de detalle que ya no corresponde.

### B-32 · medio · prod, conf · baja carga: «¿Fue el yacimiento?» y «¿Qué fue, exactamente?» a la vez
- **Ruta y ancho:** `#/prod/causa/ceiba/cerrado` (LC-16, LC-08, LC-09) · 1280 px.
- **Qué se ve:**
  - «Las señales apuntan a que al pozo le faltó aporte (baja carga). ¿Fue el yacimiento? [Sí, fue el yacimiento] [No, fue la bomba]».
  - En la misma tarjeta y a la vez: «¿Qué fue, exactamente? [Falla ESP] [Arenamiento / obstrucción] [Alto BSW / corte de agua] [No sé]».
  - Captura: `qa-b/esc/caso-ceiba-baja-carga.png`.
- **Lo que dice la especificación:** U2 §4.2 (la fila de admisión); U1 §2.4 (una pregunta a la vez).
- **Arreglo:** primero «¿Fue el yacimiento?». «¿Qué fue, exactamente?» sale solo después de «No, fue la bomba».

### B-33 · medio · oper · las preguntas nuevas no salen por WhatsApp
- **Ruta y ancho:** `#/oper/causa/ceiba/curso` (LC-05) · 390 px.
- **Qué se ve:**
  - «¿De dónde vino el corte?» solo está en la pantalla. La tarjeta de LC-05 no tiene línea de WhatsApp.
  - El chat del operador solo trae las preguntas de antes: la parte de la bomba y la causa del pozo.
- **Lo que dice la especificación:** U2 §9.3 (LC-05: «┄ falta: «¿De dónde vino el corte?» · WhatsApp a Jairo Peña · sin resp.»); U1 §2.6.
- **Arreglo:** mandar por WhatsApp la misma pregunta con sus cuatro opciones numeradas y mostrar el hilo en la tarjeta.

### B-34 · medio · prod, jefe, conf · el árbol del tramo repite la misma cifra en cada nivel
- **Ruta y ancho:** `#/prod/produccion/ceiba/curso` › «Se trabó en el período» › abrir «en la planta» · 1280 px.
- **Qué se ve:**
  - Con un solo equipo, la rama repite cuatro veces «573 bbl · 100 % del tramo»: No planeada → La planta no recibe (agua o proceso) → Parada estación/bombeo afecta pozos → P-201B · bomba de reinyección · sin parte.
  - El árbol de septiembre de los pozos sí aporta: separa LC-11 y LC-04 de las paradas por baja carga.
  - Capturas: `qa-b/esc/setrabo-planta-abierto.png`, `qa-b/esc/setrabo-septiembre-abierto.png`.
- **Lo que dice la especificación:** U2 §0 (se lee sin teoría).
- **Arreglo:** cuando una rama tiene un solo hijo, se juntan en un renglón: «573 bbl · No planeada · La planta no recibe (agua o proceso) · Parada estación/bombeo afecta pozos · P-201B (bomba de reinyección), falta la parte».

### B-35 · medio · todos · los grises de los tramos casi no se distinguen entre vecinos
- **Ruta y ancho:** tokens de `src/index.css`; se ve en `#/ger/diferidos/ceiba/cerrado`, `#/prod/diferidos/ceiba/cerrado` y en el papel.
- **Qué se ve:**
  - Contraste entre grises vecinos de tramo:
    - yacimiento y pozos: 1,45:1;
    - pozos y planta: 1,42:1;
    - planta y afuera: 1,46:1;
    - en oscuro, de 1,28:1 a 1,35:1.
  - «Afuera» (`--dato-4`) contra el panel: 2,86:1 en claro; WCAG 1.4.11 pide 3:1.
  - En las barras mes a mes, sin palabra ni patrón, los tramos no se separan en blanco y negro.
  - Los textos `--tinta3` sí pasan 4,5:1 en los dos temas.
- **Lo que dice la especificación:** U1 §9.3; U2 §2.8 y §10.4; U2 §7.5 (papel con patrones).
- **Arreglo:**
  - En las barras apiladas, el patrón de cada tramo además del gris: los mismos de la franja (liso, rayado, punteado).
  - «Afuera» con `--dato-3` más patrón, no con `--dato-4`.

### B-36 · medio · prod, conf, adm · «Ver como tabla» abre la tabla lejos del botón
- **Ruta y ancho:** `#/prod/produccion/ceiba/curso` · 1280 px.
- **Qué se ve:** el botón está arriba a la derecha del panel. La tabla aparece debajo de «SE TRABÓ EN EL PERÍODO», fuera de la vista, y el foco no se mueve. El botón pasa a decir «Ocultar la tabla». Captura: `qa-b/esc/tuberia-tabla.png`.
- **Lo que dice la especificación:** U2 §2.8: «el botón «Ver como tabla» muestra la tabla de §2.2».
- **Arreglo:** la tabla en el lugar del dibujo, o justo debajo, y el foco a su título.

### B-37 · medio · jefe, conf · la ficha del equipo no dice dónde se trabaría ni cuánto vale hoy
- **Ruta y ancho:** `#/jefe/equipo/ceiba/curso/K-101`, `#/conf/equipo/morichal/curso/MPP-301`, Superficie · 1280 px.
- **Qué se ve:**
  - Ni Superficie ni la ficha dicen dónde se trabaría el equipo, ni su puesto en «Si falla hoy», ni «sube al puesto…».
  - P-201A, la que hoy vale más, no tiene ficha: `#/jefe/riesgo/ceiba/curso/P-201A` no abre nada.
- **Lo que dice la especificación:**
  - U2 §1.2: «Si falla hoy» aparece en la «ficha del equipo».
  - U2 §1.5: el aviso «{Equipo} sube al puesto {n}…» va en la ficha del equipo.
  - U2 §3.1, jefe: «En cada equipo, «Si para, se traba en…»».
- **Arreglo:** en la ficha, un renglón: «Si falla hoy: hasta 9.394 bbl/d · se trabaría en la planta (todo el campo) · puesto 1». Para P-201A y P-201C, una ficha mínima aunque no tengan instrumento.

## Hallazgos bajos

### B-38 · bajo · prod · una dirección a un campo no asignado abre otro campo sin avisar
- **Ruta y ancho:** `#/prod/produccion/zarza/curso` → abre `#/prod/produccion/ceiba/curso` · todos los anchos.
- **Qué se ve:** un enlace compartido a La Zarza muestra La Ceiba sin decir nada. Pasa igual con `#/reg/regulatorio/ceiba~portafolio/curso`.
- **Lo que dice la especificación:** la dirección «sirve para compartir una vista tal cual» (`url.ts`).
- **Arreglo:** un aviso arriba: «Usted no tiene La Zarza asignada: le mostramos La Ceiba.»

### B-39 · bajo · ger, prod, reg · «Nada se trabó en el período» y una leyenda sin barra
- **Ruta y ancho:** `#/ger/resumen/zarza/curso`, `#/ger/diferidos/zarza/curso`, `#/adm/planta/zarza/curso` · 1280 px.
- **Qué se ve:**
  - «Nada se trabó en La Zarza en el período.» y «Nada se trabó en el período (octubre, en curso).»
  - Debajo, la leyenda de los cinco tramos sin ninguna barra que leer.
- **Lo que dice la especificación:** U2 §1.5: «Nada se trabó en {período}.»
- **Arreglo:** «Nada se trabó en octubre (en curso).» Sin leyenda cuando no hay barra.

### B-40 · bajo · ger, sup, oper, jefe, conf · color de alarma en cifras sumadas, no en un equipo
- **Ruta y ancho:** `#/ger/resumen/ceiba/curso`, `#/sup/turno/ceiba/curso`, `#/jefe/riesgo/ceiba/curso` · todos los anchos.
- **Qué se ve:** «◆ 1.966 bbl/d perdiéndose ahora», «◆ 2.650 bbl/d», «▲ 3 por identificar» y «■ 1 arrancó sin identificar». Son marcas de prioridad sobre totales, no sobre un equipo. No es de esta tanda, pero está en las mismas pantallas que el choke.
- **Lo que dice la especificación:** U2 §0, principio 4 («El color es del equipo, no del tramo»); U1 §9.3.
- **Arreglo:** los totales sin marca de color. La marca va en el equipo que los causa: «1.966 bbl/d perdiéndose ahora · ◆1 P-201B».

### B-41 · bajo · prod, conf, adm · el esquema de Planta parpadea al lado de la tubería
- **Ruta y ancho:** `#/prod/planta/ceiba/curso` · 1280 px.
- **Qué se ve:** el círculo de P-201B en el esquema late sin fin (animación `latir`). Con «reducir movimiento» se apaga, y eso está bien. La tubería no se anima.
- **Lo que dice la especificación:** U1 §9.3: «Nunca parpadea nada» (TRIM no tiene reconocimiento de alarmas); U2 §2.8.
- **Arreglo:** quitar el latido, o dejarlo solo hasta que alguien abra el equipo.

### B-42 · bajo · jefe, conf, sup · «ya fuera» se lee como «fuera de servicio»
- **Ruta y ancho:** `#/jefe/riesgo/ceiba/curso` («El más cercano · K-101 · ya fuera»), `#/sup/turno/ceiba/curso` («Vigilar · K-101 · ya fuera») · todos los anchos.
- **Qué se ve:** K-101 está en marcha y degradado, pero «ya fuera» suena a que está parado.
- **Lo que dice la especificación:** U1 §1.0, punto 7 (palabras de campo).
- **Arreglo:** «ya pasó el límite».

### B-43 · bajo · jefe, conf · el puesto y la prioridad van pegados en «Si falla hoy»
- **Ruta y ancho:** `#/jefe/riesgo/ceiba/curso` · 1280 px.
- **Qué se ve:** «1 ◆1 K-101» y «1 ▲2 TK-102». Se lee como dos puestos.
- **Lo que dice la especificación:** U2 §9.5 (el puesto en su columna y la marca dentro de «¿Lo vigila TRIM?»).
- **Arreglo:** la marca de alarma en la columna «¿Lo vigila TRIM?»: «sí · ◆1 degradado», como en el boceto.

### B-44 · bajo · prod, conf, adm · «sin instrumento» con la forma de «sin comunicación»
- **Ruta y ancho:** `#/prod/agua/ceiba/curso` · 1280 px.
- **Qué se ve:** P-201A y P-201C llevan un círculo punteado gris. Es la forma de «sin comunicación», que va en morado. En blanco y negro son iguales. Captura: `qa-b/evidencia/agua-casi-iguales.png`.
- **Lo que dice la especificación:** U1 §9.2 y §9.3: cada condición con forma propia.
- **Arreglo:** el hueco discontinuo de «falta» con la palabra: «┄ sin instrumento».

### B-45 · bajo · varios · textos sueltos
- «Listo: LC-07 y LC-16 queda para revisar» → «Listo: LC-07 y LC-16 quedan para revisar».
- «Ver el chat de Jairo Peña», visto por el propio Jairo → «Ver mi chat de WhatsApp».
- «1.046 bbl se trabaron» (Producción con todos los campos) → «1.046 bbl no se produjeron».
- «le pidió a ingeniera de producción» → «le pidió a la ingeniera de producción».
- «Nadie corrigió una propuesta de TRIM en Octubre, en curso» → «en octubre (en curso)».
- «la parte va en la descripción» y «la misma razón del paso 1»: ver B-11.

### B-46 · bajo · sup · en el teléfono, «Corregir dónde se trabó» se abre a media pantalla y su campo corta el texto
- **Ruta y ancho:** `#/sup/causa/ceiba/curso` · 390 px.
- **Qué se ve:**
  - El editor se abre en línea, debajo de la cadena, con su comienzo a 548 px en una pantalla de 844.
  - El campo de «Pedir a producción» corta su texto: «¿Fue el yacimiento? Revise la prueba del pozo, el corte de agu».
  - Captura: `qa-b/esc/corregir-sup-390.png`.
- **Lo que dice la especificación:** U1 §2.6: «Corregir abre una hoja inferior al 90 % de la pantalla».
- **Arreglo:** hoja inferior al 90 % en el teléfono, y un campo de dos renglones.

### B-47 · bajo · conf · Calidad: «MN-41 · 2 paradas», cuando es una parada de dos filas
- **Ruta y ancho:** `#/conf/confiabilidad/morichal/curso` › «CALIDAD DE LA CLASIFICACIÓN» · 1280 px.
- **Qué se ve:** arriba dice «6 filas» y abajo «MN-41 · 2 paradas · 0 corregidas · 0 %». Captura: `qa-b/esc/conf-calidad-panel.png`.
- **Arreglo:** «MN-41 · 1 parada (2 filas) · 0 corregidas».

### B-48 · bajo · prod, jefe, ger · el primer botón del mes a mes tiene tres nombres
- **Ruta y ancho:** Diferidos y Resumen · 1280 px.
- **Qué se ve:** «Cómo se identificó» (prod), «Equipos» (jefe) y «Por equipo» (ger). El segundo siempre es «Por dónde se trabó».
- **Lo que dice la especificación:** U2 §7.4: «Por equipo» y «Por dónde se trabó».
- **Arreglo:** «Por equipo» para todos.

### B-49 · bajo · adm · Filosofía: «sin responder» con la respuesta ya marcada
- **Ruta y ancho:** `#/adm/filosofia/ceiba/curso` · 1280 px.
- **Qué se ve:**
  - LC-01 dice «sin responder» en la lista, y a la derecha «A un solo pozo» ya está marcado, con «LO QUE TRIM DEDUJO DEL REGISTRO» y su botón «Aceptar».
  - Los filtros dicen «Sin responder 30 · Propuestas de TRIM 6». No queda claro en qué se diferencia una de las 30 de una de las 6.
- **Lo que dice la especificación:** U2 §8.3 (TRIM propone y pide confirmar); U2 §9.4 («? K-101 aire · propuesta de TRIM»).
- **Arreglo:** «sin responder · TRIM deduce: se traba en el pozo», con la opción marcada como «propuesta (sin aceptar)».

### B-50 · bajo · ger · la misma base de comparación, escrita de dos maneras
- **Ruta y ancho:** `#/ger/resumen/ceiba/curso` · todos los anchos.
- **Qué se ve:** «Alto impacto · tendencia (3 meses previos → con TRIM)» y, en el renglón de abajo, «Por dónde se trabó · lo no planeado por día (jun a ago → con TRIM)».
- **Arreglo:** la misma forma en los dos: «(jun a ago → con TRIM, desde el 1 de sept)».

### B-51 · bajo · ger, sup, oper · «Ver planes de acción» sigue plegado en el papel
- **Ruta y ancho:** `#/ger/resumen/ceiba/curso` y `#/sup/causa/ceiba/curso` › imprimir.
- **Qué se ve:** en el papel queda el botón «Ver planes de acción · 4», sin los planes. Hoja 1 de `qa-b/esc/papel-ger_resumen_ceiba_portafolio_cerrado.pdf`.
- **Lo que dice la especificación:** la tarea: «lo plegado sale desplegado».
- **Arreglo:** `print:block` en la lista de planes.

### B-52 · bajo · oper · «Algo está mal» en la pantalla obliga a escribir
- **Ruta y ancho:** `#/oper/causa/ceiba/curso` · 390 px.
- **Qué se ve:**
  - «Enviar a revisar» con el campo vacío responde «Diga qué está mal: lo lee quien la revisa.» Hay que escribir con el teclado del teléfono.
  - En WhatsApp, la misma acción es tocar «2».
  - Captura: `qa-b/esc/oper-algo-mal-390.png`.
- **Lo que dice la especificación:** U1 §2.6 («Así nadie tiene que escribir códigos en un teclado con guantes»).
- **Arreglo:** atajos de un toque antes del campo: «No paró por eso» · «Lo cerré yo a mano» · «El pozo es otro» · «Otra cosa: [____]».

### B-53 · bajo · adm · la vista previa del paso 3 no muestra el impacto mientras falte la fuente de un número
- **Ruta y ancho:** `#/adm/filosofia/ceiba/curso`, con el tren de crudo en 5.000 · 1280 px.
- **Qué se ve:** en el paso 3, «SI FIRMA ESTA VERSIÓN» solo dice qué corregir. No dice qué cambiaría «Qué limita hoy» ni «Si falla hoy». Captura: `qa-b/esc/capacidad-paso3.png`.
- **Lo que dice la especificación:** U2 §8.5 (antes de firmar se muestra lo que cambia, en palabras).
- **Arreglo:** mostrar el impacto también con errores, marcado «borrador con errores: así quedaría».

### B-54 · bajo · oper · arriba de sus preguntas, el operador ve indicadores de gestión
- **Ruta y ancho:** `#/oper/causa/ceiba/curso` · 390 px.
- **Qué se ve:** antes del árbol, «66,1 % causa probada por señal · 691 de 1.046 bbl diferidos», «0,0 % causa declarada», «▲3 por identificar · histórico» y «■1 no conformidades». Captura: `qa-b/trozos/oper_causa_ceiba_curso__390__1.png`.
- **Lo que dice la especificación:** PLAN-MAESTRO §4 («¿Qué me falta contestar ahora?»); U1 §2.7.
- **Arreglo:** plegar los indicadores para oper y tec, o llevarlos al final.

## §2 Colores ISA-101 y tema oscuro

| Regla | Resultado | Dónde |
|---|---|---|
| «Limita» nunca en rojo: gris con doble contorno | **Cumple** | Tubería del campo (`border-double` en `--tinta`), agua, Turno («◄ limita · los pozos · 11.360 bbl/d» con doble contorno), Filosofía paso 2. En oscuro, el doble contorno sale claro y se ve |
| El color solo en un equipo en alarma | **Cumple en la tubería, el agua y el árbol** (la única marca es ◆1 P-201B). **No cumple** en cifras sumadas (B-40), ni con dos marcas para el mismo equipo (B-20) | `qa-b/evidencia/turno-p201b-dos-marcas.png` |
| Morado solo para «sin comunicación» o «dato inválido» | **Cumple en Agua** («Sin comunicación con el nivel · ---»). **No cumple en Capacidades**, donde marca «bloquea la firma» (B-30) | `qa-b/evidencia/capacidades-morado.png` |
| Lo que falta, en gris discontinuo | **Cumple**: «falta», «sin identificar», «sin dato», «sin firmar», tratamiento de agua, «faltan los 6 pasos» | — |
| Siempre forma y texto además del color | **Cumple en las marcas.** **No cumple** en tres gráficos que se leen solo por luminancia o con una leyenda que no corresponde (B-08, B-09, B-35), ni en bloquea / no bloquea (B-30), ni en «sin instrumento» con la forma de «sin comunicación» (B-44) | — |
| Tema oscuro | Los tokens cambian bien y la tubería, el agua, el árbol y la Filosofía se leen (`qa-b/cap-oscuro/`). **Falla un texto**: «lo oscuro es lo que pasa ahora» (B-15) | `qa-b/evidencia/tuberia-oscuro.png` |

El rombo de P-201B sigue rojo. Es la «paleta vigente» que U2 §2.3 acepta hasta F2: no se cuenta como hallazgo.

## §3 El árbol en Identificar

**Toques por caso, medidos con clics** (U1 §2.2 y U2 §4.3):

| Caso | Meta | Medido | Rol | Nota |
|---|---|---|---|---|
| A · deducida (LC-07 y LC-16, cascada de P-201B) | 1 | **1** («Confirmar los 2») | sup, prod | Cumple. El aviso dice «quedan completas (2 filas), en un lote (LOTE-1)» (B-29) |
| A · la misma | 1 | **2**, una por fila | jefe, conf | B-07 |
| A en cascada (SE-2 de Morichal, 41 pozos, 123 filas) | 1 | sup y prod: hay que completar el detalle (14 opciones) y luego confirmar, **≥ 2** · jefe y conf: **123** | — | B-07 |
| B · declarada con catálogo (P-201B, la parte) | 2–3 | **2** por WhatsApp (parte y qué vio) · **3** en pantalla (parte, qué vio, «Registrar respuesta») | oper | Cumple. El cierre del chat no se ve (B-05) |
| C · sin identificar (LC-21) | 3–5 | **5**: «Se fue la energía» → «¿De dónde vino el corte?» → «¿Estaba programado?» → «¿Se perdió…?» → «Confirmar lo que contesté» | oper | Cumple en número. Falla en forma (B-23) |
| «¿De dónde vino el corte?» (LC-05) | 1 + confirmar | **1 + 1** | oper | Cumple, pero B-04 |
| Corregir el paso 2 sin confirmar | 3 | **3** (Corregir → opción → Guardar) | sup, prod, jefe, conf | Cumple |
| Corregir el paso 2 ya confirmado | 3 + motivo | **1 + 3 + motivo**: hay que abrir «COMPLETAS · ver las 1» | sup | Hay un toque de más. El editor sí pide «¿Por qué lo cambia?» con los atajos de U2 §1.5 |
| «En el yacimiento» con evidencia (prueba P-3) | ≤ 4 | **4** en una parada de un pozo · **5** en una cascada («¿A qué pozo?») | prod, conf | Cumple. A sup y jefe no se les ofrece |
| «¿Fue el yacimiento? Pedir a producción» | 2 | **2**, y producción lo ve en «REVISAR» | sup, jefe | Cumple |

**Casos difíciles (U2 §4.4):**
- **Cascada.** Una tarjeta por raíz: «41 pozos · una sola raíz: SE-2», con el porqué «SE-2 alimenta 41 pozos: si cae, se frenan varios». Cumple. El problema es confirmarla (B-07).
- **Dos raíces casi juntas.** El 25-mar, «15 pozos · por K-101» y los 3 de P-201B salen en tarjetas separadas, bien. Falta la línea de tiempo que las une («04:30 P-201B → 3 pozos · +49 min K-101 → 15 pozos»), que U2 pide para no confirmar en lote sin verla.
- **Tanques llenos.** Agua (LC-16): va «en la planta», pero el porqué no nombra el tanque (B-11). Crudo (LACT-01): la pregunta y la nota no están donde se esperan (B-31).
- **Parcial.** Lleva el chip «parcial · 25 % del caudal», pero la tarjeta dice «cerraron» (B-22).
- **Baja tensión de un solo pozo (LC-05).** Propone «En el pozo» con el porqué «La baja tensión tumbó solo a LC-05: SE-2 siguió alimentando a los demás pozos». Cumple U2 §4.4, caso 8. Choca con la vista por equipo del gerente (B-12).
- **Baja carga.** La pregunta «¿Fue el yacimiento?» es la de U2 §4.2, palabra por palabra. Sale junto con otra pregunta (B-32).
- **Sin causa.** «faltan los 6 pasos · Hasta que alguien diga qué pasó, no se sabe quién, dónde se trabó ni la causa.» Cumple U2 §4.2.

**Lo que ve cada uno:**
- **Operador.** Nunca ve «¿Dónde se trabó?», «afuera» ni «yacimiento» como opción: se buscó por texto en las cuatro pantallas del operador y del técnico. Lo técnico va plegado con «lo propone TRIM; lo confirma su supervisor», como pide la especificación. Los problemas son de forma y de rastro: B-02, B-03, B-04, B-23, B-24, B-54.
- **WhatsApp.** El chat se ve como en un teléfono, con respuestas rápidas y sin desbordes a 390 px (iPhone 14, WebKit). Los problemas: B-05 y B-33.
- **«Algo está mal».** En la pantalla funciona: pasa a «para revisar» y el supervisor lo ve con el texto del operador. Pide escribir (B-52). En WhatsApp no funciona (B-05).

## §4 Tuberías, «Si falla hoy», el árbol del choke y la Filosofía: ¿se entienden sin teoría?

- **La tubería del campo** se lee en tres miradas:
  - «◄ LIMITA» con su número;
  - el relleno a la misma altura en los tres tramos;
  - «Se trabó en el período» debajo.

  Los textos de U2 §1.5 están palabra por palabra (lectura, ⓘ de «limita», «le sobran», yacimiento, «sin identificar», gas sin medir) y La Zarza muestra el estado vacío del gas. Lo que falla: el «hoy» (B-14), el tema oscuro (B-15) y la tabla (B-36).
- **Teclado y lector de pantalla:**
  - Cada tramo es un botón con `aria-expanded`. Las flechas pasan de tramo en tramo y Enter abre el detalle, que tiene «Cerrar».
  - El foco se ve: borde de 2 px en `--acento`, #12287a.
  - El dibujo lleva un `aria-label` completo: «Tubería de La Ceiba. Limitan los pozos: 11.360 barriles por día. Planta o estación: 13.000, le sobran 1.640, sin firmar. Afuera: 14.000… Perdiéndose ahora: 1.966, de ellos 1.665 en la planta por P-201B y 301 sin identificar, LC-21.»
  - Cada renglón de «Se trabó» es un botón con `aria-expanded`, `aria-controls` y un texto para el lector («… bbl, con sus ramas: planeada o no, causa, detalle y equipos»).
  - Desde el comienzo de la página hay 20 tabulaciones hasta el primer tramo y no hay enlace para saltar al contenido. Es menor.
- **La tubería del agua** dice las tres frases y «POR QUÉ ES CRÍTICA» en tres renglones, y así se entiende sin teoría. Fallan el tiempo verbal (B-17), «casi iguales» (B-16) y La Zarza (B-18). El supervisor no la ve en ninguna forma (B-01).
- **«Si falla hoy»:**
  - Su ⓘ dice lo que pide U2 §6.2.
  - Las líneas «Ojo: P-201A y P-201C valen más mientras P-201B esté parada: no conviene intervenirlas hoy» (jefe) y «¿Dónde va el próximo instrumento? … P-201A y P-201C» (conf) responden J-1 y C-1.
  - «modelo choke ⓘ» sale solo para confiabilidad, como pide U2 §1.3.
  - Falla la tabla, con sus techos empatados (B-06, B-43), y la ficha (B-37).
- **El árbol del choke** abre tramo → planeada o no → causa → detalle → equipos con su parte, y las ramas suman su tramo. Se lee bien cuando hay varias ramas (los pozos en septiembre). Repite cuando hay una sola (B-34). El nombre de la causa cambia según la pantalla (B-27).
- **La Filosofía operacional** es lo más claro del conjunto:
  - una pregunta por equipo («¿A qué pozos sirve este equipo?»);
  - la frase que deduce TRIM al instante («→ Si para, se traba en la planta o estación: sirve a los 18 pozos»);
  - la propuesta con su porqué («Cuando cayó K-101 el 4 de ago, cerraron los 18 pozos en cascada. Pasó 6 veces: ¿K-101 sirve a todo el campo?»);
  - «Todavía no sé» explicado;
  - las validaciones de U2 §8.4 palabra por palabra.

  Detalles en B-30, B-49 y B-53.

## §5 Papel

Se imprimieron 9 pantallas en PDF A4 (`qa-b/esc/papel-*.pdf`). En ninguna hay una tabla más ancha que su caja.

- **Cumple:**
  - la tubería imprime el detalle de los cuatro tramos y los ⓘ una sola vez al final;
  - «Se trabó en el período» sale con todas sus ramas abiertas;
  - las tarjetas de Identificar salen con lo técnico desplegado y con «ver las otras N».
- **No cumple:**
  - el árbol de la circular de Regulatorio sale con una letra por renglón (B-10);
  - Producción deja una hoja casi en blanco y parte la tubería en tres hojas (B-28);
  - los planes de acción quedan plegados (B-51).
- **Aviso:** el Resumen del gerente con el portafolio pasa de 6 hojas, porque POR CAMPO imprime todos los equipos de cada campo (50 en Morichal). Es por diseño (`data-partible`), pero vale preguntar si el gerente quiere eso en papel.

## §6 Contraste y movimiento

- **Contraste del texto.** Pasa 4,5:1 en los dos temas. Ejemplos de `--tinta3`: en claro, 6,48 sobre el panel, 5,90 sobre `panel2` y 4,69 sobre el suelo; en oscuro, 5,40, 5,93 y 4,56 sobre `elevado`. El acento del foco, 9,90:1 en claro y 6,20:1 en oscuro sobre `panel2`.
- **Contraste de lo que no es texto.**
  - Los grises de los tramos entre vecinos, de 1,28:1 a 1,46:1, y «afuera» contra el panel, 2,86:1: B-35.
  - Las líneas `--linea2` contra el panel son 1,41:1 en claro y 1,12:1 en oscuro. Hoy son solo separadores; no deben usarse para nada que signifique algo, como un contorno de «falta».
- **Movimiento.**
  - Con `reducedMotion: 'reduce'` no queda ninguna animación (`document.getAnimations()` vacío en Planta, Producción, Agua, Identificar y Riesgo).
  - Sin la preferencia, solo late el círculo P1 del esquema de Planta (B-41).
  - La tubería y el árbol no se animan; el giro de las flechas de plegado se apaga con la preferencia.

## §7 Las 10 mejoras de mayor impacto para que «cualquiera lo entienda»

Van ordenadas por cuánta gente toca cada una y cuánto la confunde hoy.

1. **Una sola lista para el operador, con una pregunta a la vez** (B-02, B-03, B-23, B-24, B-54). Sin paradas repetidas, sin confirmar lo que no contestó, con botones de 48 px y con lo contestado a la vista: «Usted dijo: … · Cambiar». Es la pantalla que más gente usa y hoy no responde «¿Qué me falta contestar ahora?».
2. **Que «confirmó» y «dijo» digan la verdad, y que «Algo está mal» funcione igual en WhatsApp y en la pantalla** (B-04, B-05). Sin eso, el rastro que va a la ANH no se puede defender.
3. **El orden de cierre y el colchón en la ficha de la bomba, para quien opera** (B-01). Es la pregunta del supervisor y la prueba S-3.
4. **«Si falla hoy» con las cifras primero y los techos aparte, y en la ficha de cada equipo** (B-06, B-37, B-43). Así salta a la vista que P-201A y P-201C son lo primero y no tienen instrumento.
5. **Gráficos que se lean en gris** (B-08, B-09, B-35). Una leyenda por dibujo, que diga lo que pinta; sin atenuar meses; con el patrón de cada tramo además del gris.
6. **Un nombre y una cifra por idea en todas las pantallas** (B-12, B-20, B-21, B-26, B-27). SE-2 o el pozo, pero no los dos. Paradas o filas, dicho. «Sin identificar» siempre. La misma N1 en el árbol y en la cadena. Una sola marca por equipo.
7. **El gerente: dos renglones por campo, con la familia del equipo** (B-13): «Se trabó sobre todo en los pozos: LC-11 y LC-04 (electrosumergibles).» Lo demás, plegado.
8. **Frases que digan «hoy» cuando hoy es distinto** (B-14, B-15, B-16, B-17): «Hoy no: con P-201B parada, el agua de la planta está llena…»; «Lo relleno es lo que pasa ahora»; «Las bombas y los inyectores están casi iguales…».
9. **El porqué con «porque» y con la causa física** (B-11, B-31, B-32): el tanque de agua lleno en LC-16; la pregunta del oleoducto directa y con la nota del evento; una pregunta a la vez en la baja carga.
10. **El papel legible y sin hojas en blanco** (B-10, B-28, B-51): el ⓘ en su renglón o al final, la tubería partida entre bloques y no a la mitad, nada plegado.

## Anexo · capturas principales

Todas bajo `/private/tmp/claude-501/-Users-hollman/0809a9f7-4f6b-4a1e-b5b0-972baa33e07f/scratchpad/qa-b/`:

- **Por rol (primer lote):**
  - `cap1/<rol>_<pantalla>_<campo>_<período>__<ancho>.png`, con su `.json` (texto visible, desbordes, letra chica). Ejemplos: `cap1/ger_resumen_ceiba_portafolio_curso__1280.png`, `cap1/prod_produccion_ceiba_curso__1280.png`, `cap1/oper_causa_ceiba_curso__390.png`, `cap1/jefe_riesgo_ceiba_curso__1280.png`, `cap1/reg_regulatorio_ceiba_curso__1280.png`, `cap1/adm_filosofia_ceiba_curso__1280.png`, `cap1/adm_planta_zarza_curso__1280.png`.
  - Recortes legibles de las capturas largas del teléfono en `trozos/`.
- **Tema oscuro:** `cap-oscuro/*_dark.png`.
- **Escenarios:** `esc/` (`corregir-*.png`, `oper-*.png`, `chat-*.png`, `tuberia-*.png`, `setrabo-*.png`, `diferidos-*-portramo.png`, `filosofia-*.png`, `capacidad-*.png`, `lact-tarjeta.png`, `caso-ceiba-baja-carga.png`, `detalle-bomba-*.png`, `sup-ficha-P201B-*.png`) y el registro de cada clic en `esc/_log.txt`.
- **Papel:** `esc/papel-*.pdf`.
- **Evidencia recortada:** `evidencia/` (`turno-p201b-dos-marcas.png`, `si-falla-hoy-empates.png`, `ger-diferidos-se2-vs-pozos.png`, `turno-hoy-limita.png`, `que-limito-leyenda.png`, `mes-a-mes-desvanecido.png`, `agua-casi-iguales.png`, `capacidades-morado.png`, `ger-donde-se-trabo-390.png`, `tuberia-oscuro.png`, `tuberia-planta-hoy.png`).
