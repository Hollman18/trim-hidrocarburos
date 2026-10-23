# Correcciones F3 · el parcial y los vecinos de QA-R

**22-oct-2026 · F3.** Base: `6542c66`. Entrada: `QA-R-reverificacion.md` (C-08 parcial y los 12 casos vecinos de §5) y las decisiones D1–D7 de `CORRECCIONES-QA.md`. Marcas de cada caso: **hecho** (archivo y prueba), **decidido distinto** (por qué) o **fuera de alcance** (por qué). Las rutas son de `src/` salvo que digan otra cosa. «libro», «árbol» y «contrato» son `scripts/verificar-*.mjs`; «e2e F3» es `e2e/correcciones-f3.spec.ts` (nueva). Cada prueba nueva **falla sin su arreglo**: se comprobó caso por caso (ver «Cómo se comprobó que fallan»).

## C-08 · alto · PARCIAL → **hecho**

| Punto | Estado | Qué y dónde | Prueba |
|---|---|---|---|
| Las escrituras rechazadas (el punto 3 de QA-C) | **hecho** | Familia nueva `referencia/escrituras/`: **18 casos** de POST del árbol de paradas, cada uno con el HTTP y el código de la tabla C-22 que tiene que dar cada paso, y las escrituras aceptadas (200) que los preparan. Son 403 `sin-capacidad`, `rol-desconocido`, `paso-ajeno` (clasificar y confirmar) y `sin-capacidad` del yacimiento; 404 `no-encontrado`; 400 `peticion-invalida`; 409 `cadena-cambio`, `cascada-cambio`, `cambia-a-otra-persona`, `pregunta-cerrada` y `lote-sin-pasos`; 422 `clasificacion-incoherente`, `cascada-sin-ids`, `falta-motivo`, `pregunta-ajena`, `texto-largo` y `texto-corto`.<br>· Cada caso toca filas y eventos que ningún otro toca: contra una API se mandan en orden, sin volver al arranque.<br>· `scripts/referencia.mjs`: `generar` las arma con el servidor del demo; `comprobar` las vuelve a armar y a mandar; `comparar --escrituras` las manda por HTTP, con `x-rol` y el token de cada rol (`--tokens=archivo.json` o `TRIM_TOKENS`; si no, `--token`).<br>· Para que el demo sea la especificación del código, las cinco escrituras del árbol (`shared/api/escrituras.ts`) rechazan con `estado` y `codigo` (C-22). Con la fuente http viajan los del servidor.<br>· `CONTRATO.md`: la tabla C-22 y «Cómo se comprueba un backend». | contrato §15: un backend de prueba que corre `escrituras.ts` pasa (18 de 18, sin volver al arranque entre casos) y `comparar --escrituras` ve las 4 derivas: aceptar un 409/422 (7 de 18), 400 por 422 (12 de 18), otro código con el mismo HTTP (13 de 18) y 404 por 403 (13 de 18).<br>`referencia comprobar`: 18 de 18.<br>contrato H4: el HTTP y el código del servidor llegan con el rechazo. |
| Las claves que van ausentes (`AUSENTES`) | **hecho** | `scripts/referencia-diferencias.mjs`. Se agregaron `siParaOtra`, `hz`, `sinUna`, `subio`, `cambioHoy`, `noIntervenir`, `proximoInstrumento` y `sinDato`. También los campos nuevos de F3 (`techo`, `declaradoPor`, `retiros`) y `declarado`, `apunta`, `perdida` y `escalada`.<br>Se revisaron todas las claves opcionales que en la referencia vienen en unos objetos y en otros no. Quedan las que, con solo venir, hacen que la pantalla pinte algo que no es cierto. | libro §31: 11 derivas nuevas (con la lista de antes, «no ve» las 11).<br>Arnés `c08` de QA-R: `hz` inventado 208 de 222 y `siParaOtra` 218 de 222 (antes, 222 de 222). |

