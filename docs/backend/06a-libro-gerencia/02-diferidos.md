# 6A.2 Libro de diferidos — gerente (decisión) e ingeniería (producción, mantenimiento, confiabilidad)

**Para qué.** Decisión: «Mes a mes: a qué equipo y dónde bajar.» (`PARA_QUE_DECISION.diferidos`). Ingeniería: «Por qué, a qué equipo y parte, y si se publica.» (`PARA_QUE.diferidos`, `src/widgets/Onboarding.tsx:23`, `:35`).
**Ruta.** `#/<rol>/diferidos/<campo | campo~portafolio>/<período>` · **Roles y nivel.** `ger` (decisión); `prod`, `jefe`, `conf` (ingeniería). Operación no tiene la pantalla. `src/pages/Diferidos.tsx:40-59` (decisión) y `:61-123` (ingeniería).
**Lee.**

| Endpoint | Qué toma | Nivel |
|---|---|---|
| `GET /api/vistas/diferidos?campos&desde&hasta` | todo el libro del período (`Libro`) | los dos |
| `GET /api/vistas/diferidos/mensual?campos` | Tendencia (decisión), Mes a mes y Factor (ingeniería) | los dos |
| `GET /api/vistas/diferidos/base?campos&desde&hasta` | «+98 % frente a jul a sep» | los dos |
| `GET /api/vistas/equipos-hoy?campos` (los campos que aparecen en el Pareto) | marca de prioridad (solo en las filas de falla del equipo) y nombre largo de cada equipo del Pareto | los dos |
| `GET /api/catalogo` (arranque) | banda del campo (eje y franja del gráfico del factor) | ingeniería |

«Publicable» de POR CAMPO (portafolio de ingeniería) ya no pide `GET /api/configuracion/historial` para el criterio de cierre: desde el 8-oct sale de `motivos` del mismo libro (fila 53).

| Panel | Decisión | Ingeniería |
|---|---|---|
| Encabezado (cifra, rango, sello, valor, diferido por día) | sí, `simple` (sin «N sin identificar»; globo de la cifra sin tolerancia; globo del rango «Margen del cálculo», nota simple) | sí, completo (globo «Rango de tolerancia», nota de cálculo) |
| MES A MES | `Tendencia` (diferido **por día**, alto impacto oscuro) | `MesAMes` (barriles del mes apilados por cómo se identificó) |
| CUADRE · MEDICIÓN OFICIAL | no | sí |
| FACTOR DE ASIGNACIÓN (un campo) / POR CAMPO (portafolio) | no | sí |
| DÓNDE BAJARLO · TIPO DE CAUSA | sí | sí |
| POR EQUIPO | sí, `simple` (sin acumulado ni tolerancia) | sí |
| POR PARTE | no | sí |

El auditor exige que en `#/ger/diferidos/ceiba/curso` se vea «MES A MES» y «DÓNDE BAJARLO» y **no** «FACTOR DE ASIGNACIÓN», «CADENA DE CUSTODIA» ni «Tolerancia» (`e2e/auditoria/rutas.ts:37`, `:51`).

---

## 6A.2.1 Gerente · La Ceiba · octubre en curso

![Diferidos · gerente · La Ceiba · octubre en curso](../img/ger-diferidos-ceiba.png)

