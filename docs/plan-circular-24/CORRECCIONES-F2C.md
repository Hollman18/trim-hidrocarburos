# Correcciones F2-C · la experiencia (QA-B)

**22-oct-2026 · F2-C.** Marcas de cada hallazgo: **hecho** (archivo y prueba), **decidido distinto** (por qué) o **fuera de alcance** (por qué). Las rutas son de `src/` salvo que digan otra cosa. «e2e F2-C» es `e2e/experiencia-f2c.spec.ts` (nueva); «libro», «árbol» y «contrato» son `scripts/verificar-*.mjs`. Las capturas de cada pantalla que cambió, a 1280 y 390 px, quedaron en la carpeta de trabajo de la sesión (`f2c/cap/*.png`, 50 archivos).

## Lo que cambió en el motor y en el contrato

El motor calcula y la pantalla pinta: cada dato nuevo salió del motor, con su prueba, y está en `CONTRATO.md`.

- **`entities/anh-paradas.ts`.** `ParadaAnh.inicioEvento` (cuándo empezó el evento, no el tramo del día) y `hz?: { parada, prueba }` (la frecuencia a la que quedó y la de su prueba). Para B-22.
- **`entities/choke-agua.ts`.** `TuberiaAgua.siParaOtra?`: con una bomba de la línea ya parada, qué pasa si para otra (lo que entra, lo que cabe, el agua sin salida, el colchón al nivel de ahora, el orden de cierre y el crudo). Es la misma cuenta del «si falla hoy» de las hermanas en `criticidad.ts`. Para B-01.
- **`entities/choke.ts` y `choke-reparto.ts`.** `EquipoBbl.tipo` (la causa con más barriles) y `fraseGerente` nueva: «Se trabó sobre todo en la planta: P-201B (bomba de reinyección). 355 bbl todavía sin identificar.» Para B-13.
- **`entities/choke-arbol.ts`.** El nodo de la causa (N1) usa el nombre de la Tabla 1, el mismo de Identificar. Para B-27.
- **`entities/anh-clasificacion.ts`.** Para B-11, el porqué de «la bomba de la línea sin N2». Para B-31, la fila `evacuacion` pregunta directo «¿El oleoducto o el cliente estaba recibiendo?», y una sugerencia que ya no corresponde a la causa o a la planeación dicha se borra. Para B-29, los huecos de la tabla no nombran a nadie del proyecto.
- **`entities/anh-calidad.ts`.** `eventos` en `chokePorEquipo[]` y en `sinTopologia[]`: las paradas detrás de las filas. Para B-47.
- **`entities/reloj.ts`.** El día va sin cero delante (`day: 'numeric'`). Con el año, `'2-digit'` escribía «03 de nov de 2025». Para B-25.
- **`entities/mensajes.ts`.** El primer mensaje de WhatsApp de una bomba dice su respaldo en corto (`respaldoCorto`). Para B-05.
- **`entities/choke-config.ts`.** La carga por CSV bloquea un pozo que sirve a otro, igual que la firma (C-13). Así se dice en su fila y no en la firma.
- **`shared/api/escrituras.ts`.**
  - `confirmarParadasAnh`: las filas de **una** parada (misma `campoId` + `raiz`) las confirma de un toque quien clasifica, sin lote. Un lote, de paradas distintas, sigue siendo de quien firma el día (`403`). Para B-07.
  - `previsualizarConfiguracion`: con `aunConErrores: true`, los `422` de las reglas y de las capacidades no cortan la vista previa. Responde `{ impacto, errores[] }`. Para B-53.
- **`CONTRATO.md`.** Documenta `TipoCausa`, `EquipoBbl.tipo/porTipo`, `TuberiaCampo.fraseHoy`, `fraseGerente` y `brechaPruebasBpd` (este lo agregó F2-B y no estaba escrito), `TuberiaAgua.siParaOtra`, `ParadaAnh.inicioEvento/hz`, `CalidadClasificacion.eventos`, la confirmación de una parada sin lote, `aunConErrores` y la regla del pozo en la carga por CSV.
- **`referencia/`.** Se regeneró y se revisaron las diferencias campo por campo. Solo cambia lo de arriba:
  - campos nuevos: `inicioEvento`, `hz`, `siParaOtra`, `eventos`, `tipo`;
  - textos: el porqué de B-11, los huecos y el gas sin nombres, `fraseGerente`, la N1 del árbol y la pregunta del oleoducto;
  - fechas sin cero.
