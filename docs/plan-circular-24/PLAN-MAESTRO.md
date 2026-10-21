# Plan maestro · Menos paradas no planificadas en los equipos críticos

**Fecha:** 21-oct-2026 (v2) · **Para:** Hollman y el equipo técnico (Hermes, Eduardo, Sergio) · **Estado:** propuesta. No se construye nada sin la orden «hazlo».

> **El norte (uno solo):** aumentar la productividad. Se logra bajando los **barriles diferidos** (se recuperan después) y los **barriles perdidos** (no se recuperan). Y eso se logra **monitoreando y prediciendo** el comportamiento de las bombas críticas: electrosumergibles, de reinyección y multifásicas.
> **Arquitectura obligatoria:** el árbol de paradas que trajo Edinson, la arquitectura de pérdidas, la conversión del árbol de cada operadora y los colores SCADA de alto desempeño de Adair.
> **Valor agregado:** el *envío* a la ANH (Circular 024) o a otra norma internacional de fiscalización. Sale de esa misma arquitectura y no decide el orden del trabajo.

La v1 de este plan ponía el 1-dic de la ANH en el centro. La v2 lo corrige: la investigación y el diseño siguen valiendo, pero se reordenan alrededor del norte.

| Documento | Qué tiene |
|---|---|
| `investigacion/R1-normativa-anh.md` | La norma ANH completa: las 20 claves, las 117 causas, el Schema y el Diccionario oficiales |
| `investigacion/R2-choke-y-perdidas.md` | El modelo choke (SPE-36848, BP 1996), la pérdida bien definida y la conversión de árboles de causas |
| `investigacion/R3-metricas-confiabilidad.md` | 54 métricas con fórmula, fuente y rol; las 5 trampas de las métricas actuales; el programa del técnico |
| `investigacion/R4-auditoria-producto.md` | Lo que TRIM ya tiene y lo que falta, archivo por archivo |
| `P1-producto.md` | Modelo de datos, reglas, contrato, preguntas y riesgos. **Sus fases (§6) quedan reemplazadas por la §5 de este plan** |
| **`CHOKE-COMPLETO.md`** | **El modelo choke completo en 12 piezas: los cuatro chokes, potenciales calculados, dominante, choke de cada parada, brecha por choke que suma exacto, escalera de brechas, eficiencia, modelo de inyección del agua, criticidad dinámica por equipo, serie en el tiempo, vistas por rol y salidas** |
| `U1-experiencia.md` | Valor por rol, flujos, textos de pantalla, bocetos y pruebas con usuarios |
| `S1-revision.md` | La revisión adversarial, con todos sus cambios aplicados |

---

## 1. Cómo se mide el éxito

Lo que tiene que bajar o subir en el equipo piloto, y luego en la flota:

| Indicador | Dirección | De dónde sale en TRIM |
|---|---|---|
| Paradas no planificadas por equipo crítico al mes | ↓ | La clasificación de cada parada, con el paso «¿Planeada?» confirmado por una persona |
| Barriles diferidos por paradas no planificadas | ↓ | El libro de diferidos, por equipo y por campo |
| Tiempo entre fallas de los equipos críticos (MTBF, sobre tiempo de operación) | ↑ | Métricas con las 5 trampas corregidas (R3 §1.4) y con banda de confianza |
| Tiempo fuera por parada y sus 5 tramos (detección, administrativo, logística, reparación, arranque) | ↓ | El PLC más el cierre de la orden en el teléfono (R3 §4.1) |
| Fallas anticipadas: paradas que el vigía avisó antes y con tiempo para actuar | ↑ | El vigía contra las paradas reales |
| Pérdidas: piteras, derrames, tea, crudo que se va con el agua | ↓ | El registro de pérdidas, aparte del diferido |
| Producción real contra potencial | ↑ | El libro |

**Nada de esto se puede afirmar sin una línea base.** Antes de cambiar nada en el piloto se congela su «antes»: paradas, MTBF, tiempo fuera y diferido de los últimos 6 a 12 meses. El demo ya tiene la historia «antes → con TRIM» (−18 %). En el piloto real esa cifra tiene que salir de datos reales.