| # | Lo que se ve | En la captura | Cómo se calcula | Texto según el valor | Viene de |
|---|---|---|---|---|---|
| 1 | Barriles diferidos (40 px) | «3.043» | $\text{brecha} = \text{Potencial} - \text{Real} = 17.986{,}201 - 14.943$ — 5A §«No producido · brecha» | `n0`; debajo «barriles diferidos». Globo «Barriles diferidos» (en todos los niveles): Potencial, Real medido, Diferidos, «Σ de los eventos»: en ingeniería «3.043 bbl ±15,0 % (Res. 40236)» ($\pm = \text{tolerancia}/\text{diferido}$, `n1`); **en decisión, solo «3.043 bbl»**: quien decide no ve tolerancias (capítulo 8 §8.12; su margen es el rango de la fila 2) (`Encabezado.tsx:29-30`, `:54`; capturas `ger-diferidos-ceiba-globo-cifra` y `prod-diferidos-ceiba-globo-cifra`). Siguen Por señal, Declarado, Sin identificar, «Frecuencia reducida (aprox.)» solo si `aproximado > 0`, Período (nombre del período), Cierre «provisional» si algún `fa[].publicado` es falso, si no «publicado»; pista «Potencial (pruebas × factor de asignación) menos lo que midió el punto de medición oficial. Cada barril lleva su evento, su causa y los tags que la prueban.» (`src/widgets/diferidos/Encabezado.tsx:50-61`) | `brecha`, `potencial`, `real`, `diferido`, `tolerancia`, `identificado`, `declarado`, `pendiente`, `aproximado`, `fa[].publicado` |
| 2 | Rango | «2.587–3.500 bbl · calculado» | $[\max(0,\ \text{brecha}-\text{tol}),\ \text{brecha}+\text{tol}]$, tol = 456,480 — 5A §«Rango de los barriles diferidos» | decisión: globo «Margen del cálculo» + `NOTA_SIMPLE`; ingeniería: «Rango de tolerancia» + `NOTA_DE_CALCULO` (`Rango.tsx:34`). Fila «Aparte, aproximado: N bbl a frecuencia reducida» si hay | `brecha`, `tolerancia`, `aproximado` |
| 3 | Sello | «PROVISIONAL» | por códigos de `motivos` — 5A §«Sello de publicación» | ver 6A.1 fila 2 | `motivos[]` |
| 4 | Rótulo del valor | «valor» | `parcial` $\iff$ hay valor y `valorCampos.con < valorCampos.total` | sin `parcial`: «valor»; con `parcial` y `sinPrecio`: «valor · falta precio en *A, B*»; con `parcial` sin `sinPrecio`: «valor · *con* de *total* campos». ⓘ con `parcial`: «Valor: 4 de 5 campos con precio en todo el período; sin contar los días sin precio de La Zarza.»; sin ningún precio: ⓘ «Sin precio: Falta el precio neto en la configuración.» (`Encabezado.tsx:70-72`) | `valorCampos`, `sinPrecio` |
| 5 | Valor | «146 mil USD» | $3.043{,}201 \times 48$ — 5A §«Valor en USD» | número y unidad por separado: `usd(v).valor` («146», «1,0», «30,3») + `usd(v).unidad` («mil USD», «M USD»); sin valor: «sin precio» | `valorUsd` |
| 6 | Diferido por día | ■ «1.922 bbl/d» | $\text{brecha}/\max(1/24,\ \text{días}) = 3.043{,}201/1{,}583$ — 5A §«Meta del período» | ■ P3 si hay meta y $> \text{meta.diferidoDia}$. Globo «Diferido por día»: «Máximo firmado: 800 bbl/d», «Máximo del mes completo: 24.800 bbl» (en curso) o «Máximo del período: …», «Antes (jul a sep): 969 bbl/d» o «Antes: no hay tres meses antes del período» (`:83-86`) | `brecha`, `meta.dias`, `meta.diferidoDia`, `meta.diferidoTotal`, base |
| 7 | Barra contra el máximo | llena (1.922/800 > 1,25) | 8 §8.5 | gris; sin meta: sin barra | — |
| 8 | Máximo | «máx. 800» | `meta.diferidoDia` | «máx. *n0*» o `textoSinMeta` | `meta.diferidoDia`, `meta.sinMeta` |
| 9 | Línea base | «+98 % frente a jul a sep» | 968,853 → 1.922,021 — 5A §«Línea base» | igual que en el Resumen, y si el servidor manda `null` dice **«sin base de comparación»** (`:82`); desde el 8-oct el Resumen dice lo mismo (6A.1 fila 12) | `GET /api/vistas/diferidos/base` |
| 10 | MES A MES (decisión) | 13 barras | la misma `Tendencia` del Resumen (6A.1 fila 28) — 5A §«Tendencia del gerente» | Lectura: «Diferido por día de cada mes: lo de alto impacto, oscuro; la raya, el máximo que usted firmó para ese mes…» | `GET /api/vistas/diferidos/mensual` |
| 11 | Pasó el máximo | ■ sobre OCT-25 (y FEB, JUL) | $\text{diferido}_m/d_m > \text{meta.diferidoDia}_m$ y no parcial | 1.067 · 834 · 1.955 > 800 | ídem |
| 12 | Cifra del mes del período | «1.922» | ídem | solo el mes del período lleva borde y cifra; oct-26 no se marca aunque pase el máximo (parcial) | ídem |
| 13 | Equipos de alto impacto | «2.570 · 84 %» | `altoImpacto` — 5A §«Palancas («DÓNDE BAJARLO»)» | fila fuerte; `n0(bbl)` y `pctParte(100·bbl/diferido)` en chico: «< 1 %» si queda entre 0 y 1, nunca «0 %» (`Paretos.tsx:243`); vacío si diferido = 0. Globo: título = rótulo, «Barriles: 2.570 bbl», «Del diferido: 84 %», pista (y en el papel): «Bombas de reinyección y electrosumergibles: el foco del producto.» | `altoImpacto` |
| 14 | Con parte vigilada | «0 · 0 %» | `anticipable` | pista «La parte que falló tiene un instrumento que la vigila: se pudo saber antes.» | `anticipable` |
| 15 | Con parte sin instrumento | «0 · 0 %» | `sinInstrumento` | pista «Se sabe qué parte falló pero nada la vigila en ese equipo: hueco de instrumentación.» | `sinInstrumento` |
| 16 | Sin la parte identificada | «2.570 · 84 %» | `sinParte` (la parada abierta de P-201B del 2-oct no tiene parte) | pista «Paró sin primera alarma ni firma: hay que preguntar qué se dañó.» | `sinParte` |
| 17 | Evitable cerrando en orden | «0 · 0 %» | `evitablePorOrden` — 5A §«Evitable cerrando en orden» (P-201B cerró los 17 pozos que producían: no había orden que escoger) | pista «Al parar la reinyección, cerrar primero los pozos con menos crudo por barril de agua.» | `evitablePorOrden` |
| 18 | Número de equipos | «4 equipos» | `porEquipo.length` | `plural(n, 'equipo', 'equipos')` | `porEquipo` |
| 19 | Marca de cada fila | ◆ P1 (P-201B), ▲ P2 (LC-21), • (SE-2, LC-08) | la severidad **de hoy** del equipo, no la del período — 5B §«El equipo vivo (`EquipoVivo`)» —, y **solo en las filas de falla del equipo**: `marcaDeFila(f, hoy)` (`src/widgets/diferidos/marca.ts:10-11`; `Paretos.tsx:49-50`, `:56`) da 0 a una fila `programada` (la parada programada de hace un año o la de hoy no es una alarma); lo declarado y lo sin identificar sí son fallas y llevan la del equipo. La misma función marca los equipos de POR CAMPO del Resumen (6A.1.4) | `MarcaPrioridad`; una fila P1 nunca queda detrás de «ver N más» (ISA-18.2); una programada ya no se queda a la vista por la P1 de su equipo (6A.2.3) | `GET /api/vistas/equipos-hoy` → `[].severidad` |
| 20 | Tipo de la fila | chip «bomba de reinyección» | `porEquipo[].tipo` — 5A §«Pareto por equipo» | `TIPO_CAUSA[tipo]` en minúsculas; tono fuerte si es de alto impacto | `porEquipo[].tipo` |
| 21 | Pozos | «17 pozos» | `porEquipo[].pozos` | solo si > 1 | `porEquipo[].pozos` |
| 22 | Barriles del equipo | «2.570» y barra | `porEquipo[].bbl`; barra = bbl / bbl del primero | `n0`; barra oscura si alto impacto, clara si no. Decisión: sin columna «acumulado» ni tolerancia. Globo: título «P-201B» (+ « · Campo» en portafolio), pista = nombre largo del equipo · «*Parte*: N % de sus barriles» (si hay parte); filas Diferidos, Del total (`n1` %), Acumulado (`n1` %), Tipo, Eventos, Pozos afectados y hasta tres partes. Clic → ficha del equipo | `porEquipo[].bbl`, `eventos`, `pozos`, `partes` |
| 23 | Tipo pendiente | chip «sin identificar» (LC-21, LC-08) | tramo sin causa | `TIPO_CAUSA.pendiente` = «Sin identificar» en minúsculas, tono neutro | ídem |
| 24 | TIPO DE CAUSA · fila | «Bomba de reinyección» (negrita) | `porTipo[]` — 5A §«Pareto por tipo de causa» | alto impacto (reinyección, electrosumergible) en negrita y barra oscura | `porTipo[].tipo` |
| 25 | bbl y % del tipo | «2.570 bbl · 84 %» | $\text{bbl}_k$ y $100\,\text{bbl}_k/\text{diferido}$ | `n0` «bbl ·» `pctParte(%)` (`Paretos.tsx:190`): «< 1 %» si queda entre 0 y 1 (septiembre: «Energía eléctrica 198 bbl · < 1 %»); barra = bbl / bbl del primero | `porTipo[].bbl` |
| 26 | Sin identificar | «Sin identificar · 355 bbl · 12 %» rayada | tipo `pendiente` | barra rayada; **nunca** detrás de «ver más» (`Paretos.tsx:183`) | ídem |

