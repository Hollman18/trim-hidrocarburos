# 5A.8 · Paretos y palancas: a quién se le carga y dónde se puede bajar

Tres cortes del mismo diferido (por tipo de causa, por equipo, por parte) y cinco palancas («DÓNDE BAJARLO»). Todos salen de los tramos del período y de su causa (`causa-senal.ts`, otro capítulo): el barril de un pozo que cerró porque paró la bomba de reinyección **se le carga a la bomba**, no al pozo.

---

### Pareto por tipo de causa (`porTipo`)

**Qué es.** El diferido agrupado por el tipo de la causa de cada tramo.

**Dónde se ve.** Diferidos, panel «TIPO DE CAUSA» (todos los niveles): una fila por tipo, de mayor a menor; los de alto impacto en negrita y barra oscura; lo sin identificar rayado y **nunca** detrás de «ver más».

**Fórmula.**

$$
\text{porTipo}_k = \sum_{t\,:\,\text{causa.tipo}(t) = k} \text{bbl}_t \qquad \%_k = 100\cdot\frac{\text{porTipo}_k}{\text{diferido}}
$$

Tipos y rótulos (`TIPO_CAUSA`): `reinyeccion` «Bomba de reinyección», `transporte` «Bomba multifásica», `electrosumergible` «Electrosumergible», `levantamiento` «Bombeo mecánico», `energia` «Energía eléctrica», `aire` «Aire de instrumentos», `compresion` «Compresión de gas», `evacuacion` «Evacuación del crudo», `proceso` «Separación», `tratamiento` «Tratamiento de crudo», `programada` «Parada programada», `declarada` «Declarada por el operario», `pendiente` «Sin identificar».

**Ejemplo con los datos del demo.**

| La Ceiba · sep | La Ceiba · oct | Portafolio · sep |
|---|---|---|
| **Electrosumergible** 6.436 bbl · 83 % | **Bomba de reinyección** 573 · 55 % | **Electrosumergible** 19.953 · 59 % |
| **Bomba de reinyección** 1.041 · 13 % | Sin identificar 355 · 34 % (rayado) | **Bomba de reinyección** 4.829 · 14 % |
| Energía eléctrica 239 · 3 % | Energía eléctrica 118 · 11 % | Bomba multifásica 3.027 · 9 % |
| | | Bombeo mecánico 2.687 · 8 % |
| | | Parada programada 1.385 · 4 % |
| | | Separación 1.304 · 4 % |
| | | Declarada por el operario 409 · 1 % |
| | | Energía eléctrica 351 · 1 % |

Con el agua real la bomba de reinyección deja de mandar en La Ceiba: cada parada cierra 2 o 3 pozos (antes del 9-oct, los 18). En septiembre manda la electrosumergible (LC-11 y LC-04, caídas el 26-sep); la «Parada programada» de septiembre son los dos cambios de bomba que el vigía anticipó en Morichal (MN-05 y MN-16).

**Qué texto.** `${TIPO_CAUSA} … ${n0(bbl)} bbl · ${pctParte(%)}`, con `pctParte` (`src/shared/lib/formato.ts:20-21`): lo que no es cero pero no llega a 1 % se escribe «< 1 %» (lector: «menos del 1 %»), nunca «0 %» (antes del 8-oct salía «0 %»); barra = bbl / bbl de la primera fila. Vacío: «Nada diferido.» Se ven cinco filas (seis si son exactamente seis) más «ver N más».

**Quién lo calcula.** Servidor: `porTipo: [{ tipo, bbl }]` ordenado por bbl.

---

### Pareto por equipo (`porEquipo`)

**Qué es.** El diferido por el equipo que lo causó (bomba, alimentador, pozo, separador…), separado por campo y por tipo: lo programado de una bomba o lo declarado de un pozo es otra fila que sus fallas.

**Dónde se ve.** Diferidos, panel «POR EQUIPO» con «N equipos» (todos los niveles; en decisión sin tolerancia ni acumulado). Resumen del gerente: «POR EQUIPO» con los tres primeros y, desde el 8-oct, «POR CAMPO» desplegable: cada campo se abre con sus filas de `porEquipo` (equipo, lo que es, cuántas veces —`fallas`/`disparos` o «N paradas»—, barriles y % del diferido del campo) y al final los de `sinCosto` (abajo). Resumen de campo: los cinco primeros con «Ver los N equipos».

