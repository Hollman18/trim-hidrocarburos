# 5A.3 · Potencial, real y diferido: el libro

El libro (`libro()`, `src/entities/libro.ts:676-879`) responde `GET /api/vistas/diferidos?campos=&desde=&hasta=`. Aquí, cada cifra de ese objeto que no es tolerancia, período, meta, publicación ni Pareto (que van en 5A.4 a 5A.8).

Notación común: $d$ recorre los días del período (hora de Colombia); $h_d$ son las horas del día $d$ que caen dentro de $[\text{desde}, \min(\text{hasta}, \text{ahora}))$; $H_d$ las horas del día dentro de su mes (24, salvo hoy); $m(d)$ el mes del día; $\text{FA}_{m}$ el factor del mes (5A.2); $q_{p,d}$ el crudo de la prueba vigente del pozo $p$ el día $d$.

---

### Real (producción real medida)

**Qué es.** Lo que midió el punto de medición oficial en el período, en barriles netos.

**Dónde se ve.** Diferidos → encabezado, globo «Barriles diferidos» → fila «Real medido»; Cuadre → «− Real medido» (ⓘ «Producción fiscal del punto de medición oficial.»). Producción → barra «producción real» (`#/prod/produccion/ceiba/curso`, `#/ger/produccion/…`). Resumen del gerente → «PROMEDIO DIARIO · producción» (dividido por días) y «TOTAL DEL PERÍODO» o «CIERRE PROYECTADO» (5A.6).

**Fórmula.**

$$
\text{Real} = \sum_{c} \ \sum_{d \,:\, F_{c,d}\ \text{existe y}\ \text{FA}_{c,m(d)}\ \text{existe}} F_{c,d}\cdot\frac{h_d}{H_d}
$$

| Símbolo | Significado | Unidad | De dónde sale |
|---|---|---|---|
| $F_{c,d}$ | fiscal del campo $c$ el día $d$ | bbl | `produccion-diaria` |
| $h_d / H_d$ | fracción del día dentro del período (prorrateo si el período corta un día) | — | calendario |

**Ejemplo con los datos del demo.** La Ceiba, septiembre: $\sum F_d = 324.688$ bbl (30 días completos) → «324.688». La Ceiba, octubre en curso: $11.105 + 3.838 = 14.943$ → «14.943». Portafolio septiembre: 1.163.047; octubre: 60.292.

**Casos borde.** Día sin fiscal: no suma (y el potencial de ese día tampoco). Día de un mes sin factor: tampoco suma, aunque tenga fiscal (`src/entities/libro.ts:705`). Con varios campos, cada uno pone lo suyo.

**Qué texto.** `n0` + « bbl» (o «bbl/d» dividido por días).

**Quién lo calcula.** Servidor. `Libro.real` (y `porCampo[].real`).

**Referencia.** `src/entities/libro.ts:698-709`; `referencia/diferidos/ceiba-2026-09.json` → `real = 324688`.

---

### Potencial

**Qué es.** Lo que el campo habría producido si todos sus pozos con prueba hubieran estado abiertos todo el período, llevado a lo medido con el factor de asignación. FUENTE_POTENCIAL: «Pruebas instrumentadas de cada pozo × factor de asignación».

**Dónde se ve.** Cuadre → «Potencial» (ⓘ con esa fuente); globo del encabezado → «Potencial»; Producción → cifra «potencial» con su pie «N bbl/d» (ⓘ en ingeniería: «Pruebas de los pozos × factor de asignación.»; en decisión: «Lo que los pozos podían dar.»); curva discontinua de «Día a día».

**Fórmula.**

$$
\text{Potencial} = \sum_{c}\ \sum_{d \,:\, F_{c,d},\ \text{FA}_{c,m(d)}} \ \sum_{p \,\in\, \text{pozos con prueba de } c} q_{p,d}\cdot \text{FA}_{c,m(d)} \cdot \frac{h_d}{24}
$$

**Ejemplo con los datos del demo.** La Ceiba, septiembre: 346.379,435 bbl → «346.379». Día a día va de 11.579,73 (1-sep) a 11.488,65 (30-sep) porque las pruebas cambian. Octubre en curso: 17.986,201 → «17.986» (11.359,706 del 1-oct + 6.626,495 de las 14 h del 2-oct). Portafolio septiembre: 1.268.274,224; octubre: 66.523,716.

