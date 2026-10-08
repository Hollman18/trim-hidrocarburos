# 4 · El agua: de la bomba que para al pozo que se cierra

## 4.1 Por qué la bomba de reinyección es el cuello de botella

Un pozo maduro no produce crudo: produce **líquido**, y la mayor parte es agua de formación. El corte de agua (BSW) es la fracción de agua en el líquido:

$$
\text{BSW} = \frac{Q_w}{Q_w + Q_o} \qquad\Longrightarrow\qquad \frac{Q_w}{Q_o} = \frac{\text{BSW}}{1 - \text{BSW}}
$$

| Símbolo | Significado | Unidad |
|---|---|---|
| $Q_w$ | caudal de agua del pozo | bbl/d |
| $Q_o$ | caudal de crudo del pozo | bbl/d |
| $Q_w / Q_o$ | barriles de agua que hay que mover por cada barril de crudo | bbl/bbl |

Con los cortes típicos de los campos maduros de Colombia (92 % a 98 %), $Q_w/Q_o$ va de $0{,}92/0{,}08 = 11{,}5$ a $0{,}98/0{,}02 = 49$: por cada barril de crudo se mueven de 11,5 a 49 barriles de agua (y la relación crece muy rápido al final: con 95 % son 19, con 97 % son 32). Esa agua se separa en planta, cae a un **tanque de agua** y la saca una **bomba de reinyección** hacia los pozos inyectores (o de disposición). La bomba no mueve crudo, pero **todo el crudo depende de ella**: si se para y nada más absorbe el agua, el tanque sube; al llegar al nivel alto-alto (LSHH) hay que dejar de producir agua, y la única forma es **cerrar pozos**. Cada pozo cerrado se lleva su crudo.

Por eso, en el producto:
1. La bomba de reinyección es de **alto impacto** (`ALTO_IMPACTO`), igual que la electrosumergible.
2. Lo que se predice no es «cuánta agua» sino **cuántas horas aguanta el tanque** (el colchón) y **cuánto crudo** se pierde después, y **en qué orden** cerrar para perder el menor crudo posible.
3. Lo que se mide después es si el tanque aguantó lo previsto y cuánto crudo se pudo haber salvado cerrando en otro orden (evitable).

**Los cortes del demo.** Con las pruebas vigentes de cada pozo (`Prueba.crudoBpd`, `Prueba.aguaBpd`), sumadas por campo:

| Campo | Crudo de prueba (bbl/d) | Agua de prueba (bbl/d) | Agua/crudo | BSW |
|---|---|---|---|---|
| La Ceiba | 11.857 | 21.649 | 1,83 | 64,6 % |
| Morichal | 17.937 | 44.260 | 2,47 | 71,2 % |
| Guacamayo | 6.828 | 8.317 | 1,22 | 54,9 % |
| Palmar | 3.321 | 2.549 | 0,77 | 43,4 % |
| Zarza | 3.061 | 1.263 | 0,41 | 29,2 % |

Por pozo, el extremo más acuoso del demo es MN-27 (Morichal, 79,8 %: 3,95 bbl de agua por bbl de crudo) y LC-02 (La Ceiba, 74,9 %: 2,99); el más seco con bomba de reinyección, LC-21 (42,7 %: 0,75) y MN-15 (49,7 %: 0,99). Justo por eso MN-27 y LC-02 son los **primeros** del orden de cierre (4.2) y MN-15 el peor cierre del evitable (4.5).

Los cortes del demo (29–71 % por campo, hasta 79,8 % por pozo) están **por debajo** del rango de la propuesta de valor (92–98 %). Las fórmulas no cambian; lo que cambia es la escala: con 95 % de BSW cada barril de crudo arrastraría 19 de agua y, para el mismo crudo, la bomba movería varias veces más agua y el colchón sería mucho más corto. Ver «Huecos».

## 4.2 Las piezas: qué es la bomba en ese campo, el tanque y el respaldo

### Perfil de la bomba en el campo (`PerfilBomba`)

**Qué es.** Lo que la bomba hace con su fluido en ese campo. Decide si parar es diferido de hoy.

| Campo | Bomba | `papel` | `capacidadBpd` | `pozos` | `sinBomba.fraccion` | `sinBomba.fuente` |
|---|---|---|---|---|---|---|
| ceiba | P-201B | `disposicion` | 20.400 | — | 1 | El agua no tiene otra salida: los pozos de disposición son su único destino |
| morichal | P-201B | `disposicion` | 24.000 | — | 1 | Lo que P-201A no absorbe no tiene otra salida |
| morichal | MPP-301 | `transporte` | 22.000 | MN-07, MN-18, MN-33 | 1 | Declarado por ingeniería: sin la bomba, la contrapresión de la línea no deja fluir el clúster |
| guacamayo | P-201B | `recobro` | 13.000 | — | 0 | El agua tiene salida alterna: la parada no cierra pozos |

`sinBomba.fraccion` = fracción de lo servido que **no fluye** sin la bomba (1 si no hay derivación). Hoy vive en código (`PERFILES`, `bombas.ts:207-231`); en producción es configuración/registro de ingeniería (ver «Huecos»). Una bomba sin perfil en el campo es un **hueco de configuración**: la placa dice «Falta declarar papel, capacidad y respaldo» y no se calcula crudo en riesgo.

