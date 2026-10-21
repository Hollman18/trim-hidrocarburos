# S1 · Revisión adversarial del plan (P1 + U1)

Revisor adversarial · 21-oct-2026 · Sigue `docs/plan-circular-24/CONTEXTO.md`. Leídos completos: R1, R2, R3, R4, `P1-producto.md` y `U1-experiencia.md`. Verificado contra las fuentes primarias: Circular 024 (texto extraído del PDF con `pdftotext`, modos `-layout` y `-raw`), Schema V3.1 (convertido de UTF-16), plantilla V3.1, Diccionario V3.2 (hoja `JSONV3`, leída celda a celda), transcript del 19-oct y el código de `src/` (solo lectura). No se tocó código ni archivos de otros agentes.

Convenciones: «C24 p.N» = Circular 024, página N de 10 (la página es la del pie «Pág. N de 10»). «Dicc. N» = Diccionario V3.2, fila N. «[mm:ss]» = marca de tiempo del transcript. **✔** correcto · **✘** error · **≈** correcto pero incompleto o impreciso. **NO VERIFICADO** = no se pudo comprobar y se dice por qué.

## Índice
- §0 Veredicto en breve
- §1 Exactitud normativa
- §2 Coherencia entre agentes
- §3 Fidelidad a la reunión del 19-oct
- §4 Lo que pidió el dueño
- §5 Viabilidad
- §6 Riesgos que nadie vio
- §7 Veredicto final: cambios obligatorios y opcionales
- Desacuerdos con otros agentes
- NO VERIFICADO

## §0 Veredicto en breve

1. **Normativa (§1): sólida.** De 45 afirmaciones cotejadas, 31 bien, 8 incompletas y 6 errores menores (dos páginas mal citadas, el COT generalizado al IDP diario, «regalías» por «gravamen», un nombre de archivo mal armado en U1 y la afirmación falsa de U1 de que el transcript no tiene tiempos). **El Anexo A de P1 cuadra 117 de 117** con la Tabla 1: cuenta, texto, N1 y orden. Solo está mal escrita la regla del código interno.
2. **Huecos que bloquean el archivo (§1.4):** no hay regla para llenar `cau_gral_paro` (obligatorio), ni la unidad de la tupla, ni el origen de `desc_evid`. Y P1 no vio `inyeccion_por_pozo`, que es justo el nodo que mueve la bomba piloto (su `t_iny` ni siquiera admite «24:00»).
3. **Coherencia (§2):** el vocabulario está alineado. Hay tres contradicciones de fondo:
   - el botón de U1 «La planta no recibe o los tanques están llenos» manda a `PLANTA` lo que P1 manda a `EXPORTACION` cuando el oleoducto no recibe;
   - P1 prueba que «el operador nunca ve choke ni N1» y U1 le pide confirmarlos por WhatsApp, lo que fabrica un origen `M`;
   - el morado termina con 3 o 4 significados (U1 lo usa también para «falta»).
   
   De los 16 pedidos de U1, quedan abiertos P-1 (`plan` antes del 1-dic) y P-16 (el interlock en la guía `'trim'`). Además, U1 tiene 7 textos sin actualizar.
4. **La reunión (§3):** de 14 puntos, 7 cubiertos, 5 parciales y 2 que faltan: la tolerancia de los campos de gas y los datos de entrenamiento de Adair. La advertencia de Hollman («medir no prueba la causa») no se volvió regla.
5. **Viabilidad (§5): las fechas hasta el 1-dic no caben.** Hay 21 días hábiles (≈ 12,6 persona-semanas con tres personas a tiempo completo) contra ≈ 15–28 persona-semanas de lo que piden F1+F2 según R4. Y eso sin backend real, sin operadora piloto (La Ceiba es del demo) y sin credenciales de API 1-C1, que son de la operadora. Recortado a lo que toca el archivo (§5.2), cabe solo en el escenario optimista.
6. **Riesgos nuevos (§6):** una fila de TRIM puede tumbar el IDP entero de la operadora; `paradas_pozo` puede no cuadrar con `t_prod`; nombres de personas en `desc_evid`; y el plan confunde el piloto de Adair (el equipo para el modelo) con el piloto regulatorio.
7. **Cambios obligatorios (§7):** 16 a P1 y 12 a U1, con redacción propuesta. El primero: el 1-dic es la obligación de la operadora; sin operadora firmada al 31-oct, la meta es un generador validado con datos `DEMO-`.

## §1 Exactitud normativa

**Resultado general.** P1 es muy preciso en lo normativo: de 45 afirmaciones cotejadas de P1 y de U1, 31 están bien, 8 están bien pero incompletas o imprecisas y 6 son errores: dos de página y una sobre-generalización de la zona horaria en P1; y en U1, «regalías» por «gravamen», la afirmación de que el transcript no tiene tiempos y un nombre de archivo mal armado con un contrato de apariencia real. El Anexo A cuadra 117 de 117. Lo grave no son los errores de cita: son los **huecos** (§1.4): campos obligatorios que el plan no sabe todavía cómo llenar (`cau_gral_paro`, la unidad de la tupla, el origen de `desc_evid`) y un nodo del IDP que se le escapó (`inyeccion_por_pozo`), justo el que toca a la bomba piloto.

### 1.1 Afirmaciones cotejadas una por una

| # | Afirmación (dónde) | Fuente cotejada | Veredicto |
|---|---|---|---|
| 1 | 20 claves N1, 8 `P_` y 12 `NP_` (P1 §1.2) | C24 p.6–7 | ✔ |
| 2 | 117 N2: 42 planeadas y 75 no planeadas (P1 Anexo A) | C24 p.6–7 (conteo propio, §1.3) | ✔ |
| 3 | «Falla por falta de Mantenimiento» está en `NP_ENINT` y en `NP_INS`: la clave es la pareja (P1 §1.2) | C24 p.6 | ✔ |
| 4 | «Falla Instrumento/sensor» es `NP_CTRL` en la circular y `NP_INS` en el Diccionario (P1 §1.2) | C24 p.7; Dicc. 141 | ✔ |
| 5 | Responsables en la forma `C024-2026`: «Operador-Operación» … «Fuerza Mayor (Clima/Natural)» (P1 §1.2) | C24 p.5, Paso 1 | ≈ Correcto, pero la circular da **una tercera escritura** que P1 no registra: la descripción de `resp_par` pone de ejemplo «"Mantenimiento", "Operación", "Comunidad"» (C24 p.8). Debe ir en la pregunta 3 de P1 §8.1 |
| 6 | Responsables en la forma `DICC-V3.2`: «OPERADOR - OPERACIÓN» … (P1 §1.2) | Dicc. 138 | ✔ |
| 7 | `choke_mod` = `POZO`/`PLANTA`/`EXPORTACION`/`RESERVORIO` en la circular (P1 §1.2) | C24 p.8 | ✔ |
| 8 | El Diccionario escribe «EXPORTACIÓN» con tilde (P1 §0, §1.2) | Dicc. 139 | ✔ |
| 9 | `dif_perd` = `DIFERIDA`/`PERDIDA` en las dos formas | C24 p.8; Dicc. 137 | ✔ |
| 10 | `pla_no_plan` = `PLANEADA`/`NO PLANEADA` | C24 p.8; Dicc. 133 | ✔ |
| 11 | `cau_niv1`: clave en la circular (ejemplo `["P_MANT_ELE","M","string"]`), texto en el Diccionario (P1 §3.5) | C24 p.8; Dicc. 140 | ✔ |
| 12 | La forma `DICC-V3.2` del N2 solo necesita «limpiar» los artefactos «VSD / -» y «HURTO / -» (P1 §1.2, tabla) | Dicc. 141 | ≈ Incompleto. El Diccionario difiere de la Tabla 1 en **cinco** cadenas más: «PRUEBA DE POZO (POTENCIAL/PLT)», «OPERACIÓN POR BALANCE DE INVENTARIOS (PLANIFICADO)», «FALLA CONFIGURACIÓN/PARAMETRIZACIÓN (PLC/VSD/CONTROL)», «PERDIDA LINEA DE VISTA (FLORA)» (sin tilde en LINEA) y un doble espacio en «INSTRUMENTO SIN SEÑAL  -». R1 §4.4 ya lo listó; P1 no lo trae a su tabla de formas |
| 13 | Origen `A`/`M`/`C`; el Schema acepta además `Fijo` y `""` (P1 §3.7) | C24 p.2; Schema `definitions` | ✔ (precisión: `Fijo` solo existe en `tuplaString`; las tuplas de fecha, número y hora aceptan `A`, `M`, `C` y `""`) |
| 14 | La plantilla pone `A` a la identidad del pozo y `M` a lo demás (P1 §1.3) | plantilla `paradas_pozo[0]` | ✔ |
| 15 | La parada es «total o parcial» y «con independencia de su duración» (C24 p.3) (P1 §2.1, «Parada parcial») | C24 p.3 y p.4 | ✘ De página. «total o parcial» aparece en p.3 (preámbulo del numeral 2) y en p.4; «con independencia de su duración» solo está en la definición de Parada de Pozo, **C24 p.4** |
| 16 | Planeada = «limitación de producción, optimización, pruebas» (C24 p.3) (P1 §2.2) | C24 p.4 | ✘ De página: la definición de Parada Planeada está en **C24 p.4** |
| 17 | La clasifican «los ingenieros y operadores del campo» (P1 §2.1) | C24 p.5 | ✔ |
| 18 | Principios de Unicidad, Consistencia, Trazabilidad, Neutralidad, Verificabilidad (P1 §2.1) | C24 p.5 | ✔ |
| 19 | El Paso 6 pide la «falla raíz que detuvo la producción» (P1 §3.1) | C24 p.5 | ✔ |
| 20 | Rechazo automático por incoherencia `P_`/`NP_` (P1 §2.2, V-06) | C24 p.7 | ✔ |
| 21 | `cau_niv2` debe «coincidir exactamente» con una causa de su N1 (V-07) | C24 p.8 | ✔ |
| 22 | `paradas_pozo` obligatorio; sin paradas, arreglo vacío; el Schema no lo exige (V-01, P1 §4.1) | C24 p.7; Schema (`segmento_datos` sin `required`) | ✔ |
| 23 | Orden de `required` de `paradas_pozo` en el Schema (P1 §4.1) | Schema | ✔ |
| 24 | `produccion_por_pozo` 12 obligatorios; `pruebas_potenciales` 24 (P1 §4.1) | Schema | ✔ |
| 25 | `segmento_datos` tiene 13 nodos (P1 §4.1) | Schema | ≈ Correcto, pero la tabla de P1 §4.1 **omite `inyeccion_por_pozo`** (9 campos obligatorios). Ver H4 en §1.4 |
| 26 | `metadatos_archivo` no tiene campos para número ni motivo de corrección y no admite otros (P1 §4.4) | Schema (`additionalProperties: false`) | ✔ Buen hallazgo de P1 |
| 27 | `tipo_envio` y `fuente_de_entrega` son arreglos de enum (P1 §4.3) | Schema | ✔ (pero P1 no dice qué valor de `fuente_de_entrega` —`TELEMETRÍA`, `OFICIAL` o `POR DEMANDA`— emite TRIM en el modo `'archivo'`) |
| 28 | `metadatos_archivo.version`: «3.1» en circular y plantilla; el Diccionario dice «3.2/3.0» (P1 §4.3, pregunta 3) | Dicc. 4 | ≈ Impreciso. La fila 4 del Diccionario fija `version` = **«3.1»** con Origen «Fijo». «V3.2» es el nombre del archivo y «V3.0» el título de la hoja. Tres artefactos dicen 3.1 en el campo; el «3.5» es solo el `title` del Schema. La subpregunta baja de crítica a menor |
| 29 | Nombre `NOMBREOPERADORA_CONTRATONUMERO_yyyymmddTHHMMSS.json` y sintaxis `A-Z`, `0-9`, `_` (P1 §4.3, V-14) | C24 p.9 (4.1 y 4.3-i) | ✔ (el patrón está en p.9; P1 cita p.8–9) |
| 30 | «El sello `yyyymmddTHHMMSS` va en COT (C24 p.9 manda COT para los sellos)» (P1 §4.3) | C24 p.9 | ✘ Sobre-generalización. La hora legal «COT / UTC-5» está escrita en el numeral **4.2** (archivos de alta frecuencia). Para el IDP diario (4.1) la circular no dice zona. Es inferencia razonable, no texto: marcarla **provisional** y llevarla a la pregunta 10 |
| 31 | Día operacional «00:00:00 a 23:59:59 −05:00 (C24 p.8-9)» (P1 §2.6) | C24 p.9 | ≈ La circular dice «día calendario anterior con hora de corte a las 23:59:59 horas», sin zona. El «−05:00» es inferencia (ya está en la pregunta 4); quitar la cita como si fuera texto |
| 32 | `h_ini_paro`/`h_fin_paro` en `YYYY-MM-DDThh:mm:ssZ` (P1 §2.6) | C24 p.8; plantilla | ✔ |
| 33 | El ambiente de pruebas de API 1-C1 está habilitado desde la publicación (P1 §3.5, F2) | C24 p.8 | ≈ Correcto, pero falta lo que lo vuelve dependencia: el canal opera «conforme a las condiciones de seguridad, autenticación, autorización, validación e ingesta definidas por la ANH» (Circular 003/2026 §2.a). Lo usa **la operadora** con sus credenciales, no TRIM (§5.3, D4) |
| 34 | Obligatorio desde el 1-dic-2026; se rechazan estructuras V2.0 (P1 §6) | C24 p.8 | ✔ |
| 35 | Lista de pérdidas: derrames, fugas cabeza–PMO, tea, venteo, rechazo, daños (P1 §1.9) | C24 p.4 | ✔ |
| 36 | Corrección en 1 hora desde la notificación o la identificación; «no recibido» mientras tanto; par. 3 con 4 datos (P1 §4.4) | Res. 0651 art. 15.2, adicionado por Res. 0052/2026 (texto compilado en `fuentes/`) | ✔ |
| 37 | Res. 0592/2026 suspende el art. 4 desde el 30-09-2026 por 6 meses, vigente hasta el 29-03-2027 (P1 §4.5) | Res. 0592 arts. 1 y 3 | ✔ |
| 38 | `CausaGeneral` = las 18 causas del art. 15.1 par. 2 (P1 §1.2) | Res. 0651 art. 15.1 par. 2 | ✔ (texto literal: «abandono, alto S&W, eléctrico, … toma de registros/PBU, servicio a pozo») |
| 39 | Derrame = incidente a notificar en 24 h (P1 §2.4, U1 §4.2) | Res. MME 40537/2024 art. 59 | ✔ |
| 40 | IDP antes de las 7:00 (U1 §6.1) | Res. 40537 art. 51 num. 1; C24 p.8 | ✔ |
| 41 | `kpc` = miles de pies cúbicos (Res. 0651 art. 3, venteo) (P1 §1.9) | Res. 0651 texto original | ≈ El texto original (27-08-2025) dice «medido en miles de pies cúbicos estándar (KPC)». En la versión compilada del gestor normativo la definición termina en «cambios de presión.», sin la unidad. Citar el original |
| 42 | «La ANH puede cobrar **regalías** sobre la pérdida» (U1 §4.3, ⓘ; U1 §1.1 fila ger; P1 §9 R-12) | C24 p.4 | ✘ La circular dice «**podrá estar sujeta a gravamen** por parte de la ANH, de acuerdo con la responsabilidad de la compañía operadora y la naturaleza del evento». El enlace con regalías es inferencia de R2 §4.1 (nota 4 del Cuadro 4 de la Res. 40537). En una pantalla que lee un gerente se cita literal |
| 43 | ⓘ del choke del campo: «De los cuatro tramos (pozos, planta, exportación y yacimiento), el que menos deja pasar… Es el modelo choke (SPE-36848) que adopta la ANH» (U1 §3.1) | P1 §1.7; R2 §1.2a | ≈ Contradice a P1: el choke dominante tiene **tres** valores (`pozos`, que incluye el yacimiento, `planta`, `exportacion`), y el cálculo «el menor gana» es de la NSTA, no de la circular. La ANH adopta SPE-36848 para el choke **de la parada** |
| 44 | «Las marcas de tiempo no aparecen en `transcript.txt`, que no tiene tiempos» (U1, Desacuerdo 6) | `transcript.txt` | ✘ Falso. Cada intervención empieza con su marca: Edinson [22:34], [26:48], [31:08]; Adair [33:45], [36:51]; Hollman [37:34]. Las citas de P1 por marca son comprobables y son la forma recomendada |
| 45 | Ejemplo «Contrato LLA-34 · La Ceiba» y archivo «LA_CEIBA_LLA34_20261021T061200.json» (U1 §6.2, §6.3) | C24 p.9; P1 §6 | ✘ Dos problemas: (a) `NOMBREOPERADORA` es el nombre de la **operadora**, no del campo; (b) «LLA-34» tiene apariencia de contrato real (la serie «LLA-nn» es la de los bloques de los Llanos; que ese número exista es NO VERIFICADO) y viola la regla de P1 §6: «nunca se inventan identificadores con apariencia real», con prefijo `DEMO-` |

