# Correcciones F2-B · motor del choke y números

**22-oct-2026 · F2-B.** Marcas de cada hallazgo: **hecho** (archivo y prueba), **decidido distinto** (por qué) o **fuera de alcance** (por qué). Las pruebas nuevas o cambiadas fallan con el motor de `d028202`: se corrió el `verificar-libro.mjs` nuevo contra una copia limpia de ese commit y dio 38 fallas de 433; hoy da 433 de 433.

## Lo que cambió en el motor

- **Archivo nuevo `src/entities/choke-reparto.ts`.** El reparto por tramo y por escalón, la tubería, la serie, el mes a mes, la línea base y la eficiencia ahora salen de las filas de la ANH, con su clasificación vigente.
  - Son las mismas filas del árbol, guardadas en memoria por contexto y por lo guardado.
  - Una escritura solo recalcula los días de los eventos que cambiaron.
  - `choke.ts` conserva los potenciales, los días frente a los tramos (`diasDelCampo`, en memoria) y el escalón de la causa (`escalonDeCausa`).
- **`libro.ts`.** Solo rendimiento: `tramosDe` lee las fechas de los eventos una vez por campo, y no en cada pedido. Mismos tramos y mismo orden. No estaba en ninguna fila; lo toqué porque era el 75 % del costo de `paradasAnh`.
- **`.oxlintrc.json`.** Las pantallas no pueden importar `@/entities/choke-reparto`, igual que `choke-arbol`.
- **`scripts/referencia-diferencias.mjs`.** Es nuevo y contiene la regla de comparación de la referencia (C-08).

## QA-A

