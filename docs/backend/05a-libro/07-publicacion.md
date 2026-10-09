# 5A.7 · Publicación del libro: estados, motivos y sello

Un libro **se puede publicar** cuando cuadra con la medición oficial, tiene su cadena de custodia completa, su factor está en banda verificable, el campo tiene meta firmada y lo sin identificar no pasa el criterio firmado. El servidor lo dice con una lista de **motivos**; el front decide el estado **por el código del motivo, nunca por la frase** (la frase la redacta el servidor y solo se lee).

---

### Motivos (`MotivoLibro`)

**Qué es.** Cada razón por la que el libro del período no se publica: `{ codigo, texto, campoId?, mes? }`.

**Fórmula.** `publicable = motivos.length === 0`. Los motivos se agregan en este orden (`src/entities/libro.ts:833-848`):

| # | `codigo` | Regla exacta | `campoId` / `mes` | `texto` (plantilla) |
|---|---|---|---|---|
| 1 | `en-curso` | algún `fa[i].publicado === false` (algún campo-mes del período con factor sin cierre publicado) | — | «El período incluye días sin cierre publicado.» |
| 2 | `sin-fiscal` | por campo con días del período sin fiscal (`sinFiscal`) | campo | «{Campo}: faltan {n} {día\|días} de producción fiscal del punto de medición oficial; no entran ni en lo real ni en el potencial.» |
| 3 | `sin-factor` | por (campo, mes) del período sin un solo día fiscal | campo, mes | «{Campo}, {mes} de {año}: sin un día de producción fiscal no hay factor de asignación; sus diferidos no se pueden valorar.» |
| 4 | `banda-sin-verificar` | por campo con `bandaDe(c).verificable === false` | campo | «{Campo}: {fuente de la banda hasta el primer «:»}; no se puede verificar el factor contra la banda de la Res. 40236.» |
| 5 | `fa-fuera-de-banda` | por (campo, mes) con `dentro === false`, **salvo** los campos del motivo 4 | campo, mes | «{Campo}, {mes} de {año}: factor de asignación {FA, 3 decimales} fuera de la banda ±{b·100 redondeado} %.» |
| 6 | `sin-meta` | por campo con algún día sin tramo de meta entre `desde` y `finTotal` | campo | «{Campo}: el campo no tiene meta ni regla de cierre firmadas en el período; no se puede publicar.» |
| 7 | `sin-causa` | por campo: $\text{crit} \ne \text{undefined}\ \wedge\ \text{potencial}_c > 0\ \wedge\ 100\cdot\text{pendiente}_c/\text{potencial}_c > \text{crit}$, con $\text{crit} = \text{criterioEn}(\text{config}, c, h_0 - 1)$: la regla de cierre que regía **al final** del período | campo | «{Campo}: {round(pendiente) es-CO} bbl sin causa identificada, más del {crit} % del potencial.» |

El mes en letras sale de `NOMBRE_MES` («abril de 2026»).

**Ejemplos (corridos con el motor).**

| Caso | `motivos` |
|---|---|
| La Ceiba · septiembre | `[]` → publicable |
| La Ceiba · octubre en curso | `en-curso` |
| Portafolio · año a la fecha | `en-curso`; `fa-fuera-de-banda` (palmar, 2026-04): «El Palmar, abril de 2026: factor de asignación 0,810 fuera de la banda ±15 %.» |
| Portafolio · últimos 12 meses | `fa-fuera-de-banda` (palmar, 2026-04) |
| Escenario: 15-sep de La Ceiba sin fiscal | `sin-fiscal`: «La Ceiba: faltan 1 día de producción fiscal del punto de medición oficial; no entran ni en lo real ni en el potencial.» |
| Escenario: octubre de La Ceiba sin fiscal | `sin-fiscal` (2 días) y `sin-factor`: «La Ceiba, octubre de 2026: sin un día de producción fiscal no hay factor de asignación; sus diferidos no se pueden valorar.» (sin `en-curso`: no hay fila de factor que diga «no publicado») |
| Escenario: El Palmar sin °API, septiembre | `banda-sin-verificar`: «El Palmar: Sin análisis de °API del crudo; no se puede verificar el factor contra la banda de la Res. 40236.» |
| Escenario: La Zarza sin tramos de meta, portafolio sep | `sin-meta`: «La Zarza: el campo no tiene meta ni regla de cierre firmadas en el período; no se puede publicar.» |
| Escenario: La Ceiba firma criterio 1 % desde el 1-oct | `en-curso`; `sin-causa`: «La Ceiba: 355 bbl sin causa identificada, más del 1 % del potencial.» ($355{,}027/17.986{,}201 = 1{,}974\,\%$) |

