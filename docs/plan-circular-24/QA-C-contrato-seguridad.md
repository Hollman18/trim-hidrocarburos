# QA-C · Contrato, base de datos y seguridad del choke y del árbol de causas

**Auditor:** QA-C (adversarial). **Commit auditado:** `d028202`. **Fecha:** 22-oct-2026.
**En paralelo:** QA-A (motor y números) y QA-B (experiencia por rol).

**Alcance:** las rutas nuevas del choke y del árbol (vistas y escrituras), los permisos por rol, las
entradas hostiles, la privacidad de `desc_evid` y de las exportaciones, el SQL nuevo
(`docs/backend/sql/esquema.sql`, `pruebas.sql`), la referencia (`referencia/choke/`, `agua-choke/`,
`anh/`, `choke-arbol/`) y el error conocido de `brechaPorChoke`.

**Cómo se reproduce todo:** los scripts están en
`/private/tmp/claude-501/-Users-hollman/0809a9f7-4f6b-4a1e-b5b0-972baa33e07f/scratchpad/qa-c/`
(arranque copiado de `scripts/verificar-contrato.mjs`, rutas absolutas al repo). Cada hallazgo
nombra su script. No se tocó el repositorio: solo este archivo.

> Estado: cerrado el 22-oct-2026. 29 hallazgos, cada uno con su script y reproducido.

## Resumen

| Severidad | Cuántos | Hallazgos |
|---|---|---|
| Bloqueante | 2 | C-01, C-02 |
| Alto | 5 | C-03, C-04, C-05, C-07, C-08 |
| Medio | 11 | C-06, C-09, C-10, C-11, C-12, C-13, C-14, C-15, C-16, C-17, C-29 |
| Bajo | 11 | C-18 a C-28 |

**Los cinco más graves:**
1. **C-01 · bloqueante.** «Para el evento» y «para la cascada» **reemplazan** lo guardado en los demás eventos y filas.
   - Un «Algo está mal» del operador (que «no corrige nada») borra la corrección del jefe en otro pozo de la misma raíz, sin motivo y sin 409.
   - Borra también la confirmación de producción en otra fila del mismo evento.
   - La pantalla dice «los 17 pozos» y el servidor escribe en 18.
2. **C-02 · bloqueante.** La misma escritura **copia** lo que dijeron otras personas en la fila tocada: el yacimiento de producción, con la evidencia de un pozo, queda en 17 pozos a su nombre, con origen M para la ANH. Las marcas de un lote quedan en filas que no estuvieron en él.
3. **C-03 · alto.** El TS (reemplaza un objeto por clave) y el SQL (por paso, solo inserción) no dan la misma fila.
   - Una corrección legítima del TS (cambiar «¿Planeada?») falla en el SQL con 23514.
   - «Para el evento» en una fila confirmada en lote la rechaza el trigger del lote.
   - El contrato no dice cómo persistir `guardadas`.
4. **C-04 · alto.** `desc_evid` lleva el texto libre de la respuesta tal cual: «Lo encontró Jairo Peña con Nelson Ortiz…» va a la ANH. Solo se quita la cadena exacta «Nombre · rol».
5. **C-07 · alto.** El SQL acepta 19 escrituras que el servidor del demo rechaza:
   - campo ajeno;
   - `rol_id` distinto del de la persona: el operador pone el yacimiento firmando como prod;
   - persona suspendida;
   - pasos por rol;
   - N1 y N2 fuera del catálogo.

   Dos comentarios del esquema dicen que el campo de la persona se revisa, y no se revisa.

**También importa:**
- **C-05:** cambiar «¿Planeada?» borra la causa del jefe sin pedir motivo.
- **C-08:** `comparar` no ve `colchonH` en `null`, fechas sin zona, una revisión inventada ni un tramo de más.
- **C-09:** el error conocido también es del paso 4 y de cinco vistas más.
- **C-10:** `?campos=ceiba,ceiba` multiplica el reparto por 4.

**Lo que se verificó bien:**
- La matriz rol × escritura del demo coincide con el contrato en los 11 roles (sección 2).
- `desc_evid` sin nombres en las 2.308 filas sin texto libre.
- La plantilla CSV de la topología va y vuelve igual y neutraliza fórmulas.
- `validar.sh` sin errores.
- Ninguna clave de las vistas nuevas falta en `CONTRATO.md`.

**Índice:**

| Id | Sev. | Qué | Sección |
|---|---|---|---|
| C-01 | bloq. | Evento/cascada borran lo que dijeron otros (también «Algo está mal») | 1 |
| C-02 | bloq. | Evento/cascada copian a otros pozos el yacimiento y el lote de otras personas | 1 |
| C-03 | alto | TS (reemplaza) y SQL (por paso) no dan la misma fila | 1 |
| C-04 | alto | `desc_evid` con el texto libre y sus nombres | 4 |
| C-05 | alto | Cambiar «¿Planeada?» borra la causa de otro sin motivo | 2 |
| C-06 | medio | `/confirmar` sin `cadena` confirma lo no visto | 1 |
| C-07 | alto | El SQL no tiene los candados de campo, persona, rol y pasos | 5 |
| C-08 | alto | `comparar` no ve derivas que el contrato prohíbe; sin credencial ni escrituras | 6 |
| C-09 | medio | El error conocido también es del paso 4 y de cinco vistas más | 7 |
| C-10 | medio | `campos` repetidos inflan y rompen identidades | 1 |
| C-11 | medio | Cuerpos con forma inesperada → 500 | 1 |
| C-12 | medio | Sin topes de tamaño (motivo, evidencia, CSV) | 1 |
| C-13 | medio | La topología firma pozos que «sirven a otros», elementos inexistentes y choques con «Todavía no sé» | 3 |
| C-14 | medio | `rolPorId` cae en producción con un rol oculto (latente) | 2 |
| C-15 | medio | Una fila fuera de catálogo tumba toda la vista de paradas | 5 |
| C-16 | medio | Lecturas: campo ajeno o inexistente, período imposible, `orden` ausente | 1 |
| C-17 | medio | El yacimiento acepta `aplicarALaCascada` | 1 |
| C-18 | bajo | Pregunta inexistente → 409 | 1 |
| C-19 | bajo | Lote repetido deja un lote vacío | 1 |
| C-20 | bajo | 404 antes que 403 del campo | 1 |
| C-21 | bajo | La vista previa no pide `metas:firmar` | 2 |
| C-22 | bajo | Tablas de `CONTRATO.md` incompletas; sin códigos de error ANH | 1 |
| C-23 | bajo | `ejemplos.sql`, `tablas.json` y `validacion.log` no son del commit (reg) | 5 |
| C-24 | bajo | Bordes de la carga CSV | 3 |
| C-25 | bajo | Plantillas de asignación y plan sin `textoCsv` | 3 |
| C-26 | bajo | `alcanza` distinto en TS y SQL; motivos invisibles | 3 |
| C-27 | bajo | Mensajes que no dicen lo que pasa | 3 |
| C-28 | bajo | Capacidades y topología: checks que el SQL no tiene | 5 |
| C-29 | medio | Referencia de un solo mes: faltan reglas, estados, el orden `responsable` y capacidades | 6 |

**Los scripts** (en `/private/tmp/claude-501/-Users-hollman/0809a9f7-4f6b-4a1e-b5b0-972baa33e07f/scratchpad/qa-c/`; se corren con `node <script>` desde esa carpeta):

| Script | Qué prueba |
|---|---|
| `arranque.mjs` | El arranque: Vite SSR con la fuente del demo |
| `01-permisos.mjs` | La matriz rol × escritura y los campos |
| `02-carreras.mjs` | Evento, cascada, 409, idempotencia y pregunta inexistente |
| `03-cascada-respuesta.mjs` | La respuesta de campo para la cascada |
| `04-vistas.mjs` | Parámetros hostiles en las vistas |
| `05-duplicados.mjs` | `campos` repetidos |
| `06-privacidad.mjs` | Nombres en `desc_evid`, en el árbol y en la referencia |
| `07-formas.mjs` | Claves del JSON frente a `CONTRATO.md` |
| `08-planeacion-borra.mjs` | C-05 |
| `09-sql.sql`, `09b-sql.sql` | Candados del SQL frente al TS. Se corren con `zsh 09-cluster.sh`, que arma un cluster propio en el puerto 5441 con `esquema.sql` y `ejemplos.sql`, los corre y lo borra |
| `10-topologia-firma.mjs` | La firma de la topología y de las capacidades con formas hostiles |
| `11-csv.mjs` | La carga CSV y las plantillas |
| `12-comparar-deriva.mjs` | `comparar` contra un backend que deriva |
| `13-error-conocido.mjs` | El paso 2 y el 4 en el árbol, el reparto, el mensual, la serie y la tubería |
| `14-limites.mjs` | Textos gigantes, lotes grandes, cuerpos raros y 404/403 |
| `15-cascada-propaga.mjs` | El yacimiento y el lote copiados a otros pozos |
| `16-rol-oculto-y-codec.mjs` | `rolPorId` y el códec de las filas |
| `17-grupo-vs-servidor.mjs` | «Los 17 pozos» frente a los 18 eventos |
| `18-cobertura.mjs` | Lo que la referencia de un mes no trae |

## 1. Contrato

