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

**Ejemplo con los datos del demo.** La Ceiba, septiembre: $\sum F_d = 338.662$ bbl (30 días completos) → «338.662». La Ceiba, octubre en curso: $11.105 + 5.836 = 16.941$ → «16.941». Portafolio septiembre: 1.234.322; octubre: 64.147.

**Casos borde.** Día sin fiscal: no suma (y el potencial de ese día tampoco). Día de un mes sin factor: tampoco suma, aunque tenga fiscal (`src/entities/libro.ts:705`). Con varios campos, cada uno pone lo suyo.

**Qué texto.** `n0` + « bbl» (o «bbl/d» dividido por días).

**Quién lo calcula.** Servidor. `Libro.real` (y `porCampo[].real`).

**Referencia.** `src/entities/libro.ts:698-709`; `referencia/diferidos/ceiba-2026-09.json` → `real = 338662`.

---

### Potencial

**Qué es.** Lo que el campo habría producido si todos sus pozos con prueba hubieran estado abiertos todo el período, llevado a lo medido con el factor de asignación. FUENTE_POTENCIAL: «Pruebas instrumentadas de cada pozo × factor de asignación».

**Dónde se ve.** Cuadre → «Potencial» (ⓘ con esa fuente); globo del encabezado → «Potencial»; Producción → cifra «potencial» con su pie «N bbl/d» (ⓘ en ingeniería: «Pruebas de los pozos × factor de asignación.»; en decisión: «Lo que los pozos podían dar.»); curva discontinua de «Día a día».

**Fórmula.**

$$
\text{Potencial} = \sum_{c}\ \sum_{d \,:\, F_{c,d},\ \text{FA}_{c,m(d)}} \ \sum_{p \,\in\, \text{pozos con prueba de } c} q_{p,d}\cdot \text{FA}_{c,m(d)} \cdot \frac{h_d}{24}
$$

**Ejemplo con los datos del demo.** La Ceiba, septiembre: 346.378,059 bbl → «346.378». Día a día va de 11.579,69 (1-sep) a 11.488,61 (30-sep) porque las pruebas cambian. Octubre en curso: 17.987,026 → «17.987» (11.360,227 del 1-oct + 6.626,799 de las 14 h del 2-oct). Portafolio septiembre: 1.268.266,738; octubre: 66.523,755. El potencial casi no cambió con el demo del 9-oct (el crudo de las pruebas y el factor son los mismos; solo se movió el factor en el sexto decimal).

Pie de Producción: $\text{potencial} \times 24 / \sum h$ con $\sum h$ = horas de los días del período (720 en septiembre; 38 en octubre): «11.546 bbl/d» (La Ceiba sep), «11.360 bbl/d» (La Ceiba oct).

**Casos borde.** Pozo sin prueba: no suma (no se le inventa caudal). Día sin fiscal o mes sin factor: no suma. El potencial **no descuenta** nada: es «todo abierto».

**Quién lo calcula.** Servidor. `Libro.potencial`.

**Referencia.** `src/entities/libro.ts:51`, `:706-709`.

---

### No producido · brecha (barriles diferidos del encabezado)

**Qué es.** Potencial menos real: lo que no se produjo pudiendo. **Es el número que manda la pantalla de Diferidos** y el del resumen del gerente.

**Dónde se ve.** Encabezado de Diferidos y del Resumen del gerente: cifra de 40/44 px «**7.716**» + «barriles diferidos». Cuadre: «= No producido». Mes a mes: rótulo de cada columna (`k()`: «7,7 k»; la altura apilada es el diferido, igual en un mes entero). Por campo. Producción: «Diferido» (no se muestra como cifra; es el área sombreada de la gráfica).

**Fórmula.**

$$
\text{brecha} = \text{Potencial} - \text{Real}
$$

**Ejemplo con los datos del demo.**

| Período | Potencial | Real | Brecha | Pantalla |
|---|---:|---:|---:|---|
| La Ceiba · sep (cerrado) | 346.378,059 | 338.662 | 7.716,059 | «7.716» |
| La Ceiba · oct (en curso) | 17.987,026 | 16.941 | 1.046,026 | «1.046» |
| Portafolio · sep | 1.268.266,738 | 1.234.322 | 33.944,738 | «33.945» |
| Portafolio · oct | 66.523,755 | 64.147 | 2.376,755 | «2.377» |

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

