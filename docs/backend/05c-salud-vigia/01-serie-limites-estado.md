# 5C.1 · La serie de un tag, sus límites y el estado de un instrumento

Este es el piso de todo el capítulo: el vigía (5C.2) y la salud por parte (5C.3) solo leen tres
cosas de cada instrumento: **la serie del historiador**, **el límite del tag** (banda normal y
alarma) y **el estado que reporta el sistema de alarmas**. Si una de las tres llega mal, todo lo
que sigue sale mal; por eso el contrato las revisa al entrar.

Términos que se usan en todo el capítulo:

| Término | Qué es |
|---|---|
| Tag | Identificador del instrumento en el PLC o el historiador (ISA-5.1): `PI-2010` = indicador de presión del lazo 2010. Es único dentro de un campo. |
| Historiador | La base de series de tiempo del sistema de control (PI, Canary, etc.). TRIM le pide la serie de cada tag. |
| Banda normal | El rango en que la variable debe estar en operación normal. La declara el instrumento al conectarse (DBIRTH de Sparkplug B). |
| Alarma | El punto de la base maestra de alarmas (ISA-18.2) de la máquina: el valor contra el que el vigía proyecta el cruce. |
| Prioridad ISA-18.2 | 1 alarma (◆ rojo), 2 atención (▲ naranja), 3 aviso (■ amarillo), 0 normal (gris). En el código, `Severidad = 0 \| 1 \| 2 \| 3` (`src/entities/tipos.ts:5`). |

---

### Serie de un tag (`SerieTag`)

**Qué es.** Las lecturas de un tag a paso fijo: el instante del primer valor, el paso en horas y
la lista de valores, con `null` en cada hueco del historiador.

**Dónde se ve.** No tiene pantalla propia. Alimenta: la recta del vigía (panel VIGÍA del detalle
de una bomba, `#/conf/bombas/morichal/curso` → abrir P-201B), el dibujo `Proyeccion` dentro de
cada parte que avisa (`BloqueParte`), los decimales de cada indicador analógico, y el texto
«12 lecturas, una por día» (`lecturasDe`).

**Forma (contrato).**

```json
{ "desde": "2026-09-21T14:00:00.000-05:00", "pasoH": 24,
  "valores": [14.2, 13.9, 13.5, 13.0, 12.6, 12.1, 11.5, 11.0, 10.4, 9.9, 9.3, 8.8] }
```

Viaja por `GET /api/campos/:campo/tags/:tag/serie?desde=&paso=` y, con la misma forma, dentro de
`serie` de cada señal en `GET /api/vistas/bombas` (`senales[]`, y las `Senal` de `partes[]`), de
`GET /api/vistas/pozos/:campo/:pozo` (`senales[]`), y de cada dispositivo en
`/vistas/equipos…` y `registroEquipos`. Tipo `SerieTag` en `src/entities/tipos.ts:9-20`.

**Fórmula.** El instante del valor $i$ es:

$$
t_i = t_{\text{desde}} + i \cdot \text{pasoH}\ \text{horas}, \qquad i = 0, 1, \dots, N-1
$$

| Símbolo | Significado | Unidad | De dónde sale |
|---|---|---|---|
| $t_{\text{desde}}$ | instante del primer valor, ISO 8601 **con zona** | fecha | `desde` |
| $\text{pasoH}$ | paso de la serie | h | `pasoH` (lo escoge el servidor; el pedido trae `paso=1h`, `1d`…) |
| $N$ | largo de la lista, contando huecos | – | `valores.length` |
| $v_i$ | valor $i$, o `null` si el historiador no tiene dato | unidad del tag | `valores[i]` |

El «ahora» de la serie es su último lugar: $t_{\text{fin}} = t_{\text{desde}} + (N-1)\cdot\text{pasoH}$,
**aunque ese último valor sea `null`**. El vigía cuenta las horas para cruzar desde ahí
(`finH` en `src/entities/vigia.ts:58`).

