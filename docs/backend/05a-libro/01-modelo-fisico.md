# 5A.1 · El modelo físico: qué fluye, qué se mide y de dónde sale lo «real»

Este apartado no tiene pantallas propias: define los conceptos con que se arman todas las cifras del libro. Cada término se usa después sin volver a explicarlo.

Convenciones de este capítulo:

- **El «ahora» del demo** es `AHORA = 2026-10-02T14:00-05:00` (`src/entities/reloj.ts:7`). Octubre va en su día 2, con 38 h transcurridas (24 h del 1 y 14 h del 2).
- **Hora de Colombia** (UTC−5, sin horario de verano). Un día va de 00:00 a 24:00 de Colombia: en UTC, de 05:00 a 05:00.
- Los números de ejemplo salen de correr el motor (`src/entities/*.ts`) con los insumos del demo (`INSUMOS_DEMO`); los decimales se muestran como los da el motor y el valor de pantalla con su formato (`n0`, `n1`, `n3`: es-CO, miles con «.», decimal con «,»).
- «Portafolio» = los cinco campos del demo juntos: `ceiba`, `morichal`, `guacamayo`, `palmar`, `zarza`.

---

## Los cuatro fluidos y el corte de agua

### Fluido total, crudo, agua y gas

**Qué es.** Un pozo productor entrega una mezcla: **crudo** (aceite), **agua de formación** y **gas** en solución. En superficie, un separador los divide. El crudo va a tratamiento y a venta (pasa por el punto de medición oficial); el agua va a un tanque de agua y de ahí la **bomba de reinyección** la devuelve al yacimiento (o a un pozo de disposición); el gas se quema en tea, se usa en el campo o se vende.

**Dónde se ve.** No se muestra como cifra en el libro. El agua de cada pozo aparece en la prueba (`aguaBpd`) y en el orden de cierre (sección 5A.3, «evitable cerrando en orden»); el caudal de agua y crudo «de ahora» lo dan otros capítulos (`/vistas/campos/:campo/ahora`).

**Fórmula.**

$$
Q_{\text{fluido}} = Q_{\text{crudo}} + Q_{\text{agua}} \qquad \text{(bbl/d, el gas aparte en pies cúbicos)}
$$

**Por qué el libro solo cuenta crudo.** El diferido es dinero, y lo que se vende es el crudo neto que pasa por el punto de medición oficial. El agua no se vende, pero **manda**: si no hay por dónde sacarla, hay que cerrar pozos aunque estén buenos. El gas no entra al libro en esta fase (el motor solo usa la fila `crudo` de la Fig. 10.2; las filas `gas` y `agua` existen en `src/entities/metrologia.ts:30-33` pero nadie las pide). En La Zarza, campo de gas con condensado, el libro va sobre el condensado (°API 34).

### Corte de agua (BSW) y relación agua-crudo

**Qué es.** El **corte de agua** (BSW, *basic sediment and water*) es la fracción del líquido que es agua (y sedimento). La **relación agua-crudo** (WOR) es cuántos barriles de agua salen por cada barril de crudo.

**Fórmula.**

$$
\text{BSW} = \frac{Q_{\text{agua}}}{Q_{\text{crudo}} + Q_{\text{agua}}} \qquad\qquad \text{WOR} = \frac{Q_{\text{agua}}}{Q_{\text{crudo}}} = \frac{\text{BSW}}{1-\text{BSW}}
$$

| Símbolo | Significado | Unidad | De dónde sale |
|---|---|---|---|
| $Q_{\text{crudo}}$ | crudo de la prueba vigente | bbl/d | `pruebas[].crudoBpd` (`GET /api/campos/:campo/pozos`) |
| $Q_{\text{agua}}$ | agua de la prueba vigente | bbl/d | `pruebas[].aguaBpd` |