**Lo que está bien (verificado, no se repite abajo):**
- Las 13 vistas nuevas y las 7 escrituras están en `CONTRATO.md`, con su ruta en `contrato.ts`.
- Todas las claves que viajan en su JSON las nombra el contrato (script `07-formas.mjs`): ninguna clave sin documentar. Las únicas «faltantes» del script son claves de registro con guion (`sin-asignar`, `disponibilidad-no-planeada`), que el anexo A sí trae como valores.
- Ninguna fecha viaja sin zona en las vistas nuevas.
- La plantilla de la topología va y vuelve igual en los cinco campos (`11-csv.mjs`).
- El orden de revisión de cada escritura es el de `escrituras.ts` y el de la regla general (`CONTRATO.md:395-397`).

### C-01 · bloqueante · «Para el evento» y «para la cascada» borran lo que dijeron otras personas, también «Algo está mal»

**Dónde:**
- `src/shared/api/escrituras.ts:596-612` (`guardarClasificacion`: `reemplazadas` en la línea 606, `nuevas[ev] = guardadas[ev] = lo` en la 608).
- `src/shared/api/arbol.ts:133` (`eventosDeLaCascada`: todos los eventos de la raíz).
- La pantalla siempre manda un alcance:
  - `src/widgets/arbol/Tarjeta.tsx:259`: «Algo está mal», con `aplicarALaCascada` o `aplicarAlEvento`;
  - `Editor.tsx:119/122/134`;
  - `Preguntas.tsx:39-42`.

**Cómo reproducirlo:** `02-carreras.mjs` (§1, §2a, §2c, §3), `03-cascada-respuesta.mjs` y `17-grupo-vs-servidor.mjs`.

**Lo esperado:**
- «Algo está mal» «No corrige nada: deja en la fila `revision`…» (`CONTRATO.md:785-788`).
- «cambiar lo que ya dijo una persona sin `motivo` de 5 caracteres o más» es 422 (`CONTRATO.md:731-732`).
- `409` si la cadena que vio la persona ya no es la de la fila (`CONTRATO.md:727-728`).

**Lo que pasa** (en la cascada SV-H-302-251007, 18 pozos de La Ceiba):
1. El jefe corrige el detalle (N2) de un pozo B, con motivo, para su evento.
2. El operador marca «Algo está mal» en otro pozo A de la misma raíz. La tarjeta manda `aplicarALaCascada` y la cadena de A.
3. El servidor guarda en los 18 eventos el borrador de A.
   - La corrección del jefe en B desaparece: B vuelve a `NP_PROC/capacidad-tratamiento-agua-crudo-limitada · regla`.
   - B queda además con la revisión del operador.
- Lo mismo pasa:
  - con una respuesta de campo del operador para la cascada: el «Quién» que dijo supervisión en B pasa a ser lo que contestó el operador en A;
  - con una corrección del supervisor en A sin motivo: el motivo solo se pide por lo que ya dijo una persona **en A** (`corrigeAPersona`, `escrituras.ts:587-588`).
- Dentro de un mismo evento (EP-LC07-251019-11, 3 filas):
  - producción confirma la fila #2;
  - el operador marca «Algo está mal» en la #1 (`aplicarAlEvento`, como la tarjeta);
  - la confirmación de producción se borra y la fila #2 vuelve a `propuesta`.
- La pantalla tampoco dice la verdad sobre el alcance:
  - la tarjeta de A dice «los 17 pozos» (su grupo, porque B ya tiene otra cadena);
  - el servidor escribe en 18 eventos.
- No hay 409 en ninguno de estos casos: la cadena solo se compara con la fila de la URL.

**Arreglo sugerido:**
1. Guardar por paso, no por objeto: lo que se escribe para el evento o la cascada son **solo los pasos que dijo esta persona en esta petición** (y la revisión o la respuesta), sin tocar lo que otras claves ya tienen. Es lo que hace el SQL (ver C-03).
2. Antes de escribir en otro evento, si ese evento tiene algo dicho por una persona que esta escritura cambiaría:
   - responder 409 diciendo cuáles; o
   - pedir el motivo por ellos.
3. La revisión nunca toca los pasos.
4. El cuerpo de la cascada lleva las filas que la pantalla mostró (`ids`), y el servidor escribe solo en esas o responde 409 si la raíz trae más.

### C-02 · bloqueante · Una escritura para la cascada copia a otros pozos lo que dijeron otras personas, a su nombre (el yacimiento, el lote)

**Dónde:**
- `src/shared/api/escrituras.ts:598` (`lo = soloDePersona(b)`: el borrador entero de la fila tocada) y `:608`.
- `src/shared/api/arbol.ts:78-87` (`soloDePersona` copia todos los pasos de persona, con su `por`, `rol`, `lote` y `porque`).

**Cómo reproducirlo:** `15-cascada-propaga.mjs`.

**Lo esperado:**
- «En el yacimiento» es de cada pozo:
  - `Editor.tsx:112`: «es de cada pozo (su roca, su fluido): no se extiende a la cascada»;
  - lo pone producción o confiabilidad con su evidencia (`CONTRATO.md:741-746`).
- El lote guarda «qué se vio y qué se confirmó» (`CONTRATO.md:760-761`).
- La fila de un lote está en `confirmacion_lote.paradas` (trigger `clasificacion_paso_reglas`, `esquema.sql:2129`).

**Lo que pasa:**
- Producción pone «En el yacimiento» solo en el pozo A (evidencia: el corte de agua), sin alcance, como lo hace la pantalla en una cascada.
- Después el supervisor cambia «Quién» de A para la cascada.
- **Los 17 pozos hermanos quedan «En el yacimiento»:**
  - a nombre de producción (`porId: prod`);
  - con la evidencia de A;
  - con origen M (persona) para la ANH: `avalado` los da por avalados porque producción declara el paso 2.
- Igual con un lote: el supervisor confirma en lote A y otra fila; el jefe corrige A para la cascada; las 17 filas hermanas quedan con pasos marcados del `LOTE-1`, en el que nunca estuvieron.

**Arreglo sugerido:**
- El mismo de C-01: a otra clave se escribe solo lo que la persona dijo en esta petición, a su nombre y con su hora.
- Lo que dijeron otras personas en la fila de origen no viaja.
- El yacimiento y la marca de lote nunca se copian a otro pozo.

### C-03 · alto · El TS y el SQL no guardan lo mismo: el contrato no dice cómo persistir `guardadas`

**Dónde:**
- TS: `escrituras.ts:596-612`: un objeto por clave (fila o evento) que **reemplaza** al anterior.
- SQL: `esquema.sql:2064` (`clasificacion_paso`: «la vigente es la última por (clave, paso)»), `:2160-2192` (`clasificacion_coherente`) y `:2964-2971` (`v_clasificacion_fuente`).
- `CONTRATO.md:1562`.

**Cómo reproducirlo:** `09-sql.sql` (casos «copiar a la clave del evento…», «el supervisor cambia a planeada…», «cascada» y «v_clasificacion_fuente»), corrido sobre `esquema.sql` + `ejemplos.sql` en un cluster propio (puerto 5441).

**Lo esperado:** que un backend con el SQL del documento dé la misma fila que el servidor del demo (`CONTRATO.md:10`: «en el demo, ese módulo ES el servidor»).

**Lo que pasa:**
1. **La cascada:** en el TS la corrección del jefe en B se borra (C-01). En el SQL sigue vigente: `NP_SUB/falla-pcp · jefe`. El SQL no tiene cómo decir «este paso vuelve a la propuesta de TRIM».
2. **Cambiar «¿Planeada?» sobre una causa que dijo otra persona:**
   - el TS lo guarda y quita la causa (C-05);
   - el SQL lo **rechaza**: `23514 la parada …: «planeada» no va con la causa NP_SUB`, es decir un 500, porque la causa del jefe sigue siendo la última de su paso.
3. **«Para el evento» en una fila confirmada en lote:**
   - el TS guarda en la clave del evento el borrador con `lote: LOTE-…`;
   - el trigger lo rechaza: `la fila EP-LC21-261001-01 no está en el lote LOTE-QA`.
4. **Dos reglas distintas para la misma fila:**
   - `v_clasificacion_fuente` dice que una fila guardada después de su evento «rige con lo suyo, y lo que no diga lo propone TRIM»;
   - el trigger de coherencia la revisa **completando con lo del evento**;
   - el TS guarda en la fila el borrador entero, con lo del evento adentro.
   - Un backend que inserte solo lo nuevo, que es la lectura natural de «solo se inserta», pierde lo del evento en esa fila.

**Arreglo sugerido:**
- Decidir una semántica y escribirla en el contrato. La sugerida es la del SQL: por paso, solo inserción, sin borrar lo que dijeron otros.
- Para lo que hoy borra el TS (cambiar la planeación invalida la causa), una marca explícita, por ejemplo `procedencia: 'retirado'` con quién y motivo, en vez de que desaparezca.
- Alinear `guardarClasificacion`, `v_clasificacion_fuente` y `clasificacion_coherente` con esa regla.
- Agregar a `pruebas.sql` los casos de `09-sql.sql` (ver «Casos de prueba SQL propuestos»).

### C-06 · medio · Confirmar sin `cadena` confirma lo que la persona no vio; el lote guarda como «vista» la cadena de ahora

**Dónde:**
- `CONTRATO.md:750` y anexo A (`cadena?` opcional).
- `escrituras.ts:832-836` (solo se compara si viene).
- `src/entities/anh-paradas.ts:310-317` (`lote.cadena` sale de las filas al confirmar, no de la petición).

**Cómo reproducirlo:** `02-carreras.mjs` §4.

**Lo esperado:** el lote guarda «la cadena que vio» (`CONTRATO.md:760`; `esquema.sql`, comentario de `confirmacion_lote.cadena`).

