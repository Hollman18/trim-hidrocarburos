# QA-A · El motor y los números del choke y del árbol de causas

**22-oct-2026 · Auditor adversarial QA-A · commit `d028202`** (sin cambios en el repo: este informe es el único archivo escrito).

Corren en paralelo QA-B (experiencia por rol) y QA-C (contrato, SQL y seguridad). Aquí va solo el motor (`src/entities/choke*.ts`, `criticidad.ts`, `capacidades.ts`, `anh-*.ts`), la costura (`src/shared/api/choke.ts` y `arbol.ts`) y sus cifras.

**Especificación contra la que se audita:** `PLAN-MAESTRO.md`, `CHOKE-COMPLETO.md` (12 piezas, invariantes §14), `CHOKE-CONSTRUCCION.md`, `U2-choke-experiencia.md` §2–§7, `P1-producto.md` §1–§2 y `PENDIENTES-TANDA3.md`.

**Reloj del demo:** 2-oct-2026 14:00 (`AHORA`). «13 meses» = del 1-oct-2025 a hoy. «Portafolio» = los cinco campos.

## Cómo se probó

- Scripts propios, fuera del repo, en `/private/tmp/claude-501/-Users-hollman/0809a9f7-4f6b-4a1e-b5b0-972baa33e07f/scratchpad/qa-a/`. Cargan el motor con el mismo arranque de `scripts/verificar-libro.mjs` (Vite `createServer` + `ssrLoadModule`, insumos del demo). Cada uno se corre con `node <script>`:
  - `p1-potenciales.mjs`: factor de asignación, potenciales de hoy, tubería del agua, orden de cierre y «si falla hoy» de las bombas, **rehechos desde los datos crudos** (`datos/pozos.ts`, `eventos-pozos.ts`, `produccion-diaria.ts`, `paradas-bombas.ts`), sin llamar a `crudoAsignado`, `faDe` ni `potencialesDelCampo` para la cifra propia.
  - `p2-identidades.mjs`: las identidades en 11 períodos × 6 alcances (66 combinaciones) y en los tres órdenes del árbol.
  - `p3-error-conocido.mjs`: el error conocido, con las **escrituras de la sesión demo** (`shared/api/escrituras.ts`) y leído por la costura.
  - `p4-no-planeado.mjs`, `p5-reglas.mjs`, `p6-mismo-numero.mjs`, `p7-bordes.mjs`, `p10-cifras-u2.mjs`, `p12-sin-fa.mjs`.
  - `p8-circular.mjs` y `p11-estructural.mjs`: «mundos de prueba» en memoria (otra instancia de Vite; se recorta el fiscal de La Ceiba a 10.500 bbl/d y se declara esa capacidad). Nada se escribe en disco.
  - `p9-rendimiento.mjs`: Playwright contra `http://localhost:5173`, con CDP (`Emulation.setCPUThrottlingRate`, `Profiler`) y `PerformanceObserver('longtask')`.
- Lo que el script dice va citado con su cifra. Lo que no tiene evidencia dice «sospecha».

## Lo que está bien (y se comprobó, no se supuso)

- **Las cifras de hoy, rehechas desde los datos crudos, son las del motor al barril** (`p1`): factor de asignación de octubre y septiembre de los cinco campos; potencial de los pozos (La Ceiba 11.360, Morichal 17.604, Guacamayo 6.615, El Palmar 3.277), agua de los pozos, planta (el menor de los trenes medidos: La Ceiba 13.000 tren de crudo; Morichal 18.320 agua; Guacamayo 8.000; El Palmar 3.600), afuera, lo que limita, holguras y «casi iguales».
- **La tubería del agua de La Ceiba cuadra entera**: 224.075 bbl/d de agua de los pozos; 3 × 89.250 = 267.750 de bombas y de inyectores; le sobran 43.675; P-201B mueve 74.200 (mediana de su medidor); respaldo 30.100; sin salida 44.100; colchón al parar 1,84 h con el tanque al 78,7 %; orden de cierre 1.426 bbl/d contra 2.236 parejo (LC-02, LC-10, LC-01, LC-17 al 25 %, LC-07 al 12 %). Morichal: 40.400 sin salida, 10,05 h de colchón, 783 contra 1.222.
- **«Si falla hoy» de cada bomba con instrumento es la cifra de su ficha**:
  - el «si se para» de la ficha (`prediccion.crudoBpd`: 1.426 · 783 · 1.600 · 0 bbl/d, con su colchón) es el mismo en «Si falla hoy» y en la tubería del agua;
  - el «una falla ≈» (`costoDeBomba`: Morichal P-201B 1.235, MPP-301 3.245) es el mismo en «Si falla hoy» y en Riesgo;
  - las hermanas sin instrumento (P-201A y P-201C), rehechas aparte, dan lo mismo: 84.783 bbl/d de agua sin salida, 3.059 bbl/d, 2 min de colchón.
- **Las identidades sin correcciones cuadran en las 66 combinaciones** (`p2`): septiembre, octubre en curso, 13 meses, 12 meses, año a la fecha, cinco días sueltos (1 y 2-oct, este parcial; 18-may con la caída de SE-2 en Morichal; 25-mar con dos raíces; 20-ago con el exceso del programa; 31-oct-2025, cruce de mes), cada campo y el portafolio:
  - potencial − real = Σ por tramo + sin explicar, exacto; Σ por tramo = el diferido del libro; sin explicar = el inventario del libro; Σ por escalón = Σ por tramo; ningún mes-campo pasa el 2,5 %;
  - el árbol, en sus tres órdenes: cada nodo = Σ de sus hijos, la raíz = el diferido del libro, el primer nivel de `gestion` = `brechaPorChoke`, Σ por N1 = la conciliación, y Σ por `TipoCausa` de las filas = Σ por tipo del libro;
  - la serie diaria suma el período; los 13 repartos mensuales suman el de 13 meses.
- **Las reglas del choke de una parada se cumplen en los casos reales del demo** (`p5`, sección 3 de este informe).
- **El mismo número en todas las vistas de la costura, mientras nadie corrija nada** (`p6`): tubería, reparto de Diferidos, árbol de gestión, árbol de Regulatorio (orden circular), mes a mes y serie, en septiembre y octubre, en los cinco campos.
- **Los bordes no revientan** (`p7`): período vacío, futuro, invertido, anterior a los datos, una hora; sin campos; un campo que no existe; un campo sin esquema de planta (mundo de prueba sin `CAMPO_PLANTA.palmar`). Ningún `NaN`, ninguna excepción.

## Resumen de hallazgos

**15 hallazgos: 0 bloqueantes, 5 altos, 4 medios y 6 bajos.** Ninguno bloquea la demostración. Los cinco altos tocan la cifra del norte o lo que el gerente lee.

