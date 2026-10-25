# 1 · Los eventos: qué manda el PLC y qué se deduce

Premisa del producto (CONTRATO.md «Premisa: cadena de custodia»): **todo evento viene de un equipo y la hora la pone el PLC**. A mano solo entran dos cosas: la configuración firmada (programa de paradas, tanques, respaldos) y la respuesta de un operario cuando ninguna señal explica una parada. La **causa** de cada evento no viaja en el insumo: la deduce el servidor con el árbol de los capítulos 2 y 3, y tiene que dar exactamente el mismo resultado que `causa-senal.ts`.

Hay cuatro familias de hechos que entran:

| Hecho | Lo manda | Endpoint de insumo | Tipo | Cantidad en el demo |
|---|---|---|---|---|
| Evento de pozo | Controlador del pozo (variador VSD de la ESP, controlador de bombeo POC, válvula de cabeza XV) | `GET /api/campos/:campo/pozos/eventos?desde&hasta` | `EventoPozo` (`pozos.ts:77`) | 1.211 (4 abiertos ahora) |
| Parada de bomba | PLC de la bomba | `GET /api/campos/:campo/bombas/:equipo/paradas?desde&hasta` | `EventoBomba` (`bombas.ts:281`) | 36 (Ceiba P-201B 11, Morichal P-201B 10, Morichal MPP-301 9, Guacamayo P-201B 6) |
| Caída de servicio | PLC/IED del servicio (subestación, compresor de aire, tratador…) | `GET /api/campos/:campo/servicios/eventos?desde&hasta` | `EventoServicio` (`pozos.ts:94`) | 30 |
| Programa de paradas | Configuración firmada (a mano, versionada) | arranque: `config.programa` | `ParadaProgramada` (`configuracion.ts:64`) | 9 entradas |

---

### Evento de pozo (`EventoPozo`)

**Qué es.** Un cambio de estado del controlador de un pozo: el pozo paró (o le bajaron la frecuencia) a una hora y volvió a producir a otra. Es la **unidad de cobro** del libro: cada barril diferido es un tramo de un evento de pozo.

**Dónde se ve.** En todas las pantallas que hablan de pozos parados: Riesgo (`#/<rol>/riesgo/…`), Turno, Causa, el panel de un pozo, la historia de un equipo. En el panel del pozo el controlador aparece como el dispositivo «Estado del controlador» con valor `parado · CMD`, `a 47 Hz` o `en marcha` (`equipo-vivo.ts:59-65`).

**Campos.**

| Campo | Significado | Unidad / formato | De dónde sale |
|---|---|---|---|
| `id` | Identificador único del evento | texto, p. ej. `EP-LC21-261001-01` | PLC / historiador |
| `campoId`, `pozo` | Campo y pozo | ids | registro |
| `inicio` | Hora en que el controlador cambió de estado | ISO 8601 **con zona** | PLC |
| `fin` | Hora en que volvió a producir; `null` = sigue abierto | ISO o `null` | PLC |
| `codigo` | Código del controlador (tabla abajo) | `CodigoControlador` | PLC |
| `senal` | Tag y texto para leer, p. ej. `POC-LC21 · código CMD` | texto | PLC |
| `hz` | Solo con `HZ`: frecuencia a la que quedó | Hz | variador |
| `respuesta` | (opcional) respuesta de un operario que vino pegada al evento | `Respuesta` | escritura de pantalla/WhatsApp |

**Códigos del controlador** (`CODIGO`, `pozos.ts:46-57`):

| Código | Texto (`CODIGO[c]`) | Qué lo emite | Qué causa sugiere (regla 4 del árbol, cap. 2) |
|---|---|---|---|
| `GF` | falla a tierra | variador de ESP | ESP · parte `aislamiento` |
| `PH` | desbalance de fases | variador de ESP | ESP · parte `aislamiento` |
| `OL` | sobrecarga | variador de ESP / POC | ESP · `bomba`; bombeo mecánico · `levantamiento` |
| `UL` | baja carga | variador de ESP / POC | ESP · `admision`; bombeo mecánico · `levantamiento` |
| `OT` | temperatura alta del motor | variador de ESP | ESP · `motor` |
| `UV` | baja tensión | cualquier controlador | `energia`, cargada al **alimentador** del pozo (`Pozo.alimentador`) |
| `PSH` | presión alta en la cabeza del pozo | cualquiera | ninguna por sí solo: se explica por un servicio o una bomba de la línea |
| `LSHH` | nivel muy alto del tanque de agua | cualquiera | ninguna por sí solo: la explica la bomba de disposición parada |
| `CMD` | parada por orden | cualquiera | ninguna por sí solo: servicio, bomba, programa, declarada o sin identificar |
| `HZ` | frecuencia reducida | variador | el pozo **sigue produciendo** pero menos (ver abajo) |

