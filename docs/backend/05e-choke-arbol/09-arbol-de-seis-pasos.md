# 5E.9 · El árbol de seis pasos de la ANH: proponer, preguntar, confirmar

La Circular ANH 0024 de 2026 pide clasificar cada fila de `paradas_pozo` (5E.3) en seis pasos, en su orden: responsable → choke → impacto → planeación → causa N1 → detalle N2 (C24 p. 5). La clasificación **vive al lado de la causa de TRIM, nunca encima**: la causa sigue siendo la de gestión (equipo, parte, tipo) y de ella sale esta propuesta regulatoria. Cuatro reglas la gobiernan (`src/entities/anh-clasificacion.ts:1-21`):

1. **Cada dato con su procedencia** (señal, regla, programa, persona…), quién, a qué hora y con qué versión de la regla. De ahí sale el origen A/M/C.
2. **La coherencia está bloqueada**: planeada solo con una N1 `P_`, no planeada solo con una `NP_`, el N2 es de su N1. La ANH rechaza la transmisión entera por esto (C24 p. 7).
3. **Nada se inventa**: lo que la señal no decide va a `faltan`, con las opciones cerradas que admite la regla (nunca las 117) y la pregunta en palabras de campo.
4. **Una señal apunta, no prueba** (Hollman [37:34]): lo que sale de la firma de las señales, de un código que puede venir de superficie (GF, PH, UV) o del first-out de un variador nunca queda confirmado sin una persona: su causa la confirma quien abrió el equipo.

Rutas: `GET /api/vistas/anh/paradas` (5E.3) y `GET /api/vistas/anh/calidad`; escrituras `POST /api/anh/paradas/:id/clasificacion`, `…/yacimiento`, `…/respuesta`, `…/revision` y `POST /api/anh/paradas/confirmar` (`src/shared/api/escrituras.ts:883-1260`). Pantallas: Identificar (`widgets/arbol/ArbolIdentificar.tsx`), el cierre del día (`widgets/arbol/CierreDeHoy.tsx`), Calidad (`widgets/arbol/Calidad.tsx`) y Regulatorio. Datos: el demo, ahora = 2-oct-2026 14:00.

---

### Los seis pasos y el catálogo

**Qué es.** `PASOS` (`src/entities/anh-catalogo.ts:195-196`), con su nombre en la circular (`PASO_CIRCULAR`, `:199-206`, para el ⓘ) y en palabras de campo (`PASO_CAMPO`, `:209-211`; la pantalla no dice «choke»):

| Paso | Circular | En pantalla | Valores | Campo de `paradas_pozo` |
|---|---|---|---|---|
| 1 `responsable` | «Paso 1: Identificación del responsable del evento» | «Quién» | 9 (`RESPONSABLES`, `:217-221`): Operador · Operación, · Mantenimiento, · Planeación/Logística; Externo · Proveedor de energía, · Transportador; Comunidad; Autoridad / Regulador; Tercero; Fuerza mayor (clima/natural) | `resp_par` |
| 2 `choke` | «Paso 2: Localización del Componente (Choke)» | «Dónde se trabó» | pozo, planta, exportación, reservorio (5E.1) | `choke_mod` |
| 3 `impacto` | «Paso 3: Definición del impacto en producción» | «Qué pasó» | diferida, pérdida | `dif_perd` |
| 4 `planeacion` | «Paso 4: Condición de Planeación» | «¿Planeada?» | planeada, no planeada | `pla_no_plan` |
| 5 `n1` | «Paso 5: Selección de Causa - Nivel 1» | «Causa» | 20 claves de la Tabla 1 (8 planeadas `P_`, 12 `NP_`) | `cau_niv1` |
| 6 `n2` | «Paso 6: Selección de Causa - Nivel 2» | «Detalle» | 117 por versión (las dos versiones: 234 filas en `causa_n2`) | `cau_niv2` |

Además: `cau_gral_paro` (provisional): una de las **18 causas generales** de la Res. 0651, propuesta desde la N1 (`CAU_GRAL_DE_N1@1`, `:529-551`), nunca texto libre; `desc_evid`, que arma TRIM (abajo). La fila tiene 15 campos (`CAMPOS_PARADA`, `:265-268`).

