# 6B.5 Turno — supervisor, operador

**Para qué.** «Lo que recibe y lo que entrega.» (`PARA_QUE.turno`, `src/widgets/Onboarding.tsx:21`).

**Ruta.** `#/<rol>/turno/<campo>[~portafolio]/<período>`. **El período de la cabecera no aplica**: el turno son siempre las **12 horas que terminan en AHORA** (`TURNO_H = 12`, rotación 7×7 sobre una operación 24/7, `src/pages/Turno.tsx:23`). En el demo, del 2-oct 02:00 al 2-oct 14:00.

**Roles y nivel.** `sup`, `oper` → `operacion`. Las dos pantallas son idénticas salvo el botón «Exportar» de la cabecera (el operador no tiene `evidencia:exportar`).

**Lee.** La pantalla no pide nada propio: combina cuatro respuestas y **el front hace las cuentas** (5B §6). El servidor tiene que devolver esos insumos idénticos.

| Endpoint | Para qué |
|---|---|
| `GET /api/vistas/riesgo?campos` → `Riesgo[]` | «perdiéndose ahora», «se pierden · turno que entra», «PASANDO AHORA», «PARA VIGILAR» (5B §5) |
| `GET /api/vistas/diferidos?campos&desde=AHORA−12h&hasta=AHORA` → `Libro` | «diferidos · 12 h», «PARADAS NUEVAS» (`tramos`) |
| `GET /api/vistas/paradas/por-identificar?campos` → `Pregunta[]` | «por identificar», «POR IDENTIFICAR», el estado de cada hilo de WhatsApp |
| `GET /api/mensajes?campos` → `Mensaje[]` | «WHATSAPP DEL TURNO» (5D §5) |
| `GET /api/usuarios` (al arrancar) | nombres de quienes recibieron cada mensaje |

![Turno · supervisor · La Ceiba](../img/sup-turno-ceiba.png)