**Fórmula.** Una fila por clave $(\text{campo}, \text{causa.equipo}, \text{causa.tipo})$ con los tramos de **bbl > 0**:

$$
\text{bbl} = \sum \text{bbl}_t \quad \text{tolerancia} = \text{toleranciaDe}(\text{tramos}) \quad \text{eventos} = \#\{\text{causa.evento} \lor \text{evento.id}\} \quad \text{pozos} = \#\{\text{pozo}\}
$$

$$
\text{partes} = \left[\left(\text{parte},\ \sum_{t\,:\,\text{causa.parte}} \text{bbl}_t\right)\right]\ \text{ordenadas} \qquad
\text{acumulado}_i = 100\cdot\frac{\sum_{j\le i}\text{bbl}_j}{\text{diferido}}
$$

**Fallas y disparos de la fila** (`fallas?`, `disparos?`, `libro.ts:418-427`; cálculo `:757-770`). Solo en las filas de familia de falla propia de un equipo de la línea (`tipo` ∈ {`reinyeccion`, `transporte`, `electrosumergible`}); en las demás filas (servicios, programada, declarada, sin identificar) no van. Salen de la **historia de fallas** del equipo (`historialDeEquipo`, 5B.7), no de los tramos con barriles: los eventos que se solapan con el período (la misma regla que `porParte`), contando la abierta y las que el tanque absorbió:

$$
\text{fallas} = \#\{e \in \text{historia}(\text{equipo}) : \lnot e.\text{disparo},\ e.\text{inicio} < \text{hasta},\ (e.\text{fin} \lor \text{AHORA}) > \text{desde}\}
\qquad
\text{disparos} = \#\{\ldots\ e.\text{disparo}\}
$$

En una bomba `disparos` = 0 y `fallas` ≥ `eventos` (una falla que el tanque absorbió no tiene barriles pero cuenta); en una electrosumergible `fallas + disparos = eventos`. Ejemplo: P-201B de Morichal en los últimos 12 meses, **8 fallas** y `eventos` 7 (solo 7 costaron barriles: `260103` la absorbió el tanque); La Ceiba septiembre: P-201B 1 falla, LC-11 1 falla, LC-04 1 falla, LC-16 sin fallas · 2 disparos. Antes del 8-oct la pantalla del gerente las contaba por su lado con la historia de fallas; ahora las da el servidor (`verificar-libro` §18: 276 filas de 6 períodos iguales a la historia).

**Ejemplo con los datos del demo (La Ceiba, septiembre: 12 equipos).**

| Equipo | Tipo | bbl | Del total | Acum. | Tolerancia | Eventos · pozos | Parte top |
|---|---|---:|---:|---:|---:|---|---|
| LC-11 | Electrosumergible | 3.677 | 47,7 % | 48 % | ±552 (±15,0 %) | 1 · 1 | Aislamiento del motor y del cable 100 % |
| LC-04 | Electrosumergible | 2.126 | 27,5 % | 75 % | ±319 | 1 · 1 | Aislamiento del motor y del cable 100 % |
| P-201B | Bomba de reinyección | 1.041 | 13,5 % | 89 % | ±156 | 1 · 2 | Rodamientos 100 % |
| SE-2 | Energía eléctrica | 239 | 3,1 % | 92 % | ±36 | 3 · 3 | — |
| LC-16 | Electrosumergible | 217 | 2,8 % | 95 % | ±32 | 2 · 1 | Admisión y gas 100 % |
| … (7 más: LC-07 131, LC-14 95, LC-08 61, LC-09 55, LC-12 30, LC-01 25, LC-02 20) | | | | 100 % | | | |

LC-11 y LC-04: fallas a tierra del 26-sep, con la puesta en marcha de TRIM ya en servicio (volvieron en 85 y 61 h). P-201B: una parada (22-sep por rodamientos, 1.040,550 bbl) que cerró 2 pozos; la de sello pasó al 9-ago.

