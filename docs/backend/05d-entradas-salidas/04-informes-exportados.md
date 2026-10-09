# 5D.4 · Informes exportados: folio, cifras protegidas, huella SHA-256, membrete y CSV

Lo que sale de TRIM como respaldo documental (a un correo, a una orden de trabajo, a un expediente o a una discusión con un contratista sobre quién se llevó los barriles) lleva membrete, fecha, quién lo generó, hasta qué hora llegan los datos, la versión de la configuración y un **folio registrado con la huella SHA-256 de sus cifras**. Con el folio y la huella impresos, un tercero comprueba después que el documento no se modificó, sin ver el registro.

**Principio de seguridad:** la huella la calcula **el servidor**, con **su** libro y **su** versión vigente de la configuración. El front manda solo la **consulta** (qué campos, qué período, qué equipo). Si el navegador mandara las cifras o la huella, el folio certificaría cualquier número que alguien decidiera hashear.

Código: `src/entities/informe.ts` (208 líneas), `src/shared/api/escrituras.ts:226-257` (`emitirInforme`), `src/shared/api/informes.ts`, `src/widgets/informe/Exportar.tsx`, `Membrete.tsx`, `periodo.ts`, `src/shared/lib/csv.ts`, `src/widgets/diferidos/publicacion.ts`.

---

### Registrar un informe (`POST /api/informes`)

**Qué es.** La escritura que crea el folio. Se llama **antes** de entregar el PDF o el CSV: lo que no pasó por aquí no tiene folio.

**Dónde se ve.** Botón «Exportar» de la cabecera (todas las pantallas, solo para quien tiene `evidencia:exportar`: ger, prod, sup, jefe, conf, adm; no oper ni tec) con dos opciones: «Informe en PDF — Con membrete y folio; al imprimir, «Guardar como PDF»» y «Datos en CSV — Eventos del período, con causa y barriles». Al pie del menú: «Queda registrada con folio y huella» (ⓘ «Folio y huella: Cada exportación queda registrada con su folio y la huella de sus cifras: así se puede comprobar que no se modificó.») y «Último: **{folio}** · {primeros 14 caracteres de la huella legible}…». La ficha de un equipo tiene su propio botón de exportar (PDF de la ficha, `ExportarFicha`).

**Fórmula (cuerpo y secuencia).**

```json
{ "formato":"pdf", "titulo":"Diferidos", "alcance":"La Ceiba", "periodo":"Septiembre, cerrado · 1 de sept de 2026 a 30 de sept de 2026",
  "campos":["ceiba"], "desde":"2026-09-01T05:00:00.000Z", "hasta":"2026-10-01T05:00:00.000Z",
  "equipo": { "equipo":"P-201B", "campoId":"ceiba" } }
```

`titulo` = título de la pantalla (o «Ficha del equipo {eq} · {Campo}»; en CSV, «Barriles no producidos por evento»); `alcance` = título del ámbito («La Ceiba», «Portafolio · …») o el campo de la ficha; `periodo` = `periodoDelInforme(rango, parcial)` (5D.1); `campos` = ids del ámbito (en la ficha, solo el campo del equipo); `desde`/`hasta` = límites del período (ISO); `equipo` solo en el PDF de una ficha.

| # | Regla | Texto del demo | HTTP |
|---|---|---|---|
| 1 | `evidencia:exportar` | «Su rol no exporta evidencia.» | 403 |
| 2 | persona activa | «Nadie con acceso activo tiene este rol: …» | 403 |
| 3 | todos los `campos` son de la persona | «El informe incluye campos que no tiene asignados.» | 403 |
| 4 | hay campos | «El informe no tiene campos.» | 422 |
| 5 | cada campo existe en el registro | ««{id}» no es un campo.» | 422 |
| 6 | `desde < hasta` | «El período del informe no es válido: el fin tiene que ser después del inicio.» | 422 |
| 7 | si hay `equipo`, su `campoId` está en `campos` | «La ficha de un equipo va con el campo del equipo.» | 422 |
| 8 | calcular el libro de `campos` en `[desde, hasta)` con el contexto del servidor y la versión vigente; `cifras = cifrasDe(...)`; `huella = SHA-256(formaCanonica(cifras))`; `estado = estadoDelLibro(libro)` | — | — |
| 9 | tomar el folio **después** de calcular (dos exportaciones seguidas no comparten folio) y guardar | → `{ datos: { informe } }` | 200 |

