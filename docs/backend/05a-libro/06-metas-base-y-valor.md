# 5A.6 · Metas, cierre proyectado, línea base, valor en USD y alto impacto

Lo único que entra a mano al libro es la **configuración firmada**: por campo, tramos de meta con su precio y su regla de cierre. Todo lo demás de esta sección se calcula contra eso o contra la historia.

---

### Tramo de meta firmado (`TramoMeta`) · `metaEn`

**Qué es.** Lo que fija el gerente para un campo desde un día hasta que empiece el tramo siguiente: producción por día, máximo de diferido por día, precio neto del barril y criterio de cierre (máximo sin identificar, % del potencial). Van en **bbl/d** porque los barriles se suman entre campos y los porcentajes no.

**Forma** (`src/entities/configuracion.ts:24-38`):

| Campo | Significado | Unidad |
|---|---|---|
| `desde` | día desde el que rige (AAAA-MM-DD, Colombia) | — |
| `produccionBpd` | meta de producción en el PMO | bbl/d |
| `diferidoMaxBpd` | máximo de diferido aceptado | bbl/d |
| `netbackUsd?` | precio neto; ausente = sin precio (en JSON viaja `null`, nunca 0) | USD/bbl |
| `criterioSinCausa` | máximo sin identificar para publicar | % del potencial |

**Regla.** `metaEn(config, campo, t)` = el tramo más nuevo con `desde ≤ día(t)`; `undefined` si el campo no está en la configuración o ningún tramo empezó: **«sin meta firmada»**. Nunca se cae a la semilla del demo.

**Ejemplo con los datos del demo.** Configuración de arranque (versión 1, 2026-09-01, «Arranque de la implementación»), un tramo por campo desde 2025-10-01:

| Campo | Producción bbl/d | Máx. diferido bbl/d | Precio USD/bbl | Criterio |
|---|---:|---:|---:|---:|
| La Ceiba | 10.900 | 800 | 48 | 2 % |
| Morichal Norte | 16.700 | 950 | 48 | 2 % |
| Guacamayo | 6.300 | 450 | 48 | 2 % |
| El Palmar | 3.250 | 50 | 48 | 2 % |
| La Zarza | 3.050 | 50 | **sin precio** | 2 % |
| **Portafolio** | **40.200** | **2.300** | | |

(Semillas: máximo = diferido de jul–sep menos 20 %, al menos 50 bbl/d; meta = potencial de esos meses menos ese máximo, redondeada a 50 hacia abajo: `src/entities/campos.ts:31-49`.)

**Quién lo calcula.** Regla de «los dos» (`metaEn`, `metaEntre`, `precioEn`, `criterioEn`): el front avisa, el servidor decide.

---

### Meta del período (`MetaPeriodo`): a la fecha y del período completo

**Qué es.** Lo que piden los tramos firmados en el período, día por día con el tramo que regía ese día. Hay dos versiones: **a la fecha** (solo lo transcurrido, para que el mes en curso no parezca ir mal todos los días) y **del período completo** (si es el mes en curso, hasta su último día).

**Dónde se ve.**

- Diferidos y Resumen de campo → barra «diferido por día» contra «máx. 800» (raya); globo «Máximo firmado», «Máximo del mes completo» (en curso) o «Máximo del período».
- Producción → barra «producción real» contra «meta a la fecha 17.258» (en curso) o «meta 327.000»; globo «Real por día», «Meta por día», «Meta a la fecha», «Meta del mes completo» / «Meta del período».
- Resumen del gerente → «PROMEDIO DIARIO» (producción y diferido contra su meta por día) y «CIERRE PROYECTADO» o «TOTAL DEL PERÍODO».
- Mes a mes → raya por mes (`meta.diferido`, bbl); Tendencia → raya por mes (`meta.diferidoDia`, bbl/d).
- Día a día → curva punteada «meta firmada»; cuadre diario → columna «Meta».

**Fórmula** (`metaEntre`, `src/entities/libro.ts:612-624`):

