# R3 · Métricas de confiabilidad y mantenimiento (catálogo modular por operadora y por rol)

Investigador: métricas de confiabilidad y mantenimiento. Fecha: 19-oct-2026.
Sigue `docs/plan-circular-24/CONTEXTO.md`. No se tocó código.

> Estado: COMPLETO (21-oct-2026).

## 0. Resumen ejecutivo

1. **TRIM ya calcula 23 métricas** (§1.2) con buenas reglas de base: un disparo no es falla, solo cuentan las fallas propias del equipo, los promedios de duración solo usan fallas cerradas, y el vigía solo proyecta mecanismos de degradación. Hay cinco trampas por corregir (§1.4):
   - el MTBF de la flota no aplica el mínimo de 2 fallas que sí aplica el del equipo;
   - el MTBF es de **calendario** y la norma lo define sobre **tiempo de operación**;
   - la «reparación activa» usa horas-hombre como si fueran duración;
   - la «espera» mezcla demoras que la norma separa;
   - el % proactivo no es la métrica SMRP 5.4.2.
2. **Catálogo** (§3): 54 métricas con fórmula, entradas, fuente, trampas y rol, en 7 paquetes: núcleo (el PLC), confiabilidad avanzada, ESP, trabajo y planeación (CMMS), logística, predictivo de campo, costos.
3. **El «tiempo de logística» de Edinson** se resuelve partiendo el MDT del PLC en cinco tramos con las marcas de SAP y del teléfono: detección, administrativo, logística y movilización, reparación activa, puesta en marcha. Los tramos suman exacto el total (§3.5). Su métrica estrella es **L6**: el P-F observado menos el plazo del repuesto, «¿alcanza?».
4. **Lo modular** (§4) se configura con un perfil firmado: paquetes, base de tiempo, mapeo de clases de orden, regla de falla ESP y **la cifra principal de cada tarjeta** (MTBF, MDT, MART o logística). Las fórmulas, el mínimo de datos y la población no se configuran. Así un mismo número sale igual en todas partes.
5. **Programa del técnico** (§5): el cierre en el teléfono genera las marcas t3 y t4, horas por persona, parte, modo, actividad y repuestos, y las rutas de vibración, termografía y aceite cuya frecuencia sale del P-F observado. Con SAP, TRIM escribe aviso, notificación técnica y confirmación: si el aviso lleva las horas del PLC, el MTTR que calcula SAP coincide con el de TRIM.
6. **Fuentes leídas en esta sesión**:
   - ISO 20815:2018 (muestra) para los términos de ISO 14224;
   - el cuaderno oficial de métricas SMRP 2014;
   - la vista previa de EN 15341:2019;
   - Alhanati (2001, 2008-09) para ESP;
   - ISO 17359:2018 (LTTF);
   - Abernethy (Weibull);
   - NIST (chi-cuadrado);
   - la ayuda de SAP (estadística de averías).
   Lo no verificado está en §6.

## 1. Lo que TRIM ya calcula y muestra (inventario)

Leído en el código el 19-oct-2026 (solo lectura). Roles según `src/entities/roles.ts`: no existe un id `mant`; el de mantenimiento es `jefe` (jefe de mantenimiento). La planeadora `plan` está declarada pero apagada en el MVP (`ROLES_V2 = {plan, cont, reg}`, `src/shared/config/producto.ts:14`).

### 1.1 Reglas de base que ya rigen todo el cálculo

| Regla | Dónde | Comentario |
|---|---|---|
| **Un disparo no es falla.** En la electrosumergible, una parada que vuelve a arrancar en menos de 24 h es disparo (`DISPARO_MAX_H = 24`). | `src/entities/libro.ts:450-455` (`esDisparo`) | Solo aplica a ESP; la parada de una bomba de superficie siempre cuenta. Los disparos se cuentan aparte y nunca entran en MTBF ni en MDT. |
| **Una falla es una parada propia del equipo.** Las causadas por otro equipo (energía, bomba de la línea) o por el programa firmado no cuentan. | `libro.ts:1248-1272` (`armarHistorial`) | Coherente con ISO 14224 (falla = pérdida de la función del propio equipo dentro de su frontera). |
| **Con menos de dos fallas no hay MTBF por equipo.** | `libro.ts:1281` | Ver la trampa 1.4-a: la cifra de flota no aplica esta regla. |
| **Promedios de duración solo con fallas cerradas.** La abierta lleva horas parciales. | `libro.ts:1284-1288` | Correcto: una falla abierta es una observación **censurada** de duración. |
| **El vigía solo proyecta mecanismos de degradación** (familia SINTEF) y solo si la pendiente supera 2 errores estándar; horizonte máximo 90 d. | `src/entities/vigia.ts:97-111`, `salud.ts:47` | Es la base honesta del intervalo P-F (§3.6). |

### 1.2 Métricas que existen hoy

Los ids `A#` son las métricas actuales. Los ids del catálogo propuesto (§3) son N, W, G, E, T, L, P y C.

| # | Métrica (nombre en pantalla) | Fórmula exacta en el código | Dónde se muestra | Rol |
|---|---|---|---|---|
| A1 | **«Entre fallas»** por equipo (MTBF) | `mtbfDias = dias / nFallas`, con `dias` = días **calendario** desde el inicio de la historia (1-oct-2025) hasta `AHORA`; incluye la falla abierta; `undefined` si `n < 2` (`libro.ts:1279-1297`) | Confiabilidad «LOS MÁS COSTOSOS»; ficha del equipo, ESP, bombas (`Equipo.tsx`, `Esp.tsx`, `Placa.tsx`, `DetallePozo.tsx`, `FichaEjecutiva.tsx`) | conf, jefe, (plan) |
| A2 | **«Entre fallas» de la flota** (tarjeta por familia) | `mtbf = (dias × N_equipos) / Σ fallas`, **sin** el mínimo de 2 fallas (`Confiabilidad.tsx:50`) | Confiabilidad, cabecera | conf, jefe |
| A3 | **«Fuera» / «tiempo fuera promedio»** (MDT) | promedio de `horas` (fin − inicio de la parada del PLC) de las fallas cerradas; incluye espera (`libro.ts:1284-1297`; `Confiabilidad.tsx:51`) | Confiabilidad; Riesgo y Mantenimiento (como insumo de «si falla hoy») | conf, jefe |
| A4 | **Tres relojes**: indisponibilidad total, reparación activa, espera | sobre órdenes PM01 en TECO con evento del PLC: `total` = horas de la parada del PLC; `activa = min(horasReales SAP, total)`; `espera = total − activa`; promedio por falla; se cuentan las órdenes sin parada del PLC («fuera del promedio») (`src/entities/sap.ts:323-340`) | Confiabilidad «REPARACIÓN ACTIVA Y ESPERA» (toda la historia); `widgets/sap/TresRelojes.tsx` | conf (foco declarado: «la reparación activa, no la espera del repuesto») |
| A5 | **«le ha costado por falla»** | `bblPorFalla` = Σ bbl de fallas cerradas ÷ nº de fallas cerradas (las que absorbió el tanque cuentan 0) (`libro.ts:1297`) | Confiabilidad «LOS MÁS COSTOSOS» | conf, jefe |
| A6 | **«Si falla hoy»** (costo esperado de una falla hoy) | ESP y bombas sin colchón: `crudo bpd × MDT / 24`; bomba de disposición con tanque: `crudo bpd × media(max(0, d_i − colchón_h)) / 24` sobre las duraciones históricas `d_i` (`src/entities/diferido.ts:495-520, 612-617`) | Riesgo, Mantenimiento «1 · Intervenir» | jefe, conf, ger (regla del dueño: hoy, descontando el colchón) |
| A7 | **Bad actors** «LOS MÁS COSTOSOS» | los 12 equipos con fallas > 0, ordenados por bbl de la historia y luego por nº de fallas (`Confiabilidad.tsx:38`) | Confiabilidad | conf, jefe |
| A8 | **Pareto «DE QUÉ FALLAN»** | conteo de fallas (sin disparos) con parte, por familia, % del total, contra el peso de referencia publicado de cada parte (`Confiabilidad.tsx:144-169`) | Confiabilidad | conf, jefe |
| A9 | **Pareto por parte en barriles** | `porParte` del libro: bbl por parte en el período, % sobre Σ (`widgets/diferidos/Paretos.tsx`) | Mantenimiento | jefe |
| A10 | **Fallas por mes** | conteo mensual sin disparos, apilado por familia (`Confiabilidad.tsx:61-63`) | Confiabilidad | conf, jefe |
| A11 | **Calidad del registro** | % de fallas cuya parte salió de señal / firma / declarada / ninguna (`Confiabilidad.tsx:57-58`) | Confiabilidad | conf, jefe |
| A12 | **Disparos** (ESP) | conteo de eventos ESP < 24 h | globo de la flota, «+N» en la tabla | conf, jefe |
| A13 | **¿Acierta el vigía?** — «Acertó» | `aciertos / (aciertos + falsas alarmas)` (precisión); las intervenidas no cuentan (`widgets/confiabilidad/Aciertos.tsx:40`) | Confiabilidad | conf, jefe |
| A14 | **«Fallas anticipadas»** | `aciertos / fallas de partes vigiladas` (cobertura o sensibilidad); las fallas sin instrumento, sin parte o fuera de perfil se muestran aparte (`Aciertos.tsx:36, 97`; `aciertos.ts` `fallasVistas`) | Confiabilidad | conf, jefe |
| A15 | **Anticipo** (intervalo P-F observado) | `falla.inicio − predicción.emitida`, en días: promedio, mínimo y máximo de los aciertos (`Aciertos.tsx:37, 101`) | Confiabilidad | conf |
| A16 | **Horas para cruzar el límite** (vigía) | recta de mínimos cuadrados; `horas = falta / pendiente`; rango con pendiente ± 2 errores estándar (`vigia.ts:97-111`) | Bombas, ESP, Riesgo, Mantenimiento, Mi trabajo | conf, jefe, sup, oper, tec |
| A17 | **Estado de cada parte** (falló, fuera, avisa, estable, detenida, sin dato) | `evaluarPartes` (`salud.ts`) | Bombas, ESP, ficha | todos los técnicos |
| A18 | **«HORAS EN SAP» · % proactivo** | `(horas PM02 + horas PM03) / (PM01 + PM02 + PM03) × 100`, sobre órdenes con cierre técnico (o liberación o creación) dentro del período (`sap.ts:309-319`) | Mantenimiento (`PanelSapMantenimiento.tsx`) | jefe |
| A19 | **«del diferido, programado»** | `bbl en paradas del programa firmado / bbl diferidos × 100` (`Mantenimiento.tsx:53`) | Mantenimiento | jefe |
| A20 | **«fallas de alto impacto» (bbl)** y «con la parte vigilada» (anticipable) | del libro (`lb.altoImpacto`, `lb.anticipable`) | Mantenimiento | jefe |
| A21 | **Por identificar** (cuenta única) | paradas que piden respuesta; de ellas, las que arrancaron sin identificar (`contarPorIdentificar`) | Turno, Mi trabajo, Identificar, Mantenimiento | sup, oper, tec, jefe |
| A22 | **Mi trabajo**: parados, avisando, órdenes de SAP abiertas (CRTD/REL/PCNF) a su nombre, repuestos reservados, paradas programadas | `Trabajo.tsx` | Mi trabajo | tec |
| A23 | **«Cada cuánto»** en Superficie | MTBF de fallas propias para bombas con perfil; para los demás, días entre **eventos con pozos cerrados** (`shared/api/equipos.ts:155`) | Superficie | jefe, conf |

