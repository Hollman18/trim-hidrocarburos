# R4 · Auditoría del producto actual frente a la Circular 024, Edinson y Adair

Auditor: producto actual. Fecha: 19-oct-2026. Sigue `docs/plan-circular-24/CONTEXTO.md`. No se tocó código (solo lectura).

> Estado: COMPLETO (21-oct-2026). Fuentes nuevas usadas: JSON Schema V3.1 y Diccionario V3.2 de `investigacion/fuentes/`.

## 0. Resumen ejecutivo
- **Qué se reusa.** El motor ya deduce la causa de cada parada desde las señales (6 reglas, `causa-senal.ts:261-322`), la carga a un equipo y una parte, guarda la evidencia (base de `desc_evid`) y marca qué declaró una persona (origen «M» frente a «A/C»). El libro ya parte por evento y día (`porDiasDelEvento`; tabla `tramo_diferido` del backend). La pantalla Identificar y el hilo de WhatsApp ya son el lugar donde una persona completa lo que la señal no dice. Los colores ya siguen la disciplina ISA-101 (gris lo normal, forma + color + número; morado para sin señal).
- **Qué se cambia.** (1) «Planeado» deja de ser «estaba en el programa» y pasa a la definición ANH. (2) Identificar pregunta los pasos del árbol ANH que no se deducen, y propone los que sí. (3) Regulatorio (hoy apagada en el MVP) pasa de 6 casillas PRODML a las 20 N1 y al estado del IDP diario. (4) El rojo: hoy es la alarma P1; Adair lo quiere para interlock.
- **Qué es nuevo.** Registro ANH del pozo (id_rec, UWI, formación: no existen en ningún lado); choke, responsable, diferida/pérdida y N1/N2 por parada; el concepto de **pérdida**; la diferida con la definición literal ANH al lado de la de TRIM; `produccion_por_pozo` diario; el serializador JSON v3.1 con tuplas; la conversión del árbol de cada operadora; el estado «interlock»; el programa del técnico con campañas y cierre de orden.
- **Hallazgos que cambian el plan.** El Schema oficial **no lleva volumen en `paradas_pozo`** ni `enum` en ninguna lista: la ANH calcula la diferida con `pruebas_potenciales` y `produccion_por_pozo`. Circular y Diccionario se contradicen (código o texto en `cau_niv1`; «EXPORTACION» o «EXPORTACIÓN»; «choke_mod» descrito como «modelo de estrangulador»). Diez de las 20 N1 no tienen ningún `TipoCausa` que las alimente.
- **Costo.** Si la clasificación ANH se agrega al lado de `TipoCausa` (sin renombrarlo) y la diferida ANH se calcula aparte (sin tocar el libro), no se rompe ninguno de los 122 casos de `referencia/`. Tocar `TipoCausa` rompe 19 casos y ~31 archivos de `src/`; tocar el método del diferido, ≈ 94 casos.

## 1. Modelo de causas y clasificación

### 1.1 Cómo nace un evento
- Hay **tres fuentes de eventos**, todas del PLC o del controlador, ninguna escrita a mano:
  - `EventoPozo` (`src/entities/pozos.ts:77-89`): id, campo, pozo, inicio, fin (`null` = abierto), `codigo` del controlador (10 códigos: GF, PH, OL, UL, OT, UV, PSH, LSHH, CMD, HZ, `pozos.ts:44-57`), `senal`, `hz` (solo en `HZ`) y una `respuesta?` opcional.
  - `EventoBomba` (`src/entities/bombas.ts:281-304`): parada o reducción de una bomba de la línea (multifásica o inyección) con `perdida` (fracción de capacidad), `primeraAlarma` (first-out del PLC), `firma` (parte que señalaban las señales al parar) y `nivelAlParar` del tanque.
  - `EventoServicio` (`src/entities/pozos.ts:91-104`): caída de un servicio que apaga pozos, con `tipo` ∈ aire | energia | compresion | evacuacion | proceso | tratamiento.
- Solo el `EventoPozo` genera barriles: el libro recorre `eventosDeCampo(campoId)` y cada uno es un `Tramo` (`src/entities/libro.ts:279-301`, `tramosDe` en `libro.ts:314-347`). Las paradas de bomba y de servicio **no** son eventos de pozo: se vuelven la CAUSA de los eventos de pozo que cierran en su cascada.
- Los datos de demo los genera `scripts/gen-linea.mjs` (cabecera de `src/entities/datos/pozos.ts:1-6`). En el demo hay 1.211 eventos de pozo (`src/entities/datos/eventos-pozos.ts`, conteo por código: UV 340, UL 277, PSH 191, OL 130, CMD 94, HZ 61, PH 57, OT 30, LSHH 18, GF 13), 9 de ellos con `respuesta` ya escrita.

### 1.2 Cómo se deduce la causa: las 6 reglas (`src/entities/causa-senal.ts:261-322`)
Orden estricto, para cada `EventoPozo` (`deducirEvento`):
1. **Servicio caído y el pozo cerró en su cascada** (`causa-senal.ts:265-271`): primer cierre a ≤15 min de la caída y cada siguiente a ≤15 min del anterior (`cascadaDe`, `causa-senal.ts:123-140`; `TOLERANCIA_MS`, línea 94). Excepción: si una bomba de la línea paró >15 min ANTES de que cayera el servicio, manda la bomba (`bombaPrimero`, línea 269). Tipo = `SERVICIO_A_TIPO[sv.tipo]` (líneas 100-102); equipo = el del servicio.
2. **Bomba de la línea parada** (`causa-senal.ts:273-292`, `bombaQueLeCorta` líneas 244-256): la multifásica que mueve ese pozo (`perfil.pozos`) o la de disposición si el código del pozo es LSHH, CMD o HZ. La causa del pozo hereda la de la parada de la bomba (`causaDeParada`, líneas 196-238), que busca la PARTE en este orden: programa → primera alarma de esa máquina → pérdida de caudal sin disparo (firma) → servicio a ±15 min → firma de señales al parar → respuesta del operario → «ninguno».
3. **Programa de paradas aprobado** (`causa-senal.ts:294-296`; `enPrograma`, líneas 147-149; `ParadaProgramada` en `src/entities/configuracion.ts:64-71`): tipo `programada`.
4. **Código del controlador** (`causa-senal.ts:298-308`): ESP con GF/PH → aislamiento, OL → bomba, UL → admisión, OT → motor; bombeo mecánico con OL/UL → `levantamiento`; UV → `energia` cargada al alimentador del pozo.
5. **Declarado por un operario** (`causa-senal.ts:311-316`): si dijo la parte y el pozo es ESP → `electrosumergible` con parte; si no → `declarada`.
6. **Nada aplica** (`causa-senal.ts:318-321`): `pendiente` («Sin identificar»), con `porQueNo` y se le pregunta al operario.

El resultado es una `Causa` (`causa-senal.ts:69-85`): `tipo: TipoCausa`, `equipo` (a quién se cargan los barriles), `parte?`, `como` (senal | firma | programa | declarado | ninguno), `evidencia[]` (cadena de custodia), `porQueNo?`, `evento?`, `texto`, `declarado?`.

`TipoCausa` tiene **13 valores** (`causa-senal.ts:35-38`): reinyeccion, transporte, electrosumergible, levantamiento, energia, aire, compresion, evacuacion, proceso, tratamiento, programada, declarada, pendiente. `ALTO_IMPACTO = ['reinyeccion', 'electrosumergible']` (línea 57; **no incluye `transporte`** = multifásica, pese a que Adair la pide como piloto).

### 1.3 La capa PRODML (`src/entities/causas.ts`)
- `CATALOGO` (`causas.ts:28-47`): 6 categorías con `prodml` de la enumeración ReasonLost (superficie, pozo, programado, proceso, externa, yacimiento), cada una con 3-5 `hijos` en texto libre.
- `CATEGORIA_DE` (`causas.ts:54-61`): mapa `TipoCausa → categoría`; `declarada` y `pendiente` quedan `undefined`.
- Hallazgo: `CATALOGO` y `CATEGORIA_DE` **solo se usan** en `src/pages/Regulatorio.tsx:5,32-43` (ver §3 y §4), y esa pantalla está apagada en el MVP (`PANTALLAS_V2` en `src/shared/config/producto.ts:13`). El motor (libro, diferido) agrupa por `TipoCausa`, nunca por categoría PRODML. Cambiar o retirar la capa PRODML cuesta poco.