En el arnés `c08` de QA-R, «escenario cambio-de-limita: un backend que no carga el insumo» sigue en «NO LA VE». Es del arnés: cuando el arranque no tiene un caso con esa dirección (la serie de abril a mayo, la tubería de octubre), el servidor de mentira responde lo del propio escenario. Un backend de verdad sin el insumo daría otras cifras.

## Los vecinos de QA-R (§5)

| # | Estado | Qué y dónde | Prueba |
|---|---|---|---|
| 1 · el techo como cifra exacta | **hecho** | El motor marca el techo: `Riesgo.techo` (`entities/diferido.ts`, los servicios y equipos de proceso que cuelgan de todo el campo: «se cierra lo que esté produciendo»).<br>La pantalla lo dice «hasta» con una sola regla (`shared/ui/costoHoy.ts`: `siPara`, `siParaLargo`, `sumaSiPara`) en:<br>· Riesgo: la fila, su globo y «en juego»;<br>· Turno: «Vigilar»;<br>· Mantenimiento;<br>· Equipos;<br>· la ficha ejecutiva («En marcha · si para, hasta …»).<br>Referencia: en `riesgo/ceiba` y `riesgo/portafolio`, `techo: true` en K-101; nada más cambió. | libro §28: K-101 lleva la marca con la cifra de «Si falla hoy» (9.394); lo calculado va sin ella.<br>e2e F3: en Riesgo, Turno, Mantenimiento y el papel no queda ningún «9.394 bbl/d» sin «hasta». |
| 2 · dos eficiencias en Producción | **hecho** | Ver la decisión abajo. `widgets/choke/Escalera.tsx`, `pages/Produccion.tsx`, `widgets/produccion/Diaria.tsx`, y los rótulos del libro en `Resumen.tsx`, `Regulatorio.tsx`, `Portafolio.tsx`, `diferidos/MesAMes.tsx` y `Riesgo.tsx`. | e2e F3 (Producción):<br>· una sola «eficiencia» en la pantalla;<br>· los dos ⓘ dicen la diferencia;<br>· la escalera cuadra de renglón en renglón;<br>· la eficiencia es lo real sobre su renglón de arriba. |
| 3 · el texto libre en el papel (D2) | **hecho** | Ver «D2 en el papel», abajo. | e2e F3: el operador escribe en LC-21 (con «ZQX»). En el papel de Identificar y de Turno del supervisor no van ni el texto ni quien lo escribió, y sí «Lo contestó el operador de campo». En la pantalla del supervisor el texto sigue. |
| 4 · «Por cómo se identificó» atenúa | **hecho** | `widgets/diferidos/MesAMes.tsx`: ningún mes se atenúa, en ninguna de las dos vistas. El mes del período lleva contorno (`data-mes-activo`) y negrilla. La lectura lo dice. | e2e F3: 0 grupos con opacidad < 1 y un contorno. |
| 5 · `AUSENTES` sin los campos de F2-C | **hecho** | Ver C-08. | — |
| 6 · «Algo está mal» reemplaza la revisión de otra persona | **hecho** | `escrituras.ts` (`escribirRevision`): «Algo está mal» o «Pedir a producción» para el evento o la cascada **no pisa** la revisión sin atender de OTRA persona en otra fila o evento del alcance. Esa clave no se escribe, y quien atiende la sigue viendo con sus palabras. La fila de la dirección sí la recibe: es la que la persona tiene delante. El WhatsApp («2 Algo está mal») usa la misma regla. `CONTRATO.md` (`…/revision`). | contrato §13 «vecino 6»: el pedido del jefe a producción en LC-02 sigue (`pedirA: prod`); LC-01 y los otros pozos llevan el del operador. |
| 7 · el SQL acepta pasos sin respaldo | **hecho** (tres candados) y **decidido distinto** (uno) | `docs/backend/sql/esquema.sql`:<br>· un `declarado` con `regla = preguntas:campo@1` que el rol NO dice como suyo tiene que tener detrás una `respuesta_campo` de la misma persona, en la misma clave y a la misma hora, que no sea «No sé» (trigger diferido `clasificacion_paso_respaldada`). Lo que el rol sí dice como suyo, con esa regla, es una declaración directa del editor, y pasa;<br>· un `retirado` necesita algo que retirar: el mismo paso con el mismo valor, dicho antes por una persona en el evento;<br>· un `confirmado` en lote solo en un paso que el lote dice que subió.<br>**Decidido distinto:** «un `corregido` con `propuesto` igual al valor» SÍ lo produce el servidor. Pasa cuando alguien vuelve a lo que proponía TRIM sobre la corrección de otra persona (se probó: el jefe corrige el detalle y el supervisor lo devuelve). Rechazarlo rompería una escritura válida; queda como `pasa` en `pruebas.sql`. | `pruebas.sql`: 5 `muerde` nuevos (N2 y «afuera» sin respuesta, una respuesta de otra persona u otra hora, un retiro sin nada que retirar, un paso fuera del lote). 3 `pasa` (el tramo del operador con su respuesta, el supervisor que declara lo suyo, el `corregido` que vuelve a TRIM). «Un retiro sin motivo» se ajustó para que siga probando el motivo.<br>Las escrituras del TS volcadas al SQL **con su historia** (el arnés C-03 de QA-R, `c05-ts-sql.mjs`, ajustado para tomar lo que guardó cada petición al terminarla: la sesión del demo guarda solo lo último de cada paso por clave, y sin la historia el retiro del jefe no tenía qué retirar): 176 inserciones, 0 rechazadas, y lo que rige es igual en 60 de 60 filas. Copia en `/private/tmp/claude-501/-Users-hollman/0809a9f7-4f6b-4a1e-b5b0-972baa33e07f/scratchpad/f3/c05/`. |
| 8 · el retiro no se ve | **hecho** | Motor: `ParadaAnh.retiros` (`entities/anh-paradas.ts`), el retiro que rige en la fila: paso, valor retirado, quién, rol, hora y motivo.<br>Pantalla: en la cadena de la parada (`widgets/arbol/Cadena.tsx`), «antes: {valor}, retirado por {persona} · {hora} porque «{motivo}»». En el papel, por su rol y sin el motivo.<br>`CONTRATO.md`. | contrato §13 «vecino 8».<br>e2e F3: el supervisor retira el detalle del jefe; el jefe lo ve con quién y por qué; en el papel, «el supervisor de operaciones», sin el motivo. |
| 9 · el servidor de prueba sin lo guardado | **hecho** | `scripts/verificar-contrato.mjs:110-117`: las cinco vistas se piden con `s.clasificacionesAnh`.<br>Además, en la costura (`shared/api/choke.ts`) los cinco `pedir*` ya no tienen «nadie dijo nada» por defecto: quien los llame desde TypeScript sin lo guardado no compila. | contrato §2: cada vista servida es la de la costura con lo guardado, y la corrección del paso 2 la mueve. Sin el arreglo, las 5 «no son la de lo guardado». |
| 10 · el aviso nombra los 41 pozos | **hecho** | `widgets/arbol/palabras.ts` (`pozosEnCorto`): hasta tres pozos por su nombre y, si son más, «los 41 pozos» («Las paradas de los 41 pozos quedan completas»). Va en los avisos de `Tarjeta.tsx` y `Preguntas.tsx`. | e2e F3: SE-2 de Morichal → «Guardado en los 41 pozos», sin «MN-01, MN-02…». |
| 11 · el paso 2 dice dos cosas | **hecho** | `widgets/arbol/marcas.ts`: un paso que determinó la respuesta de campo de esa misma persona (la misma persona y la misma hora en la conversación) dice quién y nada más. «TRIM lo dedujo de lo que contestó …» ya no va al lado de «dijo …». Lo que el rol no dice como suyo sigue con «TRIM lo dedujo de lo que contestó …» (B-04). | e2e F3: confiabilidad contesta «No, no recibía»; el paso 2 dice «dijo Edwin Maestre» sin «TRIM lo dedujo…». |
| 12 · la cascada que el período corta | **hecho** | Costura `useRaicesDeCascadas` (`shared/api/arbol.ts`): las filas de cada cascada se piden en la ventana que usa el servidor (el día en que cayó la raíz y el siguiente) por el mismo `GET /api/vistas/anh/paradas`, si el período la corta. `ArbolIdentificar.tsx` las usa para los `ids`. Si el período la cubre, es la misma consulta. `CONTRATO.md`. | e2e F3: el rango del 24-jun-2026 muestra 4 de los 18 pozos que cerró K-101 el 23. Corregir para la cascada guarda en los 18 (antes: 409 siempre). |