**Lo que pasa:**
- El jefe cambia el detalle de una fila.
- Producción la confirma sin `cadena`: pasa, y confirma `…NP_SUB/falla-pcp`, que nunca vio.
- Un lote sin `cadena` guarda como «vista» la de ahora.
- La pantalla siempre la manda (`Tarjeta.tsx:78`, `CierreDeHoy.tsx:61`), pero el contrato deja que cualquier cliente la omita.

**Arreglo sugerido:**
- `cadena` obligatoria en `/confirmar` (422 sin ella).
- `lote.cadena` = la que llegó en la petición.

### C-10 · medio · `?campos=ceiba,ceiba` infla las vistas y rompe las identidades entre ellas

**Dónde:**
- `contrato.ts:114-126` (`urlDe` no quita repetidos).
- El demo no los quita en `brechaPorChoke`, `arbolDelChoke`, `paradasAnh` ni en el libro.
- Regla de parámetros: `CONTRATO.md:238`.

**Cómo reproducirlo:** `05-duplicados.mjs` y `04-vistas.mjs` («campo repetido»).

**Lo esperado:** «Identidad exacta: … Σ por tramo = el diferido de `/vistas/diferidos` del mismo período» (`CONTRATO.md:345`) y la raíz del árbol = el diferido.

**Lo que pasa** con `campos=ceiba,ceiba`, mes cerrado:

| Vista | Un solo `ceiba` | `ceiba,ceiba` | Factor |
|---|---|---|---|
| Libro | 7.716 | 15.432 | ×2 |
| Reparto, `diferido` | 7.716 | **30.864** | ×4 |
| Reparto, Σ `porChoke` | 7.716 | 15.432 | ×2 |
| Árbol, raíz | 7.716 | 15.432 | ×2 |

- El reparto queda con `cuadra: true` aunque su `diferido` no es la suma de sus tramos.
- `/vistas/anh/paradas` devuelve 56 filas con 28 ids repetidos.
- El códec del árbol acepta el árbol inflado: suma bien sus ramas.

**Arreglo sugerido:**
- El contrato dice que `campos` no repite: el servidor quita los repetidos o responde 400.
- `urlDe` los quita.
- Aparte, para QA-A: `brechaPorChoke.diferido` debe ser Σ `porChoke` y entrar en `cuadra`.

### C-11 · medio · Un cuerpo con una forma inesperada da una excepción (500), no 400/422 en palabras

**Dónde:**
- `escrituras.ts:805` (`new Set(c.ids)`), `:837` (`c.pasos.filter`).
- `reglas.ts:22` (`alcanza` con algo que no es texto).
- `capacidades.ts:379` y `configuracion.ts:233` (`.map` sobre algo que no es lista).
- `choke.ts:225` (`x.elemento.trim`).
- `escrituras.ts:874` (`normalizarConfig(null)`).

**Cómo reproducirlo:** `14-limites.mjs` §5 y `10-topologia-firma.mjs` §5-6.

**Lo esperado:** 400 o 422 «con palabras» (`CONTRATO.md:208-217`).

**Lo que pasa:** dan `TypeError`:
- `/confirmar` con `ids: 5` o con `pasos: "choke"`;
- `/clasificacion` y `/revision` con un `motivo` numérico o en lista;
- la vista previa con `config: {}` o `null`;
- la firma con `capacidades: "texto"`, `topologia: "texto"`, un elemento `null` o un `elemento: 42`.

Además, una `cadena` numérica da 409 («alguien cambió esta parada») y un `alcance` inventado dice «undefined → undefined».

**Arreglo sugerido:**
- Un códec de entrada por escritura (la forma de cada cuerpo), que responda 400 `peticion-invalida` con la ruta, antes de las reglas.
- Probarlo en `verificar-contrato` con cuerpos mutados.

### C-12 · medio · Sin tope de tamaño en los textos ni en lo que responde la importación

**Dónde:**
- `escrituras.ts:573-584` (`conMotivo` copia el motivo en el porqué de cada paso corregido).
- `anh-clasificacion.ts:1224` (la evidencia del yacimiento va dos veces).
- `choke-config.ts:381-386` (un hallazgo por fila, con el texto escrito: `:381` y `:384`).

**Cómo reproducirlo:** `14-limites.mjs` §1-2 y `11-csv.mjs` (CSV grande, celda de 1 MB).

**Lo esperado:** el contrato solo pone el tope del cuerpo, 2 MB, con 413 (`CONTRATO.md:215`).

**Lo que pasa:**
- Un motivo de 1 MB para una cascada de 18 eventos deja `guardadas` de 18 MB en la respuesta. En SQL serían 18 eventos × cada paso, con el motivo copiado.
- Una evidencia de yacimiento de 1 MB viaja en `evidenciaYacimiento` de la fila y otra vez en el porqué del paso 2.
- Un CSV de 2,1 MB (190.000 filas repetidas) devuelve 18,2 MB de hallazgos.
- Una celda de 1 MB vuelve dos veces en el hallazgo.

**Arreglo sugerido:**
- Topes en el contrato y en las reglas de los dos lados: motivo y evidencia de unos 500 caracteres; equipo de unos 64.
- La importación corta, por ejemplo, en 50 hallazgos y dice «y N más».
- El texto del equipo en un hallazgo se recorta.

### C-16 · medio · El contrato de las lecturas nuevas no dice qué pasa con un campo ajeno, un campo que no existe o un período imposible

**Dónde:**
- `CONTRATO.md:143` («una dirección con un campo ajeno no devuelve datos de ese campo», sin decir cómo).
- Las vistas de `CONTRATO.md:340-352`.
- `src/shared/api/choke.ts` (los `pedir*` no filtran).

**Cómo reproducirlo:** `04-vistas.mjs`.

**Lo esperado:** una regla por vista: 403, `datos: null` o filtrar, como lo dice el arranque (`CONTRATO.md:246-247`).

**Lo que pasa:**
- `campo=no-existe` responde 200 con datos calculados en la tubería, la serie, el agua, las capacidades, la topología y el árbol.
- Un período al revés o vacío responde 200.
- Una fecha inválida da excepción al armar el JSON en la tubería, el reparto y el árbol (un 500).
- `orden` ausente responde el orden `gestion`, aunque el contrato lo dice obligatorio (`CONTRATO.md:348`).

**Arreglo sugerido:**
- En la sección de vistas: «campo ajeno → 403 `sin-permiso`; campo que no está en el registro → 404 `campo-desconocido`; `desde ≥ hasta` o fecha sin zona → 400 `peticion-invalida`; `orden` ausente o inventado → 400».
- Mientras no haya sesión, el demo no puede probar lo del campo ajeno: dejarlo escrito en «Pendiente del lado del servidor».

### C-17 · medio · El servidor del demo acepta `aplicarALaCascada` en el yacimiento, que el cuerpo del contrato no trae

**Dónde:**
- `escrituras.ts:701`: `guardarClasificacion(parada, b, c, ctx)` recibe el cuerpo `c` sin filtrar.
- Contrato: `contrato.ts:601`, `CONTRATO.md:741` y anexo A, sin `aplicarALaCascada`.

**Cómo reproducirlo:** `14-limites.mjs` §3.

**Lo esperado:** «En el yacimiento» es por pozo (`Editor.tsx:112`). El cuerpo es `{ evidencia, motivo?, aplicarAlEvento?, cadena? }`.

**Lo que pasa:** con `aplicarALaCascada: true`, 34 de 34 filas de otros pozos quedan «En el yacimiento» con la evidencia de un solo pozo.

**Arreglo sugerido:** el servidor arma el alcance solo con los campos del cuerpo del contrato. En el yacimiento, nunca la cascada.

### C-18 · bajo · Una pregunta que no existe responde 409 «alguien ya contestó esa pregunta»

**Dónde:** `escrituras.ts:736-737`; `CONTRATO.md:778`.

**Cómo reproducirlo:** `02-carreras.mjs` §8.

**Lo esperado:** distinguir «otra persona la contestó» (409) de «esa pregunta no es de esta parada» (422).

**Lo que pasa:** `pregunta: 'no-existe'` → 409 con «Mientras la veía, alguien ya contestó esa pregunta».

**Arreglo sugerido:** si la pregunta no es de las que la regla de la fila puede abrir (`PREGUNTAS_CAMPO`, `raiz`, `detalle`, `choke`), responder 422.

### C-19 · bajo · No es idempotente: un lote repetido deja un lote vacío; repetir la revisión la reabre

**Dónde:** `anh-paradas.ts:316` (`pasos` vacío se guarda igual); `escrituras.ts:784-786`.

**Cómo reproducirlo:** `02-carreras.mjs` §5-7.

**Lo esperado:** «El lote … guarda qué se vio y qué se confirmó» (`CONTRATO.md:760-761`).

**Lo que pasa:**
- El mismo lote dos veces deja `LOTE-2` con `pasos: []` y 13 filas. El SQL lo acepta: `[] <@ …` es verdadero.
- Repetir la misma revisión la deja sin atender otra vez.
- Tres «No sé» seguidos quedan como tres respuestas.

**Arreglo sugerido:**
- Un lote que no sube ningún paso responde 409 «ya estaban confirmadas» o 200 sin guardar lote.
- `check (cardinality(pasos) > 0)` en `confirmacion_lote`.

### C-20 · bajo · El 404 llega antes que el 403 del campo: se sabe si existe una parada en un campo ajeno

**Dónde:** `escrituras.ts:639-641` (y sus pares en las demás escrituras).