Octubre de La Ceiba (4 equipos): P-201B 573 (55 %, 2 pozos, sin parte), LC-21 «sin identificar» 247 (78 %), SE-2 118 (90 %), LC-08 «sin identificar» 109 (100 %). Portafolio septiembre (46 equipos): MN-41 · Morichal 3.832 (11 %, aislamiento), P-201B · Morichal 3.789 (22 %, 2 pozos, sin parte), LC-11 · La Ceiba 3.677 (33 %), MPP-301 · Morichal 3.027 (42 %), PA-07 · El Palmar 2.687 (50 %), GU-05 · Guacamayo 2.394 (57 %, ±5,0 %)…

**Qué texto se muestra.**

- Fila: marca de prioridad del equipo **hoy** (severidad de `/vistas/equipos-hoy`, otro capítulo) **solo si la fila es de una falla de ese equipo**: una fila de parada programada va sin marca y no se queda a la vista por ella (`marcaDeFila`, `src/widgets/diferidos/marca.ts`; lo declarado y lo sin identificar sí llevan la del equipo). Ejemplo, portafolio 12 meses: «P-201B · La Ceiba, parada programada: 1.523 bbl» y «MPP-301 · Morichal Norte, parada programada» van sin marca (antes ◆ P1 y ■ P3); etiqueta en negrita («P-201B», con «· La Ceiba» en el portafolio), chip con el tipo en minúsculas (tono fuerte si es de alto impacto), «2 pozos» si > 1, nombre de la parte top en minúsculas, barra (bbl / bbl del primero; oscura si alto impacto), `n0(bbl)` y `n0(acumulado)` % (oculto en pantallas chicas y en decisión).
- Globo: título «LC-11» (+ campo); pista: nombre largo del equipo · «Aislamiento del motor y del cable: 100 % de sus barriles» · «tolerancia ±15,0 %» (no en decisión); filas «Diferidos», «Tolerancia ±552 bbl» (no en decisión), «Del total 47,7 %», «Acumulado 47,7 %», «Tipo», «Eventos», «Pozos afectados» y hasta tres partes con sus bbl.
- Se ven cinco filas y **toda fila de prioridad 1** (ISA-18.2); «ver más» abre el resto; en el papel salen todas. Vacío: «Nada diferido.»
- Resumen del gerente: tres filas con etiqueta, campo (en el portafolio), parte top o tipo en minúsculas, `n0(bbl)` y «bbl · 48 %».

**Casos borde.** Un tramo de 0 bbl (pozo sin prueba o mes sin factor) no crea fila. Un equipo que el tanque absorbió (0 bbl) no aparece aquí pero sí en el Pareto por parte y en `sinCosto` (abajo).

**Quién lo calcula.** Servidor: `porEquipo: FilaEquipo[]` (`src/entities/libro.ts:408-428`, `:749-773`), con `fallas`/`disparos` en las filas de la línea (CONTRATO.md:299; el códec no cambia). El acumulado y los porcentajes, el front.
---

### Equipos que fallaron sin costar crudo (`sinCosto`)

**Qué es.** Los equipos de la línea (bombas de inyección —también la de recobro— y multifásicas, y electrosumergibles) que **fallaron o dispararon** en el período **sin costar crudo**: el tanque, el respaldo o la salida alterna del agua lo absorbieron, así que no tienen fila de barriles en `porEquipo`. Sin ellos, «qué equipos de ese campo fallan» (lo que el gerente pidió el 8-oct) se quedaba sin la bomba que falla y no cierra pozos.

**Dónde se ve.** Resumen del gerente, «POR CAMPO» desplegado: al final de su campo, sin barriles, «P-201B · bomba de reinyección · 5 fallas · no costó crudo» (lector: «P-201B, bomba de reinyección, 5 fallas: no costó crudo»); entran en el mismo «ver N más» y en el papel salen todos (`src/widgets/resumen/PorCampo.tsx:71`, `:91`, `:128-137`; cap. 6A).

**Fórmula** (`src/entities/libro.ts:775-791`). Candidatos por campo $c$ de la consulta: las bombas con perfil en $c$ que tienen alguna parada en el campo (familia `transporte` si es multifásica, `reinyeccion` si no) y las electrosumergibles de $c$ (familia `electrosumergible`). Con la regla de período de `fallas`/`disparos` (arriba):