**Dos formas de salida** (`VERSIONES_CATALOGO`, `:475-496`): `C024-2026` (por defecto: la circular, el acto administrativo firmado; Circular ANH 0024 del 09-09-2026, Tabla 1, obligatoria desde el 01-12-2026) escribe la clave en `cau_niv1` y el texto de la Tabla 1 en `cau_niv2`; `DICC-V3.2` (Diccionario de Datos JSON V3.2, archivo del 20-08-2026) escribe los textos en mayúsculas. Las parejas que cambian de N1 entre versiones se resuelven con una tabla (`EQUIVALENCIA_VERSIONES`, `:364-376`: «Falla Instrumento/sensor» es `NP_CTRL` en la circular y `NP_INS` en el Diccionario), **nunca reescribiendo lo guardado**. El código de un N2 es `N1/slug` con una regla fija (`slugN2`, `:292-297`). El origen de cada campo: `M` lo que tocó una persona, `C` lo deducido que nadie confirmó (provisional; `M` si la ANH rechaza «C», sin tocar datos), `A` lo que sale de la señal o el registro.

**Ejemplo con los datos del demo.** La cadena de LC-07 (`EP-LC07-261002-79@2026-10-02#1`): interna «op-mantenimiento · planta · diferida · no-planeada · NP_PROC · NP_PROC/parada-estacion-bombeo-afecta-pozos»; en `C024-2026`: `resp_par` «Operador-Mantenimiento», `choke_mod` «PLANTA», `dif_perd` «DIFERIDA», `pla_no_plan` «NO PLANEADA», `cau_niv1` «NP_PROC», `cau_niv2` «Parada estación/bombeo afecta pozos», `cau_gral_paro` «facilidades»; origen `C` en todos (nadie la ha confirmado).

**Referencia.** `src/entities/anh-catalogo.ts` (597 líneas); `docs/plan-circular-24/P1-producto.md` §1.2 y Anexo A (los 117 N2); `scripts/verificar-arbol.mjs` comprueba los 117 contra el Anexo A (sección 1).

---

### Cada paso con su procedencia

**Qué es.** `DatoClasificado<T>` (`anh-clasificacion.ts:64-93`): `valor`, `procedencia`, `regla` con su versión (`REGLAS_ANH@2#esp-falla`, `choke.topologia@3`, `programa:PR-2011-260819`), `porque` (en el paso 2, los datos de la frase: `PorqueChoke`, `:116-138`), `por`/`porId`/`rol`/`hora` (obligatorios si es de una persona), `recibido`, `lote`, `propuesto` (lo que propuso TRIM si la persona lo cambió) y `n` (el consecutivo del servidor: el orden en que se dijo).

**Procedencias** (`:42-53`): `senal`, `registro`, `regla`, `conversion`, `programa`, `declarado` (lo escribió o contestó una persona), `confirmado` (aceptó lo propuesto), `corregido` (cambió lo propuesto), **`retirado`** (un cambio de una persona dejó incoherente lo que dijo otra: rige otra vez lo que propone TRIM, y se guarda quién, cuándo, el motivo y el valor retirado). Las de persona (`DE_PERSONA`): declarado, confirmado, corregido.

**Estado de la fila** (`EstadoParadaAnh`, `:826`; `estadoDe`, `:1206-1219`): `propuesta` («falta confirmar»), `por-precisar` («falta un dato»), `confirmada` («completa»: los 6 pasos avalados por una persona de un rol que puede avalarlos, `avalado`, `:1187-1197`), `pendiente` («sin causa»).

**Referencia.** `src/entities/anh-clasificacion.ts:38-93, 176-267, 826-891, 1187-1219`.

---

### La coherencia

**Qué es.** `problemasDeClasificacion` (`:268-311`) dice en palabras lo que impide clasificar; `clasificar` (`:312-328`), el único constructor de una `ClasificacionAnh`, lo rechaza (`ErrorClasificacion`; en la API, 422 `clasificacion-incoherente`).

**Qué texto (los mensajes).** «Falta «Quién» (Paso 1: Identificación del responsable del evento).» · ««X» no es uno de los nueve responsables de la circular (C24 p.5).» · ««X» no es uno de los cuatro componentes de la circular: pozo, planta, exportación o reservorio (C24 p.5).» · ««En el yacimiento» lo pone producción o confiabilidad, diciendo qué lo muestra (la prueba del pozo, el corte de agua, la presión de fondo o una nota); nunca sale de una señal (U2 §4.3).» · ««X» no es una de las 20 claves de causa de la circular (C24 p.6-7): la ANH rechaza la transmisión.» · ««Planeada» no va con «…» (NP_…): con una parada planeada la causa tiene que ser …. La ANH rechaza la transmisión entera por esta incoherencia.» · ««…» no es una causa de «…»: el detalle tiene que ser de su causa (C24 p.8).» · ««Descripción y evidencia» la arma TRIM con lo estructurado: nunca lleva lo que escribió una persona.» · «… no es una de las 18 causas generales: lo que dice una persona de la causa general es una de ellas, nunca un texto libre.»

