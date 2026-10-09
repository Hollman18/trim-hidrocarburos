# 2 · Árbol de atribución de un evento de pozo

Cada evento de pozo recibe **una sola causa**: el equipo al que se le cargan sus barriles, la parte (si se sabe), cómo se identificó y la evidencia. La función es `causaDeEvento(ev, ctx)` (`causa-senal.ts:259`) → `deducirEvento` (`causa-senal.ts:261-322`). El backend tiene que reproducirla **exactamente**: el resultado no puede depender del orden en que lleguen los eventos.

## 2.1 La forma de una causa (`Causa`, `causa-senal.ts:69-85`)

| Campo | Significado | Valores |
|---|---|---|
| `tipo` | Familia de la causa | `TipoCausa` (tabla abajo) |
| `equipo` | **A quién se le cargan los barriles** | id de bomba, servicio, alimentador o el propio pozo |
| `parte` | Parte del equipo que falló, si se sabe | `ParteId` (`sello`, `succion`, `rodamientos`, `hidraulica`, `motor`, `tornillos`, `filtro`, `lubricacion`, `aislamiento`, `protector`, `bomba`, `admision`) |
| `como` | Cómo se identificó | `senal` · `firma` · `programa` · `declarado` · `ninguno` |
| `evidencia` | Tags y hechos que la sostienen, en orden: **cadena de custodia**, no cambia | `string[]` |
| `porQueNo` | Siempre con `como: 'ninguno'`: por qué ninguna señal alcanzó. En la causa propia del evento es el suyo; un pozo cerrado por una bomba sin parte **hereda el de la bomba**. También es el último renglón de `evidencia`; el front lo lee de este campo | texto |
| `evento` | Id del evento que la produjo: la parada de bomba, la caída de servicio, o el propio evento de pozo | id |
| `texto` | Frase para leer | texto |
| `declarado` | La respuesta del operario, si la hubo | `Respuesta` |

**Tipos de causa** (`TIPO_CAUSA`, `causa-senal.ts:40-54`) y su casilla PRODML (`CATEGORIA_DE`, `causas.ts:54-61`):

| `tipo` | Rótulo en pantalla | Alto impacto | Categoría TRIM | `ReasonLost` de PRODML |
|---|---|---|---|---|
| `reinyeccion` | Bomba de reinyección | **sí** | superficie | topside equipment failure-maint |
| `transporte` | Bomba multifásica | no | superficie | topside equipment failure-maint |
| `electrosumergible` | Electrosumergible | **sí** | pozo | well equipment failure-maint |
| `levantamiento` | Bombeo mecánico | no | pozo | well equipment failure-maint |
| `energia` | Energía eléctrica | no | superficie | topside equipment failure-maint |
| `aire` | Aire de instrumentos | no | superficie | topside equipment failure-maint |
| `compresion` | Compresión de gas | no | superficie | topside equipment failure-maint |
| `evacuacion` | Evacuación del crudo | no | externa | 3rd party processing · unavailable tanker storage · weather problem |
| `proceso` | Separación | no | proceso | process and operation problem |
| `tratamiento` | Tratamiento de crudo | no | proceso | process and operation problem |
| `programada` | Parada programada | no | programado | planned maint turnaround · preventive maint topside |
| `declarada` | Declarada por el operario | no | — (sin casilla hasta clasificarla) | — |
| `pendiente` | Sin identificar | no | — | — |

`ALTO_IMPACTO = ['reinyeccion', 'electrosumergible']` (`causa-senal.ts:57`): es lo que decide la marca P1 en «perdiendo», el «alto impacto» del libro y la severidad del campo.

**Cómo se identificó** (`COMO`, `causa-senal.ts:61-67`): `senal` → «por señal»; `firma` → «por la firma de las señales»; `programa` → «por el programa aprobado»; `declarado` → «declarado por el operario»; `ninguno` → «sin identificar».

## 2.2 Las seis reglas, en orden

Constante: `TOLERANCIA_MS = 15 min` (`causa-senal.ts:94`). Sea $t$ = `ev.inicio` del evento de pozo.