| Id | Sev. | Qué | Dónde |
|---|---|---|---|
| QA-A-01 | **alto** | El error conocido, confirmado y medido: corregir el paso 2 (o contestar «el oleoducto no recibía», o poner «En el yacimiento») mueve el árbol y no la tubería, el reparto, la serie, el mes a mes ni la frase del gerente. En el navegador, el gerente lee «87 % en los pozos» encima de ramas que dicen 61 % en la planta | `choke.ts:1140, 1689`; `shared/api/choke.ts:113–216` |
| QA-A-02 | **alto** | El potencial de los pozos lleva el factor del mes, que sale de lo real: con la planta limitando de verdad, esconde dos tercios de la restricción (holgura 455 en vez de 1.357 bbl/d; lo estructural 5.187 en vez de unos 40.700 bbl al mes; PE 99,4 %) | `choke.ts:885` |
| QA-A-03 | **alto** | El indicador del norte («no planeado») tiene cuatro cifras distintas en pantalla (portafolio, 13 meses: 480.299 · 479.719 · 462.267 · 480.856). Tres meten el curtailment (15.179 bbl de Guacamayo) | `libro.ts`, `choke-arbol.ts:246`, `choke.ts:1188, 1569` |
| QA-A-04 | **alto** | «Si falla hoy» pone seis equipos compartidos empatados en el puesto 1 con todo el campo (C-401, K-101, LACT-01, SE-2, TK-102, V-101). U2 §6.3 pide «sin dato» para LACT-01 y C-401, y P-201A en el puesto 3 (sale 7) | `criticidad.ts:234-260` |
| QA-A-05 | **alto** | «Todavía no sé» saca esos barriles del indicador del norte: K-101 «por saber» baja la PE no planeada de La Ceiba de 3,23 % a 2,85 % | `choke.ts:1025` |
| QA-A-06 | medio | Con la planta limitando, la identidad de CHOKE-COMPLETO §6 (contra el potencial del sistema) no cuadra por lo estructural, y PE + PE no planeada pasa de 100 % | `choke.ts:1170-1191` |
| QA-A-07 | medio | La referencia del choke no tiene ningún caso con la planta o afuera limitando, empate, estructural ni correcciones (§14.9) | `referencia/choke*` |
| QA-A-08 | medio | «Hoy cada falla de P-201B cuesta unos 2.765 bbl» (gerente) contra «una falla ≈ 1.235» (Riesgo y «Si falla hoy») | `criticidad.ts:362-364` |
| QA-A-15 | medio | Cálculos de más de 300 ms en el hilo principal: 412 ms con la CPU normal (Diferidos del jefe, todos los campos, 13 meses); hasta 970 ms en frío y 1,7 s en caliente con la CPU frenada 4x | §5 |
| QA-A-09 | bajo | «Cuando vuelva, si falla otra vez» se calcula con el colchón de ahora (4 min) | `criticidad.ts:169-188` |
| QA-A-10 | bajo | La conciliación Σ por N1 = Σ por `TipoCausa` es una tautología: no puede fallar | `anh-paradas.ts:334-346` |
| QA-A-11 | bajo | En un período que no empieza a medianoche, la raíz del árbol no es el diferido del libro (81,92 contra 791,96 bbl) | `anh-paradas.ts:183` |
| QA-A-12 | bajo | Las filas del día en curso llevan «Continúa al corte del día» y un fin en el futuro | `anh-paradas.ts:213-214` |
| QA-A-13 | bajo | U2 desactualizado: La Ceiba planta 12.000 / «le sobran 640»; el motor dice 13.000 / 1.640 | U2 §1, §2.2, §2.9, §6.5, §7.3 |
| QA-A-14 | bajo | Una capacidad firmada a mitad del día rige desde el día siguiente, y no está escrito | `choke.ts:976` |

**Los cinco más graves**, en orden: QA-A-01, QA-A-03, QA-A-02, QA-A-05 y QA-A-04. El arreglo de QA-A-01 (el reparto sobre las mismas filas del árbol) resuelve también lo que comparte con QA-A-03 y QA-A-15.

## 1. El error conocido: el reparto por tramo no lee lo que corrigen las personas

### QA-A-01 · ALTO · Corregir el paso 2 mueve el árbol y no mueve la tubería, «Por dónde se trabó», la serie, el mes a mes ni la frase del gerente

**Dónde:**
- `src/entities/choke.ts:1140`: `brechaPorChoke` toma el tramo de cada tramo del libro con `chokeDeTramo` → `chokeDeCausa` (la regla, nunca lo guardado). Lo mismo `serieChoke` (`:1689`), y por ellas `tuberiaCampo` (`:1452`), `repartoPorMes` (`:1586`) y `lineaBasePorTramo` (`:1610`). «Perdiéndose ahora» por tramo (`perdiendoPorTramo`, `:1341`; `tramoDeRiesgo`, `:1366`) tampoco.
- `src/entities/choke-arbol.ts:170`: el árbol sí usa el paso 2 vigente (`c.choke?.valor ?? sugerido`). Su propio comentario lo admite (`:30-31`: «`brechaPorChoke` todavía no lee lo guardado (pendiente)»), y `CONTRATO.md` (fila de `/vistas/choke/arbol`) lo deja escrito como salvedad: «mientras nadie haya corregido el paso 2».
- `src/shared/api/choke.ts:113, 127, 190, 197, 216`: las claves de caché de `useTuberia`, `useSerieChoke`, `useRepartoChoke`, `useRepartoMensual` y `useBaseChoke` no llevan la versión de `clasificacionesAnh` (la de `useArbolChoke`, `:206`, sí). Aunque el motor la leyera, la pantalla no la pediría de nuevo.

**Cómo reproducirlo:** `node /private/tmp/claude-501/-Users-hollman/0809a9f7-4f6b-4a1e-b5b0-972baa33e07f/scratchpad/qa-a/p3-error-conocido.mjs`. Usa las escrituras de la sesión demo y lee por la costura (`pedirRepartoChoke`, `pedirTuberia`, `pedirSerieChoke`, `pedirRepartoMensual`, `pedirArbolChoke`), como las pantallas.

**Lo esperado:**
- U2 §0, principio 6: «La misma cifra arriba de todas las vistas… Un número que cambia según la pantalla no se cree».
- CHOKE-COMPLETO §14.3: «Σ brecha por choke = Σ por causa dentro del choke, exacto».
- U2 §4.3: corregir el paso 2 «Las {n} filas cambian juntas».

**Lo que pasa, con tres casos reales:**

