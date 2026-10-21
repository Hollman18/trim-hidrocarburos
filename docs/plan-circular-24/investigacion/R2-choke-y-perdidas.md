# R2 · El modelo choke y la contabilidad de pérdidas (diferida vs. pérdida)

> Investigador: contabilidad de pérdidas y modelo choke. Fecha: 19-oct-2026.
> Fuentes primarias: Circular ANH 0024 del 09-09-2026 (en adelante «C-024», citada por página del pie «Pág. n de 10»),
> imagen del árbol de paradas de pozo, transcript del 19-oct-2026, código de `src/entities/`.
> Investigación previa reutilizada: `~/Downloads/TRIM-hidrocarburos/3-investigacion/02-produccion-diferidos.md` (en adelante «inv-02»),
> `10-atribucion-diferidos-hueco.md` («inv-10»), `17c-tres-trenes-metricas.md` («inv-17c»).
> Convención: `[DATO]` = verificado con fuente citada · `[INFERENCIA]` = razonamiento propio a partir de datos · **NO VERIFICADO** = no se pudo comprobar y se dice por qué.

## 0. Resumen ejecutivo

1. **El «choke» de la ANH son los cuatro chokes originales de BP** de SPE-36848 (Palen y Goodwin, 1996, verificado por Crossref): Reservorio, Pozos, Planta y Exportación.
   - No son los de la NSTA británica (Pozos, Planta, Exportación, Mercado). TRIM hoy usa los de la NSTA (`Campo.choke`).
   - Equivalencias: Pozos = POZO (+ RESERVORIO, que la NSTA funde con pozos para el potencial); Planta = PLANTA; Evacuación = EXPORTACION; **Mercado no existe en la ANH** y va como EXPORTACION con `NP_TRANSP`.
2. **Son dos conceptos distintos que TRIM tiene que separar:**
   - el choke **dominante del campo**, que se calcula como el menor potencial;
   - el choke **de cada parada**, que es el componente donde se origina la restricción y es lo que pide `choke_mod`.

   Hoy ninguna pantalla usa el choke, y ningún evento lo tiene.
3. **Regla operativa para la parada:**
   - el choke es el del origen;
   - un elemento dedicado a un pozo es POZO y uno compartido es PLANTA (es el ejemplo del transformador de Edinson, que la NSTA resuelve distinto);
   - más allá de la batería y de terceros es EXPORTACION;
   - RESERVORIO solo para causas de yacimiento.

   La tabla §3.3 pasa cada `TipoCausa` a responsable, choke, diferida/pérdida, planeada, N1 y N2, y marca el dato que falta.
4. **Hallazgo del Schema oficial:** el JSON Schema V3.1 **no tiene `enum`** para ningún campo de clasificación. Además, el Diccionario V3.2 **contradice** a la circular:
   - código o texto en `cau_niv1`;
   - EXPORTACIÓN con tilde;
   - N2 distintos;
   - `choke_mod` descrito como «modelo de estrangulador».

   TRIM tiene que guardar códigos internos y serializar por versión.
5. **Pérdida = producido a superficie y no comercializable**, de la cabeza de pozo al PMO.
   - El «ya estando en subsuelo» de Edinson es un lapsus; manda la circular.
   - El volumen va en `balance_fluido_*.perdidas` y `balance_fluido_gas.quemado`, no en `paradas_pozo`. El venteo no tiene campo.
   - Puede haber pérdida sin parada. Una parada con diferida y pérdida a la vez no tiene regla publicada.
6. **La conversión de árboles** se hace hoja → pareja (N1, N2), con una tabla versionada y firmada.
   - El choke y el impacto no van en la tabla: salen del evento.
   - PRODML es demasiado grueso para servir de pivote; su *lost production* es la DIFERIDA de la ANH.
   - El árbol de Ecopetrol no es público (NO VERIFICADO).

## 1. El modelo choke

### 1.1 Origen

**El documento que cita la ANH.** La C-024 define el choke como «Punto funcional de la cadena de producción donde se origina o materializa de manera restrictiva la parada o limitación de flujo, clasificándose estrictamente para efectos de reporte en Pozo, Planta, Exportación o Reservorio, de conformidad con la metodología internacional de contabilidad de pérdidas de producción "The Choke Model" (estándarSPE-36848)» y aclara que «se distingue técnicamente de la válvula de estrangulamiento […] (válvula choke)» (C24 p.4, numeral 2.1).

`[DATO]` La referencia existe y es esta (metadatos y primeras páginas leídos de Crossref, DOI `10.2118/36848-MS`, porque OnePetro devolvió 403):

| Campo | Valor |
|---|---|
| Título | *Increasing Production in a Mature Basin: "The Choke Model"* |
| Autores | W. Palen y A. Goodwin, British Petroleum |
| Evento | European Petroleum Conference, Milán, 22-oct-1996 |
| Tipo | *Paper* de conferencia (no es un «estándar» SPE, aunque la circular lo llame así; R1 §1.3 hace la misma observación) |

Lo que dice el texto, verbatim (Crossref, sección «Statement of Theory and Definitions», p. 299 del volumen):

- La idea base: «Production Efficiency improvement is built around the simple concept of a **pipeline through which the oil flows from reservoir to market**. The objective is maintaining the daily flow rate at the maximum possible. This throughput may be **plant capacity for plateau producers or the total well potential for mature phase fields**.»
- Qué es una pérdida: «A series of restrictions or chokes are visualized in this pipeline, that represent the areas of production loss, i.e. **Reservoir potential, as measured by well tests, that is not delivered**.»
- Los cuatro chokes: «The resultant losses are those that occur due to: Reservoir Management; Well Availability and Utilization; Topsides Availability and Utilization, (i.e. the efficiency of using the available equipment); and Export system. […] These are simplified for management reporting as **Reservoir, Wells, Plant, and Export chokes**.»
- Los niveles de abajo: «The choke model exists on lower levels as seen in Table 2, Expanded Choke Model Example. […] Some assets will carry analysis to the six minor chokes shown and **all will further analyze down to at least another level e.g. ESP failure, metering**. The assets modify/use the lower parts of the model they see as valid for their particular circumstances.»
- El gas: «a gas asset suffers only a **true loss** when it has missed a DCQ target and has not been able to make up its temporary shortfall.»
- La inyección: «In a field such as Magnus or Ula the Gross Potential is very dependent on water injection capacity, and **a separate choke model can be used to model injection performance**.»
- El resultado: 4 % real de mejora de la eficiencia de operación en el portafolio de BP en el Mar del Norte y unos 10 mmboe en dos años (resumen del *paper*).

**NO VERIFICADO:** la Tabla 1, la Tabla 2 (el modelo expandido con los «six minor chokes») y el apéndice con el procedimiento de cálculo «as given to the assets in 1993». Están detrás del muro de pago de OnePetro y Crossref solo trae la primera página. Lo que sigue sobre la lógica de cálculo sale de la NSTA, que es quien lo convirtió en reporte regulado.

**El linaje.**
1. **BP, 1993–1996** (SPE-36848): cuatro chokes, que son Reservorio, Pozos, Planta y Exportación.
2. **BP en otros activos.** `[DATO, solo resumen]` El *APPEA Journal* 2005 publicó *Implementation of the BP choke model on the Woodside operated Cossack Pioneer FPSO* (ref. AJ04009). Según su resumen, el modelo «enables losses to be identified and categorised relative to the system capacity or installed production capacity across four primary production chokes—**the reservoir, wells, plant and the export system**». Entre sus lecciones están la necesidad de definir la *Installed Production Capacity* y de estandarizar las fuentes y causas de pérdida, porque «people interpret these differently». Esto se vio solo en el extracto que devuelve el buscador: la página de CSIRO dio 404 y 302. Los autores (Buchanan, Robinson y McCaffery) son **NO VERIFICADO** contra la página original.
3. **OGA/NSTA (Reino Unido), desde 2016–2017.** `[DATO]` La *UKSS Production Efficiency Section Guide 2025* (NSTA, publicada el 03-nov-2025, §5.2, p. 23) dice: «The Production Efficiency (PE) Data Collection & Reporting process uses a 4-stage production choke model. The 4 chokes in the production choke model are: **Wells¹, Plant, Export & Market**». La nota ¹ dice: «**The single Wells choke encompasses both reservoir and wells for the calculation of SMPP, however they are separated for loss reporting purposes.**» Cita como referencias el *SPE draft white paper "Production Efficiency Reporting – Best Practice Guidance" (2016)* y SPE-36848-MS (p. 23). Según §2.2 (p. 6), «The SPE shall be consulted on any technical / structural queries on the 4-stage production choke model».
4. **ISO/TS 3250:2021** (*Calculation and reporting production efficiency in the operating phase*). `[DATO]` Según su alcance, da «requirements and guidance for reporting of production performance data and production loss data in the operating phase by use of production loss categorization» y «supplements the principles of ISO 20815:2018, Clause E.3 and Annex G» (ficha de CEN ISO/TS 3250:2022 en evs.ee). Las categorías de su Anexo A son **NO VERIFICADO**, porque la norma es de pago. TRIM ya cita ISO/TS 3250 para la eficiencia «real ÷ potencial» (`docs/backend/anexo-c-normas.md`).
5. **ANH, Circular 003/2026 → Circular 024/2026.** Los cuatro chokes de la ANH son **los cuatro originales de BP de 1996** (Reservorio, Pozo, Planta, Exportación), **no los de la NSTA** (Pozos, Planta, Exportación, Mercado). `[INFERENCIA fuerte]` Coinciden uno a uno con la frase «simplified for management reporting as Reservoir, Wells, Plant, and Export chokes» de SPE-36848.

**La «contabilidad de diferidos» (*deferment accounting*) de BP y de Shell.** El choke model ES la contabilidad de pérdidas de BP (SPE-36848). De Shell solo hay evidencia indirecta: inv-02 §2.B encontró citado un *Deferment Administration Manual EP 2007-9017* con «full guidance on the coding structure and appropriate root cause codes for unscheduled deferment». Allí también aparece la definición «Deferment is referred to as unscheduled when it is caused by events that cannot be scheduled, such as trips, breakdowns and interruptions by third parties, or poor performance of equipment or sub-optimum settings». **NO VERIFICADO:** el contenido del manual de Shell, que es un documento interno. En la literatura SPE: «unplanned production deferment (UPD) is defined as the conduit production flow deviation from **technical potential** due to unscheduled interruptions» (SPE-196255-MS, 2019, citado en inv-02 §2.B).

### 1.2 La lógica exacta

#### (a) El potencial por nivel

Los chokes van **en serie**: reservorio → pozo → planta → exportación (→ mercado en la versión de la NSTA). Cada uno tiene su potencial máximo (MPP) y el sistema no puede entregar más que el menor. `[DATO]` NSTA 2025 §5.3 (p. 24):

```
MPP (por choke) = UPP + CPD + EPP + Producción real + Pérdidas de producción
SMPP del activo = el MENOR de los MPP de los chokes («the smallest MPP of the 4 chokes»)
```

- **SMPP** (*Structural Maximum Production Potential*): «the lowest structural production potential of the well, plant, export & market systems» (p. 24).
- **EPP** (*Economic Production Potential*): potencial recuperable en el año con «intervention, workover, repair, maintenance activity, etc.» (§5.3.1, p. 25; §5.7, p. 33).
- **UPP** (*Uneconomic Production Potential*): potencial cerrado porque no es económico; «may only contain shut-in Production Potential that has previously been available» (§5.5, p. 31).
- **CPD/SCPD** (*Sanctioned Capital Project Delay*): retraso de un proyecto con decisión final de inversión (FID) aprobada (§5.3.3 y §5.6, pp. 27 y 32).
- **Pérdidas de producción**: «events which occur and prevent an asset achieving its SMPP and are not classified within other categories» (§5.8, p. 34). Fórmula: `PL = SMPP − UPP − CPD − EPP − AWP` (p. 34; AWP = *Actual Wellhead Production*).
- **Eficiencia**: `PE = AWP ÷ SMPP` y `EPE = AWP ÷ EMPP` (eficiencia económica) (p. 34).

**Qué potencial tiene cada choke** (NSTA §5.4, pp. 29–30):

