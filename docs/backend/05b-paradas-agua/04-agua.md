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

| Campo | Crudo de prueba (bbl/d) | Agua de prueba (bbl/d) | Agua/crudo | BSW | Pozo más seco | Pozo más acuoso |
|---|---|---|---|---|---|---|
| La Ceiba | 11.857 | 224.075 | 18,90 | 95,0 % | LC-19 60,4 % (bombeo mecánico) | LC-02 97,0 % |
| Morichal | 17.937 | 581.849 | 32,44 | 97,0 % | MN-15 92,8 % | MN-27 98,1 % |
| Guacamayo | 6.828 | 90.122 | 13,20 | 93,0 % | GU-03 84,8 % | GU-07 95,2 % |
| Palmar | 3.321 | 13.192 | 3,97 | 79,9 % | PA-02 69,8 % | PA-07 87,2 % |
| Zarza | 3.061 | 1.429 | 0,47 | 31,8 % | ZA-04 17,1 % | ZA-02 40,1 % |

Son los cortes de los campos colombianos: La Ceiba y Morichal, crudo pesado de los Llanos con 95 % y 97 % de agua; Guacamayo, 93 %; El Palmar, 80 %, porque todos sus pozos son de bombeo mecánico y una unidad de varilla no levanta más de unos 3.000 bbl/d de líquido (sus pozos van de 1.597 a 2.899 bbl/d); La Zarza, 32 %, porque es de gas y condensado y el agua no manda. El crudo de cada campo es el de siempre: lo que pesa es el agua que lo acompaña. Por pozo, las electrosumergibles de La Ceiba mueven de 5.472 (LC-12) a 26.196 bbl/d de líquido (LC-16) y las de Morichal de 5.034 (MN-09) a 29.091 (MN-32): bombas grandes, como las de los campos de crudo pesado. El reparto del agua entre los pozos de un campo es de demostración (alrededor de la razón agua/crudo del campo); no sigue una historia geológica, pero los extremos son creíbles.

Por pozo, el extremo más acuoso del demo es MN-27 (Morichal, 98,1 %: 51,9 bbl de agua por bbl de crudo) y LC-02 (La Ceiba, 97,0 %: 32,8); los más secos son los de bombeo mecánico de La Ceiba (LC-19, 60,4 %: 1,53) y, entre las electrosumergibles, LC-15 (92,7 %: 12,7) y MN-15 (92,8 %: 13,0). Justo por eso MN-27 y LC-02 son los **primeros** del orden de cierre (4.2): son los que menos crudo dan por barril de agua.

Con estos cortes la bomba de reinyección deja de ser una bomba y pasa a ser un **tren**: La Ceiba movía unos 222.500 bbl/d de agua con tres bombas iguales en paralelo (P-201A/B/C) y Morichal mueve unos 559.400 con siete (P-201A a P-201G). Lo que se modela es la bomba del tren que tiene medidor (`P-201B`); las demás entran como su **respaldo** (4.2).

## 4.2 Las piezas: qué es la bomba en ese campo, el tanque y el respaldo

### Perfil de la bomba en el campo (`PerfilBomba`)

**Qué es.** Lo que la bomba hace con su fluido en ese campo. Decide si parar es diferido de hoy.

| Campo | Bomba | `papel` | `capacidadBpd` | `pozos` | `sinBomba.fraccion` | `sinBomba.fuente` |
|---|---|---|---|---|---|---|
| ceiba | P-201B | `disposicion` | 89.250 | — | 1 | Lo que P-201A y P-201C no absorben no tiene otra salida |
| morichal | P-201B | `disposicion` | 86.500 | — | 1 | Lo que las otras seis bombas del tren no absorben no tiene otra salida |
| morichal | MPP-301 | `transporte` | 90.000 | MN-07, MN-18, MN-33 | 1 | Declarado por ingeniería: sin la bomba, la contrapresión de la línea no deja fluir el clúster |
| guacamayo | P-201B | `recobro` | 50.000 | — | 0 | El agua tiene salida alterna: la parada no cierra pozos |

`capacidadBpd` de una bomba de disposición es lo que el cabezal de disposición la deja mover (89.250 y 86.500 bbl/d, por debajo de los 90.000 nominales de cada bomba); la Planta suma esos límites para la capacidad del tren (5D.7). `sinBomba.fraccion` = fracción de lo servido que **no fluye** sin la bomba (1 si no hay derivación). Hoy vive en código (`PERFILES`, `bombas.ts:208-236`); en producción es configuración/registro de ingeniería (ver «Huecos»). Una bomba sin perfil en el campo es un **hueco de configuración**: la placa dice «Falta declarar papel, capacidad y respaldo» y no se calcula crudo en riesgo.

### Tanque de agua (`TanqueAgua`, configuración firmada)

| id | Campo | Bomba | `capacidadBbl` | `altoAlto` | `tagNivel` | `aforo` |
|---|---|---|---|---|---|---|
| TK-AG-CE | ceiba | P-201B | 30.000 | 0,90 | LT-2012 | Certificado de aforo TK-AG-CE · tabla de 1 cm |
| TK-AG-MN | morichal | P-201B | 60.000 | 0,90 | LT-2012 | Certificado de aforo TK-AG-MN · tabla de 1 cm |
| TK-AG-GU | guacamayo | P-201B | 20.000 | 0,90 | LT-2012 | Certificado de aforo TK-AG-GU · tabla de 1 cm |

Se busca por la clave (`campoId`, `bomba`) (`tanqueDe`, `configuracion.ts:187`). Una bomba mide contra un solo tanque (la validación de la configuración rechaza dos). Con 30.000 bbl y 222.500 bbl/d de agua, el tanque de La Ceiba es poco más de tres horas del caudal del campo: por eso el colchón se cuenta en horas, no en días.

### Respaldo (`RespaldoBomba`, configuración firmada)

| Campo | Equipo | `libreBpd` | `detalle` |
|---|---|---|---|
| ceiba | P-201B | 30.100 | P-201A y P-201C en paralelo, con 30.100 bbl/d libres entre las dos: el cabezal de disposición las limita a unos 89.250 cada una |
| morichal | P-201B | 39.500 | Las otras seis bombas del tren, con 39.500 bbl/d libres entre todas: el cabezal de disposición las limita a unos 86.500 cada una |
| morichal | MPP-301 | 0 | Sin bomba en paralelo ni derivación al manifold |
| guacamayo | P-201B | 50.000 | P-201C de reserva (50.000 bbl/d), alineada al pozo de disposición alterno: toma todo su caudal |