| Caso | Escritura | Árbol (ramas) | Reparto, tubería, serie y mes a mes |
|---|---|---|---|
| LC-11, La Ceiba, septiembre (3.677 bbl, «El variador disparó por desbalance de fases») | `clasificarParada({rolId:'sup'}, 'EP-LC11-260925-40@2026-09-26#2', {pasos:{choke:'planta'}, aplicarAlEvento:true})` → `ok`, paso 2 «planta» (corregido) | pozo **2.998** · planta **4.718** | pozo **6.676** · planta **1.041** (igual que antes) |
| Guacamayo, 13 meses: «¿El oleoducto o el cliente estaba recibiendo?» → «No, no recibía» en los 29 eventos de LACT-01 (127 filas, 15.179 bbl) | `responderPreguntaAnh({rolId:'conf'}, …, {pregunta:'tanques' → 'oleoducto', opcion:'No, no recibía', aplicarAlEvento:true})` × 29 | planta **0** · afuera **15.179** | planta **15.179** · afuera **0**; «por confirmar» sigue en **19.052** bbl |
| MN-23, Morichal (baja carga), «En el yacimiento» con la prueba del pozo | `declararYacimientoAnh({rolId:'conf'}, 'EP-MN23-260905-79@2026-09-06#2', {evidencia:'prueba', aplicarAlEvento:true})` | yacimiento **761** | yacimiento **0**; escalón «desarrollo» 0; la PE no planeada sigue en 3,5 % |

En pantalla se ve en el mismo panel:
- `widgets/diferidos/PorTramo.tsx:219` pinta el renglón del tramo con el reparto y `:246` abre debajo las ramas del árbol: después de corregir LC-11, «En el pozo 6.676» se abre en ramas que suman 2.998. Y un tramo que el reparto deja en 0 (afuera, en Guacamayo) no se puede abrir (`conRamas` exige `v >= 0.5`): los 15.179 bbl del árbol quedan sin renglón.
- `widgets/resumen/DondeSeTrabo.tsx` (gerente): la barra, la cifra y la frase salen del reparto («La Ceiba: 87 % en los pozos (LC-11, LC-04)») y, en el mismo bloque, «lo no planeado de cada tramo» sale del árbol: «En el pozo 2.998 · En la planta 4.718». Con la corrección, lo correcto sería «61 % en la planta»: **la frase del gerente dice lo contrario de las ramas que tiene debajo.**

**En el navegador** (`p13-navegador-error.mjs` y `p13b-capturas.mjs`): la escritura se hizo en la misma página, con el módulo `escrituras.ts` de la aplicación, sobre http://localhost:5173. Las capturas están en `/private/tmp/claude-501/-Users-hollman/0809a9f7-4f6b-4a1e-b5b0-972baa33e07f/scratchpad/qa-a/p13-gerente-donde-se-trabo.png` y `/private/tmp/claude-501/-Users-hollman/0809a9f7-4f6b-4a1e-b5b0-972baa33e07f/scratchpad/qa-a/p13-jefe-por-tramo.png`.
- **Gerente**, Resumen de La Ceiba, septiembre. El mismo bloque dice:
  - «pozos 6.676 · planta 1.041 bbl · 635 por confirmar» y «La Ceiba: 87 % en los pozos (LC-11, LC-04)»;
  - y justo debajo, «en los pozos 2.998 bbl · no planeado 2.998 (100 %) · LC-11, LC-04» y «en la planta o estación 4.718 bbl · P-201B». LC-11 sigue nombrado en los pozos, aunque sus barriles ya están en la planta.
- **Jefe**, Diferidos de La Ceiba, septiembre: el renglón «En los pozos 6.676 · 87 %» se abre en «No planeada 2.998 · 100 %»; el renglón «En la planta o estación 1.041» tiene ramas que suman 4.718.

**Cuánto pesa:** cualquier corrección del paso 2 o del yacimiento, y toda respuesta que fije el tramo. Solo lo que hoy espera a una persona son **34.356 bbl** en 13 meses (`porConfirmar` del portafolio), de ellos 15.179 los del tanque de crudo de Guacamayo.

**El arreglo exacto:**
1. **Un solo reparto, sobre las mismas filas del árbol.** `brechaPorChoke` (y con ella `serieChoke`, `tuberiaCampo`, `repartoPorMes`, `lineaBasePorTramo`) recibe `guardadas?: ReadonlyMap<string, BorradorClasificacion>` y suma sobre `paradasAnh(campoIds, desde, hasta, ctx, { guardadas })`:
   - tramo de cada fila = `p.clasificacion.choke?.valor ?? p.propuesta.sugerido.choke ?? 'sin-asignar'` (la misma expresión de `choke-arbol.ts:170`; conviene exportarla, por ejemplo `tramoVigente(p)`, y que el árbol la use);
   - barriles = `p.diferidaTrimBbl` (ya probado: Σ = el diferido del libro en todo período que empieza a medianoche, ver QA-A-11);
   - equipo = el `elemento` de `chokeDeCausa` (como hoy).

   No se puede hacer por tramo del libro: una corrección puede estar guardada por fila (un día, o el exceso de un programa) y un tramo del libro cruza días. Como `choke.ts` no puede importar `anh-paradas.ts` (ciclo), la suma va en un módulo nuevo (por ejemplo `choke-reparto.ts`) o en `choke-arbol.ts`, que ya importa los dos.
2. **El escalón también sale de la clasificación vigente** de la fila: paso 2 `reservorio` → `desarrollo`; paso 4 `planeada` → `disponibilidad-planeada`; fila de exceso → `disponibilidad-no-planeada`; si no, la regla de hoy (`escalonesDe`). Así un «En el yacimiento» sale de la PE no planeada (hoy no sale).
3. **`porConfirmar`** = Σ de las filas cuyo paso 2 no está avalado y sigue en falta o con la pregunta del motor sin contestar (`chokeConPregunta`, `anh-clasificacion.ts:1039`). Hoy cuenta lo que ya contestó una persona.
4. **Costura:** `versionDe(clasificacionesAnh)` en la clave de las cinco vistas, y `pedir*` reciben lo guardado como `pedirArbolChoke`. El simulador (`simulador-api/`) y `CONTRATO.md` igual: borrar la salvedad «mientras nadie haya corregido el paso 2» y escribir el cuadre sin condición.
5. **Pruebas:** en `verificar-libro` §30, después de `declararPaso(…'choke','planta'…)` comparar el primer nivel del árbol con `brechaPorChoke(..., { guardadas })` (hoy solo se mira que el árbol se mueva). En `referencia/`, un caso con `guardadas` (ver QA-A-07).

## 2. Los números del modelo

### QA-A-02 · ALTO · El potencial de los pozos lleva el factor de asignación, que sale de lo que ya pasó por la planta: lo que limita se mide con una cifra que trae puesto el efecto de lo que limita

**Dónde:** `src/entities/choke.ts:885` (`pozos += crudoAsignado(p, t)`, prueba vigente × factor del mes); `src/entities/libro.ts:224` y `calcCampo` (el factor = fiscal ÷ teórico del mes). De esa cifra salen lo que limita, la holgura, lo estructural (`diasDelCampo`, `choke.ts:977-985`), la PE y la PE no planeada.

**Cómo reproducirlo:** `node …/qa-a/p8-circular.mjs`. Arma en memoria un mundo de prueba donde la planta de La Ceiba deja pasar de verdad 10.500 bbl/d: recorta el fiscal de septiembre y octubre a 10.500 y declara esa capacidad del tren de crudo. `p12-sin-fa.mjs` hace la misma cuenta con el demo tal cual.

