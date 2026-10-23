# 5E.11 · Huecos y dudas

Lo que el modelo choke y el árbol de seis pasos todavía no tienen resuelto: las preguntas abiertas a la operadora (Edinson Romero) y a la ANH, lo que falta del lado del servidor y lo que se encontró inconsistente al correr el motor para este capítulo. Cada punto con su código **5E·Hn** (el capítulo 10 remite a ellos), su fuente y lo que se hace mientras tanto. Las preguntas numeradas de P1 son las de `docs/plan-circular-24/P1-producto.md` §8; las de U2, las de `U2-choke-experiencia.md` §10.2.

## A. Preguntas a la operadora (Edinson): el choke

| Código | Pregunta | Fuente | Mientras tanto |
|---|---|---|---|
| 5E·H1 | Un transformador (o una bomba) que sirve a 2 o 3 pozos **de una misma locación**: ¿se trabó en el pozo o en la planta? | U2 §10.2-1; CHOKE-COMPLETO §16 | Planta (sirve a varios), marcado `casoBorde: 'misma-locacion'`; si la regla cambia, cambian todos juntos con vista previa y firma (5E.1). En el demo: MPP-301 de Morichal |
| 5E·H2 | Si la baja tensión tumba **un solo pozo** de un pórtico que alimenta 18, ¿va en el pozo hasta que alguien diga de dónde vino el corte? | U2 §10.2-2; §4.4 caso 8 | Regla @2: el pozo, con la pregunta «¿De dónde vino el corte?» (LC-05; 104 tramos en 13 meses) |
| 5E·H3 | Tanque de crudo alto porque el oleoducto nominó menos: ¿afuera, aunque el tanque sea propio? | U2 §10.2-3; P1 §3.3 | Planta con la pregunta «¿El oleoducto o el cliente estaba recibiendo?»; el escalón es capacidad, no no planeado (127 filas de LACT-01 en Guacamayo) |
| 5E·H4 | Pozos con la frecuencia bajada porque el compresor está limitado: ¿en la planta? ¿Es falla (no planeada) o restricción (capacidad)? | U2 §10.2-4; §4.4 caso 4 | Planta, `NP_PROC` capacidad de compresión, **no planeada** (69 parciales de C-401); si fue una decisión comercial, la corrige una persona |
| 5E·H5 | ¿Le sirve al supervisor «En la planta o estación», o en sus campos se dice de otra forma? | U2 §10.2-5 | Las palabras de 5E.1 |
| 5E·H6 | ¿Cuánta diferencia entre dos tramos es «casi igual»? ¿Sirve el 3 %? ¿Y 3 días seguidos para avisar un cambio? | U2 §10.2-6; §0 principio 7 | `PARAMETROS_CHOKE` (`choke.parametros@2`): 3 % y 3 días, versionados |
| 5E·H7 | Frontera pozo/planta: ¿su criterio dedicado/compartido, o la frontera física de la NSTA (la distribución eléctrica y las líneas de flujo son planta)? | P1 §8-11; transcript [26:48] | Su criterio, único para todos los campos (5E.1) |
| 5E·H8 | El exceso de una parada programada sobre su ventana: ¿no planeado? La NSTA lo dejaría planeado y la ANH no lo dice. ¿Quién es el responsable del exceso? | P1 §8-15; CHOKE-COMPLETO §5.5 | No planeado (217,27 bbl de `PR-2011-260819`; 556,8 en 13 meses), para no esconder una falla bajo un mantenimiento |
| 5E·H9 | El **factor de medición** de cada campo (el sesgo del separador de prueba contra el punto oficial, medido en días sin restricción): ¿quién lo mide y lo firma? | QA-D3; CORRECCIONES-QA | 1 en todos los campos (`FACTOR_MEDICION_FIRMADO` vacío, `choke.ts:193`). Ver 5E·H30 |
| 5E·H10 | **Campos de gas**: «tienen una tolerancia diferente en cuanto a paradas de pozo» [31:08]. ¿Qué cambia: la diferida de gas, el potencial, la nominación? | P1 §8-28 | La Zarza sin tubería de gas, sin «si falla hoy» y con el agua sin pasar a crudo |
| 5E·H11 | Bomba de reinyección o multifásica con la parte identificada: ¿N1 de la falla o siempre `NP_PROC` «Parada estación/bombeo afecta pozos»? Tanques de agua de disposición llenos: ¿planta o exportación? | P1 §8-7 | `linea-rodamientos/motor/lubricacion/variador` con su N1; lo demás `linea-sin-n2`; tanques de agua, planta |
| 5E·H12 | Sin N2 en la Tabla 1: varilla partida o bomba de subsuelo de bombeo mecánico, aire de instrumentos, declinación. ¿Qué pareja? | P1 §8-12 | Opciones cerradas y la pregunta; nunca un comodín |
| 5E·H13 | Un pozo cerrado por alto corte de agua por decisión de ingeniería: ¿`P_OP` o `NP_SUB` «Alto BSW / corte de agua»? | P1 §8-14 | Lo dice una persona |
| 5E·H14 | Responsable por defecto de un workover, una prueba o una puesta en servicio programados: ¿Operación o Planeación/Logística? | P1 §8-15 | Opciones cerradas (`programada-sin-pareja`) |

