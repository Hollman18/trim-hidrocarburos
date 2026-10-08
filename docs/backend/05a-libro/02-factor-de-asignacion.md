# 5A.2 · El factor de asignación del mes y su banda regulatoria

La **asignación de producción** reparte lo que midió el punto de medición oficial (un número por campo y día) entre los pozos que lo produjeron. Se hace con las pruebas de cada pozo y las horas que cada uno estuvo abierto. El **factor de asignación** (FA) es el cociente entre lo medido y lo que dicen las pruebas: si las pruebas y el PMO cuentan la misma historia, queda cerca de 1. Todo el libro (potencial, diferido de cada evento, valor) se calcula con él.

---

### Horas perdidas de un pozo en un día

**Qué es.** Cuántas horas «equivalentes» dejó de producir un pozo en un día, sumando sus eventos del controlador (paro o frecuencia reducida), sin cobrar dos veces la misma hora.

**Dónde se ve.** No se muestra; entra al teórico (abajo) y, por evento, a cada tramo del libro.

**Fórmula.**

$$
P_{p,d} = \sum_{e \,\in\, \text{eventos de } p} h^{\text{ef}}_{e,d} \cdot f_e
\qquad
f_e = \begin{cases} 1 & \text{paro (GF, PH, OL, UL, OT, UV, PSH, LSHH, CMD)} \\ \min\!\left(1, \max\!\left(0,\ 1 - \dfrac{hz_e}{hz_{\text{prueba}}}\right)\right) & \text{código HZ, con las dos frecuencias} \\ 1 & \text{código HZ sin } hz_e \text{ o sin } hz_{\text{prueba}} \end{cases}
$$

| Símbolo | Significado | Unidad | De dónde sale |
|---|---|---|---|
| $h^{\text{ef}}_{e,d}$ | horas **efectivas** del evento $e$ dentro del día $d$ | h | `inicio`/`fin` del evento (`fin: null` = abierto hasta ahora), menos lo que ya cubre otro evento del mismo pozo que manda |
| $hz_e$ | frecuencia a la que quedó el pozo | Hz | `eventos[].hz` (`GET …/pozos/eventos`) |
| $hz_{\text{prueba}}$ | frecuencia de la prueba vigente ese día | Hz | `pruebas[].hz` |

**Eventos que se pisan** (`intervalosEfectivos`, `src/entities/libro.ts:118-140`): por pozo, se ordenan primero los paros y después los HZ, y entre iguales el que empezó antes (y luego por id). Cada evento cobra solo lo que no cubrió uno anterior en ese orden. Un paro manda sobre un HZ; entre dos paros, gana el primero. Así una hora del pozo se cobra una vez y la identidad potencial − real = Σ diferidos sigue exacta. El contrato pide escoger entre esto o que la ingesta rechace los solapes (`CONTRATO.md:855-858`); el motor del demo hace lo primero.

**Ejemplo con los datos del demo.** LC-11, 10-sep: el evento `EP-LC11-260910-79` (código CMD, cerrado por la parada de P-201B) va del 10-sep 02:03 al 11-sep 09:14. En el día 10 cobra 21,95 h con $f = 1$; en el 11, 9,233 h. HZ: MN-07 de Morichal, evento `EP-MN07-260214-16` del 14-feb 23:25 al 15-feb 23:58 a 47 Hz con prueba a 59 Hz: $f = 1 - 47/59 = 0{,}2034$ (el motor guarda `factor: 0,203`).

**Casos borde.** `fin: null`: el evento llega hasta `AHORA`. Un evento de un pozo que no está en el registro se ignora. Un `hz` mayor que el de la prueba da $f = 0$ (no pierde nada).

**Quién lo calcula.** Servidor. No viaja como tal.

**Referencia.** `src/entities/libro.ts:87-96` (`perdidaPorFrecuencia`, `fraccion`), `:118-148`, `:171-183`.

---

