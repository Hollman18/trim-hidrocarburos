# 5D.1 · Reloj y calendario

Todo lo que este capítulo describe (una firma, un mensaje de WhatsApp, un folio, una orden de SAP) lleva una hora. Antes de cualquier regla hay que fijar **qué es «ahora»**, **qué es un día** y **qué es un mes**, porque las reglas de escritura («un mes cerrado no se reescribe», «una parada solo se programa antes de empezar», «el recordatorio sale a los 30 min») se evalúan contra ese reloj.

Código: `src/entities/reloj.ts` (67 líneas), `src/entities/campos.ts:63-85` (los períodos de la cabecera), `src/entities/libro.ts:56-80` y `:574` (calendario de meses y medianoche), `src/entities/configuracion.ts:204` (`diaCo`), `src/entities/diferido.ts:595` (`rangoDePeriodo`).

---

### AHORA (el instante de referencia)

**Qué es.** El instante contra el que se mide todo lo «en curso»: la duración de un evento abierto, el mes en curso, si un mes ya cerró, si una parada del programa ya empezó, hasta dónde llegan los datos de un informe.

**Dónde se ve.** En todas las pantallas de todos los roles, de forma indirecta. Se lee literalmente en el papel: «Datos hasta el 2 de octubre de 2026 a las 14:00 (hora de Colombia), reloj del PLC» (membrete del informe, `src/widgets/informe/Membrete.tsx:44`) y en la fila «Datos hasta» del CSV (`src/widgets/informe/Exportar.tsx:64`).

**Fórmula.** En el demo es una constante:

```ts
// src/entities/reloj.ts:7
export const AHORA = new Date('2026-10-02T14:00:00-05:00')
```

$$ \text{AHORA} = 1\,790\,967\,600\,000 \text{ ms} = \texttt{2026-10-02T19:00:00Z} = \texttt{2026-10-02T14:00:00-05:00} $$

| símbolo | significado | unidad | de dónde sale |
|---|---|---|---|
| AHORA | instante «actual» del sistema | ms desde 1970 (UTC) | demo: constante; producción: reloj del servidor (y, para los datos, la última marca de tiempo recibida del PLC) |

**Ejemplo con los datos del demo.** Corriendo el motor: `AHORA.toISOString()` = `2026-10-02T19:00:00.000Z`, `AHORA.getTime()` = `1790967600000`. Las firmas del demo salen con `horaDelPlc()` (`src/shared/api/escrituras.ts:62`), que da `2026-10-02T14:00:00-05:00`.

**Casos borde.**
- En producción hay **dos relojes** distintos y el backend tiene que decidir cuál usa en cada lugar: (1) el **reloj del servidor**, para las horas de las escrituras (`fecha` de una versión, `hora` de una respuesta, `creado` de un aviso, `fecha` de un informe) y para las reglas «mes cerrado» / «ya empezó»; (2) el **reloj de los datos** («datos hasta»), que es la última lectura que llegó del PLC/historiador. Hoy el front usa `AHORA` para ambos. Está pendiente en el contrato (`CONTRATO.md` · «Pendiente del lado del servidor»: «Reloj de los datos: `generadoEn` / `datosHasta` en las respuestas, o `GET /api/reloj`»).
- Un evento abierto (sin `fin`) se mide hasta AHORA. Si el servidor no fija AHORA por petición, dos vistas pedidas con segundos de diferencia darían horas distintas para el mismo evento abierto. Recomendación: el servidor calcula cada respuesta con un AHORA único por petición y lo devuelve (`generadoEn`).

**Qué texto se muestra según el valor.** `fechaHoraLarga(AHORA)` = «2 de octubre de 2026 a las 14:00 (hora de Colombia)» (así lo escriben Chromium 153, Firefox 155 y WebKit 26.6 —los tres motores de Playwright— y Node 22; el comentario de `reloj.ts` dice «…, 14:00», pero ningún motor actual lo escribe así; el patrón depende de los datos ICU del motor de JavaScript, ver «Huecos y dudas»). `fechaHora(AHORA)` = «2 de oct, 14:00». `fechaCorta(AHORA)` = «2 de oct».