$$
\text{meta}(a,b) = \sum_{c}\ \sum_{d\,=\,\text{día}(a)}^{<\,b} \text{tramo}_{c,d}\cdot\frac{\left|[a,b) \cap [d, d+24\,\text{h})\right|}{24}
$$

$$
\text{produccion} = \text{meta}_{\text{prod}}(\text{desde}, h_0) \qquad \text{produccionTotal} = \text{meta}_{\text{prod}}(\text{desde}, \text{finTotal})
$$

$$
\text{produccionDia} = \frac{\text{produccion}}{\text{días}} \qquad \text{diferidoDia} = \frac{\text{diferido}}{\text{días}}
$$

(lo mismo con `diferidoMaxBpd` para `diferido` y `diferidoTotal`; $h_0 = \min(\text{hasta}, \text{ahora})$; `finTotal` en 5A.5).

**Ejemplo con los datos del demo.**

| Período | produccion | diferido | produccionTotal | diferidoTotal | por día |
|---|---:|---:|---:|---:|---|
| La Ceiba · oct (38 h) | $10.900\times38/24 = 17.258{,}333$ | $800\times38/24 = 1.266{,}667$ | $10.900\times31 = 337.900$ | 24.800 | 10.900 · 800 |
| La Ceiba · sep | 327.000 | 24.000 | 327.000 | 24.000 | 10.900 · 800 |
| Portafolio · oct | 63.650 | 3.641,667 | 1.246.200 | 71.300 | 40.200 · 2.300 |
| Portafolio · sep | 1.206.000 | 69.000 | 1.206.000 | 69.000 | 40.200 · 2.300 |

Con una meta que cambia a mitad de mes (escenario corrido: La Ceiba firma desde el 15-oct 11.500 / 600 bbl/d): a la fecha sigue 17.258,333 / 1.266,667, pero el mes completo pasa a $10.900\times14 + 11.500\times17 = 348.100$ y $800\times14 + 600\times17 = 21.400$.

**Qué texto se muestra según el valor.**

| Pantalla | Comparación | Marca |
|---|---|---|
| Producción, barra «producción real» | $\text{real} < \text{produccion}$ | ■ P3 junto a la cifra |
| Encabezado, «diferido por día» | $\text{brecha}/\max(1/24, \text{días}) > \text{diferidoDia}$ | ■ P3 |
| Resumen gerente, producción por día | $\text{real}/\text{días} < \text{produccionDia}$ | ■ P3 |
| Resumen gerente, diferido por día | $\text{brecha}/\text{días} > \text{diferidoDia}$ | ■ P3 |
| Mes a mes | $\text{brecha} > \text{meta.diferido}$ y mes no parcial | ■ sobre la columna, título «Pasó el máximo de diferido firmado» |
| Tendencia | $\text{diferido}/d > \text{diferidoDia}$ y mes no parcial | ■ |
| Cuadre diario | $\text{real}_d < \text{meta}_d$ | ■ en la celda «Real» |

La barra (`BarraMeta`) es gris; la raya va al 80 % del ancho; el relleno es $\min(1{,}25;\ v/\text{meta})/1{,}25$. Rótulos: «meta 40.200», «máx. 2.300» (`n0`). Para el lector: «por encima del máximo» / «por debajo de la meta».

Valores en pantalla (corridos): La Ceiba octubre → «diferido por día **1.922** bbl/d ■ · máx. 800»; producción «14.943 bbl ■ · meta a la fecha 17.258». La Ceiba septiembre → «723 bbl/d · máx. 800» (sin marca); producción «324.688 ■ · meta 327.000» (2.312 bbl bajo la meta). Portafolio octubre → «3.936 ■ · máx. 2.300»; septiembre → «3.508 ■ · máx. 2.300».

**Casos borde.** Ver «sin meta firmada». Un día parcial suma en proporción a sus horas. Un tramo que empieza a futuro no rige hacia atrás.

**Quién lo calcula y por dónde viaja.** Servidor: `Libro.meta` (`MetaPeriodo`) y `porCampo[].metaProduccion` / `metaDiferido` / `sinMeta`; `Dia.meta` en el día a día.