| Choke | Potencial | Frontera (§5.2, p. 23) |
|---|---|---|
| **Pozos** (incluye el reservorio para el potencial) | «the sum of the individual operating well flow rates **tested at the optimum operating condition**». La tasa puede declinar «according to a reduction based on well test rate trend». Con levantamiento artificial, el potencial incluye «any uplift from artificial lift». El pozo cuenta en el potencial «until it is unable to flow»; sacarlo «requires regulator approval». | Desde el árbol hasta la conexión exterior de la válvula lateral de producción (*production wing valve*) y de las válvulas del anular |
| **Planta** | «maximum production rate of the primary product through the Plant choke […] when no interruptions occur». Restringen «**water, gas, oil processing, flare limits or water disposal limits**». «**Plant potential should not be reduced for planned or unplanned shut-downs**» | En tierra: la brida aguas abajo de la primera válvula de aislamiento después de las facilidades de proceso |
| **Exportación** | «Export losses are due to factors outside the control of the Platform operations, and Market constraints should not reduce the Export potential» | Hasta el punto de transferencia de custodia (crudo) |
| **Mercado** | «the maximum volume which can be received at the duty transfer point», con nominaciones de gas | Transferencia de custodia / entrada al sistema agregado (gas) |

**El choke dominante** (NSTA §5.4, p. 28): «the Dominant choke is calculated automatically by determining the lower potential specified. By design, **no two potentials should be exactly the same**. If they are you must provide an explanation.»

#### (b) Qué componente restringe en cada momento, y qué pasa con varias restricciones a la vez

Hay que separar dos usos del choke que la circular junta en un solo campo:

1. **Choke estructural del activo.** Es una propiedad del campo en un período: cuál de los cuatro tiene el menor potencial. Es lo que TRIM tiene hoy en `Campo.choke` y en `PlantaCampo.chokes` (§2). En la NSTA no cambia evento a evento.
2. **Choke del evento.** Es lo que pide la C-024 en `choke_mod`: dónde se originó o materializó la parada concreta (C24 p.4, Paso 2: «Identificar el cuello de botella físico o limitación funcional donde se materializa la parada»). La NSTA hace lo mismo con las pérdidas: cada pérdida se reparte a su choke y dentro de él a su *source of loss* («Each choke production loss will be further split into the relevant source of loss category», p. 34; «Individual choke production loss values are summed together to obtain the total production loss», p. 28).

**Varias restricciones a la vez.** `[DATO negativo]` No existe una regla publicada de prorrateo de un mismo barril entre dos causas simultáneas. inv-02 §2.D e inv-17c §7.2 lo buscaron en la NSTA, la SPE, el API MPMS y la norma colombiana, sin éxito. Esta investigación tampoco lo encontró en la guía NSTA 2025. Lo que sí hay:
- La C-024 exige **Unicidad**: «un solo flujo de clasificación completo por parada» (C24 p.5). Una parada lleva **un** choke, **un** responsable y **una** causa N1/N2. No se reparte.
- La NSTA pide que cada pérdida vaya a **una** categoría y a un choke, y que el total cierre contra el cálculo (2,5 %, §6.2, p. 38).
- El principio de SPE-36848 es que la pérdida está donde el flujo se restringe.

**Regla operativa propuesta** `[INFERENCIA]`: es la que TRIM ya aplica en `causa-senal.ts` para la causa, extendida al choke.
- **Gana el evento que se originó primero** (la raíz de la cascada). Si el compresor cae y por eso se cierran pozos, el choke es PLANTA aunque se haya cerrado un pozo. TRIM ya lo hace para la causa: «La bomba que paró ANTES de que cayera el servicio manda sobre él» (`causa-senal.ts`, cabecera, regla 2). Si dos servicios cayeron a la vez, toma el primero (`elPrimero`).
- **Un evento posterior e independiente sobre un pozo ya parado no crea una segunda diferida.** El pozo ya no estaba produciendo. Se registra como contribuyente en `desc_evid`, sin volumen.
- **Si la causa original termina y el pozo sigue parado por otra causa, la parada se parte en dos tramos**, cada uno con su choke. Es lo que TRIM ya hace al no tomar como cascada «Lo que cierra horas después, con el servicio todavía caído» (cabecera de `causa-senal.ts`, regla 1). **NO VERIFICADO:** que la ANH acepte dos registros consecutivos para un mismo pozo con `h_fin_paro` = `h_ini_paro`. La circular no lo dice. Pregunta para Edinson.
- **Las restricciones de capacidad sin evento** (curtailment, tanque de agua al límite en régimen, nominación) llevan el choke del componente cuyo potencial es el menor en ese tramo (el choke dominante de la NSTA).

#### (c) La descomposición del potencial: técnico, operativo, planeado y no planeado

Dos fuentes publicadas dan la escalera completa:

```
Potencial del reservorio                          (lo que el yacimiento puede dar)
 └─ brecha de desarrollo        → Reservorio / proyectos (CPD, UPP)
Potencial instalado / técnico (pozo en su óptimo,  ← NSTA WMPP «tested at the optimum operating condition»
     levantamiento incluido)                         ← C-024: «el sistema de levantamiento se encuentra en condición optimizada»
 └─ brecha de desempeño          → ingeniería de producción (levantamiento no optimizado, daño)
Potencial disponible
 └─ brecha de disponibilidad     → mantenimiento y confiabilidad  ← AQUÍ VIVE TRIM
       ├─ planeada   (mantenimiento, pruebas, workover, TAR)
       └─ no planeada (disparos, fallas, terceros, clima)
Potencial operativo
 └─ brecha de capacidad / operativa → operación (setpoints, curtailment, decisiones)
Producción real
```

Fuentes: la jerarquía de brechas es de la patente US 8,195,401 B2 (*Dynamic production system management*), citada verbatim en inv-02 §2.D: «the sum of the field development gap, performance gap, availability gap, and capacity gap accounts for a total deferred or in certain instances lost production». Los potenciales son de NSTA 2025 §5.3–5.4. La separación planeada/no planeada es de NSTA §6.4 (p. 43): «Planned means that the activity is defined within the facility planning process (at the beginning of year). This category includes unplanned over-runs of the planned activities (e.g. TAR exceeding the originally planned duration).»

Tres consecuencias para TRIM:
1. **Lo planeado también es diferida.** Lo dicen la NSTA («Plant potential should not be reduced for planned or unplanned shut-downs», p. 29) y la C-024 («Las diferidas de producción podrán originarse, entre otras, por Paradas Planeadas o Paradas No Planeadas», C24 p.4). TRIM ya lo trata así: `programada` cae en el libro de diferidos.
2. **El exceso de una parada planeada.** En la NSTA, la sobre-duración de una parada planeada se queda en la categoría planeada. En la C-024 el criterio es «previsto (Planeada) o súbito (No Planeada) dentro de la programación oficial del activo» (C24 p.5, Paso 4). La circular **no dice** qué hacer con el exceso. `[INFERENCIA]` Lo prudente es partir la parada en dos: el tramo dentro del programa es planeado y el exceso es no planeado, con su propia causa. Así no se esconde una falla bajo un mantenimiento. **NO VERIFICADO** con la ANH.
3. **«Potencial optimizado».** **NO VERIFICADO** como término definido: no se encontró una definición primaria con el nombre exacto *optimised potential*. Lo que sí está verificado es el concepto, en dos fuentes:
   - la NSTA mide el potencial del pozo «at the optimum operating condition […] inclusive of any uplift from artificial lift»;
   - la C-024 cuantifica la diferida contra «la última prueba de potencial reportada a la ANH» con «el sistema de levantamiento […] en condición optimizada» (C24 p.4).

   Consecuencia `[INFERENCIA]`: **un pozo que produce por debajo de su prueba porque su levantamiento no está optimizado** (por ejemplo, una ESP con la frecuencia bajada) **genera diferida** ante la ANH. Es el caso `HZ` de TRIM (`libro.ts`, `perdidaPorFrecuencia`). Ver la parada parcial en §3.

#### (d) Una aclaración que evita un error de lectura

En inglés, la NSTA y PRODML llaman *production loss* o *lost production* a lo que la ANH llama **DIFERIDA**: potencial menos real. Lo que la ANH llama **PÉRDIDA** (hidrocarburo ya producido que no se comercializa) **no es** la *production loss* de la NSTA. De hecho, la NSTA dice lo contrario para la quema: «Note that in the SPE guidelines, **Flare & Vent volumes are not losses** but part of the PE calculation» (NSTA 2025 §5.8, p. 33). Ver §4 y §5.3.

## 2. ANH vs. TRIM: equivalencia de los cuatro chokes

### 2.1 Qué tiene TRIM hoy (leído del código, sin tocarlo)

| Dónde | Qué es | Valores | Quién lo usa |
|---|---|---|---|
| `src/entities/tipos.ts:101-102`, `Campo.choke` | «Qué limita al campo, dicho por la operación. **Descriptivo.**» Un valor por campo, fijo | `'Pozos' \| 'Planta' \| 'Evacuación' \| 'Mercado'` | `src/entities/campos.ts` (demo y respaldo `'Pozos'` para un campo desconocido, línea 60); `src/shared/api/contrato.ts:272-291` (el códec de `GET /api/campos` rechaza otros valores); `docs/backend/sql/esquema.sql:60,67` (`check (choke in (...))`); `tablas.json`; `CONTRATO.md:239`; `docs/backend/03-modelo-de-datos.md:142-147`; `docs/backend/anexo-c-normas.md:13` |
| `src/entities/planta.ts:44-47`, `Chokes` | «Los cuatro cuellos de botella del modelo de NSTA/SPE. El potencial del campo es el MENOR de los cuatro» | `{ pozos, planta, evacuacion, mercado }` en bbl/d de crudo | Viaja en `GET /api/catalogo → campos[c].planta` (`esquema.sql:134-151`, `planta_campo.choke_*`) |
| `src/entities/planta.ts:66`, `trenesEnCrudo` | Capacidad de cada tren (crudo, agua y gas) en barriles de crudo: «El que menos deja pasar es el que manda en planta» | — | Esquema de planta |

Hallazgos:
1. **Ninguna pantalla lee `Campo.choke` ni `PlantaCampo.chokes`.** Una búsqueda de `choke`/`chokes` en `src/` (sin distinguir mayúsculas) solo los encuentra en los tipos, en los datos del demo y en el códec. Hoy son dato muerto en la interfaz. Cambiarlos no rompe ninguna pantalla, pero sí el contrato y el SQL.
2. **`Campo.choke` y `PlantaCampo.chokes` dicen lo mismo dos veces.** En el demo coinciden: el choke declarado es el menor de los cuatro números en los cinco campos (por ejemplo, Guacamayo `'Evacuación'` con `evacuacion: 6800`, el menor). Pero nada obliga a que coincidan. Es el mismo riesgo que la NSTA ataja calculando el choke dominante automáticamente (§1.2a).
3. **Ningún evento de TRIM lleva choke.** `Causa` (`causa-senal.ts`) tiene `tipo`, `equipo`, `parte`, `como`, `evidencia` y `texto`, pero no tiene choke, responsable, planeada ni diferida/pérdida. La C-024 los pide **por parada** (`choke_mod`, `resp_par`, `pla_no_plan`, `dif_perd`; C24 p.8).

### 2.2 La equivalencia

