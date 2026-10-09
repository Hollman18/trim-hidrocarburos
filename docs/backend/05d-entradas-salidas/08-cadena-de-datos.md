# 5D.8 · La cadena de datos (registro): tags, procedencia, inscripción e ingesta

La **cadena de custodia** de cada número: de qué instrumento sale, cómo se lee, si se calcula, con qué reloj se estampa, por qué borde (gateway) y enlace viaja, y dónde se guarda. Es lo que vuelve «defendible» un barril diferido: el libro no se edita, sale de señales con procedencia.

**Un cliente nuevo son filas, no código.** Nada de la cadena se escribe por cliente: gateway, fuente, tag y calibración se **descubren** del certificado de nacimiento del borde (Sparkplug B `NBIRTH`/`DBIRTH`); el equipo (nombre, clase ISO 14224, criticidad, servicio, fiscal) es del **registro de ingeniería** del cliente, una vez; las fórmulas son la **librería del producto**. Lo único que a veces declara una persona es **a qué equipo pertenece un tag** cuando el borde no lo trae resuelto.

Código: `simulador-api/esquema.sql` (la **especificación** del esquema; en producción PostgreSQL + TimescaleDB), `simulador-api/base.mjs` (reglas de la ingesta y del registro), `simulador-api/api.mjs` (rutas y forma de la procedencia), `src/entities/cadena.ts` (las frases), `src/shared/api/procedencia.ts`, `src/shared/api/registro.ts`, `src/pages/Conectores.tsx`, `src/entities/limites.ts`.

> El simulador (`simulador-api/`, Node + SQLite) **solo** implementa este registro. No es el servidor de producción: no tiene sesión (decide con la cabecera de desarrollo `x-capacidades`), no revisa los campos asignados y toma el campo y el gateway del cuerpo del nacimiento (en producción salen del **certificado de cliente**).

---

## 1. El esquema (lo que el servidor guarda)

| Tabla | Clave | Qué es | Cómo se llena |
|---|---|---|---|
| `campo` | `id` | campos del cliente | registro |
| `gateway` | `id` | el borde (Opto 22 groov EPIC en el demo): `campo_id`, modelo, serie, firmware, enlace (`starlink`/`fibra`/`lte`), `buffer_h`, primer y último visto | se crea con el `NBIRTH` |
| `fuente` | `id` = `{gateway}:{protocolo}:{dispositivo}` | un conector del borde hacia una fuente: protocolo (`pi-web-api`, `opc-ua`, `modbus-tcp`, `roc-plus`, `atg`, `laboratorio`, `ruta-manual`, `sis`, `calculado`), endpoint, modo (`solo-lectura`), **reloj** (quién estampa la hora) | con el nacimiento |
| `equipo` | `id` = `{campo}:{código}` (único por campo) | código, nombre, clase ISO 14224, criticidad | registro de ingeniería |
| `tag` | `id` = `{campo}:{tag}` | nombre, tipo, unidad, límite (texto, bajo, alto), cadencia, clase (`continua`/`discreta`), `equipo_id`, `origen_mapeo` (`descubierto`, `regla`, `manual`, `pendiente`) | con el `DBIRTH`; el equipo a veces a mano |
| `formula` | `id` | librería versionada: (clase de equipo, tipo de tag) → expresión, versión, ventana, activa | producto |
| `calibracion` | `tag_id` | solo donde de verdad hay custodia: vigente hasta, detalle | con el nacimiento |
| `historial_tag` | (`tag_id`, `reemplazado`) | lo que un re-nacimiento cambió: la fila anterior, con el gateway que la cambió | solo se inserta |
| `rechazo` | — | nacimientos rechazados (hecho de seguridad) | solo se inserta, fuera de la transacción |
| `v_procedencia` | vista | une tag + fuente + gateway + equipo + fórmula (solo si la fuente es `calculado` y coinciden clase y tipo) + calibración | **la cadena no se escribe: se consulta** |

**Restricción de integridad:** `tag.campo_id` es el campo de su gateway (trigger en SQLite; en PostgreSQL el mismo trigger o una FK compuesta). `lectura` (la serie de tiempo) va en TimescaleDB particionada por mes, denormalizada con `campo_id`.