**Ejemplo con los datos del demo (paro).** LC-16, evento `EP-LC16-260922-71` (LSHH, causa: bomba de reinyección P-201B, parte «rodamientos», por señal: «Se cerró porque la bomba de reinyección estaba parada y el tanque de agua lleno»; evidencia «ZS-2011 · marcha → paro · 22 de sept, 10:05», «Primera alarma TSH-2011 · temperatura alta en la cámara de empuje», «VSD-LC16 · código LSHH · 22 de sept, 11:41»). Prueba vigente: 907 bbl/d de crudo (y 25.289 de agua: es el pozo que más agua da, el primero que se cierra). FA de septiembre 0,968930.

| Día | Horas | bbl |
|---|---:|---:|
| 22-sep | 12,317 | $907 \times 0{,}968930 \times 12{,}317/24 = 451{,}005$ |
| 23-sep | 2,433 | $907 \times 0{,}968930 \times 2{,}433/24 = 89{,}103$ |
| **Tramo** | **14,750** | **540,108** |

Otro, de un solo día: LC-04, `EP-LC04-260906-85` (UV → energía, alimentador SE-2), 3,883 h × 861 bbl/d × 0,968930 / 24 = **134,986** bbl.

**Ejemplo (frecuencia reducida).** MN-07 (Morichal), `EP-MN07-260214-32`, código HZ a 47 Hz, prueba del 8-ene-2026 con 637 bbl/d a 59 Hz, FA de febrero 0,943: $f = 1 - 47/59 = 0{,}2034$; 24,55 h → **125,016** bbl, `aproximado: true`.

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

**Dónde se ve.** Globo del encabezado: «Σ de los eventos: 7.716 bbl ±15,0 % (Res. 40236)» (el gerente, nivel `decision`, ve «7.716 bbl» sin la tolerancia). Cuadre: es la base de «Identificado por señal». Paretos y palancas: los porcentajes van contra él. Producción (ingeniería): columna «Diferido» del cuadre diario/mensual. Tendencia del gerente: diferido por día de cada mes.

**Fórmula.**

$$
\text{diferido} = \sum_{e \,\in\, \text{tramos}} \text{bbl}_e
$$

**Ejemplo.** La Ceiba sep: 18 tramos, 7.716,059 bbl. Octubre en curso: 5 tramos, 1.046,026 bbl. Portafolio sep: 69 tramos, 33.944,738; oct: 11 tramos, 2.376,755.

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

**Ejemplo con los datos del demo.** La Ceiba sep: 346.378,059 − 338.662 = 7.716,059 = Σ de 18 tramos. Octubre en curso: 17.987,026 − 16.941 = 1.046,026 = Σ de 5 tramos. `verificar-libro.mjs` sección 1 lo comprueba con tolerancia $10^{-9}$ relativa en cada mes y campo, y además: identificado + declarado + pendiente = diferido; planeado + noPlaneado = diferido; Σ `porEquipo` = diferido.

**Cuándo NO es exacta.**

1. Un período que corta un mes (o un día): ver «residuo».
2. Un evento en un día **sin fiscal**: su diferido está en los tramos pero el día no entra en potencial ni real. Residuo = −(diferido de ese día).
3. $P_{p,d} > H_d$ (más horas perdidas que horas del día, por datos malos): el `max(0, …)` del teórico rompe la igualdad.

**Quién lo comprueba.** El backend tiene que cumplirla (`CONTRATO.md:1079-1082`); la referencia la trae implícita (`brecha`, `diferido`, `residuo` de `referencia/diferidos/*.json`).

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
- Día suelto, 22-sep (P-201B parada 16 h, 2 pozos cerrados): potencial 11.542,867; real 10.578; brecha 964,867; diferido 876,426; **residuo 88,441** → cuadre diario «88».
- 1-sep: potencial 11.579,686, real 11.706, diferido 0 → residuo −126,314 → «-126» (`n0` de es-CO usa el guion «-»).
- Rango a la medida 15-sep → 10-oct (llega hasta ahora): brecha 7.637,597, diferido 8.149,747, **residuo −512,150** (16 días de septiembre, que no compensan su mes; octubre aporta 0) → el Cuadre muestra «Inventario entre días -512» porque $512/7.638 = 6{,}7\,\% > 0{,}05\,\%$.