**Por qué en Colombia «el agua manda».** Con cortes de 92 % a 98 %, la WOR va de $0{,}92/0{,}08 = 11{,}5$ a $0{,}98/0{,}02 = 49$ barriles de agua por barril de crudo (con 97,5 %, 39). La planta mueve entre 11,5 y 49 veces más agua que crudo: la bomba de reinyección es el cuello de botella. Si se para y el respaldo no alcanza, el tanque de agua se llena en horas y la única salida es **cerrar pozos**: cada pozo cerrado se lleva su crudo. Por eso una sola bomba de superficie puede costar más barriles que todas las electrosumergibles juntas (ver el ejemplo de P-201B en 5A.3).

**Ejemplo con los datos del demo.** Pruebas vigentes al 15-sep-2026 (suma de los pozos con prueba):

| Campo | Crudo bbl/d | Agua bbl/d | BSW | WOR |
|---|---:|---:|---:|---:|
| La Ceiba (18 pozos) | 11.921 | 21.608 | 64,4 % | 1,81 |
| Morichal Norte (41) | 18.025 | 43.971 | 70,9 % | 2,44 |
| Guacamayo (12) | 6.831 | 8.324 | 54,9 % | 1,22 |
| El Palmar (7) | 3.332 | 2.530 | 43,2 % | 0,76 |
| La Zarza (9, uno sin prueba) | 3.076 | 1.258 | 29,0 % | 0,41 |

En La Ceiba, pozo a pozo: LC-01 376 bbl/d de crudo y 958 de agua (BSW 71,8 %); LC-02 395 y 1.179 (74,9 %); LC-03 (bombeo mecánico) 393 y 352 (47,2 %).

Rango pozo a pozo en el demo (prueba vigente al 15-sep):

| Campo | Pozo de menor corte | Pozo de mayor corte |
|---|---|---|
| La Ceiba | LC-21: 42,3 % (WOR 0,73) | LC-02: 74,9 % (WOR 2,99) |
| Morichal Norte | MN-09: 48,7 % (0,95) | MN-27: 79,1 % (3,79) |
| Guacamayo | GU-03: 33,9 % (0,51) | GU-07: 64,9 % (1,85) |
| El Palmar | PA-02: 27,7 % (0,38) | PA-07: 52,6 % (1,11) |
| La Zarza | ZA-04: 15,5 % (0,18) | ZA-02: 37,1 % (0,59) |

> **Ojo (hueco del demo).** Los datos del demo tienen cortes de campo de 29 % a 71 % (de pozo, de 15,5 % a 79,1 %), no de 92 % a 98 %. Las fórmulas no dependen del corte, pero un backend con datos reales de la operadora verá WOR de 11,5 a 49 y, con ellas, tanques que se llenan mucho más rápido. Ver «Huecos y dudas».

**Casos borde.** Un pozo sin prueba no tiene corte ni caudal (no se le inventa). Un corte de laboratorio (no analizador) es «manual en origen» y se dice (`custodia.bswLaboratorio`, ver más abajo).

**Quién lo calcula.** El libro no expone el BSW; usa crudo y agua por separado. Lo leen el orden de cierre (`ordenOptimo`, `src/entities/libro.ts:936`) y la predicción (otro capítulo).

---

## La prueba de pozo

### Prueba de pozo (prueba vigente)

**Qué es.** Medición periódica de un pozo solo, desviado a un **separador de prueba** durante unas horas: da su caudal de crudo, de agua (y gas) y la frecuencia a la que giraba su electrosumergible. Es la única forma de saber cuánto da **cada pozo**: el punto de medición oficial mide el campo entero, no el pozo.

**Dónde se ve.** En la ficha de cada pozo (otro capítulo). En el libro, a través del potencial y del diferido; en la cadena de custodia del Cuadre («Prueba estimada: LC-17»).

**Forma del insumo** (`GET /api/campos/:campo/pozos`, `CONTRATO.md:842-849`):