**Ejemplo con los datos del demo.** `referencia/escrituras/422-clasificacion-incoherente.json`: el supervisor manda `n1: "NP_INVENTADA"` para LC-06 (`EP-LC06-251001-96@2025-10-01#1`) → 422 `clasificacion-incoherente`.

**Referencia.** `src/entities/anh-clasificacion.ts:239-330`.

---

### La propuesta de TRIM: `REGLAS_ANH@2`

**Qué es.** Para cada fila, TRIM propone los pasos que la causa decide, las opciones cerradas de lo que no decide y las preguntas (`proponerClasificacion`, `:1023-1165`; `PropuestaAnh`, `:842-891`). La tabla de reglas (`REGLAS_ANH`, `:642-754`), versión **`REGLAS_ANH@2`**, tiene **22 filas**; cada una: `tipos`, `cuando`, `propone`, `chokeEsperado`, `opciones`, `preguntas`, `alternativas`, `apunta`, `perdida`, `porque` y `fuente`. Sin causa: «Sin causa» (`pendiente`).

| Fila | Nombre (`NOMBRE_FILA`) | Propone | Lo que queda abierto |
|---|---|---|---|
| `esp-falla` | Falla de la electrosumergible (código del variador) | Mantenimiento · diferida · no planeada · NP_SUB · Falla ESP | alternativa Falla VSD |
| `esp-admision` | Electrosumergible parada por baja carga | … · NP_SUB | N2 entre 3; pozo o reservorio; preguntas «aporte» y «detalle» |
| `bombeo-mecanico` | Bombeo mecánico parado por su controlador | … · NP_SUP | N2 entre 6 |
| `linea-rodamientos` / `linea-motor` / `linea-lubricacion` | Bomba de la línea: rodamientos / motor / lubricación | … · NP_SUP · su N2 exacto | — |
| `linea-variador` | Bomba de la línea: primera alarma del variador o del arrancador | … · NP_ENINT (**apunta**) | N2: Falla VSD o MCC/Switchgear |
| `linea-sin-n2` | Bomba de la línea sin causa exacta en la tabla de la ANH | … · NP_PROC · Parada estación/bombeo afecta pozos | la parte va en la descripción |
| `linea-capacidad` | Tanque de agua al límite sin falla de la bomba | Operación · … · NP_PROC · Tanques llenos/capacidad limitada | — |
| `energia-uv-o-dedicado` | Baja tensión en un pozo | Mantenimiento · … · NP_ENINT | N2 entre los eléctricos; pregunta «corte» |
| `energia-compartido` | Cayó la energía que comparten varios pozos | … · NP_ENINT | N2 |
| `energia-frontera` | Cayó la energía en la frontera del campo | diferida · no planeada | responsable (proveedor o mantenimiento), N1 (ENEXT o ENINT), N2 |
| `aire` | Cayó el aire de instrumentos | Mantenimiento · … | N1 entre 4, N2 |
| `compresion` | Se detuvo el compresor de gas | … · NP_PROC · Capacidad compresión/transferencia gas limitada | pérdida propuesta: tea |
| `evacuacion` | Tanque de crudo o despacho de la batería | diferida · no planeada | responsable, tramo (planta o afuera), N1 (PROC o TRANSP), N2; pregunta «oleoducto» |
| `proceso` / `tratamiento` | El separador / el tratador cerró la entrada | Operación · … · NP_PROC · Capacidad tratamiento agua/crudo limitada | alternativa instrumento; el tratador propone pérdida «rechazo» |
| `programada-con-pareja` | Programa firmado, con su causa | diferida · planeada (+ la causa del programa) | — |
| `programada-sin-pareja` | Programa firmado, sin la causa | diferida · planeada | responsable, N1 entre las 8 `P_`, N2 |
| `declarada-chip` | Declarada con un motivo cerrado | diferida + lo del motivo | — |
| `declarada-mercado` | Declarada: el comprador nominó menos | Transportador · … · NP_TRANSP · Restricción nominación/entrega | — |
| `declarada-libre` | Declarada con sus palabras | diferida | preguntas «que-lo-paro», «programado», «detalle» |