**Ejemplo con los datos del demo.** (Corrido sobre una copia de la base del simulador.) Tags por campo: La Ceiba 33 (3 pendientes), Morichal 49 (3), Guacamayo 31 (3), El Palmar 31 (3), La Zarza 29 (3); 2 gateways por campo. Fuentes por protocolo: `pi-web-api` 27, `modbus-tcp` 16, `laboratorio` 9, y 5 de cada uno de `atg`, `calculado`, `opc-ua`, `roc-plus`, `ruta-manual`, `sis`. Una sola fórmula: `f1-compresor-aire` (compresor-aire · «Derivada de presión» · «pendiente de la presión de cabezal (PT-1011) en la ventana, en psi/h», versión 2, ventana 15 min).

---

## 2. Lecturas del registro

### Procedencia de un tag (`GET /api/campos/:campo/tags/:tag/procedencia`)

**Qué es.** De dónde sale un número: la respuesta es **hechos** (sin frases); las palabras las pone el front (`cadena.ts`). Sin sobre (`{ datos }`): el objeto tal cual.

**Dónde se ve.** Al tocar un dispositivo en la ficha de un equipo («la cadena del dato»): pasos «Instrumento», «Cómo se lee», «Cálculo» (si es calculado), «¿Es de ahora o es viejo?»; garantías; y, solo con `conector:configurar`, el bloque técnico (adquisición, gateway, transporte, ingesta, almacenamiento).

**Fórmula (forma).**

```json
{ "instrumento": { "tag","tipo","unidad","equipo","equipoNombre","claseEquipo","criticidad",
                   "limite": { "texto","bajo","alto" } | null, "mapeo": "descubierto|regla|manual|pendiente" },
  "lectura":     { "clase","cadenciaS","protocolo","modo","reloj" },
  "calculo":     { "id","expresion","version","ventanaMin" } | null,
  "custodia":    { "editable": false, "calibracion": { "vigenteHasta","detalle" } | null },
  "tecnico":     { "gateway": { "id","modelo","serie","firmware" }, "enlace","bufferH","ultimoVisto","endpoint",
                   "transporte": "mqtt-sparkplug-b/tls", "almacenamiento": "…" } }
```

`tecnico` **solo** sale con `conector:configurar`: lo decide el servidor, no es un filtro de pantalla. `404 { codigo: "tag-no-registrado" }` si el tag no está registrado: **es el único 404 que el front interpreta** («sin registro»: muestra el hueco, no una cadena inventada); cualquier otro 404 o una respuesta no JSON es «no hay servicio».

**Ejemplo con los datos del demo.** (Corrido.) `PDT-1011` de La Ceiba: tipo «Derivada de presión», psi/h, equipo K-101 «Sistema de aire de instrumentos» (`compresor-aire`, criticidad 5), límite `{ texto: "> -0,2", bajo: -0.2, alto: null }`, mapeo `descubierto`; lectura continua cada 47 s, protocolo `calculado`, reloj «el tag del que se deriva»; cálculo `f1-compresor-aire` v2, 15 min; sin calibración; técnico: gateway `EPIC-CEIBA-01` (GRV-EPIC-PR1, serie GRVCEI0016, firmware 3.6.2), Starlink, buffer 48 h, último visto `2026-10-02T19:00:00.000Z`. `LT-2012` (nivel del tanque de agua de La Ceiba): Modbus TCP contra `plc-ceiba.ot.local:502`, reloj «el PLC de la batería», `calculo: null`. `LI-1102` (nivel de TK-102, custodia): ATG cada 120 s, calibración «Verificado contra cinta el 3 de marzo de 2026 · vigente hasta marzo de 2027». `FQI-1001` → no existe en La Ceiba → 404 `tag-no-registrado`.

**Referencia.** `simulador-api/api.mjs:56-90, 144-151`; `CONTRATO.md` · «`GET …/procedencia`».

### Las frases de la cadena (`pasos`, `garantias`, `tecnico`, `cadencia`)

**Qué es.** El traductor de hechos a lenguaje del campo. **No inventa**: si un dato no viene, el paso no se muestra. Lo calcula el front.