**Lo esperado:**
- CHOKE-COMPLETO §3: «Pozo (incluye reservorio para el potencial): Σ de las pruebas vigentes de los pozos en condición óptima, con el levantamiento incluido». Sin factor.
- §0: el choke tiene que encontrar el estrecho; «Aumentar la capacidad de un tramo que no es el estrecho no da ni un barril».

`CHOKE-CONSTRUCCION.md` (tanda 1, E1) y U2 §11.2 decidieron «× factor, la misma base del libro». **La especificación se contradice**, y la decisión de E1 tiene consecuencias.

**Lo que pasa:**
- En el mundo de prueba, el factor de septiembre baja de 0,97 a **0,90** (el fiscal ya no puede pasar de 10.500), y con él el potencial de los pozos: **10.955** en vez de 11.857 (Σ de las pruebas).
  - El motor sí dice «limita la planta», pero con una holgura de los pozos de **455 bbl/d** en vez de **1.357**: dos tercios de la restricción desaparecen.
  - Lo estructural de septiembre sale en **5.187 bbl** en vez de unos **40.700** (1.357 × 30).
  - La PE queda en **99,38 %** con la planta frenando al campo un 11 %.
  - Los diferidos también se abaratan: 7.716 → 7.133 bbl, porque cada evento se valora al 0,90.
- En el demo tal cual (factor 0,96–0,99) ningún veredicto cambia, pero las holguras sí: La Ceiba 1.640 (14,4 %) con factor contra 1.143 (9,6 %) sin él; Guacamayo 885 contra 672. En Morichal, donde limita el agua, el factor se cancela (716 contra 729): el agua pasada a crudo usa la misma relación.

**El arreglo:** para lo que limita, la holgura, lo estructural y la PE, el potencial de los pozos es Σ de la prueba vigente (CHOKE-COMPLETO §3), o × un factor de medición fijo y firmado (el sesgo del separador de prueba contra el fiscal, medido en días sin restricción). Nunca el factor del mes, que sale de lo real. El libro sigue valorando el diferido con su factor: son dos preguntas distintas («cuánto pudo dar el pozo» contra «cuánto se asigna»). Y se dice en el ⓘ de «Los pozos».

### QA-A-03 · ALTO · El indicador del norte («no planeado») tiene cuatro cifras distintas en pantalla

**Dónde:**

| Cifra | De dónde sale | Dónde se ve |
|---|---|---|
| `Libro.noPlaneado` | diferido − programadas (`libro.ts`) | Resumen «Eficiencia sin programadas» y «No planeado» (`pages/Resumen.tsx:54, 73`); Mantenimiento «No programado» (`pages/Mantenimiento.tsx:150`) |
| `NodoArbol.noPlaneadaBbl` | paso 4 vigente = `no-planeada` (`choke-arbol.ts:246`) | gerente «lo no planeado de cada tramo» (`widgets/resumen/DondeSeTrabo.tsx:91-105`); ramas del árbol (`widgets/choke/Ramas.tsx:109`) |
| `peNoPlaneada` y el escalón | escalón `disponibilidad-no-planeada` (`choke.ts:1188`, `escalonesDe` `:1023`) | «lo no planeado se llevó» (`widgets/choke/Escalera.tsx:36`); «POR QUÉ NO SE PRODUJO» de Diferidos (`PorTramo.tsx`) |
| `noPlaneadoPorTramo` | Σ por tramo − lo planeado (`choke.ts:1569-1570`) | «mes a mes» (`widgets/choke/Mensual.tsx:72`); «antes → con TRIM» por tramo del gerente (`DondeSeTrabo.tsx:165-186`) |

**Cómo reproducirlo:** `node …/qa-a/p4-no-planeado.mjs`.

**Lo esperado:**
- CHOKE-COMPLETO §7: «el indicador del norte (bbl por paradas no planificadas de equipos críticos) sale limpio, sin mezclarse con declinación, curtailment ni levantamiento mal ajustado».
- U2 §7.3: «antes → con TRIM» va con «la brecha de disponibilidad no planeada por choke».
- PLAN-MAESTRO §3, métricas: «Un número igual en todas partes».

**Lo que pasa (bbl):**

| Alcance | Libro | Árbol | Escalón (norte) | Σ tramo − planeado |
|---|---|---|---|---|
| Portafolio, 13 meses | 480.299 | 479.719 | **462.267** | 480.856 |
| Guacamayo, 13 meses | 79.095 | 79.095 | **63.916** | 79.095 |
| La Zarza, 13 meses | 7.780 | 7.780 | **5.507** | 7.780 |
| La Ceiba, octubre | 1.046 | **691** | 691 | 1.046 |
| Portafolio, septiembre | 32.560 | 32.453 | **32.151** | 32.560 |

- El árbol, el mes a mes y «antes → con TRIM» meten en «no planeado» el despacho limitado por la nominación del oleoducto (15.179 bbl de Guacamayo) y la nominación del comprador (2.273 de La Zarza). Eso es capacidad, curtailment: lo que §7 dice que no se mezcla.
- En Guacamayo, «antes → con TRIM» de la planta es **42,4 bbl/d de base, 100 % capacidad y 0 de falla**: la flecha que el gerente lee como «paradas no planeadas» es curtailment.
- `DondeSeTrabo.tsx:86` dice en su ⓘ que lo sin causa «va aparte, sin contarse como planeado ni como no planeado». En el mismo bloque, «antes → con TRIM» lo cuenta como no planeado: sin identificar **0 → 11,2 bbl/d** en el portafolio.
- `escalonesDe` manda a «capacidad» toda causa `evacuacion` (`choke.ts:1037`), también si fallara el LACT o la bomba de despacho. El árbol la manda a «no planeada» (`REGLAS_ANH`, fila `evacuacion`). Las dos no se pueden tener a la vez.

**El arreglo:**
- Una sola cifra del norte en el motor: el escalón `disponibilidad-no-planeada`, calculado por fila con la clasificación vigente (QA-A-01).
- Que la lean las cuatro vistas: `noPlaneadoPorTramo` pasa a `porChokeEscalon[k]['disponibilidad-no-planeada']`; el gerente lee lo mismo; la ANH (paso 4) se queda en Regulatorio con su rótulo.
- `Libro.noPlaneado` se rotula «no programado (libro)».
- Lo sin identificar no se cuenta como no planeado en ninguna.

### QA-A-04 · ALTO · «Si falla hoy» pone seis equipos compartidos empatados en el puesto 1 con todo el campo: contra U2 §6.3 y contra el invariante 7

**Dónde:** `src/entities/criticidad.ts:234-260` (`deServicio`: Σ del crudo de los pozos que producen y dependen del equipo; «estimación, un techo») y `:291`.

**Cómo reproducirlo:** `node …/qa-a/p1b-ranking.mjs`.

**Lo esperado:**
- U2 §6.3, La Ceiba hoy: #1 K-101 9.394, #2 SE-2 9.394, **#3 P-201A** 3.059…
  - **LACT-01**: «┄ sin dato: falta el colchón del tanque de crudo».
  - **C-401**: «┄ falta saber a qué pozos cierra · ┄ sin dato».
  - H-302: 0 mientras el respaldo esté bien.
