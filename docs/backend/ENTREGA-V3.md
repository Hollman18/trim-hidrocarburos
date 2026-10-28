# Entrega v3 · para el desarrollador del backend

**27-oct-2026, contra `main` (`262df1f`).** Usted construye sobre la **versión 1** (`cde8214`, 7-oct). Esta página dice qué
cambió desde entonces, en qué orden construir lo nuevo y cómo probarlo contra este front. El detalle, ruta por ruta,
está en [`CAMBIOS-CONTRATO.md`](CAMBIOS-CONTRATO.md) (§1.1) y la forma exacta de cada respuesta, en
[`CONTRATO.md`](../../CONTRATO.md).

**La regla que no cambia: al lado, nunca encima.** Nada de su v1 se renombró ni se borró. Lo nuevo es una ruta nueva o
un campo opcional; lo que sale queda marcado RETIRADO. Si usted construyó v1, sigue valiendo, salvo lo que dice §3.

---

## 1. Qué cambió desde su v1

El contrato tiene hoy **92 rutas**: las 50 de v1, 29 de la v2 y 13 de la v3. Se reparten así:

| | Construir ahora | Para después | Ya no construir |
|---|---|---|---|
| Las 50 de v1 | 42 | 3 | 5 |
| Las 29 de la v2 | 25 | 2 | 2 |
| Las 13 de la v3 | 13 | — | — |
| **Total** | **80** | **5** | **7** |

Fuera de `contrato.ts` (la cadena de datos e insumos, en `CONTRATO.md`): 14 ahora, 2 para después y 2 ya no (el
webhook de WhatsApp).

**Cómo se decidió:** «ahora» = la pide el arranque o una pantalla de lo que cada rol necesita; «después» = solo la pide
un escalón, o un botón que sin ella dice el error; «ya no» = ninguna pantalla la pide.

> **Ojo:** si falta una lectura que una pantalla pide, esa pantalla entera muestra «Reintentar» en vez de su
> contenido. Por eso nada de «ahora» se puede saltar, y `GET /planta/cambios` va aunque sea `[]`: es del arranque, y
> sin ella el front no arranca.

**CONSTRUIR AHORA (80)**
- **De v1 (42):** todas las de v1 menos las 8 de las otras dos listas. Incluye los 10 GET del arranque y las 8
  escrituras (todas menos `POST /planta/cambios`).
- **De la v2 (25):** E1 `/vistas/ciclo`, E2 `tuberia`, E4 `agua`, E5 `capacidades`, E6 `/vistas/criticidad`, E7
  `/choke/reparto`, E10 `/choke/arbol`, E11–E12 topología, E13–E15 la ANH (`paradas`, `calidad`, `reporte`), E16
  `planta-viva`, E17 `hoy`, E18 `resultados`, E19 `lista-equipos`, E20 `…/tecnico`; y las escrituras E22–E29 (el árbol
  de la ANH, la vista previa de la configuración y la topología importada).
- **De la v3 (13):** las 9 piezas de §2.

**PARA DESPUÉS (5):** `GET /vistas/bombas/prediccion` y `GET /vistas/pozos` (escalones de producción), E3
`/vistas/campos/:campo/choke/serie`, E21 `POST /planes/:id` (decidir un plan simulado) y `POST /planta/cambios` (el
esquema de planta del administrador). Fuera de `contrato.ts`: la procedencia de un tag y `GET /api/informes/:folio`.

**YA NO CONSTRUIR (7)**
- **RETIRADO, WhatsApp (27-oct-2026):** `GET /mensajes`, y fuera de `contrato.ts` el webhook (`GET` y
  `POST /api/webhooks/whatsapp`). Tampoco el envío por Meta, las plantillas, el teléfono y las alertas de cada persona,
  ni sus 5 tablas del SQL nuevo (CAMBIOS §3, R1–R8). Si ya los hizo, puede quitarlos cuando quiera.
- **Ninguna pantalla las pide (6):** `/vistas/diferidos/base`, `/vistas/bombas/paradas-en-periodo`,
  `/vistas/electrosumergibles`, `/vistas/equipos`, E8 `/vistas/choke/mensual` y E9 `/vistas/choke/base`.

---

## 2. Las 9 piezas nuevas, en el orden en que conviene construirlas

Cada una ya la calcula el motor del front (`src/entities`), tiene su caso en `referencia/` y su sección en
`CONTRATO.md` («A1», «A2», «A3»). El orden va por lo que desbloquea: primero lo que ven más roles y las acciones
principales.