| ANH (`choke_mod`, C24 p.8) | SPE-36848 (1996) | NSTA 2025 | TRIM hoy (`Campo.choke`) | Comentario |
|---|---|---|---|---|
| `RESERVORIO` | Reservoir (*Reservoir Management*) | Dentro de «Wells» para el potencial; aparte para pérdidas («Reservoir: This covers all reservoir related losses e.g. lack of voidage», §6.3, p. 39) | — (no existe) | TRIM no tiene dónde ponerlo. La NSTA tampoco le calcula un potencial propio. |
| `POZO` | Wells (*Well Availability and Utilization*) | Wells, con pérdidas en *Wellhead* y *Completion*. Completion incluye «Failure of any component of an ESP (includes power supply if within the well completion boundary)» (p. 39) | `'Pozos'` | Equivalente directo. |
| `PLANTA` | Plant (*Topsides Availability and Utilization*) | Plant: Oil, Gas, Gathering system, Power system, Produced water, Utility, Injection, Control, Structural, TAR (pp. 40–43) | `'Planta'` | Equivalente directo. **Ojo:** la NSTA pone en el **sistema de recolección** (*Gathering system*: «flowline network […] from the Well wing valve to Plant», p. 40) y en el **sistema eléctrico de distribución hasta el levantamiento artificial** (p. 41) en PLANTA, no en POZO. Ver §3. |
| `EXPORTACION` | Export system | Export: Pipeline, Shuttle tanker, Blending/back-out, terminal planeado/no planeado, X-over, Force majeure, Utilities import (pp. 43–44) | `'Evacuación'` | Equivalente directo. «Evacuación» es el término usual en Colombia. En el reporte: `EXPORTACION` (circular) o «EXPORTACIÓN» (diccionario), sin resolver (§3.0). |
| *(no existe)* | *(no existe; en gas habla de DCQ)* | Market: Contractual, Sanctions, Government/Regulator, Buyer nominated contracts, Force majeure (pp. 44–45) | `'Mercado'` | **La ANH no tiene MERCADO.** Lo de mercado (nominación, terminal o cliente que no recibe) cae en `NP_TRANSP` («Restricción nominación/entrega», «Terminal/cliente no recibe», C24 p.7). `[INFERENCIA]` En el reporte va como `EXPORTACION`, con responsable `Externo-Transportador`. |

### 2.3 Qué cambiar (recomendación, sin código)

1. **Separar los dos conceptos con dos nombres.**
   - El *choke dominante del campo* es un atributo del campo en un período. Es lo que hay hoy.
   - El *choke de la parada* (`choke_mod`) es un atributo de cada evento. Es lo nuevo y lo que exige la circular.

   Confundirlos lleva a reportar todas las paradas de La Ceiba como PLANTA porque «La Ceiba es de planta», lo que es falso para una ESP quemada.
2. **El choke de la parada usa el vocabulario cerrado de la ANH**: POZO, PLANTA, EXPORTACION/EXPORTACIÓN y RESERVORIO.
   - **Corrección (21-oct, a raíz de R1 §8):** la circular escribe `"EXPORTACION"` sin tilde (C24 p.8), pero el Diccionario V3.2 escribe «EXPORTACIÓN», y el Schema V3.1 no valida el valor (§3.0). **NO VERIFICADO** cuál acepta el receptor.
   - Por eso TRIM guarda un código interno y serializa según la versión del catálogo (§6.1, pieza 1).
   - La etiqueta en pantalla puede decir «Exportación (evacuación)» para el operador colombiano.
3. **El choke dominante del campo se calcula, no se declara.**
   - Se obtiene de los potenciales por choke, como la NSTA: el menor gana, y un empate obliga a explicarlo.
   - `Campo.choke` deja de ser texto libre de la operación. O se elimina y se deriva de `PlantaCampo.chokes`.
   - Sus valores se alinean con la ANH: Pozos (que incluye el reservorio, como la NSTA), Planta y Exportación (que incluye mercado).
   - Si se quiere conservar «Mercado» para campos de gas como La Zarza, que sea un **subnivel** de Exportación, nunca un quinto valor reportable.
4. **Corregir la referencia normativa.** `docs/backend/anexo-c-normas.md:13` atribuye los cuatro chokes Pozos/Planta/Evacuación/Mercado a «NSTA / SPE». Debe citar **SPE-36848 (Reservorio, Pozos, Planta, Exportación) como la fuente que adopta la ANH** y la NSTA como la variante británica que añadió Mercado y fundió el reservorio con los pozos para el potencial.
5. **RESERVORIO entra al modelo** solo como valor de la parada, no como potencial calculable. Para TRIM es raro: las causas de reservorio no salen de señales de equipo (§3).

## 3. Reglas operativas para asignar el choke a una parada concreta

### 3.0 Antes de la tabla: ¿cuáles son los valores «exactos»? Las tres fuentes oficiales no coinciden

Revisé los tres artefactos oficiales que están en `investigacion/fuentes/`. Para los campos de clasificación, **ninguno es una fuente única y coherente**:

1. **JSON Schema V3.1** (`20260731_Esquema_JSON_V3.1_ANH.json`, codificado en UTF-16).
   - `segmento_datos.paradas_pozo` es un arreglo de objetos con los 15 campos en `required` y `additionalProperties: false`.
   - Los 15 campos son `$ref: #/definitions/tuplaString` (o `tuplaDateTime` en las horas). **El Schema no trae ningún `enum`** para `choke_mod`, `dif_perd`, `pla_no_plan`, `resp_par`, `cau_niv1` ni `cau_niv2`: valida que sean texto y nada más.
   - El único `enum` es el del origen de la tupla: `["A", "M", "C", "Fijo", ""]`. Es más amplio que el «A, M o C» de la circular (C24 p.2).
   - Conclusión: el rechazo por catálogo que anuncia la circular (C24 p.7) **no lo hace este Schema**. Lo hará otra capa del receptor. Esa capa es **NO VERIFICADO**: no está publicada en lo que tenemos.
2. **Plantilla** (`20260731_JSON_IDP_TipoUnico_V3.1_AHN.json`).
   - `paradas_pozo` trae un objeto vacío de ejemplo: los campos de identificación con origen `"A"`, la clasificación con `"M"` y las horas como `["2026-07-31T10:00:00Z", "M", "ISO 8601 DateTime"]`.
   - La unidad de las horas es la cadena `"ISO 8601 DateTime"`. Esto responde la duda de R1 §1.7 sobre la unidad de `tuplaDateTime`.
3. **Diccionario de Datos V3.2** (`20260820_Dicionario_de_Datos_JSON_V3.2_ANH.xlsx`, hoja `JSONV3`, filas 128–142; la celda A1 dice «JSON IDP V3.0»). Sus «LISTAS DE VALORES» **contradicen a la circular** en casi todos los campos de clasificación:

| Campo | Circular 024 (C24 p.5–8) | Diccionario V3.2 (fila) | Diferencia |
|---|---|---|---|
| `choke_mod` | `"POZO"`, `"PLANTA"`, `"EXPORTACION"`, `"RESERVORIO"` | `POZO PLANTA EXPORTACIÓN RESERVORIO` (139) | **EXPORTACIÓN con tilde** en el diccionario. Su descripción, «Modelo de estrangulador utilizado, si es relevante en la detención», **contradice** la definición de la circular, que dice expresamente que el choke NO es la válvula (C24 p.4). |
| `dif_perd` | `"DIFERIDA"`, `"PERDIDA"` | `DIFERIDA PERDIDA` (137) | Coinciden. |
| `pla_no_plan` | `"PLANEADA"`, `"NO PLANEADA"` | `PLANEADA NO PLANEADA` (133) | Coinciden. |
| `resp_par` | «Operador-Operación», «Operador-Mantenimiento», «Operador-Planeación/Logística», «Externo-Proveedor Energía», «Externo-Transportador», «Comunidad», «Autoridad/Regulador», «Tercero», «Fuerza Mayor (Clima/Natural)» (Paso 1) | `OPERADOR - OPERACIÓN`, `OPERADOR - MANTENIMIENTO`, `OPERADOR - PLANEACIÓN/LOGÍSTICA`, `EXTERNO - PROVEEDOR ENERGÍA`, `EXTERNO - TRANSPORTADOR`, `COMUNIDAD`, `AUTORIDAD / REGULADOR`, `TERCERO`, `FUERZA MAYOR (CLIMA/NATURAL)` (138) | Mayúsculas y « - » con espacios. El ejemplo de la descripción de la circular («Mantenimiento», C24 p.8) no es ninguno de los dos. |
| `cau_niv1` | **El código** N1_KEY: `P_MANT_ELE` … `NP_AUT`, con el ejemplo `["P_MANT_ELE", "M", "string"]` (C24 p.7–8) | **El texto** N1_TEXT en mayúsculas: `PLANEADA - MANTENIMIENTO ELÉCTRICO` … `NO PLANEADA - AUTORIDAD / RESTRICCIÓN` (140) | **Contradicción de fondo:** código o texto. |
| `cau_niv2` | Las 117 cadenas de la Tabla 1 (transcritas en R1 §1.5) | Las mismas en mayúsculas, con estas diferencias (141): `PRUEBA DE POZO (POTENCIAL/PLT)` frente a «Prueba de pozo (presión transiente, producción, potencial, PLT, ILT, otros)»; `OPERACIÓN POR BALANCE DE INVENTARIOS (PLANIFICADO)`; **`FALLA INSTRUMENTO/SENSOR` pasa de `NP_CTRL` a `NP_INS`**; `PERDIDA LINEA DE VISTA (FLORA)`; `FALLA CONFIGURACIÓN/PARAMETRIZACIÓN (PLC/VSD/CONTROL)`; el orden de `NP_CLIMA` y `NP_OPUB` cambia (como en el árbol, R1 §2.2 diferencias 6–7) | Distintas cadenas, y un N2 que cambia de N1. |

**Consecuencia para TRIM** `[INFERENCIA]`:
- El catálogo interno **no debe guardar la cadena de la ANH como su clave**. Debe guardar un **código interno estable** por cada pareja (N1, N2) y cada valor de choke, responsable, impacto y planeación.
- La cadena que se escribe en el JSON sale de una **tabla de serialización versionada** (circular 024, diccionario V3.2 y lo que venga después). Así, cuando la ANH aclare si `cau_niv1` lleva código o texto y si EXPORTACION lleva tilde, se cambia una tabla y no los datos históricos.
- En lo que sigue uso la forma de la **circular** (N1_KEY y cadenas de la Tabla 1, según R1 §1.5) porque es el acto administrativo. **Hasta que la ANH lo aclare en las mesas de trabajo (C24 p.10), cuál de las dos formas acepta el receptor es NO VERIFICADO.**

**Una fuente más que responde dónde va cada choke.** El *Anexo Técnico de Interoperabilidad IDP* de la Circular 003/2026 (`fuentes/anexo-tecnico-interoperabilidad-idp.pdf`, cap. 1) trae las mismas definiciones que la C-024. Por eso la C-024 dice «en el marco del presente anexo»: el texto es heredado. Esto resuelve la nota de R1 §1.3. Además trae **ejemplos por choke** que la C-024 no repite (§1.4.2, p. 5 de 38):

> «**Pozo:** fallas de levantamiento artificial, arenamiento, integridad del pozo. **Planta / Facilidades:** fallas en separadores, tanques, sistemas de tratamiento. **Exportación / Transporte:** indisponibilidad de líneas, restricciones de entrega, tanques llenos. **Reservorio:** conificación de agua, declinación abrupta, problemas de conectividad.»

Y ejemplos de impacto (§1.4.3, p. 6): «**Diferida:** parada por mantenimiento eléctrico de 12 horas cuya producción puede recuperarse. **Pérdida:** derrame de crudo o quema de gas ya producido que no puede recuperarse.» El anexo también describe a cada responsable (§1.4.1, p. 4–5), por ejemplo: «Externo – Transportador: indisponibilidad de oleoductos, gasoductos o facilidades de evacuación». **NO VERIFICADO:** si este capítulo sigue vigente después de la C-024. La C-024 reemplaza el JSON V2.0, pero no deroga expresamente la metodología del anexo, y sus definiciones son idénticas. Lo uso como guía interpretativa, no como regla.

### 3.1 La regla general para el choke de una parada

`[INFERENCIA]` Sale de juntar C24 p.4–5, el anexo de la C-003 §1.4.2, SPE-36848 y NSTA §5.2 y §6.

