# 5A.5 · Períodos, calendario y portafolio

Todo endpoint del libro recibe `desde` y `hasta` (ISO con zona) y `campos` (uno o varios). El servidor calcula **cualquier** intervalo; el front escoge el intervalo según el período de la cabecera. Esta sección dice cómo se arman los períodos, cómo se cuentan horas y días, qué es un mes cerrado, publicado o parcial, y cómo se suman campos.

---

### Calendario de meses (`Mes`)

**Qué es.** La lista de meses que tienen producción fiscal en algún campo, del más viejo al más nuevo, con sus límites exactos y si están publicados en **todos** los campos.

**Dónde se ve.** Eje de «MES A MES», de la Tendencia del gerente y del gráfico del factor; selector de mes de la asignación oficial (solo cerrados); límites del rango a la medida.

**Fórmula.**

$$
\text{desde}_m = \text{día 1 del mes a las 00:00 (UTC−5)} \qquad \text{hasta}_m = \min(\text{día 1 del mes siguiente},\ \text{ahora})
$$

$$
\text{publicado}_m = \bigwedge_{c\,\in\,\text{campos con fiscal}} \text{publicado}_{c,m}
\qquad
\text{mesCerrado}(m) \iff \text{día 1 del mes siguiente} \le \text{ahora}
$$

**Ejemplo con los datos del demo.** 13 meses: 2025-10 a 2026-10. Los 12 primeros, `publicado: true` y cerrados. Octubre de 2026: `desde = 2026-10-01T05:00Z`, `hasta = 2026-10-02T19:00Z` (= ahora), `publicado: false`, no cerrado. Primer día con datos: 2025-10-01 (`PRIMER_DIA_METAS` y `pedirInicioDeHistoria`).

**Tres marcas que no son lo mismo.**

| Marca | Pregunta | Dónde pesa |
|---|---|---|
| `mesCerrado` | ¿ya empezó el mes siguiente? | Asignación oficial: solo se cargan y cotejan meses cerrados; `asignacionPorPozo` devuelve `[]` en un mes abierto |
| `publicado` (por campo y mes) | ¿el campo publicó su cierre? | Motivo `en-curso`; `FilaFA.publicado`; «Cierre: publicado / en curso» |
| `parcial` (serie mensual) | ¿algún campo pedido no lo ha publicado? (`!publicadoEnTodos(campos, mes)`) | Columna con borde punteado y «en curso» en Mes a mes; globo «Mes en curso: cifras parciales, cierre sin publicar.» |

Un mes cerrado puede no estar publicado (el campo aún no cierra su balance): el libro de ese mes sale «provisional».

**Quién lo calcula.** Servidor: viene en `GET /api/catalogo` → `calendario` (`src/shared/api/calendario.ts`). `mesCerrado` es una regla de «los dos» (`src/entities/libro.ts:80`).

**Referencia.** `src/entities/libro.ts:59-80`.

---

### Períodos de la cabecera

**Qué es.** Los intervalos que ofrece la cabecera, todos derivados del «ahora» (`calendarioDe(AHORA)`, `src/entities/reloj.ts:48-69`), más el rango a la medida. En producción el «ahora» lo da el servidor y los períodos se mueven solos.

**Dónde se ve.** Selector de período de la cabecera (todas las pantallas); último segmento de la dirección `#/rol/pantalla/campo/período`.

| Id (dirección) | Nombre (cabecera) | Detalle | `desde` → `hasta` (demo) | Nombre del intervalo (`rango.nombre`) |
|---|---|---|---|---|
| `curso` | Mes en curso | «2 de 31 días de octubre» | 2026-10-01 00:00 → 2026-10-02 14:00 | «Octubre, en curso» |
| `cerrado` | Septiembre · cerrado | «mes completo, publicado» | 2026-09-01 → 2026-10-01 | «Septiembre, cerrado» |
| `trimestre` | Trimestre jul–sep | «3 meses cerrados» | 2026-07-01 → 2026-10-01 | «Julio a septiembre» |
| `ytd` | Año a la fecha | «ene a oct · 9 cerrados + 2 días» | 2026-01-01 → ahora | «Año a la fecha» |
| `doce` | Últimos 12 meses | «oct-2025 a sep-2026» | 2025-10-01 → 2026-10-01 | «Últimos 12 meses» |
| `AAAA-MM-DD_AAAA-MM-DD` | Rango escogido | «18 días · 15 de sept a 2 de oct» | día `desde` 00:00 → día `hasta` + 1 a las 00:00, nunca más allá de ahora | «Rango escogido» |