| # | Pieza | Rutas y campos (todo AGREGADO) | Desbloquea | Necesita antes |
|---|---|---|---|---|
| 1 | **El balance del choke:** producido · diferido · perdido, por tramo y con el árbol de sus causas | `GET /vistas/balance?campos&desde&hasta` (o `&jornada=actual\|anterior`) | ger, prod, sup, reg, jefe y conf: es el pedido del dueño | el libro, las filas de la ANH (E13) y el árbol (E10): el diferido es el mismo |
| 2 | **«Contestar» en 1 toque** | `POST /paradas/:evento/respuesta` con `parte` y sin `modo`; `POST /paradas/:evento/vio` | oper y tec: su acción principal | — (ver §3: es la única regla de v1 que se relaja) |
| 3 | **El registro de pérdidas** | `POST /perdidas`; `GET /vistas/perdidas`; capacidad `perdidas:registrar` | oper (con botones), sup y prod; llena el «perdido» del balance y de la jornada | la pieza 1 |
| 4 | **La jornada del supervisor** | `GET /vistas/jornada?campo&jornada`; `porConfirmar` en `GET /vistas/hoy`; `Config.campos[c].turnos` | sup: su número principal, «Mi turno» y la entrega de turno | piezas 1 y 3 |
| 5 | **Cerrar la orden en el teléfono** | `POST /sap/ordenes/:numero/cierre`; `cierre` y estado `CNF` en `GET /sap/ordenes`; capacidad `orden:cerrar` | tec | `GET /sap/equipos` (el catálogo de partes) |
| 6 | **El tiempo fuera en 5 tramos y las fallas por mes** | `tramos` en `GET /vistas/relojes`; `GET /vistas/fallas/mensual` | jefe | la pieza 5 (sin cierre, logística y arranque van en `null`) |
| 7 | **La respuesta de la ANH y la hora para corregir** | `POST /anh/respuestas`; `GET /vistas/anh/respuestas`; `respuestaAnh` en `GET /vistas/anh/reporte`; capacidad `anh:enviar` | reg | E15 (el reporte) |
| 8 | **«¿Está funcionando?»** | `GET /vistas/efectividad`; `metas[].reduccionPct` en la configuración | ger y prod (Resultados) | la línea base y el libro |
| 9 | **La configuración del administrador** | `GET /vistas/configuracion/estado`; `POST /anh/conversion/importar`; `GET /vistas/anh/conversion`; `Config.conversionAnh` | adm | `POST /configuracion` (se firma con él) |

Notas:
- La pieza 9 va de última porque la pantalla de hoy arma el «3 de 6 pasos» en el front, con el borrador sin firmar. La
  vista da lo firmado.
- Las pantallas leen las pérdidas y la respuesta de la ANH dentro de otras vistas (el balance, la jornada y el reporte).
  `GET /vistas/perdidas` y `GET /vistas/anh/respuestas` son la lista completa: van con su escritura.
- Capacidades: de 9 en v1 a 16. Las 3 de la v3 son `perdidas:registrar` (oper, sup y prod), `orden:cerrar` (tec) y
  `anh:enviar` (reg). Ningún rol perdió una.

---

## 3. Lo que se relajó y lo que cambió de significado

**Se relajó una sola regla de v1:** en `POST /paradas/:evento/respuesta`, **`modo` pasa a opcional cuando llega
`parte`** (A3-1). Su backend de v1 responde `422` a una parte sin modo, y el operador no podría contestar. Hay que
adoptarla con la pieza 2.

**Cambió de significado, pero quedó compatible con su v1:**

| # | Qué | Qué hace usted |
|---|---|---|
| C1 | `Riesgo.costoFalla` (`/vistas/riesgo`) volvió a su significado de v1: lo que la bomba **ya costó** por falla (P-201B de Morichal: 2.765 bbl). Lo nuevo, lo que costaría **si fallara hoy**, va al lado en **`costoFallaHoy`** (1.235 bbl), opcional. El front pinta `costoFallaHoy` | Nada si ya construyó v1. Agregue `costoFallaHoy` (se omite cuando no aplica: nunca `0`) |
| C2 | Dispositivo sin lectura: v1 manda `valor: "—"`, lo nuevo es `null` | Nada: el front acepta los dos |
| C12 | `peticion-invalida` en las 9 escrituras de v1 | `400` o `422`, los dos valen. En las escrituras nuevas, `400` |
| R3 | `telefono` y `alertas` en `/usuarios` | Acéptelos e ignórelos, sin `422`. El front nunca manda `telefono` y manda `alertas: false` (v1 la pide) |
| R4 | `Respuesta.canal` | Puede seguir con `"pantalla"` u omitirlo: el front no lo lee |