**Ejemplo con los datos del demo.** Las lecturas del demo se escriben como doce valores diarios
que terminan en el «ahora» del demo y se convierten con `serieHasta(valores, 24)`
(`src/entities/serie.ts:20-22`, `src/entities/equipos.ts:10-11`, `src/entities/esp.ts:51`):

- `AHORA = 2026-10-02T14:00-05:00`; $N = 12$; $\text{pasoH} = 24$.
- $t_{\text{desde}} = \text{AHORA} - (12-1)\cdot 24\ \text{h} = $ `2026-09-21T14:00:00.000-05:00` (lo que da el motor para PI-2010 de P-201B en Morichal).
- $t_{\text{fin}} = (12-1)\cdot 24 = 264$ h después de `desde` = AHORA.

`lecturasDe` (`src/entities/serie.ts:56-59`) dice cuántas lecturas tiene y a qué paso:
para PI-2010 devuelve **«12 lecturas, una por día»**; con dos huecos
(`[14.2, 13.9, null, 13.0, 12.6, null, …]`) devuelve **«10 lecturas, una por día · 2 sin dato»**.
El paso se nombra así: 24 → «por día»; 1 → «por hora»; < 1 → «cada N min» (redondeado);
otro → «cada N h» con formato es-CO.

**Casos borde.**

| Caso | Qué pasa |
|---|---|
| Hueco del historiador | Va `null` **en su lugar**. Saltarlo comprime el eje del tiempo y cambia la pendiente. En el ajuste, el punto se omite sin mover a los demás; en el dibujo, la línea se corta (`trazoConHuecos`). |
| Serie sin `pasoH`, con `pasoH ≤ 0` o no finito | Se rechaza al entrar (`ErrorDeContrato`) con `pasoH: se esperaba un número de horas mayor que cero y llegó 0` (`faltaEnSerie`, `src/entities/serie.ts:40-49`). Si llegara al vigía, `tendencia()` lanza error: nunca se ajusta con un paso supuesto. |
| `desde` sin zona | Se rechaza: `desde: se esperaba una fecha ISO 8601 con zona y llegó "2026-09-21T14:00"`. Regex `CON_ZONA` exige `Z` o `±hh:mm`. |
| Un valor que no es número ni `null` | Se rechaza: `valores[1]: se esperaba un número o null (hueco) y llegó "x"`. |
| Último valor `null` | `ultimaLectura` devuelve el último con dato (`src/entities/serie.ts:29-33`); las horas para cruzar se siguen contando desde el último **lugar**. |
| Serie sin ningún dato | `ultimaLectura` → `undefined`; `conLectura` → `[]`; el vigía no ajusta («Faltan puntos…», ver 5C.2). |
| Variable discreta (interruptor `LSH-2013`) | No lleva serie: solo estado. |

**Qué texto se muestra.** Solo `lecturasDe` (arriba) y los decimales: `decimalesDe(serie, valor)`
(`src/shared/lib/formato.ts:66-73`) toma el máximo de decimales que traen los valores de la serie
y el valor actual, entre 0 y 3, ignorando los `null` (ISA-101, Tabla 7: la resolución del dato).
PI-2010 → 1 decimal («8,8 psi»); FI-2011 → 0 decimales («21.500 bbl/d»).

**Quién lo calcula y por dónde viaja.** El servidor la lee del historiador y la entrega tal cual;
el front solo la valida (`faltaEnSerie` en el códec de `src/shared/api/contrato.ts:138`).

**Referencia.** `src/entities/serie.ts`; `src/entities/tipos.ts:9-20`; CONTRATO.md «Demás lecturas».
`scripts/verificar-libro.mjs:819-829` comprueba que el vigía lee el paso (la misma rampa cruza en 4 h
por hora y en 96 h por día), que dos huecos no mueven el eje y que `pasoH: 0` se rechaza. En
`referencia/`: las series viajan dentro de `referencia/salud/bombas-<campo>-2026-09.json`
(`/api/vistas/bombas`) y las de la ESP en `referencia/insumos/<campo>/electrosumergibles.json`.

---

### Cadencia del instrumento vs paso de la serie