`Informe` = la consulta + `{ folio, fecha, por, version, estado, cifras, huella }`.

**Ejemplo con los datos del demo.** (Corrido contra `emitirInforme` del demo, gerente, La Ceiba, septiembre de 2026.)

```json
{ "folio":"INF-2026-0001", "fecha":"2026-10-02T14:00:00-05:00", "por":"Andrés Vélez · gerente de activo",
  "version":1, "estado":"publicable",
  "cifras":{ "campos":["ceiba"], "desde":"2026-09-01T05:00:00Z", "hasta":"2026-10-01T05:00:00Z", "version":1,
             "real":338662, "potencial":346378.06, "noProducido":7716.06, "diferido":7716.06, "tolerancia":1157.41,
             "metaProduccion":327000, "metaDiferido":24000, "eventos":18 },
  "huella":"9439920a3b191e5defc44bbf5a02780c01f4c477b4232259de355bd618234cb8" }
```

Rechazos corridos: operador → «Su rol no exporta evidencia.»; producción pidiendo Morichal → «El informe incluye campos que no tiene asignados.»; `campos: []` → «El informe no tiene campos.»; `hasta = desde` → «El período del informe no es válido…»; ficha de P-201B de Morichal con `campos: ["ceiba"]` → «La ficha de un equipo va con el campo del equipo.».

**Casos borde.**
- **Campo inexistente con gerente «todos»**: en el demo, `["xx"]` cae en la regla 3 («…campos que no tiene asignados», 403) antes que en la 5, porque «todos» se expande a los campos del registro. El contrato pide 422 para «un campo no existe». Ver «Huecos y dudas».
- **Folio consecutivo por año, nunca reutilizado.** En el demo el número es `informes.length + 1` sin reiniciar por año (`escrituras.ts:253`); el servidor necesita una secuencia por año (`INF-2027-0001` el 1 de enero en Colombia) con `unique(folio)` y asignación transaccional.
- **El informe usa la versión vigente**, no la que regía en el período: está bien porque las metas, el precio y la regla de cierre son tramos con fecha y no se reescriben hacia atrás (5D.2). La versión queda en las cifras (`version`), así que firmar una versión nueva después de exportar no cambia el papel ya emitido.
- **El CSV no repite el cálculo protegido**: las filas de eventos se piden aparte a `GET /api/vistas/diferidos` con los mismos `campos/desde/hasta` (`Exportar.tsx:60`). Si algo cambió entre el `POST` y ese `GET` (por ejemplo, alguien respondió una causa), las filas pueden diferir de lo que se hasheó: la huella solo protege el **número** de tramos (`eventos`), no la causa de cada uno.

**Quién lo calcula.** Servidor (folio, cifras, huella, estado, fecha, por).

**Referencia.** `src/shared/api/escrituras.ts:231-257`; `src/entities/informe.ts:164-178`; `CONTRATO.md` · «Informes exportados».

---

### Cifras protegidas (`cifrasDe`)

**Qué es.** Las cifras del libro del período que el folio protege, ya redondeadas como van al papel y a la huella.

**Fórmula.** Con $L$ = libro de `campos` en `[desde, hasta)`:

| clave | valor | tipo | de dónde sale |
|---|---|---|---|
| `campos` | ids ordenados alfabéticamente | lista de texto | consulta |
| `desde`, `hasta` | `isoUtc(L.desde)`, `isoUtc(L.hasta)`: ISO en UTC truncado al segundo, con `Z` | texto | libro |
| `version` | versión vigente de la configuración | entero | `version_config` |
| `real` | $r_2(L.\text{real})$ — lo producido, punto de medición oficial | bbl | libro |
| `potencial` | $r_2(L.\text{potencial})$ | bbl | libro |
| `noProducido` | $r_2(L.\text{brecha})$ = potencial − real | bbl | libro |
| `diferido` | $r_2(L.\text{diferido})$ = Σ tramos | bbl | libro |
| `tolerancia` | $r_2(L.\text{tolerancia})$ | bbl | libro |
| `metaProduccion` | $r_2(L.\text{meta.produccion})$ | bbl | libro (metaEntre) |
| `metaDiferido` | $r_2(L.\text{meta.diferido})$ | bbl | libro |
| `eventos` | número de tramos (evento × pozo) del período | entero | `L.tramos.length` |
| `equipo`, `campoEquipo`, `bblEquipo` | solo en la ficha: el equipo, su campo y $r_2\left(\sum \text{porEquipo.bbl}\right)$ de **ese** equipo en **ese** campo | texto, texto, bbl | libro |

$$ r_2(v) = \frac{\lfloor 100\,v + 0{,}5 \rfloor}{100} \quad \text{(calculado en doble IEEE-754)} $$

`eventos` existe para que quitar un evento cambie la huella aunque pese 0 bbl.

**Ejemplo con los datos del demo.** Libro de La Ceiba, septiembre 2026 (corrido con el demo del 9-oct): `real = 338662`, `potencial = 346378.05919221457`, `brecha = 7716.059192214569`, `diferido = 7716.059192214809`, `tolerancia = 1157.4088799693204`, `meta.produccion = 327000` (10.900 × 30), `meta.diferido = 24000` (800 × 30), 18 tramos, `publicable: true`, sin motivos. Cifras: `real 338662`, `potencial 346378.06`, `noProducido 7716.06`, `diferido 7716.06`, `tolerancia 1157.41`, `metaProduccion 327000`, `metaDiferido 24000`, `eventos 18`. Ficha de P-201B (confiabilidad, `INF-2026-0002`): `bblEquipo = 1040.55`.

**Referencia.** `src/entities/informe.ts:46-66, 131-144`.

---

### Forma canónica y huella SHA-256 (`formaCanonica`, `huellaDe`)

**Qué es.** El texto exacto que se hashea. Es **texto, no JSON**, a propósito: el JSON de cada lenguaje escribe distinto los números («10900» en JavaScript, «10900.0» en Python) y la huella no cuadraría entre el servidor y quien verifique.

**Fórmula.** Una línea `clave=valor` por cifra, **en este orden** (`CLAVES_HUELLA`): `campos`, `desde`, `hasta`, `version`, `real`, `potencial`, `noProducido`, `diferido`, `tolerancia`, `metaProduccion`, `metaDiferido`, `eventos`, `equipo`, `campoEquipo`, `bblEquipo` (las tres últimas solo si existen; una clave ausente no deja línea).

| Clave | Cómo se escribe el valor |
|---|---|
| `campos` | ids ordenados (orden de código, `Array.sort()` de JavaScript: por unidades UTF-16) y unidos con `,` sin espacios |
| `desde`, `hasta`, `equipo`, `campoEquipo` | el texto tal cual |
| `version`, `eventos` | entero (`Math.trunc`), sin separadores |
| barriles | **sin pasar por el formato de números del lenguaje**: $k = \lfloor 100\,v + 0{,}5 \rfloor$ en doble IEEE-754; se escribe signo (`-` si $k<0$), $\lfloor |k|/100 \rfloor$, `.`, y $|k| \bmod 100$ con dos dígitos |

- Líneas separadas por **LF** (`\n`), **sin salto final**.
- Codificación **UTF-8 sin BOM**.
- Huella = **SHA-256** del texto, en **hexadecimal minúscula** (64 caracteres).