La Ceiba, octubre: el Pareto por tipo trae tres filas: Bomba de reinyección 2.570 · 84 %, Sin identificar 355 · 12 %, Energía eléctrica 118 · 4 %. Por equipo: P-201B 2.570 (17 pozos), LC-21 247, SE-2 118, LC-08 109.

## 6A.2.2 Gerente · La Ceiba · septiembre cerrado

![Diferidos · gerente · La Ceiba · septiembre](../img/ger-diferidos-ceiba-cerrado.png)

| # | En la captura | Cómo sale | Qué cambia |
|---|---|---|---|
| 1 · 2 | «21.691» · «18.438–24.945 bbl · calculado» | 346.379,435 − 324.688; tol 3.253,715 (±15,0 %) | mes entero: brecha = Σ de los 49 tramos |
| 3 | «✓ PUBLICABLE» | `motivos = []` | globo «Se puede publicar»: «Cuadra con la medición oficial y tiene su cadena de custodia: se puede publicar.» |
| 5 | «1,0 M USD» | 21.691,435 × 48 = 1.041.188,894 | `usd` ≥ 10⁶ |
| 6 | «723 bbl/d» sin ■ | 21.691,435 / 30 < 800 | |
| 9 | «−16 % frente a jun a ago» | 858,375 → 723,048; el signo es U+2212 | |
| 12 | «723» sobre SEP | mes del período | la cifra se mueve al mes escogido |
| 13 | «21.494 · 99 %» | alto impacto = 20.738,857 (P-201B) + 754,913 (ESP); todo «con parte vigilada» (sello y rodamientos de P-201B, partes de ESP) | sin la parte: 0 |
| 18 · 28 | «11 equipos» · «ver 6 más» | se ven 5 y ninguna de las otras 6 es P1 | «ver N más» = filas escondidas; en el papel salen todas |
| 21 · 27 | «18 pozos» · «sello mecánico» | P-201B: sello 14.649 bbl (71 %) y rodamientos 6.089 | la parte top es la de más barriles del equipo |
| 14 | «Con parte vigilada 21.494 · 99 %», «Con parte sin instrumento 0 · 0 %», «Sin la parte identificada 0 · 0 %», «Evitable cerrando en orden 0 · 0 %» | palancas del mes (5A §«Palancas («DÓNDE BAJARLO»)»): las dos paradas de P-201B tienen parte con instrumento (sello, rodamientos) y las ESP siempre lo están; La Ceiba no tiene respaldo, así que no hubo orden que escoger | |
| 22 | las cinco filas a la vista (filas 19-23): ◆ «P-201B · bomba de reinyección · 18 pozos · sello mecánico · 20.739»; «LC-16 · electrosumergible · admisión y gas · 217»; «SE-2 · energía eléctrica · 2 pozos · 198»; «LC-11 · electrosumergible · bomba de fondo · 136»; «LC-07 · electrosumergible · motor eléctrico · 131» | `porEquipo` de septiembre por `bbl` (5A §«Pareto por equipo»); en decisión, el chip de la parte va solo (sin acumulado); «N pozos» solo si > 1; la marca es la de **hoy**: ◆ en P-201B; punto gris en LC-16, SE-2 (de La Ceiba), LC-11 y LC-07 (severidad 0 hoy: los tres pozos están cerrados por P-201B y SE-2 de La Ceiba no avisa) | ver 6A.2.1 filas 19-23 |

Tipos: Bomba de reinyección 20.739 · 96 %, Electrosumergible 755 · 3 %, Energía eléctrica 198 · < 1 % (0,91 %; antes del 8-oct se escribía «1 %» con `n0`).

## 6A.2.3 Gerente · portafolio · últimos 12 meses (no publicable)

![Diferidos · gerente · portafolio · 12 meses](../img/ger-diferidos-portafolio-doce.png)

| # | En la captura | Cómo sale | Texto según el valor |
|---|---|---|---|
| 1 · 2 | «639.507» · «584.856–694.159 bbl · calculado» | 15.917.845,243 − 15.278.338; tol 54.651,706 (cuadratura entre campos, 5A §«Tolerancia del libro») | el globo del rango agrega «Aparte, aproximado: 17.901 bbl a frecuencia reducida»; el de la cifra, «Frecuencia reducida (aprox.): 17.901 bbl» y «Σ de los eventos: 639.507 bbl» (el gerente no ve el «±8,5 %»; ingeniería sí) |
| 3 · 30 | ■ «NO PUBLICABLE» | motivo `fa-fuera-de-banda` (palmar, 2026-04) — 5A §«Motivos» | chip fuerte y ■ P3; globo «Todavía no se puede publicar»: «Todavía no se puede publicar. El Palmar, abril de 2026: factor de asignación 0,810 fuera de la banda ±15 %.» |
| 29 | «El Palmar · factor fuera de banda» | una línea corta por (campo, código), sin repetir | `CORTO` (`Sello.tsx:13-16`); no se imprime (en el papel va la frase entera) |
| 4 · 5 | «valor · falta precio en La Zarza» ⓘ · «30,3 M USD» | 30.322.929,482 | `valorCampos = 4 de 5` |
| 6 | «1.752 bbl/d» sin ■ | 639.507,243 / 365 < 2.300 | |
| 9 | «sin base de comparación» | `GET …/base` → `null` (no hay tres meses publicados antes del 1-oct-2025) | |
| 10 · 12 | Tendencia con 12 meses al frente y sus cifras (2.108 · 1.070 · 2.067 · 591 · 1.125 · 1.752 · 1.142 · 1.872 · 1.003 · 3.039 ■ · 1.680 · 3.508 ■) | todos los meses que tocan el período llevan borde y cifra; oct-26 queda sin cifra | |
| 17 | «Evitable cerrando en orden · 9.633 · 2 %» | Σ de las paradas de reinyección de los 12 meses con orden que escoger (sep: 4.762 de Morichal) | |
| 18 · 28 | «97 equipos» · «ver 88 más» | se ven 5 + toda fila P1 que venga después (MN-41, K-101, GU-09, GU-07) = 9 | antes del 8-oct, «ver 87 más»: la fila «P-201B · La Ceiba · parada programada» (3.828 bbl, la 30.ª) se quedaba a la vista por la P1 de P-201B |
| 64 · 31 | ■ P3 en SE-2 · Morichal, ▲ P2 en P-201B · Morichal | severidad de hoy del equipo, en sus filas de falla | las dos filas de parada programada van **sin marca** (`marcaDeFila`): P-201B · La Ceiba (antes ◆ P1) y MPP-301 · Morichal Norte (811 bbl, la 43.ª; antes ■ P3). La de falla de P-201B (144.598) conserva su ◆ |
| 32 | «ver 7 más» en TIPO DE CAUSA | 12 tipos, se ven 5 | ocultos: Aire de instrumentos 12.997 · 2 %, Bombeo mecánico 12.607 · 2 %, Compresión de gas 6.540 · 1 %, Parada programada 5.676 · < 1 %, Tratamiento de crudo 5.124 · < 1 %, Separación 4.505 · < 1 %, Declarada por el operario 2.968 · < 1 % (`pctParte`: antes «1 %», «1 %», «1 %» y «0 %») |