$$
\text{sinCosto} = \{(c, e, \text{familia}) : \text{fallas}_e + \text{disparos}_e > 0\ \wedge\ (c, e, \text{familia}) \notin \text{porEquipo}\}
$$

Orden: campo en el orden de la consulta; dentro, más fallas, más disparos, código del equipo (comparación de texto simple, la misma en cualquier lenguaje). Forma: `{ campoId, equipo, tipo, fallas, disparos }` (`EquipoSinCosto`, `libro.ts:434-445`), **sin barriles**: no son diferido y no entran en ningún Pareto (`porEquipo`, `porParte` y `porTipo` no cambian).

**Ejemplo con los datos del demo.**

| Período | `sinCosto` |
|---|---|
| Últimos 12 meses | P-201B de Guacamayo (recobro): **5 fallas** · 0 disparos (sus paradas no cierran pozos hoy) |
| Julio a septiembre | P-201B de Guacamayo: 1 falla |
| Octubre en curso, septiembre cerrado | `[]` |
| Enero de 2026 (serie mensual) | P-201B de **Morichal**: 1 falla (`EV-M2011-260103`, succión: el tanque la absorbió, 0 bbl) |

En la serie mensual sale en 6 meses: Guacamayo nov-2025, mar, may, jun y ago-2026; Morichal ene-2026 (absorbida por el tanque). La de diciembre de 2025 (`EV-M2011-251207`, motor) ya no: con 40.400 bbl/d sin salida duró más que su colchón y cerró 3 pozos (894 bbl).

**Casos borde.** Una bomba que falló **y** costó en el mismo período tiene su fila de barriles (con sus `fallas`, que cuentan también las absorbidas) y no sale aquí. Una bomba sin ninguna parada en el campo no puede estar. Sin nada, `[]`.

**Quién lo calcula y por dónde viaja.** Servidor: `Libro.sinCosto` en `GET /api/vistas/diferidos` y en cada mes de `/vistas/diferidos/mensual` (CONTRATO.md:299; el códec no cambia: números y textos). Casos `referencia/diferidos/*-2026-09.json` (`sinCosto: []`) y `referencia/mensual/*.json`; `verificar-libro.mjs` §19 (8): en 6 períodos, ni uno de más ni uno de menos contra la historia de fallas.

---

### Pareto por parte (`porParte`)

**Qué es.** Las **fallas** de los equipos de alto impacto de la línea (bombas de reinyección y multifásicas con perfil, y electrosumergibles) por la **parte** que falló (ítem mantenible de ISO 14224), con sus barriles, fallas, disparos y horas fuera. Sale de los **eventos del equipo**, no de los tramos: una parada que el tanque absorbió (0 bbl) también es una falla.

**Dónde se ve.** Diferidos (ingeniería), panel «POR PARTE · bombas y electrosumergibles». Un clic lleva a Bombas (si el rol la tiene).

**Fórmula.**

- Fallas de bomba: cada parada del PLC de una bomba con perfil en el período cuya causa (`causaDeParada`) es `reinyeccion` (familia `inyeccion`) o `transporte` (familia `multifasica`) **con parte**; recortada al período.
- Fallas de electrosumergible: cada tramo con causa `electrosumergible`, con parte y `causa.equipo === pozo`. Es **disparo** si cerró y duró menos de 24 h (`DISPARO_MAX_H`); si no, falla.
- Una fila por (familia, parte):

$$
\text{bbl} = \sum_{\text{eventos de la fila}} \text{bbl del evento (Σ de sus tramos)}
\qquad
\text{fallas} = \#\{\text{ids, sin disparos}\}
\qquad
\text{disparos} = \#\{\text{ids disparo}\}
$$

$$
\text{horas} = \sum_{\text{equipo}} \left|\ \bigcup \text{intervalos de sus eventos, recortados al período}\ \right| \qquad
\%_{\text{fila}} = 100\cdot\frac{\text{bbl}}{\sum_{\text{filas}} \text{bbl}}
$$

Las horas son las del equipo fuera, no la suma de las de cada pozo cerrado (una falla que cerró 3 pozos son las horas de la bomba, no tres veces esas horas). Orden: bbl descendente y, a igualdad, horas.