Con el criterio real (2 %), octubre de La Ceiba queda en 1,974 %: a 0,026 puntos del bloqueo, con LC-21 todavía cerrado sin respuesta (su pendiente crece unos 12,5 bbl por hora).

**Quién lo calcula.** Servidor: `Libro.motivos` y `Libro.publicable` (`GET /api/vistas/diferidos`; también en cada mes de la serie). `CodigoMotivo` es cerrado: un código nuevo exige cambiar el front.

**Referencia.** `src/entities/libro.ts:564-569`, `:833-848`, `:877`; `verificar-libro.mjs` secciones 1-3, 6f y 10.

---

### Estado de publicación (`publicable` / `provisional` / `bloqueado`)

**Qué es.** El resumen de los motivos en tres estados, dicho igual en todas las pantallas (`publicacion()`, `src/widgets/diferidos/publicacion.ts`).

**Fórmula.**

$$
\text{estado} = \begin{cases}
\text{publicable} & \text{motivos} = \varnothing \\
\text{provisional} & \text{todos los motivos son en-curso} \\
\text{bloqueado} & \text{hay algún motivo distinto de en-curso}
\end{cases}
$$

| Estado | Texto (`pub.texto`, va al globo) |
|---|---|
| publicable | «Cuadra con la medición oficial y tiene su cadena de custodia: se puede publicar.» |
| provisional | «Provisional: el mes está en curso y se publica cuando cierre.» |
| bloqueado | «Todavía no se puede publicar. » + los `texto` de los motivos que no son `en-curso`, separados por espacio |

**Ejemplo.** La Ceiba sep → publicable; La Ceiba oct → provisional; portafolio año a la fecha → bloqueado: «Todavía no se puede publicar. El Palmar, abril de 2026: factor de asignación 0,810 fuera de la banda ±15 %.»

**Quién lo calcula.** Front, con los códigos del servidor.

---

### Sello de publicación (`SelloPublicacion`)

**Qué es.** La etiqueta que dice si el libro se puede publicar, arriba a la derecha de cada encabezado. Es una salvedad, no una alarma (ISA-101): el mes en curso va neutro; solo lo que de verdad impide publicar lleva el cuadrado.

**Dónde se ve.** Encabezado de Diferidos (todos los niveles), cabecera de Producción, encabezado del Resumen del gerente. En el papel (informe) sale la frase entera.

**Qué texto se muestra según el estado.**

| Estado | A la vista | Título del globo | Marca |
|---|---|---|---|
| publicable | chip «✓ PUBLICABLE» | «Se puede publicar» | ninguna |
| provisional | chip «PROVISIONAL» | «Provisional» | ninguna (neutro) |
| bloqueado | ■ P3 + chip fuerte «NO PUBLICABLE» y debajo **una línea corta por motivo**: «{Campo} · {corto}» | «Todavía no se puede publicar» | ■ P3 (cuadrado amarillo con trazo) |

Líneas cortas (`CORTO`, `src/widgets/diferidos/Sello.tsx:13-16`), sin repetir (un campo con dos meses fuera de banda es una sola línea; el globo los dice todos):

| `codigo` | Corto |
|---|---|
| `fa-fuera-de-banda` | «factor fuera de banda» |
| `sin-causa` | «mucho sin identificar» |
| `sin-fiscal` | «faltan días de fiscal» |
| `sin-factor` | «sin factor de asignación» |
| `banda-sin-verificar` | «banda sin verificar» |
| `sin-meta` | «sin meta firmada» |

Ejemplo: portafolio año a la fecha → «NO PUBLICABLE» y «El Palmar · factor fuera de banda». En el papel la línea corta no se imprime; se imprime la pista completa. En el teléfono el sello tiene 24 px de alto mínimo (WCAG 2.5.8).

**Otras pantallas que dicen la publicación.**

