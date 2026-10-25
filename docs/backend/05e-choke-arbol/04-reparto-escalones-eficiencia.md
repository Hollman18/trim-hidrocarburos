# 5E.4 · El reparto por tramo, los escalones y la eficiencia de producción

Lo que no se produjo en un período (la brecha del libro, 5A.3) se reparte **por tramo** (dónde se trabó) y **por escalón** (qué clase de pérdida fue). De ahí salen la **cifra del norte** (lo no planeado, QA-D4), la brecha **estructural** (lo que no pasa aunque nada pare) y la **eficiencia de producción** (PE, NSTA §5.3 e ISO/TS 3250), con **si se puede creer** (`peCreible`: QA-D3, 5E·H30).

Función central: `brechaPorChoke(campoIds, desde, hasta, ctx, versiones?, op?)` (`src/entities/choke-reparto.ts:257-288`), que arma por campo (`cifras`, `:299-318`; `armar`, `:330-347`) → `BrechaChoke` (`src/entities/choke.ts:1282-1374`). PE: `eficienciaProduccion` (`choke-reparto.ts:428-434`). Ruta: `GET /api/vistas/choke/reparto?campos=&desde=&hasta=` (`pedirRepartoChoke`, `src/shared/api/choke.ts:208`).

**Regla de oro (QA-A-01).** El reparto se hace **sobre las mismas filas ANH del árbol** (5E.3, `filasDelChoke`, `choke-reparto.ts:119-126`), con **la clasificación vigente** de cada fila (lo que dijo o corrigió una persona, si lo hay; si no, lo que propone TRIM). Así el reparto, el árbol (5E.5), la tubería (5E.6), el mes a mes y la línea base (5E.8) dan el mismo número. Cada barril de cada fila va a **un** tramo y a **un** escalón.

Períodos de los ejemplos: «sep» = septiembre de 2026 (cerrado); «oct» = 1-oct-2026 → 2-oct-2026 14:00 (en curso); «13 meses» = 1-oct-2025 → 2-oct-2026 14:00.

---

### Por tramo (dónde se trabó)

**Qué es.** Σ de los barriles de las filas del período por su tramo vigente (`tramoVigente`, `choke-reparto.ts:150`: el paso 2 vigente; si espera una respuesta, donde lo propone el motor mientras tanto; sin nada, `sin-asignar`). Una fila que el período corta (un período que no empieza a medianoche) aporta la parte de sus horas (`bblEnPeriodo`, `:132-137`; QA-A-11).

**Dónde se ve.** Diferidos → «Por tramo» (`widgets/diferidos/PorTramo.tsx`); Producción → la escalera (`widgets/choke/Escalera.tsx`); Resumen del gerente → «Dónde se trabó» (`widgets/resumen/DondeSeTrabo.tsx`).

**Fórmula.**

$$
\text{porChoke}_k = \sum_{f\ :\ \text{tramoVigente}(f)=k} \text{bbl}_f \qquad
\text{sinExplicar} = (\text{Potencial} - \text{Real}) - \sum_k \text{porChoke}_k
$$

`cuadra` = $|\text{sinExplicar}| \le 2{,}5\,\%$ del potencial (el umbral de cierre de la NSTA, §6.2, p. 38). Lo sin explicar **se muestra, nunca se reparte**.

**Ejemplo con los datos del demo.**

| Período | Brecha del libro | Pozo | Planta | Afuera | Sin identificar | Sin explicar |
|---|---:|---:|---:|---:|---:|---:|
| La Ceiba · sep | 7.716,1 | 6.675,5 | 1.040,6 | 0 | 0 | 0,0 |
| La Ceiba · oct | 1.046,0 | 117,9 | 573,1 | 0 | 355,0 | 0,0 |
| Portafolio · sep | 33.944,7 | 24.482,6 | 9.159,5 | 302,6 | 0 | 0,0 |
| Portafolio · 13 meses | 485.684,2 | 245.749,4 | 237.306,7 | 2.272,9 | 355,0 | 0,0 |

En estos cuatro períodos lo sin explicar es 0: las filas suman exacto el libro. Día por día aparece el residuo del libro, el inventario del tanque de venta (5E.8), y con él el umbral de cierre se pone a prueba (5E·H37):