### Teórico del mes (T) · real del mes (R)

**Qué es.** **T** es lo que habrían producido los pozos, según sus pruebas, en las horas que de verdad estuvieron produciendo, sumado sobre los días del mes **que tienen dato fiscal**. **R** es la suma del fiscal de esos mismos días.

**Dónde se ve.** R es «Fiscal del mes» en el globo de cada punto del gráfico «FACTOR DE ASIGNACIÓN» y «Real medido» del Cuadre en un mes entero. T no se muestra.

**Fórmula.**

$$
T_m = \sum_{d \,\in\, m,\ \text{con fiscal}} \ \sum_{p \,\in\, \text{pozos con prueba}} q_{p,d} \cdot \frac{\max\left(0,\ H_d - P_{p,d}\right)}{24}
\qquad\qquad
R_m = \sum_{d \,\in\, m,\ \text{con fiscal}} F_d
$$

| Símbolo | Significado | Unidad | De dónde sale |
|---|---|---|---|
| $q_{p,d}$ | crudo de la prueba vigente del pozo al inicio del día | bbl/d | `pruebaEn(p, d).crudoBpd` |
| $H_d$ | horas del día dentro del mes: 24, salvo el día de hoy (horas transcurridas) | h | calendario |
| $P_{p,d}$ | horas perdidas del pozo ese día | h | arriba |
| $F_d$ | fiscal del día | bbl | `produccion-diaria → dias[i]` |

**Ejemplo con los datos del demo.**

| Campo · mes | $R_m$ (bbl) | $T_m$ (bbl) | Días con fiscal |
|---|---:|---:|---:|
| La Ceiba · sep-2026 | 324.688 | 335.098,097 | 30 |
| La Ceiba · oct-2026 (en curso, 38 h) | 14.943 | 15.597,160 | 2 (el 2-oct con 14 h) |
| Morichal · sep-2026 | 466.040 | 485.095,221 | 30 |
| Guacamayo · sep-2026 | 180.748 | 179.444,971 | 30 |
| El Palmar · sep-2026 | 96.715 | 95.954,170 | 30 |
| La Zarza · sep-2026 | 94.856 | 91.915,750 | 30 |

**Casos borde.**

- **Día sin fiscal**: no entra ni a T ni a R (un cero bajaría el factor de todo el mes). El día va a `faltan` del mes.
- **Mes sin ningún día con fiscal**: no hay T útil ni factor (ver abajo).
- **Pozo sin prueba** (hueco de custodia): no suma a T, pero su crudo **sí** llega al PMO y está en R: el factor sube. Ejemplo: La Zarza tiene ZA-09 sin prueba y su factor de septiembre es 1,032.

**Quién lo calcula.** Servidor (`calcCampo`, `src/entities/libro.ts:171-205`), una vez por campo.

---

### Factor de asignación (FA) del mes

**Qué es.** El cociente entre lo que midió el PMO y lo que dicen las pruebas en los mismos días: el «ajuste» con que las pruebas se llevan a lo medido.

**Dónde se ve.**

- Diferidos (`#/prod/diferidos/ceiba/curso`, `#/jefe/…`, `#/conf/…`; solo nivel ingeniería, con un campo): panel **«FACTOR DE ASIGNACIÓN · contra su banda»**, un punto por mes (widget `Factor`).
- Producción (`#/prod/produccion/ceiba/curso`, ingeniería, un campo): el mismo panel; en «MEDICIÓN OFICIAL», el chip «factor 0,958 · banda ±15 %».
- Cuadre (Diferidos y Producción del portafolio): sub-bloque «FACTOR DE ASIGNACIÓN»: «1 mes-campo · dentro de banda» o una línea por mes fuera.
- El gerente (decisión) no lo ve.

**Fórmula.**

$$
\text{FA}_m = \frac{R_m}{T_m} \qquad (\text{solo si hay al menos un día con fiscal y } T_m > 0)
$$

