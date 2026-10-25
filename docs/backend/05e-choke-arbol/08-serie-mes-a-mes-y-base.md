# 5E.8 · El choke en el tiempo: la serie, el cambio de lo que limita, el mes a mes y la línea base

Lo mismo de 5E.2 y 5E.4, día por día y mes por mes: qué limitó cada día, cuándo **cambió** lo que limita (con umbral y persistencia, para no avisar por ruido), el reparto por tramo de cada mes y la comparación por tramo **antes de TRIM → con TRIM**. Todas las cifras salen de las mismas filas y la misma regla del reparto: cada día suma lo mismo que el libro de ese día, y los días suman la brecha del período.

Funciones (`src/entities/choke-reparto.ts`): `serieChoke` (`:724-789`) → `{ dias: DiaChoke[], cambios: CambioDominante[], vueltas }`; `repartoPorMes` (`:683-689`) → `MesPorTramo[]`; `lineaBasePorTramo` (`:694-711`) → `LineaBasePorTramo | undefined`. Tipos en `src/entities/choke.ts:1588-1651`. Rutas: `GET /api/vistas/campos/:campo/choke/serie?desde=&hasta=` (`pedirSerieChoke`, `src/shared/api/choke.ts:141`), `GET /api/vistas/choke/mensual?campos=` (`pedirRepartoMensual`, `:216`), `GET /api/vistas/choke/base?campos=&desde=&hasta=` (`pedirBaseChoke`, `:236`; `null` sin tres meses publicados antes del período). Pantallas: Producción → «Serie» (`widgets/choke/Serie.tsx`); Diferidos → «Mes a mes» (`widgets/choke/Mensual.tsx`, `widgets/diferidos/MesAMes.tsx`); Resumen del gerente y Resumen directivo.

Datos: el demo; «13 meses» = 1-oct-2025 → 2-oct-2026 14:00; puesta en marcha de TRIM = 1-sep-2026 (`PUESTA_EN_MARCHA`, `src/entities/configuracion.ts:203`).

---

### La serie diaria

**Qué es.** Un `DiaChoke` por día operacional (`choke.ts:1619-1649`): `horas` (el de hoy, parcial), `real` (`null` si ningún campo tiene fiscal), `potencial` (el del libro), `potencialPruebas`, `potencialSistema`, `estructural`, `brechaPruebas`, `cabiaEnHolgura`, `diferido`, `residuo`, `porChoke`, `porEscalon` y, por campo, `dominante`, `casiIguales`, `potenciales` (bbl/d, con el tren que manda) y `superado`. El dominante de un día sale **solo de los potenciales**, como en la NSTA, **nunca de lo real** (si no, cambiaría con el ruido diario del fiscal). Un día se mide con la configuración que regía en su medianoche (QA-A-14).

**Ejemplo con los datos del demo.** 13 meses del portafolio: 367 días. La Ceiba, 22-sep-2026: real 10.578; potencial del libro 11.542,867; pruebas y sistema 11.913; diferido 876,426 (pozo 14,4; planta 862,0); residuo 88,441; limitan los pozos (pozos 11.913, planta 13.000 · tren de crudo, afuera 14.000). El portafolio ese día: real 41.113; pruebas 43.100; diferido 902,990 (pozo 41,0; planta 862,0); residuo 182,150; en los cuatro campos de crudo limitan los pozos.

**Quién lo calcula.** Servidor.

**Referencia.** `src/entities/choke-reparto.ts:724-789`; `referencia/choke/serie-{campo}-2026-09.json` (5 casos).

---

### «Cambió lo que limita»

**Qué es.** El aviso (`CambioDominante`, `choke.ts:1651`): solo cuando el tramo nuevo gana **por más del umbral de «casi iguales»** (3 %) y lo sostiene **`diasParaCambio` días seguidos** (3; `PARAMETROS_CHOKE`, `choke.parametros@3`). `dia` es el primero de esos días. `vueltas` cuenta, por campo, los cambios del dominante **sin** ese filtro: lo que pasaría si se avisara cada cambio.

**Ejemplo con los datos del demo.** Con las capacidades de hoy, 13 meses: **0 cambios y 0 vueltas** en los cinco campos (siempre limitan los pozos). Con las capacidades de antes (La Ceiba, tren de crudo 12.000): 1 vuelta en La Ceiba y **ningún aviso** (los pozos y la planta quedan casi iguales), y 129 días con la capacidad superada. Con dos firmas del tren de crudo de La Ceiba (11.500 desde el 1-sep-2025 y 13.500 desde el 1-may-2026), un aviso:

> «Cambió lo que limita en La Ceiba: desde el 1 de may limitan los pozos (12.080 bbl/d); antes, la planta · tren de crudo (11.500). Cambian los equipos que más cuestan si fallan: revise «Si falla hoy».»

**Qué texto.** «Cambió lo que limita en {campo}: desde el {día} {limitan los pozos | limita la planta · tren | limita afuera} (N bbl/d); antes, {el anterior} (M). Cambian los equipos que más cuestan si fallan: revise «Si falla hoy».»

**Casos borde.** El umbral y los días son provisionales hasta que los valide la operadora (5E.11). El comentario de `serieChoke` ya no da una cifra de vueltas (decía que, sin el filtro, La Ceiba cambiaría siete veces en trece meses, y el demo no lo sostenía: 0 vueltas con las capacidades de hoy, 1 con las de antes; 5E·H34): remite a los casos de la serie.