| Período | Potencial | Real | Σ por tramo | Sin explicar | % del potencial | `cuadra` |
|---|---:|---:|---:|---:|---:|---|
| La Ceiba · 22-sep (un día) | 11.542,867 | 10.578 | 876,426 | **88,441** | 0,77 % | sí |
| La Ceiba · 22-sep, 12:00 → 14:00 | 961,906 | 881,500 | 140,333 (P-201B, en la planta) | **−59,928** | −6,23 % | **no** |

En dos horas no cuadra porque el fiscal es diario: lo real se reparte parejo por hora y lo diferido de esas horas (P-201B parada desde las 11:41, con LC-16 y LC-07 cerrados) no. La escalera lo dice: «Lo sin explicar pasa del 2,5 % del potencial: hay que revisarlo antes de cerrar el mes.» Casos: `referencia/choke/reparto-ceiba-2026-09-22.json` y `reparto-ceiba-2026-09-22-12a14.json`; `referencia.mjs comprobar` falla si la referencia no trae uno con lo sin explicar distinto de cero y otro con `cuadra: false`. Los escenarios de configuración no servían para esto: lo sin explicar sale del libro.

**Los equipos de cada tramo** (`porChokeEquipo`, el elemento donde se originó, de mayor a menor, con sus tipos de causa si son más de uno, B-12): La Ceiba sep, pozo: LC-11 3.677,2; LC-04 2.260,6 (2.125,6 de su electrosumergible + 135,0 de una baja tensión que lo tumbó solo a él); LC-16 216,7; LC-07 131,4; planta: P-201B 1.040,6. 13 meses, planta: SE-2 103.705,0; P-201B 61.550,4 (59.432,1 de reinyección + 2.118,3 programados); MPP-301 23.426,9; K-101 17.277,0; afuera: ZA-03 1.309,8; ZA-01 534,4; ZA-06 302,6; ZA-04 126,1.

**Qué texto.** `texto`: «{quien} se trabó sobre todo {en los pozos | en la planta | afuera (…) | en el yacimiento}: N bbl de M» (`DONDE_PERIODO`, `choke.ts:1377`), o «{quien} no tuvo paradas que costaran crudo en el período». Corridos: «La Ceiba se trabó sobre todo en los pozos: 6.676 bbl de 7.716» (sep); «La Ceiba se trabó sobre todo en la planta: 573 bbl de 1.046» (oct); «El conjunto de campos se trabó sobre todo en los pozos: 24.483 bbl de 33.945» (sep).

**Por confirmar** (`porConfirmar`): barriles cuyo tramo es todavía la propuesta de TRIM y espera a una persona (paso 2 en falta con lo que sugiere el motor, o la pregunta del motor sin contestar; `esperaTramo`, `choke-reparto.ts:190-195`). La Ceiba sep 635,4; oct 117,9 (LC-05, la pregunta de la energía); portafolio sep 2.201,4; 13 meses 34.356,4.

**Quién lo calcula.** Servidor.

**Referencia.** `src/entities/choke-reparto.ts:119-288`; `referencia/choke/reparto-{campo}-2026-09.json` (6 casos); `referencia/escenarios/correcciones/reparto-*.json`.

---

### Por escalón (qué clase de pérdida)

**Qué es.** La escalera de la brecha (patente US 8,195,401 B2; NSTA §5.3 y §6.4): seis escalones (`EscalonOSinClasificar`, `choke.ts:110-112`; `NOMBRE_ESCALON`, `:168-175`):

| Escalón | Nombre en pantalla |
|---|---|
| `desarrollo` | «Desarrollo: el yacimiento y los proyectos» |
| `desempeno` | «Desempeño: levantamiento sin optimizar» |
| `disponibilidad-planeada` | «Paradas planeadas» |
| `disponibilidad-no-planeada` | «Paradas no planeadas: fallas, disparos y terceros» |
| `capacidad` | «Capacidad: restricción sin falla (nominación, despacho)» |
| `sin-clasificar` | «Sin clasificar: lo decide una persona» |

**Fórmula (por fila, con la clasificación vigente; `escalonDeFila`, `choke-reparto.ts:169-184`).** En orden:

1. paso 2 = «En el yacimiento» → `desarrollo`;
2. paso 4 = planeada → `disponibilidad-planeada`;
3. el exceso de una parada del programa → `disponibilidad-no-planeada` (así no se esconde una falla bajo un mantenimiento; la NSTA lo dejaría en planeada y la ANH no lo dice: decisión de producto, 5E.11);
4. si una persona dijo la causa (N2 o N1), manda lo que dijo: N2 de restricción sin falla (`N2_CAPACIDAD`, `:156`: «restricción nominación/entrega», «terminal o cliente no recibe», «tanques llenos/capacidad limitada») → `capacidad`; lo demás → no planeada;
5. si no, la regla de la causa de TRIM (`escalonDeCausa`, `choke.ts:1240-1249`): sin causa → `sin-clasificar`; programada → planeada (exceso → no planeada); evacuación o nominación declarada → `capacidad`; otro motivo cerrado → el suyo; frecuencia reducida por una causa del propio pozo → `desempeno`; texto libre → `sin-clasificar`; lo demás → no planeada. **No depende del tramo** (QA-D5): con el tramo sin saber, el escalón sale igual de la causa.

Lo que no tiene causa ni lo dijo nadie queda **sin clasificar: no es no planeado**.

**Ejemplo con los datos del demo.**

| Período | Planeadas | **No planeadas** | Capacidad | Sin clasificar | Desarrollo / desempeño |
|---|---:|---:|---:|---:|---:|
| La Ceiba · sep | 0 | **7.716,1** | 0 | 0 | 0 / 0 |
| La Ceiba · oct | 0 | **691,0** | 0 | 355,0 | 0 / 0 |
| La Ceiba · ago | 1.306,1 | **6.979,8** | 0 | 236,5 | 0 / 0 |
| Portafolio · sep | 1.385,1 | **32.150,5** | 302,6 | 106,5 | 0 / 0 |
| Portafolio · 13 meses | 4.828,5 | **462.267,1** | 17.451,8 | 1.136,7 | 0 / 0 |

13 meses por campo, no planeadas: La Ceiba 143.867; Morichal Norte 231.789; Guacamayo 63.916 (sin los 15.179 de despacho limitado, que son capacidad); El Palmar 17.189; La Zarza 5.507 (y 2.273 de capacidad: el mercado). El demo no tiene desarrollo (nadie puso el yacimiento) ni desempeño (los 196 parciales son de servicios, no del propio pozo).

**El exceso de un programa** (`escalonesDe`, `choke.ts:1257-1270`, y la fila de exceso de 5E.3): P-201B tenía el programa `PR-2011-260819` (19-ago-2026 17:49 → 20-ago 09:34). LC-16 siguió cerrado hasta las 12:04: de sus 559,256 bbl, 468,51 planeados y **90,75 no planeados**; LC-07, 419,36 + **96,10**; LC-14, 418,23 + **30,42**. Total del exceso: **217,27 bbl** que pasan a no planeadas. En 13 meses los excesos suman 556,8 bbl.

**Quién lo calcula.** Servidor.

**Referencia.** `src/entities/choke-reparto.ts:156-184`; `src/entities/choke.ts:1218-1270`.

---

### La cifra del norte: una sola (QA-D4)

**Qué es.** El indicador que el producto busca bajar tiene **una sola cifra en el motor**: el escalón `disponibilidad-no-planeada`, calculado por fila con la clasificación vigente. La leen todas las vistas: la tubería, Diferidos, el gerente, el mes a mes, la línea base y el árbol (su rama no planeada). `Libro.noPlaneado` existe, pero se rotula «no programado (libro)»; lo sin identificar **no** cuenta como no planeado; la planeación de la ANH (paso 4) se queda en Regulatorio con su rótulo.

**Ejemplo con los datos del demo.** 13 meses: **462.267,1 bbl** (= rama no planeada del árbol = Σ del mes a mes). El libro dice «no programado» 480.298,8 y «programado» 5.385,4; la diferencia es exacta:

$$
480.298{,}8 - 17.451{,}8\ (\text{capacidad}) - 1.136{,}7\ (\text{sin clasificar}) + 556{,}8\ (\text{excesos}) = 462.267{,}1
$$

**Quién lo calcula.** Servidor: es `porEscalon['disponibilidad-no-planeada']` de cada vista. **No hay otro cálculo** del norte en el servidor.

**Referencia.** `docs/plan-circular-24/CORRECCIONES-QA.md` (D4); `referencia/choke/mensual-portafolio.json`, `reparto-portafolio-2026-09.json`.

---

### La brecha de las pruebas, la estructural y el potencial del sistema