Pie de Producción: $\text{potencial} \times 24 / \sum h$ con $\sum h$ = horas de los días del período (720 en septiembre; 38 en octubre): «11.546 bbl/d» (La Ceiba sep), «11.360 bbl/d» (La Ceiba oct).

**Casos borde.** Pozo sin prueba: no suma (no se le inventa caudal). Día sin fiscal o mes sin factor: no suma. El potencial **no descuenta** nada: es «todo abierto».

**Quién lo calcula.** Servidor. `Libro.potencial`.

**Referencia.** `src/entities/libro.ts:51`, `:706-709`.

---

### No producido · brecha (barriles diferidos del encabezado)

**Qué es.** Potencial menos real: lo que no se produjo pudiendo. **Es el número que manda la pantalla de Diferidos** y el del resumen del gerente.

**Dónde se ve.** Encabezado de Diferidos y del Resumen del gerente: cifra de 40/44 px «**21.691**» + «barriles diferidos». Cuadre: «= No producido». Mes a mes: rótulo de cada columna (`k()`: «21,7 k»; la altura apilada es el diferido, igual en un mes entero). Por campo. Producción: «Diferido» (no se muestra como cifra; es el área sombreada de la gráfica).

**Fórmula.**

$$
\text{brecha} = \text{Potencial} - \text{Real}
$$

**Ejemplo con los datos del demo.**

| Período | Potencial | Real | Brecha | Pantalla |
|---|---:|---:|---:|---|
| La Ceiba · sep (cerrado) | 346.379,435 | 324.688 | 21.691,435 | «21.691» |
| La Ceiba · oct (en curso) | 17.986,201 | 14.943 | 3.043,201 | «3.043» |
| Portafolio · sep | 1.268.274,224 | 1.163.047 | 105.227,224 | «105.227» |
| Portafolio · oct | 66.523,716 | 60.292 | 6.231,716 | «6.232» |

**Casos borde.** Puede ser negativa en un día suelto (el tanque de venta entregó más de lo que produjeron los pozos ese día). En un mes entero es igual a la suma de los eventos (abajo).

**Qué texto.** `n0(brecha)` sin unidad en la cifra grande; «barriles diferidos» debajo. Globo del encabezado: filas «Potencial», «Real medido», «Diferidos», «Σ de los eventos … ±x % (Res. 40236)» (en `decision`, sin la tolerancia: solo los barriles), «Por señal», «Declarado», «Sin identificar», «Frecuencia reducida (aprox.)» (solo si hay), «Período» (el nombre del período, p. ej. «Septiembre, cerrado») y «Cierre: provisional | publicado» (`provisional` si algún `fa[].publicado` es falso).

**Quién lo calcula.** Servidor. `Libro.brecha`.

**Referencia.** `src/entities/libro.ts:856`; `src/widgets/diferidos/Encabezado.tsx:50-61`.

---

### Tramo: el diferido de un evento de pozo

**Qué es.** Lo que costó **un evento del controlador de un pozo** dentro del período: barriles, horas, factor, causa y tolerancia. Es la unidad de la cadena de custodia: cada barril diferido pertenece a un tramo, que tiene su evento, su hora del PLC y su causa (`causa-senal.ts`, otro capítulo).

**Dónde se ve.** No como fila en Diferidos; sí en la ficha de cada pozo y de cada bomba (tramos que se le cargan), en «Paradas por identificar» y en todas las agregaciones del libro (Pareto, palancas, día a día).

**Fórmula.**

$$
\text{bbl}_e = \sum_{d} q_{p,d}\cdot \text{FA}_{c,m(d)}\cdot h^{\text{ef}}_{e,d}\cdot \frac{f_{e,d}}{24}
$$

$$
\text{horas}_e = \sum_d h^{\text{ef}}_{e,d} \qquad \text{factor}_e = \max_d f_{e,d}
$$

| Símbolo | Significado | Unidad | De dónde sale |
|---|---|---|---|
| $h^{\text{ef}}_{e,d}$ | horas del evento en el día, recortadas al período y sin lo que cubre otro evento del pozo | h | 5A.2 |
| $f_{e,d}$ | 1 si es paro; $1 - hz/hz_{\text{prueba}}$ (entre 0 y 1) si es HZ | — | 5A.2 |
| $\text{FA}$ | factor del mes de ese día; si el mes no tiene, 0 y el tramo queda `sinFactor` | — | 5A.2 |