**Ejemplo con los datos del demo.**

- La Ceiba, septiembre: $\text{FA} = 324.688 / 335.098{,}097 = 0{,}96893$ → pantalla **«0,969»** (`n3`).
- La Ceiba, octubre en curso: $14.943 / 15.597{,}160 = 0{,}95806$ → **«0,958»**. Es el factor con que se valoran los barriles de octubre y el que muestra el chip de Medición oficial.
- Serie de La Ceiba, oct-2025 a oct-2026: 1,007 · 0,969 · 1,030 · 0,985 · 1,020 · 1,028 · 0,990 · 1,027 · 0,974 · 1,029 · 0,941 · 0,969 · 0,958.
- Septiembre en los demás: Morichal 0,961 · Guacamayo 1,007 · El Palmar 1,008 · La Zarza 1,032.
- **El único fuera de banda del demo:** El Palmar, abril de 2026: $81.033 / 100.040{,}065 = 0{,}810$, con banda ±15 %.

**Casos borde.**

| Caso | Motor | Pantalla |
|---|---|---|
| Mes sin días con fiscal | No hay FA (`fa.get(mes)` = undefined). El libro no tiene fila de ese mes en `fa[]`; agrega `sinFactor: [{ campoId, mes }]` y el motivo `sin-factor`. Los tramos de ese mes valen **0 bbl** con `sinFactor: true` | El gráfico no pinta punto; el sello dice «sin factor de asignación» |
| $T_m = 0$ (ningún pozo con prueba produjo) | Sin FA, igual que arriba | Igual |
| `faDe(campo, t)` (lo que usan riesgo, predicción y caudales «de ahora») | Si el mes de `t` no tiene FA, usa el **último FA medido antes**; si el campo no tiene ninguno, `undefined` (no hay con qué asignar) | En el escenario «octubre sin fiscal» `faDe('ceiba')` devuelve 0,969 (septiembre) mientras el libro de octubre da 0 bbl. Es a propósito: el libro no valora sin factor; la predicción sí necesita un caudal |
| Mes en curso | FA de los días transcurridos, incluido el parcial | `publicado: false` → «Cierre: en curso» en el globo |

**Qué texto se muestra según el valor.**

- Cuadre: si ningún mes del período está fuera, «`N` mes-campo · [dentro de banda]» (`plural(n, 'mes-campo', 'meses-campo')`; La Ceiba sep: «1 mes-campo», portafolio sep: «5 meses-campo»). Si alguno está fuera, una línea por cada uno: cuadrado P3 ■ + «El Palmar · 2026-04 · **0,810**» + chip fuerte «fuera de ±15 %». ⓘ: «Banda de la Res. 40236, Fig. 10.2. Fuera de banda: revisar pruebas y medición antes de publicar.»
- Gráfico (widget `Factor`): círculo hueco si está dentro, cuadrado P3 (amarillo con trazo) si está fuera. Globo: título «Septiembre 2026 · factor 0,969»; pista «Dentro de la banda» o «Fuera de la banda: revisar pruebas, medición y pozos sin prueba»; filas «Factor 0,969», «Banda 0,85 – 1,15» (`n2`), «Fiscal del mes 324.688 bbl», «Cierre publicado | en curso». Los meses fuera del período que se mira van al 50 % de opacidad.
- Eje del gráfico: de $\min(0{,}75;\ 1-b-0{,}05)$ a $\max(1{,}25;\ 1+b+0{,}05)$ con marcas en el piso, $1-b$, 1, $1+b$ y el techo. Con $b = 0{,}15$: 0,75 · 0,85 · 1,00 · 1,15 · 1,25; con $b = 0{,}05$: 0,75 · 0,95 · 1,00 · 1,05 · 1,25. Un valor fuera del eje se dibuja pegado al borde.
- «Cómo se lee» del gráfico: «Factor = producción fiscal del mes ÷ lo que dicen las pruebas por las horas que cada pozo produjo… La franja gris es la banda que acepta la regulación para este crudo (*fuente de la banda*)».