### Tanque de agua (`TanqueAgua`, configuración firmada)

| id | Campo | Bomba | `capacidadBbl` | `altoAlto` | `tagNivel` | `aforo` |
|---|---|---|---|---|---|---|
| TK-AG-CE | ceiba | P-201B | 10.000 | 0,90 | LT-2012 | Certificado de aforo TK-AG-CE · tabla de 1 cm |
| TK-AG-MN | morichal | P-201B | 18.000 | 0,90 | LT-2012 | Certificado de aforo TK-AG-MN · tabla de 1 cm |
| TK-AG-GU | guacamayo | P-201B | 8.000 | 0,90 | LT-2012 | Certificado de aforo TK-AG-GU · tabla de 1 cm |

Se busca por la clave (`campoId`, `bomba`) (`tanqueDe`, `configuracion.ts:181`). Una bomba mide contra un solo tanque (la validación de la configuración rechaza dos).

### Respaldo (`RespaldoBomba`, configuración firmada)

| Campo | Equipo | `libreBpd` | `detalle` |
|---|---|---|---|
| ceiba | P-201B | 0 | Única bomba del tren de agua |
| morichal | P-201B | 15.100 | P-201A en paralelo, con 15.100 bbl/d libres |
| morichal | MPP-301 | 0 | Sin bomba en paralelo ni derivación al manifold |
| guacamayo | P-201B | 13.000 | Pozo de disposición alterno con capacidad para todo el caudal |

Se busca por (`campoId`, `equipo`) (`respaldoDe`, `configuracion.ts:182`). **Sin respaldo declarado, la predicción toma 0** (`respaldoLibre`, `diferido.ts:62`).

### Nivel del tanque ahora

`NIVEL_AHORA` (`pozos.ts:202-206`): TK-AG-CE 89,6 %, TK-AG-MN 61,8 %, TK-AG-GU 42,3 %, todos de `LT-2012` a las 13:59 del 2-oct. **En el demo es una constante en el código**; en producción es `GET /api/campos/:campo/tanques/:tanque/nivel` (el transmisor). Viaja al front en `GET /api/vistas/campos/:campo/ahora` → `niveles` (un tanque sin lectura no aparece).

---

### Agua que mueve la bomba (`aguaQueMueve`)

**Qué es.** El caudal de agua que la bomba saca cuando trabaja: lo que se queda sin salida si para.

**Dónde se ve.** Supuestos de la predicción («Mediana de FI-2011 mientras la bomba trabaja»), Detalle → «SI SE PARA AHORA» → ⓘ supuestos.

**Fórmula** (`diferido.ts:52-59`):

$$
Q_{\text{mueve}} = \operatorname{mediana}\{ v_i \in \text{serie}(\text{tag de caudal}) : v_i \ne \text{null} \land v_i > 0 \}
$$

Sin medidor (o sin ninguna lectura > 0): $Q_{\text{mueve}} = $ `capacidadBpd`, `medido: false`, fuente «Sin medidor de caudal: se toma la capacidad nominal (es un techo)».

| Símbolo | Significado | Unidad | De dónde sale |
|---|---|---|---|
| serie | lecturas del medidor de caudal de la bomba (`tags.caudal`, p. ej. `FI-2011`) | bbl/d | `GET /api/campos/:campo/tags/:tag/serie` |
| mediana | con número par de lecturas, el promedio de las dos centrales | bbl/d | — |

Los huecos del historiador (`null`) **no** son caudal cero y no entran; los ceros tampoco (la bomba parada).

**Ejemplo con los datos del demo.**
- La Ceiba, `FI-2011`: serie diaria `[19210, 19180, 19240, 19190, 19170, 19220, 19200, 19180, 19190, 19150, 16300, 0]`. Se quita el 0 (ya parada) → 11 lecturas; ordenadas, la 6.ª es **19.190 bbl/d**.
- Morichal, `FI-2011`: `[21440, 21520, 21470, 21540, 21490, 21530, 21450, 21510, 21480, 21550, 21460, 21500]` → 12 lecturas; mediana $(21.490 + 21.500)/2 =$ **21.495 bbl/d**.

**Casos borde.** Bomba de recobro o multifásica: no se calcula (no aplica). En el demo la serie es diaria (12 puntos); en producción la cadencia la dice `pasoH` y la mediana es sobre la ventana que el servidor escoja (ver «Huecos»).

---

### Agua sin salida

**Qué es.** Lo que el respaldo no absorbe: el caudal que llena el tanque cuando la bomba para.

**Fórmula** (`diferido.ts:247`; en una parada medida, `diferido.ts:316`):

$$
Q_{\text{sin salida}} = \max\left(0,\ Q_{\text{mueve}} - Q_{\text{respaldo}}\right) \cdot s \quad [\cdot\ p \text{ en una parada medida}]
$$