**Hay que adoptarlos** (correcciones; no tienen versión v1): las reglas de cálculo C5–C8, los textos C9–C11 («bomba de
agua», las horas en días, `mdtFuente`), `403 rol-desconocido` en toda escritura (C13) y el motivo de a lo sumo 500
caracteres en la configuración (C16). Cada uno con su antes y después: CAMBIOS §4.2 a §4.4.

---

## 4. Cómo probar su backend contra este front

1. **Cargue los insumos** de [`referencia/insumos/`](../../referencia/insumos/): cada archivo es `{ endpoint,
   respuesta }` y trae los cinco campos del demo con el reloj del demo (2-oct-2026, 14:00, hora de Colombia).
2. **Los números, por HTTP:** `node scripts/referencia.mjs comparar --base-url=http://su-servidor:8080` (el origen, sin
   `/api`). Compara 344 casos de `referencia/`, incluidos los de la v3 (`balance/`, `perdidas/`, `jornada/`,
   `efectividad/`, `fallas/`, `configuracion/`, `sap/relojes-*-historia`, `anh/respuestas-*`, `anh/conversion-*`).
   Con sesión: `--token=…`. Los escenarios (otra configuración firmada): `--escenario=<id>`.
3. **Las escrituras rechazadas:** el mismo comando con `--escrituras` manda las 48 secuencias de
   `referencia/escrituras/` (400, 403, 404, 409 y 422 con su código, también las de la v3: `…-vio-…`, `…-cierre-…`,
   `…-perdida-…`, `…-respuesta-anh-…`, `…-conversion-…`). **Escriben:** córralas una sola vez, contra un backend
   recién cargado. Un token por rol: `--tokens=archivo.json`.
4. **Contra su línea base (v1):** `--referencia=docs/backend/linea-base/v1/referencia` compara con la referencia de v1
   tal cual. Los datos del demo cambiaron después de v1 (C18: ids, respaldos, tanques), así que use la de v1 para lo que
   ya construyó y la de hoy para lo nuevo. La regla de comparación es la de hoy: la respuesta contiene lo esperado, un
   `null` exige `null` y las claves «ausentes cuando no aplican» (`colchonH`, `techo`, `costoFallaHoy`…) no pueden
   venir (C17).
5. **El front contra su backend:** en `.env.local`, `VITE_FUENTE=http` y `VITE_API_URL=http://su-servidor:8080/api`;
   luego `npm run dev`. Las pruebas de navegador (`npm run e2e -- --project=dev`) esperan los datos del demo.

Todas las respuestas van en el sobre `{ "datos": … }` (las lecturas, además, con `refs`), y los errores con el error
único (`{ "error": { "codigo", "mensaje" } }`).

---

## 5. Qué SQL rige

- **Rige el de su v1:** [`simulador-api/esquema.sql`](../../simulador-api/esquema.sql) (la cadena de datos: 10 tablas y
  `v_procedencia`). No cambió.
- **Lo agregado está al lado:** [`sql/esquema.sql`](sql/esquema.sql) (PostgreSQL 16), el modelo de la v2, necesario
  para todo lo demás (configuración firmada, SAP, el árbol de la ANH, informes…). Lo de WhatsApp de ese archivo está
  marcado RETIRADO: no lo cree.
- **Para leer lo de v1 desde el modelo nuevo:** [`sql/v1-cadena.sql`](sql/v1-cadena.sql) crea el esquema `v1` con sus
  tablas y columnas, con los mismos nombres y en el mismo orden. Con `set search_path = v1`, lo que usted escribió lee
  igual.
- **Lo de la v3 todavía no tiene tabla** (por decidir con usted). Todo es por inserción, como `clasificacion_paso`:
  las pérdidas (una fila por versión, con `corrige`, `motivo` y `retirada`), el cierre de la orden (al lado de
  `orden_sap` y `confirmacion_sap`), las respuestas de la ANH y la tabla de conversión. Los turnos, la meta de reducción
  y la conversión firmada viajan dentro de la configuración (`version_config`, `tramo_meta`).

---

## 6. Los datos que no existen todavía (y no se inventan)