1. **El choke es el del componente donde se ORIGINA la restricción**, no el del pozo que se cerró. La C-024 dice «se origina o materializa de manera restrictiva»; el anexo dice «donde se materializa la restricción». Un pozo cerrado porque la planta no recibe es PLANTA, aunque lo que se reporta es una «parada de pozo».
2. **Dedicado o compartido.** Para el equipo eléctrico y el de superficie, la frontera práctica entre POZO y PLANTA es si el elemento es **dedicado a un pozo** (POZO) o **compartido por varios** (PLANTA). Es exactamente el criterio del ejemplo de Edinson (Transcript l.50), «vamos a hablar qué es un transformador de media a baja»:
   - «si es en pórtico o es en una red de media, puede ser en planta»;
   - «si es ya sobre todo en una parte de distribución de unidades de bombeo, puede ser de pozo».

   El responsable es Operador-Mantenimiento. La causa es `NP_ENINT` «Falla transformador», o «Falla red interna BT/MT/AT» si el daño está en la red. Si fue mantenimiento programado: `P_MANT_ELE` «Transformador».
   - **Ojo, la NSTA es más física que funcional.** Pone el sistema eléctrico de distribución «to artificial lift equipment in Wells and Gathering System (e.g. ESPs…)» en PLANTA (Power system, p. 41) y solo deja en el pozo la alimentación de la ESP «if within the well completion boundary» (p. 39). Las líneas de flujo de cada pozo («Gathering system», desde la válvula lateral del árbol) también van a PLANTA (p. 40). Con la NSTA, un transformador elevador dedicado a una ESP en superficie sería PLANTA; con el criterio de Edinson, POZO.
   - **Recomendación:** adoptar el criterio de Edinson (dedicado = POZO), que coincide con el anexo de la C-003 («Pozo: fallas de levantamiento artificial»), y dejarlo **configurable por operadora**. Es una decisión para validar con Edinson.
3. **De la brida de salida de la batería hacia afuera (oleoducto, terminal, cliente, nominación) es EXPORTACION.** El responsable suele ser `Externo-Transportador`. Si la causa es un equipo propio de despacho (bomba de despacho, LACT), **es PLANTA**.
4. **RESERVORIO solo cuando la causa es del yacimiento** y no de un equipo: conificación de agua, declinación abrupta, conectividad (anexo C-003), o falta de soporte de presión por no inyectar (la NSTA lo llama *lack of voidage*, p. 39). Casi nunca sale de una señal de equipo.
5. **Parada parcial.** La circular cuenta como parada la «interrupción total o parcial» (C24 p.4). Una ESP con la frecuencia bajada (`HZ` en TRIM) es una parada parcial con `h_ini_paro` y `h_fin_paro` del tramo reducido. **NO VERIFICADO:** cómo quiere la ANH que se reporte una reducción sin cierre. La circular solo da horas de inicio y fin, sin fracción.

### 3.2 Los casos de TRIM, uno por uno

| Caso | Choke | Por qué (fuente) | Lo que decide si cambia |
|---|---|---|---|
| **Falla de ESP** (motor, bomba, cable o aislamiento de fondo) | POZO | Anexo C-003 §1.4.2 («fallas de levantamiento artificial»); NSTA Completion: «Failure of any component of an ESP» (p. 39); C-024 `NP_SUB` «Falla ESP» | El **variador y el transformador de superficie dedicados** son POZO por el criterio de §3.1-2, con `NP_ENINT` «Falla VSD» o «Falla transformador» |
| **Bombeo mecánico** (unidad, caja, correas, motor) | POZO | Mismas fuentes; `NP_SUP` lista las piezas de la unidad | Las varillas y la bomba de subsuelo **no tienen N2 propio** (ver §3.3) |
| **Multifásica** (transfiere la producción de varios pozos) | PLANTA | NSTA *Gathering system* y *Oil systems* = Plant (p. 40); anexo C-003: «paradas de estaciones que afectan múltiples pozos» bajo Proceso/Facilidades | Si fuera dedicada a un solo pozo (raro): POZO |
| **Reinyección/disposición con tanques de agua llenos** («pozos acuatosos») | PLANTA | NSTA: el choke de planta lo restringen los «**water disposal limits**» (p. 29); *Produced Water system* e *Injection system* = Plant (pp. 41–42). Edinson: «se empiezan a rebosar los niveles de los tanques de aguas residuales, pues hay que parar los pozos acuatosos […] Entonces ahí se va a producir una **diferida**» (Transcript l.56) | El anexo C-003 pone «tanques llenos» bajo **Exportación/Transporte**. `[INFERENCIA]` Esa frase habla del tanque de **crudo** sin evacuación; el agua de disposición no sale de la batería, así que es PLANTA. Para validar con Edinson. |
| **Bomba de inyección para recobro** (papel `recobro` en `bombas.ts`) | RESERVORIO, solo si se estima pérdida por falta de soporte | NSTA Injection system: «loss of fluids for reservoir support **does not immediately produce a production loss**, but will over time, therefore a loss should be estimated by the relevant Operator Technical Authority» (p. 42); NSTA Reservoir: «lack of voidage» (p. 39). SPE-36848: «a separate choke model can be used to model injection performance» | Si su parada no cierra pozos el mismo día, **no hay parada de pozo que reportar** en `paradas_pozo`. TRIM no debería inventar diferida inmediata. |
| **Compresión de gas** | PLANTA | NSTA *Gas systems* = Plant (p. 40); `NP_PROC` «Capacidad compresión/transferencia gas limitada» | El gas quemado en tea mientras el compresor está caído es **pérdida**, en el balance de gas y no en `paradas_pozo` (§4) |
| **Aire de instrumentos** | PLANTA | NSTA *Utility system* incluye «Lube oil, hydraulic oil and compressed air» y «Air/ Nitrogen / Inert gas system» (p. 41) | — |
| **Energía externa** (proveedor, subestación externa, acometida externa) | PLANTA (`[INFERENCIA]`) | La restricción se materializa en el sistema eléctrico del campo. NSTA *Power system* incluye «incoming power supplies» (p. 40). El responsable lo dice la C-024: «Externo-Proveedor Energía», `NP_ENEXT` | Si la acometida externa alimenta **un solo pozo** aislado: POZO. **Ojo:** la NSTA tiene «Utilities import» en Export (p. 44), pensado para plataformas que importan servicios por la ruta de exportación. No aplica a tierra. |
| **Oleoducto o terminal externo / nominación** | EXPORTACION | Anexo C-003: «Exportación / Transporte: indisponibilidad de líneas, restricciones de entrega, tanques llenos»; `NP_TRANSP` | Responsable `Externo-Transportador`; si fue atentado al oleoducto, `NP_TRANSP` «Atentado/sabotaje oleoducto externo» (no `NP_OPUB`, porque la pareja más específica gana) |
| **Declinación** | RESERVORIO | Anexo C-003: «declinación abrupta» bajo Reservorio | **No es una parada**: no hay inicio ni fin. Ante la ANH aparece como diferida contra la última prueba hasta que se haga una prueba nueva (C24 p.4). **No hay N2** para declinación en la Tabla 1. |
| **Arenamiento** | POZO | Anexo C-003 lo pone expresamente en **Pozo**; `NP_SUB` «Arenamiento / obstrucción» | Aunque el origen sea la formación, la ANH lo quiere en POZO |
| **Conificación / alto corte de agua** | RESERVORIO | Anexo C-003: «conificación de agua» bajo Reservorio; `NP_SUB` «Alto BSW / corte de agua» | Combinación válida aunque `NP_SUB` sea «Mecánica subsuelo»: la circular no ata el N1 al choke (R1 §2.1) |

### 3.3 Cada `TipoCausa` de TRIM en el árbol de la ANH

Cómo se lee la tabla:
- Columnas en el orden de los 6 pasos (C24 p.5).
- `resp_par`, `choke_mod`, `dif_perd` y `pla_no_plan` con los valores de la circular; N1 = N1_KEY y N2 = cadena exacta de la Tabla 1 (R1 §1.5). La forma del diccionario está en §3.0.
- **«Falta»** = el dato que TRIM no tiene hoy y que decide la casilla.
- La regla de §3.1-1 manda: el choke es el del origen.