| Símbolo | Significado | Unidad | De dónde sale |
|---|---|---|---|
| $Q_{\text{respaldo}}$ | capacidad libre del respaldo | bbl/d | `RespaldoBomba.libreBpd` (0 si no hay) |
| $s$ | `sinBomba.fraccion` | 0–1 | perfil |
| $p$ | `EventoBomba.perdida` (solo al medir una parada: una pérdida parcial llena el tanque más despacio) | 0–1 | PLC |

**Ejemplo.** La Ceiba: $\max(0, 19.190 - 0) \cdot 1 = $ **19.190 bbl/d**. Morichal: $\max(0, 21.495 - 15.100) \cdot 1 = $ **6.395 bbl/d** (P-201A en paralelo absorbe 15.100).

**Qué texto se muestra.** Detalle → «COLCHÓN DEL TANQUE» → «Agua sin salida 6.395 bbl/d» (`n0`). Con $Q_{\text{sin salida}} \le 0$ el método dice «El respaldo absorbe toda el agua: parar no cierra pozos».

---

### Colchón del tanque

**Qué es.** Las horas que tarda el tanque en llegar al alto-alto si la bomba se para ahora. Después de eso hay que cerrar pozos.

**Dónde se ve.**
- Placa de la bomba (ingeniería/operación, bomba en marcha): «si se para: **19,0 h** de colchón, luego se pierden **1.671 bbl/d**» (`Placa.tsx:159-165`).
- Detalle de la bomba → panel «SI SE PARA AHORA» → «COLCHÓN DEL TANQUE»: barra del nivel contra el alto-alto, Capacidad, Volumen libre, Agua sin salida, **Aguanta** (`Detalle.tsx:307-323`).
- Detalle → cifra «Si se para ahora» → pie «tras 19,0 h de colchón · ±15,0 %» (el ± solo en ingeniería) (`Detalle.tsx:111-115`).
- Ficha ejecutiva: «Si para ahora · el tanque aguanta 19 h · luego se pierden 1.671 bbl/d» (`FichaEjecutiva.tsx:94-96`).

**Fórmula** (`colchonDe`, `diferido.ts:143-152`):

$$
V_{\text{libre}} = \max\left(0,\ \left(a - \frac{n}{100}\right) \cdot C\right)
\qquad
h = \frac{V_{\text{libre}}}{Q_{\text{sin salida}} / 24}
$$

$$
\varepsilon_{\text{aforo}} = 0{,}002 \cdot \frac{C}{V_{\text{libre}}}
\qquad
\varepsilon = \sqrt{\varepsilon_{\text{aforo}}^2 + \varepsilon_{\text{agua}}^2}
\qquad
\text{rango} = \left[h\,(1 - \varepsilon),\ h\,(1 + \varepsilon)\right]
$$

| Símbolo | Significado | Unidad | De dónde sale |
|---|---|---|---|
| $a$ | alto-alto como fracción de la capacidad | 0–1 | `TanqueAgua.altoAlto` |
| $n$ | nivel del tanque ahora (o al parar, en una parada medida) | % | `NIVEL_AHORA` / transmisor; `EventoBomba.nivelAlParar.pct` |
| $C$ | capacidad del tanque | bbl | `TanqueAgua.capacidadBbl` |
| $V_{\text{libre}}$ | volumen libre hasta el alto-alto | bbl | calculado |
| $h$ | colchón | h | calculado; $+\infty$ si $Q_{\text{sin salida}} = 0$ |
| 0,002 | incertidumbre del aforo de un tanque (máx. 0,2 % del volumen total, Res. MME 40236/2022, Anexo 2) referida al volumen libre | — | `AFORO_TANQUE` (`metrologia.ts:62`) |
| $\varepsilon_{\text{agua}}$ | incertidumbre del medidor de agua (no declarada): se acota con la banda de asignación del agua de la Fig. 10.2, 0,90–1,10 → 0,10 para cualquier producción | — | `toleranciaAgua` (`diferido.ts:69-74`) |

**Ejemplo con los datos del demo — Morichal P-201B (en marcha).**
1. $V_{\text{libre}} = (0{,}90 - 0{,}618) \cdot 18.000 = $ **5.076 bbl**.
2. $Q_{\text{sin salida}}/24 = 6.395/24 = 266{,}46$ bbl/h.
3. $h = 5.076 / 266{,}458\overline{3} = $ **19,0499 h** (con `n1` se escribe «19,0»: el valor está apenas por debajo de 19,05).
4. $\varepsilon_{\text{aforo}} = 0{,}002 \cdot 18.000 / 5.076 = 0{,}0071$; $\varepsilon = \sqrt{0{,}0071^2 + 0{,}10^2} = 0{,}1003$.
5. Rango: **17,14 h a 20,96 h**.
6. Pantalla: Detalle «Aguanta **19,0 h** (17,1 h a 21,0 h)» (`fmtHoras(h, true)`: < 48 h con un decimal); ⓘ «Aforo del tanque de agua ±0,7 %: Res. MME 40236/2022, Anexo 2… · Caudal de agua ±10,0 %: Incertidumbre del medidor no declarada; se acota con la banda del agua…»; Placa «19,0 h de colchón»; Ficha «aguanta 19 h» (`fmtHoras(h)` sin decimal); barra «nivel LT-2012 61,8 %» contra «alto-alto 90 %». Encabezado del panel: «TK-AG-MN · LT-2012 61,8 %».