**Quién lo calcula y por dónde viaja.** Servidor. `GET /api/vistas/diferidos` → `fa: FilaFA[]` con `{ campoId, mes, fa, banda, dentro, publicado }` (una fila por campo y mes del período que tiene factor); `GET /api/vistas/diferidos/mensual` → `libro.fa` de cada mes (el gráfico usa esta). Tipo `FilaFA` (`src/entities/libro.ts:447`).

**Referencia.** `src/entities/libro.ts:171-219`, `:697-703`; `src/widgets/diferidos/Factor.tsx`; `src/widgets/diferidos/Cuadre.tsx:49-61`. Casos `referencia/diferidos/<campo>-2026-09.json` (`fa`) y `referencia/mensual/<campo>.json`. `verificar-libro.mjs` sección 3.

---

### Banda de asignación (Res. MME 40236/2022, Anexo 2, Fig. 10.2)

**Qué es.** El rango en que la regulación colombiana acepta el factor de asignación de un campo. Fuera de él, las pruebas o la medición tienen un problema y el libro no se puede publicar. La mitad del ancho de la banda es además la **tolerancia** de cada barril asignado (5A.4).

**Dónde se ve.** Chip «banda ±15 %» (Medición oficial), franja gris del gráfico del factor, «fuera de ±15 %» del Cuadre, «fuera de banda · ±15 %» del cotejo con la asignación oficial, y en Configuración («Lo que no se configura», otro capítulo: `textoBanda`).

**Tabla (Fig. 10.2) tal como la codifica el motor** (`src/entities/metrologia.ts:22-34`):

| Fluido | Fila | Campo ≥ 1.000 bpd | Campo < 1.000 bpd |
|---|---|---|---|
| Crudo | > 22,3 °API | 0,95–1,05 (**±5 %**) | 0,85–1,15 (±15 %) |
| Crudo | ≤ 22,3 °API | 0,85–1,15 (**±15 %**) | 0,80–1,20 (±20 %) |
| Gas | — | 0,90–1,10 | 0,80–1,20 |
| Agua | — | 0,90–1,10 | 0,90–1,10 |

**Fórmula (cómo se escoge la fila).**

$$
b = \frac{\text{máx} - \text{mín}}{2} \quad\text{de la fila}\ (\text{fluido} = \text{crudo},\ \text{°API},\ \bar F)
\qquad
\bar F = \frac{1}{n}\sum_{d \,\in\, \text{último mes publicado, con dato}} F_d
$$

| Símbolo | Significado | Unidad | De dónde sale |
|---|---|---|---|
| °API | gravedad del último análisis del crudo | °API | `GET /api/campos/:campo/metrologia` → `api` (puede ser `null`) |
| $\bar F$ | fiscal promedio por día del **último mes publicado** del campo, solo días con dato | bbl/d | `fiscalPromedio` |
| `demostrada` | presupuesto de incertidumbre propio (API MPMS 13.3 / ISO 5168) | fracción | `metrologia.demostrada`: si existe, **reemplaza** a la banda |

Dentro de banda:

$$
\text{dentro} \iff \text{verificable} \ \wedge\ \left| \text{FA}_m - 1 \right| \le b + 10^{-9}
$$

**Ejemplo con los datos del demo.**

| Campo | °API | $\bar F$ (sep-2026) | Fila | $b$ |
|---|---:|---:|---|---:|
| La Ceiba | 19,4 | 10.822,9 | ≤ 22,3 · ≥ 1.000 | ±15 % |
| Morichal Norte | 13,1 | 15.534,7 | ≤ 22,3 · ≥ 1.000 | ±15 % |
| Guacamayo | 28,6 | 6.024,9 | > 22,3 · ≥ 1.000 | ±5 % |
| El Palmar | 21,0 | 3.223,8 | ≤ 22,3 · ≥ 1.000 | ±15 % |
| La Zarza | 34,0 | 3.161,9 | > 22,3 · ≥ 1.000 | ±5 % |

