# 5A.9 · Producción día a día, cuadre diario y la pantalla de Producción

La pantalla Producción (`src/pages/Produccion.tsx`; rutas `#/prod/produccion/<campo>/<período>` —ingeniería— y `#/ger/produccion/…` —decisión—) entra por la curva: cuánto salió por el PMO cada día, contra lo que daban las pruebas y contra la meta firmada. El diferido es la consecuencia. El gerente ve la cabecera y la curva; la custodia, el factor, el cuadre diario y la asignación oficial son de ingeniería.

---

### Día del libro (`Dia`) · `GET /api/vistas/produccion/diaria?campos&desde&hasta`

**Qué es.** Por cada día del período: horas, real, potencial, diferido de los eventos, inventario y meta.

**Fórmula** (`porDia`, `src/entities/libro.ts:1002-1038`). Para cada día $d$ y campo $c$:

$$
\text{real}_d = \sum_{c\,:\,F_{c,d},\ \text{FA}_{c}} F_{c,d}\frac{h_d}{H_d}
\qquad
\text{potencial}_d = \sum_{c\,:\,F_{c,d},\ \text{FA}_{c}}\ \sum_{p} q_{p,d}\,\text{FA}_{c,m(d)}\frac{h_d}{24}
$$

$$
\text{diferido}_d = \sum_{e} q_{p,d}\,\text{FA}_{c,m(d)}\,h^{\text{ef}}_{e,d}\frac{f_{e,d}}{24}
\qquad
\text{residuo}_d = \text{potencial}_d - \text{real}_d - \text{diferido}_d
$$

$$
\text{meta}_d = \sum_c \text{produccionBpd}_{c,d}\cdot\frac{h_d}{24}\quad(\text{null si algún campo no tiene tramo ese día})
$$

| Campo de `Dia` | Regla |
|---|---|
| `dia` | inicio del día (ISO, 00:00 de Colombia) |
| `horas` | horas del día dentro del período (14 el día de hoy en el demo) |
| `real` | `null` si **ningún** campo tiene el fiscal de ese día (hueco, no cero) |
| `faltan` | campos sin fiscal (o sin factor) ese día: no entran ni en lo real ni en el potencial del día |
| `potencial` | solo de los campos con fiscal |
| `diferido` | de todos los eventos del día (aunque el campo no tenga fiscal) |
| `residuo` | `null` si `real` es `null` |
| `meta` | `null` si algún campo pedido no tiene meta firmada ese día |

**Ejemplo con los datos del demo (La Ceiba).**

| Día | Horas | Real | Potencial | Diferido | Inventario | Eficiencia | Meta |
|---|---:|---:|---:|---:|---:|---:|---:|
| 2-oct (hoy) | 14 | 5.836 | 6.626,799 | 791,961 | −1,162 | 88,1 % | 6.358,333 |
| 1-oct | 24 | 11.105 | 11.360,227 | 254,065 | 1,162 | 97,8 % | 10.900 |
| 30-sep | 24 | 11.602 | 11.488,607 | 0 | −113,393 | 101,0 % | 10.900 |
| 28-sep | 24 | 9.642 | 11.488,607 | 1.890,749 | −44,142 | 83,9 % | 10.900 |
| 27-sep | 24 | 9.691 | 11.500,234 | 1.917,741 | −108,506 | 84,3 % | 10.900 |
| 26-sep | 24 | 10.221 | 11.500,234 | 1.398,284 | −119,049 | 88,9 % | 10.900 |
| 23-sep | 24 | 11.310 | 11.535,116 | 281,177 | −56,061 | 98,0 % | 10.900 |
| 22-sep | 24 | 10.578 | 11.542,867 | 876,426 | 88,441 | 91,6 % | 10.900 |
| 1-sep | 24 | 11.706 | 11.579,686 | 0 | −126,314 | 101,1 % | 10.900 |

Del 26 al 28-sep, LC-04 y LC-11 caídos por sus electrosumergibles; el 22 y 23-sep, la parada de P-201B (2 pozos cerrados). Sumas de septiembre: real 338.662; potencial 346.378,059; diferido 7.716,059; inventario **0** (se compensa en el mes). Octubre: 16.941; 17.987,026; 1.046,026; 0. Portafolio, 27-sep: real 37.616, potencial 42.115,311, diferido 4.802,717, inventario −303,407, meta 40.200.

**Casos borde (escenarios corridos).** 15-sep de La Ceiba sin fiscal: `{ real: null, potencial: 0, diferido: 0, residuo: null, faltan: ['ceiba'] }`. Octubre sin ningún fiscal: los dos días con `real: null` y `faltan: ['ceiba']`; el diferido del día queda 0 porque el mes no tiene factor. Un campo sin meta firmada ese día: `meta: null`.