**Quién lo calcula y por dónde viaja.** Hoy: front (constante). Producción: el servidor. No hay campo en el contrato todavía.

**Referencia.** `src/entities/reloj.ts:7`; `src/shared/api/escrituras.ts:62` (`horaDelPlc`).

---

### Zona horaria de Colombia

**Qué es.** Toda fecha civil del producto (el día de un tramo de meta, el mes de un libro, la medianoche de un día de producción, el texto de un mensaje) se interpreta en hora de Colombia: **UTC−5 fija, sin horario de verano** (IANA `America/Bogota`).

**Dónde se ve.** En todos los textos con fecha: «2 de oct, 03:52», «1 de oct de 2026», «(hora de Colombia)».

**Fórmula.** Para pasar un instante a la fecha civil de Colombia se resta 5 h y se lee en UTC:

$$ t_{CO} = t - 5\,\text{h} $$

```ts
// src/entities/reloj.ts:24 y src/entities/configuracion.ts:204
const anioCo = (d: Date) => new Date(d.getTime() - 5 * 3_600_000).getUTCFullYear()
export const diaCo = (t: number) => new Date(t - 5 * 3_600_000).toISOString().slice(0, 10)
```

**Ejemplo con los datos del demo.** `diaCo(Date.parse('2026-10-02T04:30:00Z'))` = `2026-10-01` (son las 23:30 del 1 de octubre en Bogotá). `fechaHora(new Date('2025-12-31T21:00:00-05:00'))` = «31 de dic de 2025, 21:00»: lleva el año porque no es el año de AHORA (en Madrid ya sería 2026; por eso el año se calcula con `anioCo`, no con el del navegador).

**Casos borde.**
- Nunca usar la zona del servidor ni la del navegador para cortar días o meses: un servidor en UTC cortaría el día a las 19:00 de Bogotá.
- Los textos que quedan en registros firmados (el historial de versiones, el historial de accesos, los mensajes) se escriben con `timeZone: 'America/Bogota'` explícito (`configuracion.ts:273`, `mensajes.ts:166`), para que no dependan del lugar donde corre el código.
- En el cable las fechas viajan en ISO 8601 **con zona** (`CONTRATO.md` · «Reglas del cable»): se acepta cualquier zona explícita; sin zona el front las rechaza.

**Qué texto se muestra según el valor.** Formatos (todos `es-CO`, 24 h): `fechaHora` «2 de oct, 03:52» (con año si es de otro año: «31 de dic de 2025, 21:00»); `fechaCorta` «1 de oct»; `fechaHoraLarga` «2 de octubre de 2026 a las 14:00 (hora de Colombia)» (documentos); `fechaDia` de configuración «1 de oct de 2026» (historial firmado y pantallas de configuración, `configuracion.ts:273`, `widgets/configuracion/comun.ts:9`). Toda fecha con mes abreviado pasa por `formatoFecha` (`src/shared/lib/fecha.ts`), que fija la abreviatura del mes («sept», no «sep.» de Safari) para que el texto sea igual en todos los navegadores y en Node; el servidor que genere textos firmados tiene que usar exactamente esas abreviaturas: `ene feb mar abr may jun jul ago sept oct nov dic`.

**Quién lo calcula y por dónde viaja.** Los dos lados. El servidor devuelve instantes ISO con zona; el front los formatea.

**Referencia.** `src/entities/reloj.ts:15-37`; `src/entities/configuracion.ts:203-204`.

---

### Medianoche de Colombia (inicio del día)

**Qué es.** El instante en que empieza el día civil de Colombia que contiene a `t`. Es la frontera de los días de producción, de la meta del día y de los tramos de meta (que rigen «desde su día»).