**Ejemplo con los datos del demo (La Ceiba, septiembre).**

| Parte | Familia | Fallas · disparos | bbl | % | Horas fuera |
|---|---|---|---:|---:|---:|
| Aislamiento del motor y del cable | electrosumergible | 2 fallas · 2 disparos | 5.842 | 78 % | 148 |
| Rodamientos | reinyección | 1 falla | 1.041 | 14 % | 16 |
| Admisión y gas | electrosumergible | sin fallas · 7 disparos | 396 | 5 % | 13 |
| Motor eléctrico | electrosumergible | sin fallas · 1 disparo | 131 | 2 % | 4 |
| Bomba de fondo | electrosumergible | sin fallas · 1 disparo | 67 | < 1 % | 2 |

El total por parte es 7.476,616 bbl (el diferido de alto impacto). Portafolio septiembre (total por parte 24.020,5: el alto impacto con parte más la multifásica): Aislamiento del motor y del cable (ESP) 6 fallas · 5 disparos · 15.351 bbl · 62 % · 539 h (MN-41, LC-11, LC-04…); Sello mecánico (multifásica, MPP-301) 1 falla · 3.027 · 12 % · 45 h; Bomba de fondo 1 · 7 · 2.701 · 11 % · 135 h (GU-05); Admisión y gas 1 · 20 · 1.744 · 7 % · 108 h; Rodamientos (reinyección, P-201B de La Ceiba) 1 falla · 1.041 · 4 % · 16 h; Motor eléctrico 2 disparos · 158 · < 1 %. La parada de P-201B de Morichal del 24-sep no tiene parte: no entra aquí (va a «sin la parte identificada»).

**Qué texto se muestra.**

- Fila: nombre de la parte en negrita; «{familia} · {N falla(s) | sin fallas}{ · M disparo(s)}»; barra (bbl / bbl de la primera, o 1 si la primera tiene 0); a la derecha `n0(bbl)` y «bbl · `pctParte(%)`» («< 1 %» si no llega a 1 %).
- Globo: «Diferidos», «Del total por parte» (`n1` %), «Familia», «Fallas», «Disparos (menos de un día)» (si hay), «Horas fuera» (`n0` h) y hasta tres equipos «LC-11 · La Ceiba: 3.677 bbl». Pista (si es clicable): «Clic para ver la salud de esa parte en los equipos».
- Debajo: «+ N bbl sin la parte identificada» si `sinParte > 0`, con ⓘ «Barriles de equipos de alto impacto cuya parada no dejó primera alarma ni firma. Están en «paradas por identificar».»
- Vacío: «Ninguna falla con la parte identificada.» Ejemplo: La Ceiba en octubre (la parada abierta de P-201B no tiene parte) → vacío y «+ 573 bbl sin la parte identificada».

**Quién lo calcula.** Servidor: `porParte: FilaParte[]` (`src/entities/libro.ts:457-472`, `:793-824`).

---

### Palancas («DÓNDE BAJARLO»)

**Qué es.** Dónde se puede bajar el número: las cinco cifras de la promesa del producto.

**Dónde se ve.** Diferidos (todos los niveles; en decisión junto a la Tendencia) y Resumen de campo: panel «DÓNDE BAJARLO · bbl · % del diferido».

**Fórmula.** Sobre los tramos de alto impacto ($A$):

$$
\text{anticipable} = \sum_{t \in A\,:\,\text{parte}\ \wedge\ \text{vigilable}} \text{bbl}_t
\qquad
\text{sinInstrumento} = \sum_{t \in A\,:\,\text{parte}\ \wedge\ \neg\text{vigilable}} \text{bbl}_t
\qquad
\text{sinParte} = \sum_{t \in A\,:\,\neg\text{parte}} \text{bbl}_t
$$

Por construcción $\text{anticipable} + \text{sinInstrumento} + \text{sinParte} = \text{altoImpacto}$.

`vigilable(campo, tipo, equipo, parte)` (`src/entities/libro.ts:629-635`): una electrosumergible **siempre** (variador y sensor de fondo vigilan todas sus partes); una bomba, si su perfil tiene instrumentada (`tags`) alguna variable de esa parte con papel `causa` o `avisa` (las de papel `confirma` no anuncian nada). En P-201B de La Ceiba (subtipo inyección, tags PI-2010, PDI-2011, FI-2011, VI-2011, TI-2011, LSH-2013, II-2011, LT-2012):