Fuente que viaja con la banda de La Ceiba: «Res. MME 40236/2022, Anexo 2, Tabla 10, Figura 10.2 · Límites de los factores de campo y de asignación · campo de 1.000 bpd o más, banda 0,85–1,15».

**Casos borde.**

| Caso | Motor (`calcularBanda`, `src/entities/libro.ts:265-274`) | Pantalla |
|---|---|---|
| `api: null` (o sin registro de metrología) | Se acota con la **fila más ancha** de crudo ($b = 0{,}20$: ≤ 22,3 y < 1.000), `verificable: false`; fuente: «Sin análisis de °API del crudo: no se puede escoger la fila de la Fig. 10.2 ni verificar el factor. La tolerancia se acota con la fila más ancha. …banda 0,80–1,20» | Motivo `banda-sin-verificar`; libro no publicable. Configuración dice «sin análisis de °API del crudo», nunca «0,0 °API» |
| Campo sin ningún mes publicado | Igual, con «Sin producción fiscal publicada: …» | Igual |
| `demostrada` | Se usa su valor y su fuente, `verificable: true` | — |
| Exactamente en el borde ($\lvert \text{FA}-1 \rvert = b$) | Dentro (por la holgura $10^{-9}$) | — |

Escenario corrido con el motor (El Palmar con `api: null`, septiembre): $b = 0{,}20$, `verificable: false`, `fa[0] = { fa: 1,008, banda: 0,2, dentro: false }`, motivo `banda-sin-verificar` con el texto «El Palmar: Sin análisis de °API del crudo; no se puede verificar el factor contra la banda de la Res. 40236.» (no se agrega además `fa-fuera-de-banda`). La tolerancia del mes sube de ±15 % a ±20 % (798,0 bbl sobre 3.990,2).

**Quién lo calcula.** Servidor (`bandaDe`, cacheado por campo). Viaja en `GET /api/catalogo` → `campos[campo].medicion.banda` (`{ valor, fuente, verificable }`, `src/shared/api/catalogo.ts:24-33`) y dentro de cada `FilaFA.banda` del libro.

**Referencia.** `src/entities/metrologia.ts:20-59`; `src/entities/libro.ts:228-274`; `CONTRATO.md:906-911`.

---

### Factor fuera de banda: qué pasa

**Qué es.** Un mes-campo con $|\text{FA}-1| > b$ (y banda verificable). Indica que las pruebas no representan lo que produjeron los pozos (pruebas viejas, separador mal calibrado, pozo sin prueba, fuga, medición del PMO). La regulación no acepta ese reparto.

**Consecuencias en el motor.**

1. `fa[i].dentro = false`.
2. Motivo `fa-fuera-de-banda` por cada (campo, mes) fuera: el libro **no se publica** (5A.7).
3. **No cambia ninguna cifra**: el diferido se sigue calculando con ese factor. La tolerancia sigue siendo $b$.

**Ejemplo con los datos del demo.** Abril de 2026 del portafolio (y cualquier período que lo incluya: año a la fecha, últimos 12 meses): motivo con el texto «El Palmar, abril de 2026: factor de asignación 0,810 fuera de la banda ±15 %.» El sello dice «NO PUBLICABLE» con la línea corta «El Palmar · factor fuera de banda»; en «POR CAMPO» de Diferidos (portafolio), El Palmar lleva el cuadrado P3 junto a su cifra y «Publicable: no» en el globo.

**Texto.** El del motivo: `${campo}, ${mes en letras} de ${año}: factor de asignación ${fa con 3 decimales es-CO} fuera de la banda ±${round(b·100)} %.`

**Referencia.** `src/entities/libro.ts:702`, `:778`.