**La Ceiba P-201B (parada).** El motor también lo calcula con el nivel de ahora: $V_{\text{libre}} = (0{,}90 - 0{,}896) \cdot 10.000 = 40$ bbl, $h = 40 / (19.190/24) = 0{,}05$ h, $\varepsilon = 0{,}51$ (el aforo pesa: 0,2 % de 10.000 bbl = 20 bbl sobre 40 libres), rango 0,025–0,076 h. **La pantalla no lo muestra** con la bomba parada (`pr.colchon && !pr.parada`); viaja en la API.

**Casos borde.**

| Situación | Qué devuelve | Qué muestra |
|---|---|---|
| $Q_{\text{sin salida}} = 0$ (el respaldo absorbe todo) | `horas: Infinity` → en JSON **`null`** (`horasSinFin`, `contrato.ts:165`); `rango` igual | método «El respaldo absorbe toda el agua: parar no cierra pozos»; ver «Huecos» sobre la frase de la placa |
| Nivel ya en o sobre el alto-alto | `libreBbl = 0`, `horas = 0`, `agotado: true`, $\varepsilon_{\text{aforo}} = 0$ | «0,0 h» |
| Sin tanque configurado | `colchon` ausente; supuesto «Sin tanque configurado: no se puede calcular el colchón» | cifra «Si se para ahora» con pie «de inmediato» |
| Sin lectura de nivel | `colchon` ausente (sin supuesto propio) | ídem |
| Papel `transporte` o `recobro` | no hay colchón | — |

---

### Orden de cierre y crudo en riesgo

**Qué es.** Cuando el tanque llega al alto-alto hay que quitar del sistema el agua que la bomba no saca. Cerrar «parejo» (la misma fracción a todos los pozos) es lo intuitivo; TRIM recomienda cerrar **primero los pozos que menos crudo dan por barril de agua**, hasta quitar la misma agua. Es un problema de mochila fraccionaria y el voraz por razón crudo/agua es óptimo.

**Dónde se ve.** Detalle → «SI SE PARA AHORA» → «ORDEN DE CIERRE» (tabla `# · Pozo · Crudo bbl/d · Agua bbl/d · Crudo/agua · Cierre`, 12 filas máx. y «y N pozos más: se cierra todo el campo»), y la frase «pierde **1.671 bbl/d** en este orden · **872 bbl/d menos** que parejo» con ⓘ «Cerrando parejo (la misma fracción a todos) serían 2.543 bbl/d.» (`Detalle.tsx:338-358`). En la placa: la ⓘ «Si se para ahora» con «El tanque aguanta 19,0 h; luego se pierden 1.671 bbl/d cerrando los pozos en orden (2.543 bbl/d cerrando parejo).» (solo si parejo > orden + 1). En Riesgo, la fila de la bomba: «si falla 1.671 bbl/d» y `pozos` = número de pasos.

**Fórmula** (`ordenDeCierre`, `diferido.ts:106-125`; `ordenOptimo`, `libro.ts:875-887`).

Agua a quitar:

$$
W =
\begin{cases}
Q_{\text{sin salida}} & \text{si } Q_{\text{respaldo}} > 0 \\
\sum_j w_j \ (\text{todo el campo}) & \text{si } Q_{\text{respaldo}} = 0 \text{ y } Q_{\text{sin salida}} > 0 \\
0 & \text{si no (no hay orden)}
\end{cases}
\qquad W \leftarrow \min\left(W, \sum_j w_j\right)
$$

Pozos candidatos: los que producen ahora (`estadoAhora(p).produce`) **o todos** si la bomba ya está parada (`todos = !!parada`), y de ellos solo los que tienen prueba. Orden ascendente por

$$
r_j = \frac{c_j}{\max(1, w_j)}
$$

y se recorre acumulando agua; el pozo $k$ que completa $W$ se cierra en fracción $\phi_k = \min\left(1, \frac{W - \sum_{j<k} w_j}{\max(1, w_k)}\right)$ (en la práctica: se le baja la frecuencia o se estrangula).

$$
\text{crudo en orden} = \text{FA} \cdot \sum_{j \in \text{pasos}} c_j\,\phi_j
\qquad
\text{crudo parejo} = \frac{W}{\sum_j w_j} \cdot \sum_j \text{FA}\cdot c_j
\qquad
\text{ahorro} = \max(0,\ \text{parejo} - \text{en orden})
$$

| Símbolo | Significado | Unidad | De dónde sale |
|---|---|---|---|
| $c_j$, $w_j$ | crudo y agua de la prueba vigente del pozo $j$ | bbl/d | `pruebaEn(p, t)` |
| FA | factor de asignación del mes (último medido) | — | `faDe(campo)` (capítulo del libro) |
| $r_j$ | crudo por barril de agua: el criterio del orden | bbl/bbl | calculado (en la tabla, con `n2`) |