### 1.2 Lo que hay que corregir en las citas (resumen)

| Dónde | Dice | Debe decir |
|---|---|---|
| P1 §2.1, «Parada parcial» | «(C24 p.3)» | «total o parcial» (C24 p.3–4); «con independencia de su duración» (C24 p.4, definición de Parada de Pozo) |
| P1 §2.2, «Qué es planeada» | «(C24 p.3: limitación de producción, optimización, pruebas)» | «(C24 p.4, definición de Parada Planeada)» |
| P1 §4.3 | «hora de generación en COT (C24 p.9 manda COT para los sellos)» | «hora de generación en COT (**provisional**: C24 p.9 fija COT para los archivos de alta frecuencia, 4.2; para el IDP diario, 4.1, no dice zona)» |
| P1 §2.6 | «día de Colombia, de 00:00:00 a 23:59:59 −05:00 (C24 p.8-9…)» | «corte a las 23:59:59 del día calendario anterior (C24 p.9); la zona −05:00 es **provisional** (pregunta 4)» |
| P1 §4.3 y pregunta 3 | «el Diccionario "3.2/3.0"» | «el Diccionario fija `version` = "3.1" (Dicc. 4, Origen Fijo); 3.2 y 3.0 son nombre de archivo y título» |
| P1 §1.2, tabla de formas | «limpiando VSD / - y HURTO / -» | agregar las 5 diferencias de texto de R1 §4.4 (fila 12 de §1.1) |
| P1 §8.1, pregunta 3 | dos escrituras de `resp_par` | tres: Paso 1 («Operador-Mantenimiento»), Diccionario («OPERADOR - MANTENIMIENTO») y el ejemplo de la descripción del campo («Mantenimiento», C24 p.8) |
| U1 §1.1 (ger) y §4.3 (ⓘ); P1 §9 R-12 | «regalías» | «gravamen» con la cita literal de C24 p.4; el vínculo con regalías, como inferencia (R2 §4.1) |
| U1, Desacuerdo 6 | «el transcript no tiene tiempos» | retirar; citar por [mm:ss] |

### 1.3 El Anexo A de P1 contra la Tabla 1, uno por uno

**Método.** Se extrajo el texto de las páginas 6 y 7 del PDF con `pdftotext -raw`, se cortó por cada `N1_KEY`, se quitó el `N1_TEXT` y se partió el catálogo por las comas de primer nivel (respetando los paréntesis de «Prueba de pozo (presión transiente, producción, potencial, PLT, ILT, otros)»). Luego se comparó cada cadena «…» del Anexo A con la del PDF, en orden, y se recalculó cada código interno.

**Resultado:**
- **Cuenta: 117 de 117.** Por N1: 9, 7, 6, 6, 4, 4, 3, 3 (planeadas = 42) y 6, 8, 4, 13, 11, 6, 6, 6, 4, 4, 4, 3 (no planeadas = 75). Igual que P1 y que R1 §1.5.
- **Textos: 117 de 117 idénticos** al texto extraído, con las rarezas del original conservadas («Perdida Línea de Vista (Flora)» sin tilde en «Perdida», «Falla Instrumento/sensor» con I mayúscula, «UPS / Fuente» frente a «Falla UPS/Fuente»).
- **N1 de cada uno: 117 de 117 correctos**, y en el mismo orden de la Tabla 1 (no el del árbol ni el del Diccionario, que reordenan `NP_CLIMA` y `NP_OPUB`).
- **Códigos: 117 distintos**, sin choques dentro de una misma N1.
- Límite de la verificación: la comparación es contra el texto **extraído**. Caracteres invisibles del PDF (espacio duro, guion largo frente a guion) no se ven así. **NO VERIFICADO** a nivel de bytes del PDF.

**Dos defectos del Anexo A (no de su contenido, sí de su regla):**
1. **La regla del `slug` está mal escrita.** P1 §1.2 dice «todo lo que no es letra o número cambiado por `-`». Aplicada al pie de la letra da `workover---recompletacion` y `bomba--superficie-`, no `workover-recompletacion` ni `bomba-superficie`, que son los códigos del Anexo. Los 117 códigos solo salen si la regla es: «minúsculas; sin diacríticos (la ñ pasa a n); **cada racha** de caracteres que no son letra o número se cambia por **un solo** `-`; se quitan los `-` de los extremos». Como P1 dice «regla fija, sin tabla a mano», la redacción tiene que ser exacta.
2. **La frase «Para `DICC-V3.2`, la forma de salida mapea estos mismos códigos a las cadenas del Diccionario»** es cierta, pero la tabla de §1.2 solo nombra dos artefactos. Hay que listar las cinco cadenas distintas (fila 12 de §1.1) para que el mapeo de esa forma no se escriba a ojo.

### 1.4 Huecos normativos del plan (lo que falta para llenar los 15 campos y el resto del archivo)