### 1.4 Cómo se declara la causa a mano (`Respuesta`)
- `Respuesta` (`src/entities/pozos.ts:61-75`): `texto`, `por`, `porId?`, `hora`, `parte?`, `modo?` (código ISO 14224 Table B.6), `canal?` (whatsapp | pantalla). Es «el único dato que entra a mano».
- Se guarda por id de evento en `Contexto.respuestas` (`causa-senal.ts:87-91`) o viene embebida en el evento (`EventoPozo.respuesta`). La escribe `POST /api/paradas/:evento/respuesta` (`src/entities/roles.ts:9-11`) con la capacidad `causa:declarar` (sup, oper, tec) o `causa:completar` (jefe, conf), que la incluye (`src/entities/tipos.ts:194-200`).
- Qué se ofrece al declarar: las PARTES del catálogo de la clase de equipo (`src/entities/catalogo.ts:45-50`) y, de cada parte, sus modos ISO 14224 + «Otro» (`modosDeParte`, `catalogo.ts:71-73`), redactados en palabras de campo (`MODO_EN_CAMPO`, `catalogo.ts:76-82`). Solo hay catálogo para 3 clases: bomba-inyeccion, bomba-multifasica, bomba-electrosumergible (`catalogo.ts:24`). Un pozo de bombeo mecánico, un servicio o cualquier otro equipo **no tiene catálogo**: su declaración es texto libre y queda `tipo: 'declarada'` sin categoría.
- Después, confiabilidad completa `Analisis` (`catalogo.ts:107-115`): mecanismo (Table B.2, marcada «transcrita, pendiente de cotejo», `src/entities/iso14224.ts:64-66,117`) y causa raíz (Table B.3, 5 categorías, `iso14224.ts:121-127`).
- `estadoIdentificacion` (`causa-senal.ts:338-345`) decide si la parada «pide» respuesta: `pendiente`, o bomba sin parte y no declarada.

### 1.5 Cómo se cargan los barriles a la causa
- Por tramo: `bbl = Σ días crudo_prueba_vigente × FA_mes × horas × fracción ÷ 24` (`libro.ts:328-335`). `fracción` = 1 si cerró; con `HZ`, `1 − hz/hz_prueba` (`perdidaPorFrecuencia`, `libro.ts:92-96`).
- Cada hora del pozo se cobra una sola vez aunque se crucen eventos (`intervalosEfectivos`, `libro.ts:118-140`).
- El tramo hereda `causa.equipo` y `causa.tipo`: un pozo que cerró por la bomba de reinyección carga sus barriles a la bomba (`causa-senal.ts:285-291`).
- Agregaciones del `Libro` (`libro.ts:491-562`, armado en `libro.ts:676-879`):
  - `porTipo` (`libro.ts:745-746, 864`): Σ bbl por `TipoCausa`.
  - `porEquipo` (`libro.ts:751-773`): clave `campo:equipo:tipo`, con partes, eventos, pozos y, para las familias de alto impacto, `fallas` y `disparos` de su historia.
  - `sinCosto` (`libro.ts:779-791`): bombas y ESP que fallaron sin costar crudo (el tanque o el respaldo lo absorbieron).
  - `porParte` (`libro.ts:799-824`), `porPozo`, `porCampo`.
  - `planeado` = solo `tipo === 'programada'`; `noPlaneado = diferido − planeado` (`libro.ts:743, 858`). Es la ÚNICA noción de planeada/no planeada que hay.

### 1.6 Los 15 campos de `paradas_pozo` frente a lo que hay
Fuente de los campos: Circular ANH 0024 del 09-09-2026, numeral 2.4, págs. 7-8.

| Campo ANH | Qué pide | En TRIM hoy | Estado |
|---|---|---|---|
| `n_pozo` | Nombre oficial del pozo | `Pozo.id` / `EventoPozo.pozo` (`pozos.ts:29-31,80`), p. ej. «LC-01». No se sabe si coincide con el nombre oficial ANH | **Parcial** (existe un id; falta el nombre oficial) |
| `id_rec` | Id único del pozo en el sistema de información de la ANH | No existe en `Pozo` ni en `datos/pozos.ts` (búsqueda sin resultados en `src/`, `scripts/`, `CONTRATO.md`) | **Falta** |
| `uwi` | Unique Well Identifier | No existe | **Falta** |
| `form` | Formación productora afectada | No existe (ni `formacion` ni `yacimiento` por pozo; «Yacimiento» solo es categoría PRODML, `causas.ts:44`) | **Falta** |
| `campo` | Nombre del campo | `Campo.nombre` vía `campoPorId(EventoPozo.campoId)` (`src/entities/campos.ts`) | **Existe** |
| `h_ini_paro` | Inicio, ISO 8601 `…Z` | `EventoPozo.inicio`, ISO 8601 con zona −05:00 | **Existe** (convertir a UTC `Z`) |
| `h_fin_paro` | Fin y arranque | `EventoPozo.fin` (`null` si sigue abierto) | **Parcial**: falta la regla para una parada abierta al corte de las 23:59:59 (NO VERIFICADO qué espera la ANH; la circular no lo dice) |
| `cau_gral_paro` | Categoría general o macro | Se puede derivar de `CATEGORIA_DE[tipo]` (6 PRODML) o del `TipoCausa`. La circular no da catálogo cerrado de este campo | **Parcial** (derivable; dominio NO VERIFICADO) |
| `resp_par` | Responsable (9 valores del árbol / paso 1) | No existe. Derivable en parte: servicio `energia` externa → «Externo-Proveedor Energía»; `evacuacion` → «Externo-Transportador»; fallas de equipo → «Operador-Mantenimiento»; `programada` → depende. No hay comunidad, autoridad, tercero ni fuerza mayor en el modelo | **Falta** (parcialmente derivable) |
| `choke_mod` | POZO / PLANTA / EXPORTACION / RESERVORIO, por parada | Solo hay `Campo.choke` por CAMPO, con otro dominio (Pozos/Planta/Evacuación/Mercado, `tipos.ts:102`), validado en `src/shared/api/contrato.ts:272,290` y **no usado por ninguna pantalla ni por el motor**. No hay choke por evento | **Falta** (derivable por regla: ESP/bombeo mecánico/código del pozo → POZO; bomba de la línea, servicio, tratamiento → PLANTA; evacuación → EXPORTACION; yacimiento → RESERVORIO; ver §1.7) |
| `dif_perd` | DIFERIDA / PERDIDA | Todo es diferido. No existe la noción de pérdida (derrame, fuga, tea, venteo, rechazo) en ningún archivo | **Falta** |
| `pla_no_plan` | PLANEADA / NO PLANEADA | Derivable: `tipo === 'programada'` ⇒ PLANEADA (`libro.ts:743`). Pero el programa solo tiene mantenimientos de bombas y cambios predictivos de ESP (`src/entities/datos/programa.ts`); no hay pruebas de pozo, workover, curtailment, puesta en servicio. `CMD` («parada por orden») hoy no es planeada | **Parcial** |
| `cau_niv1` | 1 de 20 N1_KEY | No existe. Derivable para parte de los `TipoCausa` (tabla en §1.7) | **Falta** |
| `cau_niv2` | 1 del catálogo cerrado de la N1 | No existe. Derivable en pocos casos (GF/PH de ESP → «Falla ESP»; UV → «Baja/alta tensión del proveedor» o «Falla red interna», según el alimentador) | **Falta** |
| `desc_evid` | Comentarios / evidencia | `Causa.texto` + `Causa.evidencia[]` (`causa-senal.ts:75-83`) | **Existe** (es justo la cadena de custodia) |

Además, cada valor va como tupla `[Valor, Origen A|M|C, Unidad]` (circular, numeral 1.2, pág. 2). TRIM ya distingue el origen: `como` = senal/firma/programa → «A» o «C»; `declarado` → «M». No hay en el código ningún serializador de tuplas.

### 1.6.1 Lo que agregan el JSON Schema y el Diccionario oficiales (`investigacion/fuentes/`)
Fuentes: `fuentes/20260731_Esquema_JSON_V3.1_ANH.json` (codificado en UTF-16; `title`: «Esquema JSON IDP ANH - Versión 3.5 Estricta», Draft-07), `fuentes/20260731_JSON_IDP_TipoUnico_V3.1_AHN.json` (plantilla) y `fuentes/20260820_Dicionario_de_Datos_JSON_V3.2_ANH.xlsx` (hoja `JSONV3`, encabezado «Diccionario de Datos Unificado - JSON IDP V3.0»).

- **Schema** (`properties.segmento_datos.properties.paradas_pozo`): arreglo de objetos con los 15 campos `required` y `additionalProperties: false`. Todos son `tuplaString` salvo `h_ini_paro` y `h_fin_paro` (`tuplaDateTime`, `format: date-time`). La tupla de texto admite en «Origen» `A | M | C | Fijo | ""`. **El Schema no trae ningún `enum` para `choke_mod`, `dif_perd`, `pla_no_plan`, `resp_par`, `cau_niv1` ni `cau_niv2`**: las listas cerradas se validan fuera del Schema (en el receptor de la ANH; NO VERIFICADO cómo).
- **Diccionario** (filas `paradas_pozo`): origen esperado `A` para n_pozo, id_rec, uwi, form, campo; `M` para los otros diez. Las listas de valores:
  - `pla_no_plan`: «PLANEADA», «NO PLANEADA».
  - `dif_perd`: «DIFERIDA», «PERDIDA».
  - `resp_par`: «OPERADOR - OPERACIÓN», «OPERADOR - MANTENIMIENTO», «OPERADOR - PLANEACIÓN/LOGÍSTICA», «EXTERNO - PROVEEDOR ENERGÍA», «EXTERNO - TRANSPORTADOR», «COMUNIDAD», «AUTORIDAD / REGULADOR», «TERCERO», «FUERZA MAYOR (CLIMA/NATURAL)» (9, con tildes).
  - `choke_mod`: «POZO», «PLANTA», «EXPORTACIÓN» (con tilde), «RESERVORIO». Su descripción dice «Modelo de estrangulador utilizado, si es relevante en la detención», que **contradice** la circular (numeral 2.1: el choke «se distingue técnicamente de la válvula de estrangulamiento»).
  - `cau_niv1`: los 20 valores escritos como **texto** («PLANEADA - MANTENIMIENTO ELÉCTRICO», …, «NO PLANEADA - AUTORIDAD / RESTRICCIÓN»), no como los códigos `P_MANT_ELE` que pide la circular (numeral 2.4, ejemplo `["P_MANT_ELE", "M", "string"]`).
  - `cau_niv2`: el N2 se lista dentro del texto de cada N1; difiere de la Tabla 1 de la circular en detalles (p. ej. NP_INS agrega «FALLA INSTRUMENTO/SENSOR»; P_PRUEBAS dice «PRUEBA DE POZO (POTENCIAL/PLT)»; P_OP agrega «(PLANIFICADO)»; NP_CTRL dice «FALLA CONFIGURACIÓN/PARAMETRIZACIÓN (PLC/VSD/CONTROL)»).