**Qué viene del PLC y qué se deduce.** Del PLC: `inicio`, `fin`, `codigo`, `senal`, `hz`. **Se deduce** (no viaja en el insumo): la causa (`Causa`), el estado actual del pozo, la fracción perdida y los barriles.

**Casos borde.**
- `fin: null` → abierto; para el cálculo el intervalo se corta en `AHORA` (`libro.ts:128`, `diferido.ts:376`).
- **Eventos que se pisan en el mismo pozo**: el servidor los normaliza para que cada hora se cobre una vez (`intervalosEfectivos`, `libro.ts:118-140`): se ordenan con los paros antes que los `HZ`, y entre iguales el que empezó primero; a cada evento se le quita lo ya cubierto por los anteriores. En el demo **no hay ningún solape** (comprobado: 0 pares que se pisen), así que la regla no cambia ningún número del demo; el backend real sí la necesita (CONTRATO.md:866-870 pide escoger entre normalizar o rechazar en la ingesta).
- Un evento de un pozo que no está en `GET …/pozos` se ignora (`libro.ts:323`).

**Quién lo calcula y por dónde viaja.** Insumo del servidor. Hacia el front viaja dentro de `Tramo.evento` (por clave en `refs.eventos`), `FilaPozo.evento`, `DetallePozo.historicos[].evento`.

**Referencia.** `src/entities/pozos.ts:44-89`; insumos del demo en `referencia/insumos/<campo>/pozos-eventos.json`.

---

### Estado del pozo ahora (`estadoAhora`)

**Qué es.** Si el pozo produce en `AHORA`, y con qué evento abierto.

**Dónde se ve.** Panel del pozo (`marcha`: `en-marcha`, `detenido`, `cerrado-por-otro`), Riesgo (pozos parados), `EstadoCampo.parados`, `caudalesAhora`.

**Regla** (`pozos.ts:167-173`):

$$
\text{abiertos} = \{ e \in \text{eventos del pozo} : e.\text{fin} = \text{null} \land e.\text{inicio} \le \text{AHORA} \}
$$

- Si hay un abierto que no es `HZ`, manda ese: `produce = false`.
- Si el único abierto es `HZ`: `produce = true`, `hz = e.hz` (produce, pero menos).
- Sin abiertos: `produce = true`.

**Ejemplo con los datos del demo.** LC-21 (La Ceiba, bombeo mecánico) tiene abierto `EP-LC21-261001-01`, `CMD` desde el 1-oct 18:20 → `produce = false`. LC-16 tiene abierto `EP-LC16-261002-78`, `LSHH` desde el 2-oct 05:43, y LC-07 `EP-LC07-261002-79`, `CMD` desde las 05:46 → `produce = false`. En La Ceiba hay 3 pozos parados de 18 (`EstadoCampo.parados = 3`); los otros 15 producen. Los 4 eventos abiertos del demo son esos tres y MN-41 (`GF` desde el 25-sep 06:40).

**Qué texto se muestra según el valor** (`equipo-vivo.ts:55-79`):

| Situación | `marcha` | `estado` | `severidad` del pozo |
|---|---|---|---|
| Parado y la causa es el propio pozo, tipo de alto impacto (ESP) | `detenido` | `detenido · <CODIGO[codigo]>` | 1 |
| Parado y la causa es el propio pozo, otro tipo (pendiente, declarada, levantamiento…) | `detenido` | `detenido · <CODIGO>` | 2 |
| Parado y la causa es otro equipo | `cerrado-por-otro` | `cerrado por <equipo>` | 0 (es consecuencia, no causa) |
| Frecuencia reducida por causa propia | `en-marcha` | `produciendo a <hz> Hz` (1 decimal máx.) | 3 |
| Produce, una parte de su ESP avisa | `en-marcha` | `produciendo` | prioridad de la parte (o 3) |
| Produce normal | `en-marcha` | `produciendo` | 0 |

Ejemplos del demo: LC-16 (y LC-07) → `cerrado-por-otro`, «cerrado por P-201B», severidad 0, lectura «Se cerró porque la bomba de reinyección estaba parada y el tanque de agua lleno. Se le carga a P-201B.»; LC-04, que cerró por la parada de septiembre y ya volvió → `en-marcha`, «produciendo»; LC-21 → `detenido`, «detenido · parada por orden», severidad 2; MN-41 → `detenido`, «detenido · falla a tierra», severidad 1.

**Referencia.** `pozos.ts:167`, `equipo-vivo.ts:25-89`.

---

### Frecuencia reducida (`HZ`) y fracción perdida

**Qué es.** Con código `HZ` el pozo no para: el variador baja la frecuencia y el pozo produce menos. Lo perdido se aproxima por la ley de afinidad (caudal ∝ frecuencia).