`Prediccion.crudoBpd` = crudo en orden; `crudoParejoBpd` = crudo parejo. Los pozos sin prueba no se pueden ordenar (no se sabe cuánta agua dan): van en `orden.sinPrueba` y en el supuesto «Sin prueba, fuera del orden: …».

**Ejemplo con los datos del demo — Morichal P-201B, si se para ahora.** $W = 6.395$ bbl/d (hay respaldo). 40 pozos producen (MN-41 está parado), con 42.551 bbl/d de agua y 16.920 bbl/d de crudo asignado. FA = 0,981.

| # | Pozo | $c$ prueba | Crudo asignado (pantalla, `n0`) | Agua (pantalla) | Crudo/agua (`n2`) | Cierre |
|---|---|---|---|---|---|---|
| 1 | MN-27 | 520 | 510 | 2.052 | 0,25 | entero |
| 2 | MN-36 | 509 | 500 | 1.906 | 0,27 | entero |
| 3 | MN-13 | 325 | 319 | 1.178 | 0,28 | entero |
| 4 | MN-39 | 447 | 342 | 1.259 | 0,28 | 78 % |

- Agua acumulada: 2.052 + 1.906 + 1.178 = 5.136; faltan 1.259 de los 1.616 de MN-39 → $\phi = 0{,}779$ («78 %»).
- Crudo en orden = 510,35 + 499,56 + 318,97 + 341,79 = **1.670,66 bbl/d** → «1.671 bbl/d».
- Parejo = 16.920,08 × 6.395 / 42.551 = **2.542,92 bbl/d** → «2.543».
- Ahorro = **872,26 bbl/d** → «872 bbl/d menos que parejo».
- Lectura completa para operación: *si P-201B de Morichal se para ahora, el tanque aguanta 19,0 h (17,1–21,0); después hay que cerrar 4 pozos (3 enteros y MN-39 al 78 %) y se pierden 1.671 bbl/d (≈ 70 bbl/h), en vez de 2.543 bbl/d cerrando parejo.*

**La Ceiba P-201B (sin respaldo).** $W = \sum w_j = 21.649$ bbl/d (los 18 pozos, porque la bomba ya está parada): el orden recorre los 18 enteros (de LC-02, 0,335, a LC-21, 1,342) y crudo en orden = parejo = **11.359,7 bbl/d**, ahorro 0. Sin respaldo **no hay orden que escoger: se cierra todo el campo** (método «Sin respaldo, el agua no tiene salida: al llenarse el tanque se cierra todo el campo»).

**Casos borde.** Sin factor medido en el campo, FA = 0 → crudo 0 (no se inventa). Un pozo con agua 0 usa $\max(1, w)$ para no dividir por cero (queda al final del orden). $W$ nunca supera el agua de los candidatos.

---

## 4.3 La predicción completa por papel (`prediccion`)

**Qué es.** Lo que pasaría si la bomba se parara ahora, o lo que está pasando si ya está parada. `GET /api/vistas/bombas/prediccion?campo&equipo` → `Prediccion` (`diferido.ts:156-178`).

| Papel / estado | `inmediato` | `crudoBpd` | `colchon` / `orden` | `perdiendo` | `metodo` |
|---|---|---|---|---|---|
| `recobro` (Guacamayo P-201B) | **false** | 0 | — | `{0, []}` solo si está parada | «Inyección para recobro con salida alterna para el agua: parar no cierra pozos hoy. Baja el soporte de presión del yacimiento y el efecto llega en semanas.» |
| `transporte` en marcha (Morichal MPP-301) | true | $s \cdot \sum$ crudo asignado de los pozos del clúster que producen y tienen prueba | — | — | «Crudo de los 3 pozos que pasan por la bomba: prueba vigente × factor de asignación del mes (0,981)» |
| `transporte` parada | true | ídem | — | `perdiendoPor` | «Parada desde <fecha>: N pozos cerrados por ella» |
| `disposicion` en marcha (Morichal P-201B) | true | crudo en orden | sí / sí | — | «Hay que quitar 6.395 bbl/d de agua: se cierran primero los pozos con menos crudo por barril de agua» |
| `disposicion` parada (La Ceiba P-201B) | true | crudo en orden (con todos los pozos) | sí / sí | `perdiendoPor` | «Parada desde 2 de oct, 03:52: 17 pozos cerrados por ella» |

**Lo que está perdiendo una bomba parada** (`perdiendoPor`, `diferido.ts:228-239`):

$$
\text{perdiendo} = \sum_{p\,:\,\text{causa del evento abierto de } p \text{ tiene } \text{evento} = \text{id}} \text{crudoAsignado}(p) \cdot \begin{cases} f(hz) & \text{si } p \text{ produce a frecuencia reducida} \\ 1 & \text{si está cerrado}\end{cases}
$$

con `id` = `causaDeParada(parada).evento` (la propia parada, o el servicio que la paró: así una bomba parada por SE-2 no se queda con los pozos que son de SE-2).