En un tren en paralelo el respaldo es **lo que las otras bombas toman de más**: en La Ceiba, P-201A y P-201C mueven 74.200 bbl/d cada una y su límite es 89.250, así que entre las dos toman 2 × (89.250 − 74.200) = 30.100 bbl/d más; en Morichal, seis bombas × (86.500 − 79.900) = 39.600, firmado como 39.500. Se busca por (`campoId`, `equipo`) (`respaldoDe`, `configuracion.ts:188`). **Sin respaldo declarado, la predicción toma 0** (`respaldoLibre`, `diferido.ts:63`).

### Nivel del tanque ahora

`NIVEL_AHORA` (`pozos.ts:203-207`): TK-AG-CE 89,6 %, TK-AG-MN 61,8 %, TK-AG-GU 42,3 %, todos de `LT-2012` a las 13:59 del 2-oct. **En el demo es una constante en el código**; en producción es `GET /api/campos/:campo/tanques/:tanque/nivel` (el transmisor). Viaja al front en `GET /api/vistas/campos/:campo/ahora` → `niveles` (un tanque sin lectura no aparece).

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
- La Ceiba, `FI-2011`: serie diaria `[74220, 74190, 74250, 74200, 74180, 74230, 74210, 74190, 74200, 74160, 63070, 0]`. Se quita el 0 (ya parada) → 11 lecturas; ordenadas, la 6.ª es **74.200 bbl/d** (un tercio del agua que entraba al parar: el tren reparte parejo).
- Morichal, `FI-2011`: `[79845, 79925, 79875, 79945, 79895, 79935, 79855, 79915, 79885, 79955, 79865, 79905]` → 12 lecturas; mediana $(79.895 + 79.905)/2 =$ **79.900 bbl/d** (siete bombas × 79.900 ≈ los 559.389 bbl/d que entran hoy).

**Casos borde.** Bomba de recobro o multifásica: no se calcula (no aplica). En el demo la serie es diaria (12 puntos); en producción la cadencia la dice `pasoH` y la mediana es sobre la ventana que el servidor escoja (ver «Huecos»).

---

### Agua sin salida

**Qué es.** Lo que el respaldo no absorbe: el caudal que llena el tanque cuando la bomba para.

**Fórmula** (`diferido.ts:299`; en una parada medida, `diferido.ts:377`):

$$
Q_{\text{sin salida}} = \max\left(0,\ Q_{\text{mueve}} - Q_{\text{respaldo}}\right) \cdot s \quad [\cdot\ p \text{ en una parada medida}]
$$

| Símbolo | Significado | Unidad | De dónde sale |
|---|---|---|---|
| $Q_{\text{respaldo}}$ | capacidad libre del respaldo | bbl/d | `RespaldoBomba.libreBpd` (0 si no hay) |
| $s$ | `sinBomba.fraccion` | 0–1 | perfil |
| $p$ | `EventoBomba.perdida` (solo al medir una parada: una pérdida parcial llena el tanque más despacio) | 0–1 | PLC |

**Ejemplo.** La Ceiba: $\max(0, 74.200 - 30.100) \cdot 1 = $ **44.100 bbl/d** (P-201A y P-201C toman 30.100 de los 74.200 de P-201B). Morichal: $\max(0, 79.900 - 39.500) \cdot 1 = $ **40.400 bbl/d** (las otras seis absorben 39.500).

**Qué texto se muestra.** Detalle → «COLCHÓN DEL TANQUE» → «Agua sin salida 40.400 bbl/d» (`n0`). Con $Q_{\text{sin salida}} \le 0$ el método dice «El respaldo absorbe toda el agua: parar no cierra pozos».

---

### Colchón del tanque

**Qué es.** Las horas que tarda el tanque en llegar al alto-alto si la bomba se para ahora. Después de eso hay que cerrar pozos.

**Dónde se ve.**
- Placa de la bomba (ingeniería/operación, bomba en marcha): «si se para: **10,1 h** de colchón, luego se pierden **783 bbl/d**» (`Placa.tsx:163-169`).
- Detalle de la bomba → panel «SI SE PARA AHORA» → «COLCHÓN DEL TANQUE»: barra del nivel contra el alto-alto, Capacidad, Volumen libre, Agua sin salida, **Aguanta** (`Detalle.tsx:310-327`).
- Detalle → cifra «Si se para ahora» → pie «tras 10,1 h de colchón · ±15,0 %» (el ± solo en ingeniería) (`Detalle.tsx:111-116`).
- Ficha ejecutiva: «Si para ahora · el tanque aguanta 10 h · luego se pierden 783 bbl/d» (`FichaEjecutiva.tsx:106-109`).

**Fórmula** (`colchonDe`, `diferido.ts:147-156`):

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
| $\varepsilon_{\text{agua}}$ | incertidumbre del medidor de agua (no declarada): se acota con la banda de asignación del agua de la Fig. 10.2, 0,90–1,10 → 0,10 para cualquier producción | — | `toleranciaAgua` (`diferido.ts:70-78`) |

**Ejemplo con los datos del demo — Morichal P-201B (en marcha).**
1. $V_{\text{libre}} = (0{,}90 - 0{,}618) \cdot 60.000 = $ **16.920 bbl**.
2. $Q_{\text{sin salida}}/24 = 40.400/24 = 1.683{,}33$ bbl/h.
3. $h = 16.920 / 1.683{,}\overline{3} = $ **10,0515 h** (con `n1` se escribe «10,1»).
4. $\varepsilon_{\text{aforo}} = 0{,}002 \cdot 60.000 / 16.920 = 0{,}0071$; $\varepsilon = \sqrt{0{,}0071^2 + 0{,}10^2} = 0{,}1003$.
5. Rango: **9,04 h a 11,06 h**.
6. Pantalla: Detalle «Aguanta **10,1 h** (9,0 h a 11,1 h)» (`fmtHoras(h, true)`: < 48 h con un decimal); ⓘ «Aforo del tanque de agua ±0,7 %: Res. MME 40236/2022, Anexo 2… · Caudal de agua ±10,0 %: Incertidumbre del medidor no declarada; se acota con la banda del agua…»; Placa «10,1 h de colchón»; Ficha «aguanta 10 h» (`fmtHoras(h)` sin decimal); barra «nivel LT-2012 61,8 %» contra «alto-alto 90 %». Encabezado del panel: «TK-AG-MN · LT-2012 61,8 %».