**Fórmula** (`perdidaPorFrecuencia`, `libro.ts:92-95`):

$$
f = \min\left(1,\ \max\left(0,\ 1 - \frac{hz}{hz_{\text{prueba}}}\right)\right)
$$

| Símbolo | Significado | Unidad | De dónde sale |
|---|---|---|---|
| $hz$ | Frecuencia a la que quedó el variador | Hz | `EventoPozo.hz` |
| $hz_{\text{prueba}}$ | Frecuencia durante la prueba vigente del pozo | Hz | `Prueba.hz` (`GET …/pozos`) |
| $f$ | Fracción del caudal que se deja de producir | 0–1 | calculado |

Si falta cualquiera de las dos frecuencias, $f = 1$ (se cobra como cerrado) y el tramo queda marcado `aproximado`. Un paro (cualquier código que no sea `HZ`) tiene $f = 1$.

**Ejemplo con los datos del demo.** `EP-MN07-260214-32`: MN-07 bajó a 47 Hz el 14-feb 23:25 (cayó el compresor C-401); su prueba se hizo a 59 Hz → $f = 1 - 47/59 = 0{,}203$: dejó de dar el 20,3 % de su crudo mientras duró.

**Casos borde.** `hz ≥ hz_prueba` → $f = 0$ (no pierde). La misma regla se usa en el libro, en `riesgoAhora` (perdiendo), en `perdiendoPor` (predicción) y en `caudalesAhora` (lo que produce = $1-f$). Lo de frecuencia reducida es **aproximado** y queda fuera de la tolerancia.

**Referencia.** `libro.ts:92`, `diferido.ts:297`, `diferido.ts:557`, `diferido.ts:689`.

---

### Parada de bomba (`EventoBomba`)

**Qué es.** Una parada (o pérdida de caudal) de una bomba de la línea, registrada por su PLC.

**Campos** (`bombas.ts:281-304`; CONTRATO.md:879-895):

| Campo | Significado | Unidad | De dónde sale |
|---|---|---|---|
| `id`, `campoId`, `equipo` | Identidad del evento y de la bomba | — | PLC |
| `inicio`, `fin` | Paro y arranque; `fin: null` = sigue parada | ISO con zona | PLC (`ZS-xxxx · marcha → paro`) |
| `perdida` | Fracción de la capacidad perdida. 1 = parada total; < 1 = siguió en marcha pero perdió caudal | 0–1 | PLC / medidor |
| `senal` | Señal que marca el evento | texto | PLC |
| `primeraAlarma` | `{ tag, texto }` de la alarma que congeló el PLC (first-out) | — | PLC |
| `firma` | `{ parte, tag?, texto }`: la parte que **las señales** señalaban en el instante de parar | — | **la decide el backend al registrar la parada** y se guarda con el evento |
| `nivelAlParar` | `{ tag, pct }`: nivel del tanque de agua en el instante de parar | % | transmisor `LT-…` |

**Qué viene del PLC y qué se deduce.** Del PLC: horas, `perdida`, `senal`, `primeraAlarma`, `nivelAlParar`. **La parte que falló nunca viene escrita a mano**: se deduce de la primera alarma (si es un disparo de esa máquina) o de la `firma`. La `firma` es una deducción del backend **congelada en el momento de parar**: no cambia cuando la parada se cierra ni cuando las lecturas vuelven a banda (CONTRATO.md:892-893). El front, si no viene, la calcula una sola vez con la primera lectura que ve de la parada **abierta** y la recuerda por id (`firmaAlParar`, `causa-senal.ts:167-178`); una parada que llega **ya cerrada y sin firma** no se reconstruye.

**Ejemplo con los datos del demo.** De las 36 paradas: 27 traen `primeraAlarma`, **ninguna trae `firma`** (el demo nunca la manda), 3 tienen `perdida < 1` (MPP-301 dos veces con 0,36, Guacamayo P-201B una con 0,43) y 27 traen `nivelAlParar`. La parada abierta de La Ceiba:

```json
{ "id": "EV-2011-1002", "campoId": "ceiba", "equipo": "P-201B",
  "inicio": "2026-10-02T03:52:18-05:00", "fin": null, "perdida": 1,
  "senal": "ZS-2011 · marcha → paro", "nivelAlParar": { "tag": "LT-2012", "pct": 78.7 } }
```

Sin `primeraAlarma` y sin `firma`. Con la bomba detenida, ninguna parte queda en estado `fuera` (todas pasan a `detenida`), así que `firmaAlParar` tampoco encuentra firma → causa «sin identificar» (cap. 3).

**Primeras alarmas que cada máquina declara** (`MAQUINAS[...].primerasAlarmas`, `bombas.ts:158-182`). Solo estos tags identifican una parte; un tag que no está aquí (o que es de otra máquina) se deja en la evidencia y no identifica nada:

| Máquina | Tag | Parte |
|---|---|---|
| P-201B (centrífuga HPS) | `LSH-2013` | sello |
| | `PSL-2010`, `PDSH-2010` | succion |
| | `TSH-2011`, `VSH-2011` | rodamientos |
| | `TSH-2014`, `ISH-2011` | motor |
| MPP-301 (doble tornillo) | `LSL-3017` | sello |
| | `PDSH-3011` | filtro |
| | `TSH-3013`, `VSH-3013` | rodamientos |
| | `TSH-3014`, `ISH-3016` | motor |
| | `TSH-3018` | lubricacion |

En el demo hay primeras alarmas que **no** son de la máquina: `PAL-1011` (aire de instrumentos, en `EV-2011-260128` de La Ceiba) y `52-SE2` (interruptor de la subestación, en `EV-3016-251216` y `EV-M2011-260828` de Morichal). Esas paradas se explican por el servicio caído (regla «servicio a ±15 min», cap. 3).

**Casos borde.** Una bomba sin perfil en ese campo (`perfilBomba` devuelve `undefined`) no se mide (`paradaMedida` devuelve `undefined`) y sus paradas no cortan el paso a ningún pozo (`bombaQueLeCorta` la salta).

**Referencia.** `bombas.ts:147-184` (máquinas), `bombas.ts:208-236` (perfiles por campo), `bombas.ts:281-332`.

---

### Caída de servicio (`EventoServicio`)

**Qué es.** La caída de un servicio o equipo de proceso que, al caer, apaga o frena pozos: aire de instrumentos (K-101), energía (pórtico SE-2), compresión (C-401), evacuación (LACT-01), separación (V-101), tratamiento (H-302).

**Campos** (`pozos.ts:94-104`): `id`, `campoId`, `equipo`, `tipo` (`aire | energia | compresion | evacuacion | proceso | tratamiento`), `inicio`, `fin` (`string | null`: **`null` = el servicio sigue caído**, y su cascada llega hasta AHORA, cap. 2; en el demo todos vienen cerrados), `tag`, `texto`.

**Ejemplo con los datos del demo.** `SV-SE-2-260828`: Morichal, SE-2, energía, 28-ago 18:08 → 29-ago 11:07, `52-SE2 · interruptor del pórtico 13,8 kV abierto`. Cerró los 41 pozos de Morichal y paró P-201B (`EV-M2011-260828`, primera alarma `52-SE2`).

**Mapeo a tipo de causa** (`SERVICIO_A_TIPO`, `causa-senal.ts:100-102`): es la identidad (`aire→aire`, `energia→energia`, …).

---

### Programa de paradas (`ParadaProgramada`)

**Qué es.** Paradas aprobadas de antemano (mantenimiento preventivo, cambio de bomba de subsuelo). Es **configuración firmada**: es una de las dos cosas que entran a mano. Es inmutable hacia atrás (una parada del pasado no se vuelve «programada» al firmar una versión nueva; `configuracion.ts:393`).

**Campos**: `id`, `campoId`, `equipo` (bomba o pozo), `desde`, `hasta`, `motivo`.

**Regla de pertenencia** (`enPrograma`, `causa-senal.ts:147-149`): un evento del equipo cae en el programa si

$$
\text{desde} \le t_{\text{inicio del evento}} \le \text{hasta}
$$

(intervalo **cerrado** en los dos extremos; solo cuenta la hora de inicio del evento).

**Ejemplo con los datos del demo.** Las 9 entradas: `PR-2011-260819` (Ceiba P-201B, 19-ago 17:49 → 20-ago 09:34), `PR-M2011-260217` (Morichal P-201B), `PR-3016-260825` (Morichal MPP-301), `PR-G2011-251202` (Guacamayo P-201B), `PR-PA03-260429`, `PR-PA05-260510` (Palmar, «Cambio programado de la bomba de subsuelo»), `PR-LC19-260123` (Ceiba LC-19) y las dos órdenes predictivas del vigía, `PR-VIG-MN16-260904-bomba` (4-sep 19:25 → 6-sep 06:03) y `PR-VIG-MN05-260912-bomba` (12-sep 09:37 → 13-sep 21:22), «Orden predictiva: el vigía anticipó la falla de bomba de fondo; cambio de la electrosumergible en ventana programada» (el cambio de bomba que el vigía anticipó entra al programa como cualquier otro; 5C). La parada `EV-2011-260819` de La Ceiba empezó a las 18:19 del 19-ago, dentro de la ventana → `programada`, y sus 3 pozos cerrados (LC-16, LC-07 y LC-14; 1.523 bbl) se cargan a «Parada programada».
