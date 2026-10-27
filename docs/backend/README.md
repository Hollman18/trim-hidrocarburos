# Documento técnico del backend · TRIM Hidrocarburos

Para quien va a construir el servidor. Con este documento se construye el backend que reemplaza al simulador del demo **sin leer el código del front**, y cada número que el front muestra sale igual: con su fórmula, su ejemplo calculado con los datos del demo y el texto que se muestra según su valor.

> **Lo que resuelve.** Cuántos barriles se dejaron de producir por cada equipo crítico (bombas de reinyección de agua y electrosumergibles) y por qué parte, con cadena de custodia, desde el pozo hasta la gerencia. En Colombia los pozos producen sobre todo agua (cortes de 92–98 %): si la bomba de reinyección se para y el respaldo no alcanza, el tanque de agua se llena y hay que cerrar pozos. El capítulo 1 lo explica de punta a punta con un caso real del demo.

## La versión 1 y lo que cambió (léalo primero)

> **Al lado, nunca encima.** La línea base del contrato es la **versión 1** (`cde8214`, 7-oct-2026). Lo de v1 no se renombra, no se borra ni cambia de significado: lo nuevo va al lado y lo que sale queda **RETIRADO**, con su fecha, su motivo y su reemplazo.
>
> - **Qué hacer, en una tabla corta:** [`CAMBIOS-CONTRATO.md`](CAMBIOS-CONTRATO.md) §1 (agregar ahora, para después, ya no construir).
> - **El registro para la máquina:** [`cambios-contrato.json`](cambios-contrato.json). **La foto de v1:** [`linea-base/v1.json`](linea-base/v1.json), y su referencia tal cual en [`linea-base/v1/referencia/`](linea-base/v1/referencia/). `npm run verificar:contrato` («A1») comprueba que todo lo de v1 sigue o está registrado.
> - **El SQL: rige el de v1**, [`simulador-api/esquema.sql`](../../simulador-api/esquema.sql) (la cadena de datos; no cambió). [`sql/esquema.sql`](sql/esquema.sql) es **AGREGADO**, al lado: la versión 2 del modelo, necesaria para todo lo demás. [`sql/v1-cadena.sql`](sql/v1-cadena.sql) da las tablas y columnas de v1 desde el modelo nuevo (esquema `v1`).
> - **RETIRADO (27-oct-2026): el canal de WhatsApp.** El backend no lo construye; lo que tenía valor queda en pantalla, dentro de TRIM (CAMBIOS-CONTRATO.md §3).

## Pitch comercial (PDF corto)

Deck (10 diapositivas, marca gotrim.ai): [`TRIM-pitch-comercial.pdf`](TRIM-pitch-comercial.pdf) · `npm run pitch:pdf` · HTML junto al PDF. Notas extendidas: [`pitch-trim-ventas.md`](pitch-trim-ventas.md) · `npm run pitch:pdf-doc`.

## Por dónde empezar

1. **[Capítulo 1](01-propuesta-de-valor.md)**: el problema, la cadena de cálculo en siete pasos y el caso de P-201B, de la parada a la gerencia.
2. **[Capítulo 2](02-arquitectura.md)**: qué hace el servidor, cómo viaja un número hasta la pantalla, el reloj, los períodos y los roles.
3. **[Capítulo 7](07-api.md)**: el índice de la API (qué endpoint usa cada pantalla). El contrato completo está en [`CONTRATO.md`](../../CONTRATO.md) (anexo A).
4. Después, según lo que esté construyendo: el modelo de datos (3), la cadena de datos (4), las fórmulas (5A–5D) o una pantalla (6).
5. **[Capítulo 9](09-verificacion.md)**: cómo se comprueba que su servidor da los mismos números (122 casos de `referencia/`).
6. **[Capítulo 10](10-pendientes.md)**: decisiones abiertas, atajos del demo y defectos conocidos.
7. **[Capítulo 11](11-ciclo-de-valor.md)**: ciclo ANTES / DURANTE / DESPUÉS. El front ya lo muestra; este capítulo es el encargo para implementar `GET /vistas/ciclo` y `POST /planes/:id` en el servidor.

## Contenido