**La Ceiba P-201B (parada).** El motor también lo calcula con el nivel de ahora: $V_{\text{libre}} = (0{,}90 - 0{,}896) \cdot 30.000 = 120$ bbl, $h = 120 / (44.100/24) = 0{,}065$ h, $\varepsilon = 0{,}51$ (el aforo pesa: 0,2 % de 30.000 bbl = 60 bbl sobre 120 libres), rango 0,032–0,099 h. Es lo que aguantaría **si parara ahora con todo produciendo**; con la bomba ya parada **no es cuándo se llena el tanque** (eso es `llenado`, abajo). Detalle y Placa no lo muestran con la bomba parada (`pr.colchon && !pr.parada`); viaja en la API.

**Casos borde.**

| Situación | Qué devuelve | Qué muestra |
|---|---|---|
| $Q_{\text{sin salida}} = 0$ (el respaldo absorbe todo) | `horas: Infinity` → en JSON **`null`** (`horasSinFin`, `contrato.ts:165`); `rango` igual | método «El respaldo absorbe toda el agua: parar no cierra pozos»; placa «si se para: no cierra pozos» + ⓘ «El respaldo absorbe toda el agua: parar no cierra pozos.»; Detalle «Si se para ahora · **no cierra pozos**» con pie «el respaldo absorbe toda el agua» y «Aguanta · no se llena»; ficha ejecutiva «Si para ahora · no cierra pozos: el respaldo absorbe toda el agua» (`respaldoAbsorbe`, `widgets/bombas/comun.ts:20`). No ocurre en el demo |
| Nivel ya en o sobre el alto-alto | `libreBbl = 0`, `horas = 0`, `agotado: true`, $\varepsilon_{\text{aforo}} = 0$ | «0,0 h» |
| Sin tanque configurado | `colchon` ausente; supuesto «Sin tanque configurado: no se puede calcular el colchón» | cifra «Si se para ahora» con pie «de inmediato» |
| Sin lectura de nivel | `colchon` ausente (sin supuesto propio) | ídem |
| Papel `transporte` o `recobro` | no hay colchón | — |

---

### Llenado del tanque con la bomba ya parada (`Prediccion.llenado`)

**Qué es.** Con una bomba de disposición **ya parada**, cuándo llega el tanque al alto-alto con lo que la parada dejó **sin salida** y que todavía **no se quitó cerrando pozos**. El colchón de arriba responde otra pregunta: «si la bomba parara ahora **con todo el campo produciendo**». Con la bomba ya parada y los pozos que hacía falta cerrar ya cerrados, el tanque no sube, esté donde esté.

**Dónde se ve.** Planta (`#/<rol>/planta/<campo>/…`): la marca de prioridad del tanque de agua (en la lista, la barra del nivel y el nodo del dibujo) y su aviso bajo la barra, en el globo («Sube») y en el lector: «P-201B detenida: llega al alto-alto en <`fmtHoras`>» («en menos de 1 h» por debajo de 1 h), solo con horas finitas; si no sube, «P-201B detenida: no entra agua, el nivel no sube» o, con agua entrando que el resto del tren toma, «P-201B detenida: el respaldo toma el agua que entra, el nivel no sube» (`Planta.tsx:118-137`; 5D.7). La Planta ya no lee `colchon.horas` para esto.

**Fórmula** (`llenadoDe`, `diferido.ts:254-283`; tipo `Llenado`, `diferido.ts:193-207`). Corregida el 9-oct con el tren de agua: la de antes restaba del agua que **entra** solo el respaldo libre, lo que vale para una bomba única pero no para un tren en paralelo, donde las otras bombas ya mueven su parte; con la fórmula vieja La Ceiba de hoy diría «llega al alto-alto en menos de 1 h» con ▲ P2 aunque los cierres ya equilibraron el agua.

$$
Q^{\text{parada}}_{\text{sin salida}} = \max\!\left(0,\ \left(p \cdot Q_{\text{mueve}} - Q_{\text{respaldo}}\right) \cdot s - Q_{\text{quitada}}\right)
\qquad
Q_{\text{quitada}} = \sum_{j\ \text{cerrado o frenado por la parada}} w_j \cdot \psi_j
\qquad
h_{\text{llena}} = \frac{V_{\text{libre}}}{Q^{\text{parada}}_{\text{sin salida}} / 24}
$$

$$
\text{prioridad} = \begin{cases} 1 & V_{\text{libre}} = 0 \ (\text{ya en el alto-alto}) \\ 2 & h_{\text{llena}} < 24 \\ 3 & 24 \le h_{\text{llena}} \le 2.160\ (90\ \text{días}) \\ 0 & \text{no sube } (h = \infty) \text{ o más allá de 90 días} \end{cases}
$$

| Símbolo | Significado | Unidad | De dónde sale |
|---|---|---|---|
| $p$ | pérdida de la parada (1 = paró del todo; < 1 = sigue sacando una parte) | 0–1 | `EventoBomba.perdida` |
| $Q_{\text{mueve}}$, $Q_{\text{respaldo}}$, $s$, $V_{\text{libre}}$ | como en el colchón (arriba); $V_{\text{libre}}$ con el nivel de **ahora** | | |
| $w_j$ | agua de la prueba vigente del pozo $j$ que la parada cerró o frenó (los de `perdiendo.pozos`) | bbl/d | `aguaDePrueba(p)` |
| $\psi_j$ | 1 si está cerrado; si va a frecuencia reducida, la parte que deja de dar | 0–1 | `perdidaPorFrecuencia(hz, hz de la prueba)` |
| $Q_{\text{entra}}$ | agua que entra ahora al tanque (los pozos que producen, con la parte que no pierde el que va a frecuencia reducida): **se devuelve para leer, no entra en la cuenta** | bbl/d | `caudalesAhora(campo).agua` (`diferido.ts:683-694`), el mismo caudal de `/vistas/campos/:campo/ahora` |
| tolerancia | $\sqrt{\varepsilon_{\text{aforo}}^2 + 0{,}10^2}$, con el componente «Agua de los pozos» (agua de las pruebas acotada con la banda del agua, no el medidor de la bomba) | — | `toleranciaAgua(campo, 'pruebas')` (`diferido.ts:70-78`) |

Dicho en palabras: lo que la bomba movía es su parte del agua que entraba (la mediana de su medidor); el respaldo es lo que el resto del tren toma de más; la diferencia es lo que entra de más al tanque al parar, y cada pozo que se cierra por la parada le quita su agua. La prioridad es la regla de la salud de las partes (ISA-18.2: por el tiempo hasta la consecuencia, no por un porcentaje del nivel).