**Casos borde.** Día sin fiscal: `residuo: null` en el día a día («—»). Brecha 0: `residuoRel = 0`, la fila no sale.

**Quién lo calcula.** Servidor: `Libro.residuo`; `Dia.residuo`.

**Referencia.** `src/entities/libro.ts:501-503`, `:856`, `:1037`; `src/widgets/diferidos/Cuadre.tsx:24`, `:46-49`.

---

### Eficiencia (real / potencial)

**Qué es.** Qué fracción del potencial salió por el PMO.

**Dónde se ve.** Producción → apoyo de la barra «producción real»: «11.289 bbl/d · eficiencia 97,8 %»; cuadre diario/mensual → columna «Eficiencia»; globo de cada día de la gráfica; Mes a mes → «Eficiencia» del globo de cada mes. Resumen de campo (`ResumenCampo`) → «Eficiencia» en el globo de «producción contra su meta».

**Fórmula.**

$$
\text{pe} = \begin{cases} 100\cdot\dfrac{\text{Real}}{\text{Potencial}} & \text{Potencial} > 0 \\ 0 & \text{si no} \end{cases}
$$

**Ejemplo.** La Ceiba sep: $338.662/346.378{,}059 = 97{,}772\,\%$ → «97,8 %». Octubre: 94,185 → «94,2 %». Portafolio sep: 97,324 → «97,3 %»; oct: 96,427 → «96,4 %». Día 22-sep: $10.578/11.542{,}867 = 91{,}6\,\%$. Día 30-sep: 101,0 % (un día puede pasar de 100 % por el inventario).

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

**Ejemplo con los datos del demo.** La Ceiba, agosto de 2026: P-201B estuvo en mantenimiento preventivo programado (PR-2011-260819, 19-ago 17:49 a 20-ago 09:34) y cerró 3 pozos (LC-16, LC-07 y LC-14). Planeado 1.523,362 bbl; no planeado 6.999,021 (entre ellos la falla de sello del 9-ago, `EV-2011-0809`); potencial 349.179,383; eficiencia 97,559 %; **sin paradas programadas 97,996 %** → «98,0 %»; Mantenimiento: «17,9 %» con «1.523 bbl · 6.999 bbl no programado». Septiembre y octubre no tienen paradas programadas en La Ceiba: planeado 0, peNoPlan = pe (97,8 % y 94,2 %). (Morichal sí en septiembre: los dos cambios de bomba que el vigía anticipó, 1.385 bbl, 5C.)

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
| La Ceiba · sep | 7.716,059 | 0 | 0 | 7.716 · 0 · 0 |
| La Ceiba · oct | 690,982 | 0 | 355,044 | 691 · 0 · 355 |
| Portafolio · sep | 33.535,615 | 409,123 | 0 | 33.536 · 409 · 0 |
| Portafolio · oct | 1.935,388 | 86,323 | 355,044 | 1.936 · 86 · 355 |

Lo pendiente de La Ceiba en octubre son dos cierres de pozo sin causa: LC-21 (`EP-LC21-261001-01`, CMD, abierto desde el 1-oct 18:20, 19,667 h, 246,525 bbl) y LC-08 (`EP-LC08-261001-02`, CMD, del 1-oct 22:15 al 2-oct 01:10, 2,917 h, 108,518 bbl; volvió a arrancar sin respuesta: no conformidad). Con el diferido de octubre más chico (1.046 bbl), lo sin identificar pesa el 34 % (antes del 9-oct, el 12 %).

**Casos borde.** Una parada de bomba sin parte identificada **no** es pendiente: el pozo cerró por la bomba (identificado) y lo que falta es la parte (`sinParte`, 5A.8). Ejemplo: la parada abierta de P-201B del 2-oct (573,061 bbl a las 14:00) es identificada sin parte.