**Qué es.** Tres cifras que ponen el libro contra lo que limita (QA-D3, QA-A-06):

- **Potencial de las pruebas** (`potencialPruebas`): Σ por día de lo que dan los pozos según sus pruebas × el factor de medición, en las horas de los días **con fiscal** (5E.2).
- **Brecha de las pruebas** = pruebas − potencial del libro: lo que las pruebas dicen de más que el punto oficial (el factor de asignación del mes). Sesgo de medición o desempeño de los pozos, **sin separar mientras el factor de medición sea 1**. No es de ninguna parada.
- **Estructural**: lo que el sistema no deja pasar **aunque nada pare**: Σ por día de (pozos − sistema) cuando lo que limita no son los pozos (`diaCampoDe`, `choke.ts:1058-1077`), por el tramo que limitó. Un día en que el real pasó la capacidad declarada del tramo que debía limitar (`superado`), se avisa, no se separa nada estructural y el sistema se mide contra los pozos.
- **Potencial del sistema** = pruebas − estructural; **brecha del sistema** = potencial del sistema − real.

**Fórmula (identidades exactas, por campo y en el conjunto).**

$$
\text{Potencial} - \text{Real} = \sum_k \text{porChoke}_k + \text{sinExplicar} = \sum_e \text{porEscalon}_e + \text{sinExplicar}
$$

$$
\text{Potencial del sistema} - \text{Real} = \sum_k \text{porChoke}_k + \text{sinExplicar} + \text{brecha de las pruebas} - \text{estructural}
$$

Convención (QA-A-14): un día se mide con la configuración que regía en su medianoche; una capacidad firmada a mitad del día rige desde el día siguiente. Sin fiscal, el día no entra (igual que el libro).

**Ejemplo con los datos del demo.**

| Período | Pruebas | Libro | Brecha pruebas | Estructural | Sistema | Real | Brecha sistema |
|---|---:|---:|---:|---:|---:|---:|---:|
| La Ceiba · sep | 357.485 | 346.378,1 | 11.106,9 | 0 | 357.485 | 338.662 | 18.823 |
| La Ceiba · oct | 18.773,6 | 17.987,0 | 786,6 | 0 | 18.773,6 | 16.941 | 1.832,6 |
| Portafolio · sep | 1.295.395 | 1.268.266,7 | 27.128,3 | 0 | 1.295.395 | 1.234.322 | 61.073 |
| Portafolio · 13 meses | 16.203.161,7 | 15.984.360,2 | 218.801,5 | 0 | 16.203.161,7 | 15.498.676 | 704.485,7 |

Comprobación, La Ceiba sep: $6.675{,}5 + 1.040{,}6 + 0 + 11.106{,}9 - 0 = 18.823$. En septiembre la brecha de las pruebas es **negativa** en Guacamayo (−1.486,4), El Palmar (−792,2) y La Zarza (−2.949,6): ahí el punto oficial midió más de lo que dicen las pruebas, el potencial del sistema queda corto y, sin el factor de medición firmado, su PE no se puede creer (abajo; 5E·H30).

Con las capacidades de hoy **ningún día** limita otra cosa que los pozos: lo estructural es 0. **Escenario con las capacidades de antes** (La Ceiba, tren de crudo 12.000; Guacamayo, afuera 6.800 y crudo 7.400; `referencia/escenarios/capacidades-de-antes/`), portafolio 13 meses: estructural **66.382** (La Ceiba, planta 30.045; Guacamayo, afuera 36.337); 316 días-campo con la capacidad superada (La Ceiba 129, Guacamayo 187); horas limitando: La Ceiba pozos 1.958 h y planta 6.840 h, Guacamayo afuera 8.798 h.

**Qué texto.** `textoEstructural` (`textoDeEstructural`, `choke-reparto.ts:409-425`): una frase por campo y tramo con su cifra (5E·H31; antes iba el total en el tramo mayor). Corrido en ese escenario: «En La Ceiba, la planta no deja pasar todo lo que pueden dar los pozos: 30.045 bbl de lo que no se produjo son de ahí, aunque nada pare. En Guacamayo, afuera no deja pasar todo lo que pueden dar los pozos: 36.337 bbl de lo que no se produjo son de ahí, aunque nada pare. Ningún arreglo de equipos los recupera; solo más capacidad. El real pasó la capacidad declarada (La Ceiba, la planta: 129 días; Guacamayo, afuera: 187 días): ese número está por debajo de lo que ya pasó y hay que revisarlo. Esos días no se separa nada estructural.» Con un solo campo, sin su nombre: «La planta no deja pasar todo lo que pueden dar los pozos: 30.045 bbl …». Un tramo con menos de 0,5 bbl no lleva frase.