| Qué | Cómo viaja hasta que exista | La pantalla dice |
|---|---|---|
| **Las pérdidas.** Nadie las ha registrado: el demo arranca vacío | `perdido: null`, `estado: "sin-registro"`, `bbl: null`. **Nunca `0`**: que nadie la registre no prueba que no se perdió nada | «sin registro» |
| **La meta de reducción.** Nadie la ha firmado | `meta: null`, `cumple: { noPlaneado: null, fallas: null }` y la nota «Sin meta de reducción firmada» | sin meta |
| **La línea base de «antes de TRIM».** No está firmada | `base.firmada: false`; `base.fuente` dice de dónde sale (los tres meses publicados antes del arranque, jun a ago) | la base y que no está firmada |
| El horario de la jornada | sin firma rigen 06:00 y 18:00; `jornada.firmada: false` y `nota` lo dice | la nota |
| La respuesta de la ANH | sin registro, `respuestaAnh` no viene | «ANH: sin respuesta registrada» |
| La logística y el arranque del tiempo fuera | `null` mientras no haya cierres en el teléfono; lo que ninguna marca explica va en `sinDatoH` y no se reparte | «sin dato» |

Y queda por decidir: cómo viaja el cierre a SAP PM (la confirmación y el TECO), si los motivos de rechazo de la ANH son
esas palabras (NO VERIFICADO: la ANH no publica códigos) y cómo se estima el volumen de cada tipo de pérdida (lo dice la
persona, con su fuente y cómo lo estimó).

---

## 7. Ejemplos de lo nuevo más importante

Del demo (La Ceiba, 2-oct-2026, 14:00). Las lecturas salen de `referencia/`; las escrituras, de `CONTRATO.md`. Van
recortadas: `…` es lo que se omite. La respuesta viaja dentro de `{ "datos": … }`.

**El balance (pieza 1)**
```text
GET /api/vistas/balance?campos=ceiba&desde=2026-10-01T00:00:00.000-05:00&hasta=2026-10-02T14:00:00.000-05:00
→ { "total": { "producido": { "exacto": 16941, "entero": 16941 }, "diferido": { "exacto": 1046.03, "entero": 1046 },
               "perdido": null, "potencial": { "exacto": 17987.03, "entero": 17987 }, "sinExplicar": 0,
               "porTramo": [{ "tramo": "pozo", "nombre": "Pozos", "diferido": { …, "entero": 118 }, "perdido": null },
                            { "tramo": "planta", "nombre": "Planta", "diferido": { …, "entero": 573 }, "perdido": null }, … ] },
    "arbol": [{ "tramo": "planta", "diferida": { "nivel": "impacto", "bblEntero": 573, "hijos": [ planeada → N1 → N2 → paradas con "dijeron" ] },
                "perdida": null }, …],
    "frase": "La Ceiba, octubre: produjo 16.941 bbl · quedaron diferidos 1.046 bbl · perdido: sin registro." }
```
Cuadra: el diferido es el mismo de `/vistas/diferidos` y la raíz de `/vistas/choke/arbol`; potencial = producido +
diferido; **el perdido nunca se suma**.

**Las pérdidas (pieza 3)**
```text
POST /api/perdidas        (x-rol: oper)
{ "campoId": "ceiba", "tipo": "pitera", "tramo": "pozo", "donde": "Línea de flujo de LC-07",
  "inicio": "2026-10-02T09:10:00-05:00", "fin": "2026-10-02T09:40:00-05:00",
  "volumen": { "bbl": 3.5, "fuente": "estimado", "como": "Charco de 3 × 2 m, de unos 2 cm" } }
→ 200 { "perdida": { "id": "PER-ceiba-0001", "n": 1, …lo mismo, "por": "Jairo Peña · operador de campo", "porId": "oper", "rol": "oper", "hora": "…" } }
corregir (x-rol: sup): { …, "corrige": "PER-ceiba-0001", "motivo": "Se aforó el tanque: eran 5 bbl", "volumen": { "bbl": 5, "fuente": "medido", … } }
con x-rol: tec → 403 sin-capacidad        (referencia/escrituras/403-perdida-sin-capacidad.json)

GET /api/vistas/perdidas?campos=ceiba&desde=…&hasta=…      (sin registros)
→ { "estado": "sin-registro", "bbl": null, "bblEntero": null, "gasKpc": null, "porTipo": [], "porTramo": [], "filas": [],
    "texto": "Sin registro de pérdidas en el período", … }
```