| Id | Estado | Qué y dónde | Prueba (`verificar-libro.mjs`) |
|---|---|---|---|
| QA-A-01 | **hecho** | Mismas filas y la misma regla en todas las vistas:<br>· `tramoVigente`, `escalonDeFila`, `esperaTramo` y `filasDelChoke` en `choke-reparto.ts`.<br>· El árbol las usa (`choke-arbol.ts`).<br>· `porConfirmar` ya no cuenta lo que contestó una persona.<br>· «Perdiéndose ahora» y `tramoDeRiesgo` leen la fila de hoy.<br>· Las cinco claves de caché de `shared/api/choke.ts` llevan la versión de lo guardado, y los `pedir*` reciben `guardadas`. | §31.1–5 (LC-11 paso 2, «no recibía», yacimiento, claves de la costura), §30 |
| QA-A-02 / D3 | **hecho** | Para lo que limita, la holgura, lo estructural y la PE, el potencial de los pozos es Σ prueba × `factorMedicion` (`PARAMETROS_CHOKE@2`, 1).<br>· `pozosAsignado` guarda la cifra de Producción.<br>· El agua se pasa a crudo con las mismas pruebas (`choke.ts` y `choke-agua.ts`).<br>· El ⓘ de «Los pozos» va en `fuente` del tramo.<br>Mundo de prueba de QA-A (planta en 10.500): la holgura pasa de 455 a 1.357 y lo estructural de septiembre, de 5.187 a 42.485. | §23, §24, §25, §27 |
| QA-A-03 / D4 | **hecho** | Una sola cifra del norte, el escalón `disponibilidad-no-planeada` por fila:<br>· el árbol (`noPlaneadaBbl`), el mes a mes y la línea base la leen;<br>· lo sin identificar va en 0;<br>· una N2 dicha por una persona decide entre capacidad y no planeada (la evacuación con falla deja de ir a capacidad). | §25, §30, §31 (D4) |
| QA-A-04 / D6 | **hecho** | `criticidad.ts`:<br>· `grupo` medido/techo/sin dato, con puesto solo en lo medido;<br>· LACT-01 y TK-102 sin dato (falta el colchón del tanque de crudo) y C-401 sin dato (a qué pozos cierra);<br>· un respaldo bien = 0, y K-101 con «2 de 3 unidades» vuelve al techo;<br>· La Zarza sin cifras, con `campoDeGas`;<br>· P-201A y P-201C, puesto 1. | §28, §29 |
| QA-A-05 / D5 | **hecho** | `escalonDeCausa` no depende del tramo; `escalonesDe` ya no manda a «sin clasificar» por `ch === null`. | §29 (K-101 «por saber») |
| QA-A-06 | **hecho** | Identidad exacta contra el sistema: potencial del sistema − real = Σ tramo + sin explicar + `brechaPruebas` − estructural.<br>· `cabiaEnHolgura`: lo diferido de los días en que no limitaban los pozos y que no le costó al campo.<br>· `noPlaneadaSistema` es la base de la PE no planeada.<br>· PE + PE no planeada ≤ 100 % (salvo factor de asignación > 1, que lo dice `brechaPruebas` < 0).<br>· Mundo de QA-A: 99,38 % + 0,62 % = 100 %. | §24 |
| QA-A-07 | **hecho** | Escenarios firmados en la referencia: capacidades de antes, cambio de lo que limita (con aviso), empate al barril y correcciones de personas (ver C-29). | `referencia comprobar` |
| QA-A-08 | **hecho** | «Cada falla de P-201B le ha costado en promedio unos 4.593 bbl» (`criticidad.ts`). | §29 |
| QA-A-09 | **hecho** | «Cuando vuelva» se calcula con la mediana del nivel al parar (77,3 % → 2,1 h; antes eran 4 min), con su `costoFalla` (2.371 → 2.252). | §28 |
| QA-A-10 | **hecho (prueba)** · función de F2-A | Conciliación que sí puede fallar: Σ por N1 de las filas = `libro().diferido` en 3 períodos × 6 alcances, y cada N1 de TRIM es la de su fila de `REGLAS_ANH`. `conciliarAnh` sigue en `anh-paradas.ts` (F2-A), que debería compararla contra el libro. | §31 |
| QA-A-11 | **hecho** | El árbol y el reparto toman de cada fila solo sus horas dentro del período (`bblEnPeriodo`). La última hora de La Ceiba da 82 bbl en los dos, como el libro. | §31 |
| QA-A-12 | **fuera de alcance** | Está en `anh-paradas.ts` (F2-A): `fin` y `abiertaAlCorte` del día en curso. El reparto no lo lee: usa `inicio` y `horas`. | — |
| QA-A-13 | **decidido distinto** | U2 es especificación de experiencia: no la toqué. Cifras vivas de hoy: pozos 11.857, le sobran 1.143, Morichal 17.937 / 729, Guacamayo 6.828 / 672. «Antes → con TRIM» sale del motor (`lineaBasePorTramo`). | — |
| QA-A-14 | **decidido distinto** | Convención escrita en `diaCampoDe` (`choke.ts`): un día usa la configuración de su medianoche. Falta la frase en `CONTRATO.md` (F2-A). | §31 (firmada a las 12:00 del 15-sep, rige el 16) |
| QA-A-15 / D7 | **hecho** | Una sola pasada sobre las filas, los días en memoria y el índice de fechas de `libro.ts`. Ver «Rendimiento». | medición abajo |

## QA-C