**Una señal apunta** (`SenalApunta`, `:142-152`): con un código que puede venir de superficie, la causa propuesta queda «apunta» y la confirma quien abre el equipo. LC-11, `EP-LC11-260925-40` (5 filas, 3.677,2 bbl, `esp-falla`): «El código PH (desbalance de fases) puede venir de superficie (el cable, el variador o la red): las señales apuntan a esta causa, no la prueban. La confirma quien abra el equipo».

**`desc_evid`** (`desc-evid@1`, `DESC_EVID_ID`, `:958`; `descripcionDeCausa`, `:995-1021`): solo con lo estructurado (QA-D2). LC-05: «Baja tensión en el alimentador del pozo. VSD-LC05 · código UV · 1 de oct, 09:16». LC-08 (fila 1): «Continúa al corte del día. Tramo 1 de 2 del evento EP-LC08-261001-02. Ninguna señal explica por qué paró: hay que identificarlo. VSD-LC08 · código CMD · 1 de oct, 22:15. Ningún servicio caído, ninguna bomba de la línea parada, fuera del programa y sin código de falla». LC-07: «Continúa al corte del día. Tramo 1 del evento EP-LC07-261002-79, que sigue abierto. Se cerró porque la bomba de reinyección estaba parada y el tanque de agua lleno. ZS-2011 · marcha → paro · 2 de oct, 03:52. VSD-LC07 · código CMD · 2 de oct, 05:46. Sin primera alarma y sin firma: el PLC no dice qué parte falló».

**Ejemplo con los datos del demo.**

| Período | Filas | Propuesta | Por precisar | Pendiente | Con «apunta» |
|---|---:|---:|---:|---:|---:|
| La Ceiba · oct | 7 | 2 (LC-07, LC-16) | 1 (LC-05: falta el detalle) | 4 (LC-08 y LC-21, dos filas cada uno) | 1 |
| Portafolio · sep | 129 | 81 | 48 | 0 | 42 |
| Portafolio · 13 meses | 2.308 | 1.008 | 1.296 | 4 | — |

Filas por regla, portafolio septiembre: `esp-falla` 50, `esp-admision` 26, `linea-sin-n2` 19, `energia-uv-o-dedicado` 8, `bombeo-mecanico` 8, `proceso` 7, `programada-sin-pareja` 5, `linea-rodamientos` 4, `declarada-mercado` 1, `declarada-libre` 1. 13 meses: `esp-falla` 605, `energia-compartido` 538, `esp-admision` 308, `linea-sin-n2` 157, `aire` 140, `evacuacion` 127, `energia-uv-o-dedicado` 112, `compresion` 105, `tratamiento` 54, `proceso` 42, `bombeo-mecanico` 35, `programada-sin-pareja` 31, `linea-rodamientos` 25, `declarada-mercado` 11, `linea-motor` 6, `declarada-libre` 5, `pendiente` 4, `linea-lubricacion` 3.

**Referencia.** `src/entities/anh-clasificacion.ts:589-1165`; `referencia/anh/paradas-*.json` (20 casos).

---

### Las preguntas de campo

**Qué es.** Lo que la señal no decide se le pregunta a quien estuvo, con opciones cerradas y el texto exacto del botón (`PREGUNTAS_CAMPO`, `:423-588`, versión `preguntas:campo@1`). Doce preguntas fijas, cada una con quién la contesta (`ROLES_QUE_CONTESTAN`, `:359-364`; `QUIEN_CONTESTA`, `:1336-1341`):

| Pregunta (id) | Texto | Opciones | La contesta |
|---|---|---:|---|
| `que-lo-paro` | «¿Qué lo paró?» | 10 | campo |
| `tanques` | «¿Qué lo paró?» (tanque) | 3 | campo |
| `oleoducto` | «¿El oleoducto o el cliente estaba recibiendo?» | 3 | campo |
| `afecto-clima`, `afecto-orden-publico` | «¿Qué se afectó?» | 4 | campo |
| `corte` | «¿De dónde vino el corte?» | 4 | campo |
| `trabajo` | «¿Qué trabajo era?» | 9 | campo |
| `programado` | «¿Este cierre estaba programado?» | 3 | campo |
| `se-perdio` | «¿Se perdió crudo o gas que ya había salido?» | 4 | campo |
| `nominacion` | «¿Quién pidió bajar o cerrar el pozo?» | 3 | campo |
| `aporte` | «Las señales apuntan a que al pozo le faltó aporte (baja carga). ¿Fue el yacimiento?» | 2 | yacimiento |
| `evidencia-yacimiento` | «¿Qué lo muestra?» (sigue a «Sí, fue el yacimiento») | 3 atajos | yacimiento |