**Ejemplo con los datos del demo — La Ceiba P-201B** (parada desde el 2-oct 03:52, `perdida` 1, respaldo 30.100 bbl/d, tanque en 89,6 % ahora).
1. La parada dejó sin salida $(1 \cdot 74.200 - 30.100) \cdot 1 = 44.100$ bbl/d.
2. Cerró dos pozos: LC-16 (25.289 bbl/d de agua) y LC-07 (23.221) → $Q_{\text{quitada}} = 48.510$ bbl/d.
3. $Q^{\text{parada}}_{\text{sin salida}} = \max(0, 44.100 - 48.510) = 0$ → $h_{\text{llena}} = \infty$ (`null` en el cable), `prioridad` **0**; $V_{\text{libre}} = (0{,}90 - 0{,}896) \cdot 30.000 = 120$ bbl (a 0,4 puntos del alto-alto).
4. $Q_{\text{entra}}$ = **174.033 bbl/d** (15 de 18 pozos producen; parados LC-16, LC-07 y LC-21, este por su propia falla desde el 1-oct). Cuadra con la Planta: P-201A y P-201C sacan hasta 2 × 89.250 = 178.500; la holgura de 4.467 bbl/d es lo que se cerró de más (48.510 − 44.100 = 4.410; difieren en 57 bbl/d, menos de 0,1 % de lo que entra). Por eso no cabe reabrir ningún pozo cerrado: el menor (LC-07) da 23.221.
5. El colchón de la predicción da 0,065 h (si parara ahora con todo produciendo) y **no** es cuándo se llena: la Planta pinta el tanque en gris, «P-201B detenida: el respaldo toma el agua que entra, el nivel no sube».
6. `llenado` = `{ aguaEntraBpd: 174033, colchon: { libreBbl: 120, aguaSinSalidaBpd: 0, horas: null, … }, prioridad: 0 }`; componentes «Aforo del tanque de agua ±50,0 %» y «Agua de los pozos ±10,0 %: Agua de la prueba vigente de los pozos que producen; se acota con la banda del agua…».

**Con los pozos cerrados reabiertos** (mundo de prueba de `verificar-libro` §19: LC-07 y LC-16 vuelven a producir con la bomba parada).
1. No queda ningún pozo cerrado por la parada: $Q_{\text{quitada}} = 0$ y $Q^{\text{parada}}_{\text{sin salida}}$ = 44.100 bbl/d = 1.837,5 bbl/h ($Q_{\text{entra}}$ sube a 222.543 bbl/d, 17 de 18 pozos).
2. $h_{\text{llena}} = 120 / 1.837{,}5 = $ **0,065 h** (3,9 min), rango 0,032–0,099 h ($\varepsilon$ = 0,51).
3. Menos de 24 h → **prioridad 2** ▲; Planta: «P-201B detenida: llega al alto-alto en menos de 1 h».
4. Con un respaldo que toma toda esa agua (respaldo de $10^6$ bbl/d): $Q^{\text{parada}}_{\text{sin salida}} = 0$, no sube, sin hora y prioridad 0 («el respaldo toma el agua que entra, el nivel no sube»).

**Casos borde.**

| Situación | `llenado` |
|---|---|
| Bomba en marcha, multifásica o de recobro | ausente (no aplica) |
| Disposición parada sin tanque firmado o sin lectura de nivel | ausente |
| Tanque ya en el alto-alto | `agotado: true`, `horas` 0, prioridad 1 (la Planta además pone P1 por el nivel, esté la bomba como esté) |
| Agua quitada cerrando pozos ≥ lo que la parada dejó sin salida | `horas: null`, prioridad 0 |
| Más de 90 días hasta el alto-alto | prioridad 0 (gris) |

**Quién lo calcula y por dónde viaja.** Servidor. `GET /api/vistas/bombas/prediccion?campo&equipo` → `Prediccion.llenado?` = `{ aguaEntraBpd, colchon, prioridad }`; `colchon.horas` y `colchon.rango` viajan como `null` si no sube (`horasSinFin`, `contrato.ts:173`). CONTRATO.md:306 y «Predicción» (`CONTRATO.md:1109-1126`).

**Referencia.** `diferido.ts:178-207`, `:254-283`; casos `referencia/prediccion/ceiba-P-201B.json` y `referencia/salud/bombas-ceiba-2026-09.json` (traen `llenado`); `verificar-libro.mjs` §19 (1).

---

### Orden de cierre y crudo en riesgo

**Qué es.** Cuando el tanque llega al alto-alto hay que quitar del sistema el agua que la bomba no saca. Cerrar «parejo» (la misma fracción a todos los pozos) es lo intuitivo; TRIM recomienda cerrar **primero los pozos que menos crudo dan por barril de agua**, hasta quitar la misma agua. Sin límite por pozo es una mochila fraccionaria y el voraz por razón crudo/agua es óptimo; con el tope de frecuencia de las electrosumergibles (abajo, desde el 9-oct) sigue el mismo criterio, pero un pozo ya no se puede cerrar en cualquier fracción y el voraz deja de ser el óptimo exacto en casos de borde.

**Dónde se ve.** Detalle → «SI SE PARA AHORA» → «ORDEN DE CIERRE» (tabla `# · Pozo · Crudo bbl/d · Agua bbl/d · Crudo/agua · Cierre`, 12 filas máx. y «y N pozos más: se cierra todo el campo»), y la frase «pierde **783 bbl/d** en este orden · **439 bbl/d menos** que parejo» con ⓘ «Cerrando parejo (la misma fracción a todos) serían 1.222 bbl/d.» (`Detalle.tsx:342-362`). En la placa: la ⓘ «Si se para ahora» con «El tanque aguanta 10,1 h; luego se pierden 783 bbl/d cerrando los pozos en orden (1.222 bbl/d cerrando parejo).» (solo si parejo > orden + 1). En Riesgo, la fila de la bomba: «si para **783** bbl/d» (debajo, «≈ 1.235 bbl si falla hoy», cap. 5) y `pozos` = número de pasos.

**Fórmula** (`ordenDeCierre`, `diferido.ts:111-130`; `ordenOptimo`, `libro.ts:945-965`).

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