**Fórmula.**
- `cadencia(s)`: `null` → «sin cadencia declarada»; < 90 → «{s} s»; < 5.400 → «{s/60} min»; < 172.800 → «{s/3600} h»; si no «{s/86400} d» (un decimal con coma si no es entero). Corridos: 47 → «47 s», 5 → «5 s», 900 → «15 min», 3.600 → «60 min», 90 → «1,5 min», 5.400 → «1,5 h», 172.800 → «2 d», 7.776.000 → «90 d».
- «Cómo se lee» por protocolo: `pi-web-api` «Medición en línea, del historiador de planta» · `opc-ua`/`modbus-tcp` «Medición en línea, directa del controlador» · `roc-plus` «Medición fiscal, del computador de flujo» · `atg` «Medición en línea, del medidor de tanque» · `calculado` «Derivado de otro tag del mismo equipo» · `sis` «Estado de un lazo de seguridad cableado e independiente» · `laboratorio` «Ensayo de laboratorio · no hay señal continua» · `ruta-manual` «Ruta de medición manual con equipo portátil»; otro: «Origen sin declarar». `laboratorio` y `ruta-manual` **no son en línea**: «Entre una toma y la siguiente el valor no cambia.».
- Instrumento: «En {equipo}. Banda normal declarada {límite} {unidad}.» + la alarma del **límite del tag** (`limites`, la única fuente de banda y alarma): «Alarma alta en {x} {u} y baja en {y} {u} ({fuente}).»; si el texto del límite del tag y el de la procedencia **no cuadran**: «El límite del tag dice {a} y el registro de la cadena {b}: no cuadran; el vigía usa el del límite del tag.». Sin límite: «No tiene banda de alarma: mide volumen, no condición.».
- «¿Es de ahora o es viejo?»: sin lectura (estado «sin señal» **o** `valor: null`: `sinLectura`, `CadenaDato.tsx:88`; desde el 8-oct un `null` con otro estado también es dato inválido) → «Sin señal · el último valor es de la ruta anterior»; en línea → «Lectura viva · entra cada {cadencia}»; si no → «Valor de la última toma · se repite cada {cadencia}».
- Garantías: «Marca de tiempo: La pone {reloj}. Se conserva la del origen aunque el dato llegue tarde.»; si no editable «Registro: No editable una vez guardado.»; si solo lectura «Conexión: Solo lectura. No se escribe al equipo.»; si hay calibración «Calibración: {detalle}».

**Ejemplo con los datos del demo.** (Corrido con la procedencia del simulador y `limites` del catálogo.) `VI-2011`: «VI-2011 · Vibración global» — «En P-201B. Banda normal declarada < 3,9 mm/s. Alarma alta en 3,9 mm/s (API 610, Tabla 8: 3,0 mm/s RMS en la región preferida y 3,9 en la permitida (hasta 3.600 rpm y 300 kW por etapa)).»; «Medición en línea, directa del controlador» — «Cada 47 s.»; «Lectura viva · entra cada 47 s». `LT-2012`: «… Banda normal declarada > 15 %. Alarma baja en 15 % (Hoja de datos del fabricante: nivel mínimo de succión).». `PDT-1011`: paso «Cálculo» = «pendiente de la presión de cabezal (PT-1011) en la ventana, en psi/h» — «Versión 2 de la librería · ventana de 15 min. Misma fórmula en todos los campos.». Técnico de `LT-2012`: «Adquisición: PLC o variador · registros Modbus — EtherNet/IP o Modbus TCP contra el equipo, en modo solo lectura. Contra plc-ceiba.ot.local:502.»; «Gateway de borde: Opto 22 groov EPIC · GRV-EPIC-PR1 — Serie GRVCEI0016, firmware 3.6.2. Escribe en cola local antes de intentar enviar. Buffer de 48 h: al reconectar envía con la marca de tiempo original, no con la de llegada.»; «Transporte: MQTT Sparkplug B sobre TLS · enlace Starlink Business — El borde publica hacia afuera. Starlink está detrás de CGNAT, así que la nube no puede consultar al equipo: por diseño el flujo es de empuje.»; «Ingesta: Normalización y control de calidad — Conversión de unidad una sola vez, bandera de calidad, y deduplicación por (equipo, tag, marca de tiempo).»; «Almacenamiento: PostgreSQL + TimescaleDB · tabla lectura — Particionada por mes y denormalizada con campo_id para no cruzar el catálogo en cada consulta.».