Palancas de los 12 meses: alto impacto 442.283 · 69 %, con parte vigilada 432.446 · 68 %, sin instrumento 0, sin la parte 9.838 · 2 %, evitable 9.633 · 2 %.

TIPO DE CAUSA, las cinco filas a la vista (filas 24-25; % contra `diferido` = 639.507): Electrosumergible 270.768 · 42 %, Bomba de reinyección 171.515 · 27 %, Energía eléctrica 107.594 · 17 %, Bomba multifásica 24.035 · 4 %, Evacuación del crudo 15.179 · 2 % (las siete ocultas, en la fila 32).

POR EQUIPO, las nueve filas a la vista (filas 19-22; marca = severidad de hoy del equipo en sus filas de falla): ◆ P-201B · La Ceiba · bomba de reinyección · 18 pozos · sello mecánico · 144.598; ■ SE-2 · Morichal Norte · energía eléctrica · 41 pozos · 103.043; • LC-16 · La Ceiba · electrosumergible · aislamiento del motor y del cable · 30.328; ▲ P-201B · Morichal Norte · bomba de reinyección · 26 pozos · sello mecánico · 26.917; ■ MPP-301 · Morichal Norte · bomba multifásica · 3 pozos · sello mecánico · 24.035; y, por ser P1 (nunca detrás de «ver más»): ◆ MN-41 · Morichal Norte · aislamiento del motor y del cable · 18.638; ◆ K-101 · La Ceiba · aire de instrumentos · 18 pozos · 12.997; ◆ GU-09 · Guacamayo · aislamiento del motor y del cable · 10.740; ◆ GU-07 · Guacamayo · aislamiento del motor y del cable · 3.631. «P-201B · La Ceiba · parada programada · 18 pozos · 3.828» ya no está entre ellas: sin marca, queda detrás de «ver 88 más» (y en el papel). `GET /api/vistas/diferidos` → `porTipo[]`, `porEquipo[]`; `GET /api/vistas/equipos-hoy` → `severidad`.

---

## 6A.2.4 Ingeniería · La Ceiba · octubre en curso (producción)

![Diferidos · producción · La Ceiba · octubre en curso](../img/prod-diferidos-ceiba.png)

Filas nuevas o distintas de las del gerente (1-9 y 13-26 son iguales, con la salvedad de los globos de ingeniería):