## La decisión del punto 3 · las dos eficiencias

- **Un solo número del choke en la escalera.** «Eficiencia de producción» es solo la del choke (D3): lo real ÷ lo que el campo podía dejar pasar con las pruebas de los pozos. Es la eficiencia de producción de la NSTA.
- **La escalera empieza donde empieza esa cifra.** Las cifras son de La Ceiba en septiembre:
  - «Lo que dan los pozos según sus pruebas» (357.485);
  - «− Lo que las pruebas dan de más que el medidor oficial» (11.107, con su ⓘ: no es de ninguna parada);
  - «= El potencial del libro» (346.378);
  - los escalones (suman lo del libro);
  - «= Lo que salió por el punto de medición oficial» (338.662).
  - Antes empezaba en el potencial del libro y la cifra de arriba decía «de 357.485»: dos potenciales en el mismo cuadro.
- **La del libro se queda, con otro nombre.** Lo real ÷ el potencial del libro pasa a ser «% del potencial», con un ⓘ que dice la diferencia de verdad: el potencial del libro lleva el factor de asignación del mes, que deja las pruebas medidas como el punto oficial, así que solo descuenta las paradas. La eficiencia de producción descuenta además lo que las pruebas dan de más que el medidor (11.107 bbl): 97,8 % del potencial contra 94,7 % de eficiencia de producción.
- **El ⓘ de la eficiencia** ya no dice «si limitan los pozos, es la misma de arriba». Dice en qué se diferencian, con las cifras del período.
- **«Eficiencia» por la cuenta del libro queda en una sola parte.** Se renombró a «Del potencial» en el cuadre diario y su globo, el Resumen de ingeniería («Del potencial, sin programadas»), Regulatorio, Portafolio, el mes a mes y «En puntos del potencial» de Riesgo: un nombre por idea. El libro, la referencia y el motor no cambian.