**Ejemplo — La Ceiba.** 17 pozos con su evento abierto cargado a `EV-2011-1002` (todos menos LC-21, que es «sin identificar» propio): **11.058,9 bbl/d**. En pantalla: Detalle, cifra «Perdiéndose ahora **11.059 bbl/d**», pie «461 bbl/h · 17 pozos cerrados»; panel «MIENTRAS ESTÉ PARADA» → «Parada desde 2 de oct, 03:52» y «POZOS QUE CERRÓ · 17» con la lista (LC-01, LC-02, …) y ⓘ «Se pierden 11.059 bbl/d mientras siga parada. Al arrancar, los pozos vuelven a producir a medida que el tanque baja.». Placa directiva: «**11.059 bbl/d** perdiéndose · 17 pozos cerrados».

**Ejemplo — Morichal MPP-301** (`supuestos`): «MN-07: 607 bbl/d · prueba del 2026-09-13», «MN-18: 526 bbl/d · prueba del 2026-09-25», «MN-33: 467 bbl/d · prueba del 2026-09-05», y la fuente de `sinBomba`. `crudoBpd` = **1.599,75 bbl/d**; pantalla: «si se para: **1.600 bbl/d** de inmediato». Panel «POZOS QUE PASAN POR ELLA» con esos renglones.

**Ejemplo — Guacamayo P-201B.** `inmediato: false`, `crudoBpd: 0`. Placa: «si se para: no cierra pozos hoy» + ⓘ «No cierra pozos hoy. Baja el soporte de presión.»; Detalle: cifra «Si se para ahora · **no cierra pozos**», pie «recobro: el efecto llega en semanas»; placa directiva «Si se para, no cierra pozos hoy».

**Tolerancia de la predicción.** `tolerancia` = banda de asignación del crudo del campo (`bandaDe(campo).valor`; 0,15 en La Ceiba y Morichal, 0,05 en Guacamayo), y `componentes` = [crudo asignado (correlado), aforo, caudal de agua]. En Detalle (ingeniería) se escribe `fmtTol` → «±15,0 %».

**Supuestos** (Morichal P-201B, en este orden): «Mediana de FI-2011 mientras la bomba trabaja» · «P-201A en paralelo, con 15.100 bbl/d libres» · «Tanque de agua de Morichal Norte: 18.000 bbl, alto-alto al 90 % · Certificado de aforo TK-AG-MN · tabla de 1 cm» · «Nivel LT-2012: 61,8 %». En pantalla, ⓘ «supuestos» (no en la vista simple) y ⓘ «método» (solo con la bomba en marcha).

**Referencia.** `diferido.ts:180-273`; casos `referencia/prediccion/{ceiba-P-201B,morichal-P-201B,morichal-MPP-301,guacamayo-P-201B}.json`.

---

## 4.4 Una parada medida: lo previsto contra lo observado (`paradaMedida`)

**Qué es.** Cada parada de la historia de la bomba, con lo que costó, a quién se le carga, y —en disposición— cuánto **debía** aguantar el tanque contra cuánto **aguantó** (del paro al primer pozo cerrado). Es la prueba de que el modelo del colchón funciona con datos de la planta.

**Dónde se ve.** Detalle de la bomba → lista de paradas (más reciente primero): fila con fecha, «hasta <fecha> · <horas>», parte o texto, cómo, «se carga a <equipo>» si no es propia, «colchón X h · aguantó Y h», barriles y rango. Al abrir: «POR QUÉ PARÓ», evidencia, «EL TANQUE», «POZOS QUE CERRÓ · N», «evitable en orden», «N bbl aproximados» (`Detalle.tsx:380-475`). Placa: «Detenida desde <fecha>» + barriles de la parada abierta.

**Fórmulas** (`diferido.ts:302-330`):

$$
\text{tramos} = \{\text{tramos de la historia con } (\text{causa.evento} \lor \text{evento.id}) = \text{id}\}\ \big[\cap\ (t_{\text{ini}}, t_{\text{fin}}) \text{ si la paró un servicio}\big]
$$

$$
\text{bbl} = \sum \text{tramos.bbl} \qquad \text{pozos} = \#\{\text{pozo}\} \qquad \text{horasParada} = \max(0, t_{\text{fin o AHORA}} - t_{\text{ini}})
$$

$$
\text{colchón previsto} = \text{colchonDe}\left(\text{tanque},\ n_{\text{al parar}},\ \max(0, Q_{\text{mueve}} - Q_{\text{respaldo}}) \cdot p \cdot s\right)
\qquad
\text{observado} = \frac{\min(\text{tramos.evento.inicio}) - t_{\text{ini}}}{1\ \text{h}}
$$

El colchón solo se mide si la bomba es de `disposicion`, tiene tanque, la parada trae `nivelAlParar` y la causa es **la propia bomba** (`causa.equipo === ev.equipo`; incluye la programada, no la que paró un servicio). `id` = `causa.evento ?? ev.id`. Si la paró un servicio, los barriles son del servicio y aquí solo se muestran los que cayeron mientras la bomba estuvo parada; `cargadoA` = el servicio.

`tolerancia` relativa = $\text{tol}/\text{bbl}$ con la tolerancia del libro (`toleranciaDe`); `rango` = $[\text{bbl} - \text{tol}, \text{bbl} + \text{tol}]$; `aproximado` = bbl de tramos a frecuencia reducida; `evitable` solo si `causa.tipo = 'reinyeccion'` (4.5); `pide` y `arrancoSinIdentificar` del cap. 3.