| # | Hueco | Fuente | Por qué importa | Propuesta |
|---|---|---|---|---|
| H1 | **`cau_gral_paro` no tiene cómo llenarse.** Es obligatorio (Schema `required`). P1 §1.2 dice «derivada de la N1 y editable» (pregunta 9), pero no da la tabla N1 → `CausaGeneral`, y `FormaSalidaAnh` (§1.2) no tiene la clave `cauGral` con el texto que viaja | C24 p.8; Schema; Dicc. 136 («No aplica») | Sin esto el serializador de F1 no puede emitir ni una fila | Tabla versionada `CAU_GRAL_DE_N1` (20 filas, **provisional**, p. ej. `P_MANT_*` → «mantenimiento», `NP_ENINT`/`NP_ENEXT` → «eléctrico», `NP_SUB`/`NP_SUP` → «mecánico», `NP_CLIMA` → «climático», `NP_OPUB` → «orden público», `NP_TRANSP` → «bombeo/transporte», `NP_PROC` → «facilidades»; ojo: varias N1 no tienen pareja natural entre las 18, como `P_OP`, `P_PRUEBAS`, `NP_INS` y `NP_CTRL`, y eso refuerza la pregunta 9), y `forma.cauGral: Record<CausaGeneral, string>` con el texto literal de la Res. 0651 |
| H2 | **La tercera posición de la tupla (Unidad) no está especificada.** Ni `FormaSalidaAnh` ni V-03 la cubren | C24 p.2; plantilla: `"string"` en texto, `"ISO 8601 DateTime"` en las horas (R2 §3.0) | Un serializador que ponga otra cosa pasa el Schema (la unidad es texto libre) pero puede no pasar el receptor | Agregar `unidad` por campo a la forma de salida, copiada de la plantilla, y que V-03 la compruebe |
| H3 | **El origen de `desc_evid` no está definido.** `BaseClasificacion.descEvid` es `string`, sin `Procedencia`, y la tabla de §1.3 no lo cubre | P1 §1.3–1.4 | Es uno de los 15 campos y lleva origen | `desc_evid`: `M` si una persona escribió algo; `C` si lo armó TRIM desde la evidencia |
| H4 | **`inyeccion_por_pozo` no está en el plan.** Tiene 9 campos obligatorios: `n_pozo`, `id_rec`, `form`, `campo`, `t_iny` (tiempo inyectando, `tuplaTime` «HH:MM»), `t_fluid_iny` (AGUA, AIRE, GAS, POLIMERO, VAPOR DE AGUA), `vol_iny`, `pres_iny`, `obs` | Schema; Dicc. 143–151 | La bomba piloto es la de reinyección: cuando para, **baja el `t_iny` de los inyectores** ese día. P1 §8.1 pregunta 7 decide «el inyector no se reporta», y eso es falso en sentido amplio: su tiempo de inyección sí viaja. Además, el patrón de `tuplaTime` (`^([01]\d|2[0-3]):?([0-5]\d)$`) **no admite «24:00»**: un inyector que inyectó todo el día no tiene una representación exacta (lo máximo es «23:59») | Agregar la fila a P1 §4.1 («No lo emite; aporta las horas de marcha de la bomba como soporte; lo cuadra con sus paradas»); reescribir la decisión de la pregunta 7 y sumar la pregunta del «24:00» |
| H5 | **Una sola formación por pozo.** `RegistroAnhPozo.formacion: string` | C24 p.7 (`form`: «Formación geológica productora afectada por la parada») | Un pozo con completamiento en varias formaciones (producción conjunta) no cabe: ¿una fila de `paradas_pozo` por formación? | Pregunta nueva para la ANH; en el modelo, `formaciones: string[]` y la regla de filas según la respuesta |
| H6 | **El nombre oficial del campo** no está en el registro ANH | C24 p.8 (`campo`); P1 V-10 lo exige «del registro firmado» | `Campo.nombre` del demo no es el nombre del campo ante la ANH | `RegistroAnhPozo.campoAnh` (o `ConfigAnh.campos[id].nombreAnh`) |
| H7 | **El modo `'archivo'` no define `metadatos_archivo` ni `segmento_datos_operador`**: `fecha_publicacion` (Dicc. 5: «Fecha de generación o emisión del archivo JSON»), `fuente_de_entrega` y `datos_operador_contrato` (`operador`, `f_operacional`, `f_carga`, `contrato`, `usuario`) | Schema; Dicc. 3–5 | El archivo de prueba de F2 los necesita | Una tabla de valores en P1 §4.3 |
| H8 | **No hay regla que cuadre `paradas_pozo` con `produccion_por_pozo.t_prod`** | Res. 0651 art. 15.2 par. 2 («inconsistencias de contenido»); Schema | La ANH tiene los dos nodos y puede cruzarlos: si un pozo reporta 10 h de paro total y `t_prod` = 20 h, es una inconsistencia que abre la ventana de 1 h. Más probable aún si el `t_prod` lo pone el sistema de la operadora y las paradas TRIM | Nueva **V-16** (aviso): por pozo y día, Σ duración de las paradas con `fraccion = 1` ≈ 24 h − `t_prod`, con tolerancia firmada |
| H9 | **La diferida ANH es solo de crudo.** `pruebaRep(d) = crudoBpd…` (P1 §2.5) | C24 p.4 («Volumen de hidrocarburos»); Schema (`prd_gas`, `prod_gas`) | Un campo de gas (en el demo, La Zarza produce condensado; R2 §2.3) queda sin diferida. Edinson lo dijo: las de gas «tienen una tolerancia diferente en cuanto a paradas de pozo» [31:08] | Declarar el alcance («solo crudo en F2») y abrir la pregunta del gas (§3) |
| H10 | **`EventoPerdida` no tiene choke** | C24 p.5 (los 6 pasos valen también para la pérdida) | Si la ANH responde a la pregunta 1 que la pérdida sin parada va como fila, falta el paso 2 | Agregar `choke?: DatoClasificado<ChokeAnh>` opcional |

## §2 Coherencia entre agentes

**Resultado general.** El vocabulario está bien alineado: U1 usa las entidades, estados, enums y capacidades de P1 casi sin desvíos. Las fallas de coherencia son de tres clases: (a) **U1 no se actualizó** después de que P1 respondió sus pedidos (7 nombres viejos y 4 frases que ya no son ciertas); (b) **tres decisiones de fondo que se contradicen**: la evacuación en la pregunta de campo, quién ve y confirma el choke y la N1, y el morado; (c) dos decisiones que P1 da por cerradas y no lo están: la guía `'trim'` con interlock y el rol `plan` antes del 1-dic.

### 2.1 Nombres de entidades, campos y estados

| Concepto | P1 (dueño del vocabulario) | U1 | ¿Igual? |
|---|---|---|---|
| Tramo reportable y su clasificación | `ParadaAnh`, `ClasificacionAnh`, `BorradorClasificacion`, `DatoClasificado`, `Procedencia` | los mismos (U1 §2, recuadro de vocabulario) | ✔ |
| Estados | `propuesta` · `por-precisar` · `confirmada` · `pendiente` | «falta confirmar» · «falta un dato» · «completa» · «sin causa» | ✔ (mapeo de pantalla explícito) |
| Etiquetas de los 6 pasos | P1 §1.2 | U1 §2 | ✔ |
| Estados del envío | `EstadoEnvio` (6) | U1 §6.2 (6, con texto) | ✔ |
| `CondicionVisual` (9) y orden de resolución | P1 §1.13, §2.9 | U1 §9.2 | ✔ |
| Rango del volumen de pérdida | `'menos-1' \| '1-10' \| '10-100' \| 'mas-100' \| 'no-se'` (Respuestas a UX, P-3) | `'<1' \| … \| '>100'` (U1, pedido P-3) | ✘ U1 viejo |
| Pregunta de un destino `precisar` | `{ pregunta, opciones: Array<{ pareja, texto }> }` | `pregunta`, `etiquetas: Record<CodigoN2, string>` (U1 P-4), y U1 §5.3 dice «P1 no tiene un campo para el texto de esa pregunta» | ✘ U1 viejo |
| Forma de `diagnostico` | `circulo-i` | `circulo` (U1 P-5); el cuerpo de U1 §9.2 dice «círculo lleno con i» | ✘ menor |
| Programa congelado | entidad `ProgramaSemana` | `programaCongelado: { hora, tareas }` (U1 P-11) | ✘ U1 viejo |
| Hora corregida del cierre | `CierreOrden.correcciones[]` | `horaCorregida` (U1 P-13) | ✘ U1 viejo |
| Notificación del derrame | `EventoPerdida.notificacion24h` | `notificadoEn`, `notificadoPor` (U1 P-14) | ✘ U1 viejo |
| Volumen de la pérdida | `volumen: number \| null` | U1 §4.2: «Hoy `EventoPerdida.volumen` es obligatorio, así que esto necesita un cambio de modelo» | ✘ U1 viejo (P1 ya lo cambió) |
| Nodos que aporta TRIM | `paradas_pozo` y `produccion_por_pozo` (sin `pruebas_potenciales`) | U1 §6.2 sigue a P1 §4.1; pero el Desacuerdo 5 de U1 sigue diciendo que P1 §1.14 incluye `pruebas_potenciales` | ✘ U1 viejo (P1 ya lo corrigió, «Cambios al vocabulario», 12:20) |
| Sincronización | «Respuestas a UX» completa (P-1 a P-16) | U1, Desacuerdo 7: «"Respuestas a UX" … seguían vacíos» | ✘ U1 viejo |
| Nombres de las preguntas de campo | — | U1 llama «P1 · ¿Qué lo paró?», «P2-energía», «P3», «P4» | ≈ Choca con «P1» (el documento de producto), «P-1…P-16» (pedidos) y «P1» (prioridad 1). Renombrar a «Pregunta 1…4» |

### 2.2 Decisiones de fondo, una por una

**(a) El choke de la evacuación — CONTRADICCIÓN.**
- P1 §2.1 (fila `evacuacion`) y §3.3: un equipo propio (TK-102, LACT) es `planta`; solo es `exportacion` / `NP_TRANSP` / `ext-transportador` si «el oleoducto o el cliente no recibía», y eso se pregunta. P1 §3.3 lo dice expresamente: «si el tanque se llenó porque el oleoducto no recibía, la persona contesta "no recibía" y la fila va a `exportacion`».
- U1 §2.4 junta en **un solo botón** «La planta no recibe o los tanques están llenos» → Operador · Operación · **Planta** · `NP_PROC`, y en otro «El oleoducto o el cliente no recibe». No hace la pregunta de seguimiento. Un operador que ve el tanque de crudo lleno porque el oleoducto no recibió toca el primer botón (es lo que ve) y la fila sale `PLANTA`/`NP_PROC`, que es justo el error que P1 §3.3 quiere evitar. El mismo botón mezcla además el tanque de **agua** (disposición, siempre `planta`, P1 §3.4) con el de **crudo**.
- **Versión recomendada:** la de P1. En U1 §2.4, partir el botón: «La planta no recibe (agua o proceso)» → `planta` / `NP_PROC`; «El tanque de crudo está lleno» → pregunta de seguimiento «¿El oleoducto o el cliente estaba recibiendo?» (Sí → `planta` / `NP_PROC` «Tanques llenos / capacidad limitada»; No → `exportacion` / `NP_TRANSP`; No sé → «falta»). **Por qué:** el choke es el del componente donde se **origina** la restricción (C24 p.4) y la Unicidad exige el mismo criterio ante eventos iguales (C24 p.5).