```ts
// src/entities/informe.ts:102-129
const centesimas = (v: number) => Math.floor(v * 100 + 0.5)
const dosDecimales = (v: number) => { const k = centesimas(v), a = Math.abs(k)
  return `${k < 0 ? '-' : ''}${Math.trunc(a / 100)}.${String(a % 100).padStart(2, '0')}` }
const isoUtc = (d: Date) => `${new Date(Math.floor(d.getTime() / 1000) * 1000).toISOString().slice(0, 19)}Z`
```

**Ejemplo con los datos del demo (huella real calculada).** El informe `INF-2026-0001` (La Ceiba, septiembre de 2026) tiene esta forma canónica (12 líneas, 225 bytes):

```
campos=ceiba
desde=2026-09-01T05:00:00Z
hasta=2026-10-01T05:00:00Z
version=1
real=338662.00
potencial=346378.06
noProducido=7716.06
diferido=7716.06
tolerancia=1157.41
metaProduccion=327000.00
metaDiferido=24000.00
eventos=18
```

SHA-256 calculado por el motor (`crypto.subtle`) y verificado de forma independiente con `node:crypto` (`createHash('sha256').update(texto, 'utf8')`) y con Python (`hashlib.sha256(texto.encode())`):

```
9439920a3b191e5defc44bbf5a02780c01f4c477b4232259de355bd618234cb8
```

En el papel se escribe agrupada de a cuatro (`huellaLegible`): `9439 920a 3b19 1e5d efc4 4bbf 5a02 780c 01f4 c477 b423 2259 de35 5bd6 1823 4cb8`. (Con el demo anterior al 9-oct la misma consulta daba otra huella: las cifras cambiaron, como debe ser; un informe ya emitido conserva la suya.)

Ficha de P-201B (`INF-2026-0002`), las mismas 12 líneas más `equipo=P-201B`, `campoEquipo=ceiba`, `bblEquipo=1040.55` → `affc31e5c72abc2f2794f5fb0941b1ce0fb812775a287dda54e1ce46075b5a42`.

Portafolio de los 5 campos, octubre en curso (`INF-2026-0003`, gerente; `campos` llegó en el orden `zarza,ceiba,morichal,guacamayo,palmar` y se escribe `ceiba,guacamayo,morichal,palmar,zarza`): `desde=2026-10-01T05:00:00Z`, `hasta=2026-10-02T19:00:00Z`, `real=64147.00`, `potencial=66523.75`, `noProducido=2376.75`, `diferido=2376.75`, `tolerancia=245.14`, `metaProduccion=63650.00`, `metaDiferido=3641.67`, `eventos=11` → `e4f2b430241fdc88bb041991e543924fd0478ec35695ba53cd05ac2318fd58b1`, `estado: "provisional"` (único motivo `en-curso`: «El período incluye días sin cierre publicado.»).

**Casos borde (redondeo).** Corrido en JavaScript: $\lfloor 1{,}005 \times 100 + 0{,}5\rfloor = 100$ → «1.00» (no «1.01»: en doble IEEE-754, $1{,}005 \times 100 = 100{,}49999…$). Un backend que use decimal exacto da otra cosa: en Python, `Decimal('1.005')*100+Decimal('0.5')` redondeado hacia abajo da 101, mientras `math.floor(1.005*100+0.5)` da 100 (los dos corridos). Con 101 la huella cambia: **hay que calcular en doble**, con la misma multiplicación y suma. Otros: −1,5 → $k=-150$ → «-1.50»; −0,004 → $k=0$ → «0.00» (sin signo); 10.900 → «10900.00». Las cifras ya vienen redondeadas con $r_2$ y se vuelven a pasar por `centesimas` al escribir: el resultado es estable.

**Casos borde (fechas).** `desde`/`hasta` salen del **libro** (`L.desde`, `L.hasta`), truncados al segundo y en UTC: un período de Colombia del 1-sep 00:00 a 1-oct 00:00 se escribe `2026-09-01T05:00:00Z` / `2026-10-01T05:00:00Z`. El mes en curso termina en AHORA (`2026-10-02T19:00:00Z`).

