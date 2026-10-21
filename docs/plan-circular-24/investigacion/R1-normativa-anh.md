# R1 — Normativa ANH: paradas de pozo, diferidas, pérdidas e IDP JSON

Investigador normativo · 19-oct-2026 · Fuentes primarias citadas por numeral/página o URL. Lo que no se pudo verificar va marcado **NO VERIFICADO**.

Convención de citas: «C24 p.N» = Circular ANH 0024 del 09-09-2026, página N de 10 (`docs/reuniones/2026-10-19-edinson-adair/circular-anh-024-2026.pdf`). «Árbol» = `docs/reuniones/2026-10-19-edinson-adair/arbol-paradas-pozo-anh.jpg`. «Transcript» = `docs/reuniones/2026-10-19-edinson-adair/transcript.txt` (línea).

## Índice
1. Circular 024/2026 — transcripción literal
2. Árbol (imagen) cotejado contra la Tabla 1
3. Cadena normativa (Res. 0651/2025 y modificatorias, Circular 003/2026, Res. MME 40236/2022 y 40537/2024)
4. Plantilla JSON v3.1, JSON Schema Draft-07 y Diccionario de Datos
5. SPE-36848 «The Choke Model»
6. Ambigüedades y huecos (con pregunta para Edinson)
7. Implicaciones para TRIM (OBLIGATORIO vs RECOMENDADO)
8. Desacuerdos con otros agentes
9. Fuentes descargadas

---

## 1. Circular 024/2026 — transcripción literal

### 1.0 Ficha
- **Número y fecha:** «CIRCULAR No. 0024 DEL 09-09-2026» (encabezado de cada página). Formato `ANH-GDO-FR-16 Versión N° 3`.
- **Para:** «Compañías Operadoras de Contratos de Asociación, Contratos de Exploración y Explotación (E&E), Contratos de Exploración y Producción (E&P), Convenios de Explotación, Convenios de Exploración y Explotación.» (C24 p.1)
- **De:** «Vicepresidente de Operaciones, Regalías y Participaciones.» (C24 p.1). El PDF **no trae nombre ni firma** del Vicepresidente tras «Cordialmente,» (C24 p.10).
- **Asunto:** «Especificaciones Técnicas para el Intercambio de Información de Producción: Implementación del Esquema JSON Versión 3.1 (Formato Único - Tipo U) y Adopción de la metodología jerárquica y matriz estructurada de paradas de pozo.» (C24 p.1)
- **Marco legal citado:** «Ley 2056 de 2020, las Resolución No. 40236 de 2022 y No. 40537 de 2024, expedidas por el Ministerio de Minas y Energía, y la Resolución 0651 de 2025 y sus modificaciones, expedidas por la ANH» (C24 p.1).
- **Aprobó / Revisó / Proyectó** (C24 p.10): Aprobó: Luz Mireya Raymond Ángel (Componente Técnico – Supervisora VORP), Mónica Verdugo (Componente Jurídico – Supervisora VORP), Andrés Guillermo Pachón (Componente Técnico – Supervisor OTI). Revisó: Ingrid María Guerra Rodríguez (Componente Jurídico VORP). Proyectó: Ricardo Andrés Baquero Rojas, John Edward Kekhan Niño, Berny José Méndez Castro, Elbis José Zamora Hernández, Carlos Andres González Triviño, **Edinson Jair Maestre Delgado** (todos «Contratista / Componente Técnico»).

### 1.1 Numeral 1 — JSON v3.1 (resumen fiel, con citas literales en lo normativo)
- **1.1 Formato Único Tipo U:** «la ANH ha determinado la eliminación de la segmentación técnica entre Archivos Tipo A (Alta frecuencia/Telemetría) y Tipo B (Baja frecuencia/Manual), la cual fue descrita en la Circular No. 003 de 2026.» «A partir de la implementación de la Versión 3.1, se adopta un Formato Único (Tipo U).» Aplica «tanto a los campos petroleros que se encuentran dentro del ámbito de telemetría, al que hace referencia el artículo 2 de la Resolución 0651 de 2025 y sus modificaciones, como a aquellos que reportan por medios manuales o no telemetrizados.» (C24 p.2)
- **1.2 Tuplas híbridas:** «cada variable operativa será reportada como un arreglo estricto de tres posiciones ["Valor", "Origen", "Unidad"].» «Es obligatorio declarar en la segunda posición del cada arreglo el origen del dato correspondiente de forma individual: "A" (Automático), "M" (Manual) o "C" (Calculado).» «Se consolida la información en un único contenedor o nodo denominado segmento_datos, eliminando la separación física entre los eventos de alta y baja frecuencia.» Afirma una reducción de payload «en más de un 60%». (C24 p.2)
- **1.3 Validación en origen:** «Junto con la plantilla JSON V3.1, la ANH publica oficialmente el JSON Schema Estricto (Draft-07) y el Diccionario de Datos del proyecto en formato Excel. Estos documentos constituyen el contrato normativo digital que regirá todas las transacciones de información.» «El esquema prohíbe estrictamente el envío de campos no autorizados ("additionalProperties": false)». (C24 p.3)
- **1.4 Balances de fluidos** (literal, C24 p.3):
  > «las compañías operadoras deberán ajustar sus sistemas y flujos de información para integrar de forma obligatoria los nuevos módulos de cierre operativo presentes en la Versión 3.1 del archivo JSON:
  > • Estructuras de balance diario: Diligenciamiento de los balances correspondientes a balance_fluido_crudo, balance_fluido_agua y balance_fluido_gas para cada facilidad de producción activa.
  > • Desglose de productos refinados y subproductos: Inclusión obligatoria del balance de inventarios detallado en el nodo balance_fluido_blancos, desglosando los volúmenes operativos de propano, butano, gasolina, nafta, glp y gasolina natural.»

  La circular **no** detalla los campos internos de esos cuatro nodos (quedan remitidos al Schema/Diccionario, ver §4).

### 1.2 Numeral 2 — preámbulo (literal, C24 p.3)
> «La ANH adopta una metodología estandarizada para la identificación, clasificación y reporte de los eventos que ocasionen la interrupción total o parcial de la producción de un pozo, con el propósito de garantizar la trazabilidad, consistencia, verificabilidad y análisis de la información reportada por los operadores.
> La clasificación de una parada de pozo permitirá identificar el evento, su causa, el componente del sistema de producción donde se origina o materializa y su eventual impacto sobre la producción.
> **La existencia de una parada de pozo no implica, por sí misma, la existencia de una producción diferida o pérdida de producción.** La clasificación del impacto deberá efectuarse de acuerdo con las condiciones técnicas y operacionales del evento y con la información que permita sustentarlo.»

### 1.3 Numeral 2.1 — Definiciones (literal, C24 p.3–4)
«Con la presente circular, se ratifican y adoptan con carácter obligatorio las siguientes definiciones técnicas:»

- **Parada de Pozo:** «Todo evento, condición técnica, decisión operativa o causa externa que genere la interrupción total o parcial de la producción de hidrocarburos de un pozo, con independencia de su duración, frecuencia, origen o del nivel del sistema de producción en el que se manifieste.»
- **Parada Planeada:** «Parada de pozo asociada a actividades previstas, programadas o decididas intencionalmente por el operador como parte de la gestión normal del activo, tales como mantenimientos, intervenciones, pruebas, verificaciones, puesta en servicio, limitación de producción u optimización operativa.»
- **Parada No Planeada:** «Parada de pozo originada por eventos no previstos o no programados, tales como fallas súbitas de equipos, incidentes operativos, sabotajes, vandalismo, factores climáticos severos o restricciones ajenas al control directo del operador.»
- **Diferida de Producción:** «Volumen de hidrocarburos que no se produce durante un determinado período de tiempo y que, por diversas razones operativas o no operativas, no se obtiene en superficie de acuerdo con el potencial esperado o la meta establecida para cada pozo en un momento dado.
  Las diferidas de producción podrán originarse, entre otras, por Paradas Planeadas o Paradas No Planeadas.
  **La cuantificación de la Diferida de Producción se realizará como la diferencia entre la producción máxima esperada, acorde con el potencial del pozo (última prueba de potencial reportada a la ANH), y la producción real obtenida en un período de veinticuatro (24) horas.**
  Para efectos de este concepto, se entenderá que la prueba de producción utilizada para determinar el potencial del pozo es representativa tanto para la compañía operadora como para la ANH, y que el sistema de levantamiento se encuentra en condición optimizada.»
- **Pérdida de Producción:** «Volumen de hidrocarburos que ha sido producido a superficie y que, por condiciones operativas o no operativas, deja de estar disponible para su comercialización, tales como derrames de crudo, fugas de hidrocarburos desde cabeza de pozo hasta el PMO, quema de gas en tea, venteos intencionales, rechazo por especificación o daños en equipos que generen pérdida de hidrocarburo.
  A efectos de reporte y clasificación en el marco del presente anexo, este volumen se registrará como "Pérdida", en tanto no puede ser recuperado en períodos posteriores. **La Pérdida de Producción podrá estar sujeta a gravamen por parte de la ANH, de acuerdo con la responsabilidad de la compañía operadora y la naturaleza del evento.**»
- **Componente del Sistema de Producción (Choke):** «Punto funcional de la cadena de producción donde se origina o materializa de manera restrictiva la parada o limitación de flujo, clasificándose estrictamente para efectos de reporte en Pozo, Planta, Exportación o Reservorio, de conformidad con la metodología internacional de contabilidad de pérdidas de producción "The Choke Model" (estándarSPE-36848). En consecuencia, este concepto define la localización del cuello de botella o restricción dentro del sistema de producción y se distingue técnicamente de la válvula de estrangulamiento o componente mecánico físico instalado en la cabeza del pozo (válvula choke).»

Notas de lectura (no son texto de la norma):
- La definición de Pérdida dice «en el marco del presente anexo»: la circular no tiene anexos; el texto viene palabra por palabra del «Anexo técnico de interoperabilidad IDP» de la Circular 003/2026 (§1.2 del Anexo). Ver §3.3.
- «estándarSPE-36848» va pegado en el original. SPE-36848 es un *paper* de conferencia, no un «estándar» (ver §5).

### 1.4 Numeral 2.2 — Los 6 pasos y los principios (literal, C24 p.5)
«La clasificación de toda parada de pozo debe realizarse de forma secuencial, obligatoria y jerárquica por parte de los ingenieros y operadores del campo, siguiendo estrictamente el flujo lógico estructurado en los siguientes seis (6) pasos normativos:»

1. **Paso 1: Identificación del responsable del evento.** «Determinar el actor u origen del cese de flujo, seleccionando entre Operador-Operación, Operador-Mantenimiento, Operador-Planeación/Logística, Externo-Proveedor Energía, Externo-Transportador, Comunidad, Autoridad/Regulador, Tercero o Fuerza Mayor (Clima/Natural).»
2. **Paso 2: Localización del Componente (Choke); Componente o nivel de ocurrencia del evento.** «Identificar el cuello de botella físico o limitación funcional donde se materializa la parada (Pozo, Planta, Exportación o Reservorio).»
3. **Paso 3: Definición del impacto en producción.** «Clasificar la naturaleza volumétrica del impacto entre Diferida de Producción o Pérdida de Producción, según corresponda, considerando si la producción no realizada puede restaurarse posteriormente o si el hidrocarburo ya producido a superficie dejó de estar disponible para comercialización. La clasificación deberá sustentarse en las condiciones técnicas del evento y la información disponible.»
4. **Paso 4: Condición de Planeación.** «Definir si el evento fue previsto (Planeada) o súbito (No Planeada) dentro de la programación oficial del activo.»
5. **Paso 5: Selección de Causa - Nivel 1.** «Asignar la clave de categoría general de la naturaleza del evento. Esta asignación debe basarse estrictamente en la matriz estandarizada (cau_niv1).»
6. **Paso 6: Selección de Causa - Nivel 2.** «Especificar la causa exacta, puntual y verificable que describe de forma concreta el evento técnico o falla raíz que detuvo la producción (cau_niv2).»

**Principios** (literal): «Los principios que rigen esta clasificación metodológica son la **Unicidad** (un solo flujo de clasificación completo por parada), la **Consistencia** (mismo criterio ante eventos iguales), la **Trazabilidad** técnica, la **Neutralidad** técnica (el reporte no prejuzga responsabilidad contractual) y la **Verificabilidad** de los soportes.»

Los 9 responsables del Paso 1, como lista: `Operador-Operación` · `Operador-Mantenimiento` · `Operador-Planeación/Logística` · `Externo-Proveedor Energía` · `Externo-Transportador` · `Comunidad` · `Autoridad/Regulador` · `Tercero` · `Fuerza Mayor (Clima/Natural)`.

### 1.5 Numeral 2.3 — Tabla 1 completa (literal, C24 p.6–7)
Texto previo: «la ANH implementa de forma obligatoria la actualización de la Matriz de Paradas de Pozo. Esta actualización establece veinte (20) códigos unívocos para Causa Nivel 1 (N1_KEY) y restringe el dominio de Causa Nivel 2 (cau_niv2) a opciones estrictamente predefinidas.» Título: «Tabla 1: Estructura de Códigos Unificados de Paradas de Pozo.»

Columnas originales: Condición · Código N1_KEY · Causa Nivel 1 (N1_TEXT) · Catálogo de Causa Nivel 2 (cau_niv2) - Eventos Cerrados. Las causas N2 se separan en el original por comas; aquí van separadas por « · » y numeradas, **con la ortografía exacta del PDF** (mayúsculas, tildes y errores incluidos).