Campos del tramo (contrato: `{ evento, pozo, causa, inicio, fin, abierto, horas, factor, bbl, aproximado, sinCustodia, sinFactor, sesgo, azar }`):

| Campo | Regla |
|---|---|
| `inicio`, `fin` | el evento recortado al período (`fin` = ahora si sigue abierto) |
| `abierto` | `evento.fin === null` |
| `aproximado` | `evento.codigo === 'HZ'` (frecuencia reducida: ley de afinidad) |
| `sinCustodia` | el pozo no tiene pruebas |
| `sinFactor` | algún día del tramo cae en un mes sin FA |
| `sesgo` | banda del campo (5A.4) |
| `azar` | $\sqrt{2}\cdot(1/3600)/\text{horas}$; 0 si es aproximado o sin horas |

**Ejemplo con los datos del demo (paro).** LC-11, evento `EP-LC11-260910-79` (CMD, causa: bomba de reinyección P-201B, parte «sello», por señal: «Se cerró porque la bomba de reinyección estaba parada y el tanque de agua lleno»; evidencia «ZS-2011 · marcha → paro · 9 de sept, 21:14», «Primera alarma LSH-2013 · fuga de sello detectada», «VSD-LC11 · código CMD · 10 de sept, 02:03»). Prueba vigente: 1.097 bbl/d (11-jul-2026). FA de septiembre 0,968934.

| Día | Horas | bbl |
|---|---:|---:|
| 10-sep | 21,950 | $1.097 \times 0{,}968934 \times 21{,}95/24 = 972{,}13$ |
| 11-sep | 9,233 | $1.097 \times 0{,}968934 \times 9{,}233/24 = 408{,}93$ |
| **Tramo** | **31,183** | **1.381,059** |

Otro, de un solo día: LC-04, `EP-LC04-260906-65` (UV → energía, alimentador SE-2), 3,883 h × 861 bbl/d × 0,968934 / 24 = **134,987** bbl.

**Ejemplo (frecuencia reducida).** MN-07 (Morichal), `EP-MN07-260214-16`, código HZ a 47 Hz, prueba del 8-ene-2026 con 637 bbl/d a 59 Hz, FA de febrero 0,943: $f = 1 - 47/59 = 0{,}2034$; 24,55 h → **125,017** bbl, `aproximado: true`.

**Casos borde.**

| Caso | Resultado |
|---|---|
| Pozo sin prueba | `bbl = 0`, `sinCustodia: true` (el tramo existe: el evento pasó) |
| Mes sin factor | esa parte vale 0, `sinFactor: true` |
| HZ sin `hz` o prueba sin `hz` | $f = 1$ (se cuenta como cerrado) y `aproximado: true` |
| Evento abierto | llega hasta ahora; `abierto: true` |
| Evento tapado por otro del mismo pozo | sus horas efectivas bajan (pueden quedar en 0) |
| Evento de un día sin fiscal | **sí** suma bbl (con el FA del mes), aunque ese día no entre a lo real ni al potencial: rompe la identidad (ver residuo) |

**Quién lo calcula y por dónde viaja.** Servidor (`tramosDe`, `src/entities/libro.ts:314-347`). `GET /api/vistas/diferidos` → `tramos[]` con `evento` y `pozo` como claves de `refs.eventos` y `refs.pozos`. La serie mensual no los trae.

---

### Diferido (Σ de los eventos)

**Qué es.** La suma de los tramos del período: lo que se le puede cargar a un evento con causa.

**Dónde se ve.** Globo del encabezado: «Σ de los eventos: 21.691 bbl ±15,0 % (Res. 40236)» (el gerente, nivel `decision`, ve «21.691 bbl» sin la tolerancia). Cuadre: es la base de «Identificado por señal». Paretos y palancas: los porcentajes van contra él. Producción (ingeniería): columna «Diferido» del cuadre diario/mensual. Tendencia del gerente: diferido por día de cada mes.

**Fórmula.**

$$
\text{diferido} = \sum_{e \,\in\, \text{tramos}} \text{bbl}_e
$$

**Ejemplo.** La Ceiba sep: 49 tramos, 21.691,435 bbl. Octubre en curso: 20 tramos, 3.043,201 bbl. Portafolio sep: 104 tramos, 105.227,224; oct: 28 tramos, 6.231,716.

**Quién lo calcula.** Servidor. `Libro.diferido`.