---

### Sin meta firmada

**Qué es.** Un campo sin tramo firmado en algún día del período. Sus días no suman meta (no se suma un 0), y entonces **la suma de los demás no es la meta del total**: ninguna pantalla compara contra ella.

**Fórmula.** `meta.sinMeta = campos con algún día sin tramo entre desde y finTotal`; `conMeta(m) ⟺ sinMeta.length = 0`; `Dia.meta = null` si algún campo no tiene tramo ese día.

**Ejemplo (escenario corrido: La Zarza sin tramos, portafolio de septiembre).** `meta.produccion = 1.114.500` (los otros cuatro), `meta.sinMeta = ['zarza']`, `porCampo[zarza] = { metaProduccion: 0, metaDiferido: 0, sinMeta: true }`, `Dia.meta = null` en cada día; motivo `sin-meta`: «La Zarza: el campo no tiene meta ni regla de cierre firmadas en el período; no se puede publicar.»

**Qué texto se muestra.** `SIN_META = 'sin meta firmada'`. Con varios campos, `textoSinMeta(m, true)` = «sin meta firmada en La Zarza» (nombres separados por coma). Va donde iría el rótulo de la meta; no hay raya ni marca. En tablas, la celda «Meta» dice «sin meta firmada». En el Resumen del gerente, chip «sin meta firmada» junto al campo y sus barras sin raya. Globos: «Máximo firmado: sin meta firmada…». Tendencia y Mes a mes: sin raya ni marca en ese mes. Nunca «cumplimiento 0 %».

**Quién lo calcula.** Servidor (`meta.sinMeta`, `porCampo[].sinMeta`, `Dia.meta`); `conMeta` y `textoSinMeta` los usa el front.

**Referencia.** `src/entities/libro.ts:571-604`; `src/entities/configuracion.ts:204-230`; `verificar-libro.mjs` sección 6f.

---

### Cierre proyectado del mes

**Qué es.** Si todo sigue como está ahora, cómo cierra el mes: lo que va más el ritmo de hoy hasta el último día. Solo con el período «mes en curso».

**Dónde se ve.** Resumen del gerente (`#/ger/resumen/ceiba/curso`), bloque «CIERRE PROYECTADO» con ⓘ «Si todo sigue como está ahora: lo que va del mes más el ritmo de hoy hasta el último día (31 días).»: barra «producción» contra «meta 337.900» y barra «diferido» contra «máx. 24.800». Con otro período el bloque se llama «TOTAL DEL PERÍODO» y compara real contra `meta.produccion` y brecha contra `meta.diferido`.

**Fórmula.**

$$
\text{restantes} = \max(0,\ \text{diasTotal} - \text{días})
$$

$$
\text{cierreProd} = \text{Real} + \text{restantes}\cdot\sum_c \left(\text{potencialBpd}_c - \text{perdiendoBpd}_c\right)
\qquad
\text{cierreDif} = \text{brecha} + \text{restantes}\cdot\sum_c \text{perdiendoBpd}_c
$$

| Símbolo | Significado | Unidad | De dónde sale |
|---|---|---|---|
| $\text{potencialBpd}_c$ | Σ de los pozos: prueba vigente × factor del mes (`crudoAsignado`) | bbl/d | `GET /api/vistas/estado` → `potencialBpd` |
| $\text{perdiendoBpd}_c$ | lo que se está perdiendo ahora por paradas abiertas (riesgo, otro capítulo) | bbl/d | `GET /api/vistas/estado` → `perdiendoBpd` |

Marcas: producción ■ si $\text{cierreProd} < \text{produccionTotal}$; diferido ■ si $\text{cierreDif} > \text{diferidoTotal}$.

**Ejemplo con los datos del demo.**