| # | Lo que se ve | En la captura | Cómo se calcula | Texto según el valor | Viene de |
|---|---|---|---|---|---|
| 1 | Turno que entra | **5.680** bbl | $\left(\sum_{\text{perdiendo}} \text{bblDia}\right)\cdot 12/24 = 11.359{,}7 \times 0{,}5 = 5.679{,}9$ (5B §6 «Se pierden en el turno que entra») | `n0` + «bbl»; globo «Turno que entra: Lo que se pierde ahora, sostenido las 12 horas del turno.» con «Perdiéndose ahora 11.360 bbl/d» y «Turno 12 h» (`Turno.tsx:197-202`) | `Riesgo[estado=perdiendo].bblDia` |
| 2 | Rótulos | «se pierden · turno que entra» / «si nada cambia» | fijos | — | — |
| 3 | Perdiéndose ahora | ◆ **11.360** bbl/d | $\sum$ `bblDia` de las filas «perdiendo»: P-201B 11.058,9 + LC-21 300,8 | ◆ si alguna fila es de alto impacto; ▲ si ninguna; sin filas, sin marca y «0» (`Turno.tsx:203-209`) | `Riesgo.bblDia`, `altoImpacto` |
| 4 | Pozos parados | «18 pozos parados» | $\sum$ `pozos` de esas filas (17 + 1) | `plural(n,'pozo parado','pozos parados')` | `Riesgo.pozos` |
| 5 | Por identificar | ▲ **3** «por identificar» | preguntas con `pide` de **toda la historia** del campo (P-201B, LC-08, LC-21) | ▲ P2 si alguna sigue sin arrancar (`!fin`) (`Turno.tsx:210-214`) | `Pregunta.pide/fin` |
| 6 | Sin arrancar | «2 sin arrancar» | preguntas con `pide` y sin `fin` (P-201B, LC-21) | «N sin arrancar» (sin `plural`) | `Pregunta.fin` |
| 7 | Diferidos | **2.721** bbl | `Libro.diferido` del libro de las 12 h: 2.720,7 bbl (los 17 pozos de P-201B desde las 08:07, 2.570, más 12 h de LC-21) (5B §6 «Diferidos · 12 h») | `n0` | `Libro.diferido` |
| 8 | Rótulo | «diferidos · 12 h» | `TURNO_H` | — | — |
| 9 | «PASANDO AHORA» | «2 causas» | filas «perdiendo» | `plural(n,'causa','causas')`; sin filas «nada parado» y «Todos los pozos produciendo.» | `Riesgo[]` |
| 10 | Una causa | ◆ **P-201B** chip «bomba de reinyección» | fila de riesgo: equipo (+ campo en portafolio), chip `TIPO_CAUSA[tipo]` en minúscula (fuerte si alto impacto), la parte si la hay | marca ◆ si alto impacto, ▲ si no | `Riesgo.equipo/tipo/parte/altoImpacto` |
| 11 | Debajo | «17 pozos · desde 2 de oct, 03:52» | `plural(pozos,'pozo','pozos')` · `desde` | — | `Riesgo.pozos/desde` |
| 12 | Por día | **11.059** bbl/d | `n0(bblDia)` | globo (y papel): «Pozos parados 17», «Perdiéndose 11.059 bbl/d», «**En el turno 5.529 bbl**» ($n_0(\text{bblDia}\cdot 12/24)$), «Desde 2 de oct, 03:52», «Pozos cerrados desde 2 de oct, 08:07» (solo si difiere más de 1 min); pista = `motivo` | `Riesgo.bblDia/cierreDesde/motivo` |
| 13 | Otra causa | ▲ LC-21 chip «sin identificar» · «1 pozo · desde 1 de oct, 18:20» · 301 | `pendiente` no es de alto impacto → ▲ | — | — |
| 14 | «POR IDENTIFICAR» | ▲ P-201B · 2 de oct, 03:52 · chip **«no arrancar»** | una fila por pregunta que pide: equipo (+ campo) · `fechaHora(inicio)`; ▲ si sigue sin arrancar | chip fuerte «no arrancar» (`!fin`) o neutro «arrancó sin identificar»; esas filas nunca quedan detrás de «ver más» (`Turno.tsx:86-87, 117-125`). Aserción `rutas.ts:71`: «no arrancar» presente | `Pregunta[]` |
| 15 | No conformidad | ■ LC-08 · 1 de oct, 22:15 · «arrancó sin identificar» | arrancó sin que nadie respondiera (5B §3.2) | ■ P3 | `Pregunta.fin` |
| 16 | Botón | «Identificar antes de entregar →» | con la pantalla `causa` en el rol y al menos una pregunta | sin el permiso: «Lo responde quien estuvo en el equipo.»; sin preguntas: «Todas las paradas tienen causa.» | — |
| 17 | «PARA VIGILAR» | «1 equipo» | filas «en riesgo», lo ya fuera primero y luego por horas (5B §5.3, §6) | `plural(n,'equipo','equipos')`; sin filas «Ninguna parte va hacia su límite.» | `Riesgo[estado=en-riesgo]` |
| 18 | Cuándo | ◆ K-101 · «**ya fuera**» | `horas` ausente → «ya fuera»; si no, `fmtHoras(horas)` | marca: la prioridad de la fila, **subida al menos a ▲ P2 si cruza dentro del turno** (`horas < 12`, `Turno.tsx:84`); K-101 es ◆ (prioridad 1, sin horas) | `Riesgo.horas/prioridad` |
| 19 | Si falla | «0 bbl/d» | `n0(bblDia)`: en La Ceiba no produce ningún pozo, K-101 no pone nada en juego hoy (5B §5.3 b) | debajo, la parte + chip de estado, o el chip del tipo («aire de instrumentos») si no tiene parte; globo «Parte», «Cruza su límite», «Si falla», pista = `motivo` | `Riesgo.bblDia/parte/estadoParte/tipo` |
| 20 | «PARADAS NUEVAS» | «12 h · 1 causa» | eventos que **empezaron** en el turno, agrupados por causa (5B §6 «Paradas nuevas») | `plural(n,'causa','causas')`; sin ninguna «Ningún pozo paró.» | `Libro.tramos` |
| 21 | Un grupo | «**17 pozos cerrados** por **P-201B**» | grupo con más de un pozo | un solo pozo: «**HH:MM** · **<pozo>**» (+ « · por <equipo>») | `tramos[].causa.evento` |
| 22 | Horas | «· 08:07–08:52» | primer y último cierre del grupo, solo la hora | — | `tramos[].evento.inicio` |
| 23 | Cómo | chip «parte por identificar» | lo cerró otro equipo y `como = ninguno` → «parte por identificar»; si no, `COMO[como]` («por señal», …). Aserción `rutas.ts:71`: «parte por identificar» sí, «(sin identificar)» no | — | `causa.como`, `causa.equipo` |
| 24 | Barriles | «2.570 bbl · sigue» | Σ bbl del grupo en el libro de 12 h; « · sigue» si algún tramo sigue abierto | globo: «Lo cerró <equipo>», «Barriles», «Cómo se identificó»; pista = causa | `tramos[].bbl/abierto` |
| 25 | «WHATSAPP DEL TURNO» | «8 mensajes» | mensajes con `hora ≥ AHORA − 12 h` que **sí** salieron | `plural(n,'mensaje','mensajes')` + « · N sin enviar» si los hay | `Mensaje[]` |
| 26 | Un hilo | «P-201B · 03:53 parado → 03:53 pregunta → 04:22 recordatorio → 05:52 escalado → 08:08 pozos cerrándose» | un hilo por evento (o por orden, o por regla y equipo); cada paso con su hora y `PASO_CORTO` (`src/entities/mensajes.ts:53-56`: «parado», «pozos cerrándose», «pregunta», «aviso del vigía», «orden liberada en SAP», «recordatorio», «escalado»), ordenados por hora y por `ORDEN_PASO` (`mensajes.ts:152-154`); los hilos, del más reciente al más viejo | globo (y papel): una fila por paso, «HH:MM <paso>» → a quién llegó («Nelson Ortiz, Jairo Peña»); lo que no salió va en la fila: « · ◌ no se envió a <persona>: <motivo>» (`NoEnviado`) | `Mensaje.hora/regla/insistencia/para/noEnviado/evento` |
| 28 | Tercera pregunta y contador | ▲ «LC-21 · 1 de oct, 18:20» · chip «no arrancar»; extra del panel «3» | la de LC-21 sigue sin arrancar (P2: su causa no es de alto impacto); el extra es cuántas preguntas piden (las mismas tres de la fila 5). Orden de las filas: las del servidor (P-201B, LC-08, LC-21) | igual que las filas 14-15 | `Pregunta[]` |
| 29 | Otro hilo | «K-101 · 09:11 orden liberada en SAP» (sin chip de estado) | el hilo de la orden 40012053 de K-101 (regla «orden liberada en SAP», 5D §5); va primero porque su último paso (09:11) es más reciente que el de P-201B (08:08); un hilo sin evento no lleva estado (fila 27) | fila 26 | `Mensaje[]` con `regla = orden` |
| 27 | Estado del hilo | chip fuerte «sin respuesta» | de la pregunta del evento del hilo: sin respuesta → chip; con respuesta → «respondió <por>[ por WhatsApp]: «<texto>»»; un hilo sin evento (la orden de K-101) no lleva estado | — | `Pregunta.causa.declarado` |