**(b) Reinyección y multifásica — COHERENTE, con un cabo suelto.**
- P1 §3.1 (híbrido: parte con N2 exacto → su N1; sin N2 exacto o sin parte → `NP_PROC` «Parada estación/bombeo afecta pozos»; capacidad → «Tanques llenos») y el ejemplo de WhatsApp de U1 §2.6 (rodamientos → `NP_SUP` «Falla rodamiento/cojinete (bearing box)», choke Planta) coinciden. Las 8 partes de las bombas de la línea (`sello`, `succion`, `rodamientos`, `hidraulica`, `motor`, `tornillos`, `filtro`, `lubricacion`, `src/entities/partes.ts:18-22`) están todas cubiertas en `REGLAS_ANH` v1.
- Cabo suelto: P1 §3.1 dice que «variador, MCC o instrumento → `NP_ENINT/*`, `NP_INS/*`», pero `REGLAS_ANH` v1 (§2.1) no tiene esa fila y no existe un `ParteId` para el variador. En la práctica, una bomba de reinyección parada por su VSD cae en «sin parte» → `NP_PROC`. **Recomendación:** o se agrega la fila (señal del VSD o del MCC de la bomba → `NP_ENINT` «Falla VSD» / «Falla MCC/Switchgear», choke `planta`), o se borra la frase de §3.1. Hoy el texto promete algo que la regla no hace.

**(c) Colores, interlock y el morado — TRES PROBLEMAS.**
1. **El morado termina con 3 o 4 significados, no con 2.** P1 §1.13 aceptó la excepción de U1: `sin-comunicacion` y `dato-invalido` comparten morado («no le crea a este número»). Pero además:
   - U1 §2.1 pinta el eslabón que **todavía no tiene respuesta** («falta») «con contorno punteado en `--invalido` (como `DatoInvalido`)», y U1 §10.1 lo dibuja como `◌` (círculo punteado morado), que es **exactamente** la marca de `sin-comunicacion` en U1 §9.2;
   - P1 §2.5 pinta «sin prueba reportada a la ANH» en magenta (dato inválido).
   
   «Falta que una persona conteste» es una **tarea pendiente**, no un problema de calidad del dato. **Versión recomendada:** el «falta» va en gris, con contorno discontinuo y la palabra «falta»; si se acerca la hora límite (05:00), lleva la marca de aviso (`alarma-3`). La excepción del morado queda en sus dos condiciones y ninguna más. **Por qué:** es la regla de P1 §1.13 («ningún color significa dos cosas distintas para quien decide») y la de ISA-18.2 que cita R4 §5.3: los colores de alarma no se reutilizan.
2. **La guía `'trim'` queda sin color para el interlock.** U1 (Desacuerdo 2) pidió que el interlock sea rojo y la prioridad 1 naranja **en las dos guías**. P1 no contestó ese punto: en «Respuestas a UX», P-16 dice que `'sitio'` es la guía por defecto desde F3 y que `'trim'` queda «como respaldo», pero `'trim'` sigue con «P1 rojo» (P1 §2.9). Cuando `Enclavamiento` entre (F3), en una operadora con `'trim'` el rojo significará dos cosas o el interlock no tendrá color. **Versión recomendada:** la de U1: interlock rojo con candado y alarma-1 naranja en las dos guías; las guías difieren solo en tonos. **Por qué:** es la única opción que no rompe la regla de P1 §1.13 en ninguna configuración.
3. **Prioridades 1 y 2 comparten el naranja** (U1 §9.2). Es coherente con P1 §2.9 («las alarmas en naranja y amarillo, sin rojo»), pero contradice la letra de la regla «un color, un significado» si se lee prioridad por prioridad. Queda bien como **provisional** a validar con Adair (P1 §8.4, pregunta 25; U1 §11.3, pregunta 2). Ninguno de los dos documentos dice que, mientras tanto, la guía activa antes de F3 sigue siendo la de hoy (P1 rojo): la banda de rechazo del IDP de U1 §6.3 saldrá **roja** en F2, no naranja.

**(d) Quién ve y quién confirma el choke y la N1 — CONTRADICCIÓN.**
- P1 §6, F1, pruebas: «e2e nuevo `anh-identificar.spec`: … **el operador nunca ve choke ni N1**».
- U1 §3.2: el operador y el técnico «ven "Dónde se trabó" solo como un renglón de la cadena que confirman»; U1 §10.1 (teléfono, oper y sup) muestra la cadena entera con «Dónde: Pozo» y «Causa: No planeada - Mec. subsuelo»; U1 §2.6 manda por WhatsApp al operador «Dónde: Planta… Causa: No planeada - Mecánica superficie › Falla rodamiento…» y le pide «1) Está bien». U1 §1.1 dice a la vez que el operador «no ve el árbol».
- El problema de fondo no es de pantalla: si el operador «confirma» con un toque un choke y una N1 que no entiende, esos pasos pasan a `confirmado` → origen `M` (P1 §1.3). Es una confirmación fabricada, y es justo lo que R-05 de P1 quiere evitar.
- **Versión recomendada:** (1) en P1, cambiar la prueba e2e por «al operador nunca se le **pide escoger** choke, N1 ni N2»; (2) en P1 §1.3, la confirmación es **por paso**: el toque del operador sube a `confirmado` solo los pasos que él contestó o que están en su terreno (qué encontró, ¿programado?, ¿se regó?); el choke, la N1 y la N2 quedan `regla` (origen `C`) hasta que los confirma quien tiene `anh:confirmar` (sup o prod); (3) en U1 §2.6 y §10.1, el mensaje al operador muestra solo lo que él puede avalar y una línea «el resto lo revisa su supervisor». **Por qué:** la circular pide que clasifiquen «los ingenieros y operadores del campo» (C24 p.5); la Verificabilidad (C24 p.5) exige que la marca de persona signifique que una persona competente lo miró.

**(e) `pruebas_potenciales` — RESUELTO.** P1 §4.1 y §1.14 dicen que TRIM lo lee y no lo emite; U1 §6.2 lo sigue. Solo falta borrar el Desacuerdo 5 de U1, que quedó viejo.

**(f) Origen «C» — COHERENTE, con dos huecos.** P1 §1.3 y §3.7 (lo deducido sin confirmar viaja con `C`, configurable a `M`) y U1 §6.2 («no bloquea; 2 paradas van como calculadas por TRIM») coinciden, y P1 V-12 lo avisa. Faltan el origen de `desc_evid` (H3 de §1.4) y la confirmación por paso del punto (d).

### 2.3 Los 16 pedidos de U1 frente a las respuestas de P1

| Pedido | Respuesta de P1 | ¿Cerrado? | Qué falta |
|---|---|---|---|
| P-1 · encender `reg`, `plan` y Regulatorio **antes del 1-dic** | «Sí»: `reg` en F1; `plan` en F4; `cont` en F3 | **Parcial** (se responde «Sí», pero `plan` se rechaza para antes del 1-dic) | Que P1 lo escriba como «Sí para `reg`; No para `plan` antes del 1-dic» y que U1 §1.1 deje de decir «Este plan necesita encender `reg` y `plan`» sin fecha |
| P-2 · marca «para revisar» | `ParadaAnh.revision` | ✔ | — |
| P-3 · volumen opcional, rango y `donde` | Sí, con valores sin símbolos | ✔ en P1 | U1 debe usar los valores nuevos y borrar «hoy es obligatorio» (§4.2) |
| P-4 · texto de la pregunta de `precisar` | Sí, como arreglo ordenado | ✔ en P1 | U1 §5.3 y su tabla de pedidos, viejos |
| P-5 · formas `diagnostico` y `dato-invalido` | `circulo-i` y `circulo-punteado-raya` | ✔ | U1 P-5 dice `circulo` |
| P-6 · plantilla de WhatsApp del cierre | Sí, F2 | ≈ | P1 F2 dice «al supervisor» a las 22:00 y 05:00; U1 §6.1 manda el de las 05:00 a reg, sup y jefe. Unificar. Y anotar la **dependencia de aprobación de Meta** (§5.3, D6) |
| P-7 · preguntas de campo como datos versionados | `PREGUNTAS_CAMPO@n` | ✔ | — |
| P-8 · nodos del árbol propio como botones | Sí, en F3, con condición | ✔ | — |
| P-9 · hora del toque | Sí, con `recibido` y excepción al contrato | ✔ | — |
| P-10 · grupo de la confirmación en lote | `ConfirmacionLote` | ✔ | Debe guardar también **qué pasos** confirmó cada quien (punto d de §2.2) |
| P-11 · programa congelado | `ProgramaSemana` | ✔ en P1 | U1 P-11 viejo |
| P-12 · motivo sin valor | `Lectura.motivoSinValor` | ✔ | — |
| P-13 · hora corregida | `CierreOrden.correcciones` | ✔ en P1 | U1 P-13 viejo |
| P-14 · notificación del derrame | `notificacion24h` | ✔ en P1 | U1 P-14 viejo |
| P-15 · umbrales de las bandas fijos | Sí | ✔ | — |
| P-16 · guía `'sitio'` por defecto | Sí, desde F3 | **Parcial** | No contesta el Desacuerdo 2 de U1 (interlock en la guía `'trim'`): §2.2 (c) punto 2 |

**Conclusión:** formalmente P1 contestó los 16. En el fondo quedan **dos abiertos** (P-1 y P-16) y **uno incompleto** (P-6). U1 tiene **siete** textos sin actualizar (P-3, P-4, P-5, P-11, P-13, P-14 y los Desacuerdos 5 y 7).

### 2.4 Otras contradicciones (dónde, versión recomendada y por qué)

