# Capítulo 5E · El modelo choke y el árbol de seis pasos de la ANH

Dónde se trabó cada barril que no se produjo, qué limita hoy a cada campo y cómo se clasifica cada parada para la Circular ANH 0024 de 2026.

El **modelo choke** ve el campo como una tubería en serie (yacimiento → pozos → planta → afuera) y responde dos preguntas: **qué limita hoy** al campo (el tramo más angosto) y **dónde se trabó** cada parada. Es el método de SPE-36848 (Palen y Goodwin, BP, 1996), que la ANH adoptó como el paso 2 de su árbol de causas; la NSTA británica le agrega «Mercado» como subnivel de afuera. El **árbol de seis pasos** es la clasificación que pide la Circular 0024 para cada fila de `paradas_pozo` (pozo × día operacional × causa): responsable → choke → impacto → planeación → causa N1 → detalle N2. TRIM **propone** cada paso con la señal, la topología y el programa; **pregunta** lo que la señal no decide; y **una persona confirma**. Lo que dice una persona se guarda paso por paso, solo por inserción.

Todo sale de **las mismas filas**: el libro de barriles diferidos (5A) partido por día y por causa. El reparto por tramo y por escalón, el árbol de pérdidas, la tubería, el mes a mes, la línea base y la calidad de la clasificación leen esas filas con la clasificación vigente, y por eso dan el mismo número.

Datos de todos los ejemplos: el demo (`VITE_FUENTE=demo`), `AHORA = 2026-10-02T14:00-05:00`, corriendo el motor con scripts temporales (el arranque de `scripts/verificar-libro.mjs`: `createServer` de Vite en `middlewareMode` + `instalarInsumos(INSUMOS_DEMO)`). Períodos: «sep» = septiembre de 2026 (cerrado); «oct» = 1-oct → 2-oct-2026 14:00 (en curso); «13 meses» = 1-oct-2025 → 2-oct-2026 14:00; «hoy» = la foto de las 14:00 del 2-oct. Código del commit `30132ea`, con las correcciones F4 del 23-oct (5E·H9 y 5E·H30 a 5E·H37: el factor de medición que TRIM propone y se firma, la eficiencia que no se puede creer, las frases): las líneas citadas son las de esa versión.