Más `detalle` («¿Qué fue, exactamente?», las N2 que admite la regla; la contesta «causa») y la del paso 2 cuando TRIM no lo puede proponer (`PREGUNTA_ORIGEN`; la contesta quien revisa). Quién es quién: **campo** = «operación, mantenimiento, supervisión, producción o confiabilidad»; **causa** = «el técnico que abre el equipo, supervisión, producción, el jefe de mantenimiento o confiabilidad (al operador nunca se le piden la causa ni el detalle)»; **revisa** = «supervisión, producción, el jefe de mantenimiento o confiabilidad (al operador nunca se le pide dónde se trabó)»; **yacimiento** = «producción o confiabilidad».

**Ejemplo con los datos del demo.** LC-05 (por precisar): `corte` → «Del proveedor: la red de la empresa de energía» / «Del campo: pórtico, red de media o subestación» / «De este pozo: su transformador, su variador o su cable» / «No sé»; y `detalle` → 14 opciones (Falla transformador, Falla MCC/Switchgear, Falla UPS/Fuente, Falla generador local, Falla cableado interno/empalmes, Falla protecciones (breaker/fusible/relé), Punto Caliente, Falla Sistema a Tierra, Falla por Fauna, Falla por Flora, Falla por falta de Mantenimiento, Falla VSD, Falla red interna BT/MT/AT, No sé). LC-08 y LC-21 (pendientes): `que-lo-paro` («Se dañó un equipo», «Se fue la energía», «Lluvia, rayo, creciente o derrumbe», «Bloqueo, paro, robo o amenaza», «La planta no recibe (agua o proceso)», «El tanque de crudo está lleno», «El oleoducto o el cliente no recibe», «Una autoridad lo ordenó», «Era un trabajo o una prueba programada», «No sé»), `programado` y `se-perdio`.

**La respuesta** (`responder`, `:1344-1366`; `RespuestaCampo`, `:153-175`): **no corrige ni confirma** (QA-D1; B-04). Solo el paso que determina queda `declarado` a nombre de quien contestó; un paso que su rol no avala (el tramo que sale de «De este pozo») lo confirma después quien revisa. Queda en la conversación de cada clave, y la pregunta que sigue llega en la vista. **«No sé» no fija nada**: la pregunta sigue abierta y escala a quien revisa; repetirlo no la vuelve a guardar.

**Referencia.** `src/entities/anh-clasificacion.ts:342-588, 1336-1386`.

---

### Quién dice y quién confirma qué

**Qué es.** Dos tablas (`PASOS_QUE_DECLARA`, `:1176-1182`; `PASOS_QUE_CONFIRMA`, `:1166-1175`):

| Rol | Dice (origen M) | Confirma |
|---|---|---|
| Operador (`oper`) | ¿Planeada?, Qué pasó | ¿Planeada?, Qué pasó |
| Técnico (`tec`) | ¿Planeada?, Qué pasó, **Causa, Detalle** (abre el equipo) | ¿Planeada?, Qué pasó |
| Supervisor (`sup`), producción (`prod`), jefe de mantenimiento (`jefe`), confiabilidad (`conf`) | los 6 | los 6 |

Con «una señal apunta», la causa y el detalle **solo los confirman el jefe de mantenimiento y confiabilidad** (`CONFIRMAN_LO_QUE_APUNTA`, `:1183`); la fila espera a quien abre el equipo (`esperaAQuienAbre`, `:1199-1204`). Confirman **en lote** filas de paradas distintas solo supervisión y producción (`CONFIRMAN_EN_LOTE`, `anh-paradas.ts:335`; capacidad `anh:confirmar`). Lo que se deduce de una respuesta de campo va por `responder`, que nunca confirma ni corrige.

**Referencia.** `src/entities/anh-clasificacion.ts:1166-1312, 1390-1416`.

---

### Lo que dice una persona se guarda por paso (QA-D1)