**Dónde se ve.** No tiene rótulo propio: corta los días de «Producción día a día», el total del mes de las metas y el plan mes a mes.

**Fórmula.**

$$ \text{inicioDía}(t) = \left\lfloor \frac{t - 5\,\text{h}}{D} \right\rfloor \cdot D + 5\,\text{h}, \qquad D = 86\,400\,000 \text{ ms} $$

| símbolo | significado | unidad | de dónde sale |
|---|---|---|---|
| $t$ | instante | ms UTC | cualquier hora |
| $D$ | un día | ms | constante (`libro.ts:38`) |
| $5\,\text{h}$ | desfase de Colombia | ms | constante (UTC−5) |

```ts
// src/entities/libro.ts:574
const inicioDiaCo = (t: number) => Math.floor((t - 5 * H) / D) * D + 5 * H
```

**Ejemplo con los datos del demo.** (Corrido con el motor.)

| $t$ | inicioDía($t$) | `diaCo(t)` |
|---|---|---|
| `2026-10-02T14:00:00-05:00` (AHORA) | `2026-10-02T05:00:00Z` | `2026-10-02` |
| `2026-10-02T00:00:00-05:00` | `2026-10-02T05:00:00Z` | `2026-10-02` |
| `2026-10-01T23:59:59-05:00` | `2026-10-01T05:00:00Z` | `2026-10-01` |
| `2026-10-02T04:30:00Z` | `2026-10-01T05:00:00Z` | `2026-10-01` |

**Casos borde.** Sin horario de verano, todos los días tienen 24 h exactas: el backend puede usar esta aritmética entera sin tablas de zona. Si un cliente estuviera en un país con horario de verano, esta fórmula deja de valer (habría que usar la base de zonas IANA); el producto hoy solo declara Colombia (`src/shared/config/region.ts`).

**Qué texto se muestra según el valor.** No aplica (frontera interna).

**Quién lo calcula y por dónde viaja.** Servidor (libro, día a día, meta del día) y front (total del mes en Metas y Plan, que llama a `metaEntre`).

**Referencia.** `src/entities/libro.ts:574` y `:579-591` (`metaEntre`); `src/entities/configuracion.ts:204`.

---

### Meses y su estado (calendario de la producción fiscal)

**Qué es.** La lista de meses con producción fiscal, cada uno con su inicio, su fin (recortado a AHORA si es el mes en curso) y si ya se publicó en **todos** los campos. Un mes está **cerrado** cuando ya empezó el siguiente.

**Dónde se ve.** En `GET /api/catalogo` → `calendario: Mes[]` (`CONTRATO.md` · «Arranque»). Lo usan: el selector de período, la carga de la asignación oficial (solo meses cerrados, `escrituras.ts:281-284`), el plan mes a mes (no carga meses cerrados) y la serie mensual del libro.

**Fórmula.**

$$ \text{desde}(m) = \text{día 1 de } m \text{ a las 00:00 (UTC−5)}, \qquad \text{hasta}(m) = \min\big(\text{desde}(m+1),\ \text{AHORA}\big) $$

$$ \text{cerrado}(m) \iff \text{desde}(m+1) \le \text{AHORA} $$

$$ \text{publicado}(m) \iff \forall\, c \in \text{campos con producción fiscal}: \text{publicado}_c(m) $$

```ts
// src/entities/libro.ts:59, 76-80
const inicioMes = (mes: string) => ms(`${mes}-01T00:00:00-05:00`)
export const calendario = perezoso((): Mes[] => [...new Set(produccionDiaria().map(m => m.mes))].sort()
  .map(mes => ({ mes, desde: inicioMes(mes), hasta: Math.min(inicioMes(sigMes(mes)), ahora), publicado: publicadoEnTodos(CAMPOS_FISCALES(), mes) })))
export const mesCerrado = (m: Mes) => inicioMes(sigMes(m.mes)) <= ahora
```