## B. Preguntas a la ANH (vía Edinson): el árbol de seis pasos

| Código | Pregunta | Fuente | Mientras tanto |
|---|---|---|---|
| 5E·H15 | Una parada con diferida **y** pérdida a la vez: ¿qué va en `dif_perd`? Una pérdida sin pozo parado, ¿es fila de `paradas_pozo`? | P1 §8-1 | `DIFERIDA`; la rama de la pérdida existe y está vacía (TRIM no registra pérdidas) |
| 5E·H16 | En `cau_niv1`, ¿la clave o el texto? ¿Qué lista de N2 rige? ¿El receptor compara mayúsculas, tildes y espacios? | P1 §8-3 | `C024-2026` por defecto; `DICC-V3.2` disponible (5E.9) |
| 5E·H17 | Pozo parado a las 23:59:59: ¿qué va en `h_fin_paro`? ¿Una fila por día? ¿UTC con `Z` o hora de Colombia? | P1 §8-4 | Una fila por día; abierta = 23:59:59 COT; salida en UTC `Z` (`Config.anh.zonaSalida`) |
| 5E·H18 | Una propuesta del sistema confirmada por el ingeniero: ¿origen `C` o `M`? ¿Vale la captura en otro orden? | P1 §8-5 | `M` lo que tocó una persona, `C` lo deducido sin confirmar |
| 5E·H19 | ¿El receptor valida catálogo y coherencia aparte del Schema? ¿Devuelve el motivo del rechazo? | P1 §8-6 | Validación propia, con las reglas de `clasificar` |
| 5E·H20 | Una restricción parcial (frecuencia bajada, curtailment), ¿es fila? ¿Cómo se dice que fue parcial? | P1 §8-8 | Fila con «Parcial: X Hz de Y Hz de la prueba» en `desc_evid` (196 en 13 meses) |
| 5E·H21 | `cau_gral_paro`: ¿una de las 18 de la Res. 0651, texto libre o derivada de la N1? | P1 §8-9 | Una de las 18, propuesta desde la N1 (`CAU_GRAL_DE_N1@1`) |
| 5E·H22 | Correcciones (número y motivo), varias formaciones por pozo, `fuente_de_entrega`, la Res. 0592/2026 | P1 §8-10, 8-29, 8-30, 8-2 | Fuera de este capítulo (envío del IDP, P1 §4) |

## C. Lo que falta del lado del servidor

| Código | Qué falta | Fuente |
|---|---|---|
| 5E·H23 | **La locación de cada pozo** (para 5E·H1): no está en `Pozo` ni tiene endpoint. Se propone `Pozo.locacion` en `GET /api/campos/:campo/pozos`; el demo la trae en `src/entities/datos/topologia.ts:19-27` y `referencia/insumos/<campo>/locaciones.json` | `CONTRATO.md` · Pendiente del lado del servidor |
| 5E·H24 | **Las capacidades firmadas**: hoy todas son del demo (`estado: demo`). El 21-oct se subieron a mano para cumplir la regla de U2 §8.4 (La Ceiba 12.000 → 13.000 en crudo; Guacamayo 6.800 → 7.500 afuera); con capacidades firmadas, la firma lo revisa (5E.2) | Ídem |
| 5E·H25 | **Las preguntas de campo por WhatsApp (B-33)**: necesita una **plantilla nueva de Meta** para la pregunta de la clasificación («¿De dónde vino el corte?» con sus opciones numeradas), el registro de mensajes que la manda al operador del campo cuando la fila tiene una pregunta de campo abierta (y la que sigue cuando llega la respuesta), y la entrada del webhook con las reglas de `POST …/respuesta` y la persona del número | Ídem; 5D.5 |
| 5E·H26 | **La captura sin señal**: el cuerpo traería la hora del toque y el servidor guardaría la suya en `recibido`. Hoy la hora la pone el servidor | Ídem (U1 P-9) |
| 5E·H27 | **El resto del carril ANH** (P1 §5): el reparto por causa, responsable y planeación (`/vistas/anh/reparto`), las opciones por fila, el cierre del día, la conversión del árbol de la operadora y el envío del IDP | Ídem |
| 5E·H28 | **El campo ajeno en las vistas** (C-16): `403 sin-permiso`. Sin sesión, el demo no lo puede probar | Ídem |
| 5E·H29 | **El registro de pérdidas** (lo producido que no se vendió): sin él, la rama de la pérdida del árbol queda vacía | 5E.5; P1 §1.9 |