### 1.3 Lo que hoy NO calcula TRIM (huecos frente al catálogo de §3)

Disponibilidad (técnica u operacional), eficiencia de producción, tasa de falla λ con intervalo de confianza, MTTF/MTBF sobre **tiempo de operación**, run life de ESP con censura, Weibull, MLDT/MAD separados, backlog, cumplimiento de programa, cumplimiento de PM y de rutas predictivas, wrench time, costos (EN 15341 grupo E), y todo lo del técnico en campo (cierre de la orden, rutas de vibración y termografía).

### 1.4 Trampas que ya están en el código (para corregir, no se tocó nada)

a) **Dos reglas para el mismo número.** El MTBF por equipo exige 2 fallas (`libro.ts:1281`); el de la flota se calcula con 1 (`Confiabilidad.tsx:50`), y el texto de la misma pantalla dice «Con menos de dos fallas no se calcula el tiempo entre fallas» (`Confiabilidad.tsx:99`). Va contra la regla de coherencia de §4.3.

b) **El MTBF de TRIM es tiempo calendario, no tiempo de operación.** El numerador incluye el tiempo parado (también el de las fallas mismas) y las paradas programadas. ISO 14224 llama a esto *mean elapsed time between failures* (METBF, 3.60). La definición de IEC 60050-192 que adopta la norma para MTBF es sobre **tiempo de operación** (ver §2.1). Con MDT de ESP de ≈ 17 d y MTBF de flota de 1.133–1.670 d el sesgo es pequeño (≈ 1–1,5 %), pero en una bomba con MTBF de 46 d y MDT de 2 d es ≈ 4 %. Se debe rotular «calendario» o pasar a horas de marcha (TRIM las tiene en el PLC).

c) **«Reparación activa» = horas confirmadas en SAP.** En SAP PM la confirmación trae el **trabajo real** (horas-hombre) y aparte la **duración real**; si dos técnicos trabajan 4 h, son 8 horas-hombre y 4 h de reparación activa. ISO 14224 3.53 nota 2 lo advierte: las horas-hombre «no están directamente relacionadas» con MTTR ni MDT. El campo exacto de SAP se marca **NO VERIFICADO** en §5.4. La regla del demo (`min(horas, 8 h)`) esconde el problema.

d) **La «espera» de los tres relojes mezcla cosas que la norma separa**: detección, demora administrativa (aviso → orden → liberación), demora logística (repuesto, transporte, clima) y la puesta en marcha. Es justamente el «tiempo de logística» que pidió Edinson; ver §3.5.

e) **El % proactivo (A18) no es la métrica SMRP 5.4.2.** SMRP pone en el numerador también el correctivo **que salió de** una inspección PM/PdM y se hizo antes de fallar. En TRIM ese trabajo puede quedar como PM01 o PM03 según cómo lo cree el planeador. Hay que rotularlo «horas PM02+PM03 / horas totales» o adoptar la definición SMRP con una marca de origen en la orden (§5.4).

f) **«Cada cuánto» (A23) mezcla fallas con eventos** (ya anotado en `docs/backend/06c-mantenimiento-marco/09-huecos-y-dudas.md`, punto 8).

## 2. Fuentes de referencia y qué dice cada una

Convención: **[V]** verificado en esta sesión contra la fuente citada (texto leído); **[V-prev]** verificado en la investigación previa (`~/Downloads/TRIM-hidrocarburos/3-investigacion/01-confiabilidad-mantenimiento.md`, en adelante «inv-01», que cita ISO OBP) y no releído hoy; **NO VERIFICADO** con el motivo.

### 2.1 ISO 14224:2016 — tiempos, tasas y el Anexo C