Reglas del rango a la medida (`rangoValido`, `src/app/url.ts:38-48`; `rangoDePeriodo`, `src/entities/diferido.ts:695-713`): fechas reales (se leen a mediodía de Colombia); al revés se enderezan; se recortan a [primer día con datos, hoy] (en el demo, 2025-10-01 a 2026-10-02); si no queda nada, error «Escoja dos fechas entre el 2025-10-01 y el 2026-10-02: fuera de esos días no hay datos.». `hasta` es el último día **incluido**. Ejemplo: `#/ger/diferidos/ceiba/2026-09-15_2026-10-10` se vuelve 15-sep → 2-oct (ahora).

Un mes de la serie se abre con un clic (Mes a mes y Tendencia): `setRango(día 1, último día)` → rango a la medida de ese mes.

**Cifras del libro por período (corridas con el motor).**

| Período | La Ceiba: brecha · rango | Portafolio: brecha · rango |
|---|---|---|
| Octubre, en curso | 3.043 · 2.587–3.500 | 6.232 · 5.729–6.734 |
| Septiembre, cerrado | 21.691 · 18.438–24.945 | 105.227 · 96.444–114.010 |
| Julio a septiembre | 89.135 · 75.764–102.505 | 251.503 · 230.472–272.535 |
| Año a la fecha | 184.305 · 156.659–211.950 | 484.233 · 442.667–525.798 |
| Últimos 12 meses | 244.954 · 208.211–281.698 | 639.507 · 584.856–694.159 |
| Rango 15-sep a 2-oct | 8.977 (Σ eventos 9.473; inventario −496) | 69.814 (Σ eventos 70.461; inventario −647) |

Publicación por período: La Ceiba es publicable en septiembre, el trimestre y los 12 meses; provisional en octubre, el año a la fecha y el rango que llega a hoy. El portafolio está **bloqueado** en el año a la fecha y en los 12 meses (abril de El Palmar fuera de banda), y además provisional en el año a la fecha.

**Casos borde.** Un período que empieza antes del primer dato o termina después de ahora se recorta a ahora (`h0 = min(hasta, ahora)`). Un rango de un día muestra una sola fecha en la cabecera.

**Quién lo calcula.** Front (presentación de los períodos, `reloj` y `campos.PERIODOS`); el intervalo viaja a cada endpoint como `desde`/`hasta`.

---

### Horas y días del período

**Qué es.** El tiempo transcurrido del período, que convierte barriles en barriles por día y prorratea metas.

**Fórmula.**

$$
\text{días} = \max\!\left(10^{-9},\ \frac{\min(\text{hasta}, \text{ahora}) - \text{desde}}{24\ \text{h}}\right)
\qquad
\text{diasTotal} = \max\!\left(\text{días},\ \frac{\text{finTotal} - \text{desde}}{24\ \text{h}}\right)
$$

$$
\text{finTotal} = \begin{cases} \text{día 1 del mes siguiente} & \text{si desde = inicio del mes en curso y hasta} \ge \text{ahora} \\ \max(\min(\text{hasta},\text{ahora}),\ \text{desde}) & \text{si no} \end{cases}
$$

Las horas de cada día (`Dia.horas`) son las del día dentro del período: 24, salvo el día de hoy (horas transcurridas) o un día recortado.

**Ejemplo.** Octubre en curso: días = 38 h / 24 = **1,583**; diasTotal = **31**. Septiembre: 30 y 30. Año a la fecha: 274,583 y 274,583. Producción suma las horas del día a día: 720 (septiembre), 38 (octubre).

**Cuándo un período «está en curso» para la pantalla.** `enCurso = diasTotal > días + 0,01`. **Solo el mes en curso** lo cumple: el año a la fecha y un rango hasta hoy tienen `diasTotal = días` (su `finTotal` es ahora). Por eso «Máximo del mes completo», «meta a la fecha» y «CIERRE PROYECTADO» solo aparecen con el período `curso`; con el año a la fecha la pantalla dice «Máximo del período» y «TOTAL DEL PERÍODO» aunque el período siga abierto (ver «Huecos y dudas»).