**Qué es.** Lo que el servidor guarda de la clasificación es **solo lo que dijo una persona, paso por paso, solo por inserción**; las filas ANH no se guardan (salen del libro cada vez) y lo que propone TRIM se vuelve a proponer con la regla de hoy (`docs/backend/sql/esquema.sql:2088-2103`).

**Reglas.**

- **Una escritura guarda solo los pasos que esta persona dijo en esta petición**, con su nombre y su hora. El alcance es **la fila** (clave `ParadaAnh.id`), **el evento** (clave `EventoPozo.id`, todos sus días; `aplicarAlEvento`) o **la cascada** (`aplicarALaCascada` + `ids`: una escritura por evento de la cascada, **solo en los eventos de las filas que mostró la pantalla**). Si la raíz trae más eventos de los que se vieron: 409 `cascada-cambio` («Mientras la revisaba, la cascada de {raíz} cambió: son N pozos y la pantalla mostró M (falta …). Vuelva a abrirla para verlos todos.»); sin `ids` o con filas de otra cascada: 422 `cascada-sin-ids`.
- **Lo que rige en una fila, paso por paso** (`rigeEnFila`, `anh-clasificacion.ts:1417-1437`; vista `v_clasificacion_fuente`, `esquema.sql:3178-3190`): lo más reciente (el consecutivo `n`) entre lo dicho en la fila y lo dicho en su evento; en un empate, la fila. Sin nada, lo que propone TRIM. **El tramo de exceso del programa solo usa lo suyo** (es otra decisión, no planeada).
- **Si la escritura cambiaría lo que dijo otra persona en otra fila o evento: 409 `cambia-a-otra-persona`**, diciendo cuáles, salvo que traiga motivo (5 caracteres o más, `MOTIVO_MINIMO`, `src/entities/reglas.ts:9`); con motivo, queda como corrección. Texto: «Esto cambia lo que dijo otra persona en otra fila: …. Para cambiarlo, diga por qué (un motivo de 5 caracteres o más).»
- **Cuando un cambio invalida lo que dijo otra persona** (p. ej. «¿Planeada?» deja incoherente su causa), no desaparece nada: se pide motivo (422 `falta-motivo`: «Falta el motivo: esto retira «Causa», que ya había dicho una persona (vuelve a lo que propone TRIM).») y el paso invalidado queda **`retirado`** (quién y motivo), que lo devuelve a lo que propone TRIM. La fila muestra la historia («antes: …, retirado por … porque …»; `RetiroAnh`, `anh-paradas.ts:138-159`).
- **La revisión y la respuesta de campo nunca tocan pasos**, salvo el paso que la respuesta determina.
- **El yacimiento y la marca de lote nunca se copian a otro pozo.**

**Ejemplo con los datos del demo** (`referencia/escrituras/`):

- `409-cambia-a-otra-persona`: el jefe dice «Quién» = operación para el evento de LC-14 (`EP-LC14-251019-12`, cascada del 19-oct-2025), con motivo «El equipo es de operación» → 200; después el supervisor cambia «Quién» para toda la cascada desde LC-07, **sin motivo**, mandando los 9 `ids` que vio → **409** `cambia-a-otra-persona`.
- `422-falta-motivo`: el jefe corrige el detalle de LC-09 (`EP-LC09-251018-21`) a `NP_SUB/falla-pcp` con motivo «Se abrió el equipo: fue otra cosa» → 200; el supervisor cambia «¿Planeada?» a planeada sin motivo, lo que retiraría la causa del jefe → **422** `falta-motivo`.
- `403-paso-ajeno`: el operador corrige el detalle de LC-06 → **403** `paso-ajeno` («Su rol no dice «Detalle»: lo dice …»).

**Quién lo calcula.** Servidor: inserta en `clasificacion_paso` y revisa la coherencia de lo que rige al confirmar la transacción (`clasificacion_coherente()`, `esquema.sql:2332-2362`).

**Referencia.** `src/shared/api/escrituras.ts:640-881`; `docs/plan-circular-24/CORRECCIONES-QA.md` (D1); `CONTRATO.md` · «Clasificación ANH (Circular 024)».

---

### «En el yacimiento»

**Qué es.** Solo **producción y confiabilidad** (`PONEN_YACIMIENTO`, `anh-clasificacion.ts:108`; capacidad `anh:yacimiento`) ponen el paso 2 en el yacimiento, diciendo qué lo muestra (`AtajoYacimiento`: «la prueba del pozo», «el corte de agua», «la presión de fondo», o una nota). Nunca sale de una señal. Regla `choke.yacimiento@1`. Es de cada pozo: el alcance es la fila o su evento, **nunca la cascada** (`declararYacimiento`, `:1313-1335`).