---

## 2. La cadena de valor y dónde entra cada pieza

```
ANTICIPAR  →  ATRIBUIR  →  ACTUAR  →  MEDIR  →  (REPORTAR: valor agregado)
```

1. **Anticipar.** El vigía lee la salud de las bombas críticas y avisa antes de la falla.
   - El piloto que propuso Adair: una bomba de inyección o multifásica, porque son las que más paran la planta en cascada y las más instrumentadas: unas 9 temperaturas, 2 o 3 vibraciones, presión de succión y descarga, flujo y corriente del variador [33:45–36:51].
   - **Depende de los datos de entrenamiento que Adair todavía no consigue.** Es la ruta crítica de todo el plan.
   - **Separar el disparo por protección de la falla.** El interlock y la primera alarma del PLC (`Enclavamiento`, P1 §1.13) dicen si la bomba la paró una protección o se dañó. Los disparos repetidos son precursores y se cuentan aparte; un disparo no es una falla.
   - **Regla de Hollman [37:34]: una señal apunta, no prueba.** Lo deducido de una firma de variables nunca queda como causa confirmada sin una persona que abrió el equipo.
2. **Atribuir con verdad.** Saber por qué paró cada equipo y quién puede actuar.
   - Se usa **el árbol de la ANH como esqueleto común** de causas: responsable, dónde se trabó, diferida o pérdida, planeada o no, causa nivel 1 y nivel 2. El paso «¿Planeada?» es literalmente el indicador del norte.
   - **Choke de la parada:** si el equipo sirve a un solo pozo es Pozo; si es compartido, Planta. Dice dónde hay que actuar.
   - **Choke del campo** (calculado): qué limita hoy la producción. Dice dónde rinde más bajar paradas.
   - **Conversión del árbol de la operadora** (pedido central de Edinson): sirve para cargar el historial de la operadora desde el primer día. Ese historial da la línea base sin esperar meses, y permite comparar campos y operadoras con el mismo idioma.
   - TRIM propone y la persona confirma paso por paso, en 1 toque si TRIM la dedujo.
3. **Actuar rápido.** Que la alerta se convierta en trabajo hecho.
   - El técnico tiene su programa preventivo y predictivo en el teléfono, con rutas de vibración, termografía y aceite cuya frecuencia sale del aviso anticipado observado en cada parte. Cierra sin papel y sin señal (pedido de Edinson [22:34]).
   - Los 5 tramos del tiempo fuera muestran dónde se pierde el tiempo. La cifra clave es «¿alcanza?»: la anticipación del vigía menos el plazo del repuesto.
   - Después, SAP: avisos y órdenes sin el reproceso administrativo.
4. **Medir el resultado.**
   - Primero se corrigen las 5 trampas de las métricas actuales; si no, se podría «mostrar una mejora» que no existe. Por ejemplo, el MTBF de la flota se calcula con una sola falla y en días calendario.
   - Paquetes que activa cada operadora y la cifra principal que ella escoge: MTBF, tiempo fuera, reparación o logística (Edinson [22:34]).
   - Bandas de confianza dichas en palabras cuando hay pocas fallas.
5. **Pérdidas.** El registro propio de piteras, derrames, tea, venteo y rechazo por especificación (pedido de Edinson [30:10]). En campos de 92–97 % de agua, el crudo que se va con el agua de disposición puede ser una pérdida grande que nadie mide.
6. **Reportar (valor agregado).** Con los pasos 2 y 5 hechos, el bloque `paradas_pozo` de la ANH es casi una exportación: serializar, validar y entregar. Lo mismo vale para otros marcos de fiscalización y contabilidad de pérdidas, como PRODML ReasonLost o ISO 20815, cada uno como un adaptador de salida.

**Lo que esto cambia frente a la v1:** cerca del 70 % de lo que la v1 llamaba «trabajo ANH» es trabajo del norte: la taxonomía causal, planeada o no, choke, responsable, pérdidas y la conversión del árbol. Lo puramente regulatorio queda en el serializador, la validación propia y la pantalla de cierre del día. La cifra del 70 % es una estimación por partes del plan, no una medición.

---

## 3. Las decisiones del plan