| # | Lo que se ve | En la captura | Cómo se calcula | Texto según el valor | Viene de |
|---|---|---|---|---|---|
| 33 | Sin identificar bajo el rango | «355 sin identificar» | `pendiente` = LC-21 246,514 + LC-08 108,513 — 5A §«Identificado por señal · declarado · sin identificar» | `n0` « sin identificar»; sale siempre en ingeniería, también en 0 («0 sin identificar», Morichal) | `pendiente` |
| 34 | MES A MES (ingeniería) | 13 columnas | por mes: columna apilada `identificado` (oscuro), `declarado` (gris), `pendiente` (rayado); altura = diferido — 5A §«Gráfico «MES A MES» (ingeniería)» | meses fuera del período al 42 % de opacidad; año bajo el primer mes y bajo cada enero («2025», «2026»); leyenda fija «por señal · declarado · sin identificar · máximo firmado · pasó el máximo». Globo de cada mes (no capturable sin cambiar el período, porque el toque lo abre): título «Septiembre 2026»; pista «Mes en curso: cifras parciales, cierre sin publicar.» o «Clic para ver este mes»; filas Diferidos, Identificado por señal, Declarado, Sin identificar, Alto impacto, Máximo firmado (o `textoSinMeta`), Eficiencia (`n1` %), Cierre «sin publicar \| publicable \| no publicable» (`MesAMes.tsx:67-73`) | `GET /api/vistas/diferidos/mensual` → `[].libro.identificado`, `declarado`, `pendiente`, `brecha`, `meta.diferido`, `pe`, `publicable`, `altoImpacto`, `parcial` |
| 35 | Rótulo de la columna | «60,6 k» (julio) | `brecha` del mes | `k(v)`: ≥ 1.000 → `n1(v/1000)` « k», si no `n0` (`:17`). La Ceiba: 33,1 k · 7,5 k · 23,1 k · 5,4 k · 23,3 k · 20,1 k · 18,4 k · 13,5 k · 11,5 k · 60,6 k · 6,8 k · 21,7 k · 3,0 k | `brecha` |
| 36 | Pasó el máximo | ■ sobre JUL (y OCT-25, FEB) | $\text{brecha}_m > \text{meta.diferido}_m$ (bbl del mes, no por día) y no parcial | 33.068 > 24.800; 23.349 > 22.400 (febrero: 28 días); 60.594 > 24.800 | `brecha`, `meta.diferido` |
| 37 | Mes en curso | «3,0 k» con contorno punteado | brecha de octubre a la fecha; raya del máximo **a la fecha** (1.267 bbl) | no se marca ■ aunque 3.043 > 1.267 | `parcial` |
| 38 | «en curso» bajo OCT | | `parcial` = algún campo no publicó el mes | fijo | `parcial` |
| 39 | Eje | «80,0 k» | techo $= \text{tope}(1{,}12\cdot\max_m\max(\text{brecha}_m, \text{meta.diferido}_m))$ = tope(67.865) = 80.000; marcas en 0, mitad y techo | `k()` | — |
| 40 | Potencial | «17.986» | 5A §«Potencial» | `n0`; ⓘ «Potencial: Pruebas instrumentadas de cada pozo × factor de asignación.» | `potencial` |
| 41 | − Real medido | «14.943» | 5A §«Real» | ⓘ «Real medido: Producción fiscal del punto de medición oficial.» | `real` |
| 42 | = No producido | «3.043» | brecha | negrita | `brecha` |
| 43 | Identificado por señal | «2.688» | $\text{round}(\text{diferido}) - \text{round}(\text{declarado}) - \text{round}(\text{pendiente}) = 3.043 - 0 - 355$ para que la columna sume a la vista; barra = 2.688,173/3.043,201 = 88,3 % | ⓘ «Identificado por señal: Código del controlador, primera alarma del PLC, firma de las señales o programa aprobado. Tolerancia ±15,0 % (Res. 40236).» (`Cuadre.tsx:39-40`; captura `prod-diferidos-ceiba-globo-identificado`) | `diferido`, `declarado`, `pendiente`, `identificado`, `tolerancia` |
| — | Declarado por el operario | «0» | `declarado` | barra gris; ⓘ «La señal no alcanzaba: lo respondió quien estaba en campo. Queda marcado.» | `declarado` |
| 44 | Sin identificar | «355» | `pendiente`; barra rayada 11,7 % | ■ P3 junto a la cifra **solo** si existe el motivo `sin-causa` (`Cuadre.tsx:44`); ⓘ «Eventos que ninguna señal explica y nadie ha respondido todavía.» | `pendiente`, `motivos` |
| — | Inventario entre días | (no sale) | $\lvert\text{residuo}/\text{brecha}\rvert > 0{,}0005$ — 5A §«Residuo · inventario entre días» | sale en un rango que corta meses: «Inventario entre días -496» con ⓘ «El período corta meses: el tanque de venta guarda de un día para otro. En el mes entero da cero.» | `residuo` |
| 45 | Factor de asignación (sub-bloque) | «1 mes-campo» | número de filas de `fa` del período — 5A §«Factor de asignación (FA) del mes». El estado de cada mes lo da `estadoFactor(lb, f)` (`src/widgets/diferidos/publicacion.ts:9-12`, `Cuadre.tsx:23`): «sin-verificar» si el libro trae el motivo `banda-sin-verificar` de ese campo (por el **código**, nunca por la frase); si no, `dentro` o `fuera` según `fa[].dentro` (que vale `false` en los dos casos raros: por sí sola no los distingue) | todos dentro: `plural(n, 'mes-campo', 'meses-campo')` · chip «dentro de banda»; si no, una línea por cada mes que no está dentro (`:56-64`): fuera → «■ El Palmar · 2026-04 · **0,810**» + chip fuerte «fuera de ±15 %»; banda sin verificar → la misma línea **sin** ■ y con chip neutro «banda sin verificar» (el factor puede estar bien: falta con qué compararlo; antes del 8-oct se pintaba como fuera de banda). ⓘ «Factor de asignación: Banda de la Res. 40236, Fig. 10.2. Fuera de banda: revisar pruebas y medición antes de publicar.» | `fa[].dentro`, `fa[].fa`, `fa[].banda`, `fa[].mes`, `motivos[].codigo`, `motivos[].campoId` |
| 46 | Chip | «dentro de banda» | ídem | | |
| 47 | Cadena de custodia | «Prueba estimada: LC-17» | `custodia.estimados` — 5A §«Prueba de pozo (prueba vigente)» | «Prueba estimada: *pozos*» sin marca, ⓘ «Desde la electrosumergible, sin separador.»; si no hay ningún hueco: «Pruebas instrumentadas y corte de agua en línea.» | `custodia.estimados` (claves de `refs.pozos`) |
| 48 | Botón | «Ir a Identificar» | sale si el rol tiene «causa» y `pendiente > 0` | lleva a Identificar | rol, `pendiente` |
| 49 | FACTOR DE ASIGNACIÓN (gráfico) | un punto por mes contra la franja ±15 % | `FA_m` de la serie; franja = $[1-b, 1+b]$ — 5A §«Factor de asignación (FA) del mes» y §«Banda de asignación». Estado de cada punto con `estadoFactor(m.libro, f)` (`Factor.tsx:47`) | círculo hueco dentro, ■ P3 fuera, **círculo punteado sin marca** con la banda sin verificar (`:56-59`); meses fuera del período al 50 %; eje 0,75 · 0,85 · 1,00 · 1,15 · 1,25 (`n2`, `:39`). Desde el 8-oct arranca al final, como las demás gráficas de meses (`ref={alFinal}`, `:31`): a 1.280 px se ve el mes en curso y el eje queda a la izquierda, fuera de la vista (Huecos 20). Globo (captura `prod-diferidos-ceiba-globo-factor`): «Octubre 2026 · factor 0,958», Factor 0,958, Banda 0,85 – 1,15 (con la banda sin verificar: «sin verificar»), Fiscal del mes 14.943 bbl, Cierre en curso, pista «Dentro de la banda», «Fuera de la banda: revisar pruebas, medición y pozos sin prueba» o, sin verificar, la frase del motivo que redacta el servidor («La Zarza: Sin análisis de °API del crudo; no se puede verificar el factor contra la banda de la Res. 40236.», `:50-53`). Lectura: «… La franja gris es la banda que acepta la regulación para este crudo (*fuente de la banda*).» | serie `[].libro.fa` (campo), `[].libro.real`; `GET /api/catalogo` → `campos[c].medicion.banda` |
| 50 | Acumulado del Pareto | «93 %» (LC-21) | $100\cdot\sum_{j\le i}\text{bbl}_j/\text{diferido}$ | `n0` «%», solo ingeniería y pantallas ≥ sm; globo con «Tolerancia ±*n0* bbl» y pista «tolerancia ±*n1* %» (P-201B: ±386 bbl, ±15,0 %) | `porEquipo[].bbl`, `tolerancia` |
| 51 | POR PARTE vacío | «Ninguna falla con la parte identificada.» | `porParte = []` — 5A §«Pareto por parte» | | `porParte` |
| 52 | Sin la parte | «+ 2.570 bbl sin la parte identificada» | `sinParte` | sale si > 0; ⓘ «Sin la parte identificada: Barriles de equipos de alto impacto cuya parada no dejó primera alarma ni firma. Están en «paradas por identificar».» | `sinParte` |