**Quién lo calcula.** Servidor. El front usa `formaCanonica` solo para imprimir las cifras protegidas en el papel y en el CSV (para que cualquiera recalcule el SHA-256).

**Referencia.** `src/entities/informe.ts:82-154`; `CONTRATO.md` · «Forma canónica de la huella».

---

### Estado del período en el informe (`estadoDelLibro`)

**Fórmula.**

$$ \text{estado} = \begin{cases} \texttt{publicable} & L.\text{publicable} \\ \texttt{provisional} & \text{todos los motivos tienen código } \texttt{en-curso} \\ \texttt{bloqueado} & \text{otro caso} \end{cases} $$

**Qué texto se muestra según el valor.** En el membrete, bajo el folio: nada si `publicable`; «PROVISIONAL · MES EN CURSO» si `provisional`; «NO PUBLICABLE TODAVÍA» si `bloqueado`. En el CSV, fila «Estado del período» con `publicacion(libro).texto`: «Cuadra con la medición oficial y tiene su cadena de custodia: se puede publicar.» / «Provisional: el mes está en curso y se publica cuando cierre.» / «Todavía no se puede publicar. {textos de los motivos que no son en-curso}». **Se decide por el código del motivo, nunca por su frase.**

**Ejemplo.** La Ceiba, septiembre → `publicable`; portafolio, octubre en curso → `provisional`.

**Referencia.** `src/entities/informe.ts:156-162`; `src/widgets/diferidos/publicacion.ts`.

---

### Membrete y pie del papel (PDF)

**Qué es.** El PDF es **la pantalla impresa** por la ventana de imprimir del navegador («Guardar como PDF»), con un membrete y un pie que solo existen en el papel (`solo-impresion`). Después de registrar el folio, el front guarda el informe en `imprimiendo`, espera 150 ms para pintar el membrete y llama a `print()`.

**Membrete (exacto, `Membrete.tsx`).**
- Izquierda: **{empresa}** (de la configuración vigente); **{título}** (o «Impresión sin folio»); «{alcance} · {periodo}».
- Derecha: «TRIM · HIDROCARBUROS»; **«Folio {folio}»** (o «SIN FOLIO»); «DATOS DE DEMOSTRACIÓN» si la fuente es el demo; el estado si no es publicable; «Generado el {fechaHoraLarga(fecha)}» (o «no sirve como respaldo»).
- Renglón: «Por {por} · Datos hasta el {fechaHoraLarga(AHORA)}, reloj del PLC · Configuración versión {v}, firmada por {por de esa versión} el {fechaHoraLarga(fecha de esa versión)}». La versión es **la de las cifras del informe**, no la vigente al imprimir.
- En **cada hoja** (`@page`): abajo a la izquierda «Folio {folio} · {empresa} · lo producido se mide; lo diferido se calcula» (o «SIN FOLIO · no sirve como respaldo»); arriba al centro «DATOS DE DEMOSTRACIÓN» (8 pt) si es el demo.

Ejemplo del demo (`INF-2026-0001`, exportado desde `#/ger/diferidos/ceiba/cerrado`): «Operadora de demostración · Libro de diferidos · La Ceiba · Septiembre, cerrado · 1 de sept de 2026 a 30 de sept de 2026 · TRIM · HIDROCARBUROS · Folio INF-2026-0001 · DATOS DE DEMOSTRACIÓN · Generado el 2 de octubre de 2026 a las 14:00 (hora de Colombia) · Por Andrés Vélez · gerente de activo · Datos hasta el 2 de octubre de 2026 a las 14:00 (hora de Colombia), reloj del PLC · Configuración versión 1, firmada por Hermes Leal · administrador de la implementación el 1 de septiembre de 2026 a las 08:00 (hora de Colombia)».