**Referencia.** `src/entities/choke.ts:1018-1116`; `src/entities/choke-reparto.ts:244-425`; `referencia/escenarios/capacidades-de-antes/reparto-ceiba+guacamayo-13-meses.json`.

---

### Lo que cabía en la holgura

**Qué es.** De lo diferido, lo que **no le costó al campo**: cayó en días en que no limitaban los pozos y cabía en su holgura (el real llegó a lo que dejaba pasar el tramo que limitaba). Por día: $k = \min(1, \max(0, \text{sistema} - \text{real}) / \text{filas del día})$; cabía $= \text{filas} \cdot (1-k)$, y la misma proporción sale de lo no planeado: **no planeada del sistema** = escalón no planeado − lo que de él cabía.

**Ejemplo con los datos del demo.** Hoy, 0 en todos los períodos (limitan los pozos: la no planeada del sistema es el mismo escalón, 462.267,1). En el escenario de las capacidades de antes, 13 meses: cabía **50.174** bbl y la no planeada del sistema baja a **415.321**.

**Referencia.** `src/entities/choke-reparto.ts:299-318`.

---

### La eficiencia de producción (PE) y la PE no planeada

**Qué es.** PE = real ÷ potencial del sistema (NSTA §5.3; ISO/TS 3250). **PE no planeada** = no planeada del sistema ÷ potencial del sistema: lo que el norte busca bajar. Es **de crudo**: en un campo de gas no aplica, y la de un conjunto es la de sus campos de crudo. Y **no siempre se puede creer** (`peCreible`, QA-D3; 5E·H9 y 5E·H30): si las pruebas dan menos de lo que midió el punto oficial, el potencial del sistema queda corto y la cuenta pasaría de lo posible.

**Dónde se ve.** Producción → la escalera (`widgets/choke/Escalera.tsx`): con `peCreible`, la cifra; sin ella, `textoPe` en su lugar, lo no planeado en barriles y **nunca un número de PE** (6D.1). El ⓘ del «% del potencial» de la cabecera tampoco la da en número (`Produccion.tsx`).

**Fórmula** (`armar`, `peDeCampo` y `peDelConjunto`, `choke-reparto.ts:330-407`).

$$
\text{PE} = 100\cdot\frac{\text{realPe}}{\text{potencialPe}}, \qquad
\text{PE}_{\text{NP}} = 100\cdot\frac{\text{NP}_{\text{sistema}}}{\text{potencialPe}}
$$

`realPe` y `potencialPe` son lo real y el potencial del sistema de los campos donde la eficiencia de crudo aplica: en un campo de crudo, `real` y `potencialSistema`; en uno de gas, 0 y 0 (la PE va en 0); en el conjunto, la suma de sus campos de crudo. Se puede creer (`peCreible`) si no es de gas y

$$
\neg\big(\neg\text{firmado} \wedge \operatorname{round}(\text{brecha de las pruebas}) < 0\big) \ \wedge\ \text{PE} \le 100
$$

donde **firmado** = el factor de medición estaba firmado en la configuración de cada día del período (cada día, la de su medianoche). Un conjunto se cree si se cree la de cada uno de sus campos de crudo. **Nunca usa la propuesta sin firmar**: solo la dice.

**Ejemplo con los datos del demo** (ningún factor firmado).

| Período | PE | PE no planeada | ¿Se puede creer? | Lo que más horas limitó |
|---|---:|---:|---|---|
| La Ceiba · sep | 94,73 % | 2,16 % | sí | pozos (720 h) |
| La Ceiba · oct | 90,24 % | 3,68 % | sí | pozos (38 h) |
| Portafolio · sep (sin La Zarza) | 94,70 % | 2,67 % | **no**: Guacamayo y El Palmar | pozos |
| Portafolio · 13 meses (sin La Zarza) | 95,33 % | 3,04 % | sí | pozos (35.192 h) |