Serie del factor de La Ceiba (oct-25 → oct-26): 1,007 · 0,969 · 1,030 · 0,985 · 1,020 · 1,028 · 0,990 · 1,027 · 0,974 · 1,029 · 0,941 · 0,969 · 0,958, todos dentro de ±15 %.

![Globo de la cifra (ingeniería)](../img/prod-diferidos-ceiba-globo-cifra.png)
![Globo de la cifra (gerente): el mismo, sin la tolerancia ni la resolución (8.12)](../img/ger-diferidos-ceiba-globo-cifra.png)
![Globo del rango (ingeniería): «Rango de tolerancia» y la nota de cálculo](../img/prod-diferidos-ceiba-globo-rango.png)
![Globo de «Identificado por señal»](../img/prod-diferidos-ceiba-globo-identificado.png)
![Globo de un punto del factor](../img/prod-diferidos-ceiba-globo-factor.png)

Texto literal de la nota de cálculo (ingeniería, `Rango.tsx:9-13`): «Lo producido sale del punto de medición oficial. Lo no producido se calcula por asignación (prueba de cada pozo × factor de asignación × horas parado): es una estimación con su rango de tolerancia (Res. MME 40236, Ec. 22), no una medición directa. Las predicciones son escenarios, no compromisos.»

## 6A.2.5 Ingeniería · portafolio · octubre en curso (jefe de mantenimiento)

![Diferidos · jefe de mantenimiento · portafolio · octubre en curso](../img/jefe-diferidos-portafolio.png)

En el portafolio el gráfico del factor se reemplaza por **POR CAMPO** (`Diferidos.tsx:72-105`):

| # | Lo que se ve | En la captura | Cómo se calcula | Texto según el valor | Viene de |
|---|---|---|---|---|---|
| 53 | Máximo del campo, con ■ | «La Ceiba · ■ máx. 1.267 bbl» y «3.043» | ■ si `!sinMeta ∧ brecha_c > metaDiferido_c` (máximo **del período a la fecha**, en bbl: 800 × 38/24 = 1.266,667) — 5A §«Portafolio: varios campos en un libro» | «máx. *n0* bbl» o «sin meta firmada»; cifra `n0(brecha_c)`; ■ junto a la cifra si el campo no se puede publicar: `!campoPublicable(lb, campo)` (`src/widgets/diferidos/publicacion.ts:17-18`, `Diferidos.tsx:84`) = el libro trae **algún motivo de ese campo que no sea `en-curso`** (`sin-fiscal`, `sin-factor`, `banda-sin-verificar`, `fa-fuera-de-banda`, `sin-causa`, `sin-meta`): la misma regla del sello, no una propia de la pantalla. Antes del 8-oct era `sinMeta` ∨ algún `fa` fuera ∨ pendiente/potencial > criterio, que no miraba `sin-fiscal` ni `sin-factor` (5A §Huecos 9): Guacamayo con 3 días sin fiscal en septiembre salía «Publicable: sí»; ahora «no». Lectura: «… junto a la cifra, el que no se puede publicar (el sello dice por qué)». Barra de tres tramos (por señal, declarado, rayado) medida contra la brecha **del portafolio**. Globo: título = campo, pista = nota del campo, filas Diferidos, Del total (`n1` %), Por señal, Declarado, Sin identificar, Alto impacto, Máximo firmado, Publicable sí/no. Clic → ese campo | `porCampo[].brecha`, `metaDiferido`, `sinMeta`, `identificado`, `declarado`, `pendiente`, `altoImpacto`; `motivos[].campoId`, `motivos[].codigo` |
| 54 | Máximo sin ■ | «Morichal Norte · máx. 1.504 bbl» | 950 × 38/24 = 1.504,167 > 1.253,234 | | |
| 55 | Factor del portafolio | «5 meses-campo · dentro de banda» | una fila de `fa` por campo y mes (oct de los 5 campos: 0,958 · 0,981 · 0,969 · 0,987 · 1,032) | | `fa[]` |
| 56 | Sin prueba | «■ Sin prueba: ZA-09» | `custodia.sinPrueba` | ■ P3; ⓘ «Sin prueba: Su crudo llega al punto de medición pero nadie lo asigna: sube el factor del campo. No tiene diferido porque no se le inventa caudal.» | `custodia.sinPrueba` |
| 47 | Prueba estimada | «LC-17, MN-11, MN-29, GU-09» | `custodia.estimados` | | |
| 57 | Corte de agua de laboratorio | «Guacamayo, El Palmar» | `custodia.bswLaboratorio` — 5A §«Corte de agua de laboratorio» | ⓘ «No viene de un analizador en línea: es manual en origen.» | `custodia.bswLaboratorio` |
| 58 | Declarado | «86» | MN-22 de Morichal, declarada por el operario | | `declarado` |
| 61 | Tipo «Declarada por el operario» | «86 bbl · 1 %» | `porTipo` `declarada` | | |
| 59 | POR PARTE · fila | «Aislamiento del motor y del cable · electrosumergible · 3 fallas · 2.941 · bbl · 100 %» | fallas de MN-41, GU-07 y GU-09 en el período — 5A §«Pareto por parte» | nombre en negrita; «*familia* · *N falla(s) \| sin fallas*· *M disparo(s)*»; barra contra la primera; «bbl · *n0(%)* %» (contra el total por parte). Globo: Diferidos, Del total por parte (`n1` %), Familia, Fallas, Disparos (menos de un día) si hay, Horas fuera (`n0` h; aislamiento: 114 h), hasta tres equipos «MN-41 · Morichal Norte: 1.083 bbl»; pista «Clic para ver la salud de esa parte en los equipos» si el rol tiene Bombas | `porParte[]` |
| 60 | Disparo | «sin fallas · 1 disparo» (Bomba de fondo, MN-25, 12 bbl) | ESP que volvió en menos de 24 h | | `porParte[].disparos` |
| 28 | «ver 6 más» | 11 equipos; 5 visibles | | | |
| 1 | Encabezado del portafolio (filas 1-9 y 33) | «6.232» · «5.729–6.734 bbl · calculado» · «355 sin identificar» · «valor · falta precio en La Zarza» ⓘ · «299 mil USD» · ■ «3.936 bbl/d» · «máx. 2.300» · «+44 % frente a jul a sep» | el mismo libro del portafolio de octubre que el Resumen: ver 6A.1.1 filas 3-12 (mismos valores, mismas reglas); «355 sin identificar» = `pendiente` de los cinco campos (todo de La Ceiba) | filas 1-9 y 33 de este capítulo | `GET /api/vistas/diferidos?campos=ceiba,morichal,guacamayo,palmar,zarza` |
| 34 | MES A MES del portafolio (filas 34-39) | columnas «65,3 k» · «32,1 k» · «64,1 k» · «18,3 k» · «31,5 k» · «54,3 k» · «34,2 k» · «58,0 k» · «30,1 k» · ■ «94,2 k» (jul) · «52,1 k» · ■ «105,2 k» (sep) · «6,2 k» (oct, en curso); eje «0» · «75,0 k» · «150,0 k» | `brecha` de cada mes del portafolio (motor): oct-25 65.350 · nov 32.091 · dic 64.065 · ene 18.326 · feb 31.496 · mar 54.298 · abr 34.249 · may 58.035 · jun 30.095 · jul 94.200 · ago 52.076 · sep 105.227 · oct 6.232. ■ si $\text{brecha}_m > \text{meta.diferido}_m$ y no parcial: jul 94.200 > 71.300, sep 105.227 > 69.000. Techo $= \text{tope}(1{,}12 \times 105.227) = \text{tope}(117.854) = 150.000$ (`tope` de `MesAMes.tsx:11-16`: el primer $m \cdot 10^n \ge v$ con $m \in \{1;\ 1{,}5;\ 2;\ 2{,}5;\ 3;\ 4;\ 5;\ 6;\ 8;\ 10\}$) | `k()` como en la fila 35 | `GET /api/vistas/diferidos/mensual?campos=…` → `[].libro.brecha`, `meta.diferido`, `parcial` |
| 40 | CUADRE del portafolio (filas 40-44) | «Potencial 66.524 − Real medido 60.292 = No producido 6.232» · «Identificado por señal 5.791» · «Declarado por el operario 86» · «Sin identificar 355» | igual que las filas 40-44: $5.791 = 6.232 - 86 - 355$ (cifras redondeadas para que la columna sume a la vista) | | `potencial`, `real`, `brecha`, `declarado`, `pendiente` |
| 13 | DÓNDE BAJARLO del portafolio (filas 13-17) | «Equipos de alto impacto 5.523 · 89 %», «Con parte vigilada 2.953 · 47 %», «Con parte sin instrumento 0 · 0 %», «Sin la parte identificada 2.570 · 41 %», «Evitable cerrando en orden 0 · 0 %» | 5A §«Palancas»: alto impacto = P-201B de La Ceiba 2.570 (sin parte) + ESP 2.953 (con parte vigilada) | filas 13-17 | `altoImpacto`, `anticipable`, `sinInstrumento`, `sinParte`, `evitablePorOrden` |
| 24 | TIPO DE CAUSA (filas 24-26) | «Electrosumergible 2.953 · 47 %», «Bomba de reinyección 2.570 · 41 %», «Sin identificar 355 · 6 %», «Energía eléctrica 190 · 3 %», «Declarada por el operario 86 · 1 %» (fila 61), «Bombeo mecánico 77 · 1 %» (El Palmar) | `porTipo[]` del portafolio | filas 24-26 | `porTipo[]` |
| 19 | POR EQUIPO, las cinco filas a la vista (filas 19-22 y 50) | ◆ «P-201B · La Ceiba · bomba de reinyección · 17 pozos · 2.570 · 41 %»; ◆ «MN-41 · Morichal Norte · aislamiento del motor y del cable · 1.083 · 59 %»; ◆ «GU-07 · Guacamayo · … · 931 · 74 %»; ◆ «GU-09 · Guacamayo · … · 927 · 88 %»; ▲ «LC-21 · La Ceiba · sin identificar · 247 · 92 %» | acumulado = $100\cdot\sum_{j\le i}\text{bbl}_j/\text{diferido}$ con diferido 6.231,716 (fila 50) | | `porEquipo[]`, `GET /api/vistas/equipos-hoy` |
| 59 · 60 | POR PARTE | «Aislamiento del motor y del cable · 3 fallas · 2.941 bbl · 100 %»; «Bomba de fondo · sin fallas · 1 disparo · 12 bbl · < 1 %» | el % es contra el total por parte (2.953): 2.941/2.953 = 99,6 % → «100 %»; 12/2.953 = 0,4 % → «< 1 %» (`pctParte`, `Paretos.tsx:153`; antes «0 %») | | `porParte[]` |