La norma completa es de pago y su vista previa en ANSI quedó detrás de una verificación anti-bots (403). Lo que sigue se comprobó por dos vías: la vista previa pública de **ISO 20815:2018**, que copia y remite a los términos de ISO 14224:2016 con su número de cláusula ([iTeh, muestra ISO 20815:2018](https://cdn.standards.iteh.ai/samples/69983/3eda6859ccca46678cb78e9a71ca5717/ISO-20815-2018.pdf)), y las citas literales de inv-01.

| Término | Qué dice | Estado |
|---|---|---|
| **MART / MTTR / MTTRes / MRT** | ISO 20815:2018, 3.1.1, nota 2: «ISO 14224:2016 distinguishes between the terms mean active repair time (MART), mean time to repair (MTTR), mean time to restoration (MTTRes), and mean overall repairing time (MRT). See ISO 14224:2016, 3.59, 3.63, 3.64 and 3.61». *Active repair time* = «effective time to achieve repair of an item» (ISO 14224:2016, 3.2). | [V] |
| **MTTRes** (3.64) | incluye a) detectar, b) el tiempo antes de empezar la reparación, c) la reparación efectiva, d) el tiempo hasta dejarlo disponible. Nota 4: IEC 60050-192 lo abrevia MTTR. **MTTR** (3.63), nota 4: «Only MRT and MART can be collected». | [V-prev] |
| **MTTF** | ISO 20815:2018, 3.1.34: «expected time before the item fails»; nota 2: «IEC 60050-192:2015 defines MTTF as "expectation of the operating time to failure"»; nota 3: «See also ISO 14224:2016, Annex C». | [V] |
| **METBF / MTBF** (3.60) | METBF = tiempo **transcurrido** entre fallas; la nota 2 remite a IEC 60050-192, 192-05-13, donde MTBF es el tiempo **de operación** entre fallas. | [V-prev]. Electropedia respondió 403: el texto IEC no se releyó. |
| **Down time** | ISO 20815:2018, 3.1.11, nota 1: «includes all the delays between the item failure and the restoration of its service. Down time can be either planned or unplanned (see ISO 14224:2016, Table 4)». Nota 2: «It is important to distinguish between the equipment down time itself and the down time of the plant to which the equipment belongs». | [V] |
| **Logistic delay** | ISO 20815:2018, 3.1.24 (fuente: IEC 60050-192, 192-07-13): «delay, excluding administrative delay, incurred for the provision of resources needed for a maintenance action to proceed or continue». Nota 1: viaje a instalaciones no atendidas, espera de repuestos, especialistas, equipos de prueba e información, y clima. | [V] |
| **Failure rate** | ISO 20815:2018, 3.1.17, nota 3: con tasa constante y reparación «como nuevo», se estima como el número de fallas dividido por el tiempo arriba acumulado, y es el recíproco del MTTF; nota 4: «The estimation of the failure rate can be based on operating time or calendar time»; nota 1: «See ISO 14224:2016, C.3». | [V] |
| **Disponibilidad técnica y operacional** | ISO 20815:2018, 3.1.2, nota 4: «Technical or operational availability (see ISO 14224:2016, C.2.3.2 and Table E.3)». Disponibilidad media (3.1.33): tiempo arriba acumulado ÷ duración del período. | Existencia y numeral [V]. **Las fórmulas de C.2.3.2 NO VERIFICADO**: no se leyó el anexo. |
| **Intervalos de confianza con pocos datos** | No se pudo leer el Anexo C (C.3). El método estándar para tasa constante se tomó de NIST/SEMATECH e-Handbook §8.4.5.1 ([apr451](https://www.itl.nist.gov/div898/handbook/apr/section4/apr451.htm)), para datos censurados por tiempo: `2T/χ²(1−α/2; 2(r+1)) ≤ MTBF ≤ 2T/χ²(α/2; 2r)`; con r = 0 solo hay cota inferior `T / (−ln α)`. Coincide con la práctica OREDA de publicar tasas con banda de 90 % (inv-01, B.1). | Fórmula [V] (NIST). **Que el Anexo C de ISO 14224 use exactamente esta forma: NO VERIFICADO.** |

### 2.2 ISO 20815 (aseguramiento de producción) e ISO/TS 3250

- **Production availability** (ISO 20815:2008, 3.1.38): «ratio of production to planned production, or any other reference level, over a specified period of time». Nota: es para sistemas delimitados sin elementos de compensación como la sustitución por otros productores o el almacenamiento aguas abajo, y los límites del sistema se definen en cada caso. [V] ([iTeh, muestra ISO 20815:2008](https://cdn.standards.iteh.ai/samples/39744/feaaebe095374f84a96bc1f0f10ef31e/ISO-20815-2008.pdf)).
- **Deliverability** (ISO 20815:2018, 3.1.8): igual, pero contando los elementos de compensación (sustitución y almacenamiento aguas abajo). [V] **Es exactamente el «colchón» del tanque de TRIM**: un diferido absorbido por el tanque baja la disponibilidad de la bomba pero no la entrega.
- **ISO 20815:2026**, publicada en junio de 2026: mantiene la arquitectura de 12 procesos, amplía el alcance a CCS, hidrógeno, amoníaco y eólica, y puede remitir a ISO/TS 3250 para la taxonomía de pérdidas ([JPT/SPE](https://jpt.spe.org/iso-20815-2026-expands-production-assurance-and-reliability-management-standard-to-ccs-hydrogen-ammonia-and-wind-energy)). Esto se leyó en una nota de prensa, no en la norma.
- **ISO/TS 3250:2021**: requisitos para reportar el desempeño de producción y las pérdidas en la fase de operación, con categorías de pérdida (Anexo A). Complementa ISO 20815:2018 (E.3 y Anexo G) y se alinea con ISO 14224 Anexo A ([ISO 79553](https://www.iso.org/standard/79553.html)). Alcance [V]; **categorías y fórmula de eficiencia de producción NO VERIFICADO** (de pago, sin muestra legible).
- **Eficiencia de producción (PE) de la NSTA**: `PE = producción real / potencial`. Comprobación aritmética con el informe NSTA 2025 que cita inv-01 (C.0): 401 / 528 MMboe = 75,9 % ≈ 76 %. Es la métrica de gerencia de §3.1 (M-G1). Ver también R2 (`R2-choke-y-perdidas.md` §1).

### 2.3 SMRP Best Practices Metrics

Cuaderno oficial del taller de métricas de SMRP (2014), publicado por PEMAC ([SMRP Metrics Workshop Workbook](https://www.pemac.org/sites/default/files/SMRP_Metrics_Workshop_2014_Workbook.pdf)) [V]. Las fórmulas, tal como aparecen:

| Métrica SMRP | Fórmula del cuaderno | Armonizada con EFNMS (EN 15341:2007) |
|---|---|---|
| 3.5.1 MTBF | Operating Time / Number of Failures | T17 |
| 3.5.2 MTTR | Repair Time / Number of Repair Events | T21 |
| 5.3.1 Planned Work | Planned Work Performed × 100 / Total Work Performed | — |
| 5.4.1 Reactive Work | Reactive Work Performed × 100 / Total Work Performed | O17 |
| 5.4.3 Schedule Compliance – Hours | Scheduled Work Performed × 100 / Total Time Available (el cuaderno rotula la línea de fórmula como «5.4.4», una errata) | — |
| 5.4.9 Ready Backlog | Ready to Schedule Backlog / Craft Available, en semanas (semana de 40 h) | — |
| 5.6.1 Wrench Time | Productive Work Time × 100 / Total Work Time Scheduled | — |
| 5.1.5 Condition Based Maintenance Cost | CBM Cost × 100 / Annual Maintenance Cost | E17 |
| 1.5 Maintenance Cost per RAV | — | E1 |
| 1.4 Stocked MRO Inventory per RAV | Stocked Inventory Value × 100 / RAV | E7 |
| 5.5.71 Contractor Cost | — | E10 |

**Lección del propio cuaderno** (Tabla 9, grupo de 52 bombas, planta A): 12 fallas, 24 órdenes y 24 eventos de parada en el año. Son tres conteos distintos. Un MTBF calculado con órdenes o con paradas sale con la mitad del valor. Es la misma trampa de «un disparo no es falla».

Según inv-01 (C.2, [V-prev], no releído hoy): 5.4.2 Proactive Work (PM + PdM + correctivo identificado por PM/PdM y hecho antes de fallar, sobre las horas totales; SMRP **excluye las horas de contratista temporal** del denominador); 5.4.14 PM & PdM Compliance; 5.4.8 Planned Backlog; 3.3/3.4 Scheduled/Unscheduled Downtime; 2.2–2.4 Availability, Uptime, Idle Time. **MTBM y su número SMRP: NO VERIFICADO**, no aparece en el cuaderno.

### 2.4 EN 15341:2019 (+A1:2022)

Vista previa oficial de ILNAS ([ILNAS-EN 15341:2019](https://ilnas.services-publics.lu/ecnor/downloadPreview.action?documentReference=209834)) [V]: reemplaza a EN 15341:2007 y «maintain[s] the economical, technical, organizational KPI of the previous edition». Reorganiza los KPI en **8 grupos** (cláusulas 7 a 14):
1. Mantenimiento dentro de la gestión de activos físicos.
2. HSE.
3. Gestión del mantenimiento.
4. Competencia del personal.
5. Ingeniería de mantenimiento.
6. Organización y soporte.
7. Administración y suministro.
8. TIC.

Define «man-hour» (3.7) y «work order» (3.8). La vigente es EN 15341:2019+A1:2022 ([iTeh](https://standards.iteh.ai/catalog/standards/cen/fd8282fc-5fa6-4b32-b7ce-e5e3d6d735ec/en-15341-2019a1-2022)).

**Ojo con los códigos.** Los códigos O16–O25, T17, T21 o E17 que circulan, incluidos los de inv-01 (D.2), son de la **edición 2007**: así los cita SMRP en su armonización. **Los códigos de la edición 2019: NO VERIFICADO.** Las tablas de KPI no están en la vista previa. Se recomienda que TRIM cite «EN 15341» por grupo y fórmula, no por código, hasta tener la norma.

### 2.5 API 689

API Std 689, 1.ª edición (2007), es la adopción idéntica de **ISO 14224:2006**, no de la de 2016 ([normservis](https://eshop.normservis.sk/norma/apistd-689-1.7.2007.html), [IAPG](https://biblioteca.iapg.org.ar/bib/168886)). El encargo la llama «RP»; los catálogos la listan como «Standard». **Si existe una edición alineada con 2016: NO VERIFICADO** (no se consultó el catálogo de API). Para TRIM, la referencia de trabajo debe ser ISO 14224:2016.

### 2.6 Electrosumergibles: run life, censura y definición de falla

- **Nomenclatura de fallas de ESP** (Alhanati, Solanki y Zahacy, C-FER, *ESP Failures: Can We Talk the Same Language?*, SPE ESP Workshop 2001, [PDF](https://www.cfertech.com/wp-content/uploads/2021/02/2001spe-espworkshop_final.pdf)) [V]:
  - Base: ISO 14224 y API RP 11S1. Un registro de falla tiene modo de falla, ítem fallado, descriptor y causa.
  - «Usually, a pull is required to repair or substitute the downhole equipment.»
  - Muchas operadoras guardan la falla bajo «Reason For Pull», que incluye además trabajos que no son falla (estimulación ácida, recompletación).
  - El equipo sacado del pozo que pasa la prueba de taller y queda apto para reuso **no** es ítem fallado; el que se desecha sin inspección **sí**.
  - Los sistemas que siguen corriendo deben entrar al análisis como datos censurados por la derecha. Sin ellos, el run life parece bajar cuando en realidad sube (su figura 2).
  - Datos mínimos: fechas de instalación, arranque, falla y pull, más el número de rearranques y las horas en producción.
- **Run life y run time** (Alhanati, SPE Distinguished Lecture 2008-09, [PDF](https://www.spe.org/dl/docs/2009/Alhanati.pdf)) [V]:
  - «For many installations, Run-Life is not known, only Runtime»: sistemas que siguen corriendo, o que se sacaron por otra razón. «The data is said to be "censored"».
  - La exposición se puede medir como *Time-in-Hole*, *Total Runtime* o *Actual Runtime*.
  - El promedio de run time de los sistemas sacados o fallados «is not a good indicator of the AL system reliability».
  - **MTTF = (ΣT de los sacados + ΣT de los que siguen corriendo) / número de fallados.**
  - Trampas que señala: fallas tempranas contra fallas frecuentes; mejora contra envejecimiento.
  - Miembros del JIP ESP-RIFTS listados: ConocoPhillips, EnCana, ExxonMobil, Kuwait Oil Company, Petrobras, Repsol YPF, Rosneft, Saudi Aramco, TNK-BP, TOTAL.
- **Las definiciones internas de ESP-RIFTS** (glosario y reglas de falla del JIP): **NO VERIFICADO**, son de acceso restringido a los miembros.

**Consecuencia para TRIM.** Hoy separa falla de disparo con una duración (< 24 h). La definición de la industria es «la que obliga a sacarla» (pull o workover). La regla de 24 h es un **sustituto** razonable mientras no llegue el dato del workover, y debe quedar rotulada así. Ver §3.3, E2.

### 2.7 Monitoreo de condición

| Norma | Estado | Qué aporta a TRIM | Fuente |
|---|---|---|---|
| **ISO 17359:2018**, pautas generales | Vigente | 7.2: criticidad con costo de parada, «failure rates and mean time to repair», redundancia y costo de repuestos. **8.5**: «The elapsed time between the fault detection and actual failure is known as the lead time to failure (LTTF) and particularly influences the measurement interval». También 8.9 (criterios iniciales de alerta y alarma), 8.10 (línea base) y 9.4 (diagnóstico y pronóstico). | [V] [muestra iTeh](https://cdn.standards.iteh.ai/samples/71194/c551f4c170654bb19be2ee017d144969/ISO-17359-2018.pdf) |
| **ISO 20816-1:2016**, vibración, parte general | Vigente; nueva edición en FDIS | Evaluación por zonas de severidad | [V] [ISO 89921](https://www.iso.org/standard/89921.html) |
| **ISO 10816-7:2009**, bombas rotodinámicas | Vigente; la reemplazará ISO 20816-7 (en etapa AWI) | Zonas de vibración de bombas centrífugas de superficie (reinyección) | [V] [ISO 92744](https://www.iso.org/standard/92744.html) |
| **ISO 18434-1:2008**, termografía, procedimientos generales | Vigente (confirmada en 2023) | Campañas de termografía eléctrica y mecánica | [V] [ISO 41648](https://www.iso.org/standard/41648.html) |
| **ISO 14830-1:2019**, monitoreo tribológico (análisis de lubricante) | Vigente | Análisis de aceite. El aceite aislante queda fuera de su alcance. | [V] [iTeh](https://iteh.es/catalog/standards/iso/2b40ffa8-b0e7-4da7-8bb8-8d6505ccb6f6/iso-14830-1-2019) |

Los **valores límite de zona** de ISO 20816 e ISO 10816-7: **NO VERIFICADO**, normas de pago. TRIM no debe precargar números de zona sin la norma: los límites de alarma son configuración firmada del cliente, como hoy (`limites.ts`).

### 2.8 Tiempos de logística y demoras

- **Verificado**: *logistic delay* (ISO 20815:2018, 3.1.24, arriba) excluye explícitamente la demora administrativa, que es un término aparte. *Mobilization time* (ISO 14224:2016, 3.66) es «time to get all necessary resources available to execute maintenance» [V-prev].
- **Práctica de logística militar e industrial**:
  - MLDT (*mean logistics delay time*) y MAdmDT o ADT (*administrative delay time*).
  - `MDT = M̄ (mantenimiento activo) + LDT + ADT`.
  - `Aₒ = MTBM / (MTBM + MDT)`.
  - Estas fórmulas aparecen en fuentes secundarias (DoD RAM Guide, Blanchard). **La fuente primaria (DoD RAM Guidebook) NO VERIFICADO**: no se pudo abrir.
  - TRIM debe usar los términos ISO para el registro y los de la práctica solo como alias en pantalla.

### 2.9 Weibull con pocos datos y sistemas reparables

- Abernethy, *The New Weibull Handbook*, cap. 1 ([PDF](https://www.quanterion.com/wp-content/uploads/2023/12/NWH_Chap1.pdf)) [V]:
  - el método «works with extremely small samples, even two or three failures for engineering analysis (For statistical relevance, larger samples are needed.)»;
  - con β ≤ 1 «overhauls are not cost effective»;
  - un Weibull de todo el sistema con modos mezclados da β cercano a 1, «masks infant mortality and wear out modes» y «is not recommended»;
  - si los modos no se pueden separar o falta la historia temprana, recomienda Crow-AMSAA o Kaplan-Meier.
- **IEC 61710:2013**: modelo de ley de potencia (Crow-AMSAA) para ítems reparables, con estimación de parámetros e intervalos de confianza de la intensidad de falla ([IEC](https://webstore.iec.ch/publication/5732)). Alcance [V]; fórmulas no leídas.
- **MLE contra regresión de rangos medianos con n < 10**: el punto donde uno supera al otro depende de los parámetros; no hay un umbral único ([Virginia Tech, TR 08-4](https://www.stat.vt.edu/content/dam/stat_vt_edu/graphics-and-pdfs/research-papers/Technical_Reports/TechReport08-4.pdf), según el resumen de búsqueda; el PDF no se leyó).

### 2.10 Intervalo P-F

SAE JA1012:2002, citada literal en inv-01 (E.0) [V-prev]:
- intervalo P-F;
- intervalo P-F neto = intervalo P-F − intervalo de la tarea;
- monitoreo continuo = intervalo de tarea «effectively zero»;
- regla práctica: intervalo de tarea ≈ la mitad del intervalo P-F más corto.

ISO 17359:2018, 8.5, lo llama **LTTF** [V]. TRIM ya mide el P-F **observado** (T15).

### 2.11 SAP PM

| Punto | Qué se encontró | Estado |
|---|---|---|
| Estadística de averías | SAP calcula **MTTR** («average duration of a machine breakdown») y **MTBR** («average duration between two machine breakdowns») desde la historia del equipo, con los avisos que llevan el **indicador de avería** (*breakdown*) y el inicio y fin de la avería. Sale de la estructura de información S070. Si el maestro tiene el indicador de puesta en marcha, cuenta desde esa fecha; si no, el primer aviso se descarta del MTBR ([SAP Help 4.6C, Key Figures for Breakdown Statistics](https://help.sap.com/saphelp_46C/helpdata/EN/c1/37699d449a11d188fe0000e8322f96/content.htm)). | [V] en documentación 4.6C. **Si S/4HANA (Fiori F2812) conserva la misma regla: NO VERIFICADO** (403). |
| Clases de orden PM01/PM02/PM03 | **No tienen un significado universal**: se configuran por cliente. Las fuentes no coinciden: unas dicen PM01 correctivo, PM02 avería, PM03 preventivo; otras, PM03 preventivo o «orden/aviso» ([foro SAP](https://answers.sap.com/questions/11058088/number-range-for-maintenance-order-type.html), [Tutorialspoint](https://www.tutorialspoint.com/sap_pm/sap_pm_corrective_maintenance.htm)). | El mapeo de TRIM (PM01 correctivo, PM02 preventivo, PM03 predictivo, `sap.ts:33,36`) es **una configuración posible, NO un estándar SAP**. |
| Avisos M1/M2/M3 | Uso común: M1 solicitud de mantenimiento, M2 aviso de avería (lleva el indicador de avería y el inicio y fin), M3 informe de actividad. | **NO VERIFICADO en documentación oficial** (solo fuente de proveedor, [oxmaint](https://oxmaint.com/industries/manufacturing-plant/sap-pm-notification-to-work-order-integration-guide)). |
| Confirmación | Las tablas AFRU/AFRV tienen **ISMNW** (trabajo real) e **IDAUR** (duración real), cada uno con su unidad ([sapstack AFRV](https://sapstack.com/tables/tabledetails.php?table=AFRV), [leanx AFRU](https://leanx.eu/sap/table/afru/)). | Campos [V]. **Que ISMNW sean horas-hombre e IDAUR tiempo transcurrido: NO VERIFICADO** (es la lectura usual). |

## 3. Catálogo de métricas

### 3.0 Definiciones de base, una sola vez

Todo el catálogo cuelga de estas definiciones. Si una pantalla las cambia, deja de ser el mismo número (§4.3).

| Concepto | Definición para TRIM | Por qué |
|---|---|---|
| **Evento** | Toda parada registrada por el PLC (inicio y fin). | Es también la **parada de pozo** de la ANH: «con independencia de su duración» (Circular 024, 2.1; R1 §1.3). |
| **Falla** | Evento propio del equipo (dentro de su frontera ISO 14224) que lo deja sin poder cumplir su función. **Excluye**: disparos de ESP, paradas causadas por otro equipo, paradas del programa firmado y paradas por proceso o mercado. | ISO 14224 3.23; SMRP 3.5.1 cuenta «failures», no órdenes ni paradas (§2.3). |
| **Disparo** | ESP que vuelve a arrancar sin sacarla (hoy: < 24 h, `DISPARO_MAX_H`). | Alhanati 2001: la falla de ESP es la que obliga al pull (§2.6). **Para la ANH sí es parada** (`NP_SUB`, «Falla ESP», o la causa que corresponda): entra al JSON aunque no entre al MTBF. |
| **Tiempo de operación** `T_op` | Horas en marcha según el PLC (estado `marcha`), sin las horas paradas ni ociosas. | MTBF IEC 192-05-13; SMRP 3.5.1 «Operating Time». |
| **Tiempo calendario** `T_cal` | Horas del período en que el equipo estaba instalado. | METBF ISO 14224 3.60; lo que TRIM usa hoy. |
| **Falla cerrada** | Falla con fin. Las abiertas son observaciones **censuradas** de duración: no entran a los promedios de duración. | Ya es regla de TRIM (`libro.ts:1284`). |
| **Censura por la derecha** | Equipo que sigue corriendo al fin del período, o que salió de servicio sin fallar. Su tiempo **sí** entra al denominador de la tasa. | NIST apr451; Alhanati 2008-09 (§2.6). |
| **Mínimo de datos** | Con n < 2 fallas no se muestra un promedio entre fallas: se muestra la cota (r = 0: `MTBF ≥ T/(−ln α)`) o «—», con la misma regla en todas las pantallas. | NIST apr451; regla actual de `libro.ts:1281`. |

Leyenda de la columna «¿TRIM lo tiene?»:
- ✅ el dato existe hoy en el motor o en el contrato;
- 🟡 existe a medias o solo en el demo;
- ❌ no existe.

**Notación.** χ²(p; k) es el cuantil de probabilidad acumulada p de la chi-cuadrado con k grados de libertad. La banda es del 90 % (α = 0,10), para datos censurados por tiempo, según NIST apr451.

**Ejemplo con los números del demo** (cálculo propio, base calendario de 366,58 d, la de `04-confiabilidad.md`):

| Caso | MTBF puntual | Banda del 90 % | Lectura |
|---|---|---|---|
| P-201B, 8 fallas | 45,8 d | 25,4 a 92,1 d | — |
| 2 fallas en un año | 183 d | 58 a 1.032 d | Un factor de casi 18 entre los extremos: con dos fallas el número **no dice casi nada**, y debe verse así. |
| Flota ESP del portafolio (68 equipos, 22 fallas; captura 2 de `04-confiabilidad.md`) | 1.133 d | 794 a 1.674 d | — |
| Sin fallas en un año | — | ≥ 159 d (cota inferior) | — |

### 3.1 Módulo NÚCLEO — confiabilidad del equipo (lo calcula TRIM solo, con el PLC)

| ID | Métrica | Fórmula exacta | Entradas · ¿TRIM lo tiene? | Fuente | Trampas | Rol → decisión |
|---|---|---|---|---|---|---|
| N1 | **Número de fallas** | conteo de fallas (§3.0) en el período, por equipo, familia, parte o modo | eventos PLC + causa ✅ | ISO 14224 3.23 | mezclar disparos o paradas ajenas; contar órdenes en vez de fallas (SMRP: 12 fallas ≠ 24 órdenes) | conf, jefe → dónde mirar |
| N2 | **Tasa de falla** λ | `λ = n / T_op` (por 10⁶ h o por equipo-año). Banda del 90 %: `λ_inf = χ²(0,05; 2n) / (2T)`, `λ_sup = χ²(0,95; 2(n+1)) / (2T)` | n ✅; `T_op` 🟡 (el PLC tiene la marcha; hoy se usa calendario) | ISO 20815:2018 3.1.17 n. 3-4; NIST apr451; OREDA (banda del 90 %) | λ constante solo vale si no hay desgaste (ver W1); agregar una flota mezclando clases o fronteras | conf → comparar con referencia (OREDA si el cliente la tiene) |
| N3 | **MTBF** (operación) | `MTBF = T_op / n`, con n ≥ 2; banda `2T/χ²(0,95; 2(n+1)) ≤ MTBF ≤ 2T/χ²(0,05; 2n)` | ✅ / 🟡 (igual que N2) | SMRP 3.5.1; IEC 192-05-13 | hoy TRIM usa calendario (§1.4-b); la flota no aplica n ≥ 2 (§1.4-a); un MTBF que sube no prueba mejora si el período es corto (Alhanati) | conf, jefe → tendencia y priorización |
| N3c | **METBF** (calendario) | `T_cal / n` | ✅ (es el actual «entre fallas») | ISO 14224 3.60 | rotularlo «calendario»; no compararlo con un MTBF de operación | gerente (si se le muestra) → frecuencia en días |
| N4 | **MDT** (tiempo fuera medio del equipo) | `Σ (fin − inicio) de fallas cerradas / nº de fallas cerradas` | ✅ (A3) | ISO 14224 3.16 / ISO 20815 3.1.11 | **la indisponibilidad del equipo no es la del pozo** (ISO 20815 3.1.11 n. 2): una bomba con respaldo puede estar caída sin cerrar pozos; las abiertas no entran | conf, jefe → ¿la parada larga es reparación o espera? (ver L) |
| N5 | **Disponibilidad operacional observada del equipo** | `A = tiempo arriba / (tiempo del período − tiempo ocioso)`; se parte la indisponibilidad en **programada** (programa firmado) y **no programada** | PLC ✅; programa firmado ✅; ocioso o standby 🟡 (hace falta marcar el respaldo en espera) | ISO 20815 3.1.33 (disponibilidad media); ISO 14224 C.2.3.2 (NO VERIFICADO); SMRP 2.2, 3.3, 3.4 (V-prev) | contar como indisponible al respaldo en espera; mezclar disponibilidad técnica y operacional | jefe, conf → ¿el preventivo cuesta más de lo que evita? |
| N6 | **Disponibilidad inherente** Aᵢ | `MTBF / (MTBF + MART)` | MART ✅ con SAP (L5) | práctica de confiabilidad; inv-01b §2 | **nunca llamarla «confiabilidad»**; es la cota optimista, sin logística | conf → techo físico del equipo |
| N7 | **Bad actors** | ranking por bbl de las fallas, por nº de fallas y por horas fuera (tres órdenes, el usuario escoge; el de defecto es bbl) | ✅ (A7) | práctica SMRP/RCM; Pareto | ordenar solo por conteo esconde la falla rara y cara; incluir los disparos en bbl pero no en fallas (hoy `h.bbl` suma los dos, `04-confiabilidad.md` fila 32) | conf, jefe → a qué equipo dedicar el análisis de causa raíz |
| N8 | **Pareto por parte, modo y mecanismo** | `n_k / Σ n` y `bbl_k / Σ bbl` | parte ✅, modo ISO 🟡 (en el aviso), mecanismo 🟡 (lo completa mantenimiento) | ISO 14224 Anexo B | la parte «sin identificar» se muestra como barra propia, no se reparte | conf → modo dominante y estrategia (RCM) |
| N9 | **Disparos y rearranques** | disparos por pozo-mes; rearranques por instalación | ✅ (A12) | Alhanati 2001: el «number of restarts» está en el conjunto mínimo de datos | no sumarlos a fallas; para la ANH sí son paradas | conf, prod → ¿el variador o el yacimiento castigan la ESP? |
| N10 | **Calidad del registro** | % de fallas con parte; % con modo ISO; % con causa raíz; % «por identificar» | ✅ (A11, A21) | ISO 14224 cl. 7 (*quality of data*) | un % alto de «declarado» no es malo; un % alto de «ninguno» sí | conf, jefe → ¿se puede confiar en N2-N8? |
| N11 | **Fallas repetidas** | fallas del mismo equipo y la misma parte dentro de X días desde el arranque anterior (X configurable) | ✅ | el cuaderno SMRP trae «Repeat work orders (Rework)» (dato 5-8). **Número de métrica SMRP: NO VERIFICADO** | fijar X por familia, no global | jefe → calidad de la reparación |
| W1 | **Weibull por modo** (β, η) | ajuste por máxima verosimilitud con censura (los que siguen corriendo cuentan). Se muestra solo con **n ≥ 3 fallas del mismo modo** en la misma familia, con banda; con menos, nada | ✅ si hay historia | Abernethy cap. 1 (2-3 fallas para análisis de ingeniería; más para relevancia estadística) | **mezclar modos da β ≈ 1 y esconde el desgaste** (Abernethy 1.11); el umbral n ≥ 3 es decisión de producto, no de norma | conf → con β > 1, reemplazo por tiempo o por condición; con β ≤ 1, no hacer overhaul |
| W2 | **Tendencia de la flota** (Crow-AMSAA) | intensidad `u(t) = λβt^(β−1)`; β < 1 mejora, β > 1 empeora | ✅ | IEC 61710:2013; Abernethy 1.11 | sirve cuando no se pueden separar los modos o falta la historia temprana | conf, gerente (en una frase) → ¿la flota mejora o empeora? |

### 3.2 Módulo PRODUCCIÓN — el puente con el diferido (para gerencia; coherente con R2)

| ID | Métrica | Fórmula | Entradas · TRIM | Fuente | Trampas | Rol → decisión |
|---|---|---|---|---|---|---|
| G1 | **Diferido por equipo, familia y campo** | `Σ bbl` de los tramos cargados a la causa (`libro.ts`) | ✅ | Circular 024, 2.1 (diferida = potencial de la última prueba − real en 24 h; R1 §1.3) | se reparte por choke y por planeada/no planeada (R2); la pérdida (`dif_perd = PERDIDA`) va aparte y **no** se suma al diferido | ger → de qué campo y qué equipos viene |
| G2 | **Eficiencia de producción** | `PE = real / potencial` (por campo, mes) | ✅ (potencial = prueba × factor) | NSTA (inv-01 C.0); ISO/TS 3250 (NO VERIFICADO) | el potencial debe ser el mismo que usa el diferido; si no, PE y diferido no cierran | ger → ¿mejora el activo? |
| G3 | **Costo de una falla hoy** | `crudo bpd × media(max(0, dᵢ − colchón)) / 24` | ✅ (A6) | regla del dueño (CONTEXTO) | dᵢ son duraciones de fallas cerradas; con menos de 2, usar la flota y decirlo (ya lo hace `deFlota`) | ger, jefe → qué intervenir primero |
| G4 | **Barriles por falla (histórico)** | `Σ bbl de fallas cerradas / nº de fallas cerradas` | ✅ (A5) | — | no confundirlo con G3 | conf → costo histórico de cada modo |
| G5 | **Entrega con colchón** (*deliverability*) contra disponibilidad del equipo | `1 − (bbl perdidos con colchón / potencial)` frente a N5 | ✅ | ISO 20815:2018 3.1.8 (V) | muestra cuánto absorbe el tanque | jefe, prod → ¿vale más el tanque o la bomba de respaldo? |
| G6 | **% del diferido programado** | `bbl en paradas del programa / bbl diferidos` | ✅ (A19) | — | para la ANH, «programada» ⇒ `P_*` con soporte verificable (R4 §6.2) | jefe → convertir no planeado en planeado |

### 3.3 Módulo ESP — electrosumergibles

| ID | Métrica | Fórmula | Entradas · TRIM | Fuente | Trampas | Rol → decisión |
|---|---|---|---|---|---|---|
| E1 | **Run time** por instalación | desde el arranque hasta el pull (o hasta hoy si sigue corriendo); se declara la base: tiempo en el pozo, run time total o run time real (sin paradas) | arranque y pull ❌ (registros de workover); run time real 🟡 (PLC) | Alhanati 2008-09 | no llamar «run life» a un promedio de run time | conf, prod |
| E2 | **Falla de ESP** | pull **por falla** (modo, ítem, descriptor, causa); disparo ≠ falla; el equipo sacado y apto para reuso no es fallado | pull ❌; hoy se aproxima con < 24 h 🟡 | Alhanati 2001 | «Reason for pull» incluye trabajos que no son falla (estimulación, recompletación) | conf |
| E3 | **MTTF de ESP** | `(ΣT de los sacados + ΣT de los que siguen corriendo) / nº de fallados`, con banda χ² como N3 | E1 + E2 | Alhanati 2008-09 (V) | **sin los que siguen corriendo, el MTTF parece caer cuando en realidad sube** (Alhanati 2001, fig. 2) | conf, ger (frase) → ¿el run life mejora? |
| E4 | **Supervivencia y run life mediano** | Kaplan-Meier con censura; mediana = t con S(t) = 0,5 | E1 + E2 | Abernethy 1.11; práctica ESP-RIFTS (curva de supervivencia en Alhanati 2008-09) | con pocos pozos, mostrar la banda; separar por proveedor, diseño o campo solo si n alcanza | conf → proveedor o diseño |
| E5 | **Fallas por componente** | Pareto de ítem fallado (motor, protector, bomba, admisión, cable) | parte ✅ (`PARTES_ESP`) | API RP 11S1 (vía Alhanati 2001) | la parte del vigía es una sospecha hasta el *teardown* | conf → qué componente rediseñar o comprar mejor |
| E6 | **Espera del workover** | desde el pull pedido hasta el pozo de nuevo en producción, partido en espera de equipo, ejecución y arranque | ❌ (programa de workover) | ISO 20815 3.1.24 (logística) | en ESP este tiempo pesa más que la reparación | ger, jefe → pozos en cola de workover (el mayor diferido de ESP) |

### 3.4 Módulo TRABAJO Y PLANEACIÓN — sale de SAP PM (u otro CMMS)

| ID | Métrica | Fórmula | Entradas · TRIM | Fuente | Trampas | Rol → decisión |
|---|---|---|---|---|---|---|
| T1 | **Trabajo proactivo / reactivo** (horas) | proactivo = horas (preventivo + predictivo + correctivo **originado** en una inspección y hecho antes de fallar) / horas totales; reactivo = trabajo que rompe el programa semanal / horas totales | horas por orden ✅ (demo); marca de «origen» de la orden ❌ | SMRP 5.4.2 (V-prev) y 5.4.1 (V) | el A18 actual no es 5.4.2 (§1.4-e); **SMRP excluye al contratista temporal** y en Colombia el mantenimiento suele estar tercerizado (Edinson, 1-oct): declarar si se incluye | jefe → ¿pasamos de correr a anticipar? (el indicador que Edinson dijo que «habla mucho») |
| T2 | **Trabajo planeado** | horas planeadas ejecutadas × 100 / horas totales ejecutadas | ❌ (estimado de la orden) | SMRP 5.3.1 (V) | «planeado» (con plan de trabajo) ≠ «programado» (con fecha) | jefe, plan |
| T3 | **Cumplimiento del programa** | horas programadas ejecutadas × 100 / horas disponibles (SMRP 5.4.3), o en órdenes (5.4.4) | ❌ (programa semanal congelado) | SMRP 5.4.3 (V), 5.4.4 (V-prev) | se mide contra el programa **congelado** el día de corte, no contra el que se reescribe | plan, jefe → ¿cumple la cuadrilla? |
| T4 | **Cumplimiento de PM y PdM** | rutinas PM o PdM hechas dentro de su ventana / rutinas debidas | ❌ (plan de mantenimiento SAP) | SMRP 5.4.14 (V-prev; la ventana de ±10 % es de fuente secundaria, NO VERIFICADO) | contar una rutina hecha tarde como cumplida | plan, jefe, conf |
| T5 | **Backlog** | listo para programar / capacidad de la cuadrilla, en semanas (40 h) | ❌ | SMRP 5.4.9 (V) | sin horas estimadas no hay backlog | plan → contratar, priorizar o recortar |
| T6 | **Antigüedad de avisos y órdenes** | nº de avisos sin orden y de órdenes abiertas con más de 30, 60 o 90 días | ✅ (avisos y órdenes en el demo) | el cuaderno SMRP trae «Work Orders > 90 days old» (dato 5-6) | — | plan, jefe |
| T7 | **MTTR de SMRP / MART** | `Σ duración real de reparación / nº de eventos de reparación` | duración real de la confirmación 🟡 (hoy se usan horas-hombre, §1.4-c) | SMRP 3.5.2 (V); ISO 14224 3.59 | **horas-hombre ≠ duración** (ISO 14224 3.53 n. 2) | conf, jefe → competencia y procedimiento |
| T8 | **Horas-hombre por falla** | `Σ trabajo real / nº de fallas` | ✅ (`horasReales`) | ISO 14224 3.53; EN 15341 3.7 (V) | es costo, no tiempo | jefe → costo laboral de cada modo |
| T9 | **Retraso del cierre** | `cierre técnico (TECO) − fin real del trabajo`, y % de órdenes cerradas sin el dato mínimo (parte, modo, horas) | TECO ✅; fin real ❌ | dolor de la orden en papel (Edinson, transcript 19-oct, [22:34]: «un corre corre … para cerrar todas las órdenes») | es la métrica que demuestra el valor del cierre en el teléfono (§5) | plan, jefe |
| T10 | **Wrench time** | tiempo productivo × 100 / tiempo de trabajo programado | ❌, sale de un **estudio de muestreo** | SMRP 5.6.1 (V) | **no se calcula con SAP ni con el PLC**: TRIM no debe ofrecerlo como número automático | jefe (estudio puntual) |

### 3.5 Módulo LOGÍSTICA — «el tiempo de logística» que pidió Edinson

Las seis marcas de tiempo de una falla, en orden:
1. **t0** el PLC registra la parada;
2. **t1** se crea el aviso;
3. **t2** se libera la orden;
4. **t3** empieza el trabajo;
5. **t4** termina el trabajo;
6. **t5** el PLC registra el arranque.

`MDT = t5 − t0` (lo mide el PLC). Los tramos suman exactamente el MDT; lo que falte se muestra como «sin explicar», nunca se reparte.

| ID | Tramo | Fórmula (promedio de fallas cerradas) | Entradas · TRIM | Fuente | Trampas | Rol → decisión |
|---|---|---|---|---|---|---|
| L1 | **Detección y aviso** | `t1 − t0` | ✅ (aviso creado por TRIM desde la parada) | ISO 14224 3.64 a) (detección) | si TRIM crea el aviso, L1 baja a minutos: es el primer ahorro medible | jefe |
| L2 | **Demora administrativa** | `t2 − t1` (aviso → orden liberada) | ✅ (creada y liberada en la orden) | ISO 20815 3.1.24 (separa la administrativa de la logística) | — | plan, jefe → cuello de aprobación |
| L3 | **Movilización y logística** | `t3 − t2`; de ahí, la **espera de repuesto** = salida de almacén − reserva del material | inicio real ❌; movimiento de material ❌ (SAP MM) | ISO 20815 3.1.24; ISO 14224 3.66 (movilización) | el repuesto importado (2-4 semanas, Edinson 1-oct) va aquí; el clima, el viaje y los permisos también | jefe, plan, abastecimiento → stock mínimo |
| L4 | **Reparación activa** (MART) | `t4 − t3` (o la duración real de la confirmación) | 🟡 | ISO 14224 3.2 / 3.59 | ver T7 | conf (su foco declarado en `roles.ts`) |
| L5 | **Puesta en marcha** | `t5 − t4` | arranque ✅; fin del trabajo ❌ | ISO 14224 3.64 d) | — | sup, oper |
| L6 | **Margen logístico de una alerta** | `P-F neto observado − plazo del repuesto`; con signo: ≥ 0 «alcanza», < 0 «no alcanza» | anticipo ✅ (A15); plazo del repuesto ✅ (`Repuesto.plazoDias`) | SAE JA1012 §13.1 (V-prev); ISO 17359 8.5 (V) | usar el P-F **observado** de esa parte, no uno de catálogo | conf, plan → pedir el repuesto ya o aceptar el correctivo |
| L7 | **Cobertura de repuestos críticos** | % de partes críticas con `stock ≥ mínimo` o con tránsito que llega antes de que cruce el vigía | ✅ (`repuestosDe`) | — | el stock de SAP MM es «libre utilización»; lo reservado no cuenta | plan, abastecimiento |

Los **tres relojes** actuales (A4) son L4 contra el resto: el módulo de logística los abre en seis sin cambiar el total.

### 3.6 Módulo PREDICTIVO — vigía, campañas y rutas

| ID | Métrica | Fórmula | Entradas · TRIM | Fuente | Trampas | Rol → decisión |
|---|---|---|---|---|---|---|
| P1 | **Precisión del vigía** | aciertos / (aciertos + falsas alarmas) | ✅ (A13) | práctica de evaluación de alertas | las intervenidas no cuentan (bien hecho hoy) | conf → cuánto creerle |
| P2 | **Cobertura del vigía** | aciertos / fallas de partes vigiladas; aparte, las fallas no visibles por falta de instrumento | ✅ (A14) | ISO 14224: detección por monitoreo continuo como método (Tabla B.4, V-prev) | sin la segunda cifra, el vigía parece mejor de lo que es | conf, jefe → dónde instrumentar |
| P3 | **P-F observado** | `falla − emisión`, por parte: mínimo, mediana y máximo (n) | ✅ (A15, hoy promedio y rango) | SAE JA1012 3.26; ISO 17359 8.5 (LTTF) | el mínimo manda, no el promedio (JA1012: intervalo de tarea < P-F más corto) | conf → frecuencia de las rutas y margen logístico (L6) |
| P4 | **Cumplimiento de rutas y campañas** | puntos medidos dentro de su ventana / puntos programados (por ruta: vibración, termografía, aceite) | ❌ (no hay rutas, R4 §6.1) | SMRP 5.4.14 (PdM); ISO 17359 8.5 | una campaña trimestral sobre un modo con P-F de semanas no cumple JA1012 aunque marque 100 % | plan, conf, tec → ¿se midió lo que había que medir? |
| P5 | **Hallazgos convertidos** | avisos generados por la ruta / puntos fuera de zona; y % del correctivo que nació de una ruta (alimenta T1) | ❌ | SMRP 5.4.2 («corrective work identified from PM/PdM») | un hallazgo sin aviso es un hallazgo perdido | conf, jefe |
| P6 | **Severidad por punto** | zona del punto según la norma o el límite del cliente (vibración: ISO 20816-1, ISO 10816-7 en bombas; termografía: ΔT contra referencia, ISO 18434-1; aceite: ISO 14830-1) | ❌ | §2.7 | **los valores de zona: NO VERIFICADO**; son configuración firmada | tec (en sitio), conf |
| P7 | **Cobertura de instrumentación de partes críticas** | partes críticas con al menos una variable que anuncia, instrumentada / partes críticas | ✅ (`salud.ts`, `faltan`) | ISO 17359 7.2-7.3 | — | conf, ger (inversión) |

### 3.7 Módulo COSTOS (EN 15341, grupo económico; SMRP pilar 1)

| ID | Métrica | Fórmula | Entradas · TRIM | Fuente | Rol |
|---|---|---|---|---|---|
| C1 | **Costo de mantenimiento por equipo y por falla** | `Σ costo real de las órdenes (mano de obra + material + servicios)` | ❌ (costos de la orden en SAP CO) | EN 15341 (grupo económico; código NO VERIFICADO) | jefe, ger |
| C2 | **Costo del diferido** | `bbl × precio firmado` (la capacidad `metas:firmar` ya cubre el precio) | ✅ (bbl y precio) | regla del dueño | ger |
| C3 | **Costo de mantenimiento / valor de reposición** | costo anual de mantenimiento × 100 / RAV | ❌ (RAV) | SMRP 1.5 (V) | ger (corporativo) |
| C4 | **Costo de CBM y de contratistas** | costo de CBM × 100 / costo anual; costo de contratistas × 100 / costo anual | ❌ | SMRP 5.1.5 y 5.5.71 (V) | jefe, abastecimiento |

**Nota de alcance.** C1, C3 y C4 exigen leer costos de SAP. Son el último módulo en orden de valor para TRIM: su diferencial es el **barril**, no el peso.

## 4. Propuesta de módulos

### 4.1 Paquetes activables por operadora

Se ordenan por qué datos exigen, porque eso es lo que decide si una operadora puede encenderlos.

| Paquete | Métricas | Datos que exige | ¿Se puede apagar? | Comentario |
|---|---|---|---|---|
| **1 · Núcleo** | N1-N11, G1, G3, G4, G6, P1-P3, P7 | solo el PLC y la causa (lo que TRIM ya tiene) | **No.** Es el producto: el diferido y el vigía. | Es lo que hoy muestran Confiabilidad y Mantenimiento, corregido (§1.4). |
| **1b · Confiabilidad avanzada** | N2 con banda, N3 de operación, N6, W1, W2 | el PLC con estado de marcha | Sí (se oculta, no cambia N3c) | Para áreas de confiabilidad maduras. Con pocos datos, muestra la banda o nada. |
| **2 · ESP** | E1-E6 (y N9) | historia de workover (instalación, arranque, pull, motivo, *teardown*) | Sí; se enciende solo si el campo tiene ESP (el perfil ya lo trae: `perfil.electrosumergibles`) | Sin workover quedan N9 y E5; E1-E4 y E6 dicen «falta la historia de workover». |
| **3 · Trabajo y planeación** | T1-T10 (T10 solo como estudio) | lectura del CMMS (SAP PM): órdenes, operaciones, confirmaciones, plan de mantenimiento, programa semanal | Sí | Sin CMMS, solo se ofrece si se usa el programa del técnico de §5 en su variante liviana. |
| **4 · Logística** | L1-L7 | SAP PM (aviso, orden, confirmación) + SAP MM (reservas, salidas, stock) + las marcas t3 y t4 | Sí | Es «el tiempo de logística» de Edinson. L1, L2, L6 y L7 salen con solo leer SAP; L3-L5 necesitan el cierre en el teléfono o confirmaciones con inicio y fin. |
| **5 · Predictivo de campo** | P4-P6 (P1-P3 están en el núcleo) | rutas y campañas (§5.2) | Sí | Integra las campañas de vibración, termografía y aceite con el vigía. |
| **6 · Costos** | C1-C4 (C2 está en el núcleo) | SAP CO / costos de la orden, RAV | Sí | El último en orden de valor. |

**Lo que se configura por operadora** (perfil de métricas, firmado con `config:firmar` y versionado igual que la configuración técnica):
- **Paquetes encendidos.**
- **Base de tiempo** de MTBF y λ: operación o calendario. El rótulo la dice siempre.
- **Contratistas en T1**: si se incluyen (SMRP no los incluye). Se rotula.
- **Mapeo de clases de orden y de tipos de aviso del CMMS** a las clases de TRIM: correctivo, preventivo por tiempo, preventivo por condición (predictivo), modificación (ISO 14224 3.67: no es mantenimiento). Nunca se da por sentado que PM03 = predictivo (§2.11).
- **Regla de falla de ESP**: «pull por falla» (si hay workover) o el sustituto de 24 h.
- **Ventana de falla repetida** (N11) y de cumplimiento (T4).
- **Cifra principal de cada tarjeta.** Es el pedido literal de Edinson: «a veces a un área de confiabilidad no le interesa más el tiempo medio de reparación más que el tiempo entre fallas, entonces, o el tiempo de logística» (transcript 19-oct, [22:34]). La operadora escoge si la tarjeta de su flota abre con MTBF (N3), MDT (N4), MART (L4) o logística (L3). Las demás quedan detrás, a un toque.
- **Alias del cliente.** Ejemplo: la operadora llama «MTTR» a lo que la norma llama MDT. Se puede poner el alias como rótulo, pero el ⓘ dice siempre el término ISO y la fórmula.

**Lo que NO se configura** (coherencia):
- las fórmulas;
- el mínimo de n;
- la exclusión de disparos y de paradas ajenas;
- la población de fallas cerradas de los promedios.

### 4.2 Lo que ve cada rol por defecto

Roles de `roles.ts`. «Jefe» es el de mantenimiento; `plan` está apagado en el MVP y se propone encenderlo con el paquete 3.

| Rol | Por defecto (orden de lectura) | Lo que NO ve | Decisión que sostiene |
|---|---|---|---|
| **Gerente (`ger`)** | G1 por campo y por los equipos que lo generan; G2 (PE) contra la meta firmada; G3 de los 3-5 equipos que más costarían hoy; C2; una frase de tendencia (W2 o E3: «la flota de ESP mejora / empeora») | MTBF, MDT, partes, tags, Weibull, rutas (regla del dueño: no ve el detalle técnico de bombas) | dónde poner plata y gente |
| **Confiabilidad (`conf`)** | la cifra principal escogida (N3, N4, L4 o L3) por familia, con banda; N7; N8; P1-P3 y L6; E3-E5; W1 donde n alcance; N10 | costos de detalle | qué modo atacar, qué instrumentar, qué estrategia (RCM) |
| **Jefe de mantenimiento (`jefe`)** | G6 y fallas de alto impacto (como hoy); T1 proactivo/reactivo; N5 disponibilidad partida en programada y no programada; L1-L3; T6; N11; C1 si está el paquete | Weibull (a un toque si está 1b) | si el mantenimiento pasa de correr a anticipar |
| **Planeador (`plan`)** | T5 backlog; T3; T4; P4; T9; L2; L6 y L7 (repuesto: ¿alcanza?); T6 | bbl del gerente (sí ve G3 por equipo) | qué programar la semana que viene y qué repuesto pedir |
| **Técnico (`tec`)** | su lista del día: órdenes a su nombre, rutas que vencen, cierres pendientes, lo que avisa (A16), «no arrancar» | indicadores de la flota y **ningún ranking de técnicos** (el *wrench time* individual no se muestra) | qué hacer hoy y registrar qué encontró |
| Producción, supervisor, operador | G1 y N9 (disparos ESP) para producción; nada nuevo para supervisor y operador | — | — |

### 4.3 Cómo se configura sin romper la coherencia (un mismo número calculado igual en todas partes)

1. **Un catálogo, una función por métrica.** Cada métrica tiene su ID (N3, L4…), su fórmula, su población y su versión de definición. Una sola función del motor la calcula y el contrato la entrega ya hecha. Las pantallas solo pintan. Hoy MTBF se calcula en dos lugares con reglas distintas (§1.4-a): es el ejemplo de lo que hay que evitar.
2. **El valor viaja con su ficha.** En el contrato, cada cifra lleva `{ valor, n, banda?, base: 'operacion'|'calendario', desde, hasta, definicion: 'N3@1' }`. El rótulo y el ⓘ salen de esa ficha, no del componente. Si dos pantallas muestran «entre fallas», es el mismo objeto.
3. **La misma población para todo lo que se suma.** N4, L1-L5 y T7 se calculan sobre el mismo conjunto de fallas cerradas. Invariante probada en CI: `L1 + L2 + L3 + L4 + L5 + «sin explicar» = MDT`, por falla y en promedio. Es el mismo principio de invariante de la auditoría previa (inv-01b, «Invariante de pantalla»).
4. **Mínimo de datos global.** n ≥ 2 para cualquier promedio entre fallas; banda o cota cuando hay pocos; «—» con su motivo cuando no hay nada. No se configura.
5. **Configuración firmada y fechada.** Igual que el perfil técnico (`configEn(versiones, t)`): un cambio de base de tiempo o de mapeo de órdenes rige desde su firma. La historia se puede recalcular con la definición nueva, pero la pantalla dice «con la definición vigente desde …». Así nadie compara un MTBF calendario de enero con uno de operación de octubre sin saberlo.
6. **Apagar un paquete esconde, no recalcula.** Ningún paquete cambia la fórmula de otro. Ejemplo: T1 con o sin contratistas es un parámetro rotulado, no otra métrica.
7. **Metas por clase y criticidad, firmadas.** Nunca números fijos en el código (lección de inv-01b §6: «MTBF 200 h / MTTR ≤ 3 h» no aplica a upstream). La meta muestra su base: línea propia, OREDA si el cliente tiene licencia, o contrato.
8. **Dos contabilidades, una sola fuente de eventos.** El JSON de la ANH cuenta **paradas de pozo** (todas, también los disparos). Confiabilidad cuenta **fallas del equipo**. Las dos salen del mismo evento del PLC con su causa. Un mismo evento puede ser parada para la ANH y no ser falla para el MTBF: eso se explica en el ⓘ, no se esconde.

## 5. Programa del técnico (reemplazo de la orden en papel)

El pedido de Edinson (transcript 19-oct, [22:34]), en sus palabras:
- «Todavía se manejan en muchos campos las órdenes físicas, las órdenes en papel… las llenan de grasa o de mugre o de agua… a veces no es muy trazable la medida».
- «Ojalá el técnico pueda tener gestión sobre el programa que le va a llegar… hacer un mantenimiento preventivo, predictivo… una campaña de vibraciones o termografía».

En la entrevista del 1-oct añadió que el CBM se hace **por campañas contratadas** (Confipetrol), con un informe que confiabilidad convierte en correctivos, y que el SAP «lo registran muy mal, muy manualmente» (`00-FUENTE-PRIMARIA-entrevista-edinson-2026-10-01.md`, [28:36] y [31:21]-[32:02]).

Hoy TRIM solo **lee** las órdenes de SAP (R4 §6.1). Lo que sigue es lo que generaría el programa y cómo se conecta.

### 5.1 Cierre de la orden en el teléfono: qué datos genera y qué métricas alimenta

| Dato que captura el técnico | Por qué (norma) | Métricas que alimenta |
|---|---|---|
| **Inicio y fin real del trabajo** (t3, t4), con la hora del teléfono, sin redondeo | separa la movilización (L3), la reparación activa (L4) y la puesta en marcha (L5); ISO 14224 3.2 y 3.64 | L3, L4, L5, T7, N6 |
| **Personas y horas de cada una** | horas-hombre ≠ duración (ISO 14224 3.53 n. 2) | T8, T1, C1 |
| **Qué encontró**: parte (ítem mantenible), modo observado, descriptor (cómo estaba: desgastado, quemado, taponado) | cadena de ISO 14224 Anexo B; en ESP, la nomenclatura de Alhanati 2001 | N8, N10, W1, E5; enseña al vigía (ya existe «Registrar qué encontré») |
| **Qué hizo**: actividad (reemplazo, reparación, ajuste, inspección) | actividad de mantenimiento de ISO 14224 (**número de tabla de actividades: NO VERIFICADO**, no se leyó el Anexo B) | T1 (origen), N11 |
| **Repuestos usados** contra los reservados, y si esperó por un repuesto (desde cuándo) | demora logística (ISO 20815 3.1.24) | L3, L7, C1 |
| **Estado de entrega**: operativo, con restricción o «no arrancar»; medición de arranque (vibración o temperatura) si aplica | estado arriba/abajo; seguridad | N5, L5, P6 |
| **Origen del trabajo**: falla, rutina PM, hallazgo de ruta o hallazgo del vigía | numerador de SMRP 5.4.2 | T1, P5 |
| **Fotos y firma** del que recibe (operación) | trazabilidad que el papel pierde | T9 (cierre a tiempo), evidencia para la ANH (`desc_evid`) |
| **Funciona sin señal** y sube al volver la cobertura | el campo sin cobertura es la norma (ver `~/Downloads/TRIM-hidrocarburos/3-investigacion/14-hardware-borde-satelital.md`) | — |

**El primer indicador que demuestra el valor del cambio es T9** (retraso del cierre y % de cierres incompletos). Se mide antes y después de quitar el papel.

### 5.2 Rutas y campañas de vibración, termografía y aceite

- **Ruta**: lista de **puntos de medición**. Cada punto tiene equipo, punto (p. ej. rodamiento lado acople, horizontal), técnica, instrumento, unidad, límite de alerta y de alarma (firmados; §2.7) y frecuencia.
- **Frecuencia desde el P-F, no desde la costumbre.** Regla de JA1012: el intervalo de la tarea debe ser menor que el P-F más corto; en la práctica, la mitad. Donde TRIM tenga un P-F observado de esa parte (P3), propone la frecuencia. Una campaña trimestral sobre un modo cuyo P-F observado es de semanas queda marcada «no alcanza» (P4).
- **Captura.** En el teléfono, o importando el archivo del colector o de la cámara. El formato depende del fabricante del analizador: **NO VERIFICADO**, se define por cliente.
- **Las lecturas entran como series del vigía.** El origen `ruta-manual` ya existe en `src/entities/cadena.ts`. Así una medición de campaña deja de salir como «sin señal» (R4 §5.4, punto 3).
- **Punto fuera de zona**:
  - TRIM propone un aviso M1 con la evidencia (lectura, foto IR, tendencia);
  - el planeador decide en SAP;
  - el correctivo que resulte queda marcado «originado en ruta», que es el numerador de T1 y de P5.
- **Termografía**: foto con ΔT contra la referencia (punto gemelo o ambiente), procedimiento general de ISO 18434-1. **Criterios numéricos de severidad de ΔT: NO VERIFICADO**; los firma el cliente.
- **Aceite**: se importan los resultados del laboratorio por muestra (ISO 14830-1); TRIM no los interpreta: los pone en la línea del equipo.
- **Métricas que nacen aquí**: P4, P5, P6, y el cumplimiento de PdM dentro de T4.

### 5.3 Preventivo

- Las rutinas vienen del **plan de mantenimiento del CMMS** (en SAP, los planes y sus órdenes PM). TRIM no los duplica.
- El técnico las ve en su lista del día, como hoy las órdenes liberadas, y las cierra con §5.1.
- Una parada del programa firmado que tiene orden PM lleva su N1 (`P_MANT_MEC`, `P_MANT_ELE`, `P_MANT_INS`, `P_MANT_INT`) y su N2 de la Tabla 1 de la Circular 024 (R1 §1.5). Así alimenta `pla_no_plan = PLANEADA` con un soporte verificable: el número de orden va en `desc_evid` (coherente con R4 §6.2).
- **Métricas**: T4, T3, N5 (la indisponibilidad programada), G6.

### 5.4 Conexión con SAP PM

| Flujo | Qué viaja | Con qué cuidado |
|---|---|---|
| **TRIM → SAP: aviso** (ya existe, `POST /api/sap/avisos`) | Aviso de avería (M2 en el uso común) con **indicador de avería**, **inicio de la avería = t0 del PLC**, parte, modo y evidencia | Si TRIM pone t0 y luego t5 en el aviso, el MTTR y el MTBR **que calcula el propio SAP** (estadística de averías S070, §2.11) salen de las mismas horas que el MDT de TRIM. Es la mejor garantía de coherencia entre los dos sistemas. **Que S/4HANA conserve esa regla: NO VERIFICADO.** |
| **TRIM → SAP: notificación técnica del aviso** | Catálogos del aviso: parte objeto, daño (= modo ISO 14224, como ya dice `sap.ts:51`), causa, actividad | Los nombres de los tipos de catálogo de SAP (B, C, 5, A…): **NO VERIFICADO**. El catálogo de cada cliente se mapea a ISO 14224 una vez, en Conectores. |
| **TRIM → SAP: confirmación de la orden** | Trabajo real (horas-hombre) y **duración real** por operación, con inicio y fin; materiales usados | Campos ISMNW e IDAUR en la tabla de confirmaciones (§2.11). **La interfaz exacta (BAPI u OData de S/4HANA) la define el integrador: NO VERIFICADO.** Es escritura en el sistema de registro y exige permiso y auditoría. |
| **SAP → TRIM: lectura** | Órdenes, operaciones, estados (CRTD/REL/PCNF/CNF/TECO, ya modelados), plan de mantenimiento, programa semanal, reservas y salidas de material, stock | Para T2-T6 y L2-L3, L7. |
| **Clases de orden** | El cliente mapea **sus** clases a las de TRIM (§4.1). PM01/PM02/PM03 no tienen un significado estándar en SAP. | El predictivo es una **subcategoría del preventivo** en ISO 14224 (3.7, V-prev). T1 los suma: es lo que dice Edinson, «ellos lo llaman preventivo». |
| **Tipos de aviso** | M1 (solicitud) y M2 (avería), como ya modela `sap.ts:30-35`. Uso común, **no verificado en documentación oficial**. | El cliente puede usar otros tipos: el mapeo es configuración. |

**Recomendación de alcance** (la decisión la deja abierta R4 §6.3):
- **Operadoras con SAP**: opciones (a) + (c) de R4. TRIM es el **cliente móvil** que escribe avisos, notificaciones técnicas y confirmaciones en SAP, y **dueño de las rutas de medición** como datos. SAP sigue siendo el sistema de registro; TRIM no guarda una segunda verdad de la orden. Es la única forma de que el MTTR de SAP y el de TRIM sean el mismo número.
- **Operadoras pequeñas sin CMMS**: opción (b), con el **mismo modelo de datos**, para que las métricas T, L y P se calculen igual.
- Las dos opciones son de esfuerzo L (R4).

## 6. NO VERIFICADO (consolidado)

| # | Afirmación | Por qué no se verificó | Cómo cerrarlo |
|---|---|---|---|
| 1 | Las fórmulas del **Anexo C de ISO 14224:2016** (C.2.3.2 disponibilidad técnica y operacional, C.3 tasa de falla e intervalos de confianza) | la norma es de pago; la vista previa de ANSI dio 403 | comprar ISO 14224:2016 (o pedir la copia del cliente) y cotejar con N2, N3 y N5 |
| 2 | El texto de IEC 60050-192 (192-05-13 MTBF, 192-07-23 MTTR) | Electropedia respondió 403 | consulta manual en electropedia.org |
| 3 | Las categorías de pérdida y la fórmula de eficiencia de producción de **ISO/TS 3250:2021** | de pago, sin muestra legible | comprar; cotejar con G2 y con R2 |
| 4 | Los **códigos de indicador de EN 15341:2019** (los O16-O25, T17 y T21 conocidos son de 2007) | las tablas no están en la vista previa | comprar EN 15341:2019+A1:2022 |
| 5 | La ventana de ±10 % de SMRP 5.4.14 y los números SMRP 5.4.2, 5.4.14, 5.4.8, 3.3, 3.4, 2.2-2.4 | vienen de inv-01, no se releyeron; la ventana es de fuente secundaria | SMRP *Best Practices*, 6.ª ed. |
| 6 | El número SMRP de MTBM y de las fallas repetidas | no aparecen en el cuaderno 2014 | ídem |
| 7 | Una edición de API 689 alineada con ISO 14224:2016 | no se consultó el catálogo de API | catálogo API |
| 8 | Las definiciones internas de ESP-RIFTS | JIP de acceso restringido | pedirlas a una operadora miembro |
| 9 | Los valores de zona de ISO 20816-1, ISO 10816-7 y los criterios de ΔT de termografía | normas de pago | comprar, o usar los límites firmados del cliente (lo recomendado) |
| 10 | MLDT, ADT y Aₒ = MTBM/(MTBM+MDT) en su fuente primaria (DoD RAM Guidebook, Blanchard) | solo fuentes secundarias | leer el DoD RAM Guidebook |
| 11 | Que S/4HANA (Fiori F2812) calcule MTTR y MTBR con la misma regla que la ayuda 4.6C | blog de SAP con 403 | documentación actual de SAP o el sistema del cliente |
| 12 | El significado de M1, M2 y M3 en documentación oficial de SAP, y los nombres de los tipos de catálogo del aviso | solo fuentes de proveedor o foros | configuración del cliente (SPRO) |
| 13 | Que ISMNW sean horas-hombre e IDAUR la duración transcurrida | solo listados de campos de tabla | documentación de IW41 o el integrador |
| 14 | La interfaz exacta de escritura en SAP (BAPI u OData) para confirmaciones y notificaciones | fuera del alcance de esta investigación | integrador SAP del cliente |
| 15 | El número de la tabla de actividades de mantenimiento de ISO 14224 | no se leyó el Anexo B | norma |
| 16 | El formato de archivo de los colectores de vibración y de las cámaras IR | depende del fabricante | por cliente |
| 17 | El umbral n ≥ 3 para mostrar Weibull (W1) | **es una decisión de producto**, no viene de una norma; Abernethy solo dice «dos o tres» para ingeniería | decisión del dueño |

## 7. Desacuerdos con otros agentes

1. **R4 (`R4-auditoria-producto.md` §6.1, fila «Modelo SAP PM»)** describe «PM01 correctivo, PM02 preventivo, PM03 predictivo» como el modelo de SAP. Precisión: es **la configuración que asumió TRIM** (`sap.ts:33,36`), no un estándar de SAP. Las clases de orden se configuran por cliente y las fuentes públicas no coinciden (§2.11). El plan no debe dar ese mapeo por sentado: debe ser configurable (§4.1). No contradice el fondo de R4; es una precisión.
2. **Con la investigación previa** (inv-01 §2.D.2; no es un agente de este plan, pero el plan la reutiliza): los códigos EN 15341 O16-O25 se presentan sin edición. La armonización de SMRP prueba que son **códigos de 2007**. EN 15341:2019 reorganizó los KPI en 8 grupos (§2.4). No usar esos códigos como si fueran de 2019.
3. **Con `CONTEXTO.md`**: la lista de roles incluye «mantenimiento (mant)», pero `src/entities/roles.ts` no tiene ese id. El rol de mantenimiento es `jefe` (jefe de mantenimiento) y, en campo, `tec`. Este documento usa `jefe`.
4. **Con R1 y R2 no hay desacuerdo.** Una nota de coherencia (§4.3, punto 8): la parada de pozo de la ANH incluye los disparos de ESP (cualquier duración, R1 §1.3), y el MTBF de TRIM no los cuenta. Son dos contabilidades del mismo evento. Ninguna de las dos debe adaptarse a la otra.