- CHOKE-COMPLETO §10: «Ese orden decide dónde va el vigía, qué rutas predictivas van primero y qué repuesto se pide ya».
- §14.7: «Una falla en un tramo con holgura cuesta 0 bbl/d hasta que la holgura se agota».

**Lo que pasa:**
- La Ceiba: **#1 empatados, con 9.394 bbl/d cada uno: C-401, K-101, LACT-01, SE-2, TK-102 y V-101.** P-201A y P-201C bajan al **puesto 7** («Cambió hoy: P-201A y P-201C subieron al puesto 7…»; U2 dice 3).
- Morichal: los mismos seis con 16.920. En la lista del portafolio (`criticidad(TODOS)`), los 12 primeros son esos servicios de Morichal y La Ceiba.
- K-101 tiene «3 unidades (N+1)» y TK-102 «respaldo TK-101»: se marcan «techo», pero quedan en el puesto 1. Por el invariante 7 costarían 0 mientras la redundancia aguante.
- LACT-01 y C-401 salen con número donde U2 pide «sin dato».
- La Zarza, campo de gas: su P-201B entra en el puesto 7 con 3.159 bbl/d de condensado, y su lista se mezcla con la del crudo en el ranking del portafolio.
- H-302 sí sale en 0 «mientras el respaldo esté bien»: el patrón correcto ya existe.

**El arreglo:**
- LACT-01, TK-102 y C-401 → `bpd: null`, con el motivo de U2 §6.3, hasta tener el colchón del tanque de crudo o los pozos que cierra el compresor.
- Un equipo con redundancia declarada (N+1, respaldo) → 0 «mientras el respaldo esté bien», como H-302.
- Las estimaciones («techo») en su propio grupo, después de las cifras medidas, para que no corran el puesto de lo medido.
- Los campos de gas, marcados o fuera del ranking global.

### QA-A-05 · ALTO · «Todavía no sé» saca esos barriles del indicador del norte

**Dónde:** `src/entities/choke.ts:1025`: `if (c.tipo === 'pendiente' || !ch) return [['sin-clasificar', t.bbl]]`. Un equipo «por saber» da `ch === null` (`:675`), y sus barriles pierden el escalón aunque la causa se conozca.

**Cómo reproducirlo:** `node …/qa-a/p10-cifras-u2.mjs`, que firma `topologiaPorSaber: [{ elemento: 'K-101', campoId: 'ceiba' }]`.

**Lo esperado:**
- CHOKE-COMPLETO §7: «Cada barril de brecha lleva su escalón además de su choke». Son dos ejes.
- U2 §8.2 / PENDIENTES: «el motor no adivina» el tramo. Nada dice que se pierda si fue planeada.

**Lo que pasa:** La Ceiba, 13 meses:
- disponibilidad no planeada **143.867 → 126.589 bbl** (−17.278);
- sin clasificar 592 → 17.869;
- **PE no planeada 3,23 % → 2,85 %**;
- el árbol sigue diciendo 143.867 no planeado.

Que el administrador conteste honestamente «Todavía no sé» sobre la topología de K-101 se lee como una mejora del norte. Es el riesgo de PLAN-MAESTRO §7: «Afirmar una reducción que no existe».

**El arreglo:** en `escalonesDe`, solo `pendiente` (y la declaración en texto libre) va a «sin clasificar». Con `ch === null` y causa conocida, el escalón sale de la causa: falla → no planeada; evacuación → capacidad; programada → planeada. El tramo sigue en «sin identificar».

### QA-A-06 · MEDIO · Con la planta limitando, la identidad de CHOKE-COMPLETO §6 no cuadra, y «lo no planeado se llevó» pasa de lo que falta para el 100 %

**Dónde:** `src/entities/choke.ts:1170-1191` (`cifras`). La brecha se reparte con los barriles del libro (a tasa de pozo) y la PE se mide contra el potencial del sistema.

**Cómo reproducirlo:** `node …/qa-a/p11-estructural.mjs` (el mundo de prueba de QA-A-02). Con el demo, firmando el tren de crudo de La Ceiba en 11.000 (`p7-bordes.mjs`), sale «Qué limita hoy: la planta · tren de crudo (11.000 bbl/d)», con 2.032 bbl estructurales en septiembre.
- La revisión de la firma frena ese 11.000, porque ya pasaron 11.683.
- Pero esa misma regla, junto con QA-A-02, hace que en el demo la planta casi no pueda limitar: lo máximo que ya pasó (11.683) queda por encima del potencial de los pozos con factor (11.360).
- En un campo donde la planta limita de verdad, el máximo que pasó es la capacidad, y la firma pasa. Es el mundo de prueba.

**Lo esperado:**
- CHOKE-COMPLETO §6: «Potencial del sistema − Producción real = Σ brecha por choke», más lo sin explicar.
- §8: «lo que falta para el 100 % es la suma de brechas por choke y por escalón, más lo sin explicar».
- §14.7: «una falla en un tramo con holgura cuesta 0».

**Lo que pasa** (septiembre del mundo de prueba):
- potencial del sistema − real = **1.946** bbl, pero Σ por tramo + sin explicar = **7.133**: difieren en **5.187**, que es lo estructural;
- **PE 99,38 % y PE no planeada 2,26 %**: la suma pasa de 100 %;
- de 6.171 bbl «en el pozo» en días en que limitaba la planta, **1.387** cabían en la holgura de los pozos y no le costaron nada al sistema.

En el demo de hoy no se ve porque los pozos limitan todos los días.

**El arreglo:** en los días en que no limitan los pozos, una parada de pozo cuesta al sistema solo lo que pasa de la holgura de ese día. El resto va a un renglón «no le costó al campo (cabía en la holgura)», o al menos la identidad se escribe y se prueba contra el potencial del sistema: Σ por tramo + sin explicar − estructural = potencial del sistema − real. La PE no planeada se calcula sobre la misma base, y sale un caso de referencia con la planta limitando (QA-A-07).

### QA-A-07 · MEDIO · Los casos de referencia del choke no cubren lo que pide CHOKE-COMPLETO §14.9

**Dónde:** `referencia/choke/*.json`, `referencia/choke-arbol/*.json`, `referencia/agua-choke/*.json` (195 casos en `referencia/indice.json`).

**Cómo reproducirlo:** buscar `dominante` distinto de `pozos`, `empate: true` o `estructural` mayor que cero en `referencia/choke/serie-*` y `reparto-*`: no hay ninguno. `verificar-libro` §24 lo confirma: «limitan los pozos en los 13 meses».

**Lo esperado:** §14.9: «un campo por cada dominante (pozo, planta-agua, exportación), una cascada, un empate, una parada parcial, un exceso de parada planeada y el modelo de inyección de La Ceiba».