| # | Condición | N1_KEY | N1_TEXT | Causas N2 (cau_niv2) | n |
|---|---|---|---|---|---|
| 1 | Planeada | `P_MANT_ELE` | Planeada - Mantenimiento Eléctrico | 1 Transformador · 2 Acometida eléctrica · 3 UPS / Fuente · 4 Generador · 5 Protecciones eléctricas · 6 Cableado eléctrico · 7 MCC / Switchgear · 8 VSD · 9 Red interna BT/MT/AT | 9 |
| 2 | Planeada | `P_MANT_MEC` | Planeada - Mantenimiento Mecánico | 1 Unidad de bombeo superficie · 2 Caja reductora · 3 Correas / Poleas · 4 Bomba (superficie) · 5 Compresor · 6 Lubricación · 7 Sistema de Levantamiento Artificial | 7 |
| 3 | Planeada | `P_MANT_INS` | Planeada - Mantenimiento Instrumentación | 1 Calibración instrumentos presión · 2 Calibración instrumentos nivel · 3 Sensores fondo · 4 Instrumentación superficie · 5 Verificación lazos de control · 6 Válvulas de control | 6 |
| 4 | Planeada | `P_MANT_INT` | Planeada - Mantenimiento Integridad | 1 Inspección líneas internas · 2 Inspección válvulas · 3 Inspección tubing / casing · 4 Cambio de tramo de línea · 5 Reparación por corrosión · 6 Reemplazo de válvulas | 6 |
| 5 | Planeada | `P_WO` | Planeada - Intervención / Workover | 1 Workover / recompletación · 2 Cambio zona productora · 3 Cañoneo / fractura / estimulación · 4 Servicio contratado (equipo) | 4 |
| 6 | Planeada | `P_PRUEBAS` | Planeada - Pruebas / Verificaciones | 1 Prueba de pozo (presión transiente, producción, potencial, PLT, ILT, otros) · 2 Prueba de integridad · 3 Verificación/calibración (metrología) · 4 HAZOP / verificación de seguridad | 4 |
| 7 | Planeada | `P_PES` | Planeada - Puesta en servicio | 1 Comisionamiento · 2 Reintegro tras overhaul · 3 Hook-up / puesta en marcha | 3 |
| 8 | Planeada | `P_OP` | Planeada - Operación (curtailment) | 1 Curtailed por decisión operativa · 2 Optimización / ramp-up controlado · 3 Operación por balance de inventarios | 3 |
| 9 | No Planeada | `NP_CLIMA` | No planeada - Clima / Natural | 1 Tormenta eléctrica / descargas · 2 Deslizamiento / derrumbe · 3 Incendio (natural) · 4 Otro evento natural · 5 Inundación / Desborde de río · 6 Fuertes lluvias / vías intransitables | 6 |
| 10 | No Planeada | `NP_OPUB` | No planeada - Orden público / Seguridad | 1 Paro gremios / transportadores · 2 Grupo armado / amenaza seguridad · 3 Hurto · 4 Sabotaje / atentado · 5 Vandalismo / daño intencional · 6 Orden público - Pendiente detalle · 7 Bloqueo comunidad / ingreso a locación · 8 Bloqueo indígena / ingreso a locación | 8 |
| 11 | No Planeada | `NP_ENEXT` | No planeada - Energía externa | 1 Corte energía proveedor · 2 Baja/alta tensión del proveedor · 3 Falla subestación externa · 4 Acometida externa afectada (poste/red externa) | 4 |
| 12 | No Planeada | `NP_ENINT` | No planeada - Eléctrica interna | 1 Falla transformador · 2 Falla MCC/Switchgear · 3 Falla UPS/Fuente · 4 Falla generador local · 5 Falla cableado interno/empalmes · 6 Falla protecciones (breaker/fusible/relé) · 7 Punto Caliente · 8 Falla Sistema a Tierra · 9 Falla por Fauna · 10 Falla por Flora · 11 Falla por falta de Mantenimiento · 12 Falla VSD · 13 Falla red interna BT/MT/AT | 13 |
| 13 | No Planeada | `NP_INS` | No planeada - Instrumentación | 1 Falla transmisor de presión · 2 Falla transmisor de nivel · 3 Falla sensor fondo · 4 Instrumento fuera de rango · 5 Instrumento sin señal · 6 Daño por humedad / inundación · 7 Daño por tormenta eléctrica · 8 Hurto de instrumentación · 9 Instrumentación manipulada por terceros · 10 Falla por falta de Mantenimiento · 11 Error de calibración | 11 |
| 14 | No Planeada | `NP_CTRL` | No planeada - Control / Comunicaciones | 1 Falla PLC/CPU · 2 Falla SCADA/red/comunicaciones · 3 Falla HMI/Servidor · 4 Falla Instrumento/sensor · 5 Perdida Línea de Vista (Flora) · 6 Falla configuración/parametrización | 6 |
| 15 | No Planeada | `NP_SUB` | No planeada - Mecánica subsuelo | 1 Falla ESP · 2 Falla PCP · 3 Falla Gas Lift · 4 Arenamiento / obstrucción · 5 Integridad de pozo (packer/tubing/casing) · 6 Alto BSW / corte de agua | 6 |
| 16 | No Planeada | `NP_SUP` | No planeada - Mecánica superficie | 1 Falla unidad de bombeo superficie (Componentes) · 2 Falla rodamiento/cojinete (bearing box) · 3 Falla caja reductora / lubricación · 4 Falla Correas / Poleas · 5 Falla motor superficie · 6 Falla Sistema de Levantamiento Artificial | 6 |
| 17 | No Planeada | `NP_INTEG` | No planeada - Integridad / Líneas / Válvulas | 1 Pitting / corrosión · 2 Fuga / daño en línea interna · 3 Daño válvula/acople/unión · 4 Cambio de tramo/valvulería (correctivo) | 4 |
| 18 | No Planeada | `NP_PROC` | No planeada - Proceso / Facilidades | 1 Tanques llenos / capacidad limitada · 2 Capacidad tratamiento agua/crudo limitada · 3 Capacidad compresión/transferencia gas limitada · 4 Parada estación/bombeo afecta pozos | 4 |
| 19 | No Planeada | `NP_TRANSP` | No planeada - Transporte externo | 1 Oleoducto externo fuera de servicio · 2 Atentado/sabotaje oleoducto externo · 3 Restricción nominación/entrega · 4 Terminal/cliente no recibe | 4 |
| 20 | No Planeada | `NP_AUT` | No planeada - Autoridad / Restricción | 1 Restricción autoridad · 2 Restricción ambiental · 3 Suspensión/orden autoridad | 3 |

**Totales:** 8 claves Planeadas con 42 causas N2; 12 claves No Planeadas con 75 causas N2; **117 causas N2 en total**. (Conteo propio sobre la tabla.)

