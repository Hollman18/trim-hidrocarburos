# 5A.4 · Tolerancia y rango de los barriles diferidos

Lo producido se **mide** (PMO); lo no producido se **calcula** (prueba × factor × horas). Por eso cada cifra de diferido viaja con su tolerancia y la pantalla nunca dice «medido» de un diferido. La tolerancia sale de la **Ecuación 22 de la Res. MME 40236/2022, Anexo 2, Tabla 10**: raíz de la suma de las incertidumbres al cuadrado (API MPMS 13.3 · ISO 5168), con una regla clave: lo que es **el mismo sesgo** para todos los pozos de un campo (la asignación) no se reduce al sumar pozos.

---

### Componentes de la tolerancia de un tramo

**Qué es.** Dos fuentes de incertidumbre por cada tramo:

1. **Sesgo de asignación** (`sesgo`): la banda $b$ del campo (5A.2). Es la incertidumbre mínima que la regulación acepta para el crudo asignado a un pozo sin un presupuesto propio. Es **correlada**: el mismo factor afecta a todos los pozos del campo, así que dentro del campo se suma en línea.
2. **Reloj del PLC** (`azar`): el inicio y el fin del evento tienen resolución de 1 s; dos marcas independientes en cuadratura dan $\sqrt{2}$ s sobre la duración. Independiente entre eventos: se suma en cuadratura.

**Fórmula.**

$$
\text{sesgo}_t = b_c
\qquad
\text{azar}_t = \begin{cases} \dfrac{\sqrt{2}\cdot \frac{1}{3600}}{\text{horas}_t} & \text{tramo no aproximado y horas} > 0 \\ 0 & \text{si no} \end{cases}
$$

| Símbolo | Significado | Unidad | De dónde sale |
|---|---|---|---|
| $b_c$ | mitad del ancho de la banda del campo (o la demostrada) | fracción | `bandaDe(campo).valor` |
| $1/3600$ | resolución del reloj del PLC (1 s) | h | `RESOLUCION_PLC_H`, `src/entities/libro.ts:41` |
| $\text{horas}_t$ | horas del tramo | h | tramo |

**Ejemplo.** Tramo de LC-16 del 22 al 23-sep (14,750 h, 540,108 bbl): sesgo 0,15 → 81,02 bbl; azar $= 1{,}41421/3600/14{,}75 = 2{,}66\times10^{-5}$ → 0,014 bbl. En todo septiembre de La Ceiba, la parte del reloj es $\sqrt{\sum(\text{bbl}\cdot\text{azar})^2} = 0{,}05$ bbl: despreciable frente al sesgo (1.157,4 bbl). Está para que un campo con banda demostrada muy chica la tenga en cuenta.

**Referencia.** `src/entities/libro.ts:298-300`, `:341-342`; `src/entities/metrologia.ts:36-45`, `:68-71`.

---

### Tolerancia del libro (bbl)

**Qué es.** El ± absoluto de los barriles diferidos del período.

**Dónde se ve.** Indirectamente en el **rango** (abajo); como porcentaje en el globo del encabezado («Σ de los eventos: 7.716 bbl ±15,0 % (Res. 40236)»; desde el 8-oct, en el nivel `decision` solo «7.716 bbl»: quien decide no ve tolerancias, su margen es el rango, `Encabezado.tsx:29-30`, `:54`) y en el ⓘ de «Identificado por señal» del Cuadre («Tolerancia ±15,0 % (Res. 40236).»); por equipo en el Pareto (globo «Tolerancia ±3.111 bbl» y pista «tolerancia ±15,0 %», solo ingeniería).

**Fórmula.**

$$
\text{tol} = \sqrt{\ \sum_{c \,\in\, \text{campos}} \left[ \left( \sum_{t \,\in\, c,\ \neg\text{aprox}} \text{bbl}_t \cdot \text{sesgo}_t \right)^2 + \sum_{t \,\in\, c,\ \neg\text{aprox}} \left( \text{bbl}_t \cdot \text{azar}_t \right)^2 \right]\ }
$$

Dentro de un campo, el sesgo se suma en línea (el mismo factor en todos sus pozos); entre campos, en cuadratura (cada campo tiene su propio factor y su propio PMO). Los tramos **aproximados** (frecuencia reducida) no entran (ver abajo).