y se recorre acumulando agua. Cada pozo se cierra **entero si cabe**; el que no cabe entero se cierra en fracción $\phi_k = \min\left(1, \frac{W - \sum_{j<k} w_j\phi_j}{\max(1, w_k)}\right)$ (en la práctica: se le baja la frecuencia o se estrangula). Una **electrosumergible** no baja más de **25 %** (`BAJA_MAXIMA_ESP`, `libro.ts:937`: de 60 a unos 45 Hz con el caudal proporcional a la frecuencia; más abajo, con la misma cabeza, deja de levantar y el motor no se refrigera): $\phi_k \leftarrow \min(\phi_k, 0{,}25)$ y lo que falta lo da el siguiente del orden. Si al final todavía falta agua (casi todo el campo hay que quitar), las que se bajaron en parte se cierran enteras, en el mismo orden. Un pozo de bombeo mecánico o de flujo natural no tiene ese tope.

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
| $r_j$ | crudo por barril de agua: el criterio del orden | bbl/bbl | calculado (en la tabla, con `n3`: con 95-98 % de agua va de 0,01 a 0,05 y dos decimales no separan los pozos) |

`Prediccion.crudoBpd` = crudo en orden; `crudoParejoBpd` = crudo parejo. Los pozos sin prueba no se pueden ordenar (no se sabe cuánta agua dan): van en `orden.sinPrueba` y en el supuesto «Sin prueba, fuera del orden: …».

**Ejemplo con los datos del demo — Morichal P-201B, si se para ahora.** $W = 40.400$ bbl/d (hay respaldo). 40 pozos producen (MN-41 está parado por su falla a tierra del 25-sep), con 559.389 bbl/d de agua y 16.920 bbl/d de crudo asignado. FA = 0,981.

| # | Pozo | $c$ prueba | Crudo asignado del paso (pantalla, `n0`) | Agua del paso (pantalla) | Crudo/agua (`n3`) | Cierre |
|---|---|---|---|---|---|---|
| 1 | MN-27 | 520 | 510 | 26.968 | 0,019 | entero |
| 2 | MN-36 | 509 | 125 | 6.262 | 0,020 | 25 % |
| 3 | MN-13 | 325 | 80 | 3.873 | 0,021 | 25 % |
| 4 | MN-39 | 447 | 68 | 3.297 | 0,021 | 16 % |

- MN-27 entero: 26.968 bbl/d. Faltan 13.432; MN-36 da 25.048, así que cabría al 54 %, pero una electrosumergible no baja más de 25 %: 6.262 bbl/d. MN-13, también al tope: 3.873 (de 15.491). Acumulado 37.103; faltan 3.297 de los 21.244 de MN-39 → $\phi = 0{,}155$ («16 %»).
- Crudo en orden = 510,35 + 124,89 + 79,74 + 68,09 = **783,07 bbl/d** → «783 bbl/d».
- Parejo = 16.920,08 × 40.400 / 559.389 = **1.222,00 bbl/d** → «1.222».
- Ahorro = **438,92 bbl/d** → «439 bbl/d menos que parejo».
- Sin el tope (como era antes del 9-oct), MN-36 iría al 54 % (unos 28 Hz) y el orden perdería 778 bbl/d: 5 bbl/d menos sobre el papel, con una bomba trabajando donde no levanta.
- Lectura completa para operación: *si P-201B de Morichal se para ahora, el tanque aguanta 10,1 h (9,0–11,1); después hay que cerrar MN-27 y bajarles la frecuencia a MN-36 y MN-13 (25 %) y a MN-39 (16 %), y se pierden 783 bbl/d (≈ 33 bbl/h), en vez de 1.222 bbl/d cerrando parejo.*

**La Ceiba P-201B (parada, con respaldo).** $W = Q_{\text{sin salida}} = 44.100$ bbl/d entre los 18 pozos (todos, porque la bomba ya está parada; 224.075 bbl/d de agua y 11.360,23 de crudo asignado, FA 0,958): LC-02 (0,030), LC-10 (0,034) y LC-01 (0,036) enteros, LC-17 al 25 % y LC-07 al 12 % → crudo en orden **1.425,5 bbl/d**, parejo 2.235,8, ahorro 810,3. Es lo que `Prediccion.orden` trae para leer: con la bomba parada el Detalle no pinta el orden (pinta «POZOS QUE CERRÓ», 4.3). Los operarios no cerraron así: el alto-alto disparó el pozo que más agua da (LC-16) y siguieron con el siguiente (LC-07), y se pierden 1.665 bbl/d (4.3); lo que eso costó de más se mide en 4.5.

Sin respaldo (`libreBpd` 0; ninguna bomba de disposición del demo lo está hoy) **no hay orden que escoger: se cierra todo el campo**, $W = \sum w_j$ y crudo en orden = parejo (método «Sin respaldo, el agua no tiene salida: al llenarse el tanque se cierra todo el campo»); `verificar-libro` §9 quita el respaldo firmado de La Ceiba y la predicción toma 0 de respaldo mientras la ficha pasa a «sin respaldo» y «si para: todo el campo».

**Casos borde.** Sin factor medido en el campo, FA = 0 → crudo 0 (no se inventa). Un pozo con agua 0 usa $\max(1, w)$ para no dividir por cero (queda al final del orden). $W$ nunca supera el agua de los candidatos.

---

## 4.3 La predicción completa por papel (`prediccion`)

**Qué es.** Lo que pasaría si la bomba se parara ahora, o lo que está pasando si ya está parada. `GET /api/vistas/bombas/prediccion?campo&equipo` → `Prediccion` (`diferido.ts:161-189`).

| Papel / estado | `inmediato` | `crudoBpd` | `colchon` / `orden` | `perdiendo` | `metodo` |
|---|---|---|---|---|---|
| `recobro` (Guacamayo P-201B) | **false** | 0 | — | `{0, []}` solo si está parada | «Inyección para recobro con salida alterna para el agua: parar no cierra pozos hoy. Baja el soporte de presión del yacimiento y el efecto llega en semanas.» |
| `transporte` en marcha (Morichal MPP-301) | true | $s \cdot \sum$ crudo asignado de los pozos del clúster que producen y tienen prueba | — | — | «Crudo de los 3 pozos que pasan por la bomba: prueba vigente × factor de asignación del mes (0,981)» |
| `transporte` parada | true | ídem | — | `perdiendoPor` | «Parada desde <fecha>: N pozos cerrados por ella» |
| `disposicion` en marcha (Morichal P-201B) | true | crudo en orden | sí / sí | — | «Hay que quitar 40.400 bbl/d de agua: se cierran primero los pozos con menos crudo por barril de agua» |
| `disposicion` parada (La Ceiba P-201B) | true | crudo en orden (con todos los pozos) | sí / sí, y además **`llenado`** (el tanque con lo que la parada dejó sin salida y no se ha quitado; 4.2) | `perdiendoPor` | «Parada desde 2 de oct, 03:52: 2 pozos cerrados por ella» |