**Quién lo calcula.** Servidor. Caso `referencia/diaria/<campo>-2026-09.json` y `portafolio-2026-09.json`.

---

### Cuadre diario / mensual (tabla)

**Qué es.** La identidad del libro día por día: **real + diferido de los eventos + inventario = potencial**. Un día suelto no cuadra solo con los eventos (el tanque de venta guarda de un día para otro); el mes entero sí.

**Dónde se ve.** Producción, ingeniería: panel «CUADRE DIARIO» (períodos de hasta 62 días) o «CUADRE MENSUAL» (más de 62: trimestre, año, 12 meses, rangos largos).

**Columnas.** Día · Real · Potencial · Diferido · Inventario · Eficiencia · Meta.

**Qué texto se muestra según el valor (diario).**

| Celda | Regla |
|---|---|
| Día | `fechaCorta` («2 de oct»); si `horas < 23,99`, « · 14,0 h» (`n1`) |
| Real | «sin fiscal» si `null`; si no, `n0` con ■ P3 si `meta ≠ null` y `real < meta` |
| Potencial, Diferido | `n0` |
| Inventario | `n0(residuo)` o «—» |
| Eficiencia | `n1(real/potencial·100)` % o «—» (sin fiscal o potencial 0) |
| Meta | `n0(meta)` o «sin meta firmada» |

Orden: del más reciente al más viejo. Se ven los cinco más recientes (seis si son seis) **y todo día sin fiscal o bajo la meta** (nunca quedan detrás de «ver más»); en el papel salen todos.

Ejemplo, La Ceiba octubre: «2 de oct · 14,0 h | ■ 5.836 | 6.627 | 792 | -1 | 88,1 % | 6.358» y «1 de oct | 11.105 | 11.360 | 254 | 1 | 97,8 % | 10.900». Septiembre: a la vista 30, 29, 28, 27 y 26-sep (los tres últimos bajo la meta, con ■), más el 22-sep (bajo la meta); «ver más» abre los otros 24.

**Mensual.** Una fila por mes tocado por el período: nombre («Septiembre 2026»), « · 15 de sept a 30 de sept» si el mes está recortado o « · en curso» si es parcial; Real (■ si bajo la meta del mes), Potencial, Diferido, Inventario (`residuo`), Eficiencia (`pe`), Meta (`meta.produccion` o «sin meta firmada»). Los meses enteros salen de la serie mensual; los recortados se piden al libro (5A.5, aditividad).

«Cómo se lee»: «Real + diferido de los eventos + inventario = potencial. El inventario es lo que el tanque de venta guardó o entregó de un día para otro: por eso un día suelto no cuadra exacto y el mes entero sí.»

**Quién lo calcula.** Servidor (`Dia[]`, libros por mes); la eficiencia del día y las marcas, el front.

---

### Gráfica «DÍA A DÍA»

**Qué es.** La curva del período en bbl/d: real (sólida), potencial (discontinua), meta (punteada) y el diferido como el área entre potencial y real.

**Dónde se ve.** Producción, todos los niveles: panel «DÍA A DÍA · bbl/d».

**Fórmula.** Todo se dibuja como **tasa**: $\text{tasa}(d, v) = v\cdot 24/\text{horas}_d$.

**Ejemplo con los datos del demo.** 2-oct (14 h): real $5.836\times24/14 = 10.005$ bbl/d, potencial 11.360 bbl/d, meta 10.900 bbl/d. 28-sep: real 9.642 bbl/d contra potencial 11.489.

**Qué texto y qué dibujo según el valor.**

- Día sin fiscal: sin punto; la curva real y el área se cortan (hueco, no cero).
- Día con algún campo sin meta: sin punto de meta; la línea se corta.
- Día de hoy (horas < 23,99): punto hueco y tramo discontinuo desde el día anterior («es una tasa de un día a medias, no un desplome»). Globo: título «2 de oct · día en curso», pista «Parcial: 14,0 h. Se muestra como tasa diaria.»
- Globo de cada día: «Real» (`n0` bbl o «sin fiscal del punto de medición oficial»), «Potencial», «Meta» (o «sin meta firmada»), «Diferido de los eventos», «Inventario entre días» (o «—»), «Eficiencia» (`n1` % o «—»). Las cifras del globo van en **bbl del día**, no en tasa.
- Puntos chicos solo con 45 días o menos. Eje Y con números redondos (pasos 1, 2, 2,5, 5, 10 × potencia de diez; «11,5 k» desde mil). Etiquetas del eje X espaciadas según su largo; la del último día lleva « · en curso».
- Teclado: una parada de tabulador; flechas, Inicio y Fin recorren los días.
- Leyenda: «real medido», «potencial», «meta firmada», «diferido».