| Id | Estado | Qué y dónde |
|---|---|---|
| C-08 | **hecho** (puntos 1, 2 y 4) | `scripts/referencia-diferencias.mjs`:<br>· `null` exige `null`;<br>· las claves AUSENTES no pueden venir;<br>· los registros cerrados traen sus claves;<br>· las fechas, con zona.<br>`comparar` acepta `--token=` o `TRIM_TOKEN`, y `--escenario=` para pedir un escenario a la vez. Prueba: §31, con 10 derivas. Con el arnés 12 de QA-C (servidor en arranque) ve las 9 derivas y deja pasar el control. El punto 3 (familia de escrituras) es de F2-A. |
| C-09 | **hecho** | Lo mismo de QA-A-01, también para el paso 4 y las cinco vistas: §31.2. Pendiente de F2-A: el texto de `CONTRATO.md` (`:348` y `:1309`) y la igualdad después de corregir en `verificar-contrato` §12. |
| C-29 | **hecho** | `referencia.mjs`:<br>· `MESES_ANH`, 8 meses-campo que traen las filas que faltaban (parciales, exceso, sin causa, día en curso, tanque, raíz, «se perdió», tratamiento, compresión, aire, energía compartida, motor y lubricación de la línea);<br>· orden `responsable`;<br>· `choke/capacidades-*`;<br>· `comprobar` falla si una fila de `REGLAS_ANH` no tiene caso, salvo las 5 que el demo no puede producir (`SIN_CASO_EN_EL_DEMO`: `linea-variador`, `linea-capacidad`, `energia-frontera`, `programada-con-pareja`, `declarada-chip`). |

## QA-B, parte de motor

| Id | Estado | Qué |
|---|---|---|
| B-06 | **hecho** | D6. Para F2-C: pintar los tres grupos («Sin cifra todavía · techo si cierran todos sus pozos»; «sin dato: {sinDato}») y la frase de La Zarza. |
| B-11 | **hecho** (paso 2) | «P-201B mueve el agua de 18 pozos: el pozo se cerró porque el tanque de agua se llenó con P-201B parada (paró el 2 de oct, 03:52), así que se trabó en la planta»; para MPP-301, la frase equivalente. §22. Los porqués de los pasos 1, 5 y 6 son de `REGLAS_ANH` (`anh-clasificacion.ts`, F2-A). |
| B-12 | **hecho** (motor) | `EquipoBbl.porTipo`: LC-04 = 2.126 de electrosumergible + 135 de energía. §31. Para F2-C: el ⓘ y el nombre en «POR EQUIPO» (que es el Pareto del libro). |
| B-14 | **hecho** | `TuberiaCampo.fraseHoy` y `disponibleHoy.entraBpd/cabeBpd`: «Hoy, con P-201B parada, el agua de la planta deja pasar 178.500 bbl/d y ya entran 174.033: … hasta unos 236 bbl/d de crudo». Por qué «unos 9.050» quedaba bajo «pasa hoy 9.394»: el agua se pasaba a crudo con el factor de asignación y la mezcla de todos los pozos; con D3 son 9.445. §25. |
| B-16 | **hecho** (motor) | «Cabe más agua: 43.675 bbl/d (sin contar la capacidad del tratamiento…)». El empate exacto se dice con los dos nombres y con su porqué: la admisión sin firmar la deduce el demo del cabezal. `TuberiaAgua.empate`. §27. |
| B-17 | **hecho** (motor) | «Si para una con todos los pozos produciendo, faltan 44.100…» y «P-201B está parada desde…: se cerraron LC-07 y LC-16…». §27. La ficha de P-201B es texto fijo del registro (`equipos.ts`, `lectura`): para F2-C, que lo arme desde el motor. |
| B-18 | **hecho** (motor) | En un campo de gas, el agua no se pasa a crudo (`crudoBpd: null`). Sin un tramo de la disposición no se dice que limita (`faltanParaDecir`; «No se puede decir qué limita el agua: falta…»). En «Si falla hoy», `campoDeGas`. §27 y §28. |
| B-22 | **fuera de alcance** | Es de la tarjeta (`widgets/arbol/Tarjeta.tsx`): toma el `inicio` más temprano de las filas del período y escribe «cerraron» sin mirar `parcial`. La hora del evento hay que leerla del evento (o que F2-A la ponga en `ParadaAnh`). |

## Cifras que cambian en pantalla (antes → después)