**Ejemplo con los datos del demo.** Producción pone el yacimiento en MN-23 (`EP-MN23-260905-79`, 761,5 bbl, con la prueba): el árbol pasa 761,5 al yacimiento (desarrollo) y la PE no planeada de Morichal en 13 meses baja de 3,421 % a 3,410 % (5E.5). Otro rol: 403 `sin-capacidad` «“En el yacimiento” lo ponen producción o confiabilidad: necesita la prueba del pozo, el corte de agua o la presión de fondo, que no se ven desde el campo.» (`referencia/escrituras/403-sin-capacidad-yacimiento.json`).

**Referencia.** `src/entities/anh-clasificacion.ts:97-115, 1313-1335`; `src/shared/api/escrituras.ts:936-975`.

---

### La revisión: «Algo está mal» y «Pedir a producción»

**Qué es.** `RevisionAnh` (`anh-clasificacion.ts:176-193`): **no corrige nada**; pasa la parada a quien corrige, con el motivo. Sin `pedirA`, a quien revisa (supervisión, producción, el jefe, confiabilidad); con `pedirA: 'prod'`, la pregunta del yacimiento. Sale de «REVISAR» cuando ese rol dice, corrige, contesta o confirma algo de ella (`conRevisionAtendida`, `:1462-1467`; `quienRevisa`, `esperaRevision`, `:1468-1471`). Rige la más reciente; la misma revisión sin atender no se guarda dos veces. Por WhatsApp, «2 Algo está mal» es la misma escritura, con el motivo estructurado (QA-D2; `revisarDesdeWhatsapp`, `escrituras.ts:1140-1158`).

**Qué texto (422).** «Diga qué está mal (o qué pide): queda con la parada para quien la revisa.» (`texto-corto`) · «Una parada se le pide a quien revisa: supervisión, producción, el jefe de mantenimiento o confiabilidad.» · «Esa revisión le toca a su propio rol: corríjala usted.»

**Referencia.** `src/shared/api/escrituras.ts:1088-1158`.

---

### Confirmar, de a una o en lote

**Qué es.** `POST /api/anh/paradas/confirmar { ids, cadena, pasos? }`: las filas de **una** parada (una raíz: los días de un pozo o los pozos de una cascada) las confirma de un toque quien clasifica (`anh:clasificar`), sin lote; filas de paradas distintas, solo quien firma el día (`anh:confirmar`), y van siempre en lote (`ConfirmacionLote`, `anh-paradas.ts:321-334`; `gruposPorCadena`, `:339-353`; `confirmarLote`, `:354-368`). Todas con la misma cadena; **`cadena` es obligatoria** (se confirma lo que se vio). Sube a confirmado solo los pasos que el rol avala y que nadie había avalado, **en cada fila, nunca en su evento**. Hasta 1.000 filas por petición.

**Ejemplo con los datos del demo.** Edwin Maestre (confiabilidad) confirma LC-07 de hoy: la planta del árbol de octubre pasa a 273,135 de 573,061 bbl confirmados (5E.5). Un lote que no sube ningún paso: 409 `lote-sin-pasos` «Ya estaban confirmadas: este lote no sube ningún paso y no se guardó.»

**Referencia.** `src/shared/api/escrituras.ts:1167-1260`; `src/entities/anh-paradas.ts:302-368`.

---

### Privacidad de lo que viaja (QA-D2)

**Qué es.** `desc_evid` **nunca lleva texto libre de una persona**: se arma solo con lo estructurado (la evidencia de TRIM y los roles). El texto libre (motivo, porqué, nota) se queda adentro y **no viaja a la ANH ni a ningún informe o exportación**. Los nombres de las personas se quedan en `DatoClasificado.por`; al texto nunca van. La causa general que diga una persona es una de las 18, nunca un texto.

**Referencia.** `docs/plan-circular-24/CORRECCIONES-QA.md` (D2); `src/entities/anh-clasificacion.ts:958-1021, 1438-1461`.

---

### La calidad de la clasificación