**Casos borde.** El nombre del componente de cada protocolo y el del transporte/enlace/almacenamiento están en tablas del front (`ADQUISICION`, `TRANSPORTE`, `ENLACE`, `ALMACENAMIENTO`); un valor que el front no conoce se muestra crudo. Los dos `ingesta`/`almacenamiento` describen lo que el **servidor** tiene que hacer de verdad: deduplicar por (equipo, tag, marca de tiempo), conservar la marca de tiempo del origen, convertir unidades una sola vez.

**Referencia.** `src/entities/cadena.ts`.

### Inventario y pendientes (`GET /api/campos/:campo/inventario`, `…/tags/pendientes`)

**Qué es.** Lo que la pantalla Conectores muestra del registro del campo.

**Fórmula (forma).** Inventario: `{ gateways: [{ id, campo_id, modelo, serie, firmware, enlace, buffer_h, primer_visto, ultimo_visto, tags }], tags: { total, pendientes /* siempre número, 0 sin tags */ }, equipos: [{ codigo, nombre, clase, criticidad, tags /* "T1,T2" */ }] }`. Pendientes: `[{ tag, tipo, unidad, limite_texto, cadencia_s, protocolo, gateway_id }]` de los tags con `origen_mapeo = pendiente`, por nombre. `404 { codigo: "campo-desconocido" }` si el campo no existe (no un inventario vacío).

**Ejemplo con los datos del demo.** La Ceiba: 2 gateways (`EPIC-CEIBA-02`, 3 tags; `EPIC-CEIBA-01`, 30 tags), `tags: { total: 33, pendientes: 3 }`, 8 equipos (C-401, H-302, K-101, LACT-01, P-201B con `PI-2010,FI-2011,II-2011,TI-2011,PDI-2011,VI-2011,LSH-2013,LT-2012`, SE-2, TK-102, V-101). Pendientes: `XI-1017` (Nivel de interfase, %, «35 – 65», 5 s, opc-ua, EPIC-CEIBA-02), `XP-4016` (Presión de descarga, psi, «1.050 – 1.250»), `XT-1017` (Presión diferencial, psi, «< 8»).

**Qué texto se muestra.** Conectores (`#/adm/conectores/…`): métricas «BORDES CONECTADOS 2», «TAGS REGISTRADOS 33 · 30 asociados», «POR ASOCIAR 3 · sin equipo resuelto», «EQUIPOS DEL CAMPO 8»; panel «TAGS POR ASOCIAR» con una sugerencia por tag (chip «sugerido {equipo}», ⓘ «Por nomenclatura: {razón}.») y el botón «Aplicar las {n}» (asocia en bloque con `origen: regla`, un `POST` por tag; si alguno falla: «Se asociaron {k} de {n}; no se pudieron asociar …»).

La **sugerencia** (`sugerir`, front) busca el bloque de dígitos más largo que el tag comparte, desde el comienzo, con un tag ya asociado; ≥ 3 dígitos → sugiere ese equipo (confianza «alta» con ≥ 4, «media» con 3). Corrido en La Ceiba: `XI-1017` → K-101 («comparte el bloque 101 con PT-1011», media), `XP-4016` → C-401 («… 401 con PI-4011», media), `XT-1017` → K-101 (media). Ver «Huecos y dudas»: un nivel de interfase sugerido al compresor de aire.

**Referencia.** `simulador-api/base.mjs:250-275`; `src/shared/api/registro.ts:81-104`; `src/pages/Conectores.tsx`.

---

## 3. Escrituras del registro

### Asociar un tag a un equipo (`POST /api/campos/:campo/tags/:tag/equipo`)