- **SQL (`docs/backend/sql`).** Se corrió `validar.sh` (PostgreSQL 16). Terminó sin errores. Cambiaron `ejemplos.sql` y `tablas.json` (los textos de los mensajes) y `validacion.log`.

## Lo que F2-A y F2-B dejaron para la pantalla

| De | Qué | Estado | Dónde y prueba |
|---|---|---|---|
| F2-A | «Para la cascada» manda `ids` con TODAS las filas de la raíz y dice ese número («los 18 pozos») | **hecho** | `widgets/arbol/Tarjeta.tsx` («Algo está mal»), `Editor.tsx` (corregir y «Pedir a producción») y `Preguntas.tsx` reciben `raiz` (`ArbolIdentificar.tsx` arma la raíz con lo que muestra). e2e `arbol-identificar` (cascada de P-201B en 390 px: «¿Aplica a los 2 pozos de esta parada?») |
| F2-A | Ante el 409 (otra persona) o el 422 («retirado»), el Editor pide el motivo | **hecho** | `Editor.tsx` (`pideMotivo` cuando el error lo pide). e2e F2-C: el supervisor cambia «¿Planeada?» sobre la causa que dijo el jefe; el servidor responde 422, el editor pregunta «¿Por qué lo cambia? (cambia lo que dijo otra persona)» y guarda con el motivo |
| F2-A | B-04 en pantalla: la tarjeta repite lo que contestó el operador | **hecho** | `Preguntas.tsx` («Usted contestó: … · Cambiar», `data-contestado`), `marcas.ts` («TRIM lo dedujo de lo que contestó Jairo Peña · 14:00»). e2e `arbol-identificar` (el operador) |
| F2-A | B-05 en pantalla: el cierre «Así queda…» en el mismo chat y «Ver mi chat de WhatsApp» | **hecho** | `pages/Causa.tsx` (el chat se abre por evento y sigue abierto al contestar). e2e `arbol-identificar` (WhatsApp) |
| F2-B | D4: «No programado (libro)» donde se muestra `Libro.noPlaneado` | **hecho** | `pages/Resumen.tsx` y `pages/Mantenimiento.tsx`. e2e F2-C (el globo de Mantenimiento) |
| F2-B | D4: «lo no planeado de cada tramo» lee `porChokeEscalon` | **hecho** | `widgets/resumen/DondeSeTrabo.tsx` (`NoPlaneadoPorTramo`: no planeado, planeado, «sin saber si fueron planeados» y «sin una falla»). e2e `choke-arbol` (el gerente) |
| F2-B | D3: el ⓘ de «Los pozos» y el cuadre con `brechaPruebasBpd` | **hecho** | `widgets/choke/Tuberia.tsx`: el ⓘ con `tramos[pozo].fuente`, y debajo de «Perdiéndose ahora» la frase «Los pozos dan 11.857 según sus pruebas: pasan 9.394, se pierden 1.966 y los otros 497 son lo que las pruebas dan de más que el medidor oficial». También va en la tabla. e2e F2-C (el cuadre cierra) |
| F2-B | D6: los tres grupos de «Si falla hoy» y la frase de La Zarza | **hecho** | `widgets/riesgo/SiFallaHoy.tsx` (`data-grupo-si-falla`). e2e `choke-gerente-riesgo` (orden por grupo) y F2-C (La Zarza) |
| F2-B | B-14, B-16, B-17, B-18: `fraseHoy` y `frases`; «◄ limita» solo si `limita`; sin «≈ de crudo» si no hay crudo | **hecho** | `Tuberia.tsx`, `HoyLimita.tsx`, `widgets/choke/Agua.tsx`, `AguaHoy.tsx` (nuevo). e2e `choke-produccion` (agua) y F2-C |
| F2-B | B-12: el ⓘ de `porTipo` en «Por tramo» | **hecho** | `widgets/diferidos/PorTramo.tsx`; «N paradas de un solo pozo» en `Paretos.tsx`. e2e F2-C (LC-04) |
| F2-B | B-22: la tarjeta | **hecho** | ver B-22 |
| F2-B | e2e `choke-produccion.spec.ts:128` («cabe más agua») | **hecho** | la misma prueba, con «◄ limita» ausente y «casi iguales» con borde discontinuo |
| F2-B | B-17: la ficha de P-201B desde el motor | **hecho** | `PanelEquipo.tsx`: con la bomba parada no se pinta la lectura fija del registro; va `AguaHoy` |
| QA-C | C-13: la pantalla no ofrece lo que la firma rechaza | **hecho** | `widgets/configuracion/TopologiaPaso.tsx`: un pozo tiene una sola respuesta, él mismo («Es un pozo: solo se sirve a sí mismo»). La carga por CSV lo bloquea en su fila. e2e `choke-configuracion`: ahora el equipo que cambia es K-101 (la prueba antes hacía que un pozo sirviera a otro). `verificar-contrato` (fila 8 del CSV) |