```
1. ¿Cerró en la CASCADA de un servicio caído?  (y no hay una bomba de la línea que parara > 15 min antes del servicio)
2. ¿Una BOMBA DE LA LÍNEA parada le corta el paso en t?
3. ¿El pozo está en el PROGRAMA en t?
4. ¿El CÓDIGO del controlador dice qué falló?
5. ¿Un operario lo DECLARÓ?
6. SIN IDENTIFICAR: se pregunta.
```

Las reglas 1 y 2 se evalúan juntas al principio (`causa-senal.ts:265-269`) porque la 1 depende de la 2.

---

### Regla 1 · Servicio caído: la cascada

**Qué es.** Si un servicio (energía, aire, compresión…) cae, los pozos que cierran **uno tras otro desde su caída** son consecuencia del servicio. Lo que cierra horas después, con el servicio todavía caído, ya no es su cascada.

**Fórmula** (`cascadaDe`, `causa-senal.ts:122-140`). Para un servicio $s$ con caída $a = s.\text{inicio}$ y vuelta $b = s.\text{fin}$ (**AHORA** si el servicio sigue caído, `fin: null`):

1. Candidatos: eventos de pozo del mismo campo con $a - 15\ \text{min} \le t_i \le b$, ordenados por $t_i$.
2. Se recorren con $u_0 = a$; el evento $i$ entra si $t_i \le u_{i-1} + 15\ \text{min}$, y entonces $u_i = \max(u_{i-1}, t_i)$. **Al primer candidato que no cumple, se corta** (los siguientes tampoco entran).

Es decir: el primer cierre a lo más 15 min antes o después de la caída, y cada siguiente a lo más 15 min del anterior. El código del pozo **no importa** (un `PSH`, `UV`, `CMD` o `HZ` entran igual). La cascada depende solo de los eventos del PLC y se calcula una vez por servicio.

**Excepción: la bomba primero** (`causa-senal.ts:269`). Si además hay una bomba de la línea que le corta el paso al pozo (regla 2) y esa bomba paró **más de 15 min antes** de la caída del servicio, manda la bomba:

$$
\text{bombaPrimero} = \text{lb existe} \land \text{sv existe} \land t_{\text{bomba}} < t_{\text{servicio}} - 15\ \text{min}
$$

**Resultado.** `{ tipo: SERVICIO_A_TIPO[sv.tipo], equipo: sv.equipo, como: 'senal', evento: sv.id, evidencia: ['<tag> · <texto>', '<senal del pozo> · <hora>'], texto: <texto del servicio con mayúscula inicial> }`.

**Ejemplos con los datos del demo** (los 30 servicios se corrieron uno por uno):

| Servicio | Caída | Eventos en la ventana | En la cascada | Qué pasó con los demás |
|---|---|---|---|---|
| `SV-SE-2-260828` Morichal, energía | 28-ago 18:08 | 41 | **41** | — (cerró todo el campo) |
| `SV-K-101-260128` La Ceiba, aire | 28-ene 16:18 | 18 | **18** | — |
| `SV-SE-2-260310` Morichal, energía | 10-mar 06:40 | 36 | 32 | MN-19 `UV` a las 16:10 → fuera de cascada; cae en la regla 4 (`UV` → alimentador SE-2, `evento` = el propio evento del pozo). MN-07/18/33 `PSH` 19:13–19:16 → la multifásica MPP-301, que perdió 36 % del caudal a las 19:11 (regla 2) |
| `SV-SE-2-260502` Morichal, energía | 2-may 16:46 | 39 | 38 | MN-18 `UV` 16:46 **está** en la cascada, pero MPP-301 estaba parada desde las 12:12 (4 h 34 min antes) → **manda la bomba** (`bombaPrimero`) |
| `SV-K-101-260325` La Ceiba, aire | 25-mar 05:19 | 18 | **0** | El primer cierre fue a las 09:53, 4 h 34 min después de la caída (> 15 min) → la cascada corta en el primero. Los 18 cierres (09:53–10:44) son de P-201B, que paró a las 04:30 con primera alarma `LSH-2013` (el tanque aguantó 5,4 h) |
| `SV-C-401-260725` Morichal, compresión | 25-jul 08:07 | 15 | 11 | MN-18/33/07 `PSH` 10:30–10:32 → MPP-301 (firma de caudal); MN-03 `UL` 26-jul 04:21 → su propia ESP |