**Lo que está perdiendo una bomba parada** (`perdiendoPor`, `diferido.ts:289-300`):

$$
\text{perdiendo} = \sum_{p\,:\,\text{causa del evento abierto de } p \text{ tiene } \text{evento} = \text{id}} \text{crudoAsignado}(p) \cdot \begin{cases} f(hz) & \text{si } p \text{ produce a frecuencia reducida} \\ 1 & \text{si está cerrado}\end{cases}
$$

con `id` = `causaDeParada(parada).evento` (la propia parada, o el servicio que la paró: así una bomba parada por SE-2 no se queda con los pozos que son de SE-2).

**Ejemplo — La Ceiba.** 2 pozos con su evento abierto cargado a `EV-2011-1002`: LC-07 (796,2 bbl/d de crudo asignado) y LC-16 (869,0) → **1.665,2 bbl/d** (LC-21 también está parado, pero por su propia falla «sin identificar» desde el 1-oct: no se le carga a la bomba). En pantalla: Detalle, cifra «Perdiéndose ahora **1.665 bbl/d**», pie «69 bbl/h · 2 pozos cerrados»; panel «MIENTRAS ESTÉ PARADA» → «Parada desde 2 de oct, 03:52» y «POZOS QUE CERRÓ · 2» con la lista (LC-07, LC-16) y ⓘ «Se pierden 1.665 bbl/d mientras siga parada. Al arrancar, los pozos vuelven a producir a medida que el tanque baja.». (La placa directiva del gerente con lo que se está perdiendo se quitó el 8-oct: el gerente no ve Bombas.)

**Ejemplo — Morichal MPP-301** (`supuestos`): «MN-07: 607 bbl/d · prueba del 2026-09-13», «MN-18: 526 bbl/d · prueba del 2026-09-25», «MN-33: 467 bbl/d · prueba del 2026-09-05», y la fuente de `sinBomba`. `crudoBpd` = **1.599,75 bbl/d**; pantalla: «si se para: **1.600 bbl/d** de inmediato». Panel «POZOS QUE PASAN POR ELLA» con esos renglones.

**Ejemplo — Guacamayo P-201B.** `inmediato: false`, `crudoBpd: 0`. Placa: «si se para: no cierra pozos hoy» + ⓘ «No cierra pozos hoy. Baja el soporte de presión.»; Detalle: cifra «Si se para ahora · **no cierra pozos**», pie «recobro: el efecto llega en semanas». En Riesgo, una de recobro en riesgo dice «≈ 0 bbl si falla hoy» (cap. 5).

**Tolerancia de la predicción.** `tolerancia` = banda de asignación del crudo del campo (`bandaDe(campo).valor`; 0,15 en La Ceiba y Morichal, 0,05 en Guacamayo), y `componentes` = [crudo asignado (correlado), aforo, caudal de agua]. En Detalle (ingeniería) se escribe `fmtTol` → «±15,0 %».

**Supuestos** (Morichal P-201B, en este orden): «Mediana de FI-2011 mientras la bomba trabaja» · «Las otras seis bombas del tren, con 39.500 bbl/d libres entre todas: el cabezal de disposición las limita a unos 86.500 cada una» · «Tanque de agua de Morichal Norte: 60.000 bbl, alto-alto al 90 % · Certificado de aforo TK-AG-MN · tabla de 1 cm» · «Nivel LT-2012: 61,8 %». En pantalla, ⓘ «supuestos» (no en la vista simple) y ⓘ «método» (solo con la bomba en marcha).

**Referencia.** `diferido.ts:209-334`; casos `referencia/prediccion/{ceiba-P-201B,morichal-P-201B,morichal-MPP-301,guacamayo-P-201B}.json`.

---

## 4.4 Una parada medida: lo previsto contra lo observado (`paradaMedida`)

**Qué es.** Cada parada de la historia de la bomba, con lo que costó, a quién se le carga, y —en disposición— cuánto **debía** aguantar el tanque contra cuánto **aguantó** (del paro al primer pozo cerrado). Es la prueba de que el modelo del colchón funciona con datos de la planta.

**Dónde se ve.** Detalle de la bomba → lista de paradas (más reciente primero): fila con fecha, «hasta <fecha> · <horas>», parte o texto, cómo, «se carga a <equipo>» si no es propia, «colchón X h · aguantó Y h», barriles y rango. Al abrir: «POR QUÉ PARÓ», evidencia, «EL TANQUE», «POZOS QUE CERRÓ · N», «evitable en orden», «N bbl aproximados» (`Detalle.tsx:384-481`). Placa: «Detenida desde <fecha>» + barriles de la parada abierta.

**Fórmulas** (`diferido.ts:365-404`):

$$
\text{tramos} = \{\text{tramos de la historia con } (\text{causa.evento} \lor \text{evento.id}) = \text{id}\}\ \big[\cap\ (t_{\text{ini}}, t_{\text{fin}}) \text{ si la paró un servicio}\big]
$$

$$
\text{bbl} = \sum \text{tramos.bbl} \qquad \text{pozos} = \#\{\text{pozo}\} \qquad \text{horasParada} = \max(0, t_{\text{fin o AHORA}} - t_{\text{ini}})
$$

$$
\text{colchón previsto} = \text{colchonDe}\left(\text{tanque}_{\text{regía}},\ n_{\text{al parar}},\ \max(0, Q_{\text{mueve}} - Q^{\text{regía}}_{\text{respaldo}}) \cdot p \cdot s\right)
\qquad
\text{observado} = \frac{\min(\text{tramos.evento.inicio}) - t_{\text{ini}}}{1\ \text{h}}
$$

**La configuración que regía.** El tanque y el respaldo son los de la versión firmada vigente **cuando paró** la bomba: $\text{regía} = \text{configEn}(\text{versiones}, t_{\text{ini}})$ (`diferido.ts:365-385`; `configEn`, 5D.2), como en los mensajes de WhatsApp. Firmar hoy otro respaldo o cambiar un tanque no reescribe lo que el tanque **debía** aguantar en una parada de septiembre. `paradaMedida(ev, ctx, versiones)` recibe el historial (`GET /api/configuracion/historial`, de la más vieja a la vigente); la costura lo pasa en `pedirParadas`, `pedirParadasEnPeriodo`, `pedirParadasDeBombas` y `pedirBombas` (`shared/api/diferidos.ts:180-219`, `shared/api/equipos.ts:262`; sin historial a mano, `soloLaVigente(ctx)`, `shared/api/diferidos.ts:88`, que es lo que usa `scripts/referencia.mjs`). Ejemplo corrido (`verificar-libro` §18, la primera parada medida de septiembre): `EV-2011-0922` (La Ceiba, 22-sep, nivel 80,2 %) debía aguantar **1,60 h** (2.940 bbl libres / 44.100 bbl/d); si hoy se firma 5.000 bbl/d más de respaldo, sigue en 1,60 h; si esa misma firma hubiera regido desde antes de la parada, 2.940 / (39.100/24) = **1,80 h**.