## QA-B · bloqueante y altos

| Id | Estado | Qué y dónde | Prueba |
|---|---|---|---|
| B-01 | **hecho** | El orden de cierre y el colchón llegan a quien opera:<br>· en la ficha de una bomba de reinyección (supervisor y operador), «LA TUBERÍA DEL AGUA, HOY»: entra, caben, el tanque, si el nivel sube y, con una bomba ya parada, «Si para otra bomba ahora, cierre primero los más acuatosos: LC-02 · LC-10 · … → se pierden 3.059 bbl/d (parejo, 4.577), después de 2 min de colchón» (`widgets/choke/AguaHoy.tsx`, nuevo; motor `siParaOtra`);<br>· en Bombas, «SIN INSTRUMENTO»: P-201A y P-201C con su «si falla hoy» y una ficha mínima (`pages/Bombas.tsx`, `PanelEquipo.tsx`);<br>· en Agua, el renglón «SI PARA OTRA BOMBA». | libro §29 (`siParaOtra` = el «si falla hoy» de P-201A); e2e F2-C (Bombas y agua) y `choke-produccion` (agua) |
| B-02 | **hecho** | El operador y el técnico tienen una sola lista, «POR CONTESTAR»: primero lo que pregunta el libro y después las preguntas del árbol. Una parada que todavía espera la respuesta del libro no se pregunta dos veces (`pages/Causa.tsx`, `ArbolIdentificar.tsx`: `antes`, `excluir`). Lo que TRIM ya dedujo va plegado: «no tiene que hacer nada». | e2e `arbol-identificar` (el operador) |
| B-03 | **hecho** | «¿Está bien? …» y «Sí, así fue» salen solo después de que contestó, con lo de su terreno en palabras. No se confirma fila por fila (`Tarjeta.tsx`). | e2e `arbol-identificar` (sin «Sí, así fue» antes de contestar) |
| B-04 | **hecho** (pantalla; el motor es de F2-A) | Arriba de la tarjeta: «Usted contestó: … · Cambiar». En lo técnico: «TRIM lo dedujo de lo que contestó Jairo Peña · 14:00», no «dijo» (`Preguntas.tsx`, `marcas.ts`, `palabras.ts` `deducidoDeRespuesta`). | e2e `arbol-identificar` (el operador; el supervisor ve lo mismo) |
| B-05 | **hecho** (pantalla; el registro es de F2-A) | El chat sigue abierto al contestar y el cierre «Así queda lo que usted contestó…» llega en el mismo hilo. El primer mensaje dice el respaldo en corto (`respaldoCorto`). «Ver mi chat de WhatsApp» para el propio operador (`pages/Causa.tsx`, `entities/mensajes.ts`). | e2e `arbol-identificar` (WhatsApp); libro §8b sigue verde |
| B-06 | **hecho** (pantalla; el motor es de F2-B) | Tres grupos: lo medido con puesto; «Sin cifra todavía · techo si cierran todos sus pozos»; «Sin dato · lo que falta para calcularlos» (`widgets/riesgo/SiFallaHoy.tsx`). | e2e `choke-gerente-riesgo` (orden por grupo; los techos dicen «hasta») |
| B-07 | **hecho** | Una parada de varios pozos o de varios días (una raíz) es una sola decisión: «Confirmar esta parada (2 pozos · 2 filas)», sin lote, también para el jefe y confiabilidad. Supervisión y producción siguen confirmando en lote (`escrituras.ts`, `Tarjeta.tsx`). | contrato B-07 (18 filas de una cascada, sin lote; con otra parada, 403); e2e F2-C (el jefe) |
| B-08 | **hecho** | Mes a mes por tramo: los meses fuera del período no se atenúan (el gris es el dato). El mes del período va con contorno y su rótulo en negrilla. Botón «Por cómo se identificó» (`diferidos/MesAMes.tsx`, `choke/Mensual.tsx`). | e2e F2-C (`data-mes-activo`) |
| B-09 | **hecho** | Una sola leyenda, «Franja y barras:», con el dibujo de cada tramo. La franja y las barras usan los mismos patrones (`choke/Serie.tsx`). | e2e F2-C (una leyenda) |
| B-10 | **hecho** | En el papel, el ⓘ que se repite en cada rama (la pérdida) y el de la cabecera («modelo choke») no se imprimen en su fila: van una vez al final del árbol (`shared/ui/Info.tsx` `imprimir`, `ArbolCircular.tsx`, `Ramas.tsx`). | e2e F2-C (Regulatorio en el papel: una vez, y ningún renglón se estira) |