- La Ceiba: potencial ahora 11.359,706 bbl/d y perdiendo 11.359,706 (los 18 pozos cerrados por la parada abierta de P-201B) → ritmo 0. Restantes $31 - 1{,}583 = 29{,}417$ días. Cierre producción $= 14.943 + 0 = $ **14.943** ■ (meta 337.900); cierre diferido $= 3.043{,}201 + 11.359{,}706\times 29{,}417 = $ **337.208** ■ (máx. 24.800).
- Portafolio: ritmo 28.797,868 bbl/d (La Ceiba 0; Morichal 17.604,147 − 684,066; Guacamayo 6.615,655 − 1.173,339; El Palmar 3.276,945; La Zarza 3.158,526), perdiendo 13.217,110 → producción **907.429** ■ (meta 1.246.200), diferido **395.035** ■ (máx. 71.300).

**Casos borde.** Sin meta: barras sin raya, rótulo «sin meta firmada…». El ritmo es una foto: si la bomba arranca en una hora, la proyección cambia por completo; es un escenario, no un compromiso.

**Quién lo calcula.** Front, con `Libro` y `EstadoCampo[]` del servidor (`src/widgets/resumen/ResumenDirectivo.tsx:58-62`).

---

### Línea base: los 3 meses antes («+44 % frente a jul a sep»)

**Qué es.** El diferido por día de los tres meses publicados (en todos los campos pedidos) inmediatamente antes del período, contra el diferido por día del período. Es **contexto**, no meta: ¿va mejor o peor que antes?

**Dónde se ve.** Apoyo de la barra «diferido por día» del encabezado de Diferidos y Resumen de campo («+98 % frente a jul a sep»), y de la del Resumen del gerente; globo: «Antes (jul a sep): 969 bbl/d» o «Antes: no hay tres meses antes del período». Palancas con máximo: «antes 969 bbl/d · jul a sep». Mantenimiento: «antes 969 bbl/d (jul a sep)».

**Fórmula** (`lineaBase`, `src/entities/libro.ts:1083-1096`):

$$
\text{baseDia} = \frac{\text{brecha}(\text{3 meses})}{\text{días de los 3 meses}}
\qquad
\text{periodoDia} = \frac{\text{brecha}(\text{período})}{\text{días transcurridos del período}}
\qquad
\text{cambio} = \frac{\text{periodoDia} - \text{baseDia}}{\text{baseDia}}\ (0 \text{ si baseDia} \le 0)
$$

Los tres meses: los últimos tres con `publicadoEnTodos(campos, mes)` y `hasta ≤ desde` del período. `nombre` = «jul a sep» (tres letras del primero y del último).

**Ejemplo con los datos del demo.**

| Período | Base | baseDia | periodoDia | cambio | Pantalla |
|---|---|---:|---:|---:|---|
| La Ceiba · oct | jul a sep (89.134,521 / 92) | 968,853 | 1.922,021 | +0,984 | «+98 % frente a jul a sep» |
| La Ceiba · sep | jun a ago | 858,375 | 723,048 | −0,158 | «−16 % frente a jun a ago» |
| Portafolio · oct | jul a sep | 2.733,732 | 3.935,821 | +0,440 | «+44 % frente a jul a sep» |
| Portafolio · sep | jun a ago | 1.917,078 | 3.507,574 | +0,830 | «+83 % frente a jun a ago» |
| La Ceiba · trimestre | abr a jun | 476,284 | 968,853 | +1,034 | «+103 % frente a abr a jun» |
| La Ceiba · año a la fecha | oct a dic | 692,316 | 671,216 | −0,030 | «−3 % frente a oct a dic» |
| Últimos 12 meses | — | — | — | — | «sin base de comparación» |

**Casos borde.** Menos de tres meses publicados antes: `null` → «sin base de comparación», en el encabezado de Diferidos y, desde el 8-oct, también bajo la barra del diferido del Resumen del gerente (`ResumenDirectivo.tsx:123`; antes ahí no decía nada). Un mes no publicado en algún campo corta la base para todo el ámbito.

**Qué texto.** `signo(x)` = «+», «−» (U+2212) o nada, más `n0(|x·100|)` y « %»; luego «frente a» + nombre.