**Fórmula.** Cuerpo `{ equipo, origen: "manual" | "regla" }` → `{ tag, equipo, origen }`. Reglas: `conector:configurar` (403 `sin-capacidad`) y el campo asignado (403; **el simulador no lo revisa**); `400` si falta el equipo («equipo es obligatorio») o el origen no es `manual`/`regla` («origen es manual o regla»); `404 equipo-desconocido` si el equipo no es de ese campo («equipo desconocido en ceiba: ZZZ», corrido); `404 tag-no-registrado` si el tag no existe. Corrido: `XI-1017` → `V-101`, `regla` → `{ "tag":"XI-1017", "equipo":"V-101", "origen":"regla" }`.

**Casos borde.** **Un nacimiento nunca deshace un mapeo `manual` o `regla`** (corrido: tras asociar `XI-1017` a V-101 por regla, un re-nacimiento del mismo gateway que lo declara bajo otro dispositivo deja `equipo_id = ceiba:V-101`, `origen_mapeo = regla`). Para aceptar en bloque hoy hay un `POST` por tag; conviene `POST /api/campos/:campo/tags/equipo` con `[{ tag, equipo, origen }]` y resultado tag por tag (pendiente).

### Inscribir un borde (`POST /api/inscripcion`)

**Fórmula.** Cuerpo `{ campo }` → `{ campo, codigo, expiraEn, instruccion }`. `conector:configurar` y campo asignado; `404 campo-desconocido`. El simulador genera 10 caracteres de un alfabeto de 31 (`ABCDEFGHJKMNPQRSTUVWXYZ23456789`: sin I, L, O, 0, 1) en dos grupos de 5 (`KEV4Y-SQCMN`), `expiraEn: "24 h"`, `instruccion: "Se pega en el gateway; al primer contacto se canjea por su certificado."`. La respuesta trae el `campo`: el front guarda el código con el campo pedido y **no lo muestra bajo otro campo** («Código para {campo} · {código} · {instrucción} Vence en 24 h.»).

**Lo que hace el backend real (pendiente):** código **de un solo uso**, con vencimiento real, guardado con hash; en el primer contacto del borde se **canjea por un certificado de cliente** atado al campo; un nacimiento sin certificado válido se rechaza. (El simulador usa `getRandomValues % 31`, con un sesgo mínimo de módulo; el real debería muestrear sin sesgo.)

### Nacimiento del borde (`POST /api/ingesta/nacimiento`)

**Qué es.** Lo llama el borde, no el front: la forma de `NBIRTH` + `DBIRTH` de Sparkplug B. Es lo que **llena la cadena sola**. **El campo y el id del gateway salen del certificado de cliente, nunca del cuerpo** (el simulador, sin certificados, los lee del cuerpo). En producción, además, entra por un **cliente MQTT** contra el broker (hoy por HTTP).

**Fórmula (reglas, en orden).**

| # | Regla | Respuesta |
|---|---|---|
| 1 | forma (`validarNacimiento`): `campo` y `gateway.id` texto no vacío; `gateway.{modelo,serie,firmware,enlace}` texto o nulo; `bufferH` número o nulo; `dispositivos` ≥ 1; cada uno con `nombre`, `fuente.protocolo`, `fuente.reloj` (texto no vacío), `fuente.endpoint` texto o nulo, `metricas` ≥ 1; cada métrica con `nombre` **no repetido en el nacimiento**, `tipo/unidad/limite` texto o nulo, `bajo/alto/cadenciaS` número finito o nulo, `clase` ∈ {continua, discreta} o nula, `calibracion` objeto con `vigenteHasta/detalle` texto o nulo | `400 { error: { faltas: [...] } }` |
| 2 | el campo existe | `404 campo-desconocido` |
| 3 | si el gateway ya está inscrito en **otro** campo | `403 gateway-de-otro-campo` + fila en `rechazo` |
| 4 | si algún tag (por `{campo}:{tag}`) ya lo publica **otro** gateway | `409 tag-de-otro-gateway` con `tags: [...]` + fila en `rechazo` |
| 5 | **todo o nada** (una transacción): upsert del gateway (actualiza modelo, firmware, enlace, buffer, último visto; no la serie); upsert de cada fuente `{gw}:{protocolo}:{dispositivo}`; por cada métrica: si cambió tipo, unidad, límite, cadencia, clase o calibración, la fila anterior va a `historial_tag`; upsert del tag con `equipo_id` = el equipo del campo cuyo código es el nombre del dispositivo (→ `descubierto`) o nulo (→ `pendiente`), **salvo que el tag ya tuviera mapeo `manual`/`regla`**; calibración se pone si viene y **se quita si ya no viene** | `{ gateway, tags, pendientes }` |