**Pie (exacto, `PieDelInforme`).**
- «**Nota de cálculo.** Lo producido sale del punto de medición oficial. Lo no producido se calcula por asignación (prueba de cada pozo × factor de asignación × horas parado): es una estimación con su rango de tolerancia (Res. MME 40236, Ec. 22), no una medición directa. Las predicciones son escenarios, no compromisos.»
- Con folio: «**Folio {folio}** · huella SHA-256 {huella legible} · Para comprobarlo sin cuenta en TRIM, la verificación pública recibe el folio y esta huella y responde solo si coinciden con las registradas…» y «**Cifras protegidas** {las líneas de la forma canónica unidas con « · »}».
- Sin folio: «**Sin folio.** Esta impresión no pasó por «Exportar» y no quedó registrada: no sirve como respaldo documental.»

**Casos borde.** **«Sin folio: no sirve como respaldo».** Imprimir con Ctrl+P sin pasar por Exportar produce un papel con «SIN FOLIO», el período de la cabecera (`periodoDelInforme`) y la versión vigente: no queda registrado. **«DATOS DE DEMOSTRACIÓN»** sale solo con `VITE_FUENTE` = demo: un informe impreso del demo no puede pasar por uno real; con la fuente http no aparece.

**Quién lo calcula.** Front (es la pantalla impresa); los datos del membrete vienen del informe registrado y del historial de versiones.

**Referencia.** `src/widgets/informe/Membrete.tsx`; `src/widgets/diferidos/Rango.tsx:9-13` (`NOTA_DE_CALCULO`).

---

### CSV de los eventos (`csvDeLibro`)

**Qué es.** Los tramos (evento × pozo) del período, uno por fila, con el membrete arriba. Pensado para abrir bien en una hoja de cálculo en español.

**Fórmula (formato).**
- UTF-8 **con BOM** (`﻿`, para que la hoja lea las tildes), filas separadas por **CRLF**, celdas separadas por **`;`**.
- **Números**: `toLocaleString('es-CO', { useGrouping: false, maximumFractionDigits: 2 })` → **coma decimal, sin separador de miles** («134,99», «7716,06»). No se neutralizan.
- **Textos** (`textoCsv`): si empiezan por `=`, `+`, `-`, `@`, tabulador o retorno de carro, se les antepone `'` (**neutraliza fórmulas**: la hoja los ejecutaría aunque fueran entre comillas); si contienen `;`, `"`, CR o LF, van entre comillas dobles con las comillas internas duplicadas. Es la misma regla para todo CSV del producto.
- Horas en Colombia como `AAAA-MM-DD HH:MM`; un evento abierto dice «sigue abierto». Las horas del evento son las del PLC aunque el evento empiece antes del período o siga después; «Horas dentro del período» es la parte recortada.

Estructura: filas del membrete `[clave;valor]` → fila vacía → cabecera → una fila por tramo, ordenadas por inicio del evento → fila vacía → «Total» y «Rango de tolerancia».

| Bloque | Contenido |
|---|---|
| membrete | `Empresa` · `Informe` · `Alcance` · `Período` · `Generado` («{fecha larga} por {por}») · `Datos hasta` («{fecha larga}, reloj del PLC») · `Estado del período` · `Configuración` («versión {v}, firmada por {por} el {fecha larga}») · `Folio` · `Huella SHA-256` (64 hex, sin agrupar) · una fila `Cifra protegida;{clave=valor}` por línea de la forma canónica · `Nota de cálculo` |
| cabecera | `Campo;Pozo;Evento;Inicio del evento (hora Colombia);Fin del evento (hora Colombia);Horas dentro del período;Causa;Equipo;Parte;Cómo se identificó;Barriles no producidos;Aproximado (frecuencia reducida)` |
| fila | nombre del campo; pozo; id del evento; inicio; fin o «sigue abierto»; horas (2 decimales); tipo de causa (`TIPO_CAUSA`); equipo de la causa; nombre de la parte o vacío; cómo se identificó (`COMO`); bbl (2 decimales); «sí»/«no» |
| pie | `Total;;;;;;;;;;{Σ bbl};` y `Rango de tolerancia;{round(max(0, total − tol))} a {round(total + tol)} bbl` |