**Qué es.** Dos cosas distintas. La **cadencia** es cada cuánto el instrumento publica (`cadenciaS`
en el registro de la cadena: 47 s, 5 s, 1 s). El **paso** es la resolución a la que el servidor
resume la serie que entrega (`pasoH`).

**Dónde se ve.** La cadencia sale en el `sub` de cada indicador del detalle de bomba:
`PI-2010 · PI · 47 s`, `PT-3011 · PLC · 1 s`, `SI-3016 · variador · 1 s` (el texto `origen` del
dispositivo). El paso no se escribe en pantalla salvo en `lecturasDe`.

**Regla.** El vigía usa **solo** `pasoH` para poner cada punto en el tiempo. Ejemplo real de por
qué importa: la misma lista de PI-2010 leída como serie **por hora** (`pasoH = 1`) cruza en
**1,8 h**, no en 43 h (motor: `pronostico` → `{ cruza, horas: 1,795, rango: [1,722; 1,875] }`).
Si el servidor resume a otro paso, tiene que decirlo en `pasoH`.

**Casos borde.** El demo entrega todas las series a 24 h aunque la cadencia del instrumento sea de
1 s. En producción el servidor escoge el paso (recomendado: 1 h para el vigía, que necesita al
menos 4 puntos con lectura; ver 5C.2) y lo declara.

**Quién lo calcula.** Servidor (resumen del historiador). La agregación (promedio, último valor,
mediana del intervalo) **no está definida en el contrato**: ver «Huecos y dudas».

---

### Límite de cada tag (`LimiteTag`)

**Qué es.** La única fuente de la banda normal y de la alarma de un tag. El vigía proyecta contra
la alarma; la salud y el indicador analógico leen las dos. Antes eran tres fuentes y VI-2011 llegó
a decir 3,9 en el panel y 4,5 en la procedencia (`src/entities/limites.ts:1-17`).

**Dónde se ve.**
- Indicador analógico (placa de bomba, panel VARIABLES, panel FUERA DE BANDA, señales del pozo):
  la raya gris clara es la banda normal, las marcas verticales son las alarmas; con `detalle`, el
  pie dice `normal > 10,0` / `normal < 3,9` / `normal 180 – 240` y `alarma 8,0`.
- Panel VIGÍA: «Llega a **8 psi** en 43 h · 41–45 h» o «Límite **3,9 mm/s** · sin fecha».
- Dibujo `Proyeccion`: la raya discontinua «límite · 8 psi».
- `GET …/tags/:tag/procedencia` → `instrumento.limite` cita la misma banda.

**Forma (contrato).** En `GET /api/catalogo` → `campos[campo].limites[tag]`:

```json
"PI-2010": { "tag": "PI-2010", "equipo": "P-201B", "texto": "> 10",
             "normal": [10, null],
             "alarma": { "baja": 8, "fuente": "Hoja de datos del fabricante: NPSH requerido más margen" },
             "firma": { "normal": "Registro de tags: la declara el instrumento al conectarse (DBIRTH) y la aprueba ingeniería del cliente",
                        "alarma": "Base maestra de alarmas (ISA-18.2): la firma ingeniería de confiabilidad del cliente" } }
```

En el motor, el lado abierto es `±Infinity`; en el cable va `null` (`bandaAbierta` del códec).

**Fórmula (cómo se arma).**

| Campo | Regla | De dónde sale | Quién lo firma |
|---|---|---|---|
| `texto` | lo que declara el instrumento: `"> 10"`, `"< 3,9"`, `"180 – 240"`, `"—"` | registro de tags (DBIRTH: `limite`, `bajo`, `alto`), versionado en `historial_tag` | ingeniería del cliente |
| `normal` | `banda(texto)` (`src/shared/lib/formato.ts:49-62`): «a – b» → `[a, b]`; «< b» → `[-∞, b]`; «> a» → `[a, +∞]`; otra cosa → sin banda | lo mismo | ídem |
| `alarma` | `{ alta?, baja?, fuente }` de la **base maestra de alarmas de la máquina** (`ALARMAS`, `src/entities/limites.ts:53-68`) | norma u hoja de datos | ingeniería de confiabilidad |
| `firma` | textos fijos `FIRMA_NORMAL` y `FIRMA_ALARMA` | – | – |