**La jornada (pieza 4)**
```text
GET /api/vistas/jornada?campo=ceiba&jornada=actual
→ { "jornada": { "desde": "2026-10-02T06:00:00.000-05:00", "hasta": "2026-10-02T18:00:00.000-05:00",
                 "nombre": "De 06:00 a 18:00 del 2 de oct", "turnos": ["06:00", "18:00"], "firmada": false, "enCurso": true },
    "porConfirmar": 3, "diferido": { "exacto": 655.34, "entero": 655 }, "perdido": null,
    "paradas": [{ "pozo": "LC-21", "inicio": "2026-10-01T18:20:00-05:00", "fin": null, "cuando": "Venía del 1 de oct, 18:20 · sigue",
                  "tramo": "sin-asignar", "cadena": [ …6 pasos con quién dijo cada uno… ], "estado": "pendiente", "bblEntero": 100, … }, …],
    "frase": "La Ceiba, de 06:00 a 18:00 del 2 de oct: 3 paradas por confirmar y 655 bbl diferidos.",
    "nota": "Horario por defecto, sin firmar: cambio de turno a las 06:00 y 18:00." }
```

**«¿Está funcionando?» (pieza 8)**
```text
GET /api/vistas/efectividad?campos=ceiba
→ { "base": { "nombre": "jun a ago", "firmada": false, "fuente": "Los tres meses publicados antes de que entrara TRIM (jun a ago): …" },
    "antes": { "noPlaneadoDia": { "entero": 391 }, "fallasMes": 1 },
    "esteMes": { "mes": "2026-10", "noPlaneadoDia": { "entero": 436 }, "fallas": 1, "parcial": true },
    "meta": null, "cumple": { "noPlaneado": null, "fallas": null },
    "ganado": { "bbl": { "entero": 3934 }, "dias": 31.58, "fallasAnticipadas": 3, "intervenidas": 1, "juzgadas": 3 },
    "porTramo": [ … ], "notas": ["Sin meta de reducción firmada.", …] }
```

**El cierre de la orden (pieza 5)**
```text
POST /api/sap/ordenes/40012056/cierre        (x-rol: tec)
{ "actividad": "ajuste", "lecturas": [{ "tag": "PT-1011", "valor": 118 }],
  "inicio": "2026-10-02T10:00:00-05:00", "fin": "2026-10-02T12:30:00-05:00" }
→ 200 { "orden": { "numero": "40012056", "equipo": "K-101", "estado": "CNF", "horasReales": 2.5, "cierre": { … } },
        "cierre": { "orden": "40012056", "actividad": "ajuste", "lecturas": [{ "tag": "PT-1011", "valor": 118, "unidad": "psi" }],
                    "inicio": "…", "fin": "…", "horas": 2.5, "por": "Óscar Daza · técnico de mantenimiento", "porId": "tec", "hora": "…" } }
otra vez → 409 ya-cerrada (referencia/escrituras/409-cierre-ya-cerrada.json) · con "parte": "sello" (K-101 no tiene catálogo) → 422 parte-ajena
```

**La respuesta de la ANH (pieza 7)**
```text
POST /api/anh/respuestas        (x-rol: reg)
{ "campoId": "ceiba", "dia": "2026-10-01", "estado": "rechazado", "motivo": "V-07", "recibida": "2026-10-02T13:30:00-05:00" }
→ 200 { "respuesta": { …, "n": 1, "limiteCorreccion": "2026-10-02T14:30:00-05:00", "por": "Iván Salas · cumplimiento regulatorio", … } }

GET /api/vistas/anh/reporte?campos=ceiba&… → además
    "respuestaAnh": { "dia": "2026-10-01", "estado": "rechazado", "motivo": "V-07", "motivoTexto": "El detalle no es de su causa",
                      "limiteCorreccion": "2026-10-02T14:30:00-05:00", "quedanMin": 30, "vencida": false, … }
aceptado un día, un rechazo después del mismo día → 409 ya-aceptada (referencia/escrituras/409-respuesta-anh-ya-aceptada.json)
```

---

**Más detalle:** las tablas completas y cada cambio con su commit en [`CAMBIOS-CONTRATO.md`](CAMBIOS-CONTRATO.md); el
registro para la máquina en [`cambios-contrato.json`](cambios-contrato.json); la foto de v1 en
[`linea-base/v1.json`](linea-base/v1.json). `npm run verificar:contrato` (sección «A1») comprueba que todo lo de v1
sigue o está registrado.