**Casos borde.**
- **Servicio todavía caído** (`fin: null`): la ventana llega hasta AHORA (`causa-senal.ts:126`). Todos los del demo vienen cerrados; en un mundo de prueba (`verificar-libro` §18) un servicio abierto en El Palmar a las 10:00 se lleva PA-01 (10:05) y PA-02 (10:15), y el riesgo lo muestra «perdiendo» con 2 pozos desde las 10:00; PA-03 (12:00) no es de su cascada.
- **Dos servicios candidatos**: si el pozo está en la cascada de dos, gana **el que cayó primero** y, si cayeron a la vez, el de **id menor** (comparación de texto por código, la misma en cualquier lenguaje; `elPrimero`, `causa-senal.ts:107-111`, usado en `servicioDeCascada`, `:144-145`). El resultado no depende del orden en que lleguen: con la lista de servicios al revés, las 1.391 causas del mundo de prueba son las mismas (ZA-01 → el que cayó primero; ZA-02, empate → `SV-PRUEBA-A`). En el demo no ocurre.

---

### Regla 2 · La bomba de la línea que le corta el paso

**Qué es.** Si en $t$ estaba parada una bomba de la línea que le sirve al pozo, el pozo cerró por ella.

**Qué bomba le sirve** (`bombaQueLeCorta`, `causa-senal.ts:244-256`). Para cada parada de bomba del campo con $t_{\text{ini}} \le t \le (t_{\text{fin}}\ \text{o}\ \text{AHORA})$ y con perfil en ese campo:

| Papel de la bomba | Le sirve al pozo si… |
|---|---|
| `transporte` (multifásica) | el pozo está en `perfil.pozos` (el clúster que pasa por ella), **con cualquier código** |
| `disposicion` (reinyección sin otra salida) | el código del pozo es `LSHH`, `CMD` o `HZ` (cerró por nivel muy alto, por orden, o se le bajó la frecuencia), **cualquier pozo del campo** |
| `recobro` | nunca (el agua tiene salida alterna) |

**Dos paradas a la vez.** Se ordenan: primero la multifásica (sin ella el pozo no fluye, haya o no tanque), después la de disposición; entre dos del mismo papel la que paró primero; empate exacto, por id. Se toma la primera. No depende del orden en que lleguen.

**Herencia de la causa** (`causa-senal.ts:273-292`). Se calcula `cb = causaDeParada(bomba)` (cap. 3):
- Si `cb.tipo` no es `reinyeccion` ni `transporte` (la bomba la paró un servicio o el programa), el pozo hereda **esa** causa tal cual (`tipo`, `equipo`, `como`, `evento`, `texto` del servicio o del programa) con la evidencia nueva.
- Si no, la causa es la de la bomba: `tipo` = `cb.tipo`, `equipo` = la bomba, `parte` = `cb.parte`, **`como` = `cb.como`** (si la parte de la bomba está sin identificar, el pozo también queda `ninguno`), `evento` = id de la parada, `declarado` = `cb.declarado`, y el texto según el caso:
  - multifásica: «La bomba multifásica que lo mueve estaba parada»;
  - disposición con `HZ`: «Se le bajó la frecuencia: la bomba de reinyección no daba abasto con el agua»;
  - disposición con `LSHH`/`CMD`: «Se cerró porque la bomba de reinyección estaba parada y el tanque de agua lleno».
- Evidencia (`causa-senal.ts:276-283`), sin renglones repetidos: `['<senal de la bomba> · <hora del paro>', <lo que identificó la causa de la bomba>, '<senal del pozo> · <hora>', <porQueNo de la bomba>]`, donde «lo que identificó» es el primer renglón de la evidencia de la bomba (el programa, la primera alarma, la firma o el servicio), o el último si fue **declarada** («Declarado por …»), o **nada** si la bomba quedó sin identificar (`como: 'ninguno'`: su primer renglón sería el mismo paro); el `porQueNo` de la bomba va de último solo si existe.
- `porQueNo`: si la bomba no tiene parte (`como: 'ninguno'`), el pozo **hereda** su `porQueNo` (`causa-senal.ts:286-287`), así toda causa `ninguno` dice por qué.

