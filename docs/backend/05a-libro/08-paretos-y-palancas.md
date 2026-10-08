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
| **Bomba de reinyección** 20.739 bbl · 96 % | **Bomba de reinyección** 2.570 · 84 % | **Electrosumergible** 66.919 · 64 % |
| **Electrosumergible** 755 · 3 % | Sin identificar 355 · 12 % (rayado) | **Bomba de reinyección** 30.577 · 29 % |
| Energía eléctrica 198 · 1 % | Energía eléctrica 118 · 4 % | Bomba multifásica 3.022 · 3 % |
| | | Bombeo mecánico 2.687 · 3 % |
| | | Separación 1.304 · 1 % |
| | | Declarada por el operario 409 · 0 % |
| | | Energía eléctrica 309 · 0 % |

**Qué texto.** `${TIPO_CAUSA} … ${n0(bbl)} bbl · ${n0(%)} %`; barra = bbl / bbl de la primera fila. Vacío: «Nada diferido.» Se ven cinco filas (seis si son exactamente seis) más «ver N más».

**Quién lo calcula.** Servidor: `porTipo: [{ tipo, bbl }]` ordenado por bbl.

---

### Pareto por equipo (`porEquipo`)

**Qué es.** El diferido por el equipo que lo causó (bomba, alimentador, pozo, separador…), separado por campo y por tipo: lo programado de una bomba o lo declarado de un pozo es otra fila que sus fallas.

**Dónde se ve.** Diferidos, panel «POR EQUIPO» con «N equipos» (todos los niveles; en decisión sin tolerancia ni acumulado). Resumen del gerente: «POR EQUIPO» con los tres primeros. Resumen de campo: los cinco primeros con «Ver los N equipos».

**Fórmula.** Una fila por clave $(\text{campo}, \text{causa.equipo}, \text{causa.tipo})$ con los tramos de **bbl > 0**:

$$
\text{bbl} = \sum \text{bbl}_t \quad \text{tolerancia} = \text{toleranciaDe}(\text{tramos}) \quad \text{eventos} = \#\{\text{causa.evento} \lor \text{evento.id}\} \quad \text{pozos} = \#\{\text{pozo}\}
$$

$$
\text{partes} = \left[\left(\text{parte},\ \sum_{t\,:\,\text{causa.parte}} \text{bbl}_t\right)\right]\ \text{ordenadas} \qquad
\text{acumulado}_i = 100\cdot\frac{\sum_{j\le i}\text{bbl}_j}{\text{diferido}}
$$

**Ejemplo con los datos del demo (La Ceiba, septiembre: 11 equipos).**

| Equipo | Tipo | bbl | Del total | Acum. | Tolerancia | Eventos · pozos | Parte top |
|---|---|---:|---:|---:|---:|---|---|
| P-201B | Bomba de reinyección | 20.739 | 95,6 % | 96 % | ±3.111 (±15,0 %) | 2 · 18 | Sello mecánico 71 % |
| LC-16 | Electrosumergible | 217 | 1,0 % | 97 % | ±32 | 2 · 1 | Admisión y gas 100 % |
| SE-2 | Energía eléctrica | 198 | 0,9 % | 98 % | ±30 | 2 · 2 | — |
| LC-11 | Electrosumergible | 136 | 0,6 % | 98 % | ±20 | 1 · 1 | Bomba de fondo |
| LC-07 | Electrosumergible | 131 | 0,6 % | 99 % | ±20 | 1 · 1 | Motor eléctrico |
| … (6 más: LC-14 95, LC-08 61, LC-09 55, LC-01 25, LC-02 20, LC-12 16) | | | | 100 % | | | |

P-201B: dos paradas (9-sep por sello: 14.649,471 bbl; 22-sep por rodamientos: 6.089,387 bbl) que cerraron los 18 pozos.