---

### Identidad del libro: potencial − real = Σ eventos

**Qué es.** La prueba de que el libro cuadra con la medición oficial: en un mes entero la brecha y la suma de los diferidos son **el mismo número**, no dos parecidos.

**Fórmula (demostración).** Con un mes $m$, días con fiscal, y $T_m$ de 5A.2:

$$
\text{Potencial}_m - \text{Real}_m
= \text{FA}_m \sum_{d,p} q_{p,d}\frac{H_d}{24} - \text{FA}_m\, T_m
= \text{FA}_m \sum_{d,p} q_{p,d}\frac{P_{p,d}}{24}
= \sum_e \text{bbl}_e
$$

porque $\text{Real}_m = R_m = \text{FA}_m\,T_m$ y $T_m = \sum q\,(H_d - P_{p,d})/24$. Vale igual para el mes en curso hasta ahora (su FA es de esos mismos días).

**Ejemplo con los datos del demo.** La Ceiba sep: 346.379,435 − 324.688 = 21.691,435 = Σ de 49 tramos. Octubre en curso: 17.986,201 − 14.943 = 3.043,201 = Σ de 20 tramos. `verificar-libro.mjs` sección 1 lo comprueba con tolerancia $10^{-9}$ relativa en cada mes y campo, y además: identificado + declarado + pendiente = diferido; planeado + noPlaneado = diferido; Σ `porEquipo` = diferido.

**Cuándo NO es exacta.**

1. Un período que corta un mes (o un día): ver «residuo».
2. Un evento en un día **sin fiscal**: su diferido está en los tramos pero el día no entra en potencial ni real. Residuo = −(diferido de ese día).
3. $P_{p,d} > H_d$ (más horas perdidas que horas del día, por datos malos): el `max(0, …)` del teórico rompe la igualdad.

**Quién lo comprueba.** El backend tiene que cumplirla (`CONTRATO.md:1069-1071`); la referencia la trae implícita (`brecha`, `diferido`, `residuo` de `referencia/diferidos/*.json`).

---

### Residuo · inventario entre días

**Qué es.** Lo que no explican los eventos: $\text{brecha} - \text{diferido}$. Físicamente, el **inventario del tanque de venta**: el PMO mide lo que se despacha cada día, no lo que producen los pozos ese día; lo que el tanque guarda hoy sale mañana. Como el factor es mensual, en el mes se compensa; en un día suelto o en un período que corta meses, no.

**Dónde se ve.** Cuadre → fila «Inventario entre días» (ⓘ «El período corta meses: el tanque de venta guarda de un día para otro. En el mes entero da cero.»), **solo si** $|\text{residuo}/\text{brecha}| > 0{,}0005$. Producción → columna «Inventario» del cuadre diario y fila «Inventario entre días» del globo de cada día.

**Fórmula.**

$$
\text{residuo} = \text{brecha} - \text{diferido} = \text{Potencial} - \text{Real} - \sum_e \text{bbl}_e
$$

**Ejemplo con los datos del demo.**

- Mes entero: La Ceiba sep → 0 (fila oculta).
- Día suelto, 10-sep (P-201B parada): potencial 11.557,447; real 1.090; brecha 10.467,447; diferido 10.463,723; **residuo 3,724** → cuadre diario «4».
- 1-sep: potencial 11.579,732, real 11.700, diferido 0 → residuo −120,268 → «-120» (`n0` de es-CO usa el guion «-»).
- Rango a la medida 15-sep → 10-oct (llega hasta ahora): brecha 8.976,505, diferido 9.472,825, **residuo −496,320** (16 días de septiembre, que no compensan su mes; octubre aporta 0) → el Cuadre muestra «Inventario entre días -496» porque $496/8.977 = 5{,}5\,\% > 0{,}05\,\%$.

**Casos borde.** Día sin fiscal: `residuo: null` en el día a día («—»). Brecha 0: `residuoRel = 0`, la fila no sale.

**Quién lo calcula.** Servidor: `Libro.residuo`; `Dia.residuo`.

**Referencia.** `src/entities/libro.ts:501-503`, `:856`, `:1020`; `src/widgets/diferidos/Cuadre.tsx:24`, `:46-49`.

---

### Eficiencia (real / potencial)

**Qué es.** Qué fracción del potencial salió por el PMO.