| Parte | Variables (papel) | ¿Vigilable? |
|---|---|---|
| sello | presión de succión (causa) ✓, vibración (causa) ✓, fuga de sello (confirma) | sí |
| rodamientos | temperatura de empuje (avisa) ✓, vibración (avisa) ✓, nivel de aceite (causa) ✗ | sí |
| succión | presión de succión (avisa) ✓, nivel del tanque (causa) ✓ | sí |
| hidráulica (desgaste interno) | energía por barril (avisa) ✗, caudal y presión de descarga (confirma) | **no** → sin instrumento |
| motor | temperatura de devanado (avisa) ✗, corriente y velocidad (confirma) | **no** → sin instrumento |

| Palanca | Pie (globo y papel) |
|---|---|
| **Equipos de alto impacto** (fila fuerte) | «Bombas de reinyección y electrosumergibles: el foco del producto.» |
| Con parte vigilada | «La parte que falló tiene un instrumento que la vigila: se pudo saber antes.» |
| Con parte sin instrumento | «Se sabe qué parte falló pero nada la vigila en ese equipo: hueco de instrumentación.» |
| Sin la parte identificada | «Paró sin primera alarma ni firma: hay que preguntar qué se dañó.» |
| Evitable cerrando en orden | «Al parar la reinyección, cerrar primero los pozos con menos crudo por barril de agua.» (5A.3) |

**Ejemplo con los datos del demo.**

| Palanca | La Ceiba · sep | La Ceiba · oct | Portafolio · sep | Portafolio · oct |
|---|---|---|---|---|
| Equipos de alto impacto | 7.477 · 97 % | 573 · 55 % | 24.782 · 73 % | 1.668 · 70 % |
| Con parte vigilada | 7.477 · 97 % | 0 · 0 % | 20.994 · 62 % | 1.095 · 46 % |
| Con parte sin instrumento | 0 · 0 % | 0 · 0 % | 0 · 0 % | 0 · 0 % |
| Sin la parte identificada | 0 · 0 % | 573 · 55 % | 3.789 · 11 % | 573 · 24 % |
| Evitable cerrando en orden | 55 · < 1 % | 30 · 3 % | 256 · < 1 % | 30 · 1 % |

En el demo ningún mes tiene barriles «sin instrumento» (todas las fallas con parte son de rodamientos o de electrosumergibles). «Sin la parte identificada» en septiembre del portafolio es la parada de P-201B de Morichal del 24-sep; en octubre, la parada abierta de P-201B de La Ceiba.

**Qué texto.** Rótulo; `n0(bbl)`; `pctParte(100·bbl/diferido)` en chico («< 1 %» si no llega a 1 %; vacío si el diferido es 0). Globo: «Barriles», «Del diferido». Con `conMaximo` (hoy apagado en todas las pantallas que lo usan), además la barra «diferido por día» contra el máximo y «antes N bbl/d · jul a sep».

**Quién lo calcula.** Servidor: `altoImpacto`, `anticipable`, `sinInstrumento`, `sinParte`, `evitablePorOrden`. Porcentajes, el front.

**Referencia.** `src/entities/libro.ts:859-863`; `src/widgets/diferidos/Paretos.tsx:218-267`.

---

### Por pozo (`porPozo`)

**Qué es.** Lo diferido por cada pozo en el período, sea cual sea la causa: `{ campoId, pozo, bbl, horas, eventos }` (horas = suma de las horas de sus tramos; eventos = número de tramos).

**Dónde se ve.** No en Diferidos (lo usan la pantalla de pozos e informes, otros capítulos). Viaja en `GET /api/vistas/diferidos`, no en la serie mensual.

**Ejemplo.** La Ceiba septiembre (11 pozos): LC-11 3.677,2 bbl en 84,6 h (1 evento), LC-04 2.260,6 (65,0 h, 2), LC-16 756,8 (20,7 h, 3), LC-07 631,8 (18,8 h, 2)… LC-02 19,9 (1,3 h, 1).