El colchón solo se mide si la bomba es de `disposicion`, tiene tanque, la parada trae `nivelAlParar` y la causa es **la propia bomba** (`causa.equipo === ev.equipo`; incluye la programada, no la que paró un servicio). `id` = `causa.evento ?? ev.id`. Si la paró un servicio, los barriles son del servicio y aquí solo se muestran los que cayeron mientras la bomba estuvo parada; `cargadoA` = el servicio.

`tolerancia` relativa = $\text{tol}/\text{bbl}$ con la tolerancia del libro (`toleranciaDe`); `rango` = $[\text{bbl} - \text{tol}, \text{bbl} + \text{tol}]$; `aproximado` = bbl de tramos a frecuencia reducida; `evitable` solo si `causa.tipo = 'reinyeccion'` (4.5); `pide` y `arrancoSinIdentificar` del cap. 3.

**Ejemplo con los datos del demo — la parada abierta de La Ceiba (`EV-2011-1002`).**
1. Paró el 2-oct a las 03:52:18 con el tanque en **78,7 %** (`LT-2012`), sin primera alarma.
2. $V_{\text{libre}} = (0{,}90 - 0{,}787) \cdot 30.000 = $ **3.390 bbl**; con el respaldo de entonces, $Q_{\text{sin salida}} = (74.200 - 30.100) \cdot 1 \cdot 1 = 44.100$ bbl/d = 1.837,5 bbl/h.
3. Debía aguantar $3.390 / 1.837{,}5 = $ **1,845 h** (1 h 50,7 min; rango 1,66–2,03 h).
4. El primer pozo (LC-16, `LSHH`) cerró a las 05:43:00 → aguantó **1,845 h** (1 h 50 min 42 s). El modelo acertó al minuto.
5. A las 05:46 cerró LC-07: los operarios cierran primero el pozo que más agua da (el alto-alto dispara LC-16, 25.289 bbl/d) y siguen con el siguiente (LC-07, 23.221) hasta quitar el agua sin salida: 48.510 ≥ 44.100. A las 14:00 la parada lleva **10,1 h** y **573 bbl** (rango 487–659, ±15,0 %).
6. Pantalla, fila: «2 de oct, 03:52 · abierta · 10,1 h», «colchón 1,8 h · aguantó 1,8 h», ▲ «por identificar», «**573 bbl**», «487 – 659 · ±15,0 %». «EL TANQUE»: «Al parar · LT-2012 78,7 %», «Libre hasta el alto-alto 3.390 bbl», «Agua sin salida 44.100 bbl/d», «Debía aguantar 1,8 h», «Primer pozo cerrado a las 1,8 h». Placa: «Detenida desde 2 de oct, 03:52», «**573 bbl**» «487 – 659 · calculado · 69 bbl/h · 2 pozos cerrados».

**Previsto contra observado en toda la historia** (horas; observado = del paro al primer pozo cerrado):

| Parada | Nivel al parar | Previsto | Observado | Pozos cerrados | Bbl |
|---|---|---|---|---|---|
| Ceiba `EV-2011-251019` | 73,8 % | 2,64 | 2,64 | 3 | 5.666 |
| Ceiba `EV-2011-251219` | 70,3 % | 3,22 | 3,21 | 3 | 5.935 |
| Ceiba `EV-2011-260325` | 75,7 % | 2,33 | 2,34 | 3 | 2.875 |
| Ceiba `EV-2011-260420` | 71,2 % | 3,07 | 3,08 | 3 | 3.421 |
| Ceiba `EV-2011-260708` | 80,3 % | 1,58 | 1,58 | 3 | 6.544 |
| Ceiba `EV-2011-260727` | 82,7 % | 1,19 | 1,20 | 3 | 7.453 |
| Ceiba `EV-2011-0809` | 77,3 % | 2,07 | 2,07 | 3 | 3.806 |
| Ceiba `EV-2011-260819` (programada) | 75,7 % | 2,33 | 2,34 | 3 | 1.523 |
| Ceiba `EV-2011-0922` | 80,2 % | 1,60 | 1,60 | 2 | 1.041 |
| Ceiba `EV-2011-1002` (abierta) | 78,7 % | 1,84 | 1,85 | 2 | 573 |
| Morichal `EV-M2011-251005` | 72,5 % | 6,24 | 6,23 | 3 | 5.063 |
| Morichal `EV-M2011-251207` | 51,7 % | 13,65 | 13,66 | 3 | 894 |
| Morichal `EV-M2011-260103` | 73,5 % | 5,88 | — (duró 3,7 h) | 0 | 0 |
| Morichal `EV-M2011-260217` (programada) | 58,0 % | 11,41 | 11,41 | 3 | 595 |
| Morichal `EV-M2011-260308` | 69,4 % | 7,34 | 7,34 | 3 | 3.541 |
| Morichal `EV-M2011-260326` | 54,3 % | 12,72 | 12,72 | 3 | 2.371 |
| Morichal `EV-M2011-260502` | 68,7 % | 7,59 | 7,64 | 2 | 2.762 |
| Morichal `EV-M2011-260608` | 80,0 % | 3,56 | 3,57 | 3 | 3.697 |
| Morichal `EV-M2011-260924` | 75,6 % | 5,13 | 5,14 | 2 | 3.789 |

La parada de K-101 (`EV-2011-260128`, 28-ene) no está: la paró el aire de instrumentos, sus barriles son de K-101 y cerró los 18 pozos. Las dos diferencias de 1,84 contra 1,85 (o 3,22 contra 3,21) son el redondeo a dos decimales de horas que coinciden al minuto.