| Tema | Decisión | Por qué |
|---|---|---|
| Dónde vive la clasificación causal | **Al lado** de la de TRIM, en un tramo por pozo × día × causa (`ParadaAnh`). El libro, el diferido y `TipoCausa` no cambian | Así siguen verdes los 122 casos de referencia |
| Quién clasifica | TRIM propone y la persona confirma **paso por paso**: oper y tec solo lo que vieron; sup, prod, jefe y conf los 6 | Lo confirmado tiene que significar que alguien lo miró, también para medir la reducción |
| Planeada contra causa | La combinación incoherente no se puede guardar | Es el indicador del norte: no puede quedar mal clasificado. De paso, es la regla de rechazo de la ANH |
| Disparo contra falla | Interlock y primera alarma separan protección, falla y dato inválido | Un disparo no es falla, pero los repetidos son precursores |
| Señal y causa | Una señal apunta, no prueba | El daño puede ser colateral [37:34] |
| Choke de la parada | Dedicado → Pozo; compartido → Planta; el oleoducto o cliente no recibe → Exportación; yacimiento → Reservorio | Ejemplo de Edinson [26:48]; dice dónde actuar |
| Choke del campo | Se calcula, no se declara | Dice dónde rinde bajar paradas |
| Diferida | La de TRIM (para gestionar) y la ANH (potencial de la última prueba reportada − real), lado a lado y con un cuadre exacto | La de gestión manda; la ANH es salida |
| Pérdida | Arquitectura propia desde F1, medida en el libro **al lado** del diferido y **nunca sumada** | El diferido se recupera y el perdido no: son dos indicadores del norte y se atacan distinto |
| Métricas | Fórmulas fijas, paquetes y cifra principal por operadora, bandas de confianza | Un número igual en todas partes; modular como pidió Edinson |
| Colores (Adair) | Rojo solo para el interlock (con candado); naranja y amarillo para alarmas; morado para sin comunicación o dato inválido; lo que falta en gris discontinuo | Estilo ISA-101 de alto desempeño; un color, un significado |
| Gas | Solo crudo hasta entender la «tolerancia diferente» del gas [31:08] | No ofrecer lo que no se sabe medir bien |
| Pilotos | **Piloto de equipo** (vigía, Adair): manda el plan. **Piloto regulatorio** (operadora): solo si una operadora lo pide | El norte es el equipo |

---

## 4. Qué recibe cada rol

| Rol | La pregunta que TRIM le responde |
|---|---|
| **Gerente** | «¿Qué campo y qué equipos me están costando barriles por paradas no planificadas, y está bajando?» Sin códigos ni detalle técnico |
| **Producción** | «¿Qué limita hoy al campo y dónde rinde más evitar la próxima parada?» |
| **Supervisor** | «¿Qué paró en mi turno, por qué, y qué me falta confirmar?» |
| **Operador** | «¿Qué me falta contestar ahora?» Una pregunta por vez, en palabras de campo |
| **Jefe de mantenimiento** | «¿Estoy pasando de correr detrás de las fallas a anticiparlas? ¿Cuánto del tiempo fuera es espera?» |
| **Confiabilidad** | «¿Qué equipo y qué modo de falla atacar primero, y cuánto le puedo creer al número?» |
| **Planeadora** | «¿Qué programo y qué repuesto pido ya, antes de que falle?» |
| **Técnico** | «¿Qué me toca hoy y qué me falta cerrar?» Sin papel |
| **Abastecimiento** | «¿Esta parada le toca al contratista, a un tercero o a nosotros?» |
| **Regulatorio** | «¿Mi reporte a la ANH pasa?» (cuando el valor agregado esté encendido) |
| **Administrador** | «¿Está bien configurado el campo: equipos, choke, árbol de causas?» |

Detalle, textos y bocetos en `U1-experiencia.md` §1, §2 y §10.

---

## 5. Fases

Las fechas son propuesta. La ruta crítica ya no es el 1-dic sino **los datos del equipo piloto**.