| `TipoCausa` (`causa-senal.ts`) | `resp_par` | `choke_mod` | `dif_perd` | `pla_no_plan` | `cau_niv1` | `cau_niv2` | Justificación | Falta |
|---|---|---|---|---|---|---|---|---|
| `reinyeccion` (bomba de disposición parada → tanque alto → pozos cerrados o con frecuencia bajada) | Operador-Mantenimiento si la bomba falló; Operador-Operación si se cerró por decisión sin falla | `PLANTA` | `DIFERIDA` | `NO PLANEADA` | Según la parte que falló: `NP_SUP` (mecánica), `NP_ENINT` (eléctrica: «Falla VSD», «Falla MCC/Switchgear»), `NP_INS` / `NP_CTRL` (instrumento o control). Sin parte: `NP_PROC` | Con parte: `NP_SUP` «Falla rodamiento/cojinete (bearing box)» o «Falla motor superficie»; `NP_ENINT` «Falla VSD»… Sin parte: `NP_PROC` «Parada estación/bombeo afecta pozos». Sin falla, por capacidad: `NP_PROC` «Tanques llenos / capacidad limitada» | Paso 6 pide la «falla raíz que detuvo la producción» (C24 p.5): la raíz es la bomba, no el tanque. **No existe N2 para «bomba de reinyección»** (R1 §1.5) | La **parte** de la bomba: TRIM ya la busca (`deducirParada`). Si queda en «sin parte», cae al N2 genérico |
| `transporte` (multifásica) | Operador-Mantenimiento | `PLANTA` | `DIFERIDA` | `NO PLANEADA` | Igual que `reinyeccion` | Sin parte: `NP_PROC` «Parada estación/bombeo afecta pozos» | NSTA *Gathering/Oil systems* = Plant; anexo C-003 Proceso/Facilidades | La parte |
| `electrosumergible` | Operador-Mantenimiento | `POZO` | `DIFERIDA` | `NO PLANEADA` | `NP_SUB` | «Falla ESP» | Anexo C-003 Pozo; NSTA Completion. Los códigos GF, PH, OL y OT son de la ESP | **UL (baja carga)** puede ser falta de aporte del yacimiento o gas, no una falla de la ESP. Entonces `NP_SUB` «Arenamiento / obstrucción», o `RESERVORIO` si es conificación o declinación. Se decide con la prueba o el diagnóstico, no con el código. Un disparo del **variador de superficie** es `NP_ENINT` «Falla VSD» (choke `POZO`) |
| `levantamiento` (bombeo mecánico, OL/UL) | Operador-Mantenimiento | `POZO` | `DIFERIDA` | `NO PLANEADA` | `NP_SUP` | Por pieza: «Falla unidad de bombeo superficie (Componentes)», «Falla caja reductora / lubricación», «Falla Correas / Poleas», «Falla motor superficie». Sin pieza: «Falla Sistema de Levantamiento Artificial» | `NP_SUP` está hecho para la unidad de bombeo | La **pieza**: TRIM no la tiene para bombeo mecánico. **Hueco ANH:** varilla partida o bomba de subsuelo no tienen N2 propio (`NP_SUB` solo trae ESP/PCP/Gas Lift). Lo menos malo es `NP_SUP` «Falla Sistema de Levantamiento Artificial». Pregunta para Edinson |
| `energia`, caso interno compartido (pórtico, subestación, red MT del campo) | Operador-Mantenimiento | `PLANTA` | `DIFERIDA` | `NO PLANEADA` | `NP_ENINT` | «Falla transformador», «Falla red interna BT/MT/AT», «Falla protecciones (breaker/fusible/relé)», «Falla por Fauna», «Punto Caliente»… | Ejemplo de Edinson (pórtico o red de media → planta) | **Topología eléctrica**: qué elementos son compartidos y cuáles dedicados. Hoy solo existe `Pozo.alimentador` («Pórtico o subestación de la que cuelga») y el servicio `SE-2` |
| `energia`, caso interno dedicado (código `UV` del pozo, transformador o variador del pozo) | Operador-Mantenimiento | `POZO` | `DIFERIDA` | `NO PLANEADA` | `NP_ENINT` | «Falla transformador», «Falla VSD», «Falla cableado interno/empalmes» | Ejemplo de Edinson (distribución a las unidades de bombeo → pozo) | Si la baja tensión vino de **afuera**. `UV` no lo distingue |
| `energia`, caso externo | Externo-Proveedor Energía | `PLANTA` (`[INFERENCIA]`, §3.2) | `DIFERIDA` | `NO PLANEADA` | `NP_ENEXT` | «Corte energía proveedor», «Baja/alta tensión del proveedor», «Falla subestación externa», «Acometida externa afectada (poste/red externa)» | C-024 Paso 1 y Tabla 1 | **Una señal en la frontera** (medidor de acometida o relé de la subestación de llegada) que diga si la tensión cayó afuera o adentro. Sin ella, lo decide una persona |
| `aire` | Operador-Mantenimiento | `PLANTA` | `DIFERIDA` | `NO PLANEADA` | **Sin N1/N2 propio.** Por raíz: `NP_SUP` «Falla motor superficie» (compresor de aire), `NP_ENINT` (alimentación), `NP_CTRL` / `NP_INS` (control) | — | NSTA *Utility system* (p. 41). La Tabla 1 no nombra el aire de instrumentos | **Hueco ANH:** no hay N2 para servicios industriales. Pregunta para Edinson |
| `compresion` | Operador-Mantenimiento si falló; Operador-Operación si se limitó | `PLANTA` | `DIFERIDA` (los pozos cerrados); el gas a tea es **PÉRDIDA**, en el balance de gas (§4) | `NO PLANEADA` | `NP_PROC` | «Capacidad compresión/transferencia gas limitada» | Es el único N2 no planeado que nombra la compresión (`NP_SUP` no trae compresor; `P_MANT_MEC` «Compresor» sí, pero es planeado) | La parte del compresor (hoy no hay catálogo de partes para C-401) |
| `evacuacion`, por causa externa (oleoducto o terminal no recibe, nominación) | Externo-Transportador | `EXPORTACION` | `DIFERIDA` | `NO PLANEADA` | `NP_TRANSP` | «Oleoducto externo fuera de servicio», «Atentado/sabotaje oleoducto externo», «Restricción nominación/entrega», «Terminal/cliente no recibe» | Anexo C-003 Exportación/Transporte | **Si el oleoducto o el cliente estaba recibiendo.** TRIM no tiene esa señal |
| `evacuacion`, por equipo propio (TK-102 propio, LACT-01) | Operador-Mantenimiento u Operador-Operación | `PLANTA` | `DIFERIDA` | `NO PLANEADA` | `NP_PROC` (tanque) o `NP_INS` (medidor) | «Tanques llenos / capacidad limitada»; `NP_INS` «Falla transmisor de nivel» o «Error de calibración» | En TRIM, `evacuacion` agrupa equipos **dentro** de la batería (`equipos.ts`: TK-102 «Tanque de crudo en especificación», LACT-01 «punto de medición oficial»). Su origen es del operador | Ídem. **Defecto del código:** `CATEGORIA_DE.evacuacion = 'externa'` (`causas.ts`) lo da siempre por externo |
| `proceso` (separador) | Operador-Operación o Operador-Mantenimiento | `PLANTA` | `DIFERIDA` | `NO PLANEADA` | `NP_PROC` (capacidad) o `NP_INS` (nivel o interfase) | «Capacidad tratamiento agua/crudo limitada»; `NP_INS` «Falla transmisor de nivel» | Anexo C-003: «fallas en separadores» = Planta | La raíz (instrumento, proceso u operación) |
| `tratamiento` (tratador térmico) | Operador-Mantenimiento u Operador-Operación | `PLANTA` | `DIFERIDA` si se cerraron pozos; **`PERDIDA` solo si se perdió crudo** fuera de especificación que no se pudo reprocesar (§4) | `NO PLANEADA` | `NP_PROC` | «Capacidad tratamiento agua/crudo limitada» | Anexo C-003: «sistemas de tratamiento» = Planta | Si el crudo fuera de especificación se recirculó (normal) o se perdió |
| `programada` (programa aprobado en la configuración) | Operador-Mantenimiento, Operador-Operación u Operador-Planeación/Logística, según la actividad | El del equipo intervenido | `DIFERIDA` | `PLANEADA` | `P_MANT_ELE`, `P_MANT_MEC`, `P_MANT_INS`, `P_MANT_INT`, `P_WO`, `P_PRUEBAS`, `P_PES` u `P_OP`, según la actividad | La de la actividad, por ejemplo `P_MANT_MEC` «Bomba (superficie)», `P_MANT_MEC` «Sistema de Levantamiento Artificial», `P_PRUEBAS` «Prueba de pozo (presión transiente, producción, potencial, PLT, ILT, otros)», `P_OP` «Curtailed por decisión operativa» | C-024 Paso 4: «previsto […] dentro de la programación oficial del activo» | **El programa de TRIM solo guarda `motivo` en texto libre** (`enPrograma` → `pr.motivo`). Le falta tipo de actividad (N1/N2), responsable y choke. **El exceso de duración** sobre el programa debería ser un tramo `NO PLANEADA` aparte (§1.2c) |
| `declarada` (la escribió un operario) | Lo elige quien declara | Lo elige quien declara | Lo elige quien declara | Lo elige quien declara | Lo elige quien declara | Lo elige quien declara | La captura tiene que pedir los 6 pasos en orden, con listas cerradas (C24 p.5) | Hoy `Respuesta` solo tiene `texto`, `parte` y `modo`: **no tiene choke, responsable, impacto, planeación ni N1/N2** |
| `pendiente` (sin identificar) | — | — | — | — | — | — | Los 15 campos son obligatorios (Schema `required`) y no hay valor «sin identificar». El único N2 «pendiente» es «Orden público - Pendiente detalle», y solo vale para orden público | **No se puede reportar.** Hay que resolverlo antes de las 07:00 del día siguiente (C24 p.8–9) o reportarlo con la mejor clasificación y evidencia. **Nunca** usar «Orden público - Pendiente detalle» de comodín |

**Reglas de coherencia** que TRIM debe validar antes de escribir el JSON (todas salen de C24 p.5–8):
- El prefijo `P_` va con `PLANEADA` y `NP_` con `NO PLANEADA`. Si no, la ANH rechaza (C24 p.7).
- El N2 tiene que pertenecer a su N1. La clave es la pareja (R1 §1.5: «Falla por falta de Mantenimiento» está en dos N1).
- Una sola clasificación por parada (Unicidad).

**Responsables que TRIM nunca deduce de una señal:** `Comunidad`, `Autoridad/Regulador`, `Tercero` y `Fuerza Mayor (Clima/Natural)`, que corresponden a `NP_OPUB`, `NP_AUT` y `NP_CLIMA`. Los declara una persona. La señal solo puede proponer «externo, sin detalle».

## 4. Pérdida de producción

### 4.1 La definición de la ANH

`[DATO]` C-024 (C24 p.4), idéntica al anexo técnico de la C-003 §1.2 (p. 2–3 de 38):

> «**Pérdida de Producción:** Volumen de hidrocarburos que **ha sido producido a superficie** y que, por condiciones operativas o no operativas, deja de estar disponible para su comercialización, tales como **derrames de crudo, fugas de hidrocarburos desde cabeza de pozo hasta el PMO, quema de gas en tea, venteos intencionales, rechazo por especificación o daños en equipos que generen pérdida de hidrocarburo**. […] este volumen se registrará como "Pérdida", en tanto **no puede ser recuperado en períodos posteriores**. La Pérdida de Producción **podrá estar sujeta a gravamen** por parte de la ANH, de acuerdo con la responsabilidad de la compañía operadora y la naturaleza del evento.»

El Paso 3 da el criterio de decisión: «si la producción no realizada puede restaurarse posteriormente [→ DIFERIDA] o si el hidrocarburo ya producido a superficie dejó de estar disponible para comercialización [→ PÉRDIDA]» (C24 p.5).

Tres consecuencias de la letra:
1. **La frontera espacial es de la cabeza de pozo al PMO.** Lo que se pierde después del Punto de Medición Oficial ya no es del operador. En el oleoducto es «Pérdidas No Identificadas» del transportador, con umbral de 0,5 % (Res. MME 574/2026 art. 22, verificado en inv-17c, fila C13).
2. **La frontera de estado es «ya producido a superficie».** Un barril que se queda en el yacimiento nunca es pérdida para la ANH, aunque no se recupere jamás (daño de formación, conificación). Ese barril es diferida mientras se mida contra la prueba. Si el potencial cae de verdad, sale del potencial con la prueba nueva.
3. **La pérdida tiene consecuencia fiscal.** «Podrá estar sujeta a gravamen» (C24 p.4).
   - En el balance mensual de crudo (Cuadro 4 de la Res. MME 40537/2024), «las pérdidas se restan sólo cuando sean por casos fortuitos (Atentados o fenómenos naturales)» (nota 4 del formato, verificado en inv-17c §6.2a).
   - `[INFERENCIA]` Por eso el **responsable** de la pérdida (Paso 1) decide la plata. Un derrame clasificado como `Tercero` o `Fuerza Mayor (Clima/Natural)` se descuenta de la producción gravable. Uno con responsable `Operador-*` paga regalía sobre barriles que no se vendieron.

### 4.2 La contradicción de Edinson y la versión correcta

Edinson, en la reunión (Transcript l.50): «La diferida es que la producción de crudo, el hidrocarburo como tal, todavía está en subsuelo, sí, no ha salido a superficie, no se ha producido. Y la pérdida es cuando **ya estando en subsuelo** hay un derramamiento de fluidos sobre el cuerpo de agua o sobre tierra. Se pierde o hay una ruptura de una línea física.»

- **La frase es contradictoria tal como quedó transcrita.** Un derrame sobre agua o tierra, o la ruptura de una línea, ocurre en superficie, no en el subsuelo. Sus propios ejemplos («ruptura de una línea física»; y en l.56, «si hay una pitera […] eso es una pérdida») son de superficie.
- **La versión correcta es la de la circular:** «producido a **superficie**» (C24 p.4 y p.5, Paso 3). `[INFERENCIA]` Lo más probable es un lapsus o un error de la transcripción automática: quiso decir «ya estando **en superficie**». La primera mitad de su frase («la diferida […] todavía está en subsuelo») sí coincide con la norma.
- **Matiz que sí hay que conservar de Edinson:** la diferida NO es solo «lo que está en el subsuelo». La C-024 también llama diferida a lo que no se produjo por una restricción de superficie: el pozo cerrado porque la planta no recibe. El crudo sigue en el yacimiento porque el pozo se cerró, no porque el yacimiento falló. La regla limpia es **«¿salió a superficie y se perdió?» → PÉRDIDA; «no salió» → DIFERIDA**, sin importar dónde estaba la falla.
- **Para confirmar con Edinson** en la próxima sesión: que decía «superficie». Y qué entiende por «pitera»: en jerga de campo, una fuga pequeña por poro o picadura de corrosión en una línea; el sentido es **NO VERIFICADO**, deducido del contexto.

### 4.3 Cómo se mide cada tipo de pérdida en la industria, y dónde va en el JSON

`[DATO]` El IDP V3.1 **no lleva el volumen de pérdida en `paradas_pozo`**; R1 §1.7 ya notó que ese nodo no tiene campo de volumen. El volumen va en los **balances** (Schema V3.1, `segmento_datos`; Diccionario V3.2):
- `balance_fluido_crudo.perdidas`: «Mermas operativas o volúmenes perdidos en procesos», bbl, origen `M` (fila 216). El balance es por facilidad, con su `id_rec`.
- `balance_fluido_agua.perdidas` (fila 230) y `balance_fluido_blancos.perdidas` (fila 242).
- `balance_fluido_gas.quemado`: «Volumen desechado y quemado en la Tea (Flaring)», mmscfd (fila 253).
- **El balance de gas no tiene campo de venteo.** Sus 14 campos son `produccion`, `consumido`, `quemado`, `ventas`, `inyectado`, `generacion_electrica`, `urbano`, `transformado`, `gas_lift`, `enviado_planta`, `entregas`, `recibos`, `balance` e `id_rec`. **NO VERIFICADO:** dónde va el venteo intencional, aunque la circular lo nombra como pérdida. La Res. 0651/2025 sí lo define: «Gas Natural de Venteo: Es la liberación intencional del gas natural asociado generado por cambios de presión medido en miles de pies cúbicos estándar (KPC)» (definiciones, art. 3). Pregunta para R1 o la ANH.
- El medidor de gas tiene el uso `QUEMADO` en `medidor_gas.t_med_gas`, y el de líquido tiene `PERDIDAS` en `medidores_liquidos.t_med_liq` (Diccionario filas 98 y 85).