- **El volumen no viaja en `paradas_pozo`**. Viaja en otros dos nodos del mismo `segmento_datos`: `pruebas_potenciales` (n_pozo, id_rec, uwi, form, campo, `h_pbas`, `prod_oil`, `prod_gas`, `prod_agua`, `bsw`, `frec`, `pip`, …) y `produccion_por_pozo` (n_pozo, id_rec, uwi, form, campo, `tip_lev`, `t_prod` = «horas totales en las que el pozo aportó fluidos», `prd_oil`, `prd_gas`, `prd_agua`, `cond`, `observaciones`). Con esos dos, la diferida de cada pozo la puede calcular la ANH (prueba − real de 24 h, §2.2). La pérdida tiene campo `perdidas` en `balance_fluido_crudo`, `balance_fluido_agua` y en los blancos, no por pozo.
- Consecuencias para TRIM:
  1. Los tres identificadores de pozo (`id_rec`, `uwi`, `form`) se repiten en cuatro nodos (`pruebas_potenciales`, `paradas_pozo`, `inyeccion_por_pozo` sin uwi, `produccion_por_pozo`): son atributos del **registro de pozos**, no de la parada.
  2. Para el IDP completo TRIM tendría que dar también `t_prod` (lo tiene: horas que el PLC dice que el pozo produjo, `AsignacionPozo.horas`, `libro.ts:367-378`, hoy solo mensual) y `prd_oil` por pozo y día (no lo tiene: §2.3, D4).
  3. `tip_lev` existe casi uno a uno: `Levantamiento` (`pozos.ts:18`) electrosumergible → «BOMBEO ELECTROSUMERGIBLE», bombeo-mecanico → «BOMBEO MECANICO», flujo-natural → «FLUJO NATURAL» (la lista del diccionario trae textos pegados, p. ej. «BOMBEO MECANICOVPROGR»: error del archivo).
  4. Hay dos contradicciones de la ANH que el plan no puede resolver solo: código (`P_MANT_ELE`) o texto («PLANEADA - MANTENIMIENTO ELÉCTRICO») en `cau_niv1`; «EXPORTACION» o «EXPORTACIÓN». Y tres versiones en los nombres (3.1 en el archivo y la circular, 3.5 en el `title` del Schema, 3.0/3.2 en el diccionario). Se deben preguntar en las mesas de trabajo de la ANH (circular, pág. 10). El catálogo de TRIM debe guardar código Y texto de cada N1/N2 para emitir el que se confirme.

### 1.7 Correspondencia `TipoCausa` → N1 de la ANH (lectura del auditor, para el plan)
Propuesta de partida, no verificada con una operadora:

| `TipoCausa` | N1 probable | Choke probable | Comentario |
|---|---|---|---|
| reinyeccion (disposición) | NP_PROC («Tanques llenos / capacidad limitada» o «Parada estación/bombeo afecta pozos») | PLANTA | El pozo no falla: lo cierra la planta |
| transporte (multifásica) | NP_PROC («Parada estación/bombeo afecta pozos») | PLANTA | Igual |
| electrosumergible | NP_SUB («Falla ESP») | POZO | Directo |
| levantamiento (bombeo mecánico) | NP_SUP (varias N2) | POZO | Con OL/UL no se sabe la N2 exacta: pide confirmación |
| energia | NP_ENEXT o NP_ENINT | PLANTA o POZO | Depende de si el alimentador es del proveedor o interno, y del punto (pórtico → PLANTA; distribución a unidades → POZO, ejemplo de Edinson en el transcript [26:48]) |
| aire | NP_PROC o NP_INS | PLANTA | Ambiguo: la matriz no tiene «aire de instrumentos». NO VERIFICADO |
| compresion | NP_PROC («Capacidad compresión/transferencia gas limitada») | PLANTA | |
| evacuacion | NP_TRANSP | EXPORTACION | |
| proceso / tratamiento | NP_PROC | PLANTA | |
| programada | P_MANT_MEC / P_MANT_ELE / P_MANT_INS / … | según el equipo | El `ParadaProgramada.motivo` es texto libre: no basta para la N1 |
| declarada | depende de la respuesta | — | Hoy es texto libre: no hay N1 posible |
| pendiente | ninguna | — | No se puede reportar: la circular rechaza valores fuera de catálogo (numeral 2.3, pág. 7) |

Consecuencias:
- **Diez de las 20 N1 no tienen ningún `TipoCausa` que las alimente**: cinco planeadas (P_MANT_INT, P_WO, P_PRUEBAS, P_PES, P_OP) y cinco no planeadas (NP_CLIMA, NP_OPUB, NP_AUT, NP_INTEG, NP_CTRL). NP_INS solo por la vía ambigua del aire. El motor no tiene señal para clima, orden público, autoridad, integridad de líneas ni pérdida de comunicaciones del PLC/SCADA: esas paradas hoy caen en `pendiente` o `declarada` (texto libre).
- La matriz de la ANH clasifica por **naturaleza de la falla**, no por **equipo que la causa**: TRIM carga los barriles a «Bomba de reinyección» y la ANH los quiere en NP_PROC. Las dos vistas tienen que convivir: la de TRIM para gestión, la de la ANH para el reporte.

### 1.8 UWI, id_rec ANH y formación en los datos
No existen. `Pozo` (`pozos.ts:29-41`) tiene: id, campoId, levantamiento, controlador, alimentador, origen, fuentePrueba, pruebas. `datos/pozos.ts` (97 líneas, generado) no trae ninguno de los tres. Tampoco hay contrato, operadora ni número de contrato (necesarios para el nombre del archivo, circular numeral 4.1, pág. 9). La única «empresa» es `Config.empresa` (`configuracion.ts:106-112`), un texto de membrete.

## 2. El diferido: cómo se calcula hoy y contraste con la Circular 024

### 2.1 Cómo se calcula hoy (`src/entities/libro.ts`, cabecera líneas 1-24)
- **Real (R)** del mes = producción fiscal del punto de medición oficial, día por día (`ProduccionMes.dias`, `src/entities/pozos.ts:106-115`). Un día sin dato es `null` (hueco), nunca cero (`fiscalDelDia`, `libro.ts:166-169`).
- **Prueba vigente** = la última prueba hecha ANTES del instante; antes de la primera, la primera (`pruebaEn`, `pozos.ts:177-182`). La prueba sale del separador de prueba automatizado o se estima desde la ESP (`Pozo.origen` = instrumento | estimado, `pozos.ts:19,38`). **No hay ninguna marca de «reportada a la ANH»** en `Prueba` (`pozos.ts:21-27`: fecha, crudoBpd, aguaBpd, hz).
- **Teórico (T)** del mes = Σ pozos con prueba de crudo_prueba × (horas del día − horas perdidas) ÷ 24, solo en días con dato fiscal (`calcCampo`, `libro.ts:171-205`).
- **Factor de asignación** FA = R ÷ T por campo y mes (`libro.ts:199`); si el mes no tiene un día fiscal, el último FA medido (`faDe`, `libro.ts:211-219`).
- **Potencial** = Σ crudo_prueba × FA × horas ÷ 24 (`libro.ts:707-709`).
- **Diferido de un tramo** = crudo_prueba × FA × horas apagado × fracción ÷ 24 (`libro.ts:328-335`). Por construcción, en un mes entero Σ diferidos = potencial − real; el resto es `residuo` (inventario del tanque de venta y días sin fiscal, `libro.ts:501-503, 856`).
- **Día a día**: `porDia` (`libro.ts:1002-1039`) da real, potencial, diferido y residuo por día de Colombia (medianoche −05:00), que es la misma ventana de 24 h de la circular (corte 23:59:59, numeral 4.1, pág. 8-9).
- **Tolerancia**: sesgo = media banda de la Res. MME 40236/2022, Anexo 2, Fig. 10.2 según °API y producción (`src/entities/metrologia.ts:22-59`, `bandaDe` en `libro.ts:257-274`), sumado en línea dentro del campo; azar = resolución del reloj del PLC (1 s) en cuadratura (`libro.ts:342, 353-364`).
- **Aproximado**: los tramos con frecuencia reducida (`HZ`) usan la ley de afinidad `1 − hz/hz_prueba` y se informan aparte, fuera de la tolerancia (`libro.ts:87-96, 337, 356`).
- **Publicable**: el libro no se publica si hay días sin fiscal, meses sin factor, banda sin verificar, FA fuera de banda, más pendiente que el criterio firmado o un campo sin meta (`CodigoMotivo`, `libro.ts:568, 833-848`).