| Campo | Significado | Unidad |
|---|---|---|
| `pruebas[].fecha` | instante de la prueba, ISO con zona | — |
| `pruebas[].crudoBpd` | crudo medido | bbl/d |
| `pruebas[].aguaBpd` | agua medida | bbl/d |
| `pruebas[].hz` | frecuencia del variador durante la prueba (solo electrosumergibles) | Hz |
| `origen` | `instrumento` (separador automatizado) o `estimado` (desde la electrosumergible, sin separador) | — |
| `fuentePrueba` | texto: «Separador de prueba automatizado SP-CE1 · FT-… · AT-…» | — |

**Regla de la prueba vigente.** Para un instante $t$, la prueba vigente es la **última con fecha ≤ t** (`pruebaEn`, `src/entities/pozos.ts:177-182`):

```ts
for (let i = 0; i < fechas.length; i++) if (fechas[i]! <= t) u = p.pruebas[i]
return u ?? p.pruebas[0]
```

El libro la pide **por pozo y por día** (al inicio del día, `crudo(p, dia)` en `src/entities/libro.ts:84`): si un pozo tiene prueba nueva el 14-sep a las 15:00, el día 14 completo usa todavía la anterior y desde el 15 la nueva.

**Ejemplo con los datos del demo.** LC-02 de La Ceiba: prueba del 2026-09-14T15:00 con 395 bbl/d de crudo, 1.179 de agua a 53 Hz; antes regía otra con 402 bbl/d y 1.150 de agua (se ve en el orden de cierre de la parada del 9-sep, 5A.3). LC-03 tiene prueba del 2026-07-12 (393 bbl/d) y otra del 2026-09-21 (390 bbl/d).

**Casos borde.**

| Caso | Qué hace el motor | Qué ve la pantalla |
|---|---|---|
| Pozo con `pruebas: []` | No tiene caudal: no suma al potencial ni al teórico; sus eventos dan 0 bbl y `sinCustodia: true` | «Sin prueba: ZA-09» con el cuadrado P3 en la cadena de custodia del Cuadre |
| Antes de la primera prueba | Usa la **primera** prueba (`u ?? p.pruebas[0]`): una prueba futura rige hacia atrás | Nada lo dice (ver «Huecos y dudas») |
| `origen: 'estimado'` | Se usa igual | «Prueba estimada: LC-17» (sin marca de prioridad) |
| Prueba sin `hz` | El factor de frecuencia reducida no se puede calcular: el tramo cuenta como cerrado (factor 1) y queda «aproximado» | Ver 5A.3 |

**Quién lo calcula.** Servidor (lee los insumos). El front nunca ve las pruebas para calcular: las recibe en `refs.pozos` del libro.

**Referencia.** `src/entities/pozos.ts:177`; `src/entities/libro.ts:84-85`; insumos en `referencia/insumos/<campo>/pozos.json`.

---

## El punto de medición oficial (PMO) y lo «real»

### Punto de medición oficial · producción fiscal del día

**Qué es.** El **punto de medición oficial** (PMO) es donde el crudo cambia de manos y se mide para regalías e impuestos: una **unidad LACT** (*Lease Automatic Custody Transfer*) con su **computador de flujo**, o medidores automáticos de los tanques de despacho. El computador de flujo integra el volumen bruto, lo lleva a condiciones estándar (60 °F, 14,696 psia) y le descuenta el BSW: el resultado es el **volumen neto del día**, la «producción fiscal». Es la única cifra de producción que el regulador acepta. **Lo «real» del libro sale de ahí y de ningún otro lado**: nadie lo escribe.

**Dónde se ve.** «Real medido» en el Cuadre y el encabezado de Diferidos; «producción real» en Producción; la curva sólida de «Día a día»; el panel «MEDICIÓN OFICIAL» de Producción (ingeniería) con la fuente: «FQI-0101 · computador de flujo de la unidad LACT-01».

**Forma del insumo** (`GET /api/campos/:campo/produccion-diaria?desde=&hasta=`, `CONTRATO.md:887-894`):