Las alarmas que el demo declara (son de la **máquina**, rigen en cada campo donde está instalada):

| Máquina | Tag | Alarma | Fuente |
|---|---|---|---|
| P-201B | VI-2011 | alta 3,9 mm/s | API 610, Tabla 8 (3,0 región preferida; 3,9 permitida) |
| P-201B | PI-2010 | baja 8 psi | Hoja de datos: NPSH requerido más margen |
| P-201B | TI-2011 | alta 85 °C | Hoja de datos |
| P-201B | LT-2012 | baja 15 % | Hoja de datos: nivel mínimo de succión |
| MPP-301 | VT-3013 | alta 5,5 mm/s | API 676, 4.ª ed. 2022, 6.11.2 |
| MPP-301 | PDT-3011 | alta 12 psi | Hoja de datos · API 676 B.2.1.4 |
| MPP-301 | LT-3017 | baja 50 % | Hoja de datos del sistema de sello (API 682) |
| MPP-301 | SI-3016 | alta 1.650 rpm | Velocidad máxima continua (API 676 Anexo A) |
| MPP-301 | TE-3013 | alta 85 °C | Hoja de datos |
| MPP-301 | TE-3012 | alta 90 °C | Hoja de datos |

En Morichal el motor arma 46 tags con límite y 10 con alarma (los de la tabla). Un tag sin
alarma (PDI-2011, FI-2011, II-2011, TE-3014…) tiene banda normal pero **no se proyecta**: el vigía
responde «sin límite declarado».

**Sentido de la alarma (`sube`/`baja`).** Lo decide la plantilla de la variable si «anuncia» algo
(`anuncia.sentido`); si no, `baja` cuando la alarma solo tiene `baja`, y `sube` en cualquier otro
caso (`src/entities/vigia.ts:146`). El límite que se usa es `alarma.alta` si sube y `alarma.baja`
si baja (`vigia.ts:118-119`).

**Ejemplo con los datos del demo.** PI-2010 en Morichal: `texto "> 10"` → `normal [10, ∞]`;
`alarma.baja = 8`; la plantilla dice `sentido: 'baja'` → límite 8 psi. El valor actual 8,8 psi
está **fuera de la banda normal (< 10) pero no en alarma (> 8)**: es atención. En pantalla:
indicador con ▲ naranja y «8,8 psi», pie «normal > 10,0 · alarma 8,0».

**Casos borde.**

| Caso | Qué pasa |
|---|---|
| Tag no registrado en el campo | `limiteDe` → `undefined`; sin banda ni alarma. La procedencia responde `404 { codigo: "tag-no-registrado" }` y el front muestra el hueco, no una cadena inventada. |
| Dos equipos declaran el mismo tag en un campo | El motor lanza error (`limites.ts:87`): el registro está mal. El backend debe rechazarlo en la ingesta (`409 tag-de-otro-gateway` cubre otro gateway; el mismo gateway con dos equipos no tiene código: ver «Huecos»). |
| Texto que no es banda (`"—"`, un estado) | `normal` ausente; el analógico no dibuja banda. |
| Alarma solo de un lado | Se proyecta solo hacia ese lado. |
| **Alto-alto / bajo-bajo** | `LimiteTag` tiene **dos** niveles (banda normal y alarma). No hay HH/LL por tag. El «alto-alto» que usa el producto es el del **tanque de agua** en la configuración firmada (`tanques[].altoAlto`), para el colchón (capítulo de predicción), no un límite de instrumento. |
| Electrosumergible | La banda y la alarma son los **ajustes de protección del variador del pozo** (configuración del pozo) y viajan con cada señal (`normal`, `alarma` con `fuente: "Ajuste de protección del variador del pozo (configuración del pozo)"`). Hoy no tienen endpoint propio (ver 5C.4 y «Huecos»). |