### 2.2 Lo que dice la Circular 024
Numeral 2.1, pág. 4: «La cuantificación de la Diferida de Producción se realizará como la diferencia entre la producción máxima esperada, acorde con el potencial del pozo (última prueba de potencial reportada a la ANH), y la producción real obtenida en un período de veinticuatro (24) horas», y la prueba «es representativa tanto para la compañía operadora como para la ANH, y […] el sistema de levantamiento se encuentra en condición optimizada».
Numeral 2.3, pág. 7: «el operador determina, conforme a su metodología operacional y con soporte técnico verificable, cuáles de dichos eventos generan producción diferida y cuál es el volumen asociado».

### 2.3 Diferencias exactas

| # | Punto | TRIM hoy | Circular 024 | Efecto |
|---|---|---|---|---|
| D1 | Qué prueba | La última prueba hecha, del separador o estimada (`pruebaEn`) | La última prueba de potencial **reportada a la ANH** | Falta un atributo por prueba (`reportadaAnh`, fecha de reporte). Una prueba estimada desde la ESP probablemente no es una «prueba de potencial reportada» (NO VERIFICADO) |
| D2 | Factor de asignación | El potencial y el diferido van × FA del mes | La fórmula escrita no lleva FA: potencial del pozo − real en 24 h | Con FA ≠ 1, la diferida ANH de un pozo incluye (1 − FA) × prueba aunque no haya parada. TRIM pone esa brecha en el factor, no en el diferido |
| D3 | Unidad de cálculo | Por evento (tramo), luego se agrega | Por pozo y por día (24 h) | `porDia` existe por campo; falta **por pozo y por día** |
| D4 | «Real» del pozo | No hay real por pozo diario; la asignación por pozo solo para meses cerrados (`asignacionPorPozo`, `libro.ts:385-404`) | Producción real del pozo en 24 h | Falta una asignación diaria por pozo (la ANH no dice con qué método; ver D6) |
| D5 | Parada parcial | `HZ` cuenta, como «aproximado» | «Interrupción total o parcial» es parada (numeral 2.1, pág. 4) | Coincide en el concepto; falta decidir cómo se reporta lo aproximado |
| D6 | Método del volumen | Prueba × FA × horas | Numeral 2.1 da la fórmula; numeral 2.3 deja el volumen a la «metodología operacional» del operador | Contradicción aparente dentro de la circular. Propuesta: calcular las DOS (la de la circular y la de TRIM) y mostrar la diferencia. NO VERIFICADO cuál exige el validador |
| D7 | Dónde viaja el volumen | El libro tiene bbl por tramo | Los 15 campos de `paradas_pozo` **no tienen campo de volumen** (numeral 2.4, págs. 7-8) | Confirmado con el Schema (§1.6.1): el volumen no se reporta como «diferida»; se reportan la prueba (`pruebas_potenciales.prod_oil`) y lo real con sus horas (`produccion_por_pozo.prd_oil`, `t_prod`), y la diferida sale de restar. Lo que TRIM calcule con su método es para gestión y como soporte, no viaja en el IDP |
| D8 | Pérdida | No existe | Volumen producido que deja de estar disponible: derrames, fugas cabeza–PMO, tea, venteo, rechazo, daños (numeral 2.1, pág. 4) | Concepto nuevo. Ninguna señal actual lo mide; el gas a tea solo aparece como `DestinoGas` del campo (`src/entities/tipos.ts:91`) |
| D9 | Diferida sin evento | Imposible: el diferido solo nace de eventos | Posible (declinación, prueba vieja, levantamiento no optimizado) | La circular asume levantamiento optimizado; lo que no se explica queda en el `residuo` de TRIM |

Lectura del auditor: el método de TRIM es la asignación por pozo con un factor que cierra contra lo fiscal; es más defendible que la resta simple y sirve como «metodología operacional con soporte verificable» (numeral 2.3). Pero el reporte tiene que poder dar también la cifra con la definición literal de la circular (numeral 2.1), y explicar la diferencia (D2). Las dos se calculan con las mismas piezas que ya existen (`pruebaEn`, `calcCampo`, `porDiasDelEvento`).

## 3. Pantallas y roles

Fuente de los roles: `ROLES` en `src/entities/roles.ts:39-107`. En el MVP están apagados los roles `plan`, `cont`, `reg` y las pantallas `agua`, `evidencia`, `regulatorio` (`src/shared/config/producto.ts:13-17`). Es decir: **hoy nadie ve Regulatorio ni Evidencia**, y la planeadora no existe como rol visible. Nombres de pantalla: `src/app/pantallas.tsx:44-65` («Identificar» = ruta `causa`).

### 3.1 Inventario pantalla por pantalla

| Pantalla (archivo) | Roles que la tienen (`roles.ts`) | Qué muestra hoy de causas y diferidos | Qué tendría que cambiar |
|---|---|---|---|
| **Resumen** (`src/pages/Resumen.tsx`; widgets `resumen/ResumenDirectivo.tsx`, `resumen/PorCampo.tsx`, `riesgo/Ahora.tsx`) | ger | Diferido del período, «sin paradas programadas» (eficiencia con `lb.noPlaneado`, `Resumen.tsx:54,73`), sin identificar, evitable por orden; por campo, los equipos de `porEquipo` con su `TIPO_CAUSA` y los `sinCosto` (`PorCampo.tsx:70-71,126`). Cumple la regla del dueño: el gerente ve campo → equipos | Agregar el reparto ANH por choke (POZO/PLANTA/EXPORTACIÓN/RESERVORIO) y la línea **pérdida** separada del diferido. No bajar al detalle N2 |
| **Diferidos** (`src/pages/Diferidos.tsx`; widgets `diferidos/Paretos.tsx`, `Cuadre.tsx`, `Factor.tsx`, `MesAMes.tsx`) | ger, prod, jefe, conf | Libro: mes a mes, cuadre real/potencial/diferido, por campo contra meta, factor de asignación en banda, Pareto por equipo (`Paretos.tsx:42-116`), por tipo (`ParetoTipos`), por parte | Agregar un Pareto por N1 ANH y por responsable, el cuadre «diferida TRIM vs diferida ANH» (§2.3, D2) y la pérdida |
| **Producción** (`src/pages/Produccion.tsx`) | ger, prod | Real del PMO contra potencial y meta, día por día; asignación oficial cargada | Mostrar la prueba «reportada a la ANH» frente a la vigente (§2.3, D1) |
| **Pozos** (`src/pages/Pozos.tsx`; `widgets/pozos/DetallePozo.tsx`) | prod, sup | Estado de cada pozo, quién lo cerró (`TIPO_CAUSA`, `Pozos.tsx:89-110`), diferido acumulado | Agregar id_rec, UWI y formación por pozo (§1.6); en el detalle, la clasificación ANH de cada parada |
| **Bombas** (`src/pages/Bombas.tsx`; `widgets/bombas/*`) | sup, oper, jefe, conf, tec | Estación de bombas (nivel 2 ISA-101), diferido que causaron, vigía, predicción | Colores (§5): falla de comunicación, disparo por enclavamiento |
| **Electrosumergibles** (`src/pages/Esp.tsx`) | prod, sup, oper, jefe, conf, tec | Flota ESP, `porTipo`/`porParte` (`Esp.tsx:72-73`), MTBF | Igual que Bombas |
| **Identificar** (`src/pages/Causa.tsx`) | prod, sup, oper, jefe, conf, tec | Paradas por identificar, no conformidades, declaradas y análisis (ver §3.2) | Es la pantalla que más cambia: tiene que preguntar los pasos del árbol ANH que la señal no resuelve |
| **Turno** (`src/pages/Turno.tsx`) | sup, oper | Lo que pasó en el turno, lo que se pierde, lo que falta identificar (`TIPO_CAUSA`, `preguntas`) | Mostrar las paradas del día con su clasificación ANH completa o incompleta antes del corte de las 23:59:59 (el IDP sale a las 07:00, circular numeral 4.1) |
| **Mantenimiento** (`src/pages/Mantenimiento.tsx`; `widgets/sap/PanelSapMantenimiento.tsx`) | jefe | Programado vs no programado en bbl (`Mantenimiento.tsx:53,148-158`), intervenir, programa de paradas firmado (`:196-201`), por identificar, panel SAP (horas proactivo/correctivo, tres relojes) | Planeado = «en el programa»: pasar a la definición ANH (P_* incluye pruebas, workover, curtailment, puesta en servicio). Agregar el programa preventivo/predictivo por técnico (§6) |
| **Confiabilidad** (`src/pages/Confiabilidad.tsx`; `widgets/confiabilidad/Aciertos.tsx`) | jefe, conf, plan (v2) | MTBF de la flota (`:77`), reparación activa y espera (`:108`), los más costosos, de qué fallan, fallas por mes, calidad del registro ISO 14224 (`:199`) | Módulos por operadora (lo cubre R3). Separar falla / disparo / interlock (§5) |
| **Superficie** (`src/pages/Equipo.tsx`) | jefe, conf, plan | Equipos de superficie, cuántas veces pararon pozos, costo | Choke por equipo (PLANTA vs POZO), según la regla de Edinson para transformadores |
| **Riesgo** (`src/pages/Riesgo.tsx`) | ger, jefe, conf | Lo que se pierde ahora y lo que está en riesgo | Poco: colores (§5) |
| **Mi trabajo** (`src/pages/Trabajo.tsx`) | tec | Parados, por identificar (botón «Registrar qué encontré» → Identificar, `Trabajo.tsx:133-135`), avisando, órdenes SAP de solo lectura, paradas programadas | Lo que pidió Edinson: programa preventivo/predictivo, campañas, cierre de orden desde el teléfono (§6) |
| **Configuración** (`src/pages/Configuracion.tsx`) | ger, adm | Metas, accesos, tanques, respaldos y **programa de paradas** (`Configuracion.tsx:538-560`: equipo, desde, hasta, motivo en texto libre) | Agregar: la tabla de conversión árbol propio → árbol ANH por operadora, el registro ANH de cada pozo (id_rec, UWI, formación), operadora y contrato para el nombre del archivo, y la N1 de cada parada programada |
| **Regulatorio** (`src/pages/Regulatorio.tsx`) | reg (v2, apagado) | Publicable sí/no con motivos, puntos de medición y calibración, diferido en las 6 casillas PRODML, CSV mensual (§4) | Reemplazar las casillas PRODML por las 20 N1 ANH, agregar la vista diaria por pozo y el JSON v3.1. Encenderla en el MVP antes del 1-dic-2026 |
| **Evidencia** (`src/pages/Evidencia.tsx`) | cont (v2, apagado) | Paradas de bombas con causa, evidencia, colchón, bbl, CSV (`Evidencia.tsx:28-33`) | Su `causa.evidencia` es la base del `desc_evid` (§1.6) |