**Cómo reproducirlo:** `14-limites.mjs` §6.

**Lo esperado:** «una dirección con un campo ajeno no devuelve datos de ese campo» (`CONTRATO.md:142-143`).

**Lo que pasa:** el supervisor (solo La Ceiba) pregunta por una fila de Morichal.
- Si existe, la respuesta es «Esa parada es de un campo que no tiene asignado».
- Si no existe, «no está entre las de la ANH».

**Arreglo sugerido:** responder 404 igual en los dos casos, o 403 a cualquier id cuyo evento sea de un campo ajeno sin decir si la fila existe. Es poco, pero el id lleva pozo y día.

### C-22 · bajo · Tablas de `CONTRATO.md` incompletas para las escrituras nuevas

**Dónde y qué falta:**
- `CONTRATO.md:124`: `anh:clasificar` no nombra `POST …/respuesta` ni `…/revision`, que la piden (`escrituras.ts:729`, `:773`).
- `CONTRATO.md:157`: la tabla «De dónde sale el campo» tampoco las trae.
- `CONTRATO.md:1547-1563`, «Modelo de datos de lo que se escribe»: no trae `respuesta_campo`, `revision_parada`, `revision_atendida`, `topologia_por_saber`, `capacidades_campo` ni `capacidad_firmada`.
- No hay `codigo` de error para las escrituras ANH: el servidor de prueba usa `clasificacion-incoherente` (`scripts/verificar-contrato.mjs:936`), que el contrato no nombra.
- `pedirA` es `string` en `contrato.ts:618` y una unión de cuatro roles en el anexo A (`CONTRATO.md:1985`).

**Cómo reproducirlo:** leer; `01-permisos.mjs` confirma qué capacidad pide cada una.

**Arreglo sugerido:** completar las tres tablas y una lista de códigos: `cadena-cambio` (409), `pregunta-cerrada` (409), `clasificacion-incoherente` (422), `paso-ajeno` (403)…

## 2. Permisos

**Cómo se probó:** `01-permisos.mjs` llama cada escritura con cada rol, incluidos `plan`, `cont` y un rol inventado. Antes de cada intento la sesión vuelve a la misma foto, y además se mira que un rechazo no guarde nada.

**La matriz coincide con el contrato en todo lo que sigue** (✓ = pasa; × = 403 en palabras, sin guardar nada):

| Rol | Paso que clasifica | Yacimiento | Confirmar una | Lote | Revisión | Pregunta «corte» / «detalle» / «aporte» | Vista previa e importar |
|---|---|---|---|---|---|---|---|
| ger | × | × | × | × | × | × / × / × | × |
| prod | los 6 | ✓ | ✓ | ✓ | ✓ | ✓ / ✓ / ✓ | × |
| sup | los 6 | × | ✓ | ✓ | ✓ | ✓ / ✓ / × | × |
| oper | planeación e impacto | × | ✓ (solo esos dos pasos) | × | ✓ | ✓ / × / × | × |
| jefe | los 6 | × | ✓ | × | ✓ | ✓ / ✓ / × | × |
| conf | los 6 | ✓ | ✓ | × | ✓ | ✓ / ✓ / ✓ | × |
| tec | planeación, impacto, N1 y N2 | × | ✓ | × | ✓ | ✓ / ✓ / × | × |
| plan, cont, reg, inventado | × | × | × | × | × | × / × / × | × |
| adm | × | × | × | × | × | × / × / × | ✓ |

**Lo demás que se verificó:**
- **Campos asignados**, todos 403 en palabras:
  - el supervisor y producción en Morichal;
  - el operador contestando en Morichal;
  - el técnico marcando una revisión en Morichal;
  - producción confirmando en Morichal.
  Confiabilidad, que tiene Morichal, sí pasa.
- **El administrador con un solo campo** (la sesión con `adm` limitado a La Ceiba): no importa la topología de Morichal, no la previsualiza, no previsualiza sus capacidades y no las firma.
- **Firmar capacidades:** solo `adm` (`config:firmar`); sin motivo o con 4 letras, 422.
- **Una versión que toca metas y capacidades** exige las dos capacidades: ni el gerente ni el administrador la firman solos.
- **El operador** no dice ni confirma «Dónde se trabó», la causa ni el detalle por `/clasificacion` ni por `/confirmar`. Tampoco contesta las preguntas `choke`, `raiz`, `detalle` ni `aporte`.
  - Sus respuestas a las preguntas de campo («¿De dónde vino el corte?», «¿El oleoducto recibía?») sí dejan tramo, causa o detalle.
  - Quedan como **declarados por él y no avalados** (origen C), como dice `CONTRATO.md:771-773`.
  - Eso es lo que el contrato quiere. Dos salvedades:
    - en el SQL la diferencia no existe (C-07);
    - por la cascada, esas respuestas pisan lo que otros dijeron en otros pozos (C-01).
- **El gerente** no escribe nada del choke ni del árbol. Solo firma metas, por diseño.

### C-05 · alto · Cambiar «¿Planeada?» borra la causa y el detalle que dijo otra persona, sin pedir motivo

**Dónde:**
- `escrituras.ts:587-588`: `corrigeAPersona` solo mira los pasos que vienen en el cuerpo.
- `anh-clasificacion.ts:1180-1181`: `declararPaso` quita N1 y N2 si no van con la nueva planeación.

**Cómo reproducirlo:** `08-planeacion-borra.mjs`.

**Lo esperado:** «cambiar lo que ya dijo una persona sin `motivo` de 5 caracteres o más» es 422; «el motivo queda en el porqué del paso» (`CONTRATO.md:731-732`).

**Lo que pasa:**
- El jefe corrige el detalle de EP-LC14-260911-75 (`NP_SUB/falla-pcp`, corregido).
- El supervisor manda `{ planeacion: 'planeada' }` sin motivo, con la cadena correcta. Pasa, porque «¿Planeada?» era de TRIM.
- La causa y el detalle del jefe quedan **borrados**; la fila vuelve a `por-precisar`.
- En SQL esa misma escritura se rechaza (C-03, caso 2).

**Arreglo sugerido:** contar como «cambia lo que dijo una persona» también los pasos que la escritura quita o invalida (N1 y N2 al cambiar la planeación; N2 al cambiar N1). Con eso:
- se pide el motivo;
- el retiro queda con quién y por qué (C-03).

### C-14 · medio · `rolPorId` cae en «producción» con un rol oculto o desconocido: quien tenga rol `cont` o `plan` escribe con las capacidades de producción

**Dónde:**
- `src/entities/roles.ts:120-123`: un id que no es visible devuelve `ROL_INICIAL = 'prod'`.
- `src/shared/config/producto.ts`: `ROLES_V2 = {'plan', 'cont'}`.
- `escrituras.ts`: lo usa en cada `rol.puede[...]` y en `camposAsignados(rol, …)`.

**Cómo reproducirlo:** `16-rol-oculto-y-codec.mjs` (a), con una persona `cont` activa en el registro de la sesión.

**Lo esperado:** cont tiene solo `evidencia:exportar` (`roles.ts`; `v_capacidades_rol` en el SQL). «Marcar paradas para revisar» y «cargar la asignación oficial» son 403.

**Lo que pasa:**
- La persona `cont` marca «Algo está mal» y **carga la asignación oficial**, con los campos de producción (La Ceiba y El Palmar).
- El lote lo frena otra regla (`CONFIRMAN_EN_LOTE` revisa el id real).
- Hoy está latente:
  - el registro del demo no deja invitar roles ocultos (`revisarAcceso`, `usuarios.ts:238`);
  - pero el SQL sí acepta `usuario.rol_id = 'cont'` (no mira `rol.visible`);
  - y `escrituras.ts` es la referencia del servidor (`CONTRATO.md:10`).

**Arreglo sugerido:**
- En el servidor, buscar el rol por id **sin respaldo**: un rol sin entrada es 403.
- El respaldo a `prod` queda solo en la navegación del demo.
- En SQL, impedir personas con un rol no visible o decir qué pueden hacer.

### C-21 · bajo · La vista previa no pide `metas:firmar` cuando la versión toca metas

**Dónde:** `escrituras.ts:871` (solo `config:firmar`); `CONTRATO.md:674-676` («las mismas reglas de la firma»).

**Cómo reproducirlo:** `01-permisos.mjs`, el último caso.

**Lo esperado:** las mismas reglas de la firma, que con metas exige `metas:firmar` (`CONTRATO.md:455`).

**Lo que pasa:**
- El administrador previsualiza una versión con metas y capacidades: pasa.
- La firma de esa versión le da 403.
- No guarda nada, pero el «mismo orden de la firma» no se cumple.

**Arreglo sugerido:** aplicar `diferenciasPorGrupo` en la vista previa, o decir en el contrato que solo revisa el grupo técnico.

## 3. Entradas hostiles

**La importación CSV de la topología** (`11-csv.mjs`, `POST /api/topologia/importar` → `leerTopologia`, `choke-config.ts:357-410`). Lo que se verificó bien:

| Entrada | Resultado |
|---|---|
| Equipo que no existe, duplicado (también con otra caja y espacios), pozo ajeno, fila sin pozos | Bloquea por fila con palabras ✓ |
| Fórmulas `=HYPERLINK(…)`, `+SE-2`, `-SE-2`, `@SUM(1)` en el equipo o en los pozos | Bloquean (no son equipos ni pozos). El texto vuelve en el hallazgo como texto; React lo escapa ✓ |
| Espacio de ancho cero, homógrafo cirílico | Bloquea (no es pozo) ✓ |
| Espacio no separable entre pozos; marca de orden de bytes en medio | Se lee bien ✓ |
| Comillas sin cerrar | Esa fila bloquea; las demás se leen ✓ |
| «Todavía no sé» y después contestado; «todos» mezclado con pozos | Bloquea ✓ |
| Texto vacío o solo espacios; campo que no existe | 422 / 404 en palabras ✓ |
| La plantilla que se descarga (`plantillaTopologia` + `descargarCsv`) | Vuelve igual en los 5 campos, y `textoCsv` neutraliza «=» ✓ |

### C-13 · medio · La firma de la topología acepta un pozo que «sirve a varios pozos» o «dedicado a otro pozo», un elemento que no existe y un mismo equipo contestado y «Todavía no sé»

**Dónde:**
- `src/entities/choke.ts:221-238` (`validarTopologia`) y `configuracion.ts:552-567`.
- La carga CSV acepta igual el pozo como elemento compartido (`choke-config.ts:383-402`).
- SQL `esquema.sql:1294-1308` (`topologia`).

**Cómo reproducirlo:** `10-topologia-firma.mjs` §1-3 y `11-csv.mjs` («el pozo como su propio elemento»); en SQL, `09-sql.sql` (sección «Topología»).

**Lo esperado:**
- El tramo «sale del alcance … nadie lo escoge» (`CONTRATO.md:442-443`).
- Criterio de Edinson: lo dedicado a un pozo es pozo (`CONTRATO.md:1265-1266`). Un pozo es, por definición, dedicado a sí mismo.
- La carga CSV bloquea el equipo que TRIM no tiene (`CONTRATO.md:691-693`).
- Un equipo no puede estar a la vez contestado y «Todavía no sé» (`CONTRATO.md:426`).

**Lo que pasa:** el administrador firma, con 200, cada una de estas:
1. `LC-01 → [LC-01, LC-02]` (compartido): las 8 paradas propias de LC-01 pasan a «planta». La vista previa lo dice («se trabaría en la planta o estación, antes en el pozo»), pero la regla no lo impide: es escoger el tramo de las fallas de un pozo.
2. `LC-01` dedicado a `LC-02`.
3. `NO-EXISTE` y 10.000 elementos de basura. La firma no mira el registro; se guarda para siempre, porque `version_config` es de solo inserción.
4. `K-101` contestado para todos los campos (sin `campoId`) y a la vez «Todavía no sé» en La Ceiba. La regla compara `t.campoId === x.campoId` y el elemento global no tiene campo.

El SQL acepta los cuatro casos.

**Arreglo sugerido:** en `validarTopologia` (y en un trigger):
- un elemento que es un pozo solo puede ser dedicado a sí mismo;
- el elemento tiene que estar en el registro del campo (lo mismo que la carga CSV), o en la topología derivada si no tiene campo;
- «Todavía no sé» choca también con un elemento sin campo;
- un tope de elementos por campo.

### C-24 · bajo · Bordes de la carga CSV que confunden

**Dónde:** `choke-config.ts:366`, `:378` y `:388`.

**Cómo reproducirlo:** `11-csv.mjs`.

**Lo que pasa:**
- Un archivo con solo `\r` como fin de línea (Excel de Mac viejo) responde «El archivo no trae ninguna fila».
- Si la primera fila de datos tiene un equipo que empieza por «Equipo…» o «Elemento…», se salta como encabezado **sin aviso**.
- Una tercera columna de notas («sí») bloquea la fila con «todos y sí no son pozos».
- Un carácter de control de dirección (U+202E) en el equipo vuelve tal cual en el texto del hallazgo: la pantalla pinta esa línea al revés.

**Arreglo sugerido:**
- Partir también por `\r`.
- Saltar el encabezado solo si la segunda celda también es de encabezado («pozos…»).
- Avisar las columnas de más.
- Quitar los caracteres de control y de ancho cero (`\p{Cf}`) del texto que se devuelve.

### C-25 · bajo · Dos plantillas CSV que TRIM exporta no neutralizan fórmulas

**Dónde:**
- `src/entities/asignacion.ts:98-101` (`plantillaAsignacion`) y `src/entities/plan.ts:205-209` (`plantillaPlan`): arman el texto a mano.
- `src/shared/lib/csv.ts:6-14` dice «Es la misma regla para todo CSV del producto».

**Cómo reproducirlo:** `11-csv.mjs` (última línea).

**Lo que pasa:**
- Un pozo `=1+1` sale tal cual.
- `LC;01` parte la fila en dos columnas.
- El nombre del campo (del registro del servidor, `GET /api/campos`) también va sin neutralizar.
- La plantilla de la topología, el CSV del libro y el de Regulatorio sí pasan por `textoCsv`.

**Arreglo sugerido:** que las dos plantillas usen `textoCsv`.

### C-26 · bajo · «Motivo de 5 caracteres o más» no es la misma regla en el TS y en el SQL

**Dónde:** `src/entities/reglas.ts:22` (`trim()` de JavaScript) frente a `esquema.sql:41-43` (`btrim` solo quita espacios ASCII).

**Cómo reproducirlo:** `09-sql.sql` («una revisión cuyo motivo son 5 espacios no separables»).

**Lo esperado:** `alcanza` del SQL es «igual que alcanza() de src/entities/reglas.ts» (comentario de la función).

**Lo que pasa:**
- Seis espacios no separables (U+00A0): el TS los rechaza y el SQL los acepta.
- Cinco espacios de ancho cero (U+200B) pasan en los dos: un motivo invisible.

**Arreglo sugerido:** en los dos lados, quitar `\s`, U+00A0, U+200B-U+200D y U+FEFF y exigir al menos una letra o un número.

### C-27 · bajo · Mensajes que no dicen lo que pasa

**Cómo reproducirlo:** `01-permisos.mjs`, `10-topologia-firma.mjs` y `11-csv.mjs`.

**Lo que pasa:**
- La firma de capacidades o de topología sin motivo dice «una meta que se mueve sin motivo no es meta» (`escrituras.ts:138`).
- Un alcance inventado dice «(«undefined» → «undefined»)» (`choke.ts:231`).
- `pozos: "LC-01"` en texto dice «el pozo L no es de ese campo…» letra por letra.
- `texto: 42` en la importación dice «El archivo llegó vacío».

**Arreglo sugerido:** un mensaje por grupo (metas o técnica) y validar la forma antes (C-11).

## 4. Privacidad

**Lo que se verificó bien** (`06-privacidad.mjs`):
- `desc_evid` de las **2.308 filas** de toda la historia, en los cinco campos y sin nada escrito, no lleva ningún nombre del registro (completos, nombres ni apellidos sueltos).
- La línea «Declarado por Jairo Peña · operador de campo · …» sale como «Declarado por el operador de campo · …», también por WhatsApp.
- Sin nombres: el árbol del choke en sus tres órdenes, la calidad, las capacidades y las familias de referencia `choke/`, `choke-arbol/` y `agua-choke/`.
- El CSV de Regulatorio (`Regulatorio.tsx:39`) y el del informe (`csvDeLibro`) no traen texto libre ni nombres.

### C-04 · alto · `desc_evid` copia el texto libre de quien respondió: los nombres (y cualquier otro dato) viajan a la ANH

**Dónde:**
- `src/entities/anh-clasificacion.ts:935-941` (`descripcionDeCausa`): solo quita la cadena exacta `Respuesta.por` («Nombre · rol»).
- `src/entities/causa-senal.ts:233`, `:314` y `:316` (`texto: r.texto`, el texto libre tal cual).

**Cómo reproducirlo:** `06-privacidad.mjs` §2-3.

**Lo esperado:** «`desc_evid` … **Nunca lleva nombres de personas** (S1 R-D): las personas van como rol» (`P1-producto.md:198`; `S1-revision.md:330`, R-D: Ley 1581 de 2012, cuyo alcance exacto S1 deja NO VERIFICADO). En el código: «El nombre se queda aquí, dentro de TRIM: al texto de `desc_evid` nunca va» (`anh-clasificacion.ts:66-67`).

**Lo que pasa:**
- Respuesta en pantalla «Lo encontró Jairo Peña con Nelson Ortiz: se quemó el cable de potencia». Las dos filas del evento quedan con `desc_evid` = «… Lo encontró Jairo Peña con Nelson Ortiz: se quemó el cable de potencia. … Declarado por el operador de campo …».
- Por WhatsApp, «Revisó el pozo Jairo y no tenía energía» queda igual: el nombre de pila no es la cadena «Nombre · rol».

**Arreglo sugerido**, en este orden:
1. El texto libre no entra a `desc_evid` sin revisar. TRIM arma `desc_evid` con la parte, el modo y la evidencia de señales; el texto libre va solo si quien revisa lo acepta (procedencia de persona).
2. Si entra, quitarle los nombres del registro (completos, nombre y apellido sueltos, sin distinguir mayúsculas ni tildes), los teléfonos y los correos.
3. Avisar en la caja de texto que lo escrito puede ir a la ANH.

Agregar una prueba en `verificar-arbol` con un texto que nombre a dos personas.