**Qué texto se muestra según el valor.** Indicador analógico con `detalle`
(`src/shared/ui/Analogico.tsx:53-58`): `normal < X`, `normal > X`, `normal X – Y`, `alarma X` o
`alarma X y Y`, con los decimales de la serie.

**Quién lo calcula y por dónde viaja.** Servidor: `GET /api/catalogo` → `campos[campo].limites`
(dato de catálogo del campo). En cada señal calculada viajan ya resueltos `normal`, `alarma` y
`limite: { valor, sentido }` (`Senal`, `src/entities/vigia.ts:89-110`).

**Referencia.** `src/entities/limites.ts:22-100`; `src/shared/lib/formato.ts:49-62`; CONTRATO.md
«Límite de cada tag». `scripts/verificar-libro.mjs:1419-1432` comprueba que la procedencia del
simulador cita la misma banda en todos los tags, que todas las señales de bombas toman banda y alarma
de `limites` y que VI-2011 dice «< 3,9» con alarma 3,9 (API 610) y sus dos firmas. Los límites viajan
en `referencia/insumos/arranque/catalogo.json` (`GET /api/catalogo`).

---

### Estado de un dispositivo (`EstadoDispositivo`)

**Qué es.** Lo que reporta el sistema de alarmas para el instrumento: `normal`, `aviso`,
`atencion`, `alarma` o `sin señal`. **Manda sobre lo que la pantalla pudiera deducir del número**
(`src/entities/vigia.ts:99-101`).

**Dónde se ve.** La marca ISA-101 de cada indicador analógico, el color del número, el panel
FUERA DE BANDA (operación) y la salud por parte (5C.3).

**Fórmula (de estado a prioridad).** `DE_ESTADO` (`src/shared/lib/prioridad.ts:10-12`) y la copia
interna `SEV` de `src/entities/salud.ts:84`:

| Estado | Prioridad | Marca | Para la salud, ¿es «anormal»? |
|---|---|---|---|
| `normal` | 0 | sin marca, tinta gris | no |
| `aviso` | 3 | ■ amarillo | **no** (`enAlarma` solo acepta 1 y 2) |
| `atencion` | 2 | ▲ naranja | sí |
| `alarma` | 1 | ◆ rojo | sí |
| `sin señal` | – (null) | texto «sin señal» en magenta (`--invalido`), escala punteada | no: es dato inválido, no una prioridad |

**Quién pone el estado.**
- **Bombas de la línea**: lo pone el **PLC / sistema de alarmas** con el dispositivo (`Dispositivo.estado`).
  TRIM no lo recalcula. Ejemplo: PI-2010 en Morichal llega `atencion`.
- **Electrosumergibles**: el demo lo deduce de los ajustes del variador (`estadoDe`,
  `src/entities/esp.ts:91-93`):

$$
\text{estado} = \begin{cases}
\text{alarma} & v \ge \text{alta} \ \lor\ v \le \text{baja} \\
\text{atencion} & v < \text{normal}_0 \ \lor\ v > \text{normal}_1 \\
\text{normal} & \text{en otro caso}
\end{cases}
$$

  Fuera de banda sin llegar a la alarma es **atención**, igual que en las bombas («la misma lectura
  no puede ser una cosa en una familia y otra en la otra»). El estado `aviso` nunca sale de aquí.

- **Sin estado del instrumento** (solo en el analógico, cuando el estado viene `sin señal` y por
  tanto `undefined`): el analógico deduce `alarma` → 1 si $v \ge$ alta o $v \le$ baja; fuera de banda
  → **3**; si no, 0 (`src/shared/ui/Analogico.tsx:46-49`). Ojo: esta deducción da 3 donde el resto
  del producto daría 2 (ver «Huecos»). En la práctica no se usa, porque toda señal trae estado.

**Ejemplo con los datos del demo.**