**Ejemplo con los datos del demo.**

*La Ceiba, septiembre.* $\sum \text{bbl}\cdot 0{,}15 = 7.716{,}059 \times 0{,}15 = 1.157{,}409$; la parte del reloj suma 0,003 bbl² → **tol = 1.157,409 bbl**. Relativa: $1.157{,}409 / 7.716{,}059 = 15{,}0\,\%$ → «±15,0 %».

*Portafolio, septiembre:*

| Campo | Diferido (bbl) | $b$ | $\sum \text{bbl}\cdot b$ |
|---|---:|---:|---:|
| La Ceiba | 7.716,059 | 0,15 | 1.157,409 |
| Morichal Norte | 15.539,442 | 0,15 | 2.330,916 |
| Guacamayo | 6.396,387 | 0,05 | 319,819 |
| El Palmar | 3.990,220 | 0,15 | 598,533 |
| La Zarza | 302,631 | 0,05 | 15,132 |

$$
\text{tol} = \sqrt{1.157{,}409^2 + 2.330{,}916^2 + 319{,}819^2 + 598{,}533^2 + 15{,}132^2} = 2.689{,}52\ \text{bbl}
$$

Relativa $2.689{,}52 / 33.944{,}738 = 7{,}9\,\%$ → «±7,9 %». Sumado en línea habría dado 4.421,8 bbl (13,0 %): la cuadratura entre campos es la que hace que el portafolio tenga menos tolerancia relativa que cada campo.

*La Ceiba, octubre en curso:* 156,904 bbl (15,0 %). *Portafolio, octubre:* 245,137 bbl (10,3 %).

**Casos borde.**

| Caso | Resultado |
|---|---|
| Sin tramos | 0 |
| Todos los tramos aproximados | 0 (y todo el diferido va en «aproximado») |
| Banda sin verificar | se usa la fila más ancha ($b = 0{,}20$): la tolerancia **crece** y se dice en la fuente |
| Banda demostrada | su valor reemplaza $b$ |

**Quién lo calcula.** Servidor: `Libro.tolerancia` (`toleranciaDe`, `src/entities/libro.ts:353-364`); por equipo, `porEquipo[].tolerancia` con la misma función sobre los tramos de ese equipo (P-201B de La Ceiba en septiembre: 156,083 bbl sobre 1.040,550).

**Referencia.** `referencia/diferidos/ceiba-2026-09.json` → `tolerancia` ≈ 1157.409; `referencia/diferidos/portafolio-2026-09.json`.

---

### Rango de los barriles diferidos («calculado»)

**Qué es.** El intervalo en que está la cifra real de lo no producido. Lo ven **todos los roles**: es lo que protege el número cuando sale de la sala.

**Dónde se ve.** Debajo de la cifra grande del encabezado de Diferidos (todos los niveles) y del Resumen del gerente: «**6.559–8.873 bbl · calculado**». Globo: título «Rango de tolerancia» (ingeniería y operación) o «Margen del cálculo» (decisión); pista = nota de cálculo; filas «Rango: 6.559 a 8.873 bbl» y, si hay, «Aparte, aproximado: N bbl a frecuencia reducida».

**Fórmula.**

$$
\text{rango} = \left[\ \max\left(0,\ \text{brecha} - \text{tol}\right),\ \ \text{brecha} + \text{tol}\ \right]
$$

Ojo: la tolerancia se calcula sobre los tramos (Σ de los eventos) y el rango se centra en la **brecha** (potencial − real). En un mes entero son el mismo número.

**Ejemplo con los datos del demo.**

| Período | Brecha | tol | Pantalla (corto) |
|---|---:|---:|---|
| La Ceiba · sep | 7.716,059 | 1.157,409 | «6.559–8.873 bbl · calculado» |
| La Ceiba · oct | 1.046,026 | 156,904 | «889–1.203 bbl · calculado» |
| Portafolio · sep | 33.944,738 | 2.689,521 | «31.255–36.634 bbl · calculado» |
| Portafolio · oct | 2.376,755 | 245,137 | «2.132–2.622 bbl · calculado» |
| La Ceiba · trimestre jul–sep | 33.679,668 | 5.051,950 | «28.628–38.732 bbl · calculado» |
| Portafolio · últimos 12 meses | 483.307,402 | 41.078,577 | «442.229–524.386 bbl · calculado» |