| # | Dónde | Contradicción | Versión recomendada | Por qué |
|---|---|---|---|---|
| C-1 | P1 §1.11 (`cifraPrincipal: 'N3' \| 'N4' \| 'L4' \| 'L3'`) y F4 frente a P1 §6 F5 | La «cifra principal» de Edinson se entrega en F4, pero L3 y L4 son del **paquete 4 (Logística)**, que P1 manda a F5 (mayo de 2027 en adelante). U1 §7.1 dibuja «Logística» encendida | Mover a F4 al menos L3, L4 y L5 calculados desde el cierre en el teléfono del modo `'liviano'` (R3 §4.1: «L3-L5 necesitan el cierre en el teléfono»), o quitar L3/L4 de `cifraPrincipal` hasta F5 y decirlo | El «tiempo de logística» es el pedido literal de Edinson [22:34]; prometerlo en F4 y entregarlo en F5 es una contradicción interna de P1 |
| C-2 | P1 §1.15 (`perdida:registrar` = sup, oper, prod) frente a U1 §4.2 (el rechazo por especificación lo registra «prod o reg») | `reg` no tiene la capacidad | Que solo lo registre prod, o agregar `reg` a `perdida:registrar` | Coherencia de permisos |
| C-3 | U1 §5.1 (`conf` «comenta» en `FilaConversion.nota`) frente a P1 §1.15 (`anh:conversion` = solo `adm`) | `conf` escribe sin capacidad | Darle a `conf` un permiso de comentario, o que la nota la escriba `adm` | Ídem |
| C-4 | P1 §2.5: «con `fuenteReal = 'trim'`, `resto` es 0 por construcción» | Falso con paradas parciales. El real propuesto por TRIM es «prueba × FA × horas en marcha ÷ 24», y una hora con frecuencia reducida (`HZ`) es hora en marcha: cuenta como producción completa, mientras el libro carga a esa hora `h × (1 − hz/hz_prueba)` (`libro.ts:92-96`). También falla si la prueba vigente cambia a mitad del día | Definir el real propuesto como «prueba × FA × (24 − Σ h × fracción) ÷ 24», o aceptar que `resto ≠ 0` y explicarlo | Se promete una identidad que la prueba de `verificar-libro` va a tumbar |
| C-5 | P1 §3.2: el piloto es la reinyección «porque ya es `ALTO_IMPACTO` y **tiene catálogo de partes**» | La multifásica **también** tiene catálogo (`bomba-multifasica`, `src/entities/catalogo.ts`; partes en `partes.ts`). Lo único que la frena es `ALTO_IMPACTO` (`causa-senal.ts:57`) | Corregir el porqué y agregar la razón de Adair (más instrumentación y eventos en cascada, [33:45], [36:51]) | Precisión |
| C-6 | P1 §0 punto 7 y §6 («1-dic arranque con la bomba de reinyección de La Ceiba») | **La Ceiba es un campo del demo** (`src/entities/campos.ts:7`). Una «producción el 1-dic» no puede ser con La Ceiba | Ver §5 y §7, cambio obligatorio 1 | Realidad del producto |
| C-7 | P1 §3.2 y §2.9 (el piloto de Adair = el piloto del reporte a la ANH) | Son dos pilotos distintos. Adair habló del **equipo piloto del monitoreo y del modelo**: «son de los equipos que más instrumentación tienen asociada… hay mucha data con la que se puede jugar para el modelo» [33:45], [36:51]. El plan lo usa como el piloto **regulatorio** | Nombrarlos distinto: «equipo piloto del vigía» (Adair) y «operadora piloto del reporte ANH» | Se mezclan dos compromisos con dependencias distintas: los datos de entrenamiento que Adair no ha conseguido, frente al registro ANH y las credenciales de la operadora |
| C-8 | P1 §8.1 pregunta 7 («¿La parada del inyector se reporta en algún lado?» → «el inyector no se reporta») | `inyeccion_por_pozo.t_iny` lleva las horas de inyección | Ver H4 de §1.4 | Schema |
| C-9 | U1 §6.2 y §6.3: ejemplos «LLA-34» y «LA_CEIBA_LLA34_…json» frente a P1 §6 («identificadores `DEMO-`») | Fila 45 de §1.1 | `OPERADORADEMO_DEMO001_20261021T061200.json` y «Contrato DEMO-001» | C24 p.9; regla de P1 §6 |
| C-10 | U1 §3.1 (ⓘ, «cuatro tramos») frente a P1 §1.7 (tres valores) | Fila 43 de §1.1 | «De los tres tramos con potencial —pozos (que incluye el yacimiento), planta y exportación— el que menos deja pasar. Se calcula con los potenciales firmados.» | Coherencia con P1 §1.7 |

## §3 Fidelidad a la reunión del 19-oct

Fuente: `docs/reuniones/2026-10-19-edinson-adair/transcript.txt`. **Corrección a U1:** el transcript **sí** trae una marca [mm:ss] al inicio de cada intervención; las citas van por marca. Las intervenciones que cuentan: Edinson [22:34], [26:48], [31:08]; Adair [33:45], [36:51]; Hollman [37:34].

| # | Quién y cuándo | Lo que pidió o dijo (cita) | Estado | Dónde está en el plan | Qué falta |
|---|---|---|---|---|---|
| 1 | Edinson [22:34] | **Modularidad**: «es muy versátil, es bastante modular y bastante adaptable a las necesidades… de todos los operadores» | **Cubierto** | P1 §1.11 (`PerfilMetricas`), §1.10 (árbol por operadora), `Config.anh`; U1 §7.1 | — |
| 2 | Edinson [22:34] | **Filosofía operacional**: «desde cargar la filosofía operacional, que es lo que cuesta, los tarros, los equipos y las líneas físicas, la misma distribución de pozos, las mismas líneas, y todo el tema de facilidad» | **Parcial** | Solo en pedazos: `ChokeDeElemento` con `pozos[]` (P1 §1.6) y la topología eléctrica de §2.1 | Ninguno de los dos documentos la nombra. Es la entrada que alimenta el choke por topología, las cascadas y el «dedicado/compartido». Falta una sección de Configuración «Cargar la filosofía operacional» (tanques, equipos, líneas, qué pozo cuelga de qué) con su importación, como la del árbol |
| 3 | Edinson [22:34] | **Métricas modulares**: «a veces a un área de confiabilidad no le interesa más el tiempo medio de reparación más que el tiempo entre fallas, entonces, o el tiempo de logística» | **Parcial** | Modelo completo en P1 §1.11 y U1 §7 (cifra principal, 4 opciones) | La **logística** llega en F5 (mayo de 2027 en adelante); la tarjeta con L3/L4 promete en F4 algo que no se construye hasta F5 (§2.4, C-1) |
| 4 | Edinson [22:34] | **Órdenes en papel y el programa del técnico**: «todavía se manejan en muchos campos las órdenes físicas… las llenan de grasa o de mugre o de agua»; «Ojalá el técnico pueda tener gestión sobre el programa… preventivo, predictivo… una campaña de vibraciones o termografía» | **Cubierto** (en F4) | P1 §1.12, §2.8; U1 §8 | Edinson habló del trabajo **mensual** del planeador («organiza su trabajo mensual para programar y planear»); el plan solo modela la semana (`ProgramaSemana`). Agregar la vista mensual o decir por qué no |
| 5 | Edinson [22:34], [26:48] | **Conversión del árbol propio al de la ANH**: «el tema está en cómo adoptan su árbol de fallas y de diferidas o de paradas de pozos al árbol… de la ANH» | **Cubierto** | P1 §1.10, §2.3; U1 §5 | Antes del 1-dic solo la versión básica (F2), y solo si hay una operadora con árbol |
| 6 | Edinson [26:48], [31:08] | **Pérdidas además de diferidas**: «No tan solo diferidas, sino pérdidas»; «¿qué pasa si hay una pitera? … eso es una pérdida» | **Cubierto** | P1 §1.9, §2.4, §2.7; U1 §4 | La frase de Edinson «ya estando en subsuelo» es un lapsus (R2 §4.2): P1 la lleva a la pregunta 17. Bien |
| 7 | Edinson [26:48] | **El transformador**: «si es en pórtico o es en una red de media, puede ser en planta, o si es ya sobre todo en una parte de distribución de unidades de bombeo, puede ser de pozo»; responsable «el operador de mantenimiento» | **Cubierto** | P1 §2.1 (`choke.topologia@1`, `dedicado-compartido`), pregunta 11; U1 §2.4 («¿De dónde vino el corte?») | Edinson dijo «**puede** ser»: es un criterio, no una regla firme. P1 lo deja configurable. Bien |
| 8 | Edinson [31:08] | **Ecopetrol ×10 y las operadoras chicas**: «esto multiplícalo por 10 y obtienes el árbol de diferidas, como le llaman en Ecopetrol… es un monstruo»; «operadoras chiquiticas que no tienen ni 3, 4 ítems» | **Cubierto** | P1 §1.10 (herencia por subárbol; `precisar`), §2.8 (modo `'liviano'`); U1 §5.2 («No tenemos árbol: usar el de la ANH») | — |
| 9 | Edinson [31:08] | **La tolerancia del gas**: «si son de gas pues tienen una tolerancia diferente en cuanto a paradas de pozo» | **Falta** | En ningún lado de P1 ni de U1 | Qué cambia en un campo de gas: la diferida ANH es solo de crudo (H9 de §1.4); el potencial de gas; la nominación y el DCQ (SPE-36848: «a gas asset suffers only a true loss when it has missed a DCQ target», R2 §1.1); el choke «Mercado» como subnivel. Al menos una pregunta para Edinson y una línea de alcance |
| 10 | Edinson [31:08] | **Los pozos acuatosos**: si la bomba que lleva el agua al inyector se daña «y se empiezan a rebosar los niveles de los tanques… hay que parar los pozos acuatosos, los pozos que más producen agua. Entonces ahí se va a producir una diferida» | **Parcial** | La **clasificación** de esos cierres está (P1 §2.1, filas `reinyeccion`; §3.4: `planta`) | La **decisión operativa** —qué pozos cerrar primero para perder menos crudo por cada barril de agua que se deja de mover— no está. U1 §1.1 la lista como decisión de prod («qué pozos cerrar primero ante una restricción») sin ninguna pantalla que la sostenga. Es el valor por rol más directo de ese ejemplo |
| 11 | Adair [33:45] | **ISA-101**: «moradito con falla de comunicación, rojo con interlock, naranja con amarillo con alarma… basado en la ISA 101» | **Cubierto** (en F3) | P1 §1.13, §2.9; U1 §9 | Los tres problemas de §2.2 (c). Que ISA-101 fije esos colores es NO VERIFICADO (R4 §5.3); los dos documentos lo dicen. Bien |
| 12 | Adair [33:45], [36:51] | **El piloto y por qué**: «ojalá una multifásica o una de inyección, porque además de que es de lo más crítico en planta y que a veces desencadenan eventos en cascada… son de los equipos que más instrumentación tienen asociada»; «9 temperaturas, 2, 3 vibraciones, 2 presiones, succión, descarga, tienen flujo… corriente» | **Parcial** | P1 §3.2 escoge la reinyección | El porqué de P1 es interno (`ALTO_IMPACTO`, catálogo), no el de Adair (instrumentación y cascadas). Y P1 usa este piloto como piloto **regulatorio** (§2.4, C-7). Falta guardar la lista de variables que dio Adair como requisito de instrumentación del equipo piloto (sirve para la pregunta 26 y para el vigía) |
| 13 | Adair [33:45] | **Los datos de entrenamiento pendientes**: «Hoy recordé el tema de la data esa para lo de entrenar el modelo, pero no me la han conseguido» | **Falta** | En ningún lado | Es una dependencia del vigía en el equipo piloto. Va a F0 como pedido con responsable (Adair) y a §9 de P1 como riesgo: sin esos datos, el piloto predictivo no tiene con qué validar |
| 14 | Hollman [37:34] | **Medir no prueba la causa**: «aunque nosotros estaríamos midiendo cada una de las variables de esos equipos, no quiere decir que… el daño sea específicamente por eso. Puede ser un daño colateral» | **Parcial / débil** | Indirecto: el origen `C` para lo deducido (P1 §1.3) y la marca «TRIM lo dedujo: {porqué}» (U1 §2.1); R3 E5 («la parte del vigía es una sospecha hasta el *teardown*») | Ninguno lo convierte en regla. P1 §2.1 manda códigos del variador directo a una N2 con «se pregunta: nada» (p. ej. `GF` → `NP_SUB` «Falla ESP»), cuando un fallo a tierra puede estar en el cable de superficie o en el variador (R2 §3.3 lo advierte: «Un disparo del variador de superficie es `NP_ENINT` "Falla VSD"»). Regla propuesta: lo que sale de **la firma de variables** (`Causa.como = 'firma'`) nunca se confirma solo y su N2 la confirma quien abrió el equipo; en pantalla, «las señales apuntan a…», nunca «la causa fue…» |

**Resumen:** de 14 puntos, **7 cubiertos**, **5 parciales** (filosofía operacional, métricas por la fecha de la logística, pozos acuatosos, el piloto de Adair y la advertencia de Hollman) y **2 faltan** (la tolerancia del gas y los datos de entrenamiento de Adair).

## §4 Lo que pidió el dueño