## D2 en el papel (vecino 3)

En la pantalla, quien tiene permiso sigue viendo lo que escribió la persona. En el papel y en el PDF de «Exportar» va el rol y no el texto libre ni el nombre de quien lo escribió:
- `shared/ui/DichoEnPapel.tsx` pone en la pantalla una cosa y en el papel otra.
- `shared/ui/papel.ts` arma las palabras: `rolEnPapel` y `causaEnPapel`.
- El motor dice si un texto es de una persona y cómo nombrarla: `textoDePersona` y `rolDeQuien` (`entities/causa-senal.ts`). Es la misma regla de lo que sale a la ANH.
- `Tip` e `Info` aceptan lo que va en el papel en lugar de la pista o del texto (`pistaEnPapel`, `textoEnPapel`).
- `Riesgo.declaradoPor` dice cuándo el motivo de una fila lo escribió una persona.

Dónde:
- **Identificar** (`pages/Causa.tsx`): la declarada (texto y quién), la evidencia («Declarado por el operador de campo», con `causaParaSalir`), «respondió … por WhatsApp», «Respondido tras arrancar», la nota del análisis y sus anteriores, y el aviso del formulario. El chat de WhatsApp no se imprime.
- **Árbol** (`widgets/arbol/`):
  - la marca de cada paso, con el rol y sin el motivo de una corrección ni la nota del yacimiento (de este va solo el atajo);
  - la revisión y quién la atendió;
  - quién contestó y quién dijo «No sé»;
  - el retiro.