Observaciones textuales sobre la tabla (para que el catálogo de TRIM copie las cadenas **byte a byte**):
- **Duplicado exacto entre claves:** «Falla por falta de Mantenimiento» aparece en `NP_ENINT` (#11) y en `NP_INS` (#10). La pareja (N1, N2) sigue siendo única, pero N2 sola no lo es: la clave de catálogo debe ser la pareja.
- **Errores u oddities ortográficos en el original** (no corregir al codificar, porque la validación pide coincidencia exacta): «Perdida Línea de Vista (Flora)» sin tilde en «Pérdida»; «Falla Instrumento/sensor» con «I» mayúscula; mezcla de estilos de separador: «UPS / Fuente» (con espacios) en `P_MANT_ELE` frente a «Falla UPS/Fuente» (sin espacios) en `NP_ENINT`; «MCC / Switchgear» frente a «Falla MCC/Switchgear».
- **Solapamientos semánticos** que exigen regla de desempate: «Hurto» (`NP_OPUB`) vs «Hurto de instrumentación» (`NP_INS`); «Sabotaje / atentado» (`NP_OPUB`) vs «Atentado/sabotaje oleoducto externo» (`NP_TRANSP`); «Daño por tormenta eléctrica» (`NP_INS`) vs «Tormenta eléctrica / descargas» (`NP_CLIMA`); «Daño por humedad / inundación» (`NP_INS`) vs «Inundación / Desborde de río» (`NP_CLIMA`); «Falla Instrumento/sensor» (`NP_CTRL`) vs toda `NP_INS`; «Falla Sistema de Levantamiento Artificial» (`NP_SUP`) vs «Falla ESP/PCP/Gas Lift» (`NP_SUB`); «Falla por Flora» (`NP_ENINT`) vs «Perdida Línea de Vista (Flora)» (`NP_CTRL`).
- **Relevante para el piloto de TRIM:** las ESP caen en `NP_SUB` «Falla ESP» (no planeada) y en `P_MANT_MEC` «Sistema de Levantamiento Artificial» (planeada). **No existe** una causa N2 específica para bomba de reinyección / disposición de agua ni para bomba multifásica: lo más cercano es `NP_PROC` «Parada estación/bombeo afecta pozos» o «Tanques llenos / capacidad limitada» o «Capacidad tratamiento agua/crudo limitada» (y en planeadas, `P_MANT_MEC` «Bomba (superficie)»). Esto encaja con el ejemplo de Edinson: si la bomba que transfiere el agua al inyector se daña y rebosan los tanques, «hay que parar los pozos acuatosos… ahí se va a producir una diferida» (Transcript l.56).
- «Alto BSW / corte de agua» (`NP_SUB`) es la única causa ligada al corte de agua; en campos de 92–97 % de agua puede volverse un «cajón de sastre». Ver §6.

### 1.6 Regla de rechazo y alcance de la matriz (literal, C24 p.7)
> «El cumplimiento de este catálogo unificado de causas es mandatorio para la validación del archivo JSON. El ingreso de valores no definidos en la columna 'Código N1_KEY' o la incoherencia lógica entre la condición de planeación y la clave de Nivel 1 (por ejemplo, reportar P_WO bajo una parada catalogada como No Planeada) generará el rechazo automático e inmediato de la transmisión por parte del sistema receptor de la ANH.»
>
> «La matriz identifica y caracteriza los eventos que afectan la producción; **el operador determina, conforme a su metodología operacional y con soporte técnico verificable, cuáles de dichos eventos generan producción diferida y cuál es el volumen asociado.**»

Reglas de rechazo explícitas en la circular (todas):
1. `cau_niv1` fuera de los 20 N1_KEY → rechazo (C24 p.7). (Ojo: el Diccionario oficial lista para `cau_niv1` los **textos** N1 en mayúsculas, no las claves; ver §4.3 punto 3 y §6, A-3.)
2. Incoherencia entre `pla_no_plan` y el prefijo de `cau_niv1` (`P_` ↔ «PLANEADA», `NP_` ↔ «NO PLANEADA») → rechazo (C24 p.7).
3. `cau_niv2` «Debe coincidir exactamente con una de las causas cerradas autorizadas para la clave de Nivel 1 seleccionada» (C24 p.8). La circular no dice textualmente «rechazo» para este caso, pero el numeral 3 dice que el canal rechazará «reportes que no cumplan las reglas de validación estricta de paradas de pozo» (C24 p.8).
4. Campos no autorizados (`additionalProperties: false`) (C24 p.3).
5. Desde el 01-12-2026, estructuras V2.0 (C24 p.8).
6. Nodo `paradas_pozo` ausente (es obligatorio; si no hay paradas, arreglo vacío) (C24 p.7). Que su ausencia cause rechazo es inferencia del Schema estricto, **NO VERIFICADO** sin el Schema.

### 1.7 Numeral 2.4 — Nodo `paradas_pozo`: los 15 campos (literal, C24 p.7–8)
> «El nodo paradas_pozo es de carácter obligatorio dentro del segmento - datos para todos los operadores de campos del país, con independencia de si tienen o no paradas activas durante el día de reporte. En caso de no registrarse paradas de pozo en la fecha operacional, este nodo se enviará como un arreglo vacío.
> Cada parada individual reportada dentro del arreglo debe incluir los siguientes quince (15) campos obligatorios estructurados en el formato de tuplas híbridas [Valor, "Origen", "Unidad"]:»

| # | Campo | Descripción (literal) | Tipo | Valores permitidos / formato (literal) |
|---|---|---|---|---|
| 1 | `n_pozo` | «Nombre oficial del pozo reportado.» | tuplaString | Ejemplo: `["POZO-01", "M", "string"]` |
| 2 | `id_rec` | «Identificador único de pozo asignado por el sistema de información de la ANH.» | tuplaString | — |
| 3 | `uwi` | «Unique Well Identifier (Código único de completamiento a nivel nacional).» | tuplaString | — |
| 4 | `form` | «Formación geológica productora afectada por la parada.» | tuplaString | — |
| 5 | `campo` | «Nombre del campo de producción asociado al pozo.» | tuplaString | — |
| 6 | `h_ini_paro` | «Fecha y hora exacta de inicio de la parada del pozo.» | tuplaDateTime | «formato ISO 8601 (YYYY-MM-DDThh:mm:ssZ)» |
| 7 | `h_fin_paro` | «Fecha y hora exacta de finalización y arranque del pozo.» | tuplaDateTime | «formato ISO 8601 (YYYY-MM-DDThh:mm:ssZ)» |
| 8 | `cau_gral_paro` | «Categoría general o macro de la detención.» | tuplaString | **no definidos** |
| 9 | `resp_par` | «Departamento, especialidad o agente responsable del evento (por ejemplo, "Mantenimiento", "Operación", "Comunidad").» | tuplaString | **no cerrados** (solo ejemplos) |
| 10 | `choke_mod` | «Componente limitador de flujo del sistema» | tuplaString | «restringido estrictamente a los valores: "POZO", "PLANTA", "EXPORTACION" o "RESERVORIO"» |
| 11 | `dif_perd` | «Clasificación obligatoria del impacto físico» | tuplaString | «restringido a los valores: "DIFERIDA" o "PERDIDA"» |
| 12 | `pla_no_plan` | «Distintivo obligatorio de planeación» | tuplaString | «restringido estrictamente a los valores: "PLANEADA" o "NO PLANEADA"» |
| 13 | `cau_niv1` | «Clave codificada de Nivel 1. Debe corresponder exactamente con el catálogo de veinte códigos unívocos definidos (N1_KEY).» | tuplaString | Ejemplo: `["P_MANT_ELE", "M", "string"]` |
| 13b | (nota) | El Schema y el Diccionario contradicen esta fila: ver §4.3 | | |
| 14 | `cau_niv2` | «Descripción específica de Nivel 2. Debe coincidir exactamente con una de las causas cerradas autorizadas para la clave de Nivel 1 seleccionada.» | tuplaString | las 117 cadenas de la Tabla 1, según N1 |
| 15 | `desc_evid` | «Comentarios técnicos detallados, descripción abierta o evidencia operacional del evento reportado.» | tuplaString | texto libre |

Lo que **no** está en los 15 campos (importante para el producto): **no hay campo de volumen** (barriles diferidos o perdidos), ni de duración, ni de tasa/potencial, ni de fluido (crudo/gas/agua), ni de equipo/TAG, ni de identificador de evento. La duración se deduce de `h_fin_paro − h_ini_paro`; el volumen diferido/perdido **no viaja en `paradas_pozo`** según la circular (si viaja en otro nodo del IDP, depende del Schema — §4).

Inconsistencias de forma en el texto:
- El texto dice «dentro del segmento - datos» (con guion y espacios) y en 1.2 «segmento_datos». Se asume `segmento_datos`.
- El ejemplo usa la unidad `"string"` en la tercera posición de una tupla de texto: para campos de texto la «Unidad» es literalmente la cadena `"string"`. Para `tuplaDateTime` la circular no da ejemplo de unidad (**NO VERIFICADO**: ¿`"datetime"`? ¿`"ISO8601"`?).
- El formato dado `YYYY-MM-DDThh:mm:ssZ` termina en `Z` (UTC), mientras el numeral 4.2 exige hora legal colombiana COT/UTC-5 para los sellos de nombre de archivo y el corte del día es 23:59:59 (sin decir en qué zona). Ver §6.

### 1.8 Numeral 3 — Cronograma (literal, C24 p.8)
- «**Periodo de Pruebas Técnicas:** A partir de la fecha de publicación de la presente Circular, se habilita el ambiente de pruebas del canal de integración por API (API 1-C1). Las operadoras podrán remitir archivos de prueba JSON Versión 3.1 y certificar sus validaciones.»
- «**Plazo de Obligatoriedad y Transición:** A partir del 01 diciembre de 2026, el Formato Único Tipo U (JSON Versión 3.1) y la Matriz Estructurada de Paradas de Pozo serán de reporte obligatorio y vinculante para todos los operadores. El canal de recepción rechazará de forma definitiva estructuras anteriores (V2.0) o reportes que no cumplan las reglas de validación estricta de paradas de pozo.»

### 1.9 Numeral 4 — Nomenclatura, lago de datos y horarios (literal, C24 p.8–9)
Base: «De conformidad con lo dispuesto en los Artículos 10, 13, 14 y 15 de la Resolución 0651 de 2025 y sus resoluciones modificatorias».

- **4.1 IDP diario.** «Las compañías operadoras de la totalidad de los campos y contratos productores vigentes del país deberán disponer y remitir diariamente ante la ANH, **a más tardar a las 07:00 a.m.**, el archivo JSON correspondiente al consolidado oficial de producción y operaciones del **día calendario anterior con hora de corte a las 23:59:59 horas**. Esta obligación de reporte diario es de carácter general y aplica de manera directa para todos los campos productores, independientemente de su volumen de producción o de si se encuentran dentro del ámbito de aplicación o plazos graduales de implementación de telemetría previstos en la Resolución 0651 de 2025 y sus resoluciones modificatorias.»
  Nombre del archivo: «`NOMBREOPERADORA_CONTRATONUMERO_yyyymmddTHHMMSS.json`» («basada en la norma ISO 8601 (yyyymmdd)»).
- **4.2 Alta frecuencia (lago del operador).** «capturarán y registrarán las variables operativas en alta frecuencia a intervalos de muestreo de cada **diez (10) minutos** generando **144 archivos JSON diarios por contrato o bloque**.» «deberán almacenarse de forma **inmutable** en la Zona de Entrega - Punto C (Lago de Datos del Operador)… y la consulta remota por demanda por parte de la ANH.» Sello «en Hora Legal para el territorio de la República de Colombia (COT / UTC-5)», misma estructura `NOMBREOPERADORA_CONTRATONUMERO_yyyymmddTHHMMSS.json`. «La hora deberá estar sincronizada mediante los servidores de tiempo (NTP) que son gestionados por el Instituto Nacional de Metrología.»
- **4.3 Sintaxis.** (i) «Los campos NOMBREOPERADOR y CONTRATONUMERO deben escribirse en letras mayúsculas sostenidas, sin tildes, espacios en blanco ni caracteres especiales, únicamente letras de la A a la Z, números del 0 al 9 y guion bajo "_" como separador.» (ii) «yyyymmdd: Año (4 dígitos), Mes (2 dígitos), Día (2 dígitos). hhmmss: Hora (2 dígitos en formato 24h), Minutos (2 dígitos), Segundos (2 dígitos).» (iii) «Inmutabilidad: Todo archivo depositado en el Lago de Datos debe conservar su sello de tiempo original».
  Nota: 4.3 dice «NOMBREOPERADOR» y 4.1/4.2 «NOMBREOPERADORA» (variante textual sin efecto práctico). El patrón usa `HHMMSS` en mayúscula y 4.3 lo explica como `hhmmss`. Como `_` es a la vez separador de los tres bloques y carácter permitido dentro de NOMBREOPERADORA y CONTRATONUMERO, el nombre no se puede descomponer sin ambigüedad por `_`.

### 1.10 Cierre (C24 p.10)
«La Agencia Nacional de Hidrocarburos – ANH dispondrá mecanismos de acompañamiento y soporte técnico… a través de mesas de trabajo y soporte especializado en materia de interoperabilidad. De igual manera, publicará y mantendrá disponibles, en su portal institucional, las guías, instructivos y demás documentos técnicos que se requieran…»

## 2. Árbol (imagen) cotejado contra la Tabla 1

Imagen de 1600×1291 px, baja resolución para el texto fino; se leyó ampliada por recortes. Las diferencias de tildes que se marcan «(ilegible)» no se pueden asegurar a esta resolución.

### 2.1 Estructura del árbol
`Parada de Pozo` → **Responsable** (9) → **Componente del Sistema de Producción (Choke)** (Pozo · Planta · Exportación · Reservorio) → **DIFERIDA / PERDIDA** (Diferida · Perdida) → rombo **¿Planeada?** (Si → «Planeada»; No → «No Planeada») → N1 (8 verdes / 12 amarillos) → N2 (cajas azules / grises).

- **El orden coincide con los 6 pasos de 2.2** (Responsable → Choke → Diferida/Pérdida → Planeación → N1 → N2).
- El árbol **no muestra los códigos N1_KEY**, solo el N1_TEXT.
- El árbol **no conecta el Responsable con el N1** (el Responsable es una columna suelta: cualquier responsable puede ir con cualquier N1). La Tabla 1 tampoco lo hace.
- El árbol **no muestra** `cau_gral_paro`, ni nada de los otros campos del JSON.

### 2.2 Diferencias encontradas

| # | Dónde | Circular (Tabla 1 / texto) | Árbol | Tipo |
|---|---|---|---|---|
| 1 | Responsables | «Operador-Operación», «Operador-Mantenimiento», «Operador-Planeación/Logística», «Externo-Proveedor Energía», «Externo-Transportador», «Autoridad/Regulador» (sin espacios en los guiones/barras) | «Operador - Operación», «Operador - Mantenimiento», «Operador - Planeación/Logistica», «Externo - Proveedor Energía», «Externo - Transportador», «Autoridad / Regulador» (con espacios) | Formato. Además «Logistica» **sin tilde** en el árbol (legible en ampliación). |
| 2 | Choke | En el JSON: `"POZO"`, `"PLANTA"`, `"EXPORTACION"`, `"RESERVORIO"` (mayúsculas, sin tilde); en 2.1/2.2: «Pozo, Planta, Exportación o Reservorio» | «Pozo», «Planta», «Exportación», «Reservorio» | Mayúsculas/tilde: la etiqueta de pantalla ≠ valor del JSON. |
| 3 | Impacto | JSON `"DIFERIDA"`/`"PERDIDA"`; texto «Diferida de Producción»/«Pérdida de Producción» | «DIFERIDA / PERDIDA», «Diferida», «Perdida» | «Perdida» sin tilde en el árbol (igual que el JSON). |
| 4 | Planeación | JSON `"PLANEADA"`/`"NO PLANEADA"`; Tabla 1 «Planeada»/«No Planeada» (P mayúscula) | «Planeada» / «No Planeada»; N1_TEXT «No planeada - …» (p minúscula) | Mayúsculas (igual que N1_TEXT de la Tabla 1, que también usa «No planeada - …»). |
| 5 | N1_TEXT `NP_INS` | «No planeada - Instrumentación» | parece leer «No planeada - **Insatrumentación**» | **Error de tipeo en el árbol**, confirmado: la figura del Anexo de la C003 (de donde se derivó esta imagen) dice lo mismo y allí es legible (§3.3). |
| 6 | Orden N2 de `NP_CLIMA` | Tormenta eléctrica / descargas · Deslizamiento / derrumbe · Incendio (natural) · Otro evento natural · Inundación / Desborde de río · Fuertes lluvias / vías intransitables | **Inundación / Desborde de rio** · **Fuertes lluvias / vias intransitables** · Tormenta eléctrica / descargas · Deslizamiento / derrumbe · Incendio (natural) · Otro evento natural | **Orden distinto** (las dos últimas de la tabla van primero en el árbol). «rio» parece sin tilde en el árbol; «vias» (ilegible). |
| 7 | Orden N2 de `NP_OPUB` | Paro gremios / transportadores · Grupo armado / amenaza seguridad · Hurto · Sabotaje / atentado · Vandalismo / daño intencional · Orden público - Pendiente detalle · Bloqueo comunidad / ingreso a locación · Bloqueo indígena / ingreso a locación | **Bloqueo comunidad / ingreso a locación** · **Bloqueo indígena / ingreso a locación** · Paro gremios / transportadores · Grupo armado / amenaza seguridad · Hurto · Sabotaje / atentado · Vandalismo / daño intencional · Orden público - Pendiente detalle | **Orden distinto** (los dos bloqueos van primero en el árbol). Mismo conjunto. |
| 8 | `NP_CTRL` #4 | «Falla **I**nstrumento/sensor» | «Falla **i**nstrumento/sensor» | Mayúscula distinta. Si el validador compara de forma sensible a mayúsculas, solo una de las dos pasa. |
| 9 | `NP_CTRL` #5 | «Perdida Línea de Vista (Flora)» | «Perdida Línea de Vista (Flora)» | Igual en ambos; error ortográfico compartido («Pérdida»). |
| 10 | Resto de N2 | — | — | **Mismo conjunto y mismo orden** en las otras 18 claves (verificado caja por caja: P_MANT_ELE 9, P_MANT_MEC 7, P_MANT_INS 6, P_MANT_INT 6, P_WO 4, P_PRUEBAS 4, P_PES 3, P_OP 3, NP_ENEXT 4, NP_ENINT 13, NP_INS 11, NP_CTRL 6, NP_SUB 6, NP_SUP 6, NP_INTEG 4, NP_PROC 4, NP_TRANSP 4, NP_AUT 3). |
| 11 | Conexiones N1→N2 | — | Las flechas de cada N1 llegan al bloque N2 que le corresponde en la Tabla 1. En «No Planeada» las líneas de CTRL, SUB, SUP, INTEG, PROC, TRANSP y AUT bajan, rodean el diagrama y suben a la columna derecha; la asignación se dedujo por el anidamiento de los lazos (el lazo más interno va a la caja más alta). Coherente con la tabla, pero es lectura visual. | Sin diferencia de contenido. |
| 12 | Responsables ↔ texto de `resp_par` | Paso 1: 9 opciones cerradas; campo `resp_par`: ejemplos «"Mantenimiento", "Operación", "Comunidad"» | 9 opciones con prefijo «Operador - …» | Los ejemplos del JSON **no coinciden** con ninguna de las 9 etiquetas del Paso 1 ni del árbol (p. ej. «Mantenimiento» vs «Operador-Mantenimiento»). Ver §6. |

Conclusión del cotejo: el árbol y la Tabla 1 tienen **el mismo contenido** (20 N1, 117 N2, 9 responsables, 4 chokes), con **dos reordenamientos** (`NP_CLIMA`, `NP_OPUB`), **una diferencia de mayúscula** en un N2 (`NP_CTRL` «Falla Instrumento/sensor»), diferencias de tildes/espacios en etiquetas y un probable error de tipeo («Insatrumentación»). **La fuente para codificar es la Tabla 1 de la circular** (es la que valida el JSON); el árbol sirve como guía visual del flujo.

## 3. Cadena normativa

### 3.0 Mapa (de mayor a menor jerarquía, con fecha)
| Norma | Fecha | Qué toca de lo nuestro | Fuente |
|---|---|---|---|
| Ley 2056 de 2020 (SGR) | 2020 | Arts. 16–17: regalías sobre volúmenes «medidos y reportados por el explotador»; fiscalización incluye «determinación y verificación efectiva de los volúmenes de producción» (citados en Res. 0651, considerandos) | Res. 0651 p.1–3 |
| Res. MME 40236/2022 (medición) | 07-07-2022 | Producción fiscal, factor de campo = fiscalizado ÷ potencial, asignación por pozo, pérdidas de procesamiento, bitácora diaria | https://gestornormativo.creg.gov.co/gestor/entorno/docs/resolucion_minminas_40236_2022.htm |
| Res. MME 40537/2024 (E&P) | 11-12-2024 | Art. 35 pruebas de pozo (mín. 1/mes, ≥ 6 h); art. 51 IDP a las 7:00; art. 59 incidentes en 24 h | https://gestornormativo.creg.gov.co/gestor/entorno/docs/resolucion_minminas_40537_2024.htm |
| Res. ANH 0651/2025 (telemetría + JSON) | 27-08-2025 (D.O. 53.226, 28-08-2025) | Art. 14–15 JSON a las 7:00 con corte 23:59:59; art. 15.1 par. 2: 18 causas de paro; Anexo 4 Cuadros 11 (potencial) y 12 (paradas) | https://www.anh.gov.co/documents/30096/RESOLUCION_0651_27-08-2025_-_SE_ESTABLECEN_DIRECTRICES_USO_DE_TECNOLOGIAS.pdf · compilada: https://gestornormativo.creg.gov.co/gestor/entorno/docs/resolucion_anh_0651_2025.htm |
| Res. ANH 0708/2025 | 16-09-2025 | Modifica art. 5 num. 2 y 4 (integridad metrológica, transmisión). Nada sobre paradas | Notas de vigencia de la compilación; fecha según considerandos de Res. 0592/2026 |
| Circular ANH 0024/**2025** | 17-09-2025 | Lineamientos de la Res. 0651 (art. 4, 8.2, 15). Nada sobre paradas | https://anh.gov.co/documents/30280/CIRCULAR_N_0024_DEL_17-09-2025.pdf (copia en `fuentes/`) |
| Res. ANH 0885/2025 | 29-10-2025 | Modifica art. 6 (plan de implementación). Nada sobre paradas | Ídem |
| Circular ANH 0003/2026 + Anexo técnico de interoperabilidad IDP | 02-02-2026 | JSON v2.0, Tipo A/B, **primera versión del árbol de paradas**, definiciones, nodo `paradas_pozo` v2.0 | https://www.anh.gov.co/es/normatividad2/normatividad/circular-anh-n-003-de-2026/ · PDF: https://www.anh.gov.co/documents/33701/Circular_ANH_003_de_2026.pdf · Anexo: https://www.anh.gov.co/documents/33702/Anexo_t%C3%A9cnico_de_interoperabilidad_IDP.pdf |
| Res. ANH 0052/2026 | 02-02-2026 (D.O. 53.388, 04-02-2026) | Modifica arts. 2, 3, 4; **adiciona art. 15.2** (rechazo de ingesta y corrección en 1 hora) | https://www.anh.gov.co/documents/33707/Res._ANH_0052_DE_2026.pdf · https://gestornormativo.creg.gov.co/gestor/entorno/docs/resolucion_anh_0052_2026.htm |
| Res. ANH 0101/2026 | 05-03-2026 (D.O. 53.422, 09-03-2026) | Nuevo art. 4 (plazos por umbral); par. 8: JSON Tipo B obligatorio para < 3000 BOPD «sin exceder el 30 de septiembre 2026» | https://sidn.ramajudicial.gov.co/SIDN/NORMATIVA/TEXTOS_COMPLETOS/8_RESOLUCIONES/RESOLUCIONES%202026/ANH%20Resolucion%200101%20de%202026.pdf |
| **Circular ANH 0024/2026** | 09-09-2026 | JSON v3.1 Tipo U, matriz de 20 N1 / 117 N2, `paradas_pozo` de 15 campos, balances; obligatoria 01-12-2026 | https://www.anh.gov.co/documents/34900/Circular_ANH_024_de_2026.pdf |
| **Res. ANH 0592/2026** | 25-09-2026 | **Suspende el art. 4 de la Res. 0651** desde el 30-09-2026 por 6 meses (hasta el 29-03-2027) | https://www.anh.gov.co/documents/34954/Res._ANH_592_de_2026.pdf |

Las modificatorias 0708 y 0885 no se pudieron leer en texto propio (el gestor normativo devolvió 404 para su ficha); su alcance se toma de las notas de vigencia de la Res. 0651 compilada y de los considerandos de la Res. 0592. **Ninguna de las cinco modificatorias toca paradas, diferidas, pérdidas ni potencial**: tocan ámbito, definiciones generales, plazos, plan de implementación, metrología y el art. 15.2.

### 3.1 Res. ANH 0651/2025 — lo que dice de paradas, potencial y JSON
- **Art. 3 (def., mod. Res. 0052/2026):** «Datos en baja frecuencia: Información recopilada de forma manual con periodicidad variable… incluyendo… **paradas de pozo**, registrados en plataformas de gestión operativa o en plantillas de operación.» «IDP en línea: Informe Diario de Producción en el que se reportan los resultados de las operaciones del día anterior de manera automatizada».
- **Art. 8.1:** «Los datos para el cálculo del IDP en línea a nivel dinámico para pozos, se visualizan en la Figura 3, para el cálculo de la producción, **pruebas de potencial y paradas de pozo** de forma automatizada y manual.»
- **Art. 12:** el registro de baja frecuencia debe facilitar «la correlación de eventos… para el caso de tanques de almacenamiento, pruebas y paradas de pozo».
- **Art. 14:** «El operador debe entregar diariamente y antes de las 07:00 a.m. toda la información… contemplando los eventos, tipos de evento, la hora de inicio, la hora de terminación, duración. La información o los datos para el cálculo del IDP se deben entregar **sin alteraciones o modificaciones en el contenido original**.» Nombre de archivo original: `NOMBREOPERADOR_CONTRATONUMERO_FECHA(dd-mmm-yyyy).json` (C24 lo cambia a `…_yyyymmddTHHMMSS.json`).
- **Art. 15:** «A más tardar a las 7:00 am… con corte a las 23:59:59». Modificación del IDP dentro de 24 h de la solicitud. «Sin excepción, el consolidado de volúmenes de los IDP en línea, deberá ser consistente con la información reportada en los informes de producción mensual.»
- **Art. 15.1, parágrafo 2 (literal):** «Para los eventos que se generen por parada de pozos, el operador debe reportar la hora de inicio, hora final, tipo o motivo de parada en donde se especifique si esta es programada o no, entre otros tipos de eventos que se relacionan en el Anexo 4. Los posibles eventos son: **abandono, alto S&W, eléctrico, emergencia sanitaria, ambiental, facilidades, ingeniería, bajo potencial, mantenimiento, mecánico, precio del crudo, orden público, cerrado temporalmente, bombeo/transporte, pruebas suspendidas, climático, toma de registros/PBU, servicio a pozo.**» (18 causas).
- **Art. 15.1, parágrafo 4:** la ANH puede cambiar la estructura del JSON por circular, con un plazo de entrega «no… mayor a un plazo de diez (10) días calendario». (Nota: C24 dio casi 3 meses: 09-09 → 01-12.)
- **Art. 15.2 (adicionado por Res. 0052/2026):** rechazo de ingesta = «no aceptación del archivo… por incumplimiento del esquema, tipos de dato, formatos, integridad, campos obligatorios u otras reglas automáticas de validación»; inconsistencia de contenido = «valores erróneos, incompletos o incoherentes con la operación reportada». **Plazo para corregir y retransmitir: una (1) hora** desde la notificación (par. 1) o desde que se identifica la inconsistencia (par. 2). «Mientras no se subsane, el reporte se considerará no recibido». Par. 3: toda retransmisión debe llevar «(i) identificador del envío, (ii) fecha y hora de generación, (iii) versión del archivo o número de corrección, y (iv) motivo de la corrección».
- **Anexo 4, Cuadro 11 (potencial):** «Horas de prueba: reportar la prueba extrapolada a 24h»; petróleo, gas y agua «medido durante la prueba extrapolado a 24h»; choque «Diámetro de la obstrucción en 1/64 de pulgada». El pie del cuadro cita «(Artículo 12. Resolución 40236)», pero el art. 12 de la 40236 es «Cifras significativas y conversión a SI»: **cita aparentemente errada** (la obligación de probar pozos está en el art. 35 de la Res. 40537).
- **Anexo 4, Cuadro 12 (paradas):** campos Nombre del Recurso, ID Recurso, Formación, **Paro programado** («Establece si el paro corresponde a una programación o fue un evento sobreviniente»), **Inicio de paro / Final de paro** en «hh:mm» «En formato de 24 horas. Desde las 00:00 hasta las 24:00», **Causa de paro** = una de las 18 de arriba, Comentarios.
  → El rango «00:00 a 24:00» del formato original sugiere que **una parada se reportaba recortada al día operacional**. El formato v3.1 (ISO 8601 DateTime) ya permite fechas de otros días; la regla para cruces de medianoche no está escrita (§6, A-5).
- **Art. 19 par. 1:** fallas del sistema de telemetría se reportan a soporte.idp@anh.gov.co en 12 h.
- **Art. 21:** sanciones por el art. 67 del Código de Petróleos (mod. art. 21 Ley 10 de 1961).

### 3.2 Res. 0592/2026 — suspensión (posterior a la C24)
«Suspender, a partir del 30 de septiembre de 2026 y por el término de seis (6) meses, la aplicación del artículo 4 de la Resolución No. 0651…» (art. 1). La suspensión «comprenderá exclusivamente los efectos jurídicos asociados a los plazos y obligaciones cuya exigibilidad se encuentre directamente sustentada en el artículo 4» (par.). «no implica la suspensión… de las demás disposiciones» (art. 2). Vigencia «hasta el 29 de marzo de 2027» (art. 3).
**Lectura:** lo suspendido son los plazos de **telemetría** por umbral. La C24 se apoya en los arts. 10, 13, 14 y 15 (no en el 4) y dice que el IDP diario aplica «independientemente… de los plazos graduales de implementación de telemetría» (C24 p.8–9). Por eso, **en principio la fecha del 01-12-2026 de la C24 sigue en pie**. Pero el par. 8 del art. 4 (Res. 0101) es el que fijó la obligación del JSON Tipo B para campos pequeños «sin exceder el 30 de septiembre 2026», y quedó suspendido justo desde esa fecha. Es una zona gris → §6, A-16.

### 3.3 Circular 003/2026 y su Anexo técnico (JSON v2.0) — el «árbol anterior»
La C003 (8 págs., 02-02-2026) **no trae el árbol en su cuerpo**; el árbol, las definiciones y el nodo `paradas_pozo` v2.0 están en el **Anexo técnico de interoperabilidad IDP** (38 págs.), que la C003 declara «parte integral» (C003 §4). Datos de la C003:
- **Tipo A** = campos dentro del art. 2 de la Res. 0651 (telemetría + datos manuales complementarios). **Tipo B** = campos fuera del art. 2, información «no telemetrizada y registrada de forma manual». «el archivo JSON corresponde a un único formato estándar y la diferenciación entre Tipo A y Tipo B obedece a la forma de obtención y registro de ciertos datos» (C003 §1).
- Canales: API 1 – C1 (A y B); E1 (registro manual; el JSON Tipo B reemplaza la plantilla Excel) y E2 (automatizado) solo para Tipo B (C003 §2).
- Pruebas hasta el **31-05-2026** (C003 §3.4).
- Proyectó: Edinson Jair Maestre Delgado (primero de la lista).

**Definiciones del Anexo (§1.2) frente a C24 §2.1:** Parada de Pozo, Diferida y Pérdida son **idénticas palabra por palabra** (incluida la frase «en el marco del presente anexo», que la C24 heredó — eso explica la nota de §1.3). Cambian:
- *Parada Planeada*: Anexo «limitación **operativa** de producción»; C24 «limitación de producción».
- *Parada No Planeada*: Anexo «fallas de equipos, incidentes operativos, eventos externos, restricciones o situaciones fuera del control operativo inmediato del operador»; C24 «fallas **súbitas** de equipos, incidentes operativos, **sabotajes, vandalismo, factores climáticos severos** o restricciones ajenas al control directo del operador».
- *Choke*: Anexo «Punto funcional del sistema de producción donde se materializa la restricción… pudiendo corresponder al pozo, a las facilidades de superficie, al sistema de exportación o transporte, o al reservorio»; C24 añade «origina o materializa», «estrictamente», **la cita a SPE-36848** y la distinción con la válvula choke.

**Lo que el Anexo trae y la C24 no** (útil como interpretación auténtica, porque lo proyectó el mismo equipo):
- §1.4.1 explica cada **responsable** con ejemplos: «Operador – Operación: decisiones operativas, maniobras de campo, limitación operativa de producción»; «Operador – Mantenimiento: ejecución **o falla** en actividades de mantenimiento eléctrico, mecánico o de instrumentación»; «Operador – Planeación / Logística: indisponibilidad de equipos, retrasos en servicios programados»; «Externo – Proveedor de energía: fallas en suministro eléctrico, cortes programados o no programados»; «Externo – Transportador: indisponibilidad de oleoductos, gasoductos o facilidades de evacuación»; «Comunidad: bloqueos de acceso, restricciones de ingreso a instalaciones»; «Autoridad / Regulador: suspensiones, órdenes administrativas, restricciones ambientales»; «Tercero: daños causados por contratistas o actores externos»; «Fuerza mayor (Clima / Natural): inundaciones, tormentas eléctricas, deslizamientos».
- §1.4.2 explica cada **choke** con ejemplos: «Pozo: fallas de levantamiento artificial, arenamiento, integridad del pozo»; «Planta / Facilidades: fallas en separadores, tanques, sistemas de tratamiento»; «Exportación / Transporte: indisponibilidad de líneas, restricciones de entrega, **tanques llenos**»; «Reservorio: conificación de agua, declinación abrupta, problemas de conectividad».
- §1.4.3 ejemplos de impacto: «Diferida: parada por mantenimiento eléctrico de 12 horas cuya producción puede recuperarse»; «Pérdida: derrame de crudo o quema de gas ya producido que no puede recuperarse».
- §1.4.5 describe las familias N1 No Planeadas, con **«Instrumentación / Control / Comunicaciones» como una sola familia** (11 familias en el texto), aunque su figura ya las separa en dos cajas.
- §1.3 principios: el 5.º se llama **«Auditabilidad»** (C24 lo llama «Verificabilidad»); «Neutralidad técnica: la clasificación… no constituye, por sí misma, una asignación de responsabilidad legal, contractual o sancionatoria».
- §1.6: «En caso de duda en la interpretación de este anexo, prevalecerá el criterio técnico que garantice mayor trazabilidad y consistencia».

**El árbol del Anexo (figura en p.11 del PDF) — diferencia de fondo con el de la C24:**
- En la C003 el paso 3 es un **rombo «¿Diferida?»**: Sí → *Diferida* → rombo «¿Planeada?» → Planeada / No Planeada. **No → *Pérdida* → va directo a *No Planeada*.** Es decir, en el árbol de la C003 **una pérdida siempre es No Planeada**.
- En la C24 (imagen de Edinson) el paso 3 es una caja «DIFERIDA / PERDIDA» y **ambas** pasan por «¿Planeada?». Una pérdida **puede ser Planeada** (p. ej., un venteo intencional o una quema programada).
- Las N2 de la figura C003 (p.10–11 del Anexo) difieren de la Tabla 1 de la C24 en:
  - `P_MANT_ELE`: C003 tiene 7 (sin «VSD» ni «Red interna BT/MT/AT»); C24 tiene 9.
  - `P_MANT_MEC`: C003 tiene 6 (sin «Sistema de Levantamiento Artificial»); C24 tiene 7.
  - `P_PRUEBAS`: C003 «Prueba de pozo (potencial/PLT)»; C24 «Prueba de pozo (presión transiente, producción, potencial, PLT, ILT, otros)».
  - `NP_ENINT`: C003 tiene 12 (sin «Falla VSD»); C24 tiene 13.
  - `NP_SUP`: C003 tiene 5 (sin «Falla Sistema de Levantamiento Artificial»); C24 tiene 6.
  - Orden de `NP_CLIMA` y `NP_OPUB`: el de la C003 = el de la imagen de la C24 (las diferencias de orden de §2.2 vienen de ahí: la imagen se derivó del árbol de la C003; la Tabla 1 se reordenó).
  - El error «No planeada - **Insatrumentación**» **ya estaba** en la figura de la C003 (legible con claridad en el PDF del Anexo), lo que confirma la lectura de §2.2 fila 5.
- La C003 **no tenía códigos N1_KEY** ni regla de rechazo por incoherencia; la C24 los introduce.

**Nodo `paradas_pozo` v2.0 (Anexo, p.20 y p.31)** — estaba en dos segmentos, `segmento_datos_alta_frecuencia` y `segmento_datos_baja_frecuencia`, con objetos `{variable, tipo, unidad, observacion, valor}`:
`recurso` (pozo) · `id_recurso` · `formacion` · `paro_programado` («los valores para este campo son: Programada - No programada») · `mediciones[]`: `inicio_paro` (`hora_inicio_paro`, ISO 8601 `YYYY-MM-DDThh:mm:ss.sssZ`), `final_paro`, `diferida_perdida`, `choke`, **`causa_parada`** («Motivo principal de la parada (p. ej., Mantenimiento, Operativa, Falla mecánica)»), `responsable_parada` («Área o persona responsable de la parada (Operaciones, Mantenimiento, Externo, etc.)»), `causa_nivel_1` («Categoría detallada de la causa»), `causa_nivel_2` («Subcategoría específica de la causa»), `descripcion_evidencia`; en baja frecuencia además `comentario`.

### 3.4 Los «pequeños cambios» de la Circular 003 a la 024 (respuesta a lo que dijo Edinson, Transcript l.50)
| # | Tema | C003 + Anexo (feb-2026) | C24 (sep-2026) |
|---|---|---|---|
| 1 | Versión JSON | v2.0 (`metadatos.version` del ejemplo dice «2.1») | v3.1 (Schema titulado «3.5») |
| 2 | Tipos de archivo | Tipo A (telemetría) y Tipo B (manual) | **Formato Único Tipo U** |
| 3 | Segmentos | `segmento_datos_alta_frecuencia` + `segmento_datos_baja_frecuencia` | un solo `segmento_datos` |
| 4 | Forma del dato | objeto `{variable, tipo:"automatizada"/"manual", unidad, valor}` | tupla `[Valor, "A"/"M"/"C", Unidad]` |
| 5 | Pérdida y planeación | árbol: Pérdida → siempre No Planeada | Pérdida puede ser Planeada o No Planeada |
| 6 | Códigos N1 | solo textos | 20 claves `N1_KEY` + regla de rechazo por incoherencia P_/NP_ |
| 7 | Catálogo N2 | figura, 112 causas (conteo propio: 117 menos las 5 añadidas; las demás cajas se cotejaron a ojo sobre la figura) | Tabla 1 cerrada, 117 causas (+VSD, +Red interna, +SLA ×2, +Falla VSD; texto nuevo en Prueba de pozo) |
| 8 | Instrumentación/Control | una familia en el texto §1.4.5 (dos cajas en la figura) | dos claves: `NP_INS` y `NP_CTRL` |
| 9 | Campos de la parada | 12 (pozo, id, formación, paro_programado, inicio, fin, diferida_perdida, choke, causa_parada, responsable, nivel 1, nivel 2, evidencia [+ comentario]) | 15 (añade **`uwi`** y **`campo`**; renombra `causa_parada` → `cau_gral_paro`; elimina `comentario`) |
| 10 | Valores de planeación | «Programada - No programada» | «PLANEADA» / «NO PLANEADA» |
| 11 | Definición de choke | genérica | cita SPE-36848; «estrictamente» 4 valores; distinta de la válvula |
| 12 | Definición de No Planeada | «fallas de equipos… eventos externos» | «fallas súbitas… sabotajes, vandalismo, factores climáticos severos» |
| 13 | Principio 5 | Auditabilidad | Verificabilidad |
| 14 | Balances | no existían | `balance_fluido_crudo/agua/gas/blancos` obligatorios |
| 15 | Nombre de archivo | `…_FECHA(dd-mmm-yyyy).json` (Res. 0651 art. 14) | `…_yyyymmddTHHMMSS.json` |
| 16 | Alta frecuencia | (Res. 0651) | 144 archivos/día cada 10 min, inmutables, COT, NTP del INM |
| 17 | Obligatoriedad | pruebas hasta 31-05-2026 | obligatorio 01-12-2026; rechazo definitivo de V2.0 |

Lo que **no** cambió: las definiciones de Parada, Diferida (incluida la fórmula de 24 h con la última prueba de potencial reportada a la ANH) y Pérdida (incluido el posible gravamen); los 9 responsables; los 4 chokes; el orden de los 6 pasos.

### 3.5 Res. MME 40236/2022 — potencial, asignación, pérdidas
- **Art. 3, def.:** «Balance Volumétrico. Operación que se realiza para determinar los valores y controlar las entradas, salidas, cambios de inventario, consumo, **pérdidas**, entre otros aspectos, de un producto en una determinada Facilidad». «Medición por Asignación. Corresponde a la medición continua de los fluidos en Boca de Pozo…».
- **Art. 20, parágrafo:** «Las **pérdidas de procesamiento** son inherentes a la operación del Campo y se determinan mediante balances volumétricos o másicos, fórmulas de evaporación de hidrocarburos livianos de los tanques de almacenamiento, u otras herramientas de buenas prácticas.»
- **Art. 21:** «El factor de Campo corresponde a la razón entre el valor de **producción fiscalizada** y el valor teórico o estimado (**potencial**) de producción… Este factor será calculado **diariamente** por el Operador… tomará como base la información reportada y validada en el informe diario de producción (IDP)».
- **Art. 22:** el volumen por pozo se determina «mediante el empleo del "factor de Campo"» (API MPMS 20.1 y 20.5).
- **Art. 24:** prorrata = medición de una fracción de la producción «durante las pruebas de pozos» (API MPMS 20.5).
- **Art. 31:** «bitácora digital y/o física de control de ejecución y seguimiento a las actividades diarias…» (base de los datos de baja frecuencia, según Res. 0651 art. 12).
- **Art. 37:** rangos de aceptación del factor de campo en el Anexo 2, Tabla 10. Los valores de la tabla **NO VERIFICADOS** en esta pasada (la tabla está en el anexo, no en el texto HTML).
- **No hay** definición de «diferida», ni de «parada», ni de gravamen o regalías sobre pérdidas en la 40236.

### 3.6 Res. MME 40537/2024 — pruebas, IDP, eventos
- **Art. 35 (literal):** «Todo pozo en producción debe ser probado… **por lo menos una vez al mes, con una duración mínima de seis horas**, siempre y cuando sus resultados sean representativos del comportamiento de afluencia del pozo, de acuerdo con la medición a prorrata o asignación… **o siempre que cambien las condiciones operacionales**, para efectos de detectar variaciones en la producción. El cambio en la frecuencia y duración de las pruebas debe ser previamente aprobado por el Ente de Fiscalización.» Se reportan mensualmente (art. 51).
- **Art. 51 num. 1 (literal):** «Informe diario de producción: Diariamente y a más tardar a las 7:00 am, se deberá remitir un Informe Diario de Producción (IDP), con los resultados de las operaciones del día anterior, la medición de calidad y cantidad de los fluidos producidos. En caso de requerirse alguna modificación en el informe diario de producción, esta deberá ser realizada el mismo día de la solicitud.» Num. 2: informe mensual en los primeros 7 días hábiles; par. 1 habla de «volúmenes de producción **gravables** de crudo y gas y/o volúmenes **penalizados** de gas».
- **Art. 59:** notificar en 24 h por correo los eventos con «lesiones o fatalidades, **derrames de hidrocarburos**, pérdidas de control de pozo, incendios, explosiones y/o colisiones». (Un derrame = Pérdida según C24 y además incidente del art. 59.)
- **No hay** en la 40537 una definición de diferida, ni un «informe de eventos» de paradas, ni una regla de gravamen sobre pérdidas. Lo único sobre gravamen de pérdidas es la frase de la C24/Anexo: «podrá estar sujeta a gravamen… de acuerdo con la responsabilidad de la compañía operadora y la naturaleza del evento». **NO VERIFICADO** qué norma de regalías la desarrolla (no se encontró en Ley 2056, 40236 ni 40537; habría que revisar el régimen de liquidación de regalías de la ANH, fuera del alcance de esta pasada).

### 3.7 Síntesis: qué dice cada norma de cada concepto
| Concepto | Res. 40236 | Res. 40537 | Res. 0651 | C003 + Anexo | C24 |
|---|---|---|---|---|---|
| Parada | — | — | art. 15.1 par. 2: inicio, fin, programada o no, 18 causas | Definición + árbol | Definición + árbol + 15 campos + matriz |
| Diferida | — | — | (causa «bajo potencial») | Definición = potencial (última prueba reportada) − real, 24 h | Igual |
| Pérdida | «pérdidas de procesamiento» por balance (art. 20 par.) | derrames: incidente 24 h (art. 59) | — | Definición + «podrá estar sujeta a gravamen» | Igual + nodos de balance con `perdidas`/`quemado` |
| Potencial | Factor de campo = fiscalizado ÷ potencial, diario (art. 21) | Prueba ≥ 1/mes, ≥ 6 h (art. 35) | Pruebas extrapoladas a 24 h (Cuadro 11) | «última prueba de potencial reportada a la ANH» | Igual + `pruebas_potenciales` 24 campos |
| Producción por pozo | Asignación por factor de campo (art. 22) | — | — | `produccion_por_pozo` | `produccion_por_pozo` = «Asignación diaria» |

## 4. Plantilla JSON v3.1, JSON Schema y Diccionario de Datos

### 4.0 Existen y están descargados
La ANH **sí publicó** los tres archivos que anuncia C24 §1.3, como adjuntos de la página oficial de la circular: https://www.anh.gov.co/es/normatividad2/normatividad/circular-anh-n-024-de-2026/ (consultada 19-oct-2026). Copias en `docs/plan-circular-24/investigacion/fuentes/`:

| Archivo (nombre oficial) | URL | SHA-256 | Nota |
|---|---|---|---|
| `20260731_Esquema_JSON_V3.1_ANH.json` | https://www.anh.gov.co/documents/34902/20260731_Esquema_JSON_V3.1_ANH.json | `1689af59…0141` | JSON Schema **Draft-07** (`"$schema": "http://json-schema.org/draft-07/schema#"`). Codificado en **UTF-16 LE** (no UTF-8): hay que convertirlo antes de usarlo en un validador. Su `title` dice **«Esquema JSON IDP ANH - Versión 3.5 Estricta»**, aunque el archivo se llama V3.1. |
| `20260731_JSON_IDP_TipoUnico_V3.1_AHN.json` | https://www.anh.gov.co/documents/34903/20260731_JSON_IDP_TipoUnico_V3.1_AHN.json | `2cf37fe2…86f3` | Plantilla de ejemplo. `metadatos_archivo.version = "3.1"`, `fecha_publicacion = "2026-07-31"`. (Nótese «AHN» en el nombre.) |
| `20260820_Dicionario_de_Datos_JSON_V3.2_ANH.xlsx` | https://www.anh.gov.co/documents/34901/20260820_Dicionario_de_Datos_JSON_V3.2_ANH.xlsx | `7c96a61c…fa44` | Una hoja `JSONV3`; celda A1 = «Diccionario de Datos Unificado - JSON IDP V3.0»; columnas: Bloque_JSON · Campo_JSON · Descripción_Detallada · Tipo_Dato · Origen · Unidad_Dominio · LISTAS DE VALORES. El nombre del archivo dice **V3.2** y lleva fecha 20-08-2026. |
| Circular 024 PDF | https://www.anh.gov.co/documents/34900/Circular_ANH_024_de_2026.pdf | `cc08f6de…6a70` | **Idéntico byte a byte** al PDF que trajo Edinson (`docs/reuniones/…/circular-anh-024-2026.pdf`). |

**Versionado inconsistente en los artefactos oficiales:** circular = «Versión 3.1»; plantilla = `"3.1"`; schema = título «Versión 3.5 Estricta»; diccionario = archivo «V3.2», título «V3.0», y su fila `version` dice `3.1`. Hay que preguntar a la ANH cuál es la vigente (ver §6, A-17).

### 4.1 Estructura raíz (Schema)
```
ROOT (object) required: metadatos_archivo, segmento_datos_operador, segmento_datos   ← sin additionalProperties en la raíz
├─ metadatos_archivo (addP=false; required: titulo, version, fecha_publicacion, tipo_json, fuente_de_entrega, tipo_envio)
│    tipo_json: enum ["U"] · fuente_de_entrega: array de enum ["TELEMETRÍA","OFICIAL","POR DEMANDA"]
│    tipo_envio: array de enum ["PROGRAMADO","EXTEMPORANEO","CORRECCION"]
├─ segmento_datos_operador (addP=false; sin required)
│    datos_operador_contrato[]: operador, f_operacional (tuplaDate), f_carga (tuplaDateTime), contrato, usuario
│    datos_facilidad[]: n_fac, tip_fac, edo_fac, campo, prod, pmo (tuplaBoolean), id_mun, mun, id_dep, dep
└─ segmento_datos (addP=false; **sin required**)
     tanques[22] · movimientos_tanque[36] · medidores_liquidos[12] · medidor_gas[10]
     pruebas_potenciales[24] · paradas_pozo[15] · inyeccion_por_pozo[9] · produccion_por_pozo[12]
     cromatografia[47] · balance_fluido_crudo[14] · balance_fluido_agua[12]
     balance_fluido_blancos[7] · balance_fluido_gas[14]
```
(entre corchetes: número de campos obligatorios de cada ítem; todos los ítems tienen `additionalProperties: false`).

### 4.2 Las tuplas (definitions del Schema)
| Tipo | Posición 0 (Valor) | Posición 1 (Origen) | Posición 2 (Unidad) |
|---|---|---|---|
| `tuplaString` | string | enum `["A","M","C","Fijo",""]` | string libre |
| `tuplaNumber` | number | enum `["A","M","C",""]` | string libre |
| `tuplaInteger` | integer | enum `["A","M","C",""]` | string libre |
| `tuplaBoolean` | boolean | enum `["A","M","C",""]` | string libre |
| `tuplaDate` | string `format: date` | enum `["A","M","C",""]` | string libre |
| `tuplaDateTime` | string `format: date-time` | enum `["A","M","C",""]` | string libre |
| `tuplaTime` | string `pattern ^([01]\d|2[0-3]):?([0-5]\d)$` | enum `["A","M","C",""]` | string libre |

Todas con `minItems: 3, maxItems: 3` (forma de *tuple validation* de Draft-07: `items` como arreglo).

Diferencias con la circular: C24 §1.2 dice que el Origen es «"A" (Automático), "M" (Manual) o "C" (Calculado)» y que declararlo es «obligatorio»; el Schema **también acepta `""` (vacío)** y, en `tuplaString`, **`"Fijo"`**. La Unidad no está restringida por el Schema (la plantilla usa `"string"`, `"ISO 8601 DateTime"`, `"bbl"`, `"kscfd"`, `"mmscfd"`, `"hours (float)"`, `"percentage (%)"`, etc.). `format: date-time` en Draft-07 solo valida si el validador activa formatos (en AJV es opcional): **NO VERIFICADO** cómo lo configura la ANH.

### 4.3 `paradas_pozo` en el Schema, la plantilla y el Diccionario
Orden real de `required` en el Schema (≠ orden de la circular): `n_pozo, id_rec, uwi, form, campo, pla_no_plan, h_ini_paro, h_fin_paro, cau_gral_paro, dif_perd, resp_par, choke_mod, cau_niv1, cau_niv2, desc_evid`. Todos `tuplaString` salvo `h_ini_paro`/`h_fin_paro` (`tuplaDateTime`).

| Campo | Schema | Plantilla (ejemplo) | Diccionario: descripción · Origen · lista de valores |
|---|---|---|---|
| n_pozo | tuplaString | `["","A","string"]` | «Nombre del pozo analizado.» · A |
| id_rec | tuplaString | `["","A","string"]` | «Identificador único del pozo analizado.» · A |
| uwi | tuplaString | `["","A","string"]` | «Unique Well Identifier (Código único global de completamiento).» · A |
| form | tuplaString | `["","A","string"]` | «Formación geológica testeada.» · A (descripción copiada de pruebas) |
| campo | tuplaString | `["","A","string"]` | «Campo al que pertenece el pozo.» · A |
| pla_no_plan | tuplaString | `["","M","string"]` | «Etiqueta para distinguir entre paro Programado o No programado.» · M · **PLANEADA / NO PLANEADA** |
| h_ini_paro | tuplaDateTime | `["2026-07-31T10:00:00Z","M","ISO 8601 DateTime"]` | «Hora exacta en que el pozo se detuvo.» · M |
| h_fin_paro | tuplaDateTime | `["2026-07-31T12:00:00Z","M","ISO 8601 DateTime"]` | «Hora exacta en que el pozo arrancó.» · M |
| cau_gral_paro | tuplaString | `["","M","string"]` | «Categoría general de la causa de detención.» · M · **No aplica** (sin lista) |
| dif_perd | tuplaString | `["","M","string"]` | «Clasificación de impacto (Producción Diferida o Producción Perdida).» · M · **DIFERIDA / PERDIDA** |
| resp_par | tuplaString | `["","M","string"]` | «Especialidad o departamento responsable del paro (Ej. Mantenimiento).» · M · **OPERADOR - OPERACIÓN / OPERADOR - MANTENIMIENTO / OPERADOR - PLANEACIÓN/LOGÍSTICA / EXTERNO - PROVEEDOR ENERGÍA / EXTERNO - TRANSPORTADOR / COMUNIDAD / AUTORIDAD / REGULADOR / TERCERO / FUERZA MAYOR (CLIMA/NATURAL)** |
| choke_mod | tuplaString | `["","M","string"]` | «Modelo de estrangulador utilizado, si es relevante en la detención.» · M · **POZO / PLANTA / EXPORTACIÓN / RESERVORIO** |
| cau_niv1 | tuplaString | `["","M","string"]` | «Causa específica de la parada (Nivel 1).» · M · lista de los 20 **N1_TEXT en mayúsculas** (p. ej. «PLANEADA - MANTENIMIENTO ELÉCTRICO»), **no las claves N1_KEY** |
| cau_niv2 | tuplaString | `["","M","string"]` | «Causa específica de la parada (Nivel 2).» · M · lista agrupada por N1, en mayúsculas (ver 4.4) |
| desc_evid | tuplaString | `["","M","string"]` | «Descripción abierta o evidencia observada de la falla/parada.» · M · «Comentario adicional, campo libre» |

Hallazgos clave del cotejo:
1. **El Schema NO valida el catálogo.** `pla_no_plan`, `dif_perd`, `choke_mod`, `cau_niv1` y `cau_niv2` son `tuplaString` sin `enum`, y no hay `if/then` ni `oneOf` que ate N1↔N2 o P_/NP_↔PLANEADA. Toda la validación de la Tabla 1 y la regla de coherencia de C24 p.7 tiene que vivir en el **receptor de la ANH** (reglas de negocio no publicadas). Con el Schema publicado, un archivo con `cau_niv1 = "LO QUE SEA"` pasa la validación estructural.
2. **El Schema NO exige `paradas_pozo`.** `segmento_datos` no tiene `required`; C24 p.7 dice que el nodo es obligatorio y que sin paradas va como arreglo vacío. El Schema tampoco exige `minItems`.
3. **El valor de `cau_niv1` es ambiguo entre fuentes:** C24 p.8 dice «Clave codificada de Nivel 1… N1_KEY» con ejemplo `["P_MANT_ELE","M","string"]`; el Diccionario lista los **textos** en mayúsculas («PLANEADA - MANTENIMIENTO ELÉCTRICO»). Son incompatibles: hay que elegir uno (ver §6, A-3).
4. **Mayúsculas y tildes distintas:** el Diccionario escribe todo en MAYÚSCULAS con tildes («EXPORTACIÓN», «OPERADOR - PLANEACIÓN/LOGÍSTICA»); la circular escribe `"EXPORTACION"` sin tilde y los N2 en tipo oración. Si el receptor compara exacto, solo una forma pasa.
5. **`resp_par` sí tiene lista en el Diccionario** (las 9 opciones del Paso 1, en mayúsculas). Pero la lista está separada por « / » y una opción contiene « / »: «AUTORIDAD / REGULADOR» se lee como dos valores («AUTORIDAD», «REGULADOR»), lo que daría 10 en vez de 9. Por la circular (Paso 1) se sabe que es una sola opción.
6. **`choke_mod` mal descrito en el Diccionario:** «Modelo de estrangulador utilizado» contradice C24 p.4, que dice expresamente que el Choke «se distingue técnicamente de la válvula de estrangulamiento». Prevalece la circular (la válvula física va en `pruebas_potenciales.posicion_val_choque`, en 1/64").
7. **`cau_gral_paro` sigue sin lista** en los tres artefactos. Ver §3.4 y §6, A-1.
8. **Origen sugerido por la plantilla:** identificación del pozo = `"A"`; todo lo de clasificación y horas = `"M"`. No es una regla: el Schema acepta A/M/C/""/Fijo.
9. **No hay campo de volumen en `paradas_pozo`** (confirmado en Schema). El volumen de la parada no viaja en el IDP; lo que viaja por pozo es `produccion_por_pozo` (t_prod, prd_oil, prd_gas, prd_agua, cond) y el potencial en `pruebas_potenciales`. La diferida, por tanto, **la puede recalcular la ANH** con `pruebas_potenciales` + `produccion_por_pozo`; las pérdidas aparecen como `perdidas` en los balances.

### 4.4 Diferencias entre el catálogo N2 del Diccionario (V3.2) y la Tabla 1 de la circular
(Comparación del texto de la celda G141 del Diccionario contra la Tabla 1 de C24 p.6–7, ignorando mayúsculas.)

| N1 | Circular (Tabla 1) | Diccionario V3.2 | Efecto |
|---|---|---|---|
| P_MANT_ELE | «VSD» | «VSD / -» (artefacto de edición) | Cadena con basura. |
| P_PRUEBAS | «Prueba de pozo (presión transiente, producción, potencial, PLT, ILT, otros)» | «PRUEBA DE POZO (POTENCIAL/PLT)» | **Texto distinto**: el Diccionario conserva el texto de la Circular 003. |
| P_OP | «Operación por balance de inventarios» | «OPERACIÓN POR BALANCE DE INVENTARIOS (PLANIFICADO)» | Sufijo extra. |
| NP_CLIMA | orden: Tormenta… primero | orden del árbol: Inundación… primero | Solo orden. |
| NP_OPUB | orden: Paro gremios… primero; «Hurto» | orden del árbol: Bloqueos primero; «HURTO / -» | Orden + artefacto. |
| NP_INS | 11 causas | **12 causas**: añade «FALLA INSTRUMENTO/SENSOR» | Una causa **cambió de N1**. |
| NP_CTRL | 6 causas, incluye «Falla Instrumento/sensor»; «Falla configuración/parametrización» | **5 causas**: no tiene «Falla Instrumento/sensor»; «FALLA CONFIGURACIÓN/PARAMETRIZACIÓN (PLC/VSD/CONTROL)» | Causa movida a NP_INS + sufijo extra. |
| NP_CTRL | «Perdida Línea de Vista (Flora)» | «PERDIDA LINEA DE VISTA (FLORA)» (sin tilde en LINEA) | Tilde distinta. |
| Resto | — | Mismo contenido (en mayúsculas) | — |

Conclusión: **circular y Diccionario no coinciden en 5 N2** (una causa movida de N1, dos con texto distinto, dos con artefactos). La circular es el acto administrativo (09-09-2026); el Diccionario es un anexo técnico fechado **antes** (20-08-2026), publicado junto a ella. El texto normativo es el de la circular, pero el validador real de la ANH puede estar construido sobre el Diccionario. → §6, A-4.

### 4.5 Balances de fluidos (Schema + Diccionario)
Todos los campos son `tuplaNumber`; Origen sugerido «M», salvo `balance` = «C» («Valor matemático calculado por el sistema (Cierre de balance)»). Uno por facilidad/recurso (`id_rec`).

- **balance_fluido_crudo** (bbl): id_rec, inventario_inicial («Stock físico del fluido a las 00:00 del día reportado»), produccion, entregas, consumo, **perdidas** («Mermas operativas o volúmenes perdidos en procesos»), transferencia, devolucion («devuelto… por problemas de calidad (Off-spec)»), recibos, ventas, **crudo_recuperado** («(Solo Crudo) Crudo recuperado de fosas o piscinas API»), otros, inventario_final («Stock físico medido en los tanques a las 23:59 del día reportado»), balance.
- **balance_fluido_agua** (bbl): igual al de crudo sin `ventas` ni `crudo_recuperado` (12 campos).
- **balance_fluido_gas** (mmscfd): id_rec, produccion, consumido, **quemado** («Volumen desechado y quemado en la Tea (Flaring)»), ventas, inyectado, generacion_electrica, urbano, transformado, gas_lift, enviado_planta, entregas, recibos, balance. **No tiene campo `perdidas` ni `venteo`**.
- **balance_fluido_blancos**: id_rec + 6 subobjetos (propano, butano, gasolina, nafta, glp, gasolina_natural), cada uno con inventario_inicial, produccion, entregas, consumo, perdidas, transferencia, devolucion, recibos, ventas, otros, inventario_final, balance (bbl).

**La fórmula de `balance` no está publicada** en ningún artefacto (ni signos de cada término). NO VERIFICADO.

Relación con la definición de Pérdida (C24 p.4): derrames, fugas cabeza-PMO, rechazo por especificación → `perdidas`/`devolucion` del balance de crudo; quema en tea → `quemado` del balance de gas; venteos intencionales → **no hay campo explícito** (¿`otros`?). El vínculo entre una parada con `dif_perd = "PERDIDA"` y el volumen en `perdidas` del balance **no está definido** (no hay identificador de evento que los una). → §6, A-8.

### 4.6 Otros nodos relevantes para el diferido
- **pruebas_potenciales** (24 campos): n_pozo, id_rec, uwi, form, campo, id_laboratorio, **h_pbas** («Horas de duración en que el pozo estuvo en prueba de potencial», hours), **prod_oil / prod_gas / prod_agua / cond** («Tasa de producción calculada… en la prueba», bbl / kscfd / bbl / bbl), bipd_dato, frec, pip, i_m, long_stroke, posicion_val_choque (1/64"), thp, chp, pres_anu_rev, tht, api_60, gor («C»), bsw. Res. 0651 Cuadro 11 (Anexo 4) dice que petróleo, gas y agua van «extrapolado a 24h».
- **produccion_por_pozo** (12 campos): …, **tip_lev** (lista en Diccionario: «BOMBEO ELECTROSUMERGIBLE / FLUJO NATURAL / GAS LIFT / NO APLICA / CAVIDADES PROGRESIVAS / BOMBEO HIDRAULICO / …», con valores mal concatenados en la celda), **t_prod** («Cantidad de horas totales en las que el pozo aportó fluidos», hours), **prd_oil / prd_gas / prd_agua** («**Asignación** diaria volumétrica…»), cond, observaciones. La producción por pozo que viaja es la **asignada** (con factor de asignación), no la medida.
- **inyeccion_por_pozo**: t_iny (HH:MM), t_fluid_iny (AGUA / AIRE / GAS / POLIMERO / VAPOR DE AGUA), vol_iny, pres_iny, obs. **No existe** nodo de paradas para pozos inyectores ni para bombas de reinyección.

## 5. SPE-36848 «The Choke Model»

La referencia **existe**. Verificada en Crossref (https://api.crossref.org/works/10.2118/36848-MS, consultada 21-oct-2026):
- **Título:** *Increasing Production in a Mature Basin: "The Choke Model"*
- **Autores:** W. Palen y A. Goodwin (British Petroleum, según R2)
- **Evento:** European Petroleum Conference (EUROPEC 96), Milán, Italia, 22–24 de octubre de 1996
- **Editor:** SPE · **DOI:** 10.2118/36848-MS · número SPE-36848-MS

Es un **paper de conferencia**, no un estándar SPE; la C24 lo llama «estándarSPE-36848» (C24 p.4). Los cuatro chokes que adopta la ANH (Reservorio, Pozo, Planta, Exportación) son los del paper («simplified for management reporting as Reservoir, Wells, Plant, and Export chokes», cita de R2 §1.1), no los de la NSTA británica (Wells, Plant, Export, Market). La metodología la desarrolla `R2-choke-y-perdidas.md`; aquí no se repite. Coincido con R2 en los metadatos.

## 6. Ambigüedades y huecos

Cada ítem dice: el hueco, de dónde sale, una propuesta provisional para TRIM (marcada como tal) y la pregunta para Edinson. Edinson figura en «Proyectó» de la C003, la C24/2025 y la C24/2026, así que puede responder qué quiso decir la ANH. Pero **su respuesta no es la norma**: lo que diga hay que pedir que la ANH lo confirme por escrito, en las mesas de trabajo que ofrece C24 p.10.

### Del catálogo y los valores
**A-1. `cau_gral_paro` no está definido.** C24 p.8: «Categoría general o macro de la detención», sin lista; Diccionario: «No aplica». Antecedentes: v2.0 `causa_parada` = «Motivo principal de la parada (p. ej., Mantenimiento, Operativa, Falla mecánica)» (Anexo C003 p.20); Res. 0651 Cuadro 12 «Causa de paro» con 18 valores cerrados (abandono… servicio a pozo).
*Propuesta provisional:* guardarlo como campo propio, con las 18 causas de la Res. 0651 como lista sugerida y texto libre permitido.
→ **Pregunta:** «¿`cau_gral_paro` debe llevar una de las 18 causas del art. 15.1 par. 2 de la Res. 0651 (abandono, alto S&W, eléctrico, …), un texto libre, o algo derivado del N1 (p. ej. "MANTENIMIENTO")? ¿El receptor lo valida?»

**A-2. `resp_par`: ¿texto libre o una de las 9 opciones?** C24 p.8 da ejemplos que no son opciones del Paso 1 («"Mantenimiento", "Operación", "Comunidad"»); el Paso 1 (C24 p.5) da 9 opciones cerradas; el Diccionario lista esas 9 en mayúsculas («OPERADOR - MANTENIMIENTO»…).
*Propuesta provisional:* lista cerrada de 9, con la escritura exacta que confirme la ANH.
→ **Pregunta:** «¿`resp_par` es una de las 9 opciones del Paso 1? ¿Con qué escritura exacta: "Operador-Mantenimiento" (circular), "Operador - Mantenimiento" (árbol) u "OPERADOR - MANTENIMIENTO" (diccionario)? ¿"Autoridad / Regulador" es una sola opción?»

**A-3. `cau_niv1`: ¿clave o texto?** C24 p.8: clave N1_KEY, ejemplo `["P_MANT_ELE","M","string"]`; Diccionario: texto «PLANEADA - MANTENIMIENTO ELÉCTRICO».
*Propuesta provisional:* guardar internamente las dos cosas (clave + texto) y serializar la clave, porque es lo que dice el acto administrativo.
→ **Pregunta:** «¿En `cau_niv1` va `P_MANT_ELE` o "PLANEADA - MANTENIMIENTO ELÉCTRICO"? ¿El receptor acepta ambos?»

**A-4. El catálogo N2 tiene tres versiones distintas** (Tabla 1 de C24, árbol, Diccionario V3.2; ver §2.2 y §4.4): «Falla Instrumento/sensor» está en `NP_CTRL` en la circular y en `NP_INS` en el Diccionario; textos distintos en «Prueba de pozo (…)», «Operación por balance de inventarios (PLANIFICADO)», «Falla configuración/parametrización (PLC/VSD/CONTROL)»; mayúsculas, tildes («LINEA»/«Línea», «EXPORTACION»/«EXPORTACIÓN») y espacios.
*Propuesta provisional:* catálogo interno con un **código propio por pareja (N1, N2)** y una tabla de «forma de salida» configurable, para cambiar la escritura sin migrar datos.
→ **Pregunta:** «¿Cuál de las tres listas usa el validador: la Tabla 1, el árbol o el Diccionario V3.2? ¿Compara mayúsculas, tildes y espacios exactos? ¿"Falla Instrumento/sensor" es de Control o de Instrumentación?»

**A-5. Choke: escritura.** C24 p.8 `"EXPORTACION"`; Diccionario «EXPORTACIÓN». Mismo problema que A-4. (Incluido en la pregunta de A-4.)

### Del cálculo
**A-6. El potencial, ¿con o sin factor de asignación (FA)?** C24 p.4: diferida = «producción máxima esperada, acorde con el potencial del pozo (última prueba de potencial reportada a la ANH)» − «producción real obtenida en… 24 horas». Res. 40236 art. 21–22: la producción por pozo es la **asignada** con el factor de campo; el IDP lleva `prd_oil` = «Asignación diaria volumétrica». Si se resta prueba sin FA menos real asignada con FA, un pozo sin paradas tiene diferida = (1 − FA) × prueba. TRIM hoy multiplica el potencial por el FA del mes (`src/entities/libro.ts`, según R4 D2).
*Propuesta provisional:* calcular y mostrar **las dos**: la «diferida ANH» (literal de la circular, sin FA) y la «diferida TRIM» (con FA), y el residuo entre ambas.
→ **Pregunta:** «Para la diferida de la circular, ¿el potencial es la prueba tal cual (bbl/d a 24 h) o la prueba por el factor de campo del día? ¿Y la "producción real" es la asignada (`prd_oil`) o la medida en el pozo?»

**A-7. ¿Cuál es «la última prueba de potencial reportada a la ANH»?** Res. 40537 art. 35: prueba mensual ≥ 6 h, «representativa»; Res. 0651 Cuadro 11: «extrapolada a 24h»; el IDP v3.1 tiene `pruebas_potenciales`. No se dice si la prueba de un día cuenta desde ese mismo día, ni si una estimación (p. ej. desde la ESP) cuenta.
→ **Pregunta:** «¿La prueba vigente es la última que viajó en `pruebas_potenciales` de un IDP aceptado? ¿Desde qué día rige: el día de la prueba o el siguiente? ¿Sirve una prueba estimada o con medidor multifásico?»

**A-8. ¿Dónde va el volumen?** Los 15 campos no tienen volumen (§1.7, §4.3). C24 p.7 dice que «el operador determina, conforme a su metodología operacional y con soporte técnico verificable, cuáles de dichos eventos generan producción diferida y cuál es el volumen asociado», pero no dice dónde se reporta ese volumen. Tampoco hay identificador que una una parada «PERDIDA» con el número en `perdidas` / `quemado` del balance.
→ **Pregunta:** «¿El volumen diferido o perdido de cada parada se reporta en algún lado del IDP, o la ANH lo calcula con `pruebas_potenciales` y `produccion_por_pozo`? Si hay una pérdida (derrame), ¿cómo se une la parada con el valor de `perdidas` del balance?»

**A-9. Pérdida sin parada.** La Pérdida (C24 p.4) incluye «quema de gas en tea, venteos intencionales, rechazo por especificación» que pueden ocurrir **sin que ningún pozo pare**. Pero `paradas_pozo` exige `n_pozo`, `h_ini_paro`, `h_fin_paro`, y «La existencia de una parada de pozo no implica, por sí misma, la existencia de una producción diferida o pérdida» (C24 p.3) — el texto no dice lo inverso.
*Propuesta provisional:* registrar las pérdidas como **eventos de pérdida** propios (con facilidad, volumen, fluido), separados de las paradas; solo se generan filas en `paradas_pozo` cuando además hay pozo detenido.
→ **Pregunta:** «Una quema en tea o un rechazo por especificación sin pozo parado, ¿va como fila de `paradas_pozo` (¿con qué pozo y qué horas?) o solo en el balance (`quemado`, `perdidas`, `devolucion`)?»

**A-10. Reducción parcial (pozo que no para pero produce menos).** La definición de Parada incluye la interrupción «total o parcial» (C24 p.3). Pero `paradas_pozo` solo tiene inicio y fin, no el porcentaje. Caso típico de TRIM: ESP con frecuencia bajada (R2, inferencia sobre «levantamiento no optimizado»; R4, caso `HZ` de `libro.ts`). Y «el sistema de levantamiento se encuentra en condición optimizada» (C24 p.4) sugiere que un levantamiento sub-optimizado genera diferida.
→ **Pregunta:** «Una restricción parcial (choke cerrado a medias, ESP con frecuencia bajada, curtailment del 30 %) ¿se reporta como fila en `paradas_pozo` con inicio y fin? ¿Cómo se sabe que fue parcial?»

### Del tiempo
**A-11. Parada que cruza la medianoche.** El IDP es del «día calendario anterior con hora de corte a las 23:59:59» (C24 p.8–9); el formato viejo restringía el paro a «00:00 hasta las 24:00» (Res. 0651 Cuadro 12); el v3.1 usa fecha-hora completa. No se dice si una parada de 22:00 a 03:00 va (a) entera en el IDP del día en que empezó, (b) partida en dos filas, una por IDP, o (c) en el IDP del día en que termina. Tampoco qué poner en `h_fin_paro` si al cierre del día **la parada sigue abierta**.
*Propuesta provisional:* partir en tramos por día operacional (00:00:00–23:59:59 COT), con un identificador interno del evento que una los tramos; el tramo abierto se cierra a las 23:59:59.
→ **Pregunta:** «Si un pozo sigue parado a las 23:59:59, ¿qué va en `h_fin_paro`: 23:59:59, vacío, o se espera al arranque? ¿Una parada de varios días se repite en cada IDP?»

**A-12. Zona horaria.** `h_ini_paro` en formato «YYYY-MM-DDThh:mm:ssZ» (con Z = UTC) (C24 p.8); la plantilla trae `"2026-07-31T10:00:00Z"`; pero el sello de los archivos va en «Hora Legal… (COT / UTC-5)» (C24 p.9) y el corte diario no dice zona.
*Propuesta provisional:* guardar en UTC, mostrar en COT, cortar el día en COT.
→ **Pregunta:** «¿`h_ini_paro` va en UTC con "Z" o en hora colombiana (−05:00)? ¿El día operacional se corta a las 23:59:59 de Colombia?»

### Del origen del dato y del proceso
**A-13. El «Origen» de un dato deducido.** C24 p.2: «A» (Automático), «M» (Manual), «C» (Calculado). TRIM **deduce** la causa de las señales del PLC (`src/entities/causa-senal.ts`) y luego una persona la confirma. ¿Es «C» (calculado), «A» (automático) o «M» (lo firmó una persona)? Además el Schema acepta `""` y `"Fijo"`.
*Propuesta provisional:* hora de inicio/fin tomadas del PLC = «A»; clasificación deducida y no tocada = «C»; clasificación confirmada o cambiada por una persona = «M». Guardar siempre quién y cuándo.
→ **Pregunta:** «Si un sistema propone la causa a partir de las alarmas y el ingeniero solo la confirma, ¿el Origen es "C" o "M"? ¿Y la hora de paro tomada del PLC es "A" aunque el registro lo cierre una persona?»

**A-14. ¿Quién clasifica?** C24 p.5: «por parte de los ingenieros y operadores del campo». ¿Vale una clasificación automática confirmada por una persona? (R4 §9 punto 7 plantea lo mismo.) Incluido en A-13.

**A-15. Unicidad y eventos en cascada.** Principio de Unicidad: «un solo flujo de clasificación completo por parada» (C24 p.5). Si cae la energía externa y por eso paran 20 pozos, ¿son 20 filas con la misma causa (una por pozo) o hay que elegir la causa raíz por pozo? Si un pozo para por una causa y durante la parada aparece otra, ¿se cierra y se abre otra fila?
*Propuesta provisional:* una fila por pozo y por tramo de causa; causa = raíz (lo que R2 propone para el choke: «gana el evento que se originó primero»).
→ **Pregunta:** «Si una misma parada tiene dos causas seguidas (p. ej., falla eléctrica y luego espera de repuesto), ¿se reporta como una sola fila con la causa raíz o como dos filas consecutivas?»

### De la vigencia y la versión
**A-16. ¿Sigue firme el 01-12-2026?** La Res. 0592/2026 suspendió el art. 4 de la Res. 0651 hasta el 29-03-2027 (§3.2). La C24 no se apoya en el art. 4, pero el JSON Tipo B para campos pequeños sí venía del par. 8 del art. 4.
→ **Pregunta:** «¿La Res. 0592 aplaza la obligatoriedad del JSON v3.1 y de la matriz de paradas del 01-12-2026, o solo los plazos de telemetría? ¿Los campos de menos de 3000 BOPD están obligados a enviar v3.1 desde diciembre?»

**A-17. ¿Qué versión rige?** Circular 3.1; Schema «3.5 Estricta»; Diccionario «V3.2» / «V3.0» (§4.0). ¿Qué va en `metadatos_archivo.version`?
→ **Pregunta:** «¿Qué valor va en `version`? ¿Habrá un Schema que sí tenga los `enum` y las reglas N1/N2?»

**A-18. El Schema no exige `paradas_pozo` ni valida el catálogo** (§4.3). La C24 dice que el nodo es obligatorio y que el catálogo provoca rechazo.
→ **Pregunta:** «¿Las reglas de catálogo y coherencia se validan en el receptor (API 1-C1) aparte del Schema? ¿Se publicarán? ¿Hay un ambiente de pruebas donde enviar archivos y ver los rechazos?» (C24 p.8 dice que el ambiente de pruebas está habilitado desde la publicación.)

**A-19. Origen vacío y unidades.** El Schema acepta Origen `""` y Unidad libre. ¿Se acepta un dato con origen vacío? ¿Hay lista de unidades válidas? Incluido en A-17.

### Del alcance para el producto
**A-20. Pozos inyectores y bombas de reinyección.** El nodo es `paradas_pozo` (productores). No hay paradas de inyectores ni de bombas de reinyección/multifásicas, que son el piloto de TRIM (CONTEXTO.md). La C24 solo las alcanza por su **efecto** sobre los productores (`NP_PROC` «Parada estación/bombeo afecta pozos», «Tanques llenos / capacidad limitada»).
→ **Pregunta:** «Cuando la bomba de reinyección falla y se cierran los pozos con más agua, ¿el choke es PLANTA y la causa `NP_PROC` "Parada estación/bombeo afecta pozos" o "Tanques llenos / capacidad limitada"? ¿Y la parada del inyector se reporta en algún lado?»

**A-21. «Alto BSW / corte de agua» (`NP_SUB`).** En campos con 92–97 % de agua puede volverse el comodín. ¿Cuándo un pozo cerrado por agua es `NP_SUB` «Alto BSW» (No planeada) y cuándo `P_OP` «Curtailed por decisión operativa» (Planeada)?
→ **Pregunta:** «Si se cierra un pozo por alto corte de agua por decisión de ingeniería, ¿es `P_OP` o `NP_SUB` "Alto BSW"?»

**A-22. Responsable vs. N1 no están atados.** Ni la Tabla 1 ni el árbol ligan responsable con N1 (§2.1). ¿Es válido «Comunidad» + `P_MANT_ELE`? El rechazo automático solo cubre P_/NP_ (C24 p.7).
→ **Pregunta:** «¿El receptor valida alguna combinación entre responsable, choke y N1, además de P_/NP_?»

**A-23. Gravamen sobre pérdidas.** «podrá estar sujeta a gravamen… de acuerdo con la responsabilidad de la compañía operadora y la naturaleza del evento» (C24 p.4). No se encontró la norma que lo desarrolla (§3.6). Afecta cómo TRIM valora una pérdida (la «regla del dueño» de costo por falla).
→ **Pregunta:** «¿Qué norma o procedimiento define cuándo la ANH cobra regalías sobre una pérdida? ¿El campo `resp_par` es el que decide la "responsabilidad del operador"?»

## 7. Implicaciones para TRIM

TRIM no es quien firma ni envía el IDP (lo hace el operador). Pero si TRIM quiere ser la herramienta donde se clasifican las paradas y desde donde sale `paradas_pozo`, esto es lo que la norma le impone. «OBLIGATORIO» = lo exige un texto citado; «RECOMENDADO» = no lo exige la norma pero evita un rechazo o una discusión con la ANH.

### 7.1 OBLIGATORIO (desde el 01-12-2026, salvo lo que aclare A-16)
| # | Qué | Fuente |
|---|---|---|
| O-1 | Cada parada lleva los **15 campos**, todos presentes, ninguno extra (`additionalProperties: false`), en forma de tupla de 3 posiciones `[Valor, Origen, Unidad]`. | C24 p.2–3, p.7–8; Schema |
| O-2 | `paradas_pozo` va **siempre**; sin paradas, arreglo vacío `[]`. | C24 p.7 |
| O-3 | Clasificar **en los 6 pasos y en ese orden**: Responsable → Choke → Diferida/Pérdida → Planeada → N1 → N2. Un solo flujo completo por parada (Unicidad). | C24 p.5 |
| O-4 | `choke_mod` ∈ {POZO, PLANTA, EXPORTACION, RESERVORIO}; `dif_perd` ∈ {DIFERIDA, PERDIDA}; `pla_no_plan` ∈ {PLANEADA, NO PLANEADA} (escritura exacta pendiente de A-4/A-5). | C24 p.8 |
| O-5 | `cau_niv1` dentro de los 20 N1; **prefijo coherente** con la planeación (P_ ↔ PLANEADA, NP_ ↔ NO PLANEADA), si no → rechazo automático. | C24 p.7 |
| O-6 | `cau_niv2` **exactamente** igual a una de las causas autorizadas **para ese N1**. No hay «Otro» libre en N2: lo libre va en `desc_evid`. | C24 p.7–8 |
| O-7 | Choke = dónde se materializa la restricción en el sistema, **no** la válvula choke. | C24 p.4 |
| O-8 | Origen por dato («A», «M» o «C»), dato por dato. | C24 p.2 |
| O-9 | Horas en ISO 8601 (`YYYY-MM-DDThh:mm:ssZ`). | C24 p.8 |
| O-10 | El IDP del día anterior, corte 23:59:59, **antes de las 07:00**. | C24 p.8–9; Res. 0651 art. 15; Res. 40537 art. 51 |
| O-11 | Si la ANH rechaza o pide corrección: corregir y retransmitir **en 1 hora**, con trazabilidad (id del envío, fecha-hora, versión/número de corrección, motivo). Los datos «sin alteraciones o modificaciones en el contenido original». | Res. 0651 art. 15.2 (Res. 0052/2026) y art. 14 |
| O-12 | Diferida = potencial (última prueba de potencial reportada a la ANH) − real, en 24 h; la clasificación de impacto debe tener **soporte técnico verificable**. | C24 p.4, p.7 |
| O-13 | Distinguir **Pérdida** (ya producido, no recuperable: derrame, fuga hasta el PMO, tea, venteo, rechazo por especificación, daño de equipo) de **Diferida** (no producido). | C24 p.4–5 |
| O-14 | Un derrame, además, es incidente a notificar en 24 h. | Res. 40537 art. 59 |
| O-15 | Si TRIM genera los archivos de alta frecuencia: cada 10 min, 144 por día, inmutables, sello COT, NTP del INM, nombre `NOMBREOPERADORA_CONTRATONUMERO_yyyymmddTHHMMSS.json`. | C24 p.9 |
| O-16 | Pruebas de pozo: al menos 1/mes, ≥ 6 h, y siempre que cambien las condiciones operacionales. (Condiciona cuál es «la última prueba».) | Res. 40537 art. 35 |

### 7.2 RECOMENDADO
| # | Qué | Por qué |
|---|---|---|
| R-1 | **Catálogo ANH como datos, no como código**: tabla (N1_KEY, N1_TEXT, N2, condición) con versión y fecha de vigencia, y un código interno por pareja (N1, N2). Escritura de salida configurable. | Hay 3 listas oficiales distintas (§4.4) y la ANH ya cambió el catálogo una vez (C003 → C24, §3.4). |
| R-2 | **Validar en origen** («shift-left»): el Schema oficial (convertido de UTF-16) **más** las reglas que el Schema no trae (catálogo, coherencia P_/NP_, N2 ∈ N1, `h_fin ≥ h_ini`, nodo presente). | C24 p.3 lo pide; el Schema publicado no cubre las reglas de rechazo (§4.3). |
| R-3 | **Mapeo del árbol propio de cada operadora → árbol ANH** (lo que pidió Edinson, Transcript l.32 y l.56): tabla de conversión versionada por operadora, con la causa propia guardada al lado de la ANH. | El árbol ANH es «algo chiquitico» frente al de Ecopetrol (Transcript l.56); la operadora no va a renunciar a su árbol. |
| R-4 | Los pasos 1–4 se pueden **proponer** desde las señales (TRIM ya deduce causa y equipo), pero una persona los confirma, y se guarda quién y cuándo. | C24 p.5 «por parte de los ingenieros y operadores»; Origen (A-13). |
| R-5 | Calcular y mostrar **las dos diferidas**: la literal de la ANH (sin FA) y la de TRIM (con FA), con el residuo. | A-6; evita que el operador reporte una cifra que la ANH recalcule distinto. |
| R-6 | Marcar en cada prueba si fue **reportada a la ANH** y en qué IDP. | «última prueba de potencial reportada a la ANH» (C24 p.4). |
| R-7 | **Partir las paradas por día operacional** (COT) con un id de evento que una los tramos; nunca dejar `h_fin_paro` vacío. | A-11, A-12. |
| R-8 | Registrar **eventos de pérdida** aparte de las paradas (facilidad, fluido, volumen, tipo: derrame / fuga / tea / venteo / rechazo), y reconciliarlos con `perdidas`, `quemado` y `devolucion` de los balances. | A-8, A-9; C24 §1.4. |
| R-9 | Guardar `cau_gral_paro` con la lista de 18 causas de la Res. 0651 como sugerencia, hasta que la ANH lo defina. | A-1. |
| R-10 | Guardar los identificadores ANH del pozo (`id_rec`, `uwi`, nombre oficial `n_pozo`, `form`, `campo`). Hoy no existen en TRIM (R4 §8, tabla final de brechas, fila 1). | O-1. |
| R-11 | Para el piloto (bomba de reinyección o multifásica): la parada de la bomba se traduce en filas de `paradas_pozo` **de los productores afectados**, choke PLANTA, causa `NP_PROC` (o `P_MANT_MEC` «Bomba (superficie)» si fue planeada). Confirmar con Edinson (A-20). | No hay nodo de paradas de equipos de planta. |
| R-12 | No usar «Otro»/«Pendiente» como salida de N2 salvo «Orden público - Pendiente detalle», que es la única «pendiente» autorizada (y solo en `NP_OPUB`). | Tabla 1. |
| R-13 | Mostrar en la UI los **N1_TEXT** y las N2 en tipo oración (como la Tabla 1), y serializar según la escritura que confirme la ANH. | Legibilidad para operador/supervisor sin acoplar la UI al formato del JSON. |
| R-14 | Trazabilidad de versiones del IDP: guardar cada envío, su respuesta (aceptado/rechazado y motivo) y cada corrección. | Res. 0651 art. 15.2 par. 3. |
| R-15 | Tener presente que la ANH puede cambiar la estructura del JSON por circular con plazo de hasta 10 días. | Res. 0651 art. 15.1 par. 4. |

## 8. Desacuerdos con otros agentes
- **R4 (`R4-auditoria-producto.md`, §10, segundo punto)** pide que R1 registre la contradicción código/texto de `cau_niv1` entre la circular y el Diccionario. Hecho en §4.3 punto 3, §1.6 y §6 A-3. Coincido con R4 en que no se puede resolver sin la ANH.
- **R2 (`R2-choke-y-perdidas.md`, §2.3 punto 2 y fila `EXPORTACION` de §2.2)** afirma que el choke va «en mayúsculas y sin tilde, que es como los valida el JSON». Coincido con R4 en que **eso no está verificado**: la circular dice `"EXPORTACION"`, el Diccionario dice «EXPORTACIÓN» y el Schema no valida el valor (§4.3). Es una pregunta abierta (A-4/A-5), no un hecho.
- **R2 (§1.1 tabla de la referencia):** coincido en los metadatos de SPE-36848 (verificados también en Crossref, §5).
- **R4 (§1.6.1):** coincide con mis §4.1–4.3 sobre Schema, plantilla y Diccionario. Sin desacuerdo.
- Con **R3** no hay puntos normativos en común.

## 9. Fuentes descargadas (`investigacion/fuentes/`)
| Archivo | Origen | Nota |
|---|---|---|
| `20260731_Esquema_JSON_V3.1_ANH.json` | anh.gov.co/documents/34902 | UTF-16 LE |
| `20260731_JSON_IDP_TipoUnico_V3.1_AHN.json` | anh.gov.co/documents/34903 | Plantilla |
| `20260820_Dicionario_de_Datos_JSON_V3.2_ANH.xlsx` | anh.gov.co/documents/34901 | Hoja `JSONV3` |
| `circular-anh-003-2026.pdf` | anh.gov.co/documents/33701 | 8 págs. |
| `anexo-tecnico-interoperabilidad-idp.pdf` | anh.gov.co/documents/33702 | 38 págs.; árbol anterior en p.10–11 |
| `circular-anh-024-2025.pdf` | anh.gov.co/documents/30280 | Lineamientos Res. 0651; nada sobre paradas |
| `res-anh-0651-2025.pdf` | anh.gov.co/documents/30096 | 66 págs., texto original (sin modificaciones) |
| `res-anh-0101-2026-diario-oficial.pdf` | sidn.ramajudicial.gov.co (Diario Oficial 53.422) | 2 págs. |
| `res-anh-0592-2026.pdf` | anh.gov.co/documents/34954 | Suspensión del art. 4 |

No descargadas, leídas en línea: Res. 0651 compilada y Res. 0052/2026 (gestornormativo.creg.gov.co), Res. MME 40236/2022 y 40537/2024 (gestornormativo.creg.gov.co). **No leídas:** Res. 0708/2025 y 0885/2025 en texto propio (alcance tomado de notas de vigencia).