**Observación, no hallazgo:**
- `/vistas/anh/paradas` lleva nombres dentro de TRIM, como lo permite el contrato: `causa.declarado.por`, `causa.evidencia`, `clasificacion.choke.porque.texto` y `propuesta.porqueChoke.texto` («Nelson Ortiz dijo «El comprador nominó menos gas…»»), y está en `referencia/anh/` (morichal, zarza, portafolio).
- `PorqueChoke.texto` de una propuesta de TRIM trae la frase armada con el nombre. El contrato dice que el porqué guarda «los datos de la frase … no la frase armada en la pantalla» (`CONTRATO.md:1337-1339`).
- Si algún día esa frase alimenta `desc_evid` o la salida a la ANH (la pieza 12), el nombre se va. Conviene guardar `persona` aparte y armar la frase en la pantalla.
- `evidenciaYacimiento`, texto libre de producción, viaja en cada fila sin filtro de nombres: «Prueba de Marcela Ríos y Camilo Rueda…».

## 5. Base de datos

**`validar.sh` corrió sin errores** (22-oct, 10:55; PostgreSQL 16.14):
- 98 tablas, 11 vistas, 30 funciones y 101 triggers;
- 110 rechazos esperados y 20 aceptaciones esperadas en `pruebas.sql`;
- los cuadres de `cuadres.sql` dieron bien y `tablas.json` coincide 1:1.

La salida está en `…/scratchpad/qa-c/validar-salida.txt` y `validacion-qa-c.log`. Después se devolvieron `validacion.log`, `tablas.json` y `ejemplos.sql` con `git checkout` (ver C-23: la corrida los cambia).

**Cómo se probaron los candados:** `zsh 09-cluster.sh` arma un cluster propio de PostgreSQL 16 en el puerto 5441, con `esquema.sql` y el `ejemplos.sql` del commit, corre `09-sql.sql` y `09b-sql.sql` y lo borra. Cada caso dice lo que haría el servidor del demo y si el SQL hace lo mismo.

**Coinciden:**
- Tablas: `confirmacion_lote` (el operador no hace lotes), `revision_atendida` («Pedir a producción» solo la atiende producción), `revision_parada` (motivo, `pedir_a`, el propio rol) y `capacidades_campo` (un campo una vez por versión).
- Valores: el gas sin `medido`, el yacimiento del supervisor o sin evidencia, el corregido sin lo propuesto, una N1 en minúsculas, la procedencia de regla y el gerente.
- Claves y estructura: el evento de otro campo, una fila de otro evento, un UPDATE, y el exceso en una clave de evento.

### C-07 · alto · El SQL no tiene los candados de campo, de persona ni de pasos por rol que tiene el TS; dos comentarios dicen que sí

**Dónde:**
- `esquema.sql:2119-2136` (`clasificacion_paso_reglas`) y `:2299-2311` (`anh_escrito_reglas`): solo revisan que el evento sea del campo y que el rol tenga la capacidad.
- Los comentarios de `esquema.sql:2102` (`clasificacion_paso.campo_id`: «tiene que estar entre los de la persona (403)») y `:2238` (`respuesta_campo.campo_id`: «entre los de la persona (403)») dicen lo que no hace el trigger.

**Cómo reproducirlo:** `09-sql.sql`. **19 casos que el servidor del demo rechaza y el SQL acepta:**

| Candado del TS | Caso que el SQL acepta |
|---|---|
| Campo de la persona (`camposAsignados`) | supervisor de La Ceiba clasificando en Morichal; operador marcando una revisión en Morichal; operador contestando en Morichal |
| Rol = el de la persona (del token) | `por_id = oper` con `rol_id = prod` pone «En el yacimiento»; un lote del operador firmado `rol_id = sup`; una revisión atendida por el operador como `sup` |
| Persona activa (`SIN_PERSONA`) | una persona suspendida clasifica |
| `PASOS_QUE_CONFIRMA` / `PASOS_QUE_DECLARA` | el operador CONFIRMA «Dónde se trabó»; el operador CORRIGE el N2; el técnico confirma el responsable |
| `ROLES_QUE_CONTESTAN` y opciones de cada pregunta | el operador contesta «choke» y «detalle»; el supervisor contesta «aporte»; la opción «De la luna»; `sigue` a una pregunta que no existe; `acota` con un paso inventado |
| Catálogo de 20 N1 y 117 N2 | `NP_INVENTADA` y `NP_SUB/no-existe` (el SQL solo mira la forma con una expresión regular) |
| La forma del id de la fila | `EP-LC21-261001-01@nunca#x` |

Algunos los dice el propio esquema como «lo revisa el servidor antes de insertar», por ejemplo el comentario de `respuesta_campo`. Pero dos comentarios de columna dicen que el trigger revisa el campo de la persona, y no lo hace.

**Lo esperado:** «¿Tienen los mismos candados que el TypeScript?». Si no, que el esquema no lo diga.

**Arreglo sugerido:** en `clasificacion_paso_reglas` y `anh_escrito_reglas`:
1. `por_id` activo y con el campo: `todos_los_campos` o fila en `usuario_campo`.
2. `rol_id` = el de `usuario(por_id)` al insertar.
3. Una tabla `paso_por_rol (rol_id, paso, accion)` con `PASOS_QUE_DECLARA` y `PASOS_QUE_CONFIRMA`:
   - `confirmado` y `corregido` exigen que el paso sea del rol;
   - un `declarado` ajeno solo con `regla = 'preguntas:campo@1'`, el único camino del TS.
4. Tablas de catálogo para N1 y N2, con llave foránea en vez de expresión regular.
5. Una tabla de preguntas con quién las contesta y sus opciones, para `respuesta_campo`.
6. La forma `^…@\d{4}-\d{2}-\d{2}#\d+$` en la clave de fila.

Y corregir los comentarios que prometen lo que no se revisa.

### C-15 · medio · Una fila con un valor fuera del catálogo tumba toda `/vistas/anh/paradas` en el front

**Dónde:**
- `contrato.ts:396-416` (`borradorAnh` / `clasificacionAnh` rechazan la respuesta entera con `ErrorDeContrato`).
- El SQL solo mira la forma de N1 y N2 (C-07).

**Cómo reproducirlo:** `16-rol-oculto-y-codec.mjs` (b).

**Lo esperado:** «una `ParadaAnh` incoherente … no entra» (`CONTRATO.md:1343-1345`), pero la pantalla tendría que seguir con las demás.

**Lo que pasa:** con una sola fila de 28 que traiga `n1: NP_INVENTADA`, el códec rechaza **la lista entera**. Identificar, Regulatorio y el cierre del día se quedan sin datos de todo el período.

**Arreglo sugerido:** cerrar el catálogo en el SQL (C-07). En el front, que la lista revise fila por fila y muestre las malas aparte con su motivo, o que el contrato diga explícitamente que una fila mala es un 500 del servidor.

### C-23 · bajo · Los artefactos del SQL no son los del commit: `reg` sigue invisible y sin persona

**Dónde:**
- `docs/backend/sql/ejemplos.sql:8016` (`reg … visible false`), el `usuario` sin Iván Salas y `tablas.json`, todos de `9b6a659`.
- `esquema.sql:1520`: el comentario de `rol` dice «visible=false son los de la versión 2 (plan, cont, reg)».
- La línea 1521 lista los ids sin `reg`.

**Cómo reproducirlo:** correr `validar.sh` y `git diff --stat docs/backend/sql`: cambian `ejemplos.sql` (`reg` visible, un usuario más, el teléfono del administrador pasa de …0108 a …0109), `tablas.json` y `validacion.log`. Se devolvieron con `git checkout`.

**Lo esperado:** el commit `d028202` dice «Rol reg encendido». Los artefactos del SQL salen de `validar.sh` sobre ese mismo commit.

**Arreglo sugerido:** regenerar con `validar.sh` en el commit de cierre y corregir el comentario de `rol`.

### C-28 · bajo · Capacidades y topología: lo que valida el TS y el SQL no

**Dónde:** `esquema.sql:1294-1308`, `:1347-1355`, `:1357-1385`.

**Cómo reproducirlo:** `09-sql.sql`, secciones «Capacidades» y «Topología».

**Lo que el SQL acepta y el TS no:**
- Una bomba que no es del tren de agua del campo (`P-999`).
- Una lista de pozos repetidos (`LC-01, LC-01`) como «compartido». `cardinality` cuenta los repetidos y `validarTopologia` usa un `Set`.
- `topologia_por_saber_unica` solo corre al insertar en `topologia_por_saber`: insertar primero el «por saber» y después la topología deja pasar el choque.

Una `explicacion_empate` de 1 carácter pasa en los dos lados cuando no hay empate. No es error, pero queda firmada.

**Arreglo sugerido:**
- Llave foránea de la bomba al tren de agua del campo.
- `check (cardinality(pozos) = cardinality(array(select distinct unnest(pozos))))`.
- El mismo trigger de choque también en `topologia`, y con el elemento sin campo.
- `alcanza(explicacion_empate, 5)`.

## 6. Referencia

**Lo que hay:** 73 casos en las cuatro familias (`choke/` 44, `agua-choke/` 5, `anh/` 12, `choke-arbol/` 12).
- Ninguno está vacío ni en `null`.
- Los tamaños van de 913 B (base de un campo) a 476 KB (filas ANH del portafolio).
- Las filas ANH de sep-2026 traen disparos (39), abiertas al corte (63) y cascadas (30).

`node scripts/referencia.mjs comprobar` ya se corre en `npm test`, y contra un servidor que sirve lo esperado da 195 de 195.

### C-08 · alto · `referencia.mjs comparar` no ve derivas que el contrato prohíbe

**Dónde:**
- `scripts/referencia.mjs:50-68` (`diferencias`: «la respuesta tiene que CONTENER lo esperado (puede traer más campos)»; las fechas se comparan con `Date.parse`).
- `:353` (`fetch` sin credencial).