- **Turno**: «respondió …», el globo de lo que se pierde y el de las paradas nuevas.
- **Riesgo**: el globo de lo que se pierde.
- **Fichas**: la de la bomba (`bombas/Detalle.tsx`, `Placa.tsx`), la del equipo (`PanelEquipo.tsx`), la del pozo (`pozos/DetallePozo.tsx`) y Pozos.
- **Evidencia**.

**Decidido:** en el papel siguen con su nombre los destinatarios de cada paso de WhatsApp («03:53 pregunta: Jairo Peña»). Es el registro de a quién se avisó, no algo que escribió una persona, y `e2e/carril.spec.ts` lo pide en el papel. La firma de la configuración en el membrete también sigue. Si el dueño quiere roles también ahí, se cambian las filas de esos globos.

`rolDeQuien` dice además «la ingeniera de producción» y «la planeadora» (antes daba «el ingeniera»). La referencia no cambia: ningún caso lo tenía.

## Cómo se comprobó que fallan sin el arreglo

| Prueba | Sin el arreglo |
|---|---|
| libro §28 (techo) | 434 de 435: falla «K-101 … con la marca de techo» |
| libro §31 (derivas) | con la `AUSENTES` de antes, «no ve» las 11 derivas nuevas |
| contrato §2 (vecino 9) | las 5 vistas «no son la de lo guardado» (134 de 135) |
| contrato §13 (vecinos 6 y 8) | «LC-02: revisión de oper (pedirA —)» y «retiros de LC-02: null» (135 de 137) |
| contrato §15 (C-08) | con el `referencia.mjs` de `6542c66`, el control da «0 de 240 casos» y la comprobación falla |
| contrato H4 | sin el código en `escribir`, falla «el HTTP y el código del servidor» |
| `pruebas.sql` | con el `esquema.sql` de `6542c66` se detiene en «FALLA … la sentencia pasó y tenía que rechazarse» (el primer caso nuevo) |
| e2e F3 | las 8, contra una copia de `6542c66` (`git archive`) en otro puerto: 8 de 8 fallan, cada una en lo suyo |

## Pruebas (22-oct, al terminar)

- `npx tsc -b`: sin errores (incluye `e2e/`).
- `npx oxlint src`: 0 errores. Los 2 avisos (`set-state-in-effect` en `App.tsx` y `PanelEquipo.tsx`) ya estaban.
- `npm test`:
  - libro 435 de 435 (antes 434: +1, el techo);
  - árbol 128 de 128;
  - http 15 de 15 (H4 ahora también pide el HTTP y el código);
  - contrato 138 de 138 (antes 134: +4, que son las vistas servidas con lo guardado, los vecinos 6 y 8, y la §15 de las escrituras);
  - referencia 252 de 252 casos y **18 de 18 escrituras rechazadas**.
- `validar.sh` del SQL (PostgreSQL 16): sin errores, **149 rechazos y 26 aceptaciones** esperadas (antes 144 y 24).
  - Cambiaron `esquema.sql` y `pruebas.sql`.
  - En `tablas.json` cambian el trigger nuevo y la hora; en `validacion.log`, la corrida.
  - `ejemplos.sql` no cambió.
- `npm run e2e` con `caffeinate -dims`, suite completa: **203 de 203** en 8,6 min. Son las 179 de antes más las 24 de `correcciones-f3.spec.ts` (8 pruebas en dev, Safari y Firefox). Ninguna prueba de antes se tuvo que ajustar.
- Después de la e2e solo cambiaron documentos (`CONTRATO.md`, este archivo), y `npm test` y `validar.sh` se volvieron a correr: iguales.
- Lo que cambió en la referencia (regenerada, revisada campo por campo):
  - `riesgo/ceiba` y `riesgo/portafolio`: `techo: true` en K-101;
  - `indice.json`: la lista `escrituras`;
  - `escrituras/*`: 18 archivos nuevos;
  - nada más.