Los cinco paneles muestran cinco filas y «ver N más»; lo escondido sale en el papel. Las aserciones del auditor para `#/sup/turno/ceiba/curso` (`rutas.ts:71`) exigen «pozos cerrados por P-201B», «WHATSAPP DEL TURNO», «escalado», «no arrancar», «parte por identificar» y prohíben «(sin identificar)», «preguntarle al operario» y «LO QUE TRIM MANDÓ».

### Operador

![Turno · operador · La Ceiba](../img/oper-turno-ceiba.png)

| # | Lo que se ve | En la captura | Regla |
|---|---|---|---|
| 1 | Turno que entra | **5.680** bbl | las mismas cifras: nada del turno depende del nivel |
| 2 | Botón | «Identificar antes de entregar →» | el operador también tiene la pantalla `causa`. La única diferencia con el supervisor es que la cabecera no ofrece «Exportar» |

### Portafolio y estados

- **Portafolio** (`~portafolio`): a cada equipo se le agrega « · <campo>»; las cifras suman los campos del ámbito. Valores del portafolio del demo en 5B §6 (6.609 bbl; 13.217 bbl/d · 21 pozos; 4 por identificar · 2 sin arrancar; 3.661 bbl; 2 causas nuevas: P-201B La Ceiba y MN-25).
- **Sin nada parado**: «0» sin marca, «nada parado», «Todos los pozos produciendo.».
- **Un mensaje que no salió** (`noEnviado`): no cuenta en «N mensajes», se dice « · N sin enviar» en el encabezado y en la fila del paso con su motivo (5D §5 «Mensajes no enviados»).

### Interacciones

Clic en una fila de «PASANDO AHORA» o «PARA VIGILAR»: ficha del equipo (6B.4). «Identificar antes de entregar»: pantalla de causa. Globos de cada fila (escritos en el papel). «ver N más».