| Tipo (lista de la C-024) | Cómo se cuantifica en la industria | Señales y datos que hacen falta | Cómo lo ve el operador hoy | Dónde va |
|---|---|---|---|---|
| **Derrame de crudo / fuga o pitera** de la cabeza de pozo al PMO | (1) **Balance de fluidos**: lo que entró menos lo que salió menos la variación de inventario. Es la lógica de la ecuación 21 de la Res. 40236/2022, `L/G = (BI + R) − (CI + D)`, para la conciliación aguas abajo (inv-17c §6.2d), aplicada a un tramo. (2) **Caudal × duración**: tasa de fuga estimada por caída de presión o por diferencia de caudales, por el tiempo hasta aislar. (3) **Estimación en sitio**: área afectada × espesor, más lo recuperado. El crudo recuperado y reinyectado al proceso **no** es pérdida: el balance de crudo tiene `crudo_recuperado` | Presión de la línea de flujo o del troncal (caída sin cambio de válvulas); caudal del pozo según su prueba contra la llegada al manifold o separador; nivel de tanque contra entradas y salidas; alarmas de dique; hora de aislamiento | Informe de incidente, foto, aforo del volumen recuperado. Lo cierra el ingeniero de producción en el balance mensual, Cuadro 4 renglón (4) PÉRDIDAS (inv-17c §6.2a) | `balance_fluido_crudo.perdidas`. Si obligó a cerrar pozos, además una `paradas_pozo` (§4.4) |
| **Quema en tea** | **Medición** del caudal a tea (medidor de tea, que es el uso `QUEMADO` del medidor de gas) o estimación por balance de gas. Colombia la regula en la Res. MME 40066/2022: el art. 17 da el volumen máximo de quema operacional `Vmqo = Vr + Vvi + Vep + (Venp × F)`, con quema rutinaria, venteo recolectado, eventos planeados y no planeados por separado. El factor `Tr` lleva la quema no planeada a 0 en el año 5 (inv-17c §3.2) | Caudal al quemador; estado del compresor; presión del separador; apertura de la válvula a tea | Reporte diario de gas; Forma 30 DH mensual; cuota anual de quema (inv-17c, renglones mensuales) | `balance_fluido_gas.quemado` |
| **Venteo intencional** | Estimación por ingeniería (caudal de alivio × tiempo) o medición si hay medidor; detección de fugas por OGI y otros (Res. 40066/2022, inv-17c) | Apertura de válvulas de alivio a atmósfera, presión del recipiente | Programa de detección y reparación de fugas (LDAR) | **NO VERIFICADO** (no hay campo; ver arriba) |
| **Rechazo por especificación** | Crudo: BS&W ≤ 0,5 % y sal ≤ 20 PTB para entregar (Res. MME 40236/2022 art. 8; `docs/backend/anexo-c-normas.md`). **En la práctica, el crudo fuera de especificación se recircula al tratamiento y no se pierde.** Solo es pérdida si se degrada, se manda a disposición o se quema. Gas: fuera de especificación (Res. CREG 054/2007) → se quema → pérdida por quema (inv-17c, cadena G3) | BS&W y sal en línea y en laboratorio; volumen enviado a recirculación contra el enviado a disposición | Certificado de calidad de la LACT; rechazo del transportador | `balance_fluido_crudo.perdidas` solo por lo no recuperado |
| **Daño de equipo que genera pérdida** | Por balance del equipo o del tramo: rotura de tanque, alivio de un recipiente a la fosa, **arrastre de crudo con el agua de disposición** | Para el arrastre: aceite en agua (OIW, ppm) × caudal de agua inyectada | Análisis de OIW del agua de inyección | `balance_fluido_crudo.perdidas` |

**Un hallazgo para campos con 92–97 % de agua.** El **crudo que se va con el agua de disposición** cumple la definición de la ANH: fue «producido a superficie» y «deja de estar disponible para su comercialización». La C-024 no lo nombra, pero cae en «daños en equipos que generen pérdida» o en la mala separación.
- En un campo como La Ceiba del demo, la cuenta es OIW × caudal de agua. El demo mueve 224.200 bbl/d de agua (`planta.ts`, `caudales.agua`).
- Con un OIW **ilustrativo** de 100 ppm (no es un dato del demo ni de campo), serían 224.200 × 100 × 10⁻⁶ ≈ **22 bbl/d** de crudo perdido. Es una pérdida continua, sin parada y sin derrame, que solo ve quien mide el agua.
- `[INFERENCIA]` Es una pérdida que TRIM podría cuantificar con un instrumento que ya existe en las plantas de agua (analizador de OIW). **NO VERIFICADO** que la ANH la espere en `perdidas`. Pregunta para Edinson.

### 4.4 Pérdida con parada y sin parada de pozo

La C-024 define la pérdida **dentro** de la metodología de paradas, pero dice expresamente que «La existencia de una parada de pozo no implica, por sí misma, la existencia de una producción diferida o pérdida de producción» (C24 p.3). Y el volumen va en los balances, no en la parada. Por eso hay dos casos:

| Caso | Ejemplos | Qué se reporta |
|---|---|---|
| **Pérdida SIN parada de pozo** | Quema rutinaria; quema mientras el compresor está caído pero los pozos siguen produciendo; arrastre de crudo en el agua; pitera pequeña reparada sin cerrar el pozo; pérdida por evaporación en tanques (API MPMS cap. 19, inv-17c) | **Solo el balance** (`perdidas` o `quemado`). No hay registro en `paradas_pozo`, porque no hubo interrupción del pozo |
| **Pérdida CON parada de pozo** | Rotura de la línea de flujo: hay que cerrar el pozo **y** se derramó crudo. Disparo del compresor con cierre de pozos de alta relación gas-aceite (GOR) **y** quema durante el disparo | El balance lleva el volumen perdido. `paradas_pozo` lleva la parada… **con un solo `dif_perd`** |

**El problema del segundo caso.** Un mismo evento produce las dos cosas: barriles que no salieron mientras el pozo estuvo cerrado (diferida) y barriles que salieron y se perdieron (pérdida). La C-024 obliga a **una** clasificación por parada (Unicidad, C24 p.5). Edinson, ante el transformador, dijo «¿Qué me produce eso? Una diferida o una pérdida, puede ser cualquiera de las dos» (Transcript l.50), sin decir cómo se elige. **NO VERIFICADO; no hay regla publicada.**

Propuesta `[INFERENCIA]`:
- **Internamente, TRIM guarda los dos volúmenes por evento** (diferido y perdido). No los colapsa.
- **Para `paradas_pozo`, `dif_perd` toma el impacto de la parada misma:** `DIFERIDA` si el pozo cerró (lo no producido es recuperable), y el volumen perdido va al balance con `desc_evid` citando el evento.
- **`PERDIDA` en `paradas_pozo` solo cuando la parada no difirió nada.** Por ejemplo, un pozo que siguió fluyendo a un tanque de emergencia que después se perdió.
- **Es la pregunta abierta n.º 1 para Edinson y la ANH.** Afecta el gravamen.

## 5. Árboles de las operadoras y conversión al árbol regulatorio

### 5.1 El «árbol de diferidas» de Ecopetrol

- **Lo que se sabe, y solo por Edinson** (Transcript l.50 y l.56):
  - «esta matriz […] multiplícalo por 10 y obtienes el árbol de diferidas, como le llaman en Ecopetrol. Sí, es un monstruo»;
  - cada causa planeada «va a tener un lo más cercano a un nivel 6 en un árbol de fallas, de ejemplo, de Ecopetrol»;
  - «operadoras chiquiticas […] no tienen ni 3, 4 ítems de clasificación».
- **NO VERIFICADO: la estructura pública del árbol de Ecopetrol** (niveles, nombres, códigos). Busqué en la web (formularios 20-F de la SEC, prensa, el sitio de Ecopetrol) y no está publicado. Solo aparecen cifras agregadas de «barriles diferidos» por atentados o bloqueos en prensa, que no describen el árbol.
- `[INFERENCIA]` Qué es el «nivel 6» de Edinson tiene dos lecturas:
  - el nivel 6 de una jerarquía interna de seis niveles;
  - el nivel 6 de la taxonomía ISO 14224, que es la *unidad de equipo* (inv-02 §2.C).

  Hay que preguntárselo. Para el diseño basta con saber que **el árbol grande es mucho más fino que la ANH** (muchas hojas por cada pareja N1/N2) y que **el árbol chico es mucho más grueso** (una hoja cubre varias parejas).

### 5.2 PRODML `ReasonLost`

`[DATO]` Leído del XSD de Energistics PRODML v2.1 (`ProductionOperation.xsd`, `simpleType ReasonLost`, en la copia pública `pds-technology/devkit-c` de GitHub). Documentación del tipo: «Specifies the reasons for lost production». Tiene **26 valores**:

`3rd party processing` · `daily total loss of prod` · `extended maint turnaround` · `extended maint turnaround export` · `hse` · `marked gas` · `marked oil` · `modification project` · `operation mistakes` · `other` · `planned maint turnaround` · `preventive maint topside` · `process and operation problem` · `production` · `regulatory reference` · `reservoir` · `strike/lock-out` · `testing and logging` · `topside equipment failure-maint` · `unavailable tanker storage` · `unknown` · `weather problem` · `well equipment failure-maint` · `well planned operations` · `well preventive maint` · `well problems`

**Cómo se usa.**
- `LostVolumeAndReason` es un volumen (extensión de `eml:VolumeMeasure`) con el atributo obligatorio `reasonLost`: «Defines why the volume was lost».
- `ProductionOperationLostProduction` agrupa varios `VolumeAndReason`. El objeto `ProductionOperation` tiene `LostProduction` y **`LostInjection`** por separado.
- El paro de una instalación (`ProductionOperationShutdown`) lleva `Installation`, `Description`, `DTimStart`, `DTimEnd`, `VolumetricDownTime` («Downtime when the installation is unable to produce 100% of its capability»), `LossOilStdTempPres`, `LossGasStdTempPres` («Estimated loss of oil/gas deliveries because of the shutdown») y `Activity`.
- Según inv-02 §2.B, los códigos son los «agreed values for NCS reporting» de la plataforma continental noruega.

**Tres lecturas para TRIM:**
1. **El *lost production* de PRODML es la DIFERIDA de la ANH**, no su pérdida («loss of oil deliveries because of the shutdown»). Es el mismo cruce de palabras de §1.2d.
2. **PRODML no sirve como pivote hacia la ANH.** Es más grueso que la Tabla 1 en lo técnico: «topside equipment failure-maint» cubre `NP_SUP`, `NP_ENINT`, `NP_INS`, `NP_CTRL`, `NP_INTEG` y `NP_PROC`. Y no trae ni el responsable ni el choke. Hoy TRIM traduce `TipoCausa` → PRODML (`causas.ts`, `CATEGORIA_DE`; `CONTRATO.md` §«Reporte con PRODML»). Encadenar `TipoCausa` → PRODML → ANH perdería información. La conversión a la ANH tiene que salir **del catálogo fino de TRIM**, no de las 6 casillas PRODML.
3. **Equivalencia aproximada**, útil para operadoras que ya reportan con PRODML (`[INFERENCIA]`, no es una tabla oficial):

| `ReasonLost` | Hacia la ANH (N1 candidato; choke típico) | Problema |
|---|---|---|
| `well equipment failure-maint`, `well problems` | `NP_SUB` / `NP_SUP`; POZO | Uno a muchos |
| `topside equipment failure-maint` | `NP_SUP`, `NP_ENINT`, `NP_INS`, `NP_CTRL`, `NP_INTEG`, `NP_PROC`; PLANTA o POZO | Uno a muchos; el choke depende de dedicado o compartido |
| `planned maint turnaround`, `preventive maint topside`, `well preventive maint` | `P_MANT_*`; según el equipo | Falta saber la disciplina (eléctrica, mecánica, instrumentación o integridad) |
| `extended maint turnaround`(`export`) | El exceso: un tramo `NP_*` (§1.2c) | La ANH no tiene «sobre-duración» |
| `well planned operations`, `modification project` | `P_WO`, `P_PES` | — |
| `testing and logging` | `P_PRUEBAS` | — |
| `process and operation problem` | `NP_PROC` | — |
| `operation mistakes` | **No hay N1** para error de operación | Hueco ANH: hay que clasificarlo por su efecto físico |
| `weather problem` | `NP_CLIMA` | — |
| `strike/lock-out` | `NP_OPUB` «Paro gremios / transportadores» | Una huelga propia del operador no tiene N2 exacto |
| `regulatory reference`, `hse` | `NP_AUT` | `hse` puede ser una decisión propia (`P_OP`) |
| `3rd party processing`, `unavailable tanker storage`, `marked oil`, `marked gas` («marked» es «mercado» en noruego) | `NP_TRANSP`; EXPORTACION | — |
| `reservoir` | `NP_SUB` «Alto BSW / corte de agua»; RESERVORIO | La declinación no tiene N2 |
| `other`, `unknown`, `production`, `daily total loss of prod` | No se convierte | Agregados o comodines |