**Ejemplo con los datos del demo — la parada abierta de La Ceiba (`EV-2011-1002`).**
1. Paró el 2-oct a las 03:52 con el tanque en **56,0 %** (`LT-2012`).
2. $V_{\text{libre}} = (0{,}90 - 0{,}56) \cdot 10.000 = $ **3.400 bbl**; sin respaldo, $Q_{\text{sin salida}} = 19.190 \cdot 1 \cdot 1 = 19.190$ bbl/d = 799,6 bbl/h.
3. Debía aguantar $3.400 / 799{,}6 = $ **4,25 h** (rango 3,83–4,68 h).
4. El primer pozo (LC-16, `LSHH`) cerró a las 08:07 → aguantó **4,245 h**. El modelo acertó al minuto.
5. Entre 08:07 y 08:52 cerraron 17 pozos; a las 14:00 la parada lleva **10,1 h** y **2.570 bbl** (rango 2.185–2.956, ±15,0 %).
6. Pantalla, fila: «2 de oct, 03:52 · abierta · 10,1 h», «colchón 4,3 h · aguantó 4,2 h», ▲ «por identificar», «**2.570 bbl**», «2.185 – 2.956 · ±15,0 %». «EL TANQUE»: «Al parar · LT-2012 56,0 %», «Libre hasta el alto-alto 3.400 bbl», «Agua sin salida 19.190 bbl/d», «Debía aguantar 4,3 h», «Primer pozo cerrado a las 4,2 h». Placa: «Detenida desde 2 de oct, 03:52», «**2.570 bbl**» «2.185 – 2.956 · calculado · 461 bbl/h · 17 pozos cerrados».

**Previsto contra observado en toda la historia** (horas):

| Parada | Nivel al parar | Previsto | Observado | Bbl |
|---|---|---|---|---|
| Ceiba `EV-2011-251019` | 41,5 % | 6,07 | 6,07 | 21.882 |
| Ceiba `EV-2011-251219` | 31,0 % | 7,38 | 7,38 | 22.710 |
| Ceiba `EV-2011-260325` | 47,0 % | 5,38 | 5,38 | 10.281 |
| Ceiba `EV-2011-260420` | 33,5 % | 7,07 | 7,07 | 11.717 |
| Ceiba `EV-2011-260708` | 61,0 % | 3,63 | 3,63 | 26.565 |
| Ceiba `EV-2011-260727` | 68,0 % | 2,75 | 2,75 | 30.705 |
| Ceiba `EV-2011-260819` (programada) | 47,0 % | 5,38 | 5,38 | 3.828 |
| Ceiba `EV-2011-0909` | 52,0 % | 4,75 | 4,75 | 14.649 |
| Ceiba `EV-2011-0922` | 60,5 % | 3,69 | 3,68 | 6.089 |
| Ceiba `EV-2011-1002` (abierta) | 56,0 % | 4,25 | 4,25 | 2.570 |
| Morichal `EV-M2011-251005` | 60,8 % | 19,73 | 19,70 | 6.653 |
| Morichal `EV-M2011-251207` | 26,1 % | 43,17 | — (duró 20,4 h) | 0 |
| Morichal `EV-M2011-260103` | 62,5 % | 18,58 | — (duró 3,7 h) | 0 |
| Morichal `EV-M2011-260217` (programada) | 36,7 % | 36,01 | — (duró 13,0 h) | 0 |
| Morichal `EV-M2011-260308` | 55,8 % | 23,10 | 23,09 | 3.005 |
| Morichal `EV-M2011-260326` | 30,6 % | 40,13 | — (duró 39,8 h) | 0 |
| Morichal `EV-M2011-260502` | 54,4 % | 24,05 | 24,02 | 3.307 |
| Morichal `EV-M2011-260608` | 73,3 % | 11,28 | 11,27 | 4.114 |
| Morichal `EV-M2011-260924` | 66,1 % | 16,15 | 16,14 | 9.838 |

**Lo que el tanque absorbió.** `EV-M2011-260326` (Morichal, sello): paró con el tanque en 30,6 % → libre 10.692 bbl → debía aguantar 40,1 h; la bomba volvió en 39,8 h: **ningún pozo cerró**, 0 bbl. Pantalla: «colchón 40,1 h · sin cerrar pozos», «0 bbl · no costó crudo», «EL TANQUE … lo absorbió sin cerrar pozos». Sigue siendo **una falla** de la bomba (cuenta en el MTBF con 0 bbl, cap. 7).

**Textos del colchón según el valor** (`Detalle.tsx:398-399`, `comun.ts:19-21`):