| # | Archivo | Contenido | Módulos principales |
|---|---|---|---|
| 5E.1 | [01-tramos-y-topologia.md](01-tramos-y-topologia.md) | Los cuatro tramos y sus palabras; el criterio único de Edinson (el alcance decide el tramo); la topología derivada del registro (conteos por campo); el caso de borde de la misma locación; lo que TRIM propone (alimentador, bomba, cascadas, registro, con sus conflictos); contestar, «Todavía no sé», la primera firma y sus 422; la vista previa del impacto; la carga por CSV | `choke.ts:59-520`, `choke-config.ts`, `configuracion.ts:119-128` |
| 5E.2 | [02-potenciales-y-lo-que-limita.md](02-potenciales-y-lo-que-limita.md) | Potencial de los pozos (pruebas × factor de medición, QA-D3) y el factor de medición: lo que TRIM propone (la mediana de los días sin paradas) y lo que se firma con las capacidades; de la planta (el tren medido más angosto, el agua pasada a crudo, el gas sin medir fuera), de afuera y el mercado; lo que limita, la holgura, el empate (NSTA §5.4) y «casi iguales» (3 %); los textos de «Qué limita hoy»; las capacidades y las reglas de su firma | `choke.ts:807-1013, 1516-1574`, `capacidades.ts` |
| 5E.3 | [03-choke-de-cada-parada.md](03-choke-de-cada-parada.md) | El tramo de cada parada (`choke.topologia@3`): la cascada, el tanque de agua lleno, la baja tensión de un solo pozo, la evacuación, lo declarado (mercado de ZA-06), las programadas; la fila ANH (día operacional, medianoche, abierta al corte, parcial, disparo, exceso, cascada) | `choke.ts:521-793`, `anh-paradas.ts` |
| 5E.4 | [04-reparto-escalones-eficiencia.md](04-reparto-escalones-eficiencia.md) | El reparto por tramo y por escalón sobre las filas del árbol (QA-A-01); la cifra única del norte (QA-D4); el escalón sin tramo (QA-D5); las identidades exactas; la brecha de las pruebas, la estructural y el potencial del sistema; lo que cabía en la holgura; la PE y la PE no planeada, y si se pueden creer (`peCreible`); el umbral de cierre puesto a prueba | `choke-reparto.ts:119-434`, `choke.ts:1218-1396` |
| 5E.5 | [05-arbol-de-perdidas.md](05-arbol-de-perdidas.md) | El árbol de pérdidas del choke (`choke.arbol@1`): tres órdenes, cada nodo = Σ de sus ramas, «falta» aparte, la rama vacía de la pérdida; ejemplos corridos y lo que mueve una corrección | `choke-arbol.ts` |
| 5E.6 | [06-tuberia-del-campo-y-del-agua.md](06-tuberia-del-campo-y-del-agua.md) | La tubería del campo (lo que pasa hoy, lo que se pierde ahora, la frase del gerente) y la del agua (cinco tramos, el colchón del tanque, «si para otra») | `choke-reparto.ts:511-674`, `choke-agua.ts`, `diferido.ts` |
| 5E.7 | [07-si-falla-hoy.md](07-si-falla-hoy.md) | «Si falla hoy»: los tres grupos (medido, techo, sin dato; QA-D6), el puesto, cada familia, lo ya parado, lo que se decide con la lista (cambió hoy, no intervenir, próximo instrumento, desembotellar, avisos de trabajo) | `criticidad.ts` |
| 5E.8 | [08-serie-mes-a-mes-y-base.md](08-serie-mes-a-mes-y-base.md) | La serie diaria, «Cambió lo que limita» (umbral y persistencia), el mes a mes por tramo y la línea base por tramo (antes de TRIM → con TRIM) | `choke-reparto.ts:675-789` |
| 5E.9 | [09-arbol-de-seis-pasos.md](09-arbol-de-seis-pasos.md) | Los seis pasos, el catálogo (20 N1, 117 N2 por versión, 9 responsables, 18 causas generales) y las dos formas de salida; procedencia y estado; la coherencia; `REGLAS_ANH@2` (22 filas); las preguntas de campo; quién dice y quién confirma; lo guardado por paso (QA-D1), `retirado`, 409/422; el yacimiento; la revisión; el lote; la privacidad (QA-D2); la calidad; las cinco escrituras | `anh-catalogo.ts`, `anh-clasificacion.ts`, `anh-calidad.ts`, `escrituras.ts:640-1260` |
| 5E.10 | [10-pantallas-y-endpoints.md](10-pantallas-y-endpoints.md) | Las 13 lecturas y las 7 escrituras nuevas, con su función del motor, su forma, sus pantallas, sus tablas y sus casos de `referencia/` | `shared/api/choke.ts`, `shared/api/arbol.ts` |
| 5E.11 | [11-huecos-y-dudas.md](11-huecos-y-dudas.md) | 37 puntos (5E·H1 a 5E·H37): preguntas a la operadora y a la ANH, lo que falta del servidor (B-33: la plantilla de Meta para las preguntas de campo, **RETIRADO (27-oct-2026)**) y las inconsistencias encontradas al correr el motor (5E·H30 a 5E·H37, resueltas el 23-oct; 5E·H9, decidida) | — |

## Las cifras del demo que más se citan

| Cifra | Período | Valor | Dónde |
|---|---|---:|---|
| Qué limita hoy en La Ceiba | hoy | los pozos, 11.857 bbl/d (planta 13.000, afuera 14.000) | 5E.2 |
| Diferido de La Ceiba | sep | 7.716,1 bbl: pozo 6.675,5 · planta 1.040,6 | 5E.4, 5E.5 |
| Diferido de La Ceiba | oct | 1.046,0 bbl: planta 573,1 · pozo 117,9 · sin identificar 355,0 | 5E.4, 5E.5 |
| Diferido del portafolio | sep | 33.944,7 bbl: pozo 24.482,6 · planta 9.159,5 · afuera 302,6 | 5E.4 |
| **No planeado (la cifra del norte)** | 13 meses | **462.267,1 bbl** (de 485.684,2 diferidos) | 5E.4, 5E.8 |
| PE / PE no planeada del portafolio (sin La Zarza, de gas) | 13 meses | 95,33 % / 3,04 % | 5E.4 |
| PE / PE no planeada de La Ceiba | sep | 94,73 % / 2,16 % | 5E.4 |
| PE de Guacamayo y El Palmar | sep | no se puede creer: sus pruebas dan menos de lo que midió el punto oficial y el factor de medición no está firmado | 5E.4 |
| Factor de medición que propone TRIM (90 días) | hoy | La Ceiba 0,966 (42 días) · Morichal 0,961 (9) · Guacamayo 1,004 (24) · El Palmar 0,998 (80); La Zarza, ninguno (gas) | 5E.2 |
| Filas ANH del portafolio | 13 meses | 2.308 (1.211 eventos; 196 parciales, 528 disparos, 6 excesos) | 5E.3, 5E.9 |
| Lo que se pierde ahora en La Ceiba | hoy | 1.966 bbl/d (P-201B 1.665 · LC-21 301) | 5E.6 |
| Colchón del tanque de agua de La Ceiba al parar P-201B | 2-oct 03:52 | 1,84 h (1,66–2,03) | 5E.6 |
| Primero de «Si falla hoy» en La Ceiba | hoy | P-201A y P-201C, 3.059 bbl/d tras 2 min de colchón | 5E.7 |