**Por día.** En todas las pantallas el «por día» divide por `max(1/24, meta.dias)` (nunca por menos de una hora).

**Quién lo calcula.** Servidor: `Libro.meta.dias`, `meta.diasTotal`, `Dia.horas`.

**Referencia.** `src/entities/libro.ts:679-681`, `:850`, `:873-874`.

---

### Serie mensual (`GET /api/vistas/diferidos/mensual?campos`)

**Qué es.** El libro de cada mes del calendario, sin los detalles pesados: `[{ mes, corto, nombre, desde, hasta, parcial, libro }]` con `libro` **sin** `tramos`, `porPozo`, `preguntas` ni `custodia` (`ResumenLibro`). No depende del período: siempre los 13 meses.

**Dónde se ve.** «MES A MES» (Diferidos ingeniería; `ResumenCampo`), Tendencia (Diferidos decisión y Resumen del gerente), gráfico del factor, cuadre mensual de Producción.

**Ejemplo con los datos del demo (La Ceiba).** `corto` y `nombre`: «sep», «Septiembre 2026».

| Mes | Brecha | Máx. firmado | Pasó | Eficiencia | Publicable |
|---|---:|---:|---|---:|---|
| oct-25 | 33.067,5 | 24.800 | sí | 91,4 % | sí |
| nov-25 | 7.477,9 | 24.000 | | 97,9 % | sí |
| dic-25 | 23.147,7 | 24.800 | | 94,1 % | sí |
| ene-26 | 5.353,9 | 24.800 | | 98,6 % | sí |
| feb-26 | 23.348,8 | 22.400 | sí | 93,3 % | sí |
| mar-26 | 20.082,3 | 24.800 | | 94,8 % | sí |
| abr-26 | 18.364,0 | 24.000 | | 94,9 % | sí |
| may-26 | 13.450,4 | 24.800 | | 96,5 % | sí |
| jun-26 | 11.527,4 | 24.000 | | 96,7 % | sí |
| jul-26 | 60.593,8 | 24.800 | sí | 84,2 % | sí |
| ago-26 | 6.849,3 | 24.800 | | 98,0 % | sí |
| sep-26 | 21.691,4 | 24.000 | | 93,7 % | sí |
| oct-26 (en curso) | 3.043,2 | 1.266,7 | (no se marca) | 83,1 % | no (`en-curso`) |

Portafolio: abril de 2026 sale «no publicable» (`fa-fuera-de-banda` de El Palmar); octubre, `en-curso`.

**Quién lo calcula.** Servidor (`serieMensual`, `src/entities/libro.ts:1059-1068`; `pedirSerie`, `src/shared/api/diferidos.ts:104-105`). Caso `referencia/mensual/<campo>.json` y `portafolio.json`.

---

### Aditividad del libro en intervalos disjuntos

**Qué es.** El libro de un intervalo es la suma de los libros de sus pedazos: real, potencial, diferido y residuo se suman. Producción lo usa: para el cuadre mensual de un rango que empieza o termina a mitad de mes, pide al libro **cada mes recortado** al rango (`useLibros`) y la tabla tiene que dar lo mismo que la cabecera.

**Ejemplo con los datos del demo.** Rango 15-sep → 2-oct (ahora), La Ceiba:

| Pedazo | Real | Potencial | Diferido | Residuo |
|---|---:|---:|---:|---:|
| 15-sep → 1-oct (16 días) | 178.482 | 184.415,305 | 6.429,624 | −496,320 |
| 1-oct → ahora | 14.943 | 17.986,201 | 3.043,201 | 0 |
| **Rango completo** | **193.425** | **202.401,505** | **9.472,825** | **−496,320** |

Las tablas de más de 62 días son mensuales («CUADRE MENSUAL»); las demás, diarias («CUADRE DIARIO»): este rango de 18 días sale en «CUADRE DIARIO», día por día. En un cuadre mensual, la fila del mes recortado lleva los límites con `fechaCorta`: con `#/prod/produccion/ceiba/2026-07-15_2026-10-02` (80 días) la pantalla dice «Julio 2026 · 15 de jul a 31 de jul».