Nombre del archivo: `TRIM-{folio}-eventos.csv`.

**Ejemplo con los datos del demo.** (Corrido, La Ceiba, septiembre; 18 filas de eventos, 31 menos que antes del 9-oct: el mismo membrete y 38 líneas en total.) Primeras filas de datos:

```
La Ceiba;LC-04;EP-LC04-260906-85;2026-09-06 17:14;2026-09-06 21:07;3,88;Energía eléctrica;SE-2;;por señal;134,99;no
La Ceiba;LC-12;EP-LC12-260907-61;2026-09-07 08:44;2026-09-07 12:34;3,83;Energía eléctrica;SE-2;;por señal;62,68;no
La Ceiba;LC-16;EP-LC16-260911-90;2026-09-11 11:30;2026-09-11 14:07;2,62;Electrosumergible;LC-16;Admisión y gas;por señal;95,82;no
```

Pie: `Total;;;;;;;;;;7716,06;` y `Rango de tolerancia;6559 a 8873 bbl` (7.716,06 ∓ 1.157,41, redondeado al entero, sin separador de miles). Filas del membrete corridas: `Huella SHA-256;9439920a…4cb8`, `Cifra protegida;campos=ceiba`, …, `Cifra protegida;eventos=18`.

**Casos borde.** Un pozo de una asignación subida o lo que escribió un operario puede empezar por `=`: sale como `'=…`. El precio, el valor en USD y las metas no van en el CSV de eventos (solo en las cifras protegidas).

**Quién lo calcula.** Front (arma el archivo con el informe registrado y el libro del `GET`).

**Referencia.** `src/entities/informe.ts:183-208`; `src/shared/lib/csv.ts:6-15`; `src/widgets/informe/Exportar.tsx:58-77`.

---

### Consultar y verificar un folio

**Qué es.** Dos lecturas: el registro completo (con sesión) y la comprobación pública para terceros (sin sesión).

**Fórmula.**
- `GET /api/informes/:folio` → el registro completo (consulta, cifras, estado y huella). Exige sesión y que **todos** los campos del informe sean de la persona (`403` si no; `404` si el folio no existe). El folio es consecutivo: sin esta regla se podrían recorrer todos.
- `GET /api/informes/:folio/verificacion?huella=…` → **sin sesión**, responde solo `{ "datos": { "coincide": true|false, "fecha": "…" } }`. No devuelve quién exportó, ni campos, ni cifras. Con **límite de consultas por IP**. Recomendado: comparar la huella en tiempo constante y normalizar la huella recibida (minúsculas, sin espacios: en el papel va agrupada de a cuatro).
- `GET /api/informes` (arranque) → `Informe[]` de los campos de la persona.

**Ejemplo.** `GET /api/informes/INF-2026-0001/verificacion?huella=9439920a3b191e5defc44bbf5a02780c01f4c477b4232259de355bd618234cb8` → `{ "datos": { "coincide": true, "fecha": "2026-10-02T14:00:00-05:00" } }`. Cualquier cifra del papel cambiada (p. ej. `diferido=21000.00`) da otra huella → el documento fue modificado.

**Casos borde.** Folio inexistente en la verificación pública: el contrato no lo dice; recomendado responder `{ coincide: false }` (no `404`) para no confirmar qué folios existen, o `404` con límite de consultas. Está en «Pendiente del lado del servidor».

**Quién lo calcula.** Servidor. Tabla `informe` (clave `folio`; consulta, cifras, estado, huella; folio consecutivo por año, nunca reutilizado).

**Referencia.** `CONTRATO.md` · «`GET /api/informes/:folio`», «Modelo de datos de lo que se escribe».