**Dónde se ve.** Producción → apoyo de la barra «producción real»: «10.823 bbl/d · eficiencia 93,7 %»; cuadre diario/mensual → columna «Eficiencia»; globo de cada día de la gráfica; Mes a mes → «Eficiencia» del globo de cada mes. Resumen de campo (`ResumenCampo`) → «Eficiencia» en el globo de «producción contra su meta».

**Fórmula.**

$$
\text{pe} = \begin{cases} 100\cdot\dfrac{\text{Real}}{\text{Potencial}} & \text{Potencial} > 0 \\ 0 & \text{si no} \end{cases}
$$

**Ejemplo.** La Ceiba sep: $324.688/346.379{,}435 = 93{,}738\,\%$ → «93,7 %». Octubre: 83,080 → «83,1 %». Portafolio sep: 91,703 → «91,7 %»; oct: 90,632 → «90,6 %». Día 10-sep: $1.090/11.557{,}447 = 9{,}4\,\%$. Día 30-sep: 100,9 % (un día puede pasar de 100 % por el inventario).

**Casos borde.** Potencial 0: el libro devuelve 0 (la pantalla diaria pone «—» si el día no tiene fiscal o el potencial es 0).

**Qué texto.** `n1` + « %».

**Quién lo calcula.** Servidor: `Libro.pe`, `porCampo[].pe`; el del día lo calcula el front con `Dia.real / Dia.potencial`.

---

### Sin paradas programadas (eficiencia sin lo programado)

**Qué es.** La eficiencia si solo contaran las fallas: se descuenta lo que estaba en el programa de paradas aprobado; lo sin identificar cuenta como falla.

**Dónde se ve.** `ResumenCampo` (`src/pages/Resumen.tsx:70-73`): cifra «sin paradas programadas» en %, con globo «Eficiencia sin programadas», «Programado … bbl», «No planeado … bbl». Mantenimiento (jefe, `#/jefe/mantenimiento/…`): «del diferido, programado» en % con «X bbl · Y bbl no programado».

**Fórmula.**

$$
\text{planeado} = \sum_{e\,:\,\text{causa} = \text{programada}} \text{bbl}_e
\qquad
\text{noPlaneado} = \text{diferido} - \text{planeado}
$$

$$
\text{peNoPlan} = 100 - 100\cdot\frac{\text{noPlaneado}}{\text{Potencial}}
\qquad
\text{planPct} = 100\cdot\frac{\text{planeado}}{\text{diferido}}
$$

**Ejemplo con los datos del demo.** La Ceiba, agosto de 2026: P-201B estuvo en mantenimiento preventivo programado (PR-2011-260819, 19-ago 17:49 a 20-ago 09:34) y cerró 18 pozos. Planeado 3.827,527 bbl; no planeado 3.021,786; potencial 349.181,313; eficiencia 98,038 %; **sin paradas programadas 99,135 %** → «99,1 %»; Mantenimiento: «55,9 %» con «3.828 bbl · 3.022 bbl no programado». Septiembre y octubre no tienen paradas programadas: planeado 0, peNoPlan = pe (93,7 % y 83,1 %).

**Casos borde.** Diferido 0: `planPct = 0`. Potencial 0: `peNoPlan = 0`.

> **Alcance.** Con los roles de hoy, `ResumenCampo` no se alcanza: la pantalla «resumen» solo la tiene el gerente, que es nivel decisión y ve `ResumenDirectivo` (ver «Huecos y dudas»).

**Quién lo calcula.** `planeado` y `noPlaneado`: servidor. Los porcentajes: front.

---

### Identificado por señal · declarado · sin identificar (pendiente)

**Qué es.** Partición del diferido según **cómo se supo la causa** de cada tramo:

- **Pendiente** (sin identificar): `causa.tipo === 'pendiente'`: ninguna señal lo explica y nadie respondió.
- **Declarado**: lo dijo una persona: `causa.tipo === 'declarada'`, o la causa es «declarado» y el evento de la causa es el propio evento del pozo (una parada propia del pozo declarada, con o sin parte de su electrosumergible). Una bomba de la línea con la parte declarada **no** cuenta aquí: que paró lo prueba su PLC (`esDeclarado`, `src/entities/libro.ts:48-49`).
- **Identificado** (por señal): el resto: código del controlador, primera alarma, firma o programa.