**Cómo reproducirlo:** `12-comparar-deriva.mjs`. Levanta un servidor que sirve lo esperado de `referencia/` con una deriva a la vez y corre el `comparar` del repo contra él (con `TZ=America/Bogota`, como una máquina en Colombia).

**Lo esperado:** el contrato distingue:
- ausente de `null` y de 0 (`CONTRATO.md:179-182`; `colchonH`: `null` = no se llena, ausente = sin colchón, `CONTRATO.md:344`; `costoFalla` «**ausente** (no 0)», `CONTRATO.md:323`);
- «sin zona el front la rechaza» (`CONTRATO.md:176-178`);
- `cadena` «solo en los pasos con valor» (`CONTRATO.md:348`);
- Σ por tramo = diferido.

**Lo que pasa:** `comparar` sale con 0 («195 de 195 coinciden») con cada una de estas derivas:

| Deriva del backend | ¿La ve `comparar`? |
|---|---|
| `colchonH: null` donde va ausente (el front lo lee como «no se llena») | **no** |
| `costoFalla: 0` donde va ausente | **no** |
| Una «Algo está mal» inventada en cada fila ANH | **no** |
| `evidenciaYacimiento` en filas que no la tienen | **no** |
| `inicio` y `fin` de las filas ANH **sin zona** | **no** |
| `cadena` en los nodos del árbol que no la llevan (lo que falta viajaría a la ANH) | **no** |
| Un tramo de más en `porChoke` con 1.000 bbl | **no** |
| Una fila de más en una lista | sí |

Además:
- `comparar` no manda credencial: contra un backend con sesión (`CONTRATO.md:69-85`) todos los casos dan 401.
- No hay ningún caso de escritura (403, 409, 422) ni ninguno con algo dicho por una persona. Justo lo de C-01 a C-03 no tiene prueba neutral de lenguaje.

**Arreglo sugerido:**
1. En `diferencias`:
   - una clave del esperado con `null` exige `null`;
   - una lista de claves que el contrato marca «ausente» (por familia) exige que **no** venga;
   - los registros cerrados (`porChoke`, `porEscalon`, `noPlaneado`…) exigen las mismas claves;
   - las fechas exigen zona (`/([+-]\d{2}:\d{2}|Z)$/`).
2. `--token=` (o `TRIM_TOKEN`) para mandar `Authorization`.
3. Una familia `referencia/escrituras/` con secuencias `{ pedido, esperado: { estado, codigo } }`.
4. Una familia con clasificaciones guardadas: un insumo con los pasos dichos y los casos de paradas, árbol y reparto después.

### C-29 · medio · La referencia de la ANH y del árbol es un solo mes que no trae varias reglas ni estados

**Dónde:** `scripts/referencia.mjs` (casos de `anh/` y `choke-arbol/` solo de 2026-09); `referencia/indice.json`.

**Cómo reproducirlo:** `18-cobertura.mjs` y el resumen de arriba.

**Lo esperado:** que un backend en otro lenguaje pruebe cada regla del árbol con la referencia (`CONTRATO.md:1567-1625`).

**Lo que pasa:** en sep-2026, que es toda la referencia de `anh/` y `choke-arbol/`, no hay:
- filas parciales (HZ): la historia trae 196;
- tramos de exceso del programa: la historia trae 6;
- filas pendientes: 4;
- filas del día en curso: 6;
- ninguna fila confirmada.

Tampoco aparecen 8 de las filas de `REGLAS_ANH`: `tratamiento`, `energia-compartido`, `evacuacion`, `compresion`, `aire`, `linea-motor`, `linea-lubricacion` y `pendiente`. Ni las preguntas `tanques`, `raiz` y `se-perdio`.

Faltan además:
- el árbol en orden `responsable` (el contrato tiene tres órdenes; la referencia, dos);
- `GET /vistas/campos/:campo/capacidades`, que no tiene ningún caso;
- `/vistas/anh/paradas` de zarza, que es una sola fila.

**Arreglo sugerido:**
- Agregar los meses que traen esos casos: 2026-02 (exceso y parciales), 2026-07 (parciales), 2026-08 (exceso) y el mes en curso.
- Agregar el orden `responsable` y las capacidades de cada campo.
- Que `comprobar` falle si una fila de `REGLAS_ANH` no tiene al menos un caso.

## 7. El error conocido: `brechaPorChoke` no lee las correcciones del paso 2

**Qué dice hoy el contrato:**
- `CONTRATO.md:348` (árbol): «el primer nivel de `gestion` = `porChoke` de `/vistas/choke/reparto`, tramo por tramo, mientras nadie haya corregido el paso 2 (el reparto sale de la regla del motor y todavía no lee lo que corrigen las personas; el árbol sí…)».
- `CONTRATO.md:1309-1311` lo repite como «pendiente».
- `contrato.ts:374-376` también.

Es un pendiente declarado, no una regla.

### C-09 · medio · El error es más ancho que lo que dice el contrato: también el paso 4, y cinco vistas más

**Dónde:**
- `src/entities/choke.ts` (`brechaPorChoke`, `repartoPorMes`, `lineaBasePorTramo`, `tuberiaCampo`, `serieChoke`): toman el tramo y la planeación de la regla.
- `choke-arbol.ts` toma los de la fila vigente.
- Front: `src/shared/api/choke.ts`:
  - `useRepartoChoke`, `useRepartoMensual`, `useBaseChoke`, `useTuberia` y `useSerieChoke` usan la clave `vh(ctx, versiones)`, **sin** lo guardado;
  - `useArbolChoke` sí lo incluye.

**Cómo reproducirlo:** `13-error-conocido.mjs` (La Ceiba, sep-2026).

**Lo esperado:** el norte del plan: un solo reparto por tramo «de todas las vistas» (`choke-arbol.ts:29`); «Σ por tramo = el diferido» en todas.

**Lo que pasa:**
1. **Paso 2.** El supervisor corrige el tramo de EP-LC11-260925-40 (pozo → planta) para su evento (5 filas en el mes).
   - El árbol pasa de `pozo 6.676 / planta 1.041` a `pozo 2.998 / planta 4.718`: 3.677 bbl de tramo.
   - El reparto, el mensual, la serie diaria y la tubería («perdido en el período») siguen en `6.676 / 1.041`.
   - La calidad sí cuenta las 5 filas corregidas.
2. **Paso 4, que el contrato no menciona.** El jefe dice que esa misma parada era planeada (`P_MANT_MEC`, con motivo).
   - Lo no planeado del árbol baja de 7.716 a **4.039**.
   - `porEscalon['disponibilidad-no-planeada']` del reparto, `noPlaneado` del mensual y la PE no planeada siguen en **7.716**.
   - El gerente ve dos «no planeado» distintos para el mismo mes: Resumen/Producción contra el árbol de Diferidos/Regulatorio.
3. **El front con la fuente http.** Aunque el servidor se arregle, después de una escritura el front no vuelve a pedir el reparto, el mensual, la base, la tubería ni la serie: su clave no cambia, porque `anotarClasificaciones` solo cambia `clasificacionesAnh`.

**Qué debería decir el contrato** (texto sugerido para `CONTRATO.md:348` y `:1309-1311`):

> **Un solo tramo y una sola planeación por barril.** El tramo (paso 2) y la planeación (paso 4) de cada barril diferido son los de la clasificación **vigente** de su fila de `/vistas/anh/paradas`: lo que dijeron las personas encima de lo que propone TRIM. Hay una excepción: la fila cuyo paso 2 espera una respuesta toma el tramo que propone el motor del choke. Todas las vistas que reparten por tramo o por planeación usan esa misma clasificación:
> - `/vistas/choke/reparto`: `porChoke`, `porChokeEscalon`, `porChokeEquipo`, `porEscalon` (disponibilidad planeada y no planeada), `pe` y `peNoPlaneada`;
> - `/vistas/choke/mensual` y `/vistas/choke/base`: `porTramo` y `noPlaneado`;
> - `/vistas/campos/:campo/tuberia`: `perdidoPeriodo` y `sinTramoBbl`;
> - `/vistas/campos/:campo/choke/serie`: `porChoke` y `porEscalon`;
> - `/vistas/choke/arbol`.
>
> **Identidad:** el primer nivel de `gestion` = `porChoke` del reparto, siempre. Lo no planeado del árbol = `porEscalon['disponibilidad-no-planeada']`.
>
> Corregir el paso 2 o el 4 de una fila cambia esas vistas y **no** el libro, que no lee la clasificación.
>
> La causa de TRIM (`TipoCausa`, los Pareto del libro) no cambia.

**Arreglo sugerido:**
- En el motor: que `brechaPorChoke` y las otras cuatro reciban `guardadas` y lean la fila vigente, con una sola función compartida con `arbolDelChoke`.
- En la costura: las cinco claves de caché con `versionDe(guardadas)`.
- En la referencia: un caso con correcciones (C-08, punto 4).
- En `verificar-contrato` (sección 12): la igualdad árbol = reparto **después** de corregir el paso 2 y el 4, no antes.

**Lo que no es parte del error:** el libro (`/vistas/diferidos`) no lee la clasificación ANH, y está bien: el contrato dice «Vive al lado de la causa de TRIM, nunca encima» (`CONTRATO.md:1322`).

## Casos de prueba SQL propuestos