### 3.2 La pantalla donde se declara la causa (Identificar, `src/pages/Causa.tsx`)
- Formulario en `Tarjeta` (`Causa.tsx:202-353`). El título dice **«QUÉ SE DAÑÓ»** si el equipo tiene catálogo de partes y **«POR QUÉ PARÓ»** si no (`Causa.tsx:296`).
- Con catálogo (bomba de la línea o ESP):
  1. «1 · Parte de la bomba / de la electrosumergible»: chips con las pistas (señal e historia) o un `select` con todas las partes (`Causa.tsx:299-323`). En ESP hay un botón «No fue la electrosumergible» que pasa al otro camino.
  2. «2 · Qué vio»: chips con los modos ISO 14224 de esa parte + «Otra cosa» (`Causa.tsx:325-338`).
  3. Texto opcional (obligatorio con «Otra cosa») y «Registrar respuesta» (`Causa.tsx:351-360`).
  - **Toques: 3** (parte por chip, modo, registrar); 4 si la parte se escoge en el `select`.
- Sin catálogo (pozo de bombeo mecánico, pozo de flujo natural, o «no fue la ESP»): 4 chips fijos de `CAUSAS_POZO` (`src/entities/mensajes.ts:61-66`: «Cierre para prueba o intervención del pozo», «Fuga o daño en la línea de flujo», «Orden de producción: nominación o restricción del comprador», «Falla del controlador o de un instrumento del pozo») y «Registrar».
  - **Toques: 2**. El resultado es `tipo: 'declarada'` con el texto del chip: **no tiene categoría ni N1**.
- Por WhatsApp (`src/entities/mensajes.ts:120-123`, `191-218`): «¿Qué encontró? Responda con un número», con hasta 3 partes sugeridas + «Otra parte» (+ «No fue la ESP»), y luego «¿qué vio?». Son 2 respuestas.
- Lo que **no pregunta**: responsable, choke, diferida o pérdida, planeada o no, N1, N2. Todo eso falta para los 6 pasos de la circular (numeral 2.2, pág. 5).
- Observación sobre el diseño: cuatro de los seis pasos se pueden deducir para la mayoría de las paradas (§1.7). La pantalla debería pedir solo lo que la señal no resuelve y **mostrar lo deducido para confirmarlo** (un toque), no hacer el árbol entero. La circular dice que la clasificación la hacen «los ingenieros y operadores del campo» (numeral 2.2): una propuesta deducida y confirmada por una persona cumple eso; un relleno automático sin confirmación es discutible (NO VERIFICADO cómo lo audita la ANH).
- Además, cada parada **ya identificada por señal** (la gran mayoría del diferido) hoy no pasa por ninguna persona. Para el reporte ANH igual necesita responsable, choke y N1/N2: o se deducen con reglas firmadas o se confirman en lote.

## 4. Salidas regulatorias actuales

| Salida | Dónde | Qué trae | Frente a la Circular 024 |
|---|---|---|---|
| CSV «libro mensual» de Regulatorio | `src/pages/Regulatorio.tsx:36-45` (botón `:59`, con `evidencia:exportar`) | Por mes del campo: publicado, real, potencial, diferido, FA, banda, en banda, bbl en cada una de las 6 casillas PRODML, sin clasificar, tolerancia, aproximado | Mensual y por campo; la ANH pide diario, por pozo y por parada. No sirve como IDP. La pantalla está apagada en el MVP (`producto.ts:13`) |
| Panel «Diferido en las casillas de PRODML» | `Regulatorio.tsx:87-99` | bbl por categoría ReasonLost | Reemplazable por las 20 N1 |
| CSV de paradas de bombas | `src/pages/Evidencia.tsx:28-33` | Una fila por parada de bomba: inicio/fin del PLC, causa, parte, cómo se identificó, evidencia, se carga a, colchón, pozos cerrados, bbl, tolerancia, no conformidad | Es la parada de la BOMBA, no del pozo. Útil como soporte de `desc_evid`. Pantalla apagada en el MVP |
| Informe con folio | `src/entities/informe.ts:1-27` (`CifrasInforme`, `:48-66`; `cifrasDe`, `:133`); `POST /api/informes` | Cifras del período (real, potencial, diferido, tolerancia, metas, nº de tramos) protegidas con SHA-256 y folio | El mecanismo de folio y huella sirve para probar que el archivo enviado a la ANH no cambió; hoy no cubre causas por parada |
| «Reporte con PRODML» | `CONTRATO.md:1210-1216` | El mapa `TipoCausa → ReasonLost` en prosa | Es la única «salida regulatoria» del contrato y no es la ANH |
| Asignación oficial | `docs/backend/05a-libro/10-asignacion-oficial.md:3`; `src/widgets/produccion/AsignacionOficial.tsx` | Carga del crudo asignado por pozo que la operadora reportó «a la ANH» cada mes, para cotejar | Es ENTRADA, no salida. Lo más cercano a una integración con la ANH |
| Tabla `tramo_diferido` del backend | `docs/backend/sql/esquema.sql` (tabla `tramo_diferido`, columna `causa_tipo` con los 13 `TipoCausa`) | Un tramo por evento × día con prueba, FA, bbl y causa | Ya parte por día: es la base natural del nodo `paradas_pozo`. Pero el comentario dice «Solo meses cerrados y publicados; el mes en curso se calcula en vivo», y el IDP es del día anterior (mes en curso) |

**¿Hay algo de JSON hacia la ANH?** No. Búsqueda de «ANH», «651», «IDP», «JSON v3», «paradas_pozo», «tupla» en `src/`, `scripts/` y `CONTRATO.md`: no hay ningún serializador, esquema, endpoint ni prueba que produzca el Formato Único Tipo U. Las únicas menciones de la ANH son textos de ayuda de la asignación oficial (`src/shared/api/escrituras.ts:295`, `docs/backend/05a-libro/10-asignacion-oficial.md:3,107`). Tampoco existe nada de los balances de fluidos (`balance_fluido_crudo/agua/gas/blancos`, circular numeral 1.4, pág. 3), ni del depósito de 144 archivos de 10 minutos en el lago de datos del operador (numeral 4.2, pág. 9). El JSON Schema Draft-07 y el diccionario de datos (numeral 1.3, pág. 3) ya están en `investigacion/fuentes/` (ver §1.6.1): el IDP completo tiene 13 nodos en `segmento_datos` (tanques, movimientos_tanque, medidores_liquidos, medidor_gas, pruebas_potenciales, paradas_pozo, inyeccion_por_pozo, produccion_por_pozo, cromatografia y los cuatro balances) más `metadatos_archivo` y `segmento_datos_operador`. TRIM hoy podría alimentar, con trabajo, `paradas_pozo`, `produccion_por_pozo` y parte de `pruebas_potenciales`; el resto (tanques, medidores, cromatografía, balances) es medición fiscal que TRIM lee pero no modela.

## 5. ISA-101 / ISA-18.2 (lo que dijo Adair)