| Equipo (campo) | Tag | Valor | Banda | Alarma | Estado | Se ve |
|---|---|---|---|---|---|---|
| P-201B (Morichal) | PI-2010 | 8,8 psi | > 10 | baja 8 | atencion | ▲ «8,8 psi» |
| MPP-301 (Morichal) | PDT-3011 | 9,6 psi | < 8 | alta 12 | atencion | ▲ «9,6 psi» |
| MN-07 (Morichal) | corriente | 99,8 A | 68 – 89,6 | alta 100, baja 52 | atencion (99,8 > 89,6 y < 100) | ▲ «99,8 A» |
| P-201B (La Ceiba, detenida) | FI-2011 | 0 bbl/d | 18.000 – 20.400 | – | alarma | ◆ «0 bbl/d» |
| P-201B (La Ceiba) | VI-2011 | 0 mm/s | < 3,9 | alta 3,9 | normal | sin marca |

**Casos borde.** Con la bomba parada, el PLC puede reportar en alarma lo que la parada misma
causa (caudal, descarga, corriente en 0). La salud no lo toma como pista (5C.3).

**Quién lo calcula y por dónde viaja.** Servidor; `Senal.estado` en `/vistas/bombas` y
`/vistas/pozos/:campo/:pozo`; `Dispositivo.estado` en `/vistas/equipos…`.

**Referencia.** `src/entities/tipos.ts:7`; `src/shared/lib/prioridad.ts`; `src/entities/esp.ts:88-93`.

---

### Dato inválido: instrumento sin señal

**Qué es.** Un instrumento que no tiene lectura en línea. Viaja como `valor: null` y estado
`"sin señal"`, **nunca como cero** (premisa de custodia del contrato).

**Dónde se ve.**
- Indicador analógico: en vez del número, «sin señal» en magenta y la escala punteada
  (`Analogico.tsx:69-82`).
- `BloqueParte`: la fila de la variable dice «sin señal» en magenta.
- Detalle del pozo, nivel **operación**: panel **SIN SEÑAL · con el pozo produciendo** (solo si
  el pozo produce). Nivel **ingeniería**: panel SEÑALES DEL POZO con todas, y si el pozo está
  parado, el rótulo «sin lectura: motor parado» una sola vez arriba
  (`src/widgets/pozos/DetallePozo.tsx:148-167`, `src/widgets/pozos/estado.ts:28-33`).
- Lista de electrosumergibles: una que produce sin dato de sus partes nunca queda escondida por
  «ver más» (`src/pages/Esp.tsx`, `queda`).

**Regla.**

| Situación | ¿Es anormal? | Qué se muestra |
|---|---|---|
| Sin señal con el equipo **produciendo** | Sí: dato inválido | magenta, en su propio panel; no va bajo «fuera de banda» |
| Sin señal con el motor de la electrosumergible **parado** (sensor de fondo, desbalance) | No: es lo esperado, no transmiten con el motor apagado | no se marca; «sin lectura: motor parado»; `origen` = «sensor de fondo · sin lectura con el motor parado» |
| Corriente y frecuencia del variador con el motor parado | No | se miden: **0** (no `null`); su alarma baja es consecuencia de la parada, que ya marca el controlador |

**Ejemplo con los datos del demo.** MN-41 (Morichal) está parada por falla de aislamiento
(evento `EP-MN41-260903-06`, código GF). Su presión de entrada, temperatura del motor y desbalance
viajan `valor: null`, `estado: "sin señal"`; corriente y frecuencia, `0`. En el demo **ninguna**
electrosumergible queda sin señal mientras produce (las lecturas son sintéticas), así que el panel
SIN SEÑAL no aparece en ningún pozo del demo.

**Vigía y salud.** Sin señal no se proyecta (`motivo: "Sin señal en línea: <origen>"`,
`vigia.ts:151`) y la señal va a `sinSenal` de la parte, no a `medidas` (5C.3).

**Procedencia.** «De dónde sale este número» llama `GET /api/campos/:campo/tags/:tag/procedencia`;
un tag no registrado responde `404 tag-no-registrado` y el front muestra el hueco.

**Referencia.** `src/entities/esp.ts:95-134`; `src/widgets/pozos/estado.ts`; CONTRATO.md «Premisa:
cadena de custodia» y «Lo que ve operación de las señales de un pozo».