**Lo que pasa:**
- Desde que C1 corrigió las capacidades (21-oct), los cinco campos limitan por pozos todo el período.
- No hay referencia con la planta o afuera limitando, con empate, con lo estructural, con el real por encima de la capacidad (`superado`) ni con un árbol con correcciones.
- Un backend que calcule mal lo que limita, lo estructural, la PE o el reparto con lo guardado pasa la referencia.
- Las de cascada, parcial, exceso y agua sí están.

**El arreglo:** escenarios firmados en la referencia, las mismas capacidades de `conCapacidadesDeAntes` de `verificar-libro` (La Ceiba crudo 12.000, Guacamayo afuera 6.800 y crudo 7.400): planta y afuera limitando, `superado`, «casi iguales». Más un empate al barril y un árbol y un reparto con `guardadas` (una corrección del paso 2 y una respuesta «No, no recibía»).

### QA-A-08 · MEDIO · «Hoy cada falla de P-201B cuesta unos 4.593 bbl» no es la cifra de «Si falla hoy · una falla ≈»

**Dónde:** `src/entities/criticidad.ts:362-364`: `desembotellarDe` usa `historialDeEquipo().bblPorFalla`, el promedio de lo que ya costaron sus fallas. «Si falla hoy» y Riesgo usan `costoDeBomba` (`diferido.ts:507`), con el colchón de hoy.

**Cómo reproducirlo:** `node …/qa-a/p6-mismo-numero.mjs`.

**Lo esperado:**
- U2 §6.3: «Una falla le cuesta ≈ … es la cifra "si falla hoy ≈ bbl" de Riesgo».
- U2 §6.5 justifica la cifra como «le ha costado en promedio».
- PLAN-MAESTRO §3: un número igual en todas partes.

**Lo que pasa:**
- Morichal P-201B: el gerente lee «Hoy cada falla de P-201B cuesta unos **2.765** bbl». Riesgo y «Si falla hoy» dicen «una falla ≈ **1.235** bbl».
- La Ceiba P-201B: **4.593** contra **2.371**.

**El arreglo:** el texto del motor dice «le ha costado en promedio X bbl por falla» (es historia). O usa `costoFalla` si quiere decir «hoy».

## 3. Las reglas del choke de una parada, con casos reales

`node …/qa-a/p5-reglas.mjs`, sobre las **2.308 filas de la ANH** del portafolio en 13 meses. Antes de nada: **fila por fila, el tramo del árbol es el de `chokeDeCausa`** (0 distintas, sin correcciones).

| Regla (CHOKE-COMPLETO §5; P1 §2.1; U2 §4.4) | Caso real del demo | Resultado |
|---|---|---|
| Cascada: todas con la raíz | 56 raíces con filas en cascada. SE-2 de Morichal el 18-may: 41 pozos, 26.215 bbl en 3 días operacionales, todas «planta», elemento SE-2. 25-mar-2026: P-201B cierra 3 pozos y K-101, 49 min después, 15 (LC-02 cae aparte por su propia baja tensión) | ✓ ninguna raíz con tramo o elemento distinto entre sus filas |
| Electrosumergible dedicada → pozo | 913 filas | ✓ todas «pozo» |
| Bomba de la línea → planta | 191 filas (P-201B, MPP-301) | ✓ |
| Baja tensión de un solo pozo → pozo, con pregunta | 112 filas. LC-05 el 1-oct (118 bbl); LC-04, LC-12 y LC-06 en septiembre (239 bbl, la cifra de U2 §4.4). Si caen varios a la vez → planta: 538 filas, 8 raíces | ✓ con «¿De dónde vino el corte?». Si el operador contesta «Del campo», el paso 2 pasa a planta como `declarado` (rol oper, sin avalar): el árbol lo mueve y el reparto no (QA-A-01) |
| ZA-06 → afuera, mercado | 11 filas declaradas de La Zarza. ZA-06: exportación, subnivel mercado, `ext-transportador`, `NP_TRANSP/restriccion-nominacion-entrega`, escalón capacidad, estado `propuesta` | ✓ |
| Tanque de agua lleno → planta | LC-16 el 2-oct: causa P-201B (reinyección), planta, `NP_PROC/parada-estacion-bombeo-afecta-pozos` (la cadena de U2 §4.1) | ✓ |
| Tanque de crudo lleno → planta con pregunta | Guacamayo, LACT-01: 127 filas, sugerido planta, faltan responsable, tramo, N1 y N2 | ✓; la respuesta no llega al reparto (QA-A-01) |
| Parcial (frecuencia bajada) | 196 filas: Guacamayo LACT-01, 15.179 bbl (planta); Morichal C-401, 2.722 (planta). Fracción 0,20 a 0,25 | ✓ el tramo sigue el origen. El escalón «desempeño» no sale nunca (0 bbl en 13 meses): el demo no tiene una frecuencia bajada por causa del propio pozo, así que la regla no tiene caso |
| Exceso de una parada programada | 6 filas: P-201B de Morichal el 17-feb y de La Ceiba el 20-ago. Tramo planta, no planeada, faltan responsable, N1 y N2 | ✓ el exceso de agosto es 217,27 bbl en el árbol y en el escalón. Lo planeado es 1.306,09 en los dos, contra 1.523,36 de `Libro.planeado` (QA-A-03) |
| Abierta al corte | 1.095 filas cruzan una medianoche. LC-21 (1-oct 18:20, sin causa): una fila del 1-oct hasta las 23:59:59 (71 bbl) y otra del 2-oct (175 bbl), sin tramo | ✓; las del día en curso, ver QA-A-12 |
| «Todavía no sé» → falta | K-101 firmado «por saber»: 140 filas sin tramo, con la pregunta «¿Dónde se originó la parada…?». Árbol = tubería en «sin identificar» (17.632 bbl) | ✓ el tramo; ✗ el escalón (QA-A-05) |
| Campo de gas | La Zarza: tubería «campo de gas», sin lo que limita. El reparto va en barriles de condensado: «La Zarza: 71 % en la planta (C-401, SE-2)» en 13 meses | ✓ en la tubería; ✗ en «si falla hoy» (QA-A-04) |
| El yacimiento nunca sale de una señal | 0 filas con «reservorio» propuesto | ✓ |
| Programada → el equipo intervenido | 31 filas. LC-19, PA-03, PA-05, MN-16 y MN-05 → pozo; P-201B y MPP-301 → planta | ✓ |

## 4. Otros hallazgos (bajos)

### QA-A-09 · BAJO · «Cuando vuelva, si falla otra vez» se calcula con el colchón de ahora

**Dónde:** `criticidad.ts:169-188` (`deBomba`) toma `costoDeBomba` con `prediccion().colchon`. Para P-201B ya parada, ese colchón es el del tanque hoy, al 89,6 %: 0,07 h.

**Lo que pasa:** la fila de La Ceiba dice «Cuando vuelva, si falla otra vez: 1.426 bbl/d» y lleva `costoFalla` **2.371** bbl, calculado con 4 minutos de colchón. U2 §6.3 pide «después de unas 1,8 h de colchón», el colchón con el tanque de vuelta en su nivel.