**Ejemplos con los datos del demo.**
- LC-16 (ESP, La Ceiba), `LSHH` el 2-oct 08:07, con P-201B parada desde las 03:52 → `{ tipo: 'reinyeccion', equipo: 'P-201B', como: 'ninguno', evento: 'EV-2011-1002', porQueNo: 'Sin primera alarma y sin firma: el PLC no dice qué parte falló', texto: 'Se cerró porque la bomba de reinyección estaba parada y el tanque de agua lleno' }`, evidencia `['ZS-2011 · marcha → paro · 2 de oct, 03:52', 'VSD-LC16 · código LSHH · 2 de oct, 08:07', 'Sin primera alarma y sin firma: el PLC no dice qué parte falló']`. `como` es `ninguno` porque la parada de la bomba no dejó primera alarma ni firma. (Antes de la corrección del 8-oct el paro salía dos veces y faltaba `porQueNo`; ver «Huecos», 6 y 7.) Igual LC-04 (`CMD` 08:20) y los 8 pozos de Morichal cerrados por `EV-M2011-260924` (MN-17: «ZS-2011 · marcha → paro · 24 de sept, 16:51», «VSD-MN17 · código LSHH · 25 de sept, 09:00», el porqué).
- **Dos paradas a la vez** · `EP-MN18-260503-60`: MN-18 (Morichal) `CMD` el 3-may 07:55. En ese instante estaban paradas P-201B (disposición, desde el 2-may 07:45, sello) **y** MPP-301 (multifásica del clúster de MN-18, desde el 2-may 12:12, sello). `CMD` califica para las dos; manda la multifásica → `{ tipo: 'transporte', equipo: 'MPP-301', parte: 'sello', como: 'senal', evento: 'EV-3016-260502' }`, evidencia `['ZS-3016 · marcha → paro · 2 de may, 12:12', 'Primera alarma LSL-3017 · nivel bajo del depósito de barrera del sello', 'VSD-MN18 · código CMD · 3 de may, 07:55']`.
- **Programa heredado** · los 18 pozos que cerró P-201B el 19-ago (`EV-2011-260819`, dentro de `PR-2011-260819`) quedan `programada`, `equipo: 'P-201B'`, `como: 'programa'`.
- **Servicio heredado** · cuando SE-2 paró P-201B de Morichal (`EV-M2011-260828`, primera alarma `52-SE2`), los pozos que cerraron por nivel alto se cargan a `energia / SE-2`.

**Casos borde.** Una bomba sin perfil en el campo no corta el paso. Una de `recobro` nunca. Una parada con `perdida < 1` (siguió en marcha perdiendo caudal) **sí** corta el paso (en el demo, MPP-301 el 10-mar y el 25-jul cerró MN-07/18/33 con `PSH`).

---

### Regla 3 · Programa de paradas

**Fórmula.** `enPrograma(ctx, campo, pozo, t)`: hay una entrada con `equipo === pozo` y $\text{desde} \le t \le \text{hasta}$.

**Resultado.** `{ tipo: 'programada', equipo: pozo, como: 'programa', evento: ev.id, evidencia: ['Programa <id>: <motivo>', base], texto: motivo }`.

**Ejemplo.** `EP-LC19-260123-43`: LC-19 `CMD` el 23-ene 00:06, dentro de `PR-LC19-260123` (22-ene 23:51 → 23-ene 17:50) → «Cambio programado de la bomba de subsuelo», evidencia `['Programa PR-LC19-260123: Cambio programado de la bomba de subsuelo', 'POC-LC19 · código CMD · 23 de ene, 00:06']`.

---

### Regla 4 · El código del controlador