| Pedido | ¿Está? | Dónde | Lo que falta |
|---|---|---|---|
| **Árbol de la ANH con buena UX y valor por rol** | **Sí, bien resuelto** | U1 §1.1 (valor por rol, 11 roles), §2 (cadena de 6 eslabones, 1–5 toques, nunca las 117), §5 (asistente); P1 §1.4 (coherencia en el tipo), §2.1 | Los arreglos de §2.2: botón de tanques (a), quién confirma qué (d), el «falta» en morado (c-1). Y una prueba: la meta de «1 toque» vale para el caso A (deducido), que es la mayoría **en un campo con telemetría como el demo**. En una operadora chica sin PLC por pozo, el caso C (3–5 toques) será la regla (§6, R-J) |
| **Métricas completas** | **Sí en el diseño, no en el calendario** | R3 (54 métricas, 7 paquetes); P1 §1.11, §2.10; U1 §7 | Paquete 4 (logística) en F5; costos en F5; ver C-1. «Completas» antes de mayo de 2027 no es cierto |
| **Choke bien implementado** | **Casi** | P1 §1.7 (dos conceptos, dos nombres), §2.1 (topología, `dedicado-compartido` configurable), §3.3, §3.4; U1 §3 | El botón de tanques que manda a `planta` lo que es `exportacion` (§2.2 a); el ⓘ con cuatro tramos (C-10); el choke de una pérdida sin parada (H10); y la «filosofía operacional» que lo alimenta (§3, punto 2): sin la topología cargada, la regla cae a los valores por defecto |
| **Los comentarios de Adair** | **Parcial** | Colores: P1 §1.13, §2.9; U1 §9. Piloto: P1 §3.2 | El piloto de Adair se confundió con el regulatorio (C-7); su porqué no se registró; los datos de entrenamiento no aparecen (§3, punto 13); la guía `'trim'` queda sin interlock (§2.2 c-2) |

## §5 Viabilidad

### 5.1 Las fechas de P1 §6 hasta el 1-dic no caben

**El calendario real.** Del 27-oct (inicio de F1) al 26-nov (congelado de F2) hay **21 días hábiles**: 27–30 oct (4), 3–6 nov (4; el lunes 2 es festivo de Todos los Santos), 9–13 nov (5), 17–20 nov (4; el lunes 16 es festivo de la Independencia de Cartagena), 23–26 nov (4). (Festivos trasladados por la Ley 51 de 1983; fechas de 2026 calculadas, no consultadas en un calendario oficial.) Con tres personas —Hermes, Eduardo y Sergio, que el transcript nombra como «el lado técnico del producto» [35:35], sin decir su dedicación (**NO VERIFICADO** que sea completa)— son como mucho **63 persona-días ≈ 12,6 persona-semanas**.

**Lo que P1 pone en F1 y F2**, medido con las estimaciones de esfuerzo de R4 §8 (S = días, M = 1–3 semanas, L = más de 3 semanas; «front + contrato + backend», estimación del auditor):

| Brecha de R4 §8 | Esfuerzo | Fase en P1 |
|---|---|---|
| 1 registro ANH del pozo · 2 operadora y contrato · 3 horas UTC y abiertas al corte · 12 `desc_evid` · 17 vista del gerente | S × 5 | F1–F2 |
| 7 `dif_perd` y `EventoPerdida` (solo captura) | S | F1 |
| 4 planeada ANH · 5 choke por parada · 6 responsable · 8 N1/N2 · 10 pantalla de clasificación · 11 confirmación en lote · 13 diferida ANH · 14 `produccion_por_pozo` diario · 16 Regulatorio | M × 9 | F1–F2 |
| 9 conversión básica | parte de una L (≈ M) | F2 |
| 15 serializador v3.1 + Schema + validación | L | F1 |

Suma: **10 M + 6 S + 1 L**. Con el extremo **optimista** de cada rango (M = 1 semana, S = 2 días, L = 3 semanas) son **≈ 15 persona-semanas**; con el punto medio (M = 2 semanas, S = 3 días, L = 4 semanas) son **≈ 28**. La capacidad es **12,6**. Ni el extremo optimista cabe, y eso sin contar:
- el **backend real**: el producto es un front con datos de demostración y un simulador (CONTEXTO; `docs/backend/04-cadena-de-datos.md` y `03-modelo-de-datos.md` hablan del «backend real» que «debe» registrar las señales). «`paradas_pozo` v3.1 en producción con la operadora piloto» exige ingesta del PLC/SCADA de esa operadora, que no existe;
- la aprobación de la plantilla de WhatsApp por Meta (P-6);
- la marcha blanca del 24 al 30-nov, que necesita **datos reales de una operadora real**: con datos del demo no prueba nada;
- el soporte del arranque a las 05:00–07:00, incluidos sábados, domingos y el festivo del 8-dic.

**Veredicto:** F1 + F2, tal como están escritas, **no son realistas** para tres personas. F3 (1-dic → 31-ene, con 8-dic, 25-dic, 1-ene y 11-ene festivos y la temporada de fin de año) y F4 (con Semana Santa a finales de marzo de 2027) también van apretadas; el modo sin señal de 48 h de U1 §8.1 (sincronización, conflictos, idempotencia) no tiene estimación y suele ser lo más caro de una app de campo.

### 5.2 Qué se puede recortar sin incumplir

Primero, qué es «incumplir»: la obligación del 1-dic es **de la operadora**, no de TRIM (P1 §4.1; R1 §7). TRIM «incumple» solo si una operadora que confió en él no puede entregar un `paradas_pozo` válido. Todo lo que no toca ese archivo se puede mover.

**Se queda antes del 1-dic (el mínimo que sí sirve):**
1. Catálogo `C024-2026` y `DICC-V3.2` como datos, con el Anexo A (ya está hecho en papel) y la tabla `CAU_GRAL_DE_N1` (H1).
2. `ClasificacionAnh` con la coherencia en el tipo, `REGLAS_ANH` v1 y el choke por topología con `Config.anh.chokes` **cargado a mano**.
3. Partición por día operacional y paradas abiertas al corte.
4. Serializador de `paradas_pozo` en las dos formas (con unidad y origen por campo, H2–H3), Schema oficial y V-01 a V-14.
5. Identificar con la cadena de 6 eslabones y «Confirmar»; confirmación en lote por causa raíz en Turno. **Sin** WhatsApp nuevo.
6. `dif_perd`: la opción «Pérdida» en la cadena (lo pone una persona), sin el `EventoPerdida` completo.
7. Registro ANH de pozos por CSV, firmado.
8. Regulatorio mínimo: paradas del día, hallazgos, «Descargar el fragmento», marcar entregado/aceptado/rechazado a mano y generar la `CORRECCION` con motivo.

**Se mueve a F3 sin incumplir nada:**
- **Diferida ANH** (P1 §2.5, F2 punto 3): no viaja en el IDP; la ANH la calcula sola (R1 §4.3 punto 9). Es muy valiosa para prod, pero no es cumplimiento.
- **Fragmento de `produccion_por_pozo`** (F2 punto 4): lo arma el sistema de la operadora.
- **`EventoPerdida` completo**, el cuadre V-15 y el resumen por facilidad: los balances los emite la operadora.
- **Plantilla de WhatsApp de las 22:00 y 05:00** (F2 punto 2): basta un aviso en pantalla y el correo.
- **Vistas del gerente** (F2 punto 6).
- **Conversión básica** (F2 punto 5), **salvo** que la operadora piloto la ponga como condición. Es el pedido central de Edinson, así que el diseño (U1 §5) se mantiene y es lo primero de F3.

Con ese recorte, lo que queda antes del 1-dic son, con las mismas estimaciones de R4, unas **7 M + 5 S + 1 L ≈ 12–21 persona-semanas** (brechas 4, 5, 6, 8, 10, 11 y 16; 1, 2, 3, 7 y 12; y 15). Solo cabe en el extremo optimista de 12,6: es posible si la dedicación es completa y si **no** hay que construir el backend de ingesta (es decir, si la operadora piloto entrega sus eventos en un archivo o el piloto se hace con los datos de demo).

### 5.3 Dependencias ocultas

| # | Dependencia | Por qué está oculta | Quién la resuelve | Si no se resuelve |
|---|---|---|---|---|
| D1 | **Una operadora piloto** que firme | P1 F0 la da por escogida en 10 días. El transcript dice lo contrario: la reunión era para validar el producto «para básicamente en una etapa siguiente… presentar el producto a esas personas que tienen el dolor» [04:00], y «estamos en un proceso ahorita temprano» [37:34]. **La Ceiba es un campo del demo** (`src/entities/campos.ts:7`) | Hollman (comercial) | El 1-dic deja de ser «producción» y pasa a ser «demo validada» (cambio obligatorio 1 de §7) |
| D2 | **Backend real e ingesta** de los eventos del PLC/SCADA de esa operadora | P1 §5 define el contrato, pero el backend no existe | El equipo técnico | Sin él no hay `ParadaAnh` reales. Alternativa para el piloto: la operadora carga sus eventos por archivo |
| D3 | **`id_rec`, `uwi`, `form`, nombre oficial del campo, número de contrato y `NOMBREOPERADORA`** | No existen en TRIM (R4 §1.8). Que todos los pozos tengan `id_rec` y UWI asignados es **NO VERIFICADO**; y una sola formación por pozo no alcanza (H5) | La operadora | V-10 bloquea todo el archivo |
| D4 | **Credenciales del ambiente de pruebas API 1-C1** | El canal exige «seguridad, autenticación, autorización» definidas por la ANH (Circular 003/2026 §2.a). Lo usa la operadora con sus credenciales | La operadora | Sin ellas, la duda de clave o texto en `cau_niv1` (P1 §3.5) no se cierra antes del 1-dic y se arranca a ciegas (R-01 de P1) |
| D5 | **Respuestas de la ANH** por las mesas de trabajo (C24 p.10) | P1 §8 lo pide «vía Edinson»; Edinson es contratista que proyectó la circular, pero «su respuesta no es la norma» (P1 §8) | ANH | P1 ya lo prevé con interruptores. Bien |
| D6 | **Aprobación de la plantilla de WhatsApp** (categoría utilidad) | P-6 la da por hecha en F2 | Meta | El aviso de las 22:00 no sale |
| D7 | **El árbol propio de la operadora**, en CSV | P1 F0 lo «pide» | La operadora | La conversión básica no tiene qué convertir |
| D8 | **La asignación diaria oficial `prd_oil`** y el factor del mes en curso | La diferida ANH la necesita (P1 §2.5); el FA de TRIM es mensual y el del mes en curso no está cerrado (R4 §4: `tramo_diferido` es de meses cerrados) | La operadora | Diferida ANH con un FA provisional: rotularla así |
| D9 | **First-out y estado del lazo SIS legibles** por equipo | El interlock de P1 §2.9 depende de ellos | Adair / la operadora | No hay interlock que pintar (P1 §8.4, pregunta 26) |
| D10 | **Los datos de entrenamiento de Adair** | No aparecen en el plan (§3, punto 13) | Adair | El vigía del equipo piloto no se puede validar |
| D11 | **Quién está de turno de 05:00 a 08:00**, todos los días | La ventana de 1 h (Res. 0651 art. 15.2) corre a las 07:xx de cualquier día, también domingos y festivos | Hollman / equipo | Un rechazo sin nadie que corrija = reporte «no recibido» |
| D12 | **El integrador de SAP** (BAPI u OData) | P1 §2.8 / F5 | La operadora | Modo `'sap'` imposible; queda `'liviano'` |