Octubre de La Ceiba (4 equipos): P-201B 2.570 (84 %, 17 pozos, sin parte), LC-21 «sin identificar» 247 (93 %), SE-2 118 (96 %), LC-08 «sin identificar» 109 (100 %). Portafolio septiembre (43 equipos): P-201B · La Ceiba 20.739 (20 %), MN-41 · Morichal 18.638 (37 %, aislamiento), GU-05 · Guacamayo 11.766 (49 %, ±5,0 %), GU-09 10.510 (59 %), P-201B · Morichal 9.838 (68 %, 8 pozos, sin parte)…

**Qué texto se muestra.**

- Fila: marca de prioridad del equipo **hoy** (severidad de `/vistas/equipos-hoy`, otro capítulo), etiqueta en negrita («P-201B», con «· La Ceiba» en el portafolio), chip con el tipo en minúsculas (tono fuerte si es de alto impacto), «18 pozos» si > 1, nombre de la parte top en minúsculas, barra (bbl / bbl del primero; oscura si alto impacto), `n0(bbl)` y `n0(acumulado)` % (oculto en pantallas chicas y en decisión).
- Globo: título «P-201B» (+ campo); pista: nombre largo del equipo · «Sello mecánico: 71 % de sus barriles» · «tolerancia ±15,0 %» (no en decisión); filas «Diferidos», «Tolerancia ±3.111 bbl» (no en decisión), «Del total 95,6 %», «Acumulado 95,6 %», «Tipo», «Eventos», «Pozos afectados» y hasta tres partes con sus bbl.
- Se ven cinco filas y **toda fila de prioridad 1** (ISA-18.2); «ver más» abre el resto; en el papel salen todas. Vacío: «Nada diferido.»
- Resumen del gerente: tres filas con etiqueta, campo (en el portafolio), parte top o tipo en minúsculas, `n0(bbl)` y «bbl · 96 %».

**Casos borde.** Un tramo de 0 bbl (pozo sin prueba o mes sin factor) no crea fila. Un equipo que el tanque absorbió (0 bbl) no aparece aquí pero sí en el Pareto por parte.

**Quién lo calcula.** Servidor: `porEquipo: FilaEquipo[]` (`src/entities/libro.ts:408-418`, `:715-730`). El acumulado y los porcentajes, el front.

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

Las horas son las del equipo fuera, no la suma de las de cada pozo cerrado (una falla que cerró 18 pozos son las horas de la bomba). Orden: bbl descendente y, a igualdad, horas.

**Ejemplo con los datos del demo (La Ceiba, septiembre).**

| Parte | Familia | Fallas · disparos | bbl | % | Horas fuera |
|---|---|---|---:|---:|---:|
| Sello mecánico | reinyección | 1 falla | 14.649 | 68 % | 35 |
| Rodamientos | reinyección | 1 falla | 6.089 | 28 % | 16 |
| Admisión y gas | electrosumergible | sin fallas · 7 disparos | 396 | 2 % | 13 |
| Bomba de fondo | electrosumergible | sin fallas · 2 disparos | 203 | 1 % | 5 |
| Motor eléctrico | electrosumergible | sin fallas · 1 disparo | 131 | 1 % | 4 |
| Aislamiento del motor y del cable | electrosumergible | sin fallas · 1 disparo | 25 | 0 % | 2 |

El total por parte es 21.493,772 bbl (el diferido de alto impacto). Portafolio septiembre: Aislamiento del motor y del cable (ESP) 3 fallas · 4 disparos · 32.295 bbl · 36 % · 1.208 h; Bomba de fondo 3 · 8 · 28.572 · 32 % · 1.355 h; Sello mecánico (reinyección) 14.649 · 16 %; Rodamientos 6.089 · 7 %; Admisión y gas 1 · 19 · 5.894 · 6 % · 480 h; Sello mecánico (multifásica, MPP-301) 1 falla · 3.022 · 3 % · 45 h; Motor eléctrico 2 disparos · 158 · 0 %.

**Qué texto se muestra.**