**Quién lo calcula.** Servidor: `GET /api/vistas/diferidos/base?campos&desde&hasta` → `{ desde, hasta, nombre, baseDia, periodoDia, cambio }` o `null`. Sin caso en `referencia/`.

---

### Valor en USD («falta precio»)

**Qué es.** Lo que vale lo no producido, con el precio neto que regía **cada día** (cambiar el precio hoy no reescribe el valor de un mes cerrado).

**Dónde se ve.** Encabezado de Diferidos: «valor» y la cifra «**1,0** M USD»; Resumen del gerente: «146 mil USD» y «valor». Fichas de equipo (otro capítulo, `valorDeTramos`).

**Fórmula.**

$$
\text{valorUsd} = \sum_{c}\ \sum_{d\,:\,\text{fiscal},\ \text{FA},\ \text{precio}_{c,d}} \left(\text{potencial}_{c,d} - \text{real}_{c,d}\right)\cdot \text{precio}_{c,d}
$$

| Símbolo | Significado | Unidad | De dónde sale |
|---|---|---|---|
| $\text{precio}_{c,d}$ | `netbackUsd` del tramo vigente ese día | USD/bbl | `precioEn` |

`valorUsd` existe si **algún** día tuvo precio; `valorCampos = { con: campos con precio en todos sus días con fiscal, total: campos }`; `sinPrecio = campos con algún día sin precio`.

**Ejemplo con los datos del demo.**

| Período | Valor (USD) | Pantalla | Rótulo |
|---|---:|---|---|
| La Ceiba · sep | $21.691{,}435 \times 48 = 1.041.188{,}894$ | «1,0 M USD» | «valor» |
| La Ceiba · oct | $3.043{,}201 \times 48 = 146.073{,}628$ | «146 mil USD» | «valor» |
| Portafolio · sep | $(105.227{,}224 - 302{,}631) \times 48 = 5.036.380{,}476$ | «5,0 M USD» | «valor · falta precio en La Zarza» |
| Portafolio · oct | 299.122,381 | «299 mil USD» | «valor · falta precio en La Zarza» |
| La Ceiba · 12 meses | 11.757.815,953 | «11,8 M USD» | |
| Escenario: La Ceiba sep, sin precio desde el 15-sep | 756.390,274 | «756 mil USD» | «valor · falta precio en La Ceiba» |

**Qué texto se muestra según el valor.**

- Formato `usd(v)`: $v \ge 10^6$ → `n1(v/10⁶)` + «M USD»; $v \ge 10^3$ → `n0(v/10³)` + «mil USD»; si no, `n0(v)` + «USD».
- Sin ningún día con precio: «sin precio» y ⓘ «Sin precio: Falta el precio neto en la configuración.»
- Con precio parcial (`con < total`): «valor · falta precio en *campos*» (si hay `sinPrecio`) o «valor · *con* de *total* campos»; ⓘ «Valor: 4 de 5 campos con precio en todo el período; sin contar los días sin precio de La Zarza.» En el Resumen del gerente: «valor · falta precio en La Zarza» con ⓘ «Sin contar los días sin precio de La Zarza.»
- Se dice «falta precio en» y no «sin»: el campo puede tener precio parte del período.

**Casos borde.** El valor usa la brecha diaria (potencial − real), no los tramos: un día con inventario negativo resta valor; un día sin fiscal no se valora aunque tenga eventos.

**Quién lo calcula.** Servidor: `valorUsd?`, `valorCampos`, `sinPrecio`. El formato, el front.

**Referencia.** `src/entities/libro.ts:687-716`, `:851-853`; `src/widgets/diferidos/Encabezado.tsx:31-33`, `:66-78`.

---

### Alto impacto, % del diferido (Resumen del gerente)

**Qué es.** Cuánto del diferido se llevan las bombas de reinyección y las electrosumergibles.

**Dónde se ve.** `#/ger/resumen/…`: cifra «**84 %**» con «del diferido · reinyección y electrosumergibles».

**Fórmula.**