## QA-B · medios

| Id | Estado | Qué y dónde | Prueba |
|---|---|---|---|
| B-11 | **hecho** | Paso 1: «La falla es de la bomba P-201B (sello mecánico): la tabla de la ANH no tiene una causa exacta para esa parte», o, sin la parte, «…; la parte la dice quien la abra» (`anh-clasificacion.ts`). Paso 6: «falta la parte de P-201B · la dice quien la abra». Un porqué repetido dice «por la misma razón del paso 1» (`Cadena.tsx`). El paso 2 ya dice «porque el tanque de agua se llenó con P-201B parada» (motor del tramo). | referencia (porqués); e2e F2-C (el jefe) |
| B-12 | **hecho** (pantalla) | El ⓘ de `porTipo` en «Por tramo» («LC-04 · 2.261 bbl: 2.126 de electrosumergible y 135 de energía eléctrica…») y «N paradas de un solo pozo» en el Pareto (`PorTramo.tsx`, `Paretos.tsx`). | e2e F2-C (LC-04) |
| B-13 | **hecho** | Dos renglones por campo: la barra con la parte de cada tramo («pozos 87 %») y la frase del motor: «Se trabó sobre todo en los pozos: LC-11 y LC-04 (electrosumergibles).». Lo demás va plegado en «Ver más de {campo}» y en el papel sale desplegado (`DondeSeTrabo.tsx`; `fraseGerente` y familia en `choke-reparto.ts`). Una palabra con su parte que no cabe en su segmento va al lado de la barra (`tramos.tsx`, umbral 20 %). | libro §27 (frase); e2e `choke-arbol` (el gerente) y `choke-gerente-riesgo` |
| B-14 | **hecho** | La frase de hoy (`fraseHoy`) va debajo de la de siempre, y hay una raya discontinua dentro de la planta en los dos dibujos (`Tuberia.tsx`). En Turno, al lado de lo que limita (`HoyLimita.tsx`). | e2e `arbol-identificar` (Turno) y F2-C (Producción) |
| B-15 | **hecho** | «Lo relleno es lo que pasa ahora; lo vacío, lo que cabría» (`choke/palabras.ts`). | e2e F2-C (¿cómo se lee?) |
| B-16 | **hecho** | En el agua: «cabe más» (no «le sobran»), las frases del motor que dicen con quién está casi igual, y «◄ limita» solo si el agua limita. Lo casi igual lleva borde discontinuo grueso (`choke/Agua.tsx`). | e2e `choke-produccion` (agua) |
| B-17 | **hecho** | Con la bomba parada, la ficha no pinta la lectura fija del registro: va «LA TUBERÍA DEL AGUA, HOY», que arma el motor («El nivel no sube: P-201A y P-201C toman lo que entra») (`PanelEquipo.tsx`, `AguaHoy.tsx`). | e2e F2-C (Bombas y agua) |
| B-18 | **hecho** | Agua: sin «≈ de crudo» donde el motor no lo da. «Si falla hoy» de La Zarza: una frase, «La Zarza es un campo de gas: lo que cuesta una falla en gas todavía no se calcula.» (`Agua.tsx`, `SiFallaHoy.tsx`). | e2e F2-C (La Zarza) |
| B-19 | **hecho** | Turno, dos renglones: «Qué limita hoy» con su frase de hoy, y «Lo más frágil: el agua. Si para otra bomba de reinyección hay que cerrar pozos, y P-201A y P-201C no tienen instrumento: TRIM no verá venir su falla.». Sin puesto ni lista (`HoyLimita.tsx`). | e2e `arbol-identificar` (Turno) |
| B-20 | **hecho** | P-201B lleva su marca de hoy (◆1) en toda la pantalla. La urgencia de identificar va en palabras («no arrancar») (`Turno.tsx`, `Causa.tsx`). | e2e F2-C (una sola marca en Turno) |
| B-21 | **hecho** | Se cuentan paradas, y las filas van aparte: «SIN CAUSA · 2 paradas (4 filas del reporte)». En Turno, «2 paradas · sin causa: LC-08 y LC-21 · 219 bbl hoy (355 desde que pararon)». El estado dice «faltan 4 pasos» cuando falta más de uno (`palabras.ts`, `ArbolIdentificar.tsx`, `CierreDeHoy.tsx`, `Tarjeta.tsx`). | e2e F2-C (el jefe) y `arbol-identificar` (Turno) |
| B-22 | **hecho** | La tarjeta dice desde cuándo, con la hora del evento: «cerraron 05:43», «parada desde el 25 de sept, 06:40 (en este período, desde el 1 de oct)», «con la frecuencia bajada desde el 15 de abr, 02:10 · parcial: 41,5 de 55,5 Hz» (motor `inicioEvento` y `hz`; `palabras.ts` `desdeCuando`). Las filas: «2 de oct · 05:46 a 23:59 (sigue al cierre del día)». | referencia (`inicioEvento`, `hz`); e2e F2-C (el jefe) |
| B-23 | **hecho** | Una pregunta a la vez, en el lugar de la que se contestó, con «Después, una pregunta más». Arriba, lo contestado. En el teléfono, cinco respuestas y «Más opciones…» (`Preguntas.tsx`, `palabras.ts` `enOrden`). | e2e `arbol-identificar` y F2-C (producción) |
| B-24 | **hecho** | En el teléfono, las respuestas, «Sí, así fue», «Algo está mal» y los botones de la tarjeta miden 48 px (`min-h-12`). | e2e F2-C (390 px: todas ≥ 44 px) |
| B-25 | **hecho** | Sin fechas ISO y sin cero delante, en todo lo que pasa por `reloj.ts` (`day: 'numeric'`) y en las filas (`horasDeFila`). | referencia (fechas); e2e F2-C (el jefe: ninguna fecha mal) |
| B-26 | **hecho** | «LO QUE NO SE PRODUJO, POR TIPO», con los nombres de Diferidos y «sin identificar» (`Escalera.tsx`, `PorTramo.tsx`: `ESCALON_CAMPO`). Sin la patente en el ⓘ. | e2e F2-C (Producción) |
| B-27 | **hecho** | La N1 se llama igual en el árbol y en Identificar: «No planeada - Proceso / Facilidades» (`choke-arbol.ts`). | referencia; e2e `choke-arbol` |
| B-28 | **hecho** | En el papel, el dibujo con su frase y la tabla con su título no se parten (`break-inside: avoid`). La tabla va justo debajo del dibujo. El formulario del cuadre con la asignación oficial no se imprime: van el campo y el mes (`Tuberia.tsx`, `AsignacionOficial.tsx`). | e2e F2-C (en el papel) |
| B-29 | **hecho** | Sin «(Edinson)» (gas, caso de borde, `CapacidadesPaso.tsx`), sin «LLM» («Esta cifra la calcula TRIM con reglas fijas», `Ciclo.tsx`), sin la patente, sin «(lote LOTE-1)» («en un solo lote»). En la Filosofía, el nombre del equipo en lugar de la clave del esquema («Manifold de producción», no «manifold»; `topologia.ts` `esClaveInterna`). El impacto dice «K-101 · Sistema de aire de instrumentos». | e2e F2-C (pantalla, ⓘ y papel), `arbol-identificar` (Turno) y `choke-configuracion` (los nombres) |
| B-30 | **hecho** | Lo que bloquea lleva la marca de aviso y «Bloquea la firma:». Lo demás lleva el círculo gris discontinuo y «Revise:». El morado queda solo para dato inválido (`CapacidadesPaso.tsx`). | e2e `choke-configuracion` (capacidades) |
| B-31 | **hecho** | Con la señal del tanque de crudo, la pregunta va directa: «¿El oleoducto o el cliente estaba recibiendo?». Debajo va «Nota del evento: «…nominación del oleoducto»». Si se cambia la causa, se borra la sugerencia de detalle que ya no corresponde (`anh-clasificacion.ts`, `Preguntas.tsx`). | árbol §10 y §12; e2e `arbol-identificar` (tanques llenos) |
| B-32 | **hecho** | Baja carga: primero «¿Fue el yacimiento?»; «¿Qué fue, exactamente?» sale solo después (`enOrden`: la de seguimiento primero, luego el orden de la tabla). | e2e F2-C (producción) |
| B-33 | **fuera de alcance** | Necesita una plantilla nueva de Meta y que el registro de mensajes mande la pregunta según el estado de la clasificación. Hoy el registro no lee lo guardado (F2-A lo marcó igual). La pregunta se contesta en la pantalla con un toque. El hilo en la tarjeta viene cuando el mensaje exista. | — |
| B-34 | **hecho** | Una rama de un solo hijo va en un renglón, con los barriles una vez: «No planeada · No planeada - Proceso / Facilidades · Parada estación/bombeo afecta pozos · P-201B · bomba de reinyección · sin parte · 573 bbl». Cada eslabón conserva su paso y sus barriles (`data-nodo-cadena`) (`Ramas.tsx`). | e2e `choke-arbol` (un renglón; las ramas se leen enteras) |
| B-35 | **hecho** | Cada tramo con su dibujo además del gris: los pozos liso, la planta a rayas, afuera a puntos y lo sin identificar rayado y discontinuo. Va igual en las barras, el mes a mes, la serie y la tendencia del gerente (`reparto.ts` `RELLENO`/`rellenoSvg`, `tramos.tsx` `PatronesTramo`). | e2e F2-C (la planta con dibujo) |
| B-36 | **hecho** | «Ver como tabla» abre la tabla justo debajo del dibujo y el foco va a su título (`Tuberia.tsx`). | e2e F2-C (el foco) |
| B-37 | **hecho** | Para ingeniería, la ficha dice «Si falla hoy: hasta 9.394 bbl/d (un techo…) · se trabaría en la planta (18 pozos)», con el puesto y «sube porque…» (`SiFallaHoyFicha`). P-201A y P-201C tienen su ficha mínima (`PanelEquipo.tsx`). | e2e F2-C (K-101 y P-201A) |