### 5.1 Lo que hay hoy en TRIM
- Tokens de estado (`src/index.css:87-88` claro, `:111-112` oscuro): `--p1` rojo `#b71c1c`, `--p2` naranja `#bf4000`, `--p3` amarillo `#f9a825`, `--p4` azul `#0d5bb5`, `--invalido` magenta/morado `#8420a3` (oscuro: `#ff8a80`, `#ffab40`, `#ffd54f`, `#90caf9`, `#e1a6ea`). Lo normal en grises (`--dato-1..5`, `:97`; corrientes `--f-*`, `:100-101`; equipos `--eq-off/on/sin`, `:85`).
- `MarcaPrioridad` (`src/shared/ui/Prioridad.tsx:13-35`): codificación triple color + forma + número (rombo = 1, triángulo = 2, cuadrado = 3); lo normal es un punto gris.
- `DatoInvalido` (`Prioridad.tsx:55-61`): círculo punteado en `--invalido` para «sin señal» o dato que no corresponde. `DE_ESTADO` (`src/shared/lib/prioridad.ts`) pasa `sin señal` a `null` (no es prioridad).
- Nombres (`prioridad.ts`): 1 = «alarma», 2 = «atención», 3 = «aviso». `--p4` (azul) **está definido pero ninguna pantalla lo usa** (búsqueda de `p4` fuera de `index.css` sin resultados).
- `Info.tsx:10` y `TresRelojes.tsx`: gris siempre «porque no es una alarma». `Sparkline.tsx:46-55`: línea gris; solo el último punto toma la forma y el color de su prioridad.
- Un equipo de alto impacto PARADO se pinta como **prioridad 1** (rombo rojo): `Trabajo.tsx` (panel PARADOS, `MarcaPrioridad s={1}`), `Pozos.tsx:66` (`sevPerdida` = 1 si la causa es de alto impacto).
- La primera alarma del PLC (`EventoBomba.primeraAlarma`, `bombas.ts:295`) se muestra solo como TEXTO en la evidencia; no tiene color ni estado propio.
- «Disparo» en TRIM es otra cosa: una ESP que paró y arrancó en menos de 24 h (`DISPARO_MAX_H`, `libro.ts:450-455`); es una regla de confiabilidad para no hundir el MTBF, **no un enclavamiento**. Se muestra como chip gris «disparo, no falla» (`Causa.tsx:521-536`).
- **No existe el concepto de interlock / enclavamiento / permisivo**: búsqueda de `interlock|enclavamiento|permisivo|trip|ESD` en `src/` sin resultados. Lo único cercano es el protocolo `sis` («estado de un lazo de seguridad cableado», `src/entities/cadena.ts:28,122`), que es un origen de dato, no un estado del equipo. El `EstadoDispositivo` (`src/entities/tipos.ts:7`) es normal | aviso | atencion | alarma | sin señal; `Marcha` (`tipos.ts:43`) es en-marcha | detenido | cerrado-por-otro | sin-lectura. La investigación previa ya listaba «Interlock (no permisivo)» entre los 9 estados mínimos de un rotativo (`~/Downloads/TRIM-hidrocarburos/3-investigacion/12-estandar-hmi-industrial.md:363`), pero no se implementó.

### 5.2 Comparación con lo que dijo Adair (transcript [33:45])
Adair: «Tema moradito con falla de comunicación, rojo con interlock, naranja con amarillo con alarma, así. Que es basado en la ISA 101».

| Condición | Adair | TRIM hoy | Diferencia |
|---|---|---|---|
| Falla de comunicación | Morado | `--invalido` `#8420a3` (morado-magenta) para «sin señal» | **Coincide** en el concepto y casi en el tono. Matiz: TRIM lo llama «dato inválido» y lo usa también para un dato de entrada que no corresponde (un pozo que no existe); y una medición por campaña (termografía «campaña · cada 180 d», `src/entities/equipos.ts:247`) sale como `sin señal`, o sea morado, cuando no es una falla de comunicación |
| Interlock | Rojo | No existe. El rojo es la **prioridad 1 de alarma** | **Choque**: en TRIM el rojo ya significa otra cosa. Si se adopta la convención de Adair, la alarma P1 deja de ser roja o el interlock necesita otro canal |
| Alarma | Naranja / amarillo | P2 naranja (atención), P3 amarillo (aviso) | Coincide para P2 y P3; TRIM tiene además un P1 rojo que Adair no menciona como alarma |
| Equipo parado por disparo | (implícito: rojo si fue interlock) | Rombo rojo P1 por ser alto impacto, sin distinguir si lo paró un enclavamiento, una orden, el servicio o una falla | Falta distinguir «disparado por protección» de «parado por otra causa» |
| Azul | — | Definido, sin uso | Podría reservarse (p. ej. P4 diagnóstico) |

### 5.3 Qué dice de verdad ISA-101.01-2015
- ISA-101.01-2015 no publica una paleta: exige una filosofía de HMI y una guía de estilo del sitio donde se fijan los colores. Así lo resume la investigación previa (`12-estandar-hmi-industrial.md:5,162`, con sus fuentes [1][5]) y lo confirman las fuentes consultadas hoy:
  - HMI Library, ficha de ISA-101: «Color is reserved for abnormal conditions and operator state changes»; la tabla P1 rojo / P2 naranja / P3 amarillo / P4 azul la presenta como esquema heredado de la racionalización de alarmas (ISA-18.2), no como mandato; la paleta en hexadecimal es la suya. https://hmilibrary.com/standards/isa-101
  - ISA remite la filosofía a un informe aparte, ISA-TR101.01-2022 *HMI Philosophy*, que «builds on subclause 4.2.1 of the core standard». https://www.isa.org/standards-and-publications/isa-standards/isa-101-standards
  - Control.com, «Going Gray: A New HMI Standard»: el color de las alarmas «typically was left up to the designer or customer to determine». https://control.com/technical-articles/going-gray/
  - Puffer (integrador Emerson), folleto de filosofía y guía de estilo según ISA-101.01: la filosofía se acuerda en taller con el sitio, «taking into account existing paradigms and practices», y la guía de estilo la implementa en cada plataforma. https://www.puffer.com/getattachment/3daaf3af-abe0-4b2f-8ee5-ed583c2f4d23/high-performance-graphics-philosophy-style.pdf
  - Ejemplo de que el rojo para interlock es una convención de sitio, no de la norma: la guía HMI del *Global Interlock System* del National Solar Observatory dice «Red usually denotes an interlock condition is present» y usa amarillo para condición restringida, naranja para riesgo y azul para acción requerida. https://nso.atlassian.net/wiki/x/g4AOg
- **Conclusión verificada hasta donde alcanzan las fuentes públicas**: el color del interlock **no lo fija ISA-101.01-2015**; es decisión de la filosofía y la guía de estilo de cada planta. La convención que trae Adair es válida como la de las operadoras con las que él trabaja, pero no es «la de la norma». **NO VERIFICADO contra el texto de la norma** (es de pago y no está en el repositorio).
- Lo que sí es regla común de ISA-101/ISA-18.2 en todas las fuentes: el color no es el único canal (forma + texto + posición) y los colores de alarma no se reutilizan para otra cosa. TRIM ya lo cumple con `MarcaPrioridad`.
- Matiz de alcance (ya escrito en `18-bombas-multifasicas-inyeccion-isa101.md:384-390`): TRIM es analítica de solo lectura, no un HMI de control; no puede declarar «cumplimiento ISA-101».

### 5.4 Diferencias exactas a resolver
1. Agregar un estado de equipo **«disparado por protección / interlock»** separado de la prioridad de alarma, alimentado por la primera alarma del PLC (`primeraAlarma`) o por el estado del lazo `sis`. Hoy el dato existe (first-out) pero no se pinta como estado.
2. Decidir la **guía de estilo** por operadora: un juego de tokens configurable (el interlock rojo de Adair obliga a mover la P1 o a darle al interlock otra forma, p. ej. candado + rojo). La regla de ISA-18.2 de no reutilizar colores impide que rojo signifique a la vez P1 e interlock sin otro canal.
3. Separar «sin comunicación» (morado) de «dato inválido» y de «medición por campaña / manual» (no es falla de comunicación: debería ser gris con la fecha de la última medición).
4. Documentar la guía de estilo de TRIM como documento (ISA-101 pide la guía, no colores fijos). Hoy está repartida en comentarios de `index.css` y `Prioridad.tsx`.

## 6. Trabajo del técnico y planeación

### 6.1 Lo que existe
| Pieza | Dónde | Qué hace |
|---|---|---|
| Modelo SAP PM | `src/entities/sap.ts:31-111` | `AvisoSap` (M1 solicitud, M2 avería, con parte, modo ISO 14224, inicio del PLC, evidencia) y `OrdenSap` (PM01 correctivo, PM02 preventivo, PM03 predictivo; estados CRTD → REL → PCNF → CNF → TECO; técnico, puesto, horas reales, repuestos, evento del PLC). `Repuesto` con stock, mínimo y plazo |
| Regla del demo | `sap.ts:1-18, 195-320` | Los avisos y órdenes se **derivan** de la historia del PLC: PM01 de las fallas (`:250`), PM02 de las paradas del programa (`:270`), PM03 de las predicciones del vigía (`:287, 306`). En producción vienen de SAP (`CONTRATO.md:354-357`) |
| Escritura hacia SAP | `POST /api/sap/avisos` (`CONTRATO.md:537-545`), capacidad `sap:aviso` (sup, oper, jefe, conf; `roles.ts`) | TRIM **solo envía el aviso**. «TRIM no lo reemplaza ni crea órdenes» (`sap.ts:4-5`) |
| Mi trabajo del técnico | `src/pages/Trabajo.tsx` | Parados, por identificar (con botón a Identificar), avisando (con la acción del vigía), **órdenes SAP en solo lectura** («Se notifican y se cierran en SAP», `Trabajo.tsx` panel «ÓRDENES EN SAP»), paradas programadas del programa firmado |
| Aviso por WhatsApp de orden liberada | `Trabajo.tsx` (`notificadas`, regla `orden` de `mensajes.ts`) | Cuando SAP libera una orden a nombre del técnico, TRIM le avisa |
| Panel del jefe | `src/widgets/sap/PanelSapMantenimiento.tsx`, `TresRelojes.tsx`; `horasPorClase` y `relojes` en `sap.ts:323-353` | Horas proactivo (PM02+PM03) vs correctivo, tres relojes (activa, espera, total), avisos sin orden, órdenes abiertas |
| Ficha del equipo | `src/widgets/sap/BloqueSap.tsx` | Aviso/orden abierta, repuestos críticos, historial; botón de enviar aviso |
| Programa de paradas | `ParadaProgramada` (`configuracion.ts:64-71`); edición firmada en `Configuracion.tsx:538-560`; vista en Mantenimiento y Mi trabajo | Ventanas aprobadas por equipo con motivo libre. Sirve para clasificar «programada»; **no es un plan de mantenimiento** (no tiene tareas, frecuencias, técnico, ni estado) |
| Vigía y predicción | `src/entities/vigia.ts`, `salud.ts`, `aciertos.ts` | La parte que avisa, el horizonte y la acción; aciertos de predicciones pasadas |
| Mediciones por campaña / ruta | `src/entities/cadena.ts:29,126` (`ruta-manual`: «Se carga al cerrar la ruta»); un dispositivo de termografía «campaña · cada 180 d» (`equipos.ts:247`) | Solo como **origen** de un dato. No hay rutas, ni campañas, ni carga de la ruta |