$$
\text{altoPct} = 100\cdot\frac{\text{altoImpacto}}{\text{diferido}} \quad (0 \text{ si diferido} = 0)
$$

**Ejemplo.** La Ceiba oct: $2.570{,}257/3.043{,}201 = 84{,}5\,\%$ → «84 %»; sep: 99 %. Portafolio oct: 88,6 % → «89 %»; sep: 93 %.

**Quién lo calcula.** Front, con `altoImpacto` y `diferido` del libro.

---

### Antes → con TRIM

**Qué es.** El diferido de alto impacto por día desde la puesta en marcha (firma de arranque, `PUESTA_EN_MARCHA = 2026-09-01`) contra los tres meses anteriores. No depende del período escogido. Es una comparación, no la prueba de que lo bajó TRIM.

**Dónde se ve.** Resumen del gerente: «diferido alto impacto · antes → con TRIM» y «**736 → 762 bbl/d · +3 %**»; ⓘ «Alto impacto por día desde que entró TRIM (1 de sept) contra los tres meses antes. Es una comparación, no la prueba de que lo bajó TRIM.»

**Fórmula.**

$$
\text{antes} = \frac{\text{altoImpacto}(\text{2026-06-01},\ \text{2026-09-01})}{\max(1/24,\ \text{días})}
\qquad
\text{con TRIM} = \frac{\text{altoImpacto}(\text{2026-09-01},\ \text{ahora})}{\max(1/24,\ \text{días})}
$$

**Ejemplo.** La Ceiba: $67.733{,}617/92 = 736{,}2$ → $24.064{,}028/31{,}583 = 761{,}9$: «736 → 762 bbl/d · +3 %». Portafolio: $133.532{,}612/92 = 1.451{,}4$ → $103.019{,}005/31{,}583 = 3.261{,}8$: «1.451 → 3.262 bbl/d · +125 %».

**Casos borde.** Antes = 0 → el cambio se muestra «—».

**Quién lo calcula.** Front con dos `GET /api/vistas/diferidos` (los dos intervalos fijos). `PUESTA_EN_MARCHA` viene de la versión 1 de la configuración.

**Referencia.** `src/widgets/resumen/ResumenDirectivo.tsx:63-69`, `:180-188`.

---

### Tendencia del gerente (diferido por día de cada mes)

**Qué es.** Una barra por mes con el diferido por día (claro) y lo de alto impacto por día (oscuro), y la raya del máximo firmado de ese mes.

**Dónde se ve.** Resumen del gerente y Diferidos nivel decisión («MES A MES»). Clic en un mes → rango de ese mes.

**Fórmula.** Para cada mes $m$ de la serie, con $d_m = \max(1/24,\ (\min(\text{hasta}_m, \text{ahora}) - \text{desde}_m)/24\,\text{h})$:

$$
\text{total}_m = \frac{\text{diferido}_m}{d_m} \qquad \text{alto}_m = \frac{\text{altoImpacto}_m}{d_m} \qquad \text{máx}_m = \text{meta.diferidoDia}_m
$$

Marca ■ si $\text{total}_m > \text{máx}_m$ y el mes no es parcial. El mes del período va con borde y su cifra (`n0`).

**Ejemplo (La Ceiba).** oct-25 1.067 (alto 944) ■ · nov 249 · dic 747 · ene 173 · feb 834 ■ · mar 648 · abr 612 · may 434 · jun 384 · jul 1.955 (1.868) ■ · ago 221 · sep 723 (716) · oct-26 1.922 (1.623), sin marca por ser parcial; máximo 800 en todos. Portafolio: jul 3.039 ■ y sep 3.508 ■ (máx. 2.300); oct 3.936 sin marca.

**Globo.** «Diferido: 723 bbl/d», «De alto impacto: 716 bbl/d», «Máximo firmado: 800 bbl/d» (o «sin meta firmada…»); pista «Clic para ver este mes».

**Quién lo calcula.** Front con la serie mensual. Nota: usa `diferido` (Σ eventos), mientras Mes a mes usa `brecha`; en un mes entero son iguales.