## D. Inconsistencias encontradas al correr el motor

| Código | Qué se encontró | Dónde | Recomendación |
|---|---|---|---|
| 5E·H30 | **La PE pasa del 100 %**. En septiembre de 2026, con la brecha de las pruebas negativa (el punto oficial midió más de lo que dicen las pruebas): Guacamayo PE 97,60 + PE no planeada 3,12 = 100,73 %; El Palmar 96,80 + 3,99 = 100,79 %; La Zarza PE **102,87 %**. El comentario del código dice que «PE + PE no planeada nunca pasa de 100 % por lo que cupo en la holgura»: eso solo vale si las pruebas no se quedan cortas | `src/entities/choke.ts:1224`; `choke-reparto.ts:315-334` | Medir y firmar el factor de medición (5E·H9); mientras tanto, que la pantalla diga «las pruebas dan menos que el punto oficial» cuando la brecha de las pruebas sea negativa, y corregir el comentario |
| 5E·H31 | **La frase de lo estructural nombra un solo tramo con el total**: con las capacidades de antes, «Afuera no deja pasar todo lo que pueden dar los pozos: 66.382 bbl …», aunque 30.045 de esos barriles son de la planta de La Ceiba y 36.337 de afuera de Guacamayo | `src/entities/choke-reparto.ts:337-351` (el tramo sale del mayor, `:340`) | Una frase por tramo (o por campo) con su cifra |
| 5E·H32 | Gramática del empate: «Ampliar uno solo no da un barril más; se toma **los pozos**, el primero de la tubería» | `src/entities/choke.ts:833` | «se toman los pozos» (o «se toma el tramo de los pozos») |
| 5E·H33 | El comentario de `rigeEnFila` dice que es la regla de `v_clasificacion_rige`; en el esquema la vista se llama `v_clasificacion_fuente` | `src/entities/anh-clasificacion.ts:1416`; `docs/backend/sql/esquema.sql:3170` | Corregir el nombre en el comentario |
| 5E·H34 | El comentario de `serieChoke` dice que, sin el filtro de «casi iguales», La Ceiba cambiaría siete veces en trece meses. Con el demo de hoy no cambia ninguna vez, y con las capacidades de antes, una | `src/entities/choke-reparto.ts:643-646` | Quitar la cifra o sacarla de un caso de `referencia/` |
| 5E·H35 | `CONTRATO.md` dice que el tren de crudo de Guacamayo pasó de 7.400 a 7.500 bbl/d; el demo trae **8.000** (`planta.ts:227`), y con 8.000 se generaron `referencia/` y este capítulo | `CONTRATO.md:1886`; `src/entities/planta.ts:227` | Decidir cuál vale y alinear el contrato |
| 5E·H36 | En un campo de gas, «Si falla hoy» deja todas las filas **sin dato** («lo que cuesta una falla en gas todavía no se calcula»), pero su `porque` sigue diciendo una cifra de crudo: «Si P-201B falla hoy, quedan 1.429 bbl/d de agua sin salida: el campo pierde 3.159 bbl/d», «Si ZA-01 falla hoy, se pierden sus 479 bbl/d» | `src/entities/criticidad.ts:350-351` | En un campo de gas, que el `porque` no lleve barriles de crudo |
| 5E·H37 | El umbral de cierre de la NSTA (lo sin explicar ≤ 2,5 % del potencial, `cuadra`) no se pone a prueba en el demo: en todos los períodos corridos para este capítulo (septiembre, octubre en curso, 13 meses) lo sin explicar es 0. Día por día sí aparece: es el residuo del libro (La Ceiba, 22-sep-2026: 88,441 bbl, 0,8 % de su potencial del libro) | `src/entities/choke-reparto.ts:315-334` | Un caso de `referencia/` con lo sin explicar distinto de cero, y uno que pase el 2,5 % |