### 5.3 ISO 20815 y NORSOK Z-016

- **ISO 20815** (*Production assurance and reliability management*).
  - `[DATO]` La edición 2018 (publicada el 18-oct-2018) figura como **retirada desde el 17-06-2026** y reemplazada por la **ISO 20815:2026**, titulada «Oil and gas industries including lower carbon energy — Production assurance and reliability management» (ficha de evs.ee). Su alcance: «describes the concept of production assurance within the systems and operations» y «The only requirement mandated by this document is the establishment and execution of the production assurance programme».
  - Las definiciones verbatim de *availability*, *production availability*, *deliverability*, *downtime* («can be either planned or unplanned») y *uptime* de la cláusula 3 están en inv-02 §2.C. Se leyeron de la edición 2008.
  - La categorización de las pérdidas de producción vive en la **cláusula E.3 y el Anexo G** de la edición 2018, y la desarrolla la **ISO/TS 3250:2021** con categorías en su Anexo A (§1.1 de este documento; R3 l.96).
  - **NO VERIFICADO:** el texto de esas categorías, de la definición formal de *production loss* y de lo que cambió en 2026. Son normas de pago.
  - Lo que importa al diseño: ISO 20815 **no es un árbol de operadora**. Es el marco que exige tener un programa de aseguramiento de producción y medir la disponibilidad de producción.
- **NORSOK Z-016** (*Regularity management & reliability technology*).
  - `[DATO, débil]` Aparece en GlobalSpec como **inactiva**, de diciembre de 1998, con alcance en análisis de confiabilidad y mantenimiento para exploración, producción, proceso y transporte. Se vio solo en el extracto del buscador; la página dio 403.
  - La página de Standards Norway de la serie Z ya no la lista: hoy está NORSOK Z-008:2024.
  - **NO VERIFICADO** en esta sesión que ISO 20815 se haya escrito a partir de Z-016. Es lo que se conoce en la industria, pero no se encontró una fuente primaria legible que lo diga.
  - Para TRIM es solo antecedente histórico. No hay que implementar nada de Z-016.

### 5.4 Convertir un árbol propio en el regulatorio

**Un caso publicado** `[DATO]` (*JPT*, 29-jul-2020, «Digital tool brings clarity to reporting downtime», Murphy Oil, Global Downtime Report):
- Tenían «approximately 300 unique production-related downtime codes across eight different databases» y los llevaron a 55 códigos (−60 % y más).
- Estructura de tres niveles para producción:
  - nivel 1: **planeado/no planeado × interno/externo**;
  - nivel 2: la actividad;
  - nivel 3: el detalle operativo.
- «planned events were those that were included in a business unit's approved annual budget forecast». Ponerse de acuerdo en planeado contra no planeado fue de lo más difícil.
- El *APPEA* 2005 sobre el choke model de BP llega a la misma lección: hay que estandarizar «sources and causes of losses (people interpret these differently)» (§1.1).

**Patrones de una buena tabla de conversión** (el nombre en la industria es *mapping table*, *loss code mapping* o *crosswalk*). Son inferencias de diseño, con la fuente de cada una:

1. **No se convierte un árbol en otro árbol: se convierten hojas en atributos.**
   - El «árbol» de la ANH es en realidad **seis atributos**. Solo N1 → N2 es jerárquico, y `pla_no_plan` está atado al prefijo de N1 (C24 p.7). El árbol no conecta el responsable con N1 (R1 §2.1).
   - La tabla mapea **cada hoja del árbol propio → una pareja (N1, N2)**, más un responsable y una planeación **por defecto**.
   - El **choke no va en la tabla**: sale de dónde ocurrió el evento (§3.1). El mismo «transformador» es POZO o PLANTA según Edinson.
   - **El impacto (diferida o pérdida) tampoco va en la tabla**: sale de los volúmenes (§4.4).
2. **Del árbol fino al grueso es muchos a uno, y es fácil** (Ecopetrol hacia la ANH): varias hojas van a la misma pareja.
3. **Del árbol grueso al fino es uno a muchos, y no se resuelve con un valor por defecto** (operadora chica, o el viejo listado de 18 causas de la Res. 0651/2025, Cuadro 12, p. 58: «Eléctrico», «Mecánico», «Mantenimiento», «Facilidades»…). La hoja se marca **«requiere precisar»** y la captura hace **una pregunta más**, con las opciones que esa hoja admite. Es el patrón de TRIM: preguntar al operario solo lo que la señal no alcanza (`causa-senal.ts`, regla 5).
4. **La tabla tiene versiones con vigencia** (desde y hasta) y cada reporte guarda la versión con que se convirtió.
   - El IDP del lago de datos es **inmutable** (C24 p.9, 4.3-iii). Cambiar la tabla no puede reescribir lo ya reportado.
   - Las propias fuentes ANH ya cambiaron: la C-003 con su JSON V2.0, la C-024, el diccionario V3.2 contra la circular (§3.0), la Res. 0651 con su Cuadro 12.
5. **La tabla la firma un rol responsable** (contabilidad/regulatorio, `cont`/`reg` en `roles.ts`) y queda en el historial, como la configuración firmada de TRIM.
6. **Validación antes de usarla.**
   - Exhaustividad: toda hoja propia está mapeada, o marcada «requiere precisar».
   - Coherencia P_/NP_ (la ANH rechaza, C24 p.7).
   - La pareja N2 ∈ N1 es válida.
   - Ninguna hoja va a un comodín sin justificación.
7. **Conciliación por totales.**
   - La suma de diferidas por N1 de la ANH tiene que cuadrar con la suma por el árbol propio en el mismo período, porque es el mismo volumen, reagrupado.
   - Y las pérdidas reportadas tienen que cuadrar con el balance. La NSTA pide que lo reportado esté dentro del **2,5 %** de lo calculado (§6.2, p. 38).

**Errores típicos** (`[INFERENCIA]`, cada uno con la evidencia que lo sugiere):

| Error | Ejemplo | Cómo se evita |
|---|---|---|
| Mapear por parecido del nombre | «Hurto» (`NP_OPUB`) frente a «Hurto de instrumentación» (`NP_INS`); «Sabotaje / atentado» frente a «Atentado/sabotaje oleoducto externo» (R1 §1.5) | Regla de desempate: gana la pareja **más específica** sobre el equipo afectado |
| Mapear una hoja que no dice si fue planeada | «Mantenimiento eléctrico» sin la marca de programa → `P_MANT_ELE` o `NP_ENINT` | La planeación sale del **programa vigente** del activo (C24 p.5, Paso 4), no del nombre de la causa |
| Meter el choke en el código | «Falla transformador = PLANTA» | El choke sale de la topología: dedicado o compartido (§3.1) |
| Usar comodines | «Otro evento natural», «Orden público - Pendiente detalle» como cajón para todo | Alarma si su uso pasa de un umbral. Es la misma regla que `causas.ts`: «"Otro" NO disponible por defecto» (en el código: ««Otro» NO disponible por defecto — si se usa mucho, lo que falta es una causa común») |
| Confundir el *loss* inglés con la pérdida de la ANH | Un catálogo PRODML o NSTA importado manda todo a `PERDIDA` | `dif_perd` sale de los volúmenes, nunca del nombre del código (§1.2d) |
| Confundir el responsable con el choke | «Externo-Transportador» ⇒ EXPORTACION. Pero un contratista que rompe una línea dentro de la batería es `Tercero` y PLANTA | Atributos independientes, cada uno con su regla |
| Reescribir la historia | Corregir la tabla y recalcular los meses ya reportados | Versión congelada por reporte; las correcciones van como corrección explícita |
| Mayúsculas, tildes y espacios | `EXPORTACION` frente a `EXPORTACIÓN`; «Operador-Mantenimiento» frente a `OPERADOR - MANTENIMIENTO` (§3.0) | Código interno más tabla de serialización por versión |
| Otra definición de «planeado» | Murphy usa «dentro del presupuesto anual»; la NSTA, «definido al inicio del año»; la ANH, «dentro de la programación oficial del activo» | La operadora declara su regla en la configuración firmada, y se reporta con esa regla |

## 6. Recomendación: modelo de datos mínimo

Sin código; en prosa y tablas. El principio es el mismo de TRIM: **cada dato con su origen y su cadena de custodia**. Lo que deduce el motor queda distinto de lo que declara una persona.

### 6.1 Siete piezas

| # | Pieza | Qué guarda (mínimo) | Quién la escribe | Por qué |
|---|---|---|---|---|
| 1 | **Catálogo regulatorio versionado** | Por versión (C-024, Diccionario V3.2, la que venga): vigencia; los valores de responsable (9), choke (4), impacto (2) y planeación (2), y las parejas N1–N2 (20 / 117), **cada uno con un código interno estable y su cadena de serialización** en esa versión; y la regla P_ ↔ PLANEADA | Implementación (dato de referencia, no se edita en campo) | Las fuentes ANH no coinciden entre sí (§3.0) y van a cambiar |
| 2 | **Árbol propio de la operadora** | Sus códigos con su jerarquía, de 3 hojas a miles | Se importa de la operadora | Edinson: cada operadora «tiene la forma de cómo catalogar sus fallas» (Transcript l.32) |
| 3 | **Tabla de conversión** | Por hoja propia y versión: pareja (N1, N2) destino; responsable por defecto; marca «requiere precisar» con las opciones permitidas; quién la firmó y cuándo | Rol regulatorio/contabilidad, firmada | §5.4 |
| 4 | **Choke por elemento de la topología** | Por equipo o elemento del esquema de planta y eléctrico: choke por defecto (POZO si es dedicado a un pozo; PLANTA si es compartido; EXPORTACION si está más allá del límite de batería o es de un tercero) y **qué pozos dependen de él** | Configuración firmada | §3.1. Hoy solo existe `Pozo.alimentador` |
| 5 | **Potencial por choke del campo** | Ya existe (`PlantaCampo.chokes`). El **choke dominante se calcula** (el menor; un empate se explica) y `Campo.choke` deja de declararse | Implementación y config | §2.3 |
| 6 | **Tramo de parada de pozo** (lo que se vuelve `paradas_pozo`) | Lo de abajo | Motor más persona | El núcleo |
| 7 | **Evento de pérdida** (lo que alimenta `balance_*.perdidas` y `quemado`) | Lo de abajo | Medición, balance o persona | §4 |

### 6.2 El tramo de parada (pieza 6)