Para `docs/backend/sql/pruebas.sql`, con sus mismos ayudantes (`pg_temp.muerde` y `pg_temp.pasa`).
- Hoy **todos los `muerde` de abajo pasan**: la corrida se detendría.
- Son la prueba de los arreglos de C-03, C-07, C-19, C-26 y C-28.
- Corren sobre `ejemplos.sql`: el evento `EP-LC21-261001-01` es de La Ceiba y `EP-MN01-251015-78` de Morichal.
- La versión con el resultado de hoy está en `…/scratchpad/qa-c/09-sql.sql`.

```sql
-- ── Campo y persona (C-07)
select pg_temp.muerde('clasificación: el supervisor (solo La Ceiba) en una parada de Morichal',
  $$insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, por_id, por, rol_id, hora)
    values ('EP-MN01-251015-78', 'evento', 'EP-MN01-251015-78', 'morichal', 'impacto', 'diferida', 'declarado', 'sup', 'Nelson Ortiz', 'sup', now())$$, '23514');
select pg_temp.muerde('revisión: el operador (solo La Ceiba) en Morichal',
  $$insert into revision_parada (clave, alcance, evento_id, campo_id, motivo, por_id, por, rol_id, hora)
    values ('EP-MN01-251015-78', 'evento', 'EP-MN01-251015-78', 'morichal', 'esto no fue así', 'oper', 'Jairo Peña', 'oper', now())$$, '23514');
select pg_temp.muerde('clasificación: rol_id distinto del rol de la persona (el operador firmando como prod pone el yacimiento)',
  $$insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, porque, por_id, por, rol_id, hora)
    values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'choke', 'reservorio', 'declarado', '{"regla":"choke.yacimiento@1","evidencia":"prueba"}', 'oper', 'Jairo Peña', 'prod', now())$$, '23514');
select pg_temp.muerde('lote: el operador firmando como sup',
  $$insert into confirmacion_lote (id, por_id, por, rol_id, hora, paradas, cadena, pasos)
    values ('LOTE-QA', 'oper', 'Jairo Peña', 'sup', now(), array['EP-LC21-261001-01@2026-10-01#1', 'EP-LC21-261001-01@2026-10-02#2'], 'x', array['choke'])$$, '23514');
select pg_temp.muerde('clasificación: una persona suspendida',
  $s$do $x$ begin
      update usuario set estado = 'suspendido', antes_de_suspender = 'activo' where id = 'tec';
      insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, por_id, por, rol_id, hora)
        values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'impacto', 'diferida', 'declarado', 'tec', 'Óscar Daza', 'tec', now());
    end $x$ $s$, '23514');

-- ── Pasos por rol (C-07): PASOS_QUE_CONFIRMA y PASOS_QUE_DECLARA
select pg_temp.muerde('el operador CONFIRMA «Dónde se trabó»',
  $$insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, regla, por_id, por, rol_id, hora)
    values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'choke', 'pozo', 'confirmado', 'choke.topologia@3', 'oper', 'Jairo Peña', 'oper', now())$$, '23514');
select pg_temp.muerde('el operador CORRIGE el detalle',
  $$insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, propuesto, por_id, por, rol_id, hora)
    values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'n2', 'NP_SUB/falla-esp', 'corregido', 'NP_SUB/falla-pcp', 'oper', 'Jairo Peña', 'oper', now())$$, '23514');
select pg_temp.pasa('el operador deja el tramo por una respuesta de campo (declarado, regla preguntas:campo@1: no avalado)',
  $$insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, regla, por_id, por, rol_id, hora)
    values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'choke', 'pozo', 'declarado', 'preguntas:campo@1', 'oper', 'Jairo Peña', 'oper', now())$$);
select pg_temp.muerde('respuesta: el operador contesta la pregunta del tramo (la contesta quien revisa)',
  $$insert into respuesta_campo (clave, alcance, evento_id, campo_id, pregunta, opcion, por_id, por, rol_id, hora)
    values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'choke', 'En la planta', 'oper', 'Jairo Peña', 'oper', now())$$, '23514');

-- ── Catálogo y forma (C-07, C-26)
select pg_temp.muerde('una N1 que no es de las 20 (NP_INVENTADA)',
  $$insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, por_id, por, rol_id, hora)
    values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'n1', 'NP_INVENTADA', 'declarado', 'sup', 'Nelson Ortiz', 'sup', now())$$, '23503');
select pg_temp.muerde('una fila cuyo día no es fecha',
  $$insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, por_id, por, rol_id, hora)
    values ('EP-LC21-261001-01@nunca#x', 'fila', 'EP-LC21-261001-01', 'ceiba', 'impacto', 'diferida', 'declarado', 'sup', 'Nelson Ortiz', 'sup', now())$$, '23514');
select pg_temp.muerde('un motivo de seis espacios no separables',
  $$insert into revision_parada (clave, alcance, evento_id, campo_id, motivo, por_id, por, rol_id, hora)
    values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', E'      ', 'oper', 'Jairo Peña', 'oper', now())$$, '23514');
select pg_temp.muerde('un lote que no sube ningún paso (C-19)',
  $$insert into confirmacion_lote (id, por_id, por, rol_id, hora, paradas, cadena, pasos)
    values ('LOTE-VACIO', 'sup', 'Nelson Ortiz', 'sup', now(), array['EP-LC21-261001-01@2026-10-01#1', 'EP-LC21-261001-01@2026-10-02#2'], 'x', array[]::text[])$$, '23514');

-- ── La semántica de lo guardado (C-03): lo que diga otra persona en otra clave no se pierde
select pg_temp.pasa('lo que el jefe dijo del evento B sigue vigente después de que la cascada guarda otro paso en B',
  $s$do $x$ begin
      insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, propuesto, por_id, por, rol_id, hora)
        values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'n2', 'NP_SUB/falla-pcp', 'corregido', 'NP_SUB/falla-esp', 'jefe', 'Camilo Rueda', 'jefe', now());
      insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, propuesto, por_id, por, rol_id, hora)
        values ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'responsable', 'op-operacion', 'corregido', 'op-mantenimiento', 'sup', 'Nelson Ortiz', 'sup', now());
      if (select valor from v_clasificacion_vigente where clave = 'EP-LC21-261001-01' and paso = 'n2') <> 'NP_SUB/falla-pcp' then
        raise exception 'se perdió lo que dijo el jefe' using errcode = '23514';
      end if;
    end $x$ $s$);
select pg_temp.pasa('cambiar «¿Planeada?» retirando la causa de otra persona, con su marca (procedencia retirado) y motivo',
  $s$do $x$ begin
      insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, por_id, por, rol_id, hora) values
        ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'n1', 'NP_SUB', 'declarado', 'jefe', 'Camilo Rueda', 'jefe', now());
      set constraints all immediate;
      insert into clasificacion_paso (clave, alcance, evento_id, campo_id, paso, valor, procedencia, porque, por_id, por, rol_id, hora) values
        ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'n1', '', 'retirado', '"Estaba en el programa"', 'sup', 'Nelson Ortiz', 'sup', now()),
        ('EP-LC21-261001-01', 'evento', 'EP-LC21-261001-01', 'ceiba', 'planeacion', 'planeada', 'corregido', '"Estaba en el programa"', 'sup', 'Nelson Ortiz', 'sup', now());
      set constraints all immediate;
    end $x$ $s$);   -- hoy falla: no existe «retirado» y el trigger ve NP_SUB vigente (C-03, caso 2)

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
select pg_temp.muerde('«Todavía no sé» insertado antes que la misma topología',
  $s$do $x$ begin
      insert into topologia_por_saber (version, orden, campo_id, elemento) values (1, 0, 'ceiba', 'K-101');
      insert into topologia (version, orden, campo_id, elemento, alcance, choke, pozos) values (1, 0, 'ceiba', 'K-101', 'compartido', 'planta', array['LC-01', 'LC-02']);
    end $x$ $s$, '23514');
```

Sobre los dos `pasa` del bloque «La semántica de lo guardado»:
- El primero ya pasa hoy (`09b-sql.sql`). Es la guarda de que el SQL conserva lo que dijo otra persona, que es justo lo que el TS borra (C-01, C-03).
- El segundo falla hoy, a propósito: es la prueba del arreglo de C-03 y C-05.

## Desacuerdos con otros agentes

Al cerrar este informe no estaban todavía los de QA-A ni QA-B en la carpeta: no hay desacuerdo escrito con ellos. Con lo que ya está en el repositorio:

1. **`scripts/verificar-contrato.mjs` §10e (líneas 562-569) y §11 a2 (676-685).**
   - Dan por buena una escritura «para la cascada» y «para el evento» mirando solo que el valor nuevo llegue a todas las filas.
   - No miran que sobreviva lo que dijeron otras personas en esas filas: por eso C-01 y C-02 pasan `npm test`.
   - Propuesta: agregar, en las dos secciones, una persona que dijo algo antes en otro evento de la raíz y comprobar que sigue.
2. **`PENDIENTES-TANDA3.md`, P3-UI punto 3** («`revision` … No corrige nada»). El código sí corrige: la revisión con `aplicarAlEvento` o `aplicarALaCascada` borra lo dicho en otras filas y eventos (C-01).
3. **Commit `d028202`**: «el primer nivel coincide con brechaPorChoke» y el pendiente «brechaPorChoke todavía no lee las correcciones del paso 2». El pendiente es más ancho: también el paso 4, y cinco vistas además del reparto (C-09).
4. **`CONTRATO.md:10`** («en el demo, ese módulo ES el servidor») frente a `docs/backend/sql/esquema.sql`. Los dos no dan la misma fila después de una escritura por evento o por cascada (C-03). El contrato tiene que escoger uno.