**El arreglo:** para lo que ya está parado, el costo «cuando vuelva» con el nivel típico al parar (la mediana de `nivelAlParar` de sus paradas), o sin cifra.

### QA-A-10 · BAJO · La conciliación «Σ por N1 = Σ por TipoCausa» es una tautología

**Dónde:** `anh-paradas.ts:334-346`. Las dos sumas recorren las mismas filas y suman el mismo `diferidaTrimBbl`, así que `cuadra` no puede dar falso. P1 §2.3 la llama «invariante probado».

**El arreglo:**
- Conciliar contra `libro().diferido` del período: esa cuenta sí puede fallar, y en `p2` cuadra.
- Cruzar `TipoCausa` × N1: los barriles de cada tipo solo pueden caer en las N1 que permite su fila de `REGLAS_ANH` o en «sin causa».

### QA-A-11 · BAJO · En un período que no empieza a medianoche, la raíz del árbol no es el diferido del libro

**Dónde:** `anh-paradas.ts:183` lleva el período a días enteros.

**Cómo reproducirlo:** `p7-bordes.mjs`, la última hora de La Ceiba: libro **81,92** bbl, árbol **791,96**.

**Lo que pasa:** las pantallas siempre piden períodos desde medianoche (`rangoDePeriodo`), así que no se ve. Pero `CONTRATO.md` acepta cualquier instante en `/vistas/choke/arbol` y promete «la raíz = el diferido de `/vistas/diferidos` del período».

**El arreglo:** responder 422 a un período que no empieza a medianoche, o prorratear las filas a [desde, hasta).

### QA-A-12 · BAJO · Las filas del día en curso dicen «Continúa al corte del día» y llevan un fin en el futuro

**Dónde:** `anh-paradas.ts:213-214`.

**Lo que pasa:** LC-07, LC-16, LC-21 y MN-41, el 2-oct a las 14:00, llevan `fin` 23:59:59 y `abiertaAlCorte: true`, aunque el corte no ha llegado. P1 §2.6 define «abierta al corte» en el corte de las 23:59:59.

**El arreglo:** en el día en curso, `fin` = ahora (o sin fin en la vista) y `abiertaAlCorte` en falso hasta que pase el corte. El serializador escribe 23:59:59 solo en días cerrados.

### QA-A-13 · BAJO · U2 quedó desactualizado frente al motor

**Lo que pasa:**
- U2 dice que la planta de La Ceiba deja pasar 12.000 y que «le sobran 640» (Resumen punto 4, §0 principio 2, §2.2, §2.8 `aria-label`, §2.9 y §6.5, «casi empatados»). El motor dice **13.000** y **1.640**: C1 corrigió el tren de crudo el 21-oct, porque ya habían pasado 12.930. PENDIENTES-TANDA3 actualizó Guacamayo en U2 §2.9, no La Ceiba.
- U2 §7.3, «antes → con TRIM» de La Ceiba: U2 dice planta 271 → 62, pozos 117 → 204, sin identificar 3 → 11. El motor: 268 → 51, 125 → 215, 0 → 11. Era un «cálculo U2» previo al motor.

**El arreglo:** marcar esas cifras como obsoletas o regenerarlas desde el motor.

### QA-A-14 · BAJO · Una capacidad firmada a mitad del día rige desde el día siguiente

**Dónde:** `choke.ts:976`: cada día se mide con `potencialesDelCampo(…, x.dia.getTime(), …)`, la configuración de las 00:00.

**Lo que pasa:** firmada a las 12:00 del 15-sep, el 15-sep usa entero la de antes (13.000) y el 16 la nueva (`p7`). Es defendible, pero ni U2 §8.5 ni CONTRATO.md lo dicen.

**El arreglo:** escribir la convención, o prorratear el día por horas.

## 5. Rendimiento en el navegador

**Cómo se midió:** `p9-rendimiento.mjs`, `p9b-rendimiento.mjs` y `p9c-caliente.mjs`, con el Chromium de Playwright (1440 × 900) contra el servidor de desarrollo, en un contexto nuevo por carga en frío.
- «Contenido» es `performance.now()` cuando aparece el bloque propio de la pantalla.
- Las tareas largas salen de `PerformanceObserver('longtask')`.
- Las funciones salen del perfil muestreado de CDP (tiempo total con hijos).
- El demo calcula en el hilo principal, dentro del render (`consulta.ts`: «En el demo la entrada nace resuelta»): cada tarea larga es la pantalla congelada.

**En frío, 13 meses:**

| Pantalla | CPU normal: contenido · tarea más larga | CPU frenada 4x: contenido · tarea más larga (cuántas > 300 ms) |
|---|---|---|
| Diferidos · jefe · todos los campos («Por dónde se trabó») | 937 ms · 198 ms | 3.303–3.555 ms · **869–970 ms** (3) |
| Diferidos · gerente · todos los campos | 926 ms · 106 ms | 3.075 ms · **506 ms** (3) |
| Resumen · gerente · todos los campos | 944 ms · 131 ms | 3.341 ms · **563 ms** (3) |
| Regulatorio · Morichal (el campo más grande; la pantalla es de un campo) | 935 ms · 90 ms | 1.973 ms · **451 ms** (2) |
| Producción · ingeniera · La Ceiba | 909 ms · 83 ms | 2.561 ms · **332 ms** (2) |
| Producción · ingeniera · sus dos campos (tubería de cada campo) | 896 ms · 60 ms | 1.701 ms · 226 ms (0) |
| Producción · gerente · todos los campos (sin tubería: el gerente no la ve, U2 §2.4) | 679 ms · 109 ms | 1.218 ms · **310–370 ms** (1) |

«Producción con todos los campos y la tubería» no existe con los usuarios del demo: la tubería es de ingeniería, y la única ingeniera con Producción tiene dos campos asignados.

**En caliente, cambiando de pantalla en la misma sesión:**

| Paso | CPU normal | CPU frenada 4x |
|---|---|---|
| Mantenimiento → Diferidos del jefe, La Ceiba, septiembre | 373 ms; ninguna tarea larga | 556 ms; la mayor, 138 ms |
| → Diferidos del jefe, todos los campos, 13 meses | **una tarea de 412 ms** | **una tarea de 1.704 ms** |
| → Resumen del gerente, todos los campos, 13 meses | 360 ms; 77 ms | 1.422 ms; 9 tareas, la mayor **318 ms**, Σ 1.047 ms |
| → Diferidos del gerente, todos los campos, 13 meses | la mayor, 95 ms | la mayor, 293 ms |
| → Regulatorio, Morichal, 13 meses | 325 ms; 74 ms | 491 ms; 291 ms |

### QA-A-15 · MEDIO · Hay cálculos de más de 300 ms en el hilo principal

**Lo que pasa:**
- Con la CPU normal, ir a Diferidos del jefe con todos los campos y 13 meses congela la pantalla **412 ms**.
- Con la CPU frenada 4x, 6 de las 7 cargas en frío tienen tareas de 310 a **970 ms**, y el mismo cambio de pantalla, **1,7 s**.