| Capítulo | Qué trae |
|---|---|
| [1 · El problema y su solución técnica](01-propuesta-de-valor.md) | Agua en yacimientos maduros (global); cadena de cálculo; P-201B; precisión; producto TRIM vs línea gemelo digital; palancas; backend |
| [2 · Arquitectura](02-arquitectura.md) | Las tres capas del front; los seis bloques del servidor; motor en Node o reescrito; el recorrido de un número; arranque; reloj y períodos; campo y portafolio; sesión, roles y nivel de detalle; reglas del cable |
| [3 · Modelo de datos](03-modelo-de-datos.md) | Tabla por tabla, con diagramas entidad-relación. Rige el SQL de v1 ([`simulador-api/esquema.sql`](../../simulador-api/esquema.sql), la cadena de datos); el modelo completo, AGREGADO al lado, está en [`sql/esquema.sql`](sql/esquema.sql) (PostgreSQL 16), con [`sql/v1-cadena.sql`](sql/v1-cadena.sql) (las tablas de v1 desde el modelo nuevo) y [`sql/timescale.sql`](sql/timescale.sql) (opcional), con filas reales del demo ([`sql/ejemplos.sql`](sql/ejemplos.sql)), las pruebas de las restricciones ([`sql/pruebas.sql`](sql/pruebas.sql)) y los cuadres ([`sql/cuadres.sql`](sql/cuadres.sql)); el libro de Excel en [`modelo-de-datos.xlsx`](modelo-de-datos.xlsx) |
| [4 · Cadena de datos](04-cadena-de-datos.md) | Del PLC al número: borde, nacimiento, cadencias, calidad, cómo se arma cada insumo del motor |
| [5A · El libro de diferidos](05a-libro/00-indice.md) | Asignación de producción: factor de asignación y su banda (Res. MME 40236), potencial, real y diferido por evento, tolerancia, períodos, metas, valor, publicación, Paretos, día a día, asignación oficial |
| [5B · Paradas, causas y agua](05b-paradas-agua/00-indice.md) | Eventos, árbol de causas, colchón del tanque, orden de cierre, lo evitable, riesgo ahora, turno, historia de un equipo |
| [5C · Salud y vigía](05c-salud-vigia/00-indice.md) | Series y límites, pronóstico de cruce, salud por parte, electrosumergibles, «¿acierta el vigía?», catálogo de daños ISO 14224 |
| [5D · Entradas y salidas](05d-entradas-salidas/00-indice.md) | Reloj, configuración firmada, plan, usuarios y permisos, informes con folio y huella, WhatsApp (RETIRADO, 27-oct-2026), SAP PM, planta, registro de la cadena |
| [5E · El choke y el árbol de causas](05e-choke-arbol/00-indice.md) | Los cuatro tramos (SPE-36848) y la topología con el criterio de Edinson; potenciales y lo que limita; el choke de cada parada; el reparto con la cifra única del norte; el árbol de pérdidas del choke; la tubería del agua; «si falla hoy»; la serie; el árbol de 6 pasos de la Circular 024 con el guardado por paso y la privacidad |
| [6A · Pantallas del libro y la gerencia](06a-libro-gerencia/00-indice.md) | Resumen, Diferidos, Producción, Configuración, Mi perfil, Conectores |
| [6B · Pantallas de operación](06b-operacion/00-indice.md) | Bombas, Electrosumergibles, Pozos, ficha de un equipo, Turno, teléfono (RETIRADO, 27-oct-2026) |
| [6C · Mantenimiento, confiabilidad y marco](06c-mantenimiento-marco/00-indice.md) | Riesgo, Identificar, Mantenimiento, Confiabilidad, Superficie, Mi trabajo, Planta, y la cabecera, el riel, la introducción, Exportar y el papel |
| [6D · Pantallas del choke y del árbol de causas](06d-choke-pantallas/00-indice.md) | La tubería del campo y la del agua, «dónde se trabó» del gerente, el árbol de cada tramo, «Si falla hoy», «Hoy limita» y el cierre del día, el árbol de 6 pasos en Identificar (y WhatsApp: RETIRADO, 27-oct-2026), la calidad de la clasificación, el árbol de la circular y la Filosofía operacional |
| [7 · La API](07-api.md) | Cada endpoint con sus parámetros, la pantalla que lo usa y el capítulo de sus fórmulas; escrituras con sus códigos 403/404/409/422 |
| [8 · Reglas de presentación](08-presentacion.md) | Formatos de números y fechas, unidades, prioridades ISA-101, barra contra meta, indicador analógico, «ver N más», ⓘ, medido y calculado, huecos, papel |
| [9 · Verificación](09-verificacion.md) | La referencia por HTTP, el front contra su servidor, el contrato, las identidades que siempre valen, lista de aceptación |
| [10 · Pendientes](10-pendientes.md) | Decisiones para el dueño del producto, lo que el servidor hace distinto al demo, defectos encontrados, endpoints y casos que faltan |
| [11 · Ciclo de valor](11-ciclo-de-valor.md) | Por qué Antes / Durante / Después (venta), UI plegada y cinturón por rol (front hecho). Encargo backend: fórmulas, `GET /vistas/ciclo`, `POST /planes/:id`, `decision_plan`, referencia y e2e |
| [Anexo A · Contrato de la API](../../CONTRATO.md) | La forma exacta de cada respuesta y las reglas de cada escritura |
| [Anexo B · Glosario](anexo-b-glosario.md) | Los términos del sector y del producto |
| [Anexo C · Normas](anexo-c-normas.md) | Las normas que el código aplica y dónde |