## §6 Riesgos que nadie vio

Los de P1 §9 (R-01 a R-16) están bien escritos. Estos no aparecen en ningún documento del plan:

| # | Riesgo | Por qué | Mitigación propuesta |
|---|---|---|---|
| R-A | **Confundir los dos pilotos** | El de Adair es el equipo para el monitoreo y el modelo; el de P1 es la operadora del reporte ANH (§2.4, C-7). Se compromete una fecha regulatoria sobre un piloto que nadie firmó | Dos nombres, dos dueños y dos listas de dependencias |
| R-B | **Una fila de TRIM tumba el IDP entero de la operadora** | La circular dice que el canal «rechazará… reportes que no cumplan las reglas de validación estricta de paradas de pozo» (C24 p.8): se rechaza el **reporte**, no la fila. Mientras no se corrija, «el reporte se considerará no recibido» (Res. 0651 art. 15.2 par. 1), con las sanciones del art. 21 de la Res. 0651 en el fondo (R1 §3.1). TRIM queda expuesto a reclamos | Cláusula de responsabilidad en el contrato del piloto; modo `'fragmento'` siempre validado; registro de la huella de lo que TRIM entregó y de lo que la operadora finalmente envió |
| R-C | **Inconsistencia entre `paradas_pozo` y `produccion_por_pozo.t_prod`** | La ANH tiene los dos nodos; si las horas de paro total de un pozo no cuadran con sus horas de producción, es «inconsistencia de contenido» (Res. 0651 art. 15.2 par. 2) y abre la ventana de 1 h | V-16 (H8 de §1.4) |
| R-D | **Datos personales en `desc_evid`** | P1 arma `desc_evid` desde `Causa.texto` y `Causa.evidencia`; U1 muestra «dijo {persona}», «confirmó Jairo Peña · 04:31». Si los nombres viajan a la ANH, se transmiten datos personales de trabajadores a un tercero (régimen de la Ley 1581 de 2012; **NO VERIFICADO** su alcance exacto en este caso) | `desc_evid` con roles («supervisor de turno»), nunca con nombres; los nombres se quedan en TRIM, en `DatoClasificado` |
| R-E | **Confirmar sin entender** | El operador confirma con un toque una cadena con choke y N1 que no ve como suya (§2.2 d). La marca `M` queda «fabricada» | Confirmación por paso (cambio obligatorio P1-6) y la pregunta 3 de U1 §11.1 como criterio de salida, no solo como pregunta |
| R-F | **Inflar el conteo de paradas** | Partir por medianoche (P1 §2.6) y reportar cada disparo de ESP (P1 §2.1) multiplica las filas; la ANH puede leerlas como más paradas de las que hubo (la Unicidad es «un solo flujo… por parada», C24 p.5). Además, una parada de 24 h sale como 23:59:59 h | Llevar el `eventoId` en `desc_evid` («tramo 2 de 3 del evento …»), mientras la ANH responde la pregunta 4 |
| R-G | **El mercado real no es el del demo** | Las operadoras grandes tuvieron del 09-09 al 01-12 para resolver esto y la mayoría ya lo tiene, o tiene un integrador; el comprador realista son las operadoras chicas, «que no tienen ni 3, 4 ítems» [31:08], justo las que tienen menos telemetría por pozo. Ahí el caso C de U1 §2.2 (3–5 toques) será el común, no el A (1 toque) | Probar la captura con un campo sin PLC por pozo (U1 §11.1) antes de prometer «1 toque» |
| R-H | **`t_iny` y la bomba piloto** | Si la bomba de reinyección para, los inyectores reportan menos horas de inyección (`inyeccion_por_pozo.t_iny`) en el IDP de la operadora; si TRIM no lo cuadra con sus paradas, la operadora reporta dos versiones del mismo evento. Y un día completo no cabe en «HH:MM» del Schema (máximo «23:59») | H4 de §1.4 |
| R-I | **Formación múltiple por pozo** | H5 de §1.4 | Pregunta nueva para la ANH |
| R-J | **El FA del mes en curso** | La diferida ANH con `fuenteReal = 'trim'` usa el FA del mes, que no está cerrado durante el mes (R4 §4). La cifra que ve prod cambiará al cierre del mes | Rotular «provisional hasta el cierre del mes» |
| R-K | **Promesas de sincronización sin estimar** | U1 §8.1 promete 48 h sin red para todo el programa del día | Estimarlo antes de comprometer F4; si no cabe, empezar con captura sin red solo del cierre de la orden |
| R-L | **El guion de las preguntas de campo induce el responsable** | U1 §2.4: «Bloqueo, paro, robo o amenaza» propone «Comunidad o Tercero» y `NP_OPUB`; un robo de instrumentos es `NP_INS` «Hurto de instrumentación» y un atentado al oleoducto es `NP_TRANSP`. «Lluvia, rayo…» lleva a `NP_CLIMA`, pero un rayo que daña un transmisor es `NP_INS` «Daño por tormenta eléctrica» (R1 §1.5, solapamientos) | Que la segunda pregunta pregunte **qué se dañó** antes de fijar la N1 |

## §7 Veredicto final: cambios obligatorios y opcionales

**Veredicto.** El plan es **sólido en el modelo y en lo normativo** (vocabulario, coherencia planeada/N1 en el tipo, dos formas de salida, catálogo exacto, preguntas bien armadas) y **no está listo para construir** por tres cosas: (1) promete «producción el 1-dic» sin operadora, sin backend y con el doble del trabajo que cabe; (2) le faltan tres datos obligatorios del archivo (`cau_gral_paro`, unidad, origen de `desc_evid`) y un nodo (`inyeccion_por_pozo`); (3) P1 y U1 se contradicen en quién confirma el choke y la N1 y en la pregunta de los tanques. Con los cambios obligatorios de abajo, pasa.

### 7.1 Cambios obligatorios a P1 (en orden de prioridad)

| # | Sección | Cambio | Redacción propuesta |
|---|---|---|---|
| P1-1 | §0 punto 7, §6 (Calendario, «Arranque obligatorio», F0) | Separar el 1-dic de «producción»; puerta de decisión en F0 | «**El 1-dic es la obligación de la operadora, no de TRIM.** Si al 31-oct hay una operadora piloto firmada, con su registro ANH de pozos y sus eventos (archivo o ingesta), el 1-dic TRIM le entrega cada día el fragmento `paradas_pozo` validado. Si no la hay, la meta del 1-dic es un **generador validado con datos `DEMO-`** (Schema + V-01 a V-16) y la prueba en API 1-C1 queda para cuando una operadora preste sus credenciales.» Y en todo P1: «La Ceiba» solo como ejemplo del demo |
| P1-2 | §6, F1 y F2 | Recortar a lo que toca el archivo | Mover a F3: diferida ANH (F2-3), fragmento de `produccion_por_pozo` (F2-4), `EventoPerdida` completo y V-15, plantilla de WhatsApp (F2-2), vistas del gerente (F2-6) y la conversión básica salvo que la operadora la exija (F2-5). Lista exacta en §5.2. Agregar a R-14 la cuenta de §5.1 |
| P1-3 | §1.2 (`FormaSalidaAnh`), §1.3, §1.4, §4.2 | Los tres datos obligatorios sin regla | Agregar `CAU_GRAL_DE_N1` (20 filas, provisional) y `forma.cauGral`; `forma.unidad` por campo («string»; «ISO 8601 DateTime» en las horas, copiado de la plantilla) comprobado por V-03; en §1.3: «`desc_evid`: `M` si una persona escribió algo, `C` si lo armó TRIM» |
| P1-4 | §4.1 y §8.1 pregunta 7 | `inyeccion_por_pozo` | Fila nueva en §4.1: «`inyeccion_por_pozo` (9): `t_iny` (HH:MM), `vol_iny`… **No lo emite**; aporta las horas de marcha de la bomba de reinyección como soporte y avisa si no cuadran con el `t_iny` que carga la operadora». En la pregunta 7, cambiar «el inyector no se reporta» por «el inyector no tiene fila de parada, pero su tiempo de inyección viaja en `t_iny`; ¿cómo se reporta un día completo si el formato no admite 24:00?» |
| P1-5 | §4.2 | Nueva regla V-16 | «V-16 · Por pozo y día, Σ duración de las paradas con `fraccion = 1` ≈ 24 h − `t_prod` (tolerancia firmada) · aviso · Res. 0651 art. 15.2 par. 2» |
| P1-6 | §1.3, §1.15, §6 F1 (pruebas) | Confirmación **por paso** y la prueba e2e | En §1.3: «Una confirmación sube a `confirmado` solo los pasos que la persona contestó o que su capacidad cubre: `oper` y `tec`, qué encontró, ¿programado? y ¿se regó?; `sup` y `prod`, los 6. El choke, la N1 y la N2 de una cadena que confirmó solo un operador siguen con origen `C`». En F1: cambiar «el operador nunca ve choke ni N1» por «al operador nunca se le pide escoger choke, N1 ni N2» |
| P1-7 | §1.13 y §2.9 | Colores sin dobles sentidos | (a) «La excepción del morado cubre `sin-comunicacion` y `dato-invalido` y nada más. Un paso sin respuesta ("falta") va en gris con contorno discontinuo y la palabra "falta"; con la hora límite cerca, marca de aviso». (b) «En las dos guías, `interlock` es rojo con candado y `alarma-1` es naranja; las guías solo difieren en tonos». (c) Decir que hasta F3 rige la guía actual (P1 rojo) |
| P1-8 | §1.11, §6 F4 y F5 | La cifra principal y la logística | Mover a F4 L3, L4 y L5 calculados desde el cierre del modo `'liviano'`, o sacar L3/L4 de `cifraPrincipal` hasta F5 y decírselo a Edinson |
| P1-9 | §2.5 | Identidad mal prometida | Cambiar «`resto` es 0 por construcción» por «`resto` es 0 si el real propuesto se define como prueba × FA × (24 − Σ h × fracción) ÷ 24; con la fórmula de horas en marcha, las paradas parciales dejan `resto ≠ 0`» |
| P1-10 | §3.2, §2.9 | Los dos pilotos y el porqué de Adair | «**Equipo piloto del vigía** (Adair): una multifásica o una de inyección, porque son las más instrumentadas (9 temperaturas, 2–3 vibraciones, presiones de succión y descarga, flujo, corriente del variador, [36:51]) y desencadenan eventos en cascada [33:45]; depende de los datos de entrenamiento que Adair está consiguiendo. **Operadora piloto del reporte ANH**: otra decisión, con otras dependencias (§5.3).» Quitar «tiene catálogo de partes» como diferencia (la multifásica también lo tiene) |
| P1-11 | §2.1 (regla nueva) | La advertencia de Hollman [37:34] | «Lo que sale de la firma de variables (`Causa.como = 'firma'`) o de un código del controlador que puede venir de superficie (GF, PH, UV) nunca pasa a `confirmada` sin una persona, y su N2 la confirma quien abrió el equipo. Una señal apunta, no prueba.» |
| P1-12 | §1.2, §2.1, §2.2, §2.6, §4.3, §8.1 | Citas (§1.2 de esta revisión) | p.3 → p.4 en dos lugares; COT y −05:00 como provisionales; versión 3.1 según Dicc. 4; las cinco cadenas distintas del Diccionario; la tercera escritura de `resp_par`; la regla del `slug` con «racha → un `-`, sin `-` en los extremos» |
| P1-13 | §8 | Preguntas que faltan | Agregar: (a) gas: ¿qué cambia en un campo de gas (diferida de gas, nominación, tolerancia)? (Edinson [31:08]); (b) pozo con varias formaciones: ¿una fila por formación?; (c) `t_iny` de un día completo; (d) `fuente_de_entrega` y `fecha_publicacion` del archivo; (e) a Adair: ¿cuándo llegan los datos de entrenamiento y de qué equipo? |
| P1-14 | §9 | Riesgos nuevos | R-A, R-B, R-C, R-D y R-F de §6 de esta revisión, como mínimo |
| P1-15 | §2.1 (`REGLAS_ANH` v1) y §3.1 | Variador de la bomba de la línea | Agregar la fila «`reinyeccion`/`transporte` con señal del VSD o del MCC → `NP_ENINT` "Falla VSD" / "Falla MCC/Switchgear", `planta`», o borrar la frase de §3.1 que lo promete |
| P1-16 | Respuestas a UX, P-1 y P-16 | Respuestas que dicen «Sí» sin serlo del todo | P-1: «Sí para `reg` en F1; **No** para `plan` antes del 1-dic (va en F4)». P-16: contestar el Desacuerdo 2 de U1 (ver P1-7 b) |