**Quién lo calcula.** Front, con `Dia[]`.

**Referencia.** `src/widgets/produccion/Diaria.tsx`.

---

### Cabecera de Producción

**Qué es.** Tres cifras y el sello: producción real del período contra su meta, potencial y real del último día completo.

**Dónde se ve.** `#/prod/produccion/…` y `#/ger/produccion/…`.

**Fórmulas y textos.** Con $\Sigma h$ = suma de `Dia.horas` del período y $\text{porDia}(v) = v\cdot24/\Sigma h$:

| Elemento | Valor | Texto |
|---|---|---|
| Barra «producción real» | `real` contra `meta.produccion` | rótulo de meta «meta a la fecha N» (mes en curso) o «meta N»; ■ si real < meta; sin meta: «sin meta firmada…» |
| Apoyo | — | «{porDia(real)} bbl/d · eficiencia {pe} %» |
| Globo «Real contra la meta» | — | «Real por día», «Meta por día» (= porDia(meta.produccion)), «Meta a la fecha», «Meta del mes completo» / «Meta del período» (= `produccionTotal`); sin meta: «Meta: sin meta firmada» |
| Cifra «potencial» | `potencial` | `n0` bbl, pie «{porDia(potencial)} bbl/d» con ⓘ |
| Cifra «real · {fecha}» | Σ de `EstadoCampo.ayer.bbl` | `n0` bbl; si algún campo no tiene el fiscal de ese día: «—» y pie «sin fiscal» con ⓘ «Último día completo: Falta el fiscal del último día en algún campo: la suma no está completa.» |

**Ejemplo con los datos del demo.**

| | La Ceiba · oct | La Ceiba · sep | Portafolio · oct | Portafolio · sep |
|---|---|---|---|---|
| producción real | 16.941 ■ · meta a la fecha 17.258 | 338.662 · meta 327.000 | 64.147 · meta a la fecha 63.650 | 1.234.322 · meta 1.206.000 |
| apoyo | 10.700 bbl/d · eficiencia 94,2 % | 11.289 bbl/d · eficiencia 97,8 % | 40.514 bbl/d · eficiencia 96,4 % | 41.144 bbl/d · eficiencia 97,3 % |
| meta por día | 10.900 | 10.900 | 40.200 | 40.200 |
| meta del mes completo / período | 337.900 | 327.000 | 1.246.200 | 1.206.000 |
| potencial | 17.987 · 11.360 bbl/d | 346.378 · 11.546 bbl/d | 66.524 · 42.015 bbl/d | 1.268.267 · 42.276 bbl/d |
| real · 1 de oct | 11.105 | 11.105 | 40.750 | 40.750 |

Con el demo del 9-oct solo La Ceiba en octubre va bajo la meta (■): las demás producciones la pasan.

«Real · último día» no depende del período: es el último día completo (`fiscalDeAyer`: 1-oct en el demo).

**Quién lo calcula.** Servidor: `Libro`, `Dia[]`, `GET /api/vistas/estado` → `ayer: { fecha, bbl | null }`. El por día, el front.

---

### Panel «MEDICIÓN OFICIAL» (Producción, ingeniería)

**Qué es.** De dónde sale lo real de cada campo del ámbito.

**Qué texto.** Por campo: nombre en negrita; chip «corte de agua: analizador | laboratorio | sin dato» (tono fuerte si laboratorio); chip «factor {n3} · banda ±{n0} %» con el **último** factor del período de ese campo (si hay); y la fuente en monoespaciado («FQI-0101 · computador de flujo de la unidad LACT-01» o «Sin punto de medición configurado»).

**Ejemplo.** La Ceiba, octubre: «corte de agua: analizador» · «factor 0,958 · banda ±15 %». Guacamayo: «corte de agua: laboratorio» (fuerte) · «factor 0,969 · banda ±5 %». El Palmar, fuente «LIT-1021 y LIT-1022 · medidores automáticos de los tanques de despacho».

**Quién lo calcula.** Servidor: `GET /api/catalogo` → `campos[c].medicion` (`origen`, `banda`); el factor, de `Libro.fa`.

**A la derecha** va el gráfico del factor mes a mes contra su banda (un campo; 5A.2) o el Cuadre (portafolio; 5A.3, 5A.1).