**Qué es.** `calidadClasificacion(filas, ctx)` (`src/entities/anh-calidad.ts:103-165`) → `CalidadClasificacion` (`:72-101`): por paso (`propuestas`, `avaladas`, `corregidas`, `declaradas`, `enFalta`, `pctConfirmado`, `pctCorregido`), por regla (lo que propuso cada regla y cuánto se le corrigió, `cambiadoA`), el paso 2 por equipo (filas y eventos detrás, B-47) y **los equipos sin topología** (su parada tomó el tramo de la regla por tipo de causa: se le mandan al administrador). Ruta: `GET /api/vistas/anh/calidad?campos=&desde=&hasta=` (`pedirCalidadAnh`, `src/shared/api/arbol.ts:136`).

**Ejemplo con los datos del demo.** La Ceiba, septiembre: 28 filas; responsable, tramo, impacto, planeación y causa propuestos en las 28, detalle en 17 (11 en falta); 0 avaladas y 0 corregidas (nadie ha tocado el demo). Por regla, el paso 2: `choke.topologia@3` 28 propuestas, 0 corregidas; el paso 3: `REGLAS_ANH@2#esp-falla` 13, `#esp-admision` 8, `#energia-uv-o-dedicado` 3. Paso 2 por equipo: LC-04 (5 filas, 2 eventos), LC-11 (5, 1), P-201B (4, 2). Portafolio, septiembre: 129 filas; en falta: responsable 6, tramo 0, impacto 0, planeación 1, causa 6, detalle 48; **sin topología: ZA-06** (1 fila, 1 evento: la declaración del mercado).

**Referencia.** `src/entities/anh-calidad.ts`; `referencia/anh/calidad-{campo}-2026-09.json`, `calidad-portafolio-2026-09.json`; `referencia/escenarios/correcciones/calidad-ceiba-2026-09.json`.

---

### Las escrituras y el orden de sus reglas

| Escritura | Cuerpo | Capacidad | Orden de las reglas |
|---|---|---|---|
| `POST /api/anh/paradas/:id/clasificacion` (`clasificarParada`, `escrituras.ts:893-934`) | `{ pasos, motivo?, aplicarAlEvento?, aplicarALaCascada?, ids?, cadena? }` | `anh:clasificar` | 400 forma → 403 rol, capacidad («Su rol no clasifica paradas para la ANH.»), persona → 404 fila («Esa parada no está entre las de sus campos: revise el evento y el día.», también si es de un campo ajeno: C-20) → 403 `paso-ajeno` → 409 `cadena-cambio` («Mientras la revisaba, alguien cambió esta parada: vuelva a abrirla para ver cómo quedó.») → 422 (no son pasos, ningún paso, «En el yacimiento» por aquí, texto largo) → alcance (422 `cascada-sin-ids`, 409 `cascada-cambio`) → 422 `clasificacion-incoherente` → 422 `falta-motivo` → 409 `cambia-a-otra-persona` |
| `POST …/yacimiento` (`declararYacimientoAnh`, `:942-975`) | `{ evidencia, motivo?, aplicarAlEvento?, cadena? }` | `anh:yacimiento` | 400 → 403 → 404 → 409 cadena → 422 |
| `POST …/respuesta` (`responderPreguntaAnh`, `:1006-1067`) | `{ pregunta, opcion, aplicarAlEvento?, aplicarALaCascada?, ids?, cadena? }` | `anh:clasificar` | 400 → 403 → 404 → 409 cadena → 409 `pregunta-cerrada` («Mientras la veía, alguien ya contestó esa pregunta: …») / 422 `pregunta-ajena` («Esa pregunta no es de esta parada: TRIM no la abrió.») → 403 `paso-ajeno` (««¿De dónde vino el corte?» la contesta …») → 422 opción → alcance |
| `POST …/revision` (`revisarParadaAnh`, `:1097-1129`) | `{ motivo, pedirA?, aplicarAlEvento?, aplicarALaCascada?, ids?, cadena? }` | `anh:clasificar` | 400 → 403 → 404 → 409 cadena → 422 motivo y a quién → alcance |
| `POST /api/anh/paradas/confirmar` (`confirmarParadasAnh`, `:1179-1260`) | `{ ids, cadena, pasos? }` | `anh:clasificar` (una parada) o `anh:confirmar` (lote) | 400 → 403 → 422 sin ids / más de 1.000 → 403 `paso-ajeno` → 409 `lote-sin-pasos` |

Los códigos y los textos son los de C-22 (`CONTRATO.md`); `referencia/escrituras/` trae **18 escrituras rechazadas** con su HTTP y su código (`node scripts/referencia.mjs comparar --base-url=URL --escrituras`, 5E.10).