## Quién calcula qué

Todo lo de este capítulo lo calcula **el servidor**, con las mismas reglas del motor (`src/entities/`), y lo devuelve hecho. El front solo: arma la frase inmediata de una respuesta en Configuración (`fraseDe`), corre las reglas de la firma mientras se escribe (las capacidades, la topología, la coherencia de la clasificación) y comprueba que el árbol que llega se pueda creer (`revisarArbol`). **Los 422 del servidor mandan.**

## Los nombres de las decisiones

Las decisiones del QA de octubre (`docs/plan-circular-24/CORRECCIONES-QA.md`) se citan aquí como **QA-D1 … QA-D7**, para no confundirlas con las D1–D26 del capítulo 10:

| Código | Decisión |
|---|---|
| QA-D1 | Lo que dicen las personas se guarda por paso, solo por inserción, y nunca se borra ni se copia a nombre de otro |
| QA-D2 | `desc_evid` nunca lleva texto libre de una persona |
| QA-D3 | El potencial de los pozos para el choke = Σ de la prueba vigente × un factor de medición firmado (por defecto 1), nunca el factor de asignación del mes |
| QA-D4 | El indicador del norte tiene una sola cifra en el motor: el escalón `disponibilidad-no-planeada` |
| QA-D5 | Si el tramo de una parada no se sabe, el escalón sale de la causa |
| QA-D6 | «Si falla hoy»: medido, techo y sin dato, cada uno en su grupo; un equipo con respaldo bien vale 0 |
| QA-D7 | Ningún cálculo de más de 300 ms en el hilo principal: una vez por contexto y período, en memoria |

Los hallazgos del QA (QA-A-01 … QA-A-15) y las revisiones del contrato (C-01 … C-27) y de la experiencia (B-01 … B-47) se citan con su código, como en `CONTRATO.md`.

## Glosario mínimo

**Tramo** (de la tubería): yacimiento, pozo, planta o afuera; no confundir con el tramo del libro (un pedazo de tiempo de una parada). **Choke**: el tramo donde se trabó una parada (paso 2) o el que limita al campo. **Alcance**: a quién sirve un equipo (dedicado, compartido, frontera, tercero). **Topología**: la lista de equipos de un campo con su alcance y sus pozos. **Potencial del sistema**: el menor de los tres potenciales. **Holgura**: lo que le sobra a un tramo sobre el que limita. **Casi iguales**: dos tramos a menos del 3 %. **Escalón**: la clase de pérdida (desarrollo, desempeño, planeada, no planeada, capacidad, sin clasificar). **Estructural**: lo que no pasa aunque nada pare. **PE**: real ÷ potencial del sistema. **Colchón**: horas que aguanta el tanque de agua antes del alto-alto. **Techo**: una cifra de «si falla hoy» que supone cerrar todos los pozos que dependen del equipo. **Fila ANH**: pozo × día operacional × causa. **Retirado**: lo que dijo una persona y otra dejó sin efecto con motivo. Más en el anexo B.

## Lo esencial para quien construye el backend

1. **Una sola fuente de filas.** Las filas ANH salen del libro cada vez (no se guardan); lo que se guarda es lo que dijo una persona, paso por paso. Toda vista del choke lee esas filas con la clasificación vigente.
2. **El tramo sale del alcance; nadie lo escoge.** La topología firmada manda entera; sin ella, la del registro. «Todavía no sé» no se adivina.
3. **Lo que limita sale de las pruebas, nunca del factor de asignación del mes** (QA-D3). Las pruebas se leen con el factor de medición **firmado** (sin firma, 1): TRIM lo propone, pero su propuesta no rige sola. El libro sigue valorando con su factor de asignación: son dos preguntas.
4. **Una PE que no se puede creer no se da en número** (`peCreible`, `textoPe`): las pruebas por debajo del punto oficial sin el factor firmado, o un campo de gas.
5. **Una sola cifra del norte** (QA-D4): el escalón no planeado, igual en el reparto, el árbol, el mes a mes y la base.
6. **Cada nodo suma sus ramas, exacto**, y lo que falta va aparte, al final.
7. **Nada se inventa**: un tramo sin dato, una capacidad sin firmar, un campo de gas o una pregunta sin respuesta se dicen; no se rellenan.
8. **Por paso, solo por inserción** (QA-D1): 409 si cambia lo de otra persona sin motivo, 422 si retira lo de otra sin motivo, `retirado` con quién y por qué.