Septiembre por campo: La Ceiba 94,73 / 2,16 y Morichal Norte 93,20 / 2,60 se creen; **Guacamayo 97,60 / 3,12 y El Palmar 96,80 / 3,99 no se pueden creer** (brecha de las pruebas −1.486,4 y −792,2; juntas pasarían del 100 %: 100,73 y 100,79); La Zarza no aplica (antes daba 102,87 %). 13 meses: La Ceiba 96,46 / 3,23; Morichal 94,27 / 3,42; Guacamayo 96,11 / 2,49; El Palmar 95,48 / 1,38: en 13 meses las pruebas de los cuatro dan más que el punto oficial y todas se creen. Octubre: las cuatro se creen (90,24, 93,73, 96,88 y 97,20 %). Antes de este arreglo el portafolio decía 95,29 % / 2,48 % en septiembre y 95,65 % / 2,85 % en 13 meses: llevaba La Zarza.

**Qué texto** (`textoPe`; el de cada campo en `porCampo[]`):

| Caso | Texto |
|---|---|
| Sin el factor firmado y la brecha de las pruebas negativa | «Las pruebas dan menos de lo que midió el punto oficial: la eficiencia no se puede creer hasta firmar el factor de medición. TRIM propone 1,004, medido en 24 días sin paradas.» (Guacamayo; El Palmar: «… TRIM propone 0,998, medido en 80 días sin paradas.»). Sin propuesta: «… TRIM todavía no lo propone: en los 90 días antes de hoy hubo N días sin paradas y con los pozos limitando, y hacen falta 7.» |
| Firmado, pero después de esos días (firmar hoy no cambia un mes cerrado) | «Las pruebas dan menos de lo que midió el punto oficial y en estos días el factor de medición todavía no estaba firmado: la eficiencia no se puede creer. El firmado (1,004) rige desde el 3 de oct.» |
| Firmado y la PE pasaría de 100 % | «Lo que salió pasa lo que dan las pruebas con el factor de medición firmado (0,950): la eficiencia no se puede creer hasta revisarlo. TRIM propone 1,004, medido en 24 días sin paradas.» (Guacamayo con 0,950: 102,7 %) |
| Campo de gas | «La Zarza es un campo de gas: la eficiencia de crudo no aplica.» |
| Conjunto que no se cree | «La eficiencia del conjunto no se puede creer: en Guacamayo y El Palmar las pruebas dan menos de lo que midió el punto oficial y falta firmar su factor de medición. Sin La Zarza: en un campo de gas la eficiencia de crudo no aplica.» |
| Conjunto que se cree, con un campo de gas | «Sin La Zarza: en un campo de gas la eficiencia de crudo no aplica.» (`peCreible: true`: va debajo de la cifra) |

**Con el factor firmado** (`referencia/escenarios/factor-de-medicion/`, Guacamayo 1,004 y El Palmar 0,998 desde el comienzo), septiembre se cree: Guacamayo 97,22 / 3,11, El Palmar 96,99 / 4,00, el conjunto 97,14 / 3,40. PE + PE no planeada puede pasar un poco de 100 % (100,32 y 100,99): el factor de asignación del mes se aleja del firmado, que es la mediana de 90 días, y eso lo asume la firma. Lo que nunca sale es una PE sobre 100 %.

**La escalera de Producción** (La Ceiba sep): pruebas 357.485 − brecha de las pruebas 11.107 = libro 346.378 − no planeadas 7.716 = real 338.662. Contra el potencial del libro serían 97,8 %; contra el del sistema, **94,7 %**: la PE se mide contra lo que limita, no contra lo asignado. En El Palmar sep: pruebas 99.913 + lo que el medidor oficial da de más 792 = libro 100.705 − no planeadas 3.990 = real 96.715, con «Las pruebas dan menos…» en lugar de la cifra.

**Casos borde.** Sin potencial del sistema, 0. Campo de gas: no aplica (0 y su frase). Lo que cabía en la holgura ya salió de lo no planeado; aun así, con la brecha de las pruebas negativa PE + PE no planeada pasa del 100 %: por eso, sin el factor firmado, no se cree (el comentario de `BrechaCampoChoke.peNoPlaneada` decía que nunca pasaba, 5E·H30).

**Quién lo calcula.** Servidor. Es la misma cuenta de `brechaPorChoke` (`eficienciaProduccion` la expone sola, con `peCreible` y `textoPe`).

**Referencia.** `src/entities/choke-reparto.ts:330-434`; `src/entities/choke.ts:1380-1396`.