**Lo esperado:** el umbral de 300 ms del pedido de esta auditoría.

**Dónde se va el tiempo** (perfil, 4x, Diferidos del jefe con todos los campos):
- `arbolDelChoke` 711 ms, de ellos `paradasAnh` 689 y `tramosEntre` 483;
- `brechaPorChoke` 478, de ellos `diasDelCampo` 310 y `potencialesDelCampo` 245;
- `repartoPorMes` 292; `libro` 274; `riesgoAhora` 173.

**Por qué:**
1. Dos pasadas sobre el mismo período en la misma pantalla: el reparto (los tramos del libro más `diasDelCampo`) y el árbol (las filas de `paradasAnh`).
2. `paradasAnh` llama a `tramosEntre` una vez por día operacional (`anh-paradas.ts:188-190`): unas 397 llamadas en 13 meses, cada una sobre todos los campos.
3. `diasDelCampo` llama a `potencialesDelCampo` por día y campo (`choke.ts:976`; unas 2.000 veces en 13 meses y 5 campos). Cada llamada arma capacidades, trenes y las frases (`textosDeHoy`, con `toLocaleString`) para leer tres números.
4. `repartoPorMes` (13 × `brechaPorChoke`) y `lineaBasePorTramo` (2 ×) vuelven a calcular días que el período ya calculó.

**El arreglo:**
- Una sola pasada: el reparto sobre las filas del árbol (QA-A-01), que de paso corrige el error.
- `tramosEntre` una vez por período, partido por día.
- Los días de `diasDelCampo` en caché, por campo, día y versión.
- Una función de potenciales solo numérica para la serie.
- Los meses que reusan esos días.
- Si aún pesa, el motor del demo en un Web Worker (con la fuente http calcula el servidor).

## 6. Huecos frente a CHOKE-COMPLETO: las 12 piezas y los invariantes

| # | Pieza | Estado | Qué falta o está a medias |
|---|---|---|---|
| 1 | Los cuatro chokes | ✓ | «Mercado» es subnivel de afuera, nunca un quinto valor |
| 2 | Potencial de cada choke | a medias | Los pozos llevan el factor del mes, circular (QA-A-02). Afuera es «dato del demo, sin firmar» hasta que se firme |
| 3 | Lo que limita | ✓ con salvedad | Ninguna pantalla lee `Campo.choke`. **El empate**: §4 pide «una explicación escrita por producción»; la escribe el administrador dentro de la firma de las capacidades (decisión del coordinador, PENDIENTES), y el motor arma sola una frase («se toma el primero de la tubería») que no es una explicación de nadie |
| 4 | Choke de cada parada | a medias | Reglas 1–5, 7 y 8 ✓ (§3 de este informe). **Regla 6** (una restricción sin evento —curtailment, tanque de agua al límite en régimen, nominación— lleva lo que limita ese día) **no existe**: sin evento no hay tramo del libro y esos barriles se los traga el factor (QA-A-02). Las filas `linea-capacidad`, `linea-variador` y `programada-con-pareja` de `REGLAS_ANH` no las puede activar nadie: `capacidadSinFalla`, `protecciones` y `parejaDelPrograma` (`OpcionesPropuesta`) no se pasan desde ninguna costura ni pantalla |
| 5 | Brecha por choke que suma exacto | a medias | Suma exacto con la regla del motor. No con lo que dicen las personas (QA-A-01). Contra el potencial del sistema no cuadra cuando no limitan los pozos (QA-A-06) |
| 6 | Escalera de brechas | a medias | «Desempeño» no tiene un solo caso en 13 meses. «Desarrollo» solo lo pone una persona, y el reparto no lo lee (QA-A-01). Con «Todavía no sé» el escalón se pierde (QA-A-05). La evacuación va siempre a capacidad (QA-A-03) |
| 7 | Eficiencia de producción | ✓ con salvedad | Circular por el factor (QA-A-02). Con la planta limitando, PE + PE no planeada pasa de 100 % (QA-A-06) |
| 8 | La tubería del agua | ✓ | Tratamiento «sin dato» en todos los campos; admisión solo en La Ceiba y Morichal (deducida, sin firmar). El cuadre V-17 (`t_iny`) es del carril de valor agregado |
| 9 | Valor de cada equipo («si falla hoy») | a medias | QA-A-04. El invariante 7 solo vale en las bombas de agua. «Lo que se gana desembotellando» es una frase sin cifra: §10 pide «cuánto sube el potencial del sistema si se agrega capacidad en el estrecho», y el motor dice qué ampliar, no cuántos barriles da |
| 10 | Choke en el tiempo | ✓ con salvedad | Serie y aviso con umbral y persistencia ✓. En el demo nunca cambia lo que limita: la regla solo se prueba con capacidades de antes (QA-A-07). «Antes → con TRIM» por tramo mezcla capacidad y lo sin identificar (QA-A-03) |
| 11 | Vistas por rol | (QA-B) | El motor da lo que piden las pantallas (PENDIENTES-TANDA3, cerrado) |
| 12 | Salidas | fuera de alcance | Las cadenas `choke_mod` del árbol cuadran fila por fila (verificar-libro §30). El serializador es valor agregado |

| Invariante (§14) | Estado | Evidencia |
|---|---|---|
| 1 · Sistema = el menor; empate con explicación | ✓ | `p1`: el menor de pozos, planta y afuera, al barril. Empate, ver pieza 3 |
| 2 · Potencial − real = Σ por choke + sin explicar; > 2,5 % se marca | ✓ / ✗ | ✓ contra el potencial de los pozos, en 66 combinaciones (`p2`). ✗ contra el potencial del sistema cuando hay estructural (QA-A-06). El 2,5 % nunca se activa en el demo |
| 3 · Σ por choke = Σ por causa dentro del choke | ✓ / ✗ | ✓ sin correcciones; ✗ con una corrección del paso 2 (QA-A-01) |
| 4 · La pérdida nunca entra | ✓ vacío | El motor no tiene pérdidas (`EventoPerdida` no existe). La prueba de `verificar-libro` §24 pasa un `ctx.perdidas` que nadie lee: pasaría con cualquier implementación |
| 5 · Cascada con el choke de la raíz | ✓ | 56 raíces, 0 rotas (`p5`) |
| 6 · Una causa posterior no suma | ✓ | `intervalosEfectivos`: cada hora del pozo se cobra una vez; las filas que llegan con el pozo cerrado van en la descripción |
| 7 · Con holgura cuesta 0 | a medias | Bombas de agua ✓ (P-201B de Guacamayo 0; las hermanas según el agua que entra). Servicios con N+1 o respaldo ✗ (QA-A-04). Barriles del libro en días sin pozos limitando ✗ (QA-A-06) |
| 8 · La planta no baja por una parada | ✓ | verificar-libro §23, también con la parada abierta del 2-oct |
| 9 · Casos de referencia | a medias | QA-A-07 |