## QA-B · bajos

| Id | Estado | Qué y dónde | Prueba |
|---|---|---|---|
| B-38 | **hecho** | Una dirección a un campo (o al portafolio) que la persona no tiene abre el suyo y lo dice arriba: «Usted no tiene asignado el campo La Zarza: le mostramos La Ceiba.» El aviso vale mientras no se mueva de esa vista (`app/url.ts` `campoAjeno`, `app/store.ts` `avisoCampo`, `App.tsx`). | e2e F2-C |
| B-39 | **hecho** | «Nada se trabó en octubre (en curso).» (`periodoEnFrase`). Sin la leyenda de los tramos cuando no hay barra (`DondeSeTrabo.tsx`, `PorCampo.tsx`, `PorTramo.tsx`). | e2e F2-C (La Zarza) |
| B-40 | **hecho** | Los totales van sin marca de alarma: «Perdiéndose ahora», «2 · Durante», «Durante · crudo en vivo», «por identificar» y «arrancó sin identificar». La marca va con el equipo que los causa (◆1 P-201B), en Turno, Riesgo, el Resumen del gerente y el de ingeniería (`Turno.tsx`, `Riesgo.tsx`, `ResumenDirectivo.tsx`, `riesgo/Ahora.tsx`, `shared/ui/PorIdentificar.tsx`, `Bombas.tsx`, `Mantenimiento.tsx`, `Causa.tsx`). | e2e F2-C (Turno y Riesgo) |
| B-41 | **hecho** | Nada parpadea: el círculo de la alarma P1 en el esquema de Planta queda quieto (`index.css`, `pages/Planta.tsx`). | e2e F2-C (ningún elemento animado) |
| B-42 | **hecho** | «ya pasó el límite» en lugar de «ya fuera» (`Riesgo.tsx`, `Turno.tsx`, `Mantenimiento.tsx`, `Trabajo.tsx`, `ResumenDirectivo.tsx`). | e2e F2-C |
| B-43 | **hecho** | La marca de alarma va en la columna «¿Lo vigila TRIM?» («sí · ◆1»), no pegada al puesto (`SiFallaHoy.tsx`). | e2e F2-C (ninguna marca en la columna del puesto) |
| B-44 | **hecho** | «┄ sin instrumento» con su forma propia (rectángulo discontinuo y la palabra), no la de «sin comunicación» (`choke/Agua.tsx`, `pages/Bombas.tsx`). | e2e F2-C (Agua) |
| B-45 | **hecho** | «LC-07 y LC-16 quedan para revisar»; «Ver mi chat de WhatsApp» para el propio operador; «bbl no se produjeron» en Producción con todos los campos (`choke/Campos.tsx`); «le pidió a la ingeniera de producción»; «en octubre (en curso)» en Calidad (`arbol/Calidad.tsx`); lo de B-11. | e2e F2-C (Producción con todos los campos, Calidad) |
| B-46 | **hecho** | En el teléfono, corregir se abre como hoja inferior (un diálogo al 90 % de la pantalla, con Escape y el foco de vuelta) y «Pedir a producción» es un campo de dos renglones (`shared/ui/HojaInferior.tsx`, nuevo; `Editor.tsx`). | e2e F2-C (390 px) |
| B-47 | **hecho** | «MN-41 · 1 parada (2 filas) · 0 corregidas» (motor `eventos`; `Calidad.tsx`). | referencia (`eventos`); e2e F2-C |
| B-48 | **decidido distinto** | Los dos mes a mes no parten lo mismo: el de Diferidos parte cada mes por cómo se identificó (señal, declarado, sin identificar) y el del gerente, por alto impacto. Llamar «Por equipo» al primero diría algo que no pinta (la lección de B-09). Queda «Por cómo se identificó» / «Por dónde se trabó» en Diferidos y «Por equipo» / «Por dónde se trabó» en el Resumen (U2 §7.4). Los dos empiezan por «Por …» y el segundo es siempre el mismo. | — |
| B-49 | **hecho** | Lo que TRIM deduce y nadie contestó no se ve marcado: la opción va con borde discontinuo y «propuesta de TRIM, sin aceptar». El renglón dice «TRIM deduce: …» y el ⓘ de los filtros explica la diferencia entre «Sin responder» y «Propuestas de TRIM» (`TopologiaPaso.tsx`, `topologia.ts`). | e2e `choke-configuracion` |
| B-50 | **hecho** | La misma base en los dos renglones: «(jun a ago → con TRIM, desde el 1 de sept)» (`ResumenDirectivo.tsx`, `DondeSeTrabo.tsx`). | e2e F2-C |
| B-51 | **hecho** | Los planes de acción salen desplegados en el papel, sin el botón (`ciclo/Ciclo.tsx`). | e2e F2-C (sin «Ver planes de acción» en el papel) |
| B-52 | **hecho** | «Algo está mal» trae atajos de un toque antes del campo: «No paró por eso» · «Lo cerré yo a mano» · «El pozo es otro». Con uno basta para enviar (`Tarjeta.tsx`). | e2e F2-C (el operador) |
| B-53 | **hecho** | Con errores, el paso 3 muestra igual lo que cambiaría, marcado «Borrador con errores: así quedaría. No se puede firmar hasta corregir esto: …» (motor y contrato: `aunConErrores`; `ImpactoPaso.tsx`). | contrato (vista previa con errores); e2e `choke-configuracion` (capacidades) |
| B-54 | **hecho** | Para el operador, los indicadores de gestión van plegados al final («Cómo va la identificación del período») (`Causa.tsx`). | e2e F2-C (el operador) |