| Fase | Fechas | Qué se entrega | Cuándo está terminada |
|---|---|---|---|
| **F0 · Piloto y datos** | 21 oct → 7 nov | Equipo piloto escogido con Adair (inyección o multifásica) y sus datos históricos: señales, alarmas, paradas y órdenes. Operadora piloto (para tener datos reales, no por cumplimiento). Dedicación del equipo. Preguntas a Edinson enviadas | Hay datos del piloto en la mano, o una fecha cierta para tenerlos |
| **F1 · Arquitectura: medir y atribuir bien** | nov | **El árbol de Edinson** como clasificación causal de 6 pasos, con confirmación por paso y la coherencia bloqueada; **el modelo choke** (los cuatro chokes, potenciales calculados, dominante, choke de cada parada y brecha por choke y por escalón que suma exacto; `CHOKE-COMPLETO.md` §15); **la arquitectura de pérdidas** (`EventoPerdida`) medida en el libro **al lado** del diferido, nunca sumada; interlock y primera alarma (disparo contra falla, la base de los colores de Adair); las 5 trampas de las métricas corregidas al lado; **línea base del piloto congelada** (diferidos y perdidos) | El «antes» del piloto está calculado con fórmulas correctas, con diferidos y perdidos, y cada parada histórica está clasificada en el árbol |
| **F2 · Anticipar y actuar en el piloto** | dic → ene | Modelo choke de inyección del agua y criticidad dinámica por equipo (`CHOKE-COMPLETO.md` §9–10) para ordenar el vigía y las rutas; vigía validado con los datos reales del piloto, con el acierto medido y no supuesto; alertas con el costo por falla de hoy (descontando el colchón); **colores SCADA de Adair** en toda la interfaz (interlock rojo con candado, alarmas naranja y amarillo, morado sin comunicación) y revisión con él; captura de pérdidas en el teléfono; programa del técnico en el equipo piloto (cierre en el teléfono, rutas predictivas); logística L3–L5 desde el cierre | El vigía anticipó fallas reales con tiempo para actuar, y el tiempo fuera se ve en sus 5 tramos |
| **F3 · Escalar** | feb → abr 2027 | Más equipos (multifásica, flota ESP); asistente completo de conversión del árbol de la operadora para cargar su historial; crudo que se va con el agua de disposición; métricas modulares completas; choke del campo calculado; rol planeadora | Primera comparación «antes → con TRIM» en el piloto, con datos reales |
| **F4 · Integrar** | desde may 2027 | SAP (avisos, órdenes, repuestos), costos y paquetes avanzados | — |

### Carril de valor agregado: cumplimiento ANH (y otros marcos)

- **Qué es:** el serializador del bloque `paradas_pozo` en las dos formas de la ANH, la validación propia (Schema + 17 reglas) y la pantalla mínima de cierre del día. El diseño completo está listo en `P1-producto.md` §1.2, §4 y §5, y en `U1-experiencia.md` §6.
- **Cuándo:** después de F1, porque reusa toda la clasificación causal. Solo se adelanta si una operadora lo pone como condición para firmar, y ahí se planea con su fecha.
- **Antes del 1-dic:** nada es obligatorio para TRIM. La obligación es de la operadora. Si sirve para vender, el gancho es: «la clasificación que usted ya confirma para bajar paradas sale también como su reporte a la ANH».
- **Otros marcos** (PRODML, ISO 20815, NSTA): adaptadores de salida sobre la misma clasificación, cuando un cliente los pida.

---

## 6. Lo que necesito de ti (Hollman)

1. **El equipo piloto y sus datos.** Con Adair: ¿inyección o multifásica?, ¿de qué operadora?, y ¿cuándo llegan los datos de entrenamiento? Es lo que más bloquea.
2. **Una operadora piloto**, para tener datos reales y medir el «antes». El cumplimiento viene por añadidura.
3. **La dedicación real** de Hermes, Eduardo y Sergio en noviembre.
4. **¿Carril ANH antes del 1-dic, sí o no?** Mi recomendación es **no**, salvo que una operadora lo pida para firmar.
5. **Las preguntas a Edinson** (anexo). Ahora van primero las de confiabilidad y operación, y después las regulatorias.

---

## 7. Los riesgos que más pesan