**Quién lo comprueba.** `verificar-libro.mjs` sección 12; `CONTRATO.md` («Aditividad», tras la tabla de vistas).

---

### Portafolio: varios campos en un libro

**Qué es.** El libro de varios campos (`campos=ceiba,morichal,…`). Es la suma de los libros de cada campo **salvo la tolerancia**, que se suma en cuadratura (5A.4), y el estado de publicación, que junta los motivos de todos.

**Dónde se ve.** Toda pantalla con el ámbito «portafolio» (dirección `ceiba~portafolio`): encabezado, «POR CAMPO» (Diferidos ingeniería) y «POR CAMPO» del Resumen del gerente, Cuadre del portafolio (en vez del gráfico del factor), Paretos con el nombre del campo en cada fila («P-201B · La Ceiba»).

**Reglas de suma.**

| Cifra | Cómo se junta |
|---|---|
| real, potencial, brecha, diferido, residuo, identificado, declarado, pendiente, planeado, alto impacto, palancas | suma |
| `pe` | $\sum\text{real} / \sum\text{potencial}$ (no el promedio de eficiencias) |
| `tolerancia` | cuadratura entre campos |
| `fa[]` | una fila por campo y mes |
| `porCampo[]` | una fila por campo, ordenada por brecha descendente |
| `porEquipo[]` | una fila por (campo, equipo, tipo): «P-201B» de La Ceiba no es la de Morichal |
| `meta` | suma de las metas de los campos; si a uno le falta, `sinMeta` lo nombra y la meta del total no es comparable |
| `valorUsd` | suma de los días con precio de cada campo; `valorCampos = { con, total }` |
| `motivos` | todos, cada uno con su `campoId` |

**Ejemplo: «POR CAMPO» del portafolio en septiembre** (Diferidos, ingeniería):

| Campo | Brecha | Máx. del período | Marca | Barra (por señal / declarado / sin identificar) |
|---|---:|---:|---|---|
| Morichal Norte | 53.562 | 28.500 | ■ junto a «máx.» | 53.455 / 106 / 0 |
| Guacamayo | 25.681 | 13.500 | ■ | 25.681 / 0 / 0 |
| La Ceiba | 21.691 | 24.000 | — | 21.691 / 0 / 0 |
| El Palmar | 3.990 | 1.500 | ■ | 3.990 / 0 / 0 |
| La Zarza | 303 | 1.500 | — | 0 / 303 / 0 |

Cada fila: «Morichal Norte · ■ máx. 28.500 bbl» a la izquierda y la brecha a la derecha (con ■ si el campo no puede publicar: sin meta, algún factor con `dentro: false` o pendiente sobre el criterio). Globo: título = nombre del campo, pista = nota del campo («Todos sus pozos con electrosumergible; la reinyección tiene respaldo parcial.»), filas «Diferidos», «Del total» (`n1` %), «Por señal», «Declarado», «Sin identificar», «Alto impacto», «Máximo firmado» y «Publicable: sí/no». Un clic abre el campo. Las barras miden contra la brecha del portafolio.

**Quién lo calcula.** Servidor: un solo `GET /api/vistas/diferidos?campos=a,b,…`; el front no suma libros de campos.

**Referencia.** `src/entities/libro.ts:693-738`; `src/pages/Diferidos.tsx:72-106`; caso `referencia/diferidos/portafolio-2026-09.json`.

---

### Potencial reciente (`GET /api/vistas/potencial-reciente?campos`)

**Qué es.** El potencial promedio de los últimos 30 días de cada campo, en bbl/d: la referencia con que el gerente fija la meta en Configuración. **No es meta** y no se guarda.

**Fórmula.**

$$
\text{potencialReciente}_c = \frac{\text{Potencial}_c(\text{ahora} - 30\ \text{d},\ \text{ahora})}{30}
$$

**Ejemplo.** La Ceiba 11.534,4 bbl/d; Morichal 17.329,8; Guacamayo 6.866,6; El Palmar 3.352,6; La Zarza 3.170,4.

**Casos borde.** Divide siempre por 30 aunque falten días fiscales (esos días no suman potencial): con huecos, el promedio baja (ver «Huecos y dudas»).

**Quién lo calcula.** Servidor (`pedirPotencialReciente`, `src/shared/api/diferidos.ts:112-116`). Sin caso en `referencia/`.