| símbolo | significado | unidad | de dónde sale |
|---|---|---|---|
| $m$ | mes `AAAA-MM` | — | meses presentes en `GET /api/campos/:campo/produccion-diaria` |
| publicado$_c(m)$ | el campo $c$ publicó su producción fiscal de $m$ | booleano | `ProduccionMes.publicado` del insumo de producción diaria |

**Ejemplo con los datos del demo.** El motor da 13 meses: de `2025-10` a `2026-09` todos con `publicado: true` y `cerrado: true`; `2026-10` con `desde = 2026-10-01T05:00:00Z`, `hasta = 2026-10-02T19:00:00Z` (= AHORA), `publicado: false`, `cerrado: false`.

**Casos borde.**
- Un mes cerrado pero sin publicar en algún campo (el fiscal llega tarde) sigue cerrado para las reglas de escritura (no se le cambia la meta) pero su libro no es publicable (motivo `sin-fiscal` o `en-curso`, ver capítulo del libro).
- «Mes cerrado» en `validarConfig` NO usa este calendario: usa el primer día del mes en curso calculado del reloj (`desdeMinimo`, ver 5D.2). Son la misma frontera mientras haya producción fiscal del mes en curso; con un mes sin ninguna fila fiscal todavía (día 1 a las 00:05), el calendario no lo listaría y la regla de configuración sí lo trataría como en curso.

**Qué texto se muestra según el valor.** El mes en curso se rotula «Octubre, en curso»; el último cerrado «Septiembre, cerrado» (ver el siguiente apartado).

**Quién lo calcula y por dónde viaja.** Servidor: `GET /api/catalogo` → `calendario` (`desde` y `hasta` en ms).

**Referencia.** `src/entities/libro.ts:56-80`; `src/shared/api/calendario.ts:8-15`.

---

### Períodos de la cabecera (`calendarioDe(AHORA)`)

**Qué es.** Los cinco períodos que el usuario escoge en la cabecera, derivados solo de AHORA. Cuando el servidor dé la hora, se mueven solos.

**Dónde se ve.** Cabecera de todas las pantallas con período; en la dirección `#/rol/pantalla/campo/período` (`src/app/url.ts`), con `período` ∈ {`curso`, `cerrado`, `trimestre`, `ytd`, `doce`} o un rango a mano `AAAA-MM-DD_AAAA-MM-DD`. El período también va al membrete del informe (`periodoDelInforme`).

**Fórmula.** Con $y, m$ = año y mes de AHORA en Colombia, e $\text{ini}(k)$ = día 1 del mes $m+k$ a las 00:00 (UTC−5):

| id | desde | hasta | nombre (rótulo de la cabecera) |
|---|---|---|---|
| `curso` | ini(0) | AHORA | «Mes en curso» · detalle «{día} de {días del mes} días de {mes}» |
| `cerrado` | ini(−1) | ini(0) | «{Mes −1} · cerrado» · «mes completo, publicado» |
| `trimestre` | ini(−3) | ini(0) | «Trimestre {mmm−3}–{mmm−1}» · «3 meses cerrados» |
| `ytd` | 1-ene de $y$ | AHORA | «Año a la fecha» · «ene a {mmm} · {meses cerrados del año} cerrados + {día} días» |
| `doce` | ini(−12) | ini(0) | «Últimos 12 meses» · «{mmm−12}-{año} a {mmm−1}-{año}» |
| `medida` (a mano) | día `desde` 00:00 | min(día `hasta` + 1 día, AHORA) | «Rango escogido» |

```ts
// src/entities/reloj.ts:48-66
const co = new Date(ahora.getTime() - 5 * 3_600_000)
const inicio = (anio: number, mes: number) => new Date(Date.UTC(anio, mes, 1, 5))
```

**Ejemplo con los datos del demo.** Corriendo `calendarioDe(AHORA)`:

| id | desde (UTC) | hasta (UTC) | nombre del calendario | rótulo de la cabecera (`PERIODOS`) |
|---|---|---|---|---|
| curso | 2026-10-01T05:00Z | 2026-10-02T19:00Z | «Octubre, en curso» | «Mes en curso» · «2 de 31 días de octubre» (parcial) |
| cerrado | 2026-09-01T05:00Z | 2026-10-01T05:00Z | «Septiembre, cerrado» | «Septiembre · cerrado» · «mes completo, publicado» |
| trimestre | 2026-07-01T05:00Z | 2026-10-01T05:00Z | «Julio a septiembre» | «Trimestre jul–sep» · «3 meses cerrados» |
| ytd | 2026-01-01T05:00Z | 2026-10-02T19:00Z | «Año a la fecha» | «Año a la fecha» · «ene a oct · 9 cerrados + 2 días» (parcial) |
| doce | 2025-10-01T05:00Z | 2026-10-01T05:00Z | «Últimos 12 meses» | «Últimos 12 meses» · «oct-2025 a sep-2026» |

`mesEnCurso` = `{ nombre: "octubre", cerradosDelAnio: 9, dia: 2, diasDelMes: 31 }`.

**Casos borde.**
- `hasta` es **exclusivo** en todo el contrato («el `hasta` no se incluye», `CONTRATO.md` · «Rutas»).
- Un rango a mano se endereza si viene al revés y se recorta a los días con datos (`rangoValido`, `src/app/url.ts`); «hasta» a mano es el último día **incluido** (se suma un día) y nunca pasa de AHORA.
- «cerrado» dice «mes completo, publicado» como rótulo fijo, aunque el mes no estuviera publicado en todos los campos: el estado real de publicación lo da el libro (ver capítulo del libro).
- El 1 de enero: `ytd` = [1-ene 00:00, AHORA) y `cerradosDelAnio` = 0.

**Qué texto se muestra según el valor.** El membrete escribe `periodoDelInforme(rango, parcial)`: «{nombre} · {día desde} a {día anterior a hasta}»; si es parcial y el nombre no dice «en curso», se le agrega «, en curso» (`src/widgets/informe/periodo.ts:13-17`). Ejemplo: «Octubre, en curso · 1 de oct de 2026 a 2 de oct de 2026»; el de septiembre, «Septiembre, cerrado · 1 de sept de 2026 a 30 de sept de 2026».

**Quién lo calcula y por dónde viaja.** Front (`reloj.ts`, `campos.ts`, `diferido.ts`). El servidor recibe los límites ya calculados en `desde`/`hasta` de cada vista. Lo único que el servidor tiene que aportar es AHORA.

**Referencia.** `src/entities/reloj.ts:39-67`; `src/entities/campos.ts:63-85`; `src/entities/diferido.ts:595-612`; `src/widgets/informe/periodo.ts`.

---

### Fechas fijas de la implementación

| Constante | Valor | Uso | Código |
|---|---|---|---|
| `PRIMER_DIA_METAS` | `2025-10-01` | día desde el que rige la meta de arranque de cada campo (primer día con producción fiscal) | `configuracion.ts:129` |
| `FECHA_ARRANQUE` | `2026-09-01T08:00:00-05:00` | fecha de la versión 1 de la configuración y del primer cambio de accesos | `configuracion.ts:165` |
| `PUESTA_EN_MARCHA` | `2026-09-01` | día en que TRIM empezó a operar: en el demo, los avisos SAP de fallas desde ese día salen «desde TRIM» y los anteriores «directo en SAP» | `configuracion.ts:177`, `sap.ts:239` |
| `desde` de un usuario inicial | `2026-09-01` | día del acceso de las 8 personas de arranque | `usuarios.ts:174` |

En producción: `PRIMER_DIA_METAS` es la fecha de la primera producción fiscal cargada; `FECHA_ARRANQUE` es la fecha real de la firma de la versión 1 (la firma el servidor al instalar la implementación); `PUESTA_EN_MARCHA` es esa misma fecha.