| Grupo | Atributos | Nota |
|---|---|---|
| Identidad ANH del pozo | `n_pozo`, `id_rec`, `uwi`, `form`, `campo` | R4 §(«Qué es nuevo»): **no existen hoy** en TRIM |
| Tiempo | inicio y fin del tramo; **fracción** (1 = cerrado; < 1 = parcial, como `HZ`) | Un evento se parte en tramos cuando cambia la causa o se acaba el programa (§1.2b y §1.2c) |
| Raíz | evento raíz (parada de bomba, caída de servicio o código del pozo) y equipo raíz | Lo que TRIM ya tiene (`Causa.evento`, `Causa.equipo`) |
| Causa TRIM | `TipoCausa`, `parte`, `como`, `evidencia` | Se queda tal cual: es la vista de gestión. R4 §1.7 dice lo mismo: «Las dos vistas tienen que convivir» |
| Clasificación ANH | `resp_par`, `choke_mod`, `dif_perd`, `pla_no_plan`, `cau_niv1`, `cau_niv2`, `desc_evid` | Cada una con su **origen**: *deducido por regla* (la regla y su versión), *convertido por tabla* (la versión) o *declarado o confirmado por persona* (quién y cuándo) |
| Origen para la tupla | `A`, `M` o `C` por campo | `[INFERENCIA]` Si la deduce el motor, es `C` (calculado); si la escribe o confirma una persona, `M`. La plantilla oficial pone `"M"` en todos los campos de clasificación. **NO VERIFICADO** que la ANH acepte `C` ahí |
| Volúmenes | **diferida regulatoria** (contra la última prueba **reportada a la ANH**, base 24 h; C24 p.4); **diferida asignada** (la de TRIM: prueba × FA, que cierra contra el PMO); **pérdida asociada** (bbl de crudo y gas), si la hubo | Las dos diferidas son distintas (R4 D1, D2 y D6). El tramo lleva las dos y la diferencia se explica |
| Estado | `completo` / `requiere precisar` / `pendiente`; versión del catálogo y de la tabla con que se serializó | `pendiente` **bloquea** el IDP de ese día (§3.3) |

### 6.3 El evento de pérdida (pieza 7)

| Atributo | Valores / nota |
|---|---|
| Facilidad | `id_rec` de la facilidad: el balance es por facilidad, no por pozo |
| Fluido | crudo, gas, agua o blancos |
| Tipo | derrame · fuga cabeza–PMO · quema en tea · venteo intencional · rechazo por especificación · daño de equipo (incluye arrastre de crudo en el agua). Es la lista literal de C24 p.4 |
| Volumen y método | bbl o mmscfd; **medido** (medidor de tea, medidor de pérdidas), **por balance** o **estimado** (en sitio) |
| Responsable | Los 9 del Paso 1. **Decide si se descuenta de la producción gravable** (Cuadro 4, nota 4; §4.1) |
| Recuperado | Lo que se recogió y volvió al proceso (`crudo_recuperado` del balance), que no es pérdida |
| Vínculo | El tramo de parada, si lo hubo (§4.4); evidencia (fotos, informe, tags) |

### 6.4 Tres reglas que hacen que todo cuadre

1. **Unicidad.** Un tramo lleva una sola clasificación completa (C24 p.5). Un evento con diferida y pérdida guarda los dos volúmenes, pero el `dif_perd` del tramo se elige con la regla de §4.4, hasta que la ANH diga otra cosa.
2. **Dos vistas sobre el mismo barril.** Gestión (TRIM: equipo, parte, PRODML) y regulatoria (ANH: los 6 pasos). Las dos salen del mismo tramo, **nunca de dos capturas distintas**. Las sumas por cualquiera de las dos vistas son iguales.
3. **Nada se inventa.**
   - Lo que la señal no decide (responsable externo, comunidad, clima, si el oleoducto recibía, la pieza del bombeo mecánico) lo pregunta TRIM, con las opciones cerradas que la tabla permite.
   - Lo que no se resuelve antes de las 07:00 se ve como pendiente, en magenta (dato inválido, ISA-101), y no se rellena con un comodín.

## 7. Desacuerdos con otros agentes

- **R4 (`R4-auditoria-producto.md` §1.7, fila `reinyeccion`)** propone N1 = `NP_PROC` («Tanques llenos / capacidad limitada» o «Parada estación/bombeo afecta pozos») para toda parada por bomba de reinyección o multifásica. **Desacuerdo parcial.**
  - El Paso 6 pide «la causa exacta […] que describe […] el evento técnico o **falla raíz** que detuvo la producción» (C24 p.5). Si TRIM identificó la parte de la bomba (rodamiento, motor, variador), la N1/N2 debería ser la de esa falla (`NP_SUP`, `NP_ENINT`…), con choke `PLANTA`.
  - `NP_PROC` queda para cuando no hay parte o cuando la causa es de capacidad sin falla.
  - Las dos lecturas son defendibles mientras la ANH no lo aclare. Es pregunta para Edinson (§9).
- **R4 §1.7, fila `evacuacion`** pone siempre `NP_TRANSP` y `EXPORTACION`. **Desacuerdo.**
  - En TRIM, `evacuacion` agrupa equipos **propios** dentro de la batería: TK-102, tanque de crudo, y LACT-01, el punto de medición oficial (`src/entities/equipos.ts`).
  - Si para por un equipo propio, es `PLANTA` y responsable `Operador-*`. Solo es `EXPORTACION` / `NP_TRANSP` si el oleoducto, el terminal o el cliente no recibió (§3.3).
  - El mismo defecto está en el código: `CATEGORIA_DE.evacuacion = 'externa'` (`src/entities/causas.ts`).
- **R1 (`R1-normativa-anh.md` §8, punto 2)** objetó mi afirmación de que el choke «va en mayúsculas y sin tilde, que es como los valida el JSON». **R1 tiene razón**: el Schema no valida el valor y el Diccionario pone tilde. Lo corregí en §2.2, §2.3 y §3.0.
- **Complementos a R1, sin desacuerdo:**
  - El «en el marco del presente anexo» de la definición de Pérdida (R1 §1.3) viene del *Anexo Técnico de Interoperabilidad IDP* de la C-003, que tiene las mismas definiciones (§3.0).
  - La unidad de `tuplaDateTime` (R1 §1.7) es `"ISO 8601 DateTime"` en la plantilla oficial (§3.0).

## 8. Fuentes

**Primarias leídas en esta investigación**
1. ANH, Circular 0024 del 09-09-2026 (`docs/reuniones/2026-10-19-edinson-adair/circular-anh-024-2026.pdf`), pp. 2–9.
2. ANH, árbol de paradas de pozo (`docs/reuniones/2026-10-19-edinson-adair/arbol-paradas-pozo-anh.jpg`).
3. Transcript de la reunión del 19-oct-2026 (`docs/reuniones/2026-10-19-edinson-adair/transcript.txt`), l.32, l.50 y l.56.
4. ANH, JSON Schema V3.1 (`investigacion/fuentes/20260731_Esquema_JSON_V3.1_ANH.json`), `segmento_datos.paradas_pozo`, los balances y `definitions`.
5. ANH, plantilla JSON IDP Tipo Único V3.1 (`investigacion/fuentes/20260731_JSON_IDP_TipoUnico_V3.1_AHN.json`).
6. ANH, Diccionario de Datos JSON V3.2 (`investigacion/fuentes/20260820_Dicionario_de_Datos_JSON_V3.2_ANH.xlsx`), hoja `JSONV3`, filas 85, 98, 128–142, 158, 216, 230, 242 y 253.
7. ANH, *Anexo Técnico de Interoperabilidad IDP* (Circular 003/2026) (`investigacion/fuentes/anexo-tecnico-interoperabilidad-idp.pdf`), cap. 1, pp. 1–12 de 38.
8. ANH, Resolución 0651 de 2025 (`investigacion/fuentes/res-anh-0651-2025.pdf`): art. 3 (venteo, p. 9), art. 15.1 parágrafo 2 (pp. 34–35) y Cuadro 12 (p. 58).
9. W. Palen y A. Goodwin (BP), *Increasing Production in a Mature Basin: "The Choke Model"*, SPE-36848-MS, European Petroleum Conference, Milán, 1996. DOI 10.2118/36848-MS. Leído por Crossref: https://api.crossref.org/works/10.2118/36848-MS
10. NSTA, *UKSS Guide – Production Efficiency Section* (2025, publicada el 03-11-2025), §2.2, §5.2–5.9, §6.2–6.6 y §7.4: https://www.nstauthority.co.uk/media/mdebav4g/ukss-production-efficiency-section-guide-2025.pdf
11. OGA, *PE guidance presentation v2*: https://www.nstauthority.co.uk/media/4265/oga_pe_guidance_presentation_v2.pdf
12. Energistics PRODML v2.1, `ProductionOperation.xsd` (`ReasonLost`, `LostVolumeAndReason`, `ProductionOperationShutdown`), copia en GitHub `pds-technology/devkit-c`, ruta `doc/Standards/energyml/data/prodml/v2.1/xsd_schemas/ProductionOperation.xsd`.
13. CEN ISO/TS 3250:2022 (ISO/TS 3250:2021), ficha: https://www.evs.ee/en/cen-iso-ts-3250-2022
14. ISO 20815:2018, ficha (retirada el 17-06-2026; reemplazada por ISO 20815:2026): https://www.evs.ee/en/iso-20815-2018
15. *JPT*, «Digital tool brings clarity to reporting downtime» (Murphy Oil), 29-jul-2020: https://jpt.spe.org/digital-tool-brings-clarity-reporting-downtime
16. Código de TRIM (solo lectura): `src/entities/tipos.ts`, `campos.ts`, `planta.ts`, `causa-senal.ts`, `causas.ts`, `pozos.ts`, `bombas.ts`, `equipos.ts`, `libro.ts`; `src/shared/api/contrato.ts`; `CONTRATO.md`; `docs/backend/anexo-c-normas.md`, `03-modelo-de-datos.md`, `sql/esquema.sql`.

**Secundarias o parciales** (marcadas en el texto)
- *APPEA Journal* 2005, AJ04009, *Implementation of the BP choke model on the Woodside operated Cossack Pioneer FPSO*: solo el extracto del buscador (https://publish.csiro.au/aj/AJ04009); la página dio 404/302.
- NORSOK Z-016 (1998), ficha de GlobalSpec, solo el extracto del buscador (https://standards.globalspec.com/std/9966218/z-016; 403).
- Investigación previa: `~/Downloads/TRIM-hidrocarburos/3-investigacion/02-produccion-diferidos.md` (§2.A–2.D: NSTA 2023, patente US 8,195,401, ISO 20815:2008, SPE-196255, manual de Shell), `10-atribucion-diferidos-hueco.md` y `17c-tres-trenes-metricas.md` (§3.2: Res. MME 40066/2022; §6.2: Res. MME 40537/2024, Cuadro 4, y Res. 40236/2022, ecuación 21; fila C13: Res. MME 574/2026).
- Otros agentes: `R1-normativa-anh.md` (§1.5 Tabla 1 literal, §2.2, §5, §8), `R3-metricas-confiabilidad.md` (l.95–97), `R4-auditoria-producto.md` (§1.6, §1.7, D1–D8).

**Buscado y no encontrado** (NO VERIFICADO)
- Tabla 2 y apéndice de SPE-36848 (muro de pago).
- *SPE draft white paper "Production Efficiency Reporting – Best Practice Guidance" (2016)*.
- Las categorías del Anexo A de ISO/TS 3250 y del Anexo G de ISO 20815.
- La estructura del árbol de diferidas de Ecopetrol.
- Una definición primaria de *optimised potential*.
- Una regla publicada de prorrateo entre causas simultáneas.
- Dónde va el venteo en el JSON V3.1.

## 9. Preguntas abiertas para Edinson o la ANH

1. Una parada que causa diferida **y** pérdida (rotura de línea): ¿qué va en `dif_perd`? (§4.4)
2. ¿`cau_niv1` lleva el código (`NP_SUB`) o el texto («NO PLANEADA - MECÁNICA SUBSUELO»)? ¿EXPORTACION lleva tilde? ¿Qué lista de N2 rige, la de la circular o la del diccionario? (§3.0)
3. Bomba de reinyección o multifásica con la parte identificada: ¿N1 de la falla (`NP_SUP`, `NP_ENINT`) o `NP_PROC`? (§7)
4. Frontera POZO/PLANTA: ¿dedicado o compartido (criterio de Edinson), o la frontera física de la NSTA? (§3.1)
5. Varilla partida o bomba de subsuelo de bombeo mecánico, aire de instrumentos y declinación: no tienen N2. ¿Qué usar? (§3.3)
6. ¿Dos tramos consecutivos para un mismo pozo cuando cambia la causa, y cómo se reporta una parada parcial (frecuencia reducida)? (§1.2b, §3.1)
7. ¿El crudo arrastrado con el agua de disposición se reporta como pérdida? (§4.3)
8. ¿Dónde va el venteo intencional en el JSON V3.1? (§4.3)
9. «Pitera» y la frase «ya estando en subsuelo»: confirmar que quiso decir superficie. (§4.2)