### 6.2 Lo que pidió Edinson (transcript [22:34]) y lo que falta
| Pedido | Estado | Qué falta |
|---|---|---|
| Que el técnico tenga **su programa** de preventivo y predictivo | **Parcial**: ve órdenes de SAP liberadas a su nombre (solo lectura) y las paradas programadas | Un plan por técnico y por semana/mes (desde SAP o propio): tareas, equipo, ventana, estado. Si la operadora no tiene SAP o lo tiene en papel (el caso que describe Edinson), TRIM no tiene dónde guardarlo |
| **Campañas de vibración y termografía** | **Falta** | Modelo de campaña/ruta: lista de puntos (equipo, tag, instrumento portátil), frecuencia, lecturas capturadas en el teléfono, valor contra límite. Hoy esas mediciones salen como «sin señal» (§5.4, punto 3) |
| Reemplazar la **orden en papel** y su cierre al final del día | **Falta** | Cierre de orden desde el teléfono (qué se hizo, horas, repuestos, foto, firma) y su envío a SAP (confirmación PM/notificación). Hoy TRIM dice explícitamente que las órdenes «se notifican y se cierran en SAP» |
| El planeador (PIP) arma el trabajo mensual de los frentes (mecánico, eléctrico, soldadura, facilidades) | **Falta** | El rol `plan` existe pero está apagado (`producto.ts:14`) y solo tiene `equipo` y `confiabilidad`. No hay frentes, cuadrillas, cargas ni calendario |
| Métricas modulares por operadora (MTTR, MTBF, logística) | **Parcial** | Ver R3 (`investigacion/R3-metricas-confiabilidad.md` §1.3-1.4). Hoy las métricas son fijas por pantalla |
| Unir el trabajo con la parada ANH | **Falta** | Una orden PM02 de una parada programada debería llevar su N1 (`P_MANT_MEC`, `P_MANT_ELE`…) y alimentar `pla_no_plan = PLANEADA` con soporte verificable (circular numeral 2.2, principio de verificabilidad) |

### 6.3 Decisión de producto que el plan tiene que tomar
TRIM hoy se define como «no crea órdenes» (`sap.ts:4-5`, `Trabajo.tsx`). Lo que pide Edinson (órdenes digitales, cierre, campañas) **choca con esa regla** para las operadoras con SAP: el sistema de registro es SAP y duplicarlo crea dos verdades. Opciones: (a) TRIM como cliente móvil que escribe en SAP (confirmaciones y notificaciones PM, requiere integración de escritura); (b) TRIM como CMMS liviano solo para operadoras sin SAP («las chiquiticas», transcript [31:08]); (c) solo campañas de medición (vibración, termografía) que entran como datos, no como órdenes. Es esfuerzo **L** en cualquiera de las tres.

## 7. Costos del cambio (pruebas que se romperían)

No se corrió nada (ni `npm test`, ni e2e, ni `npm i`): conteos por lectura de archivos.

### 7.1 Qué pruebas hay (`package.json` → `scripts`)
- `npm test` = `npm run verificar` + `node scripts/referencia.mjs comprobar`.
  - `verificar` = `tsc -b` + `oxlint src` + `scripts/verificar-libro.mjs` (2.294 líneas, ~321 llamadas de comprobación) + `scripts/verificar-contrato.mjs` (598 líneas: ida y vuelta JSON de cada endpoint de `src/shared/api/contrato.ts`).
  - `referencia.mjs comprobar` (324 líneas): compara las respuestas contra `referencia/` — **122 casos** y 31 insumos (`referencia/indice.json`), con tolerancia relativa 1e-6 y «el orden de las listas importa».
- `npm run e2e` = Playwright, 8 specs en `e2e/` (≈ 47 `test(`: interfaz 19, carril 17, auditor 4, qa2 2, pozo-operacion 2, demo-construido 1, metas 1, perfil-plan 1) y un auditor en `e2e/auditoria/`.

### 7.2 Casos de `referencia/` que dependen del modelo de causas
Conteo sobre los 122 archivos de caso (sin `insumos/`):

| Dependencia | Casos | Carpetas |
|---|---|---|
| Algún `"tipo"`/`"causa_tipo"` con un valor de `TipoCausa` | **19** | diferidos 6, mensual 6, riesgo 4, salud 3 |
| Objeto `"causa"` completo (tipo, equipo, como, evidencia, texto) | 11 | diferidos 6, salud 5 |
| `"porTipo"` | 12 | diferidos 6, mensual 6 |
| `"planeado"` / `"noPlaneado"` | 12 | diferidos 6, mensual 6 |
| `"pendiente"` | 19 | diferidos 6, mensual 6, salud 5, riesgo 2 |
| Categorías PRODML (`ReasonLost`, `prodml`, `topside…`) | **0** | — |
| Unión de todo lo anterior | ≈ 25 | diferidos, mensual, riesgo, salud (sap 4 trae `"tipo"` pero es M1/M2 de SAP, no causa) |

Los 60 casos de `asignacion/` y los de `diaria/` no traen causa, pero **sí dependen del método del diferido**: si se cambia la prueba vigente por «la reportada a la ANH» (§2.3, D1) o se quita el FA (D2), cambian todos los casos con barriles (asignacion 60, diferidos 6, mensual 6, diaria 6, riesgo 6, prediccion 4, ciclo 6: ≈ 94 de 122).

### 7.3 Qué se rompería según el tipo de cambio
| Cambio | Se rompe | Esfuerzo de regenerar |
|---|---|---|
| **Agregar** campos ANH a la `Causa` (responsable, choke, dif_perd, planeada, n1, n2) sin tocar `TipoCausa` | Los casos usan «la respuesta contiene lo esperado» (`indice.json`, `regla`): campos nuevos **no rompen** los 122 casos. Sí cambia la huella de los informes si entran en `CifrasInforme` (`informe.ts:48-66`) | Bajo |
| Retirar o cambiar la capa PRODML (`causas.ts`) | Solo `Regulatorio.tsx` (apagada en el MVP) y el texto de `CONTRATO.md:1210-1216`. 0 casos de referencia | Muy bajo |
| Cambiar o renombrar valores de `TipoCausa` | 19 casos de referencia; ~31 archivos de `src/` que usan `TIPO_CAUSA`, `TipoCausa`, `ALTO_IMPACTO` o comparan `causa.tipo`; ~42 líneas de `verificar-libro.mjs` con valores literales; el `check (causa_tipo in (…))` de la tabla `tramo_diferido` en `docs/backend/sql/esquema.sql`; 4 specs e2e que buscan textos («Sin identificar», nombres de tipo) | Medio-alto. Recomendación: **no tocar** `TipoCausa`; poner la clasificación ANH al lado |
| Cambiar «planeado» de `tipo === 'programada'` a la definición ANH | 12 casos (diferidos, mensual) y las pantallas Resumen y Mantenimiento | Medio |
| Cambiar el método del diferido (D1/D2) | ≈ 94 casos y la mayoría de las cifras de `verificar-libro.mjs` (cuadres «Σ diferidos = potencial − real») | Alto. Recomendación: calcular la diferida ANH como cifra **aparte**, sin tocar el libro |
| Agregar id_rec/UWI/formación a `Pozo` | Insumos de `referencia/insumos/*/pozos.json`, el códec del contrato y `scripts/gen-linea.mjs`; los casos no, si los campos son opcionales | Bajo |

## 8. Tabla final de brechas

Esfuerzo: S = días, M = 1-3 semanas, L = más de 3 semanas (front + contrato + backend, estimación del auditor).