**Lo que el tanque absorbió.** `EV-M2011-260103` (Morichal, succión): paró con el tanque en 73,5 % → libre 9.900 bbl → debía aguantar 5,9 h; la bomba volvió en 3,7 h: **ningún pozo cerró**, 0 bbl. Pantalla: «colchón 5,9 h · sin cerrar pozos», «0 bbl · no costó crudo», «EL TANQUE … lo absorbió sin cerrar pozos». Sigue siendo **una falla** de la bomba (cuenta en el MTBF con 0 bbl, cap. 7). Es la única: con 60.000 bbl y 40.400 bbl/d sin salida, el tanque de Morichal aguanta de 3,6 a 13,7 h, y casi todas las fallas duran más.

**Textos del colchón según el valor** (`Detalle.tsx:402-403`, `comun.ts:25-27`):

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

**Dónde se ve.** Detalle → parada abierta → «evitable en orden: **30 bbl**» + ⓘ «Cerrando primero los de menos crudo por barril de agua se habrían perdido 30 bbl menos.» (solo si > 0). En el libro, `evitablePorOrden` (suma de las paradas del período; ver capítulo del libro).

**Fórmula** (`evitableDeEvento`, `libro.ts:912-931`; el orden óptimo, con el tope del 25 % a las electrosumergibles, `libro.ts:945-965`). Sea $T$ = tramos de la parada con bbl > 0, $t_0$ = el primer cierre, $d$ = inicio del primer tramo (para escoger la prueba vigente):

1. Candidatos: pozos con prueba que estaban cerrados por esta parada **o** que producían en $t_0$ (un pozo ya parado por otra causa no tiene agua que quitar).
2. Si se cerraron todos los candidatos → **0** (no había orden que escoger).
3. $C_{\text{real}} = \sum_{t \in T} c_{p(t)} \cdot f_t$ y $W = \sum_{t \in T} w_{p(t)} \cdot f_t$ (con $f_t$ = factor del tramo: 1 cerrado, $<1$ frecuencia reducida).
4. $C_{\text{óptimo}}$ = crudo de `ordenOptimo(candidatos, W)`.

$$
\text{evitable} = \sum_{t \in T} \text{bbl}_t \cdot \left(1 - \frac{C_{\text{óptimo}}}{C_{\text{real}}}\right) \quad \text{si } C_{\text{óptimo}} < C_{\text{real}},\ \text{si no } 0
$$

Es decir, se escala lo realmente perdido por la proporción de crudo que el orden óptimo habría evitado.

**Ejemplo con los datos del demo — la parada abierta de La Ceiba `EV-2011-1002`** (P-201B, desde el 2-oct 03:52, por identificar). El tanque aguantó 1,8 h; a las 05:43 y 05:46 se cerraron 2 pozos:

| Pozo cerrado | Código | Crudo prueba | Agua prueba | Crudo/agua | bbl a las 14:00 |
|---|---|---|---|---|---|
| LC-16 | LSHH | 907 | 25.289 | 0,036 | 300 |
| LC-07 | CMD | 831 | 23.221 | 0,036 | 273 |

- $C_{\text{real}} = 1.738$ bbl/d, $W = 48.510$ bbl/d de agua quitada; 17 candidatos (LC-21 no: ya estaba parado por su propia falla desde el 1-oct).
- Orden óptimo para la misma agua: LC-02 (395 / 12.971), LC-10 (479 / 13.938) y LC-01 (376 / 10.543) enteros, LC-17 al 25 % (140,8 / 3.935), LC-07 al 25 % (207,8 / 5.805) y LC-16 al 5 % (47,3 / 1.318) → $C_{\text{óptimo}} = 1.645{,}8$ bbl/d.
- Evitable = 573,1 × (1 − 1.645,8 / 1.738) = **30 bbl** (5,3 % de lo perdido hasta las 14:00; crece mientras siga abierta).
- Con 95-97 % de agua todos los pozos dan de 0,03 a 0,04 bbl de crudo por barril de agua: cerrar los dos que más agua dan cuesta casi lo mismo que el mejor orden **para la misma agua**. Lo que más pesó fue otra cosa: se quitaron 48.510 bbl/d cuando sobraban 44.100. El orden de TRIM para los 44.100 (4.2) pierde 1.425,5 bbl/d contra los 1.665,2 que se pierden: 239,7 bbl/d (14 %). El evitable del motor **no** cuenta ese cierre de más (compara contra la misma agua quitada): es la cifra conservadora.

**Otro ejemplo — Morichal `EV-M2011-260924`** (24-sep 16:51 → 28-sep 06:53, sin identificar, no conforme): aguantó 5,1 h; a las 22:00 y 22:03 del 24-sep se cerraron MN-32 (LSHH; 642 / 28.449, 0,023; 2.092 bbl) y MN-27 (522 / 26.005, 0,020; 1.697 bbl). $C_{\text{real}} = 1.164$, $W = 54.454$, 38 candidatos (MN-07, MN-18 y MN-33 no: los tenía cerrados la parada de la MPP-301 de ese mismo día). Óptimo: MN-27 y MN-36 (509 / 25.048) enteros y MN-13 al 22 % (71,4 / 3.401) → 1.102,3; evitable = 3.788,5 × (1 − 1.102,3 / 1.164) = **201 bbl** (5,3 %). Cerrar MN-32, el que más agua da pero con 0,023 bbl de crudo por barril, fue lo más caro.

**En toda la historia del demo** (las paradas propias de reinyección que no cerraron todos los pozos que producían):

| Bomba | Paradas con evitable | Evitable (bbl) |
|---|---|---|
| La Ceiba P-201B | `251019` 369 · `251219` 387 · `260420` 261 · `260708` 500 · `260727` 553 · `0809` 282 · `0922` 55 · `1002` 30 (abierta) | 2.437 |
| Morichal P-201B | `251005` 225 · `251207` 40 · `260308` 155 · `260326` 104 · `260502` 171 · `260608` 134 · `260924` 201 | 1.030 |
| **Total** | | **3.467** |

La de La Ceiba del 25-mar (`260325`) da 0: con K-101 caído solo producían los 3 pozos que cerró, no había orden que escoger. Las programadas (`260819`, `260217`) no tienen evitable (solo cuenta la causa de reinyección). Antes del 9-oct, con La Ceiba cerrando todo el campo y los cortes bajos, el total era 9.633 bbl, todo de Morichal; con los operarios cerrando de más agua a menos, lo evitable para la misma agua es chico en todas.

**Casos borde.** Ningún tramo con bbl → 0. Tramos a frecuencia reducida entran con su factor. El evitable de una parada **abierta** es parcial (crece mientras siga abierta).

**Referencia.** `libro.ts:906-965`; CONTRATO.md:1066-1070.