**Dónde se ve.** Cuadre: tres filas con barra (% de la brecha): «Identificado por señal» (oscuro), «Declarado por el operario» (gris claro), «Sin identificar» (rayado; con el cuadrado P3 si existe el motivo `sin-causa`). Encabezado (ingeniería): «355 sin identificar» bajo el rango. Mes a mes: los tres tramos de cada columna. Por campo (Diferidos, portafolio): la barra de tres colores.

**Fórmula.**

$$
\text{pendiente} = \sum_{\text{tipo} = \text{pendiente}} \text{bbl}
\quad
\text{declarado} = \sum_{\text{esDeclarado}} \text{bbl}
\quad
\text{identificado} = \text{diferido} - \text{pendiente} - \text{declarado}
$$

En el Cuadre, la fila «Identificado por señal» se pinta como $\text{round}(\text{diferido}) - \text{round}(\text{declarado}) - \text{round}(\text{pendiente})$ para que la columna sume a la vista (`src/widgets/diferidos/Cuadre.tsx:39`); su barra usa el valor sin redondear.

**Ejemplo con los datos del demo.**

| Período | Identificado | Declarado | Pendiente | Cuadre muestra |
|---|---:|---:|---:|---|
| La Ceiba · sep | 21.691,435 | 0 | 0 | 21.691 · 0 · 0 |
| La Ceiba · oct | 2.688,173 | 0 | 355,027 | 2.688 · 0 · 355 |
| Portafolio · sep | 104.818,100 | 409,124 | 0 | 104.818 · 409 · 0 |
| Portafolio · oct | 5.790,366 | 86,323 | 355,027 | 5.791 · 86 · 355 |

Lo pendiente de La Ceiba en octubre son dos cierres de pozo sin causa: LC-21 (`EP-LC21-261001-01`, CMD, abierto desde el 1-oct 18:20, 19,667 h, 246,514 bbl) y LC-08 (`EP-LC08-261001-02`, CMD, del 1-oct 22:15 al 2-oct 01:10, 2,917 h, 108,513 bbl; volvió a arrancar sin respuesta: no conformidad).

**Casos borde.** Una parada de bomba sin parte identificada **no** es pendiente: el pozo cerró por la bomba (identificado) y lo que falta es la parte (`sinParte`, 5A.8). Ejemplo: la parada abierta de P-201B del 2-oct (2.570,257 bbl) es identificada sin parte.

**Quién lo calcula.** Servidor: `identificado`, `declarado`, `pendiente` (también por campo).

---

### Alto impacto

**Qué es.** Lo diferido por los equipos foco del producto: **bombas de reinyección** y **electrosumergibles** (`ALTO_IMPACTO = ['reinyeccion', 'electrosumergible']`, `src/entities/causa-senal.ts:57`). Lo programado y lo declarado son otros tipos de causa y no entran aunque el equipo sea uno de esos.

**Dónde se ve.** Palancas «DÓNDE BAJARLO» → «Equipos de alto impacto» (fila fuerte); Resumen del gerente → «84 % del diferido · reinyección y electrosumergibles» y «antes → con TRIM» (5A.6); Mes a mes → «Alto impacto» del globo; Tendencia → barra oscura; Por campo → «Alto impacto» del globo; Pareto por tipo → filas en negrita.

**Fórmula.**

$$
\text{altoImpacto} = \sum_{e\,:\,\text{causa.tipo} \,\in\, \{\text{reinyeccion},\ \text{electrosumergible}\}} \text{bbl}_e
$$

**Ejemplo.** La Ceiba sep: 20.738,857 (P-201B) + 754,913 (ESP) = **21.493,771** → «21.494» (99 % del diferido). Octubre: 2.570,257 (84 %). Portafolio sep: 97.495,953 (93 %); oct: 5.523,051 (89 %).

**Quién lo calcula.** Servidor: `Libro.altoImpacto`, `porCampo[].altoImpacto`.

---

### Evitable cerrando en orden

**Qué es.** Cuando para la bomba de reinyección y no cabe toda el agua, hay que quitar agua cerrando pozos. Si se cierran primero los que dan **menos crudo por barril de agua**, se quita la misma agua perdiendo menos crudo. Es lo que se habría perdido de menos con ese orden, **sin tocar ningún equipo**.

**Dónde se ve.** Palancas → «Evitable cerrando en orden» (pie: «Al parar la reinyección, cerrar primero los pozos con menos crudo por barril de agua.»). `ResumenCampo` → cifra «evitable cerrando en orden» con «Del diferido».