- Qué limita hoy, La Ceiba: «los pozos (11.360 bbl/d)» → «(11.857)». A la planta le sobran 1.640 → 1.143. Morichal 17.604 → 17.937, le sobran 716 → 729. Guacamayo 6.615 → 6.828, afuera 885 → 672.
- PE: La Ceiba en septiembre, 97,77 % → 94,73 %, y no planeada 2,23 % → 2,16 %. Portafolio en 13 meses, 96,96 % → 95,65 %, y no planeada 2,89 % → 2,85 %.
- No planeado del portafolio en 13 meses:
  - árbol 479.719 → **462.267**;
  - mes a mes 480.856 → **462.267**;
  - el escalón ya era 462.267, así que hoy las tres vistas dan esa cifra;
  - Guacamayo 79.095 → 63.916 y La Zarza 7.780 → 5.507 (sin curtailment).
- «Antes → con TRIM» de La Ceiba: lo sin identificar pasa de 0 → 224 a 0 → 0 bbl/d; los pozos tenían 93 de base y ahora tienen 90.
- «Si falla hoy» de La Ceiba: antes, seis «hasta 9.394» en el puesto 1 y P-201A y P-201C en el 7. Ahora:
  - P-201A y P-201C, puesto 1, con 3.059;
  - luego LC-11 (1.031) y las demás electrosumergibles;
  - los techos (SE-2, V-101, K-101), aparte;
  - LACT-01, TK-102 y C-401, sin dato.
  «Cambió hoy: … subieron al puesto 1». La Zarza: sin cifras.
- Tubería del agua de La Ceiba: «al agua le sobran 43.675» → «cabe más agua: 43.675». A eso se suman la frase del empate y la del «si para» en condicional. El paso a crudo hoy es 9.050 → 9.445.

## Rendimiento (QA-A-15, método de QA-A: Playwright y CDP contra localhost:5173)

| Medición | Antes | Después |
|---|---|---|
| En caliente, Diferidos del jefe, todos los campos, 13 meses, CPU normal | **429 ms** | **235–245 ms** (dos corridas) |
| Lo mismo, CPU frenada 4x | 1.944 ms | 1.026–1.086 ms |
| En frío, Diferidos del jefe, 13 meses: tarea mayor (CPU normal / 4x) | 186 / 849 ms | 103 / 482 ms |
| Resumen del gerente, en caliente (CPU 1x / 4x) | 74 / 375 ms | 0 / 86 ms |

- En Node: `paradasAnh` del portafolio en 13 meses baja de 170 a 48 ms. El árbol, con las filas ya en memoria, de 170 a 6 ms. El mes a mes, de 70 a 7 ms.
- Lo que queda de esos ~240 ms es casi todo dibujo de React en modo de desarrollo: ~90 ms de cálculo y ~150 de dibujo (`jsxDEV` 74 ms, `Rama` 66 ms). Para F2-C: abrir las ramas del árbol solo cuando se piden.

## Referencia (regenerada después de F2-A)

252 casos (antes 195) y 36 insumos (antes 32: se suman los 4 escenarios).