| Levantamiento del pozo | Código | Resultado |
|---|---|---|
| electrosumergible | `GF`, `PH` | `{ tipo: 'electrosumergible', equipo: pozo, parte: 'aislamiento', como: 'senal' }`, texto «El variador disparó por falla a tierra / desbalance de fases» |
| electrosumergible | `OL` | parte `bomba`, «El variador disparó por sobrecarga» |
| electrosumergible | `UL` | parte `admision`, «… por baja carga» |
| electrosumergible | `OT` | parte `motor`, «… por temperatura alta del motor» |
| bombeo mecánico | `OL`, `UL` | `{ tipo: 'levantamiento', equipo: pozo, como: 'senal' }` **sin parte**, «El controlador de bombeo paró por sobrecarga / baja carga» |
| cualquiera | `UV` | `{ tipo: 'energia', equipo: <alimentador del pozo>, como: 'senal' }`, «Baja tensión en el alimentador del pozo» |

`evento` = el propio evento de pozo; `evidencia` = `['<senal> · <hora>']`.

**Ejemplos con los datos del demo.** `EP-LC05-251024-66` LC-05 `GF` → ESP/aislamiento (24-oct-2025 → 5-nov, 296 h: falla); `EP-MN38-251001-82` MN-38 `UL` → ESP/admision; `EP-PA06-251231-39` PA-06 (bombeo mecánico) `OL` → levantamiento; `EP-MN19-260310-31` MN-19 `UV` → energía cargada a SE-2 (su alimentador), evento el propio del pozo.

**Casos borde.** Un `UV` en una ESP no es falla de la ESP: va a energía. Un `OT` en bombeo mecánico no tiene regla (cae a 5 o 6). En la ESP, `parte` se asigna aunque el evento dure minutos: si fue falla o disparo lo decide la historia (< 24 h = disparo, cap. 3).

---

### Regla 5 · Declarada por el operario

**Fórmula.** `r = ev.respuesta ?? ctx.respuestas[ev.id]` (`respuestaDe`, `causa-senal.ts:151`; la respuesta pegada al evento gana sobre la de la sesión).
- Si `r.parte` existe y el pozo es ESP → `{ tipo: 'electrosumergible', equipo: pozo, parte: r.parte, como: 'declarado', declarado: r }` (es falla de alto impacto con su parte).
- Si no → `{ tipo: 'declarada', equipo: pozo, como: 'declarado', declarado: r, texto: r.texto }`.
- Evidencia: `[base, 'Declarado por <r.por> · <hora de r>']`.

**Ejemplo.** `EP-MN22-260930-03`: MN-22 `CMD` 30-sep 16:20 → 1-oct 06:05; Jairo Peña (operador de campo) respondió a las 17:02: «Fuga en la línea de flujo del pozo: se cerró para repararla» → `declarada`. En el demo hay 9 declaradas (6 en Zarza, 1 en Palmar, 1 en La Ceiba, 1 en Morichal).

---

### Regla 6 · Sin identificar

**Resultado.** `{ tipo: 'pendiente', equipo: pozo, como: 'ninguno', evento: ev.id, porQueNo: 'Ningún servicio caído, ninguna bomba de la línea parada, fuera del programa y sin código de falla', evidencia: [base, porQueNo], texto: 'Ninguna señal explica por qué paró: hay que identificarlo' }`.

**Ejemplos con los datos del demo.** `EP-LC21-261001-01` (LC-21 `CMD` desde el 1-oct 18:20, abierto: «no arrancar») y `EP-LC08-261001-02` (LC-08 `CMD` 1-oct 22:15 → 2-oct 01:10: arrancó sin respuesta → **no conformidad**, cap. 3).

---

## 2.3 Distribución en el demo

De los 1.349 eventos de pozo, por (campo, levantamiento, código) → (tipo, cómo). Sirve como prueba de regresión del árbol:

| Campo | Levantamiento | Código | → tipo / cómo | n |
|---|---|---|---|---|
| ceiba | ESP | CMD | reinyeccion / senal | 114 |
| ceiba | ESP | CMD | reinyeccion / ninguno | 14 |
| ceiba | ESP | CMD | programada / programa | 14 |
| ceiba | ESP | CMD | declarada / declarado | 1 |
| ceiba | ESP | CMD | pendiente / ninguno | 1 |
| ceiba | ESP | LSHH | reinyeccion / senal · ninguno · programada | 6 · 1 · 1 |
| ceiba | ESP | PSH | aire / senal · tratamiento / senal | 75 · 30 |
| ceiba | ESP | GF · PH · OL · UL · OT | electrosumergible / senal | 4 · 7 · 30 · 65 · 6 |
| ceiba | ESP | UV | energia / senal | 28 |
| ceiba | bombeo mecánico | CMD | reinyeccion / senal · ninguno · programada · pendiente | 22 · 2 · 4 · 1 |
| ceiba | bombeo mecánico | LSHH | reinyeccion / senal | 2 |
| ceiba | bombeo mecánico | PSH | aire · tratamiento | 15 · 6 |
| morichal | ESP | UV | energia / senal · transporte / senal | 288 · 1 |
| morichal | ESP | UL · OL · PH · OT · GF | electrosumergible / senal | 150 · 72 · 36 · 16 · 3 |
| morichal | ESP | HZ | compresion / senal | 32 |
| morichal | ESP | CMD | reinyeccion / senal · ninguno · transporte · declarada | 20 · 7 · 1 · 1 |
| morichal | ESP | LSHH | reinyeccion / senal · ninguno | 4 · 1 |
| morichal | ESP | PSH | transporte / senal · transporte / firma · programada | 14 · 6 · 3 |
| guacamayo | ESP | UL · OL · PH · OT · GF | electrosumergible / senal | 61 · 25 · 11 · 8 · 4 |
| guacamayo | ESP | HZ | evacuacion / senal | 29 |
| guacamayo | ESP | UV | energia / senal | 21 |
| palmar | bombeo mecánico | PSH · OL · CMD | proceso · levantamiento · programada (2) / declarada (1) | 28 · 4 · 3 |
| zarza | flujo natural | CMD | compresion · energia · declarada | 27 · 18 · 6 |

Nota: en el demo no hay ningún `HZ` explicado por la bomba de reinyección (los `HZ` de Morichal y Guacamayo son de compresión y evacuación); la frase «Se le bajó la frecuencia: la bomba de reinyección no daba abasto con el agua» existe en el código pero ningún dato del demo la ejercita.

## 2.4 Memo y contexto

La causa se memoriza por **contexto** = (configuración firmada vigente, respuestas de la sesión) (`MEMO`, `MEMO_POZO`, `causa-senal.ts:183-193`). Para el backend: la causa de un evento cambia cuando (a) se firma una versión de configuración que cambia el programa, los perfiles o los respaldos, o (b) llega una respuesta de operario. Hay que recalcular (o invalidar caché) en esos dos momentos, y en ninguno más.

## 2.5 Qué se muestra

| Dónde | Qué de la causa |
|---|---|
| Riesgo y Turno, fila «perdiendo» | `equipo` en negrita, chip con `TIPO_CAUSA[tipo]` en minúscula (fuerte si es alto impacto), parte en minúscula, globo con `texto` |
| Turno, «Paradas nuevas» | chip con `COMO[como]`, o «parte por identificar» si lo cerró otro equipo y `como = 'ninguno'` (`Turno.tsx:157`) |
| Panel del pozo | `lectura` = `«<texto>. Se le carga a <equipo>.»` (`equipo-vivo.ts:85`) |
| Detalle de una parada de bomba | «POR QUÉ PARÓ · <COMO en mayúsculas>», `texto`, y la lista `evidencia` en monoespaciada (`Detalle.tsx:435-443`) |
| Historia del equipo (panel, ingeniería) | `<Parte> · <COMO>` o el texto si tiene ≤ 6 palabras (`PanelEquipo.tsx:279-281`) |

**Referencia.** `src/entities/causa-senal.ts:1-322`; `CONTRATO.md:1001-1041`; los libros de `referencia/diferidos/*.json` traen la causa de cada tramo.