### 7.2 Cambios obligatorios a U1 (en orden de prioridad)

| # | Sección | Cambio | Redacción propuesta |
|---|---|---|---|
| U1-1 | §2.4 (Pregunta 1, botón de tanques) | Partir el botón y preguntar por el oleoducto | «La planta no recibe (agua o proceso)» → Operador · Operación · Planta · `NP_PROC`. «El tanque de crudo está lleno» → «¿El oleoducto o el cliente estaba recibiendo?» con «Sí, recibía» (Planta · `NP_PROC` «Tanques llenos / capacidad limitada»), «No, no recibía» (Externo · Transportador · Exportación · `NP_TRANSP`) y «No sé» |
| U1-2 | §2.6, §2.7, §3.2, §10.1 | Lo que ve y confirma el operador | El mensaje de WhatsApp de cierre dice solo lo que el operador puede avalar: «Así queda lo que usted contestó: P-201B, rodamientos, se recalentó, no se regó nada. El resto del reporte lo revisa su supervisor. 1) Está bien · 2) Algo está mal». En el teléfono del operador, la cadena técnica (Dónde, Causa, Detalle) va plegada con la línea «lo propone TRIM; lo confirma su supervisor» |
| U1-3 | §2.1, §10.1 | El «falta» no es morado | «Si el eslabón todavía no tiene dato, se pinta como hueco gris con contorno discontinuo y la palabra "falta". No usa el morado: no es un dato malo, es una respuesta que falta. Cerca de la hora límite lleva la marca de aviso (cuadrado amarillo con "3")» |
| U1-4 | §1.1 (fila ger), §4.3 (ⓘ) | «gravamen», no «regalías» | ⓘ: «La pérdida "podrá estar sujeta a gravamen por parte de la ANH, de acuerdo con la responsabilidad de la compañía operadora y la naturaleza del evento" (Circular 024, p. 4). La norma que fija cuándo no está publicada (NO VERIFICADO).» |
| U1-5 | §6.2, §6.3 | Ejemplos con apariencia real y nombre de archivo mal armado | «Contrato DEMO-001 · La Ceiba (demo)»; archivo «`OPERADORADEMO_DEMO001_20261021T061200.json`» (el primer bloque es la operadora, no el campo) |
| U1-6 | Desacuerdos, punto 6 | Afirmación falsa | Retirar «las marcas de tiempo no aparecen en `transcript.txt`». Citar por [mm:ss] en todo el documento (l.32 = [22:34], l.50 = [26:48], l.56 = [31:08], l.62 = [33:45], l.80 = [36:51]) |
| U1-7 | Pedidos P-3, P-4, P-5, P-11, P-13, P-14; §4.2; §5.3; Desacuerdos 5 y 7; §1.1 | Sincronizar con las respuestas de P1 | Usar los nombres de P1 (`'menos-1'`…; `{ pregunta, opciones }`; `circulo-i`; `ProgramaSemana`; `correcciones`; `notificacion24h`); borrar «Hoy `EventoPerdida.volumen` es obligatorio» y «P1 no tiene un campo para el texto de esa pregunta»; borrar los Desacuerdos 5 y 7; en §1.1, «`reg` desde F1 y `plan` desde F4» |
| U1-8 | §3.1 (ⓘ de «Qué limita hoy al campo») | Tres tramos, no cuatro | «De los tres tramos con potencial —pozos (que incluye el yacimiento), planta y exportación— el que menos deja pasar. Se calcula con los potenciales firmados: no se declara.» |
| U1-9 | §4.2 (rechazo por especificación) y §5.1 (conf) | Permisos que P1 no da | «Lo registra prod» (o pedir a P1 que dé `perdida:registrar` a `reg`); el comentario de `conf` en la tabla de conversión, como pedido nuevo a P1 |
| U1-10 | §7.1 (bloque de paquetes) | La logística no llega en F4 | Si P1 no adelanta el paquete 4 (P1-8), mostrar «Logística · disponible desde mayo de 2027» en vez del interruptor encendido |
| U1-11 | §2.4 (segundas preguntas de «Bloqueo, paro, robo…» y «Lluvia, rayo…») | No fijar la N1 antes de saber qué se dañó | Antes de proponer `NP_OPUB` o `NP_CLIMA`, preguntar «¿Qué se afectó? El pozo o la vía · Un instrumento · El oleoducto»: «Un instrumento» lleva a `NP_INS` («Hurto de instrumentación», «Daño por tormenta eléctrica»); «El oleoducto» lleva a `NP_TRANSP` |
| U1-12 | §11 | Lo que falta probar | En §11.1, la pregunta 3 («¿le da confianza tocar Confirmar…?») pasa a criterio de salida: si más de 1 de cada 5 confirma sin poder decir qué confirmó, no se construye la confirmación de un toque. En §11.3, pedirle a Adair la fecha de los datos de entrenamiento |

### 7.3 Cambios opcionales

1. **U1 §2.4:** renombrar «P1 · ¿Qué lo paró?», «P2», «P3», «P4» a «Pregunta 1…4», para no chocar con P1 (el documento), P-1…P-16 (los pedidos) y P1 (la prioridad).
2. **P1 §1.12 / U1 §8.4:** una vista **mensual** del programa, como la describió Edinson («organiza su trabajo mensual», [22:34]), encima de la semana congelada.
3. **P1 y U1:** una ayuda para prod ante una restricción de agua: **qué pozos cerrar primero** (más agua por barril de crudo perdido). Es el ejemplo de los «pozos acuatosos» de Edinson [31:08] y da valor por rol inmediato.
4. **P1 §1.6:** `formaciones: string[]` y `campoAnh` en `RegistroAnhPozo` desde F1, aunque la regla de filas por formación espere la respuesta de la ANH.
5. **P1 §1.9:** `choke?` opcional en `EventoPerdida` (H10).
6. **P1 §2.6:** llevar el `eventoId` y «tramo n de m» en `desc_evid` cuando una parada se parte por medianoche (R-F).
7. **P1 §6:** estimar el modo sin señal de 48 h de U1 §8.1 antes de F4 (R-K).
8. **P1 §1.9:** citar el texto original de la Res. 0651 (27-08-2025) para el KPC del venteo; la versión compilada no trae la unidad.
9. **U1 §1.1:** la regla de no mostrar nombres de personas en `desc_evid` (R-D), escrita también en la descarga del CSV de §6.4.

## Desacuerdos con otros agentes

- **P1 §0 punto 7 y §6** («1-dic arranque con la bomba de reinyección de La Ceiba», «`paradas_pozo` v3.1 en producción con la operadora piloto»): desacuerdo de fondo. La Ceiba es del demo, no hay operadora firmada ni backend real, y el trabajo de F1+F2 no cabe (§5). Propuesta: P1-1 y P1-2.
- **P1 §1.13 y «Respuestas a UX»** (excepción del morado aceptada): de acuerdo con la excepción, **en desacuerdo con que se extienda**: U1 la usa además para «falta» y P1 §2.5 para «sin prueba reportada». Propuesta: P1-7 (a) y U1-3.
- **P1 §6, F1** («el operador nunca ve choke ni N1») frente a **U1 §2.6, §3.2 y §10.1**: los dos tienen parte de razón; el problema es la confirmación en bloque. Propuesta: P1-6 y U1-2.
- **P1 §3.2** (porqué del piloto): desacuerdo con la razón («tiene catálogo de partes»), no con la decisión. La multifásica también tiene catálogo.
- **P1 §8.1, pregunta 7** («el inyector no se reporta»): `inyeccion_por_pozo.t_iny` lo contradice (H4).
- **U1, Desacuerdo 6** (el transcript «no tiene tiempos»): es falso; tiene [mm:ss] en cada intervención.
- **U1 §2.4** (botón «La planta no recibe o los tanques están llenos»): contradice P1 §3.3; manda a `planta` lo que puede ser `exportacion`.
- **R2 §4.1 punto 3, tal como lo recoge U1 §1.1** («decide si paga regalía»): R2 lo marca como inferencia; U1 lo da por hecho y cambia «gravamen» por «regalía». Se cita la circular literal.
- **CONTEXTO.md** dice «Fecha de hoy: 19-oct-2026»; todos los documentos del plan están fechados el 21-oct. Sin efecto práctico.

## NO VERIFICADO

| Afirmación de esta revisión | Por qué no se verificó |
|---|---|
| Que el Anexo A coincida **byte a byte** con el PDF (más allá del texto extraído) | `pdftotext` no deja ver caracteres invisibles (espacio duro, tipo de guion). La coincidencia es con el texto extraído |
| Que «LLA-34» sea un contrato real | No se consultó el registro de contratos de la ANH; basta con que tenga apariencia real para violar la regla `DEMO-` de P1 §6 |
| Los festivos de noviembre de 2026 (2 y 16) | Calculados con la regla de traslado de la Ley 51 de 1983, no leídos de un calendario oficial |
| La dedicación de Hermes, Eduardo y Sergio | El transcript solo los nombra ([35:35]); §5.1 supone dedicación completa, que es el caso más favorable |
| Que todos los pozos tengan `id_rec` y UWI asignados por la ANH | No hay fuente que lo diga; depende de cada operadora |
| El alcance exacto de la Ley 1581 de 2012 sobre los nombres de trabajadores en `desc_evid` | No se hizo un análisis jurídico; se marca como riesgo, no como incumplimiento |
| Las estimaciones de esfuerzo de §5.1 | Son las de R4 §8 («estimación del auditor»), sumadas aquí; no hay un desglose por tarea |
| Que el receptor de la ANH rechace el reporte completo por una sola fila | La circular dice «rechazará… reportes que no cumplan» (C24 p.8); que el rechazo sea del archivo entero y no de la fila es la lectura literal, sin confirmación de la ANH |