Valores de POR CAMPO (octubre): La Ceiba 3.043 · máx. 1.267 ■ (por señal 2.688, sin identificar 355); Guacamayo 1.858 · máx. 713 ■; Morichal Norte 1.253 · máx. 1.504 (declarado 86); El Palmar 77 · máx. 79; La Zarza 0 · máx. 79. Ninguno lleva ■ junto a la cifra («Publicable: sí» en los cinco aunque el libro sea provisional: el `en-curso` no cuenta).

## 6A.2.6 Ingeniería · Morichal Norte · octubre en curso (confiabilidad)

![Diferidos · confiabilidad · Morichal Norte · octubre en curso](../img/conf-diferidos-morichal.png)

| # | En la captura | Cómo sale |
|---|---|---|
| 1 | «1.253», rango «1.065–1.441 bbl · calculado», valor «60 mil USD» | 27.873,234 − 26.620; tol 187,985; × 48 |
| 33 | «0 sin identificar» | pendiente 0 |
| 6 | «792 bbl/d» sin ■, «máx. 950» | 1.253,234 / 1,583 |
| 9 | «−33 % frente a jul a sep» | 1.182,928 → 791,516 |
| 43 · 58 | «1.167» · «86» | identificado 1.166,911; declarado 86,323 (MN-22) |
| 62 | chip «declarada por el operario» (MN-22) | tipo `declarada` |
| 64 | ■ P3 en SE-2 (2 pozos, 72 bbl) | severidad de hoy de SE-2 de Morichal: 3 (corriente de barraje subiendo) |
| 59 · 63 | «Aislamiento del motor y del cable · electrosumergible · 1 falla · 1.083 · 99 %»; «Bomba de fondo · sin fallas · 1 disparo · 12 · 1 %» | MN-41 (38 h fuera) y MN-25 |

Palancas: alto impacto 1.095 · 87 % (todo con parte vigilada: las electrosumergibles siempre lo están, 5A §Palancas); sin instrumento, sin la parte y evitable: 0 · 0 %. Tipos: Electrosumergible 1.095 · 87 %, Declarada por el operario 86 · 7 %, Energía eléctrica 72 · 6 %. Cuadre: Potencial 27.873 − Real medido 26.620 = 1.253; por señal 1.167, declarado 86, sin identificar 0; «1 mes-campo · dentro de banda»; «Prueba estimada: MN-11, MN-29». Por equipo (cuatro, todos a la vista; marca = severidad de hoy): ◆ MN-41 · electrosumergible · aislamiento del motor y del cable · 1.083 · 86 %; • MN-22 · declarada por el operario · 86 · 93 %; ■ SE-2 · energía eléctrica · 2 pozos · 72 · 99 %; • MN-25 · electrosumergible · bomba de fondo · 12 · 100 %.