| Riesgo | Mitigación |
|---|---|
| **Sin datos del piloto no hay vigía** que demostrar (R-22) | F0 se cierra con datos o con fecha cierta; se escoge el equipo que llegue primero con datos |
| **Afirmar una reducción que no existe** por métricas mal calculadas o sin línea base | Corregir las 5 trampas en F1, congelar el «antes» y comparar con las mismas fórmulas |
| **Una señal tomada como prueba de la causa** (R-24) | «Una señal apunta»: confirma quien abrió el equipo |
| **Clasificar mal planeada o no planeada**, que es el indicador del norte | Coherencia bloqueada y confirmación por paso; tablero de calidad de la clasificación |
| **Confundir los dos pilotos** (R-21) | El piloto de equipo manda; el regulatorio solo si una operadora lo pide |
| Capacidad del equipo | Fases sin fecha legal; F1 es el mínimo que hay que hacer bien |
| (Valor agregado) Una fila mala tumba el IDP de la operadora (R-17) | Nunca se entrega sin la validación propia |

Los 24 riesgos completos están en `P1-producto.md` §9.

---

## 8. El valor agregado regulatorio, en corto

Lo que hay que saber cuando se encienda:
- **Obligación y plazos:** la Circular 024 obliga a las operadoras desde el 1-dic-2026: JSON v3.1, antes de las 07:00 y corrección en 1 h. La Res. 0592/2026 podría mover esa fecha (sin confirmar).
- **El esquema no protege:** el Schema oficial no valida el catálogo. Lo valida el receptor de la ANH con reglas no publicadas. TRIM valida por su cuenta.
- **La ANH se contradice:** el Diccionario contradice a la circular (clave o texto, tildes, 5 causas distintas). TRIM guarda un código interno y escribe la forma que se configure.
- **Diferida y pérdida:** la diferida ANH usa la última prueba de potencial reportada, sin factor de asignación. La pérdida es lo producido a superficie que no se comercializa y «podrá estar sujeta a gravamen» (C24 p.4).
- **El detalle:** `R1-normativa-anh.md` y `P1-producto.md` §4.

---

## Anexo · Mensaje para Edinson (listo para enviar)

> Edinson, buenas. Gracias otra vez por la sesión del lunes: tomamos completo lo que nos dijiste. Nuestro foco es ayudar a bajar las paradas no planificadas de los equipos críticos, y que la clasificación que eso exige salga también como el reporte de la Circular 024. Nos quedaron unas dudas. ¿Nos ayudas con ellas, o nos dices a quién preguntarle las de la ANH?
>
> **De confiabilidad y operación**
> 1. Para su área, ¿qué cifra debe abrir cada familia de equipos: tiempo entre fallas, tiempo fuera, reparación activa o logística?
> 2. Dijiste que en gas hay «una tolerancia diferente en cuanto a paradas de pozo». ¿Qué cambia: la duración mínima, el potencial o la nominación?
> 3. En una parada programada que se pasa de su ventana, ¿el exceso se cuenta como no planeado?
> 4. Una restricción parcial (frecuencia bajada en una ESP, curtailment del 30 %), ¿la cuentan como parada?
> 5. Bomba de reinyección o multifásica con la parte dañada identificada (rodamiento, sello, variador): ¿la clasifican por la falla de la parte o como «parada de estación/bombeo que afecta pozos»?
>
> **De la Circular 024**
> 6. Una parada que causa diferida y pérdida a la vez (rotura con derrame): ¿qué va en `dif_perd`? Y una pérdida sin pozo parado (tea, rechazo), ¿va como fila de paradas o solo en el balance?
> 7. En `cau_niv1`, ¿va la clave (`P_MANT_ELE`) o el texto? ¿El receptor exige tildes exactas («EXPORTACION» o «EXPORTACIÓN»)?
> 8. Si el sistema propone la causa desde las alarmas y el ingeniero la confirma, ¿el origen es «C» o «M»?
> 9. Un pozo que sigue parado a las 23:59:59, ¿qué lleva en `h_fin_paro`? ¿Y en qué hora: UTC o Colombia?
> 10. ¿La Res. 0592/2026 aplaza el 1-dic para el JSON v3.1?