- Fila: nombre de la parte en negrita; «{familia} · {N falla(s) | sin fallas}{ · M disparo(s)}»; barra (bbl / bbl de la primera, o 1 si la primera tiene 0); a la derecha `n0(bbl)` y «bbl · n0(%) %».
- Globo: «Diferidos», «Del total por parte» (`n1` %), «Familia», «Fallas», «Disparos (menos de un día)» (si hay), «Horas fuera» (`n0` h) y hasta tres equipos «P-201B · La Ceiba: 14.649 bbl». Pista (si es clicable): «Clic para ver la salud de esa parte en los equipos».
- Debajo: «+ N bbl sin la parte identificada» si `sinParte > 0`, con ⓘ «Barriles de equipos de alto impacto cuya parada no dejó primera alarma ni firma. Están en «paradas por identificar».»
- Vacío: «Ninguna falla con la parte identificada.» Ejemplo: La Ceiba en octubre (la parada abierta de P-201B no tiene parte) → vacío y «+ 2.570 bbl sin la parte identificada».

**Quién lo calcula.** Servidor: `porParte: FilaParte[]` (`src/entities/libro.ts:430-445`, `:732-763`).

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

`vigilable(campo, tipo, equipo, parte)` (`src/entities/libro.ts:596-602`): una electrosumergible **siempre** (variador y sensor de fondo vigilan todas sus partes); una bomba, si su perfil tiene instrumentada (`tags`) alguna variable de esa parte con papel `causa` o `avisa` (las de papel `confirma` no anuncian nada). En P-201B de La Ceiba (subtipo inyección, tags PI-2010, PDI-2011, FI-2011, VI-2011, TI-2011, LSH-2013, II-2011, LT-2012):

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
| Equipos de alto impacto | 21.494 · 99 % | 2.570 · 84 % | 97.496 · 93 % | 5.523 · 89 % |
| Con parte vigilada | 21.494 · 99 % | 0 · 0 % | 87.658 · 83 % | 2.953 · 47 % |
| Con parte sin instrumento | 0 · 0 % | 0 · 0 % | 0 · 0 % | 0 · 0 % |
| Sin la parte identificada | 0 · 0 % | 2.570 · 84 % | 9.838 · 9 % | 2.570 · 41 % |
| Evitable cerrando en orden | 0 · 0 % | 0 · 0 % | 4.762 · 5 % | 0 · 0 % |

En el demo ningún mes tiene barriles «sin instrumento» (todas las fallas con parte son de sello, rodamientos o de electrosumergibles). «Sin la parte identificada» en septiembre del portafolio es la parada de P-201B de Morichal del 24-sep; en octubre, la parada abierta de P-201B de La Ceiba.

**Qué texto.** Rótulo; `n0(bbl)`; `n0(100·bbl/diferido)` % en chico (vacío si el diferido es 0). Globo: «Barriles», «Del diferido». Con `conMaximo` (hoy apagado en todas las pantallas que lo usan), además la barra «diferido por día» contra el máximo y «antes N bbl/d · jul a sep».

**Quién lo calcula.** Servidor: `altoImpacto`, `anticipable`, `sinInstrumento`, `sinParte`, `evitablePorOrden`. Porcentajes, el front.

**Referencia.** `src/entities/libro.ts:798-802`; `src/widgets/diferidos/Paretos.tsx:213-262`.

---

### Por pozo (`porPozo`)

**Qué es.** Lo diferido por cada pozo en el período, sea cual sea la causa: `{ campoId, pozo, bbl, horas, eventos }` (horas = suma de las horas de sus tramos; eventos = número de tramos).

**Dónde se ve.** No en Diferidos (lo usan la pantalla de pozos e informes, otros capítulos). Viaja en `GET /api/vistas/diferidos`, no en la serie mensual.

**Ejemplo.** La Ceiba septiembre: LC-11 2.106,2 bbl en 47,6 h (3 eventos), LC-16 1.783,3 (48,7 h, 4), LC-08 1.675,4 (44,2 h, 3)… LC-21 536,5 (42,5 h, 2).