**Referencia.** `src/entities/choke-reparto.ts:715-789`; `referencia/escenarios/cambio-de-limita/serie-ceiba-2026-04-a-2026-05.json`, `tuberia-ceiba.json`; `referencia/escenarios/capacidades-de-antes/serie-ceiba-2026-03.json`, `serie-guacamayo-2026-03.json`.

---

### El mes a mes por tramo

**Qué es.** El reparto por tramo de cada mes del calendario, **con los mismos meses de `serieMensual` del libro** (5A.5) **y el mismo total**: `porTramo`, `noPlaneado` (el escalón del norte por tramo, QA-D4: lo sin identificar va en 0) y `diferido`; `parcial` si el mes no está publicado en todos los campos.

**Ejemplo con los datos del demo** (portafolio, bbl):

| Mes | Diferido | Pozo | Planta | Afuera | No planeado pozo | No planeado planta |
|---|---:|---:|---:|---:|---:|---:|
| oct-2025 | 47.556 | 15.647 | 31.909 | — | 15.647 | 28.865 |
| nov-2025 | 32.103 | 20.781 | 11.322 | — | 20.781 | 11.322 |
| dic-2025 | 48.274 | 17.907 | 30.028 | 338 | 17.907 | 30.028 |
| ene-2026 | 18.328 | 13.198 | 5.129 | — | 12.704 | 5.129 |
| feb-2026 | 32.091 | 29.650 | 2.441 | — | 29.650 | 2.185 |
| mar-2026 | 53.427 | 14.160 | 39.267 | — | 14.160 | 35.754 |
| abr-2026 | 25.953 | 14.504 | 10.635 | 815 | 14.397 | 5.914 |
| may-2026 | 57.150 | 17.967 | 39.183 | — | 17.531 | 39.183 |
| jun-2026 | 29.654 | 19.956 | 9.203 | 495 | 19.604 | 9.203 |
| jul-2026 | 51.029 | 23.614 | 27.219 | 196 | 23.614 | 23.317 |
| ago-2026 | 53.798 | 32.434 | 21.238 | 126 | 32.198 | 19.087 |
| sep-2026 | 33.945 | 24.483 | 9.160 | 303 | 22.991 | 9.160 |
| oct-2026 (parcial) | 2.377 | 1.449 | 573 | — | 1.362 | 573 |

Octubre trae además 355 bbl sin identificar (LC-21 y LC-08). **Σ de lo no planeado de los 13 meses = 462.267,1**, la cifra del norte (5E.4). La Ceiba: agosto 8.522,4 (pozo 956, planta 7.567; no planeado 719 y 6.261), septiembre 7.716,1 (6.676 y 1.041, todo no planeado), octubre 1.046,0 (118 y 573, y 355 sin identificar que no cuenta).

**Referencia.** `src/entities/choke-reparto.ts:675-689`; `referencia/choke/mensual-{campo}.json` y `mensual-portafolio.json`; `referencia/escenarios/correcciones/mensual-portafolio.json`.

---

### La línea base por tramo: antes de TRIM → con TRIM

**Qué es.** La misma base de `lineaBase` del libro (`src/entities/libro.ts:1110`; 5A.6: los tres meses publicados antes del período) repartida por tramo, por día: `noPlaneado` (lo que pide CHOKE-COMPLETO §11) y `diferido`, cada uno `{ baseDia, periodoDia, cambio }` (`cambio = null` sin base). Sin tres meses de historia, no hay base.

**Fórmula.**

$$
\text{cambio}_k = \frac{\text{periodoDía}_k - \text{baseDía}_k}{\text{baseDía}_k}
$$

**Ejemplo con los datos del demo.**

| Campo · período (base) | Tramo | No planeado base → período (bbl/d) | Cambio |
|---|---|---|---:|
| La Ceiba · 1-sep → hoy (jun–ago) | planta | 268,4 → 51,1 | −81,0 % |
| | pozo | 122,4 → 215,1 | +75,8 % |
| La Ceiba · octubre en curso (jul–sep) | pozo | 90,1 → 74,5 | −17,3 % |
| | planta | 259,2 → 361,9 | +39,6 % |
| Portafolio · 1-sep → hoy (jun–ago) | pozo | 819,7 → 771,1 | −5,9 % |
| | planta | 560,9 → 308,2 | −45,1 % |

El total del libro de La Ceiba, misma comparación: 407,5 → 277,4 bbl/d (−31,9 %); del portafolio, 1.461,8 → 1.150,0 (−21,3 %). En La Ceiba desde el 1-sep el diferido sin identificar pasa de 0 a 11,2 bbl/d (no cuenta como no planeado).

**Qué texto.** «En {campo | el conjunto de campos} bajó lo que se trabó {en …} y subió lo de {…}.», o «… lo no planeado no cambió por tramo.». Corridos: «En La Ceiba bajó lo que se trabó en la planta y subió lo de los pozos.»; octubre: «En La Ceiba bajó lo que se trabó en los pozos y subió lo de la planta.»; portafolio: «En el conjunto de campos bajó lo que se trabó en los pozos y en la planta.»

**Quién lo calcula.** Servidor.

**Referencia.** `src/entities/choke-reparto.ts:690-711`; `referencia/choke/base-{campo}-2026-09.json`, `base-portafolio-2026-09.json`; `referencia/escenarios/correcciones/base-ceiba-2026-10.json`.