**Qué texto se muestra según el valor.**

- `corto` (encabezado y resumen): `${n0(lo)}–${n0(hi)} bbl · calculado`.
- Sin `corto`: `entre ${n0(lo)} y ${n0(hi)} bbl · calculado, no medido` (hoy ninguna pantalla lo usa así).
- `plano`: el mismo texto sin globo.
- Nota de cálculo (ingeniería, en la pista del globo, en «¿Cómo se lee?» del encabezado y en el pie de cada informe): «Lo producido sale del punto de medición oficial. Lo no producido se calcula por asignación (prueba de cada pozo × factor de asignación × horas parado): es una estimación con su rango de tolerancia (Res. MME 40236, Ec. 22), no una medición directa. Las predicciones son escenarios, no compromisos.»
- Nota simple (decisión): «Lo producido se mide en el punto de medición oficial. Lo diferido se calcula a partir de las pruebas de los pozos y las horas que estuvieron parados: es una estimación con su margen, no una medición. La cifra real está dentro del rango. Las predicciones son escenarios, no compromisos.»
- El límite inferior nunca baja de 0.

**Quién lo calcula.** El servidor da `brecha`, `tolerancia` y `aproximado`; el rango lo arma el front (`src/widgets/diferidos/Rango.tsx:24-40`).

---

### Aproximado (frecuencia reducida), aparte

**Qué es.** Barriles de tramos de **frecuencia reducida** (código HZ). Se calculan con la **ley de afinidad** de bombas centrífugas: el caudal es proporcional a la frecuencia, $Q \propto n$, así que a $hz$ en vez de $hz_{\text{prueba}}$ se pierde $1 - hz/hz_{\text{prueba}}$ del caudal. Es una aproximación (la curva real de la bomba y el yacimiento no son lineales): no se le puede poner la tolerancia de la Res. 40236, y por eso **no entra en la tolerancia** y se informa aparte.

**Dónde se ve.** Globo del encabezado: fila «Frecuencia reducida (aprox.): N bbl» (solo si > 0); globo del rango: «Aparte, aproximado: N bbl a frecuencia reducida»; Cuadre: «N bbl aproximados · frecuencia reducida» con ⓘ «Pozos a frecuencia reducida: se calculan con la ley de afinidad (caudal proporcional a la frecuencia) y quedan fuera de la tolerancia.»

**Fórmula.**

$$
\text{aproximado} = \sum_{t\,:\,\text{evento.codigo} = \text{HZ}} \text{bbl}_t
$$

**Ejemplo con los datos del demo.** La Ceiba no tiene eventos HZ en septiembre ni octubre (aproximado 0: las filas no salen). El demo tiene 61 eventos HZ: en Morichal (10 el 14-feb, 11 el 6-jul y 11 el 25-jul de 2026) y en Guacamayo (17-oct-2025, 8-mar, 15-abr y 11-jul de 2026); todos traen su `hz`. Morichal, febrero de 2026: diferido 2.752,202 bbl (con los 595 de la parada programada de P-201B del 17-feb, que desde el 9-oct cierra 3 pozos), de los que **1.001,435 son aproximados**; tol $= (2.752{,}202 - 1.001{,}435)\times 0{,}15 = 262{,}615$. El globo del rango dice «Aparte, aproximado: 1.001 bbl a frecuencia reducida» y el rango «2.490–3.015 bbl · calculado». El «±» del encabezado sale $262{,}615 / 2.752{,}202 = 9{,}5\,\%$ porque divide por todo el diferido, incluido lo aproximado (ver «Huecos y dudas»).

**Casos borde.** Un HZ sin frecuencia (en el evento o en la prueba) cuenta como cerrado ($f = 1$) y también es aproximado.

**Quién lo calcula.** Servidor: `Libro.aproximado`; `Tramo.aproximado`.

**Referencia.** `src/entities/libro.ts:337`, `:356`, `:857`.