| # | Requisito | Fuente | Estado | Archivos | Esfuerzo |
|---|---|---|---|---|---|
| 1 | Registro ANH del pozo: `id_rec`, `uwi`, `form` (y nombre oficial `n_pozo`) | C24 num. 2.4; Schema `paradas_pozo`, `produccion_por_pozo`, `pruebas_potenciales` | Falta | `entities/pozos.ts:29-41`, `entities/datos/pozos.ts`, `scripts/gen-linea.mjs`, `shared/api/contrato.ts`, `referencia/insumos/*/pozos.json`, Configuración | S |
| 2 | Operadora y número de contrato (nombre del archivo) y `segmento_datos_operador` | C24 num. 4.1, 4.3 | Falta | `entities/configuracion.ts:106-112` (solo `empresa`) | S |
| 3 | `h_ini_paro` / `h_fin_paro` en UTC `Z`, regla para parada abierta al corte | C24 num. 2.4 | Parcial | `EventoPozo` (`pozos.ts:77-89`) | S |
| 4 | `pla_no_plan` con la definición ANH (pruebas, workover, curtailment, puesta en servicio son planeadas) | C24 num. 2.1, Tabla 1 | Parcial (`programada` = en el programa) | `libro.ts:743,858`, `ParadaProgramada` (`configuracion.ts:64-71`), Mantenimiento, Resumen | M |
| 5 | `choke_mod` por parada (POZO/PLANTA/EXPORTACIÓN/RESERVORIO) | C24 num. 2.1, 2.2 paso 2 | Falta (solo `Campo.choke` por campo, otro dominio, sin uso) | `entities/tipos.ts:102`, `contrato.ts:272,290`, nueva regla por equipo/servicio en `causa-senal.ts` | M |
| 6 | `resp_par` (9 valores) | C24 paso 1; Diccionario | Falta (derivable en parte) | `causa-senal.ts`, catálogo nuevo | M |
| 7 | `dif_perd` y el concepto de **pérdida** | C24 num. 2.1, paso 3 | Falta | Nada en `src/`; nodo `perdidas` en los balances | L (si se mide); S (si solo se clasifica a mano) |
| 8 | `cau_niv1` / `cau_niv2` con el catálogo cerrado de la ANH (código y texto) | C24 num. 2.3, Tabla 1; Diccionario | Falta | Nuevo catálogo junto a `entities/causas.ts`; mapa desde `TipoCausa` + parte + modo | M |
| 9 | **Conversión del árbol propio de la operadora al de la ANH**, configurable por operadora | Edinson [26:48], [31:08] | Falta | Configuración (firmada), nuevo módulo de mapeo | L |
| 10 | Pantalla de clasificación: proponer lo deducido y pedir solo lo que falta (pasos 1-6) | C24 num. 2.2 | Parcial (pregunta parte y modo, o 4 chips de pozo) | `pages/Causa.tsx:202-360`, `entities/mensajes.ts:61-66,120-123,191-218` (WhatsApp) | M |
| 11 | Clasificar también lo identificado por señal (hoy nadie lo confirma) | C24 num. 2.2 (lo hacen ingenieros y operadores) | Falta | Nueva vista de confirmación en lote (Turno o Identificar) | M |
| 12 | `desc_evid` desde la evidencia | C24 num. 2.4 | Existe | `Causa.evidencia`/`texto` (`causa-senal.ts:75-83`) | S |
| 13 | Diferida con la definición ANH (última prueba reportada − real 24 h), al lado de la de TRIM | C24 num. 2.1 | Falta | `pozos.ts:21-27` (marca de prueba reportada), `libro.ts` (nueva función por pozo y día) | M |
| 14 | `produccion_por_pozo` diaria (`t_prod`, `prd_oil`, `tip_lev`) | Schema/Diccionario | Parcial (horas por PLC, mensual; sin asignación diaria) | `libro.ts:367-404` | M |
| 15 | Serializador JSON v3.1 Tipo U con tuplas `[Valor, Origen, Unidad]`, validado contra el Schema, envío 07:00 | C24 num. 1.2, 1.3, 4.1 | Falta | Nuevo (backend); el front solo muestra el estado del envío | L |
| 16 | Pantalla Regulatorio encendida, con las 20 N1 en lugar de PRODML y el estado del IDP diario | — | Parcial (apagada en MVP) | `pages/Regulatorio.tsx`, `shared/config/producto.ts:13-14` | M |
| 17 | Gerente: diferido por choke y pérdida aparte, sin detalle técnico | Regla del dueño; C24 | Parcial | `widgets/resumen/*`, `pages/Diferidos.tsx` | S |
| 18 | Estado «disparado por interlock/protección» separado de la prioridad de alarma | Adair [33:45] | Falta | `entities/tipos.ts:7,43`, `bombas.ts:295` (primera alarma), `shared/ui/Prioridad.tsx` | M |
| 19 | Guía de estilo configurable (morado comunicación, rojo interlock, naranja/amarillo alarma) | Adair; ISA-101 (por sitio) | Parcial (morado y naranja/amarillo ya; rojo = P1) | `src/index.css:87-88,111-112`, `shared/lib/prioridad.ts` | S-M |
| 20 | Medición por campaña o ruta no es «sin señal» | ISA-101 (dato inválido ≠ sin medición en línea) | Falta | `entities/equipos.ts:247`, `entities/cadena.ts:29` | S |
| 21 | Programa preventivo/predictivo del técnico y campañas de vibración y termografía | Edinson [22:34] | Falta (solo órdenes SAP de lectura) | `pages/Trabajo.tsx`, `entities/sap.ts`, rol `plan` | L |
| 22 | Cierre de orden digital (adiós papel) | Edinson [22:34] | Falta (TRIM «no crea órdenes») | `entities/sap.ts:4-5`, `CONTRATO.md:537-545` | L |
| 23 | Métricas de confiabilidad modulares por operadora (MTTR, MTBF, logística) | Edinson [22:34] | Parcial | `pages/Confiabilidad.tsx`; ver R3 | M |
| 24 | Multifásica como alto impacto (piloto de Adair) | Adair [33:45] | Parcial (`ALTO_IMPACTO` no incluye `transporte`) | `causa-senal.ts:57` | S (cambia cifras de `altoImpacto` y casos de referencia) |
| 25 | Balances de fluidos, tanques, medidores, cromatografía del IDP | C24 num. 1.4; Schema | Falta (fuera del alcance de TRIM hoy) | — | L (decidir si entra) |

## 9. NO VERIFICADO (consolidado)
1. Si `cau_niv1` lleva el código (`P_MANT_ELE`, circular num. 2.4) o el texto («PLANEADA - MANTENIMIENTO ELÉCTRICO», Diccionario V3.2). Las fuentes oficiales se contradicen.
2. Si `choke_mod` lleva «EXPORTACION» (circular) o «EXPORTACIÓN» (Diccionario). El Schema no tiene `enum`: la validación de listas la hace el receptor, y no se sabe con qué tolerancia.
3. Qué versión rige: 3.1 (circular y nombre de archivo), «3.5 Estricta» (`title` del Schema) o 3.0/3.2 (Diccionario).
4. Cómo se reporta una parada que sigue abierta al corte de las 23:59:59 (`h_fin_paro` es obligatorio).
5. Si una prueba estimada desde la ESP cuenta como «prueba de potencial reportada a la ANH».
6. Cuál de las dos cuantificaciones exige el validador cuando difieren: la fórmula del num. 2.1 o la «metodología operacional» del num. 2.3. Con el Schema, la ANH no recibe la diferida: la puede calcular con `pruebas_potenciales` y `produccion_por_pozo`.
7. Si una clasificación deducida por reglas y confirmada por una persona cumple el num. 2.2 («por parte de los ingenieros y operadores del campo»).
8. El color de interlock en el texto de ISA-101.01-2015 (norma de pago, no consultada). Las fuentes públicas (§5.3) indican que lo fija la guía de estilo del sitio.
9. La correspondencia `TipoCausa` → N1 de §1.7 (sobre todo «aire de instrumentos» y «energía») es lectura del auditor; hay que validarla con Edinson.
10. La tabla de mecanismos ISO 14224 B.2 del producto está marcada «pendiente de cotejo» (`iso14224.ts:64-66,117`).

## 10. Desacuerdos con otros agentes
- **R2 (`R2-choke-y-perdidas.md`, §2.3 punto 2 y fila `EXPORTACION` de §2.2)** dice que el choke va «en mayúsculas y sin tilde, que es como los valida el JSON». El Diccionario oficial V3.2 (`fuentes/20260820_Dicionario_de_Datos_JSON_V3.2_ANH.xlsx`, fila `paradas_pozo | choke_mod`) lista «EXPORTACIÓN» **con tilde**, y el Schema (`fuentes/20260731_Esquema_JSON_V3.1_ANH.json`) no valida el valor (no hay `enum`). No es seguro que «EXPORTACION» sea el valor aceptado: queda NO VERIFICADO (§9, punto 2). Lo mismo para `resp_par`, cuyos valores del Diccionario llevan tildes («OPERADOR - OPERACIÓN»).
- **R1 (`R1-normativa-anh.md`, §1.7 fila 13 y §1.6 regla 1)** toma `cau_niv1` como código N1_KEY, citando la circular, lo cual es correcto para la circular; pero el Diccionario oficial escribe la lista de `cau_niv1` como textos N1_TEXT. No es un desacuerdo con R1 sino una contradicción de la ANH que R1 debería registrar en su §4 (Schema y Diccionario), que al momento de esta lectura seguía pendiente.
- Con R3 no hay desacuerdo: este informe remite a R3 para las métricas y coincide en que el cierre de la orden y las rutas de vibración y termografía no existen (R3 §1.3).