```json
{ "origen": { "fuente": "FQI-0101 · computador de flujo de la unidad LACT-01", "bsw": "analizador|laboratorio" },
  "meses": [{ "mes": "2026-09", "publicado": true, "dias": [11700, 11640, null, …] }] }
```

| Campo | Significado | Regla |
|---|---|---|
| `dias[i]` | barriles netos del día `i+1` del mes | `null`, o un arreglo más corto, es **día sin dato**: nunca 0 |
| `publicado` | el campo ya cerró y publicó ese mes | por campo: cada campo publica su mes |
| último elemento del mes en curso | lo que va del día de hoy | parcial: se prorratea por horas (ver abajo) |
| `origen.bsw` | el corte de agua sale de un analizador en línea o del laboratorio | `laboratorio` = «manual en origen», se dice |

**Ejemplo con los datos del demo.** La Ceiba, septiembre (publicado, 30 días): `[11700, 11640, 11607, 11674, 11596, 11318, 11342, 11520, 11372, 1090, 7100, 11318, …, 11596]`. El 10-sep el computador de flujo marcó **1.090 bbl** (la bomba de reinyección P-201B estaba parada y casi todos los pozos cerrados) y el 11-sep **7.100**. Octubre (no publicado): `[11105, 3838]`: el 1-oct completo y lo que van las 14 h del 2-oct.

Orígenes del demo: La Ceiba, Morichal y La Zarza con analizador; **Guacamayo y El Palmar con corte de laboratorio** (El Palmar mide con «LIT-1021 y LIT-1022 · medidores automáticos de los tanques de despacho»).

**Casos borde.**

| Caso | Qué hace el motor | Pantalla |
|---|---|---|
| Día `null` o ausente | No entra ni en lo real ni en el potencial de ese día; el día va en `sinFiscal`; el libro no se publica (motivo `sin-fiscal`) | En el cuadre diario: «sin fiscal»; la curva real se corta (hueco, no cero) |
| Mes sin ningún día con dato | No hay factor de asignación ese mes (`sinFactor`); sus tramos valen 0 bbl con `sinFactor: true` | Motivo `sin-factor` |
| Último día del mes en curso | Se toma como el fiscal de las horas transcurridas: el teórico de ese día usa también esas horas | El punto de hoy va hueco y como tasa |
| `origen` ausente | — | «Sin punto de medición configurado»; chip «corte de agua: sin dato» |

**Quién lo calcula.** El servidor recibe el fiscal del borde (computador de flujo) y lo guarda; nadie lo edita. El front solo muestra.

**Referencia.** `src/entities/libro.ts:64-71` (fiscal por campo y mes), `:164-169` (`fiscalDelDia`); `src/entities/pozos.ts:125-128`; `referencia/insumos/<campo>/produccion-diaria.json`.

### Corte de agua de laboratorio (cadena de custodia)

**Qué es.** Si el BSW del PMO lo pone un laboratorio y no un analizador en línea, lo real depende de una muestra manual: es un eslabón no instrumentado de la cadena de custodia.

**Dónde se ve.** Cuadre → «CADENA DE CUSTODIA»: «**Corte de agua de laboratorio:** Guacamayo, El Palmar» con ⓘ «No viene de un analizador en línea: es manual en origen.» En Producción → «MEDICIÓN OFICIAL», el chip «corte de agua: laboratorio» va en tono fuerte.

**Fórmula.** `custodia.bswLaboratorio = campos del período cuyo origenPmo(c).bsw === 'laboratorio'` (`src/entities/libro.ts:869`).

**Ejemplo.** Portafolio, septiembre: `bswLaboratorio = ['guacamayo', 'palmar']`. La Ceiba sola: `[]`.

**Casos borde.** No impide publicar: es información de custodia, sin marca de prioridad.

**Quién lo calcula.** Servidor, dentro de `GET /api/vistas/diferidos` → `custodia.bswLaboratorio` (ids de campo).