| Situación | Texto corto en la fila | Texto en «EL TANQUE» |
|---|---|---|
| Hubo cierres | «colchón X h · aguantó Y h» | «Primer pozo cerrado a las Y h» |
| Abierta, sin cierres, previsto > lleva | «colchón X h · faltan (X − lleva) h» | «el tanque todavía absorbe: faltan … del colchón» |
| Abierta, sin cierres, previsto ≤ lleva | «colchón X h · ya pasó, sin cerrar pozos» | «ya pasó el colchón previsto y todavía no se ha cerrado ningún pozo» |
| Cerrada sin cierres | «colchón X h · sin cerrar pozos» | «lo absorbió sin cerrar pozos» |

Horas con `fmtHoras(h, true)`: < 48 h → 1 decimal + « h»; 48 h a 90 días → días con 1 decimal + « d»; > 90 días → «más de 3 meses».

**Quién lo calcula y por dónde viaja.** Servidor. `GET /api/vistas/bombas/paradas?campo&equipo` (toda la historia, más reciente primero), `BombaVista.abierta`, y recortadas a un período en `GET /api/vistas/bombas/paradas-en-periodo` (con `horasEnPeriodo`, `bblEnPeriodo`, `cruzaBorde`; una parada que cruza el borde de mes no se suma entera a los dos meses).

---

## 4.5 Evitable cerrando en orden

**Qué es.** En una parada de reinyección que **no** cerró todo el campo, cuánto crudo se habría perdido de menos si se hubiera quitado **la misma agua** cerrando primero los pozos con menos crudo por barril de agua.

**Dónde se ve.** Detalle → parada abierta → «evitable en orden: **4.762 bbl**» + ⓘ «Cerrando primero los de menos crudo por barril de agua se habrían perdido 4.762 bbl menos.» (solo si > 0). En el libro, `evitablePorOrden` (suma de las paradas del período; ver capítulo del libro).

**Fórmula** (`evitableDeEvento`, `libro.ts:851-870`). Sea $T$ = tramos de la parada con bbl > 0, $t_0$ = el primer cierre, $d$ = inicio del primer tramo (para escoger la prueba vigente):

1. Candidatos: pozos con prueba que estaban cerrados por esta parada **o** que producían en $t_0$ (un pozo ya parado por otra causa no tiene agua que quitar).
2. Si se cerraron todos los candidatos → **0** (no había orden que escoger).
3. $C_{\text{real}} = \sum_{t \in T} c_{p(t)} \cdot f_t$ y $W = \sum_{t \in T} w_{p(t)} \cdot f_t$ (con $f_t$ = factor del tramo: 1 cerrado, $<1$ frecuencia reducida).
4. $C_{\text{óptimo}}$ = crudo de `ordenOptimo(candidatos, W)`.

$$
\text{evitable} = \sum_{t \in T} \text{bbl}_t \cdot \left(1 - \frac{C_{\text{óptimo}}}{C_{\text{real}}}\right) \quad \text{si } C_{\text{óptimo}} < C_{\text{real}},\ \text{si no } 0
$$

Es decir, se escala lo realmente perdido por la proporción de crudo que el orden óptimo habría evitado.

**Ejemplo con los datos del demo — Morichal `EV-M2011-260924`** (P-201B, 24-sep 16:51 → 28-sep 06:53, sin identificar, no conforme). El tanque aguantó 16,1 h; a partir del 25-sep 09:00 se cerraron 8 pozos:

| Pozo cerrado | Código | Crudo prueba | Agua prueba | Crudo/agua | bbl |
|---|---|---|---|---|---|
| MN-17 | LSHH | 418 | 1.191 | 0,35 | 1.178 |
| MN-16 | CMD | 586 | 1.398 | 0,42 | 1.664 |
| MN-23 | CMD | 279 | 499 | 0,56 | 785 |
| MN-35 | CMD | 440 | 811 | 0,54 | 1.247 |
| MN-15 | CMD | 361 | 357 | 1,01 | 1.025 |
| MN-02 | CMD | 572 | 791 | 0,72 | 1.622 |
| MN-08 | CMD | 569 | 697 | 0,82 | 1.613 |
| MN-04 | CMD | 252 | 901 | 0,28 | 705 |

- $C_{\text{real}} = 3.477$ bbl/d, $W = 6.645$ bbl/d de agua quitada; 36 candidatos.
- Orden óptimo para la misma agua: MN-27 (522 / 1.978), MN-36 (509 / 1.906), MN-13 (325 / 1.178), MN-39 al 98 % (438 / 1.583) → $C_{\text{óptimo}} = 1.793{,}9$ bbl/d.
- Evitable = 9.837,8 × (1 − 1.793,9 / 3.477) = **4.762 bbl** (48 % de lo perdido). Cerrar MN-15 (1,01 bbl de crudo por barril de agua) fue lo más caro.

**En toda la historia del demo:** solo Morichal tiene evitable (tiene respaldo, así que cierra una parte): 1.960 (`251005`) + 972 (`260308`) + 1.135 (`260502`) + 804 (`260608`) + 4.762 (`260924`) = **9.633 bbl**. La Ceiba siempre cierra los 18 pozos → evitable 0.

**Casos borde.** Ningún tramo con bbl → 0. Tramos a frecuencia reducida entran con su factor. El evitable de una parada **abierta** es parcial (crece mientras siga abierta).

**Referencia.** `libro.ts:845-896`; CONTRATO.md:1049-1052.