**Ejemplo con los datos del demo.** (Corrido sobre una copia de la base.) `EPIC-CEIBA-01` presentándose como de Morichal → `403` «el gateway EPIC-CEIBA-01 está inscrito en ceiba y se presentó como de morichal» (`gateway-de-otro-campo`). `EPIC-CEIBA-02` declarando `VI-2011` → `409` «el gateway EPIC-CEIBA-02 declaró tags que ya publica otro gateway: VI-2011 (EPIC-CEIBA-01)» con `tags: ["VI-2011"]`. Los dos quedaron en `rechazo` con su hora y motivo. Un nacimiento sin `fuente.reloj`, con una métrica repetida y una cadencia de texto → `400` con `faltas: ["dispositivos[0].fuente.reloj es obligatorio", "dispositivos[0].metricas[1].nombre repite A", "dispositivos[0].metricas[1].cadenciaS tiene que ser un número"]`. Un re-nacimiento de `EPIC-CEIBA-01` que cambia el límite de `VI-2011` de «< 3,9» a «< 4,5» → `{ gateway: "EPIC-CEIBA-01", tags: 1, pendientes: 0 }` y en `historial_tag` la fila anterior (`limite_texto "< 3,9"`, `limite_alto 3.9`, cadencia 47, `reemplazado "2026-10-02T19:05:00.000Z"`, `gateway_id "EPIC-CEIBA-01"`).

**Casos borde.**
- **Errores generales del registro**: JSON roto, cuerpo que no es objeto o `%` mal formado en la ruta → `400` (`peticion-invalida`, `url-invalida`); cuerpo de más de 2 MB → `413 cuerpo-muy-grande`; lo inesperado → `500 interno` **sin el mensaje interno** (SQL, rutas). El simulador mide los 2 MB en caracteres, no en bytes.
- **El límite que declara el instrumento (DBIRTH) es la banda normal**; la **alarma** es de la base maestra de alarmas (ISA-18.2) y la entrega el catálogo (`limites[tag].alarma`). Si el servidor quiere servirla también en la procedencia, va en `instrumento.limite.alarma` con la misma forma (pendiente).
- Las respuestas del registro **no** usan el sobre `{ datos }` (es el objeto tal cual) pero sí el error único.
- Un rechazo se escribe **fuera** de la transacción del nacimiento (que se deshizo): queda aunque el nacimiento no.

**Quién lo calcula.** Servidor.

**Referencia.** `simulador-api/base.mjs:83-248, 277-288`; `simulador-api/api.mjs:91-196`; `simulador-api/esquema.sql`; `CONTRATO.md` · «Cadena de datos (registro)», «Pendiente del lado del servidor».

---

## 4. Lo que el servidor debe validar (resumen)

1. **Identidad del borde** por certificado de cliente (mTLS o el mecanismo del broker): campo y gateway del certificado; nada del cuerpo. Rechazar nacimientos sin certificado válido.
2. **Un gateway pertenece a un solo campo** (403 + `rechazo`); **un tag pertenece a un solo gateway** (409 + `rechazo`); `tag.campo_id` = campo del gateway (trigger/FK).
3. **Forma completa antes de escribir** (400 con `faltas` legibles, por ruta); **todo o nada**.
4. **Historia, no reemplazo**: cambios de límite, unidad, cadencia, clase o calibración van a `historial_tag`.
5. **El mapeo de una persona o de una regla no lo deshace el borde.**
6. **Capacidad y campo** en asociar e inscribir (`conector:configurar` + campo asignado, desde el token); el bloque `tecnico` de la procedencia solo con la capacidad.
7. **Lecturas filtradas por campo** (`campo-desconocido` para un campo que no existe; un campo ajeno no devuelve datos).
8. **Ingesta de lecturas**: deduplicar por (equipo, tag, marca de tiempo), conservar la marca de tiempo del origen (el borde reenvía con la original tras un corte de hasta `buffer_h` horas), convertir la unidad una sola vez, bandera de calidad.