**Fórmula.** Por cada parada de reinyección con tramos de barriles en el período ($E$ = sus tramos):

$$
C_{\text{real}} = \sum_{t\in E} q_t \cdot f_t \qquad W = \sum_{t\in E} w_t \cdot f_t
$$

$$
C_{\text{óptimo}} = \text{crudo de cerrar, en orden creciente de } \frac{q_p}{\max(1, w_p)},\ \text{hasta quitar } W \ (\text{el último, en fracción})
$$

$$
\text{evitable}_E = \begin{cases} \left(\sum_{t\in E}\text{bbl}_t\right)\cdot\left(1 - \dfrac{C_{\text{óptimo}}}{C_{\text{real}}}\right) & C_{\text{real}} > 0 \ \wedge\ C_{\text{óptimo}} < C_{\text{real}} \\ 0 & \text{si se cerró todo el campo o no hay mejora}\end{cases}
\qquad
\text{evitablePorOrden} = \sum_E \text{evitable}_E
$$

| Símbolo | Significado | Unidad | De dónde sale |
|---|---|---|---|
| $q_t, w_t$ | crudo y agua de la prueba vigente del pozo del tramo, el día del **primer** tramo | bbl/d | pruebas |
| $f_t$ | factor del tramo (1 si paro) | — | tramo |
| candidatos | pozos con prueba que producían cuando empezaron los cierres (los ya parados por otra causa no tienen agua que quitar), más los que se cerraron | — | eventos del pozo |

**Ejemplo con los datos del demo.**

- La Ceiba, paradas de P-201B del 9-sep (`EV-2011-0909`) y del 22-sep (`EV-2011-0922`): cerraron los **18** pozos del campo: no había orden que escoger → **0**.
- Morichal, parada de P-201B del 24-sep (`EV-M2011-260924`): cerró 8 pozos (MN-17, MN-16, MN-23, MN-35, MN-15, MN-02, MN-08, MN-04) con $C_{\text{real}} = 3.477$ bbl/d y $W = 6.645$ bbl/d de agua; 9.837,822 bbl diferidos. El orden óptimo quita la misma agua con MN-27 (522 crudo / 1.978 agua), MN-36 (509 / 1.906), MN-13 (325 / 1.178) y el 98 % de MN-39 (437,9 / 1.583): $C_{\text{óptimo}} = 1.793{,}872$. Evitable $= 9.837{,}822 \times (1 - 1.793{,}872/3.477) = $ **4.762,242** → Palancas del portafolio sep: «4.762 · 5 %».

**Casos borde.** Sin tramos con barriles: 0. Un pozo sin prueba no es candidato. El día de la prueba es el del primer tramo recortado al período: una parada que empezó el mes anterior usa las pruebas del primer día del período. La fracción del último pozo se usa en la práctica bajándole la frecuencia o estrangulándolo.

**Quién lo calcula.** Servidor: `Libro.evitablePorOrden` (`evitableDeEvento`, `ordenOptimo`: `src/entities/libro.ts:912-957`). La misma `ordenOptimo` arma el orden de cierre de la predicción (otro capítulo).

---

### Inventario de cifras del objeto `Libro`

| Campo | Sección | Tipo |
|---|---|---|
| `desde`, `hasta` | 5A.5 | ISO |
| `tramos` | esta | `Tramo[]` por clave |
| `real`, `potencial`, `brecha`, `diferido`, `residuo`, `pe` | esta | bbl, % |
| `tolerancia`, `aproximado` | 5A.4 | bbl |
| `identificado`, `declarado`, `pendiente`, `planeado`, `noPlaneado`, `altoImpacto`, `evitablePorOrden` | esta | bbl |
| `anticipable`, `sinInstrumento`, `sinParte`, `porTipo`, `porEquipo`, `porParte`, `porPozo` | 5A.8 | bbl |
| `porCampo` | 5A.5 y 5A.6 | por campo |
| `fa` | 5A.2 | `FilaFA[]` |
| `custodia` | 5A.1 y 5A.7 | pozos por clave |
| `preguntas` | (capítulo de causas) | `Pregunta[]` |
| `meta`, `valorUsd`, `valorCampos`, `sinPrecio` | 5A.6 | |
| `sinFiscal`, `sinFactor`, `publicable`, `motivos` | 5A.7 | |