## Cómo leer una ficha

Cada número, gráfico o regla de los capítulos 5 y 6 sigue la misma plantilla:

- **Qué es** y **dónde se ve** (pantalla, rol y rótulo).
- **Fórmula**, con una tabla que da el significado, la unidad y la fuente de cada símbolo.
- **Ejemplo con los datos del demo**: calculado corriendo el motor, hasta el texto que muestra la pantalla.
- **Casos borde**: sin dato, sin prueba, sin meta, período en curso, cero.
- **Qué texto se muestra según el valor**: umbrales, marcas de prioridad, singular y plural, formato, el texto del ⓘ y del papel.
- **Quién lo calcula y por dónde viaja**: endpoint, campo y tipo.
- **Referencia**: el código (`archivo:línea`) y el caso de `referencia/` que lo comprueba.

En las pantallas (capítulo 6), cada número verde sobre la captura corresponde a una fila de la tabla que va debajo.

Las cifras de ejemplo salen del motor con los datos de demostración, con el reloj del demo (`AHORA` = 2 de octubre de 2026, 14:00, hora de Colombia). **No son datos de un cliente.**

## Cómo se regenera

| Qué | Cómo |
|---|---|
| Las capturas anotadas (`img/`) | `npm run pantallazos:doc` (todas) o `npm run pantallazos:doc -- --solo <prefijo>`. Las marcas están en [`capturas.mjs`](capturas.mjs) y [`capturas/`](capturas/). Una marca que no se encuentra hace fallar la captura: no se guarda una imagen con un número que apunta a nada. Las siete que el generador no hace (la introducción de cada rol, el papel impreso y un cambio de esquema de planta) tienen su guion en [`capturas/guiones/`](capturas/guiones/) |
| El esquema | [`sql/esquema.sql`](sql/esquema.sql) se corre tal cual en PostgreSQL 16 (`psql -v ON_ERROR_STOP=1 -f sql/esquema.sql`) y [`sql/v1-cadena.sql`](sql/v1-cadena.sql) después (el esquema `v1`); [`sql/timescale.sql`](sql/timescale.sql) después, solo si la extensión TimescaleDB está instalada. `zsh docs/backend/sql/herramientas/validar.sh .` lo valida de punta a punta en un PostgreSQL 16 temporal (esquema, carga de los ejemplos, que las restricciones muerden, cuadres y que la especificación coincide) y deja el resultado en [`sql/validacion.log`](sql/validacion.log) |
| El libro de Excel | `node docs/backend/herramientas/diagramas-er.mjs` dibuja los diagramas del capítulo 3 y [`herramientas/armar-excel.py`](herramientas/armar-excel.py) arma el libro desde [`sql/tablas.json`](sql/tablas.json) (necesita `openpyxl` y `pillow`; ver la cabecera de cada script) |
| El PDF | [`herramientas/armar-pdf.mjs`](herramientas/armar-pdf.mjs) con la lista [`herramientas/pdf.json`](herramientas/pdf.json): fórmulas con KaTeX y diagramas con Mermaid, impreso con el Chromium de Playwright del proyecto. Las dependencias se instalan sin tocar `package.json`: `npm i --no-save marked@15 marked-katex-extension@5 katex@0.16 mermaid@11`. El PDF va en el paquete de entrega, no en el repositorio |