**Quién lo calcula.** Servidor: `identificado`, `declarado`, `pendiente` (también por campo).

---

### Alto impacto

**Qué es.** Lo diferido por los equipos foco del producto: **bombas de reinyección** y **electrosumergibles** (`ALTO_IMPACTO = ['reinyeccion', 'electrosumergible']`, `src/entities/causa-senal.ts:57`). Lo programado y lo declarado son otros tipos de causa y no entran aunque el equipo sea uno de esos.

**Dónde se ve.** Palancas «DÓNDE BAJARLO» → «Equipos de alto impacto» (fila fuerte); Resumen del gerente → «55 % del diferido · reinyección y electrosumergibles» y «antes → con TRIM» (5A.6); Mes a mes → «Alto impacto» del globo; Tendencia → barra oscura; Por campo → «Alto impacto» del globo; Pareto por tipo → filas en negrita.

**Fórmula.**

$$
\text{altoImpacto} = \sum_{e\,:\,\text{causa.tipo} \,\in\, \{\text{reinyeccion},\ \text{electrosumergible}\}} \text{bbl}_e
$$

**Ejemplo.** La Ceiba sep: 1.040,550 (P-201B) + 6.436,065 (ESP) = **7.476,616** → «7.477» (97 % del diferido). Con el agua real la bomba de reinyección cierra 2 o 3 pozos por parada y septiembre lo dominan las electrosumergibles (LC-04 y LC-11, caídas el 26-sep). Octubre: 573,061 (55 %). Portafolio sep: 24.782,289 (73 %); oct: 1.668,068 (70 %).

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
C_{\text{óptimo}} = \text{crudo de cerrar, en orden creciente de } \frac{q_p}{\max(1, w_p)},\ \text{hasta quitar } W \ (\text{entero si cabe; una ESP a lo más } 25\,\%)
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

- La Ceiba, parada de P-201B del 22-sep (`EV-2011-0922`): los operarios cerraron LC-16 y LC-07, los dos que más agua dan, con $C_{\text{real}} = 1.738$ bbl/d y $W = 48.510$ bbl/d de agua; 1.040,550 bbl diferidos. El orden óptimo quita la misma agua con LC-02 (395 crudo / 12.971 agua), LC-10 (479 / 13.938) y LC-01 (376 / 10.543) enteros, LC-07 al 25 % (207,8 / 5.805) y LC-16 al 21 % (188,4 / 5.253): $C_{\text{óptimo}} = 1.646{,}14$. Evitable $= 1.040{,}550 \times (1 - 1.646{,}14/1.738) = $ **55,00**.
- Morichal, parada de P-201B del 24-sep (`EV-M2011-260924`): cerró MN-32 y MN-27 con $C_{\text{real}} = 1.164$ bbl/d y $W = 54.454$ bbl/d de agua; 3.788,537 bbl diferidos. El orden óptimo quita la misma agua con MN-27 (522 / 26.005) y MN-36 (509 / 25.048) enteros y el 22 % de MN-13 (71,4 / 3.401): $C_{\text{óptimo}} = 1.102{,}35$. Evitable $= 3.788{,}537 \times (1 - 1.102{,}35/1.164) = $ **200,65**.
- Portafolio sep: 55,00 + 200,65 = **255,64**. Con 95-97 % de agua todos los pozos dan de 0,02 a 0,04 bbl de crudo por barril de agua, y los operarios cierran primero los que más agua dan: lo evitable para la misma agua es chico (antes del 9-oct, con cortes de 65-71 %, la de Morichal daba 4.762).

**Casos borde.** Sin tramos con barriles: 0. Un pozo sin prueba no es candidato. El día de la prueba es el del primer tramo recortado al período: una parada que empezó el mes anterior usa las pruebas del primer día del período. La fracción del último pozo se usa en la práctica bajándole la frecuencia o estrangulándolo.

**Quién lo calcula.** Servidor: `Libro.evitablePorOrden` (`evitableDeEvento`, `ordenOptimo`: `src/entities/libro.ts:912-974`). La misma `ordenOptimo` arma el orden de cierre de la predicción (otro capítulo).

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