| Familia | Qué cambió y por qué |
|---|---|
| `aciertos`, `asignacion`, `ciclo`, `diaria`, `diferidos`, `mensual`, `prediccion`, `riesgo`, `salud`, `sap`, insumos de los campos y de arranque | Nada. |
| `agua-choke/*` (5) | D3: `crudoBpd` y `crudoPorAgua` salen de las pruebas.<br>Campos nuevos: `campoDeGas`, `empate`, `faltanParaDecir`.<br>Frases de B-16, B-17 y B-18. |
| `anh/paradas-*-2026-09` (4) | `choke.porque.texto` y `porqueChoke.texto` de las filas de P-201B y MPP-301 (B-11).<br>`descEvid.valor` en morichal, portafolio y zarza (F2-A, D2): ya no viaja el texto libre de ZA-06 ni el motivo de los programas PR-VIG.<br>Nada más. |
| `anh/*` nuevos (8) | Los meses y campos de C-29. |
| `choke/reparto-*` (6) | D3: `potencialSistema`, `brechaSistema`, `pe` y `peNoPlaneada`.<br>Campos nuevos: `potencialPruebas`, `brechaPruebas`, `cabiaEnHolgura`, `noPlaneadaSistema` y `porTipo` (B-12).<br>`porChoke` y `porEscalon`, iguales. |
| `choke/tuberia-*` (5) | D3: potencial de los pozos, `fuente`, holguras, `textoCorto` y `frase`.<br>`disponibleHoy` (9.050 → 9.445, más `entraBpd` y `cabeBpd`).<br>`brechaPruebasBpd`, `fraseHoy` y `porTipo`. |
| `choke/serie-*` (5) | D3 en `potenciales.pozos`.<br>Campos nuevos por día: `potencialPruebas`, `brechaPruebas`, `cabiaEnHolgura`.<br>`potencialSistema` con las pruebas. |
| `choke/mensual-*` y `choke/base-*` (12) | `noPlaneado` por tramo = escalón del norte (D4). `porTramo` y `diferido`, iguales. |
| `choke/criticidad-*` (6) | D6 (grupos, puesto, sin dato y gas), QA-A-08 y QA-A-09. |
| `choke/capacidades-*` (5, nuevos) | C-29. |
| `choke-arbol/*-gestion` y `*-circular` de zarza y portafolio (4) | `noPlaneadaBbl` = escalón del norte (D4: la nominación de La Zarza es capacidad). Los demás árboles, iguales. |
| `choke-arbol/*` nuevos (14) | Orden `responsable` y los meses de C-29. |
| `escenarios/*` (30, nuevos) e `insumos/escenarios/*` (4) | QA-A-07 y C-08 punto 4. |

## Para F2-A (contrato)

- **`CONTRATO.md`.**
  - El texto de C-09 (un solo tramo y una sola planeación por barril, identidad sin condición).
  - `noPlaneadaBbl` = escalón del norte.
  - Los campos nuevos de `BrechaChoke`, `TuberiaCampo`, `TramoTuberia.disponibleHoy`, `EquipoBbl.porTipo`, `FilaCriticidad.grupo`, `CriticidadDelCampo.campoDeGas`, `TuberiaAgua` y `PotencialesCampo` (`pozosAsignado`, `factorMedicion`).
  - Un período que no empieza a medianoche ya cuadra (QA-A-11).
  - La convención de QA-A-14.
  - Los escenarios de la referencia y `--escenario` / `--token`.
- **`verificar-contrato.mjs:115`.** Pasar `s.clasificacionesAnh` a `pedirRepartoChoke`, y comprobar §12 después de corregir los pasos 2 y 4.
- **`arbol.ts`.** `useParadasAnh` y `useCalidadAnh` pueden pedir las filas a `filasDelChoke` y ahorrarse la segunda pasada.
- **`conciliarAnh`.** Compararla contra el libro (QA-A-10).

## Para F2-C (pantalla)

- **D4.**
  - Rotular `Libro.noPlaneado` como «No programado (libro)» en Resumen y Mantenimiento.
  - En `DondeSeTrabo`, «lo no planeado de cada tramo» debe leer `porChokeEscalon` del reparto. Hoy su «sin saber» (tramo − no planeado − planeado) metería la capacidad y el desarrollo.
- **D3.** El ⓘ de «Los pozos» (el texto está en `tramos[pozo].fuente`). Producción muestra la cifra con factor y la tubería, la de las pruebas.
- **Tubería.** Mostrar `brechaPruebasBpd`, el cuadre de U2 §2.2.
- **D6.** Los tres grupos de «Si falla hoy».
- **B-14, B-16, B-17 y B-18.** Mostrar `fraseHoy` y `frases`. Poner «◄ limita» solo si `limita`. Sin «≈ de crudo» si `crudoBpd` es null.
- **B-12, B-22.** Ver la tabla de QA-B.
- **e2e.** `choke-produccion.spec.ts:128` espera «al agua le sobran», que ahora es «cabe más agua». `arbol-identificar.spec.ts:23` sigue pasando.