## Las 10 mejoras de QA-B (§7)

Todas quedan cubiertas por los hallazgos de arriba:
1. Una sola lista con una pregunta a la vez: B-02, B-03, B-23, B-24, B-54.
2. «Confirmó» y «dijo» que digan la verdad: B-04, B-05.
3. El orden de cierre en la ficha: B-01.
4. «Si falla hoy» por grupos y en la ficha: B-06, B-37, B-43.
5. Gráficos que se leen en gris: B-08, B-09, B-35.
6. Un nombre y una cifra por idea: B-12, B-20, B-21, B-26, B-27.
7. El gerente en dos renglones: B-13.
8. Frases que digan «hoy»: B-14 a B-17.
9. El porqué con «porque»: B-11, B-31, B-32.
10. El papel legible: B-10, B-28, B-51.

## Una prueba que se ajustó

El detector del auditor (`e2e/auditoria/detector.ts`) no mira lo que `checkVisibility()` dice que no se ve. Lo de un `<details>` cerrado no se pinta, pero el navegador le da caja al medirlo. Con la pregunta de un pozo más corta (C-13), «Aceptar los 18», que está plegado, «pisaba» al botón «Siguiente: capacidades». Era un falso positivo.

## Pruebas (22-oct, al terminar)

- `npx tsc -b`: sin errores (incluye `e2e/`).
- `npx oxlint src`: 0 errores. Los 2 avisos (`set-state-in-effect` en `App.tsx:68` y `PanelEquipo.tsx:69`) ya estaban en `d028202`.
- `npm test`: libro 434 de 434 (antes 433: +1, «si para otra bomba»), árbol 128 de 128, http 15 de 15, contrato 134 de 134 (antes 132: +2, vista previa con errores y B-07; el CSV de C-13 se sumó a una comprobación que ya existía) y referencia 252 de 252.
- `npm run e2e`, suite completa: **179 de 179** en 6,9 min (144 de antes, 32 de `experiencia-f2c.spec.ts` en dev, Safari, Firefox e iPhone, y 3 de la prueba nueva de capacidades). Pruebas que se ajustaron a lo que cambió a propósito:
  - `arbol-identificar` (el operador, tanques llenos, Turno, WhatsApp);
  - `choke-configuracion` (K-101 en lugar de un pozo; nombres; propuesta sin aceptar; capacidades);
  - `choke-produccion` (agua);
  - `choke-gerente-riesgo` (orden por grupo);
  - `choke-arbol` (cadenas en un renglón; N1; «Ver más»);
  - `carril` («Por contestar»);
  - `interfaz` (el chat sigue abierto).
- **Una corrida anterior no cuenta.** Dio 162 de 179 porque el equipo se durmió con la tapa cerrada (`pmset`: «Clamshell Sleep» de 17:44 a 18:19).
  - Doce pruebas de `dev` que estaban corriendo vencieron su tiempo. Las que también corren en Safari, Firefox o iPhone pasaron allí, y las doce pasaron en la corrida limpia.
  - Las otras cinco eran de verdad: `carril` (3) e `interfaz` a 390 px (2) esperaban la lista vieja del operador y que el chat se cerrara. Se ajustaron (B-02 y B-05) antes de la corrida limpia.