- Mes a mes, globo de cada mes: «Cierre: sin publicar» (mes parcial), «publicable» o «no publicable».
- Encabezado, globo de la cifra: «Cierre: provisional | publicado» (por `fa[].publicado`, no por los motivos).
- Por campo (Diferidos, portafolio): ■ junto a la cifra y «Publicable: no» si el campo tiene algún motivo que no sea `en-curso` (`campoPublicable`, abajo). Hasta el 8-oct era una regla propia del front (meta, `fa[].dentro` y criterio, sin `sin-fiscal` ni `sin-factor`: «Huecos y dudas», 9).
- Cuadre y gráfico del factor: un mes con la banda sin verificar dice «banda sin verificar», no «fuera de banda» (`estadoFactor`, abajo).
- Cuadre: fila «Sin identificar» con ■ si existe el motivo `sin-causa`.
- `ResumenCampo`: «sin identificar» con ■ si el libro no es publicable y hay pendiente; pista = textos de los motivos.

**Quién lo calcula.** Front (presentación), con `motivos` del servidor.

**Referencia.** `src/widgets/diferidos/Sello.tsx`; `src/widgets/diferidos/publicacion.ts`; `src/pages/Diferidos.tsx:81-96`.
---

### Publicable por campo (`campoPublicable`) y estado del factor (`estadoFactor`)

**Qué es.** Dos lecturas de los mismos motivos, por campo y por mes, para que ninguna pantalla invente su propia regla (antes del 8-oct «Por campo» calculaba «Publicable» con otra regla y el Cuadre pintaba «fuera de banda» un factor que solo no se podía verificar: «Huecos y dudas», 8 y 9).

**Fórmula** (`src/widgets/diferidos/publicacion.ts:9-18`):

$$
\text{campoPublicable}(c) \iff \nexists\, m \in \text{motivos} : m.\text{campoId} = c \ \wedge\ m.\text{codigo} \ne \text{en-curso}
$$

$$
\text{estadoFactor}(f) = \begin{cases}
\text{sin-verificar} & \exists\, m : m.\text{codigo} = \text{banda-sin-verificar} \wedge m.\text{campoId} = f.\text{campoId} \\
\text{dentro} & f.\text{dentro} \\
\text{fuera} & \text{si no}
\end{cases}
$$

Las dos deciden **por el código del motivo**, nunca por su frase. `banda-sin-verificar` es por campo (no por mes): todos los meses de ese campo salen «sin verificar». `sin-causa` lleva `campoId`, así que también bloquea su campo.

**Dónde se ve.**
- Diferidos, «POR CAMPO» (portafolio, ingeniería): ■ junto a la cifra y globo «Publicable · no» si `!campoPublicable` (`src/pages/Diferidos.tsx:84`, `:91`, `:95`); Lectura: «… junto a la cifra, el que no se puede publicar (el sello dice por qué)».
- Cuadre, «FACTOR DE ASIGNACIÓN»: un mes `fuera` lleva ■ P3 y el chip fuerte «fuera de ±N %»; un mes `sin-verificar`, **sin marca** y el chip neutro «banda sin verificar» (`src/widgets/diferidos/Cuadre.tsx:21-23`, `:56-64`).
- Gráfico del factor (`Factor.tsx:47-60`): `fuera` es el cuadrado P3; `sin-verificar` es el círculo **punteado**, globo con «Banda · sin verificar» y la pista que redacta el servidor (el texto del motivo `banda-sin-verificar`).

**Ejemplo (mundo de prueba de `verificar-libro` §10, corrido con el motor).** La Zarza sin °API (`api: null`) en septiembre: factor 1,032 con `dentro: false`; antes salía «fuera de ±20 %» con ■, ahora `estadoFactor` = **sin-verificar** («banda sin verificar», sin marca); La Ceiba, `dentro`. Guacamayo con 3 días sin fiscal en septiembre: antes «Publicable: sí» con el sello en «NO PUBLICABLE», ahora `campoPublicable` = **false** (motivo `sin-fiscal`); La Ceiba, `true`. El mes en curso por sí solo no bloquea un campo.

**Quién lo calcula.** Front (presentación), con `Libro.motivos` y `Libro.fa` del servidor. Un backend que agregue el dato debe usar la misma regla.

**Referencia.** `src/widgets/diferidos/publicacion.ts`; `verificar-libro.mjs` §10 (F4 y F5).