Mes a mes de Morichal (filas 34-39; `brecha` del mes, motor): «28,8 k» (oct-25, 28.778) · «12,1 k» · «22,6 k» · «956» (ene: menos de 1.000 se escribe `n0`) · «2,2 k» · ■ «29,7 k» (mar, 29.691 > 29.450) · «9,1 k» · ■ «40,9 k» (may, 40.906 > 29.450) · «15,2 k» · «26,3 k» · «28,9 k» · ■ «53,6 k» (sep, 53.562 > 28.500) · «1,3 k» (oct, en curso: 1.253 contra 1.504 a la fecha, sin ■). Eje «0» · «30,0 k» · «60,0 k»: techo $= \text{tope}(1{,}12 \times 53.562) = \text{tope}(59.989) = 60.000$. Factor de Morichal: 0,987 · 0,977 · 1,007 · 0,995 · 0,943 · 0,948 · 0,947 · 1,005 · 0,995 · 1,004 · 0,955 · 0,961 · 0,981.

---

## Variantes

- **Por nivel.** Ver la tabla del principio. En decisión, además: el globo de la cifra dice «Σ de los eventos: 3.043 bbl» **sin** la tolerancia (desde el 8-oct; Huecos 3) y el del rango dice «Margen del cálculo».
- **Por rol de ingeniería.** `prod`, `jefe` y `conf` ven lo mismo sobre **sus** campos (el «portafolio» de cada rol es la suma de sus campos asignados: `prod` = La Ceiba + El Palmar; `conf` = La Ceiba + Morichal + Guacamayo; `jefe` y `ger` = los cinco; `src/entities/roles.ts:42-104`); cambia lo que se puede tocar: POR PARTE es clicable (va a Bombas) para `jefe` y `conf` (tienen «bombas»), no para `prod`; «Ir a Identificar» para los tres (tienen «causa»).
- **Portafolio vs campo.** Portafolio: POR CAMPO en vez del gráfico del factor; «· Campo» en cada fila del Pareto; el sub-bloque del factor cuenta meses-campo; la custodia junta los cinco campos.
- **Período.** En curso: «Máximo del mes completo», «PROVISIONAL», mes en curso punteado; cerrado/trimestre: «Máximo del período», «✓ PUBLICABLE»; 12 meses y año a la fecha del portafolio: «NO PUBLICABLE» por abril de El Palmar; 12 meses: «sin base de comparación».
- **Teléfono.** Los paneles se apilan; los gráficos se desplazan en horizontal y arrancan al final; la columna «acumulado» se oculta.

## Estados

| Estado | Qué se ve | Ruta del demo |
|---|---|---|
| Sin meta firmada | sin barra ni raya, «sin meta firmada (en *X*)»; sin raya ni ■ en el mes; POR CAMPO «sin meta firmada» y ■ junto a la cifra | — (escenario de firma, 5A) |
| Sin precio / falta precio | «sin precio» + ⓘ / «valor · falta precio en La Zarza» + ⓘ | `#/ger/diferidos/zarza/curso` · cualquier portafolio |
| Factor fuera de banda | sello «NO PUBLICABLE · El Palmar · factor fuera de banda»; Cuadre «■ El Palmar · 2026-04 · 0,810 · fuera de ±15 %»; gráfico del factor con ■ en abril; POR CAMPO ■ junto a la cifra de El Palmar | `#/ger/diferidos/ceiba~portafolio/doce`, `#/prod/diferidos/palmar/doce` |
| Banda sin verificar (sin °API del crudo o sin producción fiscal publicada: `bandaDe(c).verificable` falso, `src/entities/libro.ts:265-273`; la banda se acota con la fila más ancha, ±20 %) | sello «NO PUBLICABLE · La Zarza · banda sin verificar»; Cuadre «La Zarza · 2026-09 · **1,032** · banda sin verificar» **sin** ■ y con chip neutro; gráfico del factor con todos los puntos de La Zarza punteados y sin marca, globo «Banda: sin verificar» con la frase del motivo; POR CAMPO ■ junto a la cifra de La Zarza («Publicable: no») | — (escenario de verificar-libro §10: `zarza.api = null`; corrido: septiembre del portafolio trae solo el motivo `banda-sin-verificar` de La Zarza, factor 1,032 con `dentro` falso → «sin verificar»; los otros cuatro, dentro; Huecos 17) |
| Días sin fiscal en un campo | sello «… · faltan días de fiscal»; POR CAMPO ■ junto a la cifra de ese campo («Publicable: no») | — (escenario de 5A §9: Guacamayo sin los 3 últimos días de septiembre) |
| Mucho sin identificar (`sin-causa`) | ■ en «Sin identificar» del Cuadre y línea «La Ceiba · mucho sin identificar» | — (La Ceiba está en 1,974 % contra 2 %) |
| Rango que corta meses | fila «Inventario entre días -496» en el Cuadre | `#/prod/diferidos/ceiba/2026-09-15_2026-10-02` |
| Frecuencia reducida | Cuadre «N bbl aproximados · frecuencia reducida» + ⓘ; globos con «Aparte, aproximado» | `#/conf/diferidos/morichal/2026-02-01_2026-02-28` (1.001 bbl; producción no tiene Morichal) |
| Nada diferido | Paretos «Nada diferido.»; POR PARTE «Ninguna falla con la parte identificada.» | — |

## Interacciones

| Clic | Hace | Pide |
|---|---|---|
| Un mes de la Tendencia o de Mes a mes | rango a la medida de ese mes | libro, base y serie de ese mes |
| Fila de POR EQUIPO | cambia al campo (portafolio) y abre la ficha del equipo | `GET /api/vistas/equipos/:campo/:equipo`, `…/historia`, `…/ficha` |
| Fila de POR PARTE | va a Bombas (si el rol la tiene) | — |
| Fila de POR CAMPO | cambia al campo | — |
| «ver N más» / «ver menos» | muestra el resto (no pide nada) | — |
| «Ir a Identificar» | va a Identificar | `GET /api/vistas/paradas/por-identificar` |
